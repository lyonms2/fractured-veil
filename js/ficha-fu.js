// ═══════════════════════════════════════════════════════════════════
//  A FICHA — motor Fabula Ultima
//
//  Substitui o js/ficha-3dt.js. Lá um avatar era quatro NÚMEROS comprados
//  com um orçamento de pontos; aqui é quatro DADOS, de d6 a d12, e não há
//  orçamento nenhum — há quatro arranjos fixos e o DNA escolhe um.
//
//  ── O QUE ESTE ARQUIVO PROMETE ──
//
//  É PURO e é DETERMINISTA. Para o mesmo DNA e o mesmo seed dá sempre a
//  mesma ficha, hoje e daqui a um ano, no navegador e no Node. Nada aqui
//  lê o relógio, o acaso ou uma variável global do jogo.
//
//  Isso não é preciosismo: a ficha decide quanto dano um avatar dá e
//  aguenta, e ele vende-se por cristais que saem em MATIC. Uma ficha que
//  mude sozinha é dinheiro a mudar sozinho.
//
//  ── O QUE NÃO SE TOCA ──
//
//  O DNA. O js/nascimento.js e o js/reproducao.js ficam exactamente como
//  estão, e é de propósito: a genética e a herança são anteriores ao
//  motor de combate e têm de lhe sobreviver. Este arquivo LÊ o DNA que
//  já existe e não pede que ele mude.
// ═══════════════════════════════════════════════════════════════════

/* ── OS QUATRO ATRIBUTOS ──

   Destreza, Percepção, Vigor e Vontade. Cada um é um tamanho de dado.
   A ordem desta lista é a ordem em que aparecem em todo o lado — ficha,
   painel, registo — e é a do manual. */
const FU_ATRIBS = ['DES', 'PER', 'VIG', 'VON'];

/* ── O NÓ: OS GENES CHAMAM-SE OUTRA COISA ──

   O DNA guarda os genes com os nomes do 3D&T: F, H, R, A. Estão
   gravados no Firestore de cada avatar que já nasceu, e o
   js/reproducao.js cruza-os por esses nomes.

   Renomeá-los obrigaria a mexer na genética, na herança e nos dados
   gravados — três coisas que esta troca de motor não devia tocar. Por
   isso o nome fica e só a LEITURA muda, aqui, numa linha:

     F  força        → VIG  vigor          a mesma coisa, outro nome
     H  habilidade   → DES  destreza       a mesma coisa, outro nome
     R  resistência  → VON  vontade        era ela que dava os PM; a VON dá os PM
     A  armadura     → PER  percepção      era ela que aparava a magia; a PER apara a magia

   As duas primeiras são traduções directas. As duas últimas escolhi-as
   pelo TRABALHO que faziam e não pelo nome: no 3D&T a Resistência
   enchia a bolsa de magia e a Armadura defendia dela, e no Fabula são a
   Vontade e a Percepção que fazem essas duas coisas. Um avatar que era
   resistente continua a ser o que aguenta lançar magia a noite toda. */
const FU_GENE_DO_ATRIB = { DES: 'H', PER: 'A', VIG: 'F', VON: 'R' };

/* ── OS QUATRO ARRANJOS ──

   Saem do manual (p. 302) tal e qual. Não há quintos nem sextos: o
   avatar é um destes quatro perfis, e o que o DNA escolhe é qual deles
   e em que ordem cai nos atributos. */
const FU_ARRANJOS = [
  { id: 'equilibrado',  dados: [8, 8, 8, 8] },
  { id: 'padrao',       dados: [10, 8, 8, 6] },
  { id: 'especialista', dados: [10, 10, 6, 6] },
  { id: 'extremo',      dados: [12, 8, 6, 6] },
];

/* ── OS OITO TIPOS, NA ORDEM DA RODA ──

   Esta lista É a roda: o vizinho de um tipo é o seguinte, e o do último
   é o primeiro. A ordem sai da ordem das cores em js/cores.js —
   vermelho, laranja, amarelo, verde, azul, roxo — com a luz e a treva
   no fim, que é onde o branco e o preto estão lá também.

   O FÍSICO NÃO ESTÁ AQUI, e é de propósito: é o dano do golpe comum de
   toda a gente, não é a cor de ninguém, e ninguém é vulnerável a ele
   (ver FU_COSTURAS). */
const FU_TIPOS = ['fogo', 'terra', 'raio', 'ar', 'gelo', 'veneno', 'luz', 'treva'];

/* O tipo de cada uma das catorze cores. Duas cores por tipo na roda, e
   as duas de fora da roda — o branco e o preto — ficam sozinhas com a
   luz e a treva.

   É uma lista escrita à mão ao lado de outra lista escrita à mão, e por
   isso grita ao carregar se alguém acrescentar uma cor e esquecer o
   tipo dela (ver a verificação lá em baixo). */
const FU_TIPO_DA_COR = [
  'fogo',  'fogo',          // vermelho, vermelho-laranja
  'terra', 'terra',         // laranja, amarelo-laranja
  'raio',  'raio',          // amarelo, amarelo-verde
  'ar',    'ar',            // verde, azul-verde
  'gelo',  'gelo',          // azul, azul-roxo
  'veneno','veneno',        // roxo, vermelho-roxo
  'luz',                    // branco  — fora da roda
  'treva',                  // preto   — fora da roda
];

/* ── OS NOVE TIPOS DE DANO DO MANUAL ──
   Os oito acima mais o físico. É esta a lista que a ficha devolve
   quando alguém pergunta pelas afinidades — todas as nove, sempre, para
   quem lê não ter de adivinhar se a ausência é "sem afinidade" ou
   "esqueceram-se". */
const FU_DANOS = ['fisico'].concat(FU_TIPOS);

/* ── A ESCALA DOS DADOS ──
   d6 a d12, de dois em dois. Não há d7 nem d9: subir um tamanho é
   andar um passo nesta lista, e o topo é o d12. */
const FU_DADOS = [6, 8, 10, 12];

function fuSubirDado(d) {
  const i = FU_DADOS.indexOf(d);
  return i === -1 || i === FU_DADOS.length - 1 ? d : FU_DADOS[i + 1];
}
function fuDescerDado(d) {
  const i = FU_DADOS.indexOf(d);
  return i <= 0 ? FU_DADOS[0] : FU_DADOS[i - 1];
}

/* ═══════════════════════════════════════════════════════════════════
   O SORTEIO

   Determinista e próprio deste arquivo. Não usa o Math.random nem o
   gerador do nascimento: o seed entra, o mesmo número sai, e é a única
   forma de a ficha ser a mesma em todos os lados.

   O 0x46554F é "FUO" em hexadecimal — serve só para este gerador não
   dar a mesma sequência que o do js/nascimento.js com o mesmo seed.
   ═══════════════════════════════════════════════════════════════════ */
function _fuRng(seed) {
  /* >>> 0 e não Math.abs: o abs colava o seed −12345 ao +12345 e dava
     aos dois o mesmo avatar. O deslocamento sem sinal trata o número
     como os 32 bits que ele é e não perde nenhum. */
  let s = (((seed | 0) ^ 0x46554F) >>> 0) || 0x9e3779b9;
  return function (min, max) {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return min + (s % (max - min + 1));
  };
}

/* ═══════════════════════════════════════════════════════════════════
   O ARRANJO SAI DA FORMA DO DNA

   Havia duas maneiras de o escolher: sortear um dos quatro, ou deixá-lo
   SAIR dos genes. Escolhi a segunda, e a razão é a herança.

   Sorteado, o arranjo seria um número a mais no seed e os genes ficavam
   sem dizer nada sobre o que o avatar é — dois irmãos com genes
   parecidos podiam sair um equilibrado e outro extremo, e a cruza
   deixava de se notar na ficha.

   Saindo dos genes, a FORMA do DNA é a forma do avatar:

     genes todos parecidos   → equilibrado   d8 d8 d8 d8
     um gene destacado       → padrão        d10 d8 d8 d6
     dois altos, dois baixos → especialista  d10 d10 d6 d6
     um muito acima do resto → extremo       d12 d8 d6 d6

   E como o filho recebe um alelo de cada pai, cruzar dois equilibrados
   tende a dar um equilibrado. A genética passa a ter consequência na
   ficha sem ninguém ter de a programar duas vezes.
   ═══════════════════════════════════════════════════════════════════ */

/* A soma dos dois alelos de um gene. 0 a 10: um Comum sorteia alelos de
   0 a 3 (soma 0–6), um Lendário de 2 a 5 (soma 4–10). */
function fuSomaDoGene(dna, gene) {
  const g = dna && dna.genes && dna.genes[gene];
  if (!Array.isArray(g)) return 0;
  return (g[0] | 0) + (g[1] | 0);
}

/* Quão espalhados estão os quatro genes. É este número que escolhe o
   arranjo, e os cortes estão calibrados para a gama real: com alelos de
   0 a 5, a distância entre o maior e o menor gene vai de 0 a 10. */
function fuArranjoDoDna(dna) {
  const somas = FU_ATRIBS.map(a => fuSomaDoGene(dna, FU_GENE_DO_ATRIB[a]));
  const espalho = Math.max.apply(null, somas) - Math.min.apply(null, somas);
  if (espalho <= 1) return FU_ARRANJOS[0];   // equilibrado
  if (espalho <= 3) return FU_ARRANJOS[1];   // padrão
  if (espalho <= 5) return FU_ARRANJOS[2];   // especialista
  return FU_ARRANJOS[3];                     // extremo
}

/* ── A ORDEM ──

   O gene mais alto leva o dado maior. O empate desempata-se pelo SEED e
   não pela ordem da lista: sem isso, um avatar com os quatro genes
   iguais dava sempre DES alta e VON baixa, e a primeira posição da
   lista valia meio dado de vantagem a toda a população. */
function fuOrdemDosAtributos(dna, seed) {
  const rnd = _fuRng(seed);
  return FU_ATRIBS
    .map(a => ({ a, soma: fuSomaDoGene(dna, FU_GENE_DO_ATRIB[a]), desempate: rnd(0, 999) }))
    .sort((x, y) => (y.soma - x.soma) || (y.desempate - x.desempate))
    .map(x => x.a);
}

/* ═══════════════════════════════════════════════════════════════════
   A COR DÁ O TIPO, E A COSTURA DÁ A FRAQUEZA

   A regra que faz os dois sistemas encaixarem é a COR NÃO DAR FRAQUEZA
   NENHUMA. Se o tipo trouxesse a vulnerabilidade atrás, a desvantagem
   já vinha escolhida pela cor — e é a desvantagem que paga a vantagem.

   Portanto: o tom diz de que o bicho é FEITO (o dano que dá, o dano que
   aguenta) e a costura diz onde o Véu não fechou quando ele atravessou.
   São duas perguntas diferentes e sorteiam-se em separado.

   Consequência que vale a pena: a cor não denuncia a fraqueza. Dois
   irmãos vermelhos podem ter costuras diferentes, e descobrir a do
   inimigo é para isso que a acção de ESTUDAR existe no manual.
   ═══════════════════════════════════════════════════════════════════ */
function fuTipoDaCor(corIdx) {
  const i = corIdx | 0;
  return FU_TIPO_DA_COR[i] || FU_TIPOS[0];
}

function fuTipoDoDna(dna) {
  const c = dna && dna.genes && dna.genes.cor;
  return fuTipoDaCor(Array.isArray(c) ? c[0] : 0);
}

/* A costura: um dos oito tipos, nunca o que o avatar resiste.

   O físico fica de fora da lista toda — é o golpe comum que toda a
   gente dá, e um avatar a levar o dobro dele não seria um avatar
   interessante, seria um avatar mau. */
function fuCosturaDoDna(dna, seed) {
  const meu = fuTipoDoDna(dna);
  const pool = FU_TIPOS.filter(t => t !== meu);
  return pool[_fuRng(seed ^ 0x5EA)(0, pool.length - 1)];
}

/* O vizinho na roda — a segunda resistência que o Raro ganha. */
function fuVizinhoDoTipo(tipo) {
  const i = FU_TIPOS.indexOf(tipo);
  return i === -1 ? FU_TIPOS[0] : FU_TIPOS[(i + 1) % FU_TIPOS.length];
}

/* ═══════════════════════════════════════════════════════════════════
   AS AFINIDADES

   Devolve sempre os NOVE tipos, mesmo os que não têm afinidade nenhuma.
   Um mapa com buracos obriga quem o lê a saber a lista de cor, e é
   assim que um tipo novo entra um dia sem ninguém dar por ele.

   A escada sobe com a raridade, e são as duas perícias que o manual já
   tem — Resistência a Dano e Absorção de Dano:

     Comum     resiste ao próprio tipo
     Raro      resiste ao próprio e ao vizinho na roda
     Lendário  ABSORVE o próprio tipo — cura-se com ele

   A absorção é forte, e o manual diz que deve vir acompanhada de uma
   vulnerabilidade que os espertos possam explorar. Vem: a costura.

   E a ordem de precedência é a do manual, não a nossa: a imunidade
   passa à frente da resistência e da vulnerabilidade, e a absorção
   passa à frente de tudo. Ter as duas ao mesmo tempo anula-se.
   ═══════════════════════════════════════════════════════════════════ */
function fuAfinidades(tipo, costura, raridade) {
  /* ── AS AFINIDADES SOMAM-SE, NÃO SE SOBREPÕEM ──

     Isto estava escrito ao contrário — cada linha escrevia por cima da
     anterior, e a costura, sendo a última, apagava sempre o que lá
     estivesse. Medido pela revisão: em 14,29% dos Raros a costura cai
     no vizinho da roda, e nesses o avatar passava a ser VULNERÁVEL a um
     tipo a que devia ser imune de efeito — um erro de quatro vezes num
     número que põe preço no bicho.

     E o comentário que aqui estava prometia justamente o contrário do
     que o código fazia, o que é a pior espécie de erro: quem viesse a
     seguir lia a promessa e não a conferia.

     O manual (p. 92) manda três regras, e agora estão as três:

       resistente E vulnerável   →  nem uma coisa nem outra
       imune                     →  passa à frente das duas
       absorve                   →  passa à frente de tudo

     Portanto junta-se PRIMEIRO o que cada fonte dá, e só no fim é que
     se resolve o conjunto. */
  const RS = {}, VU = {}, IM = {}, AB = {};

  // o que o tom dá
  if (raridade === 'Lendário') AB[tipo] = true;
  else                         RS[tipo] = true;

  // o que a raridade acrescenta: o vizinho na roda
  if (raridade === 'Raro' || raridade === 'Lendário') RS[fuVizinhoDoTipo(tipo)] = true;

  // e o que a costura tira
  if (costura) VU[costura] = true;

  const af = {};
  for (const d of FU_DANOS) {
    if (AB[d])                 af[d] = 'AB';   // a absorção vence tudo
    else if (IM[d])            af[d] = 'IM';   // depois a imunidade
    else if (RS[d] && VU[d])   af[d] = null;   // uma anula a outra
    else if (RS[d])            af[d] = 'RS';
    else if (VU[d])            af[d] = 'VU';
    else                       af[d] = null;
  }
  return af;
}

/* ── A RARIDADE SAI DO NÍVEL, E DE MAIS NADA ──

   Estava a ler o `raridadeDoSlot` global com recurso ao `slot.raridade`
   quando ele não existisse — e esse campo vem do avatarSlots, que o
   cliente escreve por inteiro. O próprio js/raridade.js tem uma nota a
   dizer que não se confia nele.

   O que a revisão mediu: o mesmo slot dava Lendário quando a ficha era
   carregada sozinha e Raro quando era carregada através do
   api/_genetica.js. Duas respostas para a mesma pergunta, conforme
   quem perguntava — e uma delas escolhida pelo jogador.

   Os dois degraus são estes e não mudam: 11 e 27. Escritos aqui, a
   ficha passa a responder sempre o mesmo, venha de onde vier. */
const FU_NIVEL_MAX      = 60;   // o tecto do manual (p. 302)
const FU_NIVEL_RARO     = 11;
const FU_NIVEL_LENDARIO = 27;

function fuRaridadeDoNivel(nivel) {
  const n = Math.max(1, nivel | 0);
  return n >= FU_NIVEL_LENDARIO ? 'Lendário' : n >= FU_NIVEL_RARO ? 'Raro' : 'Comum';
}

/* ═══════════════════════════════════════════════════════════════════
   A FICHA

   Seis fórmulas, todas do manual (p. 303). Aceita o slot inteiro —
   é ele que anda pelo jogo — e devolve tudo o que o combate precisa.
   ═══════════════════════════════════════════════════════════════════ */
function fuFicha(slot) {
  if (!slot) return null;

  const nascimento = slot.nascimento || null;
  const dna   = nascimento && nascimento.dna ? nascimento.dna : null;
  const seed  = (slot.seed || (nascimento && nascimento.seed) || 0) | 0;

  /* ── O TECTO DO NÍVEL ──
     O manual trava os NPCs em 60. O chão dele é 5 e o nosso é 1, porque
     um avatar chocado nasce no 1 e cresce até poder lutar — é o único
     sítio onde nos afastamos do manual, e de propósito.
     Sem tecto, um nível vindo do slot do cliente dava PV na ordem dos
     mil milhões: medido em 2 000 000 040. */
  const nivel = Math.min(FU_NIVEL_MAX, Math.max(1, slot.nivel | 0 || 1));

  /* ── UM DNA EM FALTA NÃO PODE PASSAR DESPERCEBIDO ──

     Sem isto, um slot sem certidão, com o dna vazio ou com os genes
     corrompidos devolvia uma ficha perfeitamente plausível —
     equilibrado 8/8/8/8, fogo, 50 PV — e ninguém dava por nada. A
     revisão testou quatro formas de corromper o DNA e as quatro deram
     exactamente o mesmo avatar.

     É uma assimetria que não se aguenta: este arquivo já grita alto
     quando o PROGRAMADOR se esquece de uma cor, e ficava calado quando
     os DADOS do jogador desaparecem. A ficha continua a sair — o jogo
     não pode parar — mas sai marcada, e quem a lê pode decidir. */
  const semDna = !dna || !dna.genes
              || !FU_ATRIBS.every(a => Array.isArray(dna.genes[FU_GENE_DO_ATRIB[a]]));

  const raridade = fuRaridadeDoNivel(nivel);

  // ── os quatro dados ──
  const arranjo = fuArranjoDoDna(dna);
  const ordem   = fuOrdemDosAtributos(dna, seed);
  const base = {};
  ordem.forEach((a, i) => { base[a] = arranjo.dados[i]; });

  const tipo = fuTipoDoDna(dna);
  /* A escolha do Lendário: fechar a costura, ou uma segunda vantagem.
     É a mesma decisão que o jogo já tinha com o nome de escolha do
     Ancião, e o gatilho é o mesmo número — Ancião e Lendário são os
     dois o nível 27. A metade que mexe na ficha é esta; a outra vive
     nas vantagens. */
  const fechou  = raridade === 'Lendário' && slot.escolhaAnciao === 'semDefeito';
  const costura = fechou ? null : fuCosturaDoDna(dna, seed);

  /* ── AS SEIS CONTAS ──

     São as do NPC e não as do jogador, e é uma decisão: os nossos
     avatares lutam dos dois lados da arena — hoje meus, amanhã inimigos
     de outro jogador no PvP. Duas fórmulas de PV para o mesmo bicho
     conforme o lado seria a mesma criatura a valer coisas diferentes
     consoante quem olha.

     A do NPC é a mais generosa das duas (nível × 2 em vez de nível), e
     é a certa para um jogo onde o combate é o que se faz. */
  const pvMax = nivel * 2 + base.VIG * 5;
  const pmMax = nivel     + base.VON * 5;

  return {
    // de onde veio
    seed, nivel, raridade,
    /* Verdadeiro quando o DNA não deu para ler. A ficha é de recurso e
       não vale nada — não se vende um avatar com isto ligado. */
    semDna,
    arranjo: arranjo.id,
    ordem,

    // os quatro dados, no tamanho BASE — o actual sai daqui menos os
    // estados, e quem os aplica é o motor, não a ficha
    DES: base.DES, PER: base.PER, VIG: base.VIG, VON: base.VON,

    // as seis contas
    pvMax,
    pmMax,
    crise:   Math.floor(pvMax / 2),
    /* BASE, e o nome di-lo. O manual manda a Defesa ser o tamanho do
       dado ACTUAL, e o actual é o base menos os estados que o avatar
       tem em cima. Quem aplica os estados é o motor, que tem o estado
       da luta; a ficha não o tem e não deve fingir que tem.
       Chamar-lhes `defesa` era convidar alguém a usá-los como se já
       fossem os finais — e o erro só apareceria no dia em que os
       estados entrassem. */
    defesaBase: base.DES,
    defMagBase: base.PER,
    iniciativa: Math.floor((base.DES + base.PER) / 2),

    // o que ele dá e o que lhe dói
    tipo,
    costura,
    afinidades: fuAfinidades(tipo, costura, raridade),

    /* O bónus de precisão do manual: nível a dividir por dez. Ao nível
       5 é zero, e é suposto ser — um avatar novo não acerta melhor por
       ser novo. */
    bonusPrecisao: Math.floor(nivel / 10),

    /* E o dano extra, que no manual sobe aos níveis 20 e 40 e aqui sobe
       com a RARIDADE, nos mesmos degraus que tudo o resto: 11 e 27. É a
       mesma regra, cronometrada pelo relógio deste jogo. */
    danoExtra: raridade === 'Lendário' ? 10 : raridade === 'Raro' ? 5 : 0,
  };
}

/* A ESCOLHA DO LENDÁRIO VIVE DENTRO DO fuFicha.

   Eram duas funções — uma que a lia e outra que não — as duas
   exportadas e as duas no global. Quem chamasse a errada obtinha um
   avatar com a costura que o dono já tinha fechado, e a própria
   auditoria chamava a errada em cinco das seis secções.

   Uma porta só, e lê sempre a escolha. */

/* Uma lista escrita à mão ao lado de outra: se alguém acrescentar uma
   cor ao js/cores.js e esquecer o tipo dela aqui, o avatar nasce sem
   tipo de dano e ninguém percebe porquê. Grita ao carregar. */
if (typeof CORES_RODA !== 'undefined' && FU_TIPO_DA_COR.length !== CORES_RODA.length) {
  throw new Error('ficha-fu.js: são ' + CORES_RODA.length + ' cores e '
                + FU_TIPO_DA_COR.length + ' tipos.');
}

/* ── PARA O SERVIDOR TAMBÉM ──
   O api/_genetica.js carrega este arquivo para o Node poder compor a
   mesma ficha que o navegador compõe. Duas cópias da mesma conta
   acabariam por discordar, e a conta decide dinheiro. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FU_ATRIBS, FU_ARRANJOS, FU_TIPOS, FU_DANOS, FU_DADOS,
    FU_TIPO_DA_COR, FU_GENE_DO_ATRIB,
    fuSubirDado, fuDescerDado, fuSomaDoGene, fuArranjoDoDna,
    fuOrdemDosAtributos, fuTipoDaCor, fuTipoDoDna, fuCosturaDoDna,
    fuVizinhoDoTipo, fuAfinidades, fuRaridadeDoNivel, fuFicha,
    FU_NIVEL_MAX, FU_NIVEL_RARO, FU_NIVEL_LENDARIO,
  };
}
