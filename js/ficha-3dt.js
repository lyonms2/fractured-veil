// ═══════════════════════════════════════════════════════════════════
// FICHA DO AVATAR ELEMENTAL — regras do 3D&T Alpha
//
// Substitui a ficha inventada (js/combate-ficha.js) pelas regras do
// Manual 3D&T Alpha, Edição Revisada (Jambô, 2011).
//
// Continua sendo FUNÇÃO PURA: nada é gravado, tudo sai do que o avatar
// já carrega — seed, raridade, elemento e nível. Um avatar que já existe
// ganha ficha nova no instante em que isto sobe, sem migração.
//
// ── O QUE VEM DO MANUAL ──
//   · quatro características, de 0 a 5 (pág. 22-27)
//   · cada ponto de personagem compra um ponto de característica (p. 922
//     do texto extraído: "cada ponto de personagem compra um ponto de
//     característica")
//   · 5 PVs e 5 PMs por cada ponto de Resistência
//   · escalões de poder: Novato 5, Lutador 7, Campeão 10, Lenda 12
//
// ── O QUE É NOSSO ──
//   · qual escalão corresponde a cada raridade
//   · o nível a comprar pontos ao longo do tempo
//   · a distribuição dos pontos sair do seed em vez de ser escolhida
//
// O Poder de Fogo fica de fora: avatares não usam armas nem ataques à
// distância. Sobram exatamente quatro características.
// ═══════════════════════════════════════════════════════════════════

const FICHA_CARACS = ['F', 'H', 'R', 'A'];

const FICHA_NOMES = {
  F: 'Força',        // dano corpo-a-corpo; entra na Força de Ataque
  H: 'Habilidade',   // iniciativa, esquiva; entra na FA e na FD
  R: 'Resistência',  // define PV e PM
  A: 'Armadura',     // defesa passiva; entra na Força de Defesa
};

/* ── UM BEBÊ VALE UM PONTO ──

   Começava em CINCO, que é o escalão Novato do manual: um lutador
   pequeno, mas já um lutador. Isso fazia do recém-nascido um adulto em
   miniatura — quatro características repartidas, vida a dobrar do
   mínimo — e o jogo diz que ele nasce POR FAZER: sem magia, sem
   virtude, sem defeito, e agora também sem pontos para gastar.

   Com um ponto, o bebé sai F1 H1 R1 A1, que é o piso do jogo. É pouco
   de propósito: ele não vai a lado nenhum com isso, e não precisa —
   bebê não luta (ver _pveImpedimentoDe, em js/combate-pve.js). */
const FICHA_PONTOS_BASE = 1;

/* A TABELA ANTIGA, E PORQUE SAIU DA CONTA.
   (Fica: o marketplace ainda a lê para mostrar o que cada degrau vale.)

   Enquanto a raridade nascia com o avatar e nunca mudava, dar-lhe
   pontos era justo: um Lendário era um bicho raro e começava Campeão.
   Agora a raridade CONQUISTA-SE ao mudar de fase (js/raridade.js), e se
   continuasse a pagar pontos o avatar ganhava cinco de uma só vez ao
   passar a Lendário — um nível 16 encontrava um nível 17 com quase o
   dobro dos pontos, num degrau que nenhuma fila de emparelhamento
   suaviza.

   Por isso a força fica toda no nível, que sobe de quatro em quatro
   pontos e não dá saltos. A raridade paga noutra moeda: corpo (asas,
   espinhos, aura) e o direito de ser vendido. */
const FICHA_PONTOS_RARIDADE = {
  'Comum':    5,   // Novato
  'Raro':     7,   // Lutador
  'Lendário': 10,  // Campeão
};

/* O nível compra pontos, como os Pontos de Experiência do manual.

   Era um ponto a cada QUATRO níveis, e isso funcionava quando se partia
   dos cinco. Partindo de um, a mesma cadência deixava o avatar em nove
   pontos ao nível 35 — nunca chegaria a Lendário, que pede doze
   (js/raridade.js), e o degrau mais alto do jogo ficava inalcançável.

   Um a cada DOIS níveis resolve, e a escada fica:

       nível  1    1 ponto    bebê, e não luta
       nível 15    8 pontos   RARO
       nível 23   12 pontos   LENDÁRIO
       nível 35   18 pontos   o tecto

   Os dezoito do tecto não são número novo: era exactamente o que um
   Lendário tinha ao nível 35 antes de todos passarem a nascer Comuns
   (dez de raridade mais oito de nível). O tecto do jogo volta ao que
   era; o que mudou foi o princípio, que agora é um recém-nascido a
   sério em vez de um adulto pequeno.

   E ser Lendário ao 23 deixa doze níveis para o ser — é um estado em
   que se vive, e não o último fotograma. */
const FICHA_NIVEIS_POR_PONTO = 2;

// Tecto por característica. O manual proíbe passar de 5 na criação, mas
// autoriza explicitamente subir depois com experiência — por isso o
// tecto acompanha os pontos ganhos por nível em vez de ser fixo.
//
// Sobre as Escalas de Poder (Ningen ×1, Sugoi ×10, Kiodai ×100, Kami
// ×1000): não são precisas aqui. São uma notação para não ter de
// escrever F300, e só mudam alguma coisa quando criaturas de escalas
// DIFERENTES se enfrentam. Todos os avatares são Ningen, e o máximo que
// atingem ao nível 35 é 13 — perfeitamente escrevível. As escalas ficam
// disponíveis se um dia houver chefes fora da escala humana.
// Tecto de cada característica na distribuição. O valor final leva
// ainda o +1 do piso, portanto um avatar de nível 1 chega a 6.
const FICHA_MAX_INICIAL = 5;

// Quantas características levam um primeiro ponto pago da bolsa, para
// nenhuma ficar em zero quando o orçamento já dá para isso.
const PISO_PAGO_N = 3;

const FICHA_PV_POR_R = 5;
const FICHA_PM_POR_R = 5;

// ── PISO DA RESISTÊNCIA ──
// Cuidado ao ler isto: já não é o que era, e o comentário antigo mentia.
//
// Nasceu para impedir R0 (que daria 0 PV, um avatar morto à nascença).
// Essa parte deixou de ser dele: o +1 somado no fim da distribuição já
// garante R≥1 para toda a gente. O que este piso ainda faz são DUAS
// coisas, e nenhuma delas é a original:
//
//   · o "1 +" garante um MÍNIMO DE 5 PV E 5 PM em combate. Eram dez
//     enquanto havia o piso de 1 somado a todas as características —
//     esse saiu, e o mínimo desceu para metade. Continua a não ser
//     zero, que é o que interessa: com R0 o avatar entrava em campo sem
//     vida nenhuma.
//
//   · o "floor(pontos/6)" faz o ESCALONAMENTO, e esse o +1 não dá por
//     ser uma constante. Sem ele, um avatar com foco em Habilidade
//     ficava preso na mesma vida do nível 1 ao 35 enquanto a Força dos
//     adversários subia até 8.
//
// Não é dar pontos de graça: são pontos do próprio orçamento, apenas
// com um mínimo garantido na Resistência.
function _pisoDeR(pontos) {
  return 1 + Math.floor(pontos / 6);
}

// ── A HABILIDADE NÃO TEM PISO PRÓPRIO ──
// Teve, enquanto o 0 era possível: com H0 o tecto H×5 dava 0 PMs e o
// avatar não lançava magia nenhuma. O +1 somado no fim resolveu isso —
// a Habilidade mínima passou a ser 1, e um tecto de 5 PMs já alcança
// magia.
//
// Alcança as de ataque e as de defesa, mas nem sempre o golpe forte,
// que é o mais caro. E isso deixou de ser um defeito para passar a ser
// o ponto: um avatar de Habilidade baixa nasce sem o seu golpe forte, e
// a ficha diz-lhe de quanta Habilidade precisa para o alcançar.
//
//   Comum nv1     27% nascem sem o golpe forte
//   Lendário nv1  13%
//   Comum nv35    13%  — o buraco fecha-se com o nível
//
// É a raridade a valer alguma coisa para além do número de pontos, e é
// uma razão concreta para subir de nível. O ataque e a defesa nunca
// faltam: essas gavetas têm magias baratas que cabem em qualquer tecto.

// ═══════════════════════════════════════════════════════════════════
// Gerador determinístico — mesmo LCG do resto do jogo, com constante
// própria para a ficha não ficar correlacionada com a aparência.
// ═══════════════════════════════════════════════════════════════════
function _fichaRng(seed) {
  let s = (Math.abs(seed | 0) ^ 0x3D74) >>> 0;
  s = Math.imul(s ^ (s >>> 15), 0x2C1B3C6D) >>> 0;
  s = Math.imul(s ^ (s >>> 13), 0x297A2D39) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return function (min, max) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return min + (((s >>> 16) * (max - min + 1)) >>> 16);
  };
}

function pontosDoAvatar(raridade, nivel) {
  // A raridade continua no argumento por causa dos muitos sítios que a
  // passam, mas já não entra na conta — ver FICHA_PONTOS_RARIDADE.
  const nv = Math.max(1, nivel || 1);
  return FICHA_PONTOS_BASE + Math.floor((nv - 1) / FICHA_NIVEIS_POR_PONTO);
}

// ═══════════════════════════════════════════════════════════════════
// fichaDeAvatar — a ficha completa
//
//   fichaDeAvatar(12345, 'Raro', 'Fogo', 10)
//   → { F:2, H:3, R:2, A:2, pv:10, pm:10, pontos:9, ... }
//
// Aceita também o objeto do slot:  fichaDeAvatar(avatarSlots[0])
// ═══════════════════════════════════════════════════════════════════
function fichaDeAvatar(seed, raridade, elemento, nivel, nascimento) {
  if (seed && typeof seed === 'object') {
    const s = seed;
    /* A certidao viaja com a ficha.

       Sem isto, quem so recebe a ficha nao consegue distinguir um bebe
       de um avatar do jogo antigo — e o magiasDoAvatar, que so recebe
       a ficha, tirava as magias aos dois ou a nenhum. A certidao e o
       que separa os dois casos, portanto tem de chegar la. */
    return fichaDeAvatar(s.seed || 0, s.raridade || 'Comum', s.elemento || 'Fogo',
                         s.nivel || 1, s.nascimento || null);
  }

  const pontosBase = pontosDoAvatar(raridade, nivel);

  /* Vantagem e desvantagem entram na MESMA bolsa: a desvantagem dá
     pontos, a vantagem custa, e o que sobra compra as características.
     É o que o manual faz — não são dois orçamentos separados.

     MAS SÓ A PARTIR DA CRIANÇA. Um recém-nascido não tem virtudes nem
     defeitos: tem-se de viver um bocado para os ganhar. Nasciam com ele
     e apareciam na ficha do primeiro dia, o que fazia do bebé um adulto
     pequeno em vez de um ser por fazer.

     São as MESMAS que ele terá sempre — saem do seed, e o seed não muda.
     A fase só decide quando aparecem. */
  const _faseF = (typeof faseFromNivel === 'function')
    ? faseFromNivel(nivel || 1)
    : ((nivel || 1) < 5 ? 0 : (nivel || 1) < 10 ? 1 : (nivel || 1) < 17 ? 2 : 3);
  // O feitio do avatar inclina qual virtude e qual defeito lhe saem.
  // Sem certidão vai nulo, e aí o sorteio é o limpo de sempre.
  const _indole = (typeof indoleDoDna === 'function' && nascimento && nascimento.dna)
    ? indoleDoDna(nascimento.dna) : null;
  const vd = (typeof sortearVantagens === 'function')
    ? sortearVantagens(seed, pontosBase, elemento, _indole) : null;

  /* O QUE A FASE ESCONDE É O PAR, E NÃO O ORÇAMENTO.

     Primeiro não sorteei o par nenhum antes da CRIANÇA, e isso partiu
     uma coisa que este ficheiro tinha custado a arranjar: a desvantagem
     DÁ pontos e a vantagem CUSTA, portanto o orçamento mudava ao nível 5
     e as características DESCIAM em 255 de 204.000 subidas.

     O par sai do seed e é dele desde sempre — o que a infância esconde
     é a virtude e o defeito, não o corpo com que ele nasceu. Por isso o
     orçamento conta com eles desde o primeiro dia, e só o par fica
     guardado até haver quem o mostre. */
  const vdVisivel = _faseF >= 1 ? vd : null;
  const pontos = vd ? vd.pontos : pontosBase;

  const nv     = Math.max(1, nivel || 1);
  const rnd    = _fichaRng(seed || 0);

  // Distribuição: os pontos vão um a um para uma característica sorteada.
  // Distribuir um a um em vez de sortear quatro números de uma vez é o
  // que garante que o total bate sempre certo com o orçamento.
  //
  // O sorteio é PESADO, não uniforme: o seed escolhe uma característica
  // de foco e outra de apoio, e essas saem mais vezes. Sem isso o
  // passeio aleatório achatava tudo e os avatares saíam todos 1/1/2/1 —
  // enquanto os personagens do próprio manual são pontudos (a Tasha do
  // exemplo é F0 H4 R3 A2). É a diferença entre ter fichas e ter builds.
  const foco  = FICHA_CARACS[rnd(0, 3)];
  let apoio   = FICHA_CARACS[rnd(0, 3)];
  if (apoio === foco) apoio = FICHA_CARACS[(FICHA_CARACS.indexOf(foco) + 1) % 4];

  /* ── QUEM MANDA NOS PESOS ──

     Os pesos eram do seed: um foco e um apoio sorteados, e mais nada
     por trás deles. Passam a ser do DNA quando o avatar tem certidão —
     é esta linha que faz do DNA uma tendência a sério em vez de um
     número guardado que ninguém lê.

     Repare no que NÃO muda: o orçamento de pontos é o mesmo, o sorteio
     ponto-a-ponto é o mesmo, os tectos são os mesmos. O DNA carrega os
     dados; não os substitui por uma resposta. Dois avatares com o mesmo
     DNA e seeds diferentes crescem diferentes, e um avatar com vocação
     para a Força pode na mesma acabar sem ela — só é pouco provável.

     O foco e o apoio continuam a ser sorteados mesmo quando não servem,
     para o resto da fila de sorteios cair sempre no mesmo sítio. Quem
     não tem certidão — todo o avatar do jogo antigo — cresce como
     sempre cresceu. */
  const tend = (nascimento && nascimento.dna && typeof tendenciaDoDna === 'function')
    ? tendenciaDoDna(nascimento.dna) : null;

  const peso = tend ? (k => tend[k] || 1)
                    : (k => k === foco ? 6 : k === apoio ? 3 : 1);

  /* Para onde este avatar puxa, por ordem, seja qual for a fonte dos
     pesos. Sai aqui e não na interface: quem desenha a ficha não tem de
     saber se a vocação veio do DNA ou do seed, e assim não há duas
     contas da mesma coisa à espera de divergirem. */
  const vocacao = FICHA_CARACS.slice().sort(
    (a, b) => peso(b) - peso(a) || FICHA_CARACS.indexOf(a) - FICHA_CARACS.indexOf(b));

  // ── SUBIR DE NÍVEL SÓ PODE SOMAR ──
  // A ficha é recalculada do zero a cada nível, e isso já lhe custou um
  // defeito: em 0,89% das subidas uma característica DESCIA. A culpa era
  // do tecto, que sobe com o nível — quando subia, um ponto que antes
  // tinha transbordado deixava de transbordar, e o sorteio inteiro
  // desalinhava para trás.
  //
  // A correção é dar a cada ponto O TECTO QUE VALIA NO NÍVEL EM QUE ELE
  // FOI GANHO. Os pontos que vêm da raridade valem todos do nível 1
  // (tecto 5); cada ponto ganho por nível traz consigo +1 de tecto. Assim
  // um nível novo acrescenta um sorteio ao fim da fila e nunca mexe nos
  // que já foram feitos.
  const pontosDeNivel = Math.floor((nv - 1) / FICHA_NIVEIS_POR_PONTO);
  const pontosNoNv1   = pontos - pontosDeNivel;
  // Quantos sorteios este avatar já fazia ao nascer. Vem do orçamento do
  // NÍVEL 1, que não muda nunca — se viesse do orçamento atual, o piso
  // da Resistência (que sobe de seis em seis pontos) deslocava o limiar
  // e voltava a desalinhar a fila. Foi assim que sobraram 1880
  // regressões depois da primeira correção.
  // Menos os pisos pagos, que não são sorteios: contam para o orçamento
  // mas não para a fila, e somá-los aqui deslocava o tecto de cada ponto.
  const sorteiosNoNv1 = Math.max(0, pontosNoNv1 - _pisoDeR(pontosNoNv1) - PISO_PAGO_N);

  /* ── O PISO DA RESISTÊNCIA SAIU DO SORTEIO ──

     Entrava como ponto de partida da R e o tecto dela subia junto, para
     compensar. Funcionava enquanto o piso mudava pouco: com o orçamento
     a ir de 5 a 13, ele cruzava dois degraus e ninguém dava por isso.

     Com o bebé a valer um ponto, o orçamento passou a ir de 1 a 18 e o
     piso a cruzar quatro. E cada vez que ele subia, o tecto da R subia
     com ele — um sorteio que antes transbordava deixava de transbordar,
     e a fila inteira desalinhava para trás. Resultado: 270 subidas de
     nível em 204.000 BAIXAVAM uma característica, e 300 baixavam a vida.
     O mesmo defeito que este ficheiro já tinha corrigido duas vezes,
     por uma porta diferente.

     Agora o piso não toca no sorteio: as quatro características correm a
     fila em pé de igualdade, comecando as quatro em zero e com o mesmo
     tecto, e o piso soma-se à R no fim — como o +1 já se somava a todas.

     Assim a invariante é estrutural e não casual: subir de nível ou
     acrescenta um sorteio ao fim da fila, ou sobe o piso e mais nada.
     Nenhum dos dois mexe num sorteio já feito. */
  const piso = _pisoDeR(pontos);
  const c = { F: 0, H: 0, R: 0, A: 0 };

  /* ── O PRIMEIRO PONTO DE CADA UMA, PAGO DA BOLSA ──

     Havia um +1 somado a todas no fim, POR FORA do orçamento. Saiu —
     com o bebé a valer um ponto, quatro pontos oferecidos faziam a
     ficha mentir sobre si própria.

     Só que apagar e mais nada partia o jogo em três sítios, e medi os
     três: 14% dos avatares chegavam ao nível 35 com Habilidade 0 — e
     com H0 o tecto H×5 é zero, portanto NENHUMA das quatro magias
     podia alguma vez ser lançada; 2.460 fichas ficavam sem defensiva
     alcançável; e 480 nasciam com o Toque Ardente e Armadura 0, que é
     uma vantagem que não faz nada.

     A saída é a que a Resistência já usava: um piso PAGO DA BOLSA. As
     três primeiras unidades que sobram depois do piso da R vão, uma
     cada, à Habilidade, à Força e à Armadura. Não é oferta: sai do
     orçamento, e o total continua a bater certo ao ponto.

     O bebé fica na mesma como o jogo diz que ele é — um ponto, e esse
     vai todo para a Resistência: F0 H0 R1 A0. Quem não tem, não dá.
     A partir do nível 7 a bolsa chega para as quatro, e aí acabam os
     zeros que desligam regras.

     A ordem é H, F, A e não é arbitrária: a Habilidade primeiro porque
     é a única cujo zero tranca o jogo todo (sem tecto não há magia
     nenhuma); depois a Força e a Armadura, que um zero só enfraquece.

     E não quebra a subida: cada ponto novo ou preenche o próximo piso
     por preencher, ou vai para o fim da fila do sorteio. Nunca mexe num
     que já foi dado. */
  const PISO_PAGO = ['H', 'F', 'A'];
  let sobra = pontos - piso;
  let pisosDados = 0;
  for (const k of PISO_PAGO) {
    if (sobra <= 0) break;
    c[k] = 1; sobra--; pisosDados++;
  }

  const porGastar = sobra;

  for (let i = 1; i <= porGastar; i++) {
    // Este é o i-ésimo ponto. Se veio do orçamento de nascença, tecto 5;
    // se veio de um nível, tecto 5 + quantos níveis já tinham passado.
    const tectoAqui = FICHA_MAX_INICIAL + Math.max(0, i - sorteiosNoNv1);
    const disponiveis = FICHA_CARACS.filter(k => c[k] < tectoAqui);
    if (!disponiveis.length) break;                      // tudo no tecto
    const total = disponiveis.reduce((t, k) => t + peso(k), 0);
    let alvo = rnd(1, total), k = disponiveis[0];
    for (const cand of disponiveis) { alvo -= peso(cand); if (alvo <= 0) { k = cand; break; } }
    c[k]++;
  }
  c.R += piso;

  const tecto = FICHA_MAX_INICIAL + pontosDeNivel;

  /* ── O PISO DE 1 SAIU ──

     Somava-se um ponto a cada uma das quatro características, no fim,
     por fora do orçamento. Existia porque um 0 desliga regras em
     silêncio: o crítico dobra a Força e a Armadura, e dobrar zero dá
     zero; a Habilidade manda no tecto H×5, e com H a zero não cabe
     magia nenhuma.

     Fazia sentido quando o orçamento começava nos cinco: quatro pontos
     por fora eram um retoque. Deixou de fazer no dia em que o bebé
     passou a valer UM — a ficha dizia um ponto e mostrava cinco, e a
     ficha a mentir sobre o próprio orçamento é pior do que qualquer
     regra que um zero desligue.

     O que o bebé mostra agora é o que ele tem: F0 H0 R1 A0. A única
     coisa que continua garantida é a Resistência, e essa é PAGA da
     bolsa (ver _pisoDeR) — sem ela um avatar entrava em campo com zero
     de vida, que não é uma ficha fraca, é uma ficha impossível. */

  // As vantagens de reserva dão PV ou PM como se a Resistência fosse
  // maior, sem mexer na R verdadeira.
  // O bónus é da vantagem, e o bebé ainda não a tem — por isso lê-se do
  // par visível. A vida sobe no dia em que ele a ganha, que é um ganho e
  // não uma regressão.
  const bonusPV = (vdVisivel && vdVisivel.vantagem.pvComoR) ? vdVisivel.vantagem.pvComoR : 0;
  const bonusPM = (vdVisivel && vdVisivel.vantagem.pmComoR) ? vdVisivel.vantagem.pmComoR : 0;
  const pv = (c.R + bonusPV) * FICHA_PV_POR_R;
  const pm = (c.R + bonusPM) * FICHA_PM_POR_R;

  return {
    seed: seed || 0,
    F: c.F, H: c.H, R: c.R, A: c.A,
    pv, pvMax: pv, pm, pmMax: pm,
    pontos, pontosBase, tecto,
    vantagem:    vdVisivel ? vdVisivel.vantagem    : null,
    desvantagem: vdVisivel ? vdVisivel.desvantagem : null,
    elemento, raridade, nivel: Math.max(1, nivel || 1),
    escalao: _escalaoDe(pontos),
    // Para onde puxa, de que sexo é, e com que feitio. Quem desenha a
    // ficha lê daqui.
    indole: (typeof indoleDominante === 'function' && nascimento && nascimento.dna)
      ? indoleDominante(nascimento.dna) : null,
    vocacao,
    sexo: (typeof sexoDoDna === 'function' && nascimento && nascimento.dna)
      ? sexoDoDna(nascimento.dna, seed)
      : (typeof _sexoDoSeed === 'function' ? _sexoDoSeed(seed) : 'F'),
    // A certidao, para quem so tem a ficha em maos.
    nascimento: nascimento || null,
  };
}

// O nome do escalão, para mostrar na ficha.
function _escalaoDe(pontos) {
  if (pontos <= 4)  return 'Pessoa Comum';
  if (pontos <= 6)  return 'Novato';
  if (pontos <= 9)  return 'Lutador';
  if (pontos <= 11) return 'Campeão';
  if (pontos <= 14) return 'Lenda';
  return 'Além da Lenda';
}

// ═══════════════════════════════════════════════════════════════════
// PODER — para emparelhar filas e ordenar rankings.
//
// Agora é simplesmente o total de pontos, que é a medida que o próprio
// manual usa para dizer se dois personagens são páreo. Substitui a
// fórmula que tínhamos inventado.
// ═══════════════════════════════════════════════════════════════════
function poderDoAvatar3dt(raridade, nivel) {
  return pontosDoAvatar(raridade, nivel);
}

function poderDaEquipa3dt(membros) {
  if (!Array.isArray(membros)) return 0;
  return membros.reduce((t, m) => (!m || m.dead) ? t : t + poderDoAvatar3dt(m.raridade, m.nivel), 0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { fichaDeAvatar, pontosDoAvatar, poderDoAvatar3dt, poderDaEquipa3dt,
                     FICHA_CARACS, FICHA_NOMES, FICHA_PONTOS_RARIDADE };
}
