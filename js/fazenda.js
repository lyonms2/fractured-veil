// ═══════════════════════════════════════════════════════════════════
//  fazenda.js — A COLÔNIA
//
//  Depende de: avatarSlots, activeSlotIdx, gs (state.js), gerarSVG
//              (mini-avatar.js), saveRuntimeToSlot/loadRuntimeFromSlot
//              (state.js), spendCoins (actions.js), t() (i18n)
//
//  ── PORQUE É QUE ISTO EXISTE ──
//
//  O jogo mostrava UMA criatura na consola e escondia as outras nove
//  atrás de um modal que nem sequer exibia os vitais delas. Ao mesmo
//  tempo, o combate pedia uma equipa de três. Quem jogava tinha de
//  adivinhar como estavam dois terços do seu plantel.
//
//  Agora a consola abre na colônia: todos à vista, com os cinco vitais
//  de cada um. O "Cuidar" abre o ecrã de sempre — o bicho grande, as
//  animações, o carinho — para aquele avatar. A intimidade não se
//  perdeu, mudou de sítio: passou a ser um lugar onde se entra em vez
//  de ser o único lugar que existe.
//
//  ── AS ACÇÕES DE GRUPO ──
//
//  Uma por vital, e cada uma cobra pelo que faz: o preço é o da acção
//  individual multiplicado por quantos precisam dela. Nunca se paga por
//  quem já está bem — o botão conta os candidatos antes e diz quantos
//  são. Com dez criaturas, dar de comer uma a uma eram dez viagens ao
//  mesmo sítio; isto é a mesma coisa numa só, sem desconto nenhum.
// ═══════════════════════════════════════════════════════════════════

/* AS ACÇÕES EM GRUPO SAÍRAM.

   Vivia aqui uma tabela com cinco delas — nutrir, banhar, medicar,
   carinho e ninar — cada uma a servir todos os que precisassem, ao
   preço individual vezes o número de candidatos.

   Funcionavam. O problema era outro: resolviam o jogo com um clique.
   Cuidar de uma criatura é o jogo inteiro, e um botão que trata de
   dez de uma vez transforma isso num imposto que se paga e esquece.
   A colônia continua a servir para o que era preciso — ver quem está
   mal sem ter de entrar em cada um — e tratar continua a ser um gesto
   por criatura, no ecrã dela. */

// Os avatares vivos, por ordem de slot.
function fazendaVivos() {
  if (typeof avatarSlots === 'undefined') return [];
  return avatarSlots
    .map((s, idx) => ({ s, idx }))
    .filter(({ s }) => s && s.hatched && !s.dead && s.vitals);
}

// ═══════════════════════════════════════════
// O ECRÃ
// ═══════════════════════════════════════════

/* Os cinco vitais, na ordem em que se lêem no cartão.

   SEM CORES AQUI. Estavam escritas à mão nesta lista e não batiam com
   as da tela de cuidar: o humor era magenta aqui e amarelo lá, a
   energia dourada aqui e azul lá, a higiene azul aqui e castanha lá.
   Três dos cinco. Quem olhasse para a colônia e entrasse numa criatura
   via a mesma barra mudar de cor, e não havia nada que explicasse
   porquê.

   A cor passa a vir das classes .fill-fome, .fill-humor e companhia,
   do css/ui.css, que são as mesmas que a tela de cuidar usa — e que o
   mobile-index.css repete para o telemóvel. Uma fonte só: mudar a cor
   do humor passa a ser uma linha, não três ficheiros. */
const FAZENDA_VITAIS = [
  { chave: 'fome',    emoji: '🍖' },
  { chave: 'humor',   emoji: '😄' },
  { chave: 'energia', emoji: '⚡' },
  { chave: 'saude',   emoji: '💚' },
  { chave: 'higiene', emoji: '🛁' },
];

// Abaixo disto a barra pisca: é o mesmo limiar a partir do qual o
// gameTick começa a contar stress para doença.
const FAZENDA_ALERTA = 20;

/* A barra leva o número ao lado.

   Cinco barras dizem "está mau" de relance, que era o que faltava.
   Não dizem QUANTO mau — e a diferença entre 19 e 21 decide se o
   contador de doença arranca. O número resolve isso sem tirar o
   relance: lê-se a cor primeiro e o algarismo só quando interessa.

   O data-vital serve à actualização ao vivo: com ele, o gameTick
   mexe só na largura e no texto, sem redesenhar a lista — redesenhar
   a cada segundo perdia o scroll e apagava o que estivesse sob o
   dedo. */
function _fazendaBarra(v, cfg) {
  const val = Math.max(0, Math.min(100, Math.round(v ?? 100)));
  const baixo = val < FAZENDA_ALERTA;
  return `<div class="fz-vital" title="${cfg.emoji} ${val}">
    <div class="fz-bar">
      <div class="fz-bar-fill fill-${cfg.chave}${baixo ? ' fz-baixo' : ''}"
           data-vital="${cfg.chave}" style="width:${val}%;"></div>
    </div>
    <span class="fz-num${baixo ? ' fz-num-baixo' : ''}" data-num="${cfg.chave}">${val}</span>
  </div>`;
}

/* O dourado marca a EQUIPA, não quem está aberto.

   Marcava o avatar que estava espelhado nos globais — uma informação
   interna, que ao jogador não diz nada: ele sabe em quem carregou. O que
   ele não vê em lado nenhum é quais são os três que entram na batalha,
   e essa é a única distinção que a lista tem para dar.

   Por isso o botão passa a dizer CUIDAR em todos. Antes dizia AQUI num
   deles, e "aqui" respondia a uma pergunta que ninguém fazia. */
function _fazendaCartao({ s, idx }) {
  const v     = s.vitals || {};
  const nome  = (s.nome || 'Avatar').split(',')[0].trim();
  const naEquipa = (typeof equipaIdx === 'function') && equipaIdx().includes(idx);
  const dorme  = !!s.sleeping;
  const doente = (s.activeDiseases || []).length > 0;
  /* O cocó por limpar, à vista na lista.

     Era preciso entrar em cada avatar para descobrir qual deles tinha
     deixado sujeira no chão — e entrar em dez para saber de dez.
     O poopCount já vivia gravado no slot; só não estava escrito em
     lado nenhum fora do ecrã de cuidar. */
  const cocos  = Math.max(0, s.poopCount | 0);
  const svg = (typeof gerarSVG === 'function')
    ? gerarSVG(s, s.raridade, s.seed || 0, 38, 38, (typeof _faseNum === 'function' ? _faseNum(s.nivel) : 0))
    : '';

  return `<div class="fz-card${naEquipa ? ' fz-equipa' : ''}${doente ? ' fz-doente' : ''}" data-slot="${idx}">
    <button class="fz-av" onclick="fzZoom(${idx})" title="${t('fazenda.zoom')}">${svg}${dorme ? '<span class="fz-zzz">💤</span>' : ''}${cocos ? `<span class="fz-coco" title="${t('fazenda.coco', { n: cocos })}">💩${cocos > 1 ? cocos : ''}</span>` : ''}</button>
    <div class="fz-info">
      <div class="fz-nome">${esc(nome)}${doente ? ' <span class="fz-alerta">⚠</span>' : ''}</div>
      <div class="fz-barras">${FAZENDA_VITAIS.map(c => _fazendaBarra(v[c.chave], c)).join('')}</div>
    </div>
    <button class="fz-cuidar" onclick="cuidarDe(${idx})">${t('fazenda.cuidar')}</button>
  </div>`;
}

function renderFazenda() {
  const el = document.getElementById('fazendaLista');
  if (!el) return;

  if (typeof saveRuntimeToSlot === 'function') saveRuntimeToSlot(activeSlotIdx);
  const vivos = fazendaVivos();

  if (vivos.length === 0) {
    el.innerHTML = `<div class="fz-vazio">${t('fazenda.vazio')}</div>`;
  } else {
    el.innerHTML = vivos.map(_fazendaCartao).join('');
  }

  // "3 de 5": quantos vivem, de quantos slots abertos. Diz de relance se
  // há espaço para invocar mais sem obrigar a contar cartões.
  const conta = document.getElementById('fazendaConta');
  if (conta) {
    const total = (typeof getUnlockedSlots === 'function') ? getUnlockedSlots() : vivos.length;
    conta.textContent = t('fazenda.conta', { vivos: vivos.length, total });
  }

}

/* SAIR DA COLÔNIA, num sítio só.

   O abrirFazenda esconde seis coisas para a lista ficar sozinha na
   consola: os quatro ecrãs irmãos, a fila de botões de cuidar, a
   ficha do avatar, a barra de vitais do telemóvel e o botão de
   voltar. Quem sai da colônia tem de repor tudo isso.

   O cuidarDe repunha. A invocação e a chocagem repunham metade — o
   hatch() punha o statusCard de volta e mexia na opacidade dos
   botões, mas não no display que o abrirFazenda lhes tinha posto a
   none. Resultado: acabava a animação do ovo e ficava a criatura numa
   tela sem botões e sem ficha. Era o "joga pra tela antiga".

   Duas cópias de uma saída, e a segunda esquecia-se de metade. */
function fzSairDaColonia() {
  window._fzModoColonia = false;
  const fz = document.getElementById('fazendaScreen');
  if (fz) fz.style.display = 'none';
  const tela = document.getElementById('mainScreen');
  if (tela) tela.classList.remove('fz-modo');
  document.body.classList.remove('fz-colonia');
  const btns = document.getElementById('actionBtns');
  if (btns) { btns.style.display = ''; btns.style.opacity = '1'; btns.style.pointerEvents = 'auto'; }
  const volta = document.getElementById('btnColonia');
  if (volta) volta.style.display = '';
  const cc = document.getElementById('creatureCard'); if (cc) cc.style.display = 'block';
  const sc = document.getElementById('statusCard');   if (sc) sc.style.display = 'block';
  // A '' e não um valor fixo: quem manda neste é uma media query.
  const ms = document.getElementById('mobileStatusInline'); if (ms) ms.style.display = '';

  // Mesma razao ao contrario: quem sai para um slot vazio tem de ver
  // o topo apagar-se ja, e nao um segundo depois.
  if (typeof updateHeaderButtons === 'function') updateHeaderButtons();
}

/* ACTUALIZAR SEM REDESENHAR.

   Chamada pelo gameTick a cada ciclo. Mexe na largura, no número e na
   classe de alerta dos cartões que já lá estão, em vez de reconstruir
   a lista: reconstruir perdia a posição do scroll a cada segundo e
   apagava o botão que estivesse debaixo do dedo a meio do toque. */
function fzAtualizarVitais() {
  if (!window._fzModoColonia) return;
  const lista = document.getElementById('fazendaLista');
  if (!lista) return;
  if (typeof saveRuntimeToSlot === 'function') saveRuntimeToSlot(activeSlotIdx);

  lista.querySelectorAll('.fz-card[data-slot]').forEach(card => {
    const idx = Number(card.dataset.slot);
    const s   = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
    if (!s || !s.vitals) return;

    FAZENDA_VITAIS.forEach(cfg => {
      const val   = Math.max(0, Math.min(100, Math.round(s.vitals[cfg.chave] ?? 100)));
      const baixo = val < FAZENDA_ALERTA;
      const fill  = card.querySelector('.fz-bar-fill[data-vital="' + cfg.chave + '"]');
      if (fill) { fill.style.width = val + '%'; fill.classList.toggle('fz-baixo', baixo); }
      const num = card.querySelector('.fz-num[data-num="' + cfg.chave + '"]');
      if (num) { num.textContent = val; num.classList.toggle('fz-num-baixo', baixo); }
    });

    // O 💤 e a margem vermelha também mudam sozinhos com o tempo.
    const zzz = card.querySelector('.fz-zzz');
    if (!!s.sleeping !== !!zzz) { renderFazenda(); return; }
    // O cocó aparece e desaparece sem se sair da lista: nasce sozinho
    // com o tempo, e some quando se limpa lá dentro.
    const coco = card.querySelector('.fz-coco');
    const n = Math.max(0, s.poopCount | 0);
    if (!!n !== !!coco) { renderFazenda(); return; }
    if (coco) coco.textContent = '💩' + (n > 1 ? n : '');
    card.classList.toggle('fz-doente', (s.activeDiseases || []).length > 0);
  });
}

/* O retrato em grande, a partir da lista.

   Reaproveita o mesmo overlay do zoom que já existe no ecrã de cuidar
   — o openAvatarZoomData do js/main.js — em vez de inventar um
   segundo. Passa os dados DAQUELE slot, não os do avatar aberto: na
   colônia o que se toca e o que está espelhado nos globais quase nunca
   são o mesmo. */
function fzZoom(idx) {
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s || !s.hatched) return;
  if (typeof openAvatarZoomData !== 'function') return;
  openAvatarZoomData(s.elemento, s.raridade, s.seed || 0, s.nivel || 1, s.nome || '', s);
}

// ── Trocar entre a colônia e o cuidado de um ──
function abrirFazenda() {
  window._fzModoColonia = true;
  ['aliveScreen', 'deadScreen', 'idleScreen', 'eggScreen'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });
  const fz = document.getElementById('fazendaScreen');
  if (fz) fz.style.display = 'flex';
  const tela = document.getElementById('mainScreen');
  if (tela) tela.classList.add('fz-modo');
  // A classe no body é o que centra a consola: só na colônia é que a
  // coluna da direita não tem nada para mostrar.
  document.body.classList.add('fz-colonia');
  // display:none e nao so opacity:0 — invisivel mas presente, a fila
  // dos botoes de cuidar deixava uma faixa vazia por baixo da lista, que
  // no telemovel era quase um terco da consola.
  const btns = document.getElementById('actionBtns');
  if (btns) { btns.style.display = 'none'; btns.style.opacity = '0'; btns.style.pointerEvents = 'none'; }
  const volta = document.getElementById('btnColonia');
  if (volta) volta.style.display = 'none';
  // Os paineis de detalhe sao de UMA criatura: nome, nivel, XP e os
  // cinco vitais dela. Na colonia mostram os de quem esta aberto por
  // baixo de uma lista que ja mostra os de todos — o mesmo bicho duas
  // vezes, e o de baixo sem dizer de quem e.
  ['creatureCard', 'statusCard', 'mobileStatusInline'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = 'none';
  });
  renderFazenda();
  // A fila de cima esconde-se na tela de invocar e volta na colonia.
  // Sem esta chamada so voltava no tique seguinte, um segundo depois,
  // e o jogador via a colonia aparecer com o topo ainda vazio.
  if (typeof updateHeaderButtons === 'function') updateHeaderButtons();
}

/* Entrar no cuidado de um avatar.

   Isto mexe no activeSlotIdx, que já não decide quem VIVE — desde que a
   colônia existe, vivem todos — mas continua a decidir quem está
   espelhado nos globais e portanto quem tem animações, cocó e bolhas.
   Trocar aqui é seguro: o que fica para trás continua a comer e a
   envelhecer no viverTodos(). */
async function cuidarDe(idx) {
  // O switchSlot() do state.js é a fonte única desta troca: grava o
  // anterior, carrega o novo e reconstrói os ecrãs. Fazer isto à mão
  // aqui criava uma corrida com o scheduleSave() do jogo — foi o que já
  // aconteceu no "usar este slot" do marketplace, e por isso ele também
  // passou a chamar esta função em vez de duplicá-la.
  // Sai ANTES do switchSlot: ele chama o rebuildScreensParaSlot, que
  // reafirma a colônia se o estado ainda estiver ligado — e o jogador
  // ficava preso na lista sem conseguir entrar em ninguém.
  fzSairDaColonia();
  if (idx !== activeSlotIdx && typeof switchSlot === 'function') {
    await switchSlot(idx);
  }
  // Quem decide QUAL ecrã abrir é o rebuildScreensParaSlot, que o
  // switchSlot já chamou. Só se força o aliveScreen quando não houve
  // troca nenhuma e portanto ninguém reconstruiu nada.
  if (idx === activeSlotIdx) {
    const alive = document.getElementById('aliveScreen');
    if (alive && hatched && !dead) alive.style.display = 'flex';
  }
  if (typeof updateAllUI === 'function') updateAllUI();
}

function voltarAFazenda() { abrirFazenda(); }
