/* ═══════════════════════════════════════════════════════════════════
   O GATILHO MENSAL DA CERTIFICAÇÃO

   Corre uma vez por mês, logo depois da virada UTC, e manda o
   `certificarCiclo` (api/_certificar.js) passar por todos os jogadores.

   ── PORQUE É UM CRON DA PLATAFORMA, E NÃO O PADRÃO DA CASA ──

   O projeto já tem trabalho mensal: o `fecharPendentes` do api/pvp.js,
   que paga os prêmios da temporada. O padrão dele é PREGUIÇOSO — o
   primeiro jogador a abrir o Salão paga a conta de todos, e a
   idempotência vem de um marcador em transação.

   Esse padrão não serve aqui, e a razão é de desenho e não técnica: a
   certificação não pode depender de alguém abrir uma tela. Um jogador
   que conquistou o Lendário em outubro e só volta em dezembro tem de
   ser Lendário em novembro — não no dia em que calhar de voltar.

   O que se manteve do padrão da casa foi o que importa: o MARCADOR em
   transação (`certificacoes/{ciclo}`), que é como o projeto garante que
   trabalho mensal acontece uma vez só.

   ── QUEM PODE CHAMAR ──

   Só o agendador da plataforma, que manda um `Authorization: Bearer`
   com o segredo do ambiente (CRON_SECRET). Sem o segredo configurado,
   este endpoint RECUSA TUDO — falha fechada, que é o lado certo para
   errar: um gatilho que não corre adia certificações; um gatilho aberto
   deixa qualquer um disparar a varredura da base inteira.

   Não há token de jogador aqui, e é de propósito. O exame não se pede:
   não existe ação, parâmetro ou corpo de pedido que mude o que ele
   decide. Um cliente que chegue a esta rota sem o segredo leva 401 e
   mais nada acontece.

   ── O QUE É PRECISO CONFIGURAR ──

   A variável CRON_SECRET no ambiente, e a entrada em `vercel.json`. Sem
   as duas, nada corre — e nada quebra: a certificação fica por fazer,
   a evidência continua a acumular-se, e a primeira execução apanha
   tudo o que ficou para trás. A evidência não expira (3I.11).
   ═══════════════════════════════════════════════════════════════════ */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const CERT = require('./_certificar.js');
const RK   = require('../js/pvp-rank.js');

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  }
  return { db: getFirestore() };
}

/* ── O SEGREDO ──

   Comparação de tamanho constante, porque a de `===` devolve no
   primeiro byte diferente e isso mede-se de fora. É um exagero para um
   segredo de cron? É. Custa três linhas. */
function segredoConfere(cabecalho, segredo) {
  const a = String(cabecalho || '');
  const b = 'Bearer ' + String(segredo || '');
  if (!segredo || a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/* ── O MARCADOR DO CICLO ──

   `certificacoes/{ciclo}` com `{ comecou, terminou, conta }`. Serve a
   duas perguntas:

     já começou?    impede que duas execuções simultâneas varram a base
                    ao mesmo tempo — a segunda sai no 409
     já terminou?   impede que a execução do mês seguinte refaça o mês
                    passado por engano

   ── E SE MORRER A MEIO? ──

   Fica `comecou` sem `terminou`, e a execução seguinte REASSUME: a
   transação deixa passar quando o começo é mais velho que
   `RETOMAR_APOS_MS`. Sem isso, uma falha a meio trancava o ciclo para
   sempre e a certificação daquele mês não acontecia nunca.

   Retomar é seguro porque a certificação em si é idempotente: quem já
   foi promovido recebe `JA_TEM` do `rarPromover` e não é tocado. O
   marcador é só para não varrer a base duas vezes à toa — não é ele que
   garante a correção, é o `rarPromover`. */
const RETOMAR_APOS_MS = 30 * 60 * 1000;   // meia hora

async function tomarOCiclo(db, ciclo, agora) {
  const ref = db.collection('certificacoes').doc(ciclo);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? (snap.data() || {}) : null;
    if (d && d.terminou) return { ok: false, motivo: 'JA_FEITO', conta: d.conta || null };
    /* `+x || 0` e NÃO `x | 0`: o `| 0` trunca para int32, e um instante
       em milissegundos passa de 2^31 desde 1970 — vinte e cinco dias
       depois dele. Com `| 0`, 1790816400000 virava 323661696, toda
       execução parecia velhíssima, e o marcador deixava passar sempre.
       Apanhado pelo tools/testar-certificacao.js. */
    const comecou = d ? (+d.comecou || 0) : 0;
    if (comecou && (agora - comecou) < RETOMAR_APOS_MS) {
      return { ok: false, motivo: 'A_CORRER' };
    }
    tx.set(ref, { ciclo, comecou: agora, terminou: null }, { merge: true });
    return { ok: true, retomado: !!(d && d.comecou) };
  });
}

module.exports = async function handler(req, res) {
  /* GET, porque é o que o agendador manda. Nada neste endpoint lê o
     corpo do pedido: não há o que mandar. */
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ erro: 'metodo' });
  }
  if (!segredoConfere(req.headers && req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ erro: 'nao_autorizado' });
  }

  const { db } = initAdmin();
  const agora = Date.now();
  const ciclo = RK.pvpTemporada(agora);

  let tomada;
  try {
    tomada = await tomarOCiclo(db, ciclo, agora);
  } catch (e) {
    console.error('[certificar-ciclo marcador]', ciclo, (e && e.message) || String(e));
    return res.status(500).json({ ok: false, erro: 'marcador' });
  }
  if (!tomada.ok) {
    /* Nem 200 nem erro: o trabalho não era deste. 409 para que um retry
       do agendador não pareça sucesso nem falha. */
    return res.status(409).json({ ok: false, ciclo, motivo: tomada.motivo,
                                  conta: tomada.conta || null });
  }

  try {
    const conta = await CERT.certificarCiclo(db, agora);
    await db.collection('certificacoes').doc(ciclo)
      .set({ terminou: Date.now(), conta }, { merge: true });

    /* ── O QUE FICA NO REGISTRO ──
       Contagens, e mais nada. Nem uid, nem id de avatar, nem documento:
       quem precisar de saber quem foi promovido lê o histórico da
       raridade, que é onde isso mora. */
    console.log('[certificar-ciclo] ' + ciclo
      + ' · jogadores ' + conta.jogadores
      + ' · avatares ' + conta.avatares
      + ' · promovidos ' + conta.promovidos
      + ' (C→R ' + conta.comumParaRaro
      + ' · C→L ' + conta.comumParaLendario
      + ' · R→L ' + conta.raroParaLendario + ')'
      + ' · sem promoção ' + conta.semPromocao
      + ' · erros ' + conta.erros);

    return res.status(200).json({ ok: true, ciclo, retomado: !!tomada.retomado, conta });
  } catch (e) {
    /* O marcador fica com `comecou` e sem `terminou`: passada a meia
       hora, a execução seguinte reassume. Não se apaga o marcador —
       apagá-lo abriria a porta a duas varreduras ao mesmo tempo. */
    console.error('[certificar-ciclo]', ciclo, (e && e.message) || String(e));
    return res.status(500).json({ ok: false, ciclo, erro: 'interno' });
  }
};

module.exports._interno = { segredoConfere, tomarOCiclo, RETOMAR_APOS_MS };
