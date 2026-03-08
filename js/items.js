// ═══════════════════════════════════════════════════════════════════
// ITEM INVENTORY
// ═══════════════════════════════════════════════════════════════════
function openItemInventory() {
  renderItemInventory();
  ModalManager.open('itemInvModal');
}

function closeItemInventory() {
  ModalManager.close('itemInvModal');
}

function renderItemInventory() {
  const list = document.getElementById('itemInvList');
  const countEl = document.getElementById('itemInvCount');
  if(!list) return;

  const equippedNormal = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo !== 'Cenário').length;
  const equippedCenario = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo === 'Cenário').length;
  if(countEl) countEl.innerHTML = `${itemInventory.length} ite${itemInventory.length !== 1 ? 'ns' : 'm'} · <span style="color:var(--gold)">${equippedNormal}/${MAX_EQUIPPED} equipados</span>`;

  // Update header counter
  const resEl = document.getElementById('resItems');
  if(resEl) resEl.textContent = itemInventory.length;

  if(itemInventory.length === 0) {
    list.innerHTML = '<div style="font-size:7px;color:var(--muted);text-align:center;padding:20px 0;">Nenhum item no inventário</div>';
    return;
  }

  list.innerHTML = itemInventory.map(entry => {
    const item = ITEM_CATALOG[entry.catalogId];
    if(!item) return '';
    const isEquipped = entry.equipped;
    const isCenario  = item.tipo === 'Cenário';
    const canEquip   = !isEquipped && (isCenario ? equippedCenario < 1 : equippedNormal < MAX_EQUIPPED);
    return `<div style="background:rgba(255,255,255,.03);border:1px solid ${isEquipped ? item.cor : 'rgba(255,255,255,.08)'};border-radius:6px;padding:8px 10px;box-sizing:border-box;${isEquipped?`box-shadow:0 0 8px ${item.cor}22;`:''}">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">${item.emoji}</span>
        <div style="flex:1;">
          <div style="font-family:'Cinzel',serif;font-size:7.5px;color:${item.cor};">${item.nome}</div>
          <div style="font-size:6px;color:var(--muted);margin-top:1px;">✦ ${item.efeito}</div>
          ${entry.expiraEm ? `<div class="item-expiry-warn" style="color:${Math.floor((entry.expiraEm-Date.now())/86400000) <= 3 ? '#e05050' : '#887799'}">${Math.max(0,Math.floor((entry.expiraEm-Date.now())/86400000))}d restantes</div>` : ''}
        </div>
        ${isEquipped ? `<span style="font-size:6px;color:${item.cor};font-family:'Cinzel',serif;letter-spacing:1px;">EQUIPADO</span>` : ''}
      </div>
      <div style="display:flex;gap:5px;margin-top:7px;">
        ${isEquipped
          ? `<button class="egg-btn hatch" onclick="unequipItem(${entry.id})" style="flex:1;font-size:6px;">DESEQUIPAR</button>`
          : `<button class="egg-btn hatch" onclick="equipItem(${entry.id})" style="flex:1;font-size:6px;${!canEquip?'opacity:.4;cursor:not-allowed;':''}" ${!canEquip?'disabled':''}>EQUIPAR</button>`
        }
        <button class="egg-btn burn" onclick="deleteItem(${entry.id})" style="flex:1;font-size:6px;">EXCLUIR</button>
      </div>
    </div>`;
  }).join('');
}


// ── Render equipped items floating above avatar ──
function updateEquippedDisplay() {
  const el = document.getElementById('equippedItemsDisplay');
  if(!el) return;

  // Check and expire items
  const now = Date.now();
  let changed = false;
  itemInventory = itemInventory.filter(i => {
    if(i.expiraEm && now > i.expiraEm) {
      const item = ITEM_CATALOG[i.catalogId];
      addLog(`⏳ ${item ? item.nome : 'Item'} expirou após 30 dias.`, 'bad');
      changed = true;
      return false;
    }
    return true;
  });
  if(changed) { renderItemInventory(); scheduleSave(); }

  const equipped = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo !== 'Cenário');
  if(!hatched || dead || equipped.length === 0) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = equipped.map(entry => {
    const item = ITEM_CATALOG[entry.catalogId];
    if(!item) return '';
    const daysLeft = entry.expiraEm ? Math.max(0, Math.floor((entry.expiraEm - Date.now()) / 86400000)) : 99;
    const warn = daysLeft <= 3 ? `title="${daysLeft}d restantes!"` : `title="${item.nome} (${daysLeft}d)"`;
    return `<span class="equipped-item-badge" ${warn}>${item.emoji}</span>`;
  }).join('');
}

function equipItem(id) {
  const entry = itemInventory.find(i => i.id === id);
  if(!entry) return;
  const isCenario = ITEM_CATALOG[entry.catalogId]?.tipo === 'Cenário';
  if(isCenario) {
    const cCount = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo === 'Cenário').length;
    if(cCount >= 1) { addLog('Já tens uma decoração de cenário equipada.', 'info'); return; }
  } else {
    const nCount = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo !== 'Cenário').length;
    if(nCount >= MAX_EQUIPPED) { addLog(`Máximo de ${MAX_EQUIPPED} itens equipados.`, 'info'); return; }
  }
  entry.equipped = true;
  const item = ITEM_CATALOG[entry.catalogId];
  addLog(`${item.emoji} ${item.nome} equipado!`, 'good');
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
  syncEasterEggs();
}

function unequipItem(id) {
  const entry = itemInventory.find(i => i.id === id);
  if(!entry) return;
  entry.equipped = false;
  const item = ITEM_CATALOG[entry.catalogId];
  addLog(`${item.emoji} ${item.nome} desequipado.`, 'info');
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
  syncEasterEggs();
}

function deleteItem(id) {
  const idx = itemInventory.findIndex(i => i.id === id);
  if(idx === -1) return;
  const item = ITEM_CATALOG[itemInventory[idx].catalogId];
  itemInventory.splice(idx, 1);
  addLog(`${item ? item.emoji + ' ' + item.nome : 'Item'} excluído.`, 'info');
  updateResourceUI();
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
}

// ═══════════════════════════════════════════
// ── DECORAÇÃO DE PÁSCOA ──────────────────────────────────────────────
const EASTER_EGG_POSITIONS = [
  { left:'5%',  bottom:'22px' },
  { left:'15%', bottom:'22px' },
  { left:'25%', bottom:'22px' },
  { left:'67%', bottom:'22px' },
  { left:'77%', bottom:'22px' },
  { left:'87%', bottom:'22px' },
];

const EASTER_PALETTES = [
  { bg:'#f87171', stripe:'#fff',  gem:'#fecaca' },
  { bg:'#fb923c', stripe:'#fff8', gem:'#fed7aa' },
  { bg:'#a3e635', stripe:'#fff',  gem:'#d9f99d' },
  { bg:'#34d399', stripe:'#fff',  gem:'#a7f3d0' },
  { bg:'#60a5fa', stripe:'#fff8', gem:'#bfdbfe' },
  { bg:'#c084fc', stripe:'#fff',  gem:'#e9d5ff' },
];

function makeEasterEggSVG(idx) {
  const p   = EASTER_PALETTES[idx % EASTER_PALETTES.length];
  const id  = 'ee'+idx;
  const dur = (2.2 + idx * 0.3).toFixed(1);
  const del = (idx * 0.35).toFixed(2);
  return `<svg viewBox="0 0 28 34" width="28" height="34" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <defs>
    <radialGradient id="${id}g" cx="38%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#fff" stop-opacity=".5"/>
      <stop offset="100%" stop-color="${p.bg}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="${id}c"><ellipse cx="14" cy="18" rx="11" ry="14"/></clipPath>
  </defs>
  <ellipse cx="14" cy="18" rx="11" ry="14" fill="${p.bg}" opacity=".95"/>
  <g clip-path="url(#${id}c)">
    <rect x="3" y="13" width="22" height="3" fill="${p.stripe}" opacity=".3"/>
    <rect x="3" y="20" width="22" height="2" fill="${p.stripe}" opacity=".2"/>
    <circle cx="10" cy="17" r="1.8" fill="${p.gem}" opacity=".7"/>
    <circle cx="14" cy="15" r="2.2" fill="${p.gem}" opacity=".8"/>
    <circle cx="18" cy="17" r="1.8" fill="${p.gem}" opacity=".7"/>
  </g>
  <ellipse cx="14" cy="18" rx="11" ry="14" fill="url(#${id}g)"/>
  <ellipse cx="14" cy="18" rx="11" ry="14" fill="none" stroke="#fff" stroke-width=".6" opacity=".3"/>
  <ellipse cx="14" cy="31" rx="7" ry="2" fill="#000" opacity=".15"/>
  <animateTransform attributeName="transform" type="translate"
    values="0,0; 0,-5; 0,0" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
</svg>`;
}

function makeButterflySVG(idx) {
  const colors = ['#f472b6','#a78bfa','#34d399','#fb923c','#60a5fa'];
  const c1 = colors[idx % colors.length];
  const c2 = colors[(idx+2) % colors.length];
  const dur = (3 + idx * 0.5).toFixed(1);
  const xStart = 10 + idx * 22;
  const del = (idx * 0.7).toFixed(1);
  return `<svg viewBox="0 0 32 28" width="32" height="28" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <!-- asa esquerda superior -->
  <ellipse cx="10" cy="10" rx="9" ry="7" fill="${c1}" opacity=".75" transform="rotate(-20 10 10)">
    <animate attributeName="ry" values="7;4;7" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values=".75;.5;.75" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
  </ellipse>
  <!-- asa direita superior -->
  <ellipse cx="22" cy="10" rx="9" ry="7" fill="${c1}" opacity=".75" transform="rotate(20 22 10)">
    <animate attributeName="ry" values="7;4;7" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values=".75;.5;.75" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
  </ellipse>
  <!-- asa esquerda inferior -->
  <ellipse cx="11" cy="19" rx="6" ry="5" fill="${c2}" opacity=".6" transform="rotate(15 11 19)">
    <animate attributeName="ry" values="5;3;5" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
  </ellipse>
  <!-- asa direita inferior -->
  <ellipse cx="21" cy="19" rx="6" ry="5" fill="${c2}" opacity=".6" transform="rotate(-15 21 19)">
    <animate attributeName="ry" values="5;3;5" dur="${dur}s" begin="${del}s" repeatCount="indefinite"/>
  </ellipse>
  <!-- corpo -->
  <ellipse cx="16" cy="14" rx="2" ry="8" fill="#1a0a2e" opacity=".8"/>
  <circle cx="16" cy="7" r="2" fill="#1a0a2e" opacity=".8"/>
  <!-- antenas -->
  <line x1="15" y1="6" x2="11" y2="2" stroke="#1a0a2e" stroke-width="1" opacity=".7"/>
  <line x1="17" y1="6" x2="21" y2="2" stroke="#1a0a2e" stroke-width="1" opacity=".7"/>
  <circle cx="11" cy="2" r="1.2" fill="${c1}" opacity=".8"/>
  <circle cx="21" cy="2" r="1.2" fill="${c1}" opacity=".8"/>
  <!-- movimento horizontal -->
  <animateTransform attributeName="transform" type="translate"
    values="${xStart},0; ${xStart+18},0; ${xStart},0"
    dur="${(parseFloat(dur)*2.5).toFixed(1)}s" begin="${del}s" repeatCount="indefinite" additive="sum"/>
</svg>`;
}

function makeFlowerSVG(idx) {
  const cols = ['#f472b6','#fbbf24','#a78bfa','#34d399','#f87171'];
  const col  = cols[idx % cols.length];
  const del  = (idx * 0.4).toFixed(1);
  return `<svg viewBox="0 0 20 20" width="16" height="16" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <circle cx="10" cy="6"  r="3.5" fill="${col}" opacity=".85"><animate attributeName="opacity" values=".85;.6;.85" dur="3s" begin="${del}s" repeatCount="indefinite"/></circle>
  <circle cx="14" cy="10" r="3.5" fill="${col}" opacity=".85"><animate attributeName="opacity" values=".85;.6;.85" dur="3s" begin="${(parseFloat(del)+0.5).toFixed(1)}s" repeatCount="indefinite"/></circle>
  <circle cx="10" cy="14" r="3.5" fill="${col}" opacity=".85"><animate attributeName="opacity" values=".85;.6;.85" dur="3s" begin="${(parseFloat(del)+1.0).toFixed(1)}s" repeatCount="indefinite"/></circle>
  <circle cx="6"  cy="10" r="3.5" fill="${col}" opacity=".85"><animate attributeName="opacity" values=".85;.6;.85" dur="3s" begin="${(parseFloat(del)+1.5).toFixed(1)}s" repeatCount="indefinite"/></circle>
  <circle cx="10" cy="10" r="3.5" fill="#fff8" opacity=".9"/>
</svg>`;
}

function syncEasterEggs() {
  const container = document.getElementById('easterEggContainer');
  if(!container) return;
  const active = getEquippedItems().some(i => i.id === 'decoracao_pascoa');
  if(!active) { container.innerHTML = ''; return; }
  container.innerHTML = '';

  // 6 ovos no chão
  EASTER_EGG_POSITIONS.forEach((pos, i) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${pos.left};bottom:${pos.bottom};z-index:5;pointer-events:none;`;
    el.innerHTML = makeEasterEggSVG(i);
    container.appendChild(el);
  });

  // 3 borboletas voando em alturas diferentes
  [['-10px',0],['-30px',1],['-18px',2]].forEach(([bottom, idx]) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:0;bottom:${bottom};z-index:7;pointer-events:none;`;
    el.innerHTML = makeButterflySVG(idx);
    container.appendChild(el);
  });

  // 5 florezinhas no chão entre os ovos
  [[35,0],[47,1],[57,2],[42,3],[52,4]].forEach(([leftPct, idx]) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${leftPct}%;bottom:22px;z-index:5;pointer-events:none;`;
    el.innerHTML = makeFlowerSVG(idx);
    container.appendChild(el);
  });
}
