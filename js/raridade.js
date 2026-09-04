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
// Não inventei degrau nenhum: a raridade anda pelas FASES que o jogo já
// tinha. Quem sobe de fase já tem cerimónia (js/evolucao.js), já tem
// clarão e já escolhe o momento — e é nessa cerimónia que o avatar
// passa a ficar mais raro. Uma coisa só, com um nome só.
//
//   fase 0  BEBÊ      nível 1-4      Comum
//   fase 1  CRIANÇA   nível 5-9      Comum
//   fase 2  JOVEM     nível 10-16    Raro
//   fase 3  ADULTO    nível 17+      Lendário
//
// O bebé e a criança partilham o Comum de propósito: sair da primeira
// fase é aprender a andar, e não ainda distinguir-se.
//
// ── A FASE PEDE NÍVEL E TEMPO ──
//
// getFase() é o menor entre o nível e as horas de jogo (FASE_MIN_SECS,
// em js/state.js), para ninguém comprar XP e saltar para adulto numa
// tarde. A raridade herda essa regra inteira: onde há totalSecs, conta;
// onde não há — uma listagem do marketplace só leva o nível — usa-se o
// nível, que é o que existe.
//
// ── O QUE A RARIDADE NÃO FAZ ──
//
// Não dá pontos de ficha. O pontosDoAvatar deixou de a ler (ver
// js/ficha-3dt.js): se a lesse, o avatar ganhava cinco pontos de uma
// vez ao passar a Lendário e um nível 16 encontrava um nível 17 com o
// dobro da força. A raridade paga em CORPO — asas, espinhos, aura — e
// no direito de ser vendido. A força continua a vir do nível.
// ═══════════════════════════════════════════════════════════════════

const RARIDADE_POR_FASE = ['Comum', 'Comum', 'Raro', 'Lendário'];

// Quantos degraus acima do Comum. É este número que o desenho lê para
// saber que partes do corpo já se vêem.
const RARIDADE_GRAU = { 'Comum': 0, 'Raro': 1, 'Lendário': 2 };

function raridadeDaFase(fase) {
  const f = Math.max(0, Math.min(RARIDADE_POR_FASE.length - 1, fase | 0));
  return RARIDADE_POR_FASE[f];
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
  return raridadeDaFase(faseDoSlot(slot));
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
  module.exports = { RARIDADE_POR_FASE, RARIDADE_GRAU, raridadeDaFase, grauDaRaridade,
                     faseDoSlot, raridadeDoSlot, sincronizarRaridade, sincronizarRaridades,
                     podeSerVendido };
}
