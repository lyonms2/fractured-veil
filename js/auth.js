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

// ═══════════════════════════════════════════════════════════════════
// MOSTRAR E ESCONDER O LOGIN
//
// Cinco sítios diferentes mexiam no display à mão, e nenhum travava a
// rolagem da página. O #loginScreen é fixed e cobre tudo, mas o jogo
// continua montado por baixo — 758px de altura numa janela de 660 — e
// o body continua rolável. O resultado era uma barra de rolagem na tela
// de login para conteúdo que ninguém consegue ver.
// ═══════════════════════════════════════════════════════════════════
// O lockBodyScroll do modal.js já fazia isto, com contagem de
// referências e guardando a posição para a restituir — não valia a pena
// ter um segundo mecanismo só para aqui. O `_loginTravou` evita travar
// duas vezes se mostrarLoginScreen() for chamado com o login já aberto.
let _loginTravou = false;

function mostrarLoginScreen() {
  const el = document.getElementById('loginScreen');
  if (el) el.style.display = 'flex';
  if (!_loginTravou && typeof lockBodyScroll === 'function') {
    _loginTravou = true;
    lockBodyScroll();
  }
}

function esconderLoginScreen() {
  const el = document.getElementById('loginScreen');
  if (el) el.style.display = 'none';
  if (_loginTravou && typeof unlockBodyScroll === 'function') {
    _loginTravou = false;
    unlockBodyScroll();
  }
}

// ═══════════════════════════════════════════════════════════════════
// ENTRAR COM GOOGLE
//
// Um clique contra três campos e um email de confirmação. E a conta
// chega com emailVerified a true, portanto passa pelo mesmo portão que
// o email e a senha — o onAuthStateChanged trata do resto.
//
// O popup é bloqueado com frequência (celular, sobretudo), e por isso
// há o recuo para redirect: nesse caminho o usuário sai da página e
// volta já autenticado, e o listener acorda sozinho.
//
// IMPORTANTE: isto só funciona depois de o Google estar ativado em
// Authentication > Sign-in method na consola do Firebase, e do domínio
// estar na lista de Authorized domains.
// ═══════════════════════════════════════════════════════════════════
async function entrarComGoogle() {
  const btn = document.getElementById('loginGoogleBtn');
  if (btn) btn.disabled = true;
  _authMsg('');

  const provider = new firebase.auth.GoogleAuthProvider();
  // Sem isto, quem tem sessão aberta entra sempre na mesma conta sem
  // lhe ser perguntado.
  provider.setCustomParameters({ prompt: 'select_account' });

  try {
    await fbAuth().signInWithPopup(provider);
    // onAuthStateChanged trata o resto
  } catch (e) {
    if (btn) btn.disabled = false;

    // Fechar o popup não é erro nenhum: é uma desistência.
    if (e.code === 'auth/popup-closed-by-user' ||
        e.code === 'auth/cancelled-popup-request') return;

    if (e.code === 'auth/popup-blocked') {
      try { await fbAuth().signInWithRedirect(provider); return; }
      catch (_) { /* cai na mensagem em baixo */ }
    }

    const msgs = {
      'auth/account-exists-with-different-credential': t('auth.google.ja_existe'),
      'auth/unauthorized-domain':                      t('auth.google.dominio'),
      'auth/operation-not-allowed':                    t('auth.google.desactivado'),
      'auth/network-request-failed':                   t('auth.error.login'),
    };
    _authMsg(msgs[e.code] || t('auth.google.erro'));
    console.warn('[google]', e.code, e.message);
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
  eggLayCooldown = 0;
  Object.assign(vitals, { fome:100, humor:100, energia:100, saude:100, higiene:100 });
  Object.assign(gs, { moedas:200, ovos:0, cristais:0, extraSlots:0, totalInvocacoes:0, equipa:null, primeira:true });
  avatarSlots   = [null, null, null];
  activeSlotIdx = 0;
  eggsInInventory = [];
  itemInventory   = [];
  dirtyLevel = 0; poopCount = 0; poopPressure = 0;
  faseVista = -1; nivelVisto = -1;
  window._cambioLog = null;

  // Reset UI
  mostrarLoginScreen();
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
  document.getElementById('resBatalhaBtn').style.display    = 'none';

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
  // A batalha aparece assim que existir um avatar. O numero na
  // pastilha e o tamanho da equipa montada, nao o total de bichos: a
  // colonia ja diz quantos ha, e o que interessa aqui e se a equipa
  // esta pronta para lutar.
  document.getElementById('resBatalhaBtn').style.display = temAvatar ? '' : 'none';
}

// ─── Após autenticação bem-sucedida ──────────────────────────────
async function _onLoginSuccess(user) {
  walletAddress = user.uid;
  window._fvConnected = true;

  esconderLoginScreen();
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
  //
  // Só para conta nova: a cadeia é imutável e o servidor recusa quem já
  // a tem. Quem clica num link de convite já tendo conta ficava com a
  // chave presa no localStorage para sempre — limpa-se aqui, que já não
  // serve para nada.
  if (loaded) {
    localStorage.removeItem('fv_pending_ref');
  } else {
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
    // usado no card de venda no marketplace). Exceção: dormindo, a energia
    // continua subindo (mais devagar que ao vivo), o resto continua parado. ──
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
          // para esse, que é o que estava dormindo.
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
      document.getElementById('actionBtns').style.display   = '';
      document.getElementById('actionBtns').style.opacity   = '1';
      document.getElementById('actionBtns').style.pointerEvents = 'all';
      document.getElementById('creatureSVG').innerHTML = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, getFaseSize(), getFaseSize(), getFaseVisual());
      updateAvatarSize();
      document.getElementById('phaseLabel').textContent = `FASE: ${FASES[getFaseVisual()]}`;
      updateAllUI();
      updateResourceUI();

      if(sleeping) startSleep();

      // Isto era uma cópia do spawnPoop escrita à mão, com a mesma escolha
      // de lugar por contagem e o mesmo transform em linha. Duas cópias
      // para manter a par, e a correção de uma não chegava à outra.
      if(poopCount > 0) restaurarCocos();
      updateDirtyVisuals();
      updateEquippedDisplay();

      // A consola abre na COLÓNIA, não numa criatura. O jogo tem até dez
      // e o combate pede três; entrar por uma delas escondia o resto, que
      // era o problema todo. Quem quiser tratar de uma entra por ali.
      if(typeof abrirFazenda === 'function') abrirFazenda();

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
    // A dica de INVOCAR saiu daqui: o prólogo termina no gesto de
    // estender a mão, que É a invocação. Dizer "clique em INVOCAR" por
    // cima disso era explicar a piada depois de contá-la. As outras
    // duas ficam, mas esperam o prólogo sair da frente.
    setTimeout(() => addLog(t('onboard.tip.feed'), 'info'), 2500);
    setTimeout(() => addLog(t('onboard.tip.play'), 'info'), 4500);
    updateResourceUI();
  }

  // O prólogo entra ANTES do splash sair. Com ele depois, o jogador via
  // o painel de invocar avatar a aparecer primeiro e a história a cair
  // por cima — a ordem ao contrário, porque é a história que leva ao
  // painel. Como tem z-index 600 e o splash 500, sobe por cima da
  // cortina que ainda está descendo e não há piscar nenhum.
  // Decide sozinho se aparece. Estava dentro do ramo do
  // "jogador sem save" e por isso só tinha uma hipótese na vida: o
  // sessionId lá em cima cria o documento com merge:true, portanto a
  // partir do segundo login o loadFromFirebase devolve sempre true e
  // aquele ramo nunca mais corre. Quem perdesse a primeira vez — um
  // index.html em cache chegava — perdia para sempre, sem aviso.
  if (typeof talvezAbrirPrologo === 'function') talvezAbrirPrologo();

  if(typeof hideSplash === 'function') hideSplash();

  // ── Os listeners de PvP estão desligados ──
  //
  // Os três jogos PvP — Jo-Ken-Pô, Rouba Monte e Batalha Naval — não têm
  // porta desde que a aba PvP saiu do menu de Jogos, e vão sair de vez
  // quando o PvP novo entrar. Mas isto continuava a correr em TODO
  // login:
  //
  //   iniciarListenerDesafiosRecebidos  .on('child_added')  permanente
  //   rmIniciarListenerNotificacoes     .on('child_added')  permanente
  //   bnIniciarListenerNotificacoes     .on('child_added')  permanente
  //   verificarPartidaPendente          .once('value') x2
  //   _limparSalasAntigas               limpeza de salas da arena
  //
  // Três ligações abertas o tempo todo, mais leituras avulsas, tudo
  // cobrado, para jogos que ninguém consegue alcançar.
  //
  // O código dos três continua carregado e intacto; só deixou de
  // arrancar sozinho. Para religar, basta descomentar — mas o PvP novo
  // vai querer o seu próprio emparelhamento, e a ideia era extrair este
  // (lobby, desafio, sala e temporizador estão copiados três vezes)
  // antes de os apagar.
  //
  // if(typeof iniciarListenerDesafiosRecebidos === 'function') iniciarListenerDesafiosRecebidos();
  // if(typeof verificarPartidaPendente         === 'function') verificarPartidaPendente();
  // if(typeof rmIniciarListenerNotificacoes    === 'function') rmIniciarListenerNotificacoes();
  // if(typeof bnIniciarListenerNotificacoes    === 'function') bnIniciarListenerNotificacoes();
  // setTimeout(() => { if(typeof _limparSalasAntigas === 'function') _limparSalasAntigas(); }, 3000);
}

// ─── Listener de estado de autenticação (auto-login) ─────────────
// Roda assim que firebase.auth() está pronto
let _authListenerIniciado = false;
function iniciarAuthListener() {
  if(_authListenerIniciado) return;
  _authListenerIniciado = true;

  fbAuth().onAuthStateChanged(async user => {
    // O emailVerified estava sendo verificado só dentro do
    // loginComEmail(), depois do signInWithEmailAndPassword. Só que o
    // listener dispara com o usuário ainda autenticado, antes do
    // signOut que aquele código faz — e nessa janela um email por
    // confirmar entrava. Aqui o portão fecha para todos os caminhos, e
    // o Google passa porque as contas dele já vêm verificadas.
    if(user && user.emailVerified && !walletAddress) {
      // Sessão ativa — entra direto sem mostrar login
      await _onLoginSuccess(user);
    } else if(!user && walletAddress) {
      // Sessão expirou
      await disconnectWallet();
    } else if(!user && !walletAddress) {
      // Não logado — mostra a tela de login e remove o splash
      mostrarLoginScreen();
      if(typeof hideSplash === 'function') hideSplash();
    }
  });
}

// Compat: connectWallet ainda é chamado em alguns lugares do código
window.connectWallet = async function() {
  // No new auth flow connectWallet is a no-op if already logged in
  if(walletAddress) return;
  // Otherwise show login screen
  mostrarLoginScreen();
};

// Exporta funções para inline handlers
window.authShowTab       = authShowTab;
window.authShowReset     = authShowReset;
window.loginComEmail     = loginComEmail;
window.registrarComEmail = registrarComEmail;
window.enviarResetSenha  = enviarResetSenha;
window.disconnectWallet  = disconnectWallet;
window.iniciarAuthListener = iniciarAuthListener;
