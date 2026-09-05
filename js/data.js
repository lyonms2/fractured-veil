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

// Doze nomes por TOM e raridade, e dezesseis sufixos por raridade —
// eram seis e oito. Com o seed do avatar já vindo do id do ovo, dois
// bichos com o mesmo nome deixaram de ser o mesmo bicho, mas homônimos
// entre jogadores apareciam cedo demais: 48 combinações por gaveta
// esgotavam-se depressa. Agora são 192.
//
// O tom sobe com a raridade: palavras do dia a dia nos Comuns, formas
// latinizadas nos Raros, e divindades de verdade nos Lendários.
const PREFIXOS = {
  'brasa':         { 'Comum':['Ember','Spark','Cinder','Ash','Scorch','Char','Flicker','Smoke','Soot','Glow','Singe','Kindle'],
                    'Raro':['Ignis','Pyro','Vulcan','Blaze','Inferno','Magma','Ardor','Flare','Caldera','Solaris','Fornax','Ignifer'],
                    'Lendário':['Prometheus','Surtr','Hephaestus','Helios','Agni','Kagutsuchi','Ra','Pele','Logi','Vesta','Brigid','Chantico'] },
  'mare':         { 'Comum':['Drip','Mist','Tide','Brook','Rain','Dew','Ripple','Puddle','Splash','Foam','Creek','Drizzle'],
                    'Raro':['Aqua','Hydro','Oceanus','Torrent','Cascade','Glacier','Nereid','Maelstrom','Undine','Marina','Riptide','Fathom'],
                    'Lendário':['Poseidon','Leviathan','Tiamat','Ægir','Ryūjin','Sedna','Neptune','Varuna','Njord','Nammu','Mazu','Yam'] },
  'barro':        { 'Comum':['Pebble','Clay','Dust','Sand','Mud','Stone','Gravel','Loam','Moss','Root','Silt','Flint'],
                    'Raro':['Terra','Geo','Boulder','Titan','Granite','Bedrock','Obsidian','Basalt','Quartz','Monolith','Slate','Crag'],
                    'Lendário':['Atlas','Gaia','Cronus','Ymir','Nidhogg','Kū','Geb','Jörð','Pachamama','Prithvi','Tellus','Antaeus'] },
  'folha':        { 'Comum':['Breeze','Gust','Wisp','Draft','Waft','Puff','Whirl','Flutter','Swirl','Drift','Sigh','Feather'],
                    'Raro':['Aero','Zephyr','Gale','Storm','Tempest','Cyclone','Vortex','Typhoon','Sirocco','Monsoon','Squall','Tornado'],
                    'Lendário':['Fujin','Boreas','Aeolus','Enlil','Stribog','Vayu','Notus','Eurus','Shu','Ehecatl','Tawhiri','Pazuzu'] },
  'breu':       { 'Comum':['Shade','Dusk','Murk','Gloom','Haze','Dim','Twilight','Cloak','Veil','Blur','Grey','Hush'],
                    'Raro':['Umbra','Nox','Eclipse','Void','Phantom','Abyss','Wraith','Specter','Penumbra','Obscura','Shroud','Requiem'],
                    'Lendário':['Erebus','Nyx','Tenebris','Moros','Kali','Apophis','Nott','Ratri','Ereshkigal','Hel','Achlys','Chernobog'] }
};
const SUFIXOS = {
  'Comum':    ['o Curioso','o Brincalhão','o Tímido','o Guloso','o Sonolento','o Teimoso','o Carinhoso','o Inquieto',
               'o Bagunceiro','o Desastrado','o Manhoso','o Resmungão','o Saltitante','o Preguiçoso','o Xereta','o Chorão'],
  'Raro':     ['o Sábio','o Misterioso','o Sereno','o Vibrante','o Contemplativo','o Peculiar','o Sensível','o Antigo',
               'o Astuto','o Pensativo','o Silencioso','o Nobre','o Enigmático','o Constante','o Fiel','o Errante'],
  'Lendário': ['o Eterno','o Primordial','o Transcendente','o Visionário','o Imorredouro','o Sempiterno','o Singular','o Majestoso',
               'o Infinito','o Inexorável','o Soberano','o Ancestral','o Insondável','o Absoluto','o Indômito','o Supremo']
};
/* O NOME DE NASCENÇA.

   As gavetas de nomes eram três, uma por raridade: Ember para o Comum,
   Ignis para o Raro, Prometheus para o Lendário. Fazia sentido enquanto
   a raridade nascia com o avatar — deixou de fazer no dia em que todos
   passaram a nascer Comuns, porque aí dois terços dos nomes do jogo
   nunca mais sairiam a ninguém.

   E o nome não pode acompanhar a raridade depois: é dado uma vez e fica
   (ver js/identidade.js). Portanto sorteia-se das três gavetas ao
   nascer, que é o que os pais fazem — dão um nome sem saber no que o
   filho se vai tornar.

   O que MANDA na gaveta é o TOM DA COR (js/cores.js). Era o elemento;
   passou a ser a cor no dia em que o elemento saiu do jogo, e ficou
   melhor do que estava — a cor vê-se, o elemento era uma palavra. */
function nomeDeNascimento(tom) {
  const gavetas = PREFIXOS[tom] || PREFIXOS['brasa'];
  const nomes = [].concat(gavetas['Comum'] || [], gavetas['Raro'] || [], gavetas['Lendário'] || []);
  const alcunhas = [].concat(SUFIXOS['Comum'], SUFIXOS['Raro'], SUFIXOS['Lendário']);
  return rnd(nomes.length ? nomes : ['Ser']) + ', ' + rnd(alcunhas);
}

const DESCRICOES = {
  'Comum': {
    'brasa':['Uma centelha dimensional que encontrou forma própria. Curioso e impulsivo, aquece tudo ao redor sem perceber.','Nascido do calor residual de uma fissura entre mundos. Ainda aprendendo a controlar a intensidade do seu brilho.'],
    'mare':['Uma gotícula que se separou do grande oceano etéreo. Adaptável e sereno, flui para onde mais precisa de presença.','Espírito aquático jovem que ainda descobre a extensão do seu fluxo. Atento a cada detalhe ao redor.'],
    'barro':['Um fragmento de argila primordial que ganhou consciência. Paciente e estável, cresce devagar mas com raízes firmes.','Pedaço de solo antigo que aprendeu a sentir. Prefere a calma, mas guarda uma força silenciosa surpreendente.'],
    'folha':['Uma brisa que decidiu ter forma. Livre e inquieto, dificilmente fica parado por muito tempo.','Nascido de correntes de ar entre dimensões. Leve e curioso, tudo o entretém por igual.'],
    'breu':['Uma sombra que aprendeu a existir por conta própria. Observador silencioso, prefere entender antes de agir.','Nascido da penumbra entre mundos. Contemplativo e introspectivo, guarda mais do que mostra.']
  },
  'Raro': {
    'brasa':['Forjado no coração de uma fissura ígnea dimensional. Sua presença aquece o ambiente — às vezes demais.','Sobrevivente de um colapso de plano de fogo. Intenso e leal, a chama interior nunca diminui.'],
    'mare':['Emergiu das profundezas de um oceano etéreo. Carrega a memória de marés que ninguém mais viu.','Espírito das correntes profundas. Calmo na superfície, mas com uma profundidade que surpreende quem se aproxima.'],
    'barro':['Talhado das camadas mais antigas de um plano mineral. Cada textura conta histórias de eras passadas.','Guardião silencioso de um território que já não existe. Estável como montanha, gentil como vale.'],
    'folha':['Nascido do olho de uma tempestade dimensional. Livre e imprevisível, mas sempre volta.','Corrente de ar que percorreu mil planos antes de se estabelecer. Viajante nato, nunca para de observar.'],
    'breu':['Emergiu do silêncio entre estrelas. Sua presença é reconfortante para quem aprecia a quietude.','Um fragmento do escuro que aprendeu a sentir. Raramente fala, mas quando o faz, vale escutar.']
  },
  'Lendário': {
    'brasa':['Dizem que este ser precedeu o fogo — ele não o controla, ele o é. Sua presença aquece memórias esquecidas e desperta paixões adormecidas em quem se aproxima.'],
    'mare':['O próprio fluir personificado. Não segue caminhos — os cria. Quem o conhece aprende que resistir às mudanças cansa mais do que abraçá-las.'],
    'barro':['Testemunhou o nascimento de planos inteiros. Paciente além da compreensão, ensina pelo simples ato de existir. Sua presença faz o caos se assentar.'],
    'folha':['O primeiro movimento antes de qualquer forma. Estar com ele é sentir que o mundo tem mais dimensões do que os olhos percebem.'],
    'breu':['Não é ausência de luz — é a profundidade que dá sentido a ela. Quem aprende a estar com ele descobre uma quietude que o mundo barulhento não oferece.']
  }
};

const DESCRICOES_EN = {
  'Comum': {
    'brasa':['A dimensional spark that found its own form. Curious and impulsive, it warms everything around without realizing.','Born from the residual heat of a rift between worlds. Still learning to control the intensity of its glow.'],
    'mare':['A droplet that broke away from the great ethereal ocean. Adaptable and serene, it flows to where presence is most needed.','A young aquatic spirit still discovering the extent of its flow. Attentive to every detail around.'],
    'barro':['A fragment of primordial clay that gained consciousness. Patient and stable, it grows slowly but with firm roots.','A piece of ancient soil that learned to feel. Prefers calm, but holds a surprisingly quiet strength.'],
    'folha':['A breeze that decided to take form. Free and restless, it hardly stays still for long.','Born from air currents between dimensions. Light and curious, everything captivates it equally.'],
    'breu':['A shadow that learned to exist on its own. A silent observer, it prefers to understand before acting.','Born from the twilight between worlds. Contemplative and introspective, it holds more than it shows.']
  },
  'Raro': {
    'brasa':['Forged in the heart of a dimensional igneous rift. Its presence warms the surroundings — sometimes too much.','Survivor of a fire-plane collapse. Intense and loyal, the inner flame never dims.'],
    'mare':['Emerged from the depths of an ethereal ocean. It carries the memory of tides no one else has seen.','Spirit of the deep currents. Calm on the surface, but with a depth that surprises those who draw close.'],
    'barro':['Carved from the oldest layers of a mineral plane. Every texture tells stories of ages past.','Silent guardian of a territory that no longer exists. Steady as a mountain, gentle as a valley.'],
    'folha':['Born from the eye of a dimensional storm. Free and unpredictable, but always returns.','An air current that traversed a thousand planes before settling. A born traveler, never stops observing.'],
    'breu':['Emerged from the silence between stars. Its presence is comforting to those who appreciate stillness.','A fragment of darkness that learned to feel. Rarely speaks, but when it does, it\'s worth listening.']
  },
  'Lendário': {
    'brasa':['They say this being preceded fire — it does not control it, it is fire. Its presence warms forgotten memories and awakens dormant passions in those who draw near.'],
    'mare':['The very embodiment of flow. It does not follow paths — it creates them. Those who know it learn that resisting change is more tiring than embracing it.'],
    'barro':['Witnessed the birth of entire planes. Patient beyond comprehension, it teaches through the simple act of existing. Its presence makes chaos settle.'],
    'folha':['The first movement before any form. Being with it is feeling that the world has more dimensions than the eyes perceive.'],
    'breu':['It is not the absence of light — it is the depth that gives meaning to it. Those who learn to be with it discover a stillness the noisy world cannot offer.']
  }
};

/* AS DESCRIÇÕES DEIXARAM DE DEPENDER DA RARIDADE, E É UM DEFEITO QUE
   ISTO EVITA — não só conteúdo morto.

   Guarda-se o ÍNDICE da descrição no avatar, e resolvia-se com
   (raridade, gaveta, índice). Enquanto a raridade nunca mudava, isso
   dava sempre a mesma frase. Agora a raridade sobe com a fase — e o
   mesmo índice passaria a apontar para outra gaveta: o avatar mudava de
   descrição ao evoluir, sem ninguém ter pedido.

   Uma gaveta só por tom resolve as duas coisas de uma vez: o índice é
   estável para sempre, e as descrições que estavam trancadas atrás do
   Raro e do Lendário voltam a poder sair a qualquer avatar. */
function descricoesDoTom(tom) {
  const D = (typeof window !== 'undefined' && window._currentLang === 'en') ? DESCRICOES_EN : DESCRICOES;
  const gavetas = ['Comum', 'Raro', 'Lendário'];
  let pool = [];
  for (const g of gavetas) pool = pool.concat((D[g] && (D[g][tom] || D[g]['brasa'])) || []);
  return pool;
}

/* Aceita o TOM ou o AVATAR INTEIRO. Há sítios que têm um e sítios que
   têm o outro, e obrigar cada um deles a converter era pedir que um se
   enganasse — e nenhum deles daria erro ao enganar-se, só uma frase
   errada por baixo do bicho. */
function _tomDe(x) {
  if (typeof x === 'string')
    return (typeof CORES_TONS !== 'undefined' && CORES_TONS.indexOf(x) >= 0) ? x : 'brasa';
  return (typeof tomDoAvatar === 'function') ? tomDoAvatar(x) : 'brasa';
}

function getAvatarDesc(raridade, alvo, idx) {
  // A raridade fica no argumento porque muitos sítios a passam, mas já
  // não entra na escolha — ver descricoesDoTom.
  const pool = descricoesDoTom(_tomDe(alvo));
  if(!pool.length) return '';
  return pool[Math.min(idx ?? 0, pool.length - 1)];
}

// ─── HELPERS ───
function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function determinarRaridade() {
  const r = Math.random();
  if(r < .02) return 'Lendário';
  if(r < .20) return 'Raro';
  return 'Comum';
}

// ─── SVG GENERATOR ───

// Contador global para dar um ID irrepetível a cada SVG gerado
let _svgUid = 0;

function gerarSVG(avatar, raridade, seed, w, h, fase) {
  fase = (typeof fase === 'number') ? fase : 0;
  // random determinístico
  let _seed = seed;
  const random = (min, max) => {
    _seed = (_seed * 9301 + 49297) % 233280;
    return Math.floor((_seed / 233280) * (max - min + 1)) + min;
  };
  const escolher = (arr) => arr[random(0, arr.length - 1)];

  /* ── A PALETA É A COR DO AVATAR, E MAIS NADA ──

     O primeiro parâmetro chamava-se `elemento`, e havia aqui cinco
     paletas escritas à mão — uma por elemento, sete cores cada. Dois
     avatares da mesma família saíam do mesmo balde de vermelhos.

     Agora sai tudo da cor que o avatar traz no DNA: doze por doze, e
     a paleta é uma conta sobre o matiz (paletaDeCores, js/cores.js).

     Quem passar outra coisa que não o avatar — um registo de lobby, um
     nome antigo — recebe na mesma uma cor estável, tirada da SEED. A
     seed já decide o corpo inteiro; tirar dela também a cor não inventa
     nada, e nunca deixa um bicho sem cor nenhuma. */
  const cfg = (typeof paletaDoAvatar === 'function')
    ? paletaDoAvatar(avatar && typeof avatar === 'object' ? avatar : null, seed)
    : { cores:['#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'], coresSec:['#4c1d95','#5b21b6','#6d28d9'],
        corBrilho:'#ede9fe', corOlho:'#c4b5fd', particulas:'sombras' };
  const cor1      = escolher(cfg.cores);
  const cor2      = escolher(cfg.cores);
  const corSec    = escolher(cfg.coresSec);
  const corBrilho = cfg.corBrilho;
  const corOlho   = cfg.corOlho;

  /* ── A FORMA ADULTA, E O QUE JÁ SE VÊ DELA ──

     A raridade decidia o corpo inteiro, e isso funcionava enquanto ela
     nascia com o avatar. Agora conquista-se (js/raridade.js) — e um
     corpo que dependa dela mudava no dia da evolução.

     Mudava mesmo: as gamas eram diferentes por raridade e algumas
     linhas nem chegavam a sortear (um Comum saltava três sorteios de
     uma vez, porque as asas, os tentáculos e os espinhos entravam em
     curto-circuito). Como o sorteio é uma fila — cada número sai do
     anterior —, saltar três desalinhava tudo o que vinha a seguir. O
     bicho não ganhava asas ao evoluir: passava a ser OUTRO BICHO.

     Por isso a fila passa a ser sempre a mesma, e sempre completa. O
     seed decide de uma vez a forma ADULTA — a que este avatar terá se
     lá chegar — e a raridade só decide QUANTO DELA já se vê. O que
     identifica o bicho (o corpo, o tipo de olho, a boca, os chifres, a
     cauda) está lá desde bebé e nunca muda. O que é acréscimo (braços
     a mais, um terceiro olho, tentáculos, espinhos, asas) vai
     aparecendo. É crescer, e não trocar. */
  const grau = (typeof grauDaRaridade === 'function') ? grauDaRaridade(raridade)
             : (raridade === 'Lendário' ? 2 : raridade === 'Raro' ? 1 : 0);

  // A forma adulta. Doze sorteios, sempre os doze, sempre por esta ordem.
  const tipoCorpo   = random(1, 8);
  const numOlhosAd  = random(1, 3);
  const tipoOlho    = random(1, 8);
  const numBracosAd = random(2, 8);
  const numChifres  = random(0, 4);
  const temCauda    = random(0, 2) > 0;
  const tipoCauda   = random(1, 4);
  const temAsasAd   = random(0, 2) > 0;
  const tipoAsas    = random(1, 3);
  const temTentAd   = random(0, 9) > 6;
  const numEspAd    = random(0, 4);
  const bocaTipo    = random(1, 8);

  // O que já cresceu. Um avatar que nasceu sem asas na forma adulta
  // nunca as terá, por muito que suba — a raridade revela, não inventa.
  const numOlhos  = Math.min(numOlhosAd,  [2, 3, 3][grau]);
  const numBracos = Math.min(numBracosAd, [4, 6, 8][grau]);
  const numEsp    = Math.min(numEspAd,    [0, 2, 4][grau]);
  const temTent   = grau >= 1 && temTentAd;

  /* ── E OS PORMENORES DE CADA PARTE, TAMBÉM AO MÁXIMO ──

     Não chegava sortear as CONTAS aqui em cima: os laços que desenham
     os braços, os espinhos, os olhos e os tentáculos sorteavam mais um
     número por cada parte que desenhavam. Menos espinhos, menos
     sorteios — e tudo o que vinha a seguir na fila mudava. O corpo
     ficava igual (está desenhado antes) mas os chifres e os olhos
     trocavam ao evoluir, que era o mesmo defeito um bocado mais abaixo.

     Sorteiam-se aqui, sempre a contagem máxima, e os laços leem da
     lista em vez de sortear. Assim um Comum e um Lendário com o mesmo
     seed têm exactamente o mesmo primeiro braço — o Lendário tem é
     mais. */
  const ntAd      = random(2, 4);                                   // tentáculos
  const bracoDet  = [];
  for (let i = 0; i < 8; i++) bracoDet.push([random(5, 15), random(20, 35)]);
  const espDet    = [];
  for (let i = 0; i < 4; i++) espDet.push(random(12, 20));
  const olhoDet   = [];
  for (let i = 0; i < 3; i++) olhoDet.push(random(-1, 1));
  // ID único por render, não por seed. Se dois SVGs do mesmo avatar
  // coexistirem (por exemplo o do jogo e o do card no marketplace), IDs
  // iguais fazem o browser resolver url(#grad…) sempre para o primeiro —
  // e se esse primeiro for escondido ou removido, os outros perdem o
  // gradiente e aparecem transparentes.
  const sid       = `${seed}_${++_svgUid}`;

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
  s += `<g class="av-aura">`;
  if(raridade === 'Lendário') s += `
    <circle cx="100" cy="100" r="95" fill="none" stroke="${corBrilho}" stroke-width="4" opacity=".6" filter="url(#glow${sid})"><animate attributeName="r" values="90;100;90" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".6;.8;.6" dur="2s" repeatCount="indefinite"/></circle>
    <circle cx="100" cy="100" r="85" fill="none" stroke="${cor1}" stroke-width="3" opacity=".5" filter="url(#glow${sid})"><animate attributeName="r" values="80;90;80" dur="3s" repeatCount="indefinite"/></circle>`;
  else if(raridade === 'Raro') s += `
    <circle cx="100" cy="100" r="88" fill="none" stroke="${corBrilho}" stroke-width="2" opacity=".2" filter="url(#glow${sid})"><animate attributeName="r" values="85;90;85" dur="2.5s" repeatCount="indefinite"/></circle>`;

  s += `</g>`;
  // Asas de fase (fase 3+) — ancoradas no corpo inferior (wdy desloca de y=100 para y=163)
  s += `<g class="av-asa">`;
  if(temAsasFase) {
    if(tipoAsaFase===1) s+=`<path d="M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z" fill="${cor1}" stroke="${corBrilho}" stroke-width="1.5" opacity=".72"><animate attributeName="d" values="M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z;M 68 ${100+wdy} Q 47 ${81+wdy} 20 ${60+wdy} Q 32 ${78+wdy} 44 ${90+wdy} Q 54 ${97+wdy} 68 ${102+wdy} Z;M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 68 ${100+wdy} Q 46 ${86+wdy} 28 ${70+wdy} Q 40 ${82+wdy} 54 ${94+wdy} Z" fill="${corBrilho}" opacity=".20"/><path d="M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z" fill="${cor1}" stroke="${corBrilho}" stroke-width="1.5" opacity=".72"><animate attributeName="d" values="M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z;M 132 ${100+wdy} Q 153 ${81+wdy} 180 ${60+wdy} Q 168 ${78+wdy} 156 ${90+wdy} Q 146 ${97+wdy} 132 ${102+wdy} Z;M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 132 ${100+wdy} Q 154 ${86+wdy} 172 ${70+wdy} Q 160 ${82+wdy} 146 ${94+wdy} Z" fill="${corBrilho}" opacity=".20"/>`;
    else if(tipoAsaFase===2) s+=`<path d="M 65 ${98+wdy} L 38 ${75+wdy} L 20 ${62+wdy} L 28 ${82+wdy} L 44 ${93+wdy} L 60 ${100+wdy} Z" fill="${corSec}" stroke="${cor1}" stroke-width="1.5" opacity=".68"><animate attributeName="opacity" values=".68;.82;.68" dur="2.5s" repeatCount="indefinite"/></path><path d="M 65 ${98+wdy} L 32 ${76+wdy} L 18 ${66+wdy} Z" fill="${corBrilho}" opacity=".22" filter="url(#ig${sid})"/><path d="M 135 ${98+wdy} L 162 ${75+wdy} L 180 ${62+wdy} L 172 ${82+wdy} L 156 ${93+wdy} L 140 ${100+wdy} Z" fill="${corSec}" stroke="${cor1}" stroke-width="1.5" opacity=".68"><animate attributeName="opacity" values=".68;.82;.68" dur="2.5s" repeatCount="indefinite"/></path><path d="M 135 ${98+wdy} L 168 ${76+wdy} L 182 ${66+wdy} Z" fill="${corBrilho}" opacity=".22" filter="url(#ig${sid})"/>`;
    else s+=`<path d="M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z" fill="${cor2}" stroke="${corBrilho}" stroke-width="1" opacity=".75"><animate attributeName="d" values="M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z;M 66 ${96+wdy} Q 47 ${80+wdy} 24 ${64+wdy} Q 36 ${78+wdy} 48 ${88+wdy} Q 56 ${93+wdy} 66 ${98+wdy} Z;M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 66 ${103+wdy} Q 50 ${92+wdy} 34 ${80+wdy} Q 46 ${90+wdy} 58 ${98+wdy} Z" fill="${cor1}" opacity=".50"/><path d="M 66 ${110+wdy} Q 52 ${102+wdy} 40 ${94+wdy} Q 50 ${100+wdy} 62 ${106+wdy} Z" fill="${cor2}" opacity=".35"/><path d="M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z" fill="${cor2}" stroke="${corBrilho}" stroke-width="1" opacity=".75"><animate attributeName="d" values="M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z;M 134 ${96+wdy} Q 153 ${80+wdy} 176 ${64+wdy} Q 164 ${78+wdy} 152 ${88+wdy} Q 144 ${93+wdy} 134 ${98+wdy} Z;M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 134 ${103+wdy} Q 150 ${92+wdy} 166 ${80+wdy} Q 154 ${90+wdy} 142 ${98+wdy} Z" fill="${cor1}" opacity=".50"/><path d="M 134 ${110+wdy} Q 148 ${102+wdy} 160 ${94+wdy} Q 150 ${100+wdy} 138 ${106+wdy} Z" fill="${cor2}" opacity=".35"/>`;
  }

  s += `</g>`;
  // Corpo inferior (fase 2+) — 12% maior para ficar proporcional
  s += `<g class="av-corpo">`;
  if(temCorpoInferior) {
    if(tipoSegmento===1) s+=`<path d="M 80 143 Q 68 164 70 187 Q 79 212 100 216 Q 121 212 130 187 Q 132 164 120 143 Z" fill="url(#grad${sid})" stroke="${corSec}" stroke-width="1.5" opacity=".88"><animate attributeName="opacity" values=".88;.94;.88" dur="3s" repeatCount="indefinite"/></path><ellipse cx="100" cy="183" rx="15" ry="9" fill="${cor2}" opacity=".35" filter="url(#ig${sid})"/>`;
    else if(tipoSegmento===2) s+=`<polygon points="74,143 126,143 136,170 126,198 74,198 64,170" fill="url(#grad${sid})" stroke="${corBrilho}" stroke-width="1.5" opacity=".85"><animate attributeName="opacity" values=".85;.92;.85" dur="3s" repeatCount="indefinite"/></polygon><line x1="74" y1="170" x2="126" y2="170" stroke="${corBrilho}" stroke-width="1" opacity=".25"/><ellipse cx="100" cy="170" rx="13" ry="8" fill="${corBrilho}" opacity=".15" filter="url(#ig${sid})"/>`;
    else s+=`<path d="M 84 143 Q 75 162 73 182 Q 77 206 100 211 Q 123 206 127 182 Q 125 162 116 143 Z" fill="url(#grad${sid})" stroke="${corSec}" stroke-width="1.5" opacity=".87"><animate attributeName="opacity" values=".87;.93;.87" dur="3.5s" repeatCount="indefinite"/></path><ellipse cx="100" cy="164" rx="10" ry="6" fill="${corBrilho}" opacity=".18" filter="url(#ig${sid})"/><ellipse cx="100" cy="183" rx="12" ry="7" fill="${corBrilho}" opacity=".18" filter="url(#ig${sid})"/><line x1="100" y1="148" x2="100" y2="204" stroke="${cor1}" stroke-width="1" opacity=".20"/>`;
  }

  s += `</g>`;
  // Cauda
  s += `<g class="av-cauda">`;
  if(temCauda) {
    const cy2 = caudaY0;
    if(tipoCauda===1) s+=`<path d="M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55}" stroke="${cor2}" stroke-width="10" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55};M 100 ${cy2} Q 85 ${cy2+20} 72 ${cy2+40} Q 68 ${cy2+50} 78 ${cy2+55};M 100 ${cy2} Q 80 ${cy2+20} 70 ${cy2+40} Q 65 ${cy2+50} 75 ${cy2+55}" dur="2s" repeatCount="indefinite"/></path>`;
    else if(tipoCauda===2) s+=`<path d="M 100 ${cy2} L 85 ${cy2+30} L 95 ${cy2+35} L 80 ${cy2+60}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"/><polygon points="75,${cy2+60} 80,${cy2+70} 85,${cy2+60}" fill="${corBrilho}" filter="url(#glow${sid})"><animate attributeName="opacity" values=".8;1;.8" dur="1.5s" repeatCount="indefinite"/></polygon>`;
    else if(tipoCauda===3) s+=`<path d="M 100 ${cy2} Q 90 ${cy2+15} 85 ${cy2+30} Q 82 ${cy2+40} 88 ${cy2+48}" stroke="${cor1}" stroke-width="14" fill="none" opacity=".9" stroke-linecap="round"/><path d="M 100 ${cy2} Q 90 ${cy2+15} 85 ${cy2+30} Q 82 ${cy2+40} 88 ${cy2+48}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="stroke-width" values="8;10;8" dur="1.5s" repeatCount="indefinite"/></path>`;
    else s+=`<path d="M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45};M 100 ${cy2} Q 72 ${cy2+22} 62 ${cy2+47};M 100 ${cy2} Q 75 ${cy2+20} 65 ${cy2+45}" dur="2s" repeatCount="indefinite"/></path><path d="M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45};M 100 ${cy2} Q 128 ${cy2+22} 138 ${cy2+47};M 100 ${cy2} Q 125 ${cy2+20} 135 ${cy2+45}" dur="2s" repeatCount="indefinite"/></path>`;
  }

  /* As asas do avatar são as da FASE (temAsasFase, mais acima), e não as
     da raridade: temAsasAd e tipoAsas são sorteados e nunca desenhados.
     Já era assim antes disto, e continua — ficam porque o sorteio é uma
     fila e tirar dois números do meio dela mudava o aspecto de todos os
     avatares que já existem. Como a raridade agora anda com a fase, as
     asas chegam na mesma altura em que o avatar passa a Lendário. */

  s += `</g>`;
  // Tentáculos
  s += `<g class="av-tentaculo">`;
  if(temTent) {
    const nt = ntAd;
    for(let i=0;i<nt;i++){
      const a=(Math.PI*2*i)/nt, sx=100+Math.cos(a)*35, sy=100+Math.sin(a)*35, mx=100+Math.cos(a)*60, my=100+Math.sin(a)*60, ex=100+Math.cos(a)*80, ey=100+Math.sin(a)*80;
      s+=`<path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="${corSec}" stroke-width="6" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="d" values="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey};M ${sx} ${sy} Q ${mx+5} ${my-5} ${ex} ${ey};M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" dur="2s" repeatCount="indefinite"/></path>`;
    }
  }

  s += `</g>`;
  // Braços
  s += `<g class="av-braco">`;
  for(let i=0;i<numBracos;i++){
    s+=`<g class="av-membro" style="--i:${i}">`;
    const lado=i%2===0?-1:1, off=Math.floor(i/2)*15;
    const sx=100+(lado*brAnchorR), sy=brAnchorY+off, mx=100+(lado*50), my=brAnchorY+off+bracoDet[i][0], ex=100+(lado*65), ey=brAnchorY+off+bracoDet[i][1];
    s+=`<path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="${cor2}" stroke-width="${raridade==='Lendário'?8:6}" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="d" values="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey};M ${sx} ${sy} Q ${mx} ${my+3} ${ex} ${ey+2};M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" dur="3s" repeatCount="indefinite"/></path>`;
    if(raridade!=='Comum') s+=`<line x1="${ex}" y1="${ey}" x2="${ex+lado*8}" y2="${ey+6}" stroke="${corBrilho}" stroke-width="3" opacity=".8" stroke-linecap="round"><animate attributeName="opacity" values=".8;.5;.8" dur="2s" repeatCount="indefinite"/></line>`;
    s+=`</g>`;
  }

  s += `</g>`;
  // Corpo
  s += `<g class="av-corpo">`;
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

  s += `</g>`;
  // Espinhos
  s += `<g class="av-espinho">`;
  for(let i=0;i<numEsp;i++){
    const a=(Math.PI*2*i)/numEsp, r=48, x=100+Math.cos(a)*r, y=100+Math.sin(a)*r, h2=espDet[i], px=100+Math.cos(a)*(r+h2), py2=100+Math.sin(a)*(r+h2);
    s+=`<polygon points="${x},${y} ${px},${py2} ${x+3},${y+3}" fill="${corBrilho}" opacity=".7" filter="url(#ig${sid})" stroke="${cor1}" stroke-width="1"><animate attributeName="opacity" values=".7;.9;.7" dur="2s" repeatCount="indefinite"/></polygon>`;
  }

  s += `</g>`;
  // Chifres
  s += `<g class="av-chifre">`;
  for(let i=0;i<numChifres;i++){
    const x=75+(i*(50/Math.max(numChifres-1,1))), alt=random(20,35), larg=random(8,12);
    s+=`<polygon points="${x},70 ${x+larg/2},${70-alt} ${x+larg},70" fill="url(#lg${sid})" opacity=".9" filter="url(#glow${sid})" stroke="${corBrilho}" stroke-width="2"><animate attributeName="opacity" values=".9;1;.9" dur="2s" repeatCount="indefinite"/></polygon>`;
  }

  s += `</g>`;
  // Olhos
  s += `<g class="av-olho">`;
  const espac = numOlhos===1 ? 0 : 60/(numOlhos-1);
  for(let i=0;i<numOlhos;i++){
    s+=`<g class="av-olho-un" style="--i:${i}">`;
    const x = numOlhos===1 ? 100 : 70+(i*espac);
    const tb = raridade==='Lendário' ? 14 : raridade==='Raro' ? 12 : 10;
    const t = tb + olhoDet[i];
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
    s+=`</g>`;
  }

  s += `</g>`;
  // Boca
  s += `<g class="av-boca">`;
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

  s += `</g>`;
  // Manchas
  s += `<g class="av-mancha">`;
  const nd = raridade==='Lendário' ? random(4,6) : random(3,5);
  for(let i=0;i<nd;i++){
    const dx=random(75,125), dy=random(80,120), dr=random(2,4);
    s+=`<circle cx="${dx}" cy="${dy}" r="${dr}" fill="${corBrilho}" opacity=".25"><animate attributeName="opacity" values=".25;.15;.25" dur="3s" repeatCount="indefinite"/></circle>`;
  }

  s += `</g>`;
  // As partículas, que seguem o tom da cor
  s += `<g class="av-particula">`;
  const np = raridade==='Lendário' ? 14 : raridade==='Raro' ? 9 : 5;
  for(let i=0;i<np;i++){
    const px=random(20,180), py=random(20,180), pt=random(1, raridade==='Lendário'?3:2), delay=(random(0,20)*0.1).toFixed(1);
    switch(cfg.particulas){
      case 'chamas': s+=`<path d="M ${px} ${py} Q ${px-2} ${py-6} ${px} ${py-10}" stroke="${corBrilho}" stroke-width="${pt}" opacity=".6" fill="none" stroke-linecap="round" filter="url(#glow${sid})"><animate attributeName="opacity" values=".6;.2;.6" dur="1.5s" begin="${delay}s" repeatCount="indefinite"/></path>`;break;
      case 'gotas': s+=`<ellipse cx="${px}" cy="${py}" rx="${pt}" ry="${pt*1.5}" fill="${corBrilho}" opacity=".5" filter="url(#glow${sid})"><animate attributeName="cy" values="${py};${py+10};${py}" dur="2s" begin="${delay}s" repeatCount="indefinite"/></ellipse>`;break;
      case 'espirais': s+=`<path d="M ${px} ${py} Q ${px+3} ${py-3} ${px+5} ${py-1} Q ${px+7} ${py+2} ${px+5} ${py+4}" stroke="${corBrilho}" stroke-width="${pt*.8}" opacity=".5" fill="none" filter="url(#glow${sid})"><animateTransform attributeName="transform" type="rotate" from="0 ${px} ${py}" to="360 ${px} ${py}" dur="4s" begin="${delay}s" repeatCount="indefinite"/></path>`;break;
      case 'pedras': s+=`<rect x="${px-pt}" y="${py-pt}" width="${pt*2}" height="${pt*2}" fill="${corBrilho}" opacity=".4" transform="rotate(${random(0,360)} ${px} ${py})" filter="url(#glow${sid})"><animate attributeName="opacity" values=".4;.2;.4" dur="3s" begin="${delay}s" repeatCount="indefinite"/></rect>`;break;
      case 'sombras': s+=`<circle cx="${px}" cy="${py}" r="${pt}" fill="${corBrilho}" opacity=".4" filter="url(#glow${sid})"><animate attributeName="r" values="${pt};${pt*1.5};${pt}" dur="2s" begin="${delay}s" repeatCount="indefinite"/></circle>`;break;
    }
  }

  s += `</g>`;
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
