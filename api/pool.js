// ═══════════════════════════════════════════════════════════════
//  api/pool.js — Vercel Serverless Function
//
//  GET  /api/pool              → dados da pool
//  GET  /api/pool?logs=1       → histórico de transacções
//  GET  /api/pool?cobertura=1  → o cofre chega para os cristais que existem
//  POST /api/pool { acao, idToken, ... }
//    acao='taxa'        → entrada na pool (taxa de listagem/venda)
// ═══════════════════════════════════════════════════════════════

const { ethers }                       = require('ethers');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');
const CRIS = require('./_cristais.js');   // os dois baldes de cristais

/* O POOL_ALVO, o POOL_LIMITE_DIA, o saqueDeHoje e o marcarSaque saíram
   daqui com a queima de ovos. Continuam vivos no _pool-economia.js, que
   é quem os empresta ao api/cambiar.js — a saída da pool que restou. */
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

// ═══════════════════════════════════════════════════════════════
// COBERTURA — o cofre chega para os cristais que existem?
//
// A pool nunca CRIA cristais: o cambio tira-lhe exactamente o que da ao
// jogador, o PvP paga com as apostas dos dois, e os convites saem do que
// se saca. A unica emissao e a compra em MATIC, e as duas taxas batem
// certo (10 💎 por MATIC a comprar, 10 por MATIC a resgatar), portanto a
// cobertura e 1:1 por construcao.
//
// Mas ninguem estava Confirmando isso. Este numero e o unico que responde
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
  if (acao === 'morreu')      return handleMorreu(req, res, db, uid);
  if (acao === 'cruzar')      return handleCruzar(req, res, db, uid);
  if (acao === 'chocar-ovo')  return handleChocarOvo(req, res, db, poolRef, uid);
  if (acao === 'invocar')     return handleInvocar(req, res, db, uid);

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

/* ── AS DUAS PORTAS DA POOL PARA O JOGADOR FECHARAM-SE ──

   Viveram aqui dois handlers de queima de ovos, e nos dois o ovo era
   destruído e a pool pagava em cristais — nunca houve comprador. Um a
   preço fixo (2 💎 o Raro, 6 o Lendário), outro a preço dinâmico
   conforme o saldo, com limite semanal de 1 a 5 conforme a pool.

   O de preço fixo saiu primeiro, por ser o mesmo acto com outro nome e
   por escapar às duas defesas: ignorava o ratio, portanto pagava quatro
   vezes mais justamente com a pool baixa, e não contava para o limite
   semanal.

   O dinâmico ficou marcado, fora de alcance: os ovos deixaram de ter
   raridade e a primeira linha dele só aceitava raridade diferente de
   Comum. Sai agora, e com ele o semanaAtual, o POOL_ALVO e o
   poolVendasLog, que só ele escrevia.

   O QUE ISTO SIGNIFICA PARA A ECONOMIA, dito com todas as letras: o
   jogador já não tem forma de tirar cristais da pool DESTRUINDO alguma
   coisa. A saída que resta é o câmbio (api/cambiar.js), que troca
   moedas por cristais com nível 20 à entrada, tecto diário por
   raridade e o tecto global de 100 💎/dia da própria pool.

   O que provavelmente substitui isto: queimar o AVATAR, agora que é
   ele que conquista a raridade. Hoje queimar um avatar não paga nada —
   só liberta o slot. Mas isso é economia, e a economia é conversa à
   parte.

   O ovosEmitidos ficou sem ninguém que o leia: era a prova que este
   handler exigia. Continua protegido nas firestore.rules, porque um
   campo fechado que ninguém escreve não custa nada e reabri-lo custa
   um deploy. */

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
/* ═══════════════════════════════════════════════════════════════════
   INVOCAR — o servidor emite a certidão do primeiro avatar

   ── O QUE ISTO FECHA ──

   O DNA saía do navegador. O js/summon.js sorteava o seed, corria o
   gerarDna e escrevia a certidão no slot; o servidor guardava o que
   recebesse. Quem abrisse o console escolhia os genes — corpo, índole,
   cor, tendência, vigor — e escolhia também o SEED, que decide o corpo
   inteiro e a ficha de combate.

   Agora os dois saem daqui, do gerador criptográfico do Node, e o
   jogador vê o resultado depois de estar decidido.

   ── ONDE A CERTIDÃO PASSA A VIVER ──

   Num mapa `certidoes` no topo do documento, e não dentro do
   avatarSlots. A razão é o que as regras conseguem exprimir: o
   avatarSlots é um ARRAY, e as regras do Firestore não sabem percorrer
   arrays — não há como escrever "o cliente não pode mexer no nascimento
   de nenhum slot". Um campo de topo elas sabem proteger, e é o que o
   camposDoServidor() já faz com o ovosEmitidos e o avataresEmitidos.

   O cliente lê o mapa e reata cada certidão ao seu slot em memória (ver
   applyGameState, em js/firebase.js), portanto os quarenta sítios que
   leem slot.nascimento continuam a ler o mesmo.

   ── O QUE ISTO NÃO FECHA ──

   O custo em moedas. As moedas são creditadas no cliente em doze sítios
   e ficaram deliberadamente forjáveis (ver firestore.rules); policiá-las
   aqui não fecha nada e parava o jogo. O que se fecha é o que vale: os
   genes.
   ═══════════════════════════════════════════════════════════════════ */
// Quantas invocações grátis tem um jogador na vida. O mesmo número está
// no js/state.js para a interface saber o que dizer; quem RECUSA é este.
const INVOCACOES_GRATIS = 3;

async function handleInvocar(req, res, db, uid) {
  const GEN = require('./_genetica.js');
  const playerRef = db.collection('players').doc(uid);

  try {
    const saida = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) throw new Error('SEM_JOGADOR');
      const pData = snap.data();

      const slots   = [...(pData.avatarSlots || [])];
      const slotIdx = parseInt(req.body.slotIdx, 10);
      if (isNaN(slotIdx) || slotIdx < 0 || slotIdx >= 10) throw new Error('SLOT_INVALIDO');

      /* O slot tem de estar VAZIO. Sem isto, invocar por cima de um
         avatar vivo era uma forma de trocar de bicho até sair um bom —
         e de deitar fora o que lá estivesse sem o queimar. */
      const ocupado = slots[slotIdx];
      if (ocupado && (ocupado.hatched || ocupado.nascimento || ocupado.certidaoId)) {
        throw new Error('SLOT_OCUPADO');
      }

      /* ── TRÊS NA VIDA, E ACABOU ──

         Não são "três antes de começar a pagar": é o total que um jogador
         invoca, e a partir daí os avatares vêm da loja.

         A conta vive AQUI, num campo que o cliente não escreve
         (`invocacoesUsadas`, em firestore.rules). Antes vivia no
         gs.totalInvocacoes, dentro do documento que o cliente escreve
         por inteiro — pôr o número a zero e invocar outra vez era uma
         linha no console.

         Conta INVOCAÇÕES e não avatares vivos: queimar um não devolve a
         vaga, senão invocar-queimar-invocar dava tentativas infinitas
         para caçar a cor ou a ficha ideal. */
      const usadas = pData.invocacoesUsadas || 0;
      if (usadas >= INVOCACOES_GRATIS) throw new Error('SEM_INVOCACOES');

      /* ── UM DE CADA FEITIO ──

         As três invocações grátis saem Guarda, Lâmina e Sustentação, por
         esta ordem. O feitio decide o que um avatar sabe fazer
         (FU_LUGARES_DO_FEITIO, em js/magias-fu.js), e três sorteados ao
         acaso podiam dar três Lâminas — uma primeira equipa sem cura nem
         defesa, a perder sem que o jogador perceba porquê.

         É a ÚNICA vez que o feitio não é sorteado. Do primeiro ovo em
         diante volta a sair do DNA e a herdar-se dos pais, e aí uma
         equipa desequilibrada passa a ser uma escolha de quem cruzou.

         Pelo `usadas` e não por um contador à parte: ele já vive no
         documento que o cliente não escreve, e já é ele que diz quantas
         invocações restam. Dois contadores da mesma coisa acabam por
         discordar. */
      const ORDEM_DOS_FEITIOS = ['guarda', 'lamina', 'sustentacao'];
      const { id, seed, nascimento } = GEN.certidaoDeInvocacao(
        { uid, nome: pData.nomeJogador || null },
        ORDEM_DOS_FEITIOS[usadas] || null);

      /* A certidão vai para o mapa do servidor, e o registo de emissão
         com ela — é o avataresEmitidos que o api/comprar-avatar.js exige
         para deixar listar. Sem esta linha, um avatar invocado nunca
         poderia ser vendido. */
      tx.update(playerRef, {
        [`certidoes.${id}`]: nascimento,
        [`avataresEmitidos.s${String(seed)}`]: 'Comum',
        invocacoesUsadas: usadas + 1,
      });

      return { id, seed, nascimento, invocacoesUsadas: usadas + 1 };
    });

    return res.status(200).json({ ok: true, ...saida });
  } catch (err) {
    const conhecido = {
      SEM_JOGADOR:   [404, 'Jogador não encontrado.'],
      SLOT_INVALIDO: [400, 'Slot inválido.'],
      SLOT_OCUPADO:  [409, 'Esse slot já tem um avatar.'],
      SEM_INVOCACOES:[403, 'As invocações gratuitas acabaram. Os próximos avatares compram-se na loja.'],
    }[err.message];
    if (conhecido) return res.status(conhecido[0]).json({ erro: conhecido[1] });
    console.error('[pool/invocar]', err.message);
    return res.status(500).json({ erro: 'Erro interno ao invocar.' });
  }
}


/* ═══════════════════════════════════════════════════════════════════
   MORREU — a morte fica registada fora do alcance do cliente

   O `dead` vive dentro do avatarSlots, que o cliente escreve por
   inteiro: pôr `false` num avatar morto devolvia-lhe a vida, e com ela
   o direito de lutar, de cruzar e de ser vendido. Um avatar morto vale
   zero; ressuscitá-lo era recuperar o que ele valia.

   Aqui a morte, uma vez sabida, não se desfaz — o mapa `mortos` é do
   servidor (firestore.rules) e o applyGameState força o `dead` a partir
   dele.

   ── PORQUE É QUE ISTO NÃO PRECISA DE VALIDAR NADA ──

   O servidor não tem como confirmar que o bicho morreu: quem conta o
   tempo e os medidores é o navegador. Aceita-se o que o jogador diz —
   e pode-se, porque este pedido só sabe fazer mal a quem o faz. Um
   jogador que declare a morte de um avatar seu está a destruir o seu
   próprio bem, e não há nada a ganhar com isso. Um pedido que só
   prejudica quem o envia dispensa guarda.

   ── E O QUE ISTO NÃO FECHA, DITO COM TODAS AS LETRAS ──

   Quem modificar o jogo para nunca chamar isto continua a poder
   ressuscitar o bicho. O que deixa de funcionar é editar o documento,
   que era o que estava ao alcance de qualquer um. Fechá-la de vez
   exigia o servidor a contar o tempo e os medidores — a mesma conversa
   do nível e do vínculo, que continua por ter.
   ═══════════════════════════════════════════════════════════════════ */
async function handleMorreu(req, res, db, uid) {
  const { slotIdx } = req.body;
  const i = Number(slotIdx);
  if (!Number.isInteger(i) || i < 0) return res.status(400).json({ erro: 'Slot inválido.' });

  const playerRef = db.collection('players').doc(uid);

  try {
    const saida = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) throw new Error('SEM_JOGADOR');

      const slot = (snap.data().avatarSlots || [])[i];
      // Sem id não há a quem prender a morte. Não é erro: é um avatar
      // dos antigos, e esse continua como estava.
      if (!slot || !slot.id) return { registado: false };

      tx.update(playerRef, { [`mortos.${slot.id}`]: Date.now() });
      return { registado: true, id: slot.id };
    });

    return res.status(200).json({ ok: true, ...saida });
  } catch (err) {
    if (err.message === 'SEM_JOGADOR') return res.status(404).json({ erro: 'Jogador não encontrado.' });
    console.error('[pool/morreu]', err.message);
    return res.status(500).json({ erro: 'Erro interno.' });
  }
}


/* ═══════════════════════════════════════════════════════════════════
   CRUZAR — o servidor compõe o filho

   ── O QUE ISTO FECHA ──

   O DNA de um filho saía do navegador. O confirmarCruzar (js/fazenda.js)
   chamava o cruzar() do js/reproducao.js, punha o ovo no slot, e o
   avatarSlots seguia para o Firestore com o ovo lá dentro — num array
   que o cliente escreve por inteiro. Havia três formas de o forjar, e
   nenhuma exigia mais do que o console:

     · escrever o DNA do ovo à mão, gene a gene
     · escolher o SEED da cruza, que decide de que lado vem cada alelo,
       e repetir até sair o filho desejado
     · pôr um ovo no slot sem ter cruzado coisa nenhuma

   O terceiro era o mais caro: um ovo é um avatar, e um avatar vende-se
   por cristais, que saem em MATIC.

   ── ONDE O OVO PASSA A VIVER ──

   Num mapa `ovos` no topo do documento, ao lado do `certidoes` e pela
   mesma razão: o avatarSlots é um ARRAY e as regras do Firestore não
   sabem percorrer arrays. Um campo de topo protege-se numa linha.

   O `slot.eggs` continua a existir e o cliente continua a escrevê-lo —
   mas só para dizer ONDE está cada ovo. O que o ovo É lê-se do mapa, e
   um ovo que lá não esteja não existe (ver applyGameState, em
   js/firebase.js, e o handleChocarOvo aqui em baixo).

   ── O QUE ISTO NÃO FECHA ──

   Os pais são lidos do avatarSlots, portanto o nível e o vínculo com
   que o podeCruzar decide continuam a ser do cliente. Quem os forje
   cruza mais cedo do que devia — mas o FILHO que sai dessa cruza é
   composto aqui, dos genes que os pais têm mesmo (que vivem no
   `certidoes`), com um seed que o servidor sorteia. Fecha-se o que vale.
   ═══════════════════════════════════════════════════════════════════ */
const OVOS_MAX = 10;

async function handleCruzar(req, res, db, uid) {
  const GEN = require('./_genetica.js');
  const { maeIdx, paiIdx } = req.body;
  const iA = Number(maeIdx), iB = Number(paiIdx);
  if (!Number.isInteger(iA) || !Number.isInteger(iB) || iA < 0 || iB < 0 || iA === iB) {
    return res.status(400).json({ erro: 'Parâmetros inválidos.' });
  }

  const playerRef = db.collection('players').doc(uid);

  try {
    const saida = await db.runTransaction(async (tx) => {
      const snap = await tx.get(playerRef);
      if (!snap.exists) throw new Error('SEM_JOGADOR');

      const pData     = snap.data();
      const slots     = pData.avatarSlots || [];
      const certidoes = pData.certidoes || {};
      const ovos      = pData.ovos || {};

      /* A certidão reata-se ao slot AQUI, e não se aceita a que venha
         no slot: é do mapa que o cliente não escreve que saem os genes
         com que este filho vai ser composto. Um slot com um
         `nascimento` escrito à mão não traz gene nenhum para aqui. */
      const doSlot = (i) => {
        const s = slots[i];
        if (!s) return null;
        const cert = s.id ? certidoes[s.id] : null;
        if (!cert) return null;
        return Object.assign({}, s, { nascimento: cert });
      };

      const a = doSlot(iA), b = doSlot(iB);
      if (!a || !b) throw new Error('SEM_CERTIDAO');

      /* O limite conta os ovos que o jogador TEM, e não os do slot
         activo como o cliente conta. É o mesmo número visto de mais
         longe: o cliente pergunta "cabe aqui?", o servidor pergunta
         "quantos é que este jogador já tem?" — e é essa a pergunta que
         impede alguém de encher a colónia com ovos a saltar de slot. */
      const r = GEN.ovoDeCruza(a, b, {
        ovosNoInventario: Object.keys(ovos).length, maxOvos: OVOS_MAX,
      });
      // O motivo é uma chave de tradução, e vai como está: quem sabe
      // dizê-la ao jogador na língua dele é o cliente.
      if (!r.ok) throw new Error('RECUSA:' + r.motivo);

      tx.update(playerRef, { [`ovos.${r.ovo.id}`]: r.ovo });
      return { ovo: r.ovo };
    });

    return res.status(200).json({ ok: true, ...saida });
  } catch (err) {
    if (String(err.message).startsWith('RECUSA:')) {
      return res.status(400).json({ erro: 'Não é possível cruzar.', motivo: err.message.slice(7) });
    }
    const conhecido = {
      SEM_JOGADOR:  [404, 'Jogador não encontrado.'],
      SEM_CERTIDAO: [400, 'Um dos avatares não tem certidão emitida pelo servidor.'],
    }[err.message];
    if (conhecido) return res.status(conhecido[0]).json({ erro: conhecido[1] });
    console.error('[pool/cruzar]', err.message);
    return res.status(500).json({ erro: 'Erro interno ao cruzar.' });
  }
}


async function handleChocarOvo(req, res, db, poolRef, uid) {
  const GEN = require('./_genetica.js');
  const { ovoId } = req.body;
  if (!ovoId) return res.status(400).json({ erro: 'Parâmetros inválidos.' });

  const playerRef = db.collection('players').doc(uid);

  try {
    const saida = await db.runTransaction(async (tx) => {
      const [playerSnap, poolSnap] = await Promise.all([tx.get(playerRef), tx.get(poolRef)]);
      if (!playerSnap.exists) throw new Error('SEM_JOGADOR');

      const pData = playerSnap.data();

      /* ── A PROVA DE QUE O OVO EXISTE É ELE ESTAR NO MAPA ──

         Eram duas provas, uma por origem: estar no `inboxEggs` (que o
         servidor enchia quando havia venda de ovos) ou ter registo no
         `ovosEmitidos` (que o servidor escrevia quando um avatar punha
         ovos sozinho). As duas coisas acabaram — a venda de ovos e a
         postura sozinha — e com elas acabou quem escrevia essas provas.

         O resultado foi um bloqueio: o único ovo que o jogo produz hoje
         é o de uma cruza, ele nasce no `slot.eggs` e não tem registo em
         lado nenhum, portanto NENHUM ovo cruzado conseguia chocar.

         Agora a prova é uma só, e é a mesma para todos: o ovo está no
         mapa `ovos`, que só o handleCruzar escreve. */
      const ovos = pData.ovos || {};
      const ovo  = ovos[String(ovoId)];
      if (!ovo) throw new Error('OVO_NOT_FOUND');

      const taxa = HATCH_FEE;
      const debitoChoca = taxa > 0 ? CRIS.camposDebito(pData, taxa) : null;
      if (taxa > 0 && !debitoChoca) throw new Error('INSUFFICIENT');

      /* O SEED sai daqui, e é a segunda metade do que a cruza já fechou.

         Vinha no pedido, sorteado pelo Math.random do navegador. O seed
         decide o corpo inteiro do bicho e a ficha de combate — quem
         insistisse sorteava até gostar, e o ovo não se gastava enquanto
         não gostasse. */
      const { id, seed, nascimento } = GEN.certidaoDeChoco(ovo,
        { uid, nome: pData.nomeJogador || null });

      /* O ovo sai do mapa no mesmo movimento em que o avatar entra.
         Sem isto ele ficava a valer para uma segunda chocagem: um ovo,
         dois avatares. */
      const alteracoes = {
        [`certidoes.${id}`]: nascimento,
        [`avataresEmitidos.s${String(seed)}`]: 'Comum',
        [`ovos.${String(ovoId)}`]: FieldValue.delete(),
      };

      if (taxa > 0) {
        Object.assign(alteracoes, debitoChoca);
        tx.update(poolRef, {
          cristais:    FieldValue.increment(taxa),
          totalEntrou: FieldValue.increment(taxa),
        });
      }

      tx.update(playerRef, alteracoes);
      return { id, seed, nascimento, raridade: 'Comum', taxa };
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


/* ── A POSTURA SOZINHA ACABOU ──

   Vivia aqui o handleBotarOvo: um avatar adulto pagava 50 moedas e
   punha dois ovos por conta própria, de 24 em 24 horas. Com ele vivia o
   _calcEggRarity, que sorteava a raridade do ovo, e depois o
   _validadeDoOvo, que lhe media a validade pelo nível, pelo vínculo e
   pelos cinco medidores.

   Os três saíram, e a razão é uma só: o ovo passou a ser um FILHO. Tem
   mãe e pai, e o DNA dele sai do cruzamento dos dois. Um avatar a pôr
   ovos sozinho dava um filho com metade da árvore em branco desde o
   primeiro dia — e a genealogia inteira a fingir.

   O QUE O _validadeDoOvo MEDIA NÃO SE PERDEU. Cuidar bem do bicho e ter
   vínculo alto continuam a valer: passaram para o cruzamento
   (js/reproducao.js), onde decidem quanto tempo o ovo leva a chocar e
   quanto tempo dura. É o mesmo sinal, noutro sítio.

   Com isto o servidor deixa de emitir ovos. O ovosEmitidos, que era a
   prova de que um ovo tinha saído daqui, deixa de receber entradas
   novas — e o handleChocarOvo aceita um ovo que esteja no slot com
   registo OU no inbox. Fica dito: hoje o ovo é posto pelo cliente, e a
   prova de que ele é legítimo é mais fraca do que era. Quem decide se
   isso volta ao servidor é a conversa da economia, com o resto. */
