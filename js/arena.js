// Guard: previne execução dupla se carregado duas vezes
if(typeof window._arenaLoaded !== 'undefined') {
  console.warn('[ARENA] arquivo carregado duas vezes — ignorando segunda carga.');
} else {
window._arenaLoaded = true;

// ═══════════════════════════════════════════════════════════════════
// ARENA DIMENSIONAL — Jo-Ken-Pô Multiplayer
// ═══════════════════════════════════════════════════════════════════



// ── Referência ao Realtime Database ──
function rtdb() { return typeof _rtdb !== 'undefined' ? _rtdb : null; }

// ── Constantes ──
var ARENA_TAXA        = 0.15;
var ARENA_TIMER_SEG   = 30;
var ARENA_MAX_RODADAS = 3;
// TTL generoso — 5 minutos — para não filtrar quem acabou de entrar
var ARENA_LOBBY_TTL   = 300000;

var ARENA_APOSTAS = {
  'Comum':    { moedas: 50,  cristais: 0  },
  'Raro':     { moedas: 0,   cristais: 10 },
  'Lendário': { moedas: 0,   cristais: 20 },
};
var ARENA_PONTOS  = { vitoria: 3, derrota: 1 };
var JKP_EMOJIS    = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
var JKP_OPCOES    = ['pedra', 'papel', 'tesoura'];
var JKP_VENCE     = { pedra: 'tesoura', tesoura: 'papel', papel: 'pedra' };

// ── Estado ──
var _arenaAtiva          = false;
var _arenaPartidaId      = null;
var _arenaLobbyRef       = null;   // ref do nó do jogador no lobby
var _arenaLobbyListRef   = null;   // ref da fila inteira (listener)
var _arenaHeartbeat         = null;
var _arenaTimerInterval     = null;
var _arenaEscolhaFeita      = false;
var _arenaPresencaHeartbeat = null;  // heartbeat de presença durante a partida
var _arenaPresencaRef       = null;  // ref RTDB para cancelar onDisconnect
var _arenaOpWallet          = null;  // wallet do oponente na partida activa

// ── Sanitiza wallet → chave RTDB válida ──
// O RTDB não aceita '.' '$' '#' '[' ']' '/' em chaves
function _wkey(w) {
  return (w || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════
function _getRaridade()  { return avatar?.raridade || 'Comum'; }
function _getFila()      { return _getRaridade(); }
function _getAposta()    { return ARENA_APOSTAS[_getRaridade()]; }
function _taxaPool(v)    { return Math.floor(v * ARENA_TAXA); }
function _premioLiquido(v){ return v - _taxaPool(v); }

function _podePagar() {
  const a = _getAposta();
  return a.cristais > 0 ? (gs.cristais||0) >= a.cristais : (gs.moedas||0) >= a.moedas;
}

function _descAposta() {
  const a = _getAposta();
  return a.cristais > 0 ? `${a.cristais} 💎` : `${a.moedas} 🪙`;
}

function _debitarAposta() {
  const a = _getAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) - a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) - a.moedas;
  updateResourceUI();
}

function _creditarPremio(bruto, cristais) {
  const v = _premioLiquido(bruto);
  if(cristais) gs.cristais = (gs.cristais||0) + v;
  else         gs.moedas   = (gs.moedas  ||0) + v;
  updateResourceUI();
  scheduleSave();
}

function _jkpRes(minha, dele) {
  if(minha === dele) return 'empate';
  return JKP_VENCE[minha] === dele ? 'vitoria' : 'derrota';
}

function _aleatorio() { return JKP_OPCOES[Math.floor(Math.random() * 3)]; }

function _pararTimer() {
  if(_arenaTimerInterval) { clearInterval(_arenaTimerInterval); _arenaTimerInterval = null; }
}

function _pararLobbyListener() {
  if(_arenaLobbyListRef) {
    _arenaLobbyListRef.off('value');
    _arenaLobbyListRef = null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ABRIR / FECHAR
// ═══════════════════════════════════════════════════════════════════

function openArena() {
  if(!hatched || dead || !avatar) { showBubble('Precisa de um avatar ativo!'); return; }
  if(sleeping || modoRepouso)     { showBubble('Descansando agora...'); return; }
  if(!rtdb())                     { showBubble('Arena indisponível'); return; }
  console.log('[ARENA] openArena — avatar:', avatar?.nome, 'raridade:', avatar?.raridade, 'rtdb ok:', !!rtdb());
  ModalManager.open('arenaModal');
  _renderLobby();
}

function closeArena() {
  _pararTimer();
  _pararLobbyListener();
  _pararSalaListener();
  if(_arenaHeartbeat) { clearInterval(_arenaHeartbeat); _arenaHeartbeat = null; }
  _arenaLimparPresenca();

  // Se há partida activa, escreve abandono directamente no RTDB → oponente ganha
  if(_arenaPartidaId && rtdb() && walletAddress) {
    try {
      rtdb().ref(`arena/salas/${_arenaPartidaId}`).update({
        status:   'finalizada',
        abandono: walletAddress,
        vencedor: _arenaOpWallet || null,
      });
    } catch(e) {}
    _arenaPartidaId = null;
  }
  _arenaOpWallet = null;

  ModalManager.close('arenaModal');
}

// ═══════════════════════════════════════════════════════════════════
// RENDER LOBBY
// ═══════════════════════════════════════════════════════════════════

function _renderLobby() {
  const el = document.getElementById('arenaModal');
  if(!el) return;

  const rar       = _getRaridade();
  const aposta    = _getAposta();
  const podePagar = _podePagar();
  const valorLiq  = aposta.cristais > 0
    ? `${_premioLiquido(aposta.cristais * 2)} 💎`
    : `${_premioLiquido(aposta.moedas   * 2)} 🪙`;

  el.innerHTML = `
    <button class="gs-x-btn" onclick="closeArena()">✕</button>

    <div class="arena-header">
      <div class="arena-title">⚔️ ARENA DIMENSIONAL</div>
      <div class="arena-sub">Jo-Ken-Pô ao vivo · Fila <b style="color:var(--gold)">${rar.toUpperCase()}</b></div>
    </div>

    <div class="arena-tabs">
      <button class="arena-tab active" id="tabLobby"   onclick="arenaShowTab('lobby')">🏟️ LOBBY</button>
      <button class="arena-tab"        id="tabRanking" onclick="arenaShowTab('ranking')">🏆 RANKING</button>
    </div>

    <!-- TAB LOBBY -->
    <div id="arenaTabLobby" class="arena-tab-content">

      <div class="arena-aposta-info">
        <span>Aposta: <b>${_descAposta()}</b></span>
        <span>Vencedor leva: <b>${valorLiq}</b></span>
        <span style="color:var(--muted);font-size:6px;">15% → pool do ranking</span>
      </div>

      <!-- Botões de ação — atualizados sem recriar o modal -->
      <div class="arena-lobby-actions" id="arenaLobbyActions">
        ${_htmlAcoes(podePagar)}
      </div>

      <div class="arena-lobby-titulo">Avatares na fila ${rar}</div>
      <div class="arena-lobby-lista" id="arenaLobbyLista">
        <div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>
      </div>
    </div>

    <!-- TAB RANKING -->
    <div id="arenaTabRanking" class="arena-tab-content" style="display:none;">
      <div class="arena-ranking-wrap" id="arenaRankingWrap">
        <div class="arena-lobby-vazio">Carregando...</div>
      </div>
      <div id="arenaPoolInfo"></div>
    </div>
  `;

  // Para listener anterior antes de criar novo
  _pararLobbyListener();
  // Inicia listener depois do HTML existir
  _iniciarLobbyListener();
  _carregarRanking();
}

function _htmlAcoes(podePagar) {
  if(_arenaAtiva) {
    return `
      <button class="arena-btn-sair" onclick="sairDoLobby()">⬅ SAIR DA FILA</button>
      <div class="arena-aguardando"><div class="arena-pulse"></div>Na fila — aguardando oponente...</div>`;
  }
  return `
    <button class="arena-btn-entrar ${!podePagar ? 'disabled' : ''}"
      onclick="${podePagar ? 'entrarNoLobby()' : ''}"
      ${!podePagar ? 'disabled' : ''}>
      ⚔️ ENTRAR NA FILA
    </button>
    ${!podePagar ? `<div class="arena-sem-saldo">Saldo insuficiente (${_descAposta()} necessário)</div>` : ''}`;
}

function _atualizarBotoesAcoes() {
  const wrap = document.getElementById('arenaLobbyActions');
  if(wrap) wrap.innerHTML = _htmlAcoes(_podePagar());
}

// ═══════════════════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════════════════

function arenaShowTab(tab) {
  document.getElementById('arenaTabLobby').style.display   = tab === 'lobby'   ? 'flex' : 'none';
  document.getElementById('arenaTabRanking').style.display = tab === 'ranking' ? 'flex' : 'none';
  document.getElementById('tabLobby').classList.toggle('active',   tab === 'lobby');
  document.getElementById('tabRanking').classList.toggle('active', tab === 'ranking');
}

// ═══════════════════════════════════════════════════════════════════
// LISTENER DO LOBBY — escuta a fila em tempo real
// ═══════════════════════════════════════════════════════════════════

function _iniciarLobbyListener() {
  if(!rtdb()) return;

  // Para qualquer listener anterior
  _pararLobbyListener();

  const fila = _getFila();
  _arenaLobbyListRef = rtdb().ref(`arena/lobby/${fila}`);

  _arenaLobbyListRef.on('value', snap => {
    const lista = document.getElementById('arenaLobbyLista');

    // Se o elemento não existe mais, o modal foi fechado — para o listener
    if(!lista) {
      _pararLobbyListener();
      return;
    }

    const dados = snap.val();

    if(!dados) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>';
      return;
    }

    const myKey = (walletAddress||'').toLowerCase();
    const agora = Date.now();

    // Limpeza server-side: remove entradas stale (heartbeat parou sem onDisconnect disparar)
    Object.entries(dados).forEach(([k, d]) => {
      if(d.ts && typeof d.ts === 'number' && (agora - d.ts) >= ARENA_LOBBY_TTL) {
        rtdb().ref(`arena/lobby/${fila}/${k}`).remove().catch(() => {});
      }
    });

    const avatares = Object.entries(dados).filter(([k, d]) => {
      const isMe      = k.toLowerCase() === myKey;
      const emPartida = d.emPartida === true;
      const tsOk      = !d.ts || typeof d.ts !== 'number' || (agora - d.ts) < ARENA_LOBBY_TTL;
      return !isMe && !emPartida && tsOk;
    });

    if(!avatares.length) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>';
      return;
    }

    lista.innerHTML = avatares.map(([k, d]) => `
      <div class="arena-lobby-card">
        <div class="arena-lobby-svg">${gerarSVG(d.elemento||'Fogo', d.raridade||'Comum', d.seed||0, 36, 36)}</div>
        <div class="arena-lobby-info">
          <div class="arena-lobby-nome">${d.nome || '???'}</div>
          <div class="arena-lobby-meta">NV ${d.nivel||1} · ${d.raridade||'Comum'} · Vínculo ${d.vinculo||0}</div>
        </div>
        ${_arenaAtiva
          ? `<button class="arena-btn-desafiar" onclick="desafiarJogador('${d.wallet}')">⚔️ DESAFIAR</button>`
          : `<div class="arena-lobby-aguarda">Entre na fila para desafiar</div>`}
      </div>
    `).join('');
  });
}

// ═══════════════════════════════════════════════════════════════════
// ENTRAR / SAIR DO LOBBY
// ═══════════════════════════════════════════════════════════════════

async function entrarNoLobby() {
  if(!rtdb() || !walletAddress || !avatar) return;
  if(!_podePagar()) { showBubble('Saldo insuficiente!'); return; }

  const fila = _getFila();
  _arenaLobbyRef = rtdb().ref(`arena/lobby/${fila}/${walletAddress}`);

  await _arenaLobbyRef.set({
    wallet:    walletAddress,
    nome:      avatar.nome.split(',')[0],
    raridade:  avatar.raridade,
    elemento:  avatar.elemento,
    nivel:     nivel   || 1,
    vinculo:   Math.floor(vinculo || 0),
    seed:      avatar.seed || 0,
    ts:        firebase.database.ServerValue.TIMESTAMP,
    emPartida: false,
  });

  // Remove automaticamente ao desconectar
  _arenaLobbyRef.onDisconnect().remove();

  // Heartbeat a cada 10s para manter presença
  if(_arenaHeartbeat) clearInterval(_arenaHeartbeat);
  _arenaHeartbeat = setInterval(() => {
    if(_arenaLobbyRef) _arenaLobbyRef.update({ ts: firebase.database.ServerValue.TIMESTAMP });
  }, 10000);

  _arenaAtiva = true;
  addLog('Entrou na fila da Arena! ⚔️', 'info');
  _atualizarBotoesAcoes();
}

async function sairDoLobby() {
  // Remove do lobby
  if(_arenaLobbyRef) {
    try { await _arenaLobbyRef.remove(); } catch(e){}
    _arenaLobbyRef = null;
  }
  // Para heartbeat
  if(_arenaHeartbeat) { clearInterval(_arenaHeartbeat); _arenaHeartbeat = null; }

  _arenaAtiva = false;
  addLog('Saiu da fila da Arena.', 'info');
  _atualizarBotoesAcoes();
  // Não para o listener — continua vendo outros avatares na fila
}

// ═══════════════════════════════════════════════════════════════════
// DESAFIAR
// ═══════════════════════════════════════════════════════════════════

async function desafiarJogador(walletOponente) {
  if(!_arenaAtiva || !rtdb()) return;

  const aposta = _getAposta();
  const fila   = _getFila();
  const salaId = `sala_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

  const sala = {
    id:       salaId,
    fila,
    status:   'aguardando',
    criador:  walletAddress,
    oponente: walletOponente,
    aposta,
    jogadores: {
      [walletAddress]: {
        wallet:   walletAddress,
        nome:     avatar.nome.split(',')[0],
        raridade: avatar.raridade,
        elemento: avatar.elemento,
        seed:     avatar.seed || 0,
        nivel:    nivel  || 1,
        escolha:  null,
        pronto:   false,
      },
      [walletOponente]: {
        wallet:   walletOponente,
        nome:     null,
        raridade: null,
        elemento: null,
        seed:     0,
        nivel:    1,
        escolha:  null,
        pronto:   false,
      },
    },
    rodada:     1,
    placar:     { [walletAddress]: 0, [walletOponente]: 0 },
    criadoEm:   firebase.database.ServerValue.TIMESTAMP,
    taxaPool:   aposta.cristais > 0
      ? _taxaPool(aposta.cristais * 2)
      : _taxaPool(aposta.moedas  * 2),
    recompensaDistribuida: false,
  };

  // Marca oponente como emPartida de forma atómica — evita que dois jogadores
  // desafiem o mesmo oponente simultaneamente (race condition TOCTOU)
  const opEmPartidaRef = rtdb().ref(`arena/lobby/${fila}/${walletOponente}/emPartida`);
  const { committed } = await opEmPartidaRef.transaction(current => {
    if(current === true) return; // undefined → aborta a transaction
    return true;
  });
  if(!committed) {
    showBubble('Oponente já entrou em outra partida!');
    return;
  }

  await rtdb().ref(`arena/salas/${salaId}`).set(sala);

  // Marca o criador como emPartida (oponente já foi marcado pela transaction)
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(true);

  // Para o heartbeat e o listener do lobby — não precisa mais
  if(_arenaHeartbeat) { clearInterval(_arenaHeartbeat); _arenaHeartbeat = null; }
  _pararLobbyListener();

  // Envia notificação direta ao oponente
  await rtdb().ref(`arena/notificacoes/${walletOponente}/desafios/${salaId}`).set({
    salaId,
    criador: walletAddress,
    fila,
    lida: false,
    ts: firebase.database.ServerValue.TIMESTAMP,
  });

  _debitarAposta();
  _arenaPartidaId = salaId;
  addLog(`Desafio enviado para ${walletOponente.slice(0,8)}...`, 'info');
  showBubble('Desafio enviado! ⚔️');
  _renderSalaEspera(salaId);
}

async function cancelarDesafio(salaId) {
  if(!rtdb()) return;
  await rtdb().ref(`arena/salas/${salaId}`).update({ status: 'cancelada' });
  const fila = _getFila();
  try { await rtdb().ref(`arena/lobby/${fila}/${walletAddress}`).remove(); } catch(e){}
  // Devolve aposta
  const a = _getAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
  updateResourceUI();
  // Limpa sala e notificações após 3s
  setTimeout(async () => {
    try {
      await rtdb().ref(`arena/salas/${salaId}`).remove();
      const notifSnap = await rtdb().ref(`arena/notificacoes`).once('value');
      const todos = notifSnap.val() || {};
      await Promise.all(Object.keys(todos).map(wallet =>
        rtdb().ref(`arena/notificacoes/${wallet}/desafios/${salaId}`).remove()
      ));
    } catch(e){}
  }, 3000);
  _arenaAtiva    = false;
  _arenaPartidaId = null;
  _renderLobby();
}

// ═══════════════════════════════════════════════════════════════════
// SALA DE ESPERA
// ═══════════════════════════════════════════════════════════════════

function _renderSalaEspera(salaId) {
  const el = document.getElementById('arenaModal');
  if(!el) return;
  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title">⚔️ ARENA DIMENSIONAL</div>
      <div class="arena-pulse" style="margin:16px auto;"></div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;">DESAFIO ENVIADO</div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">Aguardando o oponente aceitar...</div>
      <div style="font-size:6px;color:var(--muted);margin-top:3px;">Sala #${salaId.slice(-6).toUpperCase()}</div>
      <button class="arena-btn-sair" style="margin-top:18px;" onclick="cancelarDesafio('${salaId}')">✕ CANCELAR</button>
    </div>
  `;

  // Listener da sala
  const salaRef = rtdb().ref(`arena/salas/${salaId}`);
  salaRef.on('value', snap => {
    const s = snap.val();
    if(!s) return;
    if(s.status === 'em_jogo') {
      salaRef.off('value');
      _renderPartida(salaId, s);
    }
    if(s.status === 'cancelada' || s.status === 'recusada') {
      salaRef.off('value');
      const a = _getAposta();
      if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
      else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
      updateResourceUI();
      _arenaAtiva     = false;
      _arenaPartidaId = null;
      addLog('Desafio cancelado ou recusado.', 'bad');
      _renderLobby();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// ACEITAR / RECUSAR DESAFIO
// ═══════════════════════════════════════════════════════════════════

async function aceitarDesafio(salaId) {
  if(!rtdb() || !walletAddress || !avatar) return;
  if(!_podePagar()) { showBubble('Saldo insuficiente para aceitar!'); return; }

  // Verifica se a sala ainda está aguardando antes de debitar
  const snapCheck = await rtdb().ref(`arena/salas/${salaId}/status`).once('value');
  if(snapCheck.val() !== 'aguardando') {
    addLog('Desafio já foi cancelado ou expirou.', 'bad');
    showBubble('Desafio não disponível!');
    _renderLobby();
    return;
  }

  _debitarAposta();
  _arenaPartidaId = salaId;

  await rtdb().ref(`arena/salas/${salaId}`).update({
    status: 'em_jogo',
    [`jogadores/${walletAddress}/nome`]:     avatar.nome.split(',')[0],
    [`jogadores/${walletAddress}/raridade`]: avatar.raridade,
    [`jogadores/${walletAddress}/elemento`]: avatar.elemento,
    [`jogadores/${walletAddress}/seed`]:     avatar.seed || 0,
    [`jogadores/${walletAddress}/nivel`]:    nivel || 1,
  });

  const fila = _getFila();
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(true);

  const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
  _renderPartida(salaId, snap.val());
}

async function recusarDesafio(salaId) {
  if(!rtdb()) return;
  await rtdb().ref(`arena/salas/${salaId}`).update({ status: 'recusada' });
  // Limpa após 3s
  setTimeout(async () => {
    try { await rtdb().ref(`arena/salas/${salaId}`).remove(); } catch(e){}
    try { await rtdb().ref(`arena/notificacoes/${walletAddress}/desafios/${salaId}`).remove(); } catch(e){}
  }, 3000);
  addLog('Desafio recusado.', 'info');
  _renderLobby();
}

// ═══════════════════════════════════════════════════════════════════
// TELA DA PARTIDA — sistema de turnos
// Turno 1: criador escolhe | Turno 2: oponente escolhe
// ═══════════════════════════════════════════════════════════════════

function _renderPartida(salaId, sala) {
  _pararTimer();
  _arenaEscolhaFeita = false;

  const el = document.getElementById('arenaModal');
  if(!el) return;

  const meu          = sala.jogadores[walletAddress] || {};
  const opWallet     = walletAddress === sala.criador ? sala.oponente : sala.criador;
  _arenaOpWallet = opWallet;
  _arenaIniciarPresenca(salaId);
  const op           = sala.jogadores[opWallet] || {};
  const placar       = sala.placar || {};
  const rodada       = sala.rodada || 1;
  const aposta       = sala.aposta;
  const usaCris      = aposta.cristais > 0;
  const bruto        = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;
  const euSouCriador = walletAddress === sala.criador;
  const turno        = sala.turno || 1;
  const minhaTurno   = (euSouCriador && turno === 1) || (!euSouCriador && turno === 2);

  function _pv(n) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 2 - n)); }

  el.innerHTML = `
    <div class="arena-partida">
      <div class="arena-partida-header">
        <div class="arena-rodada-badge">RODADA ${rodada} <span style="color:var(--muted)">/ ${ARENA_MAX_RODADAS}</span></div>
        <div class="arena-premio-badge">💰 ${_premioLiquido(bruto)} ${usaCris?'💎':'🪙'}</div>
      </div>

      <div class="arena-vs-row">
        <div class="arena-vs-lado" id="vsEu">
          <div class="arena-vs-svg">${gerarSVG(meu.elemento||'Fogo', meu.raridade||'Comum', meu.seed||0, 38, 38)}</div>
          <div class="arena-vs-nome">${meu.nome||'Você'}</div>
          <div class="arena-vs-stars" id="starsEu">${_pv(placar[walletAddress]||0)}</div>
          <div class="arena-vs-escolha" id="escolhaEu">❓</div>
        </div>

        <div class="arena-vs-centro">
          <div class="arena-vs-label">VS</div>
          <div class="arena-turno-wrap">
            <div class="arena-turno-bar" id="arenaTurnoBar" style="width:${minhaTurno?'100%':'0%'}"></div>
          </div>
          <div class="arena-turno-label" id="arenaTurnoLabel">${minhaTurno?'SUA VEZ':'AGUARDE'}</div>
        </div>

        <div class="arena-vs-lado" id="vsOp">
          <div class="arena-vs-svg">${gerarSVG(op.elemento||'Fogo', op.raridade||'Comum', op.seed||0, 38, 38)}</div>
          <div class="arena-vs-nome">${op.nome||opWallet.slice(0,8)+'...'}</div>
          <div class="arena-vs-stars" id="starsOp">${_pv(placar[opWallet]||0)}</div>
          <div class="arena-vs-escolha" id="escolhaOp">❓</div>
        </div>
      </div>

      <div class="arena-partida-status" id="arenaStatus">
        ${minhaTurno ? '⚔️ Escolha sua jogada!' : '⏳ Aguardando oponente...'}
      </div>

      <div class="arena-escolhas" id="arenaEscolhas">
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','pedra')"   ${!minhaTurno?'disabled':''}>🪨<span>PEDRA</span></button>
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','papel')"   ${!minhaTurno?'disabled':''}>📄<span>PAPEL</span></button>
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','tesoura')" ${!minhaTurno?'disabled':''}>✂️<span>TESOURA</span></button>
      </div>

      <div class="arena-round-banner" id="arenaRoundBanner" style="display:none;"></div>
    </div>
  `;

  if(minhaTurno) _iniciarBarraTurno(salaId, opWallet);
  _escutarSala(salaId, opWallet);
}

// ── Barra de progresso do turno ──
function _iniciarBarraTurno(salaId, opWallet) {
  const bar   = document.getElementById('arenaTurnoBar');
  const label = document.getElementById('arenaTurnoLabel');
  if(!bar) return;

  let pct = 100;
  bar.style.transition  = 'none';
  bar.style.width       = '100%';
  bar.style.background  = 'var(--gold)';

  _arenaTimerInterval = setInterval(() => {
    pct -= (100 / ARENA_TIMER_SEG);
    if(pct < 0) pct = 0;
    const cor = pct > 50 ? 'var(--gold)' : pct > 25 ? '#e8a030' : '#e74c3c';
    bar.style.width      = pct + '%';
    bar.style.background = cor;
    bar.style.transition = 'width 1s linear, background .3s';
    if(label) label.style.color = cor;
    if(pct <= 0) {
      _pararTimer();
      if(!_arenaEscolhaFeita) fazerEscolha(salaId, _aleatorio());
    }
  }, 1000);
}

// ── Listener central ──
let _arenaAnimando  = false;
let _arenaSalaRef   = null; // ref global para poder desligar o listener da sala

function _pararSalaListener() {
  if(_arenaSalaRef) {
    _arenaSalaRef.off('value');
    _arenaSalaRef = null;
  }
}

function _arenaIniciarPresenca(salaId) {
  if(_arenaPresencaHeartbeat) return; // já activo — evita duplicar no re-render de round
  if(!rtdb() || !walletAddress) return;
  _arenaPresencaRef = rtdb().ref(`arena/salas/${salaId}/presenca/${walletAddress}`);
  _arenaPresencaRef.onDisconnect().set('desconectado');
  _arenaPresencaRef.set('activo');
  _arenaPresencaHeartbeat = setInterval(() => {
    if(_arenaPresencaRef) try { _arenaPresencaRef.set('activo'); } catch(e) {}
  }, 10000);
}

function _arenaLimparPresenca() {
  if(_arenaPresencaHeartbeat) { clearInterval(_arenaPresencaHeartbeat); _arenaPresencaHeartbeat = null; }
  if(_arenaPresencaRef) {
    try { _arenaPresencaRef.onDisconnect().cancel(); } catch(e) {}
    _arenaPresencaRef = null;
  }
}

function _escutarSala(salaId, opWallet) {
  _arenaAnimando = false;
  _pararSalaListener();

  let _turnoAnterior  = null;
  let _primeiroDisparo = true; // ignora roundResult no estado inicial
  _arenaSalaRef = rtdb().ref(`arena/salas/${salaId}`);

  _arenaSalaRef.on('value', snap => {
    const s = snap.val();
    if(!s || _arenaAnimando) return;

    // Detectar abandono por desconexão do oponente
    if(s.status === 'em_jogo' && s.presenca?.[opWallet] === 'desconectado') {
      console.log('[ARENA] Oponente desconectou — declarando abandono');
      rtdb().ref(`arena/salas/${salaId}`).update({
        status:   'finalizada',
        abandono: opWallet,
        vencedor: walletAddress,
      });
      return;
    }

    const euSouCriador = walletAddress === s.criador;
    const turno        = s.turno || 1;

    // Turno mudou → atualiza UI
    if(turno !== _turnoAnterior) {
      _turnoAnterior = turno;
      if(turno === 2 && !euSouCriador) {
        const st = document.getElementById('arenaStatus');
        if(st) st.textContent = '⚔️ Escolha sua jogada!';
        document.querySelectorAll('.arena-escolha-btn').forEach(b => b.disabled = false);
        const label = document.getElementById('arenaTurnoLabel');
        if(label) { label.textContent = 'SUA VEZ'; label.style.color = 'var(--gold)'; }
        _pararTimer();
        _iniciarBarraTurno(salaId, opWallet);
      }
    }

    // No primeiro disparo: processa turno mas ignora roundResult residual
    if(_primeiroDisparo) {
      _primeiroDisparo = false;
      return; // não anima com dados do estado inicial
    }

    // Oponente marcou pronto → mostra ✅ no lado dele antes da revelação
    const opPronto = s.jogadores?.[opWallet]?.pronto;
    if(opPronto) {
      const opEl = document.getElementById('escolhaOp');
      if(opEl && opEl.textContent === '❓') opEl.textContent = '✅';
    }

    // roundResult gravado após o listener ser criado → animar
    if(s.roundResult && !_arenaAnimando) {
      _arenaAnimando = true;
      _pararSalaListener();
      _pararTimer();
      _animarRevelacao(salaId, s, opWallet);
      return;
    }

    // finalizada sem roundResult = reconexão
    if(s.status === 'finalizada' && !s.roundResult) {
      _arenaAnimando = true;
      _pararSalaListener();
      _pararTimer();
      _renderResultado(s, opWallet);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// FAZER ESCOLHA
// ═══════════════════════════════════════════════════════════════════

async function fazerEscolha(salaId, escolha) {
  if(_arenaEscolhaFeita || !rtdb()) return;
  _arenaEscolhaFeita = true;
  _pararTimer();

  // Efeito visual no botão escolhido
  document.querySelectorAll('.arena-escolha-btn').forEach(b => {
    if(b.textContent.includes(JKP_EMOJIS[escolha])) {
      b.classList.add('pop');
      b.style.background  = 'rgba(201,168,76,.2)';
      b.style.borderColor = 'var(--gold)';
      b.style.boxShadow   = '0 0 18px rgba(201,168,76,.4)';
    }
  });

  document.querySelectorAll('.arena-escolha-btn').forEach(b => b.disabled = true);

  // Grava escolha no RTDB
  await rtdb().ref(`arena/salas/${salaId}/jogadores/${walletAddress}`).update({
    escolha, pronto: true,
  });

  const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
  const s    = snap.val();
  if(!s) return;

  const euSouCriador = walletAddress === s.criador;
  const st   = document.getElementById('arenaStatus');
  const euEl = document.getElementById('escolhaEu');
  const opEl = document.getElementById('escolhaOp');
  const bar  = document.getElementById('arenaTurnoBar');
  const lbl  = document.getElementById('arenaTurnoLabel');

  if(euSouCriador) {
    // ── Turno 1: criador escolheu ──
    // Atualiza só o meu lado (escolhaEu = meu lado quando sou criador)
    if(euEl) euEl.textContent = '✅';
    if(st)   st.textContent   = '⏳ Aguardando oponente...';
    // Para barra e mostra neutra
    if(bar) { bar.style.transition = 'none'; bar.style.width = '100%'; bar.style.background = 'rgba(255,255,255,.08)'; }
    if(lbl) { lbl.textContent = 'AGUARDE'; lbl.style.color = 'var(--muted)'; }
    // Avança turno para 2
    await rtdb().ref(`arena/salas/${salaId}`).update({ turno: 2 });

  } else {
    // ── Turno 2: oponente escolheu ──
    if(opEl) opEl.textContent = '✅';
    if(st)   st.textContent   = '⚡ Calculando resultado...';
    if(bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
    if(lbl)   lbl.textContent = '';

    const escolhaCriador = s.jogadores[s.criador]?.escolha;
    if(escolhaCriador) {
      await _gravarRoundResult(salaId, s, escolhaCriador, escolha, s.criador, s.oponente);
      // NÃO chama _animarRevelacao aqui — o _escutarSala de AMBOS os lados
      // vai detectar o roundResult e chamar a animação de forma sincronizada
    }
  }
}

// Grava roundResult — chamado APENAS pelo oponente (turno 2)
async function _gravarRoundResult(salaId, sala, escolhaCriador, escolhaOponente, criador, opWallet) {
  const res = _jkpRes(escolhaCriador, escolhaOponente);
  const p   = { ...(sala.placar||{}) };

  if(res === 'vitoria')  p[criador]   = (p[criador]  ||0) + 1;
  if(res === 'derrota')  p[opWallet]  = (p[opWallet] ||0) + 1;

  const novaRodada = (sala.rodada||1) + 1;
  const fim = p[criador] >= 2 || p[opWallet] >= 2 || novaRodada > ARENA_MAX_RODADAS;
  let vencedor = null;
  if(fim) {
    if     (p[criador]  > p[opWallet]) vencedor = criador;
    else if(p[opWallet] > p[criador])  vencedor = opWallet;
    else                                vencedor = 'empate';
  }

  await rtdb().ref(`arena/salas/${salaId}`).update({
    roundResult: { escolhaCriador, escolhaOponente, resultado: res, placarAtualizado: p, fim, vencedor },
    placar:   p,
    rodada:   novaRodada,
    turno:    1,
    status:   fim ? 'finalizada' : 'em_jogo',
    vencedor: vencedor || null,
  });
}


// ═══════════════════════════════════════════════════════════════════
// ANIMAÇÃO DE REVELAÇÃO — roda nos dois lados simultaneamente
// ═══════════════════════════════════════════════════════════════════

async function _animarRevelacao(salaId, sala, opWallet) {
  const rr           = sala.roundResult;
  const euSouCriador = sala.criador === walletAddress;
  const inv          = { vitoria:'derrota', derrota:'vitoria', empate:'empate' };
  const res          = euSouCriador ? rr.resultado : inv[rr.resultado];
  const minhaEscolha = euSouCriador ? rr.escolhaCriador  : rr.escolhaOponente;
  const opEscolha    = euSouCriador ? rr.escolhaOponente : rr.escolhaCriador;

  const st     = document.getElementById('arenaStatus');
  const eEu    = document.getElementById('escolhaEu');
  const eOp    = document.getElementById('escolhaOp');
  const vsEu   = document.getElementById('vsEu');
  const vsOp   = document.getElementById('vsOp');
  const banner = document.getElementById('arenaRoundBanner');
  const se     = document.getElementById('starsEu');
  const so     = document.getElementById('starsOp');
  const bar    = document.getElementById('arenaTurnoBar');
  const lbl    = document.getElementById('arenaTurnoLabel');

  // Para barra de progresso
  if(bar) { bar.style.transition = 'none'; bar.style.width = '0%'; }
  if(lbl) lbl.textContent = '';

  // ── Fase 1: revela as escolhas dos dois ──
  if(st) { st.textContent = '⚡ Revelando...'; st.className = 'arena-partida-status arena-countdown'; }
  await _sleep(400);

  if(eEu) { eEu.textContent = JKP_EMOJIS[minhaEscolha]; eEu.classList.add('pop'); }
  await _sleep(300);
  if(eOp) { eOp.textContent = JKP_EMOJIS[opEscolha];    eOp.classList.add('pop'); }
  await _sleep(500);

  // ── Fase 2: destaca vencedor/perdedor ──
  if(res === 'vitoria') {
    vsEu?.classList.add('arena-vencedor');
    vsOp?.classList.add('arena-perdedor');
  } else if(res === 'derrota') {
    vsOp?.classList.add('arena-vencedor');
    vsEu?.classList.add('arena-perdedor');
  } else {
    vsEu?.classList.add('arena-empate');
    vsOp?.classList.add('arena-empate');
  }
  await _sleep(400);

  // ── Fase 3: adiciona estrela ao vencedor da rodada ──
  function _pv(n) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 2-n)); }
  const p = rr.placarAtualizado || sala.placar || {};
  if(se) { se.textContent = _pv(p[walletAddress]||0); se.classList.add('pop'); }
  if(so) { so.textContent = _pv(p[opWallet]     ||0); so.classList.add('pop'); }
  await _sleep(600);

  // ── Fase 4: banner de resultado ──
  const cfg = {
    vitoria: { txt:'🏆 VOCÊ VENCEU A RODADA!', cor:'#7ab87a', bg:'rgba(122,184,122,.12)', borda:'rgba(122,184,122,.3)' },
    derrota: { txt:'💀 VOCÊ PERDEU A RODADA',  cor:'#e74c3c', bg:'rgba(231,76,60,.10)',   borda:'rgba(231,76,60,.3)' },
    empate:  { txt:'🤝 EMPATE!',               cor:'var(--gold)', bg:'rgba(201,168,76,.10)', borda:'rgba(201,168,76,.3)' },
  };
  const c = cfg[res];
  if(banner) {
    banner.style.display    = '';
    banner.style.background = c.bg;
    banner.style.border     = `1px solid ${c.borda}`;
    banner.innerHTML = `
      <div style="color:${c.cor};font-family:\'Cinzel\',serif;font-size:11px;font-weight:700;letter-spacing:2px;">${c.txt}</div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:8px;font-size:16px;">
        <span title="Você">${JKP_EMOJIS[minhaEscolha]}</span>
        <span style="font-size:10px;color:var(--muted);align-self:center;">vs</span>
        <span title="Oponente">${JKP_EMOJIS[opEscolha]}</span>
      </div>`;
    banner.classList.add('pop');
  }
  if(st) { st.textContent = ''; st.className = 'arena-partida-status'; }

  await _sleep(2500);

  // ── Avança ──
  if(rr.fim) {
    _renderResultado({
      ...sala,
      status:   'finalizada',
      vencedor: rr.vencedor,
      placar:   rr.placarAtualizado || sala.placar,
    }, opWallet);
  } else {
    // Criador limpa escolhas no RTDB para próxima rodada
    if(sala.criador === walletAddress) {
      await rtdb().ref(`arena/salas/${salaId}`).update({
        roundResult:                            null,
        turno:                                  1,
        [`jogadores/${walletAddress}/escolha`]: null,
        [`jogadores/${walletAddress}/pronto`]:  false,
        [`jogadores/${opWallet}/escolha`]:      null,
        [`jogadores/${opWallet}/pronto`]:       false,
      });
    }
    _arenaEscolhaFeita = false;
    _renderPartida(salaId, {
      ...sala,
      roundResult: null,
      turno:       1,
      rodada:      (sala.rodada||1) + 1,
      placar:      rr.placarAtualizado || sala.placar,
      jogadores: {
        ...sala.jogadores,
        [walletAddress]: { ...sala.jogadores[walletAddress], escolha: null, pronto: false },
        [opWallet]:      { ...sala.jogadores[opWallet],      escolha: null, pronto: false },
      },
    });
  }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ═══════════════════════════════════════════════════════════════════

async function _renderResultado(sala, opWallet) {
  _pararTimer();
  _arenaLimparPresenca();
  const el = document.getElementById('arenaModal');
  if(!el) return;

  // Fallback: se vencedor não está definido mas há abandono, deduz o vencedor
  const vencedor = sala.vencedor || (sala.abandono
    ? (sala.abandono === walletAddress ? opWallet : walletAddress)
    : null);
  const euVenci  = vencedor === walletAddress;
  const empate   = vencedor === 'empate';
  const aposta   = sala.aposta;
  const usaCris  = aposta.cristais > 0;
  const bruto    = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;
  const premio   = _premioLiquido(bruto);
  const moeda    = usaCris ? '💎' : '🪙';
  const meu      = sala.jogadores[walletAddress] || {};
  const op       = sala.jogadores[opWallet]       || {};
  const placar   = sala.placar || {};

  // Distribui recompensa (só o criador)
  const criador = sala.criador;
  if(criador === walletAddress && !sala.recompensaDistribuida) {
    await _distribuirRecompensas(sala, opWallet);
  } else if(criador !== walletAddress) {
    // Oponente aplica a recompensa para si mesmo
    if(euVenci)       _creditarPremio(bruto, usaCris);
    else if(empate) {
      if(usaCris) gs.cristais = (gs.cristais||0) + aposta.cristais;
      else        gs.moedas   = (gs.moedas  ||0) + aposta.moedas;
      updateResourceUI(); scheduleSave();
    }
  }

  await _atualizarRanking(sala, opWallet, euVenci, empate);

  // Remove do lobby completamente
  const fila = _getFila();
  try { await rtdb().ref(`arena/lobby/${fila}/${walletAddress}`).remove(); } catch(e){}
  _arenaAtiva     = false;
  _arenaPartidaId = null;

  // Limpeza do RTDB — só o criador apaga sala e notificações (após 10s)
  if(criador === walletAddress) {
    setTimeout(async () => {
      try {
        // Remove a sala
        await rtdb().ref(`arena/salas/${sala.id}`).remove();
        // Remove notificações enviadas para o oponente
        await rtdb().ref(`arena/notificacoes/${opWallet}/desafios/${sala.id}`).remove();
        // Remove notificações enviadas para o criador (caso existam)
        await rtdb().ref(`arena/notificacoes/${walletAddress}/desafios/${sala.id}`).remove();
        console.log('[ARENA] sala e notificações limpas:', sala.id);
      } catch(e) { console.warn('[ARENA] limpeza erro:', e); }
    }, 10000); // 10s — garante que os dois lados já viram o resultado
  }

  const titulo = empate ? '🤝 EMPATE!' : euVenci ? '🏆 VITÓRIA!' : '💀 DERROTA';
  const cor    = empate ? 'var(--gold)' : euVenci ? '#7ab87a' : '#e74c3c';

  el.innerHTML = `
    <div class="arena-resultado">
      <div class="arena-resultado-titulo" style="color:${cor};">${titulo}</div>

      <div class="arena-vs-row" style="margin:12px 0;">
        <div class="arena-vs-lado ${euVenci?'arena-vencedor':''}">
          <div class="arena-vs-svg">${gerarSVG(meu.elemento||'Fogo', meu.raridade||'Comum', meu.seed||0, 36, 36)}</div>
          <div class="arena-vs-nome">${meu.nome||'Você'}</div>
          <div class="arena-vs-pts" style="font-size:20px;">${placar[walletAddress]||0}</div>
        </div>
        <div class="arena-vs-centro"><div class="arena-vs-label">VS</div></div>
        <div class="arena-vs-lado ${!euVenci&&!empate?'arena-vencedor':''}">
          <div class="arena-vs-svg">${gerarSVG(op.elemento||'Fogo', op.raridade||'Comum', op.seed||0, 36, 36)}</div>
          <div class="arena-vs-nome">${op.nome||opWallet.slice(0,8)+'...'}</div>
          <div class="arena-vs-pts" style="font-size:20px;">${placar[opWallet]||0}</div>
        </div>
      </div>

      <div class="arena-recompensa-card">
        ${empate
          ? `<div style="color:var(--muted);font-size:7px;">Empate — apostas devolvidas</div>`
          : euVenci
            ? `<div style="color:#7ab87a;font-family:'Cinzel',serif;font-size:9px;font-weight:700;">+${premio} ${moeda} recebidos!</div>
               <div style="color:var(--muted);font-size:6px;margin-top:3px;">+${ARENA_PONTOS.vitoria} pontos no ranking</div>`
            : `<div style="color:#e74c3c;font-size:7px;">Melhor sorte na próxima!</div>
               <div style="color:var(--muted);font-size:6px;margin-top:3px;">+${ARENA_PONTOS.derrota} ponto no ranking</div>`}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:7px;" onclick="_renderLobby()">⚔️ JOGAR DE NOVO</button>
        <button class="arena-btn-sair" onclick="closeArena()">✕ FECHAR</button>
      </div>
    </div>
  `;

  addLog(`Arena: ${titulo} contra ${op.nome||opWallet.slice(0,8)}`, euVenci?'good':empate?'info':'bad');
  if(euVenci) showBubble(`Vitória! +${premio} ${moeda} 🏆`);
}

// ═══════════════════════════════════════════════════════════════════
// RECOMPENSAS
// ═══════════════════════════════════════════════════════════════════

async function _distribuirRecompensas(sala, opWallet) {
  const aposta   = sala.aposta;
  const usaCris  = aposta.cristais > 0;
  const bruto    = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;
  const taxa     = sala.taxaPool || 0;
  const vencedor = sala.vencedor;

  await rtdb().ref(`arena/salas/${sala.id}/recompensaDistribuida`).set(true);

  // Taxa vai para a pool P2E do marketplace (Firestore — mesmo doc que pool.js usa)
  if(taxa > 0 && fbDb()) {
    try {
      const POOL_SPLIT      = 0.80;
      const DEV_WALLET_ADDR = '0x8615C48d38505f02eb212Aa2ED2BA8Df86E4A49C';
      const paraPool = Math.floor(taxa * POOL_SPLIT);
      const paraDev  = taxa - paraPool;
      const motivo   = `Arena ${sala.fila} — taxa de partida`;

      const batch = fbDb().batch();

      // 80% → pool P2E
      if(paraPool > 0) {
        batch.update(fbDb().collection('config').doc('pool'), {
          cristais:    firebase.firestore.FieldValue.increment(paraPool),
          totalEntrou: firebase.firestore.FieldValue.increment(paraPool),
        });
        const logRef = fbDb().collection('config').doc('pool').collection('logs').doc();
        batch.set(logRef, {
          tipo:   'entrada',
          motivo,
          origem: walletAddress || 'arena',
          total:  taxa,
          pool:   paraPool,
          dev:    paraDev,
          ts:     firebase.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 20% → carteira dev
      if(paraDev > 0) {
        batch.set(fbDb().collection('players').doc(DEV_WALLET_ADDR), {
          'gs.cristais': firebase.firestore.FieldValue.increment(paraDev),
          cristais:      firebase.firestore.FieldValue.increment(paraDev),
        }, { merge: true });
      }

      await batch.commit();
    } catch(e) { console.warn('[ARENA] addToPool erro:', e); }
  }

  // Prêmio ao criador se ele venceu
  if(vencedor === walletAddress) _creditarPremio(bruto, usaCris);
  else if(vencedor === 'empate') {
    if(usaCris) gs.cristais = (gs.cristais||0) + aposta.cristais;
    else        gs.moedas   = (gs.moedas  ||0) + aposta.moedas;
    updateResourceUI(); scheduleSave();
  }
}

// ═══════════════════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════════════════

async function _atualizarRanking(sala, opWallet, euVenci, empate) {
  if(!rtdb() || !walletAddress) return;
  const ref  = rtdb().ref(`arena/ranking/${sala.fila}/${walletAddress}`);
  const snap = await ref.once('value');
  const cur  = snap.val() || { pontos:0, vitorias:0, derrotas:0, empates:0 };
  const pts  = empate ? 1 : euVenci ? ARENA_PONTOS.vitoria : ARENA_PONTOS.derrota;
  await ref.set({
    nome:     avatar?.nome?.split(',')[0] || cur.nome || '',
    wallet:   walletAddress,
    pontos:   (cur.pontos  ||0) + pts,
    vitorias: (cur.vitorias||0) + (euVenci        ? 1 : 0),
    derrotas: (cur.derrotas||0) + (!euVenci&&!empate ? 1 : 0),
    empates:  (cur.empates ||0) + (empate          ? 1 : 0),
  });
}

async function _carregarRanking() {
  const wrap = document.getElementById('arenaRankingWrap');
  const pool = document.getElementById('arenaPoolInfo');
  if(!wrap || !rtdb()) return;

  const fila = _getFila();
  const snap = await rtdb().ref(`arena/ranking/${fila}`)
    .orderByChild('pontos').limitToLast(10).once('value');

  const lista = Object.entries(snap.val()||{})
    .map(([k,d]) => d)
    .sort((a,b) => b.pontos - a.pontos);

  const medalhas = ['🥇','🥈','🥉'];
  wrap.innerHTML = lista.length === 0
    ? '<div class="arena-lobby-vazio">Nenhuma partida ainda.</div>'
    : lista.map((d,i) => `
        <div class="arena-rank-row ${(d.wallet||'').toLowerCase() === (walletAddress||'').toLowerCase() ? 'arena-rank-meu' : ''}">
          <span class="arena-rank-pos">${medalhas[i]||`#${i+1}`}</span>
          <span class="arena-rank-nome">${d.nome||(d.wallet||'').slice(0,10)+'...'}</span>
          <span class="arena-rank-pts">${d.pontos||0} pts</span>
          <span class="arena-rank-wl">${d.vitorias||0}V ${d.derrotas||0}D ${d.empates||0}E</span>
        </div>`).join('');

  // Pool — lê do Firestore (onde as taxas são depositadas)
  try {
    if(fbDb()) {
      const poolSnap = await fbDb().collection('config').doc('pool').get();
      const poolData = poolSnap.exists ? poolSnap.data() : null;
      const poolVal  = poolData?.cristais || 0;
      if(pool) pool.innerHTML = `
        <div class="arena-pool-card">
          <div class="arena-pool-titulo">💰 POOL SEMANAL</div>
          <div class="arena-pool-valor">${poolVal} 💎</div>
          <div class="arena-pool-sub">Distribuído toda segunda-feira · Reset automático</div>
        </div>
        <div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,.02);
                    border:1px solid rgba(255,255,255,.06);border-radius:6px;">
          <div style="font-family:'Cinzel',serif;font-size:6px;color:var(--gold);
                      letter-spacing:1px;margin-bottom:6px;">◆ COMO É DISTRIBUÍDO</div>
          <div style="font-size:6.5px;color:var(--muted);line-height:2;">
            📊 <b style="color:var(--text);">20%</b> da pool é distribuído por semana<br>
            💎 <b style="color:var(--text);">Lendário</b> recebe 60% do bolo · <b style="color:var(--text);">Raro</b> recebe 40%<br>
            🪙 <b style="color:var(--text);">Comum</b> recebe moedas internas (não cristais)<br>
            🏆 Mínimo <b style="color:var(--text);">5 pontos</b> para receber premiação<br>
            <br>
            <b style="color:var(--text);">Distribuição por posição:</b><br>
            🥇 1º → 30% · 🥈 2º → 20% · 🥉 3º → 15%<br>
            4º → 10% · 5º → 8% · 6º → 6%<br>
            7º → 4% · 8º → 3% · 9º/10º → 2% cada<br>
            <br>
            <b style="color:var(--text);">Pontos:</b> Vitória +3 · Derrota +1 · Empate +1
          </div>
        </div>`;
    }
  } catch(e) {
    if(pool) pool.innerHTML = '';
  }
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICAÇÃO DE DESAFIOS RECEBIDOS
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// LIMPEZA DE SALAS ANTIGAS
// ═══════════════════════════════════════════════════════════════════

async function _limparSalasAntigas() {
  if(!rtdb()) return;
  try {
    const snap = await rtdb().ref('arena/salas').once('value');
    const salas = snap.val() || {};
    const agora = Date.now();
    const UMA_HORA = 3600000;

    const promessas = [];
    Object.entries(salas).forEach(([id, sala]) => {
      const criadoEm = sala.criadoEm || 0;
      const velha    = typeof criadoEm === 'number' && (agora - criadoEm) > UMA_HORA;
      const finalizada = sala.status === 'finalizada' || sala.status === 'cancelada' || sala.status === 'recusada';

      if(velha || finalizada) {
        promessas.push(rtdb().ref(`arena/salas/${id}`).remove());
        console.log('[ARENA] limpando sala antiga:', id, sala.status);
      }
    });

    // Limpa notificações lidas
    const notifSnap = await rtdb().ref(`arena/notificacoes/${walletAddress}/desafios`).once('value');
    const notifs = notifSnap.val() || {};
    Object.entries(notifs).forEach(([salaId, n]) => {
      if(n.lida) {
        promessas.push(rtdb().ref(`arena/notificacoes/${walletAddress}/desafios/${salaId}`).remove());
      }
    });

    await Promise.all(promessas);
  } catch(e) { console.warn('[ARENA] limpeza salas antigas erro:', e); }
}

function iniciarListenerDesafiosRecebidos() {
  if(!rtdb() || !walletAddress) return;

  // ── Listener de premiações semanais ──
  rtdb().ref(`arena/notificacoes/${walletAddress}/premiacoes`)
    .orderByChild('lida').equalTo(false)
    .on('child_added', async snap => {
      const p = snap.val();
      if(!p || p.lida) return;
      await snap.ref.update({ lida: true });

      const msg = `🏆 Arena ${p.fila}: ${p.posicao}º lugar — +${p.premio} ${p.moeda}!`;
      addLog(msg, 'leg');
      showBubble(`${p.posicao}º lugar na Arena! ${p.moeda}`);
    });

  // Escuta o nó de notificações dedicado para este wallet
  // Formato: arena/notificacoes/{wallet}/desafios/{salaId}
  const notifRef = rtdb().ref(`arena/notificacoes/${walletAddress}/desafios`);
  notifRef.on('child_added', async snap => {
    const notif = snap.val();
    if(!notif || notif.lida) return;

    // Marca como lida imediatamente para não processar duas vezes
    await snap.ref.update({ lida: true });

    // Busca a sala
    const salaSnap = await rtdb().ref(`arena/salas/${notif.salaId}`).once('value');
    const sala = salaSnap.val();
    if(!sala || sala.status !== 'aguardando') return;

    showBubble('Você foi desafiado! ⚔️');
    addLog(`Desafio recebido de ${(sala.criador||'').slice(0,8)}...! Abra a Arena para aceitar.`, 'info');

    // Se a arena estiver aberta, mostra o card
    const el = document.getElementById('arenaModal');
    if(el && el.classList.contains('open')) {
      _renderDesafioPendente(sala);
    }
  });

  // Também escuta salas onde este wallet é o oponente (campo de primeiro nível)
  rtdb().ref('arena/salas')
    .orderByChild('oponente')
    .equalTo(walletAddress)
    .on('child_added', snap => {
      const sala = snap.val();
      if(!sala || sala.status !== 'aguardando') return;
      if(sala.criador === walletAddress) return;

      showBubble('Você foi desafiado! ⚔️');
      addLog(`Desafio recebido! Abra a Arena para aceitar.`, 'info');

      const el = document.getElementById('arenaModal');
      if(el && el.classList.contains('open')) {
        _renderDesafioPendente(sala);
      }
    });
}

function _renderDesafioPendente(sala) {
  const el = document.getElementById('arenaModal');
  if(!el) return;
  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title">⚔️ ARENA DIMENSIONAL</div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;margin-top:16px;">DESAFIO RECEBIDO!</div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">De: ${(sala.criador||'').slice(0,10)}...</div>
      <div style="font-size:7px;color:var(--muted);margin-top:3px;">
        Aposta: ${sala.aposta?.cristais > 0 ? sala.aposta.cristais+' 💎' : sala.aposta?.moedas+' 🪙'}
      </div>
      <div style="display:flex;gap:8px;margin-top:20px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:8px;" onclick="aceitarDesafio('${sala.id}')">✅ ACEITAR</button>
        <button class="arena-btn-sair" onclick="recusarDesafio('${sala.id}')">✕ RECUSAR</button>
      </div>
    </div>
  `;

  // Listener — detecta se o criador cancelou antes do oponente aceitar
  const salaRef = rtdb().ref(`arena/salas/${sala.id}/status`);
  salaRef.on('value', snap => {
    const status = snap.val();
    if(status === 'cancelada') {
      salaRef.off('value');
      addLog('Desafio cancelado pelo oponente.', 'bad');
      showBubble('Desafio cancelado! 😔');
      const fila = _getFila();
      rtdb().ref(`arena/lobby/${fila}/${walletAddress}`).remove();
      _arenaAtiva     = false;
      _arenaPartidaId = null;
      _renderLobby();
    }
    // Se virou em_jogo (aceito por outro meio / reconexão), não faz nada — aceitarDesafio cuida
  });
}

// ═══════════════════════════════════════════════════════════════════
// RECONEXÃO — verifica partida pendente ao carregar a página
// ═══════════════════════════════════════════════════════════════════

async function verificarPartidaPendente() {
  if(!rtdb() || !walletAddress) return;

  try {
    // Busca salas ativas onde este wallet é criador ou oponente
    const [snapCriador, snapOponente] = await Promise.all([
      rtdb().ref('arena/salas').orderByChild('criador').equalTo(walletAddress).once('value'),
      rtdb().ref('arena/salas').orderByChild('oponente').equalTo(walletAddress).once('value'),
    ]);

    let salaAtiva = null;

    // Verifica salas como criador
    snapCriador.forEach(child => {
      const s = child.val();
      if(s && (s.status === 'aguardando' || s.status === 'em_jogo')) {
        salaAtiva = s;
      }
    });

    // Verifica salas como oponente
    if(!salaAtiva) {
      snapOponente.forEach(child => {
        const s = child.val();
        if(s && (s.status === 'aguardando' || s.status === 'em_jogo')) {
          salaAtiva = s;
        }
      });
    }

    if(!salaAtiva) return;

    console.log('[ARENA] Partida pendente encontrada:', salaAtiva.id, salaAtiva.status);

    // Aguarda o avatar carregar (pode demorar um tick)
    await new Promise(r => setTimeout(r, 1500));

    if(salaAtiva.status === 'aguardando') {
      const euSouCriador = salaAtiva.criador === walletAddress;
      if(euSouCriador) {
        // Volta para a sala de espera
        addLog('Reconectado — aguardando oponente aceitar.', 'info');
        showBubble('Reconectado! ⚔️');
        _arenaPartidaId = salaAtiva.id;
        _arenaAtiva     = true;
        // Abre a arena e vai direto para sala de espera
        ModalManager.open('arenaModal');
        _renderSalaEspera(salaAtiva.id);
      } else {
        // É o oponente — mostra tela de aceitar
        addLog('Você tem um desafio pendente!', 'info');
        showBubble('Desafio pendente! ⚔️');
        ModalManager.open('arenaModal');
        _renderDesafioPendente(salaAtiva);
      }
    } else if(salaAtiva.status === 'em_jogo') {
      // Reentra na partida
      addLog('Reconectado à partida em andamento!', 'info');
      showBubble('Reconectado! ⚔️');
      _arenaPartidaId = salaAtiva.id;
      _arenaAtiva     = true;
      ModalManager.open('arenaModal');
      _renderPartida(salaAtiva.id, salaAtiva);
    }

  } catch(e) {
    console.log('[ARENA] verificarPartidaPendente erro:', e);
  }
}

window.verificarPartidaPendente = verificarPartidaPendente;
window.openArena                        = openArena;
window.closeArena                       = closeArena;
window.entrarNoLobby                    = entrarNoLobby;
window.sairDoLobby                      = sairDoLobby;
window.desafiarJogador                  = desafiarJogador;
window.cancelarDesafio                  = cancelarDesafio;
window.aceitarDesafio                   = aceitarDesafio;
window.recusarDesafio                   = recusarDesafio;
window.fazerEscolha                     = fazerEscolha;
window.arenaShowTab                     = arenaShowTab;
window.iniciarListenerDesafiosRecebidos = iniciarListenerDesafiosRecebidos;
window._renderLobby                     = _renderLobby;
window._limparSalasAntigas              = _limparSalasAntigas;
} // end arena guard
