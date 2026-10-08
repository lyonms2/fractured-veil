#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O OLHO NÃO SE CONQUISTA

   Até à etapa 3J.8, o raio do olho saía da raridade:

     const tb = raridade==='Lendário' ? 14 : raridade==='Raro' ? 12 : 10;
     const t  = tb + olhoDet[i];        // olhoDet ∈ {−1, 0, 1}

   Três faixas que não se tocavam — Comum 9/10/11, Raro 11/12/13,
   Lendário 13/14/15 —, e portanto um Lendário tinha o olho uma vez e
   meia o de um Comum com a mesma seed. Isso é anatomia, e a raridade
   conquista-se num exame mensal do servidor: o bicho acordava com olhos
   maiores no dia em que o papel fosse assinado.

   Agora o `tb` é 12 para toda a gente, e o que faz os olhos de um mesmo
   bicho não serem clones é o `olhoDet`, que vem da fila principal — da
   seed, como deve.

   ── O QUE ESTE ARQUIVO CONFERE ──

   Não confere que o SVG inteiro seja igual nas três raridades: não é, e
   não deve ser. A raridade ainda acende o glow mais forte no Lendário,
   ainda conta as partículas e ainda desenha os halos da `av-aura`. O
   que tem de ser igual é O OLHO, e mede-se peça a peça:

     A1  as três raridades dão o mesmo olho
     A2  e isso vale nos 8 tipos de olho
     A3  e nas 4 fases
     A4  e com 1, 2 ou 3 olhos
     A5  a caixa do olho não mudou de lugar
     A6  a pálpebra do sono continua a assentar nele
     A7  nada de novo saiu da fila de sorteios

   ── PORQUE A6 SE PODE TESTAR SEM BROWSER ──

   A pálpebra (js/minigames.js) e o X de quem caiu (js/arena-fu.js) não
   têm número nenhum escrito: medem o olho desenhado com `getBBox()` e
   constroem-se a partir da medida. Aqui refaz-se essa conta sobre a
   geometria que o gerador escreveu — se o olho e a caixa dele andarem
   juntos, a pálpebra acompanha.

   Correr:  node tools/testar-olhos-raridade.js
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
  'return { gerarSVG, corpoDoSeed, corpoDaFila, NASC_CORPO_TRACOS };'
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

/* ── O GRUPO DOS OLHOS, SÓ ELE ──
   Do `<g class="av-olho">` até à boca. É um recorte e não um parse: o
   que interessa é comparar o mesmo pedaço entre raridades, e o `sid` já
   está normalizado fora daqui. */
function grupoDosOlhos(svg) {
  const m = svg.match(/<g class="av-olho">[\s\S]*?(?=<g class="av-boca">)/);
  return m ? m[0] : null;
}
const semSid = (s, seed) => s.split(seed + '_').join('SID').replace(/SID[0-9]+/g, 'SID');

/* ── AS PEÇAS DE CADA OLHO, UMA A UMA ──

   Cada olho é um `<g class="av-olho-un">`. Lá dentro há círculos,
   elipses e caminhos, conforme o tipo. Tira-se tudo o que é geometria:
   centros, raios e os números dos caminhos. */
function olhosDe(svg) {
  const g = grupoDosOlhos(svg);
  if (!g) return null;
  const uns = g.match(/<g class="av-olho-un"[\s\S]*?(?=<g class="av-olho-un"|$)/g) || [];
  return uns.map(u => ({
    circulos: (u.match(/<circle[^>]*>/g) || []).map(c => ({
      cx: +(c.match(/cx="([-0-9.]+)"/) || [])[1],
      cy: +(c.match(/cy="([-0-9.]+)"/) || [])[1],
      r:  +(c.match(/ r="([-0-9.]+)"/) || [])[1],
    })),
    elipses: (u.match(/<ellipse[^>]*>/g) || []).map(e => ({
      cx: +(e.match(/cx="([-0-9.]+)"/) || [])[1],
      cy: +(e.match(/cy="([-0-9.]+)"/) || [])[1],
      rx: +(e.match(/rx="([-0-9.]+)"/) || [])[1],
      ry: +(e.match(/ry="([-0-9.]+)"/) || [])[1],
    })),
    caminhos: (u.match(/ d="[^"]*"/g) || []).map(d =>
      (d.match(/-?[0-9]+(?:\.[0-9]+)?/g) || []).map(Number)),
  }));
}

/* ── A CAIXA DE UM OLHO ──
   O que o `getBBox()` daria: o envelope de tudo o que está desenhado
   dentro do `<g class="av-olho-un">`. É esta caixa que a pálpebra do
   js/minigames.js mede, e dela saem o centro e os meios-lados. */
function caixaDoOlho(olho) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const por = (x, y) => { if (!isFinite(x) || !isFinite(y)) return;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y);
    x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  for (const c of olho.circulos) { por(c.cx - c.r, c.cy - c.r); por(c.cx + c.r, c.cy + c.r); }
  for (const e of olho.elipses)  { por(e.cx - e.rx, e.cy - e.ry); por(e.cx + e.rx, e.cy + e.ry); }
  for (const d of olho.caminhos) for (let i = 0; i + 1 < d.length; i += 2) por(d[i], d[i + 1]);
  if (!isFinite(x0)) return null;
  const arr = (v) => Math.round(v * 1000) / 1000;
  return { x: arr(x0), y: arr(y0), w: arr(x1 - x0), h: arr(y1 - y0) };
}

/* ── A PÁLPEBRA, COMO O js/minigames.js A CONSTRÓI ──
     cx = b.x + b.width/2 · cy = b.y + b.height/2
     rx = hw + 2 · ry = hh + 3   (hw, hh = meios-lados)
   Não se copia a fórmula para a testar duas vezes: copia-se para provar
   que ela continua a cair sobre o olho. */
function palpebraDe(caixa) {
  const hw = caixa.w / 2, hh = caixa.h / 2;
  return { cx: caixa.x + hw, cy: caixa.y + hh, rx: hw + 2, ry: hh + 3 };
}

/* Um avatar com um corpo forçado, para se poder pedir um tipo de olho
   ou um número de olhos sem esperar que a seed calhe. O corpo entra
   pelo DNA, que é o caminho que o gerador já usa (corpoDeQuem).

   O `corpoDoSeed` leva DOIS argumentos — o avatar e a seed. Chamá-lo
   com um dava um corpo de NaN, o `switch(tipoOlho)` não casava com caso
   nenhum, e os olhos saíam como `<g class="av-olho-un"></g>` vazios: os
   testes dos 8 tipos e das três contagens passavam a comparar nada com
   nada. A guarda no fim desta função existe por causa disso. */
function avatarCom(seed, mudar) {
  const base = M.corpoDoSeed({ cor: 'roxo', seed }, seed);
  const corpo = Object.assign({}, base, mudar);
  const genes = {};
  /* O corpoDoDna lê `par[0]` de cada traço, e EXIGE os doze: se faltar
     um, devolve null e o avatar cai na seed sem avisar. */
  for (const k of M.NASC_CORPO_TRACOS) {
    if (corpo[k] === undefined || (typeof corpo[k] === 'number' && !isFinite(corpo[k]))) {
      throw new Error('traço inválido ao montar o avatar de teste: ' + k + ' = ' + corpo[k]);
    }
    genes[k] = [corpo[k], corpo[k]];
  }
  return { cor: 'roxo', seed, dna: { genes: { corpo: genes } } };
}

/* ═══════════ A1 — AS TRÊS RARIDADES ═══════════ */
tit('A1 · AS TRÊS RARIDADES DÃO O MESMO OLHO');

let difGrupo = [], comparados = 0;
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const g = RARIDADES.map(r => semSid(grupoDosOlhos(desenhar(seed, r, f)) || '', seed));
  comparados++;
  if (g[0] !== g[1] || g[0] !== g[2]) {
    if (difGrupo.length < 4) difGrupo.push(seed + '|fase' + f);
  }
}
ok(difGrupo.length === 0, 'o grupo dos olhos é idêntico nas três raridades',
   difGrupo.length ? difGrupo.join(' ') : comparados + ' avatares × 3 raridades');

/* E os números, peça a peça — um grupo igual já o prova, mas se um dia
   alguém mudar o recorte, esta continua a medir o que interessa. */
let difPeca = [];
for (const seed of SEEDS.slice(0, 30)) for (let f = 0; f <= 3; f++) {
  const o = RARIDADES.map(r => JSON.stringify(olhosDe(desenhar(seed, r, f))));
  if ((o[0] !== o[1] || o[0] !== o[2]) && difPeca.length < 4) difPeca.push(seed + '|fase' + f);
}
ok(difPeca.length === 0, 'e os círculos, elipses e caminhos também',
   difPeca.length ? difPeca.join(' ') : '30 avatares × 4 fases × 3 raridades');

/* O raio em si: um conjunto só, e o esperado. Com tb = 12 e
   olhoDet ∈ {−1, 0, 1}, os olhos exteriores medem 11, 12 ou 13. */
/* ── O MAIOR CÍRCULO, E NÃO O PRIMEIRO ──

   A primeira versão disto leu `circulos[0]` e chamou-lhe o de fora.
   Está certo em cinco dos oito tipos; nos tipos 6 e 8 o desenho começa
   por um `<path>` e o primeiro círculo é a PUPILA (`t * .3`), logo o
   teste acusou 3,3 / 3,6 / 3,9 como se fossem raios de olho. Era o
   teste a estar errado, não o gerador.

   Toma-se o MAIOR, e só se conta quando ele chega aos 9: abaixo disso o
   tipo não tem círculo exterior nenhum e o maior é uma pupila. A íris
   mede `t * .75`, ou seja 8,25 a 9,75 — por isso o corte vai nos 10,
   que fica acima dela e abaixo do menor `t` possível, que é 11. */
const raiosVistos = new Set();
for (const seed of SEEDS) for (const r of RARIDADES) {
  for (const o of (olhosDe(desenhar(seed, r, 2)) || [])) {
    const rs = o.circulos.map(c => c.r).filter(isFinite);
    if (!rs.length) continue;
    const maior = Math.max(...rs);
    if (maior >= 10) raiosVistos.add(maior);
  }
}
const fora = [...raiosVistos].filter(v => ![11, 12, 13].includes(v));
ok(raiosVistos.size > 0 && fora.length === 0,
   'e o raio de fora é sempre 11, 12 ou 13',
   fora.length ? 'fora da faixa: ' + fora.join(',')
     : [...raiosVistos].sort((a, b) => a - b).join(', ') + '  (tb 12 ± olhoDet)');

/* ═══════════ A2 — OS OITO TIPOS ═══════════ */
tit('A2 · OS OITO TIPOS DE OLHO');

let tiposIguais = 0, tiposDif = [], tiposVistos = [];
for (let tipo = 1; tipo <= 8; tipo++) {
  const av = avatarCom(SEEDS[0], { tipoOlho: tipo, numOlhos: 2 });
  const g = RARIDADES.map(r => semSid(grupoDosOlhos(desenhar(SEEDS[0], r, 2, av)) || '', SEEDS[0]));
  if (g[0] && g[0] === g[1] && g[0] === g[2]) tiposIguais++; else tiposDif.push(tipo);
  tiposVistos.push(g[0] ? g[0].length : 0);
}
ok(tiposIguais === 8, 'os 8 tipos dão o mesmo olho nas três raridades',
   tiposDif.length ? 'difere nos tipos ' + tiposDif.join(',') : '8/8');

/* E os 8 continuam DIFERENTES entre si: tirar a raridade não pode ter
   achatado os tipos uns nos outros. */
const assinaturas = new Set(tiposVistos);
ok(assinaturas.size >= 6, 'e os 8 tipos continuam distintos entre si',
   tiposVistos.length + ' tipos · ' + assinaturas.size + ' tamanhos de desenho distintos');

/* ═══════════ A3 — AS QUATRO FASES ═══════════ */
tit('A3 · AS QUATRO FASES');

let faseMexeu = [];
for (const seed of SEEDS.slice(0, 40)) for (const r of RARIDADES) {
  const g = [0, 1, 2, 3].map(f => semSid(grupoDosOlhos(desenhar(seed, r, f)) || '', seed));
  if (!(g[0] === g[1] && g[0] === g[2] && g[0] === g[3]) && faseMexeu.length < 4) {
    faseMexeu.push(seed + '|' + r);
  }
}
ok(faseMexeu.length === 0, 'o olho não muda do bebê ao ancião',
   faseMexeu.length ? faseMexeu.join(' ') : '40 avatares × 3 raridades × 4 fases');

/* ═══════════ A4 — UM, DOIS OU TRÊS OLHOS ═══════════ */
tit('A4 · UM, DOIS OU TRÊS OLHOS');

for (const n of [1, 2, 3]) {
  const av = avatarCom(SEEDS[1], { numOlhos: n });
  const contas = RARIDADES.map(r =>
    ((grupoDosOlhos(desenhar(SEEDS[1], r, 2, av)) || '').match(/class="av-olho-un"/g) || []).length);
  ok(contas.every(c => c === n), 'com ' + n + ' olho(s), as três raridades desenham ' + n,
     'Comum/Raro/Lendário: ' + contas.join('/'));
}

/* E a posição: um olho ao centro, dois ou três espalhados de 70 a 130. */
const posPorN = {};
for (const n of [1, 2, 3]) {
  const av = avatarCom(SEEDS[1], { numOlhos: n });
  posPorN[n] = RARIDADES.map(r => (olhosDe(desenhar(SEEDS[1], r, 2, av)) || [])
    .map(o => caixaDoOlho(o)).map(b => b && Math.round((b.x + b.w / 2) * 100) / 100).join(','));
}
const posIguais = [1, 2, 3].every(n => posPorN[n][0] === posPorN[n][1] && posPorN[n][0] === posPorN[n][2]);
ok(posIguais, 'e os centros caem no mesmo lugar nas três',
   '1 olho: ' + posPorN[1][0] + ' · 2: ' + posPorN[2][0] + ' · 3: ' + posPorN[3][0]);

/* ═══════════ A5 — A CAIXA DO OLHO ═══════════ */
tit('A5 · A CAIXA QUE O getBBox MEDIRIA');

let caixaDif = [], caixasVistas = 0;
for (const seed of SEEDS.slice(0, 40)) for (let f = 0; f <= 3; f++) {
  const cx = RARIDADES.map(r => JSON.stringify(
    (olhosDe(desenhar(seed, r, f)) || []).map(caixaDoOlho)));
  caixasVistas++;
  if ((cx[0] !== cx[1] || cx[0] !== cx[2]) && caixaDif.length < 4) caixaDif.push(seed + '|fase' + f);
}
ok(caixaDif.length === 0, 'a caixa de cada olho é a mesma nas três raridades',
   caixaDif.length ? caixaDif.join(' ') : caixasVistas + ' avatares × 3 raridades');

/* A caixa tem de ser NÃO VAZIA: o renderSleepEyes desiste quando
   `!b.width`, e um olho sem largura deixava o bicho a dormir sem
   pálpebras e ninguém dava por isso. */
let semLargura = 0, caixas = 0;
for (const seed of SEEDS) for (const r of RARIDADES) {
  for (const o of (olhosDe(desenhar(seed, r, 2)) || [])) {
    const b = caixaDoOlho(o); caixas++;
    if (!b || !b.w || !b.h) semLargura++;
  }
}
ok(semLargura === 0, 'e nenhuma caixa sai sem largura ou sem altura',
   caixas + ' olhos medidos · ' + semLargura + ' vazias');

/* ── O OLHO CONTINUA ANCORADO EM y = 95 ──

   A primeira versão desta asserção pediu que o CENTRO DA CAIXA fosse 95
   em todos, e apanhou um 92 que está certo: o tipo 6 é um triângulo de
   vértice para cima (`95 − t` em cima, `95 + t*.5` em baixo), portanto é
   assimétrico na vertical e a caixa dele centra-se acima da âncora.
   Isso é anterior à 3J.8 e é o desenho a ser o que é.

   O que se mede, então, são as duas coisas verdadeiras: a âncora está
   escrita no gerador, e a caixa — seja ela simétrica ou não — cai no
   mesmo lugar nas três raridades. */
const centrosY = {};
for (const seed of SEEDS.slice(0, 20)) for (const r of RARIDADES)
  for (const o of (olhosDe(desenhar(seed, r, 2)) || [])) {
    const b = caixaDoOlho(o);
    if (b) (centrosY[r] = centrosY[r] || new Set()).add(Math.round(b.y + b.h / 2));
  }
const chaveC = (r) => [...(centrosY[r] || [])].sort((a, b) => a - b).join(',');
ok(chaveC('Comum') === chaveC('Raro') && chaveC('Comum') === chaveC('Lendário')
   && chaveC('Comum').length > 0,
   'e os centros verticais são os mesmos nas três',
   'vistos: ' + chaveC('Comum') + '  (92 é o triângulo, que não é simétrico)');
ok(/cy="95"/.test(fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8')),
   'e a âncora continua escrita em y = 95', 'cy="95" no gerador');

/* ═══════════ A6 — A PÁLPEBRA ═══════════ */
tit('A6 · A PÁLPEBRA DO SONO ASSENTA NO OLHO');

let palDif = [], palFora = [];
for (const seed of SEEDS.slice(0, 40)) for (const r of RARIDADES) {
  const olhos = olhosDe(desenhar(seed, r, 2)) || [];
  const pals = olhos.map(o => { const b = caixaDoOlho(o); return b && palpebraDe(b); });
  /* A pálpebra tem de COBRIR o olho: 2 de folga na largura, 3 na
     altura — é o que o js/minigames.js escreve. */
  for (let i = 0; i < olhos.length; i++) {
    const b = caixaDoOlho(olhos[i]), p = pals[i];
    if (!b || !p) continue;
    if (p.rx < b.w / 2 || p.ry < b.h / 2) palFora.push(seed + '|' + r + '|olho' + i);
  }
  if (r !== 'Comum') {
    const base = (olhosDe(desenhar(seed, 'Comum', 2)) || [])
      .map(o => { const b = caixaDoOlho(o); return b && palpebraDe(b); });
    if (JSON.stringify(pals) !== JSON.stringify(base) && palDif.length < 4) {
      palDif.push(seed + '|' + r);
    }
  }
}
ok(palFora.length === 0, 'a pálpebra cobre o olho em todos os casos',
   palFora.length ? palFora.slice(0, 3).join(' ') : 'folga de 2 na largura e 3 na altura');
ok(palDif.length === 0, 'e é a mesma pálpebra nas três raridades',
   palDif.length ? palDif.join(' ') : '40 avatares × 3 raridades');

/* ═══════════ A7 — A FILA NÃO MUDOU ═══════════ */
tit('A7 · A FILA DE SORTEIOS');

/* O olho não sorteia: o `olhoDet` sai do corpoDaFila, à contagem máxima
   de três, e o laço do desenho só o lê. Se alguém puser um random aqui,
   tudo o que vem depois dos olhos — a boca, as manchas, as partículas —
   desloca-se. */
const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8');
const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const blocoDosOlhos = (semComentarios.match(
  /s \+= `<g class="av-olho">`;[\s\S]*?(?=s \+= `<g class="av-boca">`;)/) || [''])[0];
ok(blocoDosOlhos.length > 0 && !/random\(/.test(blocoDosOlhos),
   'o bloco dos olhos não chama random',
   blocoDosOlhos.length + ' caracteres · 0 chamadas');

/* E o que vem DEPOIS dos olhos continua igual entre raridades a menos
   do que a raridade legitimamente ainda decide. Prova-se pelo contrário:
   a boca, que não é raridade, tem de bater nas três. */
let bocaDif = [];
for (const seed of SEEDS.slice(0, 40)) {
  const b = RARIDADES.map(r => {
    const m = desenhar(seed, r, 2).match(/<g class="av-boca">[\s\S]*?(?=<g class="av-mancha">)/);
    return m ? semSid(m[0], seed) : null;
  });
  if ((b[0] !== b[1] || b[0] !== b[2]) && bocaDif.length < 4) bocaDif.push(String(seed));
}
ok(bocaDif.length === 0, 'e a boca, logo a seguir, continua igual nas três',
   bocaDif.length ? bocaDif.join(' ') : '40 avatares · nada se deslocou');

/* ═══════════ A FONTE ═══════════ */
tit('O QUE A FONTE DIZ');

const bloco = blocoDosOlhos;
ok(!/raridade/.test(bloco), 'o bloco dos olhos não pergunta a raridade',
   'nem direta nem por helper');
ok(!/grauDaRaridade|RARIDADE_GRAU|\bgrau\b/.test(bloco),
   'e não pergunta o grau dela', 'o grau saiu do gerador na 3J.6');
ok(/const tb = 12;/.test(semComentarios), 'o raio de base é um número só',
   'tb = 12, a mediana dos antigos 10/12/14');
ok(/const t = tb \+ olhoDet\[i\];/.test(semComentarios),
   'e o olhoDet continua a dar a variação', 'random(-1,1), da fila principal');

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
