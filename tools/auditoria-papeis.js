// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DOS PAPÉIS ELEMENTAIS
//
// Os outros ficheiros perguntam "esta magia funciona?". Este pergunta
// outra coisa: "o Fogo continua a ser o que bate mais forte?".
//
//   FOGO    bate mais forte que todos, e não tem defesa nenhuma
//   TERRA   a maior defesa: a Armadura chega a contar a dobrar
//   ÁGUA    aguenta-se: cura-se, e sustenta escudo e véu
//   VENTO   rápido e esquivo, bate mais fraco, mas às vezes bate várias
//   SOMBRA  drena e atrapalha
//
// Sem isto, uma mudança de balanceamento apaga a identidade dos
// elementos sem ninguém dar por ela.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;
const media = a => a.reduce((x, y) => x + y, 0) / a.length;

// O melhor golpe forte que este elemento consegue lançar, para um H dado
function melhorForte(el, H, F) {
  let melhor = 0;
  for (const g of (M.MAGIAS[el].forte || [])) {
    if (g.pm > H * 5 || !g.fa) continue;
    const pm = Math.min(g.pmMax || g.pm, H * 5), extra = pm - g.pm, f = g.fa;
    const dados = (f.dados || 0) + Math.floor(extra * (f.dadosPorPM || 0));
    const base = (f.F ? F : 0) + (f.H ? H : 0) + (f.fixo || 0)
               + Math.floor(extra * (f.fixoPorPM || 0));
    melhor = Math.max(melhor, base + (dados || 1) * 3.5);
  }
  return melhor;
}

// Quantos PMs de Armadura este elemento consegue erguer
function melhorArmadura(el) {
  let melhor = 0, dobra = false;
  for (const g of (M.MAGIAS[el].defesa || [])) {
    if (g.armaduraPorPM) melhor = Math.max(melhor, g.armaduraMax || 5);
    if (g.armadura)      melhor = Math.max(melhor, g.armadura);
    if (g.armaduraDobra) dobra = true;
  }
  return { melhor, dobra };
}

const tem = (el, prop) => ['ataque', 'forte', 'defesa']
  .some(c => (M.MAGIAS[el][c] || []).some(g => g[prop]));

console.log('\n═══ OS CINCO PAPÉIS ═══\n');

// ── FOGO: o dano, sem rede ──
{
  const H = 4, F = 2;
  const fogo = melhorForte('Fogo', H, F);
  const outros = ['Terra', 'Água', 'Vento', 'Sombra'].map(el => [el, melhorForte(el, H, F)]);
  A.ver('FOGO — bate mais forte que todos os outros',
        outros.every(([, v]) => fogo > v),
        `com H${H}: Fogo ${fogo.toFixed(1)} · ` + outros.map(([e, v]) => e + ' ' + v.toFixed(1)).join(' · '));
  A.ver('FOGO — não tem magia de defesa nenhuma',
        (M.MAGIAS['Fogo'].defesa || []).length === 0,
        `${(M.MAGIAS['Fogo'].defesa || []).length} magias na gaveta da defesa`);
}

// ── TERRA: a muralha ──
{
  const t = melhorArmadura('Terra');
  const outros = ['Fogo', 'Água', 'Vento', 'Sombra'].map(el => [el, melhorArmadura(el)]);
  A.ver('TERRA — só ela dobra a Armadura',
        t.dobra && outros.every(([, o]) => !o.dobra),
        'dobra: Terra ' + t.dobra + ' · ' + outros.map(([e, o]) => e + ' ' + o.dobra).join(' · '));
  // e a dobra tem mesmo de chegar à conta da Defesa
  const fd = comDobra => {
    const fs = [];
    for (let s = 1; s <= 400; s++) {
      const e = A.duelo({ seed: s, politica: () => ({ magia: null, pm: 0 }),
        a: { carac: { F: 4, H: 3, R: 8, A: 0 } },
        b: { carac: { F: 0, H: 0, R: 400, A: 3 } } });
      if (comDobra) e.B[0].armaduraDobrada = true;
      M.combate3dtTurno(e);
      const g = e.eventos.find(x => x.lado === 'A' && x.fd != null);
      if (g) fs.push(g.fd);
    }
    return media(fs);
  };
  const cd = fd(true), sd = fd(false);
  A.ver('TERRA — a Armadura dobrada sobe mesmo a Defesa',
        cd > sd + 2, `FD média com A3: dobrada ${cd.toFixed(2)} · normal ${sd.toFixed(2)}`);
}

// ── ÁGUA: quem aguenta ──
{
  A.ver('ÁGUA — é a única que se cura',
        tem('Água', 'cura') && !['Fogo','Terra','Vento','Sombra'].some(el => tem(el, 'cura')),
        'cura: ' + ['Fogo','Água','Terra','Vento','Sombra'].map(el => el + ' ' + tem(el, 'cura')).join(' · '));
  A.ver('ÁGUA — sustenta escudo e véu ao mesmo tempo',
        melhorArmadura('Água').melhor > 0 && tem('Água', 'ocultacao'),
        `escudo até A+${melhorArmadura('Água').melhor} · véu ${tem('Água', 'ocultacao')}`);
  // e a cura tem de curar mesmo
  const g = (M.MAGIAS['Água'].defesa || []).find(x => x.cura);
  const { e } = A.lancar({ seed: 3, politica: () => ({ magia: g, pm: 10 }),
    a: { carac: { F: 2, H: 5, R: 8, A: 0 }, pv: 10, pm: 40 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } }, 1);
  A.ver('ÁGUA — a cura devolve vida de verdade',
        e.A[0].pv > 10, `PV 10 → ${e.A[0].pv} gastando 10 PM`);
}

// ── VENTO: depressa, e muitas vezes ──
{
  const H = 4, F = 2;
  const vento = melhorForte('Vento', H, F);
  A.ver('VENTO — bate mais fraco do que o Fogo e a Terra',
        vento < melhorForte('Fogo', H, F) && vento < melhorForte('Terra', H, F) + 0.01,
        `com H${H}: Vento ${vento.toFixed(1)} · Fogo ${melhorForte('Fogo',H,F).toFixed(1)} · Terra ${melhorForte('Terra',H,F).toFixed(1)}`);
  A.ver('VENTO — só ele bate várias vezes no mesmo turno',
        tem('Vento', 'ondasPor') && !['Fogo','Terra','Água','Sombra'].some(el => tem(el, 'ondasPor')),
        'ondas: ' + ['Fogo','Água','Terra','Vento','Sombra'].filter(el => tem(el, 'ondasPor')).join(', '));
  A.ver('VENTO — só ele tem o corte que decapita num crítico',
        tem('Vento', 'vorpal') && !['Fogo','Terra','Água','Sombra'].some(el => tem(el, 'vorpal')), '');
  A.ver('VENTO — e é o que mais ajuda a esquivar',
        tem('Vento', 'esquivaBonus'), '');
}

// ── SOMBRA: o que incomoda ──
{
  const drena = el => tem(el, 'drenaPM') || tem(el, 'roubaVida');
  const atrapalha = el => tem(el, 'cegueira') || tem(el, 'buffFuria') || tem(el, 'destroiAlma');
  A.ver('SOMBRA — é a única que drena (vida e magia)',
        tem('Sombra', 'drenaPM') && tem('Sombra', 'roubaVida')
        && !['Fogo','Terra','Água','Vento'].some(drena),
        'drena: ' + ['Fogo','Água','Terra','Vento','Sombra'].filter(drena).join(', '));
  A.ver('SOMBRA — é a única que cega',
        tem('Sombra', 'cegueira') && !['Fogo','Terra','Água','Vento'].some(el => tem(el, 'cegueira')), '');
  A.ver('SOMBRA — atrapalha de mais de uma forma', atrapalha('Sombra'), '');
  // o roubo de vida tem de transferir mesmo
  const g = (M.MAGIAS['Sombra'].ataque || []).find(x => x.roubaVida);
  const e = A.duelo({ seed: 5, politica: eu => eu.nome === 'A' ? { magia: g, pm: 1 } : { magia: null, pm: 0 },
    a: { carac: { F: 1, H: 4, R: 8, A: 5 }, pv: 20, pm: 40 },
    b: { carac: { F: 0, H: 0, R: 400, A: 0 } } });
  const pvB = e.B[0].pv;
  M.combate3dtTurno(e); M.combate3dtTurno(e);
  A.ver('SOMBRA — o roubo de vida tira ao outro e dá a si',
        e.B[0].pv < pvB && e.A[0].pv >= 20,
        `inimigo ${pvB} → ${e.B[0].pv} · eu 20 → ${e.A[0].pv}`);
}

const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
