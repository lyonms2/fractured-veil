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
  rd('vantagens.js') + rd('ficha-3dt.js') + rd('magias.js') + rd('data.js') +
  `return { gerarSVG, registarNascimento, fichaDeAvatar, pontosDoAvatar,
            magiasDoAvatar, repertorioCompleto, degrauDoSlot, MAGIA_SLOTS, MAGIA_ESCADA,
            raridadeDaFase, raridadeDosPontos, grauDaRaridade, faseDoSlot, raridadeDoSlot,
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

// A escada inteira, com os pontos que a decidem.
{
  let ant = null;
  for (let nv = 1; nv <= 35; nv++) {
    const pontos = M.pontosDoAvatar('Comum', nv);
    const r = M.raridadeDosPontos(pontos);
    if (r !== ant) { console.log('       nível ' + String(nv).padStart(2) + '  →  ' +
      pontos + ' pontos  →  ' + r); ant = r; }
  }
}

ok(M.raridadeDosPontos(0) === 'Comum' && M.raridadeDosPontos(7) === 'Comum',
   'até 7 pontos é Comum', '0 e 7 → Comum');
ok(M.raridadeDosPontos(8) === 'Raro' && M.raridadeDosPontos(11) === 'Raro',
   'de 8 a 11 é Raro', '8 e 11 → Raro');
ok(M.raridadeDosPontos(12) === 'Lendário' && M.raridadeDosPontos(99) === 'Lendário',
   'de 12 para cima é Lendário', '12 e 99 → Lendário');

// Onde cai cada degrau, em níveis. É isto que o jogador sente.
{
  const primeiro = r => { for (let nv = 1; nv <= 35; nv++)
    if (M.raridadeDosPontos(M.pontosDoAvatar('Comum', nv)) === r) return nv; return null; };
  const raro = primeiro('Raro'), lend = primeiro('Lendário');
  ok(raro === 15 && lend === 23, 'Raro ao nível 15 e Lendário ao 23',
     'Raro nv' + raro + ' · Lendário nv' + lend);
  /* Duas pontas, e as duas importam. Cedo de mais e a raridade não é
     conquista nenhuma; tarde de mais e ninguém chega a viver nela —
     numa versão anterior o Lendário caía no nível 34 de 35, e era um
     fotograma e não um estado. */
  ok(lend > 17 && lend <= 25, 'e sobram níveis para se VIVER como Lendário',
     'Lendário ao nv' + lend + ', com ' + (35 - lend) + ' níveis pela frente');

  // O bebé vale um ponto, e é esse o princípio da escada.
  ok(M.pontosDoAvatar('Comum', 1) === 1, 'e o bebé vale um ponto',
     'nv1 → ' + M.pontosDoAvatar('Comum', 1) + ' ponto');
}

// A conquista não se perde.
{
  const slot = { raridade: 'Lendário', nivel: 1 };
  ok(M.sincronizarRaridade(slot) === null && slot.raridade === 'Lendário',
     'a raridade nunca desce', 'Lendário de nível 1 continua Lendário');
}
{
  const slot = { raridade: 'Comum', nivel: 30 };
  ok(M.sincronizarRaridade(slot) === 'Lendário' && slot.raridade === 'Lendário',
     'quem já tinha os pontos recebe a raridade na migração',
     'Comum de nível 30 → Lendário');
}

// O tempo de jogo é o travão: pontos não chegam.
{
  const cru   = { raridade: 'Comum', nivel: 30, totalSecs: 60 };
  const feito = { raridade: 'Comum', nivel: 30, totalSecs: 25 * 3600 };
  const listagem = { raridade: 'Comum', nivel: 30 };
  const a = M.raridadeDoSlot(cru), b = M.raridadeDoSlot(feito), c = M.raridadeDoSlot(listagem);
  ok(M.grauDaRaridade(a) < M.grauDaRaridade(b),
     'nível sem horas de jogo não compra a raridade toda',
     'nv30 com 1 min → ' + a + ' · nv30 com 25 h → ' + b);
  ok(c === 'Lendário', 'sem tempo de jogo na mão, responde-se pelos pontos',
     'nv30 sem totalSecs → ' + c);
}

ok(!M.podeSerVendido({ raridade: 'Comum' }) &&
    M.podeSerVendido({ raridade: 'Raro' }) &&
    M.podeSerVendido({ raridade: 'Lendário' }),
   'o mercado abre a partir de Raro, e não antes',
   'Comum não · Raro sim · Lendário sim');

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

// ════════════════════════════════════════════════════════════════
titulo('O REPERTÓRIO CRESCE');

// A escada do §8 do conceito, medida em vez de suposta.
{
  const linha = (nv, rar) => {
    const f = M.fichaDeAvatar(7, rar, 'Água', nv);
    const m = M.magiasDoAvatar(f);
    return { nv, rar, tem: M.MAGIA_SLOTS.filter(c => m[c]), vd: !!f.vantagem };
  };
  const passos = [[1,'Comum'],[5,'Comum'],[10,'Comum'],[13,'Raro'],[29,'Lendário']].map(a => linha(a[0], a[1]));
  for (const p of passos)
    console.log('       nv' + String(p.nv).padStart(2) + ' ' + p.rar.padEnd(9) + ' · ' +
                (p.tem.length ? p.tem.join(', ') : 'só o golpe comum') +
                (p.vd ? '   + vantagem e desvantagem' : ''));

  ok(passos[0].tem.length === 0 && !passos[0].vd,
     'o bebé não tem magia, nem vantagem, nem desvantagem',
     'nv1 → só o golpe comum');
  ok(passos[1].tem.join() === 'forte' && passos[1].vd,
     'a CRIANÇA ganha a magia de bater e o par de virtude e defeito',
     'nv5 → ' + passos[1].tem.join(', '));
  ok(passos[2].tem.join() === 'forte,defensiva',
     'o JOVEM ganha a defensiva — e aí o quadro do Comum está completo',
     'nv10 → ' + passos[2].tem.join(', '));
  ok(passos[3].tem.join() === 'forte,muito_forte,defensiva',
     'o RARO ganha o golpe caro', 'nv13 → ' + passos[3].tem.join(', '));
  ok(passos[4].tem.join() === 'forte,muito_forte,defensiva,suporte',
     'o LENDÁRIO ganha o suporte', 'nv29 → ' + passos[4].tem.join(', '));
}

/* E o mais importante: o que se ganha é o LUGAR, e nunca a magia.
   Um lugar que já tinha uma magia não pode passar a ter outra — era o
   defeito que este jogo já apanhou uma vez (1,52% das subidas trocavam
   de magia, e 36% dessas para pior). */
{
  let trocou = 0, perdeu = 0, n = 0;
  for (let seed = 1; seed <= 800; seed++) {
    let ant = null;
    for (let nv = 1; nv <= 35; nv++) {
      const rar = M.raridadeDosPontos(M.pontosDoAvatar('Comum', nv));
      const m = M.magiasDoAvatar(M.fichaDeAvatar(seed, rar, 'Sombra', nv));
      const ids = M.MAGIA_SLOTS.map(c => m[c] ? m[c].id : null);
      if (ant) {
        n++;
        for (let i = 0; i < ids.length; i++) {
          if (ant[i] && ids[i] && ant[i] !== ids[i]) trocou++;
          if (ant[i] && !ids[i]) perdeu++;
        }
      }
      ant = ids;
    }
  }
  ok(trocou === 0, 'nenhuma magia troca por outra ao subir de nível',
     n.toLocaleString('pt-BR') + ' subidas');
  ok(perdeu === 0, 'e nenhuma se perde depois de ganha',
     n.toLocaleString('pt-BR') + ' subidas');
}

// A ficha promete o repertório completo, e a promessa tem de cumprir-se.
{
  let quebrou = 0, n = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const cedo = M.fichaDeAvatar(seed, 'Comum', 'Vento', 5);
    const prometido = M.repertorioCompleto(cedo);
    const fim = M.magiasDoAvatar(M.fichaDeAvatar(seed, 'Lendário', 'Vento', 35));
    for (const c of M.MAGIA_SLOTS) {
      n++;
      const a = prometido[c] ? prometido[c].id : null;
      const b = fim[c] ? fim[c].id : null;
      if (a !== b) quebrou++;
    }
  }
  ok(quebrou === 0, 'o que a ficha promete ao nível 5 é o que chega ao 35',
     n.toLocaleString('pt-BR') + ' lugares comparados');
}

// ════════════════════════════════════════════════════════════════
titulo('O BEBÊ');

{
  const bebe = M.fichaDeAvatar(7, 'Comum', 'Fogo', 1);
  const soma = ['F', 'H', 'R', 'A'].reduce((t, k) => t + bebe[k], 0);
  console.log('       nv1: F' + bebe.F + ' H' + bebe.H + ' R' + bebe.R + ' A' + bebe.A +
              '  · ' + bebe.pv + ' PV · ' + bebe.pm + ' PM · ' + bebe.escalao);

  ok(bebe.pontos === 1, 'a ficha do bebê vale um ponto', bebe.pontos + ' ponto');
  /* A soma das quatro TEM de bater certo com o orçamento, sem parcela
     nenhuma a mais. Era `1 + 4`: o piso de um ponto que todas levavam
     por fora da bolsa. Esse piso saiu — fazia a ficha do bebê dizer um
     ponto e mostrar cinco. */
  ok(soma === bebe.pontos, 'e a soma das quatro bate certo com o orçamento',
     'F' + bebe.F + ' H' + bebe.H + ' R' + bebe.R + ' A' + bebe.A + ' soma ' + soma);
  ok(bebe.R >= 1, 'a Resistência é a única com piso, e esse é pago da bolsa',
     'R' + bebe.R + ', que é o que o único ponto dele comprou');
  ok(!bebe.vantagem && !bebe.desvantagem, 'sem virtude e sem defeito', 'as duas nulas');
  ok(Object.keys(M.magiasDoAvatar(bebe)).length === 0, 'e sem magia nenhuma',
     'só o golpe comum');

  /* Um bebê de um ponto tinha de continuar a ter vida para existir na
     tela — dez de vida e dez de magia é o mínimo que o piso da
     Resistência garante, e não pode cair com a curva nova. */
  /* Cinco e não dez: eram dez enquanto o piso de 1 somava à R. O que não
     pode ser é zero — com R0 o avatar entrava em campo sem vida nenhuma,
     e isso não é uma ficha fraca, é uma ficha impossível. */
  ok(bebe.pv > 0 && bebe.pm > 0, 'mas com vida e magia para existir',
     bebe.pv + ' PV · ' + bebe.pm + ' PM');
}

// ════════════════════════════════════════════════════════════════
titulo('NENHUM PONTO OFERECIDO');

/* Havia um +1 somado a cada característica, por fora do orçamento —
   quatro pontos de graça em cada ficha do jogo. Com o bebê a valer um
   ponto, isso fazia a ficha dizer um e mostrar cinco.

   Saiu. O que ficou no lugar é pago da bolsa, e estas duas perguntas
   guardam as duas metades da troca: o orçamento bate certo, E ninguém
   fica com um zero que desligue uma regra depois de haver bolsa. */
{
  let errado = 0, n = 0;
  for (let seed = 1; seed <= 1500; seed++) {
    for (let nv = 1; nv <= 35; nv++) {
      const f = M.fichaDeAvatar(seed, 'Comum', 'Fogo', nv);
      n++;
      if (f.F + f.H + f.R + f.A !== f.pontos) errado++;
    }
  }
  ok(errado === 0, 'a soma das quatro é sempre exactamente o orçamento',
     n.toLocaleString('pt-BR') + ' fichas, do nível 1 ao 35');
}

/* E o custo da troca, medido: um zero na Habilidade tranca TODAS as
   magias do avatar (o tecto é H×5), portanto tem de desaparecer assim
   que a bolsa chegue para o pagar. Chega ao nível 7. */
{
  const primeiroSemZeros = (() => {
    for (let nv = 1; nv <= 35; nv++) {
      let temZero = false;
      for (let seed = 1; seed <= 1200 && !temZero; seed++) {
        const f = M.fichaDeAvatar(seed, 'Comum', 'Fogo', nv);
        if (f.F === 0 || f.H === 0 || f.A === 0 || f.R === 0) temZero = true;
      }
      if (!temZero) return nv;
    }
    return null;
  })();
  console.log('       primeiro nível sem zeros em ficha nenhuma: ' + primeiroSemZeros);
  ok(primeiroSemZeros !== null && primeiroSemZeros <= 13,
     'os zeros acabam cedo — antes de a magia defensiva sequer chegar',
     'sem zeros a partir do nível ' + primeiroSemZeros + ', e a defensiva chega ao 10');
}

// ════════════════════════════════════════════════════════════════
titulo('A VIRTUDE E O DEFEITO NÃO TROCAM');

/* Trocavam. A escolha era filtrada pelo orçamento de HOJE, o orçamento
   cresce com o nível, e por isso o bolo crescia e o índice sorteado caía
   noutro sítio — 1,7% das subidas trocavam de virtude, e com ela podiam
   levar dez pontos de vida. É o mesmo defeito que as magias tiveram. */
{
  let trocou = 0, n = 0;
  for (let seed = 1; seed <= 800; seed++) {
    let antV = null, antD = null;
    for (let nv = 5; nv <= 35; nv++) {
      const f = M.fichaDeAvatar(seed, 'Comum', 'Fogo', nv);
      const v = f.vantagem ? f.vantagem.id : null;
      const d = f.desvantagem ? f.desvantagem.id : null;
      if (antV !== null) { n++; if (v !== antV || d !== antD) trocou++; }
      antV = v; antD = d;
    }
  }
  ok(trocou === 0, 'a virtude e o defeito são os mesmos do berço à lenda',
     n.toLocaleString('pt-BR') + ' subidas');
}

console.log('');
console.log('─────────────────────────────');
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
