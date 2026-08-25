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

// ── Capturar ?ref= da URL e guardar no localStorage ──────────────
// Feito imediatamente ao carregar a página, antes do login,
// para preservar o código de convite mesmo após redirecionamentos.
(function _captureRef() {
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.length >= 5 && ref.length <= 128) {
      localStorage.setItem('fv_pending_ref', ref);
    }
  } catch(e) {}
})();

// ─── Mostrar/esconder abas do login ───────────────────────────────
function _authMsg(msg, type = 'error') {
  const el = document.getElementById('loginError');
  if(!el) return;
  el.className = 'msg-' + type;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
  if(msg) {
    // re-trigger animation
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }
}

function authShowTab(tab) {
  document.getElementById('authTabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('authTabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('authFormLogin').style.display    = tab === 'login'    ? 'flex' : 'none';
  document.getElementById('authFormRegister').style.display = tab === 'register' ? 'flex' : 'none';
  document.getElementById('authFormReset').style.display    = 'none';
  _authMsg('');
}

function authShowReset() {
  document.getElementById('authFormLogin').style.display    = 'none';
  document.getElementById('authFormRegister').style.display = 'none';
  document.getElementById('authFormReset').style.display    = 'flex';
  _authMsg('');
}

// ─── Login ────────────────────────────────────────────────────────
async function loginComEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const btn   = document.getElementById('loginBtn');

  if(!email || !senha) { _authMsg(t('auth.fill_fields')); return; }

  btn.disabled = true;
  document.getElementById('loginBtnText').textContent = t('auth.btn.logging_in');
  _authMsg('');

  try {
    const cred = await fbAuth().signInWithEmailAndPassword(email, senha);
    if(!cred.user.emailVerified) {
      await fbAuth().signOut();
      btn.disabled = false;
      document.getElementById('loginBtnText').textContent = t('auth.btn.login');
      _authMsg(t('auth.error.not_verified'), 'warn');
      return;
    }
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
    _authMsg(msgs[e.code] || t('auth.error.login'));
  }
}

// ─── Registro ─────────────────────────────────────────────────────
async function registrarComEmail() {
  const email  = document.getElementById('regEmail').value.trim();
  const senha  = document.getElementById('regSenha').value;
  const senha2 = document.getElementById('regSenha2').value;
  const btn    = document.getElementById('regBtn');

  if(!email || !senha) { _authMsg(t('auth.reg.fill_all')); return; }
  if(senha !== senha2)  { _authMsg(t('auth.reg.pass_mismatch')); return; }
  if(senha.length < 6)  { _authMsg(t('auth.reg.pass_short')); return; }

  btn.disabled = true;
  btn.textContent = t('auth.btn.creating');
  _authMsg('');

  try {
    const cred = await fbAuth().createUserWithEmailAndPassword(email, senha);
    await cred.user.sendEmailVerification();
    // Faz logout imediato — só entra após verificar o email
    await fbAuth().signOut();
    btn.disabled = false;
    btn.textContent = t('auth.btn.create');
    authShowTab('login');
    // authShowTab limpa a mensagem — escrever depois via microtask
    Promise.resolve().then(() => _authMsg(t('auth.reg.success'), 'success'));
  } catch(e) {
    btn.disabled = false;
    btn.textContent = t('auth.btn.create');
    const msgs = {
      'auth/email-already-in-use': t('auth.reg.email_in_use'),
      'auth/invalid-email':        t('auth.error.invalid_email'),
      'auth/weak-password':        t('auth.reg.weak_pass'),
    };
    _authMsg(msgs[e.code] || t('auth.reg.error'));
  }
}

// ─── Reset de senha ───────────────────────────────────────────────
async function enviarResetSenha() {
  const email = document.getElementById('resetEmail').value.trim();
  const btn   = document.getElementById('resetBtn');

  if(!email) { _authMsg(t('auth.reset.fill')); return; }

  btn.disabled = true;
  btn.textContent = t('auth.btn.sending');
  _authMsg('');

  try {
    await fbAuth().sendPasswordResetEmail(email);
    _authMsg(t('auth.reset.sent'), 'success');
    btn.textContent = t('auth.btn.sent');
  } catch(e) {
    btn.disabled = false;
    btn.textContent = t('auth.btn.send_email');
    const msgs = {
      'auth/user-not-found': t('auth.reset.not_found'),
      'auth/invalid-email':  t('auth.error.invalid_email'),
    };
    _authMsg(msgs[e.code] || t('auth.reset.error'));
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
  Object.assign(gs, { moedas:200, ovos:0, cristais:0, extraSlots:0, totalInvocacoes:0, equipa:null, primeira:true });
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

  // ── Registar referral no primeiro acesso (jogador novo) ──
  // Se o jogador acessou o jogo via link de convite (?ref=UID),
  // o ref foi salvo no localStorage antes do login.
  // Enviamos ao servidor uma única vez — a cadeia L1/L2/L3 é imutável.
  if (!loaded) {
    const pendingRef = localStorage.getItem('fv_pending_ref');
    if (pendingRef) {
      try {
        const refToken = await firebase.auth().currentUser.getIdToken();
        const refRes   = await fetch('/api/resgatar', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ idToken: refToken, action: 'salvar-referral', refUid: pendingRef }),
        });
        if (refRes.ok) localStorage.removeItem('fv_pending_ref');
      } catch(e) { /* falha silenciosa — tentará novamente no próximo login */ }
    }
  }

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

    // ── Presence: lastSeen e deadSlot server-side ──
    setupPresence(walletAddress);
    const _presData = await getPresenceData(walletAddress);
    if(_presData?.lastSeen > (window.loadedLastSeen || 0)) window.loadedLastSeen = _presData.lastSeen;
    if(_presData?.deadSlot != null) {
      const _ds = _presData.deadSlot;
      if(avatarSlots[_ds]) avatarSlots[_ds].dead = true;
      if(_ds === activeSlotIdx) dead = true;
      // Persiste dead:true no Firestore antes de apagar o backup RTDB.
      // Sem isto, um segundo refresh apagava a morte (Firestore ainda tinha dead:false).
      await saveToFirebase();
      clearPresenceDead(walletAddress);
    }

    // ── Offline: avatar fica em pausa — nada decai nem o tempo de vida
    // avança enquanto o jogador está ausente (idade = tempo de jogo real,
    // usado no card de venda no marketplace). Excepção: dormindo, a energia
    // continua a subir (mais devagar que ao vivo), o resto continua parado. ──
    if(hatched && !dead) {
      const offlineSecs = Math.floor((Date.now() - (window.loadedLastSeen || Date.now())) / 1000);
      if(offlineSecs > 0) {
        let status = t('log.offline_paused');
        if(sleeping && vitals.energia < 100) {
          // O Amuleto do Sono Profundo conta aqui também. Prometia
          // "energia recupera 2× mais rápido dormindo" e só valia ao
          // vivo — mas dormir com o separador fechado É a forma de
          // dormir, portanto o amuleto não fazia nada onde mais fazia
          // falta. Os itens são do avatar em campo, e este ramo só corre
          // para esse, que é o que estava a dormir.
          const offlineCycles = Math.floor(offlineSecs / 60);
          const porCiclo = OFFLINE_SLEEP_ENERGY_PER_CYCLE * getItemEffect('sleepEnergyMult');
          vitals.energia = Math.min(100, vitals.energia + offlineCycles * porCiclo);
          status = t('log.offline_slept');
          if(vitals.energia >= 100) {
            sleeping = false;
            addLog(t('log.woke_offline'), 'good');
          }
        }
        saveRuntimeToSlot(activeSlotIdx);
        const hrs  = Math.floor(offlineSecs / 3600);
        const mins = Math.floor((offlineSecs % 3600) / 60);
        addLog(t('log.offline_away', { h: hrs, m: mins, status }), 'info');
      }
    }

    // ── Ovos que apodreceram enquanto estavas fora ──
    if(Array.isArray(window._ovosPodres) && window._ovosPodres.length) {
      const podres = window._ovosPodres;
      window._ovosPodres = null;
      const raros = podres.filter(o => o.raridade !== 'Comum').length;
      addLog(t(podres.length === 1 ? 'egg.log.apodreceu_1' : 'egg.log.apodreceu_n',
               { n: podres.length, raridade: podres[0].raridade }), 'bad');
      if(raros && typeof showToast === 'function')
        showToast(t('egg.toast.apodreceu_raro', { n: raros }), 'err');
    }

    // ── Quem passou cá enquanto estavas fora ──
    // A visita já não corre num sentido só: o vínculo veio somado do
    // servidor, e o recado aparece aqui. Sem isto, o medidor subia
    // sozinho e ninguém sabia porquê.
    if(Array.isArray(window._visitasRecebidas) && window._visitasRecebidas.length) {
      const visitas = window._visitasRecebidas;
      window._visitasRecebidas = null;
      window._visitasPorLimpar = true;
      const ACCAO = { alimentar:'🍖', brincar:'🎮', limpar:'🧼' };
      for(const v of visitas.slice(-8)) {
        addLog(t('amigos.log.recebida', {
          icon: ACCAO[v.tipo] || '✦', nome: v.nome || '???',
          accao: t('amigos.recebida.' + v.tipo), vinculo: v.vinculo || 0,
        }), 'good');
      }
      const total = visitas.length;
      if(typeof showToast === 'function')
        showToast(t(total === 1 ? 'amigos.toast.visita_1' : 'amigos.toast.visita_n', { n: total }), 'ok');
      if(typeof scheduleSave === 'function') scheduleSave();
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
            el.title = t('gt.poop.title');
            el.style.transform = `scale(${(.8 + Math.random()*.4).toFixed(2)})`;
            el.textContent = '💩';
            el.onclick = (e) => { e.stopPropagation(); removePoop(el); };
            container.appendChild(el);
          }
        }
      }
      updateDirtyVisuals();
      updateEquippedDisplay();

      if(gs.moedas < 30) {
        setTimeout(() => addLog(t('onboard.tip.coins'), 'bad'), 1200);
      }

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
    setTimeout(() => addLog(t('onboard.tip.summon'), 'info'), 1000);
    setTimeout(() => addLog(t('onboard.tip.feed'),   'info'), 2500);
    setTimeout(() => addLog(t('onboard.tip.play'),   'info'), 4500);
    updateResourceUI();
  }

  if(typeof hideSplash === 'function') hideSplash();

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
    } else if(!user && !walletAddress) {
      // Não logado — mostra o ecrã de login e remove o splash
      document.getElementById('loginScreen').style.display = 'flex';
      if(typeof hideSplash === 'function') hideSplash();
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
