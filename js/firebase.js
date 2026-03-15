// ═══════════════════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════════════════
let walletAddress = null;

// ═══════════════════════════════════════════════════════════════════
// FIREBASE HELPERS
// ═══════════════════════════════════════════════════════════════════
function fbDb() { return typeof _fbDb !== "undefined" ? _fbDb : null; }

function getGameState() {
  saveRuntimeToSlot(activeSlotIdx);

  const _neededGet = Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
  while(avatarSlots.length < _neededGet) avatarSlots.push(null);

  const slotsSafe = avatarSlots.map(s => {
    if(!s || s.pendingEgg) return null;
    return {
      nome:      s.nome      || '',
      elemento:  s.elemento  || 'Fogo',
      raridade:  s.raridade  || 'Comum',
      descricao: s.descricao || '',
      seed:      s.seed      || 0,
      listed:    s.listed    || false,
      hatched:        s.hatched        ?? false,
      dead:           s.dead           ?? false,
      sick:           s.sick           ?? false,
      sleeping:       s.sleeping       ?? false,
      nivel:          s.nivel          ?? 1,
      xp:             s.xp             ?? 0,
      vinculo:        s.vinculo        ?? 0,
      totalSecs:      s.totalSecs      ?? 0,
      bornAt:         s.bornAt         ?? 0,
      poopCount:      s.poopCount      ?? 0,
      dirtyLevel:     s.dirtyLevel     ?? 0,
      poopPressure:   s.poopPressure   ?? 0,
      eggLayCooldown: s.eggLayCooldown ?? 0,
      petCooldown:    s.petCooldown    ?? 0,
      vitals:         s.vitals ? {...s.vitals} : {fome:100,humor:100,energia:100,saude:100,higiene:100},
      eggs:           (s.eggs  || []).filter(e => Date.now() < e.expiraEm).map(e => ({id:e.id, raridade:e.raridade, elemento:e.elemento, expiraEm:e.expiraEm})),
      items:          (s.items || []).map(i => ({...i})),
      diasVida:   s.bornAt ? Math.floor((Date.now()-s.bornAt)/86400000) : 0,
      totalOvos:  s.totalOvos  || 0,
      totalRaros: s.totalRaros || 0,
    };
  });

  return {
    avatarSlots:   slotsSafe,
    activeSlotIdx: activeSlotIdx,
    gs:            {...gs},
    cristais:      gs.cristais   || 0,
    extraSlots:    gs.extraSlots || 0,
    modoRepouso:   typeof modoRepouso !== 'undefined' ? !!modoRepouso : false, // ← persistir modo repouso
    lastSeen:      Date.now()
  };
}

function applyGameState(data) {
  if(!data) return false;
  window.loadedLastSeen = data.lastSeen || Date.now();

  if(data.gs) Object.assign(gs, data.gs);
  if(data.gs?.cristais   !== undefined) gs.cristais   = data.gs.cristais;
  else if(data.cristais  !== undefined) gs.cristais   = data.cristais;
  if(data.gs?.extraSlots !== undefined) gs.extraSlots = data.gs.extraSlots;
  else if(data.extraSlots !== undefined) gs.extraSlots = data.extraSlots;

  const incomingSlotIdx = data.activeSlotIdx !== undefined ? data.activeSlotIdx : activeSlotIdx;
  if(incomingSlotIdx !== activeSlotIdx) {
    saveRuntimeToSlot(activeSlotIdx);
  }

  if(data.avatarSlots) {
    avatarSlots = data.avatarSlots.map(s => {
      if(!s) return null;
      const restored = {...s};
      if(restored.elemento) restored.car = CARACTERISTICAS_ELEMENTAIS[restored.elemento] || null;
      return restored;
    });
  }
  if(data.activeSlotIdx !== undefined) activeSlotIdx = data.activeSlotIdx;

  function buildLegacySlot(a, d) {
    const slot = {
      nome: a.nome||'', elemento: a.elemento||'Fogo', raridade: a.raridade||'Comum',
      descricao: a.descricao||'', seed: a.seed||0, listed: false,
      hatched: d.hatched??false, dead: d.dead??false,
      sick: d.sick??false, sleeping: d.sleeping??false,
      nivel: d.nivel??1, xp: d.xp??0, vinculo: d.vinculo??0,
      totalSecs: d.totalSecs??0, bornAt: d.bornAt??0,
      poopCount: d.poopCount??0, dirtyLevel: d.dirtyLevel??0,
      poopPressure: d.poopPressure ?? d.poopCooldown ?? 0,
      eggLayCooldown: d.eggLayCooldown??0, petCooldown: d.petCooldown??0,
      vitals: d.vitals ? {...d.vitals} : {fome:100,humor:100,energia:100,saude:100,higiene:100},
      eggs:  (d.eggs  || []).map(e => ({...e})),
      items: (d.items || []).map(i => ({...i})),
      totalOvos: 0, totalRaros: 0,
    };
    if(slot.elemento) slot.car = CARACTERISTICAS_ELEMENTAIS[slot.elemento] || null;
    return slot;
  }

  if(!data.avatarSlots && data.avatar) {
    avatarSlots[0] = buildLegacySlot(data.avatar, data);
    activeSlotIdx  = 0;
  }

  if(data.avatarSlots && !avatarSlots[activeSlotIdx]?.nome && data.avatar) {
    avatarSlots[activeSlotIdx] = buildLegacySlot(data.avatar, data);
  }

  if(data.inboxEggs && data.inboxEggs.length > 0) {
    data.inboxEggs = data.inboxEggs.filter(e => Date.now() < e.expiraEm);
    const slot = avatarSlots[activeSlotIdx];
    if(slot) {
      if(!slot.eggs) slot.eggs = [];
      const MAX_EGGS = 10;
      const existingIds = new Set(slot.eggs.map(e => e.id));
      const overflow = [];
      data.inboxEggs.forEach(e => {
        if(existingIds.has(e.id)) return;
        if(slot.eggs.length < MAX_EGGS) {
          slot.eggs.push({...e});
          existingIds.add(e.id);
        } else {
          overflow.push(e);
        }
      });
      if(overflow.length > 0) {
        window._inboxOverflow = overflow;
        console.warn(`inboxEggs: ${overflow.length} ovo(s) não cabem no inventário (limite ${MAX_EGGS})`);
      }
      window._inboxConsumed = true;
    } else {
      window._orphanEggs = (window._orphanEggs || []).concat(
        data.inboxEggs.filter(e => {
          const existing = window._orphanEggs || [];
          return !existing.some(x => x.id === e.id);
        }).map(e => ({...e}))
      );
    }
  }

  const _neededApply = Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
  while(avatarSlots.length < _neededApply) avatarSlots.push(null);

  loadRuntimeFromSlot(activeSlotIdx);

  if(window._orphanEggs && window._orphanEggs.length > 0) {
    const existingIds = new Set(eggsInInventory.map(e => e.id));
    window._orphanEggs.forEach(e => {
      if(!existingIds.has(e.id)) eggsInInventory.push({...e});
    });
    const slot = avatarSlots[activeSlotIdx];
    if(slot) {
      if(!slot.eggs) slot.eggs = [];
      const slotIds = new Set(slot.eggs.map(e => e.id));
      window._orphanEggs.forEach(e => {
        if(!slotIds.has(e.id)) slot.eggs.push({...e});
      });
      window._orphanEggs = null;
      window._inboxConsumed = true;
    }
  }

  // ── Restaurar modo repouso ──
  // Feito APÓS loadRuntimeFromSlot para garantir que hatched/dead já foram restaurados
  if(data.modoRepouso && typeof modoRepouso !== 'undefined') {
    // Só restaura se o avatar está vivo e acordado
    if(hatched && !dead && !sleeping) {
      modoRepouso = true;
      // Aplica visual sem chamar ativarModoRepouso() para não gravar de novo
      setTimeout(() => {
        const overlay = document.getElementById('repousoOverlay');
        const btn     = document.getElementById('btnSleep');
        if(overlay) overlay.classList.add('active');
        if(btn) {
          btn.querySelector('.icon').textContent            = '💤';
          const lbl = document.getElementById('sleepLabel');
          if(lbl) lbl.textContent = 'REPOUSO';
          btn.classList.add('active-repouso');
        }
        const ab = document.getElementById('actionBtns');
        if(ab) ab.classList.add('repouso-mode');
        addLog('Modo repouso restaurado. ⏸', 'info');
        showBubble('Ainda em repouso... 🌙');
      }, 500); // delay para o DOM estar pronto
    }
  }

  return true;
}

let _saveTimeout = null;
function scheduleSave() {
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveToFirebase, 5000);
}

async function saveToFirebase() {
  if(!walletAddress || !fbDb()) return;
  try {
    const state = getGameState();
    await fbDb().collection('players').doc(walletAddress).set(state, { merge: true });

    const hasOrphans = window._orphanEggs && window._orphanEggs.length > 0;
    if(hasOrphans) {
      const toAdd = window._orphanEggs.filter(e => e.id);
      if(toAdd.length > 0) {
        for(const egg of toAdd) {
          await fbDb().collection('players').doc(walletAddress).update({
            inboxEggs: firebase.firestore.FieldValue.arrayUnion(egg)
          });
        }
      }
      window._orphanEggs  = null;
      window._orphanItems = null;
      window._inboxConsumed = false;
    } else if(window._inboxConsumed) {
      window._inboxConsumed = false;
      await fbDb().collection('players').doc(walletAddress).update({ inboxEggs: [] });
    }
  } catch(e) { console.warn('Save error:', e); }
}

async function loadFromFirebase() {
  if(!walletAddress || !fbDb()) return false;
  try {
    const snap = await fbDb().collection('players').doc(walletAddress).get();
    if(!snap.exists) return false;
    applyGameState(snap.data());
    return true;
  } catch(e) { console.warn('Load error:', e); return false; }
}

// Auto-save on every gameTick cycle (every 60s)
// ═══════════════════════════════════════════════════════════════════
