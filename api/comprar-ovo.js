// ═══════════════════════════════════════════════════════════════
//  api/comprar-ovo.js — Vercel Serverless Function
//
//  Body esperado:
//    { listingId: "...", idToken: "..." }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const CRIS = require('./_cristais.js');   // os dois baldes de cristais

const EGG_SALE_TAX = 0.10;
// O mesmo tecto do inventario no cliente (js/eggs.js). Se o comprador ja
// esta cheio, a compra e recusada ANTES de cobrar: o ovo ia para o
// inboxEggs, o cliente so encaixava ate 10 e os restantes eram deitados
// fora em silencio.
const MAX_OVOS = 10;

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return { db: getFirestore(), auth: getAuth() };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { listingId, idToken } = req.body;

  if (!listingId || typeof listingId !== 'string') {
    return res.status(400).json({ erro: 'listingId inválido' });
  }
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }

  const { db, auth } = initAdmin();

  let buyerUid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    buyerUid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const listRef  = db.collection('eggMarket').doc(listingId);
  const buyerRef = db.collection('players').doc(buyerUid);
  const poolRef  = db.collection('config').doc('pool');

  let egg = null;
  let novoSaldoComprador = 0;
  let eggEntregue = null;

  try {
    await db.runTransaction(async (tx) => {
      const [listSnap, buyerSnap] = await Promise.all([
        tx.get(listRef),
        tx.get(buyerRef),
      ]);

      if (!listSnap.exists || listSnap.data().status !== 'listed') {
        throw new Error('NOT_AVAILABLE');
      }
      egg = listSnap.data();

      if (egg.sellerId === buyerUid) throw new Error('OWN_EGG');

      // Ovo ja apodrecido nao se vende. Nao era verificado em lado
      // nenhum: pagava-se em cristais, o ovo ia para o inboxEggs e o
      // cliente filtrava-o na entrada seguinte
      // (data.inboxEggs.filter(e => Date.now() < e.expiraEm)). O
      // comprador perdia os cristais e nunca sabia porque.
      if (egg.expiraEm && Date.now() >= egg.expiraEm) throw new Error('EXPIRED');

      const buyerData   = buyerSnap.data() || {};
      // Paga-se com os dois baldes, e o bónus vai primeiro.
      const debitoOvo = CRIS.camposDebito(buyerData, egg.price);
      if (!debitoOvo) throw new Error('INSUFFICIENT');

      // Quantos ovos o comprador ja tem: os do slot activo mais os que
      // estao a caminho e ainda nao foram consumidos.
      const slotIdx    = buyerData.activeSlotIdx ?? buyerData.gs?.activeSlotIdx ?? 0;
      const slotEggs   = (buyerData.avatarSlots || [])[slotIdx]?.eggs || [];
      const aCaminho   = (buyerData.inboxEggs || []).length;
      if (slotEggs.length + aCaminho >= MAX_OVOS) throw new Error('FULL');

      const taxa         = Math.round(egg.price * EGG_SALE_TAX);
      const sellerRecebe = egg.price - taxa;
      novoSaldoComprador = debitoOvo.cristais + debitoOvo.cristaisBonus;

      const newEgg = {
        id:       egg.eggId || Date.now(),
        raridade: egg.raridade,
        elemento: egg.elemento,
        expiraEm: egg.expiraEm,
      };
      eggEntregue = newEgg;

      /* O registo acompanha o ovo desde que ele entra.
         Sem isto o ovo ficava inútil ao fim de um recarregamento: o
         applyGameState() move os ovos do inboxEggs para o slot.eggs e
         limpa o inbox, e a partir daí a única prova de que o ovo é
         legítimo seria o inbox — que já não o tem. Chocar, queimar, vender
         e listar passavam todos a dar OVO_NOT_FOUND.
         O inbox é entrega; o ovosEmitidos é propriedade. */
      tx.update(buyerRef, Object.assign({
        inboxEggs: FieldValue.arrayUnion(newEgg),
        [`ovosEmitidos.o${newEgg.id}`]: newEgg.raridade,
      }, debitoOvo));

      const sellerRef  = db.collection('players').doc(egg.sellerId);
      const sellerSnap = await tx.get(sellerRef);
      const sellerData = sellerSnap.data() || {};
      const sellerCris = sellerData.gs?.cristais ?? sellerData.cristais ?? 0;
      tx.update(sellerRef, {
        cristais:      sellerCris + sellerRecebe,
        'gs.cristais': sellerCris + sellerRecebe,
      });

      tx.delete(listRef);

      if (taxa > 0) {
        tx.update(poolRef, {
          cristais:    FieldValue.increment(taxa),
          totalEntrou: FieldValue.increment(taxa),
        });
        const logRef = poolRef.collection('logs').doc();
        tx.set(logRef, {
          tipo:   'entrada',
          motivo: `venda ovo ${egg.raridade} · ${egg.elemento}`,
          origem: egg.sellerId,
          total:  taxa,
          pool:   taxa,
          ts:     FieldValue.serverTimestamp(),
        });
      }
    });

    // O ovo vai na resposta para o cliente o poder mostrar JA no
    // inventario. Antes so voltavam a raridade e o elemento, e o ovo
    // comprado so aparecia depois de recarregar a pagina.
    return res.status(200).json({
      ok:        true,
      raridade:  egg.raridade,
      elemento:  egg.elemento,
      novoSaldo: novoSaldoComprador,
      ovo:       eggEntregue,
    });

  } catch (err) {
    const erros = {
      NOT_AVAILABLE: [409, 'Este ovo já não está à venda.'],
      INSUFFICIENT:  [400, 'Cristais insuficientes.'],
      OWN_EGG:       [400, 'Você não pode comprar o seu próprio ovo.'],
      EXPIRED:       [409, 'Este ovo já apodreceu e não pode mais ser chocado.'],
      FULL:          [400, 'Seu inventário de ovos está cheio (máx 10). Choque ou venda algum antes.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao processar compra.'];
    if (status === 500) console.error('[comprar-ovo]', err);
    return res.status(status).json({ erro: msg });
  }
};
