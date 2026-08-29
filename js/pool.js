// ═══════════════════════════════════════════════════════════════════
// POOL P2E — Constantes, estado e todas as funções da pool
// Depende de: db (global), firebase (global), walletAddress (global),
//             showToast() (marketplace.html inline)
// ═══════════════════════════════════════════════════════════════════

const POOL_ALVO        = 1000; // 💎 referência para preço dinâmico
// Estes quatro números são SÓ para mostrar — o calcPoolPrice abaixo não
// paga nada a ninguém, alimenta o cartão da pool e as linhas da
// Transparência. Quem paga é o handleQueimarOvo, em api/pool.js.
//
// E estavam noutra escala. O servidor usa base 0.5 no Raro e 1.0 no
// Lendário, com mínimos de 0.10 e 0.25; aqui estava 2.5 e 7.0, com
// mínimos de 0.5 e 1.5. Ou seja, a página prometia 5× no Raro e 7× no
// Lendário do que o jogador ia mesmo receber: anunciava "0,50 💎 atual"
// onde a queima pagava 0,10.
//
// Passam a ser os do servidor. Se um dia mudarem lá, mudam aqui — são
// duas cópias do mesmo preço e não há como as ligar sem um pedido.
const POOL_BASE_RARO   = 0.5;  // 💎 preço base por ovo Raro (pool no alvo)
const POOL_BASE_LEND   = 1.0;  // 💎 preço base por ovo Lendário (pool no alvo)
const POOL_LIMITE_DIA  = 100;  // 💎 máximo de saque por dia
const TAXA_MARKETPLACE = 0.10; // 10% de taxa sobre vendas de avatar
const TAXA_OVO         = 0.10; // 10% de taxa sobre compra de ovo raro na loja
const DEV_WALLET       = '0x8615C48d38505f02eb212Aa2ED2BA8Df86E4A49C'; // carteira dev
// Taxas do marketplace vão 100% para a Pool P2E (lucro dev vem dos 20% MATIC do Treasury)

let poolData = null; // carregado do Firestore

// ── Logs da pool ──
let poolLogs     = [];
let poolLogsLast = null;

// ═══════════════════════════════════════════
// PREÇO DINÂMICO
// ═══════════════════════════════════════════
function calcPoolPrice(raridade) {
  const base = raridade === 'Lendário' ? POOL_BASE_LEND : POOL_BASE_RARO;
  if(!poolData) return base;
  const ratio = Math.min(2, (poolData.cristais || 0) / POOL_ALVO);
  // Sem piso, como no servidor: pool vazia não paga nada.
  return parseFloat((base * ratio).toFixed(2));
}

function poolDisponivel() {
  if(!poolData) return false;
  // Lia o saqueHoje cru, sem a janela das 24h que o servidor aplica
  // (marcarSaque, no api/_pool-economia.js): um contador de ontem
  // dizia "pool indisponível" para uma pool que o servidor deixaria
  // sacar. É a mesma pergunta, tem de ter a mesma resposta.
  const expirou = (Date.now() - (poolData.ultimoReset || 0)) > 86400000;
  const hoje    = expirou ? 0 : (poolData.saqueHoje || 0);
  return poolData.cristais > 0 && hoje < POOL_LIMITE_DIA;
}

// ═══════════════════════════════════════════
// CARREGAR POOL DO FIRESTORE
// ═══════════════════════════════════════════
async function loadPool(comCobertura) {
  try {
    const resp = await fetch('/api/pool' + (comCobertura ? '?cobertura=1' : ''));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();
    if (!json.ok) throw new Error(json.erro || 'erro');
    poolData = {
      cristais:    json.cristais,
      saqueHoje:   json.saqueHoje,
      totalEntrou: json.totalEntrou,
      totalSaiu:   json.totalSaiu,
      ultimoReset: json.ultimoReset,
      // Só vem quando pedida — a conta percorre todos os jogadores.
      cobertura:   json.cobertura || poolData?.cobertura || null,
    };
    renderPoolWidget();
  } catch(e) { console.warn('loadPool error:', e); }
}

// ═══════════════════════════════════════════
// WIDGET RESUMIDO (sidebar / browse)
// ═══════════════════════════════════════════
function renderPoolWidget() {
  // Widget removido do browse — pool tem aba dedicada
  renderPoolStatsCard();
  const el = document.getElementById('poolWidget');
  if(!el || !poolData) return;
  const precoRaro  = calcPoolPrice('Raro');
  const precoLend  = calcPoolPrice('Lendário');
  const saldo      = poolData.cristais || 0;
  const saqueHoje  = poolData.saqueHoje || 0;
  const restante   = Math.max(0, POOL_LIMITE_DIA - saqueHoje);
  const pct        = Math.min(100, Math.round(saldo / POOL_ALVO * 100));
  const barColor   = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--red)';
  el.innerHTML = `
    <div class="pool-widget">
      <div class="pool-title">💎 Pool de Recompensas</div>
      <div class="pool-bar-wrap">
        <div class="pool-bar" style="width:${pct}%;background:${barColor};"></div>
      </div>
      <div class="pool-stats">
        <div class="pool-stat"><span>${t('mkt.pool.balance')}</span><b>${fmtC(saldo)} 💎</b></div>
        <div class="pool-stat"><span>${t('mkt.pool.rare_egg')}</span><b>${fmtC(precoRaro)} 💎</b></div>
        <div class="pool-stat"><span>${t('mkt.pool.legendary_egg')}</span><b>${fmtC(precoLend)} 💎</b></div>
        <div class="pool-stat"><span>${t('mkt.pool.available')}</span><b>${fmtC(restante)} 💎</b></div>
      </div>
      ${saldo === 0 ? `<div class="pool-empty">${t('mkt.pool.empty_msg')}</div>` : ''}
    </div>`;
}

// ═══════════════════════════════════════════
// SECÇÃO POOL — aba dedicada
// ═══════════════════════════════════════════
async function renderPoolSection() {
  await loadPool(true);
  renderPoolStatsCard();
  renderCoberturaCard();
  renderTranspDistribuicao();
  await loadPoolLogs(true);
}

// ═══════════════════════════════════════════
// A COBERTURA
//
// O único número que responde "o jogo consegue pagar toda a gente?".
// A página mostrava os cristais da pool e o link do contrato, e nunca a
// razão entre os dois — que é o que faz dela transparência a sério.
//
// O MATIC vem da blockchain; os cristais, da soma de todos os jogadores
// mais os que a pool guarda. Como as duas taxas batem certo (10 💎 por
// MATIC nas duas direcções), 100% é o ponto de equilíbrio.
// ═══════════════════════════════════════════
function renderCoberturaCard() {
  const el = document.getElementById('poolCoberturaCard');
  if(!el) return;
  const c = poolData?.cobertura;

  if(!c) {
    el.innerHTML = `<div class="pool-cob-card">
      <div class="pool-cob-title">${t('mkt.cob.title')}</div>
      <div class="pool-cob-indisp">${t('mkt.cob.indisponivel')}</div>
    </div>`;
    return;
  }

  // Sem ligação à blockchain mostra-se o que se sabe, e diz-se o que falta.
  const semCofre = (c.cofre === null || c.cofre === undefined);
  const pct      = semCofre ? null : c.pct;
  const cor      = semCofre        ? 'var(--muted)'
                 : pct >= 100      ? 'var(--green)'
                 : pct >= 90       ? 'var(--gold)'
                 : 'var(--red2)';

  el.innerHTML = `
  <div class="pool-cob-card">
    <div class="pool-cob-title">${t('mkt.cob.title')}</div>
    <div class="pool-cob-pct" style="color:${cor};">
      ${semCofre ? '—' : pct + '%'}
    </div>
    <div class="pool-cob-sub">${semCofre ? t('mkt.cob.sem_cofre') : t('mkt.cob.sub')}</div>
    <div class="pool-cob-linhas">
      <div class="pool-cob-linha">
        <span>${t('mkt.cob.circulacao')}</span><b>${fmtC(c.circulacao)} 💎</b>
      </div>
      <div class="pool-cob-linha">
        <span>${t('mkt.cob.necessario')}</span><b>${fmtC(c.necessario)} MATIC</b>
      </div>
      <div class="pool-cob-linha">
        <span>${t('mkt.cob.cofre')}</span><b>${semCofre ? '—' : fmtC(c.cofre) + ' MATIC'}</b>
      </div>
    </div>
    ${!semCofre && pct < 100
      ? `<div class="pool-cob-alerta">${t('mkt.cob.alerta')}</div>` : ''}
    <div class="pool-cob-nota">${t('mkt.cob.nota', {n: c.jogadores})}</div>
  </div>`;
}

function renderPoolStatsCard() {
  const el = document.getElementById('poolStatsCard');
  if(!el || !poolData) return;
  const saldo      = poolData.cristais    || 0;
  const totalIn    = poolData.totalEntrou || 0;
  const totalOut   = poolData.totalSaiu   || 0;
  const saqueHoje  = poolData.saqueHoje   || 0;
  const restante   = Math.max(0, 100 - saqueHoje);
  const pct        = Math.min(100, Math.round(saldo / POOL_ALVO * 100));
  const barColor   = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--red2)';
  const precoRaro  = calcPoolPrice('Raro');
  const precoLend  = calcPoolPrice('Lendário');

  el.innerHTML = `
  <div class="pool-stats-card">
    <div class="pool-sc-title">${t('mkt.pool.state_title')}</div>
    <div class="pool-sc-balance">${fmtC(saldo)} 💎</div>
    <div class="pool-sc-balance-sub">${pct}% do alvo (${POOL_ALVO} 💎)</div>
    <div class="pool-sc-bar-wrap">
      <div class="pool-sc-bar" style="width:${pct}%;background:${barColor};"></div>
    </div>
    <div class="pool-sc-grid">
      <div class="pool-sc-stat">
        <span>${t('mkt.pool.total_in')}</span><b>${fmtC(totalIn)} 💎</b>
      </div>
      <div class="pool-sc-stat">
        <span>${t('mkt.pool.total_out')}</span><b>${fmtC(totalOut)} 💎</b>
      </div>
      <div class="pool-sc-stat">
        <span>${t('mkt.pool.available')}</span><b>${fmtC(restante)} 💎</b>
      </div>
    </div>
    <div class="pool-prices">
      <div class="pool-price-card raro">
        <div class="pool-price-label">🔵 ${t('mkt.pool.rare_egg')}</div>
        <div class="pool-price-val">${fmtC(precoRaro)} 💎</div>
        <div class="pool-price-sub">${t('mkt.pool.price_sub')}</div>
      </div>
      <div class="pool-price-card lendario">
        <div class="pool-price-label">🌟 ${t('mkt.pool.legendary_egg')}</div>
        <div class="pool-price-val">${fmtC(precoLend)} 💎</div>
        <div class="pool-price-sub">${t('mkt.pool.price_sub')}</div>
      </div>
    </div>
    <div style="font-size:0.5rem;color:var(--muted);text-align:center;margin-top:0.625rem;line-height:1.8;">
      ${t('mkt.pool.fees')}<br>
      <span style="color:var(--gem2);font-weight:700;">
        ${saldo < 100
          ? t('mkt.pool.limit_1')
          : saldo < 500
            ? t('mkt.pool.limit_2')
            : saldo < 1000
              ? t('mkt.pool.limit_3')
              : t('mkt.pool.limit_5')}
      </span>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════
// CÁLCULO DE % DINÂMICO (espelho do _pool-economia.js)
// Usado apenas para exibição no frontend
// ═══════════════════════════════════════════
// Preenche os campos dinâmicos da aba de transparência.
//
// Vivia aqui um _calcPctDisplay que calculava, a partir do saldo, a
// fatia semanal da pool: 5% no mínimo, subindo até 15% com a pool no
// alvo. Alimentava três sítios — o cartão da pool ("X% estimado esta
// semana por jogo"), a linha da manutenção e a linha do "Pool retém".
//
// Essa distribuição já não existe: o dev passou a receber 1% de cada
// resgate e a pool deixou de ser tocada. Os três sítios continuavam a
// mostrar percentagens da pool, ao lado de um texto que jurava o
// contrário. Saiu o cálculo e saíram os dois set().
//
// O que fica é o que ainda depende do saldo a sério: o preço de
// recompra dos ovos, que sobe até 2× conforme a pool enche.
function renderTranspDistribuicao() {
  if(!poolData) return;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('transPriceRaro',   t('mkt.transp.price_display', { price: fmtC(calcPoolPrice('Raro')),    max: fmtC(POOL_BASE_RARO * 2) }));
  set('transPriceLend',   t('mkt.transp.price_display', { price: fmtC(calcPoolPrice('Lendário')), max: fmtC(POOL_BASE_LEND * 2) }));
}

// ═══════════════════════════════════════════
// HISTÓRICO DE TRANSACÇÕES DA POOL
// ═══════════════════════════════════════════
async function loadPoolLogs(reset) {
  const list = document.getElementById('poolLogList');
  const moreBtn = document.getElementById('poolLogMore');
  if(!list) return;

  if(reset) { poolLogs = []; poolLogsLast = null; }

  try {
    let url = '/api/pool?logs=1';
    if(poolLogsLast) url += '&after=' + encodeURIComponent(poolLogsLast);

    const resp = await fetch(url);
    const json = await resp.json();

    if(!json.ok) throw new Error(json.erro || 'erro');

    if(json.logs.length === 0 && reset) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-txt">${t('mkt.pool.empty')}</div></div>`;
      if(moreBtn) moreBtn.innerHTML = '';
      return;
    }

    poolLogs.push(...json.logs);
    if(json.lastId) poolLogsLast = json.lastId;

    list.innerHTML = poolLogs.map(log => {
      const isEntrada = log.tipo === 'entrada';
      const ts  = log.ts ? new Date(log.ts) : new Date();
      const locale = localStorage.getItem('lang') === 'en' ? 'en-US' : 'pt-PT';
      const timeStr = ts.toLocaleDateString(locale) + ' ' + ts.toLocaleTimeString(locale, {hour:'2-digit',minute:'2-digit'});
      const wallet = log.origem && log.origem.length > 10
        ? log.origem.slice(0,6)+'…'+log.origem.slice(-4)
        : (log.origem || t('mkt.pool.system'));
      const icon  = isEntrada ? '▲' : '▼';
      const sinal = isEntrada ? '+' : '-';
      return `<div class="pool-log-row ${log.tipo}">
        <div class="pool-log-icon">${icon}</div>
        <div class="pool-log-info">
          <div class="pool-log-motivo">${esc(log.motivo) || '—'}</div>
          <div class="pool-log-wallet">${wallet}</div>
        </div>
        <div class="pool-log-amount">${sinal}${fmtC(log.pool)} 💎</div>
        <div class="pool-log-time">${timeStr}</div>
      </div>`;
    }).join('');

    if(moreBtn) {
      moreBtn.innerHTML = json.hasMore
        ? `<button class="btn-slot-activate" style="font-size:0.5625rem;padding:0.375rem 1rem;" onclick="loadPoolLogs(false)">${t('mkt.pool.load_more')}</button>`
        : '';
    }
  } catch(e) {
    console.warn('loadPoolLogs error:', e);
    list.innerHTML = `<div class="empty-state"><div class="empty-txt">${t('mkt.pool.error')}</div></div>`;
  }
}

// ═══════════════════════════════════════════
// ENTRADA NA POOL (taxas)
// 100% das taxas vão para a pool, sem corte nenhum à entrada. O cron
// semanal que dava uma fatia da pool ao dev já não existe: ele recebe
// 1% de cada resgate (DEV_FEE_RATE em api/resgatar.js), e a pool nunca
// é tocada.
// ═══════════════════════════════════════════
async function addToPool(totalTaxa, motivo) {
  if(totalTaxa <= 0) return;
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'taxa', idToken, valor: totalTaxa, motivo }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    if(poolData) {
      poolData.cristais    = (poolData.cristais    || 0) + totalTaxa;
      poolData.totalEntrou = (poolData.totalEntrou || 0) + totalTaxa;
    }
    renderPoolWidget();
  } catch(e) { console.warn('addToPool error:', e); }
}
