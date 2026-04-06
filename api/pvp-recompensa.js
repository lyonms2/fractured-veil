// ═══════════════════════════════════════════════════════════════
//  api/pvp-recompensa.js — Vercel Serverless Function
//
//  Credita a recompensa de uma partida PvP de forma segura.
//  Lê o resultado directamente do RTDB (não confia no cliente).
//
//  Body esperado:
//    { idToken: "...", salaId: "...", jogo: "arena"|"batalhaNaval"|"roubaMonte" }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const { getDatabase }                  = require('firebase-admin/database');
const { contribuirFissura }            = require('./_fissura-utils');

// Taxa de casa para cada jogo (espelha as constantes do cliente)
const TAXAS = {
  arena:        0.15,
  batalhaNaval: 0.10,
  roubaMonte:   0.10,
};

// Caminho base no RTDB para cada jogo
const RTDB_PATHS = {
  arena:        'arena/salas',
  batalhaNaval: 'batalhaNaval/salas',
  roubaMonte:   'roubaMonte/salas',
};

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.RTDB_URL,
    });
  }
  return {
    db:   getFirestore(),
    auth: getAuth(),
    rtdb: getDatabase(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { idToken, salaId, jogo } = req.body;

  // ── Validar parâmetros ──
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!salaId || typeof salaId !== 'string' || !/^[\w-]+$/.test(salaId)) {
    return res.status(400).json({ erro: 'salaId inválido' });
  }
  if (!jogo || !RTDB_PATHS[jogo]) {
    return res.status(400).json({ erro: 'jogo inválido' });
  }

  const { db, auth, rtdb } = initAdmin();

  // ── Verificar identidade ──
  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  // walletAddress no jogo == uid do Firebase Auth (definido em auth.js e wallet.js)
  const walletAddress = uid;
  const playerRef     = db.collection('players').doc(uid);

  // ── Ler sala do RTDB ──
  const salaRef  = rtdb.ref(`${RTDB_PATHS[jogo]}/${salaId}`);
  const salaSnap = await salaRef.once('value');
  const sala     = salaSnap.val();

  if (!sala) {
    return res.status(404).json({ erro: 'Sala não encontrada' });
  }
  if (sala.status !== 'finalizada') {
    return res.status(400).json({ erro: 'Partida ainda não terminou' });
  }
  if (sala.vencedor === undefined || sala.vencedor === null) {
    return res.status(400).json({ erro: 'Resultado ainda não disponível' });
  }

  // ── Verificar que o chamador é participante ──
  const isCriador  = sala.criador  === walletAddress;
  const isOponente = sala.oponente === walletAddress;
  if (!isCriador && !isOponente) {
    return res.status(403).json({ erro: 'Não és participante desta partida' });
  }

  // ── Guard atómico: impede dupla reclamação por este wallet ──
  const claimKey = walletAddress.replace(/[.#$[\]]/g, '_');
  const claimRef = salaRef.child(`recompensas/${claimKey}`);
  let claimResult;
  try {
    claimResult = await claimRef.transaction((current) => {
      if (current !== null) {
        // Já reclamou — aborta retornando undefined (transaction não commita)
        return undefined;
      }
      return Date.now();
    });
  } catch (e) {
    console.error('[pvp-recompensa] RTDB transaction error:', e);
    return res.status(500).json({ erro: 'Erro ao registar recompensa' });
  }

  if (!claimResult.committed) {
    return res.status(409).json({ erro: 'Recompensa já reclamada para este jogador' });
  }

  // ── Calcular recompensa ──
  const aposta   = sala.aposta || {};
  const usaCris  = (aposta.cristais || 0) > 0;
  const bruto    = usaCris ? (aposta.cristais * 2) : (aposta.moedas * 2);
  const taxaRate = TAXAS[jogo];
  const taxa     = usaCris ? Math.floor(bruto * taxaRate) : 0; // taxa só em cristais
  const premio   = bruto - taxa;

  const euVenci = sala.vencedor === walletAddress;
  const empate  = sala.vencedor === 'empate';

  // Nada a creditar se perdeu
  if (!euVenci && !empate) {
    const pSnap = await playerRef.get();
    const pData = pSnap.data() || {};
    return res.status(200).json({
      ok: true,
      creditado: 0,
      novoSaldoMoedas:   pData.gs?.moedas   ?? pData.moedas   ?? 0,
      novoSaldoCristais: pData.gs?.cristais  ?? pData.cristais ?? 0,
    });
  }

  const valorCreditar = euVenci ? premio : (usaCris ? aposta.cristais : aposta.moedas);
  const taxaPool      = euVenci ? taxa : 0;

  // ── Creditar em Firestore (transacção atómica) ──
  try {
    const resultado = await db.runTransaction(async (tx) => {
      const snap     = await tx.get(playerRef);
      const data     = snap.data();
      const cristais = data?.gs?.cristais ?? data?.cristais ?? 0;
      const moedas   = data?.gs?.moedas   ?? data?.moedas   ?? 0;

      const novosCristais = usaCris ? cristais + valorCreditar : cristais;
      const novasMoedas   = usaCris ? moedas   : moedas + valorCreditar;

      tx.update(playerRef, {
        'gs.cristais': novosCristais,
        cristais:      novosCristais,
        'gs.moedas':   novasMoedas,
        moedas:        novasMoedas,
      });

      return { novosCristais, novasMoedas };
    });

    // ── Taxa para a pool (só cristais, só vencedor) ──
    if (taxaPool > 0) {
      try {
        const poolRef = db.collection('config').doc('pool');
        const logRef  = poolRef.collection('logs').doc();
        const batch   = db.batch();
        batch.update(poolRef, {
          cristais:    FieldValue.increment(taxaPool),
          totalEntrou: FieldValue.increment(taxaPool),
        });
        batch.set(logRef, {
          tipo:   'entrada',
          motivo: `PvP ${jogo} — taxa de partida`,
          origem: walletAddress,
          total:  taxaPool,
          pool:   taxaPool,
          ts:     FieldValue.serverTimestamp(),
        });
        await batch.commit();
      } catch (poolErr) {
        // Não critica — pool é secundária; recompensa já foi creditada
        console.warn('[pvp-recompensa] pool error:', poolErr);
      }
    }

    // ── Contribuir pontos para a Fissura (fire-and-forget) ──
    try {
      const fissuraAtvd = euVenci
        ? (sala.fila === 'Lendário' ? 'pvp_vitoria_lend' : sala.fila === 'Raro' ? 'pvp_vitoria_raro' : 'pvp_vitoria_comum')
        : empate ? 'pvp_empate' : 'pvp_derrota';
      await contribuirFissura(db, uid, fissuraAtvd);
    } catch (fe) {
      console.warn('[pvp-recompensa] fissura erro:', fe.message);
    }

    return res.status(200).json({
      ok:               true,
      creditado:        valorCreditar,
      novoSaldoCristais: resultado.novosCristais,
      novoSaldoMoedas:   resultado.novasMoedas,
    });

  } catch (err) {
    // Se a transacção Firestore falhou, reverter o claim no RTDB para permitir retry
    try { await salaRef.child(`recompensas/${claimKey}`).remove(); } catch (_) {}
    console.error('[pvp-recompensa] Firestore error:', err);
    return res.status(500).json({ erro: 'Erro ao creditar recompensa. Tenta novamente.' });
  }
};
