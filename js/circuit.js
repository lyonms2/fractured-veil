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

  // ── Caminho garantido ──────────────────────────────────────────
  // Força que o caminho começa indo leste (path[0]=source, path[1]=(1,srcRow))
  // e termina chegando de oeste (path[n-2]=(cols-2,sinkRow), path[n-1]=sink).
  // Assim source (CE) e sink (CW) sempre se encaixam corretamente.
  const innerPath = _cFindPath(cols, rows,
    1, srcRow,       // começa em x=1 (logo após source)
    cols - 2, sinkRow // termina em x=cols-2 (logo antes de sink)
  );
  // Monta o caminho completo: source → inner → sink
  const path = [
    { x: 0,       y: srcRow  },
    ...innerPath,
    { x: cols - 1, y: sinkRow },
  ];

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
  // Forçar source e sink com saídas fixas
  connMap[_cSrcCell] = CE;
  connMap[_cSnkCell] = CW;

  // Peças bloqueadas no caminho
  const lockRatio = tier === 1 ? 0.18 : tier === 2 ? 0.25 : tier >= 3 ? 0.32 : 0;
  const inner     = path.slice(1, -1);
  const lockCount = Math.floor(inner.length * lockRatio);
  const locked    = new Set(
    _cShuffle([...inner]).slice(0, lockCount).map(p => _cIdx(p.x, p.y))
  );

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
        type     = tr.type;
        isLocked = locked.has(idx);
        // Embaralhar: garante que nunca está já na posição correta
        if(isLocked) {
          rot = tr.rot;
        } else {
          const offset = 1 + Math.floor(Math.random() * 3);
          rot = (tr.rot + offset) & 3;
        }
      } else {
        // Células de preenchimento: só dead ou straight
        // Nunca criam pontes entre células do caminho
        type     = Math.random() < 0.55 ? 'dead' : 'straight';
        rot      = Math.floor(Math.random() * 4);
        isLocked = false;
      }

      _cGrid.push({ type, rot, locked: isLocked, lit: false });
    }
  }
}

// DFS com backtracking (zona interior: x=1..cols-2)
function _cFindPath(cols, rows, x0, y0, x1, y1) {
  const visited = new Set();
  const path    = [];

  function dfs(x, y) {
    // Restringe às colunas internas (1..cols-2) excepto origem e destino
    if(x < 1 || x > cols - 2 || y < 0 || y >= rows) return false;
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
    // Fallback directo: direita até x1, depois vertical até y1
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
    { bit: CS, dx:0, dy:1  }, { bit: CW, dx:-1,dy:0 },
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

// ── Input: clique (desktop) e toque (mobile) ───────────────────────
// Apenas um listener por tipo para evitar double-fire
(function _cAttachInput() {
  function attach() {
    const canvas = document.getElementById('circuitCanvas');
    if(!canvas) return;

    let _lastTouch = 0;

    // Mobile: touchend para tap (não-passivo para poder cancelar o click sintético)
    canvas.addEventListener('touchstart', e => {
      _lastTouch = Date.now();
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      const t = e.changedTouches[0];
      const elapsed = Date.now() - _lastTouch;
      // Tap curto e sem movimento grande = girar
      if(elapsed < 400) {
        e.preventDefault(); // cancela o click sintético do browser
        _cHandleInput(t.clientX, t.clientY);
      }
    }, { passive: false }); // passive:false permite preventDefault

    // Desktop: click normal (não dispara em mobile por causa do preventDefault acima)
    canvas.addEventListener('click', e => {
      _cHandleInput(e.clientX, e.clientY);
    });
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();

function _cHandleInput(clientX, clientY) {
  if(!_cRunning || _cWon || !_cGrid.length) return;
  const canvas = document.getElementById('circuitCanvas');
  if(!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (clientX - rect.left) * scaleX;
  const my = (clientY - rect.top)  * scaleY;
  const gx = Math.floor(mx / (canvas.width  / _cCols));
  const gy = Math.floor(my / (canvas.height / _cRows));
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

// circuitClick mantido para compatibilidade (main.js expõe via window)
function circuitClick(e) { _cHandleInput(e.clientX, e.clientY); }

// ── Fim de jogo ────────────────────────────────────────────────────
function _cEnd(won) {
  clearInterval(_cTimer);
  _cRunning = false;

  const d        = miniDifficulty();
  const maxSecs  = d.tier === 0 ? 120 : d.tier === 1 ? 100 : d.tier === 2 ? 80 : 60;
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

  // Fundo estilo PCB
  ctx.fillStyle = '#040c08';
  ctx.fillRect(0, 0, W, H);

  // Grade sutil
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

      // Animação de rotação (ease-out)
      let rotDelta = 0;
      const ra = _cRotAnim[idx];
      if(ra) {
        const t = (now - ra.start) / 180;
        if(t < 1) {
          rotDelta = -(1 - t * t) * (Math.PI / 2);
        } else {
          delete _cRotAnim[idx];
        }
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotDelta);
      ctx.translate(-cx, -cy);

      if(cell.lit) {
        ctx.fillStyle = `rgba(${_cElRgb},0.06)`;
        ctx.fillRect(px + 1, py + 1, cw - 2, ch - 2);
      }

      const bits = _cConn(cell.type, cell.rot);
      _cDrawPipes(ctx, cx, cy, cw, ch, bits, cell.lit, isSrc, isSnk);

      if(cell.locked && !isSrc && !isSnk) {
        ctx.globalAlpha = 0.30;
        ctx.font = `${Math.round(cw * 0.22)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🔒', cx, cy);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }
  }

  // Overlay de vitória
  if(_cWon) {
    const pulse = 0.06 + 0.05 * Math.sin(now / 160);
    ctx.fillStyle = `rgba(${_cElRgb},${pulse})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function _cDrawPipes(ctx, cx, cy, cw, ch, bits, lit, isSrc, isSnk) {
  const pW    = Math.max(3, Math.min(cw * 0.22, 8));
  const color = lit ? _cElColor : 'rgba(255,255,255,0.10)';
  const half  = cw * 0.5;

  const arms = [
    { bit: CN, ex: cx,        ey: cy - half },
    { bit: CE, ex: cx + half, ey: cy        },
    { bit: CS, ex: cx,        ey: cy + half },
    { bit: CW, ex: cx - half, ey: cy        },
  ];

  if(lit) { ctx.shadowColor = _cElColor; ctx.shadowBlur = 10; }
  ctx.strokeStyle = color;
  ctx.lineWidth   = pW;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';

  let hasAny = false;
  for(const { bit, ex, ey } of arms) {
    if(!(bits & bit)) continue;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
    hasAny = true;
  }
  ctx.shadowBlur = 0;

  // Nó central
  if(hasAny && !isSrc && !isSnk) {
    if(lit) { ctx.shadowColor = _cElColor; ctx.shadowBlur = 12; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, pW * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Tampinhas brilhantes nas pontas
  if(lit) {
    ctx.fillStyle = _cElColor;
    ctx.shadowColor = _cElColor;
    ctx.shadowBlur  = 8;
    for(const { bit, ex, ey } of arms) {
      if(!(bits & bit)) continue;
      ctx.beginPath();
      ctx.arc(ex, ey, pW * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  if(isSrc || isSnk) _cDrawTerminal(ctx, cx, cy, cw, lit, isSrc);
}

function _cDrawTerminal(ctx, cx, cy, cw, lit, isSrc) {
  const r     = Math.max(5, cw * 0.24);
  const color = (_cWon && !isSrc) ? '#fde68a' : lit ? _cElColor : 'rgba(255,255,255,0.20)';

  ctx.shadowColor = lit ? color : 'transparent';
  ctx.shadowBlur  = lit ? 20 : 0;

  // Anel externo
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(1.5, r * 0.30);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Interior
  ctx.fillStyle = 'rgba(4,12,8,0.85)';
  ctx.beginPath();
  ctx.arc(cx, cy, r - ctx.lineWidth * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle  = color;
  const s = r * 0.55;

  if(isSrc) {
    // Raio ⚡
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.15, cy - s);
    ctx.lineTo(cx - s * 0.15, cy - s * 0.05);
    ctx.lineTo(cx + s * 0.20, cy - s * 0.05);
    ctx.lineTo(cx - s * 0.15, cy + s);
    ctx.closePath();
    ctx.fill();
  } else {
    // Bullseye ◎
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(4,12,8,0.9)';
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
