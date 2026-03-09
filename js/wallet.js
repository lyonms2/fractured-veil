// WALLET + FIREBASE AUTH
// ═══════════════════════════════════════════════════════════════════

async function disconnectWallet() {
  window._fvConnected = false;

  // Revoga permissão do site no MetaMask — força login manual no próximo acesso
  try {
    if(window.ethereum) {
      await window.ethereum.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      });
    }
  } catch(e) { /* ignora se não suportado */ }

  document.getElementById('loginScreen').style.display = 'flex';
  // ── Reset full game state ──
  avatar = null;
  hatched = false; dead = false; sick = false; sleeping = false;
  nivel = 1; xp = 0; vinculo = 0; totalSecs = 0; tickCount = 0;
  eggClicks = 0; eggLayCooldown = 0;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  Object.assign(gs, { moedas:100, ovos:0, primeira:true });
  eggsInInventory = [];
  dirtyLevel = 0; poopCount = 0; poopPressure = 0;
  walletAddress = null;

  // ── Reset screens ──
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

  // ── Reset header ──
  document.getElementById('walletInfo').style.display    = 'none';
  document.getElementById('btnMarket').style.display    = 'none';
  document.getElementById('resMoedasBtn').style.display  = 'none';
  document.getElementById('resCristaisBtn').style.display = 'none';
  document.getElementById('resOvosBtn').style.display    = 'none';
  document.getElementById('resItemsBtn').style.display   = 'none';

  // ── Show wallet warning in summon card ──
  const ww = document.getElementById('walletWarning');
  const ss = document.getElementById('summonSection');
  if(ww) ww.style.display = 'block';
  if(ss) ss.style.display = 'none';

  // ── Clear save timeout ──
  clearTimeout(_saveTimeout);

  document.getElementById('logList').innerHTML = '';
  addLog('Sessão encerrada. Conecte a carteira para continuar.', 'info');
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
    // Uma só chamada — eth_requestAccounts só pede popup se necessário
    // Se já autorizado (via autoConnect), não abre popup nenhum
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    walletAddress = accounts[0].toLowerCase();
    window._fvConnected = true;
    document.getElementById('loginScreen').style.display = 'none';
    // Mostra loading overlay — esconde tudo até Firebase responder
    const _glo = document.getElementById('gameLoadingOverlay');
    if(_glo) _glo.style.display = 'flex';
    const short = walletAddress.slice(0,6) + '...' + walletAddress.slice(-4);
    document.getElementById('walletShort').textContent = short;
    document.getElementById('walletInfo').style.display = 'flex';

    const loaded = await loadFromFirebase();
    // Agora que temos dados, mostra botões e esconde overlay
    document.getElementById('resMoedasBtn').style.display = '';
    document.getElementById('resCristaisBtn').style.display = '';
    document.getElementById('resOvosBtn').style.display = '';
    document.getElementById('resItemsBtn').style.display = '';
    document.getElementById('btnMarket').style.display = 'flex';
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

      // ── Apply offline decay ──
      if(hatched && !dead) {
        const offlineSecs = Math.floor((Date.now() - (window.loadedLastSeen || Date.now())) / 1000);
        const offlineCycles = Math.floor(offlineSecs / 60);
        if(offlineCycles > 0) {
          const _d = rarityBonus().decay;
          let wasSleeping = sleeping;
          // MODO REPOUSO: após 30min offline o avatar entra em repouso automático
          // Repouso = como dormir, mas fome cai muito devagar e energia não recupera
          // Garante sobrevivência de pelo menos 12h offline
          const REPOUSO_THRESHOLD = 30; // ciclos até entrar em repouso

          for(let _i = 0; _i < Math.min(offlineCycles, 2880); _i++) {
            const emRepouso = !wasSleeping && _i >= REPOUSO_THRESHOLD;

            if(wasSleeping) {
              // Dormindo manualmente: energia recupera normalmente
              vitals.energia = Math.min(100, vitals.energia + 0.5 * _d * getItemEffect('sleepEnergyMult'));
              if(vitals.energia >= 100) {
                vitals.energia = 100;
                wasSleeping = false;
              }
            } else if(emRepouso) {
              // Modo repouso automático — avatar "descansa"
              vitals.fome    = Math.max(0, vitals.fome    - (0.05 * _d));
              vitals.higiene = Math.max(0, vitals.higiene - 0.03);
              vitals.humor   = Math.max(0, vitals.humor   - 0.02);
              vinculo        = Math.max(0, vinculo        - 0.01);
              // Saúde só cai se fome absolutamente zerada
              if(vitals.fome < 5) vitals.saude = Math.max(0, vitals.saude - 0.05);
              if(vitals.saude <= 0) { vitals.saude = 0; break; }
            } else {
              // Primeiros 30min offline — decay normal mas já mais lento que online
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
          // Update sleep state: if woke up naturally offline, mark awake
          if(sleeping && !wasSleeping) {
            sleeping = false;
            addLog('Acordou com energia plena enquanto estava offline! ☀️', 'good');
          }
          if(vitals.saude < 30 && Math.random() < 0.4) sick = true;
          totalSecs += offlineSecs; // acumula tempo offline no cronômetro
          saveRuntimeToSlot(activeSlotIdx); // flush decay into slot
          const hrs  = Math.floor(offlineSecs / 3600);
          const mins = Math.floor((offlineSecs % 3600) / 60);
          const emRepouso = offlineCycles > 30 && !sleeping;
          addLog(`Ausente por ${hrs}h ${mins}min — ${emRepouso ? '💤 modo repouso ativado' : 'stats atualizados'}.`, 'info');
          if(vitals.saude <= 0) {
            dead = true;
            addLog(`${avatar ? avatar.nome.split(',')[0] : 'Avatar'} não sobreviveu à sua ausência...`, 'bad');
          }
        }
      }

      // ── Rebuild screens ──
      if(dead && avatar) {
        // Dead — hide everything, show death screen directly
        document.getElementById('idleScreen').style.display    = 'none';
        document.getElementById('eggScreen').style.display     = 'none';
        document.getElementById('aliveScreen').style.display   = 'none';
        document.getElementById('summonCard').style.display    = 'none';
        document.getElementById('creatureCard').style.display  = 'none';
        document.getElementById('statusCard').style.display    = 'none';
        document.getElementById('actionBtns').style.opacity    = '0';
        document.getElementById('actionBtns').style.pointerEvents = 'none';
        // Populate death screen manually (killCreature saves to Firebase which we don't want on restore)
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
        // Alive and hatched
        setupAvatar();
        document.getElementById('idleScreen').style.display   = 'none';
        document.getElementById('eggScreen').style.display    = 'none';
        document.getElementById('aliveScreen').style.display  = 'block';
        document.getElementById('deadScreen').style.display   = 'none';
        document.getElementById('statusCard').style.display   = 'block';
        document.getElementById('actionBtns').style.opacity   = '1';
        document.getElementById('actionBtns').style.pointerEvents = 'all';
        document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize());
        updateAvatarSize();
        document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
        updateAllUI();
        updateResourceUI();

        // Restore sleep visual
        if(sleeping) startSleep();

        // Restore poop visuals
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
        // Avatar exists but egg not yet hatched — restore egg screen
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

    // Esconde overlay — jogo pronto
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
  if(typeof window.ethereum === 'undefined') return; // sem MetaMask — mostra login
  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if(accounts.length > 0) {
      // Sessão já autorizada — entra sem popup
      document.getElementById('loginScreen').style.display = 'none';
      const loginBtn  = document.getElementById('loginBtn');
      const loginBtnT = document.getElementById('loginBtnText');
      if(loginBtn)  loginBtn.disabled = true;
      if(loginBtnT) loginBtnT.textContent = 'CONECTANDO...';
      await connectWallet();
    }
    // Sem sessão — loginScreen fica visível, utilizador clica manualmente
  } catch(e) {
    // Silencioso — não mostra erro, só aguarda clique manual
    console.warn('Auto-connect silencioso falhou:', e.message);
  }
})();
