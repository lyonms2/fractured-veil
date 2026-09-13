// ═══════════════════════════════════════════════════════════════════
// COIN SHOP
// ═══════════════════════════════════════════════════════════════════
function openCoinShop() {
  // A loja vende para UM avatar — ver o comentário do
  // painelDeUmAvatarDisponivel em js/items.js. Na colônia não há esse um.
  if (typeof painelDeUmAvatarDisponivel === 'function') {
    const motivo = painelDeUmAvatarDisponivel();
    if (motivo) { avisarPainelDeUmAvatar(motivo); return; }
  }
  ModalManager.open('coinShopModal');
  // As moedas servem para uma coisa só: comprar os itens da loja. Havia
  // aqui uma segunda seção, o câmbio de moedas por cristais, que saiu do
  // jogo — ver o comentário do DIFF_TIERS em js/modal.js.
  if(typeof renderMarketItems  === 'function') renderMarketItems();
}
function closeCoinShop() {
  ModalManager.close('coinShopModal');
}
