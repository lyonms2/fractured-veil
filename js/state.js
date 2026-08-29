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
  exaustao:    { id:'exaustao',    get nome(){ return t('disease.exhaustion');   }, emoji:'😵', cor:'#e8a030', vital:'energia', limiar:20 },
  desnutricao: { id:'desnutricao', get nome(){ return t('disease.malnutrition'); }, emoji:'🥵', cor:'#e85030', vital:'fome',    limiar:15 },
  infeccao:    { id:'infeccao',    get nome(){ return t('disease.infection');    }, emoji:'🤢', cor:'#7ab830', vital:'higiene', limiar:15 },
  melancolia:  { id:'melancolia',  get nome(){ return t('disease.melancholy');   }, emoji:'😔', cor:'#8b5cf6', vital:'humor',   limiar:20 },
  // A fratura é a única que não vem de um vital em baixo — vem de cair em
  // combate. Por isso não tem 'vital' nem 'limiar': o ciclo do jogo nunca
  // a liga sozinho, quem a liga é a batalha (ver js/combate-pve.js).
  // Depois disso comporta-se como as outras: come saúde todo o ciclo e
  // mata se não for tratada. Cura-se no mesmo sítio, com o antídoto.
  fratura:     { id:'fratura',     get nome(){ return t('disease.fracture');     }, emoji:'🦴', cor:'#c9a84c', vital:null,      limiar:null },
};
const DISEASE_STRESS_THRESHOLD = 20; // 20 ciclos = ~20 min de descuido
const DISEASE_DECAY_PER_CYCLE  = 0.07; // saúde perdida por ciclo por doença ativa

let diseaseStress  = { exaustao:0, desnutricao:0, infeccao:0, melancolia:0, fratura:0 };
let activeDiseases = []; // array de ids das doenças ativas

// ═══════════════════════════════════════════════════════════════════
// O QUE CADA ACÇÃO CUSTA
//
// Estavam como `const COST = 10` dentro de cada função e outra vez à mão
// no HTML dos botões ("10 🪙", "40 🪙", "-15 ⚡"). Três cópias do mesmo
// número, e nada a obrigá-las a concordar — mudar o JS deixava o botão a
// mentir. Agora saem daqui, e o botão lê-as.
const CUSTO_NUTRIR   = 10;   // moedas
const CUSTO_MEDICAR  = 40;   // moedas
const BANHO_ENERGIA  = 15;   // energia

// ═══════════════════════════════════════════════════════════════════
let itemInventory   = [];
const MAX_EQUIPPED  = 3;
const ITEM_CATALOG = {
  'amuleto_saciedade': {
    id:       'amuleto_saciedade',
    get nome()  { return t('item.satiety_amulet.name'); },
    get desc()  { return t('item.satiety_amulet.desc'); },
    get efeito(){ return t('item.satiety_amulet.eff');  },
    emoji:    '🥞',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    800,
    cor:      '#7ab87a',
    efeitos:  { fomeDecayMult: 0.75 }
  },
  'coroa_cristal': {
    id:       'coroa_cristal',
    get nome()  { return t('item.joy_mask.name'); },
    get desc()  { return t('item.joy_mask.desc'); },
    get efeito(){ return t('item.joy_mask.eff');  },
    emoji:    '🎭',
    tipo:     'Amuleto',
    raridade: 'Raro',
    preco:    1600,
    cor:      '#e8c870',
    efeitos:  { humorDecayMult: 0.60 }
  },
  'amuleto_sono': {
    id:       'amuleto_sono',
    get nome()  { return t('item.sleep_amulet.name'); },
    get desc()  { return t('item.sleep_amulet.desc'); },
    get efeito(){ return t('item.sleep_amulet.eff');  },
    emoji:    '🌙',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    1200,
    cor:      '#7b68ee',
    efeitos:  { sleepEnergyMult: 2.0 }
  },
  // ── OS TRÊS QUE FAZEM O EQUIPAR DECIDIR ALGUMA COISA ──
  // Havia 3 amuletos para 3 espaços: quem comprava tudo equipava tudo e
  // não escolhia nada. Com seis, a escolha passa a depender do elemento
  // (o Fogo come mais, a Sombra entristece mais) e de como se joga.
  //
  // Nenhum toca em F/H/R/A. Os dois de combate mexem no CUSTO de jogar,
  // nunca no poder em batalha — é o que impede isto de virar pay-to-win
  // quando o PvP chegar.
  'pano_mares': {
    id:       'pano_mares',
    get nome()  { return t('item.tide_cloth.name'); },
    get desc()  { return t('item.tide_cloth.desc'); },
    get efeito(){ return t('item.tide_cloth.eff');  },
    emoji:    '🫧',
    tipo:     'Amuleto',
    raridade: 'Comum',
    preco:    900,
    cor:      '#5ab4e8',
    // A higiene decai devagar (0,12/s, 14 min para esvaziar), mas leva
    // −18 de rajada a cada cocô, que chega a cada ~3 refeições. A
    // pressão está no evento, não no desgaste — é aí que este item pega.
    efeitos:  { poopHigieneMult: 0.5 }
  },
  'folego_combate': {
    id:       'folego_combate',
    get nome()  { return t('item.battle_wind.name'); },
    get desc()  { return t('item.battle_wind.desc'); },
    get efeito(){ return t('item.battle_wind.eff');  },
    emoji:    '⚡',
    tipo:     'Amuleto',
    raridade: 'Raro',
    preco:    1400,
    cor:      '#e8c870',
    efeitos:  { battleEnergyMult: 0.6 }      // 10 → 6 de energia
  },
  'tala_osso': {
    id:       'tala_osso',
    get nome()  { return t('item.bone_splint.name'); },
    get desc()  { return t('item.bone_splint.desc'); },
    get efeito(){ return t('item.bone_splint.eff');  },
    emoji:    '🦴',
    tipo:     'Amuleto',
    raridade: 'Raro',
    preco:    1100,
    cor:      '#d8cfc0',
    efeitos:  { fraturaMult: 0.4 }           // 10% → 4%
  },
  'antidoto_dimensional': {
    id:         'antidoto_dimensional',
    get nome()  { return t('item.antidote.name'); },
    get desc()  { return t('item.antidote.desc'); },
    get efeito(){ return t('item.antidote.eff');  },
    emoji:      '🧪',
    tipo:       'Consumível',
    raridade:   'Especial',
    preco:      300,
    cor:        '#a855f7',
    efeitos:    {},
    consumivel: true,
    onUse:      'useAntidote',
  },
};
// O preço que o jogador paga, já com o desconto da raridade do avatar.
//
// Existe porque estava calculado em três sítios e um deles esqueceu-se
// do desconto: o cartão do Antídoto mostrava 240 a um Lendário e o
// useAntidote() cobrava os 300 do catálogo. Pior, o botão ficava ativo
// com 250 moedas, a loja fechava e o jogador levava com um erro.
function precoItem(item) {
  if(!item) return 0;
  const desconto = (typeof rarityBonus === 'function' ? rarityBonus().shopDiscount : 0) || 0;
  return Math.round(item.preco * (1 - desconto));
}

function getEquippedItems() {
  const now = Date.now();
  return itemInventory
    .filter(i => i.equipped && (!i.expiraEm || now <= i.expiraEm))
    .map(i => ITEM_CATALOG[i.catalogId])
    .filter(Boolean);
}
function getItemEffect(key) {
  return getItemEffectDoSlot(typeof activeSlotIdx !== 'undefined' ? activeSlotIdx : 0, key);
}

// O mesmo, mas de um avatar QUALQUER — não só do que está em campo.
//
// Existe por causa da batalha: ela cobra energia aos três da equipa, e
// os itens são de cada um. O getItemEffect() só sabe ler o inventário do
// slot ativo (que vive na global itemInventory); os outros guardam o
// seu em avatarSlots[i].items. Sem isto, um item de combate comprado
// para a Bruma descontava a energia da Tasha.
function getItemEffectDoSlot(idx, key) {
  const ativo = (typeof activeSlotIdx !== 'undefined') ? activeSlotIdx : 0;
  const lista  = (idx === ativo)
    ? itemInventory
    : ((typeof avatarSlots !== 'undefined' && avatarSlots[idx] && avatarSlots[idx].items) || []);
  const agora = Date.now();
  let val = 1.0;
  for(const i of lista) {
    if(!i.equipped) continue;
    if(i.expiraEm && agora > i.expiraEm) continue;      // expirado não conta
    const item = ITEM_CATALOG[i.catalogId];
    if(item && item.efeitos && item.efeitos[key] !== undefined) val *= item.efeitos[key];
  }
  return val;
}
let eggLayNotified  = false;
let sleeping    = false;
let sick        = false;
let dead        = false;
let selectedDifficulty = null;
let hatched     = false;
let nivel       = 1;
let xp          = 0;
let vinculo     = 0;
const VINCULO_TIERS = [
  { min:0,   get label(){ return t('vinculo.distant');   }, cor:'#887799' },
  { min:51,  get label(){ return t('vinculo.friend');    }, cor:'#7ab87a' },
  { min:151, get label(){ return t('vinculo.companion'); }, cor:'#5ab4e8' },
  { min:301, get label(){ return t('vinculo.soulmate');  }, cor:'#c870e8' },
];
function getVinculoTier() {
  for(let i = VINCULO_TIERS.length-1; i >= 0; i--)
    if(vinculo >= VINCULO_TIERS[i].min) return VINCULO_TIERS[i];
  return VINCULO_TIERS[0];
}
// Só o xpMult vive aqui. Havia também eggRaro e eggDura, mas os ovos
// são decididos no servidor (api/pool.js) e eram estes dois campos que
// ninguém lia — o eggDura chegou a prometer validade a dobrar durante
// todo este tempo sem nada a cumpri-lo. Os efeitos existem, estão lá:
//   vínculo 151+  → +5 de chance de ovo lendário
//   vínculo 301+  → +10 de chance, e validade do ovo a dobrar
function getVinculoBonus() {
  if(vinculo >= 301) return { xpMult:1.15 };
  if(vinculo >= 51)  return { xpMult:1.10 };
  return               { xpMult:1.0  };
}
function checkVinculoTier(oldVal) {
  const oldTier = VINCULO_TIERS.filter(t => oldVal >= t.min).length;
  const newTier = VINCULO_TIERS.filter(t => vinculo >= t.min).length;
  if(newTier > oldTier && typeof showBubble === 'function' && typeof FALAS !== 'undefined')
    showBubble(rnd(FALAS.vinculo));
}
let totalSecs = 0;
let tickCount = 0;
// Recuperação de energia dormindo enquanto ausente (offline/segundo plano) —
// metade do ritmo ao vivo (4/ciclo em js/gametick.js). Nada mais decai/recupera
// enquanto ausente, mesmo dormindo.
const OFFLINE_SLEEP_ENERGY_PER_CYCLE = 2;
const gs = { moedas:200, ovos:0, cristais:0, extraSlots:0, totalInvocacoes:0, equipa:null };
const FASES = t('fases');
const faseFromNivel = n => { const v = n||1; return v < 5 ? 0 : v < 10 ? 1 : v < 17 ? 2 : 3; };
// Idade mínima (tempo de jogo real, em segundos) por fase — impede que
// alguém compre/grinde XP e pule direto pra fase adulta sem tempo de jogo.
const FASE_MIN_SECS = [0, 2*3600, 8*3600, 20*3600];
const faseFromAge   = secs => { const s = secs||0; return s < FASE_MIN_SECS[1] ? 0 : s < FASE_MIN_SECS[2] ? 1 : s < FASE_MIN_SECS[3] ? 2 : 3; };
// A fase real do avatar precisa de nível E idade suficientes — o menor dos dois.
const getFase = () => Math.min(faseFromNivel(nivel), faseFromAge(totalSecs));
const FASE_SIZES = [75, 100, 120, 140];

/* ═══════════════════════════════════════════════════════════════════
   A FASE GANHA E A FASE VISTA

   getFase() é a fase que o avatar MERECEU: sai do nível e da idade, e
   muda sozinha. Era também a que se desenhava, e por isso o bicho crescia
   sem aviso enquanto o jogador olhava para outro lado.

   A faseVista é a que ele já CELEBROU. O corpo desenha-se por esta, e
   fica para trás até o jogador clicar em "pronto para evoluir". Entre as
   duas fica o convite.

   A mecânica NÃO espera: botar ovos, o combate e o resto continuam a
   perguntar ao getFase(). É de propósito — a cerimónia é um prémio, não
   uma tranca, e um jogador que nunca clicasse ficaria preso de outra
   forma. O que espera é só o que se vê.

   nivelVisto guarda o nível da última cerimónia, para a ficha poder
   mostrar o antes e o depois. -1 significa "ainda não sei", e é resolvido
   no primeiro carregamento para o valor atual — quem já jogava não recebe
   uma cerimónia retroativa por uma fase que já tem há semanas.
═══════════════════════════════════════════════════════════════════ */
let faseVista  = -1;
let nivelVisto = -1;

const getFaseVisual = () => faseVista < 0 ? getFase() : Math.min(getFase(), faseVista);
const getFaseSize   = () => FASE_SIZES[getFaseVisual()];
const evolucaoPendente = () => faseVista >= 0 && getFase() > faseVista;
function xpParaNivel(n) {
  if(n < 5)  return 400;
  if(n < 10) return 800;
  if(n < 17) return 1500;
  if(n < 25) return 2500;
  if(n < 35) return 4000;
  return 6000;
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
  get happy()       { return t('falas.happy');       },
  get hungry()      { return t('falas.hungry');      },
  get tired()       { return t('falas.tired');       },
  get sick()        { return t('falas.sick');        },
  get pet()         { return t('falas.pet');         },
  get bored()       { return t('falas.bored');       },
  get dirty()       { return t('falas.dirty');       },
  get win()         { return t('falas.win');         },
  get lose()        { return t('falas.lose');        },
  get roubo()       { return t('falas.roubo');       },
  get levelup()     { return t('falas.levelup');     },
  get vinculo()     { return t('falas.vinculo');     },
  get fullEnergy()  { return t('falas.fullEnergy');  },
  get item()        { return t('falas.item');        },
  get elemento() {
    const el = avatar?.elemento;
    const arr = el ? t(`falas.elem.${el}`) : null;
    return (Array.isArray(arr) && arr.length) ? arr : t('falas.happy');
  },
};
// ═══════════════════════════════════════════
// SISTEMA DE SLOTS DE AVATAR
// ═══════════════════════════════════════════
let avatarSlots   = [null, null, null];
let activeSlotIdx = 0;
// var + guard (não const): js/avatars-market.js declara os mesmos nomes para
// funcionar standalone em marketplace.html — evita SyntaxError de redeclaração
// quando ambos os arquivos carregam juntos em index.html.
// 5 slots grátis (a equipa de combate são 3, sobra margem para rodar)
// e mais 5 compráveis com cristais, até 10.
if(typeof BASE_SLOTS === 'undefined') var BASE_SLOTS = 5;
if(typeof MAX_SLOTS  === 'undefined') var MAX_SLOTS  = 10;
const SLOT_COST   = 15;

// ── INVOCAÇÃO ──
// As primeiras invocações são grátis — enchem os slots livres e formam a
// equipa de combate logo no início. A partir daí custa moedas.
//
// O contador é do total de invocações, NÃO dos avatares vivos. Isso é o
// que impede o jogador de invocar, queimar o que não gostou e invocar
// outra vez à procura do elemento ou da ficha ideal: cada tentativa gasta
// uma invocação, mesmo que o avatar acabe queimado.
const INVOCACOES_GRATIS = 5;
const SUMMON_CUSTO      = 500;
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
    bornAt, poopCount, dirtyLevel, poopPressure,
    faseVista, nivelVisto,
    eggLayCooldown, petCooldown,
    eggLayReadyAt: window._eggLayReadyAt || 0,
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
    bornAt = 0; poopCount = 0; dirtyLevel = 0; poopPressure = 0;
    faseVista = -1; nivelVisto = -1;
    eggLayCooldown = 0; petCooldown = 0;
    Object.assign(vitals, {fome:100, humor:100, energia:100, saude:100, higiene:100});
    eggsInInventory = s?.eggs  ? s.eggs.map(e => ({...e}))  : [];
    itemInventory   = s?.items ? s.items.map(i => ({...i})) : [];
    diseaseStress   = { exaustao:0, desnutricao:0, infeccao:0, melancolia:0, fratura:0 };
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
  bornAt         = s.bornAt         ?? 0;
  poopCount      = s.poopCount      ?? 0;
  dirtyLevel     = s.dirtyLevel     ?? 0;
  poopPressure   = s.poopPressure   ?? 0;
  // Quem já jogava não tem estes campos gravados: resolve-se para o que
  // ele tem agora, senão abria uma cerimónia por uma fase antiga.
  faseVista      = s.faseVista      ?? getFase();
  nivelVisto     = s.nivelVisto     ?? nivel;
  petCooldown    = s.petCooldown    ?? 0;
  // Recalcula eggLayCooldown a partir do timestamp real (funciona com página fechada)
  if(s.eggLayReadyAt && s.eggLayReadyAt > Date.now()) {
    const msLeft = s.eggLayReadyAt - Date.now();
    eggLayCooldown = Math.ceil(msLeft / 60000); // converte ms → minutos (ticks)
    window._eggLayReadyAt = s.eggLayReadyAt;
  } else {
    eggLayCooldown = 0;
    window._eggLayReadyAt = 0;
  }
  if(s.vitals) Object.assign(vitals, s.vitals);
  eggsInInventory = s.eggs  ? s.eggs.map(e => ({...e}))  : [];
  itemInventory   = s.items ? s.items.map(i => ({...i})) : [];
  diseaseStress   = s.diseaseStress  ? {...s.diseaseStress}  : { exaustao:0, desnutricao:0, infeccao:0, melancolia:0, fratura:0 };
  activeDiseases  = s.activeDiseases ? [...s.activeDiseases] : [];
}

async function switchSlot(newIdx) {
  if(newIdx === activeSlotIdx) return;
  if(newIdx < 0 || newIdx >= getUnlockedSlots()) return;
  saveRuntimeToSlot(activeSlotIdx);
  activeSlotIdx = newIdx;
  loadRuntimeFromSlot(newIdx);
  // Sem isto a interface fica mostrando o avatar anterior até um refresh
  if(typeof rebuildScreensParaSlot === 'function') rebuildScreensParaSlot();
  scheduleSave();
}
