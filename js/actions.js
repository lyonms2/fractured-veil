// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════

function canAct() {
  if(dead || !hatched || !avatar) return false;
  if(sleeping) { showBubble(t('bubble.sleeping')); return false; }
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
  fly.style.cssText = `position:absolute;left:50%;top:-0.25rem;transform:translateX(-50%);pointer-events:none;z-index:9999;white-space:nowrap;font-family:'Cinzel',serif;font-size:0.625rem;font-weight:700;color:${isSpend?'#e74c3c':'#7ab87a'};animation:coin-fly 0.9s ease-out forwards;`;
  container.appendChild(fly);
  setTimeout(() => fly.remove(), 950);
}

function showCristalAnim(amount, isSpend = true) {
  const el = document.getElementById('resCristais');
  if(!el) return;
  el.parentElement.classList.remove('res-flash');
  void el.parentElement.offsetWidth;
  el.parentElement.classList.add('res-flash');
  setTimeout(() => el.parentElement.classList.remove('res-flash'), 500);

  const container = el.closest('.res') || el.parentElement;
  container.style.position = 'relative';
  const fly = document.createElement('div');
  fly.className   = isSpend ? 'coin-spend' : 'coin-earn';
  fly.textContent = isSpend ? `-${amount} 💎` : `+${amount} 💎`;
  fly.style.cssText = `position:absolute;left:50%;top:-0.25rem;transform:translateX(-50%);pointer-events:none;z-index:9999;white-space:nowrap;font-family:'Cinzel',serif;font-size:0.625rem;font-weight:700;color:${isSpend?'#e74c3c':'#a78bfa'};animation:coin-fly 0.9s ease-out forwards;`;
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
  const COST = CUSTO_NUTRIR;
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
  if(vitals.fome < 10)   { showBubble(t('bubble.hungry')); return; }
  if(vitals.energia < 10){ showBubble(t('bubble.tired')); return; }
  openGameSelector();
}

/* ── BAPTIZAR: UMA VEZ, E FICA ──

   O renomear era ilimitado. Passa a ser um uso só: o avatar nasce com um
   nome sorteado, o dono pode pôr-lhe o seu, e nessa altura o nome fica
   permanente — é o que faz dele um nome e não uma etiqueta.

   O uso não expira. "Uma vez durante o nascimento" podia ler-se como uma
   janela que fecha, mas uma janela castiga quem esteve fora e não
   acrescenta permanência nenhuma: ela cumpre-se no instante em que o uso
   é gasto. Para a fechar, é o podeRenomear() em js/identidade.js que
   passa a olhar também para a idade ou para o nível.

   Quem já não pode não fica com um botão morto: o botão desaparece, e o
   próprio nome passa a dizer que está selado ao ser tocado. */
function startRename() {
  if(!avatar || dead) return;
  if(typeof podeRenomear === 'function' && !podeRenomear(avatar)) {
    playSound('error');
    showBubble(t('rename.selado'));
    return;
  }
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

  // A segunda guarda, em quem FAZ. A de cima só apaga o caminho; esta é a
  // que impede — um clique repetido, um estado antigo na tela, ou um
  // caminho novo que ninguém previu.
  if(typeof podeRenomear === 'function' && !podeRenomear(avatar)) {
    cancelRename();
    playSound('error');
    showBubble(t('rename.selado'));
    return;
  }

  const parts  = avatar.nome.split(',');
  const suffix = parts.slice(1).join(',');
  avatar.nome  = clean + (suffix ? ',' + suffix : '');
  // E fica. Daqui em diante este avatar chama-se isto, para quem o comprar
  // e para qualquer árvore em que venha a aparecer.
  if(typeof travarNome === 'function') travarNome(avatar);

  fillCreatureCard();
  cancelRename();

  if(walletAddress) scheduleSave();
  playSound('rename');
  addLog(t('log.renamed', { name: clean }), 'good');
  showBubble(t('rename.feito', { name: clean }));
  updateAllUI();
}
