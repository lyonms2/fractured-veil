// ═══════════════════════════════════════════════════════════════
//  api/nomes.js — Vercel Serverless Function
//
//  POST /api/nomes { acao, idToken, ... }
//    acao='jogador' → reserva o nome de quem joga   { nome }
//    acao='avatar'  → reserva o nome de um avatar   { avatarId, nome }
//
//  Devolve { ok:true, nome } com o nome já limpo, que é o que o
//  cliente deve gravar — e não o que o jogador digitou.
//
//  Os erros que interessam ao jogador vêm com `erro`:
//    TOMADO   alguém chegou antes
//    FORMA    não sobrou nome depois da limpeza
//    SEM_AVATAR / JA_BATIZADO   só na ação 'avatar'
// ═══════════════════════════════════════════════════════════════
//
//  POR QUE ISTO É UM ENDPOINT E NÃO UMA REGRA
//
//  Duas pessoas escrevendo "Kael" no mesmo segundo, em máquinas
//  diferentes, não têm como saber uma da outra. Só quem está no meio
//  sabe. A transação abaixo é esse meio: ela lê e escreve o documento
//  do índice num movimento só, e a segunda pessoa perde.
//
//  É o mesmo desenho do código de amigo (o `codigosAmigo`, em
//  api/amigos.js), e a coleção `nomes` está fechada ao cliente nas
//  regras pela mesma razão: quem pudesse gravar nela reservaria o nome
//  dos outros de brincadeira.
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

// A forma de um nome e a chave do índice, compartilhadas com o
// navegador — que avisa antes de mandar, mas não decide.
const N = require('../js/nomes.js');

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

/* ── A RESERVA ──

   Uma transação, três finais:

     livre            cria o documento e devolve ok
     já é seu         devolve ok sem escrever nada — chamar duas vezes
                      com o mesmo nome não pode dar erro, senão um clique
                      repetido ou uma rede lenta viram uma recusa
     é de outro       TOMADO

   O `antiga` libera a chave anterior no mesmo movimento. Hoje o nome
   do jogador é pedido uma vez e não se troca, então ela quase nunca
   entra — mas a transação é o único lugar onde trocar um nome pode ser
   atômico, e escrevê-la agora é mais barato que descobrir isso depois.
   Um nome de avatar nunca passa por aqui: o batismo é definitivo. */
async function _reservar(db, chave, doc, antiga) {
  const ref = db.collection('nomes').doc(chave);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const d = snap.data() || {};
      const meu = d.uid === doc.uid
        && (doc.avatarId == null || d.avatarId === doc.avatarId);
      if (!meu) return 'TOMADO';
      return 'JA_ERA_SEU';
    }
    tx.set(ref, doc);
    if (antiga && antiga !== chave) {
      tx.delete(db.collection('nomes').doc(antiga));
    }
    return 'OK';
  });
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { db, auth } = initAdmin();
  const { acao, idToken, nome, avatarId } = req.body || {};

  let uid;
  try {
    uid = await verificarToken(auth, idToken);
  } catch (e) {
    return res.status(401).json({ erro: 'Sessão inválida.' });
  }

  const tipo = acao === 'avatar' ? 'avatar' : 'jogador';
  const lim   = tipo === 'avatar' ? N.NOME_AVATAR_LIM : N.NOME_JOGADOR_LIM;
  const limpo = N.nomeLimpo(nome, lim);
  const chave = N.nomeChave(nome, tipo);
  // A forma é conferida aqui de novo, e não só no navegador: o navegador
  // é de quem chama.
  if (!chave || N.nomeProblema(nome, tipo)) {
    return res.status(400).json({ erro: 'FORMA' });
  }

  try {
    // ── O NOME DE QUEM JOGA ──────────────────────────────────
    if (tipo === 'jogador') {
      const playerRef = db.collection('players').doc(uid);
      const snap = await playerRef.get();
      const atual = snap.exists ? (snap.data().nomeJogador || null) : null;
      const chaveAtual = atual ? N.nomeChave(atual, 'jogador') : null;

      const fim = await _reservar(db, chave,
        { tipo: 'jogador', nome: limpo, uid, em: Date.now() },
        chaveAtual);
      if (fim === 'TOMADO') return res.status(409).json({ erro: 'TOMADO' });

      /* Quem grava o nome no documento do jogador é o servidor, e é por
         isso que o `nomeJogador` entrou na lista de campos protegidos do
         firestore.rules. O cliente deixou de o enviar no save (ver
         _dadosParaSalvar, em js/firebase.js): se o enviasse com um valor
         diferente deste, a regra recusaria o save INTEIRO e o jogo
         parava de salvar sem dizer por quê. */
      await playerRef.set({ nomeJogador: limpo }, { merge: true });
      return res.status(200).json({ ok: true, nome: limpo, novo: fim === 'OK' });
    }

    // ── O NOME DE UM AVATAR ──────────────────────────────────
    const id = String(avatarId || '');
    if (!id) return res.status(400).json({ erro: 'SEM_AVATAR' });

    /* O avatar tem de ser SEU, e tem de estar por batizar.

       As duas coisas são lidas do avatarSlots, que o cliente grava por
       inteiro — então isto estreita a porta e não a fecha, como o
       `mortos` e o `niveis` (ver firestore.rules). O que fica fechado de
       verdade é o índice: quem contornar isto fica com um nome repetido
       no próprio save e sem reserva nenhuma, e é a reserva que vale. */
    const snap = await db.collection('players').doc(uid).get();
    const slots = snap.exists ? (snap.data().avatarSlots || []) : [];
    const meu = slots.find(s => s && s.id === id);
    if (!meu)            return res.status(404).json({ erro: 'SEM_AVATAR' });
    if (meu.nomeTravado) return res.status(409).json({ erro: 'JA_BATIZADO' });

    const fim = await _reservar(db, chave,
      { tipo: 'avatar', nome: limpo, uid, avatarId: id, em: Date.now() },
      null);
    if (fim === 'TOMADO') return res.status(409).json({ erro: 'TOMADO' });

    // Quem grava o nome no slot é o cliente, que é quem grava o slot
    // inteiro. Daqui vai só a reserva e o nome já limpo.
    return res.status(200).json({ ok: true, nome: limpo, novo: fim === 'OK' });
  } catch (err) {
    console.error('[nomes]', err);
    return res.status(500).json({ erro: 'Erro ao reservar o nome.' });
  }
};

module.exports = handler;
/* O _reservar sai para fora para poder ser testado sozinho (ver
   tools/testar-nomes.js): é a única parte disto que decide alguma
   coisa, e a única onde duas pessoas se cruzam. */
module.exports._reservar = _reservar;
