// ═══════════════════════════════════════════════════════════════════
// FASE 2 — banco de alvos do motor de combate
//
//   node tools/combate-alvos.js
//
// Corre 5000 batalhas sem interface e confere os seis alvos numéricos
// do plano de execução. Não é carregado pelo jogo: é ferramenta de
// desenvolvimento, para qualquer mexida no equilíbrio ser medida em vez
// de adivinhada.
// ═══════════════════════════════════════════════════════════════════
const fs=require('fs');
const R=require('path').join(__dirname,'..','js')+'/';
const rd=f=>fs.readFileSync(R+f,'utf8').replace(/if \(typeof module[\s\S]*$/m,'');
const g=new Function(`${rd('combate-ficha.js')}\n${rd('combate-efeitos.js')}\n${rd('combate-motor.js')}
  return {combateSimular,fichaDeCombate,poderDoAvatar,COMBATE_CUSTOS};`)();
const ELS=['Fogo','Água','Terra','Vento'],RARS=['Comum','Raro','Lendário'];
let _s=12345; const rnd=()=>(_s=(Math.imul(_s,1664525)+1013904223)>>>0)/4294967296;
const esc=a=>a[Math.floor(rnd()*a.length)];
const av=(el,rar,nv)=>({nome:'x',elemento:el||esc(ELS),raridade:rar||esc(RARS),nivel:nv||1+Math.floor(rnd()*20),seed:Math.floor(rnd()*1e6)});
const eq=(rar,nv)=>[0,1,2].map(()=>av(null,rar,nv));
const N=5000;
const linha=(n,v,alvo,tol,u)=>{const ok=Math.abs(v-alvo)<=tol;
  console.log(`${n.padEnd(34)}${(u==='pp'?v.toFixed(1)+'pp':v.toFixed(1)+(u||'')).padStart(9)}   alvo ${alvo}${u==='pp'?'pp':u||''} ±${tol}   ${ok?'PASSA':'FALHA'}`);return ok;};
console.log(`\n══ FASE 2 · ${N} batalhas por medida ══\n`);
let st=0,mx=0,emp=0,lg=0;
for(let i=0;i<N;i++){const r=g.combateSimular(eq(),eq(),i);st+=r.turnos;mx=Math.max(mx,r.maiorGolpe);
  if(r.vencedor==='empate')emp++; if(r.turnos>=60)lg++;}
const ok=[];
ok.push(linha('1 · Turnos por batalha 3v3',st/N,20,4));
console.log(`2 · Maior golpe                    ${(mx*100).toFixed(1)+'%'.padStart(0)}`.padEnd(45)+`limite 45% rigido   ${mx<=0.4501?'PASSA':'FALHA'}`);ok.push(mx<=0.4501);
console.log(`    batalhas nos 60 turnos: ${lg} (${(lg/N*100).toFixed(1)}%)   empates: ${emp}`);
let dv=0,dd=0;
for(let i=0;i<N;i++){const t=[...ELS].sort(()=>rnd()-.5).slice(0,3),rar=esc(RARS),nv=1+Math.floor(rnd()*20);
  const A=t.map(e=>av(e,rar,nv)),u=esc(ELS),B=[0,1,2].map(()=>av(u,rar,nv));
  const r=g.combateSimular(A,B,i*7+1); if(r.vencedor==='A')dv++;else if(r.vencedor==='B')dd++;}
ok.push(linha('3 · Equipa diversa vs 3 iguais',dv/(dv+dd)*100,55,4,'%'));
let tv=0,td=0;
for(let i=0;i<N;i++){const r=g.combateSimular(eq(),eq(),i*13+5,{trocaA:true,trocaB:false});
  if(r.vencedor==='A')tv++;else if(r.vencedor==='B')td++;}
ok.push(linha('4 · Valor de poder trocar',tv/(tv+td)*100-50,20,6,'pp'));
const w={};ELS.forEach(e=>w[e]={v:0,d:0});
for(let i=0;i<N*3;i++){const rar=esc(RARS),nv=1+Math.floor(rnd()*20),a=esc(ELS),b=esc(ELS);if(a===b)continue;
  const r=g.combateSimular([0,1,2].map(()=>av(a,rar,nv)),[0,1,2].map(()=>av(b,rar,nv)),i*17+3);
  if(r.vencedor==='A'){w[a].v++;w[b].d++;}else if(r.vencedor==='B'){w[b].v++;w[a].d++;}}
const tx=ELS.map(e=>({e,p:w[e].v/((w[e].v+w[e].d)||1)*100})).sort((x,y)=>y.p-x.p);
ok.push(linha('5 · Amplitude entre elementos',tx[0].p-tx[tx.length-1].p,13,5,'pp'));
console.log('    '+tx.map(t=>`${t.e} ${t.p.toFixed(0)}%`).join(' · '));
let ac=0,ct=0;
for(let i=0;i<N;i++){const A=eq(),B=eq();
  const pA=A.reduce((s,a)=>s+g.poderDoAvatar(a.raridade,a.nivel),0),pB=B.reduce((s,a)=>s+g.poderDoAvatar(a.raridade,a.nivel),0);
  if(Math.abs(pA-pB)<1)continue; const r=g.combateSimular(A,B,i*23+9); if(r.vencedor==='empate')continue;
  ct++; if((pA>pB&&r.vencedor==='A')||(pB>pA&&r.vencedor==='B'))ac++;}
ok.push(linha('6 · Poder preve o vencedor',ac/ct*100,85,4,'%'));
let semUlt=new Set();
for(const el of ELS)for(const rar of RARS)for(let s=1;s<400;s+=7){
  const f=g.fichaDeCombate(s,rar,el,1); if(f.enMax<g.COMBATE_CUSTOS[2])semUlt.add(`${el} ${rar}`);}
console.log(`\n7 · Tecto de energia < ${g.COMBATE_CUSTOS[2]}: ${semUlt.size===0?'nenhum — PASSA':[...semUlt].join(', ')+' — FALHA'}`);
console.log(`\n>> ${ok.filter(Boolean).length} de ${ok.length} alvos batidos`);
