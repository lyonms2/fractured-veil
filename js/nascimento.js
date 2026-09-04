// ═══════════════════════════════════════════════════════════════════
// NASCIMENTO
//
// Até aqui um avatar não nascia: aparecia. Era montado pronto — com a
// raridade do ovo, com as quatro características já no valor final do
// nível 1, e com as três magias que o seed lhe sorteava. Não havia
// instante de nascimento nem registo dele; havia um objecto.
//
// Passa a haver um acto, com uma ordem:
//
//     nascimento → nome → DNA → potencial → atributos iniciais
//                → Comum → nível 1 → só o ataque básico
//
// E esse acto deixa um REGISTO PERMANENTE. O registo escreve-se uma vez
// e nunca mais: é a certidão. O que o avatar vier a ser muda; o que ele
// era ao nascer, não.
//
// ── O QUE MUDA NA ESSÊNCIA DO JOGO ──
//
// Todo o avatar nasce COMUM. A raridade deixa de ser o bilhete que se
// tira e passa a ser o que se chega a ser. Mas a proveniência não se
// perde: o ovo que o gerou fica gravado em `origem`, e é dela que
// continua a depender o que ele vale — os genes que recebe, e a postura
// de ovos, que o api/pool.js já tirava do registo do servidor e não da
// raridade do avatar.
//
// E nasce sem magia nenhuma. Um bebé tem o golpe comum e mais nada; as
// magias chegam ao sair da primeira fase. Isso é uma ponte, não o
// desenho final — a progressão a sério é a tarefa a seguir, e é ela que
// decide quando e como cada magia se ganha.
//
// ── O DNA ──
//
// Diplóide de propósito: dois alelos por característica, e não um valor.
// Um valor só bastava para gerar um avatar — mas não para o cruzar com
// outro. Guardando o par, um alelo alto que não se expressa continua a
// viajar e pode sair no filho, que é o que faz uma linhagem ter surpresas
// em vez de médias. A reprodução não existe ainda; o formato que ela vai
// precisar, existe.
//
//   dominante = max(alelo1, alelo2)      manda na tendência
//   recessivo = min(alelo1, alelo2)      viaja escondido e pesa menos
//
// ── TENDÊNCIA, NÃO RESULTADO ──
//
// O DNA não diz "Força = 5". Não diz número nenhum: diz PARA ONDE este
// avatar puxa. Os pontos que ele ganha ao longo da vida continuam a cair
// um a um num sorteio — o DNA só carrega os dados. Um avatar com vocação
// para a Força costuma ficar forte; não é garantido que fique, e dois
// irmãos com o mesmo DNA acabam diferentes.
//
// Foi de propósito que se apagou o `potencial`. Ele era um tecto — um
// resultado escrito na certidão antes de o avatar ter vivido — e um
// tecto não é uma tendência. Ninguém o lia, e agora ninguém o escreve.
//
// ── O SEXO ──
//
// Também é um par de alelos, e não um campo à parte: XX é fêmea, XY é
// macho. Assim o cruzamento não precisa de regra própria — a mãe só
// tem X para dar, o pai dá X ou Y, e o sexo do filho sai do mesmo
// mecanismo que tudo o resto.
// ═══════════════════════════════════════════════════════════════════

const NASC_CARACS = ['F', 'H', 'R', 'A'];

/* Quantos pontos de alelo a origem paga.
   O ovo Lendário não dá um avatar Lendário — dá genes melhores, e o que
   se faz com eles é do dono. É aqui que a proveniência continua a valer
   alguma coisa depois de todos passarem a nascer Comuns. */
const NASC_ALELOS = {
  'Comum':    { min: 0, max: 3 },
  'Raro':     { min: 1, max: 4 },
  'Lendário': { min: 2, max: 5 },
};

/* O SEXO É UM GENE.

   Par de alelos como os outros. XX fêmea, XY macho, moeda ao ar — e o
   par guarda-se inteiro para o dia em que houver cruzamento: a mãe só
   pode dar X, o pai dá um dos dois, e o sexo do filho cai do mesmo
   sorteio que as outras características. Sem regra à parte. */
const NASC_SEXO_ALELOS = ['X', 'Y'];

/* ── A ÍNDOLE ──

   O DNA inclinava as quatro características e mais nada. As magias, a
   Vantagem e a Desvantagem saíam do seed — sorteio limpo, sem genética
   por trás — e por isso dois irmãos nunca poderiam parecer-se em nada
   além dos números.

   A índole é o gene que trata disso. Três feitios:

     GUARDA   aguenta e protege — defesas, escudos, o que segura o golpe
     FONTE    dura e sustenta — cura, reservas, magia mantida ao turno
     LÂMINA   bate — dano, e o que abre caminho para ele

   Não são classes: um GUARDA não está proibido de nascer com a magia
   mais violenta do elemento dele. É só menos provável — os pesos
   inclinam o sorteio, como inclinam o dos atributos.

   Par de alelos, como tudo o resto: o dominante conta a dobrar e o
   recessivo conta uma vez, portanto um avatar de dois alelos iguais é
   mais extremo que um de dois diferentes. E os dois viajam para os
   filhos. */
const NASC_INDOLES = ['guarda', 'fonte', 'lamina'];

/* Do bruto de uma característica (0..15) para o peso no sorteio (1..6).

   Seis é o peso que a característica de foco já tinha antes de o DNA
   existir, e um é o mínimo: nenhuma característica fica impossível, por
   pior que seja o gene. É assim que isto continua a ser uma tendência —
   um avatar sem jeito nenhum para a Força ainda pode acabar forte, só
   é pouco provável.

   O tecto não é decoração. Sem ele, um DNA extremo dava pesos de 16
   contra 1 e o avatar despejava tudo numa característica só — aí o
   DNA deixava de inclinar e passava a mandar, que é exactamente o que
   não se quer.

   Sobre a distância entre os pesos: medi-a. Com um degrau mais suave
   (dividir a diferença por três) o contraste médio da vocação caía para
   1,6 e os avatares saíam todos parecidos — o achatamento que o foco
   sorteado do seed tinha sido criado para evitar. Um por um dá 4,2, que
   é a mesma pontaria que os pesos antigos (6/3/1/1) tinham. */
const NASC_TENDENCIA_MAX = 6;

/* O gerador do DNA.

   Aceita um seed para ser reproduzível — dois avatares com o mesmo seed
   e a mesma origem têm o mesmo DNA, o que é o que permite a um teste
   verificar-se. Sem seed usa o acaso. */
function _nascRng(seed) {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}

function gerarDna(elemento, origem, seed) {
  const faixa = NASC_ALELOS[origem] || NASC_ALELOS['Comum'];
  const rnd = _nascRng(seed);
  const alelo = () => faixa.min + Math.floor(rnd() * (faixa.max - faixa.min + 1));
  const genes = {};
  for (const k of NASC_CARACS) genes[k] = [alelo(), alelo()];

  /* ── A COR TAMBEM E UM GENE ──

     Duas, na verdade: o primeiro alelo e a cor principal e o segundo
     a secundaria. Podiam ser dois campos soltos na certidao, mas no
     DNA e que servem para alguma coisa — um filho recebe um alelo de
     cada lado e mostra uma mistura que nenhum dos pais tinha.

     Sorteadas em toda a roda, sem olhar a origem: a raridade do ovo
     paga forca e nao beleza. Um Comum pode nascer com um par de
     cores que um Lendario nao teve. */
  const nCores = (typeof CORES_RODA !== 'undefined') ? CORES_RODA.length : 12;
  genes.cor = [Math.floor(rnd() * nCores), Math.floor(rnd() * nCores)];

  /* O par sexual. O primeiro alelo é sempre X — é o que a mãe dá — e o
     segundo decide. Guardar os dois em vez de guardar "macho" faz o
     cruzamento sair de graça mais tarde. */
  const [X, Y] = NASC_SEXO_ALELOS;
  genes.sexo = [X, rnd() < 0.5 ? X : Y];

  // O feitio. Dois alelos, sorteados nas três índoles.
  const n = NASC_INDOLES.length;
  genes.indole = [Math.floor(rnd() * n), Math.floor(rnd() * n)];

  return { v: 2, elemento: elemento || 'Fogo', genes };
}

/* A TENDÊNCIA.

   O que estes genes puxam, e não o que garantem. Sai em pesos de sorteio
   — quanto maior o peso de uma característica, mais vezes ela ganha os
   pontos que o avatar vai recebendo ao longo da vida.

   O dominante conta a dobrar e o recessivo conta uma vez. Isso é o que
   faz um alelo escondido ainda inclinar alguma coisa em vez de não
   servir para nada até ao dia em que sair num filho.

   Os pesos são RELATIVOS: a característica mais fraca do avatar fica
   sempre em 1 e as outras medem-se a partir dela. Assim a vocação de um
   avatar é a mesma coisa venha ele de que ovo vier — a proveniência
   não compra feitio, e um Comum pode ter uma vocação tão marcada como
   um Lendário. */
function tendenciaDoDna(dna) {
  const bruto = {};
  for (const k of NASC_CARACS) {
    const par = (dna && dna.genes && dna.genes[k]) || [0, 0];
    bruto[k] = 2 * Math.max(par[0], par[1]) + Math.min(par[0], par[1]);
  }
  const menor = Math.min.apply(null, NASC_CARACS.map(k => bruto[k]));
  const t = {};
  for (const k of NASC_CARACS) {
    t[k] = Math.min(NASC_TENDENCIA_MAX, 1 + (bruto[k] - menor));
  }
  return t;
}

/* Para onde este avatar puxa, por ordem. Só para mostrar — quem calcula
   lê os pesos. Empates ficam pela ordem F H R A, que é estável. */
function vocacaoDoDna(dna) {
  const t = tendenciaDoDna(dna);
  return NASC_CARACS.slice().sort((a, b) => t[b] - t[a] || NASC_CARACS.indexOf(a) - NASC_CARACS.indexOf(b));
}

/* Os pesos de cada índole, para o sorteio.

   Cada índole começa em 1 — nenhuma fica impossível, por mais marcado
   que seja o feitio — e o par acrescenta: o dominante vale dois e o
   recessivo vale um. Um avatar [lâmina, lâmina] fica em 1/1/4; um
   [lâmina, guarda] fica em 3/1/2. O primeiro é um bruto; o segundo é
   sobretudo um guarda que também bate.

   Sem gene — um avatar do jogo antigo — devolve pesos iguais, que é o
   sorteio limpo de sempre. */
function indoleDoDna(dna) {
  const par = dna && dna.genes && dna.genes.indole;
  const p = {};
  for (const k of NASC_INDOLES) p[k] = 1;
  if (!Array.isArray(par)) return p;
  const dom = NASC_INDOLES[par[0] % NASC_INDOLES.length];
  const rec = NASC_INDOLES[par[1] % NASC_INDOLES.length];
  p[dom] += 2;
  p[rec] += 1;
  return p;
}

/* A índole que mais pesa, para se poder mostrar. Empates ficam pela
   ordem guarda–fonte–lâmina, que é estável. */
function indoleDominante(dna) {
  const p = indoleDoDna(dna);
  return NASC_INDOLES.reduce((a, b) => p[b] > p[a] ? b : a);
}

function indoleDe(slot) {
  const dna = slot && slot.nascimento && slot.nascimento.dna;
  return dna ? indoleDoDna(dna) : null;
}

/* O sexo, lido do par. Um DNA da primeira versão não tem o gene — e
   nesse caso não se inventa nada ao acaso: tira-se do seed, que nunca
   muda, para o avatar ter sempre o mesmo sexo em qualquer ecrã. */
function sexoDoDna(dna, seed) {
  const par = dna && dna.genes && dna.genes.sexo;
  if (Array.isArray(par)) return (par[0] === 'Y' || par[1] === 'Y') ? 'M' : 'F';
  return _sexoDoSeed(seed);
}

function _sexoDoSeed(seed) {
  let x = ((Math.abs(seed | 0) ^ 0x5f37) >>> 0);
  x = Math.imul(x ^ (x >>> 15), 0x2C1B3C6D) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return (x & 1) ? 'M' : 'F';
}

// O que um alelo escondido carrega. Não é usado no combate — é o que a
// reprodução vai ler.
function recessivosDoDna(dna) {
  const r = {};
  for (const k of NASC_CARACS) {
    const par = (dna && dna.genes && dna.genes[k]) || [0, 0];
    r[k] = Math.min(par[0], par[1]);
  }
  return r;
}

/* Uma forma curta e legível do DNA, para se poder mostrar e comparar.
   Cada característica em dois dígitos: dominante e recessivo, mais o
   par sexual ao fim.
      F31·H42·R20·A33·XY
   Não é o DNA — é como se lê. O que conta é o objecto. */
function dnaLegivel(dna) {
  if (!dna || !dna.genes) return '—';
  const partes = NASC_CARACS.map(k => {
    const par = dna.genes[k] || [0, 0];
    return k + Math.max(par[0], par[1]) + Math.min(par[0], par[1]);
  });
  const sx = dna.genes.sexo;
  if (Array.isArray(sx)) partes.push(sx.join(''));
  return partes.join('·');
}

// ═══════════════════════════════════════════════════════════════════
// O ACTO
//
// Corre a ordem inteira e devolve a certidão. Não toca em nada: quem
// chama é que a põe no avatar. Assim pode ser testada sozinha, e o
// caminho de escrita fica num sítio só.
// ═══════════════════════════════════════════════════════════════════
function nascer(opts) {
  const o = opts || {};
  const elemento = o.elemento || 'Fogo';
  // A origem é a raridade do ovo consumido — ou Comum, na invocação, que
  // não consome ovo nenhum.
  const origem = NASC_ALELOS[o.origem] ? o.origem : 'Comum';

  const dna = gerarDna(elemento, origem, o.seed);

  return {
    v:         1,
    em:        Date.now(),
    // A proveniência. Nunca muda, e é ela que o servidor confere quando
    // o avatar vai à venda — a raridade ATUAL já não serve para isso,
    // porque toda a gente nasce Comum.
    origem,
    dna,
    /* O sexo, expresso. Copiado do DNA para não ser preciso ir lá dentro
       só para saber se é macho ou fêmea — e porque nunca muda.

       A TENDÊNCIA NÃO SE COPIA PARA AQUI. É uma leitura dos genes, e uma
       leitura guardada é uma segunda cópia à espera de divergir da
       primeira. Quem a quiser chama tendenciaDoDna(dna). */
    sexo: sexoDoDna(dna, o.seed),
    // O feitio, expresso. Como o sexo: copia-se por ser um nome curto
    // que a interface quer dizer, e não uma conta que possa divergir.
    indole: indoleDominante(dna),
    // As cores expressas, copiadas do DNA para não ser preciso ir lá
    // dentro só para saber de que cor ele nasceu.
    corPrincipal:  dna.genes.cor ? dna.genes.cor[0] : 0,
    corSecundaria: dna.genes.cor ? dna.genes.cor[1] : 0,
    // O estado com que se começa, e que dá nome a este passo todo.
    raridade:  'Comum',
    nivel:     1,
    // Um bebé tem o golpe comum e mais nada.
    magias:    [],
  };
}

/* Põe a certidão no avatar, uma vez.

   Devolve false se já lá estava. Um registo de nascimento que se
   reescreve não é um registo — e a única forma de garantir isso é a
   escrita passar sempre por aqui.

   O congelamento não sobrevive a uma ida ao servidor (o JSON descongela),
   mas apanha durante a sessão quem lhe tente mexer, que é onde os enganos
   acontecem. */
function registarNascimento(slot, opts) {
  if (!slot || typeof slot !== 'object') return false;
  if (slot.nascimento) return false;
  slot.nascimento = Object.freeze(nascer(opts));
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// O QUE A CERTIDÃO PASSA A MANDAR
// ═══════════════════════════════════════════════════════════════════

// A proveniência, para quem tenha nascido depois disto existir. Quem
// nasceu antes não tem certidão, e aí a raridade que traz é a origem —
// era assim que o jogo funcionava.
function origemDe(slot) {
  if (!slot) return 'Comum';
  return (slot.nascimento && slot.nascimento.origem) || slot.raridade || 'Comum';
}

/* O sexo do avatar.

   Quem nasceu antes disto existir não tem gene sexual nenhum — e não se
   lhe sorteia um agora, que mudaria de sessão para sessão. Tira-se do
   seed, que é dele desde sempre e nunca muda. */
function sexoDe(slot) {
  if (!slot) return 'F';
  const n = slot.nascimento;
  if (n && n.sexo) return n.sexo;
  if (n && n.dna)  return sexoDoDna(n.dna, slot.seed);
  return _sexoDoSeed(slot.seed);
}

/* A tendência do avatar, ou nada.

   Devolve null para quem não tem certidão: esse cresce como sempre
   cresceu, pelo seed, e não se lhe vai remexer a ficha por causa de
   genes que ele nunca teve. */
function tendenciaDe(slot) {
  const dna = slot && slot.nascimento && slot.nascimento.dna;
  return dna ? tendenciaDoDna(dna) : null;
}

/* Um bebé só tem o golpe comum.

   A fase 0 são os níveis 1 a 4 (faseFromNivel, em js/state.js) — o mesmo
   limiar que o jogo já usa para dizer que a criatura ainda é nova. As
   magias entram ao sair dela.

   Isto é uma ponte para o jogo não ficar com avatares que nunca terão
   magia nenhuma enquanto a progressão não chega. A tarefa da progressão
   substitui esta linha por uma regra a sério: qual magia, quando, e a
   troco de quê. */
function ehBebe(slot) {
  if (!slot) return false;
  const nv = slot.nivel || 1;
  /* Pedia certidão, para não mudar a ficha a quem nasceu antes de ela
     existir. Já não pede: com o repertório a crescer por etapas
     (MAGIA_ESCADA, em js/magias.js), ter duas regras — uma para os
     avatares novos e outra para os antigos — era garantir que uma delas
     apodrecia sem ninguém dar por isso. Ser bebé é estar na fase 0, e
     mais nada. */
  return (typeof faseFromNivel === 'function') ? faseFromNivel(nv) === 0 : nv < 5;
}
