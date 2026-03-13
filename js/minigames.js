// ═══════════════════════════════════════════════════════════════════
// MEMÓRIA ELEMENTAL
// ═══════════════════════════════════════════════════════════════════
const MEM_ELEMENTS = ['🔥','💧','🌿','⚡','🪨','🌪️','🌑','✨'];
let memCards = [], memFlipped = [], memMatched = 0, memErrors = 0, memLocked = false;

function startMemoria() {
  if(vitals.energia < 20) { showBubble('Cansado demais... 😴'); ModalManager.close('memoriaModal'); return; }
  const d = miniDifficulty();
  const pairs = d.tier === 0 ? 4 : d.tier === 1 ? 6 : d.tier === 2 ? 8 : 10;
  const cols  = pairs <= 4 ? 4 : pairs <= 8 ? 4 : 5;

  document.getElementById('memResult').textContent  = '';
  document.getElementById('memResult').className    = 'mini-result-box';
  document.getElementById('memReward').textContent  = '';
  document.getElementById('memAgainBtn').style.display = 'none';
  document.getElementById('memSub').textContent = `${d.label} · ${pairs} pares`;

  // Build shuffled card set
  const elems = MEM_ELEMENTS.slice(0, pairs);
  const deck  = [...elems, ...elems].sort(() => Math.random() - .5);
  memCards = deck; memFlipped = []; memMatched = 0; memErrors = 0; memLocked = false;

  const grid = document.getElementById('memGrid');
  grid.style.gridTemplateColumns = `repeat(${cols}, 38px)`;
  grid.innerHTML = deck.map((e, i) =>
    `<div class="mem-card" id="mc${i}" data-i="${i}" onclick="memFlip(${i})">?</div>`
  ).join('');

  updateMemInfo();
}

function memFlip(i) {
  if(vitals.energia < 20) { showBubble('Cansado demais... 😴'); ModalManager.close('memoriaModal'); return; }
  if(memLocked) return;
  const el = document.getElementById('mc' + i);
  if(!el || el.classList.contains('flipped') || el.classList.contains('matched')) return;
  el.textContent = memCards[i];
  el.classList.add('flipped');
  memFlipped.push(i);
  if(memFlipped.length === 2) {
    memLocked = true;
    const [a, b] = memFlipped;
    if(memCards[a] === memCards[b]) {
      setTimeout(() => {
        document.getElementById('mc'+a).classList.replace('flipped','matched');
        document.getElementById('mc'+b).classList.replace('flipped','matched');
        memMatched++;
        memFlipped = []; memLocked = false;
        updateMemInfo();
        if(memMatched === memCards.length / 2) memVictory();
      }, 400);
    } else {
      memErrors++;
      setTimeout(() => {
        ['mc'+a,'mc'+b].forEach(id => {
          const el2 = document.getElementById(id);
          el2.classList.add('wrong');
          setTimeout(() => {
            el2.classList.remove('wrong','flipped');
            el2.textContent = '?';
          }, 300);
        });
        memFlipped = []; memLocked = false;
        updateMemInfo();
      }, 700);
    }
  }
}

function updateMemInfo() {
  const total = memCards.length / 2;
  document.getElementById('memInfo').textContent = `Pares: ${memMatched}/${total} · Erros: ${memErrors}`;
}

function memVictory() {
  const perfMult = memErrors === 0 ? 1.5 : memErrors <= 2 ? 1.2 : 1.0;
  const humorGain = memErrors === 0 ? 20 : memErrors <= 2 ? 15 : 10;
  vitals.humor = Math.min(100, vitals.humor + humorGain);
  const r = miniReward(perfMult, perfMult);
  document.getElementById('memResult').textContent = memErrors === 0 ? '🌟 PERFEITO!' : '✓ COMPLETO!';
  document.getElementById('memResult').className   = 'mini-result-box win';
  document.getElementById('memReward').textContent = `+${humorGain} 😊  +${r.xpGain} XP  +${r.coinGain} 🪙`;
  document.getElementById('memAgainBtn').style.display = 'inline-block';
  showBubble(memErrors === 0 ? 'Memória perfeita! 🌟' : 'Conseguimos! 🃏');
}

// ═══════════════════════════════════════════════════════════════════
// SIMON SAYS
// ═══════════════════════════════════════════════════════════════════
const SIMON_ELEMS = [
  { emoji:'🔥', color:'#e74c3c' },
  { emoji:'💧', color:'#3498db' },
  { emoji:'🌿', color:'#27ae60' },
  { emoji:'⚡', color:'#f1c40f' },
  { emoji:'🪨', color:'#95a5a6' },
  { emoji:'🌪️', color:'#9b59b6' },
  { emoji:'🌑', color:'#4a4a6a' },
  { emoji:'✨', color:'#c9a84c' },
];
let simonSeq = [], simonStep = 0, simonPlayerTurn = false, simonRound = 0;

function startSimon() {
  simonSeq = []; simonStep = 0; simonPlayerTurn = false; simonRound = 0;
  document.getElementById('simonResult').textContent = '';
  document.getElementById('simonResult').className   = 'mini-result-box';
  document.getElementById('simonReward').textContent = '';
  document.getElementById('simonAgainBtn').style.display = 'none';

  // Build 8-element grid
  const grid = document.getElementById('simonGrid');
  grid.innerHTML = SIMON_ELEMS.map((e,i) =>
    `<button class="simon-btn" id="sb${i}" onclick="simonPlayerClick(${i})" disabled>${e.emoji}</button>`
  ).join('');

  simonNextRound();
}

function simonNextRound() {
  const d = miniDifficulty();
  const maxRounds = d.tier === 0 ? 4 : d.tier === 1 ? 6 : d.tier === 2 ? 8 : 10;
  simonRound++;

  if(simonRound > maxRounds) { simonVictory(); return; }

  simonSeq.push(Math.floor(Math.random() * 8));
  simonStep = 0; simonPlayerTurn = false;

  document.getElementById('simonInfo').textContent = `Rodada ${simonRound}/${maxRounds}`;
  document.getElementById('simonSeqDisplay').textContent = 'Observe...';
  SIMON_ELEMS.forEach((_, i) => document.getElementById('sb'+i).disabled = true);

  // Play sequence
  const speed = d.tier === 0 ? 800 : d.tier === 1 ? 600 : d.tier === 2 ? 400 : 280;
  let delay = 500;
  simonSeq.forEach((idx, pos) => {
    setTimeout(() => {
      simonFlash(idx);
      if(pos === simonSeq.length - 1) {
        setTimeout(() => {
          simonPlayerTurn = true;
          simonStep = 0;
          document.getElementById('simonSeqDisplay').textContent = 'Sua vez!';
          SIMON_ELEMS.forEach((_, i) => document.getElementById('sb'+i).disabled = false);
        }, speed + 100);
      }
    }, delay + pos * speed);
  });
}

function simonFlash(idx) {
  const btn = document.getElementById('sb' + idx);
  if(!btn) return;
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 400);
}

function simonPlayerClick(idx) {
  if(!simonPlayerTurn) return;
  if(vitals.energia < 20) { showBubble('Cansado demais... 😴'); ModalManager.close('simonModal'); return; }
  const btn = document.getElementById('sb' + idx);
  btn.classList.add('player-hit');
  setTimeout(() => btn.classList.remove('player-hit'), 200);

  if(idx !== simonSeq[simonStep]) {
    simonGameOver(); return;
  }
  simonStep++;
  if(simonStep === simonSeq.length) {
    simonPlayerTurn = false;
    SIMON_ELEMS.forEach((_, i) => document.getElementById('sb'+i).disabled = true);
    document.getElementById('simonSeqDisplay').textContent = '✓ Correto!';
    setTimeout(simonNextRound, 800);
  }
}

function simonVictory() {
  vitals.humor = Math.min(100, vitals.humor + 20);
  const r = miniReward(1.3, 1.3);
  document.getElementById('simonResult').textContent = '🎵 MESTRE!';
  document.getElementById('simonResult').className   = 'mini-result-box win';
  document.getElementById('simonReward').textContent = `+20 😊  +${r.xpGain} XP  +${r.coinGain} 🪙`;
  document.getElementById('simonAgainBtn').style.display = 'inline-block';
  document.getElementById('simonSeqDisplay').textContent = '';
  showBubble('Mestre da memória! 🎵');
}

function simonGameOver() {
  simonPlayerTurn = false;
  SIMON_ELEMS.forEach((_, i) => document.getElementById('sb'+i).disabled = true);
  // Partial reward based on rounds completed
  const _sd = miniDifficulty(); const _sm = _sd.tier === 0 ? 4 : _sd.tier === 1 ? 6 : _sd.tier === 2 ? 8 : 10;
  const frac = Math.max(0, simonRound - 1) / _sm;
  if(frac > 0) {
    const r = miniReward(frac * 0.8, frac * 0.8);
    document.getElementById('simonReward').textContent = frac > 0 ? `+${r.xpGain} XP  +${r.coinGain} 🪙` : '';
  }
  vitals.humor = Math.min(100, vitals.humor + 5);
  document.getElementById('simonResult').textContent = '✗ ERROU!';
  document.getElementById('simonResult').className   = 'mini-result-box lose';
  document.getElementById('simonSeqDisplay').textContent = '';
  document.getElementById('simonAgainBtn').style.display = 'inline-block';
  showBubble('Quase... 😔');
}

// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════
// JO-KEN-PÔ
// ═══════════════════════════════════════════
const JKP_OPTIONS = ['pedra','papel','tesoura'];
const JKP_EMOJI   = { pedra:'🪨', papel:'📄', tesoura:'✂️' };
const JKP_BEATS   = { pedra:'tesoura', papel:'pedra', tesoura:'papel' }; // key beats value
// enemy is the avatar itself
let jkpPlaying = false;

function openJkp() {
  ModalManager.open('jkpModal');
  jkpReset();
  playAnim('anim-play');
  // Show avatar's own SVG as the opponent, using its name
  const enemyEmoji = document.getElementById('jkpEnemyEmoji');
  enemyEmoji.innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 46, 46, "mg");
  // Show first part of name as label
  const shortName = avatar.nome.split(',')[0];
  document.getElementById('jkpEnemyLabel').textContent = shortName.toUpperCase();
}

function closeJkp() {
  ModalManager.close('jkpModal');
  jkpPlaying = false;
}

function jkpPlayAgain() {
  if(vitals.energia < 20) {
    showBubble('Cansado demais... 😴');
    ModalManager.closeAll();
    return;
  }
  jkpReset();
}

function jkpReset() {
  jkpPlaying = false;
  document.getElementById('jkpPlayerHand').textContent = '❓';
  document.getElementById('jkpPlayerHand').className   = 'jkp-hand';
  const svgStr = avatar ? gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 46, 46, "mg") : '👾';
  document.getElementById('jkpEnemyHand').innerHTML = `<span id="jkpEnemyEmoji">${svgStr}</span><div class="jkp-countdown" id="jkpCountdown"></div>`;
  document.getElementById('jkpEnemyHand').className    = 'jkp-hand';
  const res = document.getElementById('jkpResult');
  res.textContent = ''; res.className = 'jkp-result';
  const rew = document.getElementById('jkpRewards');
  rew.textContent = ''; rew.className = 'jkp-rewards';
  document.getElementById('jkpPlayAgain').style.display = 'none';
  document.getElementById('jkpChoices').style.opacity   = '1';
  document.getElementById('jkpChoices').style.pointerEvents = 'all';
  // Clear selected highlight from previous round
  document.querySelectorAll('.jkp-choice').forEach(b => b.classList.remove('selected','win','lose','draw'));
}

function jkpChoose(choice) {
  if(jkpPlaying) return;
  if(vitals.energia < 20) { showBubble('Cansado demais... 😴'); closeJkp(); return; }
  jkpPlaying = true;

  // Disable choices while animating
  const choicesEl = document.getElementById('jkpChoices');
  choicesEl.style.opacity = '.4';
  choicesEl.style.pointerEvents = 'none';

  // Highlight selected
  choicesEl.querySelectorAll('.jkp-choice').forEach(b => {
    if(b.getAttribute('onclick').includes(choice)) b.classList.add('selected');
  });

  // Show player's choice immediately
  document.getElementById('jkpPlayerHand').textContent = JKP_EMOJI[choice];
  document.getElementById('jkpPlayerHand').classList.add('reveal');

  // Countdown animation: 3 → 2 → 1 → reveal
  const cd = document.getElementById('jkpCountdown');
  const enemyHand = document.getElementById('jkpEnemyHand');
  let count = 3;

  function tick() {
    cd.textContent = count;
    cd.className = 'jkp-countdown';
    // Force reflow to restart animation
    void cd.offsetWidth;
    cd.classList.add('pop');
    // Shake enemy while counting
    enemyHand.classList.add('jkp-shake');
    setTimeout(() => enemyHand.classList.remove('jkp-shake'), 500);
    count--;
    if(count > 0) {
      setTimeout(tick, 600);
    } else {
      setTimeout(() => revealResult(choice), 600);
    }
  }
  setTimeout(tick, 200);
}

function revealResult(playerChoice) {
  const enemyChoice = JKP_OPTIONS[Math.floor(Math.random() * 3)];
  const enemyHand   = document.getElementById('jkpEnemyHand');

  // Clear countdown, show enemy choice
  enemyHand.innerHTML = JKP_EMOJI[enemyChoice];
  enemyHand.classList.add('reveal');

  // Determine outcome
  let outcome;
  if(playerChoice === enemyChoice) {
    outcome = 'draw';
  } else if(JKP_BEATS[playerChoice] === enemyChoice) {
    outcome = 'win';
  } else {
    outcome = 'lose';
  }

  // Apply visual classes with slight delay for drama
  setTimeout(() => {
    const playerHand = document.getElementById('jkpPlayerHand');
    playerHand.classList.remove('reveal');
    enemyHand.classList.remove('reveal');
    playerHand.classList.add(outcome);
    enemyHand.classList.add(outcome === 'win' ? 'lose' : outcome === 'lose' ? 'win' : 'draw');

    // Result text
    const resultEl = document.getElementById('jkpResult');
    const rewardsEl = document.getElementById('jkpRewards');
    const RESULTS = {
      win:  { text:'VITÓRIA!', cls:'win',  humor:20, xpGain:Math.round(miniDifficulty().xp*1.0*rarityBonus().xp*getVinculoBonus().xpMult), coinsGain:Math.round(miniDifficulty().coins*1.0*rarityBonus().moedas) },
      lose: { text:'DERROTA',  cls:'lose', humor:5,  xpGain:Math.round(miniDifficulty().xp*0.1*rarityBonus().xp), coinsGain:Math.round(miniDifficulty().coins*0.1*rarityBonus().moedas) },
      draw: { text:'EMPATE',   cls:'draw', humor:10, xpGain:Math.round(miniDifficulty().xp*0.5*rarityBonus().xp*getVinculoBonus().xpMult), coinsGain:Math.round(miniDifficulty().coins*0.5*rarityBonus().moedas) }
    };
    const r = RESULTS[outcome];
    resultEl.textContent = r.text;
    resultEl.className   = `jkp-result show ${r.cls}`;

    // Apply rewards + costs
    vitals.humor   = Math.min(100, vitals.humor + r.humor);
    vitals.energia = Math.max(0, vitals.energia - 15);
    vitals.fome    = Math.max(0, vitals.fome - 5);
    xp      += r.xpGain;
    vinculo += outcome === 'win' ? 5 : 1;
    earnCoins(r.coinsGain);

    rewardsEl.textContent = `+${r.humor} 😊  +${r.xpGain} XP  +${r.coinsGain} 🪙`;
    rewardsEl.className   = 'jkp-rewards show';

    // Bubble reaction
    if(outcome === 'win')       showBubble('Ganhei! 🥊✨');
    else if(outcome === 'lose') showBubble('Perdi... 😔');
    else                        showBubble('Empate! 🤝');

    // Log
    const logMsg = outcome === 'win'
      ? `Venceu no Jo-Ken-Pô! ${JKP_EMOJI[playerChoice]} vs ${JKP_EMOJI[enemyChoice]} +${r.xpGain}XP`
      : outcome === 'lose'
      ? `Perdeu no Jo-Ken-Pô! ${JKP_EMOJI[playerChoice]} vs ${JKP_EMOJI[enemyChoice]}`
      : `Empate no Jo-Ken-Pô! ${JKP_EMOJI[playerChoice]} vs ${JKP_EMOJI[enemyChoice]}`;
    addLog(logMsg, outcome === 'win' ? 'good' : outcome === 'lose' ? 'bad' : 'info');

    checkXP(); updateAllUI();

    // Show play again button
    setTimeout(() => {
      document.getElementById('jkpPlayAgain').style.display = 'inline-block';
    }, 300);
  }, 250);
}

function toggleSleep() {
  if(!hatched || !avatar || dead) return;
  if(sleeping) {
    wakeUp('manual');
  } else {
    if(vitals.energia >= 100){ showBubble('Não estou cansado!'); return; }
    startSleep();
  }
}

function startSleep() {
  sleeping = true;
  ModalManager.closeAll();
  jkpPlaying = false;
  document.getElementById('sleepOverlay').classList.add('active');
  document.getElementById('creatureWrap').classList.add('sleeping');
  renderSleepEyes();
  document.querySelectorAll('.zzz-bubble').forEach(z => z.classList.add('sleeping'));
  playAnim('anim-sleep', true);
  document.getElementById('actionBtns').classList.add('sleeping-mode');
  document.getElementById('sleepLabel').textContent = 'ACORDAR';
  document.getElementById('btnSleep').classList.add('active-sleep');
  showBubble('zzz... 💤');
  addLog('Dormindo...','info'); scheduleSave();
}

function wakeUp(reason) {
  sleeping = false;
  document.getElementById('sleepOverlay').classList.remove('active');
  document.getElementById('creatureWrap').classList.remove('sleeping');
  const grp = document.querySelector('#sleepEyesGroup');
  if(grp) grp.remove();
  document.querySelectorAll('.zzz-bubble').forEach(z => z.classList.remove('sleeping'));
  resetAnim();
  document.getElementById('actionBtns').classList.remove('sleeping-mode');
  document.getElementById('sleepLabel').textContent = 'DORMIR';
  document.getElementById('btnSleep').classList.remove('active-sleep');
  if(reason === 'full') {
    showBubble('Energia cheia! ☀️');
    addLog('Acordou com energia plena!', 'good');
  } else {
    showBubble('Acordei! 😊');
    addLog('Acordou descansado!', 'good');
  }
  scheduleSave();
}

function healCreature() {
  if(!canAct()) return;
  if(!sick && vitals.saude >= 100){ showBubble('Estou bem!'); return; }
  const COST = 40;
  if(gs.moedas < COST) { showBubble('Sem moedas... 😢'); addLog(`Precisa de ${COST} 🪙 para medicar!`,'bad'); return; }
  if(!spendCoins(COST)) return;
  vitals.saude = Math.min(100, vitals.saude + 40);
  sick = false;
  vinculo += 4;
  playAnim('anim-heal');
  spawnHealParticles();
  showFloat('+40 💚','#27ae60');
  showBubble('Me sinto melhor! 💊');
  addLog(`Medicado! +40 saúde  (-40 🪙)`,'good');
  updateAllUI(); scheduleSave();
}

function spawnFoodParticles() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;
  const foods = ['🍖','🍗','✨','⭐'];
  const positions = [
    {fx:'-28px'},{fx:'0px'},{fx:'28px'},{fx:'-14px'},{fx:'14px'}
  ];
  positions.forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'food-particle';
    el.textContent = foods[i % foods.length];
    el.style.cssText = `--fx:${pos.fx};--fr:${(Math.random()*60-30).toFixed(0)}deg;top:10px;left:50%;transform:translateX(-50%);animation-delay:${i*0.06}s`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  });
}

function spawnHealParticles() {
  const wrap = document.getElementById('creatureWrap');
  const flash = document.getElementById('healFlash');
  if(!wrap) return;
  // Screen flash
  if(flash) {
    flash.style.opacity = '1';
    setTimeout(() => { flash.style.opacity = '0'; }, 350);
  }
  // Cross particles burst outward
  const offsets = [
    {hx:'-40px',hy:'0px'},{hx:'40px',hy:'0px'},
    {hx:'0px',hy:'-40px'},{hx:'-28px',hy:'-28px'},
    {hx:'28px',hy:'-28px'},{hx:'0px',hy:'20px'},
  ];
  offsets.forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'heal-cross';
    el.textContent = '✚';
    el.style.cssText = `--hx:${pos.hx};--hy:${pos.hy};top:50%;left:50%;animation-delay:${i*0.07}s`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  });
}

function renderSleepEyes() {
  if(!avatar) return;
  // Inject closed eyes directly into the avatar SVG (same coordinate space, no positioning needed)
  const avatarSvg = document.querySelector('#creatureSVG svg');
  if(!avatarSvg) return;

  // Remove any previous sleep eyes group
  const old = avatarSvg.querySelector('#sleepEyesGroup');
  if(old) old.remove();

  // Reconstruct eye positions using same deterministic seed as gerarSVG
  let _seed = avatar.seed;
  const rnd = (min, max) => {
    _seed = (_seed * 9301 + 49297) % 233280;
    return Math.floor((_seed / 233280) * (max - min + 1)) + min;
  };

  const cfg   = ELEM_CFG[avatar.elemento] || ELEM_CFG['Fogo'];
  rnd(0, cfg.cores.length-1);       // cor1
  rnd(0, cfg.cores.length-1);       // cor2
  rnd(0, cfg.coresSec.length-1);    // corSec
  const mult     = avatar.raridade === 'Lendário' ? 2 : avatar.raridade === 'Raro' ? 1.5 : 1;
  rnd(1, avatar.raridade === 'Lendário' ? 8 : avatar.raridade === 'Raro' ? 6 : 5); // tipoCorpo
  const numOlhos = rnd(avatar.raridade === 'Comum' ? 1 : 2, 3);
  rnd(1, 8);                         // tipoOlho
  rnd(2, Math.floor(4 * mult));      // numBracos
  rnd(0, 4);                         // numChifres

  const espac = numOlhos === 1 ? 0 : 60 / (numOlhos - 1);
  const eyeY  = 95;
  const tb    = avatar.raridade === 'Lendário' ? 14 : avatar.raridade === 'Raro' ? 12 : 10;

  const ns  = 'http://www.w3.org/2000/svg';
  const grp = document.createElementNS(ns, 'g');
  grp.id = 'sleepEyesGroup';
  grp.style.opacity = '0';
  grp.style.transition = 'opacity .6s ease';

  for(let i = 0; i < numOlhos; i++) {
    const x  = numOlhos === 1 ? 100 : 70 + (i * espac);
    const hw = tb * 0.9;

    // backing ellipse to cover open eye
    const ellipse = document.createElementNS(ns, 'ellipse');
    ellipse.setAttribute('cx', x); ellipse.setAttribute('cy', eyeY);
    ellipse.setAttribute('rx', hw + 2); ellipse.setAttribute('ry', tb + 3);
    ellipse.setAttribute('fill', '#0a0816'); ellipse.setAttribute('opacity', '.95');
    grp.appendChild(ellipse);

    // closed eye arc
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M ${x-hw} ${eyeY} Q ${x} ${eyeY + hw*0.55} ${x+hw} ${eyeY}`);
    path.setAttribute('stroke', cfg.corOlho); path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '.95');
    grp.appendChild(path);

    // eyelash dots
    [[x - hw*0.6, eyeY + hw*0.3],[x, eyeY + hw*0.5],[x + hw*0.6, eyeY + hw*0.3]].forEach(([cx,cy]) => {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
      dot.setAttribute('r', '1.5'); dot.setAttribute('fill', cfg.corOlho); dot.setAttribute('opacity', '.6');
      grp.appendChild(dot);
    });
  }

  avatarSvg.appendChild(grp);
  requestAnimationFrame(() => { grp.style.opacity = '1'; });
}

function positionSleepEyes() { renderSleepEyes(); } // alias — called from updateAvatarSize

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// JOGO DA VELHA
// ═══════════════════════════════════════════════════════════════════
let velhaBoard = Array(9).fill(null); // null | 'X' | 'O'
let velhaPlayerTurn = true;
let velhaOver = false;

const VELHA_LINES = [
  [0,1,2],[3,4,5],[6,7,8], // linhas
  [0,3,6],[1,4,7],[2,5,8], // colunas
  [0,4,8],[2,4,6]           // diagonais
];

function startVelha() {
  if(vitals.energia < 20) { showBubble('Cansado demais... 😴'); ModalManager.close('velhaModal'); return; }
  velhaBoard = Array(9).fill(null);
  velhaPlayerTurn = true;
  velhaOver = false;

  const d = miniDifficulty();
  document.getElementById('velhaInfo').textContent    = `${d.label} · Sua vez! ✕`;
  document.getElementById('velhaResult').textContent  = '';
  document.getElementById('velhaResult').className    = 'mini-result-box';
  document.getElementById('velhaReward').textContent  = '';
  document.getElementById('velhaAgainBtn').style.display = 'none';

  velhaRender();
}

function velhaRender() {
  const grid = document.getElementById('velhaGrid');
  if(!grid) return;
  grid.innerHTML = velhaBoard.map((v, i) => {
    const cls = v === 'X' ? 'velha-x' : v === 'O' ? 'velha-o' : '';
    return `<button class="velha-cell ${cls}" onclick="velhaClick(${i})" ${(v || velhaOver) ? 'disabled' : ''}>${v || ''}</button>`;
  }).join('');
}

function velhaClick(i) {
  if(!velhaPlayerTurn || velhaOver || velhaBoard[i]) return;
  velhaBoard[i] = 'X';
  velhaRender();

  const win = velhaCheckWin('X');
  if(win) { velhaEnd('win', win); return; }
  if(velhaBoard.every(c => c)) { velhaEnd('draw'); return; }

  velhaPlayerTurn = false;
  document.getElementById('velhaInfo').textContent = 'Vez do Avatar... 🤔';
  setTimeout(velhaAiMove, 500);
}

function velhaAiMove() {
  const d = miniDifficulty();
  let idx;

  if(d.tier >= 2) {
    // DIFÍCIL/MESTRE — minimax perfeito
    idx = velhaMinimax(velhaBoard, 'O').index;
  } else if(d.tier === 1) {
    // MÉDIO — minimax mas com 30% de erro
    idx = Math.random() < 0.3 ? velhaRandomMove() : velhaMinimax(velhaBoard, 'O').index;
  } else {
    // FÁCIL — aleatório com preferência pelo centro
    idx = velhaBoard[4] === null && Math.random() < 0.5 ? 4 : velhaRandomMove();
  }

  velhaBoard[idx] = 'O';
  velhaRender();

  const win = velhaCheckWin('O');
  if(win) { velhaEnd('lose', win); return; }
  if(velhaBoard.every(c => c)) { velhaEnd('draw'); return; }

  velhaPlayerTurn = true;
  const d2 = miniDifficulty();
  document.getElementById('velhaInfo').textContent = `${d2.label} · Sua vez! ✕`;
}

function velhaRandomMove() {
  const empty = velhaBoard.map((v,i) => v ? null : i).filter(i => i !== null);
  return empty[Math.floor(Math.random() * empty.length)];
}

function velhaMinimax(board, player) {
  const win = velhaCheckWinBoard(board, 'O');
  if(win) return { score: 10 };
  if(velhaCheckWinBoard(board, 'X')) return { score: -10 };
  if(board.every(c => c)) return { score: 0 };

  const moves = [];
  board.forEach((v, i) => {
    if(v) return;
    const newBoard = [...board];
    newBoard[i] = player;
    const result = velhaMinimax(newBoard, player === 'O' ? 'X' : 'O');
    moves.push({ index: i, score: result.score });
  });

  if(player === 'O') {
    return moves.reduce((best, m) => m.score > best.score ? m : best, { score: -Infinity, index: -1 });
  } else {
    return moves.reduce((best, m) => m.score < best.score ? m : best, { score: Infinity, index: -1 });
  }
}

function velhaCheckWinBoard(board, player) {
  return VELHA_LINES.find(line => line.every(i => board[i] === player)) || null;
}

function velhaCheckWin(player) {
  return velhaCheckWinBoard(velhaBoard, player);
}

function velhaHighlightWin(line) {
  if(!line) return;
  line.forEach(i => {
    const cells = document.querySelectorAll('.velha-cell');
    if(cells[i]) cells[i].classList.add('velha-win');
  });
}

function velhaEnd(result, winLine) {
  velhaOver = true;
  velhaRender();
  if(winLine) velhaHighlightWin(winLine);

  const d = miniDifficulty();
  const rb = rarityBonus();

  let xpMult, coinMult, msg, cls;
  if(result === 'win') {
    // Vitória mais valiosa em dificuldades maiores
    xpMult   = d.tier === 0 ? 1.0 : d.tier === 1 ? 1.1 : d.tier === 2 ? 1.2 : 1.3;
    coinMult = xpMult;
    msg = d.tier >= 2 ? '🌟 INCRÍVEL!' : '✕ VITÓRIA!';
    cls = 'win';
    showBubble(d.tier >= 3 ? 'Venceu o mestre! 🏆' : 'Venceu na velha! ✕');
  } else if(result === 'lose') {
    xpMult   = 0.1; coinMult = 0.1;
    msg = '○ DERROTA';
    cls = 'lose';
    showBubble('Quase! Próxima vez... 😔');
  } else {
    xpMult   = 0.4; coinMult = 0.4;
    msg = '✕○ EMPATE';
    cls = 'draw';
    showBubble('Empate! Bem jogado 🤝');
  }

  const xpGain   = Math.round(d.xp    * xpMult   * rb.xp);
  const coinGain = Math.round(d.coins * coinMult  * rb.moedas);
  xp += xpGain;
  earnCoins(coinGain);
  vitals.energia = Math.max(0, vitals.energia - 15);
  vitals.fome    = Math.max(0, vitals.fome    - 5);
  vitals.humor   = Math.min(100, vitals.humor + (result === 'win' ? 12 : result === 'draw' ? 6 : 3));
  vinculo += 3;
  checkXP(); updateAllUI();

  document.getElementById('velhaResult').textContent = msg;
  document.getElementById('velhaResult').className   = `mini-result-box ${cls}`;
  document.getElementById('velhaReward').textContent = `+${xpGain} XP  +${coinGain} 🪙`;
  document.getElementById('velhaAgainBtn').style.display = 'inline-block';
  addLog(`Jogo da Velha: ${msg} +${xpGain}XP +${coinGain}🪙`, result === 'win' ? 'good' : 'info');
  scheduleSave();
}
