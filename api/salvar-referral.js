// ═══════════════════════════════════════════════════════════════
//  api/salvar-referral.js — Vercel Serverless Function
//
//  Body: { idToken, refUid }
//
//  Registra a cadeia de referral (até 3 níveis) no doc do jogador.
//  Chamado uma única vez no primeiro login quando ?ref=UID está na URL.
//
//  Cadeia imutável: uma vez salva, nunca é sobrescrita.
//  Anti-circular: o jogador não pode aparecer na própria cadeia.
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

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

  const { idToken, refUid } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!refUid || typeof refUid !== 'string' || refUid.length < 5) {
    return res.status(400).json({ erro: 'refUid inválido' });
  }

  const { db, auth } = initAdmin();

  // Verificar identidade via Firebase ID token
  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  // Não pode convidar a si mesmo
  if (uid === refUid) {
    return res.status(400).json({ erro: 'Não é possível usar seu próprio link de convite' });
  }

  try {
    const playerRef = db.collection('players').doc(uid);
    const refRef    = db.collection('players').doc(refUid);

    const [playerSnap, refSnap] = await Promise.all([playerRef.get(), refRef.get()]);

    // O convidador deve existir no jogo
    if (!refSnap.exists) {
      return res.status(400).json({ erro: 'Jogador convidador não encontrado' });
    }

    // Cadeia já registada — imutável, não sobrescrever
    if (playerSnap.exists && playerSnap.data()?.referralChain) {
      return res.status(200).json({ ok: true, skip: true });
    }

    // Construir cadeia de até 3 níveis a partir da cadeia do convidador:
    //   L1 = quem me convidou
    //   L2 = quem convidou o L1 (avô)
    //   L3 = quem convidou o L2 (bisavô)
    const refData  = refSnap.data() || {};
    const refChain = refData.referralChain || {};

    const chain = { l1: refUid };
    if (refChain.l1) chain.l2 = refChain.l1;
    if (refChain.l2) chain.l3 = refChain.l2;

    // Proteção anti-circular: o uid não pode estar na própria cadeia
    if (Object.values(chain).includes(uid)) {
      return res.status(400).json({ erro: 'Referral circular detectado' });
    }

    // Salvar cadeia no doc do jogador (cria o doc se ainda não existir)
    await playerRef.set({ referralChain: chain }, { merge: true });

    // Incrementar contador de convidados diretos do L1
    await refRef.set({ referralCount: FieldValue.increment(1) }, { merge: true });

    return res.status(200).json({ ok: true, chain });

  } catch (err) {
    console.error('[salvar-referral]', err.message);
    return res.status(500).json({ erro: 'Erro interno' });
  }
};
