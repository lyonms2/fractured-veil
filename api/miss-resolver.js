// ═══════════════════════════════════════════════════════════════
//  api/miss-resolver.js — Vercel Serverless Function
//
//  Resolve uma disputa de missão de forma segura.
//  Lê votos e resultado directamente do Firestore (não confia no cliente).
//
//  Body esperado:
//    { idToken: "...", missId: "..." }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const MISS_DISPUTE_FEE_RATE = 0.10; // espelha a constante do cliente

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

  const { idToken, missId } = req.body;

  // ── Validar parâmetros ──
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!missId || typeof missId !== 'string' || !/^[\w-]+$/.test(missId)) {
    return res.status(400).json({ erro: 'missId inválido' });
  }

  const { db, auth } = initAdmin();

  // ── Verificar identidade ──
  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const missRef = db.collection('missoes').doc(missId);

  // ── Ler missão ──
  const missSnap = await missRef.get();
  if (!missSnap.exists) {
    return res.status(404).json({ erro: 'Missão não encontrada' });
  }
  const m = missSnap.data();

  if (m.status !== 'dispute') {
    return res.status(409).json({ erro: 'Disputa já resolvida ou missão não está em disputa' });
  }

  const totalVotes = (m.votesEmployer || 0) + (m.votesWorker || 0);
  if (totalVotes < 10) {
    return res.status(400).json({ erro: 'Votos insuficientes para resolução (mínimo 10)' });
  }

  // ── Verificar que o chamador votou nesta disputa ──
  const myVoteSnap = await missRef.collection('votos').doc(uid).get();
  if (!myVoteSnap.exists) {
    return res.status(403).json({ erro: 'Apenas votantes registados podem pedir resolução' });
  }

  // ── Ler lista de voters (imutável após disputa aberta) ──
  const votersSnap = await missRef.collection('votos').get();
  const voterUids  = votersSnap.docs.map(d => d.id);

  // ── Calcular distribuição ──
  const reward     = m.reward;
  const totalPot   = reward * 2;
  const fee        = Math.floor(totalPot * MISS_DISPUTE_FEE_RATE);
  const voterTotal = Math.floor(fee / 2);                                    // 5% para voters
  const poolShare  = fee - voterTotal;                                       // 5% para pool
  const winnerAmt  = totalPot - fee;                                         // 90% para vencedor
  const winner     = (m.votesEmployer || 0) >= (m.votesWorker || 0) ? m.employer : m.selectedWorker;
  const voterAmt   = voterUids.length > 0 ? Math.floor(voterTotal / voterUids.length) : 0;
  const poolFinal  = poolShare + (voterTotal - voterAmt * voterUids.length); // absorve resto de arredondamento

  const poolRef = db.collection('config').doc('pool');
  const logRef  = poolRef.collection('logs').doc();

  // ── Transacção atómica — re-verifica status + todos os pagamentos ──
  // runTransaction garante que se duas chamadas chegarem em simultâneo,
  // apenas uma consegue fazer a transição dispute → cancelled.
  try {
    const result = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(missRef);
      if (freshSnap.data()?.status !== 'dispute') {
        throw Object.assign(new Error('Disputa já resolvida'), { code: 'already_done' });
      }

      tx.update(missRef, {
        status:        'cancelled',
        disputeWinner: winner,
        resolvedAt:    FieldValue.serverTimestamp(),
      });

      tx.update(db.collection('players').doc(winner), {
        'gs.cristais': FieldValue.increment(winnerAmt),
      });

      voterUids.forEach(vUid => {
        if (voterAmt > 0) {
          tx.update(db.collection('players').doc(vUid), {
            'gs.cristais': FieldValue.increment(voterAmt),
          });
        }
      });

      tx.update(poolRef, {
        cristais:    FieldValue.increment(poolFinal),
        totalEntrou: FieldValue.increment(poolFinal),
      });

      tx.set(logRef, {
        tipo:   'entrada',
        motivo: 'Disputa de missão resolvida — taxa 10%',
        origem: winner,
        total:  poolFinal,
        pool:   poolFinal,
        ts:     FieldValue.serverTimestamp(),
      });

      return { winner, winnerAmt, voterAmt, voterCount: voterUids.length };
    });

    return res.status(200).json({ ok: true, ...result });

  } catch (err) {
    if (err.code === 'already_done') {
      return res.status(409).json({ erro: 'Disputa já resolvida' });
    }
    console.error('[miss-resolver] transaction error:', err);
    return res.status(500).json({ erro: 'Erro ao resolver disputa. Tenta novamente.' });
  }
};
