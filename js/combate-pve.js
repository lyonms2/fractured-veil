// ═══════════════════════════════════════════════════════════════════
// BATALHA PvE
//
// A primeira interface do combate. O objectivo desta versão é VER O
// MOTOR A FUNCIONAR: cada conta aparece na tela (FA, FD, o dado, a
// subtração), cada vantagem que dispara é anunciada, e o registo por
// baixo guarda tudo. Os efeitos são os que o jogo já tinha — partículas,
// anéis, tremor, números flutuantes.
//
// Toda a lógica vive em js/combate-3dt.js. Aqui só se desenha e se
// recolhe a decisão do jogador.
// ═══════════════════════════════════════════════════════════════════

// ── O QUE A BATALHA CUSTA E O QUE RENDE ──
// Custa energia a cada um dos três, não só ao que está ativo: os três
// lutaram. E um avatar cansado não entra — 10 é o mesmo limiar que o
// banho já usava para dizer "este bicho precisa de dormir".
// O limiar é 20 e não 10 de propósito: 20 é o mesmo número a partir do
// qual a exaustão começa a acumular (DISEASES.exaustao em js/state.js).
// Com 10, a batalha empurrava o avatar para dentro do território da
// doença sem lhe dizer nada — quando o jogo o bloqueasse, ele já estava
// a adoecer. Assim, quando a batalha diz "cansado", ele ainda está a salvo.
const PVE_ENERGIA_MINIMA   = 20;
const PVE_ENERGIA_CUSTO    = 10;  // o mesmo que uma batalha PvP cobra
const PVE_ENERGIA_DESISTIR = 4;   // desistir a meio sai mais barato

// ── A FRATURA ──
// Cair em combate parte alguma coisa. Uma vez em cada dez — começou em
// 40% e era chato de mais: com trocas e quedas normais numa batalha,
// quase toda a luta acabava com alguém fracturado. Uma vez apanhada,
// come saúde todo o ciclo até matar se não for tratada com o antídoto.
const PVE_FRATURA_CHANCE = 0.10;

let _pveEstado = null;      // estado da batalha vindo do motor
let _pveAcao   = null;      // o que o jogador escolheu neste turno
let _pveAnim   = false;     // a bloquear enquanto uma animação corre
/* Que batalha é esta.

   A animação passou a ser uma cadeia de esperas: cada acontecimento
   marca o seguinte para daqui a tantos milissegundos. Quem fechar a
   batalha a meio deixa essa cadeia a dormir — e se abrir outra antes
   de ela acordar, ela acorda dentro da batalha nova e mexe nos cartões
   de uma luta que não é a dela.

   Fechar e abrir muda este número; a cadeia guarda o que era quando
   começou e cala-se assim que deixar de bater certo. */
let _pveGeracao = 0;

// ═══════════════════════════════════════════════════════════════════
// O adversário: uma equipa gerada com o mesmo total de pontos.
// O emparelhamento é por pontos porque é a medida que o manual usa
// para dizer se dois personagens são páreo.
// ═══════════════════════════════════════════════════════════════════
function _pveGerarInimigo(pontosAlvo) {
  const els  = Object.keys(CARACTERISTICAS_ELEMENTAIS);
  // Baralhados e consumidos sem repetição: dois nomes iguais na mesma
  // equipa davam linhas absurdas no registo — "Terra Caído sai, entra
  // Terra Caído".
  const sufs = ['Errante', 'Esquecido', 'Faminto', 'Sem Nome', 'Caído', 'Antigo']
    .sort(() => Math.random() - 0.5);
  const equipa = [];
  let restante = pontosAlvo;

  for (let i = 0; i < 3; i++) {
    const alvo = Math.round(restante / (3 - i));
    // Procura a raridade e o nível que mais se aproximam dos pontos que
    // faltam. É o inverso de pontosDoAvatar().
    let melhor = { rar: 'Comum', nv: 1, dif: 999 };
    for (const rar of ['Comum', 'Raro', 'Lendário'])
      for (let nv = 1; nv <= 35; nv++) {
        const dif = Math.abs(pontosDoAvatar(rar, nv) - alvo);
        if (dif < melhor.dif) melhor = { rar, nv, dif };
      }
    const el = els[Math.floor(Math.random() * els.length)];
    equipa.push({
      nome: `${el} ${sufs[i]}`,
      elemento: el, raridade: melhor.rar, nivel: melhor.nv,
      seed: Math.floor(Math.random() * 1e6),
    });
    restante -= pontosDoAvatar(melhor.rar, melhor.nv);
  }
  return equipa;
}

// ═══════════════════════════════════════════════════════════════════
// A ENERGIA DE CADA AVATAR
//
// O avatar ativo tem a energia nas variáveis vivas (vitals); os outros
// têm-na guardada no seu slot. É a mesma energia — só muda onde está
// escrita — e por isso passa tudo por estas duas funções, para não haver
// dois sítios a discordar sobre quanto um avatar aguenta.
// ═══════════════════════════════════════════════════════════════════
function _pveEnergiaDe(idx) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx)
    return (typeof vitals !== 'undefined') ? vitals.energia : 100;
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  return (s && s.vitals && s.vitals.energia != null) ? s.vitals.energia : 100;
}

function _pveGastarEnergia(idx, quanto) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx) {
    if (typeof vitals !== 'undefined')
      vitals.energia = Math.max(0, vitals.energia - quanto);
    return;
  }
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s) return;
  if (!s.vitals) s.vitals = { fome:100, humor:100, energia:100, saude:100, higiene:100 };
  s.vitals.energia = Math.max(0, s.vitals.energia - quanto);
}

// ═══════════════════════════════════════════════════════════════════
// O XP E O VÍNCULO SÃO DE CADA AVATAR
//
// Mesma história da energia: o ativo tem-nos nas variáveis vivas, os
// outros no seu slot. Lutaram os três, ganham os três — e cada um sobe
// de nível com o seu próprio XP.
//
// As moedas ficam de fora de propósito: são do jogador, não do avatar,
// e por isso são pagas uma vez só.
// ═══════════════════════════════════════════════════════════════════
function _pvePremiarAvatar(idx, xpGanho, vinculoGanho) {
  // O ativo passa pelos caminhos normais do jogo — o checkXP trata da
  // fase, do som e do rótulo, e o checkVinculoTier faz o bicho falar.
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx) {
    if (typeof xp !== 'undefined') xp += xpGanho;
    if (typeof vinculo !== 'undefined') {
      const antes = vinculo;
      vinculo += vinculoGanho;
      if (typeof checkVinculoTier === 'function') checkVinculoTier(antes);
    }
    if (typeof checkXP === 'function') checkXP();
    return;
  }

  // Os do banco sobem em silêncio: não há avatar na tela para festejar,
  // e o jogador vê o nível novo quando trocar para ele.
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s || !s.hatched || s.dead) return;
  s.xp = (s.xp || 0) + xpGanho;
  s.vinculo = (s.vinculo || 0) + vinculoGanho;
  if (typeof xpParaNivel === 'function') {
    let guarda = 0;                       // rede contra XP absurdo
    while (s.xp >= xpParaNivel(s.nivel || 1) && guarda++ < 100) {
      s.xp -= xpParaNivel(s.nivel || 1);
      s.nivel = (s.nivel || 1) + 1;
    }
  }
}

// Pegar uma doença. Mesmo encaminhamento da energia e do XP: o ativo
// tem-na nas variáveis vivas, os outros no slot. Devolve true se pegou.
function _pveAdoecer(idx, doenca) {
  if (typeof activeSlotIdx !== 'undefined' && idx === activeSlotIdx) {
    if (typeof activeDiseases === 'undefined') return false;
    if (activeDiseases.includes(doenca)) return false;
    activeDiseases.push(doenca);
    const d = (typeof DISEASES !== 'undefined') ? DISEASES[doenca] : null;
    if (d && typeof addLog === 'function') addLog(t('gt.disease.log', { emoji: d.emoji, nome: d.nome }), 'bad');
    return true;
  }
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[idx] : null;
  if (!s || !s.hatched || s.dead) return false;
  if (!s.activeDiseases) s.activeDiseases = [];
  if (s.activeDiseases.includes(doenca)) return false;
  s.activeDiseases.push(doenca);
  return true;
}

// Quem da equipa está cansado de mais para lutar
function _pveCansados() {
  const idx = (typeof equipaIdx === 'function') ? equipaIdx() : [];
  return idx.filter(i => _pveEnergiaDe(i) <= PVE_ENERGIA_MINIMA)
            .map(i => ({ i, nome: ((avatarSlots[i] || {}).nome || 'Avatar').split(',')[0].trim(),
                         energia: Math.floor(_pveEnergiaDe(i)) }));
}

// ═══════════════════════════════════════════════════════════════════
// Abrir
// ═══════════════════════════════════════════════════════════════════
function abrirCombatePvE() {
  const equipa = (typeof equipaDoJogador === 'function') ? equipaDoJogador() : [];
  if (!equipa.length) { showBubble(t('pve.sem_equipa')); return; }

  // Avatar cansado não batalha. Dizer QUEM e com quanta energia, senão o
  // jogador fica sem saber o que fazer para desbloquear.
  const cansados = _pveCansados();
  if (cansados.length) {
    showToast(t(cansados.length === 1 ? 'pve.cansado' : 'pve.cansados', {
      nomes: cansados.map(c => c.nome).join(', '),
      min: PVE_ENERGIA_MINIMA,
    }), 'err');
    return;
  }

  const pontos  = equipa.reduce((s, a) => s + pontosDoAvatar(a.raridade, a.nivel), 0);
  const inimigo = _pveGerarInimigo(pontos);

  _pveEstado = combate3dtIniciar(equipa, inimigo, Math.floor(Math.random() * 1e6), {
    historico: true,
    // O lado A é o jogador: a política do motor não decide por ele.
    // Mas se a ação vier vazia — um turno que corra sem escolha, por um
    // clique a mais ou por um caminho que ainda não previmos — vale mais
    // a política do motor do que uma batalha que rebenta a meio.
    politica: (eu, alvo) => (eu._ladoJogador && _pveAcao) ? _pveAcao : politica3dt(eu, alvo),
    escolhaTroca: (eu, alvo, banco) =>
      eu._ladoJogador ? (_pveAcao && _pveAcao.troca != null ? _pveAcao.troca : -1)
                      : _c3valeTrocar(eu, alvo, banco),
  });
  _pveEstado.A.forEach(c => c._ladoJogador = true);

  _pveShell();
  ModalManager.open('combateModal');
  _pveDesenhar();
  _pveLog(t('pve.log.inicio'), 'info');
}

// A moldura. Fica em JS e não no HTML porque nada aqui sobrevive ao
// fecho da batalha — é tudo redesenhado do estado do motor.
function _pveShell() {
  document.getElementById('combateModal').innerHTML = `<div class="cb-arena">
    <div class="cb-topo">
      <span id="cbTurno"></span>
      <span class="cb-topo-nome">${t('pve.titulo')}</span>
      <span class="cb-topo-dir">
        <button id="cbDesistir" class="desistir" onclick="_pveDesistir()"
                title="${t('pve.acao.desistir_sub', { n: PVE_ENERGIA_DESISTIR })}">${t('pve.acao.desistir')}</button>
        <button onclick="fecharCombatePvE()">✕</button>
      </span>
    </div>
    <div class="cb-lado" id="cbInimigo"></div>
    <div class="cb-log" id="cbLog"></div>
    <div class="cb-lado" id="cbJogador"></div>
    <div class="cb-acoes" id="cbAcoes"></div>
    <div class="cb-ajuda" id="cbAjuda"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// DESISTIR
//
// Sair a meio custa 4 de energia em vez de 10 e não paga nada. É a
// saída para quem vê a batalha perdida e prefere guardar o fôlego para
// a próxima — mas quem já caiu, já caiu: a fratura conta na mesma.
// ═══════════════════════════════════════════════════════════════════
function _pveDesistir() {
  if (_pveAnim || !_pveEstado || _pveEstado.acabou) return;
  if (!confirm(t('pve.desistir.confirmar', { n: PVE_ENERGIA_DESISTIR }))) return;
  _pveEstado.acabou = true;
  _pveEstado._desistiu = true;
  _pveFecharContas();
  _pveDesenhar();
  _pveLog(t('pve.log.desistiu'), 'warn');
}

function fecharCombatePvE() {
  _pveEstado = null; _pveAcao = null; _pveAnim = false;
  _pveGeracao++;   // a animação em curso, se houver, deixa de ter dono
  ModalManager.close('combateModal');
}

// ═══════════════════════════════════════════════════════════════════
// Desenhar
// ═══════════════════════════════════════════════════════════════════
// A fase do avatar vem do nível, como em todo o resto do jogo. Estava
// fixa em 2 e um bebé aparecia em combate com corpo de adulto.
function _pveFase(c) {
  const nv = (c.ficha && c.ficha.nivel) || 1;
  return (typeof _faseNum === 'function') ? _faseNum(nv)
       : nv < 5 ? 0 : nv < 10 ? 1 : nv < 17 ? 2 : 3;
}

// ── VIDA E MAGIA EM BOLINHAS ──
// Uma bolinha por cada 5 pontos, que é exatamente o que a Resistência
// vale: PV = R×5 e PM = R×5. Portanto o NÚMERO DE BOLINHAS É A
// RESISTÊNCIA do avatar — lê-se a ficha só de olhar para o cartão.
//
// A bolinha da vez enche-se por fração, para um golpe de 3 num avatar
// de 20 não desaparecer sem deixar rasto.
const PVE_POR_BOLINHA = 5;

function _pveBolinhas(atual, max, tipo) {
  const n = Math.max(1, Math.ceil(max / PVE_POR_BOLINHA));
  let html = '';
  for (let i = 0; i < n; i++) {
    const cheio = Math.max(0, Math.min(PVE_POR_BOLINHA, atual - i * PVE_POR_BOLINHA));
    const pct = Math.round(cheio / PVE_POR_BOLINHA * 100);
    html += `<i class="cb-bola ${tipo}${pct === 0 ? ' vazia' : ''}" style="--f:${pct}%"></i>`;
  }
  return html;
}

// ═══════════════════════════════════════════════════════════════════
// OS TRÊS LADO A LADO
//
// Antes havia um cartão grande para quem estava em campo e dois quadrados
// de 30px para os outros — e nesses não se via nada: nem vida, nem magia,
// nem o que os afligia. Trocar de avatar era às cegas.
//
// Agora os três estão à vista com a mesma informação, e quem está em
// campo distingue-se pelo tamanho e pelo brilho, não por ser o único
// legível.
// ═══════════════════════════════════════════════════════════════════
// As quatro características, com o que o combate lhes somou ou tirou à
// vista: "F2−1" em vez de "F1". Sem isto, um avatar envenenado parecia
// ter nascido fraco — o número mudava e nada dizia porquê.
function _pveCaracs(c) {
  return ['F', 'H', 'R', 'A'].map(k => {
    const d = _c3detalhe(c, k);
    // A Casca de Helena não soma à Armadura: dobra-a. Estava numa etiqueta
    // à parte ("A×2") longe do número que multiplica — e um multiplicador
    // longe do seu número não diz nada a ninguém.
    const dobra = (k === 'A' && c.armaduraDobrada) ? '<b class="sobe">×2</b>' : '';
    if (!d.mod) return `<span>${k}${d.base}${dobra}</span>`;
    const sinal = d.mod > 0 ? '+' : '−';
    return `<span>${k}${d.base}<b class="${d.mod > 0 ? 'sobe' : 'desce'}">${sinal}${Math.abs(d.mod)}</b>${dobra}</span>`;
  }).join(' ');
}

function _pveLutador(c, i, lado, ativo) {
  const el = CARACTERISTICAS_ELEMENTAIS[c.elemento];
  const emCampo = i === ativo;
  const cls = ['cb-lutador', lado, emCampo ? 'ativo' : '', c.vivo ? '' : 'caido'].join(' ');
  const tam = emCampo ? 52 : 38;

  const marcas = [];
  const m = (t, k) => marcas.push(`<span class="cb-marca ${k}">${t}</span>`);
  if (c.furia)          m(t('pve.marca.furia'), 'furia');
  if (c.veneno)         m(t('pve.marca.veneno'), 'veneno');
  if (c.indefeso)       m(t('pve.marca.indefeso'), 'indefeso');
  if (c.assombrado)     m(t('pve.marca.assombrado'), 'sombra');
  if (c.semFoco)        m(t('pve.marca.sem_foco'), 'sombra');
  if (c.invulneravel)   m(t('pve.marca.invul'), 'escudo');
  if (c.barreira > 0)   m(`${t('pve.marca.barreira')} ${c.barreira}`, 'escudo');
  if (c.ocultado)       m(t('pve.marca.oculto'), 'escudo');
  if (c.imuneEspiritual)m(t('pve.marca.alma'), 'escudo');
  if (c.vorpal)         m('✦', 'escudo');
  if (c.roubando)       m('🩸', 'veneno');
  if (c.bonusA)         m(`A+${c.bonusA}`, 'escudo');
  if (c.bonusF)         m(`F+${c.bonusF}`, 'buff');
  if (c.bonusFD)        m(`FD+${c.bonusFD}`, 'escudo');
  if (c.bonusEsquiva)   m(`${t('pve.marca.esquiva')}+${c.bonusEsquiva}`, 'escudo');
  if (c.cegoAtaque)     m(t('pve.marca.cego'), 'veneno');
  // As penalidades não levam etiqueta: já aparecem nos próprios
  // atributos, em "F2−1 H3−1 R2−1 A1−1". Uma etiqueta "TUDO−1" ao lado
  // é a mesma informação escrita duas vezes.
  if (c.indefesoTurnos > 1) m(t('pve.marca.preso'), 'indefeso');

  // O cartão inteiro abre a ficha deste avatar. Antes havia um "?" no
  // topo que abria a de dois — o ativo meu e o ativo dele — e nunca a
  // dos que estão no banco, que é justamente quem se precisa de conhecer
  // antes de o mandar entrar.
  return `<div class="${cls}" id="cbLut${lado}${i}"
       role="button" tabindex="0" onclick="_pveAbrirAjuda('${lado}',${i})"
       title="${t('pve.ajuda.abrir', { nome: c.nome })}">
    <span class="cb-lutador-ver">${t('pve.ajuda.ver')}</span>
    <div class="cb-lutador-svg">${gerarSVG(c.elemento, c.ficha.raridade, c.ficha.seed, tam, tam, _pveFase(c))}</div>
    <div class="cb-lutador-nome">${el ? el.emoji : '✦'} ${c.nome}</div>
    <div class="cb-lutador-carac">${_pveCaracs(c)}</div>
    <div class="cb-bolas pv">${_pveBolinhas(c.pv, c.pvMax, 'pv')}<b>${c.pv}</b></div>
    <div class="cb-bolas pm">${_pveBolinhas(c.pm, c.pmMax, 'pm')}<b>${c.pm}</b></div>
    ${marcas.length ? `<div class="cb-marcas">${marcas.join('')}</div>` : ''}
  </div>`;
}

function _pveEquipa(equipa, ativo, lado) {
  return `<div class="cb-equipa ${lado}">
    ${equipa.map((c, i) => _pveLutador(c, i, lado, ativo)).join('')}
  </div>`;
}

function _pveDesenhar() {
  const e = _pveEstado; if (!e) return;
  const eu = e.A[e.ativoA], ini = e.B[e.ativoB];

  document.getElementById('cbInimigo').innerHTML = _pveEquipa(e.B, e.ativoB, 'ini');
  document.getElementById('cbJogador').innerHTML = _pveEquipa(e.A, e.ativoA, 'eu');
  document.getElementById('cbTurno').textContent = t('pve.turno', { n: e.turnos + 1 });
  _pveDesenharAcoes(eu, ini);

  // Se a ficha estiver aberta, refaz-se. O prognóstico é contra quem
  // está do outro lado AGORA — deixá-lo do turno passado seria mostrar
  // contas contra um avatar que já saiu de campo, ou já morreu.
  const painel = document.getElementById('cbAjuda');
  if (painel && painel.classList.contains('aberta') && painel.dataset.quem) {
    const lado = painel.dataset.quem.slice(0, -1), i = +painel.dataset.quem.slice(-1);
    const c = (lado === 'eu' ? e.A : e.B)[i];
    const contra = lado === 'eu' ? e.B[e.ativoB] : e.A[e.ativoA];
    if (c) painel.innerHTML = _pveAjudaHTML(c, lado, contra);
  }
}

// ═══════════════════════════════════════════════════════════════════
// O QUE FAZ CADA MAGIA
//
// Um painel que se abre por cima da batalha e explica, do avatar em
// campo: o golpe comum, as três magias e a vantagem com que nasceu.
//
// Existe porque a barra de ações só tem espaço para o nome e o custo, e
// isso não chega a quem está começando — "Ferrões Salinos, 3 PM" não diz
// que envenena. Aqui cabe a descrição inteira, a conta da Força de
// Ataque e o que a magia faz para além do dano.
// ═══════════════════════════════════════════════════════════════════
function _pveAlternarAjuda() {
  const el = document.getElementById('cbAjuda'); if (!el) return;
  el.classList.remove('aberta');
}

// Abre a ficha de UM avatar — o que foi tocado, esteja em campo ou no
// banco. Tocar no mesmo outra vez fecha.
function _pveAbrirAjuda(lado, i) {
  const el = document.getElementById('cbAjuda'); if (!el || !_pveEstado) return;
  const c = (lado === 'eu' ? _pveEstado.A : _pveEstado.B)[i];
  if (!c) return;
  const chave = lado + i;
  if (el.classList.contains('aberta') && el.dataset.quem === chave) {
    el.classList.remove('aberta'); return;
  }
  el.dataset.quem = chave;
  // O prognóstico é contra quem está do outro lado neste momento
  const contra = lado === 'eu' ? _pveEstado.B[_pveEstado.ativoB] : _pveEstado.A[_pveEstado.ativoA];
  el.innerHTML = _pveAjudaHTML(c, lado, contra);
  el.classList.add('aberta');
}

// ═══════════════════════════════════════════════════════════════════
// O PROGNÓSTICO — o que esta magia faz CONTRA ESTE ALVO
//
// A fórmula sozinha ("FA H4 + F2 + 2d") não responde à pergunta que o
// jogador tem: vale a pena? Isso depende da Armadura de quem está à
// frente, de ele conseguir esquivar, de a magia ignorar armadura ou não.
//
// Em vez de repetir a matemática do motor aqui — que é a forma mais
// certa de os dois números discordarem — corre o PRÓPRIO motor umas
// centenas de vezes contra uma cópia do alvo e conta o que aconteceu.
// O número na tela sai da mesma função que resolve o golpe a sério.
// ═══════════════════════════════════════════════════════════════════
const PVE_PROGNOSTICO_N = 240;

// Cópia funda e descartável. Os combatentes são dados simples; as magias
// e a ficha vão junto por valor, o que não faz mal a quem só vai servir
// para uma simulação e ser deitado fora.
function _pveClone(c) { return JSON.parse(JSON.stringify(c)); }

// O que uma magia faz ao OUTRO. As de defesa não constam: agem sobre
// quem as lança, e forçá-las por aqui fazia a Maré Restauradora — que
// cura — anunciar-se com "0.3 de dano, fere em 18% das tentativas",
// porque o resolvedor lhe rolava um ataque de 1d que ninguém pediu.
const PVE_MAGIA_OFENSIVA = ['fa', 'roubaVida', 'drenaPM', 'veneno', 'cegueira',
  'petrifica', 'congela', 'congelaTurnos', 'destroiAlma', 'debuffR',
  'alvoIndefeso', 'ondasPor', 'vorpal'];

function _pvePrognostico(eu, alvo, magia, pm, extra) {
  if (!alvo || !alvo.vivo || !eu.vivo) return null;
  if (magia && !PVE_MAGIA_OFENSIVA.some(k => magia[k])) return null;
  const rng = _c3rng(0x5EED);
  let soma = 0, acertos = 0, esquivas = 0, criticos = 0, maior = 0, menor = Infinity;
  // Os efeitos que não são dano — envenenar, cegar, paralisar — medem-se
  // pelo teste que o alvo faz para lhes escapar. Uma magia pode não tirar
  // um único ponto de vida e continuar a ser a jogada certa.
  const efeitos = {};
  for (let i = 0; i < PVE_PROGNOSTICO_N; i++) {
    const a = _pveClone(eu), d = _pveClone(alvo);
    const ev = { testes: [] };
    let passou = 0;
    // O ciclo de turnos faz DUAS coisas: rola o golpe (_c3resolver) e só
    // depois aplica os efeitos (_c3aplicarEfeitos). Isto chamava apenas
    // a primeira, e por isso o prognóstico não via veneno, cegueira nem
    // gelo — os efeitos todos vivem na segunda. Aqui encadeiam-se na
    // mesma ordem, e as magias que não atacam entram com dano 0, tal
    // como lá.
    try {
      if (magia && !magia.fa) _c3aplicarEfeitos(a, d, magia, pm, 0, rng, ev);
      else {
        passou = _c3resolver(a, d, magia, pm, rng, ev, extra || {}) || 0;
        _c3aplicarEfeitos(a, d, magia, pm, passou, rng, ev);
      }
    } catch (err) { return null; }
    soma += passou;
    if (passou > 0) { acertos++; if (passou > maior) maior = passou; if (passou < menor) menor = passou; }
    if (ev.esquivou) esquivas++;
    if (ev.criticoAtk) criticos++;
    for (const x of (ev.testes || [])) {
      // A esquiva já tem linha própria; a troca não é efeito de magia;
      // e os testes de quem age não dizem nada sobre o alvo.
      if (x.rotulo === 'esquiva' || x.rotulo === 'troca' || x.de === 'quem') continue;
      const e = efeitos[x.rotulo] || (efeitos[x.rotulo] = { tentou: 0, pegou: 0 });
      e.tentou++; if (!x.passou) e.pegou++;
    }
  }
  const N = PVE_PROGNOSTICO_N;
  // Guarda se isto era um ataque de todo: para os que o são, "0.0 de
  // dano" é uma resposta — diz que a magia não serve contra este alvo —
  // e esconder a linha deixava a pergunta no ar.
  const fere = !magia || !!magia.fa || !!magia.roubaVida;
  // Uma magia que o alvo esquiva todas as vezes não é "nada a dizer" —
  // é a coisa mais importante a dizer. Antes devolvia null e o painel
  // ficava em branco, como se a magia não tivesse conta nenhuma.
  if (!soma && !acertos && !Object.keys(efeitos).length && !esquivas) return null;
  const media = soma / N;
  /* Quantos golpes destes derrubam o alvo.

     É a pergunta a que "5,2 de dano" não responde: 5,2 é muito ou
     pouco depende de o alvo ter 12 de vida ou 60. Com a média por
     golpe e a vida que ele ainda tem, o número sai sozinho — e é o que
     decide entre insistir e trocar de magia.

     Só quando a média é digna disso: com 0,2 por golpe daria "60
     golpes", um número certo e inútil. */
  const turnos = (media >= 0.5 && alvo.pv > 0) ? Math.ceil(alvo.pv / media) : null;
  return { media, acerto: acertos / N, esquiva: esquivas / N,
           critico: criticos / N, maior, menor: menor === Infinity ? 0 : menor,
           turnos, pvAlvo: alvo.pv, efeitos, fere, alvo: alvo.nome };
}

// O prognóstico em texto. Só diz o que é verdade para este par.
function _pvePrognosticoHTML(pr) {
  if (!pr) return '';
  const pc = x => Math.round(x * 100) + '%';
  const p = [];
  if (pr.fere || pr.media > 0 || pr.acerto > 0) {
    p.push(`<b>${pr.media.toFixed(1)}</b> ${t('pve.prog.dano')}`);
    p.push(t('pve.prog.passa', { pc: pc(pr.acerto) }));
    /* A faixa, e não só o maior.

       "média 5,2, maior 11" deixa o pior caso por dizer, e o pior caso
       é metade da decisão: uma magia que faz entre 4 e 6 é outra coisa
       do que uma que faz entre 0 e 11 com a mesma média.

       Vem DEPOIS da percentagem, e diz "quando fere", porque é isso
       que ela é: a faixa dos golpes que acertam. Antes da
       percentagem, "média 1,2" seguido de "entre 1 e 9" parecia uma
       contradição — e era só a média a incluir os golpes falhados. */
    if (pr.maior && pr.menor) {
      p.push(pr.menor === pr.maior
        ? t('pve.prog.maior', { n: pr.maior })
        : t('pve.prog.faixa', { min: pr.menor, max: pr.maior }));
    }
    // Quantos golpes destes o derrubam: é a escala que faltava.
    if (pr.turnos) p.push(pr.turnos === 1 ? t('pve.prog.derruba1')
                                        : t('pve.prog.derruba', { n: pr.turnos }));
  }
  // "foi envenenado 67%" diz mais do que "0.0 de dano" — e há magias em
  // que este é o número todo.
  for (const [rot, e] of Object.entries(pr.efeitos || {})) {
    if (!e.tentou) continue;
    const nome = t('pve.teste.res.' + rot + '.nao');
    p.push(`${nome === 'pve.teste.res.' + rot + '.nao' ? rot : nome} ${pc(e.pegou / e.tentou)}`);
  }
  // O nome, e não "ele": o painel do inimigo mostra o que ele faz ao MEU
  // avatar, e "ele esquiva" ali dentro não dizia quem.
  if (pr.esquiva > 0.005) p.push(t('pve.prog.esquiva', { pc: pc(pr.esquiva), nome: pr.alvo }));
  if (pr.critico > 0.005) p.push(t('pve.prog.critico', { pc: pc(pr.critico) }));
  if (!p.length) return '';
  return `<div class="cb-prog">${p.map(x => `<span>${x}</span>`).join('')}</div>`;
}

// A conta da Força de Ataque, em texto legível
/* ═══ A CONTA DE UMA MAGIA QUE NÃO ATACA ═══

   Vinte das quarenta e seis não rolam Força de Ataque, e esta função
   devolvia null para todas elas: ficavam sem linha de conta na ficha
   e no painel da batalha, com a descrição como único sítio onde os
   números podiam viver — e a maioria das descrições não trazia
   número nenhum.

   Escolher entre erguer uma concha e lançar uma lança era comparar
   "FA 4 + 2d (+1d por 2 PM)" com uma frase sobre conchas.

   A ordem é a de quem lê: o que a magia FAZ primeiro, e o resto
   depois. Uma magia pode ter mais do que um efeito. */
function _pveContaDefesa(g) {
  const p = [];
  if (g.armaduraPorPM) p.push(t('mag.conta.armadura_pm', { n: g.armaduraPorPM, max: g.armaduraMax || 5 }));
  if (g.armadura)      p.push(t('mag.conta.armadura', { n: g.armadura }));
  if (g.armaduraDobra) p.push(t('mag.conta.armadura_dobra'));
  if (g.bonusFD)       p.push(t('mag.conta.fd', { n: g.bonusFD }));
  if (g.bonusFDPorPM)  p.push(t('mag.conta.fd_pm', { n: g.bonusFDPorPM }));
  if (g.esquivaBonus)  p.push(t('mag.conta.esquiva_pm'));
  if (g.ocultacao)     p.push(t('mag.conta.oculta'));
  if (g.barreira)      p.push(t('mag.conta.barreira'));
  if (g.invulneravel)  p.push(t('mag.conta.invulneravel'));
  if (g.imuneEspiritual) p.push(t('mag.conta.imune'));
  if (g.cura) {
    // "1d por 2 PM" lê-se melhor do que "0.5 dados por PM", que é
    // como o catálogo a guarda.
    const porPM = g.cura.dadosPorPM || 0.5;
    p.push(t('mag.conta.cura', { n: 1, pm: Math.round(1 / porPM) }));
  }
  if (g.petrifica || g.congela || g.destroiAlma) p.push(t('mag.conta.fora'));
  if (g.buffForca)     p.push(t('mag.conta.forca', { n: g.buffForca }));
  if (g.buffFuria)     p.push(t('mag.conta.furia'));
  if (g.roubaVida)     p.push(t('mag.conta.rouba', { n: g.roubaVida.dados || 1 }));
  if (g.vorpal)        p.push(t('mag.conta.vorpal'));
  if (g.cegueira) {
    p.push(t('mag.conta.cegueira', { a: g.cegueira.ataque, e: g.cegueira.esquiva }));
  }
  return p.length ? p.join(' · ') : null;
}

/* O `eu` tanto pode ser um combatente — em batalha, com os bónus do
   turno já somados — como uma ficha crua, que é o que a ficha do
   avatar tem para dar fora do combate.

   Vale a pena aceitar os dois: a fórmula é a mesma frase nos dois
   sítios, e duas cópias dela divergiriam ao primeiro ajuste. */
function _pveFormula(g, eu) {
  if (!g) return null;
  // Sem Força de Ataque, o que há para contar é o efeito.
  if (!g.fa) return _pveContaDefesa(g);
  const car = k => (eu && eu.ficha) ? _c3(eu, k) : ((eu && eu[k]) || 0);
  const f = g.fa, p = [];
  if (f.H) p.push(`H${car('H')}`);
  if (f.F) p.push(`F${car('F')}`);
  if (f.fixo) p.push(String(f.fixo));
  const d = f.dados || 0;
  if (d) p.push(`${d}d`); else p.push('1d');
  let s = 'FA ' + p.join(' + ');
  if (f.dadosPorPM) s += ` (+${f.dadosPorPM === 0.5 ? '1d por 2' : f.dadosPorPM + 'd por'} PM)`;
  if (f.fixoPorPM)  s += ` (+${f.fixoPorPM} por PM)`;
  return s;
}

function _pveAjudaHTML(c, lado, contra) {
  return `<div class="cb-ajuda-cab">
      <span>${t('pve.ajuda.titulo', { nome: c.nome })}</span>
      <button onclick="_pveAlternarAjuda()">✕</button>
    </div>
    <div class="cb-ajuda-lista">${_pveAjudaDe(c, lado, contra)}</div>`;
}

// Um lado do painel. O inimigo mostra o mesmo que o jogador — saber o
// que ele sabe fazer é metade da decisão, e antes só se descobria
// levando com a magia na cara.
function _pveAjudaDe(eu, lado, contra) {
  if (!eu) return '';
  const tecto = _c3(eu, 'H') * 5;
  const el = CARACTERISTICAS_ELEMENTAIS[eu.elemento];

  /* O `tipo` pinta o item.

     Eram todos iguais: mesma moldura, mesma barra dourada à esquerda, e
     o papel escrito em letra de 3,6px por cima. Ler o painel era ler
     tudo. Com uma cor por família — golpe, magia de ataque, magia de
     defesa, vantagem, desvantagem — sabe-se o que se está a ver antes
     de se ler uma palavra. */
  const linha = (rot, nome, custo, desc, extra, trancada, prog, tipo) => `
    <div class="cb-ajuda-item tipo-${tipo || 'golpe'}${trancada ? ' trancada' : ''}">
      <div class="cb-ajuda-top">
        <span class="cb-ajuda-papel">${rot}</span>
        <span class="cb-ajuda-nome">${nome}</span>
        <span class="cb-ajuda-custo">${custo}</span>
      </div>
      <div class="cb-ajuda-desc">${desc}</div>
      ${extra ? `<div class="cb-ajuda-conta">${extra}</div>` : ''}
      ${prog || ''}
    </div>`;

  let html = linha(t('pve.ajuda.golpe'), t('pve.acao.comum'), t('mag.custo.livre'),
                   t('pve.ajuda.golpe_desc'),
                   `FA H${_c3(eu,'H')} + F${_c3(eu,'F')} + 1d`, false,
                   _pvePrognosticoHTML(_pvePrognostico(eu, contra, null, 0)), 'golpe');

  for (const cat of ['ataque', 'forte', 'defesa']) {
    const g = eu.magias[cat]; if (!g) continue;
    /* O slot da defesa nem sempre tem defesa lá dentro.

       Quando o elemento não tem magia defensiva nenhuma — o Fogo não
       tem, e é de propósito (magias.js) — o slot cai num segundo
       ataque do elemento. Isso sempre foi assim e está certo; o que
       não estava era chamar-lhe "Defesa".

       Passava despercebido enquanto todos os itens eram dourados.
       Agora que a defesa é azul, um rótulo azul a dizer DEFESA por
       cima de "uma bola de fogo que nasce entre as mãos" é uma
       contradição que o jogador vê antes de ler. Uma magia com FA é
       um ataque, esteja no slot que estiver, e é assim que se
       apresenta. */
    const atacaMesmo = (cat === 'defesa' && g.fa);
    const fam = atacaMesmo ? 'ataque' : cat;
    const papel = atacaMesmo ? t('mag.cat.defesa_atq') : t('mag.cat.' + cat);
    const trancada = g.pm > tecto;
    const custo = trancada ? t('mag.tecto', { h: Math.ceil(g.pm / 5) })
      : g.pm === 0 ? t('mag.custo.livre')
      : (g.pmMax && g.porTurno) ? t('mag.custo.faixa_turno', { min: g.pm, max: g.pmMax })
      : g.pmMax ? t('mag.custo.faixa', { min: g.pm, max: g.pmMax })
      : g.porTurno ? t('mag.custo.turno', { pm: g.pm })
      : t('mag.custo', { pm: g.pm });
    // O prognóstico usa os PM que a magia gastaria de fato — as de
    // faixa contam com o máximo que a Habilidade e a reserva deixam,
    // que é o que o jogador vai querer comparar.
    const pmProg = g.pmMax ? Math.min(g.pmMax, tecto, Math.max(g.pm, eu.pm)) : g.pm;
    html += linha(papel, t('mag.' + g.id + '.nome'), custo,
                  t('mag.' + g.id + '.desc'), _pveFormula(g, eu), trancada,
                  trancada ? '' : _pvePrognosticoHTML(_pvePrognostico(eu, contra, g, pmProg)),
                  fam);
  }

  const v = eu.vant;
  if (v) html += linha(t('vd.vantagem'), t('vd.' + v.id + '.nome').replace('{elem}', v.elemento || ''),
                       v.pm ? t('mag.custo', { pm: v.pm }) : '',
                       t('vd.' + v.id + '.desc').replace(/\{elem\}/g, v.elemento || ''),
                       null, false, '', 'vantagem');
  const d = eu.desv;
  if (d) html += linha(t('vd.desvantagem'), t('vd.' + d.id + '.nome').replace('{elem}', d.elemento || ''),
                       '', t('vd.' + d.id + '.desc').replace(/\{elem\}/g, d.elemento || ''),
                       null, false, '', 'desvantagem');

  // Quanto o alvo aguenta e o que ele opõe. Sem isto o prognóstico dá
  // um número sem escala: 6 de dano é muito ou pouco? Depende de ele ter
  // 12 de vida ou 60.
  let contraHTML = '';
  if (contra && contra.vivo) {
    const fd = `${_c3(contra,'H')} + ${_c3(contra,'A')} + 1d`;
    contraHTML = `<div class="cb-ajuda-contra">
      ${t('pve.prog.contra', { nome: contra.nome })}
      <span>${t('pve.prog.vida')} ${contra.pv}/${contra.pvMax} · FD ${fd}${
        _c3podeEsquivar(contra, eu) ? ' · ' + t('pve.prog.esquiva_pode') : ' · ' + t('pve.prog.esquiva_nao')}</span>
    </div>`;
  }

  return `<div class="cb-ajuda-lado ${lado}">
    <div class="cb-ajuda-quem">
      ${el ? el.emoji : '✦'} ${eu.nome}
      <span>${_pveCaracs(eu)} · ${t('pve.prog.vida')} ${eu.pv}/${eu.pvMax} · ${eu.pm}/${eu.pmMax} PM · ${t('ficha.tecto')} ${tecto} PM</span>
    </div>
    ${contraHTML}
    ${html}
  </div>`;
}

// ── A barra de ações ──
function _pveDesenharAcoes(eu, ini) {
  const alvo = document.getElementById('cbAcoes');
  const bd = document.getElementById('cbDesistir');
  if (bd) bd.style.display = _pveEstado.acabou ? 'none' : '';
  if (_pveEstado.acabou) { alvo.innerHTML = _pveBotaoFim(); return; }

  const tecto = _c3(eu, 'H') * 5;
  const btn = (id, rot, sub, on, extra) => `<button class="cb-btn ${extra || ''}"
      ${on ? '' : 'disabled'} onclick="${on ? id : ''}">
      <span class="cb-btn-rot">${rot}</span>
      <span class="cb-btn-sub">${sub}</span>
    </button>`;

  // ── O foco caiu: enquanto não for apanhado não há magia nenhuma ──
  if (eu.semFoco) {
    alvo.innerHTML =
      btn(`_pveEscolher('foco')`, t('pve.acao.apanhar_foco'), t('pve.acao.apanhar_foco_sub'), true, 'vant') +
      btn(`_pveEscolher('comum')`, t('pve.acao.comum'), `FA ${_c3(eu,'H')}+${_c3(eu,'F')}+1d`, true);
    return;
  }

  // O murro anuncia o que as vantagens de manobra lhe vão somar, senão
  // o jogador via um número no botão e outro no registo.
  const vv = eu.vant || {};
  let socoSub = `FA ${_c3(eu,'H')}+${_c3(eu,'F')}+1d`, socoRot = t('pve.acao.comum');
  if (vv.golpesMultiplos) {
    const n = Math.min(_c3(eu, 'H'), Math.floor(_c3pmDisponivel(eu) / vv.pmPorGolpe));
    if (n > 1) { socoRot = t('pve.acao.encadeado', { n }); socoSub = t('pve.acao.encadeado_sub', { n, pm: n }); }
  } else if (vv.bonusFGolpe && _c3pmDisponivel(eu) >= vv.pm) {
    socoRot = t('pve.acao.carregado');
    socoSub = `FA ${_c3(eu,'H')}+${_c3(eu,'F')}+${vv.bonusFGolpe}+1d · ${vv.pm} PM`;
  }
  let html = btn(`_pveEscolher('comum')`, socoRot, socoSub, true);

  // ── Toque Ardente: um ataque com outra conta ──
  if (vv.toqueEnergia) {
    const pmT = Math.min(_c3(eu, 'A'), Math.max(0, _c3pmDisponivel(eu)));
    html += btn(`_pveEscolher('toque')`, t('vd.toque_ardente.nome'),
                `FA ${_c3(eu,'A')}+1d+${pmT} · ${pmT} PM`, pmT > 0 || _c3(eu,'A') > 0);
  }

  for (const cat of ['ataque', 'forte', 'defesa']) {
    const g = eu.magias[cat];
    if (!g) { html += btn('', t('mag.cat.' + cat), t('pve.sem'), false, 'vazio'); continue; }
    const custo = _c3custoMagia(eu, g, g.pm);
    const podeH  = g.pm <= tecto;
    const podePM = custo <= eu.pm;
    const trancada = !_c3podeMagiar(eu);
    const sub = !podeH  ? t('pve.precisa_h', { h: Math.ceil(g.pm / 5) })
              : trancada ? t('pve.trancada')
              : !podePM  ? t('pve.sem_pm', { pm: custo })
              : (g.pmMax && g.porTurno) ? t('mag.custo.faixa_turno', { min: custo, max: Math.min(g.pmMax, eu.pm, tecto) })
              : g.pmMax  ? t('mag.custo.faixa', { min: custo, max: Math.min(g.pmMax, eu.pm, tecto) })
              : t('mag.custo', { pm: custo });
    html += btn(`_pveEscolher('${cat}')`, t('mag.' + g.id + '.nome'), sub,
                podeH && podePM && !trancada);
  }

  // Vantagem que gasta a ação
  const v = eu.vant;
  if (v && (v.curaTudo || v.subirCarac || v.paralisa)) {
    const on = eu.pm >= v.pm;
    html += btn(`_pveEscolher('vantagem')`,
                t('vd.' + v.id + '.nome').replace('{elem}', v.elemento || ''),
                on ? t('mag.custo', { pm: v.pm }) : t('pve.sem_pm', { pm: v.pm }), on, 'vant');
  }

  // ── As magias de pé, uma a uma ──
  // Um só botão desligava TODAS. Quem tinha o Manto e o Punho de pé e
  // queria parar de pagar os 5 PM do Punho perdia também o Manto, que
  // estava pagando de bom grado. Agora cada uma tem o seu botão, e as
  // que não cobram nada por turno nem aparecem — não há o que desligar.
  //
  // A Fúria Sombria entra mesmo não cobrando nada por turno: ela tranca
  // a esquiva e a magia, e não haver forma de a desligar fazia dela uma
  // armadilha. As que só dão bónus e não cobram nada ficam de fora —
  // não há decisão nenhuma a tomar sobre elas.
  const dePe = eu.sustentadas.filter(x => x.magia.porTurno || x.magia.buffFuria);
  if (dePe.length) {
    html += `<div class="cb-trocas">${dePe.map(x =>
      `<button class="cb-btn largar" onclick="_pveLargarSustentada('${x.magia.id}')">
         <span class="cb-btn-rot">${t('pve.acao.largar_uma', { nome: t('mag.' + x.magia.id + '.nome') })}</span>
         <span class="cb-btn-sub">${x.magia.porTurno
            ? t('pve.acao.largar_sub', { pm: x.pm })
            : t('pve.acao.largar_furia')}</span>
       </button>`).join('')}</div>`;
  }

  // Trocar
  const banco = _pveEstado.A.map((c, i) => ({ c, i }))
    .filter(x => x.i !== _pveEstado.ativoA && x.c.vivo);
  if (banco.length) {
    const margem = _c3(eu, 'H') - _c3(ini, 'H');
    const sub = margem >= 1 ? t('pve.troca.talvez') : t('pve.troca.perde');
    html += `<div class="cb-trocas">${banco.map(x =>
      `<button class="cb-btn troca" onclick="_pveEscolher('troca',${x.i})">
         <span class="cb-btn-rot">${t('pve.acao.trocar', { nome: x.c.nome })}</span>
         <span class="cb-btn-sub">${sub}</span>
       </button>`).join('')}</div>`;
  }
  alvo.innerHTML = html;
}

function _pveBotaoFim() {
  const r = combate3dtResultado(_pveEstado);
  const txt = _pveEstado._desistiu ? t('pve.desistiu.titulo')
            : r.vencedor === 'A' ? t('pve.venceu')
            : r.vencedor === 'B' ? t('pve.perdeu') : t('pve.empate');
  const g = _pveEstado._premio;
  const fr = _pveEstado._fraturados || [];
  const aviso = fr.length ? `<div class="cb-fratura">🦴 ${t('pve.fratura', { nomes: fr.join(', ') })}</div>` : '';
  const premio = g ? `<div class="cb-premio">
      ${g.desistiu ? `<span class="cada">${t('pve.desistiu')}</span>`
        : `<span>+${g.coinGain} 🪙</span>
           <span class="cada">${t('pve.premio.cada', { n: g.quantos })}</span>
           <span>+${g.xpGain} XP</span><span>+${g.vinculo} 💜</span>`}
      <span class="gasto">−${g.energia} ⚡ ${g.desistiu ? '' : t('pve.premio.cadaUm')}</span>
    </div>` : '';
  return `<div class="cb-fim ${r.vencedor === 'A' ? 'bom' : 'mau'}">${txt}</div>
    ${aviso}
    ${premio}
    <button class="cb-btn sair" onclick="fecharCombatePvE()">
      <span class="cb-btn-rot">${t('pve.sair')}</span></button>`;
}

// ═══════════════════════════════════════════════════════════════════
// A decisão do jogador
// ═══════════════════════════════════════════════════════════════════
function _pveEscolher(tipo, arg) {
  if (_pveAnim || !_pveEstado || _pveEstado.acabou) return;
  const eu = _pveEstado.A[_pveEstado.ativoA];

  if (tipo === 'troca')     _pveAcao = { troca: arg, magia: null, pm: 0 };
  else if (tipo === 'foco') _pveAcao = { apanharFoco: true };
  else if (tipo === 'toque') {
    const pmT = Math.min(_c3(eu, 'A'), Math.max(0, _c3pmDisponivel(eu)));
    _pveAcao = { toque: true, toquePM: pmT, magia: null, pm: 0 };
  }
  else if (tipo === 'comum')_pveAcao = { magia: null, pm: 0 };
  else if (tipo === 'vantagem') _pveAcao = { vantagem: eu.vant, pm: eu.vant.pm };
  else {
    const g = eu.magias[tipo];
    // Magia de custo variável: em vez de decidir por ele, abre-se a
    // escolha. Cada opção mostra o que rende, para a decisão ser
    // informada e não um palpite.
    const tecto = _c3(eu, 'H') * 5;
    const max = Math.min(g.pmMax || g.pm, tecto, _c3pmDisponivel(eu));
    if (g.pmMax && max > g.pm) { _pveEscolherPM(tipo, g, max); return; }
    _pveAcao = { magia: g, pm: _c3pmIdeal(g, eu, tecto) };
  }
  _pveJogarTurno();
}

// ═══════════════════════════════════════════════════════════════════
// QUANTO PM INVESTIR
//
// Metade das magias do manual escalam com os PMs gastos, e a interface
// decidia sozinha (metade do que havia). Isso tirava ao jogador a
// decisão mais interessante que estas magias oferecem: guardar magia
// para o turno seguinte, ou gastar tudo agora.
//
// Cada opção mostra a Força de Ataque que rende — a mesma regra do
// resto da tela, mostrar a conta em vez de pedir fé.
// ═══════════════════════════════════════════════════════════════════
/* O QUE UM DEGRAU DE PM RENDE, NUMA MAGIA QUE NÃO ATACA.

   O selector já podava os degraus inúteis — mas só sabia fazê-lo com
   magias de ataque, porque perguntava ao valorDaMagia, e esse devolve
   null a tudo o que não tenha Força de Ataque.

   A Maré Restauradora cura `floor(pm ÷ 2)` dados. O selector oferecia
   os dezanove degraus de 2 a 20, dos quais só dez dão coisas
   diferentes: 3 PM curam o mesmo que 2, 5 o mesmo que 4, e assim por
   diante. Nove botões que cobram um PM a mais por absolutamente nada.

   Devolve a conta E o rótulo: a conta serve para podar, o rótulo para
   o botão dizer o que dá. As outras quatro que escalam sem atacar não
   têm degraus inúteis, mas mostravam botões mudos — "3 PM" e mais
   nada. */
function _pveRendeSemAtaque(g, pm) {
  if (g.cura) {
    const d = Math.max(1, Math.floor(pm * (g.cura.dadosPorPM || 0.5)));
    return { chave: 'cura' + d, rotulo: t('mag.rende.cura', { n: d }) };
  }
  if (g.armaduraPorPM) {
    const a = Math.min(pm, g.armaduraMax || 5);
    return { chave: 'arm' + a, rotulo: t('mag.rende.armadura', { n: a }) };
  }
  if (g.bonusFDPorPM) { const v = pm * g.bonusFDPorPM;
    return { chave: 'fd' + v, rotulo: t('mag.rende.fd', { n: v }) }; }
  if (g.esquivaBonus) return { chave: 'esq' + pm, rotulo: t('mag.rende.esquiva', { n: pm }) };
  if (g.barreira)     return { chave: 'bar' + pm, rotulo: t('mag.rende.barreira', { n: pm * 2 }) };
  return null;
}

function _pveEscolherPM(tipo, g, max) {
  const eu = _pveEstado.A[_pveEstado.ativoA];
  const alvo = document.getElementById('cbAcoes');
  // Só os degraus que rendem mesmo alguma coisa a mais. Numa magia que
  // ganha 1d a cada 2 PMs, gastar 4 em vez de 2 dá exatamente o mesmo —
  // e oferecer essa opção é oferecer uma armadilha.
  const rende = pm => {
    const v = (typeof valorDaMagia === 'function') ? valorDaMagia(g, eu.ficha, pm) : null;
    // O "|| 1" é a regra do motor: uma magia sem dados próprios rola na
    // mesma o dado do ataque. Sem isto, 2 e 4 PMs pareciam diferentes na
    // conta e davam exatamente o mesmo em jogo.
    if (v) return v.caracs + '|' + (v.dados || 1);
    const r = _pveRendeSemAtaque(g, pm);
    return r ? r.chave : String(pm);
  };
  const escolhas = [];
  let ultimo = null;
  for (let pm = g.pm; pm <= max; pm++) {
    const r = rende(pm);
    if (r !== ultimo) { escolhas.push(pm); ultimo = r; }
  }
  // Se ainda assim forem muitos, ficam os extremos e três pelo meio.
  const podados = escolhas.length <= 6 ? escolhas
    : [0, 1, 2, 3, 4, 5].map(i => escolhas[Math.round(i * (escolhas.length - 1) / 5)])
        .filter((v, i, ar) => ar.indexOf(v) === i);

  alvo.innerHTML = `<div class="cb-pm-cab">
      ${t('pve.pm.titulo', { nome: t('mag.' + g.id + '.nome') })}
    </div>` + podados.map(pm => {
    const v = (typeof valorDaMagia === 'function') ? valorDaMagia(g, eu.ficha, pm) : null;
    const custo = _c3custoMagia(eu, g, pm, _pveEstado.B[_pveEstado.ativoB]);
    // Sem Força de Ataque o botão ficava mudo: só "3 PM", e o jogador
    // escolhia às cegas quanto investir numa cura ou numa concha.
    const semAtk = v ? null : _pveRendeSemAtaque(g, pm);
    const conta = v ? `FA ${v.caracs}${v.dados ? ' + ' + v.dados + 'd' : ' + 1d'}`
                : semAtk ? semAtk.rotulo : '';
    return `<button class="cb-btn" onclick="_pveLancarCom('${tipo}',${pm})">
        <span class="cb-btn-rot">${pm} PM</span>
        <span class="cb-btn-sub">${conta}${custo !== pm ? ` · ${t('pve.pm.paga', { n: custo })}` : ''}</span>
      </button>`;
  }).join('') + `<div class="cb-trocas">
      <button class="cb-btn troca" onclick="if(!_pveAnim)_pveDesenhar()">
        <span class="cb-btn-rot">${t('pve.pm.voltar')}</span></button>
    </div>`;
}

function _pveLancarCom(tipo, pm) {
  if (_pveAnim || !_pveEstado || _pveEstado.acabou) return;
  const eu = _pveEstado.A[_pveEstado.ativoA];
  _pveAcao = { magia: eu.magias[tipo], pm };
  _pveJogarTurno();
}

// ═══════════════════════════════════════════════════════════════════
// DESLIGAR UMA MAGIA SUSTENTADA
//
// Manter uma magia de pé custa PM todo o turno. Sem forma de a desligar,
// um escudo lançado no primeiro turno drenava o avatar até ao fim da
// luta — e a única saída era ficar sem PM, que é a pior altura possível.
//
// NÃO gasta o turno: deixar de pagar não é uma jogada, é parar de fazer
// uma coisa. Depois de desligar, o jogador ainda escolhe o que fazer.
// ═══════════════════════════════════════════════════════════════════
function _pveLargarSustentada(id) {
  if (_pveAnim || !_pveEstado || _pveEstado.acabou) return;
  const eu = _pveEstado.A[_pveEstado.ativoA];
  const alvo = eu.sustentadas.find(x => x.magia.id === id);
  if (!alvo) return;
  const poupa = alvo.magia.porTurno ? alvo.pm : 0;
  _c3largarSustentadas(eu, x => x.magia.id === id);
  _pveLog(`<div class="cb-extras de-eu"><span class="quem">${eu.nome}</span>` +
          `<span>${t('pve.largou_uma', { nome: t('mag.' + id + '.nome'), pm: poupa })}</span></div>`,
          'warn', _pveEstado.turnos + 1);
  _pveDesenhar();
}

function _pveJogarTurno() {
  const e = _pveEstado;
  const antes = e.eventos.length;
  const eraA = e.A[e.ativoA], eraB = e.B[e.ativoB];

  combate3dtTurno(e);
  _pveAcao = null;

  // Quem entrou em campo por o anterior ter caído. O motor troca-o
  // sozinho no fim do turno e não gera evento nenhum — sem isto, o
  // adversário mudava de cara sem uma palavra.
  //
  // Vem DEPOIS dos eventos do turno, que é a ordem real: primeiro
  // alguém cai, só depois o seguinte entra. As trocas voluntárias ficam
  // de fora porque já têm evento próprio (aí o anterior está vivo).
  const entradas = [];
  for (const [antigo, atual, lado] of [[eraA, e.A[e.ativoA], 'A'], [eraB, e.B[e.ativoB], 'B']]) {
    if (atual && antigo && atual !== antigo && !antigo.vivo)
      entradas.push({ entrada: true, lado, quem: atual.nome, turno: e.turnos });
  }

  _pveAnimar(e.eventos.slice(antes).concat(entradas));
}

// Enquanto a animação corre não se joga. O motor já resolveu o turno —
// o que está na tela é a repetição — e aceitar outra jogada aqui seria
// jogar um turno sem ter visto o anterior.
function _pveTravarAcoes(travar) {
  const el = document.getElementById('cbAcoes');
  if (el) el.classList.toggle('a-animar', travar);
  const bd = document.getElementById('cbDesistir');
  if (bd) bd.disabled = travar;
}

// ═══════════════════════════════════════════════════════════════════
// FECHAR AS CONTAS — o que a batalha cobra e o que paga
//
// Cobra energia aos TRÊS, não só ao que está ativo: lutaram os três.
// Paga XP, moedas e vínculo pelo mesmo cano dos minijogos (miniReward),
// para a dificuldade, o bónus de raridade e o multiplicador de vínculo
// se aplicarem aqui exatamente como se aplicam lá.
//
// Perder também paga, menos: uma batalha perdida é tempo do jogador na
// mesma, e sair de mãos vazias faz com que ninguém arrisque a segunda.
// ═══════════════════════════════════════════════════════════════════
const PVE_PREMIO = {
  vitoria: { xp: 2.2, moedas: 2.0, vinculo: 5 },
  derrota: { xp: 0.6, moedas: 0.5, vinculo: 1 },
  empate:  { xp: 1.0, moedas: 0.9, vinculo: 2 },
};

function _pveFecharContas() {
  const e = _pveEstado;
  if (!e || e._contasFechadas) return;      // uma vez só por batalha
  e._contasFechadas = true;

  // ── A energia dos três ──
  const idx = (typeof equipaIdx === 'function') ? equipaIdx() : [];
  const custo = e._desistiu ? PVE_ENERGIA_DESISTIR : PVE_ENERGIA_CUSTO;
  // Por avatar, e não pela equipa: o Fôlego de Combate é de quem o traz
  // vestido. Daí o getItemEffectDoSlot — o getItemEffect() só sabe ler o
  // inventário de quem está em campo, e aqui pagam os três.
  // Nunca menos de 1: uma batalha de graça seria energia infinita.
  idx.forEach(i => {
    const m = (typeof getItemEffectDoSlot === 'function')
      ? getItemEffectDoSlot(i, 'battleEnergyMult') : 1;
    _pveGastarEnergia(i, Math.max(1, Math.round(custo * m)));
  });

  // ── A fratura ──
  // Vale para quem caiu, tenha a batalha acabado como acabou. Quem
  // desiste protege os que ainda estão de pé, não os que já caíram.
  const fraturados = [];
  e.A.forEach((c, n) => {
    if (c.vivo || idx[n] == null) return;
    // A Tala de Osso é de quem caiu, não de quem está em campo.
    const chance = PVE_FRATURA_CHANCE * ((typeof getItemEffectDoSlot === 'function')
      ? getItemEffectDoSlot(idx[n], 'fraturaMult') : 1);
    if (Math.random() >= chance) return;
    if (_pveAdoecer(idx[n], 'fratura')) fraturados.push(c.nome);
  });
  e._fraturados = fraturados;

  // ── O prémio ──
  // Os multiplicadores são os mesmos dos minijogos (dificuldade, bónus
  // de raridade, multiplicador de vínculo), para a batalha não ser um
  // atalho para fora do sistema de progressão que já existe.
  const r = combate3dtResultado(e);
  const p = PVE_PREMIO[r.vencedor === 'A' ? 'vitoria'
                     : r.vencedor === 'B' ? 'derrota' : 'empate'];

  const d  = (typeof miniDifficulty === 'function') ? miniDifficulty() : { xp: 10, coins: 10 };
  const rb = (typeof rarityBonus === 'function') ? rarityBonus() : { xp: 1, moedas: 1 };
  const vb = (typeof getVinculoBonus === 'function') ? getVinculoBonus() : { xpMult: 1 };
  const xpGain   = Math.round(d.xp    * p.xp      * rb.xp     * vb.xpMult);
  const coinGain = Math.round(d.coins * p.moedas  * rb.moedas);

  // Quem desiste não leva prémio nenhum: guardou energia, e é esse o
  // ganho. Pagar na mesma faria da desistência a jogada óptima sempre.
  const ganho = e._desistiu ? { xpGain: 0, coinGain: 0 } : { xpGain, coinGain };
  if (!e._desistiu) {
    // Moedas: uma vez, para o jogador. XP e vínculo: a cada um dos três.
    if (typeof earnCoins === 'function') earnCoins(coinGain);
    idx.forEach(i => _pvePremiarAvatar(i, xpGain, p.vinculo));
  }
  e._premio = { ...ganho, vinculo: e._desistiu ? 0 : p.vinculo,
                energia: custo, quantos: idx.length, desistiu: !!e._desistiu };
  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof updateAllUI === 'function') updateAllUI();
}

// ═══════════════════════════════════════════════════════════════════
// Animar — com os efeitos que o jogo já tinha
// ═══════════════════════════════════════════════════════════════════
/* ═══ O RELÓGIO DA BATALHA ═══

   Antes havia uma tabela de tempos fixos aqui: um golpe valia 850ms,
   uma troca 500, o fim de turno 220. E dentro de cada um desses
   tempos NADA era encadeado — o cartão tremia, o número subia, as
   partículas voavam, a vida caía e o registo escrevia a conta toda,
   os efeitos todos e o desfecho, tudo no mesmo instante. Depois vinham
   850ms de nada a olhar para o resultado já consumado.

   Agora cada evento DIZ quanto tempo precisa, e o seguinte só começa
   quando esse acaba. A tabela desaparece: não há como o tempo marcado
   e o tempo gasto divergirem, porque são o mesmo número.

   Um golpe esquivado não custa o mesmo que um golpe que acerta, e uma
   magia de defesa não custa o mesmo que um crítico. Com a tabela
   custavam. */
function _pveAnimar(eventos) {
  _pveAnim = true;
  // O clique já era ignorado enquanto a animação corria, mas os botões
  // continuavam com ar de clicáveis — carregar e não acontecer nada
  // parece avaria. Agora apagam-se e deixam de receber o rato.
  _pveTravarAcoes(true);

  const minha = ++_pveGeracao;
  const vivo  = () => minha === _pveGeracao && !!_pveEstado;
  let i = 0;
  (function proximo() {
    if (!vivo()) { _pveAnim = false; return; }
    if (i >= eventos.length) {
      return setTimeout(() => {
        if (!vivo()) return;
        _pveAnim = false;
        _pveTravarAcoes(false);
        if (_pveEstado.acabou) _pveFecharContas();
        _pveDesenhar();
        if (_pveEstado.acabou) _pveLog(_pveTextoFim(), 'info');
      }, 260);
    }
    const ms = _pveMostrarEvento(eventos[i++]);
    setTimeout(proximo, ms == null ? 400 : ms);
  })();
}

/* Um gesto no cartão: tira a classe, força o navegador a reconhecer a
   ausência, e volta a pô-la. Sem o `offsetWidth` pelo meio, dois
   golpes seguidos no mesmo avatar animavam uma vez só — a classe já lá
   estava e o navegador não vê razão para recomeçar nada.

   E tira-a no fim: uma classe de animação esquecida no cartão fica a
   competir com o `transform` de quem está em campo. */
function _pveGesto(el, classe, dura) {
  if (!el) return;
  el.classList.remove(classe);
  void el.offsetWidth;
  el.classList.add(classe);
  setTimeout(() => el.classList.remove(classe), dura || 700);
}

/* UMA PARCELA DE TESTE, LIDA DE UMA STRING.

   As parcelas dos testes chegam como texto — "H2", "−H1", "+1" —
   montadas em onze sítios do motor. Convertê-las todas a objectos como
   fiz na FA e na FD era mexer em onze chamadas para um ganho que é só
   de apresentação; parto-as aqui, que é onde a apresentação vive.

   O que não casar com o molde passa tal e qual: mais vale uma parcela
   sem enfeite do que uma parcela comida por uma expressão regular. */
/* O `i` é o índice na conta, e serve para uma coisa só: a primeira
   parcela não leva sinal e as outras levam.

   Sem isso, um bónus escrito "2" — sem sinal, como o motor o passa —
   colava-se à parcela anterior: "H2 − H1" seguido de "2" lia-se
   "H2 − H12". Um número inventado no meio de uma conta que existe
   precisamente para se poder conferir. */
function _pveParcelaTexto(txt, i) {
  const m = String(txt).match(/^([+−-])?\s*([A-Za-zÀ-ſ]*)\s*(\d+)$/);
  if (!m) return (i ? ' ' : '') + '<span class="cb-parcela">' + esc(String(txt)) + '</span>';
  const menos = (m[1] === '−' || m[1] === '-');
  const sinal = i ? (menos ? ' − ' : ' + ') : (menos ? '−' : '');
  return sinal
       + '<span class="cb-parcela">' + esc(m[2] || '') + '<i>' + m[3] + '</i></span>';
}

/* Um teste de característica, no mesmo padrão da FA e da FD.

   A linha à vista diz o que interessa de relance: que teste foi, de
   quem, e como acabou. A conta vai para o detalhe e só aparece com o
   turno aberto — como a da Força de Ataque.

   E escreve-se como se JOGA. A conta de um teste não é uma soma: o
   dado não se soma ao alvo, compara-se com ele. Por isso as parcelas
   dão o alvo de um lado e o dado passa ou não passa do outro. Um seis
   falha sempre, por mais alto que o alvo seja, e leva palavra própria.

   Existe uma vez só porque a troca já desenhou o seu à parte uma vez e
   ficou sem o nome do dono nem o desfecho em palavras — duas cópias da
   mesma coisa divergem sempre. */
function _pveTesteHTML(x, ev) {
  const chave = 'pve.teste.res.' + x.rotulo + '.' + (x.passou ? 'sim' : 'nao');
  const res = t(chave) === chave
    ? (x.passou ? t('pve.teste.passou') : t('pve.teste.falhou'))
    : t(chave);
  const dono = (x.de === 'quem' ? ev.quem : ev.alvo) || '';
  const nome = t('pve.teste.' + x.rotulo);

  const corpo = (x.partes || []).map(_pveParcelaTexto).join('');
  const alvo  = (x.partes && x.partes.length > 1)
    ? corpo + ' = <b>' + x.valor + '</b>'
    : corpo;
  const conta = '<span class="cb-detalhe"><span class="cb-conta-linha">'
    + nome + ' = ' + alvo
    + ' · <b class="cb-dado">🎲' + x.dado + '</b> '
    + (x.passou ? '≤' : '>') + ' ' + x.valor
    + (x.seis ? ' <span class="cb-crit">' + t('pve.teste.seis') + '</span>' : '')
    + '</span></span>';

  return `<span class="cb-teste ${x.passou ? 'passou' : 'falhou'}">
      <b>${nome}</b> <u>${dono}</u> → ${res}${conta}
    </span>`;
}

/* ═══ AS BATIDAS DE UM ACONTECIMENTO ═══

   Devolve os milissegundos que precisa. O _pveAnimar espera-os antes
   de passar ao seguinte, e por isso este número não é uma estimativa
   nem uma promessa: é o tempo mesmo.

   Um golpe não é um instante. É uma sequência curta, e mostrá-la toda
   ao mesmo tempo é o mesmo que não a mostrar — o olho não separa cinco
   coisas simultâneas, vê um clarão e um resultado. Por ordem:

     quem ataca avança e paga  →  a conta rola  →  o golpe chega
     →  a vida cai  →  fica o que ficou

   Os tempos vivem aqui em cima, juntos, porque é a relação ENTRE eles
   que faz o ritmo — espalhados pelo código, ajustar um era descobrir
   os outros por acidente. */
const PVE_BATIDA = {
  conta:   360,   // a rolagem aparece depois de se ver quem age
  esquiva: 400,   // o alvo sai da frente
  golpe:   620,   // o impacto
  vida:    980,   // a barra só desce depois de se LER o número
  efeitos: 1180,  // veneno, gelo, cegueira: o que sobrou do golpe
  fim:    1500,   // o golpe inteiro
  onda:    300,   // entre as ondas de um ataque múltiplo
};

function _pveMostrarEvento(ev) {
  const souEu   = ev.lado === 'A';
  // O cartão em que o golpe caiu, pelo ÍNDICE do evento. Usar o ativo
  // do momento estava errado desde que o avanço passou para o fim do
  // turno: a animação ia para o inimigo seguinte enquanto o dano tinha
  // sido no anterior.
  const cartaoAlvo = (ev.alvoIdx != null)
    ? document.getElementById((souEu ? 'cbLutini' : 'cbLuteu') + ev.alvoIdx)
    : null;

  if (ev.apanhouFoco) {
    _pveLog(t('pve.log.apanhou_foco', { quem: ev.quem }), souEu ? 'good' : 'warn', ev.turno);
    _pveDesenhar();
    return 480;
  }

  // O que o fim do turno cobra: veneno, cura perpétua, sustentadas.
  // Mexia nos números sem dizer nada, e por isso o veneno parecia não
  // funcionar — funcionava, só não se via.
  // Preso no gelo: perdeu o turno inteiro. Sem esta linha o turno
  // passava sem uma palavra sobre ele, e parecia que a interface tinha
  // esquecido o avatar.
  if (ev.preso) {
    _pveLog(`<div class="cb-extras ${souEu ? 'de-eu' : 'de-ini'}">` +
            `<span class="quem">${ev.quem}</span><span>${t('pve.ev.preso')}</span></div>`,
            souEu ? 'bad' : 'good', ev.turno);
    return 440;
  }

  if (ev.fimDeTurno) {
    const its = [];
    if (ev.sangrou)  its.push(t('pve.fim.sangrou', { n: ev.sangrou }));
    if (ev.regenerou)its.push(t('pve.fim.regenerou', { n: ev.regenerou }));
    if (ev.sustentouPor)     its.push(t('pve.fim.sustentou', { n: ev.sustentouPor }));
    if (ev.sustentadasCairam)its.push(t('pve.fim.caiu_sustentada', { n: ev.sustentadasCairam }));
    if (ev.destravou)its.push(t('pve.fim.destravou'));
    if (ev.descongelou)its.push(t('pve.fim.descongelou'));
    if (ev.acalmou) its.push(t('pve.fim.acalmou'));
    if (ev.caiu)     its.push(t('pve.ev.caiu', { nome: ev.quem }));
    // Nada a dizer, nada a esperar: um evento vazio não gasta tempo.
    if (!its.length) return 0;
    // O gasto de PM sai a flutuar do cartão de quem pagou, como o dano
    const cartao = (ev.quemIdx != null)
      ? document.getElementById((souEu ? 'cbLuteu' : 'cbLutini') + ev.quemIdx) : null;
    if (cartao && ev.sustentouPor) _pveNumeroPM(cartao, ev.sustentouPor);
    if (cartao && ev.sangrou) _pveNumeroFlutuante(cartao, ev.sangrou, false);
    // A Cura Perpétua fechava o corpo em silêncio: a barra crescia
    // sozinha, sem uma palavra nem um número.
    if (cartao && ev.regenerou) _pveNumeroFlutuante(cartao, ev.regenerou, false, 'cura');
    // O nome vai numa etiqueta da cor do lado, e não num <b> discreto.
    // Estas linhas não têm nome de magia a ancorá-las, e num turno podem
    // aparecer duas seguidas de avatares DIFERENTES — um a sangrar, outro
    // a curar-se. Lidas depressa, pareciam o mesmo avatar a perder vida
    // apesar de se estar a curar.
    _pveLog(`<div class="cb-extras ${souEu ? 'de-eu' : 'de-ini'}">` +
            `<span class="quem">${ev.quem}</span>` +
            its.map(x => `<span>${x}</span>`).join('') + `</div>`,
            souEu ? 'good' : 'bad', ev.turno);
    _pveAtualizarBarras();
    return 380;
  }

  // O roubo de vida acontece no fim do turno, sem ataque nenhum
  if (ev.roubou != null && ev.fa == null) {
    _pveLog(`<b>${ev.quem}</b> · ${t('vd.sangue_por_magia.nome') && ''}${t('mag.so_a3.nome')}` +
            `<div class="cb-extras"><span>${t('pve.ev.roubou', { n: ev.roubou })}</span>` +
            (ev.caiu ? `<span>${t('pve.ev.caiu', { nome: ev.alvo })}</span>` : '') + `</div>`,
            souEu ? 'good' : 'bad', ev.turno);
    _pveAtualizarBarras();
    return 560;
  }

  if (ev.entrada) {
    _pveLog(t('pve.log.entra', { nome: ev.quem }), souEu ? 'good' : 'warn', ev.turno);
    _pveDesenhar();
    return 480;
  }

  if (ev.troca) {
    const tst = (ev.testes || [])[0];
    const conta = tst
      ? `<div class="cb-testes">${_pveTesteHTML(tst, ev)}</div>`
      : ev.semRolagem
      // Aqui não houve dado nenhum: o mais lento nem chega a rolar. A
      // conta mostra só as parcelas que decidiram isso.
      ? `<div class="cb-testes"><span class="cb-teste falhou">
           <b>${t('pve.teste.troca')}</b> <u>${ev.quem}</u>
           → ${t('pve.teste.sem_rolagem')}
           <span class="cb-detalhe"><span class="cb-conta-linha">${t('pve.teste.troca')} =
             ${ev.semRolagem.map(_pveParcelaTexto).join('')}</span></span>
         </span></div>`
      : '';
    _pveLog(t('pve.log.troca', { quem: ev.quem, entra: ev.troca }) + ' — ' +
            (ev.limpa ? t('pve.log.troca_limpa') : t('pve.log.troca_pressa')) + conta,
            ev.limpa ? 'good' : 'warn', ev.turno);
    _pveDesenhar();
    return 560;
  }

  // A CONTA, que é o ponto desta versão
  let conta = '';
  // Magia de ondas: cada onda rolou a sua própria FA contra a sua
  // própria FD. Mostrar só a última ao lado do dano somado dava uma
  // conta que não fecha — e a conta que não fecha é pior do que conta
  // nenhuma.
  if (ev.rolagens) {
    conta = ev.rolagens.map((r, i) => {
      const atk = `FA ${r.fa}${r.criticoAtk ? '★' : ''}`;
      return `<span class="cb-onda-linha">${i + 1}ª ` + (r.esquivou
        ? `${atk} → ${t('pve.ev.esquivou')}`
        : `${atk} − FD ${r.fd}${r.criticoDef ? '★' : ''} = ` +
          (r.dano > 0 ? `<b>${r.dano}</b>` : t('pve.nada'))) + `</span>`;
    }).join('') + `<span class="cb-onda-total">${t('pve.total', { n: ev.dano })}</span>`;
  } else if (ev.fa != null) {
    const atk = `FA ${ev.fa}${ev.criticoAtk ? '★' : ''}`;
    // Quem esquiva não rola Defesa nenhuma — mostrar "FD undefined" seria
    // inventar um número que o motor nunca calculou.
    conta = ev.esquivou
      ? `${atk} → <i>${t('pve.ev.esquivou')}</i>`
      : `${atk} − FD ${ev.fd}${ev.criticoDef ? '★' : ''} = `
        + (ev.dano > 0 ? `<b>${ev.dano}</b>` : `<i>${t('pve.nada')}</i>`);
    // A conta aberta vai junto, escondida até se abrir o turno.
    const detalhe = _pveConta('FA', ev.faPartes, ev.fa, ev.criticoAtk)
                  + (ev.esquivou ? '' : _pveConta('FD', ev.fdPartes, ev.fd, ev.criticoDef));
    if (detalhe) conta += '<span class="cb-detalhe">' + detalhe + '</span>';
  }
  const nome = ev.vantagem ? t('vd.' + ev.vantagem + '.nome').replace('{elem}', '')
             : ev.magia    ? t('mag.' + ev.magia + '.nome')
             : ev.toque    ? t('vd.toque_ardente.nome')
             : ev.golpes   ? t('pve.acao.encadeado', { n: ev.golpes })
             : ev.carregado? t('pve.acao.carregado')
             : t('pve.acao.comum');

  // ── A CONTA DOS TESTES ──
  // O ataque já mostrava FA contra FD. Os testes mostravam só o
  // resultado — "o alvo resistiu ao veneno" — e quem perde um efeito
  // por um ponto tem direito a ver qual foi o ponto.
  //
  //   veneno   R3 −1 = 2 · 1d[5] → falhou
  //
  // O manual manda passar com um valor IGUAL OU MENOR ao da
  // característica, e um 6 falha sempre por mais alta que ela seja —
  // por isso o 6 é marcado, senão parecia erro de conta.
  const testes = (ev.testes || []).map(x => _pveTesteHTML(x, ev)).join('');

  // ── SEM REPETIR O QUE O TESTE JÁ DISSE ──
  // O teste escreve o desfecho em palavras: "→ foi envenenado". Uma
  // etiqueta a seguir a dizer "envenenado" é a mesma frase outra vez.
  // Só ficam as que ACRESCENTAM alguma coisa — a cegueira, por exemplo,
  // fica porque diz os números (−1 no ataque, −3 na esquiva).
  const rolou = new Set((ev.testes || []).map(x => x.rotulo));
  const repete = r => rolou.has(r);

  const meus = [], dele = [];
  if (ev.reflexo)       dele.push(t('pve.ev.reflexo'));
  // O Reflexo Espelhado manda o golpe de volta: quem o leva é o
  // ATACANTE. Estava no bloco do alvo e lia-se ao contrário.
  if (ev.devolveu)      meus.push(t('pve.ev.devolveu', { n: ev.devolveu }));
  if (ev.envenenou && !repete('veneno')) dele.push(t('pve.ev.envenenou'));
  if (ev.enfraqueceu)   dele.push(t('pve.ev.enfraqueceu'));
  if (ev.enfureceu && !repete('furia')) dele.push(t('pve.ev.enfureceu'));
  if (ev.paralisou && !repete('paralisia')) dele.push(t('pve.ev.paralisou'));
  if (ev.resistiu && !rolou.size) dele.push(t('pve.ev.resistiu'));
  if (ev.fora)          dele.push(t('pve.ev.fora'));
  // A Fúria Sombria erguia-se em silêncio: aparecia a marca no cartão e
  // mais nada. É a única magia que TIRA alguma coisa a quem a lança —
  // nem esquiva nem magia enquanto estiver de pé — e isso merece linha.
  if (ev.furia)         meus.push(t('pve.ev.furia'));
  if (ev.curou)         meus.push(t('pve.ev.curou'));
  if (ev.subiu)         meus.push(t('pve.ev.subiu', { c: ev.subiu }));
  if (ev.invulneravel)  meus.push(t('pve.ev.invulneravel'));
  if (ev.barreira)      meus.push(t('pve.ev.barreira', { n: ev.barreira }));
  if (ev.imune)         meus.push(t('pve.ev.imune'));
  if (ev.imunizou)      dele.push(t('pve.ev.imunizou'));
  if (ev.ocultou)       meus.push(t('pve.ev.ocultou'));
  if (ev.esquivaMais)   meus.push(t('pve.ev.esquiva_mais', { n: ev.esquivaMais }));
  if (ev.drenou)        meus.push(t('pve.ev.drenou', { n: ev.drenou }));
  if (ev.absorveuTudo)  dele.push(t('pve.ev.absorveu'));
  if (ev.barreiraComeu) dele.push(t('pve.ev.barreira_comeu', { n: ev.barreiraComeu }));
  if (ev.barreiraCaiu)  dele.push(t('pve.ev.barreira_caiu'));
  if (ev.pagouComSangue)meus.push(t('pve.ev.sangue', { n: ev.pagouComSangue }));
  if (ev.perdeuFoco && !repete('foco')) dele.push(t('pve.ev.perdeu_foco'));
  if (ev.caiuSozinho)   meus.push(t('pve.ev.caiu_sozinho'));
  if (ev.semDano)       dele.push(t('pve.ev.sem_dano'));
  if (ev.resistiuVeneno && !repete('veneno')) dele.push(t('pve.ev.resistiu_veneno'));
  if (ev.jaEnvenenado)  dele.push(t('pve.ev.ja_envenenado'));
  if (ev.jaCego)        dele.push(t('pve.ev.ja_cego'));
  if (ev.semPMparaRoubar)dele.push(t('pve.ev.sem_pm_roubar'));
  if (ev.cegou)         dele.push(t('pve.ev.cegou'));
  if (ev.congelou && !repete('congelar')) dele.push(t('pve.ev.congelou', { n: ev.congelou }));
  if (ev.decapitou)     dele.push(t('pve.ev.decapitou'));
  if (ev.aguentouVorpal && !repete('vorpal')) dele.push(t('pve.ev.aguentou_vorpal'));
  if (ev.armaduraDobrou)meus.push(t('pve.ev.armadura_dobrou'));
  if (ev.vorpal)        meus.push(t('pve.ev.vorpal'));
  if (ev.roubando)      meus.push(t('pve.ev.roubando'));
  if (ev.roubou)        meus.push(t('pve.ev.roubou', { n: ev.roubou }));
  if (ev.bonusFD)       meus.push(t('pve.ev.bonus_fd', { n: ev.bonusFD }));
  if (ev.caiu)          dele.push(t('pve.ev.caiu', { nome: ev.alvo }));
  if (ev.matouAtacante) meus.push(t('pve.ev.caiu', { nome: ev.quem }));

  /* A linha inteira escreve-se já, mas as partes que ainda não
     aconteceram nascem com `cb-por-vir` e aparecem na sua vez.

     Escrevê-la já, e não aos pedaços, tem uma razão prática: a altura
     da linha fica reservada desde o início, e o registo não salta
     debaixo dos olhos de quem está a ler enquanto os efeitos entram. */
  const linha = _pveLog(`<b>${ev.quem}</b> · ${nome}${ev.pm ? ` (${ev.pm} PM)` : ''}` +
          (conta ? `<br><span class="cb-conta cb-por-vir">${conta}</span>` : '') +
          (testes ? `<div class="cb-testes cb-por-vir">${testes}</div>` : '') +
          (meus.length ? `<div class="cb-extras cb-por-vir">${meus.map(x => `<span>${x}</span>`).join('')}</div>` : '') +
          (dele.length ? `<div class="cb-extras no-alvo cb-por-vir">
              <span class="quem">→ ${ev.alvo}</span>
              ${dele.map(x => `<span>${x}</span>`).join('')}
            </div>` : ''),
          souEu ? 'good' : 'bad', ev.turno);

  const revelar = (ms, sel) => setTimeout(() => {
    if (linha) linha.querySelectorAll(sel).forEach(x => x.classList.remove('cb-por-vir'));
  }, ms);
  const temEfeitos = !!(testes || meus.length || dele.length);

  // ── 1ª BATIDA · quem age avança, e paga ──
  // Não havia nada aqui. O ataque via-se todo no cartão de QUEM O
  // LEVAVA, e por isso num turno com seis avatares não se percebia
  // quem tinha agido — só onde tinha doído.
  const cartaoQuem = (ev.quemIdx != null)
    ? document.getElementById((souEu ? 'cbLuteu' : 'cbLutini') + ev.quemIdx) : null;
  /* Uma magia de escudo mandava o cartão INVESTIR contra o inimigo —
     o gesto exactamente contrário ao que ela faz. Quem se protege
     recolhe e acende-se; quem cura, também. O que decide é o evento:
     se não há FA nem dano, não houve investida nenhuma. */
  const defendeSe = !ev.fa && !ev.rolagens &&
    (ev.barreira || ev.invulneravel || ev.curou || ev.bonusFD || ev.ocultou ||
     ev.subiu || ev.armaduraDobrou || ev.esquivaMais || ev.imune);
  if (cartaoQuem) {
    _pveGesto(cartaoQuem, defendeSe ? 'cb-defende'
                        : souEu ? 'cb-avanca-cima' : 'cb-avanca-baixo', 620);
    // O custo sai do cartão de quem lança, no momento em que lança. A
    // conta do PM aparecia só no fim do turno, e apenas para as magias
    // sustentadas — quem gastava 8 PM num golpe nunca via os 8 saírem.
    if (ev.pm) _pveNumeroPM(cartaoQuem, ev.pm);
  }

  // ── 2ª BATIDA · a conta rola ──
  if (conta) revelar(PVE_BATIDA.conta, '.cb-conta');

  // ── 3ª BATIDA · o alvo sai da frente, e acabou ──
  // Uma esquiva não tem impacto nem vida a cair. Fazê-la durar o mesmo
  // que um golpe que acerta era tempo parado a olhar para nada.
  if (ev.esquivou) {
    setTimeout(() => _pveGesto(cartaoAlvo, 'cb-esquiva', 620), PVE_BATIDA.esquiva);
    if (temEfeitos) revelar(PVE_BATIDA.vida, '.cb-testes, .cb-extras');
    setTimeout(_pveAtualizarBarras, PVE_BATIDA.vida);
    return 1000;
  }

  // ── 3ª BATIDA · o golpe chega ──
  // Só a magia tem elemento. Um soco é um soco, e as faíscas brancas
  // são o que o distingue de uma magia à vista.
  const elem  = (ev.magia || ev.vantagem) ? _pveElementoDe(ev) : null;
  const bate  = cartaoAlvo && ev.dano > 0;

  /* ── UM ATAQUE DE VÁRIAS ONDAS ANIMA VÁRIAS VEZES ──

     As magias de onda rolam uma FA por cada onda, cada uma contra a
     sua FD — o registo até as escreve uma a uma, "1ª ... 2ª ... 3ª".
     A animação mostrava UM impacto com o total somado por cima. Três
     ondas de 4 apareciam como uma pancada de 12, que é uma coisa
     completamente diferente de sentir três.

     As que não feriram também contam: uma onda esquivada ou aparada
     salta o impacto mas gasta o seu tempo, senão as que acertam
     colavam-se umas às outras e voltava tudo a parecer uma só. */
  const ondas = (ev.rolagens && ev.rolagens.length > 1) ? ev.rolagens : null;
  let extraOndas = 0;

  if (ondas && cartaoAlvo) {
    ondas.forEach((r, i) => {
      if (!(r.dano > 0)) return;
      setTimeout(() => {
        _pveNumeroFlutuante(cartaoAlvo, r.dano, r.criticoAtk);
        _pveGesto(cartaoAlvo, 'cb-bate', 520);
        _pveImpacto(cartaoAlvo, elem);
        if (r.criticoAtk) _pveOndaDeChoque(cartaoAlvo);
      }, PVE_BATIDA.golpe + i * PVE_BATIDA.onda);
    });
    extraOndas = (ondas.length - 1) * PVE_BATIDA.onda;
  } else if (bate) setTimeout(() => {
    _pveNumeroFlutuante(cartaoAlvo, ev.dano, ev.criticoAtk);
    _pveGesto(cartaoAlvo, 'cb-bate', 520);
    _pveImpacto(cartaoAlvo, elem);
    if (ev.criticoAtk) _pveOndaDeChoque(cartaoAlvo);
  }, PVE_BATIDA.golpe);

  /* ── O QUE VOLTA PARA QUEM AGIU ──

     Curar, roubar vida, devolver o golpe: tudo isto mexia na vida e
     não escrevia número nenhum. A barra crescia e o jogador ficava a
     adivinhar quanto — logo na cura, que é a jogada que se faz
     precisamente para ver um número.

     Sai do cartão de quem agiu, em verde e com sinal de mais, no
     mesmo instante do impacto: é a mesma troca vista dos dois lados. */
  const meuGanho = ev.curou || ev.roubou || 0;
  if (cartaoQuem && meuGanho) setTimeout(
    () => _pveNumeroFlutuante(cartaoQuem, meuGanho, false, 'cura'),
    PVE_BATIDA.golpe);

  /* O Reflexo Espelhado manda o golpe de volta a QUEM O DEU. Isso é
     dano em quem atacou — vermelho e com sinal de menos, no cartão
     dele. Estava com os ganhos, a sair em verde com um mais à frente:
     a dizer que levar o golpe de volta lhe tinha feito bem. */
  if (cartaoQuem && ev.devolveu) setTimeout(() => {
    _pveNumeroFlutuante(cartaoQuem, ev.devolveu, false);
    _pveGesto(cartaoQuem, 'cb-bate', 520);
  }, PVE_BATIDA.golpe + 160);

  // ── 4ª BATIDA · a vida cai ──
  // Depois do impacto, não com ele. O comentário antigo aqui já dizia
  // "as barras descem com atraso, para se ver quanto caiu" — mas não
  // havia atraso nenhum no código, e a barra descia no mesmo quadro em
  // que o número do dano nascia.
  const tVida = (bate || ondas || meuGanho || ev.devolveu) ? PVE_BATIDA.vida + extraOndas
                                            : PVE_BATIDA.conta;
  setTimeout(_pveAtualizarBarras, tVida);

  // ── 5ª BATIDA · o que ficou ──
  const tEfeitos = (bate || ondas) ? PVE_BATIDA.efeitos + extraOndas
                                   : PVE_BATIDA.esquiva;
  if (temEfeitos) revelar(tEfeitos, '.cb-testes, .cb-extras');

  // Uma magia que não bate em ninguém — erguer uma barreira, curar-se —
  // não precisa do tempo de um golpe que acerta.
  return (bate || ondas) ? PVE_BATIDA.fim + extraOndas
       : temEfeitos ? 900 : 660;
}

function _pveElementoDe(ev) {
  const e = _pveEstado;
  const c = (ev.lado === 'A') ? e.A[e.ativoA] : e.B[e.ativoB];
  return c ? c.elemento : null;
}

/* ── OS NÚMEROS QUE SOBEM ──

   Só o dano tinha número. Curar-se, roubar vida, devolver o golpe,
   regenerar — tudo isso mexia na vida e não escrevia nada em lado
   nenhum: a barra encolhia ou crescia e o jogador tinha de adivinhar
   quanto. A cura é o caso mais gritante, porque é a jogada que se
   faz precisamente para ver um número.

   O `tipo` dá a cor e o sinal. Um "+7" verde e um "−7" vermelho no
   mesmo sítio são a mesma informação com o sentido trocado, e é o
   sentido que decide se a jogada valeu a pena. */
function _pveNumeroFlutuante(alvo, n, critico, tipo) {
  if (!alvo || !n) return;
  const d = document.createElement('div');
  d.className = 'cb-dano' + (critico ? ' crit' : '') + (tipo ? ' ' + tipo : '');
  d.textContent = (tipo === 'cura' || tipo === 'roubo' ? '+' : '−') + n;
  alvo.appendChild(d);
  setTimeout(() => d.remove(), 1500);
}

// O PM sai igual ao dano, mas em azul e do outro lado do cartão — se
// saísse do mesmo sítio, o custo da magia e o golpe recebido escreviam-se
// um por cima do outro no mesmo turno.
function _pveNumeroPM(alvo, n) {
  if (!alvo || !n) return;
  const d = document.createElement('div');
  d.className = 'cb-pm-flut';
  d.textContent = '−' + n + ' PM';
  alvo.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

/* ═══ CADA ELEMENTO BATE À SUA MANEIRA ═══

   Antes era um efeito só, com a cor trocada: oito bolinhas a subir,
   fosse fogo, água, terra, vento ou sombra. A cor sozinha não chega —
   num cartão de 5rem, no meio de um tremor, o que se lê é o GESTO.

   O ELEM_CFG já dava o nome a cada um destes gestos desde sempre:
   chamas, gotas, pedras, espirais, sombras. Faltava fazê-los.

     chamas   sobem, poucas e vivas, e o cartão aquece
     gotas    espalham-se e CAEM, que é o que a água faz
     pedras   poucas, grandes e pesadas, e o baque é mais fundo
     espirais atravessam de lado, depressa, como um corte de ar
     sombras  não voam: fecham-se para dentro e o cartão escurece

   Sem elemento — o golpe físico — ficam faíscas brancas neutras, que
   é o que um soco deve parecer ao lado de uma magia. */
const PVE_GESTO_ELEM = {
  chamas:   { n: 10, tam: [2, 5], dx: 26, dy: [-52, -18], sobe: true,  cai: false },
  gotas:    { n: 12, tam: [2, 4], dx: 46, dy: [10, 46],   sobe: false, cai: true  },
  pedras:   { n: 6,  tam: [4, 8], dx: 34, dy: [6, 40],    sobe: false, cai: true  },
  espirais: { n: 9,  tam: [1, 3], dx: 78, dy: [-12, 12],  sobe: false, cai: false, risca: true },
  sombras:  { n: 10, tam: [3, 6], dx: 30, dy: [-16, 16],  sobe: false, cai: false, dentro: true },
  neutro:   { n: 8,  tam: [2, 4], dx: 30, dy: [-40, -14], sobe: true,  cai: false },
};

function _pveImpacto(alvo, elemento) {
  if (!alvo) return;
  const cfg  = elemento ? ELEM_CFG[elemento] : null;
  const cor  = cfg ? cfg.corBrilho : '#fff';
  const modo = (cfg && PVE_GESTO_ELEM[cfg.particulas]) || PVE_GESTO_ELEM.neutro;
  const nome = (cfg && cfg.particulas) || 'neutro';

  // O clarão dá ao cartão inteiro a cor de quem bateu. É o que se vê
  // primeiro, antes de qualquer partícula: um golpe de sombra escurece,
  // um de fogo aquece.
  const luz = document.createElement('div');
  luz.className = 'cb-luz cb-luz-' + nome;
  luz.style.setProperty('--cor', cor);
  alvo.appendChild(luz);
  setTimeout(() => luz.remove(), 620);

  const entre = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < modo.n; i++) {
    const p = document.createElement('div');
    const sz = entre(modo.tam[0], modo.tam[1]);
    // As sombras vêm de fora e fecham-se para dentro: nascem na
    // periferia e o destino é o meio, ao contrário de todas as outras.
    const x = modo.dentro ? (Math.random() < .5 ? entre(2, 18) : entre(82, 98)) : entre(28, 72);
    const y = modo.dentro ? entre(10, 90) : entre(28, 72);
    const dx = modo.dentro ? (50 - x) * 0.6 : entre(-modo.dx / 2, modo.dx / 2);
    const dy = modo.dentro ? (50 - y) * 0.4 : entre(modo.dy[0], modo.dy[1]);
    p.className = 'cb-particula cb-p-' + nome;
    p.style.cssText =
      `width:${(modo.risca ? sz * 6 : sz) / 16}rem;height:${sz / 16}rem;background:${cor};` +
      `box-shadow:0 0 ${(sz * 2) / 16}rem ${cor};left:${x}%;top:${y}%;` +
      `--dx:${dx / 16}rem;--dy:${dy / 16}rem;` +
      `animation-delay:${Math.random() * (modo.risca ? .06 : .14)}s;`;
    alvo.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// O nome antigo continua a servir: havia chamadas espalhadas e não vale
// a pena parti-las todas por causa de uma palavra.
function _pveParticulas(alvo, elemento) { _pveImpacto(alvo, elemento); }

function _pveOndaDeChoque(alvo) {
  const o = document.createElement('div');
  o.className = 'cb-onda';
  alvo.appendChild(o);
  setTimeout(() => o.remove(), 700);
}

// As barras descem com atraso, para se ver quanto caiu
function _pveAtualizarBarras() {
  const e = _pveEstado; if (!e) return;
  // Todos os seis, não só os dois em campo: o veneno e a cura perpétua
  // mexem na vida de quem está no banco também.
  const par = [...e.A.map((c, i) => [c, 'cbLuteu' + i]),
               ...e.B.map((c, i) => [c, 'cbLutini' + i])];
  for (const [c, id] of par) {
    const el = document.getElementById(id); if (!el || !c) continue;
    const pv = el.querySelector('.cb-bolas.pv');
    const pm = el.querySelector('.cb-bolas.pm');
    if (pv) pv.innerHTML = _pveBolinhas(c.pv, c.pvMax, 'pv') + `<b>${c.pv}</b>`;
    if (pm) pm.innerHTML = _pveBolinhas(c.pm, c.pmMax, 'pm') + `<b>${c.pm}</b>`;
  }
}

function _pveTextoFim() {
  const r = combate3dtResultado(_pveEstado);
  return r.vencedor === 'A' ? t('pve.venceu') : r.vencedor === 'B' ? t('pve.perdeu') : t('pve.empate');
}

// ═══════════════════════════════════════════════════════════════════
// O registo — guarda tudo, e é aqui que se vê o motor a funcionar
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// O REGISTO
//
// Agrupado por turno, e o turno mais recente fica EM CIMA — quem lê quer
// saber o que acabou de acontecer, não desenrolar o combate desde o
// princípio. Dentro do turno a ordem é a natural: quem agiu primeiro
// aparece primeiro, senão a troca de golpes lia-se ao contrário.
// ═══════════════════════════════════════════════════════════════════
/* A CONTA ABERTA.

   "FA 11★ − FD 4 = 7" diz o resultado e esconde tudo o resto. Quem lê
   não sabe se os 11 vieram de uma Habilidade alta, de uma Força alta
   ou de um seis no dado — e num jogo onde a ficha é a única coisa que
   o jogador controla, é essa a pergunta que interessa.

   Isto escreve as parcelas que o motor passou a devolver. O dado leva
   classe própria porque é a única parcela que não depende de nada que
   o jogador tenha feito: é o que separa a sorte da ficha. */
function _pveConta(rot, partes, total, critico) {
  if (!partes || !partes.length) return '';
  const corpo = partes.map((p, i) => {
    const sinal = i === 0 ? '' : (p.v < 0 ? ' − ' : ' + ');
    const val   = Math.abs(p.v);
    return p.dado
      ? sinal + '<b class="cb-dado">🎲' + val + '</b>'
      : sinal + '<span class="cb-parcela">' + esc(p.r) + '<i>' + val + '</i>'
              + (p.x2 ? '<sup>×2</sup>' : '') + '</span>';
  }).join('');
  return '<span class="cb-conta-linha">' + rot + ' = ' + corpo
       + ' = <b>' + total + '</b>' + (critico ? ' <span class="cb-crit">crítico</span>' : '')
       + '</span>';
}
function _pveBlocoDoTurno(n) {
  const el = document.getElementById('cbLog'); if (!el) return null;
  const id = 'cbTurnoBloco' + n;
  let bloco = document.getElementById(id);
  if (!bloco) {
    bloco = document.createElement('div');
    bloco.className = 'cb-turno-bloco';
    bloco.id = id;
    /* O cabeçalho abre e fecha o turno.

       Num registo que corre depressa, o que aconteceu num turno é uma
       linha entre muitas e lê-se em letra pequena. Um toque no
       cabeçalho amplia SÓ aquele turno e abre as contas — os outros
       ficam como estavam, que é o ponto: se ampliasse tudo, não havia
       ampliação nenhuma, só um registo maior. */
    bloco.innerHTML = `<button class="cb-turno-cab" onclick="_pveAbrirTurno(${n})"
            aria-expanded="false">${t('pve.turno', { n })}</button>`;
    el.insertBefore(bloco, el.firstChild);     // o mais recente à cabeça
    el.scrollTop = 0;
  }
  return bloco;
}

/* Abre um turno, e fecha o que estava aberto.

   Um de cada vez de propósito: com dois abertos volta-se ao problema
   de origem, que é ter tudo do mesmo tamanho e não saber onde olhar.
   E rola-se para ele, senão ampliar um turno que está fora da vista
   parece não ter feito nada. */
function _pveAbrirTurno(n) {
  const bloco = document.getElementById('cbTurnoBloco' + n);
  if (!bloco) return;
  const abrir = !bloco.classList.contains('cb-turno-aberto');
  document.querySelectorAll('.cb-turno-bloco.cb-turno-aberto').forEach(b => {
    b.classList.remove('cb-turno-aberto');
    const c = b.querySelector('.cb-turno-cab'); if (c) c.setAttribute('aria-expanded', 'false');
  });
  if (abrir) {
    bloco.classList.add('cb-turno-aberto');
    const c = bloco.querySelector('.cb-turno-cab'); if (c) c.setAttribute('aria-expanded', 'true');
    bloco.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function _pveLog(html, tipo, turno) {
  const el = document.getElementById('cbLog'); if (!el) return;
  const d = document.createElement('div');
  d.className = 'cb-log-linha ' + (tipo || '');
  d.innerHTML = html;
  const bloco = (turno != null) ? _pveBlocoDoTurno(turno) : null;
  if (bloco) bloco.appendChild(d);             // dentro do turno, ordem natural
  else { el.insertBefore(d, el.firstChild); }
  el.scrollTop = 0;
  // Devolve a linha: quem a escreveu pode precisar de a revelar por
  // partes, em vez de a despejar toda de uma vez.
  return d;
}
