// ═══════════════════════════════════════════════════════════════
//  api/pool.js — Vercel Serverless Function
//
//  GET  /api/pool              → dados da pool
//  GET  /api/pool?logs=1       → histórico de transacções
//  GET  /api/pool?cobertura=1  → o cofre chega para os cristais que existem
//  POST /api/pool { acao, idToken, ... }
//    acao='taxa'        → entrada na pool (taxa de listagem/venda)
//    acao='queimar-ovo' → jogador queima ovo e a pool paga (preço dinâmico)
//    acao='botar-ovo'   → avatar bota ovo (relógio do servidor)
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const { POOL_LIMITE_DIA, saqueDeHoje,
        marcarSaque }                  = require('./_pool-economia.js');
const CRIS = require('./_cristais.js');   // os dois baldes de cristais

const POOL_ALVO       = 1000;
// POOL_LIMITE_DIA e saqueDeHoje vêm do _pool-economia.js, para o câmbio
// (em outro arquivo) poder usar exatamente a mesma regra.
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
  // Só o balde COM lastro. O gs.cristaisBonus fica de fora de
  // propósito: bónus não se resgata, portanto não é dívida em MATIC, e
  // somá-lo aqui derrubava a percentagem por uma obrigação inventada.
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
  if (acao === 'queimar-ovo') return handleQueimarOvo(req, res, db, poolRef, uid);
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

/* ⚠ FORA DE ALCANCE, DE PROPÓSITO.

   Este handler queima um ovo Raro ou Lendário e a pool paga por ele em
   cristais, a preço dinâmico. Como já não existem ovos Raros nem
   Lendários, nenhum cliente o chama e a primeira linha recusa tudo o
   resto — só aceita raridade diferente de Comum, e o registo do
   servidor só escreve Comum. Não há por onde entrar.

   NÃO O APAGUEI porque era A ÚNICA SAÍDA DA POOL para o jogador: a
   única forma de tirar valor de lá destruindo alguma coisa. Apagar um
   caminho de dinheiro sem que ninguém o tenha pedido é pior do que o
   deixar marcado.

   O que provavelmente o substitui: queimar o AVATAR, agora que é ele
   que conquista a raridade. Hoje queimar um avatar não paga nada — só
   liberta o slot. Mas isso é economia, e a economia é conversa à parte. */
async function handleQueimarOvo(req, res, db, poolRef, uid) {
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
      // Não há mínimo garantido. Havia um piso de 0,10 no Raro e 0,25
      // no Lendário, e um piso é uma promessa que a pool faz sem saber
      // se a pode cumprir: com a pool quase seca, pagava 0,10 onde o
      // ratio pedia 0,0005 — 200× a mais, justamente no momento em que
      // ela tinha menos. Se a pool não tem, não paga.
      const preco = parseFloat((base * ratio).toFixed(2));
      // Com a pool tão baixa que o preço arredonda a zero, recusa-se em
      // vez de destruir o ovo por nada. O jogador fica com ele para
      // quando a pool recuperar, ou vende-o a outro jogador.
      if (preco <= 0) throw new Error('A pool está demasiado baixa para pagar este ovo. Guarda-o ou vende-o no mercado.');

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
        tipo: 'saida', motivo: `Ovo ${raridade} queimado na pool`,
        origem: uid, total: preco, pool: -preco,
        ts: FieldValue.serverTimestamp(),
      });

      return { preco, novosCristais };
    });

    return res.status(200).json({ ok: true, preco: resultado.preco, novosCristais: resultado.novosCristais });

  } catch (err) {
    console.error('[pool/queimar-ovo]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}

/* A SEGUNDA PORTA PARA A POOL SAIU DAQUI.

   Vivia aqui um segundo handler de queima, com preço FIXO — 2 💎 o Raro,
   6 o Lendário, até 3 e 9 com o bónus do avatar activo.

   O problema não era o preço, era serem dois caminhos para o mesmo acto.
   A transação dele e a do handleQueimarOvo que ficou, acima, eram iguais
   linha a linha: tiravam o ovo do avatarSlots, apagavam a prova em
   ovosEmitidos, creditavam cristais e debitavam a pool com um log de
   saída. Nenhuma delas tinha comprador — as duas destruíam o ovo.

   Só que a do preço fixo escapava às duas defesas da pool:

     o preço  ignorava o ratio. Com a pool baixa pagava 2 💎 onde a
              outra pagava 0,50 — quatro vezes mais, justamente quando
              a pool tinha menos para dar.
     o limite não verificava o poolVendasLog. A que ficou conta para o
              limite semanal (1/2/3/5 conforme a pool); esta era
              ilimitada, travada só pelo tecto global de 100 💎/dia.

   Com as duas portas abertas ninguém tinha motivo para usar a de preço
   dinâmico, e o limite semanal era código morto.

   Fica uma porta só para a pool — o handleQueimarOvo, dinâmico e com
   limite. A outra saída de um ovo raro é o mercado, onde outro jogador
   paga e fica com ele.

   O Comum não passa por aqui: a pool não o aceita, e queima-se no
   cliente por 20 🪙 de moedas internas, que não saem da pool. */

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
/* CHOCAR NÃO CUSTA NADA.

   Custava 50 💎 por um ovo Raro e 100 por um Lendário, e nada pelo
   Comum. Como já não há ovos Raros nem Lendários, a tabela só podia
   devolver zero — e uma tabela cujas duas outras entradas nunca são
   lidas é uma promessa falsa a quem a ler a seguir.

   É uma entrada de cristais que a pool perde. Fica dito, e a decisão do
   que a substitui é da conversa da economia. */
const HATCH_FEE = 0;

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

      /* O ovo tem de existir numa das duas listas E ter prova.

         Guardava-se aqui a raridade dele; já não há nenhuma, e o que
         interessa é apenas se o ovo é legítimo. O 'Comum' que fica é o
         que o avataresEmitidos passa a registar para todos — a origem
         de um avatar, que o api/comprar-avatar.js confere. */
      const legitimo = (idxInbox !== -1) || (idxSlot !== -1 && emitidoComo);
      if (!legitimo) throw new Error('OVO_NOT_FOUND');
      const raridade = 'Comum';

      const taxa     = HATCH_FEE;
      const debitoChoca = taxa > 0 ? CRIS.camposDebito(pData, taxa) : null;
      if (taxa > 0 && !debitoChoca) throw new Error('INSUFFICIENT');

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
        Object.assign(alteracoes, debitoChoca);
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


// ── Botar ovo (server-side, relógio do servidor) ────────────────
/* O SORTEIO DA RARIDADE DO OVO SAIU.

   Vivia aqui o _calcEggRarity: uma tabela que dava ao Lendário 55% de
   probabilidade de pôr um ovo lendário contra 2% do Comum, com bónus por
   vínculo e por bicho bem cuidado.

   Deixou de existir porque o ovo deixou de ter raridade. Todo o avatar
   nasce Comum e a raridade conquista-se a viver (js/raridade.js), portanto
   um ovo lendário não significava nada: dava um bebé Comum como qualquer
   outro. Era um rótulo caro sem nada por baixo.

   O QUE ELE MEDIA NÃO SE PERDEU. Cuidar bem do bicho e ter vínculo alto
   continuam a valer — agora em VALIDADE do ovo, que é tempo para o
   chocar, em vez de num rótulo. Ver _validadeDoOvo, ali abaixo. */
function _validadeDoOvo(nivel, vinculo, vitals) {
  let dias = 7;
  if (nivel >= 35) dias += 3;
  else if (nivel >= 25) dias += 2;
  if (vinculo >= 301) dias += 3;
  else if (vinculo >= 151) dias += 1;
  const v = vitals || {};
  const bemCuidado = ['fome','humor','energia','saude','higiene']
    .every(k => (v[k] ?? 0) > 80);
  if (bemCuidado) dias += 2;
  return dias;
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

      // Dois ovos para todos, e 24h para todos. Antes eram 1/2/3 ovos com
      // esperas de 24h/48h/36h, e daí saíam duas coisas tortas: o Raro
      // produzia exatamente no mesmo ritmo que o Comum (2 em 48h = 1 em
      // 24h), e o Comum pagava 50🪙 por ovo contra 25🪙 do Raro — o avatar
      // mais fraco pagando o dobro.
      const numEggs  = 2;
      const slotEggs = slot.eggs || [];
      const canAdd   = Math.min(numEggs, 10 - slotEggs.length);
      if (canAdd <= 0) throw new Error('Inventário de ovos cheio (máx 10)');

      const novosOvos = [];
      // O que o bicho é e como é tratado paga em VALIDADE: mais dias para
      // chocar. Era aí que estava a raridade do ovo, e a raridade
      // deixou de existir.
      const baseDias = _validadeDoOvo(slot.nivel || 1, slot.vinculo || 0, slot.vitals);
      for (let i = 0; i < canAdd; i++) {
        // Alma Gêmea (vínculo 301+) dobra a validade. O getVinculoBonus()
        // do cliente promete isto no campo eggDura desde sempre e ninguém
        // o implementava — era o único benefício do último patamar que
        // não valia nada.
        const duraMult = (slot.vinculo || 0) >= 301 ? 2 : 1;
        novosOvos.push({ elemento: slot.elemento || 'Terra',
                         expiraEm: now + baseDias * duraMult * 86400000, id: now + i });
      }

      const cdMs     = 24 * 3600000;
      const newReady = now + cdMs;

      /* O servidor lembra-se do que emitiu.

         O avatarSlots[].eggs é escrito pelo cliente por inteiro, portanto
         um ovo que esteja lá não prova nada — qualquer um podia
         acrescentar ovos à lista. Este registo é a prova, e vive num
         campo que só o servidor escreve (ver camposDoServidor em
         firestore.rules).

         Guardava id → raridade, para o mercado de ovos poder conferir que
         um ovo Lendário era mesmo Lendário. O mercado saiu e a raridade
         também; fica id → 'Comum', que continua a servir para o que
         importa — dizer que este ovo saiu daqui. O valor mantém-se com
         esta forma para o handleChocarOvo, que o lê, não precisar de
         migração nenhuma. */
      // A chave leva um 'o' à frente porque um caminho de campo do
      // Firestore não aceita segmentos só de dígitos, e os ids dos ovos
      // são Date.now(). Sem o prefixo, a escrita vinha com 400.
      const emitidos = {};
      for (const o of novosOvos) emitidos[`ovosEmitidos.o${o.id}`] = 'Comum';

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
