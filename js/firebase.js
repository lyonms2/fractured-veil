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

  // Garantir que o array cobre todos os slots desbloqueados antes de serializar
  const _neededGet = Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
  while(avatarSlots.length < _neededGet) avatarSlots.push(null);

  // FIX: se há algum slot com pendingEgg, NÃO incluir avatarSlots no save.
  // O array de slots com um null no lugar do slot pendente apagaria o avatar
  // que estava nesse slot antes da chocagem começar.
  const hasPendingEgg = avatarSlots.some(s => s && s.pendingEgg);
  if(hasPendingEgg) {
    console.log('[getGameState] pendingEgg detectado — avatarSlots não será salvo neste ciclo');
    return {
      // Salva só o estado económico e o lastSeen — slots ficam intactos no Firebase
      gs:         {...gs},
      cristais:   gs.cristais   || 0,
      extraSlots: gs.extraSlots || 0,
      cambioLog:  window._cambioLog || null,
      lastSeen:   Date.now()
      // avatarSlots deliberadamente omitido — merge:true preserva o valor actual no Firebase
    };
  }

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
      modoRepouso:    s.modoRepouso    ?? false,
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
      activeDiseases: s.activeDiseases ? [...s.activeDiseases] : [],
      diseaseStress:  s.diseaseStress  ? {...s.diseaseStress}  : { exaustao:0, desnutricao:0, infeccao:0, melancolia:0 },
      vitals:         s.vitals ? {...s.vitals} : {fome:100,humor:100,energia:100,saude:100,higiene:100},
      eggs:           (s.eggs  || []).filter(e => Date.now() < e.expiraEm).map(e => ({id:e.id, raridade:e.raridade, elemento:e.elemento, expiraEm:e.expiraEm})),
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
    cambioLog:     window._cambioLog || null,
    lastSeen:      Date.now()
  };
}

function applyGameState(data) {
  if(!data) return false;
  window.loadedLastSeen = data.lastSeen || Date.now();

  // gs (moedas, cristais, extraSlots)
  if(data.gs) Object.assign(gs, data.gs);
  if(data.cambioLog !== undefined) window._cambioLog = data.cambioLog;
  if(data.gs?.cristais   !== undefined) gs.cristais   = data.gs.cristais;
  else if(data.cristais  !== undefined) gs.cristais   = data.cristais;
  if(data.gs?.extraSlots !== undefined) gs.extraSlots = data.gs.extraSlots;
  else if(data.extraSlots !== undefined) gs.extraSlots = data.extraSlots;

  // Se o activeSlotIdx vai mudar, flush o slot actual em memória primeiro
  const incomingSlotIdx = data.activeSlotIdx !== undefined ? data.activeSlotIdx : activeSlotIdx;
  if(incomingSlotIdx !== activeSlotIdx) {
    saveRuntimeToSlot(activeSlotIdx);
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


  // Consumir inboxEggs
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

  // Garantir que o array cobre todos os slots desbloqueados restaurados
  const _neededApply = Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
  while(avatarSlots.length < _neededApply) avatarSlots.push(null);

  // Limpa itens e ovos expirados em todos os slots ao carregar
  const _now = Date.now();
  avatarSlots.forEach(slot => {
    if(!slot) return;
    if(slot.items) {
      const bi = slot.items.length;
      slot.items = slot.items.filter(i => !i.expiraEm || _now <= i.expiraEm);
      if(slot.items.length < bi) console.log(`[applyGameState] ${bi - slot.items.length} item(s) expirado(s) removido(s).`);
    }
    if(slot.eggs) {
      const be = slot.eggs.length;
      slot.eggs = slot.eggs.filter(e => _now <= e.expiraEm);
      if(slot.eggs.length < be) console.log(`[applyGameState] ${be - slot.eggs.length} ovo(s) apodrecido(s) removido(s).`);
    }
  });

  // Load active slot into runtime variables
  loadRuntimeFromSlot(activeSlotIdx);

  // Dead state vem do Firebase — fallback via RTDB presence (ver setupPresence/getPresenceData)

  // Inject orphanEggs
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

// ═══════════════════════════════════════════════════════════════════
// PRESENCE — lastSeen e deadSlot server-side via RTDB onDisconnect
// Impede que o utilizador manipule localStorage para contornar decay/morte
// ═══════════════════════════════════════════════════════════════════

function _presRef(uid) {
  const db = typeof _rtdb !== 'undefined' ? _rtdb : null;
  return (db && uid) ? db.ref('presence/' + uid) : null;
}

// Chamar após login: regista onDisconnect no RTDB — Firebase escreve server-side ao desligar
function setupPresence(uid) {
  const db = typeof _rtdb !== 'undefined' ? _rtdb : null;
  if(!db || !uid) return;
  db.ref('.info/connected').on('value', snap => {
    if(!snap.val()) return;
    const ref = _presRef(uid);
    if(!ref) return;
    ref.onDisconnect().update({
      lastSeen: firebase.database.ServerValue.TIMESTAMP,
      online:   false,
    });
    ref.update({ online: true });
  });
}

// Ler lastSeen e deadSlot do RTDB (server-side, não manipulável)
async function getPresenceData(uid) {
  const ref = _presRef(uid);
  if(!ref) return null;
  try {
    const snap = await ref.once('value');
    return snap.val() || null;
  } catch(e) { return null; }
}

// Chamar quando o avatar morre: garante dead:true mesmo se browser fechar antes do Firestore salvar
function setPresenceDead(uid, slotIdx) {
  const ref = _presRef(uid);
  if(!ref) return;
  ref.update({ deadSlot: slotIdx });
  ref.onDisconnect().update({ deadSlot: slotIdx });
}

// Limpar deadSlot após aplicado (ou após novo avatar ser invocado)
function clearPresenceDead(uid) {
  const ref = _presRef(uid);
  if(ref) ref.child('deadSlot').remove().catch(() => {});
}

// Auto-save on every gameTick cycle (every 60s)
// ═══════════════════════════════════════════════════════════════════
