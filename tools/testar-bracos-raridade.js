#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O BRAÇO NÃO ENGROSSA COM O CERTIFICADO

   Até à etapa 3J.9, a espessura do braço saía da raridade:

     stroke-width="${raridade==='Lendário' ? 8 : 6}"

   Um Lendário tinha o braço um terço mais grosso que um Comum com a
   mesma seed, e ganhava-o no dia em que o exame mensal do servidor
   assinasse o papel. Passou a 6 para todos — o valor que o Comum e o
   Raro já tinham, portanto a mudança atingiu só o Lendário.

   ── O QUE AINDA É RARIDADE NO BRAÇO, E FICA ──

   A GARRA. Ela é uma `<line>` à parte, com `stroke-width="3"` fixo, e
   só aparece em quem não é Comum. A espessura dela nunca foi raridade;
   a EXISTÊNCIA dela ainda é, e sai em etapa própria. Este arquivo
   confere que a 3J.9 não lhe tocou — nem para a tirar, nem para a
   mudar.

   ── O QUE CRESCE, E É LEGÍTIMO ──

   O COMPRIMENTO. O `mE()` da FASE_GEO estica o braço do Ancião em 10%
   (os 50 e os 65 da extensão lateral). Isso é idade, não raridade, e
   tem de continuar — um teste que exigisse braços iguais nas 4 fases
   estaria a defender o contrário do que o projeto decidiu.

   ── O QUE SE CONFERE ──

     A1  as três raridades dão o mesmo braço
     A2  e isso vale de 2 a 8 braços
     A3  a fase continua a esticar, e só ela
     A4  o bracoDet continua a desenhar a curva
     A5  as âncoras e as pontas não se mexeram
     A6  a garra ficou exatamente como estava
     A7  a geometria não mudou — só a espessura do traço

   Correr:  node tools/testar-bracos-raridade.js
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);

const M = new Function('t',
  rd('cores.js') + rd('data.js') + rd('nascimento.js') + rd('ficha-fu.js') +
  rd('raridade.js') + rd('reproducao.js') + rd('identidade.js') +
  LINHAS_DA_FASE + NL +
  'return { gerarSVG, corpoDoSeed, NASC_CORPO_TRACOS, FASE_GEO };'
)(x => x);

const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const SEEDS = [];
for (let i = 0; i < 60; i++) SEEDS.push(1000 + i * 7919);

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK    ' + titulo.padEnd(54) + ' · ' + (detalhe || '')); }
  else      { falhou++; console.log('  FALHOU ' + titulo.padEnd(53) + ' · ' + (detalhe || '')); }
}
const tit = (x) => console.log(NL + '─── ' + x + ' ' + '─'.repeat(Math.max(0, 56 - x.length)));

const desenhar = (seed, rar, fase, av) =>
  M.gerarSVG(av || { cor: 'roxo', seed }, rar, seed, 120, 120, fase);
const semSid = (s, seed) => s.split(seed + '_').join('SID').replace(/SID[0-9]+/g, 'SID');

/* ── O GRUPO DOS BRAÇOS ──
   Do `<g class="av-braco">` até ao corpo de cima, que vem logo a
   seguir. Lá dentro há um `<g class="av-membro">` por braço. */
function grupoDosBracos(svg) {
  const m = svg.match(/<g class="av-braco">[\s\S]*?(?=<g class="av-corpo">)/);
  return m ? m[0] : null;
}

/* ── UM BRAÇO, PEÇA A PEÇA ──

   O caminho `M sx sy Q mx my ex ey` dá a âncora, o controlo e a ponta;
   o `stroke-width` do `<path>` é a espessura do braço, e o da `<line>`
   é a da garra. Separam-se de propósito: a etapa muda o primeiro e tem
   de deixar o segundo em paz. */
function bracosDe(svg) {
  const g = grupoDosBracos(svg);
  if (!g) return null;
  const uns = g.match(/<g class="av-membro"[\s\S]*?(?=<g class="av-membro"|$)/g) || [];
  return uns.map(u => {
    const caminho = (u.match(/<path d="M ([-0-9.]+) ([-0-9.]+) Q ([-0-9.]+) ([-0-9.]+) ([-0-9.]+) ([-0-9.]+)"/) || []);
    const espBraco = (u.match(/<path[^>]*stroke-width="([0-9.]+)"/) || [])[1];
    const garra = (u.match(/<line x1="([-0-9.]+)" y1="([-0-9.]+)" x2="([-0-9.]+)" y2="([-0-9.]+)"[^>]*stroke-width="([0-9.]+)"/) || []);
    return {
      sx: +caminho[1], sy: +caminho[2], mx: +caminho[3], my: +caminho[4],
      ex: +caminho[5], ey: +caminho[6],
      espessura: espBraco === undefined ? null : +espBraco,
      garra: garra.length ? { x1: +garra[1], y1: +garra[2], x2: +garra[3],
                              y2: +garra[4], espessura: +garra[5] } : null,
      /* O `--i`, que o CSS usa para desencontrar o balanço. */
      i: +((u.match(/style="--i:([0-9]+)"/) || [])[1]),
    };
  });
}
/* A geometria sozinha, sem a espessura: é o que tem de ser igual nas
   três raridades mesmo antes desta etapa. */
const soGeometria = (b) => b.map(x => [x.sx, x.sy, x.mx, x.my, x.ex, x.ey, x.i].join(','));

/* Um avatar com um corpo forçado, para pedir um número de braços sem
   esperar que a seed calhe. O `corpoDoSeed` leva DOIS argumentos — o
   avatar e a seed —, e a guarda no fim existe porque chamá-lo com um
   devolve NaN em silêncio e o teste passa a comparar nada com nada. */
function avatarCom(seed, mudar) {
  const base = M.corpoDoSeed({ cor: 'roxo', seed }, seed);
  const corpo = Object.assign({}, base, mudar);
  const genes = {};
  for (const k of M.NASC_CORPO_TRACOS) {
    if (corpo[k] === undefined || (typeof corpo[k] === 'number' && !isFinite(corpo[k]))) {
      throw new Error('traço inválido ao montar o avatar de teste: ' + k + ' = ' + corpo[k]);
    }
    genes[k] = [corpo[k], corpo[k]];
  }
  return { cor: 'roxo', seed, dna: { genes: { corpo: genes } } };
}

/* ═══════════ A1 — AS TRÊS RARIDADES ═══════════ */
tit('A1 · AS TRÊS RARIDADES DÃO O MESMO BRAÇO');

/* A espessura, primeiro: é o que a etapa mudou. */
const espVistas = {};
for (const seed of SEEDS) for (const r of RARIDADES) for (let f = 0; f <= 3; f++) {
  for (const b of (bracosDe(desenhar(seed, r, f)) || []))
    (espVistas[r] = espVistas[r] || new Set()).add(b.espessura);
}
const chave = (r) => [...(espVistas[r] || [])].sort((a, b) => a - b).join(',');
ok(chave('Comum') === chave('Raro') && chave('Comum') === chave('Lendário')
   && chave('Comum') === '6',
   'a espessura do braço é 6 nas três raridades',
   'Comum ' + chave('Comum') + ' · Raro ' + chave('Raro') + ' · Lendário ' + chave('Lendário'));

/* E o braço inteiro: âncora, controlo, ponta, espessura e o --i. */
let difBraco = [], comparados = 0;
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const b = RARIDADES.map(r => {
    const arr = bracosDe(desenhar(seed, r, f)) || [];
    /* Sem a garra: a existência dela ainda é raridade, e isso fica para
       a etapa dela. O que se compara aqui é o BRAÇO. */
    return JSON.stringify(arr.map(x => Object.assign({}, x, { garra: undefined })));
  });
  comparados++;
  if ((b[0] !== b[1] || b[0] !== b[2]) && difBraco.length < 4) difBraco.push(seed + '|fase' + f);
}
ok(difBraco.length === 0, 'e o braço inteiro é idêntico nas três',
   difBraco.length ? difBraco.join(' ') : comparados + ' avatares × 3 raridades');

/* ═══════════ A2 — DE DOIS A OITO BRAÇOS ═══════════ */
tit('A2 · DE DOIS A OITO BRAÇOS');

let contasOk = 0, contasMa = [];
for (let n = 2; n <= 8; n++) {
  const av = avatarCom(SEEDS[3], { numBracos: n });
  const vistas = RARIDADES.map(r => (bracosDe(desenhar(SEEDS[3], r, 2, av)) || []).length);
  const esp = RARIDADES.map(r => [...new Set((bracosDe(desenhar(SEEDS[3], r, 2, av)) || [])
    .map(b => b.espessura))].join('/'));
  if (vistas.every(v => v === n) && esp.every(e => e === '6')) contasOk++;
  else contasMa.push(n + ': ' + vistas.join('/') + ' esp ' + esp.join('/'));
}
ok(contasOk === 7, 'de 2 a 8 braços, a conta e a espessura batem nas três',
   contasMa.length ? contasMa.join(' | ') : '7 contagens × 3 raridades');

/* O `--i` tem de ir de 0 a n−1, em ordem: é ele que o CSS usa para
   desencontrar o balanço, e um salto deixava dois braços em uníssono. */
const av8 = avatarCom(SEEDS[3], { numBracos: 8 });
const is = (bracosDe(desenhar(SEEDS[3], 'Comum', 2, av8)) || []).map(b => b.i);
ok(is.join(',') === '0,1,2,3,4,5,6,7', 'e o --i continua a numerá-los por ordem',
   is.join(','));

/* ═══════════ A3 — A FASE AINDA ESTICA ═══════════ */
tit('A3 · A FASE CONTINUA A ESTICAR, E SÓ ELA');

/* A espessura NÃO muda com a fase, e não mudava antes desta etapa. */
let espPorFase = new Set();
for (const seed of SEEDS.slice(0, 30)) for (const r of RARIDADES) for (let f = 0; f <= 3; f++)
  for (const b of (bracosDe(desenhar(seed, r, f)) || [])) espPorFase.add(b.espessura);
ok(espPorFase.size === 1 && espPorFase.has(6), 'a espessura não muda com a fase',
   'vistas: ' + [...espPorFase].join(', '));

/* O COMPRIMENTO muda, e tem de mudar: o mE() da FASE_GEO estica o
   Ancião. A ponta do primeiro braço (lado esquerdo) está em
   100 − 65 × membro. */
const pontaEsq = (seed, r, f) => {
  const b = (bracosDe(desenhar(seed, r, f)) || [])[0];
  return b ? b.ex : null;
};
const esperado3 = Math.round((100 - 65 * M.FASE_GEO[3].membro) * 100) / 100;
let pontas = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set() };
for (const seed of SEEDS) for (const r of RARIDADES) for (let f = 0; f <= 3; f++) {
  const p = pontaEsq(seed, r, f);
  if (p !== null) pontas[f].add(p);
}
const umSo = (f) => pontas[f].size === 1 ? [...pontas[f]][0] : null;
ok(umSo(0) === 35 && umSo(1) === 35 && umSo(2) === 35,
   'o braço do bebê, do jovem e do adulto acaba nos 35',
   [0, 1, 2].map(f => umSo(f)).join(' · '));
ok(umSo(3) === esperado3 && esperado3 !== 35,
   'e o do ancião estica, como a 3J.4 mandou',
   umSo(3) + ' · esperado ' + esperado3 + ' (65 × ' + M.FASE_GEO[3].membro + ')');

/* ═══════════ A4 — O bracoDet ═══════════ */
tit('A4 · O bracoDet CONTINUA A DESENHAR A CURVA');

/* O `my` e o `ey` de cada braço saem de `brAnchorY + off + bracoDet[i][0|1]`.
   Se o bracoDet tivesse levado fator, os braços de um mesmo avatar
   passavam a ter todos a mesma curvatura. */
const curvas = new Set();
for (const b of (bracosDe(desenhar(SEEDS[3], 'Comum', 2, av8)) || [])) {
  curvas.add((b.my - b.sy) + ':' + (b.ey - b.sy));
}
ok(curvas.size >= 4, 'os oito braços têm curvaturas diferentes entre si',
   curvas.size + ' curvas distintas em 8 braços');

let curvaDif = [];
for (const seed of SEEDS.slice(0, 40)) for (let f = 0; f <= 3; f++) {
  const c = RARIDADES.map(r => (bracosDe(desenhar(seed, r, f)) || [])
    .map(b => (b.my - b.sy) + ':' + (b.ey - b.sy)).join('|'));
  if ((c[0] !== c[1] || c[0] !== c[2]) && curvaDif.length < 4) curvaDif.push(seed + '|fase' + f);
}
ok(curvaDif.length === 0, 'e são as mesmas nas três raridades',
   curvaDif.length ? curvaDif.join(' ') : '40 avatares × 4 fases');

/* ═══════════ A5 — AS ÂNCORAS E AS PONTAS ═══════════ */
tit('A5 · AS ÂNCORAS E AS PONTAS NÃO SE MEXERAM');

/* A âncora sai do brAnchorR e do brAnchorY da FASE_GEO, e o
   espaçamento vertical é 15 por par. Nada disso é raridade. */
let ancDif = [];
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const a = RARIDADES.map(r => (bracosDe(desenhar(seed, r, f)) || [])
    .map(b => b.sx + ',' + b.sy).join('|'));
  if ((a[0] !== a[1] || a[0] !== a[2]) && ancDif.length < 4) ancDif.push(seed + '|fase' + f);
}
ok(ancDif.length === 0, 'as âncoras são as mesmas nas três raridades',
   ancDif.length ? ancDif.join(' ') : '60 avatares × 4 fases');

/* E batem com o que a FASE_GEO diz. */
const G = M.FASE_GEO;
const ancEsperada = (f) => 100 - G[f].brAnchorR;
let ancBate = 0;
for (let f = 0; f <= 3; f++) {
  const b = (bracosDe(desenhar(SEEDS[0], 'Comum', f)) || [])[0];
  if (b && b.sx === ancEsperada(f) && b.sy === G[f].brAnchorY) ancBate++;
}
ok(ancBate === 4, 'e saem do brAnchorR e do brAnchorY da FASE_GEO',
   [0, 1, 2, 3].map(f => ancEsperada(f) + '/' + G[f].brAnchorY).join(' · '));

/* ═══════════ A6 — A GARRA ═══════════ */
tit('A6 · O BRAÇO NÃO LEVA MAIS NADA')

/* ── A GARRA SAIU NA 3J.10 ──

   Esta secção dizia o contrário: guardava que o Comum não tinha garra e
   os outros dois tinham. Estava certa enquanto a 3J.9 corria, porque a
   ordem era NÃO tocar na garra — mas a regra que ela guardava era a
   raridade a decidir anatomia, e a 3J.10 revogou-a.

   A garra não foi substituída: não havia traço nenhum que a pudesse
   determinar sem inventar genética. Ver o comentário no js/data.js e o
   tools/testar-garra-raridade.js, que é quem guarda a ausência dela.

   O que fica aqui é a regressão do BRAÇO: dentro de um `.av-membro` há
   um `<path>` e mais nada. Se alguém acrescentar uma peça ao braço sem
   dizer de onde ela vem, falha aqui. */
let comExtra = [], bracosVistos = 0;
for (const seed of SEEDS) for (const r of RARIDADES) {
  for (const b of (bracosDe(desenhar(seed, r, 2)) || [])) {
    bracosVistos++;
    if (b.garra && comExtra.length < 4) comExtra.push(seed + '|' + r);
  }
}
ok(comExtra.length === 0, 'nenhum braço leva uma peça a mais',
   comExtra.length ? comExtra.join(' ') : bracosVistos + ' braços nas três raridades');

/* ═══════════ A7 — SÓ A ESPESSURA MUDOU ═══════════ */
tit('A7 · A GEOMETRIA NÃO MUDOU');

/* O `getBBox()` devolve a caixa da GEOMETRIA e não inclui o traço — por
   isso mudar o stroke-width de 8 para 6 não mexe em nada do que o
   `_afAssentar` mede. Prova-se pelo caminho: os seis números do `M … Q`
   são os mesmos nas três raridades, e são eles que fazem a caixa. */
let geoDif = [];
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const g = RARIDADES.map(r => soGeometria(bracosDe(desenhar(seed, r, f)) || []).join('|'));
  if ((g[0] !== g[1] || g[0] !== g[2]) && geoDif.length < 4) geoDif.push(seed + '|fase' + f);
}
ok(geoDif.length === 0, 'a geometria do braço é idêntica nas três raridades',
   geoDif.length ? geoDif.join(' ') : '60 avatares × 4 fases × 3 raridades');

/* E o resto do desenho não se deslocou: o corpo vem logo a seguir aos
   braços, e tem de bater nas três. */
let corpoDif = [];
for (const seed of SEEDS.slice(0, 40)) {
  const c = RARIDADES.map(r => {
    const m = desenhar(seed, r, 2).match(/<g class="av-corpo">(?:(?!<\/g>)[\s\S])*<\/g>\s*<g class="av-espinho">/);
    return m ? semSid(m[0], seed) : null;
  });
  if ((c[0] !== c[1] || c[0] !== c[2]) && corpoDif.length < 4) corpoDif.push(String(seed));
}
ok(corpoDif.length === 0, 'e o corpo, logo a seguir, continua igual nas três',
   corpoDif.length ? corpoDif.join(' ') : '40 avatares · nada se deslocou');

/* ═══════════ A FONTE ═══════════ */
tit('O QUE A FONTE DIZ');

const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8');
const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const laco = (semComentarios.match(
  /s \+= `<g class="av-braco">`;[\s\S]*?(?=s \+= `<g class="av-corpo">`;)/) || [''])[0];

ok(laco.length > 0 && !/stroke-width="\$\{[^}]*raridade/.test(laco),
   'nenhum stroke-width do braço pergunta a raridade',
   laco.length + ' caracteres no laço');
ok(/stroke-width="6"/.test(laco), 'a espessura do braço é um número só', '6');
ok(!/random\(/.test(laco), 'e o laço não chama random',
   'o bracoDet já vem sorteado, à contagem máxima de 8');
/* E a raridade já não aparece no laço de todo: a espessura saiu na 3J.9
   e a garra na 3J.10, logo não resta nada aqui que a leia. */
ok(!/raridade/.test(laco), 'e a raridade não aparece no laço dos braços',
   'a espessura saiu na 3J.9, a garra na 3J.10');

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
