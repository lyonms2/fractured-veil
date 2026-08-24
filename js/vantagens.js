// ═══════════════════════════════════════════════════════════════════
// VANTAGENS E DESVANTAGENS
//
// Regras do 3D&T Alpha, nomes e textos nossos — a mesma razão das
// magias: mecânica não se protege, expressão sim.
//
// Todo avatar nasce com UMA vantagem e UMA desvantagem, sorteadas pelo
// seed. É tudo uma bolsa só, como no manual: a desvantagem DÁ pontos, a
// vantagem CUSTA, e o que sobra compra as características.
//
//   Comum (5 pts) + Ferida Antiga (−2) − Reflexo Espelhado (2) = 5
//   Comum (5 pts) + Sina Cobradora (−1) − Cura Perpétua (3)    = 3
//
// O segundo avatar tem uma ficha muito mais fraca e cura-se sozinho
// todo o turno. Não é um bilhete premiado: é uma escolha que o sorteio
// fez por ele, e paga-a nos números.
// ═══════════════════════════════════════════════════════════════════

const VANTAGENS = {
  // ── Defensivas ──
  couraca_elemental: { custo: 1, contraElemento: true, armaduraDobra: true },
  reflexo_defensivo: { custo: 1, pm: 2, habilidadeDobra: true },
  reflexo_espelhado: { custo: 2, pm: 2, habilidadeDobra: true, devolve: true },

  // ── Recursos ──
  folego_extra:      { custo: 1, pvComoR: 2 },
  fonte_extra:       { custo: 1, pmComoR: 2 },
  segundo_folego:    { custo: 2, pm: 2, curaTudo: true, gastaTurno: true },
  cura_perpetua:     { custo: 3, pvPorTurno: 1 },

  // ── Ofensivas e de manobra ──
  passo_rapido:      { custo: 1, bonusEsquiva: 1 },
  reserva_oculta:    { custo: 1, pm: 2, subirCarac: 1, maxTotal: 5 },
  toque_paralisante: { custo: 1, pm: 2, paralisa: true },
  afinidade_profunda:{ custo: 1, metadeCustoProprioElemento: true },
};

const DESVANTAGENS = {
  // ── De combate ──
  ferida_antiga:  { custo: -2, contraElemento: true, armaduraZero: true },
  sina_cobradora: { custo: -1, danoPorMagia: 1 },
  sangue_quente:  { custo: -1, furiaAoSofrerDano: true },
  limiar_baixo:   { custo: -2, semMagiaAbaixoDeMetade: true },

  // ── Do ciclo de cuidado ──
  chama_curta:    { custo: -1, energiaDecaiMais: 1.35 },
  presenca_dura:  { custo: -1, vinculoCresceMenos: 0.7 },
};

// ═══════════════════════════════════════════════════════════════════
// O sorteio
//
// A vantagem é escolhida entre as que o orçamento aguenta: o avatar tem
// de ficar com pontos suficientes para uma ficha viável (a Habilidade
// nunca é 0 e a Resistência tem piso). Sem esta trava, um Comum podia
// sair com a Cura Perpétua e 1 ponto para tudo o resto.
// ═══════════════════════════════════════════════════════════════════
const VD_PONTOS_MINIMOS = 3;

function _vdRng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x2E45) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function (min, max) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return min + (((s >>> 16) * (max - min + 1)) >>> 16);
  };
}

function sortearVantagens(seed, pontosBase, elemento) {
  const rnd = _vdRng((seed || 0) ^ 0x9C);

  const idsD = Object.keys(DESVANTAGENS);
  const idD  = idsD[rnd(0, idsD.length - 1)];
  const desv = DESVANTAGENS[idD];

  // Quanto há para gastar depois de a desvantagem pagar
  const bolsa = pontosBase - desv.custo;          // custo é negativo
  const idsV = Object.keys(VANTAGENS)
    .filter(k => bolsa - VANTAGENS[k].custo >= VD_PONTOS_MINIMOS);
  const idV  = idsV.length ? idsV[rnd(0, idsV.length - 1)] : 'passo_rapido';
  const vant = VANTAGENS[idV];

  // As que agem contra um elemento escolhem qual — nunca o próprio, que
  // seria resistir a si mesmo ou ser frágil ao que se é.
  const outros = ['Fogo', 'Água', 'Terra', 'Vento', 'Sombra'].filter(e => e !== elemento);
  const elemV = vant.contraElemento ? outros[rnd(0, outros.length - 1)] : null;
  const elemD = desv.contraElemento ? outros[rnd(0, outros.length - 1)] : null;

  return {
    vantagem:    { id: idV, ...vant, elemento: elemV },
    desvantagem: { id: idD, ...desv, elemento: elemD },
    pontos:      bolsa - vant.custo,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VANTAGENS, DESVANTAGENS, sortearVantagens, VD_PONTOS_MINIMOS };
}
