// ═══════════════════════════════════════════════════════════════════
// AS DUAS QUE NINGUÉM TINHA OLHADO
//
/* Sobre quem são estas provas. */
// @cobre toque_ardente brecha_conhecida
//
// De setenta e cinco itens do catálogo, estes dois não tinham uma única
// menção em toda a suíte — nem no relatório, nem no código dos testes.
// Não apareciam como buraco porque a ferramenta que conta a cobertura
// estava a mentir sobre si própria; quando ela passou a dizer a verdade,
// sobraram estes.
//
// São os dois de famílias opostas e ambos mexem em contas que o resto do
// combate usa a toda a hora — o Toque Ardente troca a fórmula do ataque
// inteira, e a Brecha Conhecida entra na Habilidade que o adversário usa
// contra nós, que é lida em três sítios diferentes.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

const TOQUE  = { id: 'toque_ardente',    ...M.VANTAGENS.toque_ardente };
const BRECHA = { id: 'brecha_conhecida', ...M.DESVANTAGENS.brecha_conhecida };

console.log('\n═══ TOQUE ARDENTE (vantagem) ═══');
console.log('  "Ataque = Armadura + 1d + os PM gastos, sem contar a Habilidade."\n');

/* A Força de Ataque de um toque, com o dado preso pela semente. É a
   única forma de ataque do jogo que não passa pela Habilidade nem pela
   Força, e por isso a conta tem de ser olhada à parte. */
function faToque(carac, pmGastos) {
  const e = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac, vant: TOQUE },
    b: { carac: { F: 1, H: 1, R: 99, A: 0 } } });
  const r = M._c3fa(e.A[0], null, 0, M._c3rng(41),
                    { alvo: e.B[0], toque: true, toquePM: pmGastos });
  const parte = (rot) => { const p = r.partes.find(x => x.r === rot); return p ? p.v : null; };
  return { total: r.total, A: parte('A'), PM: parte('PM'), dado: r.dado, critico: r.critico };
}
function faComum(carac) {
  const e = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac, vant: TOQUE },
    b: { carac: { F: 1, H: 1, R: 99, A: 0 } } });
  return M._c3fa(e.A[0], null, 0, M._c3rng(41), { alvo: e.B[0] }).total;
}

// ── 1. O catálogo ──
A.ver('custa 1 ponto e declara o toque de energia',
      TOQUE.custo === 1 && TOQUE.toqueEnergia === true,
      `custo=${TOQUE.custo} toqueEnergia=${TOQUE.toqueEnergia}`);

// ── 2. A conta é Armadura + dado + PM, e mais nada ──
{
  const carac = { F: 5, H: 6, R: 8, A: 3 };
  const r = faToque(carac, 2);
  A.ver('a Força de Ataque é Armadura + 1d + os PM gastos',
        r.total === r.A + r.dado + r.PM && r.A === carac.A && r.PM === 2,
        `A${r.A} + 🎲${r.dado} + ${r.PM} PM = ${r.total}`);
}

/* ── 3. E a Habilidade e a Força ficam de fora, mesmo altas ──

   É o que a vantagem existe para fazer: dar uma saída a quem tem
   Armadura alta e Força baixa. Se a Habilidade entrasse por engano, o
   toque passava a ser bom para toda a gente e a vantagem deixava de
   ter forma. */
{
  const fraco = faToque({ F: 0, H: 0, R: 8, A: 4 }, 0);
  const forte = faToque({ F: 9, H: 9, R: 8, A: 4 }, 0);
  A.ver('nem a Habilidade nem a Força entram na conta',
        fraco.total === forte.total,
        `F0 H0 A4 → ${fraco.total} · F9 H9 A4 → ${forte.total}`);
}

// ── 4. Serve a quem devia servir ──
{
  const carac = { F: 1, H: 1, R: 8, A: 5 };
  const comToque = faToque(carac, 3).total, semToque = faComum(carac);
  A.ver('a quem tem Armadura alta e Força baixa, bate mais',
        comToque > semToque, `toque ${comToque} · murro ${semToque}`);

  const outro = { F: 7, H: 7, R: 8, A: 1 };
  A.ver('e a quem tem o contrário, bate menos — como deve',
        faToque(outro, 1).total < faComum(outro),
        `toque ${faToque(outro, 1).total} · murro ${faComum(outro)}`);
}

/* ── 5. O crítico dobra a Armadura, e não os PM ──

   O manual manda dobrar Força, Armadura ou PdF num acerto crítico. Os
   PM gastos não são nenhuma dessas coisas — são combustível — e por
   isso ficam de fora da dobra. */
{
  let critico = null;
  for (let s = 1; s < 400 && !critico; s++) {
    const e = A.duelo({ seed: 3, politica: () => ({}),
      a: { carac: { F: 1, H: 1, R: 8, A: 3 }, vant: TOQUE },
      b: { carac: { F: 1, H: 1, R: 99, A: 0 } } });
    const r = M._c3fa(e.A[0], null, 0, M._c3rng(s), { alvo: e.B[0], toque: true, toquePM: 4 });
    if (r.critico) critico = r;
  }
  const pA = critico && critico.partes.find(x => x.r === 'A');
  const pPM = critico && critico.partes.find(x => x.r === 'PM');
  A.ver('num crítico dobra a Armadura, e os PM ficam como estão',
        !!critico && pA.v === 3 * 2 && pPM.v === 4,
        critico ? `A 3 → ${pA.v} · PM ${pPM.v} (não dobrou)` : 'sem crítico em 400 sementes');
}

/* ── 6. Os PM que se metem lá são limitados pela Armadura ──

   O tecto está no turno: `Math.min(acao.toquePM, _c3(l.c,'A'), PM
   disponível)`. Sem ele, quem tivesse a bolsa cheia metia trinta PM num
   toque e a Armadura deixava de ser o que mede a magia. */
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A')
      ? { toque: true, toquePM: 99, magia: null, pm: 0 } : {},
    a: { carac: { F: 1, H: 1, R: 8, A: 3 }, vant: TOQUE, pm: 200, pmMax: 200 },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  M.combate3dtTurno(e);
  const ev = e.eventos.find(v => v.lado === 'A' && v.toque);
  A.ver('não se metem mais PM do que a Armadura permite',
        !!ev && ev.pm <= 3, ev ? `pediu 99, gastou ${ev.pm} com Armadura 3` : 'não usou o toque');
}

// ── 7. A política só o escolhe a quem ele serve ──
{
  const escolhe = (carac) => {
    const e = A.duelo({ seed: 3,
      a: { carac, vant: TOQUE, pm: 40, pmMax: 40,
           magias: { ataque: null, forte: null, defesa: null } },
      b: { carac: { F: 2, H: 2, R: 20, A: 1 } } });
    return !!M.politica3dt(e.A[0], e.B[0], { meu: e.A, dele: e.B }).toque;
  };
  A.ver('a política usa-o com Armadura alta e não com Armadura baixa',
        escolhe({ F: 1, H: 1, R: 8, A: 6 }) && !escolhe({ F: 7, H: 7, R: 8, A: 1 }),
        `A6 F1 H1 → usa · A1 F7 H7 → não usa`);
}

console.log('\n═══ BRECHA CONHECIDA (desvantagem) ═══');
console.log('  "O adversário ganha Habilidade +1 contra você, no ataque');
console.log('   dele e na sua esquiva."\n');

// ── 8. O catálogo ──
A.ver('rende 1 ponto e dá Habilidade ao inimigo',
      BRECHA.custo === -1 && BRECHA.inimigoGanhaH === 1,
      `custo=${BRECHA.custo} inimigoGanhaH=${BRECHA.inimigoGanhaH}`);

/* ── 9. AS DUAS METADES DA FRASE, UMA A UMA ──

   O inimigoGanhaH entra no _c3hAtk, que é lido em três sítios: a
   parcela H da Força de Ataque, o teste de esquiva, e a pergunta de se
   a esquiva é sequer possível. A frase promete duas coisas — o ataque
   dele e a minha esquiva — e são as três leituras que as cumprem. */
function comBrecha(temBrecha) {
  const e = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: { F: 3, H: 4, R: 8, A: 1 } },
    /* O defensor tem de PODER esquivar para se medir o efeito na
       esquiva. Com Habilidade 3 contra um atacante de 4 a conta dá
       negativo e o motor nem deixa tentar — a primeira versao desta
       prova pedia menos esquivas onde nao havia esquiva nenhuma. */
    b: { carac: { F: 2, H: 6, R: 20, A: 1 },
         desv: temBrecha ? BRECHA : null } });
  return { atacante: e.A[0], defensor: e.B[0] };
}
{
  const sem = comBrecha(false), com = comBrecha(true);
  const fa = (p) => M._c3fa(p.atacante, null, 0, M._c3rng(41), { alvo: p.defensor }).total;
  A.ver('o adversário bate com +1 contra quem tem a Brecha',
        fa(com) === fa(sem) + 1, `FA ${fa(sem)} → ${fa(com)}`);

  const pen = (p) => M._c3hAtk(p.atacante, p.defensor);
  A.ver('e a esquiva de quem a tem fica 1 mais difícil',
        pen(com) === pen(sem) + 1,
        `penalidade na esquiva ${pen(sem)} → ${pen(com)}`);
}

// ── 10. E isso vê-se em golpes de verdade ──
{
  const conta = (temBrecha) => {
    let dano = 0, esquivou = 0;
    for (let s = 1; s <= 1200; s++) {
      const p = comBrecha(temBrecha);
      const ev = {};
      dano += M._c3resolver(p.atacante, p.defensor, null, 0, M._c3rng(s), ev, {}) || 0;
      if (ev.esquivou) esquivou++;
    }
    return { dano, esquivou };
  };
  const sem = conta(false), com = conta(true);
  A.ver('com a Brecha leva-se mais dano',
        com.dano > sem.dano, `${sem.dano} → ${com.dano} em 1200 golpes`);
  A.ver('e escapa-se menos vezes',
        com.esquivou < sem.esquivou, `${sem.esquivou} → ${com.esquivou} esquivas`);
}

/* ── 11. É uma desvantagem: rende pontos ──

   O custo negativo é o que a paga. Uma desvantagem que não rendesse
   nada seria só um castigo, e a ficha não a daria a ninguém de bom
   grado — é o preço dela que a põe em jogo. */
A.ver('rende ponto a quem a carrega, como toda a desvantagem',
      BRECHA.custo < 0 && Object.values(M.DESVANTAGENS).every(d => d.custo <= 0),
      `custo=${BRECHA.custo} · todas as desvantagens rendem ou são neutras`);

// ── Relatório ──
const { ok, mau, linhas } = A.relatorio();
console.log('');
for (const [tag, nome, det] of linhas) console.log(tag + ' ' + nome + (det ? '   · ' + det : ''));
console.log('\n─────────────────────────────');
console.log(`${ok} passaram · ${mau} falharam`);
