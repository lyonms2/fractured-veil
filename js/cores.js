// ═══════════════════════════════════════════════════════════════════
// A RODA DE CORES
//
// Havia cinco paletas fixas, uma por elemento, e dois avatares da mesma
// família saíam do mesmo balde de vermelhos. A cor passa a ser o que se
// vê e o que se herda — e são doze, não cinco.
//
// Cada avatar nasce com DUAS: a principal, que lhe dá o corpo, e a
// secundária, que lhe dá as sombras e os detalhes. Doze por doze são 144
// combinações, contra as cinco paletas de antes.
//
// ── PORQUE UMA RODA, E NÃO UMA LISTA ──
//
// Porque os filhos vão misturar. Numa lista, misturar vermelho com azul
// é uma entrada numa tabela que alguém teve de escrever à mão, e que
// alguém tem de manter. Numa roda é uma conta: a mistura de duas cores é
// o ponto entre elas. Vermelho (0) com Azul (8) dá Roxo (10) porque Roxo
// está mesmo a meio caminho, indo pelo lado curto.
//
// É a roda do pintor — vermelho, amarelo e azul como primárias — e não a
// do ecrã, onde vermelho e azul dariam magenta. É a que toda a gente
// aprendeu na escola, e é a que faz a mistura parecer certa.
//
// ── AS DOZE ──
//
//    0 Vermelho          6 Verde
//    1 Vermelho-laranja  7 Azul-esverdeado
//    2 Laranja           8 Azul
//    3 Amarelo-laranja   9 Azul-arroxeado
//    4 Amarelo          10 Roxo
//    5 Amarelo-esverdeado  11 Vermelho-arroxeado
//
// As primárias ficam em 0, 4 e 8; as secundárias em 2, 6 e 10; as seis
// terciárias entre elas. Não são igualmente espaçadas em matiz de ecrã
// de propósito: o amarelo ocupa uma faixa estreita e o verde uma larga,
// e distribuí-las por igual daria seis verdes e nenhum amarelo.
// ═══════════════════════════════════════════════════════════════════

const CORES_RODA = [
  { id: 'vermelho',      matiz:   0, sat: 72, luz: 48 },
  { id: 'vermelho_laranja', matiz: 15, sat: 78, luz: 50 },
  { id: 'laranja',       matiz:  30, sat: 85, luz: 52 },
  { id: 'amarelo_laranja', matiz: 44, sat: 88, luz: 52 },
  { id: 'amarelo',       matiz:  54, sat: 85, luz: 55 },
  { id: 'amarelo_verde', matiz:  80, sat: 62, luz: 45 },
  { id: 'verde',         matiz: 132, sat: 55, luz: 40 },
  { id: 'azul_verde',    matiz: 176, sat: 62, luz: 40 },
  { id: 'azul',          matiz: 212, sat: 68, luz: 48 },
  { id: 'azul_roxo',     matiz: 252, sat: 58, luz: 50 },
  { id: 'roxo',          matiz: 285, sat: 55, luz: 45 },
  { id: 'vermelho_roxo', matiz: 325, sat: 62, luz: 46 },
];

const CORES_N = CORES_RODA.length;

// Um índice que possa vir de qualquer lado, trazido para a roda.
function _corIdx(x) {
  if (typeof x === 'number') return ((x % CORES_N) + CORES_N) % CORES_N;
  const i = CORES_RODA.findIndex(c => c.id === x);
  return i >= 0 ? i : 0;
}

function corDaRoda(x) { return CORES_RODA[_corIdx(x)]; }
function idDaCor(x)   { return CORES_RODA[_corIdx(x)].id; }

/* ── A MISTURA ──

   O ponto a meio caminho, indo pelo lado curto da roda.

   Duas cores opostas — vermelho e verde, azul e laranja — não têm meio:
   há dois pontos à mesma distância, um de cada lado. Na tinta a sério
   dariam um castanho baço, que não está na roda. Aqui vai-se pelo lado
   dos índices crescentes, sempre. É uma escolha, não uma verdade: o que
   importa é ser a MESMA escolha todas as vezes, senão dois filhos dos
   mesmos pais saíam de cores diferentes. */
function misturarCores(a, b) {
  let i = _corIdx(a), j = _corIdx(b);
  if (i === j) return i;

  /* ── ORDENAR PRIMEIRO, E É POR ISTO ──

     A primeira versão contava a partir de `a`, e por isso misturar
     vermelho com azul dava uma coisa e azul com vermelho dava outra.
     Numa mistura de cores isso não tem significado nenhum: seria a ORDEM
     dos pais a decidir a cor do filho, e não há ordem entre pais.

     Duas causas, as duas escondidas atrás do arredondamento. Em
     distâncias ímpares o meio cai entre dois pontos da roda, e cada
     sentido arredondava para o seu lado. Em cores opostas há dois meios
     à mesma distância, e cada sentido escolhia o seu.

     Ordenar o par antes de contar resolve as duas de uma vez: as duas
     chamadas passam a percorrer exactamente o mesmo caminho. */
  if (i > j) { const troca = i; i = j; j = troca; }

  const frente = j - i;                  // agora é sempre positivo
  const atras  = CORES_N - frente;

  // Pelo lado curto. Em empate — opostas — vai-se pelo lado de frente.
  if (frente <= atras) return _corIdx(i + Math.round(frente / 2));
  return _corIdx(j + Math.round(atras / 2));
}

// Duas cores são opostas na roda? A mistura delas é a que tem menos a ver
// com qualquer uma das duas — vale a pena poder dizê-lo.
function coresOpostas(a, b) {
  const d = Math.abs(_corIdx(a) - _corIdx(b));
  return Math.min(d, CORES_N - d) === CORES_N / 2;
}

// ═══════════════════════════════════════════════════════════════════
// DA COR PARA A PALETA
//
// O ELEM_CFG tinha cinco paletas escritas à mão, com sete valores cada.
// Doze cores davam 84 valores para manter à mão, e à primeira vez que
// alguém mexesse numa esqueceria as outras onze.
//
// Sai tudo de uma conta sobre o matiz. As quatro cores do corpo são o
// mesmo matiz em quatro luminosidades; as sombras são a cor SECUNDÁRIA
// escurecida, e é aí que a segunda cor do avatar aparece; o brilho e o
// olho são o matiz principal levado ao claro.
// ═══════════════════════════════════════════════════════════════════
function _hsl(h, s, l) {
  return 'hsl(' + Math.round(((h % 360) + 360) % 360) + ',' +
         Math.round(Math.max(0, Math.min(100, s))) + '%,' +
         Math.round(Math.max(0, Math.min(100, l))) + '%)';
}

function paletaDeCores(principal, secundaria) {
  const p = corDaRoda(principal);
  const s = corDaRoda(secundaria != null ? secundaria : principal);
  return {
    // O corpo: o matiz principal, do escuro ao claro. Quatro degraus e
    // não um, porque o desenho escolhe entre eles e um corpo de uma cor
    // só fica chapado.
    cores: [
      _hsl(p.matiz, p.sat,      p.luz - 10),
      _hsl(p.matiz, p.sat,      p.luz),
      _hsl(p.matiz, p.sat - 8,  p.luz + 9),
      _hsl(p.matiz, p.sat - 14, p.luz + 17),
    ],
    // As sombras vêm da SEGUNDA cor. É aqui que ela se vê — e é o que
    // faz um azul-de-sombras-roxas ser outro bicho que um azul-de-
    // sombras-verdes, com o mesmo azul.
    coresSec: [
      _hsl(s.matiz, s.sat + 6,  Math.max(8,  s.luz - 30)),
      _hsl(s.matiz, s.sat,      Math.max(12, s.luz - 22)),
      _hsl(s.matiz, s.sat - 10, Math.max(16, s.luz - 14)),
    ],
    corBrilho: _hsl(p.matiz, Math.min(100, p.sat + 12), Math.min(88, p.luz + 34)),
    /* ── O CONTORNO É OUTRA COISA QUE O BRILHO ──

       Eram o mesmo, e o brilho fazia os dois trabalhos: acender a aura, e
       contornar o corpo, os chifres e as asas. Para acender está certo;
       para contornar, não — ele é o matiz levado ao claro, e nos matizes
       que já nascem claros bate no tecto dos 88 de luz. Um traço de dois
       ou três píxeis a 88 de luz não tem cor nenhuma aos olhos de ninguém:
       é branco. O amarelo era o pior, mas todos o tinham.

       O contorno vai ao contrário — o mesmo matiz levado ao ESCURO, e
       dessaturado, para ler como sombra do próprio bicho e não como um
       halo por cima dele. Continua a ser a cor do avatar; é só o outro
       lado dela. */
    corContorno: _hsl(p.matiz, Math.max(0, p.sat - 35), Math.max(12, p.luz - 26)),
    // O olho pela segunda cor, e claro: é o ponto onde o olhar cai, e
    // é onde a segunda cor tem de ser inconfundível.
    corOlho:   _hsl(s.matiz, Math.min(100, s.sat + 18), Math.min(78, s.luz + 24)),
    particulas: _PARTICULA_DO_TOM[tomDaCor(principal)],
  };
}

// ═══════════════════════════════════════════════════════════════════
// AS CORES DE UM AVATAR
//
// Vivem no DNA, como tudo o que se herda: um par de alelos, o primeiro
// é a cor principal e o segundo a secundária. Guardar as duas como genes
// é o que permite a um filho receber uma de cada lado e mostrar uma
// mistura que nenhum dos pais tinha.
// ═══════════════════════════════════════════════════════════════════
function coresDoAvatar(slot) {
  /* Um OVO traz o DNA solto — não tem certidão, que só se passa a quem
     nasce. Aceitar as duas formas aqui é o que deixa o inventário
     mostrar a cor de quem está lá dentro antes de ele sair. */
  const dna = slot && (slot.dna || (slot.nascimento && slot.nascimento.dna));
  const g = dna && dna.genes && dna.genes.cor;
  if (Array.isArray(g)) return { principal: _corIdx(g[0]), secundaria: _corIdx(g[1]) };
  /* O par tambem viaja resolvido: a certidao guarda-o em corPrincipal/
     corSecundaria, e ha sitios (o zoom do marketplace) onde so chegam
     esses dois numeros e nao o DNA inteiro. */
  const n = (slot && slot.nascimento) || slot;
  if (n && n.corPrincipal != null && n.corSecundaria != null)
    return { principal: _corIdx(n.corPrincipal), secundaria: _corIdx(n.corSecundaria) };
  return null;
}

/* ── QUEM NAO TEM DNA ──

   Um avatar do jogo antigo nao tem cores no DNA. Tinha um ELEMENTO, e
   durante um tempo houve aqui uma tabela que dizia a cor de cada um dos
   cinco. O elemento saiu do jogo e a tabela com ele.

   O que fica no lugar nao e uma tabela: e a SEED. Ela ja decide o corpo
   inteiro do bicho (gerarSVG, em js/data.js), portanto tirar dela
   tambem a cor nao inventa nada de novo — so le mais um numero de onde
   ja se lia tudo o resto. E deterministico, e por isso um avatar antigo
   tem sempre a mesma cor, hoje e daqui a um ano. */
function coresDoSeed(seed) {
  const s = Math.abs(seed | 0) || 1;
  return { principal: _corIdx(s), secundaria: _corIdx(Math.floor(s / CORES_N) + 5) };
}

/* As cores deste avatar, venha ele de onde vier: do DNA se o tiver, da
   seed se nao. Uma porta so, para nunca haver dois sitios a decidir a
   cor do mesmo bicho e a decidirem coisas diferentes. */
function coresDe(slot, seed) {
  return coresDoAvatar(slot)
      || coresDoSeed(seed != null ? seed : (slot && (slot.seed || slot.id)) || 0);
}

/* ── OS CINCO TONS DA RODA ──

   O nome de nascenca e a descricao vinham em cinco gavetas, uma por
   elemento. As gavetas nao tem culpa de o elemento ter saido: sao
   sessenta nomes e vinte e cinco descricoes escritas a mao, e deitar
   fora quatro quintos delas para ficar com um saco unico era perder
   trabalho por nada.

   Mudam de chave, e a chave nova e a COR — que e o que sobrou de
   identidade visivel. Doze cores em cinco gavetas, por trechos
   seguidos da roda: os vermelhos ficam com os nomes de brasa, os
   amarelos com os de barro, os verdes com os de folha, os azuis com os
   de mare, os roxos com os de breu.

   Assim o nome continua a combinar com o bicho — e passa a combinar
   melhor do que combinava, porque a cor VE-SE e o elemento era uma
   palavra. */
const CORES_TONS = ['brasa', 'barro', 'folha', 'mare', 'breu'];
const _TOM_DA_COR = ['brasa', 'brasa', 'brasa',   // vermelho, verm-laranja, laranja
                     'barro', 'barro',            // amarelo-laranja, amarelo
                     'folha', 'folha',            // amarelo-verde, verde
                     'mare',  'mare',             // azul-verde, azul
                     'breu',  'breu',  'breu'];   // azul-roxo, roxo, verm-roxo

/* E as particulas que rodeiam o bicho seguem o mesmo tom. Eram cinco
   desenhos, um por elemento, e sao os mesmos cinco: chamas para os
   vermelhos, pedras para os amarelos, espirais para os verdes, gotas
   para os azuis, sombras para os roxos. Nenhum se perdeu — mudaram de
   dono. */
const _PARTICULA_DO_TOM = { brasa:'chamas', barro:'pedras', folha:'espirais',
                            mare:'gotas',  breu:'sombras' };

function tomDaCor(x)   { return _TOM_DA_COR[_corIdx(x)]; }
function tomDoAvatar(slot, seed) { return tomDaCor(coresDe(slot, seed).principal); }

// A paleta a usar para desenhar este avatar, venha ele de onde vier.
function paletaDoAvatar(slot, seed) {
  const c = coresDe(slot, seed);
  return paletaDeCores(c.principal, c.secundaria);
}

/* A cor de um avatar, para quem quer pintar uma coisa qualquer com ela.

   A cerimónia da invocação e a do choco pintavam-se com a cor do
   ELEMENTO. Deixou de fazer sentido: a cor é a identidade do avatar e
   vem do DNA dele, e o ovo devia ter a cor de quem está lá dentro. */
function corDoAvatar(slot, qual) {
  const cfg = paletaDoAvatar(slot);
  if (!cfg) return '#8b5cf6';
  if (qual === 'brilho') return cfg.corBrilho;
  if (qual === 'contorno') return cfg.corContorno;
  return cfg.cores[1];
}

/* ── O GRADIENTE DO OVO ──

   Primeiro tentei pôr no meio do gradiente a primeira cor de SOMBRA do
   avatar. Foi um erro que se vê de longe: as sombras são feitas a
   `luz - 30` e chegam a bater no chão dos 8% de luminosidade — são
   para sombrear um corpo que já tem luz por cima, não para ser metade
   de um ovo. O ovo saía um borrão preto com um rebordo colorido, e
   parecia avariado.

   Aqui os três degraus são do matiz principal, com a mesma queda de
   luminosidade que o ovo antigo tinha (roxo 42% → 24% → 6%). A segunda
   cor só tinge o fundo, que é onde ela não compete com nada. */
function gradienteDoOvo(slot) {
  const c = coresDe(slot);
  const p = corDaRoda(c.principal);
  const s = corDaRoda(c.secundaria != null ? c.secundaria : c.principal);
  return {
    topo:   _hsl(p.matiz, p.sat, Math.min(62, p.luz + 6)),
    meio:   _hsl(p.matiz, p.sat, Math.max(18, p.luz - 16)),
    fundo:  _hsl(s.matiz, Math.min(100, s.sat + 10), 7),
    brilho: _hsl(p.matiz, Math.min(100, p.sat + 12), Math.min(88, p.luz + 34)),
    aura:   _hsl(p.matiz, p.sat, p.luz),
  };
}

/* ── O RÓTULO DO AVATAR ──

   Debaixo do nome, o cartão dizia "🔥 Fogo". Passa a dizer de que cor
   ele é, que é a única coisa que sobrou de identidade e a única que se
   confirma a olhar para o bicho.

   Está aqui, e não nos oito sítios que o mostram, porque o rótulo do
   marketplace e o rótulo da consola têm de dizer a MESMA palavra sobre
   o mesmo avatar. Escrito em oito sítios, sete deles ficariam para trás
   à primeira mudança — é a forma de defeito mais antiga deste jogo. */
function frasedaCor(slot, seed) {
  const c = coresDe(slot, seed);
  const a = nomeDaCor(c.principal), b = nomeDaCor(c.secundaria);
  const chave = (c.principal === c.secundaria) ? 'cor.pura' : 'cor.par';
  return (typeof t === 'function') ? t(chave, { a, b }) : (a + (a === b ? '' : ' / ' + b));
}

/* ── A COR, PRONTA A VIAJAR ──

   O lobby da arena, o rouba-monte e a batalha naval publicam uma ficha
   curta de cada jogador na base em tempo real, para o outro lado poder
   desenhar o bicho antes de a partida começar. Levava o ELEMENTO, que
   era o que dava a paleta ao desenho.

   Leva os dois números da cor. É o mesmo par que a certidão guarda, e
   por isso o registo publicado é lido pelo coresDoAvatar sem tradução
   nenhuma — chega passá-lo ao gerarSVG. */
function paresDeCor(slot, seed) {
  const c = coresDe(slot, seed);
  return { corPrincipal: c.principal, corSecundaria: c.secundaria };
}

// A cor em si, para pintar uma amostra. É a mesma conta da paleta,
// e por isso a amostra é mesmo a cor com que o bicho é desenhado.
function corDaRodaHex(x) {
  const c = corDaRoda(x);
  return _hsl(c.matiz, c.sat, c.luz);
}

/* A mesma cor em r,g,b, para quem precisa de lhe pôr transparencia por
   cima — o canvas do labirinto pinta o rasto com rgba(). Convem estar
   aqui e nao la: e a mesma cor, e duas contas em dois ficheiros para a
   mesma cor e o principio de duas cores diferentes. */
function corDaRodaRgb(x) {
  const c = corDaRoda(x);
  const h = ((c.matiz % 360) + 360) % 360, sa = c.sat / 100, l = c.luz / 100;
  const k = n => (n + h / 30) % 12;
  const a = sa * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return f(0) + ',' + f(8) + ',' + f(4);
}

// O nome da cor, para mostrar. Vem do i18n; sem ele, o id serve.
function nomeDaCor(x) {
  const id = idDaCor(x);
  return (typeof t === 'function') ? t('cor.' + id) : id;
}
