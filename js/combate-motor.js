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
// Ciclo material de 5: cada um vence o seguinte e perde para o anterior.
// Apaga · queima · erode · aterra · conduz.
const COMBATE_CICLO = ['Água', 'Fogo', 'Vento', 'Terra', 'Eletricidade'];
// Luz e Sombra estão FORA do ciclo e são neutras contra tudo, inclusive
// uma contra a outra. A spec dava-lhes vantagem mútua, o que na prática
// significava vantagem sem fraqueza nenhuma — as únicas duas do jogo
// nessa situação. O papel delas é mecânico (suporte e controlo), não um
// multiplicador.
const COMBATE_NEUTROS = ['Luz', 'Sombra'];

const COMBATE_MULT_VANTAGEM = 1.25;
const COMBATE_MULT_FRAQUEZA = 0.80;

function multElemental(atacante, defensor) {
  const a = COMBATE_CICLO.indexOf(atacante);
  const d = COMBATE_CICLO.indexOf(defensor);
  if (a < 0 || d < 0) return 1.0;                       // um dos dois é neutro
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

const COMBATE_ACERTO_BASE = 0.85;
const COMBATE_ACERTO_POR_HAB = 0.015;
const COMBATE_ACERTO_MIN = 0.70;   // banda normal
const COMBATE_ACERTO_MAX = 0.95;   // nunca existe acerto garantido
const COMBATE_ACERTO_PISO = 0.50;  // nem empilhando debuffs

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

function _chanceAcerto(atk, def, rng) {
  let p = COMBATE_ACERTO_BASE + (_stat(atk, 'HAB') - _stat(def, 'HAB')) * COMBATE_ACERTO_POR_HAB;
  p = Math.max(COMBATE_ACERTO_MIN, Math.min(COMBATE_ACERTO_MAX, p));
  for (const d of atk.debuffAcerto) p -= d.v;
  for (const e of def.evasao)       p -= e.v;
  return Math.max(COMBATE_ACERTO_PISO, p);
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
function _usarHabilidade(atk, def, slot, rng, log) {
  const custo = COMBATE_CUSTOS[slot];
  if (atk.en < custo) slot = 0;                       // sem energia, cai no comum
  atk.en -= COMBATE_CUSTOS[slot];
  if (slot === 0) _darEnergia(atk, COMBATE_GERA_EN);

  const ef   = efeitoDe(atk.elemento, slot);
  const inten = intensidadeDe(atk.elemento);
  const valor = _valorSlot(atk, slot);
  const tipo  = ef ? ef.tipo : (slot === 3 ? 'escudo' : 'dano');

  // ── slots que não atacam ──
  if (tipo === 'cura') { _curar(atk, valor); return; }

  if (tipo === 'escudo') {
    let esc = valor;
    if (ef && ef.bonus) esc = Math.round(esc * (1 + COMBATE_EF.MURALHA_BONUS * inten));
    atk.escudo = esc;
    atk.escudoTurnos = (ef && ef.turnos) ? ef.turnos : 3;
    atk.escudoRefl    = (ef && ef.reflexo)       ? COMBATE_EF.REFLEXO * inten : 0;
    atk.escudoRegenHP = (ef && ef.regenHP)       ? Math.round(esc * COMBATE_EF.ESCUDO_REGEN_HP * inten) : 0;
    atk.escudoRegenEN = (ef && ef.regenEnergia)  ? Math.round(COMBATE_EF.ESCUDO_REGEN_EN * inten) : 0;
    if (ef && ef.devolveEnergia) _darEnergia(atk, Math.round(COMBATE_EF.DEVOLVE_EN * inten));
    return;
  }

  if (tipo === 'debuff_acerto' && ef.alvo === 'proprio') {
    atk.evasao.push({ v: COMBATE_EF.DEBUFF_ACERTO * inten, turnos: ef.turnos });
    return;
  }

  if (tipo === 'crit_garantido') { atk.critGarantido = true; return; }

  // ── daqui para baixo, tudo ataca ──
  const golpes = (tipo === 'multi_golpe') ? COMBATE_EF.RAJADA_GOLPES : 1;
  const fracao = (tipo === 'multi_golpe') ? COMBATE_EF.RAJADA_TOTAL / golpes : 1;
  const multEl = multElemental(atk.elemento, def.elemento);
  let danoTotal = 0, acertouAlguma = false;

  for (let g = 0; g < golpes; g++) {
    if (!def.vivo) break;
    if (rng() > _chanceAcerto(atk, def, rng)) continue;   // falhou
    acertouAlguma = true;
    atk.golpesAcertados++;

    let base = valor * fracao;
    if (tipo === 'crescente') base *= (1 + COMBATE_EF.CICLONE_POR_GOLPE * inten * atk.golpesAcertados);
    if (tipo === 'dobra_se_escudo' && def.escudo > 0) base *= 2;

    // Crítico: 16% fixo, nunca em ultimates — a excepção é o Julgamento
    // do Trovão, que é literalmente a habilidade do elemento.
    let chanceCrit = (slot === 2) ? 0 : COMBATE_CRIT;
    if (tipo === 'crit_alto') chanceCrit = COMBATE_EF.CRIT_TROVAO * inten;
    if (atk.critGarantido) { chanceCrit = 1; atk.critGarantido = false; }
    if (rng() < chanceCrit) base *= COMBATE_CRIT_MULT;

    const r = _aplicarDano(def, base * multEl, { ignoraEscudo: !!(ef && ef.ignoraEscudo) });
    danoTotal += r.dano;
    if (r.refletido > 0) _aplicarDano(atk, r.refletido, { ignoraEscudo: true });
    if (log) log.maiorGolpe = Math.max(log.maiorGolpe || 0, r.dano / def.hpMax);
  }

  if (!acertouAlguma) return;

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

  // Quanto vale estar em campo contra este inimigo: o que eu multiplico
  // menos o que ele me multiplica, mais um prémio por estar inteiro.
  const valorEmCampo = o => multElemental(o.elemento, d.elemento)
                          - multElemental(d.elemento, o.elemento)
                          + (o.hp / o.hpMax) * 0.5;

  if (opts.podeTrocar !== false) {
    // Quem ENTRA é que paga os 40 EN — é o que torna a troca um custo
    // real: entra-se em campo com menos meia barra.
    const meu = valorEmCampo(c);
    let melhor = -1, melhorV = meu + 0.02;   // qualquer melhoria real serve
    eu.forEach((o, i) => {
      if (i === activo || !o.vivo || o.en < COMBATE_TROCA_EN) return;
      const v = valorEmCampo(o);
      if (v > melhorV) { melhorV = v; melhor = i; }
    });
    if (melhor >= 0) acao.troca = melhor;
  }

  const act = acao.troca !== null ? eu[acao.troca] : c;
  const en  = act.en - (acao.troca !== null ? COMBATE_TROCA_EN : 0);

  // Defender quando estou a cair e ainda não tenho escudo
  if (act.hp / act.hpMax < 0.35 && act.escudo <= 0 && en >= COMBATE_CUSTOS[3]) {
    acao.slot = 3; return acao;
  }
  // Ultimate quando dá para pagar
  if (en >= COMBATE_CUSTOS[2]) { acao.slot = 2; return acao; }
  if (en >= COMBATE_CUSTOS[1]) { acao.slot = 1; return acao; }
  acao.slot = 0;
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
  const log = { maiorGolpe: 0 };

  const vivos = t => t.some(c => c.vivo);
  const proximo = (t, i) => (t[i] && t[i].vivo) ? i : t.findIndex(c => c.vivo);

  while (vivos(A) && vivos(B) && turnos < COMBATE_MAX_TURNOS) {
    turnos++;
    ativoA = proximo(A, ativoA);
    ativoB = proximo(B, ativoB);

    const aA = politicaPadrao(A, ativoA, B, ativoB, { podeTrocar: opts.trocaA !== false });
    const aB = politicaPadrao(B, ativoB, A, ativoA, { podeTrocar: opts.trocaB !== false });

    // Trocas primeiro: pagam energia e NÃO gastam o turno.
    // Paga quem entra, não quem sai — senão um avatar sem energia ficava
    // preso em campo, e a política não teria como o resgatar.
    if (aA.troca !== null) { ativoA = aA.troca; A[ativoA].en -= COMBATE_TROCA_EN; }
    if (aB.troca !== null) { ativoB = aB.troca; B[ativoB].en -= COMBATE_TROCA_EN; }

    // Ordem: prioridade do Choque Directo, depois HAB, depois FOR
    const prio = (c, slot) => (c.elemento === 'Eletricidade' && slot === 0) ? 1 : 0;
    const lados = [
      { c: A[ativoA], alvo: B[ativoB], slot: aA.slot, eq: A, p: prio(A[ativoA], aA.slot) },
      { c: B[ativoB], alvo: A[ativoA], slot: aB.slot, eq: B, p: prio(B[ativoB], aB.slot) },
    ].sort((x, y) => (y.p - x.p)
                  || (_stat(y.c, 'HAB') - _stat(x.c, 'HAB'))
                  || (_stat(y.c, 'FOR') - _stat(x.c, 'FOR')));

    for (const l of lados) {
      if (!l.c.vivo || !l.alvo.vivo) continue;
      if (l.c.atordoado > 0) continue;
      _usarHabilidade(l.c, l.alvo, l.slot, rng, log);
    }

    _fimDeTurno(A, ativoA);
    _fimDeTurno(B, ativoB);
  }

  const vA = vivos(A), vB = vivos(B);
  return {
    vencedor: vA && !vB ? 'A' : vB && !vA ? 'B' : 'empate',
    turnos, maiorGolpe: log.maiorGolpe,
    hpA: A.reduce((s, c) => s + c.hp, 0),
    hpB: B.reduce((s, c) => s + c.hp, 0),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { combateSimular, multElemental, politicaPadrao,
                     COMBATE_CICLO, COMBATE_NEUTROS, COMBATE_CUSTOS, COMBATE_TROCA_EN,
                     COMBATE_TETO_GOLPE, COMBATE_MAX_TURNOS };
}
