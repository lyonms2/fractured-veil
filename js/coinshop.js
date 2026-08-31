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
  // Duas seções, as duas coisas que se fazem com moedas: gastá-las na
  // loja de itens e trocá-las por cristais. A loja mudou-se para aqui
  // vinda de um botão 🛒 próprio no topo — ver o comentário do cabeçalho
  // em index.html.
  if(typeof renderMarketItems  === 'function') renderMarketItems();
  if(typeof renderCambioPanel  === 'function') renderCambioPanel();
}
function closeCoinShop() {
  ModalManager.close('coinShopModal');
}
