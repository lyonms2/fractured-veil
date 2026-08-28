// ═══════════════════════════════════════════════════════════════════
// FICHA DO AVATAR ELEMENTAL — regras do 3D&T Alpha
//
// Substitui a ficha inventada (js/combate-ficha.js) pelas regras do
// Manual 3D&T Alpha, Edição Revisada (Jambô, 2011).
//
// Continua sendo FUNÇÃO PURA: nada é gravado, tudo sai do que o avatar
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
// distância. Sobram exatamente quatro características.
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
// Tecto de cada característica na distribuição. O valor final leva
// ainda o +1 do piso, portanto um avatar de nível 1 chega a 6.
const FICHA_MAX_INICIAL = 5;

const FICHA_PV_POR_R = 5;
const FICHA_PM_POR_R = 5;

// ── PISO DA RESISTÊNCIA ──
// Cuidado ao ler isto: já não é o que era, e o comentário antigo mentia.
//
// Nasceu para impedir R0 (que daria 0 PV, um avatar morto à nascença).
// Essa parte deixou de ser dele: o +1 somado no fim da distribuição já
// garante R≥1 para toda a gente. O que este piso ainda faz são DUAS
// coisas, e nenhuma delas é a original:
//
//   · o "1 +" garante um MÍNIMO DE 10 PV E 10 PM em combate. Sem ele o
//     mínimo cairia para 5 de cada, e 2,5% dos avatares entrariam em
//     luta com 5 pontos de magia — quase nada, quando a magia média
//     custa 5. Ficou por decisão, não por inércia: tirá-lo não daria
//     mais variedade nenhuma (a amplitude das fichas nem se mexe),
//     só avatares mais frágeis.
//
//   · o "floor(pontos/6)" faz o ESCALONAMENTO, e esse o +1 não dá por
//     ser uma constante. Sem ele, um avatar com foco em Habilidade
//     ficava preso na mesma vida do nível 1 ao 35 enquanto a Força dos
//     adversários subia até 8.
//
// Não é dar pontos de graça: são pontos do próprio orçamento, apenas
// com um mínimo garantido na Resistência.
function _pisoDeR(pontos) {
  return 1 + Math.floor(pontos / 6);
}

// ── A HABILIDADE NÃO TEM PISO PRÓPRIO ──
// Teve, enquanto o 0 era possível: com H0 o tecto H×5 dava 0 PMs e o
// avatar não lançava magia nenhuma. O +1 somado no fim resolveu isso —
// a Habilidade mínima passou a ser 1, e um tecto de 5 PMs já alcança
// magia.
//
// Alcança as de ataque e as de defesa, mas nem sempre o golpe forte,
// que é o mais caro. E isso deixou de ser um defeito para passar a ser
// o ponto: um avatar de Habilidade baixa nasce sem o seu golpe forte, e
// a ficha diz-lhe de quanta Habilidade precisa para o alcançar.
//
//   Comum nv1     27% nascem sem o golpe forte
//   Lendário nv1  13%
//   Comum nv35    13%  — o buraco fecha-se com o nível
//
// É a raridade a valer alguma coisa para além do número de pontos, e é
// uma razão concreta para subir de nível. O ataque e a defesa nunca
// faltam: essas gavetas têm magias baratas que cabem em qualquer tecto.

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
// Aceita também o objeto do slot:  fichaDeAvatar(avatarSlots[0])
// ═══════════════════════════════════════════════════════════════════
function fichaDeAvatar(seed, raridade, elemento, nivel) {
  if (seed && typeof seed === 'object') {
    const s = seed;
    return fichaDeAvatar(s.seed || 0, s.raridade || 'Comum', s.elemento || 'Fogo', s.nivel || 1);
  }

  const pontosBase = pontosDoAvatar(raridade, nivel);

  // Vantagem e desvantagem entram na MESMA bolsa: a desvantagem dá
  // pontos, a vantagem custa, e o que sobra compra as características.
  // É o que o manual faz — não são dois orçamentos separados.
  const vd = (typeof sortearVantagens === 'function')
    ? sortearVantagens(seed, pontosBase, elemento) : null;
  const pontos = vd ? vd.pontos : pontosBase;

  const nv     = Math.max(1, nivel || 1);
  const rnd    = _fichaRng(seed || 0);

  // Distribuição: os pontos vão um a um para uma característica sorteada.
  // Distribuir um a um em vez de sortear quatro números de uma vez é o
  // que garante que o total bate sempre certo com o orçamento.
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

  // ── SUBIR DE NÍVEL SÓ PODE SOMAR ──
  // A ficha é recalculada do zero a cada nível, e isso já lhe custou um
  // defeito: em 0,89% das subidas uma característica DESCIA. A culpa era
  // do tecto, que sobe com o nível — quando subia, um ponto que antes
  // tinha transbordado deixava de transbordar, e o sorteio inteiro
  // desalinhava para trás.
  //
  // A correção é dar a cada ponto O TECTO QUE VALIA NO NÍVEL EM QUE ELE
  // FOI GANHO. Os pontos que vêm da raridade valem todos do nível 1
  // (tecto 5); cada ponto ganho por nível traz consigo +1 de tecto. Assim
  // um nível novo acrescenta um sorteio ao fim da fila e nunca mexe nos
  // que já foram feitos.
  const pontosDeNivel = Math.floor((nv - 1) / FICHA_NIVEIS_POR_PONTO);
  const pontosNoNv1   = pontos - pontosDeNivel;
  // Quantos sorteios este avatar já fazia ao nascer. Vem do orçamento do
  // NÍVEL 1, que não muda nunca — se viesse do orçamento atual, o piso
  // da Resistência (que sobe de seis em seis pontos) deslocava o limiar
  // e voltava a desalinhar a fila. Foi assim que sobraram 1880
  // regressões depois da primeira correção.
  const sorteiosNoNv1 = pontosNoNv1 - _pisoDeR(pontosNoNv1);

  // O piso da Resistência entra como ponto de partida e sai da bolsa,
  // como sempre saiu — mas o tecto da R sobe com ele. Sem isso, um piso
  // maior deixava menos espaço até ao tecto, a R transbordava um sorteio
  // mais cedo e o resto da fila desalinhava: a segunda fonte da mesma
  // regressão. Com o tecto a acompanhar, a folga da R é sempre a mesma
  // que a das outras três, e subir o piso não desloca sorteio nenhum.
  const piso = _pisoDeR(pontos);
  const c = { F: 0, H: 0, R: piso, A: 0 };
  const porGastar = pontos - piso;

  for (let i = 1; i <= porGastar; i++) {
    // Este é o i-ésimo ponto. Se veio da raridade, tecto 5; se veio de
    // um nível, tecto 5 + quantos níveis já tinham passado.
    const tectoAqui = FICHA_MAX_INICIAL + Math.max(0, i - sorteiosNoNv1);
    const disponiveis = FICHA_CARACS.filter(k => c[k] < tectoAqui + (k === 'R' ? piso : 0));
    if (!disponiveis.length) break;                      // tudo no tecto
    const total = disponiveis.reduce((t, k) => t + peso(k), 0);
    let alvo = rnd(1, total), k = disponiveis[0];
    for (const cand of disponiveis) { alvo -= peso(cand); if (alvo <= 0) { k = cand; break; } }
    c[k]++;
  }

  const tecto = FICHA_MAX_INICIAL + pontosDeNivel;

  // ── O PISO DE 1 ──
  // Somado no FIM, depois de a bolsa estar distribuída, e não antes. A
  // diferença é tudo: um piso pago da bolsa comeria 4 dos 5 pontos de um
  // Comum de nível 1 e sairiam todos 1/1/1/1. Somado no fim, a distância
  // entre as características fica intacta — a Tasha do manual (F0 H4 R3
  // A2) passa a F1 H5 R4 A3, a mesma personagem um degrau acima.
  //
  // Existe porque um 0 desliga regras em silêncio:
  //   · o crítico dobra a Força e a Armadura, e dobrar zero dá zero —
  //     um 6 natural não valia nada para ~30% dos avatares
  //   · a Habilidade manda no tecto H×5, e com H baixo havia gavetas de
  //     magia que ficavam vazias por não caber lá nada
  // Repare que os quatro sobem, portanto a FA e a FD sobem as duas: o
  // dano por golpe fica onde estava.
  c.F += 1; c.H += 1; c.R += 1; c.A += 1;

  // As vantagens de reserva dão PV ou PM como se a Resistência fosse
  // maior, sem mexer na R verdadeira.
  const bonusPV = (vd && vd.vantagem.pvComoR) ? vd.vantagem.pvComoR : 0;
  const bonusPM = (vd && vd.vantagem.pmComoR) ? vd.vantagem.pmComoR : 0;
  const pv = (c.R + bonusPV) * FICHA_PV_POR_R;
  const pm = (c.R + bonusPM) * FICHA_PM_POR_R;

  return {
    seed: seed || 0,
    F: c.F, H: c.H, R: c.R, A: c.A,
    pv, pvMax: pv, pm, pmMax: pm,
    pontos, pontosBase, tecto,
    vantagem:    vd ? vd.vantagem    : null,
    desvantagem: vd ? vd.desvantagem : null,
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
