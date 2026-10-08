#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   A COR DA FASE SAI DA ESCADA, E NÃO DE UMA CÓPIA DELA

   O mercado escreve a fase de cada avatar e pinta-a. O nome vinha do
   `fuFaseDoNivel` desde a 3J.17A; a cor tinha os seus próprios cortes:

     if (n < 5) … if (n < 11) … if (n < 27) …

   Era a escada escrita uma segunda vez, e já tinha apodrecido uma vez —
   estava nos cortes do motor antigo (5, 10, 17), e por isso um Jovem de
   nível 10 saía com a cor de Adulto. O comentário do js/ficha-fu.js
   conta a mesma história sobre a arena antiga, com um `nv < 10 ? 1 :
   nv < 17 ? 2 : 3` que ficou para trás: um avatar de nível 20 era
   desenhado ancião em combate e adulto na colônia, e nada gritava.

   ── PORQUE ISTO TEM TESTE PRÓPRIO ──

   Porque a divergência destas duas cópias não rebenta: pinta mal. Um
   `if` com o número errado não lança exceção nenhuma, não falha
   nenhuma asserção de desenho, e o avatar continua a aparecer. Só se vê
   olhando — e só se olha quando alguém se queixa.

   O que se guarda aqui:

     A  a cor e o nome concordam, em todos os 60 níveis
     B  as fronteiras estão nos 5, 11 e 27
     C  os valores inválidos continuam a dar a cor do bebê
     D  a função não tem cortes próprios, e a escada não mudou

   Correr:  node tools/testar-fase-cor.js
   ═══════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const NL = String.fromCharCode(10);
const rd = f => fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8')
                  .replace(/if \(typeof module[\s\S]*$/m, '');

/* O js/avatars-market.js inteiro não corre fora do navegador — mexe na
   tela e em vinte globais. Recortam-se as três funções da fase, que são
   puras, e dá-se-lhes o js/ficha-fu.js, que é o dono da escada. */
const mercado = fs.readFileSync(path.join(RAIZ, 'js', 'avatars-market.js'), 'utf8');
function recorte(deOnde, ate) {
  const i = mercado.indexOf(deOnde);
  if (i === -1) throw new Error('não achei no js/avatars-market.js: ' + deOnde);
  const j = mercado.indexOf(ate, i);
  if (j === -1) throw new Error('não achei o fim de: ' + deOnde);
  return mercado.slice(i, j + ate.length);
}
const M = new Function('t',
  rd('ficha-fu.js') + NL
  + recorte('function _faseNum', '}') + NL
  + recorte('const _FASE_COR', '}') + NL
  + recorte('function getFaseNome', '}') + NL
  + 'return { getFaseCor, getFaseNome, _faseNum, fuFaseDoNivel, FU_FASES, _FASE_COR,'
  + '         FU_NIVEL_JOVEM, FU_NIVEL_ADULTO, FU_NIVEL_ANCIAO };'
)(() => ['bebê', 'jovem', 'adulto', 'ancião']);

let passou = 0, falhou = 0;
function ok(cond, titulo, detalhe) {
  if (cond) { passou++; console.log('  OK    ' + titulo.padEnd(54) + ' · ' + (detalhe || '')); }
  else      { falhou++; console.log('  FALHOU ' + titulo.padEnd(53) + ' · ' + (detalhe || '')); }
}
const tit = (x) => console.log(NL + '─── ' + x + ' ' + '─'.repeat(Math.max(0, 56 - x.length)));

const CORES = ['#a78bfa', '#60d4f0', '#4ade80', '#f0b840'];

/* ═══════════ A · A COR E O NOME CONCORDAM ═══════════ */
tit('A COR E O NOME DIZEM A MESMA FASE');

/* É isto que a divergência quebrava, e é o que se vê na tela: o nome e
   a cor saem lado a lado nos três lugares do mercado que os usam. */
let discordam = [];
for (let n = 1; n <= 60; n++) {
  const fase = M.fuFaseDoNivel(n);
  if (M.getFaseCor(n) !== CORES[fase]) discordam.push(n + ' cor');
  if (M.getFaseNome(n) !== ['bebê', 'jovem', 'adulto', 'ancião'][fase]) discordam.push(n + ' nome');
}
ok(discordam.length === 0, 'nos 60 níveis, a cor bate com a fase do nome',
   discordam.length ? discordam.slice(0, 5).join(' ') : '60 níveis × cor e nome');

/* E a cor vem mesmo da tabela, não de um literal solto. */
ok(JSON.stringify(M._FASE_COR) === JSON.stringify(CORES),
   'e o mapa de cores é o de sempre', M._FASE_COR.join(' · '));

/* ═══════════ B · AS FRONTEIRAS ═══════════ */
tit('AS FRONTEIRAS ESTÃO NOS 5, 11 E 27');

const FRONTEIRA = { 1: '#a78bfa', 4: '#a78bfa', 5: '#60d4f0', 10: '#60d4f0',
                    11: '#4ade80', 26: '#4ade80', 27: '#f0b840', 60: '#f0b840' };
for (const nv of Object.keys(FRONTEIRA).map(Number)) {
  ok(M.getFaseCor(nv) === FRONTEIRA[nv], 'nível ' + String(nv).padStart(2) + ' pinta de ' + FRONTEIRA[nv],
     'saiu ' + M.getFaseCor(nv));
}

/* As três mudanças de cor acontecem exatamente onde a escada muda, e em
   mais lado nenhum. */
const saltos = [];
for (let n = 2; n <= 60; n++) if (M.getFaseCor(n) !== M.getFaseCor(n - 1)) saltos.push(n);
ok(saltos.join(',') === '5,11,27', 'e a cor só muda em 5, 11 e 27',
   'muda em: ' + saltos.join(', '));

/* ═══════════ C · OS VALORES INVÁLIDOS ═══════════ */
tit('O QUE ENTRA TORTO');

/* O `fuFaseDoNivel` faz `(nivel || 1)`, logo tudo o que for falsy cai no
   nível 1 — que é o que a função antiga fazia com o seu próprio
   `nivel || 1`. Isto guarda a compatibilidade. */
const TORTOS = [[undefined, 'undefined'], [null, 'null'], [0, '0'], [false, 'false'],
                [NaN, 'NaN'], ['', 'string vazia'], [-5, 'negativo']];
let tortoMau = [];
for (const [v, rot] of TORTOS) {
  if (M.getFaseCor(v) !== '#a78bfa') tortoMau.push(rot + ' → ' + M.getFaseCor(v));
}
ok(tortoMau.length === 0, 'tudo o que é inválido pinta de bebê',
   tortoMau.length ? tortoMau.join(' · ') : TORTOS.map(x => x[1]).join(', '));

/* E o que vem como texto continua a funcionar: os três chamadores
   passam `s.nivel || 1`, e o nível do slot pode vir do banco como
   string. */
ok(M.getFaseCor('27') === '#f0b840' && M.getFaseCor('5') === '#60d4f0',
   'e um nível em texto continua a acertar', "'27' e '5'");

/* ═══════════ D · A FONTE É UMA SÓ ═══════════ */
tit('A FONTE DOS CORTES');

const fonte = mercado.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const corpoDaCor = (fonte.match(/function getFaseCor[\s\S]*?\n\}/) || [''])[0];

ok(corpoDaCor.length > 0 && /fuFaseDoNivel\(/.test(corpoDaCor),
   'o getFaseCor pergunta ao fuFaseDoNivel', 'a escada tem dono');
ok(!/[<>]=?\s*(5|11|27)\b|\b(5|11|27)\s*[<>]=?/.test(corpoDaCor),
   'e não tem cortes próprios', 'nem 5, nem 11, nem 27 escritos aqui');

/* O mesmo para o _faseNum, que a 3J.17A já tinha arranjado — se alguém
   lhe devolver a cópia, falha aqui também. */
const corpoDoNum = (fonte.match(/function _faseNum[\s\S]*?\n\}/) || [''])[0];
ok(/fuFaseDoNivel\(/.test(corpoDoNum) && !/[<>]=?\s*(5|11|27)\b/.test(corpoDoNum),
   'e o _faseNum continua sem a dele', '3J.17A');

/* E a escada em si não se mexeu. */
ok(M.FU_NIVEL_JOVEM === 5 && M.FU_NIVEL_ADULTO === 11 && M.FU_NIVEL_ANCIAO === 27,
   'os marcos continuam 5, 11 e 27',
   M.FU_NIVEL_JOVEM + ' · ' + M.FU_NIVEL_ADULTO + ' · ' + M.FU_NIVEL_ANCIAO);
ok(M.FU_FASES.join(',') === '5,11,27', 'e a FU_FASES com eles',
   '[' + M.FU_FASES.join(',') + ']');

console.log(NL + '─'.repeat(62));
console.log(passou + ' passaram · ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
