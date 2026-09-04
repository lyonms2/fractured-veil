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
//   potencial = max(alelo1, alelo2)      o dominante decide o tecto
//   recessivo = min(alelo1, alelo2)      viaja escondido
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

/* Um bebé nasce com um terço do que pode vir a ser, arredondado para
   baixo, e nunca abaixo de zero. Não é uma constante escolhida ao acaso:
   com um terço, um recém-nascido fica claramente aquém de um avatar
   crescido — que é o que "bebé" tem de querer dizer — sem ficar em zero
   absoluto, que o tornaria impossível de jogar. */
const NASC_FRACAO_INICIAL = 3;

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

  return { v: 1, elemento: elemento || 'Fogo', genes };
}

// O tecto que estes genes permitem. O alelo dominante decide; o outro
// fica guardado no DNA para poder sair num filho.
function potencialDoDna(dna) {
  const p = {};
  for (const k of NASC_CARACS) {
    const par = (dna && dna.genes && dna.genes[k]) || [0, 0];
    p[k] = Math.max(par[0], par[1]);
  }
  return p;
}

// Com que atributos se começa. Longe do potencial, que é o ponto.
function atributosIniciais(potencial) {
  const a = {};
  for (const k of NASC_CARACS) {
    a[k] = Math.max(0, Math.floor((potencial[k] || 0) / NASC_FRACAO_INICIAL));
  }
  return a;
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
   Cada característica em dois dígitos: dominante e recessivo.
      F31·H42·R20·A33 · Fogo
   Não é o DNA — é como se lê. O que conta é o objecto. */
function dnaLegivel(dna) {
  if (!dna || !dna.genes) return '—';
  const partes = NASC_CARACS.map(k => {
    const par = dna.genes[k] || [0, 0];
    return k + Math.max(par[0], par[1]) + Math.min(par[0], par[1]);
  });
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

  const dna       = gerarDna(elemento, origem, o.seed);
  const potencial = potencialDoDna(dna);
  const inicial   = atributosIniciais(potencial);

  return {
    v:         1,
    em:        Date.now(),
    // A proveniência. Nunca muda, e é ela que o servidor confere quando
    // o avatar vai à venda — a raridade ATUAL já não serve para isso,
    // porque toda a gente nasce Comum.
    origem,
    dna,
    potencial,
    inicial,
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

/* Um bebé só tem o golpe comum.

   A fase 0 são os níveis 1 a 4 (faseFromNivel, em js/state.js) — o mesmo
   limiar que o jogo já usa para dizer que a criatura ainda é nova. As
   magias entram ao sair dela.

   Isto é uma ponte para o jogo não ficar com avatares que nunca terão
   magia nenhuma enquanto a progressão não chega. A tarefa da progressão
   substitui esta linha por uma regra a sério: qual magia, quando, e a
   troco de quê. */
function ehBebe(slot) {
  if (!slot || !slot.nascimento) return false;
  const nv = slot.nivel || 1;
  return (typeof faseFromNivel === 'function') ? faseFromNivel(nv) === 0 : nv < 5;
}
