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
// A reprodução entra pela mesma porta e pela mesma razão: o DNA de um
// filho é o cruzamento de dois pais, e essa conta tem de ser feita uma
// vez só. Ela chama o sexoDe, o faseDoSlot e o coresDe por nome global —
// que os `Object.assign` abaixo põem lá.
const reproducao  = require('../js/reproducao.js');

// A fase sai do nível, e o js/state.js não corre fora do navegador (mexe
// no ecrã e em vinte globais). São duas linhas e leem-se de lá tal como
// estão — a mesma escada, escrita uma vez, em js/state.js.
const faseDePontos  = p => { const v = p || 0; return v < 5 ? 0 : v < 8 ? 1 : v < 12 ? 2 : 3; };
const faseFromNivel = n => faseDePontos(fichaDT.pontosDoAvatar('Comum', n || 1));

Object.assign(global, cores, nascimento, raridade, fichaDT, reproducao,
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

/* O id de um ovo. Era o `Date.now()` do momento da cruza (js/reproducao.js),
   e um número desses tem dois problemas aqui: duas cruzas no mesmo
   milissegundo davam o mesmo id, e o id passou a ser CHAVE de um mapa do
   Firestore — o `ovos` — onde uma colisão é um ovo a apagar outro. */
function ovoIdNovo() {
  return 'ov_' + Date.now().toString(36) + '_' + randomInt(0, 0xFFFFFF).toString(36);
}

/* A certidão de um avatar invocado: sem mãe nem pai, origem Comum.

   Devolve o objeto puro (o registarNascimento congela-o, e um objeto
   congelado não atravessa bem o Firestore). */
function certidaoDeInvocacao(criador) {
  const c    = criador || {};
  const seed = seedNovo();
  const dna  = nascimento.gerarDna('Comum', seed);
  const cert = nascimento.nascer({
    dna, origem: 'Comum', seed,
    // Quem o fez vai na certidão e não no slot: o slot é do cliente.
    criadorUid: c.uid || null, criadorNome: c.nome || null,
  });
  return { id: idNovo(), seed, nascimento: JSON.parse(JSON.stringify(cert)) };
}

/* ── O OVO DE UMA CRUZA ──

   Recebe os dois slots com a certidão já reatada (é de lá que sai o DNA
   de cada progenitor) e devolve o ovo pronto, ou o motivo da recusa.

   O SEED sai daqui e não do cliente. Ele decide de que lado vem cada
   alelo — a força do pai ou a da mãe, a cor de um ou a do outro — e
   portanto decide o filho. Com o seed nas mãos do jogador, cruzar era
   uma tentativa: sortear até sair o filho que se queria. Agora sai do
   gerador criptográfico do Node, e vê-se o resultado depois de estar
   decidido.

   O `podeCruzar` é o mesmo do cliente. Ele lá continua a correr, para o
   botão saber o que dizer; quem RECUSA é este. */
function ovoDeCruza(mae, pai, opts) {
  const r = reproducao.cruzar(mae, pai, opts || {});
  if (!r.ok) return r;
  // O id do ovo é do servidor, pela razão escrita no ovoIdNovo.
  r.ovo.id = ovoIdNovo();
  return { ok: true, ovo: JSON.parse(JSON.stringify(r.ovo)) };
}

/* ── A CERTIDÃO DE QUEM SAI DE UM OVO ──

   O DNA vem FEITO, do ovo, e é o que a cruza compôs — sortear outro
   aqui era deitar fora a herança e dar ao filho genes de estranho.

   O que se sorteia é o SEED, e só ele: é ele que decide o corpo e a
   ficha de combate, e é o que faz dois irmãos do mesmo par serem dois
   bichos e não um repetido. Saía do navegador, como tudo o resto. */
function certidaoDeChoco(ovo, criador) {
  const c    = criador || {};
  const seed = seedNovo();
  const cert = nascimento.nascer({
    dna: ovo.dna || null, origem: 'Comum', seed,
    mae: ovo.mae || null, pai: ovo.pai || null,
    maeNome: ovo.maeNome || null, paiNome: ovo.paiNome || null,
    maeRetrato: ovo.maeRetrato || null, paiRetrato: ovo.paiRetrato || null,
    criadorUid: c.uid || null, criadorNome: c.nome || null,
  });
  return { id: idNovo(), seed, nascimento: JSON.parse(JSON.stringify(cert)) };
}

module.exports = {
  cores, nascimento, raridade, fichaDT, reproducao,
  faseFromNivel, seedNovo, idNovo, ovoIdNovo,
  certidaoDeInvocacao, ovoDeCruza, certidaoDeChoco,
};
