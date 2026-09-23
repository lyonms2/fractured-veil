// ═══════════════════════════════════════════════════════════════════
// O PVP — O LOBBY (etapa 1)
//
// Três portas para um par, e uma sala no fim de todas:
//
//   · PROCURAR PARTIDA  a fila pelo poder da equipe (api/pvp.js forma o
//                       par; a faixa aceita abre com a espera, ver
//                       js/pvp-regras.js)
//   · DESAFIAR AMIGO    um convite de 30 s, amistoso, fora do ranking
//   · VOLTAR            a sala mora no banco: quem recarrega a página
//                       cai de volta nela (o ponteiro pvp/jogador/{uid})
//
// ── O PONTEIRO MANDA ──
// Nenhuma das três portas abre a sala por conta própria. O servidor
// aponta pvp/jogador/{uid}/sala para ela, e é esse ponteiro — ouvido
// desde o login — que abre o versus, venha o par da fila, de um convite
// aceito por mim, de um aceito pelo outro, ou de um F5. Um caminho só,
// e os quatro casos saem iguais.
//
// ── O ONLINE ──
// pvp/online/{uid} diz aos amigos que o jogador está aqui e o que está
// fazendo (livre, na fila, numa sala). Some sozinho quando a conexão cai
// (onDisconnect) e renova-se a cada 30 s: quem trava sem desconectar
// para de renovar, e 90 s depois conta como fora (PVP_ONLINE_MS).
// ═══════════════════════════════════════════════════════════════════

const PVP_API = '/api/pvp';
const PVP_PROCURAR_MS = 4000;   // o sinal de vida na fila, e a nova tentativa de par

let _pvpUid = null;
let _pvpOffset = 0;             // relógio do servidor − relógio daqui
let _pvpEstado = 'livre';       // o que os amigos veem: livre, fila, sala
let _pvpOnlineRef = null, _pvpSinalTimer = null;
let _pvpFila = null;            // { desde, poder } enquanto procura
let _pvpProcurarTimer = null, _pvpRelogioTimer = null;
let _pvpOcupado = false;        // um pedido ao servidor a caminho
let _pvpConvites = {};          // os que recebi: { de: { nome, poder, expira } }
let _pvpEnviado = null;         // o que mandei: { para, nome, expira, ref }
let _pvpAmigos = null;          // { uid: { nome } }
let _pvpAmigosOn = {};          // { uid: { ts, estado } }
let _pvpAmigosRefs = [];
let _pvpSalaId = null, _pvpSalaRef = null, _pvpSala = null;
let _pvpSalaPresRef = null, _pvpSalaPresTimer = null, _pvpVsTimer = null;
let _pvpVsTravou = false;       // o versus travou a rolagem da página (e tem de soltá-la)
let _pvpConvAgi = {};           // convites que EU aceitei ou recusei: o sumiço deles não é "cancelou"
const _pvpRefsGlobais = [];

function _pvpDb() { return (typeof _rtdb !== 'undefined') ? _rtdb : null; }
function pvpAgora() { return Date.now() + _pvpOffset; }

// ── O SERVIDOR ───────────────────────────────────────────────────
async function _pvpChamar(acao, dados) {
  const u = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
  if (!u) throw Object.assign(new Error('sem_login'), { codigo: 'sem_login' });
  const idToken = await u.getIdToken();
  let r, j = {};
  try {
    r = await fetch(PVP_API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ acao, idToken }, dados || {})),
    });
    j = await r.json().catch(() => ({}));
  } catch (e) {
    throw Object.assign(new Error('rede'), { codigo: 'rede' });
  }
  if (!r.ok || !j.ok) throw Object.assign(new Error(j.erro || 'interno'), { codigo: j.erro || 'interno', dados: j });
  return j;
}

// A frase de um erro do servidor, para o jogador.
function _pvpErroTexto(e) {
  const c = (e && e.codigo) || 'interno';
  const chave = 'pvp.erro.' + c;
  const txt = t(chave);
  return txt === chave ? t('pvp.erro.interno') : txt;
}

// ── A EQUIPE, DESTE LADO ─────────────────────────────────────────
function _pvpEquipe() {
  return (typeof equipaDoJogador === 'function') ? equipaDoJogador() : [];
}

/* Por que a equipe não pode ir — as mesmas perguntas do PvE, com as
   mesmas frases. O servidor confere de novo o que ele sabe conferir; a
   doença e a energia só daqui (ver pvpMotivoMembro). */
function _pvpBloqueio() {
  const max = (typeof COMBATE_EQUIPA_MAX === 'number') ? COMBATE_EQUIPA_MAX : PVP_EQUIPA;
  if (_pvpEquipe().length < max) return t('pvp.bloq.incompleta');
  const imp = (typeof _pveImpedidos === 'function') ? _pveImpedidos() : [];
  if (!imp.length) return null;
  const x = imp[0];
  if (x.motivo === 'sem_nome') return t(imp.length > 1 ? 'pve.sem_nomes' : 'pve.sem_nome');
  if (x.motivo === 'bebe') return t('pvp.bloq.bebe', { nome: x.nome });
  if (x.motivo === 'doenca') return t('pve.doente', { nomes: imp.map(i => i.nome).join(', ') });
  return t(imp.length > 1 ? 'pve.cansados' : 'pve.cansado', {
    nomes: imp.map(i => i.nome).join(', '),
    min: (typeof PVE_ENERGIA_MINIMA === 'number') ? PVE_ENERGIA_MINIMA : 20,
  });
}

/* O servidor lê a equipe do BANCO, e o save chega lá com atraso (a cada
   minuto, ou 5 s depois de uma mudança). Grava-se antes de pedir, e se
   mesmo assim o servidor responder que a equipe está desatualizada, grava-
   se e pede-se outra vez. */
async function _pvpComEquipe(acao, dados) {
  const ids = () => _pvpEquipe().map(s => s && s.id);
  if (typeof saveToFirebase === 'function') await saveToFirebase();
  try {
    return await _pvpChamar(acao, Object.assign({ ids: ids() }, dados));
  } catch (e) {
    if (e.codigo !== 'equipe_desatualizada') throw e;
    await new Promise(r => setTimeout(r, 800));
    if (typeof saveToFirebase === 'function') await saveToFirebase();
    return _pvpChamar(acao, Object.assign({ ids: ids() }, dados));
  }
}

// ═══════════════════════════════════════════════════════════════════
// O LOGIN — a presença, os convites e o ponteiro
// ═══════════════════════════════════════════════════════════════════
function pvpIniciar(uid) {
  const db = _pvpDb();
  if (!db || !uid || _pvpUid === uid) return;
  pvpEncerrar();
  _pvpUid = uid;
  const ouvir = (ref, ev, fn) => { ref.on(ev, fn, () => {}); _pvpRefsGlobais.push([ref, ev, fn]); };

  ouvir(db.ref('.info/serverTimeOffset'), 'value', s => { _pvpOffset = s.val() || 0; });

  _pvpOnlineRef = db.ref('pvp/online/' + uid);
  ouvir(db.ref('.info/connected'), 'value', s => {
    if (!s.val() || !_pvpOnlineRef) return;
    _pvpOnlineRef.onDisconnect().remove();
    _pvpMarcarOnline();
    // Se a conexão caiu, a fila caiu com ela (onDisconnect): volta-se a ela.
    if (_pvpFila) _pvpReentrar();
  });
  _pvpSinalTimer = setInterval(_pvpMarcarOnline, PVP_SINAL_MS);

  ouvir(db.ref('pvp/convites/' + uid), 'value', s => {
    const antes = _pvpConvites || {};
    _pvpConvites = s.val() || {};
    /* Um convite que sumiu antes do prazo, sem eu ter respondido, é um
       desafio que o outro cancelou — diz-se, em vez de o cartão sumir
       calado. Se sumiu porque viramos sala, o versus já fala por si. */
    for (const de of Object.keys(antes)) {
      if (_pvpConvites[de] || _pvpConvAgi[de]) continue;
      const c = antes[de];
      if (c && pvpAgora() < (c.expira || 0) - 800)
        setTimeout(() => { if (!_pvpSalaId) showToast(t('pvp.convite.cancelou', { nome: c.nome || '—' }), 'info'); }, 600);
    }
    _pvpConvAgi = {};
    _pvpRenderConvites();
    _pvpRenderAmigos();
  });
  ouvir(db.ref('pvp/jogador/' + uid + '/sala'), 'value', s => _pvpPonteiro(s.val()));

  /* O NÍVEL COM QUE SE ENTRA NA FILA É O QUE O SERVIDOR RECONHECE
     (js/niveis.js), e um aviso de subida que se perdeu por falta de rede
     deixaria o avatar a lutar abaixo do que é. Aqui, ao ligar o PvP,
     manda-se a colônia inteira de uma vez: o servidor sobe o que o
     ritmo permitir e ignora o resto. */
  if (typeof nivelAvisarTodos === 'function') nivelAvisarTodos();
}

function pvpEncerrar() {
  if (typeof pvpLutaAtiva === 'function' && pvpLutaAtiva() && typeof afFechar === 'function') afFechar();
  _pvpPararBusca();
  _pvpFecharSala(true);
  _pvpPararAmigos();
  for (const [ref, ev, fn] of _pvpRefsGlobais.splice(0)) ref.off(ev, fn);
  if (_pvpSinalTimer) { clearInterval(_pvpSinalTimer); _pvpSinalTimer = null; }
  if (_pvpOnlineRef) {
    try { _pvpOnlineRef.onDisconnect().cancel(); _pvpOnlineRef.remove(); } catch (e) {}
    _pvpOnlineRef = null;
  }
  _pvpUid = null; _pvpConvites = {}; _pvpEnviado = null; _pvpEstado = 'livre';
  _pvpRenderConvites();
}

function _pvpMarcarOnline() {
  if (!_pvpOnlineRef || typeof firebase === 'undefined') return;
  _pvpOnlineRef.set({ ts: firebase.database.ServerValue.TIMESTAMP, estado: _pvpEstado }).catch(() => {});
}
function _pvpMudarEstado(e) {
  if (_pvpEstado === e) return;
  _pvpEstado = e;
  _pvpMarcarOnline();
}

// ═══════════════════════════════════════════════════════════════════
// O LOBBY
// ═══════════════════════════════════════════════════════════════════
function abrirLobbyPvP() {
  if (!_pvpUid) { showToast(t('pvp.erro.sem_login'), 'err'); return; }
  if (_pvpSalaId) { _pvpAbrirVersus(); return; }
  ModalManager.open('pvpModal');
  _pvpRenderLobby();
  _pvpCarregarAmigos();
}
function fecharLobbyPvP() {
  ModalManager.close('pvpModal');
  _pvpPararAmigos();
  _pvpRenderPilula();
}
window.abrirLobbyPvP = abrirLobbyPvP;
window.fecharLobbyPvP = fecharLobbyPvP;

function _pvpLobbyAberto() {
  const m = document.getElementById('pvpModal');
  return !!(m && m.classList.contains('open'));
}

// Um avatar desenhado — o mesmo gerarSVG de todo o jogo, pelo slot.
function _pvpRetratoSVG(s, tam) {
  if (!s || typeof gerarSVG !== 'function') return '';
  const fase = (typeof faseFromNivel === 'function') ? faseFromNivel(s.nivel || 1) : 0;
  return gerarSVG(s, s.raridade, s.seed || 0, tam, tam, fase);
}

function _pvpRenderLobby() {
  const box = document.getElementById('pvpLobby');
  if (!box) return;
  const eq = _pvpEquipe();
  const poder = (typeof fuPoderDaEquipa === 'function') ? fuPoderDaEquipa(eq) : 0;
  const bloq = _pvpBloqueio();
  const nome = s => esc((typeof nomeCurto === 'function') ? nomeCurto(s) : (s && s.nome) || '');

  box.innerHTML = `
    <section class="pvp-equipe">
      <div class="pvp-sec-rot">${esc(t('pvp.lobby.sua_equipe'))}</div>
      <div class="pvp-equipe-linha">
        ${eq.map((s, i) => `<figure class="pvp-av" style="--i:${i}">
          <div class="pvp-av-arte">${_pvpRetratoSVG(s, 84)}</div>
          <figcaption><b>${nome(s)}</b><span>${esc(t('pvp.nivel', { n: s.nivel || 1 }))}</span></figcaption>
        </figure>`).join('')}
      </div>
      <div class="pvp-poder">${t('pvp.lobby.poder', { p: poder })}</div>
    </section>

    <section class="pvp-busca" id="pvpBusca">${_pvpBuscaHTML(bloq)}</section>

    <section class="pvp-amigos">
      <div class="pvp-sec-rot">${esc(t('pvp.lobby.amigos'))}
        <i>${esc(t('pvp.lobby.amigos_nota'))}</i></div>
      <div id="pvpAmigosLista" class="pvp-amigos-lista">${_pvpAmigosHTML()}</div>
    </section>`;
}

/* O miolo da busca: o botão, ou — procurando — o radar, o tempo e a
   faixa de poder que a fila aceita agora. Refaz-se a cada segundo sem
   tocar no resto do lobby. */
function _pvpBuscaHTML(bloq) {
  // Uma partida que ficou em curso vem antes de tudo: o relógio dela corre.
  if (_pvpPendente) {
    return `<div class="pvp-busca-tit pendente">${esc(t('pvp.luta.em_curso'))}</div>
      <button class="pvp-btn pri" onclick="pvpVoltarPartida()">${esc(t('pvp.luta.voltar_partida'))}</button>`;
  }
  if (_pvpFila) {
    const espera = Math.max(0, pvpAgora() - _pvpFila.desde);
    const [lo, hi] = pvpFaixa(_pvpFila.poder, espera);
    return `<div class="pvp-radar" aria-hidden="true"><i></i><i></i><i></i>
        <span class="pvp-radar-marca"><i class="bt-fenda ouro esq"></i><i class="bt-fenda ouro dir"></i></span></div>
      <div class="pvp-busca-tit">${esc(t('pvp.busca.procurando'))}</div>
      <div class="pvp-busca-tempo">${_pvpRelogio(espera)}</div>
      <div class="pvp-busca-faixa">${t('pvp.busca.faixa', { p: _pvpFila.poder, lo, hi })}</div>
      <button class="pvp-btn sec" onclick="pvpCancelarBusca()" ${_pvpOcupado ? 'disabled' : ''}>${esc(t('pvp.busca.cancelar'))}</button>`;
  }
  return `<button class="pvp-btn pri" onclick="pvpProcurar()" ${bloq || _pvpOcupado ? 'disabled' : ''}>
      <span class="pvp-btn-marca"><i class="bt-fenda ouro esq"></i><i class="bt-fenda ouro dir"></i></span>
      ${esc(t('pvp.busca.procurar'))}</button>
    <div class="pvp-busca-nota">${esc(bloq || t('pvp.busca.nota'))}</div>`;
}

function _pvpRelogio(ms) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// ── PROCURAR ─────────────────────────────────────────────────────
async function pvpProcurar() {
  if (_pvpOcupado || _pvpFila || _pvpSalaId) return;
  const bloq = _pvpBloqueio();
  if (bloq) { showToast(bloq, 'err'); return; }
  _pvpOcupado = true; _pvpAtualizarBusca();
  try {
    const r = await _pvpComEquipe('entrar');
    if (!r.sala) _pvpComecarBusca(r.desde, r.poder);
  } catch (e) {
    if (e.codigo === 'em_sala') _pvpReabrir(e.dados && e.dados.sala);
    else showToast(_pvpErroTexto(e), 'err');
  } finally {
    _pvpOcupado = false; _pvpAtualizarBusca();
  }
}
window.pvpProcurar = pvpProcurar;

/* O servidor diz que ainda há uma sala minha em curso (uma luta que o
   jogador fechou sem o fim conferido, por exemplo): volta-se a ela, em
   vez de ficar num botão que não faz nada. */
function _pvpReabrir(id) {
  if (!id) return;
  _pvpPendente = null;
  showToast(t('pvp.erro.em_sala_volta'), 'info');
  _pvpSalaId = null; _pvpSala = null;
  _pvpPonteiro(id);
}

function _pvpComecarBusca(desde, poder) {
  _pvpFila = { desde: desde || pvpAgora(), poder: poder | 0 };
  _pvpMudarEstado('fila');
  // Um F5 ou a conexão que cai tira da fila, sem esperar o servidor.
  const db = _pvpDb();
  if (db && _pvpUid) db.ref('pvp/fila/' + _pvpUid).onDisconnect().remove();
  clearInterval(_pvpProcurarTimer); clearInterval(_pvpRelogioTimer);
  _pvpProcurarTimer = setInterval(_pvpSinalFila, PVP_PROCURAR_MS);
  _pvpRelogioTimer = setInterval(() => { _pvpAtualizarBusca(); _pvpRenderPilula(); }, 1000);
  _pvpAtualizarBusca(); _pvpRenderPilula();
}

async function _pvpSinalFila() {
  if (!_pvpFila || _pvpOcupado) return;
  try {
    const r = await _pvpChamar('procurar');
    if (!_pvpFila) return;
    if (r.sala) return;                // o ponteiro abre
    if (r.fora) { _pvpReentrar(); return; }
    if (r.desde) _pvpFila.desde = r.desde;
  } catch (e) { /* uma falha de rede não tira da fila: o próximo sinal tenta de novo */ }
}

/* Caiu da fila sem ter sala — a conexão piscou e o onDisconnect a
   apagou, ou o servidor largou uma entrada sem sinal. Volta-se, com a
   espera nova: a janela recomeça em ±10%, que é o justo para quem sumiu. */
async function _pvpReentrar() {
  if (!_pvpFila || _pvpOcupado) return;
  _pvpOcupado = true;
  try {
    const r = await _pvpComEquipe('entrar');
    if (r.sala) return;
    if (_pvpFila) { _pvpFila.desde = r.desde; _pvpFila.poder = r.poder; }
  } catch (e) {
    if (e.codigo !== 'em_sala') { _pvpPararBusca(); showToast(_pvpErroTexto(e), 'err'); }
  } finally { _pvpOcupado = false; }
}

async function pvpCancelarBusca() {
  if (!_pvpFila) return;
  _pvpPararBusca();
  const db = _pvpDb();
  if (db && _pvpUid) db.ref('pvp/fila/' + _pvpUid).remove().catch(() => {});
  try { await _pvpChamar('sairFila'); } catch (e) {}
}
window.pvpCancelarBusca = pvpCancelarBusca;

function _pvpPararBusca() {
  clearInterval(_pvpProcurarTimer); clearInterval(_pvpRelogioTimer);
  _pvpProcurarTimer = _pvpRelogioTimer = null;
  const db = _pvpDb();
  if (_pvpFila && db && _pvpUid) { try { db.ref('pvp/fila/' + _pvpUid).onDisconnect().cancel(); } catch (e) {} }
  _pvpFila = null;
  if (!_pvpSalaId) _pvpMudarEstado('livre');
  _pvpAtualizarBusca(); _pvpRenderPilula();
}

function _pvpAtualizarBusca() {
  const el = document.getElementById('pvpBusca');
  if (el && _pvpLobbyAberto()) el.innerHTML = _pvpBuscaHTML(_pvpBloqueio());
}

/* A pílula: procurando com o lobby fechado. A busca continua por baixo
   de qualquer tela, e quem quiser voltar toca nela. */
function _pvpRenderPilula() {
  let p = document.getElementById('pvpPilula');
  const ver = !!_pvpFila && !_pvpLobbyAberto() && !_pvpSalaId;
  if (!ver) { if (p) p.classList.remove('ativa'); return; }
  if (!p) {
    p = document.createElement('div');
    p.id = 'pvpPilula'; p.className = 'pvp-pilula';
    p.setAttribute('role', 'button');
    p.onclick = e => { if (!e.target.closest('.pvp-pilula-x')) abrirLobbyPvP(); };
    document.body.appendChild(p);
  }
  const espera = Math.max(0, pvpAgora() - _pvpFila.desde);
  p.innerHTML = `<span class="pvp-pilula-pulso"></span>${esc(t('pvp.pilula', { tempo: _pvpRelogio(espera) }))}
    <button class="pvp-pilula-x" onclick="pvpCancelarBusca()" aria-label="${esc(t('pvp.busca.cancelar'))}">✕</button>`;
  p.classList.add('ativa');
}

// ── OS AMIGOS ────────────────────────────────────────────────────
async function _pvpCarregarAmigos() {
  const lista = document.getElementById('pvpAmigosLista');
  if (lista && !_pvpAmigos) lista.innerHTML = `<div class="pvp-vazio">${esc(t('ui.loading'))}</div>`;
  try {
    const u = firebase.auth().currentUser;
    const idToken = await u.getIdToken();
    const r = await fetch(`/api/amigos?lista=1&idToken=${encodeURIComponent(idToken)}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || 'erro');
    _pvpAmigos = j.amigos || {};
  } catch (e) {
    _pvpAmigos = _pvpAmigos || {};
    if (lista) lista.innerHTML = `<div class="pvp-vazio">${esc(t('pvp.amigos.erro'))}</div>`;
    return;
  }
  _pvpOuvirAmigos();
  _pvpRenderAmigos();
}

function _pvpOuvirAmigos() {
  _pvpPararAmigos();
  const db = _pvpDb();
  if (!db) return;
  for (const uid of Object.keys(_pvpAmigos || {})) {
    const ref = db.ref('pvp/online/' + uid);
    const fn = s => { _pvpAmigosOn[uid] = s.val(); _pvpRenderAmigos(); };
    ref.on('value', fn, () => {});
    _pvpAmigosRefs.push([ref, fn]);
  }
}
function _pvpPararAmigos() {
  for (const [ref, fn] of _pvpAmigosRefs.splice(0)) ref.off('value', fn);
}

function _pvpStatusAmigo(uid) {
  const on = _pvpAmigosOn[uid];
  if (!on || !(pvpAgora() - (on.ts || 0) < PVP_ONLINE_MS)) return 'off';
  return on.estado === 'sala' ? 'sala' : on.estado === 'fila' ? 'fila' : 'livre';
}

function _pvpAmigosHTML() {
  if (!_pvpAmigos) return `<div class="pvp-vazio">${esc(t('ui.loading'))}</div>`;
  const uids = Object.keys(_pvpAmigos);
  if (!uids.length) return `<div class="pvp-vazio">${esc(t('pvp.amigos.nenhum'))}</div>`;
  const ordem = { livre: 0, fila: 1, sala: 2, off: 3 };
  uids.sort((a, b) => (ordem[_pvpStatusAmigo(a)] - ordem[_pvpStatusAmigo(b)])
    || String(_pvpAmigos[a].nome || '').localeCompare(String(_pvpAmigos[b].nome || '')));
  const bloq = _pvpBloqueio();
  return uids.map(uid => {
    const st = _pvpStatusAmigo(uid);
    const enviado = _pvpEnviado && _pvpEnviado.para === uid;
    const meDesafiou = _pvpConvites[uid] && pvpAgora() < (_pvpConvites[uid].expira || 0);
    let acao;
    if (meDesafiou) {
      acao = `<span class="pvp-am-espera">${esc(t('pvp.amigos.te_desafiou'))}</span>
        <button class="pvp-btn mini" onclick="pvpAceitarConvite('${esc(uid)}')">${esc(t('pvp.convite.aceitar'))}</button>`;
    } else if (enviado) {
      const falta = Math.max(0, Math.ceil((_pvpEnviado.expira - pvpAgora()) / 1000));
      acao = `<span class="pvp-am-espera">${esc(t('pvp.amigos.aguardando', { s: falta }))}</span>
        <button class="pvp-btn mini sec" onclick="pvpCancelarConvite()">${esc(t('pvp.amigos.cancelar'))}</button>`;
    } else {
      const pode = (st === 'livre' || st === 'fila') && !bloq && !_pvpEnviado && !_pvpOcupado;
      acao = `<button class="pvp-btn mini" ${pode ? '' : 'disabled'}
        onclick="pvpDesafiar('${esc(uid)}')">${esc(t('pvp.amigos.desafiar'))}</button>`;
    }
    return `<div class="pvp-am ${st}">
      <span class="pvp-am-ponto"></span>
      <span class="pvp-am-nome">${esc(_pvpAmigos[uid].nome || '—')}<small>${esc(t('pvp.amigos.st.' + st))}</small></span>
      ${acao}
    </div>`;
  }).join('');
}
function _pvpRenderAmigos() {
  const el = document.getElementById('pvpAmigosLista');
  if (el && _pvpLobbyAberto()) el.innerHTML = _pvpAmigosHTML();
}

async function pvpDesafiar(uid) {
  if (_pvpOcupado || _pvpEnviado || _pvpSalaId) return;
  const bloq = _pvpBloqueio();
  if (bloq) { showToast(bloq, 'err'); return; }
  _pvpOcupado = true; _pvpRenderAmigos();
  try {
    const r = await _pvpComEquipe('convidar', { alvo: uid });
    const db = _pvpDb();
    const ref = db.ref(`pvp/convites/${uid}/${_pvpUid}`);
    _pvpEnviado = { para: uid, nome: (_pvpAmigos[uid] || {}).nome || '', expira: r.expira, ref };
    const fn = s => {
      if (s.val() || !_pvpEnviado || _pvpEnviado.ref !== ref) return;
      ref.off('value', fn);
      clearInterval(_pvpEnviado.timer);
      const expirou = pvpAgora() >= _pvpEnviado.expira - 500;
      const cancelei = !!_pvpEnviado.cancelado;
      const nome = _pvpEnviado.nome;
      _pvpEnviado = null;
      _pvpRenderAmigos();
      /* O convite sumiu. Se foi porque ele aceitou, o ponteiro já abriu
         a sala e não há nada a dizer; senão, recusou ou o tempo acabou. */
      if (cancelei) return;
      setTimeout(() => {
        if (!_pvpSalaId) showToast(t(expirou ? 'pvp.convite.expirou' : 'pvp.convite.recusou', { nome }), 'info');
      }, 700);
    };
    ref.on('value', fn, () => {});
    _pvpEnviado.fn = fn;
    // O tempo que falta, a cada segundo; e ao fim dele o convite sai.
    _pvpEnviado.timer = setInterval(() => {
      if (!_pvpEnviado) return;
      if (pvpAgora() > _pvpEnviado.expira + 1500) ref.remove().catch(() => {});
      _pvpRenderAmigos();
    }, 1000);
  } catch (e) {
    showToast(_pvpErroTexto(e), 'err');
  } finally {
    _pvpOcupado = false; _pvpRenderAmigos();
  }
}
window.pvpDesafiar = pvpDesafiar;

function pvpCancelarConvite() {
  if (!_pvpEnviado) return;
  _pvpEnviado.cancelado = true;
  _pvpEnviado.ref.remove().catch(() => {});
}
window.pvpCancelarConvite = pvpCancelarConvite;

// ── OS CONVITES QUE CHEGAM ───────────────────────────────────────
/* Um cartão por convite, no canto de cima, em qualquer tela do jogo, com
   o tempo que falta a escorrer. Quem estiver no meio de uma batalha
   contra o Véu vê o convite mas não o aceita: primeiro termina a luta. */
function _pvpRenderConvites() {
  let box = document.getElementById('pvpConvites');
  const des = Object.keys(_pvpConvites || {}).filter(de => {
    const c = _pvpConvites[de];
    return c && pvpAgora() < (c.expira || 0);
  });
  if (!des.length) { if (box) box.innerHTML = ''; return; }
  if (!box) {
    box = document.createElement('div');
    box.id = 'pvpConvites'; box.className = 'pvp-convites';
    document.body.appendChild(box);
  }
  const vistos = new Set(des);
  box.querySelectorAll('.pvp-convite').forEach(el => { if (!vistos.has(el.dataset.de)) el.remove(); });
  for (const de of des) {
    if (box.querySelector(`.pvp-convite[data-de="${CSS.escape(de)}"]`)) continue;
    const c = _pvpConvites[de];
    const falta = Math.max(0, c.expira - pvpAgora());
    const el = document.createElement('div');
    el.className = 'pvp-convite';
    el.dataset.de = de;
    el.innerHTML = `
      <div class="pvp-convite-marca"><i class="bt-fenda ouro esq"></i><i class="bt-fenda ouro dir"></i></div>
      <div class="pvp-convite-txt">
        <b>${esc(t('pvp.convite.titulo', { nome: c.nome || '—' }))}</b>
        <span>${esc(t('pvp.convite.sub', { p: c.poder | 0 }))}</span>
      </div>
      <div class="pvp-convite-acoes">
        <button class="pvp-btn mini" onclick="pvpAceitarConvite('${esc(de)}')">${esc(t('pvp.convite.aceitar'))}</button>
        <button class="pvp-btn mini sec" onclick="pvpRecusarConvite('${esc(de)}')">${esc(t('pvp.convite.recusar'))}</button>
      </div>
      <i class="pvp-convite-tempo" style="animation-duration:${falta}ms"></i>`;
    box.appendChild(el);
    // Quando o tempo acaba, o cartão sai e o convite apaga-se do banco.
    setTimeout(() => {
      el.classList.add('saindo');
      setTimeout(() => el.remove(), 350);
      const db = _pvpDb();
      if (db && _pvpUid && _pvpConvites[de] && pvpAgora() >= _pvpConvites[de].expira)
        db.ref(`pvp/convites/${_pvpUid}/${de}`).remove().catch(() => {});
    }, falta);
  }
}

async function pvpAceitarConvite(de) {
  if (_pvpOcupado) return;
  const combate = document.getElementById('combateModal');
  if (combate && combate.classList.contains('open')) { showToast(t('pvp.convite.em_batalha'), 'err'); return; }
  const bloq = _pvpBloqueio();
  if (bloq) { showToast(bloq, 'err'); return; }
  _pvpOcupado = true;
  _pvpConvAgi[de] = true;
  const el = document.querySelector(`.pvp-convite[data-de="${CSS.escape(de)}"]`);
  if (el) el.classList.add('aceitando');
  try {
    if (_pvpFila) await pvpCancelarBusca();
    await _pvpComEquipe('aceitar', { de });
    // O ponteiro abre a sala.
  } catch (e) {
    if (el) el.classList.remove('aceitando');
    showToast(_pvpErroTexto(e), 'err');
  } finally { _pvpOcupado = false; }
}
window.pvpAceitarConvite = pvpAceitarConvite;

function pvpRecusarConvite(de) {
  _pvpConvAgi[de] = true;
  const db = _pvpDb();
  if (db && _pvpUid) db.ref(`pvp/convites/${_pvpUid}/${de}`).remove().catch(() => {});
}
window.pvpRecusarConvite = pvpRecusarConvite;

// ═══════════════════════════════════════════════════════════════════
// A SALA — o versus
// ═══════════════════════════════════════════════════════════════════
function _pvpPonteiro(id) {
  /* O servidor solta o ponteiro quando grava o fim — e a luta ainda está
     na tela, com o resultado. Quem a fecha é o jogador (pvpLutaSair). */
  if (typeof pvpLutaAtiva === 'function' && pvpLutaAtiva()) return;
  if (!id) { if (_pvpSalaId) _pvpFecharSala(); return; }
  if (id === _pvpSalaId) return;
  _pvpFecharSala(true);
  _pvpPararBusca();
  _pvpSalaId = id;
  _pvpMudarEstado('sala');
  // O convite que eu tinha mandado não vale mais: já estou numa sala.
  if (_pvpEnviado) pvpCancelarConvite();

  const db = _pvpDb();
  _pvpSalaRef = db.ref('pvp/salas/' + id);
  _pvpSalaRef.on('value', s => {
    const sala = s.val();
    if (!sala || sala.estado === 'encerrada' || sala.estado === 'cancelada') {
      const saiuOutro = sala && sala.saiu && sala.saiu !== _pvpUid;
      _pvpFecharSala();
      if (saiuOutro) {
        showToast(t('pvp.sala.outro_saiu'), 'info');
        // De volta ao lobby, como quem saiu: pronto para procurar de novo.
        setTimeout(() => { if (!_pvpSalaId) abrirLobbyPvP(); }, 450);
      }
      return;
    }
    const primeira = !_pvpSala;
    _pvpSala = sala;
    // Já passou do versus (um F5 no meio da luta): direto para a arena.
    if (sala.estado === 'luta' && pvpAgora() >= (sala.inicio || 0)) { _pvpEntrarNaLuta(); return; }
    if (primeira) _pvpAbrirVersus(); else _pvpAtualizarVersus();
  }, () => { _pvpFecharSala(); });

  // A minha presença na sala: o outro vê quando eu caio.
  _pvpSalaPresRef = db.ref(`pvp/salas/${id}/presenca/${_pvpUid}`);
  // { on } enquanto está; { fora: hora } se cair — é de lá que sai o W.O.
  const marcar = () => _pvpSalaPresRef && _pvpSalaPresRef.set({ on: firebase.database.ServerValue.TIMESTAMP }).catch(() => {});
  _pvpSalaPresRef.onDisconnect().set({ fora: firebase.database.ServerValue.TIMESTAMP });
  marcar();
  _pvpSalaPresTimer = setInterval(marcar, PVP_SINAL_MS);
}

function _pvpFecharSala(silencioso) {
  if (_pvpSalaRef) { _pvpSalaRef.off(); _pvpSalaRef = null; }
  if (_pvpSalaPresTimer) { clearInterval(_pvpSalaPresTimer); _pvpSalaPresTimer = null; }
  if (_pvpSalaPresRef) {
    try { _pvpSalaPresRef.onDisconnect().cancel(); } catch (e) {}
    _pvpSalaPresRef = null;
  }
  clearInterval(_pvpVsTimer); _pvpVsTimer = null;
  /* Sempre, e não só com o versus aceso: uma sala que fecha antes de os
     dois quadros do _pvpAbrirVersus acenderem a tela deixava um versus
     fantasma — sem sala, com os botões mudos e a página sem rolar (visto
     pelo subagente de verificação com a aba em segundo plano). */
  const vs = document.getElementById('pvpVersus');
  if (vs) {
    vs.classList.remove('ativo');
    delete vs.dataset.sala;
    /* Só apaga se nenhum versus novo tiver entrado nesse meio: com a aba
       em segundo plano o `ativo` do novo não chega (requestAnimationFrame
       não roda), e este timer apagava o versus da sala seguinte — a luta
       só abria 30 s depois (visto pelo subagente de verificação). */
    setTimeout(() => { if (!vs.classList.contains('ativo') && !vs.dataset.sala) vs.innerHTML = ''; }, 450);
  }
  if (_pvpVsTravou) {
    _pvpVsTravou = false;
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
  }
  const tinha = !!_pvpSalaId;
  _pvpSalaId = null; _pvpSala = null;
  if (tinha) _pvpMudarEstado(_pvpFila ? 'fila' : 'livre');
  void silencioso;
}

function _pvpLados() {
  const s = _pvpSala;
  const euA = s.lados && s.lados.A === _pvpUid;
  const eu = _pvpUid, ele = euA ? s.lados.B : s.lados.A;
  return { eu, ele, jEu: s.jogadores[eu] || {}, jEle: s.jogadores[ele] || {} };
}

function _pvpLadoHTML(j, lado) {
  const eq = (j.equipe || []);
  return `<div class="pvp-vs-lado ${lado}">
    <div class="pvp-vs-quem">
      <div class="pvp-vs-nome">${esc(j.nome || '—')}</div>
      <div class="pvp-vs-poder">${t('pvp.lobby.poder', { p: j.poder | 0 })}</div>
      <div class="pvp-vs-fora" data-fora>${esc(t('pvp.sala.desconectado'))}</div>
    </div>
    <div class="pvp-vs-equipe">
      ${eq.map((r, i) => `<figure class="pvp-vs-av" style="--i:${i}">
        <div class="pvp-vs-av-arte">${_pvpRetratoSVG(r, 120)}</div>
        <figcaption><b>${esc(String(r.nome || '').split(',')[0])}</b><span>${esc(t('pvp.nivel', { n: r.nivel | 0 }))}</span></figcaption>
      </figure>`).join('')}
    </div>
  </div>`;
}

function _pvpAbrirVersus() {
  if (!_pvpSala) return;
  // Sai de qualquer tela: o lobby, a batalha, um minijogo.
  if (_pvpLobbyAberto()) fecharLobbyPvP();
  if (typeof fecharBatalha === 'function') fecharBatalha();

  let vs = document.getElementById('pvpVersus');
  if (!vs) {
    vs = document.createElement('div');
    vs.id = 'pvpVersus'; vs.className = 'pvp-vs';
    document.body.appendChild(vs);
  }
  const L = _pvpLados();
  const amistosa = _pvpSala.tipo === 'amistosa';
  const salaDoVs = _pvpSalaId;
  vs.dataset.sala = salaDoVs;
  vs.innerHTML = `
    <div class="pvp-vs-fundo"><i></i></div>
    ${_pvpLadoHTML(L.jEle, 'ele')}
    <div class="pvp-vs-meio">
      <div class="pvp-vs-emblema"><i class="bt-fenda ouro esq"></i><span>VS</span><i class="bt-fenda ouro dir"></i></div>
      <div class="pvp-vs-tipo ${amistosa ? 'amistosa' : ''}">${esc(t(amistosa ? 'pvp.sala.amistosa' : 'pvp.sala.fila'))}</div>
      <div class="pvp-vs-conta" id="pvpVsConta"></div>
    </div>
    ${_pvpLadoHTML(L.jEu, 'eu')}
    <div class="pvp-vs-rodape">
      <button class="pvp-btn sec mini" onclick="pvpSairSala()">${esc(t('pvp.sala.sair'))}</button>
    </div>`;
  /* Um quadro para o navegador assentar o estado inicial, e só então a
     entrada — se a sala ainda for esta: pode ter fechado nesse meio. */
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (_pvpSalaId === salaDoVs && vs.dataset.sala === salaDoVs) vs.classList.add('ativo');
  }));
  if (!_pvpVsTravou && typeof lockBodyScroll === 'function') { lockBodyScroll(); _pvpVsTravou = true; }
  _pvpAtualizarVersus();
  clearInterval(_pvpVsTimer);
  _pvpVsTimer = setInterval(_pvpAtualizarVersus, 250);
}

function _pvpAtualizarVersus() {
  const vs = document.getElementById('pvpVersus');
  if (!vs || !_pvpSala) return;
  const L = _pvpLados();
  const pres = _pvpSala.presenca || {};
  const eleFora = !pres[L.ele] || !!pres[L.ele].fora;
  const ladoEle = vs.querySelector('.pvp-vs-lado.ele');
  if (ladoEle) ladoEle.classList.toggle('fora', eleFora);

  const falta = (_pvpSala.inicio || 0) - pvpAgora();
  // A luta não depende da tela do versus: acabou a contagem, entra-se.
  if (falta <= -700 && _pvpSala.estado === 'luta') { _pvpEntrarNaLuta(); return; }
  const conta = document.getElementById('pvpVsConta');
  if (!conta) return;
  if (falta > 0) {
    const n = Math.ceil(falta / 1000);
    if (conta.dataset.n !== String(n)) {
      conta.dataset.n = String(n);
      conta.innerHTML = `<span class="pvp-vs-num">${n}</span><small>${esc(t('pvp.sala.comeca'))}</small>`;
    }
    return;
  }
  // A contagem acabou: a luta.
  if (conta.dataset.n !== 'fim') {
    conta.dataset.n = 'fim';
    conta.innerHTML = `<div class="pvp-vs-pronto">${esc(t('pvp.sala.lutem'))}</div>`;
    const rod = vs.querySelector('.pvp-vs-rodape');
    if (rod) rod.style.visibility = 'hidden';
    if (_pvpSala.estado === 'luta') setTimeout(_pvpEntrarNaLuta, 650);
  }
}

/* ── DO VERSUS PARA A ARENA ──
   O ouvinte da sala inteira sai (durante a luta cada jogada chegaria com
   a sala toda de novo); a luta (js/pvp-luta.js) ouve só o que precisa. O
   versus desaparece por cima da arena já montada. */
function _pvpEntrarNaLuta() {
  if (!_pvpSala || !_pvpSalaId || typeof pvpLutaAbrir !== 'function') return;
  if (typeof pvpLutaAtiva === 'function' && pvpLutaAtiva()) return;
  const id = _pvpSalaId, sala = _pvpSala;
  if (_pvpSalaRef) { _pvpSalaRef.off(); _pvpSalaRef = null; }
  if (_pvpSalaPresTimer) { clearInterval(_pvpSalaPresTimer); _pvpSalaPresTimer = null; }
  if (_pvpSalaPresRef) { try { _pvpSalaPresRef.onDisconnect().cancel(); } catch (e) {} _pvpSalaPresRef = null; }
  clearInterval(_pvpVsTimer); _pvpVsTimer = null;
  pvpLutaAbrir(id, sala, _pvpUid);
  const vs = document.getElementById('pvpVersus');
  if (vs) {
    vs.classList.add('saindo');
    setTimeout(() => {
      vs.classList.remove('ativo', 'saindo');
      delete vs.dataset.sala;
      setTimeout(() => { if (!vs.classList.contains('ativo') && !vs.dataset.sala) vs.innerHTML = ''; }, 450);
    }, 60);
  }
  if (_pvpVsTravou) {
    _pvpVsTravou = false;
    if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
  }
}

/* A luta fechou (js/pvp-luta.js): de volta ao lobby, ou direto para uma
   busca nova. */
function _pvpDepoisDaLuta(depois) {
  _pvpSalaId = null; _pvpSala = null;
  if (typeof depois === 'string' && depois.indexOf('interrompida:') === 0) {
    _pvpPendente = depois.slice('interrompida:'.length);
    showToast(t('pvp.luta.interrompida'), 'err');
  } else {
    _pvpPendente = null;
    _pvpMudarEstado('livre');
  }
  abrirLobbyPvP();
  if (depois === 'procurar') setTimeout(pvpProcurar, 300);
}

// A partida que ficou em curso quando a arena fechou (ver acima).
let _pvpPendente = null;
function pvpVoltarPartida() {
  const id = _pvpPendente;
  _pvpPendente = null;
  if (id) _pvpReabrir(id);
}
window.pvpVoltarPartida = pvpVoltarPartida;
window._pvpDepoisDaLuta = _pvpDepoisDaLuta;

async function pvpSairSala() {
  const id = _pvpSalaId;
  if (!id) return;
  try {
    await _pvpChamar('sairSala', { sala: id });
    // De volta ao lobby, depois de o versus sair de cena.
    setTimeout(() => { if (!_pvpSalaId) abrirLobbyPvP(); }, 450);
  } catch (e) { showToast(_pvpErroTexto(e), 'err'); }
}
window.pvpSairSala = pvpSairSala;

window.pvpIniciar = pvpIniciar;
window.pvpEncerrar = pvpEncerrar;
