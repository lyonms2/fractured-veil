// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE AUTH — Firebase Email/Password
// Substitui o connectWall de MetaMask no marketplace.
// walletAddress = uid do Firebase Auth (igual ao jogo principal).
// MetaMask só é conectada na secção de Cristais (comprar/resgatar).
// ═══════════════════════════════════════════════════════════════════

function fbAuthMkt() {
  return typeof firebase !== 'undefined' ? firebase.auth() : null;
}

// ── Mostrar/esconder abas ─────────────────────────────────────────
function mktAuthShowTab(tab) {
  document.getElementById('mktAuthTabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('mktAuthTabReg').classList.toggle('active', tab === 'register');
  document.getElementById('mktAuthFormLogin').style.display    = tab === 'login'    ? 'flex' : 'none';
  document.getElementById('mktAuthFormReg').style.display      = tab === 'register' ? 'flex' : 'none';
  document.getElementById('mktAuthFormReset').style.display    = 'none';
  document.getElementById('mktAuthError').textContent = '';
}

function mktAuthShowReset() {
  document.getElementById('mktAuthFormLogin').style.display = 'none';
  document.getElementById('mktAuthFormReg').style.display   = 'none';
  document.getElementById('mktAuthFormReset').style.display = 'flex';
  document.getElementById('mktAuthError').textContent = '';
}

// ── Login ─────────────────────────────────────────────────────────
async function mktLogin() {
  const email = document.getElementById('mktLoginEmail').value.trim();
  const senha = document.getElementById('mktLoginSenha').value;
  const errEl = document.getElementById('mktAuthError');
  const btn   = document.getElementById('mktLoginBtn');

  if(!email || !senha) { errEl.textContent = 'Preenche e-mail e senha.'; return; }
  btn.disabled = true; btn.textContent = 'ENTRANDO...';
  errEl.textContent = '';

  try {
    await fbAuthMkt().signInWithEmailAndPassword(email, senha);
  } catch(e) {
    btn.disabled = false; btn.textContent = 'ENTRAR';
    const msgs = {
      'auth/user-not-found':    'E-mail não encontrado.',
      'auth/wrong-password':    'Senha incorreta.',
      'auth/invalid-email':     'E-mail inválido.',
      'auth/too-many-requests': 'Muitas tentativas. Tenta mais tarde.',
      'auth/invalid-credential':'E-mail ou senha incorretos.',
    };
    errEl.textContent = msgs[e.code] || 'Erro ao entrar.';
  }
}

// ── Registro ─────────────────────────────────────────────────────
async function mktRegistrar() {
  const email  = document.getElementById('mktRegEmail').value.trim();
  const senha  = document.getElementById('mktRegSenha').value;
  const senha2 = document.getElementById('mktRegSenha2').value;
  const errEl  = document.getElementById('mktAuthError');
  const btn    = document.getElementById('mktRegBtn');

  if(!email || !senha)  { errEl.textContent = 'Preenche todos os campos.'; return; }
  if(senha !== senha2)  { errEl.textContent = 'As senhas não coincidem.'; return; }
  if(senha.length < 6)  { errEl.textContent = 'Senha deve ter pelo menos 6 caracteres.'; return; }

  btn.disabled = true; btn.textContent = 'CRIANDO...';
  errEl.textContent = '';

  try {
    await fbAuthMkt().createUserWithEmailAndPassword(email, senha);
  } catch(e) {
    btn.disabled = false; btn.textContent = 'CRIAR CONTA';
    const msgs = {
      'auth/email-already-in-use': 'Este e-mail já está em uso.',
      'auth/invalid-email':        'E-mail inválido.',
      'auth/weak-password':        'Senha muito fraca.',
    };
    errEl.textContent = msgs[e.code] || 'Erro ao criar conta.';
  }
}

// ── Reset de senha ────────────────────────────────────────────────
async function mktResetSenha() {
  const email = document.getElementById('mktResetEmail').value.trim();
  const errEl = document.getElementById('mktAuthError');
  const btn   = document.getElementById('mktResetBtn');

  if(!email) { errEl.textContent = 'Insere o teu e-mail.'; return; }
  btn.disabled = true; btn.textContent = 'ENVIANDO...';

  try {
    await fbAuthMkt().sendPasswordResetEmail(email);
    errEl.style.color = '#7ab87a';
    errEl.textContent = '✓ E-mail de recuperação enviado!';
    btn.textContent = 'ENVIADO ✓';
  } catch(e) {
    btn.disabled = false; btn.textContent = 'ENVIAR E-MAIL';
    errEl.style.color = '';
    errEl.textContent = e.code === 'auth/user-not-found' ? 'E-mail não encontrado.' : 'Erro ao enviar.';
  }
}

// ── Logout ────────────────────────────────────────────────────────
async function mktLogout() {
  try { await fbAuthMkt().signOut(); } catch(e) {}
}

// ── Listener de estado de auth ────────────────────────────────────
function iniciarMktAuth() {
  fbAuthMkt().onAuthStateChanged(async user => {
    const wall    = document.getElementById('connectWall');
    const loading = document.getElementById('loadingWall');

    if(user) {
      // Autenticado — configura walletAddress e carrega dados
      walletAddress = user.uid;

      const emailShort = user.email
        ? (user.email.length > 22 ? user.email.slice(0,19)+'...' : user.email)
        : 'jogador';
      document.getElementById('hdrWallet').textContent = emailShort;
      document.getElementById('walletDot').classList.remove('off');

      if(wall)    wall.style.display    = 'none';
      if(loading) loading.style.display = 'none';

      await loadPlayerData();
      loadListings();
      await loadPool();
      renderSection();

    } else {
      // Não autenticado — mostra connectWall
      walletAddress = null;
      playerData    = null;
      if(loading) loading.style.display = 'none';
      if(wall)    wall.style.display    = 'flex';
    }
  });
}

// ── Vincular MetaMask ao uid (para comprar/resgatar cristais) ─────
async function vincularCarteira() {
  if(typeof window.ethereum === 'undefined') {
    showToast('MetaMask não encontrada.', 'err'); return;
  }
  try {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    const endereco = accounts[0].toLowerCase();

    // Guarda no doc do jogador
    await db.collection('players').doc(walletAddress).set({
      carteira: endereco
    }, { merge: true });

    if(!playerData) playerData = {};
    playerData.carteira = endereco;

    // Actualiza header de cristais (MetaMask conectada para transações)
    const dotEl = document.getElementById('walletDot');
    if(dotEl) dotEl.style.background = 'var(--green)';

    showToast(`✅ MetaMask vinculada: ${endereco.slice(0,6)}...${endereco.slice(-4)}`, 'ok');
    return endereco;
  } catch(e) {
    if(e.code !== 4001) showToast('Erro ao conectar MetaMask.', 'err');
    return null;
  }
}

// ── Garante que MetaMask está vinculada antes de transações ───────
async function garantirCarteira() {
  // Se já temos o endereço em memória ou no playerData, usa-o
  if(playerData?.carteira) return playerData.carteira;

  // Tenta carregar do Firestore
  try {
    const snap = await db.collection('players').doc(walletAddress).get();
    const carteira = snap.data()?.carteira;
    if(carteira) {
      playerData.carteira = carteira;
      return carteira;
    }
  } catch(e) {}

  // Não tem carteira vinculada — pede ao utilizador
  showToast('Vincula a tua MetaMask primeiro.', 'err');
  return null;
}

// Exports
window.mktAuthShowTab  = mktAuthShowTab;
window.mktAuthShowReset = mktAuthShowReset;
window.mktLogin        = mktLogin;
window.mktRegistrar    = mktRegistrar;
window.mktResetSenha   = mktResetSenha;
window.mktLogout       = mktLogout;
window.iniciarMktAuth  = iniciarMktAuth;
window.vincularCarteira = vincularCarteira;
window.garantirCarteira = garantirCarteira;
