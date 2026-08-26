// ═══════════════════════════════════════════════════════════════════
// _pool-economia.js — As regras da pool que mais de um arquivo precisa
//
// Lido por: pool-dev-payout (a distribuição semanal), e por pool.js e
//           cambiar.js (o teto diário de saída).
//
// Citava três arquivos de reset por jogo que nunca existiram — tinham
// sido unificados num pvp-reset-ranking.js, e esse saiu com os três
// jogos PvP. Hoje só a manutenção tira da pool toda a semana.
//
// O jogosAtivos deixou de dividir o bolo por vários jogos e passa a
// servir só de divisor da fatia do dev: com 3, ele leva 15% da pool
// cheia; se um dia voltar a haver jogos a receber, é este número que
// os põe todos dentro do teto do pctMaxTotal.
//
// Configuração dinâmica em Firestore: config/economia
//   jogosAtivos  : número de jogos PvP ativos (default 3)
//   pctMinJogo   : % mínima por jogo quando pool está baixa (default 0.05)
//   pctMaxJogo   : % máxima absoluta por jogo (default 0.20)
//   pctMaxTotal  : % máxima total para todos os jogos somados (default 0.45)
//   poolAlvo     : saldo de referência para pool "cheia" (default 1000)
// ═══════════════════════════════════════════════════════════════════

// O teto diário de SAÍDA da pool, seja por que porta for.
//
// Vivia só no api/pool.js, e por isso o câmbio — que roda em outro
// arquivo — não o respeitava: era a única saída sem teto global. O
// limite dele é por CONTA (1/2/4 conforme a raridade), o que não trava
// nada quando são muitas contas cambiando no mesmo dia.
const POOL_LIMITE_DIA = 100;

// Quanto já saiu hoje, com o reset das 24h aplicado. As três saídas
// (vender ovo, queimar ovo, câmbio) fazem a mesma pergunta, e agora
// fazem ela da mesma maneira.
function saqueDeHoje(poolData) {
  const agora = Date.now();
  const expirou = (agora - (poolData?.ultimoReset || 0)) > 86400000;
  return expirou ? 0 : (poolData?.saqueHoje || 0);
}

// O que gravar no saqueHoje ao tirar `qtd` da pool. Se a janela das 24h
// já passou, o contador recomeça nesta saída em vez de somar a um valor
// velho — sem isto, um ultimoReset antigo fazia o teto sumir de vez.
//
// O FieldValue vem de fora para este módulo não ter que puxar o
// firebase-admin só por causa de um increment.
function marcarSaque(poolData, qtd, FieldValue) {
  const expirou = (Date.now() - (poolData?.ultimoReset || 0)) > 86400000;
  return expirou
    ? { saqueHoje: qtd, ultimoReset: Date.now() }
    : { saqueHoje: FieldValue.increment(qtd) };
}

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

module.exports = {
  carregarEconomia, calcPctJogo,
  POOL_LIMITE_DIA, saqueDeHoje, marcarSaque,
};
