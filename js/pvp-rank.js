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

/* ── AS LUTAS DE COLOCAÇÃO ──

   As primeiras lutas de cada temporada valem o dobro. Sem isto, um
   jogador muito bom que chega agora leva trinta partidas a subir até
   onde merece, e nesse caminho todo esmaga gente que não tinha nada
   que o enfrentar. Com elas, chega perto em dez.

   Medido no tools/simular-rank.js: a ordem da tabela contra a
   habilidade real sobe de 0,85 para 0,90. */
const PVP_RANK_COLOCACAO   = 10;   // quantas lutas
const PVP_RANK_K_COLOCACAO = 48;   // e quanto valem

/* ── AS DIVISÕES ──

   Uma tabela só para todos é injusta quando o pareamento é por PODER
   DE EQUIPA, que é o que a fila faz: quem tem bichos de nível 40 nunca
   encontra quem tem de nível 12, os dois ganham metade das lutas que
   jogam, e os pontos dos dois acabam parecidos sem que nunca se tenham
   medido um contra o outro.

   Medido (tools/simular-rank.js), no caso provável de quem joga melhor
   TAMBÉM ter a melhor equipa: a tabela única põe a ordem certa em 0,51;
   as mesmas lutas, separadas por divisão, dão 0,70 a 0,81.

   As faixas são as FASES do jogo (js/ficha-fu.js: jovem no 5, adulto no
   11, ancião no 27), medidas pelo nível MÉDIO dos três. É o vocabulário
   que o jogador já conhece — ele vê a fase de cada bicho na colónia. */
const PVP_DIVISOES = [
  { id: 'jovem',  ate: 11 },
  { id: 'adulto', ate: 27 },
  { id: 'anciao', ate: Infinity },
];

/* A divisão de uma equipa, pelo nível médio. O `poder` é a soma dos
   níveis dos três (pvpPoder, js/pvp-regras.js). */
function pvpDivisao(poder, quantos) {
  const media = (poder | 0) / Math.max(1, quantos || 3);
  for (const d of PVP_DIVISOES) if (media < d.ate) return d.id;
  return PVP_DIVISOES[PVP_DIVISOES.length - 1].id;
}

/* ── O TETO POR PAR: NO SALDO, E NÃO NA CONTAGEM ──

   Dois combinados podem encontrar-se na fila de propósito — entram ao
   mesmo tempo, com poder parecido — e um entregar vitórias ao outro.
   Medido: vinte lutas combinadas num dia valiam +140 pontos, o
   suficiente para saltar meia tabela.

   A primeira ideia foi contar lutas: três por par por dia pontuavam, o
   resto não. Medido, era mau. Com quarenta pessoas na fila — que é o
   tamanho real disto por muito tempo — toda a gente reencontra toda a
   gente, e o teto por contagem travava 60% das lutas LEGÍTIMAS: jogar e
   não pontuar, sem ter feito nada de errado.

   O que distingue a batota não é jogar muitas vezes com a mesma
   pessoa: é GANHAR sempre dela. Entre dois que jogam a sério, as
   vitórias dividem-se e o saldo do dia anda à volta de zero; quem
   recebe partidas entregues acumula saldo só num sentido.

   Por isso o teto é no saldo: contra a MESMA pessoa, no MESMO dia,
   ganha-se no máximo PVP_RANK_PAR_SALDO pontos líquidos. Chegado lá, as
   vitórias seguintes contra ela valem zero — mas as derrotas continuam
   a custar, senão o teto virava escudo. Quem joga a sério nunca lhe
   toca; quem entrega partidas pára em quarenta pontos por dia. */
const PVP_RANK_PAR_SALDO = 40;

// O saldo de hoje contra esta pessoa.
function pvpParSaldo(registo, dia) {
  const r = registo || {};
  return r.dia === dia ? (r.s | 0) : 0;
}

/* O que sobra de um ganho depois do teto. Perdas passam inteiras. */
function pvpParCortar(delta, registo, dia) {
  if (!(delta > 0)) return delta;
  const espaco = PVP_RANK_PAR_SALDO - pvpParSaldo(registo, dia);
  return Math.max(0, Math.min(delta, espaco));
}

function pvpParSomar(registo, dia, delta) {
  return { dia, s: pvpParSaldo(registo, dia) + (delta | 0), n: ((registo && registo.dia === dia ? registo.n : 0) | 0) + 1 };
}

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
function pvpRankDelta(meus, dele, resultado, k) {
  const s = resultado === 'vitoria' ? 1 : resultado === 'empate' ? 0.5 : 0;
  const d = Math.round((k || PVP_RANK_K) * (s - pvpRankEsperado(meus, dele)));
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
   jogador vê no fim da partida.

   `par` é o registo do dia contra este adversário ({dia, s}) e serve
   para o teto de saldo: passa-se quando a luta é da fila. A luta conta
   sempre como vitória ou derrota — ela aconteceu —, mesmo quando o
   ganho fica cortado. */
function pvpRankSomar(reg, pontosDele, resultado, agora, par, dia) {
  const r = pvpRankAtual(reg, agora);
  const lutas = r.v + r.d + r.e;
  const k = lutas < PVP_RANK_COLOCACAO ? PVP_RANK_K_COLOCACAO : PVP_RANK_K;
  let delta = pvpRankDelta(r.pontos, pontosDele, resultado, k);
  if (par !== undefined && dia) delta = pvpParCortar(delta, par, dia);
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
    PVP_RANK_COLOCACAO, PVP_RANK_K_COLOCACAO, PVP_DIVISOES, PVP_RANK_PAR_SALDO,
    pvpTemporada, pvpRankEsperado, pvpRankDelta, pvpRankAtual, pvpRankSomar,
    pvpDivisao, pvpParSaldo, pvpParCortar, pvpParSomar,
  };
}
