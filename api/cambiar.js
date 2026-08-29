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

/* O QUE A POOL PODE GASTAR EM PLAY-TO-EARN
   ═══════════════════════════════════════════════════════════════════
   Havia aqui um CAMBIO_POOL_MIN = 100: trocava-se enquanto a pool
   tivesse mais de 100 💎. Número redondo e sem origem — não vinha de
   nenhuma conta, e deixava o câmbio comer tudo até esse piso.

   Passam a ser DUAS perguntas, e a resposta é a menor das duas.

   1. SOLVÊNCIA — quanto sobra depois de todos poderem sacar.
      Cada 💎 na mão de um jogador é um pedido de 0,1 MATIC que ele pode
      fazer a qualquer momento. O cofre tem de os cobrir a todos antes
      de o jogo dar um único cristal a quem não pagou por ele.

        excedente = (MATIC no cofre × 10) − 💎 nas mãos dos jogadores

      Vem da cobertura já calculada no api/pool.js, guardada no doc da
      pool e refrescada de 10 em 10 minutos. Se não a conseguirmos ler,
      o câmbio fecha: sem saber o lastro, não se emite.

      Nota honesta sobre este número: enquanto a cobertura estiver nos
      100% — e está, por construção, porque comprar, sacar, pagar taxas
      e cambiar mexem no cofre e nas mãos dos jogadores na mesma medida
      — este excedente dá exactamente o saldo da pool. Ou seja, sozinho
      não trava dreno nenhum. O que ele faz é fechar o câmbio no dia em
      que a cobertura partir por alguma razão que não previmos. É uma
      rede, não um travão.

   2. RESERVA — o que a pool guarda e não entrega ao Play-to-Earn.
      Este é o travão a sério. A queima de ovos paga base × pool/1000,
      portanto uma pool baixa não é só uma pool pobre: é uma pool onde
      queimar um Lendário rende 0,10 💎. O câmbio é diário e sem limite
      semanal, a queima é semanal e limitada a 1-5 — sem reserva, o
      câmbio pousa a pool no piso e a queima fica a valer nada.

      400 💎 são 40% do alvo de 1000. Nesse ponto a queima ainda paga
      0,20 no Raro e 0,40 no Lendário. É UM número para mexer se a
      preferência for outra. */
const RATE_GEMS_POR_MATIC = 10;   // igual ao RATE do api/resgatar.js
const RESERVA_P2E         = 400;  // 💎 que a pool guarda para a queima

function orcamentoP2E(poolData) {
  const saldo = poolData.cristais || 0;
  const cob   = poolData.cobertura;
  if (!cob || typeof cob.cofre !== 'number') return null;   // lastro desconhecido
  const lastro     = cob.cofre * RATE_GEMS_POR_MATIC;
  const solvencia  = lastro - (cob.emJogadores || 0);
  const acimaDaReserva = saldo - RESERVA_P2E;
  return Math.max(0, Math.min(acimaDaReserva, solvencia));
}
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
    const orcamento = orcamentoP2E(poolData);
    if (orcamento === null) {
      return res.status(400).json({ erro: 'Não deu para confirmar o lastro da pool agora. Tente mais tarde.' });
    }
    if (orcamento < 1) {
      return res.status(400).json({ erro: 'A pool não tem excedente para o Play-to-Earn de momento.' });
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
    /* O tecto diário do câmbio depende da raridade: 1 comum, 2 raro, 4
       lendário. Vinha de slot.raridade — do avatarSlots, que o cliente
       escreve por inteiro — portanto escrever 'Lendário' num slot
       quadruplicava o próprio tecto.
       Agora vem do avataresEmitidos, que o servidor escreve ao emitir o
       avatar. Sem registo vale Comum: um avatar sem proveniência troca ao
       ritmo mais baixo, que é o certo. */
    const _avEmitidos  = data.avataresEmitidos || {};
    const raridade     = _avEmitidos['s' + String(slot.seed)] || 'Comum';
    const limite       = CAMBIO_LIMITES[raridade] || 1;
    const hoje         = new Date().toISOString().slice(0, 10);
    const cambioLog    = data.cambioLog || null;
    const usadoHoje    = (cambioLog?.data === hoje) ? (cambioLog.count || 0) : 0;
    const restante     = limite - usadoHoje;

    if (restante <= 0) {
      return res.status(400).json({ erro: 'Limite diário de câmbio atingido. Volte amanhã.' });
    }

    // O orçamento entra aqui ao lado do limite pessoal: nenhum dos dois
    // pode ser ultrapassado, e o excedente é o do momento do pedido.
    const qtdFinal   = Math.min(qtd, restante, Math.floor(orcamento));
    if (qtdFinal < 1) {
      return res.status(400).json({ erro: 'A pool não tem excedente para o Play-to-Earn de momento.' });
    }
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
