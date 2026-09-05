// ═══════════════════════════════════════════════════════════════════
// A PROGRESSÃO E AS RARIDADES
//
//   node tools/progressao.js
//
// Duas perguntas que nenhuma auditoria de magia responde: subir de nível
// vale alguma coisa, e a raridade continua a valer depois de se subir?
//
// Não julga se os números estão certos — não há certo, isso é decisão de
// quem faz o jogo. Mostra o que eles FAZEM, que é o que permite decidir.
//
// ── DUAS ARMADILHAS QUE ESTA FERRAMENTA JÁ CAIU ──
//
// A primeira: usei 10 XP por vitória, que é o valor de recurso do código
// para quando a dificuldade não é conhecida. Dava 7610 batalhas até ao
// nível 35. Os patamares a sério são 14, 28, 55 e 90.
//
// A segunda, mais traiçoeira: pus Fogo de um lado e Terra do outro e
// chamei à diferença "o efeito do nível". Não era — o Fogo perde ao
// Terra por ser Fogo. Um controlo de iguais contra iguais tem de dar
// perto de 50%, e não dava. Daí em diante todas as medidas de combate
// correm com o MESMO elemento dos dois lados e nos DOIS sentidos, e os
// empates aparecem à parte em vez de contarem como derrotas.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const RARIDADES = ['Comum', 'Raro', 'Lendário'];
const NIVEIS = [1, 5, 10, 17, 25, 35];
const ELEM = ['Fogo', 'Terra', 'Água', 'Vento', 'Sombra'];

// A curva de XP e os pontos, copiados do js/state.js e do js/ficha-3dt.js,
// que não são carregados aqui.
function xpParaNivel(n) {
  if (n < 5)  return 400;
  if (n < 10) return 800;
  if (n < 17) return 1500;
  if (n < 25) return 2500;
  if (n < 35) return 4000;
  return 6000;
}
const PONTOS_BASE = { 'Comum': 5, 'Raro': 7, 'Lendário': 10 };
const pontosDoAvatar = (r, n) => PONTOS_BASE[r] + Math.floor((Math.max(1, n || 1) - 1) / 4);

const XP_RARIDADE = { 'Comum': 1.0, 'Raro': 1.3, 'Lendário': 1.6 };
const TIERS = [
  { nome: 'Fácil',   xp: 14, minNivel: 1  },
  { nome: 'Médio',   xp: 28, minNivel: 6  },
  { nome: 'Difícil', xp: 55, minNivel: 13 },
  { nome: 'Mestre',  xp: 90, minNivel: 21 },
];
const melhorTier = (n) => TIERS.filter(t => n >= t.minNivel).pop();
const VINCULO = 1.10;   // o vínculo sobe sozinho a jogar; fico pelo meio
const PREMIO = { vitoria: 2.2, derrota: 0.6, empate: 1.0 };

// Um gerador próprio, para as medidas se repetirem de corrida para corrida.
function rng(seed) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}

function correr(cfgA, cfgB, seed) {
  const e = M.combate3dtIniciar(
    [1, 2, 3].map(i => Object.assign({ nome: 'A' + i, seed: seed * 10 + i }, cfgA)),
    [1, 2, 3].map(i => Object.assign({ nome: 'B' + i, seed: seed * 10 + i + 5 }, cfgB)),
    seed, {});
  let k = 0;
  while (!e.acabou && k++ < 60) M.combate3dtTurno(e);
  return M.combate3dtResultado(e).vencedor;
}

console.log('\n═══ 1. O QUE UM NÍVEL COMPRA ═══\n');
{
  console.log('  pontos de ficha por raridade e nível:');
  console.log('    nível    ' + RARIDADES.map(r => r.padEnd(10)).join(''));
  for (const n of NIVEIS) {
    const l = RARIDADES.map(r => String(M.fichaDeAvatar(1, r, n).pontos).padEnd(10));
    console.log('    ' + String(n).padStart(5) + '    ' + l.join(''));
  }
  console.log('');
  console.log('  um ponto a cada 4 níveis: os 34 níveis do jogo compram 8 pontos.');
  console.log('  nascer Lendário em vez de Comum compra 5, de graça e logo.');
}

console.log('\n═══ 2. A RARIDADE DILUI-SE? ═══\n');
{
  console.log('  a vantagem do Lendário sobre o Comum, em pontos:');
  for (const n of NIVEIS) {
    const c = M.fichaDeAvatar(1, 'Comum', n).pontos;
    const l = M.fichaDeAvatar(1, 'Lendário', n).pontos;
    console.log(`    nível ${String(n).padStart(2)}  ${c} vs ${l}  ` +
                `→ +${l - c} pontos, ${(l / c).toFixed(2)}× em proporção`);
  }
  console.log('');
  console.log('  a diferença ABSOLUTA nunca muda (são sempre 5 pontos);');
  console.log('  a RELATIVA cai de 2× para 1,38× ao longo do jogo.');
}

console.log('\n═══ 3. QUANTO VALE UM PONTO, EM COMBATE ═══\n');
{
  /* Isto mede o combate ISOLADO — dois lados escolhidos por mim, para
     ver o que a ficha faz. Não é o que o jogador vive; isso é a secção
     seguinte, e dá outra coisa. */
  function medir(x, y, n) {
    let vx = 0, vy = 0, emp = 0;
    for (const el of ELEM) for (let s = 1; s <= n; s++) {
      // os dois sentidos, para o lado não contar
      let v = correr(Object.assign({ elemento: el }, x), Object.assign({ elemento: el }, y), s);
      if (v === 'A') vx++; else if (v === 'B') vy++; else emp++;
      v = correr(Object.assign({ elemento: el }, y), Object.assign({ elemento: el }, x), s + 9000);
      if (v === 'B') vx++; else if (v === 'A') vy++; else emp++;
    }
    const tot = vx + vy + emp;
    return { pc: Math.round(100 * vx / tot), pce: Math.round(100 * emp / tot),
             dec: (vx + vy) ? Math.round(100 * vx / (vx + vy)) : 0 };
  }
  const L = (rot, o) => console.log(`  ${rot.padEnd(32)} ${String(o.pc + '%').padStart(4)} vence · ` +
                                    `${String(o.pce + '%').padStart(4)} empata · ${String(o.dec + '%').padStart(4)} das decididas`);

  console.log('  o nível, com a raridade igual dos dois lados:');
  for (const r of ['Comum', 'Lendário'])
    for (const [a, b] of [[1, 5], [1, 20], [10, 20], [20, 35]])
      L(`   ${r} n${a} contra n${b}`, medir({ raridade: r, nivel: a }, { raridade: r, nivel: b }, 30));

  console.log('');
  console.log('  a raridade, com o nível igual dos dois lados:');
  for (const n of [1, 35]) {
    L(`   nível ${n}: Comum vs Raro`,     medir({ raridade: 'Comum', nivel: n }, { raridade: 'Raro', nivel: n }, 30));
    L(`   nível ${n}: Comum vs Lendário`, medir({ raridade: 'Comum', nivel: n }, { raridade: 'Lendário', nivel: n }, 30));
  }

  console.log('');
  console.log('  quantos níveis são precisos para apanhar uma raridade:');
  for (const [nc, nl] of [[10, 1], [25, 1], [35, 1], [35, 20]])
    L(`   Comum n${nc} contra Lendário n${nl}`, medir({ raridade: 'Comum', nivel: nc }, { raridade: 'Lendário', nivel: nl }, 30));
}

console.log('\n═══ 4. A BATALHA QUE O JOGADOR VIVE MESMO ═══\n');
{
  /* A secção acima escolhe os dois lados. O jogo NÃO: o _pveGerarInimigo
     monta a equipa adversária com o MESMO total de pontos da do jogador,
     sempre. O patamar de dificuldade não toca no inimigo — só multiplica
     o prémio. Portanto o que o jogador vive é sempre um espelho, e é
     isso que esta secção mede, com o mesmo emparelhamento do jogo. */
  function gerarInimigo(pontosAlvo, rnd) {
    const eq = [];
    let restante = pontosAlvo;
    for (let i = 0; i < 3; i++) {
      const alvo = Math.round(restante / (3 - i));
      let m = { rar: 'Comum', nv: 1, dif: 999 };
      for (const rar of RARIDADES) for (let nv = 1; nv <= 35; nv++) {
        const d = Math.abs(pontosDoAvatar(rar, nv) - alvo);
        if (d < m.dif) m = { rar, nv, dif: d };
      }
      eq.push({ nome: 'E' + i, elemento: ELEM[Math.floor(rnd() * ELEM.length)],
                raridade: m.rar, nivel: m.nv, seed: Math.floor(rnd() * 1e6) });
      restante -= pontosDoAvatar(m.rar, m.nv);
    }
    return eq;
  }
  function espelho(rar, nv, n) {
    const rnd = rng(1234 + nv * 7 + rar.length);
    let v = 0, d = 0, emp = 0;
    const pontos = 3 * pontosDoAvatar(rar, nv);
    for (let s = 1; s <= n; s++) {
      const eq = [1, 2, 3].map(i => ({ nome: 'A' + i, elemento: ELEM[Math.floor(rnd() * ELEM.length)],
                                       raridade: rar, nivel: nv, seed: Math.floor(rnd() * 1e6) }));
      const e = M.combate3dtIniciar(eq, gerarInimigo(pontos, rnd), Math.floor(rnd() * 1e6), {});
      let k = 0;
      while (!e.acabou && k++ < 60) M.combate3dtTurno(e);
      const r = M.combate3dtResultado(e).vencedor;
      if (r === 'A') v++; else if (r === 'B') d++; else emp++;
    }
    return { v, d, emp, n, mult: (v * PREMIO.vitoria + d * PREMIO.derrota + emp * PREMIO.empate) / n };
  }
  espelho.cache = {};

  console.log('  300 batalhas por linha, contra o inimigo que o jogo monta:\n');
  console.log('    raridade  nível  vence  perde  empata   XP por batalha');
  for (const rar of RARIDADES) {
    for (const nv of NIVEIS) {
      const o = espelho(rar, nv, 300);
      const pc = x => String(Math.round(100 * x / o.n) + '%').padStart(5);
      const xp = melhorTier(nv).xp * XP_RARIDADE[rar] * VINCULO * o.mult;
      console.log(`    ${rar.padEnd(9)} n${String(nv).padStart(2)}  ${pc(o.v)}  ${pc(o.d)}  ${pc(o.emp)}   ` +
                  `${String(Math.round(xp)).padStart(6)} XP`);
    }
  }
  console.log('');
  console.log('  vence e perde andam colados: o emparelhamento por pontos');
  console.log('  faz o seu trabalho. O que muda é a terceira coluna.');
  console.log('');
  console.log('  ── e o patamar de dificuldade não é uma dificuldade ──');
  console.log('');
  console.log('  a Mina muda de tabuleiro com o patamar, o Labirinto muda de');
  console.log('  tamanho, de tempo e de alcance de vista. A batalha não muda');
  console.log('  nada: o inimigo sai igualado em pontos seja qual for o');
  console.log('  patamar, e o patamar só multiplica o prémio por 14, 28, 55');
  console.log('  ou 90. Escolher FÁCIL é a mesma luta por um sexto do XP,');
  console.log('  portanto ninguém tem razão nenhuma para o escolher.');
  console.log('');
  console.log('  e por isso a raridade NÃO se sente em combate no PvE: quem é');
  console.log('  Lendário leva mais pontos para a mesa e recebe um inimigo à');
  console.log('  altura. A raridade paga-se no prémio, não na vitória — o que');
  console.log('  deixa de ser verdade no dia em que houver PvP.');

  console.log('\n  ── o XP por batalha ao longo do jogo (Comum) ──\n');
  let ant = null;
  for (let nv = 1; nv <= 35; nv += 4) {
    const o = espelho('Comum', nv, 150);
    const xp = melhorTier(nv).xp * XP_RARIDADE['Comum'] * VINCULO * o.mult;
    const seta = ant == null ? ' ' : (xp > ant + 1 ? '↑' : xp < ant - 1 ? '↓' : '=');
    ant = xp;
    console.log(`    n${String(nv).padStart(2)}  ${String(Math.round(xp)).padStart(4)} XP  ${seta}   ` +
                `(o prémio médio é ${o.mult.toFixed(2)}×, não os 2,2× da vitória)`);
  }
  console.log('');
  console.log('    o último patamar abre ao nível 21 e não há mais nenhum.');
  console.log('    Daí para a frente o XP por batalha pára — e o XP pedido');
  console.log('    por nível sobe de 2500 para 4000. Os últimos catorze');
  console.log('    níveis são de longe os mais lentos do jogo.');

  console.log('\n  ── tempo até ao nível 35, com o que a batalha dá mesmo ──\n');
  for (const rar of RARIDADES) {
    const cache = {};
    let bat = 0;
    for (let nv = 1; nv < 35; nv++) {
      const k = Math.floor(nv / 3) * 3;
      if (cache[k] == null) cache[k] = espelho(rar, Math.max(1, k), 150).mult;
      bat += Math.ceil(xpParaNivel(nv) / (melhorTier(nv).xp * XP_RARIDADE[rar] * VINCULO * cache[k]));
    }
    console.log(`    ${rar.padEnd(9)} ${String(bat).padStart(4)} batalhas · ${Math.ceil(bat / 10)} dias a dez por dia`);
  }
  console.log('');
  console.log('    a conta ingénua — supor que se ganha sempre — dá pouco');
  console.log('    mais de metade disto. Ganha-se um terço das vezes.');
}

console.log('\n═══ 5. PORQUE É QUE AS BATALHAS DEIXAM DE ACABAR ═══\n');
{
  console.log('  nível   PV médio   dano por golpe   golpes para matar   golpes que não furam');
  for (const nv of NIVEIS) {
    let pv = 0, dano = 0, golpes = 0, zeros = 0, quantos = 0;
    for (let s = 1; s <= 120; s++) {
      const eq = (lado) => [1, 2, 3].map(i => ({
        nome: lado + i, elemento: ELEM[(s + i) % 5], raridade: 'Comum', nivel: nv,
        seed: s * 10 + i + (lado === 'B' ? 5 : 0) }));
      const e = M.combate3dtIniciar(eq('A'), eq('B'), s, { historico: true });
      e.A.concat(e.B).forEach(c => { pv += c.pvMax; quantos++; });
      let k = 0;
      while (!e.acabou && k++ < 60) M.combate3dtTurno(e);
      for (const ev of (e.eventos || [])) if (ev.dano != null) {
        golpes++; dano += ev.dano; if (ev.dano === 0) zeros++;
      }
    }
    const pvm = pv / quantos, dm = dano / golpes;
    console.log(`  n${String(nv).padStart(2)}    ${pvm.toFixed(1).padStart(6)}   ${dm.toFixed(2).padStart(12)}   ` +
                `${(pvm / dm).toFixed(1).padStart(15)}   ${String(Math.round(100 * zeros / golpes) + '%').padStart(14)}`);
  }
  console.log('');
  console.log('  o PV é a Resistência vezes cinco, e por isso DOBRA com os');
  console.log('  pontos. O dano é a Força menos a Armadura do outro, e como');
  console.log('  os dois lados crescem juntos, fica onde estava: 1,25 → 1,36');
  console.log('  ao longo de trinta e quatro níveis.');
  console.log('');
  console.log('  são precisos 24 golpes para derrubar um avatar de nível 35,');
  console.log('  vezes três avatares, em 60 turnos (o C3_MAX_TURNOS). Não dá.');
}

console.log('\n═══ 6. OS ELEMENTOS SÃO PÁREO UNS DOS OUTROS? ═══\n');
{
  /* Foi a descobrir isto que percebi que a secção 3 estava contaminada.
     Cada par corre nos dois sentidos: a percentagem é do elemento da
     linha, e os empates ficam no denominador. */
  function par(a, b, n) {
    let x = 0, tot = 0;
    for (let s = 1; s <= n; s++) {
      let v = correr({ elemento: a, raridade: 'Comum', nivel: 20 }, { elemento: b, raridade: 'Comum', nivel: 20 }, s);
      if (v === 'A') x++; tot++;
      v = correr({ elemento: b, raridade: 'Comum', nivel: 20 }, { elemento: a, raridade: 'Comum', nivel: 20 }, s + 9000);
      if (v === 'B') x++; tot++;
    }
    return Math.round(100 * x / tot);
  }
  console.log('  Comum n20, 160 batalhas por par, nos dois sentidos:\n');
  console.log('           ' + ELEM.map(e => e.padEnd(9)).join('') + 'média');
  const media = {};
  for (const a of ELEM) {
    const cel = [];
    let som = 0, c = 0;
    for (const b of ELEM) {
      if (a === b) { cel.push('—'.padEnd(9)); continue; }
      const pc = par(a, b, 80);
      som += pc; c++;
      cel.push((pc + '%').padEnd(9));
    }
    media[a] = Math.round(som / c);
    console.log('  ' + a.padEnd(9) + cel.join('') + media[a] + '%');
  }
  console.log('');
  const ord = ELEM.slice().sort((x, y) => media[y] - media[x]);
  console.log('  ' + ord.map(e => `${e} ${media[e]}%`).join(' · '));
  console.log('');
  console.log(`  o ${ord[0]} ganha quase o dobro das vezes do ${ord[ord.length - 1]}.`);
  console.log('  no PvE isto quase não se sente, porque o inimigo é sorteado');
  console.log('  entre os cinco; num PvP em que se escolhe, sente-se todo.');
}

console.log('\n═══ 7. O QUE A RARIDADE DÁ ALÉM DOS PONTOS ═══\n');
{
  const B = {
    'Comum':    { xp: 1.0, moedas: 1.0, decay: 1.0, eggs: 1, burnBonus: 0,    shopDiscount: 0    },
    'Raro':     { xp: 1.3, moedas: 1.2, decay: 0.8, eggs: 2, burnBonus: 0.25, shopDiscount: 0.10 },
    'Lendário': { xp: 1.6, moedas: 1.5, decay: 0.6, eggs: 3, burnBonus: 0.5,  shopDiscount: 0.20 },
  };
  console.log('    raridade   XP     moedas  desgaste  ovos  queima  desconto');
  for (const r of RARIDADES) {
    const b = B[r];
    console.log(`    ${r.padEnd(10)} ${('×' + b.xp).padEnd(6)} ${('×' + b.moedas).padEnd(7)} ` +
                `${('×' + b.decay).padEnd(9)} ${String(b.eggs).padEnd(5)} ` +
                `${('+' + (b.burnBonus * 100) + '%').padEnd(7)} ${b.shopDiscount * 100}%`);
  }
  console.log('');
  console.log('  é aqui que a raridade se paga, e não no combate: o Lendário');
  console.log('  perde fome e humor a 60% da velocidade do Comum, e chega ao');
  console.log('  nível 35 em dois terços do tempo.');
}
console.log('');
