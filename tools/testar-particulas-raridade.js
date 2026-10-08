#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AS PARTÍCULAS SAEM DA CAIXA DO DESENHO, E SÓ NA ARENA

   O `_afAssentar` (js/arena-fu.js) mede o SVG inteiro com `getBBox()`
   para assentar os pés no chão e para calcular o `--cabeca` onde o nome
   se pendura. As partículas da raridade vivem dentro desse SVG, são 5,
   9 ou 14 conforme Comum, Raro ou Lendário, e espalham-se de 20 a 180
   numa caixa de 200 — logo entram na medida, e muitas vezes são o que
   está mais longe do centro.

   Medido na 3J.11, entre um Comum e um Lendário com a mesma seed e a
   mesma fase, em 60 casos:

     fundo da tinta    diferia em  7/60, até 39,5 unidades
     --cabeca          diferia em 45/60, até 41,5 unidades

   A raridade mexia no lugar do avatar. Depois desta etapa, medido com a
   arena real nos mesmos 60 casos: 0, 0 e 0.

   ── PORQUE SÓ NA ARENA ──

   O `gerarSVG` tem 35 chamadas em 16 arquivos, e só uma delas mede o
   SVG inteiro: esta. Nas outras trinta e quatro telas ninguém pede a
   caixa, logo as partículas não fazem mal a ninguém. É a mesma decisão
   que a `av-aura` já tinha — o gerador desenha-a e a arena esconde-a.

   ── PORQUE UM SEGUNDO <svg> E NÃO A .cb-efeitos-tras ──

   Medido com a arena real, a posição da primeira partícula:

     hoje, dentro do SVG       −42,6 · −126    tamanho 3,4 × 3,2
     2.º <svg> no .cb-corpo    −42,6 · −126    tamanho 3,4 × 3,2
     na .cb-efeitos-tras        −3,3 · −90,9   tamanho 4,6 × 4,5

   A camada de efeitos mede 5,6 × 7,28 rem contra os 5,2 × 6,76 do
   corpo, e está presa a um `translate` fixo enquanto o corpo é assentado
   dinamicamente. O segundo SVG herda o `.cb-corpo svg` do CSS, portanto
   tem a mesma caixa — e as coordenadas 20–180 continuam a querer dizer
   o mesmo. Não há conversão a fazer, e é por não haver que é seguro.

   Correr:  node tools/testar-particulas-raridade.js
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');
const LINHAS_DA_FASE = require('./fase.js').linhasDaFase(RAIZ);

/* A tela de faz-de-conta: o js/arena-fu.js pendura dois ouvintes no
   topo e mais nada corre sem ser chamado. O `_afCorpo` é uma função de
   string. */
const nada = () => {};
const elFalso = () => ({
  classList: { toggle: nada, contains: () => false, add: nada, remove: nada },
  style: { setProperty: nada }, querySelector: () => null, querySelectorAll: () => [],
  appendChild: nada, insertBefore: nada, remove: nada, insertAdjacentHTML: nada,
  getBoundingClientRect: () => ({}), innerHTML: '', firstChild: null,
  setAttribute: nada, dataset: {},
});
const win = { addEventListener: nada, removeEventListener: nada, requestAnimationFrame: nada,
              setTimeout: nada, clearTimeout: nada, innerWidth: 1200, innerHeight: 800,
              matchMedia: () => ({ matches: false, addEventListener: nada }) };
const doc = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
              createElement: elFalso, createElementNS: elFalso,
              addEventListener: nada, removeEventListener: nada,
              body: elFalso(), documentElement: elFalso() };

const M = new Function('window', 'document', 't', 'esc', 'navigator', 'localStorage',
  rd('cores.js') + rd('data.js') + rd('nascimento.js') + rd('ficha-fu.js') +
  rd('combate-fu.js') + rd('raridade.js') + rd('reproducao.js') + rd('identidade.js') +
  LINHAS_DA_FASE + NL + rd('arena-fu.js') + NL +
  'return { _afCorpo, gerarSVG };'
)(win, doc, (k) => k, (s) => String(s), { userAgent: 'node' },
  { getItem: () => null, setItem: nada });

const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const ESPERADO = { 'Comum': 5, 'Raro': 9, 'Lendário': 14 };
const SEEDS = [];
for (let i = 0; i < 40; i++) SEEDS.push(1000 + i * 7919);

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK    ' + titulo.padEnd(54) + ' · ' + (detalhe || '')); }
  else      { falhou++; console.log('  FALHOU ' + titulo.padEnd(53) + ' · ' + (detalhe || '')); }
}
const tit = (x) => console.log(NL + '─── ' + x + ' ' + '─'.repeat(Math.max(0, 56 - x.length)));

/* Um lutador como o `_afCorpo` o recebe. */
const lutador = (seed, raridade, nivel) =>
  ({ id: 'x', ficha: { raridade, seed, nivel: nivel || 1 } });

const corpo = (seed, rar, nivel) => M._afCorpo(lutador(seed, rar, nivel));

/* O desenho parte-se em dois: o SVG do corpo e o `.cb-part`. */
function partes(html) {
  const i = html.indexOf('<svg class="cb-part"');
  return i === -1 ? { corpo: html, part: null }
                  : { corpo: html.slice(0, i), part: html.slice(i) };
}
/* O grupo, com a sua própria tag de fecho. Não se usa o
   `lastIndexOf('</g>')`: no SVG do corpo há o `</g>` da raiz a seguir e
   no `.cb-part` não há, portanto o mesmo recorte dava coisas diferentes
   nos dois — e a comparação entre eles passava a ser impossível. As
   partículas não têm `<g>` dentro, logo o PRIMEIRO fecho a seguir é o
   delas. */
const grupoDasParticulas = (svg) => {
  /* Devolve '' e nao rebenta quando nao ha camada: um teste que rebenta
     nao imprime contagem nenhuma, e quem corre mutacoes le isso como
     "passou". Ja aconteceu neste projeto. */
  if (!svg) return '';
  const i = svg.indexOf('<g class="av-particula">');
  if (i === -1) return '';
  const j = svg.indexOf('</g>', i);
  return j === -1 ? svg.slice(i) : svg.slice(i, j + 4);
};
const conta = (s) => (s.match(/<(path|ellipse|rect|circle) /g) || []).length;

/* ═══════════ A CAMADA EXISTE E SEPARA ═══════════ */
tit('O DESENHO SAI EM DOIS');

let semPart = [], comparados = 0;
for (const seed of SEEDS) for (const r of RARIDADES) for (const nv of [1, 15, 40]) {
  const p = partes(corpo(seed, r, nv));
  comparados++;
  if (!p.part && semPart.length < 4) semPart.push(seed + '|' + r + '|nv' + nv);
}
ok(semPart.length === 0, 'todo avatar da arena leva a camada das partículas',
   semPart.length ? semPart.join(' ') : comparados + ' avatares');

/* O corpo continua a ser o PRIMEIRO svg — o `_afAssentar` e o
   `_afOlhosEmX` pedem `querySelector('svg')`, que devolve esse. */
const umExemplo = corpo(SEEDS[0], 'Lendário', 20);
ok(umExemplo.indexOf('<svg') === 0
   && umExemplo.indexOf('<svg class="cb-part"') > umExemplo.indexOf('</svg>'),
   'e o corpo vem primeiro, a camada depois',
   'o querySelector(\'svg\') do _afAssentar apanha o corpo');

/* ═══════════ AS CONTAGENS ═══════════ */
tit('AS CONTAGENS POR RARIDADE');

for (const r of RARIDADES) {
  const vistas = new Set();
  for (const seed of SEEDS) {
    const p = partes(corpo(seed, r, 20));
    vistas.add(conta(grupoDasParticulas(p.part) || ''));
  }
  ok(vistas.size === 1 && vistas.has(ESPERADO[r]),
     'o ' + r + ' leva ' + ESPERADO[r] + ' partículas externas',
     [...vistas].join(',') + ' em ' + SEEDS.length + ' avatares');
}

/* ═══════════ A CÓPIA É FIEL ═══════════ */
tit('A CAMADA É A MESMA COISA, NO MESMO SÍTIO');

/* O grupo que fica escondido no corpo e o que se desenha na camada têm
   de ser o MESMO texto: é isso que faz esconder um e mostrar o outro
   ser um não-evento visual. */
let difCopia = [];
for (const seed of SEEDS) for (const r of RARIDADES) for (const nv of [1, 15, 40]) {
  const p = partes(corpo(seed, r, nv));
  const dentro = grupoDasParticulas(p.corpo);
  const fora = grupoDasParticulas(p.part);
  if (dentro !== fora && difCopia.length < 4) difCopia.push(seed + '|' + r + '|nv' + nv);
}
ok(difCopia.length === 0, 'a cópia externa é idêntica à que fica escondida',
   difCopia.length ? difCopia.join(' ') : comparados + ' avatares');

/* E a caixa da camada tem de ser a do corpo, senão as coordenadas
   20–180 deixam de querer dizer o mesmo. */
let difCaixa = [];
for (const seed of SEEDS) for (const r of RARIDADES) for (const nv of [1, 40]) {
  const p = partes(corpo(seed, r, nv));
  const atr = (s, a) => (s.match(new RegExp(a + '="([^"]*)"')) || [])[1];
  const mesmo = ['viewBox', 'width', 'height', 'preserveAspectRatio']
    .every(a => atr(p.corpo, a) === atr(p.part, a));
  if (!mesmo && difCaixa.length < 4) {
    difCaixa.push(seed + '|' + r + ' corpo ' + atr(p.corpo, 'viewBox')
      + ' camada ' + atr(p.part, 'viewBox'));
  }
}
ok(difCaixa.length === 0,
   'e leva o mesmo viewBox, largura, altura e preserveAspectRatio',
   difCaixa.length ? difCaixa.join(' ') : 'nenhuma conversão de coordenadas a fazer');

/* A fase muda o viewBox de 200×200 para 200×260: a camada tem de a
   acompanhar, senão as partículas descolam do adulto. */
const vbPorFase = {};
for (const nv of [1, 7, 15, 40]) {
  const p = partes(corpo(SEEDS[0], 'Raro', nv));
  vbPorFase[nv] = (p.part.match(/viewBox="([^"]*)"/) || [])[1];
}
ok(vbPorFase[1] === '0 0 200 200' && vbPorFase[7] === '0 0 200 200'
   && vbPorFase[15] === '0 0 200 260' && vbPorFase[40] === '0 0 200 260',
   'e acompanha a fase quando o viewBox muda',
   Object.values(vbPorFase).join(' · '));

/* ═══════════ A ESPESSURA E A COR ═══════════ */
tit('A RARIDADE DÁ A ESPESSURA, O AVATAR DÁ A COR');

for (const r of RARIDADES) {
  const esp = new Set();
  for (const seed of SEEDS) {
    const g = grupoDasParticulas(partes(corpo(seed, r, 20)).part) || '';
    for (const m of (g.match(/stroke-width="([0-9.]+)"|rx="([0-9.]+)"| r="([0-9.]+)"/g) || [])) {
      const v = parseFloat(m.replace(/[^0-9.]/g, ''));
      if (isFinite(v)) esp.add(v);
    }
  }
  const max = Math.max(...esp);
  const limite = r === 'Lendário' ? 3 : 2;
  ok(max === limite, 'a espessura do ' + r + ' chega a ' + limite,
     'maior vista: ' + max);
}

/* A cor vem do avatar (o `_PARTICULA_DO_TOM[tomDaCor(...)]` do
   js/cores.js), não da raridade. Prova-se por dois lados: a mesma seed
   dá a mesma cor nas três raridades, e seeds de cores diferentes dão
   cores diferentes. */
/* Apanha QUALQUER cor, e nao so as `hsl(...)`. A primeira versao pedia
   `hsl(` e por isso, quando uma mutacao trocou a cor por `#ffd700`,
   devolvia undefined — e a assercao, que saltava os casos sem cor,
   saltava justamente o caso partido. Um teste que ignora o que nao
   reconhece nao esta a testar, esta a desviar o olhar. */
const corDe = (g) => (g.match(/(?:stroke|fill)="(hsl\([^"]*\)|#[0-9a-fA-F]{3,8}|[a-z]+)"/) || [])[1];
let corMexeu = [], coresVistas = new Set();
for (const seed of SEEDS) {
  const c = RARIDADES.map(r => corDe(grupoDasParticulas(partes(corpo(seed, r, 20)).part) || ''));
  if ((c[0] !== c[1] || c[0] !== c[2]) && corMexeu.length < 4) corMexeu.push(String(seed));
  if (c[0]) coresVistas.add(c[0]);
}
ok(corMexeu.length === 0, 'a cor é a mesma nas três raridades',
   corMexeu.length ? corMexeu.join(' ') : SEEDS.length + ' avatares');
ok(coresVistas.size > 1, 'e muda de avatar para avatar',
   coresVistas.size + ' cores distintas em ' + SEEDS.length + ' avatares');

/* ── E E A COR DO AVATAR, NAO UMA QUALQUER ──

   As duas assercoes acima nao chegam: uma cor FIXA passa nas duas, e
   passou — uma mutacao que trocou o `corBrilho` por `#ffd700` numa das
   cinco formas de particula escapou a este arquivo inteiro.

   O que as prende e a fonte: as manchas do corpo tambem se pintam com o
   `corBrilho`, portanto a cor da particula tem de bater com a da mancha
   do MESMO avatar. Se alguem escrever uma cor a mao, deixa de bater. */
const corDaMancha = (svgCorpo) => {
  const g = svgCorpo.match(/<g class="av-mancha">[\s\S]*?<\/g>/);
  return g ? (g[0].match(/fill="(hsl\([^"]*\))"/) || [])[1] : null;
};
let corForaDaFonte = [], conferidas = 0;
for (const seed of SEEDS) for (const r of RARIDADES) {
  const p = partes(corpo(seed, r, 20));
  const daMancha = corDaMancha(p.corpo);
  const daParticula = corDe(grupoDasParticulas(p.part));
  if (!daMancha) continue;          /* avatar sem manchas: nada a comparar */
  conferidas++;
  if (!daParticula) { corForaDaFonte.push(seed + '|' + r + ' sem cor na particula'); continue; }
  if (daMancha !== daParticula && corForaDaFonte.length < 4) {
    corForaDaFonte.push(seed + '|' + r + ' mancha ' + daMancha + ' particula ' + daParticula);
  }
}
ok(conferidas > 0 && corForaDaFonte.length === 0,
   'e e a mesma cor com que o corpo pinta as manchas',
   corForaDaFonte.length ? corForaDaFonte[0] : conferidas + ' avatares · corBrilho nos dois');

/* ═══════════ O DETERMINISMO ═══════════ */
tit('O DETERMINISMO');

/* Duas chamadas seguidas dão o mesmo — tirando o `sid`, que é único por
   render de propósito (ids iguais fazem o browser resolver url(#grad…)
   sempre para o primeiro). */
const semSid = (s, seed) => s.split(seed + '_').join('SID').replace(/SID[0-9]+/g, 'SID');
let naoDeterminista = [];
for (const seed of SEEDS.slice(0, 20)) for (const r of RARIDADES) {
  const a = semSid(grupoDasParticulas(partes(corpo(seed, r, 20)).part) || '', seed);
  const b = semSid(grupoDasParticulas(partes(corpo(seed, r, 20)).part) || '', seed);
  if (a !== b && naoDeterminista.length < 4) naoDeterminista.push(seed + '|' + r);
}
ok(naoDeterminista.length === 0, 'a mesma seed dá sempre as mesmas partículas',
   naoDeterminista.length ? naoDeterminista.join(' ') : '20 avatares × 3 raridades × 2 renders');

/* E nenhum sorteio novo: a camada é uma CÓPIA do que já estava, não uma
   segunda geração. */
const fonteArena = fs.readFileSync(path.join(RAIZ, 'js', 'arena-fu.js'), 'utf8');
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const afCorpo = (semComentarios(fonteArena).match(
  /function _afCorpo\(c\)[\s\S]*?\n\}/) || [''])[0];
ok(afCorpo.length > 0 && !/random\(|Math\.random|gerarSVG\(/.test(afCorpo),
   'e o _afCorpo não sorteia nem redesenha', 'recorta o que o _afSVG já deu');
ok(/slice\(i, j\)/.test(afCorpo), 'é um recorte do mesmo texto',
   'uma só passagem pelo gerador');

/* ═══════════ O CSS ═══════════ */
tit('O QUE O CSS DA ARENA MANDA');

const css = semComentarios(fs.readFileSync(path.join(RAIZ, 'css', 'combate-arena.css'), 'utf8'));

ok(/\.cb-corpo svg:not\(\.cb-part\) \.av-particula \{[^}]*display:\s*none/.test(css),
   'as partículas do corpo somem com display:none',
   'é o único que as tira do getBBox');
ok(!/\.av-particula\s*\{[^}]*opacity:\s*0|\.av-particula\s*\{[^}]*visibility:\s*hidden/.test(css),
   'e não com opacity nem visibility',
   'os dois continuavam a contar para a caixa');
ok(/\.cb-corpo > svg \{[^}]*grid-area:\s*1\s*\/\s*1/.test(css),
   'os dois svg ficam na mesma célula da grelha',
   'senão o place-items põe um debaixo do outro');
ok(/\.cb-corpo > svg\.cb-part \{[^}]*pointer-events:\s*none/.test(css),
   'e a camada não apanha o toque', 'quem responde é o corpo');

/* A auréola da 3J.7 continua escondida, e a presença dela continua a
   funcionar: esta etapa não lhe podia tocar. */
ok(/\.cb-corpo \.av-aura \{\s*display:\s*none;\s*\}/.test(css),
   'a auréola da 3J.7 continua escondida', 'nada se lhe mexeu');
ok(/\.cb-efeitos-tras\.rar-raro/.test(css) && /\.cb-efeitos-tras\.rar-lendario/.test(css),
   'e a presença da raridade continua na camada dela', '.cb-efeitos-tras');

/* A redução de movimento: o `.cb-part` é um `svg` dentro do `.cb-corpo`,
   logo a regra que já existia apanha-o sem uma linha nova. */
ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]{0,1200}?\.cb-corpo svg[^{]*\{[^}]*animation:\s*none/.test(css),
   'e o .cb-part entra na regra de redução que já existia',
   '.cb-corpo svg — sem política nova');

/* ═══════════ AS OUTRAS TELAS ═══════════ */
tit('NENHUMA OUTRA TELA FOI TOCADA');

/* O gerador continua a desenhar as partículas: são as outras trinta e
   quatro chamadas que as querem, e nenhuma delas mede a caixa. */
const dataLimpo = semComentarios(fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8'));
ok(/<g class="av-particula">/.test(dataLimpo),
   'o gerarSVG continua a desenhar as partículas',
   'as outras 34 telas não foram migradas');
ok(/const np = raridade==='Lendário' \? 14 : raridade==='Raro' \? 9 : 5;/.test(dataLimpo),
   'e as contagens dele não mudaram', '5 / 9 / 14');
/* A camada só existe na arena. */
const foraDaArena = [];
for (const f of fs.readdirSync(path.join(RAIZ, 'js'))) {
  if (!f.endsWith('.js') || f === 'arena-fu.js') continue;
  if (/cb-part/.test(fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8'))) foraDaArena.push(f);
}
ok(foraDaArena.length === 0, 'e a camada não apareceu em mais lado nenhum',
   foraDaArena.length ? foraDaArena.join(' ') : 'só o js/arena-fu.js');

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
