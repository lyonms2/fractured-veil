#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   UM NOME SÓ TEM UM DONO

     node tools/testar-nomes.js                        (as regras puras)
     firebase emulators:exec --only firestore \
       --project demo-teste "node tools/testar-nomes.js"   (com o banco)

   Duas partes, e são de naturezas diferentes:

     a CHAVE   é pura, e é onde mora o perigo do impostor — se "Káel" e
               "Kael" derem chaves diferentes, a unicidade não vale nada
     a RESERVA é uma transação, e o que se testa nela é a corrida: dois
               pedidos com o mesmo nome, e só um pode ganhar

   O firebase-admin não mora no repositório: NODE_PATH para uma pasta
   com ele instalado.
   ═══════════════════════════════════════════════════════════════════ */

const N = require('../js/nomes.js');

let ok = 0, mau = 0;
const falhas = [];
function conferir(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++; falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + JSON.stringify(detalhe) : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

// ── A CHAVE ─────────────────────────────────────────────────────
function chaves() {
  titulo('O mesmo nome, escrito de outro jeito');
  const j = (s) => N.nomeChave(s, 'jogador');

  conferir('maiúsculas não fazem um nome novo', j('Kael') === j('KAEL'));
  conferir('nem as minúsculas',                 j('Kael') === j('kael'));
  conferir('nem o acento',                      j('Káel') === j('Kael'));
  conferir('nem o til',                         j('João') === j('Joao'));
  conferir('nem a cedilha',                     j('Gonçalo') === j('Goncalo'));
  conferir('nem espaço a mais no meio',         j('Ana  Lu') === j('Ana Lu'));
  conferir('nem espaço nas pontas',             j('  Ana ') === j('Ana'));

  titulo('O que continua sendo outro nome');
  conferir('o hífen é visível, então separa',   j('Ka-el') !== j('Kael'));
  conferir('o espaço também',                   j('Ka el') !== j('Kael'));
  conferir('e uma letra a mais, claro',         j('Kaela') !== j('Kael'));

  titulo('O prefixo: o dono e o bicho não disputam');
  conferir('jogador e avatar com o mesmo nome dão chaves diferentes',
    N.nomeChave('Kael', 'jogador') !== N.nomeChave('Kael', 'avatar'));
  conferir('o prefixo do jogador é j:', N.nomeChave('Kael', 'jogador').startsWith('j:'));
  conferir('o do avatar é a:',          N.nomeChave('Kael', 'avatar').startsWith('a:'));

  titulo('O que não é nome nenhum');
  conferir('vazio',            N.nomeChave('', 'jogador') === '');
  conferir('só espaços',       N.nomeChave('    ', 'jogador') === '');
  conferir('só símbolos',      N.nomeChave('<<>>', 'jogador') === '');
  conferir('uma letra só é curto demais', N.nomeChave('K', 'jogador') === '');
  conferir('e o problema diz qual é',     N.nomeProblema('K', 'jogador') === 'curto');
  conferir('um hífen sozinho não passa',  N.nomeProblema('- -', 'jogador') === 'vazio');
  conferir('um nome de verdade não tem problema nenhum',
    N.nomeProblema('Kael', 'jogador') === null);

  titulo('O HTML não entra');
  conferir('as tags saem, e a barra também',
    N.nomeLimpo('<b>Kael</b>', N.NOME_JOGADOR_LIM) === 'bKaelb');
  conferir('o script também',
    N.nomeLimpo('<script>x</script>', N.NOME_JOGADOR_LIM).indexOf('<') === -1);

  titulo('O tamanho');
  conferir('o do jogador corta em 18',
    N.nomeLimpo('a'.repeat(40), N.NOME_JOGADOR_LIM).length === 18);
  conferir('o do avatar corta em 16',
    N.nomeLimpo('a'.repeat(40), N.NOME_AVATAR_LIM).length === 16);
  conferir('e dois nomes longos que só diferem depois do corte colidem',
    N.nomeChave('a'.repeat(18) + 'X', 'jogador') === N.nomeChave('a'.repeat(18) + 'Y', 'jogador'));
}

// ── A RESERVA, com um banco de mentira ──────────────────────────
/* O falso guarda documentos num Map e roda a transação uma vez só. Não
   simula a corrida — isso é o emulador, mais abaixo — mas cobre os três
   finais da função: livre, já é seu, é de outro. */
function bancoFalso(inicial) {
  const docs = new Map(Object.entries(inicial || {}));
  const ref = (id) => ({ id });
  return {
    _docs: docs,
    collection: () => ({ doc: ref }),
    runTransaction: async (fn) => fn({
      get:    async (r) => ({ exists: docs.has(r.id), data: () => docs.get(r.id) }),
      set:    (r, d) => docs.set(r.id, d),
      delete: (r) => docs.delete(r.id),
    }),
  };
}

async function reserva(_reservar) {
  titulo('Reservar: os três finais');

  let db = bancoFalso();
  let fim = await _reservar(db, 'j:kael', { tipo: 'jogador', nome: 'Kael', uid: 'u1' }, null);
  conferir('livre → OK', fim === 'OK', fim);
  conferir('e o documento ficou lá', db._docs.get('j:kael').uid === 'u1');

  fim = await _reservar(db, 'j:kael', { tipo: 'jogador', nome: 'Kael', uid: 'u1' }, null);
  conferir('o mesmo dono, de novo → não é erro', fim === 'JA_ERA_SEU', fim);

  fim = await _reservar(db, 'j:kael', { tipo: 'jogador', nome: 'Kael', uid: 'u2' }, null);
  conferir('outro dono → TOMADO', fim === 'TOMADO', fim);
  conferir('e o dono não mudou', db._docs.get('j:kael').uid === 'u1');

  titulo('Reservar: o avatar leva o id junto');
  db = bancoFalso();
  await _reservar(db, 'a:kael', { tipo: 'avatar', nome: 'Kael', uid: 'u1', avatarId: 'av_1' }, null);
  fim = await _reservar(db, 'a:kael', { tipo: 'avatar', nome: 'Kael', uid: 'u1', avatarId: 'av_2' }, null);
  conferir('o mesmo jogador, OUTRO avatar → TOMADO', fim === 'TOMADO', fim);
  fim = await _reservar(db, 'a:kael', { tipo: 'avatar', nome: 'Kael', uid: 'u1', avatarId: 'av_1' }, null);
  conferir('o mesmo avatar → não é erro', fim === 'JA_ERA_SEU', fim);

  titulo('Trocar de nome larga o antigo');
  db = bancoFalso({ 'j:leo': { tipo: 'jogador', nome: 'Leo', uid: 'u1' } });
  fim = await _reservar(db, 'j:kael', { tipo: 'jogador', nome: 'Kael', uid: 'u1' }, 'j:leo');
  conferir('o novo entrou', fim === 'OK' && db._docs.has('j:kael'));
  conferir('e o velho saiu', !db._docs.has('j:leo'));

  db = bancoFalso({ 'j:leo': { tipo: 'jogador', nome: 'Leo', uid: 'u1' } });
  fim = await _reservar(db, 'j:leo', { tipo: 'jogador', nome: 'LEO', uid: 'u1' }, 'j:leo');
  conferir('reservar o mesmo nome não apaga a própria reserva',
    fim === 'JA_ERA_SEU' && db._docs.has('j:leo'));

  titulo('Perder a corrida não leva o nome antigo junto');
  db = bancoFalso({
    'j:leo':  { tipo: 'jogador', nome: 'Leo', uid: 'u1' },
    'j:kael': { tipo: 'jogador', nome: 'Kael', uid: 'u2' },
  });
  fim = await _reservar(db, 'j:kael', { tipo: 'jogador', nome: 'Kael', uid: 'u1' }, 'j:leo');
  conferir('TOMADO', fim === 'TOMADO');
  conferir('e o nome que já era dele continua dele', db._docs.get('j:leo').uid === 'u1');
}

// ── A RESERVA, com o banco de verdade ───────────────────────────
/* Aqui a transação é a do Firestore, e é ela que resolve a corrida.
   Dois pedidos com o mesmo nome, disparados juntos: um ganha, o outro
   ouve TOMADO. Com o banco de mentira este teste não diria nada. */
async function servidor(_reservar) {
  const { initializeApp, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  if (!getApps().length) initializeApp({ projectId: 'demo-teste' });
  const db = getFirestore();

  titulo('A corrida, no banco de verdade');
  const chave = 'j:corrida' + Date.now();
  const doc = (uid) => ({ tipo: 'jogador', nome: 'Corrida', uid, em: Date.now() });

  const [a, b] = await Promise.all([
    _reservar(db, chave, doc('u1'), null),
    _reservar(db, chave, doc('u2'), null),
  ]);
  const venceu = [a, b].filter(x => x === 'OK').length;
  const perdeu = [a, b].filter(x => x === 'TOMADO').length;
  conferir('dos dois, um só leva o nome', venceu === 1, { a, b });
  conferir('e o outro ouve TOMADO',       perdeu === 1, { a, b });

  const dono = (await db.collection('nomes').doc(chave).get()).data();
  conferir('e o que ficou gravado é o do vencedor',
    dono && (dono.uid === 'u1' || dono.uid === 'u2'));

  titulo('Um terceiro, depois, também perde');
  const fim = await _reservar(db, chave, doc('u3'), null);
  conferir('TOMADO', fim === 'TOMADO', fim);

  await db.collection('nomes').doc(chave).delete();
}

(async () => {
  chaves();

  // O api/nomes.js carrega o firebase-admin no topo. Sem ele instalado,
  // as regras puras acima já correram e o resto fica de fora.
  let _reservar = null;
  try { _reservar = require('../api/nomes.js')._reservar; }
  catch (e) { console.log('\n(sem firebase-admin: só a chave. Ver o cabeçalho.)'); }

  if (_reservar) {
    await reserva(_reservar);
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      try { await servidor(_reservar); }
      catch (e) { mau++; falhas.push('  ✗ o teste do servidor quebrou: ' + (e && e.stack || e)); }
    } else {
      console.log('\n(sem emulador: a corrida de verdade não foi testada. Ver o cabeçalho.)');
    }
  }

  console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '') + `${ok} passaram · ${mau} falharam`);
  process.exit(mau ? 1 : 0);
})();
