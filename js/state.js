// ── Runtime state variables ──
let avatar        = null;
const vitals      = { fome:100, humor:100, energia:100, saude:100, higiene:100 };
let poopCount     = 0;
let dirtyLevel    = 0;
let poopCooldown  = 5;
let bornAt        = 0; // timestamp ms quando avatar chocou
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
    efeito:   'Reduz consumo de Fome em 2% por ciclo',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    150,
    cor:      '#7ab87a',
    efeitos:  { fomeDecayMult: 0.98 } // multiplier on fome decay
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
let hatched   = false;
let nivel     = 1;
let xp        = 0;
let vinculo   = 0;
let totalSecs = 0;
let tickCount = 0;
let eggClicks = 0;
const gs = { moedas:100, ovos:0 };

const FASES = ['BEBÊ','CRIANÇA','JOVEM','ADULTO'];
const getFase = () => nivel < 3 ? 0 : nivel < 6 ? 1 : nivel < 10 ? 2 : 3;
const FASE_SIZES = [75, 100, 120, 140]; // BEBÊ → ADULTO (px)
const getFaseSize = () => FASE_SIZES[getFase()];

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
