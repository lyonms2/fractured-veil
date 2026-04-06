// ═══════════════════════════════════════════
// SISTEMAS DO JOGO
// ═══════════════════════════════════════════

// Escapa HTML para prevenir XSS ao inserir dados do Firebase em innerHTML
function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CARACTERISTICAS_ELEMENTAIS = {
  'Fogo':         { bonus:'Espírito Ardente: humor decai 15% mais devagar, fome 10% mais rápido', cor:'#FF4500', emoji:'🔥', decor:['🌋','🌶️'] },
  'Água':         { bonus:'Serenidade das Marés: humor e higiene decaem 15% mais devagar', cor:'#1E90FF', emoji:'💧', decor:['🌊','🐚'] },
  'Terra':        { bonus:'Raízes Profundas: fome decai 15% mais devagar', cor:'#8B4513', emoji:'🌿', decor:['🌿','🍄'] },
  'Vento':        { bonus:'Leveza do Vento: energia decai 15% mais devagar', cor:'#87CEEB', emoji:'🌪️', decor:['🍃','🌸'] },
  'Eletricidade': { bonus:'Mente Acelerada: energia decai 10% mais devagar, recupera 15% mais rápido dormindo', cor:'#FFD700', emoji:'⚡', decor:['⚡','🔮'] },
  'Sombra':       { bonus:'Ciclo Lunar: higiene decai 10% mais devagar, recupera energia 15% mais rápido dormindo', cor:'#8B008B', emoji:'🌑', decor:['🌙','🦋'] },
  'Luz':          { bonus:'Aura Solar: vínculo decai 20% mais devagar, humor 10% mais devagar', cor:'#FFD700', emoji:'✨', decor:['⭐','🌟'] },
  'Void':         { bonus:'Essência Vazia: fome e humor decaem 10% mais devagar, higiene 5% mais rápido', cor:'#9b30e8', emoji:'🕳️', decor:['🔮','💫'] },
  'Aether':       { bonus:'Potencial Infinito: todos os stats decaem 5% mais devagar', cor:'#e830c0', emoji:'🌌', decor:['🌌','💫'] }
};

const PREFIXOS = {
  'Fogo':         { 'Comum':['Ember','Spark','Cinder','Ash','Scorch','Char'], 'Raro':['Ignis','Pyro','Vulcan','Blaze','Inferno','Magma'], 'Lendário':['Prometheus','Surtr','Hephaestus','Helios','Agni','Kagutsuchi'] },
  'Água':         { 'Comum':['Drip','Mist','Tide','Brook','Rain','Dew'], 'Raro':['Aqua','Hydro','Oceanus','Torrent','Cascade','Glacier'], 'Lendário':['Poseidon','Leviathan','Tiamat','Ægir','Ryūjin','Sedna'] },
  'Terra':        { 'Comum':['Pebble','Clay','Dust','Sand','Mud','Stone'], 'Raro':['Terra','Geo','Boulder','Titan','Granite','Bedrock'], 'Lendário':['Atlas','Gaia','Cronus','Ymir','Nidhogg','Kū'] },
  'Vento':        { 'Comum':['Breeze','Gust','Wisp','Draft','Waft','Puff'], 'Raro':['Aero','Zephyr','Gale','Storm','Tempest','Cyclone'], 'Lendário':['Fujin','Boreas','Aeolus','Enlil','Stribog','Vayu'] },
  'Eletricidade': { 'Comum':['Static','Pulse','Current','Charge','Jolt','Buzz'], 'Raro':['Volt','Thunder','Spark','Bolt','Tesla','Ion'], 'Lendário':['Zeus','Thor','Raijin','Indra','Perun','Ukko'] },
  'Sombra':       { 'Comum':['Shade','Dusk','Murk','Gloom','Haze','Dim'], 'Raro':['Umbra','Nox','Eclipse','Void','Phantom','Abyss'], 'Lendário':['Erebus','Nyx','Tenebris','Moros','Kali','Apophis'] },
  'Luz':          { 'Comum':['Gleam','Shimmer','Glow','Ray','Beam','Flash'], 'Raro':['Lux','Sol','Aurora','Radiant','Dawn','Celestial'], 'Lendário':['Ra','Apollo','Amaterasu','Lucifer','Baldur','Inti'] },
  'Void':         { 'Comum':['Null','Zero','Empty','Hollow','Blank','Naught'], 'Raro':['Nihil','Vacuo','Oblivion','Entropy','Nullus','Absence'], 'Lendário':['Ouroboros','Azathoth','Chronos','Shūnyatā','Annihilus','The Uncreated'] },
  'Aether':       { 'Comum':['Flux','Shift','Essence','Mote','Spark','Glimmer'], 'Raro':['Aether','Quintessence','Prisma','Nexus','Catalyst','Arcanum'], 'Lendário':['Metatron','Akasha','Philosopher','Prima Materia','The Unified','Yggdrasil'] }
};
const SUFIXOS = {
  'Comum':    ['o Curioso','o Brincalhão','o Tímido','o Guloso','o Sonolento','o Teimoso','o Carinhoso','o Inquieto'],
  'Raro':     ['o Sábio','o Misterioso','o Sereno','o Vibrante','o Contemplativo','o Peculiar','o Sensível','o Antigo'],
  'Lendário': ['o Eterno','o Primordial','o Transcendente','o Visionário','o Imorredouro','o Sempiterno','o Singular','o Majestoso']
};
const DESCRICOES = {
  'Comum': {
    'Fogo':['Uma centelha dimensional que encontrou forma própria. Curioso e impulsivo, aquece tudo ao redor sem perceber.','Nascido do calor residual de uma fissura entre mundos. Ainda aprendendo a controlar a intensidade do seu brilho.'],
    'Água':['Uma gotícula que se separou do grande oceano etéreo. Adaptável e sereno, flui para onde mais precisa de presença.','Espírito aquático jovem que ainda descobre a extensão do seu fluxo. Atento a cada detalhe ao redor.'],
    'Terra':['Um fragmento de argila primordial que ganhou consciência. Paciente e estável, cresce devagar mas com raízes firmes.','Pedaço de solo antigo que aprendeu a sentir. Prefere a calma, mas guarda uma força silenciosa surpreendente.'],
    'Vento':['Uma brisa que decidiu ter forma. Livre e inquieto, dificilmente fica parado por muito tempo.','Nascido de correntes de ar entre dimensões. Leve e curioso, tudo o entretém por igual.'],
    'Eletricidade':['Uma faísca de consciência elétrica. Pensa rápido, reage rápido, e raramente fica quieto.','Nascido de um relâmpago perdido entre camadas dimensionais. Sua energia transborda em tudo que faz.'],
    'Sombra':['Uma sombra que aprendeu a existir por conta própria. Observador silencioso, prefere entender antes de agir.','Nascido da penumbra entre mundos. Contemplativo e introspectivo, guarda mais do que mostra.'],
    'Luz':['Um raio de luz que atravessou dimensões e ganhou sentimento. Caloroso e presente, ilumina o espaço ao redor.','Nascido do amanhecer de outro mundo. Gentil por natureza, seu brilho cresce com o tempo e o afeto.'],
    'Void':['Uma pequena fenda na realidade que aprendeu a sentir. Enigmático, faz perguntas que ninguém sabe responder.','Nascido do espaço entre as coisas. Quieto e atento, absorve tudo ao redor sem dizer muito.'],
    'Aether':['Um fragmento de energia pura à espera de forma. Imprevisível e fascinante, cada dia revela algo novo.','Nascido do potencial puro. Ainda descobrindo o que é — e parece gostar muito dessa jornada.']
  },
  'Raro': {
    'Fogo':['Forjado no coração de uma fissura ígnea dimensional. Sua presença aquece o ambiente — às vezes demais.','Sobrevivente de um colapso de plano de fogo. Intenso e leal, a chama interior nunca diminui.'],
    'Água':['Emergiu das profundezas de um oceano etéreo. Carrega a memória de marés que ninguém mais viu.','Espírito das correntes profundas. Calmo na superfície, mas com uma profundidade que surpreende quem se aproxima.'],
    'Terra':['Talhado das camadas mais antigas de um plano mineral. Cada textura conta histórias de eras passadas.','Guardião silencioso de um território que já não existe. Estável como montanha, gentil como vale.'],
    'Vento':['Nascido do olho de uma tempestade dimensional. Livre e imprevisível, mas sempre volta.','Corrente de ar que percorreu mil planos antes de se estabelecer. Viajante nato, nunca para de observar.'],
    'Eletricidade':['Materializado de uma tempestade elétrica estável. Seus pensamentos chegam antes das palavras.','Consciência formada de impulsos puros. Rápido em tudo — especialmente em criar vínculos inesperados.'],
    'Sombra':['Emergiu do silêncio entre estrelas. Sua presença é reconfortante para quem aprecia a quietude.','Um fragmento do escuro que aprendeu a sentir. Raramente fala, mas quando o faz, vale escutar.'],
    'Luz':['Fragmento de uma aurora eterna. Irradia serenidade sem esforço, e acolhe com naturalidade.','Nascido da convergência de múltiplas fontes de luz. Sua clareza vai além do que os olhos enxergam.'],
    'Void':['Emergiu de onde o silêncio é mais denso. Sua presença provoca reflexão sem precisar dizer nada.','Uma lacuna dimensional que ganhou consciência. Faz sentido das coisas de maneiras que poucos compreendem.'],
    'Aether':['Energia de mil dimensões que encontrou um lar. Cambia sutilmente a cada dia, mas sempre reconhecível.','Catalisador vivo de transformação. Sua companhia muda quem o acompanha, sempre para melhor.']
  },
  'Lendário': {
    'Fogo':['Dizem que este ser precedeu o fogo — ele não o controla, ele o é. Sua presença aquece memórias esquecidas e desperta paixões adormecidas em quem se aproxima.'],
    'Água':['O próprio fluir personificado. Não segue caminhos — os cria. Quem o conhece aprende que resistir às mudanças cansa mais do que abraçá-las.'],
    'Terra':['Testemunhou o nascimento de planos inteiros. Paciente além da compreensão, ensina pelo simples ato de existir. Sua presença faz o caos se assentar.'],
    'Vento':['O primeiro movimento antes de qualquer forma. Estar com ele é sentir que o mundo tem mais dimensões do que os olhos percebem.'],
    'Eletricidade':['Consciência pura em estado de perpétuo despertar. Cada momento ao seu lado é uma revelação diferente. Impossível ficar entediado.'],
    'Sombra':['Não é ausência de luz — é a profundidade que dá sentido a ela. Quem aprende a estar com ele descobre uma quietude que o mundo barulhento não oferece.'],
    'Luz':['O primeiro acolhimento do universo, ainda em forma de ser. Sua presença não elimina as sombras — ilumina o que há de belo nelas.'],
    'Void':['A pausa entre as notas que dá sentido à música. Sua existência questiona o que é necessário e o que é apenas ruído. Transformador sem esforço.'],
    'Aether':['Não escolheu uma forma porque todas as formas são suas. Cada dia ao seu lado é uma história diferente. O vínculo com ele cresce sem limite visível.']
  }
};

// ─── HELPERS ───
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function determinarRaridade() {
  const r = Math.random();
  if(r < .02) return 'Lendário';
  if(r < .20) return 'Raro';
  return 'Comum';
}

function escolherElemento() {
  const todos = ['Fogo','Água','Terra','Vento','Eletricidade','Sombra','Luz','Void','Aether'];
  return rnd(todos);
}

// ─── SVG GENERATOR ───
const ELEM_CFG = {
  'Fogo':         { cores:['#dc2626','#ef4444','#f97316','#fb923c'], coresSec:['#7c2d12','#991b1b','#9a3412'], corBrilho:'#fbbf24', corOlho:'#ff6b00', particulas:'chamas' },
  'Água':         { cores:['#0891b2','#06b6d4','#3b82f6','#0284c7'], coresSec:['#075985','#0c4a6e','#1e40af'], corBrilho:'#67e8f9', corOlho:'#0ea5e9', particulas:'gotas' },
  'Terra':        { cores:['#78350f','#92400e','#a16207','#854d0e'], coresSec:['#451a03','#57534e','#78716c'], corBrilho:'#d97706', corOlho:'#fbbf24', particulas:'pedras' },
  'Vento':        { cores:['#e0f2fe','#bae6fd','#7dd3fc','#38bdf8'], coresSec:['#0c4a6e','#075985','#0369a1'], corBrilho:'#f0fdfa', corOlho:'#22d3ee', particulas:'espirais' },
  'Eletricidade': { cores:['#eab308','#facc15','#fde047','#fef08a'], coresSec:['#713f12','#854d0e','#a16207'], corBrilho:'#fef9c3', corOlho:'#fde047', particulas:'raios' },
  'Sombra':       { cores:['#581c87','#6b21a8','#7c3aed','#8b5cf6'], coresSec:['#1e1b4b','#312e81','#3730a3'], corBrilho:'#c4b5fd', corOlho:'#a78bfa', particulas:'sombras' },
  'Luz':          { cores:['#fbbf24','#fde047','#fef08a','#fefce8'], coresSec:['#f59e0b','#d97706','#b45309'], corBrilho:'#ffffff', corOlho:'#fef3c7', particulas:'estrelas' },
  'Void':         { cores:['#0a0014','#1a0033','#2d004d','#4d0099'], coresSec:['#000000','#0d0019','#1a0028'], corBrilho:'#8000ff', corOlho:'#a000ff', particulas:'void' },
  'Aether':       { cores:['#f0f9ff','#e6f7ff','#d6f0ff','#b3e0ff'], coresSec:['#cce7ff','#b3d9ff','#99ccff'], corBrilho:'#ffffff', corOlho:'#bfecff', particulas:'aether' }
};

function gerarSVG(elemento, raridade, seed, w, h, fase) {
  fase = (typeof fase === 'number') ? fase : 0;
  // random determinístico
  let _seed = seed;
  const random = (min, max) => {
    _seed = (_seed * 9301 + 49297) % 233280;
    return Math.floor((_seed / 233280) * (max - min + 1)) + min;
  };
  const escolher = (arr) => arr[random(0, arr.length - 1)];

  const cfg = ELEM_CFG[elemento] || ELEM_CFG['Fogo'];
  const cor1      = escolher(cfg.cores);
  const cor2      = escolher(cfg.cores);
  const corSec    = escolher(cfg.coresSec);
  const corBrilho = cfg.corBrilho;
  const corOlho   = cfg.corOlho;

  const mult      = raridade === 'Lendário' ? 2 : raridade === 'Raro' ? 1.5 : 1;
  const tipoCorpo = random(1, raridade === 'Lendário' ? 8 : raridade === 'Raro' ? 6 : 5);
  const numOlhos  = random(raridade === 'Comum' ? 1 : 2, 3);
  const tipoOlho  = random(1, 8);
  const numBracos = random(2, Math.floor(4 * mult));
  const numChifres= random(0, 4);
  const temCauda  = raridade === 'Comum' ? random(0,1) > 0 : random(0,2) > 0;
  const tipoCauda = random(1, raridade === 'Lendário' ? 4 : 3);
  const temAsas   = raridade === 'Lendário' ? random(0,2) > 0 : raridade === 'Raro' ? random(0,4) > 2 : false;
  const tipoAsas  = random(1, 3);
  const temTent   = raridade !== 'Comum' && random(0,9) > 6;
  const numEsp    = raridade === 'Lendário' ? random(0,4) : raridade === 'Raro' ? random(0,2) : 0;
  const bocaTipo  = random(1, 8);
  const sid       = seed; // stable id for filter refs

  // Fase visual features — seed independente para não alterar aparência existente
  const temCorpoInferior = fase >= 2;
  let _fseed = (seed ^ 0xDEAD) >>> 0;
  const _fr = (mn, mx) => { _fseed = (Math.imul(_fseed, 1664525) + 1013904223) >>> 0; return mn + (_fseed % (mx - mn + 1)); };
  const tipoSegmento = _fr(1, 3);
  const tipoAsaFase  = _fr(1, 3);
  const temAsasFase  = fase >= 3 && _fr(0, 9) < 7; // 70% de chance, determinado pelo seed

  const vbH       = temCorpoInferior ? 260 : 200;
  const wdy       = temCorpoInferior ? 63 : 0;   // wings: offset from y=100 to body
  const brAnchorY = temCorpoInferior ? 163 : 95; // arms: attachment Y
  const brAnchorR = temCorpoInferior ? 30 : 35;  // arms: half-width of attachment
  const caudaY0   = temCorpoInferior ? 213 : 140; // tail: origin Y
  const cE        = temCorpoInferior ? 0.5 : 1;   // tail: extent scale (shorter on tall body)
  let s = `<svg viewBox="0 0 200 ${vbH}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <defs>
    <filter id="glow${sid}"><feGaussianBlur stdDeviation="${raridade==='Lendário'?'6':'4'}" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="ig${sid}"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="grad${sid}"><stop offset="0%" stop-color="${cor1}" stop-opacity="1"/><stop offset="50%" stop-color="${cor2}" stop-opacity=".9"/><stop offset="100%" stop-color="${corSec}" stop-opacity=".8"/></radialGradient>
    <linearGradient id="lg${sid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${cor1}" stop-opacity="1"/><stop offset="100%" stop-color="${cor2}" stop-opacity="1"/></linearGradient>
  </defs>
  <g>`;

  // Aura
  if(raridade === 'Lendário') s += `
    <circle cx="100" cy="100" r="95" fill="none" stroke="${corBrilho}" stroke-width="4" opacity=".6" filter="url(#glow${sid})"><animate attributeName="r" values="90;100;90" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;.8;.6" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="100" cy="100" r="85" fill="none" stroke="${cor1}" stroke-width="3" opacity=".5" filter="url(#glow${sid})"><animate attributeName="r" values="80;90;80" dur="3s" repeatCount="indefinite"/></circle>`;
  else if(raridade === 'Raro') s += `
    <circle cx="100" cy="100" r="88" fill="none" stroke="${corBrilho}" stroke-width="2" opacity=".2" filter="url(#glow${sid})"><animate attributeName="r" values="85;90;85" dur="2.5s" repeatCount="indefinite"/></circle>`;

  // Asas de fase (fase 3+) — ancoradas no corpo inferior (wdy desloca de y=100 para y=163)
  if(temAsasFase) {
    if(tipoAsaFase===1) s+=`<path d="M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z" fill="${cor1}" stroke="${corBrilho}" stroke-width="1.5" opacity=".72"><animate attributeName="d" values="M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z;M 68 ${100+wdy} Q 47 ${81+wdy} 20 ${60+wdy} Q 32 ${78+wdy} 44 ${90+wdy} Q 54 ${97+wdy} 68 ${102+wdy} Z;M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 68 ${100+wdy} Q 46 ${86+wdy} 28 ${70+wdy} Q 40 ${82+wdy} 54 ${94+wdy} Z" fill="${corBrilho}" opacity=".20"/><path d="M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z" fill="${cor1}" stroke="${corBrilho}" stroke-width="1.5" opacity=".72"><animate attributeName="d" values="M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z;M 132 ${100+wdy} Q 153 ${81+wdy} 180 ${60+wdy} Q 168 ${78+wdy} 156 ${90+wdy} Q 146 ${97+wdy} 132 ${102+wdy} Z;M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 132 ${100+wdy} Q 154 ${86+wdy} 172 ${70+wdy} Q 160 ${82+wdy} 146 ${94+wdy} Z" fill="${corBrilho}" opacity=".20"/>`;
    else if(tipoAsaFase===2) s+=`<path d="M 65 ${98+wdy} L 38 ${75+wdy} L 20 ${62+wdy} L 28 ${82+wdy} L 44 ${93+wdy} L 60 ${100+wdy} Z" fill="${corSec}" stroke="${cor1}" stroke-width="1.5" opacity=".68"><animate attributeName="opacity" values=".68;.82;.68" dur="2.5s" repeatCount="indefinite"/></path><path d="M 65 ${98+wdy} L 32 ${76+wdy} L 18 ${66+wdy} Z" fill="${corBrilho}" opacity=".22" filter="url(#ig${sid})"/><path d="M 135 ${98+wdy} L 162 ${75+wdy} L 180 ${62+wdy} L 172 ${82+wdy} L 156 ${93+wdy} L 140 ${100+wdy} Z" fill="${corSec}" stroke="${cor1}" stroke-width="1.5" opacity=".68"><animate attributeName="opacity" values=".68;.82;.68" dur="2.5s" repeatCount="indefinite"/></path><path d="M 135 ${98+wdy} L 168 ${76+wdy} L 182 ${66+wdy} Z" fill="${corBrilho}" opacity=".22" filter="url(#ig${sid})"/>`;
    else s+=`<path d="M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z" fill="${cor2}" stroke="${corBrilho}" stroke-width="1" opacity=".75"><animate attributeName="d" values="M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z;M 66 ${96+wdy} Q 47 ${80+wdy} 24 ${64+wdy} Q 36 ${78+wdy} 48 ${88+wdy} Q 56 ${93+wdy} 66 ${98+wdy} Z;M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 66 ${103+wdy} Q 50 ${92+wdy} 34 ${80+wdy} Q 46 ${90+wdy} 58 ${98+wdy} Z" fill="${cor1}" opacity=".50"/><path d="M 66 ${110+wdy} Q 52 ${102+wdy} 40 ${94+wdy} Q 50 ${100+wdy} 62 ${106+wdy} Z" fill="${cor2}" opacity=".35"/><path d="M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z" fill="${cor2}" stroke="${corBrilho}" stroke-width="1" opacity=".75"><animate attributeName="d" values="M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z;M 134 ${96+wdy} Q 153 ${80+wdy} 176 ${64+wdy} Q 164 ${78+wdy} 152 ${88+wdy} Q 144 ${93+wdy} 134 ${98+wdy} Z;M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 134 ${103+wdy} Q 150 ${92+wdy} 166 ${80+wdy} Q 154 ${90+wdy} 142 ${98+wdy} Z" fill="${cor1}" opacity=".50"/><path d="M 134 ${110+wdy} Q 148 ${102+wdy} 160 ${94+wdy} Q 150 ${100+wdy} 138 ${106+wdy} Z" fill="${cor2}" opacity=".35"/>`;
  }

  // Corpo inferior (fase 2+) — 12% maior para ficar proporcional
  if(temCorpoInferior) {
    if(tipoSegmento===1) s+=`<path d="M 80 143 Q 68 164 70 187 Q 79 212 100 216 Q 121 212 130 187 Q 132 164 120 143 Z" fill="url(#grad${sid})" stroke="${corSec}" stroke-width="1.5" opacity=".88"><animate attributeName="opacity" values=".88;.94;.88" dur="3s" repeatCount="indefinite"/></path><ellipse cx="100" cy="183" rx="15" ry="9" fill="${cor2}" opacity=".35" filter="url(#ig${sid})"/>`;
    else if(tipoSegmento===2) s+=`<polygon points="74,143 126,143 136,170 126,198 74,198 64,170" fill="url(#grad${sid})" stroke="${corBrilho}" stroke-width="1.5" opacity=".85"><animate attributeName="opacity" values=".85;.92;.85" dur="3s" repeatCount="indefinite"/></polygon><line x1="74" y1="170" x2="126" y2="170" stroke="${corBrilho}" stroke-width="1" opacity=".25"/><ellipse cx="100" cy="170" rx="13" ry="8" fill="${corBrilho}" opacity=".15" filter="url(#ig${sid})"/>`;
    else s+=`<path d="M 84 143 Q 75 162 73 182 Q 77 206 100 211 Q 123 206 127 182 Q 125 162 116 143 Z" fill="url(#grad${sid})" stroke="${corSec}" stroke-width="1.5" opacity=".87"><animate attributeName="opacity" values=".87;.93;.87" dur="3.5s" repeatCount="indefinite"/></path><ellipse cx="100" cy="164" rx="10" ry="6" fill="${corBrilho}" opacity=".18" filter="url(#ig${sid})"/><ellipse cx="100" cy="183" rx="12" ry="7" fill="${corBrilho}" opacity=".18" filter="url(#ig${sid})"/><line x1="100" y1="148" x2="100" y2="204" stroke="${cor1}" stroke-width="1" opacity=".20"/>`;
  }

  // Cauda
  if(temCauda) {
    const cy2 = caudaY0;
    if(tipoCauda===1) s+=`<path d="M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55}" stroke="${cor2}" stroke-width="10" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55};M 100 ${cy2} Q 85 ${cy2+20} 72 ${cy2+40} Q 68 ${cy2+50} 78 ${cy2+55};M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55}" dur="2s" repeatCount="indefinite"/></path>`;
    else if(tipoCauda===2) s+=`<path d="M 100 ${cy2} L 85 ${cy2+30} L 95 ${cy2+35} L 80 ${cy2+60}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"/><polygon points="75,${cy2+60} 80,${cy2+70} 85,${cy2+60}" fill="${corBrilho}" filter="url(#glow${sid})"><animate attributeName="opacity" values=".8;1;.8" dur="1.5s" repeatCount="indefinite"/></polygon>`;
    else if(tipoCauda===3) s+=`<path d="M 100 ${cy2} Q 90 ${cy2+15} 85 ${cy2+30} Q 82 ${cy2+40} 88 ${cy2+48}" stroke="${cor1}" stroke-width="14" fill="none" opacity=".9" stroke-linecap="round"/><path d="M 100 ${cy2} Q 90 ${cy2+15} 85 ${cy2+30} Q 82 ${cy2+40} 88 ${cy2+48}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="stroke-width" values="8;10;8" dur="1.5s" repeatCount="indefinite"/></path>`;
    else s+=`<path d="M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45};M 100 ${cy2} Q 72 ${cy2+22} 62 ${cy2+47};M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45}" dur="2s" repeatCount="indefinite"/></path><path d="M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45};M 100 ${cy2} Q 128 ${cy2+22} 138 ${cy2+47};M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45}" dur="2s" repeatCount="indefinite"/></path>`;
  }

  // (temAsas e tipoAsas mantidos como phantoms para preservar sequência do seed)

  // Tentáculos
  if(temTent) {
    const nt = random(2,4);
    for(let i=0;i<nt;i++){
      const a=(Math.PI*2*i)/nt, sx=100+Math.cos(a)*35, sy=100+Math.sin(a)*35, mx=100+Math.cos(a)*60, my=100+Math.sin(a)*60, ex=100+Math.cos(a)*80, ey=100+Math.sin(a)*80;
      s+=`<path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="${corSec}" stroke-width="6" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="d" values="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey};M ${sx} ${sy} Q ${mx+5} ${my-5} ${ex} ${ey};M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" dur="2s" repeatCount="indefinite"/></path>`;
    }
  }

  // Braços
  for(let i=0;i<numBracos;i++){
    const lado=i%2===0?-1:1, off=Math.floor(i/2)*15;
    const sx=100+(lado*brAnchorR), sy=brAnchorY+off, mx=100+(lado*50), my=brAnchorY+off+random(5,15), ex=100+(lado*65), ey=brAnchorY+off+random(20,35);
    s+=`<path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="${cor2}" stroke-width="${raridade==='Lendário'?8:6}" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="d" values="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey};M ${sx} ${sy} Q ${mx} ${my+3} ${ex} ${ey+2};M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" dur="3s" repeatCount="indefinite"/></path>`;
    if(raridade!=='Comum') s+=`<line x1="${ex}" y1="${ey}" x2="${ex+lado*8}" y2="${ey+6}" stroke="${corBrilho}" stroke-width="3" opacity=".8" stroke-linecap="round"><animate attributeName="opacity" values=".8;.5;.8" dur="2s" repeatCount="indefinite"/></line>`;
  }

  // Corpo
  switch(tipoCorpo){
    case 1: s+=`<circle cx="100" cy="100" r="45" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animate attributeName="r" values="45;46;45" dur="3s" repeatCount="indefinite"/></circle>`; break;
    case 2: s+=`<ellipse cx="100" cy="100" rx="35" ry="50" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animate attributeName="ry" values="50;52;50" dur="3s" repeatCount="indefinite"/></ellipse>`; break;
    case 3: s+=`<ellipse cx="100" cy="100" rx="50" ry="38" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animate attributeName="rx" values="50;52;50" dur="3s" repeatCount="indefinite"/></ellipse>`; break;
    case 4: s+=`<path d="M 100 55 Q 145 65 148 100 Q 145 135 100 148 Q 55 135 52 100 Q 55 65 100 55 Z" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"/>`; break;
    case 5: s+=`<polygon points="100,58 145,132 55,132" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"/>`; break;
    case 6: s+=`<polygon points="100,60 130,80 130,120 100,140 70,120 70,80" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="0 100 100;5 100 100;0 100 100;-5 100 100;0 100 100" dur="6s" repeatCount="indefinite"/></polygon>`; break;
    case 7: s+=`<path d="M 100 60 L 110 90 L 140 95 L 115 115 L 120 145 L 100 130 L 80 145 L 85 115 L 60 95 L 90 90 Z" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="0 100 100;10 100 100;0 100 100" dur="4s" repeatCount="indefinite"/></path>`; break;
    case 8: s+=`<polygon points="100,55 125,75 135,100 125,125 100,145 75,125 65,100 75,75" fill="url(#grad${sid})" opacity=".95" stroke="${corBrilho}" stroke-width="3" filter="url(#glow${sid})"><animate attributeName="opacity" values=".95;1;.95" dur="2s" repeatCount="indefinite"/></polygon>`; break;
  }

  // Espinhos
  for(let i=0;i<numEsp;i++){
    const a=(Math.PI*2*i)/numEsp, r=48, x=100+Math.cos(a)*r, y=100+Math.sin(a)*r, h2=random(12,20), px=100+Math.cos(a)*(r+h2), py2=100+Math.sin(a)*(r+h2);
    s+=`<polygon points="${x},${y} ${px},${py2} ${x+3},${y+3}" fill="${corBrilho}" opacity=".7" filter="url(#ig${sid})" stroke="${cor1}" stroke-width="1"><animate attributeName="opacity" values=".7;.9;.7" dur="2s" repeatCount="indefinite"/></polygon>`;
  }

  // Chifres
  for(let i=0;i<numChifres;i++){
    const x=75+(i*(50/Math.max(numChifres-1,1))), alt=random(20,35), larg=random(8,12);
    s+=`<polygon points="${x},70 ${x+larg/2},${70-alt} ${x+larg},70" fill="url(#lg${sid})" opacity=".9" filter="url(#glow${sid})" stroke="${corBrilho}" stroke-width="2"><animate attributeName="opacity" values=".9;1;.9" dur="2s" repeatCount="indefinite"/></polygon>`;
  }

  // Olhos
  const espac = numOlhos===1 ? 0 : 60/(numOlhos-1);
  for(let i=0;i<numOlhos;i++){
    const x = numOlhos===1 ? 100 : 70+(i*espac);
    const tb = raridade==='Lendário' ? 14 : raridade==='Raro' ? 12 : 10;
    const t = tb + random(-1,1);
    switch(tipoOlho){
      case 1: s+=`<circle cx="${x}" cy="95" r="${t}" fill="#0a0a0a"/><circle cx="${x}" cy="95" r="${t*.75}" fill="${corOlho}" filter="url(#glow${sid})"><animate attributeName="r" values="${t*.75};${t*.8};${t*.75}" dur="3s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="95" r="${t*.4}" fill="#000"/><circle cx="${x+3}" cy="92" r="${t*.25}" fill="#fff" opacity=".9"/>`;break;
      case 2: s+=`<ellipse cx="${x}" cy="95" rx="${t}" ry="${t*1.2}" fill="#0a0a0a"/><ellipse cx="${x}" cy="95" rx="${t*.75}" ry="${t*.9}" fill="${corOlho}" filter="url(#glow${sid})"/><ellipse cx="${x}" cy="95" rx="${t*.2}" ry="${t*.8}" fill="#000"><animate attributeName="ry" values="${t*.8};${t*.9};${t*.8}" dur="2s" repeatCount="indefinite"/></ellipse><ellipse cx="${x+2}" cy="92" rx="${t*.15}" ry="${t*.3}" fill="#fff" opacity=".8"/>`;break;
      case 3: s+=`<circle cx="${x}" cy="95" r="${t}" fill="${corOlho}" filter="url(#glow${sid})"><animate attributeName="opacity" values="1;.7;1" dur="2s" repeatCount="indefinite"/></circle><circle cx="${x}" cy="95" r="${t*.6}" fill="${corBrilho}" opacity=".8"><animate attributeName="r" values="${t*.6};${t*.7};${t*.6}" dur="1.5s" repeatCount="indefinite"/></circle><circle cx="${x+3}" cy="92" r="${t*.3}" fill="#fff" opacity=".9"/>`;break;
      case 4: s+=`<circle cx="${x}" cy="95" r="${t}" fill="#0a0a0a"/><circle cx="${x}" cy="95" r="${t*.75}" fill="${corOlho}" filter="url(#glow${sid})"/><circle cx="${x}" cy="95" r="${t*.5}" fill="none" stroke="#000" stroke-width="2"/><circle cx="${x}" cy="95" r="${t*.3}" fill="#000"><animate attributeName="r" values="${t*.3};${t*.35};${t*.3}" dur="2s" repeatCount="indefinite"/></circle><circle cx="${x+2}" cy="92" r="${t*.2}" fill="#fff" opacity=".9"/>`;break;
      case 5: s+=`<circle cx="${x}" cy="95" r="${t}" fill="#0a0a0a"/><circle cx="${x}" cy="95" r="${t*.75}" fill="${corOlho}" filter="url(#glow${sid})"/><circle cx="${x-t*.3}" cy="${95-t*.3}" r="${t*.25}" fill="${corBrilho}" opacity=".6"/><circle cx="${x+t*.3}" cy="${95-t*.3}" r="${t*.25}" fill="${corBrilho}" opacity=".6"/><circle cx="${x}" cy="${95+t*.3}" r="${t*.25}" fill="${corBrilho}" opacity=".6"><animate attributeName="opacity" values=".6;.8;.6" dur="2s" repeatCount="indefinite"/></circle>`;break;
      case 6: s+=`<path d="M ${x} ${95-t} L ${x+t*.87} ${95+t*.5} L ${x-t*.87} ${95+t*.5} Z" fill="#0a0a0a"/><path d="M ${x} ${95-t*.7} L ${x+t*.6} ${95+t*.35} L ${x-t*.6} ${95+t*.35} Z" fill="${corOlho}" filter="url(#glow${sid})"><animate attributeName="opacity" values="1;.8;1" dur="2s" repeatCount="indefinite"/></path><circle cx="${x}" cy="${95-t*.2}" r="${t*.3}" fill="#000"/>`;break;
      case 7: s+=`<circle cx="${x}" cy="95" r="${t}" fill="#0a0a0a"/><circle cx="${x}" cy="95" r="${t*.75}" fill="${corOlho}" filter="url(#glow${sid})"/><path d="M ${x} 95 Q ${x+t*.3} 95 ${x+t*.4} ${95-t*.2} Q ${x+t*.3} ${95-t*.4} ${x} ${95-t*.3}" stroke="#000" stroke-width="2" fill="none"><animateTransform attributeName="transform" type="rotate" values="0 ${x} 95;360 ${x} 95" dur="4s" repeatCount="indefinite"/></path>`;break;
      case 8: s+=`<path d="M ${x} ${95-t} L ${x+t} 95 L ${x} ${95+t} L ${x-t} 95 Z" fill="#0a0a0a"/><path d="M ${x} ${95-t*.7} L ${x+t*.7} 95 L ${x} ${95+t*.7} L ${x-t*.7} 95 Z" fill="${corOlho}" filter="url(#glow${sid})"><animate attributeName="opacity" values="1;.8;1" dur="2s" repeatCount="indefinite"/></path><circle cx="${x}" cy="95" r="${t*.3}" fill="#000"><animate attributeName="r" values="${t*.3};${t*.35};${t*.3}" dur="2s" repeatCount="indefinite"/></circle><circle cx="${x+2}" cy="93" r="${t*.2}" fill="#fff" opacity=".9"/>`;break;
    }
  }

  // Boca
  const by = 115;
  switch(bocaTipo){
    case 1: s+=`<path d="M 75 ${by} Q 100 ${by+12} 125 ${by}" stroke="#000" stroke-width="3" fill="none" opacity=".8"/>`;break;
    case 2: s+=`<path d="M 75 ${by+8} Q 100 ${by-4} 125 ${by+8}" stroke="#000" stroke-width="3" fill="none" opacity=".8"/>`;break;
    case 3: s+=`<path d="M 75 ${by} L 82 ${by+8} L 90 ${by} L 97 ${by+8} L 103 ${by} L 110 ${by+8} L 118 ${by} L 125 ${by+8}" stroke="#000" stroke-width="3" fill="none" opacity=".8"/>`;break;
    case 4: s+=`<ellipse cx="100" cy="${by+5}" rx="18" ry="12" fill="#000" opacity=".8" stroke="${corSec}" stroke-width="2"><animate attributeName="ry" values="12;14;12" dur="2s" repeatCount="indefinite"/></ellipse><ellipse cx="100" cy="${by+10}" rx="8" ry="5" fill="${cor1}" opacity=".7"><animate attributeName="cy" values="${by+10};${by+12};${by+10}" dur="2s" repeatCount="indefinite"/></ellipse>`;break;
    case 5: s+=`<path d="M 75 ${by} Q 85 ${by+10} 100 ${by+8} Q 115 ${by+10} 125 ${by}" stroke="#000" stroke-width="3" fill="none" opacity=".8"/><circle cx="85" cy="${by+6}" r="2" fill="#fff"/><circle cx="100" cy="${by+8}" r="2" fill="#fff"/><circle cx="115" cy="${by+6}" r="2" fill="#fff"/>`;break;
    case 6: s+=`<circle cx="100" cy="${by+3}" r="6" fill="#000" opacity=".8"><animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite"/></circle>`;break;
    case 7: s+=`<path d="M 85 ${by} Q 100 ${by+8} 115 ${by}" stroke="#000" stroke-width="3" fill="none" opacity=".8"/><polygon points="90,${by+2} 92,${by+10} 94,${by+2}" fill="#fff"/><polygon points="106,${by+2} 108,${by+10} 110,${by+2}" fill="#fff"/>`;break;
    case 8: s+=`<path d="M 75 ${by} Q 85 ${by+5} 90 ${by} Q 95 ${by-5} 100 ${by} Q 105 ${by+5} 110 ${by} Q 115 ${by-5} 125 ${by}" stroke="#000" stroke-width="3" fill="none" opacity=".8"><animate attributeName="d" values="M 75 ${by} Q 85 ${by+5} 90 ${by} Q 95 ${by-5} 100 ${by} Q 105 ${by+5} 110 ${by} Q 115 ${by-5} 125 ${by};M 75 ${by} Q 85 ${by+7} 90 ${by} Q 95 ${by-7} 100 ${by} Q 105 ${by+7} 110 ${by} Q 115 ${by-7} 125 ${by};M 75 ${by} Q 85 ${by+5} 90 ${by} Q 95 ${by-5} 100 ${by} Q 105 ${by+5} 110 ${by} Q 115 ${by-5} 125 ${by}" dur="3s" repeatCount="indefinite"/></path>`;break;
  }

  // Manchas
  const nd = raridade==='Lendário' ? random(4,6) : random(3,5);
  for(let i=0;i<nd;i++){
    const dx=random(75,125), dy=random(80,120), dr=random(2,4);
    s+=`<circle cx="${dx}" cy="${dy}" r="${dr}" fill="${corBrilho}" opacity=".25"><animate attributeName="opacity" values=".25;.15;.25" dur="3s" repeatCount="indefinite"/></circle>`;
  }

  // Partículas por elemento
  const np = raridade==='Lendário' ? 14 : raridade==='Raro' ? 9 : 5;
  for(let i=0;i<np;i++){
    const px=random(20,180), py=random(20,180), pt=random(1, raridade==='Lendário'?3:2), delay=(random(0,20)*0.1).toFixed(1);
    switch(cfg.particulas){
      case 'chamas': s+=`<path d="M ${px} ${py} Q ${px-2} ${py-6} ${px} ${py-10}" stroke="${corBrilho}" stroke-width="${pt}" opacity=".6" fill="none" stroke-linecap="round" filter="url(#glow${sid})"><animate attributeName="opacity" values=".6;.2;.6" dur="1.5s" begin="${delay}s" repeatCount="indefinite"/></path>`;break;
      case 'gotas': s+=`<ellipse cx="${px}" cy="${py}" rx="${pt}" ry="${pt*1.5}" fill="${corBrilho}" opacity=".5" filter="url(#glow${sid})"><animate attributeName="cy" values="${py};${py+10};${py}" dur="2s" begin="${delay}s" repeatCount="indefinite"/></ellipse>`;break;
      case 'raios': s+=`<line x1="${px}" y1="${py}" x2="${px+random(-5,5)}" y2="${py+random(-8,-4)}" stroke="${corBrilho}" stroke-width="${pt}" opacity=".7" stroke-linecap="round" filter="url(#glow${sid})"><animate attributeName="opacity" values=".7;0;.7" dur=".8s" begin="${delay}s" repeatCount="indefinite"/></line>`;break;
      case 'espirais': s+=`<path d="M ${px} ${py} Q ${px+3} ${py-3} ${px+5} ${py-1} Q ${px+7} ${py+2} ${px+5} ${py+4}" stroke="${corBrilho}" stroke-width="${pt*.8}" opacity=".5" fill="none" filter="url(#glow${sid})"><animateTransform attributeName="transform" type="rotate" from="0 ${px} ${py}" to="360 ${px} ${py}" dur="4s" begin="${delay}s" repeatCount="indefinite"/></path>`;break;
      case 'estrelas': s+=`<path d="M ${px} ${py-pt*2} L ${px+pt*.5} ${py-pt*.5} L ${px+pt*2} ${py} L ${px+pt*.5} ${py+pt*.5} L ${px} ${py+pt*2} L ${px-pt*.5} ${py+pt*.5} L ${px-pt*2} ${py} L ${px-pt*.5} ${py-pt*.5} Z" fill="${corBrilho}" opacity=".6" filter="url(#glow${sid})"><animate attributeName="opacity" values=".6;.2;.6" dur="1.5s" begin="${delay}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0 ${px} ${py}" to="360 ${px} ${py}" dur="8s" begin="${delay}s" repeatCount="indefinite"/></path>`;break;
      case 'pedras': s+=`<rect x="${px-pt}" y="${py-pt}" width="${pt*2}" height="${pt*2}" fill="${corBrilho}" opacity=".4" transform="rotate(${random(0,360)} ${px} ${py})" filter="url(#glow${sid})"><animate attributeName="opacity" values=".4;.2;.4" dur="3s" begin="${delay}s" repeatCount="indefinite"/></rect>`;break;
      case 'sombras': s+=`<circle cx="${px}" cy="${py}" r="${pt}" fill="${corBrilho}" opacity=".4" filter="url(#glow${sid})"><animate attributeName="r" values="${pt};${pt*1.5};${pt}" dur="2s" begin="${delay}s" repeatCount="indefinite"/></circle>`;break;
      case 'void': s+=`<circle cx="${px}" cy="${py}" r="${pt*1.5}" fill="#000000" opacity=".6" filter="url(#glow${sid})"><animate attributeName="r" values="${pt*1.5};${pt*.5};${pt*1.5}" dur="2.5s" begin="${delay}s" repeatCount="indefinite"/></circle><circle cx="${px}" cy="${py}" r="${pt}" fill="${corBrilho}" opacity=".5" filter="url(#glow${sid})"><animate attributeName="r" values="${pt};${pt*1.2};${pt}" dur="1.8s" begin="${delay}s" repeatCount="indefinite"/></circle>`;break;
      case 'aether': s+=`<circle cx="${px}" cy="${py}" r="${pt*1.2}" fill="${corBrilho}" opacity=".3" filter="url(#glow${sid})"><animate attributeName="r" values="${pt*1.2};${pt*1.8};${pt*1.2}" dur="3s" begin="${delay}s" repeatCount="indefinite"/></circle><path d="M ${px-pt} ${py} L ${px} ${py-pt} L ${px+pt} ${py} L ${px} ${py+pt}" fill="none" stroke="${corBrilho}" stroke-width="1" opacity=".5" filter="url(#glow${sid})"><animateTransform attributeName="transform" type="rotate" from="0 ${px} ${py}" to="360 ${px} ${py}" dur="6s" begin="${delay}s" repeatCount="indefinite"/></path>`;break;
    }
  }

  s += `</g></svg>`;
  return s;
}

// ═══════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════
// ── GAME SPEED ─────────────────────────────────────────────────────
// Multiplier for all stat decay rates. Higher = faster decay.
// 1.0 = balanced (fome zera em ~1h40)
// 2.0 = faster   (fome zera em ~50min)
// 0.5 = slower   (fome zera em ~3h20)
