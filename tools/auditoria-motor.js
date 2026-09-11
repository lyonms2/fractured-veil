#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   AUDITORIA DO MOTOR — Fabula Ultima

   O que ela guarda, por ordem de gravidade:

     1. A REPETIBILIDADE. A mesma batalha com as mesmas escolhas dá
        exactamente os mesmos dados. É o mais importante: sem isto, uma
        luta não se pode conferir, e no dia do PvP não há como o
        servidor verificar uma vitória que o cliente afirma.
     2. As regras da rolagem: crítico é IGUAL e não alto, o pifão falha
        sempre, o crítico acerta sempre.
     3. As afinidades, nas quatro formas, com a guarda pelo meio.
     4. A cobertura: o da frente cobre, e a magia passa por cima.
     5. Os turnos: um por lutador vivo, lados a alternar, ninguém joga
        duas vezes na mesma ronda.
     6. Que nada rebenta — nem com PM a zero, nem com alvos mortos, nem
        com pedidos impossíveis.

   node tools/auditoria-motor.js
   ═══════════════════════════════════════════════════════════════════ */

const GEN = require('../api/_genetica.js');
const F   = require('../js/ficha-fu.js');
const M   = require('../js/combate-fu.js');

// o motor chama fuFicha e fuDescerDado por nome global, como no navegador
Object.assign(global, F);

let ok = 0, mau = 0;
const falhas = [];
function verificar(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe ? '\n      ' + detalhe : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

function avatar(seed, nivel, nome) {
  const cert = GEN.certidaoDeInvocacao({ uid: 'aud', nome: 'T' });
  cert.seed = seed; cert.nascimento.seed = seed;
  cert.nascimento.dna = GEN.nascimento.gerarDna('Comum', seed);
  return { id: nome, nome, seed, nivel: nivel || 5, nascimento: cert.nascimento };
}
const equipa = (p, nv) => [1, 2, 3].map(i => avatar(p * 7919 + i * 104729, nv, p + '' + i));

/* ═══ 1 · A REPETIBILIDADE ═══════════════════════════════════════ */
titulo('A mesma batalha dá sempre os mesmos dados');
{
  function lutar(semente) {
    const e = M.fuIniciar(equipa(1, 10), equipa(2, 10), semente);
    const log = [JSON.stringify(e.iniciativa)];
    let guarda = 0;
    while (!e.acabou && guarda++ < 400) {
      const vez = M.fuVez(e);
      if (!vez) { M.fuNovaRonda(e); continue; }
      // escolha fixa: age sempre o primeiro que pode, e ataca
      log.push(JSON.stringify(M.fuAgir(e, { quem: vez.podem[0], tipo: 'atacar' })));
    }
    return log.join('|');
  }
  for (const sem of [1, 7, 42, 1337, 999983]) {
    verificar('semente ' + sem + ' repete-se', lutar(sem) === lutar(sem));
  }
  verificar('sementes diferentes dão batalhas diferentes', lutar(1) !== lutar(2));
}

/* ═══ 2 · A ROLAGEM ══════════════════════════════════════════════ */
titulo('A rolagem');
{
  const rng = { semente: 12345, passo: 0 };
  let criticos = 0, pifoes = 0, n = 40000;
  for (let i = 0; i < n; i++) {
    const r = M.fuRolagem(rng, 6, 6, 0);
    verificar('os dois dados estão entre 1 e 6',
      r.dados.every(d => d >= 1 && d <= 6), JSON.stringify(r.dados));
    verificar('o HR é o maior dos dois', r.hr === Math.max(r.dados[0], r.dados[1]));
    verificar('o resultado é a soma mais o modificador',
      r.resultado === r.dados[0] + r.dados[1]);
    verificar('crítico é IGUAL e ≥6, não é alto',
      r.critico === (r.dados[0] === r.dados[1] && r.dados[0] >= 6));
    verificar('pifão é duplo 1', r.pifao === (r.dados[0] === 1 && r.dados[1] === 1));
    if (r.critico) criticos++;
    if (r.pifao) pifoes++;
    if (i > 400) { ok -= 5; i = n; }   // as cinco acima chegam 400 vezes
  }
  // num d6+d6 só o duplo 6 é crítico: 1 em 36
  const esperado = n / 36;
  const rng2 = { semente: 777, passo: 0 };
  criticos = 0; pifoes = 0;
  for (let i = 0; i < n; i++) {
    const r = M.fuRolagem(rng2, 6, 6, 0);
    if (r.critico) criticos++;
    if (r.pifao) pifoes++;
  }
  verificar('num d6+d6 o crítico sai perto de 1 em 36',
    Math.abs(criticos - esperado) < esperado * 0.35, criticos + ' de ' + n + ', esperava ~' + Math.round(esperado));
  verificar('e o pifão também',
    Math.abs(pifoes - esperado) < esperado * 0.35, pifoes + ' de ' + n);

  // num d12+d12 são sete os pares que criticam: 7 em 144
  const rng3 = { semente: 31337, passo: 0 };
  let c12 = 0;
  for (let i = 0; i < n; i++) if (M.fuRolagem(rng3, 12, 12, 0).critico) c12++;
  const esp12 = n * 7 / 144;
  verificar('num d12+d12 o crítico sai perto de 7 em 144',
    Math.abs(c12 - esp12) < esp12 * 0.2, c12 + ' de ' + n + ', esperava ~' + Math.round(esp12));
}

/* ═══ 3 · O ACERTO ═══════════════════════════════════════════════ */
titulo('Acertar e falhar');
{
  /* O crítico acerta contra qualquer Defesa e o pifão falha contra
     qualquer uma — é o que os torna diferentes de "muito alto" e "muito
     baixo". Procura-se um de cada num alvo impossível e num alvo
     trivial. */
  let viCritico = false, viPifao = false;
  for (let s = 1; s <= 4000 && !(viCritico && viPifao); s++) {
    const e = M.fuIniciar(equipa(1, 5), equipa(2, 5), s);
    const quem = e.A[0], alvo = e.B[0];
    alvo.ficha.DES = 12;                       // Defesa alta
    const ev = M.fuAtacar(e, quem, alvo, { fixo: 5 });
    if (ev.critico) {
      viCritico = true;
      verificar('o crítico acerta mesmo contra Defesa maior que o resultado',
        ev.acertou, `resultado ${ev.resultado} contra DL ${ev.dl}`);
    }
    if (ev.pifao) {
      viPifao = true;
      verificar('o pifão falha', !ev.acertou);
    }
  }
  verificar('apareceu pelo menos um crítico em 4000 tentativas', viCritico);
  verificar('apareceu pelo menos um pifão', viPifao);
}

/* ═══ 4 · AS AFINIDADES ══════════════════════════════════════════ */
titulo('As quatro afinidades, e a guarda');
{
  const fabricar = af => ({
    vivo: true, pv: 100, guardando: false, estados: {},
    ficha: { pvMax: 100, crise: 50, afinidades: { fogo: af } },
  });
  const casos = [[null, 60, 40], ['RS', 30, 70], ['VU', 100, 0], ['IM', 0, 100]];
  for (const [af, perda, pvFinal] of casos) {
    const c = fabricar(af);
    const r = M.fuAplicarDano(c, 60, 'fogo');
    verificar('afinidade ' + (af || 'nenhuma') + ' tira ' + perda,
      r.perda === perda && c.pv === pvFinal, `tirou ${r.perda}, ficou ${c.pv}`);
  }
  {
    const c = fabricar('AB'); c.pv = 40;
    const r = M.fuAplicarDano(c, 60, 'fogo');
    verificar('quem absorve CURA em vez de perder', r.curou === 60 && c.pv === 100);
    verificar('e não passa do máximo', c.pv <= c.ficha.pvMax);
  }
  {
    const c = fabricar(null); c.guardando = true;
    const r = M.fuDanoComGuarda(c, 60, 'fogo');
    verificar('guardar corta o dano a metade', r.perda === 30);
  }
  {
    const c = fabricar('AB'); c.pv = 40; c.guardando = true;
    const r = M.fuDanoComGuarda(c, 60, 'fogo');
    verificar('guardar não estraga a absorção — ela ganha a tudo', r.curou === 60);
  }
  {
    const c = fabricar(null); c.pv = 10;
    const r = M.fuAplicarDano(c, 999, 'fogo');
    verificar('a vida não passa de zero', c.pv === 0);
    verificar('e quem chega a zero cai', r.caiu === true && c.vivo === false);
  }
}

/* ═══ 5 · OS ESTADOS ═════════════════════════════════════════════ */
titulo('Os seis estados');
{
  const e = M.fuIniciar(equipa(1, 5), equipa(2, 5), 99);
  const c = e.A[0];
  c.ficha.DES = 10; c.ficha.PER = 10; c.ficha.VIG = 10; c.ficha.VON = 10;

  verificar('sem estados, o dado é o da ficha', M.fuDado(c, 'DES') === 10);
  M.fuDarEstado(c, 'lento');
  verificar('lento desce a Destreza', M.fuDado(c, 'DES') === 8);
  verificar('e não toca nos outros', M.fuDado(c, 'PER') === 10);
  verificar('a Defesa segue o dado ACTUAL, não o da ficha', M.fuDefesa(c) === 8);

  M.fuDarEstado(c, 'enfurecido');
  verificar('estados diferentes no mesmo atributo SOMAM-SE', M.fuDado(c, 'DES') === 6);

  verificar('dar o mesmo estado outra vez não faz nada',
    M.fuDarEstado(c, 'lento') === false);

  // o piso é d6, aconteça o que acontecer
  for (const est of M.FU_ESTADOS_LISTA) M.fuDarEstado(c, est);
  for (const a of ['DES', 'PER', 'VIG', 'VON']) {
    verificar('nenhum dado desce abaixo de d6 (' + a + ')', M.fuDado(c, a) >= 6,
      a + ' ficou ' + M.fuDado(c, a));
  }
  M.fuTirarEstado(c, 'lento'); M.fuTirarEstado(c, 'enfurecido');
  verificar('tirar os estados devolve o dado', M.fuDado(c, 'DES') === 10);

  // cada estado morde o que o manual diz
  const morde = { atordoado: ['PER'], enfurecido: ['DES','PER'], envenenado: ['VIG','VON'],
                  abalado: ['VON'], lento: ['DES'], fraco: ['VIG'] };
  for (const [est, quais] of Object.entries(morde)) {
    const x = e.A[1];
    x.estados = {}; x.ficha.DES = x.ficha.PER = x.ficha.VIG = x.ficha.VON = 10;
    M.fuDarEstado(x, est);
    for (const a of ['DES','PER','VIG','VON']) {
      const esperado = quais.indexOf(a) !== -1 ? 8 : 10;
      verificar(est + ' morde ' + quais.join('+') + ' (' + a + ')',
        M.fuDado(x, a) === esperado, a + ' ficou ' + M.fuDado(x, a));
    }
  }
}

/* ═══ 6 · A COBERTURA ════════════════════════════════════════════ */
titulo('O da frente cobre os outros');
{
  const e = M.fuIniciar(equipa(1, 5), equipa(2, 5), 5);
  let alvos = M.fuAlvosPossiveis(e.B, true);
  verificar('corpo-a-corpo só alcança um', alvos.length === 1);
  verificar('e é o do posto da frente', alvos[0].posto === 0);

  alvos = M.fuAlvosPossiveis(e.B, false);
  verificar('a magia alcança os três', alvos.length === 3);

  // o da frente cai: a cobertura passa ao seguinte
  e.B[0].vivo = false;
  alvos = M.fuAlvosPossiveis(e.B, true);
  verificar('caindo o da frente, cobre o seguinte', alvos.length === 1 && alvos[0].posto === 1);

  e.B[1].vivo = false; e.B[2].vivo = false;
  verificar('sem ninguém de pé não há alvos', M.fuAlvosPossiveis(e.B, true).length === 0);

  /* E um pedido para bater no de trás com o defensor de pé resolve-se
     batendo à frente, em vez de recusar — o defensor está a fazer o
     trabalho dele, não é um erro do jogador. */
  const e2 = M.fuIniciar(equipa(1, 5), equipa(2, 5), 6);
  const ev = M.fuAgir(e2, { quem: e2.A[0].id, tipo: 'atacar', alvos: [e2.B[2].id] });
  verificar('bater no de trás acerta no da frente',
    ev.length && ev[0].alvo === e2.B[0].id, JSON.stringify(ev[0] && ev[0].alvo));
}

/* ═══ 7 · OS TURNOS ══════════════════════════════════════════════ */
titulo('Um turno por lutador, os lados a alternar');
{
  const e = M.fuIniciar(equipa(1, 5), equipa(2, 5), 21);
  const ordem = [];
  let guarda = 0;
  while (guarda++ < 10) {
    const vez = M.fuVez(e);
    if (!vez) break;
    ordem.push(vez.lado);
    M.fuAgir(e, { quem: vez.podem[0], tipo: 'guardar' });
  }
  verificar('a ronda tem seis turnos', ordem.length === 6, ordem.join(''));
  verificar('começa quem ganhou a iniciativa', ordem[0] === e.comeca);
  verificar('os lados alternam', ordem.join('') === (e.comeca === 'A' ? 'ABABAB' : 'BABABA'),
    ordem.join(''));
  verificar('ninguém joga duas vezes', new Set(e.jaAgiu).size === e.jaAgiu.length);
  verificar('e jogaram os seis', e.jaAgiu.length === 6);

  // agir fora da vez não faz nada
  verificar('quem já jogou não volta a jogar',
    M.fuAgir(e, { quem: e.A[0].id, tipo: 'atacar' }).length === 0);

  M.fuNovaRonda(e);
  verificar('a ronda nova limpa quem jogou', e.jaAgiu.length === 0);
  verificar('e tira a guarda a todos',
    e.A.concat(e.B).every(c => !c.guardando));

  /* Com um lado desfalcado, o outro joga os turnos que sobram — é o que
     o manual manda quando um lado tem mais criaturas. */
  const e2 = M.fuIniciar(equipa(1, 5), equipa(2, 5), 22);
  e2.B[1].vivo = false; e2.B[2].vivo = false;
  const ordem2 = [];
  guarda = 0;
  while (guarda++ < 10) {
    const vez = M.fuVez(e2); if (!vez) break;
    ordem2.push(vez.lado);
    M.fuAgir(e2, { quem: vez.podem[0], tipo: 'guardar' });
  }
  verificar('três contra um: o lado cheio joga os turnos que sobram',
    ordem2.filter(x => x === 'A').length === 3 && ordem2.filter(x => x === 'B').length === 1,
    ordem2.join(''));
}

/* ═══ 8 · MOVER GASTA O TURNO ════════════════════════════════════ */
titulo('Trocar de posto');
{
  const e = M.fuIniciar(equipa(1, 5), equipa(2, 5), 31);
  const a = e.A[0], b = e.A[2];
  const pa = a.posto, pb = b.posto;
  const ev = M.fuAgir(e, { quem: a.id, tipo: 'mover', com: b.id });
  verificar('os postos trocam', a.posto === pb && b.posto === pa);
  verificar('e o evento di-lo', ev.length === 1 && ev[0].tipo === 'mover');
  verificar('mover GASTA o turno de quem se moveu',
    e.jaAgiu.indexOf(a.id) !== -1);
  verificar('mas não o de quem foi movido',
    e.jaAgiu.indexOf(b.id) === -1);
  verificar('e quem se moveu não pode agir outra vez',
    M.fuAgir(e, { quem: a.id, tipo: 'atacar' }).length === 0);
}

/* ═══ 9 · O QUE NÃO PODE REBENTAR ════════════════════════════════ */
titulo('O que chega torto');
{
  const e = M.fuIniciar(equipa(1, 5), equipa(2, 5), 41);
  verificar('agir com um id que não existe não rebenta',
    M.fuAgir(e, { quem: 'ninguem', tipo: 'atacar' }).length === 0);
  verificar('uma acção sem tipo cai no ataque e não rebenta',
    M.fuAgir(e, { quem: e.A[0].id }).length > 0);

  const e2 = M.fuIniciar(equipa(1, 5), equipa(2, 5), 42);
  e2.A[0].pm = 0;
  verificar('sem PM a magia não sai',
    M.fuAgir(e2, { quem: e2.A[0].id, tipo: 'magia',
                   magia: { id: 'x', pm: 10, fixo: 15 } }).length === 0);
  verificar('e o turno não se gasta', e2.jaAgiu.length === 0);

  const e3 = M.fuIniciar(equipa(1, 5), equipa(2, 5), 43);
  e3.B.forEach(c => { c.vivo = false; });
  verificar('sem inimigos de pé, atacar não rebenta',
    M.fuAgir(e3, { quem: e3.A[0].id, tipo: 'atacar' }).length === 0);

  const e4 = M.fuIniciar(equipa(1, 5), equipa(2, 5), 44);
  e4.A[0].vivo = false;
  verificar('um morto não joga',
    M.fuAgir(e4, { quem: e4.A[0].id, tipo: 'atacar' }).length === 0);
}

/* ═══ 10 · UMA BATALHA INTEIRA ═══════════════════════════════════ */
titulo('Cem batalhas do princípio ao fim');
{
  let acabaram = 0, rondas = [], semVencedor = 0;
  for (let s = 1; s <= 100; s++) {
    const e = M.fuIniciar(equipa(1, 10), equipa(2, 10), s * 7);
    let guarda = 0;
    while (!e.acabou && guarda++ < 600) {
      const vez = M.fuVez(e);
      if (!vez) { M.fuNovaRonda(e); continue; }
      M.fuAgir(e, { quem: vez.podem[0], tipo: 'atacar' });
    }
    if (e.acabou) acabaram++;
    if (e.acabou && !e.vencedor) semVencedor++;
    rondas.push(e.ronda);
    verificar('a batalha ' + s + ' acaba', e.acabou, 'parou na ronda ' + e.ronda);
    verificar('e o vencedor tem alguém de pé',
      !e.vencedor || e[e.vencedor].some(c => c.vivo));
    verificar('o perdedor não tem ninguém de pé',
      !e.vencedor || !e[e.vencedor === 'A' ? 'B' : 'A'].some(c => c.vivo));
    verificar('ninguém acaba com vida negativa',
      e.A.concat(e.B).every(c => c.pv >= 0 && c.pv <= c.ficha.pvMax));
    verificar('ninguém acaba com PM negativos',
      e.A.concat(e.B).every(c => c.pm >= 0 && c.pm <= c.ficha.pmMax));
  }
  const media = (rondas.reduce((a, b) => a + b, 0) / rondas.length).toFixed(1);
  console.log('   rondas até acabar: média ' + media +
              ' · mínimo ' + Math.min.apply(null, rondas) +
              ' · máximo ' + Math.max.apply(null, rondas));
  verificar('as cem acabaram', acabaram === 100, acabaram + ' de 100');
}

console.log('\n' + '─'.repeat(62));
if (falhas.length) {
  console.log(falhas.slice(0, 20).join('\n'));
  if (falhas.length > 20) console.log('  … e mais ' + (falhas.length - 20) + '.');
}
console.log(ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
