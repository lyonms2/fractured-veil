#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O QUE É CORPO E O QUE É EFEITO

   A série 3J.6 → 3J.11 tirou a raridade da anatomia, peça a peça: a
   contagem de braços, de espinhos e os tentáculos (3J.6), o raio do
   olho (3J.8), a espessura do braço (3J.9), a garra (3J.10) e, aqui, a
   contagem de manchas.

   Este arquivo guarda a FRONTEIRA que a auditoria 3J.11 traçou, e
   guarda-a dos dois lados — porque um teste que só proibisse a raridade
   acabaria por apagar os efeitos legítimos dela, e aí o Lendário
   deixava de se distinguir de um Comum.

     DO LADO DO CORPO, e a raridade não pode tocar:
       manchas   caem em dx 75–125, dy 80–120 — dentro da silhueta;
                 nenhuma regra de CSS as abafa; medido no browser,
                 tirá-las não mexe no getBBox em 24 de 24 casos

     DO LADO DO EFEITO, e a raridade PODE decidir:
       aura      0 / 1 / 2 halos
       glow      stdDeviation 4 → 6
       partículas  5 / 9 / 14, e a espessura delas

   ── PORQUE AS MANCHAS CAÍRAM DO LADO DO CORPO ──

   Não foi por serem pequenas. Foi por três evidências que apontam para
   o mesmo lado: ficam dentro do corpo, o CSS trata-as como corpo (a
   `av-particula` e a `av-aura` são abafadas quando o avatar adoece ou
   cai; a `av-mancha` não é abafada por nada), e não entram na caixa que
   põe o bicho de pé.

   ── O QUE FICOU POR FAZER, E ESTÁ MEDIDO ──

   As partículas continuam DENTRO do SVG e entram no `getBBox()`. Na
   arena, onde a `av-aura` está escondida, elas passam a ser o que está
   mais longe do centro em 17 de 24 casos — e por isso a raridade ainda
   move os pés e o nome do avatar ali. Medido: entre um Comum e um
   Lendário com a mesma seed, o `--cabeca` difere em 45 de 60 casos, até
   41,5 unidades.

   Isso é layout, não é cosmética, e sai numa etapa própria (o padrão da
   3J.7: o efeito vive fora do desenho). Este arquivo não o corrige —
   mede-o, para que não se perca.

   Correr:  node tools/testar-efeitos-raridade.js
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
  LINHAS_DA_FASE + NL + 'return { gerarSVG, corpoDaFila };'
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

const desenhar = (seed, rar, fase) => M.gerarSVG({ cor: 'roxo', seed }, rar, seed, 120, 120, fase);
const semSid = (s, seed) => s.split(seed + '_').join('SID').replace(/SID[0-9]+/g, 'SID');
const grupo = (svg, cls, ate) => {
  const m = svg.match(new RegExp('<g class="' + cls + '">[\\s\\S]*?(?=' + ate + ')'));
  return m ? m[0] : '';
};
const manchasDe = (svg) => grupo(svg, 'av-mancha', '<g class="av-particula">');
const particulasDe = (svg) => {
  const i = svg.indexOf('<g class="av-particula">');
  return i === -1 ? '' : svg.slice(i);
};

/* ═══════════ O CORPO: AS MANCHAS ═══════════ */
tit('AS MANCHAS SÃO CORPO');

/* Contagem e posição idênticas nas três raridades. */
let difMancha = [], casos = 0;
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const g = RARIDADES.map(r => semSid(manchasDe(desenhar(seed, r, f)), seed));
  casos++;
  if ((g[0] !== g[1] || g[0] !== g[2]) && difMancha.length < 4) difMancha.push(seed + '|fase' + f);
}
ok(difMancha.length === 0, 'as manchas são idênticas nas três raridades',
   difMancha.length ? difMancha.join(' ') : casos + ' avatares × 3 raridades');

/* A contagem: com random(3,5), são 3, 4 ou 5. */
const contas = {};
for (const seed of SEEDS) for (const r of RARIDADES) {
  const n = (manchasDe(desenhar(seed, r, 2)).match(/<circle /g) || []).length;
  (contas[r] = contas[r] || new Set()).add(n);
}
const faixa = (r) => [...contas[r]].sort((a, b) => a - b).join(',');
ok(faixa('Comum') === '3,4,5' && faixa('Raro') === '3,4,5' && faixa('Lendário') === '3,4,5',
   'e a contagem é 3, 4 ou 5 nas três', 'Comum ' + faixa('Comum')
   + ' · Raro ' + faixa('Raro') + ' · Lendário ' + faixa('Lendário'));

/* ── A EVIDÊNCIA QUE AS PÕE DO LADO DO CORPO ──
   Caem dentro da silhueta. Se alguma saísse para fora, passava a
   entrar no getBBox e deixava de ser pele. */
let foraDoCorpo = [], manchasVistas = 0;
for (const seed of SEEDS) for (const r of RARIDADES) {
  for (const c of (manchasDe(desenhar(seed, r, 2)).match(/<circle [^>]*>/g) || [])) {
    const cx = +(c.match(/cx="([0-9.]+)"/) || [])[1];
    const cy = +(c.match(/cy="([0-9.]+)"/) || [])[1];
    const cr = +(c.match(/ r="([0-9.]+)"/) || [])[1];
    manchasVistas++;
    if (cx - cr < 70 || cx + cr > 130 || cy - cr < 75 || cy + cr > 125) {
      if (foraDoCorpo.length < 4) foraDoCorpo.push(seed + '|' + r + ' (' + cx + ',' + cy + ' r' + cr + ')');
    }
  }
}
ok(foraDoCorpo.length === 0, 'e todas caem dentro da silhueta',
   foraDoCorpo.length ? foraDoCorpo.join(' ') : manchasVistas + ' manchas · x 70–130, y 75–125');

/* ═══════════ OS EFEITOS: O QUE A RARIDADE AINDA DECIDE ═══════════ */
tit('OS EFEITOS QUE A RARIDADE DECIDE, E DEVEM CONTINUAR');

/* Se alguém apagar um destes por engano — a querer "tirar a raridade"
   do avatar —, o Lendário deixa de se distinguir de um Comum. */
const nPart = {};
for (const seed of SEEDS) for (const r of RARIDADES) {
  const n = (particulasDe(desenhar(seed, r, 2))
    .match(/<(path|ellipse|rect|circle) /g) || []).length;
  (nPart[r] = nPart[r] || new Set()).add(n);
}
ok(nPart.Comum.size === 1 && nPart.Comum.has(5)
   && nPart.Raro.size === 1 && nPart.Raro.has(9)
   && nPart['Lendário'].size === 1 && nPart['Lendário'].has(14),
   'as partículas continuam 5 / 9 / 14',
   [...nPart.Comum] + ' · ' + [...nPart.Raro] + ' · ' + [...nPart['Lendário']]);

const halos = {};
for (const r of RARIDADES) {
  const g = grupo(desenhar(SEEDS[0], r, 2), 'av-aura', '<g class="av-asa">');
  halos[r] = (g.match(/<ellipse /g) || []).length;
}
ok(halos.Comum === 0 && halos.Raro === 1 && halos['Lendário'] === 2,
   'e a aura continua 0 / 1 / 2 halos',
   halos.Comum + ' · ' + halos.Raro + ' · ' + halos['Lendário']);

const glow = {};
for (const r of RARIDADES) {
  const m = desenhar(SEEDS[0], r, 2).match(/id="glow[^"]*"><feGaussianBlur stdDeviation="([0-9]+)"/);
  glow[r] = m ? +m[1] : null;
}
ok(glow.Comum === 4 && glow.Raro === 4 && glow['Lendário'] === 6,
   'e o glow continua 4 / 4 / 6',
   glow.Comum + ' · ' + glow.Raro + ' · ' + glow['Lendário']);

/* A espessura das partículas é o quinto efeito da tabela da auditoria, e
   faltava aqui: uma mutação que a tirasse só era apanhada pelo golden —
   e um golden rebaselina-se, logo era guarda fina. `pt` sai de
   `random(1, Lendário?3:2)`, portanto o Lendário chega aos 3 e os
   outros param nos 2. */
const espPart = {};
for (const seed of SEEDS) for (const r of RARIDADES) {
  for (const m of (particulasDe(desenhar(seed, r, 2))
      .match(/stroke-width="([0-9.]+)"|rx="([0-9.]+)"| r="([0-9.]+)"/g) || [])) {
    const v = parseFloat(m.replace(/[^0-9.]/g, ''));
    if (isFinite(v)) (espPart[r] = espPart[r] || new Set()).add(v);
  }
}
const maior = (r) => Math.max(...(espPart[r] || [0]));
ok(maior('Lendário') > maior('Comum') && maior('Comum') === maior('Raro'),
   'e a espessura das partículas distingue o Lendário',
   'maior: Comum ' + maior('Comum') + ' · Raro ' + maior('Raro')
   + ' · Lendário ' + maior('Lendário'));

/* ═══════════ A FRONTEIRA, DOS DOIS LADOS ═══════════ */
tit('O DESENHO FORA DOS EFEITOS É IGUAL NAS TRÊS');

/* Do princípio do SVG até à aura, e da asa até às manchas: tudo o que
   não é efeito tem de bater. Os `defs` ficam de fora porque é lá que o
   glow vive. */
function corpoSemEfeitos(svg) {
  const i = svg.indexOf('<g class="av-asa">');
  const j = svg.indexOf('<g class="av-particula">');
  return i === -1 || j === -1 ? null : svg.slice(i, j);
}
let difCorpo = [], comparados = 0;
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const c = RARIDADES.map(r => semSid(corpoSemEfeitos(desenhar(seed, r, f)) || '', seed));
  comparados++;
  if ((c[0] !== c[1] || c[0] !== c[2]) && difCorpo.length < 4) difCorpo.push(seed + '|fase' + f);
}
ok(difCorpo.length === 0,
   'asas, corpo, cauda, braços, espinhos, chifres, olhos, boca e manchas',
   difCorpo.length ? difCorpo.join(' ') : comparados + ' avatares × 3 raridades · tudo igual');

/* ═══════════ A FILA NÃO MUDOU ═══════════ */
tit('A FILA DE SORTEIOS');

let tirados = 0;
M.corpoDaFila(() => { tirados++; return 1; });
ok(tirados === 36, 'o corpoDaFila continua a tirar 36 números',
   tirados + ' = 12 traços + nt + 8 pares + 4 espinhos + 3 olhos');

const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8');
const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok(/const nd = random\(3,5\);/.test(semComentarios),
   'e a contagem de manchas é um sorteio só', 'random(3,5), sem ramo de raridade');

/* Quantos sorteios o bloco das manchas faz, contados na fonte. Uma
   mutação que acrescentasse um random aqui só era apanhada pelo golden,
   e o golden rebaselina-se. São quatro: o `nd` e os três de cada mancha
   (dx, dy, dr). */
const blocoManchas = (semComentarios.match(
  /s \+= `<g class="av-mancha">`;[\s\S]*?(?=s \+= `<g class="av-particula">`;)/) || [''])[0];
const sorteiosManchas = (blocoManchas.match(/random\(/g) || []).length;
ok(sorteiosManchas === 4, 'e o bloco das manchas faz 4 sorteios',
   sorteiosManchas + ' = nd + dx + dy + dr');

/* As manchas vêm ANTES das partículas, e as partículas são as últimas
   coisas do desenho. É por isso que mexer na contagem de manchas não
   desloca nada a não ser as próprias partículas. */
const iMancha = semComentarios.indexOf('av-mancha');
const iPart = semComentarios.indexOf('av-particula');
const depoisDasPart = semComentarios.slice(iPart).match(/random\(/g) || [];
ok(iMancha > 0 && iPart > iMancha, 'as manchas vêm antes das partículas',
   'e as partículas são as últimas');
ok(depoisDasPart.length <= 5, 'e depois delas não há mais nada a sortear',
   depoisDasPart.length + ' sorteios no último bloco (px, py, pt, delay, pedras)');

/* ═══════════ O QUE FICA POR FAZER, MEDIDO ═══════════ */
tit('A PENDÊNCIA QUE A AUDITORIA DEIXOU MEDIDA');

/* As partículas ainda estão dentro do SVG, e a contagem delas é
   raridade. Enquanto estiverem, a raridade mexe na extensão do desenho
   — e na arena, onde a aura está escondida, mexe no que põe o bicho de
   pé. Isto não é uma falha a corrigir aqui: é a pendência, e o teste
   guarda-a para que ninguém a dê por resolvida sem a resolver. */
function extensaoDasParticulas(svg) {
  const g = particulasDe(svg);
  const xs = [];
  for (const m of (g.match(/(?:cx|x)="([0-9.]+)"/g) || [])) xs.push(parseFloat(m.replace(/[^0-9.]/g, '')));
  return xs.length ? { min: Math.min(...xs), max: Math.max(...xs), n: xs.length } : null;
}
let mexeNaExtensao = 0, total = 0;
for (const seed of SEEDS.slice(0, 30)) {
  const c = extensaoDasParticulas(desenhar(seed, 'Comum', 2));
  const l = extensaoDasParticulas(desenhar(seed, 'Lendário', 2));
  total++;
  if (c && l && (c.min !== l.min || c.max !== l.max)) mexeNaExtensao++;
}
ok(mexeNaExtensao > 0,
   'as partículas ainda mudam a extensão do desenho com a raridade',
   mexeNaExtensao + ' de ' + total + ' avatares · é a pendência da próxima etapa');

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
