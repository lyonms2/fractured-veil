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
    await db.collection('players').doc(walletAddress).set(playerData, { merge: true });
  }
  updateCristaisDisplay();
}

function updateCristaisDisplay() {
  if(typeof updateResourceUI === 'function') { updateResourceUI(); return; }
  const v = playerData?.gs?.cristais ?? playerData?.cristais ?? 0;
  const el = document.getElementById('hdrCristais');
  if(el) el.textContent = fmtC(v);
}

// ── Render MetaMask CTA na secção de cristais ──
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
async function openMarketplaceModal(section) {
  ModalManager.open('marketplaceModal');
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
