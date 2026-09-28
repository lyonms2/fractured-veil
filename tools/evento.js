#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   OS EVENTOS — criar, ver e encerrar

     node tools/evento.js                      o que está a correr agora
     node tools/evento.js criar  <opções>      abre um evento
     node tools/evento.js encerrar             fecha o que estiver aberto

   Exemplos:

     node tools/evento.js criar --nome "Chuva de Estrelas" --xp 2 --dias 3
     node tools/evento.js criar --nome "Feira" --moedas 1.5 --horas 48 \
                                --en "Fair" --nota "Tudo rende mais"
     node tools/evento.js criar --nome "Véspera" --xp 2 --moedas 2 \
                                --comeca "2026-12-31 21:00" --dias 1

   ── POR QUE É UMA FERRAMENTA E NÃO UMA TELA ──

   O evento vive em `config/evento`, que o cliente LÊ e não escreve
   (firestore.rules). É essa a segurança dele: não há pedido do jogador
   para validar, porque o jogador não pede nada. Uma tela de
   administração dentro do jogo precisaria de uma rota que escrevesse
   ali, e essa rota seria a primeira coisa que alguém tentaria forçar.

   Quem escreve é quem tem as credenciais de admin, na própria máquina.

   ── AS CREDENCIAIS ──

   As mesmas do tools/abastecer-pool.js, no ambiente:

     FIREBASE_PROJECT_ID
     FIREBASE_CLIENT_EMAIL
     FIREBASE_PRIVATE_KEY

   Com FIRESTORE_EMULATOR_HOST definido, fala com o emulador e não pede
   credencial nenhuma — é assim que se ensaia um evento sem tocar em
   produção.
   ═══════════════════════════════════════════════════════════════════ */
const path = require('path');
const EV = require(path.join(__dirname, '..', 'js', 'eventos.js'));

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const NO_EMULADOR = !!process.env.FIRESTORE_EMULATOR_HOST;

function iniciar() {
  if (getApps().length) return;
  if (NO_EMULADOR) {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-teste' });
    return;
  }
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error('Faltam FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.');
    console.error('(ou defina FIRESTORE_EMULATOR_HOST para ensaiar contra o emulador)');
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId:   FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey:  FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// ── os argumentos, sem biblioteca ───────────────────────────────────
function opcoes(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const chave = argv[i].slice(2);
    const val = (argv[i + 1] && !argv[i + 1].startsWith('--')) ? argv[++i] : 'sim';
    o[chave] = val;
  }
  return o;
}

/* "2026-12-31 21:00" na hora de quem escreve, e não em UTC: quem marca
   um evento para as nove da noite quer as nove da noite dele. */
function quando(texto) {
  if (!texto) return Date.now();
  const t = Date.parse(texto.replace(' ', 'T'));
  if (!Number.isFinite(t)) {
    console.error(`Não entendi a data "${texto}". Use algo como 2026-12-31 21:00.`);
    process.exit(1);
  }
  return t;
}

const fmt = (ms) => new Date(ms).toLocaleString('pt-BR');

/* O dia como quem marca o evento o vê, e não em UTC: um evento
   marcado para as dez da noite de 27 ganhava um id a dizer 28, e a
   primeira pessoa a procurá-lo no registro procurava no dia errado. */
function diaLocal(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function duracao(ms) {
  const h = Math.floor(ms / 3600000), m = Math.round((ms % 3600000) / 60000);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d} dia(s) e ${h % 24} h`;
  return h >= 1 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

function mostrar(doc, agora) {
  if (!doc) { console.log('Não há evento nenhum em config/evento.'); return; }
  const ativo = EV.eventoAtivo(doc, agora);
  console.log('── ' + EV.eventoTexto(doc, 'nome', 'pt') + ' ──');
  console.log('id       :', doc.id);
  console.log('começa   :', fmt(doc.comeca));
  console.log('acaba    :', fmt(doc.acaba));
  console.log('bônus    :', Object.entries(doc.bonus || {}).map(([k, v]) => `${k} ×${v}`).join(' · ') || '(nenhum)');
  console.log('agora    :', ativo ? `A CORRER · faltam ${duracao(EV.eventoRestante(doc, agora))}`
            : agora < doc.comeca ? `ainda não começou · daqui a ${duracao(doc.comeca - agora)}`
            : 'já acabou');
}

// ═══════════════════════════════════════════════════════════════════
async function main() {
  const [, , comando, ...resto] = process.argv;
  const o = opcoes(resto);

  iniciar();
  const db = getFirestore();
  const ref = db.collection('config').doc('evento');
  const agora = Date.now();

  if (!comando || comando === 'ver') {
    const snap = await ref.get();
    mostrar(snap.exists ? snap.data() : null, agora);
    return;
  }

  if (comando === 'encerrar') {
    const snap = await ref.get();
    if (!snap.exists) { console.log('Não há evento para encerrar.'); return; }
    const doc = snap.data();
    if (!EV.eventoAtivo(doc, agora)) {
      console.log('O evento guardado já não está a correr. Nada a fazer.');
      mostrar(doc, agora);
      return;
    }
    /* Encerrar é pôr o FIM no instante de agora, e não apagar o
       documento: o registro de que houve um evento, e de quando, é a
       única forma de explicar depois porque é que uma semana rendeu
       mais do que as outras. */
    await ref.update({ acaba: agora, encerradoEm: agora });
    console.log('Encerrado agora. O que ficou:');
    mostrar(Object.assign({}, doc, { acaba: agora }), agora + 1);
    return;
  }

  if (comando !== 'criar') {
    console.error(`Não conheço "${comando}". Use: ver, criar ou encerrar.`);
    process.exit(1);
  }

  // ── criar ─────────────────────────────────────────────────────────
  if (!o.nome) { console.error('Falta --nome "O nome do evento".'); process.exit(1); }

  const comeca = quando(o.comeca);
  const horas = Number(o.horas) || (Number(o.dias) || 0) * 24;
  if (!horas) { console.error('Falta --dias N ou --horas N.'); process.exit(1); }
  const acaba = comeca + horas * 3600000;

  const bonus = {};
  for (const k of EV.EVENTO_BONUS) {
    if (o[k] === undefined) continue;
    const v = Number(o[k]);
    if (!Number.isFinite(v) || v <= 1) {
      console.error(`--${k} tem de ser um número maior que 1 (recebi "${o[k]}").`);
      process.exit(1);
    }
    if (v > EV.EVENTO_MULT_MAX) {
      console.error(`--${k} ${v} passa do teto de ${EV.EVENTO_MULT_MAX}× (js/eventos.js).`);
      process.exit(1);
    }
    bonus[k] = v;
  }
  /* Um evento sem bônus nenhum é um cartaz: aparece na tela, promete uma
     festa e não muda nada. Ou tem efeito, ou não se cria. */
  if (!Object.keys(bonus).length) {
    console.error('Um evento precisa de pelo menos um bônus: ' +
                  EV.EVENTO_BONUS.map(b => '--' + b + ' 2').join('  ou  '));
    process.exit(1);
  }

  const doc = {
    id: o.id || (o.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
                 .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                 + '-' + diaLocal(comeca)),
    nome: { pt: o.nome, en: o.en || o.nome },
    nota: { pt: o.nota || '', en: o['nota-en'] || o.nota || '' },
    comeca, acaba, bonus,
    criadoEm: agora,
  };

  const antes = await ref.get();
  if (antes.exists && EV.eventoAtivo(antes.data(), agora)) {
    console.log('ATENÇÃO: já há um evento a correr, e criar este apaga-o.');
    mostrar(antes.data(), agora);
    console.log();
    if (!o.forcar) {
      console.error('Se é mesmo isso que quer, repita com --forcar.');
      process.exit(1);
    }
  }

  await ref.set(doc);
  console.log('Criado.' + (NO_EMULADOR ? ' (no EMULADOR)' : ''));
  mostrar(doc, agora);
}

main().catch(e => { console.error(e && e.message || e); process.exitCode = 1; });
