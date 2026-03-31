// ═══════════════════════════════════════════════════════════════════
// BATALHA NAVAL — Reset semanal do ranking + distribuição da pool
// Vercel Cron Job: toda segunda-feira às 00:00 UTC
// vercel.json: { "crons": [{ "path": "/api/batalha-naval-reset-ranking", "schedule": "0 0 * * 1" }] }
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
// PCT_POOL_SEMANAL é agora dinâmico — calculado via calcPctJogo()
// Parâmetros em Firestore: config/economia

const SPLIT_LENDARIO = 0.60; // 60% do bolo → Lendário
const SPLIT_RARO     = 0.40; // 40% do bolo → Raro
// Comum não recebe cristais — recebe moedas internas

const MOEDAS_COMUM_TOTAL = 10000;

const DIST_POR_POSICAO = [
  0.30, // 1º — 30%
  0.20, // 2º — 20%
  0.15, // 3º — 15%
  0.10, // 4º — 10%
  0.08, // 5º —  8%
  0.06, // 6º —  6%
  0.04, // 7º —  4%
  0.03, // 8º —  3%
  0.02, // 9º —  2%
  0.02, // 10º —  2%
];

const MIN_PONTOS = 5; // mínimo de pontos para receber premiação

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
    // ── 1. Carrega pool e config de economia ──
    const [poolSnap, eco] = await Promise.all([
      db.collection('config').doc('pool').get(),
      carregarEconomia(db),
    ]);
    const poolData  = poolSnap.exists ? poolSnap.data() : { cristais: 0 };
    const poolTotal = poolData.cristais || 0;

    log.push(`=== Batalha Naval — Semana ${semana} ===`);
    log.push(`Pool total: ${poolTotal} 💎 · Jogos activos: ${eco.jogosAtivos}`);

    if(poolTotal < 20) {
      log.push('Pool insuficiente (mínimo 20 💎). Ranking resetado sem prêmios.');
      await _resetarRanking(log);
      return res.status(200).json({ ok: true, semana, log });
    }

    // ── 2. Calcula o bolo semanal (% dinâmico) ──
    const pctSemanal   = calcPctJogo(poolTotal, eco);
    const boloSemanal  = Math.floor(poolTotal * pctSemanal);
    const boloLendario = Math.floor(boloSemanal * SPLIT_LENDARIO);
    const boloRaro     = boloSemanal - boloLendario;

    log.push(`Bolo semanal (${(pctSemanal*100).toFixed(1)}% dinâmico): ${boloSemanal} 💎`);
    log.push(`  → Lendário: ${boloLendario} 💎`);
    log.push(`  → Raro: ${boloRaro} 💎`);
    log.push(`  → Comum: ${MOEDAS_COMUM_TOTAL} 🪙 (moedas internas)`);

    // ── 3. Processa cada fila ──
    let totalCristaisPagos = 0;

    const filas = [
      { nome: 'Lendário', bolo: boloLendario,      usaCristais: true  },
      { nome: 'Raro',     bolo: boloRaro,           usaCristais: true  },
      { nome: 'Comum',    bolo: MOEDAS_COMUM_TOTAL, usaCristais: false },
    ];

    for(const fila of filas) {
      log.push(`\n--- Fila ${fila.nome} (${fila.bolo} ${fila.usaCristais?'💎':'🪙'}) ---`);

      const rankSnap = await rtdb.ref(`batalhaNaval/ranking/${fila.nome}`)
        .orderByChild('pontos')
        .limitToLast(10)
        .once('value');

      const dados = rankSnap.val() || {};
      const lista = Object.entries(dados)
        .map(([k, d]) => ({ key: k, ...d }))
        .filter(d => (d.pontos || 0) >= MIN_PONTOS)
        .sort((a, b) => b.pontos - a.pontos)
        .slice(0, 10);

      if(lista.length === 0) {
        log.push('  Nenhum jogador qualificado.');
        continue;
      }

      log.push(`  ${lista.length} jogador(es) qualificado(s):`);

      for(let i = 0; i < lista.length; i++) {
        const jogador = lista[i];
        const pct     = DIST_POR_POSICAO[i] || 0;
        if(pct === 0) continue;

        const premio = Math.floor(fila.bolo * pct);
        if(premio <= 0) continue;

        const wallet = jogador.wallet || jogador.key;
        if(!wallet || !wallet.startsWith('0x')) {
          erros.push(`Wallet inválida na posição ${i+1}: ${wallet}`);
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
              motivo: `Batalha Naval ${fila.nome} — ${i+1}º lugar semana ${semana}`,
              origem:  wallet,
              total:   premio,
              pool:    -premio,
              ts:      admin.firestore.FieldValue.serverTimestamp(),
            });
            totalCristaisPagos += premio;
          }

          // Notificação no RTDB
          await rtdb.ref(`batalhaNaval/notificacoes/${wallet}/premiacoes`).push({
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
          erros.push(`Erro ao pagar ${wallet.slice(0,10)}: ${e.message}`);
        }
      }
    }

    // ── 4. Debita cristais da pool ──
    if(totalCristaisPagos > 0) {
      await db.collection('config').doc('pool').update({
        cristais:  admin.firestore.FieldValue.increment(-totalCristaisPagos),
        totalSaiu: admin.firestore.FieldValue.increment(totalCristaisPagos),
        ultimaDistribuicaoBatalhaNaval: {
          semana,
          boloSemanal,
          totalPago: totalCristaisPagos,
          ts: Date.now(),
        },
      });
      log.push(`\nTotal debitado da pool: ${totalCristaisPagos} 💎`);
      log.push(`Pool restante estimada: ${poolTotal - totalCristaisPagos} 💎`);
    }

    // ── 5. Reseta ranking ──
    await _resetarRanking(log);

    return res.status(200).json({ ok: true, semana, boloSemanal, totalCristaisPagos, log, erros });

  } catch(e) {
    console.error('batalha-naval-reset-ranking erro:', e);
    return res.status(500).json({ error: e.message, log, erros });
  }
};

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

async function _resetarRanking(log) {
  for(const fila of ['Comum', 'Raro', 'Lendário']) {
    await rtdb.ref(`batalhaNaval/ranking/${fila}`).remove();
    log.push(`Ranking Batalha Naval ${fila} resetado.`);
  }
}

function _semanaAtual() {
  const now = new Date();
  const ano = now.getFullYear();
  const ini = new Date(ano, 0, 1);
  const sem = Math.ceil(((now - ini) / 86400000 + ini.getDay() + 1) / 7);
  return `${ano}-W${String(sem).padStart(2,'0')}`;
}
