// ═══════════════════════════════════════════════════════════════
//  api/resgatar.js — Vercel Serverless Function
//
//  Body esperado:
//    { jogador: "<uid Firebase>", carteira: "0x...", gems: 10 }
//
//  jogador = uid do Firebase Auth (doc ID no Firestore)
//  carteira = endereço Ethereum (para assinar a autorização on-chain)
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
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

const RATE                 = 10;
const MAX_GEMS_POR_RESGATE = 100;
const MAX_GEMS_POR_DIA     = 50;  // 5 MATIC/dia por jogador

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  // idToken substitui jogador do body — uid é extraído server-side do token
  const { idToken, carteira, gems } = req.body;

  // ── Verificar identidade via Firebase ID token ──
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }

  const { db, auth } = initAdmin();

  let jogador;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    jogador = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  // ── Validar carteira Ethereum ──
  if (!carteira || !ethers.isAddress(carteira)) {
    return res.status(400).json({ erro: 'Endereço de carteira Ethereum inválido. Vincula a MetaMask primeiro.' });
  }

  // ── Validar quantidade ──
  const gemsNum = parseInt(gems, 10);
  if (!gemsNum || gemsNum <= 0 || gemsNum > MAX_GEMS_POR_RESGATE) {
    return res.status(400).json({ erro: `Quantidade de 💎 inválida (1 a ${MAX_GEMS_POR_RESGATE})` });
  }

  // Endereço com checksum correcto para assinatura on-chain
  const carteiraChecksum = ethers.getAddress(carteira);
  const maticAEnviar     = gemsNum / RATE;
  const contractAddress  = process.env.CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === 'PENDENTE_DEPLOY') {
    return res.status(500).json({ erro: 'Contrato ainda não deployado' });
  }

  try {
    // Doc ID = uid do Firebase (não o endereço Ethereum)
    const userRef = db.collection('players').doc(jogador);

    const resultado = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new Error('Jogador não encontrado');
      }

      const data     = userSnap.data();
      const cristais = data?.gs?.cristais ?? data?.cristais ?? 0;

      if (cristais < gemsNum) {
        throw new Error(`Saldo insuficiente: tens ${cristais} 💎, precisas de ${gemsNum} 💎`);
      }

      // ── Rate limit: mínimo 30 s entre resgates ──
      const ultimoResgate = data?.ultimoResgate || 0;
      if (Date.now() - ultimoResgate < 30000) {
        throw new Error('Aguarda 30 segundos entre resgates.');
      }

      // ── Limite diário de resgate ──
      const hoje        = new Date().toISOString().slice(0, 10);
      const resgateLog  = data?.resgateLog || null;
      const resgateHoje = (resgateLog?.data === hoje) ? (resgateLog.total || 0) : 0;
      if (resgateHoje + gemsNum > MAX_GEMS_POR_DIA) {
        const restante = Math.max(0, MAX_GEMS_POR_DIA - resgateHoje);
        throw new Error(`Limite diário atingido. Podes resgatar mais ${restante} 💎 hoje.`);
      }

      // ── Validar carteira (obrigatória) ──
      const carteiraGuardada = data?.carteira;
      if (!carteiraGuardada) {
        throw new Error('Vincula a MetaMask primeiro para poder resgatar.');
      }
      if (carteiraGuardada.toLowerCase() !== carteira.toLowerCase()) {
        throw new Error('Carteira não corresponde à conta. Vincula a carteira correcta.');
      }

      // Gerar nonce único
      const nonce = Date.now();

      // Assinar autorização — o contrato verifica esta assinatura
      // Mensagem = keccak256(carteira, gems, nonce, contrato)
      const wallet  = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
      const msgHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'address'],
        [carteiraChecksum, gemsNum, nonce, contractAddress]
      );
      const sig         = await wallet.signMessage(ethers.getBytes(msgHash));
      const { v, r, s } = ethers.Signature.from(sig);

      // Debitar 💎 + atualizar limite diário + rate limit timestamp
      const novoResgateHoje = resgateHoje + gemsNum;
      tx.update(userRef, {
        'gs.cristais': FieldValue.increment(-gemsNum),
        cristais:      FieldValue.increment(-gemsNum),
        resgateLog:    { data: hoje, total: novoResgateHoje },
        ultimoResgate: Date.now(),
      });

      // Histórico do resgate
      const logRef = userRef.collection('resgates').doc();
      tx.set(logRef, {
        gems:     gemsNum,
        matic:    maticAEnviar,
        carteira: carteira.toLowerCase(),
        nonce,
        ts:       new Date(),
        status:   'autorizado',
      });

      return { v, r, s, nonce };
    });

    return res.status(200).json({
      ok:    true,
      gems:  gemsNum,
      matic: maticAEnviar,
      nonce: resultado.nonce,
      v:     resultado.v,
      r:     resultado.r,
      s:     resultado.s,
    });

  } catch (err) {
    console.error('[resgatar] erro:', err.message);
    return res.status(400).json({ erro: err.message });
  }
};
