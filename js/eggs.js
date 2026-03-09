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
  const EGG_COST = 50;
  if(gs.moedas < EGG_COST) { showBubble('Sem moedas para botar ovo... 😢'); addLog('Precisa de 50 🪙 para botar um ovo!','bad'); return; }
  spendCoins(EGG_COST);
  if(eggLayCooldown > 0) {
    const horasRestantes = Math.ceil(eggLayCooldown * 60 / 3600);
    showBubble(`Preciso descansar... (~${horasRestantes}h)`);
    return;
  }

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

function sellEgg(id) {
  addLog('📋 Listagem no marketplace requer carteira MetaMask conectada.', 'info');
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

  const hasLiveAvatar = hatched && !dead;
  let msg = '';
  if(hasLiveAvatar) {
    // Find a free slot for the new avatar
    const unlocked = getUnlockedSlots();
    let freeSlot = -1;
    for(let i = 0; i < unlocked; i++) {
      if(!avatarSlots[i] || !avatarSlots[i].nome) { freeSlot = i; break; }
    }
    if(freeSlot >= 0) {
      msg = `O novo avatar nascerá no <b style="color:#7ab87a">Slot ${freeSlot+1}</b>.<br>O teu avatar activo <b style="color:#e8a030">${avatar ? avatar.nome.split(',')[0] : ''}</b> continua no Slot ${activeSlotIdx+1}.<br><span style="font-size:7px;color:var(--muted);">Activa o novo avatar no Marketplace → Meus Avatares.</span>`;
    } else {
      msg = `Todos os slots estão ocupados.<br><b style="color:#e74c3c">Não é possível chocar</b> sem um slot livre.<br><span style="font-size:7px;color:var(--muted);">Liberta um slot no Marketplace antes de chocar.</span>`;
    }
  } else {
    msg = `O ovo nascerá no slot activo.<br>Clica 5× para fazer nascer o teu novo avatar.`;
  }
  document.getElementById('hatchConfirmMsg').innerHTML = msg;

  ModalManager.open('hatchConfirmModal');
}

function confirmHatch() {
  if(pendingHatchId === null) return;
  const idx = eggsInInventory.findIndex(e => e.id === pendingHatchId);
  if(idx === -1) { pendingHatchId = null; return; }

  // Find a free slot for the new avatar
  const unlocked = getUnlockedSlots();
  let targetSlot = -1;
  for(let i = 0; i < unlocked; i++) {
    if(!avatarSlots[i] || !avatarSlots[i].nome) { targetSlot = i; break; }
  }

  if(targetSlot === -1) {
    addLog('Sem slots livres. Liberta um slot no Marketplace.', 'bad');
    showBubble('Sem slots livres! 😢');
    pendingHatchId = null;
    ModalManager.close('hatchConfirmModal');
    return;
  }

  const ovo = eggsInInventory.splice(idx, 1)[0];
  pendingHatchId = null;
  ModalManager.close('hatchConfirmModal');

  // Hatch into the free slot — active slot stays untouched
  prepareEggScreen(ovo, targetSlot);
}

function retireAvatar() {
  const name = avatar ? avatar.nome.split(',')[0] : 'Avatar';

  // Flush runtime into active slot before retiring
  saveRuntimeToSlot(activeSlotIdx);

  // Try to find a free slot to keep the retired avatar
  const unlocked = getUnlockedSlots();
  let freeSlot = -1;
  for(let i = 0; i < unlocked; i++) {
    if(i !== activeSlotIdx && (!avatarSlots[i] || !avatarSlots[i].nome)) { freeSlot = i; break; }
  }
  if(freeSlot >= 0) {
    // Move retired avatar to free slot
    avatarSlots[freeSlot] = {...avatarSlots[activeSlotIdx]};
    addLog(`${name} foi aposentado para o Slot ${freeSlot+1}.`, 'info');
  } else {
    addLog(`${name} foi aposentado. Um novo destino aguarda...`, 'info');
  }

  // Clear the active slot for the new avatar
  avatarSlots[activeSlotIdx] = null;
  dead = false; hatched = false;
  sleeping = false;
  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('sleepOverlay').classList.remove('active');
  document.getElementById('actionBtns').classList.remove('sleeping-mode');
  ['btnFeed','btnPlay','btnSleep','btnHeal'].forEach(id => {
    const b = document.getElementById(id);
    if(b) b.classList.remove('disabled');
  });
}

function prepareEggScreen(ovo, targetSlot) {
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const crackColor = rarColors[ovo.raridade];
  summonFromEgg(ovo.raridade, ovo.elemento, crackColor, targetSlot);
}

function summonFromEgg(raridade, elemento, crackColor, targetSlot) {
  // Reset all state
  xp = 0; nivel = 1; vinculo = 0; totalSecs = 0; tickCount = 0;
  eggClicks = 0; eggLayCooldown = 0; eggLayNotified = false;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  sick = false; sleeping = false; dead = false; hatched = false;
  dirtyLevel = 0; poopCount = 0; poopPressure = 0;
  document.getElementById('poopContainer').innerHTML = '';

  // Build avatar using the same pools as triggerSummon
  const car       = CARACTERISTICAS_ELEMENTAIS[elemento] || null;
  const prefPool  = PREFIXOS[elemento]?.[raridade] || PREFIXOS[elemento]?.['Comum'] || ['Mistix'];
  const nome      = `${rnd(prefPool)}, ${rnd(SUFIXOS[raridade])}`;
  const descricao = rnd(DESCRICOES[raridade][elemento] || DESCRICOES[raridade]['Fogo']);
  let _h = 0;
  const _str = nome + elemento;
  for(let i=0;i<_str.length;i++){const ch=_str.charCodeAt(i);_h=((_h<<5)-_h)+ch;_h=_h&_h;}
  const seed = Math.abs(_h);
  // Write new avatar into target slot and switch active to it
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
  };
  // Switch active slot to new avatar — player will interact with it now
  activeSlotIdx = tgt;
  loadRuntimeFromSlot(tgt);

  // Reset UI
  eggClicks = 0;
  const svg = document.getElementById('eggSvg');
  svg.style.transform = 'rotate(0deg) scale(1)';
  svg.style.opacity = '1';
  svg.style.transition = '';

  // Color the egg and cracks based on rarity
  const eggGradStop1 = document.querySelector('#eggGrad stop:first-child');
  const eggGradStop2 = document.querySelector('#eggGrad stop:last-child');
  if(raridade === 'Raro') {
    if(eggGradStop1) eggGradStop1.setAttribute('stop-color', '#1a4a8a');
    if(eggGradStop2) eggGradStop2.setAttribute('stop-color', '#0a0f1e');
  } else if(raridade === 'Lendário') {
    if(eggGradStop1) eggGradStop1.setAttribute('stop-color', '#8a5a00');
    if(eggGradStop2) eggGradStop2.setAttribute('stop-color', '#1a0e00');
  } else {
    if(eggGradStop1) eggGradStop1.setAttribute('stop-color', '#5a3a9a');
    if(eggGradStop2) eggGradStop2.setAttribute('stop-color', '#0b0916');
  }

  // Color cracks
  document.querySelectorAll('#eggCracks line').forEach(l => {
    l.setAttribute('stroke', crackColor);
    l.style.opacity = '0';
  });
  document.getElementById('eggCracks').style.opacity = '0';
  document.getElementById('eggProgress').textContent = '0 / 5';
  document.getElementById('eggHint').textContent = 'CLIQUE PARA CHOCAR';
  document.getElementById('eggFlash').style.opacity = '0';

  // Show egg screen
  document.getElementById('eggScreen').style.display = 'flex';
  document.getElementById('actionBtns').style.opacity = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';

  // Update right panel
  fillCreatureCard();
  updateAllUI();
  renderEggInventory();

  addLog(`🥚 Ovo ${raridade} de ${elemento} pronto para chocar!`, raridade === 'Lendário' ? 'leg' : raridade === 'Raro' ? 'info' : 'good');
}

function openEggInventory() {
  if(!hatched || dead) return;
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
             <button class="egg-btn sell"  onclick="closeEggInventory();openMarket();setTimeout(()=>{mktSection('eggs');mktTab('sell');selectEggToSell(${ovo.id});},100)">Vender</button>
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
