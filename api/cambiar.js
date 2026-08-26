// ═══════════════════════════════════════════════════════════════
//  api/cambiar.js — Vercel Serverless Function
//  Câmbio Moedas 🪙 → Cristais 💎 (server-side, validado)
//
//  Body esperado:
//    { quantidade: 1, idToken: "..." }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const { POOL_LIMITE_DIA, saqueDeHoje,
        marcarSaque }                  = require('./_pool-economia.js');

const CAMBIO_POOL_MIN  = 100;
const CAMBIO_NIVEL_MIN = 20;
const CAMBIO_TAXAS     = [
  { minPool: 1000, custo: 1000 },
  { minPool: 500,  custo: 1500 },
  { minPool: 100,  custo: 2000 },
];
const CAMBIO_LIMITES = { Comum: 1, Raro: 2, 'Lendário': 4 };

function calcTaxa(poolSaldo) {
  for (const t of CAMBIO_TAXAS) {
    if (poolSaldo >= t.minPool) return t.custo;
  }
  return null;
}

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

  const { quantidade, idToken } = req.body;
  const qtd = parseInt(quantidade, 10);

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken ausente' });
  }
  if (!qtd || qtd < 1 || qtd > 4) {
    return res.status(400).json({ erro: 'Quantidade inválida (1 a 4)' });
  }

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const playerRef = db.collection('players').doc(uid);
  const poolRef   = db.collection('config').doc('pool');

  try {
    const [playerSnap, poolSnap] = await Promise.all([
      playerRef.get(),
      poolRef.get(),
    ]);

    if (!playerSnap.exists) {
      return res.status(404).json({ erro: 'Jogador não encontrado' });
    }

    const data      = playerSnap.data();
    const poolData  = poolSnap.exists ? poolSnap.data() : {};
    const poolSaldo = poolData.cristais || 0;

    // ── Validar pool ──
    if (poolSaldo < CAMBIO_POOL_MIN) {
      return res.status(400).json({ erro: 'Pool insuficiente. Tente mais tarde.' });
    }

    // ── Teto diário global ──
    // O limite de 1/2/4 é por conta e não trava nada quando são muitas
    // cambiando no mesmo dia: com a pool em 1000, 225 contas Lendárias
    // esvaziavam ela até o piso num só dia. Agora o câmbio divide o
    // mesmo teto que vender e queimar ovos já dividiam.
    if (saqueDeHoje(poolData) >= POOL_LIMITE_DIA) {
      return res.status(400).json({ erro: 'Limite diário global da pool atingido. Tente amanhã.' });
    }
    const custo = calcTaxa(poolSaldo);
    if (!custo) {
      return res.status(400).json({ erro: 'Pool insuficiente. Tente mais tarde.' });
    }

    // ── Validar avatar ──
    const activeSlotIdx = data.gs?.activeSlot ?? data.activeSlot ?? 0;
    const slot = (data.avatarSlots || [])[activeSlotIdx];
    if (!slot || !slot.hatched || slot.dead) {
      return res.status(400).json({ erro: 'Sem avatar ativo.' });
    }
    if ((slot.nivel || 1) < CAMBIO_NIVEL_MIN) {
      return res.status(400).json({ erro: `Avatar precisa de nível ${CAMBIO_NIVEL_MIN}+.` });
    }

    // ── Validar limite diário ──
    const raridade     = slot.raridade || 'Comum';
    const limite       = CAMBIO_LIMITES[raridade] || 1;
    const hoje         = new Date().toISOString().slice(0, 10);
    const cambioLog    = data.cambioLog || null;
    const usadoHoje    = (cambioLog?.data === hoje) ? (cambioLog.count || 0) : 0;
    const restante     = limite - usadoHoje;

    if (restante <= 0) {
      return res.status(400).json({ erro: 'Limite diário de câmbio atingido. Volte amanhã.' });
    }

    const qtdFinal   = Math.min(qtd, restante);
    const custoTotal = custo * qtdFinal;

    // ── Rate limit: mínimo 5 s entre câmbios ──
    const ultimoCambio = data.ultimoCambio || 0;
    if (Date.now() - ultimoCambio < 5000) {
      return res.status(429).json({ erro: 'Aguarde alguns segundos antes de tentar novamente.' });
    }

    // ── Validar saldo de moedas ──
    const moedas = data.gs?.moedas ?? data.moedas ?? 0;
    if (moedas < custoTotal) {
      return res.status(400).json({ erro: `Saldo insuficiente: precisas de ${custoTotal} 🪙.` });
    }

    // ── Transação atómica ──
    const novoCount   = (cambioLog?.data === hoje ? (cambioLog.count || 0) : 0) + qtdFinal;
    const novasMoedas = moedas - custoTotal;
    const cristaisAtual = data.gs?.cristais ?? data.cristais ?? 0;
    const novosCristais = cristaisAtual + qtdFinal;

    await db.runTransaction(async (tx) => {
      tx.update(playerRef, {
        'gs.moedas':   novasMoedas,
        'gs.cristais': novosCristais,
        cambioLog:    { data: hoje, count: novoCount },
        ultimoCambio: Date.now(),
      });

      tx.update(poolRef, Object.assign({
        cristais:  FieldValue.increment(-qtdFinal),
        totalSaiu: FieldValue.increment(qtdFinal),
      }, marcarSaque(poolData, qtdFinal, FieldValue)));

      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo:   'saida',
        motivo: `Câmbio — ${custoTotal} 🪙 → ${qtdFinal} 💎`,
        origem: uid,
        total:  qtdFinal,
        pool:   -qtdFinal,
        ts:     FieldValue.serverTimestamp(),
      });
    });

    return res.status(200).json({
      ok:          true,
      cristais:    qtdFinal,
      moedasGastas: custoTotal,
      novoSaldoMoedas:   novasMoedas,
      novoSaldoCristais: novosCristais,
      restante:    restante - qtdFinal,
    });

  } catch (err) {
    console.error('[cambiar]', err);
    return res.status(500).json({ erro: 'Erro interno ao processar câmbio.' });
  }
};
