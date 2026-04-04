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
window.updatePhaseLabel = typeof updatePhaseLabel !== "undefined" ? updatePhaseLabel : ()=>{};
window.startVelha    = typeof startVelha    !== "undefined" ? startVelha    : ()=>{};
window.startRename   = typeof startRename   !== "undefined" ? startRename   : ()=>{};
window.cancelRename  = typeof cancelRename  !== "undefined" ? cancelRename  : ()=>{};
window.confirmRename = typeof confirmRename !== "undefined" ? confirmRename : ()=>{};
window.setDifficulty   = typeof setDifficulty   !== "undefined" ? setDifficulty   : ()=>{};
window.openGameSelector= typeof openGameSelector !== "undefined" ? openGameSelector : ()=>{};
window.velhaClick      = typeof velhaClick      !== "undefined" ? velhaClick      : ()=>{};
window.healCreature = typeof healCreature !== "undefined" ? healCreature : ()=>{};
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
window.gsSetTab = typeof gsSetTab !== "undefined" ? gsSetTab : ()=>{};
window.minaClick = typeof minaClick !== "undefined" ? minaClick : ()=>{};
window.minaFlag  = typeof minaFlag  !== "undefined" ? minaFlag  : ()=>{};
window.startMina = typeof startMina !== "undefined" ? startMina : ()=>{};

// ── Modo Repouso Manual ──
window.onSleepPointerDown   = typeof onSleepPointerDown   !== "undefined" ? onSleepPointerDown   : ()=>{};
window.onSleepPointerUp     = typeof onSleepPointerUp     !== "undefined" ? onSleepPointerUp     : ()=>{};
window.ativarModoRepouso    = typeof ativarModoRepouso    !== "undefined" ? ativarModoRepouso    : ()=>{};
window.desativarModoRepouso = typeof desativarModoRepouso !== "undefined" ? desativarModoRepouso : ()=>{};

// ── GAME SELECTOR TABS ──
function gsSetTab(tab) {
  document.getElementById('gsGridPve').style.display  = tab === 'pve'  ? 'grid' : 'none';
  document.getElementById('gsGridPvp').style.display  = tab === 'pvp'  ? 'grid' : 'none';
  document.getElementById('gsGridLore').style.display = tab === 'lore' ? 'grid' : 'none';
  document.getElementById('gsTabPve').classList.toggle('active',  tab === 'pve');
  document.getElementById('gsTabPvp').classList.toggle('active',  tab === 'pvp');
  document.getElementById('gsTabLore').classList.toggle('active', tab === 'lore');
}

setInterval(gameTick, 1000);
updateResourceUI();
applyI18nDOM();
window.setLang = setLang;

window.addEventListener('beforeunload', () => {
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) {
    avatarSlots[window._pendingEggSlot] = null;
    window._pendingEggSlot = null;
  }
  // Persiste timestamp para catch-up offline mesmo após fechar o browser
  localStorage.setItem('fv_lastHidden', Date.now());
});

// ── DETECTOR DE INATIVIDADE — sugere modo repouso ──
const INATIVIDADE_MS = 5 * 60 * 1000;
let _inativoTimer = null;

function _resetInatividade() {
  clearTimeout(_inativoTimer);
  if(!hatched || dead || sleeping || modoRepouso) return;
  _inativoTimer = setTimeout(() => {
    if(!hatched || dead || sleeping || modoRepouso) return;
    showBubble('Vai sair? Ativa o repouso! 🌙');
    addLog('Inativo há 5min — segure 💤 DORMIR para ativar o modo repouso.', 'info');
  }, INATIVIDADE_MS);
}

['mousemove','mousedown','keydown','touchstart','click','scroll'].forEach(evt => {
  document.addEventListener(evt, _resetInatividade, { passive: true });
});

// ── Sync ao voltar para a aba ──
let _lastHidden = 0;
document.addEventListener('visibilitychange', async () => {
  if(document.visibilityState === 'hidden') {
    _lastHidden = Date.now();
    localStorage.setItem('fv_lastHidden', _lastHidden);
    return;
  }

  const _lsHidden = parseInt(localStorage.getItem('fv_lastHidden') || '0');
  const _hiddenAt = _lastHidden || _lsHidden;
  _lastHidden = 0;
  localStorage.removeItem('fv_lastHidden');

  // ── Offline catch-up (cobre bloqueio de ecrã / throttle do browser) ──
  if(_hiddenAt > 0 && typeof hatched !== 'undefined' && hatched && !dead) {
    const offlineSecs   = Math.floor((Date.now() - _hiddenAt) / 1000);
    const offlineCycles = Math.floor(offlineSecs / 60);
    if(offlineCycles > 0) {
      const _d  = rarityBonus().decay;
      const _eb = getElementoBonus();
      let wasSleeping    = sleeping;
      let wasModoRepouso = modoRepouso;
      let sonoEsgotado   = false;

      for(let _i = 0; _i < Math.min(offlineCycles, 4320); _i++) {
        if(wasSleeping) {
          vitals.energia = Math.min(100, vitals.energia + 4 * getItemEffect('sleepEnergyMult') * _eb.sleepEnergy);
          vitals.fome    = Math.max(0, vitals.fome    - (0.30 * _d * _eb.fomeDecay    * getItemEffect('fomeDecayMult')));
          vitals.higiene = Math.max(0, vitals.higiene - (0.05 * _eb.higieneDecay));
          if(vitals.energia >= 100) { vitals.energia = 100; wasSleeping = false; sonoEsgotado = true; }
        } else if(wasModoRepouso) {
          vitals.fome    = Math.max(0, vitals.fome    - (0.05 * _d * _eb.fomeDecay));
          vitals.higiene = Math.max(0, vitals.higiene - (0.03 * _eb.higieneDecay));
          vitals.humor   = Math.max(0, vitals.humor   - (0.02 * _eb.humorDecay));
          vitals.energia = Math.min(100, vitals.energia + (0.2  * _eb.sleepEnergy));
          vinculo        = Math.max(0, vinculo - (0.01 * _eb.vinculoDecay));
          if(vitals.fome < 5) vitals.saude = Math.max(0, vitals.saude - 0.05);
          if(vitals.saude <= 0) { vitals.saude = 0; break; }
        } else {
          vitals.fome    = Math.max(0, vitals.fome    - (0.4  * _d * _eb.fomeDecay    * getItemEffect('fomeDecayMult')));
          vitals.humor   = Math.max(0, vitals.humor   - (0.25 * _d * _eb.humorDecay   * getItemEffect('humorDecayMult')));
          vitals.energia = Math.max(0, vitals.energia - (0.3  * _d * _eb.energiaDecay));
          vitals.higiene = Math.max(0, vitals.higiene - (0.06 * _eb.higieneDecay));
          if(vitals.fome    < 15) vitals.saude = Math.max(0, vitals.saude - 0.08);
          if(vitals.humor   < 10) vitals.saude = Math.max(0, vitals.saude - 0.03);
          if(vitals.energia < 5)  vitals.saude = Math.max(0, vitals.saude - 0.03);
          if(vitals.higiene < 15) vitals.saude = Math.max(0, vitals.saude - 0.02);
          if(vitals.saude <= 0)   { vitals.saude = 0; break; }
        }
        if(activeDiseases.length > 0) {
          vitals.saude = Math.max(0, vitals.saude - DISEASE_DECAY_PER_CYCLE * activeDiseases.length);
        }
      }

      if(sleeping && !wasSleeping) {
        sleeping = false;
        addLog(t('log.woke_offline'), 'good');
      }
      if(vitals.saude < 30 && Math.random() < 0.4) sick = true;
      totalSecs += offlineSecs;
      saveRuntimeToSlot(activeSlotIdx);
      scheduleSave();
      updateAllUI();
      const hrs  = Math.floor(offlineSecs / 3600);
      const mins = Math.floor((offlineSecs % 3600) / 60);
      const modoLog = wasSleeping || sonoEsgotado ? t('log.offline_slept')
                    : wasModoRepouso              ? t('log.offline_repouso')
                    :                              t('log.offline_updated');
      addLog(t('log.offline_away', { h: hrs, m: mins, status: modoLog }), 'info');
      if(vitals.saude <= 0) {
        dead = true;
        addLog(t('log.died_offline', { name: avatar ? avatar.nome.split(',')[0] : 'Avatar' }), 'bad');
      }
    }
  }

  // ── Firebase sync (slot / inbox) ──
  if(!walletAddress || !fbDb()) return;
  if(Date.now() - _hiddenAt < 2000) return;
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) return;
  if(typeof modoRepouso !== 'undefined' && modoRepouso) return;

  try {
    const snap = await fbDb().collection('players').doc(walletAddress).get();
    if(!snap.exists) return;
    const data = snap.data();
    const remoteSlotIdx = data.activeSlotIdx ?? activeSlotIdx;
    const hasInbox = data.inboxEggs && data.inboxEggs.length > 0;

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
