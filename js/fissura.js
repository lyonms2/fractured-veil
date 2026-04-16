// ═══════════════════════════════════════════════════════════════════
// FISSURA — A Grande Fissura: guerra mensal de facções
// ═══════════════════════════════════════════════════════════════════

const FISSURA_FACCOES = [
  { id: 'Caos',       icon: '🔥', css: 'Caos',       desc: 'Destruir para criar' },
  { id: 'Equilíbrio', icon: '⚖️',  css: 'Equilibrio', desc: 'Harmonia entre forças' },
  { id: 'Éter',       icon: '✨', css: 'Eter',        desc: 'Além do véu' },
];

const FISSURA_PONTOS_LISTA = [
  { label: 'Login diário',             pts: 5  },
  { label: 'PVE completo',             pts: 8  },
  { label: 'PVE vitória',              pts: 15 },
  { label: 'Câmbio 🪙→💎',            pts: 10 },
  { label: 'PvP derrota',              pts: 5  },
  { label: 'PvP empate',               pts: 10 },
  { label: 'PvP vitória (Comum)',       pts: 20 },
  { label: 'PvP vitória (Raro)',        pts: 35 },
  { label: 'PvP vitória (Lendário)',    pts: 50 },
];

let _fissuraData      = null; // dados do jogador vindos do Firestore
let _fissuraGlobal    = null; // doc fissura/{mes}
let _fissuraFaccaoSel = null; // facção seleccionada antes de inscrever

function getMesAtualFissura() {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

// ── Timer: tempo restante até ao fim do mês ────────────────────────
function fissuraTimerStr() {
  const now  = new Date();
  const fim  = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 5, 0); // 1º do mês seguinte às 00:05
  const diff = fim - now;
  if (diff <= 0) return t('fissura.timer.end');
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000)  / 60000);
  if (d > 0) return t('fissura.timer.days',  { d, h });
  if (h > 0) return t('fissura.timer.hours', { h, m });
  return t('fissura.timer.mins', { m });
}

// ── Carregar dados ─────────────────────────────────────────────────
async function fissuraCarregarDados() {
  if (!walletAddress) return;
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/fissura', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'dados', idToken }),
    });
    const json = await resp.json();
    if (!json.ok) throw new Error(json.erro || 'erro');
    // Simula a estrutura anterior
    _fissuraData   = {
      faccao:          json.faccao,
      fissuraMes:      json.fissuraMes,
      fissuraPontos:   json.fissuraPontos,
      fissuraRaridade: json.fissuraRaridade,
    };
    _fissuraGlobal = json.global;
  } catch (e) {
    console.warn('[fissura] erro ao carregar dados:', e.message);
    _fissuraData   = null;
    _fissuraGlobal = null;
  }
}

// ── Render principal ───────────────────────────────────────────────
async function renderFissura() {
  const section = document.getElementById('fissuraSection');
  if (!section) return;

  section.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:9px">${t('fissura.loading')}</div>`;

  if (!walletAddress) {
    section.innerHTML = `
      <div class="fissura-card fissura-header">
        <div class="fissura-header-title">${t('fissura.title')}</div>
        <div class="fissura-header-sub">${t('fissura.sub')}</div>
      </div>
      <div class="fissura-card" style="text-align:center;padding:22px 18px;color:var(--muted);font-size:9px">
        ${t('fissura.login')}
      </div>
    `;
    return;
  }

  await fissuraCarregarDados();
  fissuraRenderUI(section);
}

function fissuraRenderUI(section) {
  const mes       = getMesAtualFissura();
  const inscrito  = _fissuraData?.fissuraMes === mes;
  const faccao    = _fissuraData?.faccao || null;
  const pontos    = _fissuraData?.fissuraPontos || 0;
  const raridade  = _fissuraData?.fissuraRaridade || 'Comum';
  const global    = _fissuraGlobal || {};

  // Calcula standings
  const standings = FISSURA_FACCOES.map(f => {
    const d = global[f.id] || { pontosTotal: 0, membros: 0 };
    return {
      ...f,
      pontosTotal: d.pontosTotal || 0,
      membros:     d.membros     || 0,
      media:       d.membros > 0 ? Math.round((d.pontosTotal || 0) / d.membros) : 0,
    };
  });
  const maxTotal = Math.max(1, ...standings.map(s => s.pontosTotal));

  // ── Prémios ──
  const avSlot    = (avatarSlots || [])[activeSlotIdx];
  const rarAtiva  = inscrito ? raridade : (avSlot?.raridade || 'Comum');
  const custoInsc = rarAtiva === 'Lendário' ? '10 💎' : rarAtiva === 'Raro' ? '5 💎' : '200 🪙';

  section.innerHTML = `
    <!-- Cabeçalho -->
    <div class="fissura-card fissura-header">
      <div class="fissura-header-title">${t('fissura.title')}</div>
      <div class="fissura-header-sub">${t('fissura.sub')} · ${mes}</div>
      <div class="fissura-timer" id="fissuraTimer">${fissuraTimerStr()}</div>
    </div>

    ${inscrito ? fissuraRenderStatus(faccao, pontos, standings, maxTotal) : fissuraRenderJoin(standings, custoInsc, rarAtiva)}

    <!-- Standings -->
    <div class="fissura-card">
      <div class="fissura-prize-title">${t('fissura.standings')}</div>
      <div class="fissura-bars" id="fissuraBars">
        ${standings.map(s => `
          <div class="fissura-bar-row">
            <div class="fissura-bar-label">${s.icon} ${s.id} (${s.membros})</div>
            <div class="fissura-bar-track">
              <div class="fissura-bar-fill fc-${s.css}" style="width:${Math.round(s.pontosTotal/maxTotal*100)}%"></div>
            </div>
            <div class="fissura-bar-pts">${s.pontosTotal.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Prémios -->
    <div class="fissura-card">
      <div class="fissura-prize-title">${t('fissura.prizes.title')}</div>
      <div class="fissura-prize-grid">
        <div class="fissura-prize-item">
          <div class="fissura-prize-rar r-Comum">COMUM</div>
          <div class="fissura-prize-val">500 🪙</div>
          <div class="fissura-prize-tax">${t('fissura.prizes.per_member')}</div>
          <div class="fissura-prize-entry">${t('fissura.prizes.entry', {cost: '200 🪙'})}</div>
        </div>
        <div class="fissura-prize-item">
          <div class="fissura-prize-rar r-Raro">RARO</div>
          <div class="fissura-prize-val">até 15 💎</div>
          <div class="fissura-prize-tax">${t('fissura.prizes.pool', {pct: 4})}</div>
          <div class="fissura-prize-entry">${t('fissura.prizes.entry', {cost: '5 💎'})}</div>
        </div>
        <div class="fissura-prize-item">
          <div class="fissura-prize-rar r-Lendario">LENDÁRIO</div>
          <div class="fissura-prize-val">até 30 💎</div>
          <div class="fissura-prize-tax">${t('fissura.prizes.pool', {pct: 8})}</div>
          <div class="fissura-prize-entry">${t('fissura.prizes.entry', {cost: '10 💎'})}</div>
        </div>
      </div>
      <div style="font-size:7.5px;color:var(--muted);margin-top:8px;line-height:1.5">
        ${t('fissura.prizes.note')}
      </div>
    </div>

    <!-- Como ganhar pontos -->
    <div class="fissura-card">
      <div class="fissura-prize-title">${t('fissura.pts.title')}</div>
      <ul class="fissura-pts-list">
        ${FISSURA_PONTOS_LISTA.map((p, i) => `
          <li>
            <span>${t('fissura.pts.'+i)}</span>
            <span class="pts-val">+${p.pts} pts</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  // Timer auto-refresh
  setInterval(() => {
    const el = document.getElementById('fissuraTimer');
    if (el) el.textContent = fissuraTimerStr();
  }, 60000);
}

function fissuraRenderStatus(faccao, pontos, standings, maxTotal) {
  const fac = FISSURA_FACCOES.find(f => f.id === faccao) || FISSURA_FACCOES[0];
  const minha = standings.find(s => s.id === faccao);
  const pos   = [...standings].sort((a,b) => b.pontosTotal - a.pontosTotal).findIndex(s => s.id === faccao) + 1;
  const posStr = t('fissura.status.pos.'+(pos <= 3 ? pos : 3));

  return `
    <div class="fissura-card fissura-status-card">
      <div class="fissura-status-top">
        <div class="fissura-status-faccao">
          <span class="fissura-status-icon">${fac.icon}</span>
          <div>
            <div class="fissura-status-name fc-${fac.css}">${fac.id.toUpperCase()}</div>
            <div style="font-size:7.5px;color:var(--muted)">${posStr} · ${minha?.membros || 0} ${t('fissura.status.members')}</div>
          </div>
        </div>
        <div class="fissura-pts-badge">⚡ ${pontos.toLocaleString()} pts</div>
      </div>
      <div style="font-size:7.5px;color:var(--muted);margin-top:2px">
        ${t('fissura.status.contribution')}
      </div>
    </div>
  `;
}

function fissuraRenderJoin(standings, custoInsc, raridade) {
  return `
    <div class="fissura-card fissura-join-box">
      <div class="fissura-join-title">${t('fissura.join.title')}</div>
      <div class="fissura-join-desc">
        ${t('fissura.join.desc').replace('\n','<br>')}
      </div>
      <div class="fissura-faction-grid" id="fissuraFaccaoGrid">
        ${FISSURA_FACCOES.map(f => {
          const d = standings.find(s => s.id === f.id) || { membros: 0 };
          return `
            <button class="fissura-faction-btn" data-faccao="${f.id}"
              onclick="fissuraSelectFaccao('${f.id}')">
              <span class="fissura-faction-icon">${f.icon}</span>
              <span class="fissura-faction-name">${f.id}</span>
              <span class="fissura-faction-members">${d.membros} ${t('fissura.status.members')}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="fissura-join-custo">
        ${t('fissura.join.entry_fee', {rar: raridade})}<strong>${custoInsc}</strong>
      </div>
      <button class="fissura-join-btn" id="fissuraJoinBtn" disabled
        onclick="fissuraInscrever()">
        ${t('fissura.join.btn')}
      </button>
    </div>
  `;
}

function fissuraSelectFaccao(id) {
  _fissuraFaccaoSel = id;
  document.querySelectorAll('.fissura-faction-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.faccao === id);
  });
  const joinBtn = document.getElementById('fissuraJoinBtn');
  if (joinBtn) joinBtn.disabled = false;
}

async function fissuraInscrever() {
  if (!_fissuraFaccaoSel) return;
  if (!walletAddress) { fissuraToast(t('fissura.toast.login')); return; }

  const joinBtn = document.getElementById('fissuraJoinBtn');
  if (joinBtn) { joinBtn.disabled = true; joinBtn.textContent = t('fissura.join.joining'); }

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/fissura', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'inscrever', idToken, faccao: _fissuraFaccaoSel }),
    });
    const json = await resp.json();

    if (!json.ok) {
      fissuraToast(json.erro || t('fissura.toast.err'));
      if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = t('fissura.join.btn'); }
      return;
    }

    // Actualizar saldo local
    gs.moedas   = json.novoSaldoMoedas;
    gs.cristais = json.novoSaldoCristais;
    updateAllUI();

    fissuraToast(t('fissura.toast.ok', { faccao: _fissuraFaccaoSel }));
    _fissuraFaccaoSel = null;
    // Re-render com dados actualizados
    await renderFissura();

  } catch (e) {
    fissuraToast(t('fissura.toast.conn_err'));
    if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = t('fissura.join.btn'); }
  }
}

function abrirFissura() {
  const el = document.getElementById('fissuraOverlay');
  if (!el) return;
  el.style.display = 'flex';
  renderFissura();
}

function fecharFissura() {
  const el = document.getElementById('fissuraOverlay');
  if (el) el.style.display = 'none';
}

function fissuraToast(msg) {
  let el = document.getElementById('fissuraToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fissuraToast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}
