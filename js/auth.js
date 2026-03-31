// ═══════════════════════════════════════════════════════════════════
// AUTH — Firebase Email/Password
// Substitui wallet.js como sistema de autenticação principal.
// walletAddress continua existindo como variável global — agora
// recebe o uid do Firebase Auth em vez do endereço Ethereum.
// MetaMask continua disponível apenas em cristais.js (marketplace).
// ═══════════════════════════════════════════════════════════════════

function fbAuth() { return typeof firebase !== 'undefined' ? firebase.auth() : null; }

let _sessionId   = null;
let _sessionUnsub = null;

// ─── Mostrar/esconder abas do login ───────────────────────────────
function authShowTab(tab) {
  document.getElementById('authTabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('authTabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('authFormLogin').style.display    = tab === 'login'    ? 'flex' : 'none';
  document.getElementById('authFormRegister').style.display = tab === 'register' ? 'flex' : 'none';
  document.getElementById('authFormReset').style.display    = 'none';
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  errEl.style.color = '#e74c3c'; // repõe vermelho (não '' — apagaria a cor do inline style)
}

function authShowReset() {
  document.getElementById('authFormLogin').style.display    = 'none';
  document.getElementById('authFormRegister').style.display = 'none';
  document.getElementById('authFormReset').style.display    = 'flex';
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  errEl.style.color = '#e74c3c';
}

// ─── Login ────────────────────────────────────────────────────────
async function loginComEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');

  if(!email || !senha) { errEl.style.color = '#e74c3c'; errEl.textContent = t('auth.fill_fields'); return; }

  btn.disabled = true;
  document.getElementById('loginBtnText').textContent = t('auth.btn.logging_in');
  errEl.textContent = '';

  try {
    await fbAuth().signInWithEmailAndPassword(email, senha);
    // onAuthStateChanged trata o resto
  } catch(e) {
    btn.disabled = false;
    document.getElementById('loginBtnText').textContent = t('auth.btn.login');
    const msgs = {
      'auth/user-not-found':    t('auth.error.not_found'),
      'auth/wrong-password':    t('auth.error.wrong_pass'),
      'auth/invalid-email':     t('auth.error.invalid_email'),
      'auth/too-many-requests': t('auth.error.too_many'),
      'auth/invalid-credential':t('auth.error.invalid_cred'),
    };
    errEl.style.color = '#e74c3c';
    errEl.textContent = msgs[e.code] || t('auth.error.login');
  }
}

// ─── Registro ─────────────────────────────────────────────────────
async function registrarComEmail() {
  const email  = document.getElementById('regEmail').value.trim();
  const senha  = document.getElementById('regSenha').value;
  const senha2 = document.getElementById('regSenha2').value;
  const errEl  = document.getElementById('loginError');
  const btn    = document.getElementById('regBtn');

  if(!email || !senha) { errEl.style.color = '#e74c3c'; errEl.textContent = t('auth.reg.fill_all'); return; }
  if(senha !== senha2)  { errEl.style.color = '#e74c3c'; errEl.textContent = t('auth.reg.pass_mismatch'); return; }
  if(senha.length < 6)  { errEl.style.color = '#e74c3c'; errEl.textContent = t('auth.reg.pass_short'); return; }

  btn.disabled = true;
  btn.textContent = t('auth.btn.creating');
  errEl.textContent = '';

  try {
    await fbAuth().createUserWithEmailAndPassword(email, senha);
    // onAuthStateChanged trata o resto
  } catch(e) {
    btn.disabled = false;
    btn.textContent = t('auth.btn.create');
    const msgs = {
      'auth/email-already-in-use': t('auth.reg.email_in_use'),
      'auth/invalid-email':        t('auth.error.invalid_email'),
      'auth/weak-password':        t('auth.reg.weak_pass'),
    };
    errEl.style.color = '#e74c3c';
    errEl.textContent = msgs[e.code] || t('auth.reg.error');
  }
}

// ─── Reset de senha ───────────────────────────────────────────────
async function enviarResetSenha() {
  const email = document.getElementById('resetEmail').value.trim();
  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('resetBtn');

  if(!email) { errEl.style.color = '#e74c3c'; errEl.textContent = t('auth.reset.fill'); return; }

  btn.disabled = true;
  btn.textContent = t('auth.btn.sending');
  errEl.textContent = '';

  try {
    await fbAuth().sendPasswordResetEmail(email);
    errEl.style.color = '#7ab87a';
    errEl.textContent = t('auth.reset.sent');
    btn.textContent = t('auth.btn.sent');
  } catch(e) {
    btn.disabled = false;
    btn.textContent = t('auth.btn.send_email');
    errEl.style.color = '#e74c3c';
    const msgs = {
      'auth/user-not-found': t('auth.reset.not_found'),
      'auth/invalid-email':  t('auth.error.invalid_email'),
    };
    errEl.textContent = msgs[e.code] || t('auth.reset.error');
  }
}

// ─── Logout ───────────────────────────────────────────────────────
async function disconnectWallet() {
  window._fvConnected = false;
  if(_sessionUnsub) { _sessionUnsub(); _sessionUnsub = null; }
  _sessionId = null;
  // Limpa walletAddress antes do signOut para evitar dupla chamada:
  // onAuthStateChanged dispara com user=null enquanto walletAddress ainda estaria definido,
  // causando uma segunda invocação concorrente de disconnectWallet().
  walletAddress = null;
  try { await fbAuth().signOut(); } catch(e) {}

  // Reset estado do jogo
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
  window._cambioLog = null;

  // Reset UI
  document.getElementById('loginScreen').style.display = 'flex';
  authShowTab('login');

  document.getElementById('idleScreen').style.display       = 'flex';
  document.getElementById('eggScreen').style.display        = 'none';
  document.getElementById('aliveScreen').style.display      = 'none';
  document.getElementById('deadScreen').style.display       = 'none';
  document.getElementById('statusCard').style.display       = 'none';
  document.getElementById('actionBtns').style.opacity       = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';
  document.getElementById('summonCard').style.display       = 'block';
  document.getElementById('creatureCard').style.display     = 'none';
  document.getElementById('poopContainer').innerHTML        = '';
  document.getElementById('dirtLayer').className            = '';

  document.getElementById('walletInfo').style.display       = 'none';
  document.getElementById('btnMarket').style.display        = 'none';
  document.getElementById('resMoedasBtn').style.display     = 'none';
  document.getElementById('resCristaisBtn').style.display   = 'none';
  document.getElementById('resOvosBtn').style.display       = 'none';
  document.getElementById('resItemsBtn').style.display      = 'none';

  const ww = document.getElementById('walletWarning');
  const ss = document.getElementById('summonSection');
  if(ww) ww.style.display = 'block';
  if(ss) ss.style.display = 'none';

  clearTimeout(_saveTimeout);
  document.getElementById('logList').innerHTML = '';
  addLog('Sessão encerrada.', 'info');
}

// ─── Visibilidade do header ───────────────────────────────────────
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

// ─── Após autenticação bem-sucedida ──────────────────────────────
async function _onLoginSuccess(user) {
  walletAddress = user.uid;
  window._fvConnected = true;

  document.getElementById('loginScreen').style.display = 'none';
  const _glo = document.getElementById('gameLoadingOverlay');
  if(_glo) _glo.style.display = 'flex';

  // Mostra email curto no header
  const emailShort = user.email
    ? (user.email.length > 18 ? user.email.slice(0, 15) + '...' : user.email)
    : 'jogador';
  document.getElementById('walletShort').textContent = emailShort;
  document.getElementById('walletInfo').style.display = 'flex';

  const loaded = await loadFromFirebase();

  // ── Session guard: impede dois dispositivos simultâneos ──
  if(fbDb()) {
    _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    // Aguarda o set() terminar antes de ativar o listener —
    // evita race condition onde o snapshot inicial chega com o sessionId
    // antigo e dispara um falso logout (common em mobile/throttle).
    await fbDb().collection('players').doc(walletAddress).set({ sessionId: _sessionId }, { merge: true });
    if(_sessionUnsub) _sessionUnsub();
    // Janela de graça de 3s após o set() — no mobile o Firestore dispara
    // 2-3 snapshots rápidos (cache local → write local → confirmação servidor)
    // e um deles pode ter o sessionId antigo, causando falso logout.
    const _sessionSetAt = Date.now();
    _sessionUnsub = fbDb().collection('players').doc(walletAddress).onSnapshot(snap => {
      if(Date.now() - _sessionSetAt < 3000) return; // ignora bursts iniciais
      if(!snap.exists || !_sessionId) return;
      const remote = snap.data().sessionId;
      if(remote && remote !== _sessionId) {
        addLog('⚠️ Sessão iniciada noutro dispositivo. A encerrar...', 'bad');
        if(typeof showBubble === 'function') showBubble(t('bubble.session_ended'));
        setTimeout(disconnectWallet, 1500);
      }
    });
  }

  updateHeaderButtons();

  const ww = document.getElementById('walletWarning');
  const ss = document.getElementById('summonSection');
  if(ww) ww.style.display = 'none';
  if(ss) ss.style.display = 'block';
  const _bs = document.getElementById('btnSummon');
  if(_bs) _bs.disabled = false;
  updateResourceUI();
  addLog(t('log.welcome_back'), 'good');

  if(loaded) {
    addLog(t('log.state_restored'), 'good');

    // ── Offline decay ──
    if(hatched && !dead) {
      const offlineSecs   = Math.floor((Date.now() - (window.loadedLastSeen || Date.now())) / 1000);
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

    // ── Rebuild screens ──
    if(dead && avatar) {
      document.getElementById('idleScreen').style.display   = 'none';
      document.getElementById('eggScreen').style.display    = 'none';
      document.getElementById('aliveScreen').style.display  = 'none';
      document.getElementById('summonCard').style.display   = 'none';
      document.getElementById('creatureCard').style.display = 'none';
      document.getElementById('statusCard').style.display   = 'none';
      document.getElementById('actionBtns').style.opacity   = '0';
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
      addLog(t('log.died', { name: _name }), 'bad');

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
        _repousoVisual(true);
        addLog(t('log.repouso_active'), 'info');
      }

      if(poopCount > 0) {
        const container = document.getElementById('poopContainer');
        if(container) {
          container.innerHTML = '';
          for(let _p = 0; _p < poopCount; _p++) {
            const pos = POOP_POSITIONS[_p % POOP_POSITIONS.length];
            const el  = document.createElement('div');
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
      document.getElementById('idleScreen').style.display    = 'none';
      document.getElementById('eggScreen').style.display     = 'flex';
      document.getElementById('aliveScreen').style.display   = 'none';
      document.getElementById('deadScreen').style.display    = 'none';
      document.getElementById('summonCard').style.display    = 'none';
      document.getElementById('creatureCard').style.display  = 'block';
      updateResourceUI();
    }

  } else {
    addLog(t('log.welcome_new'), 'good');
    updateResourceUI();
  }

  const _glo2 = document.getElementById('gameLoadingOverlay');
  if(_glo2) _glo2.style.display = 'none';

  // Iniciar listeners de jogos multiplayer
  if(typeof iniciarListenerDesafiosRecebidos === 'function') iniciarListenerDesafiosRecebidos();
  if(typeof verificarPartidaPendente         === 'function') verificarPartidaPendente();
  if(typeof rmIniciarListenerNotificacoes    === 'function') rmIniciarListenerNotificacoes();
  if(typeof bnIniciarListenerNotificacoes    === 'function') bnIniciarListenerNotificacoes();
  setTimeout(() => { if(typeof _limparSalasAntigas === 'function') _limparSalasAntigas(); }, 3000);
}

// ─── Listener de estado de autenticação (auto-login) ─────────────
// Roda assim que firebase.auth() está pronto
let _authListenerIniciado = false;
function iniciarAuthListener() {
  if(_authListenerIniciado) return;
  _authListenerIniciado = true;

  fbAuth().onAuthStateChanged(async user => {
    if(user && !walletAddress) {
      // Sessão ativa — entra direto sem mostrar login
      await _onLoginSuccess(user);
    } else if(!user && walletAddress) {
      // Sessão expirou
      await disconnectWallet();
    }
  });
}

// Compat: connectWallet ainda é chamado em alguns lugares do código
window.connectWallet = async function() {
  // No new auth flow connectWallet is a no-op if already logged in
  if(walletAddress) return;
  // Otherwise show login screen
  document.getElementById('loginScreen').style.display = 'flex';
};

// Exporta funções para inline handlers
window.authShowTab       = authShowTab;
window.authShowReset     = authShowReset;
window.loginComEmail     = loginComEmail;
window.registrarComEmail = registrarComEmail;
window.enviarResetSenha  = enviarResetSenha;
window.disconnectWallet  = disconnectWallet;
window.iniciarAuthListener = iniciarAuthListener;
