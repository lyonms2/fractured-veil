// ═══════════════════════════════════════════════════════════════════
// EVOLUÇÃO — a raridade conquista-se, e o corpo cresce em vez de trocar
//
// Três perguntas:
//
//   1. a escada da raridade sobe com a fase, e nunca desce
//   2. a raridade não paga pontos de ficha — quem paga é o nível
//   3. e o corpo: o mesmo avatar nas três raridades continua a ser o
//      MESMO BICHO. Ganha partes; não troca de cara.
//
// A terceira é a que precisa de guarda permanente. O desenho sorteia
// numa fila — cada número sai do anterior — e basta alguém pôr um
// random() dentro de um laço que conta partes para todos os avatares do
// jogo mudarem de aspecto ao evoluir. Já aconteceu duas vezes neste
// mesmo ficheiro.
//
// Correr:  node tools/evolucao.js
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');

/* AS REGRAS DA FASE VÊM DO js/state.js, E NÃO DE UMA CÓPIA.

   O state.js inteiro não corre fora do browser — mexe no ecrã e em
   vinte globais do jogo. Mas a fase são três linhas, e essas leem-se de
   lá tal como estão. Copiar os números para aqui era criar a segunda
   cópia que mais tarde diverge — já aconteceu com os limiares dos ovos
   e com o passivo elemental. */
const NL = String.fromCharCode(10);
const RE_FASE = new RegExp('^const (FASE_MIN_SECS|faseFromNivel|faseFromAge)');
const LINHAS_DA_FASE = fs.readFileSync(path.join(RAIZ, 'js/state.js'), 'utf8')
  .split(NL).filter(l => RE_FASE.test(l)).join(NL);
if (LINHAS_DA_FASE.split(NL).length !== 3)
  throw new Error('js/state.js mudou: não encontrei as três linhas da fase.');

const M = new Function('t',
  LINHAS_DA_FASE + NL +
  rd('cores.js') + rd('nascimento.js') + rd('raridade.js') +
  rd('vantagens.js') + rd('ficha-3dt.js') + rd('data.js') +
  `return { gerarSVG, registarNascimento, fichaDeAvatar, pontosDoAvatar,
            raridadeDaFase, grauDaRaridade, faseDoSlot, raridadeDoSlot,
            sincronizarRaridade, podeSerVendido, RARIDADE_POR_FASE };`
)(x => x);

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK   ', titulo.padEnd(54), '· ' + detalhe); }
  else      { falhou++; console.log('  FALHOU', titulo.padEnd(53), '· ' + detalhe); }
}
function titulo(txt) { console.log(''); console.log('─── ' + txt + ' ' + '─'.repeat(Math.max(0, 56 - txt.length))); }

const RARS = ['Comum', 'Raro', 'Lendário'];

// ═══════════════════════════════════════════════════════════════════
titulo('A ESCADA');

const escada = [1, 4, 5, 9, 10, 16, 17, 25, 35].map(nv => ({
  nv, r: M.raridadeDaFase(nv < 5 ? 0 : nv < 10 ? 1 : nv < 17 ? 2 : 3),
}));
console.log('       ' + escada.map(e => 'nv' + e.nv + ' ' + e.r).join('  ·  '));

ok(M.raridadeDaFase(0) === 'Comum' && M.raridadeDaFase(1) === 'Comum',
   'o bebé e a criança nascem e ficam Comuns', 'fase 0 e 1 → Comum');
ok(M.raridadeDaFase(2) === 'Raro' && M.raridadeDaFase(3) === 'Lendário',
   'o jovem é Raro e o adulto é Lendário', 'fase 2 → Raro · fase 3 → Lendário');

// A conquista não se perde. Um avatar que já é Lendário e por alguma
// razão volta ao nível 1 continua Lendário — o que se ganhou fica.
{
  const slot = { raridade: 'Lendário', nivel: 1 };
  const mudou = M.sincronizarRaridade(slot);
  ok(mudou === null && slot.raridade === 'Lendário',
     'a raridade nunca desce, mesmo com a fase a descer',
     'Lendário de nível 1 continua Lendário');
}
{
  const slot = { raridade: 'Comum', nivel: 20 };
  const mudou = M.sincronizarRaridade(slot);
  ok(mudou === 'Lendário' && slot.raridade === 'Lendário',
     'quem já tinha a fase recebe a raridade na migração',
     'Comum de nível 20 → Lendário');
}

// O tempo de jogo continua a mandar: nível não chega.
{
  const cru   = { raridade: 'Comum', nivel: 30, totalSecs: 60 };       // 1 minuto
  const feito = { raridade: 'Comum', nivel: 30, totalSecs: 25 * 3600 };
  const semTempo = { raridade: 'Comum', nivel: 30 };                   // uma listagem
  const a = M.raridadeDoSlot(cru), b = M.raridadeDoSlot(feito), c = M.raridadeDoSlot(semTempo);
  ok(a === 'Comum' && b === 'Lendário',
     'nível sem horas de jogo não compra raridade nenhuma',
     'nv30 com 1 min → ' + a + ' · nv30 com 25 h → ' + b);
  // Uma listagem do marketplace traz o nível e mais nada. Recusar-me a
  // responder aí obrigava-me a inventar uma segunda regra noutro sítio.
  ok(c === 'Lendário', 'sem tempo de jogo na mão, responde-se pelo nível',
     'nv30 sem totalSecs → ' + c);
}

ok(!M.podeSerVendido({ raridade: 'Comum' }) &&
    M.podeSerVendido({ raridade: 'Raro' }) &&
    M.podeSerVendido({ raridade: 'Lendário' }),
   'o mercado abre a partir de Raro, e não antes',
   'Comum não · Raro sim · Lendário sim');

// ═══════════════════════════════════════════════════════════════════
titulo('A RARIDADE NÃO PAGA PONTOS');

let difPontos = 0, difFicha = 0, n = 0;
for (let seed = 1; seed <= 2000; seed++) {
  for (const nv of [1, 10, 17, 25, 35]) {
    const p = RARS.map(r => M.pontosDoAvatar(r, nv));
    if (p[0] !== p[1] || p[1] !== p[2]) difPontos++;
    const f = RARS.map(r => M.fichaDeAvatar(seed, r, 'Fogo', nv));
    if (f[0].F !== f[2].F || f[0].H !== f[2].H || f[0].R !== f[2].R || f[0].A !== f[2].A) difFicha++;
    n++;
  }
}
ok(difPontos === 0, 'os pontos são os mesmos nas três raridades',
   n.toLocaleString('pt-BR') + ' comparações');
ok(difFicha === 0, 'e a ficha inteira também — a força vem toda do nível',
   n.toLocaleString('pt-BR') + ' fichas');

// O degrau que isto evita: se a raridade pagasse, um nível 16 encontrava
// um nível 17 com este salto.
const saltoAntigo = 10 - 5;
console.log('       (se pagasse, passar a Lendário dava +' + saltoAntigo +
            ' pontos de uma vez — mais do que ' + (saltoAntigo * 4) + ' níveis valem)');

// ═══════════════════════════════════════════════════════════════════
titulo('O CORPO CRESCE, NÃO TROCA');

// Ignora os ids únicos por render, que mudam de propósito a cada chamada.
const limpa = s => s.replace(/(grad|lg|glow|ig)\d+_\d+/g, '$1X');
const grupo = (s, cls) => {
  const m = s.match(new RegExp('<g class="av-' + cls + '">[\\s\\S]*?<\\/g>'));
  return m ? limpa(m[0]) : '';
};
const conta = (s, marca) => (s.match(new RegExp(marca, 'g')) || []).length;

const IDENTIDADE = ['corpo', 'chifre', 'cauda', 'boca'];
const CRESCEM = [
  { nome: 'olhos',      marca: 'class="av-olho-un"' },
  { nome: 'braços',     marca: 'class="av-membro"' },
];

let mudouIdentidade = 0, encolheu = 0, ganhou = 0, avaliados = 0;
const exemplos = [];
for (let seed = 1; seed <= 500; seed++) {
  const slot = { raridade: 'Comum', elemento: 'Fogo', seed, nivel: 1 };
  M.registarNascimento(slot, { origem: 'Comum', seed });
  // A MESMA fase nas três, para o que muda ser só a raridade.
  const svgs = RARS.map(r => M.gerarSVG(slot, r, seed, 60, 60, 2));
  avaliados++;

  for (const cls of IDENTIDADE) {
    const g = svgs.map(s => grupo(s, cls));
    if (g[0] !== g[1] || g[1] !== g[2]) mudouIdentidade++;
  }
  for (const p of CRESCEM) {
    const c = svgs.map(s => conta(s, p.marca));
    if (c[1] < c[0] || c[2] < c[1]) encolheu++;
    if (c[2] > c[0]) ganhou++;
  }
  // Os espinhos são o caso mais claro: um Comum não tem nenhum.
  const esp = svgs.map(s => conta(grupo(s, 'espinho'), '<polygon'));
  if (esp[0] !== 0) encolheu++;
  if (esp[2] < esp[1] || esp[1] < esp[0]) encolheu++;
  if (seed <= 3) exemplos.push('seed ' + seed + ': espinhos ' + esp.join('→') +
    ' · olhos ' + svgs.map(s => conta(s, 'class="av-olho-un"')).join('→') +
    ' · braços ' + svgs.map(s => conta(s, 'class="av-membro"')).join('→'));
}

ok(mudouIdentidade === 0,
   'corpo, chifres, cauda e boca são os mesmos nas três raridades',
   avaliados + ' avatares × 4 partes de identidade');
ok(encolheu === 0, 'nenhuma parte desaparece ao subir de raridade',
   avaliados + ' avatares');
ok(ganhou > avaliados * 0.5, 'e a maioria ganha mesmo alguma coisa visível',
   ganhou + ' ganhos em ' + (avaliados * CRESCEM.length) + ' comparações');
for (const e of exemplos) console.log('       ' + e);

console.log('');
console.log('─────────────────────────────');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
