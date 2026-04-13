// ═══════════════════════════════════════════════════════════════════
// MODAL MANAGER — um modal de cada vez
// ═══════════════════════════════════════════════════════════════════
const MODAL_IDS = [
  'gameSelector','eggInvModal','itemInvModal','hatchConfirmModal',
  'memoriaModal','simonModal','marketModal','coinShopModal',
  'arenaModal','roubaMontModal','minaModal','batalhaNavalModal','mazeModal'
];

const ModalManager = {
  current: null,

  PANEL_MODALS: ['eggInvModal','itemInvModal','coinShopModal','marketModal'],
  GAME_MODALS:  ['gameSelector','memoriaModal','simonModal','arenaModal','roubaMontModal','minaModal','batalhaNavalModal','mazeModal'],

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
    if(!this.PANEL_MODALS.includes(id) && (!this.current || this.current === id)) {
      document.getElementById('actionBtns').classList.remove('jkp-mode');
    }
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
    memEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }
  const simEl = document.getElementById('rewardSimon');
  if(simEl) {
    const xpMin = r(d.xp*0.5*rb.xp); const xpMax = r(d.xp*1.5*rb.xp);
    const cMin  = r(d.coins*0.5*rb.moedas); const cMax = r(d.coins*1.5*rb.moedas);
    simEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }
  const minaEl = document.getElementById('rewardMina');
  if(minaEl) {
    const xpMin = r(d.xp*0.8*rb.xp); const xpMax = r(d.xp*2.0*rb.xp);
    const cMin  = r(d.coins*0.8*rb.moedas); const cMax = r(d.coins*2.0*rb.moedas);
    minaEl.textContent = `+${xpMin}~${xpMax} XP · +${cMin}~${cMax} 🪙`;
  }
  const labEl = document.getElementById('rewardLabirinto');
  if(labEl) {
    const xpMin = r(d.xp*0.6*rb.xp); const xpMax = r(d.xp*1.8*rb.xp);
    const coinCounts = [8,12,16,20];
    const coinVals   = [3,4,7,9];
    const tier = DIFF_TIERS.indexOf(d);
    const t = Math.max(0, tier);
    const cMax = coinCounts[t] * coinVals[t];
    labEl.textContent = `+${xpMin}~${xpMax} XP · até ${cMax} 🪙 (colete no labirinto!)`;
  }
  ModalManager.open('gameSelector');
}

function closeGameSelector() {
  ModalManager.close('gameSelector');
}

function openMinigame(type) {
  ModalManager.close('gameSelector');
  if(type === 'memoria') { ModalManager.open('memoriaModal'); startMemoria(); return; }
  if(type === 'simon')   { ModalManager.open('simonModal');   startSimon();   return; }
  if(type === 'mina')    { ModalManager.open('minaModal');    startMina();    return; }
  if(type === 'snake')   { ModalManager.open('snakeModal');   startSnake();   return; }
  if(type === 'labirinto')  { ModalManager.open('mazeModal'); startLabirinto();  return; }
}

function openMiniModal(id) {
  ModalManager.open(id);
  playAnim('anim-play');
}

const _PVE_MODALS = ['memoriaModal','simonModal','minaModal','snakeModal','mazeModal'];
function closeMiniModal(id) {
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
  const coinGain = Math.round(d.coins * coinMult * rb.moedas * 0.80);
  xp      += xpGain;
  earnCoins(coinGain);
  vinculo += vinculoGain;
  checkXP(); updateAllUI(); scheduleSave();

  // Fissura — contribuir pontos PVE (fire-and-forget)
  if(walletAddress && firebase?.auth?.()?.currentUser) {
    firebase.auth().currentUser.getIdToken().then(idToken => {
      fetch('/api/fissura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'contribuir', idToken, atividade: vitoria ? 'pve_vitoria' : 'pve_completo' }),
      }).catch(() => {});
    }).catch(() => {});
  }

  return { xpGain, coinGain };
}

function applyGameCost() {
  vitals.energia    = Math.max(0,   vitals.energia - 5);
  vitals.fome       = Math.max(0,   vitals.fome    - 3);
  poopPressure      = Math.min(100, poopPressure   + 3);
  vitals.humor      = Math.min(100, vitals.humor   + 3);
  updateAllUI();
}
