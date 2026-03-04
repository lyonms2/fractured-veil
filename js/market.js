// ═══════════════════════════════════════════════════════════════════
// MERCADO DE OVOS
// ═══════════════════════════════════════════════════════════════════
let mktCurrentTab  = 'buy';
let mktSellEggId   = null;
let mktUnsub       = null;

function openMarket() {
  if(!walletAddress) { addLog('Conecte a carteira para acessar o mercado.', 'bad'); return; }
  mktTab('buy');
  ModalManager.open('marketModal');
}

function closeMarket() {
  ModalManager.close('marketModal');
  if(mktUnsub) { mktUnsub(); mktUnsub = null; }
}

function mktTab(tab) {
  mktCurrentTab = tab;
  document.getElementById('mktBuyPanel').style.display  = tab === 'buy'  ? 'block' : 'none';
  document.getElementById('mktSellPanel').style.display = tab === 'sell' ? 'flex' : 'none';
  document.getElementById('mktTabBuy').classList.toggle('active',  tab === 'buy');
  document.getElementById('mktTabSell').classList.toggle('active', tab === 'sell');
  if(tab === 'buy')  loadMarketListings();
  if(tab === 'sell') renderMyEggsForSale();
}

function loadMarketListings() {
  if(!fbDb()) return;
  if(mktUnsub) mktUnsub();
  mktUnsub = fbDb().collection('market')
    .where('status', '==', 'listed')
    .orderBy('listedAt', 'desc')
    .onSnapshot(snap => {
      const listings = [];
      snap.forEach(d => listings.push({ id: d.id, ...d.data() }));
      renderListings(listings);
    }, e => {
      document.getElementById('mktEmpty').style.display = 'block';
      document.getElementById('mktListings').innerHTML  = '';
      console.warn('Market error:', e);
    });
}

const RAR_COLOR = { 'Comum':'#7ab87a', 'Raro':'#5ab4e8', 'Lendário':'#e8a030' };
const RAR_EMOJI = { 'Comum':'🥚', 'Raro':'💙', 'Lendário':'🌟' };

function renderListings(listings) {
  const el = document.getElementById('mktListings');
  const empty = document.getElementById('mktEmpty');
  // Filter out own listings and expired
  const valid = listings.filter(l => l.sellerId !== walletAddress && Date.now() < l.expiraEm);
  if(valid.length === 0) { empty.style.display = 'block'; el.innerHTML = ''; return; }
  empty.style.display = 'none';
  el.innerHTML = valid.map(l => {
    const short = l.sellerId.slice(0,6) + '...' + l.sellerId.slice(-4);
    const canBuy = gs.moedas >= l.price;
    return `<div class="mkt-item">
      <div class="mkt-item-icon">${RAR_EMOJI[l.raridade]}</div>
      <div class="mkt-item-info">
        <div class="mkt-item-name" style="color:${RAR_COLOR[l.raridade]}">${l.raridade} · ${l.elemento}</div>
        <div class="mkt-item-sub">Vendedor: ${short}</div>
      </div>
      <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <div class="mkt-item-price">${l.price} 🪙</div>
        <button class="mkt-buy-btn" ${canBuy?'':'disabled'} onclick="buyFromMarket('${l.id}',${l.price})">COMPRAR</button>
      </div>
    </div>`;
  }).join('');
}

async function buyFromMarket(listingId, price) {
  if(!walletAddress || !fbDb()) return;
  if(gs.moedas < price) { showBubble('Sem moedas! 😢'); return; }
  try {
    const ref  = fbDb().collection('market').doc(listingId);
    const snap = await ref.get();
    if(!snap.exists || snap.data().status !== 'listed') {
      addLog('Este ovo já foi vendido!', 'bad'); return;
    }
    const data = snap.data();
    if(Date.now() > data.expiraEm) {
      await ref.update({ status: 'expired' });
      addLog('Este ovo apodreceu antes da compra.', 'bad'); return;
    }
    spendCoins(price);
    eggsInInventory.push({ raridade: data.raridade, elemento: data.elemento, expiraEm: data.expiraEm, id: Date.now() });
    await ref.update({ status: 'sold', buyerId: walletAddress, soldAt: firebase.firestore.FieldValue.serverTimestamp() });
    await saveToFirebase();
    renderEggInventory();
    updateResourceUI();
    addLog(`Comprou ovo ${data.raridade} de ${data.elemento}! 🎉`, 'good');
    showBubble('Ovo comprado! 🥚');
  } catch(e) {
    console.error('Buy error:', e);
    addLog('Erro ao comprar. Tente novamente.', 'bad');
  }
}

function renderMyEggsForSale() {
  const el = document.getElementById('mktMyEggs');
  cancelSellEgg();
  const available = eggsInInventory.filter(e => Date.now() < e.expiraEm);
  if(available.length === 0) {
    el.innerHTML = '<div style="font-size:7px;color:var(--muted);text-align:center;padding:12px 0;">Nenhum ovo disponível para vender</div>';
    return;
  }
  el.innerHTML = available.map(e => `
    <div class="mkt-sell-egg" onclick="selectEggToSell(${e.id})">
      <div style="font-size:18px;">${RAR_EMOJI[e.raridade]}</div>
      <div style="flex:1;">
        <div style="font-size:8px;font-weight:700;color:${RAR_COLOR[e.raridade]};font-family:'Cinzel',serif;">${e.raridade} · ${e.elemento}</div>
        <div style="font-size:6px;color:var(--muted);">Clique para selecionar</div>
      </div>
    </div>`).join('');
}

function selectEggToSell(id) {
  const ovo = eggsInInventory.find(e => e.id === id);
  if(!ovo) return;
  mktSellEggId = id;
  document.getElementById('mktSellEggInfo').textContent = `${RAR_EMOJI[ovo.raridade]} ${ovo.raridade} · ${ovo.elemento}`;
  document.getElementById('mktSellForm').style.display = 'block';
}

function cancelSellEgg() {
  mktSellEggId = null;
  document.getElementById('mktSellForm').style.display = 'none';
}

async function confirmSellEgg() {
  if(!mktSellEggId || !walletAddress || !fbDb()) return;
  const ovo   = eggsInInventory.find(e => e.id === mktSellEggId);
  if(!ovo) return;
  const price = parseInt(document.getElementById('mktPriceInput').value);
  if(!price || price < 1) { addLog('Preço inválido.', 'bad'); return; }
  try {
    await fbDb().collection('market').add({
      sellerId: walletAddress,
      raridade: ovo.raridade,
      elemento: ovo.elemento,
      expiraEm: ovo.expiraEm,
      price,
      status: 'listed',
      listedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    // Remove from local inventory
    eggsInInventory = eggsInInventory.filter(e => e.id !== mktSellEggId);
    await saveToFirebase();
    renderEggInventory();
    cancelSellEgg();
    renderMyEggsForSale();
    addLog(`Ovo ${ovo.raridade} listado por ${price} 🪙!`, 'good');
    showBubble('Ovo no mercado! 🛒');
    mktSellEggId = null;
  } catch(e) {
    console.error('Sell error:', e);
    addLog('Erro ao listar ovo.', 'bad');
  }
}

// MARKET SECTIONS
// ═══════════════════════════════════════════════════════════════════
let _mktSection = 'eggs';

function mktSection(sec) {
  _mktSection = sec;
  document.getElementById('mktEggsSection').style.display  = sec === 'eggs'  ? 'flex' : 'none';
  document.getElementById('mktItemsSection').style.display = sec === 'items' ? 'block' : 'none';
  document.getElementById('mktSecEggs').classList.toggle('active',  sec === 'eggs');
  document.getElementById('mktSecItems').classList.toggle('active', sec === 'items');
  if(sec === 'items') renderMarketItems();
  if(sec === 'eggs')  mktTab('buy');
}

function renderMarketItems() {
  const list = document.getElementById('mktItemsList');
  if(!list) return;
  const owned = new Set(itemInventory.map(i => i.catalogId));
  list.innerHTML = Object.values(ITEM_CATALOG).map(item => {
    const alreadyOwned = owned.has(item.id);
    const canAfford    = gs.moedas >= item.preco;
    return `<div class="mkt-catalog-card">
      <div class="mkt-catalog-top">
        <span class="mkt-catalog-emoji">${item.emoji}</span>
        <div class="mkt-catalog-info">
          <div class="mkt-catalog-name" style="color:${item.cor}">${item.nome}</div>
          <div class="mkt-catalog-type">${item.tipo} · ${item.raridade}</div>
        </div>
        <div class="mkt-catalog-price">${item.preco} 🪙</div>
      </div>
      <div class="mkt-catalog-desc">${item.desc}</div>
      <div class="mkt-catalog-effect">✦ ${item.efeito}</div>
      <div class="mkt-catalog-footer">
        ${alreadyOwned
          ? `<div class="mkt-owned-badge">✓ JÁ POSSUI</div>`
          : `<button class="mkt-catalog-buy" onclick="buyItem('${item.id}')" ${!canAfford?'disabled':''}>${!canAfford ? '⚠ SEM MOEDAS' : '✦ ADQUIRIR'}</button>`
        }
        <div class="mkt-duration-note">⏳ 30 dias</div>
      </div>
    </div>`;
  }).join('');
}

function buyItem(catalogId) {
  const item = ITEM_CATALOG[catalogId];
  if(!item) return;
  if(gs.moedas < item.preco) { showBubble('Sem moedas! 😢'); return; }
  if(itemInventory.find(i => i.catalogId === catalogId)) {
    addLog('Você já possui este item.', 'info'); return;
  }
  spendCoins(item.preco);
  const entry = { id: Date.now(), catalogId, equipped: false, expiraEm: Date.now() + 2592000000 };
  itemInventory.push(entry);
  updateResourceUI();
  scheduleSave();
  addLog(`${item.emoji} ${item.nome} adquirido!`, 'good');
  showBubble(`${item.emoji} Item obtido!`);
  renderMarketItems();
  renderItemInventory();
}
