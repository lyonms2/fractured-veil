// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
function canAct() {
  if(dead || !hatched || !avatar) return false;
  if(sleeping) { showBubble('Shh... está dormindo 💤'); return false; }
  return true;
}

// ── COIN SPEND / EARN ANIMATION ──
let _coinAnimQueue   = [];
let _coinAnimRunning = false;

function _runCoinAnimQueue() {
  if(_coinAnimRunning || _coinAnimQueue.length === 0) return;
  _coinAnimRunning = true;
  const { amount, isSpend } = _coinAnimQueue.shift();

  const btn = document.getElementById('resMoedasBtn');
  if(btn) {
    // Flash no botão
    btn.classList.remove('res-flash');
    void btn.offsetWidth;
    btn.classList.add('res-flash');
    setTimeout(() => btn.classList.remove('res-flash'), 500);

    // position:fixed — getBoundingClientRect() já é relativo ao viewport, sem scroll
    const rect = btn.getBoundingClientRect();

    const fly = document.createElement('div');
    fly.className   = isSpend ? 'coin-spend' : 'coin-earn';
    fly.textContent = isSpend ? `-${amount} 🪙` : `+${amount} 🪙`;

    // Ancora no centro horizontal do botão, topo do botão
    fly.style.position = 'fixed';
    fly.style.left     = (rect.left + rect.width / 2) + 'px';
    fly.style.top      = rect.top + 'px';
    fly.style.transform = 'translateX(-50%)';
    // Sobrescreve a animação CSS para não conflituar com o transform de posição
    fly.style.animation = 'coin-spend-fly .9s cubic-bezier(.2,.8,.4,1) forwards';

    document.body.appendChild(fly);
    setTimeout(() => {
      fly.remove();
      _coinAnimRunning = false;
      _runCoinAnimQueue();
    }, 960);
  } else {
    _coinAnimRunning = false;
    _runCoinAnimQueue();
  }
}

function showCoinAnim(amount, isSpend = true) {
  _coinAnimQueue.push({ amount, isSpend });
  if(!_coinAnimRunning) _runCoinAnimQueue();
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
  if(_rb.moedas > 1) earnCoins(coinBonus);
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
// MODO REPOUSO
// ═══════════════════════════════════════════
function desativarModoRepouso() {
  modoRepouso = false;
  const overlay = document.getElementById('repousoOverlay');
  if(overlay) overlay.classList.remove('active');
  addLog('Modo repouso desativado. Bem-vindo de volta! 👋', 'good');
  showBubble('Olá de novo! 💕');
  updateAllUI();
  scheduleSave();
}

// ═══════════════════════════════════════════
// BOTÃO DORMIR — toque curto = dormir/acordar
//                toque longo (800ms) = modo repouso
// ═══════════════════════════════════════════
let _sleepPressTimer = null;

function onSleepPointerDown() {
  _sleepPressTimer = setTimeout(() => {
    _sleepPressTimer = null;
    if(!hatched || !avatar || dead) return;
    modoRepouso = true;
    const overlay = document.getElementById('repousoOverlay');
    if(overlay) overlay.classList.add('active');
    addLog('Modo repouso ativado. O avatar descansará enquanto estás fora.', 'info');
    showBubble('Modo repouso... 💤');
  }, 800);
}

function onSleepPointerUp() {
  if(_sleepPressTimer !== null) {
    clearTimeout(_sleepPressTimer);
    _sleepPressTimer = null;
    toggleSleep();
  }
}
