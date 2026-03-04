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
  document.getElementById('mktSellPanel').style.display = tab === 'sell' ? 'block' : 'none';
  document.getElementById('mktTabBuy').style.borderColor  = tab === 'buy'  ? 'var(--gold)' : '';
  document.getElementById('mktTabBuy').style.color        = tab === 'buy'  ? 'var(--gold)' : '';
  document.getElementById('mktTabSell').style.borderColor = tab === 'sell' ? 'var(--gold)' : '';
  document.getElementById('mktTabSell').style.color       = tab === 'sell' ? 'var(--gold)' : '';
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
  document.getElementById('mktEggsSection').style.display  = sec === 'eggs'  ? 'block' : 'none';
  document.getElementById('mktItemsSection').style.display = sec === 'items' ? 'block' : 'none';
  document.getElementById('mktSecEggs').classList.toggle('primary',  sec === 'eggs');
  document.getElementById('mktSecItems').classList.toggle('primary', sec === 'items');
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
    return `<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:10px;box-sizing:border-box;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-size:18px;">${item.emoji}</span>
        <div style="flex:1;">
          <div style="font-family:'Cinzel',serif;font-size:8px;color:${item.cor};letter-spacing:1px;">${item.nome}</div>
          <div style="font-size:6px;color:var(--muted);margin-top:2px;">${item.tipo} · ${item.raridade}</div>
        </div>
        <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);">${item.preco}🪙</div>
      </div>
      <div style="font-size:6.5px;color:#887799;margin-bottom:6px;">${item.desc}</div>
      <div style="font-size:6px;color:#5ab4e8;margin-bottom:8px;">✦ ${item.efeito}</div>
      ${alreadyOwned
        ? `<div style="font-size:6px;color:#7ab87a;text-align:center;padding:4px;border:1px solid rgba(122,184,122,.3);border-radius:4px;">✓ JÁ POSSUI</div>`
        : `<button class="mini-btn primary" onclick="buyItem('${item.id}')" style="width:100%;font-size:7px;${!canAfford?'opacity:.4;cursor:not-allowed;':''}" ${!canAfford?'disabled':''}>
             COMPRAR ${!canAfford ? '(sem moedas)' : ''}
           </button>`
      }
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
