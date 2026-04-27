// ═══════════════════════════════════════════════════════════════
//  api/miss-finalizar.js — Vercel Serverless Function
//
//  Confirma a entrega de uma missão e paga o worker de forma segura.
//  Verifica employer, status e reward directamente no Firestore.
//
//  Body esperado:
//    { idToken: "...", missId: "..." }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const MISS_FEE_RATE = 0.05; // espelha a constante do cliente

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

  // ── Ler e validar missão ──
  const missSnap = await missRef.get();
  if (!missSnap.exists) {
    return res.status(404).json({ erro: 'Missão não encontrada' });
  }
  const m = missSnap.data();

  if (m.employer !== uid) {
    return res.status(403).json({ erro: 'Não és o empregador desta missão' });
  }
  if (m.status !== 'progress') {
    return res.status(400).json({ erro: 'Missão não está em andamento' });
  }
  if (!m.selectedWorker) {
    return res.status(400).json({ erro: 'Sem worker atribuído' });
  }

  // ── Calcular distribuição ──
  const reward    = m.reward;
  const totalPot  = reward * 2;
  const fee       = Math.floor(totalPot * MISS_FEE_RATE);
  const workerAmt = totalPot - fee;

  const poolRef = db.collection('config').doc('pool');
  const logRef  = poolRef.collection('logs').doc();

  // ── Transacção atómica — re-verifica status + todos os pagamentos ──
  try {
    const result = await db.runTransaction(async (tx) => {
      const freshSnap = await tx.get(missRef);
      const fresh = freshSnap.data();
      if (fresh?.status !== 'progress') {
        throw Object.assign(new Error('Missão já não está em andamento'), { code: 'stale' });
      }

      tx.update(missRef, {
        status:        'done',
        deliveryToken: FieldValue.delete(),
        completedAt:   FieldValue.serverTimestamp(),
      });

      tx.update(db.collection('players').doc(m.selectedWorker), {
        'gs.cristais': FieldValue.increment(workerAmt),
        'gs.rep.done': FieldValue.increment(1),
      });

      tx.update(poolRef, {
        cristais:    FieldValue.increment(fee),
        totalEntrou: FieldValue.increment(fee),
      });

      tx.set(logRef, {
        tipo:   'entrada',
        motivo: 'Missão concluída — taxa 5%',
        origem: m.selectedWorker,
        total:  fee,
        pool:   fee,
        ts:     FieldValue.serverTimestamp(),
      });

      return { workerAmt, fee, worker: m.selectedWorker };
    });

    return res.status(200).json({ ok: true, ...result });

  } catch (err) {
    if (err.code === 'stale') {
      return res.status(409).json({ erro: err.message });
    }
    console.error('[miss-finalizar] transaction error:', err);
    return res.status(500).json({ erro: 'Erro ao processar pagamento. Tenta novamente.' });
  }
};
