// ═══════════════════════════════════════════════════════════════════
// COIN SHOP
// ═══════════════════════════════════════════════════════════════════
function openCoinShop() {
  ModalManager.open('coinShopModal');
  // Renderiza o painel de câmbio sempre que abre
  if(typeof renderCambioPanel === 'function') renderCambioPanel();
}
function closeCoinShop() {
  ModalManager.close('coinShopModal');
}
