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
  const f = M.fichaDeAvatar(s.seed, 'Comum', 35, s.nascimento);

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
for (let i = 0; i < 2000; i++) fichas.push(M.fichaDeAvatar(i * 7 + 1, 'Comum', 35, molde));

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
/* O QUE O DNA NÃO PODE FAZER É PAGAR PONTOS.

   Isto comparava o total FINAL, e passou a falhar quando a índole entrou:
   o feitio inclina qual virtude e qual defeito saem, elas custam preços
   diferentes, e portanto o total final mexe-se. Não é defeito — é a
   mesma variação que o seed já dava, só que distribuída de outra maneira.

   O que tem de ficar de pé é o ORÇAMENTO BASE: os pontos que o nível
   dá, antes de virtude e defeito mexerem neles. Esse o DNA não toca, e
   é dele que sai a raridade. */
let baseQuebrada = 0, somaComDna = 0, somaSemDna = 0, n2 = 0;
for (let i = 0; i < 5000; i++) {
  const s = nascido(i * 13 + 5);
  for (const nv of [1, 10, 20, 35]) {
    const com = M.fichaDeAvatar(s.seed, 'Comum', nv, s.nascimento);
    const sem = M.fichaDeAvatar(s.seed, 'Comum', nv, null);
    if (com.pontosBase !== sem.pontosBase) baseQuebrada++;
    somaComDna += CARACS.reduce((t, k) => t + com[k], 0);
    somaSemDna += CARACS.reduce((t, k) => t + sem[k], 0);
    n2++;
  }
}
ok(baseQuebrada === 0, 'o orçamento base não depende do DNA — vem só do nível',
   n2.toLocaleString('pt-BR') + ' fichas comparadas');
ok(Math.abs(somaComDna - somaSemDna) / n2 < 0.35,
   'e a soma das características quase não se move',
   (somaComDna / n2).toFixed(2) + ' com DNA · ' + (somaSemDna / n2).toFixed(2) + ' sem');


// Subir de nível nunca pode baixar uma característica. Já custou um
// defeito antes, e os pesos novos são a ocasião perfeita para o repetir.
let regressoes = 0;
for (let i = 0; i < 3000; i++) {
  const s = nascido(i * 29 + 11);
  let ant = M.fichaDeAvatar(s.seed, 'Comum', 1, s.nascimento);
  for (let nv = 2; nv <= 35; nv++) {
    const f = M.fichaDeAvatar(s.seed, 'Comum', nv, s.nascimento);
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
    const f = M.fichaDeAvatar(s.seed, s.raridade, 35, s.nascimento);
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
// ════════════════════════════════════════════════════════════════
titulo('A ÍNDOLE');

// Quantos nascem de cada feitio.
{
  const conta = {};
  for (let i = 0; i < N; i++) {
    const s = nascido(i * 41 + 5);
    const d = M.indoleDominante(s.nascimento.dna);
    conta[d] = (conta[d] || 0) + 1;
  }
  console.log('       ' + M.NASC_INDOLES.map(k =>
    k + ' ' + ((conta[k] || 0) / N * 100).toFixed(1) + '%').join('  ·  '));
  const menor = Math.min.apply(null, M.NASC_INDOLES.map(k => (conta[k] || 0) / N * 100));
  ok(menor > 25, 'os três feitios nascem em proporções parecidas',
     'o menos comum tem ' + menor.toFixed(1) + '%');
}

/* A índole inclina o que sai: magias, virtude e defeito.

   Compara-se o feitio marcado (dois alelos iguais, o mais extremo que
   há) com o sorteio limpo. Se o gene não servisse para nada, as três
   linhas eram iguais. */
{
  const medir = (par) => {
    const dna = { genes: { indole: par, F: [2,2], H: [2,2], R: [2,2], A: [2,2] } };
    let magias = 0, vant = 0, desv = 0, nM = 0, nV = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      const cert = par ? { dna } : null;
      const f = M.fichaDeAvatar(seed, 'Lendário', 35, cert);
      const m = M.magiasDoAvatar(f);
      // O PREÇO é o que mede o eixo do feitio nas magias: dentro de uma
      // gaveta a família mal varia, mas o preço varia sempre.
      for (const c of M.MAGIA_SLOTS) if (m[c]) { nM++; magias += m[c].pm; }
      nV++;
      const fv = f.vantagem    && M.VANTAGENS[f.vantagem.id];
      const fd = f.desvantagem && M.DESVANTAGENS[f.desvantagem.id];
      if (fv && fv.familia === 'lamina') vant++;
      if (fd && fd.familia === 'lamina') desv++;
    }
    return { magias: magias / nM, vant: vant / nV * 100, desv: desv / nV * 100 };
  };
  const limpo  = medir(null);
  const guarda = medir([0, 0]);
  const lamina = medir([2, 2]);

  console.log('');
  const fonte = medir([1, 1]);
  console.log('                     PM médio  vantagem  desvantagem');
  console.log('                     da magia   (% de família LÂMINA)');
  const linha = (rot, r) => console.log('       ' + rot.padEnd(19) +
    r.magias.toFixed(2).padStart(5) + '   ' + r.vant.toFixed(1).padStart(6) + '%  ' +
    r.desv.toFixed(1).padStart(9) + '%');
  linha('sem gene (limpo)', limpo);
  linha('feitio FONTE', fonte);
  linha('feitio GUARDA', guarda);
  linha('feitio LÂMINA', lamina);

  ok(lamina.magias > limpo.magias && fonte.magias < limpo.magias,
     'o feitio inclina que magias saem — a lâmina puxa para as caras, a fonte para as baratas',
     'fonte ' + fonte.magias.toFixed(2) + ' < limpo ' + limpo.magias.toFixed(2) +
     ' < lâmina ' + lamina.magias.toFixed(2) + ' PM');
  ok(lamina.vant > guarda.vant, 'e inclina a virtude',
     'guarda ' + guarda.vant.toFixed(0) + '% · lâmina ' + lamina.vant.toFixed(0) + '%');
  ok(lamina.desv > guarda.desv, 'e o defeito vem do mesmo terreno que a virtude',
     'guarda ' + guarda.desv.toFixed(0) + '% · lâmina ' + lamina.desv.toFixed(0) + '%');

  /* E NÃO DECIDE. O feitio mais extremo que existe tem de continuar a
     sair com virtudes de outra família — se não pudesse, isto tinha
     deixado de ser genética e passado a ser uma classe de personagem. */
  ok(lamina.vant < 85 && guarda.vant > 5,
     'mas nunca decide: até o mais bruto sai com virtudes de outro feitio',
     'lâmina fica-se por ' + lamina.vant.toFixed(0) + '% · guarda ainda tem ' +
     guarda.vant.toFixed(0) + '%');
}


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
