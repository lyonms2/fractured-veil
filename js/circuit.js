// ═══════════════════════════════════════════════════════════════════
// CIRCUITO ELEMENTAL — Puzzle de rotação de peças
// Conecte a fonte (⚡) ao receptor (◎) girando as peças do circuito.
// Energia flui parcialmente à medida que conexões são feitas.
// ═══════════════════════════════════════════════════════════════════

// Bitmask de direções: N=1, E=2, S=4, W=8
const CN = 1, CE = 2, CS = 4, CW = 8;
const C_OPP = { 1: 4, 2: 8, 4: 1, 8: 2 }; // oposto de cada bit

// Tipo de peça → conexões base (rot=0)
const C_BASE = {
  dead:     CN,                    // 1 conexão: N
  straight: CN | CS,               // 2 opostas: N+S
  corner:   CN | CE,               // 2 adjacentes: N+E (└)
  tee:      CN | CE | CS,          // 3 conexões: N+E+S (├)
  cross:    CN | CE | CS | CW,     // 4 conexões: +
};

function _cRotCW(bits) { return ((bits << 1) | (bits >> 3)) & 0xF; }
function _cPopcount(b) { return [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4][b & 0xF]; }

function _cConn(type, rot) {
  let b = C_BASE[type];
  for(let i = 0; i < (rot & 3); i++) b = _cRotCW(b);
  return b;
}

// Dado um bitmask de conexões necessárias, retorna {type, rot}
function _cTypeRot(bits) {
  const n = _cPopcount(bits);
  let candidates;
  if(n === 4) return { type: 'cross', rot: 0 };
  else if(n === 3) candidates = ['tee'];
  else if(n === 2) candidates = (bits === 5 || bits === 10) ? ['straight'] : ['corner'];
  else             candidates = ['dead'];
  for(const type of candidates) {
    for(let r = 0; r < 4; r++) {
      if(_cConn(type, r) === bits) return { type, rot: r };
    }
  }
  return { type: 'straight', rot: 0 };
}

function _cShuffle(arr) {
  for(let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Estado do jogo ─────────────────────────────────────────────────
let _cGrid    = []; // [{type, rot, locked, lit}]
let _cCols    = 5;
let _cRows    = 5;
let _cSrcCell = 0;
let _cSnkCell = 0;
let _cRunning = false;
let _cWon     = false;
let _cSecs    = 120;
let _cTimer   = null;
let _cRotAnim = {}; // idx → { start: ms }
let _cElColor = '#86efac';
let _cElRgb   = '134,239,172';

function _cIdx(x, y) { return y * _cCols + x; }
function _cXY(idx)   { return { x: idx % _cCols, y: Math.floor(idx / _cCols) }; }

// ── Iniciar ────────────────────────────────────────────────────────
function startCircuit() {
  if(vitals.energia < 10) {
    showBubble('Cansado demais... 😴');
    ModalManager.close('circuitModal');
    return;
  }

  const d = miniDifficulty();
  _cCols = d.tier === 0 ? 5 : d.tier === 1 ? 6 : d.tier === 2 ? 7 : 8;
  _cRows = _cCols;
  _cSecs = d.tier === 0 ? 120 : d.tier === 1 ? 100 : d.tier === 2 ? 80 : 60;

  // Cor do elemento do avatar
  const EL = {
    'Fogo':          ['#f87171','239,113,113'],
    'Água':          ['#60a5fa','96,165,250'],
    'Terra':         ['#86efac','134,239,172'],
    'Vento':         ['#fbbf24','251,191,36'],
    'Eletricidade':  ['#a78bfa','167,139,250'],
    'Luz':           ['#67e8f9','103,232,249'],
    'Sombra':        ['#c084fc','192,132,252'],
    'Void':          ['#34d399','52,211,153'],
    'Aether':        ['#fde68a','253,230,138'],
  };
  const ec = (avatar && EL[avatar.elemento]) || EL['Terra'];
  _cElColor = ec[0];
  _cElRgb   = ec[1];

  _cWon     = false;
  _cRunning = true;
  _cRotAnim = {};

  _cGenerate(d.tier);
  _cBFS();

  const info = document.getElementById('circuitInfo');
  if(info) info.textContent = `${d.label} · ${_cCols}×${_cRows} · Gire as peças para conectar!`;

  const result = document.getElementById('circuitResult');
  if(result) { result.textContent = ''; result.className = 'mini-result-box'; }
  const reward = document.getElementById('circuitReward');
  if(reward) reward.textContent = '';
  const again = document.getElementById('circuitAgainBtn');
  if(again) again.style.display = 'none';

  clearInterval(_cTimer);
  _cTimer = setInterval(_cTimerTick, 1000);
  _cUpdateTimer();

  applyGameCost();
}

// ── Geração do puzzle ──────────────────────────────────────────────
function _cGenerate(tier) {
  const cols = _cCols, rows = _cRows;
  _cGrid = [];

  const srcRow  = Math.floor(rows * (0.15 + Math.random() * 0.7));
  const sinkRow = Math.floor(rows * (0.15 + Math.random() * 0.7));

  _cSrcCell = _cIdx(0, srcRow);
  _cSnkCell = _cIdx(cols - 1, sinkRow);

  const path = _cFindPath(cols, rows, 0, srcRow, cols - 1, sinkRow);

  const pathSet = new Set(path.map(p => _cIdx(p.x, p.y)));
  const connMap = {}; // idx → bitmask

  for(let i = 0; i < path.length; i++) {
    const curr = path[i];
    const ci   = _cIdx(curr.x, curr.y);
    if(!connMap[ci]) connMap[ci] = 0;

    if(i > 0) {
      const prev = path[i - 1];
      const dx   = curr.x - prev.x, dy = curr.y - prev.y;
      if(dx ===  1) connMap[ci] |= CW;
      if(dx === -1) connMap[ci] |= CE;
      if(dy ===  1) connMap[ci] |= CN;
      if(dy === -1) connMap[ci] |= CS;
    }
    if(i < path.length - 1) {
      const next = path[i + 1];
      const dx   = next.x - curr.x, dy = next.y - curr.y;
      if(dx ===  1) connMap[ci] |= CE;
      if(dx === -1) connMap[ci] |= CW;
      if(dy ===  1) connMap[ci] |= CS;
      if(dy === -1) connMap[ci] |= CN;
    }
  }

  // Source conecta apenas para Leste; Sink apenas para Oeste
  connMap[_cSrcCell] = CE;
  connMap[_cSnkCell] = CW;

  // Peças bloqueadas no caminho (tier >= 1)
  const lockRatio  = tier === 1 ? 0.2 : tier === 2 ? 0.28 : tier >= 3 ? 0.35 : 0;
  const pathInner  = path.slice(1, -1);
  const lockCount  = Math.floor(pathInner.length * lockRatio);
  const toLockedSet = new Set(
    _cShuffle([...pathInner]).slice(0, lockCount).map(p => _cIdx(p.x, p.y))
  );

  for(let y = 0; y < rows; y++) {
    for(let x = 0; x < cols; x++) {
      const idx  = _cIdx(x, y);
      const isSrc = idx === _cSrcCell;
      const isSnk = idx === _cSnkCell;
      let type, rot, locked;

      if(isSrc) {
        // dead apontando Leste (rot=1 → CE)
        type = 'dead'; rot = 1; locked = true;
      } else if(isSnk) {
        // dead apontando Oeste (rot=3 → CW)
        type = 'dead'; rot = 3; locked = true;
      } else if(pathSet.has(idx) && connMap[idx]) {
        const tr = _cTypeRot(connMap[idx]);
        type   = tr.type;
        locked = toLockedSet.has(idx);
        rot    = locked ? tr.rot : (tr.rot + 1 + Math.floor(Math.random() * 3)) % 4;
      } else {
        // célula de preenchimento: peça aleatória
        const fill = ['straight','corner','tee','dead','corner','straight','corner'];
        type   = fill[Math.floor(Math.random() * fill.length)];
        rot    = Math.floor(Math.random() * 4);
        locked = false;
      }

      _cGrid.push({ type, rot, locked, lit: false });
    }
  }
}

// DFS com backtracking para caminho garantido
function _cFindPath(cols, rows, x0, y0, x1, y1) {
  const visited = new Set();
  const path    = [];

  function dfs(x, y) {
    if(x < 0 || x >= cols || y < 0 || y >= rows) return false;
    const key = `${x},${y}`;
    if(visited.has(key)) return false;
    visited.add(key);
    path.push({ x, y });
    if(x === x1 && y === y1) return true;
    for(const { dx, dy } of _cShuffle([{dx:1,dy:0},{dx:0,dy:1},{dx:0,dy:-1},{dx:-1,dy:0}])) {
      if(dfs(x + dx, y + dy)) return true;
    }
    path.pop();
    visited.delete(key);
    return false;
  }

  if(!dfs(x0, y0)) {
    // Fallback: caminho direto horizontal
    for(let x = x0; x <= x1; x++) path.push({ x, y: y0 });
    if(y0 !== y1) {
      const step = y1 > y0 ? 1 : -1;
      for(let y = y0 + step; y !== y1 + step; y += step) path.push({ x: x1, y });
    }
  }

  return path;
}

// ── BFS — propagação de energia ────────────────────────────────────
function _cBFS() {
  const { x: sx, y: sy } = _cXY(_cSrcCell);
  const lit   = new Set([_cSrcCell]);
  const queue = [{ x: sx, y: sy }];

  const DIRS = [
    { bit: CN, dx:  0, dy: -1 },
    { bit: CE, dx:  1, dy:  0 },
    { bit: CS, dx:  0, dy:  1 },
    { bit: CW, dx: -1, dy:  0 },
  ];

  while(queue.length) {
    const { x, y } = queue.shift();
    const myBits   = _cConn(_cGrid[_cIdx(x, y)].type, _cGrid[_cIdx(x, y)].rot);

    for(const { bit, dx, dy } of DIRS) {
      if(!(myBits & bit)) continue;
      const nx = x + dx, ny = y + dy;
      if(nx < 0 || nx >= _cCols || ny < 0 || ny >= _cRows) continue;
      const ni = _cIdx(nx, ny);
      if(lit.has(ni)) continue;
      const nb = _cConn(_cGrid[ni].type, _cGrid[ni].rot);
      if(nb & C_OPP[bit]) {
        lit.add(ni);
        queue.push({ x: nx, y: ny });
      }
    }
  }

  _cGrid.forEach((cell, i) => { cell.lit = lit.has(i); });
  return lit.has(_cSnkCell);
}

// ── Timer ──────────────────────────────────────────────────────────
function _cTimerTick() {
  if(!_cRunning || _cWon) return;
  _cSecs--;
  _cUpdateTimer();
  if(_cSecs <= 0) _cEnd(false);
}

function _cUpdateTimer() {
  const el = document.getElementById('circuitTimer');
  if(!el) return;
  el.textContent = `⏱ ${_cSecs}s`;
  el.style.color = _cSecs <= 15 ? '#f87171' : _cSecs <= 30 ? '#fbbf24' : '#86efac';
}

// ── Clique para girar ──────────────────────────────────────────────
function circuitClick(e) {
  if(!_cRunning || _cWon || !_cGrid.length) return;
  const canvas = document.getElementById('circuitCanvas');
  if(!canvas) return;
  const rect  = canvas.getBoundingClientRect();
  const sx    = canvas.width  / rect.width;
  const sy    = canvas.height / rect.height;
  const mx    = (e.clientX - rect.left) * sx;
  const my    = (e.clientY - rect.top)  * sy;
  const cw    = canvas.width  / _cCols;
  const ch    = canvas.height / _cRows;
  const gx    = Math.floor(mx / cw);
  const gy    = Math.floor(my / ch);
  if(gx < 0 || gx >= _cCols || gy < 0 || gy >= _cRows) return;

  const idx  = _cIdx(gx, gy);
  const cell = _cGrid[idx];
  if(cell.locked) return;

  _cRotAnim[idx] = { start: performance.now() };
  cell.rot = (cell.rot + 1) & 3;

  if(typeof playSound === 'function') playSound('click');

  if(_cBFS() && !_cWon) {
    _cWon = true;
    setTimeout(() => _cEnd(true), 400);
  }
}

// ── Fim de jogo ────────────────────────────────────────────────────
function _cEnd(won) {
  clearInterval(_cTimer);
  _cRunning = false;

  const d         = miniDifficulty();
  const maxSecs   = d.tier === 0 ? 120 : d.tier === 1 ? 100 : d.tier === 2 ? 80 : 60;
  const timeBonus = won ? Math.min(1, _cSecs / maxSecs) : 0;
  const frac      = won ? (0.55 + timeBonus * 0.45) : 0;

  if(!won) {
    if(typeof playSound === 'function') playSound('lose');
    const result = document.getElementById('circuitResult');
    if(result) { result.textContent = '⏰ TEMPO ESGOTADO'; result.className = 'mini-result-box lose'; }
    const reward = document.getElementById('circuitReward');
    if(reward) reward.textContent = '';
  } else {
    if(typeof playSound === 'function') playSound('win');
    const r      = miniReward(frac * 1.6, frac * 1.6, 2);
    const result = document.getElementById('circuitResult');
    if(result) { result.textContent = '⚡ CIRCUITO COMPLETO!'; result.className = 'mini-result-box win'; }
    const reward = document.getElementById('circuitReward');
    if(reward) reward.textContent = `+${r.xpGain} XP · +${r.coinGain} 🪙`;
    vitals.humor = Math.min(100, vitals.humor + Math.round(12 * frac));
    scheduleSave();
  }

  const again = document.getElementById('circuitAgainBtn');
  if(again) again.style.display = 'inline-block';
}

// ── Render ─────────────────────────────────────────────────────────
function _cRender() {
  const canvas = document.getElementById('circuitCanvas');
  if(!canvas || !_cGrid.length) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.width, H = canvas.height;
  const cw  = W / _cCols,   ch = H / _cRows;
  const now = performance.now();

  // Fundo
  ctx.fillStyle = '#050411';
  ctx.fillRect(0, 0, W, H);

  // Grade sutil
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth   = 0.5;
  for(let i = 0; i <= _cCols; i++) {
    ctx.beginPath(); ctx.moveTo(i * cw, 0);   ctx.lineTo(i * cw, H);   ctx.stroke();
  }
  for(let j = 0; j <= _cRows; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * ch);   ctx.lineTo(W, j * ch);   ctx.stroke();
  }

  for(let y = 0; y < _cRows; y++) {
    for(let x = 0; x < _cCols; x++) {
      const idx  = _cIdx(x, y);
      const cell = _cGrid[idx];
      const px   = x * cw, py = y * ch;
      const cx   = px + cw * 0.5, cy = py + ch * 0.5;
      const isSrc = idx === _cSrcCell;
      const isSnk = idx === _cSnkCell;

      // Rotação animada
      let rotDelta = 0;
      const ra = _cRotAnim[idx];
      if(ra) {
        const t = (now - ra.start) / 160;
        if(t < 1) {
          rotDelta = -(1 - t) * (Math.PI / 2);
        } else {
          delete _cRotAnim[idx];
        }
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotDelta);
      ctx.translate(-cx, -cy);

      // Fundo de célula iluminada
      if(cell.lit && !isSrc && !isSnk) {
        ctx.fillStyle = `rgba(${_cElRgb},0.07)`;
        ctx.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      }

      const bits = _cConn(cell.type, cell.rot);
      _cDrawCell(ctx, cx, cy, cw, ch, bits, cell.lit, isSrc, isSnk);

      // Ícone de bloqueio
      if(cell.locked && !isSrc && !isSnk) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font      = `${Math.max(7, cw * 0.18)}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('🔒', px + cw - 2, py + 2);
      }

      ctx.restore();
    }
  }

  // Pulso de vitória
  if(_cWon) {
    const pulse = 0.12 + 0.1 * Math.sin(now / 180);
    ctx.fillStyle = `rgba(${_cElRgb},${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function _cDrawCell(ctx, cx, cy, cw, ch, bits, lit, isSrc, isSnk) {
  const pipeW = Math.max(2.5, Math.min(cw * 0.2, 7));
  const color = lit ? _cElColor : 'rgba(255,255,255,0.14)';

  const ARMS = [
    { bit: CN, ex: cx,            ey: cy - ch * 0.5 },
    { bit: CE, ex: cx + cw * 0.5, ey: cy             },
    { bit: CS, ex: cx,            ey: cy + ch * 0.5 },
    { bit: CW, ex: cx - cw * 0.5, ey: cy             },
  ];

  if(lit) { ctx.shadowColor = _cElColor; ctx.shadowBlur = 10; }
  ctx.strokeStyle = color;
  ctx.lineWidth   = pipeW;
  ctx.lineCap     = 'round';

  let drawn = false;
  for(const { bit, ex, ey } of ARMS) {
    if(bits & bit) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      drawn = true;
    }
  }

  ctx.shadowBlur = 0;

  // Nó central
  if(drawn && !isSrc && !isSnk) {
    if(lit) { ctx.shadowColor = _cElColor; ctx.shadowBlur = 8; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, pipeW * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Terminal: source / sink
  if(isSrc || isSnk) {
    _cDrawTerminal(ctx, cx, cy, cw, lit, isSrc);
  }
}

function _cDrawTerminal(ctx, cx, cy, cw, lit, isSrc) {
  const r     = Math.max(4, cw * 0.22);
  const color = (_cWon && !isSrc) ? '#fde68a' : lit ? _cElColor : 'rgba(255,255,255,0.22)';

  ctx.shadowColor = lit ? color : 'transparent';
  ctx.shadowBlur  = lit ? 18 : 0;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const inner = '#050411';
  if(isSrc) {
    // Raio (zigzag)
    ctx.strokeStyle = inner;
    ctx.lineWidth   = Math.max(1, r * 0.38);
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.12, cy - r * 0.58);
    ctx.lineTo(cx - r * 0.08, cy - r * 0.05);
    ctx.lineTo(cx + r * 0.14, cy - r * 0.05);
    ctx.lineTo(cx - r * 0.12, cy + r * 0.58);
    ctx.stroke();
  } else {
    // Alvo (bullseye)
    ctx.strokeStyle = inner;
    ctx.lineWidth   = Math.max(1, r * 0.22);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── RAF loop ───────────────────────────────────────────────────────
(function _cLoop() {
  if(_cRunning || _cWon || Object.keys(_cRotAnim).length > 0) _cRender();
  requestAnimationFrame(_cLoop);
})();
