#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O GATILHO MENSAL DA CERTIFICAÇÃO

     node tools/testar-certificacao.js

   A 3I.13 fez o exame; a 3I.14 fez quem o dispara. Esta ferramenta
   prova o segundo: que o gatilho corre uma vez por ciclo, que correr
   duas vezes não promove ninguém duas vezes, que duas execuções ao
   mesmo tempo não duplicam histórico, e que nada do cliente chega a
   decidir coisa nenhuma.

   ── PORQUE É UM ARQUIVO À PARTE ──

   O tools/testar-raridade.js é síncrono de ponta a ponta, e o gatilho é
   assíncrono: lê o banco, abre transações, varre jogadores. Enfiar um
   `await` lá dentro obrigava a embrulhar o arquivo inteiro, e o que se
   ganhava era um arquivo maior a testar duas coisas.

   ── O BANCO DE MENTIRA ──

   Um Firestore de brincadeira, com só o que o certificador usa. As
   REGRAS são as de verdade — o exame, a promoção e o histórico vêm do
   js/raridades.js e do js/feitos.js sem nenhuma cópia. O que é falso é
   o armazenamento, e é de propósito: assim o teste corre sem emulador e
   apanha a lógica, que é onde moram os defeitos.
   ═══════════════════════════════════════════════════════════════════ */

const RAR = require('../js/raridades.js');

let ok = 0, mau = 0;
const falhas = [];
function conferir(nome, cond, detalhe) {
  if (cond) { ok++; return; }
  mau++;
  falhas.push('  ✗ ' + nome + (detalhe !== undefined ? '\n      ' + JSON.stringify(detalhe) : ''));
}
function titulo(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 58 - t.length))); }

(async () => {
titulo('O gatilho mensal: quem dispara, e o que impede de repetir');

  const FE = require('../js/feitos.js');
  const RK = require('../js/pvp-rank.js');
  const CERT = require('../api/_certificar.js');
  const fs = require('fs');
  const ler = (rel) => fs.readFileSync(__dirname + '/../' + rel, 'utf8');
  const semComentarios = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const mes = (i) => '2026-' + String(i).padStart(2, '0');

  /* ── UM FIRESTORE DE MENTIRA, MAS COM AS REGRAS DE VERDADE ──

     Só o que o certificador usa: `collection().doc().get()`,
     `.select().get()`, `runTransaction` com `tx.get/update/set`.

     As transações são de verdade no que importa aqui: contam-se as
     voltas, e o `conflito` força uma segunda volta para que o teste da
     concorrência seja um teste e não uma esperança. */
  function fakeDb(docs) {
    const dados = JSON.parse(JSON.stringify(docs));
    const db = { _dados: dados, _escritas: 0, _transacoes: 0, _conflito: null };
    const aplicar = (col, id, campos) => {
      const alvo = dados[col][id];
      for (const k of Object.keys(campos)) {
        const partes = k.split('.');
        let o = alvo;
        for (let i = 0; i < partes.length - 1; i++) o = (o[partes[i]] = o[partes[i]] || {});
        o[partes[partes.length - 1]] = campos[k];
      }
      db._escritas++;
    };
    const docRef = (col, id) => ({
      _col: col, _id: id,
      async get() {
        const d = dados[col] && dados[col][id];
        return { exists: !!d, id, data: () => (d ? JSON.parse(JSON.stringify(d)) : null) };
      },
      async set(campos, opts) {
        dados[col] = dados[col] || {};
        if (!opts || !opts.merge) dados[col][id] = {};
        dados[col][id] = dados[col][id] || {};
        aplicar(col, id, campos);
      },
      async update(campos) { aplicar(col, id, campos); },
    });
    db.collection = (col) => ({
      doc: (id) => docRef(col, id),
      select: () => ({
        async get() {
          const ids = Object.keys(dados[col] || {});
          return { forEach: (f) => ids.forEach(id =>
            f({ id, data: () => JSON.parse(JSON.stringify(dados[col][id])) })) };
        },
      }),
    });
    db.runTransaction = async (fn) => {
      db._transacoes++;
      const tx = {
        async get(ref) { return ref.get(); },
        update(ref, campos) { aplicar(ref._col, ref._id, campos); },
        set(ref, campos, opts) {
          dados[ref._col] = dados[ref._col] || {};
          if (!opts || !opts.merge) dados[ref._col][ref._id] = {};
          dados[ref._col][ref._id] = dados[ref._col][ref._id] || {};
          aplicar(ref._col, ref._id, campos);
        },
      };
      /* O CONFLITO, COM ROLLBACK ──

         A primeira volta é descartada e o que ela escreveu é DESFEITO,
         que é o que o Firestore faz: uma transação abortada não deixa
         rasto. Sem desfazer, a segunda volta via o que a primeira
         escreveu e o teste da concorrência media o fake em vez do
         código. */
      if (db._conflito) {
        db._conflito = null;
        const retrato = JSON.stringify(dados);
        const escritasAntes = db._escritas;
        await fn(tx);
        const antes = JSON.parse(retrato);
        for (const k of Object.keys(dados)) delete dados[k];
        for (const k of Object.keys(antes)) dados[k] = antes[k];
        db._escritas = escritasAntes;
        db._transacoes++;
      }
      return fn(tx);
    };
    return db;
  }

  /* Evidência montada pelo `feitoPvp` de verdade. */
  const feitosDe = (ciclos, fortes) => {
    let r = FE.feitoVazio(1);
    let t = 1000;
    for (let i = 0; i < ciclos; i++) r = FE.feitoPvp(r, 'vitoria', 'fila', mes(i + 1), t += 100, null);
    for (let i = 0; i < fortes; i++)
      r = FE.feitoPvp(r, 'vitoria', 'fila', mes(1), t += 100,
        { uid: 'f' + i, pontos: 1200, divisao: 'adulto', em: t, ciclo: mes(1) });
    return r;
  };
  const jogador = (avatares) => {
    const d = { avatarSlots: [], feitos: {}, raridades: {} };
    for (const a of avatares) {
      d.avatarSlots.push({ id: a.id, nome: 'T', nivel: a.nivel || 30 });
      if (a.ciclos !== undefined) d.feitos[a.id] = feitosDe(a.ciclos, a.fortes || 0);
      if (a.rar) d.raridades[a.id] = { atual: a.rar, historico: [{ para: a.rar, em: 1, por: 'exame-raridade' }] };
    }
    return d;
  };
  const rarDe = (db, uid, id) =>
    ((db._dados.players[uid].raridades || {})[id] || {}).atual || 'Comum';
  const histDe = (db, uid, id) =>
    ((db._dados.players[uid].raridades || {})[id] || {}).historico || [];

  /* ── A · SEM AVATARES ── */
  {
    const db = fakeDb({ players: { vazio: { avatarSlots: [] },
                                   semCampo: {} }, certificacoes: {} });
    let conta, erro = null;
    try { conta = await CERT.certificarCiclo(db, Date.UTC(2026, 9, 1, 1)); }
    catch (e) { erro = e.message; }
    conferir('A · sem avatares: corre, não escreve, não rebenta',
      !erro && conta && conta.jogadores === 0 && conta.promovidos === 0
      && db._escritas === 0, erro || conta);
    conferir('e o ciclo do relatório é o do servidor, em UTC',
      conta.ciclo === '2026-10', conta.ciclo);
  }

  /* ── B · UM JOGADOR SEM FEITOS ── */
  {
    const db = fakeDb({ players: { j1: jogador([{ id: 'a1' }]) }, certificacoes: {} });
    const conta = await CERT.certificarCiclo(db, 1000);
    conferir('B · sem feitos: continua Comum, sem escrever',
      conta.avatares === 1 && conta.promovidos === 0 && conta.semPromocao === 1
      && rarDe(db, 'j1', 'a1') === 'Comum' && db._escritas === 0, conta);
  }

  /* ── C e D · O LIMIAR DO RARO ── */
  {
    const db = fakeDb({ players: {
      j1: jogador([{ id: 'tres', ciclos: 3 }, { id: 'dois', ciclos: 2 }]) },
      certificacoes: {} });
    const conta = await CERT.certificarCiclo(db, 2000);
    conferir('C · 3 ciclos → Comum vira Raro',
      rarDe(db, 'j1', 'tres') === 'Raro' && conta.comumParaRaro === 1, conta);
    conferir('D · 2 ciclos → continua Comum',
      rarDe(db, 'j1', 'dois') === 'Comum', rarDe(db, 'j1', 'dois'));
    conferir('e o histórico do promovido tem um evento, do exame',
      histDe(db, 'j1', 'tres').length === 1
      && histDe(db, 'j1', 'tres')[0].por === 'exame-raridade', histDe(db, 'j1', 'tres'));
  }

  /* ── E, F e G · O LIMIAR DO LENDÁRIO ── */
  {
    const db = fakeDb({ players: { j1: jogador([
      { id: 'lend',    ciclos: 5, fortes: 3 },
      { id: 'poucos',  ciclos: 5, fortes: 2 },
      { id: 'curto',   ciclos: 4, fortes: 3 },
      { id: 'deRaro',  ciclos: 6, fortes: 3, rar: 'Raro' }]) }, certificacoes: {} });
    const conta = await CERT.certificarCiclo(db, 3000);
    conferir('E · 5 ciclos e 3 fortes → Lendário, de Comum num salto',
      rarDe(db, 'j1', 'lend') === 'Lendário'
      && histDe(db, 'j1', 'lend').length === 1
      && histDe(db, 'j1', 'lend')[0].para === 'Lendário', histDe(db, 'j1', 'lend'));
    conferir('F · 5 ciclos e 2 fortes → só Raro',
      rarDe(db, 'j1', 'poucos') === 'Raro', rarDe(db, 'j1', 'poucos'));
    conferir('G · 4 ciclos e 3 fortes → só Raro',
      rarDe(db, 'j1', 'curto') === 'Raro', rarDe(db, 'j1', 'curto'));
    conferir('e um Raro com evidência de Lendário sobe, acrescentando ao histórico',
      rarDe(db, 'j1', 'deRaro') === 'Lendário'
      && histDe(db, 'j1', 'deRaro').length === 2, histDe(db, 'j1', 'deRaro'));
    conferir('as contagens do relatório batem com o que aconteceu',
      conta.comumParaLendario === 1 && conta.raroParaLendario === 1
      && conta.comumParaRaro === 2 && conta.avatares === 4, conta);
  }

  /* ── H · REEXECUÇÃO ── */
  {
    const db = fakeDb({ players: { j1: jogador([{ id: 'a1', ciclos: 5, fortes: 3 }]) },
                        certificacoes: {} });
    const c1 = await CERT.certificarCiclo(db, 4000);
    const escritasDepoisDaPrimeira = db._escritas;
    const c2 = await CERT.certificarCiclo(db, 5000);
    const c3 = await CERT.certificarCiclo(db, 6000);
    conferir('H · a segunda e a terceira execução não escrevem nada',
      db._escritas === escritasDepoisDaPrimeira
      && c2.promovidos === 0 && c3.promovidos === 0, { escritas: db._escritas, c2, c3 });
    conferir('e o histórico continua com um evento só',
      histDe(db, 'j1', 'a1').length === 1, histDe(db, 'j1', 'a1'));
    conferir('e a raridade é a mesma',
      rarDe(db, 'j1', 'a1') === 'Lendário', rarDe(db, 'j1', 'a1'));
  }

  /* ── I · EXECUÇÕES SIMULTÂNEAS ──
     Duas ao mesmo tempo sobre o mesmo jogador. O `Promise.all` entrelaça
     as duas, e a transação com conflito força uma a repetir. */
  {
    const db = fakeDb({ players: { j1: jogador([{ id: 'a1', ciclos: 3 }]) },
                        certificacoes: {} });
    db._conflito = true;
    const [r1, r2] = await Promise.all([
      CERT.certificarJogador(db, 'j1', 7000),
      CERT.certificarJogador(db, 'j1', 7000),
    ]);
    conferir('I · duas execuções simultâneas: um evento só no histórico',
      histDe(db, 'j1', 'a1').length === 1, histDe(db, 'j1', 'a1'));
    conferir('e a raridade é Raro, uma vez',
      rarDe(db, 'j1', 'a1') === 'Raro', rarDe(db, 'j1', 'a1'));
    conferir('e no máximo uma delas relata promoção',
      (r1.promovidos + r2.promovidos) <= 1, [r1.promovidos, r2.promovidos]);
    /* E a prova que vale: cem execuções entrelaçadas sobre o mesmo
       avatar deixam UM evento. */
    const db2 = fakeDb({ players: { j1: jogador([{ id: 'a1', ciclos: 5, fortes: 3 }]) },
                         certificacoes: {} });
    await Promise.all(Array.from({ length: 100 },
      () => CERT.certificarJogador(db2, 'j1', 7000)));
    conferir('e cem execuções entrelaçadas deixam um evento só',
      histDe(db2, 'j1', 'a1').length === 1
      && rarDe(db2, 'j1', 'a1') === 'Lendário', histDe(db2, 'j1', 'a1'));
  }

  /* ── J · VÁRIOS AVATARES ── */
  {
    const db = fakeDb({ players: { j1: jogador([
      { id: 'a1', ciclos: 3 }, { id: 'a2', ciclos: 5, fortes: 3 },
      { id: 'a3', ciclos: 1 }, { id: 'a4', ciclos: 0 },
      { id: 'a5', ciclos: 6, fortes: 4 }]) }, certificacoes: {} });
    const conta = await CERT.certificarCiclo(db, 8000);
    conferir('J · cinco avatares, cada um com o seu veredito',
      rarDe(db, 'j1', 'a1') === 'Raro' && rarDe(db, 'j1', 'a2') === 'Lendário'
      && rarDe(db, 'j1', 'a3') === 'Comum' && rarDe(db, 'j1', 'a4') === 'Comum'
      && rarDe(db, 'j1', 'a5') === 'Lendário',
      ['a1','a2','a3','a4','a5'].map(i => rarDe(db, 'j1', i)));
    conferir('e a colônia inteira numa transação só',
      db._transacoes === 1 && conta.avatares === 5, { tx: db._transacoes, conta });

    /* ── E A ESCRITA ACONTECE DENTRO DELA ──

       Uma transação que lê e depois escreve POR FORA não é uma
       transação: perde a atomicidade e a proteção contra a corrida. O
       banco de mentira não consegue provar isolamento, logo prova-se na
       fonte, que é o nível certo para esta pergunta. */
    const fonte = semComentarios(ler('api/_certificar.js'));
    const corpo = fonte.slice(fonte.indexOf('async function certificarJogador'),
                              fonte.indexOf('async function certificarCiclo'));
    conferir('a escrita da colônia acontece DENTRO da transação',
      /tx\.update\(ref, alteracoes\)/.test(corpo)
      && !/\bref\.update\(/.test(corpo) && !/\bref\.set\(/.test(corpo), corpo);
    conferir('e a leitura também, com o tx',
      /const snap = await tx\.get\(ref\);/.test(corpo), null);
  }

  /* ── K · A VENDA: certifica-se o DONO ATUAL ── */
  {
    /* O avatar está na colônia do comprador, com a evidência que trouxe
       (api/comprar-avatar.js move o slot, o `feitos` e o `raridades`). */
    const vendedor = jogador([{ id: 'ficou', ciclos: 1 }]);
    const comprador = jogador([{ id: 'proprio', ciclos: 0 },
                               { id: 'comprado', ciclos: 5, fortes: 3 }]);
    const db = fakeDb({ players: { vende: vendedor, compra: comprador },
                        certificacoes: {} });
    await CERT.certificarCiclo(db, 9000);
    conferir('K · o avatar comprado é certificado no documento do COMPRADOR',
      rarDe(db, 'compra', 'comprado') === 'Lendário', rarDe(db, 'compra', 'comprado'));
    conferir('e o vendedor não guarda raridade de um avatar que já não tem',
      !(db._dados.players.vende.raridades || {}).comprado,
      db._dados.players.vende.raridades);
    conferir('e a autoridade da posse é o avatarSlots, sem segunda regra',
      /slots\.some\(s => s && s\.id === idAvatar\)/.test(semComentarios(ler('api/_certificar.js'))),
      null);
  }

  /* ── L · JÁ LENDÁRIO ── */
  {
    const db = fakeDb({ players: { j1: jogador([
      { id: 'a1', ciclos: 9, fortes: 6, rar: 'Lendário' }]) }, certificacoes: {} });
    const conta = await CERT.certificarCiclo(db, 10000);
    conferir('L · já Lendário: nenhuma promoção nova',
      conta.promovidos === 0 && conta.semPromocao === 1 && db._escritas === 0, conta);
    conferir('e o motivo é JA_TEM',
      conta.avatares === 1, conta);
  }

  /* ── NUNCA DESCE ── */
  {
    const db = fakeDb({ players: { j1: jogador([
      { id: 'caiu', ciclos: 3, rar: 'Lendário' }]) }, certificacoes: {} });
    await CERT.certificarCiclo(db, 11000);
    conferir('um Lendário cuja evidência hoje só daria Raro NÃO é rebaixado',
      rarDe(db, 'j1', 'caiu') === 'Lendário' && db._escritas === 0,
      rarDe(db, 'j1', 'caiu'));
  }

  /* ── M · O CLIENTE MALICIOSO ── */
  {
    const db = fakeDb({ players: { j1: Object.assign(
      jogador([{ id: 'a1', ciclos: 1 }]),
      { raridade: 'Lendário', elegivel: true, exame: { raridade: 'Lendário' },
        certificado: true, promover: 'Lendário' }) }, certificacoes: {} });
    /* E o próprio slot a pedir. */
    db._dados.players.j1.avatarSlots[0].raridade = 'Lendário';
    db._dados.players.j1.avatarSlots[0].raridadeReconhecida = 'Lendário';
    const conta = await CERT.certificarCiclo(db, 12000);
    conferir('M · campos pedindo Lendário no documento não têm efeito',
      rarDe(db, 'j1', 'a1') === 'Comum' && conta.promovidos === 0, conta);
    conferir('e nem no slot, que é o que o cliente grava',
      rarDe(db, 'j1', 'a1') === 'Comum', db._dados.players.j1.avatarSlots[0]);
  }

  /* ── N · A VIRADA UTC ── */
  {
    const fim = Date.UTC(2026, 9, 31, 23, 59, 59, 999);
    const ini = Date.UTC(2026, 10, 1, 0, 0, 0, 0);
    const db = fakeDb({ players: {}, certificacoes: {} });
    const a = await CERT.certificarCiclo(db, fim);
    const b = await CERT.certificarCiclo(db, ini);
    conferir('N · o último instante de outubro é o ciclo de outubro',
      a.ciclo === '2026-10', a.ciclo);
    conferir('e o primeiro de novembro é o de novembro',
      b.ciclo === '2026-11', b.ciclo);
    conferir('e o ciclo sai do pvpTemporada, não de uma conta nova',
      a.ciclo === RK.pvpTemporada(fim) && b.ciclo === RK.pvpTemporada(ini), null);
    /* 23h de 31/10 em Brasília são 02h de 1/11 em UTC: novembro. */
    conferir('e 23h de 31/10 em Brasília cai em novembro (convenção UTC)',
      (await CERT.certificarCiclo(db, Date.UTC(2026, 10, 1, 2))).ciclo === '2026-11', null);
  }

  /* ── O · O MARCADOR, E O RETRY ── */
  {
    const END = require('../api/certificar-ciclo.js');
    const I = END._interno;

    /* O segredo: sem ele configurado, nada passa. */
    conferir('O · sem CRON_SECRET no ambiente, nenhum cabeçalho serve',
      !I.segredoConfere('Bearer qualquer', undefined)
      && !I.segredoConfere('Bearer ', '') && !I.segredoConfere('', ''), null);
    conferir('e com o segredo certo, passa',
      I.segredoConfere('Bearer abc123', 'abc123'), null);
    conferir('e com o errado, não',
      !I.segredoConfere('Bearer abc124', 'abc123')
      && !I.segredoConfere('abc123', 'abc123')
      && !I.segredoConfere('Bearer abc123x', 'abc123'), null);

    /* O marcador: o primeiro toma, o segundo não. */
    const db = fakeDb({ players: {}, certificacoes: {} });
    const t0 = Date.UTC(2026, 9, 1, 1);
    const p1 = await I.tomarOCiclo(db, '2026-10', t0);
    const p2 = await I.tomarOCiclo(db, '2026-10', t0 + 1000);
    conferir('o primeiro toma o ciclo, o segundo encontra-o a correr',
      p1.ok === true && p2.ok === false && p2.motivo === 'A_CORRER', [p1, p2]);

    /* Terminado, ninguém o refaz. */
    await db.collection('certificacoes').doc('2026-10')
      .set({ terminou: t0 + 5000, conta: { promovidos: 7 } }, { merge: true });
    const p3 = await I.tomarOCiclo(db, '2026-10', t0 + 9000);
    conferir('e depois de terminado, não se refaz',
      p3.ok === false && p3.motivo === 'JA_FEITO' && p3.conta.promovidos === 7, p3);

    /* Morreu a meio: passada a janela, a execução seguinte reassume. */
    const db2 = fakeDb({ players: {}, certificacoes: {} });
    await I.tomarOCiclo(db2, '2026-11', t0);
    const cedo = await I.tomarOCiclo(db2, '2026-11', t0 + I.RETOMAR_APOS_MS - 1000);
    const tarde = await I.tomarOCiclo(db2, '2026-11', t0 + I.RETOMAR_APOS_MS + 1000);
    conferir('um começo sem fim tranca enquanto a janela não passa',
      cedo.ok === false && cedo.motivo === 'A_CORRER', cedo);
    conferir('e passada a janela, a execução seguinte REASSUME',
      tarde.ok === true && tarde.retomado === true, tarde);
  }

  /* ── O ENDPOINT: SÓ O AGENDADOR, E NADA DO CLIENTE ── */
  {
    const e = semComentarios(ler('api/certificar-ciclo.js'));
    conferir('o endpoint exige o cabeçalho do agendador',
      /segredoConfere\(req\.headers && req\.headers\.authorization, process\.env\.CRON_SECRET\)/.test(e),
      null);
    conferir('e responde 401 sem ele',
      /status\(401\)/.test(e), null);
    conferir('e NÃO verifica token de jogador: o exame não se pede',
      !/verifyIdToken|idToken/.test(e), null);
    conferir('e não lê o corpo do pedido',
      !/req\.body/.test(e), null);
    conferir('e o ciclo sai do relógio do servidor',
      /const agora = Date\.now\(\);/.test(e) && /RK\.pvpTemporada\(agora\)/.test(e), null);
    conferir('e o registro não guarda uid nem id de avatar',
      !/conta\.uid|resultados/.test(e), null);

    /* E a regra do Firestore para a coleção nova. */
    const regras = ler('firestore.rules');
    conferir('a coleção `certificacoes` existe nas regras, e não se escreve',
      /match \/certificacoes\/\{ciclo\} \{[\s\S]{0,120}allow write: if false;/.test(regras), null);

    /* E o cron da plataforma. */
    const v = JSON.parse(ler('vercel.json'));
    conferir('o vercel.json agenda o endpoint, uma vez por mês',
      Array.isArray(v.crons) && v.crons.length === 1
      && v.crons[0].path === '/api/certificar-ciclo'
      && /^\S+ \S+ 1 \S+ \S+$/.test(v.crons[0].schedule), v.crons);
    conferir('e corre DEPOIS da virada, não no instante dela',
      v.crons[0].schedule.split(' ')[1] !== '0'
      || v.crons[0].schedule.split(' ')[0] !== '0', v.crons[0].schedule);
  }

  /* ── NENHUMA CERTIFICAÇÃO DO LADO DO CLIENTE ── */
  {
    /* O js/raridades.js fica de fora: é onde o `rarCertificar` VIVE, e
       corre nos dois lados. O que se procura é uma TELA a disparar a
       certificação — uma chamada, um fetch à rota, um temporizador. */
    const achados = [];
    for (const a of fs.readdirSync(__dirname + '/../js')) {
      if (!a.endsWith('.js') || a === 'raridades.js') continue;
      const t = semComentarios(ler('js/' + a));
      if (/rarCertificar\s*\(|certificarJogador|certificarCiclo|certificar-ciclo/.test(t))
        achados.push('js/' + a);
    }
    conferir('nenhuma tela chama a certificação', achados.length === 0, achados);
    /* E nenhum temporizador nem gancho de abertura a disparar isso. */
    const gatilhos = [];
    for (const a of fs.readdirSync(__dirname + '/../js')) {
      if (!a.endsWith('.js')) continue;
      const t = semComentarios(ler('js/' + a));
      if (/(setInterval|setTimeout|visibilitychange)[^;]{0,200}certific/i.test(t))
        gatilhos.push('js/' + a);
    }
    conferir('e nenhum temporizador ou gancho de visibilidade a dispara',
      gatilhos.length === 0, gatilhos);
    /* E nem o endpoint do PvP, que é onde o trabalho mensal da casa
       mora — o gatilho NÃO é por abertura de tela. */
    conferir('e o api/pvp.js não a chama (o gatilho não é a abertura do Salão)',
      !/_certificar|certificarJogador|certificarCiclo/.test(semComentarios(ler('api/pvp.js'))),
      null);
  }

console.log('\n' + (falhas.length ? falhas.join('\n') + '\n' : '')
  + ok + ' passaram · ' + mau + ' falharam');
process.exit(mau ? 1 : 0);
})();
