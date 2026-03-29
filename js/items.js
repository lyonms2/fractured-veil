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
  if(countEl) countEl.innerHTML = `${displayItems.length} ite${displayItems.length !== 1 ? 'ns' : 'm'} · <span style="color:var(--gold)">${equippedNormal}/${MAX_EQUIPPED} equipados</span>`;

  const resEl = document.getElementById('resItems');
  if(resEl) resEl.textContent = displayItems.length;

  if(displayItems.length === 0) {
    list.innerHTML = '<div style="font-size:7px;color:var(--muted);text-align:center;padding:20px 0;">Nenhum item no inventário</div>';
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
    return `<div style="background:rgba(255,255,255,.03);border:1px solid ${isEquipped ? item.cor : 'rgba(255,255,255,.08)'};border-radius:6px;padding:8px 10px;box-sizing:border-box;${isEquipped ? `box-shadow:0 0 8px ${item.cor}22;` : ''}">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">${item.emoji}</span>
        <div style="flex:1;">
          <div style="font-family:'Cinzel',serif;font-size:7.5px;color:${item.cor};">${item.nome}</div>
          <div style="font-size:6px;color:var(--muted);margin-top:1px;">✦ ${item.efeito}</div>
          ${diasRest !== null ? `<div class="item-expiry-warn" style="color:${diasRest <= 3 ? '#e05050' : '#887799'}">${diasRest}d restantes</div>` : ''}
        </div>
        ${isEquipped ? `<span style="font-size:6px;color:${item.cor};font-family:'Cinzel',serif;letter-spacing:1px;">EQUIPADO</span>` : ''}
      </div>
      <div style="display:flex;gap:5px;margin-top:7px;">
        ${isEquipped
          ? `<button class="egg-btn hatch" onclick="unequipItem(${entry.id})" style="flex:1;font-size:6px;">DESEQUIPAR</button>`
          : `<button class="egg-btn hatch" onclick="equipItem(${entry.id})" style="flex:1;font-size:6px;${!canEquip ? 'opacity:.4;cursor:not-allowed;' : ''}" ${!canEquip ? 'disabled' : ''}>EQUIPAR</button>`
        }
        <button class="egg-btn burn" onclick="deleteItem(${entry.id})" style="flex:1;font-size:6px;">EXCLUIR</button>
      </div>
    </div>`;
  }

  list.innerHTML = tiposPresentes.map(tipo => `
    <div style="margin-bottom:4px;">
      <div style="font-family:'Cinzel',serif;font-size:6px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;padding:4px 2px 5px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:6px;">◆ ${tipo}</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${grupos[tipo].map(renderCard).join('')}
      </div>
    </div>
  `).join('');
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

function makePascoaBorderSVG() {
  // Borda decorativa ao redor do cenário (mainScreen)
  // Usa SVG com viewBox proporcional ao container
  // Ovos nos cantos, flores nas laterais, borboletas no topo
  return `<svg viewBox="0 0 340 300" width="100%" height="100%"
    xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;inset:0;pointer-events:none;z-index:20;">
    <defs>
      <radialGradient id="eg0" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#f87171" stop-opacity="0"/></radialGradient>
      <radialGradient id="eg1" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/></radialGradient>
      <radialGradient id="eg2" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#a3e635" stop-opacity="0"/></radialGradient>
      <radialGradient id="eg3" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#c084fc" stop-opacity="0"/></radialGradient>
      <radialGradient id="eg4" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#fb923c" stop-opacity="0"/></radialGradient>
      <radialGradient id="eg5" cx="38%" cy="30%" r="60%"><stop offset="0%" stop-color="#fff" stop-opacity=".5"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
    </defs>

    <!-- ══ BORDA DECORATIVA ══ -->
    <!-- linha de borda pastel suave -->
    <rect x="4" y="4" width="332" height="292" rx="14"
      fill="none" stroke="#f472b680" stroke-width="2.5" stroke-dasharray="6 4">
      <animate attributeName="stroke-opacity" values=".5;.9;.5" dur="3s" repeatCount="indefinite"/>
    </rect>
    <rect x="7" y="7" width="326" height="286" rx="12"
      fill="none" stroke="#a78bfa40" stroke-width="1.5"/>

    <!-- ══ OVOS NOS CANTOS ══ -->
    <!-- canto topo-esquerdo -->
    <g transform="translate(12,8) rotate(-25)">
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="#f87171" opacity=".9"/>
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="url(#eg0)"/>
      <rect x="-9" y="-2" width="18" height="2.5" fill="#fff" opacity=".25"/>
      <circle cx="-3" cy="-3" r="1.5" fill="#fecaca" opacity=".7"/>
      <circle cx="3" cy="-3" r="1.5" fill="#fecaca" opacity=".7"/>
      <animate attributeName="transform" attributeName="opacity" values=".9;1;.9" dur="2s" repeatCount="indefinite"/>
    </g>
    <!-- canto topo-direito -->
    <g transform="translate(328,8) rotate(25)">
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="#60a5fa" opacity=".9"/>
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="url(#eg1)"/>
      <rect x="-9" y="-2" width="18" height="2.5" fill="#fff" opacity=".25"/>
      <circle cx="-3" cy="-3" r="1.5" fill="#bfdbfe" opacity=".7"/>
      <circle cx="3" cy="-3" r="1.5" fill="#bfdbfe" opacity=".7"/>
    </g>
    <!-- canto baixo-esquerdo -->
    <g transform="translate(12,290) rotate(20)">
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="#a3e635" opacity=".9"/>
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="url(#eg2)"/>
      <rect x="-9" y="-2" width="18" height="2.5" fill="#fff" opacity=".25"/>
      <circle cx="-3" cy="-3" r="1.5" fill="#d9f99d" opacity=".7"/>
      <circle cx="3" cy="-3" r="1.5" fill="#d9f99d" opacity=".7"/>
    </g>
    <!-- canto baixo-direito -->
    <g transform="translate(328,290) rotate(-20)">
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="#c084fc" opacity=".9"/>
      <ellipse cx="0" cy="0" rx="9" ry="11" fill="url(#eg3)"/>
      <rect x="-9" y="-2" width="18" height="2.5" fill="#fff" opacity=".25"/>
      <circle cx="-3" cy="-3" r="1.5" fill="#e9d5ff" opacity=".7"/>
      <circle cx="3" cy="-3" r="1.5" fill="#e9d5ff" opacity=".7"/>
    </g>

    <!-- ══ FLORES NAS LATERAIS ══ -->
    <!-- lateral esquerda: 3 flores -->
    <g transform="translate(6,80)"><circle cx="0" cy="0" r="5" fill="#f472b6" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.5s" repeatCount="indefinite"/></circle><circle cx="5" cy="4" r="5" fill="#f472b6" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.5s" begin=".6s" repeatCount="indefinite"/></circle><circle cx="0" cy="8" r="5" fill="#f472b6" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.5s" begin="1.2s" repeatCount="indefinite"/></circle><circle cx="-5" cy="4" r="5" fill="#f472b6" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.5s" begin="1.8s" repeatCount="indefinite"/></circle><circle cx="0" cy="4" r="4" fill="#fff" opacity=".85"/></g>
    <g transform="translate(6,150)"><circle cx="0" cy="0" r="5" fill="#fbbf24" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3s" begin=".3s" repeatCount="indefinite"/></circle><circle cx="5" cy="4" r="5" fill="#fbbf24" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3s" begin=".9s" repeatCount="indefinite"/></circle><circle cx="0" cy="8" r="5" fill="#fbbf24" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3s" begin="1.5s" repeatCount="indefinite"/></circle><circle cx="-5" cy="4" r="5" fill="#fbbf24" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3s" begin="2.1s" repeatCount="indefinite"/></circle><circle cx="0" cy="4" r="4" fill="#fff" opacity=".85"/></g>
    <g transform="translate(6,220)"><circle cx="0" cy="0" r="5" fill="#34d399" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2s" begin=".5s" repeatCount="indefinite"/></circle><circle cx="5" cy="4" r="5" fill="#34d399" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2s" begin="1.0s" repeatCount="indefinite"/></circle><circle cx="0" cy="8" r="5" fill="#34d399" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2s" begin="1.5s" repeatCount="indefinite"/></circle><circle cx="-5" cy="4" r="5" fill="#34d399" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2s" begin="2.0s" repeatCount="indefinite"/></circle><circle cx="0" cy="4" r="4" fill="#fff" opacity=".85"/></g>
    <!-- lateral direita: 3 flores -->
    <g transform="translate(334,80)"><circle cx="0" cy="0" r="5" fill="#a78bfa" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.8s" begin=".4s" repeatCount="indefinite"/></circle><circle cx="5" cy="4" r="5" fill="#a78bfa" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.8s" begin="1.0s" repeatCount="indefinite"/></circle><circle cx="0" cy="8" r="5" fill="#a78bfa" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.8s" begin="1.6s" repeatCount="indefinite"/></circle><circle cx="-5" cy="4" r="5" fill="#a78bfa" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.8s" begin="2.2s" repeatCount="indefinite"/></circle><circle cx="0" cy="4" r="4" fill="#fff" opacity=".85"/></g>
    <g transform="translate(334,150)"><circle cx="0" cy="0" r="5" fill="#f87171" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.2s" begin=".2s" repeatCount="indefinite"/></circle><circle cx="5" cy="4" r="5" fill="#f87171" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.2s" begin=".8s" repeatCount="indefinite"/></circle><circle cx="0" cy="8" r="5" fill="#f87171" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.2s" begin="1.4s" repeatCount="indefinite"/></circle><circle cx="-5" cy="4" r="5" fill="#f87171" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="2.2s" begin="2.0s" repeatCount="indefinite"/></circle><circle cx="0" cy="4" r="4" fill="#fff" opacity=".85"/></g>
    <g transform="translate(334,220)"><circle cx="0" cy="0" r="5" fill="#fb923c" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3.2s" begin=".7s" repeatCount="indefinite"/></circle><circle cx="5" cy="4" r="5" fill="#fb923c" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3.2s" begin="1.3s" repeatCount="indefinite"/></circle><circle cx="0" cy="8" r="5" fill="#fb923c" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3.2s" begin="1.9s" repeatCount="indefinite"/></circle><circle cx="-5" cy="4" r="5" fill="#fb923c" opacity=".7"><animate attributeName="opacity" values=".7;.4;.7" dur="3.2s" begin="2.5s" repeatCount="indefinite"/></circle><circle cx="0" cy="4" r="4" fill="#fff" opacity=".85"/></g>

    <!-- ══ BORBOLETAS NO TOPO ══ -->
    <!-- borboleta 1 -->
    <g opacity=".85">
      <ellipse cx="100" cy="18" rx="10" ry="7" fill="#f472b6" opacity=".75" transform="rotate(-15 100 18)"><animate attributeName="ry" values="7;3;7" dur="1.8s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="118" cy="18" rx="10" ry="7" fill="#f472b6" opacity=".75" transform="rotate(15 118 18)"><animate attributeName="ry" values="7;3;7" dur="1.8s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="103" cy="23" rx="6" ry="4" fill="#fbbf24" opacity=".6"><animate attributeName="ry" values="4;2;4" dur="1.8s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="115" cy="23" rx="6" ry="4" fill="#fbbf24" opacity=".6"><animate attributeName="ry" values="4;2;4" dur="1.8s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="109" cy="20" rx="2" ry="6" fill="#1a0a2e" opacity=".8"/>
      <animateTransform attributeName="transform" type="translate" values="0,0;25,0;0,0" dur="6s" repeatCount="indefinite" additive="sum"/>
    </g>
    <!-- borboleta 2 -->
    <g opacity=".85">
      <ellipse cx="200" cy="15" rx="9" ry="6" fill="#a78bfa" opacity=".75" transform="rotate(-15 200 15)"><animate attributeName="ry" values="6;2;6" dur="2.2s" begin=".5s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="216" cy="15" rx="9" ry="6" fill="#a78bfa" opacity=".75" transform="rotate(15 216 15)"><animate attributeName="ry" values="6;2;6" dur="2.2s" begin=".5s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="203" cy="20" rx="5" ry="3.5" fill="#c084fc" opacity=".6"><animate attributeName="ry" values="3.5;1.5;3.5" dur="2.2s" begin=".5s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="213" cy="20" rx="5" ry="3.5" fill="#c084fc" opacity=".6"><animate attributeName="ry" values="3.5;1.5;3.5" dur="2.2s" begin=".5s" repeatCount="indefinite"/></ellipse>
      <ellipse cx="208" cy="17" rx="2" ry="5.5" fill="#1a0a2e" opacity=".8"/>
      <animateTransform attributeName="transform" type="translate" values="0,0;-20,0;0,0" dur="7s" begin=".8s" repeatCount="indefinite" additive="sum"/>
    </g>

    <!-- ══ OVOS EXTRAS NO TOPO (meio) ══ -->
    <g transform="translate(165,10) rotate(-10)">
      <ellipse cx="0" cy="0" rx="8" ry="10" fill="#fb923c" opacity=".85"/>
      <ellipse cx="0" cy="0" rx="8" ry="10" fill="url(#eg4)"/>
      <rect x="-8" y="-2" width="16" height="2" fill="#fff" opacity=".25"/>
      <animate attributeName="opacity" values=".85;1;.85" dur="2.5s" repeatCount="indefinite"/>
    </g>
    <g transform="translate(175,8) rotate(8)">
      <ellipse cx="0" cy="0" rx="8" ry="10" fill="#34d399" opacity=".85"/>
      <ellipse cx="0" cy="0" rx="8" ry="10" fill="url(#eg5)"/>
      <rect x="-8" y="-2" width="16" height="2" fill="#fff" opacity=".25"/>
      <animate attributeName="opacity" values=".85;1;.85" dur="3s" begin=".6s" repeatCount="indefinite"/>
    </g>
  </svg>`;
}

function syncEasterEggs() {
  const container = document.getElementById('easterEggContainer');
  if(!container) return;
  const active = getEquippedItems().some(i => i.id === 'decoracao_pascoa');
  if(!active) { container.innerHTML = ''; return; }
  container.innerHTML = makePascoaBorderSVG();
}
