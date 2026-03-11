function goToMarketplace(e) {
  if(e) e.preventDefault();
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) {
    // Show themed warning — can't leave mid-hatch
    showBubble('Choca o ovo primeiro! 🥚');
    addLog('Termina a chocagem antes de ir ao Marketplace.', 'bad');
    return;
  }
  window.location.href = 'marketplace.html';
}

// Encontra o slot correcto para chocar um ovo:
// 1. Se slot activo está vazio (sem avatar chocado) → usa o activo
// 2. Senão → primeiro slot genuinamente vazio (null ou sem nome/pendingEgg)
function findTargetSlot() {
  const unlocked = getUnlockedSlots();
  // Prioridade: slot activo se não tem avatar chocado
  const activeS = avatarSlots[activeSlotIdx];
  if(!activeS || (!activeS.hatched && !activeS.pendingEgg)) {
    return activeSlotIdx;
  }
  // Procura slot vazio excluindo o activo
  for(let i = 0; i < unlocked; i++) {
    if(i === activeSlotIdx) continue;
    const s = avatarSlots[i];
    if(!s || (!s.nome && !s.pendingEgg)) return i;
  }
  return -1; // todos ocupados
}

// SISTEMA DE OVOS
// ═══════════════════════════════════════════════════════════════════

function calcEggRarity() {
  // Probabilidade baseada na raridade do avatar + nível
  // Só ADULTO (nível 17+) pode botar ovos — verificado em layEgg()
  const r = avatar.raridade;
  const n = nivel;
  // [chance_comum, chance_raro, chance_lendario] em %
  let chances;
  if(r === 'Comum') {
    // Free-to-play: Lendário é raridade extrema, recompensa para veteranos
    if(n < 25)      chances = [97,   3,   0  ];
    else if(n < 35) chances = [94,   5.5, 0.5];
    else            chances = [90,   8,   2  ];
  } else if(r === 'Raro') {
    if(n < 25)      chances = [55,  40,   5  ];
    else if(n < 35) chances = [40,  50,  10  ];
    else            chances = [25,  55,  20  ];
  } else { // Lendário
    if(n < 25)      chances = [20,  55,  25  ];
    else if(n < 35) chances = [10,  50,  40  ];
    else            chances = [5,   40,  55  ];
  }
  // Bônus +5% raridade superior se todos stats > 80
  const allHigh = Object.values(vitals).every(v => v > 80);
  if(allHigh && chances[2] < 95) { chances[1] = Math.max(0, chances[1]-5); chances[2] += 5; }
  // Bônus de vínculo — aumenta chance de ovo Raro/Lendário
  const vb = getVinculoBonus();
  if(vb.eggRaro > 0 && chances[2] < 95) {
    const bonus = vb.eggRaro;
    chances[1] = Math.max(0, chances[1] - Math.floor(bonus/2));
    chances[2] = Math.min(95, chances[2] + bonus);
  }

  const roll = Math.random() * 100;
  if(roll < chances[0]) return 'Comum';
  if(roll < chances[0] + chances[1]) return 'Raro';
  return 'Lendário';
}

function calcEggExpiry(raridade) {
  const base = raridade === 'Lendário' ? 30 : raridade === 'Raro' ? 14 : 7;
  const dias  = base * getVinculoBonus().eggDura;
  return Date.now() + dias * 24 * 60 * 60 * 1000;
}

function layEgg() {
  if(getFase() < 3) { showBubble('Ainda não cresci o suficiente... 🥚'); return; }
  if(!avatar || !hatched || dead) return;
  if(getFase() !== 3) { showBubble('Ainda não cresci o suficiente...'); return; }
  // Verificar cooldown ANTES de gastar moedas
  if(eggLayCooldown > 0) {
    const horasRestantes = Math.ceil(eggLayCooldown * 60 / 3600);
    showBubble(`Preciso descansar... (~${horasRestantes}h)`);
    return;
  }
  const EGG_COST = 50;
  if(gs.moedas < EGG_COST) { showBubble('Sem moedas para botar ovo... 😢'); addLog('Precisa de 50 🪙 para botar um ovo!','bad'); return; }
  spendCoins(EGG_COST);

  const rb = rarityBonus();
  // Lay multiple eggs based on rarity (Comum=1, Raro=2, Lendário=3)
  const numEggs = rb.eggs;
  for(let i = 0; i < numEggs; i++) {
    const raridade = calcEggRarity();
    const expiraEm = calcEggExpiry(raridade);
    eggsInInventory.push({ raridade, elemento: avatar.elemento, expiraEm, id: Date.now() + i });
    // avatar IS the active slot — update directly
    if(avatar) {
      avatar.totalOvos  = (avatar.totalOvos ||0)+1;
      if(raridade !== 'Comum') avatar.totalRaros = (avatar.totalRaros||0)+1;
    }
  }
  const raridade = eggsInInventory[eggsInInventory.length - numEggs].raridade; // for log/bubble

  // cooldown: base 24h × cooldown multiplier (Lendário = 12h, Raro = 18h)
  eggLayCooldown  = Math.round(1440 * rb.cooldown);
  scheduleSave(); // 24h base (1440 ciclos × 60s)
  eggLayNotified  = false;

  // Animation
  playAnim('anim-layegg');
  const wrap = document.getElementById('creatureWrap');
  if(wrap) {
    const ep = document.createElement('div');
    ep.className = 'egg-pop';
    ep.textContent = raridade === 'Lendário' ? '🌟' : raridade === 'Raro' ? '🔵' : '🥚';
    ep.style.cssText = 'left:50%;top:30%;';
    wrap.appendChild(ep);
    setTimeout(() => ep.remove(), 1500);
  }

  const rarColor = raridade === 'Lendário' ? 'leg' : raridade === 'Raro' ? 'info' : 'good';
  const eggWord = numEggs > 1 ? `${numEggs} ovos` : 'um ovo';
  showBubble(numEggs > 1 ? `Botei ${numEggs} ovos! 🥚` : `Botei um ovo ${raridade === 'Lendário' ? 'Lendário! 🌟' : raridade === 'Raro' ? 'Raro! 💙' : 'Comum! 🥚'}`);
  addLog(`🥚 Botou ${eggWord}! Verifique o inventário.`, rarColor);
  showFloat(`🥚 ×${numEggs}`, raridade === 'Lendário' ? '#e8a030' : raridade === 'Raro' ? '#5ab4e8' : '#7ab87a');

  renderEggInventory();
  updateResourceUI();
}

function burnEgg(id) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  const ovo = eggsInInventory[idx];
  // Apodrecido — só descarta
  if(Date.now() > ovo.expiraEm) {
    eggsInInventory.splice(idx, 1);
    addLog('Ovo apodrecido descartado.', 'bad');
    renderEggInventory(); updateResourceUI(); scheduleSave();
    return;
  }
  const bonus = rarityBonus().burnBonus;
  if(ovo.raridade === 'Comum') {
    // Comuns não têm valor MATIC — dão moedas
    const moedas = Math.round(20 * (1 + bonus));
    eggsInInventory.splice(idx, 1);
    earnCoins(moedas);
    addLog(`🔥 Ovo Comum queimado! +${moedas} 🪙`, 'good');
    showFloat(`+${moedas}🪙`, '#c9a84c');
  } else {
    // Raro e Lendário — dão 💎 Cristais ao queimar
    const baseGems = ovo.raridade === 'Lendário' ? 20 : 6;
    const finalGems = Math.round(baseGems * (1 + bonus));
    const bonusTxt = bonus > 0 ? ` (+${Math.round(bonus*100)}% bônus)` : '';
    eggsInInventory.splice(idx, 1);
    gs.cristais = (gs.cristais || 0) + finalGems;
    addLog(`🔥 Ovo ${ovo.raridade} queimado! +${finalGems} 💎${bonusTxt}`, 'good');
    showFloat(`+${finalGems}💎`, '#a78bfa');
  }
  renderEggInventory(); updateResourceUI(); scheduleSave();
}

async function sellEggToPool(id) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  const ovo = eggsInInventory[idx];
  if(ovo.raridade === 'Comum') { addLog('Ovos Comuns não são aceites pela pool.','bad'); return; }
  if(!walletAddress || !fbDb()) { addLog('Conecta a carteira primeiro.','bad'); return; }

  // Lê pool do Firestore
  let pool;
  try {
    const snap = await fbDb().collection('config').doc('pool').get();
    pool = snap.exists ? snap.data() : null;
  } catch(e) { addLog('Erro ao aceder à pool.','bad'); return; }

  if(!pool || pool.cristais <= 0) { addLog('Pool vazia de momento. Tenta mais tarde.','bad'); return; }

  const hoje = pool.saqueHoje || 0;
  const limite = 100;
  if(hoje >= limite) { addLog('Limite diário da pool atingido. Volta amanhã.','bad'); return; }

  // Preço dinâmico
  const ratio = Math.min(2, pool.cristais / 1000);
  const base  = ovo.raridade === 'Lendário' ? 20 : 5;
  const preco = Math.max(1, Math.round(base * ratio));

  if(pool.cristais < preco) { addLog('Pool sem saldo suficiente.','bad'); return; }

  try {
    // Actualiza pool (débito)
    await fbDb().collection('config').doc('pool').update({
      cristais:   firebase.firestore.FieldValue.increment(-preco),
      saqueHoje:  firebase.firestore.FieldValue.increment(preco),
    });

    // Credita cristais ao jogador
    const freshSnap = await fbDb().collection('players').doc(walletAddress).get();
    const freshData = freshSnap.data() || {};
    const freshCristais = freshData.gs?.cristais ?? freshData.cristais ?? 0;
    const novoCristais  = freshCristais + preco;
    await fbDb().collection('players').doc(walletAddress).update({
      cristais:      novoCristais,
      'gs.cristais': novoCristais,
    });
    gs.cristais = novoCristais;

    // Remove ovo do inventário
    eggsInInventory.splice(idx, 1);
    scheduleSave();
    renderEggInventory();
    updateResourceUI();
    addLog(`💎 Ovo ${ovo.raridade} vendido à pool por ${preco} 💎!`, 'good');
    showFloat(`+${preco}💎`, '#a78bfa');
    showBubble(`+${preco} 💎 da pool!`);
  } catch(e) {
    console.error(e);
    addLog('Erro ao vender à pool.','bad');
  }
}

function hatchEggFromInventory(id) {
  const ovo = eggsInInventory.find(e => e.id === id);
  if(!ovo) return;
  if(Date.now() > ovo.expiraEm) {
    addLog('Este ovo apodreceu — não pode mais ser chocado.', 'bad');
    return;
  }

  pendingHatchId = id;
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const rarEmoji  = { 'Comum':'🥚', 'Raro':'💙', 'Lendário':'🌟' };
  const color = rarColors[ovo.raridade];

  document.getElementById('hatchConfirmEgg').textContent = rarEmoji[ovo.raridade];
  document.getElementById('hatchConfirmRarity').innerHTML =
    `<span style="color:${color};font-weight:700;font-family:'Cinzel',serif">${ovo.raridade.toUpperCase()} · ${ovo.elemento}</span>`;

  const targetPreview = findTargetSlot();
  const confirmBtn = document.getElementById('hatchConfirmYes');
  let msg = '';
  if(targetPreview === -1) {
    msg = `Todos os slots estão ocupados.<br>Liberta um slot no Marketplace antes de chocar.`;
    if(confirmBtn) confirmBtn.style.display = 'none';
  } else if(hatched && !dead && targetPreview !== activeSlotIdx) {
    msg = `O novo avatar nascerá no <b style="color:#7ab87a">Slot ${targetPreview+1}</b>.<br>O teu avatar activo <b style="color:#e8a030">${avatar ? avatar.nome.split(',')[0] : ''}</b> continua no Slot ${activeSlotIdx+1}.<br><span style="font-size:7px;color:var(--muted);">Activa o novo avatar no Marketplace → Meus Avatares.</span>`;
    if(confirmBtn) confirmBtn.style.display = '';
  } else {
    msg = `O ovo nascerá no Slot ${targetPreview+1}.<br>Clica 5× para fazer nascer o teu novo avatar.`;
    if(confirmBtn) confirmBtn.style.display = '';
  }
  document.getElementById('hatchConfirmMsg').innerHTML = msg;

  ModalManager.open('hatchConfirmModal');
}

async function confirmHatch() {
  if(pendingHatchId === null) return;
  const idx = eggsInInventory.findIndex(e => e.id === pendingHatchId);
  if(idx === -1) { pendingHatchId = null; return; }

  const targetSlot = findTargetSlot();
  if(targetSlot === -1) {
    addLog('Sem slots livres. Liberta um slot no Marketplace.', 'bad');
    showBubble('Sem slots livres! 😢');
    pendingHatchId = null;
    ModalManager.close('hatchConfirmModal');
    return;
  }

  const ovo = eggsInInventory[idx];
  pendingHatchId = null;
  ModalManager.close('hatchConfirmModal');

  // Aguardar escrita no Firebase ANTES de prosseguir
  // Garante que o ovo está seguro mesmo que o jogador recarregue imediatamente
  if(walletAddress && fbDb()) {
    try {
      await fbDb().collection('players').doc(walletAddress).update({
        inboxEggs: firebase.firestore.FieldValue.arrayUnion({...ovo})
      });
    } catch(e) {
      console.warn('inboxEggs backup failed:', e);
      // Mesmo que falhe, continuar — o ovo ainda está em eggsInInventory por ora
    }
  }

  // Remove da memória
  eggsInInventory.splice(idx, 1);
  window._cancelledEgg = {...ovo};

  // Guardar estado do slot activo ANTES de qualquer alteração às variáveis globais
  if(targetSlot !== activeSlotIdx) {
    saveRuntimeToSlot(activeSlotIdx);
  }

  // Gerar dados do novo avatar
  const car      = CARACTERISTICAS_ELEMENTAIS[ovo.elemento] || null;
  const prefPool = PREFIXOS[ovo.elemento]?.[ovo.raridade] || PREFIXOS[ovo.elemento]?.['Comum'] || ['Mistix'];
  const nome     = `${rnd(prefPool)}, ${rnd(SUFIXOS[ovo.raridade])}`;
  const descricao= rnd(DESCRICOES[ovo.raridade][ovo.elemento] || DESCRICOES[ovo.raridade]['Fogo']);
  let _h = 0; const _str = nome + ovo.elemento;
  for(let i=0;i<_str.length;i++){const ch=_str.charCodeAt(i);_h=((_h<<5)-_h)+ch;_h=_h&_h;}
  const seed = Math.abs(_h);

  while(avatarSlots.length <= targetSlot) avatarSlots.push(null);
  avatarSlots[targetSlot] = {
    nome, elemento: ovo.elemento, raridade: ovo.raridade, descricao, car, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    eggLayCooldown: 0, petCooldown: 0,
    vitals: {fome:100,humor:100,energia:100,saude:100,higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
  };
  window._pendingEggSlot = targetSlot;

  // Animação do ovo a partir e chocar directamente — sem interacção do jogador
  hatchWithAnimation(ovo.raridade, ovo.elemento, targetSlot);
}

function hatchWithAnimation(raridade, elemento, targetSlot) {
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const crackColor = rarColors[raridade] || '#c4b5fd';

  // Mostrar eggScreen brevemente para a animação
  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('idleScreen').style.display  = 'none';
  document.getElementById('eggScreen').style.display   = 'flex';
  document.getElementById('actionBtns').style.opacity      = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';
  const _cb = document.getElementById('btnCancelHatch'); if(_cb) _cb.style.display = 'none';

  // Aplicar cor do ovo conforme raridade
  const stop1 = document.querySelector('#eggGrad stop:first-child');
  const stop2 = document.querySelector('#eggGrad stop:nth-child(2)');
  const stop3 = document.querySelector('#eggGrad stop:last-child');
  const aura1 = document.getElementById('eggAura1');
  const aura2 = document.getElementById('eggAura2');
  const glowEl= document.getElementById('eggGlowEl');
  const shine = document.getElementById('eggShine');
  const sparks= document.getElementById('eggSparkles');
  if(raridade === 'Lendário') {
    if(stop1) stop1.setAttribute('stop-color','#c8860a');
    if(stop2) stop2.setAttribute('stop-color','#7a4400');
    if(stop3) stop3.setAttribute('stop-color','#1a0e00');
    if(glowEl){ glowEl.setAttribute('fill','#8a5a00'); glowEl.setAttribute('opacity','.6'); }
    if(shine)  shine.setAttribute('fill','#ffd700');
    if(aura1){ aura1.setAttribute('stroke','#e8a030'); aura1.style.opacity='0.7'; }
    if(aura2){ aura2.setAttribute('stroke','#ffd700'); aura2.style.opacity='0.4'; }
    if(sparks) sparks.style.opacity='1';
  } else if(raridade === 'Raro') {
    if(stop1) stop1.setAttribute('stop-color','#1a6aaa');
    if(stop2) stop2.setAttribute('stop-color','#0d3560');
    if(stop3) stop3.setAttribute('stop-color','#0a0f1e');
    if(glowEl){ glowEl.setAttribute('fill','#1a4a8a'); glowEl.setAttribute('opacity','.5'); }
    if(shine)  shine.setAttribute('fill','#7dc8f0');
    if(aura1){ aura1.setAttribute('stroke','#5ab4e8'); aura1.style.opacity='0.6'; }
    if(aura2){ aura2.setAttribute('stroke','#a0d8f0'); aura2.style.opacity='0.3'; }
    if(sparks) sparks.style.opacity='0';
  } else {
    if(stop1) stop1.setAttribute('stop-color','#5a3a9a');
    if(stop2) stop2.setAttribute('stop-color','#2d1a5e');
    if(stop3) stop3.setAttribute('stop-color','#0b0916');
    if(glowEl){ glowEl.setAttribute('fill','#3d2a6e'); glowEl.setAttribute('opacity','.4'); }
    if(shine)  shine.setAttribute('fill','#8060c0');
    if(aura1)  aura1.style.opacity='0';
    if(aura2)  aura2.style.opacity='0';
    if(sparks) sparks.style.opacity='0';
  }
  document.querySelectorAll('#eggCracks line').forEach(l => {
    l.setAttribute('stroke', crackColor); l.style.opacity='0';
  });

  // Atualizar texto
  document.getElementById('eggHint').textContent = 'A chocar...';
  document.getElementById('eggProgress').textContent = '';

  const svg    = document.getElementById('eggSvg');
  const cracks = document.getElementById('eggCracks');
  const pulse  = document.getElementById('eggPulse');
  const flash  = document.getElementById('eggFlash');
  pulse.setAttribute('stroke', crackColor);
  svg.style.transform = ''; svg.style.transition = '';

  // Sequência de animação automática (~1.8s total)
  const lines = document.querySelectorAll('#eggCracks line');

  setTimeout(() => { // 0ms — shake + crack 1
    svg.style.transition = 'transform .08s ease';
    svg.style.transform  = 'rotate(-10deg) scale(1.05)';
    cracks.style.opacity = '1';
    if(lines[0]) lines[0].style.opacity = '1';
    if(lines[1]) lines[1].style.opacity = '1';
  }, 0);
  setTimeout(() => { svg.style.transform = 'rotate(8deg) scale(1.08)'; }, 120);
  setTimeout(() => { // 250ms — mais rachaduras
    svg.style.transform = 'rotate(-6deg) scale(1.06)';
    if(lines[2]) lines[2].style.opacity = '1';
    if(lines[3]) lines[3].style.opacity = '1';
  }, 250);
  setTimeout(() => { svg.style.transform = 'rotate(4deg) scale(1.1)'; }, 380);
  setTimeout(() => { // 500ms — todas as rachaduras
    svg.style.transform = 'rotate(0deg) scale(1.12)';
    if(lines[4]) lines[4].style.opacity = '1';
    pulse.style.transition = 'opacity .15s';
    pulse.style.opacity = '0.8';
  }, 500);
  setTimeout(() => { pulse.style.opacity = '0'; }, 680);
  setTimeout(() => { // 900ms — flash e choca
    flash.style.opacity = '1';
    svg.style.transition = 'transform .2s ease, opacity .2s ease';
    svg.style.transform  = 'scale(1.4)';
    svg.style.opacity    = '0';
  }, 900);
  setTimeout(() => { // 1200ms — concluir
    flash.style.opacity = '0';
    hatch(); // choca de verdade
  }, 1200);
}


function cancelHatch() {
  // Free the reserved slot
  const pendingSlot = window._pendingEggSlot;
  if(typeof pendingSlot === 'number') {
    avatarSlots[pendingSlot] = null;
    window._pendingEggSlot = null;
  }

  // Hide cancel button
  const cancelBtn = document.getElementById('btnCancelHatch');
  if(cancelBtn) cancelBtn.style.display = 'none';

  // Reset egg click state
  eggClicks = 0;
  document.getElementById('eggProgress').textContent = '0 / 5';
  document.getElementById('eggHint').textContent = 'CLIQUE PARA CHOCAR';
  document.getElementById('eggCracks').style.opacity = '0';
  document.querySelectorAll('#eggCracks line').forEach(l => l.style.opacity = '0');

  // Guarda referência local ANTES de limpar o global
  // (necessário para usar no arrayRemove depois)
  const eggToRestore = window._cancelledEgg;
  window._cancelledEgg = null;

  // Devolve ovo ao inventário
  if(eggToRestore) {
    eggsInInventory.push(eggToRestore);
    renderEggInventory();
  }

  // Go back to active avatar screen
  document.getElementById('eggScreen').style.display = 'none';
  document.getElementById('actionBtns').style.opacity = '1';
  document.getElementById('actionBtns').style.pointerEvents = 'auto';

  if(hatched && !dead) {
    document.getElementById('aliveScreen').style.display = 'block';
  } else if(dead) {
    document.getElementById('deadScreen').style.display = 'block';
  } else {
    document.getElementById('idleScreen').style.display = 'flex';
  }

  // Limpa o inboxEggs usando a referência local — ainda válida após null do global
  if(walletAddress && fbDb() && eggToRestore) {
    fbDb().collection('players').doc(walletAddress).update({
      inboxEggs: firebase.firestore.FieldValue.arrayRemove(eggToRestore)
    }).catch(e => console.warn('inboxEggs cleanup failed:', e));
  }
  scheduleSave();
  addLog('Chocagem cancelada. Ovo devolvido ao inventário.', 'info');
}

function prepareEggScreen(ovo, targetSlot) {
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const crackColor = rarColors[ovo.raridade];
  summonFromEgg(ovo.raridade, ovo.elemento, crackColor, targetSlot);
}

function applyEggVisual(raridade, crackColor) {
  const stop1 = document.querySelector('#eggGrad stop:first-child');
  const stop2 = document.querySelector('#eggGrad stop:nth-child(2)');
  const stop3 = document.querySelector('#eggGrad stop:last-child');
  const aura1 = document.getElementById('eggAura1');
  const aura2 = document.getElementById('eggAura2');
  const glowEl = document.getElementById('eggGlowEl');
  const shine  = document.getElementById('eggShine');
  const sparks = document.getElementById('eggSparkles');

  if(raridade === 'Lendário') {
    // Gold / fire
    if(stop1) stop1.setAttribute('stop-color', '#c8860a');
    if(stop2) stop2.setAttribute('stop-color', '#7a4400');
    if(stop3) stop3.setAttribute('stop-color', '#1a0e00');
    if(glowEl) { glowEl.setAttribute('fill','#8a5a00'); glowEl.setAttribute('opacity','.6'); }
    if(shine)  shine.setAttribute('fill','#ffd700');
    if(aura1)  { aura1.setAttribute('stroke','#e8a030'); aura1.style.opacity='0.7'; }
    if(aura2)  { aura2.setAttribute('stroke','#ffd700'); aura2.style.opacity='0.4'; }
    if(sparks) sparks.style.opacity='1';
    // Pulse animation on auras
    if(aura1) aura1.style.animation='eggAuraPulse 1.8s ease-in-out infinite';
    if(aura2) aura2.style.animation='eggAuraPulse 1.8s ease-in-out infinite 0.4s';
  } else if(raridade === 'Raro') {
    // Blue / arcane
    if(stop1) stop1.setAttribute('stop-color', '#1a6aaa');
    if(stop2) stop2.setAttribute('stop-color', '#0d3560');
    if(stop3) stop3.setAttribute('stop-color', '#0a0f1e');
    if(glowEl) { glowEl.setAttribute('fill','#1a4a8a'); glowEl.setAttribute('opacity','.5'); }
    if(shine)  shine.setAttribute('fill','#7dc8f0');
    if(aura1)  { aura1.setAttribute('stroke','#5ab4e8'); aura1.style.opacity='0.6'; }
    if(aura2)  { aura2.setAttribute('stroke','#a0d8f0'); aura2.style.opacity='0.3'; }
    if(sparks) sparks.style.opacity='0';
    if(aura1) aura1.style.animation='eggAuraPulse 2.2s ease-in-out infinite';
    if(aura2) aura2.style.animation='eggAuraPulse 2.2s ease-in-out infinite 0.6s';
  } else {
    // Common — no aura
    if(stop1) stop1.setAttribute('stop-color', '#5a3a9a');
    if(stop2) stop2.setAttribute('stop-color', '#2d1a5e');
    if(stop3) stop3.setAttribute('stop-color', '#0b0916');
    if(glowEl) { glowEl.setAttribute('fill','#3d2a6e'); glowEl.setAttribute('opacity','.4'); }
    if(shine)  shine.setAttribute('fill','#8060c0');
    if(aura1)  aura1.style.opacity='0';
    if(aura2)  aura2.style.opacity='0';
    if(sparks) sparks.style.opacity='0';
    if(aura1) aura1.style.animation='none';
    if(aura2) aura2.style.animation='none';
  }

  // Color cracks
  if(crackColor) {
    document.querySelectorAll('#eggCracks line').forEach(l => {
      l.setAttribute('stroke', crackColor);
      l.style.opacity = '0';
    });
  }
}

function summonFromEgg(raridade, elemento, crackColor, targetSlot) {
  // Build the new avatar data (not yet active — stored as pendingEgg in target slot)
  const car       = CARACTERISTICAS_ELEMENTAIS[elemento] || null;
  const prefPool  = PREFIXOS[elemento]?.[raridade] || PREFIXOS[elemento]?.['Comum'] || ['Mistix'];
  const nome      = `${rnd(prefPool)}, ${rnd(SUFIXOS[raridade])}`;
  const descricao = rnd(DESCRICOES[raridade][elemento] || DESCRICOES[raridade]['Fogo']);
  let _h = 0;
  const _str = nome + elemento;
  for(let i=0;i<_str.length;i++){const ch=_str.charCodeAt(i);_h=((_h<<5)-_h)+ch;_h=_h&_h;}
  const seed = Math.abs(_h);

  // Reserve the target slot with pendingEgg flag — activeSlotIdx stays the same
  const tgt = (typeof targetSlot === 'number' && targetSlot >= 0) ? targetSlot : activeSlotIdx;
  while(avatarSlots.length <= tgt) avatarSlots.push(null);
  avatarSlots[tgt] = {
    nome, elemento, raridade, descricao, car, seed,
    hatched: false, dead: false, sick: false, sleeping: false,
    nivel: 1, xp: 0, vinculo: 0, totalSecs: 0,
    bornAt: 0, poopCount: 0, dirtyLevel: 0, poopPressure: 0,
    eggLayCooldown: 0, petCooldown: 0,
    vitals: {fome:100, humor:100, energia:100, saude:100, higiene:100},
    eggs: [], items: [], totalOvos: 0, totalRaros: 0, listed: false,
    pendingEgg: true,   // flag: aguarda chocagem, não é o avatar activo
    pendingSlot: tgt,   // slot onde vai nascer
  };
  // Store target slot for hatch() to use — only once
  window._pendingEggSlot = tgt;
  // Do NOT change activeSlotIdx yet — only changes when hatch() completes
  eggClicks = 0;

  // Hide alive/dead screens, show egg screen on top
  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('idleScreen').style.display  = 'none';
  document.getElementById('eggScreen').style.display   = 'flex';
  document.getElementById('actionBtns').style.opacity      = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';

  // Show cancel button so player can go back to active avatar
  const cancelBtn = document.getElementById('btnCancelHatch');
  if(cancelBtn) cancelBtn.style.display = 'flex';
  // Não salvar aqui — pendingEgg seria filtrado e o slot ficaria null
  // O ovo já está seguro no inboxEggs (escrito em confirmHatch)

  const svg = document.getElementById('eggSvg');
  svg.style.transform = 'rotate(0deg) scale(1)';
  svg.style.opacity = '1';
  svg.style.transition = '';

  applyEggVisual(raridade, crackColor);

  document.getElementById('eggCracks').style.opacity = '0';
  document.getElementById('eggProgress').textContent = '0 / 5';
  document.getElementById('eggHint').textContent = 'CLIQUE PARA CHOCAR';
  document.getElementById('eggFlash').style.opacity = '0';

  // Update right panel with pending egg info
  fillCreatureCard();
  updateAllUI();
  renderEggInventory();

  addLog(`🥚 Ovo ${raridade} de ${elemento} pronto para chocar!`, raridade === 'Lendário' ? 'leg' : raridade === 'Raro' ? 'info' : 'good');
}

function openEggInventory() {
  if(dead) return; // dead avatar can't interact
  renderEggInventory();
  ModalManager.open('eggInvModal');
}

function closeEggInventory() {
  ModalManager.close('eggInvModal');
}

function renderEggInventory() {
  const list = document.getElementById('eggInvList');
  if(!list) return;

  // Update header counter
  document.getElementById('resOvos').textContent = eggsInInventory.length;

  // Update modal subtitle
  const countEl = document.getElementById('eggInvCount');
  if(countEl) countEl.textContent = eggsInInventory.length === 0
    ? 'Nenhum ovo'
    : `${eggsInInventory.length} ovo${eggsInInventory.length > 1 ? 's' : ''}`;

  if(eggsInInventory.length === 0) {
    list.innerHTML = '<div class="egg-empty">Nenhum ovo no inventário</div>';
    return;
  }

  const rarColor = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const rarEmoji = { 'Comum':'🥚', 'Raro':'💙', 'Lendário':'🌟' };

  list.innerHTML = eggsInInventory.map(ovo => {
    const now     = Date.now();
    const expired = now > ovo.expiraEm;
    const msLeft  = ovo.expiraEm - now;
    const daysLeft = Math.max(0, Math.floor(msLeft / 86400000));
    const hoursLeft= Math.max(0, Math.floor((msLeft % 86400000) / 3600000));
    const timeStr  = expired ? '⚠️ APODRECIDO' : daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h restantes` : `${hoursLeft}h restantes`;
    const cls      = expired ? 'egg-item rotten' : 'egg-item';

    return `<div class="${cls}">
      <div class="egg-icon">${rarEmoji[ovo.raridade]}</div>
      <div class="egg-info">
        <div class="egg-name" style="color:${rarColor[ovo.raridade]}">${ovo.raridade} · ${ovo.elemento}</div>
        <div class="egg-time">${timeStr}</div>
      </div>
      <div class="egg-actions">
        ${expired
          ? `<button class="egg-btn burn" onclick="burnEgg(${ovo.id})">Descartar</button>`
          : `<button class="egg-btn hatch" onclick="hatchEggFromInventory(${ovo.id})">Chocar</button>
             ${ovo.raridade !== 'Comum' ? `<button class="egg-btn pool" onclick="sellEggToPool(${ovo.id})">💎 Pool</button>` : ''}
             <button class="egg-btn burn"  onclick="burnEgg(${ovo.id})">Queimar</button>`
        }
      </div>
    </div>`;
  }).join('');
}

function petCreature() {
  if(!canAct()) return;
  if(petCooldown > 0) return; // cooldown silencioso
  vitals.humor = Math.min(100, vitals.humor + 3);
  petCooldown = 10; // 10s cooldown
  playAnim('anim-pet');
  showBubble(rnd(FALAS.pet));
  showFloat('💕','#e830c0');
  updateAllUI();
}


// ═══════════════════════════════════════════════════════════════════
