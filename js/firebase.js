// ═══════════════════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════════════════
let walletAddress = null;

// ═══════════════════════════════════════════════════════════════════
// FIREBASE HELPERS
// ═══════════════════════════════════════════════════════════════════
function fbDb() { return typeof _fbDb !== "undefined" ? _fbDb : null; }

function getGameState() {
  // Flush current runtime state into active slot before saving
  saveRuntimeToSlot(activeSlotIdx);

  // Serialize slots — each slot is self-contained
  const slotsSafe = avatarSlots.map(s => {
    if(!s) return null;
    return {
      // Avatar identity
      nome:      s.nome      || '',
      elemento:  s.elemento  || 'Fogo',
      raridade:  s.raridade  || 'Comum',
      descricao: s.descricao || '',
      seed:      s.seed      || 0,
      listed:    s.listed    || false,
      // Runtime state
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
      eggs:           (s.eggs  || []).map(e => ({id:e.id, raridade:e.raridade, elemento:e.elemento, expiraEm:e.expiraEm})),
      items:          (s.items || []).map(i => ({...i})),
      // Marketplace stats
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
    lastSeen:      Date.now()
  };
}

function applyGameState(data) {
  if(!data) return false;
  window.loadedLastSeen = data.lastSeen || Date.now();

  // gs (moedas, cristais, extraSlots)
  if(data.gs) Object.assign(gs, data.gs);
  if(data.gs?.cristais   !== undefined) gs.cristais   = data.gs.cristais;
  else if(data.cristais  !== undefined) gs.cristais   = data.cristais;
  if(data.gs?.extraSlots !== undefined) gs.extraSlots = data.gs.extraSlots;
  else if(data.extraSlots !== undefined) gs.extraSlots = data.extraSlots;

  // Restore slots
  if(data.avatarSlots) {
    avatarSlots = data.avatarSlots.map(s => {
      if(!s) return null;
      const restored = {...s};
      // Ensure car is attached
      if(restored.elemento) restored.car = CARACTERISTICAS_ELEMENTAIS[restored.elemento] || null;
      return restored;
    });
  }
  if(data.activeSlotIdx !== undefined) activeSlotIdx = data.activeSlotIdx;

  // Legacy save migration — old saves had flat avatar/vitals/eggs/items
  if(!data.avatarSlots && data.avatar) {
    const a = data.avatar;
    const legacySlot = {
      nome: a.nome||'', elemento: a.elemento||'Fogo', raridade: a.raridade||'Comum',
      descricao: a.descricao||'', seed: a.seed||0, listed: false,
      hatched: data.hatched??false, dead: data.dead??false,
      sick: data.sick??false, sleeping: data.sleeping??false,
      nivel: data.nivel??1, xp: data.xp??0, vinculo: data.vinculo??0,
      totalSecs: data.totalSecs??0, bornAt: data.bornAt??0,
      poopCount: data.poopCount??0, dirtyLevel: data.dirtyLevel??0,
      poopPressure: data.poopPressure ?? data.poopCooldown ?? 0,
      eggLayCooldown: data.eggLayCooldown??0, petCooldown: data.petCooldown??0,
      vitals: data.vitals ? {...data.vitals} : {fome:100,humor:100,energia:100,saude:100,higiene:100},
      eggs:  (data.eggs  || []).map(e => ({...e})),
      items: (data.items || []).map(i => ({...i})),
      totalOvos: 0, totalRaros: 0,
    };
    if(legacySlot.elemento) legacySlot.car = CARACTERISTICAS_ELEMENTAIS[legacySlot.elemento] || null;
    avatarSlots[0] = legacySlot;
    activeSlotIdx  = 0;
  }

  // Load active slot into runtime variables
  loadRuntimeFromSlot(activeSlotIdx);
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
    await fbDb().collection('players').doc(walletAddress).set(getGameState());
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
