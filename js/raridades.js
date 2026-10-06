/* ═══════════════════════════════════════════════════════════════════
   A RARIDADE QUE O SERVIDOR RECONHECE

   Comum, Raro, Lendário. É o que o avatar CONQUISTOU, e não o que o
   nível dele calhou a valer.

   ── O QUE ESTE ARQUIVO É, E O QUE AINDA NÃO É ──

   É a arquitetura: onde a raridade vive, quem a escreve, como se guarda
   a trajetória, e qual é a única pergunta que o resto do jogo faz.

   E é também a CONQUISTA, desde a etapa 3I.13: o `rarExaminar`, no fim
   deste arquivo, lê os feitos do avatar e diz que certificação eles
   merecem. O cano deixou de estar seco.

   Sem registro no mapa a resposta continua a ser COMUM — era do legado
   por nível até a 3I.12, e o que mudou na 3I.13 não foi isso: foi
   passar a existir uma maneira de SAIR de Comum que não é o nível.

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
   O EXAME — A CONQUISTA

   Três etapas o desenharam, e nenhum número aqui foi escolhido nesta:

     3I.8   a estrutura      docs/exame-de-raridade.md
     3I.10  os números       docs/calibracao-exame-raridade.md
     3I.11  as fórmulas      docs/especificacao-exame-raridade.md

   ── O QUE ELE PERGUNTA ──

     Raro       venceu ao menos uma partida de FILA em 3 meses diferentes
     Lendário   o mesmo em 5 meses, E derrotou 3 PESSOAS diferentes que
                valiam 1150 pontos ou mais no instante da derrota

   ── O QUE ELE NÃO OLHA ──

   Nível, fase, idade, tempo de vida, XP, vínculo, rank atual do avatar,
   rank atual do adversário, taxa de vitória, volume de partidas, PvE,
   amistosas, Feitio, Escola, magia. Nenhum deles aparece em condição
   alguma, e o tools/testar-raridade.js falha se algum aparecer.

   ── PORQUE O CAMINHO DO SUPORTE NÃO ESTÁ AQUI ──

   A etapa 3I.10 mediu 11 400 avatares-partida no motor e encontrou duas
   coisas que o fecham: a cura acumulada tem correlação 0,994 com o
   NÚMERO DE PARTIDAS (é volume, não mérito), e Guarda e Lâmina produzem
   zero cura — o caminho seria exclusivo da Sustentação. Qualquer limiar
   é um portão de feitio ou um concurso de volume. Fica desativado até o
   motor ganhar uma métrica de suporte que seja de intensidade e não de
   quantidade. */

/* Os quatro números. Vêm da calibração, e mudá-los é uma etapa com
   medição — não uma linha. */
const RAR_CICLOS_RARO     = 3;      // ciclos com vitória, para Raro
const RAR_CICLOS_LENDARIO = 5;      // ciclos com vitória, para Lendário
const RAR_FORTES_MIN      = 3;      // adversários distintos qualificados
const RAR_FORTE_PONTOS    = 1150;   // o rank que torna um adversário forte

/* ── A CONTAGEM DOS CICLOS ──

   Um mês conta UMA vez, por mais partidas que tenha tido, e só conta
   com vitória. A chave é a do `pvpTemporada` (js/pvp-rank.js), em UTC,
   e o `feitos` só a escreve para a FILA — a amistosa não abre ciclo.

   Lê o que o `feitoDe` devolve, que já saneou tudo: chave fora do
   formato não chega aqui. */
function _rarCiclosComVitoria(feitos) {
  const c = (feitos && feitos.ciclos && typeof feitos.ciclos === 'object') ? feitos.ciclos : {};
  let n = 0;
  for (const k of Object.keys(c)) {
    const v = c[k] && c[k].v;
    if (Number.isFinite(+v) && +v > 0) n++;
  }
  return n;
}

/* ── A CONTAGEM DOS ADVERSÁRIOS FORTES ──

   PESSOAS distintas, e não avatares: a unidade é o `uid` do jogador.
   Medido na 3I.7 — um cúmplice rodando os dez slots dele valeria por
   dez se fosse por avatar, e vale por um sendo por uid.

   Lê SÓ `pvp.fila.vencidos`. Não lê `melhorAdversario`, e isso é
   normativo: a 3I.8 provou que `melhorAdversario.pontos` é igual ao
   maior dos `vencidos`, logo contá-lo também seria o mesmo fato duas
   vezes. E não lê `pvp.amistosa`, que nem rank tem.

   O `pontos` é o retrato do rank ANTES daquela partida. Nada o
   recalcula, e o rank que o adversário tenha hoje não entra. */
function _rarAdversariosFortes(feitos) {
  const ramo = feitos && feitos.pvp && feitos.pvp.fila;
  const lista = (ramo && Array.isArray(ramo.vencidos)) ? ramo.vencidos : [];
  const vistos = {};
  let n = 0;
  for (const v of lista) {
    if (!v || typeof v !== 'object') continue;
    const uid = typeof v.uid === 'string' ? v.uid : '';
    const pontos = +v.pontos;
    if (!uid || !Number.isFinite(pontos) || pontos < RAR_FORTE_PONTOS) continue;
    if (Object.prototype.hasOwnProperty.call(vistos, uid)) continue;
    vistos[uid] = true;
    n++;
  }
  return n;
}

/* ── O EXAME ──

   PURA: recebe a evidência e devolve o veredito. Não lê o Firestore,
   não escreve nada, não promove ninguém, não sabe que horas são, não
   sabe de que jogador se trata. É de propósito — assim o teste a
   exercita sem servidor, e o servidor a usa sem surpresa.

   `feitos` é o que o `feitoDe` (js/feitos.js) devolve para este avatar.

   Devolve a raridade que a evidência MERECE, que não é a que o avatar
   TEM: comparar as duas é trabalho do `rarCertificar`, abaixo.

   Repare que Lendário NÃO cai para Raro quando lhe faltam adversários:
   cinco ciclos são mais que três, logo quem falha no Lendário por falta
   de adversários fortes merece Raro na mesma. A escada é cumulativa. */
function rarExaminar(feitos) {
  const ciclos = _rarCiclosComVitoria(feitos);
  const fortes = _rarAdversariosFortes(feitos);
  let raridade = RARIDADES[0];
  if (ciclos >= RAR_CICLOS_LENDARIO && fortes >= RAR_FORTES_MIN) raridade = RARIDADES[2];
  else if (ciclos >= RAR_CICLOS_RARO) raridade = RARIDADES[1];
  return {
    raridade,
    elegivel: rarGrau(raridade) > 0,
    ciclosComVitoria: ciclos,
    adversariosFortes: fortes,
    /* O que falta, para quem quiser mostrar na tela. Zero quando já
       chega. Não é critério: é diagnóstico. */
    faltaParaRaro:     Math.max(0, RAR_CICLOS_RARO - ciclos),
    faltaParaLendario: {
      ciclos: Math.max(0, RAR_CICLOS_LENDARIO - ciclos),
      fortes: Math.max(0, RAR_FORTES_MIN - fortes),
    },
  };
}

/* ── A CERTIFICAÇÃO ──

   Junta as duas responsabilidades que ficam separadas de propósito: o
   exame diz o que a evidência MERECE, o `rarPromover` diz se isso pode
   ser gravado. Esta função é só a costura, e continua PURA — devolve o
   registro novo e quem chama é que o grava.

   `reg` é o `raridades[idAvatar]` atual (ou nada); `feitos` é o
   `feitoDe` do mesmo avatar.

   Devolve `{ ok, motivo, de, para, reg, exame }`. Quando `ok` é falso
   não há nada a gravar, e o motivo diz porquê:

     SEM_EVIDENCIA   a evidência não chega nem para Raro
     JA_TEM          já tem essa raridade (não se grava outra vez)
     NAO_DESCE       já tem mais do que a evidência merece

   Os dois últimos vêm do `rarPromover` tal e qual, e é esse o ponto: a
   regra de quem pode subir mora num lugar só.

   ── O SALTO DIRETO ──

   Um Comum que já merece Lendário é promovido a Lendário numa só
   chamada, e o histórico registra um evento: `Comum → Lendário`. Não se
   inventa um degrau por Raro que não aconteceu. */
function rarCertificar(reg, feitos, agora, por) {
  const exame = rarExaminar(feitos);
  if (!exame.elegivel) {
    return { ok: false, motivo: 'SEM_EVIDENCIA', de: rarDeRegistro(reg),
             para: exame.raridade, reg: null, exame };
  }
  const r = rarPromover(reg, exame.raridade, por || RAR_EXAME_POR, agora);
  return { ok: r.ok, motivo: r.motivo || null, de: rarDeRegistro(reg),
           para: exame.raridade, reg: r.reg || null, exame };
}

/* A raridade de um registro solto (sem mapa). O `rarGuardada` pede o
   mapa e o id; aqui já se tem o registro na mão. */
function rarDeRegistro(reg) {
  return (reg && rarValida(reg.atual)) ? reg.atual : RARIDADES[0];
}

/* Quem concedeu. Vai para o histórico, e responde à única pergunta que
   as contagens sozinhas não respondem: por que é que este avatar tem
   esta raridade. Nunca é o uid de quem pediu — o exame não se pede. */
const RAR_EXAME_POR = 'exame-raridade';

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
    rarPromover, rarDe, rarDeRegistro, rarEhLegado, rarResolver,
    rarCarregar, rarMapa,
    RAR_CICLOS_RARO, RAR_CICLOS_LENDARIO, RAR_FORTES_MIN, RAR_FORTE_PONTOS,
    RAR_EXAME_POR, rarExaminar, rarCertificar,
  };
}
