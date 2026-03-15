// ═══════════════════════════════════════════════════════════════════
// ARENA DIMENSIONAL — Jo-Ken-Pô Multiplayer
// Parte 1: Lobby em tempo real
// Parte 2: Partida, timer, revelação simultânea, resultado, recompensas
// ═══════════════════════════════════════════════════════════════════

function rtdb() { return typeof _rtdb !== 'undefined' ? _rtdb : null; }

// ── Constantes ──
const ARENA_TAXA       = 0.15;   // 15% para a pool semanal
const ARENA_TIMER_SEG  = 30;     // segundos por rodada
const ARENA_LOBBY_TTL  = 30000;  // 30s sem heartbeat → remove do lobby
const ARENA_MAX_RODADAS = 3;     // melhor de 3

const ARENA_APOSTAS = {
  'Comum':    { moedas: 50,  cristais: 0  },
  'Raro':     { moedas: 0,   cristais: 10 },
  'Lendário': { moedas: 0,   cristais: 20 },
};

const ARENA_PONTOS = { vitoria: 3, derrota: 1, abandono: 0 };

const JKP_EMOJIS  = { pedra: '🪨', papel: '📄', tesoura: '✂️' };
const JKP_OPCOES  = ['pedra', 'papel', 'tesoura'];
// vence[a] contém o que 'a' derrota
const JKP_VENCE   = { pedra: 'tesoura', tesoura: 'papel', papel: 'pedra' };

// ── Estado da arena ──
let arenaAtiva       = false;
let arenaPartidaId   = null;
let arenaLobbyRef    = null;
let arenaHeartbeat   = null;
let arenaListeners   = [];
let arenaLobbySnap   = null;
let arenaTimerInterval = null;
let arenaTimerSeg    = ARENA_TIMER_SEG;
let arenaEscolhaFeita = false;  // evita duplo clique na rodada

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function arenaGetRaridade() { return avatar?.raridade || 'Comum'; }
function arenaGetFila()      { return arenaGetRaridade(); }
function arenaGetAposta()    { return ARENA_APOSTAS[arenaGetRaridade()]; }
function arenaTaxaPool(v)    { return Math.floor(v * ARENA_TAXA); }
function arenaVencedorLeva(v){ return v - arenaTaxaPool(v); }

function arenaPodePagar() {
  const a = arenaGetAposta();
  return a.cristais > 0 ? gs.cristais >= a.cristais : gs.moedas >= a.moedas;
}

function arenaDescricaoAposta() {
  const a = arenaGetAposta();
  return a.cristais > 0 ? `${a.cristais} 💎` : `${a.moedas} 🪙`;
}

function arenaDebitarAposta() {
  const a = arenaGetAposta();
  if(a.cristais > 0) gs.cristais -= a.cristais;
  else               gs.moedas   -= a.moedas;
  updateResourceUI();
}

function arenaCreditarPremio(valorBruto, usaCristais) {
  const liquido = arenaVencedorLeva(valorBruto);
  if(usaCristais) gs.cristais += liquido;
  else            gs.moedas   += liquido;
  updateResourceUI();
  scheduleSave();
}

function jkpResultado(minha, dele) {
  if(minha === dele) return 'empate';
  return JKP_VENCE[minha] === dele ? 'vitoria' : 'derrota';
}

function jkpEscolhaAleatoria() {
  return JKP_OPCOES[Math.floor(Math.random() * 3)];
}

// ═══════════════════════════════════════════════════════════════════
// ABRIR / FECHAR MODAL
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
  pararTimer();
  ModalManager.close('arenaModal');
}

// ═══════════════════════════════════════════════════════════════════
// RENDER LOBBY
// ═══════════════════════════════════════════════════════════════════

function renderArenaModal() {
  const el = document.getElementById('arenaModal');
  if(!el) return;

  const raridade  = arenaGetRaridade();
  const aposta    = arenaGetAposta();
  const podePagar = arenaPodePagar();

  el.innerHTML = `
    <button class="gs-x-btn" onclick="closeArena()">✕</button>

    <div class="arena-header">
      <div class="arena-title">⚔️ ARENA DIMENSIONAL</div>
      <div class="arena-sub">Jo-Ken-Pô ao vivo · Fila <b style="color:var(--gold)">${raridade.toUpperCase()}</b> · ${
        raridade === 'Comum'    ? '🟢 Aposta em 🪙' :
        raridade === 'Raro'     ? '🔵 Aposta em 💎' :
                                  '🟡 Aposta em 💎'
      }</div>
      <div style="font-size:6px;color:var(--muted);margin-top:2px;">Apenas avatares ${raridade} aparecem nesta fila</div>
    </div>

    <div class="arena-tabs">
      <button class="arena-tab active" id="tabLobby"   onclick="arenaShowTab('lobby')">🏟️ LOBBY</button>
      <button class="arena-tab"        id="tabRanking" onclick="arenaShowTab('ranking')">🏆 RANKING</button>
    </div>

    <div id="arenaTabLobby" class="arena-tab-content">
      <div class="arena-aposta-info">
        <span>Aposta: <b>${arenaDescricaoAposta()}</b></span>
        <span>Vencedor leva: <b>${
          aposta.cristais > 0
            ? `${arenaVencedorLeva(aposta.cristais * 2)} 💎`
            : `${arenaVencedorLeva(aposta.moedas   * 2)} 🪙`
        }</b></span>
        <span style="color:var(--muted);font-size:6px;">15% → pool do ranking</span>
      </div>

      <div class="arena-lobby-actions">
        ${arenaAtiva
          ? `<button class="arena-btn-sair" onclick="sairDoLobby()">⬅ SAIR DA FILA</button>
             <div class="arena-aguardando">
               <div class="arena-pulse"></div>Aguardando oponente...
             </div>`
          : `<button class="arena-btn-entrar ${!podePagar ? 'disabled' : ''}"
               onclick="${podePagar ? 'entrarNoLobby()' : ''}"
               ${!podePagar ? 'disabled' : ''}>
               ⚔️ ENTRAR NA FILA
             </button>
             ${!podePagar ? `<div class="arena-sem-saldo">Saldo insuficiente (${arenaDescricaoAposta()} necessário)</div>` : ''}`
        }
      </div>

      <div class="arena-lobby-titulo">Avatares na fila ${raridade}</div>
      <div class="arena-lobby-lista" id="arenaLobbyLista">
        <div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>
      </div>
    </div>

    <div id="arenaTabRanking" class="arena-tab-content" style="display:none;">
      <div class="arena-ranking-wrap" id="arenaRankingWrap">
        <div class="arena-lobby-vazio">Carregando ranking...</div>
      </div>
      <div class="arena-pool-info" id="arenaPoolInfo"></div>
    </div>
  `;

  iniciarLobbyListener();
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

  const fila = arenaGetFila();
  arenaLobbyRef = rtdb().ref(`arena/lobby/${fila}/${walletAddress}`);

  await arenaLobbyRef.set({
    wallet:    walletAddress,
    nome:      avatar.nome.split(',')[0],
    raridade:  avatar.raridade,
    elemento:  avatar.elemento,
    nivel,
    vinculo:   Math.floor(vinculo),
    seed:      avatar.seed,
    ts:        firebase.database.ServerValue.TIMESTAMP,
    emPartida: false,
  });

  arenaLobbyRef.onDisconnect().remove();

  arenaHeartbeat = setInterval(async () => {
    if(arenaLobbyRef) await arenaLobbyRef.update({ ts: firebase.database.ServerValue.TIMESTAMP });
  }, 10000);

  arenaAtiva = true;
  addLog('Entrou na fila da Arena! ⚔️', 'info');
  renderArenaModal();
}

async function sairDoLobby() {
  if(arenaLobbyRef) { await arenaLobbyRef.remove(); arenaLobbyRef = null; }
  if(arenaHeartbeat){ clearInterval(arenaHeartbeat); arenaHeartbeat = null; }
  arenaListeners.forEach(u => { try { u(); } catch(e){} });
  arenaListeners = [];
  arenaAtiva = false;
}

// ═══════════════════════════════════════════════════════════════════
// LISTENER DO LOBBY
// ═══════════════════════════════════════════════════════════════════

function iniciarLobbyListener() {
  if(!rtdb()) return;
  if(arenaLobbySnap) rtdb().ref(`arena/lobby/${arenaGetFila()}`).off('value', arenaLobbySnap);

  const ref = rtdb().ref(`arena/lobby/${arenaGetFila()}`);
  arenaLobbySnap = ref.on('value', snap => {
    const lista = document.getElementById('arenaLobbyLista');
    if(!lista) return;

    const dados = snap.val() || {};
    const agora = Date.now();

    const avatares = Object.entries(dados)
      .filter(([w, d]) => {
        if(w === walletAddress) return false;
        if(d.emPartida) return false;
        // ts pode ser null se ainda não foi resolvido pelo servidor — aceita nesses casos
        if(!d.ts || typeof d.ts !== 'number') return true;
        return (agora - d.ts) < ARENA_LOBBY_TTL;
      })
      .sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));

    if(!avatares.length) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum avatar na fila ainda...</div>';
      return;
    }

    lista.innerHTML = avatares.map(([wallet, d]) => `
      <div class="arena-lobby-card">
        <div class="arena-lobby-svg">${gerarSVG(d.elemento, d.raridade, d.seed, 36, 36)}</div>
        <div class="arena-lobby-info">
          <div class="arena-lobby-nome">${d.nome}</div>
          <div class="arena-lobby-meta">NV ${d.nivel} · ${d.raridade} · Vínculo ${d.vinculo}</div>
        </div>
        ${arenaAtiva
          ? `<button class="arena-btn-desafiar" onclick="desafiarJogador('${wallet}')">⚔️ DESAFIAR</button>`
          : `<div class="arena-lobby-aguarda">Entre na fila para desafiar</div>`}
      </div>
    `).join('');
  });
}

// ═══════════════════════════════════════════════════════════════════
// DESAFIAR JOGADOR
// ═══════════════════════════════════════════════════════════════════

async function desafiarJogador(walletOponente) {
  if(!arenaAtiva || !rtdb()) return;

  const aposta = arenaGetAposta();
  const fila   = arenaGetFila();
  const salaId = `${walletAddress}_${walletOponente}_${Date.now()}`;

  const sala = {
    id: salaId, fila,
    status: 'aguardando',
    aposta,
    jogadores: {
      [walletAddress]: {
        wallet: walletAddress,
        nome:     avatar.nome.split(',')[0],
        raridade: avatar.raridade,
        elemento: avatar.elemento,
        seed:     avatar.seed,
        nivel,
        escolha:  null,
        pronto:   false,
      },
      [walletOponente]: {
        wallet: walletOponente,
        nome: null, escolha: null, pronto: false,
      }
    },
    rodada:     1,
    placar:     { [walletAddress]: 0, [walletOponente]: 0 },
    criadoEm:   firebase.database.ServerValue.TIMESTAMP,
    expiradoEm: Date.now() + 120000,
    taxaPool:   aposta.cristais > 0
      ? arenaTaxaPool(aposta.cristais * 2)
      : arenaTaxaPool(aposta.moedas  * 2),
  };

  await rtdb().ref(`arena/salas/${salaId}`).set(sala);
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(true);
  await rtdb().ref(`arena/lobby/${fila}/${walletOponente}/emPartida`).set(true);

  // Debita aposta imediatamente ao desafiar
  arenaDebitarAposta();

  arenaPartidaId = salaId;
  addLog(`Desafio enviado! Aguardando ${walletOponente.slice(0,6)}...`, 'info');
  showBubble('Desafio enviado! ⚔️');
  abrirSalaEspera(salaId);
}

async function cancelarDesafio(salaId) {
  if(!rtdb()) return;
  await rtdb().ref(`arena/salas/${salaId}`).update({ status: 'cancelada' });
  const fila = arenaGetFila();
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(false);
  // Devolve aposta
  const a = arenaGetAposta();
  if(a.cristais > 0) gs.cristais += a.cristais;
  else               gs.moedas   += a.moedas;
  updateResourceUI();
  arenaPartidaId = null;
  renderArenaModal();
}

// ═══════════════════════════════════════════════════════════════════
// SALA DE ESPERA — aguarda oponente aceitar
// ═══════════════════════════════════════════════════════════════════

function abrirSalaEspera(salaId) {
  const el = document.getElementById('arenaModal');
  if(!el) return;

  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title" style="margin-bottom:6px;">⚔️ ARENA DIMENSIONAL</div>
      <div class="arena-pulse" style="margin:16px auto;"></div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;">DESAFIO ENVIADO</div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">Aguardando o oponente aceitar...</div>
      <div style="font-size:6px;color:var(--muted);margin-top:4px;">Sala #${salaId.slice(-6).toUpperCase()}</div>
      <button class="arena-btn-sair" style="margin-top:20px;" onclick="cancelarDesafio('${salaId}')">✕ CANCELAR</button>
    </div>
  `;

  // Listener — avança quando oponente aceitar
  const salaRef = rtdb().ref(`arena/salas/${salaId}`);
  salaRef.on('value', snap => {
    const sala = snap.val();
    if(!sala) return;
    if(sala.status === 'em_jogo') {
      salaRef.off('value');
      abrirPartida(salaId, sala);
    }
    if(sala.status === 'cancelada' || sala.status === 'recusada') {
      salaRef.off('value');
      // Devolve aposta se oponente recusou
      const a = arenaGetAposta();
      if(a.cristais > 0) gs.cristais += a.cristais;
      else               gs.moedas   += a.moedas;
      updateResourceUI();
      arenaPartidaId = null;
      addLog('Desafio recusado ou cancelado.', 'bad');
      renderArenaModal();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// ACEITAR DESAFIO — chamado pelo Jogador B
// ═══════════════════════════════════════════════════════════════════

async function aceitarDesafio(salaId) {
  if(!rtdb() || !walletAddress || !avatar) return;
  if(!arenaPodePagar()) { showBubble('Saldo insuficiente para aceitar!'); return; }

  arenaDebitarAposta();
  arenaPartidaId = salaId;

  // Preenche dados do Jogador B e muda status para em_jogo
  await rtdb().ref(`arena/salas/${salaId}`).update({
    status: 'em_jogo',
    [`jogadores/${walletAddress}/nome`]:     avatar.nome.split(',')[0],
    [`jogadores/${walletAddress}/raridade`]: avatar.raridade,
    [`jogadores/${walletAddress}/elemento`]: avatar.elemento,
    [`jogadores/${walletAddress}/seed`]:     avatar.seed,
    [`jogadores/${walletAddress}/nivel`]:    nivel,
  });

  const fila = arenaGetFila();
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(true);

  const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
  abrirPartida(salaId, snap.val());
}

async function recusarDesafio(salaId) {
  if(!rtdb()) return;
  await rtdb().ref(`arena/salas/${salaId}`).update({ status: 'recusada' });
  addLog('Desafio recusado.', 'info');
  renderArenaModal();
}

// ═══════════════════════════════════════════════════════════════════
// TELA DA PARTIDA
// ═══════════════════════════════════════════════════════════════════

function abrirPartida(salaId, sala) {
  pararTimer();
  arenaEscolhaFeita = false;
  const el = document.getElementById('arenaModal');
  if(!el) return;

  const wallets   = Object.keys(sala.jogadores);
  const meuDado   = sala.jogadores[walletAddress];
  const opWallet  = wallets.find(w => w !== walletAddress);
  const opDado    = sala.jogadores[opWallet];
  const placar    = sala.placar || {};
  const rodada    = sala.rodada || 1;
  const aposta    = sala.aposta;
  const usaCris   = aposta.cristais > 0;
  const valorBruto= usaCris ? aposta.cristais * 2 : aposta.moedas * 2;

  el.innerHTML = `
    <div class="arena-partida">

      <!-- Cabeçalho -->
      <div class="arena-partida-header">
        <div class="arena-title" style="font-size:8px;">⚔️ PARTIDA · RODADA ${rodada}/${ARENA_MAX_RODADAS}</div>
        <div class="arena-aposta-info" style="flex-direction:row;padding:5px 10px;gap:10px;">
          <span>💰 ${arenaVencedorLeva(valorBruto)} ${usaCris ? '💎' : '🪙'} em jogo</span>
          <span style="color:var(--muted);">Sala #${salaId.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      <!-- VS -->
      <div class="arena-vs-row">
        <!-- Meu avatar -->
        <div class="arena-vs-lado" id="arenaVsEu">
          <div class="arena-vs-svg">${gerarSVG(meuDado.elemento, meuDado.raridade, meuDado.seed, 52, 52)}</div>
          <div class="arena-vs-nome">${meuDado.nome || 'Você'}</div>
          <div class="arena-vs-pts">${placar[walletAddress] || 0} pt${(placar[walletAddress]||0)!==1?'s':''}</div>
          <div class="arena-vs-escolha" id="arenaEscolhaEu">❓</div>
        </div>

        <div class="arena-vs-centro">
          <div class="arena-vs-label">VS</div>
          <!-- Timer -->
          <div class="arena-timer" id="arenaTimer">${ARENA_TIMER_SEG}</div>
          <div style="font-size:6px;color:var(--muted);">segundos</div>
        </div>

        <!-- Oponente -->
        <div class="arena-vs-lado" id="arenaVsOp">
          <div class="arena-vs-svg">${gerarSVG(opDado.elemento || 'Fogo', opDado.raridade || 'Comum', opDado.seed || 0, 52, 52)}</div>
          <div class="arena-vs-nome">${opDado.nome || opWallet.slice(0,6)+'...'}</div>
          <div class="arena-vs-pts">${placar[opWallet] || 0} pt${(placar[opWallet]||0)!==1?'s':''}</div>
          <div class="arena-vs-escolha" id="arenaEscolhaOp">❓</div>
        </div>
      </div>

      <!-- Status -->
      <div class="arena-partida-status" id="arenaPartidaStatus">Escolha sua jogada!</div>

      <!-- Botões de escolha -->
      <div class="arena-escolhas" id="arenaEscolhas">
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','pedra')">🪨<span>PEDRA</span></button>
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','papel')">📄<span>PAPEL</span></button>
        <button class="arena-escolha-btn" onclick="fazerEscolha('${salaId}','tesoura')">✂️<span>TESOURA</span></button>
      </div>

      <!-- Resultado da rodada (oculto até revelação) -->
      <div class="arena-rodada-resultado" id="arenaRodadaResultado" style="display:none;"></div>

    </div>
  `;

  // Inicia timer
  iniciarTimer(salaId, opWallet);

  // Listener da sala para detectar quando os dois escolheram
  const salaRef = rtdb().ref(`arena/salas/${salaId}`);
  salaRef.on('value', snap => {
    const s = snap.val();
    if(!s) return;

    // Atualiza placar em tempo real
    const plEl = document.getElementById('arenaVsEu');
    const opEl = document.getElementById('arenaVsOp');
    if(s.placar && plEl && opEl) {
      const ptsEu = s.placar[walletAddress] || 0;
      const ptsOp = s.placar[opWallet]      || 0;
      plEl.querySelector('.arena-vs-pts').textContent = `${ptsEu} pt${ptsEu!==1?'s':''}`;
      opEl.querySelector('.arena-vs-pts').textContent = `${ptsOp} pt${ptsOp!==1?'s':''}`;
    }

    // Os dois escolheram — revelar
    const jEu = s.jogadores?.[walletAddress];
    const jOp = s.jogadores?.[opWallet];
    if(jEu?.pronto && jOp?.pronto && jEu?.escolha && jOp?.escolha) {
      salaRef.off('value');
      pararTimer();
      revelarRodada(salaId, s, opWallet);
    }

    // Partida finalizada
    if(s.status === 'finalizada') {
      salaRef.off('value');
      pararTimer();
      mostrarResultadoFinal(s, opWallet);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// FAZER ESCOLHA
// ═══════════════════════════════════════════════════════════════════

async function fazerEscolha(salaId, escolha) {
  if(arenaEscolhaFeita || !rtdb()) return;
  arenaEscolhaFeita = true;
  pararTimer();

  // Atualiza UI — mostra que escolheu (sem revelar)
  const euEl = document.getElementById('arenaEscolhaEu');
  if(euEl) euEl.textContent = '✅';
  const statusEl = document.getElementById('arenaPartidaStatus');
  if(statusEl) statusEl.textContent = 'Aguardando oponente...';

  // Desabilita botões
  document.querySelectorAll('.arena-escolha-btn').forEach(b => b.disabled = true);

  // Grava escolha no RTDB
  await rtdb().ref(`arena/salas/${salaId}/jogadores/${walletAddress}`).update({
    escolha,
    pronto: true,
  });
}

// ═══════════════════════════════════════════════════════════════════
// TIMER
// ═══════════════════════════════════════════════════════════════════

function iniciarTimer(salaId, opWallet) {
  arenaTimerSeg = ARENA_TIMER_SEG;
  arenaTimerInterval = setInterval(async () => {
    arenaTimerSeg--;
    const timerEl = document.getElementById('arenaTimer');
    if(timerEl) {
      timerEl.textContent = arenaTimerSeg;
      timerEl.className = 'arena-timer' + (arenaTimerSeg <= 10 ? ' urgente' : '');
    }
    if(arenaTimerSeg <= 0) {
      pararTimer();
      if(!arenaEscolhaFeita) {
        // Jogada aleatória ao esgotar o tempo
        await fazerEscolha(salaId, jkpEscolhaAleatoria());
      }
    }
  }, 1000);
}

function pararTimer() {
  if(arenaTimerInterval) { clearInterval(arenaTimerInterval); arenaTimerInterval = null; }
}

// ═══════════════════════════════════════════════════════════════════
// REVELAR RODADA
// ═══════════════════════════════════════════════════════════════════

async function revelarRodada(salaId, sala, opWallet) {
  const jEu = sala.jogadores[walletAddress];
  const jOp = sala.jogadores[opWallet];
  const res = jkpResultado(jEu.escolha, jOp.escolha);

  // Anima revelação
  const euEl = document.getElementById('arenaEscolhaEu');
  const opEl = document.getElementById('arenaEscolhaOp');
  if(euEl) euEl.textContent = JKP_EMOJIS[jEu.escolha];
  if(opEl) opEl.textContent = JKP_EMOJIS[jOp.escolha];

  // Mostra resultado da rodada
  const rodEl = document.getElementById('arenaRodadaResultado');
  if(rodEl) {
    rodEl.style.display = '';
    const msgs = { vitoria: '✅ VOCÊ VENCEU A RODADA!', derrota: '❌ VOCÊ PERDEU A RODADA', empate: '🤝 EMPATE' };
    const cors = { vitoria: '#7ab87a', derrota: '#e74c3c', empate: 'var(--gold)' };
    rodEl.innerHTML = `<span style="color:${cors[res]};font-family:'Cinzel',serif;font-size:10px;font-weight:700;letter-spacing:2px;">${msgs[res]}</span>`;
  }

  // Apenas o desafiante (primeiro wallet da sala) atualiza o placar para evitar duplicidade
  const wallets = Object.keys(sala.jogadores);
  const souCriador = wallets[0] === walletAddress;

  if(souCriador) {
    const novosPlacar = { ...sala.placar };
    if(res === 'vitoria')  novosPlacar[walletAddress] = (novosPlacar[walletAddress]||0) + 1;
    if(res === 'derrota')  novosPlacar[opWallet]      = (novosPlacar[opWallet]     ||0) + 1;

    const novaRodada  = (sala.rodada || 1) + 1;
    const vitoriasMeu = novosPlacar[walletAddress] || 0;
    const vitoriasOp  = novosPlacar[opWallet]      || 0;

    const alguemVenceu = vitoriasMeu >= 2 || vitoriasOp >= 2 || novaRodada > ARENA_MAX_RODADAS;

    await rtdb().ref(`arena/salas/${salaId}`).update({
      placar:  novosPlacar,
      rodada:  novaRodada,
      status:  alguemVenceu ? 'finalizada' : 'em_jogo',
      vencedor: alguemVenceu
        ? (vitoriasMeu > vitoriasOp ? walletAddress : vitoriasOp > vitoriasMeu ? opWallet : 'empate')
        : null,
    });
  }

  // Aguarda 2.5s e passa para próxima rodada ou fim
  setTimeout(async () => {
    const snap = await rtdb().ref(`arena/salas/${salaId}`).once('value');
    const s = snap.val();
    if(!s) return;

    if(s.status === 'finalizada') {
      mostrarResultadoFinal(s, opWallet);
    } else {
      // Limpa escolhas para a próxima rodada
      await rtdb().ref(`arena/salas/${salaId}/jogadores/${walletAddress}`).update({ escolha: null, pronto: false });
      arenaEscolhaFeita = false;
      abrirPartida(salaId, s);
    }
  }, 2500);
}

// ═══════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ═══════════════════════════════════════════════════════════════════

async function mostrarResultadoFinal(sala, opWallet) {
  pararTimer();
  const el = document.getElementById('arenaModal');
  if(!el) return;

  const vencedor    = sala.vencedor;
  const euVenci     = vencedor === walletAddress;
  const empate      = vencedor === 'empate';
  const aposta      = sala.aposta;
  const usaCris     = aposta.cristais > 0;
  const valorBruto  = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;
  const premio      = arenaVencedorLeva(valorBruto);
  const moeda       = usaCris ? '💎' : '🪙';

  const meuDado = sala.jogadores[walletAddress];
  const opDado  = sala.jogadores[opWallet];
  const placar  = sala.placar || {};

  // Distribui recompensas (só o criador executa para evitar duplicidade)
  const wallets    = Object.keys(sala.jogadores);
  const souCriador = wallets[0] === walletAddress;
  if(souCriador && !sala.recompensaDistribuida) {
    await distribuirRecompensas(sala, opWallet);
  }

  // Pontos de ranking
  const pts = empate ? 1 : euVenci ? ARENA_PONTOS.vitoria : ARENA_PONTOS.derrota;
  await atualizarRanking(sala, opWallet, euVenci, empate);

  // Limpa lobby
  const fila = arenaGetFila();
  await rtdb().ref(`arena/lobby/${fila}/${walletAddress}/emPartida`).set(false);
  arenaPartidaId = null;
  sairDoLobby();

  const titulo = empate ? '🤝 EMPATE!' : euVenci ? '🏆 VITÓRIA!' : '💀 DERROTA';
  const corTit = empate ? 'var(--gold)' : euVenci ? '#7ab87a' : '#e74c3c';

  el.innerHTML = `
    <div class="arena-resultado">
      <div class="arena-resultado-titulo" style="color:${corTit};">${titulo}</div>

      <div class="arena-vs-row" style="margin:14px 0;">
        <div class="arena-vs-lado ${euVenci ? 'arena-vencedor' : ''}">
          <div class="arena-vs-svg">${gerarSVG(meuDado.elemento, meuDado.raridade, meuDado.seed, 52, 52)}</div>
          <div class="arena-vs-nome">${meuDado.nome || 'Você'}</div>
          <div class="arena-vs-pts" style="font-size:14px;">${placar[walletAddress]||0}</div>
        </div>
        <div class="arena-vs-centro">
          <div class="arena-vs-label">VS</div>
        </div>
        <div class="arena-vs-lado ${!euVenci && !empate ? 'arena-vencedor' : ''}">
          <div class="arena-vs-svg">${gerarSVG(opDado.elemento||'Fogo', opDado.raridade||'Comum', opDado.seed||0, 52, 52)}</div>
          <div class="arena-vs-nome">${opDado.nome || opWallet.slice(0,6)+'...'}</div>
          <div class="arena-vs-pts" style="font-size:14px;">${placar[opWallet]||0}</div>
        </div>
      </div>

      <!-- Recompensas -->
      <div class="arena-recompensa-card">
        ${empate
          ? `<div style="color:var(--muted);font-size:7px;">Empate — apostas devolvidas</div>`
          : euVenci
            ? `<div style="color:#7ab87a;font-family:'Cinzel',serif;font-size:8px;">+${premio} ${moeda} recebidos!</div>
               <div style="color:var(--muted);font-size:6px;">+${ARENA_PONTOS.vitoria} pontos no ranking</div>`
            : `<div style="color:#e74c3c;font-size:7px;">Melhor sorte na próxima!</div>
               <div style="color:var(--muted);font-size:6px;">+${ARENA_PONTOS.derrota} ponto no ranking</div>`
        }
      </div>

      <div style="display:flex;gap:8px;margin-top:14px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:7px;" onclick="renderArenaModal()">⚔️ JOGAR DE NOVO</button>
        <button class="arena-btn-sair" onclick="closeArena()">✕ FECHAR</button>
      </div>
    </div>
  `;

  addLog(`Arena: ${titulo} contra ${opDado.nome || opWallet.slice(0,6)}`, euVenci ? 'good' : empate ? 'info' : 'bad');
  if(euVenci) showBubble(`Vitória! +${premio} ${moeda} 🏆`);
}

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUIR RECOMPENSAS
// ═══════════════════════════════════════════════════════════════════

async function distribuirRecompensas(sala, opWallet) {
  const aposta   = sala.aposta;
  const usaCris  = aposta.cristais > 0;
  const vencedor = sala.vencedor;
  const fila     = sala.fila;
  const taxa     = sala.taxaPool || 0;

  // Marca como distribuída para evitar duplicidade
  await rtdb().ref(`arena/salas/${sala.id}/recompensaDistribuida`).set(true);

  // Acumula taxa na pool semanal
  if(taxa > 0) {
    const poolRef = rtdb().ref(`arena/pool/${fila}`);
    const poolSnap = await poolRef.once('value');
    await poolRef.set((poolSnap.val() || 0) + taxa);
  }

  // Credita prêmio ao vencedor local (apenas para o próprio jogador)
  if(vencedor === walletAddress) {
    const valorBruto = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;
    arenaCreditarPremio(valorBruto, usaCris);
  } else if(vencedor === 'empate') {
    // Devolve aposta em empate
    if(usaCris) gs.cristais += aposta.cristais;
    else        gs.moedas   += aposta.moedas;
    updateResourceUI();
    scheduleSave();
  }
  // Em derrota: aposta já foi debitada, não faz nada
}

// ═══════════════════════════════════════════════════════════════════
// ATUALIZAR RANKING
// ═══════════════════════════════════════════════════════════════════

async function atualizarRanking(sala, opWallet, euVenci, empate) {
  if(!rtdb() || !walletAddress) return;
  const fila     = sala.fila;
  const rankRef  = rtdb().ref(`arena/ranking/${fila}/${walletAddress}`);
  const snap     = await rankRef.once('value');
  const atual    = snap.val() || { pontos:0, vitorias:0, derrotas:0, empates:0, nome:'' };

  const pts = empate ? 1 : euVenci ? ARENA_PONTOS.vitoria : ARENA_PONTOS.derrota;

  await rankRef.set({
    nome:     avatar?.nome?.split(',')[0] || atual.nome,
    pontos:   (atual.pontos   || 0) + pts,
    vitorias: (atual.vitorias || 0) + (euVenci ? 1 : 0),
    derrotas: (atual.derrotas || 0) + (!euVenci && !empate ? 1 : 0),
    empates:  (atual.empates  || 0) + (empate ? 1 : 0),
    updatedAt: firebase.database.ServerValue.TIMESTAMP,
  });
}

// ═══════════════════════════════════════════════════════════════════
// ACEITAR DESAFIO — card de notificação
// Aparece quando o jogador abre a Arena e há um desafio pendente
// ═══════════════════════════════════════════════════════════════════

function renderCardDesafioPendente(sala) {
  const wallets  = Object.keys(sala.jogadores);
  const opWallet = wallets.find(w => w !== walletAddress);
  const opDado   = sala.jogadores[opWallet];
  const aposta   = sala.aposta;
  const usaCris  = aposta.cristais > 0;
  const moeda    = usaCris ? '💎' : '🪙';
  const valorAp  = usaCris ? aposta.cristais : aposta.moedas;

  return `
    <div class="arena-desafio-card">
      <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:2px;margin-bottom:6px;">⚔️ DESAFIO RECEBIDO</div>
      <div style="font-size:7px;color:var(--text);margin-bottom:2px;">${opDado.nome || opWallet.slice(0,8)+'...'}</div>
      <div style="font-size:6px;color:var(--muted);margin-bottom:10px;">NV ${opDado.nivel||'?'} · ${opDado.raridade||'?'} · Aposta: ${valorAp} ${moeda}</div>
      <div style="display:flex;gap:8px;">
        <button class="arena-btn-entrar" style="font-size:7px;padding:6px;" onclick="aceitarDesafio('${sala.id}')">✅ ACEITAR</button>
        <button class="arena-btn-sair" onclick="recusarDesafio('${sala.id}')">✕ RECUSAR</button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════
// RANKING
// ═══════════════════════════════════════════════════════════════════

async function carregarRanking() {
  const wrap = document.getElementById('arenaRankingWrap');
  const pool = document.getElementById('arenaPoolInfo');
  if(!wrap || !rtdb()) return;

  const fila = arenaGetFila();
  const snap = await rtdb().ref(`arena/ranking/${fila}`)
    .orderByChild('pontos').limitToLast(10).once('value');

  const dados = snap.val() || {};
  const lista = Object.entries(dados)
    .map(([w,d]) => ({ wallet:w, ...d }))
    .sort((a,b) => b.pontos - a.pontos);

  const medalhas = ['🥇','🥈','🥉'];
  wrap.innerHTML = lista.length === 0
    ? '<div class="arena-lobby-vazio">Nenhuma partida disputada ainda.</div>'
    : lista.map((d,i) => `
        <div class="arena-rank-row ${d.wallet===walletAddress?'arena-rank-meu':''}">
          <span class="arena-rank-pos">${medalhas[i]||`#${i+1}`}</span>
          <span class="arena-rank-nome">${d.nome||d.wallet.slice(0,8)+'...'}</span>
          <span class="arena-rank-pts">${d.pontos||0} pts</span>
          <span class="arena-rank-wl">${d.vitorias||0}V ${d.derrotas||0}D</span>
        </div>
      `).join('');

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
// LISTENER DE DESAFIOS RECEBIDOS (ao entrar no jogo)
// ═══════════════════════════════════════════════════════════════════

function iniciarListenerDesafiosRecebidos() {
  if(!rtdb() || !walletAddress) return;

  // Escuta TODAS as salas com status 'aguardando' e filtra client-side
  // (RTDB não suporta orderByChild em campos aninhados)
  rtdb().ref('arena/salas')
    .orderByChild('status')
    .equalTo('aguardando')
    .on('child_added', snap => {
      const sala = snap.val();
      if(!sala) return;

      // Verifica se este jogador é o oponente (não o criador)
      const wallets = Object.keys(sala.jogadores || {});
      if(wallets.length < 2) return;
      const criador = wallets[0];
      if(criador === walletAddress) return;         // ignoro salas que eu criei
      if(!sala.jogadores[walletAddress]) return;    // não sou o oponente desta sala

      showBubble('Você foi desafiado! ⚔️');
      addLog(`Desafio recebido! Abra a Arena para aceitar.`, 'info');

      // Se a arena já estiver aberta, injeta o card
      const el = document.getElementById('arenaModal');
      if(el && el.classList.contains('open')) {
        const lista = document.getElementById('arenaLobbyLista');
        if(lista) {
          const card = document.createElement('div');
          card.innerHTML = renderCardDesafioPendente(sala);
          lista.prepend(card.firstChild);
        }
      }
    });
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════
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
window.carregarRanking                  = carregarRanking;
window.iniciarListenerDesafiosRecebidos = iniciarListenerDesafiosRecebidos;
