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

// ── Relatório ──
const { ok, mau, linhas } = A.relatorio();
console.log('');
for (const [tag, nome, det] of linhas) console.log(tag + ' ' + nome + (det ? '   · ' + det : ''));
console.log('\n─────────────────────────────');
console.log(`${ok} passaram · ${mau} falharam`);
