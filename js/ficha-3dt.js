// ═══════════════════════════════════════════════════════════════════
// FICHA DO AVATAR ELEMENTAL — regras do 3D&T Alpha
//
// Substitui a ficha inventada (js/combate-ficha.js) pelas regras do
// Manual 3D&T Alpha, Edição Revisada (Jambô, 2011).
//
// Continua a ser FUNÇÃO PURA: nada é gravado, tudo sai do que o avatar
// já carrega — seed, raridade, elemento e nível. Um avatar que já existe
// ganha ficha nova no instante em que isto sobe, sem migração.
//
// ── O QUE VEM DO MANUAL ──
//   · quatro características, de 0 a 5 (pág. 22-27)
//   · cada ponto de personagem compra um ponto de característica (p. 922
//     do texto extraído: "cada ponto de personagem compra um ponto de
//     característica")
//   · 5 PVs e 5 PMs por cada ponto de Resistência
//   · escalões de poder: Novato 5, Lutador 7, Campeão 10, Lenda 12
//
// ── O QUE É NOSSO ──
//   · qual escalão corresponde a cada raridade
//   · o nível a comprar pontos ao longo do tempo
//   · a distribuição dos pontos sair do seed em vez de ser escolhida
//
// O Poder de Fogo fica de fora: avatares não usam armas nem ataques à
// distância. Sobram exactamente quatro características.
// ═══════════════════════════════════════════════════════════════════

const FICHA_CARACS = ['F', 'H', 'R', 'A'];

const FICHA_NOMES = {
  F: 'Força',        // dano corpo-a-corpo; entra na Força de Ataque
  H: 'Habilidade',   // iniciativa, esquiva; entra na FA e na FD
  R: 'Resistência',  // define PV e PM
  A: 'Armadura',     // defesa passiva; entra na Força de Defesa
};

// ── ESCALÕES DE PODER (manual, pág. 13) ──
// A raridade diz em que escalão o avatar nasce.
const FICHA_PONTOS_RARIDADE = {
  'Comum':    5,   // Novato
  'Raro':     7,   // Lutador
  'Lendário': 10,  // Campeão
};

// O nível compra pontos, como os Pontos de Experiência do manual.
// Um ponto a cada quatro níveis: ao nível 35 são +8, o que leva um
// Comum a 13 (acima de Lenda) e um Lendário a 18 (território das
// Escalas de Poder). É a progressão mais lenta que ainda se sente.
const FICHA_NIVEIS_POR_PONTO = 4;

// Tecto por característica. O manual proíbe passar de 5 na criação, mas
// autoriza explicitamente subir depois com experiência — por isso o
// tecto acompanha os pontos ganhos por nível em vez de ser fixo.
//
// Sobre as Escalas de Poder (Ningen ×1, Sugoi ×10, Kiodai ×100, Kami
// ×1000): não são precisas aqui. São uma notação para não ter de
// escrever F300, e só mudam alguma coisa quando criaturas de escalas
// DIFERENTES se enfrentam. Todos os avatares são Ningen, e o máximo que
// atingem ao nível 35 é 13 — perfeitamente escrevível. As escalas ficam
// disponíveis se um dia houver chefes fora da escala humana.
const FICHA_MAX_INICIAL = 5;

const FICHA_PV_POR_R = 5;
const FICHA_PM_POR_R = 5;

// ── PISO DE RESISTÊNCIA ──
// O manual permite R0 e resolve com "sempre 1 Ponto de Vida e 1 Ponto de
// Magia" — mas essa regra é para Pessoas Comuns, figurantes que não
// lutam. Os nossos avatares lutam todos, e um avatar com 1 PV morre ao
// primeiro golpe depois de semanas a ser criado.
//
// O piso cresce com o total de pontos porque, sem isso, um avatar com
// foco em Habilidade ficava preso a R3 (15 PV) do nível 1 ao 35 enquanto
// a Força dos adversários subia até 8. Não é dar pontos de graça: são
// pontos do próprio orçamento, apenas com um mínimo garantido na R.
function _pisoDeR(pontos) {
  return 1 + Math.floor(pontos / 6);
}

// ═══════════════════════════════════════════════════════════════════
// Gerador determinístico — mesmo LCG do resto do jogo, com constante
// própria para a ficha não ficar correlacionada com a aparência.
// ═══════════════════════════════════════════════════════════════════
function _fichaRng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x3D74) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function (min, max) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return min + (((s >>> 16) * (max - min + 1)) >>> 16);
  };
}

function pontosDoAvatar(raridade, nivel) {
  const base = FICHA_PONTOS_RARIDADE[raridade] != null ? FICHA_PONTOS_RARIDADE[raridade]
                                                       : FICHA_PONTOS_RARIDADE['Comum'];
  const nv = Math.max(1, nivel || 1);
  return base + Math.floor((nv - 1) / FICHA_NIVEIS_POR_PONTO);
}

// ═══════════════════════════════════════════════════════════════════
// fichaDeAvatar — a ficha completa
//
//   fichaDeAvatar(12345, 'Raro', 'Fogo', 10)
//   → { F:2, H:3, R:2, A:2, pv:10, pm:10, pontos:9, ... }
//
// Aceita também o objecto do slot:  fichaDeAvatar(avatarSlots[0])
// ═══════════════════════════════════════════════════════════════════
function fichaDeAvatar(seed, raridade, elemento, nivel) {
  if (seed && typeof seed === 'object') {
    const s = seed;
    return fichaDeAvatar(s.seed || 0, s.raridade || 'Comum', s.elemento || 'Fogo', s.nivel || 1);
  }

  const pontos = pontosDoAvatar(raridade, nivel);
  const tecto  = FICHA_MAX_INICIAL + Math.floor((Math.max(1, nivel || 1) - 1) / FICHA_NIVEIS_POR_PONTO);
  const rnd    = _fichaRng(seed || 0);

  // Distribuição: a Resistência recebe o mínimo primeiro (senão o avatar
  // nasce com 0 PVs), e o resto vai ponto a ponto para uma característica
  // sorteada. Distribuir um a um em vez de sortear quatro números de uma
  // vez é o que garante que o total bate sempre certo com o orçamento.
  //
  // O sorteio é PESADO, não uniforme: o seed escolhe uma característica
  // de foco e outra de apoio, e essas saem mais vezes. Sem isso o
  // passeio aleatório achatava tudo e os avatares saíam todos 1/1/2/1 —
  // enquanto os personagens do próprio manual são pontudos (a Tasha do
  // exemplo é F0 H4 R3 A2). É a diferença entre ter fichas e ter builds.
  const foco  = FICHA_CARACS[rnd(0, 3)];
  let apoio   = FICHA_CARACS[rnd(0, 3)];
  if (apoio === foco) apoio = FICHA_CARACS[(FICHA_CARACS.indexOf(foco) + 1) % 4];

  const peso = k => k === foco ? 6 : k === apoio ? 3 : 1;

  const piso = _pisoDeR(pontos);
  const c = { F: 0, H: 0, R: piso, A: 0 };
  let porGastar = pontos - piso;

  while (porGastar > 0) {
    const disponiveis = FICHA_CARACS.filter(k => c[k] < tecto);
    if (!disponiveis.length) break;                      // tudo no tecto
    const total = disponiveis.reduce((t, k) => t + peso(k), 0);
    let alvo = rnd(1, total), k = disponiveis[0];
    for (const cand of disponiveis) { alvo -= peso(cand); if (alvo <= 0) { k = cand; break; } }
    c[k]++; porGastar--;
  }

  const pv = c.R * FICHA_PV_POR_R;
  const pm = c.R * FICHA_PM_POR_R;

  return {
    F: c.F, H: c.H, R: c.R, A: c.A,
    pv, pvMax: pv, pm, pmMax: pm,
    pontos, tecto,
    elemento, raridade, nivel: Math.max(1, nivel || 1),
    escalao: _escalaoDe(pontos),
  };
}

// O nome do escalão, para mostrar na ficha.
function _escalaoDe(pontos) {
  if (pontos <= 4)  return 'Pessoa Comum';
  if (pontos <= 6)  return 'Novato';
  if (pontos <= 9)  return 'Lutador';
  if (pontos <= 11) return 'Campeão';
  if (pontos <= 14) return 'Lenda';
  return 'Além da Lenda';
}

// ═══════════════════════════════════════════════════════════════════
// PODER — para emparelhar filas e ordenar rankings.
//
// Agora é simplesmente o total de pontos, que é a medida que o próprio
// manual usa para dizer se dois personagens são páreo. Substitui a
// fórmula que tínhamos inventado.
// ═══════════════════════════════════════════════════════════════════
function poderDoAvatar3dt(raridade, nivel) {
  return pontosDoAvatar(raridade, nivel);
}

function poderDaEquipa3dt(membros) {
  if (!Array.isArray(membros)) return 0;
  return membros.reduce((t, m) => (!m || m.dead) ? t : t + poderDoAvatar3dt(m.raridade, m.nivel), 0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fichaDeAvatar, pontosDoAvatar, poderDoAvatar3dt, poderDaEquipa3dt,
                     FICHA_CARACS, FICHA_NOMES, FICHA_PONTOS_RARIDADE };
}
