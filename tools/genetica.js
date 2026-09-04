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
const { M } = require('./auditoria-base.js');

const CARACS = ['F', 'H', 'R', 'A'];
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

// ═══════════════════════════════════════════════════════════════════
titulo('A TENDÊNCIA INCLINA');

// Para cada avatar: qual característica o DNA puxa mais, e onde ele
// acabou ao nível 35. Se a tendência não servir para nada, a vocação
// acerta em 25% dos casos — o acaso puro entre quatro.
let acertos = 0, total = 0;
const ganhoPorPeso = {};   // peso → média da característica ao nível 35
for (let i = 0; i < N; i++) {
  const s = nascido(i * 17 + 3);
  const t = M.tendenciaDoDna(s.nascimento.dna);
  const f = M.fichaDeAvatar(s.seed, 'Comum', 'Fogo', 35, s.nascimento);

  const voc = M.vocacaoDoDna(s.nascimento.dna)[0];
  // Só conta quando a vocação é clara: um empate no topo não tem
  // resposta certa, e contá-lo seria inventar um erro.
  const pesos = CARACS.map(k => t[k]).sort((a, b) => b - a);
  if (pesos[0] > pesos[1]) {
    total++;
    const maior = CARACS.reduce((a, b) => f[b] > f[a] ? b : a);
    if (maior === voc) acertos++;
  }

  for (const k of CARACS) {
    (ganhoPorPeso[t[k]] = ganhoPorPeso[t[k]] || []).push(f[k]);
  }
}
/* O intervalo é largo de propósito, e as duas pontas são o que importa:
   abaixo de 40% o DNA não estaria a inclinar nada de útil, e acima de
   85% teria deixado de ser tendência para passar a ser destino. Um
   número apertado aqui seria eu a afinar o jogo para bater na minha
   própria expectativa em vez de verificar a propriedade. */
const taxa = acertos / total * 100;
ok(taxa > 40 && taxa < 85, 'a vocação costuma ganhar, mas está longe de ser certa',
   taxa.toFixed(1) + '% (acaso puro 25%, destino seria 100%) em ' + total.toLocaleString('pt-BR') + ' casos');

const escada = Object.keys(ganhoPorPeso).map(Number).sort((a, b) => a - b)
  .map(p => {
    const v = ganhoPorPeso[p];
    return { peso: p, media: v.reduce((a, b) => a + b, 0) / v.length, n: v.length };
  });
console.log('\n       peso do gene → característica média ao nível 35');
for (const e of escada) {
  console.log('       peso ' + e.peso + '  →  ' + e.media.toFixed(2).padStart(5) +
              '   (' + e.n.toLocaleString('pt-BR') + ' amostras)');
}
let monotona = true;
for (let i = 1; i < escada.length; i++) if (escada[i].media <= escada[i - 1].media) monotona = false;
ok(monotona, 'mais peso dá sempre mais característica, sem degrau ao contrário',
   escada[0].media.toFixed(2) + ' → ' + escada[escada.length - 1].media.toFixed(2));

// ═══════════════════════════════════════════════════════════════════
titulo('MAS NÃO GARANTE');

// O mesmo DNA, seeds diferentes. Se o DNA determinasse o resultado,
// estes avatares seriam gémeos idênticos.
const molde = nascido(12345).nascimento;
const fichas = [];
for (let i = 0; i < 2000; i++) fichas.push(M.fichaDeAvatar(i * 7 + 1, 'Comum', 'Fogo', 35, molde));

const iguais = new Set(fichas.map(f => CARACS.map(k => f[k]).join('/')));
ok(iguais.size > 10, 'o mesmo DNA dá fichas diferentes',
   iguais.size + ' fichas distintas em 2.000 irmãos');

const vocDoMolde = M.vocacaoDoDna(molde.dna)[0];
const falhaVocacao = fichas.filter(f => CARACS.reduce((a, b) => f[b] > f[a] ? b : a) !== vocDoMolde).length;
ok(falhaVocacao > 0, 'um avatar pode falhar a própria vocação',
   falhaVocacao + ' dos 2.000 não acabaram com ' + vocDoMolde + ' à frente');

const espalha = CARACS.map(k => {
  const v = fichas.map(f => f[k]);
  return k + ' ' + Math.min(...v) + '–' + Math.max(...v);
}).join('  ');
ok(true, 'amplitude de cada característica entre irmãos', espalha);

// ═══════════════════════════════════════════════════════════════════
titulo('O ORÇAMENTO NÃO SE MEXEU');

// A tendência muda ONDE os pontos caem. Se mudasse quantos são, tinha
// mexido no balanceamento do combate sem ninguém pedir.
let orcamentoQuebrado = 0, somaComDna = 0, somaSemDna = 0, n2 = 0;
for (let i = 0; i < 5000; i++) {
  const s = nascido(i * 13 + 5);
  for (const nv of [1, 10, 20, 35]) {
    const com = M.fichaDeAvatar(s.seed, 'Comum', 'Fogo', nv, s.nascimento);
    const sem = M.fichaDeAvatar(s.seed, 'Comum', 'Fogo', nv, null);
    if (com.pontos !== sem.pontos) orcamentoQuebrado++;
    somaComDna += CARACS.reduce((t, k) => t + com[k], 0);
    somaSemDna += CARACS.reduce((t, k) => t + sem[k], 0);
    n2++;
  }
}
ok(orcamentoQuebrado === 0, 'os pontos do avatar são os mesmos com DNA e sem ele',
   n2.toLocaleString('pt-BR') + ' fichas comparadas');
ok(Math.abs(somaComDna - somaSemDna) / n2 < 0.35,
   'a soma das características quase não se move',
   (somaComDna / n2).toFixed(2) + ' com DNA · ' + (somaSemDna / n2).toFixed(2) + ' sem');

// Subir de nível nunca pode baixar uma característica. Já custou um
// defeito antes, e os pesos novos são a ocasião perfeita para o repetir.
let regressoes = 0;
for (let i = 0; i < 3000; i++) {
  const s = nascido(i * 29 + 11);
  let ant = M.fichaDeAvatar(s.seed, 'Comum', 'Fogo', 1, s.nascimento);
  for (let nv = 2; nv <= 35; nv++) {
    const f = M.fichaDeAvatar(s.seed, 'Comum', 'Fogo', nv, s.nascimento);
    for (const k of CARACS) if (f[k] < ant[k]) regressoes++;
    ant = f;
  }
}
ok(regressoes === 0, 'nenhuma característica desce ao subir de nível',
   '3.000 avatares × 34 subidas');

// ═══════════════════════════════════════════════════════════════════
titulo('A PROVENIÊNCIA');

/* O que o ovo Lendário compra, medido em vez de suposto.

   Desde que todos passaram a nascer Comuns (o slot fica mesmo em
   'Comum', ver js/eggs.js), a proveniência só podia pagar pelos genes.
   E os genes só dão FEITIO: os pesos são relativos à característica mais
   fraca do próprio avatar, portanto alelos todos altos e alelos todos
   baixos dão a mesma vocação. É por isso que as três linhas abaixo saem
   iguais — e não por acaso da amostra. */
const proven = [];
for (const origem of ['Comum', 'Raro', 'Lendário']) {
  let soma = 0, contraste = 0, bruto = 0;
  for (let i = 0; i < 5000; i++) {
    const s = nascido(i * 23 + 3, origem);
    const t = M.tendenciaDoDna(s.nascimento.dna);
    const f = M.fichaDeAvatar(s.seed, s.raridade, 'Fogo', 35, s.nascimento);
    soma += CARACS.reduce((a, k) => a + f[k], 0);
    const ps = CARACS.map(k => t[k]);
    contraste += Math.max(...ps) - Math.min(...ps);
    for (const k of CARACS) {
      const par = s.nascimento.dna.genes[k];
      bruto += 2 * Math.max(par[0], par[1]) + Math.min(par[0], par[1]);
    }
  }
  proven.push({ origem, soma: soma / 5000, contraste: contraste / 5000, bruto: bruto / 5000 });
  console.log('       ' + origem.padEnd(9) +
              'genes: ' + (bruto / 5000).toFixed(1).padStart(5) +
              '   vocação: ' + (contraste / 5000).toFixed(2) +
              '   características ao nv35: ' + (soma / 5000).toFixed(2));
}
const dif = proven[2].soma - proven[0].soma;
console.log('');
console.log('       ⚠ O ovo Lendário dá ' + (proven[2].bruto - proven[0].bruto).toFixed(1) +
            ' pontos de gene a mais que o Comum');
console.log('         e isso vale ' + dif.toFixed(2) + ' características ao nível 35.');
console.log('         Antes de todos nascerem Comuns valia +5 pontos (10 contra 5).');
console.log('         Não é desta tarefa: quem decide o preço da proveniência');
console.log('         é a progressão. Fica medido para essa conversa.');

console.log('\n─────────────────────────────');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
