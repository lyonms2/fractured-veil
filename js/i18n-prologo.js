// ═══════════════════════════════════════════════════════════════════
// I18N — Prólogo (prologo.js)
// Carregado após i18n.js · usa registerStrings()
//
// O texto do prólogo vive aqui, e não dentro do prologo.js como nos
// capítulos, porque esta é a primeira tela que TODO o jogador vê.
// Os capítulos I e II ainda são portugueses cravados no código; o
// prólogo não podia dar-se a esse luxo.
//
// Sobre o que ele conta, e o que deliberadamente NÃO conta:
//
// A primeira versão repetia o Capítulo I quase à letra — o céu cor de
// ferrugem, a água para dois dias, "a quarta que você vê esta semana".
// Quem lesse os dois lia a mesma coisa duas vezes, e nenhum dos dois
// ganhava com isso. O prólogo passa a tratar do MUNDO (o que é uma
// Fratura, o que sai dela, por que os Avatares precisam de alguém) e
// deixa o primeiro encontro em câmera lenta para o Capítulo I, que é
// onde ele tem escolhas e vale a pena.
//
// De caminho, a explicação de por que uma criatura sozinha se apaga em
// poucos dias é também a razão de existir o resto do jogo: alimentar,
// limpar, dormir, o vínculo. A lore deixa de ser decoração ao lado das
// mecânicas e passa a dizer para que elas servem.
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    'prologo.titulo':     'ANTES DE TUDO',
    'prologo.btn.mao':    '🖐 Estender a mão',
    'prologo.btn.fechar': 'Fechar',

    'prologo.p1': '2047. Três anos depois das bombas.',

    // "Conta-se o que sobrou" era ênclise de Portugal; em brasileiro o
    // pronome vem antes.
    'prologo.p2': 'Ninguém conta mais os mortos. Agora se conta o que sobrou: doze cidades com energia, quatro estradas que ainda levam a algum lugar, e quantos dias faltam até a próxima chuva que preste.',

    // "Onde caíram em cima das linhas de falha — ... — abriram outra
    // coisa" lia-se como pergunta: o "Onde" abre a frase como se fosse
    // interrogativo, e o travessão punha quinze palavras entre o sujeito
    // e o verbo. São duas frases agora.
    'prologo.p3': 'As ogivas não pararam no chão. Algumas caíram bem em cima das linhas de falha — aquelas que os geólogos mediam havia décadas e nunca souberam explicar.\n\nOnde isso aconteceu, o que se abriu não foi cratera. Rasgos verticais, da altura de um homem ou de um prédio. Não projetam sombra. Não deixam a poeira entrar. Quem chega a vinte passos sente os dentes doerem, a bússola girar devagar, o relógio atrasar e nunca mais acertar.',

    // Havia erro de concordância: "Há O QUE vem sem forma" e logo a
    // seguir "DESSAS você ouviu falar". Agora é plural nos dois.
    'prologo.p4': 'Os poucos cientistas que restaram batizaram as feridas de Fraturas do Véu. Para todo mundo são portais, e o costume é dar a volta.\n\nCostume que se aprende porque delas sai coisa.\n\nHá os que vêm sem forma e engolem o som antes de aparecer. Desses você ouviu falar demais e viu o bastante para nunca contar a ninguém.\n\nE há o resto.',

    // Três consertos: "sem o que quer que as segurasse" (arrastado),
    // "apagam-se" (ênclise) e "Chamam a isso vínculo", que é regência
    // de Portugal — em brasileiro se chama de.
    'prologo.p5': 'Criaturas do tamanho de um cão, feitas de luz densa e de um elemento que é só delas — fogo, água, terra, vento, sombra. Atravessam sem nada: sem bando, sem território, sem nada do que as segurava no outro lado.\n\nSozinhas, elas se apagam em poucos dias. Foi assim com quase todas.\n\nA menos que encontrem alguém.\n\nNinguém explicou ainda por que precisam de um humano para ficar inteiras, nem por que escolhem quem escolhem. Só se sabe que, quando acontece, as duas metades passam a valer mais do que valiam separadas. A isso chamam de vínculo. A elas, de Avatares.',

    // "Esta não fica quieta: alarga, estabiliza" dizia uma coisa e a
    // contrária na mesma frase. O que a distingue não é agitação — é
    // não se fechar como as outras se fecharam.
    'prologo.p6': 'Você ouviu essa parte de terceiros e a guardou junto com as outras histórias que não ajudam a comer.\n\nEntão, esta manhã, a cinquenta metros de onde você dormiu, o ar se abriu.\n\nVocê já passou por outras sem parar, e todas se fecharam sozinhas. Esta não: alarga, se firma, e a luz lá dentro tem cor de coisa viva.\n\nE dela sai algo.\n\nPequeno. Respirando. Sem nome — nome é coisa que alguém dá, e ninguém deu.\n\nOlha direto para você. Sem medo e sem pressa, com a calma de quem chegou ao lugar certo.',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    'prologo.titulo':     'BEFORE ANY OF THIS',
    'prologo.btn.mao':    '🖐 Reach out',
    'prologo.btn.fechar': 'Close',

    'prologo.p1': '2047. Three years after the bombs.',

    // "any more" é grafia britânica; em inglês americano é uma palavra.
    'prologo.p2': 'Nobody counts the dead anymore. What gets counted now is the remainder: twelve cities with power, four roads that still lead somewhere, and how many days until the next rain worth catching.',

    // A mesma frase torcida do português, pelo mesmo motivo.
    'prologo.p3': 'The warheads did not stop at the ground. Some of them came down right on top of the fault lines — the ones geologists had been measuring for decades and could never explain.\n\nWhere that happened, what opened was not a crater. Vertical tears, the height of a man or of a building. They cast no shadow. They let no dust in. Come within twenty paces and your teeth ache, your compass turns slowly, your watch falls behind and never catches up.',

    // O mesmo erro de número do português: "the kind that arrives"
    // seguido de "you have heard about THOSE".
    'prologo.p4': 'The few scientists still alive named the wounds the Fractures of the Veil. To everyone else they are portals, and the custom is to walk around them.\n\nA custom you learn, because things come out.\n\nThere are the ones that arrive without shape and swallow sound before they appear. Of those you have heard too much, and seen enough never to tell anyone.\n\nAnd there is the rest.',

    // "none of whatever held them" e "That, people call a bond" eram
    // as duas construções mais torcidas do texto.
    'prologo.p5': 'Creatures the size of a dog, made of dense light and of an element that is theirs alone — fire, water, earth, wind, shadow. They cross with nothing: no pack, no territory, nothing of what held them together on the other side.\n\nAlone, they fade out within days. That is how it went for nearly all of them.\n\nUnless they find someone.\n\nNobody has explained yet why they need a human to stay whole, or why they choose the ones they choose. All anyone knows is that when it happens, the two halves come to be worth more than they were apart. People call that a bond. The creatures, they call Avatars.',

    // "will not settle: it widens, it steadies" — a mesma contradição.
    'prologo.p6': 'You heard that part secondhand and filed it with the other stories that do not help you eat.\n\nThen, this morning, fifty meters from where you slept, the air opened.\n\nYou have walked past others without stopping, and every one of them closed on its own. This one does not: it widens, it steadies, and the light inside it has the color of something alive.\n\nAnd out of it comes something.\n\nSmall. Breathing. With no name — a name is something somebody gives, and nobody has.\n\nIt looks straight at you. Without fear and without hurry, with the calm of something that has arrived where it meant to.',
  }
);
