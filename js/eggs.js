// Taxa de chocagem por raridade (💎 cristais)
const HATCH_FEE = { 'Comum': 0, 'Raro': 1, 'Lendário': 2 };
let pendingHatchFee = 0;

async function goToMarketplace(e) {
  if(e) e.preventDefault();
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) {
    showBubble('Choca o ovo primeiro! 🥚');
    addLog('Termina a chocagem antes de ir ao Marketplace.', 'bad');
    return;
  }
  // Garante que o estado actual (incluindo dead:true) está no Firebase antes de navegar
  if(typeof saveToFirebase === 'function') {
    clearTimeout(_saveTimeout); _saveTimeout = null;
    await saveToFirebase();
  }
  window.location.href = 'marketplace.html';
}

function findTargetSlot() {
  const unlocked = getUnlockedSlots();
  const activeS = avatarSlots[activeSlotIdx];
  if(!activeS || (!activeS.hatched && !activeS.pendingEgg)) {
    return activeSlotIdx;
  }
  for(let i = 0; i < unlocked; i++) {
    if(i === activeSlotIdx) continue;
    const s = avatarSlots[i];
    if(!s || (!s.nome && !s.pendingEgg)) return i;
  }
  return -1;
}

// SISTEMA DE OVOS
// ═══════════════════════════════════════════════════════════════════

function calcEggRarity() {
  const r = avatar.raridade;
  const n = nivel;
  let chances;
  if(r === 'Comum') {
    if(n < 25)      chances = [97,   3,   0  ];
    else if(n < 35) chances = [94,   5.5, 0.5];
    else            chances = [90,   8,   2  ];
  } else if(r === 'Raro') {
    if(n < 25)      chances = [55,  40,   5  ];
    else if(n < 35) chances = [40,  50,  10  ];
    else            chances = [25,  55,  20  ];
  } else {
    if(n < 25)      chances = [20,  55,  25  ];
    else if(n < 35) chances = [10,  50,  40  ];
    else            chances = [5,   40,  55  ];
  }
  const allHigh = Object.values(vitals).every(v => v > 80);
  if(allHigh && chances[2] < 95) { chances[1] = Math.max(0, chances[1]-5); chances[2] += 5; }
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

async function layEgg() {
  if(getFase() < 3) { showBubble('Ainda não cresci o suficiente... 🥚'); return; }
  if(!avatar || !hatched || dead) return;
  if(eggLayCooldown > 0) {
    const horasRestantes = Math.ceil(eggLayCooldown * 60 / 3600);
    showBubble(`Preciso descansar... (~${horasRestantes}h)`);
    return;
  }
  if(gs.moedas < 50) { showBubble('Sem moedas para botar ovo... 😢'); addLog('Precisa de 50 🪙 para botar um ovo!','bad'); return; }
  if(eggsInInventory.length >= 10) {
    showBubble('Inventário cheio! (10 ovos máx) 🥚');
    addLog('Inventário cheio — descarta ou choca um ovo primeiro.', 'bad');
    return;
  }
  if(!firebase?.auth?.()?.currentUser) { showBubble('Conecta a conta primeiro!'); return; }

  // Bloqueia clique duplo
  eggLayCooldown = 1;
  showBubble('A botar ovo... 🥚');

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'botar-ovo', idToken }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'Erro ao botar ovo');

    // Aplica estado retornado pelo servidor
    json.eggs.forEach((ovo, i) => {
      eggsInInventory.push(ovo);
      if(avatar) {
        avatar.totalOvos  = (avatar.totalOvos  || 0) + 1;
        if(ovo.raridade !== 'Comum') avatar.totalRaros = (avatar.totalRaros || 0) + 1;
      }
    });
    gs.moedas            = json.novasMoedas;
    window._eggLayReadyAt = json.eggLayReadyAt;
    if(avatar) avatar.eggLayReadyAt = json.eggLayReadyAt;
    const msLeft = json.eggLayReadyAt - Date.now();
    eggLayCooldown = Math.ceil(msLeft / 60000);
    eggLayNotified = false;

    const raridade = json.eggs[0].raridade;
    const numEggs  = json.eggs.length;

    playAnim('anim-layegg');
    playSound('egg_laid');
    const wrap = document.getElementById('creatureWrap');
    if(wrap) {
      const ep = document.createElement('div');
      ep.className  = 'egg-pop';
      ep.textContent = raridade === 'Lendário' ? '🌟' : raridade === 'Raro' ? '🔵' : '🥚';
      ep.style.cssText = 'left:50%;top:30%;';
      wrap.appendChild(ep);
      setTimeout(() => ep.remove(), 1500);
    }

    const rarColor = raridade === 'Lendário' ? 'leg' : raridade === 'Raro' ? 'info' : 'good';
    const eggWord  = numEggs > 1 ? `${numEggs} ovos` : 'um ovo';
    showBubble(numEggs > 1 ? `Botei ${numEggs} ovos! 🥚` : `Botei um ovo ${raridade === 'Lendário' ? 'Lendário! 🌟' : raridade === 'Raro' ? 'Raro! 💙' : 'Comum! 🥚'}`);
    addLog(`🥚 Botou ${eggWord}! Verifique o inventário.`, rarColor);
    showFloat(`🥚 ×${numEggs}`, raridade === 'Lendário' ? '#e8a030' : raridade === 'Raro' ? '#5ab4e8' : '#7ab87a');
    renderEggInventory();
    updateResourceUI();
    scheduleSave();

  } catch(err) {
    eggLayCooldown = 0; // libera botão se falhou
    showBubble(`Erro: ${err.message}`);
    addLog(`⚠️ ${err.message}`, 'bad');
  }
}

function burnEgg(id) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  const ovo = eggsInInventory[idx];

  // Ovo apodrecido — descarta sem confirmação
  if(Date.now() > ovo.expiraEm) {
    eggsInInventory.splice(idx, 1);
    addLog('Ovo apodrecido descartado.', 'bad');
    renderEggInventory(); updateResourceUI(); scheduleSave();
    return;
  }

  const bonus    = rarityBonus().burnBonus;
  const bonusPct = bonus > 0 ? ` (+${Math.round(bonus*100)}% bônus)` : '';

  if(ovo.raridade === 'Comum') {
    const moedas = Math.round(20 * (1 + bonus));
    const overlay = document.getElementById('eggBurnOverlay');
    const preview = document.getElementById('eggBurnPreview');
    if(overlay && preview) {
      preview.innerHTML = `Ovo <b style="color:#7ab87a">Comum · ${esc(ovo.elemento)}</b><br>
        Receberás <b style="color:var(--gold)">${moedas} 🪙</b>${bonusPct}<br>
        <span style="color:#f87171;font-size:8px;">Esta acção é irreversível.</span>`;
      document.getElementById('eggBurnConfirmBtn').onclick = () => {
        overlay.style.display = 'none';
        _doBurnComum(id, moedas);
      };
      overlay.style.display = 'flex';
    } else {
      _doBurnComum(id, moedas);
    }
  } else {
    const baseGems = ovo.raridade === 'Lendário' ? 6 : 2;
    const finalGems = Math.round(baseGems * (1 + bonus));
    const poolOk = poolData && (poolData.cristais || 0) >= finalGems && poolDisponivel();
    const overlay = document.getElementById('eggBurnOverlay');
    const preview = document.getElementById('eggBurnPreview');
    if(overlay && preview) {
      const rarColor = ovo.raridade === 'Lendário' ? '#e8a030' : '#5ab4e8';
      preview.innerHTML = `Ovo <b style="color:${rarColor}">${esc(ovo.raridade)} · ${esc(ovo.elemento)}</b><br>
        Receberás <b style="color:#a78bfa">${finalGems} 💎</b>${bonusPct}<br>
        ${!poolOk ? `<span style="color:#f87171;font-size:8px;">⚠️ Pool com saldo insuficiente — queima bloqueada.</span>` :
          `<span style="color:#f87171;font-size:8px;">Esta acção é irreversível.</span>`}`;
      const btn = document.getElementById('eggBurnConfirmBtn');
      btn.disabled = !poolOk;
      btn.style.opacity = poolOk ? '1' : '.4';
      btn.onclick = poolOk ? () => { overlay.style.display = 'none'; _doBurnRaro(id, finalGems, bonus); } : null;
      overlay.style.display = 'flex';
    } else if(poolOk) {
      _doBurnRaro(id, finalGems, bonus);
    } else {
      addLog(`⚠️ Pool indisponível para queimar ovo ${ovo.raridade}.`, 'bad');
    }
  }
}

function _doBurnComum(id, moedas) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  eggsInInventory.splice(idx, 1);
  earnCoins(moedas);
  addLog(`🔥 Ovo Comum queimado! +${moedas} 🪙`, 'good');
  showFloat(`+${moedas}🪙`, '#c9a84c');
  renderEggInventory(); updateResourceUI(); scheduleSave();
}

async function _doBurnRaro(id, finalGems, bonus) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) return;
  const ovo = eggsInInventory[idx];
  const bonusTxt = bonus > 0 ? ` (+${Math.round(bonus*100)}% bônus)` : '';

  if(!poolData || (poolData.cristais || 0) < finalGems || !poolDisponivel()) {
    if(typeof showToast === 'function') showToast('Pool sem saldo suficiente — vende o ovo em vez de queimar.', 'warn');
    addLog(`⚠️ Pool indisponível para queimar ovo ${ovo.raridade}.`, 'bad');
    return;
  }

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'queimar-ovo', idToken, raridade: ovo.raridade, ovoId: ovo.id, gems: finalGems }),
    });
    const json = await resp.json();
    if(!json.ok) throw new Error(json.erro || 'erro');

    eggsInInventory.splice(idx, 1);
    gs.cristais = json.novosCristais;
    if(poolData) {
      poolData.cristais  = (poolData.cristais  || 0) - finalGems;
      poolData.saqueHoje = (poolData.saqueHoje || 0) + finalGems;
      poolData.totalSaiu = (poolData.totalSaiu || 0) + finalGems;
    }
    addLog(`🔥 Ovo ${ovo.raridade} queimado! +${finalGems} 💎${bonusTxt}`, 'good');
    showFloat(`+${finalGems} 💎`, '#a78bfa');
    showBubble(`+${finalGems} 💎 🔥`);
    renderEggInventory(); updateResourceUI(); renderPoolWidget();
  } catch(err) {
    console.warn('[_doBurnRaro]', err.message);
    if(typeof showToast === 'function') showToast(err.message || 'Erro ao queimar ovo.', 'warn');
    addLog(`⚠️ ${err.message}`, 'bad');
  }
}

function sellEggToPool(id) {
  const idx = eggsInInventory.findIndex(e => e.id === id);
  if(idx === -1) { addLog('Ovo não encontrado localmente.', 'bad'); return; }
  const ovo = eggsInInventory[idx];
  if(ovo.raridade === 'Comum') { addLog('Ovos Comuns não são aceites pela pool.','bad'); return; }
  if(!firebase?.auth?.()?.currentUser) { addLog('Conecta a conta primeiro.','bad'); return; }

  // Estima preço (mesmo cálculo do servidor)
  const cristaisPool = poolData?.cristais || 0;
  const ratio  = Math.min(2, cristaisPool / 1000);
  const base   = ovo.raridade === 'Lendário' ? 1.0 : 0.5;
  const minP   = ovo.raridade === 'Lendário' ? 0.25 : 0.10;
  const preco  = Math.max(minP, parseFloat((base * ratio).toFixed(2)));

  const overlay = document.getElementById('eggSellOverlay');
  const preview = document.getElementById('eggSellPreview');
  const confirmBtn = document.getElementById('eggSellConfirmBtn');
  if(!overlay || !preview || !confirmBtn) return;

  const poolOk = cristaisPool > 0;
  preview.innerHTML = `
    Ovo <strong style="color:${ovo.raridade === 'Lendário' ? '#e8a030' : '#5ab4e8'}">${ovo.raridade}</strong><br>
    Elemento: <strong>${ovo.elemento}</strong><br><br>
    ${poolOk
      ? `Receberás <strong style="color:#a78bfa">${preco} 💎</strong> da pool<br><small style="opacity:.6">(pool: ${cristaisPool} 💎 disponíveis)</small>`
      : `<span style="color:#f87171">Pool vazia de momento.<br>Tente mais tarde.</span>`
    }`;

  overlay.style.display = 'flex';

  // Remove listener anterior e adiciona novo
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  if(!poolOk) { newBtn.disabled = true; newBtn.style.opacity = '.4'; return; }

  newBtn.onclick = async () => {
    overlay.style.display = 'none';
    try {
      const idToken = await firebase.auth().currentUser.getIdToken();
      const resp = await fetch('/api/pool', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ acao: 'vender-ovo', idToken, raridade: ovo.raridade, ovoId: String(ovo.id) }),
      });
      const json = await resp.json();
      if(!json.ok) throw new Error(json.erro || 'erro');

      eggsInInventory.splice(idx, 1);
      gs.cristais = json.novosCristais;
      if(poolData) {
        poolData.cristais  = (poolData.cristais  || 0) - json.preco;
        poolData.saqueHoje = (poolData.saqueHoje || 0) + json.preco;
        poolData.totalSaiu = (poolData.totalSaiu || 0) + json.preco;
      }
      renderEggInventory();
      updateResourceUI();
      renderPoolWidget();
      addLog(`💎 Ovo ${ovo.raridade} vendido à pool por ${json.preco} 💎!`, 'good');
      showFloat(`+${json.preco} 💎`, '#a78bfa');
      showBubble(`+${json.preco} 💎 da pool!`);
      scheduleSave();
    } catch(err) {
      console.error('[sellEggToPool]', err);
      showBubble('Erro ao vender ovo 😢');
      addLog(`⚠️ ${err.message || 'Erro ao vender à pool.'}`, 'bad');
    }
  };
}

function hatchEggFromInventory(id) {
  const ovo = eggsInInventory.find(e => e.id === id);
  if(!ovo) return;
  if(Date.now() > ovo.expiraEm) {
    addLog('Este ovo apodreceu — não pode mais ser chocado.', 'bad');
    return;
  }

  pendingHatchId  = id;
  pendingHatchFee = HATCH_FEE[ovo.raridade] || 0;
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const rarEmoji  = { 'Comum':'🥚', 'Raro':'💙', 'Lendário':'🌟' };
  const color = rarColors[ovo.raridade];

  document.getElementById('hatchConfirmEgg').textContent = rarEmoji[ovo.raridade];
  document.getElementById('hatchConfirmRarity').innerHTML =
    `<span style="color:${color};font-weight:700;font-family:'Cinzel',serif">${esc(ovo.raridade.toUpperCase())} · ${esc(ovo.elemento)}</span>`;

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

  // Mostrar taxa de chocagem (se aplicável)
  if(pendingHatchFee > 0 && confirmBtn && confirmBtn.style.display !== 'none') {
    const saldo = gs.cristais || 0;
    if(saldo < pendingHatchFee) {
      msg += `<br><br><span style="color:#f87171;font-size:8px;">⚠️ Precisas de <b>${pendingHatchFee} 💎</b> para chocar.<br>Saldo actual: ${saldo} 💎</span>`;
      if(confirmBtn) confirmBtn.style.display = 'none';
    } else {
      msg += `<br><br><span style="color:#a78bfa;font-size:8px;">Taxa de choco: <b>${pendingHatchFee} 💎</b></span>`;
    }
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

  // Verificação final da taxa de chocagem
  if(pendingHatchFee > 0 && (gs.cristais || 0) < pendingHatchFee) {
    addLog(`Cristais insuficientes para chocar (precisas de ${pendingHatchFee} 💎).`, 'bad');
    pendingHatchId = null; pendingHatchFee = 0;
    ModalManager.close('hatchConfirmModal');
    return;
  }

  pendingHatchId = null;
  ModalManager.close('hatchConfirmModal');

  // Debitar taxa de chocagem
  if(pendingHatchFee > 0) {
    gs.cristais = Math.max(0, (gs.cristais || 0) - pendingHatchFee);
    updateAllUI();
    scheduleSave();
    _payHatchFeeToPool(pendingHatchFee, ovo.raridade);
    pendingHatchFee = 0;
  }

  // Backup do ovo no Firebase antes de remover da memória
  if(walletAddress && fbDb()) {
    try {
      await fbDb().collection('players').doc(walletAddress).update({
        inboxEggs: firebase.firestore.FieldValue.arrayUnion({...ovo})
      });
    } catch(e) {
      console.warn('inboxEggs backup failed:', e);
    }
  }

  eggsInInventory.splice(idx, 1);
  window._cancelledEgg = {...ovo};

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
    pendingEgg: true,   // protege o slot — firebase.js não salva avatarSlots enquanto pendingEgg existir
    pendingSlot: targetSlot,
  };
  window._pendingEggSlot = targetSlot;

  console.log('[confirmHatch] slot', targetSlot, 'reservado com pendingEgg=true');
  hatchWithAnimation(ovo.raridade, ovo.elemento, targetSlot);
}

function hatchWithAnimation(raridade, elemento, targetSlot) {
  const rarColors = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
  const crackColor = rarColors[raridade] || '#c4b5fd';

  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('idleScreen').style.display  = 'none';
  document.getElementById('eggScreen').style.display   = 'flex';
  document.getElementById('actionBtns').style.opacity      = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';
  const _cb = document.getElementById('btnCancelHatch'); if(_cb) _cb.style.display = 'none';

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

  document.getElementById('eggHint').textContent = 'A chocar...';
  document.getElementById('eggProgress').textContent = '';

  const svg    = document.getElementById('eggSvg');
  const cracks = document.getElementById('eggCracks');
  const pulse  = document.getElementById('eggPulse');
  const flash  = document.getElementById('eggFlash');
  pulse.setAttribute('stroke', crackColor);
  svg.style.transform = ''; svg.style.transition = '';

  const lines = document.querySelectorAll('#eggCracks line');

  setTimeout(() => {
    svg.style.transition = 'transform .08s ease';
    svg.style.transform  = 'rotate(-10deg) scale(1.05)';
    cracks.style.opacity = '1';
    if(lines[0]) lines[0].style.opacity = '1';
    if(lines[1]) lines[1].style.opacity = '1';
    playSound('egg_crack');
  }, 0);
  setTimeout(() => { svg.style.transform = 'rotate(8deg) scale(1.08)'; }, 120);
  setTimeout(() => {
    svg.style.transform = 'rotate(-6deg) scale(1.06)';
    if(lines[2]) lines[2].style.opacity = '1';
    if(lines[3]) lines[3].style.opacity = '1';
  }, 250);
  setTimeout(() => { svg.style.transform = 'rotate(4deg) scale(1.1)'; }, 380);
  setTimeout(() => {
    svg.style.transform = 'rotate(0deg) scale(1.12)';
    if(lines[4]) lines[4].style.opacity = '1';
    pulse.style.transition = 'opacity .15s';
    pulse.style.opacity = '0.8';
    playSound('summon_pulse');
  }, 500);
  setTimeout(() => { pulse.style.opacity = '0'; }, 680);
  setTimeout(() => {
    flash.style.opacity = '1';
    svg.style.transition = 'transform .2s ease, opacity .2s ease';
    svg.style.transform  = 'scale(1.4)';
    svg.style.opacity    = '0';
    playSound('summon_impact');
  }, 900);
  setTimeout(() => {
    flash.style.opacity = '0';
    console.log('[hatchWithAnimation] chamando hatch()');
    hatch();
  }, 1200);
}

function cancelHatch() {
  const pendingSlot = window._pendingEggSlot;
  if(typeof pendingSlot === 'number') {
    avatarSlots[pendingSlot] = null;
    window._pendingEggSlot = null;
  }

  const cancelBtn = document.getElementById('btnCancelHatch');
  if(cancelBtn) cancelBtn.style.display = 'none';

  eggClicks = 0;
  document.getElementById('eggProgress').textContent = '0 / 5';
  document.getElementById('eggHint').textContent = 'CLIQUE PARA CHOCAR';
  document.getElementById('eggCracks').style.opacity = '0';
  document.querySelectorAll('#eggCracks line').forEach(l => l.style.opacity = '0');

  const eggToRestore = window._cancelledEgg;
  window._cancelledEgg = null;

  if(eggToRestore) {
    eggsInInventory.push(eggToRestore);
    renderEggInventory();
  }

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
    if(stop1) stop1.setAttribute('stop-color', '#c8860a');
    if(stop2) stop2.setAttribute('stop-color', '#7a4400');
    if(stop3) stop3.setAttribute('stop-color', '#1a0e00');
    if(glowEl) { glowEl.setAttribute('fill','#8a5a00'); glowEl.setAttribute('opacity','.6'); }
    if(shine)  shine.setAttribute('fill','#ffd700');
    if(aura1)  { aura1.setAttribute('stroke','#e8a030'); aura1.style.opacity='0.7'; }
    if(aura2)  { aura2.setAttribute('stroke','#ffd700'); aura2.style.opacity='0.4'; }
    if(sparks) sparks.style.opacity='1';
    if(aura1) aura1.style.animation='eggAuraPulse 1.8s ease-in-out infinite';
    if(aura2) aura2.style.animation='eggAuraPulse 1.8s ease-in-out infinite 0.4s';
  } else if(raridade === 'Raro') {
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

  if(crackColor) {
    document.querySelectorAll('#eggCracks line').forEach(l => {
      l.setAttribute('stroke', crackColor);
      l.style.opacity = '0';
    });
  }
}

function summonFromEgg(raridade, elemento, crackColor, targetSlot) {
  playSound('summon_start');
  const car       = CARACTERISTICAS_ELEMENTAIS[elemento] || null;
  const prefPool  = PREFIXOS[elemento]?.[raridade] || PREFIXOS[elemento]?.['Comum'] || ['Mistix'];
  const nome      = `${rnd(prefPool)}, ${rnd(SUFIXOS[raridade])}`;
  const descricao = rnd(DESCRICOES[raridade][elemento] || DESCRICOES[raridade]['Fogo']);
  let _h = 0;
  const _str = nome + elemento;
  for(let i=0;i<_str.length;i++){const ch=_str.charCodeAt(i);_h=((_h<<5)-_h)+ch;_h=_h&_h;}
  const seed = Math.abs(_h);

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
    pendingEgg: true,
    pendingSlot: tgt,
  };
  window._pendingEggSlot = tgt;
  eggClicks = 0;

  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'none';
  document.getElementById('idleScreen').style.display  = 'none';
  document.getElementById('eggScreen').style.display   = 'flex';
  document.getElementById('actionBtns').style.opacity      = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';

  const cancelBtn = document.getElementById('btnCancelHatch');
  if(cancelBtn) cancelBtn.style.display = 'flex';

  const svg = document.getElementById('eggSvg');
  svg.style.transform = 'rotate(0deg) scale(1)';
  svg.style.opacity = '1';
  svg.style.transition = '';

  applyEggVisual(raridade, crackColor);

  document.getElementById('eggCracks').style.opacity = '0';
  document.getElementById('eggProgress').textContent = '0 / 5';
  document.getElementById('eggHint').textContent = 'CLIQUE PARA CHOCAR';
  document.getElementById('eggFlash').style.opacity = '0';

  fillCreatureCard();
  updateAllUI();
  renderEggInventory();

  addLog(`🥚 Ovo ${raridade} de ${elemento} pronto para chocar!`, raridade === 'Lendário' ? 'leg' : raridade === 'Raro' ? 'info' : 'good');
}

function openEggInventory() {
  if(dead) return;
  renderEggInventory();
  ModalManager.open('eggInvModal');
}

function closeEggInventory() {
  ModalManager.close('eggInvModal');
}

function eggMiniSVG(raridade, size = 36) {
  const cfg = {
    'Comum':   { g1:'#7a4fbb', g2:'#3d2a6e', g3:'#0b0916', shine:'#9070d0', aura:'#a78bfa', glow:'#3d2a6e' },
    'Raro':    { g1:'#3a8fd4', g2:'#1a4a7e', g3:'#060d1a', shine:'#60c0f0', aura:'#5ab4e8', glow:'#1a3a6e' },
    'Lendário':{ g1:'#d4943a', g2:'#7a4a10', g3:'#120800', shine:'#f0c860', aura:'#e8a030', glow:'#6a3a00' },
  };
  const e = cfg[raridade] || cfg['Comum'];
  const uid = raridade.replace('á','a').replace('ê','e') + '_' + Math.random().toString(36).slice(2,6);
  return `<svg width="${size}" height="${Math.round(size*1.1)}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="emg_${uid}" cx="38%" cy="28%" r="72%">
        <stop offset="0%"   stop-color="${e.g1}"/>
        <stop offset="60%"  stop-color="${e.g2}"/>
        <stop offset="100%" stop-color="${e.g3}"/>
      </radialGradient>
      <filter id="egl_${uid}"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="50" cy="58" rx="34" ry="42" fill="${e.glow}" opacity=".45" filter="url(#egl_${uid})"/>
    <ellipse cx="50" cy="56" rx="38" ry="48" fill="none" stroke="${e.aura}" stroke-width="1.2" opacity=".5"/>
    <ellipse cx="50" cy="56" rx="30" ry="38" fill="url(#emg_${uid})"/>
    <ellipse cx="42" cy="40" rx="8"  ry="13" fill="${e.shine}" opacity=".22"/>
    ${raridade === 'Lendário' ? `
    <circle cx="22" cy="22" r="2"   fill="${e.aura}" opacity=".8"/>
    <circle cx="78" cy="18" r="1.5" fill="${e.aura}" opacity=".7"/>
    <circle cx="18" cy="76" r="1.5" fill="${e.aura}" opacity=".6"/>
    <circle cx="82" cy="80" r="2"   fill="${e.aura}" opacity=".8"/>` : ''}
  </svg>`;
}

function renderEggInventory() {
  const list = document.getElementById('eggInvList');
  if(!list) return;

  document.getElementById('resOvos').textContent = eggsInInventory.length;

  const countEl = document.getElementById('eggInvCount');
  const _maxEggs = 10;
  if(countEl) countEl.textContent = eggsInInventory.length === 0
    ? `0 / ${_maxEggs} ovos`
    : `${eggsInInventory.length} / ${_maxEggs} ovo${eggsInInventory.length > 1 ? 's' : ''}`;

  if(eggsInInventory.length === 0) {
    list.innerHTML = '<div class="egg-empty">Nenhum ovo no inventário</div>';
    return;
  }

  const rarColor = { 'Comum':'#a78bfa', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };

  const sorted = [...eggsInInventory].sort((a, b) => {
    const rOrd = { 'Lendário':0, 'Raro':1, 'Comum':2 };
    if(rOrd[a.raridade] !== rOrd[b.raridade]) return rOrd[a.raridade] - rOrd[b.raridade];
    return a.expiraEm - b.expiraEm;
  });

  list.innerHTML = sorted.map(ovo => {
    const now      = Date.now();
    const expired  = now > ovo.expiraEm;
    const msLeft   = ovo.expiraEm - now;
    const daysLeft = Math.max(0, Math.floor(msLeft / 86400000));
    const hoursLeft= Math.max(0, Math.floor((msLeft % 86400000) / 3600000));
    const urgent   = !expired && msLeft < 86400000;
    const timeStr  = expired
      ? '⚠️ APODRECIDO'
      : daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h restantes`
      : `${hoursLeft}h restantes`;
    const cls = 'egg-item' + (expired ? ' rotten' : '') + (urgent ? ' urgent' : '');

    return `<div class="${cls}">
      <div class="egg-mini-svg">${eggMiniSVG(expired ? 'Comum' : ovo.raridade, 38)}</div>
      <div class="egg-info">
        <div class="egg-name" style="color:${rarColor[ovo.raridade]}">${esc(ovo.raridade)} · ${esc(ovo.elemento)}</div>
        <div class="egg-time ${urgent && !expired ? 'egg-time-urgent' : ''}">${timeStr}</div>
      </div>
      <div class="egg-actions">
        ${expired
          ? `<button class="egg-btn burn" onclick="burnEgg(${ovo.id})">Descartar</button>`
          : `<button class="egg-btn hatch" onclick="hatchEggFromInventory(${ovo.id})">🐣 Chocar</button>
             ${ovo.raridade !== 'Comum' ? `<button class="egg-btn market" onclick="listEggOnMarket(${ovo.id})">🛒</button>` : ''}
             ${ovo.raridade !== 'Comum' ? `<button class="egg-btn pool" onclick="sellEggToPool(${ovo.id})">💎</button>` : ''}
             <button class="egg-btn burn" onclick="burnEgg(${ovo.id})">🔥</button>`
        }
      </div>
    </div>`;
  }).join('');
}

async function _payHatchFeeToPool(fee, raridade) {
  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'taxa', idToken, valor: fee, motivo: `chocar ovo ${raridade}` }),
    });
  } catch(e) { console.warn('[hatch fee pool]', e); }
}

function listEggOnMarket(eggId) {
  const ovo = eggsInInventory.find(e => e.id === eggId);
  if(!ovo) return;
  const data = { id: ovo.id, raridade: ovo.raridade, elemento: ovo.elemento, expiraEm: ovo.expiraEm };
  const encoded = btoa(JSON.stringify(data));
  window.open(`marketplace.html?section=eggs&listEgg=${encoded}`, '_blank');
}

function petCreature() {
  if(!canAct()) return;
  if(petCooldown > 0) return;
  vitals.humor = Math.min(100, vitals.humor + 8);
  vinculo = Math.min(400, vinculo + 1);
  petCooldown = 10;
  playSound('pet');
  playAnim('anim-pet');
  showBubble(rnd(FALAS.pet));
  showFloat('💕','#e830c0');
  updateAllUI();
  scheduleSave();
}

// ═══════════════════════════════════════════════════════════════════
