// ═══════════════════════════════════════════════════════════════════
// O QUE ACUMULA, E ATÉ ONDE
//
// Depois de o Véu de Correntes ter mostrado que relançar uma magia
// sustentada a empilhava em cima de si própria, a pergunta certa deixou
// de ser "está corrigido?" e passou a ser "o que MAIS acumula, e isso
// devia acumular?".
//
//   node tools/acumulacoes.js
//
// Isto percorre todos os sítios do motor que somam a um campo do
// combatente em vez de o substituírem, e mede até onde cada um chega
// com o jogador a insistir. Não julga: mede, e diz onde há travão.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const acha = (id) => {
  for (const el of Object.keys(M.MAGIAS))
    for (const cat of ['ataque', 'forte', 'defesa'])
      for (const g of (M.MAGIAS[el][cat] || [])) if (g.id === id) return { g, el };
  for (const cat of ['ataque', 'forte', 'defesa'])
    for (const g of (M.MAGIAS_UNIVERSAIS[cat] || [])) if (g.id === id) return { g, el: 'Universal' };
  return null;
};
const nome = (id) => global.__PT['mag.' + id + '.nome'] || id;

/* Insiste na mesma magia N turnos e devolve o que o campo fez.
   O alvo é um saco de pancada com vida infinita, para a luta não acabar
   antes de a conta ficar interessante. */
function insistir(id, pm, campo, turnos) {
  const f = acha(id); if (!f) return null;
  const g = f.g;
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: g, pm } : {},
    a: { carac: { F: 2, H: 2, R: 20, A: 2 }, elemento: f.el === 'Universal' ? 'Fogo' : f.el,
         pm: 400, pmMax: 400, magias: { ataque: g, forte: g, defesa: g } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, pv: 9999, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < turnos && !e.acabou; i++) {
    M.combate3dtTurno(e);
    trilho.push(e.A[0][campo] || 0);
  }
  return { trilho, gastou: 400 - e.A[0].pm, sustentadas: e.A[0].sustentadas.length };
}

// O mesmo, mas para um efeito que se põe NO ALVO.
function insistirNoAlvo(id, pm, campo, turnos) {
  const f = acha(id); if (!f) return null;
  const g = f.g;
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: g, pm } : {},
    a: { carac: { F: 6, H: 6, R: 20, A: 2 }, elemento: f.el, pm: 400, pmMax: 400,
         iniciativa: 99, magias: { ataque: g, forte: g, defesa: g } },
    b: { carac: { F: 1, H: 0, R: 0, A: 0 }, pv: 9999, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < turnos && !e.acabou; i++) {
    M.combate3dtTurno(e);
    trilho.push(e.B[0][campo] || 0);
  }
  return { trilho };
}

const linhas = [];
const conta = (rot, id, r, veredicto) => {
  if (!r) { linhas.push(['?', rot, 'não encontrada']); return; }
  const t = r.trilho;
  const subiu = t[t.length - 1] > t[0];
  linhas.push([subiu ? 'SOBE' : 'trava', rot + ' (' + id + ')',
               t.join(' → ') + (r.gastou != null ? '   [' + r.gastou + ' PM]' : ''), veredicto]);
};

console.log('\n═══ O QUE ACUMULA, COM O JOGADOR A INSISTIR ═══\n');

// ── As sustentadas, depois da correcção ──
conta('Casulo de Marés',     'ag_d1', insistir('ag_d1', 5, 'bonusA', 5),
      'travado: relançar substitui');
conta('Muralha Primordial',  'te_d1', insistir('te_d1', 5, 'bonusA', 5),
      'travado: relançar substitui');
conta('Pele de Pedra',       'te_d2', insistir('te_d2', 2, 'bonusA', 5),
      'travado: relançar substitui');
conta('Véu de Correntes',    'vt_d1', insistir('vt_d1', 5, 'bonusFD', 5),
      'travado: relançar substitui');
conta('Vento Contrário',     'vt_d3', insistir('vt_d3', 5, 'bonusFD', 5),
      'travado: relançar substitui');
conta('Garras de Raiz',      'te_a1', insistir('te_a1', 5, 'bonusF', 5),
      'travado: relançar substitui');

// ── As que somam por fora das sustentadas ──
conta('Manto de Penumbra',   'so_d1', insistir('so_d1', 5, 'barreira', 6), null);
conta('Correntes Desviantes','vt_d2', insistir('vt_d2', 5, 'bonusEsquiva', 6), null);

// ── Os efeitos postos no alvo ──
conta('Sopro Salgado (veneno)', 'ag_a3', insistirNoAlvo('ag_a3', 3, 'penalidade', 6),
      'travado: quem já está envenenado não fica mais');
conta('Véu de Cegueira',        'so_a4', insistirNoAlvo('so_a4', 4, 'cegoEsquiva', 6),
      'travado: quem já está cego não fica mais');
conta('Dor persistente',        'ag_a1', insistirNoAlvo('ag_a1', 5, 'penalidadeR', 6),
      'ACUMULA de propósito — o manual manda');

const larg = Math.max(...linhas.map(l => l[1].length));
for (const [tag, rot, det, ver] of linhas) {
  console.log('  ' + tag.padStart(5) + '  ' + rot.padEnd(larg) + '  ' + det);
  if (ver) console.log('         ' + ' '.repeat(larg) + '  ' + ver);
}
console.log('');
