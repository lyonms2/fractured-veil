// ═══════════════════════════════════════════════════════════════════
// COMBATE — FICHA DO AVATAR
//
// Os quatro atributos e as duas barras de combate, calculados a partir
// do que o avatar já carrega: seed, raridade, elemento e nível.
//
// É uma FUNÇÃO PURA — não guarda nada, não lê estado global, não altera
// nada. Isso significa que:
//   · não é preciso campo novo no Firestore nem migração
//   · todo avatar que já existe ganha ficha no instante em que isto sobe
//   · o cliente não pode mentir, porque qualquer lado recalcula e confere
//
// HP e Energia existem SÓ dentro da batalha. Não têm nada a ver com as
// vitais do tamagotchi (fome/humor/energia/saúde/higiene), que continuam
// a viver em js/state.js.
// ═══════════════════════════════════════════════════════════════════

// ── AFINIDADE ELEMENTAL ──
// Cada elemento puxa um atributo como primário e outro como secundário.
// Distribuição escolhida por simulação: é a mais equilibrada possível
// com 7 elementos (pesos 4/6/6/5, o óptimo aritmético seria 5.25 cada).
const COMBATE_AFINIDADE = {
  'Fogo':         { primaria:'FOR', secundaria:'HAB' },  // agressão e dano contínuo
  'Terra':        { primaria:'RES', secundaria:'FOR' },  // muralha que também bate
  'Água':         { primaria:'RES', secundaria:'INT' },  // sustentação e cura
  'Luz':          { primaria:'HAB', secundaria:'RES' },  // velocidade que aguenta
  'Vento':        { primaria:'HAB', secundaria:'FOR' },  // velocidade e múltiplos golpes
  'Sombra':       { primaria:'INT', secundaria:'HAB' },  // debuff, crítico e roubo
  'Eletricidade': { primaria:'INT', secundaria:'RES' },  // burst que aguenta o troco
};

// ── ORÇAMENTO DE PONTOS POR RARIDADE ──
// [primária, secundária, terceira, quarta] — a soma é o orçamento total.
// A razão 20 : 28 : 36 (1 : 1.4 : 1.8) é a mesma do multiplicador de XP
// que rarityBonus() já usa, para a ficha não inventar uma escala nova.
const COMBATE_ORCAMENTO = {
  'Comum':    [7, 5, 4, 4],   // 20
  'Raro':     [10, 7, 6, 5],  // 28
  'Lendário': [13, 9, 7, 7],  // 36
};

const COMBATE_STATS = ['FOR', 'RES', 'HAB', 'INT'];

// Quanto cada nível acrescenta, em fracção da base
const COMBATE_CRESC_NIVEL = 0.10;

// ── BARRAS ──
const COMBATE_HP_BASE   = 40;
const COMBATE_HP_POR_RES = 10;
const COMBATE_EN_BASE   = 100;   // igual para todos; só o elemento modifica

// ═══════════════════════════════════════════════════════════════════
// Gerador determinístico a partir do seed.
// Mesmo LCG que js/data.js usa no gerarSVG, com uma constante de mistura
// própria — assim a variação da ficha não fica correlacionada com a
// aparência do avatar.
// ═══════════════════════════════════════════════════════════════════
function _combateRng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x5F3A) >>> 0;
  // Mistura inicial — sem isto, seeds consecutivos dão sequências parecidas
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function(min, max) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    // Usa os bits ALTOS: num LCG os bits baixos têm período curtíssimo
    // (s % 4 chega a repetir de 4 em 4), o que colapsava a variação.
    return min + (((s >>> 16) * (max - min + 1)) >>> 16);
  };
}

// ═══════════════════════════════════════════════════════════════════
// fichaDeCombate — o cálculo principal
//
//   fichaDeCombate(12345, 'Lendário', 'Fogo', 12)
//   → { FOR:27, RES:15, HAB:19, INT:15, hpMax:190, enMax:110, ... }
//
// Aceita também um objecto de slot directamente:
//   fichaDeCombate(avatarSlots[0])
// ═══════════════════════════════════════════════════════════════════
function fichaDeCombate(seed, raridade, elemento, nivel) {
  // Permite passar o slot inteiro em vez dos quatro argumentos
  if (seed && typeof seed === 'object') {
    const s = seed;
    return fichaDeCombate(s.seed || 0, s.raridade || 'Comum', s.elemento || 'Fogo', s.nivel || 1);
  }

  const afin = COMBATE_AFINIDADE[elemento] || COMBATE_AFINIDADE['Fogo'];
  const orc  = COMBATE_ORCAMENTO[raridade] || COMBATE_ORCAMENTO['Comum'];
  const nv   = Math.max(1, nivel || 1);

  // 1. distribuir o orçamento pela afinidade do elemento
  const outras = COMBATE_STATS.filter(k => k !== afin.primaria && k !== afin.secundaria);
  const base = {
    [afin.primaria]:   orc[0],
    [afin.secundaria]: orc[1],
    [outras[0]]:       orc[2],
    [outras[1]]:       orc[3],
  };

  // 2. variação individual pelo seed: move 2 pontos de um atributo para
  //    outro, mantendo o orçamento intacto — dois avatares do mesmo
  //    elemento e raridade nunca saem idênticos, mas nenhum nasce melhor.
  const rnd = _combateRng(seed || 0);
  const de  = COMBATE_STATS[rnd(0, 3)];
  let para  = COMBATE_STATS[rnd(0, 3)];
  if (para === de) para = COMBATE_STATS[(COMBATE_STATS.indexOf(de) + 1) % 4];
  const move = Math.min(2, Math.max(0, base[de] - 1));  // nunca deixa um atributo abaixo de 1
  base[de]   -= move;
  base[para] += move;

  // 3. crescimento por nível — multiplica a base, portanto a vantagem
  //    da raridade mantém-se do nível 1 ao 35
  const mult = 1 + COMBATE_CRESC_NIVEL * (nv - 1);
  const s = {};
  for (const k of COMBATE_STATS) s[k] = Math.round(base[k] * mult);

  // 4. barras
  //    HP vem só da RES. Energia é fixa, com bónus de quem tem HAB no kit.
  const hpMax = COMBATE_HP_BASE + s.RES * COMBATE_HP_POR_RES;
  let enMax = COMBATE_EN_BASE;
  if      (afin.primaria   === 'HAB') enMax = Math.round(COMBATE_EN_BASE * 1.20);
  else if (afin.secundaria === 'HAB') enMax = Math.round(COMBATE_EN_BASE * 1.10);

  // 5. qual atributo domina o golpe forte — o maior entre FOR e INT.
  //    (a fórmula usa os dois, mas este é o que pesa; ver COMBATE_SLOTS)
  //    RES e HAB nunca fazem dano: RES é sobrevivência, HAB é economia de
  //    acção. Manter os pilares separados foi o que evitou que um atributo
  //    contasse duas vezes.
  const statDoUltimate = s.INT >= s.FOR ? 'INT' : 'FOR';

  return {
    FOR: s.FOR, RES: s.RES, HAB: s.HAB, INT: s.INT,
    hpMax, enMax, statDoUltimate,
    primaria: afin.primaria,
    secundaria: afin.secundaria,
    elemento, raridade, nivel: nv,
  };
}

// ═══════════════════════════════════════════════════════════════════
// OS QUATRO SLOTS DE HABILIDADE
//
// Todo elemento preenche o mesmo molde — é isso que mantém as lutas
// legíveis: aprende-se a gramática uma vez e reconhece-se o kit de
// qualquer oponente de imediato.
//
// O golpe forte escala pelo MAIOR entre FOR e INT, e não pela primária
// do elemento. Prender o dano aos dois atributos que só fazem dano é o
// que mantém os pilares separados: RES é sobrevivência, HAB é economia
// de acção, e nenhuma delas ganha uma segunda função ofensiva.
// ═══════════════════════════════════════════════════════════════════
const COMBATE_SLOTS = [
  { papel:'comum',   custo:0,  gera:15, tipo:'dano',
    calc: f => Math.round(f.FOR * 1.4) },
  { papel:'skill',   custo:25, gera:0,  tipo:'dano',
    calc: f => Math.round(f.INT * 2.3 + f.FOR * 0.5) },
  // O termo do menor atributo nao e enfeite: sem ele o golpe forte saia
  // MAIS FRACO do que a habilidade de 25 EN em Vento, Terra e Luz — a
  // habilidade soma dois atributos e a forte usava so um. Com ele, a
  // forte fica acima em todos os 7 elementos, raridades e niveis.
  { papel:'forte',   custo:50, gera:0,  tipo:'dano',
    calc: f => Math.round(Math.max(f.FOR, f.INT) * 2.4 + Math.min(f.FOR, f.INT) * 1.0) },
  { papel:'suporte', custo:20, gera:0,  tipo:'escudo',
    calc: f => Math.round(f.RES * 2.5) },
];

// ── OS 7 KITS ──
// Aqui está só o que difere do molde. Os nomes e as descrições vivem
// em js/i18n-combate.js, porque são texto e o jogo é bilingue.
//   tipo: quando o slot não faz o que o molde diz (cura em vez de dano,
//         ou um efeito sem número nenhum)
//   mult: multiplicador sobre o valor do molde
const COMBATE_KITS = {
  'Fogo':         [ {}, {}, {}, {} ],
  'Água':         [ {}, { tipo:'cura' }, {}, {} ],
  'Terra':        [ {}, {}, {}, { mult:1.3 } ],
  'Vento':        [ {}, {}, {}, { tipo:'efeito' } ],
  'Eletricidade': [ {}, {}, {}, {} ],
  'Sombra':       [ {}, {}, {}, { tipo:'efeito' } ],
  'Luz':          [ {}, {}, {}, {} ],
};

// ═══════════════════════════════════════════════════════════════════
// habilidadesDoAvatar — as 4 habilidades já com os números calculados
//
//   habilidadesDoAvatar(fichaDeCombate(slot))
//   → [{ papel, custo, gera, tipo, valor, chave }, ...]
//
// 'chave' é o prefixo i18n do nome e da descrição.
// ═══════════════════════════════════════════════════════════════════
function habilidadesDoAvatar(ficha) {
  if (!ficha) return [];
  const kit = COMBATE_KITS[ficha.elemento] || COMBATE_KITS['Fogo'];
  return COMBATE_SLOTS.map((slot, i) => {
    const ov   = kit[i] || {};
    const tipo = ov.tipo || slot.tipo;
    // Um slot de puro efeito não tem número — mostrar um seria mentira
    const valor = tipo === 'efeito' ? null
                : Math.round(slot.calc(ficha) * (ov.mult || 1));
    return {
      papel: slot.papel,
      custo: slot.custo,
      gera:  slot.gera,
      tipo, valor,
      chave: `hab.${ficha.elemento}.${i}`,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════
// PODER — usado para emparelhar as filas e para ordenar os rankings.
//
// Fórmula derivada por simulação: de quatro candidatas testadas em 5000
// batalhas, esta foi a que melhor previu o vencedor (85%). Acrescentar
// bónus de diversidade ou expoentes não melhorou nada.
//
// Soma por membro, portanto equipas de tamanhos diferentes nunca se
// cruzam: uma equipa de 1 tem um terço do poder de uma de 3.
// ═══════════════════════════════════════════════════════════════════
const COMBATE_ORCAMENTO_TOTAL = { 'Comum': 20, 'Raro': 28, 'Lendário': 36 };

function poderDoAvatar(raridade, nivel) {
  const orc = COMBATE_ORCAMENTO_TOTAL[raridade] || 20;
  return orc * (1 + COMBATE_CRESC_NIVEL * (Math.max(1, nivel || 1) - 1));
}

// Aceita array de slots (ignora os vazios) ou array de {raridade, nivel}
function poderDaEquipa(membros) {
  if (!Array.isArray(membros)) return 0;
  return membros.reduce((total, m) => {
    if (!m || !m.hatched && m.hatched !== undefined && !m.raridade) return total;
    if (!m || m.dead) return total;
    return total + poderDoAvatar(m.raridade, m.nivel);
  }, 0);
}

// ═══════════════════════════════════════════════════════════════════
// EQUIPA DE COMBATE
//
// O combate é sempre 3v3. O jogador escolhe quais dos seus slots entram,
// e a escolha vive em gs.equipa como uma lista de índices de slot —
// portanto viaja no mesmo save que tudo o resto, sem campo novo.
//
// Guardar índices e não cópias do avatar é deliberado: o avatar continua
// a ser o do slot, com o nível e o estado que tiver na hora da batalha.
// ═══════════════════════════════════════════════════════════════════
const COMBATE_EQUIPA_MAX = 3;

// Um avatar à venda está congelado e pode mudar de dono a qualquer
// momento; morto ou por chocar não luta. Nenhum desses entra na equipa.
function _elegivelParaEquipa(s) {
  return !!(s && s.hatched && !s.dead && !s.pendingEgg && !s.listed);
}

// Índices escolhidos, já saneados.
//
// Três estados diferentes, e a diferença importa:
//   · gs.equipa não é array  → o jogador nunca escolheu. Preenche com os
//     primeiros disponíveis, para a equipa não nascer vazia.
//   · gs.equipa é [] vazio   → esvaziou de propósito. Fica vazio. Sem
//     isto, tirar o último da equipa parecia não fazer nada, porque o
//     preenchimento automático repunha-o no mesmo instante.
//   · gs.equipa tem entradas mas nenhuma sobrevive (morreram, foram
//     queimados, foram à venda) → repõe, senão o jogador ficava com uma
//     equipa vazia sem ter feito nada.
function equipaIdx() {
  if (typeof avatarSlots === 'undefined') return [];
  const escolheu = (typeof gs !== 'undefined' && Array.isArray(gs.equipa));
  const bruto    = escolheu ? gs.equipa : [];
  const vistos   = new Set();
  const out      = [];
  for (const i of bruto) {
    if (typeof i !== 'number' || vistos.has(i)) continue;
    if (!_elegivelParaEquipa(avatarSlots[i])) continue;
    vistos.add(i); out.push(i);
    if (out.length >= COMBATE_EQUIPA_MAX) break;
  }
  const esvaziouDePropósito = escolheu && gs.equipa.length === 0;
  if (out.length === 0 && !esvaziouDePropósito) {
    for (let i = 0; i < avatarSlots.length && out.length < COMBATE_EQUIPA_MAX; i++) {
      if (_elegivelParaEquipa(avatarSlots[i])) out.push(i);
    }
  }
  return out;
}

function estaNaEquipa(i)  { return equipaIdx().includes(i); }
function equipaCompleta() { return equipaIdx().length >= COMBATE_EQUIPA_MAX; }

// Devolve o que aconteceu, para quem chama poder dar a mensagem certa:
// 'add' | 'remove' | 'cheia' | 'inelegivel'
function alternarNaEquipa(i) {
  if (typeof gs === 'undefined' || typeof avatarSlots === 'undefined') return 'inelegivel';
  if (!_elegivelParaEquipa(avatarSlots[i])) return 'inelegivel';
  const atual = equipaIdx();
  const pos   = atual.indexOf(i);
  if (pos >= 0) { atual.splice(pos, 1); gs.equipa = atual; return 'remove'; }
  if (atual.length >= COMBATE_EQUIPA_MAX) return 'cheia';
  atual.push(i); gs.equipa = atual;
  return 'add';
}

// Os avatares da equipa, na ordem em que o jogador os escolheu.
function equipaDoJogador() {
  if (typeof avatarSlots === 'undefined') return [];
  return equipaIdx().map(i => avatarSlots[i]);
}
