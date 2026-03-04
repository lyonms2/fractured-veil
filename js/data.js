// ═══════════════════════════════════════════
// SISTEMAS DO JOGO
// ═══════════════════════════════════════════

const CARACTERISTICAS_ELEMENTAIS = {
  'Fogo':         { bonus:'Chamas Intensas: +15% chance de acerto crítico', cor:'#FF4500', emoji:'🔥', decor:['🌋','🌶️'] },
  'Água':         {      bonus:'Cura das Marés: Regenera 3% de vida por turno',   cor:'#1E90FF', emoji:'💧', decor:['🌊','🐚'] },
  'Terra':        { bonus:'Pele de Rocha: Reduz 20% do dano recebido',        cor:'#8B4513', emoji:'🌿', decor:['🌿','🍄'] },
  'Vento':        {  bonus:'Velocidade do Vento: +25% de esquiva',             cor:'#87CEEB', emoji:'🌪️', decor:['🍃','🌸'] },
  'Eletricidade': {  bonus:'Sobrecarga: 20% de chance de paralisar',           cor:'#FFD700', emoji:'⚡', decor:['⚡','🔮'] },
  'Sombra':       {        bonus:'Abraço das Trevas: Rouba 15% do dano como vida',   cor:'#8B008B', emoji:'🌑', decor:['💀','🦇'] },
  'Luz':          {      bonus:'Benção da Luz: +10% stats de aliados próximos',   cor:'#FFD700', emoji:'✨', decor:['⭐','🌟'] },
  'Void':         {        bonus:'Distorção: 50% de chance de ignorar dano recebido',cor:'#9b30e8', emoji:'🕳️', decor:['🔮','💫'] },
  'Aether':       {      bonus:'Campo Primordial: Ignora 50% das defesas inimigas',cor:'#e830c0', emoji:'🌌', decor:['🌌','💫'] }
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
  'Comum':    ['o Inabalável','o Feroz','o Guardião','o Sentinela','o Defensor','o Caçador','o Protetor','o Escudo'],
  'Raro':     ['o Ancião','o Sábio','o Aniquilador','o Destruidor','o Enigma','o Oculto','o Misterioso','o Sussurro'],
  'Lendário': ['o Majestoso','o Primordial','o Lendário','o Ascendente','o Transcendente','o Eterno','o Sempiterno','o Imorredouro']
};
const DESCRICOES = {
  'Comum': {
    'Fogo':['Uma centelha que escapou de um incêndio dimensional. Jovem, impulsivo, mas com potencial ardente.','Nascido das brasas de uma batalha esquecida. Ainda não conhece a extensão de suas chamas.'],
    'Água':['Uma gota que se desprendeu do oceano infinito. Pequena, mas parte de algo maior.','Um espírito aquático jovem, ainda aprendendo a controlar as marés dentro de si.'],
    'Terra':['Um pedaço de rocha que ganhou consciência. Resistente, mas ainda não inabalável.','Formado de argila primordial. Cada batalha o solidifica mais.'],
    'Vento':['Uma brisa que ganhou forma. Rápida e livre, mas ainda não uma tempestade.','Nascido de correntes de ar dimensionais. Sua velocidade ainda está crescendo.'],
    'Eletricidade':['Uma faísca de consciência elétrica. Rápido de pensar, mas ainda inexperiente.','Nascido de um relâmpago perdido. Sua voltagem ainda está aumentando.'],
    'Sombra':['Uma sombra que se separou de seu dono. Fraca ainda, mas crescendo em escuridão.','Nascido da penumbra entre mundos. Ainda não mergulhou completamente no vazio.'],
    'Luz':['Um raio de luz que atravessou dimensões. Brilhante, mas ainda não ofuscante.','Nascido do amanhecer de outro mundo. Sua luminosidade ainda está crescendo.'],
    'Void':['Uma pequena fenda na realidade. Sua mera existência questiona o que é "ser".','Nascido do espaço entre as coisas. Ainda não aprendeu a anular completamente.'],
    'Aether':['Um fragmento de energia pura ainda não-manifestada. Pode se tornar qualquer coisa.','Nascido do potencial infinito. Ainda descobrindo quais formas pode assumir.']
  },
  'Raro': {
    'Fogo':['Forjado no coração de um vulcão dimensional. Suas chamas já consumiram mundos menores.','Um veterano das guerras ígneas. Cada cicatriz é uma história de destruição.'],
    'Água':['Surgiu das profundezas do Abismo Oceânico. Testemunhou éons sob pressão impossível.','Um tsunami personificado. Sua fúria pode afogar continentes.'],
    'Terra':['Talhado das montanhas mais antigas da existência. Cada camada conta bilhões de anos.','Um titã que viu planetas nascerem e morrerem. Sua resistência é lendária.'],
    'Vento':['Nascido do olho de um furacão dimensional. Seu sussurro é um vendaval.','Uma tempestade que ganhou consciência própria. Impossível de prever ou conter.'],
    'Eletricidade':['Materializado de uma tempestade elétrica perpétua. Seus pensamentos são relâmpagos.','Um trovão que aprendeu a pensar. Sua voltagem pode desintegrar matéria.'],
    'Sombra':['Emergiu do vazio entre estrelas. Sua escuridão é mais antiga que a luz.','Um pedaço do nada que ganhou forma. Sua presença drena vida.'],
    'Luz':['Fragmento da primeira luz do universo. Sua radiância purifica e destrói.','Nascido da explosão de uma supernova. Luz tão intensa que cega a própria escuridão.'],
    'Void':['Emergiu de onde nem o vazio ousa existir. Sua presença anula leis fundamentais da realidade.','Uma ruptura dimensional estabilizada. Remove não apenas matéria, mas conceitos.'],
    'Aether':['Energia quintessencial de mil dimensões fundidas. Impossível prever sua próxima forma.','Um catalisador vivo de transformação. Adapta-se instantaneamente a qualquer situação.']
  },
  'Lendário': {
    'Fogo':['Dizem que este ser existia antes do próprio fogo. Ele não controla as chamas — ele É a chama primordial. Mundos arderam em seu despertar.'],
    'Água':['O oceano personificado. Não é apenas feito de água — é a própria essência da água através de todas as dimensões.'],
    'Terra':['Este titã carregou mundos em seus ombros. Quando se move, planetas tremem em dimensões distantes.'],
    'Vento':['O primeiro sopro de vida do universo, antes de planetas ou estrelas. Deu movimento ao cosmos estático.'],
    'Eletricidade':['O pensamento puro do primeiro ser consciente, cristalizado em eletricidade. Pensar perto dele é perigoso.'],
    'Sombra':['Não é a sombra de algo — é a Sombra primordial, anterior à existência de luz. Onde passa, conceitos morrem.'],
    'Luz':['O primeiro raio de luz na escuridão primordial. Sua luminosidade definiu o que é "visão" no universo.'],
    'Void':['A própria ausência personificada. Não existe, mas sua não-existência é mais real que tudo ao redor.'],
    'Aether':['A essência não-manifesta que permeia toda criação. Não escolhe uma forma porque É todas as formas possíveis ao mesmo tempo.']
  }
};

// ─── HELPERS ───
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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

function gerarSVG(elemento, raridade, seed, w, h) {
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

  let s = `<svg viewBox="0 0 200 200" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
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

  // Cauda
  if(temCauda) {
    const cy2 = 140;
    if(tipoCauda===1) s+=`<path d="M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55}" stroke="${cor2}" stroke-width="10" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55};M 100 ${cy2} Q 85 ${cy2+20} 72 ${cy2+40} Q 68 ${cy2+50} 78 ${cy2+55};M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55}" dur="2s" repeatCount="indefinite"/></path>`;
    else if(tipoCauda===2) s+=`<path d="M 100 ${cy2} L 85 ${cy2+30} L 95 ${cy2+35} L 80 ${cy2+60}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"/><polygon points="75,${cy2+60} 80,${cy2+70} 85,${cy2+60}" fill="${corBrilho}" filter="url(#glow${sid})"><animate attributeName="opacity" values=".8;1;.8" dur="1.5s" repeatCount="indefinite"/></polygon>`;
    else if(tipoCauda===3) s+=`<path d="M 100 ${cy2} Q 90 ${cy2+15} 85 ${cy2+30} Q 82 ${cy2+40} 88 ${cy2+48}" stroke="${cor1}" stroke-width="14" fill="none" opacity=".9" stroke-linecap="round"/><path d="M 100 ${cy2} Q 90 ${cy2+15} 85 ${cy2+30} Q 82 ${cy2+40} 88 ${cy2+48}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="stroke-width" values="8;10;8" dur="1.5s" repeatCount="indefinite"/></path>`;
    else s+=`<path d="M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45};M 100 ${cy2} Q 72 ${cy2+22} 62 ${cy2+47};M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45}" dur="2s" repeatCount="indefinite"/></path><path d="M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45};M 100 ${cy2} Q 128 ${cy2+22} 138 ${cy2+47};M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45}" dur="2s" repeatCount="indefinite"/></path>`;
  }

  // Asas
  if(temAsas) {
    if(tipoAsas===1) s+=`<ellipse cx="60" cy="90" rx="28" ry="40" fill="url(#lg${sid})" opacity=".6" transform="rotate(-25 60 90)" stroke="${corBrilho}" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="-25 60 90;-30 60 90;-25 60 90" dur="2s" repeatCount="indefinite"/></ellipse><ellipse cx="140" cy="90" rx="28" ry="40" fill="url(#lg${sid})" opacity=".6" transform="rotate(25 140 90)" stroke="${corBrilho}" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="25 140 90;30 140 90;25 140 90" dur="2s" repeatCount="indefinite"/></ellipse>`;
    else if(tipoAsas===2) s+=`<path d="M 70 95 Q 45 85 40 65 Q 50 70 70 80 Z" fill="${cor1}" opacity=".7" stroke="${cor2}" stroke-width="2"><animate attributeName="d" values="M 70 95 Q 45 85 40 65 Q 50 70 70 80 Z;M 70 95 Q 42 83 38 62 Q 48 68 70 78 Z;M 70 95 Q 45 85 40 65 Q 50 70 70 80 Z" dur="2s" repeatCount="indefinite"/></path><path d="M 130 95 Q 155 85 160 65 Q 150 70 130 80 Z" fill="${cor1}" opacity=".7" stroke="${cor2}" stroke-width="2"><animate attributeName="d" values="M 130 95 Q 155 85 160 65 Q 150 70 130 80 Z;M 130 95 Q 158 83 162 62 Q 152 68 130 78 Z;M 130 95 Q 155 85 160 65 Q 150 70 130 80 Z" dur="2s" repeatCount="indefinite"/></path>`;
    else s+=`<path d="M 70 90 Q 45 70 35 60 L 40 75 L 50 70 L 55 85 Z" fill="${corSec}" opacity=".8" stroke="${cor1}" stroke-width="2"><animate attributeName="opacity" values=".8;.6;.8" dur="2s" repeatCount="indefinite"/></path><path d="M 130 90 Q 155 70 165 60 L 160 75 L 150 70 L 145 85 Z" fill="${corSec}" opacity=".8" stroke="${cor1}" stroke-width="2"><animate attributeName="opacity" values=".8;.6;.8" dur="2s" repeatCount="indefinite"/></path>`;
  }

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
    const sx=100+(lado*35), sy=95+off, mx=100+(lado*50), my=100+off+random(5,15), ex=100+(lado*65), ey=100+off+random(20,35);
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
let avatar = null;
// ── GAME SPEED ─────────────────────────────────────────────────────
// Multiplier for all stat decay rates. Higher = faster decay.
// 1.0 = balanced (fome zera em ~1h40)
// 2.0 = faster   (fome zera em ~50min)
// 0.5 = slower   (fome zera em ~3h20)
const GAME_SPEED = 1.0;

const vitals = { fome:100, humor:100, energia:100, saude:100, higiene:100 };
let poopCount = 0;
let dirtyLevel = 0; // 0-3
let poopCooldown  = 5;   // ~5 ciclos antes do primeiro cocô (~5min)
let eggLayCooldown = 0;
let pendingHatchId = null; // egg id waiting for confirm  // ticks até o próximo ovo (0 = pronto)
let eggsInInventory = [];
