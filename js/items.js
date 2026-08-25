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

  // Filtra consumíveis do inventário (nunca devem aparecer aqui)
  const displayItems = itemInventory.filter(i => !ITEM_CATALOG[i.catalogId]?.consumivel);

  const equippedNormal  = displayItems.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo !== 'Cenário').length;
  const equippedCenario = displayItems.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo === 'Cenário').length;
  if(countEl) countEl.innerHTML = t('item.inv.count', {n: displayItems.length, word: t(displayItems.length !== 1 ? 'item.inv.word_multi' : 'item.inv.word_one'), eq: equippedNormal, max: MAX_EQUIPPED});

  const resEl = document.getElementById('resItems');
  if(resEl) resEl.textContent = displayItems.length;

  if(displayItems.length === 0) {
    list.innerHTML = `<div style="font-size:7px;color:var(--muted);text-align:center;padding:20px 0;">${t('item.inv.empty')}</div>`;
    return;
  }

  // Agrupa por tipo
  const TIPO_ORDER = ['Amuleto', 'Coroa', 'Cenário', 'Especial'];
  const grupos = {};
  displayItems.forEach(entry => {
    const tipo = ITEM_CATALOG[entry.catalogId]?.tipo || 'Outro';
    if(!grupos[tipo]) grupos[tipo] = [];
    grupos[tipo].push(entry);
  });

  const tiposPresentes = TIPO_ORDER.filter(t => grupos[t]).concat(
    Object.keys(grupos).filter(t => !TIPO_ORDER.includes(t))
  );

  function renderCard(entry) {
    const item = ITEM_CATALOG[entry.catalogId];
    if(!item) return '';
    const isEquipped = entry.equipped;
    const isCenario  = item.tipo === 'Cenário';
    const canEquip   = !isEquipped && (isCenario ? equippedCenario < 1 : equippedNormal < MAX_EQUIPPED);
    const diasRest   = entry.expiraEm ? Math.max(0, Math.floor((entry.expiraEm - Date.now()) / 86400000)) : null;
    return `<div style="background:rgba(255,255,255,.03);border:1px solid ${isEquipped ? item.cor : 'rgba(255,255,255,.08)'};border-radius:8px;padding:11px 13px;box-sizing:border-box;${isEquipped ? `box-shadow:0 0 10px ${item.cor}28;` : ''}">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:20px;flex-shrink:0;">${item.emoji}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Cinzel',serif;font-size:8px;color:${item.cor};font-weight:700;">${item.nome}</div>
          <div style="font-size:6.5px;color:var(--muted);margin-top:2px;">✦ ${item.efeito}</div>
          ${diasRest !== null ? `<div class="item-expiry-warn" style="color:${diasRest <= 3 ? '#e05050' : '#887799'};margin-top:2px;">${t('item.card.days_left', {d: diasRest})}</div>` : ''}
        </div>
        ${isEquipped ? `<span style="font-size:6.5px;color:${item.cor};font-family:'Cinzel',serif;letter-spacing:1px;flex-shrink:0;">${t('item.card.equipped')}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;">
        ${isEquipped
          ? `<button class="egg-btn hatch" onclick="unequipItem(${entry.id})" style="flex:1;font-size:6.5px;padding:5px 0;">${t('item.btn.unequip')}</button>`
          : `<button class="egg-btn hatch" onclick="equipItem(${entry.id})" style="flex:1;font-size:6.5px;padding:5px 0;${!canEquip ? 'opacity:.4;cursor:not-allowed;' : ''}" ${!canEquip ? 'disabled' : ''}>${t('item.btn.equip')}</button>`
        }
        <button class="egg-btn burn" onclick="deleteItem(${entry.id})" style="flex:1;font-size:6.5px;padding:5px 0;">${t('item.btn.delete')}</button>
      </div>
    </div>`;
  }

  list.innerHTML = tiposPresentes.map(tipo => `
    <div style="margin-bottom:16px;">
      <div style="font-family:'Cinzel',serif;font-size:6.5px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;padding:5px 2px 7px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:10px;">◆ ${tItemTipo(tipo)}</div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${grupos[tipo].map(renderCard).join('')}
      </div>
    </div>
  `).join('');
}


// ── Render equipped items floating above avatar ──
function updateEquippedDisplay() {
  const el = document.getElementById('equippedItemsDisplay');
  if(!el) return;

  // Expirar o que passou dos 30 dias, e deitar fora o que já não existe
  // no catálogo. Sem a segunda parte, um item retirado do jogo ficava no
  // inventário de quem o tinha comprado a fazer um grupo "◆ OUTRO" vazio,
  // porque o cartão não sabe desenhar o que não conhece.
  const now = Date.now();
  let changed = false;
  itemInventory = itemInventory.filter(i => {
    const item = ITEM_CATALOG[i.catalogId];
    if(!item) { changed = true; return false; }
    if(i.expiraEm && now > i.expiraEm) {
      addLog(t('item.log.expired', {nome: item.nome}), 'bad');
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
    const warn = daysLeft <= 3 ? `title="${t('item.tooltip.days_warn', {d: daysLeft})}"` : `title="${t('item.tooltip.days', {nome: item.nome, d: daysLeft})}"` ;
    return `<span class="equipped-item-badge" ${warn}>${item.emoji}</span>`;
  }).join('');
}

function equipItem(id) {
  const entry = itemInventory.find(i => i.id === id);
  if(!entry) return;
  const isCenario = ITEM_CATALOG[entry.catalogId]?.tipo === 'Cenário';
  if(isCenario) {
    const cCount = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo === 'Cenário').length;
    if(cCount >= 1) { addLog(t('item.log.cenario_full'), 'info'); return; }
  } else {
    const nCount = itemInventory.filter(i => i.equipped && ITEM_CATALOG[i.catalogId]?.tipo !== 'Cenário').length;
    if(nCount >= MAX_EQUIPPED) { addLog(t('item.log.max_equipped', {max: MAX_EQUIPPED}), 'info'); return; }
  }
  entry.equipped = true;
  const item = ITEM_CATALOG[entry.catalogId];
  addLog(t('item.log.equipped', {emoji: item.emoji, nome: item.nome}), 'good');
  showBubble(rnd(FALAS.item));
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
}

function unequipItem(id) {
  const entry = itemInventory.find(i => i.id === id);
  if(!entry) return;
  entry.equipped = false;
  const item = ITEM_CATALOG[entry.catalogId];
  addLog(t('item.log.unequipped', {emoji: item.emoji, nome: item.nome}), 'info');
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
}

function deleteItem(id) {
  const idx = itemInventory.findIndex(i => i.id === id);
  if(idx === -1) return;
  const item = ITEM_CATALOG[itemInventory[idx].catalogId];
  itemInventory.splice(idx, 1);
  addLog(t('item.log.deleted', {nome: item ? item.emoji + ' ' + item.nome : 'Item'}), 'info');
  updateResourceUI();
  scheduleSave();
  renderItemInventory();
  updateEquippedDisplay();
}
