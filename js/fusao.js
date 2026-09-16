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
// A ideia de fundir iguais é velha e corre em muitos jogos. O que é
// nosso é a bomba, que se ganha jogando ou se compra com moedas, para
// tirar do monte a esfera que ficou no lugar errado.
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
//   · O AVATAR COMIA a maior esfera de tempos em tempos. Saiu, e por
//     dois motivos: uma esfera sumindo é o jogo mexendo no tabuleiro do
//     jogador, e com ela o jogo não acabava quase nunca. Quem abre
//     espaço agora é a bomba, que é do jogador e custa alguma coisa.
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

/* A ESCADA DAS ESFERAS — doze degraus.

   Eram oito, e com o crescimento de um terço por degrau a quinta já
   tomava o prato: não dava para chegar ao fim, que é o que se joga num
   jogo de fundir. Doze, como as frutas dos jogos do gênero, com passos
   curtos — a maior tem menos de um terço do prato.

   Os oito primeiros são os tipos do combate, na ordem da arena. Os
   quatro últimos são do mundo, e contam uma história: a Fratura abre,
   o Véu é o que ela rasga, o Vácuo é o que vem do outro lado, e o
   Avatar é o que sai de tudo isso — o fim da escada é a criatura que o
   jogador cuida. Esses quatro têm nome próprio (`proprio: true`),
   porque não são tipos de dano. */
const FUS_NIVEIS = [
  { cor: '#f87171', brilho: '#fecaca', chave: 'fogo'    },
  { cor: '#86efac', brilho: '#dcfce7', chave: 'terra'   },
  { cor: '#fbbf24', brilho: '#fef3c7', chave: 'raio'    },
  { cor: '#67e8f9', brilho: '#cffafe', chave: 'ar'      },
  { cor: '#60a5fa', brilho: '#dbeafe', chave: 'gelo'    },
  { cor: '#a78bfa', brilho: '#ede9fe', chave: 'veneno'  },
  { cor: '#fde68a', brilho: '#ffffff', chave: 'luz'     },
  { cor: '#7c3aed', brilho: '#c4b5fd', chave: 'treva'   },
  { cor: '#38bdf8', brilho: '#e0f2fe', chave: 'fratura', proprio: true },
  { cor: '#e879f9', brilho: '#fae8ff', chave: 'veu',     proprio: true },
  { cor: '#4338ca', brilho: '#a5b4fc', chave: 'vacuo',   proprio: true },
  { cor: '#f0d080', brilho: '#fffbeb', chave: 'avatar',  proprio: true },
];

/* O nome de um degrau: os oito primeiros são tipos de dano e já têm
   nome na arena; os quatro últimos têm o seu. */
function _fusNome(n) {
  const nv = FUS_NIVEIS[n];
  return nv.proprio ? t('mg.fus.nv.' + nv.chave) : t('af.tipo.' + nv.chave);
}

const FUS_GRAVIDADE    = 0.42;   // por quadro, dividida pelos passos
const FUS_PASSOS       = 3;      // passos de física por quadro
const FUS_ATRITO       = 0.992;
const FUS_QUIQUE       = 0.18;   // quanto devolve ao bater
const FUS_VEL_MAX      = 14;     // trava contra atravessar paredes
/* ── A LINHA DE PERIGO ──

   Era fixa em 46px, e isso fazia a PARTIDA NÃO ACABAR NUNCA: num prato
   alto de 670px, 46px é uma fatia mínima lá em cima, e o monte quase
   nunca chegava lá. Agora ela é uma fração da altura do prato, com piso
   e teto — um prato grande tem uma boca proporcionalmente grande, e o
   fim chega quando tem de chegar. O valor de agora vive em `_fusTopo`,
   escrito pelo _fusMedirPrato. */
const FUS_TOPO_FRACAO  = 0.15;   // da altura do prato
const FUS_TOPO_MIN     = 42;
const FUS_TOPO_MAX     = 110;
let   _fusTopo         = 46;     // a linha de agora, em px lógicos
const FUS_ESTOURO_MS   = 1100;   // acima da linha até a partida acabar
const FUS_ESTOURO_IDADE = 800;   // idade mínima da esfera para ela contar
const FUS_ESPERA_SOLTA = 260;    // ms entre uma solta e a seguinte
const FUS_FILA         = 3;      // quantas próximas se mostram

// A bomba: quantos pontos custa ganhar uma, quantas cabem na mão, e
// quanto custa comprar a mais.
const FUS_BOMBA_CADA   = [140, 200, 280, 380];
const FUS_BOMBA_MAX    = 3;
const FUS_BOMBA_PRECO  = 15;

/* Quantos degraus podem nascer na mão, por dificuldade. Com doze
   degraus, nascerem só os três primeiros tornava o fim da escada
   inalcançavel: um Avatar custaria centenas de fusoes. Nascem os
   primeiros quatro a seis, com PESO DECRESCENTE — a menor sai mais
   vezes —, que e o que os jogos do genero fazem. */
const FUS_TIPOS_INICIAIS = [5, 5, 6, 6];
/* O TAMANHO DAS ESFERAS, em fração do menor lado do prato.

   Estavam gigantes: a menor tinha um sétimo do prato de diâmetro e cada
   degrau crescia um terço, portanto a quinta já o tomava inteiro e não
   havia como chegar ao fim da escada.

   Agora a menor tem UM QUINZE AVOS do menor lado, e cada degrau cresce
   15%. Nos doze degraus isso multiplica o diâmetro por 4,65: a maior
   fica com 31% do menor lado do prato — grande o suficiente para ser
   um acontecimento, pequena o suficiente para caber e para o jogo
   continuar depois dela.

   A conta antiga dizia `largura / 13` com o comentário "cabe treze
   vezes na largura", mas o que ela dava era o RAIO: cabiam seis e meia.
   E só olhava a largura, portanto num prato baixo a esfera grande
   ficava para sempre cortada, vazando pelo fundo.

   Agora sai do menor lado, e o número é escolhido para a MAIOR caber:
   nível 7 = 1,3^7 = 6,27 raios, ou seja 12,5 diâmetros da menor. Com
   0,07 do menor lado, a maior ocupa 88% dele. */
// 1/23 do menor lado: trinta por cento maior do que o 1/30 de antes.
const FUS_BASE   = 1 / 23;   // raio da menor esfera
const FUS_CRESCE = 1.15;     // quanto cada degrau cresce
// Quantos pontos valem uma partida cheia, por dificuldade.
/* A meta de pontos de uma partida cheia. Subiu junto com o limite de
   esferas: com sessenta por partida, uma partida boa no Facil passa dos
   1400, e uma meta baixa fazia o desleixado receber o mesmo que o
   caprichoso — medido: 1012 e 1426 pontos, ambos no teto do premio. */
const FUS_ALVO           = [1400, 1900, 2500, 3200];

/* ── QUANTAS ESFERAS A PARTIDA TEM ──

   Sem isto a partida podia não acabar NUNCA: quem joga bem funde tanto
   quanto solta, o monte não sobe, e o prêmio — que só sai no fim —
   nunca chegava. O transbordo continua valendo, e é o fim de quem joga
   mal; isto é o fim de quem joga bem.

   O número é o orçamento da partida, e é ele que dá a estratégia: com
   sessenta esferas, cada uma solta no lugar errado é uma a menos para
   chegar ao Avatar. */
const FUS_SOLTAS         = [60, 70, 80, 90];
const FUS_FIM_ESPERA     = 1700;   // ms depois da última, para ela assentar

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
let _fusBombas    = 0;
let _fusBombaProx = 0;    // pontos para ganhar a seguinte
let _fusArmado    = false;
let _fusFaiscas   = [];   // { x, y, vx, vy, cor, nasceu }
let _fusRestam    = 0;    // esferas que ainda há para soltar
let _fusFimEm     = null; // quando a última assentou e a partida fecha
let _fusRankAberto = false;
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
  _fusArmado  = false;
  _fusBombas  = 1;                       // uma de graça, para ensinar o gesto
  _fusBombaProx = FUS_BOMBA_CADA[_fusTier];
  _fusRestam  = FUS_SOLTAS[_fusTier];
  _fusFimEm   = null;
  _fusFila    = Array.from({ length: FUS_FILA + 1 }, _fusSorteia);

  const info = document.getElementById('fusaoInfo');
  if (info) info.textContent = t('mg.fus.info', { diff: t(d.i18nKey) });
  const parar = document.getElementById('fusaoPararBtn');
  if (parar) parar.textContent = t('mg.fus.parar');

  _fusLimparResultado();
  _fusPlacar();
  _fusPainel();
  // Depois do painel: a medida do prato conta com ele no cartão.
  _fusMedirPrato();
  _fusMira = (canvas.clientWidth || 224) / 2;
  _fusSincronizarRecorde();
}

// A janela muda de tamanho, o prato acompanha.
let _fusMedirTimer = null;
window.addEventListener('resize', () => {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas || canvas.offsetParent === null) return;
  clearTimeout(_fusMedirTimer);
  _fusMedirTimer = setTimeout(_fusMedirPrato, 150);
});

function _fusSorteia() {
  const quantos = FUS_TIPOS_INICIAIS[_fusTier];
  // Pesos quantos, quantos-1, ... 1: a menor sai mais vezes que a maior.
  const total = quantos * (quantos + 1) / 2;
  let x = Math.random() * total;
  for (let i = 0; i < quantos; i++) {
    x -= (quantos - i);
    if (x <= 0) return i;
  }
  return 0;
}

// O raio da menor esfera do prato de agora — recalculado a cada medida.
let _fusR0 = 12;

function _fusRaio(n) {
  return _fusR0 * Math.pow(FUS_CRESCE, n);
}

/* ── O PRATO PEDE O ESPAÇO QUE SOBRA ──

   A altura dele vinha do CSS, por um desconto adivinhado, e as duas
   pontas saíam erradas: num monitor grande o prato ficava parado no
   meio do vazio, e numa janela baixa as linhas do fim — resultado,
   prêmio, JOGAR DE NOVO, RANKING — caíam abaixo da dobra.

   ── A CONTA TEM DE PARTIR DA JANELA, E NÃO DO CARTÃO ──

   A primeira versão desta função media `cartao.clientHeight`, e isso é
   uma cobra a morder o próprio rabo: o cartão é `flex:0 0 auto` e a
   altura dele vem do conteúdo — que inclui o prato. Cada medida
   descontava o prato de um total que já continha o prato, e em duas
   chamadas a conta caía no piso. Resultado: o prato encolhia sozinho a
   cada partida nova e a cada mudança de janela.

   Agora parte da JANELA (o modal é fixed, inset:0), desconta o recheio
   do modal e do cartão, o que os outros filhos ocupam e uma RESERVA
   para as linhas do fim — que não existem quando a partida começa,
   porque nascem quando ela acaba. Nada disso depende do prato, e por
   isso a conta dá o mesmo número quantas vezes se refaça. */
/* A reserva em rem serve o desktop, onde a raiz é 26,4px. No telemóvel
   ela vale 99px, e isso ficava 25px curto quando o resultado quebra em
   duas linhas — a borda de baixo dos dois botões saía raspada pela
   borda do cartão. Por isso o piso em pixels, medido a 360x640. */
const FUS_RESERVA_REM = 6.2;   // resultado + prêmio + os dois botões

// Os filhos que NÃO entram na conta: o próprio prato, as linhas do fim
// (que a reserva já paga) e o que flutua fora do fluxo — o painel do
// ranking é fixed e mediria 168px de nada.
function _fusForaDaConta(el, canvas) {
  if (el === canvas) return true;
  if (el.id === 'fusaoResult' || el.id === 'fusaoReward') return true;
  if (el.classList && el.classList.contains('mini-btns')) return true;
  const pos = getComputedStyle(el).position;
  return pos === 'fixed' || pos === 'absolute';
}

function _fusMedirPrato() {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return;
  const cartao = canvas.closest('.modal-card') || canvas.parentElement;
  const modal  = document.getElementById('fusaoModal');
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const recheio = (el, a, b) => {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    return parseFloat(cs[a]) + parseFloat(cs[b]);
  };

  const janela = (modal && modal.clientHeight) || window.innerHeight;
  const outros = cartao
    ? Array.from(cartao.children)
        .filter(el => !_fusForaDaConta(el, canvas))
        .reduce((soma, el) => soma + el.getBoundingClientRect().height, 0)
    : 0;

  let alto = janela
    - recheio(modal, 'paddingTop', 'paddingBottom')
    - recheio(cartao, 'paddingTop', 'paddingBottom')
    - outros
    - Math.max(FUS_RESERVA_REM * rem, 7.9 * 16);
  // Nem um selo nem um poço: entre 9 e 26rem.
  alto = Math.max(9 * rem, Math.min(alto, 26 * rem));

  const largoMax = Math.min(
    (cartao ? cartao.clientWidth - recheio(cartao, 'paddingLeft', 'paddingRight')
            : window.innerWidth),
    window.innerWidth - 1.5 * rem
  );
  /* A largura vai até onde o cartão deixa, com um teto de um quarto
     acima da altura: um prato levemente deitado ainda se joga bem, um
     corredor não. Amarrá-la à altura (o `alto * 0,95` de antes) era o
     que impedia o prato de crescer numa tela larga. */
  const largo = Math.max(8 * rem, Math.min(largoMax, alto * 1.25));

  const antesW = canvas.clientWidth, antesH = canvas.clientHeight;
  canvas.style.width  = Math.round(largo) + 'px';
  canvas.style.height = Math.round(alto) + 'px';

  const W = canvas.clientWidth || largo, H = canvas.clientHeight || alto;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

  _fusR0 = Math.min(W, H) * FUS_BASE;
  _fusTopo = Math.round(Math.max(FUS_TOPO_MIN, Math.min(H * FUS_TOPO_FRACAO, FUS_TOPO_MAX)));

  /* Com a partida a correr, o que está no prato acompanha a mudança de
     tamanho: sem isto, mudar a janela no meio do jogo deixava as esferas
     grandes num prato pequeno (ou soltas no ar num prato grande). */
  if (antesW > 0 && antesH > 0 && (antesW !== W || antesH !== H) && _fusEsferas.length) {
    const fx = W / antesW, fy = H / antesH;
    for (const e of _fusEsferas) { e.x *= fx; e.y *= fy; e.r = _fusRaio(e.n); }
  }
}

function _fusPlacar() {
  const el = document.getElementById('fusaoScore');
  if (el) el.textContent = t('mg.fus.placar', { p: _fusPontos, n: _fusFusoes, r: Math.max(0, _fusRestam) });
}

function _fusLimparResultado() {
  const r = document.getElementById('fusaoResult');
  if (r) { r.textContent = ''; r.className = 'mini-result-box'; }
  const p = document.getElementById('fusaoReward');
  if (p) p.textContent = '';
  const b = document.getElementById('fusaoAgainBtn');
  if (b) b.style.display = 'none';
  // O ranking é coisa do fim da partida: fecha-se ao recomeçar.
  const rk = document.getElementById('fusaoRankingBtn');
  if (rk) rk.style.display = 'none';
  // E o ENCERRAR é o contrário: só serve com a partida a correr.
  const parar = document.getElementById('fusaoPararBtn');
  if (parar) parar.style.display = 'inline-block';
  const painel = document.getElementById('fusaoRankingPanel');
  const fundo  = document.getElementById('fusaoRankingBackdrop');
  if (painel) painel.style.display = 'none';
  if (fundo)  fundo.style.display  = 'none';
  _fusRankAberto = false;
}

/* ══ O RECORDE E O RANKING ══

   Igual ao do Snake, e de propósito: um recorde por dificuldade no
   `gs.fusaoBests` (que o save leva junto) e a melhor pontuação de cada
   jogador numa lista no banco em tempo real. O painel é o mesmo desenho
   — as classes .rank-* vivem no css/snake.css.

   Sem carteira, sem avatar ou sem banco, nada disto acontece e o jogo
   segue igual: o ranking é enfeite, não é a partida. */
function _fusGuardarRecorde() {
  if (typeof gs === 'undefined') return;
  if (!gs.fusaoBests) gs.fusaoBests = {};
  const chave = 't' + _fusTier;
  if (_fusPontos <= (gs.fusaoBests[chave] || 0)) return;
  gs.fusaoBests[chave] = _fusPontos;
  if (typeof scheduleSave === 'function') scheduleSave();
  _fusSalvarRanking(_fusPontos, chave);
}

async function _fusSalvarRanking(pontos, chave) {
  if (typeof rtdb !== 'function' || !rtdb() || !walletAddress || !avatar) return;
  try {
    await rtdb().ref(`fusaoRanking/${chave}/${walletAddress}`)
      .set({ nome: nomeCurto(avatar), score: pontos, wallet: walletAddress, ts: Date.now() });
  } catch (e) {}
}

// Quem jogou sem banco tem recorde no save e não na lista: isto os reata.
async function _fusSincronizarRecorde() {
  if (typeof rtdb !== 'function' || !rtdb() || !walletAddress || !avatar) return;
  const bests = (typeof gs !== 'undefined' && gs.fusaoBests) || {};
  for (const [chave, pontos] of Object.entries(bests)) {
    if (!(pontos > 0)) continue;
    try {
      const snap = await rtdb().ref(`fusaoRanking/${chave}/${walletAddress}`).once('value');
      const atual = snap.val();
      if (!atual || atual.score < pontos) _fusSalvarRanking(pontos, chave);
    } catch (e) {}
  }
}

async function fusaoCarregarRanking(chave) {
  const lista = document.getElementById('fusaoRankingList');
  if (!lista) return;
  if (typeof rtdb !== 'function' || !rtdb()) {
    lista.innerHTML = `<div class="rank-loading">${t('fus.rank.erro')}</div>`;
    return;
  }
  lista.innerHTML = `<div class="rank-loading">${t('ui.loading')}</div>`;
  try {
    const snap = await rtdb().ref(`fusaoRanking/${chave}`).orderByChild('score').limitToLast(10).once('value');
    const linhas = Object.values(snap.val() || {}).sort((a, b) => b.score - a.score);
    const medalhas = ['🥇', '🥈', '🥉'];
    lista.innerHTML = linhas.length === 0
      ? `<div class="rank-loading">${t('fus.rank.vazio')}</div>`
      : linhas.map((d, i) => `
          <div class="rank-row${(d.wallet || '') === walletAddress ? ' rank-meu' : ''}">
            <span class="rank-pos">${medalhas[i] || `#${i + 1}`}</span>
            <span class="rank-nome">${esc(d.nome || '???')}</span>
            <span class="rank-pts">${d.score} 🔮</span>
          </div>`).join('');
  } catch (e) {
    lista.innerHTML = `<div class="rank-loading">${t('fus.rank.erro')}</div>`;
  }
}

/* ── ENCERRAR E RECEBER ──

   Com doze degraus e esferas pequenas, uma partida bem jogada demora, e
   pode nunca transbordar. Como o prêmio só sai no fim, jogar bem era
   ficar sem prêmio — bastava o jogador fechar a janela e perder tudo.
   Este botão termina a partida quando ele quiser, com o que já fez. */
function fusaoParar() {
  if (!_fusRodando || _fusAcabou) return;
  _fusFim();
}

function fusaoToggleRanking() {
  _fusRankAberto = !_fusRankAberto;
  const painel = document.getElementById('fusaoRankingPanel');
  const fundo  = document.getElementById('fusaoRankingBackdrop');
  if (painel) painel.style.display = _fusRankAberto ? 'flex' : 'none';
  if (fundo)  fundo.style.display  = _fusRankAberto ? 'block' : 'none';
  if (!_fusRankAberto) return;
  const dt = (typeof DIFF_TIERS !== 'undefined' && DIFF_TIERS[_fusTier]) || null;
  const titulo = document.getElementById('fusaoRankingTitle');
  if (titulo) titulo.textContent = t('fus.rank.titulo', { diff: dt ? t(dt.i18nKey) : '' });
  fusaoCarregarRanking('t' + _fusTier);
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
        const d = 5 + n * 1.15;
        return `<i class="fus-passo${n <= _fusMaior ? ' feito' : ''}" title="${_fusNome(n)}"` +
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
  if (_fusRestam <= 0) return;        // acabaram as esferas da partida
  _fusUltimaSolta = agora;
  _fusRestam--;

  const W = canvas.clientWidth || 224;
  const n = _fusFila[0];
  const r = _fusRaio(n);
  _fusEsferas.push({
    id: _fusIdSeq++,
    x: Math.max(r + 2, Math.min(W - r - 2, x)),
    y: _fusTopo - r - 2,
    vx: 0, vy: 0, n, r,
    nascida: agora, fundidaEm: 0,
  });
  _fusFila.shift();
  _fusFila.push(_fusSorteia());
  _fusPlacar();
  _fusPainel();
}

function _fusPonteiro(clientX) {
  const canvas = document.getElementById('fusaoCanvas');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const W = canvas.clientWidth || 224;
  const r = _fusRaio(_fusFila[0] || 0);
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
function _fusFundir(W, H) {
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
        n, r: _fusRaio(n), nascida: agora, fundidaEm: agora,
      };
      _fusEsferas.splice(j, 1);
      _fusEsferas.splice(i, 1);
      /* Presa ANTES de entrar na lista: ela nasce no meio das duas, já
         com o raio maior, e junto à parede isso a punha até 29px para
         fora — visível por um quadro, como um salto para fora do prato. */
      _fusPrender(nova, W, H);
      _fusEsferas.push(nova);
      _fusFaiscar(nova.x, nova.y, FUS_NIVEIS[n].cor, 10);

      // Os pontos crescem com o nível: juntar duas grandes vale a espera.
      _fusGanhar((n + 1) * (n + 1) * 2);
      _fusFusoes++;
      if (n > _fusMaior) {
        _fusMaior = n;
        showBubble(t('mg.fus.bub.novo', { tipo: _fusNome(n) }));
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

  _fusRestam = 0;
  if (_fusFusoes === 0) {
    if (result) { result.textContent = t('mg.fus.vazio'); result.className = 'mini-result-box lose'; }
  } else {
    const r = miniReward(frac * 1.5, frac * 1.5, Math.min(4, 1 + Math.floor(_fusMaior / 2)));
    if (result) {
      result.textContent = t('mg.fus.fim', {
        p: _fusPontos, tipo: _fusNome(_fusMaior),
      });
      result.className = 'mini-result-box ' + (frac >= 0.6 ? 'win' : '');
    }
    if (reward) reward.textContent = t('mg.reward_xp', { xp: r.xpGain, coins: r.coinGain });
    vitals.humor = Math.min(100, vitals.humor + Math.round(10 * frac));
    scheduleSave();
  }
  const parar = document.getElementById('fusaoPararBtn');
  if (parar) parar.style.display = 'none';

  // O recorde da dificuldade, e a porta do ranking.
  _fusGuardarRecorde();
  const rank = document.getElementById('fusaoRankingBtn');
  if (rank) rank.style.display = 'inline-block';
  if (again) again.style.display = 'inline-block';
}

// ── Desenhar ───────────────────────────────────────────────────────
function _fusEsfera(ctx, e, agora) {
  const nv = FUS_NIVEIS[e.n];
  // A recém-fundida dá um estalo: cresce e volta.
  const salto = e.fundidaEm ? Math.max(0, 1 - (agora - e.fundidaEm) / 260) : 0;
  const r = e.r * (1 + 0.22 * salto);
  if (r <= 0.5) return;

  ctx.save();

  /* Havia aqui uma sombra elíptica debaixo de cada esfera. Ela só faz
     sentido quando a esfera está pousada em alguma coisa — no ar, a
     mancha cai junto com ela e parece sujeira colada no vidro. */
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

  // Com a bomba armada, todas piscam de leve: são todas alvo.
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
    _fusFundir(W, H);

    /* Acabaram as esferas? Espera a última assentar e fecha — as fusões
       que ela provocar ainda contam, que é o justo. */
    if (_fusRestam <= 0) {
      if (_fusFimEm == null) _fusFimEm = agora + FUS_FIM_ESPERA;
      else if (agora >= _fusFimEm) { _fusFim(); }
    }

    /* ── TRANSBORDOU? ──

       Conta a esfera que está acima da linha há mais de um segundo: a
       que acabou de ser solta nasce lá em cima e cai antes disso, e por
       isso não conta.

       Havia aqui também uma condição de VELOCIDADE — só contava a
       esfera parada — e era ela o defeito: num monte apertado as
       esferas nunca param de tremer, portanto a partida não acabava
       nunca, por mais alto que o monte ficasse. */
    const estourando = _fusEsferas.some(e =>
      e.y - e.r < _fusTopo && agora - e.nascida > FUS_ESTOURO_IDADE);
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
  ctx.moveTo(1, _fusTopo - 14); ctx.lineTo(1, H - 1); ctx.lineTo(W - 1, H - 1); ctx.lineTo(W - 1, _fusTopo - 14);
  ctx.stroke();

  // A linha da borda, que pisca quando está prestes a transbordar.
  const perigo = _fusEstouroDesde != null;
  ctx.strokeStyle = perigo
    ? `rgba(248,113,113,${(0.4 + 0.35 * Math.sin(agora / 90)).toFixed(2)})`
    : 'rgba(212,175,55,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, _fusTopo); ctx.lineTo(W, _fusTopo);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── A mira e a esfera na mão ──
  if (_fusRodando && !_fusAcabou && !_fusArmado) {
    const n = _fusFila[0] || 0;
    const r = _fusRaio(n);
    const g = ctx.createLinearGradient(0, _fusTopo, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(_fusMira, _fusTopo); ctx.lineTo(_fusMira, H);
    ctx.stroke();
    _fusEsfera(ctx, { id: -1, x: _fusMira, y: _fusTopo - r - 2, r, n, fundidaEm: 0 }, agora);
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
