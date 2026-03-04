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

  // Energy cost
  vitals.energia = Math.max(0, vitals.energia - 15);

  // Remove all poops with pop animation
  const container = document.getElementById('poopContainer');
  if(container) {
    [...container.children].forEach((el, i) => {
      el.style.transition = `transform .25s ${i*0.06}s, opacity .25s ${i*0.06}s`;
      el.style.transform = 'scale(0) rotate(180deg)';
      el.style.opacity = '0';
    });
    setTimeout(() => { container.innerHTML = ''; }, 400);
  }
  poopCount = 0;
  dirtyLevel = 0;

  // Stat boosts
  const higieneGain = Math.round(50 + Math.random() * 20);
  const humorGain   = 15;
  vitals.higiene = Math.min(100, vitals.higiene + higieneGain);
  vitals.humor   = Math.min(100, vitals.humor   + humorGain);

  // XP + vinculo
  const _rb = rarityBonus();
  xp += Math.round(3 * _rb.xp); vinculo += 1;

  // Bath animation + particles
  playAnim('anim-clean', false);
  spawnBathParticles();

  showBubble(rnd(['Que limpinho! 🛁✨', 'Adoro banho! 💧', 'Me sinto novo! ✨', 'Cheiro bem agora! 🌸']));
  showFloat(`+${higieneGain} 🛁`, '#5ab4e8');
  addLog(`Banho tomado! +${higieneGain} higiene +${humorGain} humor (-15 ⚡)`, 'good');

  updateDirtyVisuals();
  checkXP(); updateAllUI();
  scheduleSave();
}

function spawnBathParticles() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  // Bath flash overlay
  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;background:rgba(90,180,232,.18);border-radius:12px;pointer-events:none;z-index:20;transition:opacity .4s;';
  wrap.appendChild(flash);
  setTimeout(() => { flash.style.opacity='0'; setTimeout(()=>flash.remove(),400); }, 300);

  // Water drops + bubbles + sparkles
  const particles = [
    {e:'💧',x:'-35px',y:'-20px',d:'0s'},
    {e:'💧',x:'35px', y:'-25px',d:'0.08s'},
    {e:'🫧',x:'-20px',y:'-40px',d:'0.12s'},
    {e:'🫧',x:'20px', y:'-35px',d:'0.05s'},
    {e:'✨',x:'-40px',y:'-10px',d:'0.15s'},
    {e:'✨',x:'40px', y:'-15px',d:'0.18s'},
    {e:'💦',x:'0px',  y:'-45px',d:'0.1s'},
    {e:'🌸',x:'-28px',y:'-30px',d:'0.22s'},
    {e:'⭐',x:'28px', y:'-28px',d:'0.25s'},
  ];

  particles.forEach(p => {
    const el = document.createElement('div');
    el.className = 'bath-particle';
    el.textContent = p.e;
    el.style.cssText = `--bx:${p.x};--by:${p.y};bottom:40%;left:50%;animation-delay:${p.d}`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  });
}

function updateDirtyVisuals() {
  const screen  = document.querySelector('.screen');
  const wrap    = document.getElementById('creatureWrap');
  const btnCl   = document.getElementById('btnClean');
  const dirts   = document.querySelectorAll('.dirt-spot');
  const stinks  = document.querySelectorAll('.stink');

  if(!screen || !wrap) return;

  // Dirt spots on screen (appear as hygiene drops)
  const dirtyPct = 1 - (vitals.higiene / 100);
  dirts.forEach((d, i) => {
    d.classList.toggle('visible', i < Math.floor(dirtyPct * 5));
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

  // Clean button always visible
  if(btnCl) btnCl.style.display = 'flex';
}

function gameTick() {
  tickCount++;
  if(hatched && !dead) totalSecs++;
  updateTimer();

  if(!hatched || dead || !avatar) return;

  if(tickCount % 60 !== 0) return; // 1 game cycle = 60s real time

  if(sleeping) {
    vitals.energia = Math.min(100, vitals.energia + 3);
    vitals.humor   = Math.min(100, vitals.humor + .5);
    if(vitals.energia >= 100) { wakeUp('full'); }
  } else {
    const _d = rarityBonus().decay * GAME_SPEED;
    vitals.fome    = Math.max(0, vitals.fome    - (1   * _d * getItemEffect('fomeDecayMult')));
    vitals.humor   = Math.max(0, vitals.humor   - (.5  * _d));
    vitals.energia = Math.max(0, vitals.energia - (.3  * _d));
  }

  if(vitals.fome < 20 && !sleeping)    vitals.saude = Math.max(0, vitals.saude - (.8 * GAME_SPEED));
  if(vitals.humor < 15 && !sleeping)   vitals.saude = Math.max(0, vitals.saude - (.4 * GAME_SPEED));
  if(vitals.energia < 10 && !sleeping) vitals.saude = Math.max(0, vitals.saude - (.2 * GAME_SPEED));

  if(vitals.saude < 30 && !sick && Math.random() < (.04 * GAME_SPEED)) {
    sick = true;
    showBubble(rnd(FALAS.sick));
    addLog('Ficou doente! Use medicar!','bad');
  }

  // ── HIGIENE E COCÔ ──
  if(!sleeping) {
    vitals.higiene = Math.max(0, vitals.higiene - (.25 * GAME_SPEED));
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
  if(dirtyLevel >= 2) vitals.saude = Math.max(0, vitals.saude - (.3 * GAME_SPEED));
  if(dirtyLevel >= 1) vitals.humor = Math.max(0, vitals.humor - .2);
  if(vitals.higiene < 20) vitals.saude = Math.max(0, vitals.saude - (.2 * GAME_SPEED));

  updateDirtyVisuals();

  if(vitals.saude <= 0) { killCreature(); return; }

  if(tickCount % (60 * 5) === 0) { autoSpeak(); updateEquippedDisplay(); } // fala e verifica itens a cada ~5 min

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

  updateAllUI();
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
