/* ═══════════════════════════════════════════════════════════════════
   AS TAXAS

     node tools/testar-taxas.js

   Duas perguntas. A primeira é aritmética: as contas fecham, ninguém
   perde um cristal no arredondamento, e as fatias vão para quem devem.

   A segunda é a que interessa mais: AINDA EXISTE UMA CÓPIA SOLTA do
   número em algum lugar? O 1% do resgate chegou a viver em três sítios
   (o servidor e duas contas do js/cristais.js) e a taxa de venda em
   cinco. Números que precisam concordar e nada que os obrigue a isso
   acabam por discordar — e quando discordam, a tela promete uma coisa e
   o servidor cobra outra, que é o defeito mais caro que este jogo já
   teve.

   Por isso este teste lê o FONTE dos arquivos que usam taxas e procura
   décimos escritos à mão onde deviam estar as constantes.
   ═══════════════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler  = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const TX   = require(path.join(RAIZ, 'js', 'taxas.js'));

let passaram = 0;
const falhas = [];
const conferir = (nome, obtido, esperado) => {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) { passaram++; return; }
  falhas.push(`${nome}\n      esperado ${b}\n      obtido   ${a}`);
};

// ═══════════════════════════════════════════════════════════════════
console.log('── o resgate ──');

conferir('3% de 100 são 3',            TX.taxaDoResgate(100), 3);
conferir('3% de 1000 são 30',          TX.taxaDoResgate(1000), 30);
/* O mínimo de resgate é 10 💎. Com arredondamento a inteiro a taxa
   seria zero justamente no saque mais comum — daí as duas casas. */
conferir('no saque mínimo não vira zero', TX.taxaDoResgate(10), 0.3);
conferir('zero não cobra nada',        TX.taxaDoResgate(0), 0);
conferir('negativo não vira crédito',  TX.taxaDoResgate(-500), 0);
conferir('lixo não quebra',            TX.taxaDoResgate('abc'), 0);
conferir('a taxa é sempre menor que o saque',
  [10, 100, 1000, 5000].every(g => TX.taxaDoResgate(g) < g), true);

// ═══════════════════════════════════════════════════════════════════
console.log('── a venda ──');

conferir('500 💎: 425 ao vendedor, 50 à pool, 25 ao dev',
  TX.taxasDaVenda(500), { pool: 50, dev: 25, total: 75, vendedor: 425 });

/* Nenhum cristal pode sumir entre as três fatias: o que some é lastro
   sem dono — POL parado no cofre que já não responde a ninguém. */
conferir('as três fatias somam sempre o preço',
  [1, 7, 99, 100, 333, 999, 1000, 10000].every(p => {
    const v = TX.taxasDaVenda(p);
    return v.pool + v.dev + v.vendedor === p;
  }), true);

/* A sobra do arredondamento vai para o VENDEDOR, que é quem está a
   pagar as duas taxas. */
conferir('preço ímpar: a sobra fica com quem vende',
  TX.taxasDaVenda(999), { pool: 99, dev: 49, total: 148, vendedor: 851 });

conferir('a pool leva o dobro do dev, sempre',
  [200, 1000, 5000].every(p => {
    const v = TX.taxasDaVenda(p);
    return v.pool === v.dev * 2;
  }), true);

conferir('preço pequeno não cobra taxa nenhuma',
  TX.taxasDaVenda(7), { pool: 0, dev: 0, total: 0, vendedor: 7 });
conferir('preço zero',     TX.taxasDaVenda(0),   { pool: 0, dev: 0, total: 0, vendedor: 0 });
conferir('preço negativo', TX.taxasDaVenda(-50), { pool: 0, dev: 0, total: 0, vendedor: 0 });

/* A POOL NÃO PODE PERDER com esta mudança: ela recebia 10% e continua a
   receber 10%. Se um dia alguém mexer na fatia dela, o prémio da
   temporada encolhe sem que ninguém diga nada aos jogadores. */
conferir('a pool continua a receber os 10% de sempre',
  TX.TAXA_VENDA_POOL, 0.10);
conferir('o total da venda é a soma das duas fatias',
  TX.TAXA_VENDA, +(TX.TAXA_VENDA_POOL + TX.TAXA_VENDA_DEV).toFixed(4));
/* E sai limpo: 0.10 + 0.05 dá 0.15000000000000002 em ponto flutuante, e
   esse número chegaria a uma tela no dia em que alguém escrevesse
   `TAXA_VENDA * 100 + '%'`. */
conferir('e sai como 0.15, não como 0.15000000000000002',
  String(TX.TAXA_VENDA), '0.15');
conferir('e dá 15 quando vira porcentagem',
  TX.TAXA_VENDA * 100, 15);

// ═══════════════════════════════════════════════════════════════════
console.log('── e não há cópias soltas ──');

/* Quem tem de ler as taxas do js/taxas.js, e o que não pode mais
   aparecer escrito à mão nesses arquivos. */
const USAM = ['api/resgatar.js', 'api/comprar-avatar.js', 'js/cristais.js', 'js/avatars-market.js'];

for (const arq of USAM) {
  const fonte = ler(arq);
  /* Fora os comentários e a linha dos CONVITES: o l3 dos convites é 1%
     e nada tem a ver com a taxa do dev — sem esta exceção o teste
     acusava o api/resgatar.js de uma cópia que não é cópia. */
  const codigo = fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/REFERRAL_RATES\s*=\s*\{[^}]*\}/g, 'REFERRAL_RATES={}');
  conferir(`${arq} lê o js/taxas.js`,
    /taxas\.js|taxaDoResgate|taxasDaVenda|TX\./.test(codigo), true);
  conferir(`${arq} não tem 0.01 solto`,  /[^.\w]0\.01[^\d]/.test(codigo), false);
  conferir(`${arq} não tem 0.03 solto`,  /[^.\w]0\.03[^\d]/.test(codigo), false);
  conferir(`${arq} não tem 0.10 solto`,  /[^.\w]0\.10[^\d]/.test(codigo), false);
  conferir(`${arq} não tem 0.15 solto`,  /[^.\w]0\.15[^\d]/.test(codigo), false);
}

conferir('o index.html carrega o js/taxas.js', /js\/taxas\.js/.test(ler('index.html')), true);

/* E as telas dizem os mesmos números. A página de transparência é onde
   uma taxa velha faz mais estrago: ela existe para ser acreditada. */
/* Sem os comentários: um deles explica o que a frase dizia ANTES, e o
   teste acusava o próprio aviso de ser a mentira que ele aponta. */
const i18n = ler('js/i18n-marketplace.js')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');
conferir('a tela do resgate anuncia 3%',        /Taxa de 3% cobrada/.test(i18n), true);
conferir('e em inglês também',                  /A 3% fee is charged/.test(i18n), true);
conferir('a transparência anuncia os 3% e os 5%',
  /3% de cada resgate/.test(i18n) && /5% de cada venda/.test(i18n), true);
conferir('e a transparência não promete mais "100% das taxas"',
  /100% das taxas/.test(i18n), false);

// ═══════════════════════════════════════════════════════════════════
console.log();
if (falhas.length) {
  console.log(`${passaram} passaram · ${falhas.length} falharam\n`);
  falhas.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exitCode = 1;
} else {
  console.log(`${passaram} passaram · 0 falharam`);
}
