// ═══════════════════════════════════════════════════════════════════
// BLACKJACK ELEMENTAL
// Jogo de cartas contra o dealer. Chegue a 21 sem passar.
// Depende de: miniDifficulty(), miniReward(), applyGameCost(),
//             vitals, showBubble(), playSound(), ModalManager
// ═══════════════════════════════════════════════════════════════════

const _BJ_SUITS   = ['♠', '♥', '♦', '♣'];
const _BJ_RANKS   = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const _BJ_RED     = ['♥', '♦'];

// ── Estado ─────────────────────────────────────────────────────────
let _bjDeck          = [];
let _bjPlayer        = [];
let _bjDealer        = [];
let _bjPhase         = 'idle';   // 'deal' | 'player' | 'dealer' | 'over'
let _bjTier          = 0;
let _bjDoubled       = false;
let _bjResult        = '';       // 'win' | 'lose' | 'push'
let _bjWins          = 0;        // Modo Mestre: rounds vencidas
let _bjRoundsTarget  = 1;
let _bjDealAnim      = [];       // [{card, x0,y0, x1,y1, t, start}]
let _bjFlipAnim      = null;     // { t, start }
let _bjRunning       = false;

// ── Criação e embaralhamento ────────────────────────────────────────
function _bjCreateDeck() {
  const deck = [];
  for(const suit of _BJ_SUITS) {
    for(const rank of _BJ_RANKS) {
      const val = rank === 'A' ? 11 : ['J','Q','K'].includes(rank) ? 10 : parseInt(rank);
      deck.push({ suit, rank, val });
    }
  }
  // Embaralha Fisher-Yates
  for(let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function _bjDraw(hidden = false) {
  const card = _bjDeck.pop();
  card.hidden = hidden;
  return card;
}

// ── Calcula valor da mão (Ás adapta para evitar bust) ──────────────
function _bjValue(hand) {
  let total = 0, aces = 0;
  for(const c of hand) {
    if(c.hidden) continue;
    total += c.val;
    if(c.rank === 'A') aces++;
  }
  while(total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function _bjBust(hand)       { return _bjValue(hand) > 21; }
function _bjNatural(hand)    { return hand.length === 2 && _bjValue(hand) === 21; }

// ── Iniciar jogo ────────────────────────────────────────────────────
function startBlackjack() {
  if(vitals.energia < 10) {
    showBubble('Cansado demais... 😴');
    ModalManager.close('blackjackModal');
    return;
  }

  const d      = miniDifficulty();
  _bjTier      = d.tier;
  _bjDoubled   = false;
  _bjResult    = '';
  _bjDealAnim  = [];
  _bjFlipAnim  = null;
  _bjRunning   = true;

  // Modo Mestre: precisa de 3 vitórias no total
  if(_bjTier === 3 && _bjPhase === 'idle') {
    _bjWins          = 0;
    _bjRoundsTarget  = 3;
  } else if(_bjTier !== 3) {
    _bjWins          = 0;
    _bjRoundsTarget  = 1;
  }

  _bjPhase = 'deal';
  _bjDeck  = _bjCreateDeck();
  _bjPlayer = [];
  _bjDealer = [];

  _bjClearUI();
  document.getElementById('bjInfo').textContent =
    _bjTier === 3
      ? `${d.label} · Vença ${_bjRoundsTarget} rodadas (${_bjWins}/${_bjRoundsTarget})`
      : `${d.label} · Chegue a 21!`;

  _bjShowButtons(false);
  applyGameCost();

  // Anima a distribuição inicial (2 cartas cada)
  const now = performance.now();
  const CW = 280, CH = 280;
  const dealerY = 44, playerY = 170;
  const offsets = [-38, 38];

  // Player card 1, Dealer card 1, Player card 2, Dealer card 2 (hidden)
  const deals = [
    { to: 'player', hidden: false, delay: 0   },
    { to: 'dealer', hidden: false, delay: 180 },
    { to: 'player', hidden: false, delay: 360 },
    { to: 'dealer', hidden: true,  delay: 540 },
  ];

  const pCards = [], dCards = [];
  for(const deal of deals) {
    const card = _bjDraw(deal.hidden);
    if(deal.to === 'player') pCards.push(card);
    else                     dCards.push(card);
  }
  _bjPlayer = pCards;
  _bjDealer = dCards;

  // Monta animações
  for(let i = 0; i < 2; i++) {
    _bjDealAnim.push({ hand: 'player', idx: i, start: now + deals[i*2].delay });
    _bjDealAnim.push({ hand: 'dealer', idx: i, start: now + deals[i*2+1].delay });
  }

  // Após distribuição: verifica Blackjack natural ou vai para fase do jogador
  setTimeout(() => {
    if(!_bjRunning) return;
    _bjPhase = 'player';
    if(_bjNatural(_bjPlayer)) {
      // Player tem blackjack — revela dealer e resolve
      _bjDealerPlay();
    } else {
      _bjShowButtons(true);
    }
    _bjRender();
  }, 700);
}

// ── Ações do jogador ────────────────────────────────────────────────
function bjHit() {
  if(_bjPhase !== 'player' || !_bjRunning) return;
  playSound('feed');
  _bjPlayer.push(_bjDraw(false));

  if(_bjBust(_bjPlayer)) {
    _bjShowButtons(false);
    setTimeout(() => _bjEndRound('lose'), 400);
  } else if(_bjValue(_bjPlayer) === 21) {
    // Auto-stand em 21
    _bjShowButtons(false);
    setTimeout(() => _bjDealerPlay(), 300);
  }
}

function bjStand() {
  if(_bjPhase !== 'player' || !_bjRunning) return;
  _bjShowButtons(false);
  playSound('lore_choice');
  _bjDealerPlay();
}

function bjDouble() {
  if(_bjPhase !== 'player' || !_bjRunning) return;
  if(_bjPlayer.length !== 2) return; // só na mão inicial
  _bjDoubled = true;
  _bjShowButtons(false);
  playSound('feed');
  _bjPlayer.push(_bjDraw(false));
  if(_bjBust(_bjPlayer)) {
    setTimeout(() => _bjEndRound('lose'), 400);
  } else {
    setTimeout(() => _bjDealerPlay(), 400);
  }
}

// ── Fase do dealer ──────────────────────────────────────────────────
function _bjDealerPlay() {
  _bjPhase = 'dealer';
  // Revela a carta oculta
  const hidden = _bjDealer.find(c => c.hidden);
  if(hidden) {
    _bjFlipAnim = { start: performance.now(), card: hidden };
    setTimeout(() => {
      if(hidden) hidden.hidden = false;
      _bjFlipAnim = null;
      _bjDealerDrawNext();
    }, 350);
  } else {
    _bjDealerDrawNext();
  }
}

function _bjDealerDrawNext() {
  const dv = _bjValue(_bjDealer);
  const pv = _bjValue(_bjPlayer);
  const playerBust = _bjBust(_bjPlayer);

  // Dealer para em 17+ (soft 17 incluído)
  if(!playerBust && dv < 17) {
    setTimeout(() => {
      _bjDealer.push(_bjDraw(false));
      playSound('feed');
      _bjDealerDrawNext();
    }, 420);
  } else {
    setTimeout(() => _bjResolve(), 300);
  }
}

// ── Resolver resultado ──────────────────────────────────────────────
function _bjResolve() {
  const pv = _bjValue(_bjPlayer);
  const dv = _bjValue(_bjDealer);
  const playerBust  = pv > 21;
  const dealerBust  = dv > 21;
  const playerNat   = _bjNatural(_bjPlayer);
  const dealerNat   = _bjNatural(_bjDealer);

  let result;
  if(playerBust) {
    result = 'lose';
  } else if(dealerBust) {
    result = 'win';
  } else if(playerNat && !dealerNat) {
    result = 'blackjack';
  } else if(!playerNat && dealerNat) {
    result = 'lose';
  } else if(pv > dv) {
    result = 'win';
  } else if(pv < dv) {
    result = 'lose';
  } else {
    result = 'push';
  }

  _bjEndRound(result);
}

// ── Encerrar rodada ─────────────────────────────────────────────────
function _bjEndRound(result) {
  _bjPhase  = 'over';
  _bjResult = result;

  const resultEl = document.getElementById('bjResult');
  const rewardEl = document.getElementById('bjReward');
  const againBtn = document.getElementById('bjAgainBtn');

  const isWin = result === 'win' || result === 'blackjack';
  const isPush = result === 'push';

  if(isWin) _bjWins++;

  // Modo mestre: continua se ainda não atingiu o target
  const masterContinue = _bjTier === 3 && isWin && _bjWins < _bjRoundsTarget;

  if(masterContinue) {
    const d = miniDifficulty();
    resultEl.textContent = `♠ VENCEU! (${_bjWins}/${_bjRoundsTarget})`;
    resultEl.className   = 'mini-result-box win';
    rewardEl.textContent = '';
    playSound('win');
    showBubble(`${_bjWins}/${_bjRoundsTarget} ♠`);
    againBtn.style.display = 'inline-block';
    againBtn.textContent   = 'PRÓXIMA RODADA';
    againBtn.onclick       = () => _bjNextRound();
    return;
  }

  // Recompensas
  let xpMult = 0, coinMult = 0, vinculo = 0;
  let msg = '', label = '';

  if(result === 'blackjack') {
    xpMult = 1.5; coinMult = 1.5; vinculo = 5;
    label  = '♠ BLACKJACK!';
    msg    = 'Blackjack! ♠';
    playSound('win');
  } else if(result === 'win') {
    const mult = _bjDoubled ? 1.3 : 1.0;
    xpMult = mult; coinMult = mult; vinculo = 3;
    label  = _bjTier === 3
      ? `♠ ${_bjWins}/${_bjRoundsTarget} — VITÓRIA!`
      : '♠ VOCÊ VENCEU!';
    msg    = 'Venceu! ♠';
    playSound('win');
  } else if(result === 'push') {
    xpMult = 0.4; coinMult = 0.3; vinculo = 1;
    label  = '🤝 EMPATE';
    msg    = 'Empate 🤝';
    playSound('lore_choice');
  } else {
    label  = '💀 PERDEU';
    msg    = 'Perdeu... 💀';
    playSound('lose');
  }

  resultEl.className = 'mini-result-box ' + (isWin ? 'win' : isPush ? '' : 'lose');
  resultEl.textContent = label;

  if(isWin || isPush) {
    const r = miniReward(xpMult, coinMult, vinculo);
    rewardEl.textContent = `+${r.xpGain} XP · +${r.coinGain} 🪙`;
  } else {
    rewardEl.textContent = '';
  }

  showBubble(msg);
  againBtn.textContent = 'JOGAR DE NOVO';
  againBtn.onclick     = () => startBlackjack();
  againBtn.style.display = 'inline-block';

  _bjRunning = false;
}

// ── Próxima rodada (modo Mestre) ────────────────────────────────────
function _bjNextRound() {
  _bjDoubled  = false;
  _bjResult   = '';
  _bjDealAnim = [];
  _bjFlipAnim = null;
  _bjRunning  = true;
  _bjPhase    = 'deal';
  _bjDeck     = _bjCreateDeck();
  _bjPlayer   = [];
  _bjDealer   = [];

  const d = miniDifficulty();
  document.getElementById('bjInfo').textContent =
    `${d.label} · Vença ${_bjRoundsTarget} rodadas (${_bjWins}/${_bjRoundsTarget})`;

  _bjClearUI();
  _bjShowButtons(false);

  // Re-deal
  const now   = performance.now();
  const deals = [
    { to: 'player', hidden: false, delay: 0   },
    { to: 'dealer', hidden: false, delay: 180 },
    { to: 'player', hidden: false, delay: 360 },
    { to: 'dealer', hidden: true,  delay: 540 },
  ];

  const pCards = [], dCards = [];
  for(const deal of deals) {
    const card = _bjDraw(deal.hidden);
    if(deal.to === 'player') pCards.push(card);
    else                     dCards.push(card);
  }
  _bjPlayer = pCards;
  _bjDealer = dCards;

  setTimeout(() => {
    if(!_bjRunning) return;
    _bjPhase = 'player';
    if(_bjNatural(_bjPlayer)) {
      _bjDealerPlay();
    } else {
      _bjShowButtons(true);
    }
  }, 700);
}

// ── Helpers de UI ───────────────────────────────────────────────────
function _bjClearUI() {
  const resultEl = document.getElementById('bjResult');
  const rewardEl = document.getElementById('bjReward');
  const againBtn = document.getElementById('bjAgainBtn');
  if(resultEl) { resultEl.textContent = ''; resultEl.className = 'mini-result-box'; }
  if(rewardEl) rewardEl.textContent = '';
  if(againBtn) againBtn.style.display = 'none';

  // Buffer = tamanho CSS real × DPR → sem stretch, sem corte
  const canvas = document.getElementById('bjCanvas');
  if(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const sz  = canvas.offsetWidth || 280;
    canvas.width  = sz * dpr;
    canvas.height = sz * dpr;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function _bjShowButtons(show) {
  const wrap = document.getElementById('bjActionBtns');
  if(wrap) wrap.style.display = show ? 'flex' : 'none';
  // Double só disponível na mão inicial de 2 cartas
  const dbl = document.getElementById('bjDoubleBtn');
  if(dbl) dbl.style.display = (show && _bjPlayer.length === 2) ? 'inline-block' : 'none';
}

// ── Renderização ────────────────────────────────────────────────────
const _BJ_CW = 46, _BJ_CH = 64; // tamanho de cada carta (lógico, 280px base)

function _bjDrawCard(ctx, card, x, y, alpha = 1) {
  const W = _BJ_CW, H = _BJ_CH, R = 5;
  ctx.save();
  ctx.globalAlpha = alpha;

  if(card.hidden) {
    // Verso da carta
    ctx.fillStyle   = '#1e1b4b';
    ctx.strokeStyle = 'rgba(167,139,250,.5)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, W, H, R) : ctx.rect(x, y, W, H);
    ctx.fill(); ctx.stroke();

    // Padrão no verso
    ctx.strokeStyle = 'rgba(167,139,250,.25)';
    ctx.lineWidth = 0.5;
    for(let i = 4; i < W - 4; i += 6) {
      ctx.beginPath(); ctx.moveTo(x + i, y + 4); ctx.lineTo(x + i, y + H - 4); ctx.stroke();
    }
    ctx.restore(); return;
  }

  const isRed = _BJ_RED.includes(card.suit);
  const bg    = '#f8f8f2';
  const fg    = isRed ? '#dc2626' : '#1a1a2e';

  // Fundo
  ctx.fillStyle   = bg;
  ctx.strokeStyle = isRed ? 'rgba(220,38,38,.35)' : 'rgba(26,26,46,.25)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y, W, H, R) : ctx.rect(x, y, W, H);
  ctx.fill(); ctx.stroke();

  // Rank (topo esquerdo e base direito)
  ctx.fillStyle  = fg;
  ctx.font       = `bold 9px 'Segoe UI', sans-serif`;
  ctx.textAlign  = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, x + 3, y + 2);
  ctx.fillText(card.suit, x + 3, y + 11);

  // Rank invertido (base direita)
  ctx.save();
  ctx.translate(x + W - 3, y + H - 2);
  ctx.rotate(Math.PI);
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, 0, 0);
  ctx.fillText(card.suit, 0, 9);
  ctx.restore();

  // Símbolo central
  ctx.fillStyle    = fg;
  ctx.font         = `18px 'Segoe UI', sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.suit, x + W / 2, y + H / 2);

  ctx.restore();
}

function _bjRender() {
  const canvas = document.getElementById('bjCanvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W   = canvas.clientWidth  || 280;
  const H   = canvas.clientHeight || 280;
  const now = performance.now();

  // Fundo
  ctx.fillStyle = '#0a1a0f';
  ctx.fillRect(0, 0, W, H);

  // Mesa (felt)
  const grad = ctx.createRadialGradient(W/2, H/2, 20, W/2, H/2, 160);
  grad.addColorStop(0, 'rgba(22,101,52,.7)');
  grad.addColorStop(1, 'rgba(5,46,22,.7)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if(_bjPhase === 'idle') return;

  const pv = _bjValue(_bjPlayer);
  const dv = _bjValue(_bjDealer);

  // ── Labels ──────────────────────────────────────────────────────
  ctx.font      = `bold 8px 'Cinzel', serif`;
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('DEALER', 8, 8);
  ctx.fillText('VOCÊ',   8, H / 2 + 8);

  // Valor do dealer (só mostra quando revelado ou fase over)
  const showDealerFull = _bjPhase === 'dealer' || _bjPhase === 'over';
  if(showDealerFull) {
    const bust = dv > 21;
    ctx.font      = `bold 9px 'Cinzel', serif`;
    ctx.fillStyle = bust ? '#f87171' : '#86efac';
    ctx.textAlign = 'right';
    ctx.fillText(bust ? `${dv} BUST` : `${dv}`, W - 8, 8);
  } else {
    // Mostra apenas a carta visível
    const visVal = _bjDealer.filter(c => !c.hidden).reduce((s, c) => {
      let v = c.val; return s + v;
    }, 0);
    ctx.font      = `bold 9px 'Cinzel', serif`;
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.textAlign = 'right';
    ctx.fillText(`${visVal}+?`, W - 8, 8);
  }

  // Valor do jogador
  ctx.font      = `bold 9px 'Cinzel', serif`;
  ctx.textAlign = 'right';
  const bust    = pv > 21;
  ctx.fillStyle = bust ? '#f87171' : pv === 21 ? '#fde68a' : '#86efac';
  ctx.fillText(bust ? `${pv} BUST` : pv === 21 ? '21 ★' : `${pv}`, W - 8, H / 2 + 8);

  // ── Cartas dealer ─────────────────────────────────────────────
  const dealerY  = 22;
  const playerY  = H / 2 + 22;
  const maxCards = 6;
  const spread   = Math.min(_BJ_CW + 6, (W - 20) / Math.max(_bjDealer.length, 2));

  const dStartX = W / 2 - ((_bjDealer.length - 1) * spread + _BJ_CW) / 2;
  for(let i = 0; i < _bjDealer.length; i++) {
    const card = _bjDealer[i];
    const cx   = dStartX + i * spread;

    // Flip animation na carta oculta
    if(_bjFlipAnim && card === _bjFlipAnim.card) {
      const ft = Math.min(1, (now - _bjFlipAnim.start) / 350);
      const scaleX = Math.abs(Math.cos(ft * Math.PI));
      ctx.save();
      ctx.translate(cx + _BJ_CW / 2, dealerY + _BJ_CH / 2);
      ctx.scale(scaleX, 1);
      ctx.translate(-_BJ_CW / 2, -_BJ_CH / 2);
      _bjDrawCard(ctx, ft < 0.5 ? { ...card, hidden: true } : { ...card, hidden: false }, 0, 0);
      ctx.restore();
    } else {
      _bjDrawCard(ctx, card, cx, dealerY);
    }
  }

  // ── Cartas jogador ─────────────────────────────────────────────
  const pSpread  = Math.min(_BJ_CW + 6, (W - 20) / Math.max(_bjPlayer.length, 2));
  const pStartX  = W / 2 - ((_bjPlayer.length - 1) * pSpread + _BJ_CW) / 2;
  for(let i = 0; i < _bjPlayer.length; i++) {
    _bjDrawCard(ctx, _bjPlayer[i], pStartX + i * pSpread, playerY);
  }

  // ── Resultado overlay ─────────────────────────────────────────
  if(_bjPhase === 'over') {
    const res = _bjResult;
    const color = res === 'win' || res === 'blackjack'
      ? 'rgba(134,239,172,.15)'
      : res === 'push' ? 'rgba(253,230,138,.10)' : 'rgba(248,113,113,.12)';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  }

  // Divisória
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(12, H / 2 - 2); ctx.lineTo(W - 12, H / 2 - 2); ctx.stroke();
}

// ── RAF loop ───────────────────────────────────────────────────────
(function _bjLoop() {
  if(_bjPhase !== 'idle') _bjRender();
  requestAnimationFrame(_bjLoop);
})();

// ── Exports ───────────────────────────────────────────────────────
window.startBlackjack = startBlackjack;
window.bjHit          = bjHit;
window.bjStand        = bjStand;
window.bjDouble       = bjDouble;
