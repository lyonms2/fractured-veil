#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   DAR UM OVO A UM JOGADOR (ferramenta de desenvolvimento)

   Existe por uma razão prática: numa conta nova não há como obter um ovo.

     botar ovo    exige fase adulta — nível 17 E vinte horas de jogo real
                  (FASE_MIN_SECS em js/state.js)
     comprar ovo  compra-se no eggMarket, que só tem listagens de outros
                  jogadores. Sem outros jogadores, não há nada à venda.

   Ou seja, a primeira chocagem de um avatar novo está a vinte horas de
   distância. Isso é o desenho do jogo e não se mexe aqui — mas torna
   impossível testar em minutos o caminho chocar → listar → vender, que
   passou a depender de endpoints novos.

   Esta ferramenta entrega o ovo pelo mesmo caminho que o servidor usa:
   entra no inboxEggs E fica registado no ovosEmitidos. As duas coisas,
   porque o inbox é entrega e o registo é propriedade — o cliente move os
   ovos do inbox para o slot no primeiro carregamento e limpa o inbox, e
   sem registo o ovo ficava sem prova nenhuma a partir daí.

     node tools/dar-ovo.js <uid>
     node tools/dar-ovo.js <uid> Raro
     node tools/dar-ovo.js <uid> Lendário Fogo

   Sem raridade, dá um Comum — que é o que serve para testar sem
   distorcer nada.

   Precisa das mesmas credenciais que as funções de api/ usam:
     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
═══════════════════════════════════════════════════════════════════ */

// O require do firebase-admin fica lá em baixo, depois de validar os
// argumentos. Em cima, um erro de escrita na raridade rebentava com um
// stack trace de módulo não encontrado — o firebase-admin é dependência
// do Vercel e pode não estar instalado aqui. Assim diz-se o que está
// errado sem precisar de nada instalado.
const RARIDADES = ['Comum', 'Raro', 'Lendário'];
// Os mesmos dias do handleBotarOvo em api/pool.js.
const DIAS = { 'Comum': 7, 'Raro': 14, 'Lendário': 30 };

const [uid, raridade = 'Comum'] = process.argv.slice(2);

if (!uid) {
  console.error('Falta o uid. Uso: node tools/dar-ovo.js <uid> [raridade]');
  process.exit(1);
}
if (!RARIDADES.includes(raridade)) {
  console.error(`Raridade inválida. Uma de: ${RARIDADES.join(', ')}`);
  process.exit(1);
}

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');

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
  const db  = getFirestore();
  const ref = db.collection('players').doc(uid);

  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`Não existe nenhum jogador com o uid "${uid}".`);
    process.exit(1);
  }

  const ovo = {
    id:       Date.now(),
    raridade,
    expiraEm: Date.now() + DIAS[raridade] * 86400000,
  };

  await ref.update({
    inboxEggs: FieldValue.arrayUnion(ovo),
    [`ovosEmitidos.o${ovo.id}`]: raridade,
  });

  console.log(`Ovo ${raridade} entregue a ${uid}.`);
  console.log(`  id ${ovo.id}, válido até ${new Date(ovo.expiraEm).toLocaleDateString('pt-BR')}`);
  console.log('\nRecarregue o jogo: o ovo passa do inbox para o inventário do avatar ativo.');
})().catch((e) => { console.error(e); process.exit(1); });
