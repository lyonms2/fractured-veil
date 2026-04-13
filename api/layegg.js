// ═══════════════════════════════════════════════════════════════
//  api/layegg.js — Vercel Serverless Function
//
//  POST { idToken }
//    → Valida cooldown server-side, desconta moedas, gera ovo(s)
//      e persiste eggLayReadyAt atomicamente no Firestore.
//    → Retorna { ok, eggs, novasMoedas, eggLayReadyAt }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const EGG_COST       = 50;
const COOLDOWN_BASE  = 24 * 60 * 60 * 1000; // 24h em ms
const MAX_EGGS       = 10;

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return { db: getFirestore(), auth: getAuth() };
}

function calcRarity(raridade, nivel, vinculo) {
  let chances;
  if (raridade === 'Comum') {
    if (nivel < 25)      chances = [97,   3,   0  ];
    else if (nivel < 35) chances = [94,   5.5, 0.5];
    else                 chances = [90,   8,   2  ];
  } else if (raridade === 'Raro') {
    if (nivel < 25)      chances = [55,  40,   5  ];
    else if (nivel < 35) chances = [40,  50,  10  ];
    else                 chances = [25,  55,  20  ];
  } else {
    if (nivel < 25)      chances = [20,  55,  25  ];
    else if (nivel < 35) chances = [10,  50,  40  ];
    else                 chances = [5,   40,  55  ];
  }
  // Bônus de vínculo
  if (vinculo >= 301 && chances[2] < 95) {
    chances[1] = Math.max(0, chances[1] - 5); chances[2] = Math.min(95, chances[2] + 10);
  } else if (vinculo >= 151 && chances[2] < 95) {
    chances[1] = Math.max(0, chances[1] - 2.5); chances[2] = Math.min(95, chances[2] + 5);
  }
  const roll = Math.random() * 100;
  if (roll < chances[0]) return 'Comum';
  if (roll < chances[0] + chances[1]) return 'Raro';
  return 'Lendário';
}

function cooldownMult(raridade) {
  if (raridade === 'Lendário') return 1.5;
  if (raridade === 'Raro')     return 2.0;
  return 1.0;
}

function eggsPerLay(raridade) {
  if (raridade === 'Lendário') return 3;
  if (raridade === 'Raro')     return 2;
  return 1;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ erro: 'idToken em falta' });

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const snap  = await tx.get(playerRef);
      if (!snap.exists) throw new Error('Jogador não encontrado');
      const pData = snap.data();

      const slotIdx    = pData.activeSlotIdx ?? 0;
      const slots      = pData.avatarSlots || [];
      const slot       = slots[slotIdx];
      if (!slot || !slot.hatched || slot.dead) throw new Error('Avatar não disponível');
      if ((slot.nivel ? Math.floor(slot.nivel / 5) : 0) < 3) throw new Error('Avatar ainda não é adulto');

      // ── Validar cooldown pelo relógio do servidor ──
      const now           = Date.now();
      const eggLayReadyAt = slot.eggLayReadyAt || 0;
      if (eggLayReadyAt > now) {
        const msLeft = eggLayReadyAt - now;
        const hLeft  = Math.ceil(msLeft / 3600000);
        throw new Error(`Cooldown ativo — pronto em ~${hLeft}h`);
      }

      // ── Validar moedas ──
      const moedas = pData.gs?.moedas ?? pData.moedas ?? 0;
      if (moedas < EGG_COST) throw new Error('Moedas insuficientes (precisa de 50 🪙)');

      // ── Gerar ovos ──
      const raridade   = slot.raridade || 'Comum';
      const nivel      = slot.nivel    || 1;
      const vinculo    = slot.vinculo  || 0;
      const elemento   = slot.elemento || 'Terra';
      const numEggs    = Math.min(eggsPerLay(raridade), MAX_EGGS - (slot.eggs || []).length);
      if (numEggs <= 0) throw new Error('Inventário de ovos cheio (máx 10)');

      const novosOvos = [];
      for (let i = 0; i < numEggs; i++) {
        const r      = calcRarity(raridade, nivel, vinculo);
        const baseDias = r === 'Lendário' ? 30 : r === 'Raro' ? 14 : 7;
        const duraMulti = vinculo >= 301 ? 2.0 : vinculo >= 151 ? 1.0 : 1.0;
        novosOvos.push({
          raridade: r,
          elemento,
          expiraEm: now + baseDias * duraMulti * 24 * 60 * 60 * 1000,
          id: now + i,
        });
      }

      // ── Calcular novo cooldown ──
      const cdMs         = Math.round(COOLDOWN_BASE * cooldownMult(raridade));
      const newReadyAt   = now + cdMs;
      const novasMoedas  = moedas - EGG_COST;

      // ── Persistir atomicamente ──
      const newSlots = [...slots];
      newSlots[slotIdx] = {
        ...slot,
        eggs:           [...(slot.eggs || []), ...novosOvos],
        eggLayReadyAt:  newReadyAt,
        eggLayCooldown: Math.ceil(cdMs / 60000),
      };

      tx.update(playerRef, {
        avatarSlots:   newSlots,
        'gs.moedas':   novasMoedas,
        moedas:        novasMoedas,
      });

      return { eggs: novosOvos, novasMoedas, eggLayReadyAt: newReadyAt };
    });

    return res.status(200).json({ ok: true, ...resultado });

  } catch (err) {
    console.error('[layegg]', err.message);
    return res.status(400).json({ erro: err.message });
  }
};
