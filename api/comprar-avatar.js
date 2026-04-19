// ═══════════════════════════════════════════════════════════════
//  api/comprar-avatar.js — Vercel Serverless Function
//
//  POST /api/comprar-avatar
//    acao='listar-avatar'    → { idToken, slotIdx, price }
//    acao='deslistar-avatar' → { idToken, listingId }
//    acao='desbloquear-slot' → { idToken }
//    (sem acao)              → { listingId, idToken }  ← comprar avatar
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const TAXA_MARKETPLACE = 0.10; // 10% de taxa sobre vendas de avatar
const LIST_COST        = 2;    // 💎 taxa de listagem de avatar
const PRICE_MIN        = 1;
const PRICE_MAX        = 10000;
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

  const { acao, idToken } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  if (acao === 'listar-avatar')    return handleListarAvatar(req, res, db, uid);
  if (acao === 'deslistar-avatar') return handleDeslistarAvatar(req, res, db, uid);
  if (acao === 'desbloquear-slot') return handleDesbloquearSlot(req, res, db, uid);
  return handleComprarAvatar(req, res, db, uid);
};

// ── Listar avatar no mercado (atómico, server-side) ─────────────
async function handleListarAvatar(req, res, db, uid) {
  const { slotIdx, price } = req.body;
  const slotIdxInt = parseInt(slotIdx, 10);
  const priceInt   = parseInt(price, 10);

  if (isNaN(slotIdxInt) || slotIdxInt < 0) {
    return res.status(400).json({ erro: 'slotIdx inválido' });
  }
  if (!priceInt || priceInt < PRICE_MIN || priceInt > PRICE_MAX) {
    return res.status(400).json({ erro: `Preço inválido (${PRICE_MIN}–${PRICE_MAX})` });
  }

  const playerRef = db.collection('players').doc(uid);
  const poolRef   = db.collection('config').doc('pool');

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const pData    = playerSnap.data();
      const cristais = pData.gs?.cristais ?? pData.cristais ?? 0;
      if (cristais < LIST_COST) throw new Error('INSUFFICIENT');

      const slots = [...(pData.avatarSlots || [])];
      const s     = slots[slotIdxInt];
      if (!s || s.dead) throw new Error('SLOT_INVALID');

      const newCristais = cristais - LIST_COST;
      slots[slotIdxInt] = { ...s, listed: true };

      const diasVida  = s.bornAt ? Math.floor((Date.now() - s.bornAt) / 86400000) : 0;
      const listingRef = db.collection('avatarMarket').doc();

      tx.update(playerRef, {
        avatarSlots:   slots,
        cristais:      newCristais,
        'gs.cristais': newCristais,
      });
      tx.set(listingRef, {
        sellerId:   uid,
        slotIdx:    slotIdxInt,
        nome:       s.nome,
        elemento:   s.elemento,
        raridade:   s.raridade,
        descricao:  s.descricao  || '',
        seed:       s.seed       || 0,
        nivel:      s.nivel      || 1,
        xp:         s.xp         || 0,
        vinculo:    s.vinculo    || 0,
        diasVida,
        totalOvos:  s.totalOvos  || 0,
        totalRaros: s.totalRaros || 0,
        bornAt:     s.bornAt     || Date.now(),
        price:      priceInt,
        status:    'listed',
        listedAt:   FieldValue.serverTimestamp(),
      });
      tx.update(poolRef, {
        cristais:    FieldValue.increment(LIST_COST),
        totalEntrou: FieldValue.increment(LIST_COST),
      });
      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo:   'entrada',
        motivo: 'listagem avatar',
        origem: uid,
        total:  LIST_COST,
        pool:   LIST_COST,
        ts:     FieldValue.serverTimestamp(),
      });

      return { novoSaldo: newCristais, slots };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    const erros = {
      INSUFFICIENT: [400, 'Cristais insuficientes para a taxa de listagem.'],
      SLOT_INVALID: [400, 'Slot inválido ou avatar morto.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao processar listagem.'];
    if (status === 500) console.error('[comprar-avatar/listar]', err);
    return res.status(status).json({ erro: msg });
  }
}

// ── Deslistar avatar do mercado (atómico, server-side) ──────────
async function handleDeslistarAvatar(req, res, db, uid) {
  const { listingId } = req.body;

  if (!listingId || typeof listingId !== 'string') {
    return res.status(400).json({ erro: 'listingId inválido' });
  }

  const listRef   = db.collection('avatarMarket').doc(listingId);
  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const [listSnap, playerSnap] = await Promise.all([
        tx.get(listRef),
        tx.get(playerRef),
      ]);

      if (!listSnap.exists || listSnap.data().status !== 'listed') {
        throw new Error('NOT_FOUND');
      }
      const listing = listSnap.data();
      if (listing.sellerId !== uid) throw new Error('NOT_OWNER');

      const slots    = [...(playerSnap.data()?.avatarSlots || [])];
      const slotIdx  = listing.slotIdx;
      if (slotIdx !== undefined && slots[slotIdx]) {
        slots[slotIdx] = { ...slots[slotIdx], listed: false };
      }

      tx.update(playerRef, { avatarSlots: slots });
      tx.delete(listRef);

      return { slots };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    const erros = {
      NOT_FOUND: [404, 'Listagem não encontrada.'],
      NOT_OWNER: [403, 'Não és o dono desta listagem.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao deslistar.'];
    if (status === 500) console.error('[comprar-avatar/deslistar]', err);
    return res.status(status).json({ erro: msg });
  }
}

// ── Desbloquear slot extra (atómico, server-side) ────────────────
async function handleDesbloquearSlot(_req, res, db, uid) {
  const UNLOCK_COST = 15;
  const BASE_SLOTS  = 3;
  const MAX_SLOTS   = 5;

  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) throw new Error('NOT_FOUND');

      const data       = snap.data();
      const cristais   = data.gs?.cristais ?? data.cristais ?? 0;
      const extraSlots = data.gs?.extraSlots ?? data.extraSlots ?? 0;
      const unlocked   = Math.min(MAX_SLOTS, BASE_SLOTS + extraSlots);

      if (unlocked >= MAX_SLOTS) throw new Error('MAX_SLOTS');
      if (cristais < UNLOCK_COST) throw new Error('INSUFFICIENT');

      const newCristais   = cristais - UNLOCK_COST;
      const newExtraSlots = extraSlots + 1;

      tx.update(playerRef, {
        cristais:        newCristais,
        'gs.cristais':   newCristais,
        extraSlots:      newExtraSlots,
        'gs.extraSlots': newExtraSlots,
      });

      return { novoSaldo: newCristais, extraSlots: newExtraSlots };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    const erros = {
      NOT_FOUND:   [404, 'Jogador não encontrado.'],
      MAX_SLOTS:   [400, 'Já tens o número máximo de slots.'],
      INSUFFICIENT:[400, 'Cristais insuficientes.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao desbloquear slot.'];
    if (status === 500) console.error('[comprar-avatar/desbloquear-slot]', err);
    return res.status(status).json({ erro: msg });
  }
}

// ── Comprar avatar do mercado ───────────────────────────────────
async function handleComprarAvatar(req, res, db, buyerUid) {
  const { listingId } = req.body;

  if (!listingId || typeof listingId !== 'string') {
    return res.status(400).json({ erro: 'listingId inválido' });
  }

  const listRef  = db.collection('avatarMarket').doc(listingId);
  const buyerRef = db.collection('players').doc(buyerUid);
  const poolRef  = db.collection('config').doc('pool');

  let listing = null;
  let novoSaldoComprador  = 0;
  let novosSlotsComprador = null;

  try {
    await db.runTransaction(async (tx) => {
      const [listSnap, buyerSnap] = await Promise.all([
        tx.get(listRef),
        tx.get(buyerRef),
      ]);

      if (!listSnap.exists || listSnap.data().status !== 'listed') {
        throw new Error('NOT_AVAILABLE');
      }
      listing = listSnap.data();

      if (listing.sellerId === buyerUid) throw new Error('OWN_LISTING');

      const buyerData = buyerSnap.data() || {};
      const cristais  = buyerData.gs?.cristais ?? buyerData.cristais ?? 0;
      const price     = listing.price;
      if (cristais < price) throw new Error('INSUFFICIENT');

      const slots         = [...(buyerData.avatarSlots || [])];
      const unlockedSlots = getUnlockedSlots(buyerData);
      const freeIdx       = slots.findIndex((s, i) => !s && i < unlockedSlots);
      if (freeIdx === -1) throw new Error('NO_SLOT');

      novoSaldoComprador = cristais - price;
      slots[freeIdx] = {
        nome:       listing.nome,
        elemento:   listing.elemento,
        raridade:   listing.raridade,
        descricao:  listing.descricao,
        seed:       listing.seed     || 0,
        nivel:      listing.nivel    || 1,
        xp:         listing.xp       || 0,
        vinculo:    listing.vinculo  || 0,
        diasVida:   listing.diasVida || 0,
        totalOvos:  listing.totalOvos  || 0,
        totalRaros: listing.totalRaros || 0,
        bornAt:     listing.bornAt   || Date.now(),
        acquiredAt: Date.now(),
        hatched: true, dead: false,
        vitals: { fome: 100, humor: 100, energia: 100, saude: 100, higiene: 100 },
        eggs: [], items: [],
      };
      novosSlotsComprador = slots;

      const sellerRef  = db.collection('players').doc(listing.sellerId);
      const sellerSnap = await tx.get(sellerRef);
      const sellerData = sellerSnap.data() || {};
      const sellerCris = sellerData.gs?.cristais ?? sellerData.cristais ?? 0;
      const sellerSlots = [...(sellerData.avatarSlots || [])];
      if (listing.slotIdx !== undefined && sellerSlots[listing.slotIdx]) {
        sellerSlots[listing.slotIdx] = null;
      }
      const taxa         = Math.round(price * TAXA_MARKETPLACE);
      const sellerRecebe = price - taxa;

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
      ok:        true,
      nome:      listing.nome,
      novoSaldo: novoSaldoComprador,
      slots:     novosSlotsComprador,
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
}
