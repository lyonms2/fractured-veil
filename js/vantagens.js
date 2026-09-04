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

/* ── A FAMÍLIA DE CADA UMA ──

   Os três grupos já estavam aqui, em comentários: Defensivas, Recursos,
   Ofensivas e de manobra. Passam a estar escritos em cada entrada,
   porque agora alguém os lê — o gene da índole (js/nascimento.js)
   inclina o sorteio para a família do feitio do avatar.

   Um comentário não se pode ler em código, e um agrupamento que exista
   só no comentário é o primeiro a divergir do que o código faz.

   As desvantagens seguem a mesma divisão pelo avesso: guarda é o que
   abre buracos na defesa, fonte é o que come recursos, lâmina é o que
   estraga o golpe. Assim uma índole marcada traz consigo a virtude E o
   defeito do mesmo terreno — o bruto bate mais e descontrola-se mais. */
const VANTAGENS = {
  // ── Defensivas ──
  couraca_elemental: { familia: 'guarda', custo: 1, contraElemento: true, armaduraDobra: true },
  reflexo_defensivo: { familia: 'guarda', custo: 1, pm: 2, habilidadeDobra: true },
  reflexo_espelhado: { familia: 'guarda', custo: 2, pm: 2, habilidadeDobra: true, devolve: true },

  // ── Recursos ──
  folego_extra:      { familia: 'fonte', custo: 1, pvComoR: 2 },
  fonte_extra:       { familia: 'fonte', custo: 1, pmComoR: 2 },
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
  segundo_folego:    { familia: 'fonte', custo: 2, pm: 2, curaTudo: true, gastaTurno: true, maxUsos: 1 },
  cura_perpetua:     { familia: 'fonte', custo: 3, pvPorTurno: 1 },

  // ── Ofensivas e de manobra ──
  passo_rapido:      { familia: 'guarda', custo: 1, bonusEsquiva: 1 },
  reserva_oculta:    { familia: 'fonte', custo: 1, pm: 2, subirCarac: 1, maxTotal: 5 },
  toque_paralisante: { familia: 'lamina', custo: 1, pm: 2, paralisa: true },
  afinidade_profunda:{ familia: 'fonte', custo: 1, metadeCustoProprioElemento: true },

  // Ataque Especial: 1 PM compra F+2 num único golpe. É uma manobra,
  // não uma ação à parte — soma-se ao murro do turno.
  golpe_carregado:   { familia: 'lamina', custo: 1, pm: 1, bonusFGolpe: 2 },

  // Ataque Múltiplo: vários golpes de Força na mesma rodada, 1 PM cada,
  // até ao limite da Habilidade. Cada um rola a sua própria FA contra a
  // FD do inimigo — não se somam, que é o que trava a vantagem.
  golpe_encadeado:   { familia: 'lamina', custo: 1, pmPorGolpe: 1, golpesMultiplos: true },

  // Toque de Energia: FA = Armadura + 1d + PMs gastos, e a Habilidade
  // NÃO entra. Um ataque para quem tem a Armadura alta e a Força baixa,
  // que de outra forma não teria como ferir ninguém.
  toque_ardente:     { familia: 'lamina', custo: 1, toqueEnergia: true },

  // Resistência à Magia: +2 nos testes para ignorar efeitos de magia.
  // O manual exclui veneno de propósito — contra isso não vale.
  alma_rija:         { familia: 'guarda', custo: 1, bonusTesteMagia: 2, excetoVeneno: true },

  // Magia Irresistível: quem tenta resistir às tuas magias leva −1.
  magia_perfurante:  { familia: 'lamina', custo: 1, penalidadeTesteAlvo: 1 },

  // Energia Vital: 2 PV valem 1 PM. Continuas a lançar depois de os PM
  // acabarem, a pagar com o corpo.
  sangue_por_magia:  { familia: 'fonte', custo: 2, pvComoPM: 2 },
};

// As desvantagens são todas de COMBATE, e é de propósito. Houve duas
// que cobravam no ciclo do bichinho (a energia caía mais depressa, o
// vínculo crescia mais devagar) e saíram daqui por duas razões: nada no
// jogo as lia — davam o ponto e não cobravam nada — e mesmo ligadas
// seriam pagas numa moeda diferente daquela em que o ponto foi gasto.
// Se um dia voltarem, será numa bolsa própria do tamagotchi.
const DESVANTAGENS = {
  ferida_antiga:  { familia: 'guarda', custo: -2, contraElemento: true, armaduraZero: true },
  sina_cobradora: { familia: 'fonte', custo: -1, danoPorMagia: 1 },
  sangue_quente:  { familia: 'lamina', custo: -1, furiaAoSofrerDano: true },
  limiar_baixo:   { familia: 'fonte', custo: -2, semMagiaAbaixoDeMetade: true },

  // Assombrado: no início de cada batalha rola-se 1d. Saindo 4, 5 ou 6,
  // a assombração apareceu: −1 em TUDO e magia ao dobro do preço, até
  // ao fim da luta. É a única que muda de batalha para batalha.
  sombra_faminta: { familia: 'fonte', custo: -2, assombraEm: 4, penalidadeTudo: 1, dobraCustoMagia: true },

  // Fetiche: ao sofrer dano faz-se um teste de Habilidade; falhando,
  // o foco cai e não há magia nenhuma até se gastar um turno a apanhá-lo.
  foco_fragil:    { familia: 'lamina', custo: -1, perdeFocoAoSofrerDano: true },

  // Ponto Fraco: quem já te viu lutar sabe onde bater. O adversário
  // ganha H+1 contra ti — na Força de Ataque dele e na tua esquiva.
  brecha_conhecida: { familia: 'guarda', custo: -1, inimigoGanhaH: 1 },

  // Restrição de Poder: contra um elemento, a magia custa o dobro.
  veia_travada:   { familia: 'fonte', custo: -1, contraElemento: true, dobraCustoMagia: true },

  // Poder Vergonhoso (Constrangedor): a magia sai com Força de Ataque −1.
  conjuro_desajeitado: { familia: 'lamina', custo: -1, faMagiaMenos: 1 },

  // Poder Vergonhoso (Agradável): é tudo tão bonito que mal faz mal.
  // O adversário ganha A+1 e R+1 contra ti.
  brilho_inofensivo: { familia: 'guarda', custo: -1, inimigoGanhaA: 1, inimigoGanhaR: 1 },
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

/* Um sorteio com o dedo na balança.

   Escolhe da lista, mas cada entrada leva o peso da sua família. Com
   pesos todos iguais — um avatar sem gene de índole — isto é o sorteio
   limpo de sempre, e é essa a razão de ser feito assim em vez de com
   uma escolha à parte para cada caso. */
function _vdEscolher(ids, tabela, pesos, rnd) {
  if (!ids.length) return null;
  const peso = k => (pesos && pesos[tabela[k].familia]) || 1;
  const total = ids.reduce((t, k) => t + peso(k), 0);
  let alvo = rnd(1, total);
  for (const k of ids) { alvo -= peso(k); if (alvo <= 0) return k; }
  return ids[ids.length - 1];
}

/* O ORÇAMENTO QUE MANDA NA ESCOLHA É O DO FIM, E NÃO O DE HOJE.

   A vantagem é escolhida entre as que o orçamento aguenta — e o
   orçamento cresce com o nível. Filtrar pelo de HOJE fazia o bolo
   crescer a cada nível, o índice sorteado cair noutro sítio, e o avatar
   TROCAR de virtude ao subir: medido em 318 de 18.600 subidas, 1,7%.
   Um avatar podia perder o Fôlego Extra e dez pontos de vida com ele.

   É o mesmo defeito que as magias tiveram e que este ficheiro corrigiu
   da mesma maneira: pergunta-se ao orçamento do NÍVEL 35, que é
   constante para um dado avatar. A virtude e o defeito ficam decididos
   ao nascer e não mudam mais, que é o que o jogo promete.

   Consequência assumida: um avatar novo pode ter uma virtude que ainda
   não "paga" — a bolsa dele fica em zero e as quatro características no
   piso. É exactamente o que deve acontecer a quem é novo, e a ficha
   dele não desce por isso: o que sobra é sempre zero ou mais. */
const VD_ORCAMENTO_FINAL = 18;   // FICHA_PONTOS_BASE + os pontos do nível 35

function sortearVantagens(seed, pontosBase, elemento, indole) {
  const rnd = _vdRng((seed || 0) ^ 0x9C);

  /* A ÍNDOLE INCLINA, E NÃO DECIDE.

     Vem do gene (indoleDoDna, em js/nascimento.js) e chega aqui em
     pesos: um avatar de feitio lâmina tem quatro vezes mais hipóteses
     de sair com uma vantagem ofensiva do que com uma de guarda — mas
     sai com uma de guarda uma vez em cada tantas, e é isso que faz
     dois irmãos do mesmo feitio não serem o mesmo avatar.

     A desvantagem sai da MESMA família por peso, e não por regra: quem
     nasce para bater tende a trazer os defeitos de quem bate. */
  const idsD = Object.keys(DESVANTAGENS);
  const idD  = _vdEscolher(idsD, DESVANTAGENS, indole, rnd);
  const desv = DESVANTAGENS[idD];

  // Quanto há para gastar depois de a desvantagem pagar
  const bolsa = pontosBase - desv.custo;          // custo é negativo
  // O bolo sai do orçamento do fim, portanto é o mesmo em todos os
  // níveis deste avatar — e a virtude dele nunca troca.
  const bolsaFinal = VD_ORCAMENTO_FINAL - desv.custo;
  const idsV = Object.keys(VANTAGENS)
    .filter(k => bolsaFinal - VANTAGENS[k].custo >= VD_PONTOS_MINIMOS);
  const idV  = _vdEscolher(idsV, VANTAGENS, indole, rnd) || 'passo_rapido';
  const vant = VANTAGENS[idV];

  // As que agem contra um elemento escolhem qual — nunca o próprio, que
  // seria resistir a si mesmo ou ser frágil ao que se é.
  const outros = ['Fogo', 'Água', 'Terra', 'Vento', 'Sombra'].filter(e => e !== elemento);
  const elemV = vant.contraElemento ? outros[rnd(0, outros.length - 1)] : null;
  const elemD = desv.contraElemento ? outros[rnd(0, outros.length - 1)] : null;

  return {
    vantagem:    { id: idV, ...vant, elemento: elemV },
    desvantagem: { id: idD, ...desv, elemento: elemD },
    /* Nunca abaixo de UM, e o um não é arbitrário: é o piso da
       Resistência (_pisoDeR, em js/ficha-3dt.js), que sai desta mesma
       bolsa e não é oferecido por fora.

       Pus zero primeiro, e a auditoria apanhou: com zero, a R ficava na
       mesma com o piso e o avatar acabava com um ponto que o orçamento
       não tinha dado — 2.520 pontos de graça ao todo. Um avatar novo com
       uma virtude cara fica com o mínimo, e não com dívida nem com
       presente. */
    pontos:      Math.max(1, bolsa - vant.custo),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VANTAGENS, DESVANTAGENS, sortearVantagens, VD_PONTOS_MINIMOS, _vdEscolher };
}
