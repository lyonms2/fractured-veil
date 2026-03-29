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
    const disc      = rarityBonus().shopDiscount || 0;
    const preco     = Math.round(item.preco * (1 - disc));
    const canAfford = gs.moedas >= preco;
    const precoHtml = disc > 0
      ? `<span style="text-decoration:line-through;opacity:.5;font-size:7px;">${item.preco}</span> ${preco}`
      : String(preco);

    let footerBtn;
    if(item.consumivel) {
      const hasDiseases = (typeof activeDiseases !== 'undefined' && activeDiseases.length > 0) || sick;
      const disabled    = !canAfford || !hasDiseases;
      const label       = !canAfford ? '⚠ SEM MOEDAS' : !hasDiseases ? '✦ SEM DOENÇAS' : '✦ USAR AGORA';
      footerBtn = `<button class="mkt-catalog-buy" onclick="buyItem('${item.id}')" ${disabled?'disabled':''}>${label}</button>
                   <div class="mkt-duration-note" style="color:#a855f7;">💊 consumível</div>`;
    } else {
      const alreadyOwned = owned.has(item.id);
      footerBtn = alreadyOwned
        ? `<div class="mkt-owned-badge">✓ JÁ POSSUI</div><div class="mkt-duration-note">⏳ 30 dias</div>`
        : `<button class="mkt-catalog-buy" onclick="buyItem('${item.id}')" ${!canAfford?'disabled':''}>${!canAfford ? '⚠ SEM MOEDAS' : '✦ ADQUIRIR'}</button>
           <div class="mkt-duration-note">⏳ 30 dias</div>`;
    }

    return `<div class="mkt-catalog-card">
      <div class="mkt-catalog-top">
        <span class="mkt-catalog-emoji">${item.emoji}</span>
        <div class="mkt-catalog-info">
          <div class="mkt-catalog-name" style="color:${item.cor}">${item.nome}</div>
          <div class="mkt-catalog-type">${item.tipo} · ${item.raridade}</div>
        </div>
        <div class="mkt-catalog-price">${precoHtml} 🪙</div>
      </div>
      <div class="mkt-catalog-desc">${item.desc}</div>
      <div class="mkt-catalog-effect">✦ ${item.efeito}</div>
      <div class="mkt-catalog-footer">${footerBtn}</div>
    </div>`;
  }).join('');
}

function buyItem(catalogId) {
  const item = ITEM_CATALOG[catalogId];
  if(!item) return;

  // Consumíveis — usar imediatamente via função dedicada
  if(item.consumivel) {
    if(item.onUse === 'useAntidote') {
      closeMarket();
      setTimeout(() => useAntidote(), 150);
    }
    return;
  }

  const discount = rarityBonus().shopDiscount || 0;
  const preco = Math.round(item.preco * (1 - discount));
  if(gs.moedas < preco) { showBubble('Sem moedas! 😢'); return; }
  if(itemInventory.find(i => i.catalogId === catalogId)) {
    addLog('Você já possui este item.', 'info'); return;
  }
  spendCoins(preco);
  const entry = { id: Date.now(), catalogId, equipped: false, expiraEm: Date.now() + 2592000000 };
  itemInventory.push(entry);
  updateResourceUI();
  scheduleSave();
  const discountTxt = discount > 0 ? ` (-${Math.round(discount*100)}% desconto)` : '';
  addLog(`${item.emoji} ${item.nome} adquirido!${discountTxt}`, 'good');
  showBubble(`${item.emoji} Item obtido!`);
  renderMarketItems();
  renderItemInventory();
}
