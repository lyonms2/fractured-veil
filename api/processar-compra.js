// ═══════════════════════════════════════════════════════════════
//  api/processar-compra.js — Vercel Serverless Function
//
//  Body esperado:
//    { idToken: "<token do Firebase Auth>", txHash: "0x..." }
//
//  A conta sai do idToken, e a carteira sai do documento da conta — a
//  que foi vinculada com assinatura (vincular-carteira, api/resgatar.js).
//  Nenhuma das duas vem do corpo do pedido: vinham, e quem visse uma
//  compra na blockchain podia pedir o crédito dela para a própria conta.
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

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
function getAuthAdmin() { getDB(); return getAuth(); }

const RATE             = 10;

/* O BÓNUS DE COMPRA
   ═══════════════════════════════════════════════════════════════════
   10% sobre o que o contrato cunhou: deposita 100 💎, ganha +10.

   Vai para gs.cristaisBonus e NÃO para gs.cristais, e é aí que está
   tudo. Os cristais normais têm MATIC no cofre a cobri-los; os de
   bónus não têm nenhum. Se fossem resgatáveis, quem depositasse 10
   MATIC recebia 110 💎 e sacava 10,89 MATIC de volta — 0,89 de lucro
   garantido por volta, repetível com contas novas, pago pelo cofre. E
   a cobertura, que a página da Transparência promete em 100%, caía a
   cada compra.

   No balde do bónus servem para tudo dentro do jogo — comprar avatares
   e ovos, listar, chocar, desbloquear slots — e gastam-se ANTES dos
   normais, portanto o jogador nem dá por eles a não ser quando vai
   sacar. Só não saem para MATIC, que é a única coisa que não podem
   fazer sem alguém pagar a conta. */
const BONUS_COMPRA     = 0.10;
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

  const { idToken, txHash } = req.body;

  // ── Validar inputs ──
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return res.status(400).json({ erro: 'Hash de transação inválido' });
  }
  if (!idToken || typeof idToken !== 'string') {
    return res.status(401).json({ erro: 'Sessão em falta. Entre de novo.' });
  }
  let jogador;
  try {
    jogador = (await getAuthAdmin().verifyIdToken(idToken)).uid;
  } catch {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Entre de novo.' });
  }

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

    // ── A carteira da conta ──
    // A vinculada, e só ela. É o `jogador` do evento que tem de bater com
    // esta, e é o que amarra o crédito a quem pagou.
    const playerRef = db.collection('players').doc(jogador);
    const carteiraAddr = String((await playerRef.get()).data()?.carteira || '').toLowerCase();
    if (!ethers.isAddress(carteiraAddr)) {
      return res.status(400).json({ erro: 'Vincule a MetaMask primeiro.' });
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
      return res.status(503).json({ erro: 'Blockchain inacessível. Tente novamente em instantes.', tentarDeNovo: true });
    }
    if (!recibo) {
      return res.status(400).json({ erro: 'Transação ainda não confirmada na blockchain', tentarDeNovo: true });
    }
    if (recibo.status !== 1) {
      return res.status(400).json({ erro: 'Transação falhou on-chain' });
    }

    /* ── A PROVA DA COMPRA É O EVENTO DO COFRE ──

       O servidor conferia o `to` e o `from` da transação: tinha de ir direto ao
       cofre, e sair da carteira do jogador. Com a MetaMask em conta
       inteligente (EIP-7702) ou com o gás patrocinado, a transação vai
       para o contrato de delegação DELA, e o POL chega ao cofre numa
       chamada interna; o `from` pode até ser o retransmissor que pagou o
       gás. Uma compra legítima era recusada — e o POL ficava no cofre sem
       os cristais.

       O que prova a compra é o CristaisComprados emitido pelo NOSSO
       contrato: só ele o emite, e o `jogador` do evento é quem mandou o
       POL ao cofre. O servidor confere quem emitiu o log (o cofre) e o jogador do
       evento (a carteira vinculada à conta do idToken). Se uma transação
       tiver mais de uma compra, elas são somadas; o anti-duplo continua pelo
       hash. */
    const iface = new ethers.Interface(CONTRACT_ABI);
    let gemsACreditar = 0;
    let maticEnviado  = 0n;

    for (const log of recibo.logs) {
      if (log.address?.toLowerCase() !== contractAddress.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name !== 'CristaisComprados') continue;
        if (parsed.args.jogador?.toLowerCase() !== carteiraAddr) continue;
        maticEnviado  += parsed.args.maticEnviado;
        gemsACreditar += Number(parsed.args.gems);
      } catch { /* log do cofre que não é este evento */ }
    }

    if (gemsACreditar <= 0) {
      return res.status(400).json({ erro: 'Evento CristaisComprados não encontrado nesta transação' });
    }
    if (gemsACreditar > MAX_GEMS_CREDITO) {
      console.error(`[processar-compra] gems suspeitos: ${gemsACreditar} para ${jogador}`);
      return res.status(400).json({ erro: 'Quantidade de 💎 fora dos limites esperados' });
    }

    // ── Creditar no Firestore, na conta do idToken ──

    await db.runTransaction(async (tx) => {
      const compraCheck = await tx.get(compraRef);
      if (compraCheck.exists) throw new Error('ALREADY_PROCESSED');

      const playerSnap = await tx.get(playerRef);

      const bonus = +(gemsACreditar * BONUS_COMPRA).toFixed(2);

      if (playerSnap.exists) {
        tx.update(playerRef, {
          'gs.cristais':      FieldValue.increment(gemsACreditar),
          cristais:           FieldValue.increment(gemsACreditar),
          'gs.cristaisBonus': FieldValue.increment(bonus),
          cristaisBonus:      FieldValue.increment(bonus),
          // Guarda a carteira vinculada se ainda não estiver registada
          carteira:           carteiraAddr,
        });
      } else {
        tx.set(playerRef, {
          gs:            { cristais: gemsACreditar, cristaisBonus: bonus },
          cristais:      gemsACreditar,
          cristaisBonus: bonus,
          carteira:      carteiraAddr,
          criadoEm:      new Date(),
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
    return res.status(500).json({ erro: 'Erro interno ao processar compra', tentarDeNovo: true });
  }
};
