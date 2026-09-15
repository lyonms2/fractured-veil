// ═══════════════════════════════════════════════════════════════════
// FUSÃO DE ESFERAS — o jogo de brincar com o avatar
//
// Solta-se uma esfera de luz na tigela. Duas esferas IGUAIS que se
// encostam viram uma maior, e a maior vale mais. A partida acaba quando
// a tigela transborda — uma esfera parada acima da linha por um segundo
// e meio.
//
// ── O QUE É NOSSO NISTO ──
//
// A ideia de fundir iguais é velha e corre em muitos jogos. O que faz
// deste o jogo DELE é o avatar: de tempos em tempos ele se debruça e
// come uma esfera, o que abre espaço e lhe dá humor. E a bomba, que se
// ganha jogando ou se compra com moedas, para tirar do monte aquela que
// ficou no lugar errado.
//
// ── NADA SOME SOZINHO ──
//
// Duas coisas pareciam defeito e eram:
//
//   · A tigela não tinha TETO. Quando o monte apertava, uma esfera era
//     empurrada para cima e saía da tela — e nunca mais voltava. Agora
//     há teto e as velocidades têm limite: o que entra na tigela fica
//     na tigela, e o monte alto acaba a partida em vez de vazar.
//
//   · O avatar comia sem avisar, e uma esfera sumia do nada. Agora ele
//     AVISA: a escolhida pisca dourada por um segundo e meio, com a
//     fala dele por cima, e só então ele come.
//
// ── A FÍSICA ──
//
// Círculos, gravidade e empurrões, resolvidos por iteração: não há
// biblioteca nenhuma no projeto e um jogo de queda não precisa de uma.
// Cada quadro faz alguns passos pequenos; a cada passo separa os
// círculos que se sobrepõem e prende todos dentro da tigela.
//
// Depende de: miniDifficulty(), miniReward(), applyGameCost(),
//             spendCoins(), showBubble(), playSound(), vitals, t()
// ═══════════════════════════════════════════════════════════════════

/* A escada das esferas. São os oito tipos do combate, do menor ao
   maior: quem chega ao fim juntou luz e treva, que é o topo. As cores
   são as mesmas famílias da arena, para o jogo parecer do mesmo mundo. */
const FUS_NIVEIS = [
  { cor: '#f87171', brilho: '#fecaca', chave: 'fogo'   },
  { cor: '#86efac', brilho: '#dcfce7', chave: 'terra'  },
  { cor: '#fbbf24', brilho: '#fef3c7', chave: 'raio'   },
  { cor: '#67e8f9', brilho: '#cffafe', chave: 'ar'     },
  { cor: '#60a5fa', brilho: '#dbeafe', chave: 'gelo'   },
  { cor: '#a78bfa', brilho: '#ede9fe', chave: 'veneno' },
  { cor: '#fde68a', brilho: '#ffffff', chave: 'luz'    },
  { cor: '#7c3aed', brilho: '#c4b5fd', chave: 'treva'  },
];

const FUS_GRAVIDADE    = 0.42;   // por quadro, dividida pelos passos
const FUS_PASSOS       = 3;      // passos de física por quadro
const FUS_ATRITO       = 0.992;
const FUS_QUIQUE       = 0.18;   // quanto devolve ao bater
const FUS_VEL_MAX      = 14;     // trava contra atravessar paredes
const FUS_TOPO         = 46;     // a linha da borda, em px lógicos
const FUS_ESTOURO_MS   = 1500;   // parado acima da linha até acabar
const FUS_ESPERA_SOLTA = 260;    // ms entre uma solta e a seguinte
const FUS_AVISO_MS     = 1500;   // o aviso antes de o avatar comer
const FUS_COMER_MS     = 420;    // a esfera encolhendo na boca dele
const FUS_FILA         = 3;      // quantas próximas se mostram

// A bomba: quantos pontos custa ganhar uma, quantas cabem na mão, e
// quanto custa comprar a mais.
const FUS_BOMBA_CADA   = [90, 130, 180, 240];
const FUS_BOMBA_MAX    = 3;
const FUS_BOMBA_PRECO  = 15;

// Quantos tipos podem nascer na mão, por dificuldade: com mais tipos,
// custa mais juntar duas iguais.
const FUS_TIPOS_INICIAIS = [3, 3, 4, 5];
// De quanto em quanto tempo o avatar quer comer (ms).
const FUS_COME_CADA      = [11000, 14000, 18000, 23000];
// Quantos pontos valem uma partida cheia, por dificuldade.
const FUS_ALVO           = [260, 420, 640, 900];

// ── Estado ─────────────────────────────────────────────────────────
let _fusEsferas   = [];   // [{id,x,y,vx,vy,n,r,nascida,fundidaEm}]
let _fusFila      = [];   // os próximos níveis, o primeiro é o da mão
let _fusPontos    = 0;
let _fusMaior     = 0;    // o maior nível já alcançado
let _fusFusoes    = 0;
let _fusRodando   = false;
let _fusAcabou    = false;
let _fusTier      = 0;
let _fusMira      = null;
let _fusUltimaSolta  = 0;
let _fusEstouroDesde = null;
let _fusComeEm    = 0;    // quando o avatar pede a próxima
let _fusAviso     = null; // { id, inicio } — ele avisou, ainda não comeu
let _fusComendo   = null; // { id, inicio } — está engolindo
let _fusBombas    = 0;
let _fusBombaProx = 0;    // pontos para ganhar a seguinte
let _fusArmado    = false;
let _fusFaiscas   = [];   // { x, y, vx, vy, cor, nasceu }
let _fusIdSeq     = 1;

// ── Iniciar ────────────────────────────────────────────────────────
function startFusao() {
  if (vitals.energia < 10) {
    showBubble(t('mg.bub.tired'));
    ModalManager.close('fusaoModal');
    return;
  }

  const d  = miniDifficulty();
  _fusTier = d.tier;

  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return;
  /* Buffer no tamanho real vezes a densidade da tela: sem esticar e sem
     cortar. O jogo inteiro pensa em px lógicos (clientWidth). */
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width  = (canvas.clientWidth  || 224) * dpr;
  canvas.height = (canvas.clientHeight || 314) * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

  _fusEsferas = [];
  _fusFaiscas = [];
  _fusPontos  = 0;
  _fusMaior   = 0;
  _fusFusoes  = 0;
  _fusAcabou  = false;
  _fusRodando = true;
  _fusMira    = (canvas.clientWidth || 224) / 2;
  _fusUltimaSolta  = 0;
  _fusEstouroDesde = null;
  _fusAviso   = null;
  _fusComendo = null;
  _fusArmado  = false;
  _fusBombas  = 1;                       // uma de graça, para ensinar o gesto
  _fusBombaProx = FUS_BOMBA_CADA[_fusTier];
  _fusComeEm  = performance.now() + FUS_COME_CADA[_fusTier];
  _fusFila    = Array.from({ length: FUS_FILA + 1 }, _fusSorteia);

  const info = document.getElementById('fusaoInfo');
  if (info) info.textContent = t('mg.fus.info', { diff: t(d.i18nKey) });

  _fusLimparResultado();
  _fusPlacar();
  _fusPainel();
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

/* ── O PAINEL DE BAIXO ──
   A fila — as próximas esferas, na ordem em que vêm — e a escada dos
   oito tipos, que acende até onde o jogador já chegou. Sem isto não há
   como saber o que vem depois do quê, e um jogo de fundir é justamente
   sobre saber isso. O botão da bomba fica ao lado. */
function _fusPainel() {
  const bola = (n, grande) => {
    const nv = FUS_NIVEIS[n];
    const d  = grande ? 18 : 12;
    return `<i class="fus-bola" style="width:${d}px;height:${d}px;` +
           `background:radial-gradient(circle at 34% 32%, ${nv.brilho}, ${nv.cor});` +
           `box-shadow:0 0 ${grande ? 8 : 5}px ${nv.cor}88"></i>`;
  };

  const fila = document.getElementById('fusaoFila');
  if (fila) {
    fila.innerHTML = `<span class="fus-rot">${t('mg.fus.fila')}</span>` +
      _fusFila.slice(0, FUS_FILA).map((n, i) => bola(n, i === 0)).join('');
  }

  const escada = document.getElementById('fusaoEscada');
  if (escada) {
    escada.innerHTML = `<span class="fus-rot">${t('mg.fus.escada')}</span>` +
      FUS_NIVEIS.map((nv, n) => {
        const d = 7 + n * 1.5;
        return `<i class="fus-passo${n <= _fusMaior ? ' feito' : ''}" title="${t('af.tipo.' + nv.chave)}"` +
               ` style="width:${d}px;height:${d}px;background:${nv.cor}"></i>`;
      }).join('');
  }

  const botao = document.getElementById('fusaoBomba');
  if (botao) {
    botao.className = 'mini-btn fus-bomba' + (_fusArmado ? ' armada' : '');
    botao.textContent = _fusArmado ? t('mg.fus.bomba.mire')
      : _fusBombas > 0 ? t('mg.fus.bomba.usar', { n: _fusBombas })
      : t('mg.fus.bomba.comprar', { preco: FUS_BOMBA_PRECO });
  }
}

// ── Soltar ─────────────────────────────────────────────────────────
function _fusSoltar(x) {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas || !_fusRodando || _fusAcabou) return;
  const agora = performance.now();
  if (agora - _fusUltimaSolta < FUS_ESPERA_SOLTA) return;
  _fusUltimaSolta = agora;

  const W = canvas.clientWidth || 224;
  const n = _fusFila[0];
  const r = _fusRaio(n, W);
  _fusEsferas.push({
    id: _fusIdSeq++,
    x: Math.max(r + 2, Math.min(W - r - 2, x)),
    y: FUS_TOPO - r - 2,
    vx: 0, vy: 0, n, r,
    nascida: agora, fundidaEm: 0,
  });
  _fusFila.shift();
  _fusFila.push(_fusSorteia());
  _fusPainel();
}

function _fusPonteiro(clientX) {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const W = canvas.clientWidth || 224;
  const r = _fusRaio(_fusFila[0] || 0, W);
  return Math.max(r + 2, Math.min(W - r - 2, clientX - rect.left));
}

/* Um toque na tigela: com a bomba armada, estoura a esfera tocada;
   sem ela, solta a da mão. */
function _fusToque(clientX, clientY) {
  if (!_fusRodando || _fusAcabou) return;
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return;

  if (_fusArmado) {
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left, my = clientY - rect.top;
    const alvo = _fusEsferas.find(e => Math.hypot(e.x - mx, e.y - my) <= e.r + 4);
    if (alvo) _fusExplodir(alvo);
    else { _fusArmado = false; _fusPainel(); }   // tocou no vazio: desarma
    return;
  }

  const x = _fusPonteiro(clientX);
  if (x != null) { _fusMira = x; _fusSoltar(x); }
}

// Exposto para o onclick do canvas (o toque tem escuta própria).
function fusaoClick(e) { _fusToque(e.clientX, e.clientY); }

/* O botão da bomba faz as três coisas, conforme o momento: compra
   quando não há nenhuma, arma quando há, e desarma se já estava. */
function fusaoBomba() {
  if (!_fusRodando || _fusAcabou) return;
  if (_fusArmado) { _fusArmado = false; _fusPainel(); return; }

  if (_fusBombas <= 0) {
    if (typeof spendCoins !== 'function' || !spendCoins(FUS_BOMBA_PRECO)) {
      if (typeof playSound === 'function') playSound('no_coins');
      showBubble(t('mg.fus.bomba.sem'));
      return;
    }
    _fusBombas++;
  }
  _fusArmado = true;
  _fusPainel();
}

function _fusExplodir(alvo) {
  _fusBombas--;
  _fusArmado = false;
  _fusEsferas = _fusEsferas.filter(e => e !== alvo);
  _fusFaiscar(alvo.x, alvo.y, FUS_NIVEIS[alvo.n].cor, 16);
  if (_fusAviso && _fusAviso.id === alvo.id) _fusAviso = null;
  if (typeof playSound === 'function') playSound('mine_explode');
  _fusPainel();
}

(function _fusLigarEntrada() {
  function ligar() {
    const canvas = document.getElementById('fusaoCanvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', e => {
      const x = _fusPonteiro(e.clientX);
      if (x != null) _fusMira = x;
    });
    canvas.addEventListener('click', e => _fusToque(e.clientX, e.clientY));

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
      _fusToque(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
      e.preventDefault();
    }, { passive: false });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();

// ── Física ─────────────────────────────────────────────────────────
/* Prende a esfera dentro da tigela. É chamada depois de mover E depois
   de empurrar: uma esfera espremida entre duas grandes ganha posição
   fora das paredes na separação, e sem esta segunda passagem era ela
   que subia pelo topo e sumia da tela. */
function _fusPrender(e, W, H) {
  if (e.x - e.r < 0)     { e.x = e.r;     e.vx = Math.abs(e.vx) * FUS_QUIQUE; }
  if (e.x + e.r > W)     { e.x = W - e.r; e.vx = -Math.abs(e.vx) * FUS_QUIQUE; }
  if (e.y + e.r > H)     { e.y = H - e.r; e.vy = -Math.abs(e.vy) * FUS_QUIQUE; e.vx *= 0.88; }
  if (e.y - e.r < 0)     { e.y = e.r;     e.vy = Math.abs(e.vy) * FUS_QUIQUE; }
  e.vx = Math.max(-FUS_VEL_MAX, Math.min(FUS_VEL_MAX, e.vx));
  e.vy = Math.max(-FUS_VEL_MAX, Math.min(FUS_VEL_MAX, e.vy));
}

function _fusFisica(W, H) {
  for (let passo = 0; passo < FUS_PASSOS; passo++) {
    for (const e of _fusEsferas) {
      e.vy += FUS_GRAVIDADE / FUS_PASSOS;
      e.vx *= FUS_ATRITO;
      e.x  += e.vx / FUS_PASSOS;
      e.y  += e.vy / FUS_PASSOS;
      _fusPrender(e, W, H);
    }

    // Empurrões: separa quem se sobrepõe, com o peso da área de cada um.
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
        _fusPrender(a, W, H);
        _fusPrender(b, W, H);
      }
    }
  }
}

// ── Faíscas ────────────────────────────────────────────────────────
function _fusFaiscar(x, y, cor, quantas) {
  const agora = performance.now();
  for (let i = 0; i < quantas; i++) {
    const a = (i / quantas) * Math.PI * 2 + Math.random();
    const v = 1.2 + Math.random() * 2.2;
    _fusFaiscas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, cor, nasceu: agora });
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
      const agora = performance.now();
      const nova = {
        id: _fusIdSeq++,
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
        vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 - 1.2,
        n, r: _fusRaio(n, W), nascida: agora, fundidaEm: agora,
      };
      // O aviso do avatar morre com a esfera que ele tinha escolhido.
      if (_fusAviso && (_fusAviso.id === a.id || _fusAviso.id === b.id)) _fusAviso = null;
      _fusEsferas.splice(j, 1);
      _fusEsferas.splice(i, 1);
      _fusEsferas.push(nova);
      _fusFaiscar(nova.x, nova.y, FUS_NIVEIS[n].cor, 10);

      // Os pontos crescem com o nível: juntar duas grandes vale a espera.
      _fusGanhar((n + 1) * (n + 1) * 2);
      _fusFusoes++;
      if (n > _fusMaior) {
        _fusMaior = n;
        showBubble(t('mg.fus.bub.novo', { tipo: t('af.tipo.' + FUS_NIVEIS[n].chave) }));
      }
      if (typeof playSound === 'function') playSound('feed');
      _fusPlacar();
      _fusPainel();
      return true;   // uma por quadro: as outras acontecem no seguinte
    }
  }
  return false;
}

// Os pontos, e a bomba que eles pagam de tantos em tantos.
function _fusGanhar(pontos) {
  _fusPontos += pontos;
  while (_fusPontos >= _fusBombaProx) {
    _fusBombaProx += FUS_BOMBA_CADA[_fusTier];
    if (_fusBombas < FUS_BOMBA_MAX) {
      _fusBombas++;
      showBubble(t('mg.fus.bomba.ganhou'));
    }
  }
}

/* ── O AVATAR COME ──
   É a parte que faz disto uma brincadeira com o bicho: de tempos em
   tempos ele escolhe uma esfera, AVISA (ela pisca dourada por um
   segundo e meio, com a fala dele por cima) e só então come. O aviso
   existe para nada sumir do nada — e para dar tempo de estourar aquela
   com a bomba, se o jogador quiser guardá-la. */
function _fusAvatarQuer(agora) {
  if (_fusAviso || _fusComendo || !_fusEsferas.length) return;
  let maior = _fusEsferas[0];
  for (const e of _fusEsferas) if (e.n > maior.n || (e.n === maior.n && e.y < maior.y)) maior = e;
  _fusAviso = { id: maior.id, inicio: agora };
  _fusComeEm = agora + FUS_COME_CADA[_fusTier] + FUS_AVISO_MS;
  showBubble(t('mg.fus.bub.vou_comer'));
}

function _fusAvatarCome(agora) {
  const alvo = _fusEsferas.find(e => e.id === _fusAviso.id);
  _fusAviso = null;
  if (!alvo) return;                       // fundiu ou estourou no meio do aviso
  _fusComendo = { id: alvo.id, inicio: agora };
  _fusGanhar((alvo.n + 1) * 3);
  vitals.humor = Math.min(100, vitals.humor + 2);
  showBubble(t('mg.fus.bub.come'));
  if (typeof playSound === 'function') playSound('feed');
  _fusPlacar();
}

// ── Fim ────────────────────────────────────────────────────────────
function _fusFim() {
  _fusRodando = false;
  _fusAcabou  = true;
  _fusArmado  = false;
  _fusPainel();

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
    r *= Math.max(0, 1 - (agora - _fusComendo.inicio) / FUS_COMER_MS);
  }
  if (r <= 0.5) return;

  ctx.save();

  // A sombra no fundo da tigela dá peso ao monte.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(e.x, e.y + r * 0.82, r * 0.78, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = nv.cor;
  ctx.shadowBlur  = r * 0.8;
  const grd = ctx.createRadialGradient(e.x - r * 0.34, e.y - r * 0.38, r * 0.08, e.x, e.y, r);
  grd.addColorStop(0, nv.brilho);
  grd.addColorStop(0.55, nv.cor);
  grd.addColorStop(1, nv.cor);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Um fio de luz na borda de baixo: é o que dá volume à esfera.
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.arc(e.x, e.y, r * 0.93, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  // E o reflexo em cima.
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.ellipse(e.x - r * 0.3, e.y - r * 0.36, r * 0.24, r * 0.17, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // O aviso do avatar: anel dourado a pulsar em volta da escolhida.
  if (_fusAviso && _fusAviso.id === e.id) {
    const p = 0.5 + 0.5 * Math.sin((agora - _fusAviso.inicio) / 90);
    ctx.strokeStyle = `rgba(240,208,128,${(0.45 + 0.45 * p).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(e.x, e.y, r + 4 + p * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // E com a bomba armada, todas piscam de leve: são todas alvo.
  if (_fusArmado) {
    const p = 0.5 + 0.5 * Math.sin(agora / 140);
    ctx.strokeStyle = `rgba(248,113,113,${(0.25 + 0.4 * p).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r + 2, 0, Math.PI * 2);
    ctx.stroke();
  }

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

    // O avatar pede, avisa e come.
    if (!_fusAviso && !_fusComendo && agora >= _fusComeEm) _fusAvatarQuer(agora);
    if (_fusAviso && agora - _fusAviso.inicio > FUS_AVISO_MS) _fusAvatarCome(agora);
    if (_fusComendo && agora - _fusComendo.inicio > FUS_COMER_MS) {
      const comida = _fusEsferas.find(e => e.id === _fusComendo.id);
      if (comida) _fusFaiscar(comida.x, comida.y, FUS_NIVEIS[comida.n].cor, 8);
      _fusEsferas = _fusEsferas.filter(e => e.id !== _fusComendo.id);
      _fusComendo = null;
    }

    /* Transbordou? Só conta a esfera PARADA acima da linha: uma que
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

  // ── O fundo da tigela ──
  const ceu = ctx.createLinearGradient(0, 0, 0, H);
  ceu.addColorStop(0, '#0a0718');
  ceu.addColorStop(0.55, '#0b0a1c');
  ceu.addColorStop(1, '#141032');
  ctx.fillStyle = ceu;
  ctx.fillRect(0, 0, W, H);

  // Um clarão no fundo, como se a tigela guardasse luz.
  const fundo = ctx.createRadialGradient(W / 2, H, 10, W / 2, H, H * 0.75);
  fundo.addColorStop(0, 'rgba(124,58,237,0.16)');
  fundo.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, W, H);

  // As paredes, em ouro fraco.
  ctx.strokeStyle = 'rgba(212,175,55,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(1, FUS_TOPO - 14); ctx.lineTo(1, H - 1); ctx.lineTo(W - 1, H - 1); ctx.lineTo(W - 1, FUS_TOPO - 14);
  ctx.stroke();

  // A linha da borda, que pisca quando está prestes a transbordar.
  const perigo = _fusEstouroDesde != null;
  ctx.strokeStyle = perigo
    ? `rgba(248,113,113,${(0.4 + 0.35 * Math.sin(agora / 90)).toFixed(2)})`
    : 'rgba(212,175,55,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, FUS_TOPO); ctx.lineTo(W, FUS_TOPO);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── A mira e a esfera na mão ──
  if (_fusRodando && !_fusAcabou && !_fusArmado) {
    const n = _fusFila[0] || 0;
    const r = _fusRaio(n, W);
    const g = ctx.createLinearGradient(0, FUS_TOPO, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(_fusMira, FUS_TOPO); ctx.lineTo(_fusMira, H);
    ctx.stroke();
    _fusEsfera(ctx, { id: -1, x: _fusMira, y: FUS_TOPO - r - 2, r, n, fundidaEm: 0 }, agora);
  }

  // ── As esferas ──
  for (const e of _fusEsferas) _fusEsfera(ctx, e, agora);

  // ── As faíscas ──
  _fusFaiscas = _fusFaiscas.filter(f => agora - f.nasceu < 620);
  for (const f of _fusFaiscas) {
    const vida = 1 - (agora - f.nasceu) / 620;
    f.x += f.vx; f.y += f.vy; f.vy += 0.09;
    ctx.globalAlpha = Math.max(0, vida);
    ctx.fillStyle = f.cor;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 1.6 * vida + 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Laço ───────────────────────────────────────────────────────────
(function _fusLoop() {
  const canvas = document.getElementById('fusaoCanvas');
  // Só desenha com a janela aberta: fora dela não há nada para mostrar.
  if (canvas && canvas.offsetParent !== null && (_fusRodando || _fusAcabou)) _fusDesenhar();
  requestAnimationFrame(_fusLoop);
})();
