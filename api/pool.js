// ═══════════════════════════════════════════════════════════════
//  api/pool.js — Vercel Serverless Function
//  Leitura segura dos dados públicos da Pool P2E.
//  Sem escrita — todo o write é feito pelo Admin SDK nas outras APIs.
//
//  GET  /api/pool          → dados da pool (cristais, totais, preço)
//  GET  /api/pool?logs=1   → últimos 20 logs de transacção
//  GET  /api/pool?logs=1&after=<docId> → próxima página de logs
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');

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
  return getFirestore();
}

module.exports = async function handler(req, res) {
  // CORS básico — só GET
  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const db = initAdmin();

  try {
    const poolRef  = db.collection('config').doc('pool');
    const poolSnap = await poolRef.get();

    const poolData = poolSnap.exists ? poolSnap.data() : {
      cristais: 0, saqueHoje: 0, ultimoReset: 0,
      totalEntrou: 0, totalSaiu: 0,
    };

    // Reset diário server-side (se passou mais de 24h)
    const agora = Date.now();
    if (agora - (poolData.ultimoReset || 0) > 86400000) {
      await poolRef.set({ saqueHoje: 0, ultimoReset: agora }, { merge: true });
      poolData.saqueHoje   = 0;
      poolData.ultimoReset = agora;
    }

    // Se pediu os logs
    if (req.query?.logs === '1') {
      let q = poolRef.collection('logs').orderBy('ts', 'desc').limit(20);

      if (req.query?.after) {
        try {
          const afterSnap = await poolRef.collection('logs').doc(req.query.after).get();
          if (afterSnap.exists) q = q.startAfter(afterSnap);
        } catch (_) {}
      }

      const logsSnap = await q.get();
      const logs = logsSnap.docs.map(d => {
        const data = d.data();
        return {
          id:     d.id,
          tipo:   data.tipo,
          motivo: data.motivo  || '',
          origem: data.origem  || '',
          pool:   data.pool    ?? 0,
          total:  data.total   ?? 0,
          ts:     data.ts?.toMillis ? data.ts.toMillis() : null,
        };
      });

      const lastId = logsSnap.docs.length > 0
        ? logsSnap.docs[logsSnap.docs.length - 1].id
        : null;

      return res.status(200).json({
        ok: true,
        logs,
        lastId,
        hasMore: logsSnap.docs.length === 20,
      });
    }

    // Resposta base — dados da pool sem informação sensível
    return res.status(200).json({
      ok:          true,
      cristais:    poolData.cristais    || 0,
      saqueHoje:   poolData.saqueHoje   || 0,
      totalEntrou: poolData.totalEntrou || 0,
      totalSaiu:   poolData.totalSaiu   || 0,
      ultimoReset: poolData.ultimoReset || 0,
    });

  } catch (err) {
    console.error('[pool]', err);
    return res.status(500).json({ erro: 'Erro ao carregar pool.' });
  }
};
