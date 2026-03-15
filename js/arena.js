// ═══════════════════════════════════════════════════════════════════
// ARENA DIMENSIONAL — Jo-Ken-Pô Multiplayer
// Parte 1: Lobby em tempo real via Firebase Realtime Database
// ═══════════════════════════════════════════════════════════════════

// ── Referência ao Realtime Database ──
// Inicializado no index.html junto com o Firestore
function rtdb() { return typeof _rtdb !== 'undefined' ? _rtdb : null; }

// ── Constantes ──
const ARENA_TAXA        = 0.15;  // 15% de cada aposta vai para a pool semanal
const ARENA_TIMEOUT_MS  = 60000; // 60s para escolher na partida
const ARENA_LOBBY_TTL   = 30000; // 30s sem heartbeat → remove do lobby

const ARENA_APOSTAS = {
  'Comum':    { moedas: 50,  cristais: 0  },
  'Raro':     { moedas: 0,   cristais: 10 },
  'Lendário': { moedas: 0,   cristais: 20 },
};

const ARENA_PONTOS = {
  vitoria:  3,
  derrota:  1,
  abandono: 0,
};

// ── Estado da arena ──
let arenaAtiva       = false;  // jogador está no lobby
let arenaPartidaId   = null;   // id da partida ativa
let arenaLobbyRef    = null;   // referência do jogador no lobby
let arenaHeartbeat   = null;   // interval do heartbeat
let arenaListeners   = [];     // listeners ativos para cleanup
let arenaLobbySnap   = null;   // listener do lobby geral

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function arenaGetRaridade() {
  return avatar?.raridade || 'Comum';
}

function arenaGetFila() {
  return arenaGetRaridade(); // Comum | Raro | Lendário
}

function arenaGetAposta() {
  return ARENA_APOSTAS[arenaGetRaridade()];
}

function arenaTaxaPool(valor) {
  return Math.floor(valor * ARENA_TAXA);
}

function arenaVencedorLeva(valor) {
  return valor - arenaTaxaPool(valor);
}

// Verifica se o jogador tem saldo para entrar
function arenaPodePagar() {
  const aposta = arenaGetAposta();
  if(aposta.cristais > 0) return gs.cristais >= aposta.cristais;
  return gs.moedas >= aposta.moedas;
}

function arenaDescricaoAposta() {
  const aposta = arenaGetAposta();
  if(aposta.cristais > 0) return `${aposta.cristais} 💎`;
  return `${aposta.moedas} 🪙`;
}

// ═══════════════════════════════════════════════════════════════════
// ABRIR / FECHAR MODAL DA ARENA
// ═══════════════════════════════════════════════════════════════════

function openArena() {
  if(!hatched || dead || !avatar) { showBubble('Precisa de um avatar ativo!'); return; }
  if(sleeping || modoRepouso)     { showBubble('Descansando agora...'); return; }
  if(!rtdb())                     { showBubble('Arena indisponível'); return; }

  ModalManager.open('arenaModal');
  renderArenaModal();
}

function closeArena() {
  sairDoLobby();
  ModalManager.close('arenaModal');
}

// ═══════════════════════════════════════════════════════════════════
// RENDER DO MODAL
// ═══════════════════════════════════════════════════════════════════

function renderArenaModal() {
  const el = document.getElementById('arenaModal');
  if(!el) return;

  const raridade  = arenaGetRaridade();
  const aposta    = arenaGetAposta();
  const podePagar = arenaPodePagar();
  const fila      = arenaGetFila();

  el.innerHTML = `
    <button class="gs-x-btn" onclick="closeArena()">✕</button>

    <div class="arena-header">
      <div class="arena-title">⚔️ ARENA DIMENSIONAL</div>
      <div class="arena-sub">Jo-Ken-Pô ao vivo · Fila ${raridade.toUpperCase()}</div>
    </div>

    <!-- TABS: Lobby / Ranking -->
    <div class="arena-tabs">
      <button class="arena-tab active" id="tabLobby" onclick="arenaShowTab('lobby')">🏟️ LOBBY</button>
      <button class="arena-tab" id="tabRanking" onclick="arenaShowTab('ranking')">🏆 RANKING</button>
    </div>

    <!-- TAB LOBBY -->
    <div id="arenaTabLobby" class="arena-tab-content">

      <!-- Info da aposta -->
      <div class="arena-aposta-info">
        <span>Aposta: <b>${arenaDescricaoAposta()}</b></span>
        <span>Vencedor leva: <b>${
          aposta.cristais > 0
            ? `${arenaVencedorLeva(aposta.cristais * 2)} 💎`
            : `${arenaVencedorLeva(aposta.moedas * 2)} 🪙`
        }</b></span>
        <span style="color:var(--muted);font-size:6px;">15% → pool do ranking</span>
      </div>

      <!-- Botão entrar/sair do lobby -->
      <div class="arena-lobby-actions">
        ${arenaAtiva
          ? `<button class="arena-btn-sair" onclick="sairDoLobby()">⬅ SAIR DA FILA</button>
             <div class="arena-aguardando">
               <div class="arena-pulse"></div>
               Aguardando oponente...
             </div>`
          : `<button class="arena-btn-entrar ${!podePagar ? 'disabled' : ''}"
               onclick="${podePagar ? 'entrarNoLobby()' : ''}"
               ${!podePagar ? 'disabled' : ''}>
               ⚔️ ENTRAR NA FILA
             </button>
             ${!podePagar
               ? `<div class="arena-sem-saldo">Saldo insuficiente (${arenaDescricaoAposta()} necessário)</div>`
               : ''
             }`
        }
      </div>

      <!-- Lista de avatares no lobby -->
      <div class="arena-lobby-titulo">Avatares na fila ${fila}</div>
      <div class="arena-lobby-lista" id="arenaLobbyLista">
        <div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>
      </div>
    </div>

    <!-- TAB RANKING -->
    <div id="arenaTabRanking" class="arena-tab-content" style="display:none;">
      <div class="arena-ranking-wrap" id="arenaRankingWrap">
        <div class="arena-lobby-vazio">Carregando ranking...</div>
      </div>
      <div class="arena-pool-info" id="arenaPoolInfo"></div>
    </div>
  `;

  // Inicia listener do lobby em tempo real
  iniciarLobbyListener();
  // Carrega ranking
  carregarRanking();
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
// ENTRAR / SAIR DO LOBBY
// ═══════════════════════════════════════════════════════════════════

async function entrarNoLobby() {
  if(!rtdb() || !walletAddress || !avatar) return;
  if(!arenaPodePagar()) { showBubble('Saldo insuficiente!'); return; }

  const fila    = arenaGetFila();
  const path    = `arena/lobby/${fila}/${walletAddress}`;
  arenaLobbyRef = rtdb().ref(path);

  const entrada = {
    wallet:    walletAddress,
    nome:      avatar.nome.split(',')[0],
    raridade:  avatar.raridade,
    elemento:  avatar.elemento,
    nivel:     nivel,
    vinculo:   Math.floor(vinculo),
    seed:      avatar.seed,
    ts:        firebase.database.ServerValue.TIMESTAMP,
    emPartida: false,
  };

  await arenaLobbyRef.set(entrada);

  // Remove automaticamente ao desconectar
  arenaLobbyRef.onDisconnect().remove();

  // Heartbeat — mantém presença ativa
  arenaHeartbeat = setInterval(async () => {
    if(arenaLobbyRef) {
      await arenaLobbyRef.update({ ts: firebase.database.ServerValue.TIMESTAMP });
    }
  }, 10000);

  arenaAtiva = true;
  addLog('Entrou na fila da Arena! ⚔️', 'info');
  renderArenaModal();
}

async function sairDoLobby() {
  if(arenaLobbyRef) {
    await arenaLobbyRef.remove();
    arenaLobbyRef = null;
  }
  if(arenaHeartbeat) {
    clearInterval(arenaHeartbeat);
    arenaHeartbeat = null;
  }
  // Remove listeners
  arenaListeners.forEach(unsub => { try { unsub(); } catch(e){} });
  arenaListeners = [];

  arenaAtiva = false;
}

// ═══════════════════════════════════════════════════════════════════
// LISTENER DO LOBBY EM TEMPO REAL
// ═══════════════════════════════════════════════════════════════════

function iniciarLobbyListener() {
  if(!rtdb()) return;

  // Remove listener anterior
  if(arenaLobbySnap) {
    rtdb().ref(`arena/lobby/${arenaGetFila()}`).off('value', arenaLobbySnap);
  }

  const ref = rtdb().ref(`arena/lobby/${arenaGetFila()}`);
  arenaLobbySnap = ref.on('value', snap => {
    const lista = document.getElementById('arenaLobbyLista');
    if(!lista) return;

    const dados = snap.val() || {};
    const agora = Date.now();

    // Filtra entradas expiradas (sem heartbeat há mais de 30s) e o próprio jogador
    const avatares = Object.entries(dados)
      .filter(([wallet, d]) =>
        wallet !== walletAddress &&
        !d.emPartida &&
        (agora - (d.ts || 0)) < ARENA_LOBBY_TTL
      )
      .sort((a, b) => a[1].ts - b[1].ts); // mais antigo primeiro

    if(avatares.length === 0) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>';
      return;
    }

    lista.innerHTML = avatares.map(([wallet, d]) => `
      <div class="arena-lobby-card">
        <div class="arena-lobby-svg">
          ${gerarSVG(d.elemento, d.raridade, d.seed, 36, 36)}
        </div>
        <div class="arena-lobby-info">
          <div class="arena-lobby-nome">${d.nome}</div>
          <div class="arena-lobby-meta">NV ${d.nivel} · ${d.raridade} · Vínculo ${d.vinculo}</div>
        </div>
        ${arenaAtiva
          ? `<button class="arena-btn-desafiar" onclick="desafiarJogador('${wallet}')">
               ⚔️ DESAFIAR
             </button>`
          : `<div class="arena-lobby-aguarda" style="font-size:6px;color:var(--muted);">Entre na fila para desafiar</div>`
        }
      </div>
    `).join('');
  });
}

// ═══════════════════════════════════════════════════════════════════
// DESAFIAR JOGADOR
// ═══════════════════════════════════════════════════════════════════

async function desafiarJogador(walletOponente) {
  if(!arenaAtiva || !rtdb()) return;

  const aposta  = arenaGetAposta();
  const salaId  = `${walletAddress}_${walletOponente}_${Date.now()}`;
  const fila    = arenaGetFila();

  const sala = {
    id:        salaId,
    fila,
    status:    'aguardando', // aguardando | em_jogo | finalizada
    aposta,
    jogadores: {
      [walletAddress]: {
        wallet:   walletAddress,
        nome:     avatar.nome.split(',')[0],
        raridade: avatar.raridade,
        elemento: avatar.elemento,
        seed:     avatar.seed,
        nivel,
        escolha:  null,  // 'pedra' | 'papel' | 'tesoura' — preenchido na partida
        pronto:   false,
      },
      [walletOponente]: {
        wallet:   walletOponente,
        nome:     null, // preenchido quando aceitar
        escolha:  null,
        pronto:   false,
      }
    },
    rodada:    1,
    placar:    { [walletAddress]: 0, [walletOponente]: 0 },
    criadoEm:  firebase.database.ServerValue.TIMESTAMP,
    expiradoEm: Date.now() + 120000, // 2min para aceitar
    taxaPool:  aposta.cristais > 0
      ? arenaTaxaPool(aposta.cristais * 2)
      : arenaTaxaPool(aposta.moedas  * 2),
  };

  // Cria a sala
  await rtdb().ref(`arena/salas/${salaId}`).set(sala);

  // Marca ambos como em partida no lobby
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(true);
  await rtdb().ref(`arena/lobby/${fila}/${walletOponente}/emPartida`).set(true);

  arenaPartidaId = salaId;
  addLog(`Desafio enviado! Aguardando ${walletOponente.slice(0,6)}...`, 'info');
  showBubble('Desafio enviado! ⚔️');

  // Abre tela de sala (Parte 2)
  abrirSalaEspera(salaId);
}

// ═══════════════════════════════════════════════════════════════════
// SALA DE ESPERA (placeholder — implementado na Parte 2)
// ═══════════════════════════════════════════════════════════════════

function abrirSalaEspera(salaId) {
  const lista = document.getElementById('arenaLobbyLista');
  if(!lista) return;
  lista.innerHTML = `
    <div class="arena-aguardando" style="flex-direction:column;gap:10px;padding:20px 0;">
      <div class="arena-pulse"></div>
      <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:2px;">DESAFIO ENVIADO</div>
      <div style="font-size:7px;color:var(--muted);">Aguardando o oponente aceitar...</div>
      <div style="font-size:6px;color:var(--muted);">Sala: #${salaId.slice(-6).toUpperCase()}</div>
      <button class="arena-btn-sair" onclick="cancelarDesafio('${salaId}')">✕ CANCELAR</button>
    </div>
  `;

  // Listener da sala — quando oponente aceitar avança para a partida
  const salaRef = rtdb().ref(`arena/salas/${salaId}/status`);
  const listener = salaRef.on('value', snap => {
    if(snap.val() === 'em_jogo') {
      salaRef.off('value', listener);
      // Parte 2: abrirPartida(salaId)
      addLog('Oponente aceitou! Partida iniciando...', 'good');
    }
  });
}

async function cancelarDesafio(salaId) {
  if(!rtdb()) return;
  await rtdb().ref(`arena/salas/${salaId}`).update({ status: 'cancelada' });
  const fila = arenaGetFila();
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(false);
  arenaPartidaId = null;
  renderArenaModal();
}

// ═══════════════════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════════════════

async function carregarRanking() {
  const wrap = document.getElementById('arenaRankingWrap');
  const pool = document.getElementById('arenaPoolInfo');
  if(!wrap || !rtdb()) return;

  const fila = arenaGetFila();

  // Busca top 10 da fila atual
  const snap = await rtdb().ref(`arena/ranking/${fila}`)
    .orderByChild('pontos')
    .limitToLast(10)
    .once('value');

  const dados = snap.val() || {};
  const lista = Object.entries(dados)
    .map(([w, d]) => ({ wallet: w, ...d }))
    .sort((a, b) => b.pontos - a.pontos);

  if(lista.length === 0) {
    wrap.innerHTML = '<div class="arena-lobby-vazio">Nenhuma partida disputada ainda.</div>';
  } else {
    const medalhas = ['🥇','🥈','🥉'];
    wrap.innerHTML = lista.map((d, i) => `
      <div class="arena-rank-row ${d.wallet === walletAddress ? 'arena-rank-meu' : ''}">
        <span class="arena-rank-pos">${medalhas[i] || `#${i+1}`}</span>
        <span class="arena-rank-nome">${d.nome || d.wallet.slice(0,8)+'...'}</span>
        <span class="arena-rank-pts">${d.pontos || 0} pts</span>
        <span class="arena-rank-wl" style="color:var(--muted);font-size:6px;">${d.vitorias||0}V ${d.derrotas||0}D</span>
      </div>
    `).join('');
  }

  // Pool acumulada
  const poolSnap = await rtdb().ref(`arena/pool/${fila}`).once('value');
  const poolVal  = poolSnap.val() || 0;
  const aposta   = arenaGetAposta();
  const moeda    = aposta.cristais > 0 ? '💎' : '🪙';
  if(pool) pool.innerHTML = `
    <div class="arena-pool-card">
      <div class="arena-pool-titulo">💰 POOL SEMANAL — ${fila.toUpperCase()}</div>
      <div class="arena-pool-valor">${poolVal} ${moeda}</div>
      <div class="arena-pool-sub">Distribuído toda segunda-feira · Reset automático</div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// LISTENER DE DESAFIOS RECEBIDOS
// Verifica ao entrar no jogo se há sala aguardando este jogador
// ═══════════════════════════════════════════════════════════════════

function iniciarListenerDesafiosRecebidos() {
  if(!rtdb() || !walletAddress) return;

  // Escuta salas onde este jogador é o oponente e status = 'aguardando'
  const fila = arenaGetFila();
  rtdb().ref(`arena/salas`)
    .orderByChild(`jogadores/${walletAddress}/wallet`)
    .equalTo(walletAddress)
    .on('child_added', snap => {
      const sala = snap.val();
      if(!sala || sala.status !== 'aguardando') return;
      // Ignora salas criadas pelo próprio jogador
      const criador = Object.keys(sala.jogadores)[0];
      if(criador === walletAddress) return;

      // Notifica
      showBubble('Você foi desafiado! ⚔️');
      addLog(`Desafio recebido de ${criador.slice(0,6)}...! Abra a Arena para aceitar.`, 'info');
    });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════
window.openArena                   = openArena;
window.closeArena                  = closeArena;
window.entrarNoLobby               = entrarNoLobby;
window.sairDoLobby                 = sairDoLobby;
window.desafiarJogador             = desafiarJogador;
window.cancelarDesafio             = cancelarDesafio;
window.arenaShowTab                = arenaShowTab;
window.carregarRanking             = carregarRanking;
window.iniciarListenerDesafiosRecebidos = iniciarListenerDesafiosRecebidos;
