// ═══════════════════════════════════════════════════════════════════
// _pool-economia.js — Lógica partilhada de distribuição da pool
//
// Lido por: arena-reset-ranking, rouba-monte-reset-ranking,
//           batalha-naval-reset-ranking, pool-dev-payout
//
// Configuração dinâmica em Firestore: config/economia
//   jogosAtivos  : número de jogos PvP activos (default 3)
//   pctMinJogo   : % mínima por jogo quando pool está baixa (default 0.05)
//   pctMaxJogo   : % máxima absoluta por jogo (default 0.20)
//   pctMaxTotal  : % máxima total para todos os jogos somados (default 0.45)
//   poolAlvo     : saldo de referência para pool "cheia" (default 1000)
// ═══════════════════════════════════════════════════════════════════

const DEFAULTS = {
  jogosAtivos: 3,
  pctMinJogo:  0.05,
  pctMaxJogo:  0.20,
  pctMaxTotal: 0.45,
  poolAlvo:    1000,
};

/**
 * Carrega a config de economia do Firestore.
 * Se o doc não existir, usa os defaults e cria-o.
 */
async function carregarEconomia(db) {
  const ref  = db.collection('config').doc('economia');
  const snap = await ref.get();
  if(snap.exists) {
    return { ...DEFAULTS, ...snap.data() };
  }
  await ref.set(DEFAULTS);
  return { ...DEFAULTS };
}

/**
 * Calcula o % dinâmico a distribuir por jogo nesta semana.
 *
 * Fórmula:
 *   ratio        = clamp(poolTotal / poolAlvo, 0, 1)
 *   maxPorJogo   = min(pctMaxJogo, pctMaxTotal / jogosAtivos)
 *   pct          = pctMinJogo + (maxPorJogo - pctMinJogo) * ratio
 *
 * Exemplos com defaults (poolAlvo=1000, 3 jogos):
 *   pool =    0 →  5%  (mínimo garantido)
 *   pool =  500 → 10%
 *   pool = 1000 → 15%  (alvo)
 *   pool = 2000 → 15%  (cap — ratio clamped a 1)
 *
 * Com 5 jogos e pool = 1000:
 *   maxPorJogo = min(0.20, 0.45/5) = 0.09
 *   pct = 0.05 + (0.09 - 0.05) * 1 = 9%
 */
function calcPctJogo(poolTotal, eco) {
  const { jogosAtivos, pctMinJogo, pctMaxJogo, pctMaxTotal, poolAlvo } = eco;
  const ratio      = Math.min(1, poolTotal / poolAlvo);
  const maxPorJogo = Math.min(pctMaxJogo, pctMaxTotal / jogosAtivos);
  return pctMinJogo + (maxPorJogo - pctMinJogo) * ratio;
}

module.exports = { carregarEconomia, calcPctJogo };
