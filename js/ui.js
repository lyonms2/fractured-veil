// ═══════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════

// Mobile hero card: move #creatureCard para dentro de .device e usa
// display:contents + order para fundir animação e stats num único card.
(function() {
  let _heroReady = false;

  function setupMobileHero() {
    if (_heroReady) return;
    if (window.innerWidth > 768) return;
    const device = document.querySelector('.device');
    const cc     = document.getElementById('creatureCard');
    if (!device || !cc) return;

    // Move creatureCard para dentro de .device (após actionBtns)
    device.appendChild(cc);
    _heroReady = true;
  }

  function syncHeroClass() {
    const cc = document.getElementById('creatureCard');
    if (!cc) return;
    const visible = cc.style.display !== 'none';
    document.body.classList.toggle('fv-has-creature', visible);
    if (visible) setupMobileHero();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const cc = document.getElementById('creatureCard');
    if (!cc) return;
    new MutationObserver(syncHeroClass).observe(cc, { attributes: true, attributeFilter: ['style'] });
    syncHeroClass();
  });
})();
function setBar(id, val, miniId) {
  // Suporte às novas barras do status-cards-grid (sci-fill) E às antigas (stat-fill)
  const b  = document.getElementById(id);
  const v  = document.getElementById('val' + id.replace('bar',''));
  if(b) {
    b.style.width = val + '%';
    val < 25 ? b.classList.add('critical') : b.classList.remove('critical');
  }
  if(v) v.textContent = Math.floor(val);
  if(miniId) { const m = document.getElementById(miniId); if(m) m.style.width = val + '%'; }
}

function updateAllUI() {
  setBar('barFome',    vitals.fome);
  setBar('barHumor',   vitals.humor);
  setBar('barEnergia', vitals.energia);
  setBar('barSaude',   vitals.saude);
  setBar('barHigiene', vitals.higiene);

  const xpNeeded  = xpParaNivel(nivel);
  const xpPctReal = Math.min(100, (xp / xpNeeded) * 100);
  document.getElementById('xpFill').style.width = xpPctReal + '%';
  document.getElementById('xpTxt').textContent  = `${Math.floor(xp)}/${xpNeeded}`;
  document.getElementById('nivelTxt').textContent = `NÍVEL ${nivel}`;

  // Vínculo
  const vt    = getVinculoTier();
  const vNext = VINCULO_TIERS.find(t => t.min > vinculo);
  const vPrev = vt.min;
  const vPct  = vNext ? Math.min(100, ((vinculo - vPrev) / (vNext.min - vPrev)) * 100) : 100;
  const vFill = document.getElementById('vinculoFill');
  const vTxt  = document.getElementById('vinculoTxt');
  if(vFill) { vFill.style.width = vPct + '%'; vFill.style.background = `linear-gradient(90deg,${vt.cor},#c870e8)`; }
  if(vTxt)  vTxt.textContent = `${vt.label} · ${Math.floor(vinculo)}`;

  updateResourceUI();
  updateLifeEstimate();

  // Botões de inventário
  const _eggBtn  = document.getElementById('resOvosBtn');
  const _coinBtn = document.getElementById('resMoedasBtn');
  if(_eggBtn)  { (eggsInInventory.length > 0 || (hatched && !dead)) ? _eggBtn.classList.remove('disabled')  : _eggBtn.classList.add('disabled');  }
  if(_coinBtn) { hatched && !dead ? _coinBtn.classList.remove('disabled') : _coinBtn.classList.add('disabled'); }
}

function updateResourceUI() {
  document.getElementById('resMonedas').textContent = gs.moedas;
  const cristaisEl = document.getElementById('resCristais');
  if(cristaisEl) cristaisEl.textContent = gs.cristais || 0;
  document.getElementById('resOvos').textContent = eggsInInventory.length;
  const resItems = document.getElementById('resItems');
  if(resItems) resItems.textContent = itemInventory.length;
  const btn = document.getElementById('btnSummon');
  if(btn) btn.disabled = false;
  document.getElementById('btnSummonLabel').textContent = '▶ Invocar Avatar (Gratuito)';
  // FIX: actualiza visibilidade dos botões do header após qualquer mudança de estado
  if(typeof updateHeaderButtons === 'function' && walletAddress) updateHeaderButtons();
}

function showBubble(txt) {
  const b = document.getElementById('bubble');
  if(!b) return;
  b.textContent = txt; b.classList.add('show');
  clearTimeout(window._bt);
  window._bt = setTimeout(() => b.classList.remove('show'), 2200);
}

function showFloat(txt, color = '#c9a84c') {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'float-text'; el.textContent = txt; el.style.color = color;
  el.style.left = '50%'; el.style.top = '0';
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

let _currentAnim = null;
let _animTimeout = null;

function playAnim(cls, persist = false) {
  const w = document.getElementById('creatureWrap');
  if(!w) return;
  // Remove animação anterior sem tocar nas classes persistentes (diseased, dirty-creature, sleeping…)
  if(_currentAnim) { w.classList.remove(_currentAnim); }
  clearTimeout(_animTimeout);
  _currentAnim = cls;
  _animTimeout = null;
  w.classList.add(cls);
  if(!persist) {
    _animTimeout = setTimeout(() => {
      w.classList.remove(cls);
      if(_currentAnim === cls) _currentAnim = null;
      _animTimeout = null;
    }, 900);
  }
}
function resetAnim() {
  const w = document.getElementById('creatureWrap');
  clearTimeout(_animTimeout);
  if(w && _currentAnim) w.classList.remove(_currentAnim);
  _currentAnim = null;
  _animTimeout = null;
}

function addLog(msg, type = '') {
  const list = document.getElementById('logList');
  const li   = document.createElement('li');
  li.className = 'log-item ' + type;
  const t = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  li.textContent = `[${t}] ${msg}`;
  list.insertBefore(li, list.firstChild);
  while(list.children.length > 25) list.removeChild(list.lastChild);
}

// ═══════════════════════════════════════════
// STARS BACKGROUND
// ═══════════════════════════════════════════
(function(){
  const cv = document.getElementById('starCanvas');
  if(!cv) return;

  const isMobile   = window.innerWidth <= 680;
  const STAR_COUNT = isMobile ? 60 : 140;

  const ctx = cv.getContext('2d');
  let W, H, stars = [], rafId = null, paused = false;

  function resize() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  function init() {
    stars = Array.from({length: STAR_COUNT}, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.1, a: Math.random(),
      sp: .002 + Math.random() * .005
    }));
  }
  function draw() {
    if(paused) return;
    ctx.clearRect(0, 0, W, H);
    const now = Date.now() / 1000;
    stars.forEach(s => {
      const al = .2 + .5 * Math.abs(Math.sin(now * s.sp + s.a * 100));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,190,240,${al})`; ctx.fill();
    });
    rafId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) {
      paused = true;
      if(rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      paused = false;
      draw();
    }
  });

  window.addEventListener('resize', () => { resize(); init(); });
  resize(); init(); draw();
})();

async function tryAutoReconnect() { /* desativado */ }

// ═══════════════════════════════════════════
// VIDA ESTIMADA
// ═══════════════════════════════════════════
function updateLifeEstimate() {
  const el = document.getElementById('lifeEstimateTxt');
  if(!el) return;
  if(!hatched || dead || sleeping) { el.textContent = sleeping ? '💤 dormindo' : '—'; el.style.color = 'var(--muted)'; return; }

  const _d = rarityBonus().decay * GAME_SPEED;
  let decayPerCycle = 0;
  if(vitals.fome    < 15) decayPerCycle += 0.3;
  if(vitals.humor   < 10) decayPerCycle += 0.1;
  if(vitals.energia < 5)  decayPerCycle += 0.1;
  if(vitals.higiene < 15) decayPerCycle += 0.04;
  if(dirtyLevel     >= 2) decayPerCycle += 0.04;

  if(decayPerCycle <= 0) {
    const fomeDecay    = 0.8  * _d * getItemEffect('fomeDecayMult');
    const humorDecay   = 0.5  * _d;
    const energiaDecay = 0.6  * _d;
    const higieneDecay = 0.12 * GAME_SPEED;

    const cyclesUntilFomeCrit    = vitals.fome    > 15 ? (vitals.fome    - 15) / fomeDecay    : 0;
    const cyclesUntilHumorCrit   = vitals.humor   > 10 ? (vitals.humor   - 10) / humorDecay   : 0;
    const cyclesUntilEnergiaCrit = vitals.energia > 5  ? (vitals.energia - 5)  / energiaDecay : 0;
    const cyclesUntilHigieneCrit = vitals.higiene > 15 ? (vitals.higiene - 15) / higieneDecay : 0;

    const minCycles = Math.min(
      cyclesUntilFomeCrit    || Infinity,
      cyclesUntilHumorCrit   || Infinity,
      cyclesUntilEnergiaCrit || Infinity,
      cyclesUntilHigieneCrit || Infinity
    );

    if(minCycles === Infinity) { el.textContent = '✅ estável'; el.style.color = '#7ab87a'; return; }

    const cyclesAfter = vitals.saude / 0.3;
    const totalSecs   = Math.round((minCycles + cyclesAfter) * 60);
    el.style.color    = totalSecs < 3600 ? '#e74c3c' : totalSecs < 7200 ? '#c9a84c' : '#7ab87a';
    el.textContent    = _fmtTime(totalSecs);
  } else {
    const cyclesLeft = vitals.saude / decayPerCycle;
    const secsLeft   = Math.round(cyclesLeft * 60);
    el.style.color   = secsLeft < 1800 ? '#e74c3c' : '#c9a84c';
    el.textContent   = _fmtTime(secsLeft);
  }
}

function _fmtTime(secs) {
  if(secs >= 86400) return Math.floor(secs/86400) + 'd ' + Math.floor((secs%86400)/3600) + 'h';
  if(secs >= 3600)  return Math.floor(secs/3600)  + 'h ' + Math.floor((secs%3600)/60)    + 'min';
  return Math.floor(secs/60) + 'min';
}

// ═══════════════════════════════════════════
// CREATURE CARD
// ═══════════════════════════════════════════
function fillCreatureCard() {
  if(!avatar) return;
  const car   = avatar.car || CARACTERISTICAS_ELEMENTAIS[avatar.elemento] || null;
  const parts = avatar.nome.split(',');
  const nome  = parts[0].trim();
  const sufixo = parts.slice(1).join(',').trim();

  document.getElementById('idNome').textContent = nome;
  const sfx = document.getElementById('idSufixo');
  if(sfx) sfx.textContent = sufixo || '';

  const meta = document.getElementById('idMeta');
  if(meta) meta.textContent = car ? `${car.emoji} ${avatar.elemento}` : avatar.elemento;

  const badge = document.getElementById('idBadge');
  if(badge) {
    badge.textContent = avatar.raridade.toUpperCase();
    badge.className   = `badge badge-${avatar.raridade}`;
  }

  const descEl = document.getElementById('idDesc');
  if(descEl) {
    descEl.textContent           = avatar.descricao || '';
    descEl.style.borderLeftColor = car ? car.cor : 'var(--border)';
    descEl.style.color           = car ? car.cor + 'bb' : '#887799';
  }

  const rb   = rarityBonus();
  const rbEl = document.getElementById('rarityBonusTxt');
  if(rbEl) {
    if(avatar.raridade !== 'Comum') {
      rbEl.textContent   = `🥚×${rb.eggs} · ⚡×${rb.xp} XP · 💚-${Math.round((1-rb.decay)*100)}% decay`;
      rbEl.style.display = '';
    } else {
      rbEl.style.display = 'none';
    }
  }

  // Stripe de raridade no topo do card
  const stripe = document.getElementById('creatureCardStripe');
  if(stripe) {
    stripe.className = `creature-card-stripe stripe-${avatar.raridade}`;
  }

  // Badge "ATIVO · SLOT X"
  const badge2 = document.getElementById('idBadge2');
  if(badge2) {
    badge2.textContent = `ATIVO · SLOT ${activeSlotIdx + 1}`;
  }
}

function updatePhaseLabel() {
  const _pl = document.getElementById('phaseLabel');
  if(!_pl) return;
  const fase = FASES[getFase()];
  _pl.textContent = 'FASE: ' + fase;
  const cls = { 'BEBÊ':'bebe', 'CRIANÇA':'crianca', 'JOVEM':'jovem', 'ADULTO':'adulto' };
  _pl.className = 'phase-label fase-' + (cls[fase] || 'bebe');
}

// ═══════════════════════════════════════════
// SICK VISUALS
// ═══════════════════════════════════════════
function updateSickVisuals() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  const isSick = (activeDiseases.length > 0 || sick) && hatched && !dead;
  wrap.classList.toggle('diseased', isSick);

  // Badges de doenças — injectadas por baixo do statusCard
  let badgesEl = document.getElementById('diseaseBadges');
  if(!badgesEl) {
    badgesEl = document.createElement('div');
    badgesEl.id = 'diseaseBadges';
    badgesEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;padding:2px 8px 6px;justify-content:center;';
    const statusCard = document.getElementById('statusCard');
    if(statusCard) statusCard.insertAdjacentElement('afterend', badgesEl);
  }

  if(!hatched || dead || (activeDiseases.length === 0 && !sick)) {
    badgesEl.innerHTML = '';
    return;
  }

  const badges = [];
  if(sick && activeDiseases.length === 0) {
    badges.push(`<span class="disease-badge" style="--d-cor:#e05050;">🤒 Doente</span>`);
  }
  activeDiseases.forEach(id => {
    const d = DISEASES[id];
    if(d) badges.push(`<span class="disease-badge" style="--d-cor:${d.cor};">${d.emoji} ${d.nome}</span>`);
  });
  badgesEl.innerHTML = badges.join('');
}

// ═══════════════════════════════════════════
// EQUIPPED ITEMS DISPLAY
// ═══════════════════════════════════════════
function updateEquippedDisplay() {
  const wrap = document.getElementById('equippedItemsDisplay');
  if(!wrap) return;
  const equipped = getEquippedItems();
  wrap.innerHTML = equipped.map(item =>
    `<span style="position:absolute;font-size:11px;opacity:.7;pointer-events:none;" title="${item.nome}">${item.emoji}</span>`
  ).join('');
}
