// ═══════════════════════════════════════════════════════════════════
// CÂMBIO — Moedas 🪙 → Cristais 💎
// Regras:
//   · Avatar nível 20+ e vivo
//   · Taxa varia com saldo da pool
//   · Limite diário varia com raridade do avatar
//   · Pool abaixo de 100 💎 → câmbio desativado
// ═══════════════════════════════════════════════════════════════════

// ── Configuração ──
const CAMBIO_POOL_MIN     = 100;  // pool mínima para ativar câmbio
const CAMBIO_NIVEL_MIN    = 20;   // nível mínimo do avatar

const CAMBIO_TAXAS = [
  { minPool: 1000, custo: 1000 }, // pool cheia   → 1000 🪙 = 1 💎
  { minPool: 500,  custo: 1500 }, // pool média   → 1500 🪙 = 1 💎
  { minPool: 100,  custo: 2000 }, // pool baixa   → 2000 🪙 = 1 💎
];

const CAMBIO_LIMITES = {
  'Comum':    1,
  'Raro':     2,
  'Lendário': 4,
};

// ── Calcula custo actual baseado na pool ──
function calcCambioTaxa() {
  const saldo = window._cambioPoolSaldo || 0;
  for(const t of CAMBIO_TAXAS) {
    if(saldo >= t.minPool) return t.custo;
  }
  return null; // pool insuficiente — câmbio desativado
}

// ── Limite diário do jogador ──
function calcCambioLimite() {
  const rar = avatar?.raridade || 'Comum';
  return CAMBIO_LIMITES[rar] || 1;
}

// ── Quantos cristais já converteu hoje ──
function calcCambioUsadoHoje(cambioLog) {
  if(!cambioLog) return 0;
  const hoje = new Date().toISOString().slice(0, 10);
  if(cambioLog.data !== hoje) return 0;
  return cambioLog.count || 0;
}

// ── Valida se o jogador pode usar o câmbio ──
function calcCambioEligivel() {
  if(!hatched || dead || !avatar)    return { ok: false, motivo: 'Sem avatar activo.' };
  if(nivel < CAMBIO_NIVEL_MIN)       return { ok: false, motivo: `Avatar precisa de nível ${CAMBIO_NIVEL_MIN}+.` };
  if(calcCambioTaxa() === null)      return { ok: false, motivo: 'Pool insuficiente. Tenta mais tarde.' };
  return { ok: true };
}

// ── Carrega saldo da pool e cambioLog do jogador ──
async function cambioCarregarDados() {
  if(!fbDb() || !walletAddress) return null;
  try {
    const [poolSnap, playerSnap] = await Promise.all([
      fbDb().collection('config').doc('pool').get(),
      fbDb().collection('players').doc(walletAddress).get(),
    ]);
    const poolSaldo  = poolSnap.exists ? (poolSnap.data()?.cristais || 0) : 0;
    const cambioLog  = playerSnap.exists ? (playerSnap.data()?.cambioLog || null) : null;
    window._cambioPoolSaldo = poolSaldo;
    return { poolSaldo, cambioLog };
  } catch(e) {
    console.warn('[cambio] erro ao carregar dados:', e);
    return null;
  }
}

// ── Executa a conversão (server-side via /api/cambiar) ──
async function cambioConverter(quantidade) {
  const elegivel = calcCambioEligivel();
  if(!elegivel.ok) { showBubble(elegivel.motivo); return false; }

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/cambiar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quantidade, idToken }),
    });
    const data = await resp.json();
    if(!resp.ok) {
      showBubble(data.erro || t('cambio.bub.error'));
      addLog(t('cambio.log.error', {msg: data.erro || t('cambio.bub.error')}), 'bad');
      return false;
    }

    gs.moedas   = data.novoSaldoMoedas;
    gs.cristais = data.novoSaldoCristais;
    updateResourceUI();

    showBubble(t('cambio.bub.success', {cristais: data.cristais}));
    addLog(t('cambio.log.success', {moedas: data.moedasGastas, cristais: data.cristais}), 'good');
    showFloat(`+${data.cristais} 💎`, '#a78bfa');
    scheduleSave();
    return true;
  } catch(e) {
    console.error('[cambio]', e);
    showBubble(t('cambio.bub.conn_err'));
    return false;
  }
}

// ── Render do painel de câmbio (chamado pelo coinshop) ──
async function renderCambioPanel() {
  const el = document.getElementById('cambioPanel');
  if(!el) return;

  el.innerHTML = `<div style="font-size:7px;color:var(--muted);text-align:center;padding:8px 0;">A carregar câmbio...</div>`;

  // Verifica avatar/nível antes de carregar dados da pool
  const elegivelBasico = calcCambioEligivel();
  if(!elegivelBasico.ok && elegivelBasico.motivo !== 'Pool insuficiente. Tenta mais tarde.') {
    el.innerHTML = `
      <div style="padding:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
                  border-radius:6px;text-align:center;">
        <div style="font-size:16px;margin-bottom:4px;">🔒</div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);">${elegivelBasico.motivo}</div>
      </div>`;
    return;
  }

  // Carrega dados da pool antes de verificar saldo
  const dados = await cambioCarregarDados();
  if(!dados) {
    el.innerHTML = `<div style="font-size:7px;color:var(--muted);text-align:center;">Erro ao carregar dados.</div>`;
    return;
  }

  // Verificação completa agora que _cambioPoolSaldo está actualizado
  const elegivel = calcCambioEligivel();
  if(!elegivel.ok) {
    el.innerHTML = `
      <div style="padding:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
                  border-radius:6px;text-align:center;">
        <div style="font-size:16px;margin-bottom:4px;">🔒</div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);">${elegivel.motivo}</div>
      </div>`;
    return;
  }

  const custo     = calcCambioTaxa();
  const limite    = calcCambioLimite();
  const usadoHoje = calcCambioUsadoHoje(dados.cambioLog);
  const restante  = Math.max(0, limite - usadoHoje);
  const poolSaldo = dados.poolSaldo;

  // Nível da pool para label
  const poolLabel = poolSaldo >= 1000 ? '🟢 Cheia'
                  : poolSaldo >= 500  ? '🟡 Média'
                  : poolSaldo >= 100  ? '🟠 Baixa'
                  : '🔴 Insuficiente';

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;width:100%;">

      <!-- Info da pool e taxa -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        <div style="padding:6px 8px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.15);
                    border-radius:6px;text-align:center;">
          <div style="font-size:5.5px;color:var(--muted);letter-spacing:1px;margin-bottom:2px;">TAXA ACTUAL</div>
          <div style="font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:#a78bfa;">${custo} 🪙</div>
          <div style="font-size:5px;color:var(--muted);">por 💎</div>
        </div>
        <div style="padding:6px 8px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);
                    border-radius:6px;text-align:center;">
          <div style="font-size:5.5px;color:var(--muted);letter-spacing:1px;margin-bottom:2px;">POOL</div>
          <div style="font-family:'Cinzel',serif;font-size:8px;font-weight:700;color:var(--gold);">${poolSaldo} 💎</div>
          <div style="font-size:5px;color:var(--muted);">${poolLabel}</div>
        </div>
      </div>

      <!-- Limite diário -->
      <div style="padding:5px 8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
                  border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:6px;color:var(--muted);">Limite diário (${avatar?.raridade || 'Comum'})</span>
        <span style="font-family:'Cinzel',serif;font-size:8px;font-weight:700;
                     color:${restante > 0 ? '#7ab87a' : '#e74c3c'};">
          ${restante}/${limite} 💎
        </span>
      </div>

      <!-- Saldo de moedas -->
      <div style="padding:5px 8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);
                  border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:6px;color:var(--muted);">Teu saldo</span>
        <span style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);">${gs.moedas} 🪙</span>
      </div>

      <!-- Botões de conversão -->
      ${restante > 0 ? `
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${Array.from({length: restante}, (_, i) => i + 1).map(qtd => {
          const custoQtd = custo * qtd;
          const podeComprar = gs.moedas >= custoQtd;
          return `<button
            onclick="cambioExecutar(event,${qtd})"
            ${!podeComprar ? 'disabled' : ''}
            style="flex:1;min-width:60px;padding:6px 4px;
                   font-family:'Cinzel',serif;font-size:7px;font-weight:700;
                   border-radius:5px;cursor:${podeComprar ? 'pointer' : 'not-allowed'};
                   border:1px solid ${podeComprar ? 'rgba(167,139,250,.5)' : 'rgba(255,255,255,.08)'};
                   background:${podeComprar ? 'rgba(167,139,250,.12)' : 'rgba(255,255,255,.02)'};
                   color:${podeComprar ? '#c4b5fd' : 'var(--muted)'};
                   transition:all .15s;">
            +${qtd} 💎<br>
            <span style="font-size:5.5px;opacity:.7;">${custoQtd} 🪙</span>
          </button>`;
        }).join('')}
      </div>` : `
      <div style="padding:8px;text-align:center;font-size:7px;color:#e74c3c;
                  border:1px solid rgba(231,76,60,.2);border-radius:6px;background:rgba(231,76,60,.05);">
        Limite diário atingido · Volta amanhã 🌙
      </div>`}

      <div style="font-size:5.5px;color:var(--muted);text-align:center;line-height:1.8;">
        Taxa sobe quando a pool está baixa · Reset diário à meia-noite<br>
        Cristais obtidos por câmbio são cristais normais
      </div>

    </div>`;
}

// ── Wrapper chamado pelos botões da UI ──
async function cambioExecutar(ev, qtd) {
  const btn = ev?.target?.closest('button');
  if(btn) { btn.disabled = true; btn.style.opacity = '.5'; }
  const ok = await cambioConverter(qtd);
  // Re-render painel após a troca
  await renderCambioPanel();
}

window.cambioExecutar    = cambioExecutar;
window.renderCambioPanel = renderCambioPanel;
