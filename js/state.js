// ── Runtime state variables ──
const vitals      = { fome:100, humor:100, energia:100, saude:100, higiene:100 };
let poopCount     = 0;
let dirtyLevel    = 0;
let poopPressure  = 0; // 0-100, sobe a cada refeição, caga quando chega ao threshold
let bornAt        = 0; // timestamp ms quando avatar chocou
let petCooldown   = 0;
let eggLayCooldown = 0;
let pendingHatchId = null;
let eggsInInventory = [];
const GAME_SPEED  = 1.0;

// ═══════════════════════════════════════════════════════════════════
// ITEM SYSTEM
// ═══════════════════════════════════════════════════════════════════
let itemInventory   = []; // { id, catalogId, equipped }
const MAX_EQUIPPED  = 3;

const ITEM_CATALOG = {
  'amuleto_saciedade': {
    id:       'amuleto_saciedade',
    nome:     'Amuleto da Saciedade',
    emoji:    '🥞',
    desc:     'Uma erva dimensional que suprime a fome e melhora a digestão.',
    efeito:   'Reduz consumo de Fome em 25% e frequência de cocô',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    150,
    cor:      '#7ab87a',
    efeitos:  { fomeDecayMult: 0.75 } // reduz 25% do decay de fome
  },
  'decoracao_pascoa': {
    id:       'decoracao_pascoa',
    nome:     'Decoração de Páscoa',
    emoji:    '🥚',
    desc:     'Ovos coloridos enfeitam o cenário. Edição limitada de Páscoa!',
    efeito:   'Decora o cenário com ovos animados',
    tipo:     'Cenário',
    raridade: 'Especial',
    preco:    120,
    cor:      '#f0a0c0',
    efeitos:  {} // puramente cosmético
  },
  'coroa_cristal': {
    id:       'coroa_cristal',
    nome:     'Máscara da Alegria',
    emoji:    '🎭',
    desc:     'Uma máscara etérea que irradia serenidade e mantém o humor elevado.',
    efeito:   'Reduz decay de Humor em 40% por ciclo',
    tipo:     'Coroa',
    raridade: 'Raro',
    preco:    300,
    cor:      '#e8c870',
    efeitos:  { humorDecayMult: 0.60 } // reduz 40% do decay de humor
  },
  'amuleto_sono': {
    id:       'amuleto_sono',
    nome:     'Amuleto do Sono Profundo',
    emoji:    '🌙',
    desc:     'Um cristal que pulsa durante o sono, amplificando a recuperação de energia.',
    efeito:   'Energia recupera 2× mais rápido dormindo',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    200,
    cor:      '#7b68ee',
    efeitos:  { sleepEnergyMult: 2.0 } // multiplier on sleep energy recovery
  }
};

function getEquippedItems() {
  const now = Date.now();
  return itemInventory
    .filter(i => i.equipped && (!i.expiraEm || now <= i.expiraEm))
    .map(i => ITEM_CATALOG[i.catalogId])
    .filter(Boolean);
}

function getItemEffect(key) {
  // Aggregate effect across all equipped items
  let val = 1.0;
  getEquippedItems().forEach(item => {
    if(item.efeitos && item.efeitos[key] !== undefined) val *= item.efeitos[key];
  });
  return val;
}
 // [{raridade, elemento, expiraEm (timestamp ms)}]
let eggLayNotified  = false; // evita notificação dupla
let sleeping  = false;
let sick      = false;
let dead      = false;
let selectedDifficulty = null; // null = automático pelo nível
let hatched   = false;
let nivel     = 1;
let xp        = 0;
let vinculo   = 0; // acumula indefinidamente, sem cap

// Tiers de vínculo
const VINCULO_TIERS = [
  { min:0,   label:'Distante',    cor:'#887799' },
  { min:51,  label:'Amigo',       cor:'#7ab87a' },
  { min:151, label:'Companheiro', cor:'#5ab4e8' },
  { min:301, label:'Alma Gémea',  cor:'#c870e8' },
];
function getVinculoTier() {
  for(let i = VINCULO_TIERS.length-1; i >= 0; i--)
    if(vinculo >= VINCULO_TIERS[i].min) return VINCULO_TIERS[i];
  return VINCULO_TIERS[0];
}
function getVinculoBonus() {
  if(vinculo >= 301) return { xpMult:1.15, eggRaro:10, eggDura:2.0 };
  if(vinculo >= 151) return { xpMult:1.10, eggRaro:5,  eggDura:1.0 };
  if(vinculo >= 51)  return { xpMult:1.10, eggRaro:0,  eggDura:1.0 };
  return               { xpMult:1.0,  eggRaro:0,  eggDura:1.0 };
}
let totalSecs = 0;
let tickCount = 0;
let eggClicks = 0;
const gs = { moedas:100, ovos:0, cristais:0, extraSlots:0 };

const FASES = ['BEBÊ','CRIANÇA','JOVEM','ADULTO'];
// Fase muda aos níveis 5, 10, 17
const getFase = () => nivel < 5 ? 0 : nivel < 10 ? 1 : nivel < 17 ? 2 : 3;
const FASE_SIZES = [75, 100, 120, 140]; // BEBÊ → ADULTO (px)
const getFaseSize = () => FASE_SIZES[getFase()];

// XP necessário para subir de nível (baseado na fase actual)
function xpParaNivel(n) {
  if(n < 5)  return 80;  // BEBÊ
  if(n < 10) return 150; // CRIANÇA
  if(n < 17) return 280; // JOVEM
  return 500;            // ADULTO
}

// Rarity multipliers — all advantages scale from here
function rarityBonus() {
  if(!avatar) return { xp:1, moedas:1, decay:1, eggs:1, cooldown:1, burnBonus:0, shopDiscount:0 };
  switch(avatar.raridade) {
    case 'Lendário': return { xp:1.6, moedas:1.5, decay:0.6, eggs:3, cooldown:0.5,  burnBonus:0.5,  shopDiscount:0.20 };
    case 'Raro':     return { xp:1.3, moedas:1.2, decay:0.8, eggs:2, cooldown:0.75, burnBonus:0.25, shopDiscount:0.10 };
    default:         return { xp:1.0, moedas:1.0, decay:1.0, eggs:1, cooldown:1.0,  burnBonus:0,    shopDiscount:0    };
  }
}

const FALAS = {
  happy:  ['Estou feliz! ✨','Te amo! 💕','Que dia incrível!','Brinca comigo!'],
  hungry: ['Estou com fome...','Me alimente!','Faminto aqui! 🍖','Preciso comer!'],
  tired:  ['Tão cansado...','Vou dormir zzz','Preciso descansar','Exausto...'],
  sick:   ['Me sinto mal...','Preciso de remédio','Não estou bem :('],
  pet:    ['Heee~ 💕','Mais! Mais!','*ronrona*','♪ ♪ ♪','Adoro você!'],
  bored:  ['Entediado...','Me divirta!','Tão entediado...'],
  dirty:  ['Estou sujo... 😔','Preciso de banho!','Limpeza por favor! 🧹','Que cheiro ruim...']
};


// ═══════════════════════════════════════════
// SISTEMA DE SLOTS DE AVATAR
// ═══════════════════════════════════════════
let avatarSlots   = [null, null, null]; // máx 3 base, até 5 com compra
let activeSlotIdx = 0;
const BASE_SLOTS  = 3;
const MAX_SLOTS   = 5;
const SLOT_COST   = 15; // 💎

function getActiveSlot()  { return avatarSlots[activeSlotIdx]; }
function getUnlockedSlots() {
  // conta quantos slots foram desbloqueados (guardado em gs)
  return Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
}

// ═══════════════════════════════════════════
// AVATAR — FONTE ÚNICA DE VERDADE: avatarSlots
// ═══════════════════════════════════════════

// avatar é sempre lido do slot activo
Object.defineProperty(window, 'avatar', {
  get() { return avatarSlots[activeSlotIdx] ?? null; },
  set(v) {
    while(avatarSlots.length <= activeSlotIdx) avatarSlots.push(null);
    avatarSlots[activeSlotIdx] = v;
  },
  configurable: true
});

// Estado em runtime que pertence ao slot activo
// Usado ao trocar de slot — save e restore
function saveRuntimeToSlot(idx) {
  if(idx === undefined) idx = activeSlotIdx;
  if(!avatarSlots[idx]) return;
  Object.assign(avatarSlots[idx], {
    nivel, xp, vinculo, totalSecs,
    hatched, dead, sick, sleeping,
    bornAt, poopCount, dirtyLevel, poopPressure,
    eggLayCooldown, petCooldown,
    vitals: {...vitals},
    eggs:   eggsInInventory.map(e => ({...e})),
    items:  itemInventory.map(i => ({...i})),
  });
}

function loadRuntimeFromSlot(idx) {
  if(idx === undefined) idx = activeSlotIdx;
  const s = avatarSlots[idx];
  if(!s || !s.hatched) {
    // Empty or un-hatched slot — reset to defaults but preserve eggs
    nivel = 1; xp = 0; vinculo = 0; totalSecs = 0;
    hatched = false; dead = false; sick = false; sleeping = false;
    bornAt = 0; poopCount = 0; dirtyLevel = 0; poopPressure = 0;
    eggLayCooldown = 0; petCooldown = 0;
    Object.assign(vitals, {fome:100, humor:100, energia:100, saude:100, higiene:100});
    // Preserve eggs from slot if they exist — don't wipe them
    eggsInInventory = s?.eggs ? s.eggs.map(e => ({...e})) : [];
    itemInventory   = s?.items ? s.items.map(i => ({...i})) : [];
    return;
  }
  nivel          = s.nivel          ?? 1;
  xp             = s.xp             ?? 0;
  vinculo        = s.vinculo        ?? 0;
  totalSecs      = s.totalSecs      ?? 0;
  hatched        = s.hatched        ?? false;
  dead           = s.dead           ?? false;
  sick           = s.sick           ?? false;
  sleeping       = s.sleeping       ?? false;
  bornAt         = s.bornAt         ?? 0;
  poopCount      = s.poopCount      ?? 0;
  dirtyLevel     = s.dirtyLevel     ?? 0;
  poopPressure   = s.poopPressure   ?? 0;
  eggLayCooldown = s.eggLayCooldown ?? 0;
  petCooldown    = s.petCooldown    ?? 0;
  if(s.vitals) Object.assign(vitals, s.vitals);
  eggsInInventory = s.eggs  ? s.eggs.map(e => ({...e}))  : [];
  itemInventory   = s.items ? s.items.map(i => ({...i})) : [];
}

// Troca de slot activo (chamado pelo marketplace ou UI futura)
async function switchSlot(newIdx) {
  if(newIdx === activeSlotIdx) return;
  if(newIdx < 0 || newIdx >= getUnlockedSlots()) return;
  saveRuntimeToSlot(activeSlotIdx);   // guarda estado actual no slot antigo
  activeSlotIdx = newIdx;
  loadRuntimeFromSlot(newIdx);        // carrega estado do novo slot
  scheduleSave();
}
