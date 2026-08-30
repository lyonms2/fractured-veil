// ═══════════════════════════════════════════════════════════════════
// AUDITORIA DAS DEFESAS
//
// As outras auditorias nasceram à volta do que ATACA: a auditoria das
// magias percorre o catálogo inteiro a conferir a Força de Ataque, e as
// provas de efeito próprio foram-se escrevendo à medida que cada magia
// ofensiva dava problemas.
//
// Ficaram 15 por olhar. Não estão erradas — estão por medir, que é coisa
// diferente e mais desconfortável: uma magia que não faz dano nenhum
// ganha ou perde combates em silêncio, sem nunca produzir um número
// errado que salte à vista.
//
// A maioria defende, e daí o nome. Entram aqui também as ofensivas que
// não rolam Força de Ataque — a Prisão de Gelo tira do combate por um
// teste de Resistência, e a auditoria das fórmulas nunca lhe pôde tocar
// porque fórmula é coisa que ela não tem.
//
// Esta é a casa delas. Uma a uma, cada uma medida contra o que o seu
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

// ═══════════════════════════════════════════════════════════════════
const GELO = M.MAGIAS['Água'].forte.find(g => g.id === 'ag_f3');

console.log('\n═══ PRISÃO DE GELO (ag_f3) ═══');
console.log('  "Fios de gelo correm pelo chão e sobem pelo alvo.');
console.log('   Quem não resistir vira estátua."   ·   10 PM\n');

/* Lança a Prisão contra um alvo com a Resistência que eu mandar, e conta
   quantas vezes ele saiu de combate. É a única forma de medir uma magia
   que não faz dano: o que ela produz é uma moeda ao ar.

   O `n` que volta é o número de LANÇAMENTOS, não de voltas do ciclo. Nem
   toda a volta produz um: o alvo também joga, e com iniciativa alta pode
   derrubar quem ia lançar antes de a magia sair. A primeira versão disto
   dividia pelas voltas e dava 49% onde a resposta era 100% — não porque
   a magia falhasse, mas porque metade das vezes nem chegou a ser lançada.

   O `mexer` é para o que o duelo não sabe montar: o `imuneEspiritual`
   não vem da ficha nem de uma vantagem, é uma bandeira que outra magia
   levanta no combatente. Pô-la em `b:` não fazia nada — o arruma da base
   só copia os campos que conhece, e o meu ficava pelo caminho em
   silêncio. */
function prisao(R, voltas, mexer, carac) {
  let fora = 0, resistiu = 0, imune = 0, danoTotal = 0, lancamentos = 0;
  const testes = [];
  for (let s = 1; s <= voltas; s++) {
    const e = A.duelo({
      seed: s,
      politica: () => ({ magia: GELO, pm: 10 }),
      a: { carac: { F: 2, H: 9, R: 3, A: 1 }, elemento: 'Água', pm: 40, pmMax: 40,
           iniciativa: 99,           // quem lança age sempre primeiro
           magias: { ataque: GELO, forte: GELO, defesa: GELO } },
      b: { carac: carac || { F: 2, H: 0, R, A: 1 }, pv: 200, iniciativa: 0 },
    });
    if (mexer) mexer(e.B[0]);
    M.combate3dtTurno(e);
    const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'ag_f3');
    if (!ev) continue;
    lancamentos++;
    if (ev.fora) fora++;
    if (ev.resistiu) resistiu++;
    if (ev.imunizou) imune++;
    danoTotal += (ev.dano || 0);
    const tf = (ev.testes || []).find(x => x.rotulo === 'fora');
    if (tf) testes.push(tf);
  }
  return { fora, resistiu, imune, danoTotal, testes, n: lancamentos, voltas };
}

// ── 1. O que o catálogo declara ──
A.ver('custa 10 PM e não tem fórmula de ataque',
      GELO.pm === 10 && !GELO.fa && GELO.congela === true,
      `pm=${GELO.pm} fa=${GELO.fa ? 'sim' : 'não'} congela=${GELO.congela}`);

// ── 2. Não é dano: é um teste e acabou ──
{
  const r = prisao(3, 300);
  A.ver('nunca tira um único ponto de vida',
        r.danoTotal === 0, `dano somado em ${r.n} lançamentos: ${r.danoTotal}`);
}

// ── 3. Quem falha sai de combate — de verdade, não só no evento ──
{
  const e = A.duelo({
    seed: 4,
    politica: () => ({ magia: GELO, pm: 10 }),
    a: { carac: { F: 2, H: 3, R: 3, A: 1 }, elemento: 'Água', pm: 40, pmMax: 40,
         magias: { ataque: GELO, forte: GELO, defesa: GELO } },
    b: { carac: { F: 2, H: 0, R: 0, A: 1 }, pv: 200, iniciativa: 0 },  // R 0: não resiste
  });
  M.combate3dtTurno(e);
  const alvo = e.B[0];
  /* A vida fica INTACTA: os 200 com que entrou. Comparar com o pvMax não
     servia — um alvo de Resistência 0 tem pvMax 0, e eu dei-lhe os 200 à
     mão precisamente para se ver que a magia não lhes toca. */
  A.ver('quem não resiste sai de combate, sem perder um ponto de vida',
        alvo.fora === true && alvo.vivo === false && alvo.pv === 200,
        `fora=${alvo.fora} vivo=${alvo.vivo} pv=${alvo.pv} (entrou com 200)`);
}

// ── 4. Quem resiste não perde nada ──
{
  const r = prisao(5, 400);
  A.ver('quem resiste fica exactamente como estava',
        r.resistiu > 0 && r.fora >= 0 && r.resistiu + r.fora === r.n,
        `${r.resistiu} resistiram · ${r.fora} saíram · ${r.n} lançamentos`);
}

/* ── 5. NENHUMA Resistência põe alguém a salvo ──

   O manual manda que um 6 falhe sempre, por mais alta que seja a
   característica. Numa magia que tira do combate sem passar pelos PV,
   isso quer dizer que um avatar com Resistência 20 continua a ter uma
   hipótese em seis de virar estátua a cada lançamento.

   É a regra mais consequente do jogo inteiro e a mais fácil de perder
   numa refactorização: basta alguém escrever `d <= valor` sem o `d !== 6`
   e a magia deixa de funcionar contra metade do bestiário. */
{
  const r = prisao(20, 600);
  const pc = r.fora / r.n;
  A.ver('com Resistência 20, ainda sai de combate ~1 em 6',
        Math.abs(pc - 1 / 6) < 0.05,
        `saiu ${r.fora} de ${r.n} = ${(pc * 100).toFixed(1)}%  (o 6 falha sempre)`);
  A.ver('e o registo marca esse 6 como sendo o 6',
        r.testes.some(x => x.seis === true),
        `${r.testes.filter(x => x.seis).length} testes marcados com o seis`);
}

// ── 6. Quanto mais Resistência, mais se escapa ──
// A conta do manual: sai quem tirar 6, e quem tirar mais do que a R.
{
  const linhas = [];
  let certos = 0;
  for (const R of [1, 2, 3, 4, 5]) {
    const r = prisao(R, 600);
    const esperado = (1 + Math.max(0, 5 - R)) / 6;
    const obtido = r.fora / r.n;
    if (Math.abs(obtido - esperado) < 0.05) certos++;
    linhas.push(`R${R} ${(obtido * 100).toFixed(0)}%~${(esperado * 100).toFixed(0)}%`);
  }
  A.ver('a hipótese de sair segue a Resistência, como o manual manda',
        certos === 5, linhas.join('  '));
}

// ── 7. A Égide Mental fecha a porta ──
// so_d2, imuneEspiritual: "petrificar/congelar não pega". É a única
// defesa absoluta do jogo, e uma defesa absoluta que falhe é pior do
// que não existir.
{
  const r = prisao(0, 200, c => { c.imuneEspiritual = true; });
  A.ver('quem tem a alma fechada não vira estátua nunca',
        r.fora === 0, `saiu ${r.fora} de ${r.n} · imunizou ${r.imune}`);
}

// ── 8. Não se esquiva de uma Prisão de Gelo ──
// Ela não tem Força de Ataque: não passa pelo caminho do golpe, e por
// isso não há reacção nenhuma a fazer. Um alvo com Habilidade alta não
// pode ganhar de borla uma saída que a magia não lhe dá.
{
  const r = prisao(0, 300, null, { F: 2, H: 8, R: 0, A: 1 });
  A.ver('Habilidade alta não dá esquiva contra ela',
        r.fora === r.n, `saiu ${r.fora} de ${r.n} com Habilidade 8`);
}

// ── 9. Tirar o último ganha a batalha ──
{
  const e = A.duelo({
    seed: 7,
    politica: () => ({ magia: GELO, pm: 10 }),
    a: { carac: { F: 2, H: 3, R: 3, A: 1 }, elemento: 'Água', pm: 40, pmMax: 40,
         magias: { ataque: GELO, forte: GELO, defesa: GELO } },
    b: { carac: { F: 2, H: 0, R: 0, A: 1 }, pv: 200 },
    bBanco: { pv: 0 },
  });
  e.B.forEach((c, i) => { if (i > 0) { c.vivo = false; c.pv = 0; } });
  M.combate3dtTurno(e);
  const r = M.combate3dtResultado(e);
  A.ver('tirar o último do outro lado ganha a batalha',
        r.vencedor === 'A', `vencedor: ${r.vencedor}`);
}

// ── 10. Com banco, entra o seguinte ──
{
  const e = A.duelo({
    seed: 9,
    politica: () => ({ magia: GELO, pm: 10 }),
    a: { carac: { F: 2, H: 3, R: 3, A: 1 }, elemento: 'Água', pm: 40, pmMax: 40,
         magias: { ataque: GELO, forte: GELO, defesa: GELO } },
    b: { carac: { F: 2, H: 0, R: 0, A: 1 }, pv: 200 },
    bBanco: { carac: { F: 2, H: 2, R: 4, A: 1 }, pv: 200 },
  });
  M.combate3dtTurno(e);
  A.ver('o companheiro do banco toma o lugar da estátua',
        e.B[0].fora === true && e.B[e.ativoB] && e.B[e.ativoB].vivo,
        `ativoB=${e.ativoB} vivo=${e.B[e.ativoB] ? e.B[e.ativoB].vivo : '—'}`);
}

// ── 11. Precisa de Habilidade 2 para caber no tecto ──
// O tecto é H×5. Dez PM não são para toda a gente, e é isso que segura
// uma magia que tira do combate por uma moeda ao ar.
A.ver('só entra na ficha de quem tem Habilidade 2 ou mais',
      Math.ceil(GELO.pm / 5) === 2, `precisa de H${Math.ceil(GELO.pm / 5)}`);

// ═══════════════════════════════════════════════════════════════════
const CASULO = M.MAGIAS['Água'].defesa.find(g => g.id === 'ag_d1');

console.log('\n═══ CASULO DE MARÉS (ag_d1) ═══');
console.log('  "Uma concha de água viva se fecha ao seu redor."   ·   1 a 5 PM por turno\n');

/* Levanta o Casulo com os PM que eu mandar e devolve o combatente já
   com o efeito de pé. É uma magia de escala: o que ela dá depende do
   que se lhe deu, e é isso que há para medir. */
function comCasulo(pm) {
  const e = A.duelo({
    seed: 3,
    politica: () => ({ magia: CASULO, pm }),
    a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água', pm: 60, pmMax: 60,
         magias: { ataque: CASULO, forte: CASULO, defesa: CASULO } },
    b: { carac: { F: 1, H: 0, R: 99, A: 0 }, iniciativa: 0 },
  });
  M.combate3dtTurno(e);
  return e.A[0];
}

// ── 1. O catálogo ──
A.ver('escala de 1 a 5 PM, e cobra por turno',
      CASULO.pm === 1 && CASULO.pmMax === 5 && CASULO.porTurno === true
      && CASULO.armaduraPorPM === 1 && CASULO.armaduraMax === 5,
      `pm=${CASULO.pm}–${CASULO.pmMax} porTurno=${CASULO.porTurno} ` +
      `armaduraPorPM=${CASULO.armaduraPorPM} máx=${CASULO.armaduraMax}`);

// ── 2. Um ponto de Armadura por cada PM ──
{
  const medidas = [1, 2, 3, 4, 5].map(pm => ({ pm, bonus: comCasulo(pm).bonusA }));
  A.ver('cada PM investido vale exactamente 1 de Armadura',
        medidas.every(m => m.bonus === m.pm),
        medidas.map(m => `${m.pm}PM→+${m.bonus}`).join('  '));
}

/* ── 3. O tecto dos 5 segura, mesmo forçando ──

   O pmMax já limita pela porta da frente. Isto prova a outra tranca — a
   que fica no motor — porque são duas e podem divergir.

   A primeira versão desta prova só olhava para UM lançamento, e por isso
   dizia uma meia-verdade: o tecto segurava por lançamento e não segurava
   ao todo. Relançar a magia empilhava-a em cima de si própria e o Casulo
   ia a +10, +15, +20. Está corrigido no motor, e a prova agora pergunta
   as duas coisas. */
{
  const c = comCasulo(9);
  A.ver('não passa de +5 de Armadura, por mais PM que se dê',
        c.bonusA <= 5, `9 PM → +${c.bonusA}`);

  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: CASULO, pm: 5 } : {},
    a: { carac: { F: 2, H: 4, R: 20, A: 2 }, elemento: 'Água', pm: 200, pmMax: 200,
         magias: { ataque: CASULO, forte: CASULO, defesa: CASULO } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < 4; i++) { M.combate3dtTurno(e); trilho.push('+' + e.A[0].bonusA); }
  A.ver('e relançá-lo quatro vezes continua a dar +5, não +20',
        e.A[0].bonusA === 5 && e.A[0].sustentadas.length === 1,
        trilho.join(' → ') + `  ·  ${e.A[0].sustentadas.length} concha(s) de pé`);
}

// ── 4. A Armadura extra aparece mesmo na Defesa ──
{
  const nu = comCasulo(0), grosso = comCasulo(4);
  const a = armaduraNaFD(nu, null).A, b = armaduraNaFD(grosso, null).A;
  A.ver('a concha entra na conta da Força de Defesa',
        b === a + 4, `A ${a} → ${b}`);
}

/* ── 5. É Armadura de verdade, com o que isso traz de bom e de mau ──

   Ao contrário da Casca de Helena, esta serve TAMBÉM contra magia: não
   é uma dobra condicional, é Armadura a mais. Em troca, tudo o que
   costuma passar por cima de Armadura passa por cima dela — e é assim
   que deve ser, senão 5 PM compravam imunidade às magias que existem
   precisamente para furar defesas. */
{
  const grosso = comCasulo(4);
  const contraMagia = armaduraNaFD(grosso, 'Fogo').A;
  const semConcha   = armaduraNaFD(comCasulo(0), 'Fogo').A;
  A.ver('serve contra magia também (a Casca não servia)',
        contraMagia === semConcha + 4, `A ${semConcha} → ${contraMagia} contra magia`);

  const furada = armaduraNaFD(grosso, 'Fogo', { ignoraArmadura: true }).A;
  A.ver('e uma magia que ignora Armadura fura-a na mesma',
        furada === 0, `A = ${furada}`);
}

// ── 6. Com a Casca de Helena de pé, dobra também ──
// A concha entra na Armadura antes da dobra, portanto 4 de concha valem
// 8. As duas juntas são a defesa mais alta que o jogo permite montar, e
// é bom que esteja medido antes de alguém a encontrar por acidente.
{
  const c = comCasulo(4);
  const so = armaduraNaFD(c, null).A;
  c.armaduraDobrada = true;
  const dobrada = armaduraNaFD(c, null).A;
  A.ver('debaixo da Casca de Helena, a concha dobra com o resto',
        dobrada === so * 2, `A ${so} → ${dobrada}`);
}

// ── 7. Cobra todo o turno, e o que se paga é o que se pediu ──
{
  const bolsa = 30, investido = 3;
  let lancou = false;
  const e = A.duelo({
    seed: 5,
    politica: () => { if (lancou) return {}; lancou = true; return { magia: CASULO, pm: investido }; },
    a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água', pm: bolsa, pmMax: bolsa,
         magias: { ataque: CASULO, forte: CASULO, defesa: CASULO } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  const pms = [e.A[0].pm];
  let turnosDePe = 0;
  for (let i = 0; i < 15 && !e.acabou; i++) {
    M.combate3dtTurno(e);
    pms.push(e.A[0].pm);
    if (e.A[0].bonusA > 0) turnosDePe++;
  }
  A.ver('cobra os mesmos PM todo o turno',
        pms[1] - pms[2] === investido,
        'PM: ' + pms.slice(0, 5).join(' → ') + ' …');
  A.ver(`${bolsa} PM a ${investido} por turno dão cerca de ${Math.floor(bolsa / investido)} turnos`,
        Math.abs(turnosDePe - Math.floor(bolsa / investido)) <= 1,
        `ficou de pé ${turnosDePe} turnos`);
}

// ── 8. Quando cai, leva exactamente o que trouxe ──
// O recalcular soma tudo do zero. Se levasse a mais, um avatar que
// largasse a concha ficava mais fraco do que antes de a ter.
{
  let lancou = false;
  const e = A.duelo({
    seed: 5,
    politica: () => { if (lancou) return {}; lancou = true; return { magia: CASULO, pm: 5 }; },
    a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água', pm: 5, pmMax: 5,
         magias: { ataque: CASULO, forte: CASULO, defesa: CASULO } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  e.A[0].perm.A = 2;                    // um bónus permanente, de outra origem
  M.combate3dtRecalcularSeExistir = null;
  const antes = e.A[0].perm.A;
  for (let i = 0; i < 4 && !e.acabou; i++) M.combate3dtTurno(e);
  A.ver('ao cair, devolve o avatar ao que era — nem menos',
        e.A[0].bonusA === antes && e.A[0].sustentadas.length === 0,
        `bonusA=${e.A[0].bonusA} (permanente ${antes}) sustentadas=${e.A[0].sustentadas.length}`);
}

// ── 9. Vale a pena? ──
{
  const golpes = 600;
  const conta = (pmNaConcha) => {
    const c = comCasulo(pmNaConcha);
    let dano = 0;
    for (let s = 1; s <= golpes; s++) {
      const alvo = comCasulo(pmNaConcha);
      const { atacante } = defensor();
      Object.assign(atacante.ficha, { F: 4, H: 3, R: 4, A: 1 });
      const rng = M._c3rng(s);
      dano += M._c3resolver(atacante, alvo, null, 0, rng, {}, {}) || 0;
    }
    return dano / golpes;
  };
  const sem = conta(0), com = conta(5);
  A.ver('na prática, 5 PM na concha travam dano a sério',
        com < sem,
        `dano médio por golpe: ${sem.toFixed(2)} sem → ${com.toFixed(2)} com  (${((1 - com / sem) * 100).toFixed(0)}% menos)`);
}

// ═══════════════════════════════════════════════════════════════════
const NEVOA = M.MAGIAS['Água'].defesa.find(g => g.id === 'ag_d2');

console.log('\n═══ NÉVOA DENSA (ag_d2) ═══');
console.log('  "Um nevoeiro que não deixa ver nem ser visto."   ·   1 PM por turno\n');

// Levanta a névoa e devolve quem a levantou.
function comNevoa(carac) {
  const e = A.duelo({
    seed: 3,
    politica: () => ({ magia: NEVOA, pm: 1 }),
    a: { carac: carac || { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água', pm: 40, pmMax: 40,
         magias: { ataque: NEVOA, forte: NEVOA, defesa: NEVOA } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  M.combate3dtTurno(e);
  return e.A[0];
}
// A Habilidade que aparece na Força de Defesa, com o dado preso.
function habNaFD(c, opts) {
  const r = M._c3fd(c, M._c3rng(77), Object.assign({ elemento: null }, opts || {}));
  const h = r.partes.find(p => p.r === 'H');
  return { H: h.v, x2: !!h.x2, total: r.total };
}

// ── 1. O catálogo ──
A.ver('custa 1 PM por turno e é sustentada',
      NEVOA.pm === 1 && NEVOA.porTurno === true && NEVOA.ocultacao === true && !NEVOA.pmMax,
      `pm=${NEVOA.pm} porTurno=${NEVOA.porTurno} ocultacao=${NEVOA.ocultacao}`);

// ── 2. A Habilidade conta a dobrar na Defesa ──
{
  const nu = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água' },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 } }).A[0];
  const sem = habNaFD(nu), com = habNaFD(comNevoa());
  A.ver('a Habilidade conta a dobrar na Força de Defesa',
        com.H === sem.H * 2 && com.x2 === true,
        `H ${sem.H} → ${com.H}  (marcada como ×2: ${com.x2})`);
}

// ── 3. Dobrar zero é zero ──
{
  const c = comNevoa({ F: 2, H: 0, R: 4, A: 2 });
  A.ver('com Habilidade 0, a névoa não inventa nada',
        habNaFD(c).H === 0, `H = ${habNaFD(c).H}`);
}

/* ── 4. A paralisia passa por cima da névoa ──

   Quem está indefeso não usa a Habilidade na Defesa, e o zero entra
   ANTES da dobra. É a ordem certa: dobrar primeiro e zerar depois dava
   no mesmo, mas zerar primeiro e dobrar depois de um número já perdido
   é o que garante que a névoa não ressuscita uma defesa que a paralisia
   tinha tirado. */
{
  const c = comNevoa();
  const r = habNaFD(c, { indefeso: true });
  A.ver('quem está travado não se esconde na névoa',
        r.H === 0, `H = ${r.H} com o alvo indefeso`);
}

/* ── 5. A névoa NÃO ajuda a esquivar ──

   Parece que devia — esconder-se e sair da frente são a mesma ideia no
   imaginário — mas a esquiva é um teste à Habilidade crua e a névoa
   nunca lhe tocou. Fica medido para não se confundir uma coisa com a
   outra ao ler o texto. */
{
  // Medido pelo caminho por onde a esquiva acontece de verdade: golpes
  // resolvidos, a contar quantas vezes o defensor saiu da frente. Testar
  // a função da esquiva à parte provaria menos — o que interessa é o que
  // chega ao turno.
  const conta = (comNev) => {
    let esquivou = 0;
    for (let s = 1; s <= 600; s++) {
      const alvo = comNev ? comNevoa()
        : A.duelo({ seed: 3, politica: () => ({}),
            a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água' },
            b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
      const { atacante } = defensor();
      Object.assign(atacante.ficha, { F: 4, H: 1, R: 4, A: 1 });
      const ev = {};
      M._c3resolver(atacante, alvo, null, 0, M._c3rng(s), ev, {});
      if (ev.esquivou) esquivou++;
    }
    return esquivou;
  };
  const com = conta(true), sem = conta(false);
  A.ver('a névoa não muda a esquiva — é outra coisa',
        com === sem, `com névoa ${com} · sem névoa ${sem} esquivas em 600 golpes`);
}

/* ── 6. E não estorva o próprio ataque ──

   O texto diz "não deixa VER nem ser visto", e a primeira metade não
   existe: a névoa não tira um único ponto à Força de Ataque de quem a
   levantou. É bom para o jogador e mau para o texto — uma desvantagem
   inventada faz evitar uma magia que só tem vantagens. */
{
  const c = comNevoa();
  const alvo = A.duelo({ seed: 1, politica: () => ({}),
    a: { carac: { F: 1, H: 1, R: 99, A: 0 } },
    b: { carac: { F: 1, H: 1, R: 99, A: 0 } } }).A[0];
  const fa = (quem) => M._c3fa(quem, null, 0, M._c3rng(41), { alvo }).total;
  const nu = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água' },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
  A.ver('quem levanta a névoa ataca exactamente como antes',
        fa(c) === fa(nu), `FA ${fa(nu)} sem névoa → ${fa(c)} com névoa`);
}

// ── 7. Cobra 1 PM por turno, e cai quando a bolsa seca ──
{
  const bolsa = 6;
  let lancou = false;
  const e = A.duelo({
    seed: 5,
    politica: () => { if (lancou) return {}; lancou = true; return { magia: NEVOA, pm: 1 }; },
    a: { carac: { F: 2, H: 4, R: 4, A: 2 }, elemento: 'Água', pm: bolsa, pmMax: bolsa,
         magias: { ataque: NEVOA, forte: NEVOA, defesa: NEVOA } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  let dePe = 0;
  for (let i = 0; i < 12 && !e.acabou; i++) {
    M.combate3dtTurno(e);
    if (e.A[0].ocultado) dePe++;
  }
  A.ver(`${bolsa} PM a 1 por turno dão cerca de ${bolsa} turnos de névoa`,
        Math.abs(dePe - bolsa) <= 1, `ficou de pé ${dePe} turnos`);
  A.ver('e quando cai, deixa de esconder',
        !e.A[0].ocultado && e.A[0].sustentadas.length === 0,
        `ocultado=${e.A[0].ocultado} sustentadas=${e.A[0].sustentadas.length}`);
}

/* ── 8. O que a névoa acrescenta é a própria Habilidade ──

   Dobrar a Habilidade é somar-lhe uma vez a Habilidade. Dito assim
   parece trivial, mas é a forma inteira da magia: 1 PM por turno — o
   preço mais barato do catálogo defensivo — compra tanto quanto o
   avatar já for ágil. Num H1 vale +1; num H5 vale +5. */
{
  for (const H of [1, 3, 5]) {
    const nu = A.duelo({ seed: 3, politica: () => ({}),
      a: { carac: { F: 2, H, R: 4, A: 2 }, elemento: 'Água' },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
    const sem = habNaFD(nu).total, com = habNaFD(comNevoa({ F: 2, H, R: 4, A: 2 })).total;
    A.ver(`com Habilidade ${H}, a névoa vale +${H} na Defesa`,
          com - sem === H, `FD ${sem} → ${com}`);
  }
}

/* ── 9. Vale a pena? ──

   Em PROPORÇÃO, e não em pontos. A primeira versão desta prova exigia
   que a névoa poupasse mais dano absoluto a quem tem Habilidade alta, e
   deu falha — com razão: um avatar de H5 já só levava 0,34 por golpe,
   portanto não havia lá 0,68 para tirar. A conta certa é a fatia. */
{
  const golpes = 600;
  const conta = (H, comNev) => {
    let dano = 0;
    for (let s = 1; s <= golpes; s++) {
      const alvo = comNev ? comNevoa({ F: 2, H, R: 4, A: 2 })
        : A.duelo({ seed: 3, politica: () => ({}),
            a: { carac: { F: 2, H, R: 4, A: 2 }, elemento: 'Água' },
            b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
      const { atacante } = defensor();
      Object.assign(atacante.ficha, { F: 4, H: 3, R: 4, A: 1 });
      dano += M._c3resolver(atacante, alvo, null, 0, M._c3rng(s), {}, {}) || 0;
    }
    return dano / golpes;
  };
  const fatia = (H) => { const s = conta(H, false), c = conta(H, true); return { s, c, pc: 1 - c / s }; };
  const baixa = fatia(1), alta = fatia(5);
  A.ver('trava uma fatia maior do dano em quem já é ágil',
        alta.pc > baixa.pc,
        `H1 corta ${(baixa.pc * 100).toFixed(0)}% (${baixa.s.toFixed(2)}→${baixa.c.toFixed(2)})  ·  ` +
        `H5 corta ${(alta.pc * 100).toFixed(0)}% (${alta.s.toFixed(2)}→${alta.c.toFixed(2)})`);
}

// ═══════════════════════════════════════════════════════════════════
const MARE = M.MAGIAS['Água'].defesa.find(g => g.id === 'ag_d3');

console.log('\n═══ MARÉ RESTAURADORA (ag_d3) ═══');
console.log('  "Cura 1d de vida a cada 2 PM que você investe."   ·   2 a 20 PM\n');

/* Cura N vezes com os PM que eu mandar, partindo da vida que eu mandar,
   e devolve o que aconteceu. A cura é a única magia do jogo cujo efeito
   se mede em pontos de vida ganhos, e por isso é a única em que vale a
   pena olhar para a média de perto: 1d é 3,5, e a soma de N dados
   aproxima-se disso depressa. */
function curar(pm, pvInicial, voltas) {
  const curas = [], dados = [];
  for (let s = 1; s <= (voltas || 400); s++) {
    const e = A.duelo({
      seed: s,
      politica: () => ({ magia: MARE, pm }),
      a: { carac: { F: 2, H: 4, R: 8, A: 2 }, elemento: 'Água', pm: 60, pmMax: 60,
           pv: pvInicial, magias: { ataque: MARE, forte: MARE, defesa: MARE } },
      b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
    });
    const pvMax = e.A[0].pvMax, antes = e.A[0].pv;
    M.combate3dtTurno(e);
    const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'ag_d3');
    if (!ev) continue;
    curas.push(ev.curou || 0);
    dados.push(ev.curaDados);
    // O que o evento diz tem de bater com o que a vida fez.
    if (e.A[0].pv - antes !== (ev.curou || 0)) curas.push(-9999);
    if (e.A[0].pv > pvMax) curas.push(-9999);
  }
  const soma = curas.reduce((a, b) => a + b, 0);
  return { curas, dados, media: soma / curas.length, n: curas.length,
           min: Math.min(...curas), max: Math.max(...curas) };
}

// ── 1. O catálogo ──
A.ver('escala de 2 a 20 PM, e não é sustentada',
      MARE.pm === 2 && MARE.pmMax === 20 && !MARE.porTurno && MARE.cura.dadosPorPM === 0.5,
      `pm=${MARE.pm}–${MARE.pmMax} porTurno=${!!MARE.porTurno} dadosPorPM=${MARE.cura.dadosPorPM}`);

// ── 2. Um dado a cada dois PM ──
{
  const medidas = [2, 4, 6, 10, 20].map(pm => ({ pm, d: curar(pm, 1, 40).dados[0] }));
  A.ver('cada 2 PM investidos valem 1 dado de cura',
        medidas.every(m => m.d === Math.floor(m.pm / 2)),
        medidas.map(m => `${m.pm}PM→${m.d}d`).join('  '));
}

/* ── 3. A ARMADILHA DOS PM ÍMPARES ──

   `floor(pm × 0,5)` quer dizer que 3 PM compram exactamente o mesmo que
   2, e 5 o mesmo que 4. O PM ímpar evapora-se sem dar nada.

   Não é defeito — é a consequência honesta de "1d a cada 2 PM", e a
   descrição já o diz a quem ler com atenção. Fica medido porque é o
   tipo de coisa que só se descobre a perder uma luta. */
{
  const par = curar(4, 1, 300), impar = curar(5, 1, 300);
  A.ver('5 PM curam exactamente o mesmo que 4 — o ímpar perde-se',
        impar.dados[0] === par.dados[0],
        `4 PM → ${par.dados[0]}d · 5 PM → ${impar.dados[0]}d`);
}

// ── 4. A média bate com os dados ──
// Um d6 vale 3,5. Com 5 dados a média fica perto de 17,5, e com 400
// lançamentos o ruído já não chega para confundir.
{
  const r = curar(10, 1, 500);
  const esperado = 5 * 3.5;
  A.ver('a cura média é a que 5 dados dão',
        Math.abs(r.media - esperado) < 1,
        `média ${r.media.toFixed(2)} · esperado ${esperado} · entre ${r.min} e ${r.max}`);
}

/* ── 5. Não passa do tecto, e diz a verdade sobre isso ──

   Quem está a um ponto do máximo e rola 18 curou UM. O `ev.curou` tem
   de dizer 1 e não 18: é esse número que sai a flutuar no cartão e que
   entra no registo, e um 18 ali seria uma mentira que o jogador não tem
   como conferir. */
{
  const r = curar(20, 39, 300);            // R8 → 40 de vida, entra com 39
  A.ver('nunca passa da vida máxima',
        r.max <= 1, `maior cura registada: ${r.max} (faltava 1 ponto)`);
  A.ver('e o número que mostra é o que curou mesmo, não o que rolou',
        r.min >= 0 && r.curas.every(c => c >= 0 && c <= 1),
        `curas registadas: ${[...new Set(r.curas)].join(', ')}`);
}

/* ── 6. Cura quem lança, não o adversário ──

   A política do duelo é chamada para OS DOIS lados. A primeira versão
   disto devolvia a Maré a quem quer que perguntasse, e por isso o
   adversário também se curou dos 5 aos 40 — dando falha a acusar a
   magia de curar o inimigo, quando quem lha tinha mandado lançar era
   eu. Agora só quem tem a magia é que a lança. */
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: MARE, pm: 20 } : {},
    a: { carac: { F: 2, H: 4, R: 8, A: 2 }, elemento: 'Água', pm: 60, pmMax: 60, pv: 5,
         magias: { ataque: MARE, forte: MARE, defesa: MARE } },
    b: { carac: { F: 1, H: 0, R: 8, A: 0 }, pv: 5, iniciativa: 0 },
  });
  const pvBantes = e.B[0].pv;
  M.combate3dtTurno(e);
  A.ver('cura quem a lança, e não toca no adversário',
        e.A[0].pv > 5 && e.B[0].pv <= pvBantes,
        `eu 5 → ${e.A[0].pv} · ele ${pvBantes} → ${e.B[0].pv}`);
}

// ── 7. Custa os PM que se pediu ──
{
  const e = A.duelo({
    seed: 3,
    politica: () => ({ magia: MARE, pm: 8 }),
    a: { carac: { F: 2, H: 4, R: 8, A: 2 }, elemento: 'Água', pm: 30, pmMax: 30, pv: 5,
         magias: { ataque: MARE, forte: MARE, defesa: MARE } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  M.combate3dtTurno(e);
  A.ver('paga os 8 PM que investiu',
        e.A[0].pm === 22, `PM 30 → ${e.A[0].pm}`);
}

// ── 8. É a única cura de verdade do jogo ──
// A Cura Perpétua da vantagem devolve 1 por turno e o Segundo Fôlego
// enche tudo mas gasta o turno e existe uma vez. De magia que cure a
// pedido, e escale, só há esta — e é isso que faz da Água o elemento
// que se aguenta.
{
  let comCura = 0;
  for (const el of Object.keys(M.MAGIAS))
    for (const cat of ['ataque', 'forte', 'defesa'])
      for (const g of (M.MAGIAS[el][cat] || [])) if (g.cura) comCura++;
  A.ver('é a única magia do catálogo que cura',
        comCura === 1, `${comCura} magia(s) com cura em todo o catálogo`);
}

// ═══════════════════════════════════════════════════════════════════
const FIO = M.MAGIAS['Vento'].forte.find(g => g.id === 'vt_f3');

console.log('\n═══ FIO CORTANTE (vt_f3) ═══');
console.log('  "Não bate mais forte — mas num acerto perfeito o alvo testa');
console.log('   a Armadura ou acabou ali."   ·   1 PM por turno\n');

/* Bate N vezes com o fio de pé e conta o que aconteceu.

   O vorpal é uma bandeira em QUEM BATE, não uma magia de ataque: entra
   depois de qualquer golpe resolvido. Por isso as provas usam murros —
   é o caso mais simples e o que apanha a regra onde ela realmente vive. */
function fio(comFio, A_alvo, golpes, mexerAtacante) {
  let criticos = 0, decapitou = 0, aguentou = 0, comDano = 0, danoTotal = 0;
  const testes = [];
  for (let s = 1; s <= golpes; s++) {
    const d = A.duelo({ seed: s, politica: () => ({}),
      a: { carac: { F: 4, H: 3, R: 4, A: 1 }, elemento: 'Vento' },
      b: { carac: { F: 1, H: 0, R: 40, A: A_alvo }, iniciativa: 0 } });
    const atk = d.A[0], def = d.B[0];
    atk.vorpal = !!comFio;
    if (mexerAtacante) mexerAtacante(atk, def);
    const ev = {};
    const passou = M._c3resolver(atk, def, null, 0, M._c3rng(s), ev, {}) || 0;
    danoTotal += passou;
    if (passou > 0) comDano++;
    if (ev.criticoAtk) criticos++;
    if (ev.decapitou) decapitou++;
    if (ev.aguentouVorpal) aguentou++;
    const tv = (ev.testes || []).find(x => x.rotulo === 'vorpal');
    if (tv) testes.push(tv);
  }
  return { criticos, decapitou, aguentou, comDano, danoTotal, testes, golpes };
}

// ── 1. O catálogo ──
A.ver('custa 1 PM por turno e é sustentada',
      FIO.pm === 1 && FIO.porTurno === true && FIO.vorpal === true && !FIO.fa,
      `pm=${FIO.pm} porTurno=${FIO.porTurno} vorpal=${FIO.vorpal} fa=${FIO.fa ? 'sim' : 'não'}`);

// ── 2. "Não bate mais forte" — e não bate mesmo ──
{
  const sem = fio(false, 2, 500), com = fio(true, 2, 500);
  A.ver('não acrescenta um único ponto de dano',
        sem.danoTotal === com.danoTotal,
        `dano somado: ${sem.danoTotal} sem fio · ${com.danoTotal} com fio, em 500 golpes`);
}

/* ── 3. São QUATRO condições, não uma ──

   O texto diz "num acerto perfeito", e é verdade, mas incompleto. Para
   decapitar é preciso: o fio de pé, o dado do ATAQUE a sair 6, dano a
   passar de verdade, e o alvo ainda vivo. Um crítico inteiramente
   aparado pela Armadura não decapita ninguém — e é a condição que
   ninguém adivinha a ler a frase. */
{
  // Alvo com Armadura altíssima: os críticos acontecem, o dano não passa.
  const r = fio(true, 60, 600);
  A.ver('um crítico sem dano a passar não decapita',
        r.criticos > 0 && r.comDano === 0 && r.decapitou === 0,
        `${r.criticos} críticos · ${r.comDano} com dano · ${r.decapitou} decapitações`);
}

// ── 4. Sem crítico, nunca ──
// Forço o dado da FA a nunca dar 6 usando um atacante que rola o dado
// do ataque: se não houver crítico nenhum, não pode haver decapitação.
{
  const r = fio(true, 0, 600);
  A.ver('só decapita em turnos onde houve crítico',
        r.decapitou <= r.criticos,
        `${r.decapitou} decapitações em ${r.criticos} críticos (${r.golpes} golpes)`);
}

/* ── 5. A Armadura é que salva o pescoço ──

   O teste é à Armadura do alvo, e isto é uma inversão bonita: a
   Armadura já servia para aparar dano, e aqui serve para não perder a
   cabeça. Quem se cobre de metal aguenta o fio; quem anda nu não. */
{
  const linhas = [];
  let certos = 0;
  for (const Aalvo of [0, 2, 5]) {
    const r = fio(true, Aalvo, 1200);
    // Dos que chegaram ao teste, quantos falharam.
    const chegaram = r.decapitou + r.aguentou;
    const caiu = chegaram ? r.decapitou / chegaram : 0;
    const esperado = (1 + Math.max(0, 5 - Aalvo)) / 6;
    if (chegaram > 20 && Math.abs(caiu - esperado) < 0.09) certos++;
    linhas.push(`A${Aalvo} ${(caiu * 100).toFixed(0)}%~${(esperado * 100).toFixed(0)}% (${chegaram} testes)`);
  }
  A.ver('quem falha o teste é quem tem pouca Armadura, como o manual manda',
        certos === 3, linhas.join('  '));
}

/* ── 6. Nem a Armadura mais alta põe ninguém a salvo ──

   O 6 falha sempre, aqui como na Prisão de Gelo. Mas medir isto obriga
   a um alvo contraditório: Armadura altíssima, para o teste ser quase
   impossível de falhar, E dano a passar, para se chegar ao teste. A
   primeira versão pedia as duas coisas a um atacante normal e chegava
   ao teste zero vezes — dava falha por ser impossível, não por estar
   errado. Resolve-se com um atacante monstruoso: a Força atravessa a
   Armadura na conta do dano, e a Armadura continua inteira na conta do
   pescoço. */
{
  const r = fio(true, 30, 4000, (atk) => { atk.ficha.F = 80; });
  const chegaram = r.decapitou + r.aguentou;
  A.ver('com Armadura 30, ainda cai ~1 em 6 dos que chegam ao teste',
        chegaram > 10 && Math.abs(r.decapitou / chegaram - 1 / 6) < 0.12,
        `${r.decapitou} de ${chegaram} testes = ` +
        `${chegaram ? (r.decapitou / chegaram * 100).toFixed(0) : 0}%`);
  A.ver('e o registo marca o seis',
        r.testes.some(x => x.seis === true),
        `${r.testes.filter(x => x.seis).length} testes marcados com o seis`);
}

// ── 7. Quando corta, acabou — sem passar pela vida ──
{
  const d = A.duelo({ seed: 1, politica: () => ({}),
    a: { carac: { F: 9, H: 5, R: 4, A: 1 }, elemento: 'Vento' },
    b: { carac: { F: 1, H: 0, R: 40, A: 0 }, pv: 200, iniciativa: 0 } });
  d.A[0].vorpal = true;
  let cortou = null;
  for (let s = 1; s <= 800 && !cortou; s++) {
    const alvo = A.duelo({ seed: s, politica: () => ({}),
      a: { carac: { F: 9, H: 5, R: 4, A: 1 } },
      b: { carac: { F: 1, H: 0, R: 40, A: 0 }, pv: 200 } }).B[0];
    const ev = {};
    M._c3resolver(d.A[0], alvo, null, 0, M._c3rng(s), ev, {});
    if (ev.decapitou) cortou = { pv: alvo.pv, vivo: alvo.vivo, dano: ev.dano };
  }
  A.ver('a decapitação acaba com o alvo tivesse ele a vida que tivesse',
        !!cortou && cortou.pv === 0 && cortou.vivo === false,
        cortou ? `entrou com 200 de vida, levou ${cortou.dano} de dano, ficou em ${cortou.pv}`
               : 'não saiu decapitação em 800 golpes');
}

/* ── 8. O fio corta em qualquer golpe, não só nas magias ──

   É uma bandeira em quem bate, e o motor verifica-a depois de QUALQUER
   ataque resolvido. Um murro com o fio de pé decapita tal e qual — e é
   assim que a magia faz sentido: 1 PM por turno para pôr o gume, e
   depois bate-se à vontade. */
{
  const r = fio(true, 1, 1500);
  A.ver('um murro simples também corta, com o fio de pé',
        r.decapitou > 0, `${r.decapitou} decapitações em ${r.golpes} murros`);
}

// ── 9. Sustentada: cai quando a bolsa seca ──
{
  const bolsa = 4;
  let lancou = false;
  const e = A.duelo({
    seed: 5,
    politica: (quem) => {
      if (quem.nome !== 'A' || lancou) return {};
      lancou = true; return { magia: FIO, pm: 1 };
    },
    a: { carac: { F: 3, H: 4, R: 4, A: 2 }, elemento: 'Vento', pm: bolsa, pmMax: bolsa,
         magias: { ataque: FIO, forte: FIO, defesa: FIO } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  let dePe = 0;
  for (let i = 0; i < 10 && !e.acabou; i++) {
    M.combate3dtTurno(e);
    if (e.A[0].vorpal) dePe++;
  }
  A.ver(`${bolsa} PM a 1 por turno dão cerca de ${bolsa} turnos de gume`,
        Math.abs(dePe - bolsa) <= 1, `ficou de pé ${dePe} turnos`);
  A.ver('e quando cai, deixa de cortar',
        !e.A[0].vorpal, `vorpal=${e.A[0].vorpal}`);
}

// ── 10. Quanto vale, ao todo ──
// A conta que interessa ao jogador: de cada cem golpes, quantos acabam
// a luta ali. Não é balanceamento — é o número que a frase esconde.
{
  const r = fio(true, 2, 3000);
  A.ver('a decapitação é rara, e o número fica escrito',
        r.decapitou > 0,
        `${(r.decapitou / r.golpes * 100).toFixed(1)}% dos golpes contra Armadura 2 ` +
        `(${r.criticos} críticos, ${r.decapitou + r.aguentou} chegaram ao teste)`);
}

// ═══════════════════════════════════════════════════════════════════
const VEU = M.MAGIAS['Vento'].defesa.find(g => g.id === 'vt_d1');

console.log('\n═══ VÉU DE CORRENTES (vt_d1) ═══');
console.log('  "Uma parede de vento ao seu redor."   ·   5 PM, uma vez\n');

function comVeu(voltas) {
  let lancou = false;
  const e = A.duelo({
    seed: 3,
    politica: (quem) => {
      if (quem.nome !== 'A' || lancou) return {};
      lancou = true; return { magia: VEU, pm: 5 };
    },
    a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Vento', pm: 6, pmMax: 6,
         magias: { ataque: VEU, forte: VEU, defesa: VEU } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < (voltas || 1) && !e.acabou; i++) M.combate3dtTurno(e);
  return e;
}

// ── 1. O catálogo ──
A.ver('custa 5 PM e não escala nem cobra por turno',
      VEU.pm === 5 && !VEU.pmMax && !VEU.porTurno && VEU.bonusFD === 10,
      `pm=${VEU.pm} pmMax=${VEU.pmMax || '—'} porTurno=${!!VEU.porTurno} bonusFD=${VEU.bonusFD}`);

// ── 2. Dez pontos de Força de Defesa ──
{
  const nu = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Vento' },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
  const sem = M._c3fd(nu, M._c3rng(77), {}).total;
  const com = M._c3fd(comVeu().A[0], M._c3rng(77), {}).total;
  A.ver('soma exactamente 10 à Força de Defesa',
        com - sem === 10, `FD ${sem} → ${com}`);
}

/* ── 3. Paga-se uma vez e dura a luta inteira ──

   É a única defesa do catálogo assim. Todas as outras cobram por turno
   e caem quando a bolsa seca; esta entra na lista das sustentadas com
   custo zero, e por isso nunca é largada — o fim de turno só larga as
   que cobram. Cinco PM e acabou.

   Com 6 PM de bolsa, a magia leva 5 e sobra 1. Se cobrasse fosse o que
   fosse por turno, caía no turno seguinte. */
{
  const e = comVeu(12);
  A.ver('não cai nunca, nem com a bolsa quase vazia',
        e.A[0].bonusFD === 10 && e.A[0].sustentadas.length === 1,
        `depois de 12 turnos: FD+${e.A[0].bonusFD} com ${e.A[0].pm} PM na bolsa`);
}

/* ── 4. Relançá-lo não empilha ──

   Era o pior caso do empilhamento, e é a razão de o motor ter mudado
   junto com esta prova: como não cobra nada por turno, cada nova
   carregadela no botão somava outros +10 de graça e para sempre. Quatro
   toques davam FD +40 — mais do que a Força de Defesa inteira de um
   avatar de nível alto.

   A política do motor já se defendia com um `!eu.bonusFD`; a interface
   do jogador não tinha guarda nenhuma. */
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: VEU, pm: 5 } : {},
    a: { carac: { F: 2, H: 2, R: 20, A: 2 }, elemento: 'Vento', pm: 200, pmMax: 200,
         magias: { ataque: VEU, forte: VEU, defesa: VEU } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < 4; i++) { M.combate3dtTurno(e); trilho.push('FD+' + e.A[0].bonusFD); }
  A.ver('quatro toques no botão continuam a dar +10, não +40',
        e.A[0].bonusFD === 10 && e.A[0].sustentadas.length === 1,
        trilho.join(' → '));
}

// ── 5. O bónus vale em todas as defesas, não só na primeira ──
{
  const c = comVeu().A[0];
  const tres = [11, 22, 33].map(sem => M._c3fd(c, M._c3rng(sem), {}).partes
    .find(p => p.r === 'bónus'));
  A.ver('aparece em toda a Força de Defesa que se rolar',
        tres.every(p => p && p.v === 10),
        tres.map(p => p ? 'bónus ' + p.v : 'ausente').join(' · '));
}

// ── 6. Vale a pena? ──
{
  const golpes = 800;
  const conta = (comVeuDePe) => {
    let dano = 0;
    for (let s = 1; s <= golpes; s++) {
      const alvo = comVeuDePe ? comVeu().A[0]
        : A.duelo({ seed: 3, politica: () => ({}),
            a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Vento' },
            b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
      const { atacante } = defensor();
      Object.assign(atacante.ficha, { F: 4, H: 3, R: 4, A: 1 });
      dano += M._c3resolver(atacante, alvo, null, 0, M._c3rng(s), {}, {}) || 0;
    }
    return dano / golpes;
  };
  const sem = conta(false), com = conta(true);
  // O 100% é contra ESTE atacante — F4 H3, que rola no máximo 12 de
  // Força de Ataque contra uma Defesa que passa a valer 14 a 19. Contra
  // um atacante forte passaria alguma coisa; o número sem a ficha ao
  // lado seria uma promessa que a magia não faz.
  A.ver('cinco PM uma vez, e o dano recebido desaba',
        com < sem,
        `contra um atacante F4 H3: ${sem.toFixed(2)} → ${com.toFixed(2)} por golpe ` +
        `(${((1 - com / sem) * 100).toFixed(0)}% menos)`);
}

// ═══════════════════════════════════════════════════════════════════
const EGIDE = M.MAGIAS['Sombra'].defesa.find(g => g.id === 'so_d2');

console.log('\n═══ ÉGIDE MENTAL (so_d2) ═══');
console.log('  "A mente se fecha. Nenhuma magia de espírito entra ali."   ·   5 PM, uma vez\n');

// Todas as magias do catálogo que tiram do combate sem passar pelos PV.
const TIRAM_DE_COMBATE = [];
for (const el of Object.keys(M.MAGIAS))
  for (const cat of ['ataque', 'forte', 'defesa'])
    for (const g of (M.MAGIAS[el][cat] || []))
      if (g.petrifica || g.congela || g.destroiAlma) TIRAM_DE_COMBATE.push({ g, el });

/* Manda uma magia contra um alvo, com ou sem a Égide de pé, e conta
   quantas vezes ele saiu de combate. O alvo tem Resistência 0: sem a
   Égide sai sempre, portanto qualquer sobrevivente é obra dela. */
function contraEgide(magia, pm, comEgide, voltas) {
  let fora = 0, imunizou = 0, presos = 0;
  for (let s = 1; s <= (voltas || 200); s++) {
    const e = A.duelo({
      seed: s,
      politica: (quem) => (quem.nome === 'A') ? { magia, pm } : {},
      a: { carac: { F: 2, H: 9, R: 4, A: 1 }, elemento: 'Sombra', pm: 60, pmMax: 60,
           iniciativa: 99, magias: { ataque: magia, forte: magia, defesa: magia } },
      b: { carac: { F: 2, H: 0, R: 0, A: 0 }, pv: 200, iniciativa: 0 },
    });
    if (comEgide) e.B[0].imuneEspiritual = true;
    M.combate3dtTurno(e);
    const ev = e.eventos.find(v => v.lado === 'A' && v.magia === magia.id);
    if (!ev) continue;
    if (ev.fora) fora++;
    if (ev.imunizou) imunizou++;
    if (ev.congelou) presos++;
  }
  return { fora, imunizou, presos, voltas: voltas || 200 };
}

// ── 1. O catálogo ──
A.ver('custa 5 PM, uma vez, e não cobra por turno',
      EGIDE.pm === 5 && !EGIDE.porTurno && !EGIDE.pmMax && EGIDE.imuneEspiritual === true,
      `pm=${EGIDE.pm} porTurno=${!!EGIDE.porTurno} imuneEspiritual=${EGIDE.imuneEspiritual}`);

/* ── 2. As três que ela fecha, uma a uma ──

   "Magia de espírito" não é uma família declarada em lado nenhum: é o
   nome que o texto dá às três magias que tiram do combate sem passar
   pelos pontos de vida. Vale a pena percorrê-las pelo catálogo em vez
   de as escrever à mão — se um dia nascer uma quarta, esta prova
   apanha-a sozinha. */
{
  const falhou = [];
  for (const { g, el } of TIRAM_DE_COMBATE) {
    const sem = contraEgide(g, g.pm, false, 150);
    const com = contraEgide(g, g.pm, true, 150);
    if (!(sem.fora > 100 && com.fora === 0 && com.imunizou > 100)) {
      falhou.push(`${g.id} (sem ${sem.fora}, com ${com.fora})`);
    }
  }
  A.ver(`fecha as ${TIRAM_DE_COMBATE.length} magias que tiram do combate`,
        falhou.length === 0 && TIRAM_DE_COMBATE.length === 3,
        TIRAM_DE_COMBATE.map(x => x.g.id).join(', ') +
        (falhou.length ? '  ·  falharam: ' + falhou.join(' ') : ''));
}

/* ── 3. A FRONTEIRA: não fecha a prisão de gelo de dois turnos ──

   O Inverno Súbito (ag_f4) congela por dois turnos e não é "magia de
   espírito": fere, e o que faz depois é prender, não tirar. A Égide não
   lhe toca — o motor só a consulta no bloco do petrificar/congelar/
   destruir alma.

   É a distinção mais fácil de confundir do catálogo inteiro, porque as
   duas magias de gelo têm nomes de gelo e efeitos parecidos. Uma é
   fechada pela Égide, a outra não. */
{
  const INVERNO = M.MAGIAS['Água'].forte.find(g => g.id === 'ag_f4');
  const com = contraEgide(INVERNO, INVERNO.pm, true, 400);
  A.ver('mas NÃO fecha o Inverno Súbito, que prende em vez de tirar',
        com.presos > 0 && com.fora === 0 && com.imunizou === 0,
        `${com.presos} congelamentos passaram na mesma, em ${com.voltas} lançamentos`);
}

// ── 4. Não protege de dano nenhum ──
{
  const golpes = 500;
  const conta = (comEg) => {
    let dano = 0;
    for (let s = 1; s <= golpes; s++) {
      const d = A.duelo({ seed: s, politica: () => ({}),
        a: { carac: { F: 4, H: 3, R: 4, A: 1 } },
        b: { carac: { F: 1, H: 1, R: 20, A: 1 }, iniciativa: 0 } });
      if (comEg) d.B[0].imuneEspiritual = true;
      dano += M._c3resolver(d.A[0], d.B[0], null, 0, M._c3rng(s), {}, {}) || 0;
    }
    return dano;
  };
  A.ver('a alma fechada não pára um único ponto de dano',
        conta(true) === conta(false),
        `${conta(false)} de dano com e sem ela, em ${golpes} golpes`);
}

// ── 5. Paga-se uma vez e dura a luta ──
// Como o Véu de Correntes: não entra na cobrança do fim de turno, e o
// recalcular não lhe toca. Cinco PM e a alma fica fechada até ao fim.
{
  let lancou = false;
  const e = A.duelo({
    seed: 3,
    politica: (quem) => {
      if (quem.nome !== 'A' || lancou) return {};
      lancou = true; return { magia: EGIDE, pm: 5 };
    },
    a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Sombra', pm: 6, pmMax: 6,
         magias: { ataque: EGIDE, forte: EGIDE, defesa: EGIDE } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < 12 && !e.acabou; i++) M.combate3dtTurno(e);
  A.ver('doze turnos depois, com a bolsa quase vazia, continua fechada',
        e.A[0].imuneEspiritual === true,
        `imune=${e.A[0].imuneEspiritual} com ${e.A[0].pm} PM na bolsa`);
}

// ── 6. Relançá-la não acumula nada ──
// É uma bandeira, não um número: ergue-se uma vez e não há segunda vez
// que valha alguma coisa. Fica provado porque as vizinhas numéricas
// acumulavam, e a diferença entre as duas famílias não é óbvia.
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: EGIDE, pm: 5 } : {},
    a: { carac: { F: 2, H: 2, R: 20, A: 2 }, elemento: 'Sombra', pm: 60, pmMax: 60,
         magias: { ataque: EGIDE, forte: EGIDE, defesa: EGIDE } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < 4; i++) M.combate3dtTurno(e);
  A.ver('erguer a Égide quatro vezes é o mesmo que erguê-la uma',
        e.A[0].imuneEspiritual === true,
        'é uma bandeira, não um número — não há o que somar');
}

// ── 7. O registo diz que imunizou, e a quem ──
{
  const GELO2 = M.MAGIAS['Água'].forte.find(g => g.id === 'ag_f3');
  const e = A.duelo({
    seed: 4,
    politica: (quem) => (quem.nome === 'A') ? { magia: GELO2, pm: 10 } : {},
    a: { carac: { F: 2, H: 9, R: 4, A: 1 }, elemento: 'Água', pm: 40, pmMax: 40,
         iniciativa: 99, magias: { ataque: GELO2, forte: GELO2, defesa: GELO2 } },
    b: { carac: { F: 2, H: 0, R: 0, A: 0 }, pv: 200, iniciativa: 0 },
  });
  e.B[0].imuneEspiritual = true;
  M.combate3dtTurno(e);
  const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'ag_f3');
  A.ver('o registo escreve que a magia bateu numa alma fechada',
        !!ev && ev.imunizou === true && !ev.fora && !ev.resistiu,
        ev ? `imunizou=${ev.imunizou} fora=${!!ev.fora} resistiu=${!!ev.resistiu}` : 'sem evento');
}

// ═══════════════════════════════════════════════════════════════════
const CORRENTES = M.MAGIAS['Vento'].defesa.find(g => g.id === 'vt_d2');

console.log('\n═══ CORRENTES DESVIANTES (vt_d2) ═══');
console.log('  "O ar se dobra em torno do corpo."   ·   1 a 5 PM, uma vez\n');

/* Quantas vezes um defensor com este bónus escapa, em N golpes de
   verdade. É a única forma de medir uma magia de esquiva: o que ela dá
   não é um número na ficha, é uma fatia dos golpes que não chegam. */
function esquivas(bonus, hMeu, hDele, golpes) {
  let fugiu = 0, levou = 0;
  for (let s = 1; s <= golpes; s++) {
    const d = A.duelo({ seed: s, politica: () => ({}),
      a: { carac: { F: 4, H: hDele, R: 4, A: 1 } },
      b: { carac: { F: 1, H: hMeu, R: 999, A: 0 }, iniciativa: 0 } });
    d.B[0].bonusEsquiva = bonus;
    const ev = {};
    M._c3resolver(d.A[0], d.B[0], null, 0, M._c3rng(s), ev, {});
    if (ev.esquivou) fugiu++; else levou++;
  }
  return { fugiu, levou, pc: fugiu / golpes };
}

// Levanta as Correntes com os PM que eu mandar.
function comCorrentes(pm, turnos) {
  let lancou = false;
  const e = A.duelo({
    seed: 3,
    politica: (quem) => {
      if (quem.nome !== 'A' || lancou) return {};
      lancou = true; return { magia: CORRENTES, pm };
    },
    a: { carac: { F: 2, H: 3, R: 8, A: 2 }, elemento: 'Vento', pm: 6, pmMax: 6,
         magias: { ataque: CORRENTES, forte: CORRENTES, defesa: CORRENTES } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < (turnos || 1) && !e.acabou; i++) M.combate3dtTurno(e);
  return e;
}

// ── 1. O catálogo ──
A.ver('escala de 1 a 5 PM, uma vez, e não cobra por turno',
      CORRENTES.pm === 1 && CORRENTES.pmMax === 5 && !CORRENTES.porTurno
      && CORRENTES.esquivaBonus === true,
      `pm=${CORRENTES.pm}–${CORRENTES.pmMax} porTurno=${!!CORRENTES.porTurno}`);

// ── 2. Cada PM vale um ponto no teste de esquiva ──
{
  const medidas = [1, 3, 5].map(pm => ({ pm, b: comCorrentes(pm).A[0].bonusEsquiva }));
  A.ver('cada PM investido vale +1 na esquiva',
        medidas.every(m => m.b === m.pm),
        medidas.map(m => `${m.pm}PM→+${m.b}`).join('  '));
}

// ── 3. E esse ponto aparece mesmo nos golpes ──
{
  const sem = esquivas(0, 2, 3, 1200), com = esquivas(5, 2, 3, 1200);
  A.ver('com as Correntes de pé, escapa-se de verdade',
        com.pc > sem.pc,
        `${(sem.pc * 100).toFixed(0)}% → ${(com.pc * 100).toFixed(0)}% dos golpes`);
}

/* ── 4. O TECTO: cinco em seis, e nem um ponto mais ──

   O teste da esquiva passa com o dado igual ou menor ao valor, e o 6
   falha sempre. Logo o melhor que existe é escapar a cinco dados em
   seis — 83,3% — e tudo o que se invista depois de lá chegar é PM
   deitado fora.

   É por isto que o selector de PM passou a contar a Habilidade dos dois
   lados e o que já foi investido: oferecer o sexto ponto é vender o que
   não existe. */
{
  const medidas = [5, 10, 20, 30].map(b => ({ b, pc: esquivas(b, 2, 3, 1500).pc }));
  const tecto = medidas[medidas.length - 1].pc;
  A.ver('a esquiva satura nos cinco em seis, e não sobe mais',
        Math.abs(tecto - 5 / 6) < 0.03
        && Math.abs(medidas[1].pc - medidas[3].pc) < 0.02,
        medidas.map(m => `+${m.b}→${(m.pc * 100).toFixed(1)}%`).join('  '));
}

// ── 5. Não é Força de Defesa: é sair da frente ──
// Quem esquiva não rola Defesa nenhuma. São dois caminhos diferentes, e
// as Correntes só tocam num deles.
{
  const c = comCorrentes(5).A[0];
  const nu = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: { F: 2, H: 3, R: 8, A: 2 }, elemento: 'Vento' },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
  A.ver('não soma nada à Força de Defesa',
        M._c3fd(c, M._c3rng(77), {}).total === M._c3fd(nu, M._c3rng(77), {}).total,
        `FD ${M._c3fd(nu, M._c3rng(77), {}).total} com e sem as Correntes`);
}

/* ── 6. De nada serve a quem não pode esquivar ──

   A fúria e a paralisia proíbem a esquiva antes de se olhar para o
   bónus. Cinco PM investidos numa magia que a fúria do Sangue Quente
   depois anula é o tipo de coisa que se descobre a perder. */
{
  const conta = (mexer) => {
    let fugiu = 0;
    for (let s = 1; s <= 600; s++) {
      const d = A.duelo({ seed: s, politica: () => ({}),
        a: { carac: { F: 4, H: 3, R: 4, A: 1 } },
        b: { carac: { F: 1, H: 2, R: 999, A: 0 }, iniciativa: 0 } });
      d.B[0].bonusEsquiva = 5;
      mexer(d.B[0]);
      const ev = {};
      M._c3resolver(d.A[0], d.B[0], null, 0, M._c3rng(s), ev, {});
      if (ev.esquivou) fugiu++;
    }
    return fugiu;
  };
  A.ver('em fúria, o bónus não serve de nada',
        conta(c => { c.furia = true; }) === 0, 'zero esquivas com fúria');
  A.ver('travado pela paralisia, também não',
        conta(c => { c.indefeso = true; }) === 0, 'zero esquivas indefeso');
}

/* ── 7. Paga-se uma vez e dura a luta ──

   Não entra na cobrança do fim de turno e o recalcular não lhe toca —
   há um comentário no motor a dizer exactamente isso, porque já foi
   zerada por engano uma vez. */
{
  const e = comCorrentes(5, 12);
  A.ver('doze turnos depois, com a bolsa quase vazia, continua de pé',
        e.A[0].bonusEsquiva === 5,
        `+${e.A[0].bonusEsquiva} com ${e.A[0].pm} PM na bolsa`);
}

/* ── 8. Acumula, e isso é de propósito ──

   Ao contrário das sustentadas, esta soma-se a si própria: o motor
   escreve `(atk.bonusEsquiva || 0) + pmGastos` de forma explícita. Não é
   descuido — é uma magia que se vai reforçando. O travão não está no
   motor, está na regra do dado: passados os cinco pontos úteis, mais
   nada acontece. */
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: CORRENTES, pm: 5 } : {},
    a: { carac: { F: 2, H: 3, R: 20, A: 2 }, elemento: 'Vento', pm: 200, pmMax: 200,
         magias: { ataque: CORRENTES, forte: CORRENTES, defesa: CORRENTES } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < 3; i++) { M.combate3dtTurno(e); trilho.push('+' + e.A[0].bonusEsquiva); }
  A.ver('relançá-la acumula, e é assim que deve ser',
        e.A[0].bonusEsquiva === 15, trilho.join(' → ') + '  (o travão é o dado, não o motor)');
}

// ═══════════════════════════════════════════════════════════════════
const CONTRARIO = M.MAGIAS['Vento'].defesa.find(g => g.id === 'vt_d3');

console.log('\n═══ VENTO CONTRÁRIO (vt_d3) ═══');
console.log('  "Cada PM investido é +1 na sua Defesa."   ·   1 a 5 PM por turno\n');

function comVento(pm, turnos, bolsa) {
  let lancou = false;
  const e = A.duelo({
    seed: 3,
    politica: (quem) => {
      if (quem.nome !== 'A' || lancou) return {};
      lancou = true; return { magia: CONTRARIO, pm };
    },
    a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Vento',
         pm: bolsa || 60, pmMax: bolsa || 60,
         magias: { ataque: CONTRARIO, forte: CONTRARIO, defesa: CONTRARIO } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  for (let i = 0; i < (turnos || 1) && !e.acabou; i++) M.combate3dtTurno(e);
  return e;
}

// ── 1. O catálogo ──
A.ver('escala de 1 a 5 PM e cobra por turno',
      CONTRARIO.pm === 1 && CONTRARIO.pmMax === 5 && CONTRARIO.porTurno === true
      && CONTRARIO.bonusFDPorPM === 1,
      `pm=${CONTRARIO.pm}–${CONTRARIO.pmMax} porTurno=${CONTRARIO.porTurno} ` +
      `bonusFDPorPM=${CONTRARIO.bonusFDPorPM}`);

// ── 2. Um ponto de Defesa por cada PM ──
{
  const medidas = [1, 3, 5].map(pm => ({ pm, b: comVento(pm).A[0].bonusFD }));
  A.ver('cada PM investido vale +1 na Força de Defesa',
        medidas.every(m => m.b === m.pm),
        medidas.map(m => `${m.pm}PM→+${m.b}`).join('  '));
}

// ── 3. E aparece mesmo na conta ──
{
  const nu = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Vento' },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
  const sem = M._c3fd(nu, M._c3rng(77), {}).total;
  const com = M._c3fd(comVento(5).A[0], M._c3rng(77), {}).total;
  A.ver('entra na Força de Defesa como parcela própria',
        com - sem === 5, `FD ${sem} → ${com}`);
}

/* ── 4. "CONTRA ELE" é figura de estilo: vale contra toda a gente ──

   O texto diz "uma ventania soprando na cara de quem vem... +1 na sua
   Defesa contra ele", e o "ele" faz pensar num alvo escolhido. Não é: o
   bónus vive num campo do defensor e aplica-se a qualquer atacante, do
   primeiro ao último. É melhor do que o texto promete, mas quem o ler à
   letra pode largar a magia ao ver o inimigo trocar. */
{
  const c = comVento(5).A[0];
  const tres = ['Fogo', 'Terra', 'Sombra'].map(el => {
    const outro = A.duelo({ seed: 9, politica: () => ({}),
      a: { carac: { F: 5, H: 4, R: 8, A: 1 }, elemento: el },
      b: { carac: { F: 1, H: 0, R: 99, A: 0 } } }).A[0];
    return M._c3fd(c, M._c3rng(77), { atacante: outro }).partes.find(p => p.r === 'bónus');
  });
  A.ver('o bónus vale contra qualquer atacante, não só contra um',
        tres.every(p => p && p.v === 5),
        tres.map(p => p ? 'bónus ' + p.v : 'ausente').join(' · '));
}

// ── 5. O crítico não dobra este bónus ──
// O crítico da Defesa dobra a ARMADURA e mais nada. Vale a pena estar
// medido: quem vir um crítico e contar a dobrar tudo fica com a conta
// errada, e a conta é aberta no registo para se poder conferir.
{
  const c = comVento(5).A[0];
  let critico = null;
  for (let s = 1; s < 400 && !critico; s++) {
    const r = M._c3fd(c, M._c3rng(s), {});
    if (r.critico) critico = r;
  }
  A.ver('num crítico, a Armadura dobra e este bónus não',
        !!critico && critico.partes.find(p => p.r === 'bónus').v === 5,
        critico ? `bónus ${critico.partes.find(p => p.r === 'bónus').v} · ` +
                  `A ${critico.partes.find(p => p.r === 'A').v} (dobrada)` : 'sem crítico');
}

// ── 6. Cobra todo o turno, e cai quando a bolsa seca ──
{
  const bolsa = 12, investido = 3;
  const e = comVento(investido, 8, bolsa);
  A.ver('cai quando não há PM para a sustentar',
        e.A[0].bonusFD === 0 && e.A[0].sustentadas.length === 0,
        `depois de 8 turnos com ${bolsa} PM a ${investido}/turno: FD+${e.A[0].bonusFD}`);
}

// ── 7. Relançá-la substitui, não empilha ──
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: CONTRARIO, pm: 5 } : {},
    a: { carac: { F: 2, H: 2, R: 20, A: 2 }, elemento: 'Vento', pm: 200, pmMax: 200,
         magias: { ataque: CONTRARIO, forte: CONTRARIO, defesa: CONTRARIO } },
    b: { carac: { F: 1, H: 0, R: 999, A: 0 }, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < 4; i++) { M.combate3dtTurno(e); trilho.push('+' + e.A[0].bonusFD); }
  A.ver('quatro lançamentos continuam a dar +5, não +20',
        e.A[0].bonusFD === 5 && e.A[0].sustentadas.length === 1, trilho.join(' → '));
}

/* ── 8. A COMPARAÇÃO QUE O JOGADOR NÃO PODE FAZER ──

   O Vento tem três magias de defesa e cada avatar recebe UMA, sorteada
   à nascença. Quem a recebe não escolhe — mas quem lê a ficha merece
   saber onde é que ela fica.

   O Véu de Correntes custa 5 PM UMA VEZ e dá +10 para a luta inteira. O
   Vento Contrário custa 5 PM TODO O TURNO e dá +5. Ao fim de dois
   turnos o Véu já saiu mais barato, e daí em diante a diferença só
   cresce. Não é defeito de código — é o desenho — mas é grande o
   suficiente para ficar escrito, e para ser a primeira coisa a rever se
   um dia se mexer no balanceamento do Vento. */
{
  const VEU2 = M.MAGIAS['Vento'].defesa.find(g => g.id === 'vt_d1');
  const turnos = 6;
  const custoVeu = VEU2.pm;                       // uma vez
  const custoVento = CONTRARIO.pmMax * turnos;    // todo o turno
  A.ver(`em ${turnos} turnos, o Véu dá mais Defesa por menos PM`,
        VEU2.bonusFD > CONTRARIO.pmMax * CONTRARIO.bonusFDPorPM && custoVeu < custoVento,
        `Véu: +${VEU2.bonusFD} por ${custoVeu} PM  ·  ` +
        `Vento Contrário: +${CONTRARIO.pmMax} por ${custoVento} PM`);
}

// ── 9. Vale a pena? ──
{
  const golpes = 700;
  const conta = (pm) => {
    let dano = 0;
    for (let s = 1; s <= golpes; s++) {
      const alvo = pm ? comVento(pm).A[0]
        : A.duelo({ seed: 3, politica: () => ({}),
            a: { carac: { F: 2, H: 2, R: 8, A: 2 }, elemento: 'Vento' },
            b: { carac: { F: 1, H: 0, R: 999, A: 0 } } }).A[0];
      const { atacante } = defensor();
      Object.assign(atacante.ficha, { F: 4, H: 3, R: 4, A: 1 });
      dano += M._c3resolver(atacante, alvo, null, 0, M._c3rng(s), {}, {}) || 0;
    }
    return dano / golpes;
  };
  const sem = conta(0), com = conta(5);
  A.ver('cinco PM por turno travam dano a sério',
        com < sem,
        `contra um atacante F4 H3: ${sem.toFixed(2)} → ${com.toFixed(2)} por golpe ` +
        `(${((1 - com / sem) * 100).toFixed(0)}% menos)`);
}

// ═══════════════════════════════════════════════════════════════════
const MORDIDA = M.MAGIAS['Sombra'].ataque.find(g => g.id === 'so_a3');

console.log('\n═══ MORDIDA VAMPÍRICA (so_a3) ═══');
console.log('  "Rouba 1d de vida por turno e passa direto para você."   ·   1 PM por turno\n');

/* Levanta a Mordida e deixa correr. Ninguém ataca ninguém: quero medir
   o roubo sozinho, sem o dano dos golpes a somar-se por cima. */
function mordida(pvMeu, pvDele, turnos, bolsa) {
  let lancou = false;
  const e = A.duelo({
    seed: 7,
    politica: (quem) => {
      if (quem.nome !== 'A' || lancou) return {};
      lancou = true; return { magia: MORDIDA, pm: 1 };
    },
    a: { carac: { F: 0, H: 0, R: 8, A: 9 }, elemento: 'Sombra',
         pm: bolsa == null ? 60 : bolsa, pmMax: bolsa == null ? 60 : bolsa, pv: pvMeu,
         magias: { ataque: MORDIDA, forte: MORDIDA, defesa: MORDIDA } },
    b: { carac: { F: 0, H: 0, R: 20, A: 9 }, pv: pvDele, iniciativa: 0 },
  });
  const roubos = [];
  for (let i = 0; i < turnos && !e.acabou; i++) {
    const antes = e.eventos.length;
    M.combate3dtTurno(e);
    for (const ev of e.eventos.slice(antes))
      if (ev.roubou != null && ev.lado === 'A') roubos.push(ev.roubou);
    if (!e.B[0].vivo) break;
  }
  return { e, roubos, eu: e.A[0], ele: e.B[0] };
}

// ── 1. O catálogo ──
A.ver('custa 1 PM por turno e rouba um dado',
      MORDIDA.pm === 1 && MORDIDA.porTurno === true && MORDIDA.roubaVida.dados === 1
      && !MORDIDA.fa,
      `pm=${MORDIDA.pm} porTurno=${MORDIDA.porTurno} dados=${MORDIDA.roubaVida.dados}`);

// ── 2. Rouba todo o turno, e é um dado ──
{
  const r = mordida(5, 400, 12);
  const media = r.roubos.reduce((a, b) => a + b, 0) / r.roubos.length;
  A.ver('rouba uma vez por turno, e a média é a de um dado',
        r.roubos.length >= 10 && Math.abs(media - 3.5) < 1.2,
        `${r.roubos.length} roubos: ${r.roubos.join(',')} · média ${media.toFixed(2)}`);
}

// ── 3. O que ele perde é o que eu ganho ──
{
  const pvMeu = 5, pvDele = 400;
  const r = mordida(pvMeu, pvDele, 6);
  const somaRoubos = r.roubos.reduce((a, b) => a + b, 0);
  A.ver('cada ponto que sai dele entra em mim',
        (pvDele - r.ele.pv) === somaRoubos && (r.eu.pv - pvMeu) === somaRoubos,
        `ele ${pvDele}→${r.ele.pv} · eu ${pvMeu}→${r.eu.pv} · somados ${somaRoubos}`);
}

/* ── 4. COM A VIDA CHEIA, ELE SANGRA E EU NÃO GANHO ──

   O motor tira ao alvo primeiro e só depois soma a mim, com o meu
   máximo a cortar o que sobra. Quem já está inteiro continua a drená-lo
   na mesma — o dano não se perde, o ganho é que se perde.

   É a leitura certa para uma magia que se chama mordida, e é a que o
   texto não faz: "passa direto para você" promete que nada se perde
   pelo caminho. */
{
  const r = mordida(40, 400, 6);       // R8 → 40 de vida: entro cheio
  const somaRoubos = r.roubos.reduce((a, b) => a + b, 0);
  A.ver('com a vida cheia, o alvo perde na mesma e eu não ganho nada',
        somaRoubos > 0 && r.eu.pv === 40 && (400 - r.ele.pv) === somaRoubos,
        `roubou ${somaRoubos} · ele 400→${r.ele.pv} · eu fiquei em ${r.eu.pv}/40`);
}

// ── 5. Não rouba mais do que ele tem ──
{
  const r = mordida(5, 2, 4);
  A.ver('não tira mais vida do que ainda existe no alvo',
        r.ele.pv === 0 && r.roubos.reduce((a, b) => a + b, 0) === 2,
        `ele entrou com 2 e saiu com ${r.ele.pv} · roubado ${r.roubos.join('+')}`);
}

// ── 6. E pode matar ──
{
  const r = mordida(5, 3, 6);
  A.ver('o roubo por si só derruba o alvo',
        !r.ele.vivo && r.ele.pv === 0,
        `vivo=${r.ele.vivo} pv=${r.ele.pv} · sem um único golpe trocado`);
}

// ── 7. Rouba sem precisar de atacar ──
// O drenar vive no ciclo do turno, não no golpe: acontece mesmo em
// turnos em que ninguém acerta em ninguém. É o que a torna barata a 1 PM.
{
  const r = mordida(5, 400, 5);
  const houveGolpe = r.e.eventos.some(ev => ev.fa != null && ev.dano > 0);
  A.ver('rouba mesmo sem trocar golpes',
        r.roubos.length >= 4 && !houveGolpe,
        `${r.roubos.length} roubos, ${houveGolpe ? 'com' : 'sem'} golpes pelo meio`);
}

// ── 8. Cai quando a bolsa seca ──
{
  const r = mordida(5, 400, 10, 4);
  A.ver('sem PM para a sustentar, a mordida larga',
        !r.eu.roubando && r.eu.sustentadas.length === 0,
        `roubou ${r.roubos.length} turnos com 4 PM · roubando=${!!r.eu.roubando}`);
}

// ── 9. Relançá-la substitui ──
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: MORDIDA, pm: 1 } : {},
    a: { carac: { F: 0, H: 0, R: 20, A: 9 }, elemento: 'Sombra', pm: 200, pmMax: 200, pv: 5,
         magias: { ataque: MORDIDA, forte: MORDIDA, defesa: MORDIDA } },
    b: { carac: { F: 0, H: 0, R: 999, A: 9 }, iniciativa: 0 },
  });
  const porTurno = [];
  for (let i = 0; i < 4; i++) {
    const antes = e.eventos.length;
    M.combate3dtTurno(e);
    porTurno.push(e.eventos.slice(antes).filter(ev => ev.roubou != null && ev.lado === 'A').length);
  }
  A.ver('quatro lançamentos continuam a roubar uma vez por turno',
        porTurno.every(n => n === 1) && e.A[0].sustentadas.length === 1,
        `roubos por turno: ${porTurno.join(',')}`);
}

// ── 10. Quanto vale, ao todo ──
// Um dado por turno, por um PM. Fica escrito porque é o preço mais
// barato do catálogo para o efeito mais completo — tira e dá ao mesmo
// tempo — e é o número que a frase não põe em contexto.
{
  const r = mordida(5, 400, 20, 60);
  const soma = r.roubos.reduce((a, b) => a + b, 0);
  A.ver('vinte turnos de mordida, e o que isso move',
        soma > 0,
        `${r.roubos.length} turnos · ${soma} de vida trocada de lado · ` +
        `${r.roubos.length} PM gastos`);
}

// ═══════════════════════════════════════════════════════════════════
const CEGUEIRA = M.MAGIAS['Sombra'].ataque.find(g => g.id === 'so_a4');

console.log('\n═══ VÉU DE CEGUEIRA (so_a4) ═══');
console.log('  "Quem não resistir bate com −1 e esquiva com −3 até o fim da luta."   ·   3 PM\n');

/* Lança o Véu contra um alvo de Resistência escolhida e conta o que
   aconteceu. Sem Resistência nenhuma, cega sempre — o que serve para
   isolar os efeitos da cegueira do acaso do teste. */
function cegar(R, voltas) {
  let cegou = 0, resistiu = 0, jaCego = 0, danoTotal = 0;
  for (let s = 1; s <= (voltas || 300); s++) {
    const e = A.duelo({
      seed: s,
      politica: (quem) => (quem.nome === 'A') ? { magia: CEGUEIRA, pm: 3 } : {},
      a: { carac: { F: 2, H: 9, R: 4, A: 1 }, elemento: 'Sombra', pm: 60, pmMax: 60,
           iniciativa: 99, magias: { ataque: CEGUEIRA, forte: CEGUEIRA, defesa: CEGUEIRA } },
      b: { carac: { F: 2, H: 3, R, A: 1 }, pv: 300, iniciativa: 0 },
    });
    M.combate3dtTurno(e);
    const ev = e.eventos.find(v => v.lado === 'A' && v.magia === 'so_a4');
    if (!ev) continue;
    if (ev.cegou) cegou++;
    if (ev.resistiu) resistiu++;
    if (ev.jaCego) jaCego++;
    danoTotal += (ev.dano || 0);
  }
  return { cegou, resistiu, jaCego, danoTotal, voltas: voltas || 300 };
}

// Um combatente com a cegueira posta à mão, para medir o efeito puro.
function cego(carac) {
  const c = A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: carac || { F: 4, H: 4, R: 8, A: 1 } },
    b: { carac: { F: 1, H: 0, R: 99, A: 0 } } }).A[0];
  c.cegoAtaque = CEGUEIRA.cegueira.ataque;
  c.cegoEsquiva = CEGUEIRA.cegueira.esquiva;
  return c;
}
function vendo(carac) {
  return A.duelo({ seed: 3, politica: () => ({}),
    a: { carac: carac || { F: 4, H: 4, R: 8, A: 1 } },
    b: { carac: { F: 1, H: 0, R: 99, A: 0 } } }).A[0];
}

// ── 1. O catálogo ──
A.ver('custa 3 PM e não fere',
      CEGUEIRA.pm === 3 && !CEGUEIRA.fa && CEGUEIRA.cegueira.ataque === 1
      && CEGUEIRA.cegueira.esquiva === 3,
      `pm=${CEGUEIRA.pm} fa=${CEGUEIRA.fa ? 'sim' : 'não'} ` +
      `ataque=−${CEGUEIRA.cegueira.ataque} esquiva=−${CEGUEIRA.cegueira.esquiva}`);

// ── 2. Um teste de Resistência decide ──
{
  const nu = cegar(0, 300), duro = cegar(5, 400);
  A.ver('sem Resistência cega sempre; com 5 escapa quase sempre',
        nu.cegou === nu.voltas && duro.resistiu > duro.cegou,
        `R0: ${nu.cegou} de ${nu.voltas} · R5: ${duro.cegou} cegos, ${duro.resistiu} resistiram`);
  A.ver('e não tira um único ponto de vida',
        nu.danoTotal === 0, `dano somado: ${nu.danoTotal}`);
}

/* ── 3. O "−3 NA ESQUIVA" é verdade, e dói ── */
{
  const conta = (quem) => {
    let fugiu = 0;
    for (let s = 1; s <= 1200; s++) {
      const atacante = A.duelo({ seed: s, politica: () => ({}),
        a: { carac: { F: 4, H: 2, R: 4, A: 1 } },
        b: { carac: { F: 1, H: 0, R: 99, A: 0 } } }).A[0];
      const d = quem();
      const ev = {};
      M._c3resolver(atacante, d, null, 0, M._c3rng(s), ev, {});
      if (ev.esquivou) fugiu++;
    }
    return fugiu / 1200;
  };
  const vê = conta(() => vendo({ F: 4, H: 5, R: 8, A: 1 }));
  const nãoVê = conta(() => cego({ F: 4, H: 5, R: 8, A: 1 }));
  A.ver('quem está cego esquiva muito menos',
        nãoVê < vê,
        `${(vê * 100).toFixed(0)}% → ${(nãoVê * 100).toFixed(0)}% dos golpes esquivados`);
}

/* ── 4. O "BATE COM −1" É VERDADE, E VALE POR DOIS ──

   Eu esperava que não fosse. O cegoAtaque aparece num sítio só quando
   se procura pelo nome — o _c3hAtk — e daí concluí que só afectava a
   esquiva de quem leva, deixando a Força de Ataque intacta. Escrevi a
   prova a afirmar isso e ela deu falha: FA 9 a ver, 8 cego.

   O que me escapou foi que o próprio _c3fa CHAMA o _c3hAtk para a
   parcela da Habilidade. Portanto o −1 desce duas coisas ao mesmo
   tempo, com uma linha só: a Força de Ataque de quem está cego, e a
   dificuldade que ele impõe a quem tenta esquivá-lo.

   É por isto que estas provas se escrevem a afirmar e não a perguntar.
   Uma que só perguntasse "quanto vale?" tinha-me dado o número e eu
   tinha-o escrito no texto sem reparar em nada. */
{
  const alvo = A.duelo({ seed: 1, politica: () => ({}),
    a: { carac: { F: 1, H: 1, R: 99, A: 0 } },
    b: { carac: { F: 1, H: 1, R: 99, A: 0 } } }).A[0];
  const fa = (quem) => M._c3fa(quem, null, 0, M._c3rng(41), { alvo }).total;
  A.ver('quem está cego bate com um ponto a menos, como o texto diz',
        fa(cego()) === fa(vendo()) - 1,
        `FA ${fa(vendo())} a ver → ${fa(cego())} cego`);

  // E a mesma linha faz a segunda coisa: o cego dificulta menos a
  // esquiva de quem tenta fugir-lhe.
  const pen = (quem) => M._c3hAtk(quem, vendo());
  A.ver('e o mesmo −1 deixa-o mais fácil de esquivar',
        pen(cego()) === pen(vendo()) - 1,
        `penalidade que ele impõe à esquiva alheia: ${pen(vendo())} → ${pen(cego())}`);
}

// ── 5. Cegar duas vezes não cega a dobrar ──
// Há um guarda no motor com um comentário de quem lá bateu: "a cegueira
// chegava a −27 na esquiva por acumular".
{
  const e = A.duelo({
    seed: 3,
    politica: (quem) => (quem.nome === 'A') ? { magia: CEGUEIRA, pm: 3 } : {},
    a: { carac: { F: 2, H: 9, R: 4, A: 1 }, elemento: 'Sombra', pm: 60, pmMax: 60,
         iniciativa: 99, magias: { ataque: CEGUEIRA, forte: CEGUEIRA, defesa: CEGUEIRA } },
    b: { carac: { F: 2, H: 3, R: 0, A: 1 }, pv: 900, iniciativa: 0 },
  });
  const trilho = [];
  for (let i = 0; i < 5; i++) { M.combate3dtTurno(e); trilho.push('−' + e.B[0].cegoEsquiva); }
  A.ver('quem já está cego não fica mais cego',
        e.B[0].cegoEsquiva === 3 && e.B[0].cegoAtaque === 1, trilho.join(' → '));
}

// ── 6. Até ao fim da luta, e é mesmo até ao fim ──
{
  const e = A.duelo({
    seed: 3,
    politica: (quem, alvo) => (quem.nome === 'A' && !alvo.cegoEsquiva)
      ? { magia: CEGUEIRA, pm: 3 } : {},
    a: { carac: { F: 2, H: 9, R: 4, A: 1 }, elemento: 'Sombra', pm: 60, pmMax: 60,
         iniciativa: 99, magias: { ataque: CEGUEIRA, forte: CEGUEIRA, defesa: CEGUEIRA } },
    b: { carac: { F: 2, H: 3, R: 0, A: 1 }, pv: 900, iniciativa: 0 },
  });
  for (let i = 0; i < 15 && !e.acabou; i++) M.combate3dtTurno(e);
  A.ver('quinze turnos depois, continua cego',
        e.B[0].cegoEsquiva === 3,
        `−${e.B[0].cegoEsquiva} na esquiva, sem nada a repor`);
}

/* A marca CEGO no cartão não se prova daqui: este arnês carrega o i18n
   das magias e das vantagens, e o texto do combate vive noutro ficheiro
   que ele não conhece. A prova que eu tinha escrito lia uma chave em
   falta e dava falha a acusar o jogo de não ter a palavra — quando o
   jogo a tem e era o teste que a procurava no sítio errado. */

// ── Relatório ──
const { ok, mau, linhas } = A.relatorio();
console.log('');
for (const [tag, nome, det] of linhas) console.log(tag + ' ' + nome + (det ? '   · ' + det : ''));
console.log('\n─────────────────────────────');
console.log(`${ok} passaram · ${mau} falharam`);
