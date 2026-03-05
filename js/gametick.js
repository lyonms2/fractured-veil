// GAME LOOP
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// POOP & HYGIENE SYSTEM
// ═══════════════════════════════════════════
const POOP_POSITIONS = [
  {left:'12%',bottom:'23px'}, {left:'25%',bottom:'23px'}, {left:'55%',bottom:'23px'},
  {left:'68%',bottom:'23px'}, {left:'38%',bottom:'23px'}, {left:'80%',bottom:'23px'}
];

function spawnPoop() {
  if(poopCount >= 6) return; // max 6 poops
  const container = document.getElementById('poopContainer');
  if(!container) return;

  const pos = POOP_POSITIONS[poopCount % POOP_POSITIONS.length];
  const el = document.createElement('div');
  el.className = 'poop';
  el.style.left  = pos.left;
  el.style.bottom= pos.bottom;
  el.style.zIndex = 6 + poopCount;
  el.title = 'Clique para limpar';
  // slightly vary size per poop
  const scale = .8 + Math.random() * .4;
  el.style.transform = `scale(${scale.toFixed(2)})`;
  el.textContent = '💩';
  el.onclick = (e) => { e.stopPropagation(); removePoop(el); };
  container.appendChild(el);

  poopCount++;
  dirtyLevel = Math.min(3, Math.floor(poopCount / 2));
  vitals.higiene = Math.max(0, vitals.higiene - 18);

  addLog('Seu avatar fez as necessidades! 💩', 'bad');
  showBubble('Ops... 😳');
  // Play squat animation on avatar
  playAnim('anim-poop');
  // Spawn rising cloud particles from avatar
  const wrap = document.getElementById('creatureWrap');
  if(wrap) {
    ['-12px','0px','12px'].forEach((px, i) => {
      const cl = document.createElement('div');
      cl.className = 'poop-cloud';
      cl.textContent = ['💨','💩','😖'][i];
      cl.style.cssText = `--px:${px};bottom:30px;left:50%;animation-delay:${i*0.12}s`;
      wrap.appendChild(cl);
      setTimeout(() => cl.remove(), 1400);
    });
  }
}

function removePoop(el) {
  el.style.transform += ' scale(0)';
  el.style.transition = 'transform .2s';
  setTimeout(() => el.remove(), 200);
  poopCount = Math.max(0, poopCount - 1);
  dirtyLevel = Math.min(3, Math.floor(poopCount / 2));
}

function cleanCreature() {
  if(!canAct()) return;
  if(sleeping) { showBubble('Zzz... 💤'); return; }
  if(vitals.energia < 15) { showBubble('Sem energia para se banhar! 😩'); return; }

  vitals.energia = Math.max(0, vitals.energia - 15);

  // Banho NÃO remove cocô — clique diretamente no 💩 para limpar

  const higieneGain = Math.round(50 + Math.random() * 20);
  const humorGain   = 15;
  vitals.higiene = Math.min(100, vitals.higiene + higieneGain);
  vitals.humor   = Math.min(100, vitals.humor   + humorGain);

  playAnim('anim-clean', false);
  spawnBathParticles();

  showBubble(rnd(['Que limpinho! 🛁✨','Adoro banho! 💧','Me sinto novo! ✨','Cheiro bem agora! 🌸']));
  showFloat(`+${higieneGain} 🛁`, '#5ab4e8');
  setTimeout(() => showFloat(`+${humorGain} 😄`, '#a78bfa'), 500);
  addLog(`Banho tomado! +${higieneGain} higiene  +${humorGain} humor  (-15 ⚡)`, 'good');

  updateDirtyVisuals();
  scheduleSave();
}

function spawnBathParticles() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  // ── Phase 0: shower curtain wipe (blue wash covers whole wrap) ──
  const curtain = document.createElement('div');
  curtain.className = 'bath-curtain';
  wrap.appendChild(curtain);
  setTimeout(() => curtain.remove(), 1000);

  // ── Phase 1 (0-400ms): 10 water drops cascade from top ──
  for(let i = 0; i < 10; i++) {
    setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'bath-drop';
      d.textContent = ['💧','💦'][i % 2];
      d.style.left = `${8 + i * 8 + (Math.random()*6-3)}%`;
      d.style.setProperty('--fall', (90 + Math.random() * 60).toFixed(0) + 'px');
      d.style.setProperty('--dur',  (0.4 + Math.random() * 0.25).toFixed(2) + 's');
      wrap.appendChild(d);
      setTimeout(() => d.remove(), 800);
    }, i * 40);
  }

  // ── Phase 2 (200ms): 2 splash rings expand from center bottom ──
  [200, 380].forEach((delay, i) => {
    setTimeout(() => {
      const ring = document.createElement('div');
      ring.className = 'bath-ring';
      ring.style.setProperty('--rsize', (50 + i * 20) + 'px');
      wrap.appendChild(ring);
      setTimeout(() => ring.remove(), 650);
    }, delay);
  });

  // ── Phase 3 (350ms): 6 soap bubbles rise and pop ──
  for(let i = 0; i < 6; i++) {
    setTimeout(() => {
      const b = document.createElement('div');
      b.className = 'bath-bubble';
      b.textContent = '🫧';
      b.style.left = `${12 + i * 14}%`;
      b.style.bottom = `${15 + Math.random() * 20}%`;
      b.style.fontSize = `${10 + Math.random() * 8}px`;
      b.style.setProperty('--rise', (50 + Math.random() * 40).toFixed(0) + 'px');
      wrap.appendChild(b);
      setTimeout(() => b.remove(), 900);
    }, 350 + i * 70);
  }

  // ── Phase 4 (700ms): sparkle shimmer — radiate outward ──
  const sparkles = ['✨','💫','⭐','✨','💫','✨'];
  sparkles.forEach((e, i) => {
    setTimeout(() => {
      const s = document.createElement('div');
      s.className = 'bath-sparkle';
      s.textContent = e;
      const angle = (i / sparkles.length) * Math.PI * 2;
      const dist  = 38 + Math.random() * 18;
      s.style.left   = `calc(50% + ${(Math.cos(angle) * dist).toFixed(0)}px)`;
      s.style.bottom = `calc(40% + ${(Math.sin(angle) * dist).toFixed(0)}px)`;
      wrap.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }, 700 + i * 55);
  });

  // ── Phase 5 (1100ms): fresh scent rises — animation complete ──
  ['🌸','🌿','🫧','💎','🌸'].forEach((e, i) => {
    setTimeout(() => {
      const sc = document.createElement('div');
      sc.className = 'bath-scent';
      sc.textContent = e;
      sc.style.left = `${15 + i * 17}%`;
      sc.style.setProperty('--sway', (i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 8) + 'px');
      wrap.appendChild(sc);
      setTimeout(() => sc.remove(), 1300);
    }, 1100 + i * 80);
  });
}

function updateAvatarSize() {
  const wrap = document.getElementById('creatureSVG');
  if(!wrap || !hatched || dead) return;
  const sz = getFaseSize();
  const svg = wrap.querySelector('svg');
  if(svg) {
    svg.setAttribute('width', sz);
    svg.setAttribute('height', sz);
  }
  wrap.style.width  = sz + 'px';
  wrap.style.height = sz + 'px';
}

function updateDirtyVisuals() {
  const screen  = document.querySelector('.screen');
  const wrap    = document.getElementById('creatureWrap');
  const dirts   = document.querySelectorAll('.dirt-spot');
  const stinks  = document.querySelectorAll('.stink');

  if(!screen || !wrap) return;

  // CSS variable --dirty: 0 (clean) → 1 (filthy), inverse of higiene
  const dirtyPct = parseFloat(Math.max(0, (1 - vitals.higiene / 100)).toFixed(3));
  screen.style.setProperty('--dirty', dirtyPct);
  wrap.style.setProperty('--dirty', dirtyPct);

  // Dirt spots: appear progressively as hygiene drops below 70
  // 5 spots, first appears at higiene=70, all visible at higiene=20
  dirts.forEach((d, i) => {
    const threshold = 0.30 + i * 0.12; // 0.30, 0.42, 0.54, 0.66, 0.78
    d.classList.toggle('visible', dirtyPct >= threshold);
  });

  // Stink lines (appear when 2+ poops)
  stinks.forEach((st, i) => {
    st.style.opacity = dirtyLevel >= 2 ? '1' : '0';
    st.style.animationPlayState = dirtyLevel >= 2 ? 'running' : 'paused';
  });

  // Creature gets dirty filter
  wrap.classList.toggle('dirty-creature', dirtyLevel >= 2);

  // Screen tint
  screen.classList.toggle('dirty', dirtyLevel >= 1);

}

function gameTick() {
  tickCount++;
  if(hatched && !dead) totalSecs++;
  updateTimer();

  if(!hatched || dead || !avatar) return;

  updateAllUI(); // update bars every tick

  if(tickCount % 60 !== 0) return; // 1 game cycle = 60s real time

  if(sleeping) {
    vitals.energia = Math.min(100, vitals.energia + (3 * getItemEffect('sleepEnergyMult')));
    vitals.humor   = Math.min(100, vitals.humor + .5);
    if(vitals.energia >= 100) { wakeUp('full'); }
  } else {
    const _d = rarityBonus().decay * GAME_SPEED;
    vitals.fome    = Math.max(0, vitals.fome    - (0.5  * _d * getItemEffect('fomeDecayMult')));
    vitals.humor   = Math.max(0, vitals.humor   - (0.25 * _d));
    vitals.energia = Math.max(0, vitals.energia - (0.2  * _d));
  }

  if(vitals.fome < 15 && !sleeping)    vitals.saude = Math.max(0, vitals.saude - (0.3 * GAME_SPEED));
  if(vitals.humor < 10 && !sleeping)   vitals.saude = Math.max(0, vitals.saude - (0.1 * GAME_SPEED));
  if(vitals.energia < 5  && !sleeping) vitals.saude = Math.max(0, vitals.saude - (0.1 * GAME_SPEED));

  if(vitals.saude < 20 && !sick && Math.random() < (0.02 * GAME_SPEED)) {
    sick = true;
    showBubble(rnd(FALAS.sick));
    addLog('Ficou doente! Use medicar!','bad');
  }

  // ── HIGIENE E COCÔ ──
  if(!sleeping) {
    vitals.higiene = Math.max(0, vitals.higiene - (0.12 * GAME_SPEED));
  }
  // cocô: apenas uma vez a cada ~5 min (300 ticks), chance aumenta se bem alimentado
  if(!sleeping && !poopCooldown) {
    const chance = vitals.fome > 80 ? .6 : .3; // high chance so poop actually appears
    if(Math.random() < chance) {
      spawnPoop();
      poopCooldown = Math.round((120 + Math.floor(Math.random() * 60)) / GAME_SPEED); // ~2-3h real
    }
  }
  if(poopCooldown > 0) poopCooldown--;
  tickXpBoost();
  if(tickCount % 60 === 0 && walletAddress) scheduleSave(); // auto-save every 60s

  // sujeira afeta saude e humor
  if(dirtyLevel >= 2) vitals.saude = Math.max(0, vitals.saude - (0.04 * GAME_SPEED));
  if(dirtyLevel >= 1) vitals.humor = Math.max(0, vitals.humor - 0.1);
  if(vitals.higiene < 15) vitals.saude = Math.max(0, vitals.saude - (0.04 * GAME_SPEED));

  updateDirtyVisuals();

  if(vitals.saude <= 0) { killCreature(); return; }

  if(tickCount % (60 * 5) === 0) { autoSpeak(); updateEquippedDisplay(); updateAvatarSize(); } // fala e verifica itens a cada ~5 min

  // ── POSTURA DE OVOS (apenas fase Adulto, nível 10+) ──
  if(getFase() === 3) {
    if(eggLayCooldown > 0) {
      eggLayCooldown--;
    } else if(!eggLayNotified) {
      // Avatar está pronto para botar — notifica
      eggLayNotified = true;
      showBubble('Sinto algo... 🥚');
      addLog('Seu avatar está pronto para botar um ovo!', 'leg');
    }
  }

  // Moedas passivas: +1 a cada 2 minutos (120 ticks de 3s = 360 ciclos × 3s = 360s ≈ 6 min; ajustando para 40 ciclos = 120s = 2 min)
  if(tickCount % (60 * 2) === 0) { // +moedas a cada 2 min reais
    earnCoins(Math.round(1 * rarityBonus().moedas));
  }
}

function autoSpeak() {
  if(dirtyLevel >= 2)    showBubble(rnd(FALAS.dirty));
  else if(vitals.fome < 25)   showBubble(rnd(FALAS.hungry));
  else if(vitals.energia < 20) showBubble(rnd(FALAS.tired));
  else if(sick)          showBubble(rnd(FALAS.sick));
  else if(vitals.humor < 30) showBubble(rnd(FALAS.bored));
  else if(Math.random() < .3) showBubble(rnd(FALAS.happy));
}

function playPhaseUp(faseName) {
  const ov = document.getElementById('phaseUpOverlay');
  if(!ov) return;
  document.getElementById('puFase').textContent = 'FASE: ' + faseName;
  // Restart by clone
  const clone = ov.cloneNode(true);
  ov.parentNode.replaceChild(clone, ov);
  clone.style.opacity = '1';
  setTimeout(() => {
    clone.style.transition = 'opacity .6s ease';
    clone.style.opacity = '0';
  }, 2000);
  setTimeout(() => {
    clone.style.transition = '';
    clone.style.opacity = '';
  }, 2700);
  showBubble(`Evoluí para ${faseName}! 🌟`);
  addLog(`✨ EVOLUÇÃO! ${avatar.nome.split(',')[0]} chegou à fase ${faseName}!`, 'leg');
}

function killCreature() {
  dead = true;
  saveToFirebase(); // immediate on death
  ModalManager.closeAll();

  // Populate death screen
  const name = avatar ? avatar.nome.split(',')[0] : 'Avatar';
  document.getElementById('deadAvatarName').textContent = name.toUpperCase();
  const h = Math.floor(totalSecs/3600), m = Math.floor((totalSecs%3600)/60);
  document.getElementById('deadStats').innerHTML =
    `Nível ${nivel} · ${FASES[getFase()]} · ${eggsInInventory.length} ovo${eggsInInventory.length!==1?'s':''}<br>` +
    `Viveu ${h > 0 ? h+'h ' : ''}${m}min · Vínculo: ${Math.floor(vinculo)}`;

  // Spawn floating souls
  const souls = ['👻','✦','💀','✧','🌑'];
  const dp = document.getElementById('deadParticles');
  if(dp) {
    dp.innerHTML = '';
    for(let i=0;i<6;i++) {
      const s = document.createElement('div');
      s.className = 'dead-float-soul';
      s.textContent = souls[i%souls.length];
      s.style.cssText = `left:${15+Math.random()*70}%;bottom:${10+Math.random()*30}%;animation-delay:${(Math.random()*3).toFixed(1)}s;animation-duration:${(3+Math.random()*2).toFixed(1)}s;`;
      dp.appendChild(s);
    }
  }

  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'flex';
  document.getElementById('actionBtns').style.opacity  = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';
  addLog(`${name} partiu para outra dimensão... 💀`,'bad');
  showBubble('...');
}

function checkXP() {
  const needed = 100 * nivel;
  if(xp >= needed) {
    const faseBefore = getFase();
    xp -= needed; nivel++;
    const faseAfter = getFase();
    document.getElementById('phaseLabel').textContent = `FASE: ${FASES[faseAfter]}`;
    addLog(`Nível ${nivel}! Seu avatar ficou mais forte!`,'leg');
    playLevelUp(nivel);
    // Phase change?
    if(faseAfter !== faseBefore) {
      setTimeout(() => playPhaseUp(FASES[faseAfter]), 600);
      updateAvatarSize();
    }
  }
}

function playLevelUp(newNivel) {
  const ov = document.getElementById('levelUpOverlay');
  if(!ov) return;

  // Update text
  document.getElementById('luText').textContent = 'NÍVEL UP!';
  document.getElementById('luNivel').textContent = `NÍVEL ${newNivel}`;

  // Spawn star particles
  const starEmojis = ['✦','✧','★','✨','⭐'];
  const positions = [
    {sx:'-70px',sy:'-60px'},{sx:'70px',sy:'-55px'},{sx:'-80px',sy:'20px'},
    {sx:'80px',sy:'15px'},{sx:'-30px',sy:'-80px'},{sx:'30px',sy:'-75px'},
    {sx:'55px',sy:'60px'},{sx:'-55px',sy:'55px'}
  ];
  // Remove old stars
  ov.querySelectorAll('.lu-star').forEach(s => s.remove());
  positions.forEach((pos, i) => {
    const s = document.createElement('div');
    s.className = 'lu-star';
    s.textContent = starEmojis[i % starEmojis.length];
    s.style.cssText = `--sx:${pos.sx};--sy:${pos.sy};top:50%;left:50%;animation-delay:${i*0.05}s;color:var(--gold-light)`;
    ov.appendChild(s);
  });

  // Restart CSS animations by cloning node
  const clone = ov.cloneNode(true);
  ov.parentNode.replaceChild(clone, ov);

  // Fade out after 1.8s
  clone.classList.add('active');
  clone.style.opacity = '1';
  setTimeout(() => {
    clone.style.transition = 'opacity .5s ease';
    clone.style.opacity = '0';
  }, 1800);
  setTimeout(() => {
    clone.style.transition = '';
    clone.style.opacity = '';
    clone.classList.remove('active');
  }, 2400);

  showBubble('Nível up! 🌟');
}
