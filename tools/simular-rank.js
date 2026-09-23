#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O RANK É JUSTO? — uma temporada simulada, com o código de verdade

     node tools/simular-rank.js

   NÃO simula combate: combate é humano contra humano e não se simula.
   Simula o SISTEMA DE PONTOS. Cada jogador tem uma habilidade real
   escondida e uma equipa de certo nível; o resultado de cada luta sai
   das duas coisas; os pontos saem do js/pvp-rank.js, tal como está no
   jogo. No fim pergunta-se: a tabela ficou na ordem da habilidade?

   ── AS MEDIDAS ──

   ORDEM CERTA é o Spearman entre a tabela e a habilidade real: 1 é
   perfeito, 0 é sorteio. MEDE NÍVEL é o mesmo cálculo contra o nível
   das equipas — quanto MAIOR, mais a tabela é um ranking de quem tem os
   bichos mais fortes, que é justamente o que não se quer.

   ── O QUE JÁ SE APRENDEU AQUI ──

   · ALARGAR a janela de poder da fila parecia bom e é mau: a 40% a
     ordem cai para 0,70 e a tabela passa a medir nível (0,46). Foi a
     primeira ideia, e esta ferramenta derrubou-a;
   · parear por PONTOS dentro da janela estreita, lutas de colocação e
     divisões, juntos, levam a ordem de 0,82 para 0,88;
   · quando quem joga melhor também tem a melhor equipa — o caso
     provável — nenhuma tabela ÚNICA funciona: 0,42 antes, 0,55 depois.
     Dentro de cada divisão as mesmas lutas dão 0,71 a 0,83, e é por
     isso que a página mostra divisões e não uma lista só;
   · o teto por par tinha sido pensado por CONTAGEM (três lutas por
     dia). Medido com quarenta pessoas na fila, travava 60% das lutas
     legítimas — toda a gente reencontra toda a gente. Por saldo, trava
     zero e continua a cortar o conluio de +240 para +40.
   ═══════════════════════════════════════════════════════════════════ */

const R  = require('../js/pvp-regras.js');
const RK = require('../js/pvp-rank.js');

// ── um gerador repetível: a mesma temporada em todas as corridas ──
let _s = 987654321;
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; };
const normal = (m, d) => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd();
  return m + d * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const AGORA = Date.parse('2026-09-23T12:00:00Z');

/* Quanto o NÍVEL pesa na luta, em pontos de Elo por nível. Neste motor
   o nível dá vida, magia e tamanho de dado: dez níveis acima é quase
   vitória certa, e 25 por nível é a ordem de grandeza disso. */
const PESO_NIVEL = 25;

function mundo(correlacao) {
  const g = [];
  for (let i = 0; i < 240; i++) {
    const hab = normal(1000, 200);
    const nivel = Math.max(3, Math.min(60, Math.round(correlacao * (hab - 1000) / 12 + normal(28, 12))));
    g.push({ id: 'p' + i, hab, nivel, poder: nivel * 3, rank: null, lutas: 0, pares: {} });
  }
  return g;
}
const forca = j => j.hab + j.nivel * PESO_NIVEL;
const pVit  = (a, b) => 1 / (1 + Math.pow(10, (forca(b) - forca(a)) / 400));

function correr(gente, o) {
  const dia = '2026-09-23';
  let semPar = 0;
  for (let r = 0; r < o.partidas; r++) {
    const fila = gente.slice().sort(() => rnd() - 0.5);
    const usados = new Set();
    for (const eu of fila) {
      if (usados.has(eu.id)) continue;
      const cand = fila.filter(x => !usados.has(x.id) && x.id !== eu.id
        && Math.abs(x.poder - eu.poder) <= o.janela * Math.max(x.poder, eu.poder));
      if (!cand.length) { semPar++; continue; }
      const pts = x => RK.pvpRankAtual(o.divisoes ? (x.rank || {})[RK.pvpDivisao(x.poder, 3)] : x.rank, AGORA).pontos;
      const ele = o.porPontos
        ? cand.reduce((m, x) => (!m || Math.abs(pts(x) - pts(eu)) < Math.abs(pts(m) - pts(eu))) ? x : m, null)
        : cand.reduce((m, x) => (!m || Math.abs(x.poder - eu.poder) < Math.abs(m.poder - eu.poder)) ? x : m, null);
      usados.add(eu.id); usados.add(ele.id);

      const ganhou = rnd() < pVit(eu, ele);
      const a1 = pts(eu), a2 = pts(ele);
      const guarda = (jog, outro, venceu, contra) => {
        const div = RK.pvpDivisao(jog.poder, 3);
        const antes = o.divisoes ? (jog.rank || {})[div] : jog.rank;
        /* Sem colocação, finge-se que já jogou muito: é assim que o K
           fica no valor normal desde a primeira luta. */
        const base = o.colocacao ? antes
          : Object.assign({ v: 99, d: 0, e: 0 },
                          antes || { pontos: RK.PVP_RANK_INICIO, temporada: RK.pvpTemporada(AGORA) });
        const p0 = RK.pvpRankAtual(base, AGORA).pontos;
        const novo = RK.pvpRankSomar(base, contra, venceu ? 'vitoria' : 'derrota', AGORA,
                                     o.teto ? jog.pares[outro.id] : undefined, o.teto ? dia : null);
        if (o.divisoes) { jog.rank = jog.rank || {}; jog.rank[div] = novo; } else jog.rank = novo;
        if (o.teto) jog.pares[outro.id] = RK.pvpParSomar(jog.pares[outro.id], dia, novo.pontos - p0);
        jog.lutas++;
      };
      guarda(eu, ele, ganhou, a2);
      guarda(ele, eu, !ganhou, a1);
    }
  }
  return semPar;
}

function spearman(g, campo, pontos) {
  const a = g.slice().sort((x, y) => campo(y) - campo(x)).map(x => x.id);
  const b = g.slice().sort((x, y) => pontos(y) - pontos(x)).map(x => x.id);
  const pa = {}, pb = {};
  a.forEach((id, i) => pa[id] = i); b.forEach((id, i) => pb[id] = i);
  let s = 0; const n = g.length;
  for (const x of g) { const d = pa[x.id] - pb[x.id]; s += d * d; }
  return 1 - (6 * s) / (n * (n * n - 1));
}

function medir(nome, correlacao, o) {
  const g = mundo(correlacao);
  const semPar = correr(g, Object.assign({ partidas: 30, janela: 0.10 }, o));
  const com = g.filter(x => x.rank);
  const pts = x => { const r = o.divisoes ? (x.rank || {})[RK.pvpDivisao(x.poder, 3)] : x.rank;
                     return r ? r.pontos : RK.PVP_RANK_INICIO; };
  const partes = ['ordem certa ' + spearman(com, x => x.hab, pts).toFixed(2),
                  'mede nível ' + spearman(com, x => x.nivel, pts).toFixed(2)];
  if (o.divisoes) {
    const dentro = RK.PVP_DIVISOES.map(d => {
      const da = com.filter(x => RK.pvpDivisao(x.poder, 3) === d.id);
      return da.length >= 20 ? d.id + ' ' + spearman(da, x => x.hab, pts).toFixed(2) : null;
    }).filter(Boolean);
    partes.push('por divisão: ' + dentro.join(' · '));
  }
  console.log('  ' + nome.padEnd(30) + partes.join(' · ') + (semPar ? '   (sem par ' + semPar + 'x)' : ''));
}

const ANTES = { porPontos: false, colocacao: false, divisoes: false, teto: false };
const AGORA_ = { porPontos: true,  colocacao: true,  divisoes: true,  teto: true  };

console.log('\n═══ O RANK, MEDIDO ═══');
console.log('240 jogadores · 30 lutas cada · o nível pesa ' + PESO_NIVEL + ' de Elo por degrau\n');

console.log('· Quem joga melhor NÃO tem necessariamente a melhor equipa:');
medir('antes desta mudança', 0, ANTES);
medir('como está agora', 0, AGORA_);

console.log('\n· Quem joga melhor TAMBÉM tem a melhor equipa (o caso provável):');
medir('antes desta mudança', 1, ANTES);
medir('como está agora', 1, AGORA_);

console.log('\n· Uma peça de cada vez, no caso provável:');
medir('só par por pontos', 1, Object.assign({}, ANTES, { porPontos: true }));
medir('+ colocação', 1, Object.assign({}, ANTES, { porPontos: true, colocacao: true }));
medir('+ divisões', 1, Object.assign({}, ANTES, { porPontos: true, colocacao: true, divisoes: true }));

console.log('\n· O conluio, com o teto de saldo (' + RK.PVP_RANK_PAR_SALDO + ' por par por dia):');
{
  const dia = '2026-09-23';
  const corrida = (alterna) => {
    let g = { pontos: 1000, temporada: RK.pvpTemporada(AGORA), v: 12, d: 12, e: 0, melhor: 1000 };
    let par = null, cortadas = 0;
    for (let i = 0; i < 20; i++) {
      const res = alterna ? (i % 2 ? 'vitoria' : 'derrota') : 'vitoria';
      const p0 = g.pontos;
      const bruto = RK.pvpRankDelta(p0, 1000, res, RK.PVP_RANK_K);
      g = RK.pvpRankSomar(g, 1000, res, AGORA, par, dia);
      const real = g.pontos - p0;
      if (bruto > 0 && real < bruto) cortadas++;
      par = RK.pvpParSomar(par, dia, real);
    }
    return { pontos: g.pontos, cortadas };
  };
  const entregues = corrida(false), aserio = corrida(true);
  console.log('  20 vitórias ENTREGUES pelo mesmo par: 1000 → ' + entregues.pontos +
              ' (sem teto seriam ' + (1000 + 20 * 12) + ')');
  console.log('  20 lutas a sério com o mesmo amigo:   1000 → ' + aserio.pontos +
              ' · cortadas: ' + aserio.cortadas);
}
console.log('');
