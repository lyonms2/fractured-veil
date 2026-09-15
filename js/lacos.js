/* ═══════════════════════════════════════════════════════════════════
   LAÇOS — o que dois avatares constroem lutando juntos

   Decidido pelo dono do jogo em 14/09/2026:

     · Avatares que terminam uma batalha na mesma equipe ganham pontos
       de laço entre si: 2 pela vitória, 1 pelo empate ou pela derrota.
       No máximo 6 pontos por dia para cada par.
     · Os níveis: ★ com 10 pontos, ★★ com 30, ★★★ com 60. O laço nunca
       diminui, e o laço com um avatar que morreu fica como lembrança.
     · Pais e filhos já nascem com laço ★ (10 pontos).
     · Na batalha, "Lutar pelo Laço": uma vez por batalha, cada avatar
       soma à precisão de uma ação o nível do maior laço com um aliado de
       pé em campo (+1 a +3).
     · O laço é do avatar: acompanha a venda.

   ── QUEM GRAVA ──

   O servidor (acao 'laco' do api/pool.js), num mapa `lacos` no topo do
   documento do jogador, que o cliente não escreve (firestore.rules):

     lacos[idDoAvatar][idDoOutro] = { p, nome, dia, hoje }

   p      os pontos
   nome   o nome do outro na última vez que lutaram juntos, para a ficha
          ter o que mostrar quando ele já não estiver na colônia
   dia    o dia (UTC, AAAA-MM-DD) dos pontos de `hoje`
   hoje   quantos pontos o par já ganhou nesse dia

   Cada lado guarda a sua entrada, e as duas andam juntas enquanto os dois
   são do mesmo dono. Quando um é vendido, a entrada dele vai junto e a do
   outro fica — os dois continuam se lembrando.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

const LACO_NIVEIS   = [10, 30, 60];
const LACO_PONTOS   = { vitoria: 2, empate: 1, derrota: 1 };
const LACO_TETO_DIA = 6;
const LACO_PARENTE  = 10;

function lacoDia(ts) {
  return new Date(ts == null ? Date.now() : ts).toISOString().slice(0, 10);
}

// 0 a 3: quantas estrelas valem estes pontos.
function lacoNivel(pontos) {
  return LACO_NIVEIS.filter(x => (+pontos || 0) >= x).length;
}

// Quantos pontos faltam para a próxima estrela (null no ★★★).
function lacoProximo(pontos) {
  const n = LACO_NIVEIS.find(x => (+pontos || 0) < x);
  return n == null ? null : n;
}

/* Um é mãe ou pai do outro? Lê o que a certidão diz (`mae`, `pai`), que
   é do servidor. Devolve 'pai' (b é pai ou mãe de a), 'filho' (b é filho
   de a) ou null. */
function lacoParentesco(a, b) {
  if (!a || !b || !a.id || !b.id) return null;
  const ma = a.nascimento || {}, mb = b.nascimento || {};
  const paisDeA = [a.mae, a.pai, ma.mae, ma.pai];
  const paisDeB = [b.mae, b.pai, mb.mae, mb.pai];
  if (paisDeA.indexOf(b.id) !== -1) return 'pai';
  if (paisDeB.indexOf(a.id) !== -1) return 'filho';
  return null;
}

// Os pontos de laço de `a` com `b`, já com o piso dos parentes.
function lacoPontosEntre(a, b) {
  if (!a || !b || !a.id || !b.id || a.id === b.id) return 0;
  const e = ((a.lacos || {})[b.id]) || null;
  const p = e ? (+e.p || 0) : 0;
  return lacoParentesco(a, b) ? Math.max(p, LACO_PARENTE) : p;
}

/* Soma uma batalha a uma entrada. Não mexe na entrada recebida: devolve
   { entrada, ganho }. O teto é por dia e por par, e por isso vive na
   entrada. `parentes` aplica o piso de 10. */
function lacoSomarBatalha(entrada, resultado, opcoes) {
  const o = opcoes || {};
  const dia = o.dia || lacoDia(o.agora);
  const e = entrada || {};
  let p = Math.max(+e.p || 0, o.parentes ? LACO_PARENTE : 0);
  const hoje = e.dia === dia ? (+e.hoje || 0) : 0;
  const quer = LACO_PONTOS[resultado] || 0;
  const ganho = Math.max(0, Math.min(quer, LACO_TETO_DIA - hoje));
  p += ganho;
  return {
    entrada: { p, nome: o.nome != null ? o.nome : (e.nome || null), dia, hoje: hoje + ganho },
    ganho,
  };
}

/* Para a batalha: o nível do laço de cada um da equipe com cada um dos
   outros, por posição. [ {1: 2, 2: 0}, {0: 2, 2: 1}, ... ] — só entram os
   que têm pelo menos ★. */
function lacoNiveisDaEquipa(equipa) {
  return (equipa || []).map((a, i) => {
    const m = {};
    (equipa || []).forEach((b, j) => {
      if (i === j) return;
      const n = lacoNivel(lacoPontosEntre(a, b));
      if (n > 0) m[j] = n;
    });
    return m;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LACO_NIVEIS, LACO_PONTOS, LACO_TETO_DIA, LACO_PARENTE,
    lacoDia, lacoNivel, lacoProximo, lacoParentesco, lacoPontosEntre,
    lacoSomarBatalha, lacoNiveisDaEquipa,
  };
}
