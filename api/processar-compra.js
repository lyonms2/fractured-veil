// ═══════════════════════════════════════════════════════════════
//  api/processar-compra.js — Vercel Serverless Function
//
//  O que esta função faz:
//    1. Recebe o tx hash da transação confirmada no MetaMask
//    2. Liga-se à Polygon Mainnet via RPC público
//    3. Lê o recibo da transação e verifica o evento CristaisComprados
//    4. Confirma que o destinatário é o nosso contrato
//    5. Confirma que quem enviou foi a carteira do jogador
//    6. Calcula os 💎 a creditar (MATIC enviado × RATE)
//    7. Verifica se este tx hash já foi processado (anti-duplo)
//    8. Credita os 💎 no Firestore atomicamente
//
//  Chamada pelo frontend após tx.wait() confirmar on-chain.
//
//  Body esperado:
//    { jogador: "0x...", txHash: "0x..." }
//
//  Variáveis de ambiente necessárias no Vercel:
//    CONTRACT_ADDRESS     — endereço do contrato deployado
//    FIREBASE_PROJECT_ID
//    FIREBASE_CLIENT_EMAIL
//    FIREBASE_PRIVATE_KEY
//
//  Nota: não precisa de SIGNER_PRIVATE_KEY (não assina nada aqui)
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');

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

// ── Configuração ───────────────────────────────────────────────
const RATE             = 10;   // 10 💎 = 1 MATIC (tem de coincidir com o contrato)
const MAX_GEMS_CREDITO = 1000; // tecto de segurança por transação

// Split de distribuição dos 💎
// 80% vai para o jogador, 20% vai para a conta dev no Firestore
// (transparente — visível no histórico de ambas as contas)
const PLAYER_SHARE = 0.80;
const DEV_SHARE    = 0.20;
const DEV_ADDR     = '0x1fcb61db743a0276b92382b9e7b92a62ca8cf030'; // owner do contrato (lowercase)

// ABI mínimo — só precisamos do evento CristaisComprados
const CONTRACT_ABI = [
  'event CristaisComprados(address indexed jogador, uint256 maticEnviado, uint256 gems)',
];

// RPC da Polygon Mainnet — lista de fallback por ordem de prioridade
// Todos verificados como gratuitos sem chave de API
const POLYGON_RPCS = [
  'https://polygon-bor-rpc.publicnode.com',  // PublicNode — gratuito sem chave
  'https://polygon.drpc.org',                // dRPC — gratuito sem chave
  'https://polygon.meowrpc.com',             // MeowRPC — gratuito sem chave
  'https://polygon.llamarpc.com',            // LlamaRPC — gratuito sem chave
];

module.exports = async function handler(req, res) {
  // ── Apenas POST ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { jogador, txHash } = req.body;

  // ── Validar inputs ──────────────────────────────────────────
  if (!jogador || !ethers.isAddress(jogador)) {
    return res.status(400).json({ erro: 'Endereço de carteira inválido' });
  }
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ erro: 'Hash de transação inválido' });
  }

  const jogadorAddr    = jogador.toLowerCase();
  const jogadorChecksum = ethers.getAddress(jogador);
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === 'PENDENTE_DEPLOY') {
    return res.status(500).json({ erro: 'Contrato ainda não configurado' });
  }

  try {
    const db = getDB();

    // ── Anti-duplo: verifica se este tx hash já foi processado ──
    // Guarda em compras/{txHash} — doc ID único por transação
    const compraRef = db.collection('compras').doc(txHash);
    const compraSnap = await compraRef.get();
    if (compraSnap.exists) {
      return res.status(409).json({ erro: 'Transação já processada' });
    }

    // ── Verificar transação on-chain ────────────────────────────
    // Tenta cada RPC em sequência até um responder
    let recibo = null;
    for (const rpc of POLYGON_RPCS) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc);
        recibo = await provider.getTransactionReceipt(txHash);
        break; // sucesso — sai do loop
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
    if (recibo.from?.toLowerCase() !== jogadorAddr) {
      return res.status(400).json({ erro: 'Transação não foi enviada pela tua carteira' });
    }

    // ── Ler o evento CristaisComprados do recibo ────────────────
    const iface  = new ethers.Interface(CONTRACT_ABI);
    let gemsACreditar = 0;
    let maticEnviado  = 0n;

    for (const log of recibo.logs) {
      // Filtra só os logs do nosso contrato
      if (log.address?.toLowerCase() !== contractAddress.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'CristaisComprados') {
          // Confirma que o evento é para este jogador
          if (parsed.args.jogador?.toLowerCase() !== jogadorAddr) continue;
          maticEnviado  = parsed.args.maticEnviado; // BigInt em wei
          gemsACreditar = Number(parsed.args.gems);  // já calculado pelo contrato
          break;
        }
      } catch {
        // Log de outro contrato — ignora
      }
    }

    if (gemsACreditar <= 0) {
      return res.status(400).json({
        erro: 'Evento CristaisComprados não encontrado nesta transação'
      });
    }

    // Tecto de segurança extra
    if (gemsACreditar > MAX_GEMS_CREDITO) {
      console.error(`[processar-compra] gems suspeitos: ${gemsACreditar} para ${jogadorAddr}`);
      return res.status(400).json({ erro: 'Quantidade de 💎 fora dos limites esperados' });
    }

    // ── Creditar 💎 atomicamente no Firestore ───────────────────
    const playerRef = db.collection('players').doc(jogadorAddr);

    await db.runTransaction(async (tx) => {
      // Re-verifica anti-duplo dentro da transacção (race condition)
      const compraCheck = await tx.get(compraRef);
      if (compraCheck.exists) {
        throw new Error('ALREADY_PROCESSED');
      }

      const playerSnap = await tx.get(playerRef);

      if (playerSnap.exists) {
        // Jogador já existe — incrementa cristais
        tx.update(playerRef, {
          'gs.cristais': FieldValue.increment(gemsACreditar),
          cristais:      FieldValue.increment(gemsACreditar),
        });
      } else {
        // Jogador novo — cria documento mínimo
        tx.set(playerRef, {
          gs:      { cristais: gemsACreditar },
          cristais: gemsACreditar,
          criadoEm: new Date(),
        });
      }

      // Regista a compra para evitar duplo-crédito
      tx.set(compraRef, {
        jogador:      jogadorAddr,
        txHash,
        gems:         gemsACreditar,
        maticWei:     maticEnviado.toString(),
        processadoEm: new Date(),
      });

      // Histórico da compra no perfil do jogador
      const logRef = playerRef.collection('compras').doc(txHash);
      tx.set(logRef, {
        gems:         gemsACreditar,
        maticWei:     maticEnviado.toString(),
        txHash,
        ts:           new Date(),
      });
    });

    // ── Resposta ao frontend ────────────────────────────────────
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
