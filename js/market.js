// ═══════════════════════════════════════════════════════════════════
// LOJA DE ITENS
//
// Já não tem modal nem botão próprios. Vive dentro do painel das Moedas
// (coinShopModal), que é a moeda que a paga — quem abre openCoinShop()
// chama o renderMarketItems() daqui. Tinha um 🛒 no topo chamado
// "Mercado" que abria um painel chamado "🔮 ITENS", e chocava com o 🛒
// "Comprar Avatares" do menu do marketplace.
// ═══════════════════════════════════════════════════════════════════

function renderMarketItems() {
  const list = document.getElementById('mktItemsList');
  if(!list) return;

  const owned = new Set(itemInventory.map(i => i.catalogId));
  const disc  = rarityBonus().shopDiscount || 0;

  function renderCard(item) {
    const preco     = precoItem(item);
    const canAfford = gs.moedas >= preco;
    const precoHtml = disc > 0
      ? `<span style="text-decoration:line-through;opacity:.5;font-size:0.4375rem;">${item.preco}</span> ${preco}`
      : String(preco);

    let footerBtn;
    if(item.consumivel) {
      const hasDiseases = (typeof activeDiseases !== 'undefined' && activeDiseases.length > 0) || sick;
      const disabled    = !canAfford || !hasDiseases;
      const label       = !canAfford ? t('mkt.btn.no_coins') : !hasDiseases ? t('mkt.btn.no_diseases') : t('mkt.btn.use_now');
      footerBtn = `<button class="mkt-catalog-buy" onclick="buyItem('${item.id}')" ${disabled?'disabled':''}>${label}</button>
                   <div class="mkt-duration-note" style="color:#a855f7;">${t('mkt.label.consumable')}</div>`;
    } else {
      const alreadyOwned = owned.has(item.id);
      footerBtn = alreadyOwned
        ? `<div class="mkt-owned-badge">${t('mkt.label.owned')}</div><div class="mkt-duration-note">${t('mkt.label.duration')}</div>`
        : `<button class="mkt-catalog-buy" onclick="buyItem('${item.id}')" ${!canAfford?'disabled':''}>${!canAfford ? t('mkt.btn.no_coins') : t('mkt.btn.buy')}</button>
           <div class="mkt-duration-note">${t('mkt.label.duration')}</div>`;
    }

    return `<div class="mkt-catalog-card">
      <div class="mkt-catalog-top">
        <span class="mkt-catalog-emoji">${item.emoji}</span>
        <div class="mkt-catalog-info">
          <div class="mkt-catalog-name" style="color:${item.cor}">${item.nome}</div>
          <div class="mkt-catalog-type">${tItemTipo(item.tipo)} · ${tItemRaridade(item.raridade)}</div>
        </div>
        <div class="mkt-catalog-price">${precoHtml} 🪙</div>
      </div>
      <div class="mkt-catalog-desc">${item.desc}</div>
      <div class="mkt-catalog-effect">✦ ${item.efeito}</div>
      <div class="mkt-catalog-footer">${footerBtn}</div>
    </div>`;
  }

  // Agrupa por tipo na mesma ordem do inventário
  const TIPO_ORDER = ['Amuleto', 'Coroa', 'Cenário', 'Consumível', 'Especial'];
  const grupos = {};
  Object.values(ITEM_CATALOG).forEach(item => {
    const tipo = item.tipo || 'Outro';
    if(!grupos[tipo]) grupos[tipo] = [];
    grupos[tipo].push(item);
  });

  const tiposPresentes = TIPO_ORDER.filter(t => grupos[t]).concat(
    Object.keys(grupos).filter(t => !TIPO_ORDER.includes(t))
  );

  // Duas coisas que nenhum cartão dizia e que mudam a decisão de compra:
  // o item fica com o avatar em campo (o itemInventory é guardado por
  // slot), e os medidores só andam com o jogo aberto — nada decai
  // enquanto o jogador está fora, portanto um item que trava o decay não
  // trabalha nesse tempo.
  const aviso = `<div style="font-size:0.40625rem;line-height:1.6;color:var(--muted);
    background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);
    border-radius:0.375rem;padding:0.4375rem 0.5625rem;margin-bottom:0.75rem;">${t('mkt.aviso.dono')}</div>`;

  list.innerHTML = aviso + tiposPresentes.map(tipo => `
    <div style="margin-bottom:1.25rem;">
      <div style="font-family:'Cinzel',serif;font-size:0.40625rem;letter-spacing:0.125rem;color:var(--muted);text-transform:uppercase;padding:0.3125rem 0.125rem 0.4375rem;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:0.75rem;">◆ ${tItemTipo(tipo)}</div>
      <div style="display:flex;flex-direction:column;gap:0.625rem;">
        ${grupos[tipo].map(renderCard).join('')}
      </div>
    </div>
  `).join('');
}

function buyItem(catalogId) {
  const item = ITEM_CATALOG[catalogId];
  if(!item) return;

  // Consumíveis — usar imediatamente via função dedicada
  if(item.consumivel) {
    if(item.onUse === 'useAntidote') {
      closeCoinShop();
      setTimeout(() => useAntidote(), 150);
    }
    return;
  }

  const discount = rarityBonus().shopDiscount || 0;
  const preco = precoItem(item);
  if(gs.moedas < preco) { showBubble(t('mkt.bub.no_coins')); return; }
  if(itemInventory.find(i => i.catalogId === catalogId)) {
    addLog(t('mkt.log.already_owned'), 'info'); return;
  }
  spendCoins(preco);
  const entry = { id: Date.now(), catalogId, equipped: false, expiraEm: Date.now() + 2592000000 };
  itemInventory.push(entry);
  updateResourceUI();
  scheduleSave();
  const discountTxt = discount > 0 ? t('mkt.log.discount', {pct: Math.round(discount*100)}) : '';
  addLog(t('mkt.log.bought', {emoji: item.emoji, nome: item.nome, discount: discountTxt}), 'good');
  showBubble(t('mkt.bub.bought', {emoji: item.emoji}));
  renderMarketItems();
  renderItemInventory();
}
