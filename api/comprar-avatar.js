// ═══════════════════════════════════════════════════════════════
//  api/comprar-avatar.js — Vercel Serverless Function
//
//  Body esperado:
//    { listingId: "...", idToken: "..." }
//
//  idToken = Firebase ID token do comprador (obtido com getIdToken())
//  listingId = ID do documento em avatarMarket
//
//  Executa no servidor com Admin SDK para poder escrever em docs
//  de comprador e vendedor sem expor essa permissão ao cliente.
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const TAXA_MARKETPLACE = 0.10; // 10% de taxa sobre vendas de avatar
const BASE_SLOTS       = 3;
const MAX_SLOTS        = 5;

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

function getUnlockedSlots(playerData) {
  const extra = playerData.gs?.extraSlots ?? playerData.extraSlots ?? 0;
  return Math.min(MAX_SLOTS, BASE_SLOTS + extra);
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

  // ── Verificar identidade do comprador ──
  let buyerUid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    buyerUid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const listRef  = db.collection('avatarMarket').doc(listingId);
  const buyerRef = db.collection('players').doc(buyerUid);
  const poolRef  = db.collection('config').doc('pool');

  let listing = null;
  let novoSaldoComprador = 0;
  let novosSlotsComprador = null;

  try {
    await db.runTransaction(async (tx) => {
      const [listSnap, buyerSnap] = await Promise.all([
        tx.get(listRef),
        tx.get(buyerRef),
      ]);

      // ── Validar listagem ──
      if (!listSnap.exists || listSnap.data().status !== 'listed') {
        throw new Error('NOT_AVAILABLE');
      }
      listing = listSnap.data();

      if (listing.sellerId === buyerUid) {
        throw new Error('OWN_LISTING');
      }

      // ── Validar saldo do comprador ──
      const buyerData   = buyerSnap.data() || {};
      const cristais    = buyerData.gs?.cristais ?? buyerData.cristais ?? 0;
      const price       = listing.price;
      if (cristais < price) throw new Error('INSUFFICIENT');

      // ── Validar slot livre ──
      const slots         = [...(buyerData.avatarSlots || [])];
      const unlockedSlots = getUnlockedSlots(buyerData);
      const freeIdx       = slots.findIndex((s, i) => !s && i < unlockedSlots);
      if (freeIdx === -1) throw new Error('NO_SLOT');

      // ── Preparar novo slot do comprador ──
      novoSaldoComprador = cristais - price;
      slots[freeIdx] = {
        nome:       listing.nome,
        elemento:   listing.elemento,
        raridade:   listing.raridade,
        descricao:  listing.descricao,
        seed:       listing.seed || 0,
        nivel:      listing.nivel || 1,
        xp:         listing.xp || 0,
        vinculo:    listing.vinculo || 0,
        diasVida:   listing.diasVida || 0,
        totalOvos:  listing.totalOvos || 0,
        totalRaros: listing.totalRaros || 0,
        bornAt:     listing.bornAt || Date.now(),
        acquiredAt: Date.now(),
        hatched:    true,
        dead:       false,
        vitals:     { fome: 100, humor: 100, energia: 100, saude: 100, higiene: 100 },
        eggs:       [],
        items:      [],
      };
      novosSlotsComprador = slots;

      // ── Preparar atualização do vendedor ──
      const sellerRef  = db.collection('players').doc(listing.sellerId);
      const sellerSnap = await tx.get(sellerRef);
      const sellerData = sellerSnap.data() || {};
      const sellerCris = sellerData.gs?.cristais ?? sellerData.cristais ?? 0;
      const sellerSlots = [...(sellerData.avatarSlots || [])];
      if (listing.slotIdx !== undefined && sellerSlots[listing.slotIdx]) {
        sellerSlots[listing.slotIdx] = null;
      }
      const taxa        = Math.round(price * TAXA_MARKETPLACE);
      const sellerRecebe = price - taxa;

      // ── Aplicar writes ──
      tx.update(buyerRef, {
        avatarSlots:   novosSlotsComprador,
        cristais:      novoSaldoComprador,
        'gs.cristais': novoSaldoComprador,
      });

      tx.update(sellerRef, {
        avatarSlots:   sellerSlots,
        cristais:      sellerCris + sellerRecebe,
        'gs.cristais': sellerCris + sellerRecebe,
      });

      tx.delete(listRef);

      // ── Taxa para a pool (dentro da transação) ──
      if (taxa > 0) {
        tx.update(poolRef, {
          cristais:    FieldValue.increment(taxa),
          totalEntrou: FieldValue.increment(taxa),
        });
        const logRef = poolRef.collection('logs').doc();
        tx.set(logRef, {
          tipo:   'entrada',
          motivo: `venda avatar ${listing.nome}`,
          origem: listing.sellerId,
          total:  taxa,
          pool:   taxa,
          ts:     FieldValue.serverTimestamp(),
        });
      }
    });

    return res.status(200).json({
      ok:              true,
      nome:            listing.nome,
      novoSaldo:       novoSaldoComprador,
      slots:           novosSlotsComprador,
    });

  } catch (err) {
    const erros = {
      NOT_AVAILABLE: [409, 'Listagem já não disponível.'],
      INSUFFICIENT:  [400, 'Cristais insuficientes.'],
      NO_SLOT:       [400, 'Sem slots disponíveis.'],
      OWN_LISTING:   [400, 'Não podes comprar a tua própria listagem.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao processar compra.'];
    if (status === 500) console.error('[comprar-avatar]', err);
    return res.status(status).json({ erro: msg });
  }
};
