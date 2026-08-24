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
  };
}

// Característica efectiva, já com penalidades
function _c3(c, k) {
  let v = c.ficha[k] + (k === 'F' ? c.bonusF : 0) + (k === 'A' ? c.bonusA : 0)
              + (k === 'H' ? c.bonusH : 0);
  v -= c.penalidade;
  if (k === 'R') v -= c.penalidadeR;
  return Math.max(0, v);
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
  return (def.vant && def.vant.bonusEsquiva) ? def.vant.bonusEsquiva : 0;
}

function _c3podeEsquivar(def, atk) {
  if (def.furia) return false;                       // quem está em fúria não esquiva
  if (def.esquivas >= _c3(def, 'H')) return false;   // já gastou as deste turno
  return _c3(def, 'H') + _c3bonusEsquiva(def) - _c3(atk, 'H') >= 1;
}

function _c3esquivou(def, atk, rng) {
  def.esquivas++;
  return _c3teste(_c3(def, 'H') + _c3bonusEsquiva(def) - _c3(atk, 'H'), rng);
}

// ═══════════════════════════════════════════════════════════════════
// FORÇA DE ATAQUE
// ═══════════════════════════════════════════════════════════════════
function _c3fa(atk, magia, pmGastos, rng) {
  const d = _d6(rng);
  const critico = d === 6;                 // o crítico dobra a FORÇA, não a H
  if (!magia) {
    const F = critico ? _c3(atk, 'F') * 2 : _c3(atk, 'F');
    return { total: _c3(atk, 'H') + F + d, dado: d, critico };
  }
  // Magia: a fórmula substitui o F, e o crítico não a dobra (o manual só
  // manda dobrar Força, Armadura ou PdF).
  const f = magia.fa || {};
  const extra = pmGastos - magia.pm;
  const dados = (f.dados || 0) + Math.floor(extra * (f.dadosPorPM || 0));
  let soma = (f.F ? _c3(atk, 'F') : 0) + (f.H ? _c3(atk, 'H') : 0)
           + (f.fixo || 0) + Math.floor(extra * (f.fixoPorPM || 0));
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
  let A = opts.ignoraArmadura ? 0 : _c3(def, 'A');

  // Couraça e Ferida agem contra um elemento. Só valem contra MAGIA
  // desse elemento — um murro de um elemental de fogo é dano físico, e
  // uma Couraça de Fogo não o trava. É por isso que o golpe comum
  // continua a servir contra quem tem couraça.
  if (opts.elemento) {
    if (def.vant && def.vant.armaduraDobra && def.vant.elemento === opts.elemento) A *= 2;
    if (def.desv && def.desv.armaduraZero  && def.desv.elemento === opts.elemento) A = 0;
  }
  if (critico) A *= 2;
  // Alvo indefeso não usa a Habilidade na Defesa
  const H = (opts.indefeso || def.indefeso) ? 0 : _c3(def, 'H');
  return { total: H + A + d + def.bonusFD, dado: d, critico };
}

// ═══════════════════════════════════════════════════════════════════
// UM ATAQUE COMPLETO
// ═══════════════════════════════════════════════════════════════════
function _c3resolver(atk, def, magia, pmGastos, rng, ev) {
  const fa = _c3fa(atk, magia, pmGastos, rng);

  // O defensor pode tentar esquivar antes de rolar a Defesa
  if (_c3podeEsquivar(def, atk) && !(magia && magia.alvoIndefeso)) {
    if (_c3esquivou(def, atk, rng)) {
      ev.esquivou = true; ev.fa = fa.total;
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
    elemento: magia ? atk.elemento : null,   // só a magia carrega elemento
  });

  const totalFD = fd.total + reflexo;
  const dano = Math.max(0, fa.total - totalFD);

  // O Reflexo Espelhado devolve o golpe se a defesa o segurou por inteiro
  if (reflexo && dano === 0 && def.vant.devolve) {
    const volta = Math.max(0, fa.total - (_c3(atk, 'H') + _c3(atk, 'A')));
    atk.pv = Math.max(0, atk.pv - volta);
    if (atk.pv === 0) atk.vivo = false;
    ev.devolveu = volta;
  }

  def.pv = Math.max(0, def.pv - dano);
  if (def.pv === 0) def.vivo = false;

  ev.fa = fa.total; ev.fd = totalFD; ev.dano = dano;
  ev.criticoAtk = fa.critico; ev.criticoDef = fd.critico;

  // O Sangue Quente perde a cabeça ao levar dano: testa Resistência e,
  // falhando, entra em fúria — bate mais, mas não esquiva nem magia.
  if (dano > 0 && def.vivo && def.desv && def.desv.furiaAoSofrerDano && !def.furia) {
    if (!_c3teste(_c3(def, 'R'), rng)) {
      def.furia = true; def.bonusF += 1; def.bonusH += 1;
      ev.enfureceu = true;
    }
  }
  return dano;
}

// ═══════════════════════════════════════════════════════════════════
// EFEITOS DE MAGIA que não são dano directo
// ═══════════════════════════════════════════════════════════════════
function _c3aplicarEfeitos(atk, def, magia, pmGastos, dano, rng, ev) {
  if (!magia) return;

  // Veneno: teste de R com penalidade; falhando, −1 em tudo e sangra
  if (magia.veneno && dano > 0) {
    if (!_c3teste(_c3(def, 'R') + (magia.veneno.testeR || 0), rng)) {
      def.veneno = true; def.penalidade += magia.veneno.penalidade || 1;
      ev.envenenou = true;
    }
  }
  // Dor persistente: −1 de Resistência até ao fim do combate
  if (magia.debuffR && dano > 0) { def.penalidadeR += magia.debuffR; ev.enfraqueceu = true; }

  // Tirar de combate sem passar pelos PV. Não é dano: é um teste de
  // Resistência e acabou. É o que o motor antigo não sabia fazer.
  if (magia.petrifica || magia.congela || magia.destroiAlma) {
    if (!_c3teste(_c3(def, 'R'), rng)) { def.fora = true; def.vivo = false; ev.fora = true; }
    else ev.resistiu = true;
  }

  // Magias sustentadas: ficam a pagar PM todo o turno
  if (magia.porTurno) {
    atk.sustentadas.push({ magia, pm: pmGastos });
    if (magia.armaduraPorPM) atk.bonusA += Math.min(pmGastos, magia.armaduraMax || 5);
    if (magia.armadura)      atk.bonusA += magia.armadura;
    if (magia.buffForca)     atk.bonusF += magia.buffForca;
  }
  if (magia.bonusFD) { atk.bonusFD += magia.bonusFD; atk.sustentadas.push({ magia, pm: 0 }); }

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
// O QUE UMA MAGIA CUSTA A ESTE AVATAR
//
// A Afinidade Profunda paga metade nas magias do próprio elemento
// (arredondando para cima, como o manual manda). As universais não
// contam: não são do elemento de ninguém.
// ═══════════════════════════════════════════════════════════════════
function _c3custoMagia(c, magia, pm) {
  if (!magia) return 0;
  const propria = magia.id && magia.id.slice(0, 3) !== 'un_';
  if (c.vant && c.vant.metadeCustoProprioElemento && propria) return Math.ceil(pm / 2);
  return pm;
}

// O Limiar Baixo tranca a magia abaixo de metade da vida
function _c3podeMagiar(c) {
  if (c.furia) return false;
  if (c.desv && c.desv.semMagiaAbaixoDeMetade && c.pv < c.pvMax / 2) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// A POLÍTICA — como um lado decide o que fazer
//
// Não é "a IA do jogo": é um jogador razoável de referência, para as
// medições terem sentido. Um humano joga melhor do que isto.
// ═══════════════════════════════════════════════════════════════════
function politica3dt(eu, inimigo) {
  const m = eu.magias || {};
  if (!_c3podeMagiar(eu)) return { magia: null, pm: 0 };   // fúria ou limiar baixo
  const tecto = _c3(eu, 'H') * 5;
  const podePagar = g => g && g.pm <= tecto && _c3custoMagia(eu, g, g.pm) <= eu.pm;

  // ── Vantagens que gastam a acção do turno ──
  const v = eu.vant;
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

  // Rematar: se o ataque forte cabe e o inimigo está por um fio, usa-o
  if (podePagar(m.forte) && inimigo.pv <= inimigo.pvMax * 0.4) {
    return { magia: m.forte, pm: _c3pmIdeal(m.forte, eu, tecto) };
  }
  // Erguer a defesa quando ainda não está de pé e há folga de PM
  if (podePagar(m.defesa) && !eu.bonusA && !eu.bonusFD && eu.pm > eu.pmMax * 0.5
      && eu.pv < eu.pvMax * 0.7) {
    return { magia: m.defesa, pm: _c3pmIdeal(m.defesa, eu, tecto) };
  }
  // Abrir com um buff sustentado, se tiver um e ainda não estiver de pé.
  // É isto que quebra o empate entre duas fichas parecidas: com F+2 a
  // conta FA vs FD deixa de dar zero. Sem isto a política trocava
  // golpes que não faziam nada.
  for (const cand of [m.ataque, m.defesa]) {
    if (cand && (cand.buffForca || cand.buffFuria) && podePagar(cand)
        && !eu.bonusF && !eu.furia) {
      return { magia: cand, pm: cand.pm };
    }
  }
  // Caso normal: a magia de ataque se der, senão o golpe comum (grátis)
  if (podePagar(m.ataque)) return { magia: m.ataque, pm: _c3pmIdeal(m.ataque, eu, tecto) };
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
function _c3fimTurno(c) {
  if (!c.vivo) return;
  // Magias sustentadas cobram todo o turno. Sem PM, caem.
  let custo = c.sustentadas.reduce((t, s) => t + (s.magia.porTurno ? s.pm : 0), 0);
  if (custo > c.pm) {
    c.sustentadas = []; c.bonusA = 0; c.bonusF = 0; c.bonusFD = 0;
    c.bonusH = 0; c.furia = false;
  } else {
    c.pm -= custo;
  }
  if (c.veneno) { c.pv = Math.max(0, c.pv - 1); if (c.pv === 0) c.vivo = false; }
  // A Cura Perpétua fecha o corpo sozinha, sem custo nenhum
  if (c.vant && c.vant.pvPorTurno && c.vivo) {
    c.pv = Math.min(c.pvMax, c.pv + c.vant.pvPorTurno);
  }
  c.esquivas = 0;
  c.indefeso = false;
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtSimular
// ═══════════════════════════════════════════════════════════════════
function combate3dtSimular(equipaA, equipaB, seed, opts) {
  opts = opts || {};
  const rng = _c3rng(seed || 1);
  const A = equipaA.slice(0, 3).map(s => _c3criar(s, rng));
  const B = equipaB.slice(0, 3).map(s => _c3criar(s, rng));
  const eventos = opts.historico ? [] : null;
  let ativoA = 0, ativoB = 0, turnos = 0;

  const vivos = t => t.some(c => c.vivo);
  const proximo = (t, i) => (t[i] && t[i].vivo) ? i : t.findIndex(c => c.vivo);

  while (vivos(A) && vivos(B) && turnos < C3_MAX_TURNOS) {
    turnos++;
    ativoA = proximo(A, ativoA);
    ativoB = proximo(B, ativoB);

    // Ordem: iniciativa mais alta primeiro; empate pela H; depois juntos.
    const lados = [
      { c: A[ativoA], alvo: B[ativoB], lado: 'A' },
      { c: B[ativoB], alvo: A[ativoA], lado: 'B' },
    ].sort((x, y) => (y.c.iniciativa - x.c.iniciativa) || (_c3(y.c, 'H') - _c3(x.c, 'H')));

    for (const l of lados) {
      if (!l.c.vivo || !l.alvo.vivo) continue;
      const acao = (opts.politica || politica3dt)(l.c, l.alvo);
      const magia = acao.magia;
      const pmBruto = magia ? acao.pm : 0;
      const pm = magia ? Math.min(pmBruto, l.c.pm) : 0;
      if (magia) {
        l.c.pm -= _c3custoMagia(l.c, magia, pm);
        // A Sina Cobradora tira vida a cada magia, sem direito a resistir
        if (l.c.desv && l.c.desv.danoPorMagia) {
          l.c.pv = Math.max(0, l.c.pv - l.c.desv.danoPorMagia);
          if (l.c.pv === 0) l.c.vivo = false;
        }
      }

      const ev = { turno: turnos, lado: l.lado, quem: l.c.nome, alvo: l.alvo.nome,
                   magia: magia ? magia.id : null, pm };

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
          if (!_c3teste(_c3(l.alvo, 'R'), rng)) { l.alvo.indefeso = true; ev.paralisou = true; }
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
        let total = 0;
        for (let o = 0; o < ondas && l.alvo.vivo; o++) {
          total += _c3resolver(l.c, l.alvo, magia, pm, rng, ev);
        }
        ev.dano = total; ev.ondas = ondas;
        _c3aplicarEfeitos(l.c, l.alvo, magia, pm, total, rng, ev);
      }
      ev.pvAlvo = l.alvo.pv; ev.pvAlvoMax = l.alvo.pvMax;
      ev.pmProprio = l.c.pm;
      if (!l.alvo.vivo) ev.caiu = true;
      if (eventos) eventos.push(ev);
    }

    [...A, ...B].forEach(_c3fimTurno);
  }

  const vA = vivos(A), vB = vivos(B);
  return {
    vencedor: vA && !vB ? 'A' : vB && !vA ? 'B' : 'empate',
    turnos, eventos,
    pvA: A.reduce((t, c) => t + c.pv, 0),
    pvB: B.reduce((t, c) => t + c.pv, 0),
  };
}

// ═══════════════════════════════════════════════════════════════════
// combate3dtNarrar — assistir a uma batalha em texto
//
// Na consola do jogo:  combate3dtNarrar()
// Existe para se poder julgar o combate antes de haver interface.
// ═══════════════════════════════════════════════════════════════════
function _c3equipa(rng) {
  const els = Object.keys(COMBATE_AFINIDADE || { Fogo:1 });
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
  module.exports = { combate3dtSimular, combate3dtNarrar, politica3dt, C3_MAX_TURNOS };
}
