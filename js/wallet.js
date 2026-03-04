// WALLET + FIREBASE AUTH
// ═══════════════════════════════════════════════════════════════════

function disconnectWallet() {
  window._fvConnected = false;
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
    addLog('MetaMask não encontrada. Instale em metamask.io', 'bad');
    showBubble('Precisa da MetaMask! 🦊');
    return;
  }
  try {
    // Sempre exige confirmação via popup do MetaMask
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    walletAddress = accounts[0].toLowerCase();
    window._fvConnected = true;
    const short = walletAddress.slice(0,6) + '...' + walletAddress.slice(-4);
    document.getElementById('walletShort').textContent = short;
    document.getElementById('walletInfo').style.display = 'flex';
    // Show resource counters
    document.getElementById('resMoedasBtn').style.display = '';
    document.getElementById('resOvosBtn').style.display = '';
    document.getElementById('resItemsBtn').style.display = '';
    updateResourceUI();

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
          // Simulate each cycle properly
          for(let _i = 0; _i < Math.min(offlineCycles, 2880); _i++) { // cap at 48h
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
          if(vitals.saude < 30 && Math.random() < 0.4) sick = true;
          const hrs  = Math.floor(offlineSecs / 3600);
          const mins = Math.floor((offlineSecs % 3600) / 60);
          addLog(`Ausente por ${hrs}h ${mins}min — stats atualizados.`, 'info');
          // Kill if health reached zero offline
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
        // ── BUG 1 FIX: render avatar SVG ──
        document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 140, 140);
        document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFase()]}`;
        updateAllUI();
      } else if(dead && avatar) {
        setupAvatar();
        killCreature();
      }
    } else {
      addLog('Nenhum save encontrado. Comece uma nova aventura!', 'info');
    }

    if(ModalManager.isOpen('coinShopModal')) renderCoinPackages();
  } catch(e) {
    addLog('Conexão cancelada.', 'info');
  }
}
