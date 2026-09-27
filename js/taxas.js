/* ═══════════════════════════════════════════════════════════════════
   AS TAXAS DO JOGO

   Todas num lugar só, e por um motivo que já custou caro aqui: o 1% do
   resgate vivia em TRÊS cópias — o DEV_FEE_RATE do api/resgatar.js e
   dois `0.01` cravados no js/cristais.js, um na conta que a tela mostra
   antes de sacar e outro na que confere o saldo. Três números que
   precisam concordar e nada que os obrigue a isso. O mesmo valia para o
   TAXA_MARKETPLACE, com uma cópia no servidor e outra no cliente.

   Este arquivo não sabe da tela nem do Firestore: roda no navegador por
   <script> e no servidor por require, e é o mesmo dos dois lados.

   ── O DESENHO, decidido pelo dono do jogo em 27/09/2026 ──

   O desenvolvedor ganhava 1% do que fosse RESGATADO, e mais nada. É a
   receita pendurada no evento mais raro do jogo: só entra quando alguém
   tira dinheiro, nunca quando alguém joga. Medido, com cem jogadores
   sacando 200 💎 por mês, dava dois dólares e meio — e a hospedagem
   custa vinte vezes isso.

   Passa a haver duas fontes, e a segunda é a que importa:

     · o resgate sobe de 1% para 3%, cobrado à parte do saldo de quem
       saca (nunca da pool, e nunca do que ele recebe em POL);

     · a venda no mercado sobe de 10% para 15%, e os 5 pontos novos vão
       para o desenvolvedor. A POOL CONTINUA A RECEBER OS MESMOS 10% de
       antes — o prémio da temporada não encolhe nem um cristal. Quem
       paga a diferença é o vendedor, na transação que já tinha taxa.

   Nenhuma delas toca no lastro: a cotação de 10 💎 por POL não muda nos
   dois sentidos, e nenhum cristal é criado ou destruído por taxa.
   ═══════════════════════════════════════════════════════════════════ */

/* O que o desenvolvedor leva de um resgate, POR CIMA do valor sacado.

   Sacar 100 💎 passa a usar 103 do saldo e a pagar os 10 POL cheios —
   a taxa não sai do que o jogador recebe, sai do que ele tinha. */
const TAXA_RESGATE = 0.03;

/* A venda de um avatar. A soma das duas é o que o vendedor deixa na
   mesa; separadas porque vão para bolsos diferentes e é preciso saber
   dizer qual é qual na página de transparência. */
const TAXA_VENDA_POOL = 0.10;
const TAXA_VENDA_DEV  = 0.05;
/* A soma, arredondada de propósito: 0.10 + 0.05 dá 0.15000000000000002
   em ponto flutuante, e esse número chegaria a uma tela no dia em que
   alguém o multiplicasse por cem para escrever "15%". As contas de
   cristais não sofrem — cada fatia é arredondada à parte —, mas o
   número em si não pode sair daqui torto. */
const TAXA_VENDA      = +(TAXA_VENDA_POOL + TAXA_VENDA_DEV).toFixed(4);

/* A taxa de um resgate de `gems`, com duas casas.

   Duas e não zero: com resgates pequenos um arredondamento a inteiro
   dava SEMPRE zero — Math.floor(10 * 0.03) ainda é 0 — e a taxa
   desaparecia justamente nos saques mais comuns. */
function taxaDoResgate(gems) {
  const g = Math.max(0, Number(gems) || 0);
  return +(g * TAXA_RESGATE).toFixed(2);
}

/* O que uma venda de `preco` reparte.

   Arredonda cada parte para baixo e dá a diferença ao VENDEDOR, que é
   quem está a perder as duas. Sem isso, um preço ímpar fazia sumir um
   cristal entre as contas — e um cristal que some é lastro sem dono. */
function taxasDaVenda(preco) {
  const p = Math.max(0, Math.floor(Number(preco) || 0));
  const pool = Math.floor(p * TAXA_VENDA_POOL);
  const dev  = Math.floor(p * TAXA_VENDA_DEV);
  return { pool, dev, total: pool + dev, vendedor: p - pool - dev };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TAXA_RESGATE, TAXA_VENDA_POOL, TAXA_VENDA_DEV, TAXA_VENDA,
    taxaDoResgate, taxasDaVenda,
  };
}
