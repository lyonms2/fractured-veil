#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   TESTES DO PVP — o pareamento (js/pvp-regras.js) e o servidor (api/pvp.js)

   Duas partes:

   1. AS REGRAS PURAS — a janela da fila, a faixa que a tela mostra, quem
      forma par com quem. Rodam sempre, sem nada ligado:
        node tools/testar-pvp.js

   2. O SERVIDOR DE PONTA A PONTA, contra os emuladores do Firestore, do
      Realtime Database e da autenticação — entrar e sair da fila, o par,
      a sala, os convites de amigo, as recusas, a corrida de muitos
      entrando ao mesmo tempo, e as regras do banco lidas como jogador:
        firebase emulators:exec --only firestore,database,auth --project demo-teste "node tools/testar-pvp.js"

      O firebase-admin não mora no repositório (a Vercel instala-o no
      deploy); aponte o NODE_PATH para uma pasta com ele instalado.
   ═══════════════════════════════════════════════════════════════════ */

const R = require('../js/pvp-regras.js');

let ok = 0, mau = 0;
const falhas = [];
function conferir(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++; falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + JSON.stringify(detalhe) : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

// ═══ 1. AS REGRAS PURAS ═══
function regrasPuras() {
  titulo('A janela da fila');
  conferir('começa em ±10%', R.pvpJanela(0) === 0.10);
  conferir('aos 14,9 s ainda é ±10%', R.pvpJanela(14999) === 0.10);
  conferir('aos 15 s abre para ±15%', Math.abs(R.pvpJanela(15000) - 0.15) < 1e-9);
  conferir('aos 60 s, ±30%', Math.abs(R.pvpJanela(60000) - 0.30) < 1e-9);
  conferir('nunca passa de ±40%', R.pvpJanela(10 * 60000) === 0.40);
  conferir('espera negativa conta como zero', R.pvpJanela(-5000) === 0.10);

  titulo('A faixa da tela diz a verdade');
  // Para cada poder e espera: todo q dentro da faixa forma par; o de fora, não.
  let mentiras = [];
  for (const p of [3, 10, 45, 90, 137, 180]) {
    for (const espera of [0, 15000, 45000, 120000]) {
      const agora = 1e9;
      const [lo, hi] = R.pvpFaixa(p, espera);
      const eu = { poder: p, desde: agora - espera };
      for (let q = Math.max(1, lo - 3); q <= hi + 3; q++) {
        const ele = { poder: q, desde: agora };      // ele acabou de entrar: janela mínima
        const par = R.pvpCompativeis(eu, ele, agora);
        const dentro = q >= lo && q <= hi;
        if (par !== dentro) mentiras.push({ p, espera, q, lo, hi, par });
      }
    }
  }
  conferir('dentro da faixa forma par, fora não', mentiras.length === 0, mentiras.slice(0, 4));
  const [lo90, hi90] = R.pvpFaixa(90, 0);
  conferir('poder 90 recém-chegado: 81 a 100', lo90 === 81 && hi90 === 100, [lo90, hi90]);

  titulo('Quem forma par');
  const agora = 1e9;
  const fila = {
    a: { poder: 90, desde: agora - 1000, sinal: agora },
    b: { poder: 88, desde: agora - 9000, sinal: agora },
    c: { poder: 92, desde: agora - 2000, sinal: agora },
    d: { poder: 180, desde: agora - 90000, sinal: agora },
    e: { poder: 89, desde: agora - 50000, sinal: agora - 60000 },   // sem sinal
  };
  conferir('o mais próximo em poder', ['b', 'c'].indexOf(R.pvpEscolherPar('a', fila, agora)) !== -1);
  const empate = { x: { poder: 90, desde: agora, sinal: agora },
                   y: { poder: 92, desde: agora - 5000, sinal: agora },
                   z: { poder: 88, desde: agora - 9000, sinal: agora } };
  conferir('empatado em diferença, o que espera há mais tempo', R.pvpEscolherPar('x', empate, agora) === 'z');
  conferir('quem está sem sinal não conta', R.pvpEscolherPar('b', { b: fila.b, e: fila.e }, agora) === null);
  conferir('longe demais não forma par', R.pvpEscolherPar('d', { d: fila.d, a: fila.a }, agora) === null);
  conferir('ninguém forma par consigo mesmo', R.pvpEscolherPar('a', { a: fila.a }, agora) === null);
  conferir('quem não está na fila não forma par', R.pvpEscolherPar('q', fila, agora) === null);
  // A janela do que espera há mais tempo vale para os dois.
  const velho = { poder: 100, desde: agora - 60000, sinal: agora };   // ±30%
  const novo  = { poder: 75,  desde: agora, sinal: agora };           // ±10%
  conferir('a maior das duas janelas vale para o par', R.pvpCompativeis(velho, novo, agora));

  titulo('Quem pode entrar em campo');
  global.ehBebe = s => (s.nivel || 1) < 5;
  const bom = { id: 'x', hatched: true, nome: 'Rex,Fulano', nivel: 20 };
  conferir('um avatar bom entra', R.pvpMotivoMembro(bom, {}, false) === null);
  conferir('sem nome não entra', R.pvpMotivoMembro(Object.assign({}, bom, { nome: ',Fulano' }), {}, false) === 'sem_nome');
  conferir('bebê não entra', R.pvpMotivoMembro(Object.assign({}, bom, { nivel: 1 }), {}, false) === 'bebe');
  conferir('morto não entra', R.pvpMotivoMembro(bom, {}, true) === 'morto');
  conferir('sem certidão não entra', R.pvpMotivoMembro(bom, null, false) === 'sem_certidao');
  conferir('à venda não entra', R.pvpMotivoMembro(Object.assign({}, bom, { listed: true }), {}, false) === 'a_venda');
  conferir('ovo não entra', R.pvpMotivoMembro(Object.assign({}, bom, { hatched: false }), {}, false) === 'ovo');
  delete global.ehBebe;
  const ret = R.pvpRetrato(Object.assign({}, bom, { seed: 7, raridade: 'Raro', dna: 'FORJADO' }), { dna: 'VERDADE' });
  conferir('o retrato leva o DNA da certidão, não o do slot', ret.nascimento.dna === 'VERDADE' && !ret.dna);
  conferir('o poder é a soma dos níveis', R.pvpPoder([{ nivel: 30 }, { nivel: 28 }, { nivel: 1 }]) === 59);
}

/* ═══ 1b. A LUTA PELA REDE ═══
   Lutas inteiras jogadas pela IA dos dois lados, passando pelo formato
   da rede (pvpParaRede → pvpPreparar → fuAgir), jogada a jogada, como o
   navegador faz. No fim, a mesma luta refeita da lista (pvpRepetir, como
   o servidor faz) tem de sair IGUAL: mesmo vencedor, mesmas vidas, mesmo
   relógio do acaso. Se não sair, os dois navegadores e o servidor
   discordariam sobre quem ganhou. */
function lutaPelaRede() {
  const GEN = require('../api/_genetica.js');
  Object.assign(global, require('../js/ia-fu.js'));   // a IA joga pelos dois lados
  titulo('A luta pela rede: jogada a jogada = refeita da lista');
  const uidA = 'uA', uidB = 'uB';
  let divergencias = 0, lutas = 0, jogadas = 0, fraudesIgnoradas = 0, porFim = {};
  for (let k = 0; k < 40; k++) {
    const nivel = [8, 20, 35, 55][k % 4];
    const equipe = (dono) => [0, 1, 2].map(i => {
      const c = GEN.certidaoDeInvocacao({ uid: dono, nome: 'T' });
      return { id: `${dono}${i}`, nome: `B${i},T`, nivel, seed: c.seed, raridade: null, nascimento: c.nascimento };
    });
    const sala = { seed: 1000 + k * 7919, inicio: 1e12, lados: { A: uidA, B: uidB },
                   jogadores: { [uidA]: { equipe: equipe('a') }, [uidB]: { equipe: equipe('b') } }, acoes: {} };
    const eq = R.pvpEquipesDaSala(sala);
    const estado = fuIniciar(eq.A, eq.B, sala.seed);
    const ctx = R.pvpContexto(sala);
    let ts = sala.inicio, n = 0, fim = null;
    while (n < 400) {
      R.pvpAvancar(estado);
      if (estado.acabou) break;
      const vez = fuVez(estado);
      ts += 5000;
      let a;
      // De vez em quando: um estouro de tempo, e uma jogada fora da vez (que tem de ser ignorada).
      if (n % 17 === 5) {
        a = { tipo: 'tempo', por: uidA, ts: R.pvpPrazo(ctx) + 1 };
        ts = a.ts;
      } else {
        if (n % 23 === 11) {
          const intruso = { tipo: 'guardar', quem: estado[R.pvpOutroLado(vez.lado)][0].id,
                            por: vez.lado === 'A' ? uidB : uidA, ts };
          sala.acoes[R.pvpChave(n++)] = intruso;
          const p0 = R.pvpPreparar(estado, intruso, ctx);
          if (p0.tipo === 'ignorar') fraudesIgnoradas++;
          R.pvpRegistrar(ctx, p0, false, intruso);
          ts += 1000;
        }
        const d = fuIaDecidir(estado, vez.lado, vez.podem, 'medio');
        const eng = Object.assign({ quem: d.quem }, d.acao);
        a = Object.assign(R.pvpParaRede(estado, eng), { por: vez.lado === 'A' ? uidA : uidB, ts });
      }
      sala.acoes[R.pvpChave(n++)] = a;
      const prep = R.pvpPreparar(estado, a, ctx);
      let ok = prep.eng ? fuAgir(estado, prep.eng).length > 0 : false;
      // A IA pode escolher uma jogada que o motor recusa: no jogo o menu nunca a oferece; aqui cai para a guarda.
      if (prep.tipo === 'jogada' && !ok) {
        const g = { tipo: 'guardar', quem: vez.podem[0], por: a.por, ts: ts + 1 };
        sala.acoes[R.pvpChave(n++)] = g;
        const p2 = R.pvpPreparar(estado, g, ctx);
        ok = fuAgir(estado, p2.eng).length > 0;
        fim = R.pvpRegistrar(ctx, p2, ok, g);
      } else {
        fim = R.pvpRegistrar(ctx, prep, prep.tipo === 'desistir' || ok, a);
      }
      jogadas++;
      if (fim) break;
    }
    if (!fim) { R.pvpAvancar(estado); if (estado.acabou) fim = { vencedor: estado.vencedor, motivo: estado.porLimite ? 'limite' : 'luta' }; }
    const r = R.pvpRepetir(sala);
    const vidas = e => e.A.concat(e.B).map(c => c.pv + '/' + c.pm).join(',');
    const igual = JSON.stringify(r.fim) === JSON.stringify(fim) && vidas(r.estado) === vidas(estado)
               && r.estado.rng.passo === estado.rng.passo && r.estado.ronda === estado.ronda;
    if (!igual) divergencias++;
    if (fim) porFim[fim.motivo] = (porFim[fim.motivo] || 0) + 1;
    lutas++;
  }
  conferir(`${lutas} lutas (${jogadas} jogadas): refeitas iguais às jogadas`, divergencias === 0, { divergencias });
  conferir('as jogadas fora da vez foram ignoradas', fraudesIgnoradas > 0, fraudesIgnoradas);
  conferir('todas as lutas terminaram', Object.values(porFim).reduce((s, x) => s + x, 0) === lutas, porFim);

  titulo('A rede não confia na magia');
  {
    const c = GEN.certidaoDeInvocacao({ uid: 'x', nome: 'T' });
    const sala = { seed: 5, inicio: 0, lados: { A: 'p', B: 'q' },
      jogadores: { p: { equipe: [0, 1, 2].map(i => ({ id: 'p' + i, nome: 'X,T', nivel: 30, seed: c.seed + i, nascimento: c.nascimento })) },
                   q: { equipe: [0, 1, 2].map(i => ({ id: 'q' + i, nome: 'Y,T', nivel: 30, seed: c.seed + 9 + i, nascimento: c.nascimento })) } } };
    const eq = R.pvpEquipesDaSala(sala);
    const estado = fuIniciar(eq.A, eq.B, sala.seed);
    const m = R.pvpParaMotor(estado, { tipo: 'magia', quem: 'A0', lugar: 'forte', magia: { id: 'x', fixo: 999, pm: 0 } });
    conferir('a magia vem da ficha, não do pedido', m && m.magia && m.magia.fixo !== 999 && m.magia.id !== 'x', m && m.magia);
    conferir('lugar inexistente não vira magia', R.pvpParaMotor(estado, { tipo: 'magia', quem: 'A0', lugar: 'hack' }) === null);
    conferir('tipo desconhecido não vira jogada', R.pvpParaMotor(estado, { tipo: 'explodir', quem: 'A0' }) === null);
    const ctx = R.pvpContexto(sala);
    const cedo = R.pvpPreparar(estado, { tipo: 'tempo', por: 'q', ts: R.pvpPrazo(ctx) - 1 }, ctx);
    conferir('"tempo" antes do prazo é ignorado', cedo.tipo === 'ignorar');
    const desc = R.pvpPreparar(estado, { tipo: 'guardar', quem: 'A0', por: 'estranho', ts: 1 }, ctx);
    conferir('quem não está na sala não joga', desc.tipo === 'ignorar');
    const des = R.pvpPreparar(estado, { tipo: 'desistir', por: 'q', ts: 1 }, ctx);
    const f = R.pvpRegistrar(ctx, des, true, { ts: 1 });
    conferir('quem desiste perde', f && f.vencedor === 'A' && f.motivo === 'desistiu', f);
  }
}

// ═══ 2. O SERVIDOR, NOS EMULADORES ═══
async function servidor() {
  const PROJ = 'demo-teste';
  process.env.GCLOUD_PROJECT = PROJ;
  const RT = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  const DB_URL = `http://${RT}?ns=${PROJ}-default-rtdb`;
  process.env.FIREBASE_DATABASE_URL = DB_URL;

  const { initializeApp, getApps } = require('firebase-admin/app');
  if (!getApps().length) initializeApp({ projectId: PROJ, databaseURL: DB_URL });
  const { getFirestore } = require('firebase-admin/firestore');
  const { getDatabase } = require('firebase-admin/database');
  const { getAuth } = require('firebase-admin/auth');
  const fs = getFirestore(), rtdb = getDatabase();
  /* No emulador, o verifyIdToken confere que o usuário existe: cada uid
     do teste ganha a sua conta antes de pedir alguma coisa. */
  const criados = new Set();
  const conta = async uid => {
    if (criados.has(uid)) return;
    criados.add(uid);
    try { await getAuth().createUser({ uid }); } catch (e) { if (e.code !== 'auth/uid-already-exists') throw e; }
  };
  const GEN = require('../api/_genetica.js');
  const handler = require('../api/pvp.js');

  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const token = uid => {
    const t = Math.floor(Date.now() / 1000);
    return [b64({ alg: 'none', typ: 'JWT' }), b64({
      iss: `https://securetoken.google.com/${PROJ}`, aud: PROJ, sub: uid, user_id: uid,
      iat: t, exp: t + 3600, auth_time: t, firebase: { identities: {}, sign_in_provider: 'custom' },
    }), ''].join('.');
  };
  const pedir = async (uid, acao, dados) => {
    await conta(uid);
    let status = 0, corpo = null;
    const res = { status(s) { status = s; return this; }, json(j) { corpo = j; return this; } };
    await handler({ method: 'POST', body: Object.assign({ acao, idToken: token(uid) }, dados || {}) }, res);
    return Object.assign({ status }, corpo);
  };

  // ── os jogadores ──
  const certs = {};
  function avatar(uid, i, nivel, extra) {
    const c = GEN.certidaoDeInvocacao({ uid, nome: 'T' });
    const id = `${uid}_av${i}`;
    certs[uid] = certs[uid] || {};
    certs[uid][id] = c.nascimento;
    return Object.assign({ id, nome: `Bicho${i},${uid}`, nivel, seed: c.seed, raridade: 'Comum',
                           hatched: true, nascimento: c.nascimento }, extra || {});
  }
  async function jogador(uid, niveis, opts) {
    opts = opts || {};
    const slots = niveis.map((n, i) => avatar(uid, i, n, (opts.extra || [])[i]));
    const doc = { nomeJogador: 'Jog ' + uid, avatarSlots: slots, certidoes: certs[uid],
                  gs: { equipa: [0, 1, 2] }, amigos: opts.amigos || {} };
    if (opts.semCertidao) delete doc.certidoes[slots[opts.semCertidao].id];
    await fs.collection('players').doc(uid).set(doc);
    return slots.map(s => s.id);
  }
  const limpar = async () => {
    await rtdb.ref('pvp').remove();
  };

  await limpar();
  const ids = {};
  ids.A = await jogador('A', [30, 30, 30], { amigos: { B: { nome: 'Jog B' } } });
  ids.B = await jogador('B', [28, 30, 30], { amigos: { A: { nome: 'Jog A' } } });
  ids.C = await jogador('C', [60, 60, 60]);
  ids.D = await jogador('D', [30, 30, 31]);
  ids.S = await jogador('S', [20, 20, 20], { extra: [{ nome: ',SemNome' }] });
  ids.K = await jogador('K', [20, 20, 1]);
  ids.X = await jogador('X', [20, 20, 20], { semCertidao: 1 });

  titulo('Entrar na fila e formar par');
  let r = await pedir('A', 'entrar', { ids: ids.A });
  conferir('A entra (poder 90) e espera', r.ok && r.poder === 90 && !r.sala, r);
  r = await pedir('C', 'entrar', { ids: ids.C });
  conferir('C entra (poder 180) e espera — longe de A', r.ok && !r.sala, r);
  r = await pedir('B', 'entrar', { ids: ids.B });
  conferir('B entra (88) e forma par com A', r.ok && !!r.sala, r);
  const sala1 = r.sala;
  const s1 = (await rtdb.ref(`pvp/salas/${sala1}`).once('value')).val() || {};
  conferir('a sala tem os dois, a semente e o estado', s1.estado === 'luta' && s1.seed > 0
    && s1.jogadores && s1.jogadores.A && s1.jogadores.B && s1.tipo === 'fila', s1.estado);
  conferir('lados A e B sorteados entre os dois', [s1.lados && s1.lados.A, s1.lados && s1.lados.B].sort().join() === 'A,B');
  conferir('a equipe vai com o DNA da certidão', s1.jogadores && s1.jogadores.A.equipe.length === 3
    && !!s1.jogadores.A.equipe[0].nascimento && !!s1.jogadores.A.equipe[0].nascimento.dna);
  conferir('o poder de cada um está na sala', s1.jogadores && s1.jogadores.A.poder === 90 && s1.jogadores.B.poder === 88);
  conferir('o versus começa depois de uns segundos', s1.inicio - s1.criada === R.PVP_VERSUS_MS);
  const pa = (await rtdb.ref('pvp/jogador/A/sala').once('value')).val();
  const pb = (await rtdb.ref('pvp/jogador/B/sala').once('value')).val();
  conferir('os dois apontam para a sala', pa === sala1 && pb === sala1, [pa, pb]);
  const fila1 = (await rtdb.ref('pvp/fila').once('value')).val() || {};
  conferir('A e B saem da fila, C fica', !fila1.A && !fila1.B && !!fila1.C, Object.keys(fila1));

  r = await pedir('A', 'entrar', { ids: ids.A });
  conferir('quem está numa sala não entra na fila', r.status === 409 && r.erro === 'em_sala' && r.sala === sala1, r);

  r = await pedir('C', 'procurar');
  conferir('procurar sem par devolve a espera', r.ok && !r.sala && r.poder === 180, r);
  const sinal1 = (await rtdb.ref('pvp/fila/C/sinal').once('value')).val();
  conferir('procurar renova o sinal', sinal1 > 0);

  titulo('Sair da sala');
  r = await pedir('C', 'sairSala', { sala: sala1 });
  conferir('quem não está na sala não a encerra', r.status === 404, r);
  r = await pedir('A', 'sairSala', { sala: sala1 });
  const s1b = (await rtdb.ref(`pvp/salas/${sala1}`).once('value')).val() || {};
  conferir('A sai: a sala encerra, marcando quem saiu', r.ok && s1b.estado === 'encerrada' && s1b.saiu === 'A', s1b.estado);
  const pa2 = (await rtdb.ref('pvp/jogador/A/sala').once('value')).val();
  const pb2 = (await rtdb.ref('pvp/jogador/B/sala').once('value')).val();
  conferir('os dois ponteiros são limpos', !pa2 && !pb2, [pa2, pb2]);
  r = await pedir('A', 'entrar', { ids: ids.A });
  conferir('A volta à fila depois', r.ok, r);
  r = await pedir('A', 'sairFila');
  const fa = (await rtdb.ref('pvp/fila/A').once('value')).val();
  conferir('sairFila tira da fila', r.ok && !fa);
  r = await pedir('A', 'procurar');
  conferir('procurar fora da fila avisa que caiu', r.ok && r.fora === true, r);

  titulo('A equipe como está no banco');
  r = await pedir('A', 'entrar', { ids: ['outro', 'x', 'y'] });
  conferir('ids diferentes do banco: desatualizada', r.status === 409 && r.erro === 'equipe_desatualizada', r);
  r = await pedir('S', 'entrar', { ids: ids.S });
  conferir('sem nome não entra', r.status === 400 && r.erro === 'equipe_invalida'
    && r.motivos && r.motivos[0].motivo === 'sem_nome', r);
  r = await pedir('K', 'entrar', { ids: ids.K });
  conferir('bebê não entra', r.status === 400 && r.motivos && r.motivos[0].motivo === 'bebe', r);
  r = await pedir('X', 'entrar', { ids: ids.X });
  conferir('sem certidão não entra', r.status === 400 && r.motivos && r.motivos[0].motivo === 'sem_certidao', r);
  r = await pedir('Z', 'entrar', { ids: [] });
  conferir('quem não tem jogo salvo recebe 404', r.status === 404 && r.erro === 'sem_jogador', r);
  let status = 0;
  await handler({ method: 'POST', body: { acao: 'entrar', idToken: 'lixo' } },
    { status(s) { status = s; return this; }, json() { return this; } });
  conferir('token inválido recebe 401', status === 401);
  status = 0;
  await conta('A');
  await handler({ method: 'POST', body: { acao: 'hackear', idToken: token('A') } },
    { status(s) { status = s; return this; }, json() { return this; } });
  conferir('ação desconhecida recebe 400', status === 400);

  titulo('Desafiar um amigo');
  await rtdb.ref('pvp/fila').remove();
  r = await pedir('A', 'convidar', { alvo: 'B', ids: ids.A });
  conferir('amigo offline não recebe convite', r.status === 409 && r.erro === 'ele_offline', r);
  await rtdb.ref('pvp/online/B').set({ ts: Date.now(), estado: 'livre' });
  r = await pedir('A', 'convidar', { alvo: 'C', ids: ids.A });
  conferir('quem não é amigo não recebe convite', r.status === 403 && r.erro === 'nao_amigos', r);
  r = await pedir('A', 'convidar', { alvo: 'B', ids: ids.A });
  conferir('A convida B', r.ok && r.expira > Date.now(), r);
  const conv = (await rtdb.ref('pvp/convites/B/A').once('value')).val() || {};
  conferir('o convite leva nome, poder e prazo', conv.nome === 'Jog A' && conv.poder === 90
    && conv.expira - conv.ts === R.PVP_CONVITE_MS, conv);
  r = await pedir('C', 'aceitar', { de: 'A', ids: ids.C });
  conferir('quem não foi convidado não aceita', r.status === 409 && r.erro === 'convite_sumiu', r);
  // B estava na fila: aceitar tira-o de lá.
  await pedir('B', 'entrar', { ids: ids.B });
  r = await pedir('B', 'aceitar', { de: 'A', ids: ids.B });
  conferir('B aceita: sala amistosa', r.ok && !!r.sala, r);
  const s2 = (await rtdb.ref(`pvp/salas/${r.sala}`).once('value')).val() || {};
  conferir('a sala é amistosa', s2.tipo === 'amistosa');
  const conv2 = (await rtdb.ref('pvp/convites/B/A').once('value')).val();
  const fb = (await rtdb.ref('pvp/fila/B').once('value')).val();
  conferir('o convite some e B sai da fila', !conv2 && !fb, [conv2, fb]);
  await pedir('B', 'sairSala', { sala: r.sala });

  await rtdb.ref('pvp/convites/B/A').set({ nome: 'Jog A', poder: 90, ts: Date.now() - 60000, expira: Date.now() - 30000 });
  r = await pedir('B', 'aceitar', { de: 'A', ids: ids.B });
  conferir('convite vencido não se aceita', r.status === 410 && r.erro === 'convite_expirou', r);
  const conv3 = (await rtdb.ref('pvp/convites/B/A').once('value')).val();
  conferir('e o vencido é apagado', !conv3);

  titulo('A corrida: muitos entrando ao mesmo tempo');
  await limpar();
  const multidao = [];
  for (let i = 0; i < 10; i++) {
    const uid = 'M' + i;
    ids[uid] = await jogador(uid, [30, 30, 30]);
    multidao.push(uid);
  }
  await Promise.all(multidao.map(uid => pedir(uid, 'entrar', { ids: ids[uid] })));
  /* E dão sinal como o navegador dá (a cada 4 s), todos ao mesmo tempo,
     até ninguém sobrar. Duas buscas que se cruzam disputam a mesma trava
     e uma delas tenta de novo no sinal seguinte — por isso rodadas. */
  const ptrs = {};
  let rodadas = 0;
  for (; rodadas < 8; rodadas++) {
    for (const uid of multidao) ptrs[uid] = (await rtdb.ref(`pvp/jogador/${uid}/sala`).once('value')).val();
    const faltam = multidao.filter(uid => !ptrs[uid]);
    if (!faltam.length) break;
    const rs = await Promise.all(faltam.map(uid => pedir(uid, 'procurar')));
    // quem caiu da fila sem sala volta, como o navegador faz
    await Promise.all(faltam.filter((uid, k) => rs[k].fora).map(uid => pedir(uid, 'entrar', { ids: ids[uid] })));
  }
  conferir('a corrida resolve em poucas rodadas de sinal', rodadas <= 4, rodadas);
  const salas = {};
  for (const [uid, id] of Object.entries(ptrs)) if (id) (salas[id] = salas[id] || []).push(uid);
  const tamanhos = Object.values(salas).map(v => v.length);
  conferir('todos os 10 acabam numa sala', Object.values(ptrs).every(Boolean), ptrs);
  conferir('5 salas de 2, ninguém em duas', tamanhos.length === 5 && tamanhos.every(n => n === 2), salas);
  let coerentes = true;
  for (const [id, uids] of Object.entries(salas)) {
    const s = (await rtdb.ref(`pvp/salas/${id}`).once('value')).val();
    if (!s || Object.keys(s.jogadores).sort().join() !== uids.slice().sort().join()) coerentes = false;
  }
  conferir('cada sala tem exatamente os dois que apontam para ela', coerentes);
  const orfas = (await rtdb.ref('pvp/salas').once('value')).val() || {};
  conferir('nenhuma sala órfã sobrou', Object.keys(orfas).length === 5, Object.keys(orfas).length);
  const filaFim = (await rtdb.ref('pvp/fila').once('value')).val();
  conferir('a fila termina vazia', !filaFim, filaFim && Object.keys(filaFim));

  titulo('As regras do banco, lidas como jogador');
  await limpar();
  await pedir('A', 'entrar', { ids: ids.A });
  await rtdb.ref('pvp/online/B').set({ ts: Date.now(), estado: 'livre' });
  await pedir('A', 'convidar', { alvo: 'B', ids: ids.A });
  await pedir('D', 'entrar', { ids: ids.D });   // 91 com 90: par A–D
  const salaAD = (await rtdb.ref('pvp/jogador/A/sala').once('value')).val();
  const REST = `http://${RT}`;
  const rest = async (metodo, caminho, uid, corpo) => {
    if (uid) await conta(uid);
    const url = `${REST}/${caminho}.json?ns=${PROJ}-default-rtdb` + (uid ? `&auth=${token(uid)}` : '');
    const res = await fetch(url, { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    return res.status;
  };
  conferir('par A–D formado para o teste das regras', !!salaAD);
  conferir('ler a sala sendo parte dela', await rest('GET', `pvp/salas/${salaAD}`, 'A') === 200);
  conferir('ler a sala de fora: negado', await rest('GET', `pvp/salas/${salaAD}`, 'C') === 401);
  conferir('ler a sala sem login: negado', await rest('GET', `pvp/salas/${salaAD}`, null) === 401);
  conferir('escrever na sala: negado', await rest('PUT', `pvp/salas/${salaAD}/estado`, 'A', 'luta') === 401);
  const TS = { '.sv': 'timestamp' };
  conferir('marcar a própria presença na sala', await rest('PUT', `pvp/salas/${salaAD}/presenca/A`, 'A', { on: TS }) === 200);
  conferir('marcar-se fora (o onDisconnect)', await rest('PUT', `pvp/salas/${salaAD}/presenca/A`, 'A', { fora: TS }) === 200);
  conferir('presença sem forma: negado', await rest('PUT', `pvp/salas/${salaAD}/presenca/A`, 'A', TS) === 401);
  conferir('marcar a presença do outro: negado', await rest('PUT', `pvp/salas/${salaAD}/presenca/D`, 'A', { on: TS }) === 401);
  conferir('presença numa sala alheia: negado', await rest('PUT', `pvp/salas/${salaAD}/presenca/C`, 'C', { on: TS }) === 401);

  // As jogadas.
  const J = (x) => Object.assign({ tipo: 'guardar', quem: 'A0', ts: TS }, x);
  conferir('escrever a própria jogada', await rest('PUT', `pvp/salas/${salaAD}/acoes/0000`, 'A', J({ por: 'A' })) === 200);
  conferir('reescrever uma jogada: negado', await rest('PUT', `pvp/salas/${salaAD}/acoes/0000`, 'A', J({ por: 'A', tipo: 'atacar' })) === 401);
  conferir('apagar uma jogada: negado', await rest('DELETE', `pvp/salas/${salaAD}/acoes/0000`, 'A') === 401);
  conferir('jogada em nome do outro: negado', await rest('PUT', `pvp/salas/${salaAD}/acoes/0001`, 'A', J({ por: 'D' })) === 401);
  conferir('jogada com hora inventada: negado', await rest('PUT', `pvp/salas/${salaAD}/acoes/0001`, 'A', J({ por: 'A', ts: 1 })) === 401);
  conferir('jogada de tipo inventado: negado', await rest('PUT', `pvp/salas/${salaAD}/acoes/0001`, 'A', J({ por: 'A', tipo: 'vencer' })) === 401);
  conferir('jogada com campo a mais (a magia inteira): negado',
    await rest('PUT', `pvp/salas/${salaAD}/acoes/0001`, 'A', J({ por: 'A', tipo: 'magia', lugar: 'forte', magia: { fixo: 999 } })) === 401);
  conferir('jogada numa casa fora do formato: negado', await rest('PUT', `pvp/salas/${salaAD}/acoes/1`, 'A', J({ por: 'A' })) === 401);
  conferir('jogada de quem não está na sala: negado', await rest('PUT', `pvp/salas/${salaAD}/acoes/0001`, 'C', J({ por: 'C' })) === 401);
  conferir('o outro também escreve a sua', await rest('PUT', `pvp/salas/${salaAD}/acoes/0001`, 'D', J({ por: 'D', quem: 'B0' })) === 200);
  conferir('ler o próprio ponteiro', await rest('GET', 'pvp/jogador/A', 'A') === 200);
  conferir('ler o ponteiro de outro: negado', await rest('GET', 'pvp/jogador/A', 'D') === 401);
  conferir('escrever o próprio ponteiro: negado', await rest('PUT', 'pvp/jogador/A/sala', 'A', 'forjada') === 401);

  await pedir('C', 'entrar', { ids: ids.C });
  conferir('ler a própria entrada na fila', await rest('GET', 'pvp/fila/C', 'C') === 200);
  conferir('ler a fila de outro: negado', await rest('GET', 'pvp/fila/C', 'A') === 401);
  conferir('ler a fila inteira: negado', await rest('GET', 'pvp/fila', 'C') === 401);
  conferir('escrever a própria entrada (poder forjado): negado',
    await rest('PUT', 'pvp/fila/C', 'C', { poder: 3, desde: 1, sinal: 1 }) === 401);
  conferir('apagar a própria entrada', await rest('DELETE', 'pvp/fila/C', 'C') === 200);
  conferir('apagar a entrada de outro: negado', await rest('DELETE', 'pvp/fila/A', 'C') === 401);
  conferir('ler a equipe de quem espera: negado', await rest('GET', 'pvp/filaEquipe', 'C') === 401);

  conferir('marcar-se online', await rest('PUT', 'pvp/online/C', 'C', { ts: { '.sv': 'timestamp' }, estado: 'livre' }) === 200);
  conferir('online com estado inventado: negado', await rest('PUT', 'pvp/online/C', 'C', { ts: { '.sv': 'timestamp' }, estado: 'deus' }) === 401);
  conferir('online no futuro distante: negado', await rest('PUT', 'pvp/online/C', 'C', { ts: Date.now() + 86400000, estado: 'livre' }) === 401);
  conferir('marcar outro online: negado', await rest('PUT', 'pvp/online/A', 'C', { ts: { '.sv': 'timestamp' }, estado: 'livre' }) === 401);
  conferir('ver quem está online (amigos)', await rest('GET', 'pvp/online/B', 'A') === 200);

  conferir('o convidado lê os convites', await rest('GET', 'pvp/convites/B', 'B') === 200);
  conferir('quem convidou lê o próprio convite', await rest('GET', 'pvp/convites/B/A', 'A') === 200);
  conferir('um terceiro não lê', await rest('GET', 'pvp/convites/B/A', 'C') === 401);
  conferir('forjar um convite: negado', await rest('PUT', 'pvp/convites/B/C', 'C', { nome: 'x', poder: 1, ts: 1, expira: 9e15 }) === 401);
  conferir('o convidado recusa (apaga)', await rest('DELETE', 'pvp/convites/B/A', 'B') === 200);

  titulo('A luta: sair, desistir, W.O. e a conferência');
  await limpar();
  // Sair durante o versus: a sala se desfaz, sem vencedor.
  await pedir('A', 'entrar', { ids: ids.A });
  r = await pedir('D', 'entrar', { ids: ids.D });
  let sv = r.sala;
  r = await pedir('A', 'sairSala', { sala: sv });
  let sx = (await rtdb.ref(`pvp/salas/${sv}`).once('value')).val() || {};
  conferir('sair no versus: encerrada, sem vencedor', sx.estado === 'encerrada' && !sx.vencedor, sx.estado);
  // Depois do versus, sair é desistir.
  await pedir('A', 'entrar', { ids: ids.A });
  r = await pedir('D', 'entrar', { ids: ids.D });
  sv = r.sala;
  await rtdb.ref(`pvp/salas/${sv}/inicio`).set(Date.now() - 1000);
  r = await pedir('A', 'encerrar', { sala: sv });
  conferir('encerrar no meio da luta: ainda em curso', r.status === 409 && r.erro === 'em_curso', r);
  r = await pedir('D', 'sairSala', { sala: sv });
  sx = (await rtdb.ref(`pvp/salas/${sv}`).once('value')).val() || {};
  conferir('sair na luta: o outro vence por desistência', sx.estado === 'fim' && sx.vencedor === 'A' && sx.motivo === 'desistiu', sx);
  const pa3 = (await rtdb.ref('pvp/jogador/A/sala').once('value')).val();
  conferir('e os ponteiros saem', !pa3);
  r = await pedir('A', 'encerrar', { sala: sv });
  conferir('encerrar de novo devolve o mesmo fim', r.ok && r.vencedor === 'A' && r.motivo === 'desistiu', r);

  // W.O.: o outro caiu há mais de 2 minutos.
  await pedir('A', 'entrar', { ids: ids.A });
  r = await pedir('D', 'entrar', { ids: ids.D });
  sv = r.sala;
  await rtdb.ref(`pvp/salas/${sv}/inicio`).set(Date.now() - 1000);
  await rtdb.ref(`pvp/salas/${sv}/presenca/D`).set({ fora: Date.now() - 60000 });
  r = await pedir('A', 'encerrar', { sala: sv });
  conferir('caiu há 1 minuto: ainda não é W.O.', r.status === 409, r);
  await rtdb.ref(`pvp/salas/${sv}/presenca/D`).set({ fora: Date.now() - 130000 });
  r = await pedir('A', 'encerrar', { sala: sv });
  conferir('caiu há mais de 2 minutos: W.O.', r.ok && r.vencedor === 'A' && r.motivo === 'desconectou', r);

  // Uma luta inteira pela lista de jogadas, e a conferência do servidor.
  Object.assign(global, require('../js/ia-fu.js'));
  await pedir('A', 'entrar', { ids: ids.A });
  r = await pedir('D', 'entrar', { ids: ids.D });
  sv = r.sala;
  const inicio = Date.now() - 1000;
  await rtdb.ref(`pvp/salas/${sv}/inicio`).set(inicio);
  let salaV = (await rtdb.ref(`pvp/salas/${sv}`).once('value')).val();
  const eqV = R.pvpEquipesDaSala(salaV);
  const est = fuIniciar(eqV.A, eqV.B, salaV.seed);
  const ctxV = R.pvpContexto(salaV);
  let nJ = 0, fimLocal = null;
  while (nJ < 300) {
    R.pvpAvancar(est);
    if (est.acabou) break;
    const vez = fuVez(est);
    const d = fuIaDecidir(est, vez.lado, vez.podem, 'medio');
    const eng = Object.assign({ quem: d.quem }, d.acao);
    let a = Object.assign(R.pvpParaRede(est, eng), { por: salaV.lados[vez.lado], ts: inicio + (nJ + 1) * 1000 });
    let prep = R.pvpPreparar(est, a, ctxV);
    let okJ = prep.eng ? fuAgir(est, prep.eng).length > 0 : false;
    if (!okJ) { a = { tipo: 'guardar', quem: vez.podem[0], por: a.por, ts: a.ts }; prep = R.pvpPreparar(est, a, ctxV); okJ = fuAgir(est, prep.eng).length > 0; }
    await rtdb.ref(`pvp/salas/${sv}/acoes/${R.pvpChave(nJ++)}`).set(a);
    fimLocal = R.pvpRegistrar(ctxV, prep, okJ, a);
    if (fimLocal) break;
  }
  if (!fimLocal) { R.pvpAvancar(est); fimLocal = { vencedor: est.vencedor, motivo: est.porLimite ? 'limite' : 'luta' }; }
  r = await pedir('D', 'encerrar', { sala: sv });
  const esperado = fimLocal.vencedor ? salaV.lados[fimLocal.vencedor] : null;
  conferir(`a conferência (${nJ} jogadas) dá o mesmo vencedor da luta`, r.ok && r.vencedor === esperado && r.motivo === fimLocal.motivo,
           { servidor: r, esperado, motivo: fimLocal.motivo });

  await limpar();
  console.log('\n(servidor testado contra os emuladores)');
}

(async () => {
  regrasPuras();
  try { lutaPelaRede(); }
  catch (e) { mau++; falhas.push('  ✗ o teste da luta pela rede quebrou: ' + (e && e.stack || e)); }
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST && process.env.FIRESTORE_EMULATOR_HOST) {
    try { await servidor(); }
    catch (e) { mau++; falhas.push('  ✗ o teste do servidor quebrou: ' + (e && e.stack || e)); }
  } else {
    console.log('\n(sem emuladores: só as regras puras. Ver o cabeçalho para rodar o servidor.)');
  }
  console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '') + `${ok} passaram · ${mau} falharam`);
  process.exit(mau ? 1 : 0);
})();
