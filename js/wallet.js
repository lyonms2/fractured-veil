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
  dirtyLevel = 0; poopCount = 0; poopCooldown = 5;
  xpBoostActive = false; xpBoostTimer = 0;
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
  document.getElementById('btnMarket').style.display     = 'none';
  document.getElementById('btnMarket').style.visibility  = 'hidden';
  document.getElementById('resMoedasBtn').style.display  = 'none';
  document.getElementById('resOvosBtn').style.display    = 'none';

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
    // Verifica se MetaMask está bloqueada antes de prosseguir
    const isUnlocked = await window.ethereum._metamask?.isUnlocked?.();
    if(isUnlocked === false) {
      // Bloqueada — força popup de desbloqueio via eth_requestAccounts
      // Se o usuário não desbloquear, lança exceção e cai no catch
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    }
    // Agora busca a conta (bloqueada ou já autorizada)
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    // Verifica novamente após o popup — se ainda bloqueada, rejeita
    const stillUnlocked = await window.ethereum._metamask?.isUnlocked?.();
    if(stillUnlocked === false) {
      throw new Error('Carteira ainda bloqueada');
    }
    walletAddress = accounts[0].toLowerCase();
    window._fvConnected = true;
    document.getElementById('loginScreen').style.display = 'none';
    const short = walletAddress.slice(0,6) + '...' + walletAddress.slice(-4);
    document.getElementById('walletShort').textContent = short;
    document.getElementById('walletInfo').style.display = 'flex';
    // Show resource counters
    document.getElementById('resMoedasBtn').style.display = '';
    document.getElementById('resOvosBtn').style.display = '';
    document.getElementById('resItemsBtn').style.display = '';
    updateResourceUI();
    const _bs = document.getElementById('btnSummon');
    if(_bs) _bs.disabled = false;

    // Show market button
    document.getElementById('btnMarket').style.display = 'inline-block';
    document.getElementById('btnMarket').style.visibility = 'visible';
    // Reveal summon section
    const ww = document.getElementById('walletWarning');
    const ss = document.getElementById('summonSection');
    if(ww) ww.style.display = 'none';
    if(ss) ss.style.display = 'block';

    addLog(`Carteira conectada: ${short}`, 'good');
    showBubble('Carteira conectada! 🦊');

    // Load saved state
    addLog('Carregando dados...', 'info');
    // Show summon section regardless
    const ww2 = document.getElementById('walletWarning');
    const ss2 = document.getElementById('summonSection');
    if(ww2) ww2.style.display = 'none';
    if(ss2) ss2.style.display = 'block';
    const loaded = await loadFromFirebase();
    if(loaded) {
      addLog('Estado restaurado da nuvem! ☁️', 'good');

      // ── Apply offline decay ──
      if(hatched && !dead) {
        const offlineSecs = Math.floor((Date.now() - (window.loadedLastSeen || Date.now())) / 1000);
        const offlineCycles = Math.floor(offlineSecs / 60);
        if(offlineCycles > 0) {
          const _d = rarityBonus().decay;
          let wasSleeping = sleeping;
          for(let _i = 0; _i < Math.min(offlineCycles, 2880); _i++) {
            if(wasSleeping) {
              // Sleeping: only energia recovers, no decay on other stats
              vitals.energia = Math.min(100, vitals.energia + 0.5 * _d);
              if(vitals.energia >= 100) {
                vitals.energia = 100;
                wasSleeping = false; // woke up naturally mid-offline
              }
            } else {
              vitals.fome    = Math.max(0, vitals.fome    - 1.0 * _d * getItemEffect('fomeDecayMult'));
              vitals.humor   = Math.max(0, vitals.humor   - 0.5 * _d);
              vitals.energia = Math.max(0, vitals.energia - 0.3 * _d);
              vitals.higiene = Math.max(0, vitals.higiene - 0.25 * _d);
              if(vitals.fome    < 20) vitals.saude = Math.max(0, vitals.saude - 0.8);
              if(vitals.humor   < 15) vitals.saude = Math.max(0, vitals.saude - 0.4);
              if(vitals.energia < 10) vitals.saude = Math.max(0, vitals.saude - 0.2);
              if(vitals.higiene < 20) vitals.saude = Math.max(0, vitals.saude - 0.2);
              if(vitals.saude <= 0)   { vitals.saude = 0; break; }
            }
          }
          // Update sleep state: if woke up naturally offline, mark awake
          if(sleeping && !wasSleeping) {
            sleeping = false;
            addLog('Acordou com energia plena enquanto estava offline! ☀️', 'good');
          }
          if(vitals.saude < 30 && Math.random() < 0.4) sick = true;
          const hrs  = Math.floor(offlineSecs / 3600);
          const mins = Math.floor((offlineSecs % 3600) / 60);
          addLog(`Ausente por ${hrs}h ${mins}min — stats atualizados.`, 'info');
          if(vitals.saude <= 0) {
            dead = true;
            addLog(`${avatar ? avatar.nome.split(',')[0] : 'Avatar'} não sobreviveu à sua ausência...`, 'bad');
          }
        }
      }

      // ── Rebuild screens ──
      if(hatched && avatar && !dead) {
        setupAvatar();
        document.getElementById('idleScreen').style.display   = 'none';
        document.getElementById('eggScreen').style.display    = 'none';
        document.getElementById('aliveScreen').style.display  = 'block';
        document.getElementById('deadScreen').style.display   = 'none';
        document.getElementById('statusCard').style.display   = 'block';
        document.getElementById('actionBtns').style.opacity   = '1';
        document.getElementById('actionBtns').style.pointerEvents = 'all';
        document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 140, 140);
        document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
        updateAllUI();

        // ── BUG 1: Restore sleep visual state ──
        if(sleeping) {
          startSleep();
        }

        // ── BUG 2: Restore equipped items orb display ──
        updateEquippedDisplay();

      } else if(dead && avatar) {
        setupAvatar();
        killCreature();
      }
    } else {
      addLog('Nenhum save encontrado. Comece uma nova aventura!', 'info');
    }

    if(ModalManager.isOpen('coinShopModal')) renderCoinPackages();
  } catch(e) {
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
