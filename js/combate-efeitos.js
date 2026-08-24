// ═══════════════════════════════════════════════════════════════════
// COMBATE — EFEITOS
//
// Os 28 slots do kit elemental. O slot 0 (ataque comum) nunca tem
// efeito: é só dano e energia. Os outros três têm um efeito cada.
//
// INTENSIDADE POR ELEMENTO — é o que impede um elemento de acumular
// efeito forte com dano forte. Quem tem os efeitos mais potentes tem
// menos números, e vice-versa.
//
// Estes valores vieram de descida por coordenadas sobre 12.000 batalhas
// por iteração, com alvo de 50% para todos, e depois puxados a meio
// caminho de volta para o neutro. Levada até ao fim, a afinação põe os
// quatro elementos a 50% — e aí deixam de se sentir diferentes. O plano
// pede 13pp de amplitude, não zero.
//
// A gama é estreita (0.57 a 0.93) e isso é bom sinal: com 4 elementos e
// a rotação perfeita de afinidades, a tabela quase não precisa de
// corrigir nada. Com 7 elementos ia de 0.30 a 1.65, porque estava a
// compensar a assimetria da própria tabela de afinidades.
//
// Nada aqui aplica nada. São descrições de dados; quem as executa é o
// js/combate-motor.js. Manter separado permite mexer no equilíbrio sem
// tocar na máquina de estados da batalha.
// ═══════════════════════════════════════════════════════════════════

const COMBATE_INTENSIDADE = {
  'Água':  1.02,   // cura, dreno de energia e escudo que regenera
  'Terra': 0.95,   // muralha e atordoamento, com HP alto por trás
  'Vento': 0.94,   // o de menos HP; compensa na esquiva e nos efeitos
  'Fogo':  0.37,   // tem o maior dano bruto do jogo — paga aqui
  'Sombra':0.75,   // reposta; será reafinada na passagem para 3D&T
};

// Magnitudes base dos efeitos, antes da intensidade do elemento.
// Só os efeitos SECUNDÁRIOS são escalados pela intensidade — o valor
// principal do slot (dano, cura ou escudo) vem da ficha e já está
// equilibrado pelo orçamento da raridade.
const COMBATE_EF = {
  QUEIMA_FRACAO:   0.20,   // por turno, em fracção do golpe que a aplicou
  DEBUFF_ACERTO:   0.15,   // pontos percentuais de acerto
  DEBUFF_STAT:     0.20,   // fracção de FOR/INT retirada
  ATORDOAR_CHANCE: 0.50,
  REFLEXO:         0.45,   // fracção do dano devolvida a quem ataca
  DRENO_EN:        25,
  ESCUDO_REGEN_EN: 15,     // por turno, enquanto o escudo durar
  DEVOLVE_EN:      30,     // de uma vez, ao conjurar
  ESCUDO_REGEN_HP: 0.08,   // por turno, em fracção do escudo inicial
  MURALHA_BONUS:   0.30,   // escudo 30% maior
  ROUBO_VIDA:      0.50,   // fracção do dano convertida em HP
  CICLONE_POR_GOLPE: 0.12, // bónus por golpe acertado antes nesta batalha
  RAJADA_TOTAL:    1.25,   // os 3 golpes somam 125% do valor do slot
  RAJADA_GOLPES:   3,
  CRIT_TROVAO:     0.40,   // o único ultimate que pode criticar
};

// ── OS 21 EFEITOS (slots 1, 2 e 3 de cada elemento) ──
// tipo: o que o motor tem de executar. null = sem efeito.
const COMBATE_EFEITOS = {
  'Fogo': [
    null,
    { tipo:'queimadura', turnos:3, ignoraEscudo:true },
    // A spec diz "ignora 30% da RES do alvo", mas a RES deixou de mitigar
    // dano na auditoria — só dá HP. Fica a versão do exemplo da própria
    // spec, que é a que continua a fazer sentido. Ver nota no README.
    { tipo:'queimadura', turnos:2 },
    { tipo:'escudo', reflexo:true },
  ],
  'Água': [
    null,
    { tipo:'cura' },
    { tipo:'dreno_energia' },
    { tipo:'escudo', regenEnergia:true },
  ],
  'Sombra': [
    null,
    { tipo:'debuff_stat', turnos:3, stats:['FOR','INT'] },
    { tipo:'roubo_vida' },
    { tipo:'crit_garantido' },
  ],
  'Terra': [
    null,
    { tipo:'debuff_acerto', turnos:2, alvo:'inimigo' },
    { tipo:'atordoar', turnos:1 },
    { tipo:'escudo', bonus:true, turnos:2 },
  ],
  'Vento': [
    null,
    { tipo:'multi_golpe' },
    { tipo:'crescente' },
    // Escudo E esquiva. Era só esquiva, e o Vento ficava o único
    // elemento sem escudo nenhum pelos mesmos 28 EN — com o HP mais
    // baixo do jogo por cima disso. Ganhava 33% das batalhas contra 61%
    // do Fogo; com o escudo sobe para 44% sem tocar em mais nada.
    { tipo:'escudo', evasao:true, turnos:2 },
  ],
};

function intensidadeDe(elemento) {
  return COMBATE_INTENSIDADE[elemento] != null ? COMBATE_INTENSIDADE[elemento] : 0.70;
}

function efeitoDe(elemento, slot) {
  const kit = COMBATE_EFEITOS[elemento];
  return kit ? kit[slot] : null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { COMBATE_INTENSIDADE, COMBATE_EF, COMBATE_EFEITOS, intensidadeDe, efeitoDe };
}
