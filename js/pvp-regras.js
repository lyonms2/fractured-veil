// ═══════════════════════════════════════════════════════════════════
// AS REGRAS DO PVP — o que o navegador e o servidor contam igual
//
// Este arquivo não toca na tela nem no banco. Diz só três coisas:
//
//   · quem pode entrar em campo (o mesmo que o PvE pede, conferido de
//     novo no servidor, com a certidão dele e não com o slot do cliente)
//   · quanto a fila aceita de diferença de poder, conforme a espera
//   · quem forma par com quem
//
// O api/pvp.js carrega-o pelo require, o navegador pelo <script>. Duas
// cópias destas contas acabariam por discordar, e a primeira pessoa a
// dar por isso seria alguém que via "76–92" na tela e era pareado com
// um 110.
// ═══════════════════════════════════════════════════════════════════

const PVP_EQUIPA = 3;

/* ── A JANELA DA FILA ──
   Começa em ±10% do poder da equipe (o número do desenho do combate) e
   abre 5 pontos a cada 15 s de espera, até ±40%. Uma fila vazia de
   madrugada não pode deixar ninguém esperando para sempre, e uma cheia
   não precisa abrir nada: o par justo aparece logo. */
const PVP_JANELA_INICIAL = 0.10;
const PVP_JANELA_PASSO   = 0.05;
const PVP_JANELA_CADA_MS = 15000;
const PVP_JANELA_MAX     = 0.40;

// O convite de um amigo vale 30 s.
const PVP_CONVITE_MS = 30000;

/* ── ESTAR ONLINE ──
   A presença (pvp/online) renova-se a cada 30 s, e some sozinha quando a
   conexão cai (onDisconnect). Quem ficou 90 s sem sinal — um navegador
   que travou sem desconectar direito — conta como fora do ar. */
const PVP_SINAL_MS  = 30000;
const PVP_ONLINE_MS = 90000;

// A tela do versus, entre o par formado e a luta.
const PVP_VERSUS_MS = 7000;

// Quem esperou na fila sem dar sinal ao servidor por 20 s saiu dela.
const PVP_FILA_SINAL_MS = 20000;

/* ── A RESERVA ──
   Formar par é travar duas entradas da fila (api/pvp.js). Uma trava
   largada por um servidor que caiu no meio vence sozinha em 10 s, e a
   entrada volta a estar livre. */
const PVP_RESERVA_MS = 10000;

function pvpReservada(entrada, agora, por) {
  const r = entrada && entrada.res;
  return !!(r && r.por !== por && agora - (r.em || 0) < PVP_RESERVA_MS);
}

function pvpJanela(esperaMs) {
  const passos = Math.floor(Math.max(0, esperaMs | 0) / PVP_JANELA_CADA_MS);
  return Math.min(PVP_JANELA_MAX, PVP_JANELA_INICIAL + passos * PVP_JANELA_PASSO);
}

/* A faixa que a tela mostra: "aceitando 76–92". É a MESMA conta do par,
   vista de um lado só — o outro também abre a janela dele, e o par vale
   com a maior das duas (pvpCompativeis). */
function pvpFaixa(poder, esperaMs) {
  /* |p − q| ≤ j·max(p, q): abaixo, q ≥ p·(1 − j); acima, q ≤ p ÷ (1 − j).
     Uma pitada de folga no arredondamento, para a tela nunca prometer
     um número que o par recusaria por um centésimo. */
  const j = pvpJanela(esperaMs);
  return [Math.max(1, Math.ceil(poder * (1 - j) - 1e-9)), Math.floor(poder / (1 - j) + 1e-9)];
}

/* Dois da fila formam par? A diferença de poder cabe na maior das duas
   janelas, medida sobre o maior dos dois. Sobre o maior e não sobre a
   média: assim a faixa da tela (pvpFaixa) diz exatamente a verdade. */
function pvpCompativeis(a, b, agora) {
  if (!a || !b) return false;
  const pa = a.poder | 0, pb = b.poder | 0;
  if (pa <= 0 || pb <= 0) return false;
  const j = Math.max(pvpJanela(agora - (a.desde || agora)), pvpJanela(agora - (b.desde || agora)));
  return Math.abs(pa - pb) <= j * Math.max(pa, pb) + 1e-9;
}

/* O melhor par para `uid` na fila: o de poder mais próximo e, empatado,
   o que espera há mais tempo. `fila` é { uid: { poder, desde, sinal } }.
   Quem está sem sinal há mais de PVP_FILA_SINAL_MS não conta — fechou a
   aba sem sair da fila. */
function pvpEscolherPar(uid, fila, agora) {
  const eu = fila && fila[uid];
  if (!eu) return null;
  let melhor = null, melhorDif = Infinity, melhorDesde = Infinity;
  for (const outro of Object.keys(fila)) {
    if (outro === uid) continue;
    const o = fila[outro];
    if (!o || !(o.poder > 0) || agora - (o.sinal || o.desde || 0) > PVP_FILA_SINAL_MS) continue;
    if (pvpReservada(o, agora, uid)) continue;
    if (!pvpCompativeis(eu, o, agora)) continue;
    const dif = Math.abs((eu.poder | 0) - (o.poder | 0));
    const desde = o.desde || agora;
    if (dif < melhorDif || (dif === melhorDif && desde < melhorDesde)) {
      melhor = outro; melhorDif = dif; melhorDesde = desde;
    }
  }
  return melhor;
}

/* ── QUEM PODE ENTRAR EM CAMPO ──
   As mesmas perguntas do PvE (_pveImpedimentoDe), menos a doença e a
   energia, que vivem no save do cliente e o servidor não tem como
   conferir de verdade — essas o navegador pergunta antes de chamar.
   Aqui o que se confere é o que o servidor SABE: a certidão (que só ele
   grava), os mortos, e o slot como está no banco.

   Devolve o motivo, ou null se pode. */
function pvpMotivoMembro(slot, certidao, morto) {
  if (!slot || !slot.id) return 'vazio';
  if (!slot.hatched || slot.pendingEgg) return 'ovo';
  if (slot.dead || morto) return 'morto';
  if (slot.listed) return 'a_venda';
  if (!certidao) return 'sem_certidao';
  if (!(typeof slot.nome === 'string' && slot.nome.split(',')[0].trim())) return 'sem_nome';
  if (typeof ehBebe === 'function' && ehBebe(slot)) return 'bebe';
  return null;
}

/* O retrato de um avatar como ele entra na sala: o que a ficha lê
   (js/ficha-fu.js) e o que o desenho lê (gerarSVG). O DNA vem da
   CERTIDÃO, nunca do slot. O nível ainda vem do slot — ver a nota no
   api/pvp.js sobre isso. */
function pvpRetrato(slot, certidao) {
  const r = {
    id: slot.id,
    nome: String(slot.nome || '').slice(0, 60),
    nivel: Math.max(1, slot.nivel | 0 || 1),
    seed: slot.seed | 0,
    raridade: slot.raridade || null,
    nascimento: certidao,
  };
  if (slot.escolhaAnciao) r.escolhaAnciao = slot.escolhaAnciao;
  return r;
}

function pvpPoder(retratos) {
  return (retratos || []).reduce((t, r) => t + Math.max(1, r.nivel | 0), 0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PVP_EQUIPA, PVP_JANELA_INICIAL, PVP_JANELA_PASSO, PVP_JANELA_CADA_MS, PVP_JANELA_MAX,
    PVP_CONVITE_MS, PVP_SINAL_MS, PVP_ONLINE_MS, PVP_VERSUS_MS, PVP_FILA_SINAL_MS, PVP_RESERVA_MS,
    pvpReservada, pvpJanela, pvpFaixa, pvpCompativeis, pvpEscolherPar, pvpMotivoMembro, pvpRetrato, pvpPoder,
  };
}
