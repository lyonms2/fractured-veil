// ── Capítulo II — As Outras Fracturas (Comum) ─────────────────────
LORE_CAPITULOS.push({
  id:       'outras_fracturas',
  titulo:   'Capítulo II — As Outras Fracturas',
  descricao:'O mapa que [nome] traçou no pó aponta para mais Fracturas. O Vácuo está crescendo — e outros sobreviventes também encontraram Avatares.',
  icone:    '🗺️',
  raridade: 'Comum',
  anterior: 'dia_seguinte',
  cenas: {

    // ══════════════════════════════════════════════════
    // ETAPA 1 — A MANHÃ DEPOIS
    // ══════════════════════════════════════════════════
    inicio: {
      texto: 'Você dormiu três horas.\n\nSabe disso porque contou cada uma, acordado entre elas, ouvindo a cidade que não faz barulho mas também não fica quieta. O tipo de silêncio que tem textura.\n\n[nome] não dormiu. Quando o céu cor de ferrugem clareia o suficiente para ver, você a encontra no mesmo canto onde ficou de guarda — mas diferente. Ao seu redor, o chão está coberto de riscos.\n\nNão é o mapa de ontem. É um sistema inteiro. Três localizações marcadas com símbolos que você não reconhece, linhas de rota traçadas entre elas, e no centro, um círculo que ela continua repassando com a pata — como se repetir a marcação fosse uma forma de aviso ou de prece.\n\nO objeto — pego ou fotografado, dependendo do que você escolheu ontem — está ao lado do círculo. Ela não tocou nele. Só o colocou no mapa como se fosse uma peça num tabuleiro.\n\nTrês Fracturas. Três direções. Ela olha para você esperando uma decisão.',
      escolhas: [
        { texto: '🐾 Deixar [nome] escolher — ela sabe mais do que demonstra',  proxima: 'seguir_nome'        },
        { texto: '📍 Ir ao sinal mais próximo — economizar energia agora',       proxima: 'ir_ao_mais_proximo' },
        { texto: '🔍 Estudar o mapa antes de qualquer coisa',                   proxima: 'estudar_o_mapa'    },
      ],
    },

    // ══════════════════════════════════════════════════
    // BRANCH A — SEGUIR [nome]
    // ══════════════════════════════════════════════════

    seguir_nome: {
      texto: 'Você aponta para ela: você decide.\n\nEla não hesita. Levanta e começa a andar antes mesmo de você guardar o que tinha nas mãos — noroeste, por uma rua que não constava em nenhum dos mapas que você tinha de antes. Uma rua que simplesmente existe entre dois prédios que deveriam se tocar.\n\nCinco minutos de marcha silenciosa. [nome] se move rente às paredes, alternando lados, nunca em linha reta por mais de seis passos. Um padrão. Uma linguagem de evasão que ela deve ter aprendido do outro lado das Fracturas — num mundo onde o que te caça pensa como caçador, não como predador.\n\nQuando ela para, você para.\n\nDiante de vocês: um prédio de escritórios de cinco andares, a fachada de vidro há muito implodida para dentro. Mas no terceiro andar, através do vão que foi janela, você vê: uma luz. Não o fogo laranja dos abrigos improvisados. Uma luz branca, fria, controlada. Energia elétrica.\n\nE na borda do vão — imóvel, te observando desde quando você nem suspeitava — uma silhueta.',
      escolhas: [
        { texto: '✋ Parar e mostrar as mãos — não quer parecer ameaça',      proxima: 'contato_pelo_alto'      },
        { texto: '📣 Chamar — não existe aproximação silenciosa aqui',         proxima: 'contato_pelo_alto'      },
        { texto: '👁 Ficar imóvel — deixar a silhueta tomar a iniciativa',     proxima: 'sentinela_decide_primeiro' },
      ],
    },

    estudar_o_mapa: {
      texto: 'Você se ajoelha.\n\nO mapa de [nome] é mais complexo do que pareceu à primeira vista. Os símbolos ao lado de cada Fractura não são decorativos — são classificações. Você reconhece o símbolo da Fractura de ontem entre eles, e ao lado dele, a linha dupla que ela havia marcado antes.\n\nDas outras três: uma tem o mesmo símbolo simples que as Fracturas "normais" do mapa de ontem. As outras duas têm marcações que você não conhece — uma em forma de espiral, uma em forma de ponto com irradiações saindo.\n\nVocê aponta para a espiral. Pergunta com o gesto.\n\n[nome] olha para onde você aponta. Depois para você. A expressão muda para algo que fica entre confirmação e custo — a cara de quem vai dizer uma coisa difícil e ainda está calibrando a versão mais compreensível dela.\n\nEla toca a espiral com uma pata. Depois desce e toca o objeto. Depois olha para cima — para a direção do prédio ao noroeste.\n\nO símbolo espiral está na direção do prédio ao noroeste.',
      escolhas: [
        { texto: '🧭 Ir ao norte — em direção à espiral',            proxima: 'seguir_nome'        },
        { texto: '📍 Ir ao sinal mais simples — menor risco',         proxima: 'ir_ao_mais_proximo' },
      ],
    },

    ir_ao_mais_proximo: {
      texto: 'Sudeste, seis quarteirões.\n\nVocê segue o sinal de atividade do mapa de [nome] — fumaça de fogueira, marca de pisada recente no cimento coberto de pó, uma lata amarrada a um fio entre dois postes que faz barulho com o vento. Sinais de alguém que está aqui há tempo suficiente para criar rotina.\n\n[nome] anda um passo atrás, diferente do noroeste. Mais cautelosa. O ouvido dela vira levemente a cada esquina — não checando o que está à frente, mas o que está atrás.\n\nVocê vira uma esquina e para.\n\nA fogueira existe. As marcas existem.\n\nA pessoa que fez isso não existe mais no sentido que importa.\n\nOs sinais de luta são contidos — não houve corrida, não houve grito. Só o ponto de onde alguém estava e um rastro que termina no concreto como se o destino da linha tivesse sido apagado e não apenas mudado. Ao lado: a pegada de um Avatar que tentou interpor algo entre a pessoa e o que veio. A pegada para ali. Não vai a lado nenhum depois.\n\n[nome] olha o rastro por um segundo. Depois fecha os olhos.\n\nEla reconhece isso.',
      escolhas: [
        { texto: '🧭 Mudar de direção — ir para o noroeste agora', proxima: 'seguir_nome'                },
        { texto: '🔍 Examinar antes — pode haver informação aqui', proxima: 'examinar_rastro_de_perda'   },
      ],
    },

    examinar_rastro_de_perda: {
      texto: 'Você examina devagar.\n\nO abrigo era improvisado mas inteligente — lona impermeável entre dois escombros, ângulo certo para não refletir luz, entrada estreita que um humano adulto passa de lado. Quem construiu isso sabia o que estava fazendo.\n\nNos escombros ao redor: um diário. As primeiras páginas molhadas além da leitura, mas as últimas três estão em bom estado o suficiente. Você lê:\n\n"Dia 14 depois de Mira. O Avatar não come, não precisa de água, mas fica quieto quando fico quieto — acho que está regulando o humor junto comigo. Isso me perturbou na primeira semana. Agora é o que me mantém calibrado.\n\nDia 15. Encontrei marcações na parede de um prédio. Não são minhas, não são de ninguém que eu conheça. Parece um código.\n\nDia 16. O código não era de ninguém que eu conheça."\n\nO diário termina ali. Dia dezesseis.\n\n[nome] pousa a cabeça no diário fechado por um momento. Depois levanta.\n\nVocê tem a sensação, sem que ninguém precise dizer, de que esse diário é a diferença entre aviso e destino.',
      escolhas: [
        { texto: '📓 Guardar o diário — pode ser útil', proxima: 'seguir_nome' },
        { texto: '📓 Deixar onde está — não é seu',      proxima: 'seguir_nome' },
      ],
    },

    // ══════════════════════════════════════════════════
    // CONVERGÊNCIA — O ENCONTRO
    // ══════════════════════════════════════════════════

    sentinela_decide_primeiro: {
      texto: 'A silhueta resolve antes de você.\n\nDesceu um andar enquanto você ficou imóvel — você a viu se mover pela lateral do prédio com uma eficiência que diz mais sobre os últimos três anos do que qualquer apresentação poderia. Quando chega ao nível do segundo andar, salta para o toldo meio implodido à esquerda, usa ele como trampolim, e pousa a quatro metros de você num agachamento controlado.\n\nUm homem. Quarenta e poucos anos. Cicatriz diagonal no queixo que parece nova demais para ser antiga. Casaco militar que não é exatamente uniforme mas foi claramente remendado com partes de pelo menos dois uniformes diferentes.\n\nAtrás dele: uma criatura compacta, feita de sombra com textura de pedra. Um Avatar de elemento terra-escuridão que você não sabe nomear mas que claramente não é a primeira vez que esse homem a viu.\n\nEle olha para [nome]. [nome] olha para a criatura dele.\n\nAlgo passa entre os dois Avatares que você não consegue ver mas consegue sentir — como estática antes de tempestade, o tipo que não é ameaça mas é reconhecimento.',
      escolhas: [
        { texto: '🤝 "Não sou inimigo — o Avatar garante isso"',       proxima: 'encontro_renan_yasmin' },
        { texto: '⬆️ Mostrar as mãos e esperar ele falar primeiro',   proxima: 'encontro_renan_yasmin' },
      ],
    },

    contato_pelo_alto: {
      texto: 'A silhueta reage ao gesto — recua um passo, desaparece do vão por três segundos, e então reaparece com as próprias mãos levantadas. Espelho do seu gesto.\n\nUm protocolo improvisado de dois humanos que sobreviveram tempo suficiente para desenvolver códigos de contato não-violento sem nunca terem combinado os termos.\n\nUma voz vem do alto: "Avatar visível?" Mulher. Vinte e poucos anos. Cuidado específico na dicção que parece treinado, não natural — alguém que aprendeu a projetar a voz de forma controlada em ambientes onde controle é sobrevivência.\n\nVocê aponta para [nome].\n\nUma pausa. Depois: "Subam. Mas devagar."',
      escolhas: [
        { texto: '⬆️ Subir — não existe alternativa melhor agora', proxima: 'encontro_renan_yasmin' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 3 — O GRUPO
    // ══════════════════════════════════════════════════

    encontro_renan_yasmin: {
      texto: 'São dois.\n\nO homem se chama Renan — apresentação mínima, o tipo que deixa claro que nome é a quantidade de informação que ele considera adequada por enquanto. Ao lado dele, Cinza: o Avatar de terra compacto, que fica entre ele e tudo com a naturalidade de algo que sempre foi assim.\n\nA mulher é Yasmin. Vinte e três anos, cicatriz antiga na parte interna do braço esquerdo que veio de antes das bombas, fala com a precisão de quem passou tempo suficiente sozinha para escolher cada palavra. Ao lado dela: Eco, uma criatura menor, feita de algo entre água e som — quando se move, o ar ao redor dela carrega um eco de outros movimentos, como se ela viajasse levemente atrás de si mesma.\n\nTrinta dias aqui. Esse prédio. Eles mapearam as Fracturas do raio de dois quilômetros antes de você chegar.\n\nRenan fala pouco. Yasmin observa mais do que fala.\n\n[nome] fica ao lado de você e não tira os olhos de Cinza.',
      escolhas: [
        { texto: '🗣 Contar o que aconteceu ontem — começar pela confiança', proxima: 'compartilhar_historia'  },
        { texto: '❓ Perguntar sobre eles antes de contar qualquer coisa',   proxima: 'perguntar_primeiro'     },
        { texto: '🗺️ Mostrar o mapa de [nome] — propor colaboração direta', proxima: 'proposta_de_mapa'       },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 4 — DINÂMICA DO GRUPO
    // ══════════════════════════════════════════════════

    compartilhar_historia: {
      texto: 'Você conta.\n\nNão tudo — existe uma seleção automática que entra em operação quando você começa a falar sobre ontem. O Emissário, o vínculo com [nome], o objeto, a voz no final. Mas conta o suficiente para que sejam informação real, não narrativa gerenciada.\n\nYasmin escuta sem interromper. Renan escuta checando a janela em intervalos regulares — não por desatenção, mas pela precisão de alguém que aprendeu que escutar e vigiar são a mesma coisa.\n\nQuando você termina, silêncio por dez segundos.\n\nDepois Yasmin diz: "A voz." Uma afirmação, não uma pergunta. "A gente ouviu também. No quarto dia. Renan achou que era desorientação.""\n\nRenan continua olhando pela janela. "Achei."\n\n"E depois?" Yasmin olha para ele.\n\n"E depois parei de achar."\n\nEco faz um som baixo — o eco de algo que ninguém disse mas que estava no ar faz tempo suficiente para ter peso.',
      escolhas: [
        { texto: '❓ "O que a voz disse para vocês?"',             proxima: 'a_voz_deles'     },
        { texto: '🔒 "Tem algo que ainda não contei sobre ontem"', proxima: 'revelar_objeto'  },
      ],
    },

    perguntar_primeiro: {
      texto: 'Renan responde com economia.\n\nTrinta dias. Dois Avatares. Onze Fracturas mapeadas no raio de dois quilômetros. Dois Emissários encontrados — um contornado, um enfrentado. Yasmin com um corte no antebraço que está cicatrizando que veio do segundo enfrentamento.\n\nVocê pergunta sobre o Emissário que enfrentaram.\n\nRenan não responde imediatamente. Olha para Cinza.\n\nCinza faz algo que você nunca viu um Avatar fazer: fecha os olhos. Por um segundo inteiro, em posição de guarda, fecha os olhos como se isso custasse algo.\n\nYasmin responde no lugar de Renan: "Era maior. Não do tamanho deles — do propósito. Não veio explorar. Veio marcar. Como alguém que põe bandeira antes de dizer que aquele território é dele."\n\nA informação cai no ar e fica lá, pesada, sem lugar para ir.',
      escolhas: [
        { texto: '🗺️ Mostrar o mapa de [nome]',                  proxima: 'proposta_de_mapa'       },
        { texto: '🗣 Contar o que aconteceu com você ontem',       proxima: 'compartilhar_historia'  },
      ],
    },

    proposta_de_mapa: {
      texto: 'Você abre o mapa de [nome] no chão entre os quatro.\n\nRenan olha para ele por dois segundos e vai buscar o próprio. Quando os dois são colocados lado a lado, o que aparece não é sobreposição — é complementação. O mapa de [nome] cobre o quadrante noroeste com um detalhe que o de Renan não tem. O de Renan cobre o sudoeste com uma precisão que o de [nome] só indicava.\n\nJuntos: dezoito Fracturas mapeadas. Mais do dobro do que cada um tinha separado.\n\nYasmin faz um som baixo — não exatamente surpresa. O tipo de som que faz alguém quando uma hipótese que estava suspensa na cabeça faz contato com uma evidência.\n\n"Elas formam um padrão." Ela aponta para o mapa combinado. "Não geográfico. Sequencial. Como se cada abertura fosse uma etapa de algo maior."\n\n[nome] olha para o ponto onde ela aponta e assente com um movimento que não é exatamente humano mas é completamente claro.\n\nEla já sabia disso.',
      escolhas: [
        { texto: '❓ "Sequencial como o que, exatamente?"',         proxima: 'a_sequencia_explica'   },
        { texto: '🔒 "Tem algo que preciso mostrar para vocês"',    proxima: 'revelar_objeto'        },
      ],
    },

    a_voz_deles: {
      texto: '"O Vácuo sabe que vocês existem."\n\nMesmas palavras. Mesma construção. Yasmin recita sem emoção particular — a ausência de emoção de quem já processou isso longe demais para ainda ser abalado na superfície.\n\n"A diferença," ela continua, "é que a gente também disse algo de volta."\n\nRenan finalmente se vira da janela. Olha para você com uma expressão que não é desconfiança exatamente — é avaliação. A diferença é que avaliação implica que a resposta ainda não foi tomada.\n\n"Perguntamos de onde vinha a voz." Ele pausa. "E houve uma segunda mensagem. Demorou dois dias."\n\nEco se move — não como reação, como anticipação. Como se o que Renan está prestes a dizer fosse algo que ela carrega há tempo e que finalmente vai ter peso externo.\n\n"A voz disse: \'Não é de onde vem. É de quando.\'"\n\nO silêncio que segue tem uma qualidade diferente. Como se o ar tivesse decidido ficar quieto por respeito.',
      escolhas: [
        { texto: '🧠 "De quando — o que isso quer dizer?"',         proxima: 'a_sequencia_explica'  },
        { texto: '🔒 "Tem algo que preciso mostrar para vocês"',    proxima: 'revelar_objeto'       },
      ],
    },

    a_sequencia_explica: {
      texto: 'Yasmin pega um pedaço de fio e liga os pontos do mapa combinado na ordem em que foram abertas — Renan guardou as datas de cada observação.\n\nO padrão é uma espiral. Não exatamente geométrica — tem variações, imprecisões, o tipo de imperfeição que torna uma linha num fenômeno natural ao invés de num artefato. Mas espiral. Fechando para dentro. Com um ponto central que ainda não tem Fractura marcada.\n\nO ponto central fica a quatro quilômetros ao sul.\n\nRenan olha o mapa e não diz nada por tempo longo. Depois: "Quando eu era militar, antes, reconhecia padrões de cerco. Esta espiral tem o mesmo DNA. Cada Fractura é uma posição. O centro é o objetivo."\n\nVocê entende antes de ele terminar: as Fracturas não são portais aleatórios abertos pela física esquecendo de si mesma. São uma estratégia.\n\n[nome] pousa a pata sobre o ponto central. Quente demais para o tamanho dela.\n\nEla conhece esse ponto.',
      escolhas: [
        { texto: '🔒 Contar sobre o objeto — eles precisam saber', proxima: 'revelar_objeto'   },
        { texto: '👁 Guardar por agora — observar as reações deles', proxima: 'guardar_segredo' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 5 — O OBJETO
    // ══════════════════════════════════════════════════

    revelar_objeto: {
      texto: 'Você tira o objeto do bolso — ou, se não o pegou, mostra a foto no celular com 9% de bateria.\n\nRenan o estuda sem tocar. Yasmin se inclina para ver melhor. Eco vibra levemente ao redor de Yasmin — não com medo, com frequência. Como se o objeto emitisse algo que ela detecta mas que os humanos não conseguem.\n\nCinza, o Avatar de Renan, recua meio passo.\n\nIsso é o que mais importa: Cinza não fica imóvel, não fica em guarda. Recua. A diferença entre preparação e evasão é muito pequena mas completamente legível em algo que nunca mente.\n\nYasmin percebe antes de Renan. "Cinza conhece esse objeto."\n\nRenan olha para a própria Avatar com uma expressão que você consegue ler mesmo sem contexto: surpresa e algo que vem depois da surpresa quando você está acostumado com ter informações completas sobre algo que importa.\n\nEle não sabia disso sobre Cinza.\n\n[nome] ao lado de você não se move. Mas você consegue sentir — através do vínculo que nem uma semana tem, que ainda está sendo calibrado — que ela aprova o que você fez.',
      escolhas: [
        { texto: '❓ "Cinza, o que é isso?"',                               proxima: 'o_que_cinza_sabe'        },
        { texto: '👁 Deixar Renan processar — não forçar o ritmo dele',    proxima: 'renan_processa'          },
      ],
    },

    guardar_segredo: {
      texto: 'Você não menciona o objeto.\n\n[nome] não reage — nem para confirmar nem para corrigir. Continua ao lado de você com a presença de algo que respeita as escolhas que você faz mesmo quando poderia opinar.\n\nA conversa continua sobre o mapa, a espiral, o ponto central.\n\nMas você nota: Renan, ao longo dos próximos vinte minutos, olha três vezes para o bolso onde o objeto está. Não ostentatoriamente — com a sutileza de alguém que foi treinado a não demonstrar que está observando.\n\nEle sabe que você tem algo.\n\nNão sabe o quê. Mas sabe que tem.\n\nE não pergunta.\n\nA ausência de pergunta diz mais do que qualquer pergunta teria dito.',
      escolhas: [
        { texto: '🧠 Continuar guardando — ver quanto tempo ele fica quieto', proxima: 'o_que_renan_nao_conta'  },
        { texto: '🔒 Revelar afinal — a tensão não ajuda ninguém',            proxima: 'revelar_objeto'         },
      ],
    },

    o_que_cinza_sabe: {
      texto: 'A pergunta fica no ar.\n\nCinza olha para o objeto. Depois para [nome]. Depois para Renan — e o olhar dura tempo suficiente para ser uma comunicação, não só um cheque.\n\nRenan fecha os olhos por dois segundos. O tipo de fechamento que é permissão.\n\nCinza se aproxima do objeto. Toca com a pata de pedra-sombra.\n\nO que acontece depois não é visível — é sentido. Todos os quatro humanos e todos os quatro Avatares ficam imóveis ao mesmo tempo, no mesmo segundo, por uma razão diferente que produz o mesmo resultado. Como quando instrumentos diferentes tocam a mesma nota.\n\nEco faz o som mais baixo que você já ouviu ela fazer — uma frequência que você sente no peito mais do que com os ouvidos.\n\nCinza recua. E faz algo que Avatares aparentemente podem fazer mas raramente escolhem: usa a pata para escrever no pó do chão. Uma letra. Uma palavra.\n\nNão em português. Não em nenhuma língua que você reconhece. Mas [nome] reconhece.\n\nE você consegue ler [nome] bem o suficiente agora para saber: a palavra é um nome.',
      escolhas: [
        { texto: '❓ "[nome], o que está escrito?"',              proxima: 'o_nome_no_po'          },
        { texto: '👁 Deixar o momento existir — não interromper', proxima: 'renan_processa'        },
      ],
    },

    o_nome_no_po: {
      texto: '[nome] olha para a palavra no pó por tempo suficiente para que você entenda que ela está decidindo o quanto te contar.\n\nDepois olha para você.\n\nE faz algo que ela nunca fez antes: inclina a cabeça para baixo e para cima — um sim claro, humano, provavelmente aprendido deste lado das Fracturas, provavelmente depois de observar muitos sobreviventes por muito tempo antes de qualquer um deles saber que ela estava lá.\n\nVocê entende o que o sim confirma, mesmo sem saber o que a palavra diz.\n\nO objeto tem um nome. O objeto é de alguém. E esse alguém não é o Emissário — não é do Vácuo. É de antes do Vácuo.\n\nRenan, atrás de você, diz baixo: "Quanto tempo esse objeto existe?"\n\nNinguém responde. Não porque não queiram — porque a resposta, se existir, está em algum lugar que ainda não tem acesso humano.\n\nFora, ao longe, uma das Fracturas que o mapa marcava pulsa três vezes rápidas.\n\nO código de alerta que Renan estabeleceu para atividade de Emissário.',
      escolhas: [
        { texto: '⚔️ Posicionar — o que está chegando não pode entrar aqui', proxima: 'o_segundo_emissario' },
      ],
    },

    renan_processa: {
      texto: 'Renan fica em pé e vai à janela.\n\nVocê dá esse tempo. Aprende rápido que pessoas que precisam de janelas para pensar precisam delas de verdade.\n\nYasmin se move para perto de você. Voz baixa: "Ele não fica surpreso com muita coisa. Isso, ficou."\n\nCinza vai até Renan e fica ao lado dele na janela. Não para vigiar — para estar presente. O tipo de presença que não diz nada mas diz tudo sobre o que um vínculo se torna quando tem trinta dias.\n\nVocê olha para [nome]. Ela está olhando para Cinza com atenção total — a atenção de quem está lendo algo em tempo real. Traduzindo.\n\nDepois [nome] te olha. Faz um movimento com a cabeça em direção a Renan. Uma pergunta.\n\nVocê vai até a janela ao lado dele.\n\nEle fala sem tirar os olhos de fora: "A parte que eu não te contei ainda: o segundo Emissário que a gente enfrentou não saiu pela Fractura quando terminou. Ficou. Passou três dias circulando o prédio antes de desaparecer."\n\nPausa.\n\n"Acho que estava esperando alguém que ainda não tinha chegado."',
      escolhas: [
        { texto: '🧠 "E agora que eu cheguei?"',                            proxima: 'o_segundo_emissario' },
        { texto: '❓ "Você sabe que está me dizendo que sou o alvo?"',      proxima: 'o_segundo_emissario' },
      ],
    },

    o_que_renan_nao_conta: {
      texto: 'Você passa vinte minutos observando Renan enquanto falam do mapa.\n\nEle é preciso. Eficiente. Partilha informação tática sem hesitar — rotas, Fracturas problemáticas, zonas de risco. O tipo de generosidade de quem entendeu que informação guardada num apocalipse mata mais do que o inimigo.\n\nMas tem uma coisa que ele não menciona.\n\nYasmin menciona uma Fractura ao norte que eles investigaram e "deixaram para depois". A expressão dela quando diz "deixaram para depois" não combina com o significado neutro das palavras.\n\nEco — o Avatar de Yasmin — vira brevemente a cabeça para Renan quando o norte é mencionado. Ele não reage.\n\nCinza — o Avatar de Renan — vira a cabeça para longe.\n\nYasmin muda de assunto.\n\n[nome] ao lado de você não está olhando os mapas. Está olhando Cinza.\n\nAlgo sobre o norte não foi decidido — foi arquivado. E Avatares não arquivam.',
      escolhas: [
        { texto: '❓ "O que tem ao norte que vocês não estão dizendo?"', proxima: 'a_pergunta_direta'   },
        { texto: '👁 Guardar a observação — não expor ainda',            proxima: 'o_segundo_emissario' },
      ],
    },

    a_pergunta_direta: {
      texto: 'A pergunta cai entre os quatro como pedra em poça rasa.\n\nYasmin olha para Renan. Renan olha para o mapa.\n\nCinza olha para [nome].\n\n[nome] não desvia.\n\nRenan fala por fim: "Ao norte tem uma Fractura que não se comporta como as outras. Não pulsa. Não emite sinal. Não atraiu Emissário." Pausa. "Mas algo saiu por ela dois dias atrás que não é Emissário. Não é Avatar. Não é nada que Cinza reconhece."\n\nYasmin completa, com a precisão de quem está sendo exato porque isso importa: "Era humano. Ou foi humano uma vez. Andava como alguém que sabe como andar como humano mas não lembra completamente por quê."\n\nO silêncio que se segue tem um peso específico — não de ameaça, mas de classificação. Você está arquivando uma informação que não tem categoria ainda.\n\nFora, uma Fractura pulsa três vezes rápidas.',
      escolhas: [
        { texto: '⚔️ Posicionar — não é hora de continuar isso agora', proxima: 'o_segundo_emissario' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 6 — O SEGUNDO EMISSÁRIO
    // ══════════════════════════════════════════════════

    o_segundo_emissario: {
      texto: 'O prédio perde o som antes de perder a luz.\n\nNão de uma vez — como se o som fosse saindo pelas frestas, drenado para algum lugar que não existe no mapa físico do mundo. A luz elétrica de Renan oscila duas vezes e apaga. A luz natural que entrava pelas janelas fica cinzenta primeiro, depois ferrugem-escura, então simplesmente ausente.\n\nCinco segundos de escuridão completa.\n\nDepois você o vê pela janela.\n\nMaior do que o de ontem. Não no sentido de altura — no sentido de presença. Como se ocupasse mais espaço do que o volume físico sugere. Como se o ar ao redor dele fosse também parte dele.\n\nDois andares abaixo, na rua. Parado. Sem olhos mas olhando para cima.\n\nYasmin, voz baixa: "É o mesmo que ficou esperando."\n\nRenan não diz nada. Já está se movendo — não para a saída, para a posição. Trinta dias produziram protocolos tão automáticos que existem antes das decisões conscientes.\n\nOs quatro Avatares ficam de pé simultaneamente.',
      escolhas: [
        { texto: '⚔️ Coordenar a defesa com Renan — usar o espaço do prédio', proxima: 'coordenar_defesa'     },
        { texto: '🧠 Perguntar a [nome] primeiro — ela enfrentou um ontem',     proxima: 'estrategia_de_nome'  },
      ],
    },

    estrategia_de_nome: {
      texto: 'Você olha para [nome].\n\nEla não está olhando o Emissário. Está olhando o objeto — que está no seu bolso mas que de alguma forma ela parece conseguir localizar com precisão através do tecido.\n\nDepois te olha. E faz um gesto novo: pata espalmada, pressionando para baixo. Devagar.\n\nEspera.\n\nRenan ao lado de você vê o gesto. "Seu Avatar quer que você não ataque?"\n\nYasmin, do outro lado: "Eco também. Estão sincronizadas."\n\nOs dois Avatares fazem o mesmo gesto — [nome] e Eco, lado a lado, pata pressionando para baixo. Como alunos que chegaram à mesma conclusão por caminhos diferentes.\n\nO Emissário lá embaixo não subiu. Está parado. Esperando algo.\n\nEle não veio atacar. Veio buscar.',
      escolhas: [
        { texto: '👁 Confiar nos Avatares — ficar quieto e observar',       proxima: 'o_emissario_espera'  },
        { texto: '⚔️ Defender o grupo de qualquer forma — não arriscar',   proxima: 'coordenar_defesa'    },
      ],
    },

    o_emissario_espera: {
      texto: 'Quatro humanos e quatro Avatares imóveis no terceiro andar.\n\nO Emissário abaixo não se move.\n\nTrinta segundos. Quarenta.\n\nEntão você entende o que está acontecendo — não através de raciocínio, mas através do vínculo que está aprendendo a usar antes de saber que usa: ele não sabe que você está aqui.\n\nO objeto. Ele está rastreando o objeto.\n\nE o objeto, no seu bolso, está bloqueando o sinal por alguma razão que você não vai entender hoje.\n\nYasmin, quase imperceptível: "Por que ele parou?"\n\n[nome] olha para o seu bolso. Depois para o Emissário. Depois para você.\n\nEla sabe exatamente por quê.\n\nE então Renan, que não recebeu o memo sobre ficar imóvel, faz o que trinta dias de sobrevivência sozinho e um instinto de ex-militar produzem: cria uma distração. Joga um pedaço de drywall pela janela do lado oposto.\n\nO Emissário reorienta.\n\nAchou vocês.',
      escolhas: [
        { texto: '⚔️ Lutar juntos — não existe outra opção agora', proxima: 'coordenar_defesa' },
      ],
    },

    coordenar_defesa: {
      texto: 'O protocolo de Renan é bom.\n\nEscada de emergência traseira como saída. Segundo andar como posição elevada. Cinza na frente, Eco cobrindo flancos, os humanos atrás e em cima.\n\nO problema: o Emissário não sobe pela escada principal. Não sobe por nenhuma rota física.\n\nEle está no segundo andar antes de vocês chegarem lá.\n\nCinza interpõe. O confronto entre um Avatar de terra-sombra e um Emissário do Vácuo tem a qualidade de dois idiomas discutindo em voz alta — forças que se reconhecem mas não se entendem. Cinza segura. Não indefinidamente, mas suficiente.\n\n[nome] puxa você pelo braço. Não para longe — para um ângulo específico. Um ponto no corredor do segundo andar onde a luz ainda entra por um buraco no teto.\n\nEco se posiciona ao lado de [nome] sem que Yasmin precise pedir.\n\nOs três Avatares estão criando algo. Não um ataque — uma geometria.\n\nRenan, do corredor: "O que eles estão fazendo?"\n\nVocê não sabe. Mas sabe a resposta de ontem: confiar primeiro, entender depois.',
      escolhas: [
        { texto: '✨ Entrar no ponto de luz — confiar na geometria deles',      proxima: 'a_geometria_dos_avatares' },
        { texto: '⚔️ Cobrir a retaguarda de Cinza — não deixar Renan sozinho', proxima: 'a_geometria_dos_avatares' },
      ],
    },

    a_geometria_dos_avatares: {
      texto: 'Quando os três Avatares se posicionam, o Emissário para.\n\nNão como surpresa. Como reconhecimento.\n\nEle conhece essa formação.\n\nE isso — o fato de que ele conhece — muda o que vocês sabem sobre o que está acontecendo. Avatares de elementos diferentes, de Fracturas diferentes, de lados diferentes da batalha: eles já fizeram isso antes. Em algum tempo ou lugar que não existe no vocabulário humano do pós-guerra, eles já criaram essa geometria.\n\nEla existia antes de vocês precisarem dela.\n\nO Emissário recua um passo. Depois outro. A presença que ele carrega — a retirada de som, de luz, de calor — começa a se contrair de volta para dentro dele como maré que decide voltar.\n\nNão é derrota. É cálculo.\n\nEle está recuando porque a combinação de três Avatares é mais do que seu protocolo previu. Alguém — alguma coisa — não contou para ele que poderiam estar juntos.\n\nE enquanto ele recua, [nome] faz algo que você vai lembrar por muito tempo: ela olha para Cinza e Eco, e inclina a cabeça. O gesto que você reconhece como o dela.\n\nObrigada.',
      escolhas: [
        { texto: '👁 Observar o Emissário até sumir completamente', proxima: 'depois_do_recuo' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 7 — DEPOIS DA BATALHA
    // ══════════════════════════════════════════════════

    depois_do_recuo: {
      texto: 'O Emissário some pela janela com a mesma ausência de física com que chegou.\n\nNão volta para uma Fractura. Simplesmente deixa de estar visível no espectro normal do mundo. Isso é diferente. Isso é pior, de uma certa forma — você pode rastrear o que usa rotas físicas.\n\nOs quatro humanos ficam na posição por dois minutos depois que ele some. Protocolo tácito de quem já errou antes por encerrar o estado de alerta cedo demais.\n\nDepois Renan senta num fragmento de parede no corredor. Isso, você entende, é o equivalente dele a um colapso controlado.\n\nYasmin vai até Eco e fica de joelhos ao lado dela por um momento. Não fala. Só fica.\n\nVocê e [nome] ficam juntos no ponto de luz que ela escolheu. Ela não se move. O vínculo, agora de quase dois dias, carrega algo que você não tem nome ainda mas que reconhece como a textura de algo que vai ser importante para o resto da sua vida, seja ela qual for.\n\nRenan, do corredor, sem levantar: "Eu tive um protocolo por trinta dias que funcionou porque fui eu e Cinza. Esse protocolo acabou de dia."\n\nPausa.\n\n"Isso é mau ou bom?"',
      escolhas: [
        { texto: '🤝 "Bom. O protocolo novo é melhor que o anterior."',          proxima: 'a_decisao_final_alianca'  },
        { texto: '🧠 Olhar para [nome] antes de responder',                      proxima: 'nome_decide_junto'        },
      ],
    },

    nome_decide_junto: {
      texto: 'Você olha para [nome].\n\nEla te olha de volta por um segundo. Depois olha para Cinza. Depois para Eco. Depois para Renan.\n\nE faz o gesto que você aprendeu a ler como aprovação — a inclinação mínima de cabeça que ela reserva para coisas que custam peso real e que valem esse custo.\n\nVocê se volta para Renan.',
      escolhas: [
        { texto: '🤝 "Bom. O protocolo novo é melhor que o anterior."',     proxima: 'a_decisao_final_alianca' },
        { texto: '⚠️ "Ainda tem algo sobre o norte que precisamos resolver."', proxima: 'a_decisao_com_ressalva' },
      ],
    },

    a_decisao_com_ressalva: {
      texto: 'Renan levanta.\n\nOlha para você por tempo suficiente para que a avaliação seja completa — não o olhar de alguém decidindo se confia, mas o olhar de alguém decidindo o quanto revela de uma confiança que já tomou decisão.\n\n"A coisa ao norte," ele diz, "é alguém que eu conhecia. Antes."\n\nYasmin fecha os olhos. Ela sabia que isso ia chegar aqui nesse dia.\n\n"Era militar comigo. Entrou numa Fractura por conta própria, sem Avatar, sem protocolo, sem nenhuma das coisas que eu aprendi depois que tornam isso sobrevivível."\n\nCinza vai até Renan. Senta ao lado dele. Não como guarda — como peso compartilhado.\n\n"O que saiu por aquela Fractura dois dias atrás andava como ele andava. A mesma postura, o mesmo ritmo. Mas quando eu chamei pelo nome—"\n\nEle para.\n\nYasmin, baixo: "Não virou."\n\nO silêncio depois dessa frase tem um tipo específico de gravidade.',
      escolhas: [
        { texto: '🤝 "Nós lidamos com isso juntos."',                          proxima: 'a_decisao_final_alianca' },
        { texto: '👁 "Então temos mais dois problemas além dos Emissários."',  proxima: 'a_decisao_final_alianca' },
      ],
    },

    // ══════════════════════════════════════════════════
    // ETAPA 8 — FINAIS
    // ══════════════════════════════════════════════════

    a_decisao_final_alianca: {
      texto: 'A decisão não é declarada. Acontece.\n\nRenan começa a reorganizar os mapas como se houvesse um projeto. Yasmin começa a separar o que têm de provisões em quatro partes iguais sem que ninguém peça. [nome] e Cinza ficam lado a lado numa janela sem competição, sem hierarquia — dois Avatares que se reconhecem como algo próximo o suficiente para dividir guarda.\n\nEco toca [nome] levemente com a ponta da cauda.\n\n[nome] responde com o mesmo toque.\n\nVocê e Renan ficam sobre o mapa combinado. Dezoito Fracturas. Um padrão espiral. Um ponto central que nenhum de vocês foi ainda. Uma coisa ao norte que não voltou quando chamou o nome. Um objeto com nome em língua que nenhum humano lê.\n\nO mundo pós-guerra não melhorou. O Vácuo não recuou. As Fracturas continuam abertas e continuarão por tempo que nenhum dos dois vai calcular em voz alta.\n\nMas alguma coisa mudou neste terceiro andar de um prédio sem nome numa cidade sem nome.\n\nO Vácuo não contou com que vocês se encontrassem.',
      fim: true,
      recompensa: { xp: 80, vinculo: 5, humor: 15, saude: -5 },
      texto_fim: '🤝 Uma aliança frágil. Quatro humanos, quatro Avatares, e uma espiral que fecha para algum lugar que ainda não tem nome.',
    },

    fim_caminho_proprio: {
      texto: 'Você olha para [nome] por um segundo longo.\n\nEla olha de volta. E faz o gesto que virou para você nos últimos dois dias — a pata levantada levemente, um gesto que você aprendeu a traduzir como: você escolhe, e eu fico com o que você escolher.\n\nVocê olha para Renan. Para Yasmin. Para Cinza e para o que Cinza não quis dizer sobre o objeto. Para Yasmin e para o norte que ela não menciona mais.\n\nSão boas pessoas num mundo que não tem mais gradações finas para bondade. Sobreviventes que construíram protocolo a partir de caos. Avatares que formaram geometria de proteção sem serem pedidos.\n\nMas [nome] ficou quieta quando Cinza escreveu aquela palavra no pó. E ela conhece essa palavra.\n\nE não está pronta para que Renan saiba que ela conhece.\n\nVocê agradece. Compartilha o que tem de provisões — o suficiente para ser gesto real, não simbólico. Deixa uma cópia do mapa de [nome] com eles.\n\nYasmin entende primeiro. Renan entende depois. Nenhum dos dois tenta parar.\n\nLá fora, a espiral de Fracturas continua fechando para o sul. E você e [nome] têm uma vantagem pequena, não compartilhada, sobre o que está no centro dela.',
      fim: true,
      recompensa: { xp: 85, vinculo: 4, humor: 10 },
      texto_fim: '👁 Vocês seguiram em frente sozinhos. Algumas informações têm que ser guardadas até que o tempo certo exista para elas.',
    },

  },
});
