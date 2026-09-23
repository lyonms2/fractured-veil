#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   O NÍVEL QUE O SERVIDOR RECONHECE — contra os emuladores

   Precisa do jogo local a correr (tools/pvp-local.js), que semeia as
   contas jog1/jog2/jog3:

     firebase emulators:exec --only firestore,database,auth        --project demo-teste "node tools/pvp-local.js && sleep 900"
     node tools/testar-niveis.js

   O que se confere: o primeiro encontro anota o que o slot diz; um save
   editado para o nível 60 não muda o poder da equipa; a rota sobe só o
   que o balde permite; um avatar de outra pessoa é ignorado; quem nasce
   já vem registado no nível 1. As regras em si estão no js/niveis.js.

   O firebase-admin não mora no repositório: NODE_PATH para uma pasta
   com ele instalado.
   ═══════════════════════════════════════════════════════════════════ */
process.env.GCLOUD_PROJECT='demo-teste';
process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8477';
const {initializeApp}=require('firebase-admin/app'); const {getFirestore}=require('firebase-admin/firestore');
initializeApp({projectId:'demo-teste'}); const db=getFirestore();
const AUTH='http://127.0.0.1:9499/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key';
const API='http://127.0.0.1:10230/api';
let falhas=0;
const ok=(c,t)=>{ console.log((c?'  ok   ':'FALHA ')+t); if(!c) falhas++; };

(async()=>{
 const a=await (await fetch(AUTH,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({email:'jog1@teste.dev',password:'teste123',returnSecureToken:true})})).json();
 const tok=a.idToken;
 const pvp=async(acao,extra)=> (await fetch(API+'/pvp',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(Object.assign({acao,idToken:tok},extra||{}))})).json();
 const pool=async(body)=> (await fetch(API+'/pool',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(Object.assign({idToken:tok},body))})).json();
 const doc=async()=> (await db.collection('players').doc('jog1').get()).data();
 const semNiveis=async()=>{ await db.collection('players').doc('jog1').update({niveis:{}}); };
 const porNivel=async(n)=>{ const d=await doc();
   await db.collection('players').doc('jog1').update({avatarSlots: d.avatarSlots.map(s=>({...s,nivel:n}))}); };
 const dorme=ms=>new Promise(r=>setTimeout(r,ms));

 console.log('\n— o primeiro encontro anota o que o slot diz —');
 await semNiveis(); await porNivel(30);
 let r=await pvp('entrar',{}); await dorme(400);
 let d=await doc();
 ok(r.poder===90, 'poder 90 com três avatares de nível 30 (deu '+r.poder+')');
 ok(Object.keys(d.niveis||{}).length===3, 'os três ficaram anotados');
 ok(Object.values(d.niveis||{}).every(x=>x.n===30), 'anotados no 30');
 await pvp('sairFila',{});

 console.log('\n— o save editado não passa: vale o registo —');
 await porNivel(60);
 r=await pvp('entrar',{});
 ok(r.poder===90, 'continua 90 mesmo com o slot a dizer 60 (deu '+r.poder+')');
 await pvp('sairFila',{});

 console.log('\n— a rota sobe degrau a degrau, no ritmo do balde —');
 let p=await pool({acao:'nivel',avatares:[{id:'jog1_av0',nivel:60}]});
 ok(p.ok && p.niveis.jog1_av0===42, 'de 30 para 42 (balde de 12), deu '+(p.niveis||{}).jog1_av0);
 p=await pool({acao:'nivel',avatares:[{id:'jog1_av0',nivel:60}]});
 ok(p.niveis.jog1_av0===42, 'pedir outra vez logo a seguir não sobe mais');
 r=await pvp('entrar',{});
 ok(r.poder===42+30+30, 'o PvP já usa o 42 (poder '+r.poder+')');
 await pvp('sairFila',{});

 console.log('\n— um avatar de outra pessoa não se registra —');
 p=await pool({acao:'nivel',avatares:[{id:'jog2_av0',nivel:50}]});
 ok(p.ok && !p.niveis.jog2_av0, 'o id de outro jogador é ignorado');
 d=await doc();
 ok(!(d.niveis||{}).jog2_av0, 'e não entrou no documento');

 console.log('\n— nascer já vem registado no 1 —');
 const antes=(await doc()).invocacoesUsadas||0;
 const inv=await pool({acao:'invocar',slotIdx:5});
 if (inv.ok) {
   d=await doc();
   ok(d.niveis[inv.id] && d.niveis[inv.id].n===1, 'o invocado nasce com registo no nível 1');
 } else console.log('  (invocar recusou: '+(inv.erro||'?')+' — usadas='+antes+')');

 console.log('\n— o balde enche com o tempo —');
 const N=require('../js/niveis.js');
 let reg={n:30,em:Date.now()-3600000,cred:0};
 const x=N.nivelAceitar(reg,60,Date.now());
 ok(x.reg.n===36, 'uma hora parado no 30 dá seis degraus (deu '+x.reg.n+')');

 console.log(falhas? '\n'+falhas+' FALHA(S)':'\nTudo passou.');
 process.exit(falhas?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
