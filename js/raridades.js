/* ═══════════════════════════════════════════════════════════════════
   A RARIDADE QUE O SERVIDOR RECONHECE

   Comum, Raro, Lendário. É o que o avatar CONQUISTOU, e não o que o
   nível dele calhou a valer.

   ── O QUE ESTE ARQUIVO É, E O QUE AINDA NÃO É ──

   É a arquitetura: onde a raridade vive, quem a escreve, como se guarda
   a trajetória, e qual é a única pergunta que o resto do jogo faz.

   NÃO é a conquista. O exame que promove Comum → Raro → Lendário é uma
   etapa própria e ainda não existe. Enquanto ele não existir, a
   resposta é COMUM, e era do legado por nível até a 3I.12 — o que
   está marcado como tal nos dois lugares e sai quando o exame entrar.

   Dito de outra maneira: o cano está montado e seco. Quando o exame
   chegar, ele escreve aqui e mais nada muda — nem o histórico, nem a
   persistência, nem a autoridade, nem o mercado, nem o desenho.

   ── ONDE ELA VIVE ──

   Num mapa de topo do documento, que só o servidor escreve
   (firestore.rules):

     raridades[idDoAvatar] = {
       atual:     'Raro',
       historico: [ { para: 'Raro', em: 1730000000000, por: 'exame-maio' } ]
     }

   ── PORQUE NÃO FICA NO avatarSlots ──

   Pela razão de sempre: o cliente grava esse array por inteiro. Hoje
   isso não dava poder nenhum — a ficha de combate ignora o campo
   `slot.raridade` e calcula a sua (medido na etapa 3H: forjar
   'Lendário' num avatar de nível 1 não mexeu um ponto de vida). Mas no
   dia em que a raridade passar a ser guardada, o campo que o cliente
   escreve passaria a dar +80 PV, +2 de Defesa, +7 de dano, as magias do
   Lendário e o corpo com asas.

   A blindagem tem de existir ANTES da conquista, e não depois.

   ── PORQUE NÃO VAI NA CERTIDÃO ──

   A mesma razão do js/escolhas.js: a certidão escreve-se uma vez, no
   nascimento, e o registarNascimento recusa a segunda escrita. É isso
   que faz dela uma certidão. A raridade muda ao longo da vida — é o
   oposto.

   ── O HISTÓRICO ──

   A raridade é uma conquista, e uma conquista sem data não é uma
   conquista: é um campo. O mapa guarda a trajetória inteira, e o
   `rarPromover` nunca a apaga — só acrescenta.

     Nascimento      → Comum
     Exame de maio   → Raro
     Exame de agosto → Lendário

   O estado atual é Lendário, e as três linhas continuam lá.

   ── E NUNCA DESCE ──

   O que se conquista fica. O `rarPromover` recusa uma descida e recusa
   também o valor igual, pela mesma razão do js/escolhas.js: um pedido
   aceito carimbaria uma data nova, e a data é o que diz quando a
   conquista aconteceu.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

/* Os três valores, e mais nenhum, na ordem em que se sobem.

   A lista está escrita aqui e também no js/ficha-fu.js (FU_RARIDADES),
   pela mesma razão que o ESCOLHA_ANCIAO_VALIDAS está em dois lugares:
   este arquivo corre no servidor e aquele é o motor. O
   tools/testar-raridade.js confere que batem. */
const RARIDADES = ['Comum', 'Raro', 'Lendário'];

/* Quantos degraus acima do Comum. É este número que o desenho lê para
   saber que partes do corpo já se vêem (js/data.js). */
function rarGrau(raridade) {
  const i = RARIDADES.indexOf(raridade);
  return i === -1 ? 0 : i;
}

function rarValida(v) {
  return typeof v === 'string' && RARIDADES.indexOf(v) !== -1;
}

/* ── A LEITURA DO MAPA ──

   `mapa` é o `raridades` do documento; `id` o avatar. Devolvem o que
   está GRAVADO, e nunca olham para o slot — que é o ponto de tudo isto.
   Sem registro devolvem null e lista vazia: quem precisa de uma
   resposta mesmo assim chama o `rarDe`, abaixo, que é onde o recuo
   legado está escrito com todas as letras. */
function rarRegistro(mapa, id) {
  const r = mapa && id && mapa[id];
  return (r && typeof r === 'object') ? r : null;
}

function rarGuardada(mapa, id) {
  const r = rarRegistro(mapa, id);
  return (r && rarValida(r.atual)) ? r.atual : null;
}

function rarHistorico(mapa, id) {
  const r = rarRegistro(mapa, id);
  return (r && Array.isArray(r.historico)) ? r.historico : [];
}

/* ── A PROMOÇÃO ──

   `reg` é o que está gravado ({atual, historico}) ou nada; `para` é a
   raridade pedida; `por` é o que a justifica — o nome do exame, quando
   ele existir.

   Devolve `{ ok, motivo, reg }`. Um pedido recusado nunca muda nada, e
   o `reg` devolvido é SEMPRE um objeto novo: mutar o mapa aqui dentro
   faria uma recusa deixar rasto.

   As perguntas, na ordem em que custam menos a responder:
     · o valor é um dos três?
     · sobe mesmo? (igual e abaixo recusam-se)

   As outras — o avatar existe, é dele, e cumpriu o exame — não se
   respondem aqui: dependem do documento e do exame, e quem as fará é o
   servidor. Esta função é a regra, e só a regra. */
function rarPromover(reg, para, por, agora) {
  if (!rarValida(para)) return { ok: false, motivo: 'VALOR_INVALIDO' };
  const atual = (reg && rarValida(reg.atual)) ? reg.atual : RARIDADES[0];
  if (rarGrau(para) <= rarGrau(atual)) {
    return { ok: false, motivo: rarGrau(para) === rarGrau(atual) ? 'JA_TEM' : 'NAO_DESCE' };
  }
  const hist = (reg && Array.isArray(reg.historico)) ? reg.historico.slice() : [];
  hist.push({ para: para, em: agora || Date.now(), por: por || null });
  return { ok: true, reg: { atual: para, historico: hist } };
}

/* ── A FONTE ÚNICA ──

   É esta a pergunta que o jogo inteiro faz, e não há outra: a ficha de
   combate, o desenho do corpo, a tarja do mercado e o preço vêm todos
   daqui. Uma segunda fonte é uma divergência à espera de acontecer — e
   a etapa 3H mediu uma que já existia: 33 chamadas ao `gerarSVG`
   passavam o `slot.raridade`, que o cliente grava, enquanto a ficha
   calculava a dela. Um avatar de nível 1 desenhava-se Lendário.

   `legado` é a resposta do sistema antigo, e quem chama é que a
   calcula — este arquivo não sabe o que é um nível.

   ── A ORDEM ──

     1. o que o servidor reconhece   (o mapa `raridades`)
     2. Comum

   O passo 2 é TEMPORÁRIO e sai quando o exame entrar. Até lá ele é o
   único que responde, porque ninguém escreve no mapa ainda — e é de
   propósito: a etapa 3H montou a arquitetura e deixou a conquista para
   a etapa do exame, para não inventar critérios por conta própria. */
function rarDe(mapa, id) {
  return rarGuardada(mapa, id) || RARIDADES[0];
}

/* Veio do legado? Serve aos testes e à interface do dia em que o exame
   existir — um avatar sem registro é um avatar que nunca fez exame. */
function rarEhLegado(mapa, id) {
  return rarGuardada(mapa, id) === null;
}

/* ── A RESOLUÇÃO NUM SLOT ──

   Põe no slot os dois campos, e é a ÚNICA função que os escreve:

     raridadeReconhecida   o que o servidor reconhece, ou nada. Não é
                           gravado pelo save (js/firebase.js) e por isso
                           não sobrevive a uma ida ao Firestore: existe
                           só em memória, escrito aqui a cada
                           carregamento. É o que a ficha de combate lê
                           (fuRaridadeDa, em js/ficha-fu.js).

     raridade              o espelho que o desenho lê — 33 chamadas ao
                           gerarSVG. Recebe a MESMA resposta que a
                           ficha, e é isso que mata a segunda fonte de
                           verdade que a etapa 3H mediu.

   Esta função existe para o carregamento e o teste exercitarem O MESMO
   CÓDIGO. A primeira versão do tools/testar-raridade.js reimplementava
   isto por dentro, e com isso quebrar o carregamento não fazia teste
   nenhum falhar: três mutações passaram incólumes. Um teste que copia a
   lógica em vez de a chamar não testa nada. */
function rarResolver(mapa, slot) {
  if (!slot || typeof slot !== 'object') return slot;
  const g = rarGuardada(mapa, slot.id);
  if (g) slot.raridadeReconhecida = g;
  else delete slot.raridadeReconhecida;
  slot.raridade = rarDe(mapa, slot.id);
  return slot;
}

/* ═══════════════════════════════════════════════════════════════════
   O LADO DO NAVEGADOR

   O mapa que o servidor mandou, guardado depois do carregamento e lido
   por quem monta o slot. Mesmo desenho do js/escolhas.js e do
   js/vida-ativa.js.
   ═══════════════════════════════════════════════════════════════════ */
let _rarMapa = {};

function rarCarregar(mapa) {
  _rarMapa = (mapa && typeof mapa === 'object') ? mapa : {};
}

function rarMapa() { return _rarMapa; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RARIDADES, rarGrau, rarValida,
    rarRegistro, rarGuardada, rarHistorico,
    rarPromover, rarDe, rarEhLegado, rarResolver,
    rarCarregar, rarMapa,
  };
}
