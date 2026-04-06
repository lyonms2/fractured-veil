// ═══════════════════════════════════════════════════════════════
//  api/comprar-ovo.js — Vercel Serverless Function
//
//  Body esperado:
//    { listingId: "...", idToken: "..." }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const EGG_SALE_TAX = 0.10;

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

      const buyerData   = buyerSnap.data() || {};
      const cristais    = buyerData.gs?.cristais ?? buyerData.cristais ?? 0;
      if (cristais < egg.price) throw new Error('INSUFFICIENT');

      const taxa         = Math.round(egg.price * EGG_SALE_TAX);
      const sellerRecebe = egg.price - taxa;
      novoSaldoComprador = cristais - egg.price;

      const newEgg = {
        id:       egg.eggId || Date.now(),
        raridade: egg.raridade,
        elemento: egg.elemento,
        expiraEm: egg.expiraEm,
      };

      tx.update(buyerRef, {
        cristais:      novoSaldoComprador,
        'gs.cristais': novoSaldoComprador,
        inboxEggs:     FieldValue.arrayUnion(newEgg),
      });

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

    return res.status(200).json({
      ok:        true,
      raridade:  egg.raridade,
      elemento:  egg.elemento,
      novoSaldo: novoSaldoComprador,
    });

  } catch (err) {
    const erros = {
      NOT_AVAILABLE: [409, 'Ovo já não disponível.'],
      INSUFFICIENT:  [400, 'Cristais insuficientes.'],
      OWN_EGG:       [400, 'Não podes comprar o teu próprio ovo.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao processar compra.'];
    if (status === 500) console.error('[comprar-ovo]', err);
    return res.status(status).json({ erro: msg });
  }
};
