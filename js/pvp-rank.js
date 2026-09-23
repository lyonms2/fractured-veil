/* ═══════════════════════════════════════════════════════════════════
   O RANK — pontos por temporada

   Decidido pelo dono do jogo em 22/09/2026: "pontos em rank de forma
   justa, para que o jogo seja competitivo" — vitória soma, derrota
   subtrai menos do que a vitória soma, um piso que não deixa zerar, e
   uma temporada que reinicia de tempos em tempos.

   ── O QUE É "DE FORMA JUSTA" ──

   Pontos fixos (+20 por vitória, −10 por derrota) premiam quem joga
   MAIS, e não quem joga melhor: com tempo, qualquer um chega ao topo, e
   ganhar de alguém muito mais fraco vale o mesmo que derrubar o
   primeiro da lista. Num jogo competitivo isso é o fim da tabela.

   Por isso o quanto vale cada luta depende da distância entre os dois:

     · ganhar de quem está MUITO acima vale quase tudo (perto de +24);
     · ganhar de quem está muito abaixo vale quase nada (+1);
     · perder para quem está muito acima quase não custa (−1);
     · perder para quem está abaixo custa caro (perto de −24).

   A conta é a do xadrez (a curva logística de 400 pontos), mas o número
   que aparece é sempre a mesma coisa simples: quantos pontos esta luta
   deu ou tirou. Ninguém precisa de saber a fórmula para entender "+19".

   ── A TEMPORADA ──

   Um mês (UTC). Na virada ninguém recomeça do zero: fica a meio caminho
   entre onde estava e o ponto de partida — quem jogou bem mantém
   metade da vantagem, e quem ficou para trás não arrasta o atraso a
   vida inteira.

   ── ONDE MORA ──

   No documento do jogador, num campo `rank` que só o servidor escreve
   (firestore.rules), e numa cópia em `pvp/rank/{temporada}/{uid}` do
   Realtime Database, que é a tabela que toda a gente lê.

   Só a FILA conta. O desafio de amigo não mexe no rank — foi decidido
   junto com o lobby, em 22/09, e é o que impede dois amigos de
   combinarem uma escada até ao topo.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

const PVP_RANK_INICIO = 1000;  // onde toda a gente começa
const PVP_RANK_PISO   = 800;   // e abaixo do qual não se cai
const PVP_RANK_K      = 24;    // o máximo que uma luta pode valer

// A temporada de um instante: AAAA-MM, em UTC.
function pvpTemporada(ts) {
  const d = new Date(ts || Date.now());
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

// Quanto se espera que eu ganhe contra ele, entre 0 e 1 (a curva do xadrez).
function pvpRankEsperado(meus, dele) {
  return 1 / (1 + Math.pow(10, ((dele || PVP_RANK_INICIO) - (meus || PVP_RANK_INICIO)) / 400));
}

/* O que esta luta vale. `resultado` é o do js/pvp-regras.js
   (pvpResultadoDe); quem desiste conta como derrota — sair a meio não
   pode ser a forma barata de não perder pontos. */
function pvpRankDelta(meus, dele, resultado) {
  const s = resultado === 'vitoria' ? 1 : resultado === 'empate' ? 0.5 : 0;
  const d = Math.round(PVP_RANK_K * (s - pvpRankEsperado(meus, dele)));
  // Uma vitória nunca vale zero, e uma derrota nunca sai de graça.
  if (s === 1) return Math.max(1, d);
  if (s === 0) return Math.min(-1, d);
  return d;
}

/* O registo de um jogador no princípio de uma luta, já com a virada de
   temporada feita (se houver). Aceita não haver registo nenhum. */
function pvpRankAtual(reg, agora) {
  const temporada = pvpTemporada(agora);
  const r = reg || {};
  if (r.temporada === temporada) {
    return { pontos: Math.max(PVP_RANK_PISO, r.pontos | 0 || PVP_RANK_INICIO), temporada,
             v: r.v | 0, d: r.d | 0, e: r.e | 0, melhor: r.melhor | 0 || PVP_RANK_INICIO };
  }
  /* Temporada nova: meio caminho de volta ao princípio. Sem registo
     nenhum, começa-se no princípio. */
  const antes = r.pontos | 0;
  const pontos = antes ? Math.max(PVP_RANK_PISO, PVP_RANK_INICIO + Math.round((antes - PVP_RANK_INICIO) / 2))
                       : PVP_RANK_INICIO;
  return { pontos, temporada, v: 0, d: 0, e: 0, melhor: pontos };
}

/* O registo depois da luta. Devolve também o `delta`, que é o que o
   jogador vê no fim da partida. */
function pvpRankSomar(reg, pontosDele, resultado, agora) {
  const r = pvpRankAtual(reg, agora);
  const delta = pvpRankDelta(r.pontos, pontosDele, resultado);
  const pontos = Math.max(PVP_RANK_PISO, r.pontos + delta);
  return {
    pontos, delta, temporada: r.temporada,
    v: r.v + (resultado === 'vitoria' ? 1 : 0),
    d: r.d + (resultado === 'vitoria' || resultado === 'empate' ? 0 : 1),
    e: r.e + (resultado === 'empate' ? 1 : 0),
    melhor: Math.max(r.melhor, pontos),
    em: agora || Date.now(),
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PVP_RANK_INICIO, PVP_RANK_PISO, PVP_RANK_K,
    pvpTemporada, pvpRankEsperado, pvpRankDelta, pvpRankAtual, pvpRankSomar,
  };
}
