#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A GARRA SAIU, E O LUGAR DELA FICA VAZIO DE PROPÓSITO

   Até à etapa 3J.10 havia, na ponta de cada braço, uma linha acesa só
   em quem não era Comum:

     if (raridade !== 'Comum') s += <line x1=ex y1=ey x2=ex+lado*8 …>

   Era a última peça do CORPO que a raridade decidia — depois de a
   contagem de braços, de espinhos e de tentáculos (3J.6), do raio do
   olho (3J.8) e da espessura do braço (3J.9) terem saído.

   ── PORQUE SAIU SEM SUBSTITUTO ──

   A auditoria procurou uma fonte legítima e não encontrou nenhuma. A
   garra não tinha gene, nem nome no código, nem sorteio próprio, nem
   classe de CSS: era uma `<line>` anónima cuja única razão de existir
   era a raridade. Os candidatos que havia não servem:

     temAsas    é o único traço sorteado e nunca desenhado, mas é um
                gene de ASAS — usá-lo tornava a garra hereditária como
                asa e inventava semântica que ninguém decidiu
     bracoDet   são curvaturas; um limiar sobre elas é pseudo-genética
     seed % 2   o mesmo defeito, mais à vista

   Preferiu-se o lugar vazio a um gene improvisado. Se o jogo quiser
   garras, elas precisam de um traço próprio, de uma decisão sobre
   hereditariedade e — sobretudo — de um lugar na fila de sorteios, que
   é o que não se pode mudar depois sem trocar a cara de todos os
   avatares que já existem.

   ── O QUE ESTE ARQUIVO GUARDA ──

     A1  nenhuma raridade tem garra
     A2  e isso vale em 60 seeds
     A3  e nas 4 fases
     A4  de 2 a 8 braços, a conta não mudou
     A5  o bracoDet continua a desenhar a curva
     A6  a geometria do braço não se mexeu
     A7  a ausência é total, e não "quase"
     A8  não entrou random nenhum para a substituir

   O A8 é o que distingue esta etapa de uma que tivesse inventado uma
   garra nova: um `random()` a mais no laço dos braços deslocava tudo o
   que vem depois na fila — o corpo, os espinhos, os chifres, os olhos,
   a boca, as manchas.

   Correr:  node tools/testar-garra-raridade.js
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
const semSid = (s, seed) => s.split(seed + '_').join('SID').replace(/SID[0-9]+/g, 'SID');

const grupoDosBracos = (svg) => {
  const m = svg.match(/<g class="av-braco">[\s\S]*?(?=<g class="av-corpo">)/);
  return m ? m[0] : '';
};
/* Quantas peças há dentro dos braços, por tipo. A garra era a única
   `<line>` do grupo; se voltar com outro nome — um `<polygon>`, um
   `<path>` a mais —, a contagem muda e isto acusa. */
function pecasDosBracos(svg) {
  const g = grupoDosBracos(svg);
  return {
    membros: (g.match(/class="av-membro"/g) || []).length,
    paths:   (g.match(/<path /g) || []).length,
    lines:   (g.match(/<line /g) || []).length,
    polys:   (g.match(/<polygon /g) || []).length,
    circles: (g.match(/<circle /g) || []).length,
    ellipses:(g.match(/<ellipse /g) || []).length,
  };
}

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

/* ═══════════ A1, A2, A3 — NINGUÉM TEM GARRA ═══════════ */
tit('A1–A3 · NENHUMA RARIDADE, SEED OU FASE TEM GARRA');

const porRar = { Comum: 0, Raro: 0, 'Lendário': 0 };
let membrosTotais = 0, casos = 0;
for (const seed of SEEDS) for (const r of RARIDADES) for (let f = 0; f <= 3; f++) {
  const p = pecasDosBracos(desenhar(seed, r, f));
  porRar[r] += p.lines;
  membrosTotais += p.membros;
  casos++;
}
ok(porRar.Comum === 0 && porRar.Raro === 0 && porRar['Lendário'] === 0,
   'zero garras nas três raridades',
   'Comum ' + porRar.Comum + ' · Raro ' + porRar.Raro
   + ' · Lendário ' + porRar['Lendário'] + ' em ' + membrosTotais + ' braços');
ok(casos === 60 * 3 * 4, 'e a amostra cobre 60 seeds × 3 raridades × 4 fases',
   casos + ' casos');

/* E a comparação direta que a etapa pede: para o mesmo avatar, o grupo
   dos braços tem de ser idêntico nas três. */
let difGrupo = [];
for (const seed of SEEDS) for (let f = 0; f <= 3; f++) {
  const g = RARIDADES.map(r => semSid(grupoDosBracos(desenhar(seed, r, f)), seed));
  if ((g[0] !== g[1] || g[0] !== g[2]) && difGrupo.length < 4) difGrupo.push(seed + '|fase' + f);
}
ok(difGrupo.length === 0, 'e o grupo dos braços é idêntico nas três',
   difGrupo.length ? difGrupo.join(' ') : '240 avatares × 3 raridades');

/* ═══════════ A4 — DE DOIS A OITO BRAÇOS ═══════════ */
tit('A4 · A CONTAGEM DE BRAÇOS NÃO MUDOU');

let contasMa = [];
for (let n = 2; n <= 8; n++) {
  const av = avatarCom(SEEDS[3], { numBracos: n });
  for (const r of RARIDADES) {
    const p = pecasDosBracos(desenhar(SEEDS[3], r, 2, av));
    if (p.membros !== n || p.lines !== 0) contasMa.push(n + '|' + r + ': ' + p.membros + ' membros, ' + p.lines + ' garras');
  }
}
ok(contasMa.length === 0, 'de 2 a 8 braços, a conta bate e nenhum tem garra',
   contasMa.length ? contasMa.slice(0, 3).join(' | ') : '7 contagens × 3 raridades');

/* Um `<path>` por braço, e mais nada. */
const av8 = avatarCom(SEEDS[3], { numBracos: 8 });
const p8 = pecasDosBracos(desenhar(SEEDS[3], 'Lendário', 2, av8));
ok(p8.membros === 8 && p8.paths === 8 && p8.lines === 0 && p8.polys === 0
   && p8.circles === 0 && p8.ellipses === 0,
   'e cada braço é um <path> e mais nada',
   JSON.stringify(p8));

/* ═══════════ A5 — O bracoDet ═══════════ */
tit('A5 · O bracoDet CONTINUA A DESENHAR A CURVA');

const curvasDe = (svg) => (grupoDosBracos(svg)
  .match(/<path d="M ([-0-9.]+) ([-0-9.]+) Q ([-0-9.]+) ([-0-9.]+) ([-0-9.]+) ([-0-9.]+)"/g) || [])
  .map(m => m.replace(/<path d="M /, ''));

const c8 = curvasDe(desenhar(SEEDS[3], 'Comum', 2, av8));
ok(new Set(c8).size === 8, 'os oito braços continuam diferentes entre si',
   new Set(c8).size + ' curvas distintas em 8 braços');

let curvaDif = [];
for (const seed of SEEDS.slice(0, 40)) for (let f = 0; f <= 3; f++) {
  const c = RARIDADES.map(r => curvasDe(desenhar(seed, r, f)).join('|'));
  if ((c[0] !== c[1] || c[0] !== c[2]) && curvaDif.length < 4) curvaDif.push(seed + '|fase' + f);
}
ok(curvaDif.length === 0, 'e são as mesmas nas três raridades',
   curvaDif.length ? curvaDif.join(' ') : '40 avatares × 4 fases');

/* ═══════════ A6 — A GEOMETRIA DO BRAÇO ═══════════ */
tit('A6 · O RESTO DO BRAÇO NÃO SE MEXEU');

/* A espessura continua em 6 — foi o que a 3J.9 deixou, e tirar a garra
   não lhe podia tocar. */
const esp = new Set();
for (const seed of SEEDS) for (const r of RARIDADES)
  for (const m of (grupoDosBracos(desenhar(seed, r, 2)).match(/<path[^>]*stroke-width="([0-9.]+)"/g) || []))
    esp.add(m.match(/stroke-width="([0-9.]+)"/)[1]);
ok(esp.size === 1 && esp.has('6'), 'a espessura do braço continua em 6',
   'vistas: ' + [...esp].join(', '));

/* E a ponta continua onde a FASE_GEO a põe: 35 até ao adulto, 28,5 no
   ancião (65 × 1,10). Tirar a garra não encurtou o braço. */
const pontas = {};
for (const seed of SEEDS) for (const r of RARIDADES) for (let f = 0; f <= 3; f++) {
  const m = grupoDosBracos(desenhar(seed, r, f))
    .match(/<path d="M [-0-9.]+ [-0-9.]+ Q [-0-9.]+ [-0-9.]+ ([-0-9.]+)/);
  if (m) (pontas[f] = pontas[f] || new Set()).add(+m[1]);
}
const uma = (f) => pontas[f] && pontas[f].size === 1 ? [...pontas[f]][0] : null;
ok(uma(0) === 35 && uma(1) === 35 && uma(2) === 35 && uma(3) === 28.5,
   'e a ponta continua onde a FASE_GEO a põe',
   [0, 1, 2, 3].map(f => uma(f)).join(' · ') + '  (o ancião estica)');

/* ═══════════ A7 — A AUSÊNCIA É TOTAL ═══════════ */
tit('A7 · A AUSÊNCIA É TOTAL, E NÃO "QUASE"');

/* Uma garra que voltasse num subconjunto de seeds — por um `seed % 2`,
   por um limiar sobre o bracoDet — satisfazia "igual nas três
   raridades" e passava em tudo acima. Conta-se o total: tem de ser
   zero, não "igual". */
let totalLines = 0;
for (const seed of SEEDS) for (const r of RARIDADES) for (let f = 0; f <= 3; f++)
  totalLines += pecasDosBracos(desenhar(seed, r, f)).lines;
ok(totalLines === 0, 'o total de garras em toda a amostra é zero',
   totalLines + ' em 720 desenhos');

/* E com todos os números de braços, que é onde um limiar por índice se
   esconderia melhor. */
let porIndice = 0;
for (let n = 2; n <= 8; n++) for (const seed of SEEDS.slice(0, 20)) {
  const av = avatarCom(seed, { numBracos: n });
  for (const r of RARIDADES) porIndice += pecasDosBracos(desenhar(seed, r, 2, av)).lines;
}
ok(porIndice === 0, 'e zero também com 2 a 8 braços forçados',
   porIndice + ' em ' + (7 * 20 * 3) + ' desenhos');

/* ═══════════ A8 — NENHUM RANDOM NOVO ═══════════ */
tit('A8 · A FILA DE SORTEIOS NÃO MUDOU');

const fonte = fs.readFileSync(path.join(RAIZ, 'js', 'data.js'), 'utf8');
const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const laco = (semComentarios.match(
  /s \+= `<g class="av-braco">`;[\s\S]*?(?=s \+= `<g class="av-corpo">`;)/) || [''])[0];

ok(laco.length > 0 && !/random\(/.test(laco), 'o laço dos braços não chama random',
   laco.length + ' caracteres · 0 chamadas');
ok(!/corpoDoSeed|corpoDaFila|_preludio/.test(laco),
   'e não pede um corpo novo a meio do desenho', 'nenhuma segunda fila');
ok(!/raridade|grauDaRaridade|RARIDADE_GRAU/.test(laco),
   'e não pergunta a raridade', 'a espessura saiu na 3J.9, a garra na 3J.10');

/* A prova de que nada se deslocou: o que vem DEPOIS dos braços na fila
   — os chifres, que são os últimos a sortear — tem de bater nas três
   raridades. Um random a mais no laço dos braços mudava-os. */
let chifreDif = [];
for (const seed of SEEDS.slice(0, 40)) for (let f = 0; f <= 3; f++) {
  const c = RARIDADES.map(r => {
    const m = desenhar(seed, r, f).match(/<g class="av-chifre">[\s\S]*?(?=<g class="av-olho">)/);
    return m ? semSid(m[0], seed) : null;
  });
  if ((c[0] !== c[1] || c[0] !== c[2]) && chifreDif.length < 4) chifreDif.push(seed + '|fase' + f);
}
ok(chifreDif.length === 0, 'e os chifres, que sorteiam depois, batem nas três',
   chifreDif.length ? chifreDif.join(' ') : '40 avatares × 4 fases');

/* A contagem de sorteios da fila principal, medida: o corpoDaFila tira
   sempre o mesmo número de valores, e isso não depende de nada que esta
   etapa tenha tocado. */
let tirados = 0;
const fila = M.corpoDaFila(() => { tirados++; return 1; });
ok(tirados === 12 + 1 + 16 + 4 + 3,
   'e o corpoDaFila continua a tirar 36 números',
   tirados + ' = 12 traços + nt + 8 pares de braço + 4 espinhos + 3 olhos');
ok(fila && Array.isArray(fila.bracoDet) && fila.bracoDet.length === 8,
   'com os 8 pares do bracoDet à contagem máxima',
   'bracoDet com ' + (fila.bracoDet || []).length + ' pares');

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
