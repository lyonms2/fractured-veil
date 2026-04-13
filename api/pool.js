// ═══════════════════════════════════════════════════════════════
//  api/pool.js — Vercel Serverless Function
//
//  GET  /api/pool              → dados da pool
//  GET  /api/pool?logs=1       → histórico de transacções
//  POST /api/pool { acao, idToken, ... }
//    acao='taxa'       → entrada na pool (taxa de listagem/venda)
//    acao='vender-ovo' → jogador vende ovo à pool
//    acao='queimar-ovo'→ jogador queima ovo e recebe cristais
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const POOL_ALVO       = 1000;
const POOL_LIMITE_DIA = 100;

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

function getMesAtual() { return new Date().toISOString().slice(0, 7); }

function semanaAtual() {
  const now = new Date();
  const ini = new Date(now.getFullYear(), 0, 1);
  const sem = Math.ceil(((now - ini) / 86400000 + ini.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(sem).padStart(2, '0')}`;
}

// ── Handler principal ───────────────────────────────────────────
module.exports = async function handler(req, res) {
  const { db, auth } = initAdmin();
  const poolRef = db.collection('config').doc('pool');

  // ── GET ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const poolSnap = await poolRef.get();
      const poolData = poolSnap.exists ? poolSnap.data() : {
        cristais: 0, saqueHoje: 0, ultimoReset: 0, totalEntrou: 0, totalSaiu: 0,
      };

      // Reset diário
      const agora = Date.now();
      if (agora - (poolData.ultimoReset || 0) > 86400000) {
        await poolRef.set({ saqueHoje: 0, ultimoReset: agora }, { merge: true });
        poolData.saqueHoje = 0; poolData.ultimoReset = agora;
      }

      if (req.query?.logs === '1') {
        let q = poolRef.collection('logs').orderBy('ts', 'desc').limit(20);
        if (req.query?.after) {
          try {
            const afterSnap = await poolRef.collection('logs').doc(req.query.after).get();
            if (afterSnap.exists) q = q.startAfter(afterSnap);
          } catch (_) {}
        }
        const logsSnap = await q.get();
        const logs = logsSnap.docs.map(d => {
          const data = d.data();
          return {
            id:     d.id,
            tipo:   data.tipo,
            motivo: data.motivo || '',
            origem: data.origem || '',
            pool:   data.pool   ?? 0,
            total:  data.total  ?? 0,
            ts:     data.ts?.toMillis ? data.ts.toMillis() : null,
          };
        });
        return res.status(200).json({
          ok: true, logs,
          lastId:  logsSnap.docs.length > 0 ? logsSnap.docs[logsSnap.docs.length - 1].id : null,
          hasMore: logsSnap.docs.length === 20,
        });
      }

      return res.status(200).json({
        ok: true,
        cristais:    poolData.cristais    || 0,
        saqueHoje:   poolData.saqueHoje   || 0,
        totalEntrou: poolData.totalEntrou || 0,
        totalSaiu:   poolData.totalSaiu   || 0,
        ultimoReset: poolData.ultimoReset || 0,
      });
    } catch (err) {
      console.error('[pool GET]', err);
      return res.status(500).json({ erro: 'Erro ao carregar pool.' });
    }
  }

  // ── POST ────────────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { acao, idToken } = req.body;
  if (!idToken) return res.status(400).json({ erro: 'idToken em falta' });

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  if (acao === 'taxa')        return handleTaxa(req, res, db, poolRef, uid);
  if (acao === 'vender-ovo')  return handleVenderOvo(req, res, db, poolRef, uid);
  if (acao === 'queimar-ovo') return handleQueimarOvo(req, res, db, poolRef, uid);
  if (acao === 'botar-ovo')   return handleBotarOvo(req, res, db, uid);

  return res.status(400).json({ erro: 'acao inválida' });
};

// ── Taxa: entrada na pool (listagem, venda, etc.) ───────────────
async function handleTaxa(req, res, db, poolRef, uid) {
  const { valor, motivo } = req.body;
  const v = parseFloat(valor);
  if (!v || v <= 0) return res.status(400).json({ erro: 'Valor inválido' });

  try {
    const batch  = db.batch();
    const logRef = poolRef.collection('logs').doc();
    batch.update(poolRef, {
      cristais:    FieldValue.increment(v),
      totalEntrou: FieldValue.increment(v),
    });
    batch.set(logRef, {
      tipo: 'entrada', motivo: motivo || 'taxa',
      origem: uid, total: v, pool: v,
      ts: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[pool/taxa]', err);
    return res.status(500).json({ erro: 'Erro ao registar taxa.' });
  }
}

// ── Vender ovo à pool ───────────────────────────────────────────
async function handleVenderOvo(req, res, db, poolRef, uid) {
  const { raridade, ovoId } = req.body;
  if (!raridade || raridade === 'Comum') return res.status(400).json({ erro: 'Ovos Comuns não são aceites.' });
  if (!ovoId) return res.status(400).json({ erro: 'ovoId em falta' });

  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const [playerSnap, poolSnap] = await Promise.all([tx.get(playerRef), tx.get(poolRef)]);
      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const pData   = playerSnap.data();
      const poolData = poolSnap.exists ? poolSnap.data() : { cristais: 0, saqueHoje: 0 };

      // Validar pool
      if ((poolData.cristais || 0) <= 0) throw new Error('Pool vazia de momento.');
      const saqueHoje = poolData.saqueHoje || 0;
      if (saqueHoje >= POOL_LIMITE_DIA)   throw new Error('Limite diário global da pool atingido.');

      // Validar ovo no inventário
      // Campo correto no Firebase é activeSlotIdx (não activeSlot)
      const slotIdx    = pData.activeSlotIdx ?? pData.gs?.activeSlot ?? pData.activeSlot ?? 0;
      const activeSlot = (pData.avatarSlots || [])[slotIdx];
      const eggs       = activeSlot?.eggs || [];
      const ovoIdx     = eggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);
      if (ovoIdx === -1) throw new Error('Ovo não encontrado no inventário.');

      // Limite semanal por jogador
      const semana = semanaAtual();
      const poolLog = pData.poolVendasLog || {};
      const countSemana = poolLog.semana === semana ? (poolLog.count || 0) : 0;
      const limiteSemanal = poolData.cristais >= 1000 ? 5 : poolData.cristais >= 500 ? 3 : poolData.cristais >= 100 ? 2 : 1;
      if (countSemana >= limiteSemanal) throw new Error(`Limite semanal atingido (${limiteSemanal}x). Volta na próxima semana.`);

      // Calcular preço
      const ratio = Math.min(2, poolData.cristais / POOL_ALVO);
      const base  = raridade === 'Lendário' ? 1.0 : 0.5;
      const minP  = raridade === 'Lendário' ? 0.25 : 0.10;
      const preco = Math.max(minP, parseFloat((base * ratio).toFixed(2)));

      if (poolData.cristais < preco) throw new Error('Pool sem saldo suficiente.');

      // Remover ovo do inventário
      const newEggs  = [...eggs];
      newEggs.splice(ovoIdx, 1);
      const newSlots = [...(pData.avatarSlots || [])];
      if (newSlots[slotIdx]) newSlots[slotIdx] = { ...newSlots[slotIdx], eggs: newEggs };

      const cristaisAtuais = pData.gs?.cristais ?? pData.cristais ?? 0;
      const novosCristais  = cristaisAtuais + preco;

      tx.update(playerRef, {
        avatarSlots:   newSlots,
        'gs.cristais': novosCristais,
        cristais:      novosCristais,
        poolVendasLog: { semana, count: countSemana + 1 },
      });
      tx.update(poolRef, {
        cristais:  FieldValue.increment(-preco),
        saqueHoje: FieldValue.increment(preco),
        totalSaiu: FieldValue.increment(preco),
      });
      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo: 'saida', motivo: `Ovo ${raridade} vendido à pool`,
        origem: uid, total: preco, pool: -preco,
        ts: FieldValue.serverTimestamp(),
      });

      return { preco, novosCristais };
    });

    return res.status(200).json({ ok: true, preco: resultado.preco, novosCristais: resultado.novosCristais });

  } catch (err) {
    console.error('[pool/vender-ovo]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}

// ── Queimar ovo (recebe cristais da pool) ───────────────────────
async function handleQueimarOvo(req, res, db, poolRef, uid) {
  const { raridade, ovoId, gems } = req.body;
  const finalGems = parseFloat(gems);
  if (!raridade || raridade === 'Comum' || !ovoId || !finalGems || finalGems <= 0) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' });
  }

  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const [playerSnap, poolSnap] = await Promise.all([tx.get(playerRef), tx.get(poolRef)]);
      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const pData    = playerSnap.data();
      const poolData = poolSnap.exists ? poolSnap.data() : { cristais: 0, saqueHoje: 0 };

      if ((poolData.cristais || 0) < finalGems) throw new Error('Pool sem saldo suficiente.');
      if ((poolData.saqueHoje || 0) >= POOL_LIMITE_DIA) throw new Error('Limite diário global da pool atingido.');

      // Validar ovo
      const slotIdx    = pData.activeSlotIdx ?? pData.gs?.activeSlot ?? pData.activeSlot ?? 0;
      const activeSlot = (pData.avatarSlots || [])[slotIdx];
      const eggs       = activeSlot?.eggs || [];
      const ovoIdx     = eggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);
      if (ovoIdx === -1) throw new Error('Ovo não encontrado no inventário.');

      const newEggs  = [...eggs];
      newEggs.splice(ovoIdx, 1);
      const newSlots = [...(pData.avatarSlots || [])];
      if (newSlots[slotIdx]) newSlots[slotIdx] = { ...newSlots[slotIdx], eggs: newEggs };

      const cristaisAtuais = pData.gs?.cristais ?? pData.cristais ?? 0;
      const novosCristais  = cristaisAtuais + finalGems;

      tx.update(playerRef, {
        avatarSlots:   newSlots,
        'gs.cristais': novosCristais,
        cristais:      novosCristais,
      });
      tx.update(poolRef, {
        cristais:  FieldValue.increment(-finalGems),
        saqueHoje: FieldValue.increment(finalGems),
        totalSaiu: FieldValue.increment(finalGems),
      });
      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo: 'saida', motivo: `Queima de ovo ${raridade}`,
        origem: uid, total: finalGems, pool: -finalGems,
        ts: FieldValue.serverTimestamp(),
      });

      return { novosCristais };
    });

    return res.status(200).json({ ok: true, novosCristais: resultado.novosCristais });

  } catch (err) {
    console.error('[pool/queimar-ovo]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}

// ── Botar ovo (server-side, relógio do servidor) ────────────────
function _calcEggRarity(raridade, nivel, vinculo) {
  let c;
  if (raridade === 'Comum') {
    c = nivel < 25 ? [97,3,0] : nivel < 35 ? [94,5.5,0.5] : [90,8,2];
  } else if (raridade === 'Raro') {
    c = nivel < 25 ? [55,40,5] : nivel < 35 ? [40,50,10] : [25,55,20];
  } else {
    c = nivel < 25 ? [20,55,25] : nivel < 35 ? [10,50,40] : [5,40,55];
  }
  if (vinculo >= 301 && c[2] < 95) { c[1] = Math.max(0, c[1]-5); c[2] = Math.min(95, c[2]+10); }
  else if (vinculo >= 151 && c[2] < 95) { c[1] = Math.max(0, c[1]-2.5); c[2] = Math.min(95, c[2]+5); }
  const roll = Math.random() * 100;
  if (roll < c[0]) return 'Comum';
  if (roll < c[0] + c[1]) return 'Raro';
  return 'Lendário';
}

async function handleBotarOvo(_req, res, db, uid) {
  const playerRef = db.collection('players').doc(uid);
  try {
    const resultado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) throw new Error('Jogador não encontrado');
      const pData = snap.data();

      const slotIdx = pData.activeSlotIdx ?? 0;
      const slots   = pData.avatarSlots || [];
      const slot    = slots[slotIdx];
      if (!slot || !slot.hatched || slot.dead) throw new Error('Avatar não disponível');

      const fase = slot.nivel >= 17 ? 3 : slot.nivel >= 10 ? 2 : slot.nivel >= 5 ? 1 : 0;
      if (fase < 3) throw new Error('Avatar ainda não é adulto');

      // Validar cooldown pelo relógio do servidor
      const now           = Date.now();
      const eggLayReadyAt = slot.eggLayReadyAt || 0;
      if (eggLayReadyAt > now) {
        const hLeft = Math.ceil((eggLayReadyAt - now) / 3600000);
        throw new Error(`Cooldown ativo — pronto em ~${hLeft}h`);
      }

      const moedas = pData.gs?.moedas ?? pData.moedas ?? 0;
      if (moedas < 50) throw new Error('Moedas insuficientes (precisa de 50 🪙)');

      const raridade = slot.raridade || 'Comum';
      const numEggs  = raridade === 'Lendário' ? 3 : raridade === 'Raro' ? 2 : 1;
      const slotEggs = slot.eggs || [];
      const canAdd   = Math.min(numEggs, 10 - slotEggs.length);
      if (canAdd <= 0) throw new Error('Inventário de ovos cheio (máx 10)');

      const novosOvos = [];
      for (let i = 0; i < canAdd; i++) {
        const r        = _calcEggRarity(raridade, slot.nivel || 1, slot.vinculo || 0);
        const baseDias = r === 'Lendário' ? 30 : r === 'Raro' ? 14 : 7;
        novosOvos.push({ raridade: r, elemento: slot.elemento || 'Terra', expiraEm: now + baseDias * 86400000, id: now + i });
      }

      const cdMult   = raridade === 'Lendário' ? 1.5 : raridade === 'Raro' ? 2.0 : 1.0;
      const cdMs     = Math.round(24 * 3600000 * cdMult);
      const newReady = now + cdMs;

      const newSlots = [...slots];
      newSlots[slotIdx] = { ...slot, eggs: [...slotEggs, ...novosOvos], eggLayReadyAt: newReady, eggLayCooldown: Math.ceil(cdMs / 60000) };
      tx.update(playerRef, { avatarSlots: newSlots, 'gs.moedas': moedas - 50, moedas: moedas - 50 });

      return { eggs: novosOvos, novasMoedas: moedas - 50, eggLayReadyAt: newReady };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    console.error('[pool/botar-ovo]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}
