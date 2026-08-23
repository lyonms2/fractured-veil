// ═══════════════════════════════════════════════════════════════════
// PVP RESET RANKING — Reset semanal dos 3 jogos PvP + distribuição da pool
// Vercel Cron Job: toda segunda-feira às 00:00 UTC
// vercel.json: { "path": "/api/pvp-reset-ranking", "schedule": "0 0 * * 1" }
// ═══════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

if(!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db   = admin.firestore();
const rtdb = admin.database();

const { carregarEconomia, calcPctJogo } = require('./_pool-economia');

// ════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ════════════════════════════════════════════════════════════════

const SPLIT_LENDARIO     = 0.60;
const SPLIT_RARO         = 0.40;
const MOEDAS_COMUM_TOTAL = 10000;
const MIN_PONTOS         = 5;

const DIST_POR_POSICAO = [
  0.30, 0.20, 0.15, 0.10, 0.08,
  0.06, 0.04, 0.03, 0.02, 0.02,
];

// Jogos PvP: rtdbBase é o caminho no RTDB, label é usado nos logs/pool
const JOGOS = [
  { id: 'arena',        rtdbBase: 'arena',        label: 'Arena',        poolKey: 'ultimaDistribuicaoArena'        },
  { id: 'roubaMonte',   rtdbBase: 'roubaMonte',   label: 'Rouba Monte',  poolKey: 'ultimaDistribuicaoRoubaMonte'   },
  { id: 'batalhaNaval', rtdbBase: 'batalhaNaval', label: 'Batalha Naval', poolKey: 'ultimaDistribuicaoBatalhaNaval' },
];

// ════════════════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  const auth = req.headers['authorization'];
  if(auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const log    = [];
  const erros  = [];
  const semana = _semanaAtual();

  try {
    const [poolSnap, eco] = await Promise.all([
      db.collection('config').doc('pool').get(),
      carregarEconomia(db),
    ]);
    const poolData  = poolSnap.exists ? poolSnap.data() : { cristais: 0 };
    const poolTotal = poolData.cristais || 0;

    log.push(`=== Reset semanal PvP — Semana ${semana} ===`);
    log.push(`Pool total: ${poolTotal} 💎 · Jogos activos: ${eco.jogosAtivos}`);

    let totalCristaisPagosGlobal = 0;

    for(const jogo of JOGOS) {
      log.push(`\n══ ${jogo.label} ══`);

      if(poolTotal < 20) {
        log.push('Pool insuficiente. Ranking resetado sem prêmios.');
        await _resetarRanking(jogo, log);
        continue;
      }

      const pctSemanal   = calcPctJogo(poolTotal, eco);
      const boloSemanal  = Math.floor(poolTotal * pctSemanal);
      const boloLendario = Math.floor(boloSemanal * SPLIT_LENDARIO);
      const boloRaro     = boloSemanal - boloLendario;

      log.push(`Bolo (${(pctSemanal*100).toFixed(1)}%): ${boloSemanal} 💎 → Lendário: ${boloLendario} | Raro: ${boloRaro} | Comum: ${MOEDAS_COMUM_TOTAL} 🪙`);

      const filas = [
        { nome: 'Lendário', bolo: boloLendario,       usaCristais: true  },
        { nome: 'Raro',     bolo: boloRaro,            usaCristais: true  },
        { nome: 'Comum',    bolo: MOEDAS_COMUM_TOTAL,  usaCristais: false },
      ];

      let totalCristaisPagos = 0;

      for(const fila of filas) {
        log.push(`\n--- Fila ${fila.nome} (${fila.bolo} ${fila.usaCristais?'💎':'🪙'}) ---`);

        const rankSnap = await rtdb.ref(`${jogo.rtdbBase}/ranking/${fila.nome}`)
          .orderByChild('pontos')
          .limitToLast(10)
          .once('value');

        const dados = rankSnap.val() || {};
        const lista = Object.entries(dados)
          .map(([k, d]) => ({ key: k, ...d }))
          .filter(d => (d.pontos || 0) >= MIN_PONTOS)
          .sort((a, b) => b.pontos - a.pontos)
          .slice(0, 10);

        if(lista.length === 0) { log.push('  Nenhum jogador qualificado.'); continue; }

        log.push(`  ${lista.length} jogador(es) qualificado(s):`);

        for(let i = 0; i < lista.length; i++) {
          const jogador = lista[i];
          const pct     = DIST_POR_POSICAO[i] || 0;
          if(pct === 0) continue;

          const premio = Math.floor(fila.bolo * pct);
          if(premio <= 0) continue;

          const wallet = jogador.wallet || jogador.key;
          if(!wallet || !wallet.startsWith('0x')) {
            erros.push(`[${jogo.label}] Wallet inválida posição ${i+1}: ${wallet}`);
            continue;
          }

          try {
            const campo = fila.usaCristais
              ? { 'gs.cristais': admin.firestore.FieldValue.increment(premio), cristais: admin.firestore.FieldValue.increment(premio) }
              : { 'gs.moedas':   admin.firestore.FieldValue.increment(premio) };

            await db.collection('players').doc(wallet).set(campo, { merge: true });

            if(fila.usaCristais) {
              await db.collection('config').doc('pool').collection('logs').add({
                tipo:   'saida',
                motivo: `${jogo.label} ${fila.nome} — ${i+1}º lugar semana ${semana}`,
                origem:  wallet,
                total:   premio,
                pool:    -premio,
                ts:      admin.firestore.FieldValue.serverTimestamp(),
              });
              totalCristaisPagos += premio;
            }

            await rtdb.ref(`${jogo.rtdbBase}/notificacoes/${wallet}/premiacoes`).push({
              semana,
              fila:    fila.nome,
              posicao: i + 1,
              premio,
              moeda:   fila.usaCristais ? '💎' : '🪙',
              pontos:  jogador.pontos || 0,
              lida:    false,
              ts:      Date.now(),
            });

            log.push(`  ${i+1}º ${wallet.slice(0,10)}... (${jogador.pontos||0} pts) → +${premio} ${fila.usaCristais?'💎':'🪙'} (${(pct*100).toFixed(0)}%)`);

          } catch(e) {
            erros.push(`[${jogo.label}] Erro ao pagar ${wallet.slice(0,10)}: ${e.message}`);
          }
        }
      }

      if(totalCristaisPagos > 0) {
        await db.collection('config').doc('pool').update({
          cristais:  admin.firestore.FieldValue.increment(-totalCristaisPagos),
          totalSaiu: admin.firestore.FieldValue.increment(totalCristaisPagos),
          [jogo.poolKey]: { semana, boloSemanal, totalPago: totalCristaisPagos, ts: Date.now() },
        });
        log.push(`Total debitado (${jogo.label}): ${totalCristaisPagos} 💎`);
        totalCristaisPagosGlobal += totalCristaisPagos;
      }

      await _resetarRanking(jogo, log);
    }

    log.push(`\n═══ Total global debitado: ${totalCristaisPagosGlobal} 💎 ═══`);
    return res.status(200).json({ ok: true, semana, totalCristaisPagosGlobal, log, erros });

  } catch(e) {
    console.error('pvp-reset-ranking erro:', e);
    return res.status(500).json({ error: e.message, log, erros });
  }
};

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

async function _resetarRanking(jogo, log) {
  for(const fila of ['Comum', 'Raro', 'Lendário']) {
    await rtdb.ref(`${jogo.rtdbBase}/ranking/${fila}`).remove();
    log.push(`Ranking ${jogo.label} ${fila} resetado.`);
  }
}

function _semanaAtual() {
  const now = new Date();
  const ano = now.getFullYear();
  const ini = new Date(ano, 0, 1);
  const sem = Math.ceil(((now - ini) / 86400000 + ini.getDay() + 1) / 7);
  return `${ano}-W${String(sem).padStart(2,'0')}`;
}
