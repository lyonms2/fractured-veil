// ═══════════════════════════════════════════════════════════════════
// MODAL MANAGER — um modal de cada vez
// ═══════════════════════════════════════════════════════════════════
const MODAL_IDS = [
  'jkpModal','gameSelector','eggInvModal','itemInvModal','hatchConfirmModal',
  'memoriaModal','simonModal','marketModal','coinShopModal','velhaModal'
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
  const rb  = rarityBonus();
  const d   = miniDifficulty();
  const max = maxUnlockedTier();
  const r   = n => Math.round(n);

  // ── Difficulty pills ──
  const pillsEl = document.getElementById('diffPills');
  if(pillsEl) {
    pillsEl.innerHTML = DIFF_TIERS.map((t, i) => {
      const unlocked = i <= max;
      const active   = t.tier === d.tier;
      return `<button class="diff-pill ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}"
        onclick="${unlocked ? 'setDifficulty('+i+')' : ''}"
        title="${!unlocked ? 'Desbloqueie no nível '+t.minNivel : t.label}">
        ${!unlocked ? '🔒' : t.label}
      </button>`;
    }).join('');
  }

  // ── Reward labels ──
  const jkpEl = document.getElementById('rewardJkp');
  if(jkpEl) {
    const xpMin = r(d.xp*0.1*rb.xp); const xpMax = r(d.xp*1.0*rb.xp);
    const cMin  = r(d.coins*0.1*rb.moedas); const cMax = r(d.coins*1.0*rb.moedas);
    jkpEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }
  const memEl = document.getElementById('rewardMemoria');
  if(memEl) {
    const xpMin = r(d.xp*1.0*rb.xp); const xpMax = r(d.xp*1.6*rb.xp);
    const cMin  = r(d.coins*1.0*rb.moedas); const cMax = r(d.coins*1.6*rb.moedas);
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
const DIFF_TIERS = [
  { tier:0, label:'FÁCIL',   xp:8,  coins:15,  minNivel:1  },
  { tier:1, label:'MÉDIO',   xp:20, coins:40,  minNivel:6  },
  { tier:2, label:'DIFÍCIL', xp:45, coins:80,  minNivel:13 },
  { tier:3, label:'MESTRE',  xp:80, coins:130, minNivel:21 },
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
  openGameSelector(); // re-render com nova dificuldade selecionada
}

function miniReward(xpMult, coinMult, vinculoGain = 3) {
  const d  = miniDifficulty();
  const rb = rarityBonus();
  const vb = getVinculoBonus();
  const xpGain   = Math.round(d.xp    * xpMult  * rb.xp * vb.xpMult);
  const coinGain = Math.round(d.coins * coinMult * rb.moedas);
  xp += xpGain;
  earnCoins(coinGain);
  vitals.energia = Math.max(0, vitals.energia - 15);
  vitals.fome    = Math.max(0, vitals.fome    - 5);
  vinculo += vinculoGain;
  checkXP(); updateAllUI(); scheduleSave();
  return { xpGain, coinGain };
}
