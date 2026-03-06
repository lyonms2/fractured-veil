// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════
function canAct() {
  if(dead || !hatched || !avatar) return false;
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
  if(!canAct()) return;
  if(sleeping) return;
  if(vitals.fome < 10)   { showBubble('Estou faminto! 🍖'); return; }
  if(vitals.energia < 20){ showBubble('Cansado demais... 😴'); return; }
  openGameSelector();
}
