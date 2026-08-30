// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS MAGIAS
// Duas perguntas por magia:
//   1. a FA que sai é a que a fórmula do catálogo manda?
//   2. o efeito especial dela acontece mesmo?
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

// Todas as magias, com o elemento e a gaveta de onde vêm
const TODAS = [];
for (const [el, kit] of Object.entries(M.MAGIAS))
  for (const cat of ['ataque', 'forte', 'defesa'])
    for (const g of kit[cat] || []) TODAS.push({ g, el, cat });
for (const cat of ['ataque', 'forte', 'defesa'])
  for (const g of M.MAGIAS_UNIVERSAIS[cat] || []) TODAS.push({ g, el: 'todas', cat });

const F = 3, H = 4;   // atacante fixo, para a conta esperada ser previsível

// A FA que a fórmula do catálogo manda, para um pm concreto
function faEsperada(g, pm) {
  const f = g.fa || {}, extra = pm - g.pm;
  const dados = (f.dados || 0) + Math.floor(extra * (f.dadosPorPM || 0));
  const base = (f.F ? F : 0) + (f.H ? H : 0) + (f.fixo || 0)
             + Math.floor(extra * (f.fixoPorPM || 0));
  const n = dados || 1;                 // sem dados próprios, usa o dado do ataque
  return { min: base + n, max: base + n * 6, dados: n, base };
}

// Lança a magia N vezes e devolve os eventos
function lancarMagia(g, pm, defesa, n) {
  const fora = [];
  for (let s = 1; s <= n; s++) {
    const { evA } = A.lancar({
      seed: s,
      politica: () => ({ magia: g, pm }),
      a: { carac: { F, H, R: 8, A: 2 }, magias: { ataque: g, forte: g, defesa: g } },
      b: Object.assign({ carac: { F: 0, H: 0, R: 40, A: 0 } }, defesa || {}),
    }, 1);
    if (evA[0]) fora.push(evA[0]);
  }
  return fora;
}

console.log('\n═══ 1. A FÓRMULA DE ATAQUE ═══\n');
for (const { g, el, cat } of TODAS) {
  if (!g.fa) continue;
  const rot = `${el}/${cat} ${A.nomeDe(g.id)} (${g.id})`;
  // no custo mínimo e, se escalar, no máximo
  for (const pm of [g.pm, g.pmMax].filter((v, i, a) => v != null && a.indexOf(v) === i)) {
    const esp = faEsperada(g, pm);
    // ondas partem a FA em várias: usar as rolagens individuais
    // Com muitos dados os extremos são raros (três 1s saem 1 vez em 216),
    // por isso o número de lançamentos acompanha o número de dados.
    const tentativas = 400 * Math.max(1, esp.dados);
    const evs = lancarMagia(g, pm, null, tentativas);
    const fas = [];
    for (const ev of evs) {
      if (ev.rolagens) ev.rolagens.forEach(r => fas.push(r.fa));
      else if (ev.fa != null) fas.push(ev.fa);
    }
    if (!fas.length) { A.ver(rot + ` @${pm}PM`, false, 'nunca chegou a rolar FA'); continue; }
    const lo = Math.min(...fas), hi = Math.max(...fas);
    const dentro = lo >= esp.min && hi <= esp.max;
    // Exigir que os extremos apareçam só funciona com poucos dados: com
    // 10d, sair tudo a 1 é uma hipótese em 60 milhões. A MÉDIA é o teste
    // afiado — um dado a mais ou a menos desloca-a 3.5, muito acima do
    // ruído destas amostras.
    const mediaEsp = esp.base + esp.dados * 3.5;
    const mediaObs = fas.reduce((x, y) => x + y, 0) / fas.length;
    const perto = Math.abs(mediaObs - mediaEsp) < 0.6;
    A.ver(rot + ` @${pm}PM`, dentro && perto,
      `esperado ${esp.min}–${esp.max} (${esp.base}+${esp.dados}d, média ${mediaEsp.toFixed(1)})` +
      ` · observado ${lo}–${hi}, média ${mediaObs.toFixed(2)}`);
  }
}

console.log('\n═══ 2. OS EFEITOS ESPECIAIS ═══\n');

// ── ignoraArmadura: a Armadura do alvo não pode entrar na FD ──
for (const { g, el, cat } of TODAS.filter(x => x.g.ignoraArmadura)) {
  const evs = lancarMagia(g, g.pm, { carac: { F: 0, H: 0, R: 40, A: 5 } }, 200);
  const fds = evs.filter(e => e.fd != null).map(e => e.fd);
  A.ver(`ignora Armadura · ${A.nomeDe(g.id)}`, fds.length > 0 && Math.max(...fds) <= 6,
        `FD contra um alvo de A5 ficou em ${Math.min(...fds)}–${Math.max(...fds)} (tem de ser 1–6)`);
}

// ── alvoIndefeso: a Habilidade do alvo não pode entrar na FD ──
for (const { g } of TODAS.filter(x => x.g.alvoIndefeso)) {
  const evs = lancarMagia(g, g.pm, { carac: { F: 0, H: 5, R: 40, A: 0 } }, 200);
  const fds = [];
  evs.forEach(e => e.rolagens ? e.rolagens.forEach(r => fds.push(r.fd)) : (e.fd != null && fds.push(e.fd)));
  A.ver(`alvo indefeso · ${A.nomeDe(g.id)}`, fds.length > 0 && Math.max(...fds) <= 6,
        `FD contra um alvo de H5 ficou em ${Math.min(...fds)}–${Math.max(...fds)} (tem de ser 1–6)`);
}

// ── ondas: o número de rolagens tem de subir com os PM ──
for (const { g } of TODAS.filter(x => x.g.ondasPor)) {
  const conta = pm => {
    const evs = lancarMagia(g, pm, { carac: { F: 0, H: 0, R: 400, A: 0 } }, 40);
    return evs.map(e => (e.rolagens || [1]).length);
  };
  const noMin = conta(g.pm), noMax = conta(g.pmMax || g.pm);
  const espMax = Math.min(g.ondasMax || 5, 1 + Math.floor(((g.pmMax || g.pm) - g.pm) / g.ondasPor));
  A.ver(`ondas · ${A.nomeDe(g.id)}`,
        Math.max(...noMin) === 1 && Math.max(...noMax) === espMax,
        `${g.pm}PM → ${Math.max(...noMin)} onda · ${g.pmMax}PM → ${Math.max(...noMax)} (esperado ${espMax})`);
}

// ── veneno ──
for (const { g } of TODAS.filter(x => x.g.veneno)) {
  const evs = lancarMagia(g, g.pm, { carac: { F: 0, H: 0, R: 1, A: 0 } }, 300);
  const pegou = evs.filter(e => e.envenenou).length;
  A.ver(`veneno · ${A.nomeDe(g.id)}`, pegou > 0, `pegou em ${pegou} de 300 contra um alvo de R1`);
  // e depois de pegar, tem de tirar vida todo o turno e dar penalidade
  const { e } = A.lancar({
    seed: 7, politica: () => ({ magia: g, pm: g.pm }),
    a: { carac: { F, H, R: 8, A: 2 } }, b: { carac: { F: 0, H: 0, R: 1, A: 0 }, pv: 40 },
  }, 1);
  if (e.B[0].veneno) {
    const pvAntes = e.B[0].pv, penAntes = e.B[0].penalidade;
    M._c3fimTurno(e.B[0]);
    A.ver(`veneno sangra · ${A.nomeDe(g.id)}`, e.B[0].pv === pvAntes - 1 && penAntes > 0,
          `PV ${pvAntes}→${e.B[0].pv} · penalidade ${penAntes}`);
  }
}

// ── debuffR ──
for (const { g } of TODAS.filter(x => x.g.debuffR)) {
  const evs = [];
  for (let s = 1; s <= 200; s++) {
    const { e, evA } = A.lancar({
      seed: s, politica: () => ({ magia: g, pm: g.pm }),
      a: { carac: { F, H, R: 8, A: 2 } }, b: { carac: { F: 0, H: 0, R: 6, A: 0 }, pv: 200 },
    }, 1);
    if (evA[0] && evA[0].enfraqueceu) evs.push(e.B[0].penalidadeR);
  }
  A.ver(`−R · ${A.nomeDe(g.id)}`, evs.length > 0 && evs.every(v => v === g.debuffR),
        `disparou ${evs.length}/200 · penalidadeR = ${[...new Set(evs)]}`);
}

// ── tirar de combate sem passar pelos PV ──
for (const { g } of TODAS.filter(x => x.g.petrifica || x.g.congela || x.g.destroiAlma)) {
  let saiu = 0, resistiu = 0;
  for (let s = 1; s <= 200; s++) {
    const { evA } = A.lancar({
      seed: s, politica: () => ({ magia: g, pm: g.pm }),
      a: { carac: { F, H, R: 8, A: 2 } }, b: { carac: { F: 0, H: 0, R: 2, A: 0 }, pv: 999 },
    }, 1);
    if (evA[0] && evA[0].fora) saiu++;
    if (evA[0] && evA[0].resistiu) resistiu++;
  }
  A.ver(`tira de combate · ${A.nomeDe(g.id)}`, saiu > 0 && resistiu > 0,
        `saiu ${saiu}/200 · resistiu ${resistiu}/200 (alvo R2, com 999 PV)`);
}

// ── buffs sustentados ──
for (const { g } of TODAS.filter(x => x.g.buffForca || x.g.armadura || x.g.armaduraPorPM || x.g.bonusFD || x.g.buffFuria)) {
  const pm = g.pmMax || g.pm;
  const { e } = A.lancar({
    seed: 3, politica: () => ({ magia: g, pm }),
    a: { carac: { F: 1, H: 1, R: 8, A: 1 } }, b: { carac: { F: 0, H: 0, R: 40, A: 0 } },
  }, 1);
  const c = e.A[0];
  const esperado = g.buffForca ? ['bonusF', g.buffForca]
    : g.armaduraPorPM ? ['bonusA', Math.min(pm, g.armaduraMax || 5)]
    : g.armadura ? ['bonusA', g.armadura]
    : g.bonusFD ? ['bonusFD', g.bonusFD]
    : ['furia', true];
  const [campo, valor] = esperado;
  A.ver(`buff · ${A.nomeDe(g.id)}`, c[campo] === valor,
        `${campo} = ${c[campo]} (esperado ${valor})`);
}

// ── as defensivas que estavam mortas ──
const defensivas = [
  ['invulneravel',   c => c.invulneravel === true],
  ['barreira',       c => c.barreira > 0],
  ['imuneEspiritual',c => c.imuneEspiritual === true],
  ['ocultacao',      c => c.ocultado === true],
  ['esquivaBonus',   c => c.bonusEsquiva > 0],
];
for (const [prop, teste] of defensivas) {
  for (const { g } of TODAS.filter(x => x.g[prop])) {
    const { e } = A.lancar({
      seed: 3, politica: () => ({ magia: g, pm: g.pmMax || g.pm }),
      a: { carac: { F: 1, H: 1, R: 8, A: 1 } }, b: { carac: { F: 0, H: 0, R: 40, A: 0 } },
    }, 1);
    A.ver(`${prop} · ${A.nomeDe(g.id)}`, teste(e.A[0]), JSON.stringify({
      invulneravel: e.A[0].invulneravel, barreira: e.A[0].barreira,
      imune: e.A[0].imuneEspiritual, ocultado: e.A[0].ocultado, esquiva: e.A[0].bonusEsquiva }));
  }
}

// ── drenaPM ──
for (const { g } of TODAS.filter(x => x.g.drenaPM)) {
  let viu = 0;
  for (let s = 1; s <= 100; s++) {
    const { e, evA } = A.lancar({
      seed: s, politica: () => ({ magia: g, pm: g.pm }),
      a: { carac: { F, H, R: 8, A: 2 }, pm: 50 }, b: { carac: { F: 0, H: 0, R: 40, A: 0 }, pm: 50 },
    }, 1);
    if (evA[0] && evA[0].drenou > 0 && e.B[0].pm < 50) viu++;
  }
  A.ver(`rouba PM · ${A.nomeDe(g.id)}`, viu > 0, `roubou em ${viu}/100`);
}

// ── porTurno: tem de cobrar PM todo o turno e cair quando faltar ──
for (const { g } of TODAS.filter(x => x.g.porTurno && x.g.pm > 0)) {
  const { e } = A.lancar({
    seed: 3, politica: () => ({ magia: g, pm: g.pm }),
    a: { carac: { F: 1, H: 9, R: 8, A: 1 }, pm: g.pm + 1 },   // chega para o lançar e um turno
    b: { carac: { F: 0, H: 0, R: 40, A: 0 } },
  }, 1);
  const c = e.A[0], depois = c.pm;
  M._c3fimTurno(c);
  A.ver(`cobra todo o turno · ${A.nomeDe(g.id)}`, c.pm < depois || c.sustentadas.length === 0,
        `PM ${depois} → ${c.pm} · sustentadas ${c.sustentadas.length}`);
}

// ── e as que não têm efeito nenhum tratado ──
const TRATADAS = new Set(['fa','id','pm','pmMax','porTurno','ignoraArmadura','alvoIndefeso',
  'ondasPor','ondasMax','veneno','debuffR','petrifica','congela','destroiAlma','buffForca',
  'buffFuria','armadura','armaduraPorPM','armaduraMax','bonusFD','drenaPM','barreira',
  'invulneravel','imuneEspiritual','ocultacao','esquivaBonus','duracao',
  // as do nivelamento por elemento
  'armaduraDobra','excetoMagia','cura','vorpal','roubaVida','cegueira','bonusFDPorPM','congelaTurnos',
  // As duas que escolhem alvo: a primeira coisa neste combate a olhar
  // para lá de quem está em campo.
  'escolheAlvo','curaAliado']);
const orfas = [];
for (const { g, el, cat } of TODAS)
  for (const k of Object.keys(g))
    if (!TRATADAS.has(k)) orfas.push(`${el}/${cat} ${A.nomeDe(g.id)} → "${k}"`);
A.ver('nenhuma propriedade do catálogo por tratar', orfas.length === 0, orfas.join(' · ') || 'nenhuma');

// ── Relatório ──
const r = A.relatorio();
console.log('\n' + r.linhas.map(l => l[0] + ' ' + l[1] + (l[2] ? '\n         ' + l[2] : '')).join('\n'));
console.log(`\n─────────────────────────────\n${r.ok} passaram · ${r.mau} falharam\n`);
