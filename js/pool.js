// ═══════════════════════════════════════════════════════════════════
// POOL P2E — Constantes, estado e todas as funções da pool
// Depende de: db (global), firebase (global), walletAddress (global),
//             showToast() (marketplace.html inline)
// ═══════════════════════════════════════════════════════════════════

const POOL_ALVO        = 1000; // 💎 referência para preço dinâmico
const POOL_BASE_RARO   = 0.5;  // 💎 preço base por ovo Raro (pool no alvo)
const POOL_BASE_LEND   = 1.0;  // 💎 preço base por ovo Lendário (pool no alvo)
const POOL_MIN_RARO    = 0.10; // 💎 mínimo garantido (pool vazia)
const POOL_MIN_LEND    = 0.25; // 💎 mínimo garantido (pool vazia)
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
  const min  = raridade === 'Lendário' ? POOL_MIN_LEND  : POOL_MIN_RARO;
  if(!poolData) return base;
  const ratio = Math.min(2, (poolData.cristais || 0) / POOL_ALVO);
  return Math.max(min, parseFloat((base * ratio).toFixed(2)));
}

function poolDisponivel() {
  if(!poolData) return false;
  const hoje = poolData.saqueHoje || 0;
  return poolData.cristais > 0 && hoje < POOL_LIMITE_DIA;
}

// ═══════════════════════════════════════════
// CARREGAR POOL DO FIRESTORE
// ═══════════════════════════════════════════
async function loadPool() {
  try {
    const snap = await db.collection('config').doc('pool').get();
    if(snap.exists) {
      poolData = snap.data();
      // Reset diário
      const agora = Date.now();
      const ultimoReset = poolData.ultimoReset || 0;
      if(agora - ultimoReset > 86400000) {
        await db.collection('config').doc('pool').update({ saqueHoje: 0, ultimoReset: agora });
        poolData.saqueHoje = 0;
        poolData.ultimoReset = agora;
      }
    } else {
      // Criar pool inicial se não existir
      const inicial = { cristais: 0, saqueHoje: 0, ultimoReset: Date.now() };
      await db.collection('config').doc('pool').set(inicial);
      poolData = inicial;
    }
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
        <div class="pool-stat"><span>Saldo</span><b>${saldo} 💎</b></div>
        <div class="pool-stat"><span>Ovo Raro</span><b>${precoRaro} 💎</b></div>
        <div class="pool-stat"><span>Ovo Lendário</span><b>${precoLend} 💎</b></div>
        <div class="pool-stat"><span>Disponível hoje</span><b>${restante} 💎</b></div>
      </div>
      ${saldo === 0 ? '<div class="pool-empty">Pool vazia — em breve! 🌱</div>' : ''}
    </div>`;
}

// ═══════════════════════════════════════════
// SECÇÃO POOL — aba dedicada
// ═══════════════════════════════════════════
async function renderPoolSection() {
  await loadPool();
  renderPoolStatsCard();
  await loadPoolLogs(true);
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
    <div class="pool-sc-title">Estado actual da pool</div>
    <div class="pool-sc-balance">${saldo} 💎</div>
    <div class="pool-sc-balance-sub">${pct}% do alvo (${POOL_ALVO} 💎)</div>
    <div class="pool-sc-bar-wrap">
      <div class="pool-sc-bar" style="width:${pct}%;background:${barColor};"></div>
    </div>
    <div class="pool-sc-grid">
      <div class="pool-sc-stat">
        <span>Total entrou</span><b>${totalIn} 💎</b>
      </div>
      <div class="pool-sc-stat">
        <span>Total saiu</span><b>${totalOut} 💎</b>
      </div>
      <div class="pool-sc-stat">
        <span>Disponível hoje</span><b>${restante} 💎</b>
      </div>
    </div>
    <div class="pool-prices">
      <div class="pool-price-card raro">
        <div class="pool-price-label">🔵 Ovo Raro</div>
        <div class="pool-price-val">${precoRaro} 💎</div>
        <div class="pool-price-sub">preço actual de recompra</div>
      </div>
      <div class="pool-price-card lendario">
        <div class="pool-price-label">🌟 Ovo Lendário</div>
        <div class="pool-price-val">${precoLend} 💎</div>
        <div class="pool-price-sub">preço actual de recompra</div>
      </div>
    </div>
    <div style="font-size:8px;color:var(--muted);text-align:center;margin-top:10px;line-height:1.8;">
      100% das taxas do marketplace alimentam esta pool.<br>
      O preço de recompra sobe quando a pool está cheia e desce quando está baixa.<br>
      <span style="color:var(--gem2);font-weight:700;">
        ${saldo < 100
          ? '📊 Limite actual: 1 venda/semana · Cresce com a pool'
          : saldo < 500
            ? '📊 Limite actual: 2 vendas/semana · Pool em crescimento'
            : saldo < 1000
              ? '📊 Limite actual: 3 vendas/semana · Pool saudável'
              : '📊 Limite actual: 5 vendas/semana · Pool forte 💪'}
      </span>
    </div>
  </div>`;
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
    let q = db.collection('config').doc('pool').collection('logs')
      .orderBy('ts', 'desc').limit(20);
    if(poolLogsLast) q = q.startAfter(poolLogsLast);

    const snap = await q.get();
    if(snap.empty && reset) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-txt">Nenhuma transacção ainda.</div></div>';
      if(moreBtn) moreBtn.innerHTML = '';
      return;
    }

    snap.docs.forEach(d => poolLogs.push({ id: d.id, ...d.data() }));
    if(snap.docs.length > 0) poolLogsLast = snap.docs[snap.docs.length - 1];

    list.innerHTML = poolLogs.map(log => {
      const isEntrada = log.tipo === 'entrada';
      const ts  = log.ts?.toDate ? log.ts.toDate() : new Date();
      const timeStr = ts.toLocaleDateString('pt-PT') + ' ' + ts.toLocaleTimeString('pt-PT', {hour:'2-digit',minute:'2-digit'});
      const wallet = log.origem && log.origem.startsWith('0x')
        ? log.origem.slice(0,6)+'…'+log.origem.slice(-4)
        : (log.origem || 'sistema');
      const icon   = isEntrada ? '▲' : '▼';
      const sinal  = isEntrada ? '+' : '-';
      return `<div class="pool-log-row ${log.tipo}">
        <div class="pool-log-icon">${icon}</div>
        <div class="pool-log-info">
          <div class="pool-log-motivo">${log.motivo || '—'}</div>
          <div class="pool-log-wallet">${wallet}</div>
        </div>
        <div class="pool-log-amount">${sinal}${Math.abs(log.pool)} 💎</div>
        <div class="pool-log-time">${timeStr}</div>
      </div>`;
    }).join('');

    if(moreBtn) {
      moreBtn.innerHTML = snap.docs.length === 20
        ? `<button class="btn-slot-activate" style="font-size:9px;padding:6px 16px;" onclick="loadPoolLogs(false)">Carregar mais</button>`
        : '';
    }
  } catch(e) {
    console.warn('loadPoolLogs error:', e);
    list.innerHTML = '<div class="empty-state"><div class="empty-txt">Erro ao carregar histórico.</div></div>';
  }
}

// ═══════════════════════════════════════════
// ENTRADA NA POOL (taxas)
// Split: 80% → pool P2E, 20% → conta dev (manutenção)
// ═══════════════════════════════════════════
const DEV_WALLET_ADDR  = '0x1fcb61db743a0276b92382b9e7b92a62ca8cf030';
const POOL_SPLIT       = 0.80; // 80% para a pool
const DEV_SPLIT        = 0.20; // 20% para a conta dev

async function addToPool(totalTaxa, motivo, origem) {
  if(totalTaxa <= 0) return;

  // Calcular split — arredonda para baixo, dev leva o resto
  const paraPool = Math.floor(totalTaxa * POOL_SPLIT);
  const paraDev  = totalTaxa - paraPool; // garante que paraPool + paraDev = totalTaxa

  try {
    const batch = db.batch();

    // 80% → pool P2E
    if(paraPool > 0) {
      batch.update(db.collection('config').doc('pool'), {
        cristais:    firebase.firestore.FieldValue.increment(paraPool),
        totalEntrou: firebase.firestore.FieldValue.increment(paraPool),
      });

      const logRef = db.collection('config').doc('pool')
        .collection('logs').doc();
      batch.set(logRef, {
        tipo:    'entrada',
        motivo,
        origem:  origem || walletAddress || 'sistema',
        total:   totalTaxa,
        pool:    paraPool,
        dev:     paraDev,
        ts:      firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 20% → conta dev no Firestore
    if(paraDev > 0) {
      const devRef = db.collection('players').doc(DEV_WALLET_ADDR);
      batch.set(devRef, {
        'gs.cristais': firebase.firestore.FieldValue.increment(paraDev),
        cristais:      firebase.firestore.FieldValue.increment(paraDev),
      }, { merge: true });
    }

    await batch.commit();

    if(poolData) {
      poolData.cristais    = (poolData.cristais    || 0) + paraPool;
      poolData.totalEntrou = (poolData.totalEntrou || 0) + paraPool;
    }

    renderPoolWidget();
  } catch(e) { console.warn('addToPool error:', e); }
}

// ═══════════════════════════════════════════
// SAÍDA DA POOL (jogador vendeu ovo)
// ═══════════════════════════════════════════
async function sacoDaPool(cristais, destino, motivo) {
  try {
    const batch = db.batch();
    batch.update(db.collection('config').doc('pool'), {
      cristais:    firebase.firestore.FieldValue.increment(-cristais),
      saqueHoje:   firebase.firestore.FieldValue.increment(cristais),
      totalSaiu:   firebase.firestore.FieldValue.increment(cristais),
    });
    const logRef = db.collection('config').doc('pool').collection('logs').doc();
    batch.set(logRef, {
      tipo:    'saida',
      motivo,
      origem:  destino,
      total:   cristais,
      pool:    -cristais,
      ts:      firebase.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
    if(poolData) {
      poolData.cristais  = (poolData.cristais  || 0) - cristais;
      poolData.saqueHoje = (poolData.saqueHoje || 0) + cristais;
      poolData.totalSaiu = (poolData.totalSaiu || 0) + cristais;
    }
    renderPoolWidget();
  } catch(e) { console.warn('sacoDaPool error:', e); }
}
