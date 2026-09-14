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
  'af.orbe.guardar':  'Guardar',
  'af.orbe.guardar.pm':    '½ dano · +{n} PM',
  'af.orbe.guardar.cheio': '½ dano',
  'af.orbe.voltar':   'Voltar',
  'af.fechar':        'Fechar',
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
  'af.lance.salvou':  'a Misericórdia o segurou em um ponto de vida',
  'af.lance.dreno':   'bebeu {n} de vida',
  'af.lance.derrubou':'foi derrubado do ar',
  'af.lance.guardar': '{nome} se pôs em guarda',
  'af.lance.guardar_pm': '{nome} se pôs em guarda e recuperou {n} PM',
  'af.lance.mover':   '{nome} trocou de lugar com {com}',
  'af.lance.cena':    '{nome} lançou {magia}',
  'af.lance.suspiro': 'o Último Suspiro de {nome}',
  'af.lance.devasta': 'Devastação em {nome}',
  'af.lance.ronda':   '— rodada {n} —',
  'af.lance.ultima':  '— rodada {n}, a última —',
  'af.lance.limite':  '— {max} rodadas sem vencedor —',
  'af.lance.comeca':  '{nome} começa',

  /* ── O QUE O MEU GOLPE LHE FAZ ──
     Estas são a pergunta ANTES do golpe, e as `af.af.*` logo abaixo são
     a resposta DEPOIS dele. São quatro e quatro, e dizem a mesma
     afinidade nos dois tempos — por isso não podem partilhar chave: um
     "resistiu" numa seta que ainda não bateu em ninguém seria o passado
     a fazer-se de futuro. */
  // Falam das MAGIAS: o golpe comum é físico e entra por inteiro em todos.
  'af.vs.VU':   'vulnerável a {tipo}: leva o DOBRO das magias de {nome}. O golpe comum é físico e entra normal.',
  'af.vs.RS':   'resiste a {tipo}: leva METADE das magias de {nome}. O golpe comum é físico e entra normal.',
  'af.vs.IM':   'imune a {tipo}: as magias de {nome} não fazem nada nele. O golpe comum é físico e fere.',
  'af.vs.AB':   'absorve {tipo}: as magias de {nome} CURAM ele. Use o golpe comum, que é físico e fere.',
  'af.vs.nada': 'leva as magias de {tipo} de {nome} por inteiro, e o golpe comum também',
  'af.lance.fisico': 'golpe físico, sem elemento',
  // O jeito do feitio no ataque forte.
  'af.lance.furou':        'furou a guarda',
  'af.lance.estilo_guarda':'{nome} fica em guarda até o próximo turno',
  'af.lance.estilo_cura':  '{nome} cuida de {alvo}',
  'af.lance.estilo_limpa': '{nome} não está mais {e}',
  // As regras dos feitios e as magias novas, no registro da batalha.
  'af.lance.represalia':   'Represália de {nome} em {alvo}',
  'af.lance.proteger':     '{nome} protege {alvo} até o próximo turno',
  'af.lance.protegeu':     '{nome} entra na frente do golpe contra {alvo}',
  'af.lance.muralha':      'a Muralha de {nome} segura a Barragem',
  'af.lance.roubou':       '{nome} rouba {n} PM de {alvo}',
  'af.lance.execucao':     'Execução +{n}',
  'af.lance.resiliu':      'a Resiliência segurou o golpe',
  'af.lance.frente':       'cuidar da frente',
  // As regras dos feitios, na seção REGRAS ESPECIAIS da ficha.
  'af.regra.guarda.nome':      'Represália',
  'af.regra.guarda.desc':      'Enquanto está guardando, quem o acerta leva {n} de dano físico de volta. Furar a guarda não evita; a Devastação não dispara.',
  'af.regra.lamina.nome':      'Execução',
  'af.regra.lamina.desc':      '+{n} de dano em todos os ataques contra quem está em crise (metade da vida ou menos).',
  'af.regra.sustentacao.nome': 'Resiliência',
  'af.regra.sustentacao.desc': 'Nenhum golpe tira dela mais que {n}% da vida máxima de uma vez.',
  'af.b.ef.estilo_guarda': 'Guarda: depois de atacar, fica guardando até o próximo turno, sem recuperar PM.',
  'af.b.ef.estilo_guarda2':'Guarda: depois de atacar, fica guardando até o próximo turno, e põe em guarda também o aliado mais ferido. Nenhum dos dois recupera PM.',
  'af.b.ef.estilo_guarda3':'Guarda: depois de atacar, põe a equipe inteira em guarda, cada um até o próprio próximo turno. Ninguém recupera PM.',
  'af.b.ef.estilo_fura':   'Lâmina: fura a guarda — o dano não é cortado pela metade.',
  'af.b.ef.estilo_fura_rs':'Em quem está guardando, ignora também a resistência.',
  'af.b.ef.estilo_cura':   'Sustentação: cura o aliado mais ferido com metade do dano causado.',
  'af.b.ef.estilo_cura_div':'Sustentação: cura metade do dano causado, começando pelo aliado mais ferido e passando para os outros.',
  'af.b.ef.estilo_limpa':  'Se ferir, tira um estado do aliado mais ferido que tiver algum.',

  // ── as afinidades, ditas em palavras ──
  'af.af.RS':         'resistiu',
  'af.af.VU':         'vulnerável!',
  'af.af.IM':         'imune',
  'af.af.AB':         'absorveu',

  // ── o fim ──
  'af.fim.ganhou':    'A colônia resistiu.',
  'af.fim.perdeu':    'A Fratura\nlevou a melhor.',
  'af.fim.empate':    'Não sobrou ninguém.',
  'af.fim.limite':    'Empate\nninguém venceu\nem {n} rodadas',
  'af.fim.sair':      'Fechar',

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
  'af.m.proteger':       'Proteger',
  'af.m.lamber':         'Lamber Feridas',
  'af.m.curar':          'Curar',
  'af.m.despertar':      'Despertar',

  /* ══ O BLOCO, NO PADRÃO DO MANUAL ══

     O manual escreve cada criatura sempre com as mesmas linhas pela
     mesma ordem: cabeçalho, descrição, traços, atributos, defesas e
     afinidades, e depois as seções — ataques básicos, magias, outras
     ações, regras especiais. Cada ação é uma linha de campos separados
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
  'af.sec.basicos':     'ATAQUES BÁSICOS',
  'af.sec.magias':      'MAGIAS',
  'af.sec.outras':      'OUTRAS AÇÕES',
  'af.sec.especiais':   'REGRAS ESPECIAIS',

  /* ── O QUE ESTÁ ACONTECENDO ──

     Uma linha por coisa que está mexendo nos números DESTE avatar, agora.
     Vive no bloco da ficha, e não flutua por cima da cabeça: o céu do
     palco leva a MARCA (uma palavra, para se ver de longe quem está
     como) e a ficha leva a explicação.

     Separar as duas coisas é o ponto. Uma etiqueta a dizer "Atordoado"
     por cima de um bicho não diz o que isso faz, e uma etiqueta que
     dissesse "o dado de Perspicácia desce um tamanho" não caberia no
     céu nem se leria correndo. */
  'af.sec.agora':      'O QUE ESTÁ ACONTECENDO',
  /* O TAMANHO tem de vir dito. "Desce um tamanho" é a regra, e a regra
     não responde à pergunta que o jogador faz ao ler: desce para quanto?
     A escada tem quatro degraus (d6 · d8 · d10 · d12) e quem chega ao jogo
     não a conhece — e mesmo quem a conhece não sabe de cor em que degrau
     está este bicho, porque os estados somam-se.
     O {d} vem medido do lutador, que é quem sabe. */
  'af.ag.dado':          '{a} em {d}',
  'af.ag.guarda':      'Em guarda',
  'af.ag.guarda.ef':     'Reduz pela metade todo o dano recebido até o início do próximo turno',
  'af.ag.crise':       'Em crise',
  'af.ag.crise.ef':      'Vida em {pv} de {max}, metade ou menos',
  'af.ag.protegendo':  'Protegendo',
  'af.ag.protegendo.ef': 'Os ataques contra o aliado protegido caem nele até o próximo turno',
  'af.ag.crise.nada':    'nenhuma vantagem dele muda em crise, mas a Execução de um Lâmina inimigo bate mais nele',
  'af.ag.costura.ef':    'Leva o dobro de dano de {tipo}',
  'af.ag.concha.ef':     'Resiste a {tipos}',
  'af.ag.barreira.ef':   'Defesa mínima: {n}',
  'af.ag.barreira2.ef':  'Defesa e Defesa Mágica mínimas: {n}',
  'af.ag.mercy.ef':      'Ao receber um golpe que o reduziria a 0 PV, fica com 1 PV',

  'af.b.instantaneo':   'Instantâneo',
  'af.b.cena':          'Dura a batalha',
  /* Guardar NÃO dura a batalha: dura até o começo do turno seguinte de
     quem guardou, e o motor levanta-o lá (ver o fuNovaRonda). Dizia "dura
     a batalha" porque copiei o campo das magias de cena — e prometer
     metade do dano durante a batalha toda é prometer o dobro do que ela
     dá. */
  'af.b.ate_turno':     'Até o próximo turno',
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
  'af.b.ef.defMagMinima':'A Defesa Mágica do alvo passa a ser, no mínimo, {n}.',
  'af.b.ef.defMagMinima_cada':'A Defesa Mágica de cada alvo passa a ser, no mínimo, {n}.',
  'af.b.ef.resisteInimigos':'Passa a resistir aos elementos de todos os inimigos de pé quando é lançada.',
  'af.b.ef.proteger':    'Até o próximo turno dele, todo ataque contra o aliado escolhido cai nele. A Devastação passa por cima.',
  'af.b.ef.cuidar_frente':'Cuidar da frente: em quem está na frente, a cura vale 50% a mais.',
  'af.b.ef.estilo_rouba':'Rouba {n} PM de cada alvo que ferir.',
  'af.b.ef.misericordia':'O golpe que o derrubaria para em um ponto de vida. Acontece uma vez, e depois se desfaz.',
  'af.b.ef.subirDado':   'O maior atributo do alvo sobe um degrau na escada dos dados (d6 · d8 · d10 · d12), até o teto de d12.',

  'af.b.guardar':       'Guardar',
  'af.b.guardar.ef':    'Metade do dano que receber, até o começo do próximo turno dele, e recupera PM igual ao dado de VON.',
  'af.b.mover':         'Trocar de lugar',
  'af.b.mover.alvo':    'Um companheiro',
  'af.b.mover.ef':      'Troca de posto com um companheiro. Gasta o turno de quem se mexe, e não o dos dois.',
  'af.b.turno':         'Gasta o turno',

  // ── A FICHA, o que ela mostra ──
  'af.f.sexo.F':      'fêmea',
  'af.f.sexo.M':      'macho',
  'af.f.sem_dna':     'DNA ilegível — esta ficha é de emergência',
  'af.f.segunda':     'se ficar com a costura',
  'af.f.costura_desc': 'O tipo de dano a que ele é vulnerável: leva o dobro. É o preço da vantagem, e o inimigo tem que descobrir qual é.',
  'af.f.precisao':    'Precisão',
  'af.f.dano_extra':  'Dano extra',
  'af.f.subidas':     '{n} subida de dado',
  'af.f.subidas_p':   '{n} subidas de dado',
  'af.f.subida_nv':   'do nível {n}',
  'af.f.subida_nvs':  'dos níveis {lista}',
  'af.f.subida_e':    ' e ',
  'af.f.subida_tecto': '{n} sem lugar onde caber — os dados estão no teto',
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
  'afv.guarda_cerrada.desc': 'Soma {a} à Defesa e {b} à Defesa Mágica. O DNA escolhe qual dos dois leva o dois: reforça o lado em que ele já é melhor.',
  'afv.carne_teimosa.nome':  'Carne Teimosa',
  'afv.carne_teimosa.desc':  'Dez pontos de vida a mais. No nível 5 são um sexto do total; no nível 60 são pouco mais que um golpe.',
  'afv.pele_calada.nome':    'Pele Calada',
  'afv.pele_calada.desc':    'Nunca fica {a} nem {b}. Quem tentar impor um dos dois gasta o turno e não acontece nada.',
  'afv.muralha.nome':        'Muralha',
  'afv.muralha.desc':        'Guardando na frente, as Barragens inimigas acertam só ele: os de trás ficam de fora.',
  'afv.fonte_funda.nome':    'Fonte Funda',
  'afv.fonte_funda.desc':    'Dez pontos de magia a mais.',
  'afv.veia_avida.nome':     'Veia Ávida',
  'afv.veia_avida.desc':     'Recupera 5 de magia sempre que um golpe dói nele. Um golpe barrado pela imunidade não dá nada.',
  'afv.toque_putrido.nome':  'Toque Pútrido',
  'afv.toque_putrido.desc':  'No crítico, todo ataque dele que fere deixa o alvo envenenado.',
  'afv.ultimo_suspiro.nome': 'Último Suspiro',
  'afv.ultimo_suspiro.desc': 'Ao cair, leva 10 de vida a cada inimigo de pé, do seu próprio tipo.',
  'afv.golpe_pesado.nome':   'Golpe Pesado',
  'afv.golpe_pesado.desc':   'Mais dano {lado}. O DNA escolhe: quem tem os dados do corpo maiores ganha 5 no golpe comum, quem tem os da mente ganha 3 nas magias.',
  'afv.dano.golpe':          'no golpe comum',
  'afv.dano.magia':          'nas magias',
  'afv.mira_treinada.nome':  'Mira Treinada',
  'afv.mira_treinada.desc':  'Mais três na precisão {lado}. O DNA escolhe: quem tem os dados do corpo maiores treina para bater, quem tem os da mente treina para lançar.',
  'afv.mira.golpe':          'do golpe',
  'afv.mira.magia':          'das magias',
  'afv.sede_funda.nome':     'Sede Funda',
  'afv.sede_funda.desc':     'O golpe comum devolve para ele metade do que tirou. Só ferindo, e nunca de um golpe que o inimigo absorveu.',
  'afv.golpe_certeiro.nome': 'Golpe Certeiro',
  'afv.golpe_certeiro.desc': 'O golpe comum mira a Defesa Mágica em vez da Defesa.',
  /* O resumo de cada vantagem, para a seção O QUE ESTÁ ACONTECENDO. A
     descrição inteira continua em REGRAS ESPECIAIS; aqui cabe uma linha. */
  'afv.guarda_cerrada.curto': '+{a} Defesa · +{b} Def. Mágica',
  'afv.carne_teimosa.curto': '+{n} PV máximos',
  'afv.pele_calada.curto': 'Imune a {a} e {b}',
  'afv.muralha.curto': 'Guardando na frente, a Barragem inimiga acerta só ele',
  'afv.fonte_funda.curto': '+{n} PM máximos',
  'afv.veia_avida.curto': 'Recupera {n} PM ao sofrer dano',
  'afv.toque_putrido.curto': 'No crítico, envenena quem ferir',
  'afv.ultimo_suspiro.curto': 'Ao cair, causa {n} de dano de {tipo} a cada inimigo de pé',
  'afv.golpe_pesado.curto': '+{n} de dano {lado}',
  'afv.mira_treinada.curto': '+{n} na precisão {lado}',
  'afv.sede_funda.curto': 'O golpe comum recupera metade do dano causado',
  'afv.golpe_certeiro.curto': 'O golpe comum mira a Defesa Mágica',

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
  'af.indole.lamina.ex':      'Lâmina — nasce para bater. Tende a vantagens que fazem o golpe doer.',
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
  'af.lugar.defesa':      'Defense',
  'af.lugar.suporte':     'Support',
  'af.orbe.mover':    'Swap places',
  'af.orbe.guardar':  'Guard',
  'af.orbe.guardar.pm':    '½ damage · +{n} MP',
  'af.orbe.guardar.cheio': '½ damage',
  'af.orbe.voltar':   'Back',
  'af.fechar':        'Close',
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
  'af.lance.guardar_pm': '{nome} took guard and recovered {n} MP',
  'af.lance.mover':   '{nome} swapped places with {com}',
  'af.lance.cena':    '{nome} cast {magia}',
  'af.lance.suspiro': "{nome}'s Final Act",
  'af.lance.devasta': 'Devastation on {nome}',
  'af.lance.ronda':   '— round {n} —',
  'af.lance.ultima':  '— round {n}, the last one —',
  'af.lance.limite':  '— {max} rounds with no winner —',
  'af.lance.comeca':  '{nome} goes first',

  'af.vs.VU':   "vulnerable to {tipo}: takes DOUBLE from {nome}'s spells. The basic strike is physical and lands normally.",
  'af.vs.RS':   "resists {tipo}: takes HALF from {nome}'s spells. The basic strike is physical and lands normally.",
  'af.vs.IM':   "immune to {tipo}: {nome}'s spells cannot hurt it. The basic strike is physical and does.",
  'af.vs.AB':   "absorbs {tipo}: {nome}'s spells HEAL it. Use the basic strike, which is physical and hurts.",
  'af.vs.nada': "takes {nome}'s {tipo} spells in full, and the basic strike too",
  'af.lance.fisico': 'physical strike, no element',
  'af.lance.furou':        'broke through the guard',
  'af.lance.estilo_guarda':'{nome} stays on guard until their next turn',
  'af.lance.estilo_cura':  '{nome} tends to {alvo}',
  'af.lance.estilo_limpa': '{nome} is no longer {e}',
  'af.lance.represalia':   "{nome}'s Retaliation on {alvo}",
  'af.lance.proteger':     '{nome} protects {alvo} until their next turn',
  'af.lance.protegeu':     '{nome} steps in front of the blow meant for {alvo}',
  'af.lance.muralha':      "{nome}'s Rampart holds the Barrage",
  'af.lance.roubou':       '{nome} steals {n} MP from {alvo}',
  'af.lance.execucao':     'Execution +{n}',
  'af.lance.resiliu':      'Resilience held the blow',
  'af.lance.frente':       'tending the front',
  'af.regra.guarda.nome':      'Retaliation',
  'af.regra.guarda.desc':      'While guarding, whoever hits them takes {n} physical damage back. Breaking the guard does not avoid it; Devastation does not trigger it.',
  'af.regra.lamina.nome':      'Execution',
  'af.regra.lamina.desc':      '+{n} damage on every attack against a target in Crisis (half health or less).',
  'af.regra.sustentacao.nome': 'Resilience',
  'af.regra.sustentacao.desc': 'No single blow takes more than {n}% of their max HP at once.',
  'af.b.ef.estilo_guarda': 'Guard: after attacking, stays on guard until their next turn, without recovering MP.',
  'af.b.ef.estilo_guarda2':'Guard: after attacking, stays on guard until their next turn and puts the most wounded ally on guard too. Neither recovers MP.',
  'af.b.ef.estilo_guarda3':'Guard: after attacking, puts the whole team on guard, each one until their own next turn. No one recovers MP.',
  'af.b.ef.estilo_fura':   'Blade: breaks through guard — the damage is not halved.',
  'af.b.ef.estilo_fura_rs':'Against a target on guard, also ignores Resistance.',
  'af.b.ef.estilo_cura':   'Sustain: heals the most wounded ally for half the damage dealt.',
  'af.b.ef.estilo_cura_div':'Sustain: heals half the damage dealt, starting with the most wounded ally and moving on to the others.',
  'af.b.ef.estilo_limpa':  'If it hurts someone, removes one status from the most wounded ally that has one.',

  'af.af.RS':         'resisted',
  'af.af.VU':         'vulnerable!',
  'af.af.IM':         'immune',
  'af.af.AB':         'absorbed',

  'af.fim.ganhou':    'The colony held.',
  'af.fim.perdeu':    'The Rift\nwon this one.',
  'af.fim.empate':    'No one was left standing.',
  'af.fim.limite':    'Draw\nno one won\nin {n} rounds',
  'af.fim.sair':      'Close',

  'af.f.vida':        'Hit Points',
  'af.f.magia':       'Mind Points',
  'af.f.crise':       'Crisis',
  'af.f.defesa':      'Defense',
  'af.f.defmag':      'Magic Defense',
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
  'af.m.proteger':       'Protect',
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
  'af.sec.basicos':     'BASIC ATTACKS',
  'af.sec.magias':      'SPELLS',
  'af.sec.outras':      'OTHER ACTIONS',
  'af.sec.especiais':   'SPECIAL RULES',

  'af.sec.agora':      'WHAT IS HAPPENING',
  'af.ag.dado':          '{a} at {d}',
  'af.ag.guarda':      'Guarding',
  'af.ag.guarda.ef':     'Takes half of all damage until the start of their next turn',
  'af.ag.crise':       'In Crisis',
  'af.ag.crise.ef':      'HP at {pv} of {max}, half or less',
  'af.ag.protegendo':  'Protecting',
  'af.ag.protegendo.ef': 'Attacks against the protected ally hit them instead until their next turn',
  'af.ag.crise.nada':    "none of their advantages change in Crisis, but an enemy Blade's Execution hits them harder",
  'af.ag.costura.ef':    'Takes double {tipo} damage',
  'af.ag.concha.ef':     'Resists {tipos}',
  'af.ag.barreira.ef':   'Minimum Defense: {n}',
  'af.ag.barreira2.ef':  'Minimum Defense and Magic Defense: {n}',
  'af.ag.mercy.ef':      'A blow that would drop them to 0 HP leaves them at 1 HP',

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
  'af.b.ef.dano_fixo':   'Each target suffers {n} {tipo} damage, with no roll and no Defense to stop it.',
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
  'af.b.ef.defesaMinima':"The target's Defense becomes at least {n}.",
  'af.b.ef.defesaMinima_cada':"Each target's Defense becomes at least {n}.",
  'af.b.ef.defMagMinima':"The target's Magic Defense becomes at least {n}.",
  'af.b.ef.defMagMinima_cada':"Each target's Magic Defense becomes at least {n}.",
  'af.b.ef.resisteInimigos':'Gains Resistance to the elements of every enemy standing when it is cast.',
  'af.b.ef.proteger':    'Until their next turn, every attack against the chosen ally hits them instead. Devastation goes over it.',
  'af.b.ef.cuidar_frente':'Tend the front: healing is worth 50% more on whoever stands in front.',
  'af.b.ef.estilo_rouba':'Steals {n} MP from each target it wounds.',
  'af.b.ef.misericordia':'The blow that would fell them leaves them at one hit point. Once, then it is spent.',
  'af.b.ef.subirDado':   "The target's highest Attribute climbs one step of the die ladder (d6 · d8 · d10 · d12), up to the d12 cap.",

  'af.b.guardar':       'Guard',
  'af.b.guardar.ef':    'Half of any damage taken, until the start of their next turn, and recovers MP equal to their WLP die.',
  'af.b.mover':         'Swap places',
  'af.b.mover.alvo':    'One ally',
  'af.b.mover.ef':      'Swaps places with an ally. Costs the turn of whoever moves, not both.',
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
  'afv.guarda_cerrada.desc': 'Adds {a} to Defense and {b} to Magic Defense. The DNA picks which one gets the two: it reinforces the side it is already better at.',
  'afv.carne_teimosa.nome':  'Stubborn Flesh',
  'afv.carne_teimosa.desc':  'Ten more hit points. At level 5 that is a sixth of the total; at level 60 it is little more than one blow.',
  'afv.pele_calada.nome':    'Quiet Skin',
  'afv.pele_calada.desc':    'Never becomes {a} or {b}. Anyone trying to inflict either spends the turn for nothing.',
  'afv.muralha.nome':        'Rampart',
  'afv.muralha.desc':        'While guarding in front, enemy Barrages hit only them: those behind are left out.',
  'afv.fonte_funda.nome':    'Deep Well',
  'afv.fonte_funda.desc':    'Ten more MP.',
  'afv.veia_avida.nome':     'Greedy Vein',
  'afv.veia_avida.desc':     'Recovers 5 MP whenever a blow actually hurts. A blow stopped by immunity gives it nothing.',
  'afv.toque_putrido.nome':  'Rotten Touch',
  'afv.toque_putrido.desc':  'On a critical, every attack of theirs that wounds leaves the target poisoned.',
  'afv.ultimo_suspiro.nome': 'Final Breath',
  'afv.ultimo_suspiro.desc': 'On falling, takes 10 HP from every enemy still standing, of its own damage type.',
  'afv.golpe_pesado.nome':   'Heavy Blow',
  'afv.golpe_pesado.desc':   'Extra damage {lado}. The DNA picks: bigger body dice give +5 on the basic strike, bigger mind dice give +3 on spells.',
  'afv.dano.golpe':          'on the basic strike',
  'afv.dano.magia':          'on spells',
  'afv.mira_treinada.nome':  'Trained Aim',
  'afv.mira_treinada.desc':  'Plus three to {lado} accuracy. The DNA picks: bigger body dice train it to strike, bigger mind dice train it to cast.',
  'afv.mira.golpe':          'strike',
  'afv.mira.magia':          'spell',
  'afv.sede_funda.nome':     'Deep Thirst',
  'afv.sede_funda.desc':     'The basic strike returns half of what it took. Only when it wounds, and never from a blow the enemy absorbed.',
  'afv.golpe_certeiro.nome': 'True Strike',
  'afv.golpe_certeiro.desc': 'The basic strike targets Magic Defense instead of Defense.',
  'afv.guarda_cerrada.curto': '+{a} Defense · +{b} Magic Defense',
  'afv.carne_teimosa.curto': '+{n} max HP',
  'afv.pele_calada.curto': 'Immune to {a} and {b}',
  'afv.muralha.curto': 'While guarding in front, enemy Barrages hit only them',
  'afv.fonte_funda.curto': '+{n} max MP',
  'afv.veia_avida.curto': 'Recovers {n} MP when damaged',
  'afv.toque_putrido.curto': 'On a critical, poisons whoever they wound',
  'afv.ultimo_suspiro.curto': 'On falling, deals {n} {tipo} damage to every standing enemy',
  'afv.golpe_pesado.curto': '+{n} damage {lado}',
  'afv.mira_treinada.curto': '+{n} to {lado} accuracy',
  'afv.sede_funda.curto': 'The basic strike heals half the damage dealt',
  'afv.golpe_certeiro.curto': 'The basic strike targets Magic Defense',

  'af.f.feitio':      '{i} bent',
  'af.indole.guarda':      'Ward',
  'af.indole.sustentacao': 'Endurance',
  'af.indole.lamina':      'Blade',
  'af.indole.guarda.ex':      'Ward — born to hold. Leans toward advantages that absorb the blow.',
  'af.indole.sustentacao.ex': 'Endurance — born to last. Leans toward advantages of reserve and second wind.',
  'af.indole.lamina.ex':      'Blade — born to strike. Leans toward advantages that make the blow hurt.',
});
