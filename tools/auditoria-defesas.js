// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS DEFESAS
//
// As outras auditorias nasceram à volta do que ATACA: a auditoria das
// magias percorre o catálogo inteiro a conferir a Força de Ataque, e as
// provas de efeito próprio foram-se escrevendo à medida que cada magia
// ofensiva dava problemas.
//
// Ficaram 15 por olhar, e quase todas defendem. Não estão erradas —
// estão por medir, que é coisa diferente e mais desconfortável: uma
// magia de defesa que não faz nada perde combates em silêncio, sem
// nunca produzir um número errado que salte à vista.
//
// Esta é a casa delas. Uma a uma, e cada uma medida contra o que o seu
// texto promete ao jogador, que é o contrato que interessa.
// ═══════════════════════════════════════════════════════════════════
const A = require('./auditoria-base.js');
const { M } = A;

// A Armadura que o defensor mostra numa Força de Defesa, com o dado
// preso pela semente. É o número que se quer ver dobrar — ou não.
function armaduraNaFD(defensor, elementoDoAtaque, opts) {
  const rng = M._c3rng(77);
  const r = M._c3fd(defensor, rng, Object.assign({ elemento: elementoDoAtaque || null }, opts || {}));
  return { A: r.partes.find(p => p.r === 'A').v, total: r.total, critico: r.critico };
}

// Um defensor de Terra com Armadura 3, para a dobra dar um número
// redondo e a diferença ser impossível de confundir com ruído.
function defensor(extra) {
  const e = M.combate3dtIniciar(
    [{ nome: 'D', elemento: 'Terra', raridade: 'Comum', nivel: 5, seed: 3 }],
    [{ nome: 'A', elemento: 'Fogo',  raridade: 'Comum', nivel: 5, seed: 9 }],
    1, {});
  const d = e.A[0];
  Object.assign(d.ficha, { F: 2, H: 2, R: 4, A: 3 });
  d.pvMax = 20; d.pv = 20;
  Object.assign(d, extra || {});
  return { d, atacante: e.B[0], e };
}

const CASCA = M.MAGIAS['Terra'].defesa.find(g => g.id === 'te_d3');

console.log('\n═══ CASCA DE HELENA (te_d3) ═══');
console.log('  "A pele vira couraça de pedra viva: sua Armadura conta em');
console.log('   dobro contra tudo que não seja magia."   ·   2 PM por turno\n');

// ── 1. O catálogo diz o que o texto diz ──
A.ver('é sustentada e custa 2 PM por turno',
      CASCA.pm === 2 && CASCA.porTurno === true,
      `pm=${CASCA.pm} porTurno=${CASCA.porTurno}`);

// ── 2. Contra um golpe físico, a Armadura dobra ──
{
  const semCasca = armaduraNaFD(defensor().d, null);
  const comCasca = armaduraNaFD(defensor({ armaduraDobrada: true }).d, null);
  A.ver('contra golpe físico, a Armadura conta em dobro',
        comCasca.A === semCasca.A * 2,
        `A ${semCasca.A} → ${comCasca.A}`);
}

// ── 3. Contra magia, NÃO dobra ──
// Esta é a metade do texto que se perde com facilidade. O `excetoMagia`
// do catálogo nunca é lido por ninguém: quem cumpre a promessa é o
// guarda `!opts.elemento` no _c3fd, três ficheiros ao lado. Uma
// propriedade a dizer uma coisa e outra linha a fazê-la é exactamente o
// sítio onde um dia alguém mexe numa e não na outra.
{
  const semCasca = armaduraNaFD(defensor().d, 'Fogo');
  const comCasca = armaduraNaFD(defensor({ armaduraDobrada: true }).d, 'Fogo');
  A.ver('contra MAGIA, a Armadura não dobra',
        comCasca.A === semCasca.A,
        `A ${semCasca.A} → ${comCasca.A} (o texto diz "tudo que não seja magia")`);
}

// ── 4. Dobrar zero é zero ──
// Uma Armadura 0 com a Casca de pé não pode render um ponto fantasma.
{
  const nu = defensor({ armaduraDobrada: true });
  nu.d.ficha.A = 0;
  const r = armaduraNaFD(nu.d, null);
  A.ver('com Armadura 0, a Casca não inventa armadura nenhuma',
        r.A === 0, `A = ${r.A}`);
}

// ── 5. A magia que ignora Armadura passa por cima dela ──
// Metade do catálogo ofensivo tem `ignoraArmadura`. Se a Casca a
// devolvesse, essas magias deixavam de servir para o que existem.
{
  const r = armaduraNaFD(defensor({ armaduraDobrada: true }).d, 'Fogo', { ignoraArmadura: true });
  A.ver('uma magia que ignora Armadura continua a ignorá-la',
        r.A === 0, `A = ${r.A}`);
}

// ── 6. O crítico dobra a Armadura. Com a Casca, dobra duas vezes ──
// Não é defeito: são duas dobras de origens diferentes, e o manual dá as
// duas. Fica escrito porque é a interacção mais forte que a Casca tem, e
// quem a vir em jogo — Armadura 3 a valer 12 — vai achar que é erro.
{
  // O crítico é o dado 6; procuro uma semente que o dê.
  let semente = 1, r = null;
  for (; semente < 400; semente++) {
    const rng = M._c3rng(semente);
    const t = M._c3fd(defensor({ armaduraDobrada: true }).d, rng, { elemento: null });
    if (t.critico) { r = t; break; }
  }
  const base = 3;
  A.ver('num crítico, a dobra da Casca e a do crítico somam-se (×4)',
        !!r && r.partes.find(p => p.r === 'A').v === base * 4,
        r ? `A ${base} → ${r.partes.find(p => p.r === 'A').v}` : 'não saiu crítico em 400 sementes');
}

// ── 7. Em jogo: a Casca levanta-se e o registo di-lo ──
{
  const { evA } = A.lancar({
    seed: 5,
    politica: () => ({ magia: CASCA, pm: 2 }),
    a: { carac: { F: 2, H: 4, R: 4, A: 3 }, elemento: 'Terra',
         magias: { ataque: CASCA, forte: CASCA, defesa: CASCA } },
    b: { carac: { F: 3, H: 1, R: 20, A: 0 } },
  }, 1);
  const ev = evA.find(v => v.magia === 'te_d3');
  A.ver('lançada em jogo, marca a dobra no registo',
        !!ev && ev.armaduraDobrou === true,
        ev ? Object.keys(ev).filter(k => /armadura|caiu|pm/i.test(k)).join(', ') : 'não foi lançada');
}

/* ── 8. Sustentada: cobra todo o turno, e cai quando a bolsa seca ──

   É o que separa esta magia de um bónus de graça: sem a cobrança, 2 PM
   compravam Armadura a dobrar até ao fim do combate.

   A política lança UMA vez e nunca mais. A primeira versão desta prova
   voltava a lançá-la assim que a via cair, e dava falha a acusar o motor
   de não a largar — quando o motor a largava certo e era o teste que a
   punha de pé outra vez no turno seguinte. */
{
  let lancou = false;
  const e = A.duelo({
    seed: 11,
    politica: () => { if (lancou) return {}; lancou = true; return { magia: CASCA, pm: 2 }; },
    a: { carac: { F: 2, H: 4, R: 4, A: 3 }, elemento: 'Terra', pm: 5, pmMax: 5,
         magias: { ataque: CASCA, forte: CASCA, defesa: CASCA } },
    b: { carac: { F: 1, H: 1, R: 40, A: 0 } },
  });
  const pms = [e.A[0].pm], dobras = [];
  for (let i = 0; i < 5 && !e.acabou; i++) {
    M.combate3dtTurno(e);
    pms.push(e.A[0].pm);
    dobras.push(e.A[0].armaduraDobrada ? 'de pé' : 'caída');
  }
  A.ver('cobra PM todo o turno, e não se paga de graça',
        pms[1] < pms[0],
        'PM: ' + pms.join(' → ') + '  (o primeiro é antes de tudo)');
  A.ver('quando a bolsa seca, a dobra cai',
        !e.A[0].armaduraDobrada && e.A[0].sustentadas.length === 0,
        dobras.join(' → '));
}

/* ── 8b. "2 PM por turno" é mesmo 2 PM por turno? ──

   O primeiro turno parece custar o dobro: 2 para a levantar e 2 na
   cobrança do fim do mesmo turno. Fica com ar de cobrança a dobrar, e
   não é — a cobrança do fim de um turno paga o turno SEGUINTE. Quem
   levanta a Casca com 20 PM tem-na de pé cerca de dez turnos, que é
   exactamente o que o texto vende.

   Vale a pena estar escrito: um dia alguém olha para o "4 PM no
   primeiro turno", chama-lhe erro, tira a cobrança do turno de estreia
   — e a magia passa a durar um turno a mais do que devia, de graça. */
{
  const bolsa = 20;
  let lancou = false;
  const e = A.duelo({
    seed: 11,
    politica: () => { if (lancou) return {}; lancou = true; return { magia: CASCA, pm: 2 }; },
    a: { carac: { F: 2, H: 4, R: 4, A: 3 }, elemento: 'Terra', pm: bolsa, pmMax: bolsa,
         magias: { ataque: CASCA, forte: CASCA, defesa: CASCA } },
    b: { carac: { F: 1, H: 1, R: 999, A: 0 } },
  });
  let dePe = 0;
  for (let i = 0; i < 30 && !e.acabou; i++) {
    M.combate3dtTurno(e);
    if (e.A[0].armaduraDobrada) dePe++;
  }
  const esperado = bolsa / CASCA.pm;             // 20 PM ÷ 2 PM por turno
  A.ver(`${bolsa} PM compram cerca de ${esperado} turnos de dobra`,
        Math.abs(dePe - esperado) <= 1,
        `ficou de pé ${dePe} turnos`);
}

// ── 9. Vale a pena? ──
// A prova de que ela FAZ alguma coisa onde interessa: o mesmo defensor,
// os mesmos ataques, com e sem a Casca de pé. Não é balanceamento — é
// só confirmar que a diferença existe e tem o sinal certo.
{
  const golpes = 600;
  const conta = (comCasca) => {
    let dano = 0;
    for (let s = 1; s <= golpes; s++) {
      const { d, atacante } = defensor(comCasca ? { armaduraDobrada: true } : {});
      Object.assign(atacante.ficha, { F: 4, H: 3, R: 4, A: 1 });
      const rng = M._c3rng(s);
      const ev = {};
      dano += M._c3resolver(atacante, d, null, 0, rng, ev, {}) || 0;
    }
    return dano / golpes;
  };
  const sem = conta(false), com = conta(true);
  A.ver('na prática, aguenta-se mais com ela de pé',
        com < sem,
        `dano médio por golpe: ${sem.toFixed(2)} sem → ${com.toFixed(2)} com  (${((1 - com / sem) * 100).toFixed(0)}% menos)`);
}

// ── Relatório ──
const { ok, mau, linhas } = A.relatorio();
console.log('');
for (const [tag, nome, det] of linhas) console.log(tag + ' ' + nome + (det ? '   · ' + det : ''));
console.log('\n─────────────────────────────');
console.log(`${ok} passaram · ${mau} falharam`);
