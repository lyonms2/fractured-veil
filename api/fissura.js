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

// ── Handler principal ───────────────────────────────────────────
module.exports = async function handler(req, res) {
  const { db, auth } = initAdmin();

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
        moedas:        novasMoedas,
        'gs.cristais': novosCristais,
        cristais:      novosCristais,
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
