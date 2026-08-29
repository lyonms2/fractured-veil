const PORTA = process.env.PORTA_RTDB;
const NS    = 'demo-teste-default-rtdb';
const BASE  = `http://127.0.0.1:${PORTA}`;
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const tok = uid => [b64({alg:'none',typ:'JWT'}),
  b64({sub:uid,user_id:uid,iat:(Date.now()/1000|0),exp:(Date.now()/1000|0)+3600,
       provider_id:'anonymous'}),''].join('.');
async function put(caminho, uid, valor) {
  const r = await fetch(`${BASE}/${caminho}.json?ns=${NS}&auth=${tok(uid)}`,
    { method:'PUT', body: JSON.stringify(valor) });
  return r.status;
}
(async () => {
  const R=[]; const ok=(n,g,e)=>R.push(`${g===e?'✓':'✗ FALHOU'}  ${n}  (${g}, esperava ${e})`);
  const bom = u => ({ nome:'Teste', score:22, wallet:u, ts:Date.now() });

  ok('gravar o próprio ranking',   await put('snakeRanking/t2/A','A', bom('A')), 200);
  ok('EXPLOIT ranking de outro',   await put('snakeRanking/t2/B','A', bom('B')), 401);
  ok('EXPLOIT score 999999',       await put('snakeRanking/t2/A','A', {...bom('A'), score:999999}), 401);
  ok('EXPLOIT score negativo',     await put('snakeRanking/t2/A','A', {...bom('A'), score:-5}), 401);
  ok('EXPLOIT score fracionado',   await put('snakeRanking/t2/A','A', {...bom('A'), score:22.5}), 401);
  ok('EXPLOIT wallet de outro',    await put('snakeRanking/t2/A','A', {...bom('A'), wallet:'B'}), 401);
  ok('EXPLOIT campo a mais',       await put('snakeRanking/t2/A','A', {...bom('A'), cristais:9999}), 401);
  ok('presence próprio',           await put('presence/A','A',{lastSeen:1}), 200);
  ok('EXPLOIT presence de outro',  await put('presence/B','A',{lastSeen:1}), 401);
  ok('EXPLOIT arena (já não existe)', await put('arena/ranking/t1/A','A',{pontos:9999}), 401);
  console.log(R.join('\n'));
})();
