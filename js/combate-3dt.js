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
//   Acção        atacar ou lançar uma magia. Uma por turno.
//   Movimento    quase tudo o que não seja atacar ou magiar (usar um
//                item, por exemplo). Um por turno, e não impede a acção.
//   Esquiva      REACÇÃO. Não é acção nem movimento, e não espera a vez.
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
    elemento: f.elemento,
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
    golpesExtra: 0,       // Golpe Encadeado: golpes a mais neste turno
    esquivas: 0,          // tentativas gastas neste turno
    bonusA: 0,            // armadura extra de magia sustentada
    bonusFD: 0,           // bónus directo à Força de Defesa
    bonusF: 0,            // Força extra de magia sustentada
    bonusH: 0,            // Habilidade extra (fúria)
    furia: false,         // em fúria: bate mais, mas não esquiva nem magia
    penalidade: 0,        // −N em todas as características (veneno)
    penalidadeR: 0,       // −N só na Resistência
    sustentadas: [],      // [{ magia, pm }] a pagar todo o turno
    veneno: false,
    indefeso: false,      // não usa a H na Defesa neste turno
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

// Característica efectiva, já com penalidades
function _c3(c, k) {
  let v = c.ficha[k] + (k === 'F' ? c.bonusF : 0) + (k === 'A' ? c.bonusA : 0)
              + (k === 'H' ? c.bonusH : 0);
  v -= c.penalidade;
  // A assombração pesa −1 em todas as características até ao fim da luta
  if (c.assombrado && c.desv && c.desv.penalidadeTudo) v -= c.desv.penalidadeTudo;
  if (k === 'R') v -= c.penalidadeR;
  return Math.max(0, v);
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
// ESQUIVA — reacção, com penalidade igual à H do atacante
// ═══════════════════════════════════════════════════════════════════
// O Passo Rápido soma 1 à Habilidade só para esquivar
function _c3bonusEsquiva(def) {
  return ((def.vant && def.vant.bonusEsquiva) ? def.vant.bonusEsquiva : 0)
       + (def.bonusEsquiva || 0);        // corrente de ar sustentada
}

function _c3podeEsquivar(def, atk) {
  if (def.furia) return false;                       // quem está em fúria não esquiva
  // Quem está indefeso também não. A magia que deixa o alvo indefeso já
  // proibia a esquiva (ver _c3resolver); a paralisia usava a bandeira e
  // ficava de fora, e um avatar paralisado saltava para o lado.
  if (def.indefeso) return false;
  if (def.esquivas >= _c3(def, 'H')) return false;   // já gastou as deste turno
  return _c3(def, 'H') - def.cegoEsquiva + _c3bonusEsquiva(def) - _c3hAtk(atk, def) >= 1;
}

function _c3esquivou(def, atk, rng, ev) {
  def.esquivas++;
  const h = _c3(def, 'H'), bonus = _c3bonusEsquiva(def), pen = _c3hAtk(atk, def);
  const partes = ['H' + h];
  if (def.cegoEsquiva) partes.push('−' + def.cegoEsquiva);
  if (bonus) partes.push('+' + bonus);
  partes.push('−H' + pen);
  return _c3testeReg(h - def.cegoEsquiva + bonus - pen, rng, ev, 'esquiva', partes);
}

// ═══════════════════════════════════════════════════════════════════
// FORÇA DE ATAQUE
// ═══════════════════════════════════════════════════════════════════
function _c3fa(atk, magia, pmGastos, rng, opts) {
  opts = opts || {};
  const d = _d6(rng);
  const critico = d === 6;                 // o crítico dobra a FORÇA, não a H

  // Toque de Energia: FA = Armadura + 1d + PMs gastos. A Habilidade não
  // entra — é a única forma de ataque do manual que a dispensa, e é o
  // que a torna útil a quem tem a Armadura alta e a Força baixa.
  if (opts.toque) {
    const A = critico ? _c3(atk, 'A') * 2 : _c3(atk, 'A');
    return { total: A + d + (opts.toquePM || 0), dado: d, critico };
  }

  if (!magia) {
    // O Golpe Carregado soma-se à Força ANTES de o crítico a dobrar:
    // o manual manda dobrar a Força, e neste golpe ela está aumentada.
    const base = _c3(atk, 'F') + (opts.bonusF || 0);
    const F = critico ? base * 2 : base;
    return { total: _c3hAtk(atk, opts.alvo) + F + d, dado: d, critico };
  }
  // Magia: a fórmula substitui o F, e o crítico não a dobra (o manual só
  // manda dobrar Força, Armadura ou PdF).
  const f = magia.fa || {};
  const extra = pmGastos - magia.pm;
  const dados = (f.dados || 0) + Math.floor(extra * (f.dadosPorPM || 0));
  let soma = (f.F ? _c3(atk, 'F') : 0) + (f.H ? _c3hAtk(atk, opts.alvo) : 0)
           + (f.fixo || 0) + Math.floor(extra * (f.fixoPorPM || 0));
  // Conjuro Desajeitado: a magia sai com Força de Ataque −1
  if (atk.desv && atk.desv.faMagiaMenos) soma -= atk.desv.faMagiaMenos;
  for (let i = 0; i < dados; i++) soma += _d6(rng);
  // Magias sem dados próprios usam o dado normal do ataque
  if (!dados) soma += d;
  return { total: soma, dado: d, critico: dados ? false : critico };
}

// ═══════════════════════════════════════════════════════════════════
// FORÇA DE DEFESA
// ═══════════════════════════════════════════════════════════════════
function _c3fd(def, rng, opts) {
  opts = opts || {};
  const d = _d6(rng);
  const critico = d === 6;                 // o crítico dobra a ARMADURA
  let A = opts.ignoraArmadura ? 0 : _c3aDef(def, opts.atacante);

  // Couraça e Ferida agem contra um elemento. Só valem contra MAGIA
  // desse elemento — um murro de um elemental de fogo é dano físico, e
  // uma Couraça de Fogo não o trava. É por isso que o golpe comum
  // continua a servir contra quem tem couraça.
  if (opts.elemento) {
    if (def.vant && def.vant.armaduraDobra && def.vant.elemento === opts.elemento) A *= 2;
    if (def.desv && def.desv.armaduraZero  && def.desv.elemento === opts.elemento) A = 0;
  }
  // A Casca de Helena dobra a Armadura contra tudo o que não seja magia
  if (def.armaduraDobrada && !opts.elemento) A *= 2;
  if (critico) A *= 2;
  // Alvo indefeso não usa a Habilidade na Defesa
  let H = (opts.indefeso || def.indefeso) ? 0 : _c3(def, 'H');
  if (def.ocultado) H *= 2;              // véu de água: some na Defesa
  return { total: H + A + d + def.bonusFD, dado: d, critico };
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
    // O Toque de Energia é magia elemental pela pele: carrega elemento
    elemento: (magia || extra.toque) ? atk.elemento : null,
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

  // Ataque Vorpal: num crítico que vença a Defesa, o alvo testa a
  // Armadura. Falhando, acabou — não é dano, é o fim.
  if (atk.vorpal && fa.critico && passou > 0 && def.vivo) {
    if (!_c3testeReg(_c3(def, 'A'), rng, ev, 'vorpal', ['A' + _c3(def, 'A')])) {
      def.vivo = false; def.pv = 0; ev.decapitou = true;
    } else ev.aguentouVorpal = true;
  }

  // O Foco Frágil deixa cair o objecto que canaliza a magia. Sem ele
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
      def.furia = true; def.bonusF += 1; def.bonusH += 1;
      ev.enfureceu = true;
    }
  }
  return passou;
}

// ═══════════════════════════════════════════════════════════════════
// EFEITOS DE MAGIA que não são dano directo
// ═══════════════════════════════════════════════════════════════════
function _c3aplicarEfeitos(atk, def, magia, pmGastos, dano, rng, ev) {
  if (!magia) return;

  // Veneno: teste de R com penalidade; falhando, −1 em tudo e sangra
  if (magia.veneno) {
    // Um efeito que precisa de ferir e não feriu tem de o dizer. Antes
    // ficava em silêncio e o jogador não sabia se a magia estava
    // avariada, se o alvo resistiu, ou se nem chegou a haver teste.
    const r = _c3resistirDetalhe(def, atk, true);
    if (magia.veneno.testeR) r.partes.push((magia.veneno.testeR > 0 ? '+' : '−') + Math.abs(magia.veneno.testeR));
    if (dano <= 0) ev.semDano = true;
    else if (!_c3testeReg(r.valor + (magia.veneno.testeR || 0), rng, ev, 'veneno', r.partes)) {
      def.veneno = true; def.penalidade += magia.veneno.penalidade || 1;
      ev.envenenou = true;
    } else ev.resistiuVeneno = true;
  }
  // Dor persistente: −1 de Resistência até ao fim do combate
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

  // Magias sustentadas: ficam a pagar PM todo o turno
  if (magia.porTurno) {
    atk.sustentadas.push({ magia, pm: pmGastos });
    if (magia.armaduraPorPM) atk.bonusA += Math.min(pmGastos, magia.armaduraMax || 5);
    if (magia.armadura)      atk.bonusA += magia.armadura;
    if (magia.buffForca)     atk.bonusF += magia.buffForca;
    if (magia.armaduraDobra) { atk.armaduraDobrada = true; ev.armaduraDobrou = true; }
    if (magia.bonusFDPorPM)  { atk.bonusFD += pmGastos * magia.bonusFDPorPM; ev.bonusFD = pmGastos; }
    if (magia.vorpal)        { atk.vorpal = true; ev.vorpal = true; }
    if (magia.roubaVida)     { atk.roubando = magia.roubaVida; ev.roubando = true; }
  }

  // ── CURA ──
  // A única cura do jogo, e é da Água: 1d de vida por cada 2 PMs.
  if (magia.cura) {
    const dados = Math.max(1, Math.floor(pmGastos * (magia.cura.dadosPorPM || 0.5)));
    let v = 0; for (let i = 0; i < dados; i++) v += _d6(rng);
    const antes = atk.pv;
    atk.pv = Math.min(atk.pvMax, atk.pv + v);
    ev.curou = atk.pv - antes; ev.curaDados = dados;
  }

  // Congelar por um turno: não tira de combate como a Prisão de Gelo,
  // só deixa o alvo indefeso — sem atacar, esquivar nem lançar magia.
  if (magia.congelaUmTurno) {
    if (dano <= 0) ev.semDano = true;
    else {
      const r = _c3resistirDetalhe(def, atk, false);
      if (!_c3testeReg(r.valor, rng, ev, 'congelar', r.partes)) {
        def.indefeso = true; def.indefesoTurnos = 2; ev.congelouUmTurno = true;
      } else ev.resistiu = true;
    }
  }

  // ── CEGUEIRA ──
  // Não fere: estraga a pontaria e a esquiva até ao fim do combate.
  if (magia.cegueira) {
    const r = _c3resistirDetalhe(def, atk, false);
    if (!_c3testeReg(r.valor, rng, ev, 'cegueira', r.partes)) {
      def.cegoAtaque += magia.cegueira.ataque; def.cegoEsquiva += magia.cegueira.esquiva;
      ev.cegou = true;
    } else ev.resistiu = true;
  }
  if (magia.bonusFD) { atk.bonusFD += magia.bonusFD; atk.sustentadas.push({ magia, pm: 0 }); }

  // ── AS DEFENSIVAS ──
  // Estavam todas no catálogo e nenhuma existia no motor: gastavam PM e
  // não faziam absolutamente nada. Cada uma segue o efeito que o manual
  // lhe dá, traduzido para o que este combate sabe fazer.

  // Corpo elemental: enquanto sustentada, o dano não entra. Custa 20 PM
  // TODO O TURNO, portanto na prática compra-se um turno e acaba — é a
  // própria conta de PM que a trava, não uma excepção à regra.
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
    atk.furia = true; atk.bonusF += 1; atk.bonusH += 1;
    atk.sustentadas.push({ magia, pm: pmGastos });
    ev.furia = true;
  }
}

// ═══════════════════════════════════════════════════════════════════
// TROCAR DE AVATAR
//
// O manual não tem regra para isto — no 3D&T o grupo todo luta ao mesmo
// tempo, não há "activo" nem banco. O formato 3v3 é nosso, e a troca
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
// A Afinidade Profunda paga metade nas magias do próprio elemento
// (arredondando para cima, como o manual manda). As universais não
// contam: não são do elemento de ninguém.
// ═══════════════════════════════════════════════════════════════════
function _c3custoMagia(c, magia, pm, inimigo) {
  if (!magia) return 0;
  const propria = magia.id && magia.id.slice(0, 3) !== 'un_';
  let custo = pm;
  if (c.vant && c.vant.metadeCustoProprioElemento && propria) custo = Math.ceil(custo / 2);

  // O dobro: a assombração cobra sempre, a veia travada só contra o
  // elemento que a tranca. Aplicam-se depois da Afinidade, senão metade
  // de nada valia — e podem acumular, que é o pior dos mundos possíveis.
  if (c.assombrado && c.desv && c.desv.dobraCustoMagia) custo *= 2;
  if (c.desv && c.desv.dobraCustoMagia && !c.desv.assombraEm
      && inimigo && c.desv.elemento === inimigo.elemento) custo *= 2;
  return custo;
}

// ═══════════════════════════════════════════════════════════════════
// PAGAR UMA MAGIA
//
// Normalmente sai dos PM. Com a vantagem Sangue por Magia, o que
// faltar sai dos PV a 2 por 1 — mas nunca até morrer: quem paga com o
// corpo continua a precisar dele.
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
// Vale a pena trocar? Duas razões concretas, e nenhuma delas é palpite:
//   · tenho Ferida do elemento dele — a minha Armadura conta zero
//   · ele tem Couraça do meu elemento — a Armadura dele conta a dobrar
// Mais a razão de sempre: estou quase a cair e há quem esteja inteiro.
function _c3valeTrocar(eu, inimigo, banco) {
  const feridoPeloElemento = eu.desv && eu.desv.armaduraZero && eu.desv.elemento === inimigo.elemento;
  const eleResisteMe       = inimigo.vant && inimigo.vant.armaduraDobra && inimigo.vant.elemento === eu.elemento;
  const quaseACair         = eu.pv <= eu.pvMax * 0.25;
  if (!feridoPeloElemento && !eleResisteMe && !quaseACair) return -1;

  // O melhor do banco: sem ferida contra este inimigo, e o mais inteiro
  let melhor = -1, melhorNota = -1;
  banco.forEach((o, i) => {
    if (!o || !o.vivo || o === eu) return;
    const ferido = o.desv && o.desv.armaduraZero && o.desv.elemento === inimigo.elemento;
    const resiste = o.vant && o.vant.armaduraDobra && o.vant.elemento === inimigo.elemento;
    const nota = (o.pv / o.pvMax) + (ferido ? -1 : 0) + (resiste ? 0.6 : 0);
    if (nota > melhorNota) { melhorNota = nota; melhor = i; }
  });
  // Só troca se o outro estiver mesmo melhor do que quem está em campo
  const minha = (eu.pv / eu.pvMax) + (feridoPeloElemento ? -1 : 0);
  return (melhor >= 0 && melhorNota > minha + 0.3) ? melhor : -1;
}

function politica3dt(eu, inimigo) {
  const m = eu.magias || {};
  const v = eu.vant;

  // ── O foco caiu: apanhá-lo custa o turno, mas sem ele não há magia ──
  // Só vale a pena para quem vive de magia; um avatar que bate melhor
  // do que lança fica a bater.
  if (eu.semFoco) {
    const vivoDeMagia = m.ataque || m.forte;
    if (vivoDeMagia && _c3(eu, 'F') <= _c3(eu, 'H')) return { apanharFoco: true };
    return { magia: null, pm: 0, golpeSimples: false };
  }

  if (!_c3podeMagiar(eu)) return { magia: null, pm: 0 };   // fúria ou limiar baixo
  const tecto = _c3(eu, 'H') * 5;
  const bolsa = _c3pmDisponivel(eu);
  const podePagar = g => g && g.pm <= tecto
                      && _c3custoMagia(eu, g, g.pm, inimigo) <= bolsa;

  // ── Vantagens que gastam a acção do turno ──
  // O Segundo Fôlego só compensa quando já se perdeu muita vida: gasta
  // o turno inteiro, portanto usá-lo com a vida quase cheia é oferecer
  // um turno ao adversário.
  if (v && v.curaTudo && eu.pm >= v.pm && eu.pv < eu.pvMax * 0.35) {
    return { vantagem: v, pm: v.pm };
  }
  // A Reserva Oculta sobe uma característica; vale a pena cedo, para o
  // bónus durar o combate todo.
  if (v && v.subirCarac && eu.pm >= v.pm && (eu.reservaGasta || 0) < v.maxTotal) {
    return { vantagem: v, pm: v.pm };
  }
  // O Toque Paralisante não fere: tira o adversário de acção.
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

  // ── Curar-se ──
  // Antes de qualquer outra coisa: com a vida por baixo de metade, uma
  // cura vale mais do que um golpe que talvez nem passe a Defesa.
  for (const cand of [m.defesa, m.ataque, m.forte]) {
    if (cand && cand.cura && podePagar(cand) && eu.pv < eu.pvMax * 0.55)
      return { magia: cand, pm: _c3pmIdeal(cand, eu, tecto) };
  }

  // Rematar: se o ataque forte cabe e o inimigo está por um fio, usa-o
  if (podePagar(m.forte) && inimigo.pv <= inimigo.pvMax * 0.4) {
    return { magia: m.forte, pm: _c3pmIdeal(m.forte, eu, tecto) };
  }
  // Erguer a defesa quando ainda não está de pé e há folga de PM
  if (podePagar(m.defesa) && !m.defesa.cura
      && !eu.bonusA && !eu.bonusFD && !eu.armaduraDobrada && !eu.vorpal && !eu.roubando
      && eu.pm > eu.pmMax * 0.5 && eu.pv < eu.pvMax * 0.7) {
    return { magia: m.defesa, pm: _c3pmIdeal(m.defesa, eu, tecto) };
  }
  // Abrir com um buff sustentado, se tiver um e ainda não estiver de pé.
  // É isto que quebra o empate entre duas fichas parecidas: com F+2 a
  // conta FA vs FD deixa de dar zero. Sem isto a política trocava
  // golpes que não faziam nada.
  for (const cand of [m.ataque, m.forte, m.defesa]) {
    if (cand && (cand.vorpal || cand.roubaVida) && podePagar(cand)
        && !eu.vorpal && !eu.roubando) {
      return { magia: cand, pm: cand.pm };
    }
  }
  for (const cand of [m.ataque, m.defesa]) {
    if (cand && (cand.buffForca || cand.buffFuria) && podePagar(cand)
        && !eu.bonusF && !eu.furia) {
      return { magia: cand, pm: cand.pm };
    }
  }
  // Caso normal: a magia de ataque se der, senão o golpe comum (grátis)
  if (podePagar(m.ataque)) return { magia: m.ataque, pm: _c3pmIdeal(m.ataque, eu, tecto) };

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
  let custo = c.sustentadas.reduce((t, s) => t + (s.magia.porTurno ? s.pm : 0), 0);
  if (custo > c.pm) {
    if (c.sustentadas.length) fora.sustentadasCairam = c.sustentadas.length;
    c.sustentadas = []; c.bonusA = 0; c.bonusF = 0; c.bonusFD = 0;
    c.bonusH = 0; c.furia = false;
    c.invulneravel = false; c.ocultado = false; c.bonusEsquiva = 0;
    c.armaduraDobrada = false; c.vorpal = false; c.roubando = null;
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
  // enquanto o golpe que o causou está a ser resolvido.
  if (c.indefesoTurnos > 0) {
    c.indefesoTurnos--; c.indefeso = c.indefesoTurnos > 0;
    if (!c.indefeso) fora.destravou = true;
  }
  else c.indefeso = false;
  return Object.keys(fora).length ? fora : null;
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtSimular
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// UM TURNO
//
// Extraído do ciclo para os dois modos o partilharem: o headless
// (combate3dtSimular) corre-o em ciclo, e o interactivo chama-o uma vez
// por decisão do jogador. Uma só implementação, portanto o que se vê no
// ecrã é exactamente o que as 5000 batalhas de teste correram.
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
  const acao = (opts.politica || politica3dt)(l.c, l.alvo);

    // ── Apanhar o foco caído: gasta o turno inteiro e mais nada ──
    if (acao.apanharFoco && l.c.semFoco) {
      l.c.semFoco = false;
      if (eventos) eventos.push({ turno: turnos, lado: l.lado, quem: l.c.nome,
                                  alvo: l.alvo.nome, quemIdx: iMeu(), alvoIdx: iDele(),
                                  apanhouFoco: true, suporte: true });
      continue;
    }

    const magia = acao.magia;
    const pmBruto = magia ? acao.pm : 0;
    const pm = magia ? Math.min(pmBruto, _c3pmDisponivel(l.c)) : 0;

    // Os índices, não só os nomes: a interface anima o cartão certo com
    // eles. Sem isto ela usava o activo do momento — e como o activo
    // avança no fim do turno, a animação do golpe caía no inimigo
    // seguinte enquanto o dano tinha sido no anterior.
    const ev = { turno: turnos, lado: l.lado, quem: l.c.nome, alvo: l.alvo.nome,
                 quemIdx: iMeu(), alvoIdx: iDele(),
                 magia: magia ? magia.id : null, pm };

    if (magia) {
      _c3pagar(l.c, _c3custoMagia(l.c, magia, pm, l.alvo), ev);
      if (l.c.pv === 0) l.c.vivo = false;
      // A Sina Cobradora tira vida a cada magia, sem direito a resistir
      if (l.c.desv && l.c.desv.danoPorMagia) {
        l.c.pv = Math.max(0, l.c.pv - l.c.desv.danoPorMagia);
        if (l.c.pv === 0) l.c.vivo = false;
      }
      if (!l.c.vivo) { if (eventos) { ev.caiuSozinho = true; eventos.push(ev); } continue; }
    }

    // Vantagem usada como acção do turno
    if (acao.vantagem) {
      const w = acao.vantagem;
      l.c.pm -= w.pm;
      if (w.curaTudo)    { l.c.pv = l.c.pvMax; ev.curou = true; }
      if (w.subirCarac)  {
        // Sobe a característica que mais falta faz: a Força se não
        // fere, a Armadura se está a levar de mais.
        const alvo = (l.c.pv < l.c.pvMax * 0.5) ? 'A' : 'F';
        l.c[alvo === 'A' ? 'bonusA' : 'bonusF'] += w.subirCarac;
        l.c.reservaGasta = (l.c.reservaGasta || 0) + w.subirCarac;
        ev.subiu = alvo;
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
      _c3aplicarEfeitos(l.c, l.alvo, magia, pm, 0, rng, ev);
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
      _c3aplicarEfeitos(l.c, l.alvo, magia, pm, total, rng, ev);
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
function _c3equipa(rng) {
  const els = (typeof CARACTERISTICAS_ELEMENTAIS !== 'undefined')
    ? Object.keys(CARACTERISTICAS_ELEMENTAIS)
    : ['Fogo', 'Água', 'Terra', 'Vento', 'Sombra'];
  const rars = ['Comum', 'Comum', 'Raro', 'Lendário'];
  const suf = ['Bravo', 'Sombrio', 'Antigo', 'Veloz', 'Sereno', 'Rubro'];
  return [0, 1, 2].map(() => {
    const el = els[Math.floor(rng() * els.length)];
    return { nome: el + ' ' + suf[Math.floor(rng() * suf.length)], elemento: el,
             raridade: rars[Math.floor(rng() * rars.length)],
             nivel: 5 + Math.floor(rng() * 12), seed: Math.floor(rng() * 1e6) };
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
      L.push('  ' + s.nome + ' (' + s.elemento + ' ' + s.raridade + ' nv' + s.nivel + ')' +
             '  F' + f.F + ' H' + f.H + ' R' + f.R + ' A' + f.A +
             '  ' + f.pv + ' PV / ' + f.pm + ' PM');
      L.push('     ' + ['ataque','forte','defesa']
        .map(c => mg[c] ? nm(mg[c].id) : '-').join(' | '));
      const nv2 = (id, el) => (typeof t === 'function' && id)
        ? t('vd.' + id + '.nome').replace('{elem}', el || '') : id;
      if (f.vantagem) L.push('     + ' + nv2(f.vantagem.id, f.vantagem.elemento) +
                             '   - ' + nv2(f.desvantagem.id, f.desvantagem.elemento));
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
      ? t('vd.' + id + '.nome').replace('{elem}', '') : id;
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
