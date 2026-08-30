// ═══════════════════════════════════════════════════════════════════
// OS TECTOS DECLARADOS
//
//   node tools/tectos.js
//
// Há sítios no catálogo onde uma magia ou vantagem diz "até X":
// armaduraMax, maxTotal, ondasMax, pmMax. Cada um desses números é uma
// promessa ao jogador, e cada um é cumprido por uma linha diferente do
// motor — nenhum se cumpre sozinho.
//
// Isto pega em cada tecto declarado e tenta ULTRAPASSÁ-LO: pede mais PM
// do que a magia aceita, insiste turno após turno, empurra a
// característica acima do limite. O que ceder aparece aqui.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const nome = (id) => global.__PT['mag.' + id + '.nome']
                  || global.__PT['vd.' + id + '.nome'] || id;

const acha = (id) => {
  for (const el of Object.keys(M.MAGIAS))
    for (const cat of ['ataque', 'forte', 'defesa'])
      for (const g of (M.MAGIAS[el][cat] || [])) if (g.id === id) return { g, el };
  for (const cat of ['ataque', 'forte', 'defesa'])
    for (const g of (M.MAGIAS_UNIVERSAIS[cat] || [])) if (g.id === id) return { g, el: 'Fogo' };
  return null;
};

const linhas = [];
let mau = 0;
const ver = (rot, ok, det) => {
  if (!ok) mau++;
  linhas.push([ok ? '  OK  ' : 'PASSOU', rot, det]);
};

// ── Quem declara tecto ──
const COM_TECTO = [];
for (const el of Object.keys(M.MAGIAS))
  for (const cat of ['ataque', 'forte', 'defesa'])
    for (const g of (M.MAGIAS[el][cat] || [])) {
      if (g.armaduraMax != null) COM_TECTO.push({ g, el, campo: 'armaduraMax' });
      if (g.ondasMax != null)    COM_TECTO.push({ g, el, campo: 'ondasMax' });
    }
for (const [id, v] of Object.entries(M.VANTAGENS))
  if (v.maxTotal != null) COM_TECTO.push({ g: { id, ...v }, el: null, campo: 'maxTotal' });

console.log('\n═══ OS TECTOS DECLARADOS, POSTOS À PROVA ═══\n');
console.log(COM_TECTO.map(x => x.g.id + '.' + x.campo + '=' + x.g[x.campo]).join('   ') + '\n');

/* ── 1. armaduraMax — a Armadura que a concha dá ──
   Duas formas de a ultrapassar: pedir PM a mais de uma vez, e insistir
   turno após turno. Ambas já foram problema; a segunda partiu mesmo. */
for (const { g, el, campo } of COM_TECTO.filter(x => x.campo === 'armaduraMax')) {
  const tecto = g.armaduraMax;

  // (a) de uma assentada, com o dobro do PM que a magia aceita
  {
    const e = A.duelo({
      seed: 3,
      politica: (q) => (q.nome === 'A') ? { magia: g, pm: tecto * 4 } : {},
      a: { carac: { F: 2, H: 9, R: 20, A: 2 }, elemento: el, pm: 400, pmMax: 400,
           magias: { ataque: g, forte: g, defesa: g } },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
    });
    M.combate3dtTurno(e);
    ver(`${nome(g.id)} não passa de +${tecto} com ${tecto * 4} PM de uma vez`,
        e.A[0].bonusA <= tecto, `bonusA = +${e.A[0].bonusA}`);
  }

  // (b) insistindo oito turnos seguidos
  {
    const e = A.duelo({
      seed: 3,
      politica: (q) => (q.nome === 'A') ? { magia: g, pm: tecto } : {},
      a: { carac: { F: 2, H: 9, R: 20, A: 2 }, elemento: el, pm: 400, pmMax: 400,
           magias: { ataque: g, forte: g, defesa: g } },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
    });
    let maior = 0;
    for (let i = 0; i < 8 && !e.acabou; i++) { M.combate3dtTurno(e); maior = Math.max(maior, e.A[0].bonusA); }
    ver(`${nome(g.id)} não passa de +${tecto} insistindo oito turnos`,
        maior <= tecto, `maior que chegou a valer: +${maior}`);
  }
}

/* ── 2. ondasMax — quantas ondas uma magia dispara ── */
for (const { g, el } of COM_TECTO.filter(x => x.campo === 'ondasMax')) {
  const tecto = g.ondasMax;
  let maior = 0;
  for (let s = 1; s <= 200; s++) {
    const { evA } = A.lancar({
      seed: s,
      politica: () => ({ magia: g, pm: (g.pmMax || g.pm) * 3 }),
      a: { carac: { F: 3, H: 12, R: 20, A: 1 }, elemento: el, pm: 400, pmMax: 400,
           magias: { ataque: g, forte: g, defesa: g } },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 } },
    }, 1);
    const ev = evA.find(v => v.magia === g.id);
    if (ev && ev.rolagens) maior = Math.max(maior, ev.rolagens.length);
  }
  ver(`${nome(g.id)} não passa de ${tecto} ondas, nem com PM a triplicar`,
      maior <= tecto, `maior número de ondas visto: ${maior}`);
}

/* ── 3. maxTotal — quanto a Reserva Oculta pode subir ao todo ──
   Esta é a mais frágil das três: não é um tecto por lançamento, é um
   tecto SOMADO ao longo da luta, e quem o guarda é um contador
   (reservaGasta) que tem de ser mexido em cada uso. */
for (const { g } of COM_TECTO.filter(x => x.campo === 'maxTotal')) {
  const tecto = g.maxTotal;
  const e = A.duelo({
    seed: 3,
    politica: (q) => (q.nome === 'A') ? { vantagem: g, pm: g.pm } : {},
    a: { carac: { F: 2, H: 4, R: 20, A: 2 }, pm: 400, pmMax: 400,
         vant: { id: g.id, ...g } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < 10 && !e.acabou; i++) {
    M.combate3dtTurno(e);
    trilho.push((e.A[0].reservaGasta || 0));
  }
  const subiuTudo = (e.A[0].perm.F || 0) + (e.A[0].perm.A || 0);
  ver(`${nome(g.id)} não sobe mais de ${tecto} pontos ao todo, em dez turnos`,
      (e.A[0].reservaGasta || 0) <= tecto && subiuTudo <= tecto,
      `reservaGasta=${e.A[0].reservaGasta || 0} · subiu F+${e.A[0].perm.F || 0} A+${e.A[0].perm.A || 0}` +
      ` · trilho ${trilho.join(',')}`);
}

/* ── 4. pmMax — o PM que uma magia aceita ──
   Não é um tecto de efeito, é um tecto de INVESTIMENTO, e vale para
   todas as que escalam. Pedir mais do que ela aceita não pode render
   mais nem cobrar mais. */
{
  const escalam = [];
  for (const el of Object.keys(M.MAGIAS))
    for (const cat of ['ataque', 'forte', 'defesa'])
      for (const g of (M.MAGIAS[el][cat] || [])) if (g.pmMax) escalam.push({ g, el });
  let quebrou = [];
  for (const { g, el } of escalam) {
    const noTecto = A.duelo({
      seed: 3,
      politica: (q) => (q.nome === 'A') ? { magia: g, pm: g.pmMax } : {},
      a: { carac: { F: 3, H: 12, R: 20, A: 2 }, elemento: el, pm: 400, pmMax: 400,
           magias: { ataque: g, forte: g, defesa: g } },
      b: { carac: { F: 1, H: 0, R: 9999, A: 0 }, iniciativa: 0 },
    });
    const acima = A.duelo({
      seed: 3,
      politica: (q) => (q.nome === 'A') ? { magia: g, pm: g.pmMax * 3 } : {},
      a: { carac: { F: 3, H: 12, R: 20, A: 2 }, elemento: el, pm: 400, pmMax: 400,
           magias: { ataque: g, forte: g, defesa: g } },
      b: { carac: { F: 1, H: 0, R: 9999, A: 0 }, iniciativa: 0 },
    });
    M.combate3dtTurno(noTecto); M.combate3dtTurno(acima);
    const gastoNo = 400 - noTecto.A[0].pm, gastoAcima = 400 - acima.A[0].pm;
    if (gastoAcima > gastoNo) quebrou.push(`${g.id} cobrou ${gastoAcima} em vez de ${gastoNo}`);
  }
  ver(`nenhuma das ${escalam.length} que escalam cobra acima do seu pmMax`,
      quebrou.length === 0, quebrou.length ? quebrou.join(' · ') : 'todas travadas no tecto declarado');
}

// ── Relatório ──
console.log('');
const larg = Math.max(...linhas.map(l => l[1].length));
for (const [tag, rot, det] of linhas) console.log(tag + '  ' + rot.padEnd(larg) + '   · ' + det);
console.log('\n─────────────────────────────');
console.log(`${linhas.length - mau} respeitados · ${mau} ultrapassados`);
if (mau) process.exitCode = 1;
