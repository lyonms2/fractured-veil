// ═══════════════════════════════════════════════════════════════
//  api/resgatar.js — Vercel Serverless Function
//
//  O que esta função faz:
//    1. Recebe o pedido do jogador (carteira + quantidade de 💎)
//    2. Verifica se o jogador tem 💎 suficientes no Firestore
//    3. Debita os 💎 atomicamente (se falhar, reverte — sem perda)
//    4. Assina a autorização com a chave privada do servidor
//    5. Devolve a assinatura ao frontend
//
//  O frontend usa a assinatura para chamar withdraw() no contrato.
//  Sem esta assinatura, o contrato recusa qualquer resgate.
//
//  Variáveis de ambiente necessárias no Vercel:
//    SIGNER_PRIVATE_KEY   — chave privada da wallet 0x0d9fc5...5fd2
//    CONTRACT_ADDRESS     — endereço do contrato após deploy
//    FIREBASE_PROJECT_ID  — ex: fractured-veil
//    FIREBASE_CLIENT_EMAIL
//    FIREBASE_PRIVATE_KEY
// ═══════════════════════════════════════════════════════════════

const { ethers }                   = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

// ── Firebase Admin (inicializa uma vez por instância) ──────────
function getDB() {
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

// ── Taxa de câmbio (tem de coincidir com o contrato) ───────────
const RATE = 10; // 10 💎 = 1 MATIC

// ── Máximo por resgate ─────────────────────────────────────────
// Protecção extra no servidor — jogadores comuns têm limite de
// 5 MATIC/dia no contrato, mas permitimos resgates até 100 💎
// de uma vez para não forçar múltiplas transacções.
const MAX_GEMS_POR_RESGATE = 100;

module.exports = async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { jogador, gems } = req.body;

  // ── Validar endereço ────────────────────────────────────────
  if (!jogador || !ethers.isAddress(jogador)) {
    return res.status(400).json({ erro: 'Endereço de carteira inválido' });
  }

  // ── Validar quantidade ──────────────────────────────────────
  const gemsNum = parseInt(gems, 10);
  if (!gemsNum || gemsNum <= 0 || gemsNum > MAX_GEMS_POR_RESGATE) {
    return res.status(400).json({
      erro: `Quantidade de 💎 inválida (1 a ${MAX_GEMS_POR_RESGATE})`
    });
  }

  // Endereço normalizado para o Firestore (lowercase consistente)
  const jogadorAddr = jogador.toLowerCase();
  // Endereço com checksum correcto para a assinatura on-chain
  const jogadorChecksum = ethers.getAddress(jogador);

  const maticAEnviar = gemsNum / RATE;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === 'PENDENTE_DEPLOY') {
    return res.status(500).json({ erro: 'Contrato ainda não deployado' });
  }

  try {
    const db     = getDB();
    const userRef = db.collection('players').doc(jogadorAddr);

    // ── Transacção atómica ──────────────────────────────────────
    // Verifica saldo, debita e assina tudo num único bloco.
    // Se qualquer passo falhar, o Firestore reverte — o jogador
    // não perde 💎 sem receber MATIC.
    const resultado = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists) {
        throw new Error('Jogador não encontrado');
      }

      const data = userSnap.data();

      // Cristais estão em gs.cristais (fallback para cristais na raiz)
      const cristais = data?.gs?.cristais ?? data?.cristais ?? 0;

      if (cristais < gemsNum) {
        throw new Error(
          `Saldo insuficiente: tens ${cristais} 💎, precisas de ${gemsNum} 💎`
        );
      }

      // Gerar nonce único — usa timestamp em ms (único por jogador na prática)
      const nonce = Date.now();

      // Assinar a autorização
      // Mensagem = keccak256(jogador, gems, nonce, contrato)
      // Tem de coincidir EXACTAMENTE com o que o contrato verifica
      const wallet  = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
      const msgHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'address'],
        [jogadorChecksum, gemsNum, nonce, contractAddress]
      );
      const sig       = await wallet.signMessage(ethers.getBytes(msgHash));
      const { v, r, s } = ethers.Signature.from(sig);

      // Debitar 💎 atomicamente
      tx.update(userRef, {
        'gs.cristais': FieldValue.increment(-gemsNum),
      });

      // Registar o resgate no histórico do jogador
      const logRef = userRef.collection('resgates').doc();
      tx.set(logRef, {
        gems:   gemsNum,
        matic:  maticAEnviar,
        nonce,
        ts:     new Date(),
        status: 'autorizado', // actualizar para 'confirmado' após tx on-chain
      });

      return { v, r, s, nonce };
    });

    // ── Resposta ao frontend ────────────────────────────────────
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
