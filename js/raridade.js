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
// pagá-los seria um círculo. A escada dos pontos deixou de a ler, e
// depois saiu de vez com o 3D&T.
//
// DÁ corpo — asas, espinhos, aura, que aparecem à medida (js/data.js) —
// e dá REPERTÓRIO: o Comum luta com um ataque e uma defesa, o Raro
// ganha um golpe forte, o Lendário ganha um segundo. E dá o direito de
// ser vendido.
// ════════════════════════════════════════════════════════════════════

/* ── O QUE JÁ NÃO VIVE AQUI ──

   Este arquivo foi, durante muito tempo, o lugar onde a raridade se
   decidia. Três gerações de regra passaram por ele e saíram:

     1. uma escada em PONTOS de ficha, a medida do 3D&T;
     2. um teto que o TEMPO DE JOGO impunha por cima dela;
     3. a raridade pela FASE, e a raridade pelo NÍVEL.

   A última saiu na etapa 3I.12, junto com o `fuRaridadeDoNivel` do
   js/ficha-fu.js. O que as três tinham em comum é o que o jogo deixou
   de aceitar: que a raridade se CALCULASSE a partir de outra coisa.

     NÍVEL      é progressão
     FASE       é corpo
     RARIDADE   é conquista, certificada, guardada no mapa `raridades`
                que só o servidor escreve (js/raridades.js)

   O que ficou aqui não fala de raridade conquistada: o grau (para
   ordenar e comparar), a fase de um slot, e se o avatar pode ir ao
   mercado. */

/* O grau de cada uma, para comparar e ordenar. Não decide nada: só diz
   qual é mais alta que qual. A mesma ordem do RARIDADES
   (js/raridades.js) e do FU_RARIDADES (js/ficha-fu.js) — o
   tools/testar-raridade.js confere que as três batem. */
const RARIDADE_GRAU = { 'Comum': 0, 'Raro': 1, 'Lendário': 2 };

function grauDaRaridade(raridade) {
  return RARIDADE_GRAU[raridade] != null ? RARIDADE_GRAU[raridade] : 0;
}

/* A fase de um slot qualquer, incluindo os que não estão em campo.

   O getFase() do js/state.js só sabe do avatar ativo — lê as variáveis
   vivas `nivel` e `totalSecs`. Esta faz o mesmo para um slot na mão, e
   aceita que o tempo de jogo não exista: uma listagem do marketplace
   traz o nível e mais nada, e recusar-me a responder aí só me obrigava
   a inventar uma segunda regra noutro lugar. */
/* O TEMPO DE JOGO SAIU DAQUI TAMBÉM.

   Pedia o menor entre a fase do nível e a da idade. A segunda metade
   deixou de existir (ver getFase, em js/state.js): sem tempo de jogo o
   avatar não sobe de nível, portanto o nível JÁ É tempo de jogo, e
   contá-lo outra vez era travar duas vezes a mesma porta.

   A cópia de emergência também saiu: tinha os cortes antigos (5, 10, 17)
   cravados e teria ficado a responder a escada velha a quem chamasse
   esta função sem o js/state.js carregado. */
function faseDoSlot(slot) {
  if (!slot) return 0;
  if (typeof faseFromNivel !== 'function') return 0;
  return faseFromNivel(slot.nivel || 1);
}

/* ── O QUE SAIU DAQUI NA 3I.12 ──

     raridadeDoSlot          a raridade de um slot, pelo nível dele
     sincronizarRaridade     o único escritor do campo `slot.raridade`
     sincronizarRaridades    o mesmo, para todos os slots

   Os três existiam para manter `slot.raridade` em dia com o nível. O
   campo continua a existir — 33 chamadas ao gerarSVG o leem — mas quem
   o escreve agora é o `rarResolver` (js/raridades.js), no
   carregamento, a partir do mapa que só o servidor escreve. Nenhum
   deles tinha chamador vivo quando saíram. */

/* Pode ser vendido?

   Foi "é Raro ou Lendário", e depois "conquista-se crescendo". Deixa de
   ser sobre raridade: QUALQUER avatar se vende, ao preço em cristais que
   o dono quiser.

   A tranca de raridade era, além do mais, uma tranca de mentira: do lado
   do servidor lia s.raridade, que vem do avatarSlots, que o cliente
   escreve por inteiro (ver api/comprar-avatar.js). Barrava quem jogava
   às direitas e não barrava quem quisesse contornar.

   O que continua a impedir uma venda é o que o servidor sabe: o avatar
   tem de estar vivo, e tem de ter nascido por lá — e essa segunda parte
   só o servidor pode responder. Daqui só se vê a primeira. */
/* ── MORTO E DOENTE NÃO SE VENDEM ──

   Devolve o motivo — 'morto' ou 'doente' — ou nulo quando pode ir ao
   mercado. Doente é ter alguma doença ativa ou estar marcado `sick` (a
   saúde abaixo de 20, que o Medicar resolve). Bicho doente não vai para
   a vitrine: quem compra levava junto uma doença que come a saúde.

   O servidor faz a mesma pergunta ao listar (handleListarAvatar, em
   api/comprar-avatar.js), com o erro AVATAR_DOENTE. */
function motivoSemVenda(slot) {
  if (!slot || slot.dead) return 'morto';
  if (slot.sick || (Array.isArray(slot.activeDiseases) && slot.activeDiseases.length)) return 'doente';
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RARIDADE_GRAU, grauDaRaridade, faseDoSlot, motivoSemVenda };
}
