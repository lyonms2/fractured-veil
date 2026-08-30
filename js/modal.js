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
  'arenaModal','roubaMontModal','minaModal','batalhaNavalModal','mazeModal',
  'marketplaceModal','combateModal','avataresModal','batalhaModal'
];

const ModalManager = {
  current: null,

  PANEL_MODALS: ['eggInvModal','itemInvModal','coinShopModal','marketplaceModal'],
  GAME_MODALS:  ['gameSelector','memoriaModal','simonModal','arenaModal','roubaMontModal','minaModal','batalhaNavalModal','mazeModal','combateModal'],

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

function openGameSelector() {
  const rb  = rarityBonus();
  const d   = miniDifficulty();
  const max = maxUnlockedTier();
  const r   = n => Math.round(n);

  // ── Difficulty pills ──
  const pillsEl = document.getElementById('diffPills');
  if(pillsEl) {
    pillsEl.innerHTML = DIFF_TIERS.map((dt, i) => {
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

  // ── Reward labels ──
  const memEl = document.getElementById('rewardMemoria');
  if(memEl) {
    const xpMin = r(d.xp*1.0*rb.xp); const xpMax = r(d.xp*1.6*rb.xp);
    const cMin  = r(d.coins*1.0*rb.moedas); const cMax = r(d.coins*1.6*rb.moedas);
    memEl.textContent = t('modal.reward_range', {xpMin, xpMax, cMin, cMax});
  }
  const simEl = document.getElementById('rewardSimon');
  if(simEl) {
    const xpMin = r(d.xp*0.5*rb.xp); const xpMax = r(d.xp*1.5*rb.xp);
    const cMin  = r(d.coins*0.5*rb.moedas); const cMax = r(d.coins*1.5*rb.moedas);
    simEl.textContent = t('modal.reward_range', {xpMin, xpMax, cMin, cMax});
  }
  // Os rotulos de premio do Campo Minado e do Labirinto viviam aqui.
  // Os dois sairam do seletor e os elementos ja nao existem.

  ModalManager.open('gameSelector');
}

function closeGameSelector() {
  ModalManager.close('gameSelector');
}

function openMinigame(type) {
  ModalManager.close('gameSelector');
  // O avatar entra com o jogo. Ver js/mini-avatar.js.
  const comAvatar = (modalId, avId, arranque) => {
    ModalManager.open(modalId);
    if (typeof miniAvatarMontar === 'function') miniAvatarMontar(avId);
    arranque();
  };
  if(type === 'memoria') { comAvatar('memoriaModal', 'memAvatar', startMemoria); return; }
  if(type === 'simon')   { comAvatar('simonModal',   'simonAvatar', startSimon); return; }
  if(type === 'mina')    { ModalManager.open('minaModal');    startMina();    return; }
  if(type === 'snake')   { comAvatar('snakeModal',   'snakeAvatar', startSnake); return; }
  if(type === 'labirinto')  { ModalManager.open('mazeModal'); startLabirinto();  return; }
}

function openMiniModal(id) {
  ModalManager.open(id);
  playAnim('anim-play');
}

const _PVE_MODALS = ['memoriaModal','simonModal','minaModal','snakeModal','mazeModal'];
function closeMiniModal(id) {
  // Tira o painel da lista de quem recebe reações. Sem isto, um jogo
  // fechado continuava a ser notificado pelo jogo seguinte.
  if (typeof miniAvatarDesmontar === 'function') {
    miniAvatarDesmontar({ memoriaModal:'memAvatar', simonModal:'simonAvatar',
                          snakeModal:'snakeAvatar' }[id] || '');
  }
  ModalManager.close(id);
  if(_PVE_MODALS.includes(id) && typeof openGameSelector === 'function') {
    openGameSelector(); gsSetTab('pve');
  }
}

// ── Dificuldades ──
const DIFF_TIERS = [
  { tier:0, i18nKey:'diff.easy',   icon:'🌿', label:'FÁCIL',   xp:14,  coins:22,  minNivel:1  },
  { tier:1, i18nKey:'diff.medium', icon:'💧', label:'MÉDIO',   xp:28,  coins:50,  minNivel:6  },
  { tier:2, i18nKey:'diff.hard',   icon:'🔥', label:'DIFÍCIL', xp:55,  coins:85,  minNivel:13 },
  { tier:3, i18nKey:'diff.master', icon:'⚡', label:'MESTRE',  xp:90,  coins:130, minNivel:21 },
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
  openGameSelector();
}

function miniReward(xpMult, coinMult, vinculoGain = 3, vitoria = false) {
  const d  = miniDifficulty();
  const rb = rarityBonus();
  const vb = getVinculoBonus();
  const xpGain   = Math.round(d.xp    * xpMult  * rb.xp * vb.xpMult);
  const coinGain = Math.round(d.coins * coinMult * rb.moedas);
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
