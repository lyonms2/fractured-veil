// ── Runtime state variables ──
let avatar        = null;
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
    emoji:    '🔮',
    desc:     'Uma gema ancestral que suprime a fome.',
    efeito:   'Reduz consumo de Fome em 25% por ciclo',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    150,
    cor:      '#7ab87a',
    efeitos:  { fomeDecayMult: 0.75 } // reduz 25% do decay de fome
  },
  'coroa_cristal': {
    id:       'coroa_cristal',
    nome:     'Coroa de Cristal',
    emoji:    '👑',
    desc:     'Uma coroa etérea forjada em cristal dimensional. Irradia serenidade.',
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
    desc:     'Um cristal lunar que amplifica o descanso dimensional.',
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
const gs = { moedas:100, ovos:0 };

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

