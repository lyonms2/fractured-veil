// ═══════════════════════════════════════════════════════════════════
// COMBATE — MOTOR
//
// A batalha inteira, sem uma única linha de interface. Isto é
// deliberado: o motor tem seis alvos numéricos para bater, e só se
// consegue medir isso correndo milhares de batalhas sem ecrã.
//
//   combateSimular(equipaA, equipaB, seed) → { vencedor, turnos, log }
//
// Determinístico: a mesma semente dá sempre a mesma batalha. Isso é o
// que permite reproduzir um bug a partir do resultado, e é também o que
// vai permitir ao servidor reconferir um resultado de PvP sem confiar
// no cliente.
// ═══════════════════════════════════════════════════════════════════

// ── VANTAGEM ELEMENTAL ──
// Os quatro clássicos em ciclo fechado: cada um vence o seguinte e perde
// para o anterior. A água apaga o fogo, o fogo consome o ar, o vento
// erode a terra, a terra absorve a água.
//
// Com 4 elementos, metade dos confrontos possíveis tem factor elemental
// (8 de 16 pares ordenados). Com 7 eram 20%, porque a Luz e a Sombra
// estavam fora da tabela e não multiplicavam nada.
const COMBATE_CICLO = ['Água', 'Fogo', 'Vento', 'Terra'];
const COMBATE_MULT_VANTAGEM = 1.25;
const COMBATE_MULT_FRAQUEZA = 0.80;

function multElemental(atacante, defensor) {
  const a = COMBATE_CICLO.indexOf(atacante);
  const d = COMBATE_CICLO.indexOf(defensor);
  if (a < 0 || d < 0) return 1.0;                       // elemento desconhecido
  if ((a + 1) % COMBATE_CICLO.length === d) return COMBATE_MULT_VANTAGEM;
  if ((d + 1) % COMBATE_CICLO.length === a) return COMBATE_MULT_FRAQUEZA;
  return 1.0;
}

// ── CONSTANTES DE BATALHA ──
// Custos afinados por simulação. Com a energia fixa em 100, o ultimate
// custa 40% da barra e a troca outros 40% — é isso que impede trocar
// todos os turnos sem abdicar de nada.
//
// A defesa subiu de 16 para 28: a 16 dava para manter escudo quase
// permanente, e as batalhas de elementos com RES alta não acabavam —
// 16% delas batiam no tecto de 60 turnos e ficavam empatadas.
const COMBATE_CUSTOS   = [0, 20, 40, 28];
const COMBATE_GERA_EN  = 15;    // o ataque comum devolve energia
// Trocar custa 25 e não os 40 da spec: a 40 a troca valia ~5pp de taxa
// de vitória e ninguém trocava; a 25 vale o dobro sem passar a ser
// grátis. Continua a ser um quarto da barra.
const COMBATE_TROCA_EN = 25;    // trocar custa energia, não o turno
const COMBATE_RESERVA_EN = 25;  // quem está no banco recupera energia

// ── DEFESA ──
// Quem é atacado escolhe: esquivar ou bloquear. Não há defesa passiva —
// o teste de acerto automático que existia dava pontaria à HAB de graça,
// e com a HAB a passar a dar esquiva contaria duas vezes.
//
//   ESQUIVAR (HAB)  tudo ou nada. Se sai, não entra dano nenhum.
//                   Se falha, o golpe entra inteiro. Custa energia.
//   BLOQUEAR (ARM)  garantido, nunca anula. Reduz uma fracção do golpe
//                   que cresce com a ARM. Não custa nada.
//
// Os dois valem sensivelmente o mesmo em dano esperado. A diferença é a
// variância — e é aí que está a decisão.
const COMBATE_ESQUIVA_BASE = 0.30;
const COMBATE_ESQUIVA_POR_HAB = 0.025;   // por ponto de HAB acima do atacante
const COMBATE_ESQUIVA_MIN = 0.05;
const COMBATE_ESQUIVA_MAX = 0.60;        // nem o mais rápido é intocável
const COMBATE_ESQUIVA_EN  = 12;          // esquivar cansa; bloquear não

// Redução do bloqueio: ARM/(ARM+K). Curva com rendimentos decrescentes,
// para dobrar a ARM não dobrar a defesa e a Terra não virar imortal.
const COMBATE_BLOQUEIO_K   = 26;
const COMBATE_BLOQUEIO_MAX = 0.60;

const COMBATE_CRIT       = 0.16;
const COMBATE_CRIT_MULT  = 1.50;
const COMBATE_TETO_GOLPE = 0.45;   // do HP MÁXIMO do alvo, rígido
const COMBATE_MAX_TURNOS = 60;

// ═══════════════════════════════════════════════════════════════════
// RNG determinístico — mesma família do resto do jogo
// ═══════════════════════════════════════════════════════════════════
function _rngBatalha(seed) {
  let s = (Math.abs(seed | 0) ^ 0x9E37) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s >>> 8) / 16777216;   // [0,1) a partir dos bits altos
  };
}

// ═══════════════════════════════════════════════════════════════════
// COMBATENTE — o estado de um avatar durante a batalha
// ═══════════════════════════════════════════════════════════════════
function _criarCombatente(slot) {
  const f = fichaDeCombate(slot);
  return {
    ficha: f, nome: slot.nome || 'Avatar', elemento: f.elemento,
    hp: f.hpMax, hpMax: f.hpMax, en: f.enMax, enMax: f.enMax,
    vivo: true,
    escudo: 0, escudoTurnos: 0, escudoRefl: 0, escudoRegenHP: 0, escudoRegenEN: 0,
    dots: [],            // [{ dano, turnos, ignoraEscudo }]
    debuffAcerto: [],    // [{ v, turnos }]  — reduz o MEU acerto
    evasao: [],          // [{ v, turnos }]  — reduz o acerto de quem me ataca
    debuffStat: [],      // [{ stats, v, turnos }]
    atordoado: 0,
    critGarantido: false,
    golpesAcertados: 0,
  };
}

// Atributo efectivo, já com os debuffs activos
function _stat(c, k) {
  let v = c.ficha[k];
  for (const d of c.debuffStat) if (d.stats.includes(k)) v *= (1 - d.v);
  return v;
}

// ═══════════════════════════════════════════════════════════════════
// O valor de um slot AGORA, com os debuffs que estiverem em cima.
//
// Usa as fórmulas de COMBATE_SLOTS (combate-ficha.js) e não cópias
// delas: se o motor calculasse por sua conta, a ficha que o jogador vê
// e o dano que sai podiam divergir sem ninguém dar por isso.
// ═══════════════════════════════════════════════════════════════════
function _valorSlot(c, slot) {
  const efetivo = {
    FOR: _stat(c, 'FOR'), INT: _stat(c, 'INT'),
    HAB: _stat(c, 'HAB'), RES: c.ficha.RES,   // a RES não sofre debuff: já virou HP
  };
  return COMBATE_SLOTS[slot].calc(efetivo);
}

// Quanto o defensor esquiva deste atacante. Os debuffs de pontaria do
// atacante e a evasão do defensor entram aqui — passaram a ser bónus de
// esquiva em vez de penalizações de acerto, que é a mesma coisa vista do
// outro lado da mesa.
function _chanceEsquiva(atk, def) {
  let p = COMBATE_ESQUIVA_BASE + (_stat(def, 'HAB') - _stat(atk, 'HAB')) * COMBATE_ESQUIVA_POR_HAB;
  for (const d of atk.debuffAcerto) p += d.v;
  for (const e of def.evasao)       p += e.v;
  return Math.max(COMBATE_ESQUIVA_MIN, Math.min(COMBATE_ESQUIVA_MAX, p));
}

function _reducaoBloqueio(def) {
  const arm = _stat(def, 'ARM');
  return Math.min(COMBATE_BLOQUEIO_MAX, arm / (arm + COMBATE_BLOQUEIO_K));
}

// ═══════════════════════════════════════════════════════════════════
// A DECISÃO DO DEFENSOR
//
// Chamada uma vez por ataque. Em PvE responde a IA; em PvP é o jogador,
// com um relógio — esgotado o tempo entra o que esta função devolve.
// Devolve 'esquivar' ou 'bloquear'.
// ═══════════════════════════════════════════════════════════════════
function politicaDefesa(def, atk, danoPrevisto) {
  const podeEsquivar = def.en >= COMBATE_ESQUIVA_EN;
  if (!podeEsquivar) return 'bloquear';

  const pEsq = _chanceEsquiva(atk, def);
  const red  = _reducaoBloqueio(def);
  const esperadoEsquiva  = danoPrevisto * (1 - pEsq);
  const esperadoBloqueio = danoPrevisto * (1 - red);

  // Se o golpe me mata a bloquear, esquivar é a única hipótese — mesmo
  // sendo pior em média. Preferir a média aqui seria morrer com razão.
  if (esperadoBloqueio >= def.hp + def.escudo && esperadoEsquiva < def.hp + def.escudo + danoPrevisto) {
    return 'esquivar';
  }
  // Caso contrário, o menor dano esperado — com um empurrão para o
  // bloqueio, que é grátis, quando a diferença é pequena.
  return (esperadoEsquiva < esperadoBloqueio * 0.9) ? 'esquivar' : 'bloquear';
}


// Aplica dano com o tecto rígido, depois de TODOS os multiplicadores.
// Devolve o dano que entrou de facto, para os efeitos que dependem dele
// (roubo de vida, reflexo).
function _aplicarDano(alvo, bruto, opts) {
  opts = opts || {};
  let dano = Math.max(0, Math.round(bruto));
  const tecto = Math.floor(alvo.hpMax * COMBATE_TETO_GOLPE);
  if (dano > tecto) dano = tecto;

  let refletido = 0;
  if (!opts.ignoraEscudo && alvo.escudo > 0) {
    if (alvo.escudoRefl > 0) refletido = Math.round(Math.min(dano, alvo.escudo) * alvo.escudoRefl);
    const absorvido = Math.min(alvo.escudo, dano);
    alvo.escudo -= absorvido;
    dano -= absorvido;
    if (alvo.escudo <= 0) { alvo.escudo = 0; alvo.escudoTurnos = 0; alvo.escudoRefl = 0; }
  }
  alvo.hp -= dano;
  if (alvo.hp <= 0) { alvo.hp = 0; alvo.vivo = false; }
  return { dano, refletido };
}

function _curar(c, v) {
  c.hp = Math.min(c.hpMax, c.hp + Math.max(0, Math.round(v)));
}

function _darEnergia(c, v) {
  c.en = Math.max(0, Math.min(c.enMax, c.en + v));
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTAR UMA HABILIDADE
// ═══════════════════════════════════════════════════════════════════
// Envolve _executarHabilidade para registar o que aconteceu, sem ter de
// espalhar chamadas ao log pelos vários return lá dentro.
function _usarHabilidade(atk, def, slot, rng, log, opts) {
  if (!log || !log.eventos) return _executarHabilidade(atk, def, slot, rng, log, opts);
  const a = { hpAlvo: def.hp, escAlvo: def.escudo, hpMeu: atk.hp, en: atk.en };
  log.ultimaDefesa = null; log.ultimoEsquivou = false;
  const usado = _executarHabilidade(atk, def, slot, rng, log, opts);
  const ef = efeitoDe(atk.elemento, usado);
  log.eventos.push({
    turno: log.turno, quem: atk.nome, elemento: atk.elemento,
    slot: usado, alvo: def.nome, tipo: ef ? ef.tipo : (usado === 3 ? 'escudo' : 'dano'),
    defesa: log.ultimaDefesa || null, esquivou: !!log.ultimoEsquivou,
    dano:   Math.max(0, (a.hpAlvo - def.hp) + (a.escAlvo - def.escudo)),
    aoEscudo: Math.max(0, a.escAlvo - def.escudo),
    curou:  Math.max(0, atk.hp - a.hpMeu),
    sofreu: Math.max(0, a.hpMeu - atk.hp),      // reflexo
    hpAlvoDepois: def.hp, hpAlvoMax: def.hpMax,
    hpDepois: atk.hp, hpMax: atk.hpMax, enDepois: atk.en,
    escudoProprio: atk.escudo, morreu: !def.vivo,
  });
  return usado;
}

function _executarHabilidade(atk, def, slot, rng, log, opts) {
  const custo = COMBATE_CUSTOS[slot];
  if (atk.en < custo) slot = 0;                       // sem energia, cai no comum
  atk.en -= COMBATE_CUSTOS[slot];
  if (slot === 0) _darEnergia(atk, COMBATE_GERA_EN);

  const ef   = efeitoDe(atk.elemento, slot);
  const inten = intensidadeDe(atk.elemento);
  const valor = _valorSlot(atk, slot);
  const tipo  = ef ? ef.tipo : (slot === 3 ? 'escudo' : 'dano');

  // ── slots que não atacam ──
  if (tipo === 'cura') { _curar(atk, valor); return slot; }

  if (tipo === 'escudo') {
    let esc = valor;
    if (ef && ef.bonus) esc = Math.round(esc * (1 + COMBATE_EF.MURALHA_BONUS * inten));
    atk.escudo = esc;
    atk.escudoTurnos = (ef && ef.turnos) ? ef.turnos : 3;
    atk.escudoRefl    = (ef && ef.reflexo)       ? COMBATE_EF.REFLEXO * inten : 0;
    atk.escudoRegenHP = (ef && ef.regenHP)       ? Math.round(esc * COMBATE_EF.ESCUDO_REGEN_HP * inten) : 0;
    atk.escudoRegenEN = (ef && ef.regenEnergia)  ? Math.round(COMBATE_EF.ESCUDO_REGEN_EN * inten) : 0;
    if (ef && ef.devolveEnergia) _darEnergia(atk, Math.round(COMBATE_EF.DEVOLVE_EN * inten));
    if (ef && ef.evasao) atk.evasao.push({ v: COMBATE_EF.DEBUFF_ACERTO * inten, turnos: ef.turnos });
    return slot;
  }

  if (tipo === 'debuff_acerto' && ef.alvo === 'proprio') {
    atk.evasao.push({ v: COMBATE_EF.DEBUFF_ACERTO * inten, turnos: ef.turnos });
    return slot;
  }

  if (tipo === 'crit_garantido') { atk.critGarantido = true; return slot; }

  // ── daqui para baixo, tudo ataca ──
  const golpes = (tipo === 'multi_golpe') ? COMBATE_EF.RAJADA_GOLPES : 1;
  const fracao = (tipo === 'multi_golpe') ? COMBATE_EF.RAJADA_TOTAL / golpes : 1;
  const multEl = multElemental(atk.elemento, def.elemento);
  let danoTotal = 0, acertouAlguma = false;

  for (let g = 0; g < golpes; g++) {
    if (!def.vivo) break;
    atk.golpesAcertados++;

    let base = valor * fracao;
    if (tipo === 'crescente') base *= (1 + COMBATE_EF.CICLONE_POR_GOLPE * inten * atk.golpesAcertados);
    if (tipo === 'dobra_se_escudo' && def.escudo > 0) base *= 2;

    // Crítico: 16% fixo, nunca em ultimates.
    let chanceCrit = (slot === 2) ? 0 : COMBATE_CRIT;
    if (tipo === 'crit_alto') chanceCrit = COMBATE_EF.CRIT_TROVAO * inten;
    if (atk.critGarantido) { chanceCrit = 1; atk.critGarantido = false; }
    const critou = rng() < chanceCrit;
    if (critou) base *= COMBATE_CRIT_MULT;

    // ── O DEFENSOR DECIDE ──
    // Uma decisão por golpe. Numa Rajada Tripla são três, e isso é
    // deliberado: cada golpe é uma oportunidade de esquivar.
    const previsto = Math.round(base * multEl);
    const defesa = (opts && opts.defesa) ? opts.defesa(def, atk, previsto)
                                         : politicaDefesa(def, atk, previsto);
    let entra = base * multEl, esquivou = false;
    if (defesa === 'esquivar') {
      _darEnergia(def, -COMBATE_ESQUIVA_EN);
      if (rng() < _chanceEsquiva(atk, def)) { entra = 0; esquivou = true; }
    } else {
      entra *= (1 - _reducaoBloqueio(def));
    }
    if (log && log.eventos) {
      log.ultimaDefesa = defesa;
      log.ultimoEsquivou = esquivou;
    }
    if (esquivou) continue;
    acertouAlguma = true;

    const r = _aplicarDano(def, entra, { ignoraEscudo: !!(ef && ef.ignoraEscudo) });
    danoTotal += r.dano;
    if (r.refletido > 0) _aplicarDano(atk, r.refletido, { ignoraEscudo: true });
    if (log) log.maiorGolpe = Math.max(log.maiorGolpe || 0, r.dano / def.hpMax);
  }

  if (!acertouAlguma) return slot;

  // ── efeitos que dependem de ter acertado ──
  if (tipo === 'queimadura') {
    def.dots.push({ dano: Math.max(1, Math.round(valor * COMBATE_EF.QUEIMA_FRACAO * inten)),
                    turnos: ef.turnos, ignoraEscudo: !!ef.ignoraEscudo });
  } else if (tipo === 'debuff_acerto') {
    def.debuffAcerto.push({ v: COMBATE_EF.DEBUFF_ACERTO * inten, turnos: ef.turnos });
  } else if (tipo === 'debuff_stat') {
    def.debuffStat.push({ stats: ef.stats, v: COMBATE_EF.DEBUFF_STAT * inten, turnos: ef.turnos });
  } else if (tipo === 'atordoar') {
    if (rng() < COMBATE_EF.ATORDOAR_CHANCE * inten) def.atordoado += ef.turnos;
  } else if (tipo === 'dreno_energia') {
    const d = Math.round(COMBATE_EF.DRENO_EN * inten);
    _darEnergia(def, -d); _darEnergia(atk, d);
  } else if (tipo === 'roubo_vida') {
    _curar(atk, danoTotal * COMBATE_EF.ROUBO_VIDA * inten);
  } else if (tipo === 'purificar') {
    def.escudo = 0; def.escudoTurnos = 0; def.escudoRefl = 0;
    def.escudoRegenHP = 0; def.escudoRegenEN = 0; def.evasao = [];
  }
  return slot;
}

// ═══════════════════════════════════════════════════════════════════
// FIM DE TURNO — DoTs, duração de escudos e buffs, energia da reserva
// ═══════════════════════════════════════════════════════════════════
function _fimDeTurno(equipa, activo) {
  equipa.forEach((c, i) => {
    if (!c.vivo) return;
    if (i === activo) {
      for (const d of c.dots) _aplicarDano(c, d.dano, { ignoraEscudo: d.ignoraEscudo });
      c.dots = c.dots.filter(d => --d.turnos > 0);
      if (c.escudoTurnos > 0) {
        if (c.escudoRegenHP) _curar(c, c.escudoRegenHP);
        if (c.escudoRegenEN) _darEnergia(c, c.escudoRegenEN);
        if (--c.escudoTurnos <= 0) { c.escudo = 0; c.escudoRefl = 0; c.escudoRegenHP = 0; c.escudoRegenEN = 0; }
      }
      c.debuffAcerto = c.debuffAcerto.filter(d => --d.turnos > 0);
      c.evasao       = c.evasao.filter(d => --d.turnos > 0);
      c.debuffStat   = c.debuffStat.filter(d => --d.turnos > 0);
      if (c.atordoado > 0) c.atordoado--;
    } else {
      // Na reserva recupera energia, nunca HP — senão trocar era cura grátis
      _darEnergia(c, COMBATE_RESERVA_EN);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// POLÍTICA — como um lado decide o que fazer.
// Não é "a IA do jogo"; é um jogador razoável de referência, para as
// medições terem sentido. Um humano joga melhor do que isto.
// ═══════════════════════════════════════════════════════════════════
function politicaPadrao(eu, activo, inimigo, activoIni, opts) {
  opts = opts || {};
  const c = eu[activo], d = inimigo[activoIni];
  const acao = { troca: null, slot: 0 };

  // Quanto o inimigo tira por golpe, para saber quem sobrevive à entrada
  const ameaca = Math.round(Math.min(
    _valorSlot(d, 2) * multElemental(d.elemento, c.elemento),
    Math.floor(c.hpMax * COMBATE_TETO_GOLPE)) * (1 - _reducaoBloqueio(c)));

  // Quanto vale estar em campo contra este inimigo. O peso da vida é
  // grande de propósito: sem ele a política trocava para dentro um
  // avatar com 10 de HP só porque tinha vantagem elemental, e ele
  // morria no golpe seguinte — vantagem que não dá para usar não vale.
  const valorEmCampo = o => {
    const sobrevive = o.hp + o.escudo > Math.round(_valorSlot(d, 2) * multElemental(d.elemento, o.elemento));
    return multElemental(o.elemento, d.elemento)
         - multElemental(d.elemento, o.elemento)
         + (o.hp / o.hpMax) * 1.0
         + (sobrevive ? 0.6 : 0);
  };

  if (opts.podeTrocar !== false) {
    // Quem ENTRA é que paga a troca — é o que a torna um custo real:
    // entra-se em campo com um quarto da barra a menos.
    const meu = valorEmCampo(c);
    let melhor = -1, melhorV = meu + 0.15;
    eu.forEach((o, i) => {
      if (i === activo || !o.vivo || o.en < COMBATE_TROCA_EN) return;
      const v = valorEmCampo(o);
      if (v > melhorV) { melhorV = v; melhor = i; }
    });
    if (melhor >= 0) acao.troca = melhor;
  }

  const act = acao.troca !== null ? eu[acao.troca] : c;
  const en  = act.en - (acao.troca !== null ? COMBATE_TROCA_EN : 0);
  const multEl = multElemental(act.elemento, d.elemento);

  // Nem todo o slot ataca. A Maré Curativa da Água é uma cura no slot
  // que noutros elementos é dano, e o Véu de Correntes do Vento não tem
  // número nenhum. Sem consultar o tipo, a política usava a cura da Água
  // como se fosse ataque e ela nunca fazia mal a ninguém.
  const tipoDe = s => { const e = efeitoDe(act.elemento, s);
                        return e ? e.tipo : (s === 3 ? 'escudo' : 'dano'); };
  const ataca = s => { const t = tipoDe(s); return t !== 'cura' && t !== 'escudo'
                       && !(t === 'debuff_acerto' && efeitoDe(act.elemento, s).alvo === 'proprio')
                       && t !== 'crit_garantido'; };
  // Desconta a defesa média do alvo: sem isto o atacante achava que
  // rematava com um golpe que o defensor ia bloquear a meio.
  const mitiga = 1 - Math.max(_reducaoBloqueio(d), _chanceEsquiva(act, d));
  const dano = s => ataca(s)
    ? Math.round(Math.min(_valorSlot(act, s) * multEl, Math.floor(d.hpMax * COMBATE_TETO_GOLPE)) * mitiga)
    : 0;

  // Rematar sempre que der: um alvo morto não devolve o golpe
  for (const s of [2, 1, 0]) {
    if (en >= COMBATE_CUSTOS[s] && dano(s) >= d.hp + d.escudo) { acao.slot = s; return acao; }
  }
  // Curar-se ou erguer escudo quando o próximo golpe dele me apanha
  if (act.hp <= ameaca * 1.6) {
    if (tipoDe(1) === 'cura' && en >= COMBATE_CUSTOS[1] && act.hp < act.hpMax * 0.7) {
      acao.slot = 1; return acao;
    }
    if (act.escudo <= 0 && en >= COMBATE_CUSTOS[3]) { acao.slot = 3; return acao; }
  }
  // Caso normal: o melhor dano por energia gasta, tratando o ataque
  // comum como custo baixo porque devolve energia em vez de a gastar.
  // É isto que faz a habilidade de 20 EN competir com o golpe de 40 —
  // sem esta conta a política usava só o golpe forte, todos os turnos.
  let melhorS = 0, melhorR = -1;
  for (const s of [0, 1, 2]) {
    if (en < COMBATE_CUSTOS[s] || !ataca(s)) continue;
    const r = dano(s) / (COMBATE_CUSTOS[s] || 8);
    if (r > melhorR) { melhorR = r; melhorS = s; }
  }
  // Com a barra quase cheia, gastar no golpe forte antes de a energia
  // transbordar (o ataque comum devolve energia que se perderia)
  if (en >= act.enMax - COMBATE_GERA_EN && en >= COMBATE_CUSTOS[2] && ataca(2)) melhorS = 2;
  acao.slot = melhorS;
  return acao;
}

// ═══════════════════════════════════════════════════════════════════
// combateSimular — a batalha inteira
// ═══════════════════════════════════════════════════════════════════
function combateSimular(equipaA, equipaB, seed, opts) {
  opts = opts || {};
  const rng = _rngBatalha(seed || 1);
  const A = equipaA.map(_criarCombatente);
  const B = equipaB.map(_criarCombatente);
  let ativoA = 0, ativoB = 0, turnos = 0;
  // O histórico só é montado a pedido: nas 5000 batalhas do banco de
  // alvos ninguém o lê, e construí-lo custaria tempo por nada.
  const log = { maiorGolpe: 0, turno: 0 };
  if (opts.historico) log.eventos = [];

  const vivos = t => t.some(c => c.vivo);
  const proximo = (t, i) => (t[i] && t[i].vivo) ? i : t.findIndex(c => c.vivo);

  while (vivos(A) && vivos(B) && turnos < COMBATE_MAX_TURNOS) {
    turnos++;
    log.turno = turnos;
    ativoA = proximo(A, ativoA);
    ativoB = proximo(B, ativoB);

    const aA = politicaPadrao(A, ativoA, B, ativoB, { podeTrocar: opts.trocaA !== false });
    const aB = politicaPadrao(B, ativoB, A, ativoA, { podeTrocar: opts.trocaB !== false });

    // Trocas primeiro: pagam energia e NÃO gastam o turno.
    // Paga quem entra, não quem sai — senão um avatar sem energia ficava
    // preso em campo, e a política não teria como o resgatar.
    if (aA.troca !== null) { ativoA = aA.troca; A[ativoA].en -= COMBATE_TROCA_EN;
      if (log.eventos) log.eventos.push({ turno: turnos, troca: true, lado: 'A', quem: A[ativoA].nome, elemento: A[ativoA].elemento }); }
    if (aB.troca !== null) { ativoB = aB.troca; B[ativoB].en -= COMBATE_TROCA_EN;
      if (log.eventos) log.eventos.push({ turno: turnos, troca: true, lado: 'B', quem: B[ativoB].nome, elemento: B[ativoB].elemento }); }

    // Ordem: prioridade do Choque Directo, depois HAB, depois FOR
    // Nenhum dos 4 elementos tem ataque de prioridade. O Choque Directo
    // da Eletricidade tinha, mas a Eletricidade saiu do jogo.
    const prio = () => 0;
    const lados = [
      { c: A[ativoA], alvo: B[ativoB], slot: aA.slot, eq: A, p: prio() },
      { c: B[ativoB], alvo: A[ativoA], slot: aB.slot, eq: B, p: prio() },
    ].sort((x, y) => (y.p - x.p)
                  || (_stat(y.c, 'HAB') - _stat(x.c, 'HAB'))
                  || (_stat(y.c, 'FOR') - _stat(x.c, 'FOR')));

    for (const l of lados) {
      if (!l.c.vivo || !l.alvo.vivo) continue;
      if (l.c.atordoado > 0) continue;
      _usarHabilidade(l.c, l.alvo, l.slot, rng, log, opts);
    }

    _fimDeTurno(A, ativoA);
    _fimDeTurno(B, ativoB);
  }

  const vA = vivos(A), vB = vivos(B);
  return {
    vencedor: vA && !vB ? 'A' : vB && !vA ? 'B' : 'empate',
    turnos, maiorGolpe: log.maiorGolpe, eventos: log.eventos || null,
    hpA: A.reduce((s, c) => s + c.hp, 0),
    hpB: B.reduce((s, c) => s + c.hp, 0),
  };
}


// ═══════════════════════════════════════════════════════════════════
// combateNarrar — assistir a uma batalha em texto
//
// Na consola do jogo:
//   combateNarrar()                      equipas aleatórias
//   combateNarrar(null, null, 7)         a mesma batalha, sempre igual
//   combateNarrar(equipaDoJogador())     a tua equipa contra uma qualquer
//
// Existe para se poder julgar o combate ANTES de haver interface: se as
// batalhas forem monótonas em texto, não é a interface que as vai
// salvar.
// ═══════════════════════════════════════════════════════════════════
function _equipaAleatoria(rng) {
  const els = Object.keys(COMBATE_AFINIDADE);
  const rars = ['Comum', 'Comum', 'Raro', 'Lendário'];
  const suf = ['Bravo', 'Sombrio', 'Antigo', 'Veloz', 'Sereno', 'Rubro'];
  return [0, 1, 2].map(i => {
    const el = els[Math.floor(rng() * els.length)];
    return { nome: `${el} ${suf[Math.floor(rng() * suf.length)]}`, elemento: el,
             raridade: rars[Math.floor(rng() * rars.length)],
             nivel: 5 + Math.floor(rng() * 12), seed: Math.floor(rng() * 1e6) };
  });
}

function combateNarrar(equipaA, equipaB, seed) {
  seed = seed != null ? seed : Math.floor(Math.random() * 1e6);
  const rng = _rngBatalha(seed + 7777);
  const A = equipaA && equipaA.length ? equipaA.slice(0, 3) : _equipaAleatoria(rng);
  const B = equipaB && equipaB.length ? equipaB.slice(0, 3) : _equipaAleatoria(rng);
  const r = combateSimular(A, B, seed, { historico: true });

  const barra = (v, m, n) => {
    const c = Math.max(0, Math.round(v / m * (n || 12)));
    return '█'.repeat(c) + '·'.repeat((n || 12) - c);
  };
  const ficha = e => { const f = fichaDeCombate(e); return `${e.nome} (${e.elemento} ${e.raridade} nv${e.nivel}) HP ${f.hpMax} · FOR ${f.FOR} RES ${f.RES} HAB ${f.HAB} INT ${f.INT}`; };
  const nomeSlot = ['ataque comum', 'habilidade', 'GOLPE FORTE', 'defesa'];
  const SEM_NUMERO = {
    debuff_acerto:  'baixa a pontaria',
    crit_garantido: 'prepara o golpe seguinte',
    debuff_stat:    'enfraquece o alvo',
    atordoar:       'tenta atordoar',
    dreno_energia:  'drena energia',
    purificar:      'limpa escudos e buffs',
  };

  const L = [];
  L.push('═'.repeat(64));
  L.push(`BATALHA  semente ${seed}`);
  L.push('─ EQUIPA A ' + '─'.repeat(52));
  A.forEach(e => L.push('  ' + ficha(e)));
  L.push('─ EQUIPA B ' + '─'.repeat(52));
  B.forEach(e => L.push('  ' + ficha(e)));
  L.push('═'.repeat(64));

  let t = 0;
  for (const ev of (r.eventos || [])) {
    if (ev.turno !== t) { t = ev.turno; L.push(`\n── turno ${t} ──`); }
    if (ev.troca) { L.push(`  ↩ ${ev.lado}: entra ${ev.quem}`); continue; }
    const partes = [];
    if (ev.defesa === 'esquivar' && !ev.dano) partes.push('o alvo ESQUIVOU');
    else if (ev.defesa === 'bloquear' && ev.dano) partes.push(`${ev.dano} de dano (bloqueado)`);
    else if (ev.dano)   partes.push(`${ev.dano} de dano${ev.aoEscudo ? ` (${ev.aoEscudo} no escudo)` : ''}`);
    if (ev.curou)  partes.push(`+${ev.curou} de vida`);
    if (ev.sofreu) partes.push(`levou ${ev.sofreu} de volta`);
    if (ev.escudoProprio && ev.slot === 3) partes.push(`escudo de ${ev.escudoProprio}`);
    // Nem toda a habilidade tem número. Sem isto, o Véu de Correntes do
    // Vento e o Manto de Penumbra da Sombra apareciam como "falhou".
    if (!partes.length && SEM_NUMERO[ev.tipo]) partes.push(SEM_NUMERO[ev.tipo]);
    const mostraAlvo = ev.slot !== 3 && ev.dano > 0;
    L.push(`  ${ev.quem} usa ${nomeSlot[ev.slot]}` +
           (partes.length ? ` — ${partes.join(', ')}` : ' — falhou') +
           (mostraAlvo ? `   ${ev.alvo} ${barra(ev.hpAlvoDepois, ev.hpAlvoMax)} ${ev.hpAlvoDepois}/${ev.hpAlvoMax}` : '') +
           (ev.morreu ? '   ☠' : ''));
  }
  L.push('\n' + '═'.repeat(64));
  L.push(r.vencedor === 'empate' ? `EMPATE aos ${r.turnos} turnos`
        : `VENCE A EQUIPA ${r.vencedor} em ${r.turnos} turnos   (HP restante: A ${r.hpA} · B ${r.hpB})`);
  const texto = L.join('\n');
  if (typeof console !== 'undefined') console.log(texto);
  return texto;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { combateSimular, combateNarrar, multElemental, politicaPadrao, politicaDefesa,
                     COMBATE_CICLO, COMBATE_CUSTOS, COMBATE_TROCA_EN,
                     COMBATE_TETO_GOLPE, COMBATE_MAX_TURNOS };
}
