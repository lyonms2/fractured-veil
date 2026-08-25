// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS DURAÇÕES
//
// As outras auditorias perguntam "o efeito acontece?". Esta pergunta a
// seguinte: "e acaba quando devia?".
//
// Nasceu de cinco erros que tinham todos a mesma raiz. Os bónus vivem
// em campos planos — bonusF, bonusA, furia — e largar magias zerava-os
// TODOS, sem olhar de onde tinham vindo. Assim:
//
//   · desligar o Punho de Pedra levava também o Manto que se estava a
//     pagar de bom grado;
//   · faltar PM a um escudo derrubava a Fúria Sombria, que se pagara
//     uma vez e não custava nada por turno;
//   · a Reserva Oculta — 2 PM por ponto, até 5 — evaporava, e a conta
//     ficava gasta, portanto não se podia comprar outra vez;
//   · a Corrente de Ar, que nem sustentada é, ia atrás;
//   · e a fúria do Sangue Quente, que o texto promete durar "até alguém
//     cair", não acabava nunca: sem esquiva e sem magia o resto da luta.
//
// Agora há campos permanentes à parte e um recálculo que soma tudo do
// zero. Estas provas são o que impede o zerar-tudo de voltar.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const arena = () => M.combate3dtIniciar(
  [{ nome: 'EU', elemento: 'Terra', raridade: 'Lendário', nivel: 25, seed: 11 }],
  [{ nome: 'I1', elemento: 'Fogo', raridade: 'Comum', nivel: 1, seed: 5 },
   { nome: 'I2', elemento: 'Fogo', raridade: 'Comum', nivel: 1, seed: 6 }],
  3, { historico: true });

const manto = M.MAGIAS['Terra'].defesa.find(g => g.id === 'te_d1');  // 1-5 PM/turno
const punho = M.MAGIAS['Terra'].ataque.find(g => g.id === 'te_a1');  // 5 PM/turno
const furia = M.MAGIAS['Sombra'].ataque.find(g => g.id === 'so_a2'); // 2 PM, uma vez

console.log('\n═══ AS DURAÇÕES ═══\n');

// ── Largar é escolher, não é limpar a mesa ──
{
  const c = arena().A[0];
  c.sustentadas.push({ magia: manto, pm: 3 }, { magia: punho, pm: 5 });
  M._c3recalcular(c);
  const aA = c.bonusA;
  const n = M._c3largarSustentadas(c, s => s.magia.id === 'te_a1');
  A.ver('largar o Punho deixa o Manto de pé',
        n === 1 && c.sustentadas.length === 1 && c.bonusA === aA && c.bonusF === 0,
        `largou ${n} · A+${c.bonusA} (era ${aA}) · F+${c.bonusF} · de pé ${c.sustentadas.length}`);
}

// ── Sem PM caem as que COBRAM, e só essas ──
{
  const e = arena(), c = e.A[0];
  c.sustentadas.push({ magia: furia, pm: 2 }, { magia: manto, pm: 3 });
  M._c3recalcular(c);
  c.pm = 1;                                    // não chega para o Manto
  M.combate3dtTurno(e);
  A.ver('faltar PM ao escudo não desfaz a Fúria já paga',
        c.furia === true && c.bonusF >= 1 && !c.sustentadas.some(s => s.magia.id === 'te_d1'),
        `fúria=${c.furia} F+${c.bonusF} H+${c.bonusH} · de pé: ${c.sustentadas.map(s => s.magia.id).join(',') || 'nenhuma'}`);
}

// ── O que se pagou fica pago ──
{
  const c = arena().A[0];
  c.perm.F = 3; c.bonusF = 3; c.reservaGasta = 3;   // 6 PM já gastos
  c.sustentadas.push({ magia: manto, pm: 3 });
  M._c3recalcular(c);
  M._c3largarSustentadas(c);
  A.ver('a Reserva Oculta já paga sobrevive a largar tudo',
        c.bonusF === 3 && c.bonusA === 0, `F+${c.bonusF} (esperado 3) · A+${c.bonusA} (esperado 0)`);
}
{
  const c = arena().A[0];
  c.bonusEsquiva = 4;                                // Corrente de Ar, 4 PM
  c.sustentadas.push({ magia: manto, pm: 3 });
  M._c3recalcular(c);
  M._c3largarSustentadas(c);
  A.ver('a Corrente de Ar não é sustentada, e não vai atrás',
        c.bonusEsquiva === 4, `esquiva +${c.bonusEsquiva} (esperado 4)`);
}

// ── "até alguém cair" ──
{
  const e = arena(), c = e.A[0];
  c.desv = { id: 'sangue_quente', furiaAoSofrerDano: true };
  c.furia = true; c.furiaDesv = true; c.perm.F += 1; c.perm.H += 1;
  M._c3recalcular(c);
  const fAntes = M._c3(c, 'F');
  e.B[0].pv = 0; e.B[0].vivo = false;
  M.combate3dtTurno(e);
  A.ver('a fúria do Sangue Quente passa quando alguém cai',
        c.furia === false && c.perm.F === 0 && c.perm.H === 0,
        `fúria=${c.furia} · F ${fAntes} → ${M._c3(c, 'F')}`);
}
{
  const e = arena(), c = e.A[0];
  c.sustentadas.push({ magia: furia, pm: 2 });
  M._c3recalcular(c);
  e.B[0].pv = 0; e.B[0].vivo = false;
  M.combate3dtTurno(e);
  A.ver('a Fúria Sombria comprada não passa com a queda',
        c.furia === true, `fúria=${c.furia} — foi paga de propósito, fica`);
}

// ── A paralisia dura dois fins de turno, e depois solta ──
{
  const e = arena(), c = e.A[0];
  c.indefeso = true; c.indefesoTurnos = 2;
  const r1 = M._c3fimTurno(c), presoDepoisDe1 = c.indefeso;
  const r2 = M._c3fimTurno(c);
  A.ver('a paralisia prende um turno inteiro e depois solta',
        presoDepoisDe1 === true && c.indefeso === false && r2 && r2.destravou,
        `depois do 1.º fim de turno: preso=${presoDepoisDe1} · depois do 2.º: preso=${c.indefeso}`);
}

// ── O INVERNO SÚBITO PRENDE MESMO, E PELO TEMPO QUE DIZ ──
// A magia prometia "sem atacar nem esquivar" e só cumpria a esquiva: o
// ciclo de turnos nunca olhava para a bandeira, e o congelado continuava
// a bater todos os turnos como se nada fosse. E durava um turno, não
// dois.
{
  const g = M.MAGIAS['Água'].forte.find(x => x.id === 'ag_f4');
  A.ver('o Inverno Súbito declara quantos turnos prende',
        g.congelaTurnos === 2, `congelaTurnos = ${g.congelaTurnos}`);

  // Uma batalha a sério, com a magia lançada de verdade, a contar os
  // turnos INTEIROS que o alvo perde depois do turno em que congelou.
  const perdidos = [];
  for (let s = 1; s <= 60; s++) {
    const e = M.combate3dtIniciar(
      [{ nome: 'GELO', elemento: 'Água', raridade: 'Lendário', nivel: 28, seed: 41 }],
      [{ nome: 'ALVO', elemento: 'Terra', raridade: 'Comum', nivel: 6, seed: 9 }], s,
      { historico: true,
        politica: eu => eu.nome === 'GELO' ? { magia: g, pm: g.pm } : { magia: null, pm: 0 } });
    e.B[0].pv = 900; e.B[0].pvMax = 900; e.A[0].pm = 900; e.A[0].pmMax = 900;
    let viu = false, conta = 0;
    for (let turno = 1; turno <= 8 && !e.acabou; turno++) {
      const antes = e.eventos.length;
      M.combate3dtTurno(e);
      const novos = e.eventos.slice(antes);
      if (!viu) { if (novos.some(v => v.congelou)) viu = true; continue; }
      if (novos.some(v => v.lado === 'B' && v.preso) && !novos.some(v => v.lado === 'B' && v.fa != null)) conta++;
      else break;
    }
    if (viu) perdidos.push(conta);
  }
  A.ver('e prende por 2 turnos inteiros, no mínimo',
        perdidos.length > 0 && Math.min(...perdidos) >= 2,
        `${perdidos.length} casos · mínimo ${Math.min(...perdidos)} turnos`);
}

// ── Congelado é não fazer NADA ──
{
  const e = M.combate3dtIniciar(
    [{ nome: 'EU', elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: 3 }],
    [{ nome: 'PRESO', elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: 4 },
     { nome: 'BANCO', elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: 5 }],
    2, { historico: true, escolhaTroca: (eu) => eu.nome === 'PRESO' ? 1 : -1 });
  const preso = e.B[0];
  preso.pv = 500; preso.pvMax = 500;
  preso.congelado = true; preso.congeladoTurnos = 3;
  preso.indefeso = true; preso.indefesoTurnos = 3;
  const antes = e.eventos.length;
  M.combate3dtTurno(e);
  const novos = e.eventos.slice(antes);
  A.ver('quem está congelado não ataca',
        !novos.some(v => v.lado === 'B' && v.fa != null) && novos.some(v => v.preso),
        novos.filter(v => v.lado === 'B').map(v => Object.keys(v).join('+')).join(' · ') || 'nada');
  // Trocar também é agir: deixá-lo sair de campo fazia do gelo um
  // estorvo de um segundo, bastava mandar entrar outro.
  A.ver('e também não sai de campo a trocar',
        e.ativoB === 0, `ativoB = ${e.ativoB} (pediu para trocar para o 1)`);
}

// ── O Toque Paralisante continua a ser só o que promete ──
// "sem esquivar nem se defender direito" — nunca prometeu tirar a acção,
// e não pode ganhá-la de borla por o gelo passar a tirá-la.
{
  const e = M.combate3dtIniciar(
    [{ nome: 'EU', elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: 3 }],
    [{ nome: 'TRAVADO', elemento: 'Fogo', raridade: 'Comum', nivel: 5, seed: 4 }],
    2, { historico: true });
  const c = e.B[0]; c.pv = 500; c.pvMax = 500;
  c.indefeso = true; c.indefesoTurnos = 2;      // paralisia, não gelo
  const antes = e.eventos.length;
  M.combate3dtTurno(e);
  const novos = e.eventos.slice(antes);
  // Agir não é só bater: uma vantagem de suporte, uma troca, apanhar o
  // foco — tudo conta. A primeira versão desta prova só procurava golpes
  // e dava falha quando o avatar tinha usado a Reserva Oculta.
  const agiu = novos.filter(x => x.lado === 'B' && !x.preso && !x.fimDeTurno);
  A.ver('o paralisado defende-se mal, mas continua a agir',
        agiu.length > 0 && !novos.some(x => x.preso),
        c.congelado ? 'congelado (errado)'
          : 'só indefeso, como o texto diz · fez: ' + agiu.map(x => x.magia || x.vantagem || '?').join(', '));
}

// ── As esquivas voltam a zero todo o turno ──
{
  const c = arena().A[0];
  c.esquivas = 3;
  M._c3fimTurno(c);
  A.ver('as esquivas gastas voltam a zero no fim do turno',
        c.esquivas === 0, `esquivas=${c.esquivas}`);
}

// ── Nada some sozinho: o recálculo é estável ──
{
  const c = arena().A[0];
  c.sustentadas.push({ magia: manto, pm: 4 }, { magia: furia, pm: 2 });
  M._c3recalcular(c);
  const antes = JSON.stringify([c.bonusA, c.bonusF, c.bonusH, c.bonusFD, c.furia]);
  M._c3recalcular(c); M._c3recalcular(c);
  A.ver('recalcular três vezes dá sempre o mesmo (nada acumula)',
        JSON.stringify([c.bonusA, c.bonusF, c.bonusH, c.bonusFD, c.furia]) === antes,
        `${antes} → ${JSON.stringify([c.bonusA, c.bonusF, c.bonusH, c.bonusFD, c.furia])}`);
}

const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
