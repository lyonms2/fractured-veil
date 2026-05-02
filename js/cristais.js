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
    linkEl.textContent = `${CONTRACT_ADDRESS.slice(0,6)}...${CONTRACT_ADDRESS.slice(-4)} ${t('mkt.transp.polygonscan')}`;
  }

  const statusEl = document.getElementById('transpTimelockStatus');
  if(statusEl) {
    statusEl.className = 'transp-timelock-status transp-timelock-ok';
    statusEl.innerHTML = t('mkt.transp.vault_active');
  }

  const barEl = document.getElementById('transpLimitBar');
  const txtEl = document.getElementById('transpLimitTxt');
  if(!barEl || !txtEl) return;

  // Só mostra limite se tiver carteira Ethereum vinculada
  const carteira = playerData?.carteira;
  if(!carteira) {
    barEl.style.width = '0%';
    txtEl.textContent = t('mkt.metamask.limit_missing');
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
      txtEl.textContent = t('mkt.limit.no_limit', {used: sacado.toFixed(2)});
    } else {
      const restante  = parseFloat(ethers.formatEther(restanteWei));
      const DAILY_MAX = 5;
      const pct       = Math.min((sacado / DAILY_MAX) * 100, 100);
      barEl.style.width = pct + '%';
      txtEl.textContent = t('mkt.limit.with_limit', {used: sacado.toFixed(2), remaining: restante.toFixed(2)});
    }
  } catch(e) {
    barEl.style.width = '0%';
    txtEl.textContent = t('mkt.metamask.limit_err');
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
      <div style="font-family:'Cinzel',serif;font-size:11px;color:var(--text2);margin-bottom:4px;">${t('mkt.pkg.'+i)}</div>
      <div class="pkg-matic">${pkg.matic} MATIC</div>
      <div class="pkg-bonus">${i === 1 ? t('mkt.crystals.popular') : ''}</div>
      <button class="btn-buy-pkg" id="btnPkg${i}" onclick="comprarCristais(${i})">${t('mkt.crystals.buy_btn')}</button>
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
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.link_mm')}</span>`;
    return;
  }

  const allBtns = document.querySelectorAll('.btn-buy-pkg');
  allBtns.forEach(b => { b.disabled = true; b.style.opacity = '.5'; });

  try {
    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.open_mm')}</span>`;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer   = await provider.getSigner();
    const maticWei = ethers.parseEther(pkg.matic.toString());

    const tx = await signer.sendTransaction({
      to:    CONTRACT_ADDRESS,
      value: maticWei,
    });

    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.sent')}</span>`;
    const receipt = await tx.wait();

    if(receipt.status === 1) {
      status.innerHTML = `<span class="tx-pending">${t('mkt.tx.crediting')}</span>`;
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
          status.innerHTML = `<span class="tx-ok">${t('mkt.tx.credited', {gems: fmtC(apiData.gems), balance: fmtC(playerData.cristais)})}</span>`;
          showToast(t('mkt.tx.gems_added', {gems: fmtC(apiData.gems)}), 'ok');
        } else {
          status.innerHTML = `<span class="tx-err">${t('mkt.tx.not_credited', {err: apiData.erro})}</span>`;
        }
      } catch(apiErr) {
        status.innerHTML = `<span class="tx-err">${t('mkt.tx.credit_err')}<br><small>Hash: ${tx.hash.slice(0,10)}...${tx.hash.slice(-6)}</small></span>`;
      }
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.failed')}</span>`;
    }

  } catch(e) {
    console.error('[comprarCristais]', e);
    if(e.code === 'ACTION_REJECTED' || e?.info?.error?.code === 4001) {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.cancelled')}</span>`;
    } else if(e.code === 'INSUFFICIENT_FUNDS' || e?.message?.includes('insufficient funds')) {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.insufficient_matic', {matic: `<b>${pkg.matic} MATIC</b>`})}<br><small>${t('mkt.tx.exchange_hint')}</small></span>`;
      showToast(t('mkt.tx.insufficient_toast', {matic: pkg.matic}), 'err');
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.general_err')}</span>`;
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
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.link_mm')}</span>`;
    return;
  }

  if(!gems || gems < 10 || gems % 10 !== 0) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.min_gems')}</span>`;
    return;
  }
  if(gems > (playerData.cristais || 0)) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.insufficient', {balance: fmtC(playerData.cristais || 0)})}</span>`;
    return;
  }

  btn.disabled = true;
  status.innerHTML = `<span class="tx-pending">${t('mkt.tx.requesting')}</span>`;

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

    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.open_mm_redeem')}</span>`;

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

    status.innerHTML = `<span class="tx-pending">${t('mkt.tx.sent')}</span>`;
    const receipt = await tx.wait();

    if(receipt.status === 1) {
      playerData.cristais = (playerData.cristais || 0) - gems;
      updateCristaisDisplay();
      gemsInput.value = '';
      const refBonus = apiData.referralBonus || 0;
      const refNote  = refBonus > 0
        ? `<span style="font-size:8px;color:var(--muted);display:block;margin-top:4px;">💸 ${fmtC(refBonus)} 💎 distribuídos para sua rede de convidadores</span>`
        : '';
      status.innerHTML = `<span class="tx-ok">${t('mkt.tx.redeemed', {matic: apiData.matic})}</span>${refNote}`;
      showToast(t('mkt.tx.matic_sent', {matic: apiData.matic}), 'ok');
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.chain_fail')}</span>`;
    }

  } catch(e) {
    console.error('[resgatar]', e);
    if(e.code === 'ACTION_REJECTED') {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.redeem_cancelled')}</span>`;
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.redeem_err')}</span>`;
    }
  }
  btn.disabled = false;
}

// ═══════════════════════════════════════════
// REFERRAL — Aba completa de convites
// ═══════════════════════════════════════════

// Renderiza o cabeçalho (link + stats) de imediato, depois carrega a
// lista de convidados por nível via 3 queries paralelas ao Firestore.
async function renderReferral() {
  const sec = document.getElementById('sec-referral');
  if(!sec || !walletAddress) return;

  const refLink = `${location.origin}/?ref=${walletAddress}`;
  const earned  = playerData?.referralEarned || 0;
  const count   = playerData?.referralCount  || 0;

  sec.innerHTML = `
    <div class="section-title">🔗 Programa de Convites</div>
    <div class="section-sub">Convide amigos e ganhe 💎 cristais quando eles sacarem — até 3 níveis de profundidade.</div>

    <div class="referral-box">
      <div class="referral-title">Seu link de convite</div>
      <div class="referral-sub">
        Envie este link para quem quiser convidar. Quando eles se registrarem e sacarem cristais,
        você recebe automaticamente no seu saldo — sem nenhuma ação.
      </div>
      <div class="referral-link-row">
        <input class="referral-link-input" id="referralLinkInput" type="text"
          value="${refLink}" readonly onclick="this.select();"/>
        <button class="btn-referral-copy" onclick="_referralCopiarLink()">📋 Copiar</button>
      </div>
      <div class="referral-stats">
        <div class="referral-stat">
          <div class="referral-stat-val">${count}</div>
          <div class="referral-stat-lbl">👥 Convidados<br>diretos (L1)</div>
        </div>
        <div class="referral-stat">
          <div class="referral-stat-val">💎 ${fmtC(earned)}</div>
          <div class="referral-stat-lbl">🏆 Total ganho<br>em convites</div>
        </div>
      </div>
    </div>

    <div id="referralLevelsList">
      <div class="loading" style="margin-top:20px;">
        <div class="spinner"></div>
        <div style="font-size:10px;color:var(--muted);">Carregando sua rede...</div>
      </div>
    </div>`;

  // Queries paralelas ao Firestore: quem tem meu UID em cada nível da cadeia
  try {
    const [l1Snap, l2Snap, l3Snap] = await Promise.all([
      db.collection('players').where('referralChain.l1', '==', walletAddress).get(),
      db.collection('players').where('referralChain.l2', '==', walletAddress).get(),
      db.collection('players').where('referralChain.l3', '==', walletAddress).get(),
    ]);

    const el = document.getElementById('referralLevelsList');
    if(!el) return;

    el.innerHTML =
      _referralLevelHtml(l1Snap, 1, 5, 'Seus convidados diretos') +
      _referralLevelHtml(l2Snap, 2, 2, 'Convidados dos seus convidados') +
      _referralLevelHtml(l3Snap, 3, 1, '3º grau da rede') +
      `<div class="referral-footer-note">
        <b>Como funciona:</b><br>
        🥇 <b>L1 — diretos:</b> você ganha <b style="color:var(--gold);">5%</b> de cada saque deles<br>
        🥈 <b>L2 — convidados dos seus:</b> você ganha <b style="color:var(--gold);">2%</b> de cada saque<br>
        🥉 <b>L3 — 3º grau:</b> você ganha <b style="color:var(--gold);">1%</b> de cada saque<br>
        <span style="font-size:7.5px;display:block;margin-top:4px;">
          O bônus é descontado do valor sacado pelo convidado — a pool permanece sempre equilibrada, sem inflação.
        </span>
      </div>`;
  } catch(e) {
    const el = document.getElementById('referralLevelsList');
    if(el) el.innerHTML = `<div style="color:var(--red2);font-size:10px;margin-top:16px;text-align:center;">Erro ao carregar rede de convites.</div>`;
  }
}

// Gera o HTML de uma seção de nível (L1/L2/L3) com os jogadores encontrados
function _referralLevelHtml(snap, lvl, pct, label) {
  const badgeColor = lvl === 1 ? 'var(--purple)' : lvl === 2 ? '#1e6b9e' : '#2d6b3a';
  const header = `
    <div class="referral-level-section">
      <div class="referral-level-hdr">
        <span class="referral-level-badge" style="background:${badgeColor};">L${lvl}</span>
        <span>${label}</span>
        <span class="referral-level-pct">${pct}%</span>
        ${!snap.empty ? `<span class="referral-level-count">${snap.size} jogador${snap.size !== 1 ? 'es' : ''}</span>` : ''}
      </div>`;

  if(snap.empty) {
    return header + `<div class="referral-empty">Nenhum jogador ainda — compartilhe seu link!</div></div>`;
  }

  const cards = snap.docs.map(doc => {
    const d       = doc.data();
    const slotIdx = d.gs?.activeSlotIdx ?? d.activeSlotIdx ?? 0;
    const slot    = (d.avatarSlots || [])[slotIdx];
    const nome    = slot?.nome?.split(',')[0] || 'Sem avatar';
    const rarity  = slot?.raridade || '';
    const rColor  = rarity === 'Lendário' ? 'var(--gold)'
                  : rarity === 'Raro'     ? 'var(--gem2)'
                  : 'var(--muted)';
    const cristais = d.gs?.cristais ?? d.cristais ?? 0;
    const active   = cristais > 0;
    const shortUid = doc.id.slice(0, 5) + '...' + doc.id.slice(-4);

    return `
      <div class="referral-player-card">
        <div class="referral-player-info">
          <div class="referral-player-name">${nome}</div>
          <div class="referral-player-uid">${shortUid}</div>
        </div>
        <div style="font-size:8.5px;color:${rColor};text-align:right;white-space:nowrap;">
          ${rarity || 'Comum'}<br>
          ${active
            ? '<span class="referral-player-active">● Ativo</span>'
            : '<span class="referral-player-inactive">○ Inativo</span>'}
        </div>
      </div>`;
  }).join('');

  return header + `<div class="referral-players-list">${cards}</div></div>`;
}

function _referralCopiarLink() {
  const input = document.getElementById('referralLinkInput');
  if(!input) return;
  navigator.clipboard.writeText(input.value)
    .then(() => showToast('🔗 Link de convite copiado!', 'ok'))
    .catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('🔗 Link copiado!', 'ok');
    });
}
