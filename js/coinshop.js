// ═══════════════════════════════════════════════════════════════════
// COIN SHOP
// ═══════════════════════════════════════════════════════════════════
const COIN_PACKAGES = [
  { id:'iniciante', icon:'🌱', name:'Iniciante',  matic:0.1,  coins:100,  bonus:0,   desc:'Pacote inicial' },
  { id:'explorador',icon:'⚔️', name:'Explorador', matic:0.5,  coins:600,  bonus:20,  desc:'+20% bônus' },
  { id:'guardiao',  icon:'🛡️', name:'Guardião',   matic:1.0,  coins:1500, bonus:50,  desc:'+50% bônus' },
  { id:'lendario',  icon:'👑', name:'Lendário',   matic:5.0,  coins:10000,bonus:100, desc:'+100% bônus' },
];

function openCoinShop() {
  renderCoinPackages();
  ModalManager.open('coinShopModal');
}

function closeCoinShop() {
  ModalManager.close('coinShopModal');
}

function renderCoinPackages() {
  const walletConnected = !!walletAddress;
  const discount = avatar ? rarityBonus().shopDiscount : 0;

  document.getElementById('coinWalletStatus').innerHTML = walletConnected
    ? `✅ Carteira conectada<br><span style="color:#7ab87a;">Pronto para comprar!</span>`
    : `🔌 Carteira não conectada<br><span style="color:#554466;">Conecte sua MetaMask para comprar moedas</span>`;

  document.getElementById('coinPackages').innerHTML = COIN_PACKAGES.map(pkg => {
    const finalCoins = discount > 0 ? Math.round(pkg.coins * (1 + discount)) : pkg.coins;
    const discountTxt = discount > 0 ? `<span style="color:#e8a030"> +${Math.round(discount*100)}% avatar ${avatar.raridade}</span>` : '';
    const bonusTxt = pkg.bonus > 0 ? `+${pkg.bonus}% bônus${discountTxt}` : discountTxt || '&nbsp;';

    return `<div class="coin-pkg ${walletConnected ? '' : 'disabled'}" onclick="buyCoinPackage('${pkg.id}')">
      <div class="coin-pkg-icon">${pkg.icon}</div>
      <div class="coin-pkg-info">
        <div class="coin-pkg-name">${pkg.name}</div>
        <div class="coin-pkg-desc">${pkg.desc}</div>
        <div class="coin-pkg-bonus">${bonusTxt}</div>
      </div>
      <div style="text-align:right;">
        <div class="coin-pkg-price">${pkg.matic} MATIC</div>
        <div style="font-size:7px;color:#7ab87a;">${finalCoins.toLocaleString()} 🪙</div>
      </div>
    </div>`;
  }).join('');
}

function buyCoinPackage(id) {
  // const pkg = COIN_PACKAGES.find(p => p.id === id);
  // await ethereum.request({ method: 'eth_sendTransaction', ... });
  addLog('🔌 Conecte a MetaMask para comprar moedas.', 'info');
}
