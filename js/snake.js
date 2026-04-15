// ═══════════════════════════════════════════════════════════════════
// SNAKE ELEMENTAL
// Grid: 20×20 células de 14px → canvas 280×280
// ═══════════════════════════════════════════════════════════════════

const SNAKE_COLS = 20;
const SNAKE_ROWS = 20;
const SNAKE_CELL = 14; // px por célula

const SNAKE_EL = [
  { color:'#f87171', shine:'#fca5a5', label:'Fogo'    },
  { color:'#60a5fa', shine:'#93c5fd', label:'Água'    },
  { color:'#86efac', shine:'#bbf7d0', label:'Terra'   },
  { color:'#fbbf24', shine:'#fde68a', label:'Vento'   },
  { color:'#a78bfa', shine:'#c4b5fd', label:'Elet.'   },
  { color:'#67e8f9', shine:'#a5f3fc', label:'Luz'     },
  { color:'#c084fc', shine:'#e9d5ff', label:'Sombra'  },
  { color:'#34d399', shine:'#6ee7b7', label:'Void'    },
  { color:'#fde68a', shine:'#fef9c3', label:'Aether'  },
];

let _snakeBody     = [];
let _snakeDir      = { x: 1, y: 0 };
let _snakeNextDir  = { x: 1, y: 0 };
let _snakeFood     = null;
let _snakeFoodIdx  = 0;
let _snakeScore    = 0;
let _snakeInterval = null;
let _snakeRunning  = false;
let _snakeTouchX   = null;
let _snakeTouchY   = null;

// ── Iniciar ────────────────────────────────────────────────────────
function startSnake() {
  if(vitals.energia < 10) {
    showBubble(t('mg.bub.tired'));
    ModalManager.close('snakeModal');
    return;
  }

  const canvas = document.getElementById('snakeCanvas');
  if(!canvas) return;
  // Sincroniza buffer com tamanho CSS real para evitar upscaling no desktop
  const _snSz = canvas.offsetWidth || 280;
  canvas.width  = _snSz;
  canvas.height = _snSz;

  _snakeBody    = [{ x:10,y:10 },{ x:9,y:10 },{ x:8,y:10 }];
  _snakeDir     = { x:1, y:0 };
  _snakeNextDir = { x:1, y:0 };
  _snakeScore   = 0;
  _snakeRunning = true;

  document.getElementById('snakeResult').textContent = '';
  document.getElementById('snakeResult').className   = 'mini-result-box';
  document.getElementById('snakeReward').textContent = '';
  document.getElementById('snakeAgainBtn').style.display = 'none';
  _snakeUpdateScore();

  const d = miniDifficulty();
  document.getElementById('snakeInfo').textContent =
    t('snake.info', {diff: t(d.i18nKey), nivel});

  _snakePlaceFood();
  _snakeRender();

  const speed = d.tier === 0 ? 200 : d.tier === 1 ? 145 : d.tier === 2 ? 100 : 68;
  clearInterval(_snakeInterval);
  _snakeInterval = setInterval(_snakeTick, speed);

}

// ── Posicionar comida ──────────────────────────────────────────────
function _snakePlaceFood() {
  const occupied = new Set(_snakeBody.map(s => `${s.x},${s.y}`));
  let x, y;
  let tries = 0;
  do {
    x = Math.floor(Math.random() * SNAKE_COLS);
    y = Math.floor(Math.random() * SNAKE_ROWS);
    tries++;
  } while(occupied.has(`${x},${y}`) && tries < 400);
  _snakeFood    = { x, y };
  _snakeFoodIdx = Math.floor(Math.random() * SNAKE_EL.length);
}

// ── Tick do jogo ───────────────────────────────────────────────────
function _snakeTick() {
  if(!_snakeRunning) return;

  _snakeDir = { ..._snakeNextDir };

  const head = _snakeBody[0];
  const next = {
    x: (head.x + _snakeDir.x + SNAKE_COLS) % SNAKE_COLS,
    y: (head.y + _snakeDir.y + SNAKE_ROWS) % SNAKE_ROWS,
  };

  // Colisão com o próprio corpo
  if(_snakeBody.some(s => s.x === next.x && s.y === next.y)) {
    _snakeEnd();
    return;
  }

  _snakeBody.unshift(next);

  if(next.x === _snakeFood.x && next.y === _snakeFood.y) {
    _snakeScore++;
    _snakeUpdateScore();
    _snakePlaceFood();
    playSound && playSound('feed');
  } else {
    _snakeBody.pop();
  }

  _snakeRender();
}

// ── Render canvas ──────────────────────────────────────────────────
function _snakeRender() {
  const canvas = document.getElementById('snakeCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const cw = W / SNAKE_COLS;
  const ch = H / SNAKE_ROWS;

  // Fundo
  ctx.fillStyle = '#0a0818';
  ctx.fillRect(0, 0, W, H);

  // Grid sutil
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for(let i = 0; i <= SNAKE_COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i*cw, 0); ctx.lineTo(i*cw, H); ctx.stroke();
  }
  for(let j = 0; j <= SNAKE_ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j*ch); ctx.lineTo(W, j*ch); ctx.stroke();
  }

  // ── Comida ──
  if(_snakeFood) {
    const el = SNAKE_EL[_snakeFoodIdx];
    const fx = _snakeFood.x * cw + cw / 2;
    const fy = _snakeFood.y * ch + ch / 2;
    const fr = cw * 0.38;

    // Glow pulsante (animado via sin do tempo)
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 300);
    const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr * 2.5);
    grd.addColorStop(0, el.color + Math.round(pulse * 80 + 40).toString(16).padStart(2,'0'));
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(fx, fy, fr * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Corpo da comida
    ctx.fillStyle = el.color;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fill();

    // Brilho
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(fx - fr * 0.28, fy - fr * 0.28, fr * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Cobra ──
  const len = _snakeBody.length;
  _snakeBody.forEach((seg, i) => {
    const px = seg.x * cw + 1;
    const py = seg.y * ch + 1;
    const pw = cw - 2;
    const ph = ch - 2;
    const r  = i === 0 ? 5 : 3;

    // Cor: cabeça mais clara, cauda mais escura
    const t  = i / Math.max(len - 1, 1);
    const g  = Math.round(200 - t * 120);
    const gr = Math.round(80  - t * 50);
    const bl = Math.round(60  - t * 40);
    ctx.fillStyle = `rgb(${gr},${g},${bl})`;

    ctx.beginPath();
    if(ctx.roundRect) {
      ctx.roundRect(px, py, pw, ph, r);
    } else {
      ctx.rect(px, py, pw, ph);
    }
    ctx.fill();

    // Borda interna suave
    ctx.strokeStyle = `rgba(255,255,255,0.08)`;
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── Olhos na cabeça ──
    if(i === 0) {
      const dx = _snakeDir.x;
      const dy = _snakeDir.y;
      const cx = seg.x * cw + cw / 2;
      const cy = seg.y * ch + ch / 2;

      // Dois olhos perpendiculares à direção
      const ox = dy !== 0 ? cw * 0.22 : 0;
      const oy = dx !== 0 ? ch * 0.22 : 0;
      const fwd = cw * 0.15;

      const eyes = [
        { x: cx + ox + dx * fwd, y: cy + oy + dy * fwd },
        { x: cx - ox + dx * fwd, y: cy - oy + dy * fwd },
      ];

      eyes.forEach(e => {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(e.x + dx * 0.6, e.y + dy * 0.6, 1, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });
}

// ── Fim de jogo ────────────────────────────────────────────────────
function _snakeEnd() {
  clearInterval(_snakeInterval);
  _snakeRunning = false;

  // Flash vermelho na cabeça
  _snakeRenderDead();

  setTimeout(() => {
    const d = miniDifficulty();
    const maxScore = d.tier === 0 ? 10 : d.tier === 1 ? 16 : d.tier === 2 ? 22 : 30;
    const frac = Math.min(1, _snakeScore / maxScore);

    applyGameCost();

    if(_snakeScore === 0) {
      playSound && playSound('lose');
      document.getElementById('snakeResult').textContent = t('snake.result.gameover');
      document.getElementById('snakeResult').className   = 'mini-result-box lose';
      document.getElementById('snakeReward').textContent = '';
    } else {
      const cleared = frac >= 1.0;
      playSound && playSound(cleared || frac >= 0.8 ? 'win' : 'lose');
      // Bónus por bola: cada elemento apanhado vale +XP e +🪙 extra
      const rb = rarityBonus();
      const vb = getVinculoBonus();
      const xpPorBola   = Math.round(4 * rb.xp     * vb.xpMult);
      const coinPorBola = Math.round(3 * rb.moedas);
      const xpBonus     = xpPorBola   * _snakeScore;
      const coinBonus   = coinPorBola * _snakeScore;
      // Bónus de conclusão: +60% moedas e XP extras ao completar o maxScore
      const clearXp   = cleared ? Math.round(xpBonus   * 0.6) : 0;
      const clearCoin = cleared ? Math.round(coinBonus  * 0.6) : 0;
      // Recompensa base (fraca — o grosso vem do bónus por bola)
      const r = miniReward(frac * 0.6, frac * 0.6, cleared ? 3 : 1, cleared);
      // Adiciona bónus por bola + bónus conclusão
      xp += xpBonus + clearXp;
      earnCoins(coinBonus + clearCoin);
      checkXP(); updateAllUI(); scheduleSave();

      const totalXp   = r.xpGain + xpBonus + clearXp;
      const totalCoin = r.coinGain + coinBonus + clearCoin;

      document.getElementById('snakeResult').textContent =
        cleared          ? t('snake.result.clear', {n: _snakeScore}) :
        frac >= 0.8      ? t('snake.result.good',  {n: _snakeScore}) :
                           t('snake.result.ok',    {n: _snakeScore});
      document.getElementById('snakeResult').className =
        'mini-result-box ' + (cleared || frac >= 0.8 ? 'win' : '');
      document.getElementById('snakeReward').textContent = cleared
        ? t('snake.reward.clear',  {xp: totalXp, coins: totalCoin, n: _snakeScore})
        : t('snake.reward.normal', {xp: totalXp, coins: totalCoin, n: _snakeScore});
      vitals.humor = Math.min(100, vitals.humor + Math.round(12 * frac));
      scheduleSave();
    }

    document.getElementById('snakeAgainBtn').style.display = 'inline-block';
  }, 400);
}

function _snakeRenderDead() {
  const canvas = document.getElementById('snakeCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width / SNAKE_COLS;
  const ch = canvas.height / SNAKE_ROWS;
  const head = _snakeBody[0];
  if(!head) return;

  ctx.fillStyle = 'rgba(220,50,50,0.5)';
  ctx.beginPath();
  ctx.arc(head.x * cw + cw/2, head.y * ch + ch/2, cw * 0.7, 0, Math.PI * 2);
  ctx.fill();
}

// ── Score display ──────────────────────────────────────────────────
function _snakeUpdateScore() {
  const el = document.getElementById('snakeScore');
  if(el) el.textContent = t('snake.score', {n: _snakeScore, s: _snakeScore !== 1 ? 's' : ''});
}

// ── Controles de direção ───────────────────────────────────────────
function snakeDpad(dx, dy) {
  if(!_snakeRunning) return;
  if(dx === -_snakeDir.x && dy === -_snakeDir.y) return; // sem reverter
  _snakeNextDir = { x: dx, y: dy };
}

// Teclado
document.addEventListener('keydown', e => {
  if(!_snakeRunning) return;
  const MAP = {
    ArrowUp:   [0,-1], ArrowDown: [0,1],
    ArrowLeft:[-1, 0], ArrowRight:[1, 0],
    w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
    W:[0,-1], S:[0,1], A:[-1,0], D:[1,0],
  };
  const dir = MAP[e.key];
  if(dir) { e.preventDefault(); snakeDpad(dir[0], dir[1]); }
});

// Touch/swipe no canvas
(function() {
  function _attachSnakeTouch() {
    const canvas = document.getElementById('snakeCanvas');
    if(!canvas) return;
    canvas.addEventListener('touchstart', e => {
      _snakeTouchX = e.touches[0].clientX;
      _snakeTouchY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', e => {
      if(_snakeTouchX === null) return;
      const dx = e.changedTouches[0].clientX - _snakeTouchX;
      const dy = e.changedTouches[0].clientY - _snakeTouchY;
      _snakeTouchX = null; _snakeTouchY = null;
      if(Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if(Math.abs(dx) > Math.abs(dy)) snakeDpad(dx > 0 ? 1 : -1, 0);
      else                             snakeDpad(0, dy > 0 ? 1 : -1);
    }, { passive: true });
  }
  // Aguarda DOM
  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _attachSnakeTouch);
  } else {
    _attachSnakeTouch();
  }
})();

// Loop de render da comida pulsante (animação mesmo sem tick)
(function _snakeFoodLoop() {
  if(_snakeRunning && _snakeFood) _snakeRender();
  requestAnimationFrame(_snakeFoodLoop);
})();
