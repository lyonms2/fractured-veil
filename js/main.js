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
window.closeMiniModal = typeof closeMiniModal !== "undefined" ? closeMiniModal : ()=>{};
window.closeShop = typeof closeShop !== "undefined" ? closeShop : ()=>{};
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
window.startMina  = typeof startMina  !== "undefined" ? startMina  : ()=>{};
window.startSnake  = typeof startSnake  !== "undefined" ? startSnake  : ()=>{};
window.snakeDpad   = typeof snakeDpad   !== "undefined" ? snakeDpad   : ()=>{};
window.startOddOne    = typeof startOddOne    !== "undefined" ? startOddOne    : ()=>{};
window.oddClick       = typeof oddClick       !== "undefined" ? oddClick       : ()=>{};
window.startLabirinto = typeof startLabirinto !== "undefined" ? startLabirinto : ()=>{};
window.mazeDpad       = typeof mazeDpad       !== "undefined" ? mazeDpad       : ()=>{};
window.mazeDpadRelease= typeof mazeDpadRelease!== "undefined" ? mazeDpadRelease: ()=>{};

// ── GAME SELECTOR TABS ──
// O seletor tinha três abas — PvE, PvP e Lore — e esta função trocava
// entre elas. Ficou uma lista só, portanto não há nada para trocar.
//
// Continua aqui, e a não fazer nada, porque quatro sítios ainda a
// chamam ao sair de um jogo (arena, rouba-monte, batalha naval e o
// gestor de modais). Apagá-la partia esses quatro; o seletor abre na
// mesma, que é o que eles querem.
function gsSetTab(_tab) {}

// ── Injectar .modal-card em todos os .mini-modal ──
document.querySelectorAll('.mini-modal').forEach(modal => {
  const hasScrollBody = modal.querySelector('.modal-scroll-body');
  const card = document.createElement('div');
  card.className = hasScrollBody ? 'modal-card has-scroll' : 'modal-card';
  while (modal.firstChild) card.appendChild(modal.firstChild);
  modal.appendChild(card);
});

setInterval(gameTick, 1000);
updateResourceUI();
applyI18nDOM();
window.setLang = setLang;

window.addEventListener('beforeunload', () => {
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) {
    avatarSlots[window._pendingEggSlot] = null;
    window._pendingEggSlot = null;
  }
  // lastSeen é persistido server-side pelo RTDB onDisconnect (setupPresence)
});

// ═══════════════════════════════════════════════════════════════════
// A PAUSA À MÃO
//
// O jogo já parava sozinho em dois casos: com a aba fechada (auth.js) e
// com a aba escondida (aqui em baixo, e agora garantido pela guarda do
// gameTick). O que faltava era o caso do meio, que é o mais comum no
// computador: a janela do jogo aberta e à vista, num segundo monitor ou
// a um canto, enquanto o jogador faz outra coisa. Aí o mundo corria.
//
// O botão não é um poder novo — fechar a aba já pausava tudo, de graça.
// É tornar isso descoberto: ninguém adivinha que a forma de pausar um
// jogo é fechá-lo.
//
// Pausa TUDO, energia incluída. Dormir recupera energia mesmo com a aba
// fechada; se a pausa também recuperasse, pausar era melhor do que
// jogar, e a decisão certa passava a ser deixar o jogo em pausa a noite
// toda. Assim a pausa não dá nada: só deixa de tirar.
// ═══════════════════════════════════════════════════════════════════

// Onde não se pausa: coisas com relógio a correr, algumas com o
// servidor do outro lado. Pausar uma batalha PvP é ou inútil ou
// batota, conforme quem está a perder.
const PAUSA_PROIBIDA = ['combateModal', 'arenaModal', 'batalhaNavalModal',
                        'roubaMontModal', 'minaModal', 'mazeModal',
                        'memoriaModal', 'simonModal'];

/* As cerimónias — evoluir, chocar um ovo, subir de nível — vivem acima
   da tela da pausa (z-index 10050 e 9999 contra os 9000 dela) e não são
   modais do ModalManager, cada uma com a sua classe. Por isso a pergunta
   não é "que classe tem" mas "está à vista": assim uma cerimónia nova
   fica coberta sem ninguém se lembrar de a vir inscrever aqui.

   Pausar por trás de uma delas dava uma tela preta invisível, com o jogo
   parado e sem forma de perceber porquê. */
const PAUSA_CERIMONIAS = ['evolucaoOverlay', 'ovoOverlay', 'levelUpOverlay'];

function _cerimoniaAberta() {
  return PAUSA_CERIMONIAS.some(id => {
    const el = document.getElementById(id);
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && parseFloat(cs.opacity) > 0.05
        && el.getBoundingClientRect().width > 0;
  });
}

function alternarPausa() {
  if (!jogoPausado) {
    const aberto = (typeof ModalManager !== 'undefined') ? ModalManager.current : null;
    if ((aberto && PAUSA_PROIBIDA.includes(aberto)) || _cerimoniaAberta()) {
      if (typeof showToast === 'function') showToast(t('pausa.agora_nao'), 'err');
      return;
    }
  }
  jogoPausado = !jogoPausado;
  _desenharPausa();
}

function _desenharPausa() {
  const ov = document.getElementById('pausaOverlay');
  if (ov) ov.classList.toggle('active', jogoPausado);
  const btn = document.getElementById('btnPausa');
  if (btn) {
    btn.textContent = jogoPausado ? '▶' : '⏸';
    btn.title = t(jogoPausado ? 'pausa.btn_retomar' : 'pausa.btn_pausar');
  }
  // A tela preta cobre tudo; o teclado não devia continuar a chegar ao
  // que está por baixo dela.
  document.body.classList.toggle('em-pausa', jogoPausado);
}

// Espaço pausa e retoma, que é o gesto que toda a gente experimenta
// primeiro. Não rouba a barra a quem está a escrever num campo.
document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  const alvo = e.target;
  if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable)) return;
  if (typeof hatched === 'undefined' || !hatched) return;
  e.preventDefault();
  alternarPausa();
});

// ── DETECTOR DE INATIVIDADE — sugere dormir ──
const INATIVIDADE_MS = 5 * 60 * 1000;
let _inativoTimer = null;

function _resetInatividade() {
  clearTimeout(_inativoTimer);
  if(!hatched || dead || sleeping) return;
  _inativoTimer = setTimeout(() => {
    if(!hatched || dead || sleeping) return;
    showBubble(t('main.bub.inativo'));
    addLog(t('main.log.inativo'), 'info');
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

    // ── Descarrega a gravação pendente antes que seja tarde ──
    // O scheduleSave espera 5 segundos, e nesses 5 segundos o progresso
    // existe só na memória: este projeto não liga a persistência local do
    // Firestore, então uma escrita que não sai morre junto com a aba, sem
    // nova tentativa no próximo carregamento. Quem termina um minijogo, lê
    // o "+20 XP +32 moedas" e fecha a aba perde o prêmio — cinco segundos
    // é tempo de sobra para isso acontecer.
    //
    // O 'hidden' é o último momento garantido: dispara ao fechar a aba, ao
    // trocar de aba, ao minimizar e ao sair do app no celular. O
    // beforeunload não dispara de forma confiável no celular, e por isso
    // não serve aqui.
    //
    // Mesmo padrão do killCreature, que já fazia isto para a morte.
    if(_saveTimeout) {
      clearTimeout(_saveTimeout);
      _saveTimeout = null;
      saveToFirebase();
    }
    return;
  }

  const _hiddenAt = _lastHidden;
  _lastHidden = 0;

  // ── Segundo plano: avatar fica em pausa — nada decai nem o tempo de vida
  // avança enquanto a aba está escondida (idade = tempo de jogo real,
  // usado no card de venda no marketplace). Exceção: dormindo, a energia
  // continua subindo (mais devagar que ao vivo), o resto continua parado. ──
  // Em pausa não se recupera nada, nem a energia de quem dorme: quem
  // pausou e escondeu a aba não pode sair a ganhar por ter feito as
  // duas coisas.
  if(_hiddenAt > 0 && !jogoPausado && typeof hatched !== 'undefined' && hatched && !dead) {
    const offlineSecs = Math.floor((Date.now() - _hiddenAt) / 1000);
    if(offlineSecs > 0) {
      const offlineCycles = Math.floor(offlineSecs / 60);
      let status = t('log.offline_paused');
      if(sleeping && vitals.energia < 100) {
        vitals.energia = Math.min(100, vitals.energia + offlineCycles * OFFLINE_SLEEP_ENERGY_PER_CYCLE);
        status = t('log.offline_slept');
        if(vitals.energia >= 100) {
          sleeping = false;
          addLog(t('log.woke_offline'), 'good');
        }
      }

      // Os outros avatares também dormiram. Isto tratava só do que está
      // aberto na tela de cuidar, porque era o único que vivia; agora
      // vivem todos, e quem adormeceu tinha de acordar descansado na
      // mesma medida. Nada mais decai enquanto a aba está escondida —
      // essa parte não mudou, só passou a valer para a coleção inteira.
      if(typeof avatarSlots !== 'undefined' && offlineCycles > 0) {
        avatarSlots.forEach((s, i) => {
          if(!s || i === activeSlotIdx) return;
          if(!s.hatched || s.dead || !s.vitals || !s.sleeping) return;
          s.vitals.energia = Math.min(100,
            (s.vitals.energia ?? 100) + offlineCycles * OFFLINE_SLEEP_ENERGY_PER_CYCLE);
          if(s.vitals.energia >= 100) s.sleeping = false;
        });
      }
      saveRuntimeToSlot(activeSlotIdx);
      scheduleSave();
      updateAllUI();
      const hrs  = Math.floor(offlineSecs / 3600);
      const mins = Math.floor((offlineSecs % 3600) / 60);
      addLog(t('log.offline_away', { h: hrs, m: mins, status }), 'info');
    }
  }

  // ── Firebase sync (slot / inbox) ──
  if(!walletAddress || !fbDb()) return;
  if(Date.now() - _hiddenAt < 2000) return;
  if(window._pendingEggSlot !== null && window._pendingEggSlot !== undefined) return;

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
        addLog(t('main.log.slot_changed', {n: remoteSlotIdx+1}), 'info');
      }
      if(hasInbox) {
        addLog(t('main.log.inbox_eggs'), 'good');
        showBubble(t('main.bub.inbox_eggs'));
      }
    }
  } catch(e) { console.warn('visibilitychange sync error:', e); }
});

// ── Avatar Zoom Modal ──
// Trava/destrava o scroll do body (js/modal.js) — este overlay não passa
// pelo ModalManager. Guarda contra display já sendo 'flex' pra não travar
// duas vezes (openAvatarZoom/openAvatarZoomData podem ser chamados um
// depois do outro sem fechar entre eles).
function _lockZoomScroll() {
  const ov = document.getElementById('avatarZoomOverlay');
  if(ov.style.display !== 'flex' && typeof lockBodyScroll === 'function') lockBodyScroll();
}
function openAvatarZoom() {
  if(!hatched || !avatar || dead) return;
  const size = 260;
  const zoomEl = document.getElementById('avatarZoomSVG');
  // O zoom mostra o que o jogador vê, portanto a fase vista.
  zoomEl.innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, size, size, getFaseVisual());
  zoomEl.className = (activeDiseases.length > 0 || sick) ? 'diseased' : sleeping ? 'sleeping' : '';
  document.getElementById('avatarZoomName').textContent = avatar.nome ? avatar.nome.split(',')[0] : '';
  document.getElementById('avatarZoomInfo').textContent = t('main.zoom.info', {elem: avatar.elemento, rar: avatar.raridade, fase: FASES[getFase()], nivel});
  if(typeof preencherFichaZoom === 'function') preencherFichaZoom(avatar.seed, avatar.raridade, avatar.elemento, nivel, avatar.nascimento);
  _lockZoomScroll();
  const ov = document.getElementById('avatarZoomOverlay');
  ov.style.display = 'flex';
}
function closeAvatarZoom() {
  const ov = document.getElementById('avatarZoomOverlay');
  if(ov.style.display === 'flex' && typeof unlockBodyScroll === 'function') unlockBodyScroll();
  ov.style.display = 'none';
}

// Zoom genérico — usado no marketplace e meus avatares
function openAvatarZoomData(elemento, raridade, seed, nivelAv, nome, slot) {
  const size  = 260;
  const fase  = faseFromNivel(nivelAv);
  const fases = ['BEBÊ','CRIANÇA','JOVEM','ADULTO'];
  document.getElementById('avatarZoomSVG').innerHTML = gerarSVG(slot || elemento, raridade, seed, size, size, fase);
  document.getElementById('avatarZoomSVG').className = '';
  document.getElementById('avatarZoomName').textContent = nome ? nome.split(',')[0] : '';
  document.getElementById('avatarZoomInfo').textContent = t('main.zoom.info', {elem: elemento, rar: raridade, fase: fases[fase], nivel: nivelAv||1});
  if(typeof preencherFichaZoom === 'function') preencherFichaZoom(seed, raridade, elemento, nivelAv || 1, slot && slot.nascimento);
  _lockZoomScroll();
  document.getElementById('avatarZoomOverlay').style.display = 'flex';
}

window.openAvatarZoom      = openAvatarZoom;
window.closeAvatarZoom     = closeAvatarZoom;
window.openAvatarZoomData  = openAvatarZoomData;
