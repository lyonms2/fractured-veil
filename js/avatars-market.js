// ═══════════════════════════════════════════════════════════════════
// AVATARES — Marketplace e gestão de slots
// Depende de: db (global), walletAddress (global), playerData (global),
//             addToPool() (pool.js),
//             updateCristaisDisplay() (marketplace.html inline),
//             updateSlots() (marketplace.html inline),
//             showToast() (marketplace.html inline),
//             gerarSVG() (data.js), CARACTERISTICAS_ELEMENTAIS (data.js),
//             LIST_COST, UNLOCK_SLOT_COST, TAXA_MARKETPLACE (marketplace.html inline)
// ═══════════════════════════════════════════════════════════════════

const BASE_SLOTS = 3;
const MAX_SLOTS  = 5;

// ═══════════════════════════════════════════
// HELPERS DE FASE
// ═══════════════════════════════════════════
function _faseNum(nivel) {
  const n = nivel || 1;
  return n < 5 ? 0 : n < 10 ? 1 : n < 17 ? 2 : 3;
}

function getFaseNome(nivel) {
  const n = nivel || 1;
  if(n < 5)  return 'BEBÊ';
  if(n < 10) return 'CRIANÇA';
  if(n < 17) return 'JOVEM';
  return 'ADULTO';
}

function getFaseCor(nivel) {
  const n = nivel || 1;
  if(n < 5)  return '#a78bfa';
  if(n < 10) return '#60d4f0';
  if(n < 17) return '#4ade80';
  return '#f0b840';
}

// ═══════════════════════════════════════════
// EXPLORAR — listagens do marketplace
// ═══════════════════════════════════════════
function loadListings() {
  if(listingUnsub) listingUnsub();
  listingUnsub = db.collection('avatarMarket')
    .where('status','==','listed')
    .onSnapshot(snap => {
      listings = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      if(currentSection === 'browse') renderBrowse();
    });
}

function applyFilters() {
  renderBrowse();
}

function renderBrowse() {
  // Limpar SVGs anteriores para evitar colisão de filter IDs
  const _bg = document.getElementById('browseGrid');
  if(_bg) _bg.querySelectorAll('svg').forEach(s => { s.innerHTML=''; s.remove(); });
  const grid  = document.getElementById('browseGrid');
  const search= (document.getElementById('filterSearch')?.value||'').toLowerCase();
  const rar   = document.getElementById('filterRarity')?.value||'';
  const elem  = document.getElementById('filterElem')?.value||'';
  const sort  = document.getElementById('filterSort')?.value||'recent';

  let filtered = listings.filter(l => {
    if(rar  && l.raridade  !== rar)  return false;
    if(elem && l.elemento  !== elem) return false;
    if(search && !l.nome?.toLowerCase().includes(search) && !l.elemento?.toLowerCase().includes(search)) return false;
    return true;
  });

  if(sort === 'price_asc')  filtered.sort((a,b) => a.price - b.price);
  if(sort === 'price_desc') filtered.sort((a,b) => b.price - a.price);
  if(sort === 'level')      filtered.sort((a,b) => (b.nivel||1) - (a.nivel||1));
  if(sort === 'recent')     filtered.sort((a,b) => (b.listedAt?.seconds||0) - (a.listedAt?.seconds||0));

  if(filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🌌</div><div class="empty-txt">Nenhum avatar encontrado.<br>Ajusta os filtros ou volta mais tarde.</div></div>`;
    return;
  }

  grid.innerHTML = filtered.map(l => buildListingCard(l)).join('');
}

function buildListingCard(l) {
  const isMine = l.sellerId === walletAddress;
  const svgHtml = gerarSVG(l.elemento, l.raridade, l.seed||0, 72, 72, _faseNum(l.nivel));
  const sellerShort = l.sellerId ? l.sellerId.slice(0,6)+'...'+l.sellerId.slice(-4) : '—';
  const parts   = (l.nome||'Avatar').split(',');
  const nomeProp = parts[0].trim();
  const sufixo   = parts.slice(1).join(',').trim();
  const elemCar  = CARACTERISTICAS_ELEMENTAIS[l.elemento];
  const elemEmoji= elemCar ? elemCar.emoji : '✦';
  return `<div class="av-card" onclick="openDetail('${l.id}')">
    <div class="av-card-stripe ${l.raridade}"></div>
    <div class="av-card-inner">
      <div class="av-svg-wrap">
        <div class="av-zoom-wrap">
          ${svgHtml}
          <button class="mkt-avatar-zoom-btn" title="Ampliar"
            data-el="${l.elemento}" data-rar="${l.raridade}" data-seed="${l.seed||0}"
            data-nivel="${l.nivel||1}" data-nome="${(l.nome||'Avatar').replace(/"/g,'&quot;')}"
            onclick="event.stopPropagation();mktOpenZoomBtn(this)">🔍</button>
        </div>
      </div>
      <div class="av-name">${esc(nomeProp)}</div>
      ${sufixo ? `<div class="av-sufixo">${esc(sufixo)}</div>` : '<div class="av-sufixo" style="margin-bottom:6px;"></div>'}
      <div class="av-pill ${l.raridade}">${elemEmoji} ${esc(l.elemento)} · ${esc(l.raridade)}</div>
      <div class="av-stats">
        <div class="av-stat"><b>${l.nivel||1}</b>Nível</div>
        <div class="av-stat"><b>${Math.floor(l.vinculo||0)}</b>Vínculo</div>
        <div class="av-stat"><b style="color:${getFaseCor(l.nivel||1)}">${getFaseNome(l.nivel||1)}</b>Fase</div>
        <div class="av-stat"><b>${l.totalOvos||0}</b>Ovos</div>
      </div>
      <div class="av-price">💎 ${l.price}</div>
      <div class="av-seller">${isMine ? '⭐ O teu avatar' : `Por ${sellerShort}`}</div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════
// DETALHE DO AVATAR
// ═══════════════════════════════════════════
async function openDetail(listingId) {
  const l = listings.find(x => x.id === listingId);
  if(!l) return;
  const isMine   = l.sellerId === walletAddress;
  const canBuy   = !isMine && (playerData?.cristais||0) >= l.price;
  const rarCol   = { Comum:'var(--common)', Raro:'var(--rare)', 'Lendário':'var(--legendary)' }[l.raridade] || 'var(--text)';
  const svgHtml  = gerarSVG(l.elemento, l.raridade, l.seed||0, 90, 90, _faseNum(l.nivel));
  const bonusText= CARACTERISTICAS_ELEMENTAIS[l.elemento]?.bonus || '';
  const box = document.getElementById('avatarDetailBox');
  box.innerHTML = `
    <div class="detail-header">
      <div class="detail-svg">${svgHtml}</div>
      <div class="detail-info">
        <div class="detail-name">${esc(l.nome||'Avatar')}</div>
        <div class="detail-rarity ${l.raridade}">${esc(l.raridade)} · ${esc(l.elemento)}</div>
        <div style="font-size:9px;color:var(--text2);">${esc(l.descricao||'')}</div>
      </div>
    </div>
    <div class="detail-stats-grid">
      <div class="detail-stat">Nível <b>${l.nivel||1}</b></div>
      <div class="detail-stat">XP <b>${Math.floor(l.xp||0)}</b></div>
      <div class="detail-stat">Vínculo <b>${Math.floor(l.vinculo||0)}</b></div>
      <div class="detail-stat">Fase <b style="color:${getFaseCor(l.nivel||1)}">${getFaseNome(l.nivel||1)}</b></div>
      <div class="detail-stat">Ovos botados <b>${l.totalOvos||0}</b></div>
      <div class="detail-stat">Raros/Lendários <b>${l.totalRaros||0}</b></div>
    </div>
    ${bonusText ? `<div class="detail-bonus">✨ ${bonusText}</div>` : ''}
    <div class="detail-price-row">
      <div class="detail-price">💎 ${l.price}</div>
      ${isMine
        ? `<button class="btn-buy-avatar" style="background:var(--red)" onclick="unlistAvatar('${l.id}')">Retirar listagem</button>`
        : `<button class="btn-buy-avatar" ${canBuy?'':'disabled'} onclick="buyAvatar('${l.id}',${l.price})">${canBuy?'Comprar':'Cristais insuficientes'}</button>`
      }
    </div>
    <div style="text-align:right;"><button class="btn-modal-cancel" onclick="closeDetail()">Fechar</button></div>
  `;
  document.getElementById('avatarDetailOverlay').classList.add('open');
}

function closeDetail() {
  document.getElementById('avatarDetailOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════
// COMPRAR AVATAR
// ═══════════════════════════════════════════
async function buyAvatar(listingId, price) {
  if(!playerData || playerData.cristais < price) { showToast('Cristais insuficientes.','err'); return; }
  const freeIdx = playerData.avatarSlots.findIndex((s,i) => !s && i < getUnlockedSlots());
  if(freeIdx === -1) { showToast('Sem slots disponíveis. Desbloqueia mais slots.','err'); return; }

  try {
    const idToken = await firebase.auth().currentUser.getIdToken();
    const resp    = await fetch('/api/comprar-avatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ listingId, idToken }),
    });
    const data = await resp.json();
    if(!resp.ok) { showToast(data.erro || 'Erro ao comprar avatar.', 'err'); return; }

    playerData.avatarSlots = data.slots;
    playerData.cristais    = data.novoSaldo;
    if(!playerData.gs) playerData.gs = {};
    playerData.gs.cristais = data.novoSaldo;
    updateCristaisDisplay();

    const taxa = Math.round(price * TAXA_MARKETPLACE);
    closeDetail();
    showToast(`✅ ${data.nome} adquirido! (taxa ${taxa}💎 → pool)`, 'ok');
    showSection('slots');
  } catch(e) {
    console.error(e);
    showToast('Erro ao comprar avatar.', 'err');
  }
}

// ═══════════════════════════════════════════
// LISTAR AVATAR À VENDA
// ═══════════════════════════════════════════
function openListModal(slotIdx) {
  listingSlotIdx = slotIdx;
  const s = playerData.avatarSlots[slotIdx];
  document.getElementById('listAvatarPreview').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;background:var(--surface2);padding:10px;border-radius:8px;">
      ${gerarSVG(s.elemento,s.raridade,s.seed||0,50,50,_faseNum(s.nivel))}
      <div>
        <div style="font-family:'Cinzel',serif;font-size:11px;">${s.nome}</div>
        <div style="font-size:9px;color:var(--${s.raridade==='Lendário'?'legendary':'rare'});">${s.raridade} · ${s.elemento} · Nv.${s.nivel||1}</div>
      </div>
    </div>`;
  document.getElementById('listPriceInput').value = '';
  document.getElementById('listOverlay').classList.add('open');
}

function closeListModal() {
  document.getElementById('listOverlay').classList.remove('open');
  listingSlotIdx = null;
}

async function confirmList() {
  const price = parseInt(document.getElementById('listPriceInput').value);
  if(!price || price < 1) { showToast('Preço inválido.','err'); return; }
  if(playerData.cristais < LIST_COST) { showToast(`Precisas de ${LIST_COST} 💎 para listar.`,'err'); return; }
  if(listingSlotIdx === null) return;

  try {
    // Read fresh data to avoid stale cristais or slots
    const freshSnap = await db.collection('players').doc(walletAddress).get();
    const freshData = freshSnap.data() || {};
    const freshCristais = freshData.gs?.cristais ?? freshData.cristais ?? 0;
    if(freshCristais < LIST_COST) { showToast(`Precisas de ${LIST_COST} 💎 para listar.`,'err'); return; }

    const freshSlots = freshData.avatarSlots || playerData.avatarSlots;
    const s = freshSlots[listingSlotIdx];
    if(!s) { showToast('Slot inválido.','err'); return; }

    const newCristais = freshCristais - LIST_COST;
    freshSlots[listingSlotIdx].listed = true;

    // Batch atómico — debita cristais, marca slot e cria listagem em simultâneo
    const diasVida   = s.bornAt ? Math.floor((Date.now()-s.bornAt)/86400000) : 0;
    const listingRef = db.collection('avatarMarket').doc();
    const listBatch  = db.batch();
    listBatch.update(db.collection('players').doc(walletAddress), {
      avatarSlots:   freshSlots,
      cristais:      newCristais,
      'gs.cristais': newCristais,
    });
    listBatch.set(listingRef, {
      sellerId:   walletAddress,
      slotIdx:    listingSlotIdx,
      nome:       s.nome,
      elemento:   s.elemento,
      raridade:   s.raridade,
      descricao:  s.descricao||'',
      seed:       s.seed||0,
      nivel:      s.nivel||1,
      xp:         s.xp||0,
      vinculo:    s.vinculo||0,
      diasVida,
      totalOvos:  s.totalOvos||0,
      totalRaros: s.totalRaros||0,
      bornAt:     s.bornAt||Date.now(),
      price,
      status:     'listed',
      listedAt:   firebase.firestore.FieldValue.serverTimestamp(),
    });
    await listBatch.commit();

    playerData.avatarSlots = freshSlots;
    playerData.cristais    = newCristais;
    if(!playerData.gs) playerData.gs = {};
    playerData.gs.cristais = newCristais;
    updateCristaisDisplay();

    // Taxa de listagem vai para a pool
    await addToPool(LIST_COST, 'listagem avatar');

    closeListModal();
    showToast(`✅ Avatar listado por ${price} 💎!`, 'ok');
    showSection('slots');
  } catch(e) {
    console.error(e);
    showToast('Erro ao listar.','err');
  }
}

async function unlistFromSlot(slotIdx) {
  // Procura a listagem activa deste slot para este vendedor
  try {
    const snap = await db.collection('avatarMarket')
      .where('sellerId','==',walletAddress)
      .where('slotIdx','==',slotIdx)
      .where('status','==','listed')
      .limit(1).get();
    if(snap.empty) { showToast('Listagem não encontrada.','err'); return; }
    await unlistAvatar(snap.docs[0].id);
  } catch(e) {
    showToast('Erro ao retirar listagem.','err');
  }
}

async function unlistAvatar(listingId) {
  try {
    const snap = await db.collection('avatarMarket').doc(listingId).get();
    if(!snap.exists) return;
    const l = snap.data();
    if(l.sellerId !== walletAddress) return;

    // Batch atómico — des-lista slot e apaga listagem em simultâneo
    const slotIdx    = l.slotIdx;
    const freshSnap2 = await db.collection('players').doc(walletAddress).get();
    const freshSlots2 = (freshSnap2.data()?.avatarSlots || playerData.avatarSlots).map(s => s || null);
    if(slotIdx !== undefined && freshSlots2[slotIdx]) freshSlots2[slotIdx].listed = false;
    const unlistBatch2 = db.batch();
    unlistBatch2.update(db.collection('players').doc(walletAddress), { avatarSlots: freshSlots2 });
    unlistBatch2.delete(db.collection('avatarMarket').doc(listingId));
    await unlistBatch2.commit();
    playerData.avatarSlots = freshSlots2;

    closeDetail();
    showToast('Listagem cancelada. Avatar desbloqueado.', 'ok');
  } catch(e) {
    showToast('Erro ao retirar listagem.','err');
  }
}

// ═══════════════════════════════════════════
// MEUS AVATARES / SLOTS
// ═══════════════════════════════════════════
function renderSlots() {
  // Limpar SVGs anteriores para evitar colisão de filter IDs
  const _sg = document.getElementById('slotsGrid');
  if(_sg) _sg.querySelectorAll('svg').forEach(s => { s.innerHTML=''; s.remove(); });
  const grid = document.getElementById('slotsGrid');
  const unlockRow = document.getElementById('unlockSlotRow');
  if(!playerData) return;

  const unlocked = getUnlockedSlots();
  const slots = playerData.avatarSlots;
  let html = '';

  for(let i=0;i<unlocked;i++) {
    const s = slots[i];
    const isActive = i === playerData.activeSlotIdx;
    if(!s || s.pendingEgg) {
      const isPending = s && s.pendingEgg;
      html += `<div class="slot-card" style="border-style:${isPending?'solid':'dashed'};border-color:${isPending?'var(--border2)':'var(--border)'};">
        <div class="slot-stripe" style="background:${isPending?'var(--gold)':'transparent'};"></div>
        <div class="slot-header">
          <div class="slot-label">Slot ${i+1}</div>
          ${isPending ? '<div class="slot-badge" style="background:rgba(201,168,76,.12);color:var(--gold);border:1px solid rgba(201,168,76,.3);">A chocar</div>' : ''}
        </div>
        <div class="slot-empty-wrap">
          <div class="slot-empty-icon">${isPending ? '🥚' : '🌀'}</div>
          <div class="slot-empty-title">${isPending ? 'A chocar…' : 'Vazio'}</div>
          <div class="slot-empty-txt">${isPending ? 'Volta ao jogo<br>para completar' : 'Choca um ovo<br>no jogo'}</div>
        </div>
      </div>`;
    } else {
      const isFrozen = !!s.listed;
      const _ps = (s.nome||'Avatar').split(',');
      const _ns = _ps[0].trim(), _ss = _ps.slice(1).join(',').trim();
      const _ecs = CARACTERISTICAS_ELEMENTAIS[s.elemento];
      html += `<div class="slot-card ${isActive?'slot-active':''} ${isFrozen?'slot-frozen':''}">
        <div class="slot-stripe ${s.raridade}"></div>
        <div class="slot-header">
          <div class="slot-label">Slot ${i+1}</div>
          ${isActive ? '<div class="slot-badge active">Activo</div>' : ''}
          ${isFrozen ? '<div class="slot-badge frozen">À venda</div>' : ''}
        </div>
        <div class="slot-svg-wrap">
          <div class="av-zoom-wrap">
            ${gerarSVG(s.elemento,s.raridade,s.seed||0,96,96,_faseNum(s.nivel))}
            <button class="mkt-avatar-zoom-btn" title="Ampliar"
              data-el="${s.elemento}" data-rar="${s.raridade}" data-seed="${s.seed||0}"
              data-nivel="${s.nivel||1}" data-nome="${(s.nome||'Avatar').replace(/"/g,'&quot;')}"
              onclick="mktOpenZoomBtn(this)">🔍</button>
          </div>
        </div>
        <div class="slot-body">
          <div class="slot-av-name">${_ns}</div>
          <div class="slot-av-sub">${_ss}</div>
          <div class="slot-av-pill ${s.raridade}">${_ecs?_ecs.emoji:'✦'} ${s.elemento} · ${s.raridade}</div>
          <div class="slot-stats">
            <div class="slot-stat"><b>${s.nivel||1}</b><span>Nível</span></div>
            <div class="slot-stat"><b>${Math.floor(s.vinculo||0)}</b><span>Vínculo</span></div>
            <div class="slot-stat"><b style="color:${getFaseCor(s.nivel||1)};font-size:8px;letter-spacing:.5px;">${getFaseNome(s.nivel||1)}</b><span>Fase</span></div>
          </div>
          ${!isActive && !isFrozen ? `
          <div class="slot-actions">
            <button class="btn-slot-activate" onclick="activateSlot(${i})">⚡ Activar</button>
            ${(s.raridade === 'Raro' || s.raridade === 'Lendário') ? `<button class="btn-slot-list" onclick="openListModal(${i})">✦ Listar à Venda</button>` : ''}
            <button class="btn-slot-burn" onclick="burnAvatar(${i})">🔥 Queimar</button>
          </div>` : ''}
          ${isFrozen ? `
          <div class="slot-actions">
            <div style="font-size:8px;color:var(--gold);text-align:center;letter-spacing:.5px;padding:4px 0;">❄️ Listado à venda</div>
            <button class="btn-slot-burn" style="border-color:rgba(201,168,76,.3);color:var(--gold2);" onclick="unlistFromSlot(${i})">✕ Retirar listagem</button>
          </div>` : ''}
        </div>
      </div>`;
    }
  }

  // Locked slots
  for(let i=unlocked;i<MAX_SLOTS;i++) {
    html += `<div class="slot-card slot-locked">
      <div class="slot-stripe" style="background:transparent;"></div>
      <div class="slot-header">
        <div class="slot-label">Slot ${i+1}</div>
      </div>
      <div class="slot-empty-wrap">
        <div class="slot-locked-icon">🔒</div>
        <div class="slot-empty-title">Bloqueado</div>
        <div class="slot-locked-cost">${UNLOCK_SLOT_COST} 💎 para desbloquear</div>
      </div>
    </div>`;
  }

  grid.innerHTML = html;

  // Unlock button
  if(unlocked < MAX_SLOTS) {
    unlockRow.innerHTML = `<button class="btn-unlock-slot" onclick="unlockSlot()">
      🔓 Desbloquear Slot ${unlocked+1} — ${UNLOCK_SLOT_COST} 💎
    </button>`;
  } else {
    unlockRow.innerHTML = `<div style="font-size:9px;color:var(--muted);text-align:center;padding:10px;">Slots máximos desbloqueados (${MAX_SLOTS})</div>`;
  }
}

async function activateSlot(idx) {
  await db.collection('players').doc(walletAddress).update({
    activeSlotIdx: idx,
    'gs.activeSlotIdx': idx
  });
  playerData.activeSlotIdx = idx;
  if(!playerData.gs) playerData.gs = {};
  playerData.gs.activeSlotIdx = idx;
  showToast('✅ Slot activo alterado! Volta ao jogo para jogar com este avatar.', 'ok');
  renderSlots();
}

// ═══════════════════════════════════════════
// QUEIMAR AVATAR
// ═══════════════════════════════════════════
let _burnPendingIdx = null;

function burnAvatar(idx) {
  const s = playerData.avatarSlots?.[idx];
  if(!s || !s.nome) return;
  _burnPendingIdx = idx;

  const _ps = (s.nome||'Avatar').split(',');
  const _ns = _ps[0].trim(), _ss = _ps.slice(1).join(',').trim();
  const _ecs = CARACTERISTICAS_ELEMENTAIS[s.elemento];
  const RAR_COLOR = {'Comum':'#7ab87a','Raro':'#5ab4e8','Lendário':'#e8a030'};
  document.getElementById('burnAvatarPreview').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      ${gerarSVG(s.elemento, s.raridade, s.seed||0, 60, 60, _faseNum(s.nivel))}
      <div style="font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:${RAR_COLOR[s.raridade]||'#ccc'}">${esc(_ns)}</div>
      ${_ss ? `<div style="font-size:9px;color:var(--text2);font-style:italic;">${esc(_ss)}</div>` : ''}
      <div style="font-size:9px;color:var(--muted);">${_ecs?_ecs.emoji:'✦'} ${esc(s.elemento)} · ${esc(s.raridade)} · Nível ${s.nivel||1}</div>
    </div>`;

  document.getElementById('burnOverlay').classList.add('open');
}

function closeBurnModal() {
  _burnPendingIdx = null;
  document.getElementById('burnOverlay').classList.remove('open');
}

async function confirmBurnAvatar() {
  const idx = _burnPendingIdx;
  _burnPendingIdx = null;
  document.getElementById('burnOverlay').classList.remove('open');
  if(idx === null || idx === playerData.activeSlotIdx) return;

  const name = playerData.avatarSlots[idx]?.nome?.split(',')[0] || 'Avatar';

  await updateSlots(slots => { slots[idx] = null; });
  showToast(`🔥 ${name} foi queimado. Slot ${idx+1} libertado.`, 'ok');
  renderSlots();
}

// ═══════════════════════════════════════════
// DESBLOQUEAR SLOT
// ═══════════════════════════════════════════
async function unlockSlot() {
  // Re-read cristais from Firebase to avoid stale data
  const snap = await db.collection('players').doc(walletAddress).get();
  const freshCristais = snap.data()?.gs?.cristais ?? snap.data()?.cristais ?? 0;
  if(freshCristais < UNLOCK_SLOT_COST) { showToast(`Precisas de ${UNLOCK_SLOT_COST} 💎.`,'err'); return; }
  const unlocked = getUnlockedSlots();
  if(unlocked >= MAX_SLOTS) { showToast('Já tens o máximo de slots.','err'); return; }

  const newCristais   = freshCristais - UNLOCK_SLOT_COST;
  const newExtraSlots = (playerData.extraSlots||0) + 1;

  await db.collection('players').doc(walletAddress).update({
    cristais:         newCristais,
    'gs.cristais':    newCristais,
    extraSlots:       newExtraSlots,
    'gs.extraSlots':  newExtraSlots,
  });

  playerData.cristais   = newCristais;
  playerData.extraSlots = newExtraSlots;
  if(!playerData.gs) playerData.gs = {};
  playerData.gs.cristais   = newCristais;
  playerData.gs.extraSlots = newExtraSlots;
  while(playerData.avatarSlots.length < getUnlockedSlots()) playerData.avatarSlots.push(null);

  updateCristaisDisplay();
  showToast(`✅ Slot ${getUnlockedSlots()} desbloqueado!`, 'ok');
  renderSlots();
}
