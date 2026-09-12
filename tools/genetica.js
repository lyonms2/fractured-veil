// ═══════════════════════════════════════════════════════════════════
// GENÉTICA — o DNA é uma tendência ou um resultado?
//
// Uma pergunta só, feita de quatro maneiras:
//
//   1. o sexo sai meio a meio, e nunca muda para o mesmo avatar
//   2. a tendência inclina o crescimento — quem tem vocação para a
//      Força acaba mais forte, EM MÉDIA
//   3. mas não o garante: dois avatares com o MESMO DNA e seeds
//      diferentes acabam diferentes
//   4. e nada disto mexeu no orçamento: os pontos totais são os mesmos
//      que eram antes de o DNA mandar nos pesos
//
// Correr:  node tools/genetica.js
// ═══════════════════════════════════════════════════════════════════
/* ── DE ONDE VEM O QUE SE MEDE ──

   Era o tools/auditoria-base.js, que colava oito arquivos do 3D&T num
   `new Function` e devolvia tudo. Saiu com o motor.

   Agora é o api/_genetica.js, que é o carregador do SERVIDOR: carrega os
   mesmos módulos que o navegador carrega e põe-nos no global. Auditar
   pelo carregador de produção em vez de por um montado à mão tem uma
   vantagem que não é pequena — se um dia um arquivo deixar de ser
   carregado lá, esta ferramenta dá por isso. */
require('../api/_genetica.js');
const M = global;

// Os quatro do motor novo. Eram F, H, R e A; o DNA guarda-os com esses
// nomes ainda (FU_GENE_DO_ATRIB, em js/ficha-fu.js) e só a leitura mudou.
const ATRIBS = M.FU_ATRIBS;
const N = 20000;

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK   ', titulo.padEnd(52), '· ' + detalhe); }
  else      { falhou++; console.log('  FALHOU', titulo.padEnd(51), '· ' + detalhe); }
}
function titulo(txt) { console.log('\n─── ' + txt + ' ' + '─'.repeat(Math.max(0, 56 - txt.length))); }

// Um avatar nascido, pronto a ser lido.
function nascido(seed, origem) {
  const slot = { raridade: 'Comum', elemento: 'Fogo', seed, nivel: 1 };
  M.registarNascimento(slot, { origem: origem || 'Comum', seed });
  return slot;
}

// ═══════════════════════════════════════════════════════════════════
titulo('O SEXO');

let machos = 0;
const sexos = new Map();
for (let i = 0; i < N; i++) {
  const s = nascido(i * 31 + 7);
  const sx = M.sexoDe(s);
  if (sx === 'M') machos++;
  sexos.set(i, sx);
}
const pct = machos / N * 100;
ok(Math.abs(pct - 50) < 2, 'macho e fêmea saem meio a meio',
   pct.toFixed(1) + '% machos em ' + N.toLocaleString('pt-BR'));

// O mesmo avatar, lido dez vezes, tem de dar sempre o mesmo.
let instavel = 0;
for (let i = 0; i < 2000; i++) {
  const s = nascido(i * 31 + 7);
  for (let k = 0; k < 10; k++) if (M.sexoDe(s) !== sexos.get(i)) instavel++;
}
ok(instavel === 0, 'o sexo não muda de leitura para leitura', instavel + ' variações em 20.000 leituras');

// O avatar do jogo antigo, sem certidão nenhuma.
const velho = { raridade: 'Raro', elemento: 'Água', seed: 4242, nivel: 12 };
const sxVelho = M.sexoDe(velho);
let velhoInstavel = 0;
for (let k = 0; k < 500; k++) if (M.sexoDe({ ...velho }) !== sxVelho) velhoInstavel++;
ok(velhoInstavel === 0 && (sxVelho === 'M' || sxVelho === 'F'),
   'o avatar antigo também tem sexo, tirado do seed', sxVelho + ', estável em 500 leituras');

// O par guarda-se inteiro — é dele que o cruzamento vai viver.
const comPar = nascido(99).nascimento.dna.genes.sexo;
ok(Array.isArray(comPar) && comPar[0] === 'X' && (comPar[1] === 'X' || comPar[1] === 'Y'),
   'o par sexual fica guardado, e não só o resultado', comPar.join(''));

// ═════════════════════════════════════════════════════════════════
titulo('A TENDÊNCIA INCLINA');

/* ── A MESMA PERGUNTA, OUTRA ENGRENAGEM ──

   Antes: o DNA inclinava para onde caíam os PONTOS de ficha, e media-se
   se quem tinha vocação para a Força acabava mais forte.

   Agora não há pontos. O DNA decide qual dos quatro atributos leva o
   dado MAIOR (fuOrdemDosAtributos, em js/ficha-fu.js), e a pergunta é a
   mesma dita noutra língua: o gene com a soma mais alta fica com o maior
   dado?

   Aqui não é "em média" — é sempre, por construção, e por isso a barra
   é alta. O acaso só entra nos EMPATES, e é a secção seguinte que o
   mede. */
let coroou = 0, empates = 0, nTend = 0;
for (let i = 0; i < N; i++) {
  const s = nascido(i * 17 + 3);
  const dna = s.nascimento.dna;
  const f = M.fuFicha({ seed: s.seed, nivel: 35, nascimento: s.nascimento });

  const somas = ATRIBS.map(a => [a, M.fuSomaDoGene(dna, M.FU_GENE_DO_ATRIB[a])]);
  const ordenadas = somas.slice().sort((x, y) => y[1] - x[1]);
  nTend++;
  // Um empate no topo não tem resposta certa, e contá-lo seria inventar
  // um erro. Conta-se à parte.
  if (ordenadas[0][1] === ordenadas[1][1]) { empates++; continue; }

  /* PELA ORDEM, e não pelo maior dado.

     Medi primeiro "qual atributo tem o dado maior" e deu 75%. Não era o
     motor: 44% dos arranjos têm EMPATE no topo dos dados — o
     especialista é 10·10·6·6 e o equilibrado é 8·8·8·8 — e nesses o meu
     `reduce` devolvia o primeiro da lista FU_ATRIBS em vez do primeiro da
     ordem. Estava a medir a ordem do meu array.

     A pergunta certa é sobre a ORDEM, que é onde a decisão mora: o gene
     de soma mais alta fica em primeiro lugar, e é o primeiro lugar que
     recebe o maior dado do arranjo. */
  if (f.ordem[0] === ordenadas[0][0]) coroou++;
}
const semEmpate = nTend - empates;
const pctCoroa = coroou / Math.max(1, semEmpate) * 100;
ok(pctCoroa > 99.9, 'o gene mais forte fica em primeiro lugar',
   pctCoroa.toFixed(1) + '% de ' + semEmpate.toLocaleString('pt-BR') + ' sem empate');

// e o primeiro lugar recebe mesmo o maior dado que o arranjo tem
let primeiroMenor = 0;
for (let i = 0; i < 3000; i++) {
  const s = nascido(i * 41 + 9);
  const f = M.fuFicha({ seed: s.seed, nivel: 35, nascimento: s.nascimento });
  const maior = Math.max.apply(null, ATRIBS.map(a => f[a]));
  if (f[f.ordem[0]] !== maior) primeiroMenor++;
}
ok(primeiroMenor === 0, 'e o primeiro lugar leva o maior dado do arranjo',
   '3.000 avatares · ' + primeiroMenor + ' fora');
ok(empates / nTend < 0.5, 'e há empates, mas não são a regra',
   (empates / nTend * 100).toFixed(1) + '% com empate no topo');

// ═════════════════════════════════════════════════════════════════
titulo('MAS NÃO GARANTE');

/* Dois avatares com o MESMO DNA e seeds diferentes têm de acabar
   diferentes — senão o seed não serve para nada e dois irmãos são
   gémeos idênticos.

   No motor novo a diferença entra por dois sítios: o desempate da ORDEM
   dos atributos, e a COSTURA, que se sorteia pelo seed. O arranjo, esse,
   sai só do DNA — e é suposto: é a parte que se herda. */
const molde = nascido(12345).nascimento;
const fichas = [];
for (let i = 0; i < 2000; i++)
  fichas.push(M.fuFicha({ seed: i * 7 + 1, nivel: 35, nascimento: molde }));

/* O seed só desempata. Um DNA sem empates nas somas dá sempre a mesma
   ordem — e é suposto: a ordem é herança, não acaso.

   Afirmei primeiro que ela variava, e falhou com 1 ordem em 2.000. Era a
   afirmação que estava errada: este molde não tem empate nenhum. O que
   se confere é o que o seed FAZ — desempatar quando há empate. */
const ordens = new Set(fichas.map(f => f.ordem.join('/')));
const somasDoMolde = ATRIBS.map(a => M.fuSomaDoGene(molde.dna, M.FU_GENE_DO_ATRIB[a]));
const temEmpate = new Set(somasDoMolde).size < ATRIBS.length;
ok(ordens.size === (temEmpate ? ordens.size : 1),
   temEmpate ? 'com empate nas somas, o seed decide a ordem'
             : 'sem empate nas somas, a ordem é só do DNA',
   ordens.size + ' ordem(ns) em 2.000 irmãos · somas ' + somasDoMolde.join('/'));

/* E um molde COM empate, fabricado de propósito: aí o seed tem de mexer.
   Sem esta metade, a linha acima passava com o desempate avariado. */
const gemeo = JSON.parse(JSON.stringify(molde));
for (const a of ATRIBS) gemeo.dna.genes[M.FU_GENE_DO_ATRIB[a]] = [3, 3];
const ordensGemeo = new Set();
for (let i = 0; i < 500; i++)
  ordensGemeo.add(M.fuFicha({ seed: i * 7 + 1, nivel: 35, nascimento: gemeo }).ordem.join('/'));
ok(ordensGemeo.size > 4, 'com as quatro somas iguais, o seed decide tudo',
   ordensGemeo.size + ' ordens distintas em 500 seeds');

const costuras = new Set(fichas.map(f => f.costura));
ok(costuras.size > 3, 'e costuras diferentes', costuras.size + ' costuras distintas');

const arranjos = new Set(fichas.map(f => f.arranjo));
ok(arranjos.size === 1, 'mas o arranjo é do DNA, e não do seed',
   'os 2.000 irmãos são todos ' + [...arranjos][0]);

// ═════════════════════════════════════════════════════════════════
titulo('O ORÇAMENTO NÃO SE MEXEU');

/* A pergunta sobreviveu à troca de motor quase intacta: o DNA DISTRIBUI,
   e nunca cria nem destrói.

   Antes media-se em pontos de ficha. Agora mede-se nos dados: os quatro
   arranjos possíveis somam todos o mesmo número de faces. Um DNA que
   desse um arranjo mais gordo do que outro seria um DNA a dar força de
   graça — e a escolha do arranjo deixaria de ser uma escolha. */
const somasDosArranjos = M.FU_ARRANJOS.map(a => a.dados.reduce((t, d) => t + d, 0));
ok(new Set(somasDosArranjos).size === 1,
   'os quatro arranjos somam todos o mesmo',
   M.FU_ARRANJOS.map((a, k) => a.id + ' ' + somasDosArranjos[k]).join(' · '));

let fora = 0, nArr = 0;
for (let i = 0; i < 5000; i++) {
  const s = nascido(i * 13 + 5);
  const f = M.fuFicha({ seed: s.seed, nivel: 35, nascimento: s.nascimento });
  const soma = ATRIBS.reduce((t, a) => t + f[a], 0);
  if (soma !== somasDosArranjos[0]) fora++;
  nArr++;
}
ok(fora === 0, 'e nenhum avatar sai com mais faces do que isso',
   nArr.toLocaleString('pt-BR') + ' avatares, todos com ' + somasDosArranjos[0]);

// ═════════════════════════════════════════════════════════════════
titulo('A PROVENIÊNCIA');

/* ── E AQUI ESTÁ UMA DECISÃO POR TOMAR ──

   A raridade do OVO de onde o avatar veio — Comum, Raro, Lendário —
   escolhe as faixas dos alelos (gerarDna, em js/nascimento.js). No motor
   antigo isso mexia nos pontos.

   Neste, não mexe em NADA, e esta secção existe para o dizer alto em vez
   de o deixar escondido. A razão é aritmética: as faixas têm a mesma
   largura nas três origens, o arranjo lê o ESPALHO das somas (máximo
   menos mínimo), e uma constante somada aos dois lados cancela-se.

   A verificação afirma o que É verdade hoje. No dia em que a origem
   passar a pesar — o manual tem o degrau de +1 tamanho de dado para
   isso — esta linha falha, e é exactamente assim que ela deve avisar. */
const porOrigem = {};
for (const origem of ['Comum', 'Raro', 'Lendário']) {
  const contas = { arranjos: {}, soma: 0, n: 0 };
  for (let i = 0; i < 4000; i++) {
    const s = nascido(i * 23 + 3, origem);
    const f = M.fuFicha({ seed: s.seed, nivel: 35, nascimento: s.nascimento });
    contas.arranjos[f.arranjo] = (contas.arranjos[f.arranjo] || 0) + 1;
    contas.soma += ATRIBS.reduce((t, a) => t + f[a], 0);
    contas.n++;
  }
  porOrigem[origem] = contas;
  console.log('        ' + origem.padEnd(10)
    + Object.entries(contas.arranjos).map(([k, v]) =>
        k + ' ' + Math.round(v / contas.n * 100) + '%').join('  '));
}
const assinaturas = Object.values(porOrigem).map(c =>
  Object.keys(c.arranjos).sort().map(k => k + ':' + c.arranjos[k]).join(','));
ok(new Set(assinaturas).size === 1,
   'a origem do ovo NÃO muda a ficha — nem um arranjo',
   'as três origens dão exactamente a mesma distribuição');

// ═════════════════════════════════════════════════════════════════
titulo('A ÍNDOLE');

/* O feitio do DNA inclina a VANTAGEM, e o js/vantagens-fu.js diz que
   inclina sem decidir. Aqui mede-se o efeito visto de fora: um avatar de
   feitio lâmina sai mais vezes com uma vantagem de lâmina do que um de
   feitio guarda.

   É uma segunda opinião sobre o que o tools/auditoria-dons.js já mede —
   e de propósito: aquele pergunta ao sorteio, este pergunta ao AVATAR
   NASCIDO, passando pelo nascimento, pela certidão e pela ficha. Se
   alguma dessas pontes se partir, aquele continua verde e este não. */
const porIndole = {};
for (let seed = 1; seed <= 12000; seed++) {
  const s = nascido(seed * 3 + 1);
  const ind = M.indoleDominante(s.nascimento.dna);
  const f = M.fuFicha({ seed: s.seed, nivel: 35, nascimento: s.nascimento });
  const fam = M.FU_VANTAGENS[f.vantagens[0].id].familia;
  porIndole[ind] = porIndole[ind] || { n: 0, propria: 0 };
  porIndole[ind].n++;
  if (fam === ind) porIndole[ind].propria++;
}
for (const [ind, c] of Object.entries(porIndole)) {
  const p = c.propria / c.n * 100;
  ok(p > 40 && p < 90, 'o feitio ' + ind + ' inclina, e não decide',
     p.toFixed(0) + '% de vantagens da própria família em ' + c.n.toLocaleString('pt-BR'));
}
ok(Object.keys(porIndole).length === 3, 'os três feitios aparecem',
   Object.keys(porIndole).join(', '));

// ══════════════════════════════════════════════════════════════════
titulo('A HERANÇA NÃO TEM LADO PREFERIDO');

/* Três genes leem a POSIÇÃO do alelo e não o valor — a índole (par[0]
   domina), o vigor (par[0] é o forte) e a cor (par[0] é a principal). O
   cruzamento punha sempre a mãe em par[0], e por isso o feitio do pai
   nunca mandava, o vigor dele nunca era o forte e a cor dele nunca era a
   principal. Medido antes da emenda: 2000 em 2000.

   Isto nunca apareceria numa média — os números do filho ficavam certos,
   só vinham todos do mesmo lado. Para o ver é preciso cruzar dois pais
   OPOSTOS e trocar-lhes a ordem. */
{
  const I = M.NASC_INDOLES, L = I.indexOf('lamina'), G = I.indexOf('guarda');
  const quem = (ind, vig, cor, sx) => ({ genes: {
    F: [3, 0], H: [0, 0], R: [0, 0], A: [0, 0],
    indole: ind, vigor: vig, cor: cor, sexo: sx } });
  const mae = quem([L, L], [0, 1], [6, 6], ['X', 'X']);   // lâmina, cor 6
  const pai = quem([G, G], [2, 3], [2, 2], ['X', 'Y']);   // guarda, cor 2

  // Sementes como o jogo as faz: grandes, a andar com o relógio.
  const SEM = s => (1700000000 + s) >>> 0;
  const NC = 4000;
  const conta = (a, b, ler) => {
    const c = {};
    for (let s = 1; s <= NC; s++) { const k = ler(M.cruzarDna(a, b, SEM(s))); c[k] = (c[k] || 0) + 1; }
    return c;
  };
  const pct = (c, k) => ((c[k] || 0) / NC * 100);

  const iMP = conta(mae, pai, d => M.indoleDominante(d));
  const iPM = conta(pai, mae, d => M.indoleDominante(d));
  ok(Math.abs(pct(iMP, 'lamina') - 50) < 4 && Math.abs(pct(iPM, 'lamina') - 50) < 4,
     'o feitio do pai manda tanto como o da mãe',
     'mãe lâmina → ' + pct(iMP, 'lamina').toFixed(1) + '% · pai lâmina → ' +
     pct(iPM, 'lamina').toFixed(1) + '%');

  const cMP = conta(mae, pai, d => M.coresDoAvatar({ dna: d }).principal);
  ok(Math.abs(pct(cMP, 6) - 50) < 4,
     'e a cor principal vem de qualquer um dos dois',
     'da mãe ' + pct(cMP, 6).toFixed(1) + '% · do pai ' + pct(cMP, 2).toFixed(1) + '%');

  const vMP = conta(mae, pai, d => {
    const v = M.vigorDoDna(d);
    return Object.keys(v).find(k => v[k] < 1) || 'nenhum';
  });
  const quatro = M.NASC_VIGOR.map(n => pct(vMP, n + 'Decay'));
  ok(Math.min.apply(null, quatro) > 18,
     'e o medidor forte pode sair de qualquer um dos quatro',
     quatro.map(p => p.toFixed(0) + '%').join(' · '));
}

/* O gerador do cruzamento começava onde a semente o punha, e um xorshift
   mal semeado dá as primeiras saídas quase iguais — as sementes 1, 2 e 3
   davam 0.9048, 0.9050 e 0.9049. O primeiro sorteio é o que escolhe o
   alelo de Força da mãe. */
{
  const N1 = 5000;
  const medir = semente => {
    let baixo = 0;
    for (let i = 1; i <= N1; i++) { const r = M._reprRng(semente(i)); if (r() < 0.5) baixo++; }
    return baixo / N1 * 100;
  };
  const grandes  = medir(i => (1700000000 + i) >>> 0);
  const pequenas = medir(i => i);
  ok(Math.abs(grandes - 50) < 3 && Math.abs(pequenas - 50) < 3,
     'o primeiro sorteio do cruzamento já é uma moeda ao ar',
     'sementes do jogo ' + grandes.toFixed(1) + '% · sementes pequenas ' + pequenas.toFixed(1) + '%');
}

console.log('');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
