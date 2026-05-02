// ═══════════════════════════════════════════════════════════════
//  api/fissura.js — Vercel Serverless Function
//  Rota única para a Grande Fissura.
//
//  Body esperado:
//    { acao: "inscrever"|"contribuir", idToken: "...", ...params }
//
//  acao=inscrever  → { faccao: "Caos"|"Equilíbrio"|"Éter" }
//  acao=contribuir → { atividade: "login_diario"|"pve_vitoria"|... }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const { sendAwardsWebhook }            = require('./_discord');

// ── Constantes ──────────────────────────────────────────────────
const FACCOES = ['Caos', 'Equilíbrio', 'Éter'];

const TAXA_INSCRICAO = {
  Comum:    { moedas: 200, cristais: 0  },
  Raro:     { moedas: 0,   cristais: 5  },
  Lendário: { moedas: 0,   cristais: 10 },
};

const PONTOS = {
  login_diario:       5,
  pve_completo:       8,
  pve_vitoria:       15,
  cambio:            10,
  pvp_derrota:        5,
  pvp_empate:        10,
  pvp_vitoria_comum: 20,
  pvp_vitoria_raro:  35,
  pvp_vitoria_lend:  50,
};

// ── Admin SDK ───────────────────────────────────────────────────
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

function getMesAtual() {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

// ── Constantes do reset mensal (anteriormente em fissura-reset.js) ──
const PONTOS_MINIMOS   = 1000;
const PCT_POOL_RARO    = 0.04;
const PCT_POOL_LEND    = 0.08;
const CAP_RARO         = 15;
const CAP_LEND         = 30;
const PREMIO_COMUM     = 500;

function getMesAnterior() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

// ── Handler principal ───────────────────────────────────────────
module.exports = async function handler(req, res) {
  const { db, auth } = initAdmin();

  // GET /api/fissura?cron=reset — cron mensal Vercel (sem auth de utilizador)
  if (req.method === 'GET' && req.query?.cron === 'reset') {
    return handleReset(req, res, db);
  }

  // GET /api/fissura?mes=2026-04 — dados públicos dos standings (sem auth)
  if (req.method === 'GET') {
    const mes = req.query?.mes || getMesAtual();
    try {
      const fissuraSnap = await db.collection('fissura').doc(mes).get();
      return res.status(200).json({
        ok:   true,
        mes,
        data: fissuraSnap.exists ? fissuraSnap.data() : null,
      });
    } catch(e) {
      return res.status(500).json({ erro: 'Erro ao carregar dados.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { acao, idToken } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }

  // acao=dados: retorna dados do jogador + standings (autenticado)
  if (acao === 'dados') {
    let uid;
    try { const d = await auth.verifyIdToken(idToken); uid = d.uid; }
    catch { return res.status(401).json({ erro: 'Token inválido ou expirado' }); }
    return handleDados(req, res, db, uid);
  }

  if (acao !== 'inscrever' && acao !== 'contribuir') {
    return res.status(400).json({ erro: 'acao inválida' });
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  if (acao === 'inscrever') return handleInscrever(req, res, db, uid);
  if (acao === 'contribuir') return handleContribuir(req, res, db, uid);
};

// ── Dados (jogador + standings) ─────────────────────────────────
async function handleDados(req, res, db, uid) {
  const mes = getMesAtual();
  try {
    const [playerSnap, fissuraSnap] = await Promise.all([
      db.collection('players').doc(uid).get(),
      db.collection('fissura').doc(mes).get(),
    ]);
    const player  = playerSnap.exists  ? playerSnap.data()  : null;
    const global  = fissuraSnap.exists ? fissuraSnap.data() : null;
    return res.status(200).json({
      ok: true,
      mes,
      faccao:          player?.faccao          || null,
      fissuraMes:      player?.fissuraMes      || null,
      fissuraPontos:   player?.fissuraPontos   || 0,
      fissuraRaridade: player?.fissuraRaridade || null,
      global,
    });
  } catch(e) {
    return res.status(500).json({ erro: 'Erro ao carregar dados.' });
  }
}

// ── Inscrever ───────────────────────────────────────────────────
async function handleInscrever(req, res, db, uid) {
  const { faccao } = req.body;

  if (!faccao || !FACCOES.includes(faccao)) {
    return res.status(400).json({ erro: 'Facção inválida' });
  }

  const mes        = getMesAtual();
  const playerRef  = db.collection('players').doc(uid);
  const fissuraRef = db.collection('fissura').doc(mes);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const playerSnap  = await tx.get(playerRef);
      const fissuraSnap = await tx.get(fissuraRef);

      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const data = playerSnap.data();

      if (data.fissuraMes === mes) {
        throw new Error('Já estás inscrito na Fissura deste mês');
      }

      const activeSlot = (data.avatarSlots || [])[data.gs?.activeSlot ?? data.activeSlot ?? 0];
      if (!activeSlot || !activeSlot.hatched || activeSlot.dead) {
        throw new Error('Precisas de um avatar ativo para participar');
      }
      const raridade = activeSlot.raridade || 'Comum';
      const taxa     = TAXA_INSCRICAO[raridade] || TAXA_INSCRICAO.Comum;

      const moedas   = data.gs?.moedas   ?? data.moedas   ?? 0;
      const cristais = data.gs?.cristais ?? data.cristais ?? 0;

      if (taxa.moedas   > 0 && moedas   < taxa.moedas)   throw new Error(`Saldo insuficiente: precisas de ${taxa.moedas} 🪙`);
      if (taxa.cristais > 0 && cristais < taxa.cristais) throw new Error(`Saldo insuficiente: precisas de ${taxa.cristais} 💎`);

      const novasMoedas   = moedas   - taxa.moedas;
      const novosCristais = cristais - taxa.cristais;

      tx.update(playerRef, {
        'gs.moedas':   novasMoedas,
        'gs.cristais': novosCristais,
        faccao,
        fissuraMes:      mes,
        fissuraPontos:   0,
        fissuraRaridade: raridade,
      });

      const fissuraData = fissuraSnap.exists ? fissuraSnap.data() : {};
      const facData = fissuraData[faccao] || { pontosTotal: 0, membros: 0 };

      tx.set(fissuraRef, {
        [faccao]: {
          pontosTotal: facData.pontosTotal || 0,
          membros:     (facData.membros || 0) + 1,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      if (taxa.cristais > 0) {
        const poolRef = db.collection('config').doc('pool');
        tx.update(poolRef, {
          cristais:    FieldValue.increment(taxa.cristais),
          totalEntrou: FieldValue.increment(taxa.cristais),
        });
      }

      return { raridade, taxa, novasMoedas, novosCristais };
    });

    return res.status(200).json({
      ok:       true,
      faccao,
      raridade: resultado.raridade,
      taxa:     resultado.taxa,
      novoSaldoMoedas:   resultado.novasMoedas,
      novoSaldoCristais: resultado.novosCristais,
    });

  } catch (err) {
    console.error('[fissura/inscrever]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}

// ── Contribuir ──────────────────────────────────────────────────
async function handleContribuir(req, res, db, uid) {
  const { atividade } = req.body;

  if (!atividade || !PONTOS[atividade]) {
    return res.status(400).json({ erro: 'Atividade inválida' });
  }

  const mes       = getMesAtual();
  const pontos    = PONTOS[atividade];
  const playerRef = db.collection('players').doc(uid);

  try {
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) return res.status(200).json({ ok: true, ignorado: true });

    const data = playerSnap.data();

    if (data.fissuraMes !== mes || !data.faccao) {
      return res.status(200).json({ ok: true, ignorado: true });
    }

    const faccao     = data.faccao;
    const fissuraRef = db.collection('fissura').doc(mes);

    const batch = db.batch();
    batch.update(playerRef, { fissuraPontos: FieldValue.increment(pontos) });
    batch.set(fissuraRef, {
      [faccao]: { pontosTotal: FieldValue.increment(pontos) },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    return res.status(200).json({
      ok:     true,
      pontos,
      totalJogador: (data.fissuraPontos || 0) + pontos,
      faccao,
    });

  } catch (err) {
    console.error('[fissura/contribuir]', err.message);
    // Não bloqueia o fluxo principal
    return res.status(200).json({ ok: true, ignorado: true });
  }
}

// ── Reset mensal (cron GET ?cron=reset) ─────────────────────────
async function handleReset(req, res, db) {
  // Trigger manual via POST com token de admin
  if (req.method === 'POST') {
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== process.env.ADMIN_CRON_TOKEN) {
      return res.status(401).json({ erro: 'Não autorizado' });
    }
  }

  const mes = getMesAnterior();
  console.log(`[fissura-reset] A processar mês: ${mes}`);

  try {
    const fissuraSnap = await db.collection('fissura').doc(mes).get();
    if (!fissuraSnap.exists) {
      return res.status(200).json({ ok: true, msg: 'Sem dados de fissura para este mês' });
    }
    const fissuraData = fissuraSnap.data();

    const faccoes = ['Caos', 'Equilíbrio', 'Éter'];
    let vencedor = null, melhorMedia = -1;
    for (const f of faccoes) {
      const fd = fissuraData[f];
      if (!fd || !fd.membros) continue;
      const media = (fd.pontosTotal || 0) / fd.membros;
      if (media > melhorMedia) { melhorMedia = media; vencedor = f; }
    }
    if (!vencedor) return res.status(200).json({ ok: true, msg: 'Sem participantes' });

    console.log(`[fissura-reset] Vencedor: ${vencedor} (média: ${melhorMedia.toFixed(0)})`);

    const poolSnap  = await db.collection('config').doc('pool').get();
    const poolSaldo = poolSnap.exists ? (poolSnap.data()?.cristais || 0) : 0;
    const premioRaroPorMembro = Math.min(CAP_RARO, Math.floor(poolSaldo * PCT_POOL_RARO));
    const premioLendPorMembro = Math.min(CAP_LEND, Math.floor(poolSaldo * PCT_POOL_LEND));

    const jogadoresSnap = await db.collection('players').where('fissuraMes', '==', mes).get();
    const qualComum = [], qualRaro = [], qualLend = [];
    jogadoresSnap.docs.forEach(doc => {
      const d = doc.data();
      if (d.faccao !== vencedor || (d.fissuraPontos || 0) < PONTOS_MINIMOS) return;
      const rar = d.fissuraRaridade || 'Comum';
      if (rar === 'Lendário') qualLend.push(doc);
      else if (rar === 'Raro') qualRaro.push(doc);
      else qualComum.push(doc);
    });

    console.log(`[fissura-reset] Qualificados — Comum:${qualComum.length} Raro:${qualRaro.length} Lend:${qualLend.length}`);

    const BATCH_SIZE = 400;
    let batch = db.batch(), opCount = 0, totalCristaisDistribuidos = 0;
    const flush = async () => { await batch.commit(); batch = db.batch(); opCount = 0; };
    const inc   = async ()  => { opCount++; if (opCount >= BATCH_SIZE) await flush(); };

    for (const doc of qualComum) {
      batch.update(doc.ref, { 'gs.moedas': FieldValue.increment(PREMIO_COMUM), moedas: FieldValue.increment(PREMIO_COMUM), fissuraVitoria: mes });
      await inc();
    }
    if (premioRaroPorMembro > 0) {
      for (const doc of qualRaro) {
        batch.update(doc.ref, { 'gs.cristais': FieldValue.increment(premioRaroPorMembro), cristais: FieldValue.increment(premioRaroPorMembro), fissuraVitoria: mes });
        totalCristaisDistribuidos += premioRaroPorMembro;
        await inc();
      }
    }
    if (premioLendPorMembro > 0) {
      for (const doc of qualLend) {
        batch.update(doc.ref, { 'gs.cristais': FieldValue.increment(premioLendPorMembro), cristais: FieldValue.increment(premioLendPorMembro), fissuraVitoria: mes });
        totalCristaisDistribuidos += premioLendPorMembro;
        await inc();
      }
    }

    if (totalCristaisDistribuidos > 0) {
      const poolRef = db.collection('config').doc('pool');
      batch.update(poolRef, { cristais: FieldValue.increment(-totalCristaisDistribuidos), totalSaiu: FieldValue.increment(totalCristaisDistribuidos) });
      batch.set(poolRef.collection('logs').doc(), { tipo: 'saida', motivo: `Grande Fissura ${mes} — prémio facção ${vencedor}`, origem: 'fissura-reset', total: totalCristaisDistribuidos, pool: -totalCristaisDistribuidos, ts: FieldValue.serverTimestamp() });
      opCount += 2;
      if (opCount >= BATCH_SIZE) await flush();
    }

    batch.set(db.collection('fissura').doc(mes), { vencedor, mediaVencedor: Math.round(melhorMedia), premioRaroPorMembro, premioLendPorMembro, premioComumPorMembro: PREMIO_COMUM, qualComum: qualComum.length, qualRaro: qualRaro.length, qualLend: qualLend.length, processadoEm: FieldValue.serverTimestamp() }, { merge: true });
    opCount++;
    if (opCount >= BATCH_SIZE) await flush();

    for (const doc of jogadoresSnap.docs) {
      batch.update(doc.ref, { faccao: FieldValue.delete(), fissuraMes: FieldValue.delete(), fissuraPontos: FieldValue.delete(), fissuraRaridade: FieldValue.delete() });
      await inc();
    }
    if (opCount > 0) await batch.commit();

    console.log(`[fissura-reset] Concluído — ${totalCristaisDistribuidos}💎 distribuídos`);

    sendAwardsWebhook({
      title: `🌋 Grande Fissura — ${mes} concluída!`,
      description: `A facção **${vencedor}** dominou este mês com média de **${Math.round(melhorMedia)} pontos**!`,
      color: vencedor === 'Caos' ? 0xef4444 : vencedor === 'Éter' ? 0x7c3aed : 0x10b981,
      fields: [
        { name: '🏆 Facção Vencedora',  value: vencedor,                                                                                                    inline: true  },
        { name: '📊 Média de pontos',   value: String(Math.round(melhorMedia)),                                                                              inline: true  },
        { name: '🧬 Premiados Comum',   value: qualComum.length > 0 ? `${qualComum.length} jogadores · 🪙 ${PREMIO_COMUM} cada`         : 'Nenhum',          inline: false },
        { name: '💎 Premiados Raro',    value: qualRaro.length  > 0 ? `${qualRaro.length} jogadores · 💎 ${premioRaroPorMembro} cada`   : 'Nenhum',          inline: false },
        { name: '🌟 Premiados Lendário', value: qualLend.length > 0 ? `${qualLend.length} jogadores · 💎 ${premioLendPorMembro} cada`   : 'Nenhum',          inline: false },
        { name: '💎 Total distribuído', value: `${totalCristaisDistribuidos} cristais`,                                                                      inline: true  },
      ],
    }).catch(() => {});

    return res.status(200).json({ ok: true, mes, vencedor, mediaVencedor: Math.round(melhorMedia), qualComum: qualComum.length, qualRaro: qualRaro.length, qualLend: qualLend.length, cristaisDistribuidos: totalCristaisDistribuidos });

  } catch (err) {
    console.error('[fissura-reset] erro:', err);
    return res.status(500).json({ erro: err.message });
  }
}
