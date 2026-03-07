// ═══════════════════════════════════════════════════════════════════
// MODAL MANAGER — um modal de cada vez
// ═══════════════════════════════════════════════════════════════════
const MODAL_IDS = [
  'jkpModal','gameSelector','eggInvModal','itemInvModal','hatchConfirmModal',
  'memoriaModal','simonModal','marketModal','coinShopModal'
];

const ModalManager = {
  current: null,

  // Panel modals: don't block action buttons (they float over right panel)
  PANEL_MODALS: ['eggInvModal','itemInvModal','coinShopModal','marketModal'],

  GAME_MODALS: ['gameSelector','jkpModal','memoriaModal','simonModal','velhaModal'],

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
  // Update reward labels based on current rarity + level
  const rb = rarityBonus();
  const d  = miniDifficulty();
  const r  = n => Math.round(n);

  const jkpEl = document.getElementById('rewardJkp');
  if(jkpEl) {
    const xpMin = r(3*rb.xp); const xpMax = r(15*rb.xp);
    const cMin  = r(3*rb.moedas); const cMax = r(25*rb.moedas);
    jkpEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }

  const memEl = document.getElementById('rewardMemoria');
  if(memEl) {
    const xpMin = r(10*0.5*rb.xp); const xpMax = r(50*1.3*rb.xp);
    const cMin  = r(25*0.5*rb.moedas); const cMax = r(80*1.3*rb.moedas);
    memEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }

  const simEl = document.getElementById('rewardSimon');
  if(simEl) {
    const xpMin = r(d.xp*0.5*rb.xp); const xpMax = r(d.xp*1.5*rb.xp);
    const cMin  = r(d.coins*0.5*rb.moedas); const cMax = r(d.coins*1.5*rb.moedas);
    simEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }
  const velhaEl = document.getElementById('rewardVelha');
  if(velhaEl) {
    const xpMin = r(d.xp*0.3*rb.xp); const xpMax = r(d.xp*1.2*rb.xp);
    const cMin  = r(d.coins*0.3*rb.moedas); const cMax = r(d.coins*1.2*rb.moedas);
    velhaEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }

  ModalManager.open('gameSelector');
}

function closeGameSelector() {
  ModalManager.close('gameSelector');
}

function openMinigame(type) {
  if(type === 'velha') { ModalManager.close('gameSelector'); ModalManager.open('velhaModal'); startVelha(); return; }
  document.getElementById('gameSelector').classList.remove('open');
  if(type === 'jkp')     { openJkp();     return; }
  if(type === 'memoria') { openMiniModal('memoriaModal'); startMemoria(); return; }
  if(type === 'simon')   { openMiniModal('simonModal');   startSimon();   return; }
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
  if(nivel <= 5)  return { tier:0, label:'FÁCIL',    xp:8,  coins:15 };
  if(nivel <= 12) return { tier:1, label:'MÉDIO',    xp:20, coins:40 };
  if(nivel <= 20) return { tier:2, label:'DIFÍCIL',  xp:45, coins:80 };
  return                 { tier:3, label:'MESTRE',   xp:80, coins:130 };
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
