// ── Runtime state variables ──
const vitals      = { fome:100, humor:100, energia:100, saude:100, higiene:100 };
let poopCount     = 0;
let dirtyLevel    = 0;
let poopPressure  = 0;
let bornAt        = 0;
let petCooldown   = 0;
let eggLayCooldown = 0;
let pendingHatchId = null;
let eggsInInventory = [];
const GAME_SPEED  = 1.0;
// ═══════════════════════════════════════════════════════════════════
// ITEM SYSTEM
// ═══════════════════════════════════════════════════════════════════
// SISTEMA DE DOENÇAS
// ═══════════════════════════════════════════════════════════════════
const DISEASES = {
  exaustao:    { id:'exaustao',    nome:'Exaustão Crónica',      emoji:'😵', cor:'#e8a030', vital:'energia', limiar:20 },
  desnutricao: { id:'desnutricao', nome:'Desnutrição',           emoji:'🥵', cor:'#e85030', vital:'fome',    limiar:15 },
  infeccao:    { id:'infeccao',    nome:'Infecção',              emoji:'🤢', cor:'#7ab830', vital:'higiene', limiar:15 },
  melancolia:  { id:'melancolia',  nome:'Melancolia Dimensional',emoji:'😔', cor:'#8b5cf6', vital:'humor',   limiar:20 },
};
const DISEASE_STRESS_THRESHOLD = 20; // 20 ciclos = ~20 min de descuido
const DISEASE_DECAY_PER_CYCLE  = 0.07; // saúde perdida por ciclo por doença activa

let diseaseStress  = { exaustao:0, desnutricao:0, infeccao:0, melancolia:0 };
let activeDiseases = []; // array de ids das doenças activas

// ═══════════════════════════════════════════════════════════════════
let itemInventory   = [];
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
    preco:    800,
    cor:      '#7ab87a',
    efeitos:  { fomeDecayMult: 0.75 }
  },
  'decoracao_pascoa': {
    id:       'decoracao_pascoa',
    nome:     'Decoração de Páscoa',
    emoji:    '🥚',
    desc:     'Ovos coloridos enfeitam o cenário. Edição limitada de Páscoa!',
    efeito:   'Decora o cenário com ovos animados',
    tipo:     'Cenário',
    raridade: 'Especial',
    preco:    500,
    cor:      '#f0a0c0',
    efeitos:  {}
  },
  'coroa_cristal': {
    id:       'coroa_cristal',
    nome:     'Máscara da Alegria',
    emoji:    '🎭',
    desc:     'Uma máscara etérea que irradia serenidade e mantém o humor elevado.',
    efeito:   'Reduz decay de Humor em 40% por ciclo',
    tipo:     'Coroa',
    raridade: 'Raro',
    preco:    1600,
    cor:      '#e8c870',
    efeitos:  { humorDecayMult: 0.60 }
  },
  'amuleto_sono': {
    id:       'amuleto_sono',
    nome:     'Amuleto do Sono Profundo',
    emoji:    '🌙',
    desc:     'Um cristal que pulsa durante o sono, amplificando a recuperação de energia.',
    efeito:   'Energia recupera 2× mais rápido dormindo',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    1200,
    cor:      '#7b68ee',
    efeitos:  { sleepEnergyMult: 2.0 }
  },
  'antidoto_dimensional': {
    id:         'antidoto_dimensional',
    nome:       'Antídoto Dimensional',
    emoji:      '🧪',
    desc:       'Uma poção de cristal purificado que dissolve qualquer mal que aflige o avatar.',
    efeito:     'Cura todas as doenças activas + recupera +20 saúde',
    tipo:       'Consumível',
    raridade:   'Especial',
    preco:      300,
    cor:        '#a855f7',
    efeitos:    {},
    consumivel: true,
    onUse:      'useAntidote',
  },
};
function getEquippedItems() {
  const now = Date.now();
  return itemInventory
    .filter(i => i.equipped && (!i.expiraEm || now <= i.expiraEm))
    .map(i => ITEM_CATALOG[i.catalogId])
    .filter(Boolean);
}
function getItemEffect(key) {
  let val = 1.0;
  getEquippedItems().forEach(item => {
    if(item.efeitos && item.efeitos[key] !== undefined) val *= item.efeitos[key];
  });
  return val;
}
let eggLayNotified  = false;
let sleeping    = false;
let modoRepouso = false;
let sick        = false;
let dead        = false;
let selectedDifficulty = null;
let hatched     = false;
let nivel       = 1;
let xp          = 0;
let vinculo     = 0;
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
const getFase = () => nivel < 5 ? 0 : nivel < 10 ? 1 : nivel < 17 ? 2 : 3;
const FASE_SIZES = [75, 100, 120, 140];
const getFaseSize = () => FASE_SIZES[getFase()];
function xpParaNivel(n) {
  if(n < 5)  return 80;
  if(n < 10) return 150;
  if(n < 17) return 280;
  return 500;
}
function rarityBonus() {
  if(!avatar) return { xp:1, moedas:1, decay:1, eggs:1, cooldown:1, burnBonus:0, shopDiscount:0 };
  switch(avatar.raridade) {
    case 'Lendário': return { xp:1.6, moedas:1.5, decay:0.6, eggs:3, cooldown:1.5,  burnBonus:0.5,  shopDiscount:0.20 };
    case 'Raro':     return { xp:1.3, moedas:1.2, decay:0.8, eggs:2, cooldown:2.0,  burnBonus:0.25, shopDiscount:0.10 };
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
let avatarSlots   = [null, null, null];
let activeSlotIdx = 0;
const BASE_SLOTS  = 3;
const MAX_SLOTS   = 5;
const SLOT_COST   = 15;
function getActiveSlot()  { return avatarSlots[activeSlotIdx]; }
function getUnlockedSlots() {
  return Math.min(MAX_SLOTS, BASE_SLOTS + (gs.extraSlots || 0));
}
// ═══════════════════════════════════════════
// AVATAR — FONTE ÚNICA DE VERDADE: avatarSlots
// ═══════════════════════════════════════════
Object.defineProperty(window, 'avatar', {
  get() { return avatarSlots[activeSlotIdx] ?? null; },
  set(v) {
    while(avatarSlots.length <= activeSlotIdx) avatarSlots.push(null);
    avatarSlots[activeSlotIdx] = v;
  },
  configurable: true
});

function saveRuntimeToSlot(idx) {
  if(idx === undefined) idx = activeSlotIdx;
  if(!avatarSlots[idx]) {
    if(eggsInInventory.length > 0 || itemInventory.length > 0) {
      window._orphanEggs  = eggsInInventory.map(e => ({...e}));
      window._orphanItems = itemInventory.map(i => ({...i}));
    }
    return;
  }
  Object.assign(avatarSlots[idx], {
    nivel, xp, vinculo, totalSecs,
    hatched, dead, sick, sleeping,
    modoRepouso,
    bornAt, poopCount, dirtyLevel, poopPressure,
    eggLayCooldown, petCooldown,
    vitals:         {...vitals},
    eggs:           eggsInInventory.map(e => ({...e})),
    items:          itemInventory.map(i => ({...i})),
    diseaseStress:  {...diseaseStress},
    activeDiseases: [...activeDiseases],
  });
}

function loadRuntimeFromSlot(idx) {
  if(idx === undefined) idx = activeSlotIdx;
  const s = avatarSlots[idx];
  if(!s || !s.hatched) {
    nivel = 1; xp = 0; vinculo = 0; totalSecs = 0;
    hatched = false; dead = false; sick = false; sleeping = false;
    modoRepouso = false;
    bornAt = 0; poopCount = 0; dirtyLevel = 0; poopPressure = 0;
    eggLayCooldown = 0; petCooldown = 0;
    Object.assign(vitals, {fome:100, humor:100, energia:100, saude:100, higiene:100});
    eggsInInventory = s?.eggs  ? s.eggs.map(e => ({...e}))  : [];
    itemInventory   = s?.items ? s.items.map(i => ({...i})) : [];
    diseaseStress   = { exaustao:0, desnutricao:0, infeccao:0, melancolia:0 };
    activeDiseases  = [];
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
  modoRepouso    = s.modoRepouso    ?? false;  // FIX: restaura modo repouso do slot
  bornAt         = s.bornAt         ?? 0;
  poopCount      = s.poopCount      ?? 0;
  dirtyLevel     = s.dirtyLevel     ?? 0;
  poopPressure   = s.poopPressure   ?? 0;
  eggLayCooldown = s.eggLayCooldown ?? 0;
  petCooldown    = s.petCooldown    ?? 0;
  if(s.vitals) Object.assign(vitals, s.vitals);
  eggsInInventory = s.eggs  ? s.eggs.map(e => ({...e}))  : [];
  itemInventory   = s.items ? s.items.map(i => ({...i})) : [];
  diseaseStress   = s.diseaseStress  ? {...s.diseaseStress}  : { exaustao:0, desnutricao:0, infeccao:0, melancolia:0 };
  activeDiseases  = s.activeDiseases ? [...s.activeDiseases] : [];
}

async function switchSlot(newIdx) {
  if(newIdx === activeSlotIdx) return;
  if(newIdx < 0 || newIdx >= getUnlockedSlots()) return;
  saveRuntimeToSlot(activeSlotIdx);
  activeSlotIdx = newIdx;
  loadRuntimeFromSlot(newIdx);
  scheduleSave();
}
