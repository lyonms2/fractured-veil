#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A FRONTEIRA ENTRE O CLIENTE E O SERVIDOR

     node tools/testar-persistencia.js

   Só as regras e a fronteira declarada: corre sem nada no ar. A metade
   que precisa dos emuladores — o cliente a escrever de verdade, pelas
   regras de verdade — vive no tools/testar-vida-servidor.js.

   ── PORQUE ESTE ARQUIVO EXISTE ──

   O `avatarSlots` é gravado pelo cliente POR INTEIRO, e as regras do
   Firestore não sabem percorrer arrays — não há como escrever "o
   cliente não mexe no totalSecs de nenhum slot". Foi medido, com as
   regras reais carregadas: um PATCH punha o `totalSecs` em 999 999 999
   (317 anos), o `nivel` em 60 e a `raridade` em Lendário, e os três
   gravavam.

   A resposta do projeto para isto nunca foi tentar proibir a escrita.
   Foi tirar a AUTORIDADE do slot: o número que decide vive num mapa no
   topo do documento, que só o servidor escreve. Já era assim para a
   certidão, para os ovos, para os mortos, para os laços e para o nível.
   Agora é assim para a vida ativa.

   ── O QUE "DEVE FALHAR" QUER DIZER AQUI ──

   Não quer dizer HTTP 403. O PATCH continua a ser aceito — e tem de
   ser, porque é por ele que o jogo grava o resto do estado. O que se
   confere é que a ESCRITA NÃO TEM EFEITO: o número que o jogo usa para
   decidir não se move.

   É a mesma garantia que o `niveis` já dava, e está dita com as mesmas
   palavras no js/niveis.js: isto estreita a porta, não a fecha.
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const VIDA = require(path.join(__dirname, '..', 'js', 'vida-ativa.js'));

let passaram = 0;
const falhas = [];
const ok = (nome, cond, detalhe) => {
  if (cond) { passaram++; return; }
  falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + detalhe : ''));
};
const igual = (nome, obtido, esperado) =>
  ok(nome, obtido === esperado, `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`);
const titulo = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 56 - t.length)));

const S = 1000, M = 60 * S, H = 60 * M;
const T0 = 1800 * H;   // uma data qualquer, longe de zero

/* ═══ 1 · O BALDE ═══════════════════════════════════════════════════
   O coração da garantia: o servidor aceita no máximo o tempo que o
   relógio DELE diz que passou. É o que torna um delta conferível e um
   total não conferível. */
titulo('O balde: ninguém vive mais do que o tempo passa');
{
  const reg = { s: 1000, em: T0 };

  // honesto: um minuto de jogo, um minuto de relógio
  let r = VIDA.vidaAceitar(reg, 60, T0 + 60 * S);
  igual('60 s pedidos em 60 s de relógio', r.somou, 60);
  igual('e o registro fica em 1060', r.reg.s, 1060);
  ok('não ficou travado', !r.travado);

  // o pedido absurdo
  r = VIDA.vidaAceitar(reg, 999999999, T0 + 60 * S);
  igual('317 anos pedidos em 60 s: entra o que cabe', r.somou, 60 + VIDA.VIDA_FOLGA_S);
  ok('e fica marcado como travado', !!r.travado);

  // pedir dez vezes seguidas não multiplica: cada aceite reinicia a janela
  let acc = { s: 0, em: T0 };
  for (let i = 0; i < 10; i++) {
    acc = VIDA.vidaAceitar(acc, 3600, T0 + 60 * S).reg;   // o MESMO instante
  }
  ok('dez pedidos no mesmo instante não acumulam',
     acc.s <= 60 + VIDA.VIDA_FOLGA_S + 10 * VIDA.VIDA_FOLGA_S,
     'deu ' + acc.s);

  // o teto por pedido corta antes da conta
  r = VIDA.vidaAceitar({ s: 0, em: T0 }, 99999, T0 + 10 * H);
  ok('o teto por pedido corta um pedido gigante',
     r.somou <= VIDA.VIDA_PEDIDO_MAX_S, 'deu ' + r.somou);

  // nada de datas do cliente: a conta usa só o `agora` de quem chama
  igual('um delta negativo não tira tempo',
        VIDA.vidaAceitar({ s: 500, em: T0 }, -9999, T0 + M).reg.s, 500);
  igual('um delta de texto não vale nada',
        VIDA.vidaAceitar({ s: 500, em: T0 }, 'muito', T0 + M).reg.s, 500);
  igual('e nem um delta zero mexe na data',
        VIDA.vidaAceitar({ s: 500, em: T0 }, 0, T0 + M).reg.em, T0);
}

/* ═══ 2 · O PRIMEIRO ENCONTRO ═══════════════════════════════════════
   É a única porta por onde um número vindo do cliente entra — e existe
   só para os avatares que já andavam por aí. O teto é a idade de
   calendário: uma vida ativa maior do que a idade do bicho é impossível. */
titulo('O primeiro encontro, e o teto da idade');
{
  const cert = ms => ({ nascidoEm: ms });

  // o caso honesto: nasceu há 10 h, viveu 5 h
  let r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 5 * 3600 }, cert(T0 - 10 * H));
  igual('nasceu há 10 h e diz 5 h: entra 5 h', r.reg.s, 5 * 3600);
  ok('e fica marcado como primeiro', !!r.primeiro);

  // a mentira: diz 317 anos, nasceu há 10 h
  r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 999999999 }, cert(T0 - 10 * H));
  igual('nasceu há 10 h e diz 317 anos: entra 10 h', r.reg.s, 10 * 3600);

  /* A DATA VEM DA CERTIDÃO, não do slot. Isto é a diferença que
     importa: a certidão é um campo de topo que só o servidor escreve, e
     o bornAt do slot é gravado pelo cliente. Com o bornAt a mandar, o
     teto ficava à mercê de quem ele trava. */
  r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 999999999, bornAt: T0 - 1 },
                       cert(T0 - 2 * H));
  igual('a certidão manda, e não o bornAt do slot', r.reg.s, 2 * 3600);

  /* E o bornAt fica como RECURSO, para um slot sem certidão. Foi medido
     no navegador: um avatar com 3.600 s cujo bornAt acabava de ser
     gravado entrava com 51 s. A certidão resolve isso. */
  r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 7200, bornAt: T0 - 10 * H }, null);
  igual('sem certidão, o bornAt serve de recurso', r.reg.s, 7200);

  igual('sem data nenhuma, o que o slot diz não vale nada',
        VIDA.vidaAceitar(null, 0, T0, { totalSecs: 999999 }).reg.s, 0);
  igual('uma data no futuro também não vale',
        VIDA.vidaAceitar(null, 0, T0, { totalSecs: 999999 }, cert(T0 + H)).reg.s, 0);
  igual('sem slot nenhum, zero',
        VIDA.vidaAceitar(null, 0, T0).reg.s, 0);

  /* E O SEGUNDO ENCONTRO JÁ NÃO ACREDITA EM NADA. Esta é a linha que
     fecha a porta: depois de registrado, o `totalSecs` do slot nunca
     mais é lido pela conta. */
  const reg = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 100 }, cert(T0 - H)).reg;
  const depois = VIDA.vidaAceitar(reg, 60, T0 + M, { totalSecs: 999999999 }, cert(T0 - H));
  igual('registrado, um slot de 317 anos é ignorado', depois.reg.s, 100 + 60);
}

/* ═══ 3 · QUEM MANDA É O MAPA ═══════════════════════════════════════ */
titulo('O vidaDe lê o mapa, não o slot');
{
  const mapa = { av1: { s: 7777, em: T0 } };
  igual('com registro, manda o mapa',
        VIDA.vidaDe(mapa, 'av1', { totalSecs: 999999999 }), 7777);
  igual('sem registro, cai no slot (e quem o faz avisa o servidor)',
        VIDA.vidaDe(mapa, 'av2', { totalSecs: 1234 }), 1234);
  igual('sem mapa e sem slot, zero', VIDA.vidaDe(null, 'av3', null), 0);
  igual('um registro corrompido não passa por bom',
        VIDA.vidaDe({ av4: { s: 'muito' } }, 'av4', { totalSecs: 42 }), 42);
}

/* ═══ 4 · A FRONTEIRA, DECLARADA ════════════════════════════════════

   A lista de quem é autoridade de quê. Não é documentação: é conferida
   contra o firestore.rules e contra o código, e falha quando alguém
   mover um campo sem mover a autoridade com ele.

   Isto é o que o pedido chama de whitelist — escrita ao contrário, que
   é a forma que este projeto já usa: em vez de dizer o que o cliente
   PODE escrever (uma lista que envelhece a cada campo novo), diz-se o
   que ele NÃO pode, e o resto é dele. */
titulo('A fronteira entre o cliente e o servidor');
{
  const fs = require('fs');
  const ler = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const regras = ler('firestore.rules');

  /* Os campos de topo que só o servidor escreve, e o que cada um
     protege. Quem acrescentar um mapa de autoridade acrescenta aqui. */
  const DO_SERVIDOR = {
    certidoes:         'o DNA, o seed, os pais e o criador',
    niveis:            'o nível que o PvP usa',
    vidaAtiva:         'os segundos de vida ativa',
    avataresEmitidos:  'a prova de que o servidor emitiu o avatar',
    ovosEmitidos:      'a prova dos ovos',
    ovos:              'os genes de cada ovo',
    donos:             'a cadeia de propriedade',
    mortos:            'quem morreu',
    lacos:             'os laços entre avatares',
    invocacoesUsadas:  'as três invocações da vida',
    rank:              'os pontos da temporada',
    selos:             'o selo da temporada',
    premios:           'o que cada um recebeu',
  };
  for (const [campo, oQue] of Object.entries(DO_SERVIDOR)) {
    ok(`'${campo}' está na lista das regras — ${oQue}`,
       new RegExp(`'${campo}'`).test(regras));
  }

  /* E o espelho no slot continua a existir, de propósito: é o que a
     interface mostra enquanto o aviso não volta. O que NÃO pode é
     alguém decidir por ele. */
  const vidaJs = ler('js/vida-ativa.js');
  ok('o vida-ativa.js diz que o slot deixou de ser autoridade',
     /não é AUTORIDADE|deixa de ser autoridade|nunca do slot/.test(vidaJs));

  // a conta não pode usar data do cliente
  ok('a conta do balde usa o relógio de quem chama, não o do pedido',
     /NÃO SE USA DATA ENVIADA PELO CLIENTE/.test(vidaJs));
  ok('e o teto do primeiro encontro sai da certidão, não do slot',
     /certidao && certidao\.nascidoEm/.test(vidaJs));

  /* O servidor tem de registrar os recém-nascidos, senão o primeiro
     encontro volta a ser uma porta. Os dois lugares onde se nasce. */
  const pool = ler('api/pool.js');
  igual('os avatares novos nascem com vida ativa registrada',
        (pool.match(/vidaAtiva\.\$\{id\}`\]: \{ s: 0/g) || []).length, 2);
  ok('e o servidor atende a ação de aviso', /acao === 'vida'/.test(pool));
  ok('o servidor passa a certidão ao decidir',
     /vidaAceitar\(vidaAtiva\[id\], p\.segundos, agora, slot, certidoes\[id\]\)/.test(pool));
  ok('numa transação, como o resto', /async function handleVida[\s\S]{0,2000}runTransaction/.test(pool));
  ok('e o relógio é o do servidor',
     /async function handleVida[\s\S]{0,2000}const agora\s*=\s*Date\.now\(\)/.test(pool));

  // a venda transfere a autoridade
  const compra = ler('api/comprar-avatar.js');
  ok('a venda transfere o mapa da vida ativa', /vidaAtiva\.\$\{listing\.id\}/.test(compra));
  ok('e apaga-o no vendedor', /chaveVida\s*\?\s*\{\s*\[chaveVida\]:\s*FieldValue\.delete/.test(compra));
  ok('o anúncio leva a vida ativa reconhecida', /totalSecs:\s*vidaReconhecida/.test(compra));

  // o cliente alimenta o servidor em vez de gravar o número
  const tick = ler('js/gametick.js');
  igual('o gameTick avisa o servidor nos dois caminhos',
        (tick.match(/vidaSomar\(/g) || []).length, 2);

  /* O MAPA É CARREGADO ANTES DE ALGUÉM O LER. O vidaCarregar vive no
     applyGameState e tem de correr antes do loadRuntimeFromSlot, senão
     a ficha abre a mostrar o espelho do slot e só corrige no primeiro
     aviso — um minuto depois. */
  const fb = ler('js/firebase.js');
  const iApply = fb.indexOf('function applyGameState');
  const iCarr  = fb.indexOf('vidaCarregar(data.vidaAtiva)');
  const iLoad  = fb.indexOf('loadRuntimeFromSlot(activeSlotIdx)', iApply);
  ok('o vidaCarregar está dentro do applyGameState', iApply > 0 && iCarr > iApply);
  ok('e antes de o runtime ser carregado do slot', iCarr > 0 && iLoad > iCarr,
     `carrega ${iCarr}, load ${iLoad}`);

  // e a interface lê do servidor
  const ui = ler('js/ui.js');
  ok('o tempo de vida na ficha vem do reconhecido', /vidaConhecida\(/.test(ui));
  ok('somado ao que está na fila', /vidaPendente\(/.test(ui));

  /* E NENHUMA TELA LÊ O ESPELHO. Um `_fmtTime(totalSecs)` solto é o
     defeito que esta etapa encontrou no texto da morte: a ficha passou
     a ler o mapa e ele ficou a ler a memória, que é o único número que
     um PATCH ainda alcança. Dois números para a mesma coisa na tela. */
  for (const arq of ['js/ui.js', 'js/gametick.js']) {
    ok(`${arq}: nenhum _fmtTime(totalSecs) solto`,
       !/_fmtTime\(\s*totalSecs/.test(ler(arq)));
  }
  ok('o texto da morte lê o reconhecido', /vidaConhecida\(/.test(tick));

  /* E a raridade não recebe o tempo. O raridadeDoSlot nunca o leu — a
     raridade sai só do nível — e passá-lo sugeria o contrário. */
  ok('o raridadeDoSlot não recebe totalSecs',
     !/raridadeDoSlot\(\s*\{[^}]*totalSecs/.test(tick));

  // o tempo pendente não se perde ao sair
  ok('a desconexão manda o que está na fila', /vidaEnviar/.test(ler('js/auth.js')));
  ok('e o esconder da aba também', /vidaEnviar/.test(ler('js/main.js')));

  /* A PAUSA CONTINUA A NÃO CONTAR, e é a ORDEM das linhas que o
     garante: a guarda sai da função antes de o tempo ser somado. Mover
     o vidaSomar para cima dela faria o jogo pausado render tempo — e
     seria uma mudança invisível em qualquer leitura rápida. */
  /* DENTRO do corpo do gameTick, e não no arquivo inteiro: o
     viverTodos é definido acima dele e tem o seu próprio vidaSomar.
     Comparar posições no arquivo deu um teste que falhava por ordem de
     declaração — ele apanhou-se e esta é a medida certa. */
  const corpoTick = tick.slice(tick.indexOf('function gameTick'));
  const iGuarda = corpoTick.indexOf('if (jogoPausado || document.hidden) return;');
  const iSomar  = corpoTick.indexOf('vidaSomar(');
  ok('a guarda da pausa está no gameTick', iGuarda > 0);
  ok('e vem ANTES de o tempo ser somado', iGuarda > 0 && iSomar > 0 && iGuarda < iSomar,
     `guarda ${iGuarda}, vidaSomar ${iSomar}`);
  ok('e antes do totalSecs++ também',
     iGuarda > 0 && iGuarda < corpoTick.indexOf('totalSecs++'));
  /* E o viverTodos, que trata dos outros slots, é chamado de dentro do
     gameTick — portanto depois da mesma guarda. */
  ok('o viverTodos é chamado de dentro do gameTick',
     corpoTick.indexOf('viverTodos()') > iGuarda);

  /* A desconexão envia ANTES de limpar: a ordem é a garantia, como na
     pausa. O saveToFirebase sai cedo sem walletAddress, e era aí que
     até cinco segundos se perdiam. */
  const auth = ler('js/auth.js');
  const iEnvia = auth.indexOf('vidaEnviar()');
  const iLimpa = auth.indexOf('walletAddress = null');
  ok('a desconexão envia antes de limpar a sessão',
     iEnvia > 0 && iLimpa > 0 && iEnvia < iLimpa, `envia ${iEnvia}, limpa ${iLimpa}`);

  // e o arquivo é carregado antes de quem o usa
  const html = ler('index.html');
  /* A posição da TAG, e não de qualquer menção: os comentários do
     index.html citam estes arquivos pelo nome, e a primeira versão
     deste teste comparava com um comentário que está mais acima. Ele
     falhou, com razão. */
  const tag = nome => html.indexOf('src="js/' + nome + '.js');
  const iVida = tag('vida-ativa');
  ok('o index.html carrega o js/vida-ativa.js', iVida > 0);
  ok('antes do js/gametick.js, que o alimenta',
     iVida > 0 && iVida < tag('gametick'), `vida ${iVida}, gametick ${tag('gametick')}`);
  ok('antes do js/ui.js, que o lê',
     iVida > 0 && iVida < tag('ui'), `vida ${iVida}, ui ${tag('ui')}`);
  ok('e antes do js/firebase.js, que o carrega do documento',
     iVida > 0 && iVida < tag('firebase'), `vida ${iVida}, firebase ${tag('firebase')}`);
}

/* ═══ 5 · DUAS ABAS ═════════════════════════════════════════════════

   O defeito que a auditoria mediu: duas abas gravam o `avatarSlots`
   inteiro e a última apaga o trabalho da primeira. A resposta é o
   DELTA — cada aba soma o que ela própria viu, e o servidor junta. */
titulo('Duas abas somam, em vez de uma apagar a outra');
{
  // o que acontecia: dois totais, o último vence
  const comoEra = (a, b) => b;
  igual('ANTES: a aba que grava por último vencia', comoEra(4200, 3660), 3660);

  // o que acontece agora: dois deltas, os dois entram
  let reg = { s: 3600, em: T0 };
  reg = VIDA.vidaAceitar(reg, 600, T0 + 10 * M).reg;     // a aba A: 10 min
  reg = VIDA.vidaAceitar(reg, 60,  T0 + 11 * M).reg;     // a aba B: 1 min
  igual('AGORA: 600 + 60 entram os dois', reg.s, 3600 + 600 + 60);

  /* E as duas ao mesmo tempo, no mesmo instante: a segunda só leva o
     que a folga permite. Não é perda de trabalho honesto — é o teto a
     fazer o que deve, porque duas abas no mesmo segundo não viveram
     dois segundos. */
  let r2 = { s: 0, em: T0 };
  const a = VIDA.vidaAceitar(r2, 300, T0 + 5 * M);
  const b = VIDA.vidaAceitar(a.reg, 300, T0 + 5 * M);
  ok('duas abas no mesmo instante não dobram o tempo',
     b.reg.s <= 300 + VIDA.VIDA_FOLGA_S, 'deu ' + b.reg.s);
  ok('mas a primeira recebeu o que pediu', a.somou === 300);
}

/* ═══ 5b · OS TRÊS CASOS PEDIDOS, nas regras ════════════════════════

   Os mesmos A, B e C que o tools/testar-vida-servidor.js mede contra o
   emulador. Aqui ficam nas regras, para falharem sem precisar de nada
   no ar — se o balde se perder, estes gritam primeiro. */
titulo('Casos A, B e C');
{
  // ── CASO A: o cliente tenta 999 999 999 ──
  const reg = { s: 3600, em: T0 };
  const a = VIDA.vidaAceitar(reg, 999999999, T0 + M);
  ok('A: o total NÃO passa a ser 999 999 999', a.reg.s !== 999999999, 'ficou ' + a.reg.s);
  ok('A: e fica perto do que havia', a.reg.s <= 3600 + 60 + VIDA.VIDA_FOLGA_S,
     'ficou ' + a.reg.s);

  /* ── CASO B: o cliente tenta zerar ──
     Não há caminho para zerar: a conta só SOMA. Um delta negativo, zero
     ou de texto não tira nada, e o total nunca desce. */
  igual('B: um delta negativo não zera',   VIDA.vidaAceitar(reg, -3600, T0 + M).reg.s, 3600);
  igual('B: um delta zero não zera',       VIDA.vidaAceitar(reg, 0, T0 + M).reg.s, 3600);
  igual('B: um delta de texto não zera',   VIDA.vidaAceitar(reg, 'zero', T0 + M).reg.s, 3600);
  igual('B: um delta nulo não zera',       VIDA.vidaAceitar(reg, null, T0 + M).reg.s, 3600);
  /* E o slot a dizer zero também não: depois de registrado, o slot não
     entra na conta de maneira nenhuma. */
  igual('B: o slot a dizer 0 não zera o registro',
        VIDA.vidaAceitar(reg, 60, T0 + M, { totalSecs: 0 }).reg.s, 3660);

  /* ── CASO C: dois deltas válidos acumulam ──
     3600 + 600 + 300 = 4500, com o tempo de parede a permitir os dois
     (que é o caso de duas sessões que viveram em períodos diferentes). */
  let c = { s: 3600, em: T0 };
  c = VIDA.vidaAceitar(c, 600, T0 + 600 * S).reg;      // a aba A, 10 min depois
  igual('C: a aba A soma 600', c.s, 4200);
  c = VIDA.vidaAceitar(c, 300, T0 + 900 * S).reg;      // a aba B, 5 min depois
  igual('C: a aba B soma 300 e o total é 4500', c.s, 4500);
  ok('C: e não é 3900 (a B a apagar a A)', c.s !== 3900);
  ok('C: nem 4200 (a A a apagar a B)',     c.s !== 4200);

  /* O OUTRO CASO C, que é o inverso e também tem de estar certo: as
     duas abas abertas AO MESMO TEMPO, a reclamar o mesmo período. Aí
     900 segundos seriam tempo a dobrar — o avatar viveu 600 de parede,
     não 900 — e o balde corta de propósito. As duas coisas são a mesma
     regra vista de dois lados. */
  let d = { s: 3600, em: T0 };
  d = VIDA.vidaAceitar(d, 600, T0 + 600 * S).reg;
  const simultanea = VIDA.vidaAceitar(d, 300, T0 + 600 * S);
  ok('C: duas abas no MESMO período não dobram o tempo',
     simultanea.reg.s <= 4200 + VIDA.VIDA_FOLGA_S, 'ficou ' + simultanea.reg.s);
  ok('C: e isso fica marcado como travado', !!simultanea.travado);
}

/* ═══ 5c · O PRIMEIRO ENCONTRO SOB ATAQUE ═══════════════════════════

   O caso exato do pedido: um avatar com 3.600 s existentes, e um
   cliente a mexer no bornAt e no totalSecs ao mesmo tempo. */
titulo('O primeiro encontro com o cliente a mentir');
{
  const cert = ms => ({ nascidoEm: ms });
  const DezDias = 10 * 24 * H;

  // o avatar honesto: 3.600 s vividos, certidão de 10 dias
  let r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 3600 }, cert(T0 - DezDias));
  igual('3.600 s existentes entram inteiros', r.reg.s, 3600);

  // o cliente mexe no bornAt para apertar o teto — não consegue
  r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 3600, bornAt: T0 - 1 },
                       cert(T0 - DezDias));
  igual('um bornAt de 1 ms não reduz o tempo existente', r.reg.s, 3600);

  // o cliente mexe no bornAt para alargar o teto — também não consegue
  r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 999999999, bornAt: T0 - 100 * DezDias },
                       cert(T0 - DezDias));
  igual('um bornAt de 100 anos não alarga o teto', r.reg.s, Math.floor(DezDias / 1000));

  // e o totalSecs inflado só chega até a idade real
  r = VIDA.vidaAceitar(null, 0, T0, { totalSecs: 999999999 }, cert(T0 - DezDias));
  igual('o totalSecs inflado para na idade da certidão', r.reg.s, Math.floor(DezDias / 1000));

  /* E a certidão NÃO vem do slot. Esta é a linha que importa: o
     js/identidade.js escreve um `slot.nascidoEm` a partir do bornAt, e
     se a conta o lesse o teto voltava para a mão do cliente. */
  const vidaJs = require('fs').readFileSync(
    path.join(__dirname, '..', 'js', 'vida-ativa.js'), 'utf8');
  ok('a conta recebe a certidão como argumento próprio',
     /function vidaAceitar\(reg, delta, agora, slot, certidao\)/.test(vidaJs));
  ok('e o slot.nascidoEm não entra nela',
     !/slot\s*&&\s*slot\.nascidoEm/.test(vidaJs));
}

/* ═══ 6 · O QUE ISTO NÃO FECHA ══════════════════════════════════════
   Escrito como teste para não ser esquecido: o limite é conhecido e
   deliberado, e o dia em que alguém o fechar deve apagar isto. */
titulo('O limite, dito em voz alta');
{
  /* Sessenta avisos honestos num minuto de relógio dão um minuto de
     tempo, mais a folga de cada um. A folga é o preço de funcionar numa
     aba estrangulada, e é o que um cliente modificado pode explorar —
     devagar. */
  let reg = { s: 0, em: T0 };
  for (let i = 0; i < 60; i++) reg = VIDA.vidaAceitar(reg, 3600, T0 + M).reg;
  const ganho = reg.s;
  const honesto = 60;
  ok('um cliente modificado ganha, mas por folga e não por salto',
     ganho < honesto + 61 * VIDA.VIDA_FOLGA_S, 'ganhou ' + ganho + ' s');
  ok('e nunca o salto de 317 anos que a auditoria mediu',
     ganho < 999999999 / 1000);
}

// ═══════════════════════════════════════════════════════════════════
console.log();
if (falhas.length) {
  console.log(`${passaram} passaram · ${falhas.length} falharam\n`);
  falhas.forEach(f => console.log(f));
  process.exitCode = 1;
} else {
  console.log(`${passaram} passaram · 0 falharam`);
}
