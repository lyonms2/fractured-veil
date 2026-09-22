// ═══════════════════════════════════════════════════════════════════
// AMIGOS — Lista de amigos, pedidos, visitas
// Depende de: walletAddress (global), firebase (global),
//             gerarSVG() (data.js), gs (state.js),
//             scheduleSave() (firebase.js), updateResourceUI() (ui.js)
// ═══════════════════════════════════════════════════════════════════

const COOLDOWN_VISITA_MS = 8 * 60 * 60 * 1000; // 8h
const CUSTO_VISITA       = 5;   // o MOEDAS_VISITA do api/amigos.js
const MAX_VISITAS_GLOBAL = 10;
/* Alimentar, brincar e limpar: o descanso de 8h é por amigo e por ação,
   então cada amigo dá três interações por janela (o TIPO_VITAL do
   api/amigos.js). É isto que faz o teto de quem tem poucos amigos. */
const ACOES_POR_AMIGO    = 3;

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
/* Busca sempre, desenhe ou não: a tela de visita conta as interações do
   dia a partir destes dados, e com a tela de Amigos fechada ela parava
   em "0/10" mesmo depois de eu ter visitado. */
async function _carregarAmigos() {
  const el = document.getElementById('amigosConteudo');
  if(el) el.innerHTML = `<div class="amigos-loading">${t('amigos.loading')}</div>`;

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch(`/api/amigos?lista=1&idToken=${encodeURIComponent(idToken)}`);
    const json    = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');
    _amigosData = { amigos: json.amigos, pedidos: json.pedidos, visitasLog: json.visitasLog,
                    meuCodigo: json.meuCodigo || null };
    _updateAmigosBadge(json.pedidos.length);
    if(el) _renderAmigos();
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
    <!-- ── O CÓDIGO, DOS DOIS LADOS ──

         Aqui havia uma caixa de procura por nome. O nome não é único,
         era escrito pelo cliente e a procura era por prefixo — ver a
         nota no api/amigos.js.

         Ficam duas caixas: o código que se dá, e o campo onde se põe o
         que nos deram. -->
    <div class="amigos-codigo-box">
      <div class="amigos-codigo-rot">${t('amigos.meu_codigo')}</div>
      <div class="amigos-codigo-linha">
        <span class="amigos-codigo-valor" id="amigosMeuCodigo">${esc(_codigoBonito(_amigosData.meuCodigo))}</span>
        <button class="amigos-codigo-copiar" onclick="amigoCopiarCodigo()">${t('amigos.copiar')}</button>
      </div>
      <div class="amigos-codigo-sub">${t('amigos.meu_codigo_sub')}</div>
    </div>

    <div class="amigos-search-wrap">
      <input id="amigosCodigo" class="amigos-input amigos-input-codigo" type="text"
             placeholder="${t('amigos.codigo_ph')}" maxlength="7" autocapitalize="characters"
             autocomplete="off" spellcheck="false"
             onkeydown="if(event.key==='Enter')amigoAdicionarPorCodigo()">
      <button class="amigos-btn-add" onclick="amigoAdicionarPorCodigo()">${t('amigos.btn.add')}</button>
    </div>
    <div id="amigosCodigoAviso" class="amigos-codigo-aviso"></div>

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
      <div class="amigos-card-nome">${esc(info.nome || t('id.sem_nome'))}</div>
      <div class="amigos-card-btns">
        <button class="amigos-btn-visitar" onclick="amigoAbrirVisita('${uid}')">${t('amigos.btn.visit')}</button>
        <button class="amigos-btn-remover" onclick="amigoRemover('${uid}', this)">✕</button>
      </div>
    </div>`;
}

/* O código mostra-se partido a meio — ABC-123 — porque seis letras
   seguidas leem-se mal e ditam-se pior. O hífen é só apresentação: o
   servidor aceita-o e deita-o fora (ver _limparCodigo, em
   api/amigos.js). */
function _codigoBonito(c) {
  if (!c) return '······';
  const s = String(c).toUpperCase();
  return s.length === 6 ? s.slice(0, 3) + '-' + s.slice(3) : s;
}

async function amigoCopiarCodigo() {
  const c = _amigosData && _amigosData.meuCodigo;
  if (!c) return;
  const texto = _codigoBonito(c);
  try {
    await navigator.clipboard.writeText(texto);
    if (typeof showToast === 'function') showToast(t('amigos.copiado'), 'ok');
  } catch (e) {
    /* Sem permissão para a área de transferência — acontece em contextos
       não seguros e em alguns navegadores de telemóvel. Seleciona-se o
       código para o jogador o copiar à mão, que é melhor do que um botão
       que não faz nada. */
    const el = document.getElementById('amigosMeuCodigo');
    if (el && window.getSelection) {
      const r = document.createRange(); r.selectNodeContents(el);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
    }
  }
}
window.amigoCopiarCodigo = amigoCopiarCodigo;

async function amigoAdicionarPorCodigo() {
  const input = document.getElementById('amigosCodigo');
  const aviso = document.getElementById('amigosCodigoAviso');
  if (!input) return;
  const bruto = input.value.trim();
  if (!bruto) return;

  if (aviso) { aviso.textContent = ''; aviso.classList.remove('erro'); }

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp = await fetch('/api/amigos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'pedir', idToken, codigo: bruto }),
    });
    const json = await resp.json();
    /* O texto do erro vem do i18n pelo `motivo`, e não do `erro` que o
       servidor manda: esse está numa língua só, e é para o log. Se
       aparecer um motivo que ainda não tenha texto, fica o do servidor,
       que é melhor do que uma caixa vazia. */
    if (!json.ok) {
      const chave = json.motivo ? ('amigos.err.' + json.motivo) : '';
      const texto = chave ? t(chave) : '';
      throw new Error((texto && texto !== chave) ? texto : (json.erro || t('amigos.err.invalido')));
    }

    input.value = '';
    if (aviso) aviso.textContent = t('amigos.pedido_enviado');
    if (typeof showToast === 'function') showToast(t('amigos.pedido_enviado'), 'ok');
  } catch (err) {
    /* O erro fica NA CAIXA e não só num toast: quem escreveu um código
       errado precisa de o ver ao lado do que escreveu para o corrigir. */
    if (aviso) { aviso.textContent = err.message; aviso.classList.add('erro'); }
    if (typeof playSound === 'function') playSound('error');
  }
}
window.amigoAdicionarPorCodigo = amigoAdicionarPorCodigo;

/* ── A PESQUISA POR NOME SAIU DAQUI ──

   Eram três funções: o debounce, a chamada à API e o botão de enviar o
   pedido a partir de um resultado. Nenhuma tem uso desde que não há
   resultados para listar — o pedido faz-se pelo código, no
   amigoAdicionarPorCodigo, aqui em cima.

   A razão está escrita no api/amigos.js: o nome do jogador não é único
   e é escrito pelo cliente. */

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
    // Atualizar estado local
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

/* ═══ O PEDIDO DE AMIZADE AVISA ═══
   Ficava só dentro da tela de Amigos, com um número na bolha: quem não
   abrisse a tela não sabia de nada. Agora chega como o desafio do PvP —
   um cartão no canto, em qualquer tela, com Aceitar e Recusar — e usa a
   mesma caixa e o mesmo desenho (.pvp-convite, css/pvp.css), porque é o
   mesmo gesto: alguém chamou, e há duas respostas.

   Quem os traz é o ouvinte do próprio documento, que já existia para a
   sessão (js/auth.js): nenhuma leitura nova. */
const _amigosAvisados = {};
function amigosAvisarPedidos(pedidos) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  const vivos = new Set(lista.map(p => p && p.de).filter(Boolean));
  let box = document.getElementById('pvpConvites');
  // O que já não está pendente (aceito, recusado, retirado) sai da tela.
  if (box) box.querySelectorAll('.pvp-convite.amigo').forEach(el => {
    if (!vivos.has(el.dataset.de)) el.remove();
  });
  for (const p of lista) {
    if (!p || !p.de || _amigosAvisados[p.de]) continue;
    _amigosAvisados[p.de] = true;
    if (!box) {
      box = document.createElement('div');
      box.id = 'pvpConvites'; box.className = 'pvp-convites';
      document.body.appendChild(box);
    }
    if (box.querySelector(`.pvp-convite.amigo[data-de="${CSS.escape(p.de)}"]`)) continue;
    const el = document.createElement('div');
    el.className = 'pvp-convite amigo';
    el.dataset.de = p.de;
    el.innerHTML = `
      <div class="pvp-convite-marca amigo">🤝</div>
      <div class="pvp-convite-txt">
        <b>${esc(t('amigos.pedido.titulo', { nome: p.nome || t('id.sem_nome') }))}</b>
        <span>${esc(t('amigos.pedido.sub'))}</span>
      </div>
      <div class="pvp-convite-acoes">
        <button class="pvp-btn mini" onclick="amigosResponder('${esc(p.de)}', true)">${esc(t('amigos.pedido.aceitar'))}</button>
        <button class="pvp-btn mini sec" onclick="amigosResponder('${esc(p.de)}', false)">${esc(t('amigos.pedido.recusar'))}</button>
      </div>`;
    box.appendChild(el);
  }
}
window.amigosAvisarPedidos = amigosAvisarPedidos;

async function amigosResponder(uid, aceitar) {
  const el = document.querySelector(`.pvp-convite.amigo[data-de="${CSS.escape(uid)}"]`);
  if (el) el.classList.add('aceitando');
  try {
    if (aceitar) await amigoAceitar(uid); else await amigoRecusar(uid);
    if (typeof showToast === 'function')
      showToast(t(aceitar ? 'amigos.pedido.aceito' : 'amigos.pedido.recusado'), aceitar ? 'ok' : 'info');
  } finally {
    if (el) { el.classList.add('saindo'); setTimeout(() => el.remove(), 350); }
  }
}
window.amigosResponder = amigosResponder;

// ── Remover amigo ────────────────────────────────────────────
async function amigoRemover(alvoUid, botao) {
  // Dois toques no próprio ✕, e não uma caixa do navegador (uiConfirmar).
  if (typeof uiConfirmar === 'function' && !uiConfirmar(botao, t('amigos.confirm_remove_curto'))) return;
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

/* ── O CONTADOR DA TELA DE VISITA ──

   Quem manda é o servidor: ele conta no mesmo sítio onde aplica o
   limite (ver api/amigos.js, perfil), e assim os dois números nunca
   discordam — nem quando o jogador visitou no telemóvel e voltou ao
   computador sem recarregar a lista.

   A conta local fica como rede: um cache antigo da /api continua a
   mostrar alguma coisa em vez de "0/0". */
function _visitaFeitas() {
  if (_visitaAtual && typeof _visitaAtual.interacoes === 'number') return _visitaAtual.interacoes;
  return _contarVisitasGlobais();
}

/* O teto REAL: cada amigo dá três interações por 8h (uma por ação), e
   o descanso é por amigo. Com dois amigos o máximo é seis, e não dez. */
function _visitaTeto() {
  if (_visitaAtual && typeof _visitaAtual.teto === 'number') return _visitaAtual.teto;
  const nAmigos = Object.keys(_amigosData?.amigos || {}).length;
  return Math.min(MAX_VISITAS_GLOBAL, nAmigos * ACOES_POR_AMIGO);
}

// ── Contar interações globais nas últimas 8h ─────────────────
function _contarVisitasGlobais() {
  if(!_amigosData?.visitasLog) return 0;
  const agora = Date.now();
  let total = 0;
  for(const amigoUid of Object.keys(_amigosData.visitasLog)) {
    const log = _amigosData.visitasLog[amigoUid] || {};
    for(const _logTs of Object.keys(log)) {
      if(agora - (log[_logTs] || 0) < COOLDOWN_VISITA_MS) total++;
    }
  }
  return total;
}

// ── Abrir overlay de visita ──────────────────────────────────
async function amigoAbrirVisita(alvoUid) {
  // Sem a lista carregada, o contador de interações mentiria.
  if (!_amigosData) { try { await _carregarAmigos(); } catch (e) {} }
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

    /* ── A COLÓNIA INTEIRA, E UM ESCOLHIDO ──

       O servidor devolvia UM avatar — o que o amigo tivesse aberto — e
       era esse que se visitava. Devolve todos os que estão vivos, e
       quem escolhe a quem leva a comida é quem visita.

       Começa no primeiro, para haver sempre alguém escolhido e os
       botões nunca aparecerem à espera de uma escolha. */
    _visitaAtual = {
      uid: alvoUid, colonia: json.colonia || [],
      nomeJogador: json.nomeJogador || null,
      escolhido: 0, cooldowns: json.cooldowns,
      // De quando são os medidores (o último save do dono).
      visto: json.visto || null,
      /* Quantas interações já gastou e de quantas — contadas pelo
         servidor, onde o limite é aplicado. O `voltaTs` é o instante em
         que a primeira volta a estar livre, guardado como hora e não
         como "falta tanto": o painel redesenha-se várias vezes e o
         tempo tem de continuar a andar. */
      interacoes: (typeof json.interacoes === 'number') ? json.interacoes : null,
      teto:       (typeof json.teto === 'number')       ? json.teto       : null,
      voltaTs:    json.proximaEm ? Date.now() + json.proximaEm : 0,
    };
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

/* O nome de um avatar do amigo. O servidor manda vazio quando ele
   ainda não foi baptizado, e o rótulo é daqui porque tem tradução. */
function _visitaNome(c) {
  return (c && c.nome) ? c.nome : t('id.sem_nome');
}

// Quem está escolhido agora. Usado pelo render e pelo executarVisita.
function _visitaAlvo() {
  if(!_visitaAtual || !_visitaAtual.colonia) return null;
  return _visitaAtual.colonia[_visitaAtual.escolhido] || _visitaAtual.colonia[0] || null;
}

function visitaEscolher(i) {
  if(!_visitaAtual) return;
  _visitaAtual.escolhido = i;
  _renderVisitaOverlay();
}
window.visitaEscolher = visitaEscolher;

/* ── A LUPA DA VISITA ──

   Passava para o zoom só a raridade, a semente, o nível e o nome — sem o
   avatar — e o zoom não tinha certidão de onde calcular a ficha. Agora
   vai o avatar escolhido inteiro, como o servidor o mandou, com a
   certidão enxuta que a ficha usa. Uma resposta antiga, sem certidão,
   continua abrindo o zoom só com a figura. */
function visitaZoom() {
  const perfil = _visitaAlvo();
  if (!perfil || typeof openAvatarZoomData !== 'function') return;
  openAvatarZoomData(perfil.raridade, perfil.seed, perfil.nivel, _visitaNome(perfil), perfil);
}
window.visitaZoom = visitaZoom;

/* A fase por extenso (BEBÊ, JOVEM, ADULTO, ANCIÃO), como o resto do
   jogo mostra — a linha dizia só o nível e a raridade. */
function _visitaFase(p) {
  const fases = (typeof FASES !== 'undefined') ? FASES : [];
  const f = fases[_faseNum(p.nivel || 1)];
  return f ? ' · ' + esc(f) : '';
}

/* De quando é esta fotografia. Os medidores são do último save do dono:
   sem dizer isso, pareciam de agora — e um amigo que não entra há dois
   dias aparecia com a fome de dois dias atrás como se fosse a de hoje. */
function _visitaVistoHTML() {
  const quando = _visitaAtual && _visitaAtual.visto;
  if (!quando) return '';
  const min = Math.max(0, Math.round((Date.now() - quando) / 60000));
  const txt = min < 2 ? t('amigos.visto.agora')
            : min < 60 ? t('amigos.visto.min', { n: min })
            : min < 60 * 48 ? t('amigos.visto.h', { n: Math.round(min / 60) })
            : t('amigos.visto.d', { n: Math.round(min / 1440) });
  return `<div class="visita-visto">${esc(txt)}</div>`;
}

function _renderVisitaOverlay() {
  const body = document.getElementById('visitaBody');
  if(!body || !_visitaAtual) return;
  const { cooldowns, colonia } = _visitaAtual;
  const perfil = _visitaAlvo();
  if(!perfil) { body.innerHTML = `<div class="amigos-empty">${t('amigos.no_avatar')}</div>`; return; }
  const vitals = perfil.vitals || {};
  const agora        = Date.now();
  const visitasFeitas  = _visitaFeitas();
  const tetoVisitas    = _visitaTeto();
  const limiteAtingido = visitasFeitas >= tetoVisitas;

  function btnInfo(tipo, vitalKey) {
    const last   = cooldowns[tipo] || 0;
    const restMs = COOLDOWN_VISITA_MS - (agora - last);
    const emCooldown = restMs > 0;
    const vitalMax   = Math.round(vitals[vitalKey] ?? 100) >= 100;

    let disabled = false;
    let subLabel = t('amigos.visit.cost', {coins: CUSTO_VISITA});

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

  /* A fila da colónia. Cada um com a sua cara e o seu nome; o
     escolhido fica aceso. Com um avatar só a fila não aparece — não há
     escolha nenhuma para oferecer. */
  const fila = colonia.length > 1 ? `
    <div class="visita-colonia">
      ${colonia.map((c, i) => `
        <button class="visita-colonia-item${i === _visitaAtual.escolhido ? ' on' : ''}"
                onclick="visitaEscolher(${i})" title="${esc(_visitaNome(c))}">
          ${gerarSVG(c, c.raridade, c.seed, 34, 34, _faseNum(c.nivel || 1))}
          <span>${esc(_visitaNome(c))}</span>
        </button>`).join('')}
    </div>` : '';

  body.innerHTML = fila + `
    <div class="visita-avatar">
      <div class="av-zoom-wrap" style="position:relative;display:inline-block;">
        <div id="visitaAvatarWrap" class="creature-wrap" style="width:5rem;height:5rem;">
          <!-- A fase vem do _faseNum(), como em todo o resto do jogo.
               Estava em Math.ceil(nivel/5): errava em 8 de 10 níveis e a
               partir do 16 pedia uma fase que não existe (só há 0-3). -->
          ${gerarSVG(perfil, perfil.raridade, perfil.seed, 80, 80, _faseNum(perfil.nivel || 1))}
        </div>
        <button class="mkt-avatar-zoom-btn"
          onclick="visitaZoom()"
          title="Ampliar avatar">🔍</button>
      </div>
    </div>
    <div class="visita-nome">${esc(_visitaNome(perfil))}</div>
    <div class="visita-meta">${t('amigos.meta', {nivel: perfil.nivel, raridade: esc(perfil.raridade)})}${
      _visitaFase(perfil)}</div>
    ${_visitaVistoHTML()}

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

    <div class="visita-limite-info" style="text-align:center;font-size:0.6875rem;color:${limiteAtingido?'#e06c75':'#aaa'};margin-bottom:0.375rem;">
      ${t('amigos.interactions', {done: visitasFeitas, max: tetoVisitas})}${
        /* Chegado ao fim, o número sozinho é um beco: diz-se quando a
           primeira volta. */
        limiteAtingido && _visitaAtual.voltaTs
          ? ' ' + t('amigos.interactions.volta', {tempo: _formatMs(_visitaAtual.voltaTs - agora)})
          : ''}
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

// ── Executar ação de visita ─────────────────────────────────
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
      // O `alvoSlot` é o que faz da visita uma escolha: sem ele o
      // servidor leva ao primeiro vivo, como levava ao "activo".
      body:    JSON.stringify({ acao: 'visitar', idToken, alvoUid: _visitaAtual.uid,
                                tipo, alvoSlot: (_visitaAlvo() || {}).slot }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');

    /* Soma-se a DIFERENÇA ao que este navegador tem, e não o total que
       o servidor calculou do save: o save fica para trás, e pôr o total
       dele aqui fazia o saldo andar para trás. */
    gs.moedas = (gs.moedas || 0) + (json.ganhoMoedas ?? CUSTO_VISITA);
    updateResourceUI();
    scheduleSave();

    // Atualizar cooldown local + vital exibido
    if(_visitaAtual.cooldowns) _visitaAtual.cooldowns[tipo] = Date.now();
    const _alvo = _visitaAlvo();
    if(_alvo && _alvo.vitals) {
      const vitalField = { alimentar:'fome', brincar:'humor', limpar:'higiene' }[tipo];
      _alvo.vitals[vitalField] = json.novoVital;
    }

    // Atualizar visitasLog local
    if(_amigosData) {
      if(!_amigosData.visitasLog[_visitaAtual.uid]) _amigosData.visitasLog[_visitaAtual.uid] = {};
      _amigosData.visitasLog[_visitaAtual.uid][tipo] = Date.now();
    }
    // …e o contador do servidor anda com ela, sem pedir o perfil outra vez.
    if(typeof _visitaAtual.interacoes === 'number') _visitaAtual.interacoes++;
    if(!_visitaAtual.voltaTs) _visitaAtual.voltaTs = Date.now() + COOLDOWN_VISITA_MS;

    const icones = { alimentar:'🍖', brincar:'🎮', limpar:'🧼' };
    if(typeof showFloat === 'function') showFloat(`+${json.ganhoMoedas ?? CUSTO_VISITA} 🪙`, '#7ab87a');
    // O recado diz a QUEM se levou, e agora isso é uma escolha: lê-se
    // do escolhido, e não de um `perfil` que deixou de existir.
    if(typeof addLog   === 'function') addLog(t('amigos.log.visited', {icon: icones[tipo], nome: esc(_visitaNome(_alvo)), coins: CUSTO_VISITA}), 'good');

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
    [{fx:'-1.75rem'},{fx:'0'},{fx:'1.75rem'},{fx:'-0.875rem'},{fx:'0.875rem'}].forEach((pos, i) => {
      const el = document.createElement('div');
      el.className = 'food-particle';
      el.textContent = foods[i % foods.length];
      el.style.cssText = `--fx:${pos.fx};--fr:${(Math.random()*60-30).toFixed(0)}deg;top:0.625rem;left:50%;transform:translateX(-50%);animation-delay:${i*0.06}s`;
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
        el.style.cssText = `--fx:${((Math.random()*60-30).toFixed(0))/16}rem;--fr:${(Math.random()*60-30).toFixed(0)}deg;top:0.625rem;left:50%;transform:translateX(-50%);animation-delay:0s`;
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
