// ═══════════════════════════════════════════════════════════════
//  _fissura-utils.js — Helper partilhado
//  Chamado internamente por pvp-recompensa, cambiar, etc.
// ═══════════════════════════════════════════════════════════════

const { FieldValue } = require('firebase-admin/firestore');

const PONTOS = {
  login_diario:       5,
  pve_completo:       8,
  pve_vitoria:       15,
  cambio:            10,
  pvp_derrota:        5,
  pvp_empate:        10,
  pvp_vitoria_comum: 20,
  pvp_vitoria_raro:  35,
  pvp_vitoria_lend:  50,
};

function getMesAtual() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Adiciona pontos de fissura ao jogador e à facção.
 * Silencia erros — nunca deve bloquear o fluxo principal.
 */
async function contribuirFissura(db, uid, atividade) {
  const pontos = PONTOS[atividade];
  if (!pontos) return;

  const mes       = getMesAtual();
  const playerRef = db.collection('players').doc(uid);

  const snap = await playerRef.get();
  if (!snap.exists) return;

  const data = snap.data();
  if (data.fissuraMes !== mes || !data.faccao) return;

  const faccao     = data.faccao;
  const fissuraRef = db.collection('fissura').doc(mes);

  const batch = db.batch();
  batch.update(playerRef, {
    fissuraPontos: FieldValue.increment(pontos),
  });
  batch.set(fissuraRef, {
    [faccao]: { pontosTotal: FieldValue.increment(pontos) },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await batch.commit();
}

module.exports = { contribuirFissura, PONTOS };
