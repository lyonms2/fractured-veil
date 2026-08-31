// ═══════════════════════════════════════════════════════════════════
// CRISTAIS — Compra, resgate e transparência
// garantirCarteira() e vincularCarteira() vivem no fim deste ficheiro.
// Depende de: playerData (global), walletAddress (global),
//             updateCristaisDisplay() (marketplace.html inline),
//             showToast() (marketplace.html inline),
//             ethers (CDN carregado antes deste arquivo)
// ═══════════════════════════════════════════════════════════════════

const CONTRACT_ADDRESS = '0xCcA07f21a40129955db81Dc0073693a26e777d8E';

// ═══════════════════════════════════════════════════════════════════
// O ETHERS CHEGA SÓ QUANDO É PRECISO
//
// O marketplace.html avulso carregava-o num <script> no topo. Quando o
// marketplace passou a viver dentro do index.html, o script ficou para
// trás — e o index.html nunca o carregou. Resultado: comprar cristais e
// resgatar rebentavam com "ethers is not defined", apanhado pelo
// try/catch de cada função e mostrado ao jogador como um erro genérico.
// O caminho do dinheiro real estava morto e a dizer só "erro".
//
// Carrega-se aqui, sob procura, para não pesar o arranque de quem nunca
// abre estas seções. A promessa é guardada: várias chamadas ao mesmo
// tempo esperam pelo mesmo carregamento.
const ETHERS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.9.0/ethers.umd.min.js';
let _ethersPromise = null;

function carregarEthers() {
  if(typeof ethers !== 'undefined') return Promise.resolve(true);
  if(_ethersPromise) return _ethersPromise;
  _ethersPromise = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = ETHERS_CDN;
    el.async = true;
    el.onload  = () => resolve(true);
    el.onerror = () => { _ethersPromise = null; reject(new Error('ethers_indisponivel')); };
    document.head.appendChild(el);
  });
  return _ethersPromise;
}
const MATIC_TO_GEMS    = 10; // 1 MATIC = 10 💎

/* OS PACOTES
   ═══════════════════════════════════════════════════════════════════
   Eram cinco — 5, 10, 30, 50 e 100 💎 — e não se distinguiam em nada
   além do tamanho. A taxa é a mesma em todos (1 MATIC = 10 💎), portanto
   não havia razão para escolher um em vez de outro: eram a mesma compra
   repetida cinco vezes, com nomes diferentes.

   E não dá para pôr bónus por volume, que seria a saída óbvia. Duas
   razões, e a segunda é definitiva:

   1. O resgate paga à MESMA taxa (maticFinal = gems / RATE, RATE = 10 em
      api/resgatar.js). Sem margem entre comprar e vender, qualquer bónus
      é arbitragem: compra-se com desconto e saca-se a preço cheio.
   2. Quem calcula os cristais é o CONTRATO, não o servidor — o
      api/processar-compra.js lê gemsACreditar do evento on-chain. A taxa
      não se muda daqui de maneira nenhuma.

   O que se pode mudar é o que os cartões DIZEM. Passam a ser três, e cada
   um vale exatamente uma coisa que o jogo cobra:

     15 💎  desbloquear um slot   (UNLOCK_SLOT_COST)
     50 💎  chocar um Raro        (HATCH_FEE.Raro)
    100 💎  chocar um Lendário    (HATCH_FEE['Lendário'])

   Três escolhas com três propósitos, em vez de cinco tamanhos do mesmo
   nada. Se estes números mudarem no jogo, isto tem de mudar com eles —
   por isso ficam aqui as constantes de onde saem. */
/* Cada pacote dizia o que aquela quantia dava para pagar — "Desbloqueia
   um slot", "Choca um ovo Raro", "Choca um ovo Lendário". Eram
   descrições certas (o slot custa 15 💎, chocar um Raro custa 50 e um
   Lendário 100), mas liam-se como se o depósito OFERECESSE o slot ou o
   ovo. Saíram. */
const CRYSTAL_PACKAGES = [
  { matic:1.5, gems:15  },
  { matic:5,   gems:50  },
  { matic:10,  gems:100 },
];

// 10% em cristais de bónus. Tem de bater com o BONUS_COMPRA do
// api/processar-compra.js, que é quem os credita de verdade — aqui é só
// para o cartão dizer o que vai acontecer.
const BONUS_COMPRA = 0.10;

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
    await carregarEthers();
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
  /* O destaque ia para o pacote do meio com um selo "POPULAR", que era
     um sinal inventado numa lista onde todos custavam o mesmo por
     cristal. Depois ficou uma linha a dizer o que cada quantia dava para
     pagar — "Desbloqueia um slot", "Choca um ovo Raro" — e essa lia-se
     como se o depósito OFERECESSE o slot ou o ovo.
     Agora a linha diz o que o jogador ganha a mais, que é a única coisa
     que separa mesmo um pacote do outro. */
  container.innerHTML = CRYSTAL_PACKAGES.map((pkg, i) => `
    <div class="crystal-pkg">
      <div class="pkg-gem">💎</div>
      <div class="pkg-amount">${pkg.gems}</div>
      <div class="pkg-bonus">+${+(pkg.gems * BONUS_COMPRA).toFixed(2)} 💎 ${t('mkt.pkg.bonus')}</div>
      <div class="pkg-matic">${pkg.matic} MATIC</div>
      <button class="btn-buy-pkg" id="btnPkg${i}" onclick="comprarCristais(${i})">${t('mkt.crystals.buy_btn')}</button>
    </div>`).join('');
}

// ═══════════════════════════════════════════
// COMPRA DE CRISTAIS
/* QUANTO AINDA DÁ PARA RESGATAR HOJE
   ═══════════════════════════════════════════════════════════════════
   O tecto diário é de 50 💎 e vive no api/resgatar.js. A tela não o
   dizia em lado nenhum: escrevia-se um número, clicava-se, e só então
   vinha "Limite diário atingido. Podes resgatar mais X hoje". O número
   que interessava só aparecia depois de falhar.

   Existe uma barra de limite, mas na página da Transparência — noutra
   secção, e em MATIC em vez de 💎. Aqui, onde se resgata, não havia nada.

   O resgateLog está no documento do jogador. O cliente não o escreve
   (as regras não deixam, é o que impede zerar o próprio limite) mas
   pode lê-lo, e é o que se faz aqui: uma leitura ao abrir a secção.
   Falhando, mostra-se o tecto sem o gasto — melhor um número parcial do
   que nenhum. */
const RESGATE_MAX_DIA = 50;

async function renderLimiteResgate() {
  const el = document.getElementById('resgateLimite');
  if (!el) return;
  const input = document.getElementById('resgateGems');

  let usadoHoje = 0;
  try {
    const snap = await db.collection('players').doc(walletAddress).get();
    const log  = snap.data()?.resgateLog;
    const hoje = new Date().toISOString().slice(0, 10);
    if (log && log.data === hoje) usadoHoje = log.total || 0;
  } catch (e) { /* fica em zero: mostra o tecto cheio */ }

  const resta = Math.max(0, RESGATE_MAX_DIA - usadoHoje);
  el.textContent = t('mkt.crystals.limit_left', { resta, max: RESGATE_MAX_DIA });
  el.classList.toggle('esgotado', resta === 0);

  // O campo deixa de aceitar o que vai ser recusado.
  if (input) {
    input.max = String(resta);
    if (resta === 0) input.disabled = true;
    else input.disabled = false;
  }
  const btn = document.getElementById('btnResgatar');
  if (btn) btn.disabled = resta === 0;
}

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

    await carregarEthers();
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
          // Sincroniza com o estado vivo do jogo (index.html mesclado) — sem
          // isto o próximo scheduleSave() reverteria o crédito já persistido
          // no servidor com o saldo antigo em memória.
          if(typeof gs !== 'undefined') {
            gs.cristais = playerData.cristais;
            if(typeof updateResourceUI === 'function') updateResourceUI();
          }
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
    // Sem a biblioteca não há transação nenhuma — dizer isso em vez de
    // um "erro" que não ajuda ninguém a perceber o que fazer.
    if(e.message === 'ethers_indisponivel') {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.sem_ethers')}</span>`;
    } else if(e.code === 'ACTION_REJECTED' || e?.info?.error?.code === 4001) {
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
  // O resgate mede-se pelo balde COM lastro, e não pelo saldo que a
  // loja mostra: os cristais de bónus gastam-se dentro do jogo e não
  // saem para MATIC. Com o mktCristais() aqui, quem tivesse bónus
  // escrevia um número que passava nesta verificação e só rebentava
  // do outro lado, no servidor.
  if(gems > mktCristaisResgataveis()) {
    status.innerHTML = `<span class="tx-err">${t('mkt.tx.insufficient', {balance: fmtC(mktCristaisResgataveis())})}</span>`;
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

    await carregarEthers();
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
      // Fecha a autorização. Enquanto ela ficar aberta, um novo pedido de
      // saque devolve esta mesma em vez de criar outra — é isso que
      // impede os cristais de se perderem quando a chamada on-chain
      // falha, e é isto que a fecha quando ela passa.
      try {
        const tk = await firebase.auth().currentUser.getIdToken();
        await fetch('/api/resgatar', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ idToken: tk, action: 'confirmar-resgate', nonce: apiData.nonce }),
        });
      } catch(e) { console.warn('[resgatar] confirmação falhou:', e); }

      // Num saque retomado o débito já aconteceu na primeira tentativa —
      // descontar outra vez aqui tirava cristais que já não existiam.
      if(!apiData.retomado) playerData.cristais = (playerData.cristais || 0) - gems;
      if(typeof gs !== 'undefined') {
        gs.cristais = playerData.cristais;
        if(typeof updateResourceUI === 'function') updateResourceUI();
      }
      updateCristaisDisplay();
      // O tecto do dia acabou de encolher — o número em cima do campo tem
      // de acompanhar, senão fica a prometer o que já não há até alguém
      // reabrir a secção.
      renderLimiteResgate();
      gemsInput.value = '';
      const refBonus = apiData.referralBonus || 0;
      const refNote  = refBonus > 0
        ? `<span style="font-size:0.5rem;color:var(--muted);display:block;margin-top:0.25rem;">💸 ${fmtC(refBonus)} 💎 distribuídos para sua rede de convidadores</span>`
        : '';
      status.innerHTML = `<span class="tx-ok">${t('mkt.tx.redeemed', {matic: apiData.matic})}</span>${refNote}`;
      showToast(t('mkt.tx.matic_sent', {matic: apiData.matic}), 'ok');
    } else {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.chain_fail')}</span>`;
    }

  } catch(e) {
    console.error('[resgatar]', e);
    if(e.message === 'ethers_indisponivel') {
      status.innerHTML = `<span class="tx-err">${t('mkt.tx.sem_ethers')}</span>`;
    } else if(e.code === 'ACTION_REJECTED') {
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
// ═══════════════════════════════════════════════════════════════════
// PROGRAMA DE CONVITES
//
// As percentagens vivem AQUI, num sítio só. Estavam escritas à mão no
// rodapé e outra vez em cada cabeçalho de nível — e o servidor tem as
// suas em api/resgatar.js (REFERRAL_RATES, em fração). Não dá para
// partilhar a constante através da rede, mas do lado do cliente passa a
// haver uma única cópia; se mexer numa, mexa na outra.
// ═══════════════════════════════════════════════════════════════════
const REFERRAL_PCT = { l1: 5, l2: 2, l3: 1 };

async function renderReferral() {
  const sec = document.getElementById('sec-referral');
  if(!sec || !walletAddress) return;

  const refLink = `${location.origin}/?ref=${walletAddress}`;

  sec.innerHTML = `
    <div class="section-title">${t('ref.title')}</div>
    <div class="section-sub">${t('ref.sub')}</div>

    <div class="referral-box">
      <div class="referral-title">${t('ref.link_title')}</div>
      <div class="referral-sub">${t('ref.link_sub')}</div>
      <div class="referral-link-row">
        <input class="referral-link-input" id="referralLinkInput" type="text"
          value="${refLink}" readonly onclick="this.select();"/>
        <button class="btn-referral-copy" onclick="_referralCopiarLink()">${t('ref.copy')}</button>
      </div>
      <div class="referral-stats">
        <div class="referral-stat">
          <div class="referral-stat-val" id="refStatCount">—</div>
          <div class="referral-stat-lbl">${t('ref.stat_invited')}</div>
        </div>
        <div class="referral-stat">
          <div class="referral-stat-val" id="refStatEarned">—</div>
          <div class="referral-stat-lbl">${t('ref.stat_earned')}</div>
        </div>
      </div>
    </div>

    <div id="referralLevelsList">
      <div class="loading" style="margin-top:1.25rem;">
        <div class="spinner"></div>
        <div style="font-size:0.625rem;color:var(--muted);">${t('ref.loading')}</div>
      </div>
    </div>`;

  try {
    // Os dois números do topo saíam do playerData, que o loadPlayerData()
    // monta a partir do gs — e o gs nunca teve referralCount nem
    // referralEarned. Mostravam sempre zero, enquanto a lista logo
    // abaixo listava a rede a sério: a mesma tela dizia "0 convidados" e
    // "3 jogadores" com três centímetros de distância.
    //
    // O total ganho vem do documento; o número de convidados passa a ser
    // o tamanho da própria lista L1, que é a verdade em vez de um
    // contador à parte que pode ficar para trás.
    const [l1Snap, l2Snap, l3Snap, meuDoc] = await Promise.all([
      db.collection('players').where('referralChain.l1', '==', walletAddress).get(),
      db.collection('players').where('referralChain.l2', '==', walletAddress).get(),
      db.collection('players').where('referralChain.l3', '==', walletAddress).get(),
      db.collection('players').doc(walletAddress).get(),
    ]);

    const ganho = meuDoc.exists ? (meuDoc.data().referralEarned || 0) : 0;
    const elCount  = document.getElementById('refStatCount');
    const elEarned = document.getElementById('refStatEarned');
    if(elCount)  elCount.textContent  = l1Snap.size;
    if(elEarned) elEarned.textContent = '💎 ' + fmtC(ganho);

    const el = document.getElementById('referralLevelsList');
    if(!el) return;

    el.innerHTML =
      _referralLevelHtml(l1Snap, 1, REFERRAL_PCT.l1, t('ref.l1_label')) +
      _referralLevelHtml(l2Snap, 2, REFERRAL_PCT.l2, t('ref.l2_label')) +
      _referralLevelHtml(l3Snap, 3, REFERRAL_PCT.l3, t('ref.l3_label')) +
      `<div class="referral-footer-note">
        <b>${t('ref.how_title')}</b><br>
        ${t('ref.how_l1', {pct: REFERRAL_PCT.l1})}<br>
        ${t('ref.how_l2', {pct: REFERRAL_PCT.l2})}<br>
        ${t('ref.how_l3', {pct: REFERRAL_PCT.l3})}<br>
        <span style="font-size:0.46875rem;display:block;margin-top:0.25rem;">${t('ref.how_note')}</span>
      </div>`;
  } catch(e) {
    console.warn('[renderReferral]', e);
    const el = document.getElementById('referralLevelsList');
    if(el) el.innerHTML = `<div style="color:var(--red2);font-size:0.625rem;margin-top:1rem;text-align:center;">${t('ref.error')}</div>`;
    const elCount  = document.getElementById('refStatCount');
    const elEarned = document.getElementById('refStatEarned');
    if(elCount)  elCount.textContent  = '—';
    if(elEarned) elEarned.textContent = '—';
  }
}

// Gera o HTML de uma seção de nível (L1/L2/L3) com os jogadores encontrados
function _referralLevelHtml(snap, lvl, pct, label) {
  const badgeColor = lvl === 1 ? 'var(--purple)' : lvl === 2 ? '#1e6b9e' : '#2d6b3a';
  const quantos = snap.size === 1 ? t('ref.players_one', {n: snap.size})
                                  : t('ref.players_many', {n: snap.size});
  const header = `
    <div class="referral-level-section">
      <div class="referral-level-hdr">
        <span class="referral-level-badge" style="background:${badgeColor};">L${lvl}</span>
        <span>${label}</span>
        <span class="referral-level-pct">${pct}%</span>
        ${!snap.empty ? `<span class="referral-level-count">${quantos}</span>` : ''}
      </div>`;

  if(snap.empty) {
    return header + `<div class="referral-empty">${t('ref.empty')}</div></div>`;
  }

  const cards = snap.docs.map(doc => {
    const d       = doc.data();
    const slotIdx = d.gs?.activeSlotIdx ?? d.activeSlotIdx ?? 0;
    const slot    = (d.avatarSlots || [])[slotIdx];
    const nome    = slot?.nome?.split(',')[0] || t('ref.no_avatar');
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
          <div class="referral-player-name">${esc(nome)}</div>
          <div class="referral-player-uid">${shortUid}</div>
        </div>
        <div style="font-size:0.53125rem;color:${rColor};text-align:right;white-space:nowrap;">
          ${esc(rarity || 'Comum')}<br>
          ${active
            ? `<span class="referral-player-active">${t('ref.active')}</span>`
            : `<span class="referral-player-inactive">${t('ref.inactive')}</span>`}
        </div>
      </div>`;
  }).join('');

  return header + `<div class="referral-players-list">${cards}</div></div>`;
}

function _referralCopiarLink() {
  const input = document.getElementById('referralLinkInput');
  if(!input) return;
  navigator.clipboard.writeText(input.value)
    .then(() => showToast(t('ref.copied'), 'ok'))
    .catch(() => {
      input.select();
      document.execCommand('copy');
      showToast(t('ref.copied'), 'ok');
    });
}

// ════════════════════════════════════════════════════════════════════
// A CARTEIRA
//
// Estas duas viviam no js/marketplace-auth.js, que NAO era carregado
// pelo index.html desde que o marketplace passou a ser um modal de
// dentro do jogo. Ou seja: o cristais.js chamava garantirCarteira() e
// o marketplace-core.js chamava vincularCarteira(), e as duas estavam
// por definir — comprar ou resgatar cristais rebentava com
// "garantirCarteira is not defined", no caminho onde ha dinheiro a
// serio. Confirmado no browser antes de mexer: ambas undefined.
//
// Vieram para aqui, que e o ficheiro carregado e o que mais as usa. O
// resto daquele ficheiro era um segundo login por e-mail e senha,
// morto desde a mesma mudanca, e foi apagado com ele: uma porta de
// entrada esquecida na arvore volta sempre a ser aberta por engano.
// ════════════════════════════════════════════════════════════════════

// ── Vincular MetaMask ao uid (para comprar/resgatar cristais) ─────
async function vincularCarteira() {
  if(typeof window.ethereum === 'undefined') {
    showToast(t('mkt.metamask.not_found'), 'err'); return;
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

    // Atualiza header de cristais (MetaMask conectada para transações)
    const dotEl = document.getElementById('walletDot');
    if(dotEl) dotEl.style.background = 'var(--green)';

    showToast(`✅ MetaMask vinculada: ${endereco.slice(0,6)}...${endereco.slice(-4)}`, 'ok');
    return endereco;
  } catch(e) {
    if(e.code !== 4001) showToast(t('mkt.metamask.err'), 'err');
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

  // Não tem carteira vinculada — pede ao usuário
  showToast(t('mkt.metamask.link_first'), 'err');
  return null;
}

window.vincularCarteira = vincularCarteira;
window.garantirCarteira = garantirCarteira;
