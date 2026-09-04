// ═══════════════════════════════════════════════════════════════════
// A RODA DE CORES
//
// O elemento decidia como o avatar era desenhado: cinco paletas fixas, e
// dois avatares de Fogo saíam do mesmo balde de vermelhos. A cor passa a
// ser o que se vê e o que se herda — e são doze, não cinco.
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
    // O olho pela segunda cor, e claro: é o ponto onde o olhar cai, e
    // é onde a segunda cor tem de ser inconfundível.
    corOlho:   _hsl(s.matiz, Math.min(100, s.sat + 18), Math.min(78, s.luz + 24)),
    particulas: 'neutro',
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
  const g = slot && slot.nascimento && slot.nascimento.dna
         && slot.nascimento.dna.genes && slot.nascimento.dna.genes.cor;
  if (Array.isArray(g)) return { principal: _corIdx(g[0]), secundaria: _corIdx(g[1]) };
  /* O par tambem viaja resolvido: a certidao guarda-o em corPrincipal/
     corSecundaria, e ha sitios (o zoom do marketplace) onde so chegam
     esses dois numeros e nao o DNA inteiro. */
  const n = (slot && slot.nascimento) || slot;
  if (n && n.corPrincipal != null && n.corSecundaria != null)
    return { principal: _corIdx(n.corPrincipal), secundaria: _corIdx(n.corSecundaria) };
  return null;
}

/* Um avatar do jogo antigo não tem cores — tem um elemento. Em vez de
   lhe inventar uma cor ao acaso, dá-se-lhe a que ele sempre teve: o
   ponto da roda mais perto da paleta do seu elemento. Assim ninguém
   chega ao jogo e vê o seu bicho de outra cor. */
const CORES_DO_ELEMENTO = {
  'Fogo':   [0, 2],    // vermelho com sombras de laranja
  'Água':   [8, 7],    // azul com sombras de azul-esverdeado
  'Terra':  [2, 6],    // laranja terroso com sombras verdes
  'Vento':  [7, 8],    // azul-esverdeado claro com sombras azuis
  'Sombra': [10, 9],   // roxo com sombras de azul-arroxeado
};

function coresDoElemento(elemento) {
  const c = CORES_DO_ELEMENTO[elemento] || CORES_DO_ELEMENTO['Fogo'];
  return { principal: c[0], secundaria: c[1] };
}

// A paleta a usar para desenhar este avatar, venha ele de onde vier.
function paletaDoAvatar(slot) {
  const c = coresDoAvatar(slot) || coresDoElemento(slot && slot.elemento);
  return paletaDeCores(c.principal, c.secundaria);
}

// O nome da cor, para mostrar. Vem do i18n; sem ele, o id serve.
function nomeDaCor(x) {
  const id = idDaCor(x);
  return (typeof t === 'function') ? t('cor.' + id) : id;
}
