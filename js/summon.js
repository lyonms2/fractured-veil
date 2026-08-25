// ═══════════════════════════════════════════
// SUMMON SYSTEM
// ═══════════════════════════════════════════
// Quantos avatares vivos o jogador tem — usado pela interface de slots.
function avataresVivos() {
  if(typeof avatarSlots === 'undefined') return 0;
  return avatarSlots.filter(s => s && !s.dead).length;
}

// Grátis nas primeiras INVOCACOES_GRATIS, e sempre grátis se o jogador
// ficou sem nenhum avatar vivo — essa é a rede de segurança para nunca
// ficar preso sem forma de jogar.
//
// Repare que conta INVOCAÇÕES TOTAIS, não avatares vivos. Um avatar
// queimado ou morto continua a contar, portanto invocar-queimar-invocar
// à procura do elemento ou da ficha ideal gasta as tentativas grátis
// como qualquer outra. Só se pode queimar um slot que não seja o activo
// (ver avatars-market.js), logo também não dá para chegar a zero vivos
// de propósito para reactivar a rede de segurança.
function custoDaInvocacao() {
  if(avataresVivos() === 0) return 0;
  return (gs.totalInvocacoes || 0) < INVOCACOES_GRATIS ? 0 : SUMMON_CUSTO;
}

// Índice do primeiro slot com um avatar vivo, ou -1 se não houver nenhum.
function primeiroSlotVivo() {
  if(typeof avatarSlots === 'undefined') return -1;
  return avatarSlots.findIndex(s => s && !s.dead);
}

// Leva o jogador de volta a um avatar que ele já tem. É a saída do beco sem
// saída: num slot vazio os botões de ação estão desligados e o ícone das
// moedas escondido, portanto sem isto não havia forma de chegar aos
// minigames para ganhar as moedas da próxima invocação.
function voltarAoAvatarVivo() {
  const i = primeiroSlotVivo();
  if(i < 0) return;
  if(typeof closeMarketplaceModal === 'function') closeMarketplaceModal();
  if(typeof ModalManager !== 'undefined' && ModalManager.closeAll) ModalManager.closeAll();
  switchSlot(i);
}

// Mostra/esconde o aviso de bloqueio no painel de invocação.
// Chamado por updateResourceUI(), ou seja, depois de qualquer mudança de
// estado (trocar de slot, ganhar moedas num minigame, invocar).
function updateSummonLockHint() {
  const box = document.getElementById('summonLockHint');
  if(!box) return;
  const btn = document.getElementById('btnSummon');

  const custo    = custoDaInvocacao();
  // Só interessa num slot vazio — é aí que o painel de invocação aparece
  const semSaldo = !avatar && custo > 0 && gs.moedas < custo;

  if(!semSaldo) {
    box.style.display = 'none';
    if(btn) btn.disabled = false;
    return;
  }

  box.style.display = 'block';
  if(btn) btn.disabled = true;

  const falta = custo - gs.moedas;
  const alvo  = primeiroSlotVivo();
  document.getElementById('summonLockTitle').textContent =
    t('summon.lock.title', { cost: custo });
  document.getElementById('summonLockDesc').textContent =
    alvo >= 0 ? t('summon.lock.desc', { have: gs.moedas, cost: custo, missing: falta })
              : t('summon.lock.desc_nofree', { cost: custo });

  const b = document.getElementById('summonLockBtn');
  if(b) {
    b.style.display   = alvo >= 0 ? '' : 'none';
    b.textContent     = t('summon.lock.btn', { n: alvo + 1 });
  }
}

function triggerSummon() {
  if(!walletAddress) { addLog(t('summon.log.no_login'), 'bad'); showBubble(t('summon.bub.no_login')); return; }
  const btn = document.getElementById('btnSummon');
  if(!btn || btn.disabled) return;

  const custo = custoDaInvocacao();
  if(custo > 0) {
    if(gs.moedas < custo) {
      addLog(t('summon.log.no_coins', { cost: custo }), 'bad');
      showBubble(t('summon.bub.no_coins'));
      playSound('no_coins');
      return;
    }
    if(!spendCoins(custo)) return;
  }

  btn.disabled = true;

  const raridade = 'Comum';
  const elemento = escolherElemento();
  const car      = CARACTERISTICAS_ELEMENTAIS[elemento];
  const prefPool = PREFIXOS[elemento][raridade];
  const nome     = `${rnd(prefPool)}, ${rnd(SUFIXOS[raridade])}`;
  const _descPool    = DESCRICOES[raridade][elemento];
  const descricaoIdx = Math.floor(Math.random() * _descPool.length);
  const descricao    = _descPool[descricaoIdx];
  let _h = 0;
  const _str = nome + elemento;
  for(let i=0;i<_str.length;i++){ const c=_str.charCodeAt(i); _h=((_h<<5)-_h)+c; _h=_h&_h; }
  const seed = Math.abs(_h);

  dead = false; hatched = false; sick = false; sleeping = false;
  clearPresenceDead(walletAddress);
  nivel = 1; xp = 0; vinculo = 0; totalSecs = 0; tickCount = 0;
  eggLayCooldown = 0;
  poopCount = 0; dirtyLevel = 0; poopPressure = 0;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  document.getElementById('poopContainer').innerHTML = '';

  while(avatarSlots.length <= activeSlotIdx) avatarSlots.push(null);
  avatarSlots[activeSlotIdx] = {
    nome, elemento, raridade, descricao, descricaoIdx, car, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    eggLayCooldown: 0, petCooldown: 0,
    vitals: {fome:100, humor:100, energia:100, saude:100, higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
    pendingEgg: true,       // protege o slot durante a chocagem automática
    pendingSlot: activeSlotIdx,
  };
  window._pendingEggSlot = activeSlotIdx;
  gs.totalInvocacoes = (gs.totalInvocacoes || 0) + 1;

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

  ovAv.style.cssText = 'width:200px;height:200px;opacity:0;transform:scale(.05) rotate(-15deg);transition:none;display:flex;align-items:center;justify-content:center;';
  r1.style.cssText = r2.style.cssText = r3.style.cssText = 'position:absolute;border-radius:50%;opacity:0;border:1px solid transparent;';
  ovRarLbl.classList.remove('show');
  ovNamLbl.classList.remove('show');
  ovParts.innerHTML  = '';
  ovBg.style.opacity = '0';

  const elemEmoji = car ? car.emoji : '✦';
  ovRarLbl.textContent = rarNames[raridade];
  ovRarLbl.style.color = rarColor;
  ovNamLbl.textContent = `${elemEmoji} ${elemento.toUpperCase()}`;

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

  const numParts = raridade === 'Lendário' ? 30 : raridade === 'Raro' ? 18 : 10;
  for(let i = 0; i < numParts; i++) {
    const p  = document.createElement('div');
    const sz = 2 + Math.random() * 5;
    p.className = 'ov-particle';
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${10+Math.random()*80}%;bottom:-10px;background:${cor};box-shadow:0 0 ${sz*2}px ${cor};animation-duration:${2.5+Math.random()*3}s;animation-delay:${Math.random()*2}s;`;
    ovParts.appendChild(p);
  }

  ov.classList.add('active');
  setTimeout(() => { ovBg.style.opacity = '1'; }, 50);

  setTimeout(() => {
    r1.style.cssText = `position:absolute;inset:10px;border-radius:50%;border:2px solid ${cor};opacity:0;animation:pspin 3s linear infinite;box-shadow:0 0 20px ${cor}50,inset 0 0 20px ${cor}20;transition:opacity .5s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r1.style.opacity = '.7'; }));
  }, 400);

  setTimeout(() => {
    r2.style.cssText = `position:absolute;inset:40px;border-radius:50%;border:1px solid ${cor};opacity:0;animation:pspin 2s linear infinite reverse;box-shadow:0 0 15px ${cor}40;transition:opacity .4s`;
    requestAnimationFrame(() => requestAnimationFrame(() => { r2.style.opacity = '.5'; }));
  }, 700);

  setTimeout(() => {
    const sw = document.createElement('div');
    sw.className = 'ov-shockwave';
    sw.style.cssText = `border-color:${cor};position:absolute;top:50%;left:50%;`;
    document.getElementById('ovCircle').appendChild(sw);
    setTimeout(() => sw.remove(), 700);
  }, 900);

  setTimeout(() => {
    ovAv.style.transition = 'all .75s cubic-bezier(.34,1.5,.64,1)';
    ovAv.style.opacity    = '1';
    ovAv.style.transform  = 'scale(1) rotate(0deg)';
    if(raridade !== 'Comum') {
      r3.style.cssText = `position:absolute;inset:70px;border-radius:50%;border:1px dashed ${cor};opacity:0;animation:pspin 1.5s linear infinite;transition:opacity .4s`;
      requestAnimationFrame(() => requestAnimationFrame(() => { r3.style.opacity = '.4'; }));
    }
  }, 1100);

  setTimeout(() => {
    const sw2 = document.createElement('div');
    sw2.className = 'ov-shockwave';
    sw2.style.cssText = `border-color:${rarColor};position:absolute;top:50%;left:50%;`;
    document.getElementById('ovCircle').appendChild(sw2);
    setTimeout(() => sw2.remove(), 700);
    ovRarLbl.classList.add('show');
  }, 1900);

  setTimeout(() => { ovNamLbl.classList.add('show'); }, 2250);

  setTimeout(() => {
    ovAv.style.transition = 'all .6s ease-in';
    ovAv.style.opacity    = '0';
    ovAv.style.transform  = 'scale(1.15)';
    r1.style.opacity = r2.style.opacity = r3.style.opacity = '0';
    ovRarLbl.classList.remove('show');
    ovNamLbl.classList.remove('show');
    ovBg.style.opacity = '0';
  }, 3600);

  // Quando o overlay fecha, dispara a animação de chocagem automaticamente
  // O jogador não precisa de clicar nada — tudo acontece em sequência
  setTimeout(() => {
    ov.classList.remove('active');
    ovParts.innerHTML = '';
    btn.disabled = false;

    // Mostra o eggScreen brevemente e inicia a animação de chocagem
    // hatchWithAnimation() vai chamar hatch() no final (~1.2s depois)
    document.getElementById('summonCard').style.display  = 'none';
    document.getElementById('creatureCard').style.display = 'block';
    document.getElementById('idleScreen').style.display   = 'none';
    document.getElementById('deadScreen').style.display   = 'none';
    document.getElementById('aliveScreen').style.display  = 'none';
    fillCreatureCard();
    updateAllUI();
    scheduleSave();

    hatchWithAnimation(raridade, elemento, activeSlotIdx);
  }, 4300);

  const msg = raridade==='Lendário' ? t('summon.log.legendary') : raridade==='Raro' ? t('summon.log.rare') : t('summon.log.common');
  addLog(msg, raridade==='Lendário'?'leg':raridade==='Raro'?'info':'good');
  updateResourceUI();
}

// Chamado quando se volta ao jogo com um avatar que existe mas ainda não
// nasceu (avatar && !hatched) — alguém que fechou a aba nos 1,2s da
// animação, ou a quem a chocagem falhou a meio.
//
// Antes isto punha o ovo no ecrã e parava ali. Com a chocagem por
// cliques ainda viva, o jogador clicava cinco vezes e saía dali; depois
// de ela sair, ficava um ovo que não respondia a nada e sem botão
// nenhum — um beco sem saída. Agora termina o que ficou por terminar.
function setupAvatar() {
  document.getElementById('summonCard').style.display  = 'none';
  document.getElementById('creatureCard').style.display = 'block';
  document.getElementById('idleScreen').style.display   = 'none';
  document.getElementById('eggScreen').style.display    = 'flex';
  document.getElementById('aliveScreen').style.display  = 'none';
  document.getElementById('deadScreen').style.display   = 'none';
  fillCreatureCard();
  if(!avatar.bornAt) addLog(t('summon.log.invoked', {nome: avatar.nome}), 'good');
  updateAllUI();
  scheduleSave();

  if(typeof hatchWithAnimation === 'function') {
    hatchWithAnimation(avatar.raridade, avatar.elemento,
                       (typeof activeSlotIdx === 'number') ? activeSlotIdx : 0);
  }
}

// ═══════════════════════════════════════════
// EGG HATCH
// ═══════════════════════════════════════════

function hatch() {
  const pendingSlot = window._pendingEggSlot;
  const hatchingOtherSlot = typeof pendingSlot === 'number' && pendingSlot !== activeSlotIdx;

  if(hatchingOtherSlot) {
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

    if(walletAddress && fbDb() && window._cancelledEgg) {
      fbDb().collection('players').doc(walletAddress).update({
        inboxEggs: firebase.firestore.FieldValue.arrayRemove(window._cancelledEgg)
      }).catch(e => console.warn('inboxEggs cleanup failed:', e));
      window._cancelledEgg = null;
    }

    document.getElementById('eggScreen').style.display  = 'none';
    document.getElementById('actionBtns').style.opacity = '1';
    document.getElementById('actionBtns').style.pointerEvents = 'all';
    loadRuntimeFromSlot(activeSlotIdx);
    document.getElementById('aliveScreen').style.display = 'block';
    document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize(), getFase());
    document.getElementById('phaseLabel').textContent = t('gt.phase.label', {fase: FASES[getFase()]});
    updateEquippedDisplay();
    renderEggInventory();
    updateAllUI();
    saveToFirebase();
    if(typeof updateHeaderButtons === 'function') updateHeaderButtons();
    showBubble(t('summon.bub.new_slot', {n: pendingSlot+1}));
    addLog(t('summon.log.born_slot', {nome: pendingAv ? pendingAv.nome.split(',')[0] : 'Avatar', n: pendingSlot+1}), 'good');
    return;
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

  document.getElementById('eggScreen').style.display = 'none';

  const alive = document.getElementById('aliveScreen');
  alive.style.display = 'block';
  alive.style.opacity = '0';
  alive.style.transition = 'opacity .6s ease';

  document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize(), getFase());
  document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
  updateEquippedDisplay();

  const btnLayEgg = document.getElementById('btnLayEgg');
  const isAdult = getFase() === 3;
  const eggReady = isAdult && eggLayCooldown === 0;
  if(btnLayEgg) {
    btnLayEgg.style.display = isAdult ? 'flex' : 'none';
    btnLayEgg.style.opacity = eggReady ? '1' : '.4';
    btnLayEgg.title = eggLayCooldown > 0 ? `Pronto em ~${Math.ceil(eggLayCooldown*60/3600)}h` : 'Pronto para botar!';
  }
  const btnLayEggCorner = document.getElementById('btnLayEggCorner');
  if(btnLayEggCorner) btnLayEggCorner.style.display = eggReady ? 'block' : 'none';

  renderEggInventory();
  saveToFirebase();
  if(typeof updateHeaderButtons === 'function') updateHeaderButtons();

  const btns = document.getElementById('actionBtns');
  btns.style.opacity = '1';
  btns.style.pointerEvents = 'all';

  requestAnimationFrame(() => { alive.style.opacity = '1'; });
  setTimeout(() => { alive.style.transition = ''; }, 700);

  const wrap = document.getElementById('creatureWrap');
  wrap.style.transform = 'scale(0) translateY(30px)';
  wrap.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
  setTimeout(() => { wrap.style.transform = 'scale(1) translateY(0)'; }, 100);
  setTimeout(() => { wrap.style.transition = ''; }, 700);

  playSound('hatch');
  const _rar = avatar?.raridade;
  if(_rar === 'Lendário') playSound('rarity_lendario');
  else if(_rar === 'Raro') playSound('rarity_raro');
  else                     playSound('rarity_comum');
  showBubble(t('summon.bub.hello'));
  addLog(t('summon.log.born', {nome: avatar.nome.split(',')[0]}), 'good');

  if(!localStorage.getItem('fv_first_hatch')) {
    localStorage.setItem('fv_first_hatch', '1');
    setTimeout(() => addLog(t('onboard.tip.feed'), 'info'), 2000);
    setTimeout(() => addLog(t('onboard.tip.play'), 'info'), 4500);
    setTimeout(() => addLog(t('onboard.tip.rest'), 'info'), 7500);
  }
}
