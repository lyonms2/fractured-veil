// ═══════════════════════════════════════════════════════════════════
// MODAL MANAGER — um modal de cada vez
// ═══════════════════════════════════════════════════════════════════
const MODAL_IDS = [
  'jkpModal','gameSelector','eggInvModal','itemInvModal','hatchConfirmModal',
  'memoriaModal','simonModal','marketModal','coinShopModal','velhaModal',
  'arenaModal'
];

const ModalManager = {
  current: null,

  PANEL_MODALS: ['eggInvModal','itemInvModal','coinShopModal','marketModal'],
  GAME_MODALS:  ['gameSelector','jkpModal','memoriaModal','simonModal','velhaModal','arenaModal'],

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
  ModalManager.close('gameSelector');
  if(type === 'jkp')     { openJkp();                                        return; }
  if(type === 'velha')   { ModalManager.open('velhaModal');   startVelha();  return; }
  if(type === 'memoria') { ModalManager.open('memoriaModal'); startMemoria();return; }
  if(type === 'simon')   { ModalManager.open('simonModal');   startSimon();  return; }
}

function openMiniModal(id) {
  ModalManager.open(id);
  playAnim('anim-play');
}

function closeMiniModal(id) {
  ModalManager.close(id);
}

// ── Dificuldades (rebalanceado) ──
const DIFF_TIERS = [
  { tier:0, label:'FÁCIL',   xp:14,  coins:22,  minNivel:1  },
  { tier:1, label:'MÉDIO',   xp:28,  coins:52,  minNivel:6  },
  { tier:2, label:'DIFÍCIL', xp:55,  coins:95,  minNivel:13 },
  { tier:3, label:'MESTRE',  xp:90,  coins:155, minNivel:21 },
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

// ── miniReward ──
// CORREÇÃO: NÃO desconta energia nem fome aqui.
// Cada jogo é responsável por descontar seus próprios custos de stats
// para evitar duplo desconto (ex: Jo-Ken-Pô já descontava -15 energia
// E miniReward descontava mais -15 em Memória/Simon).
// O desconto padrão por jogar é: -15 energia, -5 fome — aplicado
// UMA VEZ por sessão de jogo, diretamente em cada função de vitória/derrota.
function miniReward(xpMult, coinMult, vinculoGain = 3) {
  const d  = miniDifficulty();
  const rb = rarityBonus();
  const vb = getVinculoBonus();
  const xpGain   = Math.round(d.xp    * xpMult  * rb.xp * vb.xpMult);
  const coinGain = Math.round(d.coins * coinMult * rb.moedas);
  xp      += xpGain;
  earnCoins(coinGain);
  vinculo += vinculoGain;
  checkXP(); updateAllUI(); scheduleSave();
  return { xpGain, coinGain };
}

// ── applyGameCost ──
// Desconta o custo padrão de jogar uma rodada: -10 energia, -5 fome.
// -10 (era -15) permite ~10 jogos por ciclo de energia em vez de 6.
function applyGameCost() {
  vitals.energia = Math.max(0, vitals.energia - 10);
  vitals.fome    = Math.max(0, vitals.fome    - 5);
  updateAllUI();
}
