// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════

// Declaração defensiva — state.js pode ou não ter esta variável
if(typeof _repousoTimer === 'undefined') var _repousoTimer = null;

function canAct() {
  if(dead || !hatched || !avatar) return false;
  if(sleeping) { showBubble(t('bubble.sleeping')); return false; }
  if(modoRepouso) { showBubble(t('bubble.repouso')); return false; }
  return true;
}

// ── COIN SPEND / EARN ANIMATION ──
function showCoinAnim(amount, isSpend = true) {
  const el = document.getElementById('resMonedas');
  if(!el) return;
  el.parentElement.classList.remove('res-flash');
  void el.parentElement.offsetWidth;
  el.parentElement.classList.add('res-flash');
  setTimeout(() => el.parentElement.classList.remove('res-flash'), 500);

  const container = el.closest('.res') || el.parentElement;
  container.style.position = 'relative';
  const fly = document.createElement('div');
  fly.className   = isSpend ? 'coin-spend' : 'coin-earn';
  fly.textContent = isSpend ? `-${amount} 🪙` : `+${amount} 🪙`;
  fly.style.cssText = `position:absolute;left:50%;top:-4px;transform:translateX(-50%);pointer-events:none;z-index:9999;white-space:nowrap;font-family:'Cinzel',serif;font-size:10px;font-weight:700;color:${isSpend?'#e74c3c':'#7ab87a'};animation:coin-fly 0.9s ease-out forwards;`;
  container.appendChild(fly);
  setTimeout(() => fly.remove(), 950);
}

function spendCoins(amount) {
  if(gs.moedas < amount) return false;
  gs.moedas -= amount;
  showCoinAnim(amount, true);
  updateResourceUI();
  return true;
}

function earnCoins(amount) {
  gs.moedas += amount;
  playSound('coin');
  showCoinAnim(amount, false);
  updateResourceUI();
}

function feedCreature() {
  if(!canAct()) return;
  if(vitals.fome >= 100){ showBubble(t('bubble.satisfied')); return; }
  const COST = 10;
  if(gs.moedas < COST) { playSound('no_coins'); showBubble(t('bubble.no_coins')); addLog(t('log.feed_no_coins', { cost: COST }),'bad'); return; }
  if(!spendCoins(COST)) return;
  const g = 20 + randInt(0,15);
  vitals.fome = Math.min(100, vitals.fome + g);
  const pressaoBase = 30 + Math.round(Math.random() * 10);
  const pressaoGain = Math.round(pressaoBase * rarityBonus().decay * getItemEffect('fomeDecayMult'));
  poopPressure = Math.min(100, poopPressure + pressaoGain);
  const _rb = rarityBonus();
  xp += Math.round(5 * _rb.xp); vinculo += 2;
  const coinBonus = Math.round(2 * _rb.moedas);
  if(_rb.moedas > 1) setTimeout(() => earnCoins(coinBonus), 650);
  playSound('feed');
  playAnim('anim-eat');
  spawnFoodParticles();
  showBubble(rnd(FALAS.happy));
  showFloat(`+${g} 🍖`,'#e74c3c');
  addLog(t('log.fed', { gain: g, cost: COST }), 'good');
  checkXP(); updateAllUI(); scheduleSave();
}

function playCreature() {
  if(dead)     { showBubble(t('bubble.dead')); return; }
  if(!hatched || !avatar) { showBubble(t('bubble.no_avatar')); return; }
  if(sleeping) { showBubble(t('bubble.sleeping')); return; }
  if(modoRepouso) { showBubble(t('bubble.repouso')); return; }
  if(vitals.fome < 10)   { showBubble(t('bubble.hungry')); return; }
  if(vitals.energia < 10){ showBubble(t('bubble.tired')); return; }
  openGameSelector();
}

// ── RENAME AVATAR ──
function startRename() {
  if(!avatar || dead) return;
  const input = document.getElementById('renameInput');
  const currentName = avatar.nome.split(',')[0].trim();
  input.value = currentName;
  document.getElementById('renameForm').style.display = 'block';
  document.getElementById('renameBtn').style.display  = 'none';
  setTimeout(() => { input.focus(); input.select(); }, 50);
}

function cancelRename() {
  document.getElementById('renameForm').style.display = 'none';
  document.getElementById('renameBtn').style.display  = '';
}

function confirmRename() {
  const input = document.getElementById('renameInput');
  const raw   = input.value.trim();
  if(!raw) { cancelRename(); return; }

  const clean = raw.replace(/[^\p{L}\p{N}\s\-]/gu, '').trim().slice(0, 16);
  if(!clean) { playSound('error'); showBubble(t('bubble.invalid_name')); return; }

  const parts  = avatar.nome.split(',');
  const suffix = parts.slice(1).join(',');
  avatar.nome  = clean + (suffix ? ',' + suffix : '');

  fillCreatureCard();
  cancelRename();

  if(walletAddress) scheduleSave();
  playSound('rename');
  addLog(t('log.renamed', { name: clean }), 'good');
  showBubble(t('bubble.renamed', { name: clean }));
  updateAllUI();
}

// ═══════════════════════════════════════════
// MODO REPOUSO MANUAL
// Long press 2s no botão Dormir ativa o repouso.
// Toque curto continua funcionando normalmente
// (dorme se acordado, acorda se dormindo).
// ═══════════════════════════════════════════

// ── Helper: aplica estado visual do repouso nos dois layouts ─────
function _repousoVisual(ativo) {
  // PC
  const btnPC   = document.getElementById('btnSleep');
  const lblPC   = document.getElementById('sleepLabel');
  const actBtns = document.getElementById('actionBtns');
  if(btnPC) btnPC.classList.toggle('active-repouso', ativo);
  if(lblPC) lblPC.textContent = ativo ? t('ui.repouso_mode') : 'DORMIR';
  if(actBtns) actBtns.classList.toggle('repouso-mode', ativo);

  // Mobile
  const btnMob  = document.getElementById('fvbn-sleep');
  const lblMob  = document.getElementById('fvbnSleepLabel');
  if(btnMob) btnMob.classList.toggle('active-repouso', ativo);
  if(lblMob) lblMob.textContent = ativo ? t('ui.repouso_mode') : 'Dormir';

  // Overlay
  const overlay = document.getElementById('repousoOverlay');
  if(overlay) overlay.classList.toggle('active', ativo);
}

function onSleepPointerDown() {
  if(!hatched || !avatar || dead) return;
  // Ambos os botões (PC e mobile) recebem o efeito pressing
  const btns = [
    document.getElementById('btnSleep'),
    document.getElementById('fvbn-sleep'),
  ];

  if(modoRepouso) {
    _repousoTimer = setTimeout(() => {
      _repousoTimer = null;
      btns.forEach(b => b?.classList.remove('pressing'));
      desativarModoRepouso();
    }, 2000);
    btns.forEach(b => b?.classList.add('pressing'));
    return;
  }

  if(sleeping) {
    window._sleepBtnDownWhileSleeping = true;
    return;
  }

  _repousoTimer = setTimeout(() => {
    _repousoTimer = null;
    btns.forEach(b => b?.classList.remove('pressing'));
    ativarModoRepouso();
  }, 2000);
  btns.forEach(b => b?.classList.add('pressing'));
}

function onSleepPointerUp() {
  const btns = [
    document.getElementById('btnSleep'),
    document.getElementById('fvbn-sleep'),
  ];
  btns.forEach(b => b?.classList.remove('pressing'));

  if(window._sleepBtnDownWhileSleeping) {
    window._sleepBtnDownWhileSleeping = false;
    wakeUp('manual');
    return;
  }

  if(_repousoTimer) {
    clearTimeout(_repousoTimer);
    _repousoTimer = null;
    if(!modoRepouso) toggleSleep();
  }
}

function ativarModoRepouso() {
  if(modoRepouso || sleeping) return;
  modoRepouso = true;
  playSound('repouso_on');
  _repousoVisual(true);
  ModalManager.closeAll();
  addLog(t('log.repouso_on'), 'info');
  saveToFirebase();
}

function desativarModoRepouso() {
  if(!modoRepouso) return;
  modoRepouso = false;
  playSound('repouso_off');
  _repousoVisual(false);
  addLog(t('log.repouso_off'), 'good');
  showBubble(t('bubble.back'));
  updateAllUI();
  saveToFirebase();
}
