// ═══════════════════════════════════════════════════════════════════
// POOL P2E — Constantes, estado e todas as funções da pool
// Depende de: db (global), firebase (global), walletAddress (global),
//             showToast() (marketplace.html inline)
// ═══════════════════════════════════════════════════════════════════

// O alvo da pool: não é um tecto nem uma promessa, é a referência
// contra a qual a barra do saldo se mede.
const POOL_ALVO        = 1000;
const POOL_LIMITE_DIA  = 100;  // 💎 máximo de saque por dia
const TAXA_MARKETPLACE = 0.10; // 10% de taxa sobre vendas de avatar
const TAXA_OVO         = 0.10; // 10% de taxa sobre compra de ovo raro na loja
const DEV_WALLET       = '0x8615C48d38505f02eb212Aa2ED2BA8Df86E4A49C'; // carteira dev
// Taxas do marketplace vão 100% para a Pool P2E (lucro dev vem dos 20% MATIC do Treasury)

let poolData = null; // carregado do Firestore

// ── Logs da pool ──
let poolLogs     = [];
let poolLogsLast = null;

/* O PREÇO DINÂMICO SAIU DAQUI.

   O calcPoolPrice dizia quanto a pool pagava por um ovo Raro ou
   Lendário queimado. Já não há ovos com raridade e já não há queima
   para a pool — ver a nota no api/pool.js. O POOL_ALVO fica, que é o
   que a barra do saldo mede. */

/* Quanto ainda pode SAIR da pool hoje.

   Dizia só POOL_LIMITE_DIA menos o que já saiu, e o segundo dos dois
   sítios tinha o 100 escrito à mão em vez da constante. O resultado era
   uma pool com 0 cristais a anunciar "Disponível hoje: 100,00 💎" — o
   tecto do dia apresentado como se fosse dinheiro que lá estivesse.

   O tecto é um limite, não um saldo. O que pode sair é o MENOR dos
   dois: o que a pool tem e o que o tecto ainda deixa. */
function _podeSairHoje(saldo, saqueHoje) {
  const restaDoTecto = Math.max(0, POOL_LIMITE_DIA - (saqueHoje || 0));
  return Math.max(0, Math.min(saldo || 0, restaDoTecto));
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
    renderPoolStatsCard();
  } catch(e) { console.warn('loadPool error:', e); }
}

/* O renderPoolWidget saiu daqui.

   Era um resumo da pool para a barra lateral do browse, e o browse
   deixou de o ter há muito: procurava um #poolWidget que não existe em
   parte nenhuma do index.html, portanto saía pela segunda linha em
   todas as chamadas. O que ele fazia mesmo era chamar o
   renderPoolStatsCard — e isso os dois sítios que o chamavam passam a
   fazer directamente.

   Com ele foram-se as últimas duas leituras do preço de recompra de um
   ovo Raro e de um Lendário. */

// ═══════════════════════════════════════════
// SECÇÃO POOL — aba dedicada
// ═══════════════════════════════════════════
async function renderPoolSection() {
  await loadPool(true);
  renderPoolStatsCard();
  renderCoberturaCard();
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
  const restante   = _podeSairHoje(saldo, saqueHoje);
  const pct        = Math.min(100, Math.round(saldo / POOL_ALVO * 100));
  const barColor   = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--red2)';

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
    <!-- Aqui estavam dois cartões grandes com o preço de recompra de
         um ovo Raro e de um Lendário, e por baixo o limite de vendas
         por semana. As três coisas mediam a queima de ovos para a
         pool, que não existe — ver a nota no api/pool.js.

         Fica a linha das taxas, que continua verdadeira. -->
    <div style="font-size:0.5rem;color:var(--muted);text-align:center;margin-top:0.625rem;line-height:1.8;">
      ${t('mkt.pool.fees')}
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
// Depois saíram as duas últimas linhas que restavam — o preço de
// recompra do ovo Raro e do Lendário. Não havia mais nada nesta função
// e ela saiu inteira, com a chamada que a invocava.

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
    renderPoolStatsCard();
  } catch(e) { console.warn('addToPool error:', e); }
}
