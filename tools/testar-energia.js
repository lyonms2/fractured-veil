/* ═══════════════════════════════════════════════════════════════════
   AS REGRAS DA ENERGIA

     node tools/testar-energia.js

   Três perguntas, e a terceira é a que ninguém costuma fazer:

     1. O descanso com o mundo parado dá as contas certas?
        (js/energia.js roda em Node, então isto se testa de verdade)

     2. As constantes de energia espalhadas pelo jogo continuam nos
        valores que o desenho pede? São oito, em quatro arquivos, e
        nenhuma delas tem quem a defenda.

     3. O MANUAL diz os mesmos números? Ele promete valores exatos, e a
        partir do momento em que promete, uma mudança de balanço que
        ninguém copie para lá transforma a página em mentira. Este teste
        é o que grita quando isso acontece.

   As de 2 e 3 não podem ser importadas: vivem em arquivos de navegador
   que mexem na tela e em vinte globais. Lê-se o fonte e tira-se o
   número de lá — feio, e ainda assim melhor do que não conferir.
   ═══════════════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ler  = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');

const E = require(path.join(RAIZ, 'js', 'energia.js'));

let passaram = 0;
const falhas = [];

function conferir(nome, obtido, esperado) {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a === b) { passaram++; return; }
  falhas.push(`${nome}\n      esperado ${b}\n      obtido   ${a}`);
}

/* Uma constante escrita no fonte, pelo nome. Aceita `const X = 10;` e
   `X: 10` e `X = 10,` — as três formas em que estas vivem. */
function constante(arquivo, nome) {
  const m = new RegExp(`${nome}\\s*[:=]\\s*(-?[0-9.]+)`).exec(ler(arquivo));
  return m ? Number(m[1]) : null;
}

// ═══════════════════════════════════════════════════════════════════
// 1. O DESCANSO COM O MUNDO PARADO
// ═══════════════════════════════════════════════════════════════════
console.log('── o mundo parado ──');

conferir('dormindo, 10 ciclos: +2 cada',
  E.descansoParado(50, true, 10, 1),
  { energia: 70, dormindo: true, ganho: 20, acordou: false });

conferir('acordado, 10 ciclos: +1 cada',
  E.descansoParado(50, false, 10, 1),
  { energia: 60, dormindo: false, ganho: 10, acordou: false });

conferir('o Amuleto do Sono dobra quem dorme',
  E.descansoParado(50, true, 10, 2),
  { energia: 90, dormindo: true, ganho: 40, acordou: false });

conferir('o Amuleto do Sono NAO vale acordado',
  E.descansoParado(50, false, 10, 2),
  { energia: 60, dormindo: false, ganho: 10, acordou: false });

conferir('nao passa de 100, e acorda quem encheu dormindo',
  E.descansoParado(90, true, 50, 1),
  { energia: 100, dormindo: false, ganho: 10, acordou: true });

conferir('acordado que enche nao "acorda"',
  E.descansoParado(95, false, 50, 1),
  { energia: 100, dormindo: false, ganho: 5, acordou: false });

conferir('ja cheio: nada acontece',
  E.descansoParado(100, false, 999, 1),
  { energia: 100, dormindo: false, ganho: 0, acordou: false });

conferir('cheio dormindo: acorda sem ganhar nada',
  E.descansoParado(100, true, 5, 1),
  { energia: 100, dormindo: false, ganho: 0, acordou: false });

conferir('zero ciclos nao mexe em nada',
  E.descansoParado(42, true, 0, 1),
  { energia: 42, dormindo: true, ganho: 0, acordou: false });

conferir('relogio que andou para tras nao tira energia',
  E.descansoParado(42, false, -600, 1),
  { energia: 42, dormindo: false, ganho: 0, acordou: false });

conferir('lixo no lugar dos ciclos nao quebra',
  E.descansoParado(42, false, NaN, 1),
  { energia: 42, dormindo: false, ganho: 0, acordou: false });

// Os ciclos são inteiros: meio ciclo parado não rende meia energia.
conferir('59 s nao fecha um ciclo', E.ciclosDe(59 * 1000), 0);
conferir('60 s fecha um',           E.ciclosDe(60 * 1000), 1);
conferir('119 s ainda e um',        E.ciclosDe(119 * 1000), 1);
conferir('uma hora sao 60',         E.ciclosDe(3600 * 1000), 60);
conferir('tempo negativo e zero',   E.ciclosDe(-99999), 0);

/* Do zero ao cheio: é a conta que decide se dormir continua valendo a
   pena. Se o acordado enchesse tão rápido quanto o adormecido, mandar
   dormir viraria enfeite. */
const doZeroAcordado = 100 / E.energiaPorCicloParado(false, 1);
const doZeroDormindo = 100 / E.energiaPorCicloParado(true, 1);
conferir('parado acordado: 100 minutos do zero ao cheio', doZeroAcordado, 100);
conferir('parado dormindo: 50 minutos',                   doZeroDormindo, 50);
conferir('dormir rende o dobro de estar parado acordado',
  doZeroAcordado / doZeroDormindo, 2);

/* O multiplicador do sono é o item vezes o DNA, e vale só a dormir. Um
   avatar com sleepEnergy 1,5 e o Amuleto (2x) recupera 2 x 3 = 6 por
   ciclo parado; acordado continua no 1, tenha o que tiver. */
conferir('DNA e amuleto multiplicam-se no sono',
  E.energiaPorCicloParado(true, 1.5 * 2), 6);
conferir('e nao tocam em quem esta acordado',
  E.energiaPorCicloParado(false, 1.5 * 2), 1);
conferir('multiplicador ausente vale 1',
  E.energiaPorCicloParado(true, 0), E.PARADO_ENERGIA_DORMINDO);

// ═══════════════════════════════════════════════════════════════════
// 2. AS CONSTANTES ESPALHADAS
// ═══════════════════════════════════════════════════════════════════
console.log('── as constantes do jogo ──');

conferir('banho custa 15',              constante('js/state.js', 'BANHO_ENERGIA'), 15);
conferir('sono offline: 2 por ciclo',   constante('js/state.js', 'OFFLINE_SLEEP_ENERGY_PER_CYCLE'), 2);
conferir('PvE cobra 10',                constante('js/pve-fu.js', 'PVE_ENERGIA_CUSTO'), 10);
conferir('PvE desistir custa 4',        constante('js/pve-fu.js', 'PVE_ENERGIA_DESISTIR'), 4);
conferir('PvE pede 20 para entrar',     constante('js/pve-fu.js', 'PVE_ENERGIA_MINIMA'), 20);
conferir('PvP cobra 10',                constante('js/pvp-regras.js', 'PVP_ENERGIA_CUSTO'), 10);
conferir('PvP desistir custa 4',        constante('js/pvp-regras.js', 'PVP_ENERGIA_DESISTIR'), 4);
conferir('PvP pede 20 para entrar',     constante('js/pvp-regras.js', 'PVP_ENERGIA_MINIMA'), 20);
conferir('Folego de Combate: 0,6',      constante('js/state.js', 'battleEnergyMult'), 0.6);
conferir('Amuleto do Sono: 2',          constante('js/state.js', 'sleepEnergyMult'), 2.0);

/* O PvE e o PvP cobram o mesmo, e isso é desenho e não coincidência: a
   batalha custa o mesmo seja contra quem for. Se um dia divergirem, que
   seja por decisão e não por descuido. */
conferir('PvE e PvP cobram o mesmo',
  constante('js/pve-fu.js', 'PVE_ENERGIA_CUSTO') === constante('js/pvp-regras.js', 'PVP_ENERGIA_CUSTO'), true);

/* O gametick não guarda estes em constantes — estão na conta, dentro do
   tick. Lê-se a linha inteira, que é o que há. */
const tick = ler('js/gametick.js');
conferir('dormindo ao vivo: +4 por ciclo',
  /vitals\.energia\s*=\s*Math\.min\(100,\s*vitals\.energia\s*\+\s*\(4\s*\*/.test(tick), true);
conferir('acordado ao vivo: -0,6 por ciclo',
  /vitals\.energia\s*=\s*Math\.max\(0,\s*vitals\.energia\s*-\s*\(0\.6\s*\*/.test(tick), true);
conferir('abaixo de 5 dorme sozinho',
  /vitals\.energia\s*<\s*5/.test(tick), true);

/* Ao vivo dormindo rende o dobro de parado dormindo (4 contra 2). Estar
   na tela vendo o bicho dormir tem de valer mais do que fechar a aba,
   senão a melhor forma de jogar é não jogar. */
conferir('ao vivo dormindo rende o dobro de parado dormindo',
  4 / E.PARADO_ENERGIA_DORMINDO, 2);

// ═══════════════════════════════════════════════════════════════════
/* Os tres lugares que aplicam o descanso. Se um deles sair, o jogador
   perde energia num caminho e ganha nos outros dois, e ninguem descobre
   ate reclamarem. */
const main = ler('js/main.js');
conferir('main.js tem a funcao do descanso',  /function descansarMundoParado\(/.test(main), true);
conferir('a volta da aba escondida chama-a',  /_hiddenAt[\s\S]{0,400}descansarMundoParado\(/.test(main), true);
conferir('a despausa chama-a',                /_pausaDesde[\s\S]{0,400}descansarMundoParado\(/.test(main), true);
conferir('a entrada no jogo chama-a',         /descansarMundoParado\([^)]/.test(ler('js/auth.js')), true);
conferir('o index.html carrega o energia.js', /js\/energia\.js/.test(ler('index.html')), true);

/* O sono parado usa os mesmos dois fatores do sono ao vivo: o item e o
   DNA. Estiveram a divergir — parado, o DNA nao contava. */
conferir('o descanso parado le o DNA',        /passivoDe\(quem\)\.sleepEnergy/.test(main), true);
conferir('e le o Amuleto do Sono',            /getItemEffect\('sleepEnergyMult'\)/.test(main), true);

// 3. O MANUAL DIZ O MESMO?
// ═══════════════════════════════════════════════════════════════════
console.log('── o manual contra o codigo ──');

const manual = ler('manual.html');
/* Uma forma por lingua, e cada uma e um teste. A primeira versao disto
   aceitava QUALQUER uma das formas: bastava o ingles estar certo para o
   portugues poder mentir a vontade. Descoberto mudando o manual de
   proposito e vendo o teste passar na mesma — um teste que nao falha
   quando se quebra o que ele testa nao e um teste, e enfeite. */
const noManual = (o_que, pt, en) => {
  conferir('o manual (pt) diz: ' + o_que, manual.includes(pt), true);
  if (en) conferir('o manual (en) diz: ' + o_que, manual.includes(en), true);
};

// Variantes da MESMA lingua (virgula ou ponto decimal): uma basta.
const noManualQualquer = (o_que, ...formas) =>
  conferir('o manual diz: ' + o_que, formas.some(f => manual.includes(f)), true);

noManualQualquer('banho custa 15',    '15 ⚡');
noManual('dormindo ao vivo, +4',      '+4 de energia por ciclo', '+4 energy per cycle');
noManualQualquer('acordado, -0,6',    '&minus;0,6', '&minus;0.6');
noManual('PvE cobra 10 por avatar',   '10 ⚡ de cada um dos três', '10 ⚡ from each of the three');
noManualQualquer('Folego baixa para 6', '6 ⚡');
noManualQualquer('PvP pede 20',       '20 ⚡');
noManualQualquer('desistir custa 4',  '4 ⚡');
noManual('abaixo de 5 dorme sozinho', 'abaixo de 5, ele dorme sozinho', 'Below 5 energy it falls asleep');
noManual('parado dormindo, +2',      '+2 por ciclo', '+2 per cycle');
noManual('parado acordado, +1',      '+1 por ciclo', '+1 per cycle');
noManual('os numeros sao a base',    'Esses números são a base', 'These are base numbers');

// ═══════════════════════════════════════════════════════════════════
console.log();
if (falhas.length) {
  console.log(`${passaram} passaram · ${falhas.length} falharam\n`);
  falhas.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exitCode = 1;
} else {
  console.log(`${passaram} passaram · 0 falharam`);
}
