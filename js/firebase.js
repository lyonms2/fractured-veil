// ═══════════════════════════════════════════════════════════════════
// WALLET
// ═══════════════════════════════════════════════════════════════════
let walletAddress = null;

// ═══════════════════════════════════════════════════════════════════
// FIREBASE HELPERS
// ═══════════════════════════════════════════════════════════════════
function fbDb() { return typeof _fbDb !== "undefined" ? _fbDb : null; }

function getGameState() {
  // Serialize avatar safely — flatten habs (array of arrays not supported by Firestore)
  let avatarSafe = null;
  if(avatar) {
    avatarSafe = {
      nome:      avatar.nome,
      elemento:  avatar.elemento,
      raridade:  avatar.raridade,
      descricao: avatar.descricao,
      seed:      avatar.seed
    };
  }
  return {
    avatar:         avatarSafe,
    hatched, dead, sick, sleeping,
    nivel, xp, vinculo, totalSecs,
    eggLayCooldown,
    poopCount, dirtyLevel, poopCooldown, bornAt,
    vitals:         {...vitals},
    gs:             {...gs},
    items:          itemInventory.map(i => ({...i})),
    eggs:           eggsInInventory.map(e => ({
      id:        e.id,
      raridade:  e.raridade,
      elemento:  e.elemento,
      expiraEm:  e.expiraEm
    })),
    lastSeen: Date.now()
  };
}

function applyGameState(data) {
  if(!data) return false;
  window.loadedLastSeen = data.lastSeen || Date.now();
  if(data.avatar) {
    // Only restore known fields — discard legacy fields (hp, stats, habs, etc.)
    const a = data.avatar;
    avatar = {
      nome:      a.nome      || '',
      elemento:  a.elemento  || 'Fogo',
      raridade:  a.raridade  || 'Comum',
      descricao: a.descricao || '',
      seed:      a.seed      || 0,
    };
    avatar.car = CARACTERISTICAS_ELEMENTAIS[avatar.elemento] || null;
  } else {
    avatar = null;
  }
  hatched       = data.hatched   ?? false;
  dead          = data.dead      ?? false;
  sick          = data.sick      ?? false;
  sleeping      = data.sleeping  ?? false;
  nivel         = data.nivel     ?? 1;
  xp            = data.xp       ?? 0;
  vinculo       = data.vinculo   ?? 0;
  totalSecs     = data.totalSecs ?? 0;
  eggLayCooldown= data.eggLayCooldown ?? 0;
  poopCount     = data.poopCount    ?? 0;
  dirtyLevel    = data.dirtyLevel   ?? 0;
  poopCooldown  = data.poopCooldown ?? 0;
  bornAt        = data.bornAt        ?? 0;
  if(data.vitals) Object.assign(vitals, data.vitals);
  if(data.gs)     Object.assign(gs, data.gs);
  if(data.eggs)   eggsInInventory = data.eggs;
  if(data.items)  itemInventory  = data.items;
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
