// DISCORD — Card de avatar + Audit log
// ═══════════════════════════════════════════════════════════════════

const _DW_SHARE = 'https://discord.com/api/webhooks/1498526206650486835/2bAZaPB41KyojNWEiqUEc1mIRPY45xEve4I9-Z2Failfys5_9wbGsZgyP6MeAbwRAmSk';
const _DW_AUDIT = 'https://discord.com/api/webhooks/1498526631529287762/6VXpQzefSApqrrI0Qv4bS9vvWzPQ5ChfOjTQKOYfdU_dat5CPzv91tsE62VTO_4DIVjQ';

const _RARITY_HEX = { 'Comum': '#9ca3af', 'Raro': '#818cf8', 'Lendário': '#f59e0b' };

// ── Compartilhar card do avatar ─────────────────────────────────────
async function shareAvatarCard() {
  if (!avatar || !hatched || dead) return;

  const _cooldownKey = 'fv_last_share';
  const _last = parseInt(localStorage.getItem(_cooldownKey) || '0');
  if (Date.now() - _last < 3600000) {
    showBubble('Partilhaste recentemente! Tenta daqui a 1 hora. 🕐');
    return;
  }

  const W = 480, H = 660;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0f0c1e');
  bg.addColorStop(1, '#04030a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 2;
  _roundRect(ctx, 14, 14, W - 28, H - 28, 10);
  ctx.stroke();

  // Inner border
  ctx.strokeStyle = 'rgba(201,168,76,0.25)';
  ctx.lineWidth = 1;
  _roundRect(ctx, 20, 20, W - 40, H - 40, 8);
  ctx.stroke();

  // Title
  await document.fonts.ready;
  ctx.fillStyle = '#c9a84c';
  ctx.font = 'bold 12px Cinzel, serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '4px';
  ctx.fillText('✦  FRACTURED VEIL  ✦', W / 2, 52);

  ctx.strokeStyle = 'rgba(201,168,76,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(50, 62); ctx.lineTo(W - 50, 62); ctx.stroke();

  // Avatar SVG
  const svgStr = gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 200, 200, getFase());
  await _svgToCanvas(ctx, svgStr, 140, 70, 200, 200);

  // Rarity strip
  const rarCol = _RARITY_HEX[avatar.raridade] || '#9ca3af';
  ctx.fillStyle = rarCol + '66';
  ctx.fillRect(50, 288, W - 100, 3);

  // Name
  const _nome = avatar.nome ? avatar.nome.split(',')[0] : 'Avatar';
  ctx.fillStyle = '#f9fafb';
  ctx.font = 'bold 24px Cinzel, serif';
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'center';
  ctx.fillText(_nome.toUpperCase(), W / 2, 334);

  // Rarity · Element
  ctx.fillStyle = rarCol;
  ctx.font = '12px Cinzel, serif';
  ctx.letterSpacing = '2px';
  ctx.fillText(`◆ ${(avatar.raridade || '').toUpperCase()}  ·  ${(avatar.elemento || '').toUpperCase()}`, W / 2, 360);

  // Level · Phase
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px sans-serif';
  ctx.letterSpacing = '0px';
  ctx.fillText(`Nível ${nivel}  ·  Fase ${FASES[getFase()]}`, W / 2, 384);

  // Stats divider
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(60, 404); ctx.lineTo(W - 60, 404); ctx.stroke();

  // Stats rows
  const _h = Math.floor(totalSecs / 3600);
  const _m = Math.floor((totalSecs % 3600) / 60);
  const _tempo = (_h > 0 ? `${_h}h ` : '') + `${_m}min`;
  const _stats = [
    ['🔗  Vínculo', Math.floor(vinculo)],
    ['⏱  Tempo vivo', _tempo],
    ['🥚  Ovos', eggsInInventory.length],
  ];
  ctx.font = '13px sans-serif';
  _stats.forEach(([label, val], i) => {
    const y = 436 + i * 30;
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'left';
    ctx.fillText(label, 72, y);
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'right';
    ctx.fillText(String(val), W - 72, y);
  });

  // Footer
  ctx.strokeStyle = 'rgba(201,168,76,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(50, 545); ctx.lineTo(W - 50, 545); ctx.stroke();
  ctx.fillStyle = '#374151';
  ctx.font = '10px sans-serif';
  ctx.letterSpacing = '1px';
  ctx.textAlign = 'center';
  ctx.fillText(window.location.hostname, W / 2, 572);

  canvas.toBlob(async blob => {
    const form = new FormData();
    form.append('file', blob, 'avatar-card.png');
    form.append('payload_json', JSON.stringify({
      content: `**${_nome}** surge das dimensões! 🌑\n*${avatar.raridade} · ${avatar.elemento} · Nível ${nivel}*`,
      username: 'Fractured Veil',
    }));
    try {
      const r = await fetch(_DW_SHARE, { method: 'POST', body: form });
      if (r.ok) {
        localStorage.setItem(_cooldownKey, Date.now().toString());
        showBubble('Card partilhado no Discord! 🎉');
        addLog('Avatar partilhado na comunidade Discord!', 'good');
      } else {
        showBubble('Erro ao partilhar. Tenta novamente.');
      }
    } catch (e) {
      showBubble('Sem ligação para partilhar.');
    }
  }, 'image/png');
}

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function _svgToCanvas(ctx, svgStr, x, y, w, h) {
  return new Promise(resolve => {
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload  = () => { ctx.drawImage(img, x, y, w, h); URL.revokeObjectURL(url); resolve(); };
    img.onerror = resolve;
    img.src = url;
  });
}

// ── Audit log — canal privado de staff ─────────────────────────────
function discordAudit(title, fields, color = 0x7c3aed) {
  fetch(_DW_AUDIT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'FV Audit',
      embeds: [{
        title,
        color,
        fields: fields.map(([name, value]) => ({ name, value: String(value), inline: true })),
        footer: { text: `UID: ${walletAddress || '?'}` },
        timestamp: new Date().toISOString(),
      }],
    }),
  }).catch(() => {});
}
