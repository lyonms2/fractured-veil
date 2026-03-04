// ═══════════════════════════════════════════════════════════════════
// LOJA IN-GAME
// ═══════════════════════════════════════════════════════════════════
let xpBoostActive = false;
let xpBoostTimer  = 0; // seconds remaining
let xpBoostMult   = 2.0;

const SHOP_ITEMS = [
  {
    id:'food',    icon:'🍖', name:'Ração Especial',
    baseCost:25,  desc:'Alimentação instantânea',
    effect:'+40 fome',
    action: () => {
      vitals.fome = Math.min(100, vitals.fome + 40);
      playAnim('anim-eat'); spawnFoodParticles();
      showBubble('Que delícia! 😋'); showFloat('+40 🍖','#e74c3c');
      addLog('Usou Ração Especial! +40 fome','good');
    }
  },
  {
    id:'remedy',  icon:'💊', name:'Elixir Cura',
    baseCost:80,  desc:'Cura doenças e restaura saúde',
    effect:'+50 saúde · cura doença',
    action: () => {
      vitals.saude = Math.min(100, vitals.saude + 50);
      sick = false;
      playAnim('anim-heal');
      showBubble('Me sinto melhor! 💊'); showFloat('+50 ❤️','#e74c3c');
      addLog('Usou Elixir Cura! +50 saúde','good');
    }
  },
  {
    id:'hygiene', icon:'🧼', name:'Kit Higiene',
    baseCost:40,  desc:'Limpa sujeira e cocô instantaneamente',
    effect:'+60 higiene · remove sujeira',
    action: () => {
      vitals.higiene = Math.min(100, vitals.higiene + 60);
      dirtyLevel = 0; poopCount = 0;
      document.getElementById('poopContainer').innerHTML = '';
      document.getElementById('dirtLayer').querySelectorAll('.dirt-spot')
        .forEach(d => d.style.opacity='0');
      showBubble('Que frescor! 🧼'); showFloat('+60 🧼','#5ab4e8');
      addLog('Usou Kit Higiene! +60 higiene','good');
    }
  },
  {
    id:'xpboost', icon:'✨', name:'Impulso XP',
    baseCost:120, desc:'Dobra o XP por 3 minutos',
    effect:'×2 XP por 3 min',
    action: () => {
      xpBoostActive = true;
      xpBoostTimer  = 180;
      showBubble('XP em dobro! ✨'); showFloat('×2 XP','#e8a030');
      addLog('Impulso XP ativo por 3 minutos!','leg');
      renderShopItems();
    }
  },
];

function openShop() {
  if(!canAct()) return;
  renderShopItems();
  ModalManager.open('shopModal');
}

function closeShop() {
  ModalManager.close('shopModal');
}

function renderShopItems() {
  const discount = avatar ? rarityBonus().shopDiscount : 0;
  const moedas   = gs.moedas;

  document.getElementById('shopSub').textContent =
    `Você tem ${moedas} 🪙` + (discount > 0 ? ` · ${Math.round(discount*100)}% desc.` : '');

  // XP boost status
  const boostEl = document.getElementById('shopXpBoost');
  if(xpBoostActive && xpBoostTimer > 0) {
    boostEl.style.display = 'block';
    const m = Math.floor(xpBoostTimer/60), s = xpBoostTimer%60;
    document.getElementById('shopBoostTimer').textContent =
      `${m}:${s.toString().padStart(2,'0')} restantes`;
  } else {
    boostEl.style.display = 'none';
  }

  document.getElementById('shopItems').innerHTML = SHOP_ITEMS.map(item => {
    const finalCost = Math.round(item.baseCost * (1 - discount));
    const cantBuy   = moedas < finalCost || (item.id==='xpboost' && xpBoostActive);
    const discountTxt = discount > 0
      ? `<div class="shop-item-discount">${item.baseCost} → ${finalCost} 🪙</div>`
      : '';

    return `<div class="shop-item ${cantBuy ? 'disabled':''}" onclick="buyShopItem('${item.id}')">
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-info">
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-effect">${item.effect}</div>
      </div>
      <div>
        <div class="shop-item-price">${finalCost} 🪙</div>
        ${discountTxt}
      </div>
    </div>`;
  }).join('');
}

function buyShopItem(id) {
  const item     = SHOP_ITEMS.find(i => i.id === id);
  if(!item) return;
  const discount  = avatar ? rarityBonus().shopDiscount : 0;
  const finalCost = Math.round(item.baseCost * (1 - discount));
  if(!spendCoins(finalCost)) return;
  item.action();
  checkXP(); updateAllUI();
  renderShopItems(); // refresh prices/availability
}

// Tick XP boost timer in gameTick
function tickXpBoost() {
  if(!xpBoostActive) return;
  xpBoostTimer--;
  if(xpBoostTimer <= 0) {
    xpBoostActive = false;
    xpBoostTimer  = 0;
    addLog('Impulso XP terminou.','info');
  }
  if(ModalManager.isOpen('shopModal')) renderShopItems();
}
