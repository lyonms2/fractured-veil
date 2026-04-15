// ═══════════════════════════════════════════════════════════════════
// ACHE O DIFERENTE — Find the odd one out
// Grade de formas geométricas — uma é diferente das outras.
// Diferenças possíveis: forma, cor, rotação, tamanho, preenchimento.
// Timer por rodada vai diminuindo a cada acerto.
// ═══════════════════════════════════════════════════════════════════

const ODD_SHAPES = ['circle','triangle','square','pentagon','star','diamond','hexagon'];
const ODD_COLORS = [
  '#f87171','#60a5fa','#86efac','#fbbf24','#a78bfa',
  '#67e8f9','#c084fc','#34d399','#fde68a',
];

const ODD_TIMER_H = 8; // altura da barra de timer em px (dentro do canvas)

// ── Estado ─────────────────────────────────────────────────────────
let _oddItems      = [];   // [{shape, colorIdx, rot, size, filled}]
let _oddDiffIdx    = -1;
let _oddCols       = 3;
let _oddScore      = 0;
let _oddMaxTime    = 9000; // ms por rodada (decresce com acertos)
let _oddRoundStart = 0;
let _oddPenalty    = 0;    // ms adicionados ao timer por erros
let _oddRunning    = false;
let _oddOver       = false;
let _oddTier       = 0;
let _oddFlash      = null; // { idx, correct, start }
let _oddReveal     = false;// breve destaque do diferente ao perder
let _oddHoverIdx   = -1;

// ── Iniciar ────────────────────────────────────────────────────────
function startOddOne() {
  if(vitals.energia < 10) {
    showBubble(t('mg.bub.tired'));
    ModalManager.close('oddModal');
    return;
  }

  const d   = miniDifficulty();
  _oddTier  = d.tier;
  _oddCols  = [3, 4, 5, 5][d.tier];

  _oddScore     = 0;
  _oddMaxTime   = [13000, 10000, 8000, 6500][d.tier];
  _oddOver      = false;
  _oddRunning   = false;
  _oddFlash     = null;
  _oddReveal    = false;
  _oddHoverIdx  = -1;

  const info = document.getElementById('oddInfo');
  if(info) info.textContent = `${d.label} · ${_oddCols}×${_oddCols} · Toque no diferente!`;

  // Buffer = tamanho CSS real × DPR → sem stretch, sem corte
  const canvas = document.getElementById('oddCanvas');
  if(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const sz  = canvas.offsetWidth || 280;
    canvas.width  = sz * dpr;
    canvas.height = sz * dpr;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _oddSetScore();
  _oddClearResult();
  _oddNewRound();
}

function _oddSetScore() {
  const el = document.getElementById('oddScore');
  if(el) el.textContent = `🔍 Rodada ${_oddScore + 1}`;
}

function _oddClearResult() {
  const result = document.getElementById('oddResult');
  if(result) { result.textContent = ''; result.className = 'mini-result-box'; }
  const reward = document.getElementById('oddReward');
  if(reward) reward.textContent = '';
  const again = document.getElementById('oddAgainBtn');
  if(again) again.style.display = 'none';
}

// ── Gerar rodada ───────────────────────────────────────────────────
function _oddNewRound() {
  const n = _oddCols * _oddCols;

  // Propriedades base
  const baseShape    = Math.floor(Math.random() * ODD_SHAPES.length);
  const baseColorIdx = Math.floor(Math.random() * ODD_COLORS.length);

  // Tipo de diferença baseado no tier e na rodada atual
  const diffType = _oddPickDiffType(_oddTier, _oddScore, baseShape);

  // Posição do diferente (garante que não fique sempre no mesmo lugar)
  _oddDiffIdx = Math.floor(Math.random() * n);

  // Montar itens base
  _oddItems = Array.from({ length: n }, () => ({
    shape: baseShape, colorIdx: baseColorIdx, rot: 0, size: 1.0, filled: true
  }));

  // Aplicar diferença no item ímpar
  const odd = _oddItems[_oddDiffIdx];
  switch(diffType) {
    case 'shape': {
      let s;
      do { s = Math.floor(Math.random() * ODD_SHAPES.length); } while(s === baseShape);
      odd.shape = s;
      break;
    }
    case 'color': {
      let c;
      do { c = Math.floor(Math.random() * ODD_COLORS.length); } while(c === baseColorIdx);
      odd.colorIdx = c;
      break;
    }
    case 'rotation': {
      // Usa 60, 90 ou 120 graus dependendo da simetria
      const rotOptions = ODD_SHAPES[baseShape] === 'triangle' ? [60, 120]
                       : ODD_SHAPES[baseShape] === 'square'   ? [45]
                       : ODD_SHAPES[baseShape] === 'diamond'  ? [90]
                       : [60, 90];
      odd.rot = rotOptions[Math.floor(Math.random() * rotOptions.length)];
      break;
    }
    case 'size': {
      // Alterna entre menor e maior
      odd.size = Math.random() < 0.5 ? 0.48 : 1.65;
      break;
    }
    case 'fill': {
      odd.filled = false;
      break;
    }
  }

  _oddPenalty   = 0;
  _oddRoundStart= performance.now();
  _oddRunning   = true;
  _oddFlash     = null;
  _oddReveal    = false;

  _oddSetScore();
}

function _oddPickDiffType(tier, round, baseShape) {
  const canRotate = ODD_SHAPES[baseShape] !== 'circle';
  // Peso crescente de dificuldade com as rodadas
  const hard = Math.min(round / 10, 1);

  let pool;
  if(tier === 0) {
    // Fácil: só forma e cor — sempre fácil de ver
    pool = ['shape','shape','shape','color','color','color'];
  } else if(tier === 1) {
    // Médio: forma, cor, rotação
    pool = ['shape','shape','color','color',
            ...(canRotate ? ['rotation','rotation'] : ['shape','color'])];
  } else if(tier === 2) {
    // Difícil: todos os tipos, mais peso em rotação/tamanho/fill conforme rounds avançam
    pool = hard < 0.4
      ? ['shape','color','color', ...(canRotate ? ['rotation'] : ['color']), 'size']
      : ['color', ...(canRotate ? ['rotation','rotation'] : ['color']), 'size','fill'];
  } else {
    // Mestre: sem formas (muito óbvio) → cor, rotação, tamanho, fill
    // À medida que avança a dificuldade vai ficando mais pesada em fill/size
    pool = hard < 0.5
      ? ['color', ...(canRotate ? ['rotation','rotation'] : ['color']), 'size','fill']
      : [...(canRotate ? ['rotation','rotation','rotation'] : ['fill','fill']), 'size','size','fill','fill'];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Input ──────────────────────────────────────────────────────────
function _oddHandleInput(clientX, clientY) {
  if(!_oddRunning || _oddOver || _oddFlash) return;
  const canvas = document.getElementById('oddCanvas');
  if(!canvas) return;
  const rect = canvas.getBoundingClientRect();
  // Coordenadas em CSS pixels (lógicas), independente do DPR
  const mx   = (clientX - rect.left);
  const my   = (clientY - rect.top) - ODD_TIMER_H;
  if(my < 0) return;
  const W    = canvas.clientWidth  || 280;
  const H    = canvas.clientHeight || 280;
  const cw   = W / _oddCols;
  const ch   = (H - ODD_TIMER_H) / _oddCols;
  const gx     = Math.floor(mx / cw);
  const gy     = Math.floor(my / ch);
  if(gx < 0 || gx >= _oddCols || gy < 0 || gy >= _oddCols) return;

  const idx     = gy * _oddCols + gx;
  const correct = idx === _oddDiffIdx;

  _oddFlash = { idx, correct, start: performance.now() };

  if(correct) {
    if(typeof playSound === 'function') playSound('feed');
    _oddScore++;
    _oddRunning = false; // pausa timer durante transição
    setTimeout(() => {
      if(_oddOver) return;
      _oddFlash = null;
      const decay = [180, 230, 300, 370][_oddTier];
      _oddMaxTime = Math.max(3500, _oddMaxTime - decay);
      _oddNewRound();
    }, 440);
  } else {
    if(typeof playSound === 'function') playSound('lose');
    // Penalidade: avança o timer em 1.5s
    _oddPenalty += 1500;
    setTimeout(() => {
      if(!_oddOver) _oddFlash = null;
    }, 380);
  }
}

// Exposto para onclick (desktop) — touch tem listener próprio abaixo
function oddClick(e) { _oddHandleInput(e.clientX, e.clientY); }

// Touch (mobile) — evita double-fire com preventDefault
(function _oddAttach() {
  function attach() {
    const canvas = document.getElementById('oddCanvas');
    if(!canvas) return;
    let _tx = null, _ty = null, _tt = 0;

    canvas.addEventListener('touchstart', e => {
      _tx = e.touches[0].clientX;
      _ty = e.touches[0].clientY;
      _tt = Date.now();
    }, { passive: true });

    canvas.addEventListener('touchend', e => {
      if(_tx === null) return;
      const dx = e.changedTouches[0].clientX - _tx;
      const dy = e.changedTouches[0].clientY - _ty;
      _tx = null; _ty = null;
      if(Math.abs(dx) < 14 && Math.abs(dy) < 14 && Date.now() - _tt < 400) {
        e.preventDefault();
        _oddHandleInput(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      }
    }, { passive: false });

    canvas.addEventListener('click', e => {
      _oddHandleInput(e.clientX, e.clientY);
    });

    canvas.addEventListener('mousemove', e => {
      if(!_oddRunning) { _oddHoverIdx = -1; return; }
      const rect = canvas.getBoundingClientRect();
      const mx   = e.clientX - rect.left;
      const my   = e.clientY - rect.top - ODD_TIMER_H;
      const W    = canvas.clientWidth  || 280;
      const H    = canvas.clientHeight || 280;
      const cw   = W / _oddCols;
      const ch   = (H - ODD_TIMER_H) / _oddCols;
      if(my < 0) { _oddHoverIdx = -1; return; }
      const gx = Math.floor(mx / cw), gy = Math.floor(my / ch);
      _oddHoverIdx = (gx >= 0 && gx < _oddCols && gy >= 0 && gy < _oddCols)
        ? gy * _oddCols + gx : -1;
    });
    canvas.addEventListener('mouseleave', () => { _oddHoverIdx = -1; });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();

// ── Fim de jogo ────────────────────────────────────────────────────
function _oddEnd() {
  _oddRunning = false;
  _oddOver    = true;

  // Revela brevemente o diferente
  _oddReveal = true;
  setTimeout(() => { _oddReveal = false; }, 1400);

  const targets = [5, 8, 11, 15];
  const frac    = Math.min(1, _oddScore / targets[_oddTier]);

  if(typeof playSound === 'function') playSound(frac >= 0.6 ? 'win' : 'lose');

  const result = document.getElementById('oddResult');
  const reward = document.getElementById('oddReward');
  const again  = document.getElementById('oddAgainBtn');

  applyGameCost();

  if(_oddScore === 0) {
    if(result) { result.textContent = '⏰ TEMPO ESGOTADO'; result.className = 'mini-result-box lose'; }
    if(reward) reward.textContent = '';
  } else {
    const r = miniReward(frac * 1.5, frac * 1.5, Math.min(4, _oddScore));
    if(result) {
      result.textContent = `🔍 ${_oddScore} rodada${_oddScore !== 1 ? 's' : ''}!`;
      result.className = 'mini-result-box ' + (frac >= 0.6 ? 'win' : '');
    }
    if(reward && frac > 0) reward.textContent = `+${r.xpGain} XP · +${r.coinGain} 🪙`;
    vitals.humor = Math.min(100, vitals.humor + Math.round(8 * frac));
    scheduleSave();
  }

  if(again) again.style.display = 'inline-block';
}

// ── Render ─────────────────────────────────────────────────────────
function _oddRender() {
  const canvas = document.getElementById('oddCanvas');
  if(!canvas || !_oddItems.length) return;
  const ctx = canvas.getContext('2d');
  // Usa dimensões lógicas (CSS px) para o layout, independente do DPR
  const W   = canvas.clientWidth  || 280;
  const H   = canvas.clientHeight || 280;
  const cw  = W / _oddCols;
  const ch  = (H - ODD_TIMER_H) / _oddCols;
  const now = performance.now();

  // ── Checar tempo ──
  if(_oddRunning && !_oddOver) {
    const elapsed = (now - _oddRoundStart) + _oddPenalty;
    if(elapsed >= _oddMaxTime) {
      _oddRunning = false;
      _oddEnd();
    }
  }

  // ── Fundo ──
  ctx.fillStyle = '#060510';
  ctx.fillRect(0, 0, W, H);

  // ── Barra de timer ──
  const elapsed = _oddOver
    ? _oddMaxTime
    : Math.min(_oddMaxTime, (now - _oddRoundStart) + _oddPenalty);
  const frac  = Math.max(0, 1 - elapsed / _oddMaxTime);
  const bW    = W * frac;
  const bClr  = frac > 0.5 ? '#86efac' : frac > 0.22 ? '#fbbf24' : '#f87171';

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, W, ODD_TIMER_H);
  if(bW > 0) {
    ctx.fillStyle = bClr;
    ctx.fillRect(0, 0, bW, ODD_TIMER_H);
    // Glow na ponta
    if(bW > 16) {
      const grd = ctx.createLinearGradient(bW - 24, 0, bW, 0);
      grd.addColorStop(0, 'transparent');
      grd.addColorStop(1, bClr);
      ctx.fillStyle = grd;
      ctx.fillRect(bW - 24, 0, 24, ODD_TIMER_H);
    }
  }

  // ── Células ──
  const offsetY = ODD_TIMER_H;
  for(let i = 0; i < _oddItems.length; i++) {
    const item  = _oddItems[i];
    const gx    = i % _oddCols;
    const gy    = Math.floor(i / _oddCols);
    const px    = gx * cw;
    const py    = offsetY + gy * ch;
    const cx    = px + cw * 0.5;
    const cy    = py + ch * 0.5;
    const pad   = 3;

    // Fundo da célula
    let bgStyle = null;
    const isOdd = i === _oddDiffIdx;

    if(_oddFlash && _oddFlash.idx === i) {
      const ft = Math.min(1, (now - _oddFlash.start) / 420);
      const a  = _oddFlash.correct ? 0.4 * (1 - ft * 0.5) : 0.35 * (1 - ft);
      bgStyle  = _oddFlash.correct
        ? `rgba(134,239,172,${a.toFixed(2)})`
        : `rgba(248,113,113,${a.toFixed(2)})`;
    } else if(_oddReveal && isOdd) {
      const pulse = 0.18 + 0.12 * Math.sin(now / 120);
      bgStyle = `rgba(253,230,138,${pulse.toFixed(2)})`;
    } else if(_oddHoverIdx === i && _oddRunning) {
      bgStyle = 'rgba(255,255,255,0.07)';
    } else {
      bgStyle = 'rgba(255,255,255,0.025)';
    }

    ctx.fillStyle = bgStyle;
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(px + pad, py + pad, cw - pad*2, ch - pad*2, 6);
    else              ctx.rect(px + pad, py + pad, cw - pad*2, ch - pad*2);
    ctx.fill();

    // Borda sutil
    ctx.strokeStyle = (_oddReveal && isOdd)
      ? 'rgba(253,230,138,0.6)'
      : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Forma
    const baseR  = Math.min(cw, ch) * 0.29;
    const r      = baseR * item.size;
    const color  = ODD_COLORS[item.colorIdx];
    const stkW   = Math.max(2, r * 0.18);

    ctx.save();
    ctx.translate(cx, cy);
    if(item.rot !== 0) ctx.rotate(item.rot * Math.PI / 180);
    _oddDrawShape(ctx, ODD_SHAPES[item.shape], r, item.filled, color, stkW);
    ctx.restore();
  }
}

// ── Desenhar forma (ctx centrado em 0,0) ───────────────────────────
function _oddDrawShape(ctx, shape, r, filled, color, strokeW) {
  const PI2 = Math.PI * 2;

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur  = filled ? r * 0.55 : r * 0.35;

  ctx.beginPath();
  switch(shape) {
    case 'circle':
      ctx.arc(0, 0, r, 0, PI2);
      break;
    case 'triangle':
      for(let i = 0; i < 3; i++) {
        const a = (i / 3) * PI2 - Math.PI / 2;
        i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
                : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64);
      break;
    case 'pentagon':
      for(let i = 0; i < 5; i++) {
        const a = (i / 5) * PI2 - Math.PI / 2;
        i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
                : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'star':
      for(let i = 0; i < 10; i++) {
        const a  = (i / 10) * PI2 - Math.PI / 2;
        const ri = i % 2 === 0 ? r : r * 0.42;
        i === 0 ? ctx.moveTo(ri * Math.cos(a), ri * Math.sin(a))
                : ctx.lineTo(ri * Math.cos(a), ri * Math.sin(a));
      }
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.62, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r * 0.62, 0);
      ctx.closePath();
      break;
    case 'hexagon':
      for(let i = 0; i < 6; i++) {
        const a = (i / 6) * PI2;
        i === 0 ? ctx.moveTo(r * Math.cos(a), r * Math.sin(a))
                : ctx.lineTo(r * Math.cos(a), r * Math.sin(a));
      }
      ctx.closePath();
      break;
  }

  if(filled) {
    ctx.fillStyle = color;
    ctx.fill();
    ctx.shadowBlur = 0;
    // Brilho interno (top-left)
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.beginPath();
    ctx.arc(-r * 0.22, -r * 0.26, r * 0.20, 0, PI2);
    ctx.fill();
  } else {
    ctx.lineWidth   = strokeW;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.shadowBlur  = 0;
  }

  ctx.shadowBlur = 0;
}

// ── RAF loop ───────────────────────────────────────────────────────
(function _oddLoop() {
  if(_oddRunning || _oddOver || _oddReveal || _oddFlash || _oddItems.length > 0) {
    _oddRender();
  }
  requestAnimationFrame(_oddLoop);
})();
