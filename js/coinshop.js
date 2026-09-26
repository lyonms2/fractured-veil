// ═══════════════════════════════════════════════════════════════════
// COIN SHOP
// ═══════════════════════════════════════════════════════════════════
/* De onde a loja foi aberta — e isso importa por causa de uma coisa que
   o ModalManager faz: o open() FECHA o modal anterior, não empilha (ver
   js/modal.js). Desde que a porta da loja passou a ser o botão "+
   COMPRAR ITENS" lá de dentro da mochila (26/09/2026), o ✕ da loja
   largava o jogador na tela do avatar — e quem acabou de comprar um
   item queria justamente voltar para a mochila, para vê-lo lá. */
let _lojaVeioDaMochila = false;

function openCoinShop(deOndeVeio) {
  // A loja vende para UM avatar — ver o comentário do
  // painelDeUmAvatarDisponivel em js/items.js. Na colônia não há esse um.
  if (typeof painelDeUmAvatarDisponivel === 'function') {
    const motivo = painelDeUmAvatarDisponivel();
    // A recusa não deixa a lembrança pendurada: quem não entrou não tem
    // de onde voltar.
    if (motivo) { _lojaVeioDaMochila = false; avisarPainelDeUmAvatar(motivo); return; }
  }
  _lojaVeioDaMochila = (deOndeVeio === 'mochila');
  ModalManager.open('coinShopModal');
  // As moedas servem para uma coisa só: comprar os itens da loja. Havia
  // aqui uma segunda seção, o câmbio de moedas por cristais, que saiu do
  // jogo — ver o comentário do DIFF_TIERS em js/modal.js.
  if(typeof renderMarketItems  === 'function') renderMarketItems();
}

function closeCoinShop() {
  /* Só volta se a loja ainda é o que está aberto. Um closeAll() no meio
     do caminho — um minijogo, uma batalha — já levou o jogador para
     outro lugar, e reabrir a mochila por cima disso seria aparecer sem
     ter sido chamado. */
  const voltar = _lojaVeioDaMochila && ModalManager.isOpen('coinShopModal');
  _lojaVeioDaMochila = false;
  ModalManager.close('coinShopModal');
  if (voltar && typeof openItemInventory === 'function') openItemInventory();
}
