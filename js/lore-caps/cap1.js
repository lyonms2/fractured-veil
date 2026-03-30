// ── Capítulo I — O Dia Seguinte ao Fim do Mundo (Comum) ──────────
LORE_CAPITULOS.push({
  id:       'dia_seguinte',
  titulo:   'Capítulo I — O Dia Seguinte ao Fim do Mundo',
  descricao:'2047. Três anos depois da 3ª Guerra Mundial. As bombas abriram Fracturas na realidade — e por elas vieram os Avatares. Mas também veio O Vácuo.',
  icone:    '☢️',
  raridade: 'Comum',
  anterior: null,
  cenas: {

    // ══════════════════════════════════════════════════
    // ETAPA 1 — O PRIMEIRO ENCONTRO
    // ══════════════════════════════════════════════════
    inicio: {
      texto: '2047. Três anos depois das bombas.\n\nO céu nunca mais voltou a ser azul. É dessa cor agora — ferrugem oxidada, como se o mundo ainda estivesse sangrando para o horizonte. Sua cidade não tem nome, porque cidades sem sobreviventes perdem o direito a nomes.\n\nVocê está nos escombros do que deve ter sido um supermercado. Tem água para dois dias. Tem medo há três anos.\n\nA cinquenta metros, a Fractura pulsa.\n\nÉ a quarta que você vê essa semana — fendas abertas na realidade pelas explosões nucleares quando encontraram as linhas de falha dimensional. Os cientistas que sobreviveram as chamam de Fracturas do Véu. Os sobreviventes comuns chamam de portais, e preferem ignorá-las.\n\nVocê sempre achou que teria forças para ignorar quando chegasse a hora.\n\nE dessa Fractura... emerge algo.\n\nUma criatura pequena, feita de luz e [elemento]. Olhos que parecem saber mais do que qualquer humano vivo. Ela olha diretamente para você — como se sempre soubesse que você estaria aqui.\n\nO contador de radiação no seu pulso bipta três vezes. Perto demais. Mas você não consegue se mover.',
      escolhas: [
        { texto: '🚶 Caminhar devagar até ela',              proxima: 'aproximar'         },
        { texto: '👁 Ficar imóvel e observar antes de agir', proxima: 'observar'           },
        { texto: '🏃 Recuar lentamente sem fazer barulho',   proxima: 'recuar'             },
      ],
    },

    // ══════════════════════════════════════════════════
    // BRANCH A — APROXIMAR
    // ══════════════════════════════════════════════════

    // ETAPA 2A
    aproximar: {
      texto: 'Cada passo faz a Fractura pulsar mais forte atrás dela.\n\nEla não recua. Inclina a cabeça — uma expressão entre curiosidade e reconhecimento. Como se você fosse esperado. Como se este momento específico, neste escombro específico, já estivesse escrito em algum lugar que você nunca teve acesso.\n\nQuando você se ajoelha e estende a mão, ela pousa a pata na sua palma. Levemente. Como algo que não precisa provar nada.\n\nCalor. Um calor que você não sentia há três anos — desde antes das bombas, desde quando o mundo ainda tinha inverno e verão e não apenas cinzas com graus diferentes de toxicidade.\n\nO vínculo se forma em silêncio, como duas coisas quebradas que encontraram a forma de se encaixar sem precisar ser consertadas primeiro.\n\nEntão ela fecha os olhos. E você vê.',
      escolhas: [
        { texto: '✨ Deixar a visão acontecer',                proxima: 'visao_dela'       },
        { texto: '😰 Tentar resistir — parece invasivo demais', proxima: 'resistir_visao'  },
      ],
    },

    // ETAPA 3A — path 1
    visao_dela: {
      texto: 'Não é uma visão normal.\n\nÉ memória. A memória dela.\n\nVocê vê o outro lado da Fractura — não o vazio que sempre imaginou, mas um mundo inteiro existindo em frequências que olhos humanos não conseguem processar. Florestas feitas de energia pura. Cidades construídas com matemática e luz. Criaturas como ela, centenas delas — uma civilização que não tem palavras equivalentes em nenhum idioma humano.\n\nE no centro dessa visão: uma mancha.\n\nNão tem forma. Não tem cor. É simplesmente a ausência de tudo que existe ao redor. Cresce pelos cantos como mofo em fruta — lenta, constante, faminta.\n\nO Vácuo.\n\nNão é uma criatura. É uma condição. Uma erosão. O ponto onde a existência começa a discordar de si mesma.\n\nA visão some. Você está de volta nos escombros, o coração batendo como se tivesse corrido quilômetros.\n\n"Você viu de onde fugi", ela não diz. Mas você entende assim mesmo.',
      escolhas: [
        { texto: '💙 "Você veio para escapar disso"',   proxima: 'ela_confirma'     },
        { texto: '❓ "Por que me mostrou isso?"',       proxima: 'por_que_mostrou'  },
      ],
    },

    // ETAPA 3A — path 2
    resistir_visao: {
      texto: 'Você pisca rápido e tenta se afastar mentalmente.\n\nEla não força. A visão não vem.\n\nMas algo fica — como o resíduo de um sonho que você não quis ter mas que deixou vestígio na textura do dia. Uma sensação de vastidão. De que o mundo tem mais camadas do que qualquer olho consegue enxergar.\n\nEla te olha sem julgamento. A postura dela diz: você não precisava estar pronto agora.\n\nDepois olha para a Fractura.\n\nE por um momento — apenas um — a expressão dela muda para algo que você só reconhece porque é a mesma coisa que você sente toda manhã ao acordar e lembrar onde está.\n\nMedo.\n\nNão de você. Do que está do outro lado.\n\nIsso, por alguma razão, faz o vínculo se aprofundar mais do que qualquer visão teria feito.',
      escolhas: [
        { texto: '👁 Observar a Fractura ao lado dela',              proxima: 'ela_confirma' },
        { texto: '🤝 Pousar a mão no ombro dela em silêncio',        proxima: 'ela_confirma' },
      ],
    },

    // ETAPA 4A
    ela_confirma: {
      texto: 'Ela se levanta abruptamente.\n\nDe um segundo para o outro, de criatura à deriva para sentinela. Os olhos, antes quentes, agora rastreiam a Fractura com a precisão de quem já fez isso antes. Muitas vezes. Em mundos que você nunca vai conhecer.\n\nVocê sente antes de ver: a temperatura cai. Não o frio comum do amanhecer radioativo — um frio diferente. O tipo que não vem de fora, mas de dentro do ar. Como se o espaço entre as moléculas estivesse ficando maior.\n\nA Fractura para de pulsar.\n\nIsso é pior do que quando pulsava.\n\nEla coloca a pata na sua bota. O toque diz: fique. O toque diz: agora.\n\nE a Fractura se abre com o som de algo que não devia existir sendo forçado a existir.',
      escolhas: [
        { texto: '⚔️ Ficar de pé ao lado dela — encarar juntos', proxima: 'a_escuridao_chega' },
        { texto: '🏃 Tentar arrastá-la para longe antes que saia', proxima: 'tentativa_fuga'   },
      ],
    },

    tentativa_fuga: {
      texto: 'Você a pega nos braços e corre.\n\nEla deixa — por exatamente dois segundos. Depois se contorce com uma força surpreendente para algo do seu tamanho, escorrega, pousa no chão e te olha.\n\nO olhar diz claramente: você não entende ainda.\n\nEla não está presa aqui. Ela escolheu ficar.\n\nA Fractura já cresceu — a abertura agora tem o dobro do tamanho, e a escuridão do outro lado não está mais só do outro lado. Está se estendendo para este lado como sombra que não precisa de luz para existir.\n\nEla corre na sua frente. Não em direção à saída. Em direção ao que está saindo.\n\nVocê tem exatamente um segundo para tomar a única decisão que importa.',
      escolhas: [
        { texto: '⚔️ Seguir ela — não vai deixá-la enfrentar sozinha', proxima: 'a_escuridao_chega' },
      ],
    },

    por_que_mostrou: {
      texto: 'Ela inclina a cabeça.\n\nDepois faz algo inesperado: pousa a pata no seu peito — no centro, sobre o esterno. No exato ponto que dói quando você pensa em todos que não estão mais aqui.\n\nVocê entende. Não com palavras.\n\nEla te mostrou porque reconheceu em você a mesma coisa que existe nela: a perda de um mundo. O luto de uma realidade que deixou de ser. A fome específica que essa perda produz.\n\nO Vácuo se alimenta disso. Ele encontra as lacunas, os vazios, as pessoas e as criaturas que foram esvaziadas pela guerra e pela dor — e cresce dentro delas como água em crack no concreto.\n\nEla luta contra isso com a única coisa que o Vácuo não consegue replicar: presença. A recusa obstinada de existir sozinho.\n\nA temperatura do ar cai dez graus em cinco segundos.\n\nEla levanta sem que você precise pedir.',
      escolhas: [
        { texto: '⚔️ Levantar — prontos juntos', proxima: 'a_escuridao_chega' },
      ],
    },

    // ══════════════════════════════════════════════════
    // BRANCH B — OBSERVAR
    // ══════════════════════════════════════════════════

    // ETAPA 2B
    observar: {
      texto: 'Do seu esconderijo entre os escombros, você observa.\n\nOutro sobrevivente — um homem, quarenta anos talvez, casaco militar desgastado até o fio — se aproximou da Fractura antes de você. Você o viu estender a mão para a criatura.\n\nAlgo escuro se estendeu pela fenda antes de ela chegar.\n\nNão houve grito. Não houve luta, resistência, nenhum gesto de defesa. O homem simplesmente parou de existir no espaço que ocupava. Um segundo presente, no seguinte: apenas o eco da forma que esteve lá.\n\nA criatura olhou para onde ele esteve. Não com tristeza — com reconhecimento. Como quem já viu isso acontecer antes. Como se isso fosse exatamente o que ela veio tentar impedir, e não tivesse chegado a tempo.\n\nDepois olhou para o seu esconderijo. Encontrou o seu olhar entre os tijolos.\n\nE esperou.',
      escolhas: [
        { texto: '🤫 Continuar escondido — esperar mais antes de agir',    proxima: 'ela_espera_tambem'    },
        { texto: '🚶 Sair — ela te viu de qualquer forma',                 proxima: 'encontro_apos_trauma' },
      ],
    },

    // ETAPA 3B — path 1
    ela_espera_tambem: {
      texto: 'Você não se move. Ela não se move.\n\nCinco minutos de impasse silencioso nos escombros da cidade sem nome.\n\nDepois ela vira as costas para você e começa a riscar o chão com a pata. Devagar. Metodicamente. Com a atenção de alguém que tem uma informação urgente e está esperando o momento certo para entregá-la.\n\nA curiosidade vence. Você se inclina para ver melhor.\n\nLinhas. Precisas demais para serem acidentais. Um mapa da sua cidade — não como ela é agora, em ruínas, mas os dois estados sobrepostos: antes e depois, vivos e mortos, como uma radiografia do que foi perdido.\n\nE nesse mapa: sete marcações. Sete Fracturas. Cada uma com um símbolo diferente ao lado.\n\nEla rabiscou isso de memória, sem hesitar, sem corrigir uma linha sequer.\n\nEla conhece cada Fractura desta cidade. Há quanto tempo está aqui?',
      escolhas: [
        { texto: '📍 Apontar para o símbolo mais próximo — o que significa?', proxima: 'o_simbolo_responde'  },
        { texto: '🚶 Sair do esconderijo e se aproximar',                     proxima: 'encontro_apos_trauma' },
      ],
    },

    // ETAPA 3B — path 2
    encontro_apos_trauma: {
      texto: 'Você sai devagar. Ela não recua.\n\nQuando você chega perto o suficiente, ela pousa a pata na sua mão sem hesitar — como se o teste já tivesse sido feito e você o tivesse passado simplesmente por ter ficado tempo suficiente para ela decidir.\n\nO vínculo se forma de modo diferente do que você imaginava. Não quente, não imediato. Mais sólido. Como algo construído sobre a fundação de ver o pior primeiro e ainda assim não ir embora.\n\nEla te conduz até onde estava rabiscando. O mapa ainda está lá no chão.\n\nSete Fracturas. Sete símbolos. Você olha para a Fractura atrás de vocês — a que engoliu o homem — e percebe: o símbolo dela está circundado por uma linha dupla.\n\nDiferente das outras seis.',
      escolhas: [
        { texto: '❓ Olhar para ela — o que a linha dupla significa?', proxima: 'o_simbolo_responde' },
      ],
    },

    // ETAPA 4B
    o_simbolo_responde: {
      texto: 'Ela pousa a pata no símbolo com linha dupla.\n\nDepois olha para a Fractura. Depois para você.\n\nVocê entende sem que precisem existir palavras para isso: linha dupla não é uma marcação qualquer. É um alerta. Esta Fractura não é um portal comum — é um ponto de entrada em escala. Não um visitante. Uma invasão planejada.\n\nAs outras seis são aberturas menores, espontâneas, o tipo que acontece quando a física esquece de si mesma. Esta foi aberta com propósito.\n\nO contador de radiação no seu pulso começa a bipar de forma errática — não porque a radiação aumentou, mas porque está detectando algo para o qual não foi projetado. Algo que não é energia ionizante. Algo que é a ausência de energia.\n\nEla se ergue. Cada músculo em posição de defesa.\n\nA Fractura engole a própria luz.',
      escolhas: [
        { texto: '⚔️ Ficar ao lado dela — isso é maior do que você', proxima: 'a_escuridao_chega' },
        { texto: '📸 Fotografar o mapa no chão antes que o pior chegue', proxima: 'salvar_o_mapa' },
      ],
    },

    salvar_o_mapa: {
      texto: 'Você tira o celular — bateria em 12%, tela rachada na diagonal, mas a câmera ainda funciona.\n\nTrês fotos do mapa. Rápidas. A luz está piorando.\n\nEla te olha durante a décima de segundo em que seus olhos estiveram no chão. Não com impaciência. Com algo que se parece com aprovação.\n\nVocê pensou além do próximo minuto. Em um mundo onde noventa por cento das decisões são de sobrevivência imediata, você pensou à frente.\n\nEla faz um som baixo — não exatamente um ronronar, não exatamente um aviso. Algo entre os dois, em um idioma que você acabou de começar a aprender.\n\nGuarda o celular.\n\nA Fractura faz um som que você sente na raiz dos dentes — como metal arranhando metal, mas vindo de dentro da realidade, não de fora.',
      escolhas: [
        { texto: '⚔️ Guardar o celular e encarar o que está chegando', proxima: 'a_escuridao_chega' },
      ],
    },

    // ══════════════════════════════════════════════════
    // BRANCH C — RECUAR
    // ══════════════════════════════════════════════════

    // ETAPA 2C
    recuar: {
      texto: 'Você recua. Devagar. Calculado.\n\nUm fragmento de vidro sob o seu peso.\n\nO som é pequeno — uma estilha fina, o tipo que em qualquer outro mundo seria completamente insignificante. Neste mundo, com este silêncio, é suficiente.\n\nA criatura ouviu.\n\nNão ataca. Não alarma. Simplesmente reorienta — como alguém que estava esperando por uma confirmação e acabou de recebê-la.\n\nEla te segue pelos escombros. Mantém uma distância que parece calculada com precisão: perto o suficiente para não perder o rastro, longe o suficiente para que você não entre em pânico. Como se soubesse exatamente quanto espaço cada pessoa precisa para continuar respirando normalmente.',
      escolhas: [
        { texto: '⬆️ Subir num prédio — ganhar altura e visão do entorno', proxima: 'fuga_vertical'    },
        { texto: '🔄 Fazer um círculo — confirmar se ela realmente te segue', proxima: 'teste_do_circulo' },
      ],
    },

    // ETAPA 3C — path 1
    fuga_vertical: {
      texto: 'Você sobe. Escada de emergência enferrujada, três andares, não olha para baixo.\n\nQuando chega ao topo, ela já está lá.\n\nNão sabe como — a escada estava atrás de você o tempo inteiro, e ela em nenhum momento passou por você. Mas ela está lá, sentada perto da borda, olhando para a cidade estendida abaixo com a tranquilidade de quem sobe neste telhado toda manhã.\n\nDo alto, você vê: sete buracos de luz nas ruínas. Sete Fracturas pulsando em ritmos ligeiramente diferentes, como instrumentos desafinados da mesma orquestra.\n\nEla se senta ao lado de você sem ser convidada. Por um momento os dois observam a cidade que foi.\n\nEntão os sete ritmos mudam.\n\nSincronizam.\n\nTodas as Fracturas pulsando ao mesmo tempo, no mesmo compasso, como um coração que acabou de acordar.',
      escolhas: [
        { texto: '😰 "O que significa quando elas sincronizam?"',       proxima: 'o_ritmo_sincronizado' },
        { texto: '⏱ Contar os pulsos — tentar entender o padrão',      proxima: 'o_ritmo_sincronizado' },
      ],
    },

    // ETAPA 3C — path 2
    teste_do_circulo: {
      texto: 'Você faz uma volta longa — três quarteirões de escombros, um desvio por uma galeria subterrânea parcialmente inundada — e volta para a posição inicial.\n\nEla está exatamente onde você a deixou, sentada, esperando.\n\nOlha para você com a expressão de quem diz: e então? Encontrou o que estava procurando?\n\nVocê encontrou. Ela não te perseguiu. Ficou. Esperou que você voltasse por conta própria.\n\nO vínculo se forma dessa forma, diferente de qualquer coisa que você esperava — não no toque, não em visões compartilhadas, mas no ato de voltar. De escolher ficar.\n\nVocê senta nos escombros em frente a ela. Ela inclina a cabeça levemente — uma reverência mínima que carrega peso considerável.\n\nDepois os dois olham para a Fractura, que está se comportando de forma diferente.',
      escolhas: [
        { texto: '❓ "O que está acontecendo com ela?"', proxima: 'o_ritmo_sincronizado' },
      ],
    },

    // ETAPA 4C
    o_ritmo_sincronizado: {
      texto: 'Ela fica de pé de um salto.\n\nNão com medo — com urgência. Existe uma diferença que você aprendeu a reconhecer: medo paralisa, urgência move.\n\nVocê desce atrás dela, os três andares em menos tempo do que subiu, e quando chegam à rua as Fracturas ainda estão sincronizadas — todas pulsando juntas num ritmo que agora você consegue sentir na sola dos pés. Uma vibração que sobe pelo concreto partido como um coração aumentando o ritmo antes de algo que não pode ser evitado.\n\nEla para no meio da rua. Olha para a Fractura mais próxima.\n\nDepois para você.\n\nA expressão é nova. Não é medo nem urgência — é algo que você só vai entender muito depois, quando tiver vocabulário para isso. É o reconhecimento de que o que está prestes a acontecer vai mudar os dois, e ela precisava ter certeza de que você estava pronto.',
      escolhas: [
        { texto: '⚔️ Ficar entre ela e o que está vindo',    proxima: 'a_escuridao_chega' },
        { texto: '🧠 Encontrar uma posição tática antes',    proxima: 'posicao_tatica'     },
      ],
    },

    posicao_tatica: {
      texto: 'Três anos de sobrevivência ensinaram uma coisa acima de tudo: o terreno é sempre mais importante do que o tamanho do inimigo.\n\nVocê leva menos de cinco segundos para ler o espaço — carro enferrujado a sete metros como cobertura, entrada de loja a doze metros como saída secundária, viga de concreto caída a quatro metros como obstáculo ou escudo dependendo do ângulo.\n\nEla entende antes de você indicar qualquer coisa. Começa a se mover para flanquear naturalmente, como se tivesse lido o mesmo manual. Ou como se lesse você diretamente.\n\nVocê se posiciona atrás do carro enferrujado, cobertura de um lado, campo de visão do outro.\n\nE então, pela abertura que a Fractura criou, ele emerge.\n\nFumaça que aprendeu a ter forma.\n\nO Emissário do Vácuo.',
      escolhas: [
        { texto: '⚔️ Executar o plano — atrair enquanto [nome] flanqueia', proxima: 'a_escuridao_chega' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 5 — CONVERGÊNCIA: A ESCURIDÃO CHEGA
    // ══════════════════════════════════════════════════
    a_escuridao_chega: {
      texto: 'A Fractura engole a própria luz por um segundo — e então ele emerge.\n\nNão de uma vez. Aos pedaços, como se a realidade precisasse de tempo para processar algo que não devia existir nela.\n\nPrimeiro: uma ausência de som. O mundo fica surdo, como se alguém tivesse abaixado o volume de tudo.\nDepois: uma ausência de luz — não escuridão normal, mas a retirada ativa de luminosidade do ar, como calor sendo sugado de uma sala.\nPor último: uma forma. Vagamente humanoide. Feita de fumaça com memória de ter sido sólida.\n\nO primeiro Emissário do Vácuo.\n\nNão tem olhos. Tem onde olhos deveriam estar.\nNão faz som. Absorve o som que existe ao redor.\n\nEle olha para você. Depois para [nome].\n\nA expressão — se pode ser chamada assim — muda quando a vê. Como reconhecimento. Como propósito que finalmente encontrou o objeto para o qual foi criado.',
      escolhas: [
        { texto: '⚔️ Colocar-se entre ele e [nome]',              proxima: 'voce_na_frente'       },
        { texto: '🤚 Levantar a mão — não atacar imediatamente',  proxima: 'pausa_antes_da_guerra' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 6 — O CONFRONTO COMEÇA
    // ══════════════════════════════════════════════════
    voce_na_frente: {
      texto: 'Você dá um passo à frente.\n\n[nome] deixa. Fica atrás de você — pata no seu tornozelo, pressão constante, como uma âncora que escolheu esse ponto no mundo para manter tudo no lugar.\n\nO Emissário para.\n\nIsso é inesperado. Você esperava que um ser feito de destruição atacasse imediatamente. Em vez disso, ele fica imóvel — se "imóvel" é a palavra certa para algo em constante estado de dissolução e reformação.\n\nEstuda você.\n\nVocê entende, com a frieza de quem já viu demais: ele está avaliando. Calculando. Decidindo se você é um obstáculo a ser contornado ou uma informação a ser coletada.\n\nAtrás de você, [nome] emite um som baixo. Aviso.\n\nEle decidiu.',
      escolhas: [
        { texto: '💥 Atacar primeiro — não deixar ele ter a iniciativa', proxima: 'combate_inicio'      },
        { texto: '🧠 Segurar — deixar ele revelar a intenção primeiro',  proxima: 'pausa_antes_da_guerra' },
      ],
    },

    pausa_antes_da_guerra: {
      texto: 'Você levanta a mão. Palma aberta.\n\nO gesto universal de "espera".\n\nEle para.\n\nIsso não deveria funcionar. Você sabe que não deveria funcionar — não com algo que absorve som e deforma luz e aparece por portais nucleares às três da manhã num mundo que já morreu uma vez. E ainda assim: ele para.\n\nO silêncio que ele carrega consigo engole os três. Você, [nome], ele.\n\nVocê olha para a ausência de olhos e pergunta, em voz alta, algo que nenhum sobrevivente sensato perguntaria:\n\n"O que você quer?"\n\nNada por três segundos. Quatro. Cinco.\n\nEntão algo acontece que não estava em nenhum protocolo de sobrevivência:\n\nEle responde.',
      escolhas: [
        { texto: '👂 Ouvir o que ele tem a dizer',                    proxima: 'o_emissario_responde' },
        { texto: '⚔️ Usar a pausa — atacar enquanto está estático',  proxima: 'combate_inicio'       },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 7 — DENTRO DO CONFRONTO
    // ══════════════════════════════════════════════════
    combate_inicio: {
      texto: 'O combate não começa com violência. Começa com geometria.\n\nEle se move em ângulos que não existem na física que você conhece — avanço sem deslocamento, recuo sem direção, presença em dois pontos ao mesmo tempo como se a regra de um ser em um lugar só se aplicasse a outras espécies.\n\n[nome] se move com ele. Você percebe que ela não está lutando contra ele — está lendo ele. Cada movimento dela é uma resposta, não uma iniciativa. Como alguém que traduz um idioma em tempo real, sem dicionário, contando com memória muscular de guerras em mundos que você nunca vai visitar.\n\nO Emissário concentra a atenção em você — o elemento humano, o imprevisível. E nesse exato momento, [nome] cria uma abertura.\n\nPequena. Um segundo. Talvez dois.',
      escolhas: [
        { texto: '💥 Aproveitar a abertura — atacar com tudo',           proxima: 'abertura_agressiva' },
        { texto: '🧠 Usar a abertura para reposicionar, não atacar',     proxima: 'abertura_tatica'    },
      ],
    },

    o_emissario_responde: {
      texto: 'Não com palavras.\n\nCom uma imagem que aparece diretamente na sua mente — não solicitada, não anunciada, sem permissão.\n\nVocê vê: uma cidade. Não esta. Outra, a trezentos quilômetros, que você conhece pelo nome antigo. E ao redor dela: doze Fracturas abertas ao mesmo tempo. Doze Emissários na borda, esperando algo que você não consegue ver mas consegue sentir — como a pressão antes de uma explosão.\n\nA imagem dura meio segundo. Depois some.\n\nEle te mostrou isso como quem deixa cair uma carta na mesa. Não como ameaça. Como informação. O que você faz com ela é problema seu.\n\n[nome] atrás de você emitiu um som que você nunca tinha ouvido antes — agudo, curto, carregado de algo que atravessa idiomas. Ela reconheceu a cidade da visão.\n\nEla já viu aquela cidade.',
      escolhas: [
        { texto: '❓ "Por que está me mostrando isso?"',         proxima: 'porque_a_informacao' },
        { texto: '⚔️ "Não importa. Você não passa por aqui."', proxima: 'combate_inicio'       },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 8 — O MOMENTO DECISIVO
    // ══════════════════════════════════════════════════
    abertura_agressiva: {
      texto: 'Você avança.\n\n[nome] se sincroniza — quando você vai para frente, ela flanqueia, criando uma tesoura que o Emissário não antecipou. A combinação de vocês dois é uma linguagem que ele ainda não aprendeu a ler.\n\nO toque — sua mão atravessando a fumaça-forma — cria uma reação que nenhuma ciência ainda documentou: a substância dele cristaliza momentaneamente ao contato com calor vivo. Uma vulnerabilidade real. Descoberta por acidente.\n\nEle recua. Não é derrota — é surpresa. E surpresa, em qualquer dimensão, compra tempo.\n\nMas antes de completar o recuo, num gesto que parece simultaneamente defensivo e intencional, ele pousa a ausência-de-mão na cabeça de [nome].\n\nEla não recua.\n\nO tempo congela.',
      escolhas: [
        { texto: '😱 Empurrá-lo para longe dela — agora',           proxima: 'o_toque_no_nome' },
        { texto: '👁 Não se mover — ela não recuou por alguma razão', proxima: 'o_toque_no_nome' },
      ],
    },

    abertura_tatica: {
      texto: 'Você se move para o lado, não para frente.\n\nO Emissário, calibrado para resistência direta, perde um tempo para recalibrar. Nesse tempo [nome] age — não para atacar, mas para criar distância entre ele e a Fractura. Afastá-lo da origem.\n\nIsso importa. Você não sabe ainda por quê, mas a urgência com que ela fez isso não era aleatória. Afastar um Emissário da Fractura de onde emergiu é cortar a linha de reforço. Ela sabe isso. Você aprende observando.\n\nEle percebe a manobra. A forma se contrai — irritação, se irritação é possível em algo sem face.\n\nE num gesto que parece ao mesmo tempo uma punição e uma pergunta, ele pousa a ausência-de-mão na cabeça de [nome].\n\nEla não recua. Fecha os olhos.',
      escolhas: [
        { texto: '😱 Interromper o contato — tirar ele dela',           proxima: 'o_toque_no_nome' },
        { texto: '👁 Deixar acontecer — ela parece saber o que está fazendo', proxima: 'o_toque_no_nome' },
      ],
    },

    porque_a_informacao: {
      texto: 'Ele não responde à segunda pergunta.\n\nMas algo na postura dele muda — uma angulação imperceptível de uma forma que não tem ombros nem coluna, mas que de alguma forma transmite hesitação.\n\n[nome] começa a brilhar levemente. O [elemento] dela aumenta de intensidade — não como ataque, mas como resposta automática, como sistema imunológico ativado pela proximidade do que veio para destruí-la.\n\nO Emissário olha para ela. Depois para você. Depois para ela de novo.\n\nE você percebe algo que vai te perturbar por semanas: ele parece não ter esperado que os dois estivessem juntos. Não vocês dois como indivíduos — a combinação específica de vocês dois. Esse vínculo formado hoje, nesse escombro, nessa cidade sem nome.\n\nIsso não estava no plano dele.\n\nEle se move — não para atacar. Para testar. Para entender o que exatamente está diante dele.',
      escolhas: [
        { texto: '⚔️ Bloquear o teste — não chegar perto de [nome]',  proxima: 'o_toque_no_nome' },
        { texto: '🧠 Deixar acontecer — entender mais observando',     proxima: 'o_toque_no_nome' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 9 — O TOQUE
    // ══════════════════════════════════════════════════
    o_toque_no_nome: {
      texto: 'Quando ele toca [nome] — ou o que conta como toque para algo feito de ausência — o mundo para.\n\nNão metaforicamente.\n\nO contador de radiação no seu pulso congela num número. A poeira no ar fica estática, suspensa, como se alguém tivesse pausado a gravidade por cortesia. O som que o Emissário absorvia pára de desaparecer.\n\nTrês segundos de pausa total na física do local.\n\nDepois [nome] emite uma luz.\n\nNão é o [elemento] dela — essa luz vem de mais fundo. De antes dela ter chegado aqui, de antes da Fractura, de antes das bombas. Uma luz que parece ter idade, que parece ter nome, que parece conhecer o Emissário do mesmo modo que vacinas conhecem doenças.\n\nEle recua como algo que tocou brasa.\n\nRápido. Definitivo.\n\nA Fractura começa a fechar — mas antes de ficar menor que um punho, algo cai através dela. Um objeto pequeno, escuro, que aterra no concreto entre você e [nome] com um som que não combina com o tamanho que tem.',
      escolhas: [
        { texto: '🖐 Pegar o objeto antes que suma',               proxima: 'fim_objeto_pego'      },
        { texto: '👁 Não tocar — pode ser uma armadilha intencional', proxima: 'fim_objeto_deixado' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 10 — FINAIS
    // ══════════════════════════════════════════════════
    fim_objeto_pego: {
      texto: 'Você pega.\n\nÉ frio além do que qualquer temperatura explica. A forma não segue geometria normal — arestas que não existem em perspectiva direta mas aparecem quando você não está olhando, superfície que parece diferente dependendo de qual mão segura.\n\nAssim que você toca, [nome] pousa a pata na sua mão. Não para tirar. Para ficar ao lado. Para que o toque seja de dois.\n\nA Fractura fecha com um estalo que você sente nos molares.\n\nSilêncio.\n\nVocê e [nome] no meio dos escombros. O objeto escuro na sua mão, a poeira voltando a cair, o contador bipatando normalmente de novo. Como se nada tivesse acontecido. Como se o mundo fosse o mesmo de trinta minutos atrás.\n\nMas não é.\n\n[nome] olha para o objeto. Depois para você. A expressão dela — a primeira que você consegue ler com clareza — diz: agora começa de verdade.\n\nDe algum lugar que não é dentro nem fora da sua cabeça, uma voz diz com a naturalidade de quem anuncia o tempo:\n\n"O Vácuo sabe que você existe. E agora você tem uma coisa dele."\n\n― O que é o objeto? O que [nome] sabe que você ainda não sabe?\n\nNo Capítulo II — As Outras Fracturas — as respostas começam.',
      fim: true,
      recompensa: { xp: 60, vinculo: 3, humor: 10, saude: -10 },
      texto_fim: '🖐 Você pegou o objeto. [nome] sabe o que é. Ainda não te contou.',
    },

    fim_objeto_deixado: {
      texto: 'Você não toca.\n\nTrês anos de sobrevivência produziram um instinto simples e confiável: se algo parece errado em qualquer grau, é porque é.\n\nO objeto fica no chão. Você e [nome] ficam imóveis ao redor dele — ela com a mesma cautela que você, o que diz muito sobre o quanto ela sabe e escolhe não demonstrar por padrão.\n\nA Fractura fecha.\n\nO objeto escurece até ficar invisível no concreto cinzento — mas está lá. Você marcou a posição com os olhos, com a posição do sol, com a distância até o poste partido à direita. Você sabe onde está.\n\n[nome] te olha com algo que, num rosto humano, seria chamado de respeito. A paciência de não agir tem peso aqui. A decisão de não tocar pode ter sido a mais importante do dia.\n\nVocê fotografa o chão com o celular quebrado. Prova de que existiu.\n\nDe algum lugar que não é dentro nem fora da sua cabeça:\n\n"O Vácuo sabe que você existe. E deixou aquilo de propósito."\n\n― Por quê? O que acontece com quem pega?\n\nNo Capítulo II — As Outras Fracturas — as respostas começam.',
      fim: true,
      recompensa: { xp: 65, vinculo: 2, humor: 15 },
      texto_fim: '👁 Você não tocou. O objeto ainda está lá. Isso pode ter sido a decisão mais importante do dia.',
    },
  },
});
