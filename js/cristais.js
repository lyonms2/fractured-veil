// ═══════════════════════════════════════════════════════════════════
// CRISTAIS — Compra, resgate e transparência
// Depende de: garantirCarteira() (marketplace-auth.js),
//             playerData (global), walletAddress (global),
//             updateCristaisDisplay() (marketplace.html inline),
//             showToast() (marketplace.html inline),
//             ethers (CDN carregado antes deste ficheiro)
// ═══════════════════════════════════════════════════════════════════

const CONTRACT_ADDRESS = '0xCcA07f21a40129955db81Dc0073693a26e777d8E';
const MATIC_TO_GEMS    = 10; // 1 MATIC = 10 💎

const CRYSTAL_PACKAGES = [
  { matic:0.5,  gems:5,   label:'Punhado',   icon:'💎' },
  { matic:1,    gems:10,  label:'Bolsa',      icon:'💎' },
  { matic:3,    gems:30,  label:'Saco',       icon:'💎' },
  { matic:5,    gems:50,  label:'Baú',        icon:'💎' },
  { matic:10,   gems:100, label:'Tesouro',    icon:'💎' },
];

// ═══════════════════════════════════════════
// TRANSPARÊNCIA
// ═══════════════════════════════════════════
async function renderTransparencia() {
  const linkEl = document.getElementById('transpContractLink');
  if(linkEl) {
    linkEl.href = `https://polygonscan.com/address/${CONTRACT_ADDRESS}`;
    linkEl.textContent = `${CONTRACT_ADDRESS.slice(0,6)}...${CONTRACT_ADDRESS.slice(-4)} — Ver no Polygonscan ↗`;
  }

  const statusEl = document.getElementById('transpTimelockStatus');
  if(statusEl) {
    statusEl.className = 'transp-timelock-status transp-timelock-ok';
    statusEl.innerHTML = '✅ Cofre ativo na Polygon Mainnet.';
  }

  const barEl = document.getElementById('transpLimitBar');
  const txtEl = document.getElementById('transpLimitTxt');
  if(!barEl || !txtEl) return;

  // Só mostra limite se tiver carteira Ethereum vinculada
  const carteira = playerData?.carteira;
  if(!carteira) {
    barEl.style.width = '0%';
    txtEl.textContent = 'Vincula a MetaMask na secção de Cristais para ver o teu limite.';
    return;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const abi = ['function limiteHoje(address) view returns (uint256, uint256)'];
    const contrato = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const [sacadoWei, restanteWei] = await contrato.limiteHoje(carteira);
    const sacado  = parseFloat(ethers.formatEther(sacadoWei));
    const MAX_UINT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
    const semLimite = restanteWei === MAX_UINT;
    if(semLimite) {
      barEl.style.width = '0%';
      barEl.style.background = 'var(--accent)';
      txtEl.textContent = `${sacado.toFixed(2)} MATIC sacados hoje · Sem limite diário`;
    } else {
      const restante  = parseFloat(ethers.formatEther(restanteWei));
      const DAILY_MAX = 5;
      const pct       = Math.min((sacado / DAILY_MAX) * 100, 100);
      barEl.style.width = pct + '%';
      txtEl.textContent = `${sacado.toFixed(2)} MATIC sacados hoje · ${restante.toFixed(2)} MATIC restantes (limite: 5 MATIC/dia)`;
    }
  } catch(e) {
    barEl.style.width = '0%';
    txtEl.textContent = 'Não foi possível verificar o limite.';
  }
}

// ═══════════════════════════════════════════
// RENDER DOS PACOTES
// ═══════════════════════════════════════════
function renderCrystals() {
  const container = document.getElementById('crystalPackages');
  if(!container) return;
  container.innerHTML = CRYSTAL_PACKAGES.map((pkg, i) => `
    <div class="crystal-pkg ${i === 1 ? 'featured' : ''}">
      <div class="pkg-gem">💎</div>
      <div class="pkg-amount">${pkg.gems}</div>
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--text2);margin-bottom:4px;">${pkg.label}</div>
      <div class="pkg-matic">${pkg.matic} MATIC</div>
      <div class="pkg-bonus">${i === 1 ? 'Mais popular' : ''}</div>
      <button class="btn-buy-pkg" id="btnPkg${i}" onclick="comprarCristais(${i})">Comprar</button>
    </div>`).join('');
}

// ═══════════════════════════════════════════
// COMPRA DE CRISTAIS
// ═══════════════════════════════════════════
async function comprarCristais(idx) {
  const pkg    = CRYSTAL_PACKAGES[idx];
  const status = document.getElementById('buyStatus');

  // Garante que MetaMask está vinculada
  const carteiraEth = await garantirCarteira();
  if(!carteiraEth) {
    status.innerHTML = '<span class="tx-err">Vincula a MetaMask primeiro.</span>';
    return;
  }

  const allBtns = document.querySelectorAll('.btn-buy-pkg');
  allBtns.forEach(b => { b.disabled = true; b.style.opacity = '.5'; });

  try {
    status.innerHTML = '<span class="tx-pending">⏳ Abre o MetaMask para confirmar...</span>';

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    const maticWei = ethers.parseEther(pkg.matic.toString());

    const tx = await signer.sendTransaction({
      to:    CONTRACT_ADDRESS,
      value: maticWei,
    });

    status.innerHTML = '<span class="tx-pending">⏳ Transação enviada. A aguardar confirmação...</span>';
    const receipt = await tx.wait();

    if(receipt.status === 1) {
      status.innerHTML = '<span class="tx-pending">⏳ A creditar os teus 💎...</span>';
      try {
        // Usa o uid (walletAddress) como identificador do jogador no servidor
        const apiRes  = await fetch('/api/processar-compra', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ jogador: walletAddress, carteira: carteiraEth, txHash: tx.hash }),
        });
        const apiData = await apiRes.json();

        if(apiData.ok) {
          playerData.cristais = (playerData.cristais || 0) + apiData.gems;
          if(!playerData.gs) playerData.gs = {};
          playerData.gs.cristais = playerData.cristais;
          updateCristaisDisplay();
          status.innerHTML = `<span class="tx-ok">✅ +${apiData.gems} 💎 creditados! Saldo: ${playerData.cristais} 💎</span>`;
          showToast(`+${apiData.gems} 💎 Cristais adicionados!`, 'ok');
        } else {
          status.innerHTML = `<span class="tx-err">⚠️ Transação confirmada mas não creditada: ${apiData.erro}</span>`;
        }
      } catch(apiErr) {
        status.innerHTML = `<span class="tx-err">⚠️ Tx confirmada mas erro ao creditar. Os teus 💎 serão recuperados.<br><small>Hash: ${tx.hash.slice(0,10)}...${tx.hash.slice(-6)}</small></span>`;
      }
    } else {
      status.innerHTML = '<span class="tx-err">❌ Transação falhou. Tenta novamente.</span>';
    }

  } catch(e) {
    console.error('[comprarCristais]', e);
    if(e.code === 'ACTION_REJECTED' || e?.info?.error?.code === 4001) {
      status.innerHTML = '<span class="tx-err">Transação cancelada.</span>';
    } else if(e.code === 'INSUFFICIENT_FUNDS' || e?.message?.includes('insufficient funds')) {
      status.innerHTML = `<span class="tx-err">❌ Saldo insuficiente. Precisas de pelo menos <b>${pkg.matic} MATIC</b> na tua carteira Polygon.<br><small>Podes comprar MATIC numa exchange (ex: Binance, Crypto.com) e transferir para a rede Polygon.</small></span>`;
      showToast(`Saldo insuficiente — precisas de ${pkg.matic} MATIC`, 'err');
    } else {
      status.innerHTML = '<span class="tx-err">Erro ao enviar. Verifica o saldo de MATIC e tenta novamente.</span>';
    }
  } finally {
    allBtns.forEach(b => { b.disabled = false; b.style.opacity = ''; });
  }
}

// ═══════════════════════════════════════════
// RESGATE DE CRISTAIS — 💎 → MATIC
// ═══════════════════════════════════════════
async function resgatar() {
  const gemsInput = document.getElementById('resgateGems');
  const status    = document.getElementById('resgateStatus');
  const btn       = document.getElementById('btnResgatar');
  const gems      = parseInt(gemsInput.value, 10);

  // Garante que MetaMask está vinculada
  const carteiraEth = await garantirCarteira();
  if(!carteiraEth) {
    status.innerHTML = '<span class="tx-err">Vincula a MetaMask primeiro.</span>';
    return;
  }

  if(!gems || gems < 10 || gems % 10 !== 0) {
    status.innerHTML = '<span class="tx-err">Mínimo 10 💎, em múltiplos de 10.</span>';
    return;
  }
  if(gems > (playerData.cristais || 0)) {
    status.innerHTML = `<span class="tx-err">Saldo insuficiente. Tens ${playerData.cristais || 0} 💎.</span>`;
    return;
  }

  btn.disabled = true;
  status.innerHTML = '<span class="tx-pending">⏳ A pedir autorização ao servidor...</span>';

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const apiRes = await fetch('/api/resgatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ idToken, carteira: carteiraEth, gems }),
    });
    const apiData = await apiRes.json();

    if(!apiData.ok) {
      status.innerHTML = `<span class="tx-err">❌ ${apiData.erro}</span>`;
      btn.disabled = false;
      return;
    }

    status.innerHTML = '<span class="tx-pending">⏳ Abre o MetaMask para confirmar o resgate...</span>';

    const provider  = new ethers.BrowserProvider(window.ethereum);
    const signer    = await provider.getSigner();
    const abi = ['function withdraw(uint256 gems, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external'];
    const contrato  = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

    const tx = await contrato.withdraw(
      BigInt(apiData.gems),
      BigInt(apiData.nonce),
      apiData.v,
      apiData.r,
      apiData.s,
    );

    status.innerHTML = '<span class="tx-pending">⏳ Transação enviada. A aguardar confirmação...</span>';
    const receipt = await tx.wait();

    if(receipt.status === 1) {
      playerData.cristais = (playerData.cristais || 0) - gems;
      updateCristaisDisplay();
      gemsInput.value = '';
      status.innerHTML = `<span class="tx-ok">✅ Resgatado! Recebeste ${apiData.matic} MATIC na tua carteira.</span>`;
      showToast(`💸 ${apiData.matic} MATIC enviados!`, 'ok');
    } else {
      status.innerHTML = '<span class="tx-err">❌ Transação falhou on-chain. Contacta o suporte com o hash da tx.</span>';
    }

  } catch(e) {
    console.error('[resgatar]', e);
    if(e.code === 'ACTION_REJECTED') {
      status.innerHTML = '<span class="tx-err">Resgate cancelado. Os teus 💎 foram restaurados pelo servidor.</span>';
    } else {
      status.innerHTML = '<span class="tx-err">Erro no resgate. Tenta novamente.</span>';
    }
  }
  btn.disabled = false;
}
