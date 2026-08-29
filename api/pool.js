// ═══════════════════════════════════════════════════════════════
//  api/pool.js — Vercel Serverless Function
//
//  GET  /api/pool              → dados da pool
//  GET  /api/pool?logs=1       → histórico de transacções
//  GET  /api/pool?cobertura=1  → o cofre chega para os cristais que existem
//  POST /api/pool { acao, idToken, ... }
//    acao='taxa'        → entrada na pool (taxa de listagem/venda)
//    acao='listar-ovo'  → lista ovo no eggMarket (atómico, server-side)
//    acao='vender-ovo'  → jogador vende ovo à pool
//    acao='queimar-ovo' → jogador queima ovo e recebe cristais
//    acao='botar-ovo'   → avatar bota ovo (relógio do servidor)
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const { POOL_LIMITE_DIA, saqueDeHoje,
        marcarSaque }                  = require('./_pool-economia.js');

const POOL_ALVO       = 1000;
// POOL_LIMITE_DIA e saqueDeHoje vêm do _pool-economia.js, para o câmbio
// (em outro arquivo) poder usar exatamente a mesma regra.
const EGG_LIST_FEE    = { 'Raro': 25, 'Lendário': 50 };
const PRICE_MIN       = 1;
const PRICE_MAX       = 10000;

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

// ═══════════════════════════════════════════════════════════════
// COBERTURA — o cofre chega para os cristais que existem?
//
// A pool nunca CRIA cristais: o cambio tira-lhe exactamente o que da ao
// jogador, o PvP paga com as apostas dos dois, e os convites saem do que
// se saca. A unica emissao e a compra em MATIC, e as duas taxas batem
// certo (10 💎 por MATIC a comprar, 10 por MATIC a resgatar), portanto a
// cobertura e 1:1 por construcao.
//
// Mas ninguem estava a CONFIRMAR isso. Este numero e o unico que responde
// "o jogo consegue pagar toda a gente?" — e faltava na propria pagina de
// transparencia, que mostrava os cristais da pool e o link do contrato
// sem nunca dizer a razao entre os dois.
//
// Somar todos os jogadores e caro, entao guarda-se o resultado por
// COBERTURA_CACHE_MS. Quem abre a pagina le o valor guardado.
const RATE_GEMS_POR_MATIC = 10;   // igual ao RATE do api/resgatar.js
const COBERTURA_CACHE_MS  = 10 * 60 * 1000;
const POLYGON_RPCS_POOL = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
  'https://polygon.meowrpc.com',
  'https://polygon.llamarpc.com',
];

async function _saldoDoCofre() {
  const endereco = process.env.CONTRACT_ADDRESS;
  if (!endereco || endereco === 'PENDENTE_DEPLOY') return null;
  for (const rpc of POLYGON_RPCS_POOL) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const wei = await provider.getBalance(endereco);
      return parseFloat(ethers.formatEther(wei));
    } catch (_) { /* proximo RPC */ }
  }
  return null;   // blockchain fora de alcance
}

async function _calcularCobertura(db, poolRef, poolData) {
  const guardado = poolData.cobertura;
  if (guardado && (Date.now() - (guardado.ts || 0)) < COBERTURA_CACHE_MS) {
    return { ...guardado, cache: true };
  }

  // Cristais em maos de jogadores + os que a pool guarda
  let emJogadores = 0;
  const snap = await db.collection('players').select('gs', 'cristais').get();
  snap.forEach(doc => {
    const d = doc.data() || {};
    emJogadores += (d.gs?.cristais ?? d.cristais ?? 0);
  });

  const naPool      = poolData.cristais || 0;
  const circulacao  = emJogadores + naPool;
  const necessario  = circulacao / RATE_GEMS_POR_MATIC;
  const cofre       = await _saldoDoCofre();
  const pct         = (cofre === null) ? null
                    : (necessario <= 0 ? 100 : Math.round((cofre / necessario) * 1000) / 10);

  const resultado = {
    emJogadores, naPool, circulacao,
    necessario: Math.round(necessario * 10000) / 10000,
    cofre, pct, jogadores: snap.size, ts: Date.now(),
  };
  // Guardar sem bloquear a resposta
  poolRef.set({ cobertura: resultado }, { merge: true })
         .catch(err => console.warn('[cobertura] não guardou:', err.message));
  return { ...resultado, cache: false };
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

      let cobertura = null;
      if (req.query?.cobertura === '1') {
        try { cobertura = await _calcularCobertura(db, poolRef, poolData); }
        catch (err) { console.warn('[cobertura]', err.message); }
      }

      return res.status(200).json({
        ok: true,
        cristais:    poolData.cristais    || 0,
        saqueHoje:   poolData.saqueHoje   || 0,
        totalEntrou: poolData.totalEntrou || 0,
        totalSaiu:   poolData.totalSaiu   || 0,
        ultimoReset: poolData.ultimoReset || 0,
        cobertura,
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
  if (acao === 'listar-ovo')  return handleListarOvo(req, res, db, poolRef, uid);
  if (acao === 'vender-ovo')  return handleVenderOvo(req, res, db, poolRef, uid);
  if (acao === 'queimar-ovo') return handleQueimarOvo(req, res, db, poolRef, uid);
  if (acao === 'retirar-ovo') return handleRetirarOvo(req, res, db, uid);
  if (acao === 'chocar-ovo')  return handleChocarOvo(req, res, db, poolRef, uid);
  if (acao === 'botar-ovo')   return handleBotarOvo(req, res, db, uid);

  return res.status(400).json({ erro: 'acao inválida' });
};

// ── Taxa: entrada na pool (listagem, venda, etc.) ───────────────
// Taxa máxima legítima: 50 💎 (listagem ovo Lendário) ou 10% de uma venda de avatar
const TAXA_MAX = 50;

async function handleTaxa(req, res, db, poolRef, uid) {
  const { valor, motivo } = req.body;
  const v = parseFloat(valor);
  if (!v || v <= 0 || v > TAXA_MAX) return res.status(400).json({ erro: 'Valor inválido' });

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

// ── Listar ovo no eggMarket (atómico, server-side) ─────────────
async function handleListarOvo(req, res, db, poolRef, uid) {
  const { ovoId, raridade, elemento, expiraEm, price } = req.body;
  if (!ovoId)                          return res.status(400).json({ erro: 'ovoId em falta' });
  if (!raridade || !EGG_LIST_FEE[raridade]) return res.status(400).json({ erro: 'Raridade inválida (Raro ou Lendário)' });
  const priceInt = parseInt(price, 10);
  if (!priceInt || priceInt < PRICE_MIN || priceInt > PRICE_MAX)
    return res.status(400).json({ erro: `Preço inválido (${PRICE_MIN}–${PRICE_MAX})` });

  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const pData     = playerSnap.data();
      const inboxEggs = pData.inboxEggs || [];
      const cristais  = pData.gs?.cristais ?? pData.cristais ?? 0;

      /* Um ovo pode estar em dois sítios, e cada um tem a sua prova.

         inboxEggs — ovos comprados, postos aqui pelo servidor
         (api/comprar-ovo.js) e que o cliente já não pode encher.
         Estar lá é prova bastante.

         avatarSlots[].eggs — ovos que o próprio avatar pôs. Este array é
         escrito pelo cliente por inteiro, portanto estar lá não prova
         nada: qualquer um escrevia um Lendário e vendia-o. A prova é o
         ovosEmitidos, que o handleBotarOvo escreve e o cliente não.

         Antes só a primeira origem era aceite, e daí vinha o defeito: um
         ovo posto pelo próprio avatar dava sempre OVO_NOT_FOUND. Punha-se
         o ovo e não havia como o vender. */
      const emitidos = pData.ovosEmitidos || {};
      const slotIdx  = pData.activeSlotIdx ?? 0;
      const slots    = [...(pData.avatarSlots || [])];
      const slot     = slots[slotIdx];
      const slotEggs = slot?.eggs || [];

      const idxInbox = inboxEggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);
      const idxSlot  = slotEggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);

      // A raridade que vale é a que o servidor emitiu, nunca a do pedido.
      const emitidoComo = emitidos['o' + String(ovoId)];
      const doProprioAvatar = idxSlot !== -1 && emitidoComo === raridade;

      if (idxInbox === -1 && !doProprioAvatar) throw new Error('OVO_NOT_FOUND');

      const taxa = EGG_LIST_FEE[raridade];
      if (cristais < taxa) throw new Error('INSUFFICIENT');

      const ovoToRemove   = idxInbox !== -1 ? inboxEggs[idxInbox] : slotEggs[idxSlot];
      const novosCristais = cristais - taxa;

      const alteracoes = {
        cristais:      novosCristais,
        'gs.cristais': novosCristais,
      };
      if (idxInbox !== -1) {
        alteracoes.inboxEggs = FieldValue.arrayRemove(inboxEggs[idxInbox]);
      } else {
        // Sai do slot e o registo é apagado — sem isto, o mesmo ovo podia
        // ser listado outra vez depois de o cliente o repor no array.
        const novosEggs = slotEggs.filter((_, i) => i !== idxSlot);
        slots[slotIdx]  = { ...slot, eggs: novosEggs };
        alteracoes.avatarSlots = slots;
        alteracoes[`ovosEmitidos.o${ovoId}`] = FieldValue.delete();
      }
      tx.update(playerRef, alteracoes);

      const listRef = db.collection('eggMarket').doc();
      tx.set(listRef, {
        raridade: raridade,
        elemento: elemento  || ovoToRemove.elemento || '',
        expiraEm: expiraEm  || ovoToRemove.expiraEm || 0,
        eggId:    ovoToRemove.id,
        sellerId: uid,
        price:    priceInt,
        status:  'listed',
        listedAt: Date.now(),
      });

      tx.update(poolRef, {
        cristais:    FieldValue.increment(taxa),
        totalEntrou: FieldValue.increment(taxa),
      });
      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo:   'entrada',
        motivo: `listagem ovo ${raridade}`,
        origem: uid,
        total:  taxa,
        pool:   taxa,
        ts:     FieldValue.serverTimestamp(),
      });

      return { novoSaldo: novosCristais, taxa, raridade, elemento: ovoToRemove.elemento || elemento || '' };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    const erros = {
      OVO_NOT_FOUND: [400, 'Ovo não encontrado no inventário.'],
      INSUFFICIENT:  [400, 'Cristais insuficientes para a taxa de listagem.'],
    };
    const [status, msg] = erros[err.message] || [500, 'Erro interno ao processar listagem.'];
    if (status === 500) console.error('[pool/listar-ovo]', err);
    return res.status(status).json({ erro: msg });
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
      if (saqueDeHoje(poolData) >= POOL_LIMITE_DIA) throw new Error('Limite diário global da pool atingido.');

      // Validar ovo no inventário
      // Campo correto no Firebase é activeSlotIdx (não activeSlot)
      const slotIdx    = pData.activeSlotIdx ?? pData.gs?.activeSlot ?? pData.activeSlot ?? 0;
      const activeSlot = (pData.avatarSlots || [])[slotIdx];
      const eggs       = activeSlot?.eggs || [];
      const ovoIdx     = eggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);
      if (ovoIdx === -1) throw new Error('Ovo não encontrado no inventário.');
      /* O ovo tem de ter sido emitido pelo servidor.
         Isto lia os ovos de activeSlot.eggs e mais nada — e esse array vem
         do avatarSlots, que o cliente escreve por inteiro. Escrever um ovo
         Lendário num slot e queimá-lo era dinheiro da pool a sair por um ovo que
         nunca existiu. O ovosEmitidos é a prova, escrito pelo
         handleBotarOvo e fora do alcance do cliente (firestore.rules). */
      const _emitidos = pData.ovosEmitidos || {};
      if (_emitidos['o' + String(ovoId)] !== raridade) {
        throw new Error('OVO_SEM_REGISTO');
      }


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

      // O registo do ovo morre com ele. Sem isto, um ovo queimado deixava
      // para trás a sua prova em ovosEmitidos, e o cliente — que escreve o
      // avatarSlots — podia repô-lo no array e listá-lo à venda depois de
      // já ter recebido os cristais por o queimar.
      tx.update(playerRef, {
        avatarSlots:   newSlots,
        'gs.cristais': novosCristais,
        cristais:      novosCristais,
        poolVendasLog: { semana, count: countSemana + 1 },
        [`ovosEmitidos.o${ovoId}`]: FieldValue.delete(),
      });
      tx.update(poolRef, Object.assign({
        cristais:  FieldValue.increment(-preco),
        totalSaiu: FieldValue.increment(preco),
      }, marcarSaque(poolData, preco, FieldValue)));
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
//
// Quanto vale queimar um ovo. Espelha a conta que o cliente mostra em
// js/eggs.js (burnEgg): base pela raridade do OVO, bónus pela raridade
// do AVATAR activo de quem queima.
//
//   base   Lendário 6 · Raro 2
//   bónus  Lendário +50% · Raro +25% · Comum 0
//   máximo legítimo: 6 × 1.5 = 9 💎
const QUEIMA_BASE  = { 'Lendário': 6, 'Raro': 2 };
const QUEIMA_BONUS = { 'Lendário': 0.5, 'Raro': 0.25 };

function _valorDaQueima(raridadeOvo, raridadeAvatar) {
  const base  = QUEIMA_BASE[raridadeOvo];
  if (!base) return 0;                       // Comum não se queima por cristais
  const bonus = QUEIMA_BONUS[raridadeAvatar] || 0;
  return Math.round(base * (1 + bonus));
}

/* Retirar um ovo do mercado.
   Isto era feito no cliente, num batch que apagava a listagem e devolvia
   o ovo ao inboxEggs. Duas coisas erradas nisso:

   Primeira, o inboxEggs é a porta da venda — o handleListarOvo só aceita
   listar ovos que lá estejam. Quem escrevesse no inbox fabricava ovos
   Lendários e vendia-os. Agora as regras não deixam o cliente lá pôr
   nada, e esta função é a única forma legítima de um ovo voltar.

   Segunda, o cliente apagava a listagem sozinho. Se um comprador estivesse
   a meio da compra, os dois mexiam no mesmo documento sem árbitro. Aqui é
   uma transação: ou a listagem ainda existe e o ovo volta, ou já foi
   vendida e a retirada falha. */
const HATCH_FEE = { 'Comum': 0, 'Raro': 50, 'Lendário': 100 };

/* CHOCAR — a partir daqui é o servidor que emite avatares.
   ═══════════════════════════════════════════════════════════════════

   O problema que isto resolve: o avatarSlots é escrito pelo cliente por
   inteiro, e o api/comprar-avatar.js lia a raridade DESSE array para
   decidir se um avatar podia ir à venda. Bastava escrever
   raridade:'Lendário' num slot e listá-lo. Era o caminho mais curto para
   cristais, que saem em MATIC.

   Não havia nada com que comparar: a chocagem acontecia toda no cliente,
   portanto o servidor nunca tinha visto avatar nenhum nascer.

   Agora vê. E não precisa de acreditar em nada do que o cliente diz,
   porque já sabe a raridade do OVO — ou porque foi ele que o pôs no
   inboxEggs, ou porque o emitiu no ovosEmitidos ao ser posto. O avatar
   herda a raridade do ovo que consumiu, e fica registado em
   avataresEmitidos, que o cliente não escreve (firestore.rules).

   O seed e o nome continuam a vir do cliente. O seed decide a aparência
   e a ficha de combate, portanto quem insistir pode sortear até gostar —
   isso já era possível e continua a ser. O que deixa de ser possível é
   inventar a RARIDADE, que é o que vale cristais.

   A taxa é cobrada aqui, e não no cliente: era o js/eggs.js a fazer
   gs.cristais -= taxa e a avisar a pool depois, em duas escritas
   separadas que podiam divergir. */
async function handleChocarOvo(req, res, db, poolRef, uid) {
  const { ovoId, seed } = req.body;
  if (!ovoId || seed == null) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' });
  }
  const seedStr = String(seed);
  if (!/^[0-9]+$/.test(seedStr)) {
    return res.status(400).json({ erro: 'Seed inválido.' });
  }

  const playerRef = db.collection('players').doc(uid);

  try {
    const saida = await db.runTransaction(async (tx) => {
      const [playerSnap, poolSnap] = await Promise.all([tx.get(playerRef), tx.get(poolRef)]);
      if (!playerSnap.exists) throw new Error('SEM_JOGADOR');

      const pData     = playerSnap.data();
      const inboxEggs = pData.inboxEggs || [];
      const emitidos  = pData.ovosEmitidos || {};
      const slotIdx   = pData.activeSlotIdx ?? 0;
      const slots     = [...(pData.avatarSlots || [])];
      const slot      = slots[slotIdx];
      const slotEggs  = slot?.eggs || [];

      // Duas origens, cada uma com a sua prova — o mesmo do listar-ovo.
      const idxInbox = inboxEggs.findIndex(e => String(e.id) === String(ovoId));
      const idxSlot  = slotEggs.findIndex(e => String(e.id) === String(ovoId));
      const emitidoComo = emitidos['o' + String(ovoId)];

      let raridade = null;
      if (idxInbox !== -1)                       raridade = inboxEggs[idxInbox].raridade;
      else if (idxSlot !== -1 && emitidoComo)    raridade = emitidoComo;
      if (!raridade) throw new Error('OVO_NOT_FOUND');

      const taxa     = HATCH_FEE[raridade] || 0;
      const cristais = pData.gs?.cristais ?? pData.cristais ?? 0;
      if (cristais < taxa) throw new Error('INSUFFICIENT');

      const alteracoes = { [`avataresEmitidos.s${seedStr}`]: raridade };

      // O ovo sai, e o registo dele com ele — senão ficava a valer para
      // uma segunda chocagem ou para uma venda depois de já ter nascido.
      if (idxInbox !== -1) {
        alteracoes.inboxEggs = FieldValue.arrayRemove(inboxEggs[idxInbox]);
      } else {
        slots[slotIdx] = { ...slot, eggs: slotEggs.filter((_, i) => i !== idxSlot) };
        alteracoes.avatarSlots = slots;
      }
      if (emitidoComo) alteracoes[`ovosEmitidos.o${ovoId}`] = FieldValue.delete();

      if (taxa > 0) {
        alteracoes.cristais      = cristais - taxa;
        alteracoes['gs.cristais'] = cristais - taxa;
        tx.update(poolRef, {
          cristais:    FieldValue.increment(taxa),
          totalEntrou: FieldValue.increment(taxa),
        });
      }

      tx.update(playerRef, alteracoes);
      return { raridade, taxa, novosCristais: cristais - taxa };
    });

    return res.status(200).json({ ok: true, ...saida });
  } catch (err) {
    const conhecido = {
      SEM_JOGADOR:  [404, 'Jogador não encontrado.'],
      OVO_NOT_FOUND:[404, 'Ovo não encontrado.'],
      INSUFFICIENT: [400, 'Cristais insuficientes para a taxa de chocagem.'],
    }[err.message];
    if (conhecido) return res.status(conhecido[0]).json({ erro: conhecido[1] });
    console.error('[pool/chocar-ovo]', err.message);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

async function handleRetirarOvo(req, res, db, uid) {
  const { listingId } = req.body;
  if (!listingId) return res.status(400).json({ erro: 'Parâmetros inválidos.' });

  const listRef   = db.collection('eggMarket').doc(String(listingId));
  const playerRef = db.collection('players').doc(uid);

  try {
    const ovo = await db.runTransaction(async (tx) => {
      const listSnap = await tx.get(listRef);
      if (!listSnap.exists) throw new Error('LISTAGEM_NAO_EXISTE');

      const l = listSnap.data();
      if (l.sellerId !== uid) throw new Error('NOT_OWNER');
      if (l.status && l.status !== 'listed') throw new Error('JA_VENDIDA');

      // O ovo volta com os dados da LISTAGEM, não com os do pedido: o
      // corpo do pedido vem do cliente e podia trazer outra raridade.
      const restaurado = {
        id:       l.eggId    || Date.now(),
        raridade: l.raridade,
        elemento: l.elemento || '',
        expiraEm: l.expiraEm || 0,
      };
      /* O registo acompanha o ovo desde que ele entra.
         Sem isto o ovo ficava inútil ao fim de um recarregamento: o
         applyGameState() move os ovos do inboxEggs para o slot.eggs e
         limpa o inbox, e a partir daí a única prova de que o ovo é
         legítimo seria o inbox — que já não o tem. Chocar, queimar, vender
         e listar passavam todos a dar OVO_NOT_FOUND.
         O inbox é entrega; o ovosEmitidos é propriedade. */
      tx.update(playerRef, {
        inboxEggs: FieldValue.arrayUnion(restaurado),
        [`ovosEmitidos.o${restaurado.id}`]: restaurado.raridade,
      });
      tx.delete(listRef);
      return restaurado;
    });

    return res.status(200).json({ ok: true, ovo });
  } catch (err) {
    const conhecido = {
      LISTAGEM_NAO_EXISTE: [404, 'Essa listagem já não existe.'],
      NOT_OWNER:           [403, 'Essa listagem não é tua.'],
      JA_VENDIDA:          [409, 'Esse ovo já foi vendido.'],
    }[err.message];
    if (conhecido) return res.status(conhecido[0]).json({ erro: conhecido[1] });
    console.error('[pool/retirar-ovo]', err.message);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}

async function handleQueimarOvo(req, res, db, poolRef, uid) {
  // O `gems` do corpo do pedido é IGNORADO de propósito. Era ele que
  // decidia quanto a pool pagava: o servidor fazia parseFloat e pagava,
  // sem calcular nada e sem tecto — o valor legítimo máximo são 9 💎, mas
  // um pedido com 500 passava desde que a pool tivesse. E o limite diário
  // não protegia contra isso: só bloqueia DEPOIS de 100 terem saído, não
  // limita o pedido em si.
  //
  // (O handleTaxa, que põe dinheiro NA pool, já tinha TAXA_MAX = 50. A
  // guarda existia no sentido inofensivo e faltava no perigoso.)
  const { raridade, ovoId } = req.body;
  if (!raridade || raridade === 'Comum' || !ovoId) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' });
  }

  const playerRef = db.collection('players').doc(uid);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const [playerSnap, poolSnap] = await Promise.all([tx.get(playerRef), tx.get(poolRef)]);
      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const pData    = playerSnap.data();
      const poolData = poolSnap.exists ? poolSnap.data() : { cristais: 0, saqueHoje: 0 };

      // Validar ovo
      const slotIdx    = pData.activeSlotIdx ?? pData.gs?.activeSlot ?? pData.activeSlot ?? 0;
      const activeSlot = (pData.avatarSlots || [])[slotIdx];
      const eggs       = activeSlot?.eggs || [];
      const ovoIdx     = eggs.findIndex(e => String(e.id) === String(ovoId) && e.raridade === raridade);
      if (ovoIdx === -1) throw new Error('Ovo não encontrado no inventário.');
      /* O ovo tem de ter sido emitido pelo servidor.
         Isto lia os ovos de activeSlot.eggs e mais nada — e esse array vem
         do avatarSlots, que o cliente escreve por inteiro. Escrever um ovo
         Lendário num slot e vendê-lo era dinheiro da pool a sair por um ovo que
         nunca existiu. O ovosEmitidos é a prova, escrito pelo
         handleBotarOvo e fora do alcance do cliente (firestore.rules). */
      const _emitidos = pData.ovosEmitidos || {};
      if (_emitidos['o' + String(ovoId)] !== raridade) {
        throw new Error('OVO_SEM_REGISTO');
      }


      // Ovo apodrecido não vale cristais — no jogo é descartado sem prémio.
      const ovoAlvo = eggs[ovoIdx];
      if (ovoAlvo.expiraEm && Date.now() >= ovoAlvo.expiraEm) {
        throw new Error('Este ovo apodreceu e já não vale cristais.');
      }

      // O valor sai daqui, do servidor, e não do pedido.
      const finalGems = _valorDaQueima(raridade, activeSlot?.raridade);
      if (!finalGems) throw new Error('Esta raridade não pode ser queimada por cristais.');

      if ((poolData.cristais || 0) < finalGems) throw new Error('Pool sem saldo suficiente.');
      if (saqueDeHoje(poolData) >= POOL_LIMITE_DIA) throw new Error('Limite diário global da pool atingido.');

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
        // O registo morre com o ovo, senão valia para uma segunda venda
        // depois de o cliente o repor no avatarSlots.
        [`ovosEmitidos.o${ovoId}`]: FieldValue.delete(),
      });
      tx.update(poolRef, Object.assign({
        cristais:  FieldValue.increment(-finalGems),
        totalSaiu: FieldValue.increment(finalGems),
      }, marcarSaque(poolData, finalGems, FieldValue)));
      const logRef = poolRef.collection('logs').doc();
      tx.set(logRef, {
        tipo: 'saida', motivo: `Queima de ovo ${raridade}`,
        origem: uid, total: finalGems, pool: -finalGems,
        ts: FieldValue.serverTimestamp(),
      });

      return { novosCristais, finalGems };
    });

    return res.status(200).json({ ok: true, novosCristais: resultado.novosCristais, gems: resultado.finalGems });

  } catch (err) {
    console.error('[pool/queimar-ovo]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}

// ── Botar ovo (server-side, relógio do servidor) ────────────────
// A raridade do ovo. O cliente tinha uma cópia disto que estava morta —
// quem decide é aqui, e é por isso que o bônus dos vitais que só existia
// lá nunca aconteceu.
function _calcEggRarity(raridade, nivel, vinculo, vitals) {
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
  // Bicho bem cuidado bota ovo melhor. Estava escrito na função morta do
  // cliente e nunca chegou a valer nada — agora vale, e é o motivo mais
  // direto que o jogo tem para você manter os medidores em cima.
  const v = vitals || {};
  const bemCuidado = ['fome','humor','energia','saude','higiene']
    .every(k => (v[k] ?? 0) > 80);
  if (bemCuidado && c[2] < 95) { c[1] = Math.max(0, c[1]-5); c[2] = Math.min(95, c[2]+5); }
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

      /* A raridade do avatar decide a QUALIDADE dos ovos: o
         _calcEggRarity dá ao Lendário 55% de chance de ovo lendário contra
         2% do Comum. Vinha de slot.raridade — do avatarSlots, que o
         cliente escreve. Escrever 'Lendário' num slot era fabricar ovos
         lendários a 55%, e daí para cristais e MATIC.
         Agora vem do avataresEmitidos, que o handleChocarOvo escreve com a
         raridade do ovo consumido. Sem registo, vale Comum — que é o que
         um avatar sem proveniência deve valer. */
      const _avEmitidos = pData.avataresEmitidos || {};
      const raridade = _avEmitidos['s' + String(slot.seed)] || 'Comum';
      // Dois ovos para todos, e 24h para todos. Antes eram 1/2/3 ovos com
      // esperas de 24h/48h/36h, e daí saíam duas coisas tortas: o Raro
      // produzia exatamente no mesmo ritmo que o Comum (2 em 48h = 1 em
      // 24h), e o Comum pagava 50🪙 por ovo contra 25🪙 do Raro — o avatar
      // mais fraco pagando o dobro.
      //
      // Agora a raridade decide a QUALIDADE do ovo, não a quantidade: a
      // tabela de _calcEggRarity já dá ao Lendário 55% de chance de ovo
      // lendário contra 2% do Comum. Não precisa somar volume a isso.
      const numEggs  = 2;
      const slotEggs = slot.eggs || [];
      const canAdd   = Math.min(numEggs, 10 - slotEggs.length);
      if (canAdd <= 0) throw new Error('Inventário de ovos cheio (máx 10)');

      const novosOvos = [];
      for (let i = 0; i < canAdd; i++) {
        const r        = _calcEggRarity(raridade, slot.nivel || 1, slot.vinculo || 0, slot.vitals);
        const baseDias = r === 'Lendário' ? 30 : r === 'Raro' ? 14 : 7;
        // Alma Gêmea (vínculo 301+) dobra a validade. O getVinculoBonus()
        // do cliente promete isto no campo eggDura desde sempre e ninguém
        // o implementava — era o único benefício do último patamar que
        // não valia nada.
        const duraMult = (slot.vinculo || 0) >= 301 ? 2 : 1;
        novosOvos.push({ raridade: r, elemento: slot.elemento || 'Terra',
                         expiraEm: now + baseDias * duraMult * 86400000, id: now + i });
      }

      const cdMs     = 24 * 3600000;
      const newReady = now + cdMs;

      /* O servidor passa a lembrar-se do que emitiu.
         Sem isto, o handleListarOvo não tinha como aceitar um ovo posto
         pelo próprio avatar: ele vive em avatarSlots[].eggs, que o cliente
         escreve por inteiro, e confiar nisso era deixar fabricar
         Lendários. Só que a alternativa era não os deixar vender de todo —
         que é o que acontecia, e é o defeito que isto corrige.
         O registo é a resposta: guarda-se id → raridade num campo que só o
         servidor escreve (ver camposDoServidor em firestore.rules). Na
         listagem confere-se contra ele, e a entrada é apagada, para o
         mesmo ovo não ser vendido duas vezes. */
      // A chave leva um 'o' à frente porque um caminho de campo do
      // Firestore não aceita segmentos só de dígitos, e os ids dos ovos
      // são Date.now(). Sem o prefixo, a escrita vinha com 400.
      const emitidos = {};
      for (const o of novosOvos) emitidos[`ovosEmitidos.o${o.id}`] = o.raridade;

      const newSlots = [...slots];
      newSlots[slotIdx] = { ...slot, eggs: [...slotEggs, ...novosOvos], eggLayReadyAt: newReady, eggLayCooldown: Math.ceil(cdMs / 60000) };
      tx.update(playerRef, Object.assign({ avatarSlots: newSlots, 'gs.moedas': moedas - 50 }, emitidos));

      return { eggs: novosOvos, novasMoedas: moedas - 50, eggLayReadyAt: newReady };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    console.error('[pool/botar-ovo]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}
