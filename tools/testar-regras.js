// Testa as regras contra o emulador, pela REST API.
// O set(data,{merge:true}) do SDK vira um patch com updateMask nos
// CAMINHOS-FOLHA — 'gs.moedas', não 'gs'. É isso que faz o mapa encaixado
// fundir-se em vez de ser substituído, e é disso que a regra depende.
// Por isso o teste usa updateMask com folhas: reproduz o SDK de verdade.
const HOST = 'http://127.0.0.1:8512';
const PROJ = 'demo-teste';
const BASE = `${HOST}/v1/projects/${PROJ}/databases/(default)/documents`;

const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(uid) {
  const agora = Math.floor(Date.now()/1000);
  return [b64({alg:'none',typ:'JWT'}),
          b64({iss:`https://securetoken.google.com/${PROJ}`, aud:PROJ, sub:uid,
               user_id:uid, iat:agora, exp:agora+3600, auth_time:agora,
               firebase:{identities:{}, sign_in_provider:'custom'}}), ''].join('.');
}
const v = x => typeof x==='number' ? {integerValue:String(x)}
             : x===null ? {nullValue:null}
             : typeof x==='object' ? {mapValue:{fields:Object.fromEntries(Object.entries(x).map(([k,y])=>[k,v(y)]))}}
             : {stringValue:String(x)};

async function escrever(uid, doc, campos, comoAdmin=false) {
  const mask = Object.keys(campos).map(k=>`updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const fields = {};
  for (const [k,val] of Object.entries(campos)) {
    const partes = k.split('.');
    let alvo = fields;
    for (let i=0;i<partes.length-1;i++){
      alvo[partes[i]] = alvo[partes[i]] || {mapValue:{fields:{}}};
      alvo = alvo[partes[i]].mapValue.fields;
    }
    alvo[partes[partes.length-1]] = v(val);
  }
  const r = await fetch(`${BASE}/players/${doc}?${mask}`, {
    method:'PATCH',
    headers:{'Content-Type':'application/json',
             Authorization:`Bearer ${comoAdmin?'owner':token(uid)}`},
    body: JSON.stringify({fields}) });
  return r.status;
}
async function apagar(uid, doc) {
  const r = await fetch(`${BASE}/players/${doc}`, {method:'DELETE',
    headers:{Authorization:`Bearer ${token(uid)}`}});
  return r.status;
}
async function ler(doc) {
  const r = await fetch(`${BASE}/players/${doc}`, {headers:{Authorization:'Bearer owner'}});
  return r.ok ? (await r.json()).fields : null;
}

(async () => {
  const R = [];
  const ok = (n,got,esperado) => R.push(`${got===esperado?'✓':'✗ FALHOU'}  ${n}  (http ${got}, esperava ${esperado})`);

  // conta nova: pode nascer, mas sem saldo
  ok('conta nova com gs limpo',        await escrever('A','A',{'gs.moedas':200,'gs.equipa':null}), 200);
  ok('conta nova a dar-se cristais',   await escrever('B','B',{'gs.cristais':9999}), 403);
  ok('conta nova a dar-se resgateLog', await escrever('C','C',{'resgateLog':'x'}), 403);

  // um jogador com saldo verdadeiro, posto pelo servidor
  await escrever(null,'D',{'gs.moedas':100,'gs.cristais':50,'resgateLog':'hoje','carteira':'0xabc'}, true);

  // o jogo a gravar normalmente
  ok('gravar moedas ganhas no jogo',   await escrever('D','D',{'gs.moedas':150}), 200);
  ok('gravar lastSeen',                await escrever('D','D',{'lastSeen':123}), 200);

  // e agora o exploit
  ok('EXPLOIT forjar cristais',        await escrever('D','D',{'gs.cristais':999999}), 403);
  ok('EXPLOIT apagar o resgateLog',    await escrever('D','D',{'resgateLog':null}), 403);
  ok('EXPLOIT zerar o cambioLog',      await escrever('D','D',{'cambioLog':null}), 403);
  ok('EXPLOIT forjar extraSlots',      await escrever('D','D',{'gs.extraSlots':10}), 403);
  ok('EXPLOIT recuar o ultimoResgate', await escrever('D','D',{'ultimoResgate':0}), 403);
  ok('EXPLOIT apagar e recriar',       await apagar('D','D'), 403);
  ok('EXPLOIT escrever noutro jogador',await escrever('A','D',{'gs.moedas':1}), 403);

  // ── inboxEggs: encher está fechado, esvaziar não ──
  const ovo = r => ({id:'e1', raridade:r, elemento:'Fogo', expiraEm: Date.now()+9e8});
  await escrever(null,'E',{'inboxEggs':[ovo('Comum')],'gs.moedas':10}, true);
  const arr = campos => escrever('E','E',campos);
  ok('EXPLOIT injetar ovo Lendário',  await arr({'inboxEggs':[ovo('Comum'),ovo('Lendário')]}), 403);
  ok('EXPLOIT encher o inbox',        await arr({'inboxEggs':[ovo('Lendário'),ovo('Lendário'),ovo('Lendário')]}), 403);
  ok('esvaziar depois de consumir',   await arr({'inboxEggs':[]}), 200);
  ok('conta nova com inbox cheio',    await escrever('F','F',{'inboxEggs':[ovo('Lendário')]}), 403);

  // ── ovosEmitidos: é a prova, o cliente não lhe toca ──
  await escrever(null,'G',{'ovosEmitidos.o111':'Comum','gs.moedas':10}, true);
  ok('EXPLOIT forjar ovosEmitidos',   await escrever('G','G',{'ovosEmitidos.o111':'Lendário'}), 403);
  ok('EXPLOIT criar ovosEmitidos',    await escrever('G','G',{'ovosEmitidos.o222':'Lendário'}), 403);
  ok('conta nova com ovosEmitidos',   await escrever('H','H',{'ovosEmitidos.o1':'Lendário'}), 403);

  // o saldo sobreviveu a tudo?
  const d = await ler('D');
  R.push(`\ncristais depois de tudo: ${d?.gs?.mapValue?.fields?.cristais?.integerValue}  (tem de ser 50)`);
  R.push(`moedas depois de tudo:   ${d?.gs?.mapValue?.fields?.moedas?.integerValue}  (tem de ser 150)`);
  R.push(`resgateLog:              ${d?.resgateLog?.stringValue}  (tem de ser hoje)`);
  console.log(R.join('\n'));
})();
