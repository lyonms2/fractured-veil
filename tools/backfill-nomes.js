#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   BACKFILL DO ÍNDICE DE NOMES

   Desde 26/09/2026 um nome só tem um dono: o de quem joga e o de cada
   avatar batizado ficam reservados na coleção `nomes` (ver js/nomes.js
   e api/nomes.js). Quem foi batizado ANTES disso não tem reserva — e um
   nome sem reserva está livre para o próximo que o peça, que é o
   contrário do que a regra existe para fazer.

   Este script cria as reservas que faltam, a partir do que já está
   gravado.

   ── O QUE ELE FAZ QUANDO DOIS JÁ SE CHAMAM IGUAL ──

   Não escolhe. O primeiro que encontrar fica com o nome, os outros
   ficam listados como CHOQUE e não se reserva nada para eles — eles
   continuam a chamar-se o que se chamam, e o nome deles simplesmente
   não fica travado para ninguém.

   Isso é honesto e é o menos mau: renomear o avatar de alguém sem
   avisar seria pior, e escolher um vencedor por critério nenhum não é
   escolher. Num jogo sem jogadores reais, onde as contas são todas de
   teste, a lista de choques é para se olhar e resolver à mão, se valer
   a pena.

   Corre em seco por omissão. Para gravar, passa --escrever.

     node tools/backfill-nomes.js
     node tools/backfill-nomes.js --escrever

   Precisa das mesmas credenciais que as funções de api/ usam:
     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
═══════════════════════════════════════════════════════════════════ */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const N = require('../js/nomes.js');

const ESCREVER = process.argv.includes('--escrever');

function iniciar() {
  if (getApps().length) return;
  /* Contra o emulador não há credencial nenhuma para dar, e é assim que
     este script se experimenta antes de o apontar para o jogo de
     verdade (ver o tools/pvp-local.js, que semeia contas com nomes). */
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-teste' });
    return;
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error('Faltam FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.');
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId:   FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// O nome de um avatar vive no campo `nome` como "Nome,Alcunha" nos mais
// antigos — a alcunha mudou-se para um índice, mas o campo ficou.
function soONome(bruto) {
  return String(bruto || '').split(',')[0].trim();
}

(async () => {
  iniciar();
  const db = getFirestore();

  console.log(ESCREVER ? '── A ESCREVER ──\n' : '── EM SECO (usa --escrever para gravar) ──\n');

  // O que já está reservado, para não pisar em cima.
  const jaNoIndice = new Map();
  const idx = await db.collection('nomes').get();
  idx.forEach(d => jaNoIndice.set(d.id, d.data()));

  const snap = await db.collection('players').get();
  const aCriar = new Map();   // chave → documento
  const choques = [];
  let jogadores = 0, avatares = 0, jaTinham = 0;

  function pedir(chave, doc, quem) {
    if (!chave) return;
    const dono = jaNoIndice.get(chave) || aCriar.get(chave);
    if (dono) {
      if (dono.uid === doc.uid && dono.avatarId === doc.avatarId) { jaTinham++; return; }
      choques.push(`  ⚠ ${chave.padEnd(22)} ${quem}  (já é de ${dono.uid})`);
      return;
    }
    aCriar.set(chave, doc);
    if (doc.tipo === 'avatar') avatares++; else jogadores++;
    console.log(`  ${chave.padEnd(22)} ${quem}`);
  }

  for (const doc of snap.docs) {
    const d = doc.data();
    const uid = doc.id;

    if (d.nomeJogador) {
      pedir(N.nomeChave(d.nomeJogador, 'jogador'),
        { tipo: 'jogador', nome: N.nomeLimpo(d.nomeJogador, N.NOME_JOGADOR_LIM), uid, em: Date.now() },
        `jogador "${d.nomeJogador}"`);
    }

    for (const s of (d.avatarSlots || [])) {
      // Só os batizados. Um avatar por batizar não tem nome para
      // reservar — tem uma alcunha, que é outra coisa e se repete.
      if (!s || !s.id || !s.nomeTravado) continue;
      const nome = soONome(s.nome);
      if (!nome) continue;
      pedir(N.nomeChave(nome, 'avatar'),
        { tipo: 'avatar', nome: N.nomeLimpo(nome, N.NOME_AVATAR_LIM), uid, avatarId: s.id, em: Date.now() },
        `avatar "${nome}" (${uid.slice(0, 10)}…)`);
    }
  }

  if (ESCREVER && aCriar.size) {
    let lote = db.batch(), n = 0;
    for (const [chave, doc] of aCriar) {
      lote.set(db.collection('nomes').doc(chave), doc);
      // O batch do Firestore vai até 500 escritas.
      if (++n % 400 === 0) { await lote.commit(); lote = db.batch(); }
    }
    await lote.commit();
  }

  console.log(`\n${jogadores} nome(s) de jogador e ${avatares} de avatar.`);
  if (jaTinham) console.log(`${jaTinham} já estavam no índice e ficaram como estavam.`);
  if (choques.length) {
    console.log(`\n${choques.length} nome(s) repetido(s) — nenhum deles foi reservado:`);
    console.log(choques.join('\n'));
  }
  if (!ESCREVER && aCriar.size) console.log('\nNada foi gravado. Repete com --escrever.');
})().catch((e) => { console.error(e); process.exit(1); });
