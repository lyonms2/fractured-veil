// ═══════════════════════════════════════════════════════════════
//  api/_discord.js — Utilitário compartilhado (não é um endpoint)
//
//  Publica premiações no canal público do Discord.
//  URL do webhook lida de process.env.DISCORD_AWARDS_WEBHOOK —
//  nunca hardcodada para não expor o segredo no repositório.
// ═══════════════════════════════════════════════════════════════

// Busca o nome do avatar ativo do jogador para exibição pública.
// Faz fallback para UID mascarado se não encontrar.
async function getPlayerName(db, uid) {
  try {
    const snap = await db.collection('players').doc(uid).get();
    if (!snap.exists) return `\`${uid.slice(0, 5)}…${uid.slice(-4)}\``;
    const d       = snap.data();
    const slotIdx = d.gs?.activeSlotIdx ?? d.activeSlotIdx ?? 0;
    const slot    = (d.avatarSlots || [])[slotIdx];
    const nome    = slot?.nome?.split(',')[0];
    return nome || `\`${uid.slice(0, 5)}…${uid.slice(-4)}\``;
  } catch {
    return `\`${uid.slice(0, 5)}…${uid.slice(-4)}\``;
  }
}

// Envia um embed para o canal público de premiações.
// Fire-and-forget — nunca lança exceção para o chamador.
async function sendAwardsWebhook(embed) {
  const url = process.env.DISCORD_AWARDS_WEBHOOK;
  if (!url) return;
  try {
    await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'Fractured Veil',
        embeds: [{
          ...embed,
          timestamp: new Date().toISOString(),
          footer: { text: 'Fractured Veil · Recompensas' },
        }],
      }),
    });
  } catch (e) {}
}

module.exports = { sendAwardsWebhook, getPlayerName };
