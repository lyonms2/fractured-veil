// ═══════════════════════════════════════════════════════════════════
// ROUBA MONTE — Duelo Multiplayer
// Usa Firebase Realtime Database (mesmo padrão da Arena)
// ═══════════════════════════════════════════════════════════════════

// ── Constantes ──
const RM_LOBBY_TTL   = 300000; // 5 min
const RM_TIMER_SEG   = 30;     // segundos por turno
const RM_TAXA        = 0.10;   // 10% para a pool
const RM_APOSTAS     = {
  'Comum':    { moedas: 40,  cristais: 0  },
  'Raro':     { moedas: 0,   cristais: 8  },
  'Lendário': { moedas: 0,   cristais: 15 },
};

// ── Estado local ──
let _rmAtiva         = false;
let _rmSalaId        = null;
let _rmLobbyRef      = null;
let _rmLobbyListRef  = null;
let _rmHeartbeat     = null;
let _rmSalaListener  = null;
let _rmTimerInterval = null;
let _rmCartaSel      = null;
let _rmUltimoTurno   = null;

// ── Helpers ──
function _rmRtdb()     { return typeof _rtdb !== 'undefined' ? _rtdb : null; }
function _rmRaridade() { return avatar?.raridade || 'Comum'; }
function _rmAposta()   { return RM_APOSTAS[_rmRaridade()]; }
function _rmPodePagar() {
  const a = _rmAposta();
  return a.cristais > 0 ? (gs.cristais||0) >= a.cristais : (gs.moedas||0) >= a.moedas;
}
function _rmDescAposta() {
  const a = _rmAposta();
  return a.cristais > 0 ? `${a.cristais} 💎` : `${a.moedas} 🪙`;
}
function _rmDebitarAposta() {
  const a = _rmAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) - a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) - a.moedas;
  updateResourceUI();
}
function _rmCreditarPremio(bruto, usaCris) {
  const taxa = Math.floor(bruto * RM_TAXA);
  const v    = bruto - taxa;
  if(usaCris) gs.cristais = (gs.cristais||0) + v;
  else        gs.moedas   = (gs.moedas  ||0) + v;
  updateResourceUI();
  scheduleSave();
}
function _rmPararTimer() {
  if(_rmTimerInterval) { clearInterval(_rmTimerInterval); _rmTimerInterval = null; }
}
function _rmPararLobby() {
  if(_rmLobbyListRef) { _rmLobbyListRef.off('value'); _rmLobbyListRef = null; }
}
function _rmPararSala() {
  if(_rmSalaListener) { _rmSalaListener.off('value'); _rmSalaListener = null; }
}

// RTDB converte arrays em objectos — converte de volta
function _rmToArray(val) {
  if(!val) return [];
  if(Array.isArray(val)) return val;
  return Object.keys(val).sort((a,b) => Number(a)-Number(b)).map(k => val[k]);
}

// ── Baralho para Rouba Monte ──
function _rmGerarBaralho() {
  if(typeof generateDeck === 'function') {
    const deck = generateDeck().filter(c => !c.isCoringa);
    return _rmEmbaralhar(deck);
  }
  const naipes  = ['♥','♠','♦','♣'];
  const valores = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const ordens  = {'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13};
  const cores   = {'♥':'#ef4444','♠':'#a78bfa','♦':'#f0d080','♣':'#7ab87a'};
  const deck = [];
  for(const n of naipes) for(const v of valores)
    deck.push({ id:`${v}${n}`, label:v, naipe:n, cor:cores[n], ordem:ordens[v] });
  return _rmEmbaralhar(deck);
}

function _rmEmbaralhar(deck) {
  const d = [...deck];
  for(let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function _rmSerCarta(c) {
  return { id: c.id, label: c.label, naipe: c.naipe, cor: c.cor||'#e8a030', ordem: c.ordem||0 };
}
function _rmSerDeck(deck) { return deck.map(_rmSerCarta); }

// ═══════════════════════════════════════════════════════════════════
// ABRIR / FECHAR
// ═══════════════════════════════════════════════════════════════════

function openRoubaMonte() {
  if(!hatched || dead || !avatar) { showBubble('Precisa de um avatar ativo!'); return; }
  if(sleeping || modoRepouso)     { showBubble('Descansando agora...'); return; }
  if(!_rmRtdb())                  { showBubble('Rouba Monte indisponível'); return; }
  ModalManager.open('roubaMontModal');
  _rmRenderLobby();
}

function closeRoubaMonte() {
  _rmPararTimer();
  _rmPararLobby();
  _rmPararSala();
  if(_rmHeartbeat) { clearInterval(_rmHeartbeat); _rmHeartbeat = null; }
  ModalManager.close('roubaMontModal');
}

// ═══════════════════════════════════════════════════════════════════
// LOBBY
// ═══════════════════════════════════════════════════════════════════

function _rmRenderLobby() {
  const el = document.getElementById('roubaMontModal');
  if(!el) return;

  const rar       = _rmRaridade();
  const podePagar = _rmPodePagar();
  const aposta    = _rmAposta();
  const bruto     = aposta.cristais > 0 ? aposta.cristais * 2 : aposta.moedas * 2;
  const premio    = bruto - Math.floor(bruto * RM_TAXA);
  const usaCris   = aposta.cristais > 0;
  const moeda     = usaCris ? '💎' : '🪙';

  el.innerHTML = `
    <button class="gs-x-btn" onclick="closeRoubaMonte()">✕</button>

    <div class="arena-header">
      <div class="arena-title">🃏 ROUBA MONTE</div>
      <div class="arena-sub">Duelo de cartas · Fila <b style="color:var(--gold)">${rar.toUpperCase()}</b></div>
    </div>

    <div class="arena-aposta-info">
      <span>Aposta: <b>${_rmDescAposta()}</b></span>
      <span>Vencedor leva: <b>${premio} ${moeda}</b></span>
      <span style="color:var(--muted);font-size:6px;">10% → pool</span>
    </div>

    <div id="rmLobbyActions" style="margin:10px 0;">
      ${_rmHtmlAcoes(podePagar)}
    </div>

    <div class="arena-lobby-titulo" style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:2px;margin-bottom:6px;">
      Jogadores na fila ${rar}
    </div>
    <div class="arena-lobby-lista" id="rmLobbyLista">
      <div class="arena-lobby-vazio">Nenhum jogador na fila ainda...</div>
    </div>

    <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:6px;">
      <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--gold);letter-spacing:1px;margin-bottom:4px;">◆ COMO JOGAR</div>
      <div style="font-size:6.5px;color:var(--muted);line-height:2;">
        🃏 Cada jogador recebe 4 cartas · 4 cartas formam o monte<br>
        ♻️ Jogue uma carta — mesmo valor rouba o monte inteiro<br>
        ⚡ Trinca na mão → rouba qualquer monte<br>
        🏆 Quem tiver mais cartas quando o baralho acabar vence
      </div>
    </div>
  `;

  _rmIniciarLobbyListener();
}

function _rmHtmlAcoes(podePagar) {
  if(_rmAtiva) {
    return `
      <button class="arena-btn-sair" onclick="rmSairDoLobby()">⬅ SAIR DA FILA</button>
      <div class="arena-aguardando"><div class="arena-pulse"></div>Na fila — aguardando oponente...</div>`;
  }
  return `
    <button class="arena-btn-entrar ${!podePagar ? 'disabled' : ''}"
      onclick="${podePagar ? 'rmEntrarNoLobby()' : ''}"
      ${!podePagar ? 'disabled' : ''}>
      🃏 ENTRAR NA FILA
    </button>
    ${!podePagar ? `<div class="arena-sem-saldo">Saldo insuficiente (${_rmDescAposta()} necessário)</div>` : ''}`;
}

function _rmAtualizarAcoes() {
  const wrap = document.getElementById('rmLobbyActions');
  if(wrap) wrap.innerHTML = _rmHtmlAcoes(_rmPodePagar());
}

function _rmIniciarLobbyListener() {
  if(!_rmRtdb()) return;
  _rmPararLobby();

  const fila = _rmRaridade();
  _rmLobbyListRef = _rmRtdb().ref(`roubaMonte/lobby/${fila}`);

  _rmLobbyListRef.on('value', snap => {
    const lista = document.getElementById('rmLobbyLista');
    if(!lista) return;

    const dados = snap.val();
    if(!dados) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum jogador na fila ainda...</div>';
      return;
    }

    const myKey = (walletAddress||'').toLowerCase();
    const agora  = Date.now();

    const jogadores = Object.entries(dados).filter(([k, d]) => {
      return k.toLowerCase() !== myKey &&
             !d.emPartida &&
             (!d.ts || (agora - d.ts) < RM_LOBBY_TTL);
    });

    if(!jogadores.length) {
      lista.innerHTML = '<div class="arena-lobby-vazio">Nenhum jogador na fila ainda...</div>';
      return;
    }

    lista.innerHTML = jogadores.map(([k, d]) => `
      <div class="arena-lobby-card">
        <div class="arena-lobby-svg">${gerarSVG(d.elemento, d.raridade, d.seed, 36, 36)}</div>
        <div class="arena-lobby-info">
          <div class="arena-lobby-nome">${d.nome || '???'}</div>
          <div class="arena-lobby-meta">NV ${d.nivel||1} · ${d.raridade||'Comum'}</div>
        </div>
        ${_rmAtiva
          ? `<button class="arena-btn-desafiar" onclick="rmDesafiar('${d.wallet}')">🃏 DESAFIAR</button>`
          : `<div class="arena-lobby-aguarda">Entre na fila para desafiar</div>`}
      </div>`).join('');
  });
}

// ═══════════════════════════════════════════════════════════════════
// ENTRAR / SAIR DO LOBBY
// ═══════════════════════════════════════════════════════════════════

async function rmEntrarNoLobby() {
  if(!_rmRtdb() || !walletAddress || !avatar) return;
  if(!_rmPodePagar()) { showBubble('Saldo insuficiente!'); return; }

  const fila = _rmRaridade();
  _rmLobbyRef = _rmRtdb().ref(`roubaMonte/lobby/${fila}/${walletAddress}`);

  await _rmLobbyRef.set({
    wallet:    walletAddress,
    nome:      avatar.nome.split(',')[0],
    raridade:  avatar.raridade,
    elemento:  avatar.elemento,
    nivel:     nivel  || 1,
    seed:      avatar.seed || 0,
    ts:        firebase.database.ServerValue.TIMESTAMP,
    emPartida: false,
  });

  _rmLobbyRef.onDisconnect().remove();

  if(_rmHeartbeat) clearInterval(_rmHeartbeat);
  _rmHeartbeat = setInterval(() => {
    if(_rmLobbyRef) _rmLobbyRef.update({ ts: firebase.database.ServerValue.TIMESTAMP });
  }, 10000);

  _rmAtiva = true;
  addLog('Entrou na fila do Rouba Monte! 🃏', 'info');
  _rmAtualizarAcoes();
}

async function rmSairDoLobby() {
  if(_rmLobbyRef) {
    try { await _rmLobbyRef.remove(); } catch(e){}
    _rmLobbyRef = null;
  }
  if(_rmHeartbeat) { clearInterval(_rmHeartbeat); _rmHeartbeat = null; }
  _rmAtiva = false;
  addLog('Saiu da fila do Rouba Monte.', 'info');
  _rmAtualizarAcoes();
}

// ═══════════════════════════════════════════════════════════════════
// DESAFIAR
// ═══════════════════════════════════════════════════════════════════

async function rmDesafiar(walletOponente) {
  if(!_rmAtiva || !_rmRtdb()) return;

  const aposta = _rmAposta();
  const fila   = _rmRaridade();
  const salaId = `rm_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

  const deck     = _rmGerarBaralho();
  const maoEu    = _rmSerDeck(deck.slice(0,  4));
  const maoOp    = _rmSerDeck(deck.slice(4,  8));
  const monte    = _rmSerDeck(deck.slice(8, 12));
  const restante = _rmSerDeck(deck.slice(12));

  const sala = {
    id:        salaId,
    fila,
    status:    'aguardando',
    criador:   walletAddress,
    oponente:  walletOponente,
    aposta,
    turno:     walletAddress,
    montemesa: monte,
    baralho:   restante,
    maos: {
      [walletAddress]:  maoEu,
      [walletOponente]: maoOp,
    },
    pilhas: {
      [walletAddress]:  [],
      [walletOponente]: [],
    },
    jogadores: {
      [walletAddress]: {
        nome:     avatar.nome.split(',')[0],
        raridade: avatar.raridade,
        elemento: avatar.elemento,
        seed:     avatar.seed || 0,
      },
      [walletOponente]: {
        nome: null, raridade: null, elemento: null, seed: 0,
      },
    },
    criadoEm: firebase.database.ServerValue.TIMESTAMP,
    recompensaDistribuida: false,
  };

  await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).set(sala);

  await _rmRtdb().ref(`roubaMonte/lobby/${fila}/${walletAddress}/emPartida`).set(true);
  await _rmRtdb().ref(`roubaMonte/lobby/${fila}/${walletOponente}/emPartida`).set(true);

  if(_rmHeartbeat) { clearInterval(_rmHeartbeat); _rmHeartbeat = null; }
  _rmPararLobby();

  await _rmRtdb().ref(`roubaMonte/notificacoes/${walletOponente}/${salaId}`).set({
    salaId,
    criador: walletAddress,
    fila,
    lida: false,
    ts: firebase.database.ServerValue.TIMESTAMP,
  });

  _rmDebitarAposta();
  _rmSalaId = salaId;
  addLog(`Desafio enviado para ${walletOponente.slice(0,8)}...`, 'info');
  showBubble('Desafio enviado! 🃏');
  _rmRenderEspera(salaId);
}

// ═══════════════════════════════════════════════════════════════════
// SALA DE ESPERA
// ═══════════════════════════════════════════════════════════════════

function _rmRenderEspera(salaId) {
  const el = document.getElementById('roubaMontModal');
  if(!el) return;
  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title">🃏 ROUBA MONTE</div>
      <div class="arena-pulse" style="margin:16px auto;"></div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;">DESAFIO ENVIADO</div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">Aguardando oponente aceitar...</div>
      <div style="font-size:6px;color:var(--muted);margin-top:3px;">Sala #${salaId.slice(-6).toUpperCase()}</div>
      <button class="arena-btn-sair" style="margin-top:18px;" onclick="rmCancelarDesafio('${salaId}')">✕ CANCELAR</button>
    </div>`;

  const salaRef = _rmRtdb().ref(`roubaMonte/salas/${salaId}`);
  salaRef.on('value', snap => {
    const s = snap.val();
    if(!s) return;
    if(s.status === 'em_jogo') {
      salaRef.off('value');
      _rmIniciarPartida(salaId, s);
    }
    if(s.status === 'cancelada' || s.status === 'recusada') {
      salaRef.off('value');
      const a = _rmAposta();
      if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
      else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
      updateResourceUI();
      _rmAtiva  = false;
      _rmSalaId = null;
      addLog('Desafio cancelado ou recusado.', 'bad');
      _rmRenderLobby();
    }
  });
}

async function rmCancelarDesafio(salaId) {
  if(!_rmRtdb()) return;
  await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).update({ status: 'cancelada' });
  const fila = _rmRaridade();
  try { await _rmRtdb().ref(`roubaMonte/lobby/${fila}/${walletAddress}`).remove(); } catch(e){}
  const a = _rmAposta();
  if(a.cristais > 0) gs.cristais = (gs.cristais||0) + a.cristais;
  else               gs.moedas   = (gs.moedas  ||0) + a.moedas;
  updateResourceUI();
  _rmAtiva  = false;
  _rmSalaId = null;
  _rmRenderLobby();
}

// ═══════════════════════════════════════════════════════════════════
// ACEITAR / RECUSAR
// ═══════════════════════════════════════════════════════════════════

async function rmAceitarDesafio(salaId) {
  if(!_rmRtdb() || !walletAddress || !avatar) return;
  if(!_rmPodePagar()) { showBubble('Saldo insuficiente!'); return; }

  const snapCheck = await _rmRtdb().ref(`roubaMonte/salas/${salaId}/status`).once('value');
  if(snapCheck.val() !== 'aguardando') {
    addLog('Desafio já expirou.', 'bad'); _rmRenderLobby(); return;
  }

  _rmDebitarAposta();
  _rmSalaId = salaId;

  await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).update({
    status: 'em_jogo',
    [`jogadores/${walletAddress}/nome`]:     avatar.nome.split(',')[0],
    [`jogadores/${walletAddress}/raridade`]: avatar.raridade,
    [`jogadores/${walletAddress}/elemento`]: avatar.elemento,
    [`jogadores/${walletAddress}/seed`]:     avatar.seed || 0,
  });

  const fila = _rmRaridade();
  await _rmRtdb().ref(`roubaMonte/lobby/${fila}/${walletAddress}/emPartida`).set(true);

  const snap = await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).once('value');
  _rmIniciarPartida(salaId, snap.val());
}

async function rmRecusarDesafio(salaId) {
  if(!_rmRtdb()) return;
  await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).update({ status: 'recusada' });
  setTimeout(async () => {
    try { await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).remove(); } catch(e){}
    try { await _rmRtdb().ref(`roubaMonte/notificacoes/${walletAddress}/${salaId}`).remove(); } catch(e){}
  }, 3000);
  addLog('Desafio recusado.', 'info');
  _rmRenderLobby();
}

// ═══════════════════════════════════════════════════════════════════
// TELA DA PARTIDA
// ═══════════════════════════════════════════════════════════════════

function _rmRenderPartida(salaId, sala) {
  _rmPararTimer();
  _rmCartaSel    = null;
  _rmUltimoTurno = sala.turno;
  const el = document.getElementById('roubaMontModal');
  if(!el || !sala) return;

  const opWallet       = walletAddress === sala.criador ? sala.oponente : sala.criador;
  const minha_mao      = _rmToArray(sala.maos && sala.maos[walletAddress]);
  const op_info        = (sala.jogadores && sala.jogadores[opWallet]) || {};
  const montemesa      = _rmToArray(sala.montemesa);
  const minhaPilha     = _rmToArray(sala.pilhas && sala.pilhas[walletAddress]);
  const opPilha        = _rmToArray(sala.pilhas && sala.pilhas[opWallet]);
  const meuTurno       = sala.turno === walletAddress;
  const baralhoRestante = _rmToArray(sala.baralho).length;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;gap:6px;padding:4px;">

      <!-- Oponente info -->
      <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:6px 8px;background:rgba(255,255,255,.03);border-radius:6px;border:1px solid rgba(255,255,255,.07);">
        <div style="display:flex;align-items:center;gap:6px;">
          <div>${gerarSVG(op_info.elemento||'Fogo', op_info.raridade||'Comum', op_info.seed||0, 28, 28)}</div>
          <div>
            <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold-light);">${op_info.nome||opWallet.slice(0,10)+'...'}</div>
            <div style="font-size:6px;color:var(--muted);">🃏 ${opPilha.length} cap. · Baralho: ${baralhoRestante}</div>
          </div>
        </div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:${meuTurno?'var(--muted)':'var(--gold)'};">
          ${meuTurno ? 'aguardando' : '⚔️ VEZ DELE'}
        </div>
      </div>

      <!-- Monte da mesa -->
      <div>
        <div style="font-family:'Cinzel',serif;font-size:6px;color:var(--muted);letter-spacing:2px;margin-bottom:4px;">
          MONTE DA MESA (${montemesa.length})
        </div>
        <div style="display:flex;gap:3px;flex-wrap:wrap;min-height:52px;
                    padding:4px;background:rgba(255,255,255,.02);border-radius:6px;
                    border:1px dashed rgba(201,168,76,.15);">
          ${montemesa.length === 0
            ? `<div style="font-size:8px;color:var(--muted);margin:auto;">vazio</div>`
            : montemesa.map((c, i) => `
              <div style="
                width:32px;height:44px;border-radius:4px;
                background:#0d0a1e;border:1px solid ${c.cor||'rgba(201,168,76,.25)'};
                display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;
                ${i === montemesa.length - 1 ? 'border-color:'+c.cor+';box-shadow:0 0 8px '+c.cor+'44;' : ''}
              ">
                <span style="font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:#e8a030;">${c.label}</span>
                <span style="font-size:9px;color:${c.cor};">${c.naipe}</span>
              </div>`).join('')}
        </div>
      </div>

      <!-- Minha pilha capturada -->
      <div style="font-size:6px;color:var(--muted);font-family:'Cinzel',serif;">
        📦 MINHAS CAPTURADAS: ${minhaPilha.length} cartas
      </div>

      <!-- Minha mão -->
      <div>
        <div style="font-family:'Cinzel',serif;font-size:6px;color:var(--muted);letter-spacing:2px;margin-bottom:4px;">
          MINHA MÃO (${minha_mao.length}) ${meuTurno ? '— <span style="color:var(--gold)">SUA VEZ!</span>' : ''}
        </div>
        <div style="display:flex;gap:4px;justify-content:center;flex-wrap:wrap;">
          ${minha_mao.map((c, i) => {
            const sel = _rmCartaSel === i;
            return `<div data-carta="${i}" data-cor="${c.cor||'rgba(201,168,76,.25)'}" onclick="rmSelecionarCarta(${i})" style="
              width:40px;height:56px;border-radius:6px;
              background:${sel ? 'rgba(201,168,76,.12)' : '#0d0a1e'};
              border:1.5px solid ${sel ? '#f0d080' : (c.cor||'rgba(201,168,76,.25)')};
              display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
              cursor:${meuTurno ? 'pointer' : 'default'};
              transform:${sel ? 'translateY(-6px)' : 'none'};
              transition:all .15s;
              box-shadow:${sel ? '0 4px 14px rgba(201,168,76,.3)' : 'none'};
            ">
              <span style="font-family:'Cinzel',serif;font-size:12px;font-weight:700;color:#e8a030;">${c.label}</span>
              <span style="font-size:11px;color:${c.cor};">${c.naipe}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Botão jogar -->
      ${meuTurno ? `
      <div style="display:flex;gap:6px;margin-top:4px;">
        <button id="rmBtnJogar" class="mini-btn primary" style="flex:1;font-size:7px;"
          onclick="rmJogarCarta('${salaId}','${opWallet}')"
          ${_rmCartaSel === null ? 'disabled' : ''}>
          🃏 JOGAR CARTA
        </button>
        <button class="mini-btn close" style="font-size:7px;" onclick="closeRoubaMonte()">✕</button>
      </div>` : `
      <div style="display:flex;justify-content:flex-end;margin-top:4px;">
        <button class="mini-btn close" style="font-size:7px;" onclick="closeRoubaMonte()">✕ FECHAR</button>
      </div>`}

      <!-- Timer -->
      ${meuTurno ? `
      <div style="height:3px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:2px;">
        <div id="rmTimerBar" style="height:100%;background:var(--gold);width:100%;transition:width 1s linear;"></div>
      </div>` : ''}
    </div>`;

  if(meuTurno) _rmIniciarTimer(salaId, opWallet);
}

// ── Timer do turno ──
function _rmIniciarTimer(salaId, opWallet) {
  _rmPararTimer();
  let seg = RM_TIMER_SEG;
  _rmTimerInterval = setInterval(() => {
    seg--;
    const bar = document.getElementById('rmTimerBar');
    if(bar) {
      const pct = (seg / RM_TIMER_SEG) * 100;
      bar.style.width = pct + '%';
      if(pct < 30) bar.style.background = '#e74c3c';
      else if(pct < 60) bar.style.background = '#e8a030';
    }
    if(seg <= 0) {
      _rmPararTimer();
      if(_rmCartaSel === null) _rmCartaSel = 0;
      rmJogarCarta(salaId, opWallet);
    }
  }, 1000);
}

// ── Listener da sala ──
function _rmEscutarSala(salaId, opWallet) {
  _rmPararSala();
  _rmSalaListener = _rmRtdb().ref(`roubaMonte/salas/${salaId}`);
  let _ultimoUpdateTs = 0;
  _rmSalaListener.on('value', snap => {
    const s = snap.val();
    if(!s) return;
    if(s.status === 'finalizada') {
      _rmPararTimer();
      _rmSalaListener.off('value');
      _rmRenderResultado(s, opWallet);
      return;
    }
    if(s.status === 'em_jogo') {
      const updateTs = s.ultimaJogada?.ts || 0;
      if(updateTs !== _ultimoUpdateTs) {
        _ultimoUpdateTs = updateTs;
        _rmPararTimer();
        _rmRenderPartida(salaId, s);
        if(s.turno === walletAddress) _rmIniciarTimer(salaId, opWallet);
      }
    }
  });
}

// ── Inicia partida — render + listener (chamado uma única vez) ──
function _rmIniciarPartida(salaId, sala) {
  const opWallet = sala.criador === walletAddress ? sala.oponente : sala.criador;
  _rmRenderPartida(salaId, sala);
  if(sala.turno === walletAddress) _rmIniciarTimer(salaId, opWallet);
  _rmEscutarSala(salaId, opWallet);
}

// ═══════════════════════════════════════════════════════════════════
// LÓGICA DO JOGO
// ═══════════════════════════════════════════════════════════════════

function rmSelecionarCarta(idx) {
  console.log('[RM] rmSelecionarCarta chamado — idx:', idx, '| _rmCartaSel antes:', _rmCartaSel);
  _rmCartaSel = (_rmCartaSel === idx) ? null : idx;
  console.log('[RM] _rmCartaSel depois:', _rmCartaSel);

  const todasCartas = document.querySelectorAll('#roubaMontModal [data-carta]');
  console.log('[RM] cartas encontradas no DOM com [data-carta]:', todasCartas.length);

  // Actualiza visual das cartas sem ir ao RTDB
  document.querySelectorAll('#roubaMontModal [data-carta]').forEach(el => {
    const i   = Number(el.dataset.carta);
    const sel = _rmCartaSel === i;
    const cor = el.dataset.cor || 'rgba(201,168,76,.25)';
    el.style.background = sel ? 'rgba(201,168,76,.12)' : '#0d0a1e';
    el.style.border     = `1.5px solid ${sel ? '#f0d080' : cor}`;
    el.style.transform  = sel ? 'translateY(-6px)' : 'none';
    el.style.boxShadow  = sel ? '0 4px 14px rgba(201,168,76,.3)' : 'none';
  });

  // Activa/desactiva o botão jogar
  const btnJogar = document.getElementById('rmBtnJogar');
  console.log('[RM] btnJogar encontrado:', !!btnJogar, '| disabled:', _rmCartaSel === null);
  if(btnJogar) btnJogar.disabled = _rmCartaSel === null;
}

async function rmJogarCarta(salaId, opWallet) {
  console.log('[RM] rmJogarCarta chamado — salaId:', salaId, '| opWallet:', opWallet, '| _rmCartaSel:', _rmCartaSel);
  if(_rmCartaSel === null) { console.warn('[RM] abortou — nenhuma carta seleccionada'); return; }
  if(!_rmRtdb()) { console.warn('[RM] abortou — RTDB indisponível'); return; }
  _rmPararTimer();

  const snap = await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).once('value');
  const sala = snap.val();
  console.log('[RM] sala carregada:', !!sala, '| turno:', sala?.turno, '| walletAddress:', walletAddress, '| é meu turno:', sala?.turno === walletAddress);
  if(!sala || sala.turno !== walletAddress) { console.warn('[RM] abortou — não é meu turno'); return; }

  const minha_mao = _rmToArray(sala.maos?.[walletAddress]);
  console.log('[RM] minha_mao:', minha_mao.length, 'cartas | _rmCartaSel:', _rmCartaSel);
  if(_rmCartaSel >= minha_mao.length) { _rmCartaSel = null; return; }

  const cartaJogada = minha_mao.splice(_rmCartaSel, 1)[0];
  _rmCartaSel = null;

  let monteAtual  = _rmToArray(sala.montemesa);
  let minhaPilha  = _rmToArray(sala.pilhas?.[walletAddress]);
  let opPilha     = _rmToArray(sala.pilhas?.[opWallet]);
  let baralho     = _rmToArray(sala.baralho);
  const opMao     = _rmToArray(sala.maos?.[opWallet]);

  const trinca = _rmVerificarTrincaMao(minha_mao);

  let roubou = false;
  let msgLog = '';

  if(trinca) {
    minhaPilha = [...minhaPilha, ...monteAtual, cartaJogada];
    monteAtual = [];
    msgLog = `Trinca! Roubou o monte com ${cartaJogada.label}${cartaJogada.naipe}`;
    roubou = true;
  } else {
    const topoIdx = monteAtual.findIndex(c => c.label === cartaJogada.label);
    if(topoIdx !== -1) {
      minhaPilha = [...minhaPilha, ...monteAtual, cartaJogada];
      monteAtual = [];
      msgLog = `Roubou o monte com ${cartaJogada.label}${cartaJogada.naipe}!`;
      roubou = true;
    } else {
      monteAtual = [...monteAtual, cartaJogada];
      msgLog = `Jogou ${cartaJogada.label}${cartaJogada.naipe} no monte`;
    }
  }

  if(minha_mao.length === 0 && baralho.length > 0) {
    minha_mao.push(baralho.shift());
  }

  const fimDeJogo = minha_mao.length === 0 && opMao.length === 0 && baralho.length === 0;

  await _rmRtdb().ref(`roubaMonte/salas/${salaId}`).update({
    [`maos/${walletAddress}`]:   minha_mao,
    [`pilhas/${walletAddress}`]: minhaPilha,
    montemesa: monteAtual,
    baralho,
    turno:  fimDeJogo ? null : opWallet,
    status: fimDeJogo ? 'finalizada' : 'em_jogo',
    ultimaJogada: {
      jogador: walletAddress,
      carta:   cartaJogada,
      roubou,
      ts: Date.now(),
    },
  });

  addLog(`Rouba Monte: ${msgLog}`, roubou ? 'good' : 'info');
  if(roubou) showBubble('Roubei o monte! 🃏');
}

function _rmVerificarTrincaMao(mao) {
  if(mao.length < 3) return false;
  const contagem = {};
  mao.forEach(c => { contagem[c.label] = (contagem[c.label]||0) + 1; });
  return Object.values(contagem).some(v => v >= 3);
}

// ═══════════════════════════════════════════════════════════════════
// RESULTADO FINAL
// ═══════════════════════════════════════════════════════════════════

async function _rmRenderResultado(sala, opWallet) {
  _rmPararTimer();
  const el = document.getElementById('roubaMontModal');
  if(!el) return;

  const minhaPilha = _rmToArray(sala.pilhas?.[walletAddress]).length;
  const opPilha    = _rmToArray(sala.pilhas?.[opWallet]).length;
  const euVenci    = minhaPilha > opPilha;
  const empate     = minhaPilha === opPilha;
  const op_info    = (sala.jogadores?.[opWallet]) || {};

  const aposta  = sala.aposta;
  const usaCris = aposta.cristais > 0;
  const bruto   = usaCris ? aposta.cristais * 2 : aposta.moedas * 2;
  const moeda   = usaCris ? '💎' : '🪙';

  if(sala.criador === walletAddress && !sala.recompensaDistribuida) {
    await _rmRtdb().ref(`roubaMonte/salas/${sala.id}/recompensaDistribuida`).set(true);
    if(euVenci) _rmCreditarPremio(bruto, usaCris);
    else if(empate) {
      if(usaCris) gs.cristais = (gs.cristais||0) + aposta.cristais;
      else        gs.moedas   = (gs.moedas  ||0) + aposta.moedas;
      updateResourceUI(); scheduleSave();
    }
    const taxa = Math.floor(bruto * RM_TAXA);
    if(taxa > 0 && typeof fbDb === 'function' && fbDb()) {
      try {
        await fbDb().collection('config').doc('pool').update({
          cristais:    firebase.firestore.FieldValue.increment(taxa),
          totalEntrou: firebase.firestore.FieldValue.increment(taxa),
        });
      } catch(e) { console.warn('[RM] pool error:', e); }
    }
  } else if(sala.criador !== walletAddress) {
    if(euVenci) _rmCreditarPremio(bruto, usaCris);
    else if(empate) {
      if(usaCris) gs.cristais = (gs.cristais||0) + aposta.cristais;
      else        gs.moedas   = (gs.moedas  ||0) + aposta.moedas;
      updateResourceUI(); scheduleSave();
    }
  }

  const d  = miniDifficulty();
  const rb = rarityBonus();
  const xpGain = Math.round(d.xp * (euVenci ? 2.0 : 0.5) * rb.xp);
  xp += xpGain;
  vitals.humor = Math.min(100, vitals.humor + (euVenci ? 15 : 5));
  vinculo += euVenci ? 6 : 2;
  checkXP(); updateAllUI(); scheduleSave();

  const fila = _rmRaridade();
  try { await _rmRtdb().ref(`roubaMonte/lobby/${fila}/${walletAddress}`).remove(); } catch(e){}
  _rmAtiva  = false;
  _rmSalaId = null;

  if(sala.criador === walletAddress) {
    setTimeout(async () => {
      try { await _rmRtdb().ref(`roubaMonte/salas/${sala.id}`).remove(); } catch(e){}
    }, 10000);
  }

  const titulo = empate ? '🤝 EMPATE!' : euVenci ? '🏆 VITÓRIA!' : '💀 DERROTA';
  const cor    = empate ? 'var(--gold)' : euVenci ? '#7ab87a' : '#e74c3c';

  addLog(`Rouba Monte: ${titulo} · ${minhaPilha} vs ${opPilha} cartas`, euVenci?'good':empate?'info':'bad');

  el.innerHTML = `
    <div class="arena-resultado">
      <div class="arena-resultado-titulo" style="color:${cor};">${titulo}</div>

      <div class="arena-vs-row" style="margin:12px 0;">
        <div class="arena-vs-lado ${euVenci?'arena-vencedor':''}">
          <div class="arena-vs-svg">${gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 44, 44)}</div>
          <div class="arena-vs-nome">${avatar.nome.split(',')[0]}</div>
          <div class="arena-vs-pts" style="font-size:18px;">🃏 ${minhaPilha}</div>
        </div>
        <div class="arena-vs-centro"><div class="arena-vs-label">VS</div></div>
        <div class="arena-vs-lado ${!euVenci&&!empate?'arena-vencedor':''}">
          <div class="arena-vs-svg">${gerarSVG(op_info.elemento||'Fogo', op_info.raridade||'Comum', op_info.seed||0, 44, 44)}</div>
          <div class="arena-vs-nome">${op_info.nome||opWallet.slice(0,8)+'...'}</div>
          <div class="arena-vs-pts" style="font-size:18px;">🃏 ${opPilha}</div>
        </div>
      </div>

      <div class="arena-recompensa-card">
        ${euVenci
          ? `<div style="color:#7ab87a;font-family:'Cinzel',serif;font-size:9px;font-weight:700;">
               +${Math.floor(bruto - bruto*RM_TAXA)} ${moeda} · +${xpGain} XP
             </div>`
          : empate
            ? `<div style="color:var(--muted);font-size:7px;">Apostas devolvidas · +${xpGain} XP</div>`
            : `<div style="color:#e74c3c;font-size:7px;">Melhor sorte! · +${xpGain} XP</div>`}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:7px;" onclick="_rmRenderLobby()">🃏 JOGAR DE NOVO</button>
        <button class="arena-btn-sair" onclick="closeRoubaMonte()">✕ FECHAR</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICAÇÕES DE DESAFIOS RECEBIDOS
// ═══════════════════════════════════════════════════════════════════

function rmIniciarListenerNotificacoes() {
  if(!_rmRtdb() || !walletAddress) return;

  const notifRef = _rmRtdb().ref(`roubaMonte/notificacoes/${walletAddress}`);
  notifRef.on('child_added', async snap => {
    const notif = snap.val();
    if(!notif || notif.lida) return;
    await snap.ref.update({ lida: true });

    const salaSnap = await _rmRtdb().ref(`roubaMonte/salas/${notif.salaId}`).once('value');
    const sala = salaSnap.val();
    if(!sala || sala.status !== 'aguardando') return;

    showBubble('Desafio de Rouba Monte! 🃏');
    addLog(`Desafio de Rouba Monte recebido de ${(sala.criador||'').slice(0,8)}...`, 'info');

    const el = document.getElementById('roubaMontModal');
    if(el && el.classList.contains('open')) {
      _rmRenderDesafioPendente(sala);
    }
  });
}

function _rmRenderDesafioPendente(sala) {
  const el = document.getElementById('roubaMontModal');
  if(!el) return;
  el.innerHTML = `
    <div class="arena-espera">
      <div class="arena-title">🃏 ROUBA MONTE</div>
      <div style="font-family:'Cinzel',serif;font-size:9px;color:var(--gold);letter-spacing:2px;margin-top:16px;">
        DESAFIO RECEBIDO!
      </div>
      <div style="font-size:7px;color:var(--muted);margin-top:6px;">
        De: ${(sala.criador||'').slice(0,10)}...
      </div>
      <div style="font-size:7px;color:var(--muted);margin-top:3px;">
        Aposta: ${sala.aposta?.cristais > 0 ? sala.aposta.cristais+' 💎' : sala.aposta?.moedas+' 🪙'}
      </div>
      <div style="display:flex;gap:8px;margin-top:20px;width:100%;">
        <button class="arena-btn-entrar" style="font-size:8px;" onclick="rmAceitarDesafio('${sala.id}')">✅ ACEITAR</button>
        <button class="arena-btn-sair" onclick="rmRecusarDesafio('${sala.id}')">✕ RECUSAR</button>
      </div>
    </div>`;

  const salaRef = _rmRtdb().ref(`roubaMonte/salas/${sala.id}/status`);
  salaRef.on('value', snap => {
    if(snap.val() === 'cancelada') {
      salaRef.off('value');
      addLog('Desafio cancelado pelo oponente.', 'bad');
      showBubble('Desafio cancelado! 😔');
      _rmRenderLobby();
    }
  });
}

// ── Exports ──
window.openRoubaMonte                = openRoubaMonte;
window.closeRoubaMonte               = closeRoubaMonte;
window.rmEntrarNoLobby               = rmEntrarNoLobby;
window.rmSairDoLobby                 = rmSairDoLobby;
window.rmDesafiar                    = rmDesafiar;
window.rmCancelarDesafio             = rmCancelarDesafio;
window.rmAceitarDesafio              = rmAceitarDesafio;
window.rmRecusarDesafio              = rmRecusarDesafio;
window.rmSelecionarCarta             = rmSelecionarCarta;
window.rmJogarCarta                  = rmJogarCarta;
window.rmIniciarListenerNotificacoes = rmIniciarListenerNotificacoes;
window._rmRenderLobby                = _rmRenderLobby;

console.log('[ROUBA MONTE] Módulo carregado.');
