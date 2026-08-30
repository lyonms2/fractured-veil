// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS MAGIAS QUE ESCOLHEM ALVO
//
// Este combate sempre foi activo-contra-activo: batia-se em quem estava
// à frente e mais nada. Duas magias novas levantam essa restrição, cada
// uma para o seu lado — a Sombra Longa alcança qualquer inimigo, a Maré
// Compartilhada cura qualquer companheiro.
//
// É a primeira vez que o alvo de uma acção não é o activo do outro
// lado, e por isso o que aqui se prova não é só o efeito das duas: é
// que a escolha CHEGA ao sítio certo. Um alvo mal encaminhado bate no
// avatar errado sem dizer nada — nenhum número sai errado, só a pessoa.
//
/* Sobre quem são estas provas.

   As afirmações aqui dentro não repetem o nome da magia em cada
   linha — dizem "cada 2 PM valem 1 dado de cura", que se lê melhor
   mas não diz de quem é. E os cabeçalhos com o nome saem quando o
   ficheiro CORRE, enquanto as afirmações saem todas juntas no fim,
   portanto nunca ficam ao lado umas das outras no relatório.

   Esta linha é o que permite ao tools/inventario.js saber que estas
   magias têm prova. Sem ela, ele lê o relatório, não encontra os
   nomes, e declara-as por olhar. */
// @cobre so_f3 ag_d4
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const SOMBRA = M.MAGIAS['Sombra'].forte.find(g => g.id === 'so_f3');
const MARE   = M.MAGIAS['Água'].defesa.find(g => g.id === 'ag_d4');

/* Um duelo de três contra três, com todos vivos e com vidas diferentes,
   para se poder ver EM QUEM a magia pegou. Os do banco entram com vida
   distinta de propósito: se a magia batesse sempre no activo, os outros
   nunca mudavam. */
function trio(cfg) {
  const e = A.duelo({
    seed: cfg.seed || 3,
    politica: cfg.politica,
    a: { carac: { F: 2, H: 9, R: 8, A: 1 }, elemento: cfg.elA || 'Sombra',
         pm: 200, pmMax: 200, iniciativa: 99, pv: cfg.pvA,
         magias: { ataque: cfg.magia, forte: cfg.magia, defesa: cfg.magia } },
    aBanco: { carac: { F: 2, H: 1, R: 8, A: 1 }, pv: cfg.pvBanco, iniciativa: 0 },
    b: { carac: { F: 1, H: 0, R: 8, A: 1 }, pv: cfg.pvB, iniciativa: 0 },
    bBanco: { carac: { F: 1, H: 0, R: 8, A: 1 }, pv: cfg.pvBBanco, iniciativa: 0 },
  });
  return e;
}

console.log('\n═══ SOMBRA LONGA (so_f3) ═══');
console.log('  "A sua sombra sobe por quem você apontar, inclusive quem está');
console.log('   atrás."   ·   3 a 12 PM\n');

// ── 1. O catálogo ──
A.ver('custa de 3 a 12 PM e declara que escolhe alvo',
      SOMBRA.pm === 3 && SOMBRA.pmMax === 12 && SOMBRA.escolheAlvo === true && !!SOMBRA.fa,
      `pm=${SOMBRA.pm}–${SOMBRA.pmMax} escolheAlvo=${SOMBRA.escolheAlvo}`);

/* ── 2. E resolve o buraco por que nasceu ──

   A gaveta forte da Sombra começava nos 10 PM — a única acima dos 5 —
   e por isso os avatares de Sombra com Habilidade 1 tinham tecto 5, o
   bolo ficava vazio, e chegavam ao nível 35 SEM golpe forte nenhum.
   Eram 158 em mil. */
{
  let semForte = 0, total = 0;
  for (const r of ['Comum', 'Raro', 'Épico', 'Lendário']) {
    for (let s = 1; s <= 250; s++) {
      const f = M.fichaDeAvatar({ elemento: 'Sombra', raridade: r, nivel: 35, seed: s });
      if (!f) continue;
      total++;
      if (!M.magiasDoAvatar(f).forte) semForte++;
    }
  }
  A.ver('nenhum avatar de Sombra fica sem golpe forte',
        semForte === 0, `${semForte} de ${total} sem golpe forte  (eram 158)`);
}

// ── 3. Bate em quem se apontar, e não em quem está à frente ──
{
  for (const alvo of [0, 1, 2]) {
    const e = trio({ magia: SOMBRA, pvA: 40, pvBanco: 40, pvB: 40, pvBBanco: 40,
      politica: (q) => (q.nome === 'A') ? { magia: SOMBRA, pm: 12, alvoIdx: alvo } : {} });
    const antes = e.B.map(c => c.pv);
    M.combate3dtTurno(e);
    const depois = e.B.map(c => c.pv);
    const feridos = depois.map((v, i) => v < antes[i] ? i : -1).filter(i => i >= 0);
    A.ver(`apontada ao ${alvo + 1}º, é o ${alvo + 1}º que leva`,
          feridos.length === 1 && feridos[0] === alvo,
          `vidas ${antes.join('/')} → ${depois.join('/')}`);
  }
}

/* ── 4. O registo aponta ao cartão certo ──

   O `alvoIdx` do evento é o que a animação usa para escolher em que
   cartão treme e onde sai o número. Se ele ficasse no activo, a magia
   feria o do banco e a batalha mostrava o da frente a levar — nenhum
   número errado, só a pessoa errada. */
{
  const e = trio({ magia: SOMBRA, pvA: 40, pvBanco: 40, pvB: 40, pvBBanco: 40,
    politica: (q) => (q.nome === 'A') ? { magia: SOMBRA, pm: 12, alvoIdx: 2 } : {} });
  M.combate3dtTurno(e);
  const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'so_f3');
  A.ver('o evento diz o índice e o nome de quem levou mesmo',
        !!ev && ev.alvoIdx === 2 && ev.alvo === e.B[2].nome,
        ev ? `alvoIdx=${ev.alvoIdx} alvo="${ev.alvo}"` : 'sem evento');
}

// ── 5. Um alvo caído ou inexistente cai de volta no activo ──
// A validação vive no motor e não em quem escolhe: a interface e a
// política escolhem bem hoje, e é para quando uma delas mudar.
{
  const casos = [
    ['um índice fora da lista', 7],
    ['um companheiro que já caiu', 1],
  ];
  for (const [rot, idx] of casos) {
    const e = trio({ magia: SOMBRA, pvA: 40, pvBanco: 40, pvB: 40, pvBBanco: 40,
      politica: (q) => (q.nome === 'A') ? { magia: SOMBRA, pm: 12, alvoIdx: idx } : {} });
    if (idx === 1) { e.B[1].vivo = false; e.B[1].pv = 0; }
    const antes = e.B.map(c => c.pv);
    M.combate3dtTurno(e);
    const depois = e.B.map(c => c.pv);
    A.ver(`com ${rot}, o golpe vai para quem está em campo`,
          depois[0] < antes[0], `vidas ${antes.join('/')} → ${depois.join('/')}`);
  }
}

// ── 6. A política aponta ao mais perto de cair ──
{
  // O bBanco da base serve OS DOIS do banco. A primeira versao desta
  // prova punha 3 de vida nos dois e depois exigia que a politica
  // escolhesse o terceiro — ela escolhia o segundo, que era o
  // primeiro dos empatados, e estava certa.
  const e = trio({ magia: SOMBRA, pvA: 40, pvBanco: 40, pvB: 40, pvBBanco: 40 });
  e.B[0].pv = 40; e.B[1].pv = 40; e.B[2].pv = 3;
  M.combate3dtTurno(e);
  const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'so_f3');
  A.ver('sozinha, a política escolhe o mais perto de cair',
        !!ev && ev.alvoIdx === 2,
        ev ? `apontou ao ${ev.alvoIdx + 1}º, que tinha 3 de vida` : 'não a lançou');
}

console.log('\n═══ MARÉ COMPARTILHADA (ag_d4) ═══');
console.log('  "Cura 1d a cada 2 PM, em si ou em qualquer companheiro."   ·   3 a 20 PM\n');

// ── 7. O catálogo ──
A.ver('custa de 3 a 20 PM e cura aliados',
      MARE.pm === 3 && MARE.pmMax === 20 && MARE.curaAliado === true
      && MARE.cura.dadosPorPM === 0.5,
      `pm=${MARE.pm}–${MARE.pmMax} curaAliado=${MARE.curaAliado}`);

// ── 8. Cura quem se apontar ──
{
  for (const quem of [0, 1, 2]) {
    const e = trio({ elA: 'Água', magia: MARE, pvA: 10, pvBanco: 10, pvB: 40, pvBBanco: 40,
      politica: (q) => (q.nome === 'A') ? { magia: MARE, pm: 20, aliadoIdx: quem } : {} });
    e.A.forEach(c => { c.pv = 10; });
    const antes = e.A.map(c => c.pv);
    M.combate3dtTurno(e);
    const depois = e.A.map(c => c.pv);
    const curados = depois.map((v, i) => v > antes[i] ? i : -1).filter(i => i >= 0);
    A.ver(`apontada ao ${quem + 1}º da minha equipa, é o ${quem + 1}º que cura`,
          curados.length === 1 && curados[0] === quem,
          `vidas ${antes.join('/')} → ${depois.join('/')}`);
  }
}

// ── 9. Alcança o banco, que é o ponto ──
// A Maré Restauradora fecha só o próprio corpo. Esta serve para preparar
// quem vai entrar, em vez de esperar que ele apanhe os golpes primeiro.
{
  const e = trio({ elA: 'Água', magia: MARE, pvA: 40, pvBanco: 5, pvB: 40, pvBBanco: 40,
    politica: (q) => (q.nome === 'A') ? { magia: MARE, pm: 20, aliadoIdx: 1 } : {} });
  e.A[0].pv = 40; e.A[1].pv = 5;
  M.combate3dtTurno(e);
  const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'ag_d4');
  A.ver('cura quem está no banco, sem ele entrar em campo',
        e.A[1].pv > 5 && e.A[0].pv === 40,
        `banco 5 → ${e.A[1].pv} · em campo ficou nos ${e.A[0].pv}`);
  A.ver('e o registo diz a quem foi',
        !!ev && ev.curado === e.A[1].nome && ev.curadoIdx === 1,
        ev ? `curado="${ev.curado}" idx=${ev.curadoIdx}` : 'sem evento');
}

// ── 10. Não levanta quem já caiu ──
{
  const e = trio({ elA: 'Água', magia: MARE, pvA: 20, pvBanco: 0, pvB: 40, pvBBanco: 40,
    politica: (q) => (q.nome === 'A') ? { magia: MARE, pm: 20, aliadoIdx: 1 } : {} });
  e.A[1].vivo = false; e.A[1].pv = 0;
  M.combate3dtTurno(e);
  A.ver('um companheiro caído continua caído',
        e.A[1].pv === 0 && !e.A[1].vivo,
        `pv=${e.A[1].pv} vivo=${e.A[1].vivo} · a cura foi para quem podia recebê-la`);
}

// ── 11. Não cura o inimigo ──
{
  const e = trio({ elA: 'Água', magia: MARE, pvA: 10, pvBanco: 10, pvB: 10, pvBBanco: 10,
    politica: (q) => (q.nome === 'A') ? { magia: MARE, pm: 20, aliadoIdx: 0 } : {} });
  e.B.forEach(c => { c.pv = 10; });
  const antes = e.B.map(c => c.pv);
  M.combate3dtTurno(e);
  A.ver('nenhum ponto de cura atravessa para o outro lado',
        e.B.every((c, i) => c.pv <= antes[i]),
        `inimigos ${antes.join('/')} → ${e.B.map(c => c.pv).join('/')}`);
}

// ── 12. A política cura o mais ferido ──
{
  const e = trio({ elA: 'Água', magia: MARE, pvA: 40, pvBanco: 40, pvB: 40, pvBBanco: 40 });
  e.A[0].pv = 38; e.A[1].pv = 4; e.A[2].pv = 40;
  M.combate3dtTurno(e);
  const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'ag_d4');
  A.ver('sozinha, a política cura quem tem mais vida a faltar',
        !!ev && (ev.curadoIdx === 1 || e.A[1].pv > 4),
        ev ? `curou o ${((ev.curadoIdx ?? 0) + 1)}º · vidas ${e.A.map(c => c.pv).join('/')}`
           : 'não a lançou');
}

// ── Relatório ──
const { ok, mau, linhas } = A.relatorio();
console.log('');
for (const [tag, nome, det] of linhas) console.log(tag + ' ' + nome + (det ? '   · ' + det : ''));
console.log('\n─────────────────────────────');
console.log(`${ok} passaram · ${mau} falharam`);
