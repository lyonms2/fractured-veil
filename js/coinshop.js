// ═══════════════════════════════════════════════════════════════════
// COIN SHOP
// ═══════════════════════════════════════════════════════════════════
function openCoinShop() {
  ModalManager.open('coinShopModal');
  // Duas secções, as duas coisas que se fazem com moedas: gastá-las na
  // loja de itens e trocá-las por cristais. A loja mudou-se para aqui
  // vinda de um botão 🛒 próprio no topo — ver o comentário do cabeçalho
  // em index.html.
  if(typeof renderMarketItems  === 'function') renderMarketItems();
  if(typeof renderCambioPanel  === 'function') renderCambioPanel();
}
function closeCoinShop() {
  ModalManager.close('coinShopModal');
}
