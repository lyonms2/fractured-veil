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

const EGG_LIST_FEE = 0;    // sem taxa de listagem — mais simples para ovos
const EGG_SALE_TAX = 0.10; // 10% da venda vai para a pool

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
      <div class="empty-txt">Nenhum ovo à venda de momento.<br>Avatares Raros e Lendários adultos botam ovos que podes listar aqui.</div>
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
      ${isOwn ? '<div class="egg-mkt-own">Teu</div>' : ''}
      <div class="egg-mkt-stripe"></div>
      <div class="egg-mkt-inner">
        <div class="egg-mkt-icon">${icon}</div>
        <div class="egg-mkt-pill">${elemEmoji} ${egg.raridade}</div>
        <div class="egg-mkt-elem">${egg.elemento || '—'}</div>
        <div class="egg-mkt-stats">
          <div class="egg-mkt-stat"><span>Expira</span><b class="${expiryUrgente ? 'urgente' : ''}">${expiryDias > 0 ? expiryDias+'d' : '⚠️'}</b></div>
          <div class="egg-mkt-stat"><span>Vendedor</span><b>${seller}</b></div>
        </div>
        <div class="egg-mkt-price">💎 ${egg.price}</div>
        ${isOwn
          ? `<button class="btn-buy-egg-mkt" style="background:rgba(232,96,58,.15);color:var(--red2);border:1px solid rgba(232,96,58,.3);"
               onclick="event.stopPropagation();unlistEgg('${egg.id}')">✕ Retirar listagem</button>`
          : `<button class="btn-buy-egg-mkt" ${!canBuy ? 'disabled' : ''}
               onclick="event.stopPropagation();buyEggFromMarket('${egg.id}')">
               ${!playerData || playerData.cristais < egg.price ? 'Sem saldo' : '💎 Comprar'}
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
      <div class="egg-list-preview-name">${ovoData.raridade} · ${ovoData.elemento}</div>
      <div class="egg-list-preview-sub">10% da venda vai para a pool P2E</div>
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
    document.getElementById('listEggStatus').textContent = 'Define um preço válido (mínimo 1 💎).';
    return;
  }

  const statusEl = document.getElementById('listEggStatus');
  statusEl.textContent = 'A listar...';

  try {
    // Lê inboxEggs frescos para remover o ovo correcto
    const freshSnap = await db.collection('players').doc(walletAddress).get();
    const freshData = freshSnap.data() || {};
    const inboxEggs = freshData.inboxEggs || [];
    const ovoIdx = inboxEggs.findIndex(e => e.id === listingEggData.id);
    if(ovoIdx === -1) {
      statusEl.textContent = 'Ovo não encontrado no inventário.';
      return;
    }
    const ovoToRemove = inboxEggs[ovoIdx];

    // Remove do inboxEggs e cria listagem em batch atómico
    const listingRef = db.collection('eggMarket').doc();
    const batch = db.batch();
    batch.update(db.collection('players').doc(walletAddress), {
      inboxEggs: firebase.firestore.FieldValue.arrayRemove(ovoToRemove)
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

    closeListEggModal();
    showToast(`✅ Ovo ${listingEggData.raridade} listado por ${price} 💎!`, 'ok');
    // Actualiza inventário local (game vai sync no próximo load)
    if(playerData.inboxEggs) {
      playerData.inboxEggs = playerData.inboxEggs.filter(e => e.id !== listingEggData.id);
    }
  } catch(e) {
    console.error(e);
    statusEl.textContent = 'Erro ao listar. Tenta novamente.';
  }
}

// ═══════════════════════════════════════════
// COMPRAR OVO
// ═══════════════════════════════════════════
async function buyEggFromMarket(listingId) {
  if(!playerData || !walletAddress) return;

  let egg = null;
  try {
    const listRef  = db.collection('eggMarket').doc(listingId);
    const buyerRef = db.collection('players').doc(walletAddress);

    // Transacção atómica — evita dupla compra por compradores simultâneos
    await db.runTransaction(async (tx) => {
      const listSnap = await tx.get(listRef);
      if(!listSnap.exists || listSnap.data().status !== 'listed') throw new Error('NOT_AVAILABLE');
      egg = listSnap.data();
      if(egg.sellerId === walletAddress) throw new Error('OWN_EGG');

      const buyerSnap     = await tx.get(buyerRef);
      const buyerData     = buyerSnap.data() || {};
      const freshCristais = buyerData.gs?.cristais ?? buyerData.cristais ?? 0;
      if(freshCristais < egg.price) throw new Error('INSUFFICIENT');

      const taxa         = Math.round(egg.price * EGG_SALE_TAX);
      const sellerRecebe = egg.price - taxa;
      const newCristais  = freshCristais - egg.price;
      const newEgg = { id: egg.eggId || Date.now(), raridade: egg.raridade, elemento: egg.elemento, expiraEm: egg.expiraEm };

      tx.update(buyerRef, {
        cristais:      newCristais,
        'gs.cristais': newCristais,
        inboxEggs:     firebase.firestore.FieldValue.arrayUnion(newEgg),
      });

      const sellerRef  = db.collection('players').doc(egg.sellerId);
      const sellerSnap = await tx.get(sellerRef);
      const sellerData = sellerSnap.data() || {};
      const sellerCris = sellerData.gs?.cristais ?? sellerData.cristais ?? 0;
      tx.update(sellerRef, {
        cristais:      sellerCris + sellerRecebe,
        'gs.cristais': sellerCris + sellerRecebe,
      });

      tx.delete(listRef);
    });

    // Taxa para a pool (fora da transacção — tem o seu próprio batch)
    const taxa = Math.round(egg.price * EGG_SALE_TAX);
    if(taxa > 0) await addToPool(taxa, `venda ovo ${egg.raridade} · ${egg.elemento}`, egg.sellerId);

    playerData.cristais = (playerData.cristais || 0) - egg.price;
    if(!playerData.gs) playerData.gs = {};
    playerData.gs.cristais = playerData.cristais;
    updateCristaisDisplay();

    showToast(`✅ Ovo ${egg.raridade} ${egg.elemento} adquirido! Vai para o teu inventário no jogo.`, 'ok');
  } catch(e) {
    if(e.message === 'NOT_AVAILABLE') showToast('Ovo já não disponível.', 'err');
    else if(e.message === 'OWN_EGG')  showToast('Não podes comprar o teu próprio ovo.', 'err');
    else if(e.message === 'INSUFFICIENT') showToast('Cristais insuficientes.', 'err');
    else { console.error(e); showToast('Erro ao comprar ovo. Tenta novamente.', 'err'); }
  }
}

// ═══════════════════════════════════════════
// RETIRAR OVO DA VENDA
// ═══════════════════════════════════════════
async function unlistEgg(listingId) {
  try {
    const listRef  = db.collection('eggMarket').doc(listingId);
    const listSnap = await listRef.get();
    if(!listSnap.exists) { showToast('Listagem não encontrada.','err'); return; }
    const egg = listSnap.data();
    if(egg.sellerId !== walletAddress) { showToast('Não autorizado.','err'); return; }

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

    showToast('Ovo retirado da venda e devolvido ao inventário.', 'ok');
  } catch(e) {
    console.error(e);
    showToast('Erro ao retirar listagem.', 'err');
  }
}
