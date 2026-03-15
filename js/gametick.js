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
  if(poopCount >= 6) return;
  const container = document.getElementById('poopContainer');
  if(!container) return;

  const pos = POOP_POSITIONS[poopCount % POOP_POSITIONS.length];
  const el = document.createElement('div');
  el.className = 'poop';
  el.style.left  = pos.left;
  el.style.bottom= pos.bottom;
  el.style.zIndex = 6 + poopCount;
  el.title = 'Clique para limpar';
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
  playAnim('anim-poop');
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
  vinculo += 2;
  playAnim('anim-clean', false);
  showFloat('✨ limpinho!', '#a78bfa');
  updateAllUI();
  scheduleSave();
}

function cleanCreature() {
  if(!canAct()) return;
  if(sleeping) { showBubble('Zzz... 💤'); return; }
  if(vitals.energia < 15) { showBubble('Sem energia para se banhar! 😩'); return; }

  vitals.energia = Math.max(0, vitals.energia - 15);

  const higieneGain = Math.round(50 + Math.random() * 20);
  const humorGain   = 15;
  vitals.higiene = Math.min(100, vitals.higiene + higieneGain);
  vitals.humor   = Math.min(100, vitals.humor   + humorGain);
  vinculo += 3;

  playAnim('anim-clean', false);
  spawnBathParticles();

  showBubble(rnd(['Que limpinho! 🛁✨','Adoro banho! 💧','Me sinto novo! ✨','Cheiro bem agora! 🌸']));
  showFloat(`+${higieneGain} 🛁`, '#5ab4e8');
  setTimeout(() => showFloat(`+${humorGain} 😄`, '#a78bfa'), 500);
  addLog(`Banho tomado! +${higieneGain} higiene  +${humorGain} humor  (-15 ⚡)`, 'good');

  if(!sleeping) {
    const humorBad = vitals.humor < 30;
    const decayV   = humorBad ? 0.05 : 0.02;
    vinculo = Math.max(0, vinculo - decayV);
  }

  updateDirtyVisuals();
  scheduleSave();
}

function spawnBathParticles() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  const curtain = document.createElement('div');
  curtain.className = 'bath-curtain';
  wrap.appendChild(curtain);
  setTimeout(() => curtain.remove(), 1000);

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

  [200, 380].forEach((delay, i) => {
    setTimeout(() => {
      const ring = document.createElement('div');
      ring.className = 'bath-ring';
      ring.style.setProperty('--rsize', (50 + i * 20) + 'px');
      wrap.appendChild(ring);
      setTimeout(() => ring.remove(), 650);
    }, delay);
  });

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
  if(sleeping) positionSleepEyes();
}

function updateDirtyVisuals() {
  const screen  = document.querySelector('.screen');
  const wrap    = document.getElementById('creatureWrap');
  const dirts   = document.querySelectorAll('.dirt-spot');
  const stinks  = document.querySelectorAll('.stink');

  if(!screen || !wrap) return;

  const dirtyPct = parseFloat(Math.max(0, (1 - vitals.higiene / 100)).toFixed(3));
  screen.style.setProperty('--dirty', dirtyPct);
  wrap.style.setProperty('--dirty', dirtyPct);

  dirts.forEach((d, i) => {
    const threshold = 0.30 + i * 0.12;
    d.classList.toggle('visible', dirtyPct >= threshold);
  });

  stinks.forEach((st, i) => {
    st.style.opacity = dirtyLevel >= 2 ? '1' : '0';
    st.style.animationPlayState = dirtyLevel >= 2 ? 'running' : 'paused';
  });

  wrap.classList.toggle('dirty-creature', dirtyLevel >= 2);
  screen.classList.toggle('dirty', dirtyLevel >= 1);
}

function gameTick() {
  tickCount++;
  if(hatched && !dead) totalSecs++;

  if(hatched && !dead && !bornAt) {
    bornAt = Date.now();
    if(avatar) avatar.bornAt = bornAt;
    scheduleSave();
  }

  if(!hatched || dead || !avatar) return;

  updateAllUI();
  if(petCooldown > 0) petCooldown--;

  if(tickCount % 60 !== 0) return; // 1 ciclo = 60s reais

  // ── RECUPERAÇÃO / DECAY DE ENERGIA ──
  if(sleeping) {
    // Dormindo manualmente → recupera energia
    vitals.energia = Math.min(100, vitals.energia + (4 * getItemEffect('sleepEnergyMult')));
    if(vitals.energia >= 100) { wakeUp('full'); }

  } else if(modoRepouso) {
    // Modo repouso manual → decay mínimo, energia CONGELADA
    const _d = rarityBonus().decay;
    vitals.fome    = Math.max(0, vitals.fome    - (0.05 * _d));
    vitals.higiene = Math.max(0, vitals.higiene - 0.03);
    vitals.humor   = Math.max(0, vitals.humor   - 0.02);
    vinculo        = Math.max(0, vinculo        - 0.01);
    // Saúde só cai se fome absolutamente zerada
    if(vitals.fome < 5) vitals.saude = Math.max(0, vitals.saude - 0.05);

  } else {
    // Acordado e ativo → decay normal
    const _d = rarityBonus().decay * GAME_SPEED;
    vitals.fome    = Math.max(0, vitals.fome    - (0.8  * _d * getItemEffect('fomeDecayMult')));
    vitals.humor   = Math.max(0, vitals.humor   - (1.5  * _d * getItemEffect('humorDecayMult')));
    vitals.energia = Math.max(0, vitals.energia - (0.6  * _d));
  }

  // Penalidades de saúde — só no modo ativo (não durante repouso/sono)
  if(vitals.fome < 15 && !sleeping && !modoRepouso)    vitals.saude = Math.max(0, vitals.saude - (0.3 * GAME_SPEED));
  if(vitals.humor < 10 && !sleeping && !modoRepouso)   vitals.saude = Math.max(0, vitals.saude - (0.1 * GAME_SPEED));
  if(vitals.energia < 5  && !sleeping && !modoRepouso) vitals.saude = Math.max(0, vitals.saude - (0.1 * GAME_SPEED));

  if(vitals.saude < 20 && !sick && Math.random() < (0.02 * GAME_SPEED)) {
    sick = true;
    showBubble(rnd(FALAS.sick));
    addLog('Ficou doente! Use medicar!','bad');
  }

  // ── HIGIENE E COCÔ ──
  if(!sleeping && !modoRepouso) {
    vitals.higiene = Math.max(0, vitals.higiene - (0.12 * GAME_SPEED));
  }
  if(!sleeping && !modoRepouso && poopPressure >= 100) {
    spawnPoop();
    poopPressure = 0;
  }

  if(tickCount % 60 === 0 && walletAddress) scheduleSave();

  // Sujeira afeta saúde e humor
  if(dirtyLevel >= 2) vitals.saude = Math.max(0, vitals.saude - (0.04 * GAME_SPEED));
  if(dirtyLevel >= 1) vitals.humor = Math.max(0, vitals.humor - 0.1);
  if(vitals.higiene < 15) vitals.saude = Math.max(0, vitals.saude - (0.04 * GAME_SPEED));

  // ── VÍNCULO — decaimento passivo ──
  if(!sleeping && !modoRepouso) {
    const humorBad = vitals.humor < 30;
    const decayV   = humorBad ? 0.05 : 0.02;
    vinculo = Math.max(0, vinculo - decayV);
  }

  updateDirtyVisuals();

  if(vitals.saude <= 0) { killCreature(); return; }

  if(tickCount % (60 * 5) === 0) { autoSpeak(); updateEquippedDisplay(); updateAvatarSize(); syncEasterEggs(); }

  // ── POSTURA DE OVOS (apenas fase Adulto, nível 10+) ──
  if(getFase() === 3) {
    if(eggLayCooldown > 0) {
      eggLayCooldown--;
    } else if(!eggLayNotified) {
      eggLayNotified = true;
      showBubble('Sinto algo... 🥚');
      addLog('Seu avatar está pronto para botar um ovo!', 'leg');
    }
  }

  // Moedas passivas: +1 a cada 2 minutos
  if(tickCount % (60 * 2) === 0) {
    earnCoins(Math.round(1 * rarityBonus().moedas));
  }
}

function autoSpeak() {
  if(modoRepouso) return; // silencioso em repouso
  if(dirtyLevel >= 2)     showBubble(rnd(FALAS.dirty));
  else if(vitals.fome < 25)    showBubble(rnd(FALAS.hungry));
  else if(vitals.energia < 20) showBubble(rnd(FALAS.tired));
  else if(sick)           showBubble(rnd(FALAS.sick));
  else if(vitals.humor < 30) showBubble(rnd(FALAS.bored));
  else if(Math.random() < .3) showBubble(rnd(FALAS.happy));
}

function playPhaseUp(faseName) {
  const ov = document.getElementById('phaseUpOverlay');
  if(!ov) return;
  document.getElementById('puFase').textContent = 'FASE: ' + faseName;
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
  // Desativa repouso ao morrer
  if(modoRepouso && typeof desativarModoRepouso === 'function') desativarModoRepouso();
  saveToFirebase();
  ModalManager.closeAll();

  const name = avatar ? avatar.nome.split(',')[0] : 'Avatar';
  document.getElementById('deadAvatarName').textContent = name.toUpperCase();
  const diasVividos = bornAt ? Math.floor((Date.now() - bornAt) / (1000*60*60*24)) + 1 : 1;
  document.getElementById('deadStats').innerHTML =
    `Nível ${nivel} · ${FASES[getFase()]} · ${eggsInInventory.length} ovo${eggsInInventory.length!==1?'s':''}<br>` +
    `Viveu ${diasVividos} dia${diasVividos!==1?'s':''} · Vínculo: ${Math.floor(vinculo)}`;

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
  const needed = xpParaNivel(nivel);
  if(xp >= needed) {
    const faseBefore = getFase();
    xp -= needed; nivel++;
    const faseAfter = getFase();
    const _pl = document.getElementById('phaseLabel');
    if(_pl) {
      _pl.textContent = FASES[faseAfter];
      _pl.className = 'phase-label fase-' + FASES[faseAfter].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace('ê','e').replace('ç','c');
    }
    addLog(`Nível ${nivel}! Seu avatar ficou mais forte!`,'leg');
    playLevelUp(nivel);
    if(faseAfter !== faseBefore) {
      setTimeout(() => playPhaseUp(FASES[faseAfter]), 600);
      updateAvatarSize();
    }
  }
}

function playLevelUp(newNivel) {
  const ov = document.getElementById('levelUpOverlay');
  if(!ov) return;

  document.getElementById('luText').textContent = 'NÍVEL UP!';
  document.getElementById('luNivel').textContent = `NÍVEL ${newNivel}`;

  const starEmojis = ['✦','✧','★','✨','⭐'];
  const positions = [
    {sx:'-70px',sy:'-60px'},{sx:'70px',sy:'-55px'},{sx:'-80px',sy:'20px'},
    {sx:'80px',sy:'15px'},{sx:'-30px',sy:'-80px'},{sx:'30px',sy:'-75px'},
    {sx:'55px',sy:'60px'},{sx:'-55px',sy:'55px'}
  ];
  ov.querySelectorAll('.lu-star').forEach(s => s.remove());
  positions.forEach((pos, i) => {
    const s = document.createElement('div');
    s.className = 'lu-star';
    s.textContent = starEmojis[i % starEmojis.length];
    s.style.cssText = `--sx:${pos.sx};--sy:${pos.sy};top:50%;left:50%;animation-delay:${i*0.05}s;color:var(--gold-light)`;
    ov.appendChild(s);
  });

  const clone = ov.cloneNode(true);
  ov.parentNode.replaceChild(clone, ov);

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
