// ═══════════════════════════════════════════════════════════════════
// A ARENA — motor Fabula Ultima
//
// ── DE ONDE VEIO ──
//
// Do js/combate-pve.js, que foram 3138 linhas agarradas ao motor 3D&T:
// F/H/R/A, armadura, esquiva, o prognóstico, o banco com um activo.
//
// Os dois conviveram durante um dia — este a correr o motor novo no
// banco de ensaio, aquele a correr o jogo — porque reescrevê-lo de uma
// assentada deixava o jogo, que está no ar, sem arena nenhuma enquanto
// isso durasse. Quando este ficou pronto, o outro apagou-se inteiro: não
// ficou metade de cada, que era a única forma de aquilo correr mal.
//
// O CSS é partilhado com o palco antigo (css/combate-arena.css). As
// classes .cb-* descrevem um palco e não um motor: céu, fenda,
// monólitos, postos, orbes, barras, lance. Nada disso muda com as
// regras, e duplicá-lo era garantir que os dois palcos divergiam à
// primeira correcção.
//
// ── O QUE ESTE ARQUIVO NÃO FAZ ──
//
// Energia, doenças, fratura, prémios, XP. Isso é a moldura do jogo à
// volta da batalha e não muda de motor: vive no js/pve-fu.js.
// ═══════════════════════════════════════════════════════════════════

let _afE     = null;    // o estado da batalha, vindo do motor
let _afQuem  = null;    // qual dos meus está a decidir
let _afPasso = null;    // null | { lugar, magia, aliado } enquanto escolhe alvo
let _afLaco = null;     // o id de quem pediu Lutar pelo Laço para a próxima ação
let _afMenu  = false;
let _afOcupado = false; // a travar enquanto o lance corre
let _afSair  = null;    // o que fazer ao sair

/* ── O TEMPO DE UM LANCE ──
   Não é enfeite: é o tempo que um humano leva a ler "13 contra 8,
   crítico, −22 de vida". Mais curto e o jogador vê números a passar;
   mais longo e a batalha arrasta. */
const AF_PAUSA = 900;

// ═══════════════════════════════════════════════════════════════════
// COMEÇAR
// ═══════════════════════════════════════════════════════════════════
/* ── SEM ZOOM NA BATALHA ──

   No celular, tocando rápido nos cartões e nos orbes, dava para abrir um
   zoom de pinça sem querer — e depois não havia como sair dele: a batalha
   ocupa a tela inteira e não tem onde apoiar dois dedos para desfazer.

   A meta viewport do index.html já pede maximum-scale=1, mas o Safari do
   iPhone ignora isso desde o iOS 10, e o Chrome ignora com o "forçar zoom"
   de acessibilidade ligado. Por isso, só enquanto a batalha está aberta:

     · o CSS tira a pinça do palco (touch-action em #combateModal);
     · dois dedos se mexendo não fazem nada (touchmove);
     · os gestos de zoom do Safari são cancelados (gesturestart/change).

   E abrir ou fechar a batalha reescreve a meta viewport, o que faz o
   navegador voltar ao zoom normal se ele tiver ficado preso.

   Fora da batalha nada disso vale: quem precisa ampliar o texto do resto
   do jogo continua podendo. */
const _AF_ZOOM_OPC = { passive: false };
function _afSemGesto(e) { e.preventDefault(); }
function _afSemPinca(e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }

/* O conteúdo ORIGINAL da meta é guardado uma vez só. Lido a cada chamada,
   duas batalhas abertas com menos de 300ms de diferença quebravam tudo: a
   segunda lia a meta já alterada como se fosse a original e devolvia essa,
   e a trava ficava para sempre. */
let _afViewportOrig = null, _afViewportTimer = null;
function _afZoomNormal() {
  const m = document.querySelector('meta[name="viewport"]');
  if (!m) return;
  if (_afViewportOrig == null) _afViewportOrig = m.getAttribute('content') || '';
  clearTimeout(_afViewportTimer);
  m.setAttribute('content', _afViewportOrig.replace(/,\s*user-scalable=[^,]*/g, '') + ', user-scalable=no');
  _afViewportTimer = setTimeout(() => m.setAttribute('content', _afViewportOrig), 300);
}

/* ── E O TOQUE DUPLO ──

   A pinça estava travada, mas o zoom continuava a abrir com dois toques
   rápidos. O `touch-action` que devia impedir isso não é respeitado em
   todo lugar — o Safari do iPhone, sobretudo, dá zoom no toque duplo
   mesmo com ele.

   Então é pelo toque: se um toque termina a menos de 350ms do anterior,
   no mesmo lugar, o fim dele é cancelado. Cancelar o fim do toque cancela
   o zoom, mas cancela também o clique que o navegador ia gerar — e o
   segundo toque num orbe ou num cartão tem de continuar a valer. Por isso
   o clique é refeito à mão, no mesmo elemento.

   Um toque que arrastou (rolar o registro, por exemplo) não conta: não é
   toque duplo, e refazer um clique no fim de um arrasto seria clicar onde
   o dedo parou sem querer. */
const AF_TOQUE_DUPLO_MS = 350;
const AF_TOQUE_FOLGA_PX = 12;
let _afToque = { fim: 0, x: 0, y: 0, ix: 0, iy: 0 };

function _afToqueComeca(e) {
  const p = e.changedTouches && e.changedTouches[0];
  if (p) { _afToque.ix = p.clientX; _afToque.iy = p.clientY; }
}

function _afSemToqueDuplo(e) {
  const p = e.changedTouches && e.changedTouches[0];
  if (!p || e.changedTouches.length > 1) return;
  const arrastou = Math.abs(p.clientX - _afToque.ix) > AF_TOQUE_FOLGA_PX
                || Math.abs(p.clientY - _afToque.iy) > AF_TOQUE_FOLGA_PX;
  const agora = Date.now();
  const duplo = !arrastou
    && agora - _afToque.fim < AF_TOQUE_DUPLO_MS
    && Math.abs(p.clientX - _afToque.x) < AF_TOQUE_FOLGA_PX * 3
    && Math.abs(p.clientY - _afToque.y) < AF_TOQUE_FOLGA_PX * 3;
  _afToque.fim = agora; _afToque.x = p.clientX; _afToque.y = p.clientY;
  if (!duplo) return;

  e.preventDefault();
  const alvo = e.target;
  if (alvo && typeof alvo.dispatchEvent === 'function') {
    alvo.dispatchEvent(new MouseEvent('click', {
      bubbles: true, cancelable: true, view: window,
      clientX: p.clientX, clientY: p.clientY,
    }));
  }
}

function _afTravarZoom(liga) {
  const acao = liga ? 'addEventListener' : 'removeEventListener';
  document[acao]('gesturestart',  _afSemGesto, _AF_ZOOM_OPC);
  document[acao]('gesturechange', _afSemGesto, _AF_ZOOM_OPC);
  document[acao]('touchmove',     _afSemPinca, _AF_ZOOM_OPC);
  document[acao]('touchstart',    _afToqueComeca, _AF_ZOOM_OPC);
  document[acao]('touchend',      _afSemToqueDuplo, _AF_ZOOM_OPC);
  _afToque = { fim: 0, x: 0, y: 0, ix: 0, iy: 0 };
  _afZoomNormal();
}

function afAbrir(equipaA, equipaB, semente, aoSair) {
  _afTravarZoom(true);
  _afE = fuIniciar(equipaA, equipaB, semente);
  /* OCUPADO até a primeira vez (o _afAndar agendado aqui embaixo). Com
     `false`, um jogador rápido agia antes dele, e o inimigo começava a
     jogar no meio da jogada do jogador — visto pelo subagente de
     verificação em 21/09/2026. */
  _afQuem = null; _afPasso = null; _afMenu = false; _afOcupado = true;
  _afSegredo = null; _afMorreAinda = null;
  // O histórico é desta batalha: sem isto, a anterior aparecia junto.
  _afHistorico = [];
  _afAuraMapa = {};
  _afSair = aoSair || null;
  _afShell();
  _afObservarTamanho();
  _afDesenhar();
  _afLance('<b>' + t('af.lance.comeca', {
    nome: esc(_afNome(_afPorId(_afE.iniciativa.quem))) }) + '</b> · '
    /* Com as mesmas caixas de dados dos testes. Pedia a chave
       `af.lance.dados`, que saiu quando os dados ganharam caixa própria — e
       a primeira linha de toda batalha passou a mostrar o nome cru da
       chave. Os atributos são DES e PER porque é isso que o motor rola
       para a iniciativa (fuIniciar, em js/combate-fu.js). */
    + _afDadosHTML({ dados: _afE.iniciativa.dados, atribs: ['DES', 'PER'], modificador: 0,
                     quem: _afE.iniciativa.quem })
    + '<span class="cb-lance-resto"> · '
    + t('af.lance.acerta', { r: _afE.iniciativa.resultado, dl: _afE.iniciativa.dl }) + '</span>');
  setTimeout(_afAndar, AF_PAUSA);
}

/* ── A JANELA MUDOU DE TAMANHO ──
   A caixa dos efeitos tem o tamanho do corpo em PIXELS (_afAssentar), e
   o fio do Proteger também. Girar o celular ou redimensionar a janela
   mudava o corpo e deixava os dois para trás (medido: uma caixa de 61 px
   sobre um corpo de 121). Um observador no palco mede tudo de novo. */
let _afObservador = null, _afObsTimer = null;
function _afObservarTamanho() {
  const palco = document.getElementById('cbPalco');
  if (!palco || typeof ResizeObserver !== 'function') return;
  if (_afObservador) _afObservador.disconnect();
  _afObservador = new ResizeObserver(() => {
    clearTimeout(_afObsTimer);
    _afObsTimer = setTimeout(() => {
      if (!_afE) return;
      _afAssentar();
      _afAurasRedesenhar();
    }, 120);
  });
  _afObservador.observe(palco);
}

function afFechar() {
  if (_afObservador) { _afObservador.disconnect(); _afObservador = null; }
  _afTravarZoom(false);
  const m = document.getElementById('combateModal');
  if (m) m.innerHTML = '';
  _afE = null;
  if (typeof _afSair === 'function') _afSair();
}

// ═══════════════════════════════════════════════════════════════════
// O PALCO
//
// A mesma marcação da arena antiga, e de propósito: é o CSS que a
// desenha, e o CSS é partilhado. O que muda aqui é só o que lá dentro
// se põe.
// ═══════════════════════════════════════════════════════════════════
/* As motas de poeira do ar. Nascem uma vez, na casca, e não a cada
   redesenho: são decoração e não estado, e refazê-las a cada turno
   reiniciava-lhes a subida.

   `.cb-mota` com estilo em linha, que é o que o css/combate-arena.css
   conhece. Escrevi-as com `<i style="--mx…">` à primeira, inventado, e
   saíram invisíveis — a terceira vez neste arquivo que marcação que o
   CSS não conhece desaparece sem se queixar. */
function _afMotas(n) {
  let h = '';
  for (let i = 0; i < n; i++) {
    const tam = 1 + Math.random() * 2.2;
    h += `<span class="cb-mota" style="width:${tam / 16}rem;height:${tam / 16}rem;`
       + `left:${4 + Math.random() * 92}%;top:${52 + Math.random() * 46}%;`
       + `animation-duration:${9 + Math.random() * 11}s;`
       + `animation-delay:-${Math.random() * 14}s;opacity:0"></span>`;
  }
  return h;
}

function _afShell() {
  document.getElementById('combateModal').innerHTML = `<div class="cb-palco" id="cbPalco">
    <div class="cb-cena" aria-hidden="true">
      <div class="cb-ceu"></div>
      <div class="cb-aurora"></div>
      <div class="cb-fenda">
        <div class="cb-fenda-halo"></div>
        <div class="cb-fenda-corpo"></div>
        <div class="cb-fenda-nucleo"></div>
      </div>
      <div class="cb-monolitos"></div>
      <div class="cb-monolitos-perto"></div>
      <div class="cb-bruma"></div>
      <div class="cb-chao"></div>
      <div class="cb-poeira">${_afMotas(14)}</div>
      <div class="cb-frente"><i></i><i></i></div>
      <div class="cb-vinheta"></div>
    </div>

    <div class="cb-topo">
      <span id="cbTurno"></span>
      <span class="cb-topo-nome">${t('af.titulo')}</span>
      <span class="cb-topo-dir">
        <!-- UM BOTÃO SÓ. Havia dois lado a lado — DESISTIR e um ✕ — e os
             dois chamavam a mesma função, portanto faziam exatamente a
             mesma coisa. No banco de ensaio, onde não há o que desistir,
             ele fica sendo o ✕: lá o botão de desistir não tem rótulo, e
             sem isto a tela de teste ficava sem saída. -->
        <button id="cbDesistir" class="desistir" onclick="_afDesistir()"
                title="${esc(_afTemMoldura() ? t('pve.acao.desistir_sub', { n: PVE_ENERGIA_DESISTIR }) : t('af.fim.sair'))}"
                >${_afTemMoldura() ? t('pve.acao.desistir') : '✕'}</button>
      </span>
    </div>

    <!-- A MARÉ: quem está ganhando, pela vida somada dos três de cada
         lado. Ver _afMare(), mais abaixo. -->
    <div class="cb-mare" id="cbMare" aria-hidden="true">
      <div class="cb-mare-trilho">
        <i class="cb-mare-eu" id="cbMareEu"></i>
        <i class="cb-mare-ini"></i>
        <b class="cb-mare-marca" id="cbMareMarca"></b>
      </div>
      <div class="cb-mare-rot">
        <span id="cbMareVidaEu"></span>
        <span id="cbMareVidaIni"></span>
      </div>
    </div>

    <!-- A dica do que fazer agora ("toque num dos seus avatares"). Estava
         escrito "Sua vez" e nada dizia que o gesto era tocar no avatar. -->
    <div class="cb-dica" id="cbDica" aria-live="polite"></div>

    <div class="cb-campo" id="cbCampo"></div>

    <!-- Os efeitos que VIAJAM de um lutador a outro (os projéteis, a
         varredura da Devastação, o fio da Salus) — ver _afDisparar. Não
         cabem na caixa de efeitos de um só corpo. -->
    <div class="cb-fx" id="cbFx" aria-hidden="true"></div>

    <div class="cb-menu" id="cbMenu"><div class="cb-acoes" id="cbAcoes"></div></div>

    <div class="cb-log" id="cbLog" role="button" tabindex="0"
         onclick="_afAbrirHistorico()"></div>

    <div class="cb-rodape">
      <div class="cb-hud eu"  id="cbHudEu"></div>
      <div class="cb-hud ini" id="cbHudIni"></div>
    </div>

    <div class="cb-ajuda" id="cbAjuda"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// O CAMPO
// ═══════════════════════════════════════════════════════════════════

/* ── ONDE CADA UM SE PÕE ──

   Os mesmos três pontos da arena antiga, mas a ligação mudou de sentido
   e é a melhor coisa que esta troca de motor trouxe ao palco.

   Lá, o posto 0 era "quem está em campo" e os outros dois eram o banco:
   uma ordem inventada para desenhar, sem nada no motor que lhe
   correspondesse. Aqui o posto É a formação — o 0 é o defensor, e a
   diagonal que recua é literalmente quem está atrás de quem.

   O desenho deixa de ilustrar a regra e passa a mostrá-la. Quem se
   reordena vê-se mudar de sítio, e quem olha para o campo sabe em quem
   vai cair o próximo golpe de alvo único. */
const AF_POSTOS = [
  { x: 36, y: 84, z: 1.00 },
  { x: 22, y: 58, z: 0.60 },
  { x: 10, y: 34, z: 0.36 },
];

function _afNome(c) { return (c && c.nome) || (c && c.id) || '—'; }

/* ── A FASE VEM DO NÍVEL ──

   Estava fixa em 3 — ancião — e portanto um bebé de nível 1 entrava na
   arena com corpo de velho. O desenho é a única coisa na batalha que
   dizia a idade do bicho, e dizia-a errada em todos os casos menos um.

   O número fixo não foi descuido de um dia: escrevi-o ao montar o palco,
   quando ainda não havia ficha nova para lhe perguntar o nível, e nunca
   voltei a ele. */
function _afFase(c) {
  const nv = (c && c.ficha && c.ficha.nivel) || 1;
  return (typeof fuFaseDoNivel === 'function') ? fuFaseDoNivel(nv) : 0;
}

function _afCorpo(c) {
  if (typeof gerarSVG !== 'function') return '';
  const svg = gerarSVG(c.ficha, c.ficha.raridade, c.ficha.seed, 200, 200, _afFase(c));
  return svg.replace('<svg', '<svg preserveAspectRatio="xMidYMax meet"');
}

function _afLutador(c) {
  const meu = c.lado === 'A';
  const lado = meu ? 'eu' : 'ini';
  const podeAgir = _afPodeAgir(c);
  const escolhido = _afQuem === c.id;

  const cls = ['cb-posto', lado, escolhido ? 'ativo' : '',
               _afVivoVisivel(c) ? '' : 'caido', podeAgir ? 'pode' : ''].join(' ');

  /* ── AS MARCAS DO CÉU ──

     Uma por coisa que está a mexer nos números dele. São a etiqueta, e
     não a explicação: quem quiser saber o que "Atordoado" faz toca no
     bicho e lê a secção O QUE ESTÁ ACONTECENDO da ficha, onde cabe a
     frase inteira. Aqui cabe uma palavra, e o que ela serve é ver de
     longe quem está como.

     ── AS CORES ESTAVAM AO CONTRÁRIO ──

     Havia três classes, e vinham da arena antiga com outros significados
     agarrados: os seis estados levavam `veneno`, que o CSS pinta de
     VERDE; e o Despertar — que é um dado a SUBIR — levava `buff`, que o
     CSS pinta de VERMELHO. Um "Atordoado" verde ao lado de um "PER+"
     vermelho diz ao jogador exactamente o contrário do que aconteceu.

     Ficam duas, e dizem o que são: `mal` para o que o prejudica, `bem`
     para o que o ajuda. A crise leva a sua, porque não é nem uma coisa
     nem outra — é o sítio onde ele está. */
  /* As marcas vêm do mesmo resumo que a ficha desenha (fuResumoAgora, em
     js/ficha-fu-ui.js): um rótulo curto no céu e a frase inteira no
     `title`. Só os itens que passam têm marca — as vantagens e a costura
     são de nascença, e no céu seriam ruído em todos os turnos.

     Quem caiu não carrega marca nenhuma: "Atordoado", "Concha" e a crise
     em cima de um corpo deitado não dizem nada, e ficavam penduradas no
     ar sobre o companheiro de trás. */
  /* E as que já têm DESENHO próprio saem do céu (21/09/2026): a guarda, a
     Barreira, a Concha, o Despertar, o Proteger e os seis estados viraram
     efeitos em volta do corpo (_afAuraDoModelo), e a etiqueta repetia o
     desenho. A frase inteira continua na ficha, ao tocar no corpo. */
  /* A crise (o "!") e a Misericórdia também (22/09/2026): o coração que
     bate em vermelho e a auréola dourada. */
  const temDesenho = x => /^est:/.test(x.id)
    || ['guarda', 'barreira', 'concha', 'despertar', 'protegendo',
        'crise', 'misericordia'].indexOf(x.id) !== -1;
  const marcas = (_afVivoVisivel(c) && typeof fuResumoAgora === 'function')
    ? fuResumoAgora(c).filter(x => x.marca && !temDesenho(x)).map(x =>
        `<span class="cb-marca ${x.classe}" title="${esc(x.nome + ' — ' + x.texto)}">${
          esc(x.marca)}</span>`)
    : [];

  const pos = AF_POSTOS[Math.max(0, Math.min(2, c.posto))];
  const x = meu ? pos.x : 100 - pos.x;

  /* ── O CORPO MOSTRA, O CARTÃO MANDA ──

     Tocar num meu que pudesse agir abria-lhe o menu, e tocar em qualquer
     outro abria a ficha. Duas respostas diferentes ao mesmo gesto,
     decididas por uma condição que o jogador não vê — de quem é a vez, e
     se já agiu nesta rodada. O mesmo toque no mesmo bicho fazia coisas
     diferentes conforme o momento.

     Agora o campo responde sempre o mesmo: quem és tu. As ordens dão-se
     nos cartões de baixo, que é onde está a fila toda e onde já se
     escolhia quem joga.

     E há uma razão de espaço por baixo da de coerência: o menu abria
     POR CIMA do avatar em que se tinha acabado de tocar. Abrir a partir
     do cartão deixa o campo livre para mostrar o que a escolha faz — que
     é o que as setas nos cartões inimigos passaram a fazer.

     A única excepção é o passo de escolher alvo: aí o campo é a lista de
     alvos, e tocar num deles é apontá-lo. */
  const gesto = _afPasso ? `_afAlvo('${c.id}')` : `_afFicha('${c.id}')`;

  const alvejavel = _afPasso && _afEhAlvo(c);

  return `<div class="${cls} ${alvejavel ? 'alvo' : ''}" id="cbLut${c.id}"
       role="button" tabindex="0" onclick="${gesto}"
       title="${esc(t('af.ficha.abrir', { nome: _afNome(c) }))}"
       style="--x:${x}%;--y:${pos.y}%;--z:${pos.z};--compasso:${c.posto * 0.42}s;z-index:${Math.round(pos.z * 10) + 1}">
    <div class="cb-sombra"></div>
    <div class="cb-anel"></div>
    <!-- A metade de TRÁS dos efeitos que envolvem o corpo (o anel da
         Concha): vem antes do corpo no DOM e por isso é pintada atrás
         dele. A metade da frente fica na .cb-efeitos. -->
    <div class="cb-efeitos-tras"></div>
    <div class="cb-corpo">${_afCorpo(c)}</div>
    <div class="cb-efeitos"></div>
    <div class="cb-etiqueta">${esc(_afNome(c))}</div>
    ${marcas.length ? `<div class="cb-marcas">${marcas.join('')}</div>` : ''}
  </div>`;
}

function _afCampo() {
  return _afE.A.concat(_afE.B).map(_afLutador).join('');
}

/* Os pés têm de assentar. Palavra por palavra a mesma conta do
   js/combate-pve.js, e pela mesma razão: o viewBox do avatar muda de
   bicho para bicho, e a sombra e o anel existem para dizer "isto está
   aqui, em pé".

   Soma-se ao que já lá está, para a função poder correr a cada desenho
   sem se desfazer a si própria. */
function _afAssentar() {
  const campo = document.getElementById('cbCampo');
  if (!campo) return;
  for (const posto of campo.querySelectorAll('.cb-posto')) {
    const corpo = posto.querySelector('.cb-corpo');
    const svg   = corpo && corpo.querySelector('svg');
    if (!svg || !svg.getBBox) continue;

    /* ── MEDE-SE DE PÉ, MESMO QUEM JÁ CAIU ──

       A conta usa a matriz do ecrã (`getScreenCTM`) e lê dela só a
       escala vertical. Num corpo CAÍDO essa matriz tem uma rotação lá
       dentro, portanto `m.f + y*m.d` deixa de ser o fundo da tinta — é
       outro ponto qualquer.

       Medido: o meu caído ficava com o fundo exactamente na linha do
       chão, e o do inimigo 156px mais abaixo, com 92px do corpo
       escondidos por baixo do painel dos cartões. Os dois lados têm
       ângulos simétricos (−58° e +58°) e a diferença vinha daqui.

       Tira-se a classe para medir e volta a pôr-se. O que a conta corrige
       é o viewBox do desenho, que não muda por ele estar deitado — e a
       correcção passa a ser a mesma quer ele caia agora quer a tela se
       refaça com ele já no chão. */
    const caido = posto.classList.contains('caido');
    const transicao = corpo.style.transition;
    if (caido) { corpo.style.transition = 'none'; posto.classList.remove('caido'); }

    let caixa = null, mm = null;
    try { caixa = svg.getBBox(); mm = svg.getScreenCTM(); } catch (e) { caixa = null; }
    if (caixa && caixa.height && mm) {
      const tinta = mm.f + (caixa.y + caixa.height) * mm.d;
      const chao  = posto.getBoundingClientRect().top;
      const atual = parseFloat(corpo.style.top) || 0;
      corpo.style.top = Math.round(atual + (chao - tinta)) + 'px';

      /* ── A ALTURA DA CABEÇA, MEDIDA ──

         O nome e as marcas ficavam a uma altura CALCULADA a partir da
         caixa do desenho — como se todo bicho enchesse a caixa. Não
         enche: um jovem usa um desenho de 200×200 dentro de uma caixa
         feita para 200×260, e a tinta dele ocupa 157 unidades de altura
         contra as 204 de um ancião. As marcas ficavam no ar, esperando um
         corpo adulto que não estava lá.

         A medida já estava aqui, para assentar os pés: a altura da tinta
         vezes a escala do desenho na tela. Passa a ir também para o
         `--cabeca` do posto, e o CSS pendura o nome e as marcas nela. */
      posto.style.setProperty('--cabeca', Math.round(caixa.height * Math.abs(mm.d)) + 'px');

      /* ── E A CAIXA DOS EFEITOS, DO TAMANHO DO CORPO DE AGORA ──

         Ela tinha o tamanho da caixa do DESENHO, e o desenho de um jovem
         enche só a metade de baixo dela (medido: a tinta de um avatar de
         fase 1 começa a 43–50% da altura). O clarão, as partículas, o
         número, o escudo do Scutum e a mira dos projéteis apontavam para
         o meio da caixa — no ar, acima da cabeça dele.

         Agora ela é a tinta, mais uma folga pequena, com os pés no mesmo
         sítio: um jovem ganha efeitos do tamanho dele, um ancião alado os
         seus, e quem vai para trás (menor) ou para a frente leva a caixa
         junto — o campo refaz-se a cada troca e isto mede de novo. */
      const efe = posto.querySelector('.cb-efeitos');
      const tras = posto.querySelector('.cb-efeitos-tras');
      for (const caixaFx of [efe, tras]) {
        if (!caixaFx) continue;
        caixaFx.style.width  = Math.round(caixa.width  * Math.abs(mm.a) * 1.06) + 'px';
        caixaFx.style.height = Math.round(caixa.height * Math.abs(mm.d) * 1.03) + 'px';
      }
    }

    if (caido) {
      posto.classList.add('caido');
      void corpo.offsetWidth;
      corpo.style.transition = transicao;
      /* Aqui, e não no _afTombar: o campo refaz-se muitas vezes com o
         mesmo morto lá dentro (uma jogada qualquer muda a chave), e o X
         tem de voltar em todas elas. O _afTombar só corre na tela em que
         ele cai. */
      _afOlhosEmX(posto);
    }
  }
}

/* ══ A TROCA DE POSTO, DESLIZADA ══

   Primeiro-Último-Inverter-Soltar: mediu-se onde estavam (a fotografia),
   deixou-se o navegador pô-los onde vão ficar, e agora empurram-se de
   volta ao sítio antigo com a transição desligada — para, no instante
   seguinte, se soltar o empurrão e eles viajarem sozinhos.

   O TAMANHO viaja com a posição. Os postos de trás são menores (o
   `--escala` do css/combate-arena.css sai da profundidade), e sem isto o
   bicho que vem para a frente mudava de tamanho num fotograma e depois
   deslizava — um salto e uma viagem, em vez de uma coisa a aproximar-se.
   O `scale` da razão entre as duas escalas resolve-o, e o posto é um
   PONTO com origem nos pés: o corpo cresce do chão, como cresceria
   quem se aproxima.

   Quem não se mexeu não leva nada: um píxel de diferença é ruído de
   arredondamento e não uma viagem. */
function _afDeslizar(antes) {
  const campo = document.getElementById('cbCampo');
  if (!campo) return;
  const esc = z => 0.42 + 0.58 * z;
  for (const el of campo.querySelectorAll('.cb-posto')) {
    const a = antes[el.id];
    if (!a) continue;
    const r = el.getBoundingClientRect();
    const dx = a.x - r.left, dy = a.y - r.top;
    const z = parseFloat(el.style.getPropertyValue('--z')) || 1;
    const k = esc(a.z) / esc(z);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(k - 1) < 0.01) continue;

    el.style.transition = 'none';
    el.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(${k.toFixed(3)})`;
    void el.offsetWidth;
    el.style.transition = 'transform .46s cubic-bezier(.33,.86,.32,1)';
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; el.style.transform = ''; }, 500);
  }
}

/* ══ A QUEDA ══

   Quem está no chão agora e não estava na fotografia acabou de cair. O
   corpo vem do desenho já deitado (é uma tela nova), portanto a animação
   corre ao contrário do que parece: começa de pé e acaba onde o CSS já
   o pôs — e por isso não precisa de `forwards`.

   O pó e o anel saem a meio da queda e não no fim: o corpo bate no chão
   aos 70% do tempo, e é aí que o chão responde. Pô-los no fim dava uma
   poeira que nascia depois de o bicho já estar quieto. */
function _afTombar(antes) {
  const campo = document.getElementById('cbCampo');
  if (!campo) return;
  for (const el of campo.querySelectorAll('.cb-posto.caido')) {
    const a = antes[el.id];
    if (a && a.caido) continue;            // já lá estava
    if (!a) continue;                      // primeira tela: não caiu, apareceu
    el.classList.add('tombando');
    setTimeout(() => { _afPoeira(el); _afOnda(el); }, 380);
    setTimeout(() => el.classList.remove('tombando'), 720);
  }
}

/* ══ OS OLHOS DE QUEM CAIU ══

   Dois traços cruzados por cima de cada olho. Não se desenham no
   js/data.js — o gerador do avatar serve a colónia, o mercado, a
   linhagem e a árvore, e nenhum desses tem o conceito de "caído"; um
   olho cruzado escondido em todos eles seria marcação a viajar por seis
   telas à espera de uma classe que só existe aqui.

   Desenha-se aqui, e MEDINDO: o `getBBox` de cada `.av-olho-un` dá o
   centro e o tamanho do olho, sejam eles os oito tipos que o gerador
   sabe fazer — do círculo ao losango ao triângulo. Repetir a conta do
   `cx` do gerador era escrever a mesma geometria duas vezes, e a segunda
   cópia ficaria para trás no dia em que se acrescentasse um nono tipo.

   É o mesmo truque que o js/minigames.js já usa para saber onde estão os
   olhos. */
function _afOlhosEmX(el) {
  const svg = el.querySelector('.cb-corpo svg');
  if (!svg || svg.querySelector('.cb-olho-x')) return;
  for (const olho of svg.querySelectorAll('.av-olho-un')) {
    let b = null;
    try { b = olho.getBBox(); } catch (e) { b = null; }
    if (!b || !b.width || !b.height) continue;
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    const r = Math.max(b.width, b.height) * 0.38;
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', 'cb-olho-x');
    p.setAttribute('d', `M${(cx - r).toFixed(1)} ${(cy - r).toFixed(1)}`
                      + `L${(cx + r).toFixed(1)} ${(cy + r).toFixed(1)}`
                      + `M${(cx + r).toFixed(1)} ${(cy - r).toFixed(1)}`
                      + `L${(cx - r).toFixed(1)} ${(cy + r).toFixed(1)}`);
    /* Irmão do olho e não filho: o CSS apaga o olho inteiro, e um X lá
       dentro desaparecia com ele. */
    olho.parentNode.appendChild(p);
  }
}

// ═══════════════════════════════════════════════════════════════════
// OS CARTÕES DE BAIXO
//
// Um por lutador, por ordem de POSTO e não por ordem de entrada: a fila
// de cartões é a formação vista de lado, e ler os dois de cima para
// baixo tem de dar a mesma ordem.
// ═══════════════════════════════════════════════════════════════════
/* A barra leva TRÊS elementos e não um: o <u> é o rastro que fica onde
   a vida estava, o <i> é o enchimento, o <span> é o número. É a mesma
   marcação do js/combate-pve.js porque é o mesmo CSS — inventar aqui uma
   estrutura própria dava uma barra sem rastro e ninguém saberia porquê. */
/* ── O QUE O JOGADOR JÁ SABE DE UM INIMIGO ──
   Os avatares do jogador (lado A) mostram tudo. Os inimigos só o que o
   jogador descobriu examinando ou acertando golpes (fuConhece, em
   js/combate-fu.js). A barra continua a descer à vista de todos; o número
   exato só aparece a partir do primeiro degrau do exame. */
function _afConhece(c) {
  if (!c || c.lado === 'A' || !_afE || typeof fuConhece !== 'function') return { nivel: 3, af: {} };
  return fuConhece(_afE, 'A', c.id);
}
function _afNumeros(c, atual, max) {
  return (!c || _afConhece(c).nivel >= 1) ? atual + '/' + max : '?';
}

function _afBarra(atual, max, tipo, c) {
  const f = Math.max(0, Math.min(100, (atual / Math.max(1, max)) * 100));
  const baixa = (tipo === 'pv' && f <= 25) ? ' baixa' : '';
  return `<div class="cb-barra ${tipo}${baixa}">
    <u style="width:${f}%"></u><i style="width:${f}%"></i>
    <span>${_afNumeros(c, atual, max)}</span></div>`;
}

/* ── O QUE O MEU GOLPE LHE FAZ ──

   Enquanto um dos meus está escolhido, cada cartão inimigo diz numa seta
   o que o dano DELE faz àquele bicho. É a pergunta do turno — em quem
   bato? — e a resposta estava enterrada em três fichas que era preciso
   abrir uma a uma.

   O tipo é o do avatar escolhido, e é o mesmo tipo para todas as MAGIAS
   dele: o sopro, a barragem, o concentrado e a Devastação usam o
   `ficha.tipo` (ver o js/combate-fu.js). O golpe comum ficou de fora: é
   físico, e físico ninguém resiste nem absorve — então a seta fala só das
   magias, e o texto dela diz isso.

   ── E APARECE NOS TRÊS, SEMPRE ──

   Mostrar a seta só a quem tem afinidade deixava os outros dois cartões
   em branco, e um branco quer dizer duas coisas ao mesmo tempo: "leva o
   dano normal" e "ainda não escolheste ninguém". O traço do `nada` custa
   um caractere e fecha essa ambiguidade.

   ── AS QUATRO MARCAS ──

   Para cima e para baixo nas duas que são mais e menos do mesmo. As
   outras duas não são: a imunidade não é "muito menos", é NADA, e a
   absorção não é menos nenhum — é ao contrário, e uma seta para baixo
   diria a um jogador apressado que ainda valia a pena bater. */
const AF_SETAS = { VU: '▲', RS: '▼', IM: '⊘', AB: '✚', nada: '–' };

function _afSetaVs(c, meu) {
  if (meu || !_afE) return '';
  const eu = _afPorId(_afQuem);
  if (!eu || eu.lado === c.lado || !eu.ficha) return '';
  const tipo = eu.ficha.tipo;
  /* A seta só diz o que o jogador já sabe: tudo a partir do degrau 2 do
     exame, ou a afinidade que um golpe daquele tipo já revelou. */
  const sabe = _afConhece(c);
  const af = sabe.nivel >= 2 ? (((c.ficha.afinidades || {})[tipo]) || 'nada') : (sabe.af[tipo] || null);
  if (!af) return `<span class="cb-vs oculto" title="${esc(t('af.vs.oculto', {
    tipo: t('af.tipo.' + tipo), nome: _afNome(eu) }))}">?</span>`;
  return `<span class="cb-vs ${af}" title="${esc(t('af.vs.' + af, {
    tipo: t('af.tipo.' + tipo), nome: _afNome(eu) }))}">${AF_SETAS[af]}</span>`;
}

/* O cartão. A classe `entra` é a que o CSS acende — lá era "este pode
   entrar em campo", aqui é "este ainda pode agir nesta rodada". É a
   mesma pergunta debaixo dos dois motores: em qual destes posso tocar
   agora?

   ── OS PM DO INIMIGO PASSARAM A APARECER ──

   Não apareciam, e a razão escrita era que a incerteza é metade do
   combate: saber quanta magia lhe resta é saber que ele não vai lançar
   nada.

   O argumento não sobreviveu ao motor novo. A magia mais cara do jogo
   custa 30 PM e um inimigo de nível médio tem 50 ou 60 — a barra dele
   quase nunca chega perto do fundo, portanto a "certeza" que ela dava
   era rara. E o que ela tirava era constante: os dois lados da tela
   passaram a ser dois cartões com o mesmo desenho, e um deles tinha uma
   barra a menos sem nada que dissesse porquê. Lia-se como defeito, que
   foi como o dono do jogo a leu.

   Com os PM à vista, a decisão de aguentar mais uma rodada em vez de
   gastar tudo passa a ter dados dos dois lados. */
function _afCartao(c) {
  const meu = c.lado === 'A';
  const podeAgir = _afPodeAgir(c);
  const lado = meu ? 'eu' : 'ini';
  const cls = ['cb-ficha', lado, _afQuem === c.id ? 'ativo' : '',
               _afVivoVisivel(c) ? '' : 'caido', (meu && podeAgir) ? 'entra' : ''].join(' ');
  /* O card é o atalho de AGIR. Um avatar meu que não pode agir agora
     abria a ficha, e isso atrapalhava: tocava-se no card para jogar e
     aparecia uma janela por cima da batalha. Agora ele só avisa por que
     não — a ficha continua no corpo dele, em campo. Os do inimigo seguem
     abrindo a ficha, que é o único jeito de a ver deste lado. */
  const gesto = !meu ? `_afFicha('${c.id}')`
    : (podeAgir && !_afPasso) ? `_afEscolherQuem('${c.id}')`
    : `_afCartaoSemVez('${c.id}')`;
  const dica = !meu ? t('af.ficha.abrir', { nome: _afNome(c) })
    : podeAgir ? t('af.menu.abrir') : _afPorQueNao(c);
  return `<div class="${cls}" id="cbCart${c.id}"
       role="button" tabindex="0" onclick="${gesto}"
       title="${esc(dica)}">
    <!-- O número do posto fica AO LADO do retrato, à esquerda, e não em
         cima dele: no canto da figura ele cobria justamente a cara do
         bicho. O número e o retrato vão num contêiner próprio porque os
         cartões do inimigo são espelhados (row-reverse), e só assim o
         número fica à esquerda da figura nos dois lados. -->
    <div class="cb-ficha-rosto">
      <span class="cb-ficha-nivel">${c.posto + 1}</span>
      <div class="cb-ficha-cara">
        ${typeof gerarSVG === 'function' ? gerarSVG(c.ficha, c.ficha.raridade, c.ficha.seed, 100, 100, _afFase(c)) : ''}
      </div>
    </div>
    <div class="cb-ficha-barras">
      <div class="cb-ficha-nome">${esc(_afNome(c))}</div>
      ${_afBarra(_afPvVisivel(c), c.ficha.pvMax, 'pv', c)}
      ${_afBarra(_afPmVisivel(c), c.ficha.pmMax, 'pm', c)}
    </div>
    ${_afSetaVs(c, meu)}
  </div>`;
}

function _afHud(lado) {
  return fuFormacao(_afE, lado).map(_afCartao).join('');
}

// ═══════════════════════════════════════════════════════════════════
// DESENHAR
// ═══════════════════════════════════════════════════════════════════
/* ── REFAZER SÓ O QUE MUDOU ──

   A primeira versão reescrevia o innerHTML do campo e dos dois painéis a
   cada desenho, e o desenho corre a cada turno. Custava caro de trs
   maneiras, e nenhuma delas era a velocidade:

     · os avatares recomeçavam a respirar e a piscar do zero, todos ao
       mesmo tempo, portanto os seis piscavam em uíssono — e o desencontro
       era o que os fazia parecer vivos;
     · o rastro branco das barras nunca chegava a ver-se, porque a barra
       nascia já no valor novo e não havia de onde descer;
     · e o _afAssentar tinha de voltar a medir seis SVGs.

   Agora há uma CHAVE DE ESTRUTURA: quem está vivo, em que posto, quem
   pode agir, quem está escolhido. Só quando ela muda é que o HTML se
   refaz; no resto do tempo mexem-se as barras e as classes, em cima do
   que já lá está. */
function _afChaveEstrutura() {
  const vez = _afE.acabou ? null : fuVez(_afE);
  return _afE.A.concat(_afE.B)
    .map(c => c.id + c.posto + (_afVivoVisivel(c) ? 'v' : 'x'))
    .join('|') + '#' + (_afQuem || '') + '#' + (_afPasso ? 'p' : '')
    + '#' + (vez ? vez.lado + vez.podem.join(',') : 'fim')
    // e o que o jogador sabe dos inimigos: um exame novo redesenha as setas
    + '#' + (_afE.conhece ? JSON.stringify(_afE.conhece.A) : '');
}

let _afChave = null;

/* ══ A FOTOGRAFIA DE ANTES ══

   Onde estava cada posto, e quem já estava no chão, no instante ANTES de
   o campo se refazer.

   É disto que vivem as duas animações desta tela, e por uma razão que
   não é óbvia: o campo refaz-se por innerHTML sempre que a ESTRUTURA
   muda — quem está vivo, em que posto — e uma troca de postos e uma
   morte são exactamente isso. Os elementos são outros, novos, já na
   posição final e já com a classe `caido`.

   Um elemento novo não tem de onde transitar. Era por isso que a queda
   não tinha animação nenhuma (o corpo aparecia deitado) e a troca de
   lugar era um salto instantâneo: o CSS prometia meio segundo de
   rotação numa `transition` que nunca chegava a disparar, porque não
   havia estado anterior para sair.

   Com a fotografia há: sabe-se de onde cada um veio e quem acabou de
   cair, e as duas animações passam a ser possíveis. */
function _afFotografia() {
  const campo = document.getElementById('cbCampo');
  const f = {};
  if (!campo) return f;
  for (const el of campo.querySelectorAll('.cb-posto')) {
    const r = el.getBoundingClientRect();
    f[el.id] = { x: r.left, y: r.top,
                 z: parseFloat(el.style.getPropertyValue('--z')) || 1,
                 caido: el.classList.contains('caido') };
  }
  return f;
}

function _afDesenhar() {
  if (!_afE) return;
  _afMare();
  const chave = _afChaveEstrutura();
  if (chave !== _afChave) {
    const antes = _afFotografia();
    _afChave = chave;
    document.getElementById('cbCampo').innerHTML = _afCampo();
    document.getElementById('cbHudEu').innerHTML  = _afHud('A');
    document.getElementById('cbHudIni').innerHTML = _afHud('B');
    _afAssentar();
    _afDeslizar(antes);
    _afTombar(antes);
    // Os efeitos que ficam: pela memória no meio de uma jogada, pelo modelo fora dela.
    if (_afSegredo) _afAurasRedesenhar();
  }
  if (!_afSegredo) _afAurasDoModelo(null);
  _afBarras();
  const vez = _afE.acabou ? null : fuVez(_afE);
  const ms = typeof fuMorteSubita === 'function' && fuMorteSubita(_afE);
  document.getElementById('cbTurno').textContent =
    t('af.ronda', { n: _afRondaVisivel() })
    + (ms ? ' · ' + t('af.morte_subita') : '')
    + (vez ? ' · ' + t(vez.lado === 'A' ? 'af.vez' : 'af.vez_dele') : '');
  // A barra do topo muda de cor na morte súbita: ver css/combate-arena.css.
  const palco = document.getElementById('cbPalco');
  if (palco) palco.classList.toggle('morte-subita', ms);
  const bd = document.getElementById('cbDesistir');
  if (bd) bd.style.display = _afE.acabou ? 'none' : '';
  _afDica(vez);
  _afAcoes();
  _afMenuMover();
}

/* ── AS BARRAS ──

   Não saltam para o valor novo: o enchimento desce depressa e o RASTRO
   branco por baixo fica onde estava, e só o segue meio segundo depois. É
   nesse intervalo que se lê QUANTO é que o golpe custou — sem ele, uma
   barra que encolhe diz que houve dano e não diz que dano.

   A subir é ao contrário: o rastro vai à frente, senão o verde novo
   aparecia por cima de uma faixa branca que ainda não tinha crescido. */
/* ══ O QUE AINDA NÃO FOI REVELADO ══

   Durante um turno cadenciado o MODELO já está no fim: o motor resolve o
   turno inteiro antes de se desenhar o que quer que seja. Se as barras
   lessem o modelo, a vida dos três alvos de uma barragem caía toda no
   primeiro fotograma, e as batidas seguintes eram números a flutuar
   sobre barras que já tinham descido.

   Este mapa guarda, para quem ainda tem batida por tocar, o valor que
   ele tinha ANTES do turno. Cada um sai daqui quando a sua batida toca.

   ── PORQUE É UM VALOR E NÃO UMA LISTA DE NOMES ──

   À primeira era um conjunto de ids, e o _afBarras saltava-os. Não
   chegou: o campo e os cartões refazem-se por innerHTML sempre que a
   chave de estrutura muda — e ela muda em todos os turnos, porque tem o
   `_afQuem` lá dentro. O _afCartao escrevia a barra com `c.pv`, que já
   é o valor final, e o salto voltava a entrar pela porta do lado.

   Com o valor guardado, quem desenha o cartão tem o que mostrar. O de
   ANTES sai da conta do próprio evento (o que ficou, mais o que perdeu,
   menos o que a absorção lhe deu) — é a única fonte que sabe o meio do
   turno, porque o modelo já não sabe. */
let _afSegredo = null;

/* ── E QUEM MORRE SÓ CAI NA BATIDA EM QUE MORRE ──

   O modelo já sabe, antes da primeira batida, quem vai cair no turno. O
   campo se refazia no começo da sequência com o corpo já deitado — e a
   queda, as marcas sumindo e o cartão cinzento aconteciam antes de os
   dados do golpe fatal sequer rolarem.

   Este conjunto guarda quem cai neste turno e ainda não levou o golpe.
   Para o desenho, esses continuam vivos; a batida do golpe tira o id
   daqui, refaz o campo, e é aí que a queda anima. */
let _afMorreAinda = null;

function _afVivoVisivel(c) {
  return !!c && (c.vivo || !!(_afMorreAinda && _afMorreAinda.has(c.id)));
}

/* A vida a mostrar para este lutador: a de antes enquanto a batida dele
   não tocou, a do modelo em todo o resto do tempo. Uma porta só, e as
   duas telas que desenham barras passam por ela. */
function _afPvVisivel(c) {
  const g = _afSegredo && _afSegredo.get(c.id);
  return (g && g.pv != null) ? g.pv : c.pv;
}
function _afPmVisivel(c) {
  const g = _afSegredo && _afSegredo.get(c.id);
  return (g && g.pm != null) ? g.pm : c.pm;
}

/* Uma barra, com valores DITOS em vez de lidos do modelo. É por aqui que
   a cadência escreve o meio do turno, e é a mesma função que o _afBarras
   usa no fim — para não haver duas maneiras de pintar a mesma barra. */
function _afBarraDe(id, pv, pm) {
  const c = _afPorId(id);
  const linha = id ? document.getElementById('cbCart' + id) : null;
  if (!c || !linha) return;
  if (pv != null) {
    const f = Math.max(0, Math.min(100, (pv / Math.max(1, c.ficha.pvMax)) * 100));
    const b = linha.querySelector('.cb-barra.pv');
    if (b) {
      const cheio = b.querySelector('i'), rastro = b.querySelector('u');
      const antes = parseFloat(cheio.style.width) || 0;
      if (f > antes) rastro.style.width = f + '%';   // a subir, vai à frente
      cheio.style.width  = f + '%';
      rastro.style.width = f + '%';                  // a descer, o CSS atrasa-o
      b.classList.toggle('baixa', _afVivoVisivel(c) && f <= 25);
      const txt = b.querySelector('span');
      if (txt) txt.textContent = _afNumeros(c, pv, c.ficha.pvMax);
    }
  }
  if (pm != null) {
    const f = Math.max(0, Math.min(100, (pm / Math.max(1, c.ficha.pmMax)) * 100));
    const b = linha.querySelector('.cb-barra.pm');
    if (b) {
      b.querySelector('i').style.width = f + '%';
      b.querySelector('u').style.width = f + '%';
      const txt = b.querySelector('span');
      if (txt) txt.textContent = _afNumeros(c, pm, c.ficha.pmMax);
    }
  }
}

/* ── A MARÉ DA BATALHA ──

   Uma barra no alto do palco que diz, de relance, quem está ganhando: a
   vida somada dos três de cada lado. Ela desliza para o lado de quem
   está por cima, e o losango dourado marca a fronteira.

   É a única leitura do estado GERAL da luta que existe — os cartões
   dizem a vida de cada um, e somá-los de cabeça no meio de um turno é
   trabalho que a tela pode fazer.

   Sobre o EXAMINAR: a barra usa as mesmas vidas que as barrinhas dos
   cartões já mostram a todos, portanto não revela nada de novo. Só os
   NÚMEROS respeitam o segredo — o total do inimigo fica em '?' enquanto
   houver um inimigo por examinar. */
function _afMare() {
  const trilho = document.getElementById('cbMareEu');
  if (!trilho || !_afE) return;
  const soma = lado => lado.reduce((n, c) => n + Math.max(0, _afPvVisivel(c)), 0);
  const eu = soma(_afE.A), ini = soma(_afE.B);
  const total = eu + ini;
  const parte = total > 0 ? (eu / total) * 100 : 50;

  trilho.style.width = parte.toFixed(1) + '%';
  const marca = document.getElementById('cbMareMarca');
  if (marca) marca.style.left = parte.toFixed(1) + '%';

  const caixa = document.getElementById('cbMare');
  if (caixa) {
    caixa.classList.toggle('ganhando', parte > 55);
    caixa.classList.toggle('perdendo', parte < 45);
  }

  const rotEu = document.getElementById('cbMareVidaEu');
  if (rotEu) rotEu.textContent = eu;
  const rotIni = document.getElementById('cbMareVidaIni');
  if (rotIni) {
    // O total do inimigo só se mostra quando não há segredo nenhum.
    const tudoSabido = _afE.B.every(c => _afConhece(c).nivel >= 1);
    rotIni.textContent = tudoSabido ? ini : '?';
  }
}

function _afBarras() {
  if (!_afE) return;
  _afMare();
  for (const c of _afE.A.concat(_afE.B)) {
    const linha = document.getElementById('cbCart' + c.id);
    if (linha) {
      const pvV = _afPvVisivel(c), pmV = _afPmVisivel(c);
      const fPV = Math.max(0, Math.min(100, (pvV / Math.max(1, c.ficha.pvMax)) * 100));
      const pv = linha.querySelector('.cb-barra.pv');
      if (pv) {
        const cheio = pv.querySelector('i'), rastro = pv.querySelector('u');
        const antes = parseFloat(cheio.style.width) || 0;
        if (fPV > antes) rastro.style.width = fPV + '%';   // a subir, vai à frente
        cheio.style.width  = fPV + '%';
        rastro.style.width = fPV + '%';                    // a descer, o CSS atrasa-o
        pv.classList.toggle('baixa', _afVivoVisivel(c) && fPV <= 25);
        const txt = pv.querySelector('span');
        if (txt) txt.textContent = _afNumeros(c, pvV, c.ficha.pvMax);
      }
      // dos dois lados agora: o inimigo também mostra a magia dele
      const pm = linha.querySelector('.cb-barra.pm');
      if (pm) {
        const fPM = Math.max(0, Math.min(100, (pmV / Math.max(1, c.ficha.pmMax)) * 100));
        pm.querySelector('i').style.width = fPM + '%';
        pm.querySelector('u').style.width = fPM + '%';
        const txt = pm.querySelector('span');
        if (txt) txt.textContent = _afNumeros(c, pmV, c.ficha.pmMax);
      }
      linha.classList.toggle('caido', !_afVivoVisivel(c));
    }
    const posto = document.getElementById('cbLut' + c.id);
    if (posto) posto.classList.toggle('caido', !_afVivoVisivel(c));
  }
}

// ═══════════════════════════════════════════════════════════════════
// O CICLO
//
// Uma função só, chamada depois de cada jogada. Ela decide de quem é a
// vez e não guarda nada a esse respeito — quem sabe é o motor
// (fuVez), e ter aqui uma segunda ideia de quem joga a seguir era
// garantir que as duas discordavam um dia.
// ═══════════════════════════════════════════════════════════════════
function _afRondaVisivel() {
  const max = (typeof FU_RONDAS_MAX === 'number') ? FU_RONDAS_MAX : Infinity;
  return Math.min(_afE.ronda, max);
}

function _afAndar() {
  if (!_afE) return;
  if (_afE.acabou) { _afFim(); return; }

  const vez = fuVez(_afE);
  if (!vez) {
    const ev = fuNovaRonda(_afE);
    /* A rodada 50 avisa que é a última, e a que passaria dela não começa:
       o motor já fechou a batalha em empate (FU_RONDAS_MAX). */
    const max = (typeof FU_RONDAS_MAX === 'number') ? FU_RONDAS_MAX : 50;
    const chave = ev.limite ? 'af.lance.limite'
                : ev.n === max ? 'af.lance.ultima'
                : ev.morteSubita ? 'af.lance.morte_subita' : 'af.lance.ronda';
    _afLance('<i>' + t(chave, { n: ev.n, max }) + '</i>');
    /* Ocupado até a vez da rodada nova ser decidida, como na abertura
       (afAbrir). Sem isto havia meio segundo em que o jogador agia, e o
       inimigo, a quem a vez tocava, jogava por cima da jogada dele. */
    _afOcupado = true;
    _afDesenhar();
    setTimeout(_afAndar, AF_PAUSA / 2);
    return;
  }

  if (vez.lado === 'B') {
    _afOcupado = true;
    _afQuem = null; _afMenu = false; _afPasso = null;
    _afDesenhar();
    setTimeout(_afInimigoAge, AF_PAUSA);
    return;
  }

  /* A vez é minha. Não se escolhe por mim qual dos três joga: os três
     podem, e escolher qual é metade da decisão do turno. O que se faz é
     dizer quais podem — o resto é do jogador. */
  _afOcupado = false;
  if (!_afPodeAgir(_afPorId(_afQuem))) { _afQuem = null; _afMenu = false; }
  _afDesenhar();
}

/* ── A DICA DO QUE FAZER ──
   Só na vez do jogador e com a tela parada: durante a animação de um
   turno ninguém pode agir, e a dica mentiria. Com um avatar escolhido e
   o menu aberto, diz de quem é a escolha; no passo de apontar um alvo o
   próprio menu já pergunta, e a dica some. */
function _afDica(vez) {
  const el = document.getElementById('cbDica');
  if (!el || el.classList.contains('aviso')) return;
  let txt = '';
  if (vez && vez.lado === 'A' && !_afOcupado && !_afE.acabou && !_afPasso) {
    const eu = _afPorId(_afQuem);
    txt = eu ? t('af.dica.acao', { nome: _afNome(eu) }) : t('af.dica.quem');
  }
  el.textContent = txt;
  el.classList.toggle('viva', !!txt);
}

/* Por que um avatar meu não pode agir agora. */
function _afPorQueNao(c) {
  if (!c || !_afE || _afE.acabou) return '';
  if (!c.vivo) return t('af.aviso.caido', { nome: _afNome(c) });
  if (_afE.jaAgiu.indexOf(c.id) !== -1) return t('af.aviso.ja_agiu', { nome: _afNome(c) });
  return t('af.aviso.espere');
}

/* O aviso vai no lugar da dica, embaixo da maré, e some sozinho. */
let _afAvisoTimer = null;
function _afCartaoSemVez(id) {
  if (_afPasso) return;   // escolhendo um alvo: o toque não é para isto
  const txt = _afPorQueNao(_afPorId(id));
  const el = document.getElementById('cbDica');
  if (!txt || !el) return;
  el.textContent = txt;
  el.classList.add('viva', 'aviso');
  clearTimeout(_afAvisoTimer);
  _afAvisoTimer = setTimeout(() => {
    el.classList.remove('aviso');
    if (_afE) _afDica(_afE.acabou ? null : fuVez(_afE));
  }, 2200);
}

function _afPorId(id) {
  if (!_afE || !id) return null;
  return _afE.A.concat(_afE.B).filter(c => c.id === id)[0] || null;
}

function _afPodeAgir(c) {
  if (!c || !_afE || _afE.acabou || !c.vivo) return false;
  if (_afE.jaAgiu.indexOf(c.id) !== -1) return false;
  const vez = fuVez(_afE);
  return !!vez && vez.lado === c.lado && vez.podem.indexOf(c.id) !== -1;
}

function _afEscolherQuem(id) {
  if (_afOcupado || _afPasso) return;
  const c = _afPorId(id);
  if (!_afPodeAgir(c)) return;
  _afQuem = (_afQuem === id && _afMenu) ? null : id;
  _afMenu = !!_afQuem;
  _afDesenhar();
}

// ═══════════════════════════════════════════════════════════════════
// O MENU DE ORBES
//
// Fica ao lado do avatar que está a decidir, não numa barra em baixo.
// O _afMenuMover lê a posição do posto em vez de a escrever à mão: o
// posto muda de sítio com a largura do ecrã, e um menu com coordenadas
// próprias discordaria dele ao primeiro telemóvel.
// ═══════════════════════════════════════════════════════════════════
function _afMenuMover() {
  const menu = document.getElementById('cbMenu');
  if (!menu) return;
  const acabou = _afE && _afE.acabou;
  menu.classList.toggle('aberto', (!!_afMenu && !!_afQuem) || !!_afPasso || !!acabou);
  menu.classList.toggle('fim', !!acabou);
  /* O palco fica sabendo que o menu está aberto. No celular o menu é uma
     coluna presa no canto de baixo e sobe por cima do céu — que é onde o
     lance mora — e o CSS apaga o lance enquanto se escolhe. */
  const palcoMenu = document.getElementById('cbPalco');
  if (palcoMenu) palcoMenu.classList.toggle('menu-aberto',
    !acabou && ((!!_afMenu && !!_afQuem) || !!_afPasso));
  /* O lado de dentro é de um posto, e no fim não há posto nenhum. O
     painel do fim está a salvo porque escreve `transform` em linha e com
     !important — mas deixar a classe pendurada é deixar uma armadilha
     para o dia em que esse !important sair. */
  if (acabou) menu.classList.remove('dentro');

  /* ── O PAINEL DO FIM, AO MEIO, EM PÍXEIS ──

     O CSS centra-o com `left:50%; top:50%; transform:translate(-50%,-50%)`
     e no banco de ensaio isso pôs-no no canto de cima à esquerda, com o
     botão de sair a sair do palco.

     A razão: as percentagens de um `transform` resolvem-se contra a
     própria caixa do elemento, e o menu MUDA de tamanho no instante em
     que acaba a batalha — sete orbes altos passam a um painel largo e
     baixo. A matriz ficou calculada contra a caixa velha (medida:
     1082×749, quando o painel já só tinha 528×124) e não se recalculou:
     sem animação a correr, o valor assente estava errado.

     Aqui não há percentagem nenhuma. Mede-se o palco, mede-se o painel, e
     escreve-se a conta em píxeis — que não depende de quando o navegador
     decidiu resolvê-la. */
  if (acabou) {
    /* Com `important`, e não por capricho: a regra `.cb-menu.fim` do
       css/combate-arena.css escreve `left:50% !important`, e um
       !important de folha de estilo ganha a um estilo em linha que o não
       seja. Foi assim que a segunda tentativa deixou o painel em 496/368
       — exactamente os 50%, sem o recuo de meia caixa.

       O CSS não se corrige porque ainda é o da arena ANTIGA, que depende
       daquele !important para vencer as coordenadas que o
       arena antiga lhe escrevia. Ela já saiu, portanto o !important do
       CSS também pode sair — fica para o dia em que se varrer o CSS, que
       é um trabalho à parte e com os seus próprios riscos. */
    const palcoFim = document.getElementById('cbPalco');
    const por = (k, v) => menu.style.setProperty(k, v, 'important');
    /* Com a transição desligada durante a conta, pela mesma razão do outro
       ramo: o `transform: none` que se acaba de escrever demora 0,22s a
       chegar, e medir antes disso dá a caixa onde ela ESTAVA. Mediu, e o
       painel do fim ficou 198px à esquerda e 94 acima do palco. */
    const transFim = menu.style.transition;
    menu.style.transition = 'none';
    por('transform', 'none');
    por('left', '0px');
    por('top', '0px');
    if (palcoFim) {
      const pf = palcoFim.getBoundingClientRect();
      const mf = menu.getBoundingClientRect();
      por('left', Math.round((pf.width  - mf.width)  / 2) + 'px');
      por('top',  Math.round((pf.height - mf.height) / 2) + 'px');
    }
    void menu.offsetWidth;
    menu.style.transition = transFim;
    return;
  }
  // fora do fim, tudo volta a ser do CSS
  menu.style.removeProperty('transform');

  /* ══ DE ONDE SAI A COLUNA ══

     Não é sempre o posto de quem está a jogar, e não é medido: é dito.

       posto 0 (frente)   do seu, para fora        ← o sítio de sempre
       posto 1 (meio)     do posto 0, para fora    ← o MESMO sítio
       posto 2 (fundo)    do seu, para DENTRO      ← por cima do do meio

     ── PORQUE É QUE DEIXOU DE SER MEDIDO ──

     Havia aqui uma heurística: abria-se para fora, media-se, e se não
     coubesse virava-se para dentro e media-se outra vez, ficando o lado
     que menos transbordasse. Funcionava — mas a coluna aparecia num de
     dois sítios conforme a largura da janela, o número de orbes daquele
     avatar e o comprimento dos nomes das magias dele.

     Um menu que muda de lado sozinho obriga a PROCURÁ-LO a cada turno.
     E os três avatares são três sítios diferentes num palco onde só há
     dois cantos livres: o do meio não precisa de sítio próprio, porque
     nunca está aberto ao mesmo tempo que o da frente.

     O do fundo é o único que tem de ir para dentro: está a 10% da
     largura, e uma coluna à esquerda dele sai 224px fora do palco. Para
     dentro tapa o companheiro do meio, e isso foi aceite — o que se está
     a ler é o menu.

     A trava horizontal lá em baixo fica, como rede: se nem assim couber,
     empurra. Mas passa a ser o caso raro e não a regra. */
  const palco = document.getElementById('cbPalco');
  const quem = _afPorId(_afQuem);
  if (!palco || !quem) return;

  const irmaos = (quem.lado === 'A' ? _afE.A : _afE.B);
  const ancora = (quem.posto === 1)
    ? (irmaos.filter(c => c.posto === 0)[0] || quem) : quem;
  const posto = document.getElementById('cbLut' + ancora.id);
  if (!posto) return;

  menu.classList.toggle('dentro', quem.posto === 2);

  /* ── E AFASTA-SE O BASTANTE PARA NÃO LHE FICAR EM CIMA ──

     O posto é um PONTO — os pés do avatar — e o corpo está centrado
     nele: metade da tinta fica à direita desse ponto. A coluna saía a
     meia rem do ponto, ou seja, por dentro do próprio bicho que estava a
     jogar. Medido: corpo de 74 a 190, coluna a começar em 145 — 45px de
     sobreposição, e é o bicho que se está a comandar.

     Meia largura de corpo é o que é preciso, e essa largura muda: o
     `--escala` do css/combate-arena.css encolhe os postos de trás, e
     encolhe-os de forma diferente no telemóvel e no computador. Por isso
     mede-se em vez de se escrever um número — um número certo hoje seria
     o número errado à primeira mudança de escala.

     Sai em `--afasta`, e o CSS usa-o no lugar da meia rem. */
  const corpoAncora = posto.querySelector('.cb-corpo');
  if (quem.posto === 2 && corpoAncora) {
    const cr = corpoAncora.getBoundingClientRect();
    const pr = posto.getBoundingClientRect();
    menu.style.setProperty('--afasta', Math.round((cr.right - pr.left) + 12) + 'px');
  } else {
    menu.style.removeProperty('--afasta');
  }
  /* E tira-se o `important` que o painel do fim possa ter deixado: uma
     prioridade esquecida prendia o menu ao centro para o resto da
     sessão, e a batalha seguinte abria com os orbes no meio do palco. */
  menu.style.removeProperty('left');
  menu.style.removeProperty('top');
  const p = palco.getBoundingClientRect(), a = posto.getBoundingClientRect();
  menu.style.left = Math.round(a.left - p.left) + 'px';
  menu.style.top  = Math.round(a.top  - p.top)  + 'px';

  /* ── E NÃO SAI PELO TOPO ──

     A coluna sobe a partir dos pés do avatar (translate −100%, no
     css/combate-arena.css) e cresce com o número de orbes. São SETE
     agora — cinco lugares, reordenar e a ficha — onde a arena antiga
     tinha seis, e no primeiro ensaio quatro deles ficaram acima da borda
     de cima do palco: o jogador via três opções e não sabia que havia
     mais quatro.

     Mede-se e empurra-se para baixo o que for preciso. Medir em vez de
     escrever um limite à mão porque o número de orbes muda com o passo
     (escolher alvo mostra outros tantos) e a altura de cada um muda com
     a escala do `rem`, que é diferente no telemóvel e no PC.

     Corre a cada desenho, portanto corrige-se sozinho se a primeira
     medida apanhar a animação a meio. */
  /* ── QUE CAIBA, E DENTRO ──

     Primeiro encolher, depois empurrar, e nesta ordem: empurrar um menu
     que não cabe só troca o lado por onde ele transborda. No primeiro
     ensaio, com sete orbes, a correcção tirou-o de cima da borda de cima
     e pô-lo em cima dos cartões de baixo.

     ── E MEDE-SE COM A ANIMAÇÃO DESLIGADA ──

     O menu tem uma transição de 0,22s no `transform`. Medi-lo enquanto
     ela corre dá onde ele ESTAVA e não onde vai ficar — a segunda
     medição do ensaio deu 27px acima do palco e a correcção acreditou
     nela. Desligar a transição durante a conta é a única forma de medir
     um sítio onde ele já está.

     Não se vê: liga-se outra vez antes de o navegador pintar. */
  const rodape = palco.querySelector('.cb-rodape');
  const tecto = rodape ? rodape.getBoundingClientRect().top : p.bottom;
  const transicao = menu.style.transition;
  menu.style.transition = 'none';

  const topoParaAltura = palco.querySelector('.cb-topo');
  const deOnde = topoParaAltura ? topoParaAltura.getBoundingClientRect().bottom : p.top;
  menu.classList.remove('apertado');
  if (menu.getBoundingClientRect().height > (tecto - deOnde) - 16)
    menu.classList.add('apertado');

  /* O tecto não é o palco: é o fundo da faixa de topo, onde estão a
     rodada e o botão de desistir. Era o palco, e o primeiro orbe
     escrevia por cima de "Rodada 1 · Sua vez" — 104×19px sobrepostos,
     a ler-se "RODAD⊙VEZ". */
  const folga = 8;
  const topoDaCena = palco.querySelector('.cb-topo');
  const tectoY = topoDaCena ? topoDaCena.getBoundingClientRect().bottom : p.top;

  const r = menu.getBoundingClientRect();
  if (r.top < tectoY + folga) {
    const topo = parseFloat(menu.style.top) || 0;
    menu.style.top = Math.round(topo + ((tectoY + folga) - r.top)) + 'px';
  }

  /* ── E TAMBÉM NA HORIZONTAL ──

     Faltava, e era a queixa maior. O CSS põe a coluna do lado de FORA do
     avatar — à esquerda de quem está do lado esquerdo — para não tapar o
     caminho do golpe nem o lance. Funciona para o da frente, que está a
     36% da largura; mas o do fundo está a 10%, e uma coluna de 343px à
     esquerda de um ponto a 132px sai 224px fora do palco.

     Medido nos três postos, a 1214px de palco:  frente +85  ·  meio −81
     ·  fundo −224. Os dois de trás estavam cortados, e o do fundo perdia
     dois terços dos orbes.

     A trava é a mesma do eixo vertical, e de propósito: uma regra só para
     os dois eixos. Se a borda esquerda sair, empurra-se para dentro; se
     for a direita, puxa-se — e a esquerda ganha quando o menu é mais
     largo do que o palco, porque é por onde se começa a ler.

     Empurrar em vez de trocar de lado: os orbes não têm fundo, portanto
     passar por cima do campo lê-se como uma camada e não como um painel
     a tapar a cena. */
  /* O lado já foi decidido lá em cima, pelo posto. Isto é só a rede:
     empurra para dentro do palco o que tenha ficado de fora. */
  const r2 = menu.getBoundingClientRect();
  const esq = parseFloat(menu.style.left) || 0;
  if (r2.left < p.left + folga)
    menu.style.left = Math.round(esq + ((p.left + folga) - r2.left)) + 'px';
  else if (r2.right > p.right - folga)
    menu.style.left = Math.round(esq - (r2.right - (p.right - folga))) + 'px';

  void menu.offsetWidth;
  menu.style.transition = transicao;
}

/* Os selos. Os mesmos do js/combate-pve.js — desenhos, não emoji, porque
   um emoji é a fonte do sistema a decidir o estilo do jogo. O `mover` é
   novo: duas setas a trocar de lugar, que é exactamente o que a acção
   faz. */
const AF_SELOS = {
  comum: '<path d="M6.5 4.2C9 8 10.2 12 10 19.4"/>'
       + '<path d="M11.8 3.6C14.6 7.6 15.8 11.8 15.4 19.8"/>'
       + '<path d="M17 5.4C19.2 8.8 20 12.2 19.6 18.4"/>',
  forte: '<path d="M12 3 10.5 9.5 13.5 14.5 12 21"/><path d="M7.5 11.5h9"/>',
  muito_forte: '<path d="M12 3 10.5 9.5 13.5 14.5 12 21"/><path d="M7.5 9.5h9M7.5 14.5h9"/>',
  defesa: '<path d="M12 3.5c-3 1.6-5.5 2-5.5 2V12c0 4 3 6.6 5.5 8.5 2.5-1.9 5.5-4.5 5.5-8.5V5.5s-2.5-.4-5.5-2Z"/>'
        + '<path d="M12 7.5c-1.6.9-3 1.1-3 1.1V12c0 2.2 1.6 3.6 3 4.6 1.4-1 3-2.4 3-4.6V8.6s-1.4-.2-3-1.1Z"/>',
  suporte: '<path d="M12 3.5c3.2 3.8 5 6.4 5 9a5 5 0 0 1-10 0c0-2.6 1.8-5.2 5-9Z"/>'
         + '<path d="M12 16.5V9.5M9.5 12 12 9.5l2.5 2.5"/>',
  // dois braços erguidos, em guarda
  guardar: '<path d="M5 12.5 12 7l7 5.5"/><path d="M5 17.5 12 12l7 5.5"/>',
  // uma lupa: examinar o inimigo
  examinar: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="M14.5 14.5 20 20"/>',
  // duas setas que se cruzam: trocar de lugar
  mover: '<path d="M4 8.5h12l-3.5-3.5M20 15.5H8l3.5 3.5"/>',
  voltar: '<path d="M14.5 6 8.5 12l6 6"/>',
  todos: '<circle cx="6" cy="12" r="2.6"/><circle cx="12" cy="12" r="2.6"/>'
       + '<circle cx="18" cy="12" r="2.6"/>',
};

function _afSelo(nome) {
  const d = AF_SELOS[nome];
  if (!d) return '';
  return '<svg class="cb-selo" viewBox="0 0 24 24" aria-hidden="true" fill="none" '
       + 'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" '
       + 'stroke-linejoin="round">' + d + '</svg>';
}

/* O orbe: um disco com o selo lá dentro e, se houver preço, o número
   agarrado ao disco. O nome vem ao lado, com o pormenor em <i>.

   As classes são as do css/combate-arena.css e não inventadas: a
   primeira versão deste arquivo escreveu `.cb-orbe-rot` e
   `.cb-orbe-sub`, que não existem em lado nenhum — os orbes saíam sem
   disco, sem tamanho e sem cor, e a culpa não aparecia em erro nenhum.
   Marcação que o CSS não conhece não se queixa: desaparece. */
function _afOrbe(selo, rot, detalhe, gesto, custo, podeOuNao, efeito) {
  const off = podeOuNao === false;
  const dica = rot + (detalhe ? ' · ' + detalhe : '') + (efeito ? ' · ' + efeito : '');
  return `<button class="cb-orbe" ${off ? 'disabled' : ''}
      onclick="${off ? '' : gesto}" title="${esc(dica)}">
    <span class="cb-orbe-disco">${_afSelo(selo)}${
      custo != null && custo !== '' ? `<span class="cb-orbe-custo">${esc(custo)}</span>` : ''}</span>
    <span class="cb-orbe-nome">${esc(rot)}${detalhe ? `<i>${esc(detalhe)}</i>` : ''}${
      efeito ? `<small class="cb-orbe-efeito">${esc(efeito)}</small>` : ''}</span>
  </button>`;
}

/* ── O QUE CADA MAGIA FAZ, EM UMA LINHA ──

   O menu dizia o nome e a categoria ("Agulha de Luz · Magia Muito
   Forte") e o jogador tinha de adivinhar o resto: em quem cai, quanto
   dói, o que deixa. Agora diz as três coisas, com os números de AGORA —
   o dano sai dos dados atuais do avatar, portanto um avatar envenenado
   vê o dano encolher.

   O dano é uma faixa: o fixo da magia mais o Resultado Alto, que vai de
   1 até a maior face dos dois dados rolados. É o dano antes da defesa e
   das afinidades de quem apanha. */
function _afEfeitoMagia(eu, lugar, m) {
  if (!eu || !_afE) return '';
  const dq = fuDonsDe(eu);
  const extra = (eu.ficha.danoExtra | 0) + ((eu.efeitos && eu.efeitos.danoMais) | 0);
  const faixa = (base, a1, a2) => {
    const max = Math.max(fuDado(eu, a1), fuDado(eu, a2));
    return t('af.ef.dano', { a: base + 1, b: base + max });
  };
  const frente = fuFrente(eu.lado === 'A' ? _afE.B : _afE.A);
  const naFrente = t('af.ef.frente', { nome: frente ? _afNome(frente) : '—' });
  const p = [];

  if (lugar === 'comum' || !m) {
    p.push(naFrente);
    p.push(faixa(5 + extra + (dq.danoMaisGolpe | 0), 'DES', 'VIG'));
    return p.join(' · ');
  }
  if (m.todos) {
    p.push(t('af.ef.todos'));
    p.push(t('af.ef.dano_fixo', { n: m.danoFixo | 0 }));
    return p.join(' · ');
  }
  if (m.cura) {
    // Na morte súbita a cura vale a metade, e o menu mostra o número de agora.
    const cura = Math.floor(m.cura * (eu.morteSubita ? 0.5 : 1));
    p.push(t((m.alvos || 1) > 1 ? 'af.ef.cura_varios' : 'af.ef.cura', { n: cura, a: m.alvos || 1 }));
    if (m.limpa) p.push(t('af.ef.limpa'));
    return p.join(' · ');
  }
  if (m.cena || m.proteger) return t('af.ef.' + m.id);

  // As de ataque.
  p.push(lugar === 'muito_forte' ? t('af.ef.qualquer')
       : (m.alvos || 1) > 1 ? t('af.ef.varios', { n: m.alvos })
       : naFrente);
  p.push(faixa((m.fixo | 0) + extra + (dq.danoMaisMagia | 0), 'PER', 'VON'));
  if (m.estado) p.push(t(m.estadoSempre ? 'af.ef.estado_sempre' : 'af.ef.estado_critico',
                         { e: t('af.est.' + m.estado) }));
  if (m.ignoraResistencias) p.push(t('af.ef.ignora'));
  if (m.estilo && m.estilo.feitio) p.push(t('af.ef.estilo.' + m.estilo.feitio));
  return p.join(' · ');
}

/* O nome de uma magia. As oito Barragens e os oito Concentrados trazem
   o nome consigo (mudam com o tipo do avatar); as outras dez têm nome
   fixo e vêm do i18n. */
function _afMagiaNome(magia) {
  if (!magia) return '';
  if (magia.nome) {
    return (window._currentLang === 'en' && magia.nomeEn) ? magia.nomeEn : magia.nome;
  }
  return t('af.m.' + magia.id);
}

function _afAcoes() {
  const alvo = document.getElementById('cbAcoes');
  if (!alvo || !_afE) return;

  if (_afE.acabou) { alvo.innerHTML = _afFimHTML(); return; }

  const eu = _afPorId(_afQuem);
  if (!eu) { alvo.innerHTML = ''; return; }

  // ── o passo de escolher alvo ──
  if (_afPasso) { alvo.innerHTML = _afAlvosHTML(eu); return; }

  /* Os lugares DELE, e não os cinco. O feitio decide quais são
     (FU_LUGARES_DO_FEITIO, em js/magias-fu.js) e o menu desenha o que
     houver — três orbes, mais o trocar de lugar. */
  const magias = fuMagiasDe(eu.ficha);
  let h = '';
  for (const lugar of Object.keys(magias)) {
    const m = magias[lugar];
    const custo = fuCusto(m, m.porAlvo ? (m.alvos || 1) : 1);
    /* O nome em cima, o lugar em baixo — excepto quando são o mesmo. O
       golpe comum chama-se Golpe Comum e ocupa o lugar Golpe Comum, e o
       orbe saiu a dizer "Golpe ComumGolpe Comum". Uma etiqueta que se
       repete a si própria não informa: enche. */
    const nome = _afMagiaNome(m), rot = t('af.lugar.' + lugar);
    /* A de apoio que não mudaria nada em ninguém fica BLOQUEADA, e diz
       porquê no lugar do efeito (fuPorQueInutil, em js/combate-fu.js). */
    const inutil = _afInutilParaTodos(eu, m);
    h += _afOrbe(lugar, nome, nome === rot ? '' : rot,
      `_afEscolher('${lugar}')`, custo || null,
      custo <= eu.pm && !inutil,
      inutil ? t('af.bloq.' + inutil) : _afEfeitoMagia(eu, lugar, m));
  }

  // reordenar: só se houver com quem
  const meus = (eu.lado === 'A' ? _afE.A : _afE.B).filter(c => c.vivo && c !== eu);
  /* Sem o orbe da ficha: o corpo em campo abre-a, e é onde ela se pede.
     Ocupava um lugar na coluna para repetir um gesto que já existe — e a
     coluna é o que tapa o palco enquanto está aberta. */
  /* ── GUARDAR ──
     Metade do dano até o começo do próximo turno dele, e recupera PM pelo
     dado de VON (o fuAgir, em js/combate-fu.js). Estava no motor e na IA
     dos inimigos, e faltava aqui: o jogador não tinha como guardar. O
     pormenor diz quanto PM volta agora — nada, com o PM cheio. */
  // Guardar de novo, logo depois de ter guardado, corta menos (fuGuardaDe).
  const pmVolta = fuPmDaGuarda(eu);
  // Na morte súbita a guarda só devolve PM: não protege (FU_MORTE_SUBITA).
  const rep = eu.morteSubita ? '_ms' : eu.guardouUltimo ? '_rep' : '';
  h += _afOrbe('guardar', t('af.orbe.guardar'),
    pmVolta ? t('af.orbe.guardar' + rep + '.pm', { n: pmVolta }) : t('af.orbe.guardar' + rep + '.cheio'),
    `_afGuardar()`, null, true);
  // Examinar: gasta o turno e revela a ficha de um inimigo.
  h += _afOrbe('examinar', t('af.orbe.examinar'), '', `_afPedirExaminar()`, null, true);
  h += _afOrbe('mover', t('af.orbe.mover'), '', `_afPedirMover()`, null, meus.length > 0);

  /* ── LUTAR PELO LAÇO ──
     Só aparece quando há com quem: um aliado de pé com laço, e o laço
     ainda por gastar nesta batalha (fuLacoDisponivel). Ligado, vale para a
     próxima ação que rolar dado. */
  const laco = (typeof fuLacoDisponivel === 'function') ? fuLacoDisponivel(_afE, eu) : null;
  if (laco) {
    const ligado = _afLaco === eu.id;
    // Curto, para caber numa linha na coluna do PC; o nome do aliado vai na dica.
    h += `<button class="cb-laco${ligado ? ' ativo' : ''}" aria-pressed="${ligado}"
      title="${esc(t('af.laco.botao.dica', { n: laco.bonus, nome: _afNome(_afPorId(laco.com)) }))}"
      onclick="_afAlternarLaco()">💞 ${esc(t('af.laco.botao', { n: laco.bonus }))}</button>`;
  }
  alvo.innerHTML = h;
}

// ═══════════════════════════════════════════════════════════════════
// ESCOLHER
//
// A regra que decide se há passo de alvo é uma só, e é a da formação:
// uma acção de ALVO ÚNICO contra o inimigo não tem nada a perguntar,
// porque o da frente cobre e o motor manda-a lá de qualquer forma.
// Perguntar "em quem?" para depois ignorar a resposta seria mentir ao
// jogador.
// ═══════════════════════════════════════════════════════════════════
/* A magia de apoio não serve para NINGUÉM que ela alcança? Devolve o
   motivo (o do primeiro aliado), ou null se serve para pelo menos um. As
   de ataque sempre servem. */
function _afInutilParaTodos(eu, m) {
  if (!m || typeof fuPorQueInutil !== 'function') return null;
  if (!(m.aliado || m.cura || m.proprio)) return null;
  const quais = m.proprio ? [eu] : (eu.lado === 'A' ? _afE.A : _afE.B).filter(c => c.vivo);
  let motivo = null;
  for (const c of quais) {
    const r = fuPorQueInutil(_afE, eu, m, c);
    if (!r) return null;
    if (!motivo || r === 'usada') motivo = r;
  }
  // Na que é lançada em si mesma (a Concha), "em todos" não faz sentido.
  if (m.proprio && (motivo || 'ativa') === 'ativa') return 'ativa_si';
  return motivo || 'ativa';
}

function _afEscolher(lugar) {
  if (_afOcupado) return;
  const eu = _afPorId(_afQuem);
  if (!_afPodeAgir(eu)) return;

  /* Um lugar que o feitio dele não tem devolve nulo. O menu nunca o
     oferece, mas a guarda fica: quem chama isto de outro sítio um dia
     não tem de saber das regras do feitio. */
  const magia = fuMagiaDe(eu.ficha, lugar);
  if (!magia) return;
  const custo = fuCusto(magia, magia.porAlvo ? (magia.alvos || 1) : 1);
  if (custo > eu.pm) return;
  if (_afInutilParaTodos(eu, magia)) return;   // bloqueada: não mudaria nada

  // as que se lançam em si mesmo, e a que cai em todos: nada a escolher
  if (magia.proprio || magia.todos) { _afAgir({ tipo: 'magia', magia }); return; }

  // as de dentro: escolhe-se o companheiro
  if (magia.aliado || magia.cura) {
    _afPasso = { lugar, magia, aliado: true };
    _afDesenhar();
    return;
  }

  /* as de fora, com um alvo só: o da frente cobre, não há o que escolher.
     Menos o muito forte do Lâmina, que alcança qualquer inimigo — aí se
     escolhe em quem. */
  if (lugar === 'comum' || ((magia.alvos || 1) === 1 && lugar !== 'muito_forte')) {
    _afAgir({ tipo: lugar === 'comum' ? 'atacar' : 'magia',
              magia: lugar === 'comum' ? null : magia });
    return;
  }

  // as que varrem a linha: aí sim, escolhe-se quantos e quais
  _afPasso = { lugar, magia, aliado: false };
  _afDesenhar();
}

function _afGuardar() {
  if (_afOcupado) return;
  const eu = _afPorId(_afQuem);
  if (!_afPodeAgir(eu)) return;
  _afAgir({ tipo: 'guardar' });
}

function _afPedirMover() {
  if (_afOcupado) return;
  _afPasso = { mover: true };
  _afDesenhar();
}

function _afPedirExaminar() {
  if (_afOcupado) return;
  _afPasso = { examinar: true };
  _afDesenhar();
}

function _afAlternarLaco() {
  if (_afOcupado || !_afQuem) return;
  _afLaco = (_afLaco === _afQuem) ? null : _afQuem;
  _afDesenhar();
}

function _afVoltar() { _afPasso = null; _afDesenhar(); }

/* Quem pode ser apontado no passo em curso. É esta função e mais
   nenhuma que sabe — o campo pinta o brilho com ela e o clique valida
   com ela, portanto o que brilha e o que responde nunca podem
   discordar. */
function _afEhAlvo(c) {
  if (!_afPasso || !c.vivo) return false;
  const eu = _afPorId(_afQuem);
  if (!eu) return false;
  if (_afPasso.mover)  return c.lado === eu.lado && c !== eu;
  if (_afPasso.examinar) return c.lado !== eu.lado;
  // O Proteger escolhe outro aliado: o Guarda não se protege a si mesmo.
  if (_afPasso.aliado) return c.lado === eu.lado
    && !(_afPasso.magia && _afPasso.magia.proteger && c === eu)
    // só quem a magia muda: a Barreira não se oferece a quem já a tem
    && !(typeof fuPorQueInutil === 'function' && fuPorQueInutil(_afE, eu, _afPasso.magia, c));
  return c.lado !== eu.lado;
}

function _afAlvosHTML(eu) {
  const lista = _afE.A.concat(_afE.B).filter(_afEhAlvo)
    .sort((a, b) => a.posto - b.posto);
  const rot = _afPasso.mover ? t('af.mover.com')
            : _afPasso.examinar ? t('af.alvo.examinar')
            : _afPasso.aliado ? t('af.alvo.aliado') : t('af.alvo.inimigo');

  /* A regra do alcance, dita onde ela vale. Por que posso escolher o de
     trás agora e antes não podia? Porque esta magia alcança qualquer um —
     e isso estava só no código. */
  let nota = '';
  if (_afPasso.mover) {
    nota = t('af.alvo.nota.mover');
  } else if (_afPasso.examinar) {
    nota = t('af.alvo.nota.examinar');
  } else if (!_afPasso.aliado && _afPasso.magia) {
    nota = (_afPasso.magia.alvos || 1) > 1
      ? t('af.alvo.nota.varios', { n: _afPasso.magia.alvos, pm: _afPasso.magia.pm | 0 })
      : t('af.alvo.nota.qualquer');
  }
  let h = `<div class="cb-pm-cab">${esc(rot)}${nota ? `<i>${esc(nota)}</i>` : ''}</div>`;
  /* varrer a linha: a opção de os apanhar a todos de uma vez. E também nas
     de apoio que chegam a vários (a Barreira, o Curar): sem ela o jogador
     só conseguia lançar num aliado de cada vez. */
  if (!_afPasso.mover && !_afPasso.examinar && (_afPasso.magia.alvos || 1) > 1 && lista.length > 1) {
    const custo = fuCusto(_afPasso.magia, lista.length);
    h += _afOrbe('todos', t('af.orbe.todos'), lista.length + '',
      `_afAlvo('*')`, custo || null, custo <= eu.pm);
  }
  for (const c of lista) {
    const custo = (_afPasso.mover || _afPasso.examinar) ? 0 : fuCusto(_afPasso.magia, 1);
    h += _afOrbe(_afPasso.mover ? 'mover' : _afPasso.examinar ? 'examinar'
                 : (_afPasso.aliado ? 'suporte' : 'forte'),
      // a vida do inimigo só com o número se o jogador já a descobriu
      _afNome(c), _afNumeros(c, c.pv, c.ficha.pvMax),
      `_afAlvo('${c.id}')`, custo || null, custo <= eu.pm);
  }
  h += _afOrbe('voltar', t('af.orbe.voltar'), '', `_afVoltar()`, null, true);
  return h;
}

function _afAlvo(id) {
  if (!_afPasso || _afOcupado) return;
  const eu = _afPorId(_afQuem);
  if (!_afPodeAgir(eu)) return;

  if (id === '*') {
    const todos = _afE.A.concat(_afE.B).filter(_afEhAlvo).map(c => c.id);
    _afAgir({ tipo: 'magia', magia: _afPasso.magia, alvos: todos });
    return;
  }
  const c = _afPorId(id);
  if (!c || !_afEhAlvo(c)) return;

  if (_afPasso.mover) { _afAgir({ tipo: 'mover', com: c.id }); return; }
  if (_afPasso.examinar) { _afAgir({ tipo: 'examinar', alvo: c.id }); return; }
  _afAgir({ tipo: 'magia', magia: _afPasso.magia, alvos: [c.id] });
}

// ═══════════════════════════════════════════════════════════════════
// JOGAR
// ═══════════════════════════════════════════════════════════════════
function _afAgir(acao) {
  const eu = _afPorId(_afQuem);
  if (!eu) return;
  // Com o Lutar pelo Laço ligado para este avatar, a ação vai pedindo-o.
  const eventos = fuAgir(_afE, Object.assign({ quem: eu.id }, acao,
    _afLaco === eu.id ? { laco: true } : {}));

  /* Uma acção que o motor recusou não gasta nada e não fecha o menu: o
     jogador continua exactamente onde estava, a escolher outra coisa.
     Sem isto, uma recusa parecia um clique que não funcionou. */
  if (!eventos.length) { _afPasso = null; _afDesenhar(); return; }

  /* Depois de uma magia livre (o Despertar) o mesmo avatar ainda age:
     o menu volta aberto para ele, em vez de fechar como num turno. */
  const livre = !!(acao.magia && acao.magia.livre);
  _afPasso = null; _afMenu = livre; _afQuem = livre ? eu.id : null; _afLaco = null;
  _afMostrar(eventos);
}

/* ══ UM TURNO É UMA SEQUÊNCIA, E CONTA-SE ASSIM ══

   Tudo acontecia de uma vez: a linha inteira do turno escrita no lance
   com <br> entre os testes, os números a flutuarem todos ao mesmo tempo,
   e as barras dos três alvos de uma barragem a descerem no mesmo
   fotograma. Uma batalha inteira num instante, e depois novecentos
   milissegundos de nada.

   Isso é o motor a falar, e não a batalha a acontecer. O motor resolve
   um turno de uma vez porque é o que um motor faz; a tela tem de o
   contar por partes, porque é assim que se percebe qual foi o teste que
   falhou e em quem é que caiu o quê.

   ── AS BATIDAS ──

   Uma batida é um teste com a sua consequência. Os eventos sem linha
   própria — o gasto de PM, o fim da batalha — não são batidas: viajam
   com a batida seguinte, porque o PM sai no mesmo instante em que a
   magia se lança.

   ── O COMPASSO ──

   Cinco décimos de segundo entre batidas, e encurta quando são muitas:
   uma Devastação em seis inimigos com meio segundo cada seriam três
   segundos de espera. O teto de 1,9s no total mantém um turno longo
   dentro do que se aguenta, e o piso de 0,24s garante que nem a mais
   cheia das jogadas fica ilegível. */
function _afMostrar(eventos) {
  _afOcupado = true;

  const batidas = [];
  let pendentes = [];
  let golpeAnterior = null;
  /* Quem conjura: o círculo rúnico acende uma vez por jogada, no
     primeiro golpe de magia (ou na Devastação). Marca só para a tela. */
  const primeiro = eventos.find(ev => ev.tipo === 'magia' || ev.tipo === 'devastacao'
    || ev.tipo === 'cena' || ev.tipo === 'proteger' || (ev.tipo === 'cura' && !ev.estilo));
  /* O autor da jogada, e a primeira batida dele: é nela que ele perde a
     guarda e o Proteger de antes (ver _afAurasDaBatida). */
  const autor = (eventos[0] || {}).quem;
  const primeiraDoAutor = eventos.find(ev => ev.quem === autor && ev.tipo !== 'gasto');
  // O guardar acende o escudo; o Despertar é livre e não tira a guarda.
  if (primeiraDoAutor && primeiraDoAutor.tipo !== 'guardar'
      && !(primeiraDoAutor.tipo === 'cena' && primeiraDoAutor.nome === 'despertar'))
    primeiraDoAutor._primeiraDoAutor = true;
  if (primeiro) primeiro._conjura = true;
  // A Devastação precisa saber, de uma vez, por onde a onda vai passar.
  if (primeiro && primeiro.tipo === 'devastacao')
    primeiro._alvosDev = eventos.filter(ev => ev.tipo === 'devastacao').map(ev => ev.alvo);
  let nProj = 0;
  for (const ev of eventos) {
    const golpe = ev.tipo === 'ataque' || ev.tipo === 'magia';
    const seguido = golpe && !!golpeAnterior
      && golpeAnterior.quem === ev.quem && golpeAnterior.nome === ev.nome;
    if (golpe) golpeAnterior = ev;
    const html = _afLanceDe(ev, seguido);
    pendentes.push(ev);
    if (html) { batidas.push({ evs: pendentes, html }); pendentes = []; }
  }
  // o que sobrou sem linha (o `fim`) vai com a última batida
  if (pendentes.length) {
    if (batidas.length) batidas[batidas.length - 1].evs.push(...pendentes);
    else batidas.push({ evs: pendentes, html: null });
  }

  /* Quem só aparece numa batida por tocar guarda aqui o valor de ANTES,
     e é esse que as barras mostram até a batida dele chegar. */
  _afSegredo = new Map();
  const guardar = (id, campo, valor) => {
    if (!id || valor == null) return;
    const g = _afSegredo.get(id) || {};
    if (g[campo] == null) { g[campo] = valor; _afSegredo.set(id, g); }
  };
  for (const b of batidas) for (const ev of b.evs) {
    if (ev.pvAlvo != null)
      guardar(ev.alvo, 'pv', ev.pvAlvo + (ev.perda | 0) - (ev.curou | 0));
    if (ev.tipo === 'gasto') guardar(ev.quem, 'pm', (ev.pmDepois | 0) + (ev.pm | 0));
    if (ev.tipo === 'guardar' && ev.pmGanho) guardar(ev.quem, 'pm', (ev.pmDepois | 0) - ev.pmGanho);
    if (ev.pvQuem != null)   guardar(ev.quem, 'pv', ev.pvQuem - (ev.drenou | 0));
    if (ev.tipo === 'roubouPM') {
      guardar(ev.alvo, 'pm', ev.pmAlvo + ev.n);
      guardar(ev.quem, 'pm', ev.pmQuem - ev.n);
    }
  }

  // quem cai neste turno continua de pé, para o desenho, até a sua batida
  _afMorreAinda = new Set();
  for (const b of batidas) for (const ev of b.evs) if (ev.caiu && ev.alvo) _afMorreAinda.add(ev.alvo);

  _afDesenhar();

  /* ── A COREOGRAFIA DE UMA BATIDA (22/09/2026) ──

     Antes, tudo saía junto: os dados giravam no registro enquanto o
     círculo rúnico acendia e o projétil já voava. Agora é uma sequência,
     e cada fase espera a outra:

       1. OS DADOS    dois dados de verdade são jogados no chão do palco,
                      quicam e pousam; o Resultado Alto acende
       2. CONJURA     quem lança se ergue, o círculo acende aos pés e a
                      energia se junta na frente dele (só na magia que abre
                      a jogada; o golpe comum toma impulso para trás)
       3. SOLTA       o avanço, e o que viaja sai
       4. RECEBE      o impacto, o número, a barra, e a frase do registro
                      mostra o resultado — só agora, e não antes

     Sem dados (a cura, a Devastação, a guarda) pula-se a fase 1. Os
     tempos estão em AF_T. Com menos movimento, fica só o essencial. */
  const reduz = _afMovimentoReduzido();
  let i = 0;
  const tocar = () => {
    if (i >= batidas.length) {
      const sobrou = _afMorreAinda && _afMorreAinda.size;
      _afSegredo = null;
      _afMorreAinda = null;
      if (sobrou) _afDesenhar(); else _afBarras();   // acerta o que a cadência deixou
      setTimeout(() => { _afOcupado = false; _afAndar(); }, AF_T.fecho);
      return;
    }
    const b = batidas[i++];
    const noPalco = !reduz && !!b.html && b.html.indexOf('data-v=') !== -1;
    const linha = b.html ? _afLance(b.html, i > 1, noPalco) : null;
    const ev = _afPrincipal(b.evs);
    const q = ev && _afPorId(ev.quem);
    // Buscado na hora: o campo pode ter se refeito entre uma fase e outra.
    const deQuem = () => ev && _afEl(ev.quem);

    const rola = noPalco && !!linha;
    const conj = !reduz && !!ev && !!ev._conjura;
    const golpe = !reduz && !!ev && ev.tipo === 'ataque';
    const magia = !reduz && !!ev && ev.tipo === 'magia';
    const envia = !reduz && !!ev && !!ev.alvo && ev.alvo !== ev.quem
      && (ev.tipo === 'cena' || ev.tipo === 'proteger' || (ev.tipo === 'cura' && !ev.estilo));
    const devasta = !!ev && ev.tipo === 'devastacao';

    const tD = rola ? AF_T.dados : 0;
    const tR = tD + (conj ? AF_T.conjura : golpe ? AF_T.prepara : magia ? AF_T.solta : 0);
    const voo = magia ? (_afFormaDe(ev) === 'lanca' ? AF_T.vooLanca : AF_T.voo)
              : golpe ? AF_T.vooGolpe : envia ? AF_T.envia : 0;
    const tI = tR + voo;
    const dura = tI + (devasta ? AF_T.devasta : AF_T.resto);

    // O resultado da frase espera o impacto.
    const resto = linha && linha.querySelector('.cb-lance-resto');
    if (resto && !reduz) linha.classList.add('espera');

    // 1. os dados
    if (rola) _afDadosPalco(ev || b.evs[0], linha, Math.max(tR, tD + 250));

    // 2. conjura (e o PM sai nessa hora)
    setTimeout(() => {
      b.evs.filter(e => e.tipo === 'gasto').forEach(_afEncenarUm);
      if (conj) {
        _afConjurar(ev);
        _afCarregar(ev, AF_T.conjura);
        _afGesto(deQuem(), 'conjura', AF_T.conjura);
      } else if (golpe) {
        /* Um gesto só, do impulso ao contato: o recuo e o avanço eram dois,
           e entre um e outro o corpo voltava ao lugar por um quadro — um
           pequeno salto (visto pelo subagente de verificação). */
        _afGesto(deQuem(), 'golpeia', AF_T.prepara + 400);
      }
    }, tD);

    // 3. solta
    setTimeout(() => {
      if (magia) _afGesto(deQuem(), 'avanca', 400);
      if (magia || golpe) ev._lancou = true;   // o golpe já avança no 'golpeia'
      if (magia) _afDisparar(ev, voo, nProj++);
      if (envia) {
        const cor = _afEfeitoDe(ev.tipo === 'cura' ? 'cura' : (ev.tipo_dano || (q && q.ficha.tipo))).cor;
        _afEnviar(ev.quem, ev.alvo, cor, voo);
      }
      if (devasta && ev._conjura && !reduz) {
        const n = (ev._alvosDev || []).length || 1;
        _afVarrer(ev, n * AF_T.devasta, AF_T.devasta);
      }
    }, tR);

    // 4. recebe
    setTimeout(() => {
      if (linha) linha.classList.remove('espera');
      /* O campo se refaz ANTES da encenação quando alguém cai nesta
         batida: refazê-lo depois apagaria o número e o clarão do golpe,
         que moram dentro do posto que está sendo substituído. */
      const caem = b.evs.filter(e => e.caiu && _afMorreAinda && _afMorreAinda.has(e.alvo));
      if (caem.length) {
        caem.forEach(e => _afMorreAinda.delete(e.alvo));
        _afDesenhar();
      }
      for (const e of b.evs) if (e.tipo !== 'gasto') _afEncenarUm(e);
    }, tI);

    setTimeout(tocar, dura);
  };
  tocar();
}

/* Os tempos da coreografia, em ms (ver _afMostrar). */
const AF_T = {
  // rolam, pousam, acendem, e um instante para ler (getter: AF_ROLA_* vêm mais abaixo no arquivo)
  get dados() { return AF_ROLA_MS + AF_ROLA_DEFASAGEM + AF_ROLA_ACENDE + 200; },
  conjura:  780,   // o círculo, a energia que se junta
  prepara:  260,   // o golpe comum toma impulso
  solta:    170,   // o próximo projétil da mesma magia (a Barragem)
  voo:      460,   // o orbe e o leque
  vooLanca: 280,   // a lança, que é reta e rápida
  vooGolpe: 110,   // o avanço do golpe comum até o contato
  envia:    480,   // a luz do apoio até o aliado
  resto:    720,   // depois do impacto, para ver o número
  devasta:  560,   // entre um alvo e outro da Devastação
  fecho:    450,   // o fim da jogada, antes da vez seguinte
};

/* O evento que dá o tom da batida — o golpe, a magia, a cura. Os outros
   (o PM gasto, o que o golpe provocou) vão com ele. */
const AF_PRINCIPAL = ['ataque', 'magia', 'devastacao', 'cena', 'cura', 'proteger',
                      'examinar', 'actoFinal', 'represalia'];
function _afPrincipal(evs) {
  return evs.find(ev => AF_PRINCIPAL.indexOf(ev.tipo) !== -1) || null;
}

/* ── A ENERGIA QUE SE JUNTA ──
   Na fase de conjurar: um núcleo da cor da magia cresce no ponto de onde
   o projétil vai sair, e faíscas vêm de fora para dentro dele. */
function _afCarregar(ev, dura) {
  const fx = document.getElementById('cbFx');
  const a = _afPonto(ev.quem, .45);
  if (!fx || !a) return;
  const q = _afPorId(ev.quem);
  const cor = _afEfeitoDe(ev.tipo === 'cura' ? 'cura' : (ev.tipo_dano || (q && q.ficha.tipo))).cor;
  const c = document.createElement('div');
  c.className = 'cb-carga';
  c.style.setProperty('--cor', cor);
  c.style.setProperty('--forca', _afForcaDe(ev));
  c.style.setProperty('--dura', dura + 'ms');
  c.style.left = a.x + 'px'; c.style.top = a.y + 'px';
  let faiscas = '';
  for (let k = 0; k < 10; k++) {
    const ang = (k / 10) * Math.PI * 2 + Math.random() * .4;
    const r = 2.2 + Math.random() * 1.4;
    faiscas += `<b style="--x:${(Math.cos(ang) * r).toFixed(2)}rem;--y:${(Math.sin(ang) * r).toFixed(2)}rem;`
             + `animation-delay:${Math.round(Math.random() * dura * .45)}ms"></b>`;
  }
  c.innerHTML = '<i></i>' + faiscas;
  fx.appendChild(c);
  setTimeout(() => c.remove(), dura + 60);
}

/* ── A LUZ DO APOIO ──
   A Barreira, a Concha, a cura e o Proteger num aliado: uma luz mansa sai
   de quem lança e desce sobre ele, num arco baixo. Sem ela o efeito
   nascia no aliado sem dizer de onde veio. */
function _afEnviar(deId, paraId, cor, dura) {
  const fx = document.getElementById('cbFx');
  const a = _afPonto(deId, .45), b = _afPonto(paraId, .4);
  if (!fx || !a || !b || typeof fx.animate !== 'function') return;
  const p = document.createElement('div');
  p.className = 'cb-proj cb-proj-luz';
  p.style.setProperty('--cor', cor);
  fx.appendChild(p);
  const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - Math.min((fx.clientHeight || 600) * .12, 80);
  const quadros = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const tt = i / N, u = 1 - tt;
    const x = u * u * a.x + 2 * u * tt * cx + tt * tt * b.x;
    const y = u * u * a.y + 2 * u * tt * cy + tt * tt * b.y;
    quadros.push({ transform: `translate(${x}px,${y}px) scale(${i === 0 ? .4 : i === N ? 1.3 : 1})`,
                   opacity: i === 0 ? 0 : i === N ? .2 : 1, offset: tt });
  }
  const anim = p.animate(quadros, { duration: dura, easing: 'ease-in-out', fill: 'both' });
  const fim = () => p.remove();
  anim.onfinish = fim;
  setTimeout(fim, dura + 200);
}

/* ══ OS DADOS NO PALCO ══

   Dois dados de verdade — com as faces do tamanho do dado (d6 quadrado,
   d8, d10, d12) — são jogados do lado de quem age para o chão entre os
   dois, quicam três vezes, giram e pousam. A face troca enquanto rolam e
   para no valor que saiu. Depois de pousarem, o Resultado Alto acende em
   ouro; o crítico estoura em laranja, o pifão em vermelho, e o dado
   menor apaga.

   Os valores e as cores vêm da linha do registro (_afDadosHTML), que é a
   única fonte: os dois pares nunca discordam. Saem de cena em `somem`
   ms, quando a magia é solta. */
let _afDadoSeq = 0;
function _afDadoSVG(L, v) {
  const id = 'afdg' + (++_afDadoSeq);
  let corpo, facetas = '', ty = 52;
  const pol = pts => pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const roda = (n, r, giro) => Array.from({ length: n }, (_, k) => {
    const a = giro + k * 2 * Math.PI / n;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
  });
  if (L <= 6) {
    corpo = '<rect x="6" y="6" width="88" height="88" rx="18"/>';
    facetas = '<rect x="15" y="15" width="70" height="70" rx="12"/>';
  } else if (L <= 8) {
    corpo = '<polygon points="50,3 95,50 50,97 5,50"/>';
    facetas = '<polyline points="14,62 50,3 86,62 14,62 50,97 86,62"/>';
    ty = 46;
  } else if (L <= 10) {
    corpo = '<polygon points="50,3 96,44 50,97 4,44"/>';
    facetas = '<polyline points="4,44 26,57 50,3 74,57 96,44"/><polyline points="26,57 50,70 74,57"/><line x1="50" y1="70" x2="50" y2="97"/>';
    ty = 45;
  } else if (L <= 12) {
    const fora = roda(10, 47, -Math.PI / 2), dentro = roda(5, 27, -Math.PI / 2);
    corpo = `<polygon points="${pol(fora)}"/>`;
    facetas = `<polygon points="${pol(dentro)}"/>`
      + dentro.map((p, k) => `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${fora[k * 2][0].toFixed(1)}" y2="${fora[k * 2][1].toFixed(1)}"/>`).join('');
  } else {
    const fora = roda(6, 47, -Math.PI / 2), dentro = roda(3, 30, -Math.PI / 2);
    corpo = `<polygon points="${pol(fora)}"/>`;
    facetas = `<polygon points="${pol(dentro)}"/>`
      + dentro.map((p, k) => `<line x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${fora[k * 2][0].toFixed(1)}" y2="${fora[k * 2][1].toFixed(1)}"/>`).join('');
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>`
    + `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="#5b4596"/><stop offset=".55" stop-color="#2c2150"/><stop offset="1" stop-color="#181230"/>`
    + `</linearGradient></defs>`
    + `<g class="cb-d3-corpo" fill="url(#${id})">${corpo}</g>`
    + `<g class="cb-d3-facetas">${facetas}</g>`
    + `<text x="50" y="${ty}" class="cb-d3-n">${v}</text></svg>`;
}

function _afDadosPalco(ev, linha, somem) {
  const fx = document.getElementById('cbFx');
  if (!fx || typeof fx.animate !== 'function') return;
  const dadosLog = [...linha.querySelectorAll('.cb-dado[data-v]')];
  if (!dadosLog.length) return;
  const W = fx.clientWidth || 800, H = fx.clientHeight || 600;

  // Onde pousam: no chão, entre quem age e o alvo.
  const pes = [ev.quem && _afPonto(ev.quem, 1), ev.alvo && _afPonto(ev.alvo, 1)].filter(Boolean);
  const meioX = pes.length ? pes.reduce((s, p) => s + p.x, 0) / pes.length : W / 2;
  const chao = pes.length ? Math.max.apply(null, pes.map(p => p.y)) : H * .6;
  const x0 = Math.max(W * .32, Math.min(W * .68, meioX));
  const y0 = Math.max(H * .32, Math.min(H * .64, chao - H * .03));
  const q = ev.quem && _afPorId(ev.quem);
  const dir = (q && q.lado === 'B') ? -1 : 1;     // jogados do lado de quem age
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  /* Do tamanho dos corpos: 3 rem no PC, onde o corpo da frente tem 244 px;
     no celular o corpo tem ~60 px, e um dado de 48 px ficava quase do
     tamanho do bicho. */
  const corpo = pes.length ? Math.max.apply(null, pes.map(p => p.h)) : rem * 6;
  const tam = Math.max(rem * 1.6, Math.min(rem * 3, corpo * .38));

  const caixa = document.createElement('div');
  caixa.className = 'cb-dados3d';
  caixa.style.setProperty('--tam', tam + 'px');
  fx.appendChild(caixa);

  const sorteio = L => 1 + Math.floor(Math.random() * L);
  dadosLog.forEach((d, i) => {
    const L = Math.max(2, parseInt(d.dataset.l, 10) || 6);
    const v = d.dataset.v;
    const T = AF_ROLA_MS + i * AF_ROLA_DEFASAGEM;
    const xf = x0 + (i ? 1 : -1) * tam * .72 + (Math.random() - .5) * tam * .25;
    const yf = y0 + (i ? .12 : -.08) * tam;
    const xi = xf - dir * (W * .2 + Math.random() * W * .05);
    /* Não tão alto: a camada do registro fica por cima da dos efeitos, e
       lá em cima o dado passava por trás do texto da jogada. */
    const alto = H * (.15 + Math.random() * .04);

    const pos = document.createElement('div');
    pos.className = 'cb-d3';
    ['alto', 'critico', 'pifao'].forEach(k => { if (d.classList.contains(k)) pos.dataset[k] = '1'; });
    pos.innerHTML = '<i class="cb-d3-sombra"></i><div class="cb-d3-dado">' + _afDadoSVG(L, sorteio(L)) + '</div>';
    caixa.appendChild(pos);
    const dado = pos.querySelector('.cb-d3-dado');
    const sombra = pos.querySelector('.cb-d3-sombra');
    const num = pos.querySelector('.cb-d3-n');

    // o chão: anda de lado, cada vez menos (o atrito)
    const fr = [0, .62, .86, .96, 1];
    const offs = [0, .38, .64, .84, 1];
    pos.animate(offs.map((o, k) => ({
      transform: `translate(${xi + (xf - xi) * fr[k]}px, ${yf}px)`, offset: o,
      easing: 'cubic-bezier(.3,.6,.5,1)' })), { duration: T, fill: 'forwards' });

    // o ar: cai, quica duas vezes mais baixo, e assenta; gira e amassa no chão
    const giroZ = dir * (540 + Math.random() * 360), giroX = 720 + Math.random() * 360;
    const tilt = (Math.random() - .5) * 14;
    const Q = (o, h, rz, rx, sx, sy, ez) => ({
      transform: `translateY(${-h}px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${sx},${sy})`,
      offset: o, easing: ez });
    dado.animate([
      Q(0,   alto,        0,            0,           .75, .75, 'cubic-bezier(.55,0,1,.45)'),
      Q(.38, 0,           giroZ * .55,  giroX * .6,  1.14, .84, 'cubic-bezier(0,.55,.45,1)'),
      Q(.51, H * .075,    giroZ * .75,  giroX * .82, 1, 1,     'cubic-bezier(.55,0,1,.45)'),
      Q(.64, 0,           giroZ * .88,  giroX * .95, 1.08, .9, 'cubic-bezier(0,.55,.45,1)'),
      Q(.74, H * .022,    giroZ * .96,  giroX,       1, 1,     'cubic-bezier(.55,0,1,.45)'),
      Q(.84, 0,           giroZ + tilt * 2, giroX,   1.04, .96, 'ease-out'),
      Q(1,   0,           Math.round(giroZ / 360) * 360 + tilt, giroX - giroX % 360 + 360, 1, 1, 'ease-out'),
    ], { duration: T, fill: 'forwards' });
    // a sombra: pequena e clara no alto, cheia no chão
    const S = (o, h) => ({ transform: `scale(${1 - .55 * h})`, opacity: .55 - .4 * h, offset: o });
    sombra.animate([S(0, 1), S(.38, 0), S(.51, .3), S(.64, 0), S(.74, .1), S(.84, 0), S(1, 0)],
                   { duration: T, fill: 'forwards' });

    // a face troca enquanto rola, cada vez mais devagar, e para no valor
    const t0 = performance.now();
    const troca = () => {
      if (!pos.isConnected) return;
      const p = (performance.now() - t0) / T;
      if (p >= .8) { num.textContent = v; return; }
      let n; do { n = sorteio(L); } while (String(n) === num.textContent && L > 1);
      num.textContent = n;
      setTimeout(troca, 55 + 190 * p * p);
    };
    setTimeout(troca, 40);
    setTimeout(() => { num.textContent = v; pos.classList.add('pousou'); }, T);
  });

  // o Resultado Alto acende quando os dois estão no chão
  const todos = AF_ROLA_MS + (dadosLog.length - 1) * AF_ROLA_DEFASAGEM;
  setTimeout(() => {
    caixa.classList.add('revelado');
    // e a linha do registro mostra os valores que acabaram de sair
    linha.classList.remove('aguarda');
    dadosLog.forEach(d => d.classList.add('revelado'));
  }, todos + AF_ROLA_ACENDE);
  setTimeout(() => caixa.classList.add('some'), somem);
  setTimeout(() => caixa.remove(), somem + 420);
}

// ══════════════════════════════════════════════════════════════════
// OS EFEITOS
//
// Vieram inteiros do js/combate-pve.js — o gesto, o clarão, as
// partículas, a poeira dos pés, a onda de choque, o tremor e os números
// que sobem. O CSS deles já existe e não muda de motor.
//
// ── CADA TIPO BATE À SUA MANEIRA ──
//
// O motor antigo tinha cinco tons de cor e cinco gestos, um por tom.
// Este tem NOVE tipos de dano, e o CSS tem seis gestos. Não se inventam
// três gestos novos: o GESTO diz a família (sobe, cai, atravessa,
// fecha-se) e a COR diz o tipo. Dois tipos que partilham o gesto nunca
// partilham a cor.
//
//   fogo / luz        chamas      sobem, poucas e vivas
//   gelo / veneno     gotas       espalham-se e CAEM
//   terra             pedras      poucas, grandes, e o baque é fundo
//   raio / ar         espirais    atravessam de lado, depressa
//   treva             sombras     não voam: fecham-se para dentro
//   físico            neutro      faíscas brancas, que é o que um murro é
// ══════════════════════════════════════════════════════════════════
const AF_GESTO = {
  chamas:   { n: 10, tam: [2, 5], dx: 26, dy: [-52, -18] },
  gotas:    { n: 12, tam: [2, 4], dx: 46, dy: [10, 46] },
  pedras:   { n: 6,  tam: [4, 8], dx: 34, dy: [6, 40] },
  espirais: { n: 9,  tam: [1, 3], dx: 78, dy: [-12, 12], risca: true },
  sombras:  { n: 10, tam: [3, 6], dx: 30, dy: [-16, 16], dentro: true },
  neutro:   { n: 8,  tam: [2, 4], dx: 30, dy: [-40, -14] },
};

const AF_TIPO_EFEITO = {
  fisico: { gesto: 'neutro',   cor: '#e8e2f5' },
  fogo:   { gesto: 'chamas',   cor: '#ff8a4c' },
  luz:    { gesto: 'chamas',   cor: '#ffe9a8' },
  gelo:   { gesto: 'gotas',    cor: '#9fdcff' },
  veneno: { gesto: 'gotas',    cor: '#9ad46a' },
  terra:  { gesto: 'pedras',   cor: '#c9a06a' },
  raio:   { gesto: 'espirais', cor: '#ffe14c' },
  ar:     { gesto: 'espirais', cor: '#cfe9f0' },
  treva:  { gesto: 'sombras',  cor: '#c4b5fd' },
  cura:   { gesto: 'chamas',   cor: '#86efac' },   // sobe, como vida que volta
};

function _afEfeitoDe(tipo) { return AF_TIPO_EFEITO[tipo] || AF_TIPO_EFEITO.fisico; }

function _afEl(id) { return document.getElementById('cbLut' + id); }

function _afGesto(el, classe, dura) {
  if (!el) return;
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  setTimeout(() => el.classList.remove(classe), dura || 700);
}

/* Onde os efeitos se penduram. O posto é um PONTO — `width:0;height:0` —
   e um efeito posicionado em percentagem dentro de zero fica todo no
   mesmo pixel. A caixa dos efeitos tem o tamanho do corpo e não leva as
   animações dele. */
function _afCaixa(el) {
  return (el && el.querySelector && el.querySelector('.cb-efeitos')) || el;
}

/* ── OS NÚMEROS QUE SOBEM ──
   São cuspidos e não levantados: sobem depressa, travam no alto e caem.
   Dois elementos encaixados porque os dois eixos têm curvas diferentes, e
   um só elemento não consegue duas. O lado é sorteado, senão dois números
   do mesmo turno saem pela mesma linha e o de baixo tapa o de cima. */
function _afNumero(el, n, critico, tipo) {
  el = _afCaixa(el);
  if (!el || !n) return;
  const d = document.createElement('div');
  d.className = 'cb-dano' + (critico ? ' crit' : '') + (tipo ? ' ' + tipo : '');
  d.style.setProperty('--alto', (-2.2 - Math.random() * 1.1).toFixed(2) + 'rem');
  d.style.setProperty('--arco',
    ((Math.random() < .5 ? -1 : 1) * (0.6 + Math.random() * 0.9)).toFixed(2) + 'rem');
  const txt = document.createElement('span');
  txt.textContent = (tipo === 'cura' || tipo === 'roubo' ? '+' : '−') + n;
  d.appendChild(txt);
  el.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

// O PM sai igual ao dano, mas em azul e do outro lado — se saísse do
// mesmo sítio, o custo da magia e o golpe recebido escreviam-se um por
// cima do outro no mesmo turno.
// `ganho` para o PM que volta (a guarda); sem ele, é o que se gasta.
function _afNumeroPM(el, n, ganho) {
  el = _afCaixa(el);
  if (!el || !n) return;
  const d = document.createElement('div');
  d.className = 'cb-pm-flut';
  d.textContent = ganho ? t('af.lance.pmGanho', { n }) : t('af.lance.pm', { n });
  el.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

function _afImpacto(el, tipo, forca) {
  el = _afCaixa(el);
  if (!el) return;
  const cfg = _afEfeitoDe(tipo);
  const base = AF_GESTO[cfg.gesto] || AF_GESTO.neutro;
  /* A FORÇA (_afForcaDe): a magia do Lendário explode maior que a do
     Comum — mais partículas, maiores e que vão mais longe. O golpe comum
     fica em 1. */
  const f = forca || 1;
  const modo = Object.assign({}, base, {
    n: Math.round(base.n * f),
    tam: [base.tam[0] * f, base.tam[1] * f],
    dx: base.dx * f,
    dy: [base.dy[0] * f, base.dy[1] * f],
  });
  const cor = cfg.cor;

  /* O clarão dá ao corpo inteiro a cor de quem bateu. É o que se vê
     primeiro, antes de qualquer partícula: um golpe de treva escurece, um
     de fogo aquece. */
  const luz = document.createElement('div');
  luz.className = 'cb-luz cb-luz-' + cfg.gesto;
  luz.style.setProperty('--cor', cor);
  el.appendChild(luz);
  setTimeout(() => luz.remove(), 620);

  const entre = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < modo.n; i++) {
    const p = document.createElement('div');
    const sz = entre(modo.tam[0], modo.tam[1]);
    // As sombras vêm de fora e fecham-se para dentro: nascem na periferia
    // e o destino é o meio, ao contrário de todas as outras.
    const x = modo.dentro ? (Math.random() < .5 ? entre(2, 18) : entre(82, 98)) : entre(28, 72);
    const y = modo.dentro ? entre(10, 90) : entre(28, 72);
    const dx = modo.dentro ? (50 - x) * 0.6 : entre(-modo.dx / 2, modo.dx / 2);
    const dy = modo.dentro ? (50 - y) * 0.4 : entre(modo.dy[0], modo.dy[1]);
    p.className = 'cb-particula cb-p-' + cfg.gesto;
    p.style.cssText =
      `width:${(modo.risca ? sz * 6 : sz) / 16}rem;height:${sz / 16}rem;background:${cor};`
      + `box-shadow:0 0 ${(sz * 2) / 16}rem ${cor};left:${x}%;top:${y}%;`
      + `--dx:${dx / 16}rem;--dy:${dy / 16}rem;`
      + `animation-delay:${Math.random() * (modo.risca ? .06 : .14)}s;`;
    el.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

/* ── A ONDA NASCE NOS PÉS, E POR ISSO NÃO VAI NA CAIXA DOS EFEITOS ──

   Ia, e a caixa dos efeitos tem `translate(-50%,-100%)`: o `top: 0` dela
   é o topo da CABEÇA. O anel abria-se no ar, 241px acima dos pés no da
   frente e 152 no do fundo.

   O posto é um ponto, e esse ponto são os pés — é de lá que a poeira já
   nascia, e é por isso que ela sempre acertou. A onda passa a pendurar-se
   no mesmo sítio, e o comentário do CSS ("no chão e não no ar") deixa de
   ser uma promessa por cumprir. */
function _afOnda(el) {
  if (!el) return;
  const o = document.createElement('div');
  o.className = 'cb-onda';
  el.appendChild(o);
  setTimeout(() => o.remove(), 700);
}

/* ── A POEIRA AOS PÉS ──
   As partículas do golpe saem do CORPO; esta sai do CHÃO. É a diferença
   entre um efeito mágico e um impacto com peso — quem apanha um murro
   levanta pó, e é o pó que diz que existe um chão por baixo. Nasce no
   ponto do posto, que é onde estão os pés. */
function _afPoeira(el) {
  if (!el) return;
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('div');
    p.className = 'cb-po';
    const ang = (Math.random() - .5) * Math.PI;      // meia-volta, para cima
    const raio = 0.5 + Math.random() * 1.4;
    p.style.setProperty('--px', (Math.cos(ang) * raio).toFixed(2) + 'rem');
    p.style.setProperty('--py', (-Math.abs(Math.sin(ang)) * raio * .55).toFixed(2) + 'rem');
    p.style.animationDelay = (Math.random() * .08).toFixed(2) + 's';
    el.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

/* O palco estremece, e a Fratura responde ao golpe. SÓ NO CRÍTICO, e é
   uma decisão: um ecrã que abana a cada murro deixa de dizer nada, e um
   jogo de turnos tem murros a cada dois segundos. */
function _afEstremecer() {
  const p = document.getElementById('cbPalco');
  if (!p) return;
  p.classList.remove('treme', 'clarao');
  void p.offsetWidth;
  p.classList.add('treme', 'clarao');
  setTimeout(() => p.classList.remove('treme', 'clarao'), 620);
}

/* ══════════════════════════════════════════════════════════════════
   OS EFEITOS DAS MAGIAS (21/09/2026)

   Até aqui todo ataque era o mesmo gesto — quem bate avança, o alvo
   pisca na cor do elemento — e o que mudava de um soco para uma magia
   Lendária era só a cor. Agora cada magia tem a sua cara:

     conjurar     um círculo rúnico acende aos pés de quem lança, na cor
                  do elemento, enquanto os dados rolam (não no golpe comum)
     orbe         o Sopro: uma esfera que viaja em arco até o alvo
     leque        a Forte que acerta vários: um projétil por alvo, cada um
                  com o seu arco, no ritmo das linhas ↳ do registro
     lança        a Muito Forte: um risco fino e rápido, com rastro
     varredura    a Devastação: o palco escurece e uma onda cruza o lado
                  inimigo inteiro

   E o jeito do feitio no impacto: o Scutum ergue um escudo dourado, a
   Acies corta na diagonal, a Salus estende um fio de vida até o aliado
   que cura.

   ── O TEMPO ──
   Nada disto atrasa o turno. O projétil sai quando os dados começam a
   rolar e CHEGA no instante em que o golpe cai (AF_ROLA_MS +
   AF_ROLA_DEFASAGEM) — que é quando o número e o clarão já apareciam.
   Errou: passa direto pelo alvo e some.

   Quem pediu menos movimento ao sistema não vê nada disto; o golpe
   continua a ler-se pelos dados, pelo número e pela barra. */
const AF_FORCA = { Comum: 1, Raro: 1.3, 'Lendário': 1.6 };

// A força de um evento: a da raridade de quem lança, só nas magias.
function _afForcaDe(ev) {
  if (ev.tipo !== 'magia' && ev.tipo !== 'devastacao') return 1;
  const q = _afPorId(ev.quem);
  return (q && AF_FORCA[q.ficha.raridade]) || 1;
}

// A forma do que viaja, pela magia.
function _afFormaDe(ev) {
  if (ev.tipo === 'devastacao') return 'varredura';
  if (ev.tipo !== 'magia') return null;             // o golpe comum: o avanço de sempre
  if (ev.nome === 'concentrado' || ev.nome === 'sopro_maldito') return 'lanca';
  if (ev.nome === 'barragem' || ev.nome === 'barragem_certa') return 'leque';
  return 'orbe';
}

/* Um ponto de um lutador, em pixels da camada dos efeitos: o meio do
   corpo por omissão, ou `alt` da altura dele (0 é a cabeça, 1 os pés). */
function _afPonto(id, alt) {
  const fx = document.getElementById('cbFx');
  const caixa = _afCaixa(_afEl(id));
  if (!fx || !caixa || !caixa.getBoundingClientRect) return null;
  const r = caixa.getBoundingClientRect(), p = fx.getBoundingClientRect();
  if (!r.width) return null;
  return { x: r.left + r.width / 2 - p.left, y: r.top + r.height * (alt == null ? .5 : alt) - p.top, h: r.height };
}

// O círculo rúnico aos pés de quem lança. Pendura-se no posto, que é o chão.
function _afConjurar(ev) {
  const el = _afEl(ev.quem);
  if (!el) return;
  const q = _afPorId(ev.quem);
  const cor = _afEfeitoDe(ev.tipo_dano || (q && q.ficha.tipo)).cor;
  const r = document.createElement('div');
  r.className = 'cb-runa';
  r.style.setProperty('--cor', cor);
  r.style.setProperty('--forca', _afForcaDe(ev));
  el.appendChild(r);
  setTimeout(() => r.remove(), 1100);
}

/* O que viaja de quem lança até o alvo, a chegar em `chegada` ms. `k` é
   a ordem do projétil na jogada, para os do leque saírem em arcos
   diferentes em vez de uns por cima dos outros. */
function _afDisparar(ev, chegada, k) {
  const forma = _afFormaDe(ev);
  const fx = document.getElementById('cbFx');
  if (!forma || forma === 'varredura' || !fx || !chegada) return;
  const a = _afPonto(ev.quem, .45), b0 = _afPonto(ev.alvo, .5);
  if (!a || !b0 || typeof fx.animate !== 'function') return;
  const q = _afPorId(ev.quem);
  const cor = _afEfeitoDe(ev.tipo_dano || (q && q.ficha.tipo)).cor;
  const f = _afForcaDe(ev);
  // Errou: passa direto, um quarto do caminho além do alvo, e some.
  const b = ev.acertou ? b0
    : { x: b0.x + (b0.x - a.x) * .28, y: b0.y - b0.h * .25 };
  const dx = b.x - a.x, dy = b.y - a.y;
  const ang = Math.atan2(dy, dx);
  const lanca = forma === 'lanca';
  // Sai na hora e chega no impacto: o voo é a fase inteira (_afMostrar).
  const dur = Math.max(120, chegada);
  const atraso = 0;

  const p = document.createElement('div');
  p.className = 'cb-proj cb-proj-' + forma;
  p.style.setProperty('--cor', cor);
  p.style.setProperty('--forca', f);
  fx.appendChild(p);

  /* ── O ARCO ──
     O orbe sobe e desce; os do leque abrem para lados alternados, cada um
     um pouco diferente. A lança vai reta.

     O desvio é em PIXELS e tem teto, e o ponto de controle fica preso
     dentro do palco. Era proporcional ao comprimento do voo, e num voo
     longo o terceiro projétil do leque subia centenas de pixels acima
     do palco e sumia (medido pelo subagente de verificação: y = −504).

     E é uma CURVA: amostra-se a Bézier quadrática em dez quadros. Com três
     quadros (saída, meio, chegada) o "arco" era um V com bico no meio. */
  const W = fx.clientWidth || 800, H = fx.clientHeight || 600;
  const sinal = (k % 2) ? 1 : -1;
  const lado = forma === 'leque' ? sinal * Math.min(H * (0.10 + 0.04 * (k % 3)), 90) : 0;
  const sobe = forma === 'orbe' ? Math.min(H * 0.16, 110) : forma === 'leque' ? Math.min(H * 0.06, 40) : 0;
  let cx = a.x + dx / 2 - Math.sin(ang) * lado;
  let cy = a.y + dy / 2 + Math.cos(ang) * lado - sobe;
  cx = Math.max(W * 0.04, Math.min(W * 0.96, cx));
  cy = Math.max(H * 0.14, Math.min(H * 0.85, cy));
  const rot = lanca ? ` rotate(${ang}rad)` : '';
  const quadros = [{ transform: `translate(${a.x}px,${a.y}px)${rot} scale(.4)`, opacity: 0, offset: 0 }];
  const N = lanca ? 3 : 10;
  for (let i = 1; i <= N; i++) {
    const tt = i / N, u = 1 - tt;
    const x = lanca ? a.x + dx * tt : u * u * a.x + 2 * u * tt * cx + tt * tt * b.x;
    const y = lanca ? a.y + dy * tt : u * u * a.y + 2 * u * tt * cy + tt * tt * b.y;
    const fim = i === N;
    quadros.push({
      transform: `translate(${x}px,${y}px)${rot} scale(${fim ? (ev.acertou ? 1.15 : .7) : 1})`,
      opacity: fim ? (ev.acertou ? 1 : 0) : 1,
      offset: i === 1 ? Math.max(tt, .08) : tt,
    });
  }
  const anim = p.animate(quadros, { duration: dur, delay: atraso, easing: lanca ? 'cubic-bezier(.6,0,1,1)' : 'ease-in-out', fill: 'both' });
  const fim = () => p.remove();
  anim.onfinish = fim;
  setTimeout(fim, atraso + dur + 200);   // a rede, se a aba parar de pintar
}

/* A Devastação: o palco escurece e uma onda cruza o lado inimigo inteiro.
   `dura` é o tempo da jogada e `passo` o de uma batida: os golpes caem um
   por batida, e a faixa PASSA POR CIMA de cada alvo no instante em que ele
   é atingido — o i-ésimo alvo em i × passo. Andava num ritmo fixo, e
   chegava ao primeiro depois do golpe e ao último depois de ter saído do
   palco (medido pelo subagente de verificação). */
function _afVarrer(ev, dura, passo) {
  dura = Math.max(800, dura || 0);
  const fx = document.getElementById('cbFx');
  const palco = document.getElementById('cbPalco');
  const q = _afPorId(ev.quem);
  if (!fx || !q) return;
  const cor = _afEfeitoDe(ev.tipo_dano || q.ficha.tipo).cor;
  if (palco) {
    palco.style.setProperty('--devasta', dura + 'ms');
    palco.classList.remove('devasta'); void palco.offsetWidth; palco.classList.add('devasta');
    setTimeout(() => palco.classList.remove('devasta'), dura + 100);
  }
  const v = document.createElement('div');
  v.className = 'cb-varre';
  v.style.setProperty('--cor', cor);
  fx.appendChild(v);
  setTimeout(() => v.remove(), dura + 200);
  if (typeof v.animate !== 'function') return;

  // As paradas: o x de cada alvo, no tempo do golpe dele.
  const w = v.offsetWidth || 96;
  const vira = q.lado === 'A' ? '' : ' scaleX(-1)';
  const xs = (ev._alvosDev || []).map(id => _afPonto(id)).filter(Boolean).map(p => p.x);
  if (!xs.length) return;
  const ida = Math.max(1, dura);
  const passoN = Math.max(1, passo || dura / xs.length);
  const quadros = [];
  const recua = (q.lado === 'A' ? -1 : 1) * w * 1.5;
  /* Nasce já em cima do primeiro alvo, que é atingido no instante zero:
     entrar de trás dele fazia o primeiro número aparecer 60 ms antes da
     faixa. Os outros, no instante do golpe de cada um. */
  quadros.push({ transform: `translateX(${xs[0] - w / 2}px)${vira}`, opacity: .95, offset: 0 });
  xs.forEach((x, i) => {
    if (!i) return;
    const off = Math.min(.96, (i * passoN) / ida);
    if (off <= quadros[quadros.length - 1].offset) return;
    quadros.push({ transform: `translateX(${x - w / 2}px)${vira}`, opacity: .95, offset: off });
  });
  const ult = xs[xs.length - 1];
  quadros.push({ transform: `translateX(${ult - w / 2 - recua}px)${vira}`, opacity: 0, offset: 1 });
  v.animate(quadros, { duration: ida, easing: 'linear', fill: 'both' });
}

// A Acies: um corte na diagonal, por cima do corpo.
function _afCorte(el, cor) {
  el = _afCaixa(el);
  if (!el) return;
  const c = document.createElement('div');
  c.className = 'cb-corte';
  c.style.setProperty('--cor', cor);
  el.appendChild(c);
  setTimeout(() => c.remove(), 600);
}

// O Scutum: um escudo dourado que se ergue diante de quem fica em guarda.
function _afEscudoSurge(el) {
  el = _afCaixa(el);
  if (!el) return;
  const e = document.createElement('div');
  e.className = 'cb-escudo-surge';
  el.appendChild(e);
  setTimeout(() => e.remove(), 900);
}

// A Salus: um fio de vida de quem lançou até o aliado que ela cura.
function _afFio(deId, paraId, cor) {
  if (deId === paraId) return;   // curar a si mesma não tem de onde a onde
  const fx = document.getElementById('cbFx');
  const a = _afPonto(deId, .45), b = _afPonto(paraId, .45);
  if (!fx || !a || !b) return;
  const f = document.createElement('div');
  f.className = 'cb-fio';
  f.style.setProperty('--cor', cor);
  f.style.left = a.x + 'px'; f.style.top = a.y + 'px';
  f.style.width = Math.hypot(b.x - a.x, b.y - a.y) + 'px';
  f.style.transform = `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`;
  fx.appendChild(f);
  setTimeout(() => f.remove(), 800);
}

/* ══════════════════════════════════════════════════════════════════
   OS EFEITOS QUE FICAM (Fase 2, 21/09/2026)

   O apoio e a defesa quase não se viam: uma etiqueta de texto por cima
   do bicho e mais nada. Agora cada um tem um desenho que dura enquanto
   o efeito durar:

     escudo      a guarda: uma placa translúcida diante do corpo —
                 RACHADA na guarda repetida, APAGADA na morte súbita
     domo        a Barreira: uma cúpula de favos em volta do corpo
     concha      a Concha: um anel com as cores dos elementos resistidos
     chama       o Despertar: uma chama rubro-dourada aos pés
     elo         o Proteger: um fio dourado do Guarda até o protegido

   ── A MEMÓRIA (_afAuraMapa) ──
   O campo refaz-se por innerHTML a cada queda e a cada troca de lugar, e
   os elementos novos nascem sem nada. O mapa guarda o que cada um MOSTRA
   agora, e é dele que se redesenha. Durante uma jogada o modelo já está
   no fim, e por isso o mapa só se atualiza para quem a batida toca
   (_afEncenarUm): a cúpula da Barreira sobe quando a magia cai, e não no
   começo da jogada. No fim da jogada acerta-se tudo pelo modelo. */
let _afAuraMapa = {};

function _afAuraDoModelo(c) {
  const ef = c.efeitos || {};
  const vivo = _afVivoVisivel(c) && c.vivo;
  const m = { cls: [], concha: '', protege: vivo ? (c.protegendo || null) : null };
  if (!vivo) return m;
  if (c.guardando) m.cls.push('escudo', c.morteSubita ? 'apagado' : c.guardaFraca ? 'rachado' : '');
  if (ef.defesaMinima) m.cls.push('domo');
  if (ef.danoMais) m.cls.push('chama');
  // A Misericórdia: uma auréola dourada sobre a cabeça, até salvá-lo.
  if (ef.misericordia) m.cls.push('misericordia');
  // A crise: um coração vermelho que bate por dentro do corpo.
  if (typeof fuEmCrise === 'function' && fuEmCrise(c)) m.cls.push('crise');
  const tipos = Object.keys(ef.resisteTipos || {}).filter(k => ef.resisteTipos[k]);
  if (tipos.length) {
    m.cls.push('concha');
    const cores = tipos.map(tp => _afEfeitoDe(tp).cor);
    const passo = 360 / cores.length;
    m.concha = 'conic-gradient(' + cores.map((cor, i) =>
      `${cor} ${Math.round(i * passo)}deg ${Math.round((i + 1) * passo)}deg`).join(',') + ')';
  }
  /* ── OS ESTADOS (Fase 3) ──
     Cada estado tem o seu desenho, que dura enquanto ele durar: estrelas
     que giram (atordoado), pulsos vermelhos (enfurecido), gotas verdes
     (envenenado), anéis azuis lentos aos pés (lento), uma névoa escura
     que treme (abalado) e o corpo acinzentado (fraco). Juntam-se: um
     avatar lento e envenenado mostra os dois. */
  for (const e of FU_ESTADOS_LISTA) if (c.estados && c.estados[e]) m.cls.push('est-' + e);
  m.cls = m.cls.filter(Boolean);
  return m;
}

// Desenha, num posto, o que o mapa diz.
function _afAuraAplicar(id) {
  const efe = _afCaixa(_afEl(id));
  if (!efe || efe === _afEl(id)) return;
  let box = efe.querySelector(':scope > .cb-auras');
  if (!box) {
    box = document.createElement('div');
    box.innerHTML = '<i class="cb-aura-domo"></i><i class="cb-aura-concha"></i>'
                  + '<i class="cb-aura-chama"></i><i class="cb-aura-escudo"></i>'
                  + '<i class="cb-aura-halo"></i>'
                  // os estados (Fase 3)
                  + '<i class="cb-est-atordoado"><b></b><b></b><b></b></i>'
                  + '<i class="cb-est-enfurecido"></i>'
                  + '<i class="cb-est-envenenado"><b></b><b></b><b></b></i>'
                  + '<i class="cb-est-lento"><b></b><b></b></i>'
                  + '<i class="cb-est-abalado"></i>';
    efe.insertBefore(box, efe.firstChild);
  }
  const m = _afAuraMapa[id] || { cls: [] };
  box.className = 'cb-auras ' + m.cls.join(' ');
  box.style.setProperty('--concha', m.concha || 'none');
  /* A metade de trás do anel da Concha, na camada atrás do corpo: assim
     ele passa POR TRÁS do bicho e volta pela frente, em vez de ser um
     círculo inteiro pintado por cima dele. */
  const tras = _afEl(id) && _afEl(id).querySelector('.cb-efeitos-tras');
  if (tras) {
    if (!tras.firstChild) tras.innerHTML = '<i class="cb-aura-concha-tras"></i>';
    tras.classList.toggle('concha', m.cls.indexOf('concha') !== -1);
    tras.style.setProperty('--concha', m.concha || 'none');
  }
  /* O fraco e o abalado mexem no CORPO (cinza, tremor), e o corpo não
     está na caixa dos efeitos: a marca vai também no posto. */
  const posto = _afEl(id);
  if (posto) {
    posto.classList.toggle('est-fraco', m.cls.indexOf('est-fraco') !== -1);
    posto.classList.toggle('est-abalado', m.cls.indexOf('est-abalado') !== -1);
    posto.classList.toggle('crise', m.cls.indexOf('crise') !== -1);
  }
}

// Os fios do Proteger, na camada dos efeitos: um por Guarda que protege.
function _afElos() {
  const fx = document.getElementById('cbFx');
  if (!fx) return;
  fx.querySelectorAll('.cb-elo').forEach(e => e.remove());
  for (const id of Object.keys(_afAuraMapa)) {
    const alvo = _afAuraMapa[id].protege;
    if (!alvo) continue;
    const a = _afPonto(id, .55), b = _afPonto(alvo, .55);
    if (!a || !b) continue;
    const e = document.createElement('div');
    e.className = 'cb-elo';
    e.style.left = a.x + 'px'; e.style.top = a.y + 'px';
    e.style.width = Math.hypot(b.x - a.x, b.y - a.y) + 'px';
    e.style.transform = `rotate(${Math.atan2(b.y - a.y, b.x - a.x)}rad)`;
    fx.appendChild(e);
  }
}

/* Acerta o mapa pelo modelo — de todos (ids null) ou só de alguns — e
   redesenha. `semEscudo`: tira o escudo dos que se acertam (ver
   _afEncenarUm). */
function _afAurasDoModelo(ids, semEscudo) {
  if (!_afE) return;
  const todos = _afE.A.concat(_afE.B);
  for (const c of todos) {
    if (ids && ids.indexOf(c.id) === -1) continue;
    const m = _afAuraDoModelo(c);
    if (semEscudo) m.cls = m.cls.filter(k => k !== 'escudo' && k !== 'rachado' && k !== 'apagado');
    _afAuraMapa[c.id] = m;
    _afAuraAplicar(c.id);
  }
  _afElos();
}

/* ── O QUE UMA BATIDA MUDA NOS EFEITOS QUE FICAM ──

   O modelo está no fim da jogada, e seguir o modelo em cada batida
   fazia o escudo piscar: o Guarda que lança o Scutum já está em guarda
   no fim, e aparecia com escudo no primeiro golpe; depois perdia-o a
   cada batida em que era "quem" (as outras do Scutum, a Represália) e
   ganhava-o de novo quando levava um golpe. Medido pelo subagente de
   verificação: seis vezes numa jogada.

   Por isso o ESCUDO e o ELO andam pelos eventos, e o resto pelo modelo:
     · guardar          acende o escudo de quem guarda
     · estiloGuarda     acende o escudo do alvo (o Scutum)
     · a 1ª batida do autor da jogada apaga o escudo e o elo dele —
       agir é o que tira a guarda e o Proteger
     · proteger         liga o elo de quem protege
   O alvo de cada batida recebe do modelo os outros efeitos (a Barreira,
   a chama, os estados), que só aparecem na hora do golpe que os deu. */
const _AF_ESCUDO = ['escudo', 'rachado', 'apagado'];
function _afAurasDaBatida(ev) {
  if (!_afE) return;
  const antes = id => _afAuraMapa[id] || { cls: [], concha: '', protege: null };
  const doModelo = id => { const c = _afPorId(id); return c ? _afAuraDoModelo(c) : null; };
  const soEscudo = m => m.cls.filter(k => _AF_ESCUDO.indexOf(k) !== -1);
  const semEscudo = m => m.cls.filter(k => _AF_ESCUDO.indexOf(k) === -1);
  const mexidos = [];

  // o alvo: os efeitos do modelo; o escudo só no Scutum
  if (ev.alvo) {
    const m = doModelo(ev.alvo);
    if (m) {
      const a = antes(ev.alvo);
      // A primeira batida do autor em si mesmo (a Concha, uma cura em si)
      // também é agir: tira a guarda e o Proteger de antes.
      const agiuEmSi = ev._primeiraDoAutor && ev.quem === ev.alvo;
      m.cls = semEscudo(m).concat(ev.tipo === 'estiloGuarda' ? soEscudo(m)
                                  : agiuEmSi ? [] : soEscudo(a));
      m.protege = agiuEmSi ? null : a.protege;
      _afAuraMapa[ev.alvo] = m; mexidos.push(ev.alvo);
    }
  }
  // quem age: só o que a própria batida muda
  if (ev.quem && ev.quem !== ev.alvo) {
    const a = antes(ev.quem);
    let m = null;
    if (ev.tipo === 'guardar') m = doModelo(ev.quem);
    else if (ev._primeiraDoAutor) m = Object.assign({}, a, { cls: semEscudo(a), protege: null });
    if (ev.tipo === 'proteger') m = Object.assign({}, m || a, { protege: ev.alvo });
    if (m) { _afAuraMapa[ev.quem] = m; mexidos.push(ev.quem); }
  }
  mexidos.forEach(_afAuraAplicar);
  _afElos();
}

// Depois de o campo se refazer: tudo de volta, como o mapa estava.
function _afAurasRedesenhar() {
  if (!_afE) return;
  _afE.A.concat(_afE.B).forEach(c => _afAuraAplicar(c.id));
  _afElos();
}

// O instante em que um efeito que fica nasce: um clarão da forma dele.
function _afSurge(el, forma) {
  el = _afCaixa(el);
  if (!el || _afMovimentoReduzido()) return;
  const d = document.createElement('div');
  d.className = 'cb-surge cb-surge-' + forma;
  el.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

/* ── O QUE CADA EVENTO FAZ VER ──

   Um por um, pela ordem em que o motor os devolveu. O desenho segue o
   evento e não o contrário: se o motor não disse que alguém apanhou,
   ninguém tem de tremer. */
function _afEncenarUm(ev) {
  /* O que se VÊ vive numa função à parte: lá dentro cada caso sai mal se
     resolva, e as barras têm de ser tocadas em TODOS eles. Com as duas
     coisas na mesma função, o primeiro `return` levava a barra consigo. */
  _afEncenarCorpo(ev);
  _afAurasDaBatida(ev);

  /* A barra do alvo desce NESTA batida e não no fim do turno. O valor não
     se vai buscar ao modelo — o modelo já está no fim de tudo — vem do
     próprio evento, que guarda como ficou o alvo no instante em que o
     golpe caiu. É a única fonte que sabe o meio do turno. */
  if (_afSegredo) { _afSegredo.delete(ev.alvo); _afSegredo.delete(ev.quem); }
  if (ev.pvAlvo != null) _afBarraDe(ev.alvo, ev.pvAlvo, null);
  if (ev.tipo === 'gasto') _afBarraDe(ev.quem, null, ev.pmDepois);
  if (ev.tipo === 'guardar' && ev.pmGanho) _afBarraDe(ev.quem, null, ev.pmDepois);
  if (ev.pvQuem != null)   _afBarraDe(ev.quem, ev.pvQuem, null);
  if (ev.tipo === 'roubouPM') {
    _afBarraDe(ev.alvo, null, ev.pmAlvo);
    _afBarraDe(ev.quem, null, ev.pmQuem);
  }
}

function _afEncenarCorpo(ev) {
  {
    const deQuem = _afEl(ev.quem);
    const noAlvo = _afEl(ev.alvo);

    if (ev.tipo === 'gasto') { _afNumeroPM(deQuem, ev.pm); return; }

    if (ev.tipo === 'guardar') {
      _afGesto(deQuem, 'defende', 500);
      if (ev.pmGanho) _afNumeroPM(deQuem, ev.pmGanho, true);
      return;
    }

    if (ev.tipo === 'cura') {
      if (ev.curou) _afNumero(noAlvo, ev.curou, false, 'cura');
      if (ev.curou && !_afMovimentoReduzido()) {
        // A Salus: o fio de vida de quem lançou até quem ela cura.
        if (ev.estilo) _afFio(ev.quem, ev.alvo, _afEfeitoDe('cura').cor);
        // Toda cura: faíscas verdes que sobem, como vida que volta.
        _afImpacto(noAlvo, 'cura', ev.estilo ? .6 : .9);
      }
      return;
    }

    // O jeito do feitio no ataque forte (ver fuEstiloDoForte).
    if (ev.tipo === 'estiloGuarda') {
      _afGesto(noAlvo, 'defende', 500);
      if (!_afMovimentoReduzido()) _afEscudoSurge(noAlvo);   // o Scutum
      return;
    }
    if (ev.tipo === 'estiloLimpa')  { _afImpacto(noAlvo, 'luz'); return; }

    // O Guarda que protege, a Muralha e o PM roubado pela Sustentação.
    if (ev.tipo === 'proteger' || ev.tipo === 'protegeu' || ev.tipo === 'muralha') {
      _afGesto(deQuem, 'defende', 500);
      if (ev.tipo === 'proteger') _afSurge(noAlvo, 'elo');
      return;
    }
    if (ev.tipo === 'roubouPM') {
      _afNumeroPM(noAlvo, ev.n); _afNumeroPM(deQuem, ev.n, true); return;
    }
    if (ev.tipo === 'examinar') { _afImpacto(noAlvo, 'luz'); return; }

    // As magias que ficam: cada uma nasce com o clarão da sua forma.
    if (ev.tipo === 'cena') {
      // Pela magia lançada, e não pelos efeitos do alvo, que se acumulam.
      const forma = { barreira: 'domo', concha: 'concha', despertar: 'chama' }[ev.nome];
      if (forma) _afSurge(noAlvo, forma);
      else       _afImpacto(noAlvo, 'luz');
      return;
    }

    if (ev.tipo === 'ataque' || ev.tipo === 'magia') {
      if (!ev._lancou) _afGesto(deQuem, 'avanca', 400);
      if (!ev.acertou) { _afGesto(noAlvo, 'esquiva', 420); return; }
    }

    if (ev.perda > 0 || ev.curou > 0 || ev.tipo === 'devastacao' || ev.tipo === 'actoFinal') {
      const tipo = ev.tipo_dano || 'fisico';
      if (ev.curou > 0) {
        // absorveu: cura-se com o golpe, e o número sobe em vez de descer
        _afNumero(noAlvo, ev.curou, false, 'cura');
      } else {
        /* ── QUEM CAI NÃO SE ENCOLHE ──

           O golpe manda o corpo recuar (a classe bate, 0,42s) e a morte
           manda-o tombar (a classe tombando, 0,66s), e as duas são
           animações no MESMO .cb-corpo: a segunda a ser declarada no CSS
           ganha, e é o recuo. Medido: a queda só começava aos 450ms e corria 180 dos
           660 que tem — via-se o bicho encolher-se e depois aparecer
           deitado.

           Podia resolver-se trocando a ordem das regras, mas a ordem das
           regras é a resposta errada a uma pergunta de encenação: um
           corpo que recua do golpe e só depois cai leva DOIS golpes, e
           houve um. A queda já começa com o recuo dentro dela (os
           primeiros 12% da keyframe são isso mesmo).

           O número e a poeira ficam: esses dizem o dano, e o dano
           aconteceu. */
        if (!ev.caiu) _afGesto(noAlvo, 'bate', 520);
        _afNumero(noAlvo, ev.perda, !!ev.critico);
        _afPoeira(noAlvo);
        // A Misericórdia segurou: a auréola se parte e desce uma luz.
        if (ev.salvou) { _afSurge(noAlvo, 'halo'); _afSurge(noAlvo, 'graca'); }
      }
      _afImpacto(noAlvo, tipo, _afForcaDe(ev));
      // A Acies: o Lâmina corta na diagonal quando a Forte acerta.
      const q = _afPorId(ev.quem);
      // Só quando feriu: num alvo que absorve, cortar não diz a verdade.
      if (ev.tipo === 'magia' && ev.perda > 0 && q && q.ficha.feitio === 'lamina'
          && _afFormaDe(ev) !== 'lanca' && !_afMovimentoReduzido())
        _afCorte(noAlvo, _afEfeitoDe(tipo).cor);
      if (ev.pmAlvo) _afNumero(noAlvo, ev.pmAlvo, false, 'roubo');
      if (ev.critico) { _afOnda(noAlvo); _afEstremecer(); }
    }

    if (ev.drenou) _afNumero(deQuem, ev.drenou, false, 'cura');
  }
}

// ═══════════════════════════════════════════════════════════════════
// O INIMIGO
//
// Uma política e não uma inteligência, e vale a pena dizer o que ela é
// para ninguém lhe chamar outra coisa:
//
//   1. se alguém do lado dele está em crise e ele pode curar, cura
//   2. senão, a magia de ataque mais cara que consiga pagar
//   3. senão, o murro, que não custa nada
//
// Simples de propósito. Uma política esperta esconde defeitos do motor
// — ganha mesmo com as regras mal feitas — e é no banco de ensaio que
// esses defeitos têm de aparecer.
// ═══════════════════════════════════════════════════════════════════
function _afInimigoAge() {
  if (!_afE || _afE.acabou) { _afOcupado = false; _afAndar(); return; }

  /* Pergunta-se OUTRA VEZ de quem é a vez, em vez de se usar a lista que
     o _afAndar tinha na mão. Entre uma coisa e outra passou quase um
     segundo, e nesse segundo o estado pode ter mudado — um Último
     Suspiro derruba gente depois de o turno estar decidido.

     Uma lista de um segundo atrás é uma segunda ideia de quem joga, e
     duas ideias sobre isso acabam por discordar. */
  const vez = fuVez(_afE);
  if (!vez || vez.lado !== 'B') { _afOcupado = false; _afAndar(); return; }
  /* Quem age e o que faz, decide a IA (js/ia-fu.js). A dificuldade que
     escolhe o tamanho dos inimigos escolhe também o quanto eles pensam:
     o Fácil é a IA de sempre, e o Mestre olha afinidades, defende,
     economiza PM e troca de posto. */
  const d = (typeof fuIaDecidir === 'function')
    ? fuIaDecidir(_afE, 'B', vez.podem, _afIaNivel())
    : { quem: vez.podem[0], acao: { tipo: 'atacar' } };
  const quem = d && _afPorId(d.quem);
  if (!quem) { _afOcupado = false; _afAndar(); return; }
  _afJogarPor(quem, d.acao);
}

/* O nível da IA é o da dificuldade escolhida (DIFF_TIERS, em js/modal.js).
   A bancada (_arena-teste.html) não carrega o modal.js e escolhe à mão
   com `_afIaNivelFixo`; sem nenhum dos dois, pensa como no Médio. */
function _afIaNivel() {
  if (typeof _afIaNivelFixo === 'number') return _afIaNivelFixo;
  return (typeof miniDifficulty === 'function') ? miniDifficulty().tier : 1;
}

/* ── NADA DE EVENTOS INVENTADOS ──

   Esta função fabricava um `{tipo:'guardar'}` quando as duas tentativas
   do inimigo eram recusadas — um lance que o motor nunca produziu, com
   um turno que nunca se gastou. O ciclo voltava a perguntar de quem era
   a vez, obtinha o mesmo lutador, tentava o mesmo, e escrevia "pôs-se em
   guarda" outra vez. Apanhado no banco de ensaio: cinco seguidas, uma
   por segundo, sem fim.

   Duas lições, e a segunda é a que importa. A primeira é que uma acção
   que não gasta o turno não pode fechar um ciclo que espera que ele se
   gaste. A segunda é que a arena NÃO PODE inventar eventos: ela desenha
   o que o motor devolveu, e se o motor não devolveu nada, o que há a
   fazer é pedir-lhe uma acção de verdade — guardar é uma, e nunca é
   recusada. */
function _afJogarPor(quem, acao) {
  const tentar = (a) => fuAgir(_afE, Object.assign({ quem: quem.id }, a));
  let eventos = tentar(acao);
  if (!eventos.length) eventos = tentar({ tipo: 'atacar' });
  if (!eventos.length) eventos = tentar({ tipo: 'guardar' });

  /* E se nem a guarda passar, é porque este lutador não devia estar a
     jogar — já agiu, ou caiu. Segue-se em frente sem desenhar nada, que
     é melhor do que ficar aqui a tentar. */
  if (!eventos.length) { _afOcupado = false; _afAndar(); return; }
  _afMostrar(eventos);
}

// ═══════════════════════════════════════════════════════════════════
// O LANCE
//
// O que acabou de acontecer, ao meio, a apagar-se sozinho. Um toque
// abre-o inteiro.
//
// Diz a conta e não só o resultado: os DOIS dados, o que eles deram, e
// contra quanto. É a diferença entre um jogo de sorte e um jogo de
// regras — quem vê "🎲5·🎲5 = 10 contra 8" percebe porque acertou, e
// quem vê só "acertou" fica a achar que o computador decidiu.
// ═══════════════════════════════════════════════════════════════════
/* ══ OS DADOS ROLAM ══

   Cada dado entra girando de cima, passa por faces sorteadas cada vez
   mais devagar — como um dado de verdade perdendo força — e pousa com um
   pequeno impacto no valor que saiu. O segundo pousa um instante depois
   do primeiro. Com os dois no lugar, o Resultado Alto acende, e só então
   aparece o resto da frase: o resultado, o alvo e o dano.

   No crítico os dois dados estouram em laranja e tremem; no pifão caem
   vermelhos, meio tortos.

   ── O VALOR ESTÁ NO HTML DESDE O INÍCIO ──

   A linha nasce com o número certo (é essa que vai para o histórico), e
   a rolagem troca o texto por faces sorteadas ANTES de o navegador
   pintar pela primeira vez — portanto o resultado nunca aparece antes da
   hora, e o histórico nunca guarda um número do meio da rolagem.

   ── E UMA REDE ──

   A rolagem anda por `requestAnimationFrame`, que o navegador para
   quando a aba não está sendo pintada. Um `setTimeout` pousa os dados no
   tempo certo de qualquer jeito: sem ele, uma aba em segundo plano
   deixaria linhas com dados sorteados e o resultado escondido para
   sempre.

   Quem pediu ao sistema menos movimento vê os dados já pousados. */
/* Os mesmos tempos valem para os dados do palco (_afDadosPalco): os dois
   pares pousam juntos. Eram 460 ms, curtos demais para um dado de verdade
   quicar; o dono do jogo preferiu a animação inteira à pressa (22/09). */
const AF_ROLA_MS = 1000;         // quanto o primeiro dado rola
const AF_ROLA_DEFASAGEM = 180;   // o segundo pousa depois
const AF_ROLA_ACENDE = 170;      // o Resultado Alto acende, e a frase aparece
const AF_ROLA_TOTAL = AF_ROLA_MS + AF_ROLA_DEFASAGEM + AF_ROLA_ACENDE;

function _afMovimentoReduzido() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
}

function _afRolarDados(linha) {
  const dados = [...linha.querySelectorAll('.cb-dado[data-v]')];
  if (!dados.length || _afMovimentoReduzido()) return;

  const face = d => d.querySelector('.cb-dado-n');
  const lados = d => Math.max(2, parseInt(d.dataset.l, 10) || 6);
  const sortear = d => {
    const L = lados(d), atual = face(d).textContent;
    let v;
    do { v = String(1 + Math.floor(Math.random() * L)); } while (v === atual);
    face(d).textContent = v;
  };

  linha.classList.add('rolando');
  dados.forEach((d, i) => {
    d.style.animationDelay = (i * AF_ROLA_DEFASAGEM) + 'ms';
    d._troca = 0;
    sortear(d);
  });

  let fechou = false;
  const pousar = d => {
    if (d.classList.contains('pousou')) return;
    face(d).textContent = d.dataset.v;
    d.style.animationDelay = '';
    d.classList.add('pousou');
  };
  const fechar = () => {
    if (fechou) return;
    fechou = true;
    dados.forEach(pousar);
    setTimeout(() => {
      linha.classList.remove('rolando');
      dados.forEach(d => d.classList.add('revelado'));
    }, AF_ROLA_ACENDE);
  };

  const inicio = performance.now();
  const quadro = agora => {
    if (fechou || !linha.isConnected) return;
    const tempo = agora - inicio;
    let falta = false;
    dados.forEach((d, i) => {
      const fim = AF_ROLA_MS + i * AF_ROLA_DEFASAGEM;
      if (tempo >= fim) { pousar(d); return; }
      falta = true;
      // 0 → 1 ao longo do giro deste dado; as trocas ficam mais espaçadas
      const p = Math.max(0, tempo - i * AF_ROLA_DEFASAGEM) / AF_ROLA_MS;
      if (agora - d._troca >= 45 + 115 * p * p) { sortear(d); d._troca = agora; }
    });
    if (falta) requestAnimationFrame(quadro); else fechar();
  };
  requestAnimationFrame(quadro);
  setTimeout(fechar, AF_ROLA_MS + (dados.length - 1) * AF_ROLA_DEFASAGEM + 60);
}

/* ── OS DOIS DADOS DE UM TESTE ──

   Era uma cadeia de texto — "4·7+1" — e nela perdia-se a coisa que faz
   este sistema ser este sistema: dos dois dados, o MAIOR é o Resultado
   Alto, e é ele que vai somar-se ao dano. O par ficava com o ar de um
   número só, escrito de maneira estranha.

   Cada dado passa a ter a sua caixa, e a do maior acende: a linha diz,
   sem uma palavra, qual dos dois vai doer. Quando são iguais acendem as
   duas — e duas caixas acesas com seis ou mais é exactamente a condição
   de crítico do manual, que a linha já anunciava ao lado.

   Os atributos vêm com eles: `DES 4 · VIG 7` diz QUE dados se rolaram, e
   é a mesma informação que a ficha mostra na linha dos atributos. Sem
   isso o jogador via dois números sem saber de onde vinham. */
function _afDadosHTML(ev) {
  const d = ev.dados || [];
  const at = ev.atribs || [];
  const alto = Math.max(d[0] | 0, d[1] | 0);
  /* O crítico marca-se NOS DADOS e não só na palavra ao lado: dois dados
     iguais acendem os dois (ambos são o Resultado Alto), e sem isto um
     3·3 ficava com o mesmo aspecto de um 6·6 — que é crítico. A diferença
     entre os dois é a regra inteira, e tem de se ver. */
  /* O pifão (dois 1) também se marca nos dados, em vermelho: sem isso os
     dois 1 acendiam em dourado, como Resultado Alto, e o pior lance
     possível tinha a cor do melhor. */
  const cls = v => 'cb-dado' + (v === alto ? ' alto' : '')
                 + (ev.critico ? ' critico' : '') + (ev.pifao ? ' pifao' : '');
  /* `data-v` é o valor que sai; `data-l` é quantos lados o dado tem, para
     a rolagem só mostrar faces que ele tem de verdade (um d6 não passa
     por um 9 enquanto gira). Os lados são os de AGORA, e nunca menos do
     que o valor que saiu. */
  const q = ev.quem ? _afPorId(ev.quem) : null;
  const lados = (k, v) => Math.max(v | 0,
    (q && k && typeof fuDado === 'function') ? fuDado(q, k) : 12);
  const cx = (v, k) => `<i class="${cls(v)}" data-v="${v}" data-l="${lados(k, v)}">${
    k ? `<u>${esc(t('af.ab.' + k))}</u>` : ''}<span class="cb-dado-n">${v}</span></i>`;
  const mod = ev.modificador
    ? `<i class="cb-dado-mod">${ev.modificador > 0 ? '+' : ''}${ev.modificador}</i>` : '';
  return cx(d[0], at[0]) + cx(d[1], at[1]) + mod;
}

/* O nome e os dados à vista; o resto da frase — o resultado, o alvo, o
   dano — num invólucro que fica apagado enquanto os dados rolam. Mostrar
   "13 contra 8 · −25 de vida" ao lado de dados que ainda estão girando é
   contar o fim antes do meio. */
function _afComResto(p) {
  if (p.length <= 2) return p.join(' · ');
  return p[0] + ' · ' + p[1] + '<span class="cb-lance-resto"> · ' + p.slice(2).join(' · ') + '</span>';
}

/* O nome do que foi usado num golpe. O motor guarda só o id da magia
   (`ev.nome`), e o nome de verdade depende de quem lançou — a Barragem de
   um avatar de fogo é Ignis, a de um de gelo é Glacies. Sem id é o golpe
   comum. */
function _afNomeDoGolpe(ev) {
  if (!ev.nome) return t('af.m.golpe');
  const c = _afPorId(ev.quem);
  const magias = (c && typeof fuMagiasDe === 'function') ? fuMagiasDe(c.ficha) : {};
  for (const l of Object.keys(magias)) {
    if (magias[l].id === ev.nome) return _afMagiaNome(magias[l]);
  }
  return t('af.m.' + ev.nome);
}

/* `seguido`: este golpe é mais um alvo da mesma jogada (a Barragem que
   varre a linha). Ver _afMostrar. */
function _afLanceDe(ev, seguido) {
  const nome = n => esc(_afNome(_afPorId(n)));
  const p = [];

  if (ev.tipo === 'guardar') return (ev.pmGanho
    ? t('af.lance.guardar_pm', { nome: nome(ev.quem), n: ev.pmGanho })
    : t('af.lance.guardar', { nome: nome(ev.quem) }))
    + (ev.repetida ? ' · <i>' + t('af.lance.guarda_rep') + '</i>' : '');
  if (ev.tipo === 'mover')
    return t('af.lance.mover', { nome: nome(ev.quem), com: nome(ev.com) });
  if (ev.tipo === 'gasto')  return null;   // vai colado ao golpe
  if (ev.tipo === 'fim')    return null;   // o fim tem tela própria

  // Em si mesmo (a Concha) não repete o nome: "Caído lançou Concha · Caído".
  if (ev.tipo === 'cena')
    return t('af.lance.cena', { nome: nome(ev.quem), magia: t('af.m.' + ev.nome) })
         + (ev.alvo && ev.alvo !== ev.quem ? ' → <b>' + nome(ev.alvo) + '</b>' : '')
         + (ev.efeitos && ev.efeitos.danoMais
            ? ' · <span class="sobe">' + t('af.lance.despertar', { n: ev.efeitos.danoMais }) + '</span>' : '');

  // A cura do ataque forte da Sustentação não tem nome de magia próprio.
  if (ev.tipo === 'cura' && ev.estilo)
    return t('af.lance.estilo_cura', { nome: '<b>' + nome(ev.quem) + '</b>', alvo: '<b>' + nome(ev.alvo) + '</b>' })
         + ` <span class="sobe">${t('af.lance.cura', { n: ev.curou })}</span>`
         + (ev.frente ? ' · ' + t('af.lance.frente') : '');
  if (ev.tipo === 'cura')
    return `<b>${nome(ev.quem)}</b> · ${t('af.m.' + ev.nome)} · <b>${nome(ev.alvo)}</b> `
         + `<span class="sobe">${t('af.lance.cura', { n: ev.curou })}</span>`
         + (ev.frente ? ' · ' + t('af.lance.frente') : '');
  if (ev.tipo === 'estiloGuarda')
    return t('af.lance.estilo_guarda', { nome: '<b>' + nome(ev.alvo) + '</b>' });
  if (ev.tipo === 'estiloLimpa')
    return t('af.lance.estilo_limpa', { nome: '<b>' + nome(ev.alvo) + '</b>', e: t('af.est.' + ev.estado) });

  // As regras dos feitios e as magias novas (ver js/combate-fu.js).
  const b = id => '<b>' + nome(id) + '</b>';
  if (ev.tipo === 'proteger')   return t('af.lance.proteger', { nome: b(ev.quem), alvo: b(ev.alvo) });
  if (ev.tipo === 'protegeu')   return t('af.lance.protegeu', { nome: b(ev.quem), alvo: b(ev.alvo) });
  if (ev.tipo === 'muralha')    return t('af.lance.muralha',  { nome: b(ev.quem) });
  if (ev.tipo === 'roubouPM')   return t('af.lance.roubou',   { nome: b(ev.quem), alvo: b(ev.alvo), n: ev.n });
  if (ev.tipo === 'represalia')
    return t('af.lance.represalia', { nome: b(ev.quem), alvo: b(ev.alvo) }) + ' · ' + _afDanoTexto(ev);

  if (ev.tipo === 'actoFinal' || ev.tipo === 'devastacao') {
    // Em quem caiu: sem o alvo, "−20 de vida" não dizia de quem.
    p.push(ev.tipo === 'actoFinal'
      ? t('af.lance.suspiro', { nome: nome(ev.quem) }) + ' → <b>' + nome(ev.alvo) + '</b>'
      : '<b>' + nome(ev.quem) + '</b> · ' + t('af.lance.devasta', { nome: '<b>' + nome(ev.alvo) + '</b>' }));
    p.push(_afDanoTexto(ev));
    return p.join(' · ');
  }

  if (ev.tipo === 'examinar') {
    p.push('<b>' + nome(ev.quem) + '</b>');
    p.push(_afDadosHTML(ev));
    if (ev.laco) p.push('<b class="laco">💞 ' + t('af.lance.laco', { nome: nome(ev.laco.com), n: ev.laco.bonus }) + '</b>');
    p.push(t('af.lance.examina', { alvo: '<b>' + nome(ev.alvo) + '</b>', r: ev.resultado }));
    if (ev.critico) p.push('<b class="critico">' + t('af.lance.critico') + '</b>');
    if (ev.pifao)   p.push('<b class="pifao">' + t('af.lance.pifao') + '</b>');
    p.push(ev.nivel > ev.antes ? t('af.lance.exame.' + ev.nivel) : t('af.lance.exame.nada'));
    return _afComResto(p);
  }

  if (ev.tipo === 'ataque' || ev.tipo === 'magia') {
    /* ── QUEM, COM O QUÊ, EM QUEM ──

       A linha dizia o nome de quem bateu e os dados, e só depois do
       acerto o alvo; a magia não aparecia nunca. Um erro saía como
       "Vorn · 5 contra 8 · não acertou" — sem dizer o que ele lançou nem
       em quem. Agora os três vêm na frente, antes dos dados.

       E uma magia que acerta vários vira UMA jogada: a primeira linha diz
       quem lançou o quê, e as seguintes começam com ↳ e só o alvo. Antes
       eram três linhas iguais, e pareciam três ataques. */
    if (seguido) {
      p.push('↳ <b>' + nome(ev.alvo) + '</b>');
    } else {
      p.push(t('af.lance.usa', {
        nome: '<b>' + nome(ev.quem) + '</b>',
        magia: '<i class="cb-magia">' + esc(_afNomeDoGolpe(ev)) + '</i>',
        alvo: '<b>' + nome(ev.alvo) + '</b>',
      }));
    }
    p.push(_afDadosHTML(ev));
    if (ev.laco) p.push('<b class="laco">💞 ' + t('af.lance.laco', { nome: nome(ev.laco.com), n: ev.laco.bonus }) + '</b>');
    // Contra QUAL defesa: a magia mira a Defesa Mágica, o golpe a Defesa.
    p.push(t(ev.naMente ? 'af.lance.contra_mag' : 'af.lance.contra_def', { r: ev.resultado, dl: ev.dl }));
    if (ev.critico) p.push('<b class="critico">' + t('af.lance.critico') + '</b>');
    if (ev.pifao)   p.push('<b class="pifao">' + t('af.lance.pifao') + '</b>');
    if (!ev.acertou) { p.push(t('af.lance.falhou')); return _afComResto(p); }
    // O golpe comum é físico: diz isso na linha, para o jogador entender
    // por que ele entra por inteiro em quem resiste ou absorve o elemento.
    if (ev.tipo_dano === 'fisico') p.push('<i>' + t('af.lance.fisico') + '</i>');
    if (ev.furouGuarda) p.push('<b>' + t('af.lance.furou') + '</b>');
    if (ev.execucao)    p.push('<b>' + t('af.lance.execucao', { n: ev.execucao }) + '</b>');
    p.push(_afDanoTexto(ev));
    if (ev.estadoDado) p.push(t('af.lance.estado', { e: t('af.est.' + ev.estadoDado) }));
    if (ev.envenenou)  p.push(t('af.lance.estado', { e: t('af.est.envenenado') }));
    if (ev.drenou)     p.push(t('af.lance.dreno', { n: ev.drenou }));
    return _afComResto(p);
  }
  return null;
}

function _afDanoTexto(ev) {
  const p = [];
  if (ev.afinidade) p.push('<i>' + t('af.af.' + ev.afinidade) + '</i>');
  if (ev.curou)      p.push('<span class="sobe">' + t('af.lance.cura', { n: ev.curou }) + '</span>');
  else if (ev.perda) p.push('<span class="desce">' + t('af.lance.dano', { n: ev.perda }) + '</span>');
  else               p.push(t('af.lance.nada'));
  if (ev.pmAlvo)  p.push(t('af.lance.pmGanho', { n: ev.pmAlvo }));
  if (ev.salvou)  p.push(t('af.lance.salvou'));
  if (ev.resiliu) p.push(t('af.lance.resiliu'));
  if (ev.caiu)    p.push('<b>' + t('af.lance.caiu', { nome: esc(_afNome(_afPorId(ev.alvo))) }) + '</b>');
  return p.join(' · ');
}

let _afLanceTimer = null;
let _afHistorico = [];
let _afJogadaSeq = 0;

/* Com `acrescenta`, a linha nova se junta às do mesmo turno em vez de
   apagar as anteriores: um turno é uma sequência de testes, e se lê de
   cima para baixo como uma.

   ── CADA BATIDA NUMA LINHA PRÓPRIA ──

   Eram frases coladas com <br> dentro de uma caixa só, e a caixa tem
   altura máxima. No celular essa altura é 6rem (96px): três batidas
   davam 157px de texto, e o que passava do limite era cortado EMBAIXO —
   ou seja, o golpe mais recente, justamente o que acabou de acontecer.

   Com uma <div> por batida, o CSS empilha as linhas a partir do fundo
   (`justify-content: flex-end`), e o que não cabe sai por CIMA: some a
   linha mais velha, e a mais nova fica sempre à vista. */
/* `noPalco`: os dados desta linha rolam no PALCO (_afDadosPalco). Aqui as
   caixas ficam vazias e só aparecem, já com o valor, quando os do palco
   pousam: rolar nos dois lugares ao mesmo tempo era contar a mesma coisa
   duas vezes. */
function _afLance(html, acrescenta, noPalco) {
  if (!html) return;
  // A jogada a que a linha pertence: `acrescenta` é mais uma batida do
  // mesmo turno. O histórico inverte as jogadas, não as linhas de cada uma.
  if (!acrescenta || !_afHistorico.length) _afJogadaSeq++;
  _afHistorico.push({ ronda: _afE ? _afRondaVisivel() : 0, html, jogada: _afJogadaSeq });
  const el = document.getElementById('cbLog');
  if (!el) return;
  /* Por DOM, e não reescrevendo o innerHTML com as linhas antigas: uma
     linha antiga pode estar com os dados ainda girando, e recriá-la a
     partir do HTML copiava o número sorteado do meio da rolagem e a
     deixava presa assim — o relógio da animação ficava agarrado ao nó
     velho, que já não estava na tela. */
  const linha = document.createElement('div');
  linha.className = 'cb-lance';
  linha.innerHTML = html;
  if (acrescenta && el.classList.contains('viva')) {
    el.appendChild(linha);
    const todas = el.querySelectorAll(':scope > .cb-lance');
    for (let k = 0; k < todas.length - 4; k++) todas[k].remove();
  } else {
    el.replaceChildren(linha);
  }
  if (noPalco) linha.classList.add('aguarda'); else _afRolarDados(linha);
  el.classList.add('viva');
  clearTimeout(_afLanceTimer);
  /* Apaga-se sozinho, mas só depois de haver tempo para o ler — e o
     tempo de ler não é o tempo de um lance. Quatro lances passam em
     3,6 segundos, e o último que interessa é o de quem acabou de bater
     em mim.

     Quem quiser rever toca nele e abre o histórico inteiro. */
  _afLanceTimer = setTimeout(() => el.classList.remove('viva'), AF_PAUSA * 6);
  return linha;
}

/* ══ O PAINEL POR CIMA DA BATALHA ══

   A ficha e o histórico abrem no mesmo painel, e cada um montava a casca
   à mão — a caixa, o `stopPropagation`, o clique no fundo para fechar. Duas
   cópias da mesma casca; o botão de fechar teria de ser escrito nas duas
   e, um dia, só uma o teria.

   ── O ✕ ──

   Fechar era tocar FORA do painel. No celular o painel ocupa quase a tela
   inteira (335 de 355px de largura, 772 de 792 de altura), e o que sobra
   de fundo são dez píxeis em volta: tocar ali é mirar numa fresta, e quem
   não sabe que o fundo fecha não tem como adivinhar.

   O botão fica grudado no canto de cima enquanto a ficha rola, e o toque
   no fundo continua fechando, para quem já estava acostumado. */
function _afAbrirPainel(html, classe) {
  const el = document.getElementById('cbAjuda');
  if (!el) return;
  const rot = esc(t('af.fechar'));
  el.innerHTML = `<div class="cb-ajuda-cx ${classe || ''}" onclick="event.stopPropagation()">
    <button type="button" class="cb-ajuda-fechar" onclick="_afFecharPainel()"
            title="${rot}" aria-label="${rot}">✕</button>
    ${html}
  </div>`;
  el.classList.add('aberta');
  el.onclick = _afFecharPainel;
}

function _afFecharPainel() {
  const el = document.getElementById('cbAjuda');
  if (!el) return;
  el.classList.remove('aberta');
  el.innerHTML = '';
}

/* O mais recente EM CIMA: quem abre o histórico quer saber o que acabou
   de acontecer, e com a ordem de antes tinha de rolar até o fim da
   lista para achar. O número da rodada vai à esquerda de cada linha. */
/* Invertem-se as JOGADAS e não as linhas: dentro de uma magia que acerta
   três, a linha de quem lançou vem antes dos ↳ de cada alvo, como
   aconteceu. Invertendo linha a linha, os ↳ subiam acima da jogada. */
function _afAbrirHistorico() {
  const jogadas = [];
  for (const x of _afHistorico.slice(-60)) {
    const ultima = jogadas[jogadas.length - 1];
    if (ultima && ultima[0].jogada === x.jogada) ultima.push(x);
    else jogadas.push([x]);
  }
  _afAbrirPainel(jogadas.reverse().flat().map(x =>
    `<p class="cb-hist"><i>${x.ronda}</i> ${x.html}</p>`).join(''), 'cb-ajuda-hist');
}

// ═══════════════════════════════════════════════════════════════════
// A FICHA
// ═══════════════════════════════════════════════════════════════════
/* A ficha é a MESMA que a colónia mostra — js/ficha-fu-ui.js. Havia aqui
   uma segunda versão, escrita à mão, e as duas liam a mesma ficha para
   mostrar coisas ligeiramente diferentes: esta não dizia o feitio nem o
   arranjo, aquela não dizia os dados de agora. Duas telas do mesmo
   assunto acabam a mostrar dois avatares.

   O que este sítio acrescenta é o LUTADOR: aqui há batalha a correr, e
   os dados encolhidos pelos estados aparecem ao lado dos de nascença.

   ── E O NOME SAIU DAQUI ──

   Havia um <h3> com o nome do bicho por cima do bloco. O bloco passou a
   ter faixa própria, com o nome de um lado e o "Nv 12 • ESPECIALISTA •
   RARO" do outro — e o <h3> ficou a dizer a mesma palavra duas vezes,
   uma por cima da outra, com dois tamanhos de letra diferentes.

   O lutador leva o nome consigo, e é ele que a faixa lê. */
function _afFicha(id) {
  const c = _afPorId(id);
  if (!c || typeof renderFichaFU !== 'function') return;
  // A ficha do inimigo, só até onde o jogador já descobriu (Examinar).
  _afAbrirPainel(renderFichaFU(null, c, c.lado === 'A' ? null : _afConhece(c)));
}

// ═══════════════════════════════════════════════════════════════════
// O FIM
// ═══════════════════════════════════════════════════════════════════
/* É este arquivo que desenha a batalha; quem sabe o que ela custa e
   rende é o js/pve-fu.js. No banco de ensaio ele não está carregado, e
   não devia estar — um banco que cobra energia e dá prémios precisa de um
   jogador com conta. */
function _afTemMoldura() { return typeof _pveFecharContas === 'function'; }

/* O ✕ a meio da batalha É o desistir, com a pergunta antes. Acabada a
   batalha, fecha e pronto — aí já não há nada a cobrar. Sem moldura
   (banco de ensaio) fecha sempre, que é o que lá faz sentido. */
function _afDesistir() {
  if (_afTemMoldura() && _afE && !_afE.acabou) { _pveDesistir(); return; }
  afFechar();
}

function _afFimHTML() {
  const v = _afE.vencedor;
  const txt = _afE._desistiu ? t('pve.desistiu.titulo')
            : v === 'A' ? t('af.fim.ganhou')
            : v === 'B' ? t('af.fim.perdeu')
            : _afE.porLimite ? t('af.fim.limite', { n: (typeof FU_RONDAS_MAX === 'number') ? FU_RONDAS_MAX : 50 })
            : t('af.fim.empate');

  /* O prémio e a fratura, quando há moldura que os tenha calculado. São
     a única coisa que este painel diz e que não veio do motor. */
  const g = _afE._premio;
  const fr = _afE._fraturados || [];
  const aviso = fr.length
    ? `<div class="cb-fratura">🦴 ${t('pve.fratura', { nomes: fr.join(', ') })}</div>` : '';
  /* Em linhas: as moedas, que são do jogador, em cima e maiores; embaixo
     o que vai para cada um dos três — XP, vínculo e a energia gasta. */
  const premio = g ? `<div class="cb-premio">
      ${g.desistiu
        ? `<span class="cada">${t('pve.desistiu')}</span>
           <div class="cb-premio-linha"><span class="gasto">−${g.energia} ⚡</span></div>`
        : `<div class="cb-premio-linha moedas"><span>+${g.coinGain} 🪙</span></div>
           <span class="cada">${t('pve.premio.cada', { n: g.quantos })}</span>
           <div class="cb-premio-linha"><span>+${g.xpGain} XP</span><span>+${g.vinculo} 💜</span>${g.laco ? `<span>+${g.laco} 💞</span>` : ''}<span class="gasto">−${g.energia} ⚡</span></div>`}
    </div>` : '';

  return `<div class="cb-fim ${v === 'A' ? 'bom' : 'mau'}">${esc(txt)}</div>
    ${aviso}${premio}
    <button class="cb-btn sair" onclick="afFechar()">
      <span class="cb-btn-rot">${_afTemMoldura() ? t('pve.voltar') : t('af.fim.sair')}</span></button>`;
}

function _afFim() {
  _afQuem = null; _afMenu = false; _afPasso = null;
  // As contas fecham-se ANTES de o painel se desenhar: é ele que mostra o
  // prémio, e um painel desenhado primeiro mostrava a batalha sem ganho
  // nenhum e nunca mais se refazia.
  if (_afTemMoldura()) _pveFecharContas(_afE);
  _afChave = null;      // o fim muda a estrutura toda
  _afDesenhar();

  /* ── E O ÚLTIMO LANCE SAI DE CENA ──

     Ele continuava aceso por trás do painel do fim: no celular, o painel
     e o lance ocupam a mesma faixa do céu, e o "13 contra 8 · resistiu"
     do último golpe aparecia atravessado debaixo de "A colônia resistiu".
     O lance ainda está no histórico, que é onde se vai buscar o que já
     aconteceu. */
  const log = document.getElementById('cbLog');
  if (log) { clearTimeout(_afLanceTimer); log.classList.remove('viva'); }
}

// Para o banco de ensaio e, um dia, para o servidor conferir uma luta.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { afAbrir, afFechar };
}
