/* ═══════════════════════════════════════════════════════════════════
   AS ESCOLHAS QUE O SERVIDOR RECONHECE

   Há uma decisão neste jogo que o jogador toma sobre a ficha de
   combate, e só uma: ao chegar a Lendário, o avatar fecha a COSTURA —
   deixa de ter fraqueza elemental — ou ganha uma SEGUNDA VANTAGEM.
   Tudo o mais na ficha é sorteado no nascimento.

   Ela vivia no `avatarSlots`, que o cliente grava por inteiro, e foi
   medido: escrever `'semDefeito'` no slot tirava a fraqueza elemental em
   500 de 500 Lendários. A trava do "escolhe-se uma vez" era
   `if (s.escolhaAnciao) return false` — a ler o próprio campo que o
   cliente escreve, e portanto nenhuma trava: apagá-lo devolvia o
   convite, e escrever o outro valor por cima nem precisava do convite.

   Pior do que escolher mal: dava para escolher DUAS VEZES, uma por
   adversário. `'semDefeito'` contra quem exploraria a costura,
   `'vantagem'` contra os outros.

   A partir daqui existe um mapa `escolhas` no topo do documento, que só
   o servidor escreve (firestore.rules):

     escolhas[idDoAvatar] = { anciao, em }

   anciao   'vantagem' ou 'semDefeito'
   em       quando foi registrada

   ── PORQUE NÃO VAI NA CERTIDÃO ──

   Era o lugar natural: a escolha é permanente, pertence ao avatar e não
   ao dono, e acompanha-o na venda — tudo como o DNA e o seed.

   Mas a certidão tem uma propriedade que vale mais do que essa
   arrumação: ela é escrita UMA VEZ, no nascimento, e o
   registarNascimento recusa a segunda escrita. É isso que faz dela uma
   certidão — "o que se decidiu no dia em que ele nasceu e não se
   reescreve mais", está escrito no js/nascimento.js. A escolha do
   Ancião acontece no nível 27, muito depois; escrevê-la lá dentro
   obrigaria a certidão a aceitar uma escrita posterior, e essa é
   exatamente a garantia que protege o DNA e o seed.

   Então fica num mapa ao lado, no molde do `niveis` e do `vidaAtiva`:
   campo de topo, um escritor só, e a mesma recusa da segunda escrita.

   ── O QUE ISTO FECHA, E FECHA MESMO ──

   Ao contrário do nível e da vida ativa, aqui não há balde nem primeiro
   encontro: o valor não é um número que cresce, é uma decisão que se
   toma uma vez. O servidor aceita a primeira e recusa todas as outras,
   e o cliente não tem como pedir de outra maneira.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

/* Os dois valores, e mais nenhum. É a mesma lista do FICHA_ESCOLHAS
   (js/vantagens-fu.js), repetida aqui porque este arquivo corre no
   servidor e aquele mexe com o catálogo de vantagens — e porque uma
   lista de dois nomes conferida nos dois lados é mais segura do que um
   require a atravessar a fronteira. O tools/ confere que batem. */
const ESCOLHA_ANCIAO_VALIDAS = ['vantagem', 'semDefeito'];

/* O nível a partir do qual ela vale. É o degrau do ANCIÃO — a fase, e
   não a raridade (FU_NIVEL_ANCIAO, em js/ficha-fu.js). Não se muda
   aqui: muda-se lá, e esta linha segue. */
const ESCOLHA_ANCIAO_NIVEL = 27;

function escolhaAnciaoValida(v) {
  return typeof v === 'string' && ESCOLHA_ANCIAO_VALIDAS.indexOf(v) !== -1;
}

/* A escolha que o servidor reconhece para este avatar.

   `escolhas` é o mapa do documento; `id` o avatar. Devolve o valor ou
   null — e NUNCA olha para o slot, que é o ponto de tudo isto. */
function escolhaAnciaoDe(escolhas, id) {
  const r = escolhas && escolhas[id];
  const v = r && r.anciao;
  return escolhaAnciaoValida(v) ? v : null;
}

/* Pode registrar esta escolha?

   `reg` é o que está gravado para o avatar ({anciao, em}) ou nada;
   `pedido` é o valor que o jogo pede; `nivel` é o que o SERVIDOR
   reconhece (o mapa `niveis`), e não o do slot.

   Devolve `{ ok, motivo, reg }`. Um pedido recusado nunca muda nada.

   As cinco perguntas, na ordem em que custam menos a responder:
     · o valor é um dos dois?
     · o avatar é elegível pelo nível?
     · já há escolha registrada?
   As outras duas — o avatar existe e é dele — não se respondem aqui:
   dependem do documento, e quem as faz é o api/pool.js. */
function escolhaAnciaoAceitar(reg, pedido, nivel, agora) {
  if (!escolhaAnciaoValida(pedido)) return { ok: false, motivo: 'VALOR_INVALIDO' };
  if (!(Number(nivel) >= ESCOLHA_ANCIAO_NIVEL)) return { ok: false, motivo: 'NIVEL_BAIXO' };
  /* JÁ ESCOLHEU. Esta é a linha que a versão antiga tinha no cliente, a
     ler um campo que o cliente escrevia. Aqui lê o mapa do servidor, e
     recusa mesmo quando o pedido é o MESMO valor — repetir não é
     inofensivo: um pedido aceito carimbaria uma data nova, e a data é o
     que diz quando a decisão foi tomada. */
  if (reg && escolhaAnciaoValida(reg.anciao)) {
    return { ok: false, motivo: 'JA_ESCOLHEU', reg: reg };
  }
  return { ok: true, reg: { anciao: pedido, em: agora || Date.now() } };
}

/* ══════════════════════════════════════════════════════════════════
   O LADO DO NAVEGADOR

   O que o jogo reconhece, guardado depois de o servidor responder, e
   lido por quem monta a ficha. Mesmo desenho do js/vida-ativa.js.
   ══════════════════════════════════════════════════════════════════ */
let _escolhasConhecidas = {};

/* O mapa inteiro, como vem do documento. Chama-se no carregamento
   (js/firebase.js), antes de alguém montar uma ficha. */
function escolhasCarregar(escolhas) {
  _escolhasConhecidas = {};
  if (!escolhas) return;
  for (const id of Object.keys(escolhas)) {
    const r = escolhas[id];
    if (r && escolhaAnciaoValida(r.anciao)) _escolhasConhecidas[id] = r;
  }
}
function escolhaAnciaoConhecida(id) {
  return escolhaAnciaoDe(_escolhasConhecidas, id);
}
/* Depois de o servidor aceitar uma escolha, o jogo guarda-a sem esperar
   pelo próximo carregamento — senão a ficha ficava a mostrar a antiga
   até o jogador recarregar a página. */
function escolhaAnciaoGuardar(id, reg) {
  if (!id || !reg || !escolhaAnciaoValida(reg.anciao)) return;
  _escolhasConhecidas[id] = reg;
}

/* Pedir a escolha ao servidor. Devolve o registro aceito, ou null.

   Não há fila nem lote, ao contrário do nível e do tempo: isto acontece
   uma vez na vida de um avatar, com o jogador a olhar para a tela. */
async function escolhaAnciaoPedir(id, qual) {
  if (!id || !escolhaAnciaoValida(qual)) return null;
  if (typeof firebase === 'undefined' || !firebase.auth) return null;
  const u = firebase.auth().currentUser;
  if (!u) return null;
  try {
    const idToken = await u.getIdToken();
    const resp = await fetch('/api/pool', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ acao: 'escolha-anciao', idToken: idToken, id: id, qual: qual }),
    });
    const json = await resp.json().catch(function () { return null; });
    if (json && json.ok && json.reg) { escolhaAnciaoGuardar(id, json.reg); return json.reg; }
    return null;
  } catch (e) {
    return null;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ESCOLHA_ANCIAO_VALIDAS, ESCOLHA_ANCIAO_NIVEL,
    escolhaAnciaoValida, escolhaAnciaoDe, escolhaAnciaoAceitar,
  };
}
if (typeof window !== 'undefined') {
  window.escolhaAnciaoValida     = escolhaAnciaoValida;
  window.escolhaAnciaoDe         = escolhaAnciaoDe;
  window.escolhasCarregar        = escolhasCarregar;
  window.escolhaAnciaoConhecida  = escolhaAnciaoConhecida;
  window.escolhaAnciaoGuardar    = escolhaAnciaoGuardar;
  window.escolhaAnciaoPedir      = escolhaAnciaoPedir;
}
