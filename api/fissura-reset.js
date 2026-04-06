// ═══════════════════════════════════════════════════════════════
//  api/fissura-reset.js — Vercel Cron (1º de cada mês, 00:05)
//
//  1. Determina facção vencedora (maior média de pontos por membro)
//  2. Distribui prémios aos membros qualificados (≥1000 pontos)
//     Comum:    +500 🪙
//     Raro:     4% da pool ÷ nº de Raros qualificados (máx 15💎/membro)
//     Lendário: 8% da pool ÷ nº de Lendários qualificados (máx 30💎/membro)
//  3. Limpa faccao/fissuraMes/fissuraPontos de todos os jogadores
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');

const PONTOS_MINIMOS   = 1000;
const PCT_POOL_RARO    = 0.04;
const PCT_POOL_LEND    = 0.08;
const CAP_RARO         = 15;
const CAP_LEND         = 30;
const PREMIO_COMUM     = 500; // moedas

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

function getMesAnterior() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

module.exports = async function handler(req, res) {
  // Aceita GET (cron Vercel) ou POST (trigger manual com token)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  // Proteção básica para trigger manual
  if (req.method === 'POST') {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== process.env.ADMIN_CRON_TOKEN) {
      return res.status(401).json({ erro: 'Não autorizado' });
    }
  }

  const db  = initAdmin();
  const mes = getMesAnterior();

  console.log(`[fissura-reset] A processar mês: ${mes}`);

  try {
    // ── 1. Ler doc da fissura do mês ──
    const fissuraSnap = await db.collection('fissura').doc(mes).get();
    if (!fissuraSnap.exists) {
      return res.status(200).json({ ok: true, msg: 'Sem dados de fissura para este mês' });
    }
    const fissuraData = fissuraSnap.data();

    // ── 2. Determinar vencedor (maior média) ──
    const faccoes = ['Caos', 'Equilíbrio', 'Éter'];
    let vencedor = null;
    let melhorMedia = -1;

    for (const f of faccoes) {
      const fd = fissuraData[f];
      if (!fd || !fd.membros) continue;
      const media = (fd.pontosTotal || 0) / fd.membros;
      if (media > melhorMedia) {
        melhorMedia = media;
        vencedor    = f;
      }
    }

    if (!vencedor) {
      return res.status(200).json({ ok: true, msg: 'Sem participantes' });
    }

    console.log(`[fissura-reset] Vencedor: ${vencedor} (média: ${melhorMedia.toFixed(0)})`);

    // ── 3. Ler saldo da pool ──
    const poolSnap = await db.collection('config').doc('pool').get();
    const poolSaldo = poolSnap.exists ? (poolSnap.data()?.cristais || 0) : 0;

    const premioRaroPorMembro = Math.min(CAP_RARO, Math.floor(poolSaldo * PCT_POOL_RARO));
    const premioLendPorMembro = Math.min(CAP_LEND, Math.floor(poolSaldo * PCT_POOL_LEND));

    // ── 4. Buscar todos os jogadores inscritos neste mês ──
    const jogadoresSnap = await db.collection('players')
      .where('fissuraMes', '==', mes)
      .get();

    // Separar qualificados da facção vencedora por raridade
    const qualComum = [];
    const qualRaro  = [];
    const qualLend  = [];

    jogadoresSnap.docs.forEach(doc => {
      const d = doc.data();
      if (d.faccao !== vencedor) return;
      if ((d.fissuraPontos || 0) < PONTOS_MINIMOS) return;
      const rar = d.fissuraRaridade || 'Comum';
      if (rar === 'Lendário') qualLend.push(doc);
      else if (rar === 'Raro') qualRaro.push(doc);
      else                     qualComum.push(doc);
    });

    console.log(`[fissura-reset] Qualificados — Comum:${qualComum.length} Raro:${qualRaro.length} Lend:${qualLend.length}`);

    // ── 5. Distribuir prémios em batches ──
    const BATCH_SIZE = 400;
    let batch   = db.batch();
    let opCount = 0;
    let totalCristaisDistribuidos = 0;

    const flush = async () => { await batch.commit(); batch = db.batch(); opCount = 0; };
    const inc   = () => { opCount++; if (opCount >= BATCH_SIZE) return flush(); return Promise.resolve(); };

    // Comuns → moedas
    for (const doc of qualComum) {
      batch.update(doc.ref, {
        'gs.moedas': FieldValue.increment(PREMIO_COMUM),
        moedas:      FieldValue.increment(PREMIO_COMUM),
        fissuraVitoria: mes,
      });
      await inc();
    }

    // Raros → cristais da pool
    if (premioRaroPorMembro > 0) {
      for (const doc of qualRaro) {
        batch.update(doc.ref, {
          'gs.cristais': FieldValue.increment(premioRaroPorMembro),
          cristais:      FieldValue.increment(premioRaroPorMembro),
          fissuraVitoria: mes,
        });
        totalCristaisDistribuidos += premioRaroPorMembro;
        await inc();
      }
    }

    // Lendários → cristais da pool
    if (premioLendPorMembro > 0) {
      for (const doc of qualLend) {
        batch.update(doc.ref, {
          'gs.cristais': FieldValue.increment(premioLendPorMembro),
          cristais:      FieldValue.increment(premioLendPorMembro),
          fissuraVitoria: mes,
        });
        totalCristaisDistribuidos += premioLendPorMembro;
        await inc();
      }
    }

    // ── 6. Debitar cristais da pool ──
    if (totalCristaisDistribuidos > 0) {
      const poolRef = db.collection('config').doc('pool');
      batch.update(poolRef, {
        cristais:  FieldValue.increment(-totalCristaisDistribuidos),
        totalSaiu: FieldValue.increment(totalCristaisDistribuidos),
      });
      const logRef = poolRef.collection('logs').doc();
      batch.set(logRef, {
        tipo:   'saida',
        motivo: `Grande Fissura ${mes} — prémio facção ${vencedor}`,
        origem: 'fissura-reset',
        total:  totalCristaisDistribuidos,
        pool:   -totalCristaisDistribuidos,
        ts:     FieldValue.serverTimestamp(),
      });
      opCount += 2;
      if (opCount >= BATCH_SIZE) await flush();
    }

    // ── 7. Gravar resultado no doc da fissura ──
    batch.set(db.collection('fissura').doc(mes), {
      vencedor,
      mediaVencedor:       Math.round(melhorMedia),
      premioRaroPorMembro,
      premioLendPorMembro,
      premioComumPorMembro: PREMIO_COMUM,
      qualComum:   qualComum.length,
      qualRaro:    qualRaro.length,
      qualLend:    qualLend.length,
      processadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    opCount++;
    if (opCount >= BATCH_SIZE) await flush();

    // ── 8. Limpar campos de fissura de TODOS os jogadores inscritos ──
    for (const doc of jogadoresSnap.docs) {
      batch.update(doc.ref, {
        faccao:          FieldValue.delete(),
        fissuraMes:      FieldValue.delete(),
        fissuraPontos:   FieldValue.delete(),
        fissuraRaridade: FieldValue.delete(),
      });
      await inc();
    }

    // Flush final
    if (opCount > 0) await batch.commit();

    console.log(`[fissura-reset] Concluído — ${totalCristaisDistribuidos}💎 distribuídos`);

    return res.status(200).json({
      ok: true,
      mes,
      vencedor,
      mediaVencedor:       Math.round(melhorMedia),
      qualComum:           qualComum.length,
      qualRaro:            qualRaro.length,
      qualLend:            qualLend.length,
      cristaisDistribuidos: totalCristaisDistribuidos,
    });

  } catch (err) {
    console.error('[fissura-reset] erro:', err);
    return res.status(500).json({ erro: err.message });
  }
};
