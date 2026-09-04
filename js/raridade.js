// ═══════════════════════════════════════════════════════════════════
// RARIDADE — deixa de ser sorte e passa a ser currículo
//
// Era um sorteio no ovo: 2% Lendário, 18% Raro, o resto Comum. Quem
// tirava a sorte grande começava forte e quem não tirava começava
// atrás, e nada do que o jogador fizesse mudava isso.
//
// Agora TODO O AVATAR NASCE COMUM e sobe. A raridade passa a ser o que
// ele chegou a ser, e não o bilhete que lhe calhou.
//
// ── A ESCADA ──
//
// Pelos PONTOS de personagem, que é a medida que o próprio 3D&T usa para
// dizer o que uma criatura vale:
//
//     0–7 pontos    Comum       níveis  1–12
//     8–11 pontos    Raro        níveis 13–28
//     12+ pontos     Lendário    níveis 29–35
//
// Andou pelas FASES durante um dia, e era depressa de mais: dava
// Lendário ao nível 17, a meio do caminho, e depois havia dezoito níveis
// sem nada para chegar. Pelos pontos, ser Lendário é o fim da estrada.
//
// ── MAS O TEMPO DE JOGO CONTINUA A MANDAR ──
//
// Os pontos vêm do nível, e o nível vem do XP — que se pode acumular
// depressa. O jogo já tinha guarda para isso nas fases (FASE_MIN_SECS,
// em js/state.js): ser adulto pede vinte horas de jogo, e não só
// nível. A raridade fica com o menor dos dois, senão eu estaria a abrir
// pela porta das traseiras uma porta que alguém já tinha fechado.
//
// Onde não há tempo de jogo na mão — uma listagem do marketplace traz o
// nível e mais nada — responde-se pelos pontos, que é o que existe.
//
// ── O QUE A RARIDADE FAZ E NÃO FAZ ──
//
// NÃO dá pontos de ficha: eles são a causa e não o efeito, e pô-la a
// pagá-los seria um círculo. O pontosDoAvatar deixou de a ler.
//
// DÁ corpo — asas, espinhos, aura, que aparecem à medida (js/data.js) —
// e dá REPERTÓRIO: o Comum luta com um ataque e uma defesa, o Raro
// ganha um golpe forte, o Lendário ganha um segundo. E dá o direito de
// ser vendido.
// ════════════════════════════════════════════════════════════════════

/* Os degraus, em pontos. O primeiro elemento de cada par é o mínimo. */
const RARIDADE_ESCADA = [
  { min: 12, raridade: 'Lendário' },
  { min:  8, raridade: 'Raro' },
  { min:  0, raridade: 'Comum' },
];

/* O TECTO QUE O TEMPO DE JOGO IMPÕE.

   Não é a escada — é o travão. A fase 3 pede vinte horas de jogo, e sem
   elas o avatar não passa de Raro por muitos pontos que tenha. */
const RARIDADE_POR_FASE = ['Comum', 'Raro', 'Raro', 'Lendário'];

// Quantos degraus acima do Comum. É este número que o desenho lê para
// saber que partes do corpo já se vêem.
const RARIDADE_GRAU = { 'Comum': 0, 'Raro': 1, 'Lendário': 2 };

function raridadeDaFase(fase) {
  const f = Math.max(0, Math.min(RARIDADE_POR_FASE.length - 1, fase | 0));
  return RARIDADE_POR_FASE[f];
}

// A raridade que estes pontos valem, sem olhar a mais nada.
function raridadeDosPontos(pontos) {
  const p = pontos || 0;
  for (const degrau of RARIDADE_ESCADA) if (p >= degrau.min) return degrau.raridade;
  return 'Comum';
}

function grauDaRaridade(raridade) {
  return RARIDADE_GRAU[raridade] != null ? RARIDADE_GRAU[raridade] : 0;
}

/* A fase de um slot qualquer, incluindo os que não estão em campo.

   O getFase() do js/state.js só sabe do avatar activo — lê as variáveis
   vivas `nivel` e `totalSecs`. Esta faz o mesmo para um slot na mão, e
   aceita que o tempo de jogo não exista: uma listagem do marketplace
   traz o nível e mais nada, e recusar-me a responder aí só me obrigava
   a inventar uma segunda regra noutro sítio. */
function faseDoSlot(slot) {
  if (!slot) return 0;
  const porNivel = (typeof faseFromNivel === 'function')
    ? faseFromNivel(slot.nivel || 1)
    : ((slot.nivel || 1) < 5 ? 0 : (slot.nivel || 1) < 10 ? 1 : (slot.nivel || 1) < 17 ? 2 : 3);
  if (slot.totalSecs == null || typeof faseFromAge !== 'function') return porNivel;
  return Math.min(porNivel, faseFromAge(slot.totalSecs));
}

function raridadeDoSlot(slot) {
  if (!slot) return 'Comum';
  const pontos = (typeof pontosDoAvatar === 'function')
    ? pontosDoAvatar('Comum', slot.nivel || 1)
    : 5 + Math.floor(((slot.nivel || 1) - 1) / 4);
  const porPontos = raridadeDosPontos(pontos);
  // Sem tempo de jogo na mão não há travão a aplicar.
  if (slot.totalSecs == null || typeof faseFromAge !== 'function') return porPontos;
  const tecto = raridadeDaFase(faseDoSlot(slot));
  return grauDaRaridade(porPontos) <= grauDaRaridade(tecto) ? porPontos : tecto;
}

/* ── O ÚNICO ESCRITOR ──

   A raridade continua a viver num campo do slot, porque o servidor e as
   listagens do marketplace a leem de lá e não podem recalculá-la. Mas
   um valor guardado que também se sabe calcular são duas cópias à
   espera de divergirem — já aconteceu neste jogo mais de uma vez.

   Por isso só esta função escreve o campo. Devolve a raridade nova
   quando houve subida, e null quando não houve, para quem chama poder
   festejar sem ter de comparar por fora. */
function sincronizarRaridade(slot) {
  if (!slot || typeof slot !== 'object') return null;
  const nova = raridadeDoSlot(slot);
  /* Descer, nunca. A fase pode descer no papel — o faseFromAge de um
     avatar que perdeu tempo de jogo, um nível reposto por uma correcção
     — e tirar a Lendário a quem já a tinha seria roubá-la. O que se
     conquista fica. */
  if (grauDaRaridade(nova) <= grauDaRaridade(slot.raridade)) return null;
  slot.raridade = nova;
  return nova;
}

// Todos os slots de uma vez, para a migração de quem já estava a jogar.
function sincronizarRaridades(slots) {
  if (!Array.isArray(slots)) return 0;
  let n = 0;
  for (const s of slots) if (s && sincronizarRaridade(s)) n++;
  return n;
}

/* Pode ser vendido?

   Era "é Raro ou Lendário", e com toda a gente a nascer Comum isso
   deixou o mercado sem oferta nenhuma. Continua a ser a mesma pergunta
   — só que agora tem resposta possível: chega-se lá crescendo. */
function podeSerVendido(slot) {
  return grauDaRaridade(slot && slot.raridade) >= 1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RARIDADE_POR_FASE, RARIDADE_GRAU, RARIDADE_ESCADA,
                     raridadeDaFase, raridadeDosPontos, grauDaRaridade,
                     faseDoSlot, raridadeDoSlot, sincronizarRaridade, sincronizarRaridades,
                     podeSerVendido };
}
