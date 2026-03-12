// ── Window exports (needed for inline onclick handlers) ──
window.burnEgg = typeof burnEgg !== "undefined" ? burnEgg : ()=>{};
window.buyCoinPackage = typeof buyCoinPackage !== "undefined" ? buyCoinPackage : ()=>{};
window.buyFromMarket = typeof buyFromMarket !== "undefined" ? buyFromMarket : ()=>{};
window.buyItem = typeof buyItem !== "undefined" ? buyItem : ()=>{};
window.buyShopItem = typeof buyShopItem !== "undefined" ? buyShopItem : ()=>{};
window.cleanCreature = typeof cleanCreature !== "undefined" ? cleanCreature : ()=>{};
window.clickEgg = typeof clickEgg !== "undefined" ? clickEgg : ()=>{};
window.closeCoinShop = typeof closeCoinShop !== "undefined" ? closeCoinShop : ()=>{};
window.closeEggInventory = typeof closeEggInventory !== "undefined" ? closeEggInventory : ()=>{};
window.closeGameSelector = typeof closeGameSelector !== "undefined" ? closeGameSelector : ()=>{};
window.closeItemInventory = typeof closeItemInventory !== "undefined" ? closeItemInventory : ()=>{};
window.closeJkp = typeof closeJkp !== "undefined" ? closeJkp : ()=>{};
window.closeMarket = typeof closeMarket !== "undefined" ? closeMarket : ()=>{};
window.closeMiniModal = typeof closeMiniModal !== "undefined" ? closeMiniModal : ()=>{};
window.closeShop = typeof closeShop !== "undefined" ? closeShop : ()=>{};
window.cancelHatch = typeof cancelHatch !== "undefined" ? cancelHatch : ()=>{};
window.confirmHatch = typeof confirmHatch !== "undefined" ? confirmHatch : ()=>{};
window.goToMarketplace = typeof goToMarketplace !== "undefined" ? goToMarketplace : ()=>{};
window.connectWallet = typeof connectWallet !== "undefined" ? connectWallet : ()=>{};
window.deleteItem = typeof deleteItem !== "undefined" ? deleteItem : ()=>{};
window.disconnectWallet = typeof disconnectWallet !== "undefined" ? disconnectWallet : ()=>{};
window.equipItem = typeof equipItem !== "undefined" ? equipItem : ()=>{};
window.feedCreature = typeof feedCreature !== "undefined" ? feedCreature : ()=>{};
window.hatchEggFromInventory = typeof hatchEggFromInventory !== "undefined" ? hatchEggFromInventory : ()=>{};
window.sellEggToPool = typeof sellEggToPool !== "undefined" ? sellEggToPool : ()=>{};
window.updatePhaseLabel = typeof updatePhaseLabel !== "undefined" ? updatePhaseLabel : ()=>{};
window.healCreature = typeof healCreature !== "undefined" ? healCreature : ()=>{};
window.jkpChoose = typeof jkpChoose !== "undefined" ? jkpChoose : ()=>{};
window.jkpPlayAgain = typeof jkpPlayAgain !== "undefined" ? jkpPlayAgain : ()=>{};
window.layEgg = typeof layEgg !== "undefined" ? layEgg : ()=>{};
window.memFlip = typeof memFlip !== "undefined" ? memFlip : ()=>{};
window.openCoinShop = typeof openCoinShop !== "undefined" ? openCoinShop : ()=>{};
window.openEggInventory = typeof openEggInventory !== "undefined" ? openEggInventory : ()=>{};
window.openItemInventory = typeof openItemInventory !== "undefined" ? openItemInventory : ()=>{};
window.openMarket = typeof openMarket !== "undefined" ? openMarket : ()=>{};
window.openMinigame = typeof openMinigame !== "undefined" ? openMinigame : ()=>{};
window.petCreature = typeof petCreature !== "undefined" ? petCreature : ()=>{};
window.playCreature = typeof playCreature !== "undefined" ? playCreature : ()=>{};
window.selectEggToSell = typeof selectEggToSell !== "undefined" ? selectEggToSell : ()=>{};
window.simonPlayerClick = typeof simonPlayerClick !== "undefined" ? simonPlayerClick : ()=>{};
window.startMemoria = typeof startMemoria !== "undefined" ? startMemoria : ()=>{};
window.startSimon = typeof startSimon !== "undefined" ? startSimon : ()=>{};
window.toggleSleep = typeof toggleSleep !== "undefined" ? toggleSleep : ()=>{};
window.triggerSummon = typeof triggerSummon !== "undefined" ? triggerSummon : ()=>{};
window.unequipItem = typeof unequipItem !== "undefined" ? unequipItem : ()=>{};
window.updateEquippedDisplay = typeof updateEquippedDisplay !== "undefined" ? updateEquippedDisplay : ()=>{};
window.renderMarketItems = typeof renderMarketItems !== "undefined" ? renderMarketItems : ()=>{};

setInterval(gameTick, 1000);
// Login screen handles initial state
updateResourceUI();

// Login screen handles initial state

// On unload: pendingEgg slots are never saved to Firebase (getGameState skips them)
// so the egg is automatically preserved — nothing to do except clear the in-memory slot
window.addEventListener('beforeunload', () => {
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) {
    avatarSlots[window._pendingEggSlot] = null;
    window._pendingEggSlot = null;
  }
});

// Ao regressar ao jogo vindo do marketplace, re-ler Firebase
// para detectar mudança de activeSlotIdx ou novos inboxEggs
let _lastHidden = 0;
document.addEventListener('visibilitychange', async () => {
  if(document.visibilityState === 'hidden') {
    _lastHidden = Date.now();
    return;
  }
  // Só re-lê se ficou escondido pelo menos 2s (evita flickers de troca de tab)
  if(!walletAddress || !fbDb()) return;
  if(Date.now() - _lastHidden < 2000) return;
  // Não re-ler durante chocagem activa
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) return;

  try {
    const snap = await fbDb().collection('players').doc(walletAddress).get();
    if(!snap.exists) return;
    const data = snap.data();
    const remoteSlotIdx = data.activeSlotIdx ?? activeSlotIdx;
    const hasInbox = data.inboxEggs && data.inboxEggs.length > 0;

    // Só aplica se o slot activo mudou ou há inbox para consumir
    if(remoteSlotIdx !== activeSlotIdx || hasInbox) {
      applyGameState(data);
      updateAllUI();
      if(typeof renderEggInventory === 'function') renderEggInventory();
      if(remoteSlotIdx !== activeSlotIdx) {
        addLog(`Slot activo alterado para Slot ${remoteSlotIdx+1} via Marketplace.`, 'info');
      }
      if(hasInbox) {
        addLog(`🥚 Novos ovos recebidos!`, 'good');
        showBubble('Ovos chegaram! 🥚');
      }
    }
  } catch(e) { console.warn('visibilitychange sync error:', e); }
});
