// ═══════════════════════════════════════════════════════════════════
// MERCADO DE ITENS
// ═══════════════════════════════════════════════════════════════════

function openMarket() {
  ModalManager.open('marketModal');
  renderMarketItems();
}

function closeMarket() {
  ModalManager.close('marketModal');
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
