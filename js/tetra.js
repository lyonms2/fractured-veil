// ═══════════════════════════════════════════════════════════════════
// TETRA ELEMENTAL — peças de quatro blocos caindo num poço de 10×20
//
// O jogo de encaixar peças que caem, com a cara do resto: cada peça tem
// a cor de um elemento, o avatar assiste na faixa de cima e reage, o
// prêmio é humor, XP e moedas, e há ranking por dificuldade, igual ao
// do Snake e da Fusão.
//
// O que ele tem dos jogos do gênero: o saco de sete (todas as peças
// saem uma vez antes de repetir), a sombra de onde a peça vai cair, a
// peça guardada, as três próximas, e um tempo de encaixe antes de a
// peça travar no chão.
//
// Depende de: miniDifficulty(), miniReward(), applyGameCost(),
//             mgComHumor(), showBubble(), playSound(), vitals, t()
// ═══════════════════════════════════════════════════════════════════

const TET_COLS    = 10;
const TET_LINHAS  = 20;
const TET_LATERAL = 5.5;   // colunas extras à direita: guardada e próximas
const TET_FILA    = 3;     // quantas próximas se mostram

/* As sete peças. Cada uma vive numa caixa N×N, e girar é girar a caixa:
   (x, y) → (N-1-y, x). As cores são as dos elementos, e as vizinhas na
   tela ficam bem distintas entre si. */
const TET_PECAS = {
  I: { n: 4, cel: [[0,1],[1,1],[2,1],[3,1]], cor: '#22b8d6', brilho: '#b9f1fb' },   // gelo
  O: { n: 2, cel: [[0,0],[1,0],[0,1],[1,1]], cor: '#e0b12c', brilho: '#fbeaa6' },   // raio
  T: { n: 3, cel: [[1,0],[0,1],[1,1],[2,1]], cor: '#9d5ce0', brilho: '#dcc4fa' },   // veneno
  S: { n: 3, cel: [[1,0],[2,0],[0,1],[1,1]], cor: '#4fa35c', brilho: '#b8e6be' },   // terra
  Z: { n: 3, cel: [[0,0],[1,0],[1,1],[2,1]], cor: '#d2493f', brilho: '#f6b4ad' },   // fogo
  J: { n: 3, cel: [[0,0],[0,1],[1,1],[2,1]], cor: '#4f6ee8', brilho: '#c3cffb' },   // ar
  L: { n: 3, cel: [[2,0],[0,1],[1,1],[2,1]], cor: '#ec8a34', brilho: '#fbd2a8' },   // luz
};
const TET_TIPOS = Object.keys(TET_PECAS);

/* Quando a peça não cabe depois de girar, tenta-se empurrá-la um pouco
   para o lado ou para cima. Sem isto não se gira encostado na parede. */
const TET_CHUTES = [[0,0],[-1,0],[1,0],[0,-1],[-1,-1],[1,-1],[-2,0],[2,0]];

/* A velocidade: quantos milissegundos a peça leva para descer uma linha
   no nível 1, por dificuldade. Cada nível (dez linhas) corta 18%. */
const TET_BASE      = [800, 650, 520, 420];
const TET_VEL_MIN   = 55;
const TET_TRAVA_MS  = 500;   // tempo no chão antes de travar
const TET_TRAVA_MAX = 15;    // quantas vezes mexer adia a trava
const TET_LIMPA_MS  = 200;   // o clarão das linhas completas
const TET_DAS       = 160;   // segurar a seta: espera antes de repetir
const TET_ARR       = 45;    //   e depois, de quanto em quanto repete

// A meta de linhas de uma partida cheia, por dificuldade.
const TET_ALVO = [20, 24, 28, 32];
const TET_PONTOS_LINHAS = [0, 100, 300, 500, 800];

// ── Estado ─────────────────────────────────────────────────────────
let _tetGrade    = [];     // [linha][coluna] = tipo, ou null
let _tetPeca     = null;   // { tipo, cel, x, y }
let _tetSaco     = [];
let _tetFila     = [];
let _tetGuardada = null;
let _tetPodeGuardar = true;
let _tetPontos   = 0;
let _tetLinhas   = 0;
let _tetNivel    = 1;
let _tetTier     = 0;
let _tetRodando  = false;
let _tetAcabou   = false;
let _tetQueda    = 0;      // ms acumulados para a próxima descida
let _tetNoChaoDesde = null;
let _tetAdiamentos  = 0;
let _tetLimpando = null;   // { linhas: [..], desde }
let _tetMover    = null;   // { dir, desde, ultimo } — a seta segurada
let _tetSuave    = false;  // descida rápida segurada
let _tetUltimo   = 0;
let _tetCel      = 20;     // o tamanho de um bloco, em px
let _tetFaiscas  = [];
let _tetPerigo   = false;
let _tetRankAberto = false;
let _tetReagiuEm = 0;
let _tetPausa    = false;  // a pausa do próprio Tetra (o botão ⏸ da lateral)
let _tetBotaoPausa = null; // onde o botão foi desenhado: { x, y, w, h }

// ── Iniciar ────────────────────────────────────────────────────────
function startTetra() {
  if (vitals.energia < 10) {
    showBubble(t('mg.bub.tired'));
    ModalManager.close('tetraModal');
    return;
  }
  const d = miniDifficulty();
  _tetTier = d.tier;

  _tetGrade = Array.from({ length: TET_LINHAS }, () => Array(TET_COLS).fill(null));
  _tetSaco = [];
  _tetFila = [];
  for (let i = 0; i < TET_FILA; i++) _tetFila.push(_tetTirar());
  _tetGuardada = null;
  _tetPodeGuardar = true;
  _tetPontos = 0;
  _tetLinhas = 0;
  _tetNivel  = 1;
  _tetQueda  = 0;
  _tetNoChaoDesde = null;
  _tetAdiamentos = 0;
  _tetLimpando = null;
  _tetMover = null;
  _tetSuave = false;
  _tetFaiscas = [];
  _tetPerigo = false;
  _tetPausa  = false;
  _tetAcabou = false;
  _tetRodando = true;
  _tetUltimo = performance.now();

  const info = document.getElementById('tetraInfo');
  if (info) info.textContent = t('mg.tet.info', { diff: t(d.i18nKey) });
  const dica = document.getElementById('tetraDica');
  if (dica) dica.textContent = t('mg.tet.dica');

  _tetLimparResultado();
  _tetNascer();
  _tetPlacar();
  _tetMedir();
  _tetSincronizarRecorde();
}

// O saco de sete: embaralha as sete e tira uma a uma.
function _tetTirar() {
  if (_tetSaco.length === 0) {
    _tetSaco = TET_TIPOS.slice();
    for (let i = _tetSaco.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_tetSaco[i], _tetSaco[j]] = [_tetSaco[j], _tetSaco[i]];
    }
  }
  return _tetSaco.pop();
}

function _tetNova(tipo) {
  const p = TET_PECAS[tipo];
  return {
    tipo,
    cel: p.cel.map(c => c.slice()),
    x: Math.floor((TET_COLS - p.n) / 2),
    y: tipo === 'I' ? -1 : 0,
  };
}

function _tetNascer(tipo) {
  if (!tipo) {
    tipo = _tetFila.shift();
    _tetFila.push(_tetTirar());
  }
  _tetPeca = _tetNova(tipo);
  _tetQueda = 0;
  _tetNoChaoDesde = null;
  _tetAdiamentos = 0;
  // Nasceu em cima de blocos: o poço encheu.
  if (!_tetCabe(_tetPeca.cel, _tetPeca.x, _tetPeca.y)) _tetFim();
}

// ── Regras do poço ─────────────────────────────────────────────────
function _tetCabe(cel, x, y) {
  for (const [cx, cy] of cel) {
    const c = x + cx, l = y + cy;
    if (c < 0 || c >= TET_COLS || l >= TET_LINHAS) return false;
    if (l >= 0 && _tetGrade[l][c]) return false;
  }
  return true;
}

// Mexer uma peça que está no chão adia a trava, até um limite.
function _tetAdiar() {
  if (_tetNoChaoDesde != null && _tetAdiamentos < TET_TRAVA_MAX) {
    _tetNoChaoDesde = performance.now();
    _tetAdiamentos++;
  }
}

function _tetMove(dx) {
  const p = _tetPeca;
  if (!p || !_tetAtivo()) return false;
  if (!_tetCabe(p.cel, p.x + dx, p.y)) return false;
  p.x += dx;
  _tetAdiar();
  return true;
}

function _tetGira(sentido) {
  const p = _tetPeca;
  if (!p || !_tetAtivo() || p.tipo === 'O') return;
  const n = TET_PECAS[p.tipo].n;
  const nova = p.cel.map(([x, y]) => sentido > 0 ? [n - 1 - y, x] : [y, n - 1 - x]);
  for (const [kx, ky] of TET_CHUTES) {
    if (_tetCabe(nova, p.x + kx, p.y + ky)) {
      p.cel = nova; p.x += kx; p.y += ky;
      _tetAdiar();
      return;
    }
  }
}

function _tetDesce() {
  const p = _tetPeca;
  if (_tetCabe(p.cel, p.x, p.y + 1)) { p.y++; return true; }
  return false;
}

function _tetSombra() {
  const p = _tetPeca;
  let y = p.y;
  while (_tetCabe(p.cel, p.x, y + 1)) y++;
  return y;
}

function _tetQuedaLivre() {
  if (!_tetPeca || !_tetAtivo()) return;
  const alvo = _tetSombra();
  _tetPontos += 2 * (alvo - _tetPeca.y);
  _tetPeca.y = alvo;
  if (typeof playSound === 'function') playSound('mine_click');
  _tetTravar();
}

function _tetUmPasso() {
  if (!_tetPeca || !_tetAtivo() || _tetPausado()) return;
  /* Sem ponto: dava +1 a cada toque, e tocar na seta sem parar virava um
     jeito de subir no ranking sem encaixar nada. Os pontos vêm das
     linhas (e da queda livre, uma vez por peça). */
  if (_tetDesce()) _tetQueda = 0;   // o passo dado conta como a descida desta vez
}

function _tetGuardar() {
  if (!_tetPeca || !_tetAtivo() || !_tetPodeGuardar) return;
  const agora = _tetPeca.tipo;
  if (_tetGuardada) _tetNascer(_tetGuardada);
  else _tetNascer();
  _tetGuardada = agora;
  // Uma troca por peça: sem isto se guardava para sempre e nada caía.
  _tetPodeGuardar = false;
}

function _tetAtivo() {
  return _tetRodando && !_tetAcabou && !_tetLimpando;
}

function _tetTravar() {
  const p = _tetPeca;
  let transbordou = false;
  for (const [cx, cy] of p.cel) {
    const l = p.y + cy;
    if (l < 0) { transbordou = true; continue; }
    _tetGrade[l][p.x + cx] = p.tipo;
  }
  _tetPeca = null;
  _tetPodeGuardar = true;
  if (transbordou) { _tetFim(); return; }

  const cheias = [];
  for (let l = 0; l < TET_LINHAS; l++) {
    if (_tetGrade[l].every(Boolean)) cheias.push(l);
  }
  if (cheias.length) {
    _tetLimpando = { linhas: cheias, desde: performance.now() };
    _tetPontuar(cheias.length);
    _tetFaiscarLinhas(cheias);
  } else {
    _tetVigiarAltura();
    _tetNascer();
  }
  _tetPlacar();
}

function _tetPontuar(n) {
  _tetPontos += TET_PONTOS_LINHAS[n] * _tetNivel;
  _tetLinhas += n;
  const nivel = 1 + Math.floor(_tetLinhas / 10);
  if (typeof playSound === 'function') playSound(n >= 4 ? 'rarity_raro' : 'card_match');
  if (nivel > _tetNivel) {
    _tetNivel = nivel;
    showBubble(t('mg.tet.bub.nivel', { n: nivel }));
    if (typeof playSound === 'function') playSound('levelup');
  }
  /* O avatar brinca junto: festa numa limpeza de quatro, um pulinho
     numa de duas ou três. Uma linha só é o arroz com feijão do jogo, e
     um bicho que pula a cada peça deixa de dizer alguma coisa. */
  if (n >= 4) { showBubble(t('mg.tet.bub.quatro')); _tetReage('festa', true); }
  else if (n >= 2) _tetReage('bom');
}

function _tetTirarLinhas() {
  const fora = new Set(_tetLimpando.linhas);
  const restam = _tetGrade.filter((_, l) => !fora.has(l));
  while (restam.length < TET_LINHAS) restam.unshift(Array(TET_COLS).fill(null));
  _tetGrade = restam;
  _tetLimpando = null;
  _tetVigiarAltura();
  _tetNascer();
}

// O monte chegou perto do teto: o avatar se assusta, uma vez só.
function _tetVigiarAltura() {
  const alto = _tetGrade.slice(0, 5).some(l => l.some(Boolean));
  if (alto && !_tetPerigo) _tetReage('mau', true);
  _tetPerigo = alto;
}

function _tetReage(tipo, forcar) {
  if (typeof miniAvatarReagir !== 'function') return;
  const agora = performance.now();
  if (!forcar && agora - _tetReagiuEm < 700) return;
  _tetReagiuEm = agora;
  miniAvatarReagir(tipo);
}

function _tetVelocidade() {
  return Math.max(TET_VEL_MIN, TET_BASE[_tetTier] * Math.pow(0.82, _tetNivel - 1));
}

// ── O passo do tempo ───────────────────────────────────────────────
function _tetPasso(agora) {
  const dt = Math.min(100, agora - _tetUltimo);   // uma aba parada não despeja tudo de uma vez
  _tetUltimo = agora;
  if (!_tetRodando || _tetAcabou) return;

  if (_tetLimpando) {
    if (agora - _tetLimpando.desde >= TET_LIMPA_MS) _tetTirarLinhas();
    return;
  }
  if (!_tetPeca) return;

  // A seta segurada: um passo na hora, e depois repete.
  if (_tetMover && agora - _tetMover.desde >= TET_DAS) {
    while (agora - _tetMover.ultimo >= TET_ARR) {
      _tetMover.ultimo += TET_ARR;
      if (!_tetMove(_tetMover.dir)) { _tetMover.ultimo = agora; break; }
    }
  }

  const intervalo = _tetSuave ? Math.min(40, _tetVelocidade()) : _tetVelocidade();
  _tetQueda += dt;
  while (_tetQueda >= intervalo) {
    _tetQueda -= intervalo;
    if (!_tetDesce()) { _tetQueda = 0; break; }
  }

  // No chão: espera um pouco antes de travar, para dar tempo de ajeitar.
  if (_tetCabe(_tetPeca.cel, _tetPeca.x, _tetPeca.y + 1)) {
    _tetNoChaoDesde = null;
  } else if (_tetNoChaoDesde == null) {
    _tetNoChaoDesde = agora;
  } else if (agora - _tetNoChaoDesde >= TET_TRAVA_MS) {
    _tetTravar();
  }
  _tetPlacar();
}

// ── Fim ────────────────────────────────────────────────────────────
function _tetFim() {
  if (_tetAcabou) return;
  const humorAntes = vitals.humor;
  _tetRodando = false;
  _tetAcabou  = true;
  _tetPausa   = false;
  _tetMover = null;
  _tetSuave = false;

  const frac = Math.min(1, _tetLinhas / TET_ALVO[_tetTier]);
  if (typeof playSound === 'function') playSound(frac >= 0.6 ? 'win' : 'lose');
  _tetReage(frac >= 0.6 ? 'festa' : 'mau', true);

  applyGameCost(MG_LONGO.energia);

  const result = document.getElementById('tetraResult');
  const reward = document.getElementById('tetraReward');
  if (_tetLinhas === 0) {
    if (result) { result.textContent = t('mg.tet.vazio'); result.className = 'mini-result-box lose'; }
    if (reward) reward.textContent = mgComHumor(humorAntes, '');
  } else {
    // Um jogo longo (MG_LONGO, em js/modal.js): paga três vezes a base.
    const L = MG_LONGO.premio;
    const r = miniReward(frac * 1.5 * L, frac * L, Math.min(4, 1 + Math.floor(_tetLinhas / 10)), false, L);
    // O humor é pela brincadeira, não pela meta: igual em toda dificuldade.
    // +1 por linha até +23; com o +3 da partida, até +30.
    vitals.humor = Math.min(100, vitals.humor + 4 + Math.min(23, _tetLinhas));
    if (result) {
      result.textContent = t('mg.tet.fim', { p: _tetPontos, l: _tetLinhas });
      result.className = 'mini-result-box ' + (frac >= 0.6 ? 'win' : '');
    }
    if (reward) reward.textContent = mgComHumor(humorAntes, t('mg.reward_xp', { xp: r.xpGain, coins: r.coinGain }));
  }
  scheduleSave();

  _tetGuardarRecorde();
  const rank  = document.getElementById('tetraRankingBtn');
  const again = document.getElementById('tetraAgainBtn');
  if (rank)  rank.style.display  = 'inline-block';
  if (again) again.style.display = 'inline-block';
}

function _tetPlacar() {
  const el = document.getElementById('tetraScore');
  if (el) el.textContent = t('mg.tet.placar', { p: _tetPontos, l: _tetLinhas, n: _tetNivel });
}

function _tetLimparResultado() {
  const r = document.getElementById('tetraResult');
  if (r) { r.textContent = ''; r.className = 'mini-result-box'; }
  const p = document.getElementById('tetraReward');
  if (p) p.textContent = '';
  for (const id of ['tetraAgainBtn', 'tetraRankingBtn']) {
    const b = document.getElementById(id);
    if (b) b.style.display = 'none';
  }
  const painel = document.getElementById('tetraRankingPanel');
  const fundo  = document.getElementById('tetraRankingBackdrop');
  if (painel) painel.style.display = 'none';
  if (fundo)  fundo.style.display  = 'none';
  _tetRankAberto = false;
}

/* ══ O RECORDE E O RANKING ══
   O mesmo esquema da Fusão (js/fusao.js): um recorde por dificuldade
   no `gs.tetraBests` e a melhor pontuação de cada jogador no banco em
   tempo real, com o retrato do avatar. */
function _tetGuardarRecorde() {
  if (typeof gs === 'undefined') return;
  if (!gs.tetraBests) gs.tetraBests = {};
  const chave = 't' + _tetTier;
  if (_tetPontos <= (gs.tetraBests[chave] || 0)) return;
  gs.tetraBests[chave] = _tetPontos;
  if (typeof scheduleSave === 'function') scheduleSave();
  _tetSalvarRanking(_tetPontos, chave);
}

async function _tetSalvarRanking(pontos, chave) {
  if (typeof rtdb !== 'function' || !rtdb() || !walletAddress || !avatar) return;
  try {
    const linha = { nome: nomeCurto(avatar), score: pontos, wallet: walletAddress, ts: Date.now() };
    const av = (typeof rankMeuRetrato === 'function') ? rankMeuRetrato() : null;
    if (av) linha.av = av;
    await rtdb().ref(`tetraRanking/${chave}/${walletAddress}`).set(linha);
  } catch (e) { rankFalhou('tetra/gravar', e); }
}

async function _tetSincronizarRecorde() {
  if (typeof rtdb !== 'function' || !rtdb() || !walletAddress || !avatar) return;
  const bests = (typeof gs !== 'undefined' && gs.tetraBests) || {};
  for (const [chave, pontos] of Object.entries(bests)) {
    if (!(pontos > 0)) continue;
    try {
      const snap = await rtdb().ref(`tetraRanking/${chave}/${walletAddress}`).once('value');
      const atual = snap.val();
      if (!atual || atual.score < pontos || !atual.av) _tetSalvarRanking(pontos, chave);
    } catch (e) { rankFalhou('tetra/sincronizar', e); }
  }
}

async function tetraCarregarRanking(chave) {
  const lista = document.getElementById('tetraRankingList');
  if (!lista) return;
  if (typeof rtdb !== 'function' || !rtdb()) {
    lista.innerHTML = `<div class="rank-loading">${t('tet.rank.erro')}</div>`;
    return;
  }
  lista.innerHTML = `<div class="rank-loading">${t('ui.loading')}</div>`;
  try {
    const snap = await rtdb().ref(`tetraRanking/${chave}`).orderByChild('score').limitToLast(10).once('value');
    const linhas = Object.values(snap.val() || {}).sort((a, b) => b.score - a.score);
    const medalhas = ['🥇', '🥈', '🥉'];
    lista.innerHTML = linhas.length === 0
      ? `<div class="rank-loading">${t('tet.rank.vazio')}</div>`
      : linhas.map((d, i) => `
          <div class="rank-row${(d.wallet || '') === walletAddress ? ' rank-meu' : ''}">
            <span class="rank-pos">${medalhas[i] || `#${i + 1}`}</span>
            ${typeof rankRetratoDe === 'function' ? rankRetratoDe(d) : ''}
            <span class="rank-nome">${esc(d.nome || '???')}</span>
            <span class="rank-pts">${d.score} 🧱</span>
          </div>`).join('');
  } catch (e) {
    lista.innerHTML = `<div class="rank-loading">${t('tet.rank.erro')}
      <small class="rank-motivo">${esc(rankFalhou('tetra/ler', e))}</small></div>`;
  }
}

function tetraToggleRanking() {
  _tetRankAberto = !_tetRankAberto;
  const painel = document.getElementById('tetraRankingPanel');
  const fundo  = document.getElementById('tetraRankingBackdrop');
  if (painel) painel.style.display = _tetRankAberto ? 'flex' : 'none';
  if (fundo)  fundo.style.display  = _tetRankAberto ? 'block' : 'none';
  if (!_tetRankAberto) return;
  const dt = (typeof DIFF_TIERS !== 'undefined' && DIFF_TIERS[_tetTier]) || null;
  const titulo = document.getElementById('tetraRankingTitle');
  if (titulo) titulo.textContent = t('tet.rank.titulo', { diff: dt ? t(dt.i18nKey) : '' });
  tetraCarregarRanking('t' + _tetTier);
}

// ── O tamanho do poço ──────────────────────────────────────────────
/* O mesmo raciocínio do prato da Fusão (_fusMedirPrato): parte da
   altura da JANELA, desconta o que os outros filhos do cartão ocupam e
   uma reserva para o resultado e os botões do fim, e o bloco sai do
   que couber — 20 de altura, 15,5 de largura com a lateral. */
const TET_RESERVA_REM = 6.2;

function _tetMedir() {
  const canvas = document.getElementById('tetraCanvas');
  if (!canvas) return;
  const cartao = canvas.closest('.modal-card') || canvas.parentElement;
  const modal  = document.getElementById('tetraModal');
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const recheio = (el, a, b) => {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    return parseFloat(cs[a]) + parseFloat(cs[b]);
  };
  const foraDaConta = el => {
    if (el === canvas) return true;
    if (el.id === 'tetraResult' || el.id === 'tetraReward') return true;
    if (el.classList && el.classList.contains('mini-btns')) return true;
    const pos = getComputedStyle(el).position;
    return pos === 'fixed' || pos === 'absolute';
  };

  const janela = (modal && modal.clientHeight) || window.innerHeight;
  const outros = cartao
    ? Array.from(cartao.children).filter(el => !foraDaConta(el))
        .reduce((soma, el) => soma + el.getBoundingClientRect().height, 0)
    : 0;
  const alto = janela
    - recheio(modal, 'paddingTop', 'paddingBottom')
    - recheio(cartao, 'paddingTop', 'paddingBottom')
    - outros
    - Math.max(TET_RESERVA_REM * rem, 7.9 * 16);
  const largo = Math.min(
    (cartao ? cartao.clientWidth - recheio(cartao, 'paddingLeft', 'paddingRight') : window.innerWidth),
    window.innerWidth - 1.5 * rem
  );

  _tetCel = Math.max(10, Math.floor(Math.min(alto / TET_LINHAS, largo / (TET_COLS + TET_LATERAL), 36)));
  const W = Math.round(_tetCel * (TET_COLS + TET_LATERAL));
  const H = _tetCel * TET_LINHAS;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
}

let _tetMedirTimer = null;
window.addEventListener('resize', () => {
  const canvas = document.getElementById('tetraCanvas');
  if (!canvas || canvas.offsetParent === null) return;
  clearTimeout(_tetMedirTimer);
  _tetMedirTimer = setTimeout(_tetMedir, 150);
});

// ── Desenhar ───────────────────────────────────────────────────────
function _tetBloco(ctx, x, y, s, tipo, alfa) {
  const p = TET_PECAS[tipo];
  const m = Math.max(1, s * 0.06);   // a fresta entre blocos
  const r = Math.max(2, s * 0.18);
  ctx.globalAlpha = alfa == null ? 1 : alfa;
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, p.brilho);
  g.addColorStop(0.45, p.cor);
  g.addColorStop(1, p.cor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x + m, y + m, s - 2 * m, s - 2 * m, r);
  ctx.fill();
  // O reflexo em cima, que dá volume de pedra polida.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.roundRect(x + s * 0.2, y + s * 0.16, s * 0.6, s * 0.14, s * 0.07);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function _tetMini(ctx, tipo, cx, cy, s, apagada) {
  const p = TET_PECAS[tipo];
  const xs = p.cel.map(c => c[0]), ys = p.cel.map(c => c[1]);
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * s;
  const h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
  const ox = cx - w / 2 - Math.min(...xs) * s;
  const oy = cy - h / 2 - Math.min(...ys) * s;
  for (const [x, y] of p.cel) _tetBloco(ctx, ox + x * s, oy + y * s, s, tipo, apagada ? 0.35 : 1);
}

function _tetDesenhar() {
  const canvas = document.getElementById('tetraCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const s = _tetCel;
  const BW = s * TET_COLS, H = s * TET_LINHAS;
  const W = Math.round(s * (TET_COLS + TET_LATERAL));
  const agora = performance.now();
  ctx.clearRect(0, 0, W, H);

  // ── O poço ──
  const fundo = ctx.createLinearGradient(0, 0, 0, H);
  fundo.addColorStop(0, '#0a0718');
  fundo.addColorStop(1, '#141032');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, BW, H);
  const brilho = ctx.createRadialGradient(BW / 2, H, 10, BW / 2, H, H * 0.7);
  brilho.addColorStop(0, 'rgba(124,58,237,0.14)');
  brilho.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, BW, H);

  // A grade, bem apagada: guia o olho sem competir com as peças.
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < TET_COLS; c++) { ctx.moveTo(c * s + 0.5, 0); ctx.lineTo(c * s + 0.5, H); }
  for (let l = 1; l < TET_LINHAS; l++) { ctx.moveTo(0, l * s + 0.5); ctx.lineTo(BW, l * s + 0.5); }
  ctx.stroke();

  // ── Os blocos travados ──
  const limpando = _tetLimpando ? new Set(_tetLimpando.linhas) : null;
  for (let l = 0; l < TET_LINHAS; l++) {
    for (let c = 0; c < TET_COLS; c++) {
      const tipo = _tetGrade[l] && _tetGrade[l][c];
      if (tipo) _tetBloco(ctx, c * s, l * s, s, tipo, _tetAcabou ? 0.55 : 1);
    }
    // A linha completa pisca em branco antes de sumir.
    if (limpando && limpando.has(l)) {
      const k = 1 - (agora - _tetLimpando.desde) / TET_LIMPA_MS;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, 0.85 * k).toFixed(2)})`;
      ctx.fillRect(0, l * s, BW, s);
    }
  }

  // ── A sombra e a peça ──
  if (_tetPeca && !_tetAcabou) {
    const p = _tetPeca;
    const sy = _tetSombra();
    const cor = TET_PECAS[p.tipo].cor;
    ctx.strokeStyle = cor + '99';
    ctx.lineWidth = Math.max(1, s * 0.07);
    for (const [cx, cy] of p.cel) {
      if (sy + cy < 0) continue;
      ctx.beginPath();
      ctx.roundRect((p.x + cx) * s + s * 0.12, (sy + cy) * s + s * 0.12, s * 0.76, s * 0.76, s * 0.16);
      ctx.stroke();
    }
    ctx.shadowColor = cor;
    ctx.shadowBlur = s * 0.45;
    for (const [cx, cy] of p.cel) {
      if (p.y + cy < 0) continue;
      _tetBloco(ctx, (p.x + cx) * s, (p.y + cy) * s, s, p.tipo);
    }
    ctx.shadowBlur = 0;
  }

  // ── As faíscas das linhas ──
  _tetFaiscas = _tetFaiscas.filter(f => agora - f.nasceu < 650);
  for (const f of _tetFaiscas) {
    const vida = 1 - (agora - f.nasceu) / 650;
    f.x += f.vx; f.y += f.vy; f.vy += 0.08;
    ctx.globalAlpha = Math.max(0, vida);
    ctx.fillStyle = f.cor;
    ctx.beginPath();
    ctx.arc(f.x, f.y, (1.4 * vida + 0.6) * s / 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // A moldura do poço, em ouro fraco.
  ctx.strokeStyle = 'rgba(212,175,55,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, BW - 1, H - 1);

  // ── A lateral: guardada, próximas, nível e linhas ──
  const lx = BW + s * 0.5, lw = W - lx;
  const cx = lx + lw / 2;
  const rot = (txt, y) => {
    ctx.fillStyle = 'rgba(212,175,55,0.75)';
    ctx.font = `600 ${Math.max(8, Math.round(s * 0.42))}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(txt, cx, y);
  };
  const caixa = (y, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.strokeStyle = 'rgba(212,175,55,0.18)';
    ctx.beginPath();
    ctx.roundRect(lx, y, lw, h, s * 0.25);
    ctx.fill(); ctx.stroke();
  };
  const ms = s * 0.62;
  rot(t('mg.tet.guardada'), s * 0.7);
  caixa(s * 0.95, s * 2.4);
  if (_tetGuardada) _tetMini(ctx, _tetGuardada, cx, s * 2.15, ms, !_tetPodeGuardar);

  rot(t('mg.tet.proximas'), s * 4.1);
  caixa(s * 4.35, s * 6.9);
  _tetFila.forEach((tipo, i) => _tetMini(ctx, tipo, cx, s * (5.5 + i * 2.2), ms));

  rot(t('mg.tet.nivel'), s * 12.4);
  ctx.fillStyle = '#f3e9c6';
  ctx.font = `700 ${Math.round(s * 0.8)}px Cinzel, serif`;
  ctx.fillText(String(_tetNivel), cx, s * 13.5);
  rot(t('mg.tet.linhas'), s * 15);
  ctx.fillStyle = '#f3e9c6';
  ctx.font = `700 ${Math.round(s * 0.8)}px Cinzel, serif`;
  ctx.fillText(String(_tetLinhas), cx, s * 16.1);

  // ── O botão da pausa, no pé da lateral ──
  if (_tetRodando && !_tetAcabou) {
    const b = { x: lx, y: s * 17.3, w: lw, h: s * 2.2 };
    _tetBotaoPausa = b;
    ctx.fillStyle = _tetPausa ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.07)';
    ctx.strokeStyle = 'rgba(212,175,55,0.45)';
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, s * 0.3);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f3e9c6';
    ctx.font = `700 ${Math.round(s * 0.62)}px Cinzel, serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText((_tetPausa ? '▶ ' : '❚❚ ') + t(_tetPausa ? 'mg.tet.continuar' : 'mg.tet.pausa'),
                 cx, b.y + b.h / 2);
    ctx.textBaseline = 'alphabetic';
  } else {
    _tetBotaoPausa = null;
  }

  // ── O véu da pausa, só sobre o poço ──
  if (_tetPausa) {
    ctx.fillStyle = 'rgba(6,4,14,0.78)';
    ctx.fillRect(0, 0, BW, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0d080';
    ctx.font = `700 ${Math.round(s * 1.1)}px Cinzel, serif`;
    ctx.fillText(t('mg.tet.pausado'), BW / 2, H / 2 - s * 0.4);
    ctx.fillStyle = 'rgba(232,226,245,0.8)';
    ctx.font = `${Math.round(s * 0.55)}px 'EB Garamond', serif`;
    ctx.fillText(t('mg.tet.retomar'), BW / 2, H / 2 + s * 0.7);
  }
}

function _tetFaiscarLinhas(linhas) {
  const s = _tetCel, agora = performance.now();
  for (const l of linhas) {
    for (let c = 0; c < TET_COLS; c++) {
      const tipo = _tetGrade[l][c];
      const cor = tipo ? TET_PECAS[tipo].brilho : '#ffffff';
      for (let k = 0; k < 2; k++) {
        const a = Math.random() * Math.PI * 2, v = (0.6 + Math.random() * 1.6) * s / 20;
        _tetFaiscas.push({ x: (c + 0.5) * s, y: (l + 0.5) * s, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.8, cor, nasceu: agora });
      }
    }
  }
}

// ── Controles ──────────────────────────────────────────────────────
function _tetVisivel() {
  const canvas = document.getElementById('tetraCanvas');
  return !!canvas && canvas.offsetParent !== null;
}

function _tetSegurar(dir) {
  if (!_tetAtivo()) return;
  _tetMove(dir);
  const agora = performance.now();
  _tetMover = { dir, desde: agora, ultimo: agora };
}
function _tetSoltar(dir) {
  if (_tetMover && _tetMover.dir === dir) _tetMover = null;
}

/* Os botões da tela (no celular). Segurar ◀ ▶ repete, como a seta do
   teclado; segurar ▼ desce rápido. */
function tetraBotao(acao, apertou) {
  if (apertou && _tetPausado()) return;
  if (acao === 'esq')  return apertou ? _tetSegurar(-1) : _tetSoltar(-1);
  if (acao === 'dir')  return apertou ? _tetSegurar(1)  : _tetSoltar(1);
  /* A seta para baixo do celular desce UMA linha por toque. Segurá-la
     descia direto até o chão, e no dedo isso era quase a queda livre —
     que já tem botão próprio (⤓). No teclado a seta continua a descer
     rápido enquanto segurada, que é o que se espera de uma tecla. */
  if (acao === 'desce') { if (apertou) _tetUmPasso(); return; }
  if (!apertou) return;
  if (acao === 'gira')    _tetGira(1);
  if (acao === 'cai')     _tetQuedaLivre();
  if (acao === 'guarda')  _tetGuardar();
}

/* Escuta na CAPTURA: o espaço é também o atalho global da pausa
   (js/main.js), e derrubar a peça pausava o jogo inteiro junto. Aqui o
   Tetra ouve primeiro e segura a tecla. Com o jogo já pausado ele não
   escuta nada, e o espaço volta a ser de quem retoma. */
document.addEventListener('keydown', e => {
  if (!_tetRodando || _tetAcabou || !_tetVisivel()) return;
  const k = e.key;
  if ((k === 'p' || k === 'P' || k === 'Escape') && !e.repeat
      && !(typeof jogoPausado !== 'undefined' && jogoPausado)) {
    e.preventDefault(); e.stopPropagation();
    tetraPausar();
    return;
  }
  if (_tetPausado()) return;
  if (k === ' ') e.stopPropagation();
  const usa = () => e.preventDefault();
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { usa(); if (!e.repeat) _tetSegurar(-1); }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { usa(); if (!e.repeat) _tetSegurar(1); }
  // Uma linha por toque, como o ▼ do celular (_tetUmPasso). Segurar a
  // tecla não repete: descer direto é o espaço.
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { usa(); if (!e.repeat) _tetUmPasso(); }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'x' || k === 'X') { usa(); if (!e.repeat) _tetGira(1); }
  else if (k === 'z' || k === 'Z' || k === 'q' || k === 'Q') { usa(); if (!e.repeat) _tetGira(-1); }
  else if (k === ' ') { usa(); if (!e.repeat) _tetQuedaLivre(); }
  else if (k === 'c' || k === 'C' || k === 'Shift') { usa(); if (!e.repeat) _tetGuardar(); }
}, true);
document.addEventListener('keyup', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') _tetSoltar(-1);
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') _tetSoltar(1);
});

/* Gestos no poço: arrastar para o lado move uma coluna por bloco
   arrastado, arrastar rápido para baixo derruba, e um toque curto gira. */
(function _tetGestos() {
  const ligar = () => {
    const canvas = document.getElementById('tetraCanvas');
    if (!canvas) return;
    let ini = null;
    canvas.addEventListener('pointerdown', e => {
      if (!_tetRodando || _tetAcabou) return;
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const b = _tetBotaoPausa;
      const noBotao = b && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
      // Pausado pelo Tetra, qualquer toque no poço retoma.
      if (noBotao || _tetPausa) { ini = null; tetraPausar(); return; }
      if (!_tetAtivo() || _tetPausado()) return;
      ini = { x: e.clientX, y: e.clientY, t: performance.now(), feitoX: 0, moveu: false };
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!ini || !_tetAtivo()) return;
      const passos = Math.trunc((e.clientX - ini.x) / _tetCel);
      while (ini.feitoX < passos) { _tetMove(1);  ini.feitoX++; ini.moveu = true; }
      while (ini.feitoX > passos) { _tetMove(-1); ini.feitoX--; ini.moveu = true; }
    });
    const fim = e => {
      if (!ini) return;
      const dy = e.clientY - ini.y, dx = e.clientX - ini.x;
      const dur = performance.now() - ini.t;
      if (dy > _tetCel * 2.5 && dy > Math.abs(dx) * 1.5 && dur < 400) _tetQuedaLivre();
      else if (!ini.moveu && Math.hypot(dx, dy) < 10 && dur < 300) _tetGira(1);
      ini = null;
    };
    canvas.addEventListener('pointerup', fim);
    canvas.addEventListener('pointercancel', () => { ini = null; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();

// ── Laço ───────────────────────────────────────────────────────────
/* Pausado por um dos dois: o botão ⏸ do Tetra, ou a pausa do jogo
   inteiro (js/main.js). */
function _tetPausado() {
  return _tetPausa || (typeof jogoPausado !== 'undefined' && jogoPausado);
}

/* ── A PAUSA DO TETRA ──
   Uma partida boa dura minutos, e parar no meio era fechar a janela e
   perder tudo. O botão fica desenhado na lateral do poço, embaixo das
   linhas — no PC e no celular é o mesmo lugar —, e o P ou o Esc fazem o
   mesmo no teclado. Um toque no poço pausado também retoma. */
function tetraPausar() {
  if (!_tetRodando || _tetAcabou) return;
  _tetPausa = !_tetPausa;
  _tetMover = null;
  _tetSuave = false;
}

/* Com a janela fechada ou o jogo pausado, o tempo não conta. E os
   relógios que medem esperas — a trava no chão, o clarão das linhas, a
   seta segurada — andam junto: sem isso, ao voltar da pausa a peça
   travava na hora, porque o meio segundo já tinha passado. */
function _tetCongelar(agora) {
  const parado = agora - _tetUltimo;
  _tetUltimo = agora;
  if (_tetNoChaoDesde != null) _tetNoChaoDesde += parado;
  if (_tetLimpando) _tetLimpando.desde += parado;
  if (_tetMover) { _tetMover.desde += parado; _tetMover.ultimo += parado; }
}

(function _tetLoop() {
  const agora = performance.now();
  if (_tetVisivel() && (_tetRodando || _tetAcabou)) {
    if (_tetPausado()) _tetCongelar(agora);
    else _tetPasso(agora);
    _tetDesenhar();
  } else {
    _tetCongelar(agora);
  }
  requestAnimationFrame(_tetLoop);
})();
