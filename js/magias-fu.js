// ═══════════════════════════════════════════════════════════════════
//  AS MAGIAS — Fabula Ultima
//
//  Cinco lugares por avatar, três degraus de raridade. O primeiro lugar
//  — o golpe comum — não tem magia nenhuma: sobe por número, porque não
//  há magia para trocar. Os outros quatro trocam de magia ao subir.
//
//  ── DE ONDE VEM CADA UMA ──
//
//  Doze das dezoito casas vêm do manual sem um número mexido. As que
//  levam `nosso: true` são as seis que tivemos de escrever, e todas
//  seguem o molde de uma que já lá estava — não há mecânica inventada,
//  há um tipo de dano trocado.
//
//  ── O QUE ABRE QUANDO ──
//
//  Os cinco lugares abrem TODOS ao nível 5, quando o avatar fica JOVEM
//  e pode lutar. Nunca se ganha um lugar novo: melhora-se o que já se
//  tem, e quem decide o degrau é a raridade, que sai do nível.
//
//    Comum      5–10    nv 1
//    Raro      11–26    nv 2
//    Lendário  27 +     nv 3
// ═══════════════════════════════════════════════════════════════════

const FU_LUGARES = ['comum', 'forte', 'muito_forte', 'defesa', 'suporte'];

/* ── O NOME E O ESTADO DE CADA TIPO ──

   A linha das barragens é latina e é a do manual — Ignis, Fulgur,
   Glacies, Terra, Ventus, Umbra, Lux. Serve as duas línguas sem
   tradução, que é meio caminho andado num jogo bilingue.

   Falta a do veneno, que o manual não tem: fica VENENUM, no mesmo
   registo e pela mesma regra de formação.

   O ESTADO de cada tipo sai do que o manual dá como oportunidade de
   cada magia, e onde ele não se aplica ao nosso combate escolhi o mais
   próximo: o Ventus derruba quem voa e aqui ninguém voa, portanto fica
   lento; o Terra tira uma acção e aqui um turno é uma acção, portanto
   também. */
/* ── MENOS ESTADOS REPETIDOS (14/09/2026) ──
   Eram só quatro estados para oito elementos: terra, ar e gelo davam todos
   Lento. O motor tem seis, e dois não eram usados por magia nenhuma. Fogo
   passa a Enfurecido (a raiva do fogo: −1 dado em Destreza e Percepção) e
   Terra passa a Fraco (o peso da terra: −1 dado em Vigor). Os oito
   elementos usam agora os seis estados. */
const FU_ELEMENTAL = {
  fogo:   { nome: 'Ignis',    estado: 'enfurecido' },
  terra:  { nome: 'Terra',    estado: 'fraco'      },
  raio:   { nome: 'Fulgur',   estado: 'atordoado'  },
  ar:     { nome: 'Ventus',   estado: 'lento'      },
  gelo:   { nome: 'Glacies',  estado: 'lento'      },
  veneno: { nome: 'Venenum',  estado: 'envenenado', nosso: true },
  luz:    { nome: 'Lux',      estado: 'atordoado'  },
  treva:  { nome: 'Umbra',    estado: 'abalado'    },
};

/* ── O GOLPE CONCENTRADO ──

   O manual escreve três — Flare (fogo), Thunderbolt (raio) e Iceberg
   (gelo) — e são a mesma magia com o tipo trocado: 20 PM, um alvo,
   HR+25, e ignora resistências.

   As outras cinco são nossas. E os nomes do manual estão em três
   registos diferentes (um latim, um inglês composto, um substantivo
   comum), o que num lugar ao lado da linha latina das barragens dava
   confusão: o jogador não saberia, ao ler, qual dos dois lugares estava
   a olhar.

   Ficam todos num registo só, em português e inglês — o que também os
   separa à vista da linha latina. O de fogo deixa de se chamar Flare e
   passa a Lança de Brasa; é o preço de os oito falarem a mesma língua.

   Os números são do manual e não se discutem; os nomes foram aprovados
   pelo dono do jogo em 12/09/2026, e passam a ser os nomes. */
const FU_CONCENTRADO = {
  fogo:   { nome: 'Lança de Brasa',   en: 'Emberlance'   },
  terra:  { nome: 'Peso do Mundo',    en: 'Worldweight',  nosso: true },
  raio:   { nome: 'Dedo do Trovão',   en: 'Thunderfinger' },
  ar:     { nome: 'Faca de Vento',    en: 'Windknife',    nosso: true },
  gelo:   { nome: 'Prego de Gelo',    en: 'Icenail'      },
  veneno: { nome: 'Sopro Apodrecido', en: 'Rotbreath',    nosso: true },
  luz:    { nome: 'Agulha de Luz',    en: 'Lightneedle',  nosso: true },
  treva:  { nome: 'Beijo do Breu',    en: 'Pitchkiss',    nosso: true },
};

/* ═══════════════════════════════════════════════════════════════════
   AS DEZOITO CASAS

   O `id` é a chave de tradução; o resto são os números que o motor lê.
   Nenhuma casa tem texto — quem diz ao jogador o que a magia faz é o
   i18n, e o motor nunca lê uma palavra.
   ═══════════════════════════════════════════════════════════════════ */
const FU_MAGIAS = {

  /* ── O GOLPE COMUM ──
     Sem custo e sempre disponível. Não troca de magia: sobe pelo dano
     extra da raridade, que o motor já soma (ver ficha.danoExtra). */
  comum: {
    1: { id: 'golpe', pm: 0, alvos: 1, fixo: 5, corpoACorpo: true, manual: 'p.303' },
    2: { id: 'golpe', pm: 0, alvos: 1, fixo: 5, corpoACorpo: true, manual: 'p.303' },
    3: { id: 'golpe', pm: 0, alvos: 1, fixo: 5, corpoACorpo: true, manual: 'p.303' },
  },

  /* ── ATAQUE FORTE — a barragem ──
     Espalha-se pela equipa inimiga. O manual escreve estas magias para
     grupos de três a cinco e a nossa formação é de três: uma barragem
     atinge o lado inteiro. */
  forte: {
    1: { id: 'sopro', pm: 5, alvos: 1, fixo: 10, manual: 'p.310' },
    /* Dano 10 por alvo (era 15) desde 19/09/2026. Por alvo ela causava
       quase o mesmo que o golpe concentrado, e em três de uma vez: era
       58% das ações de todo o Raro, e as lutas acabavam em três rodadas.
       Com 10, e com a IA do Médio guardando (FU_IA_NIVEIS), a luta do
       Raro vai a cinco ou seis rodadas e cada feitio volta a jogar do
       seu jeito. */
    2: { id: 'barragem', pm: 10, alvos: 3, porAlvo: true, fixo: 10,
         porTipo: 'elemental', manual: 'p.188 (adaptada: dano 10)' },
    /* O degrau do Lendário não traz números novos: traz o estado a
       acontecer SEMPRE, em vez de só no crítico. É o degrau mais barato
       da tabela inteira e provavelmente o mais sentido em jogo. */
    /* 15 PM por alvo (era 10) desde a calibragem de 14/09/2026: no nível 30
       a IA a lançava 75% das vezes e as lutas acabavam em três rodadas. */
    3: { id: 'barragem_certa', pm: 15, alvos: 3, porAlvo: true, fixo: 15,
         porTipo: 'elemental', estadoSempre: true, manual: 'p.188 (adaptada)' },
  },

  /* ── ATAQUE MUITO FORTE — o concentrado ──
     Um alvo, e dói. Separado da barragem de propósito: assim o jogador
     escolhe ENTRE os dois em cada turno, em vez de o segundo tornar o
     primeiro obsoleto. */
  muito_forte: {
    1: { id: 'sopro_maldito', pm: 10, alvos: 1, fixo: 15,
         porTipo: 'elemental', estadoSempre: true, manual: 'p.310' },
    /* 15 PM (era 20) desde a calibragem de 14/09/2026: pelo mesmo PM a
       Barragem rendia o triplo, e a IA usava o concentrado 1% das vezes. */
    2: { id: 'concentrado', pm: 15, alvos: 1, fixo: 25,
         ignoraResistencias: true, porTipo: 'concentrado', manual: 'p.188' },
    /* Devastação: sem rolagem e sem defesa que valha. É a única magia
       do jogo que não pergunta nada a ninguém — o manual reserva-a para
       campeões de nível 30+, e o nosso Lendário chega aos 27. */
    3: { id: 'devastacao', pm: 30, todos: true, danoFixo: 30,
         umaPorTurno: true, manual: 'p.310' },
  },

  /* ── DEFESA ──
     Aguentar. E é o lugar do da frente, que cobre os outros dois. */
  defesa: {
    /* A CONCHA resiste aos elementos dos inimigos em campo, e não ao
       físico. Resistia a físico, que só o golpe comum causa: protegia o
       Guarda justamente do ataque mais fraco. Agora protege do que machuca
       — as magias — e o golpe comum físico vira a resposta do inimigo. */
    1: { id: 'concha', pm: 10, proprio: true, cena: { resisteInimigos: true },
         manual: 'p.311 (adaptada: os elementos dos inimigos, não o físico)' },
    /* Piso fixo e não bónus: quem tem dado pequeno de Destreza ganha
       muito, quem já tem d12 não perde nada — o manual escreve-a assim
       de propósito, e é o que a torna uma magia de quem precisa. */
    /* A Barreira põe o piso na Defesa E na Defesa Mágica. Só na Defesa, só
       protegia do golpe comum: as magias miram a Defesa Mágica. */
    2: { id: 'barreira', pm: 5, alvos: 3, porAlvo: true, aliado: true,
         cena: { defesaMinima: 12, defMagMinima: 12 }, manual: 'p.208 (adaptada: as duas Defesas)' },
    /* PROTEGER, no lugar da Misericórdia (decidido pelo dono do jogo em
       14/09/2026). A Misericórdia custava 20 PM por um aliado e salvava com
       1 PV — adiava a queda um golpe. O Proteger faz do Guarda o que ele é:
       até o próximo turno dele, todo ataque contra o aliado escolhido cai
       nele, e com a Represália quem bate paga. A Devastação passa por cima. */
    3: { id: 'proteger', pm: 10, alvos: 1, aliado: true, proteger: true,
         manual: 'nosso (no lugar da Misericórdia, p.209)' },
  },

  /* ── SUPORTE ──
     Curar, limpar, levantar. */
  suporte: {
    /* ── E CHEGA A UM COMPANHEIRO, E NÃO SÓ A SI ──

       O manual (p.311) escreve o Lick Wounds em si mesmo: é um bicho a
       lamber as próprias feridas, e faz sentido numa criatura sozinha.

       Aqui não faz. O lugar do Suporte é o que distingue a Sustentação
       dos outros dois feitios (FU_LUGARES_DO_FEITIO), e o que ele dava
       a um avatar de Sustentação Comum era a capacidade de se curar a
       si próprio — exactamente a mesma coisa que qualquer um dos outros
       consegue fazendo nada e esperando. Punha-se um avatar atrás para
       ele cuidar da equipa, e ele só sabia cuidar de si.

       Passa a escolher um companheiro. A ESCOLHA INCLUI ELE PRÓPRIO,
       portanto não se perde nada do que o manual dava: ganha-se o que
       faltava. Os números não mexem — 5 PM, 20 de vida — e o degrau
       seguinte (Curar, 10 PM por alvo e 40 de vida em três) continua a
       ser claramente melhor.

       É o segundo desvio do manual neste arquivo, e o `nosso: true` das
       outras entradas marca os que são só de tipo de dano. Este é de
       regra, e por isso leva explicação e não uma etiqueta. */
    /* E as duas tiram um estado de cada alvo (14/09/2026). Até então só a
       Sustentação Lendária limpava estados, e um estado durava a luta. */
    /* Curas 15 e 30 (eram 20 e 40) desde a calibragem de 14/09/2026: com
       elas, as lutas dos níveis baixos passavam de 18 rodadas. */
    1: { id: 'lamber', pm: 5, alvos: 1, aliado: true, cura: 15, limpa: 1,
         manual: 'p.311 (adaptada: alvo aliado, não só o próprio; tira um estado)' },
    2: { id: 'curar', pm: 10, alvos: 3, porAlvo: true, aliado: true, cura: 30, limpa: 1,
         manual: 'p.209 (tira um estado)' },
    /* Despertar mexe na FICHA e não nos pontos: um d8 vira d10, e com
       ele sobem a defesa, a precisão e o dano. É a única magia do jogo
       que muda um atributo. */
    /* O DESPERTAR NOVO (19/09/2026): +6 de dano em todos os ataques de um
       aliado até o fim da luta, SEM GASTAR O TURNO, uma vez por luta.

       Ele subia um dado, e no Lendário todo avatar já tem d12 no maior: não
       fazia nada. Corrigido, continuava a não valer um turno — um turno da
       Sustentação Lendária é a Salus Magna, e nenhum efeito de suporte que
       custasse o turno inteiro a batia (medido: 41 a 50% de vitória contra
       56% sem usar). Livre de turno, usá-lo passa a render 7 a 9 pontos de
       vitória, e os três feitios ficam em 60/50/52% (aprovado pelo dono do
       jogo). `livre`: não gasta o turno e só se lança uma vez por luta. */
    3: { id: 'despertar', pm: 20, alvos: 1, aliado: true,
         cena: { danoMais: 6 }, livre: true, manual: 'nosso (no lugar do p.208)' },
  },
};

/* ══════════════════════════════════════════════════════════════════
   O ATAQUE FORTE MUDA COM O FEITIO

   Todos têm o ataque forte, porque é ele que alcança os de trás (ver o
   fuAlvosPossiveis, em js/combate-fu.js). O custo e os alvos são os
   mesmos para os três. O que muda é o dano e o que acontece DEPOIS do
   golpe, e é isso que dá a cada feitio um jeito próprio de usar a mesma
   magia:

     Guarda        ataca e se protege: fica guardando até o próximo turno,
                   sem recuperar PM. No Raro, põe em guarda também o
                   aliado mais ferido; no Lendário, a equipe inteira.
                   Troca dano por proteção: −2 no Sopro, −5 na Barragem.
     Lâmina        fura a guarda: o dano não é cortado pela metade. No
                   Raro, ignora também a resistência de quem está
                   guardando; no Lendário, a resistência de todos.
                   É quem bate: +3 no Sopro, +5 na Barragem.
     Sustentação   fere e cuida: cura o aliado mais ferido com metade do
                   dano causado. No Raro, a cura se divide entre os
                   feridos; no Lendário, tira também um estado.

   A Sustentação fica com o dano do manual de propósito: a cura dela é
   metade do dano causado, e cortar o dano cortaria a cura junto.

   Nenhuma das três reforça a luta que não acaba: a guarda do Guarda só
   vem atacando e sem PM, a Lâmina é o que desmonta quem só guarda, e a
   cura da Sustentação só existe quando ela fere.

   Aprovadas pelo dono do jogo em 14/09/2026. Uma variação por feitio; se
   fizerem falta mais, entram como escolha do jogador no nível 11.
   ══════════════════════════════════════════════════════════════════ */
const FU_ESTILO_FORTE = {
  guarda: {
    1: { fixoMais: -2, guardaAoAtacar: 'proprio' },   // era −3 (calibragem de 14/09/2026)
    2: { fixoMais: -5, guardaAoAtacar: 'proprio_e_ferido' },
    3: { fixoMais: -5, guardaAoAtacar: 'equipa' },
  },
  lamina: {
    1: { fixoMais: 3, furaGuarda: true },
    2: { fixoMais: 5, furaGuarda: true, semRSnaGuarda: true },
    3: { fixoMais: 5, furaGuarda: true, semRSnaGuarda: true, ignoraResistencias: true },
  },
  sustentacao: {
    1: { curaPorDano: 0.5 },
    // E rouba PM de cada alvo ferido (aprovado em 14/09/2026).
    2: { curaPorDano: 0.5, curaDividida: true, roubaPM: 3 },
    3: { curaPorDano: 0.5, curaDividida: true, limpaEstado: true, roubaPM: 5 },
  },
};

/* ── O NOME DO ATAQUE FORTE, POR FEITIO ──

   Os três feitios lançavam a mesma magia com o mesmo nome: um Guarda, um
   Lâmina e uma Sustentação de fogo diziam todos "Ignis", e a diferença
   só aparecia na descrição.

   A linha latina das barragens ganha uma segunda palavra, também latina,
   que serve as duas línguas sem tradução:

     Guarda        Scutum   escudo            Ignis Scutum
     Lâmina        Acies    gume              Ignis Acies
     Sustentação   Salus    saúde, salvação   Ignis Salus

   O Lendário acrescenta "grande", concordando com a palavra do feitio:
   Scutum é neutro (Magnum), Acies e Salus são femininas (Magna).

   O Sopro do Comum não é latino, e ganha um adjetivo nas duas línguas.

   Aprovados pelo dono do jogo em 14/09/2026. */
const FU_NOME_FORTE = {
  guarda:      { latim: 'Scutum', magno: 'Magnum', sopro: 'Sopro Protetor', soproEn: 'Guarding Breath' },
  lamina:      { latim: 'Acies',  magno: 'Magna',  sopro: 'Sopro Cortante', soproEn: 'Cutting Breath' },
  sustentacao: { latim: 'Salus',  magno: 'Magna',  sopro: 'Sopro Vital',    soproEn: 'Vital Breath' },
};

/* ── O DEGRAU DE UMA RARIDADE ── */
function fuDegrau(raridade) {
  return raridade === 'Lendário' ? 3 : raridade === 'Raro' ? 2 : 1;
}

/* ══════════════════════════════════════════════════════════════════
   DE QUEM É CADA LUGAR

   Trs lugares por avatar, e não cinco. Cada feitio tem o golpe comum, a
   magia forte, e o SEU.

     Guarda        comum · forte · defesa
     Lâmina        comum · forte · muito forte
     Sustentação   comum · forte · suporte

   ── PORQUE É QUE ISTO MUDOU ──

   Todos tinham os cinco. O feitio herdava-se dos pais, aparecia na ficha
   em letra dourada, e decidia UMA coisa: inclinava o sorteio da
   vantagem. Um avatar chamava-se Lâmina e curava tão bem como uma
   Sustentação.

   Pior do que isso: a formação tem papéis — o da frente defende, o de
   trás dá suporte — e nada os sustentava. Pôr um avatar atrás era
   geometria, porque qualquer um curava igual. Os postos eram um desenho
   sem regra por baixo.

   ── PORQUE É QUE DOIS FICAM EM TODOS ──

   O GOLPE COMUM é o chão: não custa PM e está sempre lá. Sem ele, um
   avatar sem magia não teria o que fazer no seu turno — e um turno em
   que não há nada a fazer não é uma decisão, é uma espera.

   A MAGIA FORTE é a Barragem, que varre a linha inteira. É a resposta a
   uma formação fechada (ver o fuAlvosPossiveis, em js/combate-fu.js):
   tirá-la a alguém deixava-o sem nada contra três inimigos em fila, e a
   formação passava a ser um muro em vez de uma pergunta.

   ── O QUE ISTO FAZ AOS LENDÁRIOS ──

   Antes, TODO o Lendário tinha a Devastação, o Despertar, a Misericórdia
   e a Barragem Certa — as quatro magias de topo do jogo, todas, sempre.
   Agora cada um tem UMA delas, e é o feitio que diz qual. A magia mais
   cara do jogo passa a ser coisa que se encontra num tipo de avatar, e
   não um carimbo que se recebe ao nível 27.
   ══════════════════════════════════════════════════════════════════ */
const FU_LUGARES_DO_FEITIO = {
  guarda:      ['comum', 'forte', 'defesa'],
  lamina:      ['comum', 'forte', 'muito_forte'],
  sustentacao: ['comum', 'forte', 'suporte'],
};

/* O lugar que é DELE, e só dele — o que o distingue dos outros dois.
   Serve a ficha, que o quer dizer numa linha. */
const FU_LUGAR_DO_FEITIO = {
  guarda: 'defesa', lamina: 'muito_forte', sustentacao: 'suporte',
};

/* Os lugares de uma ficha. Sem feitio — um avatar sem DNA legível — vale
   o do Guarda: é o que menos promete e o que mais o aguenta de pé.
   Dar-lhe os cinco seria premiar a ficha partida. */
function fuLugaresDe(ficha) {
  const f = ficha && ficha.feitio;
  return FU_LUGARES_DO_FEITIO[f] || FU_LUGARES_DO_FEITIO.guarda;
}

/* ═══════════════════════════════════════════════════════════════════
   A MAGIA DE UM AVATAR, NUM LUGAR

   Junta a casa da tabela com o que o avatar lhe traz: o tipo de dano da
   cor dele, o nome da variante e o estado que ela impõe.

   É esta função e mais nenhuma que decide o que um avatar tem em cada
   lugar. O motor recebe o objecto pronto e não sabe de tabelas.
   ═══════════════════════════════════════════════════════════════════ */
function fuMagiaDe(ficha, lugar) {
  // O feitio manda: um lugar que não é dele não existe para ele.
  if (fuLugaresDe(ficha).indexOf(lugar) === -1) return null;
  const casa = FU_MAGIAS[lugar] && FU_MAGIAS[lugar][fuDegrau(ficha.raridade)];
  if (!casa) return null;

  const m = Object.assign({}, casa, { lugar, tipo: ficha.tipo });

  if (casa.porTipo === 'elemental') {
    const e = FU_ELEMENTAL[ficha.tipo] || FU_ELEMENTAL.fogo;
    m.nome = e.nome;
    m.estado = e.estado;
  } else if (casa.porTipo === 'concentrado') {
    const c = FU_CONCENTRADO[ficha.tipo] || FU_CONCENTRADO.fogo;
    m.nome = c.nome;
    m.nomeEn = c.en;
    /* O estado do elemento, no crítico. O Sopro Maldito do Comum sempre o
       aplica, e o golpe concentrado do Raro não aplicava nunca: subir de
       degrau tirava uma coisa. Aprovado em 14/09/2026. */
    m.estado = (FU_ELEMENTAL[ficha.tipo] || FU_ELEMENTAL.fogo).estado;
  }

  // O jeito do feitio no ataque forte (ver FU_ESTILO_FORTE). Sem feitio
  // legível vale o do Guarda, como no fuLugaresDe.
  if (lugar === 'forte') {
    const doFeitio = FU_ESTILO_FORTE[ficha.feitio] || FU_ESTILO_FORTE.guarda;
    const est = doFeitio[fuDegrau(ficha.raridade)];
    if (est) {
      m.estilo = Object.assign({ feitio: FU_ESTILO_FORTE[ficha.feitio] ? ficha.feitio : 'guarda' }, est);
      if (est.ignoraResistencias) m.ignoraResistencias = true;
      // O dano do feitio entra no próprio `fixo`: a ficha, o menu, a IA e o
      // motor leem o número já com a diferença.
      if (est.fixoMais) m.fixo = (casa.fixo | 0) + est.fixoMais;
    }

    // E o nome do feitio (ver FU_NOME_FORTE).
    const nf = FU_NOME_FORTE[ficha.feitio] || FU_NOME_FORTE.guarda;
    const grau = fuDegrau(ficha.raridade);
    if (grau === 1) {
      m.nome = nf.sopro;
      m.nomeEn = nf.soproEn;
    } else {
      const base = (FU_ELEMENTAL[ficha.tipo] || FU_ELEMENTAL.fogo).nome;
      m.nome = base + ' ' + nf.latim + (grau === 3 ? ' ' + nf.magno : '');
      m.nomeEn = m.nome;
    }
  }
  return m;
}

/* Os lugares DESTE avatar, prontos a desenhar no menu.

   Devolve só os que ele tem — e não os cinco com buracos. Quem percorre
   isto desenha o menu, e um menu com entradas vazias é pior do que um
   menu curto: o jogador fica a olhar para uma opção que não é opção. */
function fuMagiasDe(ficha) {
  const out = {};
  for (const l of fuLugaresDe(ficha)) {
    const m = fuMagiaDe(ficha, l);
    if (m) out[l] = m;
  }
  return out;
}

/* Quanto custa mesmo, com o número de alvos que se escolheu. O manual
   escreve "10 × A" nas que cobram por alvo. */
function fuCusto(magia, nAlvos) {
  if (!magia) return 0;
  return (magia.pm | 0) * (magia.porAlvo ? Math.max(1, nAlvos | 0) : 1);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FU_LUGARES, FU_ELEMENTAL, FU_CONCENTRADO, FU_MAGIAS, FU_ESTILO_FORTE, FU_NOME_FORTE,
    FU_LUGARES_DO_FEITIO, FU_LUGAR_DO_FEITIO,
    fuDegrau, fuLugaresDe, fuMagiaDe, fuMagiasDe, fuCusto,
  };
}
