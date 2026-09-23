#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════════
   O RANK É JUSTO? — uma temporada simulada, com o código de verdade

     node tools/simular-rank.js

   NÃO simula combate: combate é humano contra humano e não se simula.
   Simula o SISTEMA DE PONTOS. Cada jogador tem uma habilidade real
   escondida, o resultado de cada luta sai dela, e os pontos são
   calculados pelo js/pvp-rank.js tal como está no jogo. No fim
   pergunta-se uma coisa só: a tabela ficou na ordem da habilidade?

   A medida é o Spearman entre a ordem da tabela e a ordem da habilidade
   real — 1 é perfeito, 0 é sorteio. Junto vai quantos dos dez melhores
   de verdade aparecem no top 10, que é o que o jogador vê.

   O pareamento usa a regra real da fila (js/pvp-regras.js): por PODER
   DE EQUIPA. As seções do fim medem o que mudaria se fosse por pontos,
   com lutas de colocação, e com tabelas separadas por faixa de nível.
   ══════════════════════════════════════════════════════════════════ */

const R   = require('../js/pvp-regras.js');
const RK2 = require('../js/pvp-rank.js');

// ── um gerador repetível ──
let _s = 12345;
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
const normal = (m, d) => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd();
  return m + d * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

const AGORA = Date.parse('2026-09-23T12:00:00Z');

function temporada(opcoes) {
  const o = Object.assign({ jogadores: 200, partidas: 30, correlacao: 0, k: null }, opcoes || {});
  const gente = [];
  for (let i = 0; i < o.jogadores; i++) {
    const hab = normal(1000, 200);                       // a habilidade REAL, escondida
    // O poder da equipa: nível dos bichos. Com correlacao=0 é independente
    // da habilidade (quem cuida muito pode jogar mal, e vice-versa).
    const base = normal(60, 20);
    const poder = Math.max(9, Math.round(o.correlacao * (hab - 1000) / 10 + base));
    gente.push({ id: 'p' + i, hab, poder, rank: null, lutas: 0 });
  }

  const vitoria = (a, b) => 1 / (1 + Math.pow(10, (b.hab - a.hab) / 400));

  let paresSemAdversario = 0;
  for (let rodada = 0; rodada < o.partidas; rodada++) {
    const fila = gente.slice().sort(() => rnd() - 0.5);
    const usados = new Set();
    for (const eu of fila) {
      if (usados.has(eu.id)) continue;
      // A faixa da fila, como no jogo: ±10% do poder, abrindo com a espera.
      // Dá-se uma espera média de 30 s.
      const [lo, hi] = R.pvpFaixa(eu.poder, 30000);
      let melhor = null;
      for (const outro of fila) {
        if (outro.id === eu.id || usados.has(outro.id)) continue;
        if (outro.poder < lo || outro.poder > hi) continue;
        if (!melhor || Math.abs(outro.poder - eu.poder) < Math.abs(melhor.poder - eu.poder)) melhor = outro;
      }
      if (!melhor) { paresSemAdversario++; continue; }
      usados.add(eu.id); usados.add(melhor.id);

      const p = vitoria(eu, melhor);
      const euGanhou = rnd() < p;
      const antesEu = RK2.pvpRankAtual(eu.rank, AGORA).pontos;
      const antesEle = RK2.pvpRankAtual(melhor.rank, AGORA).pontos;
      eu.rank     = RK2.pvpRankSomar(eu.rank, antesEle, euGanhou ? 'vitoria' : 'derrota', AGORA);
      melhor.rank = RK2.pvpRankSomar(melhor.rank, antesEu, euGanhou ? 'derrota' : 'vitoria', AGORA);
      eu.lutas++; melhor.lutas++;
    }
  }
  return { gente, paresSemAdversario };
}

// ── as medidas ──
function spearman(gente) {
  const porHab = gente.slice().sort((a, b) => b.hab - a.hab).map(g => g.id);
  const porPts = gente.slice().sort((a, b) => (b.rank ? b.rank.pontos : 1000) - (a.rank ? a.rank.pontos : 1000)).map(g => g.id);
  const posH = {}, posP = {};
  porHab.forEach((id, i) => posH[id] = i);
  porPts.forEach((id, i) => posP[id] = i);
  const n = gente.length;
  let soma = 0;
  for (const g of gente) { const d = posH[g.id] - posP[g.id]; soma += d * d; }
  return 1 - (6 * soma) / (n * (n * n - 1));
}

function relatorio(nome, r) {
  const g = r.gente.filter(x => x.rank);
  const pts = g.map(x => x.rank.pontos);
  const piso = pts.filter(p => p <= RK2.PVP_RANK_PISO).length;
  const topo10 = g.slice().sort((a, b) => b.rank.pontos - a.rank.pontos).slice(0, 10);
  const melhores10 = g.slice().sort((a, b) => b.hab - a.hab).slice(0, 10).map(x => x.id);
  const acerto = topo10.filter(x => melhores10.indexOf(x.id) !== -1).length;
  const lutas = g.map(x => x.lutas);
  console.log('\n── ' + nome + ' ──');
  console.log('  jogadores que lutaram: ' + g.length + '  ·  lutas por cabeça: ' +
              Math.round(lutas.reduce((a, b) => a + b, 0) / g.length));
  console.log('  ordem certa (Spearman, 1 = perfeito): ' + spearman(g).toFixed(3));
  console.log('  dos 10 melhores de verdade, quantos estão no top 10 da tabela: ' + acerto + '/10');
  console.log('  pontos: menor ' + Math.min(...pts) + ' · maior ' + Math.max(...pts) +
              ' · no piso ' + piso + ' (' + Math.round(piso / g.length * 100) + '%)');
  console.log('  ninguém encontrou adversário: ' + r.paresSemAdversario + ' vezes');
}

console.log('═══ O RANK, MEDIDO ═══');
console.log('200 jogadores, habilidade real ~ N(1000, 200), pareados pela fila de verdade.');

relatorio('30 lutas · poder da equipa INDEPENDENTE da habilidade', temporada({ partidas: 30, correlacao: 0 }));
relatorio('10 lutas · poder independente', temporada({ partidas: 10, correlacao: 0 }));
relatorio('60 lutas · poder independente', temporada({ partidas: 60, correlacao: 0 }));
relatorio('30 lutas · quem joga melhor TAMBÉM tem equipa melhor', temporada({ partidas: 30, correlacao: 1 }));

/* ── E se o pareamento fosse pelos PONTOS, e não pelo poder? ── */
function temporadaPorPontos(partidas) {
  const gente = [];
  for (let i = 0; i < 200; i++) gente.push({ id: 'p' + i, hab: normal(1000, 200), poder: 0, rank: null, lutas: 0 });
  const vitoria = (a, b) => 1 / (1 + Math.pow(10, (b.hab - a.hab) / 400));
  for (let rodada = 0; rodada < partidas; rodada++) {
    const fila = gente.slice().sort((a, b) =>
      RK2.pvpRankAtual(a.rank, AGORA).pontos - RK2.pvpRankAtual(b.rank, AGORA).pontos);
    for (let i = 0; i + 1 < fila.length; i += 2) {
      const eu = fila[i], ele = fila[i + 1];
      const p = vitoria(eu, ele);
      const euGanhou = rnd() < p;
      const a1 = RK2.pvpRankAtual(eu.rank, AGORA).pontos, a2 = RK2.pvpRankAtual(ele.rank, AGORA).pontos;
      eu.rank  = RK2.pvpRankSomar(eu.rank, a2, euGanhou ? 'vitoria' : 'derrota', AGORA);
      ele.rank = RK2.pvpRankSomar(ele.rank, a1, euGanhou ? 'derrota' : 'vitoria', AGORA);
      eu.lutas++; ele.lutas++;
    }
  }
  return { gente, paresSemAdversario: 0 };
}
relatorio('30 lutas · pareado por PONTOS (hipótese)', temporadaPorPontos(30));

/* ── Dois combinados na fila: quanto sobe quem trapaceia? ── */
console.log('\n── Conluio: dois amigos entram juntos e um deixa o outro ganhar ──');
{
  const r = temporada({ partidas: 30, correlacao: 0 });
  const meio = r.gente.filter(g => g.rank).sort((a, b) => b.rank.pontos - a.rank.pontos);
  const golpista = meio[Math.floor(meio.length / 2)];
  const vitima   = meio[Math.floor(meio.length / 2) + 1];
  const antes = golpista.rank.pontos;
  let g = golpista.rank, v = vitima.rank;
  for (let i = 0; i < 20; i++) {
    const pg = RK2.pvpRankAtual(g, AGORA).pontos, pv = RK2.pvpRankAtual(v, AGORA).pontos;
    g = RK2.pvpRankSomar(g, pv, 'vitoria', AGORA);
    v = RK2.pvpRankSomar(v, pg, 'derrota', AGORA);
  }
  console.log('  20 vitórias combinadas: ' + antes + ' → ' + g.pontos +
              ' (o parceiro cai para ' + v.pontos + ')');
  console.log('  posição na tabela: ' + (meio.indexOf(golpista) + 1) + 'º → ' +
              (meio.filter(x => x.rank.pontos > g.pontos).length + 1) + 'º');
}

/* ── DUAS CORREÇÕES, MEDIDAS ──
   (a) parear por PONTOS dentro de uma faixa de poder larga;
   (b) K maior nas primeiras lutas (as de colocação). */
function temporadaCorrigida(opcoes) {
  const o = Object.assign({ partidas: 30, correlacao: 0, colocacao: 0, porPontos: true, faixa: 0.35 }, opcoes);
  const gente = [];
  for (let i = 0; i < 200; i++) {
    const hab = normal(1000, 200);
    const poder = Math.max(9, Math.round(o.correlacao * (hab - 1000) / 10 + normal(60, 20)));
    gente.push({ id: 'p' + i, hab, poder, rank: null, lutas: 0 });
  }
  const vitoria = (a, b) => 1 / (1 + Math.pow(10, (b.hab - a.hab) / 400));
  // o mesmo cálculo do jogo, com K variável
  const somar = (reg, pontosDele, res, k) => {
    const r = RK2.pvpRankAtual(reg, AGORA);
    const s = res === 'vitoria' ? 1 : 0;
    const esp = RK2.pvpRankEsperado(r.pontos, pontosDele);
    let d = Math.round(k * (s - esp));
    d = s === 1 ? Math.max(1, d) : Math.min(-1, d);
    return Object.assign({}, r, { pontos: Math.max(RK2.PVP_RANK_PISO, r.pontos + d), delta: d,
                                  v: r.v + s, d: r.d + (1 - s), em: AGORA });
  };
  let semPar = 0;
  for (let rodada = 0; rodada < o.partidas; rodada++) {
    let fila = gente.slice().sort(() => rnd() - 0.5);
    if (o.porPontos) fila = fila.sort((a, b) =>
      RK2.pvpRankAtual(a.rank, AGORA).pontos - RK2.pvpRankAtual(b.rank, AGORA).pontos);
    const usados = new Set();
    for (const eu of fila) {
      if (usados.has(eu.id)) continue;
      const lo = eu.poder * (1 - o.faixa), hi = eu.poder * (1 + o.faixa);
      const cand = fila.filter(x => !usados.has(x.id) && x.id !== eu.id && x.poder >= lo && x.poder <= hi);
      if (!cand.length) { semPar++; continue; }
      // dentro da faixa de poder, o mais próximo em PONTOS
      const meus = RK2.pvpRankAtual(eu.rank, AGORA).pontos;
      const ele = cand.reduce((m, x) => {
        const d = Math.abs(RK2.pvpRankAtual(x.rank, AGORA).pontos - meus);
        return (!m || d < m.d) ? { x, d } : m; }, null).x;
      usados.add(eu.id); usados.add(ele.id);
      const kEu  = eu.lutas  < o.colocacao ? 48 : RK2.PVP_RANK_K;
      const kEle = ele.lutas < o.colocacao ? 48 : RK2.PVP_RANK_K;
      const p = vitoria(eu, ele), euGanhou = rnd() < p;
      const a1 = RK2.pvpRankAtual(eu.rank, AGORA).pontos, a2 = RK2.pvpRankAtual(ele.rank, AGORA).pontos;
      eu.rank  = somar(eu.rank,  a2, euGanhou ? 'vitoria' : 'derrota', kEu);
      ele.rank = somar(ele.rank, a1, euGanhou ? 'derrota' : 'vitoria', kEle);
      eu.lutas++; ele.lutas++;
    }
  }
  return { gente, paresSemAdversario: semPar };
}
console.log('\n═══ E SE FOSSE ASSIM ═══');
relatorio('(a) pontos dentro de ±35% de poder · 30 lutas', temporadaCorrigida({ partidas: 30 }));
relatorio('(a)+(b) com 10 lutas de colocação (K 48)', temporadaCorrigida({ partidas: 30, colocacao: 10 }));
relatorio('(a)+(b) com equipa correlacionada à habilidade', temporadaCorrigida({ partidas: 30, colocacao: 10, correlacao: 1 }));
relatorio('(a)+(b) só 10 lutas por cabeça', temporadaCorrigida({ partidas: 10, colocacao: 10 }));

/* ── E SE A TABELA FOSSE POR FAIXA DE NÍVEL? (a ideia dos dois lobbies) ──
   No cenário em que quem joga melhor também tem equipa melhor, a tabela
   ÚNICA mistura bolhas que nunca se enfrentam. Aqui mede-se a ordem
   DENTRO de cada faixa. */
console.log('\n═══ TABELAS SEPARADAS POR FAIXA DE PODER ═══');
{
  const r = temporadaCorrigida({ partidas: 30, colocacao: 10, correlacao: 1 });
  const g = r.gente.filter(x => x.rank);
  const faixas = [[0, 45], [45, 60], [60, 75], [75, 999]];
  console.log('  (tabela única, para comparar): ' + spearman(g).toFixed(3));
  for (const [lo, hi] of faixas) {
    const dentro = g.filter(x => x.poder >= lo && x.poder < hi);
    if (dentro.length < 15) continue;
    console.log('  poder ' + lo + '–' + (hi === 999 ? '+' : hi) + ': ' + dentro.length +
                ' jogadores · ordem certa ' + spearman(dentro).toFixed(3));
  }
}
