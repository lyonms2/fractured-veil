#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   ABASTECER A POOL (ferramenta de desenvolvimento)

   A pergunta que deu origem a isto: "se tem MATIC no contrato, tinha de
   ter cristais na pool — onde é que eu ponho isso?"

   Não havia onde. A pool só enchia por taxas de jogadores:

     listagem de avatar   2 💎
     venda de avatar      10% do preço
     compra de ovo        10% do preço

   Sem jogadores não há taxas, e sem taxas a pool fica a zero. E com a
   pool a zero o câmbio não liga (exige 100 💎) e a queima de ovos não
   paga nada. Ou seja: o jogo começa com as duas saídas fechadas e
   nenhuma forma de as abrir. É um ovo e uma galinha.

   ── A REGRA QUE ESTE SCRIPT NÃO PODE QUEBRAR ──

   Cristais valem MATIC de verdade: 10 💎 por 1 MATIC, nas duas
   direcções (RATE em api/resgatar.js). A página da Transparência mostra
   a COBERTURA — a razão entre o MATIC que está no cofre e o MATIC
   necessário para pagar todos os cristais que existem.

   Escrever cristais na pool sem pôr o MATIC correspondente no contrato
   faz a cobertura cair abaixo dos 100%, e isso é exactamente o que a
   página promete que não acontece. Seria emitir dinheiro sem lastro.

   Por isso este script pede o MATIC, não os cristais: diz-se quanto se
   depositou no contrato, e ele credita 10× isso. A ordem importa —
   PRIMEIRO manda-se o MATIC para o contrato, DEPOIS corre-se isto.

     node tools/abastecer-pool.js 20        → confere e mostra o efeito
     node tools/abastecer-pool.js 20 --escrever

   20 MATIC no contrato = 200 💎 na pool.

   Corre em seco por omissão. Com --escrever, faz a mesma transação que
   as taxas fazem (incrementa cristais e totalEntrou) e deixa um registo
   no histórico público da pool, que é onde tem de aparecer: quem lê a
   Transparência vê a entrada com o motivo, como vê todas as outras.

   Precisa das mesmas credenciais que as funções de api/ usam:
     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
   E, para conferir o cofre, do CONTRACT_ADDRESS.
═══════════════════════════════════════════════════════════════════ */

// Mesma taxa dos dois lados, igual ao RATE do api/resgatar.js.
const GEMS_POR_MATIC = 10;

const matic    = parseFloat(process.argv[2]);
const ESCREVER = process.argv.includes('--escrever');

if (!matic || matic <= 0 || !isFinite(matic)) {
  console.error('Uso: node tools/abastecer-pool.js <matic> [--escrever]');
  console.error('  O <matic> é quanto já depositaste no contrato.');
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

// O saldo do cofre, pelos mesmos RPCs que o api/pool.js usa. Serve só
// para avisar: se o contrato não tiver o MATIC que se diz ter, a
// cobertura vai cair e é melhor saber antes de gravar.
async function saldoDoCofre() {
  const endereco = process.env.CONTRACT_ADDRESS;
  if (!endereco || endereco === 'PENDENTE_DEPLOY') return null;
  let ethers;
  try { ({ ethers } = require('ethers')); } catch (_) { return null; }
  const rpcs = [
    'https://polygon-bor-rpc.publicnode.com',
    'https://polygon.drpc.org',
    'https://polygon.meowrpc.com',
    'https://polygon.llamarpc.com',
  ];
  for (const rpc of rpcs) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const wei = await provider.getBalance(endereco);
      return parseFloat(ethers.formatEther(wei));
    } catch (_) { /* próximo */ }
  }
  return null;
}

(async () => {
  iniciar();
  const db      = getFirestore();
  const poolRef = db.collection('config').doc('pool');

  const gems = +(matic * GEMS_POR_MATIC).toFixed(2);

  const snap     = await poolRef.get();
  const dados    = snap.exists ? snap.data() : {};
  const antes    = dados.cristais || 0;
  const depois   = +(antes + gems).toFixed(2);

  console.log(ESCREVER ? '── A ESCREVER ──\n' : '── EM SECO (usa --escrever para gravar) ──\n');
  console.log(`  ${matic} MATIC × ${GEMS_POR_MATIC} = ${gems} 💎`);
  console.log(`  pool: ${antes} 💎  →  ${depois} 💎\n`);

  // O aviso que interessa: o MATIC está mesmo lá?
  const cofre = await saldoDoCofre();
  if (cofre === null) {
    console.log('  ⚠️  Não consegui ler o cofre (falta CONTRACT_ADDRESS, ethers');
    console.log('      ou a rede). Confirma à mão que o MATIC já lá está.\n');
  } else {
    const precisoSo = +(gems / GEMS_POR_MATIC).toFixed(4);
    console.log(`  cofre: ${cofre} MATIC`);
    if (cofre + 1e-9 < precisoSo) {
      console.log(`  ⚠️  O cofre tem menos do que estes ${gems} 💎 exigem`);
      console.log(`      (${precisoSo} MATIC). Se gravares assim, a cobertura`);
      console.log('      cai abaixo de 100% — cristais sem lastro.\n');
      if (ESCREVER) {
        console.error('  Não gravei. Deposita o MATIC primeiro.');
        process.exit(1);
      }
    } else {
      console.log('  ✓ O cofre cobre esta emissão.\n');
    }
  }

  if (!ESCREVER) { console.log('Nada foi gravado. Repete com --escrever.'); return; }

  // A mesma transação das taxas, e um registo no histórico público —
  // uma entrada na pool que não aparecesse no histórico seria um buraco
  // na própria página que promete mostrar tudo o que entra e sai.
  const batch  = db.batch();
  const logRef = poolRef.collection('logs').doc();
  batch.set(poolRef, {
    cristais:    FieldValue.increment(gems),
    totalEntrou: FieldValue.increment(gems),
  }, { merge: true });
  batch.set(logRef, {
    tipo:   'entrada',
    motivo: `Abastecimento da pool (${matic} MATIC no cofre)`,
    origem: '',            // vazio → o histórico mostra "sistema"
    total:  gems,
    pool:   gems,
    ts:     FieldValue.serverTimestamp(),
  });
  await batch.commit();

  console.log(`Feito. A pool tem agora ${depois} 💎.`);
  console.log('A entrada ficou no histórico público, com o motivo.');
})().catch((e) => { console.error(e); process.exit(1); });
