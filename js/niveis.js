/* ═══════════════════════════════════════════════════════════════════
   O NÍVEL QUE O SERVIDOR RECONHECE

   O nível de um avatar vive no `avatarSlots`, que o cliente grava por
   inteiro. Uma linha no console punha um bicho recém-nascido no nível
   60 — e no PvP, onde o nível decide a luta, isso é a diferença entre
   um jogo competitivo e um jogo que não vale a pena jogar.

   A partir daqui existe um segundo número, num mapa `niveis` no topo do
   documento, que só o servidor escreve (firestore.rules):

     niveis[idDoAvatar] = { n, em, cred }

   n      o nível reconhecido
   em     quando foi reconhecido
   cred   quantos degraus ainda pode subir já (ver o balde, abaixo)

   O PvP lê DAQUI, nunca do slot. Quem quiser chegar ao 60 sem jogar
   tem de subir degrau a degrau, no ritmo de quem joga, e cada degrau
   fica gravado com a hora.

   ── O BALDE ──

   Cada avatar tem um crédito de degraus que enche com o tempo: doze por
   hora até o nível 11 (o começo é barato e o bebê cresce de ser
   cuidado) e seis por hora daí em diante, com o balde cheio em doze.
   Cada subida gasta um. Quem joga de verdade nunca encosta nisto: do
   nível 11 para cima cada degrau custa milhares de XP.

   ── O QUE ISTO NÃO FECHA ──

   Dito com todas as letras, como no `mortos` do firestore.rules: isto
   ESTREITA A PORTA, não a fecha. Quem avisa que subiu é o próprio jogo,
   e o PvE corre no navegador. Quem modificar o jogo pode pedir degraus
   que não ganhou — mas não mais depressa do que um jogador ganha, e
   deixando rasto. Fechar de vez é conferir o PvE no servidor, como o
   PvP já é conferido.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

const NIVEL_MAXIMO      = 60;   // o fim da escada (FU_NIVEL_MAX)
const NIVEL_RITMO_CEDO  = 12;   // degraus por hora até o nível 11
const NIVEL_RITMO_TARDE = 6;    // …e daí para cima
const NIVEL_BALDE       = 12;   // o que o crédito acumula, no máximo
const NIVEL_CEDO_ATE    = 11;   // onde o ritmo muda (FU_NIVEL_RARO)

function nivelRitmo(n) {
  return n < NIVEL_CEDO_ATE ? NIVEL_RITMO_CEDO : NIVEL_RITMO_TARDE;
}

function nivelLimpo(n) {
  n = Math.floor(Number(n) || 1);
  return Math.min(NIVEL_MAXIMO, Math.max(1, n));
}

/* Quanto o registro pode subir AGORA.

   `reg` é o que está gravado ({n, em, cred}) ou nada, e `pedido` é o
   nível que o jogo diz que o avatar tem. Devolve o registro novo e
   quantos degraus foram aceitos — o chamador grava e segue em frente:
   pedir de mais nunca é erro, só não sobe tudo de uma vez.

   Sem registro é o primeiro encontro: aceita-se o que o jogo diz. É
   assim que os avatares que já existiam entram no sistema, e é por isso
   que os que NASCEM a partir de agora são registrados no nível 1 pelo
   próprio servidor (api/pool.js) — para nunca haver um primeiro
   encontro conveniente. */
function nivelAceitar(reg, pedido, agora) {
  agora  = agora || Date.now();
  pedido = nivelLimpo(pedido);

  if (!reg || !(reg.n > 0)) {
    return { reg: { n: pedido, em: agora, cred: NIVEL_BALDE }, subiu: 0, primeiro: true };
  }
  const n0 = nivelLimpo(reg.n);
  if (pedido <= n0) return { reg: reg, subiu: 0, primeiro: false };

  const horas = Math.max(0, (agora - (reg.em || agora)) / 3600000);
  const cred  = Math.min(NIVEL_BALDE,
                         (typeof reg.cred === 'number' ? reg.cred : NIVEL_BALDE) + nivelRitmo(n0) * horas);
  const subiu = Math.min(pedido - n0, Math.floor(cred));
  if (subiu <= 0) return { reg: { n: n0, em: agora, cred: cred }, subiu: 0, primeiro: false, travado: true };

  return { reg: { n: n0 + subiu, em: agora, cred: cred - subiu }, subiu: subiu, primeiro: false };
}

/* O nível de um avatar para quem precisa DECIDIR com ele (o PvP). O
   registro manda; sem registro, o que o slot diz — e quem lê assim
   deve registrar o que viu, para não ficar a perguntar sempre. */
function nivelDe(niveis, id, slot) {
  const r = niveis && niveis[id];
  if (r && r.n > 0) return nivelLimpo(r.n);
  return nivelLimpo(slot && slot.nivel);
}

/* ── AVISAR O SERVIDOR (só no navegador) ──

   Subir de nível acontece em dois sítios (o checkXP do js/gametick.js,
   para quem está aberto na tela de cuidar, e o _pvePremiarAvatar do
   js/pve-fu.js, para os outros), e às vezes vários avatares sobem na
   mesma batalha. Junta-se tudo e manda-se um pedido só.

   Não se espera pela resposta nem se tenta de novo: um erro de rede
   deixa o registo para trás, e quem o apanha é a reconciliação de
   quando se abre o PvP (nivelAvisarTodos) — que é onde o número
   importa. */
let _nivelFila = {}, _nivelTimer = null;

function nivelAvisar(id, nivel) {
  if (!id || !(nivel > 0)) return;
  _nivelFila[id] = Math.max(_nivelFila[id] || 0, nivelLimpo(nivel));
  clearTimeout(_nivelTimer);
  _nivelTimer = setTimeout(_nivelEnviar, 1500);
}

/* Todos os que estão na colônia, de uma vez: cobre as subidas cujo aviso
   se perdeu. Dez é o tamanho da colônia e o teto do pedido. */
function nivelAvisarTodos() {
  if (typeof avatarSlots === 'undefined') return;
  avatarSlots.slice(0, 10).forEach(s => {
    if (s && s.id && s.hatched && !s.dead) nivelAvisar(s.id, s.nivel || 1);
  });
}

async function _nivelEnviar() {
  const fila = _nivelFila; _nivelFila = {};
  const avatares = Object.keys(fila).map(id => ({ id, nivel: fila[id] })).slice(0, 10);
  if (!avatares.length) return;
  if (typeof firebase === 'undefined' || !firebase.auth) return;
  const u = firebase.auth().currentUser;
  if (!u) return;
  try {
    const idToken = await u.getIdToken();
    await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'nivel', idToken, avatares }),
    });
  } catch (e) { /* fica para a próxima */ }
}

if (typeof window !== 'undefined') {
  window.nivelAvisar      = nivelAvisar;
  window.nivelAvisarTodos = nivelAvisarTodos;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NIVEL_MAXIMO, NIVEL_RITMO_CEDO, NIVEL_RITMO_TARDE, NIVEL_BALDE, NIVEL_CEDO_ATE,
    nivelRitmo, nivelLimpo, nivelAceitar, nivelDe,
  };
}
