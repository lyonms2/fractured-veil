/* ═══════════════════════════════════════════════════════════════════
   A CERTIFICAÇÃO DE RARIDADE, DO LADO DO SERVIDOR

   O exame em si não está aqui: está no `rarExaminar` (js/raridades.js),
   que é uma função pura e não sabe o que é um banco de dados. Aqui está
   a única coisa que ele não pode fazer sozinho — ir buscar a evidência
   onde ela é confiável, e gravar o resultado.

   ── O CAMINHO ──

     o documento do jogador (Firestore)
           ↓   feitos[idAvatar]          ← só o servidor escreve
     rarExaminar(feitos)                 ← puro, sem efeito
           ↓   { raridade, ciclos, fortes }
     rarPromover(raridades[idAvatar], …) ← a regra de quem pode subir
           ↓   { atual, historico }
     raridades[idAvatar]                 ← só o servidor escreve

   ── PORQUE NÃO HÁ ROTA ──

   Este arquivo começa por `_`, como o `_cristais.js` e o `_genetica.js`:
   é módulo interno, e a Vercel não o serve. Nenhum endpoint o chama, e
   é de propósito.

   O exame não se PEDE. Um botão de "examinar-me" seria inofensivo hoje
   (a evidência é toda do servidor), mas convida à pergunta errada: a
   raridade não é um requerimento que se protocola, é um fato que o
   servidor constata. Quem o vai chamar é o ciclo mensal, numa etapa
   própria — e aí basta esta função.

   ── O QUE ESTE ARQUIVO NÃO FAZ ──

   Não decide critérios (estão no js/raridades.js, calibrados na 3I.10).
   Não cria métricas (lê as que os Feitos já guardam).
   Não tem calendário (quem chamar escolhe quando).
   Não tem quota, nem ranking, nem disputa: se ninguém for elegível,
   ninguém é promovido; se todos forem, todos são.
   ═══════════════════════════════════════════════════════════════════ */

const RAR = require('../js/raridades.js');
const FE  = require('../js/feitos.js');
const RK  = require('../js/pvp-rank.js');   // o ciclo: pvpTemporada, em UTC

/* ── UM AVATAR ──

   Dentro de uma transação, para que a evidência lida e a raridade
   escrita sejam do mesmo instante: entre ler e gravar pode fechar uma
   partida de PvP e mexer nos feitos.

   Devolve `{ ok, motivo, de, para, exame }`. Só `ok: true` escreveu
   alguma coisa.

   Os motivos de não escrever, e nenhum deles é erro:

     SEM_JOGADOR     o documento não existe
     SEM_AVATAR      o avatar não está na colônia deste jogador
     SEM_EVIDENCIA   a evidência não chega nem para Raro
     JA_TEM          já tem exatamente essa raridade
     NAO_DESCE       já tem mais do que a evidência merece

   Os dois últimos são o que torna isto IDEMPOTENTE: correr o exame
   outra vez sobre o mesmo avatar não escreve nada e não duplica
   histórico. É o `rarPromover` que os devolve — a regra mora num lugar
   só. */
async function certificarAvatar(db, uid, idAvatar, agora) {
  const ref = db.collection('players').doc(String(uid || ''));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { ok: false, motivo: 'SEM_JOGADOR' };
    const d = snap.data();

    /* O AVATAR TEM DE SER DESTE JOGADOR, e vivo o bastante para ter um
       lugar na colônia. Sem isto, um id qualquer passado por engano
       escreveria uma raridade num avatar que não existe. */
    const slots = Array.isArray(d.avatarSlots) ? d.avatarSlots : [];
    if (!idAvatar || !slots.some(s => s && s.id === idAvatar)) {
      return { ok: false, motivo: 'SEM_AVATAR' };
    }

    /* A EVIDÊNCIA, do mapa que só o servidor escreve, passada pelo
       saneador do js/feitos.js. Nada daqui vem do cliente: `feitos` é
       campo de topo que o firestore.rules recusa à escrita dele. */
    const feitos = FE.feitoDe(d.feitos || {}, idAvatar);
    const reg    = RAR.rarRegistro(d.raridades || {}, idAvatar);

    const r = RAR.rarCertificar(reg, feitos, agora || Date.now(), RAR.RAR_EXAME_POR);
    if (!r.ok) return { ok: false, motivo: r.motivo, de: r.de, para: r.para, exame: r.exame };

    tx.update(ref, { ['raridades.' + idAvatar]: r.reg });
    return { ok: true, motivo: null, de: r.de, para: r.para, exame: r.exame };
  });
}

/* ── TODA A COLÔNIA DE UM JOGADOR, NUMA TRANSAÇÃO SÓ ──

   Uma leitura do documento, o exame de cada avatar, e uma escrita com
   as promoções que houver. A primeira versão abria uma transação POR
   AVATAR — dez avatares eram onze leituras do mesmo documento, e o
   gatilho mensal (api/certificar-ciclo.js) multiplica isso por todos os
   jogadores.

   A atomicidade também melhora: ou a colônia inteira é certificada, ou
   nenhuma parte dela é. Não há estado intermédio em que metade subiu.

   Continua idempotente pela mesma razão de sempre — quem decide se a
   promoção pode ser gravada é o `rarPromover`, e ele recusa `JA_TEM` e
   `NAO_DESCE`. Correr isto outra vez não escreve nada.

   E continua seguro na concorrência: duas execuções ao mesmo tempo
   entram em conflito na transação, uma delas volta a correr com os
   dados frescos, e a segunda volta encontra a raridade já gravada. */
async function certificarJogador(db, uid, agora) {
  const ref = db.collection('players').doc(String(uid || ''));
  const quando = agora || Date.now();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { uid, erro: 'SEM_JOGADOR', resultados: [], promovidos: 0 };
    const d = snap.data();
    const slots = Array.isArray(d.avatarSlots) ? d.avatarSlots : [];

    /* ── OS AVATARES DESTE JOGADOR, AGORA ──

       A autoridade da posse é o `avatarSlots` do documento, e não há
       segunda: a venda move o slot para o comprador e leva com ele as
       chaves de `raridades` e `feitos` (api/comprar-avatar.js). Um
       avatar vendido já não está aqui, e o exame dele corre no
       documento de quem o comprou.

       Sem id não há avatar — e o mesmo id não se examina duas vezes. */
    const ids = [];
    for (const s of slots) if (s && s.id && ids.indexOf(s.id) === -1) ids.push(s.id);

    const feitos = d.feitos || {};
    const raridades = d.raridades || {};
    const resultados = [];
    const alteracoes = {};
    for (const id of ids) {
      const r = RAR.rarCertificar(RAR.rarRegistro(raridades, id),
                                  FE.feitoDe(feitos, id), quando, RAR.RAR_EXAME_POR);
      resultados.push({ id, ok: r.ok, motivo: r.motivo, de: r.de, para: r.para,
                        exame: r.exame });
      if (r.ok) alteracoes['raridades.' + id] = r.reg;
    }
    if (Object.keys(alteracoes).length) tx.update(ref, alteracoes);
    return { uid, erro: null, resultados,
             promovidos: resultados.filter(r => r.ok).length };
  });
}

/* ── O CICLO INTEIRO ──

   Varre os jogadores e certifica cada colônia. É o que o gatilho mensal
   chama (api/certificar-ciclo.js), e é também o que se pode chamar à
   mão numa correção.

   ── A VARREDURA ──

   `.select(...)` traz SÓ os três campos de que o exame precisa, e isso
   não é economia de centavos: um documento de jogador tem o save
   inteiro, e puxar dez mil deles por causa de três campos é a diferença
   entre um job que corre e um que estoura. O mesmo que o api/pool.js
   faz para somar cristais.

   A varredura serve só para DESCOBRIR quem existe. A evidência que
   conta é relida dentro da transação do `certificarJogador`, com os
   dados do instante da escrita — entre a varredura e a certificação
   pode fechar uma partida.

   ── O QUE ACONTECE QUANDO UM JOGADOR FALHA ──

   Registra-se e continua. Um documento corrompido não pode impedir a
   certificação de todos os outros, e a operação é repetível: correr
   outra vez certifica quem ficou por certificar e não mexe em quem já
   foi. É a mesma decisão do `_pagarPendentes` (api/pvp.js), e pela
   mesma razão.

   O relatório traz `erros` com a contagem, para que a falha apareça em
   vez de se esconder atrás de um "correu bem". */
async function certificarCiclo(db, agora) {
  const quando = agora || Date.now();
  const ciclo = RK.pvpTemporada(quando);
  const conta = { ciclo, jogadores: 0, avatares: 0, promovidos: 0,
                  comumParaRaro: 0, comumParaLendario: 0, raroParaLendario: 0,
                  semPromocao: 0, erros: 0 };

  const snap = await db.collection('players').select('avatarSlots').get();
  const uids = [];
  snap.forEach(doc => {
    const slots = (doc.data() || {}).avatarSlots;
    if (Array.isArray(slots) && slots.some(s => s && s.id)) uids.push(doc.id);
  });

  for (const uid of uids) {
    conta.jogadores++;
    let r;
    try {
      r = await certificarJogador(db, uid, quando);
    } catch (e) {
      conta.erros++;
      console.error('[certificar ' + ciclo + ']', uid, (e && e.message) || String(e));
      continue;
    }
    for (const a of (r.resultados || [])) {
      conta.avatares++;
      if (!a.ok) { conta.semPromocao++; continue; }
      conta.promovidos++;
      if (a.de === 'Comum' && a.para === 'Raro') conta.comumParaRaro++;
      else if (a.de === 'Comum' && a.para === 'Lendário') conta.comumParaLendario++;
      else if (a.de === 'Raro' && a.para === 'Lendário') conta.raroParaLendario++;
    }
  }
  return conta;
}

/* ── O QUE O AVATAR MERECE, SEM ESCREVER NADA ──

   Para uma tela que queira mostrar "faltam-te dois ciclos" sem
   prometer nada, e para a etapa do ciclo mensal poder contar quantos
   seriam promovidos antes de promover.

   Lê o documento e devolve o exame. Não escreve, não promove. */
async function examinarAvatar(db, uid, idAvatar) {
  const snap = await db.collection('players').doc(String(uid || '')).get();
  if (!snap.exists) return { ok: false, motivo: 'SEM_JOGADOR' };
  const d = snap.data();
  const exame = RAR.rarExaminar(FE.feitoDe(d.feitos || {}, idAvatar));
  return { ok: true, atual: RAR.rarDe(d.raridades || {}, idAvatar), exame };
}

module.exports = { certificarAvatar, certificarJogador, certificarCiclo, examinarAvatar };
