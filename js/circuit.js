// ═══════════════════════════════════════════════════════════════════
// CIRCUITO ELEMENTAL — Puzzle de rotação de peças
// Conecte a fonte (⚡) ao receptor (◎) girando as peças do circuito.
// ═══════════════════════════════════════════════════════════════════

// Bitmask: N=1, E=2, S=4, W=8
const CN = 1, CE = 2, CS = 4, CW = 8;
const C_OPP = { 1:4, 2:8, 4:1, 8:2 };

const C_BASE = {
  dead:     CN,
  straight: CN | CS,
  corner:   CN | CE,
  tee:      CN | CE | CS,
  cross:    CN | CE | CS | CW,
};

function _cRotCW(b) { return ((b << 1) | (b >> 3)) & 0xF; }
function _cPopcount(b) { return [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4][b & 0xF]; }

function _cConn(type, rot) {
  let b = C_BASE[type];
  for(let i = 0; i < (rot & 3); i++) b = _cRotCW(b);
  return b;
}

function _cTypeRot(bits) {
  const n = _cPopcount(bits);
  const types = n === 4 ? ['cross'] : n === 3 ? ['tee'] :
                n === 2 ? (bits === 5 || bits === 10 ? ['straight'] : ['corner']) : ['dead'];
  for(const type of types) {
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

// ── Estado ─────────────────────────────────────────────────────────
let _cGrid    = [];
let _cCols    = 5;
let _cRows    = 5;
let _cSrcCell = 0;
let _cSnkCell = 0;
let _cRunning = false;
let _cWon     = false;
let _cSecs    = 120;
let _cTimer   = null;
let _cRotAnim = {};
let _cElColor = '#86efac';
let _cElRgb   = '134,239,172';
let _cPathSet = new Set();

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
  const ec = (avatar && EL[avatar.elemento]) || EL['Terra'];
  _cElColor = ec[0];
  _cElRgb   = ec[1];

  _cWon     = false;
  _cRunning = true;
  _cRotAnim = {};

  _cGenerate(d.tier);
  _cBFS();

  const info = document.getElementById('circuitInfo');
  if(info) info.textContent = `${d.label} · ${_cCols}×${_cRows} · Conecte ⚡ ao ◎`;

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
  _cGrid    = [];
  _cPathSet = new Set();

  const srcRow  = Math.floor(rows * (0.15 + Math.random() * 0.70));
  const sinkRow = Math.floor(rows * (0.15 + Math.random() * 0.70));

  _cSrcCell = _cIdx(0, srcRow);
  _cSnkCell = _cIdx(cols - 1, sinkRow);

  const path = _cFindPath(cols, rows, 0, srcRow, cols - 1, sinkRow);
  path.forEach(p => _cPathSet.add(_cIdx(p.x, p.y)));

  // Mapa de conexões necessárias por célula
  const connMap = {};
  for(let i = 0; i < path.length; i++) {
    const ci = _cIdx(path[i].x, path[i].y);
    connMap[ci] = 0;
    if(i > 0) {
      const dx = path[i].x - path[i-1].x, dy = path[i].y - path[i-1].y;
      if(dx === 1) connMap[ci] |= CW; else if(dx === -1) connMap[ci] |= CE;
      if(dy === 1) connMap[ci] |= CN; else if(dy === -1) connMap[ci] |= CS;
    }
    if(i < path.length - 1) {
      const dx = path[i+1].x - path[i].x, dy = path[i+1].y - path[i].y;
      if(dx === 1) connMap[ci] |= CE; else if(dx === -1) connMap[ci] |= CW;
      if(dy === 1) connMap[ci] |= CS; else if(dy === -1) connMap[ci] |= CN;
    }
  }
  connMap[_cSrcCell] = CE;
  connMap[_cSnkCell] = CW;

  // Peças bloqueadas (ficam na rotação correta já)
  const lockRatio = tier === 1 ? 0.18 : tier === 2 ? 0.25 : tier >= 3 ? 0.32 : 0;
  const inner     = path.slice(1, -1);
  const lockCount = Math.floor(inner.length * lockRatio);
  const locked    = new Set(_cShuffle([...inner]).slice(0, lockCount).map(p => _cIdx(p.x, p.y)));

  // Construir grid
  for(let y = 0; y < rows; y++) {
    for(let x = 0; x < cols; x++) {
      const idx   = _cIdx(x, y);
      const isSrc = idx === _cSrcCell;
      const isSnk = idx === _cSnkCell;
      let type, rot, isLocked;

      if(isSrc) {
        type = 'dead'; rot = 1; isLocked = true;
      } else if(isSnk) {
        type = 'dead'; rot = 3; isLocked = true;
      } else if(_cPathSet.has(idx) && connMap[idx]) {
        const tr = _cTypeRot(connMap[idx]);
        type = tr.type;
        isLocked = locked.has(idx);
        // Células não bloqueadas: sempre embaralhadas (nunca na posição certa)
        if(isLocked) {
          rot = tr.rot;
        } else {
          const offset = 1 + Math.floor(Math.random() * 3);
          rot = (tr.rot + offset) & 3;
        }
      } else {
        // Células de preenchimento: APENAS dead (1 saída) ou straight
        // → nunca criam caminhos alternativos que confundam o jogador
        const fillTypes = ['dead', 'dead', 'straight'];
        type     = fillTypes[Math.floor(Math.random() * fillTypes.length)];
        rot      = Math.floor(Math.random() * 4);
        isLocked = false;
      }

      _cGrid.push({ type, rot, locked: isLocked, lit: false });
    }
  }
}

// DFS com backtracking garantindo caminho
function _cFindPath(cols, rows, x0, y0, x1, y1) {
  const visited = new Set();
  const path = [];

  function dfs(x, y) {
    if(x < 0 || x >= cols || y < 0 || y >= rows) return false;
    const key = `${x},${y}`;
    if(visited.has(key)) return false;
    visited.add(key);
    path.push({ x, y });
    if(x === x1 && y === y1) return true;
    // Favorece ir para leste para manter caminho razoável
    const dirs = _cShuffle([{dx:1,dy:0},{dx:0,dy:1},{dx:0,dy:-1},{dx:-1,dy:0}]);
    for(const { dx, dy } of dirs) {
      if(dfs(x + dx, y + dy)) return true;
    }
    path.pop();
    visited.delete(key);
    return false;
  }

  if(!dfs(x0, y0)) {
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
  const DIRS  = [
    { bit: CN, dx:0, dy:-1 }, { bit: CE, dx:1, dy:0 },
    { bit: CS, dx:0, dy:1  }, { bit: CW, dx:-1, dy:0 },
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
      if(_cConn(_cGrid[ni].type, _cGrid[ni].rot) & C_OPP[bit]) {
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

// ── Clique / toque para girar ───────────────────────────────────────
function _cHandleInput(clientX, clientY) {
  if(!_cRunning || _cWon || !_cGrid.length) return;
  const canvas = document.getElementById('circuitCanvas');
  if(!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const sx   = canvas.width  / rect.width;
  const sy   = canvas.height / rect.height;
  const mx   = (clientX - rect.left) * sx;
  const my   = (clientY - rect.top)  * sy;
  const cw   = canvas.width  / _cCols;
  const ch   = canvas.height / _cRows;
  const gx   = Math.floor(mx / cw);
  const gy   = Math.floor(my / ch);
  if(gx < 0 || gx >= _cCols || gy < 0 || gy >= _cRows) return;

  const idx  = _cIdx(gx, gy);
  const cell = _cGrid[idx];
  if(cell.locked) return;

  _cRotAnim[idx] = { start: performance.now() };
  cell.rot = (cell.rot + 1) & 3;
  if(typeof playSound === 'function') playSound('click');

  if(_cBFS() && !_cWon) {
    _cWon = true;
    setTimeout(() => _cEnd(true), 500);
  }
}

function circuitClick(e) {
  _cHandleInput(e.clientX, e.clientY);
}

// Touch support
(function() {
  function _attachCircuitTouch() {
    const canvas = document.getElementById('circuitCanvas');
    if(!canvas) return;
    let _tx = null, _ty = null;
    canvas.addEventListener('touchstart', e => {
      _tx = e.touches[0].clientX;
      _ty = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      if(_tx === null) return;
      const dx = e.changedTouches[0].clientX - _tx;
      const dy = e.changedTouches[0].clientY - _ty;
      _tx = null; _ty = null;
      // Tap (não swipe)
      if(Math.abs(dx) < 12 && Math.abs(dy) < 12) {
        _cHandleInput(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }, { passive: true });
  }
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _attachCircuitTouch);
  } else {
    _attachCircuitTouch();
  }
})();

// ── Fim de jogo ────────────────────────────────────────────────────
function _cEnd(won) {
  clearInterval(_cTimer);
  _cRunning = false;

  const d       = miniDifficulty();
  const maxSecs = d.tier === 0 ? 120 : d.tier === 1 ? 100 : d.tier === 2 ? 80 : 60;
  const timeFrac = won ? Math.min(1, _cSecs / maxSecs) : 0;
  const frac     = won ? (0.5 + timeFrac * 0.5) : 0;

  const result = document.getElementById('circuitResult');
  const reward = document.getElementById('circuitReward');
  const again  = document.getElementById('circuitAgainBtn');

  if(!won) {
    if(typeof playSound === 'function') playSound('lose');
    if(result) { result.textContent = '⏰ TEMPO ESGOTADO'; result.className = 'mini-result-box lose'; }
    if(reward) reward.textContent = '';
  } else {
    if(typeof playSound === 'function') playSound('win');
    const r = miniReward(frac * 1.6, frac * 1.6, 2);
    if(result) { result.textContent = '⚡ CIRCUITO COMPLETO!'; result.className = 'mini-result-box win'; }
    if(reward) reward.textContent = `+${r.xpGain} XP · +${r.coinGain} 🪙`;
    vitals.humor = Math.min(100, vitals.humor + Math.round(10 * frac));
    scheduleSave();
  }

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

  // ── Fundo com padrão de placa de circuito ──
  ctx.fillStyle = '#040c08';
  ctx.fillRect(0, 0, W, H);

  // Grade com pontinhos nos cruzamentos
  ctx.strokeStyle = 'rgba(134,239,172,0.06)';
  ctx.lineWidth = 0.5;
  for(let i = 0; i <= _cCols; i++) {
    ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, H); ctx.stroke();
  }
  for(let j = 0; j <= _cRows; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * ch); ctx.lineTo(W, j * ch); ctx.stroke();
  }
  // Pontos nos cruzamentos
  ctx.fillStyle = 'rgba(134,239,172,0.12)';
  for(let i = 1; i < _cCols; i++) {
    for(let j = 1; j < _cRows; j++) {
      ctx.beginPath();
      ctx.arc(i * cw, j * ch, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for(let y = 0; y < _cRows; y++) {
    for(let x = 0; x < _cCols; x++) {
      const idx   = _cIdx(x, y);
      const cell  = _cGrid[idx];
      const px    = x * cw, py = y * ch;
      const cx    = px + cw * 0.5, cy = py + ch * 0.5;
      const isSrc = idx === _cSrcCell;
      const isSnk = idx === _cSnkCell;

      // Animação de rotação
      let rotDelta = 0;
      const ra = _cRotAnim[idx];
      if(ra) {
        const t = (now - ra.start) / 180;
        if(t < 1) {
          // Ease-out
          rotDelta = -(1 - t * t) * (Math.PI / 2);
        } else {
          delete _cRotAnim[idx];
        }
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotDelta);
      ctx.translate(-cx, -cy);

      // Fundo da célula iluminada
      if(cell.lit) {
        ctx.fillStyle = `rgba(${_cElRgb},0.06)`;
        ctx.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      }

      const bits = _cConn(cell.type, cell.rot);
      _cDrawPipes(ctx, cx, cy, cw, ch, bits, cell.lit, isSrc, isSnk);

      // Ícone de bloqueio
      if(cell.locked && !isSrc && !isSnk) {
        ctx.globalAlpha = 0.35;
        ctx.font = `${Math.round(cw * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', cx, cy);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  // Overlay de vitória pulsante
  if(_cWon) {
    const pulse = 0.06 + 0.05 * Math.sin(now / 160);
    ctx.fillStyle = `rgba(${_cElRgb},${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function _cDrawPipes(ctx, cx, cy, cw, ch, bits, lit, isSrc, isSnk) {
  const pW = Math.max(3, Math.min(cw * 0.22, 8)); // espessura do pipe

  const litColor  = _cElColor;
  const deadColor = 'rgba(255,255,255,0.10)';
  const color     = lit ? litColor : deadColor;

  const ARMS = [
    { bit: CN, ex: cx,          ey: py => py - cw * 0.5 },
    { bit: CE, ex: px => px + cw * 0.5, ey: cy          },
    { bit: CS, ex: cx,          ey: py => py + cw * 0.5 },
    { bit: CW, ex: px => px - cw * 0.5, ey: cy          },
  ];

  // Montagem dos pontos reais
  const half = cw * 0.5;
  const arms4 = [
    { bit: CN, ex: cx,       ey: cy - half },
    { bit: CE, ex: cx + half, ey: cy       },
    { bit: CS, ex: cx,        ey: cy + half},
    { bit: CW, ex: cx - half, ey: cy       },
  ];

  // Glow
  if(lit) {
    ctx.shadowColor = _cElColor;
    ctx.shadowBlur  = 10;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth   = pW;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  // Desenha pipes como segmentos do centro até borda
  let hasAny = false;
  for(const { bit, ex, ey } of arms4) {
    if(!(bits & bit)) continue;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    hasAny = true;
  }

  ctx.shadowBlur = 0;

  // Nó central (quando tem 2+ conexões)
  if(hasAny && !isSrc && !isSnk) {
    const nr = pW * 0.7;
    if(lit) { ctx.shadowColor = _cElColor; ctx.shadowBlur = 12; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, nr, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Tampinha nas pontas (cap nas bordas da célula)
  if(lit) {
    const capR = pW * 0.55;
    ctx.fillStyle = _cElColor;
    ctx.shadowColor = _cElColor;
    ctx.shadowBlur  = 8;
    for(const { bit, ex, ey } of arms4) {
      if(!(bits & bit)) continue;
      ctx.beginPath();
      ctx.arc(ex, ey, capR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // Terminal source / sink
  if(isSrc || isSnk) _cDrawTerminal(ctx, cx, cy, cw, lit, isSrc);
}

function _cDrawTerminal(ctx, cx, cy, cw, lit, isSrc) {
  const r  = Math.max(5, cw * 0.24);
  const won = _cWon;
  const color = (won && !isSrc) ? '#fde68a' : lit ? _cElColor : 'rgba(255,255,255,0.2)';

  ctx.shadowColor = lit ? color : 'transparent';
  ctx.shadowBlur  = lit ? 20 : 0;

  // Anel externo
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(1.5, r * 0.3);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Preenchimento
  ctx.fillStyle = `rgba(4,12,8,0.85)`;
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  // Ícone interno
  const s = r * 0.55;
  ctx.fillStyle = color;

  if(isSrc) {
    // Raio ⚡
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15,  cy - s);
    ctx.lineTo(cx - s * 0.15,  cy - s * 0.05);
    ctx.lineTo(cx + s * 0.2,   cy - s * 0.05);
    ctx.lineTo(cx - s * 0.15,  cy + s);
    ctx.closePath();
    ctx.fill();
  } else {
    // Círculo alvo ◎
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(4,12,8,0.9)`;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── RAF loop ───────────────────────────────────────────────────────
(function _cLoop() {
  if(_cRunning || _cWon || Object.keys(_cRotAnim).length > 0) _cRender();
  requestAnimationFrame(_cLoop);
})();
