// ═══════════════════════════════════════════════════════════════════
//  A GENÉTICA, DO LADO DO SERVIDOR
//
//  ── POR QUE ISTO EXISTE ──
//
//  O DNA de um avatar era composto no navegador e o servidor guardava o
//  que recebesse. Quem abrisse o console escrevia os genes que quisesse:
//  corpo, índole, cor, tendência, vigor. E é aí que está o valor de um
//  avatar desde que a herança passou a existir.
//
//  A partir daqui quem gera o DNA é o servidor. Este arquivo é a ponte.
//
//  ── POR QUE NÃO HÁ UMA SEGUNDA CÓPIA DA GENÉTICA ──
//
//  A tentação era reescrever gerarDna/nascer aqui em CommonJS. Seria uma
//  segunda implementação da mesma coisa — e no dia em que uma mudasse, o
//  servidor e o cliente passariam a discordar sobre o que um avatar é,
//  em silêncio, e só se daria por isso quando alguém comparasse.
//
//  Em vez disso carrega-se o MESMO código que o navegador corre. O
//  js/cores.js e o js/nascimento.js ganharam `module.exports` guardado
//  (que no browser não faz nada) e requerem-se aqui.
//
//  ── A COSTURA ──
//
//  Aqueles arquivos são scripts de browser: chamam-se uns aos outros por
//  nome global, sem require. Em Node cada módulo tem o seu escopo, e o
//  js/nascimento.js não veria o corDaRoda do js/cores.js.
//
//  Publicam-se no `global`, uma vez. Um identificador solto que não
//  existe no módulo resolve-se no global em tempo de CHAMADA — portanto
//  basta estarem lá antes de alguém chamar, e a ordem do require não
//  importa.
// ═══════════════════════════════════════════════════════════════════
const cores       = require('../js/cores.js');
const nascimento  = require('../js/nascimento.js');
const raridade    = require('../js/raridade.js');
const fichaDT     = require('../js/ficha-3dt.js');

// A fase sai do nível, e o js/state.js não corre fora do navegador (mexe
// no ecrã e em vinte globais). São duas linhas e leem-se de lá tal como
// estão — a mesma escada, escrita uma vez, em js/state.js.
const faseDePontos  = p => { const v = p || 0; return v < 5 ? 0 : v < 8 ? 1 : v < 12 ? 2 : 3; };
const faseFromNivel = n => faseDePontos(fichaDT.pontosDoAvatar('Comum', n || 1));

Object.assign(global, cores, nascimento, raridade, fichaDT,
              { faseDePontos, faseFromNivel });

/* Um seed que o jogador não escolhe.

   O Math.random do navegador escolhia-o, e escolher o seed é escolher o
   corpo e a ficha inteira do bicho — quem insistisse sorteava até
   gostar. Aqui sai do gerador criptográfico do Node, e o jogador vê o
   resultado depois de estar decidido. */
const { randomInt } = require('crypto');
function seedNovo() { return randomInt(1, 2147483647); }

/* Um id que também não vem do cliente. O identidadeNova() do
   js/identidade.js gera-o no navegador; para um avatar que o servidor
   emite, quem o nomeia é o servidor. */
function idNovo() {
  return 'av_' + Date.now().toString(36) + '_' + randomInt(0, 0xFFFFFF).toString(36);
}

/* A certidão de um avatar invocado: sem mãe nem pai, origem Comum.

   Devolve o objeto puro (o registarNascimento congela-o, e um objeto
   congelado não atravessa bem o Firestore). */
function certidaoDeInvocacao() {
  const seed = seedNovo();
  const dna  = nascimento.gerarDna('Comum', seed);
  const cert = nascimento.nascer({ dna, origem: 'Comum', seed });
  return { id: idNovo(), seed, nascimento: JSON.parse(JSON.stringify(cert)) };
}

module.exports = {
  cores, nascimento, raridade, fichaDT,
  faseFromNivel, seedNovo, idNovo, certidaoDeInvocacao,
};
