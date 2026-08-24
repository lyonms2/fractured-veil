// ═══════════════════════════════════════════════════════════════════
// BATALHA PvE
//
// A primeira interface do combate. O objectivo desta versão é VER O
// MOTOR A FUNCIONAR: cada conta aparece no ecrã (FA, FD, o dado, a
// subtracção), cada vantagem que dispara é anunciada, e o registo por
// baixo guarda tudo. Os efeitos são os que o jogo já tinha — partículas,
// anéis, tremor, números flutuantes.
//
// Toda a lógica vive em js/combate-3dt.js. Aqui só se desenha e se
// recolhe a decisão do jogador.
// ═══════════════════════════════════════════════════════════════════

// ── O QUE A BATALHA CUSTA E O QUE RENDE ──
// Custa energia a cada um dos três, não só ao que está activo: os três
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
// O avatar activo tem a energia nas variáveis vivas (vitals); os outros
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
// Mesma história da energia: o activo tem-nos nas variáveis vivas, os
// outros no seu slot. Lutaram os três, ganham os três — e cada um sobe
// de nível com o seu próprio XP.
//
// As moedas ficam de fora de propósito: são do jogador, não do avatar,
// e por isso são pagas uma vez só.
// ═══════════════════════════════════════════════════════════════════
function _pvePremiarAvatar(idx, xpGanho, vinculoGanho) {
  // O activo passa pelos caminhos normais do jogo — o checkXP trata da
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

  // Os do banco sobem em silêncio: não há avatar no ecrã para festejar,
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

// Pegar uma doença. Mesmo encaminhamento da energia e do XP: o activo
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
    // Mas se a acção vier vazia — um turno que corra sem escolha, por um
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
        <button class="ajuda" onclick="_pveAlternarAjuda()"
                title="${t('pve.ajuda.titulo', { nome: '' })}">?</button>
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
// Uma bolinha por cada 5 pontos, que é exactamente o que a Resistência
// vale: PV = R×5 e PM = R×5. Portanto o NÚMERO DE BOLINHAS É A
// RESISTÊNCIA do avatar — lê-se a ficha só de olhar para o cartão.
//
// A bolinha da vez enche-se por fracção, para um golpe de 3 num avatar
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
  if (c.armaduraDobrada)m('A×2', 'escudo');
  if (c.vorpal)         m('✦', 'escudo');
  if (c.roubando)       m('🩸', 'veneno');
  if (c.bonusA)         m(`A+${c.bonusA}`, 'escudo');
  if (c.bonusF)         m(`F+${c.bonusF}`, 'buff');
  if (c.bonusFD)        m(`FD+${c.bonusFD}`, 'escudo');
  if (c.bonusEsquiva)   m(`${t('pve.marca.esquiva')}+${c.bonusEsquiva}`, 'escudo');
  if (c.cegoAtaque)     m(t('pve.marca.cego'), 'veneno');
  if (c.penalidade)     m(`${t('pve.marca.tudo')}−${c.penalidade}`, 'veneno');
  if (c.penalidadeR)    m(`R−${c.penalidadeR}`, 'veneno');
  if (c.indefesoTurnos > 1) m(t('pve.marca.preso'), 'indefeso');

  return `<div class="${cls}" id="cbLut${lado}${i}">
    <div class="cb-lutador-svg">${gerarSVG(c.elemento, c.ficha.raridade, c.ficha.seed, tam, tam, _pveFase(c))}</div>
    <div class="cb-lutador-nome">${el ? el.emoji : '✦'} ${c.nome}</div>
    <div class="cb-lutador-carac">F${_c3(c,'F')} H${_c3(c,'H')} R${_c3(c,'R')} A${_c3(c,'A')}</div>
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
}

// ═══════════════════════════════════════════════════════════════════
// O QUE FAZ CADA MAGIA
//
// Um painel que se abre por cima da batalha e explica, do avatar em
// campo: o golpe comum, as três magias e a vantagem com que nasceu.
//
// Existe porque a barra de acções só tem espaço para o nome e o custo, e
// isso não chega a quem está a começar — "Ferrões Salinos, 3 PM" não diz
// que envenena. Aqui cabe a descrição inteira, a conta da Força de
// Ataque e o que a magia faz para além do dano.
// ═══════════════════════════════════════════════════════════════════
function _pveAlternarAjuda() {
  const el = document.getElementById('cbAjuda'); if (!el) return;
  const abrir = !el.classList.contains('aberta');
  if (abrir) el.innerHTML = _pveAjudaHTML();
  el.classList.toggle('aberta', abrir);
}

// A conta da Força de Ataque, em texto legível
function _pveFormula(g, eu) {
  if (!g || !g.fa) return null;
  const f = g.fa, p = [];
  if (f.H) p.push(`H${_c3(eu, 'H')}`);
  if (f.F) p.push(`F${_c3(eu, 'F')}`);
  if (f.fixo) p.push(String(f.fixo));
  const d = f.dados || 0;
  if (d) p.push(`${d}d`); else p.push('1d');
  let s = 'FA ' + p.join(' + ');
  if (f.dadosPorPM) s += ` (+${f.dadosPorPM === 0.5 ? '1d por 2' : f.dadosPorPM + 'd por'} PM)`;
  if (f.fixoPorPM)  s += ` (+${f.fixoPorPM} por PM)`;
  return s;
}

function _pveAjudaHTML() {
  return `<div class="cb-ajuda-cab">
      <span>${t('pve.ajuda.titulo2')}</span>
      <button onclick="_pveAlternarAjuda()">✕</button>
    </div>
    <div class="cb-ajuda-lista">
      ${_pveAjudaDe(_pveEstado.A[_pveEstado.ativoA], 'eu')}
      ${_pveAjudaDe(_pveEstado.B[_pveEstado.ativoB], 'ini')}
    </div>`;
}

// Um lado do painel. O inimigo mostra o mesmo que o jogador — saber o
// que ele sabe fazer é metade da decisão, e antes só se descobria
// levando com a magia na cara.
function _pveAjudaDe(eu, lado) {
  if (!eu) return '';
  const tecto = _c3(eu, 'H') * 5;
  const el = CARACTERISTICAS_ELEMENTAIS[eu.elemento];

  const linha = (rot, nome, custo, desc, extra, trancada) => `
    <div class="cb-ajuda-item${trancada ? ' trancada' : ''}">
      <div class="cb-ajuda-top">
        <span class="cb-ajuda-papel">${rot}</span>
        <span class="cb-ajuda-nome">${nome}</span>
        <span class="cb-ajuda-custo">${custo}</span>
      </div>
      <div class="cb-ajuda-desc">${desc}</div>
      ${extra ? `<div class="cb-ajuda-conta">${extra}</div>` : ''}
    </div>`;

  let html = linha(t('pve.ajuda.golpe'), t('pve.acao.comum'), t('mag.custo.livre'),
                   t('pve.ajuda.golpe_desc'),
                   `FA H${_c3(eu,'H')} + F${_c3(eu,'F')} + 1d`, false);

  for (const cat of ['ataque', 'forte', 'defesa']) {
    const g = eu.magias[cat]; if (!g) continue;
    const trancada = g.pm > tecto;
    const custo = trancada ? t('mag.tecto', { h: Math.ceil(g.pm / 5) })
      : g.pm === 0 ? t('mag.custo.livre')
      : g.pmMax ? t('mag.custo.faixa', { min: g.pm, max: g.pmMax })
      : g.porTurno ? t('mag.custo.turno', { pm: g.pm })
      : t('mag.custo', { pm: g.pm });
    html += linha(t('mag.cat.' + cat), t('mag.' + g.id + '.nome'), custo,
                  t('mag.' + g.id + '.desc'), _pveFormula(g, eu), trancada);
  }

  const v = eu.vant;
  if (v) html += linha(t('vd.vantagem'), t('vd.' + v.id + '.nome').replace('{elem}', v.elemento || ''),
                       v.pm ? t('mag.custo', { pm: v.pm }) : '',
                       t('vd.' + v.id + '.desc').replace(/\{elem\}/g, v.elemento || ''), null, false);
  const d = eu.desv;
  if (d) html += linha(t('vd.desvantagem'), t('vd.' + d.id + '.nome').replace('{elem}', d.elemento || ''),
                       '', t('vd.' + d.id + '.desc').replace(/\{elem\}/g, d.elemento || ''), null, false);

  return `<div class="cb-ajuda-lado ${lado}">
    <div class="cb-ajuda-quem">
      ${el ? el.emoji : '✦'} ${eu.nome}
      <span>F${_c3(eu,'F')} H${_c3(eu,'H')} R${_c3(eu,'R')} A${_c3(eu,'A')} · ${t('ficha.tecto')} ${tecto} PM</span>
    </div>
    ${html}
  </div>`;
}

// ── A barra de acções ──
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
              : g.pmMax  ? t('mag.custo.faixa', { min: custo, max: Math.min(g.pmMax, eu.pm, tecto) })
              : t('mag.custo', { pm: custo });
    html += btn(`_pveEscolher('${cat}')`, t('mag.' + g.id + '.nome'), sub,
                podeH && podePM && !trancada);
  }

  // Vantagem que gasta a acção
  const v = eu.vant;
  if (v && (v.curaTudo || v.subirCarac || v.paralisa)) {
    const on = eu.pm >= v.pm;
    html += btn(`_pveEscolher('vantagem')`,
                t('vd.' + v.id + '.nome').replace('{elem}', v.elemento || ''),
                on ? t('mag.custo', { pm: v.pm }) : t('pve.sem_pm', { pm: v.pm }), on, 'vant');
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
// resto do ecrã, mostrar a conta em vez de pedir fé.
// ═══════════════════════════════════════════════════════════════════
function _pveEscolherPM(tipo, g, max) {
  const eu = _pveEstado.A[_pveEstado.ativoA];
  const alvo = document.getElementById('cbAcoes');
  // Só os degraus que rendem mesmo alguma coisa a mais. Numa magia que
  // ganha 1d a cada 2 PMs, gastar 4 em vez de 2 dá exactamente o mesmo —
  // e oferecer essa opção é oferecer uma armadilha.
  const rende = pm => {
    const v = (typeof valorDaMagia === 'function') ? valorDaMagia(g, eu.ficha, pm) : null;
    // O "|| 1" é a regra do motor: uma magia sem dados próprios rola na
    // mesma o dado do ataque. Sem isto, 2 e 4 PMs pareciam diferentes na
    // conta e davam exactamente o mesmo em jogo.
    return v ? v.caracs + '|' + (v.dados || 1) : String(pm);
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
    const conta = v ? `FA ${v.caracs}${v.dados ? ' + ' + v.dados + 'd' : ' + 1d'}` : '';
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
// o que está no ecrã é a repetição — e aceitar outra jogada aqui seria
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
// Cobra energia aos TRÊS, não só ao que está activo: lutaram os três.
// Paga XP, moedas e vínculo pelo mesmo cano dos minijogos (miniReward),
// para a dificuldade, o bónus de raridade e o multiplicador de vínculo
// se aplicarem aqui exactamente como se aplicam lá.
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
  idx.forEach(i => _pveGastarEnergia(i, custo));

  // ── A fratura ──
  // Vale para quem caiu, tenha a batalha acabado como acabou. Quem
  // desiste protege os que ainda estão de pé, não os que já caíram.
  const fraturados = [];
  e.A.forEach((c, n) => {
    if (c.vivo || idx[n] == null) return;
    if (Math.random() >= PVE_FRATURA_CHANCE) return;
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
function _pveAnimar(eventos) {
  _pveAnim = true;
  // O clique já era ignorado enquanto a animação corria, mas os botões
  // continuavam com ar de clicáveis — carregar e não acontecer nada
  // parece avaria. Agora apagam-se e deixam de receber o rato.
  _pveTravarAcoes(true);
  // ── O RITMO ──
  // Nem tudo merece o mesmo tempo. Um golpe precisa de respirar: há um
  // número a subir, o cartão a tremer, partículas. Já o veneno a tirar
  // 1 de vida ou uma magia a cobrar PM é escrituração — e são até seis
  // por turno, um por avatar. A 850ms cada, um turno passava a demorar
  // sete segundos e ninguém esperaria por isso.
  const TEMPO = ev => ev.fimDeTurno ? 220
                    : ev.entrada    ? 420
                    : ev.troca      ? 500
                    : ev.suporte    ? 600
                    : 850;
  let atraso = 0;
  for (const ev of eventos) {
    setTimeout(() => _pveMostrarEvento(ev), atraso);
    atraso += TEMPO(ev);
  }
  setTimeout(() => {
    _pveAnim = false;
    _pveTravarAcoes(false);
    if (_pveEstado.acabou) _pveFecharContas();
    _pveDesenhar();
    if (_pveEstado.acabou) _pveLog(_pveTextoFim(), 'info');
  }, atraso + 150);
}

function _pveMostrarEvento(ev) {
  const souEu   = ev.lado === 'A';
  // O cartão em que o golpe caiu, pelo ÍNDICE do evento. Usar o activo
  // do momento estava errado desde que o avanço passou para o fim do
  // turno: a animação ia para o inimigo seguinte enquanto o dano tinha
  // sido no anterior.
  const cartaoAlvo = (ev.alvoIdx != null)
    ? document.getElementById((souEu ? 'cbLutini' : 'cbLuteu') + ev.alvoIdx)
    : null;

  if (ev.apanhouFoco) {
    _pveLog(t('pve.log.apanhou_foco', { quem: ev.quem }), souEu ? 'good' : 'warn', ev.turno);
    _pveDesenhar();
    return;
  }

  // O que o fim do turno cobra: veneno, cura perpétua, sustentadas.
  // Mexia nos números sem dizer nada, e por isso o veneno parecia não
  // funcionar — funcionava, só não se via.
  if (ev.fimDeTurno) {
    const its = [];
    if (ev.sangrou)  its.push(t('pve.fim.sangrou', { n: ev.sangrou }));
    if (ev.regenerou)its.push(t('pve.fim.regenerou', { n: ev.regenerou }));
    if (ev.sustentouPor)     its.push(t('pve.fim.sustentou', { n: ev.sustentouPor }));
    if (ev.sustentadasCairam)its.push(t('pve.fim.caiu_sustentada'));
    if (ev.destravou)its.push(t('pve.fim.destravou'));
    if (ev.caiu)     its.push(t('pve.ev.caiu', { nome: ev.quem }));
    if (!its.length) return;
    _pveLog(`<b>${ev.quem}</b>` +
            `<div class="cb-extras">${its.map(x => `<span>${x}</span>`).join('')}</div>`,
            souEu ? 'good' : 'bad', ev.turno);
    _pveAtualizarBarras();
    return;
  }

  // O roubo de vida acontece no fim do turno, sem ataque nenhum
  if (ev.roubou != null && ev.fa == null) {
    _pveLog(`<b>${ev.quem}</b> · ${t('vd.sangue_por_magia.nome') && ''}${t('mag.so_a3.nome')}` +
            `<div class="cb-extras"><span>${t('pve.ev.roubou', { n: ev.roubou })}</span>` +
            (ev.caiu ? `<span>${t('pve.ev.caiu', { nome: ev.alvo })}</span>` : '') + `</div>`,
            souEu ? 'good' : 'bad', ev.turno);
    _pveAtualizarBarras();
    return;
  }

  if (ev.entrada) {
    _pveLog(t('pve.log.entra', { nome: ev.quem }), souEu ? 'good' : 'warn', ev.turno);
    _pveDesenhar();
    return;
  }

  if (ev.troca) {
    const tst = (ev.testes || [])[0];
    const conta = tst
      ? `<div class="cb-testes"><span class="cb-teste ${tst.passou ? 'passou' : 'falhou'}">
           <b>${t('pve.teste.troca')}</b> ${tst.partes.join(' ')} = ${tst.valor} · 1d[<i>${tst.dado}</i>]
           → ${tst.passou ? t('pve.teste.passou') : t('pve.teste.falhou')}</span></div>`
      : ev.semRolagem
      ? `<div class="cb-testes"><span class="cb-teste falhou">
           <b>${t('pve.teste.troca')}</b> ${ev.semRolagem.join(' ')} → ${t('pve.teste.sem_rolagem')}</span></div>`
      : '';
    _pveLog(t('pve.log.troca', { quem: ev.quem, entra: ev.troca }) + ' — ' +
            (ev.limpa ? t('pve.log.troca_limpa') : t('pve.log.troca_pressa')) + conta,
            ev.limpa ? 'good' : 'warn', ev.turno);
    _pveDesenhar();
    return;
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
  const testes = (ev.testes || []).map(x => {
    // Com uma parcela só, ela já diz tudo ("H5"); somar "= 5" seria ruído.
    const soma = x.partes.length > 1 ? `${x.partes.join(' ')} = ${x.valor}` : x.partes[0];
    const res = x.passou ? t('pve.teste.passou') : t('pve.teste.falhou');
    return `<span class="cb-teste ${x.passou ? 'passou' : 'falhou'}">
        <b>${t('pve.teste.' + x.rotulo)}</b> ${soma} · 1d[<i>${x.dado}</i>] → ${res}
        ${x.seis ? `<em>${t('pve.teste.seis')}</em>` : ''}
      </span>`;
  }).join('');

  const extras = [];
  if (ev.reflexo)    extras.push(t('pve.ev.reflexo'));
  if (ev.devolveu)   extras.push(t('pve.ev.devolveu', { n: ev.devolveu }));
  if (ev.envenenou)  extras.push(t('pve.ev.envenenou'));
  if (ev.enfraqueceu)extras.push(t('pve.ev.enfraqueceu'));
  if (ev.enfureceu)  extras.push(t('pve.ev.enfureceu'));
  if (ev.paralisou)  extras.push(t('pve.ev.paralisou'));
  if (ev.resistiu)   extras.push(t('pve.ev.resistiu'));
  if (ev.fora)       extras.push(t('pve.ev.fora'));
  if (ev.curou)      extras.push(t('pve.ev.curou'));
  if (ev.subiu)      extras.push(t('pve.ev.subiu', { c: ev.subiu }));
  if (ev.invulneravel)  extras.push(t('pve.ev.invulneravel'));
  if (ev.barreira)      extras.push(t('pve.ev.barreira', { n: ev.barreira }));
  if (ev.imune)         extras.push(t('pve.ev.imune'));
  if (ev.imunizou)      extras.push(t('pve.ev.imunizou'));
  if (ev.ocultou)       extras.push(t('pve.ev.ocultou'));
  if (ev.esquivaMais)   extras.push(t('pve.ev.esquiva_mais', { n: ev.esquivaMais }));
  if (ev.drenou)        extras.push(t('pve.ev.drenou', { n: ev.drenou }));
  if (ev.absorveuTudo)  extras.push(t('pve.ev.absorveu'));
  if (ev.barreiraComeu) extras.push(t('pve.ev.barreira_comeu', { n: ev.barreiraComeu }));
  if (ev.barreiraCaiu)  extras.push(t('pve.ev.barreira_caiu'));
  if (ev.pagouComSangue) extras.push(t('pve.ev.sangue', { n: ev.pagouComSangue }));
  if (ev.perdeuFoco)     extras.push(t('pve.ev.perdeu_foco'));
  if (ev.caiuSozinho)    extras.push(t('pve.ev.caiu_sozinho'));
  if (ev.semDano)       extras.push(t('pve.ev.sem_dano'));
  if (ev.resistiuVeneno)extras.push(t('pve.ev.resistiu_veneno'));
  if (ev.semPMparaRoubar) extras.push(t('pve.ev.sem_pm_roubar'));
  if (ev.cegou)         extras.push(t('pve.ev.cegou'));
  if (ev.congelouUmTurno) extras.push(t('pve.ev.congelou'));
  if (ev.decapitou)     extras.push(t('pve.ev.decapitou'));
  if (ev.aguentouVorpal)extras.push(t('pve.ev.aguentou_vorpal'));
  if (ev.armaduraDobrou)extras.push(t('pve.ev.armadura_dobrou'));
  if (ev.vorpal)        extras.push(t('pve.ev.vorpal'));
  if (ev.roubando)      extras.push(t('pve.ev.roubando'));
  if (ev.roubou)        extras.push(t('pve.ev.roubou', { n: ev.roubou }));
  if (ev.bonusFD)       extras.push(t('pve.ev.bonus_fd', { n: ev.bonusFD }));
  if (ev.caiu)       extras.push(t('pve.ev.caiu', { nome: ev.alvo }));
  if (ev.matouAtacante) extras.push(t('pve.ev.caiu', { nome: ev.quem }));

  _pveLog(`<b>${ev.quem}</b> · ${nome}${ev.pm ? ` (${ev.pm} PM)` : ''}` +
          (conta ? `<br><span class="cb-conta">${conta}</span>` : '') +
          (testes ? `<div class="cb-testes">${testes}</div>` : '') +
          (extras.length ? `<div class="cb-extras">${extras.map(x => `<span>${x}</span>`).join('')}</div>` : ''),
          souEu ? 'good' : 'bad', ev.turno);

  // Efeitos, reaproveitando os que já existiam
  if (cartaoAlvo && ev.dano > 0) {
    _pveNumeroFlutuante(cartaoAlvo, ev.dano, ev.criticoAtk);
    cartaoAlvo.classList.remove('cb-bate'); void cartaoAlvo.offsetWidth;
    cartaoAlvo.classList.add('cb-bate');
    _pveParticulas(cartaoAlvo, ev.magia ? _pveElementoDe(ev) : null);
    if (ev.criticoAtk) _pveOndaDeChoque(cartaoAlvo);
  }
  _pveAtualizarBarras();
}

function _pveElementoDe(ev) {
  const e = _pveEstado;
  const c = (ev.lado === 'A') ? e.A[e.ativoA] : e.B[e.ativoB];
  return c ? c.elemento : null;
}

// Números que sobem — usa o float-up que já existia no jogo
function _pveNumeroFlutuante(alvo, n, critico) {
  const d = document.createElement('div');
  d.className = 'cb-dano' + (critico ? ' crit' : '');
  d.textContent = '−' + n;
  alvo.appendChild(d);
  setTimeout(() => d.remove(), 900);
}

// Partículas da cor do elemento — o ELEM_CFG já as tinha
function _pveParticulas(alvo, elemento) {
  const cfg = elemento ? ELEM_CFG[elemento] : null;
  const cor = cfg ? cfg.corBrilho : '#fff';
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    const sz = 2 + Math.random() * 4;
    p.className = 'cb-particula';
    p.style.cssText = `width:${sz}px;height:${sz}px;background:${cor};` +
      `box-shadow:0 0 ${sz * 2}px ${cor};left:${30 + Math.random() * 40}%;` +
      `top:${30 + Math.random() * 40}%;--dx:${(Math.random() - .5) * 60}px;` +
      `--dy:${-20 - Math.random() * 40}px;animation-delay:${Math.random() * .1}s;`;
    alvo.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

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
function _pveBlocoDoTurno(n) {
  const el = document.getElementById('cbLog'); if (!el) return null;
  const id = 'cbTurnoBloco' + n;
  let bloco = document.getElementById(id);
  if (!bloco) {
    bloco = document.createElement('div');
    bloco.className = 'cb-turno-bloco';
    bloco.id = id;
    bloco.innerHTML = `<div class="cb-turno-cab">${t('pve.turno', { n })}</div>`;
    el.insertBefore(bloco, el.firstChild);     // o mais recente à cabeça
    el.scrollTop = 0;
  }
  return bloco;
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
}
