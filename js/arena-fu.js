// ═══════════════════════════════════════════════════════════════════
// A ARENA — motor Fabula Ultima
//
// ── PORQUE É UM ARQUIVO NOVO E NÃO UMA REESCRITA DO js/combate-pve.js ──
//
// O js/combate-pve.js são 3138 linhas agarradas ao motor 3D&T: F/H/R/A,
// armadura, esquiva, papéis de magia, o prognóstico, o banco com um
// activo. Reescrevê-lo de uma assentada deixava o jogo — que está no ar
// — sem arena nenhuma durante o tempo que isso demorasse.
//
// Então os dois convivem. Este corre o motor novo no banco de ensaio,
// onde se prova; aquele continua a correr o jogo até este estar pronto
// para o substituir. No dia da troca, o outro apaga-se inteiro — não
// fica metade de cada, que era a única forma de isto correr mal.
//
// O CSS é o MESMO (css/combate-arena.css). As classes .cb-* descrevem um
// palco e não um motor: céu, fenda, monólitos, postos, orbes, barras,
// lance. Nada disso muda com as regras, e duplicá-lo era garantir que os
// dois palcos divergiam à primeira correcção.
//
// ── O QUE ESTE ARQUIVO NÃO FAZ ──
//
// Energia, doenças, fratura, prémios, XP. Isso é a moldura do jogo à
// volta da batalha, vive no js/combate-pve.js e não muda de motor. Entra
// no dia da troca, e entra tal como está.
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
function _afMotas(n) {
  let h = '';
  for (let i = 0; i < n; i++)
    h += `<i style="--mx:${(i * 137) % 100}%;--md:${(i * 0.73) % 6}s;--mt:${6 + (i % 5)}s"></i>`;
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
      <span class="cb-topo-dir"><button onclick="afFechar()">✕</button></span>
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

function _afCorpo(c) {
  if (typeof gerarSVG !== 'function') return '';
  const svg = gerarSVG(c.ficha, c.ficha.raridade, c.ficha.seed, 200, 200, 3);
  return svg.replace('<svg', '<svg preserveAspectRatio="xMidYMax meet"');
}

function _afLutador(c) {
  const meu = c.lado === 'A';
  const lado = meu ? 'eu' : 'ini';
  const podeAgir = _afPodeAgir(c);
  const escolhido = _afQuem === c.id;

  const cls = ['cb-posto', lado, escolhido ? 'ativo' : '',
               c.vivo ? '' : 'caido', podeAgir ? 'pode' : ''].join(' ');

  // as marcas: os estados, a guarda, o que dura a cena
  const marcas = [];
  const m = (txt, k) => marcas.push(`<span class="cb-marca ${k}">${txt}</span>`);
  for (const e of Object.keys(c.estados)) m(t('af.est.' + e), 'veneno');
  if (c.guardando) m('▲', 'escudo');
  if (c.efeitos.resisteFisico)  m(t('af.m.concha'), 'escudo');
  if (c.efeitos.defesaMinima)   m(t('af.m.barreira'), 'escudo');
  if (c.efeitos.misericordia)   m(t('af.m.misericordia'), 'escudo');
  if (c.efeitos.subirDado)      m(c.efeitos.subirDado + '+', 'buff');
  if (typeof fuNoAr === 'function' && fuNoAr(c)) m('✧', 'escudo');
  if (fuEmCrise(c)) m('!', 'veneno');

  const pos = AF_POSTOS[Math.max(0, Math.min(2, c.posto))];
  const x = meu ? pos.x : 100 - pos.x;

  /* Tocar num meu que ainda pode agir escolhe-o e abre o menu. Em
     qualquer outro, abre a ficha. É a diferença entre "é a este que dou
     ordens" e "quem é este", e cada uma quer um sítio diferente. */
  const gesto = (meu && podeAgir && !_afPasso) ? `_afEscolherQuem('${c.id}')`
              : (_afPasso ? `_afAlvo('${c.id}')` : `_afFicha('${c.id}')`);

  const alvejavel = _afPasso && _afEhAlvo(c);

  return `<div class="${cls} ${alvejavel ? 'alvo' : ''}" id="cbLut${c.id}"
       role="button" tabindex="0" onclick="${gesto}"
       title="${esc(meu && podeAgir ? t('af.menu.abrir') : t('af.ficha.abrir', { nome: _afNome(c) }))}"
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
    let caixa;
    try { caixa = svg.getBBox(); } catch (e) { continue; }
    if (!caixa || !caixa.height) continue;
    const mm = svg.getScreenCTM();
    if (!mm) continue;
    const tinta = mm.f + (caixa.y + caixa.height) * mm.d;
    const chao  = posto.getBoundingClientRect().top;
    const atual = parseFloat(corpo.style.top) || 0;
    corpo.style.top = Math.round(atual + (chao - tinta)) + 'px';
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

/* O cartão. A classe `entra` é a que o CSS acende — lá era "este pode
   entrar em campo", aqui é "este ainda pode agir nesta rodada". É a
   mesma pergunta debaixo dos dois motores: em qual destes posso tocar
   agora?

   Os PM do inimigo não aparecem, e é uma decisão herdada e mantida:
   saber quanta magia ele ainda tem daria a certeza de que ele não vai
   lançar nada, e a incerteza é metade do combate. */
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
      ${typeof gerarSVG === 'function' ? gerarSVG(c.ficha, c.ficha.raridade, c.ficha.seed, 100, 100, 3) : ''}
      <span class="cb-ficha-nivel">${c.posto + 1}</span>
    </div>
    <div class="cb-ficha-barras">
      <div class="cb-ficha-nome">${esc(_afNome(c))}</div>
      ${_afBarra(c.pv, c.ficha.pvMax, 'pv')}
      ${meu ? _afBarra(c.pm, c.ficha.pmMax, 'pm') : ''}
    </div>
  </div>`;
}

function _afHud(lado) {
  return fuFormacao(_afE, lado).map(_afCartao).join('');
}

// ═══════════════════════════════════════════════════════════════════
// DESENHAR
// ═══════════════════════════════════════════════════════════════════
function _afDesenhar() {
  if (!_afE) return;
  document.getElementById('cbCampo').innerHTML = _afCampo();
  document.getElementById('cbHudEu').innerHTML  = _afHud('A');
  document.getElementById('cbHudIni').innerHTML = _afHud('B');
  const vez = _afE.acabou ? null : fuVez(_afE);
  document.getElementById('cbTurno').textContent =
    t('af.ronda', { n: _afE.ronda })
    + (vez ? ' · ' + t(vez.lado === 'A' ? 'af.vez' : 'af.vez_dele') : '');
  _afAssentar();
  _afAcoes();
  _afMenuMover();
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
       js/combate-pve.js lhe escreve. Corrigi-lo partia a arena que está
       no ar para arranjar a que ainda não está. No dia da troca, sai. */
    const palcoFim = document.getElementById('cbPalco');
    const por = (k, v) => menu.style.setProperty(k, v, 'important');
    por('transform', 'none');
    por('left', '0px');
    por('top', '0px');
    if (palcoFim) {
      const pf = palcoFim.getBoundingClientRect();
      const mf = menu.getBoundingClientRect();
      por('left', Math.round((pf.width  - mf.width)  / 2) + 'px');
      por('top',  Math.round((pf.height - mf.height) / 2) + 'px');
    }
    return;
  }
  // fora do fim, tudo volta a ser do CSS
  menu.style.removeProperty('transform');

  const palco = document.getElementById('cbPalco');
  const posto = _afQuem ? document.getElementById('cbLut' + _afQuem) : null;
  if (!palco || !posto) return;
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

  menu.classList.remove('apertado');
  if (menu.getBoundingClientRect().height > (tecto - p.top) - 16)
    menu.classList.add('apertado');

  const folga = 8;
  const r = menu.getBoundingClientRect();
  if (r.top < p.top + folga) {
    const topo = parseFloat(menu.style.top) || 0;
    menu.style.top = Math.round(topo + ((p.top + folga) - r.top)) + 'px';
  }

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
  ficha: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>'
       + '<circle cx="12" cy="12" r="3"/>',
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

  const magias = fuMagiasDe(eu.ficha);
  let h = '';
  for (const lugar of FU_LUGARES) {
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
  h += _afOrbe('mover', t('af.orbe.mover'), '', `_afPedirMover()`, null, meus.length > 0);
  h += _afOrbe('ficha', t('af.orbe.ficha'), '', `_afFicha('${eu.id}')`, null, true);
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

  const magia = fuMagiaDe(eu.ficha, lugar);
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

function _afMostrar(eventos) {
  _afOcupado = true;
  _afLance(eventos.map(_afLanceDe).filter(Boolean).join('<br>'));
  _afDesenhar();
  _afSacudir(eventos);
  setTimeout(() => { _afOcupado = false; _afAndar(); }, AF_PAUSA);
}

/* Um empurrão em quem apanhou. O resto dos efeitos (impactos,
   partículas, números a subir) fica para a etapa em que este arquivo
   substituir o antigo — lá estão feitos e é de lá que vêm. */
function _afSacudir(eventos) {
  for (const ev of eventos) {
    if (!ev.alvo || !(ev.perda > 0)) continue;
    const el = document.getElementById('cbLut' + ev.alvo);
    if (!el) continue;
    // 'bate' e não 'bateu': é a classe que o CSS anima (.cb-posto.bate)
    el.classList.remove('bate');
    void el.offsetWidth;
    el.classList.add('bate');
    setTimeout(() => el.classList.remove('bate'), 700);
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
    p.push(t('af.lance.dados', { a: ev.dados[0], b: ev.dados[1] })
      + (ev.modificador ? (ev.modificador > 0 ? '+' : '') + ev.modificador : ''));
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

function _afLance(html) {
  if (!html) return;
  _afHistorico.push({ ronda: _afE ? _afE.ronda : 0, html });
  const el = document.getElementById('cbLog');
  if (!el) return;
  el.innerHTML = html;
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
function _afFicha(id) {
  const c = _afPorId(id);
  if (!c) return;
  const f = c.ficha;
  const el = document.getElementById('cbAjuda');
  if (!el) return;

  const linha = (r, v) => `<p class="cb-f-linha"><i>${esc(r)}</i><b>${v}</b></p>`;
  const dado = a => `d${f[a]}` + (fuDado(c, a) !== f[a] ? ` → <u>d${fuDado(c, a)}</u>` : '');

  const magias = fuMagiasDe(f);
  const lugares = FU_LUGARES.map(l => {
    const m = magias[l];
    const custo = fuCusto(m, m.porAlvo ? (m.alvos || 1) : 1);
    return `<p class="cb-f-magia"><b>${esc(_afMagiaNome(m))}</b>
      <i>${esc(t('af.lugar.' + l))} · ${custo ? t('af.pm', { n: custo }) : t('af.gratis')}</i></p>`;
  }).join('');

  const afins = Object.keys(f.afinidades || {})
    .filter(k => f.afinidades[k])
    .map(k => `<span class="cb-f-af ${f.afinidades[k]}">${esc(t('af.tipo.' + k))} ${f.afinidades[k]}</span>`)
    .join(' ');

  el.innerHTML = `<div class="cb-ajuda-cx" onclick="event.stopPropagation()">
    <h3>${esc(_afNome(c))}</h3>
    <p class="cb-f-sub">${esc(f.raridade)} · ${t('af.ronda', { n: f.nivel })}</p>
    ${linha(t('af.f.dados'), `DES ${dado('DES')} · PER ${dado('PER')} · VIG ${dado('VIG')} · VON ${dado('VON')}`)}
    ${linha(t('af.f.vida'),   `${c.pv} / ${f.pvMax}`)}
    ${linha(t('af.f.magia'),  `${c.pm} / ${f.pmMax}`)}
    ${linha(t('af.f.crise'),  f.crise)}
    ${linha(t('af.f.defesa'), fuDefesa(c))}
    ${linha(t('af.f.defmag'), fuDefesaMag(c))}
    ${linha(t('af.f.tipo'),   esc(t('af.tipo.' + f.tipo)))}
    ${linha(t('af.f.costura'), f.costura ? esc(t('af.tipo.' + f.costura)) : t('af.f.sem_costura'))}
    ${linha(t('af.f.vantagem'), f.vantagens.map(v => esc(v.id)).join(' · '))}
    <p class="cb-f-afs">${afins}</p>
    <h4>${t('af.f.lugares')}</h4>
    ${lugares}
  </div>`;
  el.classList.add('aberta');
  el.onclick = () => { el.classList.remove('aberta'); el.innerHTML = ''; };
}

// ═══════════════════════════════════════════════════════════════════
// O FIM
// ═══════════════════════════════════════════════════════════════════
function _afFimHTML() {
  const v = _afE.vencedor;
  const txt = v === 'A' ? t('af.fim.ganhou') : v === 'B' ? t('af.fim.perdeu') : t('af.fim.empate');
  return `<div class="cb-fim ${v === 'A' ? 'bom' : 'mau'}">${esc(txt)}</div>
    <button class="cb-btn sair" onclick="afFechar()">
      <span class="cb-btn-rot">${t('af.fim.sair')}</span></button>`;
}

function _afFim() {
  _afQuem = null; _afMenu = false; _afPasso = null;
  _afDesenhar();
}

// Para o banco de ensaio e, um dia, para o servidor conferir uma luta.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { afAbrir, afFechar };
}
