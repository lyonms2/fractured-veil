// Testa as regras contra o emulador, pela REST API.
// O set(data,{merge:true}) do SDK vira um patch com updateMask nos
// CAMINHOS-FOLHA — 'gs.moedas', não 'gs'. É isso que faz o mapa encaixado
// fundir-se em vez de ser substituído, e é disso que a regra depende.
// Por isso o teste usa updateMask com folhas: reproduz o SDK de verdade.
const HOST = 'http://127.0.0.1:8477';
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
/* O `ler` de cima entra como dono, para ver o que ficou gravado. Este
   entra como jogador, que é o que a regra tem de recusar. */
async function lerColeccao(col, uid) {
  const r = await fetch(`${BASE}/${col}`, {headers:{Authorization:`Bearer ${token(uid)}`}});
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
  // O balde do bónus é do servidor tal como o dos cristais com lastro.
  // Se o cliente lhe pudesse escrever, o bónus deixava de ser bónus e
  // passava a um campo onde cada um escreve o que quer gastar — e como
  // ele se gasta ANTES dos cristais reais, era a via mais curta para
  // comprar avatares e ovos de graça.
  ok('EXPLOIT forjar cristaisBonus',   await escrever('D','D',{'gs.cristaisBonus':9999}), 403);
  ok('EXPLOIT bónus no topo',          await escrever('D','D',{'cristaisBonus':9999}), 403);
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

  // ── avataresEmitidos: a prova de que um avatar é legítimo ──
  await escrever(null,'I',{'avataresEmitidos.s123':'Comum','gs.moedas':10}, true);
  ok('EXPLOIT promover a Lendário',   await escrever('I','I',{'avataresEmitidos.s123':'Lendário'}), 403);
  ok('EXPLOIT registar avatar novo',  await escrever('I','I',{'avataresEmitidos.s999':'Lendário'}), 403);
  ok('conta nova com avatar emitido', await escrever('J','J',{'avataresEmitidos.s1':'Lendário'}), 403);
  ok('gravar o avatarSlots continua', await escrever('I','I',{'avatarSlots':[]}), 200);

  /* ── certidoes: o DNA de cada avatar ──

     É aqui que vivem o corpo, a índole, a cor, a tendência e o vigor —
     tudo o que dá valor a um avatar. Vivia dentro do avatarSlots, que o
     cliente escreve por inteiro: quem abrisse o console dava a si
     próprio os genes que quisesse.

     Mudou para um campo de topo porque é o que estas regras sabem
     proteger — o avatarSlots é um array, e regras não percorrem arrays. */
  await escrever(null,'K',{'certidoes.av1':{origem:'Comum'},'gs.moedas':10}, true);
  ok('EXPLOIT forjar uma certidão',   await escrever('K','K',{'certidoes.av1':{origem:'Lendário'}}), 403);
  ok('EXPLOIT criar uma certidão',    await escrever('K','K',{'certidoes.av2':{origem:'Lendário'}}), 403);
  ok('EXPLOIT apagar uma certidão',   await escrever('K','K',{'certidoes':{}}), 403);
  ok('conta nova com certidão',       await escrever('L','L',{'certidoes.av1':{origem:'Lendário'}}), 403);

  /* ── invocacoesUsadas: três na vida ──

     Vivia no gs.totalInvocacoes, dentro do documento que o cliente
     escreve por inteiro: pôr o número a zero e invocar outra vez era uma
     linha no console. */
  await escrever(null,'M',{'invocacoesUsadas':3,'gs.moedas':10}, true);
  ok('EXPLOIT zerar as invocações',   await escrever('M','M',{'invocacoesUsadas':0}), 403);
  ok('EXPLOIT recuar as invocações',  await escrever('M','M',{'invocacoesUsadas':2}), 403);
  ok('conta nova já com invocações',  await escrever('N','N',{'invocacoesUsadas':0}), 403);

  /* ── ovos: o DNA do filho ──

     Um ovo É o DNA de quem vai nascer dele, e vale o mesmo que um
     avatar. Vivia dentro do avatarSlots, em slot.eggs: escrevia-se no
     console um ovo do nada, ou os genes de um ovo real à mão.

     O slot.eggs fica a dizer só ONDE está cada ovo — por isso a última
     verificação, que continua a deixar o cliente gravar o avatarSlots. */
  await escrever(null,'O',{'ovos.ov1':{dna:'x'},'gs.moedas':10}, true);
  ok('EXPLOIT forjar o DNA de um ovo', await escrever('O','O',{'ovos.ov1':{dna:'y'}}), 403);
  ok('EXPLOIT inventar um ovo',        await escrever('O','O',{'ovos.ov9':{dna:'y'}}), 403);
  ok('EXPLOIT apagar os ovos',         await escrever('O','O',{'ovos':{}}), 403);
  ok('conta nova já com ovos',         await escrever('P','P',{'ovos.ov1':{dna:'y'}}), 403);

  /* ── donos: o histórico de preços ──

     É o que o comprador olha para decidir quanto pagar, e vivia dentro
     do avatarSlots — o array que o VENDEDOR escreve por inteiro. */
  await escrever(null,'Q',{'donos.av1':[{preco:10}],'gs.moedas':10}, true);
  ok('EXPLOIT inflar o preço passado', await escrever('Q','Q',{'donos.av1':[{preco:9999}]}), 403);
  ok('EXPLOIT inventar um histórico',  await escrever('Q','Q',{'donos.av2':[{preco:9999}]}), 403);
  ok('EXPLOIT apagar o histórico',     await escrever('Q','Q',{'donos':{}}), 403);
  ok('conta nova já com histórico',    await escrever('R','R',{'donos.av1':[{preco:9999}]}), 403);

  /* ── mortos: a morte não anda para trás ──

     O `dead` vive no avatarSlots; pôr `false` num avatar morto
     devolvia-lhe a vida, e com ela o direito de lutar, cruzar e ser
     vendido. */
  await escrever(null,'S',{'mortos.av1':1000,'gs.moedas':10}, true);
  ok('EXPLOIT ressuscitar um avatar',  await escrever('S','S',{'mortos':{}}), 403);
  ok('EXPLOIT apagar uma morte',       await escrever('S','S',{'mortos.av1':null}), 403);
  ok('EXPLOIT matar antes do tempo',   await escrever('S','S',{'mortos.av2':1000}), 403);

  // ── os mercados: o cliente só lê ──
  async function mercado(col, uid, campos) {
    const r = await fetch(`${BASE}/${col}?documentId=teste_${col}_${uid}`, {
      method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token(uid)}`},
      body: JSON.stringify({fields: Object.fromEntries(Object.entries(campos).map(([k,x])=>[k,v(x)]))}) });
    return r.status;
  }
  ok('EXPLOIT listar avatar à mão',   await mercado('avatarMarket','K',{sellerId:'K',raridade:'Lendário',price:9999}), 403);
  ok('EXPLOIT listar ovo à mão',      await mercado('eggMarket','K',{sellerId:'K',raridade:'Lendário',price:9999}), 403);

  /* ── o código de amigo: quem o escreve é o servidor ──

     Escrever o código de outra pessoa no meu documento desviava-lhe os
     pedidos de amizade: quem o ditasse ao amigo, o amigo adicionava-me
     a mim. E a coleção dos códigos é o índice inverso — quem a pudesse
     LER ficava com o código de toda a gente, e a única defesa do
     sistema é o código não se adivinhar. */
  await escrever(null,'T',{'codigoAmigo':'ABC234','gs.moedas':10}, true);
  ok('EXPLOIT trocar o próprio código', await escrever('T','T',{'codigoAmigo':'XYZ789'}), 403);
  ok('EXPLOIT apagar o próprio código', await escrever('T','T',{'codigoAmigo':null}), 403);
  ok('conta nova já com código',        await escrever('U','U',{'codigoAmigo':'ABC234'}), 403);
  ok('EXPLOIT criar um código à mão',   await mercado('codigosAmigo','T',{uid:'T'}), 403);
  ok('EXPLOIT ler a lista de códigos',  await lerColeccao('codigosAmigo','T'), 403);

  // ── indicações: o que o servidor escreve, o cliente não toca ──
  await escrever(null,'L',{'referralEarned':7,'referralCount':2,'gs.moedas':10}, true);
  ok('EXPLOIT inflar ganhos de convite', await escrever('L','L',{'referralEarned':9999}), 403);
  ok('EXPLOIT inflar nº de convidados',  await escrever('L','L',{'referralCount':500}), 403);
  ok('EXPLOIT forjar a cadeia',          await escrever('L','L',{'referralChain':'x'}), 403);
  ok('conta nova já com ganhos',         await escrever('M','M',{'referralEarned':100}), 403);

  // o saldo sobreviveu a tudo?
  const d = await ler('D');
  R.push(`\ncristais depois de tudo: ${d?.gs?.mapValue?.fields?.cristais?.integerValue}  (tem de ser 50)`);
  R.push(`moedas depois de tudo:   ${d?.gs?.mapValue?.fields?.moedas?.integerValue}  (tem de ser 150)`);
  R.push(`resgateLog:              ${d?.resgateLog?.stringValue}  (tem de ser hoje)`);
  console.log(R.join('\n'));
})();
