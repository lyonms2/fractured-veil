// ═══════════════════════════════════════════════════════════════
//  api/processar-compra.js — Vercel Serverless Function
//
//  Body esperado:
//    { jogador: "<uid Firebase>", carteira: "0x...", txHash: "0x..." }
//
//  jogador = uid do Firebase Auth (doc ID no Firestore)
//  carteira = endereço Ethereum (para verificar a tx on-chain)
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');

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

const RATE             = 10;
const MAX_GEMS_CREDITO = 1000;

const CONTRACT_ABI = [
  'event CristaisComprados(address indexed jogador, uint256 maticEnviado, uint256 gems)',
];

const POLYGON_RPCS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://polygon.meowrpc.com',
  'https://polygon.llamarpc.com',
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  // jogador = uid Firebase, carteira = endereço Ethereum
  const { jogador, carteira, txHash } = req.body;

  // ── Validar inputs ──
  if (!jogador || typeof jogador !== 'string' || jogador.length < 10) {
    return res.status(400).json({ erro: 'Identificador de jogador inválido' });
  }
  if (!carteira || !ethers.isAddress(carteira)) {
    return res.status(400).json({ erro: 'Endereço de carteira inválido' });
  }
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ erro: 'Hash de transação inválido' });
  }

  const carteiraAddr    = carteira.toLowerCase();
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === 'PENDENTE_DEPLOY') {
    return res.status(500).json({ erro: 'Contrato ainda não configurado' });
  }

  try {
    const db = getDB();

    // ── Anti-duplo ──
    const compraRef  = db.collection('compras').doc(txHash);
    const compraSnap = await compraRef.get();
    if (compraSnap.exists) {
      return res.status(409).json({ erro: 'Transação já processada' });
    }

    // ── Verificar tx on-chain ──
    let recibo = null;
    for (const rpc of POLYGON_RPCS) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc);
        recibo = await provider.getTransactionReceipt(txHash);
        break;
      } catch (rpcErr) {
        console.warn(`[processar-compra] RPC ${rpc} falhou:`, rpcErr.message);
      }
    }
    if (recibo === null) {
      return res.status(503).json({ erro: 'Blockchain inacessível. Tenta novamente em instantes.' });
    }
    if (!recibo) {
      return res.status(400).json({ erro: 'Transação ainda não confirmada na blockchain' });
    }
    if (recibo.status !== 1) {
      return res.status(400).json({ erro: 'Transação falhou on-chain' });
    }

    // Verifica que foi para o nosso contrato
    if (recibo.to?.toLowerCase() !== contractAddress.toLowerCase()) {
      return res.status(400).json({ erro: 'Transação não dirigida ao contrato correcto' });
    }

    // Verifica que foi enviada pela carteira do jogador
    if (recibo.from?.toLowerCase() !== carteiraAddr) {
      return res.status(400).json({ erro: 'Transação não foi enviada pela tua carteira' });
    }

    // ── Ler evento CristaisComprados ──
    const iface = new ethers.Interface(CONTRACT_ABI);
    let gemsACreditar = 0;
    let maticEnviado  = 0n;

    for (const log of recibo.logs) {
      if (log.address?.toLowerCase() !== contractAddress.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'CristaisComprados') {
          if (parsed.args.jogador?.toLowerCase() !== carteiraAddr) continue;
          maticEnviado  = parsed.args.maticEnviado;
          gemsACreditar = Number(parsed.args.gems);
          break;
        }
      } catch { /* log de outro contrato */ }
    }

    if (gemsACreditar <= 0) {
      return res.status(400).json({ erro: 'Evento CristaisComprados não encontrado nesta transação' });
    }
    if (gemsACreditar > MAX_GEMS_CREDITO) {
      console.error(`[processar-compra] gems suspeitos: ${gemsACreditar} para ${jogador}`);
      return res.status(400).json({ erro: 'Quantidade de 💎 fora dos limites esperados' });
    }

    // ── Creditar no Firestore usando uid como doc ID ──
    const playerRef = db.collection('players').doc(jogador);

    await db.runTransaction(async (tx) => {
      const compraCheck = await tx.get(compraRef);
      if (compraCheck.exists) throw new Error('ALREADY_PROCESSED');

      const playerSnap = await tx.get(playerRef);

      if (playerSnap.exists) {
        tx.update(playerRef, {
          'gs.cristais': FieldValue.increment(gemsACreditar),
          cristais:      FieldValue.increment(gemsACreditar),
          // Guarda a carteira vinculada se ainda não estiver registada
          carteira:      carteiraAddr,
        });
      } else {
        tx.set(playerRef, {
          gs:       { cristais: gemsACreditar },
          cristais: gemsACreditar,
          carteira: carteiraAddr,
          criadoEm: new Date(),
        });
      }

      tx.set(compraRef, {
        jogador,
        carteira:     carteiraAddr,
        txHash,
        gems:         gemsACreditar,
        maticWei:     maticEnviado.toString(),
        processadoEm: new Date(),
      });

      const logRef = playerRef.collection('compras').doc(txHash);
      tx.set(logRef, {
        gems:     gemsACreditar,
        maticWei: maticEnviado.toString(),
        txHash,
        ts:       new Date(),
      });
    });

    return res.status(200).json({
      ok:   true,
      gems: gemsACreditar,
      matic: Number(ethers.formatEther(maticEnviado)),
    });

  } catch (err) {
    if (err.message === 'ALREADY_PROCESSED') {
      return res.status(409).json({ erro: 'Transação já processada' });
    }
    console.error('[processar-compra] erro:', err.message);
    return res.status(500).json({ erro: 'Erro interno ao processar compra' });
  }
};
