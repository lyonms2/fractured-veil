// ═══════════════════════════════════════════════════════════════════
// QUEM PEDE E QUEM FAZ
//
//   node tools/guardas.js
//
// Quatro defeitos desta auditoria foram todos o mesmo defeito: um limite
// guardado por QUEM PEDE a acção — a interface, a política da IA — e não
// por QUEM A FAZ, que é a resolução do combate.
//
//   · o chão de PM        (lançar magia sem PM)          latente
//   · empilhar sustentadas (FD +40 de graça)             explorável
//   · o maxTotal da Reserva (+10 onde promete 5)         explorável
//   · o pmMax das magias   (pedir 3× e pagar 3×)         latente
//
// Guardas assim cedem ao primeiro caminho novo — e esta sessão abriu
// dois caminhos novos, o selector de alvo e a cura em aliado.
//
// Isto não lê código à procura do padrão: PÕE-O À PROVA. Chama o motor
// directamente com acções que nenhuma interface deixaria passar, e vê o
// que ele aceita. Uma interface pode ser reescrita amanhã; o que o motor
// aceita é o que fica.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const linhas = [];
let mau = 0;
const ver = (rot, ok, det) => {
  if (!ok) mau++;
  linhas.push([ok ? '  OK  ' : ' CEDE ', rot, det]);
};

const acha = (id) => {
  for (const el of Object.keys(M.MAGIAS))
    for (const cat of ['ataque', 'forte', 'defesa'])
      for (const g of (M.MAGIAS[el][cat] || [])) if (g.id === id) return { g, el };
  for (const cat of ['ataque', 'forte', 'defesa'])
    for (const g of (M.MAGIAS_UNIVERSAIS[cat] || [])) if (g.id === id) return { g, el: 'Fogo' };
  return null;
};

/* Um turno com uma acção crua, sem passar por interface nenhuma. É esta
   a porta por onde os quatro defeitos entraram. */
function turnoCom(acao, cfgA, cfgB) {
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? acao : {},
    a: Object.assign({ carac: { F: 2, H: 9, R: 20, A: 2 }, pm: 200, pmMax: 200,
                       iniciativa: 99 }, cfgA || {}),
    b: Object.assign({ carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 }, cfgB || {}),
  });
  M.combate3dtTurno(e);
  return e;
}

console.log('\n═══ O QUE O MOTOR ACEITA DE QUEM NÃO PASSA PELA INTERFACE ═══\n');

// ── 1. Magia sem PM na bolsa ──
{
  const { g, el } = acha('fg_f1');                       // 25 PM
  const e = turnoCom({ magia: g, pm: g.pm },
    { elemento: el, pm: 0, pmMax: 60, magias: { ataque: g, forte: g, defesa: g } });
  const ev = e.eventos.find(v => v.lado === 'A' && v.magia === g.id);
  /* A primeira versão desta prova aceitava "pagou 0" como sinal de
     que o motor tinha recusado. É o contrário: pagar zero e o efeito
     sair é exactamente o defeito. Uma magia que não se pode pagar não
     pode acontecer. */
  ver('uma magia de 25 PM lançada com a bolsa vazia',
      !ev || ev.magia !== g.id,
      ev ? `saiu com ${ev.pm} PM pagos, dano ${ev.dano == null ? '—' : ev.dano}`
         : 'o motor recusou');
}

// ── 2. Relançar uma sustentada por cima de si própria ──
{
  const { g, el } = acha('vt_d1');                       // FD +10, sem custo por turno
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: g, pm: g.pm } : {},
    a: { carac: { F: 2, H: 9, R: 20, A: 2 }, elemento: el, pm: 400, pmMax: 400,
         magias: { ataque: g, forte: g, defesa: g } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < 5; i++) M.combate3dtTurno(e);
  ver('erguer o Véu de Correntes cinco vezes seguidas',
      e.A[0].bonusFD === g.bonusFD,
      `FD +${e.A[0].bonusFD} · ${e.A[0].sustentadas.length} véu(s) de pé`);
}

// ── 3. Gastar a Reserva Oculta para lá do total dela ──
{
  const v = { id: 'reserva_oculta', ...M.VANTAGENS.reserva_oculta };
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { vantagem: v, pm: v.pm } : {},
    a: { carac: { F: 2, H: 4, R: 20, A: 2 }, pm: 400, pmMax: 400, vant: v },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < 12; i++) M.combate3dtTurno(e);
  ver(`insistir na Reserva Oculta doze turnos (o total dela é ${v.maxTotal})`,
      (e.A[0].reservaGasta || 0) <= v.maxTotal,
      `subiu ${e.A[0].reservaGasta || 0} pontos ao todo`);
}

// ── 3b. Insistir no Segundo Fôlego depois de o gastar ──
{
  const v = { id: 'segundo_folego', ...M.VANTAGENS.segundo_folego };
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { vantagem: v, pm: v.pm } : {},
    a: { carac: { F: 2, H: 4, R: 20, A: 2 }, pm: 400, pmMax: 400, vant: v },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  // Fica sempre ferido, para a cura ter sempre o que curar.
  let curas = 0;
  for (let i = 0; i < 8; i++) {
    e.A[0].pv = 1;
    const antes = e.eventos.length;
    M.combate3dtTurno(e);
    for (let k = antes; k < e.eventos.length; k++)
      if (e.eventos[k].lado === 'A' && e.eventos[k].curou) curas++;
  }
  ver(`insistir no Segundo Fôlego oito turnos (dá para ${v.maxUsos})`,
      curas <= v.maxUsos,
      `curou-se ${curas} vez(es) · gastou ${400 - e.A[0].pm} PM`);
}

// ── 4. Pedir três vezes o pmMax de uma magia ──
{
  const { g, el } = acha('fg_f3');                       // 4 a 20 PM
  const noTecto = turnoCom({ magia: g, pm: g.pmMax },
    { elemento: el, magias: { ataque: g, forte: g, defesa: g } });
  const acima = turnoCom({ magia: g, pm: g.pmMax * 3 },
    { elemento: el, magias: { ataque: g, forte: g, defesa: g } });
  const gasto = (e) => 200 - e.A[0].pm;
  ver('pedir 60 PM numa magia que aceita 20',
      gasto(acima) === gasto(noTecto),
      `no tecto cobrou ${gasto(noTecto)} · a pedir o triplo cobrou ${gasto(acima)}`);
}

console.log('\n─── e os caminhos que esta sessão abriu ───\n');

// ── 5. Apontar a um inimigo que não existe ──
{
  const { g } = acha('so_f3');
  for (const [rot, idx] of [['fora da lista', 9], ['negativo', -3], ['caído', 1]]) {
    const e = A.duelo({
      seed: 3,
      politica: (quem) => (quem.nome === 'A') ? { magia: g, pm: 12, alvoIdx: idx } : {},
      a: { carac: { F: 4, H: 9, R: 20, A: 2 }, elemento: 'Sombra', pm: 200, pmMax: 200,
           iniciativa: 99, magias: { ataque: g, forte: g, defesa: g } },
      b: { carac: { F: 1, H: 0, R: 8, A: 0 }, pv: 40, iniciativa: 0 },
      bBanco: { carac: { F: 1, H: 0, R: 8, A: 0 }, pv: 40 },
    });
    if (idx === 1) { e.B[1].vivo = false; e.B[1].pv = 0; }
    const antes = e.B.map(c => c.pv);
    let rebentou = null;
    try { M.combate3dtTurno(e); } catch (err) { rebentou = err.message; }
    const depois = e.B.map(c => c.pv);
    ver(`apontar a Sombra Longa a um índice ${rot}`,
        !rebentou && depois[0] < antes[0],
        rebentou ? 'rebentou: ' + rebentou : `caiu em quem está em campo · ${antes.join('/')} → ${depois.join('/')}`);
  }
}

// ── 6. Curar um companheiro que não existe ──
{
  const { g } = acha('ag_d4');
  for (const [rot, idx] of [['fora da lista', 9], ['negativo', -1], ['caído', 1]]) {
    const e = A.duelo({
      seed: 3,
      politica: (quem) => (quem.nome === 'A') ? { magia: g, pm: 20, aliadoIdx: idx } : {},
      a: { carac: { F: 2, H: 9, R: 8, A: 2 }, elemento: 'Água', pm: 200, pmMax: 200,
           pv: 5, iniciativa: 99, magias: { ataque: g, forte: g, defesa: g } },
      aBanco: { carac: { F: 2, H: 1, R: 8, A: 2 }, pv: 5 },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
    });
    if (idx === 1) { e.A[1].vivo = false; e.A[1].pv = 0; }
    let rebentou = null;
    try { M.combate3dtTurno(e); } catch (err) { rebentou = err.message; }
    ver(`curar com a Maré Compartilhada num índice ${rot}`,
        !rebentou && e.A[0].pv > 5,
        rebentou ? 'rebentou: ' + rebentou : `curou quem lançou: 5 → ${e.A[0].pv}`);
  }
}

// ── 7. Trocar para um avatar que não existe ou já caiu ──
{
  for (const [rot, idx] of [['fora da lista', 9], ['negativo', -2], ['caído', 1]]) {
    const e = A.duelo({
      seed: 3,
      escolhaTroca: (quem) => (quem.nome === 'A') ? idx : -1,
      politica: () => ({}),
      a: { carac: { F: 2, H: 4, R: 8, A: 2 } },
      aBanco: { carac: { F: 2, H: 2, R: 8, A: 2 } },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
    });
    if (idx === 1) { e.A[1].vivo = false; e.A[1].pv = 0; }
    let rebentou = null;
    try { M.combate3dtTurno(e); } catch (err) { rebentou = err.message; }
    ver(`trocar para um índice ${rot}`,
        !rebentou && e.A[e.ativoA] && e.A[e.ativoA].vivo,
        rebentou ? 'rebentou: ' + rebentou : `ficou em campo o ${e.ativoA + 1}º, vivo`);
  }
}

// ── 8. Meter no Toque de Energia mais PM do que a Armadura ──
{
  const v = { id: 'toque_ardente', ...M.VANTAGENS.toque_ardente };
  const e = turnoCom({ toque: true, toquePM: 999, magia: null, pm: 0 },
    { carac: { F: 1, H: 1, R: 20, A: 3 }, vant: v });
  const ev = e.eventos.find(x => x.lado === 'A' && x.toque);
  ver('meter 999 PM num toque com Armadura 3',
      !!ev && ev.pm <= 3, ev ? `gastou ${ev.pm}` : 'não usou o toque');
}

// ── Relatório ──
console.log('');
const larg = Math.max(...linhas.map(l => l[1].length));
for (const [tag, rot, det] of linhas) console.log(tag + '  ' + rot.padEnd(larg) + '   · ' + det);
console.log('\n─────────────────────────────');
console.log(`${linhas.length - mau} guardados pelo motor · ${mau} cederam`);
if (mau) process.exitCode = 1;
