// ═══════════════════════════════════════════════════════════════════
// ARENA DIMENSIONAL — Jo-Ken-Pô Multiplayer
// ═══════════════════════════════════════════════════════════════════

// ── Referência ao Realtime Database ──
function rtdb() { return typeof _rtdb !== 'undefined' ? _rtdb : null; }

// ── Constantes ──
const ARENA_TAXA        = 0.15;
const ARENA_TIMER_SEG   = 30;
const ARENA_MAX_RODADAS = 3;
// TTL generoso — 5 minutos — para não filtrar quem acabou de entrar
const ARENA_LOBBY_TTL   = 300000;

const ARENA_APOSTAS = {
  'Comum':    { moedas: 50,  cristais: 0  },
  'Raro':     { moedas: 0,   cristais: 10 },
  'Lendário': { moedas: 0,   cristais: 20 },
};
const ARENA_PONTOS  = { vitoria: 3, derrota: 1 };
const JKP_EMOJIS    = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
const JKP_OPCOES    = ['pedra', 'papel', 'tesoura'];
const JKP_VENCE     = { pedra: 'tesoura', tesoura: 'papel', papel: 'pedra' };

// ── Estado ──
let _arenaAtiva          = false;
let _arenaPartidaId      = null;
let _arenaLobbyRef       = null;   // ref do nó do jogador no lobby
let _arenaLobbyListRef   = null;   // ref da fila inteira (listener)
let _arenaHeartbeat      = null;
let _arenaTimerInterval  = null;
let _arenaEscolhaFeita   = false;

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
  if(_arenaHeartbeat) { clearInterval(_arenaHeartbeat); _arenaHeartbeat = null; }
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
  if(!rtdb()) { console.log('[ARENA] _iniciarLobbyListener: rtdb null!'); return; }

  _pararLobbyListener();

  const fila = _getFila();
  console.log('[ARENA] iniciando listener na fila:', fila, 'path: arena/lobby/'+fila);
  _arenaLobbyListRef = rtdb().ref(`arena/lobby/${fila}`);

  _arenaLobbyListRef.on('value', snap => {
    const lista = document.getElementById('arenaLobbyLista');
    console.log('[ARENA] snap recebido, lista existe?', !!lista, 'fila:', fila);

    if(!lista) return;

    const dados = snap.val();
    console.log('[ARENA] dados:', dados, 'meuWallet:', walletAddress);

    if(!dados) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>';
      return;
    }

    const myKey = (walletAddress||'').toLowerCase();
    const agora = Date.now();

    const avatares = Object.entries(dados).filter(([k, d]) => {
      const isMe      = k.toLowerCase() === myKey;
      const emPartida = d.emPartida === true;
      const tsOk      = !d.ts || typeof d.ts !== 'number' || (agora - d.ts) < ARENA_LOBBY_TTL;
      console.log(`[ARENA] k=${k} isMe=${isMe} emPartida=${emPartida} tsOk=${tsOk}`);
      return !isMe && !emPartida && tsOk;
    });

    if(!avatares.length) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>';
      return;
    }

    lista.innerHTML = avatares.map(([k, d]) => `
      <div class="arena-lobby-card">
        <div class="arena-lobby-svg">${gerarSVG(d.elemento, d.raridade, d.seed, 36, 36)}</div>
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

  await rtdb().ref(`arena/salas/${salaId}`).set(sala);

  // Marca os dois como em partida no lobby
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(true);
  await rtdb().ref(`arena/lobby/${fila}/${walletOponente}/emPartida`).set(true);

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
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(false);
  // Devolve aposta
  const a = _getAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
  updateResourceUI();
  // Limpa sala e notificações após 3s
  setTimeout(async () => {
    try {
      await rtdb().ref(`arena/salas/${salaId}`).remove();
      await rtdb().ref(`arena/notificacoes`).once('value').then(snap => {
        const todos = snap.val() || {};
        Object.keys(todos).forEach(async wallet => {
          await rtdb().ref(`arena/notificacoes/${wallet}/desafios/${salaId}`).remove();
        });
      });
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
// TELA DA PARTIDA
// ═══════════════════════════════════════════════════════════════════

function _renderPartida(salaId, sala) {
  _pararTimer();
  _arenaEscolhaFeita = false;

  const el = document.getElementById('arenaModal');
  if(!el) return;

  const wallets  = Object.keys(sala.jogadores);
  const meu      = sala.jogadores[walletAddress] || {};
  const opWallet = wallets.find(w => w !== walletAddress);
  const op       = sala.jogadores[opWallet]       || {};
  const placar   = sala.placar || {};
  const rodada   = sala.rodada || 1;
  const aposta   = sala.aposta;
  const usaCris  = aposta.cristais > 0;
  const bruto    = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;

  // Indicador de pontos como corações/estrelas
  function _pontosVis(pts) {
    return '⭐'.repeat(pts) + '☆'.repeat(Math.max(0, 2 - pts));
  }

  el.innerHTML = `
    <div class="arena-partida">

      <!-- Header com rodada e prêmio -->
      <div class="arena-partida-header">
        <div class="arena-rodada-badge">RODADA ${rodada} <span style="color:var(--muted)">/ ${ARENA_MAX_RODADAS}</span></div>
        <div class="arena-premio-badge">💰 ${_premioLiquido(bruto)} ${usaCris?'💎':'🪙'}</div>
      </div>

      <!-- VS -->
      <div class="arena-vs-row">
        <div class="arena-vs-lado" id="vsEu">
          <div class="arena-vs-svg">${gerarSVG(meu.elemento||'Fogo', meu.raridade||'Comum', meu.seed||0, 52, 52)}</div>
          <div class="arena-vs-nome">${meu.nome||'Você'}</div>
          <div class="arena-vs-stars" id="starsEu">${_pontosVis(placar[walletAddress]||0)}</div>
          <div class="arena-vs-escolha" id="escolhaEu">❓</div>
        </div>

        <div class="arena-vs-centro">
          <div class="arena-vs-label">VS</div>
          <div class="arena-timer" id="arenaTimer">${ARENA_TIMER_SEG}</div>
          <div style="font-size:6px;color:var(--muted);margin-top:2px;">seg</div>
        </div>

        <div class="arena-vs-lado" id="vsOp">
          <div class="arena-vs-svg">${gerarSVG(op.elemento||'Fogo', op.raridade||'Comum', op.seed||0, 52, 52)}</div>
          <div class="arena-vs-nome">${op.nome||opWallet.slice(0,8)+'...'}</div>
          <div class="arena-vs-stars" id="starsOp">${_pontosVis(placar[opWallet]||0)}</div>
          <div class="arena-vs-escolha" id="escolhaOp">❓</div>
        </div>
      </div>

      <!-- Status / Countdown -->
      <div class="arena-partida-status" id="arenaStatus">⚔️ Escolha sua jogada!</div>

      <!-- Botões -->
      <div class="arena-escolhas" id="arenaEscolhas">
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','pedra')">
          🪨<span>PEDRA</span>
        </button>
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','papel')">
          📄<span>PAPEL</span>
        </button>
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','tesoura')">
          ✂️<span>TESOURA</span>
        </button>
      </div>

      <!-- Banner resultado da rodada — aparece após revelação -->
      <div class="arena-round-banner" id="arenaRoundBanner" style="display:none;"></div>

    </div>
  `;

  _iniciarTimer(salaId, opWallet);
  _escutarSala(salaId, opWallet);
}

// ── Listener central da sala ──
function _escutarSala(salaId, opWallet) {
  const salaRef = rtdb().ref(`arena/salas/${salaId}`);
  salaRef.on('value', snap => {
    const s = snap.val();
    if(!s) return;

    // Atualiza placar em tempo real
    const se = document.getElementById('starsEu');
    const so = document.getElementById('starsOp');
    function _pv(n) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 2 - n)); }
    if(se) se.textContent = _pv(s.placar?.[walletAddress]||0);
    if(so) so.textContent = _pv(s.placar?.[opWallet]     ||0);

    const jEu = s.jogadores?.[walletAddress];
    const jOp = s.jogadores?.[opWallet];

    // Mostra que eu já escolhi (sem revelar ao oponente)
    if(jEu?.pronto) {
      const euEl = document.getElementById('escolhaEu');
      if(euEl && euEl.textContent === '❓') euEl.textContent = '✅';
    }
    // Mostra que oponente já escolheu
    if(jOp?.pronto) {
      const opEl = document.getElementById('escolhaOp');
      if(opEl && opEl.textContent === '❓') opEl.textContent = '⏳';
      const st = document.getElementById('arenaStatus');
      if(st && _arenaEscolhaFeita) st.textContent = '⚡ Oponente pronto! Revelando...';
    }

    // Ambos prontos — revelar (campo roundResult gravado pelo criador)
    if(jEu?.pronto && jOp?.pronto && s.roundResult) {
      salaRef.off('value');
      _pararTimer();
      _animarRevelacao(salaId, s, opWallet);
      return;
    }

    // Finalizada sem passar por roundResult (reconexão)
    if(s.status === 'finalizada' && (!jEu?.pronto || !jOp?.pronto || !s.roundResult)) {
      salaRef.off('value');
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

  const euEl = document.getElementById('escolhaEu');
  if(euEl) euEl.textContent = '✅';
  const st = document.getElementById('arenaStatus');
  if(st) st.textContent = '⏳ Aguardando oponente...';
  document.querySelectorAll('.arena-escolha-btn').forEach(b => b.disabled = true);

  await rtdb().ref(`arena/salas/${salaId}/jogadores/${walletAddress}`).update({
    escolha, pronto: true,
  });

  // Verifica se o oponente já escolheu — se sim, o criador calcula o roundResult
  const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
  const s    = snap.val();
  if(!s) return;

  const wallets  = Object.keys(s.jogadores);
  const criador  = wallets[0];
  const opWallet = wallets.find(w => w !== walletAddress);
  const jOp      = s.jogadores?.[opWallet];

  // Só o criador grava o roundResult para evitar duplicidade
  if(criador === walletAddress && jOp?.pronto && jOp?.escolha) {
    await _calcularEGravarRound(salaId, s, opWallet);
  }
}

// Calcula resultado e grava no RTDB para os dois verem simultaneamente
async function _calcularEGravarRound(salaId, sala, opWallet) {
  const jEu = sala.jogadores[walletAddress];
  const jOp = sala.jogadores[opWallet];
  if(!jEu?.escolha || !jOp?.escolha) return;

  const res = _jkpRes(jEu.escolha, jOp.escolha);
  const p   = { ...(sala.placar||{}) };
  if(res === 'vitoria')  p[walletAddress] = (p[walletAddress]||0) + 1;
  if(res === 'derrota')  p[opWallet]      = (p[opWallet]     ||0) + 1;

  const novaRodada = (sala.rodada||1) + 1;
  const fim = p[walletAddress] >= 2 || p[opWallet] >= 2 || novaRodada > ARENA_MAX_RODADAS;

  let vencedor = null;
  if(fim) {
    if     (p[walletAddress] > p[opWallet]) vencedor = walletAddress;
    else if(p[opWallet] > p[walletAddress]) vencedor = opWallet;
    else                                     vencedor = 'empate';
  }

  // Grava roundResult — ambos os jogadores lêem isso no listener
  await rtdb().ref(`arena/salas/${salaId}`).update({
    roundResult: {
      escolhaCriador: jEu.escolha,
      escolhaOponente: jOp.escolha,
      resultado: res,         // do ponto de vista do criador
      placarAtualizado: p,
      fim,
      vencedor,
    },
    placar:   p,
    rodada:   novaRodada,
    status:   fim ? 'finalizada' : 'em_jogo',
    vencedor: vencedor,
  });
}

// ═══════════════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════════════

function _iniciarTimer(salaId, opWallet) {
  let seg = ARENA_TIMER_SEG;
  _arenaTimerInterval = setInterval(async () => {
    seg--;
    const el = document.getElementById('arenaTimer');
    if(el) {
      el.textContent = seg;
      el.className = 'arena-timer' + (seg <= 10 ? ' urgente' : '');
    }
    if(seg <= 0) {
      _pararTimer();
      if(!_arenaEscolhaFeita) await fazerEscolha(salaId, _aleatorio());
    }
  }, 1000);
}

// ═══════════════════════════════════════════════════════════════════
// ANIMAÇÃO DE REVELAÇÃO — roda nos dois lados simultaneamente
// ═══════════════════════════════════════════════════════════════════

async function _animarRevelacao(salaId, sala, opWallet) {
  const rr      = sala.roundResult;
  const wallets = Object.keys(sala.jogadores);
  const criador = wallets[0];
  const euSouCriador = criador === walletAddress;

  // Do ponto de vista de cada jogador:
  // criador: resultado já está em rr.resultado
  // oponente: inverte vitoria/derrota
  let res;
  if(euSouCriador) {
    res = rr.resultado;
  } else {
    const inv = { vitoria:'derrota', derrota:'vitoria', empate:'empate' };
    res = inv[rr.resultado];
  }

  // Escolhas de cada lado da tela
  const minhaEscolha = euSouCriador ? rr.escolhaCriador  : rr.escolhaOponente;
  const opEscolha    = euSouCriador ? rr.escolhaOponente : rr.escolhaCriador;

  // Fase 1 — countdown "3 2 1"
  const st = document.getElementById('arenaStatus');
  const eEu = document.getElementById('escolhaEu');
  const eOp = document.getElementById('escolhaOp');

  for(const n of ['3','2','1']) {
    if(st) { st.textContent = n; st.className = 'arena-partida-status arena-countdown'; }
    await _sleep(500);
  }
  if(st) { st.textContent = '⚡'; st.className = 'arena-partida-status arena-countdown'; }
  await _sleep(300);

  // Fase 2 — revela escolhas com animação pop
  if(eEu) { eEu.textContent = JKP_EMOJIS[minhaEscolha]; eEu.classList.add('pop'); }
  if(eOp) { eOp.textContent = JKP_EMOJIS[opEscolha];    eOp.classList.add('pop'); }
  await _sleep(400);

  // Fase 3 — destaca vencedor/perdedor nos cards
  const vsEu = document.getElementById('vsEu');
  const vsOp = document.getElementById('vsOp');
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

  // Fase 4 — banner de resultado
  const banner = document.getElementById('arenaRoundBanner');
  if(banner) {
    const cfg = {
      vitoria: { txt:'🏆 VOCÊ VENCEU A RODADA!', cor:'#7ab87a', bg:'rgba(122,184,122,.12)' },
      derrota: { txt:'💀 VOCÊ PERDEU A RODADA',  cor:'#e74c3c', bg:'rgba(231,76,60,.10)' },
      empate:  { txt:'🤝 EMPATE!',               cor:'var(--gold)', bg:'rgba(201,168,76,.10)' },
    };
    const c = cfg[res];
    banner.style.display = '';
    banner.style.background = c.bg;
    banner.innerHTML = `<span style="color:${c.cor};font-family:'Cinzel',serif;font-size:11px;font-weight:700;letter-spacing:2px;">${c.txt}</span>`;
    banner.classList.add('pop');
  }

  // Atualiza placar visualmente
  function _pv(n) { return '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 2-n)); }
  const p  = rr.placarAtualizado || sala.placar || {};
  const se = document.getElementById('starsEu');
  const so = document.getElementById('starsOp');
  if(se) { se.textContent = _pv(p[walletAddress]||0); se.classList.add('pop'); }
  if(so) { so.textContent = _pv(p[opWallet]     ||0); so.classList.add('pop'); }

  if(st) { st.textContent = ''; st.className = 'arena-partida-status'; }

  await _sleep(2200);

  // Avança
  if(rr.fim) {
    // Busca sala atualizada para ter o vencedor correto
    const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
    _renderResultado(snap.val(), opWallet);
  } else {
    // Limpa escolhas para próxima rodada
    await rtdb().ref(`arena/salas/${salaId}`).update({
      roundResult: null,
      [`jogadores/${walletAddress}/escolha`]: null,
      [`jogadores/${walletAddress}/pronto`]:  false,
    });
    _arenaEscolhaFeita = false;
    const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
    _renderPartida(salaId, snap.val());
  }
}

function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ═══════════════════════════════════════════════════════════════════

async function _renderResultado(sala, opWallet) {
  _pararTimer();
  const el = document.getElementById('arenaModal');
  if(!el) return;

  const vencedor = sala.vencedor;
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
  const criador = Object.keys(sala.jogadores)[0];
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

  // Libera do lobby
  const fila = _getFila();
  try { await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(false); } catch(e){}
  _arenaAtiva     = false;
  _arenaPartidaId = null;

  // Limpeza do RTDB — só o criador apaga sala e notificações (após 10s de delay)
  const criadorLimpeza = Object.keys(sala.jogadores)[0];
  if(criadorLimpeza === walletAddress) {
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
          <div class="arena-vs-svg">${gerarSVG(meu.elemento||'Fogo', meu.raridade||'Comum', meu.seed||0, 48, 48)}</div>
          <div class="arena-vs-nome">${meu.nome||'Você'}</div>
          <div class="arena-vs-pts" style="font-size:20px;">${placar[walletAddress]||0}</div>
        </div>
        <div class="arena-vs-centro"><div class="arena-vs-label">VS</div></div>
        <div class="arena-vs-lado ${!euVenci&&!empate?'arena-vencedor':''}">
          <div class="arena-vs-svg">${gerarSVG(op.elemento||'Fogo', op.raridade||'Comum', op.seed||0, 48, 48)}</div>
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
          <span class="arena-rank-wl">${d.vitorias||0}V ${d.derrotas||0}D</span>
        </div>`).join('');

  const poolSnap = await rtdb().ref(`arena/pool/${fila}`).once('value');
  const poolVal  = poolSnap.val() || 0;
  const aposta   = _getAposta();
  const moeda    = aposta.cristais > 0 ? '💎' : '🪙';
  if(pool) pool.innerHTML = `
    <div class="arena-pool-card">
      <div class="arena-pool-titulo">💰 POOL SEMANAL — ${fila.toUpperCase()}</div>
      <div class="arena-pool-valor">${poolVal} ${moeda}</div>
      <div class="arena-pool-sub">Distribuído toda segunda-feira · Reset automático</div>
    </div>`;
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
      // Libera o lobby do oponente
      const fila = _getFila();
      rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(false);
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
