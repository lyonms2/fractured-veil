// WALLET + FIREBASE AUTH
// ═══════════════════════════════════════════════════════════════════

async function disconnectWallet() {
  window._fvConnected = false;

  try {
    if(window.ethereum) {
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      });
    }
  } catch(e) {}

  document.getElementById('loginScreen').style.display = 'flex';
  avatar = null;
  hatched = false; dead = false; sick = false; sleeping = false;
  nivel = 1; xp = 0; vinculo = 0; totalSecs = 0; tickCount = 0;
  eggClicks = 0; eggLayCooldown = 0;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  Object.assign(gs, { moedas:100, ovos:0, cristais:0, extraSlots:0, primeira:true });
  avatarSlots   = [null, null, null];
  activeSlotIdx = 0;
  eggsInInventory = [];
  itemInventory   = [];
  dirtyLevel = 0; poopCount = 0; poopPressure = 0;
  walletAddress = null;

  document.getElementById('idleScreen').style.display    = 'flex';
  document.getElementById('eggScreen').style.display     = 'none';
  document.getElementById('aliveScreen').style.display   = 'none';
  document.getElementById('deadScreen').style.display    = 'none';
  document.getElementById('statusCard').style.display    = 'none';
  document.getElementById('actionBtns').style.opacity    = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';
  document.getElementById('summonCard').style.display    = 'block';
  const _bs2 = document.getElementById('btnSummon');
  if(_bs2) _bs2.disabled = false;
  document.getElementById('creatureCard').style.display  = 'none';
  document.getElementById('poopContainer').innerHTML     = '';
  document.getElementById('dirtLayer').className         = '';

  document.getElementById('walletInfo').style.display    = 'none';
  document.getElementById('btnMarket').style.display    = 'none';
  document.getElementById('resMoedasBtn').style.display  = 'none';
  document.getElementById('resCristaisBtn').style.display = 'none';
  document.getElementById('resOvosBtn').style.display    = 'none';
  document.getElementById('resItemsBtn').style.display   = 'none';

  const ww = document.getElementById('walletWarning');
  const ss = document.getElementById('summonSection');
  if(ww) ww.style.display = 'block';
  if(ss) ss.style.display = 'none';

  clearTimeout(_saveTimeout);
  document.getElementById('logList').innerHTML = '';
  addLog('Sessão encerrada. Conecte a carteira para continuar.', 'info');
}

// ── Centraliza visibilidade dos botões do header ──────────────────
function updateHeaderButtons() {
  if(!walletAddress) return;
  const temAvatar = hatched && !dead;
  const temOvos   = eggsInInventory.length > 0;
  document.getElementById('btnMarket').style.display      = 'flex';
  document.getElementById('resCristaisBtn').style.display = '';
  document.getElementById('resMoedasBtn').style.display   = temAvatar ? '' : 'none';
  document.getElementById('resItemsBtn').style.display    = temAvatar ? '' : 'none';
  document.getElementById('resOvosBtn').style.display     = (temAvatar || temOvos) ? '' : 'none';
}

async function connectWallet() {
  if(walletAddress) {
    addLog(`Carteira: ${walletAddress}`, 'info');
    return;
  }
  if(typeof window.ethereum === 'undefined') {
    const le = document.getElementById('loginError');
    if(le) le.textContent = 'MetaMask não encontrada. Instale em metamask.io';
    addLog('MetaMask não encontrada. Instale em metamask.io', 'bad');
    return;
  }
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  if(loginBtn) { loginBtn.disabled=true; document.getElementById('loginBtnText').textContent='CONECTANDO...'; }
  if(loginError) loginError.textContent = '';
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    walletAddress = accounts[0].toLowerCase();
    window._fvConnected = true;
    document.getElementById('loginScreen').style.display = 'none';
    const _glo = document.getElementById('gameLoadingOverlay');
    if(_glo) _glo.style.display = 'flex';
    const short = walletAddress.slice(0,6) + '...' + walletAddress.slice(-4);
    document.getElementById('walletShort').textContent = short;
    document.getElementById('walletInfo').style.display = 'flex';

    const loaded = await loadFromFirebase();

    updateHeaderButtons();

    const ww = document.getElementById('walletWarning');
    const ss = document.getElementById('summonSection');
    if(ww) ww.style.display = 'none';
    if(ss) ss.style.display = 'block';
    const _bs = document.getElementById('btnSummon');
    if(_bs) _bs.disabled = false;
    updateResourceUI();
    addLog(`Carteira conectada: ${short}`, 'good');

    if(loaded) {
      addLog('Estado restaurado da nuvem! ☁️', 'good');

      // ── Presence: lastSeen e deadSlot server-side ──
      setupPresence(walletAddress);
      const _presData = await getPresenceData(walletAddress);
      if(_presData?.lastSeen > (window.loadedLastSeen || 0)) window.loadedLastSeen = _presData.lastSeen;
      if(_presData?.deadSlot != null) {
        const _ds = _presData.deadSlot;
        if(avatarSlots[_ds]) avatarSlots[_ds].dead = true;
        if(_ds === activeSlotIdx) dead = true;
        clearPresenceDead(walletAddress);
      }

      // ── Apply offline decay ──
      if(hatched && !dead) {
        const offlineSecs   = Math.floor((Date.now() - (window.loadedLastSeen || Date.now())) / 1000);
        const offlineCycles = Math.floor(offlineSecs / 60);
        if(offlineCycles > 0) {
          const _d = rarityBonus().decay;

          // Estado ao fechar — sem repouso automático
          let wasSleeping    = sleeping;
          let wasModoRepouso = modoRepouso;
          let sonoEsgotado   = false;

          for(let _i = 0; _i < Math.min(offlineCycles, 4320); _i++) {

            if(wasSleeping) {
              // A dormir → recupera energia, acorda quando cheia
              vitals.energia = Math.min(100, vitals.energia + 0.5 * _d * getItemEffect('sleepEnergyMult'));
              if(vitals.energia >= 100) {
                vitals.energia = 100;
                wasSleeping  = false;
                sonoEsgotado = true;
              }

            } else if(wasModoRepouso) {
              // Modo repouso manual → decay mínimo + recupera energia lentamente
              vitals.fome    = Math.max(0, vitals.fome    - (0.05 * _d));
              vitals.higiene = Math.max(0, vitals.higiene - 0.03);
              vitals.humor   = Math.max(0, vitals.humor   - 0.02);
              vitals.energia = Math.min(100, vitals.energia + 0.2);
              vinculo        = Math.max(0, vinculo        - 0.01);
              if(vitals.fome < 5) vitals.saude = Math.max(0, vitals.saude - 0.05);
              if(vitals.saude <= 0) { vitals.saude = 0; break; }

            } else {
              // Acordado e activo → decay normal
              vitals.fome    = Math.max(0, vitals.fome    - 0.4 * _d * getItemEffect('fomeDecayMult'));
              vitals.humor   = Math.max(0, vitals.humor   - 0.25 * _d);
              vitals.energia = Math.max(0, vitals.energia - 0.3  * _d);
              vitals.higiene = Math.max(0, vitals.higiene - 0.06);
              if(vitals.fome    < 15) vitals.saude = Math.max(0, vitals.saude - 0.08);
              if(vitals.humor   < 10) vitals.saude = Math.max(0, vitals.saude - 0.03);
              if(vitals.energia < 5)  vitals.saude = Math.max(0, vitals.saude - 0.03);
              if(vitals.higiene < 15) vitals.saude = Math.max(0, vitals.saude - 0.02);
              if(vitals.saude <= 0)   { vitals.saude = 0; break; }
            }
          }

          if(sleeping && !wasSleeping) {
            sleeping = false;
            addLog('Acordou com energia plena enquanto estava offline! ☀️', 'good');
          }

          if(vitals.saude < 30 && Math.random() < 0.4) sick = true;
          totalSecs += offlineSecs;
          saveRuntimeToSlot(activeSlotIdx);
          const hrs  = Math.floor(offlineSecs / 3600);
          const mins = Math.floor((offlineSecs % 3600) / 60);
          const modoLog = wasSleeping || sonoEsgotado ? '☀️ acordou enquanto ausente'
                        : wasModoRepouso              ? '💤 modo repouso activo'
                        :                              'stats atualizados';
          addLog(`Ausente por ${hrs}h ${mins}min — ${modoLog}.`, 'info');
          if(vitals.saude <= 0) {
            dead = true;
            addLog(`${avatar ? avatar.nome.split(',')[0] : 'Avatar'} não sobreviveu à sua ausência...`, 'bad');
          }
        }
      }

      // ── Rebuild screens ──
      if(dead && avatar) {
        document.getElementById('idleScreen').style.display    = 'none';
        document.getElementById('eggScreen').style.display     = 'none';
        document.getElementById('aliveScreen').style.display   = 'none';
        document.getElementById('summonCard').style.display    = 'none';
        document.getElementById('creatureCard').style.display  = 'none';
        document.getElementById('statusCard').style.display    = 'none';
        document.getElementById('actionBtns').style.opacity    = '0';
        document.getElementById('actionBtns').style.pointerEvents = 'none';
        const _name = avatar.nome ? avatar.nome.split(',')[0] : 'Avatar';
        document.getElementById('deadAvatarName').textContent = _name.toUpperCase();
        const _h = Math.floor(totalSecs/3600), _m = Math.floor((totalSecs%3600)/60);
        document.getElementById('deadStats').innerHTML =
          `Nível ${nivel} · ${FASES[getFase()]} · ${eggsInInventory.length} ovo${eggsInInventory.length!==1?'s':''}<br>` +
          `Viveu ${_h > 0 ? _h+'h ' : ''}${_m}min · Vínculo: ${Math.floor(vinculo)}`;
        const dp = document.getElementById('deadParticles');
        if(dp) {
          dp.innerHTML = '';
          const souls = ['👻','✦','💀','✧','🌑'];
          for(let i=0;i<6;i++) {
            const s = document.createElement('div');
            s.className = 'dead-float-soul';
            s.textContent = souls[i%souls.length];
            s.style.cssText = `left:${15+Math.random()*70}%;bottom:${10+Math.random()*30}%;animation-delay:${(Math.random()*3).toFixed(1)}s;animation-duration:${(3+Math.random()*2).toFixed(1)}s;`;
            dp.appendChild(s);
          }
        }
        document.getElementById('deadScreen').style.display = 'flex';
        updateResourceUI();
        addLog(`${_name} partiu para outra dimensão... 💀`, 'bad');

      } else if(hatched && avatar) {
        setupAvatar();
        document.getElementById('idleScreen').style.display   = 'none';
        document.getElementById('eggScreen').style.display    = 'none';
        document.getElementById('aliveScreen').style.display  = 'block';
        document.getElementById('deadScreen').style.display   = 'none';
        document.getElementById('statusCard').style.display   = 'block';
        document.getElementById('actionBtns').style.opacity   = '1';
        document.getElementById('actionBtns').style.pointerEvents = 'all';
        document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize(), getFase());
        updateAvatarSize();
        document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
        updateAllUI();
        updateResourceUI();

        if(sleeping) startSleep();
        if(modoRepouso) {
          const _ov  = document.getElementById('repousoOverlay');
          const _btn = document.getElementById('btnSleep');
          if(_ov)  _ov.classList.add('active');
          if(_btn) {
            _btn.querySelector('.icon').textContent            = '💤';
            document.getElementById('sleepLabel').textContent = 'REPOUSO';
            _btn.classList.add('active-repouso');
          }
          document.getElementById('actionBtns').classList.add('repouso-mode');
          addLog('Modo repouso activo. 💤', 'info');
        }

        if(poopCount > 0) {
          const container = document.getElementById('poopContainer');
          if(container) {
            container.innerHTML = '';
            for(let _p = 0; _p < poopCount; _p++) {
              const pos = POOP_POSITIONS[_p % POOP_POSITIONS.length];
              const el = document.createElement('div');
              el.className = 'poop';
              el.style.left = pos.left; el.style.bottom = pos.bottom;
              el.style.zIndex = 6 + _p;
              el.title = 'Clique para limpar';
              el.style.transform = `scale(${(.8 + Math.random()*.4).toFixed(2)})`;
              el.textContent = '💩';
              el.onclick = (e) => { e.stopPropagation(); removePoop(el); };
              container.appendChild(el);
            }
          }
        }
        updateDirtyVisuals();
        updateEquippedDisplay();
        syncEasterEggs();

      } else if(avatar && !hatched) {
        setupAvatar();
        document.getElementById('idleScreen').style.display = 'none';
        document.getElementById('eggScreen').style.display  = 'flex';
        document.getElementById('aliveScreen').style.display= 'none';
        document.getElementById('deadScreen').style.display = 'none';
        document.getElementById('summonCard').style.display = 'none';
        document.getElementById('creatureCard').style.display = 'block';
        updateResourceUI();
      }
    } else {
      addLog('Nenhum save encontrado. Comece uma nova aventura!', 'info');
      updateResourceUI();
    }

    const _glo2 = document.getElementById('gameLoadingOverlay');
    if(_glo2) _glo2.style.display = 'none';

  } catch(e) {
    const _gloErr = document.getElementById('gameLoadingOverlay');
    if(_gloErr) _gloErr.style.display = 'none';
    const _msg = e.message?.includes('bloqueada') ? 'Desbloqueie o MetaMask primeiro.'
               : e.message?.includes('rejected') || e.code === 4001 ? 'Conexão cancelada.'
               : 'Erro ao conectar. Tente novamente.';
    const _le = document.getElementById('loginError');
    if(_le) _le.textContent = _msg;
    addLog(_msg, 'info');
    const _lb = document.getElementById('loginBtn');
    const _lt = document.getElementById('loginBtnText');
    if(_lb) _lb.disabled = false;
    if(_lt) _lt.textContent = 'CONECTAR METAMASK';
  }
}

// ═══════════════════════════════════════════
// AUTO-CONNECT SILENCIOSO AO CARREGAR
// ═══════════════════════════════════════════
(async function autoConnect() {
  if(typeof window.ethereum === 'undefined') return;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if(accounts.length > 0) {
      document.getElementById('loginScreen').style.display = 'none';
      const loginBtn  = document.getElementById('loginBtn');
      const loginBtnT = document.getElementById('loginBtnText');
      if(loginBtn)  loginBtn.disabled = true;
      if(loginBtnT) loginBtnT.textContent = 'CONECTANDO...';
      await connectWallet();
    }
  } catch(e) {
    console.warn('Auto-connect silencioso falhou:', e.message);
  }
})();
