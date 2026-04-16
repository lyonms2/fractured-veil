// ═══════════════════════════════════════════════════════════════
//  api/listar-ovo.js — Vercel Serverless Function
//
//  Body esperado:
//    { idToken, ovoId, raridade, elemento, expiraEm, price }
//
//  Realiza atomicamente (numa só transacção):
//    1. Verifica que o ovo existe em inboxEggs do jogador
//    2. Verifica saldo de cristais para a taxa de listagem
//    3. Remove ovo do inboxEggs + debita taxa + cria listagem + regista log pool
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const EGG_LIST_FEE = { 'Raro': 25, 'Lendário': 50 };
const PRICE_MIN    = 1;
const PRICE_MAX    = 10000;

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

  const { idToken, ovoId, raridade, elemento, expiraEm, price } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!ovoId) {
    return res.status(400).json({ erro: 'ovoId em falta' });
  }
  if (!raridade || !EGG_LIST_FEE[raridade]) {
    return res.status(400).json({ erro: 'Raridade inválida (Raro ou Lendário)' });
  }
  const priceInt = parseInt(price, 10);
  if (!priceInt || priceInt < PRICE_MIN || priceInt > PRICE_MAX) {
    return res.status(400).json({ erro: `Preço inválido (${PRICE_MIN}–${PRICE_MAX})` });
  }

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const playerRef = db.collection('players').doc(uid);
  const poolRef   = db.collection('config').doc('pool');

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const pData       = playerSnap.data();
      const inboxEggs   = pData.inboxEggs || [];
      const cristais    = pData.gs?.cristais ?? pData.cristais ?? 0;

      // Confirmar que o ovo existe no inventário
      const ovoIdx = inboxEggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);
      if (ovoIdx === -1) throw new Error('OVO_NOT_FOUND');

      const taxa = EGG_LIST_FEE[raridade];
      if (cristais < taxa) throw new Error('INSUFFICIENT');

      const ovoToRemove  = inboxEggs[ovoIdx];
      const novosCristais = cristais - taxa;

      // 1. Debita taxa + remove ovo do inventário
      tx.update(playerRef, {
        inboxEggs:     FieldValue.arrayRemove(ovoToRemove),
        cristais:      novosCristais,
        'gs.cristais': novosCristais,
      });

      // 2. Cria listagem no eggMarket
      const listRef = db.collection('eggMarket').doc();
      tx.set(listRef, {
        raridade:  raridade,
        elemento:  elemento   || ovoToRemove.elemento || '',
        expiraEm:  expiraEm   || ovoToRemove.expiraEm || 0,
        eggId:     ovoToRemove.id,
        sellerId:  uid,
        price:     priceInt,
        status:   'listed',
        listedAt:  Date.now(),
      });

      // 3. Regista entrada na pool
      tx.update(poolRef, {
        cristais:    FieldValue.increment(taxa),
        totalEntrou: FieldValue.increment(taxa),
      });
      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo:   'entrada',
        motivo: `listagem ovo ${raridade}`,
        origem: uid,
        total:  taxa,
        pool:   taxa,
        ts:     FieldValue.serverTimestamp(),
      });

      return { novoSaldo: novosCristais, taxa, raridade, elemento: ovoToRemove.elemento || elemento || '' };
    });

    return res.status(200).json({ ok: true, ...resultado });

  } catch (err) {
    const erros = {
      OVO_NOT_FOUND: [400, 'Ovo não encontrado no inventário.'],
      INSUFFICIENT:  [400, 'Cristais insuficientes para a taxa de listagem.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao processar listagem.'];
    if (status === 500) console.error('[listar-ovo]', err);
    return res.status(status).json({ erro: msg });
  }
};
