// ═══════════════════════════════════════════════════════════════════
// FUSÃO DE ESFERAS — o jogo de brincar com o avatar
//
// Solta-se uma esfera de luz na tigela. Duas esferas IGUAIS que se
// encostam viram uma maior, e a maior vale mais. A partida acaba quando
// a tigela transborda — uma esfera que fica acima da linha por mais de
// um segundo e meio.
//
// ── O QUE É NOSSO NISTO ──
//
// A ideia de fundir iguais é velha e corre em muitos jogos. O que faz
// deste o jogo DELE é o avatar: de tempos em tempos ele se debruça e
// come a maior esfera da tigela, abrindo espaço e dando humor. Quem
// joga não está só empilhando — está alimentando o bicho, que é o que
// o resto do jogo faz o tempo todo.
//
// ── A FÍSICA ──
//
// Círculos, gravidade e empurrões, resolvidos por iteração: não há
// biblioteca nenhuma no projeto e um jogo de queda não precisa de uma.
// Cada quadro faz alguns passos pequenos, e a cada passo separa os
// círculos que se sobrepõem. É estável o suficiente para empilhar sem
// tremer, e o tremor que sobra some com o amortecimento.
//
// Depende de: miniDifficulty(), miniReward(), applyGameCost(),
//             showBubble(), playSound(), vitals, t()
// ═══════════════════════════════════════════════════════════════════

/* A escada das esferas. São os oito tipos do combate, do menor ao
   maior: quem chega ao fim juntou luz e treva, que é o topo. A cor é a
   mesma família usada na arena, para o jogo parecer do mesmo mundo. */
const FUS_NIVEIS = [
  { cor: '#f87171', brilho: '#fca5a5', chave: 'fogo'   },
  { cor: '#86efac', brilho: '#bbf7d0', chave: 'terra'  },
  { cor: '#fbbf24', brilho: '#fde68a', chave: 'raio'   },
  { cor: '#67e8f9', brilho: '#a5f3fc', chave: 'ar'     },
  { cor: '#60a5fa', brilho: '#93c5fd', chave: 'gelo'   },
  { cor: '#a78bfa', brilho: '#c4b5fd', chave: 'veneno' },
  { cor: '#fef3c7', brilho: '#ffffff', chave: 'luz'    },
  { cor: '#8b5cf6', brilho: '#c084fc', chave: 'treva'  },
];

const FUS_GRAVIDADE   = 0.42;   // por passo de física
const FUS_PASSOS      = 3;      // passos por quadro
const FUS_ATRITO      = 0.992;
const FUS_QUIQUE      = 0.18;   // quanto devolve ao bater
const FUS_TOPO        = 44;     // a linha da borda, em px lógicos
const FUS_ESTOURO_MS  = 1500;   // tempo acima da linha até acabar
const FUS_ESPERA_SOLTA = 260;   // ms entre uma solta e a seguinte

// ── Estado ─────────────────────────────────────────────────────────
let _fusEsferas   = [];   // [{x,y,vx,vy,n,r,nascida,fundidaEm}]
let _fusProxima   = 0;    // nível da esfera na mão
let _fusDepois    = 0;    // a seguinte, mostrada no canto
let _fusPontos    = 0;
let _fusMaior     = 0;    // o maior nível já alcançado
let _fusFusoes    = 0;
let _fusRodando   = false;
let _fusAcabou    = false;
let _fusTier      = 0;
let _fusMira      = null; // x da mira, em px lógicos
let _fusUltimaSolta = 0;
let _fusEstouroDesde = null;
let _fusComeEm    = 0;    // quando o avatar come de novo
let _fusComendo   = null; // { id, inicio } — a esfera que está sendo comida
let _fusIdSeq     = 1;

// Quantos tipos diferentes podem nascer na mão, por dificuldade: com
// mais tipos, custa mais juntar dois iguais.
const FUS_TIPOS_INICIAIS = [3, 3, 4, 5];
// De quanto em quanto tempo o avatar come a maior esfera (ms).
const FUS_COME_CADA      = [9000, 12000, 16000, 21000];
// Quantos pontos valem uma partida cheia, por dificuldade.
const FUS_ALVO           = [260, 420, 640, 900];

// ── Iniciar ────────────────────────────────────────────────────────
function startFusao() {
  if (vitals.energia < 10) {
    showBubble(t('mg.bub.tired'));
    ModalManager.close('fusaoModal');
    return;
  }

  const d   = miniDifficulty();
  _fusTier  = d.tier;

  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return;
  // Buffer no tamanho real vezes a densidade da tela: sem esticar e sem
  // cortar. O jogo inteiro pensa em px lógicos (clientWidth).
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width  = (canvas.clientWidth  || 224) * dpr;
  canvas.height = (canvas.clientHeight || 314) * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

  _fusEsferas = [];
  _fusPontos  = 0;
  _fusMaior   = 0;
  _fusFusoes  = 0;
  _fusAcabou  = false;
  _fusRodando = true;
  _fusMira    = (canvas.clientWidth || 224) / 2;
  _fusUltimaSolta  = 0;
  _fusEstouroDesde = null;
  _fusComendo = null;
  _fusComeEm  = performance.now() + FUS_COME_CADA[_fusTier];
  _fusProxima = _fusSorteia();
  _fusDepois  = _fusSorteia();

  const info = document.getElementById('fusaoInfo');
  if (info) info.textContent = t('mg.fus.info', { diff: t(d.i18nKey) });

  _fusLimparResultado();
  _fusPlacar();
}

function _fusSorteia() {
  return Math.floor(Math.random() * FUS_TIPOS_INICIAIS[_fusTier]);
}

function _fusRaio(n, W) {
  // A menor cabe treze vezes na largura; cada nível cresce um terço.
  return (W / 13) * Math.pow(1.3, n);
}

function _fusPlacar() {
  const el = document.getElementById('fusaoScore');
  if (el) el.textContent = t('mg.fus.placar', { p: _fusPontos, n: _fusFusoes });
}

function _fusLimparResultado() {
  const r = document.getElementById('fusaoResult');
  if (r) { r.textContent = ''; r.className = 'mini-result-box'; }
  const p = document.getElementById('fusaoReward');
  if (p) p.textContent = '';
  const b = document.getElementById('fusaoAgainBtn');
  if (b) b.style.display = 'none';
}

// ── Soltar ─────────────────────────────────────────────────────────
function _fusSoltar(x) {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas || !_fusRodando || _fusAcabou) return;
  const agora = performance.now();
  if (agora - _fusUltimaSolta < FUS_ESPERA_SOLTA) return;
  _fusUltimaSolta = agora;

  const W = canvas.clientWidth || 224;
  const r = _fusRaio(_fusProxima, W);
  _fusEsferas.push({
    id: _fusIdSeq++,
    x: Math.max(r + 2, Math.min(W - r - 2, x)),
    y: FUS_TOPO - r - 2,
    vx: 0, vy: 0, n: _fusProxima, r,
    nascida: agora, fundidaEm: 0,
  });
  _fusProxima = _fusDepois;
  _fusDepois  = _fusSorteia();
}

function _fusPonteiro(clientX) {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const W = canvas.clientWidth || 224;
  const r = _fusRaio(_fusProxima, W);
  return Math.max(r + 2, Math.min(W - r - 2, clientX - rect.left));
}

// Exposto para o onclick do canvas (o toque tem escuta própria).
function fusaoClick(e) {
  const x = _fusPonteiro(e.clientX);
  if (x != null) { _fusMira = x; _fusSoltar(x); }
}

(function _fusLigarEntrada() {
  function ligar() {
    const canvas = document.getElementById('fusaoCanvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', e => {
      const x = _fusPonteiro(e.clientX);
      if (x != null) _fusMira = x;
    });
    canvas.addEventListener('click', e => {
      const x = _fusPonteiro(e.clientX);
      if (x != null) { _fusMira = x; _fusSoltar(x); }
    });

    /* No celular o dedo arrasta a mira e solta ao levantar: mirar e
       soltar no mesmo toque é o gesto que este jogo pede. */
    canvas.addEventListener('touchstart', e => {
      const x = _fusPonteiro(e.touches[0].clientX);
      if (x != null) _fusMira = x;
    }, { passive: true });
    canvas.addEventListener('touchmove', e => {
      const x = _fusPonteiro(e.touches[0].clientX);
      if (x != null) _fusMira = x;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
      const x = _fusPonteiro(e.changedTouches[0].clientX);
      if (x != null) { _fusMira = x; _fusSoltar(x); }
      e.preventDefault();
    }, { passive: false });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();

// ── Física ─────────────────────────────────────────────────────────
function _fusFisica(W, H) {
  for (let passo = 0; passo < FUS_PASSOS; passo++) {
    for (const e of _fusEsferas) {
      e.vy += FUS_GRAVIDADE / FUS_PASSOS;
      e.vx *= FUS_ATRITO;
      e.x  += e.vx / FUS_PASSOS;
      e.y  += e.vy / FUS_PASSOS;

      // Paredes e fundo da tigela.
      if (e.x - e.r < 0)      { e.x = e.r;      e.vx = -e.vx * FUS_QUIQUE; }
      if (e.x + e.r > W)      { e.x = W - e.r;  e.vx = -e.vx * FUS_QUIQUE; }
      if (e.y + e.r > H)      { e.y = H - e.r;  e.vy = -e.vy * FUS_QUIQUE; e.vx *= 0.88; }
    }

    // Empurrões entre esferas: separa quem se sobrepõe, metade para cada.
    for (let i = 0; i < _fusEsferas.length; i++) {
      for (let j = i + 1; j < _fusEsferas.length; j++) {
        const a = _fusEsferas[i], b = _fusEsferas[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (dist === 0) { dx = 0.01; dy = 0.01; dist = 0.014; }
        if (dist >= min) continue;

        const nx = dx / dist, ny = dy / dist;
        const sobra = (min - dist) * 0.5;
        // O peso é a área: uma esfera grande cede menos do que uma pequena.
        const pa = b.r * b.r / (a.r * a.r + b.r * b.r);
        const pb = 1 - pa;
        a.x -= nx * sobra * 2 * pa; a.y -= ny * sobra * 2 * pa;
        b.x += nx * sobra * 2 * pb; b.y += ny * sobra * 2 * pb;

        const vrel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vrel < 0) {
          const imp = -vrel * (1 + FUS_QUIQUE) * 0.5;
          a.vx -= nx * imp; a.vy -= ny * imp;
          b.vx += nx * imp; b.vy += ny * imp;
        }
      }
    }
  }
}

// ── Fundir ─────────────────────────────────────────────────────────
function _fusFundir(W) {
  for (let i = 0; i < _fusEsferas.length; i++) {
    for (let j = i + 1; j < _fusEsferas.length; j++) {
      const a = _fusEsferas[i], b = _fusEsferas[j];
      if (a.n !== b.n || a.n >= FUS_NIVEIS.length - 1) continue;
      if (Math.hypot(b.x - a.x, b.y - a.y) > a.r + b.r + 1) continue;

      const n = a.n + 1;
      const nova = {
        id: _fusIdSeq++,
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
        vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 - 1.2,
        n, r: _fusRaio(n, W), nascida: performance.now(), fundidaEm: performance.now(),
      };
      _fusEsferas.splice(j, 1);
      _fusEsferas.splice(i, 1);
      _fusEsferas.push(nova);

      // Os pontos crescem com o nível: juntar duas grandes vale a espera.
      _fusPontos += (n + 1) * (n + 1) * 2;
      _fusFusoes++;
      if (n > _fusMaior) {
        _fusMaior = n;
        showBubble(t('mg.fus.bub.novo', { tipo: t('af.tipo.' + FUS_NIVEIS[n].chave) }));
      }
      if (typeof playSound === 'function') playSound('feed');
      _fusPlacar();
      return true;   // uma fusão por quadro: as outras acontecem no seguinte
    }
  }
  return false;
}

/* ── O AVATAR COME A MAIOR ──
   É a parte que faz disto uma brincadeira com o bicho, e não um jogo
   de empilhar sozinho: de tempos em tempos ele se debruça na tigela e
   engole a maior esfera, o que abre espaço e melhora o humor dele. */
function _fusAvatarCome(agora) {
  if (_fusComendo || !_fusEsferas.length) return;
  let maior = _fusEsferas[0];
  for (const e of _fusEsferas) if (e.n > maior.n || (e.n === maior.n && e.y < maior.y)) maior = e;
  _fusComendo = { id: maior.id, inicio: agora };
  _fusComeEm  = agora + FUS_COME_CADA[_fusTier];
  _fusPontos += (maior.n + 1) * 3;
  vitals.humor = Math.min(100, vitals.humor + 2);
  showBubble(t('mg.fus.bub.come'));
  if (typeof playSound === 'function') playSound('feed');
  _fusPlacar();
}

// ── Fim ────────────────────────────────────────────────────────────
function _fusFim() {
  _fusRodando = false;
  _fusAcabou  = true;

  const frac = Math.min(1, _fusPontos / FUS_ALVO[_fusTier]);
  if (typeof playSound === 'function') playSound(frac >= 0.6 ? 'win' : 'lose');

  applyGameCost();

  const result = document.getElementById('fusaoResult');
  const reward = document.getElementById('fusaoReward');
  const again  = document.getElementById('fusaoAgainBtn');

  if (_fusFusoes === 0) {
    if (result) { result.textContent = t('mg.fus.vazio'); result.className = 'mini-result-box lose'; }
  } else {
    const r = miniReward(frac * 1.5, frac * 1.5, Math.min(4, 1 + Math.floor(_fusMaior / 2)));
    if (result) {
      result.textContent = t('mg.fus.fim', {
        p: _fusPontos, tipo: t('af.tipo.' + FUS_NIVEIS[_fusMaior].chave),
      });
      result.className = 'mini-result-box ' + (frac >= 0.6 ? 'win' : '');
    }
    if (reward) reward.textContent = t('mg.reward_xp', { xp: r.xpGain, coins: r.coinGain });
    vitals.humor = Math.min(100, vitals.humor + Math.round(10 * frac));
    scheduleSave();
  }
  if (again) again.style.display = 'inline-block';
}

// ── Desenhar ───────────────────────────────────────────────────────
function _fusEsfera(ctx, e, agora) {
  const nv = FUS_NIVEIS[e.n];
  // A recém-fundida dá um estalo: cresce e volta.
  const salto = e.fundidaEm ? Math.max(0, 1 - (agora - e.fundidaEm) / 260) : 0;
  let r = e.r * (1 + 0.22 * salto);
  // E a que está sendo comida encolhe até sumir.
  if (_fusComendo && _fusComendo.id === e.id) {
    r *= Math.max(0, 1 - (agora - _fusComendo.inicio) / 420);
  }
  if (r <= 0.5) return;

  ctx.save();
  ctx.shadowColor = nv.cor;
  ctx.shadowBlur  = r * 0.7;
  const grd = ctx.createRadialGradient(e.x - r * 0.3, e.y - r * 0.35, r * 0.1, e.x, e.y, r);
  grd.addColorStop(0, nv.brilho);
  grd.addColorStop(1, nv.cor);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(e.x - r * 0.28, e.y - r * 0.32, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function _fusDesenhar() {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth  || 224;
  const H = canvas.clientHeight || 314;
  const agora = performance.now();

  if (_fusRodando && !_fusAcabou) {
    _fusFisica(W, H);
    _fusFundir(W);

    // O avatar come na hora dele.
    if (agora >= _fusComeEm) _fusAvatarCome(agora);
    if (_fusComendo && agora - _fusComendo.inicio > 420) {
      _fusEsferas = _fusEsferas.filter(e => e.id !== _fusComendo.id);
      _fusComendo = null;
    }

    /* Transbordou? Só conta a esfera parada acima da linha: uma que
       acabou de ser solta está sempre lá em cima, e acabar por isso
       seria acabar por jogar. */
    const estourando = _fusEsferas.some(e =>
      e.y - e.r < FUS_TOPO && agora - e.nascida > 900 && Math.abs(e.vy) < 0.6);
    if (estourando) {
      if (_fusEstouroDesde == null) _fusEstouroDesde = agora;
      else if (agora - _fusEstouroDesde > FUS_ESTOURO_MS) _fusFim();
    } else {
      _fusEstouroDesde = null;
    }
  }

  // ── Fundo ──
  ctx.fillStyle = '#060510';
  ctx.fillRect(0, 0, W, H);

  // A linha da borda, que pisca quando está prestes a transbordar.
  const perigo = _fusEstouroDesde != null;
  ctx.strokeStyle = perigo
    ? `rgba(248,113,113,${(0.35 + 0.3 * Math.sin(agora / 90)).toFixed(2)})`
    : 'rgba(212,175,55,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, FUS_TOPO); ctx.lineTo(W, FUS_TOPO);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── A mira e a esfera na mão ──
  if (_fusRodando && !_fusAcabou) {
    const r = _fusRaio(_fusProxima, W);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(_fusMira, FUS_TOPO); ctx.lineTo(_fusMira, H);
    ctx.stroke();
    _fusEsfera(ctx, { x: _fusMira, y: FUS_TOPO - r - 2, r, n: _fusProxima, id: -1 }, agora);

    // A seguinte, pequena no canto.
    const rp = Math.min(9, _fusRaio(_fusDepois, W) * 0.6);
    ctx.globalAlpha = 0.65;
    _fusEsfera(ctx, { x: W - rp - 6, y: rp + 6, r: rp, n: _fusDepois, id: -2 }, agora);
    ctx.globalAlpha = 1;
  }

  // ── As esferas ──
  for (const e of _fusEsferas) _fusEsfera(ctx, e, agora);
}

// ── Laço ───────────────────────────────────────────────────────────
(function _fusLoop() {
  const canvas = document.getElementById('fusaoCanvas');
  // Só desenha com a janela aberta: fora dela não há nada para mostrar.
  if (canvas && canvas.offsetParent !== null && (_fusRodando || _fusAcabou)) _fusDesenhar();
  requestAnimationFrame(_fusLoop);
})();
