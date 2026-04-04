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
  return `<svg viewBox="0 0 340 300" width="100%" height="100%"
    xmlns="http://www.w3.org/2000/svg"
    style="position:absolute;inset:0;pointer-events:none;z-index:20;">
    <defs>
      <radialGradient id="egl0" cx="35%" cy="28%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity=".6"/><stop offset="100%" stop-color="#f87171" stop-opacity="0"/></radialGradient>
      <radialGradient id="egl1" cx="35%" cy="28%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity=".6"/><stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/></radialGradient>
      <radialGradient id="egl2" cx="35%" cy="28%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity=".6"/><stop offset="100%" stop-color="#a3e635" stop-opacity="0"/></radialGradient>
      <radialGradient id="egl3" cx="35%" cy="28%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity=".6"/><stop offset="100%" stop-color="#c084fc" stop-opacity="0"/></radialGradient>
      <radialGradient id="egl4" cx="35%" cy="28%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity=".6"/><stop offset="100%" stop-color="#fb923c" stop-opacity="0"/></radialGradient>
      <radialGradient id="egl5" cx="35%" cy="28%" r="55%"><stop offset="0%" stop-color="#fff" stop-opacity=".6"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
      <clipPath id="eggClip0"><ellipse cx="0" cy="0" rx="11" ry="13"/></clipPath>
      <clipPath id="eggClip1"><ellipse cx="0" cy="0" rx="11" ry="13"/></clipPath>
      <clipPath id="eggClip2"><ellipse cx="0" cy="0" rx="11" ry="13"/></clipPath>
      <clipPath id="eggClip3"><ellipse cx="0" cy="0" rx="11" ry="13"/></clipPath>
    </defs>

    <!-- ══ BORDA DUPLA PULSANTE ══ -->
    <rect x="3" y="3" width="334" height="294" rx="15"
      fill="none" stroke="#f472b6" stroke-width="2" stroke-dasharray="8 5" stroke-opacity=".6">
      <animate attributeName="stroke-opacity" values=".6;1;.6" dur="2.8s" repeatCount="indefinite"/>
      <animate attributeName="stroke-dashoffset" values="0;26;0" dur="4s" repeatCount="indefinite"/>
    </rect>
    <rect x="6" y="6" width="328" height="288" rx="13"
      fill="none" stroke="#a78bfa" stroke-width="1" stroke-opacity=".35">
      <animate attributeName="stroke-opacity" values=".35;.6;.35" dur="3.5s" begin=".5s" repeatCount="indefinite"/>
    </rect>

    <!-- ══ OVO CANTO TOPO-ESQUERDO (vermelho) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="15,12;15,9;15,12" dur="2.4s" repeatCount="indefinite" additive="replace"/>
      <g transform="rotate(-25)">
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="#f87171"/>
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="url(#egl0)"/>
        <rect x="-11" y="-1.5" width="22" height="3" fill="#fff" opacity=".3" clip-path="url(#eggClip0)"/>
        <rect x="-11" y="3"    width="22" height="2" fill="#fecaca" opacity=".2" clip-path="url(#eggClip0)"/>
        <circle cx="-3" cy="-4" r="2" fill="#fca5a5" opacity=".6"/>
        <circle cx="3"  cy="-4" r="2" fill="#fca5a5" opacity=".6"/>
        <circle cx="0"  cy="4"  r="1.5" fill="#fca5a5" opacity=".5"/>
      </g>
    </g>

    <!-- ══ OVO CANTO TOPO-DIREITO (azul) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="325,12;325,9;325,12" dur="2.8s" begin=".4s" repeatCount="indefinite" additive="replace"/>
      <g transform="rotate(25)">
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="#60a5fa"/>
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="url(#egl1)"/>
        <rect x="-11" y="-1.5" width="22" height="3" fill="#fff" opacity=".3" clip-path="url(#eggClip1)"/>
        <rect x="-11" y="3"    width="22" height="2" fill="#bfdbfe" opacity=".25" clip-path="url(#eggClip1)"/>
        <circle cx="-3" cy="-4" r="2" fill="#93c5fd" opacity=".6"/>
        <circle cx="3"  cy="-4" r="2" fill="#93c5fd" opacity=".6"/>
        <circle cx="0"  cy="4"  r="1.5" fill="#93c5fd" opacity=".5"/>
      </g>
    </g>

    <!-- ══ OVO CANTO BAIXO-ESQUERDO (verde) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="15,288;15,285;15,288" dur="3s" begin=".8s" repeatCount="indefinite" additive="replace"/>
      <g transform="rotate(20)">
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="#86efac"/>
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="url(#egl2)"/>
        <rect x="-11" y="-1.5" width="22" height="3" fill="#fff" opacity=".3" clip-path="url(#eggClip2)"/>
        <rect x="-11" y="3"    width="22" height="2" fill="#d9f99d" opacity=".2" clip-path="url(#eggClip2)"/>
        <circle cx="-3" cy="-4" r="2" fill="#bbf7d0" opacity=".6"/>
        <circle cx="3"  cy="-4" r="2" fill="#bbf7d0" opacity=".6"/>
        <circle cx="0"  cy="4"  r="1.5" fill="#bbf7d0" opacity=".5"/>
      </g>
    </g>

    <!-- ══ OVO CANTO BAIXO-DIREITO (roxo) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="325,288;325,285;325,288" dur="2.6s" begin="1.2s" repeatCount="indefinite" additive="replace"/>
      <g transform="rotate(-20)">
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="#c084fc"/>
        <ellipse cx="0" cy="0" rx="11" ry="13" fill="url(#egl3)"/>
        <rect x="-11" y="-1.5" width="22" height="3" fill="#fff" opacity=".3" clip-path="url(#eggClip3)"/>
        <rect x="-11" y="3"    width="22" height="2" fill="#e9d5ff" opacity=".2" clip-path="url(#eggClip3)"/>
        <circle cx="-3" cy="-4" r="2" fill="#d8b4fe" opacity=".6"/>
        <circle cx="3"  cy="-4" r="2" fill="#d8b4fe" opacity=".6"/>
        <circle cx="0"  cy="4"  r="1.5" fill="#d8b4fe" opacity=".5"/>
      </g>
    </g>

    <!-- ══ FLORES LATERAL ESQUERDA (pétalas reais) ══ -->
    <g transform="translate(8,75)">
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f472b6" opacity=".8" transform="rotate(0)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f472b6" opacity=".8" transform="rotate(60)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f472b6" opacity=".8" transform="rotate(120)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f9a8d4" opacity=".8" transform="rotate(180)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f9a8d4" opacity=".8" transform="rotate(240)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f9a8d4" opacity=".8" transform="rotate(300)"/>
      <circle cx="0" cy="0" r="3.5" fill="#fef08a"/>
      <animateTransform attributeName="transform" type="rotate" values="0 0 0;10 0 0;0 0 0;-10 0 0;0 0 0" dur="4s" repeatCount="indefinite" additive="sum"/>
    </g>
    <g transform="translate(8,150)">
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fbbf24" opacity=".8" transform="rotate(0)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fbbf24" opacity=".8" transform="rotate(60)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fbbf24" opacity=".8" transform="rotate(120)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fde68a" opacity=".8" transform="rotate(180)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fde68a" opacity=".8" transform="rotate(240)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fde68a" opacity=".8" transform="rotate(300)"/>
      <circle cx="0" cy="0" r="3.5" fill="#fff"/>
      <animateTransform attributeName="transform" type="rotate" values="0 0 0;-12 0 0;0 0 0;12 0 0;0 0 0" dur="5s" begin=".6s" repeatCount="indefinite" additive="sum"/>
    </g>
    <g transform="translate(8,225)">
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#34d399" opacity=".8" transform="rotate(0)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#34d399" opacity=".8" transform="rotate(60)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#34d399" opacity=".8" transform="rotate(120)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#6ee7b7" opacity=".8" transform="rotate(180)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#6ee7b7" opacity=".8" transform="rotate(240)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#6ee7b7" opacity=".8" transform="rotate(300)"/>
      <circle cx="0" cy="0" r="3.5" fill="#fef9c3"/>
      <animateTransform attributeName="transform" type="rotate" values="0 0 0;8 0 0;0 0 0;-8 0 0;0 0 0" dur="3.5s" begin="1s" repeatCount="indefinite" additive="sum"/>
    </g>

    <!-- ══ FLORES LATERAL DIREITA ══ -->
    <g transform="translate(332,75)">
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#a78bfa" opacity=".8" transform="rotate(0)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#a78bfa" opacity=".8" transform="rotate(60)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#a78bfa" opacity=".8" transform="rotate(120)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#c4b5fd" opacity=".8" transform="rotate(180)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#c4b5fd" opacity=".8" transform="rotate(240)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#c4b5fd" opacity=".8" transform="rotate(300)"/>
      <circle cx="0" cy="0" r="3.5" fill="#fef08a"/>
      <animateTransform attributeName="transform" type="rotate" values="0 0 0;-10 0 0;0 0 0;10 0 0;0 0 0" dur="4.5s" begin=".3s" repeatCount="indefinite" additive="sum"/>
    </g>
    <g transform="translate(332,150)">
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f87171" opacity=".8" transform="rotate(0)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f87171" opacity=".8" transform="rotate(60)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#f87171" opacity=".8" transform="rotate(120)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fca5a5" opacity=".8" transform="rotate(180)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fca5a5" opacity=".8" transform="rotate(240)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fca5a5" opacity=".8" transform="rotate(300)"/>
      <circle cx="0" cy="0" r="3.5" fill="#fff"/>
      <animateTransform attributeName="transform" type="rotate" values="0 0 0;11 0 0;0 0 0;-11 0 0;0 0 0" dur="3.8s" begin=".9s" repeatCount="indefinite" additive="sum"/>
    </g>
    <g transform="translate(332,225)">
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fb923c" opacity=".8" transform="rotate(0)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fb923c" opacity=".8" transform="rotate(60)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fb923c" opacity=".8" transform="rotate(120)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fdba74" opacity=".8" transform="rotate(180)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fdba74" opacity=".8" transform="rotate(240)"/>
      <ellipse cx="0" cy="-6" rx="4" ry="6" fill="#fdba74" opacity=".8" transform="rotate(300)"/>
      <circle cx="0" cy="0" r="3.5" fill="#fef9c3"/>
      <animateTransform attributeName="transform" type="rotate" values="0 0 0;-9 0 0;0 0 0;9 0 0;0 0 0" dur="4.2s" begin="1.5s" repeatCount="indefinite" additive="sum"/>
    </g>

    <!-- ══ BORBOLETA 1 (rosa) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="85,16;110,11;85,16" dur="7s" repeatCount="indefinite" additive="replace"/>
      <ellipse cx="-11" cy="0" rx="12" ry="8" fill="#f472b6" opacity=".85" transform="rotate(-20 -11 0)">
        <animate attributeName="ry" values="8;3;8" dur="1.6s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="11" cy="0" rx="12" ry="8" fill="#f472b6" opacity=".85" transform="rotate(20 11 0)">
        <animate attributeName="ry" values="8;3;8" dur="1.6s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="-7" cy="5" rx="7" ry="5" fill="#fbbf24" opacity=".65">
        <animate attributeName="ry" values="5;2;5" dur="1.6s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="7" cy="5" rx="7" ry="5" fill="#fbbf24" opacity=".65">
        <animate attributeName="ry" values="5;2;5" dur="1.6s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="0" cy="2" rx="2" ry="7" fill="#1a0a2e" opacity=".8"/>
      <circle cx="-1" cy="-6" r="1.5" fill="#1a0a2e" opacity=".7"/>
      <circle cx="1"  cy="-6" r="1.5" fill="#1a0a2e" opacity=".7"/>
    </g>

    <!-- ══ BORBOLETA 2 (lilás) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="220,13;195,8;220,13" dur="8s" begin="1s" repeatCount="indefinite" additive="replace"/>
      <ellipse cx="-10" cy="0" rx="11" ry="7" fill="#a78bfa" opacity=".85" transform="rotate(-20 -10 0)">
        <animate attributeName="ry" values="7;2.5;7" dur="2s" begin=".5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="10" cy="0" rx="11" ry="7" fill="#a78bfa" opacity=".85" transform="rotate(20 10 0)">
        <animate attributeName="ry" values="7;2.5;7" dur="2s" begin=".5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="-6" cy="4.5" rx="6" ry="4" fill="#c084fc" opacity=".65">
        <animate attributeName="ry" values="4;1.5;4" dur="2s" begin=".5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="6" cy="4.5" rx="6" ry="4" fill="#c084fc" opacity=".65">
        <animate attributeName="ry" values="4;1.5;4" dur="2s" begin=".5s" repeatCount="indefinite"/>
      </ellipse>
      <ellipse cx="0" cy="2" rx="2" ry="6.5" fill="#1a0a2e" opacity=".8"/>
      <circle cx="-1" cy="-5" r="1.5" fill="#1a0a2e" opacity=".7"/>
      <circle cx="1"  cy="-5" r="1.5" fill="#1a0a2e" opacity=".7"/>
    </g>

    <!-- ══ OVOS NO TOPO (centro) ══ -->
    <g>
      <animateTransform attributeName="transform" type="translate" values="162,11;162,8;162,11" dur="3s" begin=".2s" repeatCount="indefinite" additive="replace"/>
      <g transform="rotate(-12)">
        <ellipse cx="0" cy="0" rx="9" ry="11" fill="#fb923c"/>
        <ellipse cx="0" cy="0" rx="9" ry="11" fill="url(#egl4)"/>
        <rect x="-9" y="-2" width="18" height="2.5" fill="#fff" opacity=".3"/>
        <rect x="-9" y="2"  width="18" height="2"   fill="#fed7aa" opacity=".2"/>
        <circle cx="0" cy="-4" r="1.5" fill="#fdba74" opacity=".6"/>
      </g>
    </g>
    <g>
      <animateTransform attributeName="transform" type="translate" values="178,9;178,6;178,9" dur="2.7s" begin=".7s" repeatCount="indefinite" additive="replace"/>
      <g transform="rotate(10)">
        <ellipse cx="0" cy="0" rx="9" ry="11" fill="#34d399"/>
        <ellipse cx="0" cy="0" rx="9" ry="11" fill="url(#egl5)"/>
        <rect x="-9" y="-2" width="18" height="2.5" fill="#fff" opacity=".3"/>
        <rect x="-9" y="2"  width="18" height="2"   fill="#a7f3d0" opacity=".2"/>
        <circle cx="0" cy="-4" r="1.5" fill="#6ee7b7" opacity=".6"/>
      </g>
    </g>

    <!-- ══ SPARKLES ESPALHADOS ══ -->
    <text x="45"  y="22"  font-size="8" opacity=".7" fill="#fbbf24"><animate attributeName="opacity" values=".7;0;.7" dur="2s" begin="0s" repeatCount="indefinite"/>✦</text>
    <text x="285" y="20"  font-size="7" opacity=".6" fill="#f472b6"><animate attributeName="opacity" values=".6;0;.6" dur="2.4s" begin=".5s" repeatCount="indefinite"/>✦</text>
    <text x="20"  y="120" font-size="6" opacity=".5" fill="#a78bfa"><animate attributeName="opacity" values=".5;0;.5" dur="1.8s" begin=".3s" repeatCount="indefinite"/>✧</text>
    <text x="314" y="120" font-size="6" opacity=".5" fill="#34d399"><animate attributeName="opacity" values=".5;0;.5" dur="2.2s" begin=".9s" repeatCount="indefinite"/>✧</text>
    <text x="20"  y="200" font-size="6" opacity=".5" fill="#fbbf24"><animate attributeName="opacity" values=".5;0;.5" dur="2.6s" begin="1.2s" repeatCount="indefinite"/>✦</text>
    <text x="314" y="200" font-size="6" opacity=".5" fill="#f87171"><animate attributeName="opacity" values=".5;0;.5" dur="1.9s" begin=".6s" repeatCount="indefinite"/>✦</text>
    <text x="155" y="296" font-size="9" opacity=".6" fill="#f472b6"><animate attributeName="opacity" values=".6;.2;.6" dur="3s" begin=".4s" repeatCount="indefinite"/>🌸</text>
    <text x="175" y="296" font-size="9" opacity=".6" fill="#fbbf24"><animate attributeName="opacity" values=".6;.2;.6" dur="2.5s" begin="1s" repeatCount="indefinite"/>🌼</text>
  </svg>`;
}

function syncEasterEggs() {
  const container = document.getElementById('easterEggContainer');
  if(!container) return;
  const active = getEquippedItems().some(i => i.id === 'decoracao_pascoa');
  if(!active) { container.innerHTML = ''; return; }
  container.innerHTML = makePascoaBorderSVG();
}
