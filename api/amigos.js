// ═══════════════════════════════════════════════════════════════
//  api/amigos.js — Vercel Serverless Function
//
//  GET  /api/amigos?lista=1&idToken=X   → amigos + pedidos + visitasLog
//  GET  /api/amigos?buscar=texto&idToken=X → pesquisar jogadores por nome
//  GET  /api/amigos?perfil=uid&idToken=X   → perfil público + cooldown
//
//  POST { acao, idToken, ... }
//    acao='pedir'   → enviar pedido de amizade  { alvoUid }
//    acao='aceitar' → aceitar pedido             { alvoUid }
//    acao='recusar' → recusar pedido             { alvoUid }
//    acao='remover' → remover amigo              { alvoUid }
//    acao='visitar' → executar visita            { alvoUid, tipo: alimentar|brincar|limpar }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const MOEDAS_VISITA = 50;
const XP_VISITA     = 15;
const VITAL_BOOST   = 20;
const COOLDOWN_MS   = 8 * 60 * 60 * 1000; // 8 horas
const MAX_AMIGOS    = 50;
const MAX_PEDIDOS   = 20;

const TIPO_VITAL = {
  alimentar: 'fome',
  brincar:   'humor',
  limpar:    'higiene',
};

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

async function verificarToken(auth, idToken) {
  const decoded = await auth.verifyIdToken(idToken);
  return decoded.uid;
}

// ── Handler principal ─────────────────────────────────────────
module.exports = async function handler(req, res) {
  const { db, auth } = initAdmin();

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { lista, buscar, perfil, idToken } = req.query;
    if (!idToken) return res.status(400).json({ erro: 'idToken em falta' });

    let uid;
    try { uid = await verificarToken(auth, idToken); }
    catch { return res.status(401).json({ erro: 'Token inválido' }); }

    // GET ?lista=1
    if (lista === '1') {
      try {
        const snap = await db.collection('players').doc(uid).get();
        const data = snap.exists ? snap.data() : {};
        return res.status(200).json({
          ok:         true,
          amigos:     data.amigos        || {},
          pedidos:    data.pedidosAmizade || [],
          visitasLog: data.visitasLog    || {},
        });
      } catch (err) {
        console.error('[amigos lista]', err);
        return res.status(500).json({ erro: 'Erro ao carregar amigos.' });
      }
    }

    // GET ?buscar=texto
    if (buscar !== undefined) {
      const q = buscar.toLowerCase().trim();
      if (q.length < 2) return res.status(400).json({ erro: 'Mínimo 2 caracteres.' });
      try {
        const snaps = await db.collection('players')
          .where('nomeBusca', '>=', q)
          .where('nomeBusca', '<=', q + '\uf8ff')
          .limit(15)
          .get();
        const resultados = [];
        snaps.forEach(doc => {
          if (doc.id === uid) return; // não mostrar a si mesmo
          const d        = doc.data();
          const slotIdx  = d.activeSlotIdx ?? d.gs?.activeSlotIdx ?? 0;
          const slot     = (d.avatarSlots || [])[slotIdx];
          if (!slot?.hatched || slot?.dead) return;
          resultados.push({
            uid:      doc.id,
            nome:     slot.nome?.split(',')[0] || '???',
            elemento: slot.elemento || 'Fogo',
            raridade: slot.raridade || 'Comum',
            nivel:    slot.nivel    || 1,
            seed:     slot.seed     || 0,
          });
        });
        return res.status(200).json({ ok: true, resultados });
      } catch (err) {
        console.error('[amigos buscar]', err);
        return res.status(500).json({ erro: 'Erro na pesquisa.' });
      }
    }

    // GET ?perfil=uid
    if (perfil) {
      try {
        const [mySnap, targetSnap] = await Promise.all([
          db.collection('players').doc(uid).get(),
          db.collection('players').doc(perfil).get(),
        ]);
        if (!targetSnap.exists) return res.status(404).json({ erro: 'Jogador não encontrado.' });

        const myData     = mySnap.exists ? mySnap.data() : {};
        const targetData = targetSnap.data();

        // Validar que são amigos
        if (!myData.amigos?.[perfil]) {
          return res.status(403).json({ erro: 'Não são amigos.' });
        }

        const slotIdx = targetData.activeSlotIdx ?? targetData.gs?.activeSlotIdx ?? 0;
        const slot    = (targetData.avatarSlots || [])[slotIdx];
        if (!slot?.hatched || slot?.dead) {
          return res.status(200).json({ ok: true, semAvatar: true });
        }

        const myCooldowns = (myData.visitasLog || {})[perfil] || {};

        return res.status(200).json({
          ok:     true,
          perfil: {
            uid:      perfil,
            nome:     slot.nome?.split(',')[0] || '???',
            elemento: slot.elemento || 'Fogo',
            raridade: slot.raridade || 'Comum',
            nivel:    slot.nivel    || 1,
            seed:     slot.seed     || 0,
            vitals:   slot.vitals   || { fome:100, humor:100, energia:100, saude:100, higiene:100 },
          },
          cooldowns: {
            alimentar: myCooldowns.alimentar || 0,
            brincar:   myCooldowns.brincar   || 0,
            limpar:    myCooldowns.limpar     || 0,
          },
        });
      } catch (err) {
        console.error('[amigos perfil]', err);
        return res.status(500).json({ erro: 'Erro ao carregar perfil.' });
      }
    }

    return res.status(400).json({ erro: 'Parâmetro inválido.' });
  }

  // ── POST ─────────────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { acao, idToken, alvoUid, tipo } = req.body;
  if (!idToken) return res.status(400).json({ erro: 'idToken em falta' });

  let uid;
  try { uid = await verificarToken(auth, idToken); }
  catch { return res.status(401).json({ erro: 'Token inválido' }); }

  if (!alvoUid || typeof alvoUid !== 'string') return res.status(400).json({ erro: 'alvoUid inválido' });
  if (alvoUid === uid) return res.status(400).json({ erro: 'Não podes adicionar-te a ti mesmo.' });

  if (acao === 'pedir')   return handlePedir(req, res, db, uid, alvoUid);
  if (acao === 'aceitar') return handleAceitar(req, res, db, uid, alvoUid);
  if (acao === 'recusar') return handleRecusar(req, res, db, uid, alvoUid);
  if (acao === 'remover') return handleRemover(req, res, db, uid, alvoUid);
  if (acao === 'visitar') return handleVisitar(req, res, db, uid, alvoUid, tipo);

  return res.status(400).json({ erro: 'acao inválida' });
};

// ── Enviar pedido de amizade ──────────────────────────────────
async function handlePedir(req, res, db, uid, alvoUid) {
  try {
    const [mySnap, targetSnap] = await Promise.all([
      db.collection('players').doc(uid).get(),
      db.collection('players').doc(alvoUid).get(),
    ]);
    if (!targetSnap.exists) return res.status(404).json({ erro: 'Jogador não encontrado.' });

    const myData     = mySnap.exists ? mySnap.data() : {};
    const targetData = targetSnap.data();

    if (myData.amigos?.[alvoUid])                     return res.status(400).json({ erro: 'Já são amigos.' });
    if ((targetData.pedidosAmizade || []).some(p => p.de === uid)) {
      return res.status(400).json({ erro: 'Pedido já enviado.' });
    }
    if ((targetData.pedidosAmizade || []).length >= MAX_PEDIDOS) {
      return res.status(400).json({ erro: 'Este jogador tem muitos pedidos pendentes.' });
    }

    // Obter nome do meu avatar activo
    const mySlotIdx = myData.activeSlotIdx ?? myData.gs?.activeSlotIdx ?? 0;
    const mySlot    = (myData.avatarSlots || [])[mySlotIdx];
    const meuNome   = mySlot?.nome?.split(',')[0] || 'Viajante';

    await db.collection('players').doc(alvoUid).update({
      pedidosAmizade: FieldValue.arrayUnion({ de: uid, nome: meuNome, ts: Date.now() }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[amigos/pedir]', err);
    return res.status(500).json({ erro: 'Erro ao enviar pedido.' });
  }
}

// ── Aceitar pedido ────────────────────────────────────────────
async function handleAceitar(req, res, db, uid, alvoUid) {
  try {
    const [mySnap, targetSnap] = await Promise.all([
      db.collection('players').doc(uid).get(),
      db.collection('players').doc(alvoUid).get(),
    ]);
    if (!targetSnap.exists) return res.status(404).json({ erro: 'Jogador não encontrado.' });

    const myData     = mySnap.exists ? mySnap.data() : {};
    const targetData = targetSnap.data();

    const pedidos = myData.pedidosAmizade || [];
    const pedido  = pedidos.find(p => p.de === alvoUid);
    if (!pedido) return res.status(400).json({ erro: 'Pedido não encontrado.' });

    if (Object.keys(myData.amigos || {}).length >= MAX_AMIGOS) {
      return res.status(400).json({ erro: 'Lista de amigos cheia.' });
    }

    // Nomes dos avatares activos
    const mySlotIdx     = myData.activeSlotIdx ?? myData.gs?.activeSlotIdx ?? 0;
    const mySlot        = (myData.avatarSlots || [])[mySlotIdx];
    const meuNome       = mySlot?.nome?.split(',')[0] || 'Viajante';

    const targetSlotIdx = targetData.activeSlotIdx ?? targetData.gs?.activeSlotIdx ?? 0;
    const targetSlot    = (targetData.avatarSlots || [])[targetSlotIdx];
    const nomeAlvo      = targetSlot?.nome?.split(',')[0] || pedido.nome || 'Viajante';

    const batch = db.batch();

    // Adicionar mutuamente
    batch.update(db.collection('players').doc(uid), {
      [`amigos.${alvoUid}`]:  { nome: nomeAlvo, ts: Date.now() },
      pedidosAmizade: pedidos.filter(p => p.de !== alvoUid),
    });
    batch.update(db.collection('players').doc(alvoUid), {
      [`amigos.${uid}`]: { nome: meuNome, ts: Date.now() },
    });

    await batch.commit();
    return res.status(200).json({ ok: true, nomeAlvo });
  } catch (err) {
    console.error('[amigos/aceitar]', err);
    return res.status(500).json({ erro: 'Erro ao aceitar pedido.' });
  }
}

// ── Recusar pedido ────────────────────────────────────────────
async function handleRecusar(req, res, db, uid, alvoUid) {
  try {
    const snap = await db.collection('players').doc(uid).get();
    const data = snap.exists ? snap.data() : {};
    const novos = (data.pedidosAmizade || []).filter(p => p.de !== alvoUid);
    await db.collection('players').doc(uid).update({ pedidosAmizade: novos });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[amigos/recusar]', err);
    return res.status(500).json({ erro: 'Erro ao recusar pedido.' });
  }
}

// ── Remover amigo ─────────────────────────────────────────────
async function handleRemover(req, res, db, uid, alvoUid) {
  try {
    const batch = db.batch();
    batch.update(db.collection('players').doc(uid),     { [`amigos.${alvoUid}`]: FieldValue.delete() });
    batch.update(db.collection('players').doc(alvoUid), { [`amigos.${uid}`]:     FieldValue.delete() });
    await batch.commit();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[amigos/remover]', err);
    return res.status(500).json({ erro: 'Erro ao remover amigo.' });
  }
}

// ── Executar visita ───────────────────────────────────────────
async function handleVisitar(req, res, db, uid, alvoUid, tipo) {
  if (!TIPO_VITAL[tipo]) return res.status(400).json({ erro: 'tipo inválido' });
  const vitalField = TIPO_VITAL[tipo];

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const [mySnap, targetSnap] = await Promise.all([
        tx.get(db.collection('players').doc(uid)),
        tx.get(db.collection('players').doc(alvoUid)),
      ]);

      if (!mySnap.exists)     throw new Error('Jogador não encontrado.');
      if (!targetSnap.exists) throw new Error('Amigo não encontrado.');

      const myData     = mySnap.data();
      const targetData = targetSnap.data();

      // Validar amizade (bilateral)
      if (!myData.amigos?.[alvoUid]) throw new Error('Não são amigos.');

      // Validar cooldown
      const myCooldowns = (myData.visitasLog || {})[alvoUid] || {};
      const lastVisita   = myCooldowns[tipo] || 0;
      if (Date.now() - lastVisita < COOLDOWN_MS) {
        const restante = Math.ceil((COOLDOWN_MS - (Date.now() - lastVisita)) / 60000);
        throw new Error(`Aguarda mais ${restante} min para ${tipo} de novo.`);
      }

      // Validar que o alvo tem avatar activo e vivo
      const slotIdx = targetData.activeSlotIdx ?? targetData.gs?.activeSlotIdx ?? 0;
      const slots   = targetData.avatarSlots || [];
      const slot    = slots[slotIdx];
      if (!slot?.hatched || slot?.dead) throw new Error('O amigo não tem avatar activo.');

      // Calcular novos vitals do alvo (capped a 100)
      const vitalAtual = slot.vitals?.[vitalField] ?? 100;
      const novoVital  = Math.min(100, vitalAtual + VITAL_BOOST);

      // Actualizar slot do alvo em memória e escrever array completo
      const newSlots = slots.map((s, i) => {
        if (i !== slotIdx || !s) return s;
        return { ...s, vitals: { ...(s.vitals || {}), [vitalField]: novoVital } };
      });

      // Calcular recompensas do visitante
      const moedas      = myData.gs?.moedas ?? myData.moedas ?? 0;
      const novasMoedas = moedas + MOEDAS_VISITA;

      tx.update(db.collection('players').doc(uid), {
        'gs.moedas':                        novasMoedas,
        moedas:                             novasMoedas,
        [`visitasLog.${alvoUid}.${tipo}`]:  Date.now(),
      });
      tx.update(db.collection('players').doc(alvoUid), {
        avatarSlots: newSlots,
      });

      return { novasMoedas, xpGanho: XP_VISITA, novoVital };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    console.error('[amigos/visitar]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}
