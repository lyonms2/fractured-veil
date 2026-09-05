// ═══════════════════════════════════════════════════════════════════
// MOTOR DE COMBATE — regras do 3D&T Alpha
//
//   combate3dtSimular(equipaA, equipaB, seed) → { vencedor, turnos, eventos }
//
// Determinístico: a mesma semente dá sempre a mesma batalha. É isso que
// permite ao servidor reconferir um resultado de PvP sem confiar no
// cliente, e reproduzir um bug a partir do resultado.
//
// ── O TURNO (manual, cap. Combate) ──
//   Iniciativa   1d + H, rolada UMA VEZ no primeiro turno e mantida até
//                ao fim. Empate resolve pela H maior; persistindo, agem
//                ao mesmo tempo.
//   Ação        atacar ou lançar uma magia. Uma por turno.
//   Movimento    quase tudo o que não seja atacar ou magiar (usar um
//                item, por exemplo). Um por turno, e não impede a ação.
//   Esquiva      REACÇÃO. Não é ação nem movimento, e não espera a vez.
//                Máximo de tentativas por turno igual à própria H.
//
// ── AS CONTAS ──
//   FA = H + F + 1d        (ou a fórmula da magia, se for magia)
//   FD = H + A + 1d
//   dano = FA − FD, e se a FD igualar ou passar a FA não há dano nenhum
//
//   Crítico: sai 6 no dado da FA ou da FD. Dobra a FORÇA (na FA) ou a
//   ARMADURA (na FD) — a Habilidade nunca é dobrada.
//
//   Esquiva: teste de H com penalidade igual à H do ATACANTE. Rola 1d e
//   passa se sair igual ou menor; 6 é sempre falha. Um H2 nunca esquiva
//   de um H2 ou maior — nem se rola o dado.
// ═══════════════════════════════════════════════════════════════════

const C3_MAX_TURNOS = 60;

// ═══════════════════════════════════════════════════════════════════
// Dado e gerador
// ═══════════════════════════════════════════════════════════════════
function _c3rng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x4D2B) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s >>> 8) / 16777216;
  };
}
const _d6 = rng => 1 + Math.floor(rng() * 6);

// ═══════════════════════════════════════════════════════════════════
// COMBATENTE
// ═══════════════════════════════════════════════════════════════════
function _c3criar(slot, rng) {
  const f = fichaDeAvatar(slot);
  f.seed = slot.seed || 0;
  const m = magiasDoAvatar(f);
  return {
    ficha: f, magias: m,
    vant: f.vantagem || null, desv: f.desvantagem || null,
    nome: (slot.nome || 'Avatar').split(',')[0].trim(),
    pv: f.pv, pvMax: f.pv,
    pm: f.pm, pmMax: f.pm,
    vivo: true,
    // A iniciativa é rolada uma vez só e mantida até ao fim da luta.
    iniciativa: _d6(rng) + f.H,
    // A Sombra Faminta aparece — ou não — no início de cada batalha.
    // É a única coisa da ficha que muda de luta para luta, e é por isso
    // que ela existe: dois combates com o mesmo avatar não são iguais.
    assombrado: !!(f.desvantagem && f.desvantagem.assombraEm
                   && _d6(rng) >= f.desvantagem.assombraEm),
    semFoco: false,       // Foco Frágil: o foco caiu, não há magia
    folegoUsado: 0,       // Segundo Fôlego: quantas vezes já se curou
    golpesExtra: 0,       // Golpe Encadeado: golpes a mais neste turno
    esquivas: 0,          // tentativas gastas neste turno
    bonusA: 0,            // armadura extra de magia sustentada
    bonusFD: 0,           // bónus direto à Força de Defesa
    bonusF: 0,            // Força extra de magia sustentada
    bonusH: 0,            // Habilidade extra (fúria)
    // Os quatro acima são a SOMA de tudo. Estes são a parte que NÃO vem
    // de magia sustentada — a Reserva Oculta que já se pagou, a fúria do
    // Sangue Quente. Sem esta separação, largar um escudo levava também
    // os 5 pontos de Reserva Oculta que custaram 10 PM, e o avatar não
    // os podia comprar outra vez porque a conta já estava gasta.
    perm: { F: 0, H: 0, A: 0, FD: 0 },
    furia: false,         // em fúria: bate mais, mas não esquiva nem magia
    furiaDesv: false,     // a fúria veio do Sangue Quente, não de magia
    penalidade: 0,        // −N em todas as características (veneno)
    penalidadeR: 0,       // −N só na Resistência
    sustentadas: [],      // [{ magia, pm }] a pagar todo o turno
    veneno: false,
    indefeso: false,      // não usa a H na Defesa neste turno
    // Congelado é MAIS do que indefeso: indefeso é não se defender bem,
    // congelado é não fazer nada. Ficam separados porque o Toque
    // Paralisante promete só a primeira coisa — "sem esquivar nem se
    // defender direito" — e não devia ganhar a segunda de borla.
    congelado: false,     // preso no gelo: não age de todo
    congeladoTurnos: 0,
    fora: false,          // petrificado, congelado, alma destruída
    invulneravel: false,  // corpo elemental sustentado: o dano não entra
    barreira: 0,          // escudo de pontos que come dano até esgotar
    imuneEspiritual: false,// alma fechada: petrificar/congelar não pega
    ocultado: false,      // véu: a Habilidade conta a dobrar na Defesa
    bonusEsquiva: 0,      // corrente de ar: +N no teste de esquiva
    armaduraDobrada: false,// casca de Helena: a Armadura conta a dobrar
    cegoAtaque: 0,        // cegueira: −N na Habilidade para bater
    cegoEsquiva: 0,       // cegueira: −N na Habilidade para esquivar
    vorpal: false,        // o crítico pode decapitar
  };
}

// Característica efetiva, já com penalidades
function _c3(c, k) {
  return _c3detalhe(c, k).valor;
}

// A mesma conta, decomposta: o que a ficha diz e o que o combate lhe
// somou ou tirou. Serve para o cartão poder escrever "F2−1" em vez de
// só "F1" — o jogador vê que aquilo já foi 2 e porquê.
//
// O modificador é o CRU, sem o corte no zero: uma penalidade de −3 sobre
// uma Força 1 mostra −3, e não −1. É o que está acontecendo ao avatar.
function _c3detalhe(c, k) {
  const base = c.ficha[k];
  let mod = 0;
  if (k === 'F') mod += c.bonusF;
  if (k === 'A') mod += c.bonusA;
  if (k === 'H') mod += c.bonusH;
  mod -= c.penalidade;
  // A assombração pesa −1 em todas as características até ao fim da luta
  if (c.assombrado && c.desv && c.desv.penalidadeTudo) mod -= c.desv.penalidadeTudo;
  if (k === 'R') mod -= c.penalidadeR;
  return { base, mod, valor: Math.max(0, base + mod) };
}

// ═══════════════════════════════════════════════════════════════════
// AS CARACTERÍSTICAS "CONTRA QUEM"
//
// A maioria das características vale sempre o mesmo. Estas três não:
// dependem de quem está do outro lado, porque há desvantagens que dão
// vantagem AO ADVERSÁRIO em vez de tirarem algo a quem as tem.
// ═══════════════════════════════════════════════════════════════════

// A Habilidade que este atacante usa contra ESTE defensor.
// O Ponto Fraco do defensor entrega H+1 a quem o enfrenta.
function _c3hAtk(atk, def) {
  return Math.max(0, _c3(atk, 'H') - atk.cegoAtaque)
       + ((def && def.desv && def.desv.inimigoGanhaH) || 0);
}

// A Armadura que este defensor usa contra ESTE atacante.
// O Brilho Inofensivo do atacante entrega A+1 a quem se defende dele.
function _c3aDef(def, atk) {
  return _c3(def, 'A') + ((atk && atk.desv && atk.desv.inimigoGanhaA) || 0);
}

// O valor do teste de Resistência para escapar a um efeito de magia.
// Somam-se aqui, num sítio só, três coisas que puxam em sentidos
// opostos — senão ficavam espalhadas e uma delas acabava esquecida.
function _c3rResistir(def, atk, ehVeneno) {
  return _c3resistirDetalhe(def, atk, ehVeneno).valor;
}

// A mesma conta, mas mostrando as parcelas. Serve para o registo poder
// escrever "R3 +2 −1 = 4" em vez de só dizer que o alvo resistiu: quem
// perde um efeito por um ponto tem direito a saber qual foi o ponto.
function _c3resistirDetalhe(def, atk, ehVeneno) {
  let v = _c3(def, 'R');
  const partes = ['R' + v];
  // Brilho Inofensivo: a magia é tão bonita que custa a levar a sério
  if (atk && atk.desv && atk.desv.inimigoGanhaR) {
    v += atk.desv.inimigoGanhaR; partes.push('+' + atk.desv.inimigoGanhaR);
  }
  // Alma Rija: +2 contra magia — mas o manual exclui veneno de propósito
  if (def.vant && def.vant.bonusTesteMagia && !(ehVeneno && def.vant.excetoVeneno)) {
    v += def.vant.bonusTesteMagia; partes.push('+' + def.vant.bonusTesteMagia);
  }
  // Magia Perfurante: quem lança torna-a mais difícil de resistir
  if (atk && atk.vant && atk.vant.penalidadeTesteAlvo) {
    v -= atk.vant.penalidadeTesteAlvo; partes.push('−' + atk.vant.penalidadeTesteAlvo);
  }
  return { valor: v, partes };
}

// ═══════════════════════════════════════════════════════════════════
// UM TESTE, COM A CONTA À VISTA
//
// O _c3teste devolve só sim ou não e deita o dado fora. Este guarda
// tudo no evento, para o registo poder mostrar a rolagem como já mostra
// a Força de Ataque contra a Força de Defesa. Um jogador que perca o
// veneno por um ponto tem de ver esse ponto.
// ═══════════════════════════════════════════════════════════════════
function _c3testeReg(valor, rng, ev, rotulo, partes, de) {
  const d = _d6(rng);
  const passou = d !== 6 && d <= valor;
  if (ev) {
    (ev.testes = ev.testes || []).push({
      // De quem é a característica que rolou. Quase todos os testes são
      // do ALVO — é ele que resiste, que esquiva, que segura o foco — e
      // sem isto o "R3" parecia ser de quem lançou a magia.
      rotulo, valor, dado: d, passou, de: de || 'alvo',
      // um 6 falha sempre, por mais alta que seja a característica
      seis: d === 6 && valor >= 6,
      partes: partes || [String(valor)],
    });
  }
  return passou;
}

// ═══════════════════════════════════════════════════════════════════
// TESTE DE CARACTERÍSTICA (manual)
// Rola 1d; passa se sair IGUAL OU MENOR que a característica. Um 6 é
// sempre falha, por mais alta que ela seja.
// ═══════════════════════════════════════════════════════════════════
function _c3teste(valor, rng) {
  const d = _d6(rng);
  return d !== 6 && d <= valor;
}

// ═══════════════════════════════════════════════════════════════════
// ESQUIVA — reação, com penalidade igual à H do atacante
// ═══════════════════════════════════════════════════════════════════
// O Passo Rápido soma 1 à Habilidade só para esquivar
function _c3bonusEsquiva(def) {
  return ((def.vant && def.vant.bonusEsquiva) ? def.vant.bonusEsquiva : 0)
       + (def.bonusEsquiva || 0);        // corrente de ar sustentada
}

/* ── O VALOR DE UMA ESQUIVA, NUM SÍTIO SÓ ──

   A pergunta "posso esquivar?" e a conta "esquivei?" usavam a mesma
   fórmula escrita duas vezes. Passam a partilhá-la: duas cópias de uma
   conta acabam sempre por divergir, e esta ganhou agora uma condição a
   mais.

   Quem está INDEFESO não usa a Habilidade — nem para se defender, nem
   para saltar para o lado. É o mesmo zero que o _c3fd já aplicava na
   Força de Defesa, agora também aqui. */
function _c3esquivaValor(def, atk) {
  const h = def.indefeso ? 0 : _c3(def, 'H');
  return h - def.cegoEsquiva + _c3bonusEsquiva(def) - _c3hAtk(atk, def);
}

/* ── QUEM PODE TENTAR ──

   A fúria e o gelo PROÍBEM: um por não ouvir ninguém, o outro por não
   se mexer de todo.

   A paralisia não proíbe — REDUZ. Antes proibia, e era demais para o
   que a vantagem promete: "retira pontos de defesa e reduz a esquiva".
   Agora tira-lhe a Habilidade das duas contas e deixa-o tentar com o
   que sobrar. Na prática um paralisado sem mais nada continua sem
   escapar — zero menos a Habilidade de quem bate dá negativo — mas um
   Passo Rápido ou umas Correntes Desviantes já o salvam, e é isso que
   separa reduzir de proibir: fica contra-jogo. */
function _c3podeEsquivar(def, atk) {
  if (def.furia) return false;                       // em fúria não se esquiva
  if (def.congelado) return false;                   // preso no gelo: não reage
  if (def.esquivas >= _c3(def, 'H')) return false;   // já gastou as deste turno
  return _c3esquivaValor(def, atk) >= 1;
}

function _c3esquivou(def, atk, rng, ev) {
  def.esquivas++;
  const h = def.indefeso ? 0 : _c3(def, 'H');
  const bonus = _c3bonusEsquiva(def), pen = _c3hAtk(atk, def);
  const partes = ['H' + h];
  if (def.indefeso) partes.push('travado');
  if (def.cegoEsquiva) partes.push('−' + def.cegoEsquiva);
  if (bonus) partes.push('+' + bonus);
  partes.push('−H' + pen);
  return _c3testeReg(_c3esquivaValor(def, atk), rng, ev, 'esquiva', partes);
}

// ═══════════════════════════════════════════════════════════════════
// FORÇA DE ATAQUE
// ═══════════════════════════════════════════════════════════════════
/* A FA e a FD passam a dizer DE ONDE vem o total.

   Devolviam só { total, dado, critico }, e o registo escrevia
   "FA 11★ − FD 4 = 7". Quem lê isso não sabe se os 11 vieram de uma
   Habilidade alta, de uma Força alta ou de um seis no dado — e num jogo
   onde a ficha é a única coisa que o jogador controla, essa é a
   pergunta que interessa.

   Cada parcela é { r: rótulo, v: valor }, e a do dado leva dado:true
   para o registo lhe poder dar outra cor: é a única que não depende de
   nada que o jogador tenha feito. */
function _c3fa(atk, magia, pmGastos, rng, opts) {
  opts = opts || {};
  const d = _d6(rng);
  const critico = d === 6;                 // o crítico dobra a FORÇA, não a H

  // Toque de Energia: FA = Armadura + 1d + PMs gastos. A Habilidade não
  // entra — é a única forma de ataque do manual que a dispensa, e é o
  // que a torna útil a quem tem a Armadura alta e a Força baixa.
  if (opts.toque) {
    const A = critico ? _c3(atk, 'A') * 2 : _c3(atk, 'A');
    // O ×2 não entra no rótulo: 'A×2' com o valor 14 ao lado lê-se
    // 'A×214', que não é número nenhum. Vai como bandeira à parte.
    const partes = [{ r: 'A', v: A, x2: critico }, { r: 'd', v: d, dado: true }];
    if (opts.toquePM) partes.push({ r: 'PM', v: opts.toquePM });
    return { total: A + d + (opts.toquePM || 0), dado: d, critico, partes };
  }

  if (!magia) {
    // O Golpe Carregado soma-se à Força ANTES de o crítico a dobrar:
    // o manual manda dobrar a Força, e neste golpe ela está aumentada.
    const base = _c3(atk, 'F') + (opts.bonusF || 0);
    const F = critico ? base * 2 : base;
    const H = _c3hAtk(atk, opts.alvo);
    const partes = [{ r: 'H', v: H }];
    // A carga já está dentro do valor da F, e o nome da acção diz que
    // foi um golpe carregado — não precisa de a repetir no rótulo.
    partes.push({ r: 'F', v: F, x2: critico });
    partes.push({ r: 'd', v: d, dado: true });
    return { total: H + F + d, dado: d, critico, partes };
  }
  // Magia: a fórmula substitui o F, e o crítico não a dobra (o manual só
  // manda dobrar Força, Armadura ou PdF).
  const f = magia.fa || {};
  const extra = pmGastos - magia.pm;
  const dados = (f.dados || 0) + Math.floor(extra * (f.dadosPorPM || 0));
  const partes = [];
  const _F = f.F ? _c3(atk, 'F') : 0;
  const _H = f.H ? _c3hAtk(atk, opts.alvo) : 0;
  const _fx = (f.fixo || 0) + Math.floor(extra * (f.fixoPorPM || 0));
  if (_F)  partes.push({ r: 'F', v: _F });
  if (_H)  partes.push({ r: 'H', v: _H });
  if (_fx) partes.push({ r: 'fixo', v: _fx });
  let soma = _F + _H + _fx;
  // Conjuro Desajeitado: a magia sai com Força de Ataque −1
  if (atk.desv && atk.desv.faMagiaMenos) {
    soma -= atk.desv.faMagiaMenos;
    partes.push({ r: 'desajeitado', v: -atk.desv.faMagiaMenos });
  }
  // Cada dado da magia entra na conta pelo seu valor: dois dados que dão
  // 3 e 6 não são "2d", são um 3 e um 6, e a diferença explica o turno.
  for (let i = 0; i < dados; i++) {
    const dd = _d6(rng);
    soma += dd;
    partes.push({ r: 'd', v: dd, dado: true });
  }
  // Magias sem dados próprios usam o dado normal do ataque
  if (!dados) { soma += d; partes.push({ r: 'd', v: d, dado: true }); }
  return { total: soma, dado: d, critico: dados ? false : critico, partes };
}

// ═══════════════════════════════════════════════════════════════════
// FORÇA DE DEFESA
// ═══════════════════════════════════════════════════════════════════
function _c3fd(def, rng, opts) {
  opts = opts || {};
  const d = _d6(rng);
  const critico = d === 6;                 // o crítico dobra a ARMADURA
  let A = opts.ignoraArmadura ? 0 : _c3aDef(def, opts.atacante);

  /* Couraça e Ferida agem contra uma GAVETA de magia. Só valem contra
     magia dessa gaveta — um murro é dano físico e nenhuma das duas o
     vê, e é por isso que o golpe comum continua a servir contra quem
     tem couraça.

     `magica` e `papel` entram separados de propósito. Eram a mesma
     coisa — o elemento do atacante respondia às duas perguntas — e
     isso escondia uma confusão: o Toque de Energia é magia mas não sai
     de gaveta nenhuma, e a Casca de Helena precisa de saber se é magia
     sem lhe interessar de que gaveta veio. */
  if (opts.papel) {
    if (def.vant && def.vant.armaduraDobra && def.vant.papel === opts.papel) A *= 2;
    if (def.desv && def.desv.armaduraZero  && def.desv.papel === opts.papel) A = 0;
  }
  // A Casca de Helena dobra a Armadura contra tudo o que não seja magia
  if (def.armaduraDobrada && !opts.magica) A *= 2;
  if (critico) A *= 2;
  // Alvo indefeso não usa a Habilidade na Defesa
  let H = (opts.indefeso || def.indefeso) ? 0 : _c3(def, 'H');
  if (def.ocultado) H *= 2;              // véu de água: some na Defesa
  const partes = [];
  partes.push({ r: 'H', v: H, x2: !!def.ocultado && H > 0 });
  partes.push({ r: 'A', v: A, x2: critico });
  partes.push({ r: 'd', v: d, dado: true });
  if (def.bonusFD) partes.push({ r: 'bónus', v: def.bonusFD });
  return { total: H + A + d + def.bonusFD, dado: d, critico, partes };
}

// ═══════════════════════════════════════════════════════════════════
// UM ATAQUE COMPLETO
// ═══════════════════════════════════════════════════════════════════
function _c3resolver(atk, def, magia, pmGastos, rng, ev, extra) {
  extra = extra || {};
  const fa = _c3fa(atk, magia, pmGastos, rng,
                   { alvo: def, bonusF: extra.bonusF, toque: extra.toque, toquePM: extra.toquePM });

  // O defensor pode tentar esquivar antes de rolar a Defesa
  if (_c3podeEsquivar(def, atk) && !(magia && magia.alvoIndefeso)) {
    if (_c3esquivou(def, atk, rng, ev)) {
      ev.esquivou = true; ev.fa = fa.total; ev.dano = 0;
      ev.faPartes = fa.partes;
      return 0;
    }
  }

  // O Reflexo dobra a Habilidade na Defesa deste golpe. Custa PM e
  // conta como esquiva — não se pode usar mais vezes por turno do que
  // a própria Habilidade permite.
  let reflexo = 0;
  if (def.vant && def.vant.habilidadeDobra && def.pm >= def.vant.pm
      && def.esquivas <= _c3(def, 'H') && !def.furia) {
    def.pm -= def.vant.pm; def.esquivas++;
    reflexo = _c3(def, 'H');            // a H a contar a dobrar
    ev.reflexo = true;
  }

  const fd = _c3fd(def, rng, {
    ignoraArmadura: !!(magia && magia.ignoraArmadura),
    indefeso: !!(magia && magia.alvoIndefeso),
    // O Toque de Energia é magia pela pele: conta como magia, mas não
    // sai de gaveta nenhuma e por isso não traz papel.
    magica: !!(magia || extra.toque),
    papel: magia ? papelDaMagia(magia) : null,
    atacante: atk,
  });

  const totalFD = fd.total + reflexo;
  const dano = Math.max(0, fa.total - totalFD);

  // O Reflexo Espelhado devolve o golpe se a defesa o segurou por inteiro
  if (reflexo && dano === 0 && def.vant.devolve) {
    const volta = Math.max(0, fa.total - (_c3(atk, 'H') + _c3aDef(atk, def)));
    atk.pv = Math.max(0, atk.pv - volta);
    if (atk.pv === 0) { atk.vivo = false; ev.matouAtacante = true; }
    ev.devolveu = volta;
  }

  // Corpo elemental e barreira comem o golpe antes de ele chegar aos PV
  let passou = dano;
  if (passou > 0 && def.invulneravel) { ev.absorveuTudo = true; passou = 0; }
  if (passou > 0 && def.barreira > 0) {
    const comido = Math.min(def.barreira, passou);
    def.barreira -= comido; passou -= comido;
    ev.barreiraComeu = comido;
    if (def.barreira === 0) ev.barreiraCaiu = true;
  }
  def.pv = Math.max(0, def.pv - passou);
  if (def.pv === 0) def.vivo = false;

  ev.fa = fa.total; ev.fd = totalFD; ev.dano = passou; ev.danoBruto = dano;
  ev.criticoAtk = fa.critico; ev.criticoDef = fd.critico;
  // As parcelas seguem para o registo poder abrir a conta.
  ev.faPartes = fa.partes; ev.fdPartes = fd.partes;

  // Ataque Vorpal: num crítico que vença a Defesa, o alvo testa a
  // Armadura. Falhando, acabou — não é dano, é o fim.
  if (atk.vorpal && fa.critico && passou > 0 && def.vivo) {
    if (!_c3testeReg(_c3(def, 'A'), rng, ev, 'vorpal', ['A' + _c3(def, 'A')])) {
      def.vivo = false; def.pv = 0; ev.decapitou = true;
    } else ev.aguentouVorpal = true;
  }

  // O Foco Frágil deixa cair o objeto que canaliza a magia. Sem ele
  // não se lança nada até se gastar um turno a apanhá-lo.
  if (passou > 0 && def.vivo && def.desv && def.desv.perdeFocoAoSofrerDano && !def.semFoco) {
    if (!_c3testeReg(_c3(def, 'H'), rng, ev, 'foco', ['H' + _c3(def, 'H')])) {
      def.semFoco = true; ev.perdeuFoco = true;
    }
  }

  // O Sangue Quente perde a cabeça ao levar dano: testa Resistência e,
  // falhando, entra em fúria — bate mais, mas não esquiva nem magia.
  if (passou > 0 && def.vivo && def.desv && def.desv.furiaAoSofrerDano && !def.furia) {
    if (!_c3testeReg(_c3(def, 'R'), rng, ev, 'furia', ['R' + _c3(def, 'R')])) {
      def.furia = true; def.furiaDesv = true;
      def.perm.F += 1; def.perm.H += 1; def.bonusF += 1; def.bonusH += 1;
      ev.enfureceu = true;
    }
  }
  return passou;
}

// ═══════════════════════════════════════════════════════════════════
// EFEITOS DE MAGIA que não são dano direto
// ═══════════════════════════════════════════════════════════════════
/* O `curado` é quem recebe a cura, e por omissão é quem lança.

   Existe por causa da Maré Compartilhada: a cura sempre entrou no
   próprio corpo porque nunca houve outro sítio para onde a mandar, e
   agora há. Passa como argumento em vez de campo no evento para o
   caminho antigo não mudar de forma nenhuma. */
function _c3aplicarEfeitos(atk, def, magia, pmGastos, dano, rng, ev, curado) {
  if (!magia) return;

  // Veneno: teste de R com penalidade; falhando, −1 em tudo e sangra
  if (magia.veneno) {
    // Um efeito que precisa de ferir e não feriu tem de o dizer. Antes
    // ficava em silêncio e o jogador não sabia se a magia estava
    // avariada, se o alvo resistiu, ou se nem chegou a haver teste.
    const r = _c3resistirDetalhe(def, atk, true);
    if (magia.veneno.testeR) r.partes.push((magia.veneno.testeR > 0 ? '+' : '−') + Math.abs(magia.veneno.testeR));
    if (dano <= 0) ev.semDano = true;
    // "Uma vítima ENVENENADA sofre uma penalidade de −1 em todas as suas
    // características" — é um estado, não um contador. Envenenar duas
    // vezes deixa a vítima envenenada, não duplamente envenenada. Sem
    // isto a penalidade acumulava sem limite e chegava a −5 em tudo.
    else if (def.veneno) ev.jaEnvenenado = true;
    else if (!_c3testeReg(r.valor + (magia.veneno.testeR || 0), rng, ev, 'veneno', r.partes)) {
      def.veneno = true; def.penalidade += magia.veneno.penalidade || 1;
      ev.envenenou = true;
    } else ev.resistiuVeneno = true;
  }
  // Dor persistente: −1 de Resistência até ao fim do combate
  // A dor persistente é a única que ACUMULA de propósito: o manual diz
  // "−1 em Resistência até ao fim do combate" e a magia existe para
  // enfraquecer aos poucos. Fica naturalmente travada quando a
  // Resistência chega a zero.
  if (magia.debuffR) {
    if (dano > 0) { def.penalidadeR += magia.debuffR; ev.enfraqueceu = true; }
    else ev.semDano = true;
  }

  // Tirar de combate sem passar pelos PV. Não é dano: é um teste de
  // Resistência e acabou. É o que o motor antigo não sabia fazer.
  if (magia.petrifica || magia.congela || magia.destroiAlma) {
    if (def.imuneEspiritual) ev.imunizou = true;
    else {
      const r = _c3resistirDetalhe(def, atk, false);
      if (!_c3testeReg(r.valor, rng, ev, 'fora', r.partes)) { def.fora = true; def.vivo = false; ev.fora = true; }
      else ev.resistiu = true;
    }
  }

/* ── ERGUER OUTRA VEZ O QUE JÁ ESTÁ DE PÉ SUBSTITUI, NÃO SOMA ──

   A lista das sustentadas foi feita para ter uma entrada por magia, e
   o _c3recalcular soma tudo o que lá estiver. Empurrar uma segunda
   entrada da MESMA magia fazia o bónus dela contar duas vezes: o
   Casulo de Marés passava do tecto de +5 para +10 e +15, a Pele de
   Pedra ia de +2 a +6, e o Véu de Correntes — que não cobra nada por
   turno — subia +10 de Força de Defesa por cada vez que se carregasse
   no botão, de graça e para sempre.

   A política do motor já se protegia disto com um `!eu.bonusFD`, o que
   diz que quem a escreveu sabia que relançar não devia render nada. O
   jogador é que não tinha esse guarda: a interface acende o botão da
   magia de defesa sempre que houver PM.

   Substituir é a leitura certa e não tira nada a ninguém — quem ergueu
   o Casulo com 2 PM e o quer com 5 volta a lançá-lo e fica com 5, em
   vez de com um segundo casulo por cima do primeiro. */
function _c3porDePe(atk, magia, pmGastos) {
  const i = atk.sustentadas.findIndex(x => x.magia.id === magia.id);
  if (i >= 0) atk.sustentadas.splice(i, 1);
  atk.sustentadas.push({ magia, pm: pmGastos });
  // Do zero: com uma entrada substituída, somar só a nova deixaria a
  // antiga contada para sempre.
  _c3recalcular(atk);
}

  // Magias sustentadas: ficam pagando PM todo o turno
  if (magia.porTurno) {
    _c3porDePe(atk, magia, pmGastos);
    if (magia.armaduraDobra) ev.armaduraDobrou = true;
    if (magia.bonusFDPorPM)  ev.bonusFD = pmGastos;
    if (magia.vorpal)        ev.vorpal = true;
    if (magia.roubaVida)     ev.roubando = true;
  }

  // ── CURA ──
  // A única cura do jogo, e é da Água: 1d de vida por cada 2 PMs.
  if (magia.cura) {
    const quem = (magia.curaAliado && curado && curado.vivo) ? curado : atk;
    const dados = Math.max(1, Math.floor(pmGastos * (magia.cura.dadosPorPM || 0.5)));
    let v = 0; for (let i = 0; i < dados; i++) v += _d6(rng);
    const antes = quem.pv;
    quem.pv = Math.min(quem.pvMax, quem.pv + v);
    ev.curou = quem.pv - antes; ev.curaDados = dados;
    // Quem foi curado, para o registo poder dizê-lo e a animação
    // saber em que cartão pôr o número verde.
    if (quem !== atk) { ev.curado = quem.nome; ev.curadoIdx = curado.__idx; }
  }

  // Congelar por um turno: não tira de combate como a Prisão de Gelo,
  // só deixa o alvo indefeso — sem atacar, esquivar nem lançar magia.
  if (magia.congelaTurnos) {
    if (dano <= 0) ev.semDano = true;
    else {
      const r = _c3resistirDetalhe(def, atk, false);
      if (!_c3testeReg(r.valor, rng, ev, 'congelar', r.partes)) {
        // +1 porque o turno em que a magia cai já vai a meio: descontar
        // esse deixava o alvo com um turno inteiro a menos do que o
        // texto promete. Com N+1, perde N turnos completos.
        const presoAte = magia.congelaTurnos + 1;
        def.congelado = true; def.congeladoTurnos = presoAte;
        def.indefeso  = true; def.indefesoTurnos  = presoAte;
        ev.congelou = magia.congelaTurnos;
      } else ev.resistiu = true;
    }
  }

  // ── CEGUEIRA ──
  // Não fere: estraga a pontaria e a esquiva até ao fim do combate.
  if (magia.cegueira) {
    // "Se falhar, FICARÁ CEGA" — outro estado. Quem já está cego não
    // fica mais cego; a cegueira chegava a −27 na esquiva por acumular.
    if (def.cegoEsquiva) ev.jaCego = true;
    else {
      const r = _c3resistirDetalhe(def, atk, false);
      if (!_c3testeReg(r.valor, rng, ev, 'cegueira', r.partes)) {
        def.cegoAtaque += magia.cegueira.ataque; def.cegoEsquiva += magia.cegueira.esquiva;
        ev.cegou = true;
      } else ev.resistiu = true;
    }
  }
  // O Véu de Correntes não cobra por turno: paga-se uma vez e dura a
  // luta. Por isso era o pior caso do empilhamento — subia sem custo.
  if (magia.bonusFD) _c3porDePe(atk, magia, 0);

  // ── AS DEFENSIVAS ──
  // Estavam todas no catálogo e nenhuma existia no motor: gastavam PM e
  // não faziam absolutamente nada. Cada uma segue o efeito que o manual
  // lhe dá, traduzido para o que este combate sabe fazer.

  // Corpo elemental: enquanto sustentada, o dano não entra. Custa 20 PM
  // TODO O TURNO, portanto na prática compra-se um turno e acaba — é a
  // própria conta de PM que a trava, não uma exceção à regra.
  if (magia.invulneravel) { atk.invulneravel = true; ev.invulneravel = true; }

  // Barreira: um escudo de pontos que absorve dano até se gastar.
  if (magia.barreira) {
    atk.barreira = (atk.barreira || 0) + pmGastos * 2;
    ev.barreira = atk.barreira;
  }

  // Alma fechada: os efeitos que tiram de combate sem passar pelos PV
  // deixam de pegar. Não protege de dano nenhum.
  if (magia.imuneEspiritual) { atk.imuneEspiritual = true; ev.imune = true; }

  // Véu de água: mais difícil de acertar. Some na Defesa como se a
  // Habilidade contasse a dobrar.
  if (magia.ocultacao) { atk.ocultado = true; ev.ocultou = true; }

  // Corrente de ar: cada PM investido é +1 no teste de esquiva.
  if (magia.esquivaBonus) { atk.bonusEsquiva = (atk.bonusEsquiva || 0) + pmGastos; ev.esquivaMais = pmGastos; }

  // Sugar magia: rouba ao alvo tantos PM quantos o dano que passou.
  if (magia.drenaPM) {
    if (dano <= 0) ev.semDano = true;
    else {
      const roubado = Math.min(def.pm, dano);
      def.pm -= roubado; atk.pm = Math.min(atk.pmMax, atk.pm + roubado);
      if (roubado > 0) ev.drenou = roubado; else ev.semPMparaRoubar = true;
    }
  }

  // Fúria: H+1 e F+1, mas enquanto durar não se esquiva NEM se lança
  // magia nenhuma. É o compromisso mais duro do manual, e é o que
  // quebra o empate entre duas fichas parecidas — a troco de ficar sem
  // rede. Antes disto a magia não fazia nada: nunca tinha sido tratada.
  if (magia.buffFuria) {
    const s = { magia, pm: pmGastos };
    atk.sustentadas.push(s);
    _c3efeitosSustentada(atk, s);
    ev.furia = true;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TROCAR DE AVATAR
//
// O manual não tem regra para isto — no 3D&T o grupo todo luta ao mesmo
// tempo, não há "ativo" nem banco. O formato 3v3 é nosso, e a troca
// também. Mas a regra é a do manual: um teste de Habilidade com
// penalidade igual à H do adversário, igual à esquiva.
//
//   passa  → sai limpo. A troca não custa o turno e quem entra ainda age.
//   falha  → sai à pressa. A troca gasta o turno inteiro.
//
// Quem é mais lento que o inimigo nunca passa (a penalidade zera o
// teste), portanto para esse a troca custa sempre o turno. É o mesmo
// princípio da esquiva, e faz sentido: para sair de uma luta sem levar
// o troco é preciso ser mais rápido do que quem está à frente.
// ═══════════════════════════════════════════════════════════════════
const C3_TROCA_BONUS = 2;   // "Tarefas Fáceis: bónus de +2 a +4" (manual)

function _c3trocaLimpa(quemSai, inimigo, rng, ev) {
  const margem = _c3(quemSai, 'H') - _c3(inimigo, 'H');
  if (margem < 1) {                          // mais lento: nem se rola
    if (ev) ev.semRolagem = ['H' + _c3(quemSai, 'H'), '−H' + _c3(inimigo, 'H')];
    return false;
  }
  // O bónus vem da tabela de dificuldades do manual. Sem ele o teste era
  // quase sempre de margem 1, ou seja passava uma vez em seis, e a regra
  // "a não ser que sejas mais rápido" ficava sem efeito prático.
  return _c3testeReg(margem + C3_TROCA_BONUS, rng, ev, 'troca',
    ['H' + _c3(quemSai, 'H'), '−H' + _c3(inimigo, 'H'), '+' + C3_TROCA_BONUS], 'quem');
}

// ═══════════════════════════════════════════════════════════════════
// O QUE UMA MAGIA CUSTA A ESTE AVATAR
//
// A Afinidade Profunda paga metade numa GAVETA — a língua materna dele
// —, arredondando para cima como o manual manda.
//
// Era "as magias do próprio elemento", e sem elementos essa conta
// passou a ler o PREFIXO do id da magia (fg_, ag_, un_). O prefixo é
// hoje só a chave da tradução e não quer dizer nada a ninguém: a
// vantagem continuava a funcionar e já não se podia explicar.
// ═══════════════════════════════════════════════════════════════════
function _c3custoMagia(c, magia, pm) {
  if (!magia) return 0;
  const papel = papelDaMagia(magia);
  let custo = pm;
  if (c.vant && c.vant.metadeCustoPapel && papel && c.vant.papel === papel)
    custo = Math.ceil(custo / 2);

  /* O dobro: a assombração cobra sempre, a veia travada só na gaveta que
     a tranca. Aplicam-se depois da Afinidade, senão metade de nada
     valia — e podem acumular, que é o pior dos mundos possíveis.

     A Veia deixou de olhar para o inimigo. Dependia dele por ser
     "contra o elemento dele", e isso fazia um defeito de nascença
     comportar-se como se fosse do outro: agora é uma gaveta do PRÓPRIO
     que emperra, e emperra sempre — o que é o que um defeito faz. */
  if (c.assombrado && c.desv && c.desv.dobraCustoMagia) custo *= 2;
  if (c.desv && c.desv.dobraCustoMagia && !c.desv.assombraEm
      && papel && c.desv.papel === papel) custo *= 2;
  return custo;
}

// ═══════════════════════════════════════════════════════════════════
// PAGAR UMA MAGIA
//
// Normalmente sai dos PM. Com a vantagem Sangue por Magia, o que
// faltar sai dos PV a 2 por 1 — mas nunca até morrer: quem paga com o
// corpo continua precisando dele.
// ═══════════════════════════════════════════════════════════════════
function _c3pmDisponivel(c) {
  if (!(c.vant && c.vant.pvComoPM)) return c.pm;
  return c.pm + Math.floor(Math.max(0, c.pv - 1) / c.vant.pvComoPM);
}

function _c3pagar(c, custo, ev) {
  const daBolsa = Math.min(c.pm, custo);
  c.pm -= daBolsa;
  const falta = custo - daBolsa;
  if (falta > 0 && c.vant && c.vant.pvComoPM) {
    const pv = Math.min(Math.max(0, c.pv - 1), falta * c.vant.pvComoPM);
    c.pv -= pv;
    if (ev) ev.pagouComSangue = pv;
  }
}

// O Limiar Baixo tranca a magia abaixo de metade da vida
function _c3podeMagiar(c) {
  if (c.furia) return false;
  if (c.semFoco) return false;                 // o foco caiu: não há magia
  if (c.desv && c.desv.semMagiaAbaixoDeMetade && c.pv < c.pvMax / 2) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// A POLÍTICA — como um lado decide o que fazer
//
// Não é "a IA do jogo": é um jogador razoável de referência, para as
// medições terem sentido. Um humano joga melhor do que isto.
// ═══════════════════════════════════════════════════════════════════
/* Vale a pena trocar? Duas razões concretas, e nenhuma delas é palpite:
     · tenho Ferida da gaveta dele — a minha Armadura conta zero
     · ele tem Couraça de uma gaveta minha — a dele conta a dobrar
   Mais a razão de sempre: estou quase a cair e há quem esteja inteiro.

   A pergunta mudou de forma com as gavetas, e ficou mais honesta. "Ele
   é de Fogo?" respondia-se pelo rótulo dele. "Ele SABE alguma magia
   desta gaveta?" responde-se pelo repertório, que é o que ele vai
   mesmo lançar — e um avatar que ainda não acordou aquela gaveta
   deixa de assustar quem não tem por que se assustar. */
function _c3sabeDoPapel(c, papel) {
  return !!(papel && c && c.magias && c.magias[papel]);
}

function _c3valeTrocar(eu, inimigo, banco) {
  const feridoPelaGaveta = !!(eu.desv && eu.desv.armaduraZero
                              && _c3sabeDoPapel(inimigo, eu.desv.papel));
  const eleResisteMe     = !!(inimigo.vant && inimigo.vant.armaduraDobra
                              && _c3sabeDoPapel(eu, inimigo.vant.papel));
  const quaseACair       = eu.pv <= eu.pvMax * 0.25;
  if (!feridoPelaGaveta && !eleResisteMe && !quaseACair) return -1;

  // O melhor do banco: sem ferida contra este inimigo, e o mais inteiro
  let melhor = -1, melhorNota = -1;
  banco.forEach((o, i) => {
    if (!o || !o.vivo || o === eu) return;
    const ferido = !!(o.desv && o.desv.armaduraZero && _c3sabeDoPapel(inimigo, o.desv.papel));
    // E a couraça DELE, se o inimigo souber lançar da gaveta que ela
    // trava: isso conta a favor de quem está no banco, não contra.
    const resiste = !!(o.vant && o.vant.armaduraDobra && _c3sabeDoPapel(inimigo, o.vant.papel));
    const nota = (o.pv / o.pvMax) + (ferido ? -1 : 0) + (resiste ? 0.6 : 0);
    if (nota > melhorNota) { melhorNota = nota; melhor = i; }
  });
  // Só troca se o outro estiver mesmo melhor do que quem está em campo
  const minha = (eu.pv / eu.pvMax) + (feridoPelaGaveta ? -1 : 0);
  return (melhor >= 0 && melhorNota > minha + 0.3) ? melhor : -1;
}

/* ── ESCOLHER EM QUEM PEGAR ──

   Duas contas simples, e nenhuma delas tenta ser esperta:

     · para ferir, o mais perto de cair — é onde um golpe se
       transforma em avatar a menos, e o resto é conversa;
     · para curar, o mais longe do cheio, contado em PONTOS e não
       em fracção. Curar 3 num que tem 30 de 40 vale mais do que
       curar 3 num que tem 4 de 5, mesmo que o segundo pareça pior.

   Devolvem null quando não há ninguém melhor do que o activo, e aí
   o motor fica pelo caminho do costume. */
function _c3alvoMaisFraco(equipa) {
  let melhor = null, i = -1;
  equipa.forEach((c, k) => {
    if (!c || !c.vivo) return;
    if (!melhor || c.pv < melhor.pv) { melhor = c; i = k; }
  });
  return i < 0 ? null : i;
}
function _c3aliadoMaisFerido(equipa) {
  let melhor = null, i = -1, falta = 0;
  equipa.forEach((c, k) => {
    if (!c || !c.vivo) return;
    const f = c.pvMax - c.pv;
    if (f > falta) { falta = f; melhor = c; i = k; }
  });
  return i < 0 ? null : i;
}

function politica3dt(eu, inimigo, campo) {
  const m = eu.magias || {};
  const v = eu.vant;

  // ── O foco caiu: apanhá-lo custa o turno, mas sem ele não há magia ──
  // Só vale a pena para quem vive de magia; um avatar que bate melhor
  // do que lança fica batendo.
  if (eu.semFoco) {
    const vivoDeMagia = m.forte || m.muito_forte;
    if (vivoDeMagia && _c3(eu, 'F') <= _c3(eu, 'H')) return { apanharFoco: true };
    return { magia: null, pm: 0, golpeSimples: false };
  }

  if (!_c3podeMagiar(eu)) return { magia: null, pm: 0 };   // fúria ou limiar baixo
  const tecto = _c3(eu, 'H') * 5;
  const bolsa = _c3pmDisponivel(eu);
  const podePagar = g => g && g.pm <= tecto
                      && _c3custoMagia(eu, g, g.pm) <= bolsa;

  // ── Vantagens que gastam a ação do turno ──
  // O Segundo Fôlego só compensa quando já se perdeu muita vida: gasta
  // o turno inteiro, portanto usá-lo com a vida quase cheia é oferecer
  // um turno ao adversário.
  // E só há um por batalha: gasto, escolhê-lo era gastar o turno a olhar.
  if (v && v.curaTudo && eu.pm >= v.pm && eu.pv < eu.pvMax * 0.35
      && (eu.folegoUsado || 0) < ((v.maxUsos != null) ? v.maxUsos : Infinity)) {
    return { vantagem: v, pm: v.pm };
  }
  // A Reserva Oculta sobe uma característica; vale a pena cedo, para o
  // bónus durar o combate todo.
  if (v && v.subirCarac && eu.pm >= v.pm && (eu.reservaGasta || 0) < v.maxTotal) {
    return { vantagem: v, pm: v.pm };
  }
  // O Toque Paralisante não fere: tira o adversário de ação.
  if (v && v.paralisa && eu.pm >= v.pm && !inimigo.indefeso) {
    return { vantagem: v, pm: v.pm };
  }

  // ── Toque de Energia: só quando bate mais forte do que o murro ──
  // FA do toque = A + 1d + PM; FA do murro = H + F + 1d. Compara-se o
  // que é comparável e escolhe-se o maior, senão a vantagem ficava a
  // ser usada por avatares a quem não serve.
  if (v && v.toqueEnergia) {
    const pmToque = Math.min(_c3(eu, 'A'), Math.max(0, bolsa - 1));
    if (_c3(eu, 'A') + pmToque > _c3(eu, 'H') + _c3(eu, 'F'))
      return { toque: true, toquePM: pmToque, magia: null, pm: 0 };
  }

  /* ── Curar-se ──
     Antes de qualquer outra coisa: com a vida por baixo de metade, uma
     cura vale mais do que um golpe que talvez nem passe a Defesa.

     Percorre os lugares TODOS. A lista estava escrita à mão com os
     nomes das gavetas antigas, e quando elas mudaram de nome esta linha
     passou a olhar para três lugares que já não existiam: a IA deixou de
     se curar, e de lançar seja o que fosse, sem uma única excepção em
     lado nenhum. Foi a auditoria dos estados persistentes que a
     apanhou — nove estados deixaram de acontecer de uma vez. */
  for (const cand of MAGIA_SLOTS.map(k => m[k])) {
    if (cand && cand.cura && podePagar(cand) && eu.pv < eu.pvMax * 0.55)
      return { magia: cand, pm: _c3pmIdeal(cand, eu, tecto) };
  }

  // Rematar: se o golpe caro cabe e o inimigo está por um fio, usa-o
  const remate = m.muito_forte || m.forte;
  if (podePagar(remate) && inimigo.pv <= inimigo.pvMax * 0.4) {
    return { magia: remate, pm: _c3pmIdeal(remate, eu, tecto) };
  }
  /* A Maré Compartilhada, quando alguém do lado de cá está mal.

     Entra antes da defesa comum de propósito: um escudo em quem
     está inteiro vale menos do que fechar a ferida de quem está
     quase a cair, e a magia só existe para isso. */
  {
    // A cura de aliado vive no suporte desde que as gavetas passaram a
    // ser por papel; procura-se em todos os lugares para não depender
    // de onde ela está arrumada hoje.
    const cura = MAGIA_SLOTS.map(k => m[k]).find(g => g && g.curaAliado && podePagar(g));
    if (campo && cura) {
      const k = _c3aliadoMaisFerido(campo.meu);
      if (k != null && campo.meu[k].pv < campo.meu[k].pvMax * 0.6) {
        return { magia: cura, pm: _c3pmIdeal(cura, eu, tecto), aliadoIdx: k };
      }
    }
  }

  // Erguer a defesa quando ainda não está de pé e há folga de PM
  if (podePagar(m.defensiva) && !m.defensiva.cura
      && !eu.bonusA && !eu.bonusFD && !eu.armaduraDobrada && !eu.vorpal && !eu.roubando
      && eu.pm > eu.pmMax * 0.5 && eu.pv < eu.pvMax * 0.7) {
    return { magia: m.defensiva, pm: _c3pmIdeal(m.defensiva, eu, tecto) };
  }
  // Abrir com um buff sustentado, se tiver um e ainda não estiver de pé.
  // É isto que quebra o empate entre duas fichas parecidas: com F+2 a
  // conta FA vs FD deixa de dar zero. Sem isto a política trocava
  // golpes que não faziam nada.
  // Percorre os lugares todos, sejam quantos forem: escrevê-los à mão
  // aqui foi o que deixou o quarto de fora quando ele apareceu.
  for (const cand of MAGIA_SLOTS.map(k => m[k])) {
    if (cand && (cand.vorpal || cand.roubaVida) && podePagar(cand)
        && !eu.vorpal && !eu.roubando) {
      return { magia: cand, pm: cand.pm };
    }
  }
  for (const cand of MAGIA_SLOTS.map(k => m[k])) {
    if (cand && (cand.buffForca || cand.buffFuria) && podePagar(cand)
        && !eu.bonusF && !eu.furia) {
      return { magia: cand, pm: cand.pm };
    }
  }
  // Caso normal: a magia de bater se der, senão o golpe comum (grátis)
  if (podePagar(m.forte)) return { magia: m.forte, pm: _c3pmIdeal(m.forte, eu, tecto) };
  if (podePagar(m.muito_forte)) return { magia: m.muito_forte, pm: _c3pmIdeal(m.muito_forte, eu, tecto) };

  // Sem magia que dê, o murro. O Golpe Carregado e o Encadeado aplicam-se
  // sozinhos no turno — mas guarda-se um PM de reserva a quem paga as
  // magias com sangue, para não ficar a gastar vida em murros.
  return { magia: null, pm: 0 };
}

// Quanto investir numa magia de custo variável: metade do que sobra,
// para não ficar sem PM ao segundo turno.
function _c3pmIdeal(magia, eu, tecto) {
  if (!magia) return 0;
  const max = Math.min(magia.pmMax || magia.pm, tecto, eu.pm);
  if (max <= magia.pm) return magia.pm;
  return Math.max(magia.pm, Math.min(max, magia.pm + Math.floor((eu.pm - magia.pm) / 2)));
}

// ═══════════════════════════════════════════════════════════════════
// FIM DE TURNO
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// LARGAR AS MAGIAS SUSTENTADAS
//
// Acontecia só quando o PM acabava. Mas manter uma magia de pé é uma
// escolha que se paga todo o turno, e quem escolhe pagar tem de poder
// deixar de pagar — senão um escudo lançado no primeiro turno drena o
// avatar até ao fim da luta sem hipótese de o desligar.
//
// Larga tudo o que elas seguravam. Nada disto é reversível: para voltar
// a ter o escudo é preciso lançar a magia outra vez.
// ═══════════════════════════════════════════════════════════════════
// Os efeitos que UMA magia de pé concede. Existe em separado para os
// poder voltar a erguer: quando uma magia cai, as outras continuam de pé
// e os seus bónus têm de sobreviver.
function _c3efeitosSustentada(c, s) {
  const g = s.magia, pm = s.pm;
  if (g.armaduraPorPM) c.bonusA += Math.min(pm, g.armaduraMax || 5);
  if (g.armadura)      c.bonusA += g.armadura;
  if (g.buffForca)     c.bonusF += g.buffForca;
  if (g.bonusFD)       c.bonusFD += g.bonusFD;
  if (g.bonusFDPorPM)  c.bonusFD += pm * g.bonusFDPorPM;
  if (g.armaduraDobra) c.armaduraDobrada = true;
  if (g.vorpal)        c.vorpal = true;
  if (g.roubaVida)     c.roubando = g.roubaVida;
  if (g.invulneravel)  c.invulneravel = true;
  if (g.ocultacao)     c.ocultado = true;
  if (g.buffFuria)   { c.furia = true; c.bonusF += 1; c.bonusH += 1; }
}

// Volta a somar tudo do zero: o que é permanente mais o que ainda está
// de pé. Substitui o zerar-tudo de antes, que levava à frente coisas que
// não vinham de magia nenhuma.
function _c3recalcular(c) {
  c.bonusF = c.perm.F; c.bonusH = c.perm.H;
  c.bonusA = c.perm.A; c.bonusFD = c.perm.FD;
  c.furia = c.furiaDesv;
  c.invulneravel = false; c.ocultado = false;
  c.armaduraDobrada = false; c.vorpal = false; c.roubando = null;
  for (const s of c.sustentadas) _c3efeitosSustentada(c, s);
}

// Larga magias de pé. Sem filtro larga todas; com filtro, só as que ele
// escolher — porque desligar o Punho de Pedra para poupar 5 PM não é
// razão para perder o Manto que se está pagando de bom grado.
//
// A bonusEsquiva não entra aqui: a Corrente de Ar não é sustentada,
// paga-se uma vez e dura a luta toda. Era zerada com o resto.
function _c3largarSustentadas(c, quais) {
  const antes = c.sustentadas.length;
  if (quais) c.sustentadas = c.sustentadas.filter(s => !quais(s));
  else       c.sustentadas = [];
  _c3recalcular(c);
  return antes - c.sustentadas.length;
}

// Quanto PM as magias de pé cobram por turno.
function _c3custoSustentadas(c) {
  return c.sustentadas.reduce((t, s) => t + (s.magia.porTurno ? s.pm : 0), 0);
}

// ═══════════════════════════════════════════════════════════════════
// O FIM DO TURNO
//
// Aqui cobra-se o veneno, a cura perpétua e as magias sustentadas. Fazia
// tudo isto EM SILÊNCIO: a vida do envenenado descia sozinha sem uma
// linha no registo, e por isso o veneno parecia não estar a funcionar
// — funcionava, só não se via.
//
// Agora devolve o que aconteceu, para o turno gerar os eventos.
// ═══════════════════════════════════════════════════════════════════
function _c3fimTurno(c) {
  if (!c.vivo) return null;
  const fora = {};
  // Magias sustentadas cobram todo o turno. Sem PM, caem.
  let custo = _c3custoSustentadas(c);
  if (custo > c.pm) {
    // Só as que cobram por turno. As que se pagaram de uma vez ficam:
    // não é por faltar PM ao escudo que a fúria já paga se desfaz.
    const caidas = _c3largarSustentadas(c, s => s.magia.porTurno);
    if (caidas) fora.sustentadasCairam = caidas;
  } else if (custo > 0) {
    c.pm -= custo;
    fora.sustentouPor = custo;
  }
  if (c.veneno) {
    c.pv = Math.max(0, c.pv - 1);
    fora.sangrou = 1;
    if (c.pv === 0) { c.vivo = false; fora.caiu = true; }
  }
  // A Cura Perpétua fecha o corpo sozinha, sem custo nenhum
  if (c.vant && c.vant.pvPorTurno && c.vivo && c.pv < c.pvMax) {
    const antes = c.pv;
    c.pv = Math.min(c.pvMax, c.pv + c.vant.pvPorTurno);
    fora.regenerou = c.pv - antes;
  }
  c.esquivas = 0;
  // A paralisia conta turnos; tudo o resto que deixe indefeso vale só
  // enquanto o golpe que o causou está sendo resolvido.
  if (c.indefesoTurnos > 0) {
    c.indefesoTurnos--; c.indefeso = c.indefesoTurnos > 0;
    if (!c.indefeso) fora.destravou = true;
  }
  else c.indefeso = false;
  if (c.congeladoTurnos > 0) {
    c.congeladoTurnos--; c.congelado = c.congeladoTurnos > 0;
    if (!c.congelado) fora.descongelou = true;
  }
  else c.congelado = false;
  return Object.keys(fora).length ? fora : null;
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtSimular
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// UM TURNO
//
// Extraído do ciclo para os dois modos o partilharem: o headless
// (combate3dtSimular) corre-o em ciclo, e o interativo chama-o uma vez
// por decisão do jogador. Uma só implementação, portanto o que se vê no
// tela é exatamente o que as 5000 batalhas de teste correram.
// ═══════════════════════════════════════════════════════════════════
function combate3dtTurno(e) {
  const { A, B, rng, eventos } = e;
  const vivos = t => t.some(c => c.vivo);
  const proximo = (t, i) => (t[i] && t[i].vivo) ? i : t.findIndex(c => c.vivo);
  const opts = e.opts || {};

  e.turnos++;
  e.ativoA = proximo(A, e.ativoA);
  e.ativoB = proximo(B, e.ativoB);
  const turnos = e.turnos;

  // A ordem de quem age: iniciativa mais alta primeiro, empate pela H.
  // Guarda-se só o LADO, não os combatentes — quem está em campo pode
  // mudar a meio do turno, e era esse o defeito: com a dupla fixada aqui,
  // quem atacava depois de uma troca acertava no avatar que já tinha
  // saído. Agora o atacante e o alvo são lidos no momento de agir.
  const ordem = [
    { lado: 'A', ini: A[e.ativoA] },
    { lado: 'B', ini: B[e.ativoB] },
  ].sort((x, y) => (y.ini.iniciativa - x.ini.iniciativa) || (_c3(y.ini, 'H') - _c3(x.ini, 'H')));

  for (const o of ordem) {
    const meu  = o.lado === 'A' ? A : B;
    const dele = o.lado === 'A' ? B : A;
    const iMeu  = () => (o.lado === 'A' ? e.ativoA : e.ativoB);
    const iDele = () => (o.lado === 'A' ? e.ativoB : e.ativoA);

    const l = { lado: o.lado, c: meu[iMeu()], alvo: dele[iDele()] };
    if (!l.c || !l.alvo || !l.c.vivo || !l.alvo.vivo) continue;

    // ── Preso no gelo: não age ──
    // O ciclo nunca olhava para isto. A magia dizia "sem atacar nem
    // esquivar" e só a esquiva era verdade: o congelado continuava a
    // bater todos os turnos, como se nada fosse.
    //
    // Fica ANTES da troca de propósito. Trocar também é agir, e deixar
    // o congelado sair de campo fazia do gelo um estorvo de um segundo:
    // bastava mandar entrar outro e a prisão não prendia nada.
    if (l.c.congelado) {
      if (eventos) eventos.push({ turno: turnos, lado: l.lado, quem: l.c.nome,
                                  quemIdx: iMeu(), preso: true, suporte: true });
      continue;
    }

    // ── Trocar de avatar ──
    const banco = meu;
    const querTrocar = (opts.escolhaTroca || _c3valeTrocar)(l.c, l.alvo, banco);
    if (querTrocar >= 0 && banco[querTrocar] && banco[querTrocar].vivo) {
      const evT = { turno: turnos, lado: l.lado, quem: l.c.nome, quemIdx: iMeu() };
      const limpa = _c3trocaLimpa(l.c, l.alvo, rng, evT);
      const entra = banco[querTrocar];
      if (l.lado === 'A') e.ativoA = querTrocar; else e.ativoB = querTrocar;
      evT.troca = entra.nome; evT.limpa = limpa;
      if (eventos) eventos.push(evT);
      // Saiu à pressa: perde o turno. Mas quem entrou fica em campo, e é
      // ELE que leva o golpe do inimigo — é esse o risco de trocar.
      if (!limpa) continue;
      l.c = meu[iMeu()];                           // saiu limpo: quem entra ainda age
      l.alvo = dele[iDele()];
    }
  const acao = (opts.politica || politica3dt)(l.c, l.alvo, { meu, dele });

    /* ── O ALVO DEIXA DE SER SEMPRE QUEM ESTÁ EM CAMPO ──

       Até aqui `l.alvo` era o activo do outro lado e ponto final. As
       magias com `escolheAlvo` podem apontar a outro — e as com
       `curaAliado` podem apontar para dentro da própria equipa.

       A escolha é validada aqui e não onde ela é feita: uma acção que
       aponte a um índice vazio, a um caído, ou a um número fora da
       lista cai de volta no activo em vez de rebentar. A interface e
       a política já escolhem bem; isto é para quando uma delas mudar. */
    let alvoIdx = iDele();
    if (acao.magia && acao.magia.escolheAlvo) {
      /* Se quem decidiu não apontou a ninguém, aponta-se ao mais
         perto de cair.

         Isto esteve primeiro na política, num ramo só — o do golpe
         forte — e por isso a mesma magia noutra gaveta saía sem alvo
         escolhido e batia no activo em silêncio. A prova apanhou-o.
         Vive aqui porque é aqui que a acção é LIDA, e é o único sítio
         por onde todos os caminhos passam.

         Não pisa a escolha de ninguém: só preenche o que vier vazio.
         A interface do jogador manda sempre o alvo, portanto esta
         linha nunca decide por ele. */
      const pedido = (acao.alvoIdx != null) ? acao.alvoIdx : _c3alvoMaisFraco(dele);
      const escolhido = (pedido != null) ? dele[pedido] : null;
      if (escolhido && escolhido.vivo) { l.alvo = escolhido; alvoIdx = pedido; }
    }
    // E o destinatário da cura, do meu lado.
    let curado = l.c, curadoIdx = iMeu();
    if (acao.magia && acao.magia.curaAliado) {
      const pedido = (acao.aliadoIdx != null) ? acao.aliadoIdx : _c3aliadoMaisFerido(meu);
      const a = (pedido != null) ? meu[pedido] : null;
      if (a && a.vivo) { curado = a; curadoIdx = pedido; }
    }
    curado.__idx = curadoIdx;

    // ── Apanhar o foco caído: gasta o turno inteiro e mais nada ──
    if (acao.apanharFoco && l.c.semFoco) {
      l.c.semFoco = false;
      if (eventos) eventos.push({ turno: turnos, lado: l.lado, quem: l.c.nome,
                                  alvo: l.alvo.nome, quemIdx: iMeu(), alvoIdx: iDele(),
                                  apanhouFoco: true, suporte: true });
      continue;
    }

    let magia = acao.magia;
    const pmBruto = magia ? acao.pm : 0;
    /* O pmMax da magia entra aqui, e não entrava.

       Só se limitava ao PM disponível: pedir 60 numa magia que aceita
       20 cobrava os 60 e escalava o efeito na mesma proporção. Não era
       poder de graça — pagava-se tudo — mas era o tecto declarado a
       não valer nada, e o "4 a 20 PM" que o jogador lê passava a ser
       decoração.

       A interface já cortava no pmMax antes de chamar o motor. Era
       mais um tecto guardado por quem PEDE em vez de por quem FAZ, e
       esses cedem todos ao primeiro caminho novo. */
    const tectoPM = magia ? (magia.pmMax || magia.pm) : 0;
    let pm = magia ? Math.min(pmBruto, tectoPM, _c3pmDisponivel(l.c)) : 0;

    /* ── E UM CHÃO, QUE FALTAVA ──

       O `pm` era limitado ao que a bolsa tinha e mais nada, e o custo
       da magia é o próprio `pm`. Portanto lançar uma magia de 25 PM
       com a bolsa vazia pagava zero e o efeito saía inteiro — medido,
       39 de dano de graça.

       Não era explorável: a interface apaga o botão e a política nunca
       escolhe o que não pode pagar. Mas era o quarto limite desta
       auditoria guardado só por quem PEDE, e os outros três já tinham
       cedido a caminhos novos. Este cede ao próximo.

       Uma magia sub-financiada não acontece: quem a tentou dá um golpe
       comum, que é o que sempre houve para quando a magia não chega. */
    let magiaSemPM = false;
    if (magia && pm < magia.pm) { magiaSemPM = true; pm = 0; }

    // Os índices, não só os nomes: a interface anima o cartão certo com
    // eles. Sem isto ela usava o ativo do momento — e como o ativo
    // avança no fim do turno, a animação do golpe caía no inimigo
    // seguinte enquanto o dano tinha sido no anterior.
    // Sem PM que chegue, a magia não existiu: o turno segue como golpe
    // comum e o registo di-lo, em vez de mostrar uma magia que não saiu.
    if (magiaSemPM) { magia = null; }

    const ev = { turno: turnos, lado: l.lado, quem: l.c.nome, alvo: l.alvo.nome,
                 quemIdx: iMeu(), alvoIdx,
                 magia: magia ? magia.id : null, pm };
    if (magiaSemPM) ev.semPM = true;

    if (magia) {
      _c3pagar(l.c, _c3custoMagia(l.c, magia, pm), ev);
      if (l.c.pv === 0) l.c.vivo = false;
      // A Sina Cobradora tira vida a cada magia, sem direito a resistir
      if (l.c.desv && l.c.desv.danoPorMagia) {
        l.c.pv = Math.max(0, l.c.pv - l.c.desv.danoPorMagia);
        if (l.c.pv === 0) l.c.vivo = false;
      }
      if (!l.c.vivo) { if (eventos) { ev.caiuSozinho = true; eventos.push(ev); } continue; }
    }

    // Vantagem usada como ação do turno
    if (acao.vantagem) {
      const w = acao.vantagem;
      /* ── O SEGUNDO FÔLEGO GASTA-SE ──

         Não tinha limite nenhum: 2 PM devolviam a vida toda, e a bolsa
         dava para repetir dezenas de vezes. É o mesmo defeito da Reserva
         Oculta aqui em baixo, mas sem sequer ter um tecto escrito para
         alguém ignorar.

         O limite vive onde a cura ACONTECE, e não onde ela é pedida:
         a interface apaga o botão e a política deixa de a escolher, mas
         nenhuma das duas é a última palavra — foi essa a lição dos
         quatro defeitos desta auditoria.

         Gasto o fôlego, não cura E NÃO COBRA. Cobrar por nada é a mesma
         falha vista do outro lado; o turno perdido já é preço que chegue. */
      const folegoNoFim = w.curaTudo
        && (l.c.folegoUsado || 0) >= ((w.maxUsos != null) ? w.maxUsos : Infinity);
      if (folegoNoFim) { ev.folegoNoFim = true; ev.vantagem = w.id; ev.suporte = true;
        ev.pvAlvo = l.alvo.pv; ev.pvAlvoMax = l.alvo.pvMax; ev.pmProprio = l.c.pm;
        if (eventos) eventos.push(ev);
        continue; }
      l.c.pm -= w.pm;
      if (w.curaTudo)    {
        l.c.folegoUsado = (l.c.folegoUsado || 0) + 1;
        l.c.pv = l.c.pvMax; ev.curou = true;
      }
      if (w.subirCarac)  {
        /* O maxTotal é o tecto SOMADO da luta inteira, e só a política
           do motor o vigiava — a interface do jogador acendia o botão
           sempre que houvesse PM. Dois PM por turno compravam +1
           permanente numa característica, sem fim: em dez turnos a
           Força subia 10 numa vantagem que promete 5.

           O tecto passa a ser cumprido onde o ponto é dado. Chegado
           ao fim, a vantagem não faz nada e diz que não faz — em vez
           de cobrar os PM e subir na mesma. */
        const jaSubiu = l.c.reservaGasta || 0;
        const podeAinda = Math.max(0, (w.maxTotal != null ? w.maxTotal : Infinity) - jaSubiu);
        const sobe = Math.min(w.subirCarac, podeAinda);
        if (sobe > 0) {
          // Sobe a característica que mais falta faz: a Força se não
          // fere, a Armadura se está levando de mais.
          const alvo = (l.c.pv < l.c.pvMax * 0.5) ? 'A' : 'F';
          const campo = alvo === 'A' ? 'A' : 'F';
          l.c['bonus' + campo] += sobe;
          l.c.perm[campo]      += sobe;
          l.c.reservaGasta = jaSubiu + sobe;
          ev.subiu = alvo;
        } else ev.reservaNoFim = true;
      }
      if (w.paralisa) {
        const rp = _c3resistirDetalhe(l.alvo, l.c, false);
        if (!_c3testeReg(rp.valor, rng, ev, 'paralisia', rp.partes)) {
          // Dois turnos: o que resta deste, e o seguinte inteiro — que é
          // o único em que quem paralisou pode aproveitar.
          l.alvo.indefeso = true; l.alvo.indefesoTurnos = 2;
          ev.paralisou = true;
        }
        else ev.resistiu = true;
      }
      ev.vantagem = w.id; ev.suporte = true;
      ev.pvAlvo = l.alvo.pv; ev.pvAlvoMax = l.alvo.pvMax; ev.pmProprio = l.c.pm;
      if (eventos) eventos.push(ev);
      continue;
    }

    // Magias que não atacam (escudo, buff) não rolam FA
    if (magia && !magia.fa) {
      _c3aplicarEfeitos(l.c, l.alvo, magia, pm, 0, rng, ev, curado);
      ev.suporte = true;
    } else {
      // Uma magia de ondas dispara várias vezes, cada uma com a sua rolagem
      const ondas = (magia && magia.ondasPor)
        ? Math.min(magia.ondasMax || 5, 1 + Math.floor((pm - magia.pm) / magia.ondasPor)) : 1;
      // ── Quantos golpes ──
      // As magias de onda já traziam repetição; o Golpe Encadeado traz
      // a mesma ideia ao murro. Cada golpe rola a sua própria FA contra
      // a FD do inimigo — nunca se somam, que é o que trava a vantagem.
      let golpes = ondas, bonusF = 0, toquePM = 0;
      const v = l.c.vant;
      if (!magia && !acao.toque && v) {
        if (v.golpesMultiplos && !acao.golpeSimples) {
          const quer = Math.min(_c3(l.c, 'H'), Math.floor(_c3pmDisponivel(l.c) / v.pmPorGolpe));
          if (quer > 1) { golpes = quer; _c3pagar(l.c, quer * v.pmPorGolpe, ev); ev.golpes = quer; }
        } else if (v.bonusFGolpe && _c3pmDisponivel(l.c) >= v.pm) {
          _c3pagar(l.c, v.pm, ev); bonusF = v.bonusFGolpe; ev.carregado = true;
        }
      }
      // ── Toque de Energia: o tecto de PM é a própria Armadura ──
      if (acao.toque && v && v.toqueEnergia) {
        toquePM = Math.max(0, Math.min(acao.toquePM || 0, _c3(l.c, 'A'), _c3pmDisponivel(l.c)));
        _c3pagar(l.c, toquePM, ev);
        ev.toque = true; ev.pm = toquePM;
      }
      if (l.c.pv === 0) { l.c.vivo = false; if (eventos) { ev.caiuSozinho = true; eventos.push(ev); } continue; }

      let total = 0;
      const rolagens = [];
      for (let o = 0; o < golpes && l.alvo.vivo; o++) {
        const sub = {};
        total += _c3resolver(l.c, l.alvo, magia, pm, rng, sub,
                             { bonusF, toque: acao.toque && v && v.toqueEnergia, toquePM });
        rolagens.push(sub);
        // A primeira onda escreve tudo, incluindo os zeros — senão um
        // dano de 0 desaparecia do evento em vez de ficar registado.
        // As seguintes só acrescentam o que disparou, para um efeito de
        // uma onda não ser apagado pela onda a seguir.
        for (const k in sub) if (o === 0 || sub[k]) ev[k] = sub[k];
      }
      ev.dano = total; ev.ondas = golpes;
      if (golpes > 1) ev.rolagens = rolagens;
      _c3aplicarEfeitos(l.c, l.alvo, magia, pm, total, rng, ev, curado);
    }
    ev.pvAlvo = l.alvo.pv; ev.pvAlvoMax = l.alvo.pvMax;
    ev.pmProprio = l.c.pm;
    if (!l.alvo.vivo) ev.caiu = true;
    if (eventos) eventos.push(ev);
  }

  // ── Roubo de Vida ──
  // Sustentado: cada turno tira 1d de vida ao outro e passa-a para si.
  // Fica aqui e não em _c3fimTurno porque precisa dos DOIS lados, e
  // aquele só conhece um combatente de cada vez.
  for (const [meu, dele, lado, iMeu, iDele] of [
    [A[e.ativoA], B[e.ativoB], 'A', e.ativoA, e.ativoB],
    [B[e.ativoB], A[e.ativoA], 'B', e.ativoB, e.ativoA]]) {
    if (!meu || !meu.vivo || !meu.roubando || !dele || !dele.vivo) continue;
    let v = 0; for (let i = 0; i < (meu.roubando.dados || 1); i++) v += _d6(rng);
    v = Math.min(v, dele.pv);
    dele.pv -= v; if (dele.pv === 0) dele.vivo = false;
    meu.pv = Math.min(meu.pvMax, meu.pv + v);
    if (eventos) eventos.push({ turno: turnos, lado, quem: meu.nome, alvo: dele.nome,
                                quemIdx: iMeu, alvoIdx: iDele,
                                roubou: v, suporte: true, caiu: !dele.vivo });
  }

  // O fim do turno cobra o veneno, a cura e as sustentadas — e agora
  // di-lo, em vez de mexer nos números sem explicação.
  [...A.map((c, i) => [c, 'A', i]), ...B.map((c, i) => [c, 'B', i])].forEach(([c, lado, i]) => {
    const r = _c3fimTurno(c);
    if (r && eventos) eventos.push({ turno: turnos, lado, quem: c.nome,
                                     quemIdx: i, fimDeTurno: true, ...r });
  });

  // ── A FÚRIA DO SANGUE QUENTE PASSA ──
  // "não esquiva nem lança magia até alguém cair" — e ninguém a tirava.
  // Uma vez em fúria, o avatar ficava em fúria o resto da luta: sem
  // esquiva e sem magia nenhuma, quando o texto prometia que aquilo
  // durava até à primeira queda. A fúria da magia (Fúria Sombria) é
  // outra coisa, comprada de propósito, e essa fica.
  if ([...A, ...B].some(c => !c.vivo)) {
    for (const c of [...A, ...B]) {
      if (!c.vivo || !c.furiaDesv) continue;
      c.furiaDesv = false;
      c.perm.F = Math.max(0, c.perm.F - 1);
      c.perm.H = Math.max(0, c.perm.H - 1);
      _c3recalcular(c);
      if (eventos) eventos.push({ turno: turnos, lado: A.includes(c) ? 'A' : 'B',
                                  quem: c.nome, quemIdx: (A.includes(c) ? A : B).indexOf(c),
                                  fimDeTurno: true, acalmou: true });
    }
  }

  // ── QUEM FICA EM CAMPO ──
  // O avanço para o seguinte acontece AQUI, no fim, e não no início do
  // turno seguinte. A diferença só se vê num jogo com pausa entre
  // turnos: com o avanço no início, o estado entre um turno e o outro
  // ainda apontava para o que tinha acabado de cair — o jogador olhava
  // para um cadáver e escolhia a jogada sem saber contra quem ia.
  // A rolagem do início continua lá, e passa a não fazer nada.
  e.ativoA = proximo(A, e.ativoA);
  e.ativoB = proximo(B, e.ativoB);

  e.acabou = !vivos(A) || !vivos(B) || e.turnos >= C3_MAX_TURNOS;
  return e;
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtIniciar — o estado de uma batalha, para jogar turno a turno
// ═══════════════════════════════════════════════════════════════════
function combate3dtIniciar(equipaA, equipaB, seed, opts) {
  opts = opts || {};
  const rng = _c3rng(seed || 1);
  return {
    A: equipaA.slice(0, 3).map(s => _c3criar(s, rng)),
    B: equipaB.slice(0, 3).map(s => _c3criar(s, rng)),
    rng, opts,
    eventos: opts.historico ? [] : null,
    ativoA: 0, ativoB: 0, turnos: 0, acabou: false,
  };
}

function combate3dtResultado(e) {
  const vivos = t => t.some(c => c.vivo);
  const vA = vivos(e.A), vB = vivos(e.B);
  return {
    vencedor: vA && !vB ? 'A' : vB && !vA ? 'B' : 'empate',
    turnos: e.turnos, eventos: e.eventos,
    pvA: e.A.reduce((t, c) => t + c.pv, 0),
    pvB: e.B.reduce((t, c) => t + c.pv, 0),
  };
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtSimular — a batalha inteira de uma vez (headless)
// ═══════════════════════════════════════════════════════════════════
function combate3dtSimular(equipaA, equipaB, seed, opts) {
  const e = combate3dtIniciar(equipaA, equipaB, seed, opts);
  while (!e.acabou) combate3dtTurno(e);
  return combate3dtResultado(e);
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtNarrar — assistir a uma batalha em texto
//
// Na consola do jogo:  combate3dtNarrar()
// Existe para se poder julgar o combate antes de haver interface.
// ═══════════════════════════════════════════════════════════════════
/* O nome da gaveta, para mostrar. As cartas que agem contra um papel
   trazem-no cru — 'muito_forte' — e há quatro sítios a escrevê-lo. */
function _c3nomePapel(papel) {
  if (!papel) return '';
  return (typeof t === 'function') ? t('mag.cat.' + papel) : papel;
}

function _c3equipa(rng) {
  const rars = ['Comum', 'Comum', 'Raro', 'Lendário'];
  const suf = ['Bravo', 'Sombrio', 'Antigo', 'Veloz', 'Sereno', 'Rubro'];
  const nCores = (typeof CORES_RODA !== 'undefined') ? CORES_RODA.length : 12;
  return [0, 1, 2].map(() => {
    const cor = Math.floor(rng() * nCores);
    const nomeCor = (typeof idDaCor === 'function') ? idDaCor(cor) : String(cor);
    return { nome: nomeCor + ' ' + suf[Math.floor(rng() * suf.length)],
             raridade: rars[Math.floor(rng() * rars.length)],
             nivel: 5 + Math.floor(rng() * 12), seed: Math.floor(rng() * 1e6),
             // O que dá a cor ao bicho é o DNA; aqui vai a forma curta
             // que a certidão também guarda (js/nascimento.js).
             nascimento: { corPrincipal: cor, corSecundaria: (cor + 5) % nCores } };
  });
}

function combate3dtNarrar(equipaA, equipaB, seed) {
  seed = seed != null ? seed : Math.floor(Math.random() * 1e6);
  const rng = _c3rng(seed + 991);
  const A = (equipaA && equipaA.length) ? equipaA.slice(0, 3) : _c3equipa(rng);
  const B = (equipaB && equipaB.length) ? equipaB.slice(0, 3) : _c3equipa(rng);
  const r = combate3dtSimular(A, B, seed, { historico: true });

  const barra = (v, m) => { const n = Math.max(0, Math.round(v / m * 10));
                            return '#'.repeat(n) + '.'.repeat(10 - n); };
  const nm = id => (typeof t === 'function' && id) ? t('mag.' + id + '.nome') : (id || 'golpe comum');
  const L = ['='.repeat(66), 'BATALHA  semente ' + seed];
  for (const [rot, eq] of [['EQUIPA A', A], ['EQUIPA B', B]]) {
    L.push('- ' + rot + ' ' + '-'.repeat(54));
    eq.forEach(s => { const f = fichaDeAvatar(s); f.seed = s.seed;
      const mg = magiasDoAvatar(f);
      L.push('  ' + s.nome + ' (' + s.raridade + ' nv' + s.nivel + ')' +
             '  F' + f.F + ' H' + f.H + ' R' + f.R + ' A' + f.A +
             '  ' + f.pv + ' PV / ' + f.pm + ' PM');
      L.push('     ' + MAGIA_SLOTS
        .map(c => mg[c] ? nm(mg[c].id) : '-').join(' | '));
      const nv2 = (vd) => (typeof t === 'function' && vd && vd.id)
        ? t('vd.' + vd.id + '.nome').replace('{papel}', _c3nomePapel(vd.papel)) : (vd && vd.id);
      if (f.vantagem) L.push('     + ' + nv2(f.vantagem) +
                             '   - ' + nv2(f.desvantagem));
    });
  }
  L.push('='.repeat(66));

  let turno = 0;
  for (const ev of (r.eventos || [])) {
    if (ev.turno !== turno) { turno = ev.turno; L.push('\n-- turno ' + turno + ' --'); }
    if (ev.troca) {
      L.push('  ' + ev.lado + ': sai ' + ev.quem + ', entra ' + ev.troca +
             (ev.limpa ? '  (saiu limpo — ainda age)' : '  (à pressa — perde o turno)'));
      continue;
    }
    const nmv = id => (typeof t === 'function' && id)
      ? t('vd.' + id + '.nome').replace('{papel}', '') : id;
    const acc = (ev.vantagem ? nmv(ev.vantagem) : nm(ev.magia)) + (ev.pm ? ' (' + ev.pm + ' PM)' : '');
    if (ev.suporte) {
      let sup = '  ' + ev.quem + ': ' + acc;
      if (ev.curou)     sup += ' -> vida cheia';
      if (ev.subiu)     sup += ' -> ' + ev.subiu + ' +1';
      if (ev.paralisou) sup += ' -> ' + ev.alvo + ' PARALISADO';
      if (ev.resistiu)  sup += ' -> resistiu';
      L.push(sup); continue;
    }
    let linha = '  ' + ev.quem + ' usa ' + acc + ' -> ';
    if (ev.esquivou) linha += ev.alvo + ' ESQUIVOU (FA ' + ev.fa + ')';
    else if (ev.fora) linha += ev.alvo + ' saiu de combate sem levar dano';
    else {
      linha += 'FA ' + ev.fa + (ev.criticoAtk ? '*' : '') +
               ' vs FD ' + ev.fd + (ev.criticoDef ? '*' : '') +
               ' = ' + ev.dano + (ev.ondas > 1 ? ' (' + ev.ondas + ' ondas)' : '');
      linha += '   ' + barra(ev.pvAlvo, ev.pvAlvoMax) + ' ' + ev.pvAlvo + '/' + ev.pvAlvoMax;
    }
    if (ev.reflexo)     linha += ' [reflexo]';
    if (ev.devolveu)    linha += ' [devolveu ' + ev.devolveu + ']';
    if (ev.enfureceu)   linha += ' [enfureceu-se]';
    if (ev.envenenou)   linha += ' [envenenado]';
    if (ev.enfraqueceu) linha += ' [enfraquecido]';
    if (ev.resistiu)    linha += ' [resistiu]';
    if (ev.caiu)        linha += '  X';
    L.push(linha);
  }
  L.push('\n' + '='.repeat(66));
  L.push(r.vencedor === 'empate' ? 'EMPATE aos ' + r.turnos + ' turnos'
        : 'VENCE A EQUIPA ' + r.vencedor + ' em ' + r.turnos + ' turnos   (PV restante: A ' + r.pvA + ' - B ' + r.pvB + ')');
  const texto = L.join('\n');
  if (typeof console !== 'undefined') console.log(texto);
  return texto;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { combate3dtSimular, combate3dtIniciar, combate3dtTurno, combate3dtResultado,
                   combate3dtNarrar, politica3dt, _c3, C3_MAX_TURNOS };
}
