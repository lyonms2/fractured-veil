// ═══════════════════════════════════════════════════════════════════
// MEMÓRIA ELEMENTAL
// ═══════════════════════════════════════════════════════════════════
const MEM_ELEMENTS = ['🔥','💧','🌿','⚡','🪨','🌪️','🌑','✨'];
let memCards = [], memFlipped = [], memMatched = 0, memErrors = 0, memLocked = false;

function startMemoria() {
  const d = miniDifficulty();
  const pairs = d.tier === 0 ? 4 : d.tier === 1 ? 6 : 8;
  const cols  = pairs <= 4 ? 4 : 4;

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
  const r = miniReward(perfMult, perfMult);
  document.getElementById('memResult').textContent = memErrors === 0 ? '🌟 PERFEITO!' : '✓ COMPLETO!';
  document.getElementById('memResult').className   = 'mini-result-box win';
  document.getElementById('memReward').textContent = `+${r.xpGain} XP  +${r.coinGain} 🪙`;
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
  const maxRounds = d.tier === 0 ? 4 : d.tier === 1 ? 6 : 8;
  simonRound++;

  if(simonRound > maxRounds) { simonVictory(); return; }

  simonSeq.push(Math.floor(Math.random() * 8));
  simonStep = 0; simonPlayerTurn = false;

  document.getElementById('simonInfo').textContent = `Rodada ${simonRound}/${maxRounds}`;
  document.getElementById('simonSeqDisplay').textContent = 'Observe...';
  SIMON_ELEMS.forEach((_, i) => document.getElementById('sb'+i).disabled = true);

  // Play sequence
  const speed = d.tier === 0 ? 800 : d.tier === 1 ? 600 : 400;
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
  const r = miniReward(1.3, 1.3);
  document.getElementById('simonResult').textContent = '🎵 MESTRE!';
  document.getElementById('simonResult').className   = 'mini-result-box win';
  document.getElementById('simonReward').textContent = `+${r.xpGain} XP  +${r.coinGain} 🪙`;
  document.getElementById('simonAgainBtn').style.display = 'inline-block';
  document.getElementById('simonSeqDisplay').textContent = '';
  showBubble('Mestre da memória! 🎵');
}

function simonGameOver() {
  simonPlayerTurn = false;
  SIMON_ELEMS.forEach((_, i) => document.getElementById('sb'+i).disabled = true);
  // Partial reward based on rounds completed
  const frac = Math.max(0, simonRound - 1) / (miniDifficulty().tier === 0 ? 4 : miniDifficulty().tier === 1 ? 6 : 8);
  if(frac > 0) {
    const r = miniReward(frac * 0.8, frac * 0.8);
    document.getElementById('simonReward').textContent = frac > 0 ? `+${r.xpGain} XP  +${r.coinGain} 🪙` : '';
  }
  document.getElementById('simonResult').textContent = '✗ ERROU!';
  document.getElementById('simonResult').className   = 'mini-result-box lose';
  document.getElementById('simonSeqDisplay').textContent = '';
  document.getElementById('simonAgainBtn').style.display = 'inline-block';
  showBubble('Quase... 😔');
}

// ═══════════════════════════════════════════════════════════════════
// CORRIDA DE SOMBRA
// ═══════════════════════════════════════════════════════════════════
let sombraPos = 0, sombraDir = 1, sombraInterval = null;
let sombraRounds = 0, sombraHits = 0, sombraMaxRounds = 3, sombraActive = false;
let sombraZoneL = 0, sombraZoneW = 0;

function startSombra() {
  const d = miniDifficulty();
  sombraMaxRounds = d.tier === 0 ? 3 : d.tier === 1 ? 4 : 5;
  const speed = d.tier === 0 ? 18 : d.tier === 1 ? 13 : 8; // ms per frame

  sombraRounds = 0; sombraHits = 0; sombraPos = 0; sombraDir = 1; sombraActive = false;

  document.getElementById('sombraResult').textContent = '';
  document.getElementById('sombraResult').className   = 'mini-result-box';
  document.getElementById('sombraReward').textContent = '';
  document.getElementById('sombraAgainBtn').style.display = 'none';
  document.getElementById('sombraTapBtn').disabled = false;
  document.getElementById('sombraInfo').textContent = `Acerte ${sombraMaxRounds} vezes! (${d.label})`;

  // Zone: center 30% of track
  const track = document.getElementById('sombraTrack');
  const tw = track.offsetWidth || 200;
  sombraZoneL = tw * 0.35;
  sombraZoneW = tw * 0.30;
  const zone = document.getElementById('sombraZone');
  zone.style.left  = sombraZoneL + 'px';
  zone.style.width = sombraZoneW + 'px';

  if(sombraInterval) clearInterval(sombraInterval);
  sombraInterval = setInterval(() => {
    if(!sombraActive) return;
    sombraPos += sombraDir * 2;
    const tw2 = (document.getElementById('sombraTrack').offsetWidth || 200) - 20;
    if(sombraPos >= tw2) { sombraPos = tw2; sombraDir = -1; }
    if(sombraPos <= 0)   { sombraPos = 0;   sombraDir =  1; }
    document.getElementById('sombraRunner').style.left = sombraPos + 'px';
  }, speed);

  // Short countdown then go
  let count = 3;
  document.getElementById('sombraScore').textContent = `Começando em ${count}...`;
  document.getElementById('sombraTapBtn').disabled = true;
  const cd = setInterval(() => {
    count--;
    if(count > 0) {
      document.getElementById('sombraScore').textContent = `Começando em ${count}...`;
    } else {
      clearInterval(cd);
      sombraActive = true;
      document.getElementById('sombraTapBtn').disabled = false;
      document.getElementById('sombraScore').textContent = `Acertos: 0/${sombraMaxRounds}`;
    }
  }, 800);
}

function sombraTap() {
  if(!sombraActive) return;
  const inZone = sombraPos >= sombraZoneL && sombraPos <= (sombraZoneL + sombraZoneW);
  const btn = document.getElementById('sombraTapBtn');

  if(inZone) {
    sombraHits++;
    sombraRounds++;
    document.getElementById('sombraScore').textContent = `✓ Acerto! ${sombraHits}/${sombraMaxRounds}`;
    btn.textContent = '✓';
    setTimeout(() => { btn.textContent = 'TAP!'; }, 300);
  } else {
    sombraRounds++;
    document.getElementById('sombraScore').textContent = `✗ Errou! ${sombraHits}/${sombraMaxRounds}`;
    btn.textContent = '✗';
    setTimeout(() => { btn.textContent = 'TAP!'; }, 300);
  }

  if(sombraRounds >= sombraMaxRounds) {
    sombraActive = false;
    clearInterval(sombraInterval);
    btn.disabled = true;
    setTimeout(sombraFinish, 500);
  }
}

function sombraFinish() {
  const ratio = sombraHits / sombraMaxRounds;
  const won   = ratio >= 0.6;
  const mult  = ratio >= 1.0 ? 1.5 : ratio >= 0.8 ? 1.2 : ratio >= 0.6 ? 1.0 : 0.3;
  const r     = miniReward(mult, mult);

  document.getElementById('sombraResult').textContent = ratio >= 1.0 ? '🌟 PERFEITO!' : won ? `✓ ${sombraHits}/${sombraMaxRounds} ACERTOS` : `✗ ${sombraHits}/${sombraMaxRounds} ACERTOS`;
  document.getElementById('sombraResult').className   = 'mini-result-box ' + (won ? 'win' : 'lose');
  document.getElementById('sombraReward').textContent = `+${r.xpGain} XP  +${r.coinGain} 🪙`;
  document.getElementById('sombraAgainBtn').style.display = 'inline-block';
  showBubble(ratio >= 1.0 ? 'Reflexos perfeitos! ⚡' : won ? 'Bom timing! ⏱' : 'Preciso treinar mais...');
}

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
  enemyEmoji.innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 46, 46);
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
  const svgStr = avatar ? gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 46, 46) : '👾';
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
      win:  { text:'VITÓRIA!', cls:'win',  humor:20, xpGain:Math.round(15*rarityBonus().xp), coinsGain:Math.round(20*rarityBonus().moedas) },
      lose: { text:'DERROTA',  cls:'lose', humor:5,  xpGain:Math.round(3*rarityBonus().xp),  coinsGain:Math.round(3*rarityBonus().moedas) },
      draw: { text:'EMPATE',   cls:'draw', humor:10, xpGain:Math.round(8*rarityBonus().xp),  coinsGain:Math.round(8*rarityBonus().moedas) }
    };
    const r = RESULTS[outcome];
    resultEl.textContent = r.text;
    resultEl.className   = `jkp-result show ${r.cls}`;

    // Apply rewards + costs
    vitals.humor   = Math.min(100, vitals.humor + r.humor);
    vitals.energia = Math.max(0, vitals.energia - 15);
    vitals.fome    = Math.max(0, vitals.fome - 5);
    xp    += r.xpGain;
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
  // Close any open modal when sleeping
  ModalManager.closeAll();
  jkpPlaying = false;
  document.getElementById('sleepOverlay').classList.add('active');
  // Show closed eyes overlay
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
  // Hide closed eyes
  const se = document.getElementById('sleepEyes');
  if(se) { se.classList.remove('show'); se.innerHTML = ''; }
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
  const COST = 60;
  if(gs.moedas < COST) { showBubble('Sem moedas... 😢'); addLog(`Precisa de ${COST} 🪙 para medicar!`,'bad'); return; }
  if(!spendCoins(COST)) return;
  vitals.saude = Math.min(100, vitals.saude + 40);
  sick = false;
  playAnim('anim-heal');
  spawnHealParticles();
  showFloat('+40 💚','#27ae60');
  showBubble('Me sinto melhor! 💊');
  addLog(`Medicado! +40 saúde  (-${COST} 🪙)`,'good');
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
  const se = document.getElementById('sleepEyes');
  if(!se) return;

  // Reconstruct eye positions using same deterministic seed as gerarSVG
  let _seed = avatar.seed;
  const rnd = (min, max) => {
    _seed = (_seed * 9301 + 49297) % 233280;
    return Math.floor((_seed / 233280) * (max - min + 1)) + min;
  };

  const cfg      = ELEM_CFG[avatar.elemento] || ELEM_CFG['Fogo'];
  // advance seed through same steps as gerarSVG to get to numOlhos/tipoOlho
  rnd(0, cfg.cores.length-1);       // cor1
  rnd(0, cfg.cores.length-1);       // cor2
  rnd(0, cfg.coresSec.length-1);    // corSec
  // corBrilho and corOlho are not random
  const mult      = avatar.raridade === 'Lendário' ? 2 : avatar.raridade === 'Raro' ? 1.5 : 1;
  rnd(1, avatar.raridade === 'Lendário' ? 8 : avatar.raridade === 'Raro' ? 6 : 5); // tipoCorpo
  const numOlhos  = rnd(avatar.raridade === 'Comum' ? 1 : 2, 3);
  rnd(1, 8); // tipoOlho — we don't need it
  rnd(2, Math.floor(4 * mult)); // numBracos
  rnd(0, 4);  // numChifres
  // We now know numOlhos and eye X positions

  const espac = numOlhos === 1 ? 0 : 60 / (numOlhos - 1);
  const eyeY  = 95;
  const tb    = avatar.raridade === 'Lendário' ? 14 : avatar.raridade === 'Raro' ? 12 : 10;

  let svgContent = '';
  for(let i = 0; i < numOlhos; i++) {
    const x  = numOlhos === 1 ? 100 : 70 + (i * espac);
    const hw = tb * 0.9; // half-width of closed eye line
    // white backing ellipse to cover the open eye underneath
    svgContent += `<ellipse cx="${x}" cy="${eyeY}" rx="${hw + 2}" ry="${tb + 3}" fill="#0a0816" opacity=".92"/>`;
    // curved closed eye line (like ── )
    svgContent += `<path d="M ${x - hw} ${eyeY} Q ${x} ${eyeY + hw * 0.55} ${x + hw} ${eyeY}"
      stroke="${cfg.corOlho}" stroke-width="3" fill="none" stroke-linecap="round"
      opacity=".95"/>`;
    // tiny eyelash dots
    svgContent += `<circle cx="${x - hw * 0.6}" cy="${eyeY + hw * 0.3}" r="1.5" fill="${cfg.corOlho}" opacity=".6"/>`;
    svgContent += `<circle cx="${x}" cy="${eyeY + hw * 0.5}" r="1.5" fill="${cfg.corOlho}" opacity=".6"/>`;
    svgContent += `<circle cx="${x + hw * 0.6}" cy="${eyeY + hw * 0.3}" r="1.5" fill="${cfg.corOlho}" opacity=".6"/>`;
  }

  se.innerHTML = svgContent;
  // Scale the SVG overlay to match the creature SVG (200x200 viewBox, rendered at 140x140)
  se.style.width  = '100%';
  se.style.height = '100%';
  requestAnimationFrame(() => se.classList.add('show'));
}

// ═══════════════════════════════════════════════════════════════════
