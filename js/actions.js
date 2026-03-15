// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
function canAct() {
  if(dead || !hatched || !avatar) return false;
  if(sleeping) { showBubble('Shh... está dormindo 💤'); return false; }
  if(modoRepouso) { showBubble('Em repouso... segure 💤 para retomar'); return false; }
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

  const rect = el.getBoundingClientRect();
  const fly  = document.createElement('div');
  fly.className = isSpend ? 'coin-spend' : 'coin-earn';
  fly.textContent = isSpend ? `-${amount} 🪙` : `+${amount} 🪙`;
  fly.style.left = rect.left + 'px';
  fly.style.top  = rect.top  + 'px';
  document.body.appendChild(fly);
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
  showCoinAnim(amount, false);
  updateResourceUI();
}

function feedCreature() {
  if(!canAct()) return;
  if(vitals.fome >= 100){ showBubble('Estou satisfeito!'); return; }
  const COST = 10;
  if(gs.moedas < COST) { showBubble('Sem moedas... 😢'); addLog(`Precisa de ${COST} 🪙 para alimentar!`,'bad'); return; }
  if(!spendCoins(COST)) return;
  const g = 20 + randInt(0,15);
  vitals.fome = Math.min(100, vitals.fome + g);
  const pressaoBase = 30 + Math.round(Math.random() * 10);
  const pressaoGain = Math.round(pressaoBase * rarityBonus().decay * getItemEffect('fomeDecayMult'));
  poopPressure = Math.min(100, poopPressure + pressaoGain);
  const _rb = rarityBonus();
  xp += Math.round(5 * _rb.xp); vinculo += 2;
  const coinBonus = Math.round(2 * _rb.moedas);
  // Delay para a animação do bônus não sobrepor a do gasto (-10)
  if(_rb.moedas > 1) setTimeout(() => earnCoins(coinBonus), 650);
  playAnim('anim-eat');
  spawnFoodParticles();
  showBubble(rnd(FALAS.happy));
  showFloat(`+${g} 🍖`,'#e74c3c');
  addLog(`Alimentado! +${g} fome  (-${COST} 🪙)`, 'good');
  checkXP(); updateAllUI(); scheduleSave();
}

function playCreature() {
  if(dead)     { showBubble('...💀'); return; }
  if(!hatched || !avatar) { showBubble('Nenhum avatar activo!'); return; }
  if(sleeping) { showBubble('Shh... está dormindo 💤'); return; }
  if(modoRepouso) { showBubble('Em repouso... segure 💤 para retomar'); return; }
  if(vitals.fome < 10)   { showBubble('Estou faminto! 🍖'); return; }
  if(vitals.energia < 20){ showBubble('Cansado demais... 😴'); return; }
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
  if(!clean) { showBubble('Nome inválido! ✕'); return; }

  const parts  = avatar.nome.split(',');
  const suffix = parts.slice(1).join(',');
  avatar.nome  = clean + (suffix ? ',' + suffix : '');

  fillCreatureCard();
  cancelRename();

  if(walletAddress) scheduleSave();
  addLog(`Avatar renomeado para "${clean}" 💕`, 'good');
  showBubble(`${clean}... Adoro esse nome! 💕`);
  updateAllUI();
}

// ═══════════════════════════════════════════
// MODO REPOUSO MANUAL
// Long press 2s no botão Dormir ativa o repouso.
// Toque curto continua funcionando normalmente
// (dorme se acordado, acorda se dormindo).
// ═══════════════════════════════════════════

function onSleepPointerDown() {
  if(!hatched || !avatar || dead) return;
  const btn = document.getElementById('btnSleep');

  // Se está em repouso → long press sai do repouso
  if(modoRepouso) {
    _repousoTimer = setTimeout(() => {
      _repousoTimer = null;
      if(btn) btn.classList.remove('pressing');
      desativarModoRepouso();
    }, 2000);
    if(btn) btn.classList.add('pressing');
    return;
  }

  // Se está dormindo → não inicia timer de repouso.
  // O toque curto vai acordar (tratado no pointerup com _sleeping flag).
  if(sleeping) {
    // Marca que o pointer desceu enquanto dormia, para o pointerup acordar.
    window._sleepBtnDownWhileSleeping = true;
    return;
  }

  // Acordado e ativo → inicia contagem para repouso
  _repousoTimer = setTimeout(() => {
    _repousoTimer = null;
    if(btn) btn.classList.remove('pressing');
    ativarModoRepouso();
  }, 2000);
  if(btn) btn.classList.add('pressing');
}

function onSleepPointerUp() {
  const btn = document.getElementById('btnSleep');
  if(btn) btn.classList.remove('pressing');

  // Caso especial: botão pressionado enquanto dormia → acordar
  if(window._sleepBtnDownWhileSleeping) {
    window._sleepBtnDownWhileSleeping = false;
    wakeUp('manual');
    return;
  }

  if(_repousoTimer) {
    // Timer ainda não disparou → foi toque curto → dormir normalmente
    clearTimeout(_repousoTimer);
    _repousoTimer = null;
    if(!modoRepouso) toggleSleep();
  }
  // Se _repousoTimer já disparou → foi long press → não faz mais nada
}

function ativarModoRepouso() {
  if(modoRepouso || sleeping) return;
  modoRepouso = true;

  const overlay = document.getElementById('repousoOverlay');
  const btn     = document.getElementById('btnSleep');

  if(overlay) overlay.classList.add('active');
  if(btn) {
    btn.querySelector('.icon').textContent            = '💤';
    document.getElementById('sleepLabel').textContent = 'REPOUSO';
    btn.classList.add('active-repouso');
  }

  document.getElementById('actionBtns').classList.add('repouso-mode');
  ModalManager.closeAll();
  addLog('Modo repouso ativado. Stats desaceleram. ⏸', 'info');
  scheduleSave();
}

function desativarModoRepouso() {
  if(!modoRepouso) return;
  modoRepouso = false;

  const overlay = document.getElementById('repousoOverlay');
  const btn     = document.getElementById('btnSleep');

  if(overlay) overlay.classList.remove('active');
  if(btn) {
    btn.querySelector('.icon').textContent            = '💤';
    document.getElementById('sleepLabel').textContent = 'DORMIR';
    btn.classList.remove('active-repouso');
  }

  document.getElementById('actionBtns').classList.remove('repouso-mode');
  addLog('Modo repouso desativado. Bem-vindo de volta! ✨', 'good');
  showBubble('De volta! ✨');
  updateAllUI();
  scheduleSave();
}
