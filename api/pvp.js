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
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth }      = require('firebase-admin/auth');
const { getDatabase }  = require('firebase-admin/database');

// O ehBebe, a ficha e o motor, como os outros endpoints os carregam.
require('./_genetica.js');
const NIV = require('../js/niveis.js');   // o nível que o servidor reconhece
const R = require('../js/pvp-regras.js');
const RK = require('../js/pvp-rank.js');   // os pontos da temporada
const TP = require('../js/temporada.js');  // o selo e o prémio da temporada
const CRIS = require('./_cristais.js');    // os dois baldes de cristais

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

  /* ── O NÍVEL COM QUE SE ENTRA NA SALA ──

     Não é o do `avatarSlots`, que o cliente grava: é o do mapa `niveis`,
     que só o servidor escreve (js/niveis.js). Editar o save para entrar
     no PvP com um bicho de nível 60 deixa de servir para nada — o que
     conta aqui é o que ficou registado, degrau a degrau.

     Quem ainda não tem registo é anotado AGORA, com o nível que o slot
     diz: são os avatares anteriores a isto, e é o primeiro (e único)
     encontro em que o servidor acredita no cliente. Os que nascem a
     partir daqui já vêm registados no nível 1 (api/pool.js). */
  const niveis = d.niveis || {};
  const anotar = {};
  const agora  = Date.now();

  const retratos = [], motivos = [];
  for (const i of idx) {
    const s = slots[i];
    const motivo = R.pvpMotivoMembro(s, certidoes[s && s.id], mortos[s && s.id]);
    if (motivo) { motivos.push({ id: s && s.id, nome: s && s.nome, motivo }); continue; }
    let nivel = NIV.nivelDe(niveis, s.id, s);
    if (!(niveis[s.id] && niveis[s.id].n > 0)) {
      const r = NIV.nivelAceitar(null, s.nivel, agora);
      anotar[`niveis.${s.id}`] = r.reg;
      nivel = r.reg.n;
    }
    retratos.push(R.pvpRetrato(s, certidoes[s.id], nivel));
  }
  if (motivos.length) throw new Recusa(400, 'equipe_invalida', { motivos });
  /* Fora da leitura e sem esperar: se falhar, o pior que acontece é o
     avatar ser anotado na próxima vez. Não é dono de nada aqui. */
  if (Object.keys(anotar).length) {
    db.collection('players').doc(uid).update(anotar).catch(() => {});
  }

  if (Array.isArray(idsDoPedido)) {
    const noBanco = retratos.map(r => r.id).join(',');
    if (idsDoPedido.join(',') !== noBanco) throw new Recusa(409, 'equipe_desatualizada');
  }
  const poder = R.pvpPoder(retratos);
  const divisao = RK.pvpDivisao(poder, retratos.length);
  return {
    nome: String(d.nomeJogador || 'Viajante').slice(0, 40),
    amigos: d.amigos || {},
    retratos,
    poder,
    /* A divisão e os pontos DELA. A fila usa os pontos para escolher o
       par (pvpEscolherPar) e a sala guarda a divisão de cada lado: os
       dois podem estar em divisões diferentes quando o par se forma em
       cima da fronteira, e cada um pontua na sua. */
    divisao,
    pontos: RK.pvpRankAtual((d.rank || {})[divisao], Date.now()).pontos,
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
/* ── O REENCONTRO (js/lacos.js, etapa 2) ──

   Dois avatares que ganharam laço a lutar do mesmo lado e que agora se
   encontram em lados opostos — vendidos, trocados, ou simplesmente duas
   colónias que se cruzaram. O que o laço dá lá dentro está no motor
   (js/combate-fu.js): ficha aberta sem examinar e +1 a +3 na precisão
   contra aquele inimigo, e mais ninguém.

   O cruzamento é aqui porque é aqui que os dois lados se conhecem pela
   primeira vez, e vai gravado com os ids do MOTOR ('A0', 'B2'), que são
   os que o estado da luta usa. O que fica na sala é só o que sobra do
   cruzamento: quase sempre nada, às vezes uma linha. */
function _cruzarLacos(eu, ele, ladoDele) {
  const L = require('../js/lacos.js');
  return (eu.retratos || []).map(r => {
    const meus = (eu.lacos || {})[r.id] || {};
    const rival = {};
    (ele.retratos || []).forEach((rr, j) => {
      const n = L.lacoNivel(((meus[rr.id] || {}).p) | 0);
      if (n > 0) rival[ladoDele + j] = n;
    });
    return Object.keys(rival).length ? Object.assign({}, r, { lacoRival: rival }) : r;
  });
}

/* Os laços dos dois, lidos aqui e não carregados desde a fila.

   A fila guarda a equipa no Realtime Database (`pvp/filaEquipe`) para o
   pareamento ser barato, e pôr os laços lá seria engordar uma coisa
   que se escreve a cada entrada para usar uma vez por partida. Aqui são
   duas leituras, uma vez, no instante em que a sala nasce. */
async function _lacosDe(db, uid) {
  if (!db) return {};
  try {
    const snap = await db.collection('players').doc(uid).get();
    return snap.exists ? (snap.data().lacos || {}) : {};
  } catch (e) { return {}; }
}

async function criarSala(rtdb, db, tipo, a, b) {
  const ref = rtdb.ref('pvp/salas').push();
  const id = ref.key;
  const agora = Date.now();
  const aEhA = crypto.randomInt(0, 2) === 0;
  const ladoA = aEhA ? a : b, ladoB = aEhA ? b : a;
  const [lacosA, lacosB] = await Promise.all([_lacosDe(db, ladoA.uid), _lacosDe(db, ladoB.uid)]);
  ladoA.lacos = lacosA; ladoB.lacos = lacosB;
  const equipeA = _cruzarLacos(ladoA, ladoB, 'B');
  const equipeB = _cruzarLacos(ladoB, ladoA, 'A');
  const jogadores = {};
  jogadores[ladoA.uid] = { nome: ladoA.nome, poder: ladoA.poder, equipe: equipeA,
                           divisao: ladoA.divisao || RK.pvpDivisao(ladoA.poder, (equipeA || []).length) };
  jogadores[ladoB.uid] = { nome: ladoB.nome, poder: ladoB.poder, equipe: equipeB,
                           divisao: ladoB.divisao || RK.pvpDivisao(ladoB.poder, (equipeB || []).length) };
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

async function tentarPar(rtdb, db, uid) {
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
  const sala = (A && B) ? await criarSala(rtdb, db, 'fila',
    Object.assign({ uid }, A), Object.assign({ uid: par }, B)) : null;
  if (!sala) {
    // Não deu (um dos dois arranjou sala por outro caminho): as travas saem.
    await _soltar(rtdb, uid, uid);
    await _soltar(rtdb, par, uid);
  }
  return { sala, eu };
}

/* ── AS SALAS VELHAS ──

   Uma sala guarda a semente, as duas equipas inteiras e a lista de
   todas as jogadas. Terminada, ainda serve por uns minutos — o outro
   jogador pode chegar atrasado ao fim, e é de lá que ele lê o resultado
   e o que a luta deixou. Passado isso, é lixo que fica a pagar-se para
   sempre.

   Não há aqui nenhuma tarefa agendada (isto são funções que só correm
   quando alguém as chama), por isso a limpeza viaja de boleia com quem
   entra na fila: de vez em quando, olha-se para as mais antigas e
   apagam-se as que já acabaram há mais de uma hora. Poucas de cada vez,
   e nunca as que ainda estão vivas.

   Falhar não faz mal nenhum: quem está a entrar na fila não fica à
   espera disto, e a próxima entrada volta a tentar. */
const SALA_VELHA_MS = 60 * 60 * 1000;   // uma hora depois do fim
const SALA_VARRER   = 20;               // no máximo estas por vez

async function varrerSalas(rtdb) {
  const snap = await rtdb.ref('pvp/salas').orderByChild('criada')
    .limitToFirst(SALA_VARRER).once('value');
  const corte = Date.now() - SALA_VELHA_MS;
  const fora = [];
  snap.forEach(s => {
    const v = s.val() || {};
    // Viva não se toca. Sem `fim` gravado, vale a hora em que foi criada
    // — uma sala que ficou a meio também não pode ficar para sempre.
    if (SALA_VIVA.indexOf(v.estado) !== -1) return;
    if ((v.fim || v.criada || 0) > corte) return;
    fora.push(s.key);
  });
  for (const k of fora) await rtdb.ref(`pvp/salas/${k}`).remove();
  return fora.length;
}

async function acaoEntrar(ctx) {
  const { db, rtdb, uid, body } = ctx;
  await exigirLivre(rtdb, uid, 'eu');
  const eq = await lerEquipa(db, uid, body.ids);
  const agora = Date.now();
  await rtdb.ref().update({
    [`pvp/fila/${uid}`]: { poder: eq.poder, desde: agora, sinal: agora, nome: eq.nome,
                           // para o par sair pelo rank, e não pelo nível dos bichos
                           pontos: eq.pontos, divisao: eq.divisao },
    [`pvp/filaEquipe/${uid}`]: { nome: eq.nome, poder: eq.poder, retratos: eq.retratos,
                                 divisao: eq.divisao, pontos: eq.pontos },
  });
  const r = await tentarPar(rtdb, db, uid);
  // De boleia, e sem ninguém à espera dela (ver varrerSalas).
  if (Math.random() < 0.1) varrerSalas(rtdb).catch(() => {});
  return { poder: eq.poder, desde: agora, sala: r.sala };
}

async function acaoProcurar(ctx) {
  const { db, rtdb, uid } = ctx;
  const r = await tentarPar(rtdb, db, uid);
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

  const sala = await criarSala(rtdb, db, 'amistosa',
    Object.assign({ uid: de }, ele), Object.assign({ uid }, eu));
  if (!sala) throw new Recusa(409, 'ele_em_sala');
  return { sala };
}

// ── O FIM DA SALA ────────────────────────────────────────────────
/* Grava o fim uma vez só (os dois navegadores chamam, às vezes no mesmo
   instante) e solta os dois ponteiros. O resultado é o mesmo para os
   dois pedidos, porque vem da mesma luta refeita. */
/* ════════════════════════════════════════════════════════════════════
   O QUE A LUTA DEIXA — aplicado aqui, e não no navegador

   As contas estão no js/pvp-regras.js (pvpPremioDe): energia, humor,
   moedas, fratura. Quem as aplica é o servidor, de uma vez e para os
   DOIS lados — só um dos dois navegadores pede o fim, e mesmo esse pode
   fechar a aba no segundo seguinte.

   Cada lado recebe o seu no `pvp/salas/{id}/premios/{uid}`, que o
   cliente lê para pôr a mesma coisa na tela e na memória
   (js/pvp-luta.js).

   ── A CORRIDA COM O SAVE ──

   Os medidores vivem no `avatarSlots`, que o cliente grava por inteiro:
   o save que o navegador mandar a seguir pode passar por cima do que
   fica escrito aqui. É a mesma corrida da visita a um amigo
   (api/amigos.js) e resolve-se do mesmo jeito: o cliente aplica o
   prémio na sua memória assim que o lê, e o save seguinte leva já o
   valor certo. As moedas não correm risco nenhum — vão de `increment`.
   ════════════════════════════════════════════════════════════════════ */
async function aplicarPremios(db, rtdb, id, sala, fim, estado) {
  const L = require('../js/lacos.js');
  const agora = Date.now();
  const dia = L.lacoDia(agora);
  const premios = {};

  for (const lado of ['A', 'B']) {
    const uid = (sala.lados || {})[lado];
    if (!uid) continue;
    const res = R.pvpResultadoDe(uid, fim);
    const p = R.pvpPremioDe(res, sala.tipo);
    if (!p) continue;

    /* A FRATURA É DE QUEM CAIU, e sai do gerador da própria luta: o
       mesmo `rng` que decidiu os dados, já no passo em que a luta
       acabou. Quem desiste protege quem ainda está de pé, não quem já
       caiu — a regra do PvE, palavra por palavra.

       MAS NÃO NO DESAFIO DE AMIGO (decidido pelo dono em 26/09/2026).
       A amistosa não dá moedas nem pontos: é treino. Treino que parte um
       osso — e a fratura come a saúde até matar, se não for tratada —
       faz com que ninguém queira treinar com um amigo, que é o contrário
       do que essa porta existe para fazer. */
    const equipe = ((sala.jogadores || {})[uid] || {}).equipe || [];
    const caidos = (estado && sala.tipo === 'fila') ? R.pvpCaidos(estado, lado) : [];
    const fraturados = [];
    for (const i of caidos) {
      const av = equipe[i];
      if (!av || !av.id) continue;
      if (fuRolar(estado.rng, 100) <= Math.round(R.PVP_FRATURA_CHANCE * 100)) fraturados.push(av.id);
    }
    p.fraturas = fraturados;
    p.avatares = equipe.map(a => a && a.id).filter(Boolean);
    premios[uid] = p;
  }

  /* ── OS PONTOS DA TEMPORADA ──

     Só na FILA. O desafio de amigo não mexe no rank (decidido em
     22/09, junto com o lobby): é o que impede dois amigos de
     combinarem uma escada até ao topo.

     Os dois deltas saem dos pontos de ANTES dos dois lados — ler
     primeiro, somar depois —, senão o segundo a ser calculado estaria
     a medir-se contra um adversário que já mudou. As regras estão no
     js/pvp-rank.js. */
  if (sala.tipo === 'fila') {
    const uids = Object.keys(premios);
    const docs = {}, pares = {};
    await Promise.all(uids.map(async u => {
      const snap = await db.collection('players').doc(u).get();
      const d = snap.exists ? snap.data() : {};
      docs[u] = d.rank || {};
      pares[u] = (d.rankPares || {});
    }));
    const dia = L.lacoDia(agora);   // AAAA-MM-DD em UTC, o mesmo do laço
    const antes = {};
    uids.forEach(u => {
      const div = ((sala.jogadores || {})[u] || {}).divisao || 'adulto';
      premios[u].divisao = div;
      antes[u] = RK.pvpRankAtual(docs[u][div], agora).pontos;
    });
    uids.forEach(u => {
      const outro = uids.find(x => x !== u);
      const div = premios[u].divisao;
      /* Quem desiste conta como derrota: sair a meio não é a forma
         barata de não perder pontos. */
      const res = premios[u].resultado === 'desistiu' ? 'derrota' : premios[u].resultado;
      /* O TETO POR PAR (js/pvp-rank.js): contra a mesma pessoa, no
         mesmo dia, ganha-se no máximo um saldo. Passado ele, a vitória
         vale zero pontos — e vale tudo o resto à mesma (moedas, laço,
         humor). É o que fecha a porta a dois combinados que entrem
         juntos na fila de propósito, sem castigar quem só joga muito
         com o mesmo adversário. */
      const par = pares[u][outro];
      const bruto = RK.pvpRankDelta(antes[u], antes[outro] || RK.PVP_RANK_INICIO, res);
      premios[u].rank = RK.pvpRankSomar(docs[u][div], antes[outro] || RK.PVP_RANK_INICIO,
                                        res, agora, par, dia);
      premios[u].rank.divisao = div;
      premios[u].parCortado = bruto > 0 && premios[u].rank.delta < bruto;
      premios[u].parNovo = RK.pvpParSomar(par, dia, premios[u].rank.delta);
      premios[u].parCom = outro;
    });
  }

  // Um documento de cada vez: são dois jogadores e não há nada a trocar
  // entre eles, portanto não precisam da mesma transação.
  for (const uid of Object.keys(premios)) {
    try { await aplicarNoJogador(db, uid, premios[uid], dia, L); }
    catch (e) { console.error('[pvp premio]', uid, e && e.message); }
  }
  await rtdb.ref(`pvp/salas/${id}/premios`).set(premios);

  /* A TABELA QUE TODA A GENTE VÊ. A cópia no Realtime Database é o que
     o lobby lê, ordenada pelos pontos; a verdade continua a ser o campo
     `rank` do documento do jogador, que só o servidor escreve. */
  for (const uid of Object.keys(premios)) {
    const rk = premios[uid].rank;
    if (!rk) continue;
    const j = (sala.jogadores || {})[uid] || {};
    const nome = j.nome || '';
    /* O retrato do primeiro da equipa vai com a linha: a tabela mostra a
       cara de quem está lá, e sem isto a página teria de ir buscar o
       documento de cada um dos dez. */
    const cara = ((j.equipe || [])[0]) || null;
    const linha = { p: rk.pontos, nome, v: rk.v, d: rk.d, e: rk.e, em: rk.em,
                    poder: j.poder | 0 };
    if (cara && cara.seed) {
      linha.av = { seed: cara.seed | 0, raridade: cara.raridade || 'Comum',
                   nivel: cara.nivel | 0, nascimento: cara.nascimento || null };
    }
    await rtdb.ref(`pvp/rank/${rk.temporada}/${premios[uid].divisao}/${uid}`)
      .set(linha).catch(() => {});
  }
  return premios;
}

async function aplicarNoJogador(db, uid, p, dia, L) {
  const ref = db.collection('players').doc(uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const d = snap.data();
    const slots = (d.avatarSlots || []).map(s => {
      if (!s || !s.id || p.avatares.indexOf(s.id) === -1) return s;
      const v = Object.assign({}, s.vitals || {});
      v.energia = Math.max(0, Math.round((v.energia == null ? 100 : v.energia) - p.energia));
      if (p.humor) v.humor = Math.min(100, Math.round((v.humor == null ? 100 : v.humor) + p.humor));
      const doencas = Array.isArray(s.activeDiseases) ? s.activeDiseases.slice() : [];
      if (p.fraturas.indexOf(s.id) !== -1 && doencas.indexOf('fratura') === -1) doencas.push('fratura');
      return Object.assign({}, s, { vitals: v, activeDiseases: doencas });
    });

    const alteracoes = { avatarSlots: slots };
    if (p.moedas) alteracoes['gs.moedas'] = FieldValue.increment(p.moedas);
    // O rank é POR DIVISÃO: quem sobe de fase leva a sua história da
    // divisão antiga e começa a nova onde toda a gente começa.
    if (p.rank) alteracoes['rank.' + p.divisao] = p.rank;
    if (p.parCom && p.parNovo) alteracoes['rankPares.' + p.parCom] = p.parNovo;

    /* O LAÇO de quem lutou junto, pelas regras do js/lacos.js — as
       mesmas do PvE (a acao 'laco' do api/pool.js), com o mesmo teto
       por dia. Aqui não se pergunta se a luta aconteceu: ela aconteceu
       diante do servidor. Quem desiste não leva laço nenhum. */
    if (p.resultado !== 'desistiu') {
      const certidoes = d.certidoes || {}, mortos = d.mortos || {}, lacos = d.lacos || {};
      const avs = p.avatares.map(id => {
        const s = (d.avatarSlots || []).find(x => x && x.id === id);
        if (!s || !certidoes[id] || mortos[id]) return null;
        return { id: id, nome: s.nome || null, nascimento: certidoes[id], lacos: lacos[id] || {} };
      }).filter(Boolean);
      for (let i = 0; i < avs.length; i++) {
        for (let j = 0; j < avs.length; j++) {
          if (i === j) continue;
          const a = avs[i], b = avs[j];
          const r = L.lacoSomarBatalha(a.lacos[b.id], p.resultado,
            { dia: dia, nome: b.nome, parentes: !!L.lacoParentesco(a, b) });
          alteracoes[`lacos.${a.id}.${b.id}`] = r.entrada;
        }
      }
    }
    tx.update(ref, alteracoes);
  });
}

async function fecharSala(rtdb, id, sala, dados, estado, db) {
  const ref = rtdb.ref(`pvp/salas/${id}`);
  /* O `null` da primeira volta é "ainda não li", e não "não há sala":
     devolvê-lo faz o Firebase ir buscar o valor e rodar de novo. Desistir
     aí (undefined) abortava sem nunca consultar o servidor — a sala não
     fechava nunca (visto nos testes). */
  const r = await ref.child('estado').transaction(e =>
    (e === null ? null : SALA_VIVA.indexOf(e) !== -1 ? 'fim' : undefined));
  if (r.committed) {
    await ref.update(Object.assign({ fim: Date.now() }, dados));
    /* Só uma vez, e só se a luta chegou a acontecer: o `encerrada` é o
       versus desfeito antes do primeiro dado, e desse ninguém sai com
       energia gasta nem com moedas. */
    if (db && dados.estado !== 'encerrada') {
      try { await aplicarPremios(db, rtdb, id, sala, Object.assign({}, dados), estado); }
      catch (e) { console.error('[pvp premios]', e && e.message); }
    }
  }
  for (const q of Object.keys(sala.jogadores || {})) {
    await rtdb.ref(`pvp/jogador/${q}/sala`).transaction(v => (v === id ? null : v));
  }
  const final = (await ref.once('value')).val() || {};
  return { vencedor: final.vencedor || null, motivo: final.motivo || null, estado: final.estado,
           premios: final.premios || null };
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
  const { db, rtdb, uid, body } = ctx;
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
  /* Refaz-se a luta antes de fechar, e não por causa do vencedor — esse
     é quem ficou. É para saber quem já tinha CAÍDO quando ele desistiu:
     a fratura é de quem caiu. */
  const ate = R.pvpRepetir(sala);
  return fecharSala(rtdb, id, sala, { vencedor: sala.lados[outro], motivo: 'desistiu', saiu: uid },
                    ate.estado, db);
}

/* ── ENCERRAR: A CONFERÊNCIA ──
   O navegador diz que a luta acabou; o servidor não acredita, refaz.
   A luta inteira sai da semente e da lista de jogadas (pvpRepetir, a
   mesma conta dos navegadores), e o vencedor é o que a refeita disser.

   Se a luta ainda não acabou, a única coisa que se pode reclamar é o
   W.O.: o outro está desconectado há mais de 2 minutos (a presença dele
   na sala diz desde quando). Nada disso? A luta segue. */
async function acaoEncerrar(ctx) {
  const { db, rtdb, uid, body } = ctx;
  const { id, sala } = await lerSalaMinha(rtdb, uid, body);
  if (SALA_VIVA.indexOf(sala.estado) === -1) {
    await rtdb.ref(`pvp/jogador/${uid}/sala`).transaction(v => (v === id ? null : v));
    return { vencedor: sala.vencedor || null, motivo: sala.motivo || null, estado: sala.estado,
             premios: sala.premios || null };
  }
  const r = R.pvpRepetir(sala);
  if (r.fim) {
    const vencedor = r.fim.vencedor ? sala.lados[r.fim.vencedor] : null;
    return fecharSala(rtdb, id, sala, { vencedor, motivo: r.fim.motivo, jogadas: r.lidas }, r.estado, db);
  }
  const meuLado = R.pvpLadoDe(sala, uid);
  const outroUid = sala.lados[R.pvpOutroLado(meuLado)];
  const p = (sala.presenca || {})[outroUid] || {};
  const agora = Date.now();
  // Nunca apareceu na luta: conta desde o começo dela.
  const foraDesde = p.fora ? p.fora : (!p.on ? (sala.inicio || agora) : null);
  if (foraDesde && agora - foraDesde > R.PVP_FORA_MS) {
    return fecharSala(rtdb, id, sala, { vencedor: uid, motivo: 'desconectou', jogadas: r.lidas }, r.estado, db);
  }
  throw new Recusa(409, 'em_curso');
}

/* ══════════════════════════════════════════════════════════════════
   O SELO DA TEMPORADA

   As regras estão no js/temporada.js. Aqui é o dinheiro a mudar de
   mãos, e por isso tudo passa por transações e nada acredita no
   cliente: o preço é daqui, a temporada é daqui, e comprar duas vezes
   não cobra duas vezes.

   O selo vive em dois lugares de propósito: no documento do jogador
   (para ele ver que tem) e numa subcoleção da temporada (para o fecho
   saber quem entra na conta sem varrer a base inteira).
   ══════════════════════════════════════════════════════════════════ */
async function acaoSelo(ctx) {
  const { db, uid } = ctx;
  const agora = Date.now();
  const temp = RK.pvpTemporada(agora);
  const jogRef  = db.collection('players').doc(uid);
  const tempRef = db.collection('temporadas').doc(temp);
  const seloRef = tempRef.collection('selos').doc(uid);

  const r = await db.runTransaction(async (tx) => {
    const [jog, tmp, selo] = await Promise.all([tx.get(jogRef), tx.get(tempRef), tx.get(seloRef)]);
    if (!jog.exists) throw new Recusa(404, 'sem_jogador');
    // Já tem: sair sem cobrar. Um duplo-clique não compra dois selos.
    if (selo.exists) return { ja: true, bolo: (tmp.data() || {}).bolo | 0 };

    const d = jog.data();
    const debito = CRIS.camposDebito(d, TP.SELO_CUSTO);
    if (!debito) throw new Recusa(400, 'sem_cristais');

    const bolo = ((tmp.exists ? tmp.data().bolo : 0) | 0) + TP.SELO_CUSTO;
    tx.set(tempRef, { bolo, temporada: temp, atualizada: agora }, { merge: true });
    tx.set(seloRef, { em: agora });
    tx.update(jogRef, Object.assign({ [`selos.${temp}`]: { em: agora, pago: TP.SELO_CUSTO } }, debito));
    return { ja: false, bolo };
  });
  return { temporada: temp, bolo: r.bolo, ja: r.ja, custo: TP.SELO_CUSTO };
}

/* ── O ESTADO DA TEMPORADA, PARA A TELA ──
   E, de boleia, o fecho da anterior: não há tarefas agendadas aqui (o
   vercel.json saiu com o payout semanal), então quem fecha o mês é a
   primeira pessoa que abre o Salão depois da virada. */
async function acaoTemporada(ctx) {
  const { db, rtdb, uid } = ctx;
  const agora = Date.now();
  const temp = RK.pvpTemporada(agora);

  try { await fecharPendentes(db, rtdb, temp); }
  catch (e) { console.error('[temporada fecho]', e && e.message); }

  const [tmp, selo, jog] = await Promise.all([
    db.collection('temporadas').doc(temp).get(),
    db.collection('temporadas').doc(temp).collection('selos').doc(uid).get(),
    db.collection('players').doc(uid).get(),
  ]);
  const d = jog.exists ? jog.data() : {};
  const t = tmp.exists ? tmp.data() : {};
  return {
    temporada: temp,
    bolo: (t.bolo | 0) + (t.acumulado | 0),
    tenhoSelo: selo.exists,
    custo: TP.SELO_CUSTO,
    premiados: TP.SELO_PREMIADOS,
    minimo: TP.SELO_MIN_LUTAS,
    // O que este jogador ganhou nas temporadas que já fecharam.
    premios: d.premios || {},
  };
}

/* ── FECHAR O QUE FICOU PARA TRÁS ──

   Olha para a temporada ANTERIOR. Se ela ainda não foi fechada, calcula
   os prémios e grava o resultado; depois paga um a um. As duas metades
   são idempotentes de propósito:

   · o cálculo só acontece se `fechada` for falso, dentro de uma
     transação — dois jogadores a abrir o Salão no mesmo segundo não
     fecham o mês duas vezes;
   · o pagamento de cada um só acontece se ele ainda não tiver o prémio
     dessa temporada no documento dele. Se o processo morrer a meio, a
     próxima abertura do Salão continua de onde parou.

   É por isso que se grava a lista ANTES de pagar: uma lista sem
   pagamento resolve-se sozinha, um pagamento sem lista pagaria duas
   vezes. */
async function fecharPendentes(db, rtdb, tempAtual) {
  const anterior = RK.pvpTemporada(_mesAnterior(tempAtual));
  const ref = db.collection('temporadas').doc(anterior);
  const snap = await ref.get();
  if (!snap.exists) return null;           // ninguém comprou selo nesse mês
  const dados = snap.data() || {};

  let pagamentos = dados.pagamentos;
  if (!dados.fechada) {
    pagamentos = await _calcularPremios(db, rtdb, anterior, dados);
    const total = pagamentos.reduce((s, p) => s + p.valor, 0);
    const ok = await db.runTransaction(async (tx) => {
      const agora = await tx.get(ref);
      if ((agora.data() || {}).fechada) return false;   // outro chegou primeiro
      tx.update(ref, { fechada: true, fechadaEm: Date.now(), pagamentos, pago: total,
                       acumulado: Math.max(0, ((dados.bolo | 0) + (dados.acumulado | 0)) - total) });
      return true;
    });
    if (!ok) pagamentos = ((await ref.get()).data() || {}).pagamentos || [];
    else {
      /* O que sobrou vai para a temporada corrente. Escrito depois do
         fecho e de uma vez: se falhar, perde-se a sobra, e sobra é
         arredondamento — nunca o prémio de ninguém. */
      const sobra = Math.max(0, ((dados.bolo | 0) + (dados.acumulado | 0)) - total);
      if (sobra > 0) {
        await db.collection('temporadas').doc(tempAtual)
          .set({ acumulado: FieldValue.increment(sobra) }, { merge: true }).catch(() => {});
      }
    }
  }
  await _pagarPendentes(db, anterior, pagamentos || []);
  return pagamentos;
}

// "2026-01" → o instante de dezembro de 2025.
function _mesAnterior(temp) {
  const [ano, mes] = String(temp).split('-').map(Number);
  return Date.UTC(ano, (mes | 0) - 2, 15);
}

/* Quem tem selo, onde jogou e como ficou. O rank está no Realtime
   Database (por divisão) e os selos no Firestore: é aqui que os dois se
   encontram.

   Um jogador que mudou de divisão no meio do mês concorre naquela onde
   jogou MAIS partidas — uma só, senão receberia duas vezes pelo mesmo
   selo. */
async function _calcularPremios(db, rtdb, temp, dados) {
  const selos = await db.collection('temporadas').doc(temp).collection('selos').get();
  const comSelo = new Set();
  selos.forEach(s => comSelo.add(s.id));
  if (!comSelo.size) return [];

  const porDivisao = {};
  const melhor = {};   // uid -> { divisao, lutas }
  for (const div of Object.keys(TP.SELO_PESOS)) {
    const tabela = (await rtdb.ref(`pvp/rank/${temp}/${div}`).once('value')).val() || {};
    for (const uid of Object.keys(tabela)) {
      if (!comSelo.has(uid)) continue;
      const r = tabela[uid] || {};
      const lutas = (r.v | 0) + (r.d | 0) + (r.e | 0);
      if (!melhor[uid] || lutas > melhor[uid].lutas) {
        melhor[uid] = { divisao: div, lutas, linha: { uid, p: r.p | 0, v: r.v | 0, d: r.d | 0, em: r.em | 0, lutas } };
      }
    }
  }
  for (const uid of Object.keys(melhor)) {
    const m = melhor[uid];
    (porDivisao[m.divisao] = porDivisao[m.divisao] || []).push(m.linha);
  }
  const bolo = (dados.bolo | 0) + (dados.acumulado | 0);
  return TP.temporadaPremiar(bolo, porDivisao).pagamentos;
}

/* Paga quem ainda não recebeu. Cada crédito é uma transação própria e
   olha para o próprio documento do jogador: se `premios[temp]` já lá
   está, não paga de novo. */
async function _pagarPendentes(db, temp, pagamentos) {
  for (const p of pagamentos) {
    try {
      await db.runTransaction(async (tx) => {
        const ref = db.collection('players').doc(p.uid);
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const d = snap.data();
        if ((d.premios || {})[temp]) return;              // já recebeu
        const cris = (d.cristais || 0) + p.valor;
        tx.update(ref, {
          // Com LASTRO: é prémio, tem de poder sair em MATIC.
          cristais: cris,
          'gs.cristais': cris,
          [`premios.${temp}`]: { valor: p.valor, pos: p.pos, divisao: p.divisao, em: Date.now() },
        });
      });
    } catch (e) { console.error('[temporada pagar]', p.uid, e && e.message); }
  }
}

const ACOES = {
  entrar: acaoEntrar, procurar: acaoProcurar, sairFila: acaoSairFila,
  convidar: acaoConvidar, aceitar: acaoAceitar, sairSala: acaoSairSala, encerrar: acaoEncerrar,
  selo: acaoSelo, temporada: acaoTemporada,
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
module.exports._interno = { lerEquipa, tentarPar, criarSala, salaViva, _idxDaEquipa,
                            varrerSalas, SALA_VELHA_MS };
