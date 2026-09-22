// ═══════════════════════════════════════════════════════════════════
//  api/pvp.js — o pareamento do PvP (Vercel Serverless Function)
//
//  POST { acao, idToken, ... }
//    acao='entrar'    → entra na fila com a equipe de batalha   { ids }
//    acao='procurar'  → sinal de vida na fila, e tenta formar par
//    acao='sairFila'  → sai da fila
//    acao='convidar'  → desafia um amigo (amistoso, fora do ranking) { alvo, ids }
//    acao='aceitar'   → aceita o desafio de um amigo            { de, ids }
//    acao='sairSala'  → deixa a sala (depois do versus é desistir) { sala }
//    acao='encerrar'  → refaz a luta e grava o vencedor, ou o W.O. { sala }
//
// ── QUEM DECIDE O QUÊ ──
//
// O navegador pede; o servidor decide. Quem forma o par é esta função,
// numa transação sobre a fila inteira: no PvP antigo (js/arena.js) cada
// navegador desafiava o primeiro que via na lista, e dois jogadores
// viravam o par de duas pessoas ao mesmo tempo.
//
// A EQUIPE é lida do banco, e não do pedido: o DNA sai das certidões,
// que só o servidor grava. O `ids` do pedido serve só para conferir que
// o que o jogador vê na tela é o que está gravado — se não for, o save
// ainda não chegou, e o navegador grava e tenta de novo.
//
// ── O QUE AINDA NÃO ESTÁ PROTEGIDO ──
//
// O NÍVEL. Ele vive no avatarSlots, que o cliente grava; quem mexer no
// save sobe um avatar ao 60. Enquanto não houver ranking isso não vale
// nada; antes de o ranking contar (etapa 3), o nível tem de passar a ter
// quem o confira no servidor.
//
// ── O CAMINHO NO BANCO (Realtime Database) ──
//
//   pvp/online/{uid}        a presença (escrita pelo próprio jogador)
//   pvp/fila/{uid}          { poder, desde, sinal, nome }   ← só o servidor
//   pvp/filaEquipe/{uid}    os três retratos de quem espera ← só o servidor
//   pvp/jogador/{uid}/sala  a sala em que ele está          ← só o servidor
//   pvp/convites/{para}/{de} o desafio de um amigo          ← só o servidor
//   pvp/salas/{id}          a sala: semente, equipes, estado
//
// As regras estão em database.rules.json, bloco "pvp".
// ═══════════════════════════════════════════════════════════════════
const crypto = require('crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth }      = require('firebase-admin/auth');
const { getDatabase }  = require('firebase-admin/database');

// O ehBebe, a ficha e o motor, como os outros endpoints os carregam.
require('./_genetica.js');
const R = require('../js/pvp-regras.js');

const DB_URL = process.env.FIREBASE_DATABASE_URL || 'https://fractured-veil-default-rtdb.firebaseio.com';

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: DB_URL,
    });
  }
  return { db: getFirestore(), auth: getAuth(), rtdb: getDatabase() };
}

// Os estados de uma sala em que o jogador ainda está.
const SALA_VIVA = ['preparando', 'luta'];

/* O motor e a IA não estão no _genetica.js inteiros: a IA não entra, mas
   o motor sim (fuIniciar, fuAgir…), e é ele que refaz a luta. */

class Recusa extends Error {
  constructor(status, codigo, extra) { super(codigo); this.status = status; this.codigo = codigo; this.extra = extra || {}; }
}

// ── A EQUIPE, COMO ESTÁ NO BANCO ─────────────────────────────────
/* A mesma escolha do js/equipa.js (equipaIdx): o que o jogador escolheu,
   saneado; se nunca escolheu, os primeiros disponíveis. */
function _idxDaEquipa(gs, slots) {
  const elegivel = s => !!(s && s.hatched && !s.dead && !s.pendingEgg && !s.listed);
  const escolheu = gs && Array.isArray(gs.equipa);
  const out = [], vistos = new Set();
  for (const i of (escolheu ? gs.equipa : [])) {
    if (typeof i !== 'number' || vistos.has(i) || !elegivel(slots[i])) continue;
    vistos.add(i); out.push(i);
    if (out.length >= R.PVP_EQUIPA) break;
  }
  if (!out.length && !(escolheu && gs.equipa.length === 0)) {
    for (let i = 0; i < slots.length && out.length < R.PVP_EQUIPA; i++) {
      if (elegivel(slots[i])) out.push(i);
    }
  }
  return out;
}

async function lerEquipa(db, uid, idsDoPedido) {
  const snap = await db.collection('players').doc(uid).get();
  if (!snap.exists) throw new Recusa(404, 'sem_jogador');
  const d = snap.data();
  const slots = d.avatarSlots || [];
  const certidoes = d.certidoes || {};
  const mortos = d.mortos || {};
  const idx = _idxDaEquipa(d.gs || {}, slots);
  if (idx.length < R.PVP_EQUIPA) throw new Recusa(400, 'equipe_incompleta');

  const retratos = [], motivos = [];
  for (const i of idx) {
    const s = slots[i];
    const motivo = R.pvpMotivoMembro(s, certidoes[s && s.id], mortos[s && s.id]);
    if (motivo) { motivos.push({ id: s && s.id, nome: s && s.nome, motivo }); continue; }
    retratos.push(R.pvpRetrato(s, certidoes[s.id]));
  }
  if (motivos.length) throw new Recusa(400, 'equipe_invalida', { motivos });

  if (Array.isArray(idsDoPedido)) {
    const noBanco = retratos.map(r => r.id).join(',');
    if (idsDoPedido.join(',') !== noBanco) throw new Recusa(409, 'equipe_desatualizada');
  }
  return {
    nome: String(d.nomeJogador || 'Viajante').slice(0, 40),
    amigos: d.amigos || {},
    retratos,
    poder: R.pvpPoder(retratos),
  };
}

// ── ESTAR LIVRE ──────────────────────────────────────────────────
/* Livre é não ter sala viva. Um ponteiro para uma sala que acabou (ou
   que sumiu) é lixo de uma partida anterior, e limpa-se aqui. */
async function salaViva(rtdb, uid) {
  const ptr = await rtdb.ref(`pvp/jogador/${uid}/sala`).once('value');
  const id = ptr.val();
  if (!id) return null;
  const sala = (await rtdb.ref(`pvp/salas/${id}`).once('value')).val();
  if (sala && SALA_VIVA.indexOf(sala.estado) !== -1) return id;
  await rtdb.ref(`pvp/jogador/${uid}/sala`).transaction(v => (v === id ? null : v));
  return null;
}

async function exigirLivre(rtdb, uid, quem) {
  const id = await salaViva(rtdb, uid);
  if (id) throw new Recusa(409, quem === 'eu' ? 'em_sala' : 'ele_em_sala', quem === 'eu' ? { sala: id } : {});
}

// ── A SALA ───────────────────────────────────────────────────────
/* Cria a sala e só depois aponta os dois para ela, cada um numa
   transação que falha se ele já tiver outra: uma pessoa nunca fica com
   duas salas, nem se a fila e um convite a pegarem no mesmo instante. */
async function criarSala(rtdb, tipo, a, b) {
  const ref = rtdb.ref('pvp/salas').push();
  const id = ref.key;
  const agora = Date.now();
  const aEhA = crypto.randomInt(0, 2) === 0;
  const jogadores = {};
  jogadores[a.uid] = { nome: a.nome, poder: a.poder, equipe: a.retratos };
  jogadores[b.uid] = { nome: b.nome, poder: b.poder, equipe: b.retratos };
  await ref.set({
    id, tipo,
    criada: agora,
    inicio: agora + R.PVP_VERSUS_MS,
    seed: crypto.randomInt(1, 2147483646),
    /* Já em luta: o versus é só a tela até `inicio`, e a primeira jogada
       conta o relógio a partir dele (pvpContexto). */
    estado: 'luta',
    lados: { A: aEhA ? a.uid : b.uid, B: aEhA ? b.uid : a.uid },
    jogadores,
  });

  const reservar = uid => rtdb.ref(`pvp/jogador/${uid}/sala`)
    .transaction(v => (v && v !== id ? undefined : id))
    .then(r => r.committed);
  const okA = await reservar(a.uid);
  const okB = okA && await reservar(b.uid);
  if (!okA || !okB) {
    if (okA) await rtdb.ref(`pvp/jogador/${a.uid}/sala`).transaction(v => (v === id ? null : v));
    await ref.remove();
    return null;
  }
  // Fora da fila e sem convites pendurados entre os dois.
  await rtdb.ref().update({
    [`pvp/fila/${a.uid}`]: null, [`pvp/filaEquipe/${a.uid}`]: null,
    [`pvp/fila/${b.uid}`]: null, [`pvp/filaEquipe/${b.uid}`]: null,
    [`pvp/convites/${a.uid}/${b.uid}`]: null,
    [`pvp/convites/${b.uid}/${a.uid}`]: null,
  });
  return id;
}

// ── A FILA ───────────────────────────────────────────────────────
/* ── FORMAR PAR SEM TRAVAR A FILA INTEIRA ──

   A primeira versão era UMA transação sobre a fila toda. Nos testes, dez
   jogadores entrando ao mesmo tempo derrubaram-na: toda escrita numa
   entrada (o sinal de um, a saída de outro) invalida a transação de
   cima, e ela desiste depois de 25 voltas ("maxretry") — na hora de
   mais movimento, ninguém formava par.

   Agora lê-se a fila, escolhe-se o par, e travam-se só as DUAS entradas,
   cada uma na sua transação pequena, sempre na mesma ordem (a do uid):
   duas buscas que se cruzam disputam a primeira trava, uma ganha e a
   outra tenta no próximo sinal. A trava (`res`) diz quem a pôs e quando,
   e vence sozinha em PVP_RESERVA_MS se o servidor cair no meio. */
async function _reservar(rtdb, uid, por) {
  try {
    const r = await rtdb.ref(`pvp/fila/${uid}`).transaction(e => {
      if (e === null) return null;                 // sem cache ainda: o servidor manda outra volta
      const agora = Date.now();
      if (R.pvpReservada(e, agora, por)) return;   // de outro: desiste
      e.res = { por, em: agora };
      return e;
    });
    const v = r.committed && r.snapshot.val();
    return !!(v && v.res && v.res.por === por);
  } catch (e) { return false; }                     // a transação caiu (outra escrita no meio)
}
async function _soltar(rtdb, uid, por) {
  try {
    await rtdb.ref(`pvp/fila/${uid}/res`).transaction(r => (r && r.por === por ? null : r));
  } catch (e) {}
}

async function tentarPar(rtdb, uid) {
  const filaSnap = await rtdb.ref('pvp/fila').once('value');
  const fila = filaSnap.val() || {};
  const eu = fila[uid];
  if (!eu || !(eu.poder > 0)) return { sala: null, eu: null };
  const agora = Date.now();
  // O sinal de vida (só o campo, para não pisar numa trava que chegue no meio).
  rtdb.ref(`pvp/fila/${uid}/sinal`).set(agora).catch(() => {});
  eu.sinal = agora;
  if (R.pvpReservada(eu, agora, uid)) return { sala: null, eu };   // alguém está formando par comigo

  const par = R.pvpEscolherPar(uid, fila, agora);
  if (!par) return { sala: null, eu };

  const ordem = [uid, par].sort();
  const ok1 = await _reservar(rtdb, ordem[0], uid);
  const ok2 = ok1 && await _reservar(rtdb, ordem[1], uid);
  if (!ok1 || !ok2) {
    if (ok1) await _soltar(rtdb, ordem[0], uid);
    return { sala: null, eu };
  }

  const [equipeEu, equipeEle] = await Promise.all([
    rtdb.ref(`pvp/filaEquipe/${uid}`).once('value'),
    rtdb.ref(`pvp/filaEquipe/${par}`).once('value'),
  ]);
  const A = equipeEu.val(), B = equipeEle.val();
  const sala = (A && B) ? await criarSala(rtdb, 'fila',
    Object.assign({ uid }, A), Object.assign({ uid: par }, B)) : null;
  if (!sala) {
    // Não deu (um dos dois arranjou sala por outro caminho): as travas saem.
    await _soltar(rtdb, uid, uid);
    await _soltar(rtdb, par, uid);
  }
  return { sala, eu };
}

async function acaoEntrar(ctx) {
  const { db, rtdb, uid, body } = ctx;
  await exigirLivre(rtdb, uid, 'eu');
  const eq = await lerEquipa(db, uid, body.ids);
  const agora = Date.now();
  await rtdb.ref().update({
    [`pvp/fila/${uid}`]: { poder: eq.poder, desde: agora, sinal: agora, nome: eq.nome },
    [`pvp/filaEquipe/${uid}`]: { nome: eq.nome, poder: eq.poder, retratos: eq.retratos },
  });
  const r = await tentarPar(rtdb, uid);
  return { poder: eq.poder, desde: agora, sala: r.sala };
}

async function acaoProcurar(ctx) {
  const { rtdb, uid } = ctx;
  const r = await tentarPar(rtdb, uid);
  if (r.sala) return { sala: r.sala };
  if (!r.eu) {
    // Saiu da fila: ou foi pareado por outro (tem sala), ou caiu dela.
    const sala = await salaViva(rtdb, uid);
    // Um resto de sinal que chegou depois de a sala tirar a entrada: limpa.
    if (sala) rtdb.ref(`pvp/fila/${uid}`).remove().catch(() => {});
    return sala ? { sala } : { fora: true };
  }
  return { sala: null, poder: r.eu.poder, desde: r.eu.desde };
}

async function acaoSairFila(ctx) {
  const { rtdb, uid } = ctx;
  await rtdb.ref().update({ [`pvp/fila/${uid}`]: null, [`pvp/filaEquipe/${uid}`]: null });
  return {};
}

// ── OS AMIGOS ────────────────────────────────────────────────────
async function acaoConvidar(ctx) {
  const { db, rtdb, uid, body } = ctx;
  const alvo = String(body.alvo || '');
  if (!alvo || alvo === uid || alvo.length > 128) throw new Recusa(400, 'parametros');
  const eu = await lerEquipa(db, uid, body.ids);
  if (!eu.amigos[alvo]) throw new Recusa(403, 'nao_amigos');
  await exigirLivre(rtdb, uid, 'eu');
  await exigirLivre(rtdb, alvo, 'ele');

  const on = (await rtdb.ref(`pvp/online/${alvo}`).once('value')).val();
  const agora = Date.now();
  if (!on || !(agora - (on.ts || 0) < R.PVP_ONLINE_MS)) throw new Recusa(409, 'ele_offline');

  const expira = agora + R.PVP_CONVITE_MS;
  await rtdb.ref(`pvp/convites/${alvo}/${uid}`).set({ nome: eu.nome, poder: eu.poder, ts: agora, expira });
  return { expira };
}

async function acaoAceitar(ctx) {
  const { db, rtdb, uid, body } = ctx;
  const de = String(body.de || '');
  if (!de || de === uid || de.length > 128) throw new Recusa(400, 'parametros');
  const cRef = rtdb.ref(`pvp/convites/${uid}/${de}`);
  const convite = (await cRef.once('value')).val();
  if (!convite) throw new Recusa(409, 'convite_sumiu');
  if (Date.now() > (convite.expira || 0)) { await cRef.remove(); throw new Recusa(410, 'convite_expirou'); }

  const [eu, ele] = await Promise.all([lerEquipa(db, uid, body.ids), lerEquipa(db, de, null)
    .catch(e => { throw (e instanceof Recusa) ? new Recusa(409, 'ele_sem_equipe') : e; })]);
  await exigirLivre(rtdb, uid, 'eu');
  await exigirLivre(rtdb, de, 'ele');

  const sala = await criarSala(rtdb, 'amistosa',
    Object.assign({ uid: de }, ele), Object.assign({ uid }, eu));
  if (!sala) throw new Recusa(409, 'ele_em_sala');
  return { sala };
}

// ── O FIM DA SALA ────────────────────────────────────────────────
/* Grava o fim uma vez só (os dois navegadores chamam, às vezes no mesmo
   instante) e solta os dois ponteiros. O resultado é o mesmo para os
   dois pedidos, porque vem da mesma luta refeita. */
async function fecharSala(rtdb, id, sala, dados) {
  const ref = rtdb.ref(`pvp/salas/${id}`);
  /* O `null` da primeira volta é "ainda não li", e não "não há sala":
     devolvê-lo faz o Firebase ir buscar o valor e rodar de novo. Desistir
     aí (undefined) abortava sem nunca consultar o servidor — a sala não
     fechava nunca (visto nos testes). */
  const r = await ref.child('estado').transaction(e =>
    (e === null ? null : SALA_VIVA.indexOf(e) !== -1 ? 'fim' : undefined));
  if (r.committed) await ref.update(Object.assign({ fim: Date.now() }, dados));
  for (const q of Object.keys(sala.jogadores || {})) {
    await rtdb.ref(`pvp/jogador/${q}/sala`).transaction(v => (v === id ? null : v));
  }
  const final = (await ref.once('value')).val() || {};
  return { vencedor: final.vencedor || null, motivo: final.motivo || null, estado: final.estado };
}

async function lerSalaMinha(rtdb, uid, body) {
  const id = String(body.sala || '');
  if (!id || id.length > 64) throw new Recusa(400, 'parametros');
  const sala = (await rtdb.ref(`pvp/salas/${id}`).once('value')).val();
  if (!sala || !sala.jogadores || !sala.jogadores[uid]) throw new Recusa(404, 'sem_sala');
  return { id, sala };
}

/* ── SAIR ──
   Durante o versus, sair desfaz a sala para os dois, sem vencedor.
   Depois dele, a luta começou: sair é desistir, e o outro vence. */
async function acaoSairSala(ctx) {
  const { rtdb, uid, body } = ctx;
  const { id, sala } = await lerSalaMinha(rtdb, uid, body);
  if (SALA_VIVA.indexOf(sala.estado) === -1) {
    // Já acabou: só solta o ponteiro que tiver ficado.
    await rtdb.ref(`pvp/jogador/${uid}/sala`).transaction(v => (v === id ? null : v));
    return {};
  }
  if (Date.now() < (sala.inicio || 0)) {
    return fecharSala(rtdb, id, sala, { estado: 'encerrada', motivo: 'saiu', saiu: uid, vencedor: null });
  }
  const outro = R.pvpOutroLado(R.pvpLadoDe(sala, uid));
  return fecharSala(rtdb, id, sala, { vencedor: sala.lados[outro], motivo: 'desistiu', saiu: uid });
}

/* ── ENCERRAR: A CONFERÊNCIA ──
   O navegador diz que a luta acabou; o servidor não acredita, refaz.
   A luta inteira sai da semente e da lista de jogadas (pvpRepetir, a
   mesma conta dos navegadores), e o vencedor é o que a refeita disser.

   Se a luta ainda não acabou, a única coisa que se pode reclamar é o
   W.O.: o outro está desconectado há mais de 2 minutos (a presença dele
   na sala diz desde quando). Nada disso? A luta segue. */
async function acaoEncerrar(ctx) {
  const { rtdb, uid, body } = ctx;
  const { id, sala } = await lerSalaMinha(rtdb, uid, body);
  if (SALA_VIVA.indexOf(sala.estado) === -1) {
    await rtdb.ref(`pvp/jogador/${uid}/sala`).transaction(v => (v === id ? null : v));
    return { vencedor: sala.vencedor || null, motivo: sala.motivo || null, estado: sala.estado };
  }
  const r = R.pvpRepetir(sala);
  if (r.fim) {
    const vencedor = r.fim.vencedor ? sala.lados[r.fim.vencedor] : null;
    return fecharSala(rtdb, id, sala, { vencedor, motivo: r.fim.motivo, jogadas: r.lidas });
  }
  const meuLado = R.pvpLadoDe(sala, uid);
  const outroUid = sala.lados[R.pvpOutroLado(meuLado)];
  const p = (sala.presenca || {})[outroUid] || {};
  const agora = Date.now();
  // Nunca apareceu na luta: conta desde o começo dela.
  const foraDesde = p.fora ? p.fora : (!p.on ? (sala.inicio || agora) : null);
  if (foraDesde && agora - foraDesde > R.PVP_FORA_MS) {
    return fecharSala(rtdb, id, sala, { vencedor: uid, motivo: 'desconectou', jogadas: r.lidas });
  }
  throw new Recusa(409, 'em_curso');
}

const ACOES = {
  entrar: acaoEntrar, procurar: acaoProcurar, sairFila: acaoSairFila,
  convidar: acaoConvidar, aceitar: acaoAceitar, sairSala: acaoSairSala, encerrar: acaoEncerrar,
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'metodo' });
  const body = req.body || {};
  const fn = ACOES[body.acao];
  if (!fn) return res.status(400).json({ erro: 'acao' });

  const { db, auth, rtdb } = initAdmin();
  let uid;
  try { uid = (await auth.verifyIdToken(String(body.idToken || ''))).uid; }
  catch { return res.status(401).json({ erro: 'token' }); }

  try {
    const r = await fn({ db, rtdb, uid, body });
    return res.status(200).json(Object.assign({ ok: true }, r));
  } catch (e) {
    if (e instanceof Recusa) return res.status(e.status).json(Object.assign({ ok: false, erro: e.codigo }, e.extra));
    console.error('[pvp/' + body.acao + ']', e);
    return res.status(500).json({ ok: false, erro: 'interno' });
  }
};

// Para os testes (tools/testar-pvp.js).
module.exports._interno = { lerEquipa, tentarPar, criarSala, salaViva, _idxDaEquipa };
