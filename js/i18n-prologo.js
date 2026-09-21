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
// A primeira versão repetia o Capítulo I quase ao pé da letra — o céu cor de
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
//
// ── POR QUE SÃO TRÊS ──
//
// O jogo dá três avatares — são os três de uma vida, e depois é o
// mercado ou uma cruza — e o texto diz o mesmo que o jogo faz a seguir.
// A chegada deles tem PÁGINA PRÓPRIA, a sétima.
//
// ── O FORMATO (texto do dono do jogo, 15/09/2026) ──
//
// Uma linha por parágrafo: cada '\n\n' é uma linha na tela, centralizada,
// e a máquina de escrever faz uma pausa entre elas. As quebras são as
// que o dono do jogo escreveu, página por página, e o inglês segue as
// mesmas. Um trecho entre **dois pares de asteriscos** sai em negrito
// dourado (ver _loreTypewriter, em js/lore.js).
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    'prologo.titulo':     'ANTES DE TUDO',
    'prologo.btn.mao':        '🖐 Estender a mão aos três',
    'prologo.btn.continuar':  'Continuar →',
    'prologo.btn.saltar':     '↓ Mostrar tudo',
    'prologo.btn.fechar': 'Fechar',

    'prologo.p1': '2047. Três anos se passaram desde as bombas.',

    'prologo.p2': 'Ninguém conta mais os mortos.\n\nAgora, o que se conta é o que sobrou:\n\nDoze cidades com energia, quatro estradas que ainda levam a algum lugar e quantos dias faltam até a próxima chuva que preste.',

    'prologo.p3': 'As ogivas não pararam no chão.\n\nAlgumas caíram bem em cima das linhas de falha — aquelas que os geólogos mediam havia décadas e nunca souberam explicar.\n\nOnde isso aconteceu, o que se abriu não foi uma cratera.\n\nForam rasgos verticais, da altura de um homem ou de um prédio.\n\nNão projetam sombra.\n\nNão deixam a poeira entrar.\n\nQuem chega a vinte passos sente os dentes doerem, a bússola girar devagar, o relógio atrasar — e nunca mais acertar.',

    'prologo.p4': 'Os poucos cientistas que restaram batizaram as feridas de **Fraturas do Véu**.\n\nPara todo mundo, são portais.\n\nE o costume é dar a volta e nunca chegar perto.\n\nUm costume que se aprende porque delas saem coisas.\n\nHá as que vêm sem forma e engolem o som antes de aparecer.\n\nDessas, você ouviu falar demais e viu o bastante para nunca contar a ninguém.\n\nE há o resto.',

    'prologo.p5': 'Criaturas do tamanho de um cão, feitas de luz densa e de uma cor que é só delas — e não há duas iguais. Atravessam sem nada: sem bando, sem território, sem nada do que as prendia ao outro lado.\n\nSozinhas, elas se apagam em poucos dias.\n\nFoi assim com quase todas.\n\nA menos que encontrem alguém.\n\nNinguém explicou ainda por que precisam de um humano para permanecer inteiras, nem por que escolhem quem escolhem.\n\nSó se sabe que, quando acontece, as duas metades passam a valer mais do que valiam separadas.\n\nA isso chamam de vínculo.\n\nA elas, de Avatares.',

    'prologo.p6': 'Você ouviu essa parte de terceiros e a guardou junto com as outras histórias que não ajudam a engolir.\n\nEntão, esta manhã, a cinquenta metros de onde você dormiu, o ar se abriu.\n\nVocê já passou por outras sem parar, e todas se fecharam sozinhas.\n\nEsta não.\n\nAlarga, se firma, e a luz lá dentro tem cor de coisa viva.\n\nE dela sai algo.\n\nPequenos. Respirando. Sem nome — nome é coisa que alguém dá, e ninguém deu a eles.\n\nOlham direto para você.\n\nSem medo e sem pressa, com a calma de quem chegou ao lugar certo.',

    'prologo.p7': 'Um atrás do outro.\n\nOs três ficam e a abertura se fecha.\n\nNunca ninguém contou três de uma vez.\n\nVocê não sabe se isso é sorte ou se é a Fratura sabendo de alguma coisa que você não sabe — e nenhuma das duas respostas muda o que precisa ser feito agora.',
  },
  // ── ENGLISH (US) ───────────────────────────────────────────────
  {
    'prologo.titulo':     'BEFORE ANY OF THIS',
    'prologo.btn.mao':        '🖐 Reach out to all three',
    'prologo.btn.continuar':  'Continue →',
    'prologo.btn.saltar':     '↓ Show it all',
    'prologo.btn.fechar': 'Close',

    'prologo.p1': '2047. Three years have passed since the bombs.',

    'prologo.p2': 'Nobody counts the dead anymore.\n\nNow, what gets counted is what is left:\n\nTwelve cities with power, four roads that still lead somewhere and how many days until the next rain worth having.',

    'prologo.p3': 'The warheads did not stop at the ground.\n\nSome came down right on top of the fault lines — the ones geologists had measured for decades and never managed to explain.\n\nWhere that happened, what opened was not a crater.\n\nIt was vertical tears, as tall as a man or a building.\n\nThey cast no shadow.\n\nThey let no dust in.\n\nGet within twenty paces and your teeth ache, your compass turns slowly, your watch falls behind — and never keeps time again.',

    'prologo.p4': 'The few scientists who survived named the wounds the **Fractures of the Veil**.\n\nTo everyone else, they are portals.\n\nAnd the custom is to go around them and never get close.\n\nA custom you learn because things come out of them.\n\nThere are the ones that come without shape and swallow sound before they appear.\n\nOf those, you have heard too much and seen enough to never tell anyone.\n\nAnd then there is the rest.',

    'prologo.p5': 'Creatures the size of a dog, made of dense light and of a color all their own — and no two are alike. They cross over with nothing: no pack, no territory, nothing of what bound them to the other side.\n\nAlone, they fade out within a few days.\n\nThat is how it went for almost all of them.\n\nUnless they find someone.\n\nNobody has explained yet why they need a human to stay whole, or why they choose the ones they choose.\n\nAll anyone knows is that, when it happens, the two halves come to be worth more than they were apart.\n\nThat is what people call a bond.\n\nAnd them, Avatars.',

    'prologo.p6': 'You heard that part secondhand and filed it away with the other stories that do not make anything easier to swallow.\n\nThis morning, fifty meters from where you slept, the air opened.\n\nYou have walked past others without stopping, and every one of them closed on its own.\n\nNot this one.\n\nIt widens, steadies, and the light inside is the color of life.\n\nAnd something comes out of it.\n\nSmall. Breathing. Nameless — a name is something someone gives, and no one ever gave them one.\n\nThey look straight at you.\n\nWithout fear and without hurry, with the calm of those who have arrived at the right place.',

    'prologo.p7': 'One after another.\n\nThe three of them stay, and the opening closes.\n\nNo one has ever counted three at once.\n\nYou do not know whether that is luck or the Fracture knowing something you do not — and neither answer changes what has to be done now.',
  }
);
