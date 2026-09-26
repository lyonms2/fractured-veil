#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O JOGO INTEIRO, LOCAL, CONTRA OS EMULADORES — para testar o PvP com
   dois jogadores de verdade, cada um na sua aba.

     firebase emulators:exec --only firestore,database,auth --project demo-teste "node tools/pvp-local.js"

   Serve o repositório e a /api (cada api/<nome>.js como na Vercel) na
   porta 10230, e semeia três contas com equipe pronta:

     jog1@teste.dev  "Leo Um"    poder 90   amigo de 2 e de 3
     jog2@teste.dev  "Ana Dois"  poder 88   amiga de 1
     jog3@teste.dev  "Rui Três"  poder 91   amigo de 1
     senha de todos: teste123

   Duas abas precisam de duas ORIGENS (o login fica guardado por origem):
     http://localhost:10230/index.html?emu=1
     http://127.0.0.1:10230/index.html?emu=1
   O ?emu=1 faz o index.html ligar-se aos emuladores (só em localhost).

   O firebase-admin não mora no repositório: NODE_PATH para uma pasta
   com ele instalado.
   ═══════════════════════════════════════════════════════════════════ */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PORTA = +(process.env.PORTA_LOCAL || 10230);
const PROJ = 'demo-teste';
const RT = process.env.FIREBASE_DATABASE_EMULATOR_HOST || '127.0.0.1:9477';
process.env.GCLOUD_PROJECT = PROJ;
process.env.FIREBASE_DATABASE_URL = `http://${RT}?ns=${PROJ}-default-rtdb`;

const { initializeApp, getApps } = require('firebase-admin/app');
if (!getApps().length) initializeApp({ projectId: PROJ, databaseURL: process.env.FIREBASE_DATABASE_URL });
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const GEN = require('../api/_genetica.js');
const NOM = require('../js/nomes.js');   // a chave dos nomes tomados

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

// ── as contas ──
async function semear() {
  const db = getFirestore(), auth = getAuth();
  const contas = [
    { uid: 'jog1', email: 'jog1@teste.dev', nome: 'Leo Um',   niveis: [30, 30, 30], amigos: ['jog2', 'jog3'] },
    { uid: 'jog2', email: 'jog2@teste.dev', nome: 'Ana Dois', niveis: [28, 30, 30], amigos: ['jog1'] },
    { uid: 'jog3', email: 'jog3@teste.dev', nome: 'Rui Três', niveis: [30, 30, 31], amigos: ['jog1'] },
  ];
  const nomes = ['Brasa', 'Maré', 'Folha', 'Vulto', 'Cinza', 'Aurora', 'Garoa', 'Seixo', 'Lume'];
  let k = 0;
  for (const c of contas) {
    try { await auth.createUser({ uid: c.uid, email: c.email, password: 'teste123', emailVerified: true }); }
    catch (e) { if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') throw e; }
    const certidoes = {};
    const slots = c.niveis.map((nivel, i) => {
      const cert = GEN.certidaoDeInvocacao({ uid: c.uid, nome: c.nome });
      const id = `${c.uid}_av${i}`;
      certidoes[id] = cert.nascimento;
      return {
        id, nome: `${nomes[k++ % nomes.length]},${c.nome.split(' ')[0]}`, nomeTravado: true,
        raridade: global.fuRaridadeDoNivel(nivel),
        /* SEM `nascimento` no slot, como o jogo grava de verdade: a
           certidão vive no mapa `certidoes` e o cliente reata-a em
           memória (applyGameState). Com ela aqui dentro, o teste não
           reproduzia o que o servidor lê. */
        seed: cert.seed, listed: false, hatched: true, dead: false,
        sick: false, sleeping: false, nivel, xp: 0, vinculo: 40, totalSecs: 3600,
        bornAt: Date.now() - 7 * 86400000, faseVista: 3, nivelVisto: nivel,
        activeDiseases: [], vitals: { fome: 100, humor: 100, energia: 100, saude: 100, higiene: 100 }, items: [],
      };
    });
    const amigos = {};
    for (const a of c.amigos) amigos[a] = { nome: contas.find(x => x.uid === a).nome, ts: Date.now() };
    await db.collection('players').doc(c.uid).set({
      nomeJogador: c.nome, avatarSlots: slots, certidoes, amigos, activeSlotIdx: 0,
      gs: { moedas: 100, equipa: [0, 1, 2], prologoVisto: true }, lastSeen: Date.now(),
    });

    /* OS NOMES TOMADOS. Um nome batizado tem um documento no índice
       (js/nomes.js) — sem isto, o estado semeado ficava diferente do
       que o jogo produz, e testar o batismo aqui dava sempre livre. */
    for (const s of slots) {
      const chave = NOM.nomeChave(s.nome.split(',')[0], 'avatar');
      if (chave) await db.collection('nomes').doc(chave)
        .set({ tipo: 'avatar', nome: s.nome.split(',')[0], uid: c.uid, avatarId: s.id, em: Date.now() });
    }
    const chaveJ = NOM.nomeChave(c.nome, 'jogador');
    if (chaveJ) await db.collection('nomes').doc(chaveJ)
      .set({ tipo: 'jogador', nome: c.nome, uid: c.uid, em: Date.now() });
  }
  console.log('[pvp-local] contas semeadas: jog1, jog2, jog3 (senha teste123)');
}

// ── o servidor ──
function resposta(res) {
  let status = 200;
  return {
    status(s) { status = s; return this; },
    setHeader(k, v) { res.setHeader(k, v); return this; },
    json(j) { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); return this; },
    send(t) { res.writeHead(status); res.end(typeof t === 'string' ? t : JSON.stringify(t)); return this; },
    end(t) { res.writeHead(status); res.end(t); return this; },
  };
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const nome = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
    const arq = path.join(RAIZ, 'api', nome + '.js');
    if (!fs.existsSync(arq)) { res.writeHead(404); return res.end('{}'); }
    let corpo = '';
    req.on('data', c => { corpo += c; });
    req.on('end', async () => {
      let body = {};
      try { body = corpo ? JSON.parse(corpo) : {}; } catch (e) {}
      const q = Object.fromEntries(url.searchParams.entries());
      try { await require(arq)({ method: req.method, query: q, body, headers: req.headers }, resposta(res)); }
      catch (e) { console.error('[api/' + nome + ']', e); if (!res.headersSent) { res.writeHead(500); res.end('{}'); } }
    });
    return;
  }
  let arq = path.join(RAIZ, decodeURIComponent(url.pathname));
  if (!arq.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(arq) && fs.statSync(arq).isDirectory()) arq = path.join(arq, 'index.html');
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream',
                         'Cache-Control': 'no-store' });
    res.end(dados);
  });
});

semear().then(() => servidor.listen(PORTA, () => {
  console.log(`[pvp-local] http://localhost:${PORTA}/index.html?emu=1  e  http://127.0.0.1:${PORTA}/index.html?emu=1`);
})).catch(e => { console.error(e); process.exit(1); });
