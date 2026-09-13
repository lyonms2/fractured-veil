// ═══════════════════════════════════════════════════════════════════
// AS REGRAS DA FASE, LIDAS DO JOGO
//
// O js/state.js inteiro não corre fora do browser — mexe na tela e em
// vinte globais. Mas as regras da fase são quatro linhas, e essas leem-se
// de lá tal como estão.
//
// ── PORQUE ISTO É UM FICHEIRO E NÃO DUAS CÓPIAS ──
//
// Era: o tools/evolucao.js e o tools/linhagem.js tinham cada um a sua
// extração, com a sua expressão regular e a sua guarda. Quando a escada
// mudou, arranjei uma e a outra ficou a rebentar com "faseDePontos is not
// defined" — porque a lista de nomes dela era a antiga.
//
// Duas cópias de uma conta divergem; duas cópias de uma EXTRAÇÃO divergem
// em silêncio, porque a segunda só se usa numa ferramenta que ninguém
// corre nesse dia.
//
// ── A GUARDA ──
//
// Contar as linhas não chega, e já falhou: escrevi o faseFromNivel em
// duas linhas, a extração trouxe só a primeira, e o total continuou a
// bater porque tinha apanhado três linhas de qualquer maneira. Pergunta-se
// por NOME, e cada nome tem de estar numa linha só.
// ═══════════════════════════════════════════════════════════════════
const fs = require('fs');
const path = require('path');

const NL = String.fromCharCode(10);

/* O FASE_DEGRAUS saiu do js/state.js: a escada vive no js/ficha-fu.js e
   o faseFromNivel é só a porta.

   Quem extrair estas linhas tem de dar o `fuFaseDoNivel` ao Function que
   as corre — elas já não se bastam a si próprias, e é esse o preço de a
   escada existir uma vez só. */
const NOMES_DA_FASE = ['FASE_MIN_SECS', 'faseFromNivel', 'faseFromAge'];

function linhasDaFase(raiz) {
  const re = new RegExp('^const +(' + NOMES_DA_FASE.join('|') + ') *=');
  const linhas = fs.readFileSync(path.join(raiz, 'js/state.js'), 'utf8')
    .split(NL).filter(l => re.test(l)).join(NL);

  for (const nome of NOMES_DA_FASE)
    if (!new RegExp('^const +' + nome + ' *=', 'm').test(linhas))
      throw new Error('js/state.js mudou: não encontrei o ' + nome + ' numa linha só.');

  return linhas;
}

/* ── E OUTROS TRECHOS DOS ARQUIVOS DO BROWSER ──

   A mesma ideia para as regras da progressão: a tabela de XP, o XP de
   cuidar e o espaço de item vivem no js/state.js; o título, no
   js/identidade.js. Nenhum dos dois corre fora do navegador.

   Tira-se cada nome pelo que ele é:
     `const NOME = ...`   uma linha só
     `function NOME(`     até à primeira linha que seja só `}`

   E grita se não encontrar um nome, ou se uma função não fechar — pela
   mesma razão da guarda de cima: uma extração que apanha metade em
   silêncio é pior do que uma que rebenta. */
function trechosDe(raiz, arquivo, nomes) {
  const linhas = fs.readFileSync(path.join(raiz, arquivo), 'utf8').split(/\r?\n/);
  const partes = [];
  for (const nome of nomes) {
    const reConst = new RegExp('^const +' + nome + ' *=');
    const reFunc  = new RegExp('^function +' + nome + ' *\\(');
    const i = linhas.findIndex(l => reConst.test(l) || reFunc.test(l));
    if (i < 0) throw new Error(arquivo + ' mudou: não encontrei o ' + nome + '.');
    if (reConst.test(linhas[i])) { partes.push(linhas[i]); continue; }
    const fim = linhas.findIndex((l, j) => j > i && l === '}');
    if (fim < 0) throw new Error(arquivo + ': a função ' + nome + ' não fecha numa linha só com }.');
    partes.push(linhas.slice(i, fim + 1).join(NL));
  }
  return partes.join(NL);
}

module.exports = { NOMES_DA_FASE, linhasDaFase, trechosDe };
