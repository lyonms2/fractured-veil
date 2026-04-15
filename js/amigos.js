// ═══════════════════════════════════════════════════════════════════
// AMIGOS — Lista de amigos, pedidos, visitas
// Depende de: walletAddress (global), firebase (global),
//             gerarSVG() (data.js), gs (state.js),
//             scheduleSave() (firebase.js), updateResourceUI() (ui.js)
// ═══════════════════════════════════════════════════════════════════

const COOLDOWN_VISITA_MS = 8 * 60 * 60 * 1000; // 8h
const XP_VISITA          = 15;
const CUSTO_VISITA       = 50;
const MAX_VISITAS_GLOBAL = 10;

let _amigosData    = null; // { amigos, pedidos, visitasLog }
let _visitaAtual   = null; // perfil do amigo sendo visitado
let _buscaTimeout  = null;

function _updateAmigosBadge(count) {
  const badge = document.getElementById('amigosBadge');
  if(!badge) return;
  if(count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

// ── Abrir / fechar overlay ───────────────────────────────────
async function openAmigos() {
  const overlay = document.getElementById('amigosOverlay');
  if(overlay) overlay.style.display = 'flex';
  document.getElementById('btnAmigos')?.classList.add('active-amigos');
  await _carregarAmigos();
}
window.openAmigos = openAmigos;

function fecharAmigos() {
  const overlay = document.getElementById('amigosOverlay');
  if(overlay) overlay.style.display = 'none';
  document.getElementById('btnAmigos')?.classList.remove('active-amigos');
}
window.fecharAmigos = fecharAmigos;

// ── Carregar dados da API ────────────────────────────────────
async function _carregarAmigos() {
  const el = document.getElementById('amigosConteudo');
  if(!el) return;
  el.innerHTML = `<div class="amigos-loading">${t('amigos.loading')}</div>`;

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch(`/api/amigos?lista=1&idToken=${encodeURIComponent(idToken)}`);
    const json    = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    _amigosData = { amigos: json.amigos, pedidos: json.pedidos, visitasLog: json.visitasLog };
    _updateAmigosBadge(json.pedidos.length);
    _renderAmigos();
  } catch(err) {
    if(el) el.innerHTML = `<div class="amigos-empty">${t('amigos.error', {msg: esc(err.message)})}</div>`;
  }
}

// ── Render principal ─────────────────────────────────────────
function _renderAmigos() {
  const el = document.getElementById('amigosConteudo');
  if(!el || !_amigosData) return;

  const { amigos, pedidos } = _amigosData;
  const numAmigos  = Object.keys(amigos).length;
  const numPedidos = pedidos.length;

  el.innerHTML = `
    <!-- Pesquisa -->
    <div class="amigos-search-wrap">
      <input id="amigosBusca" class="amigos-input" type="text" placeholder="${t('amigos.search.placeholder')}" maxlength="30"
        oninput="amigoBuscarDebounce(this.value)">
    </div>
    <div id="amigosBuscaResultados"></div>

    <!-- Pedidos pendentes -->
    ${numPedidos > 0 ? `
    <div class="amigos-section-title">${t('amigos.requests', {n: numPedidos})}</div>
    <div class="amigos-pedidos-lista">
      ${pedidos.map(p => `
        <div class="amigos-pedido-card" id="pedido-${esc(p.de)}">
          <span class="amigos-pedido-nome">${esc(p.nome)}</span>
          <span class="amigos-pedido-data">${_formatTs(p.ts)}</span>
          <div class="amigos-pedido-btns">
            <button class="amigos-btn-aceitar" onclick="amigoAceitar('${esc(p.de)}')">${t('amigos.btn.accept')}</button>
            <button class="amigos-btn-recusar" onclick="amigoRecusar('${esc(p.de)}')">✕</button>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Lista de amigos -->
    <div class="amigos-section-title">${t('amigos.friends_count', {n: numAmigos})}</div>
    ${numAmigos === 0
      ? `<div class="amigos-empty">${t('amigos.empty')}</div>`
      : `<div class="amigos-lista">
          ${Object.entries(amigos).map(([uid, info]) => _renderAmigoCard(uid, info)).join('')}
        </div>`}
  `;
}

function _renderAmigoCard(uid, info) {
  return `
    <div class="amigos-card" id="amigo-card-${uid}">
      <div class="amigos-card-nome">${esc(info.nome || '???')}</div>
      <div class="amigos-card-btns">
        <button class="amigos-btn-visitar" onclick="amigoAbrirVisita('${uid}')">${t('amigos.btn.visit')}</button>
        <button class="amigos-btn-remover" onclick="amigoRemover('${uid}')">✕</button>
      </div>
    </div>`;
}

// ── Pesquisa com debounce ────────────────────────────────────
function amigoBuscarDebounce(query) {
  clearTimeout(_buscaTimeout);
  const el = document.getElementById('amigosBuscaResultados');
  if(query.trim().length < 2) { if(el) el.innerHTML = ''; return; }
  _buscaTimeout = setTimeout(() => _buscarJogador(query), 500);
}
window.amigoBuscarDebounce = amigoBuscarDebounce;

async function _buscarJogador(query) {
  const el = document.getElementById('amigosBuscaResultados');
  if(!el) return;
  el.innerHTML = `<div class="amigos-loading">${t('amigos.searching')}</div>`;
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch(`/api/amigos?buscar=${encodeURIComponent(query)}&idToken=${encodeURIComponent(idToken)}`);
    const json    = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    if(!json.resultados.length) {
      el.innerHTML = `<div class="amigos-empty">${t('amigos.no_results')}</div>`;
      return;
    }
    const jaAmigo = uid => _amigosData?.amigos?.[uid];
    el.innerHTML = `
      <div class="amigos-busca-lista">
        ${json.resultados.map(p => `
          <div class="amigos-busca-card">
            <div class="amigos-busca-svg">${gerarSVG(p.elemento, p.raridade, p.seed, 38, 38, 1)}</div>
            <div class="amigos-busca-info">
              <div class="amigos-busca-nome">${esc(p.nome)}</div>
              <div class="amigos-busca-meta">${t('amigos.meta', {nivel: p.nivel, raridade: esc(p.raridade), elemento: esc(p.elemento)})}</div>
            </div>
            ${jaAmigo(p.uid)
              ? `<div class="amigos-busca-ja">${t('amigos.already_friend')}</div>`
              : `<button class="amigos-btn-add" onclick="amigoEnviarPedido('${p.uid}', this)">${t('amigos.btn.add')}</button>`}
          </div>`).join('')}
      </div>`;
  } catch(err) {
    el.innerHTML = `<div class="amigos-empty">${t('amigos.error', {msg: esc(err.message)})}</div>`;
  }
}

// ── Enviar pedido ────────────────────────────────────────────
async function amigoEnviarPedido(alvoUid, btn) {
  if(btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/amigos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'pedir', idToken, alvoUid }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    if(btn) { btn.textContent = t('amigos.btn.sent'); btn.classList.add('amigos-btn-enviado'); }
  } catch(err) {
    if(btn) { btn.disabled = false; btn.textContent = t('amigos.btn.add'); }
    if(typeof showToast === 'function') showToast(err.message, 'warn');
  }
}
window.amigoEnviarPedido = amigoEnviarPedido;

// ── Aceitar pedido ───────────────────────────────────────────
async function amigoAceitar(alvoUid) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/amigos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'aceitar', idToken, alvoUid }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    // Actualizar estado local
    if(_amigosData) {
      _amigosData.amigos[alvoUid] = { nome: json.nomeAlvo || '???', ts: Date.now() };
      _amigosData.pedidos = _amigosData.pedidos.filter(p => p.de !== alvoUid);
      _updateAmigosBadge(_amigosData.pedidos.length);
    }
    _renderAmigos();
  } catch(err) {
    if(typeof showToast === 'function') showToast(err.message, 'warn');
  }
}
window.amigoAceitar = amigoAceitar;

// ── Recusar pedido ───────────────────────────────────────────
async function amigoRecusar(alvoUid) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/amigos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'recusar', idToken, alvoUid }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    if(_amigosData) {
      _amigosData.pedidos = _amigosData.pedidos.filter(p => p.de !== alvoUid);
      _updateAmigosBadge(_amigosData.pedidos.length);
    }
    _renderAmigos();
  } catch(err) {
    if(typeof showToast === 'function') showToast(err.message, 'warn');
  }
}
window.amigoRecusar = amigoRecusar;

// ── Remover amigo ────────────────────────────────────────────
async function amigoRemover(alvoUid) {
  if(!confirm(t('amigos.confirm_remove'))) return;
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/amigos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'remover', idToken, alvoUid }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    if(_amigosData) delete _amigosData.amigos[alvoUid];
    _renderAmigos();
  } catch(err) {
    if(typeof showToast === 'function') showToast(err.message, 'warn');
  }
}
window.amigoRemover = amigoRemover;

// ── Contar interações globais nas últimas 8h ─────────────────
function _contarVisitasGlobais() {
  if(!_amigosData?.visitasLog) return 0;
  const agora = Date.now();
  let total = 0;
  for(const amigoUid of Object.keys(_amigosData.visitasLog)) {
    const log = _amigosData.visitasLog[amigoUid] || {};
    for(const t of Object.keys(log)) {
      if(agora - (log[t] || 0) < COOLDOWN_VISITA_MS) total++;
    }
  }
  return total;
}

// ── Abrir overlay de visita ──────────────────────────────────
async function amigoAbrirVisita(alvoUid) {
  const overlay = document.getElementById('visitaOverlay');
  const body    = document.getElementById('visitaBody');
  if(!overlay || !body) return;

  body.innerHTML = `<div class="amigos-loading">${t('amigos.loading')}</div>`;
  overlay.style.display = 'flex';

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch(`/api/amigos?perfil=${encodeURIComponent(alvoUid)}&idToken=${encodeURIComponent(idToken)}`);
    const json    = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');

    if(json.semAvatar) {
      body.innerHTML = `<div class="amigos-empty">${t('amigos.no_avatar')}</div>`;
      return;
    }

    _visitaAtual = { uid: alvoUid, perfil: json.perfil, cooldowns: json.cooldowns };
    _renderVisitaOverlay();
  } catch(err) {
    body.innerHTML = `<div class="amigos-empty">${t('amigos.error', {msg: esc(err.message)})}</div>`;
  }
}
window.amigoAbrirVisita = amigoAbrirVisita;

function fecharVisita() {
  const overlay = document.getElementById('visitaOverlay');
  if(overlay) overlay.style.display = 'none';
  _visitaAtual = null;
}
window.fecharVisita = fecharVisita;

function _renderVisitaOverlay() {
  const body = document.getElementById('visitaBody');
  if(!body || !_visitaAtual) return;
  const { perfil, cooldowns } = _visitaAtual;
  const { vitals } = perfil;
  const agora        = Date.now();
  const visitasFeitas = _contarVisitasGlobais();
  const limiteAtingido = visitasFeitas >= MAX_VISITAS_GLOBAL;

  function btnInfo(tipo, vitalKey) {
    const last   = cooldowns[tipo] || 0;
    const restMs = COOLDOWN_VISITA_MS - (agora - last);
    const emCooldown = restMs > 0;
    const vitalMax   = Math.round(vitals[vitalKey] ?? 100) >= 100;

    let disabled = false;
    let subLabel = t('amigos.visit.cost', {coins: CUSTO_VISITA, xp: XP_VISITA});

    if(emCooldown)          { disabled = true; subLabel = `(${_formatMs(restMs)})`; }
    else if(vitalMax)       { disabled = true; subLabel = t('amigos.vital_max'); }
    else if(limiteAtingido) { disabled = true; subLabel = t('amigos.limit_reached'); }

    return { disabled, subLabel };
  }

  const acoes = [
    { tipo: 'alimentar', icon: '🍖', label: t('amigos.action.feed'),  vital: 'fome',    cor: '#7ab87a' },
    { tipo: 'brincar',   icon: '🎮', label: t('amigos.action.play'),  vital: 'humor',   cor: '#a78bfa' },
    { tipo: 'limpar',    icon: '🧼', label: t('amigos.action.clean'), vital: 'higiene', cor: '#5ab4e8' },
  ];

  body.innerHTML = `
    <div class="visita-avatar">
      <div class="av-zoom-wrap" style="position:relative;display:inline-block;">
        <div id="visitaAvatarWrap" class="creature-wrap" style="width:80px;height:80px;">
          ${gerarSVG(perfil.elemento, perfil.raridade, perfil.seed, 80, 80, Math.ceil((perfil.nivel || 1) / 5))}
        </div>
        <button class="mkt-avatar-zoom-btn"
          onclick="openAvatarZoomData('${esc(perfil.elemento)}','${esc(perfil.raridade)}',${perfil.seed},${perfil.nivel},'${esc(perfil.nome)}')"
          title="Ampliar avatar">🔍</button>
      </div>
    </div>
    <div class="visita-nome">${esc(perfil.nome)}</div>
    <div class="visita-meta">${t('amigos.meta', {nivel: perfil.nivel, raridade: esc(perfil.raridade), elemento: esc(perfil.elemento)})}</div>

    <div class="visita-vitals">
      ${acoes.map(a => {
        const v   = Math.round(vitals[a.vital] ?? 100);
        const pct = v;
        return `
          <div class="visita-vital-row">
            <span class="visita-vital-label">${a.icon} ${a.label}</span>
            <div class="visita-vital-bar-wrap">
              <div class="visita-vital-bar" style="width:${pct}%;background:${a.cor};"></div>
            </div>
            <span class="visita-vital-val">${v}</span>
          </div>`;
      }).join('')}
    </div>

    <div class="visita-limite-info" style="text-align:center;font-size:11px;color:${limiteAtingido?'#e06c75':'#aaa'};margin-bottom:6px;">
      ${t('amigos.interactions', {done: visitasFeitas, max: MAX_VISITAS_GLOBAL})}
    </div>

    <div class="visita-acoes">
      ${acoes.map(a => {
        const { disabled, subLabel } = btnInfo(a.tipo, a.vital);
        return `
          <button class="visita-acao-btn ${disabled ? 'disabled' : ''}" id="visitaBtn-${a.tipo}"
            ${disabled ? 'disabled' : `onclick="executarVisita('${a.tipo}')"`}>
            ${a.icon} ${a.label}<br>
            <span class="visita-acao-sub">${subLabel}</span>
          </button>`;
      }).join('')}
    </div>`;
}

// ── Executar acção de visita ─────────────────────────────────
async function executarVisita(tipo) {
  if(!_visitaAtual) return;
  const btn = document.getElementById(`visitaBtn-${tipo}`);
  if(btn) { btn.disabled = true; btn.classList.add('disabled'); }
  _playVisitaAnim(tipo);

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/amigos', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'visitar', idToken, alvoUid: _visitaAtual.uid, tipo }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');

    // Actualizar estado local do visitante
    gs.moedas = json.novasMoedas;
    xp = (xp || 0) + json.xpGanho;
    updateResourceUI();
    scheduleSave();

    // Actualizar cooldown local + vital exibido
    if(_visitaAtual.cooldowns) _visitaAtual.cooldowns[tipo] = Date.now();
    if(_visitaAtual.perfil?.vitals) {
      const vitalField = { alimentar:'fome', brincar:'humor', limpar:'higiene' }[tipo];
      _visitaAtual.perfil.vitals[vitalField] = json.novoVital;
    }

    // Actualizar visitasLog local
    if(_amigosData) {
      if(!_amigosData.visitasLog[_visitaAtual.uid]) _amigosData.visitasLog[_visitaAtual.uid] = {};
      _amigosData.visitasLog[_visitaAtual.uid][tipo] = Date.now();
    }

    const icones = { alimentar:'🍖', brincar:'🎮', limpar:'🧼' };
    if(typeof showFloat === 'function') showFloat(`+${CUSTO_VISITA} 🪙 +${XP_VISITA} XP`, '#7ab87a');
    if(typeof addLog   === 'function') addLog(t('amigos.log.visited', {icon: icones[tipo], nome: esc(_visitaAtual.perfil.nome), coins: CUSTO_VISITA, xp: XP_VISITA}), 'good');

    _renderVisitaOverlay();
    // Reprojectar animação no novo DOM (re-render destrói o elemento anterior)
    setTimeout(() => _playVisitaAnim(tipo), 50);
  } catch(err) {
    if(btn) { btn.disabled = false; btn.classList.remove('disabled'); }
    if(typeof showToast === 'function') showToast(err.message, 'warn');
    else if(typeof addLog === 'function') addLog(`⚠️ ${err.message}`, 'bad');
  }
}
window.executarVisita = executarVisita;

// ── Animação do avatar na visita ────────────────────────────
const _VISITA_ANIM = { alimentar: 'anim-eat', brincar: 'anim-play', limpar: 'anim-clean' };

function _playVisitaAnim(tipo) {
  const w = document.getElementById('visitaAvatarWrap');
  if(!w) return;
  const cls = _VISITA_ANIM[tipo];
  if(!cls) return;
  w.classList.remove('anim-eat', 'anim-play', 'anim-clean');
  void w.offsetWidth;
  w.classList.add(cls);
  setTimeout(() => w.classList.remove(cls), 900);

  // Partículas — mesmos efeitos do index mas no wrap da visita
  if(tipo === 'alimentar') {
    const foods = ['🍖','🍗','✨','⭐'];
    [{fx:'-28px'},{fx:'0px'},{fx:'28px'},{fx:'-14px'},{fx:'14px'}].forEach((pos, i) => {
      const el = document.createElement('div');
      el.className = 'food-particle';
      el.textContent = foods[i % foods.length];
      el.style.cssText = `--fx:${pos.fx};--fr:${(Math.random()*60-30).toFixed(0)}deg;top:10px;left:50%;transform:translateX(-50%);animation-delay:${i*0.06}s`;
      w.appendChild(el);
      setTimeout(() => el.remove(), 1100);
    });
  } else if(tipo === 'limpar') {
    const curtain = document.createElement('div');
    curtain.className = 'bath-curtain';
    w.appendChild(curtain);
    setTimeout(() => curtain.remove(), 1000);
    for(let i = 0; i < 8; i++) {
      setTimeout(() => {
        const d = document.createElement('div');
        d.className = 'bath-drop';
        d.textContent = ['💧','💦'][i % 2];
        d.style.left = `${8 + i * 8 + (Math.random()*6-3)}%`;
        d.style.setProperty('--dur', `${0.35 + Math.random()*0.3}s`);
        w.appendChild(d);
        setTimeout(() => d.remove(), 600);
      }, i * 80);
    }
  } else if(tipo === 'brincar') {
    const emojis = ['🎮','⭐','✨','🎯'];
    for(let i = 0; i < 4; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.className = 'food-particle';
        el.textContent = emojis[i % emojis.length];
        el.style.cssText = `--fx:${(Math.random()*60-30).toFixed(0)}px;--fr:${(Math.random()*60-30).toFixed(0)}deg;top:10px;left:50%;transform:translateX(-50%);animation-delay:0s`;
        w.appendChild(el);
        setTimeout(() => el.remove(), 1100);
      }, i * 80);
    }
  }
}

// ── Utilitários ──────────────────────────────────────────────
function _formatTs(ts) {
  if(!ts) return '';
  return new Date(ts).toLocaleDateString('pt-PT');
}

function _formatMs(ms) {
  if(ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
