// ═══════════════════════════════════════════════════════════════════
// AS VANTAGENS — motor Fabula Ultima
//
// Doze, e as doze saem da lista de HABILIDADES DE NPC do manual
// (p. 306-309). Cada entrada diz de qual veio, no campo `manual`,
// porque a habilidade é do manual mas o nome é nosso — a mesma divisão
// de sempre: mecânica não se protege, expressão sim.
//
// ── A REGRA DO DONO DO JOGO ──
//
//   Uma vantagem e uma desvantagem. Sempre.
//
// E a desvantagem NÃO vive aqui: é a COSTURA, o tipo de dano a que o
// avatar é vulnerável (js/ficha-fu.js). Foi uma decisão e vale a pena
// dizer porquê.
//
// O motor antigo tinha onze desvantagens porque tinha uma BOLSA: a
// desvantagem dava pontos, a vantagem custava, e o que sobrava comprava
// as características. Nesta engrenagem não há bolsa nenhuma — os quatro
// dados saem do arranjo que o DNA escolhe, e não se compram. Uma
// desvantagem sem preço para pagar seria só um castigo.
//
// A costura funciona como preço porque é EXPLORÁVEL: o inimigo tem de a
// descobrir e tem de ter com que a atacar. É por isso que a acção de
// ESTUDAR existe no manual, e é por isso que a cor não a denuncia.
//
// ── O LENDÁRIO ESCOLHE ──
//
//   'semDefeito'  fecha a costura e fica só com a vantagem
//   'vantagem'    fica com a costura e ganha uma SEGUNDA
//
// São os dois valores que o jogo já usava (FICHA_ESCOLHAS, em
// js/ficha-3dt.js) e a tela da escolha já sabe mostrar. Um Lendário que
// ainda não escolheu fica com a costura e sem a segunda — está à espera
// dele, e não se decide por ele.
// ═══════════════════════════════════════════════════════════════════

/* ── OS ESTADOS QUE SE PODEM APANHAR ──

   A lista verdadeira vive no FU_ESTADOS do js/combate-fu.js, que carrega
   DEPOIS deste arquivo — e é por isso que ela está aqui escrita outra
   vez, que é a coisa que mais depressa diverge em silêncio.

   Não diverge: o js/combate-fu.js confere as duas ao carregar e grita se
   não baterem certo. É o mesmo remédio que o FU_TIPO_DA_COR já leva
   contra o js/cores.js. */
const FU_ESTADOS_QUE_PEGAM = [
  'atordoado', 'enfurecido', 'envenenado', 'abalado', 'lento', 'fraco',
];

/* A família serve o sorteio: o gene da índole (indoleDoDna, em
   js/nascimento.js) inclina para a família do feitio do avatar. Quem
   nasce para bater tende a sair com uma vantagem de lâmina — tende, não
   tem de. */
const FU_VANTAGENS = {

  // ═══ GUARDA — o que o aguenta de pé ═══

  /* Improved Defenses. O manual dá a escolher +2/+1 ou +1/+2, e quem
     escolhe aqui é o DNA: reforça-se o lado que o avatar já tem melhor.
     Reforçar o pior parece generoso e é desperdício — um avatar que
     aguenta magia mal continua a aguentá-la mal com +2, e deixa de ter
     aquilo em que era bom. */
  guarda_cerrada: { familia: 'guarda', manual: 'Improved Defenses', espelha: 'defesa' },

  /* Improved Hit Points. Dez pontos de vida, que ao nível 5 são um sexto
     do total e ao nível 60 são pouco mais do que um golpe. É de propósito
     que não cresce: o manual dá-a a quem precisa de compensar uma defesa
     baixa cedo. */
  carne_teimosa:  { familia: 'guarda', manual: 'Improved Hit Points', pvMais: 10 },

  /* Status Effect Immunity. Dois estados à escolha, e escolhe o DNA. */
  pele_calada:    { familia: 'guarda', manual: 'Status Effect Immunity', imunes: 2 },

  /* Flying. Um golpe CORPO-A-CORPO não lhe chega — mas a magia chega, e
     o manual prende-a ao chão em duas situações: em crise, e quando
     apanha dano do tipo a que é vulnerável. Aqui isso é a costura, e é
     o que impede esta vantagem de ser um escudo permanente. */
  voo_baixo:      { familia: 'guarda', manual: 'Flying', voo: true },

  // ═══ SUSTENTAÇÃO — o que lhe dá com que continuar ═══

  /* Spellcaster, a metade que nos serve: dez pontos de magia. As magias
     já as tem todas por raridade, portanto o que sobra da habilidade é
     exactamente isto. */
  fonte_funda:    { familia: 'sustentacao', manual: 'Spellcaster', pmMais: 10 },

  /* Reaction, o terceiro exemplo do manual: recupera magia ao ser
     ferido. Cinco por golpe — uma Barragem inteira ao fim de duas
     rondas a apanhar. */
  veia_avida:     { familia: 'sustentacao', manual: 'Reaction', pmAoSofrer: 5 },

  /* Crisis Effect, o segundo exemplo: com a vida em metade ou menos, o
     dano dele passa a ignorar RESISTÊNCIAS. O manual diz que os efeitos
     de crise podem ser fortes porque só disparam quando a criatura já
     está mal — e este é. */
  furia_da_crise: { familia: 'sustentacao', manual: 'Crisis Effect', criseIgnoraRS: true },

  /* Final Act. Ao cair, leva dez pontos de vida de cada inimigo de pé,
     do seu tipo. O manual pede que o dano seja MENOR (p. 93) e dez é o
     que a tabela dele chama menor ao nível a que estes avatares lutam.
     É a única coisa no motor que age depois de o dono estar no chão. */
  ultimo_suspiro: { familia: 'sustentacao', manual: 'Final Act', actoFinal: 10 },

  // ═══ LÂMINA — o que faz o golpe doer ═══

  /* Improved Damage. Cinco a mais, e no GOLPE COMUM e não nas magias: o
     manual manda escolher uma fonte de dano, e escolher o golpe que não
     custa nada é o que dá alguma coisa a um avatar de magia fraca. */
  golpe_pesado:   { familia: 'lamina', manual: 'Improved Damage', danoMaisGolpe: 5 },

  /* Specialized. +3 na precisão, e o DNA escolhe em qual: quem tem os
     dados do corpo maiores especializa-se a bater, quem tem os da mente
     especializa-se a lançar. */
  mira_treinada:  { familia: 'lamina', manual: 'Specialized', espelha: 'precisao' },

  /* Special Attack, o exemplo da vida: o golpe comum devolve-lhe metade
     do que tirou. Não é cura de graça — só ferindo, e só com o golpe
     que não custa PM. */
  sede_funda:     { familia: 'lamina', manual: 'Special Attack', dreno: true },

  /* Special Attack, o exemplo da Defesa Mágica: o golpe comum mira a
     Defesa Mágica em vez da Defesa. Um avatar de corpo a bater onde o
     inimigo tem a mente. */
  golpe_certeiro: { familia: 'lamina', manual: 'Special Attack', golpeNaDefMag: true },
};

const FU_VANTAGENS_IDS = Object.keys(FU_VANTAGENS);

/* ── O ACASO DESTE ARQUIVO ──

   Próprio, e não o do js/ficha-fu.js. Duas razões: a ordem de carga não
   garante que o de lá exista quando este for avaliado, e as duas
   sequências devem ser independentes — se partilhassem o gerador, mudar
   uma conta na ficha mudava a vantagem de toda a gente. */
function _fvRng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x7A11) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function (min, max) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return min + (((s >>> 16) * (max - min + 1)) >>> 16);
  };
}

/* O sorteio com o dedo na balança: escolhe da lista, mas cada entrada
   leva o peso da sua família. Com pesos todos iguais — um avatar sem
   gene de índole — isto é o sorteio limpo, e é por isso que é feito
   assim em vez de com um caminho à parte para cada caso. */
function _fvEscolher(ids, pesos, rnd) {
  if (!ids.length) return null;
  const peso = k => (pesos && pesos[FU_VANTAGENS[k].familia]) || 1;
  const total = ids.reduce((t, k) => t + peso(k), 0);
  let alvo = rnd(1, total);
  for (const k of ids) { alvo -= peso(k); if (alvo <= 0) return k; }
  return ids[ids.length - 1];
}

/* ── AS QUE O DNA TEM DE ACABAR DE ESCREVER ──

   Duas entradas do catálogo deixam uma escolha por fazer, e ela não se
   sorteia: sai dos dados do avatar. Assim a vantagem diz alguma coisa
   sobre ele em vez de lhe ser colada por cima. */
function _fvResolver(id, base, rnd) {
  const v = Object.assign({ id: id }, FU_VANTAGENS[id]);

  if (v.espelha === 'defesa') {
    // reforça o lado forte: quem esquiva melhor esquiva ainda melhor
    const corpo = base.DES >= base.PER;
    v.defesaMais = corpo ? 2 : 1;
    v.defMagMais = corpo ? 1 : 2;
    v.lado = corpo ? 'defesa' : 'defMag';
  }

  if (v.espelha === 'precisao') {
    const corpo = (base.DES + base.VIG) >= (base.PER + base.VON);
    if (corpo) v.precisaoMais = 3; else v.magiaMais = 3;
    v.lado = corpo ? 'golpe' : 'magia';
  }

  if (v.imunes) {
    /* Dois estados distintos. Tirar do saco em vez de sortear duas vezes
       — sortear duas vezes dava o mesmo estado uma vez em cada seis, e
       uma "imunidade a dois estados" que na verdade é a um só é uma
       promessa por cumprir. */
    const saco = FU_ESTADOS_QUE_PEGAM.slice();
    const out = [];
    for (let i = 0; i < v.imunes && saco.length; i++)
      out.push(saco.splice(rnd(0, saco.length - 1), 1)[0]);
    v.imunes = out;
  }

  return v;
}

/* ═══════════════════════════════════════════════════════════════════
   O SORTEIO

   Decidido ao NASCER e nunca mais: só lê o DNA e o seed. O nível não
   entra, e é de propósito — no motor antigo o bolo das vantagens
   dependia dos pontos de hoje, e 1,7% dos avatares TROCAVAM de virtude
   ao subir de nível. Aqui não há nada que possa mudar com o tempo.

   A segunda sorteia-se SEMPRE, mesmo para quem nunca vai poder tê-la.
   Se só saísse para os Lendários, a fila de sorteios mudava de
   comprimento e tudo o que viesse a seguir caía noutro sítio.
   ═══════════════════════════════════════════════════════════════════ */
function fuVantagensDoDna(dna, seed, base, raridade, escolha) {
  const rnd = _fvRng((seed || 0) ^ 0x9C);
  const pesos = (typeof indoleDoDna === 'function') ? indoleDoDna(dna) : null;

  const id1 = _fvEscolher(FU_VANTAGENS_IDS, pesos, rnd) || FU_VANTAGENS_IDS[0];
  const id2 = _fvEscolher(FU_VANTAGENS_IDS.filter(k => k !== id1), pesos, rnd);

  const primeira = _fvResolver(id1, base, rnd);
  // Resolve-se sempre, pela mesma razão por que se sorteia sempre.
  const segunda  = id2 ? _fvResolver(id2, base, rnd) : null;

  const lendario = raridade === 'Lendário';
  return {
    vantagens: (lendario && escolha === 'vantagem' && segunda)
      ? [primeira, segunda] : [primeira],
    /* O que ele TERIA se escolhesse a segunda. A tela da escolha precisa
       de a mostrar para a decisão ser uma decisão — sem isto o jogador
       escolhia às cegas entre fechar a costura e "outra coisa". */
    segundaPossivel: segunda,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   OS DONS: A LISTA ACHATADA

   O motor não percorre a lista das vantagens. Lê este saco, onde os
   números já estão somados e as verdades já estão juntas.

   É deliberado. Um motor que percorre a lista em seis sítios diferentes
   acaba com seis leituras ligeiramente diferentes da mesma coisa — e a
   sétima, escrita daqui a um mês, esquece-se de um caso. Assim há uma
   conta só, num sítio só, e a auditoria confere que o saco diz o mesmo
   que a lista.
   ═══════════════════════════════════════════════════════════════════ */
const FU_DONS_SOMA = ['defesaMais', 'defMagMais', 'pvMais', 'pmMais',
                      'precisaoMais', 'magiaMais', 'danoMaisGolpe',
                      'pmAoSofrer', 'actoFinal'];
const FU_DONS_VERDADE = ['voo', 'criseIgnoraRS', 'dreno', 'golpeNaDefMag'];

function fuDons(vantagens) {
  const d = {};
  for (const k of FU_DONS_SOMA) d[k] = 0;
  for (const k of FU_DONS_VERDADE) d[k] = false;
  d.imunes = [];

  for (const v of (vantagens || [])) {
    for (const k of FU_DONS_SOMA)    if (v[k]) d[k] += v[k] | 0;
    for (const k of FU_DONS_VERDADE) if (v[k]) d[k] = true;
    if (Array.isArray(v.imunes))
      for (const e of v.imunes) if (d.imunes.indexOf(e) === -1) d.imunes.push(e);
  }
  return d;
}

/* ══════════════════════════════════════════════════════════════════
   QUEM PODE ESCOLHER, E ENTRE O QUÊ

   Vieram do js/ficha-3dt.js e ficam aqui porque é aqui que a escolha
   MORA: as duas opções são sobre vantagens, e era o único arquivo do
   motor antigo que ainda as guardava.

   A condição era "doze pontos de ficha ou mais". Passa a ser o nível 27,
   que é exactamente o mesmo avatar — conferido nos sessenta níveis — e
   que é o degrau do Lendário. Ser Ancião e ser Lendário sempre foram a
   mesma coisa; agora dizem-no com o mesmo número.

   A guarda vive AQUI e não na tela porque a tela não é o único caminho
   — é a mesma lição do nome: quem FAZ é que guarda. */
const FICHA_ESCOLHAS = ['vantagem', 'semDefeito'];

function podeEscolherAnciao(slot) {
  const s = slot || (typeof avatar !== 'undefined' ? avatar : null);
  if (!s || s.dead) return false;
  if (s.escolhaAnciao) return false;      // escolhe-se uma vez
  /* O avatar activo tem o nível numa variável viva; os outros têm-no no
     slot. É a mesma distância de sempre entre quem está em campo e quem
     está guardado. */
  const nv = (typeof nivel !== 'undefined' && typeof avatar !== 'undefined' && s === avatar)
    ? nivel : (s.nivel || 1);
  return nv >= FU_NIVEL_LENDARIO;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FU_VANTAGENS, FU_VANTAGENS_IDS, FU_ESTADOS_QUE_PEGAM,
    FICHA_ESCOLHAS, podeEscolherAnciao,
    FU_DONS_SOMA, FU_DONS_VERDADE,
    fuVantagensDoDna, fuDons,
  };
}
