// ═══════════════════════════════════════════════════════════════════
// POOL — Distribuição semanal para o dev (15% da pool)
// Vercel Cron Job: toda segunda-feira às 00:05 UTC
// (5 min depois dos resets de ranking para evitar conflito de leitura)
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

if(!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

const PCT_DEV      = 0.15;
const DEV_WALLET   = '0x8615C48d38505f02eb212Aa2ED2BA8Df86E4A49C';
const MIN_POOL     = 20;

module.exports = async (req, res) => {
  const auth = req.headers['authorization'];
  if(auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const poolRef  = db.collection('config').doc('pool');
    const poolSnap = await poolRef.get();
    const poolData = poolSnap.exists ? poolSnap.data() : { cristais: 0 };
    const poolTotal = poolData.cristais || 0;

    if(poolTotal < MIN_POOL) {
      return res.status(200).json({ ok: true, msg: `Pool insuficiente (${poolTotal} 💎). Nada distribuído.` });
    }

    const paraDev = Math.floor(poolTotal * PCT_DEV);
    if(paraDev <= 0) {
      return res.status(200).json({ ok: true, msg: 'Valor calculado é zero. Nada distribuído.' });
    }

    const devRef = db.collection('players').doc(DEV_WALLET);
    const inc    = admin.firestore.FieldValue.increment;
    const batch  = db.batch();

    // Debita da pool
    batch.update(poolRef, {
      cristais:  inc(-paraDev),
      totalSaiu: inc(paraDev),
    });

    // Log na pool
    const logRef = poolRef.collection('logs').doc();
    batch.set(logRef, {
      tipo:   'saida',
      motivo: 'Distribuição semanal dev (15%)',
      origem: DEV_WALLET,
      total:  paraDev,
      pool:   -paraDev,
      ts:     admin.firestore.FieldValue.serverTimestamp(),
    });

    // Credita ao dev
    batch.set(devRef, {
      'gs.cristais': inc(paraDev),
      cristais:      inc(paraDev),
    }, { merge: true });

    await batch.commit();

    return res.status(200).json({
      ok:      true,
      poolAntes: poolTotal,
      paraDev,
      poolDepois: poolTotal - paraDev,
    });

  } catch(e) {
    console.error('[pool-dev-payout] erro:', e.message);
    return res.status(500).json({ erro: e.message });
  }
};
