// ═══════════════════════════════════════════════════════════════════
// LABIRINTO ELEMENTAL
// Navegação com fog of war, armadilhas, perseguidor e saídas múltiplas
// ═══════════════════════════════════════════════════════════════════

// Paredes por bitmask: N=1, E=2, S=4, W=8
const MZ_N = 1, MZ_E = 2, MZ_S = 4, MZ_W = 8;
const MZ_OPP = { 1:4, 2:8, 4:1, 8:2 };
const MZ_DX  = { 1:0, 2:1, 4:0, 8:-1 };
const MZ_DY  = { 1:-1, 2:0, 4:1, 8:0 };

// ── Estado ─────────────────────────────────────────────────────────
let _mzCells    = []; // [{walls, trap, explored}]
let _mzCols     = 11;
let _mzRows     = 11;
let _mzPx       = 0;  // posição do jogador
let _mzPy       = 0;
let _mzExits    = []; // [{x,y,gold}]
let _mzRunning  = false;
let _mzOver     = false;
let _mzWon      = false;
let _mzGold     = false;
let _mzTier     = 0;
let _mzCoinCells       = new Set(); // índices das células com moeda
let _mzCoinsCollected  = 0;
let _mzCoinTotal       = 0;
let _mzSecs     = 120;
let _mzTimerInt = null;
let _mzVisionR  = 3;
let _mzElColor  = '#86efac';
let _mzElRgb    = '134,239,172';

// Perseguidor
let _mzPurX     = -1;
let _mzPurY     = -1;
let _mzPurPath  = []; // caminho BFS pré-calculado
let _mzPurInt   = null;

// Movimento
let _mzCurDir   = 0;
let _mzMoveInt  = null;

// Efeitos visuais
let _mzTrapTime   = 0;   // última armadilha (ms)
let _mzMsg        = '';  // mensagem overlay
let _mzMsgTime    = 0;

function _mzIdx(x, y)  { return y * _mzCols + x; }
function _mzCell(x, y) { return _mzCells[_mzIdx(x, y)]; }

// ── Iniciar ────────────────────────────────────────────────────────
function startLabirinto() {
  if(vitals.energia < 10) {
    showBubble('Cansado demais... 😴');
    ModalManager.close('mazeModal');
    return;
  }

  const d    = miniDifficulty();
  _mzTier    = d.tier;
  _mzCols    = [11, 13, 15, 17][d.tier];
  _mzRows    = _mzCols;
  _mzSecs    = [120, 90, 75, 60][d.tier];
  _mzVisionR = [3, 2, 2, 1][d.tier];

  const EL = {
    'Fogo':         ['#f87171','239,113,113'],
    'Água':         ['#60a5fa','96,165,250'],
    'Terra':        ['#86efac','134,239,172'],
    'Vento':        ['#fbbf24','251,191,36'],
    'Eletricidade': ['#a78bfa','167,139,250'],
    'Luz':          ['#67e8f9','103,232,249'],
    'Sombra':       ['#c084fc','192,132,252'],
    'Void':         ['#34d399','52,211,153'],
    'Aether':       ['#fde68a','253,230,138'],
  };
  const ec   = (avatar && EL[avatar.elemento]) || EL['Terra'];
  _mzElColor = ec[0];
  _mzElRgb   = ec[1];

  _mzPx = 0; _mzPy = 0;
  _mzWon  = false;
  _mzOver = false;
  _mzGold = false;
  _mzCurDir = 0;
  _mzPurX = -1; _mzPurY = -1;
  _mzPurPath = [];
  _mzTrapTime = 0;
  _mzMsg = ''; _mzMsgTime = 0;
  _mzCoinCells      = new Set();
  _mzCoinsCollected = 0;

  _mzGenerate();
  _mzPlaceExits();
  _mzPlaceTraps();
  _mzPlaceCoins();
  _mzRevealAround(_mzPx, _mzPy);

  clearInterval(_mzPurInt);
  _mzPurInt = null;

  _mzUpdateCoinDisplay();

  _mzSetTimer(_mzSecs);

  const result = document.getElementById('mazeResult');
  if(result) { result.textContent = ''; result.className = 'mini-result-box'; }
  const reward = document.getElementById('mazeReward');
  if(reward) reward.textContent = '';
  const again = document.getElementById('mazeAgainBtn');
  if(again) again.style.display = 'none';

  clearInterval(_mzTimerInt);
  _mzTimerInt = setInterval(_mzTimerTick, 1000);

  clearInterval(_mzMoveInt);
  _mzMoveInt = setInterval(_mzTryMove, 160);

  // Sincroniza buffer com tamanho CSS real para evitar upscaling no desktop
  const _mzCv = document.getElementById('mazeCanvas');
  if(_mzCv) {
    const _mzSz = _mzCv.offsetWidth || 280;
    _mzCv.width  = _mzSz;
    _mzCv.height = _mzSz;
  }

  _mzRunning = true;
}

// ── Geração do labirinto (DFS iterativo) ───────────────────────────
function _mzGenerate() {
  const n = _mzCols * _mzRows;
  _mzCells = Array.from({length: n}, () => ({
    walls: MZ_N | MZ_E | MZ_S | MZ_W,
    trap: false,
    explored: false,
  }));

  const visited = new Uint8Array(n);
  const stack   = [0];
  visited[0]    = 1;

  while(stack.length) {
    const ci = stack[stack.length - 1];
    const cx = ci % _mzCols, cy = Math.floor(ci / _mzCols);

    // Vizinhos não visitados em ordem aleatória
    const dirs = _mzShuf([MZ_N, MZ_E, MZ_S, MZ_W]);
    let moved = false;
    for(const dir of dirs) {
      const nx = cx + MZ_DX[dir];
      const ny = cy + MZ_DY[dir];
      if(nx < 0 || nx >= _mzCols || ny < 0 || ny >= _mzRows) continue;
      const ni = ny * _mzCols + nx;
      if(visited[ni]) continue;

      // Abre passagem entre ci e ni
      _mzCells[ci].walls &= ~dir;
      _mzCells[ni].walls &= ~MZ_OPP[dir];
      visited[ni] = 1;
      stack.push(ni);
      moved = true;
      break;
    }
    if(!moved) stack.pop();
  }
}

// ── Posicionar saídas ──────────────────────────────────────────────
function _mzPlaceExits() {
  _mzExits = [];
  const cols = _mzCols, rows = _mzRows;

  // Saída normal: canto inferior direito — abre parede leste
  _mzExits.push({ x: cols - 1, y: rows - 1, gold: false });
  _mzCells[_mzIdx(cols - 1, rows - 1)].walls &= ~MZ_S; // parede sul aberta = saída

  // Saída ouro (hard+): canto superior direito
  if(_mzTier >= 2) {
    _mzExits.push({ x: cols - 1, y: 0, gold: true });
    _mzCells[_mzIdx(cols - 1, 0)].walls &= ~MZ_N; // parede norte aberta = saída
  }
}

// ── Posicionar armadilhas ──────────────────────────────────────────
function _mzPlaceTraps() {
  if(_mzTier < 1) return;
  const ratio = [0, 0.04, 0.06, 0.08][_mzTier];
  const n     = _mzCols * _mzRows;
  const safe  = new Set();
  safe.add(_mzIdx(0, 0));
  _mzExits.forEach(e => {
    // Protege a saída e vizinhos
    for(let dy = -2; dy <= 2; dy++) {
      for(let dx = -2; dx <= 2; dx++) {
        const nx = e.x + dx, ny = e.y + dy;
        if(nx >= 0 && nx < _mzCols && ny >= 0 && ny < _mzRows) safe.add(_mzIdx(nx, ny));
      }
    }
  });
  // Protege área inicial
  for(let dy = 0; dy <= 2; dy++) for(let dx = 0; dx <= 2; dx++) safe.add(_mzIdx(dx, dy));

  const candidates = [];
  for(let i = 0; i < n; i++) if(!safe.has(i)) candidates.push(i);
  _mzShuf(candidates);
  const count = Math.floor(candidates.length * ratio);
  for(let i = 0; i < count; i++) _mzCells[candidates[i]].trap = true;
}

// ── Espalhar moedas ────────────────────────────────────────────────
function _mzPlaceCoins() {
  const counts = [8, 12, 16, 20];
  _mzCoinTotal = counts[_mzTier];

  // Células protegidas: início, perto das saídas
  const safe = new Set();
  for(let dy = 0; dy <= 2; dy++) for(let dx = 0; dx <= 2; dx++) safe.add(_mzIdx(dx, dy));
  _mzExits.forEach(e => {
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++) {
      const nx = e.x + dx, ny = e.y + dy;
      if(nx >= 0 && nx < _mzCols && ny >= 0 && ny < _mzRows) safe.add(_mzIdx(nx, ny));
    }
  });

  const candidates = [];
  for(let i = 0; i < _mzCols * _mzRows; i++) {
    if(!safe.has(i) && !_mzCells[i].trap) candidates.push(i);
  }
  _mzShuf(candidates);
  for(let i = 0; i < Math.min(_mzCoinTotal, candidates.length); i++) {
    _mzCoinCells.add(candidates[i]);
  }
}

// ── Atualizar contador de moedas ───────────────────────────────────
function _mzUpdateCoinDisplay() {
  const el = document.getElementById('mazeInfo');
  if(!el) return;
  const lbl = ['FÁCIL','MÉDIO','DIFÍCIL','MESTRE'][_mzTier];
  el.textContent = `${lbl} · 🪙 ${_mzCoinsCollected}/${_mzCoinTotal} moedas`;
}

// ── BFS — caminho mais curto respeitando paredes ───────────────────
function _mzBFS(fromX, fromY) {
  const n    = _mzCols * _mzRows;
  const dist = new Int32Array(n).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const q    = [_mzIdx(fromX, fromY)];
  dist[q[0]] = 0;

  while(q.length) {
    const ci = q.shift();
    const cx = ci % _mzCols, cy = Math.floor(ci / _mzCols);
    for(const dir of [MZ_N, MZ_E, MZ_S, MZ_W]) {
      if(_mzCells[ci].walls & dir) continue;
      const nx = cx + MZ_DX[dir], ny = cy + MZ_DY[dir];
      if(nx < 0 || nx >= _mzCols || ny < 0 || ny >= _mzRows) continue;
      const ni = _mzIdx(nx, ny);
      if(dist[ni] !== -1) continue;
      dist[ni] = dist[ci] + 1;
      prev[ni] = ci;
      q.push(ni);
    }
  }
  return { dist, prev };
}

// Próximo passo do perseguidor em direção a (tx,ty)
function _mzNextStep(fromX, fromY, toX, toY) {
  const bfs = _mzBFS(toX, toY); // BFS a partir do alvo
  const ci  = _mzIdx(fromX, fromY);
  let best = -1, bestD = Infinity;

  for(const dir of [MZ_N, MZ_E, MZ_S, MZ_W]) {
    if(_mzCells[ci].walls & dir) continue;
    const nx = fromX + MZ_DX[dir], ny = fromY + MZ_DY[dir];
    if(nx < 0 || nx >= _mzCols || ny < 0 || ny >= _mzRows) continue;
    const d = bfs.dist[_mzIdx(nx, ny)];
    if(d !== -1 && d < bestD) { bestD = d; best = _mzIdx(nx, ny); }
  }

  return best === -1 ? null : { x: best % _mzCols, y: Math.floor(best / _mzCols) };
}

// ── Perseguidor ────────────────────────────────────────────────────
function _mzPursuerStep() {
  if(!_mzRunning || _mzOver) return;
  if(_mzPurX === -1) return;

  const next = _mzNextStep(_mzPurX, _mzPurY, _mzPx, _mzPy);
  if(!next) return;
  _mzPurX = next.x;
  _mzPurY = next.y;

  // Apanhado!
  if(_mzPurX === _mzPx && _mzPurY === _mzPy) {
    _mzShowMsg('👁 APANHADO!');
    setTimeout(() => _mzEnd(false, 'caught'), 300);
  }
}

// ── Movimento do jogador ───────────────────────────────────────────
function _mzTryMove() {
  if(!_mzRunning || _mzOver || !_mzCurDir) return;

  const cell = _mzCell(_mzPx, _mzPy);
  if(cell.walls & _mzCurDir) return; // parede

  const nx = _mzPx + MZ_DX[_mzCurDir];
  const ny = _mzPy + MZ_DY[_mzCurDir];
  if(nx < 0 || nx >= _mzCols || ny < 0 || ny >= _mzRows) return;

  _mzPx = nx; _mzPy = ny;
  _mzRevealAround(_mzPx, _mzPy);

  // Armadilha
  const nc = _mzCell(_mzPx, _mzPy);
  if(nc.trap) {
    nc.trap = false;
    _mzSecs = Math.max(3, _mzSecs - 4);
    _mzSetTimer(_mzSecs);
    _mzTrapTime = performance.now();
    _mzShowMsg('⚠ ARMADILHA! −4s');
    if(typeof playSound === 'function') playSound('lose');
  }

  // Moeda
  const ci = _mzIdx(_mzPx, _mzPy);
  if(_mzCoinCells.has(ci)) {
    _mzCoinCells.delete(ci);
    _mzCoinsCollected++;
    _mzUpdateCoinDisplay();
    if(typeof playSound === 'function') playSound('feed');
  }

  // Verificar saídas
  for(const exit of _mzExits) {
    if(_mzPx === exit.x && _mzPy === exit.y) {
      // Verificar se chegou pela abertura correta
      const onExit = (exit.y === _mzRows - 1 && !(_mzCell(exit.x, exit.y).walls & MZ_S))
                  || (exit.y === 0            && !(_mzCell(exit.x, exit.y).walls & MZ_N));
      if(onExit) {
        _mzGold = exit.gold;
        setTimeout(() => _mzEnd(true), 200);
        return;
      }
    }
  }

  // Perseguidor apanha após movimento
  if(_mzPurX === _mzPx && _mzPurY === _mzPy) {
    _mzShowMsg('👁 APANHADO!');
    setTimeout(() => _mzEnd(false, 'caught'), 300);
  }
}

function _mzRevealAround(px, py) {
  const r = _mzVisionR + 1;
  for(let dy = -r; dy <= r; dy++) {
    for(let dx = -r; dx <= r; dx++) {
      const nx = px + dx, ny = py + dy;
      if(nx < 0 || nx >= _mzCols || ny < 0 || ny >= _mzRows) continue;
      if(Math.max(Math.abs(dx), Math.abs(dy)) <= _mzVisionR) {
        _mzCell(nx, ny).explored = true;
      }
    }
  }
}

// ── Timer ──────────────────────────────────────────────────────────
function _mzTimerTick() {
  if(!_mzRunning || _mzOver) return;
  _mzSecs--;
  _mzSetTimer(_mzSecs);
  if(_mzSecs <= 0) _mzEnd(false, 'timeout');
}

function _mzSetTimer(s) {
  const el = document.getElementById('mazeTimer');
  if(!el) return;
  el.textContent = `⏱ ${s}s`;
  el.style.color = s <= 10 ? '#f87171' : s <= 25 ? '#fbbf24' : '#86efac';
}

function _mzShowMsg(msg) {
  _mzMsg     = msg;
  _mzMsgTime = performance.now();
}

// ── Fim de jogo ────────────────────────────────────────────────────
function _mzEnd(won, reason) {
  clearInterval(_mzTimerInt);
  clearInterval(_mzMoveInt);
  clearInterval(_mzPurInt);
  _mzRunning = false;
  _mzOver    = true;
  _mzWon     = won;
  _mzCurDir  = 0;

  const maxSecs = [120, 90, 75, 60][_mzTier];
  const timeFrac = Math.min(1, _mzSecs / maxSecs);
  const goldMult = _mzGold ? 1.5 : 1.0;
  const frac     = won ? (0.45 + timeFrac * 0.55) * goldMult : 0;

  const result = document.getElementById('mazeResult');
  const reward = document.getElementById('mazeReward');
  const again  = document.getElementById('mazeAgainBtn');

  // Moedas coletadas: valor por dificuldade ×  quantidade encontrada
  const coinValues   = [3, 4, 7, 9];
  const coinPerPiece = coinValues[_mzTier];
  const coinReward   = _mzCoinsCollected * coinPerPiece;

  applyGameCost();

  if(!won) {
    if(typeof playSound === 'function') playSound('lose');
    const msg = reason === 'caught' ? '👁 APANHADO!' : '⏰ TEMPO ESGOTADO';
    if(result) { result.textContent = msg; result.className = 'mini-result-box lose'; }
    if(coinReward > 0) {
      earnCoins(coinReward);
      if(reward) reward.textContent = `🪙 ${_mzCoinsCollected} moeda${_mzCoinsCollected !== 1 ? 's' : ''} (+${coinReward} 🪙)`;
    } else {
      if(reward) reward.textContent = '';
    }
  } else {
    if(typeof playSound === 'function') playSound('win');
    const r = miniReward(Math.min(2, frac * 1.8), 0, 3); // XP e vínculo; moedas vêm das moedas coletadas
    earnCoins(coinReward);
    const exitLbl = _mzGold ? '⚡ SAÍDA DOURADA!' : '🚪 SAÍDA ENCONTRADA!';
    if(result) { result.textContent = exitLbl; result.className = 'mini-result-box win'; }
    if(reward) reward.textContent = `+${r.xpGain} XP · 🪙 ${_mzCoinsCollected}/${_mzCoinTotal} (+${coinReward} 🪙)`;
    vitals.humor = Math.min(100, vitals.humor + Math.round(12 * frac));
    scheduleSave();
  }

  if(again) again.style.display = 'inline-block';
}

// ── Controles: teclado ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if(!_mzRunning) return;
  const MAP = {
    ArrowUp: MZ_N, ArrowDown: MZ_S, ArrowLeft: MZ_W, ArrowRight: MZ_E,
    w: MZ_N, s: MZ_S, a: MZ_W, d: MZ_E,
    W: MZ_N, S: MZ_S, A: MZ_W, D: MZ_E,
  };
  const dir = MAP[e.key];
  if(dir) { e.preventDefault(); _mzCurDir = dir; }
});
document.addEventListener('keyup', e => {
  const MAP = {
    ArrowUp: MZ_N, ArrowDown: MZ_S, ArrowLeft: MZ_W, ArrowRight: MZ_E,
    w: MZ_N, s: MZ_S, a: MZ_W, d: MZ_E,
    W: MZ_N, S: MZ_S, A: MZ_W, D: MZ_E,
  };
  if(MAP[e.key] === _mzCurDir) _mzCurDir = 0;
});

// D-pad (mobile)
function mazeDpad(dir) {
  if(!_mzRunning) return;
  _mzCurDir = dir;
}
function mazeDpadRelease(dir) {
  if(_mzCurDir === dir) _mzCurDir = 0;
}

// Touch swipe no canvas
(function _mzAttachTouch() {
  function attach() {
    const canvas = document.getElementById('mazeCanvas');
    if(!canvas) return;
    let tx = null, ty = null;
    canvas.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      if(tx === null) return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      tx = null; ty = null;
      if(Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      if(Math.abs(dx) > Math.abs(dy))
        _mzCurDir = dx > 0 ? MZ_E : MZ_W;
      else
        _mzCurDir = dy > 0 ? MZ_S : MZ_N;
      // Auto-release após 1 passo
      setTimeout(() => { _mzCurDir = 0; }, 200);
    }, { passive: true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();

// ── Render ─────────────────────────────────────────────────────────
function _mzRender() {
  const canvas = document.getElementById('mazeCanvas');
  if(!canvas || !_mzCells.length) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width, H = canvas.height;
  const cs  = Math.floor(W / _mzCols);
  const hw  = Math.max(1, Math.round(cs * 0.10)); // half-wall
  const offX = Math.floor((W - cs * _mzCols) / 2);
  const offY = Math.floor((H - cs * _mzRows) / 2);
  const now = performance.now();

  // Fundo
  ctx.fillStyle = '#040310';
  ctx.fillRect(0, 0, W, H);

  // ── Células ──
  for(let y = 0; y < _mzRows; y++) {
    for(let x = 0; x < _mzCols; x++) {
      const cell  = _mzCell(x, y);
      const ddx   = Math.abs(x - _mzPx), ddy = Math.abs(y - _mzPy);
      const dist  = Math.max(ddx, ddy);
      const lit   = dist <= _mzVisionR;
      const pen   = dist === _mzVisionR + 1;

      if(lit) cell.explored = true;
      if(!lit && !pen && !cell.explored) continue;

      const br = lit ? 1.0 : pen ? 0.45 : 0.18;
      _mzDrawFloor(ctx, x, y, cs, hw, offX, offY, br, cell);
    }
  }

  // ── Saídas ──
  for(const exit of _mzExits) {
    const cell = _mzCell(exit.x, exit.y);
    if(!cell.explored) continue;
    const px = offX + exit.x * cs, py = offY + exit.y * cs;
    const pulse = 0.55 + 0.45 * Math.sin(now / 320);
    const color = exit.gold ? `rgba(253,230,138,${pulse.toFixed(2)})` : `rgba(134,239,172,${pulse.toFixed(2)})`;
    // Glow na célula
    ctx.fillStyle = exit.gold ? 'rgba(253,230,138,0.12)' : 'rgba(134,239,172,0.08)';
    ctx.fillRect(px + hw, py + hw, cs - 2*hw, cs - 2*hw);
    // Portal na borda correta
    const cx = px + cs * 0.5, cy = py + cs * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth   = Math.max(2, cs * 0.12);
    ctx.lineCap     = 'round';
    ctx.shadowColor = exit.gold ? '#fde68a' : '#86efac';
    ctx.shadowBlur  = 12;
    // Linha da saída (N ou S)
    if(exit.y === 0) { ctx.beginPath(); ctx.moveTo(px + hw + 1, py); ctx.lineTo(px + cs - hw - 1, py); ctx.stroke(); }
    else             { ctx.beginPath(); ctx.moveTo(px + hw + 1, py + cs); ctx.lineTo(px + cs - hw - 1, py + cs); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // Seta indicativa
    ctx.fillStyle = color;
    ctx.font      = `${Math.round(cs * 0.38)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(exit.gold ? '⚡' : '🚪', cx, cy);
  }

  // ── Armadilhas (visíveis apenas nas células exploradas) ──
  for(let y = 0; y < _mzRows; y++) {
    for(let x = 0; x < _mzCols; x++) {
      const cell = _mzCell(x, y);
      if(!cell.trap || !cell.explored) continue;
      const ddx = Math.abs(x - _mzPx), ddy = Math.abs(y - _mzPy);
      if(Math.max(ddx, ddy) > _mzVisionR + 1) continue;
      const px = offX + x * cs, py = offY + y * cs;
      const cx = px + cs * 0.5, cy = py + cs * 0.5;
      const r  = cs * 0.22;
      ctx.strokeStyle = 'rgba(248,113,113,0.55)';
      ctx.lineWidth   = Math.max(1, cs * 0.08);
      ctx.lineCap     = 'round';
      ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
    }
  }

  // ── Moedas ──
  for(const idx of _mzCoinCells) {
    const cx2 = idx % _mzCols, cy2 = Math.floor(idx / _mzCols);
    const cell = _mzCells[idx];
    if(!cell.explored) continue;
    const ddx2 = Math.abs(cx2 - _mzPx), ddy2 = Math.abs(cy2 - _mzPy);
    if(Math.max(ddx2, ddy2) > _mzVisionR + 1) continue;
    const cpx  = offX + cx2 * cs + cs * 0.5;
    const cpy  = offY + cy2 * cs + cs * 0.5;
    const cr   = cs * 0.20;
    const pulse = 0.65 + 0.35 * Math.sin(now / 350 + idx);
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur  = 7 * pulse;
    ctx.fillStyle   = `hsl(43,96%,${Math.round(55 + 15 * pulse)}%)`;
    ctx.beginPath(); ctx.arc(cpx, cpy, cr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    // Brilho interno
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(cpx - cr * 0.28, cpy - cr * 0.30, cr * 0.32, 0, Math.PI * 2); ctx.fill();
  }

  // ── Perseguidor ──
  if(_mzPurX >= 0) {
    const ddx = Math.abs(_mzPurX - _mzPx), ddy = Math.abs(_mzPurY - _mzPy);
    const dist = Math.max(ddx, ddy);
    if(dist <= _mzVisionR + 2 || _mzCell(_mzPurX, _mzPurY).explored) {
      const px  = offX + _mzPurX * cs + cs * 0.5;
      const py  = offY + _mzPurY * cs + cs * 0.5;
      const r   = cs * 0.30;
      const p   = 0.5 + 0.5 * Math.sin(now / 180);
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur  = 14 + 8 * p;
      ctx.fillStyle   = `rgba(220,40,40,${0.75 + 0.25 * p})`;
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      // Olhos
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#fff';
      const eo = r * 0.28;
      ctx.beginPath(); ctx.arc(px - eo, py - eo * 0.4, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + eo, py - eo * 0.4, r * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(px - eo + 1, py - eo * 0.4, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + eo + 1, py - eo * 0.4, r * 0.09, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── Jogador ──
  {
    const px  = offX + _mzPx * cs + cs * 0.5;
    const py  = offY + _mzPy * cs + cs * 0.5;
    const r   = cs * 0.27;
    ctx.shadowColor = _mzElColor;
    ctx.shadowBlur  = 18;
    ctx.fillStyle   = _mzElColor;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;
    // Brilho interno
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(px - r * 0.22, py - r * 0.28, r * 0.28, 0, Math.PI * 2); ctx.fill();
  }

  // ── Flash de armadilha ──
  if(_mzTrapTime > 0) {
    const t = (now - _mzTrapTime) / 500;
    if(t < 1) {
      ctx.fillStyle = `rgba(248,113,113,${(0.30 * (1 - t)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    } else { _mzTrapTime = 0; }
  }

  // ── Mensagem overlay ──
  if(_mzMsg && _mzMsgTime > 0) {
    const t = (now - _mzMsgTime) / 1200;
    if(t < 1) {
      ctx.globalAlpha = Math.min(1, (1 - t) * 2.5);
      ctx.fillStyle   = '#fde68a';
      ctx.font        = `bold ${Math.round(W * 0.07)}px 'Cinzel', serif`;
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur  = 6;
      ctx.fillText(_mzMsg, W / 2, H / 2);
      ctx.shadowBlur  = 0;
      ctx.globalAlpha = 1;
    } else { _mzMsg = ''; _mzMsgTime = 0; }
  }

  // ── Venceu: pulso na tela ──
  if(_mzWon) {
    const p = 0.07 + 0.05 * Math.sin(now / 180);
    ctx.fillStyle = `rgba(${_mzElRgb},${p.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── Desenhar piso e passagens de uma célula ────────────────────────
function _mzDrawFloor(ctx, x, y, cs, hw, offX, offY, br, cell) {
  const px = offX + x * cs;
  const py = offY + y * cs;
  const floorC = br > 0.7 ? '#1e1840' : br > 0.3 ? '#14102e' : '#0c0922';

  ctx.globalAlpha = br;
  ctx.fillStyle   = floorC;

  // Piso da célula
  ctx.fillRect(px + hw, py + hw, cs - 2*hw, cs - 2*hw);

  // Passagem Leste
  if(!(cell.walls & MZ_E) && x < _mzCols - 1) {
    ctx.fillRect(px + cs - hw, py + hw, hw * 2, cs - 2*hw);
  }
  // Passagem Sul
  if(!(cell.walls & MZ_S) && y < _mzRows - 1) {
    ctx.fillRect(px + hw, py + cs - hw, cs - 2*hw, hw * 2);
  }

  ctx.globalAlpha = 1;
}

// ── RAF loop ───────────────────────────────────────────────────────
(function _mzLoop() {
  if(_mzRunning || _mzOver || _mzCells.length > 0) _mzRender();
  requestAnimationFrame(_mzLoop);
})();

// ── Util ───────────────────────────────────────────────────────────
function _mzShuf(arr) {
  for(let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
