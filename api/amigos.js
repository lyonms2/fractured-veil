// ═══════════════════════════════════════════════════════════════
//  api/amigos.js — Vercel Serverless Function
//
//  GET  /api/amigos?lista=1&idToken=X   → amigos + pedidos + visitasLog
//  POST /api/amigos { acao:'pedir', codigo:'ABC123' } → pedir amizade pelo código
//  GET  /api/amigos?perfil=uid&idToken=X   → perfil público + cooldown
//
//  POST { acao, idToken, ... }
//    acao='pedir'   → enviar pedido de amizade  { alvoUid }
//    acao='aceitar' → aceitar pedido             { alvoUid }
//    acao='recusar' → recusar pedido             { alvoUid }
//    acao='remover' → remover amigo              { alvoUid }
//    acao='visitar' → executar visita            { alvoUid, tipo: alimentar|brincar|limpar }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const MOEDAS_VISITA = 50;
const XP_VISITA     = 15;
const VITAL_BOOST   = 20;
// O que fica para QUEM É VISITADO. Vínculo e não moedas de propósito:
// duas contas a visitarem-se uma à outra já se pagam como visitantes, e
// dar moedas dos dois lados dobrava isso. O vínculo é do avatar, não se
// troca nem se converte em cristais — e é a moeda certa para "alguém
// cuidou do teu bicho".
const VINCULO_VISITADO = 1;
const MAX_INBOX_VISITAS = 30;
const COOLDOWN_MS   = 8 * 60 * 60 * 1000; // 8 horas
const MAX_AMIGOS    = 50;
const MAX_PEDIDOS   = 20;
const MAX_VISITAS   = 10; // limite global por janela de 8h

const TIPO_VITAL = {
  alimentar: 'fome',
  brincar:   'humor',
  limpar:    'higiene',
};

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return { db: getFirestore(), auth: getAuth() };
}

async function verificarToken(auth, idToken) {
  const decoded = await auth.verifyIdToken(idToken);
  return decoded.uid;
}

// ── Handler principal ─────────────────────────────────────────
/* ═══════════════════════════════════════════════════════════════════
   O CÓDIGO DE AMIGO

   Procurava-se um amigo pelo NOME do jogador. Três coisas erradas
   nisso, e as três medidas no código: o nome não é único (dois "Leo"
   ficam indistinguíveis), é escrito pelo cliente (dá para pôr o nome de
   outra pessoa e aparecer na busca no lugar dela), e a procura é por
   prefixo e sem acentos ("ardo" não encontra "Leonardo").

   Um código resolve os três de uma vez: é único por construção, é o
   servidor que o emite, e não se procura — passa-se.

   ── O ALFABETO ──

   Trinta e dois símbolos, sem os que se confundem a ler em voz alta ou
   a copiar de um ecrã: sem O e sem 0, sem I e sem 1. Seis caracteres
   dão mil milhões de códigos, que é muito mais do que este jogo vai
   precisar, e cabem numa linha para se ditar ao telefone.

   ── A UNICIDADE ──

   Não se confia no acaso: cada código é um DOCUMENTO na coleção
   `codigosAmigo`, criado numa transação que falha se ele já existir.
   Se falhar, sorteia-se outro. É também assim que se procura depois —
   uma leitura direta pelo id, sem índice nem varrimento.
   ═══════════════════════════════════════════════════════════════════ */
const CODIGO_ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODIGO_TAMANHO  = 6;

function _sortearCodigo() {
  const { randomInt } = require('crypto');
  let c = '';
  for (let i = 0; i < CODIGO_TAMANHO; i++) c += CODIGO_ALFABETO[randomInt(0, CODIGO_ALFABETO.length)];
  return c;
}

/* Aceita o que o jogador escreveu e devolve o código, ou null.

   Perdoa o que é formatação — minúsculas, espaços, o hífen com que o
   código se mostra ("ABC-123") — e não perdoa mais nada. Um símbolo
   que o alfabeto não tem é recusado, e não adivinhado: podia
   converter-se um O em zero, mas o alfabeto também não tem zero, e
   adivinhar um código é adicionar a pessoa errada. */
function _limparCodigo(bruto) {
  const c = String(bruto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (c.length !== CODIGO_TAMANHO) return null;
  for (const ch of c) if (CODIGO_ALFABETO.indexOf(ch) === -1) return null;
  return c;
}

/* O código deste jogador, emitido na primeira vez que lho pedem.

   O `dadosJaLidos` existe porque quem chama isto — a lista de amigos —
   acabou de ler o documento do jogador. Sem ele lia-se duas vezes o
   mesmo, de cada vez que alguém abre a tela.

   Devolve null se o jogador ainda não tem documento. Isso acontece na
   primeira entrada, antes do primeiro save, e não é um erro: a tela
   mostra o código por sortear e ele aparece à visita seguinte. */
async function _codigoDe(db, uid, dadosJaLidos) {
  const playerRef = db.collection('players').doc(uid);
  let dados = dadosJaLidos;
  if (!dados) {
    const snap = await playerRef.get();
    if (!snap.exists) return null;
    dados = snap.data();
  }
  if (dados.codigoAmigo) return dados.codigoAmigo;

  // Seis tentativas chegam de sobra: com mil milhões de códigos, uma
  // colisão já é rara à primeira.
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const codigo = _sortearCodigo();
    const codRef = db.collection('codigosAmigo').doc(codigo);
    try {
      await db.runTransaction(async (tx) => {
        const c = await tx.get(codRef);
        if (c.exists) throw new Error('COLISAO');
        tx.set(codRef, { uid, em: Date.now() });
        tx.update(playerRef, { codigoAmigo: codigo });
      });
      return codigo;
    } catch (e) {
      if (e.message !== 'COLISAO') throw e;
    }
  }
  throw new Error('Não foi possível emitir um código.');
}

async function _uidDoCodigo(db, codigo) {
  const snap = await db.collection('codigosAmigo').doc(codigo).get();
  return snap.exists ? (snap.data().uid || null) : null;
}


module.exports = async function handler(req, res) {
  const { db, auth } = initAdmin();

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { lista, perfil, idToken } = req.query;
    if (!idToken) return res.status(400).json({ erro: 'idToken em falta' });

    let uid;
    try { uid = await verificarToken(auth, idToken); }
    catch { return res.status(401).json({ erro: 'Token inválido' }); }

    // GET ?lista=1
    if (lista === '1') {
      try {
        const snap = await db.collection('players').doc(uid).get();
        const data = snap.exists ? snap.data() : {};
        // O código vai com a lista: é a primeira coisa que a tela mostra,
        // e assim não é preciso um segundo pedido só para o ler.
        const meuCodigo = snap.exists ? await _codigoDe(db, uid, data) : null;
        return res.status(200).json({
          ok:         true,
          meuCodigo,
          amigos:     data.amigos        || {},
          pedidos:    data.pedidosAmizade || [],
          visitasLog: data.visitasLog    || {},
        });
      } catch (err) {
        console.error('[amigos lista]', err);
        return res.status(500).json({ erro: 'Erro ao carregar amigos.' });
      }
    }

    /* ── A BUSCA POR NOME SAIU ──

       Procurava-se um amigo pelo nome do jogador, com uma consulta de
       prefixo sobre o campo `nomeBusca`. Três coisas erradas, e as três
       medidas: o nome não é único, é escrito pelo cliente — dá para pôr
       o de outra pessoa e aparecer no lugar dela — e o prefixo não
       encontra "Leonardo" a partir de "ardo" nem "José" a partir de
       "jose".

       Passou a ser um código que se passa de um para o outro. Ver o
       _codigoDe, lá em cima, e o handlePedir, que agora o recebe. */

    // GET ?perfil=uid
    if (perfil) {
      try {
        const [mySnap, targetSnap] = await Promise.all([
          db.collection('players').doc(uid).get(),
          db.collection('players').doc(perfil).get(),
        ]);
        if (!targetSnap.exists) return res.status(404).json({ erro: 'Jogador não encontrado.' });

        const myData     = mySnap.exists ? mySnap.data() : {};
        const targetData = targetSnap.data();

        // Validar que são amigos
        if (!myData.amigos?.[perfil]) {
          return res.status(403).json({ erro: 'Não são amigos.' });
        }

        /* ── O PERFIL É A COLÓNIA ──

           Devolvia UM avatar: o que o dono tivesse aberto. Visitava-se
           esse e mais nenhum, e o visitante nem sabia que havia outros.

           Vão todos os que estão vivos, cada um com o seu slot, e é o
           visitante que escolhe a quem leva a comida. O `slot` de cada
           um vai junto porque é por ele que a visita diz de quem fala —
           ver o handleVisitar. */
        const vivos = (targetData.avatarSlots || [])
          .map((s, i) => ({ s, i }))
          .filter(x => x.s && x.s.hatched && !x.s.dead)
          .map(({ s, i }) => ({
            slot:     i,
            nome:     s.nome?.split(',')[0] || '',
            alcunhaIdx: s.alcunhaIdx ?? null,
            raridade: s.raridade || 'Comum',
            nivel:    s.nivel    || 1,
            seed:     s.seed     || 0,
            sexo:     s.nascimento?.sexo ?? null,
            corPrincipal:  s.nascimento?.corPrincipal  ?? null,
            corSecundaria: s.nascimento?.corSecundaria ?? null,
            vitals:   s.vitals   || { fome:100, humor:100, energia:100, saude:100, higiene:100 },
          }));

        if (!vivos.length) return res.status(200).json({ ok: true, semAvatar: true });

        const myCooldowns = (myData.visitasLog || {})[perfil] || {};

        return res.status(200).json({
          ok:      true,
          colonia: vivos,
          nomeJogador: targetData.nomeJogador || null,
          cooldowns: {
            alimentar: myCooldowns.alimentar || 0,
            brincar:   myCooldowns.brincar   || 0,
            limpar:    myCooldowns.limpar     || 0,
          },
        });
      } catch (err) {
        console.error('[amigos perfil]', err);
        return res.status(500).json({ erro: 'Erro ao carregar perfil.' });
      }
    }

    return res.status(400).json({ erro: 'Parâmetro inválido.' });
  }

  // ── POST ─────────────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const { acao, idToken, tipo } = req.body;
  let alvoUid = req.body.alvoUid;
  if (!idToken) return res.status(400).json({ erro: 'idToken em falta' });

  let uid;
  try { uid = await verificarToken(auth, idToken); }
  catch { return res.status(401).json({ erro: 'Token inválido' }); }

  /* ── O CÓDIGO É UMA FORMA DE NOMEAR O ALVO ──

     Traduz-se aqui, ANTES do guarda do alvoUid, e não lá dentro do
     handlePedir: o guarda exige um alvo, e um pedido que traz só o
     código ainda não tem nenhum. Traduzido primeiro, o resto do
     ficheiro continua a ver o que sempre viu — um uid. */
  if (!alvoUid && acao === 'pedir' && req.body.codigo !== undefined) {
    const limpo = _limparCodigo(req.body.codigo);
    if (!limpo) return res.status(400).json({ erro: 'Código inválido.', motivo: 'invalido' });
    alvoUid = await _uidDoCodigo(db, limpo);
    if (!alvoUid) return res.status(404).json({ erro: 'Ninguém tem esse código.', motivo: 'naoexiste' });
  }

  if (!alvoUid || typeof alvoUid !== 'string') return res.status(400).json({ erro: 'alvoUid inválido', motivo: 'invalido' });
  if (alvoUid === uid) return res.status(400).json({ erro: 'Esse código é o seu.', motivo: 'euproprio' });

  if (acao === 'pedir')   return handlePedir(req, res, db, uid, alvoUid);
  if (acao === 'aceitar') return handleAceitar(req, res, db, uid, alvoUid);
  if (acao === 'recusar') return handleRecusar(req, res, db, uid, alvoUid);
  if (acao === 'remover') return handleRemover(req, res, db, uid, alvoUid);
  if (acao === 'visitar') return handleVisitar(req, res, db, uid, alvoUid, tipo, req.body?.alvoSlot);

  return res.status(400).json({ erro: 'acao inválida' });
};

// ── Enviar pedido de amizade ──────────────────────────────────
async function handlePedir(req, res, db, uid, alvoUid) {
  /* O `alvoUid` chega já traduzido do código que o jogador escreveu —
     a tradução está no despacho do POST, aqui em cima.

     Cada recusa leva um `motivo`. O texto em `erro` é para o log; quem
     escolhe o que o jogador lê é o cliente, que tem as duas línguas
     (js/i18n-misc.js). */
  try {
    const [mySnap, targetSnap] = await Promise.all([
      db.collection('players').doc(uid).get(),
      db.collection('players').doc(alvoUid).get(),
    ]);
    if (!targetSnap.exists) return res.status(404).json({ erro: 'Jogador não encontrado.', motivo: 'naoexiste' });

    const myData     = mySnap.exists ? mySnap.data() : {};
    const targetData = targetSnap.data();

    if (myData.amigos?.[alvoUid]) return res.status(400).json({ erro: 'Já são amigos.', motivo: 'jaamigos' });
    if ((targetData.pedidosAmizade || []).some(p => p.de === uid)) {
      return res.status(400).json({ erro: 'Pedido já enviado.', motivo: 'jaenviado' });
    }
    if ((targetData.pedidosAmizade || []).length >= MAX_PEDIDOS) {
      return res.status(400).json({ erro: 'Este jogador tem muitos pedidos pendentes.', motivo: 'cheio' });
    }

    /* O pedido leva o nome de QUEM o faz, e quem o faz e uma pessoa.
       Levava o nome do avatar que ele tivesse aberto — e desde que os
       avatares chegam por baptizar, isso era quase sempre vazio. */
    const meuNome = myData.nomeJogador || 'Viajante';

    await db.collection('players').doc(alvoUid).update({
      pedidosAmizade: FieldValue.arrayUnion({ de: uid, nome: meuNome, ts: Date.now() }),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[amigos/pedir]', err);
    return res.status(500).json({ erro: 'Erro ao enviar pedido.' });
  }
}

// ── Aceitar pedido ────────────────────────────────────────────
async function handleAceitar(req, res, db, uid, alvoUid) {
  try {
    const [mySnap, targetSnap] = await Promise.all([
      db.collection('players').doc(uid).get(),
      db.collection('players').doc(alvoUid).get(),
    ]);
    if (!targetSnap.exists) return res.status(404).json({ erro: 'Jogador não encontrado.' });

    const myData     = mySnap.exists ? mySnap.data() : {};
    const targetData = targetSnap.data();

    const pedidos = myData.pedidosAmizade || [];
    const pedido  = pedidos.find(p => p.de === alvoUid);
    if (!pedido) return res.status(400).json({ erro: 'Pedido não encontrado.' });

    if (Object.keys(myData.amigos || {}).length >= MAX_AMIGOS) {
      return res.status(400).json({ erro: 'Lista de amigos cheia.' });
    }

    // Os nomes das duas PESSOAS. Eram os dos avatares abertos: uma
    // amizade entre bichos que mudam de nome e de dono.
    const meuNome  = myData.nomeJogador     || 'Viajante';
    const nomeAlvo = targetData.nomeJogador || pedido.nome || 'Viajante';

    const batch = db.batch();

    // Adicionar mutuamente
    batch.update(db.collection('players').doc(uid), {
      [`amigos.${alvoUid}`]:  { nome: nomeAlvo, ts: Date.now() },
      pedidosAmizade: pedidos.filter(p => p.de !== alvoUid),
    });
    batch.update(db.collection('players').doc(alvoUid), {
      [`amigos.${uid}`]: { nome: meuNome, ts: Date.now() },
    });

    await batch.commit();
    return res.status(200).json({ ok: true, nomeAlvo });
  } catch (err) {
    console.error('[amigos/aceitar]', err);
    return res.status(500).json({ erro: 'Erro ao aceitar pedido.' });
  }
}

// ── Recusar pedido ────────────────────────────────────────────
async function handleRecusar(req, res, db, uid, alvoUid) {
  try {
    const snap = await db.collection('players').doc(uid).get();
    const data = snap.exists ? snap.data() : {};
    const novos = (data.pedidosAmizade || []).filter(p => p.de !== alvoUid);
    await db.collection('players').doc(uid).update({ pedidosAmizade: novos });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[amigos/recusar]', err);
    return res.status(500).json({ erro: 'Erro ao recusar pedido.' });
  }
}

// ── Remover amigo ─────────────────────────────────────────────
async function handleRemover(req, res, db, uid, alvoUid) {
  try {
    const batch = db.batch();
    batch.update(db.collection('players').doc(uid),     { [`amigos.${alvoUid}`]: FieldValue.delete() });
    batch.update(db.collection('players').doc(alvoUid), { [`amigos.${uid}`]:     FieldValue.delete() });
    await batch.commit();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[amigos/remover]', err);
    return res.status(500).json({ erro: 'Erro ao remover amigo.' });
  }
}

// ── Executar visita ───────────────────────────────────────────
async function handleVisitar(req, res, db, uid, alvoUid, tipo, alvoSlot) {
  if (!TIPO_VITAL[tipo]) return res.status(400).json({ erro: 'tipo inválido' });
  const vitalField = TIPO_VITAL[tipo];

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const [mySnap, targetSnap] = await Promise.all([
        tx.get(db.collection('players').doc(uid)),
        tx.get(db.collection('players').doc(alvoUid)),
      ]);

      if (!mySnap.exists)     throw new Error('Jogador não encontrado.');
      if (!targetSnap.exists) throw new Error('Amigo não encontrado.');

      const myData     = mySnap.data();
      const targetData = targetSnap.data();

      // Validar amizade (bilateral)
      if (!myData.amigos?.[alvoUid]) throw new Error('Não são amigos.');

      // Validar cooldown por botão
      const visitasLog  = myData.visitasLog || {};
      const myCooldowns = (visitasLog[alvoUid]) || {};
      const lastVisita   = myCooldowns[tipo] || 0;
      if (Date.now() - lastVisita < COOLDOWN_MS) {
        const restante = Math.ceil((COOLDOWN_MS - (Date.now() - lastVisita)) / 60000);
        throw new Error(`Aguarda mais ${restante} min para ${tipo} de novo.`);
      }

      // Validar limite global de interações nas últimas 8h
      const agora = Date.now();
      let totalInteracoes = 0;
      for (const amigoUid of Object.keys(visitasLog)) {
        const amigoLog = visitasLog[amigoUid] || {};
        for (const t of Object.keys(amigoLog)) {
          if (agora - (amigoLog[t] || 0) < COOLDOWN_MS) totalInteracoes++;
        }
      }
      if (totalInteracoes >= MAX_VISITAS) {
        throw new Error(`Limite de ${MAX_VISITAS} interações por 8h atingido.`);
      }

      const moedas = myData.gs?.moedas ?? myData.moedas ?? 0;;

      /* ── A QUEM SE LEVA ──

         Era sempre o avatar "activo" do amigo. Agora é o que o
         visitante escolheu, e o servidor só confirma que ele existe e
         está vivo — quem escolhe é quem visita.

         Sem escolha, vale o primeiro vivo: um cliente antigo continua a
         funcionar, e leva a comida a alguém em vez de falhar.

         O COOLDOWN NÃO MUDA: continua por amigo e por acção, e não por
         avatar. Poder ajudar cada bicho de um amigo com dez seria
         multiplicar por dez o que a visita rende, e isso é conversa da
         economia — aqui só se mudou QUEM recebe, não quanto se dá. */
      const slots   = targetData.avatarSlots || [];
      const pedido  = Number(alvoSlot);
      const slotIdx = Number.isInteger(pedido) && pedido >= 0
        ? pedido
        : slots.findIndex(s => s && s.hatched && !s.dead);
      const slot    = slots[slotIdx];
      if (!slot?.hatched || slot?.dead) throw new Error('Esse avatar não está disponível.');

      // Validar que o vital não está já no máximo
      const vitalAtual = slot.vitals?.[vitalField] ?? 100;
      if (vitalAtual >= 100) throw new Error(`${vitalField} já está no máximo.`);

      // Calcular novos vitals do alvo (capped a 100)
      const novoVital  = Math.min(100, vitalAtual + VITAL_BOOST);

      // Actualizar slot do alvo em memória e escrever array completo
      const newSlots = slots.map((s, i) => {
        if (i !== slotIdx || !s) return s;
        return { ...s, vitals: { ...(s.vitals || {}), [vitalField]: novoVital } };
      });

      // Recompensar visitante
      const novasMoedas = moedas + MOEDAS_VISITA;

      // ── E O OUTRO LADO ──
      // Até aqui a visita só corria num sentido: o visitante ganhava, o
      // visitado via um medidor subir sem nunca saber porquê nem por
      // quem. Agora leva vínculo e fica com o recado, que o jogo lhe
      // entrega quando voltar (ver inboxVisitas em js/firebase.js).
      /* Quem visitou. Era o nome do avatar que o visitante tivesse
         aberto — e desde que os avatares chegam por baptizar, isso era
         quase sempre vazio. Quem visita é a PESSOA, e a pessoa tem
         nome desde a primeira entrada (js/identidade.js). */
      const meuNome = myData.nomeJogador || 'Viajante';

      const slotsComVinculo = newSlots.map((sl, i) => {
        if (i !== slotIdx || !sl) return sl;
        return { ...sl, vinculo: (sl.vinculo || 0) + VINCULO_VISITADO };
      });

      // Aparado no servidor: o cliente consome e limpa, mas se alguém
      // nunca voltar isto não pode crescer sem fim dentro do documento.
      const inboxAtual = Array.isArray(targetData.inboxVisitas) ? targetData.inboxVisitas : [];
      const inboxNovo  = inboxAtual.concat([{
        de: uid, nome: meuNome, tipo, vinculo: VINCULO_VISITADO, quando: Date.now(),
      }]).slice(-MAX_INBOX_VISITAS);

      tx.update(db.collection('players').doc(uid), {
        'gs.moedas':                        novasMoedas,
        [`visitasLog.${alvoUid}.${tipo}`]:  Date.now(),
      });
      tx.update(db.collection('players').doc(alvoUid), {
        avatarSlots:   slotsComVinculo,
        inboxVisitas:  inboxNovo,
      });

      return { novasMoedas, xpGanho: XP_VISITA, novoVital };
    });

    return res.status(200).json({ ok: true, ...resultado });
  } catch (err) {
    console.error('[amigos/visitar]', err.message);
    return res.status(400).json({ erro: err.message });
  }
}
