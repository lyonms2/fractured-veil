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
    if(!s || s.pendingEgg) return null; // pendingEgg slots are never persisted
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

  // Se o activeSlotIdx vai mudar, flush o slot actual em memória primeiro
  // para não sobrescrever os eggs/items do slot antigo com os do novo
  const incomingSlotIdx = data.activeSlotIdx !== undefined ? data.activeSlotIdx : activeSlotIdx;
  if(incomingSlotIdx !== activeSlotIdx) {
    saveRuntimeToSlot(activeSlotIdx); // persiste eggs do slot actual antes de trocar
  }

  // Restore slots
  if(data.avatarSlots) {
    avatarSlots = data.avatarSlots.map(s => {
      if(!s) return null;
      const restored = {...s};
      if(restored.elemento) restored.car = CARACTERISTICAS_ELEMENTAIS[restored.elemento] || null;
      return restored;
    });
  }
  if(data.activeSlotIdx !== undefined) activeSlotIdx = data.activeSlotIdx;

  // Migration helper — builds a full slot from flat legacy fields
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

  // Case 1: no avatarSlots at all — pure legacy save
  if(!data.avatarSlots && data.avatar) {
    avatarSlots[0] = buildLegacySlot(data.avatar, data);
    activeSlotIdx  = 0;
  }

  // Case 2: avatarSlots exists but active slot is null/empty — partial migration
  // This happens when the previous refactor saved avatarSlots:[null,null,null]
  // but the real avatar data is still in the flat fields
  if(data.avatarSlots && !avatarSlots[activeSlotIdx]?.nome && data.avatar) {
    avatarSlots[activeSlotIdx] = buildLegacySlot(data.avatar, data);
  }

  // Consumir inboxEggs — ovos que chegaram pelo marketplace enquanto o jogo estava fechado
  if(data.inboxEggs && data.inboxEggs.length > 0) {
    const slot = avatarSlots[activeSlotIdx];
    if(slot) {
      // Slot existe — merge directo
      if(!slot.eggs) slot.eggs = [];
      const existingIds = new Set(slot.eggs.map(e => e.id));
      data.inboxEggs.forEach(e => {
        if(!existingIds.has(e.id)) slot.eggs.push({...e});
      });
      // Marca para limpar o inbox no próximo saveToFirebase
      window._inboxConsumed = true;
    } else {
      // Slot null — preserva como orphanEggs para não perder
      // NÃO marca _inboxConsumed — inbox fica no Firebase até haver slot activo
      window._orphanEggs = (window._orphanEggs || []).concat(
        data.inboxEggs.filter(e => {
          const existing = window._orphanEggs || [];
          return !existing.some(x => x.id === e.id);
        }).map(e => ({...e}))
      );
    }
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
    const state = getGameState();
    await fbDb().collection('players').doc(walletAddress).set(state);

    // Eggs orphans — slot estava null quando saveRuntimeToSlot correu
    // Persiste como inboxEggs para não se perderem
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
      // Não limpar inboxEggs agora — os orphans acabaram de ser escritos lá
      // O próximo applyGameState vai consumi-los normalmente
      window._inboxConsumed = false;
    } else if(window._inboxConsumed) {
      // Só limpa se não há orphans — caso contrário apagaria ovos recém-escritos
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
