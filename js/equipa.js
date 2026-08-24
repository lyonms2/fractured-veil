// ═══════════════════════════════════════════════════════════════════
// A EQUIPE DE BATALHA — quais 3 avatares entram
//
// Estava dentro de js/combate-ficha.js, que era o sistema de combate
// antigo. O sistema antigo foi todo apagado quando o 3D&T o substituiu;
// só esta parte sobreviveu, porque escolher a equipe não tem nada a ver
// com as regras de combate — é gestão de slots, e continua igual seja
// qual for o motor por baixo.
//
// A escolha vive em gs.equipa e vai no save normal do jogo.
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
