#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   DAR UM OVO A UM JOGADOR (ferramenta de desenvolvimento)

   Existe por uma razão prática: hoje o ÚNICO ovo que o jogo produz é o
   de uma cruza, e cruzar exige dois adultos — fase 2, que é nível 11.
   Numa conta nova isso está a horas de distância, e o caminho
   chocar → nomear → criar não se consegue testar em minutos.

   ── O QUE ESTA FERRAMENTA FAZIA, E POR QUE DEIXOU DE FUNCIONAR ──

   Entregava um ovo com uma RARIDADE, escrito no `inboxEggs`, com
   registo no `ovosEmitidos`. As três coisas morreram por baixo dela:
   os ovos deixaram de ter raridade, o inbox deixou de ser por onde um
   ovo entra, e o handleChocarOvo passou a aceitar uma prova só — o ovo
   estar no mapa `ovos`.

   O resultado era pior do que não funcionar: entregava um ovo que
   aparecia na chocadeira e que NUNCA chocava, e nada dizia porquê.

   ── O QUE FAZ AGORA ──

   Força uma cruza entre dois avatares que o jogador já tem. Passa pelo
   mesmo GEN.ovoDeCruza que o handleCruzar (api/pool.js) usa, com o
   mesmo DNA vindo do mapa `certidoes` — portanto o ovo que sai é um ovo
   a sério, com mãe, pai e herança, e choca como qualquer outro.

   A ÚNICA coisa que salta é a idade: os dois pais entram na conta com
   nível 30, numa cópia em memória que não vai para lado nenhum. É
   exactamente o que a ferramenta existe para poupar — as horas de jogo
   até à fase adulta — e nada mais.

   O que ela NÃO salta, de propósito: os pais têm de existir, ter
   certidão, estar vivos, não estar à venda e ser macho e fêmea. Essas
   não são esperas, são as regras da cruza.

     node tools/dar-ovo.js <uid>            escolhe o primeiro par válido
     node tools/dar-ovo.js <uid> 0 2        cruza o slot 0 com o slot 2

   Precisa das mesmas credenciais que as funções de api/ usam:
     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
═══════════════════════════════════════════════════════════════════ */

const [uid, slotA, slotB] = process.argv.slice(2);

if (!uid) {
  console.error('Falta o uid. Uso: node tools/dar-ovo.js <uid> [slotA slotB]');
  process.exit(1);
}
if ((slotA === undefined) !== (slotB === undefined)) {
  console.error('Os slots dão-se aos pares: node tools/dar-ovo.js <uid> <slotA> <slotB>');
  process.exit(1);
}

const GEN = require('../api/_genetica.js');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');

// A idade que se empresta aos pais, só dentro desta execução. Fase 2
// chega aos 11; 30 é folga para o dia em que a escada mudar.
const NIVEL_EMPRESTADO = 30;

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

  const pData     = snap.data();
  const slots     = pData.avatarSlots || [];
  const certidoes = pData.certidoes   || {};
  const ovos      = pData.ovos        || {};

  /* A certidão reata-se ao slot aqui, tal como no handleCruzar: os
     genes vêm do mapa que o cliente não escreve, e não do que estiver
     escrito no slot. É a mesma leitura, com a idade emprestada. */
  const candidato = (i) => {
    const s = slots[i];
    if (!s || !s.id) return null;
    const cert = certidoes[s.id];
    if (!cert) return null;
    return Object.assign({}, s, { nascimento: cert, nivel: NIVEL_EMPRESTADO });
  };

  let iA, iB;
  if (slotA !== undefined) {
    iA = Number(slotA); iB = Number(slotB);
    if (!Number.isInteger(iA) || !Number.isInteger(iB)) {
      console.error('Os slots são números inteiros.');
      process.exit(1);
    }
  } else {
    /* Sem slots dados, procura-se o primeiro par que a cruza aceite —
       e quem decide se aceita é o próprio podeCruzar, não uma segunda
       lista de condições escrita aqui. */
    procura:
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = candidato(i), b = candidato(j);
        if (a && b && GEN.reproducao.podeCruzar(a, b, {}).ok) { iA = i; iB = j; break procura; }
      }
    }
    if (iA === undefined) {
      console.error('Nenhum par de avatares deste jogador pode cruzar.');
      console.error('São precisos dois com certidão, vivos, fora do mercado, macho e fêmea.');
      process.exit(1);
    }
  }

  const a = candidato(iA), b = candidato(iB);
  if (!a || !b) {
    console.error(`Os slots ${iA} e ${iB} não têm os dois um avatar com certidão.`);
    process.exit(1);
  }

  const r = GEN.ovoDeCruza(a, b, { ovosNoInventario: Object.keys(ovos).length, maxOvos: 10 });
  if (!r.ok) {
    // O motivo é uma chave de tradução; aqui vai como está, que é o que
    // um terminal precisa.
    console.error(`A cruza foi recusada: ${r.motivo}`);
    process.exit(1);
  }

  await ref.update({ [`ovos.${r.ovo.id}`]: r.ovo });

  console.log(`Ovo entregue a ${uid}.`);
  console.log(`  id ${r.ovo.id} — dos slots ${iA} e ${iB}.`);
  console.log('\nRecarregue o jogo: o ovo aparece na 🥚 CHOCADEIRA da colónia.');
})().catch((e) => { console.error(e); process.exit(1); });
