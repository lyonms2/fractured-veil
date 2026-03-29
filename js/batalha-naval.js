// ═══════════════════════════════════════════════════════════════════
// BATALHA NAVAL — Duelo Multiplayer
// Padrão: Firebase RTDB · lobby · desafio · colocação · em_jogo · finalizada
// ═══════════════════════════════════════════════════════════════════

// ── Constantes ──
const BN_LOBBY_TTL = 300000; // 5 min
const BN_TIMER_SEG = 30;     // segundos por turno
const BN_TAXA      = 0.10;   // 10% para a pool
const BN_TAMANHO   = 8;      // tabuleiro 8×8
const BN_APOSTAS   = {
  'Comum':    { moedas: 60, cristais: 0  },
  'Raro':     { moedas: 0,  cristais: 12 },
  'Lendário': { moedas: 0,  cristais: 22 },
};

// Navios: [nome, tamanho, ícone]
const BN_NAVIOS = [
  { id:'portaAvioes',  nome:'Porta-Aviões',    tam:5, icon:'🚢' },
  { id:'guerreiro',    nome:'Navio de Guerra',  tam:4, icon:'🛳️' },
  { id:'submarino',    nome:'Submarino',        tam:3, icon:'⛴️' },
  { id:'destroyer',    nome:'Destroyer',        tam:3, icon:'🛥️' },
  { id:'lancha',       nome:'Lancha',           tam:2, icon:'⛵' },
];
const BN_TOTAL_CASAS = BN_NAVIOS.reduce((s, n) => s + n.tam, 0); // 17

// ── Estado local ──
let _bnAtiva           = false;
let _bnSalaId          = null;
let _bnLobbyRef        = null;
let _bnLobbyListRef    = null;
let _bnHeartbeat       = null;
let _bnHeartbeatSala   = null;
let _bnSalaListener    = null;
let _bnTimerInt        = null;
let _bnTimerColocacao  = null; // timer de 90s para posicionar navios
let _bnOpWallet        = null;

// Guard: evita dois tiros simultâneos (timer + clique)
let _bnAtirando        = false;
// Preview da colocação: indica se a posição é válida (para cor do highlight)
let _bnPreviewValido   = true;

// Estado de colocação de navios
let _bnMeuTabuleiro    = [];  // Array 8x8: null | { navioId, acertado }
let _bnNaviosColocados = {};  // { navioId: [{r,c},...] }
let _bnNavioAtual      = 0;   // índice em BN_NAVIOS
let _bnOrientacao      = 'H'; // H ou V
let _bnPreview         = [];  // casas do preview actual

// ── Helpers ──
function _bnRtdb()     { return typeof _rtdb !== 'undefined' ? _rtdb : null; }
function _bnRaridade() { return avatar?.raridade || 'Comum'; }
function _bnAposta()   { return BN_APOSTAS[_bnRaridade()]; }
function _bnPodePagar() {
  const a = _bnAposta();
  return a.cristais > 0 ? (gs.cristais||0) >= a.cristais : (gs.moedas||0) >= a.moedas;
}
function _bnDescAposta() {
  const a = _bnAposta();
  return a.cristais > 0 ? `${a.cristais} 💎` : `${a.moedas} 🪙`;
}
function _bnDebitarAposta() {
  const a = _bnAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) - a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) - a.moedas;
  updateResourceUI();
}
function _bnCreditarPremio(bruto, usaCris) {
  const taxa = Math.floor(bruto * BN_TAXA);
  const v    = bruto - taxa;
  if(usaCris) gs.cristais = (gs.cristais||0) + v;
  else        gs.moedas   = (gs.moedas  ||0) + v;
  updateResourceUI();
  scheduleSave();
}
function _bnPararTimer() {
  if(_bnTimerInt) { clearInterval(_bnTimerInt); _bnTimerInt = null; }
}
function _bnPararTimerColocacao() {
  if(_bnTimerColocacao) { clearInterval(_bnTimerColocacao); _bnTimerColocacao = null; }
}
function _bnPararLobby() {
  if(_bnLobbyListRef) { _bnLobbyListRef.off('value'); _bnLobbyListRef = null; }
}
function _bnPararSala() {
  if(_bnSalaListener) { _bnSalaListener.off('value'); _bnSalaListener = null; }
}
function _bnTabuleiroVazio() {
  return Array.from({ length: BN_TAMANHO }, () => Array(BN_TAMANHO).fill(null));
}
function _bnSleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Serializa tabuleiro (arrays aninhados não vão bem no RTDB)
function _bnSerTab(tab) {
  const out = {};
  for(let r = 0; r < BN_TAMANHO; r++)
    for(let c = 0; c < BN_TAMANHO; c++)
      if(tab[r][c]) out[`${r}_${c}`] = tab[r][c];
  return out;
}
function _bnDesserTab(obj) {
  const tab = _bnTabuleiroVazio();
  if(!obj) return tab;
  Object.entries(obj).forEach(([key, val]) => {
    const [r, c] = key.split('_').map(Number);
    tab[r][c] = val;
  });
  return tab;
}

// Verifica se as casas são válidas para colocar um navio
// Regra: sem sobreposição directa (navios podem ficar adjacentes — Batalha Naval standard)
function _bnCasasValidas(r, c, tam, orient, excluir = null) {
  const casas = [];
  for(let i = 0; i < tam; i++) {
    const nr = orient === 'V' ? r + i : r;
    const nc = orient === 'H' ? c + i : c;
    if(nr >= BN_TAMANHO || nc >= BN_TAMANHO) return null;
    casas.push([nr, nc]);
  }
  // Apenas impede sobreposição directa com outro navio
  for(const [nr, nc] of casas) {
    if(_bnMeuTabuleiro[nr][nc] && _bnMeuTabuleiro[nr][nc] !== excluir) return null;
  }
  return casas;
}

// ── Bloqueia/desbloqueia UI ──
function _bnBloquearUI(bloquear) {
  const ids = ['btnMarket','resMoedasBtn','resCristaisBtn','resOvosBtn','resItemsBtn','btnPlay'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    if(bloquear) {
      el.dataset.bnBlocked = '1';
      el.style.opacity     = '0.3';
      el.style.pointerEvents = 'none';
    } else {
      if(el.dataset.bnBlocked) {
        delete el.dataset.bnBlocked;
        el.style.opacity     = '';
        el.style.pointerEvents = '';
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// ABRIR / FECHAR
// ═══════════════════════════════════════════════════════════════════

function openBatalhaNaval() {
  if(!hatched || dead || !avatar) { showBubble('Precisa de um avatar ativo!'); return; }
  if(sleeping || modoRepouso)     { showBubble('Descansando agora...'); return; }
  if(!_bnRtdb())                  { showBubble('Batalha Naval indisponível'); return; }
  ModalManager.open('batalhaNavalModal');

  if(_bnSalaId) {
    _bnRtdb().ref(`batalhaNaval/salas/${_bnSalaId}`).once('value').then(snap => {
      const s = snap.val();
      if(s && s.status === 'colocacao') {
        _bnRenderColocacao(_bnSalaId, s);
      } else if(s && s.status === 'em_jogo') {
        _bnIniciarPartida(_bnSalaId, s);
      } else if(s && s.status === 'aguardando') {
        _bnRenderEspera(_bnSalaId);
      } else {
        _bnSalaId = null;
        _bnAtiva  = false;
        _bnRenderLobby();
      }
    });
    return;
  }

  _bnRenderLobby();
}

function closeBatalhaNaval() {
  if(_bnSalaId) {
    ModalManager.close('batalhaNavalModal');
    return;
  }
  _bnPararTimer();
  _bnPararLobby();
  _bnPararSala();
  if(_bnHeartbeat)     { clearInterval(_bnHeartbeat);     _bnHeartbeat = null; }
  if(_bnHeartbeatSala) { clearInterval(_bnHeartbeatSala); _bnHeartbeatSala = null; }
  _bnBloquearUI(false);
  ModalManager.close('batalhaNavalModal');
}

// ═══════════════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════════════

function _bnRenderLobby() {
  const el = document.getElementById('batalhaNavalModal');
  if(!el) return;
  const rar       = _bnRaridade();
  const podePagar = _bnPodePagar();
  const aposta    = _bnAposta();
  const bruto     = aposta.cristais > 0 ? aposta.cristais*2 : aposta.moedas*2;
  const premio    = bruto - Math.floor(bruto * BN_TAXA);
  const usaCris   = aposta.cristais > 0;
  const moeda     = usaCris ? '💎' : '🪙';

  el.innerHTML = `
    <button class="gs-x-btn" onclick="closeBatalhaNaval()">✕</button>

    <div class="arena-header" style="margin-bottom:8px;">
      <div class="arena-title">🚢 BATALHA NAVAL</div>
      <div class="arena-sub">Duelo estratégico · Fila <b style="color:var(--gold)">${rar.toUpperCase()}</b></div>
    </div>

    <div class="arena-tabs">
      <button class="arena-tab active" id="bnTabLobby"   onclick="bnShowTab('lobby')">🏟️ LOBBY</button>
      <button class="arena-tab"        id="bnTabRanking" onclick="bnShowTab('ranking')">🏆 RANKING</button>
    </div>

    <div id="bnTabContentLobby" class="arena-tab-content bn-lobby-scroll">

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;
                  padding:10px 8px;background:rgba(201,168,76,.05);
                  border:1px solid rgba(201,168,76,.2);border-radius:8px;width:100%;">
        <div style="text-align:center;">
          <div style="font-size:6px;color:var(--muted);letter-spacing:1px;margin-bottom:4px;">APOSTA</div>
          <div style="font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:var(--gold);">${_bnDescAposta()}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:6px;color:var(--muted);letter-spacing:1px;margin-bottom:4px;">PRÉMIO</div>
          <div style="font-family:'Cinzel',serif;font-size:11px;font-weight:700;color:#7ab87a;">${premio} ${moeda}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:6px;color:var(--muted);letter-spacing:1px;margin-bottom:4px;">TAXA</div>
          <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--muted);">10%</div>
        </div>
      </div>

      <div id="bnLobbyActions" style="width:100%;">${_bnHtmlAcoes(podePagar)}</div>

      <div style="font-family:'Cinzel',serif;font-size:6px;color:var(--muted);
                  letter-spacing:2px;align-self:flex-start;">JOGADORES NA FILA · ${rar.toUpperCase()}</div>
      <div class="arena-lobby-lista" id="bnLobbyLista" style="width:100%;">
        <div class="arena-lobby-vazio">Nenhum jogador na fila ainda...</div>
      </div>

      <div style="padding:8px 10px;background:rgba(255,255,255,.02);
                  border:1px solid rgba(255,255,255,.06);border-radius:6px;width:100%;">
        <div style="font-family:'Cinzel',serif;font-size:6px;color:var(--gold);
                    letter-spacing:1px;margin-bottom:6px;">◆ COMO JOGAR</div>
        <div style="font-size:6.5px;color:var(--muted);line-height:2;">
          🚢 Coloca ${BN_NAVIOS.length} navios no teu tabuleiro ${BN_TAMANHO}×${BN_TAMANHO}<br>
          🎯 Turnos alternados — escolhe uma coordenada do adversário<br>
          💥 Acerto → joga de novo · 🌊 Água → passa a vez<br>
          🏆 Quem afundar todos os navios do oponente vence
        </div>
      </div>

    </div>

    <div id="bnTabContentRanking" class="arena-tab-content bn-lobby-scroll" style="display:none;">
      <div class="arena-ranking-wrap" id="bnRankingWrap">
        <div class="arena-lobby-vazio">Carregando...</div>
      </div>
      <div id="bnPoolInfo"></div>
    </div>
  `;

  _bnIniciarLobbyListener();
  _bnCarregarRanking();
}

function _bnHtmlAcoes(podePagar) {
  if(_bnAtiva) return `
    <button class="arena-btn-sair" onclick="bnSairDoLobby()">⬅ SAIR DA FILA</button>
    <div class="arena-aguardando" style="margin-top:10px;">
      <div class="arena-pulse"></div>Na fila — aguardando oponente...
    </div>`;
  return `
    <button class="arena-btn-entrar ${!podePagar ? 'disabled' : ''}"
      onclick="${podePagar ? 'bnEntrarNoLobby()' : ''}" ${!podePagar ? 'disabled' : ''}>
      🚢 ENTRAR NA FILA
    </button>
    ${!podePagar ? `<div class="arena-sem-saldo" style="margin-top:6px;">Saldo insuficiente (${_bnDescAposta()} necessário)</div>` : ''}`;
}

function _bnAtualizarAcoes() {
  const wrap = document.getElementById('bnLobbyActions');
  if(wrap) wrap.innerHTML = _bnHtmlAcoes(_bnPodePagar());
}

function bnShowTab(tab) {
  document.getElementById('bnTabContentLobby').style.display   = tab === 'lobby'   ? 'flex' : 'none';
  document.getElementById('bnTabContentRanking').style.display = tab === 'ranking' ? 'flex' : 'none';
  document.getElementById('bnTabLobby').classList.toggle('active',   tab === 'lobby');
  document.getElementById('bnTabRanking').classList.toggle('active', tab === 'ranking');
}

// ── Listener do lobby ──
function _bnIniciarLobbyListener() {
  if(!_bnRtdb()) return;
  _bnPararLobby();
  const fila = _bnRaridade();
  _bnLobbyListRef = _bnRtdb().ref(`batalhaNaval/lobby/${fila}`);
  _bnLobbyListRef.on('value', snap => {
    const lista = document.getElementById('bnLobbyLista');
    if(!lista) return;
    const dados = snap.val();
    if(!dados) { lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum jogador na fila ainda...</div>'; return; }
    const myKey = (walletAddress||'').toLowerCase();
    const agora = Date.now();
    const jogadores = Object.entries(dados).filter(([k,d]) =>
      k.toLowerCase() !== myKey && !d.emPartida && (!d.ts || (agora - d.ts) < BN_LOBBY_TTL));
    if(!jogadores.length) { lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum jogador na fila ainda...</div>'; return; }
    lista.innerHTML = jogadores.map(([k,d]) => `
      <div class="arena-lobby-card">
        <div class="arena-lobby-svg">${gerarSVG(d.elemento, d.raridade, d.seed, 36, 36)}</div>
        <div class="arena-lobby-info">
          <div class="arena-lobby-nome">${d.nome||'???'}</div>
          <div class="arena-lobby-meta">NV ${d.nivel||1} · ${d.raridade||'Comum'}</div>
        </div>
        ${_bnAtiva
          ? `<button class="arena-btn-desafiar" onclick="bnDesafiar('${d.wallet}')">🚢 DESAFIAR</button>`
          : `<div class="arena-lobby-aguarda">Entre na fila para desafiar</div>`}
      </div>`).join('');
  });
}

// ═══════════════════════════════════════════════════════════════════
// ENTRAR / SAIR DO LOBBY
// ═══════════════════════════════════════════════════════════════════

async function bnEntrarNoLobby() {
  if(!_bnRtdb() || !walletAddress || !avatar) return;
  if(!_bnPodePagar()) { showBubble('Saldo insuficiente!'); return; }
  const fila = _bnRaridade();
  _bnLobbyRef = _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${walletAddress}`);
  await _bnLobbyRef.set({
    wallet: walletAddress, nome: avatar.nome.split(',')[0],
    raridade: avatar.raridade, elemento: avatar.elemento,
    nivel: nivel||1, seed: avatar.seed||0,
    ts: firebase.database.ServerValue.TIMESTAMP, emPartida: false,
  });
  _bnLobbyRef.onDisconnect().remove();
  if(_bnHeartbeat) clearInterval(_bnHeartbeat);
  _bnHeartbeat = setInterval(() => {
    if(_bnLobbyRef) _bnLobbyRef.update({ ts: firebase.database.ServerValue.TIMESTAMP });
  }, 10000);
  _bnAtiva = true;
  addLog('Entrou na fila da Batalha Naval! 🚢', 'info');
  _bnAtualizarAcoes();
}

async function bnSairDoLobby() {
  if(_bnLobbyRef) { try { await _bnLobbyRef.remove(); } catch(e) {} _bnLobbyRef = null; }
  if(_bnHeartbeat) { clearInterval(_bnHeartbeat); _bnHeartbeat = null; }
  _bnAtiva = false;
  addLog('Saiu da fila da Batalha Naval.', 'info');
  _bnAtualizarAcoes();
}

// ═══════════════════════════════════════════════════════════════════
// DESAFIAR
// ═══════════════════════════════════════════════════════════════════

async function bnDesafiar(walletOponente) {
  if(!_bnAtiva || !_bnRtdb()) return;
  const fila = _bnRaridade();

  // Marca oponente como emPartida de forma atómica — evita dois jogadores desafiarem o mesmo alvo
  const opEmPartidaRef = _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${walletOponente}/emPartida`);
  const { committed } = await opEmPartidaRef.transaction(current => {
    if(current === true) return; // undefined → aborta
    return true;
  });
  if(!committed) {
    showBubble('Oponente já entrou em outra partida!');
    return;
  }

  const aposta = _bnAposta();
  const salaId = `bn_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

  const sala = {
    id: salaId, fila,
    status:   'aguardando',
    criador:  walletAddress,
    oponente: walletOponente,
    aposta,
    turno:    walletAddress, // criador atira primeiro
    jogadores: {
      [walletAddress]:  { nome: avatar.nome.split(',')[0], raridade: avatar.raridade, elemento: avatar.elemento, seed: avatar.seed||0, pronto: false },
      [walletOponente]: { nome: null, raridade: null, elemento: null, seed: 0, pronto: false },
    },
    // Tabuleiros públicos (só acertos/água) — sem revelar posição dos navios
    tabuleirosPublicos: {
      [walletAddress]:  {},
      [walletOponente]: {},
    },
    // Contagem de acertos para determinar fim
    acertos: {
      [walletAddress]:  0,
      [walletOponente]: 0,
    },
    criadoEm: firebase.database.ServerValue.TIMESTAMP,
    recompensaDistribuida: false,
  };

  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).set(sala);
  // Marca o criador como emPartida (oponente já foi marcado pela transaction acima)
  await _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${walletAddress}/emPartida`).set(true);

  if(_bnHeartbeat) { clearInterval(_bnHeartbeat); _bnHeartbeat = null; }
  _bnPararLobby();

  await _bnRtdb().ref(`batalhaNaval/notificacoes/${walletOponente}/${salaId}`).set({
    salaId, criador: walletAddress, fila, lida: false,
    ts: firebase.database.ServerValue.TIMESTAMP,
  });

  _bnDebitarAposta();
  _bnSalaId = salaId;
  addLog(`Desafio de Batalha Naval enviado!`, 'info');
  showBubble('Desafio enviado! 🚢');
  _bnRenderEspera(salaId);
}

// ═══════════════════════════════════════════════════════════════════
// SALA DE ESPERA
// ═══════════════════════════════════════════════════════════════════

function _bnRenderEspera(salaId) {
  const el = document.getElementById('batalhaNavalModal');
  if(!el) return;
  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title">🚢 BATALHA NAVAL</div>
      <div class="arena-pulse" style="margin:16px auto;"></div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;">DESAFIO ENVIADO</div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">Aguardando oponente aceitar...</div>
      <div style="font-size:6px;color:var(--muted);margin-top:3px;">Sala #${salaId.slice(-6).toUpperCase()}</div>
      <div id="bnDesafioTimer" style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);margin-top:8px;">⏳ 60s</div>
      <div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;width:100%;margin-top:4px;">
        <div id="bnDesafioTimerBar" style="height:100%;background:var(--gold);width:100%;transition:width 1s linear;"></div>
      </div>
      <button class="arena-btn-sair" style="margin-top:18px;" onclick="bnCancelarDesafio('${salaId}')">✕ CANCELAR</button>
    </div>`;

  let seg = 60;
  const timerExp = setInterval(() => {
    seg--;
    const timerEl  = document.getElementById('bnDesafioTimer');
    const timerBar = document.getElementById('bnDesafioTimerBar');
    if(timerEl)  timerEl.textContent = `⏳ ${seg}s`;
    if(timerBar) timerBar.style.width = (seg/60*100)+'%';
    if(seg <= 10 && timerBar) timerBar.style.background = '#e74c3c';
    if(seg <= 0) { clearInterval(timerExp); bnCancelarDesafio(salaId); }
  }, 1000);

  const salaRef = _bnRtdb().ref(`batalhaNaval/salas/${salaId}`);
  salaRef.on('value', snap => {
    const s = snap.val();
    if(!s) return;
    if(s.status === 'colocacao') {
      clearInterval(timerExp);
      salaRef.off('value');
      _bnRenderColocacao(salaId, s);
    }
    if(s.status === 'cancelada' || s.status === 'recusada') {
      clearInterval(timerExp);
      salaRef.off('value');
      const a = _bnAposta();
      if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
      else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
      updateResourceUI();
      _bnAtiva = false; _bnSalaId = null;
      addLog('Desafio cancelado ou recusado.', 'bad');
      _bnRenderLobby();
    }
  });
}

async function bnCancelarDesafio(salaId) {
  if(!_bnRtdb()) return;
  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update({ status: 'cancelada' });
  const fila = _bnRaridade();
  try { await _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${walletAddress}`).remove(); } catch(e) {}
  const a = _bnAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
  updateResourceUI();
  _bnAtiva = false; _bnSalaId = null;
  _bnRenderLobby();
}

// ═══════════════════════════════════════════════════════════════════
// ACEITAR / RECUSAR
// ═══════════════════════════════════════════════════════════════════

async function bnAceitarDesafio(salaId) {
  if(!_bnRtdb() || !walletAddress || !avatar) return;
  if(!_bnPodePagar()) { showBubble('Saldo insuficiente!'); return; }
  const snapCheck = await _bnRtdb().ref(`batalhaNaval/salas/${salaId}/status`).once('value');
  if(snapCheck.val() !== 'aguardando') { addLog('Desafio já expirou.', 'bad'); _bnRenderLobby(); return; }

  _bnDebitarAposta();
  _bnSalaId = salaId;

  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update({
    status: 'colocacao',
    [`jogadores/${walletAddress}/nome`]:     avatar.nome.split(',')[0],
    [`jogadores/${walletAddress}/raridade`]: avatar.raridade,
    [`jogadores/${walletAddress}/elemento`]: avatar.elemento,
    [`jogadores/${walletAddress}/seed`]:     avatar.seed||0,
  });

  const fila = _bnRaridade();
  await _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${walletAddress}/emPartida`).set(true);

  const snap = await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).once('value');
  _bnRenderColocacao(salaId, snap.val());
}

async function bnRecusarDesafio(salaId) {
  if(!_bnRtdb()) return;
  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update({ status: 'recusada' });
  setTimeout(async () => {
    try { await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).remove(); } catch(e) {}
    try { await _bnRtdb().ref(`batalhaNaval/notificacoes/${walletAddress}/${salaId}`).remove(); } catch(e) {}
  }, 3000);
  addLog('Desafio recusado.', 'info');
  _bnRenderLobby();
}

// ═══════════════════════════════════════════════════════════════════
// FASE DE COLOCAÇÃO DE NAVIOS
// ═══════════════════════════════════════════════════════════════════

function _bnRenderColocacao(salaId, sala) {
  _bnMeuTabuleiro    = _bnTabuleiroVazio();
  _bnNaviosColocados = {};
  _bnNavioAtual      = 0;
  _bnOrientacao      = 'H';
  _bnPreview         = [];

  const el = document.getElementById('batalhaNavalModal');
  if(!el) return;

  const opWallet = sala.criador === walletAddress ? sala.oponente : sala.criador;
  const isPC = window.innerWidth > 600;
  el.innerHTML = isPC ? `
    <div style="display:flex;flex-direction:column;width:100%;max-width:620px;height:100%;padding:8px 10px;gap:6px;overflow:hidden;">

      <!-- Header + timer -->
      <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;">🚢 POSICIONAR NAVIOS</div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span id="bnTimerColSeg" style="font-family:'Cinzel',serif;font-size:7px;color:var(--gold);">90s</span>
          <div style="width:60px;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;">
            <div id="bnTimerColBar" style="height:100%;width:100%;background:#7ab87a;transition:width 1s linear;border-radius:2px;"></div>
          </div>
        </div>
      </div>

      <!-- 2-col: board | seleção -->
      <div style="display:flex;gap:8px;flex:1;min-height:0;overflow:hidden;">

        <!-- Esquerda: tabuleiro -->
        <div style="flex-shrink:0;display:flex;flex-direction:column;gap:4px;">
          <div style="font-size:5.5px;color:var(--muted);letter-spacing:1px;">CLICA PARA POSICIONAR</div>
          <div id="bnTabColocacao" style="display:inline-block;">${_bnHtmlTabColocacao(salaId, 22)}</div>
          <div id="bnNavioInfo" style="font-family:'Cinzel',serif;font-size:6px;color:var(--gold);">
            ${_bnHtmlNavioInfo(salaId)}
          </div>
        </div>

        <!-- Direita: navios -->
        <div style="flex:1;display:flex;flex-direction:column;gap:4px;min-width:0;overflow:hidden;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
            <span style="font-family:'Cinzel',serif;font-size:6px;color:var(--muted);letter-spacing:1px;">NAVIOS</span>
            <button style="font-family:'Cinzel',serif;font-size:6px;padding:2px 8px;
                           border:1px solid var(--border);border-radius:4px;background:transparent;
                           color:var(--muted);cursor:pointer;" onclick="_bnToggleOrientacao()">
              <b id="bnOrientLabel">H</b> ↕
            </button>
          </div>
          <div id="bnNaviosLista" style="flex:1;overflow-y:auto;">${_bnHtmlNaviosLista()}</div>
          <div id="bnBtnConfirmar" style="display:none;flex-shrink:0;">
            <button class="arena-btn-entrar" style="font-size:6px;padding:5px 8px;width:100%;" onclick="bnConfirmarColocacao('${salaId}')">
              ✅ CONFIRMAR
            </button>
          </div>
          <div id="bnAguardandoOponente" style="display:none;flex-direction:column;align-items:center;gap:6px;">
            <div class="arena-aguardando" style="font-size:6px;text-align:center;"><div class="arena-pulse"></div>Aguardando oponente...</div>
          </div>
        </div>

      </div>
    </div>` : `
    <div style="display:flex;flex-direction:column;height:100%;gap:6px;padding:8px;overflow-y:auto;">

      <div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;">🚢 POSICIONAR NAVIOS</div>
        <button style="font-family:'Cinzel',serif;font-size:7px;padding:4px 10px;
                       border:1px solid var(--border);border-radius:4px;background:transparent;
                       color:var(--muted);cursor:pointer;" onclick="_bnToggleOrientacao()">
          Orientação: <b id="bnOrientLabel">H</b>
        </button>
      </div>

      <!-- Timer de colocação -->
      <div style="flex-shrink:0;display:flex;align-items:center;gap:8px;">
        <span style="font-family:'Cinzel',serif;font-size:6px;color:var(--muted);letter-spacing:1px;">TEMPO</span>
        <span id="bnTimerColSeg" style="font-family:'Cinzel',serif;font-size:7px;color:var(--gold);">90s</span>
        <div style="flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;">
          <div id="bnTimerColBar" style="height:100%;width:100%;background:#7ab87a;transition:width 1s linear;border-radius:2px;"></div>
        </div>
      </div>

      <div id="bnNavioInfo" style="flex-shrink:0;padding:6px 8px;
           background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);
           border-radius:6px;font-family:'Cinzel',serif;font-size:7px;color:var(--gold);">
        ${_bnHtmlNavioInfo(salaId)}
      </div>

      <div style="flex-shrink:0;">
        <div style="font-size:6px;color:var(--muted);letter-spacing:1px;margin-bottom:4px;">MEU TABULEIRO — clica para colocar</div>
        <div id="bnTabColocacao" style="display:inline-block;">${_bnHtmlTabColocacao(salaId)}</div>
      </div>

      <div id="bnNaviosLista" style="flex-shrink:0;">${_bnHtmlNaviosLista()}</div>

      <div id="bnBtnConfirmar" style="flex-shrink:0;display:none;">
        <button class="arena-btn-entrar" onclick="bnConfirmarColocacao('${salaId}')">
          ✅ CONFIRMAR POSIÇÕES
        </button>
      </div>

      <div id="bnAguardandoOponente" style="display:none;flex-direction:column;align-items:center;gap:6px;margin-top:8px;">
        <div class="arena-aguardando"><div class="arena-pulse"></div>Aguardando oponente posicionar navios...</div>
      </div>

    </div>`;

  // Listener — detecta quando ambos estão prontos
  // Rastreado em _bnSalaListener para ser limpo por _bnPararSala() se necessário
  _bnPararSala();
  _bnSalaListener = _bnRtdb().ref(`batalhaNaval/salas/${salaId}`);
  _bnSalaListener.on('value', snap => {
    const s = snap.val();
    if(!s) return;
    if(s.status === 'em_jogo') {
      _bnPararSala();
      _bnPararTimerColocacao();
      _bnIniciarPartida(salaId, s);
    }
    if(s.status === 'finalizada') {
      _bnPararSala();
      _bnPararTimerColocacao();
      _bnRenderResultado(s, opWallet);
    }
    if(s.status === 'cancelada') {
      _bnPararSala();
      _bnPararTimerColocacao();
      _bnAtiva = false; _bnSalaId = null;
      addLog('Partida cancelada.', 'bad');
      _bnRenderLobby();
    }
  });

  _bnIniciarTimerColocacao(salaId, opWallet);
}

// ─── Timer de colocação (90s) ───────────────────────────────────────
function _bnIniciarTimerColocacao(salaId, opWallet) {
  _bnPararTimerColocacao();
  const TOTAL = 90;
  let seg = TOTAL;
  _bnTimerColocacao = setInterval(async () => {
    seg--;
    const bar   = document.getElementById('bnTimerColBar');
    const segEl = document.getElementById('bnTimerColSeg');
    if(bar) {
      const pct = (seg / TOTAL) * 100;
      bar.style.width = pct + '%';
      if(pct < 30)      bar.style.background = '#e74c3c';
      else if(pct < 60) bar.style.background = '#e8a030';
      else              bar.style.background = '#7ab87a';
    }
    if(segEl) {
      segEl.textContent = seg + 's';
      if(seg <= 10)      segEl.style.color = '#e74c3c';
      else if(seg <= 30) segEl.style.color = '#e8a030';
    }
    if(seg <= 0) {
      _bnPararTimerColocacao();
      _bnPararSala();
      addLog('Tempo esgotado! Oponente ganhou. ⏳', 'bad');
      showBubble('Tempo esgotado! ⏳');
      try {
        await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update({
          status:   'finalizada',
          abandono: walletAddress,
        });
      } catch(e) {}
      _bnBloquearUI(false);
      _bnSalaId = null; _bnOpWallet = null; _bnAtiva = false;
      try {
        const snap = await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).once('value');
        _bnRenderResultado(snap.val(), opWallet);
      } catch(e) { _bnRenderLobby(); }
    }
  }, 1000);
}

function _bnHtmlNavioInfo(salaId) {
  let info;
  if(_bnNavioAtual >= BN_NAVIOS.length) {
    info = '✅ Todos os navios posicionados!';
  } else {
    const n = BN_NAVIOS[_bnNavioAtual];
    info = `${n.icon} A colocar: <b>${n.nome}</b> (${n.tam} casas) · ${_bnNaviosColocados[n.id] ? '✅ Colocado' : 'Clica no tabuleiro'}`;
  }
  const desfazerBtn = _bnNavioAtual > 0
    ? ` <button onclick="bnDesfazerNavio('${salaId}')"
          style="margin-left:8px;font-family:'Cinzel',serif;font-size:6px;padding:2px 8px;
                 border:1px solid rgba(255,100,100,.3);border-radius:3px;
                 background:rgba(231,76,60,.08);color:#e74c3c;cursor:pointer;">↩ DESFAZER</button>`
    : '';
  return info + desfazerBtn;
}

function _bnHtmlNaviosLista() {
  return BN_NAVIOS.map((n, idx) => {
    const colocado  = !!_bnNaviosColocados[n.id];
    const isAtual   = idx === _bnNavioAtual && !colocado;
    const cor       = colocado ? '#7ab87a' : isAtual ? 'var(--gold)' : 'var(--muted)';
    const bgItem    = colocado ? 'rgba(122,184,122,.07)' : isAtual ? 'rgba(201,168,76,.07)' : 'transparent';
    const bdItem    = colocado ? 'rgba(122,184,122,.25)' : isAtual ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.06)';
    const cellCol   = colocado ? 'rgba(122,184,122,.55)' : isAtual ? 'rgba(201,168,76,.45)' : 'rgba(90,180,232,.2)';
    const cellBd    = colocado ? 'rgba(122,184,122,.7)'  : isAtual ? 'rgba(201,168,76,.65)'  : 'rgba(90,180,232,.35)';
    const shipCells = Array.from({length: n.tam}, (_, i) =>
      `<span style="display:inline-flex;align-items:center;justify-content:center;
                    width:13px;height:13px;font-size:8px;
                    background:${cellCol};border:1px solid ${cellBd};
                    border-radius:${i===0?'3px 0 0 3px':i===n.tam-1?'0 3px 3px 0':'0'};
                    margin-right:-1px;">${i===0?n.icon:''}</span>`
    ).join('');
    return `<div style="display:flex;align-items:center;gap:7px;padding:3px 6px;
                        border-radius:4px;margin-bottom:3px;
                        border:1px solid ${bdItem};background:${bgItem};">
      <div style="display:inline-flex;align-items:center;flex-shrink:0;">${shipCells}</div>
      <span style="font-family:'Cinzel',serif;font-size:6px;color:${cor};
                   ${isAtual?'font-weight:700;':''}flex:1;white-space:nowrap;
                   overflow:hidden;text-overflow:ellipsis;">${n.nome}</span>
      ${colocado ? '<span style="font-size:9px;flex-shrink:0;">✅</span>' : ''}
    </div>`;
  }).join('');
}

function _bnHtmlTabColocacao(salaId, cellSize) {
  const cell = cellSize || 22;
  let html = `<table style="border-collapse:collapse;">`;
  // Header colunas
  html += `<tr><td style="width:${cell}px;"></td>`;
  for(let c = 0; c < BN_TAMANHO; c++)
    html += `<td style="width:${cell}px;height:14px;text-align:center;font-family:'Cinzel',serif;font-size:6px;color:var(--muted);">${String.fromCharCode(65+c)}</td>`;
  html += `</tr>`;

  for(let r = 0; r < BN_TAMANHO; r++) {
    html += `<tr>`;
    html += `<td style="width:${cell}px;height:${cell}px;text-align:center;font-family:'Cinzel',serif;font-size:6px;color:var(--muted);">${r+1}</td>`;
    for(let c = 0; c < BN_TAMANHO; c++) {
      const cell_data = _bnMeuTabuleiro[r][c];
      let bg, border, content = '';
      if(cell_data) {
        const navio = BN_NAVIOS.find(n => n.id === cell_data);
        bg      = 'rgba(90,180,232,.2)';
        border  = '1px solid rgba(90,180,232,.5)';
        content = navio?.icon || '🚢';
      } else {
        bg     = 'rgba(255,255,255,.03)';
        border = '1px solid rgba(255,255,255,.08)';
      }
      // data-bnbg / data-bnborder guardam o estilo base para restaurar após preview
      html += `<td onclick="bnColocarNavio(${r},${c},'${salaId}')"
                   onmouseenter="bnPreviewNavio(${r},${c},'${salaId}')"
                   onmouseleave="bnLimparPreview()"
                   ontouchstart="bnPreviewNavio(${r},${c},'${salaId}')"
                   data-bnr="${r}" data-bnc="${c}"
                   data-bnbg="${bg}" data-bnborder="${border}"
                   ${cell_data ? 'data-bnship="1"' : ''}
                   style="width:${cell}px;height:${cell}px;text-align:center;
                          background:${bg};border:${border};cursor:pointer;
                          font-size:10px;transition:background .12s,border .12s;">${content}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;
  return html;
}

function _bnToggleOrientacao() {
  _bnOrientacao = _bnOrientacao === 'H' ? 'V' : 'H';
  const lbl = document.getElementById('bnOrientLabel');
  if(lbl) lbl.textContent = _bnOrientacao;
}

function bnPreviewNavio(r, c) {
  if(_bnNavioAtual >= BN_NAVIOS.length) return;
  const n      = BN_NAVIOS[_bnNavioAtual];
  const valido = _bnCasasValidas(r, c, n.tam, _bnOrientacao);
  _bnPreviewValido = !!valido;

  // Limpa preview anterior sem re-render
  document.querySelectorAll('#bnTabColocacao td[data-bnprev]').forEach(td => {
    td.style.background = td.dataset.bnbg || '';
    td.style.border     = td.dataset.bnborder || '';
    td.removeAttribute('data-bnprev');
  });

  const cells = valido ? valido : (() => {
    const raw = [];
    for(let i = 0; i < n.tam; i++) {
      const nr = _bnOrientacao === 'V' ? r + i : r;
      const nc = _bnOrientacao === 'H' ? c + i : c;
      if(nr < BN_TAMANHO && nc < BN_TAMANHO) raw.push([nr, nc]);
    }
    return raw;
  })();

  _bnPreview = cells;

  const bg     = valido ? 'rgba(122,184,122,.25)' : 'rgba(231,76,60,.2)';
  const border = valido ? '1px dashed rgba(122,184,122,.7)' : '1px dashed rgba(231,76,60,.6)';
  const table  = document.querySelector('#bnTabColocacao table');
  if(!table) return;
  cells.forEach(([pr, pc]) => {
    const row = table.rows[pr + 1];
    if(!row) return;
    const td = row.cells[pc + 1];
    if(!td || td.dataset.bnship) return;
    td.setAttribute('data-bnprev', '1');
    td.style.background = bg;
    td.style.border     = border;
  });
}

function bnLimparPreview() {
  document.querySelectorAll('#bnTabColocacao td[data-bnprev]').forEach(td => {
    td.style.background = td.dataset.bnbg || '';
    td.style.border     = td.dataset.bnborder || '';
    td.removeAttribute('data-bnprev');
  });
  _bnPreview       = [];
  _bnPreviewValido = true;
}

function bnColocarNavio(r, c, salaId) {
  if(_bnNavioAtual >= BN_NAVIOS.length) return;
  const n      = BN_NAVIOS[_bnNavioAtual];
  const casas  = _bnCasasValidas(r, c, n.tam, _bnOrientacao);
  if(!casas) { showBubble('Posição inválida! 🚫'); return; }

  // Coloca o navio
  casas.forEach(([nr, nc]) => { _bnMeuTabuleiro[nr][nc] = n.id; });
  _bnNaviosColocados[n.id] = casas;
  _bnNavioAtual++;
  _bnPreview       = [];
  _bnPreviewValido = true;

  // Atualiza UI
  const tab  = document.getElementById('bnTabColocacao');
  const info = document.getElementById('bnNavioInfo');
  const lista = document.getElementById('bnNaviosLista');
  if(tab)   tab.innerHTML   = _bnHtmlTabColocacao(salaId);
  if(info)  info.innerHTML  = _bnHtmlNavioInfo(salaId);
  if(lista) lista.innerHTML = _bnHtmlNaviosLista();

  // Todos colocados?
  if(_bnNavioAtual >= BN_NAVIOS.length) {
    const btn = document.getElementById('bnBtnConfirmar');
    if(btn) btn.style.display = 'block';
  }
}

function bnDesfazerNavio(salaId) {
  if(_bnNavioAtual === 0) return;
  _bnNavioAtual--;
  const n     = BN_NAVIOS[_bnNavioAtual];
  const casas = _bnNaviosColocados[n.id];
  if(casas) {
    casas.forEach(([r, c]) => { _bnMeuTabuleiro[r][c] = null; });
    delete _bnNaviosColocados[n.id];
  }
  _bnPreview       = [];
  _bnPreviewValido = true;
  const tab   = document.getElementById('bnTabColocacao');
  const info  = document.getElementById('bnNavioInfo');
  const lista = document.getElementById('bnNaviosLista');
  const btn   = document.getElementById('bnBtnConfirmar');
  if(tab)   tab.innerHTML   = _bnHtmlTabColocacao(salaId);
  if(info)  info.innerHTML  = _bnHtmlNavioInfo(salaId);
  if(lista) lista.innerHTML = _bnHtmlNaviosLista();
  if(btn)   btn.style.display = 'none';
}

async function bnConfirmarColocacao(salaId) {
  if(!_bnRtdb()) return;
  if(_bnNavioAtual < BN_NAVIOS.length) { showBubble('Coloca todos os navios primeiro!'); return; }
  _bnPararTimerColocacao();

  // Guarda o tabuleiro privado (com posições dos navios)
  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}/tabuleiros/${walletAddress}`).set(_bnSerTab(
    _bnMeuTabuleiro.map(row => row.map(cell => cell ? { navioId: cell, acertado: false } : null))
  ));
  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}/jogadores/${walletAddress}/pronto`).set(true);

  // Mostra aguardando
  const btn  = document.getElementById('bnBtnConfirmar');
  const ags  = document.getElementById('bnAguardandoOponente');
  if(btn) btn.style.display = 'none';
  if(ags) ags.style.display = 'flex';

  // Transaction atómica no contador de prontos — evita TOCTOU quando os dois confirmam ao mesmo tempo
  const countRef = _bnRtdb().ref(`batalhaNaval/salas/${salaId}/prontoCount`);
  const { committed, snapshot } = await countRef.transaction(n => (n || 0) + 1);
  if(committed && snapshot.val() >= 2) {
    await _bnRtdb().ref(`batalhaNaval/salas/${salaId}/status`).set('em_jogo');
  }
}

// ═══════════════════════════════════════════════════════════════════
// PARTIDA
// ═══════════════════════════════════════════════════════════════════

async function _bnIniciarPartida(salaId, sala) {
  _bnPararTimerColocacao();
  _bnOpWallet    = sala.criador === walletAddress ? sala.oponente : sala.criador;
  _bnSalaId      = salaId;
  _bnAtirando    = false; // reset em reconect
  _bnBloquearUI(true);

  // Reconect: carrega o tabuleiro privado do RTDB para mostrar os navios no painel de defesa
  if(!_bnMeuTabuleiro || _bnMeuTabuleiro.length === 0 || !_bnMeuTabuleiro[0]) {
    try {
      const tabSnap = await _bnRtdb().ref(`batalhaNaval/salas/${salaId}/tabuleiros/${walletAddress}`).once('value');
      const tabData = tabSnap.val();
      if(tabData) {
        const tab = _bnTabuleiroVazio();
        Object.entries(tabData).forEach(([key, val]) => {
          const [r, c] = key.split('_').map(Number);
          if(val?.navioId) tab[r][c] = val.navioId; // armazena só o id, igual à fase de colocação
        });
        _bnMeuTabuleiro = tab;
      }
    } catch(e) {}
  }

  if(_bnHeartbeatSala) clearInterval(_bnHeartbeatSala);
  _bnHeartbeatSala = setInterval(async () => {
    if(!_bnRtdb() || !_bnSalaId) return;
    try { await _bnRtdb().ref(`batalhaNaval/salas/${_bnSalaId}/presenca/${walletAddress}`).set('activo'); } catch(e) {}
  }, 10000);

  if(_bnRtdb() && _bnSalaId) {
    const presRef = _bnRtdb().ref(`batalhaNaval/salas/${_bnSalaId}/presenca/${walletAddress}`);
    presRef.onDisconnect().set('desconectado');
    presRef.set('activo');
  }

  _bnRenderPartida(salaId, sala, _bnOpWallet);
  if(sala.turno === walletAddress) _bnIniciarTimer(salaId, _bnOpWallet);
  _bnEscutarSala(salaId, _bnOpWallet);
}

function _bnRenderPartida(salaId, sala, opWallet) {
  const el = document.getElementById('batalhaNavalModal');
  if(!el || !sala) return;

  const meuTurno      = sala.turno === walletAddress;
  const op_info       = (sala.jogadores?.[opWallet]) || {};
  const tabPub        = sala.tabuleirosPublicos || {};
  const meuTabPub     = tabPub[walletAddress]  || {};
  const opTabPub      = tabPub[opWallet]        || {};
  const acertos       = sala.acertos || {};
  const meusAcertos   = acertos[walletAddress]  || 0;
  const opAcertos     = acertos[opWallet]        || 0;
  const ultimaJogada  = sala.ultimaJogada || null;

  const isPC = window.innerWidth > 600;

  const _timerHtml = meuTurno ? `
    <div style="flex-shrink:0;margin-bottom:2px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
        <span style="font-family:'Cinzel',serif;font-size:5px;color:var(--muted);">TEMPO</span>
        <span id="bnTimerSeg" style="font-family:'Cinzel',serif;font-size:6px;color:var(--gold);">${BN_TIMER_SEG}s</span>
      </div>
      <div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;">
        <div id="bnTimerBar" style="height:100%;background:#7ab87a;width:100%;transition:width 1s linear;border-radius:2px;"></div>
      </div>
    </div>` : '';

  const _ultimaHtml = ultimaJogada ? `
    <div style="flex-shrink:0;padding:4px 6px;border-radius:4px;font-size:6px;
                background:${ultimaJogada.acertou?'rgba(122,184,122,.08)':'rgba(90,180,232,.06)'};
                border:1px solid ${ultimaJogada.acertou?'rgba(122,184,122,.3)':'rgba(90,180,232,.2)'};
                color:${ultimaJogada.acertou?'#7ab87a':'#5ab4e8'};">
      ${ultimaJogada.jogador === walletAddress ? '🎯' : '💀'}
      <b>${String.fromCharCode(65 + ultimaJogada.col)}${ultimaJogada.row + 1}</b>
      ${ultimaJogada.acertou ? `💥${ultimaJogada.afundou ? ' 🔥 AFUNDADO!' : ' Acerto!'}` : '🌊 Água'}
    </div>` : '';

  el.innerHTML = isPC ? `
    <div style="display:flex;flex-direction:column;width:100%;max-width:680px;gap:10px;">

      <!-- Header: título + score + status + abandonar -->
      <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
        <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--gold);letter-spacing:2px;flex:1;">🚢 BATALHA NAVAL</div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span style="font-family:'Cinzel',serif;font-size:20px;font-weight:700;color:#7ab87a;">${meusAcertos}</span>
          <span style="font-size:9px;color:var(--muted);font-family:'Cinzel',serif;">VS</span>
          <span style="font-family:'Cinzel',serif;font-size:20px;font-weight:700;color:#e74c3c;">${opAcertos}</span>
        </div>
        <div style="font-family:'Cinzel',serif;font-size:9px;padding:5px 14px;border-radius:10px;flex-shrink:0;
          background:${meuTurno?'rgba(122,184,122,.15)':'rgba(255,255,255,.04)'};
          border:1px solid ${meuTurno?'#7ab87a':'rgba(255,255,255,.08)'};
          color:${meuTurno?'#7ab87a':'var(--muted)'};">
          ${meuTurno ? '⚡ SUA VEZ' : '⏳ AGUARDANDO'}
        </div>
        <button class="arena-btn-sair" style="font-size:7px;padding:5px 12px;flex-shrink:0;"
          onclick="bnAbandonar('${salaId}')">🏳️</button>
      </div>

      ${meuTurno ? `
      <div style="flex-shrink:0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;">TEMPO RESTANTE</span>
          <span id="bnTimerSeg" style="font-family:'Cinzel',serif;font-size:10px;color:var(--gold);">${BN_TIMER_SEG}s</span>
        </div>
        <div style="height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;">
          <div id="bnTimerBar" style="height:100%;background:#7ab87a;width:100%;transition:width 1s linear;border-radius:3px;"></div>
        </div>
      </div>` : ''}

      ${_ultimaHtml}

      <!-- 2-col: ataque | defesa -->
      <div style="display:flex;gap:20px;align-items:flex-start;">

        <!-- Esquerda: tabuleiro de ataque (30px cells) -->
        <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;">
          <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--muted);letter-spacing:1px;">
            ${meuTurno ? '🎯 CLICA PARA ATIRAR' : '🌊 OPONENTE'}
          </div>
          <div id="bnTabAtaque">${_bnHtmlTabAtaque(opTabPub, meuTurno, salaId, opWallet, 30)}</div>
        </div>

        <!-- Direita: tabuleiro de defesa (20px cells) -->
        <div style="flex-shrink:0;display:flex;flex-direction:column;gap:6px;">
          <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--muted);letter-spacing:1px;">🛡️ MEU TABULEIRO</div>
          ${_bnHtmlTabDefesa(meuTabPub, 20)}
        </div>

      </div>
    </div>` : `
    <div style="display:flex;flex-direction:column;height:100%;gap:4px;padding:6px;overflow-y:auto;">

      <div style="display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--gold);letter-spacing:1px;">🚢 BATALHA NAVAL</div>
        <div style="font-family:'Cinzel',serif;font-size:6px;padding:2px 7px;border-radius:10px;
          background:${meuTurno?'rgba(122,184,122,.15)':'rgba(255,255,255,.04)'};
          border:1px solid ${meuTurno?'#7ab87a':'rgba(255,255,255,.08)'};
          color:${meuTurno?'#7ab87a':'var(--muted)'};">
          ${meuTurno ? '⚡ SUA VEZ' : '⏳ AGUARDANDO'}
        </div>
      </div>

      ${_timerHtml}

      <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;
                  padding:5px 8px;background:rgba(255,255,255,.02);border-radius:6px;
                  border:1px solid rgba(255,255,255,.06);">
        <div style="flex:1;text-align:center;">
          <div style="font-size:6px;color:var(--muted);">EU</div>
          <div style="font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#7ab87a;">${meusAcertos}</div>
          <div style="font-size:5px;color:var(--muted);">/ ${BN_TOTAL_CASAS}</div>
        </div>
        <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--muted);">VS</div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:6px;color:var(--muted);">${op_info.nome||'Oponente'}</div>
          <div style="font-family:'Cinzel',serif;font-size:14px;font-weight:700;color:#e74c3c;">${opAcertos}</div>
          <div style="font-size:5px;color:var(--muted);">/ ${BN_TOTAL_CASAS}</div>
        </div>
      </div>

      ${_ultimaHtml}

      <div style="flex-shrink:0;">
        <div style="font-size:6px;color:var(--muted);letter-spacing:1px;margin-bottom:3px;">
          ${meuTurno ? '🎯 CLICA PARA ATIRAR' : '🌊 TABULEIRO DO OPONENTE'}
        </div>
        <div id="bnTabAtaque">${_bnHtmlTabAtaque(opTabPub, meuTurno, salaId, opWallet)}</div>
      </div>

      <div style="flex-shrink:0;">
        <div style="font-size:6px;color:var(--muted);letter-spacing:1px;margin-bottom:3px;">🛡️ MEU TABULEIRO</div>
        <div>${_bnHtmlTabDefesa(meuTabPub, 14)}</div>
      </div>

      <div style="flex-shrink:0;margin-top:4px;">
        <button class="arena-btn-sair" style="font-size:6px;padding:5px 10px;"
          onclick="bnAbandonar('${salaId}')">🏳️ ABANDONAR</button>
      </div>

    </div>`;
}

function _bnHtmlTabAtaque(tabPub, meuTurno, salaId, opWallet, cellSize) {
  const cell = cellSize || 20;
  let html = `<table style="border-collapse:collapse;">`;
  html += `<tr><td style="width:14px;"></td>`;
  for(let c = 0; c < BN_TAMANHO; c++)
    html += `<td style="width:${cell}px;height:14px;text-align:center;font-family:'Cinzel',serif;font-size:5.5px;color:var(--muted);">${String.fromCharCode(65+c)}</td>`;
  html += `</tr>`;

  for(let r = 0; r < BN_TAMANHO; r++) {
    html += `<tr>`;
    html += `<td style="width:14px;height:${cell}px;text-align:center;font-family:'Cinzel',serif;font-size:5.5px;color:var(--muted);">${r+1}</td>`;
    for(let c = 0; c < BN_TAMANHO; c++) {
      const key  = `${r}_${c}`;
      const casa = tabPub[key];
      let bg, border, content = '', cursor = 'default';

      if(casa === 'acerto') {
        bg = 'rgba(231,76,60,.2)'; border = '1px solid rgba(231,76,60,.5)'; content = '💥';
        if(meuTurno) cursor = 'not-allowed';
      } else if(casa === 'afundado') {
        bg = 'rgba(231,76,60,.35)'; border = '1px solid #e74c3c'; content = '🔥';
        if(meuTurno) cursor = 'not-allowed';
      } else if(casa === 'agua') {
        bg = 'rgba(90,180,232,.1)'; border = '1px solid rgba(90,180,232,.3)'; content = '🌊';
        if(meuTurno) cursor = 'not-allowed';
      } else if(meuTurno) {
        bg = 'rgba(255,255,255,.03)'; border = '1px solid rgba(255,255,255,.08)'; cursor = 'pointer';
      } else {
        bg = 'rgba(255,255,255,.02)'; border = '1px solid rgba(255,255,255,.05)';
      }

      const clickHandler = meuTurno
        ? (casa ? `showBubble('Já atacada! ⚡')` : `bnAtirar(${r},${c},'${salaId}','${opWallet}')`)
        : '';
      html += `<td onclick="${clickHandler}"
                   style="width:${cell}px;height:${cell}px;text-align:center;
                          background:${bg};border:${border};cursor:${cursor};
                          font-size:9px;transition:all .1s;
                          ${meuTurno && !casa ? 'onmouseover:this.style.background=\'rgba(201,168,76,.12)\'' : ''}"
                   ${meuTurno && !casa ? `onmouseover="this.style.background='rgba(201,168,76,.12)'" onmouseout="this.style.background='${bg}'"` : ''}>
                   ${content}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;
  return html;
}

function _bnHtmlTabDefesa(meuTabPub, cellSize) {
  const cell  = cellSize || 18;
  const fsize = cell <= 14 ? '4px' : '5px';
  const hdr   = cell <= 14 ? `${cell - 2}px` : '12px';
  const rowW  = cell <= 14 ? `${cell}px` : '13px';
  // Sobrepõe o meu tabuleiro privado com os acertos públicos
  let html = `<table style="border-collapse:collapse;">`;
  html += `<tr><td style="width:${rowW};"></td>`;
  for(let c = 0; c < BN_TAMANHO; c++)
    html += `<td style="width:${cell}px;height:${hdr};text-align:center;font-family:'Cinzel',serif;font-size:${fsize};color:var(--muted);">${String.fromCharCode(65+c)}</td>`;
  html += `</tr>`;

  for(let r = 0; r < BN_TAMANHO; r++) {
    html += `<tr>`;
    html += `<td style="width:${rowW};height:${cell}px;text-align:center;font-family:'Cinzel',serif;font-size:${fsize};color:var(--muted);">${r+1}</td>`;
    for(let c = 0; c < BN_TAMANHO; c++) {
      const key      = `${r}_${c}`;
      const pubCasa  = meuTabPub[key];
      const privCasa = _bnMeuTabuleiro[r]?.[c];
      let bg, border, content = '';

      if(pubCasa === 'acerto' || pubCasa === 'afundado') {
        bg = 'rgba(231,76,60,.25)'; border = '1px solid rgba(231,76,60,.5)'; content = pubCasa === 'afundado' ? '🔥' : '💥';
      } else if(pubCasa === 'agua') {
        bg = 'rgba(90,180,232,.08)'; border = '1px solid rgba(90,180,232,.2)'; content = '·';
      } else if(privCasa) {
        bg = 'rgba(90,180,232,.12)'; border = '1px solid rgba(90,180,232,.3)';
        const n = BN_NAVIOS.find(n => n.id === privCasa);
        content = n?.icon || '🚢';
      } else {
        bg = 'rgba(255,255,255,.02)'; border = '1px solid rgba(255,255,255,.04)';
      }

      html += `<td style="width:${cell}px;height:${cell}px;text-align:center;
                          background:${bg};border:${border};font-size:${cell <= 14 ? '7px' : '8px'};">${content}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;
  return html;
}

// ── Animação de navio afundado ──
function _bnMostrarAfundado(nomeNavio, euAfundei, callback) {
  const modal = document.getElementById('batalhaNavalModal');
  if(!modal) { callback?.(); return; }
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute;inset:0;z-index:90;
    background:rgba(4,3,10,.9);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:10px;border-radius:inherit;`;
  overlay.innerHTML = `
    <style>
      @keyframes bn-afund-pop{0%{transform:scale(0)}60%{transform:scale(1.25)}100%{transform:scale(1)}}
    </style>
    <div style="font-size:44px;animation:bn-afund-pop .5s cubic-bezier(.34,1.6,.64,1);">${euAfundei ? '🔥' : '💥'}</div>
    <div style="font-family:'Cinzel',serif;font-size:13px;font-weight:700;letter-spacing:2px;
                color:${euAfundei ? '#7ab87a' : '#e74c3c'};
                animation:bn-afund-pop .5s cubic-bezier(.34,1.6,.64,1) .06s both;">
      ${euAfundei ? 'NAVIO AFUNDADO!' : 'TEU NAVIO AFUNDADO!'}
    </div>
    <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);
                animation:bn-afund-pop .5s cubic-bezier(.34,1.6,.64,1) .12s both;">
      ${nomeNavio}
    </div>`;
  modal.style.position = 'relative';
  modal.appendChild(overlay);
  setTimeout(() => { overlay.remove(); callback?.(); }, 1800);
}

// ── Timer ──
function _bnIniciarTimer(salaId, opWallet) {
  _bnPararTimer();
  let seg = BN_TIMER_SEG;
  _bnTimerInt = setInterval(() => {
    seg--;
    const bar   = document.getElementById('bnTimerBar');
    const segEl = document.getElementById('bnTimerSeg');
    if(bar) {
      const pct = (seg/BN_TIMER_SEG)*100;
      bar.style.width = pct+'%';
      if(pct < 30)      bar.style.background = '#e74c3c';
      else if(pct < 60) bar.style.background = '#e8a030';
      else              bar.style.background = '#7ab87a';
    }
    if(segEl) {
      segEl.textContent = seg+'s';
      if(seg <= 10)      segEl.style.color = '#e74c3c';
      else if(seg <= 20) segEl.style.color = '#e8a030';
    }
    if(seg <= 0) {
      _bnPararTimer();
      // Atira numa casa aleatória não atacada
      _bnAtirarAleatorio(salaId, opWallet);
    }
  }, 1000);
}

async function _bnAtirarAleatorio(salaId, opWallet) {
  const snap   = await _bnRtdb().ref(`batalhaNaval/salas/${salaId}/tabuleirosPublicos/${opWallet}`).once('value');
  const tabPub = snap.val() || {};
  const livres = [];
  for(let r = 0; r < BN_TAMANHO; r++)
    for(let c = 0; c < BN_TAMANHO; c++)
      if(!tabPub[`${r}_${c}`]) livres.push([r, c]);
  if(livres.length === 0) return;
  const [r, c] = livres[Math.floor(Math.random() * livres.length)];
  await bnAtirar(r, c, salaId, opWallet);
}

// ── Listener da sala ──
function _bnEscutarSala(salaId, opWallet) {
  _bnPararSala();
  let _ultimoTs = 0;
  _bnSalaListener = _bnRtdb().ref(`batalhaNaval/salas/${salaId}`);

  _bnSalaListener.on('value', snap => {
    const s = snap.val();
    if(!s) return;

    if(s.status === 'finalizada') {
      _bnPararTimer();
      _bnSalaListener.off('value');
      _bnRenderResultado(s, opWallet);
      return;
    }

    // Detectar abandono
    if(s.status === 'em_jogo') {
      const presencaOp = s.presenca?.[opWallet];
      if(presencaOp === 'desconectado') {
        _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update({
          status:   'finalizada',
          abandono: opWallet,
        });
        return;
      }
    }

    if(s.status === 'em_jogo') {
      const ts = s.ultimaJogada?.ts || 0;
      if(ts !== _ultimoTs) {
        _ultimoTs = ts;
        _bnPararTimer();
        if(s.ultimaJogada?.afundou) {
          const euAfundei = s.ultimaJogada.jogador === walletAddress;
          _bnMostrarAfundado(s.ultimaJogada.afundou, euAfundei, () => {
            _bnRenderPartida(salaId, s, opWallet);
            if(s.turno === walletAddress) _bnIniciarTimer(salaId, opWallet);
          });
        } else {
          _bnRenderPartida(salaId, s, opWallet);
          if(s.turno === walletAddress) _bnIniciarTimer(salaId, opWallet);
        }
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// ATIRAR
// ═══════════════════════════════════════════════════════════════════

async function bnAtirar(row, col, salaId, opWallet) {
  if(!_bnRtdb() || _bnAtirando) return;
  _bnAtirando = true;
  _bnPararTimer();

  const snap = await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).once('value');
  const s    = snap.val();
  if(!s || s.turno !== walletAddress) { _bnAtirando = false; return; }

  // Verifica se casa já foi atacada
  const pubKey = `${row}_${col}`;
  if(s.tabuleirosPublicos?.[opWallet]?.[pubKey]) return;

  // Verifica no tabuleiro privado do oponente se há navio
  const tabOpPriv = _bnDesserTab(s.tabuleiros?.[opWallet]);
  const casaOp    = tabOpPriv[row][col];
  const acertou   = !!(casaOp && casaOp.navioId);
  let navioAfundado = null;

  const updates = {};
  updates[`tabuleirosPublicos/${opWallet}/${pubKey}`] = acertou ? 'acerto' : 'agua';

  if(acertou) {
    // Marca a casa como acertada no tabuleiro privado
    updates[`tabuleiros/${opWallet}/${pubKey}`] = { navioId: casaOp.navioId, acertado: true };
    updates[`acertos/${walletAddress}`]         = (s.acertos?.[walletAddress] || 0) + 1;

    // Verifica se afundou o navio inteiro
    const navioId = casaOp.navioId;
    const navio   = BN_NAVIOS.find(n => n.id === navioId);
    if(navio) {
      // Conta todas as casas deste navio no tabuleiro privado
      const tabAtualizado = _bnDesserTab(s.tabuleiros?.[opWallet]);
      tabAtualizado[row][col] = { navioId, acertado: true };
      let todasAcertadas = true;
      let casasNavio = 0;
      for(let r = 0; r < BN_TAMANHO; r++) {
        for(let c = 0; c < BN_TAMANHO; c++) {
          const casa = tabAtualizado[r][c];
          if(casa && casa.navioId === navioId) {
            casasNavio++;
            if(!casa.acertado) { todasAcertadas = false; break; }
          }
        }
        if(!todasAcertadas) break;
      }
      if(todasAcertadas && casasNavio === navio.tam) {
        navioAfundado = navio.nome;
        // Marca todas as casas do navio como afundadas no tabuleiro público
        for(let r = 0; r < BN_TAMANHO; r++)
          for(let c = 0; c < BN_TAMANHO; c++) {
            const casa = tabAtualizado[r][c];
            if(casa && casa.navioId === navioId)
              updates[`tabuleirosPublicos/${opWallet}/${r}_${c}`] = 'afundado';
          }
      }
    }
  }

  // Verifica fim de jogo
  const novosAcertos = (s.acertos?.[walletAddress] || 0) + (acertou ? 1 : 0);
  const fimDeJogo    = novosAcertos >= BN_TOTAL_CASAS;

  // Se acertou joga de novo, senão passa a vez
  updates['turno']  = acertou && !fimDeJogo ? walletAddress : opWallet;
  updates['status'] = fimDeJogo ? 'finalizada' : 'em_jogo';
  updates['vencedor'] = fimDeJogo ? walletAddress : null;
  updates['ultimaJogada'] = {
    jogador: walletAddress, row, col, acertou,
    afundou: navioAfundado || null,
    ts: Date.now(),
  };

  await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update(updates);
  _bnAtirando = false;

  const coord = `${String.fromCharCode(65+col)}${row+1}`;
  if(acertou) {
    showBubble(navioAfundado ? `${navioAfundado} afundado! 🔥` : 'Acerto! 💥 Joga de novo!');
    addLog(`Batalha Naval: 💥 Acerto em ${coord}${navioAfundado?' — '+navioAfundado+' afundado!':''}`, 'good');
  } else {
    addLog(`Batalha Naval: 🌊 Água em ${coord}`, 'info');
  }
}

// ═══════════════════════════════════════════════════════════════════
// ABANDONAR
// ═══════════════════════════════════════════════════════════════════

function bnAbandonar(salaId) {
  const modal = document.getElementById('batalhaNavalModal');
  if(!modal) return;
  const anterior = document.getElementById('bnAbandonarOverlay');
  if(anterior) anterior.remove();

  const overlay = document.createElement('div');
  overlay.id = 'bnAbandonarOverlay';
  overlay.style.cssText = `
    position:absolute;inset:0;z-index:99;
    background:rgba(4,3,10,.96);
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    gap:12px;padding:24px;border-radius:inherit;`;
  overlay.innerHTML = `
    <div style="font-size:32px;">🏳️</div>
    <div style="font-family:'Cinzel',serif;font-size:11px;font-weight:700;
                color:#e74c3c;letter-spacing:2px;">ABANDONAR?</div>
    <div style="font-size:7px;color:var(--muted);text-align:center;line-height:1.9;padding:0 10px;">
      O oponente ganhará a partida<br>e ficará com o prémio.
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;width:100%;">
      <button class="arena-btn-sair" style="flex:1;font-size:8px;"
        onclick="bnConfirmarAbandono('${salaId}')">🏳️ CONFIRMAR</button>
      <button class="arena-btn-entrar" style="flex:1;font-size:8px;"
        onclick="document.getElementById('bnAbandonarOverlay').remove()">← CONTINUAR</button>
    </div>`;
  modal.style.position = 'relative';
  modal.appendChild(overlay);
}

async function bnConfirmarAbandono(salaId) {
  if(!_bnRtdb()) return;
  _bnPararTimer();
  if(_bnHeartbeatSala) { clearInterval(_bnHeartbeatSala); _bnHeartbeatSala = null; }
  try { _bnRtdb().ref(`batalhaNaval/salas/${salaId}/presenca/${walletAddress}`).onDisconnect().cancel(); } catch(e) {}

  // Escreve abandono directamente → oponente ganha mesmo que esteja offline
  try {
    await _bnRtdb().ref(`batalhaNaval/salas/${salaId}`).update({
      status:   'finalizada',
      abandono: walletAddress,
    });
  } catch(e) {}

  const _fila = _bnRaridade();
  try { await _bnRtdb().ref(`batalhaNaval/lobby/${_fila}/${walletAddress}`).remove(); } catch(e) {}
  _bnBloquearUI(false);
  _bnSalaId = null; _bnOpWallet = null; _bnAtiva = false;
  addLog('Abandonaste a partida. 🏳️', 'bad');
  ModalManager.close('batalhaNavalModal');
}

// ═══════════════════════════════════════════════════════════════════
// RESULTADO
// ═══════════════════════════════════════════════════════════════════

async function _bnRenderResultado(sala, opWallet) {
  _bnPararTimer();
  _bnPararTimerColocacao();
  if(_bnHeartbeatSala) { clearInterval(_bnHeartbeatSala); _bnHeartbeatSala = null; }
  if(_bnRtdb() && sala.id && walletAddress) {
    try { _bnRtdb().ref(`batalhaNaval/salas/${sala.id}/presenca/${walletAddress}`).onDisconnect().cancel(); } catch(e) {}
  }
  _bnBloquearUI(false);
  _bnSalaId = null; _bnOpWallet = null;

  const el = document.getElementById('batalhaNavalModal');
  if(!el) return;

  const abandono  = sala.abandono === opWallet;
  const acertos   = sala.acertos || {};
  const euVenci   = abandono || sala.vencedor === walletAddress;
  const empate    = !abandono && sala.vencedor === 'empate';
  const op_info   = (sala.jogadores?.[opWallet]) || {};
  const aposta    = sala.aposta;
  const usaCris   = aposta.cristais > 0;
  const bruto     = usaCris ? aposta.cristais*2 : aposta.moedas*2;
  const moeda     = usaCris ? '💎' : '🪙';
  const meusAc    = acertos[walletAddress] || 0;
  const opAc      = acertos[opWallet]      || 0;

  await _bnAtualizarRanking(euVenci, empate);

  // Recompensas
  if(sala.criador === walletAddress && !sala.recompensaDistribuida) {
    await _bnRtdb().ref(`batalhaNaval/salas/${sala.id}/recompensaDistribuida`).set(true);
    if(euVenci)      _bnCreditarPremio(bruto, usaCris);
    else if(empate)  {
      if(usaCris) gs.cristais = (gs.cristais||0) + aposta.cristais;
      else        gs.moedas   = (gs.moedas  ||0) + aposta.moedas;
      updateResourceUI(); scheduleSave();
    }
    // Taxa para pool — só partidas com cristais (Raro/Lendário)
    const taxa = Math.floor(bruto * BN_TAXA);
    if(taxa > 0 && usaCris && typeof fbDb === 'function' && fbDb()) {
      try {
        await fbDb().collection('config').doc('pool').update({
          cristais: firebase.firestore.FieldValue.increment(taxa),
          totalEntrou: firebase.firestore.FieldValue.increment(taxa),
        });
      } catch(e) {}
    }
  } else if(sala.criador !== walletAddress) {
    if(euVenci)     _bnCreditarPremio(bruto, usaCris);
    else if(empate) {
      if(usaCris) gs.cristais = (gs.cristais||0) + aposta.cristais;
      else        gs.moedas   = (gs.moedas  ||0) + aposta.moedas;
      updateResourceUI(); scheduleSave();
    }
  }

  // XP e humor
  const rb    = rarityBonus();
  const d     = miniDifficulty();
  const xpGain = Math.round(d.xp * (euVenci ? 2.5 : 0.5) * rb.xp);
  xp += xpGain;
  vitals.humor = Math.min(100, vitals.humor + (euVenci ? 18 : 5));
  vinculo += euVenci ? 7 : 2;
  checkXP(); updateAllUI(); scheduleSave();

  // Remove do lobby — próprio e oponente (idempotente)
  const fila = _bnRaridade();
  try { await _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${walletAddress}`).remove(); } catch(e) {}
  try { await _bnRtdb().ref(`batalhaNaval/lobby/${fila}/${opWallet}`).remove(); } catch(e) {}
  _bnAtiva = false;

  // Limpeza da sala — ambos os jogadores tentam (Firebase ignora se já deletada)
  setTimeout(async () => {
    try { await _bnRtdb().ref(`batalhaNaval/salas/${sala.id}`).remove(); } catch(e) {}
  }, 10000);
  setTimeout(async () => {
    try { await _bnRtdb().ref(`batalhaNaval/notificacoes/${walletAddress}/${sala.id}`).remove(); } catch(e) {}
    try { await _bnRtdb().ref(`batalhaNaval/notificacoes/${opWallet}/${sala.id}`).remove(); } catch(e) {}
  }, 3000);

  const titulo = abandono ? '🏆 VITÓRIA! (abandono)' : empate ? '🤝 EMPATE!' : euVenci ? '🏆 VITÓRIA!' : '💀 DERROTA';
  const cor    = empate ? 'var(--gold)' : euVenci ? '#7ab87a' : '#e74c3c';

  addLog(`Batalha Naval: ${titulo} · ${meusAc} vs ${opAc} acertos`, euVenci ? 'good' : empate ? 'info' : 'bad');
  if(euVenci) showBubble(`Vitória! +${Math.floor(bruto - bruto*BN_TAXA)} ${moeda} 🏆`);

  el.innerHTML = `
    <div class="arena-resultado">
      <div class="arena-resultado-titulo" style="color:${cor};">${titulo}</div>

      <div class="arena-vs-row" style="margin:12px 0;">
        <div class="arena-vs-lado ${euVenci ? 'arena-vencedor' : ''}">
          <div class="arena-vs-svg">${gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 44, 44)}</div>
          <div class="arena-vs-nome">${avatar.nome.split(',')[0]}</div>
          <div class="arena-vs-pts" style="font-size:18px;">💥 ${meusAc}</div>
        </div>
        <div class="arena-vs-centro"><div class="arena-vs-label">VS</div></div>
        <div class="arena-vs-lado ${!euVenci && !empate ? 'arena-vencedor' : ''}">
          <div class="arena-vs-svg">${gerarSVG(op_info.elemento||'Fogo', op_info.raridade||'Comum', op_info.seed||0, 44, 44)}</div>
          <div class="arena-vs-nome">${op_info.nome || opWallet.slice(0,8)+'...'}</div>
          <div class="arena-vs-pts" style="font-size:18px;">💥 ${opAc}</div>
        </div>
      </div>

      <div class="arena-recompensa-card">
        ${euVenci
          ? `<div style="color:#7ab87a;font-family:'Cinzel',serif;font-size:9px;font-weight:700;">+${Math.floor(bruto - bruto*BN_TAXA)} ${moeda} · +${xpGain} XP</div>`
          : empate
            ? `<div style="color:var(--muted);font-size:7px;">Apostas devolvidas · +${xpGain} XP</div>`
            : `<div style="color:#e74c3c;font-size:7px;">Melhor sorte! · +${xpGain} XP</div>`}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:7px;" onclick="_bnRenderLobby()">🚢 JOGAR DE NOVO</button>
        <button class="arena-btn-sair" onclick="closeBatalhaNaval()">✕ FECHAR</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════════════════

const BN_PONTOS = { vitoria: 3, derrota: 1, empate: 1 };

async function _bnAtualizarRanking(euVenci, empate) {
  if(!_bnRtdb() || !walletAddress || !avatar) return;
  const fila = _bnRaridade();
  const ref  = _bnRtdb().ref(`batalhaNaval/ranking/${fila}/${walletAddress}`);
  const snap = await ref.once('value');
  const cur  = snap.val() || { pontos:0, vitorias:0, derrotas:0, empates:0 };
  const pts  = empate ? BN_PONTOS.empate : euVenci ? BN_PONTOS.vitoria : BN_PONTOS.derrota;
  await ref.set({
    nome:     avatar?.nome?.split(',')[0] || cur.nome || '',
    wallet:   walletAddress,
    pontos:   (cur.pontos  ||0) + pts,
    vitorias: (cur.vitorias||0) + (euVenci          ? 1 : 0),
    derrotas: (cur.derrotas||0) + (!euVenci&&!empate ? 1 : 0),
    empates:  (cur.empates ||0) + (empate            ? 1 : 0),
  });
}

async function _bnCarregarRanking() {
  const wrap = document.getElementById('bnRankingWrap');
  const pool = document.getElementById('bnPoolInfo');
  if(!wrap || !_bnRtdb()) return;
  const fila = _bnRaridade();
  const snap = await _bnRtdb().ref(`batalhaNaval/ranking/${fila}`)
    .orderByChild('pontos').limitToLast(10).once('value');
  const lista = Object.entries(snap.val()||{})
    .map(([k,d]) => d)
    .sort((a,b) => b.pontos - a.pontos);
  const medalhas = ['🥇','🥈','🥉'];
  wrap.innerHTML = lista.length === 0
    ? '<div class="arena-lobby-vazio">Nenhuma partida ainda.</div>'
    : lista.map((d,i) => `
        <div class="arena-rank-row ${(d.wallet||'').toLowerCase()===(walletAddress||'').toLowerCase()?'arena-rank-meu':''}">
          <span class="arena-rank-pos">${medalhas[i]||`#${i+1}`}</span>
          <span class="arena-rank-nome">${d.nome||(d.wallet||'').slice(0,10)+'...'}</span>
          <span class="arena-rank-pts">${d.pontos||0} pts</span>
          <span class="arena-rank-wl">${d.vitorias||0}V ${d.derrotas||0}D</span>
        </div>`).join('');
  try {
    if(typeof fbDb === 'function' && fbDb()) {
      const poolSnap = await fbDb().collection('config').doc('pool').get();
      const poolVal  = poolSnap.exists ? (poolSnap.data()?.cristais || 0) : 0;
      if(pool) pool.innerHTML = `
        <div class="arena-pool-card">
          <div class="arena-pool-titulo">💰 POOL SEMANAL</div>
          <div class="arena-pool-valor">${poolVal} 💎</div>
          <div class="arena-pool-sub">Distribuído toda segunda-feira · Reset automático</div>
        </div>`;
    }
  } catch(e) { if(pool) pool.innerHTML = ''; }
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICAÇÕES
// ═══════════════════════════════════════════════════════════════════

// Verifica se há partida activa para este wallet ao reconectar
async function _bnVerificarPartidaAtiva() {
  if(!_bnRtdb() || !walletAddress) return;

  try {
    const [snapC, snapO] = await Promise.all([
      _bnRtdb().ref('batalhaNaval/salas').orderByChild('criador').equalTo(walletAddress).once('value'),
      _bnRtdb().ref('batalhaNaval/salas').orderByChild('oponente').equalTo(walletAddress).once('value'),
    ]);

    let salaId = null, sala = null;
    const buscar = snap => snap.forEach(child => {
      const s = child.val();
      if(s && (s.status==='aguardando'||s.status==='colocacao'||s.status==='em_jogo') && !salaId) {
        salaId = child.key; sala = s;
      }
    });
    buscar(snapC); buscar(snapO);
    if(!salaId) return;

    console.log('[BN] Partida activa encontrada:', salaId, sala.status);
    _bnSalaId   = salaId;
    _bnAtiva    = true;
    _bnOpWallet = sala.criador===walletAddress ? sala.oponente : sala.criador;
    _bnBloquearUI(true);

    await new Promise(r => setTimeout(r, 1500));

    addLog('Reconectado à partida de Batalha Naval!', 'info');
    showBubble('Reconectado! 🚢');
    ModalManager.open('batalhaNavalModal');

    if(sala.status === 'aguardando') {
      if(sala.criador === walletAddress) {
        _bnRenderEspera(salaId);
      } else {
        _bnRenderDesafioPendente(sala);
      }
    } else if(sala.status === 'colocacao') {
      _bnRenderColocacao(salaId, sala);
    } else {
      _bnIniciarPartida(salaId, sala);
    }
  } catch(e) {
    console.warn('[BN] _bnVerificarPartidaAtiva erro:', e);
  }
}

function bnIniciarListenerNotificacoes() {
  if(!_bnRtdb() || !walletAddress) return;

  // Verificar se há partida em curso ao reconectar
  _bnVerificarPartidaAtiva();

  const notifRef = _bnRtdb().ref(`batalhaNaval/notificacoes/${walletAddress}`);
  notifRef.on('child_added', async snap => {
    const notif = snap.val();
    if(!notif || notif.lida) return;
    await snap.ref.update({ lida: true });
    const salaSnap = await _bnRtdb().ref(`batalhaNaval/salas/${notif.salaId}`).once('value');
    const sala = salaSnap.val();
    if(!sala || sala.status !== 'aguardando') return;
    showBubble('Desafio de Batalha Naval! 🚢');
    addLog(`Desafio de Batalha Naval recebido de ${(sala.criador||'').slice(0,8)}...`, 'info');
    const el = document.getElementById('batalhaNavalModal');
    if(el && el.classList.contains('open')) _bnRenderDesafioPendente(sala);
  });
}

function _bnRenderDesafioPendente(sala) {
  const el = document.getElementById('batalhaNavalModal');
  if(!el) return;
  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title">🚢 BATALHA NAVAL</div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;margin-top:16px;">DESAFIO RECEBIDO!</div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">De: ${(sala.criador||'').slice(0,10)}...</div>
      <div style="font-size:7px;color:var(--muted);margin-top:3px;">
        Aposta: ${sala.aposta?.cristais>0?sala.aposta.cristais+' 💎':sala.aposta?.moedas+' 🪙'}
      </div>
      <div style="display:flex;gap:8px;margin-top:20px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:8px;" onclick="bnAceitarDesafio('${sala.id}')">✅ ACEITAR</button>
        <button class="arena-btn-sair" onclick="bnRecusarDesafio('${sala.id}')">✕ RECUSAR</button>
      </div>
    </div>`;

  const salaRef = _bnRtdb().ref(`batalhaNaval/salas/${sala.id}/status`);
  salaRef.on('value', snap => {
    if(snap.val() === 'cancelada') {
      salaRef.off('value');
      addLog('Desafio cancelado pelo oponente.', 'bad');
      showBubble('Desafio cancelado! 😔');
      _bnRenderLobby();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

window.openBatalhaNaval             = openBatalhaNaval;
window.closeBatalhaNaval            = closeBatalhaNaval;
window.bnEntrarNoLobby              = bnEntrarNoLobby;
window.bnSairDoLobby                = bnSairDoLobby;
window.bnDesafiar                   = bnDesafiar;
window.bnCancelarDesafio            = bnCancelarDesafio;
window.bnAceitarDesafio             = bnAceitarDesafio;
window.bnRecusarDesafio             = bnRecusarDesafio;
window.bnAtirar                     = bnAtirar;
window.bnColocarNavio               = bnColocarNavio;
window.bnPreviewNavio               = bnPreviewNavio;
window.bnLimparPreview              = bnLimparPreview;
window.bnConfirmarColocacao         = bnConfirmarColocacao;
window.bnAbandonar                  = bnAbandonar;
window.bnConfirmarAbandono          = bnConfirmarAbandono;
window.bnShowTab                    = bnShowTab;
window.bnIniciarListenerNotificacoes = bnIniciarListenerNotificacoes;
window._bnVerificarPartidaAtiva     = _bnVerificarPartidaAtiva;
window._bnRenderLobby               = _bnRenderLobby;
window._bnToggleOrientacao          = _bnToggleOrientacao;
window.bnDesfazerNavio              = bnDesfazerNavio;

console.log('[BATALHA NAVAL] Módulo carregado.');
