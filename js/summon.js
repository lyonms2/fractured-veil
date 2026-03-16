// ═══════════════════════════════════════════
// SUMMON SYSTEM
// ═══════════════════════════════════════════
function triggerSummon() {
  if(!walletAddress) { addLog('Conecte a MetaMask primeiro!','bad'); showBubble('Precisa da MetaMask! 🦊'); return; }
  const btn = document.getElementById('btnSummon');
  if(!btn || btn.disabled) return;
  btn.disabled = true;

  // Always free — raridade Comum unless player has eggs to hatch
  const raridade = 'Comum';
  const elemento = escolherElemento();
  const car      = CARACTERISTICAS_ELEMENTAIS[elemento];
  const prefPool = PREFIXOS[elemento][raridade];
  const nome     = `${rnd(prefPool)}, ${rnd(SUFIXOS[raridade])}`;
  const descricao= rnd(DESCRICOES[raridade][elemento]);
  // Seed fiel ao original: hash de (nome + elemento), sem raridade, para manter aparência ao evoluir
  let _h = 0;
  const _str = nome + elemento;
  for(let i=0;i<_str.length;i++){ const c=_str.charCodeAt(i); _h=((_h<<5)-_h)+c; _h=_h&_h; }
  const seed = Math.abs(_h);

  // Reset state for new avatar
  dead = false; hatched = false; sick = false; sleeping = false;
  nivel = 1; xp = 0; vinculo = 0; totalSecs = 0; tickCount = 0;
  eggClicks = 0; eggLayCooldown = 0;
  poopCount = 0; dirtyLevel = 0; poopPressure = 0;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  document.getElementById('poopContainer').innerHTML = '';

  // Write new avatar directly into active slot
  while(avatarSlots.length <= activeSlotIdx) avatarSlots.push(null);
  avatarSlots[activeSlotIdx] = {
    nome, elemento, raridade, descricao, car, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    eggLayCooldown: 0, petCooldown: 0,
    vitals: {fome:100, humor:100, energia:100, saude:100, higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
  };

  // ── CINEMATIC SUMMON OVERLAY ──
  const ov         = document.getElementById('summonOverlay');
  const ovBg       = document.getElementById('ovBg');
  const r1         = document.getElementById('ovRing1');
  const r2         = document.getElementById('ovRing2');
  const r3         = document.getElementById('ovRing3');
  const ovAv       = document.getElementById('ovAvatar');
  const ovParts    = document.getElementById('ovParticles');
  const ovRarLbl   = document.getElementById('ovRarityLabel');
  const ovNamLbl   = document.getElementById('ovNameLabel');
  const cor        = car ? car.cor : '#8b5cf6';

  const rarColors  = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const rarNames   = { 'Comum':'◆ COMUM ◆', 'Raro':'◈ RARO ◈', 'Lendário':'✦ LENDÁRIO ✦' };
  const rarColor   = rarColors[raridade] || '#ffffff';

  // Reset everything
  ovAv.style.cssText = 'width:200px;height:200px;opacity:0;transform:scale(.05) rotate(-15deg);transition:none;display:flex;align-items:center;justify-content:center;';
  r1.style.cssText = r2.style.cssText = r3.style.cssText = 'position:absolute;border-radius:50%;opacity:0;border:1px solid transparent;';
  ovRarLbl.classList.remove('show');
  ovNamLbl.classList.remove('show');
  ovParts.innerHTML  = '';
  ovBg.style.opacity = '0';

  // Rarity label = raridade + elemento (sem revelar o avatar)
  const elemEmoji = car ? car.emoji : '✦';
  ovRarLbl.textContent = rarNames[raridade];
  ovRarLbl.style.color = rarColor;
  ovNamLbl.textContent = `${elemEmoji} ${elemento.toUpperCase()}`;

  // ── OVO estilizado com cor do elemento — sem revelar o avatar ──
  const eggSVG = `<svg viewBox="0 0 120 140" width="120" height="140">
    <defs>
      <radialGradient id="ovEggG" cx="38%" cy="30%" r="72%">
        <stop offset="0%" stop-color="${cor}" stop-opacity=".9"/>
        <stop offset="55%" stop-color="${cor}" stop-opacity=".35"/>
        <stop offset="100%" stop-color="#04030a" stop-opacity="1"/>
      </radialGradient>
      <filter id="ovEggGlow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="60" cy="74" rx="42" ry="52" fill="url(#ovEggG)" filter="url(#ovEggGlow)"/>
    <ellipse cx="60" cy="74" rx="42" ry="52" fill="none" stroke="${cor}" stroke-width="1.5" opacity=".5"/>
    <ellipse cx="48" cy="52" rx="10" ry="16" fill="${cor}" opacity=".15"/>
    <text x="60" y="82" text-anchor="middle" font-size="32" opacity=".7">${elemEmoji}</text>
  </svg>`;
  ovAv.innerHTML = eggSVG;

  // Particles com cor do elemento
  const numParts = raridade === 'Lendário' ? 30 : raridade === 'Raro' ? 18 : 10;
  for(let i = 0; i < numParts; i++) {
    const p  = document.createElement('div');
    const sz = 2 + Math.random() * 5;
    p.className = 'ov-particle';
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${10+Math.random()*80}%;bottom:-10px;background:${cor};box-shadow:0 0 ${sz*2}px ${cor};animation-duration:${2.5+Math.random()*3}s;animation-delay:${Math.random()*2}s;`;
    ovParts.appendChild(p);
  }

  // ── PHASE 1 (0ms): Overlay fades in ──
  ov.classList.add('active');
  setTimeout(() => { ovBg.style.opacity = '1'; }, 50);

  // ── PHASE 2 (400ms): Rings appear ──
  setTimeout(() => {
    r1.style.cssText = `position:absolute;inset:10px;border-radius:50%;border:2px solid ${cor};opacity:0;animation:pspin 3s linear infinite;box-shadow:0 0 20px ${cor}50,inset 0 0 20px ${cor}20;transition:opacity .5s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r1.style.opacity = '.7'; }));
  }, 400);

  setTimeout(() => {
    r2.style.cssText = `position:absolute;inset:40px;border-radius:50%;border:1px solid ${cor};opacity:0;animation:pspin 2s linear infinite reverse;box-shadow:0 0 15px ${cor}40;transition:opacity .4s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r2.style.opacity = '.5'; }));
  }, 700);

  // ── PHASE 3 (900ms): Shockwave ──
  setTimeout(() => {
    const sw = document.createElement('div');
    sw.className = 'ov-shockwave';
    sw.style.cssText = `border-color:${cor};position:absolute;top:50%;left:50%;`;
    document.getElementById('ovCircle').appendChild(sw);
    setTimeout(() => sw.remove(), 700);
  }, 900);

  // ── PHASE 4 (1100ms): Ovo aparece com bounce ──
  setTimeout(() => {
    ovAv.style.transition = 'all .75s cubic-bezier(.34,1.5,.64,1)';
    ovAv.style.opacity    = '1';
    ovAv.style.transform  = 'scale(1) rotate(0deg)';
    if(raridade !== 'Comum') {
      r3.style.cssText = `position:absolute;inset:70px;border-radius:50%;border:1px dashed ${cor};opacity:0;animation:pspin 1.5s linear infinite;transition:opacity .4s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { r3.style.opacity = '.4'; }));
    }
  }, 1100);

  // ── PHASE 5 (1900ms): Raridade + shockwave ──
  setTimeout(() => {
    const sw2 = document.createElement('div');
    sw2.className = 'ov-shockwave';
    sw2.style.cssText = `border-color:${rarColor};position:absolute;top:50%;left:50%;`;
    document.getElementById('ovCircle').appendChild(sw2);
    setTimeout(() => sw2.remove(), 700);
    ovRarLbl.classList.add('show');
  }, 1900);

  // ── PHASE 6 (2250ms): Elemento aparece ──
  setTimeout(() => { ovNamLbl.classList.add('show'); }, 2250);

  // ── PHASE 7 (3600ms): Fade out ──
  setTimeout(() => {
    ovAv.style.transition = 'all .6s ease-in';
    ovAv.style.opacity    = '0';
    ovAv.style.transform  = 'scale(1.15)';
    r1.style.opacity = r2.style.opacity = r3.style.opacity = '0';
    ovRarLbl.classList.remove('show');
    ovNamLbl.classList.remove('show');
    ovBg.style.opacity = '0';
  }, 3600);

  // ── PHASE 8 (4300ms): Vai pro ovo ──
  setTimeout(() => {
    ov.classList.remove('active');
    ovParts.innerHTML = '';
    btn.disabled = false;
    setupAvatar();
  }, 4300);

  const msg = raridade==='Lendário'?'🌟 INVOCAÇÃO LENDÁRIA! Uma entidade primordial respondeu ao chamado!':raridade==='Raro'?'✨ Invocação Rara! Um guardião experiente surge!':'Uma entidade dimensional foi invocada!';
  addLog(msg, raridade==='Lendário'?'leg':raridade==='Raro'?'info':'good');
  updateResourceUI();
}

function setupAvatar() {
  // Right panel: hide summon, show creature info
  document.getElementById('summonCard').style.display = 'none';
  document.getElementById('creatureCard').style.display = 'block';
  // Screen: hide idle, show egg
  document.getElementById('idleScreen').style.display = 'none';
  document.getElementById('eggScreen').style.display  = 'flex';
  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';

  // Fill creature card
  fillCreatureCard();

  // Decor

  if(!avatar.bornAt) addLog(`${avatar.nome} foi invocado! Clique no ovo 5x para chocá-lo.`, 'good');
  updateAllUI();
  scheduleSave();
}

// ═══════════════════════════════════════════
// EGG HATCH
// ═══════════════════════════════════════════

function hatch() {
  const pendingSlot = window._pendingEggSlot;
  const hatchingOtherSlot = typeof pendingSlot === 'number' && pendingSlot !== activeSlotIdx;

  if(hatchingOtherSlot) {
    // Chocagem num slot diferente do activo —
    // Marcar hatched no slot pendente SEM mudar activeSlotIdx
    const pendingAv = avatarSlots[pendingSlot];
    if(pendingAv) {
      delete pendingAv.pendingEgg;
      pendingAv.hatched    = true;
      pendingAv.bornAt     = Date.now();
      pendingAv.nivel      = pendingAv.nivel    || 1;
      pendingAv.xp         = pendingAv.xp       || 0;
      pendingAv.vinculo    = pendingAv.vinculo   || 0;
      pendingAv.totalOvos  = pendingAv.totalOvos || 0;
      pendingAv.totalRaros = pendingAv.totalRaros|| 0;
      pendingAv.listed     = false;
      pendingAv.vitals     = {fome:100,humor:100,energia:100,saude:100,higiene:100};
      pendingAv.eggs       = pendingAv.eggs  || [];
      pendingAv.items      = pendingAv.items || [];
    }
    window._pendingEggSlot = null;

    // Limpar inboxEggs backup
    if(walletAddress && fbDb() && window._cancelledEgg) {
      fbDb().collection('players').doc(walletAddress).update({
        inboxEggs: firebase.firestore.FieldValue.arrayRemove(window._cancelledEgg)
      }).catch(e => console.warn('inboxEggs cleanup failed:', e));
      window._cancelledEgg = null;
    }


    // Voltar a mostrar o avatar activo original (não o novo)
    document.getElementById('eggScreen').style.display  = 'none';
    document.getElementById('actionBtns').style.opacity = '1';
    document.getElementById('actionBtns').style.pointerEvents = 'all';
    loadRuntimeFromSlot(activeSlotIdx); // restaura estado do avatar original (slot foi salvo antes de summonFromEgg)
    document.getElementById('aliveScreen').style.display = 'block';
    document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize());
    document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
    updateEquippedDisplay();
    syncEasterEggs();
    renderEggInventory();
    updateAllUI();
    saveToFirebase(); // imediato — evita race condition com visibilitychange ao ir ao Marketplace
    showBubble('Novo avatar no Slot ' + (pendingSlot+1) + '! 🐣');
    addLog(`${pendingAv ? pendingAv.nome.split(',')[0] : 'Avatar'} nasceu no Slot ${pendingSlot+1}! Activa-o no Marketplace.`, 'good');
    return; // ← não continua para o fluxo normal
  }

  // ── Chocagem normal (slot activo) ──
  if(avatarSlots[activeSlotIdx]) delete avatarSlots[activeSlotIdx].pendingEgg;
  window._pendingEggSlot = null;


  hatched = true;
  bornAt  = bornAt || Date.now();
  if(avatar) {
    avatar.hatched   = true;
    avatar.bornAt    = bornAt;
    avatar.nivel     = avatar.nivel   || 1;
    avatar.xp        = avatar.xp      || 0;
    avatar.vinculo   = avatar.vinculo  || 0;
    avatar.totalOvos = avatar.totalOvos|| 0;
    avatar.totalRaros= avatar.totalRaros||0;
    avatar.listed    = false;
    avatar.vitals    = {...vitals};
  }
  // Ovo chocou com sucesso — limpar inboxEggs (já não precisa de backup)
  if(walletAddress && fbDb() && window._cancelledEgg) {
    fbDb().collection('players').doc(walletAddress).update({
      inboxEggs: firebase.firestore.FieldValue.arrayRemove(window._cancelledEgg)
    }).catch(e => console.warn('inboxEggs cleanup failed:', e));
    window._cancelledEgg = null;
  }
  scheduleSave();
  document.getElementById('statusCard').style.display = 'block';
  poopCount = 0;
  dirtyLevel = 0;
  vitals.higiene = 100;
  poopPressure = 0;

  // Switch screens
  document.getElementById('eggScreen').style.display = 'none';

  const alive = document.getElementById('aliveScreen');
  alive.style.display = 'block';
  alive.style.opacity = '0';
  alive.style.transition = 'opacity .6s ease';

  document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize());
  document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
  updateEquippedDisplay();
  syncEasterEggs();
  // Egg/coin button state is managed by updateAllUI() — no need to set here
  const btnLayEgg = document.getElementById('btnLayEgg');
  if(btnLayEgg) {
    const isAdult = getFase() === 3;
    btnLayEgg.style.display = isAdult ? 'flex' : 'none';
    btnLayEgg.style.opacity = (isAdult && eggLayCooldown === 0) ? '1' : '.4';
    btnLayEgg.title = eggLayCooldown > 0 ? `Pronto em ~${Math.ceil(eggLayCooldown*60/3600)}h` : 'Pronto para botar!';
    if(isAdult) {
      const btnsBar = document.getElementById('actionBtns');
    }
  }
  renderEggInventory();
  saveToFirebase(); // imediato — garante que o novo avatar está no Firebase antes de qualquer visibilitychange

  // Reveal action buttons
  const btns = document.getElementById('actionBtns');
  btns.style.opacity = '1';
  btns.style.pointerEvents = 'all';

  // Fade in
  requestAnimationFrame(() => { alive.style.opacity = '1'; });
  setTimeout(() => { alive.style.transition = ''; }, 700);

  // Creature entrance bounce
  const wrap = document.getElementById('creatureWrap');
  wrap.style.transform = 'scale(0) translateY(30px)';
  wrap.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
  setTimeout(() => { wrap.style.transform = 'scale(1) translateY(0)'; }, 100);
  setTimeout(() => { wrap.style.transition = ''; }, 700);

  showBubble('Olá! 🐣');
  addLog(`${avatar.nome.split(',')[0]} nasceu! Cuide bem dele.`, 'good');
}
