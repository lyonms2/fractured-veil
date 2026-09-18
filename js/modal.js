// ═══════════════════════════════════════════════════════════════════
// TRAVA DE SCROLL DO BODY — usada por qualquer overlay em tela cheia
// (ModalManager e também overlays soltos como avatarZoomOverlay, que não
// passam por ele). Só overflow:hidden não é confiável em touch/mobile —
// o padrão robusto é fixar o body na posição atual do scroll e restaurar
// ao destravar. Contagem de referências: vários overlays podem travar ao
// mesmo tempo (ex: zoom de avatar aberto por cima do marketplace) — só
// destrava de fato quando o último for fechado.
// ═══════════════════════════════════════════════════════════════════
let _scrollLockCount = 0;
let _scrollLockY     = 0;

function lockBodyScroll() {
  if(_scrollLockCount === 0) {
    _scrollLockY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add('modal-scroll-lock');
    // Em px, e não em rem: o _scrollLockY é a posição de rolagem
    // medida em px reais, não uma medida de desenho. A passagem de px
    // para rem pegou-o por engano e passou a multiplicá-lo pela
    // escala da raiz — abrir um modal com a página rolada saltava 1,5x
    // o deslocamento.
    document.body.style.top = `-${_scrollLockY}px`;
  }
  _scrollLockCount++;
}

function unlockBodyScroll() {
  _scrollLockCount = Math.max(0, _scrollLockCount - 1);
  if(_scrollLockCount === 0) {
    document.body.classList.remove('modal-scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, _scrollLockY);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MODAL MANAGER — um modal de cada vez
// ═══════════════════════════════════════════════════════════════════
const MODAL_IDS = [
  'gameSelector','eggInvModal','itemInvModal','hatchConfirmModal',
  'memoriaModal','simonModal','coinShopModal',
  'arenaModal',
  'fusaoModal','tetraModal',
  'marketplaceModal','combateModal','avataresModal','batalhaModal',
  'linhagemModal'
];

/* OS MODAIS NÃO PODEM VIVER DENTRO DE UM ECRÃ.

   Quase todos nasceram dentro do #aliveScreen, e durante muito tempo
   isso não teve consequência: a consola tinha uma tela só e ele estava
   sempre à vista. Quando a colônia passou a ser a casa, o
   abrirFazenda começou a esconder o aliveScreen — e levava atrás dele
   tudo o que lá estava dentro. Os botões do topo respondiam, o modal
   ganhava a classe .open, e não aparecia nada: estava dentro de um pai
   a display:none.

   Apanhou o 🪙, o 🥚 e o 🎒, que foram movidos no HTML. Mas ficavam
   mais dois alcançáveis de fora da tela de cuidar — o
   hatchConfirmModal, que se abre a partir do inventário de ovos, e o
   combateModal, que se abre da página da batalha — e qualquer modal
   novo cairia na mesma armadilha.

   Por isso a correcção é aqui e não no HTML: ao carregar, tudo o que
   for position:fixed e estiver enfiado numa tela muda-se para o body.
   Um elemento fixo não depende do pai para saber onde se desenha —
   depende dele só para saber se pode ser visto, que era o problema.

   Os absolutos ficam onde estão de propósito: o sleepOverlay, por
   exemplo, é absolute e escurece a moldura da consola, não a tela
   todo. Movê-lo estragava-o. */
function _moverModaisParaOBody() {
  const alvos = new Set(MODAL_IDS);
  document.querySelectorAll('.mini-modal').forEach(e => { if (e.id) alvos.add(e.id); });
  // Estes três não estão no MODAL_IDS nem são .mini-modal, mas são fixos
  // e vivem dentro da tela: cairiam na mesma armadilha no dia em que
  // alguém lhes puser uma porta fora da tela de cuidar.
  ['amigosOverlay', 'visitaOverlay', 'loreModal'].forEach(id => alvos.add(id));

  /* ── E A ARMADILHA APANHOU CINCO ──

     O aviso escrito aqui em cima — "qualquer modal novo cairia na mesma
     armadilha" — cumpriu-se. Cinco elementos fixos viviam dentro do
     #marketplaceModal, que está display:none enquanto ele não estiver
     aberto:

       · burnOverlay    — a confirmação de queimar um avatar
       · listOverlay    — a de pôr um à venda
       · avatarDetailOverlay
       · toast          — os avisos do JOGO INTEIRO

     O botão de queimar chamava tudo o que devia: enchia o cartão de
     pré-visualização, guardava o índice, punha a classe `open`. E não
     aparecia nada, porque um pai estava escondido. Foi assim que isto
     se descobriu.

     O toast era o pior: `showToast` faz getElementById('toast'), e esse
     elemento estava lá dentro. Todos os avisos do jogo — "faltam PM",
     "doente não batalha", "não dá para pausar agora" — ficavam com
     display:block e zero por zero pixels, a menos que o marketplace
     estivesse aberto por acaso.

     Uma lista à mão volta a ficar para trás. A regra é: o que é
     sobreposição do jogo sai (os `*Overlay` e o toast); o que é mobília
     do marketplace fica lá dentro e esconde-se com ele — a
     .mkt-bottom-nav é fixa e é dele, e sair daqui punha-a a flutuar por
     cima do jogo todo. Ela não tem id, e é por isso que não entra. */
  document.querySelectorAll('[id$="Overlay"]').forEach(e => alvos.add(e.id));
  alvos.add('toast');
  const movidos = [];
  alvos.forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.parentElement === document.body) return;
    if (getComputedStyle(el).position !== 'fixed') return;
    document.body.appendChild(el);
    movidos.push(id);
  });
  return movidos;
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _moverModaisParaOBody);
} else {
  _moverModaisParaOBody();
}

const ModalManager = {
  current: null,

  PANEL_MODALS: ['eggInvModal','itemInvModal','coinShopModal','marketplaceModal'],
  GAME_MODALS:  ['gameSelector','memoriaModal','simonModal','arenaModal','snakeModal','fusaoModal','tetraModal','combateModal'],

  open(id, onClose) {
    if(this.current && this.current !== id) this._close(this.current);
    this.current = id;
    this._onClose = onClose || null;
    document.getElementById(id).classList.add('open');
    if(!this.PANEL_MODALS.includes(id)) {
      document.getElementById('actionBtns').classList.add('jkp-mode');
    }
    if(this.GAME_MODALS.includes(id)) {
      const btn = document.getElementById('btnPlay');
      if(btn) btn.classList.add('disabled');
    }
    this._syncHelpBtn();
    this._syncBodyScroll();
  },

  close(id) {
    const target = id || this.current;
    if(!target) return;
    this._close(target);
    if(target === this.current) {
      this.current = null;
      if(this._onClose) { this._onClose(); this._onClose = null; }
    }
    this._syncHelpBtn();
    this._syncBodyScroll();
  },

  closeAll() {
    MODAL_IDS.forEach(id => this._close(id));
    this.current = null;
    this._onClose = null;
    document.getElementById('actionBtns').classList.remove('jkp-mode');
    const btn = document.getElementById('btnPlay');
    if(btn) btn.classList.remove('disabled');
    this._syncHelpBtn();
    this._syncBodyScroll();
  },

  isOpen(id) { return this.current === id; },
  anyOpen()  { return this.current !== null; },

  _close(id) {
    const el = document.getElementById(id);
    if(el) el.classList.remove('open');
    if(!this.PANEL_MODALS.includes(id) && (!this.current || this.current === id)) {
      document.getElementById('actionBtns').classList.remove('jkp-mode');
    }
    if(this.GAME_MODALS.includes(id)) {
      const btn = document.getElementById('btnPlay');
      if(btn) btn.classList.remove('disabled');
    }
  },

  // Esconde o botão flutuante "?" (canto inferior-direito, sempre visível)
  // enquanto qualquer modal está aberto — no mobile ele sobrepunha a barra
  // inferior do marketplace, que ocupa esse mesmo canto.
  _syncHelpBtn() {
    const btn = document.getElementById('gameHelpBtn');
    if(btn) btn.style.display = this.anyOpen() ? 'none' : 'flex';
  },

  // Trava/destrava o scroll do body via lockBodyScroll()/unlockBodyScroll()
  // — só chama quando o estado "algo aberto" realmente muda (evita travar
  // duas vezes ao trocar de modal, já que open() fecha o anterior primeiro).
  _bodyLocked: false,
  _syncBodyScroll() {
    const shouldLock = this.anyOpen();
    if(shouldLock && !this._bodyLocked) { this._bodyLocked = true; lockBodyScroll(); }
    else if(!shouldLock && this._bodyLocked) { this._bodyLocked = false; unlockBodyScroll(); }
  }
};

/* As pastilhas das dificuldades. Servem o seletor de jogos e a batalha,
   que usam a MESMA dificuldade: escolher o Mestre num lugar escolhe no
   outro. */
function diffPillsHTML() {
  const d   = miniDifficulty();
  const max = maxUnlockedTier();
  return DIFF_TIERS.map((dt, i) => {
    const unlocked  = i <= max;
    const active    = dt.tier === d.tier;
    const label     = t(dt.i18nKey);
    const tipLocked = t('diff.locked_tip') + ' ' + dt.minNivel;
    return `<button class="diff-pill ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}"
      data-tier="${i}"
      onclick="${unlocked ? 'setDifficulty('+i+')' : ''}"
      title="${!unlocked ? tipLocked : label}">
      ${!unlocked
        ? '<span class="dp-lock">🔒</span>'
        : `<span class="dp-icon">${dt.icon}</span>`}
      <span>${label}</span>
    </button>`;
  }).join('');
}

function renderGameSelector() {
  const rb = rarityBonus();
  const d  = miniDifficulty();
  const r  = n => Math.round(n);

  const pillsEl = document.getElementById('diffPills');
  if(pillsEl) pillsEl.innerHTML = diffPillsHTML();

  /* ── Os rótulos de prêmio ──
     Com as mesmas frações que cada jogo usa ao pagar. Os de antes tinham
     sido escritos à parte e não batiam: a Memória prometia de 1,0 a 1,6
     vezes a base e pagava de 0,15 a 1,0, e o Snake nem tinha rótulo —
     ficava o texto fixo do HTML.

     As moedas vão sempre até o perfeito; o piso é o que muda. A Memória
     termina sempre o tabuleiro e nunca paga menos que MEM_MOEDA_MIN; o
     Simon e o Snake podem acabar sem nada. */
  const rotulo = (id, xpMin, xpMax, cMin) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.textContent = t('modal.reward_range', {
      xpMin: r(d.xp * xpMin * rb.xp),      xpMax: r(d.xp * xpMax * rb.xp),
      cMin:  r(d.coins * cMin * rb.moedas), cMax:  r(d.coins * rb.moedas),
    });
  };
  rotulo('rewardMemoria', 0.5, 1.5, (typeof MEM_MOEDA_MIN === 'number') ? MEM_MOEDA_MIN : 0);
  rotulo('rewardSimon',   0,   1.3, 0);
  rotulo('rewardSnake',   0,   (typeof SNAKE_XP_MULT !== 'undefined') ? SNAKE_XP_MULT[d.tier] : 2, 0);
  // A Fusão e o Tetra pagam até 1,5 vez a base, na fração da meta.
  rotulo('rewardFusao',   0,   1.5, 0);
  rotulo('rewardTetra',   0,   1.5, 0);
}

function openGameSelector() {
  renderGameSelector();
  ModalManager.open('gameSelector');
}

function closeGameSelector() {
  ModalManager.close('gameSelector');
}

function openMinigame(type) {
  /* ── SEM NOME NÃO JOGA ──

     A mesma regra da batalha (ver _pveImpedimentoDe, em js/pve-fu.js):
     o nome é o primeiro ato do jogador sobre a criatura, e antes dele
     não há brincadeira. Fica aqui porque este é o caminho único de
     todos os minijogos — guardar cada um deles seria a mesma regra
     escrita cinco vezes.

     E não se recusa em silêncio: a tela do batismo abre logo a seguir,
     que é o que o jogador tem de fazer. */
  if (typeof temNome === 'function' && typeof avatar !== 'undefined'
      && avatar && !temNome(avatar)) {
    showBubble(t('mg.sem_nome'));
    if (typeof startRename === 'function' && typeof podeRenomear === 'function'
        && podeRenomear(avatar)) {
      setTimeout(() => startRename(avatar), 700);
    }
    return;
  }
  ModalManager.close('gameSelector');
  // O avatar entra com o jogo. Ver js/mini-avatar.js.
  const comAvatar = (modalId, avId, arranque) => {
    ModalManager.open(modalId);
    if (typeof miniAvatarMontar === 'function') miniAvatarMontar(avId);
    arranque();
  };
  if(type === 'memoria') { comAvatar('memoriaModal', 'memAvatar', startMemoria); return; }
  if(type === 'simon')   { comAvatar('simonModal',   'simonAvatar', startSimon); return; }
  if(type === 'snake')   { comAvatar('snakeModal',   'snakeAvatar', startSnake); return; }
  if(type === 'fusao')   { comAvatar('fusaoModal', 'fusaoAvatar', startFusao);  return; }
  if(type === 'tetra')   { comAvatar('tetraModal', 'tetraAvatar', startTetra);  return; }
}

function openMiniModal(id) {
  ModalManager.open(id);
  playAnim('anim-play');
}

const _PVE_MODALS = ['memoriaModal','simonModal','snakeModal','fusaoModal','tetraModal'];
function closeMiniModal(id) {
  // Tira o painel da lista de quem recebe reações. Sem isto, um jogo
  // fechado continuava a ser notificado pelo jogo seguinte.
  if (typeof miniAvatarDesmontar === 'function') {
    miniAvatarDesmontar({ memoriaModal:'memAvatar', simonModal:'simonAvatar',
                          snakeModal:'snakeAvatar',
                          fusaoModal:'fusaoAvatar', tetraModal:'tetraAvatar' }[id] || '');
  }
  ModalManager.close(id);
  if(_PVE_MODALS.includes(id) && typeof openGameSelector === 'function') {
    openGameSelector(); gsSetTab('pve');
  }
}

// ── Dificuldades ──
/* ── AS DIFICULDADES, E O QUE CADA UMA PAGA EM MOEDAS ──

   As moedas servem para uma coisa só: comprar os itens da loja. Até
   aqui também se trocavam por cristais, e cada jogo tinha inventado a
   própria conta em cima dessa troca: o Snake e o Simon somavam bônus
   por fora do multiplicador, e no Mestre um Snake perfeito pagava 380
   moedas contra 130 da Memória, pelos mesmos 5 de energia.

   Agora a regra é uma só:

     `coins` é o que paga UM MINIJOGO PERFEITO nessa dificuldade.

   Cada jogo diz que fração do perfeito o jogador fez, de 0 a 1, e o
   miniReward multiplica. Nenhum jogo paga acima do perfeito, e nenhum
   soma bônus por fora. A batalha PvE gasta 30 de energia (10 de cada
   um dos três), o mesmo que seis minijogos, e por isso a vitória paga
   seis minijogos perfeitos — ver PVE_PREMIO em js/pve-fu.js.

   Os números saem da loja: um amuleto custa de 800 a 1600 e dura 30
   dias, e o antídoto custa 300.

     dificuldade   minijogo   vitória PvE   amuleto de 800
     Fácil            12          72          ~67 jogos
     Médio            24         144          ~33 jogos
     Difícil          40         240          ~20 jogos
     Mestre           60         360          ~13 jogos

   A raridade do avatar ainda multiplica por cima (rarityBonus, em
   js/state.js): 1,2 no Raro e 1,5 no Lendário.

   Fora dos jogos, a visita a um amigo paga 5 (MOEDAS_VISITA, em
   api/amigos.js), até 30 por dia.

   `minNivel` segue as FASES (FU_NIVEL_JOVEM, FU_NIVEL_RARO e
   FU_NIVEL_LENDARIO, em js/ficha-fu.js): o Médio abre no 5, com o
   Jovem; o Difícil no 11, com o Adulto e o Raro; o Mestre no 27, com o
   Ancião e o Lendário. Eram 6, 13 e 21, números que não coincidiam com
   nada — a dificuldade abria um ou dois níveis depois da fase, e o Mestre
   seis níveis antes do Lendário.

   `inimigo` é quanto os inimigos do PvE somam de nível em relação à
   equipe. Antes a dificuldade só mudava o prêmio, e o Mestre era o
   mesmo combate do Fácil pagando seis vezes mais.

   O XP ficou como estava. */
const DIFF_TIERS = [
  { tier:0, i18nKey:'diff.easy',   icon:'🌿', label:'FÁCIL',   xp:14,  coins:12, inimigo:0.8, minNivel:1  },
  { tier:1, i18nKey:'diff.medium', icon:'💧', label:'MÉDIO',   xp:28,  coins:24, inimigo:1.0, minNivel:5  },
  { tier:2, i18nKey:'diff.hard',   icon:'🔥', label:'DIFÍCIL', xp:55,  coins:40, inimigo:1.2, minNivel:11 },
  { tier:3, i18nKey:'diff.master', icon:'⚡', label:'MESTRE',  xp:90,  coins:60, inimigo:1.4, minNivel:27 },
];

function maxUnlockedTier() {
  for(let i = DIFF_TIERS.length - 1; i >= 0; i--) {
    if(nivel >= DIFF_TIERS[i].minNivel) return i;
  }
  return 0;
}

function miniDifficulty() {
  const tier = (selectedDifficulty !== null && selectedDifficulty <= maxUnlockedTier())
    ? selectedDifficulty
    : maxUnlockedTier();
  return DIFF_TIERS[tier];
}

function setDifficulty(tier) {
  if(tier > maxUnlockedTier()) return;
  selectedDifficulty = tier;
  // Redesenha no lugar, sem abrir nada: as pastilhas também vivem no
  // modal da batalha, e reabrir o seletor de jogos fechava a batalha.
  renderGameSelector();
  if (typeof btRenderDificuldade === 'function') btRenderDificuldade();
}

function miniReward(xpMult, coinMult, vinculoGain = 3, vitoria = false) {
  const d  = miniDifficulty();
  const rb = rarityBonus();
  const vb = getVinculoBonus();
  const xpGain   = Math.round(d.xp    * xpMult  * rb.xp * vb.xpMult);
  // A fração do jogo perfeito, nunca acima dele — ver DIFF_TIERS.
  const coinFrac = Math.max(0, Math.min(1, coinMult));
  const coinGain = Math.round(d.coins * coinFrac * rb.moedas);
  xp      += xpGain;
  earnCoins(coinGain);
  const _oldVinculo = vinculo;
  vinculo += vinculoGain;
  checkVinculoTier(_oldVinculo);
  checkXP(); updateAllUI(); scheduleSave();

  return { xpGain, coinGain };
}

function applyGameCost() {
  vitals.energia    = Math.max(0,   vitals.energia - 5);
  vitals.fome       = Math.max(0,   vitals.fome    - 3);
  poopPressure      = Math.min(100, poopPressure   + 3);
  vitals.humor      = Math.min(100, vitals.humor   + 3);
  updateAllUI();
}

/* ── O HUMOR NO PRÊMIO ──

   Cada minijogo dava humor, mas quase nenhum dizia: o Snake e o Simon
   perdido mostravam só XP e moedas. E a Memória
   e o Simon ganho mostravam um número fixo, que não somava o +3 de
   applyGameCost e mentia quando o humor já estava no teto.

   Agora todos medem o humor antes e depois da partida e mostram a
   diferença real, ou "no máximo" quando não havia para onde subir. */
function mgComHumor(humorAntes, resto) {
  const ganho = Math.round(vitals.humor - humorAntes);
  const humor = ganho > 0 ? t('mg.humor_ganho', { humor: ganho })
              : vitals.humor >= 100 ? t('mg.humor_cheio') : '';
  return [humor, resto].filter(Boolean).join('  ');
}
