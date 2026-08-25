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

// ═══════════════════════════════════════════════════════════════════
// OS BOTÕES DIZEM-SE
//
// Antes ficavam todos iguais em qualquer estado — sem moedas, com a
// fome cheia, sem energia — e só o clique explicava porque não dava.
// Agora a linha de baixo diz o custo, ou a razão de estar apagado.
//
// Apagados mas CLICÁVEIS de propósito: o balão do bicho ("estou
// satisfeito!", "sem moedas...") é metade da graça do jogo, e cortar o
// clique cortava-o. O que muda é já não ser preciso clicar para saber.
//
// Serve as duas larguras: aos ≤768px a .fv-bottom-nav está desligada
// (ver css/mobile-index.css:458) e o telemóvel usa estes mesmos botões,
// inline no cartão do bicho.
// ═══════════════════════════════════════════════════════════════════
function estadoDasAccoes() {
  const vivo = (typeof hatched !== 'undefined' && hatched) &&
               (typeof dead !== 'undefined' && !dead) && !!avatar;
  if(!vivo) return null;
  const aDormir = (typeof sleeping !== 'undefined') && sleeping;
  const v = vitals, m = gs.moedas;

  return {
    feed:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : v.fome >= 100 ? { pode:false, sub:t('act.sub.cheio') }
         : m < CUSTO_NUTRIR ? { pode:false, sub:`${CUSTO_NUTRIR} 🪙`, semMoedas:true }
         : { pode:true, sub:`${CUSTO_NUTRIR} 🪙` },

    play:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : v.fome < 10 ? { pode:false, sub:t('act.sub.com_fome') }
         : v.energia < 10 ? { pode:false, sub:t('act.sub.sem_forcas') }
         : { pode:true, sub:'' },

    // Dormir nunca fica indisponível a dormir: é o botão de acordar.
    sleep: aDormir ? { pode:true, sub:'' }
         : v.energia >= 100 ? { pode:false, sub:t('act.sub.sem_sono') }
         : { pode:true, sub:'' },

    heal:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : (v.saude >= 100 && !sick) ? { pode:false, sub:t('act.sub.saudavel') }
         : m < CUSTO_MEDICAR ? { pode:false, sub:`${CUSTO_MEDICAR} 🪙`, semMoedas:true }
         : { pode:true, sub:`${CUSTO_MEDICAR} 🪙` },

    bath:  aDormir ? { pode:false, sub:t('act.sub.dormindo') }
         : v.energia < BANHO_ENERGIA ? { pode:false, sub:`${BANHO_ENERGIA} ⚡`, semForca:true }
         : v.higiene >= 100 ? { pode:false, sub:t('act.sub.limpo') }
         : { pode:true, sub:`−${BANHO_ENERGIA} ⚡` },
  };
}

function atualizarBotoesDeAccao() {
  const est = estadoDasAccoes();
  const pares = [['btnFeed','subFeed','feed'], ['btnPlay','subPlay','play'],
                 ['btnSleep','subSleep','sleep'], ['btnHeal','subHeal','heal'],
                 ['btnBath','subBath','bath']];
  for(const [btnId, subId, chave] of pares) {
    const btn = document.getElementById(btnId), sub = document.getElementById(subId);
    if(!btn) continue;
    const e = est && est[chave];
    btn.classList.toggle('indisponivel', !!(e && !e.pode));
    btn.classList.toggle('em-falta',     !!(e && (e.semMoedas || e.semForca)));
    if(sub) sub.textContent = e ? e.sub : '';
  }
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
  document.getElementById('nivelTxt').textContent = t('ui.nivel', {n: nivel});

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
  atualizarBotoesDeAccao();

  // Botões de inventário
  const _eggBtn  = document.getElementById('resOvosBtn');
  const _coinBtn = document.getElementById('resMoedasBtn');
  if(_eggBtn)  { (eggsInInventory.length > 0 || (hatched && !dead)) ? _eggBtn.classList.remove('disabled')  : _eggBtn.classList.add('disabled');  }
  if(_coinBtn) { hatched && !dead ? _coinBtn.classList.remove('disabled') : _coinBtn.classList.add('disabled'); }
}

function updateResourceUI() {
  document.getElementById('resMonedas').textContent = gs.moedas;
  const cristaisEl = document.getElementById('resCristais');
  if(cristaisEl) cristaisEl.textContent = fmtC(gs.cristais || 0);
  document.getElementById('resOvos').textContent = eggsInInventory.length;
  const resItems = document.getElementById('resItems');
  if(resItems) resItems.textContent = itemInventory.length;
  const btn = document.getElementById('btnSummon');
  if(btn) btn.disabled = false;
  // As primeiras INVOCACOES_GRATIS são grátis; a partir daí o botão mostra o preço
  const _custoInv = typeof custoDaInvocacao === 'function' ? custoDaInvocacao() : 0;
  document.getElementById('btnSummonLabel').textContent =
    _custoInv > 0 ? t('ui.summon_btn_paid', { cost: _custoInv }) : t('ui.summon_btn');
  // Se o preço estiver fora do alcance, explica porquê e dá a saída
  if(typeof updateSummonLockHint === 'function') updateSummonLockHint();
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
  if(!hatched || dead || sleeping) { el.textContent = sleeping ? t('ui.sleeping') : '—'; el.style.color = 'var(--muted)'; return; }

  // A saúde só cai por doença activa (ver js/gametick.js), então o tempo de
  // vida estimado é: ciclos até um vital ficar crítico + ciclos de descuido
  // sustido até a doença activar (DISEASE_STRESS_THRESHOLD) + ciclos até a
  // saúde esgotar sob o dreno da doença (DISEASE_DECAY_PER_CYCLE).
  if(activeDiseases.length > 0) {
    const secsLeft = Math.round((vitals.saude / (DISEASE_DECAY_PER_CYCLE * activeDiseases.length)) * 60);
    el.style.color  = secsLeft < 1800 ? '#e74c3c' : '#c9a84c';
    el.textContent  = _fmtTime(secsLeft);
    return;
  }

  const _d = rarityBonus().decay * GAME_SPEED;
  const vitalDecay = {
    energia: 0.6  * _d,
    fome:    0.8  * _d * getItemEffect('fomeDecayMult'),
    higiene: 0.12 * GAME_SPEED,
    humor:   0.5  * _d,
  };

  let minCyclesUntilDisease = Infinity;
  for(const id in DISEASES) {
    const { vital, limiar } = DISEASES[id];
    const current = vitals[vital];
    const cyclesUntilCrit = current > limiar ? (current - limiar) / vitalDecay[vital] : 0;
    const stressCyclesLeft = cyclesUntilCrit > 0
      ? DISEASE_STRESS_THRESHOLD
      : Math.max(0, DISEASE_STRESS_THRESHOLD - diseaseStress[id]);
    minCyclesUntilDisease = Math.min(minCyclesUntilDisease, cyclesUntilCrit + stressCyclesLeft);
  }

  if(minCyclesUntilDisease === Infinity) { el.textContent = t('ui.stable'); el.style.color = '#7ab87a'; return; }

  const cyclesAfterDisease = vitals.saude / DISEASE_DECAY_PER_CYCLE;
  const totalSecs = Math.round((minCyclesUntilDisease + cyclesAfterDisease) * 60);
  el.style.color  = totalSecs < 3600 ? '#e74c3c' : totalSecs < 7200 ? '#c9a84c' : '#7ab87a';
  el.textContent  = _fmtTime(totalSecs);
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
    descEl.textContent           = (avatar.descricaoIdx != null ? getAvatarDesc(avatar.raridade, avatar.elemento, avatar.descricaoIdx) : avatar.descricao) || '';
    descEl.style.borderLeftColor = car ? car.cor : 'var(--border)';
    descEl.style.color           = car ? car.cor + 'bb' : '#887799';
  }

  const bonusBlock = document.getElementById('elemBonusBlock');
  const bonusTxt   = document.getElementById('elemBonusTxt');
  const bonusLabel = document.getElementById('elemBonusLabel');
  // `car` sozinho basta como porteiro: um avatar antigo com um elemento
  // que já não existe não tem entrada aqui, e o bloco não aparece — que
  // era exactamente o que o antigo `car?.bonus` fazia.
  if(bonusBlock && bonusTxt && car) {
    bonusTxt.textContent              = t('elem.bonus.' + avatar.elemento);
    bonusTxt.style.color              = car.cor + 'cc';
    bonusLabel.style.color            = car.cor;
    bonusBlock.style.borderColor      = car.cor + '33';
    bonusBlock.style.backgroundColor  = car.cor + '0d';
    bonusBlock.style.display          = '';
  } else if(bonusBlock) {
    bonusBlock.style.display = 'none';
  }

  const rb   = rarityBonus();
  const rbEl = document.getElementById('rarityBonusTxt');
  if(rbEl) {
    if(avatar.raridade !== 'Comum') {
      rbEl.textContent   = t('ui.rarity_bonus', {eggs: rb.eggs, xp: rb.xp, decay: Math.round((1-rb.decay)*100)});
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
    badge2.textContent = t('ui.active_slot', {n: activeSlotIdx + 1});
  }

  // Badge ⚖️ JURADO
  let _jb = document.getElementById('idBadgeJurado');
  if(gs?.jurado) {
    if(!_jb) {
      _jb = document.createElement('span');
      _jb.id = 'idBadgeJurado';
      _jb.style.cssText = "font-size:7px;font-family:'Cinzel',serif;color:#a78bfa;border:1px solid rgba(167,139,250,.4);background:rgba(167,139,250,.08);padding:2px 6px;border-radius:6px;letter-spacing:.5px;flex-shrink:0;";
      _jb.textContent = '⚖️ JURADO';
      const _row = document.getElementById('idBadgesRow');
      if(_row) _row.insertBefore(_jb, document.getElementById('nivelTxt'));
    }
  } else if(_jb) { _jb.remove(); }
}

function updatePhaseLabel() {
  const _pl = document.getElementById('phaseLabel');
  if(!_pl) return;
  const fase = FASES[getFase()];
  _pl.textContent = t('gt.phase.label', {fase});
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

// ═══════════════════════════════════════════════════════════════════
// RECONSTRUIR ECRÃS AO TROCAR DE SLOT
//
// A lógica que decide qual ecrã mostrar (inicial / ovo / vivo / morto)
// só existia dentro do _onLoginSuccess, portanto trocar de slot mudava
// o estado mas deixava a interface a mostrar o avatar anterior — só um
// refresh à página é que corrigia.
//
// Chamada pelo switchSlot() em state.js.
// ═══════════════════════════════════════════════════════════════════
function rebuildScreensParaSlot() {
  const $ = id => document.getElementById(id);
  const set = (id, v) => { const el = $(id); if(el) el.style.display = v; };
  const btns = $('actionBtns');

  if(!avatar) {
    // Slot vazio — volta ao ecrã inicial com o painel de invocar
    set('idleScreen','flex'); set('eggScreen','none');
    set('aliveScreen','none'); set('deadScreen','none');
    set('creatureCard','none'); set('statusCard','none');
    set('summonCard','block');
    if(walletAddress) set('summonSection','block');
    const b = $('btnSummon'); if(b) b.disabled = false;
    if(btns) { btns.style.opacity = '0'; btns.style.pointerEvents = 'none'; }
    const pc = $('poopContainer'); if(pc) pc.innerHTML = '';
    if(typeof updateResourceUI === 'function') updateResourceUI();
    return;
  }

  if(dead) {
    set('idleScreen','none'); set('eggScreen','none');
    set('aliveScreen','none'); set('deadScreen','flex');
    set('summonCard','none'); set('creatureCard','none'); set('statusCard','none');
    if(btns) { btns.style.opacity = '0'; btns.style.pointerEvents = 'none'; }
    if(typeof updateResourceUI === 'function') updateResourceUI();
    return;
  }

  if(!hatched) {
    // Ovo por chocar — setupAvatar já põe os ecrãs certos
    if(typeof setupAvatar === 'function') setupAvatar();
    if(typeof updateResourceUI === 'function') updateResourceUI();
    return;
  }

  // Avatar vivo
  if(typeof setupAvatar === 'function') setupAvatar();
  set('idleScreen','none'); set('eggScreen','none');
  set('aliveScreen','block'); set('deadScreen','none');
  set('summonCard','none'); set('creatureCard','block'); set('statusCard','block');
  if(btns) { btns.style.opacity = '1'; btns.style.pointerEvents = 'all'; }
  const svg = $('creatureSVG');
  if(svg) svg.innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed,
                                   getFaseSize(), getFaseSize(), getFase());
  if(typeof updateAvatarSize === 'function') updateAvatarSize();
  const pl = $('phaseLabel');
  if(pl) pl.textContent = t('gt.phase.label', {fase: FASES[getFase()]});
  const pc = $('poopContainer'); if(pc) pc.innerHTML = '';
  if(typeof updateDirtyVisuals === 'function') updateDirtyVisuals();
  if(typeof updateEquippedDisplay === 'function') updateEquippedDisplay();
  if(typeof updateAllUI === 'function') updateAllUI();
  if(typeof updateResourceUI === 'function') updateResourceUI();
  if(sleeping && typeof startSleep === 'function') startSleep();
}
