// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS REGRAS
//
// Os dois testes anteriores confirmam que cada efeito LIGA um estado.
// Este confirma que o estado CHEGA À CONTA — que o escudo sobe mesmo a
// Defesa, que a fúria impede mesmo a esquiva, que o tecto de Habilidade
// não é ultrapassado. É onde um efeito pode estar ligado e na mesma não
// fazer diferença nenhuma.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;
const soco = () => ({ magia: null, pm: 0 });
const media = a => a.reduce((x, y) => x + y, 0) / a.length;

// Distribuição de FA/FD de um golpe comum, em N seeds
function golpes(cfg, n) {
  const fa = [], fd = [], esq = [];
  for (let s = 1; s <= (n || 400); s++) {
    const { evA } = A.lancar({ ...cfg, seed: s, politica: cfg.politica || soco }, 1);
    const e = evA[0]; if (!e) continue;
    if (e.fa != null) fa.push(e.fa);
    if (e.fd != null) fd.push(e.fd);
    esq.push(!!e.esquivou);
  }
  return { fa, fd, esq: esq.filter(Boolean).length, n: esq.length };
}

console.log('\n═══ AS CONTAS DO MANUAL ═══\n');

// ── FA = H + F + 1d ──
{
  const g = golpes({ a: { carac: { F: 3, H: 4, R: 8, A: 0 } }, b: { carac: { F: 0, H: 0, R: 40, A: 0 } } });
  // com crítico a Força dobra: FA vai de 7+1 a (4+6)+6 = 16
  const semCrit = g.fa.filter(v => v <= 12);
  A.ver('FA = H + F + 1d', Math.min(...g.fa) === 8 && semCrit.length > 0,
        `H4+F3+1d → ${Math.min(...g.fa)}–${Math.max(...g.fa)} (o topo passa de 13 por causa do crítico)`);
}

// ── FD = H + A + 1d ──
{
  const g = golpes({ a: { carac: { F: 3, H: 4, R: 8, A: 0 } }, b: { carac: { F: 0, H: 2, R: 40, A: 3 } } });
  A.ver('FD = H + A + 1d', Math.min(...g.fd) === 6,
        `H2+A3+1d → ${Math.min(...g.fd)}–${Math.max(...g.fd)} (o topo passa de 11 porque o crítico dobra a Armadura)`);
}

// ── o crítico dobra a Força, nunca a Habilidade ──
{
  // H alto e F zero: se o crítico dobrasse a H, o topo passaria de H+0+6
  const g = golpes({ a: { carac: { F: 0, H: 5, R: 8, A: 0 } }, b: { carac: { F: 0, H: 0, R: 400, A: 0 } }, }, 600);
  A.ver('o crítico dobra a Força, não a Habilidade', Math.max(...g.fa) === 11,
        `H5+F0+1d → máximo ${Math.max(...g.fa)} (tem de ser 5+6=11; se dobrasse a H daria 16)`);
}

// ── o crítico dobra a Armadura ──
{
  const g = golpes({ a: { carac: { F: 3, H: 4, R: 8, A: 0 } }, b: { carac: { F: 0, H: 0, R: 400, A: 4 } } }, 600);
  A.ver('o crítico dobra a Armadura', Math.max(...g.fd) === 14,
        `H0+A4+1d → máximo ${Math.max(...g.fd)} (tem de ser 4×2+6=14)`);
}

// ── dano = FA − FD, nunca negativo ──
{
  const evs = [];
  for (let s = 1; s <= 500; s++) {
    const { evA } = A.lancar({ seed: s, politica: soco,
      a: { carac: { F: 2, H: 2, R: 8, A: 0 } }, b: { carac: { F: 0, H: 3, R: 400, A: 3 } } }, 1);
    if (evA[0] && evA[0].fa != null && !evA[0].esquivou) evs.push(evA[0]);
  }
  const certos = evs.filter(e => e.danoBruto === Math.max(0, e.fa - e.fd)).length;
  const zeros  = evs.filter(e => e.danoBruto === 0).length;
  A.ver('dano = FA − FD, e zero quando a FD ganha',
        certos === evs.length && zeros > 0,
        `${certos}/${evs.length} conferem · ${zeros} deram zero`);
}

// ── teste de característica: 6 falha sempre ──
{
  // R muito alto: só um 6 pode fazer falhar
  let falhas = 0;
  for (let s = 1; s <= 600; s++) if (!M._c3teste(20, M._c3rng(s))) falhas++;
  const esperado = 600 / 6;
  A.ver('um 6 falha sempre, por mais alta que seja a característica',
        Math.abs(falhas - esperado) < 30, `com valor 20 falhou ${falhas}/600 (esperado ~${esperado})`);
}

console.log('\n═══ OS ESTADOS CHEGAM ÀS CONTAS? ═══\n');

// ── bonusA (escudo de magia) tem de subir a FD ──
{
  const comEscudo = A.duelo({ b: { carac: { F: 0, H: 0, R: 40, A: 0 } } });
  const semA = golpes({ a: { carac: { F: 3, H: 4, R: 8, A: 0 } }, b: { carac: { F: 0, H: 0, R: 40, A: 0 } } });
  const comA = golpes({ a: { carac: { F: 3, H: 4, R: 8, A: 0 } },
                        b: { carac: { F: 0, H: 0, R: 40, A: 3 } } });
  A.ver('a Armadura sobe a Defesa ponto a ponto',
        Math.abs(media(comA.fd) - media(semA.fd) - 3) < 0.6,
        `FD média: A0 ${media(semA.fd).toFixed(2)} · A3 ${media(comA.fd).toFixed(2)} (esperado +3, mais o crítico)`);
}

// ── um escudo sustentado tem mesmo de reduzir o dano recebido ──
{
  const escudo = { id: 'te_d2', pm: 2, porTurno: true, armadura: 2 };
  const danoCom = [], danoSem = [];
  for (let s = 1; s <= 400; s++) {
    for (const usa of [true, false]) {
      const e = A.duelo({ seed: s, a: { carac: { F: 5, H: 3, R: 8, A: 0 }, iniciativa: 1 },
        b: { carac: { F: 0, H: 1, R: 40, A: 1 }, pm: 60, iniciativa: 20,
             magias: { defesa: escudo, ataque: null, forte: null } },
        politica: eu => eu.nome === 'B' && usa ? { magia: escudo, pm: 2 } : soco() });
      M.combate3dtTurno(e);
      const golpe = e.eventos.find(x => x.lado === 'A' && x.dano != null);
      if (golpe) (usa ? danoCom : danoSem).push(golpe.dano);
    }
  }
  A.ver('um escudo sustentado reduz mesmo o dano que se leva',
        media(danoCom) < media(danoSem),
        `dano médio recebido: com escudo ${media(danoCom).toFixed(2)} · sem ${media(danoSem).toFixed(2)}`);
}

// ── a fúria: bate mais e não esquiva ──
{
  const normal = golpes({ a: { carac: { F: 2, H: 2, R: 8, A: 0 } }, b: { carac: { F: 0, H: 5, R: 400, A: 0 } } }, 500);
  const furia = [];
  let esquivouEmFuria = 0;
  for (let s = 1; s <= 500; s++) {
    const e = A.duelo({ seed: s, a: { carac: { F: 2, H: 2, R: 8, A: 0 } },
                        b: { carac: { F: 0, H: 5, R: 400, A: 0 } }, politica: soco });
    e.B[0].furia = true; e.B[0].bonusF = 1; e.B[0].bonusH = 1;
    M.combate3dtTurno(e);
    const g = e.eventos.find(x => x.lado === 'A');
    if (g && g.esquivou) esquivouEmFuria++;
    if (g && g.fd != null) furia.push(g.fd);
  }
  A.ver('quem está em fúria não esquiva', esquivouEmFuria === 0,
        `esquivou ${esquivouEmFuria}/500 em fúria · sem fúria esquivou ${normal.esq}/${normal.n}`);
  A.ver('a fúria sobe a Habilidade e portanto a Defesa',
        media(furia) > media(normal.fd),
        `FD média: em fúria ${media(furia).toFixed(2)} · normal ${media(normal.fd).toFixed(2)}`);
}

// ── as sustentadas caem quando o PM acaba, e levam os bónus ──
{
  const escudo = { id: 'te_d2', pm: 5, porTurno: true, armadura: 2 };
  const e = A.duelo({ a: { carac: { F: 1, H: 5, R: 8, A: 1 }, pm: 11 },   // lança (5) + sustenta um turno (5) + 1
                      b: { carac: { F: 0, H: 0, R: 400, A: 0 } },
                      politica: eu => eu.nome === 'A' && eu.pm >= 5 ? { magia: escudo, pm: 5 } : soco() });
  M.combate3dtTurno(e);
  const depoisDeLancar = { bonusA: e.A[0].bonusA, pm: e.A[0].pm, sust: e.A[0].sustentadas.length };
  M.combate3dtTurno(e);   // já não há PM para a sustentar
  A.ver('sem PM, a magia sustentada cai e leva o bónus com ela',
        depoisDeLancar.bonusA === 2 && e.A[0].bonusA === 0 && e.A[0].sustentadas.length === 0,
        `depois de lançar: A+${depoisDeLancar.bonusA}, PM ${depoisDeLancar.pm} · turno seguinte: A+${e.A[0].bonusA}`);
}

// ── a barreira come o dano e depois quebra ──
{
  const e = A.duelo({ a: { carac: { F: 8, H: 4, R: 8, A: 0 }, iniciativa: 1 },
                      b: { carac: { F: 0, H: 0, R: 40, A: 0 }, iniciativa: 20 }, politica: soco });
  e.B[0].barreira = 6;
  const pvInicial = e.B[0].pv;
  let comeu = 0, quebrou = false, turnos = 0;
  while (!quebrou && turnos++ < 30) {
    M.combate3dtTurno(e);
    const g = e.eventos.filter(x => x.lado === 'A').pop();
    if (g && g.barreiraComeu) comeu += g.barreiraComeu;
    if (g && g.barreiraCaiu) quebrou = true;
  }
  A.ver('a barreira absorve até 6 e depois quebra',
        quebrou && comeu === 6 && e.B[0].barreira === 0,
        `absorveu ${comeu} de 6 · quebrou: ${quebrou}`);
}

// ── o corpo elemental não deixa passar dano nenhum ──
{
  let passou = 0, absorveu = 0;
  for (let s = 1; s <= 200; s++) {
    const e = A.duelo({ seed: s, a: { carac: { F: 9, H: 5, R: 8, A: 0 }, iniciativa: 1 },
                        b: { carac: { F: 0, H: 0, R: 40, A: 0 }, iniciativa: 20 }, politica: soco });
    e.B[0].invulneravel = true;
    M.combate3dtTurno(e);
    const g = e.eventos.filter(x => x.lado === 'A').pop();
    if (g && g.dano > 0) passou++;
    if (g && g.absorveuTudo) absorveu++;
  }
  A.ver('o corpo elemental não deixa passar dano nenhum',
        passou === 0 && absorveu > 0, `passou ${passou}/200 · absorveu ${absorveu}`);
}

console.log('\n═══ O TECTO DE HABILIDADE (H×5) ═══\n');

// A regra que o manual impõe: nenhuma magia com custo acima de H×5.
{
  let acima = 0, casos = 0;
  for (let s = 1; s <= 300; s++) {
    for (const H of [1, 2, 3, 5, 8]) {
      const eu = A.duelo({ a: { carac: { F: 2, H, R: 8, A: 1 }, pm: 200 } }).A[0];
      const tecto = M._c3(eu, 'H') * 5;
      for (const el of Object.keys(M.MAGIAS))
        for (const cat of ['ataque', 'forte', 'defesa'])
          for (const g of M.MAGIAS[el][cat] || []) {
            const pm = M._c3pmIdeal(g, eu, tecto);
            if (g.pm <= tecto) { casos++; if (pm > tecto) acima++; }
          }
    }
  }
  A.ver('_c3pmIdeal nunca passa o tecto H×5', acima === 0, `${acima} de ${casos} casos passaram o tecto`);

  // E a política, em jogo, também não
  let violou = 0;
  for (let s = 1; s <= 400; s++) {
    const slot = n => ({ nome: 'av' + n, elemento: ['Fogo','Água','Terra','Vento','Sombra'][n % 5],
                         raridade: ['Comum','Raro','Lendário'][n % 3], nivel: 1 + (n % 30), seed: n * 7 + s });
    const e = M.combate3dtIniciar([slot(1), slot(2), slot(3)], [slot(4), slot(5), slot(6)], s, { historico: true });
    while (!e.acabou) M.combate3dtTurno(e);
    for (const ev of e.eventos) {
      if (!ev.magia || !ev.pm) continue;
      const eq = ev.lado === 'A' ? e.A : e.B;
      const c = eq.find(x => x.nome === ev.quem);
      // o tecto usa a Habilidade EFECTIVA, que o veneno pode ter baixado
      if (c && ev.pm > Math.max(c.ficha.H, M._c3(c, 'H')) * 5) violou++;
    }
  }
  A.ver('em jogo, nenhuma magia é lançada acima do tecto', violou === 0, `${violou} violações em 400 batalhas`);
}

const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
