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

  const equipped = itemInventory.filter(i => i.equipped).length;
  if(countEl) countEl.innerHTML = `${itemInventory.length} ite${itemInventory.length !== 1 ? 'ns' : 'm'} · <span style="color:var(--gold)">${equipped}/${MAX_EQUIPPED} equipados</span>`;

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
    const canEquip   = !isEquipped && equipped < MAX_EQUIPPED;
    return `<div style="background:rgba(255,255,255,.03);border:1px solid ${isEquipped ? item.cor : 'rgba(255,255,255,.08)'};border-radius:6px;padding:8px 10px;box-sizing:border-box;${isEquipped?`box-shadow:0 0 8px ${item.cor}22;`:''}">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">${item.emoji}</span>
        <div style="flex:1;">
          <div style="font-family:'Cinzel',serif;font-size:7.5px;color:${item.cor};">${item.nome}</div>
          <div style="font-size:6px;color:var(--muted);margin-top:1px;">✦ ${item.efeito}</div>
          ${entry.expiraEm ? `<div class="item-expiry-warn">${Math.max(0,Math.floor((entry.expiraEm-Date.now())/86400000))}d restantes</div>` : ''}
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

  const equipped = itemInventory.filter(i => i.equipped);
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
  const equipped = itemInventory.filter(i => i.equipped).length;
  if(equipped >= MAX_EQUIPPED) { addLog(`Máximo de ${MAX_EQUIPPED} itens equipados.`, 'info'); return; }
  entry.equipped = true;
  const item = ITEM_CATALOG[entry.catalogId];
  addLog(`${item.emoji} ${item.nome} equipado!`, 'good');
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
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