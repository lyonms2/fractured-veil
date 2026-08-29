#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   BACKFILL DO avataresEmitidos

   O api/comprar-avatar.js passou a exigir que a raridade de um avatar
   esteja registada em avataresEmitidos — um campo que só o servidor
   escreve — em vez de a ler do avatarSlots, que o cliente escreve por
   inteiro. Sem isso, escrever raridade:'Lendário' num slot e listá-lo
   era o caminho mais curto para cristais.

   Avatares que nasceram ANTES disso não têm registo, e por isso não se
   podem listar. Este script cria o registo em falta.

   E aqui está a parte incómoda, que não dá para contornar: para os
   avatares antigos não existe verdade nenhuma do lado do servidor. A
   raridade que este script grava é a que está no avatarSlots — a mesma
   em que não se pode confiar. Correr isto é dizer "aceito o que está lá
   hoje como ponto de partida".

   Isso é razoável num jogo sem jogadores reais, onde as contas são todas
   de teste. Não é razoável depois de haver gente a jogar: aí, quem
   tivesse forjado um Lendário via-o carimbado como legítimo.

   Por isso corre em seco por omissão e diz o que faria. Para escrever
   mesmo, passa --escrever.

     node tools/backfill-avatares.js
     node tools/backfill-avatares.js --escrever

   Precisa das mesmas credenciais que as funções de api/ usam:
     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
═══════════════════════════════════════════════════════════════════ */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');

const ESCREVER = process.argv.includes('--escrever');

function iniciar() {
  if (getApps().length) return;
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

(async () => {
  iniciar();
  const db = getFirestore();

  console.log(ESCREVER ? '── A ESCREVER ──' : '── EM SECO (usa --escrever para gravar) ──\n');

  const snap = await db.collection('players').get();
  let jogadores = 0, avatares = 0, jaTinham = 0;

  for (const doc of snap.docs) {
    const d        = doc.data();
    const slots    = d.avatarSlots || [];
    const emitidos = d.avataresEmitidos || {};
    const novos    = {};

    slots.forEach((s) => {
      if (!s || !s.seed || !s.raridade) return;
      // Comuns não se vendem, portanto não precisam de registo.
      if (s.raridade !== 'Raro' && s.raridade !== 'Lendário') return;
      const chave = 's' + String(s.seed);
      if (emitidos[chave]) { jaTinham++; return; }
      novos[`avataresEmitidos.${chave}`] = s.raridade;
      avatares++;
      console.log(`  ${doc.id.slice(0, 10)}…  ${s.raridade.padEnd(9)} ${s.nome || '(sem nome)'}`);
    });

    if (Object.keys(novos).length === 0) continue;
    jogadores++;
    if (ESCREVER) await doc.ref.update(novos);
  }

  console.log(`\n${avatares} avatar(es) em ${jogadores} jogador(es).`);
  if (jaTinham) console.log(`${jaTinham} já tinham registo e ficaram como estavam.`);
  if (!ESCREVER && avatares) console.log('\nNada foi gravado. Repete com --escrever.');
})().catch((e) => { console.error(e); process.exit(1); });
