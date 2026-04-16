// ═══════════════════════════════════════════════════════════════════
// OVOS — Marketplace de ovos entre jogadores
// Depende de: db (global), firebase (global), walletAddress (global),
//             playerData (global), currentSection (global),
//             addToPool() (pool.js),
//             updateCristaisDisplay() (marketplace.html inline),
//             showToast() (marketplace.html inline),
//             CARACTERISTICAS_ELEMENTAIS (data.js)
// ═══════════════════════════════════════════════════════════════════

let eggListings     = [];
let eggListingUnsub = null;
let listingEggData  = null; // ovo a listar

const EGG_LIST_FEE = { 'Raro': 25, 'Lendário': 50 }; // 💎 de taxa por raridade
const EGG_SALE_TAX = 0.10; // 10% da venda vai para a pool

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('listEggOverlay');
  if(overlay) overlay.addEventListener('click', e => { if(e.target === overlay) closeListEggModal(); });
});

// ═══════════════════════════════════════════
// CARREGAR LISTAGENS DE OVOS (listener em tempo real)
// ═══════════════════════════════════════════
function loadEggListings() {
  if(eggListingUnsub) eggListingUnsub();
  eggListingUnsub = db.collection('eggMarket')
    .where('status','==','listed')
    .onSnapshot(snap => {
      eggListings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if(currentSection === 'eggs') renderEggBrowse();
    }, err => console.warn('eggMarket snapshot error:', err));
}

// ═══════════════════════════════════════════
// GRELHA DE OVOS
// ═══════════════════════════════════════════
function renderEggBrowse() {
  const grid = document.getElementById('eggBrowseGrid');
  if(!grid) return;

  const elemFilter = (document.getElementById('eggFilterElem')?.value || '').toLowerCase();
  const rarFilter  = document.getElementById('eggFilterRarity')?.value || '';
  const sort       = document.getElementById('eggFilterSort')?.value || 'recent';

  let list = eggListings.filter(e => {
    if(rarFilter  && e.raridade !== rarFilter) return false;
    if(elemFilter && !(e.elemento||'').toLowerCase().includes(elemFilter)) return false;
    return true;
  });

  if(sort === 'price_asc')  list.sort((a,b) => a.price - b.price);
  if(sort === 'price_desc') list.sort((a,b) => b.price - a.price);
  if(sort === 'recent')     list.sort((a,b) => (b.listedAt||0) - (a.listedAt||0));

  if(!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">🥚</div>
      <div class="empty-txt">${t('mkt.eggs.empty').replace('\n','<br>')}</div>
    </div>`;
    return;
  }

  const now = Date.now();
  grid.innerHTML = list.map(egg => {
    const isOwn = egg.sellerId === walletAddress;
    const icon  = egg.raridade === 'Lendário' ? '🌟' : '🔵';
    const cls   = egg.raridade === 'Lendário' ? 'lendario' : 'raro';
    const seller = egg.sellerId ? egg.sellerId.slice(0,6)+'…'+egg.sellerId.slice(-4) : '—';
    const expiryMs     = egg.expiraEm - now;
    const expiryDias   = Math.max(0, Math.ceil(expiryMs / 86400000));
    const expiryUrgente = expiryDias <= 2;
    const canBuy       = !isOwn && playerData && playerData.cristais >= egg.price;

    const elemCar   = CARACTERISTICAS_ELEMENTAIS?.[egg.elemento];
    const elemEmoji = elemCar ? elemCar.emoji : '✦';
    return `<div class="egg-mkt-card ${cls}">
      ${isOwn ? `<div class="egg-mkt-own">${t('mkt.eggs.own')}</div>` : ''}
      <div class="egg-mkt-stripe"></div>
      <div class="egg-mkt-inner">
        <div class="egg-mkt-icon">${icon}</div>
        <div class="egg-mkt-pill">${elemEmoji} ${esc(egg.raridade)}</div>
        <div class="egg-mkt-elem">${esc(egg.elemento) || '—'}</div>
        <div class="egg-mkt-stats">
          <div class="egg-mkt-stat"><span>${t('mkt.eggs.expires')}</span><b class="${expiryUrgente ? 'urgente' : ''}">${expiryDias > 0 ? expiryDias+'d' : '⚠️'}</b></div>
          <div class="egg-mkt-stat"><span>${t('mkt.eggs.seller')}</span><b>${seller}</b></div>
        </div>
        <div class="egg-mkt-price">💎 ${egg.price}</div>
        ${isOwn
          ? `<button class="btn-buy-egg-mkt" style="background:rgba(232,96,58,.15);color:var(--red2);border:1px solid rgba(232,96,58,.3);"
               onclick="event.stopPropagation();unlistEgg('${egg.id}')">${t('mkt.eggs.unlist_btn')}</button>`
          : `<button class="btn-buy-egg-mkt" ${!canBuy ? 'disabled' : ''}
               onclick="event.stopPropagation();buyEggFromMarket('${egg.id}')">
               ${!playerData || playerData.cristais < egg.price ? t('mkt.eggs.no_balance') : t('mkt.eggs.buy_btn')}
             </button>`
        }
      </div>
    </div>`;
  }).join('');
}

// Placeholder para modal de detalhe futuro
function openEggDetail(id) {
  // por agora só o botão nos cards — futuramente modal de detalhe
}

// ═══════════════════════════════════════════
// LISTAR OVO À VENDA
// ═══════════════════════════════════════════
function openListEggModal(ovoData) {
  listingEggData = ovoData;
  const icon = ovoData.raridade === 'Lendário' ? '🌟' : '🔵';
  document.getElementById('listEggPreview').innerHTML = `
    <div class="egg-list-preview">
      <div class="egg-list-preview-icon">${icon}</div>
      <div class="egg-list-preview-name">${esc(ovoData.raridade)} · ${esc(ovoData.elemento)}</div>
      <div class="egg-list-preview-sub">${t('mkt.eggs.list_fee', {fee: EGG_LIST_FEE[ovoData.raridade] || 0})}</div>
    </div>`;
  document.getElementById('listEggPriceInput').value = '';
  document.getElementById('listEggStatus').textContent = '';
  document.getElementById('listEggOverlay').style.display = 'flex';
}

function closeListEggModal() {
  document.getElementById('listEggOverlay').style.display = 'none';
  listingEggData = null;
}

async function confirmListEgg() {
  if(!listingEggData || !walletAddress) return;
  const price = parseInt(document.getElementById('listEggPriceInput').value);
  if(!price || price < 1) {
    document.getElementById('listEggStatus').textContent = t('mkt.eggs.price_invalid');
    return;
  }

  const statusEl = document.getElementById('listEggStatus');
  const taxa = EGG_LIST_FEE[listingEggData.raridade] || 0;

  // Verificar saldo para a taxa de listagem
  if((playerData?.cristais || 0) < taxa) {
    statusEl.textContent = t('mkt.eggs.list_cost', {cost: taxa});
    return;
  }

  statusEl.textContent = t('mkt.eggs.listing');

  try {
    // Lê dados frescos para evitar saldo desactualizado
    const freshSnap = await db.collection('players').doc(walletAddress).get();
    const freshData = freshSnap.data() || {};
    const freshCristais = freshData.gs?.cristais ?? freshData.cristais ?? 0;

    if(freshCristais < taxa) {
      statusEl.textContent = t('mkt.eggs.list_cost', {cost: taxa});
      return;
    }

    const inboxEggs = freshData.inboxEggs || [];
    const ovoIdx = inboxEggs.findIndex(e => e.id === listingEggData.id);
    if(ovoIdx === -1) {
      statusEl.textContent = t('mkt.eggs.not_in_inv');
      return;
    }
    const ovoToRemove = inboxEggs[ovoIdx];
    const newCristais = freshCristais - taxa;

    // Remove do inboxEggs, debita taxa e cria listagem em batch atómico
    const listingRef = db.collection('eggMarket').doc();
    const batch = db.batch();
    batch.update(db.collection('players').doc(walletAddress), {
      inboxEggs:     firebase.firestore.FieldValue.arrayRemove(ovoToRemove),
      cristais:      newCristais,
      'gs.cristais': newCristais,
    });
    batch.set(listingRef, {
      raridade:  listingEggData.raridade,
      elemento:  listingEggData.elemento,
      expiraEm:  listingEggData.expiraEm,
      eggId:     listingEggData.id,
      sellerId:  walletAddress,
      price,
      status:   'listed',
      listedAt:  Date.now(),
    });
    await batch.commit();

    // Actualiza estado local
    playerData.cristais = newCristais;
    if(!playerData.gs) playerData.gs = {};
    playerData.gs.cristais = newCristais;
    updateCristaisDisplay();
    if(playerData.inboxEggs) {
      playerData.inboxEggs = playerData.inboxEggs.filter(e => e.id !== listingEggData.id);
    }

    // Taxa vai para a pool
    if(taxa > 0) await addToPool(taxa, `listagem ovo ${listingEggData.raridade}`);

    closeListEggModal();
    showToast(t('mkt.eggs.listed', {rarity: listingEggData.raridade, price}), 'ok');
  } catch(e) {
    console.error(e);
    statusEl.textContent = t('mkt.eggs.list_err');
  }
}

// ═══════════════════════════════════════════
// COMPRAR OVO
// ═══════════════════════════════════════════
async function buyEggFromMarket(listingId) {
  if(!playerData || !walletAddress) return;

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/comprar-ovo', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ listingId, idToken }),
    });
    const data = await resp.json();
    if(!resp.ok) { showToast(data.erro || t('mkt.eggs.buy_err'), 'err'); return; }

    playerData.cristais = data.novoSaldo;
    if(!playerData.gs) playerData.gs = {};
    playerData.gs.cristais = data.novoSaldo;
    updateCristaisDisplay();

    showToast(t('mkt.eggs.bought', {rarity: esc(data.raridade), elem: esc(data.elemento)}), 'ok');
  } catch(e) {
    if(e.message === 'NOT_AVAILABLE') showToast(t('mkt.eggs.unavailable'), 'err');
    else if(e.message === 'OWN_EGG')  showToast(t('mkt.eggs.own_egg'), 'err');
    else if(e.message === 'INSUFFICIENT') showToast(t('mkt.avatar.insufficient'), 'err');
    else { console.error(e); showToast(t('mkt.eggs.buy_err2'), 'err'); }
  }
}

// ═══════════════════════════════════════════
// DEEP-LINK: abrir modal de listagem via URL param
// ═══════════════════════════════════════════
function checkPendingEggListing() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('listEgg');
  if(!raw) return;
  // Limpa os params da URL para não reabrir em navegações futuras
  history.replaceState(null, '', window.location.pathname);
  try {
    const ovoData = JSON.parse(atob(raw));
    openListEggModal(ovoData);
  } catch(e) {
    console.warn('[checkPendingEggListing] param inválido', e);
  }
}

// ═══════════════════════════════════════════
// RETIRAR OVO DA VENDA
// ═══════════════════════════════════════════
async function unlistEgg(listingId) {
  try {
    const listRef  = db.collection('eggMarket').doc(listingId);
    const listSnap = await listRef.get();
    if(!listSnap.exists) { showToast(t('mkt.avatar.unlist_404'),'err'); return; }
    const egg = listSnap.data();
    if(egg.sellerId !== walletAddress) { showToast(t('mkt.eggs.unauthorized'),'err'); return; }

    // Devolve ovo ao inboxEggs e apaga listagem em batch atómico
    const ovoRestaurado = {
      id:       egg.eggId || Date.now(),
      raridade: egg.raridade,
      elemento: egg.elemento,
      expiraEm: egg.expiraEm,
    };
    const unlistBatch = db.batch();
    unlistBatch.update(db.collection('players').doc(walletAddress), {
      inboxEggs: firebase.firestore.FieldValue.arrayUnion(ovoRestaurado)
    });
    unlistBatch.delete(listRef);
    await unlistBatch.commit();

    showToast(t('mkt.eggs.unlisted'), 'ok');
  } catch(e) {
    console.error(e);
    showToast(t('mkt.avatar.unlist_err'), 'err');
  }
}
