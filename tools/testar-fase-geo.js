#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A GEOMETRIA DA FASE, E O QUE ELA NÃO PODE TOCAR

   A etapa 3J.4 fez o avatar crescer com a fase. A auditoria 3J.3 que
   veio antes mediu porque é que isso é perigoso: o SVG do avatar tem
   três lugares que MEDEM o desenho já pronto (`getBBox`) e colam peças
   novas nas coordenadas medidas, e tem seis grupos com `transform` de
   CSS que se sobrepõem a qualquer `transform` escrito no atributo.

   Por isso o crescimento é aritmética, não transformação — e por isso
   este arquivo existe. Ele não confere se o avatar está bonito. Confere
   as cinco promessas que a etapa fez:

     1. o Bebê, o Jovem e o Adulto desenham-se EXATAMENTE como antes
     2. o Ancião desenha-se diferente (senão não cresceu nada)
     3. os olhos não mudaram
     4. a boca não mudou
     5. a fila dos sorteios não mudou

   ── COMO AS TRÊS ÚLTIMAS SE PROVAM DE UMA VEZ ──

   Olhando para a ordem em que o gerador desenha:

     aura · asas · corpo de baixo · cauda · tentáculos · braços · corpo
     · espinhos · CHIFRES · olhos · boca · manchas · partículas

   Os chifres são a última peça que esta etapa toca, e são também os
   últimos a TIRAR números da fila principal (`alt` e `larg`). Tudo o
   que vem depois deles — olhos, boca, manchas, partículas — ou não lê a
   fila, ou lê o que sobrou dela.

   Logo: se o pedaço do `<g class="av-olho">` até ao fim do desenho for
   igual entre duas fases, então os olhos estão iguais, a boca está
   igual, E nenhum sorteio foi acrescentado, movido ou retirado. Um
   `random` a mais junto aos chifres deslocava as manchas, e as manchas
   estão nesse pedaço. Três promessas, uma comparação.

   ── O GOLDEN ──

   O tools/fase-geo-golden.json tem o sha256 de 360 desenhos (40 seeds ×
   3 raridades × 3 fases), calculados no commit d3db12d, que é o último
   antes da 3J.4. O `sid` do SVG é único por render, logo normaliza-se
   antes de somar.

   Se este teste falhar depois de uma mudança DELIBERADA na aparência do
   avatar — um corpo novo, outra paleta —, o golden é que está velho.
   Refaz-se assim, e dizendo porquê no commit:

     node tools/testar-fase-geo.js --refazer-golden

   Correr:  node tools/testar-fase-geo.js
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const RAIZ = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');
const NL = String.fromCharCode(10);
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);

const M = new Function('t',
  rd('cores.js') + rd('data.js') + rd('nascimento.js') + rd('ficha-fu.js') +
  rd('raridade.js') + rd('reproducao.js') + rd('identidade.js') +
  LINHAS_DA_FASE + NL +
  'return { gerarSVG, FASE_GEO, faseGeoDe };'
)(x => x);

const GOLDEN = path.join(__dirname, 'fase-geo-golden.json');
const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const SEEDS = [];
for (let i = 0; i < 40; i++) SEEDS.push(1000 + i * 7919);

/* O `sid` é `${seed}_${contador}` e o contador anda a cada render: sem
   isto, o mesmo avatar desenhado duas vezes dava duas strings. */
const normalizar = (svg, seed) =>
  svg.split(seed + '_').join('SID').replace(/SID[0-9]+/g, 'SID');
const desenhar = (seed, rar, fase) =>
  normalizar(M.gerarSVG({ cor: 'roxo', seed }, rar, seed, 120, 120, fase), seed);
const somar = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ── REFAZER O GOLDEN ── */
if (process.argv.indexOf('--refazer-golden') !== -1) {
  const novo = {};
  for (const seed of SEEDS) for (const rar of RARIDADES) for (let f = 0; f <= 2; f++)
    novo[seed + '|' + rar + '|' + f] = somar(desenhar(seed, rar, f));
  /* A vindima tem de ir escrita: sem isto, o teste a seguir continua a
     afirmar que o Lendário vem de d3db12d, e já não vinha. */
  novo.__meta = { nota: 'Todas as raridades refeitas de uma vez, com --refazer-golden.',
                  d3db12d: [], refeito: ['Comum', 'Raro', 'Lendário'] };
  fs.writeFileSync(GOLDEN, JSON.stringify(novo, null, 0));
  console.log('golden refeito: ' + (Object.keys(novo).length - 1) + ' desenhos');
  console.log('ATENÇÃO: isto apaga a prova de que a aparência não mudou,');
  console.log('INCLUINDO a do Lendário, que sobreviveu à 3J.4 e à 3J.6.');
  console.log('Só se faz quando a mudança da aparência É o objetivo, e diz-se no commit.');
  process.exit(0);
}

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK    ' + titulo.padEnd(54) + ' · ' + (detalhe || '')); }
  else      { falhou++; console.log('  FALHOU ' + titulo.padEnd(53) + ' · ' + (detalhe || '')); }
}
const tit = (t) => console.log(NL + '─── ' + t + ' ' + '─'.repeat(Math.max(0, 56 - t.length)));

/* ═══════════════════════ A TABELA ═══════════════════════ */
tit('A TABELA DA FASE');

const GEO = M.FASE_GEO;
ok(Array.isArray(GEO) && GEO.length === 4, 'há uma linha por fase',
   (GEO || []).length + ' linhas');

const CAMPOS = ['corpo', 'membro', 'chifre', 'cauda', 'wdy', 'brAnchorY',
                'brAnchorR', 'caudaY0', 'auCY', 'auRY'];
let faltam = [];
for (let i = 0; i < GEO.length; i++)
  for (const c of CAMPOS)
    if (typeof GEO[i][c] !== 'number') faltam.push(i + '.' + c);
ok(faltam.length === 0, 'e nenhuma linha tem campo a faltar',
   faltam.length ? faltam.join(' ') : CAMPOS.length + ' campos × 4 fases');

/* Os números que os ternários davam antes da 3J.4. Se alguém mexer na
   tabela sem querer, é aqui que se nota — e não só nos desenhos. */
const ANTES_BAIXO = { wdy: 0,  brAnchorY: 95,  brAnchorR: 35, caudaY0: 140, auCY: 105, auRY: 116 };
const ANTES_ALTO  = { wdy: 63, brAnchorY: 163, brAnchorR: 30, caudaY0: 213, auCY: 135, auRY: 150 };
for (const [i, esperado, rotulo] of [[0, ANTES_BAIXO, 'bebê'], [1, ANTES_BAIXO, 'jovem'],
                                     [2, ANTES_ALTO, 'adulto'], [3, ANTES_ALTO, 'ancião']]) {
  const erradas = Object.keys(esperado).filter(c => GEO[i][c] !== esperado[c]);
  ok(erradas.length === 0, 'as posições do ' + rotulo + ' são as de sempre',
     erradas.length ? erradas.map(c => c + '=' + GEO[i][c]).join(' ') : 'wdy ' + GEO[i].wdy
       + ' · brAnchorY ' + GEO[i].brAnchorY + ' · caudaY0 ' + GEO[i].caudaY0);
}

for (const [i, rotulo] of [[0, 'bebê'], [1, 'jovem'], [2, 'adulto']]) {
  const f = ['corpo', 'membro', 'chifre', 'cauda'].filter(c => GEO[i][c] !== 1);
  ok(f.length === 0, 'o ' + rotulo + ' não tem fator nenhum',
     f.length ? f.map(c => c + '=' + GEO[i][c]).join(' ') : 'corpo/membro/chifre/cauda = 1');
}
ok(GEO[3].corpo > 1 && GEO[3].membro > 1 && GEO[3].chifre > 1,
   'e o ancião tem fator em corpo, membro e chifre',
   'corpo ' + GEO[3].corpo + ' · membro ' + GEO[3].membro + ' · chifre ' + GEO[3].chifre);
ok(GEO[3].cauda === 1, 'e a cauda do ancião fica em 1 (o corte do viewBox)',
   'cauda ' + GEO[3].cauda);

/* Uma fase fora da escada não pode rebentar: o js/cards.js chama o
   gerarSVG com cinco argumentos e a fase chega `undefined`. */
const bordas = [[undefined, 0], [null, 0], [-5, 0], [0, 0], [3, 3], [9, 3], ['2', 2], [NaN, 0]];
let bordaMa = [];
for (const [entrada, esperado] of bordas)
  if (M.faseGeoDe(entrada) !== GEO[esperado]) bordaMa.push(String(entrada));
ok(bordaMa.length === 0, 'uma fase torta prende-se à lista em vez de rebentar',
   bordaMa.length ? 'falhou em ' + bordaMa.join(' ') : bordas.length + ' casos de borda');

/* ═══════════════════════ O GOLDEN ═══════════════════════ */
tit('O BEBÊ, O JOVEM E O ADULTO NÃO MUDARAM');

/* ── O GOLDEN TEM DUAS IDADES, DESDE A 3J.6 ──

   A 3J.6 tirou a raridade da anatomia, e isso MUDOU o desenho — de
   propósito. Um Comum tinha teto ZERO de espinhos, portanto nenhum
   Comum tinha espinhos: agora tem os que o seed lhe deu. Guardar o
   hash antigo e chamar-lhe regressão seria pedir ao teste para defender
   uma regra que o projeto revogou.

   Guardar o hash antigo e chamar-lhe regressão seria pedir ao teste
   para defender uma regra que o projeto revogou. Então rebaselina-se —
   mas só a parte que a etapa mudou, e nunca o arquivo inteiro.

   A 3J.8 fez o mesmo ao raio do olho, e a conta deu certo outra vez por
   acaso feliz: o raio era 10/12/14 por raridade e passou a 12 para
   todos, logo o RARO não mudou nada. Como na 3J.6 o Lendário não tinha
   mudado, o golden foi sempre andando com um terço intacto.

   Hoje tem duas vindimas, e o teste separa-as:

     Raro             hashes da 3J.6 — o raio do olho dele já era 12
     Comum, Lendário  rebaselinados na 3J.8

   ── A VINDIMA DE d3db12d ACABOU NA 3J.8 ──

   Ela vivia no Lendário e sobreviveu a duas etapas: a 3J.4 não lhe
   tocou porque só o Ancião cresceu, e a 3J.6 não lhe tocou porque o teto
   dele (8 braços, 4 espinhos) nunca prendia. A 3J.8 muda-lhe o olho de
   14 para 12, de propósito, e aí a prova termina.

   Antes de a deixar ir, mediu-se o que ela ainda tinha a dizer: com o
   `tb` antigo reposto, os 480 desenhos voltaram a bater com o pré-3J.8.
   Ou seja, a 3J.8 não mexeu em mais nada — e é essa a afirmação que a
   vindima existia para sustentar.

   O que o golden ainda protege: qualquer mudança não intencional no
   desenho aparece aqui. O que ele nunca protege é a mudança que a etapa
   queria fazer — para essa há sempre um teste de comportamento ao lado,
   e é por isso que esta ferramenta não vive só de hashes. */
let golden = null;
try { golden = JSON.parse(fs.readFileSync(GOLDEN, 'utf8')); } catch (e) { golden = null; }
const chavesDoGolden = golden ? Object.keys(golden).filter(k => k !== '__meta') : [];
ok(chavesDoGolden.length === 360, 'o golden está no lugar',
   golden ? chavesDoGolden.length + ' desenhos' : 'não se leu ' + GOLDEN);
/* ── UMA VINDIMA POR RARIDADE ──

   Cada etapa desta série mudou UMA raridade e deixou as outras duas
   intactas, e isso não foi sorte — foi o que se escolheu medir antes de
   rebaselinar. Hoje o golden é:

     Comum      3J.8,  quando o raio do olho passou a 12
     Raro       3J.10, quando a garra saiu
     Lendário   3J.11, quando a contagem de manchas deixou de
                ser maior nele (random(4,6) → random(3,5))

   As duas que não mudam em cada etapa são a prova de que a etapa não
   mexeu em mais nada. É por isso que não se refaz o golden inteiro:
   refazê-lo apagaria exatamente a parte que tem alguma coisa a dizer. */
const meta = (golden && golden.__meta) || null;
const VINDIMAS = { 'Comum': '3J.8', 'Raro': '3J.10', 'Lendário': '3J.11' };
const metaBate = meta && Object.keys(VINDIMAS).every(r =>
  Array.isArray(meta[VINDIMAS[r]]) && meta[VINDIMAS[r]].indexOf(r) !== -1);
ok(metaBate, 'e diz de que etapa vem cada vindima',
   meta ? Object.keys(VINDIMAS).map(r => r + ' ' + VINDIMAS[r]).join(' · ') : 'sem __meta');

if (golden) {
  for (const rar of ['Comum', 'Raro', 'Lendário']) {
    let bate = 0; const quebrou = [];
    for (const seed of SEEDS) for (let f = 0; f <= 2; f++) {
      const k = seed + '|' + rar + '|' + f;
      if (somar(desenhar(seed, rar, f)) === golden[k]) bate++;
      else if (quebrou.length < 5) quebrou.push(k);
    }
    ok(bate === 120, 'o ' + rar + ' desenha-se byte a byte como na ' + VINDIMAS[rar],
       bate + '/120' + (quebrou.length ? ' · quebrou em ' + quebrou.join(' ') : ''));
  }
}

/* ═══════════════════ O ANCIÃO CRESCEU ═══════════════════ */
tit('O ANCIÃO CRESCEU');

let cresceu = 0, igual = [];
for (const seed of SEEDS) for (const rar of RARIDADES) {
  if (desenhar(seed, rar, 2) !== desenhar(seed, rar, 3)) cresceu++;
  else if (igual.length < 3) igual.push(seed + '|' + rar);
}
ok(cresceu === 120, 'nenhum ancião desenha igual ao adulto',
   cresceu + '/120' + (igual.length ? ' · iguais: ' + igual.join(' ') : ''));

/* O corpo tipo 1 é um círculo de raio 45, e o fator do ancião pega-lhe
   diretamente — é a medida mais fácil de ler no meio de dez mil bytes. */
const raios = {};
for (const seed of SEEDS) for (const rar of RARIDADES) {
  const m = desenhar(seed, rar, 3)
    .match(/<g class="av-corpo"><circle cx="100" cy="100" r="([0-9.]+)"/);
  if (m) raios[m[1]] = (raios[m[1]] || 0) + 1;
}
const esperadoR = String(Math.round(45 * GEO[3].corpo * 100) / 100);
const chaves = Object.keys(raios);
ok(chaves.length === 1 && chaves[0] === esperadoR,
   'e o corpo redondo dele mede 45 × o fator',
   'raios vistos: ' + JSON.stringify(raios) + ' · esperado ' + esperadoR);

/* ── E OS BRAÇOS DELE SÃO MAIS COMPRIDOS ──

   O corpo e os braços crescem por caminhos diferentes (`cR` e `mE`), e
   um teste que só mede o corpo deixa passar um braço que ficou para
   trás: foi o que uma mutação mostrou, ao tirar o `mE` dos braços sem
   que nada falhasse.

   O braço sai de `100 ± brAnchorR` e acaba em `100 ± 65 × membro`. O
   primeiro braço é o do lado esquerdo (`lado = -1`), logo a ponta dele
   está em `100 - 65 × membro`. */
const pontaEsq = (svg) => {
  const m = svg.match(/<g class="av-membro" style="--i:0"><path d="M [0-9.]+ [0-9.]+ Q [0-9.]+ [0-9.]+ (-?[0-9.]+) /);
  return m ? +m[1] : null;
};
const esperadoPonta = Math.round((100 - 65 * GEO[3].membro) * 100) / 100;
let pontas = {}, semPonta = 0;
for (const seed of SEEDS) for (const rar of RARIDADES) {
  const p = pontaEsq(desenhar(seed, rar, 3));
  if (p === null) semPonta++; else pontas[p] = (pontas[p] || 0) + 1;
}
ok(Object.keys(pontas).length === 1 && +Object.keys(pontas)[0] === esperadoPonta,
   'e os braços dele esticam 65 × o fator',
   'pontas: ' + Object.keys(pontas).join(',') + ' · esperado ' + esperadoPonta
     + (semPonta ? ' · ' + semPonta + ' sem braço' : ''));

let pontasAd = {};
for (const seed of SEEDS) for (const rar of RARIDADES) {
  const p = pontaEsq(desenhar(seed, rar, 2));
  if (p !== null) pontasAd[p] = 1;
}
ok(Object.keys(pontasAd).length === 1 && +Object.keys(pontasAd)[0] === 35,
   'e as do adulto continuam nos 35 de sempre',
   'pontas: ' + Object.keys(pontasAd).join(','));

/* ── E AINDA CABE NA MOLDURA ──

   O viewBox é 200 de LARGURA por 260 de altura, e os dois números são
   diferentes: a primeira versão deste teste comparou tudo contra 200 e
   acusou um 206 que era o y do corpo de BAIXO, legítimo numa caixa de
   260. Por isso se separam os eixos, e por isso se olha só para o corpo
   de cima — o de baixo esta etapa não o toca.

   O corpo de cima é o ÚLTIMO grupo `av-corpo` do desenho: o de baixo sai
   antes da cauda, e o de cima só depois dos braços. */
function corpoDeCima(svg) {
  const gs = svg.match(/<g class="av-corpo">[\s\S]*?<\/g>/g) || [];
  return gs.length ? gs[gs.length - 1] : '';
}
/* Os pontos de cada forma, como PARES. Num `points` vêm `x,y`; num `d`
   vêm sempre dois a dois (M x y, L x y, Q x y x y); e o círculo e a
   elipse dizem-se pelo centro e pelos raios. */
function pontosDe(g) {
  const p = [];
  for (const m of (g.match(/points="([^"]*)"/g) || []))
    for (const par of m.replace(/points="|"/g, '').trim().split(/\s+/)) {
      const [x, y] = par.split(',').map(Number);
      if (isFinite(x) && isFinite(y)) p.push([x, y]);
    }
  for (const m of (g.match(/ d="([^"]*)"/g) || [])) {
    const n = (m.replace(/[^0-9.\- ]/g, ' ').match(/-?[0-9]+(?:\.[0-9]+)?/g) || []).map(Number);
    for (let i = 0; i + 1 < n.length; i += 2) p.push([n[i], n[i + 1]]);
  }
  const cir = g.match(/<circle cx="([0-9.]+)" cy="([0-9.]+)" r="([0-9.]+)"/);
  if (cir) { const [, cx, cy, r] = cir.map(Number);
             p.push([cx - r, cy - r], [cx + r, cy + r]); }
  const eli = g.match(/<ellipse cx="([0-9.]+)" cy="([0-9.]+)" rx="([0-9.]+)" ry="([0-9.]+)"/);
  if (eli) { const [, cx, cy, rx, ry] = eli.map(Number);
             p.push([cx - rx, cy - ry], [cx + rx, cy + ry]); }
  return p;
}
let estourou = [];
for (const seed of SEEDS) for (const rar of RARIDADES) {
  const svg = desenhar(seed, rar, 3);
  const vbH = +(svg.match(/viewBox="0 0 200 ([0-9]+)"/) || [0, 260])[1];
  for (const [x, y] of pontosDe(corpoDeCima(svg))) {
    if (x < 0 || x > 200) { estourou.push(seed + '|' + rar + ' x=' + x); break; }
    if (y < 0 || y > vbH) { estourou.push(seed + '|' + rar + ' y=' + y); break; }
  }
}
ok(estourou.length === 0, 'e o corpo do ancião cabe na moldura',
   estourou.length ? estourou.slice(0, 3).join(' ')
                   : '120 corpos · x em 0–200 · y em 0–260');

/* ═══════ A RARIDADE NÃO DECIDE ANATOMIA (3J.6) ═══════ */
tit('A RARIDADE NÃO DECIDE ANATOMIA');

/* ── O QUE ESTA SECÇÃO PROVA ──

   Para o mesmo seed e a mesma fase, um Comum, um Raro e um Lendário têm
   de ter a MESMA contagem de braços, a mesma contagem de espinhos e os
   mesmos tentáculos.

   Antes da 3J.6 não tinham, e a diferença não era pequena. Medido nos
   40 seeds desta grade:

                   braços/avatar   espinhos/avatar   com tentáculos
     Comum              3,58             0,00            0 de 40
     Raro               4,58             1,40           14 de 40
     Lendário           5,00             2,02           14 de 40

   O teto do Comum para espinhos era ZERO: nenhum Comum tinha espinhos,
   tivesse o seed sorteado quatro. Depois da 3J.6 as três linhas são a
   do Lendário, porque o teto dele nunca prendia.

   Conta-se o que está DESENHADO, e não o que a variável diz: é o
   desenho que o jogador vê, e é no desenho que um teto esquecido
   apareceria. */
function anatomiaDe(svg) {
  const grupo = (cls) => {
    const m = svg.match(new RegExp('<g class="' + cls + '">([\\s\\S]*?)</g>'));
    return m ? m[1] : '';
  };
  return {
    bracos: (svg.match(/class="av-membro"/g) || []).length,
    /* O espinho é um `<polygon>` por espinho, dentro do `.av-espinho`. */
    espinhos: (grupo('av-espinho').match(/<polygon/g) || []).length,
    /* O tentáculo é um `<path>`; zero paths = sem tentáculos. */
    tentaculos: (grupo('av-tentaculo').match(/<path/g) || []).length,
  };
}

let divergiu = [], anatomias = 0;
const totais = { Comum: { b: 0, e: 0, t: 0 }, Raro: { b: 0, e: 0, t: 0 },
                 'Lendário': { b: 0, e: 0, t: 0 } };
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const a = {};
  for (const rar of RARIDADES) {
    a[rar] = anatomiaDe(desenhar(seed, rar, f));
    totais[rar].b += a[rar].bracos;
    totais[rar].e += a[rar].espinhos;
    totais[rar].t += a[rar].tentaculos > 0 ? 1 : 0;
  }
  anatomias++;
  for (const rar of ['Raro', 'Lendário']) {
    for (const campo of ['bracos', 'espinhos', 'tentaculos']) {
      if (a[rar][campo] !== a.Comum[campo] && divergiu.length < 6) {
        divergiu.push(seed + '|fase' + f + ' ' + campo + ': Comum '
          + a.Comum[campo] + ' vs ' + rar + ' ' + a[rar][campo]);
      }
    }
  }
}

ok(divergiu.length === 0,
   'braços, espinhos e tentáculos iguais nas 3 raridades',
   divergiu.length ? divergiu.join(' | ') : anatomias + ' avatares × 4 fases × 3 raridades');

/* E as somas, que dizem se alguma raridade ficou para trás no conjunto
   — um teto que só prendesse num seed raro escapava à comparação acima
   se eu tivesse limitado a amostra, e aqui não escapa. */
const somaIgual = ['b', 'e', 't'].every(c =>
  totais.Comum[c] === totais.Raro[c] && totais.Comum[c] === totais['Lendário'][c]);
ok(somaIgual, 'e as somas do conjunto batem nas três',
   'braços ' + totais.Comum.b + '/' + totais.Raro.b + '/' + totais['Lendário'].b
   + ' · espinhos ' + totais.Comum.e + '/' + totais.Raro.e + '/' + totais['Lendário'].e
   + ' · com tentáculos ' + totais.Comum.t + '/' + totais.Raro.t + '/' + totais['Lendário'].t);

/* O Comum passou a poder ter as três coisas. Se a amostra não mostrar
   nenhum Comum com espinhos ou tentáculos, a invariância acima estaria
   satisfeita por todos serem zero — que era exatamente o estado antigo. */
ok(totais.Comum.e > 0, 'e o Comum passou a poder ter espinhos',
   totais.Comum.e + ' espinhos desenhados em avatares Comuns');
ok(totais.Comum.t > 0, 'e o Comum passou a poder ter tentáculos',
   totais.Comum.t + ' avatares Comuns com tentáculos');
ok(totais.Comum.b > anatomias * 4, 'e o Comum já não está preso em 4 braços',
   'média ' + (totais.Comum.b / anatomias).toFixed(2) + ' braços por avatar');

/* ── E O GERADOR JÁ NÃO PERGUNTA O GRAU DA RARIDADE ──

   Esta é a única asserção de FONTE desta secção, e existe por uma razão
   que as de comportamento não cobrem: o `grauDaRaridade` serve para
   ORDENAR as três raridades, e ordená-las é legítimo — no mercado, no
   preço, na ficha. O que não é legítimo é o DESENHO perguntar por ele,
   porque a única coisa que se faz com uma ordem dentro de um gerador de
   corpo é cortar partes por degrau.

   Enquanto o gerador não tiver esse número à mão, ninguém lhe pendura
   anatomia por distração. */
const fonteDoGerador = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8')
  /* Tira os comentários: o de cima explica o teto antigo e cita-o, e um
     teste que lê comentários acusa a própria documentação. Já aconteceu
     nesta ferramenta, com o vbH. */
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok(!/grauDaRaridade|RARIDADE_GRAU/.test(fonteDoGerador),
   'o gerador não pergunta o grau da raridade',
   'ordenar raridades é legítimo; cortar anatomia por degrau não');
ok(!/\[\s*4\s*,\s*6\s*,\s*8\s*\]|\[\s*0\s*,\s*2\s*,\s*4\s*\]/.test(fonteDoGerador),
   'e os dois tetos por degrau não voltaram',
   '[4,6,8] e [0,2,4] eram os tetos de braços e espinhos');

/* ════════ OS OLHOS, A BOCA E A FILA — DE UMA VEZ ════════ */
tit('OS OLHOS, A BOCA E A FILA DOS SORTEIOS');

/* Do `<g class="av-olho">` até ao fim. Ver o cabeçalho: os chifres são
   os últimos a tirar números da fila, e tudo o que vem depois deles tem
   de ser igual em todas as fases. */
const daCaraAoFim = (svg) => {
  const i = svg.indexOf('<g class="av-olho">');
  return i === -1 ? null : svg.slice(i);
};
let semOlho = 0, difCara = [], comparados = 0;
for (const seed of SEEDS) for (const rar of RARIDADES) {
  const pedacos = [];
  for (let f = 0; f <= 3; f++) {
    const p = daCaraAoFim(desenhar(seed, rar, f));
    if (p === null) { semOlho++; break; }
    pedacos.push(p);
  }
  if (pedacos.length !== 4) continue;
  comparados++;
  for (let f = 1; f < 4; f++)
    if (pedacos[f] !== pedacos[0] && difCara.length < 5)
      difCara.push(seed + '|' + rar + '|fase' + f);
}
ok(semOlho === 0, 'todo avatar desenha o grupo dos olhos',
   semOlho ? semOlho + ' sem o grupo' : comparados + ' avatares');
ok(difCara.length === 0,
   'olhos, boca, manchas e partículas iguais nas 4 fases',
   difCara.length ? difCara.join(' ') : comparados + ' avatares × 4 fases');

/* ── O RAIO DO OLHO NÃO MUDA COM A FASE ──

   Esta asserção dizia o contrário até à 3J.8: afirmava que o raio
   MUDAVA com a raridade, porque nessa altura mudava mesmo (10/12/14) e
   o que ela guardava era o "não muda com a fase". A 3J.8 tirou a
   raridade de lá, e a metade que sobra continua a valer — o olho não
   cresce com a idade, e isso é de propósito.

   A invariância entre raridades mora no tools/testar-olhos-raridade.js,
   que mede muito mais do que o raio. */
const raiosPorFase = {};
for (const seed of SEEDS.slice(0, 12)) for (const rar of RARIDADES) for (let f = 0; f <= 3; f++) {
  const g = desenhar(seed, rar, f).match(/<g class="av-olho">[\s\S]*?(?=<g class="av-boca">)/);
  if (!g) continue;
  const rs = (g[0].match(/ r="([0-9.]+)"/g) || []).map(x => x.trim()).sort().join(',');
  (raiosPorFase[seed + '|' + rar] = raiosPorFase[seed + '|' + rar] || {})[f] = rs;
}
const faseMexeNoOlho = Object.keys(raiosPorFase).filter(k => {
  const v = raiosPorFase[k];
  return v[0] !== v[1] || v[0] !== v[2] || v[0] !== v[3];
});
ok(faseMexeNoOlho.length === 0, 'o raio do olho não muda com a fase',
   faseMexeNoOlho.length ? faseMexeNoOlho.slice(0, 3).join(' ')
     : Object.keys(raiosPorFase).length + ' avatares × 4 fases');

/* ═══════════════════ O QUE NÃO SE TOCOU ═══════════════════ */
tit('O VIEWBOX E O QUE A ETAPA PROIBIU');

const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8');

ok(/const vbH\s*=\s*temCorpoInferior \? 260 : 200;/.test(fonte),
   'o vbH continua com a pergunta que sempre teve', '260 : 200');
/* Pergunta-se pelo CÓDIGO e não pelo texto: a primeira versão procurava
   `vbH` e `FASE_GEO` na mesma linha, e a linha que encontrou foi o
   comentário que explica porque é que o vbH está fora da tabela. Um
   teste que lê comentários não testa nada. */
ok(!/\bvbH\s*:/.test(fonte) && !/G\.vbH/.test(fonte),
   'e não entrou na tabela da fase', 'o css/combate-arena.css depende de 200×260');

for (const [seed, rar] of [[1000, 'Comum'], [8919, 'Lendário']]) {
  const v = {};
  for (let f = 0; f <= 3; f++) {
    const m = desenhar(seed, rar, f).match(/viewBox="0 0 200 ([0-9]+)"/);
    v[f] = m ? m[1] : '?';
  }
  ok(v[0] === '200' && v[1] === '200' && v[2] === '260' && v[3] === '260',
     'e os desenhos saem em 200×200 / 200×260 como antes',
     'fases: ' + [0, 1, 2, 3].map(f => v[f]).join(' · '));
}

ok(/preserveAspectRatio="xMidYMid meet"/.test(fonte),
   'o preserveAspectRatio não mudou', 'xMidYMid meet');

/* Nenhum `transform` novo escrito num grupo av-* — era a armadilha que
   a 3J.3 encontrou: o CSS sobrepõe-se e o defeito só aparece sob
   prefers-reduced-motion. */
const comTransform = (fonte.match(/class="av-[a-z-]*"[^>]*transform=/g) || []);
ok(comTransform.length === 0,
   'nenhum grupo av-* ganhou um atributo transform',
   comTransform.length ? comTransform.join(' ') : 'o CSS sobrepor-se-ia a ele');

/* O random dos chifres continua onde estava, e o fator vem DEPOIS. */
ok(/alt=cH\(random\(20,35\)\), larg=cH\(random\(8,12\)\)/.test(fonte),
   'o chifre sorteia primeiro e multiplica depois',
   'cH(random(20,35)) · cH(random(8,12))');
ok(!/random\(\s*\d+\s*\*|random\([^)]*G\.|random\([^)]*cH/.test(fonte),
   'e nenhum random recebeu um fator por dentro',
   'mudar a gama do sorteio mudava a cara de todos os avatares');

/* O cE morto saiu. */
ok(!/const cE\s*=/.test(fonte), 'o cE declarado e nunca lido desapareceu',
   'o campo `cauda` da FASE_GEO ficou no lugar dele');

/* O bracoDet não leva fator: a contagem e o desenho de cada braço são
   da raridade e do sorteio, não da fase. */
ok(!/bracoDet\[i\]\[0\]\s*\*|mE\(bracoDet|cR\(bracoDet/.test(fonte),
   'o bracoDet não recebeu fator nenhum', 'é sorteio, não fase');

/* ── A SAÍDA ANTECIPADA DOS CINCO FATORES ──

   Esta asserção é sobre a FORMA do código e não sobre o resultado, e é
   de propósito: com fator 1, `v * 1` dá o mesmo número que `v`, logo
   tirar a saída antecipada não muda nada que se possa medir hoje — uma
   mutação que a removeu passou por todos os outros testes deste arquivo.

   O que ela protege é o dia em que alguém puser um fator com casas
   decimais numa fase que tem de ficar igual. Aí `100 + (v - 100) * f`
   deixa de devolver `v` por sorte, e a garantia "o Bebê não mudou"
   passaria a depender de ponto flutuante em vez de uma condição. */
const HELPERS = ['cP', 'cR', 'mE', 'tE', 'cH'];
const semGuarda = HELPERS.filter(h =>
  !new RegExp('const ' + h + ' = \\(v\\) => G\\.[a-z]+\\s*=== 1 \\? v :').test(fonte));
ok(semGuarda.length === 0, 'os cinco fatores devolvem v quando o fator é 1',
   semGuarda.length ? 'sem guarda: ' + semGuarda.join(' ') : HELPERS.join(' '));

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
