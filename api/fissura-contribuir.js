// ═══════════════════════════════════════════════════════════════
//  api/fissura-contribuir.js — Vercel Serverless Function
//
//  Adiciona pontos à facção do jogador na Grande Fissura.
//  Chamado internamente pelas outras APIs (pvp-recompensa,
//  cambiar, login diário, PVE).
//
//  Body esperado:
//    { idToken: "...", atividade: "pve_vitoria"|"pvp_vitoria_comum"|... }
//
//  Atividades e pontos:
//    login_diario      →  5
//    pve_completo      →  8
//    pve_vitoria       → 15
//    cambio            → 10
//    pvp_derrota       →  5
//    pvp_empate        → 10
//    pvp_vitoria_comum → 20
//    pvp_vitoria_raro  → 35
//    pvp_vitoria_lend  → 50
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

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
  return new Date().toISOString().slice(0, 7);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { idToken, atividade } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!atividade || !PONTOS[atividade]) {
    return res.status(400).json({ erro: 'Atividade inválida' });
  }

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const mes       = getMesAtual();
  const pontos    = PONTOS[atividade];
  const playerRef = db.collection('players').doc(uid);

  try {
    const playerSnap = await playerRef.get();
    if (!playerSnap.exists) return res.status(200).json({ ok: true, ignorado: true });

    const data = playerSnap.data();

    // Só contribui se estiver inscrito neste mês
    if (data.fissuraMes !== mes || !data.faccao) {
      return res.status(200).json({ ok: true, ignorado: true });
    }

    const faccao     = data.faccao;
    const fissuraRef = db.collection('fissura').doc(mes);

    // Actualiza pontos do jogador e da facção atomicamente
    const batch = db.batch();

    batch.update(playerRef, {
      fissuraPontos: FieldValue.increment(pontos),
    });

    batch.set(fissuraRef, {
      [faccao]: {
        pontosTotal: FieldValue.increment(pontos),
      },
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    const novosPontos = (data.fissuraPontos || 0) + pontos;

    return res.status(200).json({
      ok:      true,
      pontos,
      totalJogador: novosPontos,
      faccao,
    });

  } catch (err) {
    console.error('[fissura-contribuir]', err.message);
    // Não retorna erro — não deve bloquear o fluxo principal
    return res.status(200).json({ ok: true, ignorado: true });
  }
};
