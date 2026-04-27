// ═══════════════════════════════════════════════════════════════
//  api/missoes.js — Vercel Serverless Function
//
//  Operações financeiras seguras do sistema de Missões.
//  Lê dados directamente do Firestore (não confia no cliente).
//
//  Body esperado:
//    { idToken: "...", missId: "...", action: "finalizar"|"resolver" }
//
//  action=finalizar → Confirma entrega e paga o worker (5% taxa)
//  action=resolver  → Resolve disputa após 10 votos (10% taxa)
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const MISS_FEE_RATE         = 0.05;
const MISS_DISPUTE_FEE_RATE = 0.10;

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

  const { idToken, missId, action } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!missId || typeof missId !== 'string' || !/^[\w-]+$/.test(missId)) {
    return res.status(400).json({ erro: 'missId inválido' });
  }
  if (action !== 'finalizar' && action !== 'resolver') {
    return res.status(400).json({ erro: 'action inválida' });
  }

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  if (action === 'finalizar') return handleFinalizar(res, db, uid, missId);
  if (action === 'resolver')  return handleResolver(res, db, uid, missId);
};

// ── Confirmar entrega (employer) ────────────────────────────────
async function handleFinalizar(res, db, uid, missId) {
  const missRef  = db.collection('missoes').doc(missId);
  const missSnap = await missRef.get();

  if (!missSnap.exists) return res.status(404).json({ erro: 'Missão não encontrada' });
  const m = missSnap.data();

  if (m.employer !== uid)   return res.status(403).json({ erro: 'Não és o empregador desta missão' });
  if (m.status !== 'progress') return res.status(400).json({ erro: 'Missão não está em andamento' });
  if (!m.selectedWorker)    return res.status(400).json({ erro: 'Sem worker atribuído' });

  const totalPot  = m.reward * 2;
  const fee       = Math.floor(totalPot * MISS_FEE_RATE);
  const workerAmt = totalPot - fee;

  const poolRef = db.collection('config').doc('pool');
  const logRef  = poolRef.collection('logs').doc();

  try {
    const result = await db.runTransaction(async (tx) => {
      const fresh = (await tx.get(missRef)).data();
      if (fresh?.status !== 'progress') {
        throw Object.assign(new Error('Missão já não está em andamento'), { code: 'stale' });
      }
      tx.update(missRef, { status: 'done', deliveryToken: FieldValue.delete(), completedAt: FieldValue.serverTimestamp() });
      tx.update(db.collection('players').doc(m.selectedWorker), {
        'gs.cristais': FieldValue.increment(workerAmt),
        'gs.rep.done': FieldValue.increment(1),
      });
      tx.update(poolRef, { cristais: FieldValue.increment(fee), totalEntrou: FieldValue.increment(fee) });
      tx.set(logRef, { tipo: 'entrada', motivo: 'Missão concluída — taxa 5%', origem: m.selectedWorker, total: fee, pool: fee, ts: FieldValue.serverTimestamp() });
      return { workerAmt, fee, worker: m.selectedWorker };
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err.code === 'stale') return res.status(409).json({ erro: err.message });
    console.error('[missoes/finalizar]', err);
    return res.status(500).json({ erro: 'Erro ao processar pagamento. Tenta novamente.' });
  }
}

// ── Resolver disputa (voter, após 10 votos) ─────────────────────
async function handleResolver(res, db, uid, missId) {
  const missRef  = db.collection('missoes').doc(missId);
  const missSnap = await missRef.get();

  if (!missSnap.exists) return res.status(404).json({ erro: 'Missão não encontrada' });
  const m = missSnap.data();

  if (m.status !== 'dispute') {
    return res.status(409).json({ erro: 'Disputa já resolvida ou missão não está em disputa' });
  }
  if ((m.votesEmployer || 0) + (m.votesWorker || 0) < 10) {
    return res.status(400).json({ erro: 'Votos insuficientes para resolução (mínimo 10)' });
  }

  const myVoteSnap = await missRef.collection('votos').doc(uid).get();
  if (!myVoteSnap.exists) {
    return res.status(403).json({ erro: 'Apenas votantes registados podem pedir resolução' });
  }

  const votersSnap = await missRef.collection('votos').get();
  const voterUids  = votersSnap.docs.map(d => d.id);

  const totalPot   = m.reward * 2;
  const fee        = Math.floor(totalPot * MISS_DISPUTE_FEE_RATE);
  const voterTotal = Math.floor(fee / 2);
  const poolShare  = fee - voterTotal;
  const winnerAmt  = totalPot - fee;
  const winner     = (m.votesEmployer || 0) >= (m.votesWorker || 0) ? m.employer : m.selectedWorker;
  const voterAmt   = voterUids.length > 0 ? Math.floor(voterTotal / voterUids.length) : 0;
  const poolFinal  = poolShare + (voterTotal - voterAmt * voterUids.length);

  const poolRef = db.collection('config').doc('pool');
  const logRef  = poolRef.collection('logs').doc();

  try {
    const result = await db.runTransaction(async (tx) => {
      const fresh = (await tx.get(missRef)).data();
      if (fresh?.status !== 'dispute') {
        throw Object.assign(new Error('Disputa já resolvida'), { code: 'already_done' });
      }
      tx.update(missRef, { status: 'cancelled', disputeWinner: winner, resolvedAt: FieldValue.serverTimestamp() });
      tx.update(db.collection('players').doc(winner), { 'gs.cristais': FieldValue.increment(winnerAmt) });
      voterUids.forEach(vUid => {
        if (voterAmt > 0) tx.update(db.collection('players').doc(vUid), { 'gs.cristais': FieldValue.increment(voterAmt) });
      });
      tx.update(poolRef, { cristais: FieldValue.increment(poolFinal), totalEntrou: FieldValue.increment(poolFinal) });
      tx.set(logRef, { tipo: 'entrada', motivo: 'Disputa de missão resolvida — taxa 10%', origem: winner, total: poolFinal, pool: poolFinal, ts: FieldValue.serverTimestamp() });
      return { winner, winnerAmt, voterAmt, voterCount: voterUids.length };
    });
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err.code === 'already_done') return res.status(409).json({ erro: 'Disputa já resolvida' });
    console.error('[missoes/resolver]', err);
    return res.status(500).json({ erro: 'Erro ao resolver disputa. Tenta novamente.' });
  }
}
