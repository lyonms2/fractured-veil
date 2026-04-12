// ═══════════════════════════════════════════════════════════════════
// CAMPO MINADO — Portal Dimensional
// Configurações por dificuldade:
//   FÁCIL:   7×7  · 8 minas
//   MÉDIO:   9×9  · 15 minas
//   DIFÍCIL: 11×11 · 25 minas
//   MESTRE:  13×13 · 40 minas
// ═══════════════════════════════════════════════════════════════════

const MINA_CONFIGS = [
  { rows:7,  cols:7,  mines:8  },
  { rows:9,  cols:9,  mines:15 },
  { rows:11, cols:11, mines:25 },
  { rows:13, cols:13, mines:40 },
];

let minaBoard    = [];
let minaRows     = 0;
let minaCols     = 0;
let minaMines    = 0;
let minaRevealed = 0;
let minaFlags    = 0;
let minaOver     = false;
let minaFirst    = true; // primeira clique gera minas depois — garante segurança

function startMina() {
  if(vitals.energia < 10) { showBubble('Cansado demais... 😴'); ModalManager.close('minaModal'); return; }

  const d   = miniDifficulty();
  const cfg = MINA_CONFIGS[d.tier];
  minaRows     = cfg.rows;
  minaCols     = cfg.cols;
  minaMines    = cfg.mines;
  minaRevealed = 0;
  minaFlags    = 0;
  minaOver     = false;
  minaFirst    = true;

  // Tabuleiro vazio
  minaBoard = Array.from({ length: minaRows }, () =>
    Array.from({ length: minaCols }, () => ({ mine:false, revealed:false, flagged:false, adj:0 }))
  );

  document.getElementById('minaResult').textContent  = '';
  document.getElementById('minaResult').className    = 'mini-result-box';
  document.getElementById('minaReward').textContent  = '';
  document.getElementById('minaAgainBtn').style.display = 'none';
  document.getElementById('minaInfo').textContent    = `${d.label} · ${minaRows}×${minaCols} · 💣 ${minaMines}`;
  document.getElementById('minaFlags').textContent   = `🚩 ${minaMines} restantes`;

  minaRender();
}

function minaPlaceMines(safeRow, safeCol) {
  // Gera minas evitando a primeira casa e seus vizinhos
  const safe = new Set();
  for(let dr = -1; dr <= 1; dr++)
    for(let dc = -1; dc <= 1; dc++) {
      const r = safeRow + dr, c = safeCol + dc;
      if(r >= 0 && r < minaRows && c >= 0 && c < minaCols)
        safe.add(r * minaCols + c);
    }

  const candidates = [];
  for(let r = 0; r < minaRows; r++)
    for(let c = 0; c < minaCols; c++)
      if(!safe.has(r * minaCols + c)) candidates.push([r, c]);

  // Fisher-Yates shuffle
  for(let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  candidates.slice(0, minaMines).forEach(([r, c]) => { minaBoard[r][c].mine = true; });

  // Calcula adjacências
  for(let r = 0; r < minaRows; r++)
    for(let c = 0; c < minaCols; c++) {
      if(minaBoard[r][c].mine) continue;
      let count = 0;
      for(let dr = -1; dr <= 1; dr++)
        for(let dc = -1; dc <= 1; dc++) {
          const nr = r+dr, nc = c+dc;
          if(nr >= 0 && nr < minaRows && nc >= 0 && nc < minaCols && minaBoard[nr][nc].mine) count++;
        }
      minaBoard[r][c].adj = count;
    }
}

function minaRender() {
  const grid = document.getElementById('minaGrid');
  if(!grid) return;

  const cellSize = minaCols <= 7 ? 28 : minaCols <= 9 ? 24 : minaCols <= 11 ? 20 : 17;
  grid.style.gridTemplateColumns = `repeat(${minaCols}, ${cellSize}px)`;

  let html = '';
  for(let r = 0; r < minaRows; r++) {
    for(let c = 0; c < minaCols; c++) {
      const cell = minaBoard[r][c];
      let cls = 'mina-cell';
      let content = '';

      if(cell.revealed) {
        cls += ' mina-revealed';
        if(cell.mine) {
          cls += ' mina-exploded';
          content = '💥';
        } else if(cell.adj > 0) {
          cls += ` mina-adj-${cell.adj}`;
          content = cell.adj;
        }
      } else if(cell.flagged) {
        cls += ' mina-flagged';
        content = '🚩';
      } else {
        cls += ' mina-hidden';
      }

      const sz = `width:${cellSize}px;height:${cellSize}px;font-size:${cellSize <= 20 ? 9 : 11}px;`;
      html += `<button class="${cls}" style="${sz}"
        onclick="minaClick(${r},${c})"
        oncontextmenu="minaFlag(event,${r},${c})">${content}</button>`;
    }
  }
  grid.innerHTML = html;

  const flagsEl = document.getElementById('minaFlags');
  if(flagsEl) flagsEl.textContent = `🚩 ${minaMines - minaFlags} restantes`;
}

function minaClick(r, c) {
  if(minaOver) return;
  const cell = minaBoard[r][c];
  if(cell.revealed || cell.flagged) return;

  if(minaFirst) {
    minaFirst = false;
    minaPlaceMines(r, c);
  }

  if(cell.mine) {
    cell.revealed = true;
    minaOver = true;
    playSound('mine_explode');
    // Revela todas as minas
    for(let i = 0; i < minaRows; i++)
      for(let j = 0; j < minaCols; j++)
        if(minaBoard[i][j].mine) minaBoard[i][j].revealed = true;
    minaRender();
    minaGameOver();
    return;
  }

  playSound('mine_click');
  minaReveal(r, c);
  minaRender();

  const totalSafe = minaRows * minaCols - minaMines;
  if(minaRevealed >= totalSafe) {
    minaOver = true;
    minaVictory();
  }
}

function minaReveal(r, c) {
  if(r < 0 || r >= minaRows || c < 0 || c >= minaCols) return;
  const cell = minaBoard[r][c];
  if(cell.revealed || cell.flagged || cell.mine) return;
  cell.revealed = true;
  minaRevealed++;

  // Flood fill em casas vazias
  if(cell.adj === 0) {
    for(let dr = -1; dr <= 1; dr++)
      for(let dc = -1; dc <= 1; dc++)
        if(dr !== 0 || dc !== 0) minaReveal(r+dr, c+dc);
  }
}

function minaFlag(e, r, c) {
  e.preventDefault();
  if(minaOver) return;
  const cell = minaBoard[r][c];
  if(cell.revealed) return;
  playSound('mine_flag');
  if(cell.flagged) {
    cell.flagged = false;
    minaFlags--;
  } else {
    if(minaFlags >= minaMines) return;
    cell.flagged = true;
    minaFlags++;
  }
  minaRender();
}

function minaVictory() {
  playSound('win');
  const d          = miniDifficulty();
  const totalSafe  = minaRows * minaCols - minaMines;
  // Moedas: proporcional às casas reveladas (=100%) + bônus limpeza +60%
  const coinMult   = 1.0 + 0.6;
  // XP: escala com dificuldade
  const xpMult     = d.tier === 0 ? 1.2 : d.tier === 1 ? 1.5 : d.tier === 2 ? 1.8 : 2.0;
  const humorGain  = d.tier === 0 ? 15  : d.tier === 1 ? 20  : d.tier === 2 ? 25  : 30;
  vitals.humor = Math.min(100, vitals.humor + humorGain);
  applyGameCost();
  const r = miniReward(xpMult, coinMult, 3, true);
  const label = d.tier >= 3 ? '🌟 CAMPO LIMPO!' : d.tier >= 2 ? '💎 CAMPO LIMPO!' : '✅ CAMPO LIMPO!';
  document.getElementById('minaResult').textContent = label;
  document.getElementById('minaResult').className   = 'mini-result-box win';
  document.getElementById('minaReward').textContent = `+${humorGain} 😊  +${r.xpGain} XP  +${r.coinGain} 🪙 (bônus limpeza!)`;
  document.getElementById('minaAgainBtn').style.display = 'inline-block';
  showBubble(d.tier >= 2 ? 'Limpou o campo! 💎' : 'Sobreviveu! ✅');
  addLog(`Campo Minado: VITÓRIA! +${r.xpGain}XP +${r.coinGain}🪙`, 'good');
}

function minaGameOver() {
  const totalSafe = minaRows * minaCols - minaMines;
  const frac      = totalSafe > 0 ? minaRevealed / totalSafe : 0;
  vitals.humor = Math.min(100, vitals.humor + 5);
  applyGameCost();

  // Moedas e XP proporcionais às casas reveladas, sem bônus de limpeza
  const rewardText = [];
  if(frac >= 0.05) {
    const coinMult = frac * 0.9;
    const xpMult   = frac * 0.7;
    const r = miniReward(xpMult, coinMult, 1);
    if(r.xpGain > 0)   rewardText.push(`+${r.xpGain} XP`);
    if(r.coinGain > 0) rewardText.push(`+${r.coinGain} 🪙`);
  } else {
    scheduleSave();
  }

  const pct = Math.round(frac * 100);
  document.getElementById('minaResult').textContent = `💥 BOOM! (${pct}% revelado)`;
  document.getElementById('minaResult').className   = 'mini-result-box lose';
  document.getElementById('minaReward').textContent = rewardText.join('  ');
  document.getElementById('minaAgainBtn').style.display = 'inline-block';
  showBubble('BOOM! 💥');
  addLog(`Campo Minado: Explodiu! ${pct}% limpo`, 'bad');
}
