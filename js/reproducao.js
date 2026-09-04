// ═══════════════════════════════════════════════════════════════════
// REPRODUÇÃO — dois avatares, um ovo, um filho
//
// O DNA já era diplóide desde o dia em que nasceu (js/nascimento.js), e
// era-o exactamente por causa disto: guardar DOIS alelos por
// característica não servia para nada enquanto não houvesse com quem
// cruzar. Agora serve.
//
// ── A REGRA, QUE É UMA SÓ ──
//
// De cada par de alelos dos pais sai UM, à sorte, e os dois formam o par
// do filho. É Mendel, e é tudo: não há médias, não há bónus, não há
// nada que eu tenha inventado por cima.
//
// Daqui saem sozinhas três coisas que fazem uma linhagem valer a pena:
//
//   · um alelo alto que a mãe tinha escondido pode ser o que ela passa,
//     e o filho sair melhor do que ela
//   · dois pais fortes podem dar um filho fraco, e dão-no às vezes
//   · uma cor que ninguém via há gerações reaparece num neto
//
// O sexo sai da mesma regra sem precisar de regra própria: a mãe é XX e
// só tem X para dar, o pai é XY e dá um dos dois. Foi para isto que o
// par sexual ficou guardado inteiro em vez de se guardar "macho".
//
// ── O QUE ISTO NÃO FAZ ──
//
// Não decide o que o filho será. Sai daqui um DNA, e o DNA é TENDÊNCIA:
// os pontos continuam a cair um a um ao longo de trinta e cinco níveis,
// e dois irmãos do mesmo par acabam diferentes. Ver tools/genetica.js.
// ═══════════════════════════════════════════════════════════════════

// Quanto tempo o ovo de um filho leva a poder ser chocado.
const REPR_INCUBACAO_MS = 24 * 3600 * 1000;

// E quanto tempo ele dura antes de apodrecer, a contar de que é posto.
const REPR_VALIDADE_DIAS = 14;

/* Gerador próprio, com constante própria: se partilhasse a do DNA, dois
   pais com os mesmos seeds davam sempre o mesmo filho. */
function _reprRng(seed) {
  let x = ((seed | 0) ^ 0x7A3B) >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}

// Um alelo, à sorte, de um par.
function _umDoPar(par, rnd) {
  if (!Array.isArray(par) || !par.length) return null;
  return par[rnd() < 0.5 ? 0 : 1];
}

/* ═══════════════════════════════════════════════════════════════════
   PODE?

   Devolve { ok } ou { ok: false, motivo }. O motivo é uma chave de
   tradução, para quem chama poder dizer ao jogador o que falta em vez
   de só apagar um botão.

   Estas condições vivem aqui e não no botão: um limite guardado por
   quem PEDE em vez de por quem FAZ é a forma mais antiga de defeito
   deste jogo, e já rendeu quatro.
   ═══════════════════════════════════════════════════════════════════ */
function podeCruzar(a, b, opts) {
  const o = opts || {};
  if (!a || !b)                    return { ok: false, motivo: 'repr.erro.faltam' };
  if (a === b || (a.id && a.id === b.id)) return { ok: false, motivo: 'repr.erro.mesmo' };
  if (a.dead || b.dead)            return { ok: false, motivo: 'repr.erro.morto' };
  if (a.listed || b.listed)        return { ok: false, motivo: 'repr.erro.avenda' };
  if (!a.nascimento || !b.nascimento) return { ok: false, motivo: 'repr.erro.sem_dna' };

  // Macho e fêmea. É a razão de o sexo existir.
  const sa = (typeof sexoDe === 'function') ? sexoDe(a) : null;
  const sb = (typeof sexoDe === 'function') ? sexoDe(b) : null;
  if (sa === sb)                   return { ok: false, motivo: 'repr.erro.mesmo_sexo' };

  // Os dois adultos. A fase pede nível E horas de jogo (js/state.js),
  // portanto isto não se compra com XP numa tarde.
  const fa = (typeof faseDoSlot === 'function') ? faseDoSlot(a) : 0;
  const fb = (typeof faseDoSlot === 'function') ? faseDoSlot(b) : 0;
  if (fa < 3 || fb < 3)            return { ok: false, motivo: 'repr.erro.novo' };

  // E o ovo tem de ter onde ir.
  if (o.ovosNoInventario != null && o.maxOvos != null
      && o.ovosNoInventario >= o.maxOvos) return { ok: false, motivo: 'repr.erro.cheio' };

  return { ok: true };
}

/* ═══════════════════════════════════════════════════════════════════
   O DNA DO FILHO
   ═══════════════════════════════════════════════════════════════════ */
function cruzarDna(dnaA, dnaB, seed) {
  const rnd = _reprRng(seed || Date.now());
  const gA = (dnaA && dnaA.genes) || {};
  const gB = (dnaB && dnaB.genes) || {};
  const genes = {};

  // As quatro características: um alelo de cada lado.
  const caracs = (typeof NASC_CARACS !== 'undefined') ? NASC_CARACS : ['F', 'H', 'R', 'A'];
  for (const k of caracs) {
    genes[k] = [_umDoPar(gA[k] || [0, 0], rnd), _umDoPar(gB[k] || [0, 0], rnd)];
  }

  /* A COR NÃO SE MISTURA AQUI.

     Uma cor de cada lado, inteira, como as características. Foi
     escolha: misturar as duas puxava sempre para o meio da roda, e ao
     fim de muitas gerações a colónia inteira saía da mesma cor bâmbia.
     Assim as pontas nunca se perdem, e uma cor que ninguém vê há três
     gerações pode reaparecer num neto — que é o que faz valer a pena
     olhar para a árvore. */
  genes.cor = [_umDoPar(gA.cor || [0, 0], rnd), _umDoPar(gB.cor || [0, 0], rnd)];

  /* O SEXO, PELA MESMA REGRA E SEM REGRA PRÓPRIA.
     A mãe é XX e só tem X para dar; o pai é XY e dá um dos dois. */
  genes.sexo = [_umDoPar(gA.sexo || ['X', 'X'], rnd), _umDoPar(gB.sexo || ['X', 'X'], rnd)];

  // E o feitio.
  genes.indole = [_umDoPar(gA.indole || [0, 0], rnd), _umDoPar(gB.indole || [0, 0], rnd)];

  /* O elemento vem de um dos pais, à sorte. Não é um par de alelos
     como o resto porque nunca foi: vive no topo do DNA e é ele que
     escolhe a gaveta de magias. Meia-mistura de gavetas não existe. */
  const elemento = rnd() < 0.5 ? (dnaA && dnaA.elemento) : (dnaB && dnaB.elemento);

  return { v: 2, elemento: elemento || (dnaA && dnaA.elemento) || 'Fogo', genes };
}

/* ═══════════════════════════════════════════════════════════════════
   O OVO

   Leva o DNA do filho lá dentro, já feito, e o registo de quem são os
   pais. Não leva o avatar: quem nasce é o chocar, e o nascimento
   continua a ser um acto só, no js/nascimento.js.
   ═══════════════════════════════════════════════════════════════════ */
function cruzar(mae, pai, opts) {
  const o = opts || {};
  const verificacao = podeCruzar(mae, pai, o);
  if (!verificacao.ok) return verificacao;

  /* Quem é a mãe e quem é o pai não se aceita de quem chama: lê-se do
     sexo. Trocados, o par sexual do filho saía ao contrário e podiam
     nascer avatares YY, que não existem. */
  const sm = (typeof sexoDe === 'function') ? sexoDe(mae) : 'F';
  const femea = sm === 'F' ? mae : pai;
  const macho = sm === 'F' ? pai : mae;

  const agora = Date.now();
  const seed = o.seed != null ? o.seed
    : ((femea.seed || 0) * 31 + (macho.seed || 0) * 17 + agora) >>> 0;

  const dna = cruzarDna(femea.nascimento.dna, macho.nascimento.dna, seed);

  return {
    ok: true,
    ovo: {
      id: agora,
      elemento: dna.elemento,
      // O DNA do filho viaja dentro do ovo. É a diferença entre um ovo
      // qualquer e o filho DESTES dois.
      dna,
      mae: femea.id || null,
      pai: macho.id || null,
      maeNome: femea.nome ? String(femea.nome).split(',')[0].trim() : null,
      paiNome: macho.nome ? String(macho.nome).split(',')[0].trim() : null,
      postoEm: agora,
      // Tempo de choco: o ovo existe, mas ainda não se abre.
      chocaEm: agora + REPR_INCUBACAO_MS,
      expiraEm: agora + REPR_VALIDADE_DIAS * 86400000,
    },
  };
}

// Já se pode chocar? Um ovo sem chocaEm é dos antigos, e esse abre já.
function ovoPronto(ovo, agora) {
  if (!ovo || !ovo.chocaEm) return true;
  return (agora || Date.now()) >= ovo.chocaEm;
}

function faltaParaChocar(ovo, agora) {
  if (ovoPronto(ovo, agora)) return 0;
  return ovo.chocaEm - (agora || Date.now());
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { podeCruzar, cruzarDna, cruzar, ovoPronto, faltaParaChocar,
                     REPR_INCUBACAO_MS, REPR_VALIDADE_DIAS };
}
