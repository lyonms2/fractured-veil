// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
function canAct() {
  if(dead || !hatched || !avatar) return false;
  if(sleeping) { showBubble('Shh... está dormindo 💤'); return false; }
  return true;
}

// ── COIN SPEND / EARN ANIMATION ──
function showCoinAnim(amount, isSpend = true) {
  const el = document.getElementById('resMonedas');
  if(!el) return;
  // Flash the coin counter
  el.parentElement.classList.remove('res-flash');
  void el.parentElement.offsetWidth; // reflow
  el.parentElement.classList.add('res-flash');
  setTimeout(() => el.parentElement.classList.remove('res-flash'), 500);

  // Floating number from coin position
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
  // Pressão intestinal — varia por quanto comeu e o quanto já tem no estômago
  // Pressão escala com raridade e item (Amuleto Saciedade reduz também frequência de cocô)
  const pressaoBase = 30 + Math.round(Math.random() * 10); // +30 a +40
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

  // Sanitize — só letras, números, espaços e hífens
  const clean = raw.replace(/[^\p{L}\p{N}\s\-]/gu, '').trim().slice(0, 16);
  if(!clean) { showBubble('Nome inválido! ✕'); return; }

  const parts     = avatar.nome.split(',');
  const suffix    = parts.slice(1).join(','); // raridade etc
  avatar.nome     = clean + (suffix ? ',' + suffix : '');

  // Update display
  fillCreatureCard();
  cancelRename();

  // Save to Firebase
  if(walletAddress) scheduleSave();
  addLog(`Avatar renomeado para "${clean}" 💕`, 'good');
  showBubble(`${clean}... Adoro esse nome! 💕`);
  updateAllUI();
}
