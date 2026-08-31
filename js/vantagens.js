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
  /* Uma vez por batalha, e não uma vez por turno.
     Custava 2 PM e devolvia a vida TODA, sem limite nenhum de usos: um
     avatar com 30 PM curava-se quinze vezes, e a política do motor pega
     nela sempre que cai abaixo de 35% da vida. Um inimigo usou-a três
     vezes seguidas numa luta.
     Uma cura completa é o efeito mais forte que há; sem limite não é uma
     decisão, é uma torneira. Com uma só, a pergunta passa a ser QUANDO.
     E ajuda o outro lado do problema: as lutas de nível alto já custam a
     acabar dentro dos 60 turnos, e curas sem fim empurravam para o
     empate. Para permitir duas, é este número. */
  segundo_folego:    { custo: 2, pm: 2, curaTudo: true, gastaTurno: true, maxUsos: 1 },
  cura_perpetua:     { custo: 3, pvPorTurno: 1 },

  // ── Ofensivas e de manobra ──
  passo_rapido:      { custo: 1, bonusEsquiva: 1 },
  reserva_oculta:    { custo: 1, pm: 2, subirCarac: 1, maxTotal: 5 },
  toque_paralisante: { custo: 1, pm: 2, paralisa: true },
  afinidade_profunda:{ custo: 1, metadeCustoProprioElemento: true },

  // Ataque Especial: 1 PM compra F+2 num único golpe. É uma manobra,
  // não uma ação à parte — soma-se ao murro do turno.
  golpe_carregado:   { custo: 1, pm: 1, bonusFGolpe: 2 },

  // Ataque Múltiplo: vários golpes de Força na mesma rodada, 1 PM cada,
  // até ao limite da Habilidade. Cada um rola a sua própria FA contra a
  // FD do inimigo — não se somam, que é o que trava a vantagem.
  golpe_encadeado:   { custo: 1, pmPorGolpe: 1, golpesMultiplos: true },

  // Toque de Energia: FA = Armadura + 1d + PMs gastos, e a Habilidade
  // NÃO entra. Um ataque para quem tem a Armadura alta e a Força baixa,
  // que de outra forma não teria como ferir ninguém.
  toque_ardente:     { custo: 1, toqueEnergia: true },

  // Resistência à Magia: +2 nos testes para ignorar efeitos de magia.
  // O manual exclui veneno de propósito — contra isso não vale.
  alma_rija:         { custo: 1, bonusTesteMagia: 2, excetoVeneno: true },

  // Magia Irresistível: quem tenta resistir às tuas magias leva −1.
  magia_perfurante:  { custo: 1, penalidadeTesteAlvo: 1 },

  // Energia Vital: 2 PV valem 1 PM. Continuas a lançar depois de os PM
  // acabarem, a pagar com o corpo.
  sangue_por_magia:  { custo: 2, pvComoPM: 2 },
};

// As desvantagens são todas de COMBATE, e é de propósito. Houve duas
// que cobravam no ciclo do bichinho (a energia caía mais depressa, o
// vínculo crescia mais devagar) e saíram daqui por duas razões: nada no
// jogo as lia — davam o ponto e não cobravam nada — e mesmo ligadas
// seriam pagas numa moeda diferente daquela em que o ponto foi gasto.
// Se um dia voltarem, será numa bolsa própria do tamagotchi.
const DESVANTAGENS = {
  ferida_antiga:  { custo: -2, contraElemento: true, armaduraZero: true },
  sina_cobradora: { custo: -1, danoPorMagia: 1 },
  sangue_quente:  { custo: -1, furiaAoSofrerDano: true },
  limiar_baixo:   { custo: -2, semMagiaAbaixoDeMetade: true },

  // Assombrado: no início de cada batalha rola-se 1d. Saindo 4, 5 ou 6,
  // a assombração apareceu: −1 em TUDO e magia ao dobro do preço, até
  // ao fim da luta. É a única que muda de batalha para batalha.
  sombra_faminta: { custo: -2, assombraEm: 4, penalidadeTudo: 1, dobraCustoMagia: true },

  // Fetiche: ao sofrer dano faz-se um teste de Habilidade; falhando,
  // o foco cai e não há magia nenhuma até se gastar um turno a apanhá-lo.
  foco_fragil:    { custo: -1, perdeFocoAoSofrerDano: true },

  // Ponto Fraco: quem já te viu lutar sabe onde bater. O adversário
  // ganha H+1 contra ti — na Força de Ataque dele e na tua esquiva.
  brecha_conhecida: { custo: -1, inimigoGanhaH: 1 },

  // Restrição de Poder: contra um elemento, a magia custa o dobro.
  veia_travada:   { custo: -1, contraElemento: true, dobraCustoMagia: true },

  // Poder Vergonhoso (Constrangedor): a magia sai com Força de Ataque −1.
  conjuro_desajeitado: { custo: -1, faMagiaMenos: 1 },

  // Poder Vergonhoso (Agradável): é tudo tão bonito que mal faz mal.
  // O adversário ganha A+1 e R+1 contra ti.
  brilho_inofensivo: { custo: -1, inimigoGanhaA: 1, inimigoGanhaR: 1 },
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
