// ═══════════════════════════════════════════════════════════════════
// TEXTOS DA ARENA — motor Fabula Ultima
// Português do Brasil e inglês.
//
// Chave própria (`af.`) e não a do `pve.`: as duas arenas convivem
// enquanto a antiga ainda corre o jogo, e uma chave partilhada entre
// motores diferentes acaba a dizer a coisa errada num deles.
// ═══════════════════════════════════════════════════════════════════

window.registerStrings({
  // ── o palco ──
  'af.titulo':        'BATALHA',
  'af.ronda':         'Rodada {n}',
  'af.vez':           'Sua vez',
  'af.vez_dele':      'Vez do inimigo',
  'af.menu.abrir':    'O que fazer neste turno',
  'af.ja_agiu':       'já agiu nesta rodada',
  'af.ficha.abrir':   'Ver a ficha de {nome}',

  // ── os cinco lugares ──
  'af.lugar.comum':       'Golpe Comum',
  'af.lugar.forte':       'Magia Forte',
  'af.lugar.muito_forte': 'Magia Muito Forte',
  'af.lugar.defesa':      'Defesa',
  'af.lugar.suporte':     'Suporte',
  'af.orbe.mover':    'Trocar de lugar',
  'af.orbe.voltar':   'Voltar',
  'af.orbe.todos':    'Todos',
  'af.pm':            '{n} PM',
  'af.pm.sem':        'sem PM',
  'af.gratis':        'grátis',

  // ── escolher ──
  'af.alvo.inimigo':  'Em quem cai?',
  'af.alvo.aliado':   'Quem recebe?',
  'af.mover.com':     'Trocar com quem?',
  'af.alvo.frente':   'o da frente cobre os outros',

  // ── o lance ──
  'af.lance.acerta':  '{r} contra {dl}',
  'af.lance.critico': 'CRÍTICO',
  'af.lance.pifao':   'PIFÃO',
  'af.lance.falhou':  'não acertou',
  'af.lance.dano':    '−{n} de vida',
  'af.lance.nada':    'sem dano',
  'af.lance.cura':    '+{n} de vida',
  'af.lance.pm':      '−{n} PM',
  'af.lance.pmGanho': '+{n} PM',
  'af.lance.estado':  'ficou {e}',
  'af.lance.caiu':    '{nome} caiu',
  'af.lance.salvou':  'a Misericórdia segurou-o num ponto de vida',
  'af.lance.dreno':   'bebeu {n} de vida',
  'af.lance.derrubou':'foi derrubado do ar',
  'af.lance.guardar': '{nome} pôs-se em guarda',
  'af.lance.mover':   '{nome} trocou de lugar com {com}',
  'af.lance.cena':    '{nome} lançou {magia}',
  'af.lance.suspiro': 'o Último Suspiro de {nome}',
  'af.lance.devasta': 'Devastação em {nome}',
  'af.lance.ronda':   '— rodada {n} —',
  'af.lance.comeca':  '{nome} começa',

  /* ── O QUE O MEU GOLPE LHE FAZ ──
     Estas são a pergunta ANTES do golpe, e as `af.af.*` logo abaixo são
     a resposta DEPOIS dele. São quatro e quatro, e dizem a mesma
     afinidade nos dois tempos — por isso não podem partilhar chave: um
     "resistiu" numa seta que ainda não bateu em ninguém seria o passado
     a fazer-se de futuro. */
  'af.vs.VU':   'vulnerável a {tipo}: leva o DOBRO do golpe de {nome}',
  'af.vs.RS':   'resiste a {tipo}: leva METADE do golpe de {nome}',
  'af.vs.IM':   'imune a {tipo}: o golpe de {nome} não lhe faz nada',
  'af.vs.AB':   'absorve {tipo}: o golpe de {nome} CURA-O',
  'af.vs.nada': 'leva o {tipo} de {nome} por inteiro',

  // ── as afinidades, ditas em palavras ──
  'af.af.RS':         'resistiu',
  'af.af.VU':         'vulnerável!',
  'af.af.IM':         'imune',
  'af.af.AB':         'absorveu',

  // ── o fim ──
  'af.fim.ganhou':    'A colónia resistiu.',
  'af.fim.perdeu':    'A Fratura levou a melhor.',
  'af.fim.empate':    'Não sobrou ninguém.',
  'af.fim.sair':      'Voltar',

  // ── a ficha ──
  'af.f.vida':        'Vida',
  'af.f.magia':       'Magia',
  'af.f.crise':       'Crise',
  'af.f.defesa':      'Defesa',
  'af.f.defmag':      'Def. Mágica',
  'af.f.costura':     'Costura',

  // ── os seis estados ──
  'af.est.atordoado':  'atordoado',
  'af.est.enfurecido': 'enfurecido',
  'af.est.envenenado': 'envenenado',
  'af.est.abalado':    'abalado',
  'af.est.lento':      'lento',
  'af.est.fraco':      'fraco',

  // ── os nove tipos de dano ──
  'af.tipo.fisico':  'físico',
  'af.tipo.fogo':    'fogo',
  'af.tipo.terra':   'terra',
  'af.tipo.raio':    'raio',
  'af.tipo.ar':      'ar',
  'af.tipo.gelo':    'gelo',
  'af.tipo.veneno':  'veneno',
  'af.tipo.luz':     'luz',
  'af.tipo.treva':   'treva',

  /* ── OS NOMES DAS MAGIAS ──
     Só as que têm nome fixo. A Barragem e o Concentrado mudam de nome com
     o tipo do avatar (Ignis, Glacies, Beijo do Breu…) e esses vivem no
     js/magias-fu.js, ao lado dos números deles — são oito de cada e
     estarem aqui também era a mesma lista escrita duas vezes. */
  'af.m.golpe':          'Golpe Comum',
  'af.m.sopro':          'Sopro',
  'af.m.sopro_maldito':  'Sopro Maldito',
  'af.m.devastacao':     'Devastação',
  'af.m.concha':         'Concha',
  'af.m.barreira':       'Barreira',
  'af.m.misericordia':   'Misericórdia',
  'af.m.lamber':         'Lamber Feridas',
  'af.m.curar':          'Curar',
  'af.m.despertar':      'Despertar',

  /* ══ O BLOCO, NO PADRÃO DO MANUAL ══

     O manual escreve cada criatura sempre com as mesmas linhas pela
     mesma ordem: cabeçalho, descrição, traços, atributos, defesas e
     afinidades, e depois as secções — ataques básicos, magias, outras
     acções, regras especiais. Cada acção é uma linha de campos separados
     por ✦, com o efeito por baixo.

     Seguir esse padrão tem um ganho que não é arrumação: quem sabe ler
     o manual sabe ler a ficha, e quem aprende a ficha sabe ler o
     manual. */
  'af.b.nv':            'Nv {n}',
  'af.b.tracos':        'Traços típicos',
  'af.b.init':          'Init.',
  'af.b.def':           'DEF',
  'af.b.mdef':          'M.DEF',
  'af.b.pv':            'PV',
  'af.b.pm':            'PM',
  'af.b.tr.tipo':       'golpeia com {tipo}',
  /* "ao" e não "a": dos nove tipos de dano três são femininos (terra,
     luz, treva) e saía "costurado ao terra". Sem artigo nenhum serve os
     nove, e lê-se como "alérgico a pólen". */
  'af.b.tr.costura':    'costurado a {tipo}',
  'af.b.tr.origem':     'saído de ovo {origem}',
  'af.sec.basicos':     'ATAQUES BÁSICOS',
  'af.sec.magias':      'MAGIAS',
  'af.sec.outras':      'OUTRAS AÇÕES',
  'af.sec.especiais':   'REGRAS ESPECIAIS',

  /* ── O QUE ESTÁ ACONTECENDO ──

     Uma linha por coisa que está a mexer nos números DESTE avatar, agora.
     Vive no bloco da ficha, e não flutua por cima da cabeça: o céu do
     palco leva a MARCA (uma palavra, para se ver de longe quem está
     como) e a ficha leva a explicação.

     Separar as duas coisas é o ponto. Uma etiqueta a dizer "Atordoado"
     por cima de um bicho não diz o que isso faz, e uma etiqueta que
     dissesse "o dado de Perspicácia desce um tamanho" não caberia no
     céu nem se leria a correr. */
  'af.sec.agora':      'O QUE ESTÁ ACONTECENDO',
  'af.ag.morde1':      'o dado de {a} desce um tamanho',
  'af.ag.morde2':      'os dados de {a} e {b} descem um tamanho',
  'af.ag.guarda':      'Em guarda',
  'af.ag.guarda.ef':   'metade do dano que receber, até ao começo do próximo turno dele',
  'af.ag.crise':       'Em crise',
  'af.ag.crise.ef':    'metade da vida ou menos — e há efeitos que só acordam aqui',
  'af.ag.voo':         'No ar',
  'af.ag.voo.ef':      'um golpe corpo a corpo não lhe chega; a magia chega',
  'af.ag.chao':        'No chão',
  'af.ag.chao.ef':     'foi derrubado do ar; levanta-se no fim da rodada',
  'af.ag.concha.ef':   'resiste a dano físico',
  'af.ag.barreira.ef': 'a Defesa dele é, no mínimo, {n}',
  'af.ag.mercy.ef':    'o golpe que o derrubaria deixa-o com um ponto de vida',
  'af.ag.desperta.ef': 'o dado de {a} subiu um tamanho',

  'af.b.instantaneo':   'Instantâneo',
  'af.b.cena':          'Dura a batalha',
  /* Guardar NÃO dura a batalha: dura até ao começo do turno seguinte de
     quem guardou, e o motor levanta-o lá (ver o fuNovaRonda). Dizia "dura
     a batalha" porque copiei o campo das magias de cena — e prometer
     metade do dano durante a batalha toda é prometer o dobro do que ela
     dá. */
  'af.b.ate_turno':     'Até ao próximo turno',
  'af.b.pm_alvo':       '{n} PM × alvo',
  'af.b.sem_rolagem':   'sem rolagem',
  'af.b.alvo.inimigo1': 'Um inimigo',
  'af.b.alvo.inimigo3': 'Até três inimigos',
  'af.b.alvo.inimigoT': 'Todos os inimigos',
  'af.b.alvo.proprio':  'O próprio',
  'af.b.alvo.aliado1':  'Um companheiro',
  'af.b.alvo.aliado3':  'Até três companheiros',

  'af.b.ef.dano':        'O alvo sofre 【HR + {n}】 de dano de {tipo}.',
  'af.b.ef.dano_cada':   'Cada alvo sofre 【HR + {n}】 de dano de {tipo}.',
  'af.b.ef.dano_fixo':   'Cada alvo sofre {n} de dano de {tipo}, sem rolagem e sem Defesa que valha.',
  'af.b.ef.estado':      'O alvo fica {e}.',
  'af.b.ef.estado_cada': 'Cada alvo fica {e}.',
  'af.b.ef.oportunidade':'Oportunidade: o alvo fica {e}.',
  'af.b.ef.oportunidade_cada':'Oportunidade: cada alvo fica {e}.',
  'af.b.ef.ignora':      'Ignora resistências — mas não a imunidade nem a absorção.',
  'af.b.ef.corpo':       'Corpo a corpo: só alcança quem estiver à frente.',
  'af.b.ef.cura':        'O alvo recupera {n} de vida.',
  'af.b.ef.cura_proprio':'Recupera {n} de vida.',
  'af.b.ef.cura_cada':   'Cada alvo recupera {n} de vida.',
  'af.b.ef.resisteFisico':'Passa a resistir a dano físico.',
  'af.b.ef.defesaMinima':'A Defesa do alvo passa a ser, no mínimo, {n}.',
  'af.b.ef.defesaMinima_cada':'A Defesa de cada alvo passa a ser, no mínimo, {n}.',
  'af.b.ef.misericordia':'O golpe que o derrubaria deixa-o com um ponto de vida. Acontece uma vez, e desfaz-se.',
  'af.b.ef.subirDado':   'O maior atributo do alvo sobe um tamanho de dado, até ao d12.',

  'af.b.guardar':       'Guardar',
  'af.b.guardar.ef':    'Metade do dano que receber, até ao começo do próximo turno dele.',
  'af.b.mover':         'Trocar de lugar',
  'af.b.mover.alvo':    'Um companheiro',
  'af.b.mover.ef':      'Troca de posto com um companheiro. Gasta o turno de quem se mexe, e não o dos dois.',
  'af.b.turno':         'Gasta o turno',

  // ── A FICHA, o que ela mostra ──
  'af.f.sexo.F':      'fêmea',
  'af.f.sexo.M':      'macho',
  'af.f.sem_dna':     'DNA ilegível — esta ficha é de recurso',
  'af.f.segunda':     'se ficar com a costura',
  'af.f.costura_desc': 'O tipo de dano a que ele é vulnerável: leva o dobro. É o preço da vantagem, e o inimigo tem de o descobrir.',
  'af.f.precisao':    'Precisão',
  'af.f.dano_extra':  'Dano extra',
  'af.f.subidas':     '{n} subida de dado',
  'af.f.subidas_p':   '{n} subidas de dado',
  'af.f.subida_de':   'do ovo {origem}',
  'af.f.subida_nv':   'do nível {n}',
  'af.f.subida_nvs':  'dos níveis {lista}',
  'af.f.subida_e':    ' e ',
  'af.f.subida_tecto': '{n} sem sítio onde caber — os dados estão no tecto',
  'gt.subiu_dado':    'Um dado subiu: {a} d{de} → d{para}',

  'af.arr.equilibrado':  'Equilibrado',
  'af.arr.padrao':       'Padrão',
  'af.arr.especialista': 'Especialista',
  'af.arr.extremo':      'Extremo',

  'af.at.DES': 'Destreza',
  'af.at.PER': 'Perspicácia',
  'af.at.VIG': 'Vigor',
  'af.at.VON': 'Vontade',

  /* ── AS TRÊS LETRAS ──
     O motor chama-lhes DES, PER, VIG e VON em toda a parte, e essas são
     chaves e não texto — mudar-lhes o nome era mudar o motor. Mas o bloco
     mostra-as em letra grande, quatro vezes por ficha e outra vez dentro
     de cada 【 】, e um leitor de inglês via quatro siglas portuguesas
     onde o manual dele escreve DEX, INS, MIG e WLP. */
  'af.ab.DES': 'DES',
  'af.ab.PER': 'PER',
  'af.ab.VIG': 'VIG',
  'af.ab.VON': 'VON',

  // ── AS DOZE VANTAGENS ──
  // O nome é nosso; a habilidade é do manual, e o `manual` de cada
  // entrada no js/vantagens-fu.js diz de qual veio.
  'afv.guarda_cerrada.nome': 'Guarda Cerrada',
  'afv.guarda_cerrada.desc': 'Soma {a} à Defesa e {b} à Defesa Mágica. O DNA escolhe qual dos dois leva o dois: reforça-se o lado em que ele já é melhor.',
  'afv.carne_teimosa.nome':  'Carne Teimosa',
  'afv.carne_teimosa.desc':  'Dez pontos de vida a mais. Ao nível 5 são um sexto do total; ao nível 60 são pouco mais do que um golpe.',
  'afv.pele_calada.nome':    'Pele Calada',
  'afv.pele_calada.desc':    'Não apanha {a} nem {b}. Quem tentar impor-lhe um dos dois gasta o turno e não acontece nada.',
  'afv.voo_baixo.nome':      'Voo Baixo',
  'afv.voo_baixo.desc':      'Um golpe corpo-a-corpo não lhe chega — mas a magia chega. Vem ao chão em crise, e quando apanha dano da própria costura.',
  'afv.fonte_funda.nome':    'Fonte Funda',
  'afv.fonte_funda.desc':    'Dez pontos de magia a mais.',
  'afv.veia_avida.nome':     'Veia Ávida',
  'afv.veia_avida.desc':     'Recupera 5 de magia sempre que um golpe lhe dói. Um golpe aparado pela imunidade não lhe dá nada.',
  'afv.furia_da_crise.nome': 'Fúria da Crise',
  'afv.furia_da_crise.desc': 'Com a vida em metade ou menos, o dano dele passa a ignorar resistências. A imunidade e a absorção continuam a valer.',
  'afv.ultimo_suspiro.nome': 'Último Suspiro',
  'afv.ultimo_suspiro.desc': 'Ao cair, leva 10 de vida a cada inimigo de pé, do seu próprio tipo.',
  'afv.golpe_pesado.nome':   'Golpe Pesado',
  'afv.golpe_pesado.desc':   'Cinco de dano a mais no golpe comum — o que não custa magia nenhuma.',
  'afv.mira_treinada.nome':  'Mira Treinada',
  'afv.mira_treinada.desc':  'Mais três na precisão {lado}. O DNA escolhe: quem tem os dados do corpo maiores treina-se a bater, quem tem os da mente treina-se a lançar.',
  'afv.mira.golpe':          'do golpe',
  'afv.mira.magia':          'das magias',
  'afv.sede_funda.nome':     'Sede Funda',
  'afv.sede_funda.desc':     'O golpe comum devolve-lhe metade do que tirou. Só ferindo, e nunca de um golpe que o inimigo absorveu.',
  'afv.golpe_certeiro.nome': 'Golpe Certeiro',
  'afv.golpe_certeiro.desc': 'O golpe comum mira a Defesa Mágica em vez da Defesa.',

  /* ── O QUE VEIO DO js/i18n-magias.js ──
     Os três feitios. Saíram de lá e vieram para aqui porque já nada do
     3D&T os usa — o feitio é do DNA e não das regras, e ia desaparecer
     com um arquivo que não tem nada a ver com ele.

     A frase de cada um (`.ex`) era o `title` de uma linha dourada, e
     passou a ser a DESCRIÇÃO do bloco: a primeira coisa que se lê, como
     no manual. */
  'af.f.feitio':      'feitio de {i}',
  'af.indole.guarda':      'Guarda',
  'af.indole.sustentacao': 'Sustentação',
  'af.indole.lamina':      'Lâmina',
  'af.indole.guarda.ex':      'Guarda — nasce para aguentar. Tende a vantagens que seguram o golpe.',
  'af.indole.sustentacao.ex': 'Sustentação — nasce para durar. Tende a vantagens de reserva e de fôlego.',
  'af.indole.lamina.ex':      'Lâmina — nasce para bater. Tende às vantagens que fazem o golpe doer.',
}, {
  'af.titulo':        'BATTLE',
  'af.ronda':         'Round {n}',
  'af.vez':           'Your turn',
  'af.vez_dele':      'Enemy turn',
  'af.menu.abrir':    'What to do this turn',
  'af.ja_agiu':       'already acted this round',
  'af.ficha.abrir':   "See {nome}'s sheet",

  'af.lugar.comum':       'Basic Strike',
  'af.lugar.forte':       'Strong Spell',
  'af.lugar.muito_forte': 'Very Strong Spell',
  'af.lugar.defesa':      'Defence',
  'af.lugar.suporte':     'Support',
  'af.orbe.mover':    'Swap places',
  'af.orbe.voltar':   'Back',
  'af.orbe.todos':    'All',
  'af.pm':            '{n} MP',
  'af.pm.sem':        'no MP',
  'af.gratis':        'free',

  'af.alvo.inimigo':  'Who takes it?',
  'af.alvo.aliado':   'Who receives it?',
  'af.mover.com':     'Swap with whom?',
  'af.alvo.frente':   'the one in front covers the others',

  'af.lance.acerta':  '{r} against {dl}',
  'af.lance.critico': 'CRITICAL',
  'af.lance.pifao':   'FUMBLE',
  'af.lance.falhou':  'missed',
  'af.lance.dano':    '−{n} HP',
  'af.lance.nada':    'no damage',
  'af.lance.cura':    '+{n} HP',
  'af.lance.pm':      '−{n} MP',
  'af.lance.pmGanho': '+{n} MP',
  'af.lance.estado':  'is now {e}',
  'af.lance.caiu':    '{nome} went down',
  'af.lance.salvou':  'Mercy held them at one hit point',
  'af.lance.dreno':   'drank {n} HP',
  'af.lance.derrubou':'was forced to land',
  'af.lance.guardar': '{nome} took guard',
  'af.lance.mover':   '{nome} swapped places with {com}',
  'af.lance.cena':    '{nome} cast {magia}',
  'af.lance.suspiro': "{nome}'s Final Act",
  'af.lance.devasta': 'Devastation on {nome}',
  'af.lance.ronda':   '— round {n} —',
  'af.lance.comeca':  '{nome} goes first',

  'af.vs.VU':   'vulnerable to {tipo}: takes DOUBLE from {nome}',
  'af.vs.RS':   'resists {tipo}: takes HALF from {nome}',
  'af.vs.IM':   'immune to {tipo}: {nome} cannot hurt it',
  'af.vs.AB':   'absorbs {tipo}: {nome} HEALS it',
  'af.vs.nada': 'takes the full {tipo} of {nome}',

  'af.af.RS':         'resisted',
  'af.af.VU':         'vulnerable!',
  'af.af.IM':         'immune',
  'af.af.AB':         'absorbed',

  'af.fim.ganhou':    'The colony held.',
  'af.fim.perdeu':    'The Rift won this one.',
  'af.fim.empate':    'No one was left standing.',
  'af.fim.sair':      'Back',

  'af.f.vida':        'Hit Points',
  'af.f.magia':       'Mind Points',
  'af.f.crise':       'Crisis',
  'af.f.defesa':      'Defence',
  'af.f.defmag':      'Magic Defence',
  'af.f.costura':     'Seam',

  'af.est.atordoado':  'dazed',
  'af.est.enfurecido': 'enraged',
  'af.est.envenenado': 'poisoned',
  'af.est.abalado':    'shaken',
  'af.est.lento':      'slow',
  'af.est.fraco':      'weak',

  'af.tipo.fisico':  'physical',
  'af.tipo.fogo':    'fire',
  'af.tipo.terra':   'earth',
  'af.tipo.raio':    'bolt',
  'af.tipo.ar':      'air',
  'af.tipo.gelo':    'ice',
  'af.tipo.veneno':  'poison',
  'af.tipo.luz':     'light',
  'af.tipo.treva':   'dark',

  'af.m.golpe':          'Basic Strike',
  'af.m.sopro':          'Breath',
  'af.m.sopro_maldito':  'Cursed Breath',
  'af.m.devastacao':     'Devastation',
  'af.m.concha':         'Shell',
  'af.m.barreira':       'Barrier',
  'af.m.misericordia':   'Mercy',
  'af.m.lamber':         'Lick Wounds',
  'af.m.curar':          'Heal',
  'af.m.despertar':      'Awaken',

  'af.b.nv':            'Lv {n}',
  'af.b.tracos':        'Typical traits',
  'af.b.init':          'Init.',
  'af.b.def':           'DEF',
  'af.b.mdef':          'M.DEF',
  'af.b.pv':            'HP',
  'af.b.pm':            'MP',
  'af.b.tr.tipo':       'strikes with {tipo}',
  'af.b.tr.costura':    'seamed to {tipo}',
  'af.b.tr.origem':     'hatched from a {origem} egg',
  'af.sec.basicos':     'BASIC ATTACKS',
  'af.sec.magias':      'SPELLS',
  'af.sec.outras':      'OTHER ACTIONS',
  'af.sec.especiais':   'SPECIAL RULES',

  'af.sec.agora':      'WHAT IS HAPPENING',
  'af.ag.morde1':      'the {a} die drops one size',
  'af.ag.morde2':      'the {a} and {b} dice drop one size',
  'af.ag.guarda':      'Guarding',
  'af.ag.guarda.ef':   'half of any damage taken, until the start of their next turn',
  'af.ag.crise':       'In Crisis',
  'af.ag.crise.ef':    'half health or less — and some effects only wake up here',
  'af.ag.voo':         'Airborne',
  'af.ag.voo.ef':      'a melee blow cannot reach them; magic can',
  'af.ag.chao':        'Grounded',
  'af.ag.chao.ef':     'forced to land; gets up at the end of the round',
  'af.ag.concha.ef':   'resists physical damage',
  'af.ag.barreira.ef': 'their Defence is at least {n}',
  'af.ag.mercy.ef':    'the blow that would fell them leaves them at one hit point',
  'af.ag.desperta.ef': 'the {a} die has grown one size',

  'af.b.instantaneo':   'Instantaneous',
  'af.b.cena':          'Lasts the battle',
  'af.b.ate_turno':     'Until their next turn',
  'af.b.pm_alvo':       '{n} MP × target',
  'af.b.sem_rolagem':   'no roll',
  'af.b.alvo.inimigo1': 'One enemy',
  'af.b.alvo.inimigo3': 'Up to three enemies',
  'af.b.alvo.inimigoT': 'All enemies',
  'af.b.alvo.proprio':  'Self',
  'af.b.alvo.aliado1':  'One ally',
  'af.b.alvo.aliado3':  'Up to three allies',

  'af.b.ef.dano':        'The target suffers 【HR + {n}】 {tipo} damage.',
  'af.b.ef.dano_cada':   'Each target suffers 【HR + {n}】 {tipo} damage.',
  'af.b.ef.dano_fixo':   'Each target suffers {n} {tipo} damage, with no roll and no Defence to stop it.',
  'af.b.ef.estado':      'The target becomes {e}.',
  'af.b.ef.estado_cada': 'Each target becomes {e}.',
  'af.b.ef.oportunidade':'Opportunity: the target becomes {e}.',
  'af.b.ef.oportunidade_cada':'Opportunity: each target becomes {e}.',
  'af.b.ef.ignora':      'Ignores Resistances — but not Immunity or Absorption.',
  'af.b.ef.corpo':       'Melee: only reaches whoever stands in front.',
  'af.b.ef.cura':        'The target recovers {n} HP.',
  'af.b.ef.cura_proprio':'Recovers {n} HP.',
  'af.b.ef.cura_cada':   'Each target recovers {n} HP.',
  'af.b.ef.resisteFisico':'Gains Resistance to physical damage.',
  'af.b.ef.defesaMinima':"The target's Defence becomes at least {n}.",
  'af.b.ef.defesaMinima_cada':"Each target's Defence becomes at least {n}.",
  'af.b.ef.misericordia':'The blow that would fell them leaves them at one hit point. Once, then it is spent.',
  'af.b.ef.subirDado':   "The target's highest Attribute grows by one die size, up to d12.",

  'af.b.guardar':       'Guard',
  'af.b.guardar.ef':    'Half of any damage taken, until the start of their next turn.',
  'af.b.mover':         'Swap places',
  'af.b.mover.alvo':    'One ally',
  'af.b.mover.ef':      'Swaps place with an ally. Costs the turn of whoever moves, not both.',
  'af.b.turno':         'Costs the turn',

  'af.f.sexo.F':      'female',
  'af.f.sexo.M':      'male',
  'af.f.sem_dna':     'Unreadable DNA — this sheet is a fallback',
  'af.f.segunda':     'if it keeps the seam',
  'af.f.costura_desc': 'The damage type it is vulnerable to: double damage. It is what the advantage costs, and the enemy has to find it.',
  'af.f.precisao':    'Accuracy',
  'af.f.dano_extra':  'Extra damage',
  'af.f.subidas':     '{n} die-size upgrade',
  'af.f.subidas_p':   '{n} die-size upgrades',
  'af.f.subida_de':   'from the {origem} egg',
  'af.f.subida_nv':   'from level {n}',
  'af.f.subida_nvs':  'from levels {lista}',
  'af.f.subida_e':    ' and ',
  'af.f.subida_tecto': '{n} with nowhere to go — the dice are capped',
  'gt.subiu_dado':    'A die went up: {a} d{de} → d{para}',

  'af.arr.equilibrado':  'Even',
  'af.arr.padrao':       'Standard',
  'af.arr.especialista': 'Specialist',
  'af.arr.extremo':      'Extreme',

  'af.at.DES': 'Dexterity',
  'af.at.PER': 'Insight',
  'af.at.VIG': 'Might',
  'af.at.VON': 'Willpower',
  'af.ab.DES': 'DEX',
  'af.ab.PER': 'INS',
  'af.ab.VIG': 'MIG',
  'af.ab.VON': 'WLP',

  'afv.guarda_cerrada.nome': 'Closed Guard',
  'afv.guarda_cerrada.desc': 'Adds {a} to Defence and {b} to Magic Defence. The DNA picks which one gets the two: it reinforces the side it is already better at.',
  'afv.carne_teimosa.nome':  'Stubborn Flesh',
  'afv.carne_teimosa.desc':  'Ten more hit points. At level 5 that is a sixth of the total; at level 60 it is little more than one blow.',
  'afv.pele_calada.nome':    'Quiet Skin',
  'afv.pele_calada.desc':    'Never becomes {a} or {b}. Anyone trying to inflict either spends the turn for nothing.',
  'afv.voo_baixo.nome':      'Low Flight',
  'afv.voo_baixo.desc':      'A melee blow cannot reach it — but magic can. It comes down in Crisis, and when struck by its own seam.',
  'afv.fonte_funda.nome':    'Deep Well',
  'afv.fonte_funda.desc':    'Ten more mind points.',
  'afv.veia_avida.nome':     'Greedy Vein',
  'afv.veia_avida.desc':     'Recovers 5 MP whenever a blow actually hurts. A blow stopped by immunity gives it nothing.',
  'afv.furia_da_crise.nome': 'Crisis Fury',
  'afv.furia_da_crise.desc': 'At half health or less, its damage ignores Resistances. Immunity and Absorption still apply.',
  'afv.ultimo_suspiro.nome': 'Final Breath',
  'afv.ultimo_suspiro.desc': 'On falling, takes 10 HP from every enemy still standing, of its own damage type.',
  'afv.golpe_pesado.nome':   'Heavy Blow',
  'afv.golpe_pesado.desc':   'Five extra damage on the basic strike — the one that costs no magic.',
  'afv.mira_treinada.nome':  'Trained Aim',
  'afv.mira_treinada.desc':  'Plus three to {lado} accuracy. The DNA picks: bigger body dice train it to strike, bigger mind dice train it to cast.',
  'afv.mira.golpe':          'strike',
  'afv.mira.magia':          'spell',
  'afv.sede_funda.nome':     'Deep Thirst',
  'afv.sede_funda.desc':     'The basic strike returns half of what it took. Only when it wounds, and never from a blow the enemy absorbed.',
  'afv.golpe_certeiro.nome': 'True Strike',
  'afv.golpe_certeiro.desc': 'The basic strike targets Magic Defence instead of Defence.',

  'af.f.feitio':      '{i} bent',
  'af.indole.guarda':      'Ward',
  'af.indole.sustentacao': 'Endurance',
  'af.indole.lamina':      'Blade',
  'af.indole.guarda.ex':      'Ward — born to hold. Leans to advantages that absorb the blow.',
  'af.indole.sustentacao.ex': 'Endurance — born to last. Leans to advantages of reserve and second wind.',
  'af.indole.lamina.ex':      'Blade — born to strike. Leans to advantages that make the blow hurt.',
});
