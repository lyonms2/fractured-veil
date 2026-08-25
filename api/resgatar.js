// ═══════════════════════════════════════════════════════════════
//  api/resgatar.js — Vercel Serverless Function
//
//  Ações disponíveis (campo "action" no body):
//    (sem action)        → saque de cristais: { idToken, carteira, gems }
//    "salvar-referral"   → registar convite:  { idToken, action, refUid }
//
//  Consolidado num único endpoint para respeitar o limite de 12
//  Serverless Functions do plano Hobby do Vercel.
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

// ── O contrato já consumiu este nonce? ──────────────────────────
//
// O contrato expõe nonceUsado(address,uint256) → bool. É o que permite
// saber se um saque autorizado chegou mesmo a acontecer, e por isso
// distinguir "o jogador não completou" de "completou e não nos avisou".
const POLYGON_RPCS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://polygon.meowrpc.com',
  'https://polygon.llamarpc.com',
];
const ABI_NONCE = ['function nonceUsado(address,uint256) view returns (bool)'];

async function _nonceJaUsado(carteira, nonce) {
  const endereco = ethers.getAddress(carteira);
  let ultimoErro = null;
  for (const rpc of POLYGON_RPCS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const contrato = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI_NONCE, provider);
      return await contrato.nonceUsado(endereco, BigInt(nonce));
    } catch (err) { ultimoErro = err; }
  }
  throw ultimoErro || new Error('sem RPC disponível');
}

// ── Registar cadeia de referral (até 3 níveis) ───────────────────
async function handleSalvarReferral(req, res, db, auth) {
  const { idToken, refUid } = req.body;

  if (!refUid || typeof refUid !== 'string' || refUid.length < 5) {
    return res.status(400).json({ erro: 'refUid inválido' });
  }

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  if (uid === refUid) {
    return res.status(400).json({ erro: 'Não é possível usar seu próprio link de convite' });
  }

  const playerRef = db.collection('players').doc(uid);
  const refRef    = db.collection('players').doc(refUid);
  const [playerSnap, refSnap] = await Promise.all([playerRef.get(), refRef.get()]);

  if (!refSnap.exists) {
    return res.status(400).json({ erro: 'Jogador convidador não encontrado' });
  }
  if (playerSnap.exists && playerSnap.data()?.referralChain) {
    return res.status(200).json({ ok: true, skip: true });
  }

  // Construir cadeia: L1 = quem convidou, L2 = avô, L3 = bisavô
  const refChain = refSnap.data()?.referralChain || {};
  const chain    = { l1: refUid };
  if (refChain.l1) chain.l2 = refChain.l1;
  if (refChain.l2) chain.l3 = refChain.l2;

  if (Object.values(chain).includes(uid)) {
    return res.status(400).json({ erro: 'Referral circular detectado' });
  }

  await playerRef.set({ referralChain: chain }, { merge: true });
  await refRef.set({ referralCount: FieldValue.increment(1) }, { merge: true });

  return res.status(200).json({ ok: true, chain });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { idToken, action } = req.body;

  // ── Verificar identidade via Firebase ID token ──
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }

  const { db, auth } = initAdmin();

  // ── Roteamento por action ──
  // Marca um saque como concluído depois de a transacção on-chain
  // passar. Sem isto o registo ficava 'autorizado' para sempre e o
  // jogador seria sempre atendido com a autorização velha.
  if (action === 'confirmar-resgate') {
    const { nonce } = req.body;
    if (!nonce) return res.status(400).json({ erro: 'nonce em falta' });
    try {
      const decoded = await auth.verifyIdToken(idToken);
      const snap = await db.collection('players').doc(decoded.uid)
        .collection('resgates').where('nonce', '==', Number(nonce)).limit(1).get();
      if (snap.empty) return res.status(404).json({ erro: 'Resgate não encontrado' });
      await snap.docs[0].ref.update({ status: 'concluido', concluidoEm: new Date() });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[confirmar-resgate]', err.message);
      return res.status(400).json({ erro: 'Não foi possível confirmar o resgate.' });
    }
  }

  if (action === 'salvar-referral') {
    try {
      return await handleSalvarReferral(req, res, db, auth);
    } catch (err) {
      console.error('[salvar-referral]', err.message);
      return res.status(500).json({ erro: 'Erro interno' });
    }
  }

  // ── A partir daqui: saque de cristais ──
  const { carteira, gems } = req.body;

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
  const contractAddress  = process.env.CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === 'PENDENTE_DEPLOY') {
    return res.status(500).json({ erro: 'Contrato ainda não deployado' });
  }

  try {
    // Doc ID = uid do Firebase (não o endereço Ethereum)
    const userRef = db.collection('players').doc(jogador);

    // Mapa de bônus calculado dentro da transação e usado depois
    let referralBonuses = null;

    // ── UMA AUTORIZAÇÃO PENDENTE É RETOMADA, NÃO SUBSTITUÍDA ──
    //
    // Os cristais são debitados aqui, ao assinar — e a chamada on-chain
    // acontece depois, no browser do jogador. Se ela falhar (cofre sem
    // MATIC, MetaMask recusada, aba fechada), os cristais já saíram e
    // nada os devolvia: o registo ficava em 'autorizado' para sempre e o
    // jogador perdia o saldo sem receber nada.
    //
    // Devolver a mesma autorização resolve isso sem abrir a porta a um
    // duplo saque: o valor passa a viver na ASSINATURA, que o contrato só
    // aceita uma vez (o nonce). O jogador pode tentar as vezes que
    // precisar; a segunda tentativa não volta a debitar.
    const pendentes = await userRef.collection('resgates')
      .where('status', '==', 'autorizado')
      .orderBy('ts', 'desc').limit(1).get();

    if (!pendentes.empty) {
      const pendRef = pendentes.docs[0].ref;
      const pend    = pendentes.docs[0].data();

      // Antes de a devolver, perguntar à blockchain se ela já foi usada.
      // Sem isto ficava um beco: quem completasse o saque on-chain mas
      // perdesse a confirmação (aba fechada, rede em baixo) era atendido
      // para sempre com a mesma autorização, que o contrato recusa por
      // nonce repetido — via um erro sem saída.
      let jaUsada = false;
      try {
        jaUsada = await _nonceJaUsado(pend.carteira, pend.nonce);
      } catch (err) {
        // Blockchain fora de alcance: é mais seguro devolver a pendente do
        // que assinar outra. No pior caso o jogador tenta e o contrato
        // recusa; se assinássemos, debitávamos duas vezes.
        console.warn('[resgatar] nonceUsado indisponível:', err.message);
      }

      if (jaUsada) {
        await pendRef.update({ status: 'concluido', concluidoEm: new Date(), fechadoPor: 'on-chain' });
        // e segue em frente para criar uma autorização nova
      } else {
        return res.status(200).json({
          ok:            true,
          retomado:      true,
          gems:          pend.gemsNet,
          matic:         pend.matic,
          referralBonus: pend.referralBonus || 0,
          nonce:         pend.nonce,
          v:             pend.v,
          r:             pend.r,
          s:             pend.s,
        });
      }
    }

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
      // Conta gemsNum no limite (não gemsToSign) — o jogador quis sacar essa quantia.
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

      // ── Calcular bônus de referral ──
      // Os bônus saem do valor sacado — não são criados do nada.
      // O jogador recebe (gemsNum - totalBonus) em MATIC; os convidadores
      // ficam com os cristais correspondentes para sacar quando quiserem.
      // Pool sempre equilibrada: MATIC saindo = MATIC coberto por cristais existentes.
      const REFERRAL_RATES = { l1: 0.05, l2: 0.02, l3: 0.01 };
      const refChain = data.referralChain || {};
      const bonusMap = {};  // { uid → gemsBonus }
      let totalBonus = 0;
      for (const [level, rate] of Object.entries(REFERRAL_RATES)) {
        const refUid = refChain[level];
        if (!refUid) continue;
        const bonus = Math.floor(gemsNum * rate);
        if (bonus < 1) continue;
        bonusMap[refUid] = (bonusMap[refUid] || 0) + bonus;
        totalBonus += bonus;
      }
      referralBonuses = Object.keys(bonusMap).length > 0 ? bonusMap : null;

      // Quantidade efetiva que vai para o contrato (o que o jogador recebe em MATIC)
      const gemsToSign  = gemsNum - totalBonus;
      const maticFinal  = gemsToSign / RATE;

      // Gerar nonce único
      const nonce = Date.now();

      // Assinar autorização para gemsToSign — contrato libera maticFinal ao jogador
      const wallet  = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY);
      const msgHash = ethers.solidityPackedKeccak256(
        ['address', 'uint256', 'uint256', 'address'],
        [carteiraChecksum, gemsToSign, nonce, contractAddress]
      );
      const sig         = await wallet.signMessage(ethers.getBytes(msgHash));
      const { v, r, s } = ethers.Signature.from(sig);

      // Debitar gemsNum do jogador (o total — inclui a parte dos convidadores)
      const novoResgateHoje = resgateHoje + gemsNum;
      tx.update(userRef, {
        'gs.cristais': FieldValue.increment(-gemsNum),
        cristais:      FieldValue.increment(-gemsNum),
        resgateLog:    { data: hoje, total: novoResgateHoje },
        ultimoResgate: Date.now(),
      });

      // Histórico do resgate
      const logRef = userRef.collection('resgates').doc();
      // A assinatura fica guardada com o registo: é ela que permite
      // retomar o saque se a chamada on-chain não chegar a acontecer.
      tx.set(logRef, {
        gemsTotal:    gemsNum,
        gemsNet:      gemsToSign,
        referralBonus: totalBonus,
        matic:         maticFinal,
        carteira:      carteira.toLowerCase(),
        nonce,
        v, r, s,
        ts:            new Date(),
        status:        'autorizado',
      });

      return { v, r, s, nonce, gemsToSign, maticFinal, totalBonus };
    });

    // ── Creditar bônus de referral (best-effort, não bloqueia o saque) ──
    // Os cristais creditados aqui são exatamente os que foram deduzidos
    // do jogador — nenhuma inflação, pool sempre coberta.
    if (referralBonuses) {
      const batch = db.batch();
      for (const [refUid, bonus] of Object.entries(referralBonuses)) {
        batch.update(db.collection('players').doc(refUid), {
          'gs.cristais':  FieldValue.increment(bonus),
          cristais:       FieldValue.increment(bonus),
          referralEarned: FieldValue.increment(bonus),
        });
      }
      batch.commit().catch(err => console.error('[referral-bonus]', err.message));
    }

    return res.status(200).json({
      ok:           true,
      gems:         resultado.gemsToSign,   // o que o contrato vai liberar
      matic:        resultado.maticFinal,
      referralBonus: resultado.totalBonus,  // info para o cliente mostrar
      nonce:        resultado.nonce,
      v:            resultado.v,
      r:            resultado.r,
      s:            resultado.s,
    });

  } catch (err) {
    console.error('[resgatar] erro:', err.message);
    return res.status(400).json({ erro: err.message });
  }
};
