// ═══════════════════════════════════════════════════════════════════
// AS REGRAS DA FASE, LIDAS DO JOGO
//
// O js/state.js inteiro não corre fora do browser — mexe no ecrã e em
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

// Por ordem de dependência: o faseFromNivel chama o faseDePontos.
const NOMES_DA_FASE = ['FASE_MIN_SECS', 'faseDePontos', 'faseFromNivel', 'faseFromAge'];

function linhasDaFase(raiz) {
  const re = new RegExp('^const +(' + NOMES_DA_FASE.join('|') + ') *=');
  const linhas = fs.readFileSync(path.join(raiz, 'js/state.js'), 'utf8')
    .split(NL).filter(l => re.test(l)).join(NL);

  for (const nome of NOMES_DA_FASE)
    if (!new RegExp('^const +' + nome + ' *=', 'm').test(linhas))
      throw new Error('js/state.js mudou: não encontrei o ' + nome + ' numa linha só.');

  return linhas;
}

module.exports = { NOMES_DA_FASE, linhasDaFase };
