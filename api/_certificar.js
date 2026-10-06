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

/* ── TODA A COLÔNIA DE UM JOGADOR ──

   Um avatar de cada vez, cada um na sua transação. Separados de
   propósito: dez avatares numa transação só é uma transação que falha
   dez vezes mais, e a promoção de um não depende da do outro.

   Um erro num avatar não derruba os outros — devolve-se o que
   aconteceu com cada um, e quem chamar decide o que registrar. */
async function certificarJogador(db, uid, agora) {
  const snap = await db.collection('players').doc(String(uid || '')).get();
  if (!snap.exists) return { uid, erro: 'SEM_JOGADOR', resultados: [] };
  const slots = Array.isArray(snap.data().avatarSlots) ? snap.data().avatarSlots : [];
  const ids = [];
  for (const s of slots) if (s && s.id && ids.indexOf(s.id) === -1) ids.push(s.id);

  const resultados = [];
  for (const id of ids) {
    try {
      resultados.push(Object.assign({ id }, await certificarAvatar(db, uid, id, agora)));
    } catch (e) {
      resultados.push({ id, ok: false, motivo: 'ERRO', erro: (e && e.message) || String(e) });
    }
  }
  return { uid, erro: null, resultados,
           promovidos: resultados.filter(r => r.ok).length };
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

module.exports = { certificarAvatar, certificarJogador, examinarAvatar };
