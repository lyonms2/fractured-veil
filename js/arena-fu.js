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
function afAbrir(equipaA, equipaB, semente, aoSair) {
  _afE = fuIniciar(equipaA, equipaB, semente);
  _afQuem = null; _afPasso = null; _afMenu = false; _afOcupado = false;
  _afSair = aoSair || null;
  _afShell();
  _afDesenhar();
  _afLance('<b>' + t('af.lance.comeca', {
    nome: esc(_afNome(_afPorId(_afE.iniciativa.quem))) }) + '</b> · '
    + t('af.lance.dados', { a: _afE.iniciativa.dados[0], b: _afE.iniciativa.dados[1] })
    + ' · ' + t('af.lance.acerta', { r: _afE.iniciativa.resultado, dl: _afE.iniciativa.dl }));
  setTimeout(_afAndar, AF_PAUSA);
}

function afFechar() {
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
        <button id="cbDesistir" class="desistir" onclick="_afDesistir()"
                title="${esc(_afTemMoldura() ? t('pve.acao.desistir_sub', { n: PVE_ENERGIA_DESISTIR }) : '')}"
                >${_afTemMoldura() ? t('pve.acao.desistir') : ''}</button>
        <button onclick="_afDesistir()">✕</button>
      </span>
    </div>

    <div class="cb-campo" id="cbCampo"></div>

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
               c.vivo ? '' : 'caido', podeAgir ? 'pode' : ''].join(' ');

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
  const marcas = [];
  const m = (txt, k, ajuda) => marcas.push(
    `<span class="cb-marca ${k}" title="${esc(ajuda || txt)}">${esc(txt)}</span>`);
  const EST = (typeof FU_ESTADOS !== 'undefined') ? FU_ESTADOS : {};
  for (const e of Object.keys(c.estados)) {
    const at = ((EST[e] && EST[e].morde) || []).map(k => t('af.ab.' + k));
    m(t('af.est.' + e), 'mal', t('af.est.' + e) + ' — ' + (at.length > 1
      ? t('af.ag.morde2', { a: at[0], b: at[1] })
      : t('af.ag.morde1', { a: at[0] || '—' })));
  }
  if (c.guardando) m('▲', 'bem', t('af.ag.guarda') + ' — ' + t('af.ag.guarda.ef'));
  if (c.efeitos.resisteFisico)
    m(t('af.m.concha'), 'bem', t('af.m.concha') + ' — ' + t('af.ag.concha.ef'));
  if (c.efeitos.defesaMinima)
    m(t('af.m.barreira'), 'bem', t('af.m.barreira') + ' — '
      + t('af.ag.barreira.ef', { n: c.efeitos.defesaMinima }));
  if (c.efeitos.misericordia)
    m(t('af.m.misericordia'), 'bem', t('af.m.misericordia') + ' — ' + t('af.ag.mercy.ef'));
  if (c.efeitos.subirDado)
    m(t('af.ab.' + c.efeitos.subirDado) + '▴', 'bem', t('af.m.despertar') + ' — '
      + t('af.ag.desperta.ef', { a: t('af.ab.' + c.efeitos.subirDado) }));
  if (typeof fuNoAr === 'function' && fuNoAr(c))
    m('✧', 'bem', t('af.ag.voo') + ' — ' + t('af.ag.voo.ef'));
  if (c.derrubado) m('▾', 'mal', t('af.ag.chao') + ' — ' + t('af.ag.chao.ef'));
  if (fuEmCrise(c)) m('!', 'crise', t('af.ag.crise') + ' — ' + t('af.ag.crise.ef'));

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
function _afBarra(atual, max, tipo) {
  const f = Math.max(0, Math.min(100, (atual / Math.max(1, max)) * 100));
  const baixa = (tipo === 'pv' && f <= 25) ? ' baixa' : '';
  return `<div class="cb-barra ${tipo}${baixa}">
    <u style="width:${f}%"></u><i style="width:${f}%"></i>
    <span>${atual}/${max}</span></div>`;
}

/* ── O QUE O MEU GOLPE LHE FAZ ──

   Enquanto um dos meus está escolhido, cada cartão inimigo diz numa seta
   o que o dano DELE faz àquele bicho. É a pergunta do turno — em quem
   bato? — e a resposta estava enterrada em três fichas que era preciso
   abrir uma a uma.

   O tipo é o do avatar escolhido, e é o mesmo tipo para tudo o que ele
   lança: o golpe comum, a barragem, o concentrado e a Devastação usam
   todos o `ficha.tipo` dele (ver o js/combate-fu.js). Uma seta só chega
   porque não há segunda resposta possível.

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
  const af = ((c.ficha.afinidades || {})[tipo]) || 'nada';
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
               c.vivo ? '' : 'caido', (meu && podeAgir) ? 'entra' : ''].join(' ');
  const gesto = (meu && podeAgir && !_afPasso)
    ? `_afEscolherQuem('${c.id}')` : `_afFicha('${c.id}')`;
  return `<div class="${cls}" id="cbCart${c.id}"
       role="button" tabindex="0" onclick="${gesto}"
       title="${esc(meu && podeAgir ? t('af.menu.abrir') : t('af.ficha.abrir', { nome: _afNome(c) }))}">
    <div class="cb-ficha-cara">
      ${typeof gerarSVG === 'function' ? gerarSVG(c.ficha, c.ficha.raridade, c.ficha.seed, 100, 100, _afFase(c)) : ''}
      <span class="cb-ficha-nivel">${c.posto + 1}</span>
    </div>
    <div class="cb-ficha-barras">
      <div class="cb-ficha-nome">${esc(_afNome(c))}</div>
      ${_afBarra(_afPvVisivel(c), c.ficha.pvMax, 'pv')}
      ${_afBarra(_afPmVisivel(c), c.ficha.pmMax, 'pm')}
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
    .map(c => c.id + c.posto + (c.vivo ? 'v' : 'x'))
    .join('|') + '#' + (_afQuem || '') + '#' + (_afPasso ? 'p' : '')
    + '#' + (vez ? vez.lado + vez.podem.join(',') : 'fim');
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
  }
  _afBarras();
  const vez = _afE.acabou ? null : fuVez(_afE);
  document.getElementById('cbTurno').textContent =
    t('af.ronda', { n: _afE.ronda })
    + (vez ? ' · ' + t(vez.lado === 'A' ? 'af.vez' : 'af.vez_dele') : '');
  const bd = document.getElementById('cbDesistir');
  if (bd) bd.style.display = _afE.acabou ? 'none' : '';
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
      b.classList.toggle('baixa', c.vivo && f <= 25);
      const txt = b.querySelector('span');
      if (txt) txt.textContent = pv + '/' + c.ficha.pvMax;
    }
  }
  if (pm != null) {
    const f = Math.max(0, Math.min(100, (pm / Math.max(1, c.ficha.pmMax)) * 100));
    const b = linha.querySelector('.cb-barra.pm');
    if (b) {
      b.querySelector('i').style.width = f + '%';
      b.querySelector('u').style.width = f + '%';
      const txt = b.querySelector('span');
      if (txt) txt.textContent = pm + '/' + c.ficha.pmMax;
    }
  }
}

function _afBarras() {
  if (!_afE) return;
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
        pv.classList.toggle('baixa', c.vivo && fPV <= 25);
        const txt = pv.querySelector('span');
        if (txt) txt.textContent = pvV + '/' + c.ficha.pvMax;
      }
      // dos dois lados agora: o inimigo também mostra a magia dele
      const pm = linha.querySelector('.cb-barra.pm');
      if (pm) {
        const fPM = Math.max(0, Math.min(100, (pmV / Math.max(1, c.ficha.pmMax)) * 100));
        pm.querySelector('i').style.width = fPM + '%';
        pm.querySelector('u').style.width = fPM + '%';
        const txt = pm.querySelector('span');
        if (txt) txt.textContent = pmV + '/' + c.ficha.pmMax;
      }
      linha.classList.toggle('caido', !c.vivo);
    }
    const posto = document.getElementById('cbLut' + c.id);
    if (posto) posto.classList.toggle('caido', !c.vivo);
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
function _afAndar() {
  if (!_afE) return;
  if (_afE.acabou) { _afFim(); return; }

  const vez = fuVez(_afE);
  if (!vez) {
    const ev = fuNovaRonda(_afE);
    _afLance('<i>' + t('af.lance.ronda', { n: ev.n }) + '</i>');
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
function _afOrbe(selo, rot, detalhe, gesto, custo, podeOuNao) {
  const off = podeOuNao === false;
  return `<button class="cb-orbe" ${off ? 'disabled' : ''}
      onclick="${off ? '' : gesto}" title="${esc(rot + (detalhe ? ' · ' + detalhe : ''))}">
    <span class="cb-orbe-disco">${_afSelo(selo)}${
      custo != null && custo !== '' ? `<span class="cb-orbe-custo">${esc(custo)}</span>` : ''}</span>
    <span class="cb-orbe-nome">${esc(rot)}${detalhe ? `<i>${esc(detalhe)}</i>` : ''}</span>
  </button>`;
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
    h += _afOrbe(lugar, nome, nome === rot ? '' : rot,
      `_afEscolher('${lugar}')`, custo || null, custo <= eu.pm);
  }

  // reordenar: só se houver com quem
  const meus = (eu.lado === 'A' ? _afE.A : _afE.B).filter(c => c.vivo && c !== eu);
  /* Sem o orbe da ficha: o corpo em campo abre-a, e é onde ela se pede.
     Ocupava um lugar na coluna para repetir um gesto que já existe — e a
     coluna é o que tapa o palco enquanto está aberta. */
  h += _afOrbe('mover', t('af.orbe.mover'), '', `_afPedirMover()`, null, meus.length > 0);
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

  // as que se lançam em si mesmo, e a que cai em todos: nada a escolher
  if (magia.proprio || magia.todos) { _afAgir({ tipo: 'magia', magia }); return; }

  // as de dentro: escolhe-se o companheiro
  if (magia.aliado || magia.cura) {
    _afPasso = { lugar, magia, aliado: true };
    _afDesenhar();
    return;
  }

  // as de fora, com um alvo só: o da frente cobre, não há o que escolher
  if ((magia.alvos || 1) === 1 || lugar === 'comum') {
    _afAgir({ tipo: lugar === 'comum' ? 'atacar' : 'magia',
              magia: lugar === 'comum' ? null : magia });
    return;
  }

  // as que varrem a linha: aí sim, escolhe-se quantos e quais
  _afPasso = { lugar, magia, aliado: false };
  _afDesenhar();
}

function _afPedirMover() {
  if (_afOcupado) return;
  _afPasso = { mover: true };
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
  if (_afPasso.aliado) return c.lado === eu.lado;
  return c.lado !== eu.lado;
}

function _afAlvosHTML(eu) {
  const lista = _afE.A.concat(_afE.B).filter(_afEhAlvo)
    .sort((a, b) => a.posto - b.posto);
  const rot = _afPasso.mover ? t('af.mover.com')
            : _afPasso.aliado ? t('af.alvo.aliado') : t('af.alvo.inimigo');

  let h = `<div class="cb-pm-cab">${esc(rot)}</div>`;
  // varrer a linha: a opção de os apanhar a todos de uma vez
  if (!_afPasso.mover && !_afPasso.aliado) {
    const custo = fuCusto(_afPasso.magia, lista.length);
    h += _afOrbe('todos', t('af.orbe.todos'), lista.length + '',
      `_afAlvo('*')`, custo || null, custo <= eu.pm);
  }
  for (const c of lista) {
    const custo = _afPasso.mover ? 0 : fuCusto(_afPasso.magia, 1);
    h += _afOrbe(_afPasso.mover ? 'mover' : (_afPasso.aliado ? 'suporte' : 'forte'),
      _afNome(c), `${c.pv}/${c.ficha.pvMax}`,
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
  _afAgir({ tipo: 'magia', magia: _afPasso.magia, alvos: [c.id] });
}

// ═══════════════════════════════════════════════════════════════════
// JOGAR
// ═══════════════════════════════════════════════════════════════════
function _afAgir(acao) {
  const eu = _afPorId(_afQuem);
  if (!eu) return;
  const eventos = fuAgir(_afE, Object.assign({ quem: eu.id }, acao));

  /* Uma acção que o motor recusou não gasta nada e não fecha o menu: o
     jogador continua exactamente onde estava, a escolher outra coisa.
     Sem isto, uma recusa parecia um clique que não funcionou. */
  if (!eventos.length) { _afPasso = null; _afDesenhar(); return; }

  _afPasso = null; _afMenu = false; _afQuem = null;
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
  for (const ev of eventos) {
    const html = _afLanceDe(ev);
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
    if (ev.pvQuem != null)   guardar(ev.quem, 'pv', ev.pvQuem - (ev.drenou | 0));
  }

  _afDesenhar();

  const passo = Math.max(240, Math.min(520, 1900 / Math.max(1, batidas.length)));
  let i = 0;
  const tocar = () => {
    if (i >= batidas.length) {
      _afSegredo = null;
      _afBarras();                       // acerta o que a cadência deixou
      setTimeout(() => { _afOcupado = false; _afAndar(); }, Math.round(passo * 0.7));
      return;
    }
    const b = batidas[i++];
    for (const ev of b.evs) _afEncenarUm(ev);
    if (b.html) _afLance(b.html, i > 1);
    setTimeout(tocar, passo);
  };
  tocar();
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
function _afNumeroPM(el, n) {
  el = _afCaixa(el);
  if (!el || !n) return;
  const d = document.createElement('div');
  d.className = 'cb-pm-flut';
  d.textContent = '−' + n + ' PM';
  el.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

function _afImpacto(el, tipo) {
  el = _afCaixa(el);
  if (!el) return;
  const cfg = _afEfeitoDe(tipo);
  const modo = AF_GESTO[cfg.gesto] || AF_GESTO.neutro;
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

/* ── O QUE CADA EVENTO FAZ VER ──

   Um por um, pela ordem em que o motor os devolveu. O desenho segue o
   evento e não o contrário: se o motor não disse que alguém apanhou,
   ninguém tem de tremer. */
function _afEncenarUm(ev) {
  /* O que se VÊ vive numa função à parte: lá dentro cada caso sai mal se
     resolva, e as barras têm de ser tocadas em TODOS eles. Com as duas
     coisas na mesma função, o primeiro `return` levava a barra consigo. */
  _afEncenarCorpo(ev);

  /* A barra do alvo desce NESTA batida e não no fim do turno. O valor não
     se vai buscar ao modelo — o modelo já está no fim de tudo — vem do
     próprio evento, que guarda como ficou o alvo no instante em que o
     golpe caiu. É a única fonte que sabe o meio do turno. */
  if (_afSegredo) { _afSegredo.delete(ev.alvo); _afSegredo.delete(ev.quem); }
  if (ev.pvAlvo != null) _afBarraDe(ev.alvo, ev.pvAlvo, null);
  if (ev.tipo === 'gasto') _afBarraDe(ev.quem, null, ev.pmDepois);
  if (ev.pvQuem != null)   _afBarraDe(ev.quem, ev.pvQuem, null);
}

function _afEncenarCorpo(ev) {
  {
    const deQuem = _afEl(ev.quem);
    const noAlvo = _afEl(ev.alvo);

    if (ev.tipo === 'gasto') { _afNumeroPM(deQuem, ev.pm); return; }

    if (ev.tipo === 'guardar') { _afGesto(deQuem, 'defende', 500); return; }

    if (ev.tipo === 'cura') {
      if (ev.curou) _afNumero(noAlvo, ev.curou, false, 'cura');
      return;
    }

    if (ev.tipo === 'cena') { _afImpacto(noAlvo, 'luz'); return; }

    if (ev.tipo === 'ataque' || ev.tipo === 'magia') {
      _afGesto(deQuem, 'avanca', 400);
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
      }
      _afImpacto(noAlvo, tipo);
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
  const quem = _afPorId(vez.podem[0]);
  if (!quem) { _afOcupado = false; _afAndar(); return; }

  const meus = _afE.B.filter(c => c.vivo);
  const deles = _afE.A.filter(c => c.vivo);
  const magias = fuMagiasDe(quem.ficha);
  const paga = (m, n) => fuCusto(m, n) <= quem.pm;

  // 1 · curar quem está em crise
  const ferido = meus.filter(fuEmCrise).sort((a, b) => a.pv - b.pv)[0];
  if (ferido) {
    const sup = magias.suporte;
    if (sup && paga(sup, 1)) {
      const acao = sup.proprio
        ? (ferido === quem ? { tipo: 'magia', magia: sup } : null)
        : { tipo: 'magia', magia: sup, alvos: [ferido.id] };
      if (acao) { _afJogarPor(quem, acao); return; }
    }
  }

  // 2 · a mais cara que consiga pagar
  for (const lugar of ['muito_forte', 'forte']) {
    const m = magias[lugar];
    if (!m) continue;
    const n = m.porAlvo ? Math.min(m.alvos || 1, deles.length) : 1;
    if (!paga(m, n)) continue;
    _afJogarPor(quem, { tipo: 'magia', magia: m,
                        alvos: deles.slice(0, n).map(c => c.id) });
    return;
  }

  // 3 · o murro
  _afJogarPor(quem, { tipo: 'atacar' });
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
  const cls = v => 'cb-dado' + (v === alto ? ' alto' : '') + (ev.critico ? ' critico' : '');
  const cx = (v, k) => `<i class="${cls(v)}">${
    k ? `<u>${esc(t('af.ab.' + k))}</u>` : ''}${v}</i>`;
  const mod = ev.modificador
    ? `<i class="cb-dado-mod">${ev.modificador > 0 ? '+' : ''}${ev.modificador}</i>` : '';
  return cx(d[0], at[0]) + cx(d[1], at[1]) + mod;
}

function _afLanceDe(ev) {
  const nome = n => esc(_afNome(_afPorId(n)));
  const p = [];

  if (ev.tipo === 'guardar') return t('af.lance.guardar', { nome: nome(ev.quem) });
  if (ev.tipo === 'mover')
    return t('af.lance.mover', { nome: nome(ev.quem), com: nome(ev.com) });
  if (ev.tipo === 'gasto')  return null;   // vai colado ao golpe
  if (ev.tipo === 'fim')    return null;   // o fim tem tela própria

  if (ev.tipo === 'cena')
    return t('af.lance.cena', { nome: nome(ev.quem), magia: t('af.m.' + ev.nome) })
         + ' · <b>' + nome(ev.alvo) + '</b>';

  if (ev.tipo === 'cura')
    return `<b>${nome(ev.quem)}</b> · ${t('af.m.' + ev.nome)} · <b>${nome(ev.alvo)}</b> `
         + `<span class="sobe">${t('af.lance.cura', { n: ev.curou })}</span>`;

  if (ev.tipo === 'actoFinal' || ev.tipo === 'devastacao') {
    p.push(ev.tipo === 'actoFinal'
      ? t('af.lance.suspiro', { nome: nome(ev.quem) })
      : t('af.lance.devasta', { nome: nome(ev.alvo) }));
    p.push(_afDanoTexto(ev));
    return p.join(' · ');
  }

  if (ev.tipo === 'ataque' || ev.tipo === 'magia') {
    p.push('<b>' + nome(ev.quem) + '</b>');
    p.push(_afDadosHTML(ev));
    p.push(t('af.lance.acerta', { r: ev.resultado, dl: ev.dl }));
    if (ev.critico) p.push('<b class="critico">' + t('af.lance.critico') + '</b>');
    if (ev.pifao)   p.push('<b class="pifao">' + t('af.lance.pifao') + '</b>');
    if (!ev.acertou) { p.push(t('af.lance.falhou')); return p.join(' · '); }
    p.push('<b>' + nome(ev.alvo) + '</b>');
    p.push(_afDanoTexto(ev));
    if (ev.estadoDado) p.push(t('af.lance.estado', { e: t('af.est.' + ev.estadoDado) }));
    if (ev.drenou)     p.push(t('af.lance.dreno', { n: ev.drenou }));
    if (ev.derrubou)   p.push(t('af.lance.derrubou'));
    return p.join(' · ');
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
  if (ev.caiu)    p.push('<b>' + t('af.lance.caiu', { nome: esc(_afNome(_afPorId(ev.alvo))) }) + '</b>');
  return p.join(' · ');
}

let _afLanceTimer = null;
let _afHistorico = [];

/* Com `acrescenta`, a linha nova junta-se às do mesmo turno em vez de as
   apagar: um turno é uma sequência de testes, e lê-se de cima para baixo
   como uma. As quatro últimas chegam — acima disso a caixa cresceria por
   cima do palco, e o que interessa é sempre o fim. */
function _afLance(html, acrescenta) {
  if (!html) return;
  _afHistorico.push({ ronda: _afE ? _afE.ronda : 0, html });
  const el = document.getElementById('cbLog');
  if (!el) return;
  if (acrescenta && el.classList.contains('viva')) {
    const linhas = el.innerHTML.split('<br>').concat(html).slice(-4);
    el.innerHTML = linhas.join('<br>');
  } else {
    el.innerHTML = html;
  }
  el.classList.add('viva');
  clearTimeout(_afLanceTimer);
  /* Apaga-se sozinho, mas só depois de haver tempo para o ler — e o
     tempo de ler não é o tempo de um lance. Quatro lances passam em
     3,6 segundos, e o último que interessa é o de quem acabou de bater
     em mim.

     Quem quiser rever toca nele e abre o histórico inteiro. */
  _afLanceTimer = setTimeout(() => el.classList.remove('viva'), AF_PAUSA * 6);
}

function _afAbrirHistorico() {
  const el = document.getElementById('cbAjuda');
  if (!el) return;
  el.innerHTML = `<div class="cb-ajuda-cx" onclick="event.stopPropagation()">
    ${_afHistorico.slice(-40).map(x =>
      `<p class="cb-hist"><i>${x.ronda}</i> ${x.html}</p>`).join('')}
  </div>`;
  el.classList.add('aberta');
  el.onclick = () => { el.classList.remove('aberta'); el.innerHTML = ''; };
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
  const el = document.getElementById('cbAjuda');
  if (!c || !el || typeof renderFichaFU !== 'function') return;
  el.innerHTML = `<div class="cb-ajuda-cx" onclick="event.stopPropagation()">
    ${renderFichaFU(null, c)}
  </div>`;
  el.classList.add('aberta');
  el.onclick = () => { el.classList.remove('aberta'); el.innerHTML = ''; };
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
            : v === 'B' ? t('af.fim.perdeu') : t('af.fim.empate');

  /* O prémio e a fratura, quando há moldura que os tenha calculado. São
     a única coisa que este painel diz e que não veio do motor. */
  const g = _afE._premio;
  const fr = _afE._fraturados || [];
  const aviso = fr.length
    ? `<div class="cb-fratura">🦴 ${t('pve.fratura', { nomes: fr.join(', ') })}</div>` : '';
  const premio = g ? `<div class="cb-premio">
      ${g.desistiu ? `<span class="cada">${t('pve.desistiu')}</span>`
        : `<span>+${g.coinGain} 🪙</span>
           <span class="cada">${t('pve.premio.cada', { n: g.quantos })}</span>
           <span>+${g.xpGain} XP</span><span>+${g.vinculo} 💜</span>`}
      <span class="gasto">−${g.energia} ⚡ ${g.desistiu ? '' : t('pve.premio.cadaUm')}</span>
    </div>` : '';

  return `<div class="cb-fim ${v === 'A' ? 'bom' : 'mau'}">${esc(txt)}</div>
    ${aviso}${premio}
    <button class="cb-btn sair" onclick="afFechar()">
      <span class="cb-btn-rot">${_afTemMoldura() ? t('pve.sair') : t('af.fim.sair')}</span></button>`;
}

function _afFim() {
  _afQuem = null; _afMenu = false; _afPasso = null;
  // As contas fecham-se ANTES de o painel se desenhar: é ele que mostra o
  // prémio, e um painel desenhado primeiro mostrava a batalha sem ganho
  // nenhum e nunca mais se refazia.
  if (_afTemMoldura()) _pveFecharContas(_afE);
  _afChave = null;      // o fim muda a estrutura toda
  _afDesenhar();
}

// Para o banco de ensaio e, um dia, para o servidor conferir uma luta.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { afAbrir, afFechar };
}
