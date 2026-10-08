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
/* ═══════════════════════════════════════════════════════════════════
   AS ALCUNHAS

   ── ESTAVAM SÓ EM PORTUGUÊS, E VIAJAVAM ASSIM ──

   Eram uma lista de texto cravado, sorteada ao nascer e COLADA dentro do
   campo `nome`. Um jogador inglês recebia "o Desastrado" — e pior: a
   alcunha ia gravada no avatar, portanto seguia-o para o mercado e para
   a árvore de quem o comprasse. Não era uma tradução em falta na tela;
   era português a entrar nos dados de toda a gente.

   Agora guarda-se o ÍNDICE (`alcunhaIdx`) e a palavra sai da língua de
   quem está a ler. É o mesmo que as DESCRIÇÕES já faziam, e por isso
   não é modelo novo — é o modelo da casa, aplicado onde faltava.

   O índice é sobre a lista INTEIRA, na ordem em que estas três gavetas
   se concatenam. As gavetas ficam por leitura: nenhuma delas tranca
   nada, e qualquer avatar pode sair com qualquer alcunha.

   ── E TÊM OS DOIS GÉNEROS ──

   Os avatares têm sexo desde que há genética, e "Vesta, o Curioso" numa
   fêmea é português errado. Cada entrada é um par: masculino primeiro,
   feminino a seguir. O inglês não distingue, e é por isso que a lista
   dele é de palavras soltas e não de pares.

   As duas listas TÊM DE TER O MESMO COMPRIMENTO E A MESMA ORDEM: o que
   liga uma à outra é a posição, e um avatar gravado com o índice 9
   espera "o Desastrado" de um lado e "the Clumsy" do outro.
   ═══════════════════════════════════════════════════════════════════ */
const SUFIXOS = {
  'Comum':    [['o Curioso','a Curiosa'],       ['o Brincalhão','a Brincalhona'],
               ['o Tímido','a Tímida'],         ['o Guloso','a Gulosa'],
               ['o Sonolento','a Sonolenta'],   ['o Teimoso','a Teimosa'],
               ['o Carinhoso','a Carinhosa'],   ['o Inquieto','a Inquieta'],
               ['o Bagunceiro','a Bagunceira'], ['o Desastrado','a Desastrada'],
               ['o Manhoso','a Manhosa'],       ['o Resmungão','a Resmungona'],
               ['o Saltitante','a Saltitante'], ['o Preguiçoso','a Preguiçosa'],
               ['o Xereta','a Xereta'],         ['o Chorão','a Chorona']],
  'Raro':     [['o Sábio','a Sábia'],           ['o Misterioso','a Misteriosa'],
               ['o Sereno','a Serena'],         ['o Vibrante','a Vibrante'],
               ['o Contemplativo','a Contemplativa'], ['o Peculiar','a Peculiar'],
               ['o Sensível','a Sensível'],     ['o Antigo','a Antiga'],
               ['o Astuto','a Astuta'],         ['o Pensativo','a Pensativa'],
               ['o Silencioso','a Silenciosa'], ['o Nobre','a Nobre'],
               ['o Enigmático','a Enigmática'], ['o Constante','a Constante'],
               ['o Fiel','a Fiel'],             ['o Errante','a Errante']],
  'Lendário': [['o Eterno','a Eterna'],         ['o Primordial','a Primordial'],
               ['o Transcendente','a Transcendente'], ['o Visionário','a Visionária'],
               ['o Imorredouro','a Imorredoura'], ['o Sempiterno','a Sempiterna'],
               ['o Singular','a Singular'],     ['o Majestoso','a Majestosa'],
               ['o Infinito','a Infinita'],     ['o Inexorável','a Inexorável'],
               ['o Soberano','a Soberana'],     ['o Ancestral','a Ancestral'],
               ['o Insondável','a Insondável'], ['o Absoluto','a Absoluta'],
               ['o Indômito','a Indômita'],     ['o Supremo','a Suprema']]
};

// A mesma ordem, palavra a palavra. O inglês não flexiona em género.
const SUFIXOS_EN = {
  'Comum':    ['the Curious','the Playful','the Shy','the Gluttonous',
               'the Drowsy','the Stubborn','the Affectionate','the Restless',
               'the Messy','the Clumsy','the Sly','the Grumpy',
               'the Bouncy','the Lazy','the Nosy','the Weepy'],
  'Raro':     ['the Wise','the Mysterious','the Serene','the Vibrant',
               'the Contemplative','the Peculiar','the Sensitive','the Timeworn',
               'the Shrewd','the Thoughtful','the Silent','the Noble',
               'the Enigmatic','the Steadfast','the Faithful','the Wandering'],
  'Lendário': ['the Eternal','the Primordial','the Transcendent','the Visionary',
               'the Undying','the Everlasting','the Singular','the Majestic',
               'the Infinite','the Inexorable','the Sovereign','the Ancestral',
               'the Unfathomable','the Absolute','the Untamed','the Supreme']
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
/* ── UM NOME SUGERIDO, QUE NÃO É UM NOME DADO ──

   Aqui vivia o nomeDeNascimento: sorteava um nome das gavetas dos
   PREFIXOS e colava-lhe a alcunha. Nenhum avatar recebe hoje um nome do
   jogo — nem os que atravessam a Fratura (js/summon.js) nem os que saem
   do ovo (js/eggs.js). Quem dá o nome é o jogador, uma vez, na
   cerimónia do batismo.

   O que fica é isto, e a diferença não é pequena: o jogo já não nomeia
   ninguém, mas sabe sugerir. Quem chega à cerimónia sem ideia carrega
   no dado, vê um nome da gaveta da COR dele, e aceita-o ou escreve por
   cima. Continua a ser ele a decidir.

   Fez falta no dia em que os avatares passaram a chegar aos três de uma
   vez: inventar três nomes de repente é trabalho, e o jogo não devia
   começar com trabalho. */

/* ── SÓ A ALCUNHA ──

   Um avatar que atravessa a Fratura chega SEM NOME — é o que o prólogo
   diz, e passou a ser o que acontece: "nome é coisa que alguém dá, e
   ninguém deu". Quem dá é o jogador, uma vez, na cerimónia do batismo
   (ver js/identidade.js).

   A alcunha não é nome: é o que se vê nele, tirado da cor com que
   nasceu. Essa chega com ele, e fica guardada onde sempre esteve — a
   seguir à vírgula, no mesmo campo. Um avatar por batizar tem o nome
   vazio e a alcunha lá: ", o Curioso". O batismo escreve à frente da
   vírgula e não lhe toca (ver confirmRename, em js/actions.js). */
/* A lista inteira, na língua de quem lê. É sobre ESTA lista que o
   `alcunhaIdx` de cada avatar aponta. */
function _alcunhasTodas() {
  const en = (typeof window !== 'undefined' && window._currentLang === 'en');
  const S = en ? SUFIXOS_EN : SUFIXOS;
  return [].concat(S['Comum'], S['Raro'], S['Lendário']);
}

/* A alcunha de um índice, no género certo.

   O `sexo` só conta em português. Vem do avatar (sexoDe); sem ele fica
   o masculino, que é o que os avatares antigos já traziam escrito. */
function alcunhaPorIdx(idx, sexo) {
  const lista = _alcunhasTodas();
  if (!lista.length) return '';
  const item = lista[Math.min(Math.max(0, idx | 0), lista.length - 1)];
  if (Array.isArray(item)) return item[sexo === 'F' ? 1 : 0];
  return item;
}

// Qual delas calha a quem nasce. Guarda-se o ÍNDICE e não a palavra —
// ver a nota grande lá em cima.
function alcunhaIdxDeNascimento() {
  return Math.floor(Math.random() * _alcunhasTodas().length);
}

/* Um nome da gaveta da cor deste avatar. Só uma sugestão: quem escreve
   é o jogador, e o campo fica editável por cima dela. */
function nomeSugerido(tom) {
  const gavetas = PREFIXOS[tom] || PREFIXOS['brasa'];
  const nomes = [].concat(gavetas['Comum'] || [], gavetas['Raro'] || [], gavetas['Lendário'] || []);
  return rnd(nomes.length ? nomes : ['Ser']);
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

/* ══════════════════════════════════════════════════════════════════
   O CORPO — DOZE TRAÇOS E OS SEUS PORMENORES

   Estava tudo escrito dentro do gerarSVG, em fila, tirado da seed. E a
   seed não se herda: um filho não se parecia com nenhum dos pais.

   Sai agora daqui, para poder vir de dois sítios:

     DO DNA    quando o avatar tem os genes do corpo — e aí a boca, os
               chifres, os olhos e os braços herdam-se como tudo o resto
     DA SEED   quando não tem, exactamente como sempre

   A ordem dos sorteios da segunda forma É A DE SEMPRE, ao pé da letra. Cada
   número sai do anterior, portanto trocar uma linha de sítio muda todos
   os que vêm depois — e cada avatar já nascido mudaria de cara.
   ══════════════════════════════════════════════════════════════════ */

/* A forma adulta tirada da fila de sorteios. O `random` vem de fora
   porque a fila é a mesma que desenha o resto do bicho: o que aqui se
   consome tem de sair de lá, e não de um gerador à parte. */
function corpoDaFila(random) {
  const c = {};
  // Doze sorteios, sempre os doze, sempre por esta ordem.
  c.tipoCorpo  = random(1, 8);
  c.numOlhos   = random(1, 3);
  c.tipoOlho   = random(1, 8);
  c.numBracos  = random(2, 8);
  c.numChifres = random(0, 4);
  c.temCauda   = random(0, 2) > 0;
  c.tipoCauda  = random(1, 4);
  c.temAsas    = random(0, 2) > 0;
  c.tipoAsas   = random(1, 3);
  c.temTent    = random(0, 9) > 6;
  c.numEsp     = random(0, 4);
  c.bocaTipo   = random(1, 8);

  /* E os pormenores de cada parte, sempre à contagem MÁXIMA.

     Não chegava sortear as contas: os laços que desenham os braços, os
     espinhos e os olhos sorteavam mais um número por cada parte que
     desenhavam. Menos espinhos, menos sorteios — e tudo o que vinha a
     seguir na fila mudava. Assim um Comum e um Lendário com a mesma
     seed têm exactamente o mesmo primeiro braço; o Lendário tem é mais. */
  c.nt = random(2, 4);
  c.bracoDet = [];
  for (let i = 0; i < 8; i++) c.bracoDet.push([random(5, 15), random(20, 35)]);
  c.espDet = [];
  for (let i = 0; i < 4; i++) c.espDet.push(random(12, 20));
  c.olhoDet = [];
  for (let i = 0; i < 3; i++) c.olhoDet.push(random(-1, 1));
  return c;
}

/* ── O PREÂMBULO, NUMA FUNÇÃO SÓ ──

   O gerador, a paleta, as três cores e o corpo. Está aqui e não solto
   dentro do gerarSVG porque mais alguém precisa do corpo que uma seed dá
   — o cruzamento, para saber o que um progenitor SEM genes tem a passar
   ao filho.

   E precisa dele exactamente igual: as três cores saem da mesma fila que
   o corpo, portanto quem quiser o corpo tem de as sortear também. Escrever
   isso duas vezes seria pedir que as duas cópias envelhecessem em
   direcções diferentes — e a segunda só se usa no cruzamento, que é onde
   ninguém olharia. */
function _preludio(avatar, seed) {
  let _seed = seed;
  const random = (min, max) => {
    _seed = (_seed * 9301 + 49297) % 233280;
    return Math.floor((_seed / 233280) * (max - min + 1)) + min;
  };
  const escolher = (arr) => arr[random(0, arr.length - 1)];

  const cfg = (typeof paletaDoAvatar === 'function')
    ? paletaDoAvatar(avatar && typeof avatar === 'object' ? avatar : null, seed)
    : { cores:['#8b5cf6','#a78bfa','#c4b5fd','#ddd6fe'], coresSec:['#4c1d95','#5b21b6','#6d28d9'],
        corBrilho:'#ede9fe', corOlho:'#c4b5fd', particulas:'sombras' };

  const cor1   = escolher(cfg.cores);
  const cor2   = escolher(cfg.cores);
  const corSec = escolher(cfg.coresSec);

  /* A fila corre SEMPRE, mesmo quando o corpo vai vir do DNA, e o
     resultado dela deita-se fora nesse caso. É de propósito: o que vem a
     seguir na fila — as dimensões dos chifres, as partículas da aura —
     tem de cair no mesmo sítio nos dois casos, senão um avatar com genes
     e outro sem eles teriam auras diferentes pela mesma seed. */
  const daFila = corpoDaFila(random);

  return { random, escolher, cfg, cor1, cor2, corSec, daFila };
}

/* O corpo que uma seed dá, para quem não desenha nada — o cruzamento. */
function corpoDoSeed(avatar, seed) {
  return _preludio(avatar, seed).daFila;
}

/* De onde vem o corpo deste avatar: do DNA se ele o tiver, e da fila se
   não. Os PORMENORES (as dimensões dos braços, dos espinhos, dos olhos)
   vêm sempre da fila — são tremor e não feitio, e transformá-los em vinte
   genes a mais não mudava nada que se visse. */
function corpoDeQuem(avatar, daFila) {
  const dna = avatar && typeof avatar === 'object'
    && (avatar.dna || (avatar.nascimento && avatar.nascimento.dna));
  const doDna = (dna && typeof corpoDoDna === 'function') ? corpoDoDna(dna) : null;
  return doDna ? Object.assign({}, daFila, doDna) : daFila;
}

// Contador global para dar um ID irrepetível a cada SVG gerado
let _svgUid = 0;

/* ═══════════════════════════════════════════════════════════════════
   A GEOMETRIA DE CADA FASE

   Uma linha por fase, e é o único lugar onde se mexe para o avatar
   crescer. Antes isto eram seis ternários espalhados pelo gerarSVG, cada
   um com a sua pergunta `temCorpoInferior ? a : b` — o que dava duas
   geometrias para quatro fases, e nenhuma maneira de distinguir o Adulto
   do Ancião sem escrever um sétimo ternário.

   ── PORQUE AQUI, E NÃO NUM `transform` ──

   A auditoria 3J.3 mediu o que acontece a quem tenta crescer o avatar
   com `<g transform="scale(...)">`, e são duas coisas, cada uma
   suficiente para não o fazer:

     1. Todos os grupos `av-*` já têm `transform` de CSS (o respirar, o
        piscar, o abanar, o bater, o balançar). O `transform` de folha de
        estilo SOBREPÕE-SE ao atributo do SVG — o `scale` seria
        silenciosamente substituído pela animação, e apareceria só sob
        `prefers-reduced-motion`. Um defeito que depende da preferência
        do sistema de quem joga é um defeito que não se encontra.

     2. Três sítios MEDEM o desenho já pronto com `getBBox()` e colam
        peças novas nas coordenadas medidas: a pálpebra do sono
        (js/minigames.js), o X de quem caiu (js/arena-fu.js) e a abertura
        da boca ao comer (js/ui.js). O `getBBox` devolve a caixa no
        espaço próprio do elemento e ignora transformações dos
        ascendentes — e a pálpebra é acrescentada à RAIZ do svg. Um
        `<g transform>` pelo meio descolava a pálpebra do olho.

   Por isso o crescimento é ARITMÉTICA: os números saem já crescidos e o
   desenho sai nas coordenadas finais. O `getBBox` continua honesto e a
   camada de animação não nota nada.

   ── O QUE CADA CAMPO É ──

     corpo      fator do tamanho do corpo de cima, em volta de (100,100)
     membro     fator da extensão lateral dos braços
     chifre     fator do tamanho sorteado do chifre
     cauda      fator da extensão da cauda
     wdy        asas: deslocamento de y=100 para o corpo de baixo
     brAnchorY  braços: y onde se prendem
     brAnchorR  braços: meia-largura de onde se prendem
     caudaY0    cauda: y de origem
     auCY       aura: y do centro
     auRY       aura: raio vertical

   O `vbH` NÃO está aqui de propósito: a etapa 3J.4 proíbe mexer-lhe, e
   duas razões fixas em CSS dependem de ele ser 200×260
   (css/combate-arena.css). Fica onde estava, com a pergunta que sempre
   teve.

   ── O QUE MUDA, E O QUE NÃO ──

   Bebê, Jovem e Adulto trazem EXATAMENTE os números de hoje: os fatores
   são 1 e as posições são as que os ternários davam. O
   tools/testar-fase-geo.js compara 360 desenhos byte a byte contra o que
   o gerador produzia antes desta mudança.

   O Ancião é o único que cresce, e é o único que PODE: a etapa fixou
   Bebê, Jovem e Adulto na aparência atual. Medido no ANTES: a fase 2 e a
   fase 3 davam a mesma string em 69 de 120 pares (seed, raridade), e os
   51 restantes diferiam só pelas asas — ou seja, Adulto e Ancião tinham
   geometria idêntica e a única diferença existente entre os dois eram as
   asas, que esta mudança não toca.

   A cauda do Ancião fica em 1 e não cresce, e não é esquecimento: o
   desenho já SAI do próprio viewBox em baixo (o getBBox dá y até 285
   numa caixa de 260), e só a arena tem `overflow: visible`. Esticar a
   cauda aumentava um corte que já existe nas outras seis telas. O campo
   existe para o dia em que o corte for tratado — é ele que substitui o
   antigo `cE`, que estava declarado e nunca foi lido.
   ═══════════════════════════════════════════════════════════════════ */
const FASE_GEO = [
  // bebê                                                   ┌─ o corpo de baixo não existe
  { corpo: 1,    membro: 1,    chifre: 1,    cauda: 1, wdy:  0, brAnchorY:  95, brAnchorR: 35,
    caudaY0: 140, auCY: 105, auRY: 116 },
  // jovem
  { corpo: 1,    membro: 1,    chifre: 1,    cauda: 1, wdy:  0, brAnchorY:  95, brAnchorR: 35,
    caudaY0: 140, auCY: 105, auRY: 116 },
  // adulto                                                 └─ e aqui passa a existir
  { corpo: 1,    membro: 1,    chifre: 1,    cauda: 1, wdy: 63, brAnchorY: 163, brAnchorR: 30,
    caudaY0: 213, auCY: 135, auRY: 150 },
  // ancião — cresce 10% no corpo, nos braços e nos chifres
  { corpo: 1.10, membro: 1.10, chifre: 1.10, cauda: 1, wdy: 63, brAnchorY: 163, brAnchorR: 30,
    caudaY0: 213, auCY: 135, auRY: 150 },
];

/* A fase vem de fora e pode vir torta: o js/cards.js chama o gerarSVG
   com cinco argumentos e a fase chega `undefined`, e um nível acima da
   escada daria um índice que não existe. Prende-se à lista em vez de
   rebentar — era o que o `fase >= 2` fazia sozinho, e uma lista não
   perdoa índices como um comparador perdoa. */
function faseGeoDe(fase) {
  const i = Math.max(0, Math.min(FASE_GEO.length - 1, (+fase || 0) | 0));
  return FASE_GEO[i];
}

function gerarSVG(avatar, raridade, seed, w, h, fase) {
  fase = (typeof fase === 'number') ? fase : 0;
  // O gerador, a paleta, as cores e o corpo — tudo do _preludio, para o
  // cruzamento poder pedir o mesmo sem copiar nada.
  const _pre = _preludio(avatar, seed);
  const random = _pre.random;

  /* A PALETA É A COR DO AVATAR, E MAIS NADA — ver o _preludio, acima.
     O primeiro parâmetro chamava-se `elemento` e havia aqui cinco paletas
     escritas à mão; agora sai tudo da cor que o avatar traz no DNA. */
  const cfg       = _pre.cfg;
  const cor1      = _pre.cor1;
  const cor2      = _pre.cor2;
  const corSec    = _pre.corSec;
  const corBrilho = cfg.corBrilho;
  const corOlho   = cfg.corOlho;
  /* O contorno das formas cheias — corpo, chifres, asas, segmento. Era o
     corBrilho, e o corBrilho é o matiz levado ao claro: num traço de dois
     píxeis isso lê-se branco, e o bicho ficava com um halo em vez de uma
     borda. Os anéis da aura, as partículas e a garra continuam no brilho,
     que é onde ele está certo. Ver paletaDeCores, em js/cores.js. */
  const corContorno = cfg.corContorno || corBrilho;

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

     Por isso a fila passa a ser sempre a mesma, e sempre completa: é
     dela que sai a ANATOMIA inteira, de uma vez. Isto continua a valer,
     e é o que torna barato tudo o que vem a seguir.

     ── A RARIDADE DEIXOU DE REVELAR O CORPO (3J.6) ──

     Aqui dizia-se que "o seed decide a forma adulta e a raridade decide
     quanto dela já se vê". Essa regra está REVOGADA.

     Era uma regra de duas caras. A primeira: um Comum nunca tinha
     espinhos nem tentáculos, por muito que o seed lhe tivesse dado uns
     — não era crescer, era ter a anatomia censurada por um certificado.
     A segunda: a raridade conquista-se no exame mensal (api/_certificar.js),
     portanto o corpo mudava no dia em que o servidor assinasse um papel.
     Um avatar ganhava braços por ter vencido partidas.

     Agora os três conceitos estão separados, e cada um responde por uma
     coisa só:

       DNA + seed  →  ANATOMIA      quantas partes, de que tipo
       fase/idade  →  CRESCIMENTO   que tamanho e em que posição
       raridade    →  PRESENÇA      aura, glow, partículas

     O que identifica o bicho (o corpo, os olhos, a boca, os chifres, a
     cauda, os braços, os espinhos, os tentáculos) está lá desde bebê e
     nunca muda. O que cresce com a fase é o TAMANHO e a POSIÇÃO, não a
     contagem — ver a FASE_GEO. E a raridade não tira nem põe partes:
     acende o que está em volta delas.

     ── E O `grau` SAIU DAQUI ──

     Havia um `const grau = grauDaRaridade(raridade)` nesta linha, e os
     três tetos eram os seus únicos leitores. Sem eles ficava declarado
     e nunca lido — era o que o `cE` já tinha sido, e um número morto
     chamado "grau da raridade" no meio do gerador é um convite a
     alguém voltar a pendurar anatomia nele.

     O `grauDaRaridade` continua a existir e continua certo: vive no
     js/raridade.js e serve quem precisa de ORDENAR as três raridades.
     O que já não tem é um leitor no desenho. */

  /* Os doze traços e os pormenores saem do CORPO, e o corpo vem de um
     sítio só — do DNA quando o avatar o tem, e da seed quando não tem.
     Ver corpoDeQuem(), mais abaixo neste arquivo. */
  const _corpo      = corpoDeQuem(avatar, _pre.daFila);
  const tipoCorpo   = _corpo.tipoCorpo;
  const numOlhosAd  = _corpo.numOlhos;
  const tipoOlho    = _corpo.tipoOlho;
  const numBracosAd = _corpo.numBracos;
  const numChifres  = _corpo.numChifres;
  const temCauda    = _corpo.temCauda;
  const tipoCauda   = _corpo.tipoCauda;
  const temAsasAd   = _corpo.temAsas;
  const tipoAsas    = _corpo.tipoAsas;
  const temTentAd   = _corpo.temTent;
  const numEspAd    = _corpo.numEsp;
  const bocaTipo    = _corpo.bocaTipo;

  /* ── A ANATOMIA É A QUE SAIU DO DNA E DO SEED, E MAIS NADA ──

     Quatro linhas que hoje não fazem nada, e é esse o ponto: estavam
     aqui para a raridade cortar.

       numOlhos    nunca foi cortado — um olho não é recompensa, é a cara
                   do bicho. Esta linha já estava assim, e serviu de
                   modelo às outras três.
       numBracos   era `min(sorteado, [4, 6, 8][grau])`
       numEsp      era `min(sorteado, [0, 2, 4][grau])`
       temTent     era `grau >= 1 && sorteado`

     O `numEsp` é o que mostra melhor o problema: o teto do Comum era
     ZERO, portanto um Comum não tinha espinhos nunca, tivesse o seed
     sorteado quatro. E o `temTent` fazia o mesmo aos tentáculos.

     Ficam as quatro, e ficam escritas assim em vez de se usarem os
     nomes `...Ad` diretamente mais abaixo: são o contrato. Quem vier
     procurar onde é que a raridade mexe na anatomia encontra aqui a
     resposta, que é em lugar nenhum. */
  const numOlhos  = numOlhosAd;
  const numBracos = numBracosAd;
  const numEsp    = numEspAd;
  const temTent   = temTentAd;

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
  const ntAd      = _corpo.nt;
  const bracoDet  = _corpo.bracoDet;
  const espDet    = _corpo.espDet;
  const olhoDet   = _corpo.olhoDet;
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

  /* O vbH continua com a sua pergunta e fora da FASE_GEO: a etapa 3J.4
     proíbe mexer-lhe, e duas razões fixas no css/combate-arena.css
     dependem de ele ser 200×260. */
  const vbH       = temCorpoInferior ? 260 : 200;

  /* ── E O RESTO SAI DA TABELA DA FASE ── */
  const G         = faseGeoDe(fase);
  const wdy       = G.wdy;        // asas: deslocamento de y=100 para o corpo de baixo
  const brAnchorY = G.brAnchorY;  // braços: y onde se prendem
  const brAnchorR = G.brAnchorR;  // braços: meia-largura de onde se prendem
  const caudaY0   = G.caudaY0;    // cauda: y de origem

  /* ── OS QUATRO FATORES, COM SAÍDA ANTECIPADA EM 1 ──

     Devolver `v` e não `v * 1` quando o fator é 1 não é economia: é o
     que torna o "o Bebê, o Jovem e o Adulto não mudam" uma garantia
     testável byte a byte em vez de uma esperança sobre ponto flutuante.
     A conta de centrar, `100 + (v - 100) * f`, dá o mesmo número com
     f = 1 — mas dá-o por sorte, e `0.1 * 3` já mostrou a todos o que a
     sorte vale aqui.

     O corpo escala em volta de (100,100), que é o centro que o desenho
     sempre teve: por isso há duas funções e não uma. O `cP` move um
     PONTO para longe ou para perto do centro; o `cR` estica uma MEDIDA
     (um raio, um lado) que já é relativa ao centro. Trocá-las punha o
     corpo fora do sítio. */
  const cP = (v) => G.corpo  === 1 ? v : Math.round((100 + (v - 100) * G.corpo) * 100) / 100;
  const cR = (v) => G.corpo  === 1 ? v : Math.round(v * G.corpo  * 100) / 100;
  const mE = (v) => G.membro === 1 ? v : Math.round(v * G.membro * 100) / 100;
  const tE = (v) => G.cauda  === 1 ? v : Math.round(v * G.cauda  * 100) / 100;
  /* O chifre é o único que multiplica um número SORTEADO, e por isso é o
     único onde a ordem importa: o `random` corre primeiro, no lugar onde
     sempre correu, e o fator aplica-se ao resultado. Escrever
     `random(20, 35 * f)` teria sido mais curto e teria mudado a cara de
     todos os avatares que já existem — a fila é uma fila, e um número
     tirado de outra gama é outro número. */
  const cH = (v) => G.chifre === 1 ? v : Math.round(v * G.chifre * 100) / 100;
  let s = `<svg viewBox="0 0 200 ${vbH}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
  <defs>
    <filter id="glow${sid}"><feGaussianBlur stdDeviation="${raridade==='Lendário'?'6':'4'}" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="ig${sid}"><feGaussianBlur stdDeviation="2" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="grad${sid}"><stop offset="0%" stop-color="${cor1}" stop-opacity="1"/><stop offset="50%" stop-color="${cor2}" stop-opacity=".9"/><stop offset="100%" stop-color="${corSec}" stop-opacity=".8"/></radialGradient>
    <linearGradient id="lg${sid}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${cor1}" stop-opacity="1"/><stop offset="100%" stop-color="${cor2}" stop-opacity="1"/></linearGradient>
    <radialGradient id="halo${sid}"><stop offset="60%" stop-color="${corBrilho}" stop-opacity="0"/><stop offset="84%" stop-color="${corBrilho}" stop-opacity="1"/><stop offset="100%" stop-color="${corBrilho}" stop-opacity="0"/></radialGradient>
  </defs>
  <g>`;

  /* ════════════════════════════════════════════════════════════════
     A AURA É LUZ, E NÃO UM ANEL

     Eram círculos, e depois elipses, sempre com TRAÇO. Um traço tem de
     caber por fora do bicho, e o bicho ocupa 160 dos 200 de largura: não
     cabia. Ele cruzava-lhe os braços de cada lado e, no corpo inferior,
     atravessava-o de lado a lado.

     A luz não tem esse problema. É um gradiente sem contorno nenhum:
     acende numa banda por fora da silhueta e apaga-se para os dois lados.
     Não há linha para cortar seja o que for, e por isso pode ser tão
     larga quanto for preciso — até sair da moldura, onde simplesmente se
     desvanece.

     ── DOIS DEGRAUS DA MESMA COISA ──

       RARO      um halo
       LENDÁRIO  dois, e mais forte

     É de propósito que é a MESMA coisa duas vezes e não duas coisas
     diferentes: assim o Lendário lê-se como "o mesmo, mas mais", que é o
     que ele é. Duas linguagens diferentes obrigariam o jogador a
     aprender duas, e nenhuma delas lhe diria qual vem primeiro.

     O de fora do Lendário respira em CONTRATEMPO com o de dentro. Dois
     pulsos iguais somam-se e dão um pisca-pisca; desencontrados dão
     qualquer coisa que parece viva.
     ════════════════════════════════════════════════════════════════ */
  const auCY = G.auCY;
  const auRX = 104;
  const auRY = G.auRY;

  /* A banda acesa do gradiente está aos 84% do raio. Com estes tamanhos
     isso dá 87 de meia-largura, e o bicho mais largo que há chega a 80 —
     a luz começa onde ele acaba. */
  const halo = (rx, ry, op, pulso, dur) =>
    `<ellipse cx="100" cy="${auCY}" rx="${rx}" ry="${ry}" fill="url(#halo${sid})" opacity="${op}">` +
    `<animate attributeName="opacity" values="${pulso}" dur="${dur}" repeatCount="indefinite"/></ellipse>`;

  s += `<g class="av-aura">`;
  if(raridade === 'Lendário') s +=
      halo(auRX + 24, auRY + 26, .20, '.20;.30;.20', '4.6s')   // o de fora, lento
    + halo(auRX,      auRY,      .34, '.34;.22;.34', '2.8s');  // o de dentro, em contratempo
  else if(raridade === 'Raro') s +=
      halo(auRX, auRY, .20, '.20;.13;.20', '3.6s');

  s += `</g>`;
  // Asas de fase (fase 3+) — ancoradas no corpo inferior (wdy desloca de y=100 para y=163)
  s += `<g class="av-asa">`;
  if(temAsasFase) {
    if(tipoAsaFase===1) s+=`<path d="M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z" fill="${cor1}" stroke="${corContorno}" stroke-width="1.5" opacity=".72"><animate attributeName="d" values="M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z;M 68 ${100+wdy} Q 47 ${81+wdy} 20 ${60+wdy} Q 32 ${78+wdy} 44 ${90+wdy} Q 54 ${97+wdy} 68 ${102+wdy} Z;M 68 ${100+wdy} Q 48 ${83+wdy} 22 ${62+wdy} Q 34 ${80+wdy} 46 ${92+wdy} Q 56 ${99+wdy} 68 ${104+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 68 ${100+wdy} Q 46 ${86+wdy} 28 ${70+wdy} Q 40 ${82+wdy} 54 ${94+wdy} Z" fill="${corBrilho}" opacity=".20"/><path d="M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z" fill="${cor1}" stroke="${corContorno}" stroke-width="1.5" opacity=".72"><animate attributeName="d" values="M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z;M 132 ${100+wdy} Q 153 ${81+wdy} 180 ${60+wdy} Q 168 ${78+wdy} 156 ${90+wdy} Q 146 ${97+wdy} 132 ${102+wdy} Z;M 132 ${100+wdy} Q 152 ${83+wdy} 178 ${62+wdy} Q 166 ${80+wdy} 154 ${92+wdy} Q 144 ${99+wdy} 132 ${104+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 132 ${100+wdy} Q 154 ${86+wdy} 172 ${70+wdy} Q 160 ${82+wdy} 146 ${94+wdy} Z" fill="${corBrilho}" opacity=".20"/>`;
    else if(tipoAsaFase===2) s+=`<path d="M 65 ${98+wdy} L 38 ${75+wdy} L 20 ${62+wdy} L 28 ${82+wdy} L 44 ${93+wdy} L 60 ${100+wdy} Z" fill="${corSec}" stroke="${cor1}" stroke-width="1.5" opacity=".68"><animate attributeName="opacity" values=".68;.82;.68" dur="2.5s" repeatCount="indefinite"/></path><path d="M 65 ${98+wdy} L 32 ${76+wdy} L 18 ${66+wdy} Z" fill="${corBrilho}" opacity=".22" filter="url(#ig${sid})"/><path d="M 135 ${98+wdy} L 162 ${75+wdy} L 180 ${62+wdy} L 172 ${82+wdy} L 156 ${93+wdy} L 140 ${100+wdy} Z" fill="${corSec}" stroke="${cor1}" stroke-width="1.5" opacity=".68"><animate attributeName="opacity" values=".68;.82;.68" dur="2.5s" repeatCount="indefinite"/></path><path d="M 135 ${98+wdy} L 168 ${76+wdy} L 182 ${66+wdy} Z" fill="${corBrilho}" opacity=".22" filter="url(#ig${sid})"/>`;
    else s+=`<path d="M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z" fill="${cor2}" stroke="${corContorno}" stroke-width="1" opacity=".75"><animate attributeName="d" values="M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z;M 66 ${96+wdy} Q 47 ${80+wdy} 24 ${64+wdy} Q 36 ${78+wdy} 48 ${88+wdy} Q 56 ${93+wdy} 66 ${98+wdy} Z;M 66 ${96+wdy} Q 48 ${82+wdy} 26 ${66+wdy} Q 38 ${80+wdy} 50 ${90+wdy} Q 58 ${95+wdy} 66 ${100+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 66 ${103+wdy} Q 50 ${92+wdy} 34 ${80+wdy} Q 46 ${90+wdy} 58 ${98+wdy} Z" fill="${cor1}" opacity=".50"/><path d="M 66 ${110+wdy} Q 52 ${102+wdy} 40 ${94+wdy} Q 50 ${100+wdy} 62 ${106+wdy} Z" fill="${cor2}" opacity=".35"/><path d="M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z" fill="${cor2}" stroke="${corContorno}" stroke-width="1" opacity=".75"><animate attributeName="d" values="M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z;M 134 ${96+wdy} Q 153 ${80+wdy} 176 ${64+wdy} Q 164 ${78+wdy} 152 ${88+wdy} Q 144 ${93+wdy} 134 ${98+wdy} Z;M 134 ${96+wdy} Q 152 ${82+wdy} 174 ${66+wdy} Q 162 ${80+wdy} 150 ${90+wdy} Q 142 ${95+wdy} 134 ${100+wdy} Z" dur="2.5s" repeatCount="indefinite"/></path><path d="M 134 ${103+wdy} Q 150 ${92+wdy} 166 ${80+wdy} Q 154 ${90+wdy} 142 ${98+wdy} Z" fill="${cor1}" opacity=".50"/><path d="M 134 ${110+wdy} Q 148 ${102+wdy} 160 ${94+wdy} Q 150 ${100+wdy} 138 ${106+wdy} Z" fill="${cor2}" opacity=".35"/>`;
  }

  s += `</g>`;
  // Corpo inferior (fase 2+) — 12% maior para ficar proporcional
  s += `<g class="av-corpo">`;
  if(temCorpoInferior) {
    if(tipoSegmento===1) s+=`<path d="M 80 143 Q 68 164 70 187 Q 79 212 100 216 Q 121 212 130 187 Q 132 164 120 143 Z" fill="url(#grad${sid})" stroke="${corSec}" stroke-width="1.5" opacity=".88"><animate attributeName="opacity" values=".88;.94;.88" dur="3s" repeatCount="indefinite"/></path><ellipse cx="100" cy="183" rx="15" ry="9" fill="${cor2}" opacity=".35" filter="url(#ig${sid})"/>`;
    else if(tipoSegmento===2) s+=`<polygon points="74,143 126,143 136,170 126,198 74,198 64,170" fill="url(#grad${sid})" stroke="${corContorno}" stroke-width="1.5" opacity=".85"><animate attributeName="opacity" values=".85;.92;.85" dur="3s" repeatCount="indefinite"/></polygon><line x1="74" y1="170" x2="126" y2="170" stroke="${corBrilho}" stroke-width="1" opacity=".25"/><ellipse cx="100" cy="170" rx="13" ry="8" fill="${corBrilho}" opacity=".15" filter="url(#ig${sid})"/>`;
    else s+=`<path d="M 84 143 Q 75 162 73 182 Q 77 206 100 211 Q 123 206 127 182 Q 125 162 116 143 Z" fill="url(#grad${sid})" stroke="${corSec}" stroke-width="1.5" opacity=".87"><animate attributeName="opacity" values=".87;.93;.87" dur="3.5s" repeatCount="indefinite"/></path><ellipse cx="100" cy="164" rx="10" ry="6" fill="${corBrilho}" opacity=".18" filter="url(#ig${sid})"/><ellipse cx="100" cy="183" rx="12" ry="7" fill="${corBrilho}" opacity=".18" filter="url(#ig${sid})"/><line x1="100" y1="148" x2="100" y2="204" stroke="${cor1}" stroke-width="1" opacity=".20"/>`;
  }

  s += `</g>`;
  // Cauda
  s += `<g class="av-cauda">`;
  if(temCauda) {
    const cy2 = caudaY0;
    if(tipoCauda===1) s+=`<path d="M 100 ${cy2} Q 80 ${cy2+tE(20)} 70 ${cy2+tE(40)} Q 65 ${cy2+tE(50)} 75 ${cy2+tE(55)}" stroke="${cor2}" stroke-width="10" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 80 ${cy2+tE(20)} 70 ${cy2+tE(40)} Q 65 ${cy2+tE(50)} 75 ${cy2+tE(55)};M 100 ${cy2} Q 85 ${cy2+tE(20)} 72 ${cy2+tE(40)} Q 68 ${cy2+tE(50)} 78 ${cy2+tE(55)};M 100 ${cy2} Q 80 ${cy2+tE(20)} 70 ${cy2+tE(40)} Q 65 ${cy2+tE(50)} 75 ${cy2+tE(55)}" dur="2s" repeatCount="indefinite"/></path>`;
    else if(tipoCauda===2) s+=`<path d="M 100 ${cy2} L 85 ${cy2+tE(30)} L 95 ${cy2+tE(35)} L 80 ${cy2+tE(60)}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"/><polygon points="75,${cy2+tE(60)} 80,${cy2+tE(70)} 85,${cy2+tE(60)}" fill="${corBrilho}" filter="url(#glow${sid})"><animate attributeName="opacity" values=".8;1;.8" dur="1.5s" repeatCount="indefinite"/></polygon>`;
    else if(tipoCauda===3) s+=`<path d="M 100 ${cy2} Q 90 ${cy2+tE(15)} 85 ${cy2+tE(30)} Q 82 ${cy2+tE(40)} 88 ${cy2+tE(48)}" stroke="${cor1}" stroke-width="14" fill="none" opacity=".9" stroke-linecap="round"/><path d="M 100 ${cy2} Q 90 ${cy2+tE(15)} 85 ${cy2+tE(30)} Q 82 ${cy2+tE(40)} 88 ${cy2+tE(48)}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="stroke-width" values="8;10;8" dur="1.5s" repeatCount="indefinite"/></path>`;
    else s+=`<path d="M 100 ${cy2} Q 75 ${cy2+tE(20)} 65 ${cy2+tE(45)}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 75 ${cy2+tE(20)} 65 ${cy2+tE(45)};M 100 ${cy2} Q 72 ${cy2+tE(22)} 62 ${cy2+tE(47)};M 100 ${cy2} Q 75 ${cy2+tE(20)} 65 ${cy2+tE(45)}" dur="2s" repeatCount="indefinite"/></path><path d="M 100 ${cy2} Q 125 ${cy2+tE(20)} 135 ${cy2+tE(45)}" stroke="${cor2}" stroke-width="8" fill="none" opacity=".8" stroke-linecap="round"><animate attributeName="d" values="M 100 ${cy2} Q 125 ${cy2+tE(20)} 135 ${cy2+tE(45)};M 100 ${cy2} Q 128 ${cy2+tE(22)} 138 ${cy2+tE(47)};M 100 ${cy2} Q 125 ${cy2+tE(20)} 135 ${cy2+tE(45)}" dur="2s" repeatCount="indefinite"/></path>`;
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
    const sx=100+(lado*brAnchorR), sy=brAnchorY+off, mx=100+(lado*mE(50)), my=brAnchorY+off+bracoDet[i][0], ex=100+(lado*mE(65)), ey=brAnchorY+off+bracoDet[i][1];
    /* ── O BRAÇO TEM A ESPESSURA QUE TEM (3J.9) ──

       Era `raridade==='Lendário' ? 8 : 6`. Um Lendário tinha o braço um
       terço mais grosso que um Comum com a mesma seed, e ganhava-o no
       dia em que o exame mensal assinasse o papel — anatomia a mudar por
       certificado, que é o que esta série de etapas veio desfazer.

       Seis e não sete nem oito: era o que o Comum e o Raro já tinham,
       portanto a mudança atinge só o Lendário, e só nele. O comprimento
       continua a crescer com a FASE pelo `mE()`, que é legítimo e não se
       toca — idade é crescimento, raridade não é.

       A GARRA, na linha a seguir, fica como estava: a espessura dela
       (3) nunca foi raridade, e a existência dela ainda é. Sai em etapa
       própria. */
    s+=`<path d="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" stroke="${cor2}" stroke-width="6" fill="none" opacity=".7" stroke-linecap="round"><animate attributeName="d" values="M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey};M ${sx} ${sy} Q ${mx} ${my+3} ${ex} ${ey+2};M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}" dur="3s" repeatCount="indefinite"/></path>`;
    /* ── A GARRA SAIU, E NÃO FOI SUBSTITUÍDA (3J.10) ──

       Havia aqui uma `<line>` da ponta do braço para fora, acesa só em
       quem não era Comum:

         if (raridade !== 'Comum') s += <line x1=ex y1=ey x2=ex+lado*8 …

       Era a última peça do corpo que a raridade decidia. Saiu, e saiu
       SEM substituto — o que exige explicação, porque apagar é mais
       fácil do que arranjar e nem sempre é o certo.

       ── PROCUROU-SE UMA FONTE, E NÃO HÁ ──

       A garra não tinha gene, nem nome, nem sorteio próprio, nem classe
       de CSS: era uma linha anónima cuja única razão de existir era a
       raridade. Para a manter sem a raridade teria de vir de outro
       lado, e os candidatos que existiam não servem:

         temAsas      é o único traço sorteado e nunca desenhado, mas é
                      um gene de ASAS. Usá-lo para garras tornava a
                      garra hereditária como asa e inventava uma
                      semântica que ninguém decidiu.
         bracoDet     são as curvaturas do braço. Um limiar sobre elas
                      ("garra se bracoDet[i][0] > 10") é pseudo-genética
                      — parece uma regra e não é nenhuma.
         seed % 2     o mesmo defeito, mais à vista.

       Nenhum deles é uma decisão de design; os três eram maneiras de
       esconder uma regra nova dentro de um número que já existia.

       ── O QUE ISTO DEIXA EM ABERTO ──

       Se o jogo quiser garras, elas precisam de um traço próprio — e
       aí a decisão é de design e não de refatoração: quantos braços a
       têm, se é hereditária, como entra no cruzamento, e sobretudo
       onde entra na fila de sorteios, que é o que não se pode mudar
       depois sem trocar a cara de todos os avatares que já existem.

       Enquanto essa decisão não existir, não há garra. É preferível a
       um gene improvisado que depois ninguém consegue tirar. */
    s+=`</g>`;
  }

  s += `</g>`;
  // Corpo
  s += `<g class="av-corpo">`;
  switch(tipoCorpo){
    case 1: s+=`<circle cx="100" cy="100" r="${cR(45)}" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animate attributeName="r" values="${cR(45)};${cR(46)};${cR(45)}" dur="3s" repeatCount="indefinite"/></circle>`; break;
    case 2: s+=`<ellipse cx="100" cy="100" rx="${cR(35)}" ry="${cR(50)}" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animate attributeName="ry" values="${cR(50)};${cR(52)};${cR(50)}" dur="3s" repeatCount="indefinite"/></ellipse>`; break;
    case 3: s+=`<ellipse cx="100" cy="100" rx="${cR(50)}" ry="${cR(38)}" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animate attributeName="rx" values="${cR(50)};${cR(52)};${cR(50)}" dur="3s" repeatCount="indefinite"/></ellipse>`; break;
    case 4: s+=`<path d="M 100 ${cP(55)} Q ${cP(145)} ${cP(65)} ${cP(148)} 100 Q ${cP(145)} ${cP(135)} 100 ${cP(148)} Q ${cP(55)} ${cP(135)} ${cP(52)} 100 Q ${cP(55)} ${cP(65)} 100 ${cP(55)} Z" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"/>`; break;
    case 5: s+=`<polygon points="100,${cP(58)} ${cP(145)},${cP(132)} ${cP(55)},${cP(132)}" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"/>`; break;
    case 6: s+=`<polygon points="100,${cP(60)} ${cP(130)},${cP(80)} ${cP(130)},${cP(120)} 100,${cP(140)} ${cP(70)},${cP(120)} ${cP(70)},${cP(80)}" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="0 100 100;5 100 100;0 100 100;-5 100 100;0 100 100" dur="6s" repeatCount="indefinite"/></polygon>`; break;
    case 7: s+=`<path d="M 100 ${cP(60)} L ${cP(110)} ${cP(90)} L ${cP(140)} ${cP(95)} L ${cP(115)} ${cP(115)} L ${cP(120)} ${cP(145)} L 100 ${cP(130)} L ${cP(80)} ${cP(145)} L ${cP(85)} ${cP(115)} L ${cP(60)} ${cP(95)} L ${cP(90)} ${cP(90)} Z" fill="url(#grad${sid})" opacity=".95" stroke="${corSec}" stroke-width="2"><animateTransform attributeName="transform" type="rotate" values="0 100 100;10 100 100;0 100 100" dur="4s" repeatCount="indefinite"/></path>`; break;
    case 8: s+=`<polygon points="100,${cP(55)} ${cP(125)},${cP(75)} ${cP(135)},100 ${cP(125)},${cP(125)} 100,${cP(145)} ${cP(75)},${cP(125)} ${cP(65)},100 ${cP(75)},${cP(75)}" fill="url(#grad${sid})" opacity=".95" stroke="${corContorno}" stroke-width="3" filter="url(#glow${sid})"><animate attributeName="opacity" values=".95;1;.95" dur="2s" repeatCount="indefinite"/></polygon>`; break;
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
    const x=75+(i*(50/Math.max(numChifres-1,1))), alt=cH(random(20,35)), larg=cH(random(8,12));
    s+=`<polygon points="${x},70 ${x+larg/2},${70-alt} ${x+larg},70" fill="url(#lg${sid})" opacity=".9" filter="url(#glow${sid})" stroke="${corContorno}" stroke-width="2"><animate attributeName="opacity" values=".9;1;.9" dur="2s" repeatCount="indefinite"/></polygon>`;
  }

  s += `</g>`;
  // Olhos
  s += `<g class="av-olho">`;
  const espac = numOlhos===1 ? 0 : 60/(numOlhos-1);
  for(let i=0;i<numOlhos;i++){
    s+=`<g class="av-olho-un" style="--i:${i}">`;
    const x = numOlhos===1 ? 100 : 70+(i*espac);
    /* ── O OLHO TEM O TAMANHO QUE TEM, E A RARIDADE NÃO OPINA (3J.8) ──

       Era `raridade==='Lendário' ? 14 : raridade==='Raro' ? 12 : 10`, e
       com o `olhoDet` por cima dava três faixas que não se tocavam:

         Comum      9, 10, 11
         Raro      11, 12, 13
         Lendário  13, 14, 15

       Um Lendário tinha o olho uma vez e meia o de um Comum com a mesma
       seed. Isso é anatomia, e anatomia não se conquista num exame
       mensal: o avatar acordava com olhos maiores no dia em que o
       servidor assinasse o papel.

       Doze e não dez nem catorze: é a mediana das três, é o valor que o
       Raro já tinha, e é por isso que o Raro não muda nada com esta
       etapa — um terço dos desenhos do golden continua a bater.

       O `olhoDet[i]` fica onde sempre esteve, e continua a vir da fila
       principal (`random(-1, 1)`, em corpoDaFila). É ele que faz os três
       olhos de um mesmo bicho não serem clones, e isso é identidade: sai
       da seed, como deve. */
    const tb = 12;
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
  /* ── AS MANCHAS SÃO PELE, NÃO SÃO BRILHO (3J.11) ──

     Era `raridade==='Lendário' ? random(4,6) : random(3,5)`, e por isso
     um Lendário tinha em média uma mancha a mais que um Comum com a
     mesma seed. Passou a `random(3,5)` para todos.

     ── PORQUE SÃO IDENTIDADE E NÃO EFEITO ──

     A auditoria da 3J.11 classificou os cinco efeitos que restavam, e
     as manchas foram as únicas a cair do lado do corpo. A prova não é
     de opinião:

       ONDE CAEM   `dx` entre 75 e 125, `dy` entre 80 e 120 — uma caixa
                   de 50×40 centrada em (100,100), que é o corpo. As
                   partículas caem entre 20 e 180: a moldura toda.
       O QUE SÃO   círculos de raio 2 a 4, na cor do bicho, a 25% de
                   opacidade. São marcas na pele.
       O CSS       nenhuma regra as toca. A `av-particula` e a `av-aura`
                   são abafadas quando o avatar adoece ou cai
                   (css/screen.css, css/ui.css) porque são efeitos; a
                   `av-mancha` não é abafada por nada, porque é corpo.
       A CAIXA     medido no browser: tirar as manchas não muda o
                   `getBBox()` em nenhum de 24 casos. Elas estão
                   inteiramente dentro da silhueta.

     ── A FILA NÃO SE MEXEU ──

     `random(4,6)` e `random(3,5)` tiram o MESMO número da fila; o que
     mudava era a gama em que ele caía, e com ela a contagem de manchas
     — e a contagem decide quantos sorteios o laço consome. Como as
     manchas e as partículas são as últimas coisas que o gerador
     desenha, isso não desloca mais nada. É por isso que esta mudança
     cabe aqui e não precisou de etapa própria. */
  const nd = random(3,5);
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
