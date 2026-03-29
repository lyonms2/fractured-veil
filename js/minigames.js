// ═══════════════════════════════════════════════════════════════════
// MEMÓRIA ELEMENTAL
// ═══════════════════════════════════════════════════════════════════
const MEM_ELEMENTS = ['🔥','💧','🌿','⚡','🪨','🌪️','🌑','✨'];
let memCards = [], memFlipped = [], memMatched = 0, memErrors = 0, memLocked = false;

function startMemoria() {
  if(vitals.energia < 10) { showBubble('Cansado demais... 😴'); ModalManager.close('memoriaModal'); return; }
  const d = miniDifficulty();
  const pairs = d.tier === 0 ? 4 : d.tier === 1 ? 6 : d.tier === 2 ? 8 : 10;
  const cols = 4;

  document.getElementById('memResult').textContent  = '';
  document.getElementById('memResult').className    = 'mini-result-box';
  document.getElementById('memReward').textContent  = '';
  document.getElementById('memAgainBtn').style.display = 'none';
  document.getElementById('memSub').textContent = `${d.label} · ${pairs} pares`;

  const elems = MEM_ELEMENTS.slice(0, pairs);
  const deck  = [...elems, ...elems].sort(() => Math.random() - .5);
  memCards = deck; memFlipped = []; memMatched = 0; memErrors = 0; memLocked = false;

  const grid = document.getElementById('memGrid');
  const cardSize = pairs <= 8 ? '38px' : '32px';
  grid.style.gridTemplateColumns = `repeat(${cols}, ${cardSize})`;
  grid.innerHTML = deck.map((e, i) =>
    `<div class="mem-card" id="mc${i}" data-i="${i}" onclick="memFlip(${i})" style="width:${cardSize};height:${cardSize};font-size:${pairs<=8?'16':'13'}px">?</div>`
  ).join('');

  updateMemInfo();
}

function memFlip(i) {
  if(vitals.energia < 10) { showBubble('Cansado demais... 😴'); ModalManager.close('memoriaModal'); return; }
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
  const perfMult  = memErrors === 0 ? 1.5 : memErrors <= 2 ? 1.2 : 1.0;
  const humorGain = memErrors === 0 ? 20  : memErrors <= 2 ? 15  : 10;
  vitals.humor = Math.min(100, vitals.humor + humorGain);
  applyGameCost();
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
  if(vitals.energia < 10) { showBubble('Cansado demais... 😴'); ModalManager.close('simonModal'); return; }
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
  applyGameCost();
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

  const _sd = miniDifficulty();
  const _sm = _sd.tier === 0 ? 4 : _sd.tier === 1 ? 6 : _sd.tier === 2 ? 8 : 10;
  const roundsCompleted = Math.max(0, simonRound - 1);
  const frac = roundsCompleted / _sm;

  applyGameCost();
  if(frac > 0) {    
    const r = miniReward(frac * 0.8, frac * 0.8, 1);
    document.getElementById('simonReward').textContent = `+${r.xpGain} XP  +${r.coinGain} 🪙`;
  } else {
    document.getElementById('simonReward').textContent = '';
  }

  vitals.humor = Math.min(100, vitals.humor + 5);
  document.getElementById('simonResult').textContent = '✗ ERROU!';
  document.getElementById('simonResult').className   = 'mini-result-box lose';
  document.getElementById('simonSeqDisplay').textContent = '';
  document.getElementById('simonAgainBtn').style.display = 'inline-block';
  showBubble('Quase... 😔');
  updateAllUI();
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
  // jkpPlaying removido — JKP solo foi descontinuado
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
  if(!sick && vitals.saude >= 100 && activeDiseases.length === 0){ showBubble('Estou bem!'); return; }
  if(activeDiseases.length > 0) {
    addLog(`⚠️ Tens ${activeDiseases.length} doença(s) activa(s)! O Medicar recupera saúde mas não cura doenças — usa o Antídoto Dimensional (300 🪙) na loja.`, 'bad');
  }
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
  const positions = [{fx:'-28px'},{fx:'0px'},{fx:'28px'},{fx:'-14px'},{fx:'14px'}];
  positions.forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'food-particle';
    el.textContent = foods[i % foods.length];
    el.style.cssText = `--fx:${pos.fx};--fr:${(Math.random()*60-30).toFixed(0)}deg;top:10px;left:50%;transform:translateX(-50%);animation-delay:${i*0.06}s`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  });
}

function useAntidote() {
  if(!canAct()) return;
  if(activeDiseases.length === 0 && !sick) {
    showBubble('Não tenho nenhuma doença! 💪');
    addLog('O avatar está saudável — antídoto não é necessário.', 'info');
    return;
  }
  const COST = 300;
  if(gs.moedas < COST) {
    showBubble('Sem moedas para o antídoto... 😢');
    addLog(`Precisas de ${COST} 🪙 para o Antídoto Dimensional!`, 'bad');
    return;
  }
  if(!spendCoins(COST)) return;

  const numDiseases = activeDiseases.length;
  activeDiseases  = [];
  diseaseStress   = { exaustao:0, desnutricao:0, infeccao:0, melancolia:0 };
  sick = false;
  vitals.saude = Math.min(100, vitals.saude + 20);

  playAnim('anim-antidote');
  spawnAntidoteParticles();
  showBubble('Curado! ✨');
  showFloat('+20 💚', '#a855f7');
  const msg = numDiseases > 1 ? `${numDiseases} doenças curadas!` : numDiseases === 1 ? 'Doença curada!' : 'Recuperado!';
  addLog(`🧪 Antídoto Dimensional usado! ${msg} +20 saúde  (-${COST} 🪙)`, 'good');
  updateSickVisuals();
  updateAllUI();
  scheduleSave();
}

function spawnAntidoteParticles() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  const flash = document.createElement('div');
  flash.style.cssText = 'position:absolute;inset:0;z-index:21;pointer-events:none;border-radius:inherit;background:radial-gradient(circle at 50% 50%,rgba(168,85,247,.4) 0%,transparent 70%);transition:opacity .2s;';
  wrap.appendChild(flash);
  setTimeout(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 250); }, 300);

  const symbols = ['✦','🧪','✨','💊','✦','⭐','✦','💫'];
  const offsets = [
    {ax:'-50px',ay:'-10px'},{ax:'50px',ay:'-10px'},
    {ax:'0px',ay:'-55px'}, {ax:'-35px',ay:'-40px'},
    {ax:'35px',ay:'-40px'},{ax:'-55px',ay:'15px'},
    {ax:'55px',ay:'15px'}, {ax:'0px',ay:'25px'},
  ];
  offsets.forEach((pos, i) => {
    const el = document.createElement('div');
    el.className = 'antidote-particle';
    el.textContent = symbols[i % symbols.length];
    el.style.cssText = `--ax:${pos.ax};--ay:${pos.ay};top:50%;left:50%;animation-delay:${i*0.06}s;color:#a855f7;text-shadow:0 0 8px #a855f780;font-size:14px;`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1400);
  });
}

function spawnHealParticles() {
  const wrap  = document.getElementById('creatureWrap');
  const flash = document.getElementById('healFlash');
  if(!wrap) return;
  if(flash) {
    flash.style.opacity = '1';
    setTimeout(() => { flash.style.opacity = '0'; }, 350);
  }
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
  const avatarSvg = document.querySelector('#creatureSVG svg');
  if(!avatarSvg) return;

  const old = avatarSvg.querySelector('#sleepEyesGroup');
  if(old) old.remove();

  let _seed = avatar.seed;
  const rnd = (min, max) => {
    _seed = (_seed * 9301 + 49297) % 233280;
    return Math.floor((_seed / 233280) * (max - min + 1)) + min;
  };

  const cfg  = ELEM_CFG[avatar.elemento] || ELEM_CFG['Fogo'];
  rnd(0, cfg.cores.length-1);
  rnd(0, cfg.cores.length-1);
  rnd(0, cfg.coresSec.length-1);
  const mult     = avatar.raridade === 'Lendário' ? 2 : avatar.raridade === 'Raro' ? 1.5 : 1;
  rnd(1, avatar.raridade === 'Lendário' ? 8 : avatar.raridade === 'Raro' ? 6 : 5);
  const numOlhos = rnd(avatar.raridade === 'Comum' ? 1 : 2, 3);
  rnd(1, 8);
  rnd(2, Math.floor(4 * mult));
  rnd(0, 4);

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

    const ellipse = document.createElementNS(ns, 'ellipse');
    ellipse.setAttribute('cx', x); ellipse.setAttribute('cy', eyeY);
    ellipse.setAttribute('rx', hw + 2); ellipse.setAttribute('ry', tb + 3);
    ellipse.setAttribute('fill', '#0a0816'); ellipse.setAttribute('opacity', '.95');
    grp.appendChild(ellipse);

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M ${x-hw} ${eyeY} Q ${x} ${eyeY + hw*0.55} ${x+hw} ${eyeY}`);
    path.setAttribute('stroke', cfg.corOlho); path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '.95');
    grp.appendChild(path);

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

function positionSleepEyes() { renderSleepEyes(); }

// ═══════════════════════════════════════════════════════════════════
// JOGO DA VELHA
// ═══════════════════════════════════════════════════════════════════
let velhaBoard = Array(9).fill(null);
let velhaPlayerTurn = true;
let velhaOver = false;

const VELHA_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function startVelha() {
  if(vitals.energia < 10) { showBubble('Cansado demais... 😴'); ModalManager.close('velhaModal'); return; }
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
    idx = velhaMinimax(velhaBoard, 'O').index;
  } else if(d.tier === 1) {
    idx = Math.random() < 0.3 ? velhaRandomMove() : velhaMinimax(velhaBoard, 'O').index;
  } else {
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

  const d  = miniDifficulty();
  const rb = rarityBonus();

  let xpMult, coinMult, msg, cls;
  if(result === 'win') {
    xpMult   = d.tier === 0 ? 1.0 : d.tier === 1 ? 1.1 : d.tier === 2 ? 1.2 : 1.3;
    coinMult = xpMult;
    msg = d.tier >= 2 ? '🌟 INCRÍVEL!' : '✕ VITÓRIA!';
    cls = 'win';
    showBubble(d.tier >= 3 ? 'Venceu o mestre! 🏆' : 'Venceu na velha! ✕');
  } else if(result === 'lose') {
    xpMult = 0.1; coinMult = 0.1;
    msg = '○ DERROTA'; cls = 'lose';
    showBubble('Quase! Próxima vez... 😔');
  } else {
    xpMult = 0.4; coinMult = 0.4;
    msg = '✕○ EMPATE'; cls = 'draw';
    showBubble('Empate! Bem jogado 🤝');
  }

  const xpGain   = Math.round(d.xp    * xpMult   * rb.xp);
  const coinGain = Math.round(d.coins * coinMult  * rb.moedas);
  xp += xpGain;
  earnCoins(coinGain);
  applyGameCost();
  vitals.humor = Math.min(100, vitals.humor + (result === 'win' ? 12 : result === 'draw' ? 6 : 3));
  vinculo += 3;
  checkXP(); updateAllUI();

  document.getElementById('velhaResult').textContent = msg;
  document.getElementById('velhaResult').className   = `mini-result-box ${cls}`;
  document.getElementById('velhaReward').textContent = `+${xpGain} XP  +${coinGain} 🪙`;
  document.getElementById('velhaAgainBtn').style.display = 'inline-block';
  addLog(`Jogo da Velha: ${msg} +${xpGain}XP +${coinGain}🪙`, result === 'win' ? 'good' : 'info');
  scheduleSave();
}
