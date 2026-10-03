/* ═══════════════════════════════════════════════════════════════════
   A VIDA ATIVA QUE O SERVIDOR RECONHECE

   O tempo que um avatar viveu de verdade — com a aba aberta, o jogo
   fora de pausa, e ele chocado e vivo. O contador em si já existia e já
   era honesto: o gameTick (js/gametick.js) sai antes de somar quando
   `jogoPausado || document.hidden`, e o setInterval não corre com o
   jogo fechado.

   O que faltava era CONFIANÇA. O número vivia dentro do `avatarSlots`,
   que o cliente grava por inteiro, e isso foi medido: um PATCH punha-o
   em 999 999 999 — 317 anos — e o jogo aceitava. Pela mesma porta
   passavam o nível e a raridade.

   A partir daqui existe um segundo número, num mapa `vidaAtiva` no topo
   do documento, que só o servidor escreve (firestore.rules):

     vidaAtiva[idDoAvatar] = { s, em }

   s    os segundos reconhecidos
   em   quando foram reconhecidos

   Quem decide alguma coisa com a vida ativa lê DAQUI, nunca do slot.

   ── O BALDE É O TEMPO DE PAREDE ──

   O cliente não manda o total: manda quantos segundos acumulou desde o
   último aviso. E o servidor aceita no máximo o que o relógio DELE diz
   que passou, mais uma folga pequena para o jitter da rede.

   Ninguém vive 300 segundos em 60 segundos de relógio. É isto, e só
   isto, que o servidor pode conferir — e vale dizer o que ele NÃO
   pode: distinguir quem jogou uma hora de quem deixou a aba aberta uma
   hora. Para isso o jogo já tem outro número, que é o XP, e que só sobe
   quando alguém faz alguma coisa.

   ── O PRIMEIRO ENCONTRO ──

   Um avatar sem registro entra com o que o slot diz, limitado ao tempo
   de CALENDÁRIO desde que ele nasceu: uma vida ativa maior do que a
   idade do bicho é impossível por construção. É assim que os avatares
   que já existiam entram no sistema sem perder o que viveram.

   E a data vem da CERTIDÃO (`nascidoEm`), que é um campo de topo que só
   o servidor escreve — não do `bornAt` do slot, que o cliente grava.
   Usar o bornAt teve duas consequências, as duas medidas no navegador:
   o teto ficava à mercê de quem ele trava, e um avatar antigo a que
   ninguém tenha gravado o bornAt ainda perdia tudo o que viveu (3.600
   segundos entraram como 51). O bornAt fica como recurso, para quem não
   tiver certidão.

   E é por isso que os que NASCEM a partir de agora são registrados em
   zero pelo próprio servidor (api/pool.js), como já acontece com o
   nível: para nunca haver um primeiro encontro conveniente.

   ── O QUE ISTO NÃO FECHA ──

   Dito com todas as letras, como no `mortos` e no `niveis`: isto
   ESTREITA A PORTA, não a fecha. Quem avisa que viveu é o próprio jogo,
   e o jogo corre no navegador. Quem o modificar pode reclamar o tempo
   que o relógio permite — mas não mais depressa do que o tempo passa, e
   deixando rasto na data de cada aviso.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

/* De quanto em quanto o navegador avisa. Um minuto: é o ciclo do
   gameTick (SEGUNDOS_POR_CICLO, em js/gametick.js), e é o que faz um
   aviso cobrir exatamente um ciclo de todos os avatares. */
const VIDA_AVISO_MS = 60000;

/* A folga do balde, em segundos. Cobre o jitter da rede e o atraso do
   temporizador do navegador, que é estrangulado numa aba de segundo
   plano. Dez segundos por aviso de sessenta é generoso para quem joga e
   não serve de nada a quem quer trapacear: para ganhar uma hora a mais
   seria preciso mandar seiscentos avisos. */
const VIDA_FOLGA_S = 10;

/* O teto de um pedido só. Um cliente honesto manda sessenta; este
   número existe para um pedido absurdo ser cortado antes de entrar na
   conta, e não depois. */
const VIDA_PEDIDO_MAX_S = 3600;

// O tamanho da colônia: o teto de avatares num aviso (MAX_SLOTS).
const VIDA_AVATARES_MAX = 10;

function vidaLimpa(s) {
  const n = Math.floor(Number(s) || 0);
  return n > 0 ? n : 0;
}

/* Quanto o registro pode subir AGORA.

   `reg` é o que está gravado ({s, em}) ou nada; `delta` são os segundos
   que o jogo diz ter acumulado desde o último aviso; `slot` serve só ao
   primeiro encontro, de onde saem o `totalSecs` que ele traz e o
   `bornAt` que o limita.

   Devolve o registro novo e quanto foi aceito. Pedir de mais nunca é
   erro — só não entra tudo.

   NÃO SE USA DATA ENVIADA PELO CLIENTE em lugar nenhum desta conta: o
   `agora` é o relógio de quem chama, que no servidor é o do servidor. */
function vidaAceitar(reg, delta, agora, slot, certidao) {
  agora = agora || Date.now();
  const pedido = Math.min(vidaLimpa(delta), VIDA_PEDIDO_MAX_S);

  // ── o primeiro encontro ──
  if (!reg || typeof reg.s !== 'number') {
    const doSlot = vidaLimpa(slot && slot.totalSecs);
    /* O teto é a idade de calendário, e a data vem da CERTIDÃO — campo
       do servidor. O `bornAt` do slot é o recurso para quem não tiver
       certidão, e vale menos justamente porque o cliente o escreve.
       Sem nenhuma das duas não há com que comparar, e o que o slot diz
       não vale nada: entra em zero. */
    const nascimento = Number((certidao && certidao.nascidoEm)
                              || (certidao && certidao.em)
                              || (slot && slot.bornAt));
    const idade = (nascimento > 0 && nascimento <= agora)
      ? Math.floor((agora - nascimento) / 1000) : 0;
    return { reg: { s: Math.min(doSlot, idade), em: agora }, somou: 0, primeiro: true };
  }

  const s0 = vidaLimpa(reg.s);
  if (pedido <= 0) return { reg: reg, somou: 0, primeiro: false };

  /* O BALDE. Quanto tempo de relógio passou desde o último aviso — e é
     esse o máximo que alguém pode ter vivido nesse intervalo. */
  const desde = Number(reg.em) > 0 ? Number(reg.em) : agora;
  const janela = Math.max(0, Math.floor((agora - desde) / 1000)) + VIDA_FOLGA_S;
  const somou = Math.min(pedido, janela);

  if (somou <= 0) {
    return { reg: { s: s0, em: agora }, somou: 0, primeiro: false, travado: true };
  }
  return { reg: { s: s0 + somou, em: agora }, somou: somou, primeiro: false,
           travado: somou < pedido };
}

/* A vida ativa de um avatar, para quem precisa DECIDIR com ela.

   O registro manda. Sem registro responde-se com o que o slot diz, pela
   mesma razão do nivelDe: recusar-me a responder obrigaria quem chama a
   inventar uma segunda regra. Quem lê assim deve avisar o servidor do
   que viu, para o primeiro encontro acontecer. */
function vidaDe(vidaAtiva, id, slot) {
  const r = vidaAtiva && vidaAtiva[id];
  if (r && typeof r.s === 'number') return vidaLimpa(r.s);
  return vidaLimpa(slot && slot.totalSecs);
}

/* ══════════════════════════════════════════════════════════════════
   AVISAR O SERVIDOR (só no navegador)

   O jogo acumula segundos em memória e manda-os de minuto a minuto. Em
   vez do total, manda o DELTA — e é isso que resolve a perda que a
   auditoria mediu com duas abas: cada aba soma o que ela própria viu, e
   o servidor junta as duas em vez de uma apagar a outra.
   ══════════════════════════════════════════════════════════════════ */
let _vidaFila = {}, _vidaTimer = null;

/* Acumula segundos para um avatar. Chama-se a cada ciclo do gameTick, e
   o envio vai em lote. */
function vidaSomar(id, segundos) {
  if (!id || !(segundos > 0)) return;
  _vidaFila[id] = (_vidaFila[id] || 0) + Math.floor(segundos);
  if (!_vidaTimer) _vidaTimer = setTimeout(vidaEnviar, VIDA_AVISO_MS);
}

/* Manda a fila agora, sem esperar o temporizador. É o que o fechamento
   da aba e a desconexão chamam, para o último minuto não se perder. */
async function vidaEnviar() {
  clearTimeout(_vidaTimer); _vidaTimer = null;
  const fila = _vidaFila; _vidaFila = {};
  const avatares = Object.keys(fila)
    .map(function (id) { return { id: id, segundos: fila[id] }; })
    .filter(function (a) { return a.segundos > 0; })
    .slice(0, VIDA_AVATARES_MAX);
  if (!avatares.length) return null;
  if (typeof firebase === 'undefined' || !firebase.auth) { _vidaDevolver(fila); return null; }
  const u = firebase.auth().currentUser;
  if (!u) { _vidaDevolver(fila); return null; }    // sem sessão: fica para a próxima
  try {
    const idToken = await u.getIdToken();
    const resp = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'vida', idToken: idToken, avatares: avatares }),
    });
    const json = await resp.json().catch(function () { return null; });
    if (json && json.ok) { vidaGuardar(json.vida); return json.vida; }
    _vidaDevolver(fila);
  } catch (e) {
    /* Um erro de rede DEVOLVE a fila: o tempo não se perde, vai no aviso
       seguinte. É o contrário do nivelAvisar, que desiste — ali o número
       é absoluto e o aviso seguinte corrige-o; aqui é um delta, e um
       delta perdido é tempo perdido para sempre. */
    _vidaDevolver(fila);
  }
  return null;
}

function _vidaDevolver(fila) {
  for (const id of Object.keys(fila)) _vidaFila[id] = (_vidaFila[id] || 0) + fila[id];
  if (!_vidaTimer) _vidaTimer = setTimeout(vidaEnviar, VIDA_AVISO_MS);
}

/* O que o servidor reconhece, guardado para a interface mostrar. */
let _vidaConhecida = {};
function vidaGuardar(vida) {
  if (!vida) return;
  for (const id of Object.keys(vida)) {
    if (typeof vida[id] === 'number') _vidaConhecida[id] = vida[id];
  }
}
/* O mapa inteiro, como vem do documento ({s, em} por avatar). Chama-se
   no carregamento (js/firebase.js). */
function vidaCarregar(vidaAtiva) {
  if (!vidaAtiva) return;
  for (const id of Object.keys(vidaAtiva)) {
    const r = vidaAtiva[id];
    if (r && typeof r.s === 'number') _vidaConhecida[id] = r.s;
  }
}
function vidaConhecida(id) {
  return typeof _vidaConhecida[id] === 'number' ? _vidaConhecida[id] : null;
}
/* Quanto está à espera de ser enviado. A interface soma isto ao
   reconhecido, senão o número ficava parado um minuto de cada vez e
   parecia avariado. */
function vidaPendente(id) {
  return _vidaFila[id] || 0;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VIDA_AVISO_MS, VIDA_FOLGA_S, VIDA_PEDIDO_MAX_S, VIDA_AVATARES_MAX,
    vidaLimpa, vidaAceitar, vidaDe,
  };
}
if (typeof window !== 'undefined') {
  window.vidaSomar     = vidaSomar;
  window.vidaEnviar    = vidaEnviar;
  window.vidaGuardar   = vidaGuardar;
  window.vidaCarregar  = vidaCarregar;
  window.vidaConhecida = vidaConhecida;
  window.vidaPendente  = vidaPendente;
  window.vidaDe        = vidaDe;
}
