// ═══════════════════════════════════════════════════════════════════
//  fazenda.js — A COLÓNIA
//
//  Depende de: avatarSlots, activeSlotIdx, gs (state.js), gerarSVG
//              (mini-avatar.js), saveRuntimeToSlot/loadRuntimeFromSlot
//              (state.js), spendCoins (actions.js), t() (i18n)
//
//  ── PORQUE É QUE ISTO EXISTE ──
//
//  O jogo mostrava UMA criatura na consola e escondia as outras nove
//  atrás de um modal que nem sequer exibia os vitais delas. Ao mesmo
//  tempo, o combate pedia uma equipa de três. Quem jogava tinha de
//  adivinhar como estavam dois terços do seu plantel.
//
//  Agora a consola abre na colónia: todos à vista, com os cinco vitais
//  de cada um. O "Cuidar" abre o ecrã de sempre — o bicho grande, as
//  animações, o carinho — para aquele avatar. A intimidade não se
//  perdeu, mudou de sítio: passou a ser um lugar onde se entra em vez
//  de ser o único lugar que existe.
//
//  ── AS ACÇÕES DE GRUPO ──
//
//  Uma por vital, e cada uma cobra pelo que faz: o preço é o da acção
//  individual multiplicado por quantos precisam dela. Nunca se paga por
//  quem já está bem — o botão conta os candidatos antes e diz quantos
//  são. Com dez criaturas, dar de comer uma a uma eram dez viagens ao
//  mesmo sítio; isto é a mesma coisa numa só, sem desconto nenhum.
// ═══════════════════════════════════════════════════════════════════

/* Cada acção diz a quem serve, quanto custa e o que faz. Ter isto numa
   tabela em vez de cinco funções quase iguais é o que permite ao botão
   e ao render lerem a MESMA regra — era assim que um botão acabava a
   prometer um preço e a acção a cobrar outro. */
const FAZENDA_ACOES = {
  nutrir: {
    emoji: '🍖', vital: 'fome', cor: '#e74c3c',
    custo: () => CUSTO_NUTRIR,
    precisa: (s, v) => v.fome < 100 && !s.sleeping,
    aplica: (s, v) => {
      const g = 20 + randInt(0, 15);
      v.fome = Math.min(100, v.fome + g);
      const base = 30 + Math.round(Math.random() * 10);
      s.poopPressure = Math.min(100, (s.poopPressure || 0) + Math.round(base * rarityBonus(s).decay));
      s.vinculo = Math.min(400, (s.vinculo || 0) + 2);
      return g;
    },
  },
  banho: {
    emoji: '🛁', vital: 'higiene', cor: '#5ab4e8',
    custo: () => 0,                       // custa energia, não moedas
    precisa: (s, v) => v.higiene < 100 && v.energia >= BANHO_ENERGIA && !s.sleeping,
    aplica: (s, v) => {
      v.energia = Math.max(0, v.energia - BANHO_ENERGIA);
      const g = Math.round(50 + Math.random() * 20);
      v.higiene = Math.min(100, v.higiene + g);
      v.humor   = Math.min(100, v.humor + 15);
      s.dirtyLevel = 0;
      s.vinculo = Math.min(400, (s.vinculo || 0) + 3);
      return g;
    },
  },
  medicar: {
    emoji: '💊', vital: 'saude', cor: '#27ae60',
    custo: () => CUSTO_MEDICAR,
    precisa: (s, v) => v.saude < 100,
    aplica: (s, v) => {
      v.saude = Math.min(100, v.saude + 40);
      s.sick = false;
      s.vinculo = Math.min(400, (s.vinculo || 0) + 4);
      return 40;
    },
  },
  carinho: {
    emoji: '💕', vital: 'humor', cor: '#e830c0',
    custo: () => 0,
    // O mesmo arrefecimento do carinho individual, por avatar: sem ele
    // o botão dava humor infinito por zero moedas.
    precisa: (s, v) => v.humor < 100 && (s.petCooldown || 0) <= 0 && !s.sleeping,
    aplica: (s, v) => {
      v.humor = Math.min(100, v.humor + 8);
      s.vinculo = Math.min(400, (s.vinculo || 0) + 1);
      s.petCooldown = 10;
      return 8;
    },
  },
  ninar: {
    emoji: '😴', vital: 'energia', cor: '#c9a84c',
    custo: () => 0,
    // Dormir não se força a quem está bem desperto: abaixo de metade da
    // energia é cansaço a sério, acima disso é tirar o bicho do jogo.
    precisa: (s, v) => !s.sleeping && v.energia < 50,
    aplica: (s) => { s.sleeping = true; return 0; },
  },
};

/* ESTAMOS NA COLÓNIA?

   Não chega esconder o aliveScreen uma vez. Os dois ecrãs são
   position:absolute com inset:0, portanto coexistem sem se empurrarem —
   e há vários caminhos que repõem o da criatura depois: o
   rebuildScreensParaSlot, a sincronização com a nuvem no fim do login, a
   invocação. Quando isso acontecia, a criatura aparecia POR BAIXO da
   lista, com o "FASE: BEBÊ" a atravessar os cartões, e nada respondia
   porque os cliques iam para o ecrã de cima.

   Com um estado explícito, quem reconstrói os ecrãs pergunta primeiro
   onde é que o jogador está. */
window._fzModoColonia = false;

// Reafirma a colónia depois de alguém reconstruir os ecrãs por baixo
// dela. Chamada no fim do rebuildScreensParaSlot.
function fzReafirmar() {
  if (window._fzModoColonia) abrirFazenda();
}

// Os avatares vivos, por ordem de slot.
function fazendaVivos() {
  if (typeof avatarSlots === 'undefined') return [];
  return avatarSlots
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s && s.hatched && !s.dead && s.vitals);
}

/* Quem precisa de uma acção, e quanto custa servi-los a todos.

   Corre sempre DEPOIS de gravar o avatar aberto no seu slot: os vitais
   dele vivem em globais enquanto está aberto, e ler o slot sem gravar
   primeiro dava o estado de há um minuto atrás. */
function fazendaCandidatos(tipo) {
  const acao = FAZENDA_ACOES[tipo];
  if (!acao) return { lista: [], custo: 0 };
  const lista = fazendaVivos().filter(({ s }) => acao.precisa(s, s.vitals));
  return { lista, custo: acao.custo() * lista.length };
}

// ── A ACÇÃO DE GRUPO ──
function cuidarDeTodos(tipo) {
  const acao = FAZENDA_ACOES[tipo];
  if (!acao) return;

  // O avatar aberto tem os vitais em globais; grava-os antes de contar.
  if (typeof saveRuntimeToSlot === 'function') saveRuntimeToSlot(activeSlotIdx);

  const { lista, custo } = fazendaCandidatos(tipo);

  if (lista.length === 0) {
    showBubble(t('fazenda.ninguem.' + tipo));
    return;
  }
  if (custo > 0 && gs.moedas < custo) {
    if (typeof playSound === 'function') playSound('no_coins');
    showBubble(t('fazenda.sem_moedas', { custo }));
    addLog(t('fazenda.log.sem_moedas', { custo, n: lista.length }), 'bad');
    return;
  }
  if (custo > 0 && !spendCoins(custo)) return;

  lista.forEach(({ s }) => acao.aplica(s, s.vitals));

  // O aberto recarrega dos slots para os globais não ficarem atrasados.
  if (typeof loadRuntimeFromSlot === 'function') loadRuntimeFromSlot(activeSlotIdx);

  if (typeof playSound === 'function') playSound(tipo === 'medicar' ? 'heal' : tipo === 'banho' ? 'bath' : 'feed');
  showFloat(`${acao.emoji} ×${lista.length}`, acao.cor);
  addLog(t('fazenda.log.' + tipo, { n: lista.length, custo }), 'good');

  renderFazenda();
  if (typeof updateAllUI === 'function') updateAllUI();
  if (typeof scheduleSave === 'function') scheduleSave();
}

// ═══════════════════════════════════════════
// O ECRÃ
// ═══════════════════════════════════════════

// Os cinco vitais na ordem em que se lêem no cartão.
const FAZENDA_VITAIS = [
  { chave: 'fome',    emoji: '🍖', cor: '#e74c3c' },
  { chave: 'humor',   emoji: '😄', cor: '#e830c0' },
  { chave: 'energia', emoji: '⚡', cor: '#c9a84c' },
  { chave: 'saude',   emoji: '💚', cor: '#27ae60' },
  { chave: 'higiene', emoji: '🛁', cor: '#5ab4e8' },
];

// Abaixo disto a barra pisca: é o mesmo limiar a partir do qual o
// gameTick começa a contar stress para doença.
const FAZENDA_ALERTA = 20;

function _fazendaBarra(v, cfg) {
  const val = Math.max(0, Math.min(100, Math.round(v ?? 100)));
  const baixo = val < FAZENDA_ALERTA;
  return `<div class="fz-bar" title="${cfg.emoji} ${val}">
    <div class="fz-bar-fill${baixo ? ' fz-baixo' : ''}" style="width:${val}%;background:${cfg.cor};"></div>
  </div>`;
}

function _fazendaCartao({ s, idx }) {
  const v     = s.vitals || {};
  const nome  = (s.nome || 'Avatar').split(',')[0].trim();
  const aberto = idx === activeSlotIdx;
  const dorme  = !!s.sleeping;
  const doente = (s.activeDiseases || []).length > 0;
  const svg = (typeof gerarSVG === 'function')
    ? gerarSVG(s.elemento, s.raridade, s.seed || 0, 38, 38, (typeof _faseNum === 'function' ? _faseNum(s.nivel) : 0))
    : '';

  return `<div class="fz-card${aberto ? ' fz-aberto' : ''}${doente ? ' fz-doente' : ''}">
    <div class="fz-av">${svg}${dorme ? '<span class="fz-zzz">💤</span>' : ''}</div>
    <div class="fz-info">
      <div class="fz-nome">${esc(nome)}${doente ? ' <span class="fz-alerta">⚠</span>' : ''}</div>
      <div class="fz-barras">${FAZENDA_VITAIS.map(c => _fazendaBarra(v[c.chave], c)).join('')}</div>
    </div>
    <button class="fz-cuidar" onclick="cuidarDe(${idx})">${t(aberto ? 'fazenda.aqui' : 'fazenda.cuidar')}</button>
  </div>`;
}

function renderFazenda() {
  const el = document.getElementById('fazendaLista');
  if (!el) return;

  if (typeof saveRuntimeToSlot === 'function') saveRuntimeToSlot(activeSlotIdx);
  const vivos = fazendaVivos();

  if (vivos.length === 0) {
    el.innerHTML = `<div class="fz-vazio">${t('fazenda.vazio')}</div>`;
  } else {
    el.innerHTML = vivos.map(_fazendaCartao).join('');
  }

  // "3 de 5": quantos vivem, de quantos slots abertos. Diz de relance se
  // há espaço para invocar mais sem obrigar a contar cartões.
  const conta = document.getElementById('fazendaConta');
  if (conta) {
    const total = (typeof getUnlockedSlots === 'function') ? getUnlockedSlots() : vivos.length;
    conta.textContent = t('fazenda.conta', { vivos: vivos.length, total });
  }

  // Os botões dizem quantos servem e quanto custa, antes de se carregar.
  const barra = document.getElementById('fazendaAcoes');
  if (!barra) return;
  barra.innerHTML = Object.entries(FAZENDA_ACOES).map(([tipo, acao]) => {
    const { lista, custo } = fazendaCandidatos(tipo);
    const n      = lista.length;
    const sem    = n === 0;
    const caro   = custo > 0 && gs.moedas < custo;
    return `<button class="fz-acao${sem ? ' fz-off' : ''}${caro ? ' fz-caro' : ''}"
      onclick="cuidarDeTodos('${tipo}')" ${sem ? 'disabled' : ''}
      title="${t('fazenda.tip.' + tipo)}">
      <span class="fz-acao-emoji">${acao.emoji}</span>
      <span class="fz-acao-n">${n}</span>
      ${custo > 0 ? `<span class="fz-acao-custo">${custo} 🪙</span>` : ''}
    </button>`;
  }).join('');
}

// ── Trocar entre a colónia e o cuidado de um ──
function abrirFazenda() {
  window._fzModoColonia = true;
  ['aliveScreen', 'deadScreen', 'idleScreen', 'eggScreen'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });
  const fz = document.getElementById('fazendaScreen');
  if (fz) fz.style.display = 'flex';
  const tela = document.getElementById('mainScreen');
  if (tela) tela.classList.add('fz-modo');
  // display:none e nao so opacity:0 — invisivel mas presente, a fila
  // dos botoes de cuidar deixava uma faixa vazia por baixo da lista, que
  // no telemovel era quase um terco da consola.
  const btns = document.getElementById('actionBtns');
  if (btns) { btns.style.display = 'none'; btns.style.opacity = '0'; btns.style.pointerEvents = 'none'; }
  const volta = document.getElementById('btnColonia');
  if (volta) volta.style.display = 'none';
  // Os paineis de detalhe sao de UMA criatura: nome, nivel, XP e os
  // cinco vitais dela. Na colonia mostram os de quem esta aberto por
  // baixo de uma lista que ja mostra os de todos — o mesmo bicho duas
  // vezes, e o de baixo sem dizer de quem e.
  ['creatureCard', 'statusCard', 'mobileStatusInline'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });
  renderFazenda();
}

/* Entrar no cuidado de um avatar.

   Isto mexe no activeSlotIdx, que já não decide quem VIVE — desde que a
   colónia existe, vivem todos — mas continua a decidir quem está
   espelhado nos globais e portanto quem tem animações, cocó e bolhas.
   Trocar aqui é seguro: o que fica para trás continua a comer e a
   envelhecer no viverTodos(). */
async function cuidarDe(idx) {
  // O switchSlot() do state.js é a fonte única desta troca: grava o
  // anterior, carrega o novo e reconstrói os ecrãs. Fazer isto à mão
  // aqui criava uma corrida com o scheduleSave() do jogo — foi o que já
  // aconteceu no "usar este slot" do marketplace, e por isso ele também
  // passou a chamar esta função em vez de duplicá-la.
  // Desliga ANTES do switchSlot: ele chama o rebuildScreensParaSlot,
  // que reafirma a colónia se o estado ainda estiver ligado — e o
  // jogador ficava preso na lista sem conseguir entrar em ninguém.
  window._fzModoColonia = false;
  if (idx !== activeSlotIdx && typeof switchSlot === 'function') {
    await switchSlot(idx);
  }
  const fz = document.getElementById('fazendaScreen');
  if (fz) fz.style.display = 'none';
  const tela = document.getElementById('mainScreen');
  if (tela) tela.classList.remove('fz-modo');
  const btns = document.getElementById('actionBtns');
  if (btns) { btns.style.display = ''; btns.style.opacity = '1'; btns.style.pointerEvents = 'auto'; }
  const volta = document.getElementById('btnColonia');
  if (volta) volta.style.display = '';
  const cc = document.getElementById('creatureCard'); if (cc) cc.style.display = 'block';
  const sc = document.getElementById('statusCard');   if (sc) sc.style.display = 'block';
  // Este volta a '' e nao a um valor fixo: quem manda nele e uma media
  // query, e escrever 'block' aqui punha-o visivel tambem no desktop,
  // onde ele nao pertence.
  const ms = document.getElementById('mobileStatusInline'); if (ms) ms.style.display = '';
  // Quem decide QUAL ecrã abrir é o rebuildScreensParaSlot, que o
  // switchSlot já chamou: um slot vazio abre o painel de invocar, um ovo
  // por chocar abre o ovo. Só forçamos o aliveScreen quando não houve
  // troca nenhuma e portanto ninguém reconstruiu nada.
  if (idx === activeSlotIdx) {
    const alive = document.getElementById('aliveScreen');
    if (alive && hatched && !dead) alive.style.display = 'flex';
  }
  if (typeof updateAllUI === 'function') updateAllUI();
}

function voltarAFazenda() { abrirFazenda(); }
