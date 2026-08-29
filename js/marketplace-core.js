// ═══════════════════════════════════════════
// MARKETPLACE — CORE
// ═══════════════════════════════════════════

const PAYMENT_ADDRESS  = '0x1FCb61dB743A0276b92382B9e7B92a62cA8cf030';
const POLYGONSCAN_API  = 'https://api.polygonscan.com/api';
const LIST_COST        = 2;
const UNLOCK_SLOT_COST = 15;

let playerData     = null;
let listings       = [];
let listingUnsub   = null;
let listingSlotIdx = null;
let currentSection = 'browse';

// ── Carregar dados do jogador ──
// Constroi playerData a partir do estado vivo do jogo (gs/avatarSlots ja
// carregados por firebase.js no login) - sem round-trip extra ao Firestore e
// sem risco de ficar dessincronizado do que o HUD do jogo mostra.
async function loadPlayerData() {
  if(typeof gs !== 'undefined' && typeof avatarSlots !== 'undefined') {
    playerData = {
      cristais:      gs.cristais      || 0,
      avatarSlots:   avatarSlots,
      activeSlotIdx: activeSlotIdx,
      extraSlots:    gs.extraSlots    || 0,
      carteira:      window._playerCarteira || null,
      gs:            gs,
    };
    if(playerData.carteira === null) {
      try {
        const snap = await db.collection('players').doc(walletAddress).get();
        const carteira = snap.data()?.carteira || null;
        window._playerCarteira = carteira;
        playerData.carteira = carteira;
      } catch(e) {}
    }
  } else {
    const snap = await db.collection('players').doc(walletAddress).get();
    playerData = snap.exists ? snap.data() : { cristais:0, avatarSlots:[null,null,null], activeSlotIdx:0, extraSlots:0 };
    playerData.cristais      = playerData.gs?.cristais      ?? playerData.cristais      ?? 0;
    playerData.avatarSlots   = playerData.avatarSlots   || [null,null,null];
    playerData.activeSlotIdx = playerData.gs?.activeSlotIdx ?? playerData.activeSlotIdx ?? 0;
    playerData.extraSlots    = playerData.gs?.extraSlots    ?? playerData.extraSlots    ?? 0;
  }
  updateCristaisDisplay();
}

async function savePlayerData() {
  if(!walletAddress) return;
  if(typeof scheduleSave === 'function') {
    scheduleSave();
  } else {
    // Caminho de recurso, de quando o marketplace era página à parte. Grava
    // o playerData inteiro — e esse objeto traz cristais e extraSlots, que
    // as regras já não deixam o cliente escrever. Sem esta limpeza a
    // gravação seria recusada por inteiro, levando com ela o que era
    // legítimo. Ver firestore.rules, match /players.
    const semDinheiro = {};
    for (const k of Object.keys(playerData)) {
      if (k === 'cristais' || k === 'extraSlots' || k === 'resgateLog'
       || k === 'ultimoResgate' || k === 'cambioLog' || k === 'ultimoCambio'
       || k === 'referralBonus' || k === 'referralChain') continue;
      if (k === 'gs' && playerData.gs) {
        const gsLimpo = {};
        for (const g of Object.keys(playerData.gs)) {
          if (g !== 'cristais' && g !== 'extraSlots') gsLimpo[g] = playerData.gs[g];
        }
        semDinheiro.gs = gsLimpo;
        continue;
      }
      semDinheiro[k] = playerData[k];
    }
    await db.collection('players').doc(walletAddress).set(semDinheiro, { merge: true });
  }
  updateCristaisDisplay();
}

/* O SALDO DE CRISTAIS, A SÉRIO
   ═══════════════════════════════════════════════════════════════════
   O loadPlayerData() monta o playerData a partir do estado vivo do jogo,
   mas com uma diferença que passava despercebida: o playerData.gs é uma
   REFERÊNCIA ao objeto do jogo, enquanto o playerData.cristais é uma
   CÓPIA tirada no momento. E o openMarketplaceModal só chama o
   loadPlayerData na PRIMEIRA abertura (guarda _mktOpened).

   Resultado: quem ganhasse cristais no jogo — queimar um ovo, um câmbio
   — e voltasse ao marketplace via a cópia antiga. E o pior é que a TELA
   mostrava o valor certo, porque o updateCristaisDisplay já lia o gs
   primeiro: dizia 40 cristais enquanto o botão dizia "Sem saldo".

   Esta função é a leitura única. O gs manda; a cópia é o recurso para
   quando o marketplace corre sem o jogo por baixo. */
function mktCristais() {
  return playerData?.gs?.cristais ?? playerData?.cristais ?? 0;
}

function updateCristaisDisplay() {
  if(typeof updateResourceUI === 'function') { updateResourceUI(); return; }
  const v = mktCristais();
  const el = document.getElementById('hdrCristais');
  if(el) el.textContent = fmtC(v);
}

// ── Render MetaMask CTA na seção de cristais ──
function renderMetaMaskCta() {
  const wrap = document.getElementById('metamaskCtaWrap');
  if(!wrap) return;
  const carteira = playerData?.carteira;
  if(carteira) {
    wrap.innerHTML = `
      <div class="metamask-linked">
        <div class="metamask-linked-dot"></div>
        <div>
          <div class="metamask-linked-txt">${t('mkt.metamask.linked')}</div>
          <div class="metamask-linked-addr">${carteira.slice(0,6)}...${carteira.slice(-4)}</div>
        </div>
      </div>`;
  } else {
    wrap.innerHTML = `
      <div class="metamask-cta">
        <div class="metamask-cta-title">${t('mkt.metamask.title')}</div>
        <div class="metamask-cta-sub">${t('mkt.metamask.sub')}</div>
        <button class="btn-metamask" onclick="vincularCarteira().then(renderMetaMaskCta)">${t('mkt.metamask.btn')}</button>
      </div>`;
  }
}

// ── Navegação ──
function showSection(id) {
  currentSection = id;
  document.querySelectorAll('.mkt-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.mkt-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-'+id).classList.add('active');
  document.getElementById('nav-'+id)?.classList.add('active');
  document.querySelectorAll('.mkt-section:not(.active)').forEach(sec => {
    sec.querySelectorAll('svg').forEach(svg => { svg.innerHTML=''; svg.remove(); });
  });
  renderSection();
}

function renderSection() {
  if(currentSection === 'browse')        renderBrowse();
  if(currentSection === 'buycrystals')   { renderCrystals(); renderMetaMaskCta(); }
  if(currentSection === 'referral')      renderReferral();
  if(currentSection === 'eggs')          loadEggListings();
  if(currentSection === 'transparencia') { renderPoolSection(); renderTransparencia(); }
}

// ── Utils ──
let _toastTimer = null;
function showToast(msg, type='ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = ''; }, 3500);
}

// Este script carrega no cluster de <script src> de index.html, ANTES do
// HTML de #marketplaceModal (que fica mais abaixo no body, junto aos outros
// overlays globais como avatarZoomOverlay) — por isso os listeners de
// clique-fora só podem ser presos depois do DOM estar pronto.
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('listOverlay')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeListModal(); });
  document.getElementById('avatarDetailOverlay')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeDetail(); });
});

// -- Abrir/fechar o marketplace como modal do jogo --
// Substitui a antiga navegacao de pagina inteira (marketplace.html) e o
// login duplicado (marketplace-auth.js) - o modal so e alcancavel estando
// ja autenticado dentro de index.html.
let _mktOpened = false;
/* Preenche as listas de elemento a partir do ELEM_CFG.

   Estavam escritas à mão no index.html e ficaram para trás: ofereciam
   Eletricidade e Luz, que o jogo não tem — filtrar por elas dava sempre
   lista vazia, sem explicação nenhuma. O jogo tem cinco: Fogo, Água,
   Terra, Vento e Sombra.

   Gerar daqui é o que impede a mesma deriva de acontecer outra vez:
   acrescentar um elemento ao ELEM_CFG passa a chegar aos filtros
   sozinho. Os nomes vão como estão — são identificadores, e é assim que
   aparecem em todo o resto do jogo, incluindo em inglês. */
function _mktEncherFiltrosDeElemento() {
  if (typeof ELEM_CFG === 'undefined') return;
  const nomes = Object.keys(ELEM_CFG);
  for (const id of ['filterElem', 'eggFilterElem']) {
    const sel = document.getElementById(id);
    if (!sel || sel.tagName !== 'SELECT') continue;
    const escolhido = sel.value;
    // A primeira opção é o "Todos", que é traduzido e fica.
    while (sel.options.length > 1) sel.remove(1);
    for (const nome of nomes) {
      const o = document.createElement('option');
      o.value = nome;
      // O emoji está no CARACTERISTICAS_ELEMENTAIS, não no ELEM_CFG (que
      // guarda as cores). As chaves dos dois são as mesmas, mas convém
      // não assumir: sem emoji, mostra-se só o nome.
      const car = (typeof CARACTERISTICAS_ELEMENTAIS !== 'undefined')
                    ? CARACTERISTICAS_ELEMENTAIS[nome] : null;
      o.textContent = (car && car.emoji ? car.emoji + ' ' : '') + nome;
      sel.appendChild(o);
    }
    // Preserva a escolha do jogador se ela ainda existir.
    if (escolhido && nomes.includes(escolhido)) sel.value = escolhido;
  }
}

async function openMarketplaceModal(section) {
  ModalManager.open('marketplaceModal');
  _mktEncherFiltrosDeElemento();
  if(!_mktOpened) {
    _mktOpened = true;
    await loadPlayerData();
    loadListings();
    await loadPool();
  }
  showSection(section || 'browse');
}
function closeMarketplaceModal() {
  ModalManager.close('marketplaceModal');
}

// -- Zoom de avatar -- reaproveita o modal ja existente do jogo principal
// (openAvatarZoomData, definido em js/main.js) em vez de duplicar overlay/CSS. --
function mktOpenZoom(elemento, raridade, seed, nivelAv, nome) {
  openAvatarZoomData(elemento, raridade, seed, nivelAv, nome);
}
function mktOpenZoomBtn(btn) {
  mktOpenZoom(btn.dataset.el, btn.dataset.rar, parseInt(btn.dataset.seed)||0, parseInt(btn.dataset.nivel)||1, btn.dataset.nome);
}

// -- Bottom nav mobile (dentro do modal) --
function _mbnActive(btn) {
  document.querySelectorAll('.mkt-bn-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
