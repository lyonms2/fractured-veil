#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O SELO E O PRÉMIO DA TEMPORADA — regras puras e servidor

     node tools/testar-temporada.js                        (só as regras)
     firebase emulators:exec --only firestore,database,auth \
       --project demo-teste "node tools/testar-temporada.js"   (tudo)

   Aqui mexe-se em dinheiro: o selo custa cristais de verdade e o prémio
   sai em cristais com lastro, que se convertem em MATIC. Por isso cada
   caminho é conferido, incluindo os que não deviam acontecer — comprar
   duas vezes, fechar o mês duas vezes, pagar duas vezes, e o processo
   morrer a meio do pagamento.

   O firebase-admin não mora no repositório: NODE_PATH para uma pasta
   com ele instalado.
   ═══════════════════════════════════════════════════════════════════ */

const TP = require('../js/temporada.js');
const RK = require('../js/pvp-rank.js');

let ok = 0, mau = 0;
const falhas = [];
function conferir(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++; falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + JSON.stringify(detalhe) : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

// ── as regras, sem nada ligado ──────────────────────────────────
function regras() {
  const gente = (n, pre, lutas) => Array.from({ length: n }, (_, i) =>
    ({ uid: pre + i, p: 1300 - i * 20, v: 20 - i, d: i, em: 1000 + i, lutas: lutas === undefined ? 15 : lutas }));

  titulo('Quem recebe, e quanto');
  const cen = { jovem: gente(15, 'j'), adulto: gente(20, 'a'), anciao: gente(15, 'x') };
  const r = TP.temporadaPremiar(50 * TP.SELO_CUSTO, cen);
  const porDiv = d => r.pagamentos.filter(x => x.divisao === d);

  conferir('recebe cerca de um terço de cada divisão',
           porDiv('jovem').length === 5 && porDiv('adulto').length === 7 && porDiv('anciao').length === 5,
           r.pagamentos.length);
  conferir('todo o premiado leva mais do que o selo',
           r.pagamentos.every(p => p.valor > TP.SELO_CUSTO),
           r.pagamentos.filter(p => p.valor <= TP.SELO_CUSTO));
  conferir('o ancião ganha mais do que o jovem na mesma posição',
           porDiv('anciao')[0].valor > porDiv('jovem')[0].valor
           && porDiv('anciao')[4].valor > porDiv('jovem')[4].valor,
           { anciao: porDiv('anciao')[0].valor, jovem: porDiv('jovem')[0].valor });
  conferir('nunca se paga mais do que o bolo',
           r.pago <= 50 * TP.SELO_CUSTO && r.pago + r.acumula === 50 * TP.SELO_CUSTO,
           { pago: r.pago, acumula: r.acumula });
  conferir('o primeiro de cada divisão leva mais do que o último',
           ['jovem', 'adulto', 'anciao'].every(d => {
             const p = porDiv(d); return p[0].valor > p[p.length - 1].valor; }));

  titulo('Quem não entra na conta');
  const poucas = TP.temporadaPremiar(1000, { jovem: gente(10, 'p', 3) });
  conferir('sem as dez partidas, ninguém recebe e tudo acumula',
           poucas.pagamentos.length === 0 && poucas.acumula === 1000, poucas);

  const pequena = TP.temporadaPremiar(2400, { jovem: gente(20, 'j'), adulto: gente(3, 'a'), anciao: gente(1, 'x') });
  conferir('divisão com menos de quatro não paga',
           pequena.pagamentos.every(p => p.divisao === 'jovem'),
           [...new Set(pequena.pagamentos.map(p => p.divisao))]);
  conferir('e a parte dela acumula em vez de ir para as outras',
           pequena.acumula > 300, pequena.acumula);

  titulo('A ordem, que aqui decide dinheiro');
  const emp = [
    { uid: 'a', p: 1000, v: 5, d: 5, em: 200, lutas: 10 },
    { uid: 'b', p: 1000, v: 7, d: 3, em: 300, lutas: 10 },
    { uid: 'c', p: 1000, v: 5, d: 4, em: 100, lutas: 10 },
    { uid: 'd', p: 1200, v: 1, d: 9, em: 400, lutas: 10 },
  ];
  conferir('pontos primeiro, depois vitórias, depois menos derrotas',
           TP.temporadaOrdenar(emp).map(x => x.uid).join('') === 'dbca',
           TP.temporadaOrdenar(emp).map(x => x.uid));
  conferir('e é sempre a mesma ordem, venha a lista como vier',
           TP.temporadaOrdenar(emp.slice().reverse()).map(x => x.uid).join('') === 'dbca');

  titulo('O bolo que não chega');
  /* Vinte selos vendidos, mas só oito jogaram as dez partidas: o bolo
     tem 2000 e o piso pediria 300. Sobra muito — o contrário só
     acontece se o bolo for menor que o piso, e aí paga-se o que há. */
  const magro = TP.temporadaPremiar(200, { jovem: gente(10, 'j') });
  conferir('com o bolo abaixo do piso, paga-se o que há e não mais',
           magro.pago <= 200, magro);
  conferir('e ninguém fica com valor negativo',
           magro.pagamentos.every(p => p.valor > 0), magro.pagamentos);
}

// ── o servidor, contra os emuladores ────────────────────────────
async function servidor() {
  const { initializeApp, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const { getDatabase } = require('firebase-admin/database');
  const PROJ = 'demo-teste';
  process.env.GCLOUD_PROJECT = PROJ;
  const RT = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9477';
  if (!getApps().length) initializeApp({ projectId: PROJ, databaseURL: `http://${RT}?ns=${PROJ}-default-rtdb` });
  const fs = getFirestore(), rtdb = getDatabase();
  const handler = require('../api/pvp.js');

  // o mesmo token falso do tools/testar-pvp.js
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = (uid) => {
    const t = Math.floor(Date.now() / 1000);
    return [b64({ alg: 'none', typ: 'JWT' }), b64({
      iss: `https://securetoken.google.com/${PROJ}`, aud: PROJ, sub: uid, user_id: uid,
      iat: t, exp: t + 3600, auth_time: t, firebase: { identities: {}, sign_in_provider: 'custom' },
    }), ''].join('.');
  };
  const { getAuth } = require('firebase-admin/auth');
  const contas = new Set();
  const conta = async (uid) => {
    if (contas.has(uid)) return;
    try { await getAuth().createUser({ uid }); } catch (e) {}
    contas.add(uid);
  };
  const pedir = async (uid, acao, dados) => {
    await conta(uid);
    let status = 0, corpo = null;
    const res = { status(s) { status = s; return this; }, json(j) { corpo = j; return this; } };
    await handler({ method: 'POST', body: Object.assign({ acao, idToken: token(uid) }, dados || {}) }, res);
    return Object.assign({ status }, corpo);
  };

  const temp = RK.pvpTemporada(Date.now());
  const limpar = async () => {
    await rtdb.ref('pvp').remove();
    for (const t of [temp, RK.pvpTemporada(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 15))]) {
      const selos = await fs.collection('temporadas').doc(t).collection('selos').get();
      for (const s of selos.docs) await s.ref.delete();
      await fs.collection('temporadas').doc(t).delete().catch(() => {});
    }
  };
  const jogador = async (uid, cristais) => {
    await fs.collection('players').doc(uid).set({
      nomeJogador: 'Jog ' + uid, cristais, gs: { cristais, cristaisBonus: 0 },
      avatarSlots: [], certidoes: {},
    });
  };

  titulo('Comprar o selo');
  await limpar();
  await jogador('S1', 250);
  let r = await pedir('S1', 'selo', {});
  conferir('compra debita o custo e entra no bolo', r.ok && r.bolo === TP.SELO_CUSTO && !r.ja, r);
  let d = (await fs.collection('players').doc('S1').get()).data();
  conferir('o cristal saiu da conta', d.cristais === 250 - TP.SELO_CUSTO, d.cristais);
  conferir('e o selo ficou no documento', !!(d.selos || {})[temp], d.selos);

  r = await pedir('S1', 'selo', {});
  conferir('comprar de novo não cobra duas vezes', r.ok && r.ja === true, r);
  d = (await fs.collection('players').doc('S1').get()).data();
  conferir('e o saldo não mexeu', d.cristais === 250 - TP.SELO_CUSTO, d.cristais);

  await jogador('S2', 50);
  r = await pedir('S2', 'selo', {});
  conferir('sem cristais, o selo é recusado', !r.ok && r.erro === 'sem_cristais', r);

  titulo('O estado da temporada');
  r = await pedir('S1', 'temporada', {});
  conferir('diz o bolo, o custo e que eu tenho selo',
           r.ok && r.bolo === TP.SELO_CUSTO && r.tenhoSelo === true && r.custo === TP.SELO_CUSTO, r);
  r = await pedir('S2', 'temporada', {});
  conferir('e diz a quem não tem que não tem', r.ok && r.tenhoSelo === false, r);

  titulo('O fecho do mês');
  await limpar();
  const passada = RK.pvpTemporada(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 15));
  const uids = [];
  for (let i = 0; i < 8; i++) {
    const uid = 'T' + i;
    uids.push(uid);
    await jogador(uid, 0);
    await fs.collection('temporadas').doc(passada).collection('selos').doc(uid).set({ em: Date.now() });
    await rtdb.ref(`pvp/rank/${passada}/anciao/${uid}`).set({
      p: 1200 - i * 25, nome: uid, v: 12 - i, d: 3 + i, e: 0, em: 1000 + i,
    });
  }
  // um nono com selo que quase não jogou: não pode entrar na conta
  await jogador('T9', 0);
  await fs.collection('temporadas').doc(passada).collection('selos').doc('T9').set({ em: Date.now() });
  await rtdb.ref(`pvp/rank/${passada}/anciao/T9`).set({ p: 1400, nome: 'T9', v: 2, d: 1, e: 0, em: 900 });
  await fs.collection('temporadas').doc(passada).set({ bolo: 9 * TP.SELO_CUSTO, temporada: passada });

  r = await pedir('S1', 'temporada', {});   // abrir o Salão fecha o mês anterior
  const fechada = (await fs.collection('temporadas').doc(passada).get()).data() || {};
  conferir('a temporada anterior ficou fechada', fechada.fechada === true, fechada.fechada);
  conferir('e com a lista de quem recebeu', Array.isArray(fechada.pagamentos) && fechada.pagamentos.length === 3,
           fechada.pagamentos && fechada.pagamentos.length);

  const pagos = {};
  for (const uid of uids.concat(['T9'])) {
    const doc = (await fs.collection('players').doc(uid).get()).data() || {};
    if ((doc.premios || {})[passada]) pagos[uid] = doc.cristais;
  }
  conferir('pagou os três primeiros da tabela',
           Object.keys(pagos).sort().join(',') === 'T0,T1,T2', Object.keys(pagos));
  conferir('em cristais com lastro, e o primeiro leva mais',
           pagos.T0 > pagos.T1 && pagos.T1 > pagos.T2 && pagos.T2 > TP.SELO_CUSTO, pagos);
  conferir('quem não fez dez partidas não recebeu, mesmo com mais pontos',
           !pagos.T9, pagos.T9);
  conferir('o que sobrou acumulou para a temporada de agora',
           ((await fs.collection('temporadas').doc(temp).get()).data() || {}).acumulado > 0,
           ((await fs.collection('temporadas').doc(temp).get()).data() || {}).acumulado);

  titulo('E se tudo correr duas vezes');
  const antes = JSON.stringify(pagos);
  await pedir('S2', 'temporada', {});
  await pedir('S1', 'temporada', {});
  const depois = {};
  for (const uid of uids) {
    const doc = (await fs.collection('players').doc(uid).get()).data() || {};
    if ((doc.premios || {})[passada]) depois[uid] = doc.cristais;
  }
  conferir('abrir o Salão outra vez não paga de novo', JSON.stringify(depois) === antes, { antes, depois });

  titulo('O processo que morreu a meio');
  /* Apaga-se o prémio de um jogador, como se o crédito dele não tivesse
     chegado a acontecer: a próxima abertura tem de o completar. */
  await fs.collection('players').doc('T1').update({ [`premios.${passada}`]: FieldValueDelete(), cristais: 0 });
  await pedir('S1', 'temporada', {});
  const t1 = (await fs.collection('players').doc('T1').get()).data() || {};
  conferir('o pagamento que faltava é completado depois',
           !!(t1.premios || {})[passada] && t1.cristais > 0, { premio: (t1.premios || {})[passada], cris: t1.cristais });

  await limpar();
  console.log('\n(servidor testado contra os emuladores)');
}

function FieldValueDelete() {
  const { FieldValue } = require('firebase-admin/firestore');
  return FieldValue.delete();
}

(async () => {
  regras();
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST) {
    try { await servidor(); }
    catch (e) { mau++; falhas.push('  ✗ o teste do servidor quebrou: ' + (e && e.stack || e)); }
  } else {
    console.log('\n(sem emuladores: só as regras. Ver o cabeçalho para rodar o servidor.)');
  }
  console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '') + `${ok} passaram · ${mau} falharam`);
  process.exit(mau ? 1 : 0);
})();
