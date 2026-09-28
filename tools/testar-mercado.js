#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O MERCADO DE AVATARES, DE PONTA A PONTA

   Precisa do jogo local no ar (tools/pvp-local.js), que semeia as
   contas jog1/jog2/jog3:

     firebase emulators:exec --only firestore,database,auth \
       --project demo-teste "node tools/pvp-local.js"
     node tools/testar-mercado.js

   Aqui passa dinheiro de verdade: o avatar é a única coisa que se
   compra com cristais entre jogadores, e cristais saem em MATIC. O que
   se confere é o caminho inteiro — listar, o que a vitrine diz, comprar
   e REVENDER — porque os três defeitos que este teste nasceu a apanhar
   só aparecem quando se anda o caminho todo:

     · a vitrine mostrava o nível do SAVE do vendedor, que ele escreve
       por inteiro, e não o que o servidor reconhece;
     · a raridade vinha do mesmo lugar, quando hoje ela é uma conta
       feita sobre o nível (fuRaridadeDoNivel);
     · o avatar comprado ficava preso na conta de quem o comprou: o
       registro de emissão guardava a raridade em vez da origem, e a
       revenda morria em ORIGEM_NAO_CONFERE.

   ESTE TESTE PRECISA DO HARNESS ACABADO DE LEVANTAR, e não de ser o
   último — o cabeçalho dizia o contrário e custou uma investigação. O
   testar-niveis.js apaga o `niveis` do jog1 para conferir o primeiro
   encontro, e sem esse campo o servidor aqui recusa listar com
   AVATAR_SEM_REGISTO. Rodar a bateria em fila faz isto FALHAR sem que
   haja nada partido.

   E ele próprio suja o estado, também de propósito: vende um avatar do
   jog1 ao jog2, que é a única maneira de conferir a revenda. Ou seja,
   os dois querem o harness limpo e nenhum dos dois o deixa assim.

   O firebase-admin não mora no repositório: NODE_PATH para uma pasta
   com ele instalado.
   ═══════════════════════════════════════════════════════════════════ */
process.env.GCLOUD_PROJECT = 'demo-teste';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8477';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore }  = require('firebase-admin/firestore');
initializeApp({ projectId: 'demo-teste' });
const db = getFirestore();

const AUTH = 'http://127.0.0.1:9499/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key';
const API  = 'http://127.0.0.1:10230/api/comprar-avatar';

let mau = 0;
const ok = (cond, texto, detalhe) => {
  console.log((cond ? '  ok   ' : 'FALHA ') + texto + (detalhe !== undefined ? '  ' + JSON.stringify(detalhe) : ''));
  if (!cond) mau++;
};
const entrar = async (email) => (await (await fetch(AUTH, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'teste123', returnSecureToken: true }),
})).json()).idToken;
const pede = async (tok, body) => {
  const r = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ idToken: tok }, body)),
  });
  return { status: r.status, body: await r.json() };
};

(async () => {
  const t1 = await entrar('jog1@teste.dev');
  const t2 = await entrar('jog2@teste.dev');
  const d1 = db.collection('players').doc('jog1');
  const d2 = db.collection('players').doc('jog2');

  // A pool tem de existir: a taxa de listagem é creditada nela.
  await db.collection('config').doc('pool').set(
    { cristais: 0, totalEntrou: 0, totalSaiu: 0, saqueHoje: 0, ultimoReset: Date.now() }, { merge: true });

  await d1.update({ cristais: 500, 'gs.cristais': 500 });
  // O comprador precisa de um lugar vazio na colônia.
  const p2i = (await d2.get()).data();
  const comVaga = [...p2i.avatarSlots];
  while (comVaga.length < 5) comVaga.push(null);
  await d2.update({ cristais: 500, 'gs.cristais': 500, avatarSlots: comVaga });

  /* O SAVE MENTE: nível 60 no slot, 30 no registro do servidor. É a
     linha no console que qualquer um escreve, e o que o teste quer
     saber é se a vitrine a repete. */
  const p = (await d1.get()).data();
  const slots = p.avatarSlots.map((s, i) => (i === 0 ? { ...s, nivel: 60, raridade: 'Comum' } : s));
  await d1.update({ avatarSlots: slots });
  const idAv = slots[0].id;

  console.log('\n— o anúncio não acredita no save —');
  const r = await pede(t1, { acao: 'listar-avatar', slotIdx: 0, price: 100 });
  ok(r.status === 200, 'listou', r.body.erro || '');
  const anuncio = (await db.collection('avatarMarket').get()).docs
    .map(x => ({ ...x.data(), docId: x.id }))
    .find(x => x.sellerId === 'jog1' && x.status === 'listed');
  ok(!!anuncio, 'e o anúncio existe');
  ok(anuncio && anuncio.nivel === 30, 'a vitrine diz 30, e não os 60 do save', anuncio && anuncio.nivel);
  ok(anuncio && anuncio.raridade === 'Lendário', 'a raridade sai desse nível (30 = Lendário)', anuncio && anuncio.raridade);
  const reg = (await d1.get()).data().niveis[idAv];
  ok(reg && reg.n === 30, 'e o registo do servidor não se mexeu', reg && reg.n);

  console.log('\n— o comprado pode ser revendido —');
  const c = await pede(t2, { acao: 'comprar-avatar', listingId: anuncio.docId });
  ok(c.status === 200, 'jog2 comprou', c.body.erro || '');
  const p2 = (await d2.get()).data();
  ok(p2.avataresEmitidos['s' + String(anuncio.seed)] === 'Comum',
     'o registo de emissão do comprador guarda a ORIGEM', p2.avataresEmitidos['s' + String(anuncio.seed)]);
  const idx = p2.avatarSlots.findIndex(s => s && s.id === idAv);
  ok(idx >= 0, 'o avatar chegou à colônia, no lugar ' + idx);
  ok((p2.niveis || {})[idAv] && p2.niveis[idAv].n === 30,
     'e o nível reconhecido viajou com ele', (p2.niveis || {})[idAv]);
  const rev = await pede(t2, { acao: 'listar-avatar', slotIdx: idx, price: 150 });
  ok(rev.status === 200, 'e ele pode ir à venda outra vez', rev.body.erro || '');

  console.log('\n' + (mau ? mau + ' FALHARAM' : 'tudo passou'));
  process.exit(mau ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
