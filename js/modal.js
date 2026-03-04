// ═══════════════════════════════════════════════════════════════════
// MODAL MANAGER — um modal de cada vez
// ═══════════════════════════════════════════════════════════════════
const MODAL_IDS = [
  'jkpModal','gameSelector','eggInvModal','itemInvModal','hatchConfirmModal',
  'memoriaModal','simonModal','sombraModal','shopModal','marketModal','coinShopModal'
];

const ModalManager = {
  current: null,

  // Panel modals: don't block action buttons (they float over right panel)
  PANEL_MODALS: ['eggInvModal','itemInvModal','coinShopModal','shopModal','marketModal'],

  GAME_MODALS: ['gameSelector','jkpModal','memoriaModal','simonModal','sombraModal'],

  open(id, onClose) {
    // Fecha o atual sem callback
    if(this.current && this.current !== id) this._close(this.current);
    this.current = id;
    this._onClose = onClose || null;
    document.getElementById(id).classList.add('open');
    if(!this.PANEL_MODALS.includes(id)) {
      document.getElementById('actionBtns').classList.add('jkp-mode');
    }
    // Disable play button when any game modal opens
    if(this.GAME_MODALS.includes(id)) {
      const btn = document.getElementById('btnPlay');
      if(btn) btn.classList.add('disabled');
    }
  },

  close(id) {
    const target = id || this.current;
    if(!target) return;
    this._close(target);
    if(target === this.current) {
      this.current = null;
      if(this._onClose) { this._onClose(); this._onClose = null; }
    }
  },

  closeAll() {
    MODAL_IDS.forEach(id => this._close(id));
    this.current = null;
    this._onClose = null;
    document.getElementById('actionBtns').classList.remove('jkp-mode');
    const btn = document.getElementById('btnPlay');
    if(btn) btn.classList.remove('disabled');
  },

  isOpen(id) { return this.current === id; },
  anyOpen()  { return this.current !== null; },

  _close(id) {
    const el = document.getElementById(id);
    if(el) el.classList.remove('open');
    // Only remove jkp-mode if closing a screen modal (not a panel modal)
    if(!this.PANEL_MODALS.includes(id) && (!this.current || this.current === id)) {
      document.getElementById('actionBtns').classList.remove('jkp-mode');
    }
    // Re-enable play button when game modal closes
    if(this.GAME_MODALS.includes(id)) {
      const btn = document.getElementById('btnPlay');
      if(btn) btn.classList.remove('disabled');
    }
  }
};

function openGameSelector() {
  ModalManager.open('gameSelector');
}

function closeGameSelector() {
  ModalManager.close('gameSelector');
}

function openMinigame(type) {
  document.getElementById('gameSelector').classList.remove('open');
  if(type === 'jkp')     { openJkp();     return; }
  if(type === 'memoria') { openMiniModal('memoriaModal'); startMemoria(); return; }
  if(type === 'simon')   { openMiniModal('simonModal');   startSimon();   return; }
  if(type === 'sombra')  { openMiniModal('sombraModal');  startSombra();  return; }
}

function openMiniModal(id) {
  ModalManager.open(id);
  playAnim('anim-play');
}

function closeMiniModal(id) {
  ModalManager.close(id);
}

// Difficulty based on level
function miniDifficulty() {
  if(nivel <= 5)  return { tier:0, label:'FÁCIL',  xp:10, coins:25 };
  if(nivel <= 12) return { tier:1, label:'MÉDIO',  xp:25, coins:50 };
  return                 { tier:2, label:'DIFÍCIL', xp:50, coins:80 };
}

function miniReward(xpMult, coinMult) {
  const d = miniDifficulty();
  const rb = rarityBonus();
  const xpGain    = Math.round(d.xp    * xpMult   * rb.xp);
  const coinGain  = Math.round(d.coins * coinMult  * rb.moedas);
  xp += xpGain;
  earnCoins(coinGain);
  vitals.energia = Math.max(0, vitals.energia - 15);
  vitals.fome    = Math.max(0, vitals.fome    - 5);
  vinculo += 3;
  checkXP(); updateAllUI();
  return { xpGain, coinGain };
}
