// ═══════════════════════════════════════════════════════════════════
// CRISTAIS — Compra, resgate e transparência
// Depende de: walletAddress (global), playerData (global),
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
// TRANSPARÊNCIA — estado do cofre on-chain
// ═══════════════════════════════════════════
async function renderTransparencia() {
  // Link Polygonscan
  const linkEl = document.getElementById('transpContractLink');
  if(linkEl) {
    linkEl.href = `https://polygonscan.com/address/${CONTRACT_ADDRESS}`;
    linkEl.textContent = `${CONTRACT_ADDRESS.slice(0,6)}...${CONTRACT_ADDRESS.slice(-4)} — Ver no Polygonscan ↗`;
  }

  // Estado do cofre — sem timelock, cofre sempre ativo
  const statusEl = document.getElementById('transpTimelockStatus');
  if(statusEl) {
    statusEl.className = 'transp-timelock-status transp-timelock-ok';
    statusEl.innerHTML = '✅ Cofre ativo na Polygon Mainnet.';
  }

  // Limite diário do jogador — consulta on-chain
  const barEl = document.getElementById('transpLimitBar');
  const txtEl = document.getElementById('transpLimitTxt');
  if(barEl && txtEl) {
    if(!walletAddress) {
      barEl.style.width = '0%';
      txtEl.textContent = 'Conecta a carteira para ver o teu limite.';
    } else {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const abi = ['function limiteHoje(address) view returns (uint256, uint256)'];
        const contrato = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
        const [sacadoWei, restanteWei] = await contrato.limiteHoje(walletAddress);
        const sacado   = parseFloat(ethers.formatEther(sacadoWei));
        const MAX_UINT = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
        const semLimite = restanteWei === MAX_UINT;
        if(semLimite) {
          barEl.style.width = '0%';
          barEl.style.background = 'var(--accent)';
          txtEl.textContent = `${sacado.toFixed(2)} MATIC sacados hoje · Sem limite diário`;
        } else {
          const restante = parseFloat(ethers.formatEther(restanteWei));
          const DAILY_MAX = 5;
          const pct = Math.min((sacado / DAILY_MAX) * 100, 100);
          barEl.style.width = pct + '%';
          txtEl.textContent = `${sacado.toFixed(2)} MATIC sacados hoje · ${restante.toFixed(2)} MATIC restantes (limite: 5 MATIC/dia)`;
        }
      } catch(e) {
        barEl.style.width = '0%';
        txtEl.textContent = 'Não foi possível verificar o limite. Conecta a carteira.';
      }
    }
  }
}

// ═══════════════════════════════════════════
// RENDER DOS PACOTES DE CRISTAIS
// ═══════════════════════════════════════════
function renderCrystals() {
  const container = document.getElementById('crystalPackages');
  container.innerHTML = CRYSTAL_PACKAGES.map((pkg,i) => `
    <div class="crystal-pkg ${i===1?'featured':''}">
      <div class="pkg-gem">💎</div>
      <div class="pkg-amount">${pkg.gems}</div>
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--text2);margin-bottom:4px;">${pkg.label}</div>
      <div class="pkg-matic">${pkg.matic} MATIC</div>
      <div class="pkg-bonus">${i===1?'Mais popular':''}</div>
      <button class="btn-buy-pkg" onclick="comprarCristais(${i})">Comprar</button>
    </div>`).join('');
}

// ═══════════════════════════════════════════
// COMPRA DE CRISTAIS — MetaMask directo para o contrato
// O contrato emite CristaisComprados → servidor credita os 💎
// ═══════════════════════════════════════════
async function comprarCristais(idx) {
  const pkg    = CRYSTAL_PACKAGES[idx];
  const status = document.getElementById('buyStatus');

  if(!walletAddress) {
    status.innerHTML = '<span class="tx-err">Conecta a carteira primeiro.</span>';
    return;
  }

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

      // Chama o servidor para verificar o evento on-chain e creditar os 💎
      try {
        const apiRes  = await fetch('/api/processar-compra', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ jogador: walletAddress, txHash: tx.hash }),
        });
        const apiData = await apiRes.json();

        if(apiData.ok) {
          // Actualiza o saldo local imediatamente (o Firestore já foi actualizado)
          playerData.cristais = (playerData.cristais || 0) + apiData.gems;
          if(!playerData.gs) playerData.gs = {};
          playerData.gs.cristais = playerData.cristais;
          updateCristaisDisplay();
          status.innerHTML = `<span class="tx-ok">✅ +${apiData.gems} 💎 creditados! Saldo: ${playerData.cristais} 💎</span>`;
          showToast(`+${apiData.gems} 💎 Cristais adicionados!`, 'ok');
        } else {
          // Transação confirmada mas servidor rejeitou (ex: já processada)
          status.innerHTML = `<span class="tx-err">⚠️ Transação confirmada mas não creditada: ${apiData.erro}</span>`;
        }
      } catch(apiErr) {
        // Rede caiu depois da tx — os 💎 serão creditados na próxima visita
        status.innerHTML = `<span class="tx-err">⚠️ Tx confirmada mas erro ao creditar. Volta ao marketplace — os teus 💎 serão recuperados.<br><small>Hash: ${tx.hash.slice(0,10)}...${tx.hash.slice(-6)}</small></span>`;
      }

    } else {
      status.innerHTML = '<span class="tx-err">❌ Transação falhou. Tenta novamente.</span>';
    }

  } catch(e) {
    console.error('[comprarCristais]', e);
    if(e.code === 'ACTION_REJECTED') {
      status.innerHTML = '<span class="tx-err">Transação cancelada.</span>';
    } else {
      status.innerHTML = '<span class="tx-err">Erro ao enviar. Verifica o saldo de MATIC e tenta novamente.</span>';
    }
  }
}

// ═══════════════════════════════════════════
// RESGATE DE CRISTAIS — 💎 → MATIC
// Passo 1: pede assinatura ao servidor Vercel (/api/resgatar)
// Passo 2: chama withdraw() no contrato com a assinatura
// ═══════════════════════════════════════════
async function resgatar() {
  const gemsInput = document.getElementById('resgateGems');
  const status    = document.getElementById('resgateStatus');
  const btn       = document.getElementById('btnResgatar');
  const gems      = parseInt(gemsInput.value, 10);

  if(!walletAddress) {
    status.innerHTML = '<span class="tx-err">Conecta a carteira primeiro.</span>';
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
    // Passo 1 — pedir assinatura ao servidor Vercel
    const apiRes = await fetch('/api/resgatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jogador: walletAddress, gems }),
    });
    const apiData = await apiRes.json();

    if(!apiData.ok) {
      status.innerHTML = `<span class="tx-err">❌ ${apiData.erro}</span>`;
      btn.disabled = false;
      return;
    }

    status.innerHTML = '<span class="tx-pending">⏳ Abre o MetaMask para confirmar o resgate...</span>';

    // Passo 2 — chamar withdraw() no contrato com a assinatura
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    const abi = [
      'function withdraw(uint256 gems, uint256 nonce, uint8 v, bytes32 r, bytes32 s) external'
    ];
    const contrato = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

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
      const maticRecebido = apiData.matic;
      playerData.cristais = (playerData.cristais || 0) - gems;
      updateCristaisDisplay();
      gemsInput.value = '';
      status.innerHTML = `<span class="tx-ok">✅ Resgatado! Recebeste ${maticRecebido} MATIC na tua carteira.</span>`;
      showToast(`💸 ${maticRecebido} MATIC enviados!`, 'ok');
    } else {
      // Tx falhou on-chain — o servidor já debitou os 💎, informar suporte
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
