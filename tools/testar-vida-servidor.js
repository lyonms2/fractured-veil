#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A VIDA ATIVA, DE PONTA A PONTA — contra os emuladores

   Precisa do jogo local no ar (tools/pvp-local.js), que semeia as
   contas jog1/jog2/jog3:

     firebase emulators:exec --only firestore,database,auth \
       --project demo-teste "node tools/pvp-local.js"
     node tools/testar-vida-servidor.js

   As regras puras estão no tools/testar-persistencia.js, que corre sem
   nada no ar. Aqui mede-se o que só vale medido: o cliente a escrever
   de verdade, pelas regras de verdade, e o servidor a responder.

   ── PORQUE A REST API E NÃO O firebase-admin ──

   O Admin SDK NÃO PASSA PELAS REGRAS. Um teste de segurança escrito com
   ele mede o Admin SDK e mais nada. As escritas de cliente aqui vão
   pela REST API do Firestore com um token de jogador, que é o que faz
   as regras aplicarem-se. Mesma técnica do tools/testar-regras.js.

   ── O QUE "DEVE FALHAR" QUER DIZER ──

   Não quer dizer HTTP 403. O `avatarSlots` é um array, e as regras do
   Firestore não sabem percorrer arrays: não há como escrever "o cliente
   não mexe no totalSecs de nenhum slot". O PATCH continua a ser aceito,
   e TEM de ser — é por ele que o jogo grava o resto do estado.

   O que se confere é que a escrita NÃO TEM EFEITO: o número que o jogo
   usa para decidir não se move. É a mesma garantia que o `niveis` já
   dava, e está dita com as mesmas palavras no js/niveis.js — isto
   estreita a porta, não a fecha.

   ESTE TESTE SUJA O ESTADO: ele vende um avatar do jog1 ao jog2, que é
   a única maneira de medir a venda. Levante o harness de novo antes do
   tools/testar-niveis.js e do tools/testar-mercado.js (ver os
   cabeçalhos deles).
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const VIDA = require(path.join(__dirname, '..', 'js', 'vida-ativa.js'));

const FS   = 'http://127.0.0.1:8477';
const PROJ = 'demo-teste';
const BASE = `${FS}/v1/projects/${PROJ}/databases/(default)/documents`;
const API  = 'http://127.0.0.1:10230/api';
const AUTH = `http://127.0.0.1:9499/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;

let passaram = 0;
const falhas = [];
const ok = (nome, cond, detalhe) => {
  if (cond) { passaram++; return; }
  falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + detalhe : ''));
};
const igual = (nome, obtido, esperado) =>
  ok(nome, obtido === esperado,
     `obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`);
const titulo = t => console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 56 - t.length)));

// ── o token de um jogador, como o Firestore o espera ──
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const tokenDe = uid => {
  const a = Math.floor(Date.now() / 1000);
  return [b64({ alg: 'none', typ: 'JWT' }),
          b64({ iss: `https://securetoken.google.com/${PROJ}`, aud: PROJ, sub: uid,
                user_id: uid, iat: a, exp: a + 3600, auth_time: a,
                firebase: { identities: {}, sign_in_provider: 'custom' } }), ''].join('.');
};

const enc = x => typeof x === 'number'
    ? (Number.isInteger(x) ? { integerValue: String(x) } : { doubleValue: x })
  : x === null ? { nullValue: null }
  : typeof x === 'boolean' ? { booleanValue: x }
  : Array.isArray(x) ? { arrayValue: { values: x.map(enc) } }
  : typeof x === 'object'
    ? { mapValue: { fields: Object.fromEntries(Object.entries(x).map(([k, y]) => [k, enc(y)])) } }
  : { stringValue: String(x) };

const dec = f => !f ? undefined
  : 'integerValue' in f ? +f.integerValue
  : 'doubleValue'  in f ? f.doubleValue
  : 'stringValue'  in f ? f.stringValue
  : 'booleanValue' in f ? f.booleanValue
  : 'nullValue'    in f ? null
  : 'arrayValue'   in f ? (f.arrayValue.values || []).map(dec)
  : 'mapValue'     in f
    ? Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, y]) => [k, dec(y)]))
  : undefined;

const campos = j => Object.fromEntries(Object.entries(j.fields || {}).map(([k, y]) => [k, dec(y)]));

async function lerDoc(uid, comoAdmin) {
  const r = await fetch(`${BASE}/players/${uid}`,
    { headers: { Authorization: `Bearer ${comoAdmin ? 'owner' : tokenDe(uid)}` } });
  if (!r.ok) return null;
  return campos(await r.json());
}

/* `comoUid` é QUEM assina, e por omissão é o dono do documento. Sem
   este parâmetro o teste do documento alheio assinava com o token do
   próprio dono e passava — ele apanhou-se a si mesmo. */
async function escrever(uid, mudancas, comoAdmin, comoUid) {
  const mask = Object.keys(mudancas)
    .map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const fields = {};
  for (const [k, val] of Object.entries(mudancas)) {
    const partes = k.split('.');
    let alvo = fields;
    for (let i = 0; i < partes.length - 1; i++) {
      alvo[partes[i]] = alvo[partes[i]] || { mapValue: { fields: {} } };
      alvo = alvo[partes[i]].mapValue.fields;
    }
    alvo[partes[partes.length - 1]] = enc(val);
  }
  const r = await fetch(`${BASE}/players/${uid}?${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json',
               Authorization: `Bearer ${comoAdmin ? 'owner' : tokenDe(comoUid || uid)}` },
    body: JSON.stringify({ fields }) });
  return r.status;
}

const entrar = async email => (await (await fetch(AUTH, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: 'teste123', returnSecureToken: true }) })).json()).idToken;

async function avisar(idToken, avatares) {
  const r = await fetch(`${API}/pool`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'vida', idToken, avatares }) });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function mercado(idToken, corpo) {
  const r = await fetch(`${API}/comprar-avatar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ idToken }, corpo)) });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function noAr() {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 2500);
    const r = await fetch(`${API}/pool?logs=1`, { signal: c.signal });
    clearTimeout(t);
    return r.ok;
  } catch (e) { return false; }
}

(async () => {
  if (!(await noAr())) {
    console.log('O harness não está no ar. Ver o cabeçalho deste arquivo.');
    process.exitCode = 1;
    return;
  }

  const t1 = await entrar('jog1@teste.dev');
  const t2 = await entrar('jog2@teste.dev');
  if (!t1 || !t2) { console.log('não entrei nas contas de teste'); process.exitCode = 1; return; }

  const d0 = await lerDoc('jog1', true);
  const slots = d0.avatarSlots || [];
  const i = slots.findIndex(s => s && s.hatched && s.id);
  if (i < 0) { console.log('o jog1 não tem avatar chocado'); process.exitCode = 1; return; }
  const id = slots[i].id;
  const originais = JSON.parse(JSON.stringify(slots));
  const comSlot = (mudar) => {
    const c = JSON.parse(JSON.stringify(originais));
    Object.assign(c[i], mudar);
    return c;
  };
  const vidaDe   = async (uid) => ((await lerDoc(uid || 'jog1', true)).vidaAtiva || {})[id];
  const nivelDe  = async (uid) => ((await lerDoc(uid || 'jog1', true)).niveis    || {})[id];

  console.log(`avatar: ${id}  (slot ${i})`);

  /* ═══ O CONTROLE ═════════════════════════════════════════════════
     Se isto passar, o teste não vale nada: significa que o token não
     está sendo tratado como de jogador e as regras não se aplicam. */
  titulo('O controle: as regras aplicam-se mesmo?');
  igual('mexer no mapa `niveis` é recusado',
        await escrever('jog1', { niveis: { falso: { n: 60, em: 1, cred: 9 } } }), 403);
  igual('mexer no mapa `vidaAtiva` é recusado',
        await escrever('jog1', { vidaAtiva: { falso: { s: 999, em: 1 } } }), 403);
  igual('mexer em gs.cristais é recusado',
        await escrever('jog1', { 'gs.cristais': 999999 }), 403);
  igual('o jog1 escrever no documento do jog2 é recusado',
        await escrever('jog2', { avatarSlots: [] }, false, 'jog1'), 403);

  // o ponto de partida, posto como SERVIDOR
  await escrever('jog1', { [`vidaAtiva.${id}`]: { s: 5000, em: Date.now() - 60000 } }, true);

  /* ═══ 1 a 6 e 14 · O CLIENTE MEXE NO SLOT ════════════════════════ */
  titulo('O cliente escreve no slot, e a autoridade não se move');

  for (const [nome, valor] of [['aumentar para 317 anos', 999999999],
                               ['reduzir para 1', 1],
                               ['zerar', 0]]) {
    const antes = (await vidaDe()).s;
    const st = await escrever('jog1', { avatarSlots: comSlot({ totalSecs: valor }) });
    ok(`o PATCH de "${nome}" é aceito (e tem de ser)`, st === 200, 'status ' + st);
    igual(`cliente tenta ${nome}: a vida ativa fica`, (await vidaDe()).s, antes);
  }

  {
    const antes = (await nivelDe()).n;
    await escrever('jog1', { avatarSlots: comSlot({ nivel: 60 }) });
    igual('cliente tenta alterar nivel: o mapa `niveis` fica', (await nivelDe()).n, antes);
  }

  /* A raridade não tem mapa próprio: é uma CONTA sobre o nível
     reconhecido (rarDe). O que se confere é que a entrada
     dessa conta não se move. */
  {
    const antes = (await nivelDe()).n;
    await escrever('jog1', { avatarSlots: comSlot({ raridade: 'Lendário', nivel: 60 }) });
    igual('cliente tenta alterar raridade: o nível de onde ela sai fica',
          (await nivelDe()).n, antes);
  }

  {
    const vAntes = (await vidaDe()).s, nAntes = (await nivelDe()).n;
    const st = await escrever('jog1', { avatarSlots: comSlot(
      { totalSecs: 999999999, nivel: 60, raridade: 'Lendário' }) });
    ok('o PATCH com os três juntos é aceito', st === 200, 'status ' + st);
    igual('…e a vida ativa fica', (await vidaDe()).s, vAntes);
    igual('…e o nível fica',      (await nivelDe()).n, nAntes);
  }

  {
    const vAntes = (await vidaDe()).s;
    const cheio = JSON.parse(JSON.stringify(originais));
    for (const s of cheio) if (s) Object.assign(s, { totalSecs: 888888, nivel: 59, raridade: 'Lendário' });
    await escrever('jog1', { avatarSlots: cheio });
    igual('o avatarSlots INTEIRO reescrito: a autoridade fica', (await vidaDe()).s, vAntes);
  }
  await escrever('jog1', { avatarSlots: originais });

  /* ═══ 7 · A SESSÃO LEGÍTIMA ══════════════════════════════════════ */
  titulo('A sessão legítima acumula tempo');
  {
    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: 5000, em: Date.now() - 60000 } }, true);
    const antes = (await vidaDe()).s;
    const r = await avisar(t1, [{ id, segundos: 60 }]);
    ok('o aviso é aceito', r.status === 200, JSON.stringify(r.body));
    const depois = (await vidaDe()).s;
    ok('e o tempo entrou', depois > antes, `${antes} → ${depois}`);
    ok('mas só o que o relógio permite', depois - antes <= 60 + VIDA.VIDA_FOLGA_S,
       `somou ${depois - antes}`);
    ok('a resposta diz o número reconhecido',
       r.body && r.body.vida && r.body.vida[id] === depois,
       JSON.stringify(r.body && r.body.vida));
  }
  {
    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: 5000, em: Date.now() - 60000 } }, true);
    const antes = (await vidaDe()).s;
    await avisar(t1, [{ id, segundos: 999999999 }]);
    const somou = (await vidaDe()).s - antes;
    ok('um aviso de 317 anos não passa pelo balde', somou <= VIDA.VIDA_PEDIDO_MAX_S,
       `somou ${somou}`);
    ok('nem passa de perto', somou < 1000, `somou ${somou}`);
  }
  {
    const d2 = await lerDoc('jog2', true);
    const outro = (d2.avatarSlots || []).find(s => s && s.hatched && s.id);
    if (outro) {
      const antes = ((await lerDoc('jog2', true)).vidaAtiva || {})[outro.id];
      await avisar(t1, [{ id: outro.id, segundos: 600 }]);
      const depois = ((await lerDoc('jog2', true)).vidaAtiva || {})[outro.id];
      igual('não se avisa o tempo do avatar de outra pessoa',
            depois && depois.s, antes && antes.s);
    } else {
      ok('não se avisa o tempo do avatar de outra pessoa (sem avatar no jog2 para medir)', true);
    }
  }
  {
    const antes = (await vidaDe()).s;
    const r = await avisar(t1, [{ id: 'nao_existe_123', segundos: 600 }]);
    ok('um id inventado não cria registro', r.status === 200);
    igual('e não mexe no de ninguém', (await vidaDe()).s, antes);
  }

  /* ═══ O PRIMEIRO ENCONTRO, que é a migração ══════════════════════

     É a única porta por onde um número do cliente entra, e existe só
     para os avatares que já andavam por aí. O teto é a idade da
     CERTIDÃO, que só o servidor escreve. */
  titulo('O primeiro encontro: a migração dos que já existem');
  {
    const UmDia = 86400000;
    const cert = (await lerDoc('jog1', true)).certidoes[id];

    // um avatar antigo e honesto: nasceu há 10 dias, diz ter vivido 2 h
    await escrever('jog1', {
      [`vidaAtiva.${id}`]: null,
      [`certidoes.${id}`]: Object.assign({}, cert, { nascidoEm: Date.now() - 10 * UmDia }),
      avatarSlots: comSlot({ totalSecs: 7200 }),
    }, true);
    await escrever('jog1', { [`vidaAtiva.${id}`]: {} }, true);   // apaga o registro
    let r = await avisar(t1, [{ id, segundos: 0 }]);
    igual('nasceu há 10 dias e diz 2 h: entram as 2 h', r.body && r.body.vida && r.body.vida[id], 7200);

    // o mesmo avatar a mentir: diz 317 anos
    await escrever('jog1', {
      [`vidaAtiva.${id}`]: {},
      avatarSlots: comSlot({ totalSecs: 999999999 }),
    }, true);
    r = await avisar(t1, [{ id, segundos: 0 }]);
    const reconhecido = r.body && r.body.vida && r.body.vida[id];
    ok('diz 317 anos e entra só a idade dele', reconhecido <= 11 * 86400,
       'reconheceu ' + reconhecido);
    ok('e é mesmo a idade de 10 dias', reconhecido >= 10 * 86400,
       'reconheceu ' + reconhecido);

    /* E o SEGUNDO encontro já não acredita em nada: depois de
       registrado, o totalSecs do slot nunca mais é lido pela conta. */
    const antes = (await vidaDe()).s;
    await escrever('jog1', { avatarSlots: comSlot({ totalSecs: 999999999 }) });
    r = await avisar(t1, [{ id, segundos: 60 }]);
    const depois = (await vidaDe()).s;
    ok('registrado, o slot de 317 anos é ignorado',
       depois - antes <= 60 + VIDA.VIDA_FOLGA_S, `somou ${depois - antes}`);

    // devolver o que era
    await escrever('jog1', { [`certidoes.${id}`]: cert, avatarSlots: originais }, true);
  }

  /* ═══ 8 · REFRESH ════════════════════════════════════════════════ */
  titulo('Refresh, desconexão e reconexão');
  {
    const autoridade = (await vidaDe()).s;
    const comoOCliente = ((await lerDoc('jog1')).vidaAtiva || {})[id];
    igual('refresh: o cliente relê o mesmo número', comoOCliente && comoOCliente.s, autoridade);
  }

  /* ═══ 12 e 13 · DESCONEXÃO E RECONEXÃO ═══════════════════════════ */
  {
    const confirmado = (await vidaDe()).s;
    // a desconexão, como o cliente a faz: reescreve os slots com o que tem
    await escrever('jog1', { avatarSlots: comSlot({ totalSecs: 0 }) });
    igual('desconexão: o tempo já confirmado permanece', (await vidaDe()).s, confirmado);
    const r = await avisar(t1, [{ id, segundos: 60 }]);
    ok('reconexão: continua do valor anterior',
       r.body && r.body.vida && r.body.vida[id] >= confirmado,
       `confirmado ${confirmado}, voltou ${JSON.stringify(r.body && r.body.vida)}`);
    await escrever('jog1', { avatarSlots: originais });
  }

  /* ═══ 11 · DUAS ABAS ═════════════════════════════════════════════ */
  titulo('Duas abas somam, em vez de uma apagar a outra');
  {
    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: 1000, em: Date.now() - 600000 } }, true);
    await avisar(t1, [{ id, segundos: 300 }]);
    const m1 = (await vidaDe()).s;
    await avisar(t1, [{ id, segundos: 300 }]);
    const m2 = (await vidaDe()).s;
    ok('a aba A somou', m1 > 1000, `ficou ${m1}`);
    ok('e a aba B não apagou o que a A somou', m2 >= m1, `${m1} → ${m2}`);
    ok('nem as duas dobraram o tempo', m2 <= 1000 + 600 + 2 * VIDA.VIDA_FOLGA_S,
       `ficou ${m2}`);
  }

  /* ═══ A CONTA EXATA DE DUAS ABAS ═════════════════════════════════

     3600 + 600 + 300 = 4500, contra o servidor de verdade.

     Entre os dois avisos, o `em` do registro é recuado como SERVIDOR
     para simular o tempo de parede a passar — é o que um teste de
     segundos pode fazer sem esperar quinze minutos. O `em` é um campo
     do servidor e o cliente nunca o escreve; recuá-lo aqui simula o
     relógio, e não contorna o balde. */
  titulo('A conta exata: 3600 + 600 + 300 = 4500');
  {
    const agora = Date.now();
    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: 3600, em: agora - 900000 } }, true);
    igual('o ponto de partida', (await vidaDe()).s, 3600);

    // a aba A viveu 600 s
    await avisar(t1, [{ id, segundos: 600 }]);
    const depoisDeA = (await vidaDe()).s;
    igual('a aba A soma 600', depoisDeA, 4200);

    // passam 300 s de relógio (simulados no campo do servidor)
    const reg = await vidaDe();
    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: reg.s, em: Date.now() - 300000 } }, true);

    // a aba B viveu 300 s
    await avisar(t1, [{ id, segundos: 300 }]);
    const depoisDeB = (await vidaDe()).s;
    igual('a aba B soma 300 e o total é 4500', depoisDeB, 4500);
    ok('e NÃO 3900 (a B a apagar a A)', depoisDeB !== 3900);
    ok('e NÃO 4200 (a A a apagar a B)',  depoisDeB !== 4200);
  }

  /* E o inverso, que tem de estar igualmente certo: as duas abas a
     reclamar o MESMO período. Aí 900 s seriam tempo a dobrar, e o balde
     corta — o avatar viveu 600 s de parede, não 900. */
  {
    const agora = Date.now();
    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: 3600, em: agora - 600000 } }, true);
    await avisar(t1, [{ id, segundos: 600 }]);
    const umaSo = (await vidaDe()).s;
    await avisar(t1, [{ id, segundos: 600 }]);   // a segunda aba, no mesmo instante
    const asDuas = (await vidaDe()).s;
    igual('a primeira aba soma os 600', umaSo, 4200);
    ok('a segunda, no mesmo período, não dobra o tempo',
       asDuas <= 4200 + VIDA.VIDA_FOLGA_S, `ficou ${asDuas}`);
    ok('mas também não perde o que a primeira somou', asDuas >= umaSo,
       `${umaSo} → ${asDuas}`);
  }

  /* ═══ 9 e 10 · A VENDA ═══════════════════════════════════════════
     O caminho inteiro, pelas rotas de verdade. Era aqui que o campo se
     perdia: a auditoria mediu 777.777 segundos a chegarem ausentes. */
  titulo('A venda leva a vida ativa com o avatar');
  {
    const MARCA = 123456;
    await escrever('jog1', { cristais: 500, 'gs.cristais': 500 }, true);
    const p2 = await lerDoc('jog2', true);
    const vaga = [...(p2.avatarSlots || [])];
    while (vaga.length < 5) vaga.push(null);
    await escrever('jog2', { cristais: 500, 'gs.cristais': 500, avatarSlots: vaga }, true);
    // a pool tem de existir: a taxa de listagem é creditada nela
    await fetch(`${BASE}/config/pool?updateMask.fieldPaths=cristais`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields: { cristais: enc(0) } }) });

    await escrever('jog1', { [`vidaAtiva.${id}`]: { s: MARCA, em: Date.now() } }, true);
    igual('o vendedor tem a marca', (await vidaDe()).s, MARCA);

    const lst = await mercado(t1, { acao: 'listar-avatar', slotIdx: i, price: 100 });
    ok('listou', lst.status === 200, JSON.stringify(lst.body));

    if (lst.status === 200) {
      const r = await fetch(`${BASE}/avatarMarket`, { headers: { Authorization: 'Bearer owner' } });
      const docs = ((await r.json()).documents) || [];
      const anuncios = docs.map(d => Object.assign(campos(d), { docId: d.name.split('/').pop() }));
      const an = anuncios.find(a => a.sellerId === 'jog1' && a.status === 'listed' && a.id === id);
      ok('e o anúncio existe', !!an);

      if (an) {
        igual('o ANÚNCIO leva a vida ativa reconhecida', an.totalSecs, MARCA);

        const cmp = await mercado(t2, { acao: 'comprar-avatar', listingId: an.docId });
        ok('o jog2 comprou', cmp.status === 200, JSON.stringify(cmp.body));

        if (cmp.status === 200) {
          const dc = await lerDoc('jog2', true);
          const reg = (dc.vidaAtiva || {})[id];
          igual('o COMPRADOR recebe a mesma vida ativa', reg && reg.s, MARCA);
          const sl = (dc.avatarSlots || []).find(s => s && s.id === id);
          igual('e o espelho no slot dele também', sl && sl.totalSecs, MARCA);
          igual('o nível reconhecido viajou junto, como antes',
                ((dc.niveis || {})[id] || {}).n, an.nivel);
          const dv = await lerDoc('jog1', true);
          ok('e o vendedor deixa de ter o registro', !((dv.vidaAtiva || {})[id]),
             JSON.stringify((dv.vidaAtiva || {})[id]));
          igual('o vínculo continua a zerar, como antes desta etapa', sl && sl.vinculo, 0);
        }
      }
    }
  }

  console.log();
  if (falhas.length) {
    console.log(`${passaram} passaram · ${falhas.length} falharam\n`);
    falhas.forEach(f => console.log(f));
    process.exitCode = 1;
  } else {
    console.log(`${passaram} passaram · 0 falharam`);
  }
})();
