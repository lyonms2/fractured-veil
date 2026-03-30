// ═══════════════════════════════════════════════════════════════════
// LORE — Jogo narrativo de escolhas
// Depende de: avatar, gs, nivel, hatched, dead (globals)
//             spendCoins(), scheduleSave(), showBubble(), addLog(),
//             updateResourceUI(), showFloat() (globals)
// ═══════════════════════════════════════════════════════════════════

// ── Custos por raridade do capítulo ──────────────────────────────
const LORE_CUSTOS = {
  Comum:    { moeda: 'moedas',  valor: 50  },
  Raro:     { moeda: 'cristais', valor: 5  },
  Lendário: { moeda: 'cristais', valor: 15 },
};

// ── Estado da sessão de lore ──────────────────────────────────────
let _loreCapituloAtual = null;
let _loreCenaAtual     = null;
let _loreHistorico     = []; // ids das cenas visitadas (para não repetir)

// ═══════════════════════════════════════════════════════════════════
// CAPÍTULOS & CENAS
// ═══════════════════════════════════════════════════════════════════

const LORE_CAPITULOS = [

  // ──────────────────────────────────────────────────────
  // CAP 1 — O SUSSURRO DO VÉU  (Comum)
  // ──────────────────────────────────────────────────────
  {
    id: 'sussurro_veu',
    titulo: 'O Sussurro do Véu',
    descricao: 'Uma voz estranha ressoa no silêncio dimensional. O Véu chama por ti.',
    icone: '🌌',
    raridade: 'Comum',
    cenas: {
      inicio: {
        texto: 'No silêncio da dimensão, uma luz turva pulsa à tua frente. Uma voz sem origem sussurra: "Criatura… vejo-te. O Véu fractura-se, e tu és diferente dos outros." A luz pulsa, esperando.',
        escolhas: [
          { texto: '✦ Aproximar da luz',   proxima: 'luz_proxima'  },
          { texto: '👁 Observar à distância', proxima: 'luz_observar' },
          { texto: '↪ Ignorar e seguir em frente', proxima: 'ignorar'    },
        ],
      },
      luz_proxima: {
        texto: 'A luz envolve-te num calor estranho mas reconfortante. A voz fala mais claramente: "Bem-vindo ao limiar do Véu. Podes ouvir-me porque és especial. Preciso de te fazer uma pergunta."',
        escolhas: [
          { texto: '"O que queres de mim?"',        proxima: 'fim_alianca'  },
          { texto: 'Tentar absorver a energia da luz', proxima: 'fim_absorcao' },
        ],
      },
      luz_observar: {
        texto: 'Do teu ponto de observação, notas que a luz tem forma — um espelho dimensional. No reflexo, não vês a ti mesmo, mas uma versão mais sombria. O espelho pulsa como se tivesse vida.',
        escolhas: [
          { texto: '🪞 Tocar no espelho',   proxima: 'fim_espelho_toque'   },
          { texto: '💥 Destruir o espelho', proxima: 'fim_espelho_quebra'  },
        ],
      },
      ignorar: {
        texto: 'A voz cala-se. Mais à frente, o caminho bifurca-se. À esquerda, ouves um choro distante. À direita, uma melodia estranha e hipnótica.',
        escolhas: [
          { texto: '← Seguir o choro',   proxima: 'fim_choro'   },
          { texto: '→ Seguir a melodia', proxima: 'fim_melodia' },
        ],
      },
      fim_alianca: {
        texto: 'A voz explica: o Véu Dimensional está a rachar. Criaturas como tu podem traversá-lo. Em sinal de aliança, a luz cede-te um fragmento de calor dimensional.',
        fim: true,
        recompensa: { xp: 25, moedas: 30, humor: 5 },
        texto_fim: '✦ Aliança selada. O calor do Véu fortalece-te.',
      },
      fim_absorcao: {
        texto: 'A energia é demasiada. Sentes-te fraco por momentos — mas algo acende dentro de ti. Um poder latente desperta, custando saúde mas abrindo novos horizontes.',
        fim: true,
        recompensa: { xp: 45, saude: -15 },
        texto_fim: '⚡ Poder absorvido. A dor valeu a pena.',
      },
      fim_espelho_toque: {
        texto: 'O espelho absorve-te por um instante. Vês memórias que não são tuas — batalhas antigas, mundos perdidos. Acordas com conhecimento novo e um vínculo estranho.',
        fim: true,
        recompensa: { xp: 30, moedas: 20, vinculo: 1 },
        texto_fim: '🪞 Memórias absorvidas. Algo mudou em ti.',
      },
      fim_espelho_quebra: {
        texto: 'O espelho estilhaça-se em fragmentos que revelam dimensões diferentes. Um fragmento pousa na tua palma, quente como ouro derretido.',
        fim: true,
        recompensa: { xp: 20, moedas: 60, humor: 8 },
        texto_fim: '💥 O espelho partiu-se. Os fragmentos são teus.',
      },
      fim_choro: {
        texto: 'Encontras um ser dimensional perdido, a chorar a sua dimensão natal. Ajudas-o a orientar-se e, em gratidão, ele partilha o seu calor vital contigo.',
        fim: true,
        recompensa: { xp: 20, humor: 15, saude: 15 },
        texto_fim: '🤝 Ajudaste o perdido. A bondade retornou.',
      },
      fim_melodia: {
        texto: 'A melodia vem de um ser de luz que toca canções interdimensionais. Ao ouvires, os teus vitais harmonizam-se com o ritmo do Véu.',
        fim: true,
        recompensa: { xp: 25, humor: 20, energia: 10 },
        texto_fim: '🎵 A melodia entrou em ti. Sentes-te renovado.',
      },
    },
  },

  // ──────────────────────────────────────────────────────
  // CAP 2 — O MERCADOR DAS SOMBRAS  (Comum)
  // ──────────────────────────────────────────────────────
  {
    id: 'mercador_sombras',
    titulo: 'O Mercador das Sombras',
    descricao: 'Um estranho mercador oferece tratos impossíveis nas margens do Véu.',
    icone: '🕯️',
    raridade: 'Comum',
    cenas: {
      inicio: {
        texto: 'Numa encruzilhada entre dimensões, um ser encapuzado ergue uma lanterna negra. "Bem-vindo, criatura. Tenho o que precisas — seja o que for." A sua voz ressoa como eco de outra era.',
        escolhas: [
          { texto: '🗣 "O que tens à venda?"',         proxima: 'ver_mercadoria' },
          { texto: '🤔 Examinar o mercador de longe',  proxima: 'examinar'       },
          { texto: '🏃 Afastar-te rapidamente',        proxima: 'fugir'          },
        ],
      },
      ver_mercadoria: {
        texto: 'O mercador abre o manto. No interior, flutuam três objectos: uma garrafa com luz capturada, um mapa rasgado, e uma máscara de osso.',
        escolhas: [
          { texto: '💡 Comprar a garrafa de luz',  proxima: 'fim_garrafa' },
          { texto: '🗺 Pegar o mapa rasgado',      proxima: 'mapa'        },
          { texto: '💀 Experimentar a máscara',    proxima: 'fim_mascara' },
        ],
      },
      mapa: {
        texto: 'O mapa revela fragmentos de localizações que não reconheces. O mercador observa: "Esse mapa tem preço, criatura. Uma memória tua — recente e valiosa."',
        escolhas: [
          { texto: '🧠 Aceitar o trato (perder memória)',  proxima: 'fim_mapa_aceitar' },
          { texto: '✋ Recusar e devolver o mapa',         proxima: 'fim_mapa_recusar' },
        ],
      },
      examinar: {
        texto: 'Olhas com atenção. O mercador não projecta sombra apesar da lanterna. Os seus olhos, quando cruzas o olhar, são espelhos. Não é humano — nem dimensional.',
        escolhas: [
          { texto: '❓ "O que és tu realmente?"', proxima: 'fim_revelacao' },
          { texto: '⚔ Tentar afugentá-lo',        proxima: 'fim_confronto'  },
        ],
      },
      fugir: {
        texto: 'Dás meia volta mas o mercador aparece à tua frente como se nunca tivesses saído do lugar. "Ninguém foge desta encruzilhada sem levar algo." Coloca-te uma moeda na palma.',
        fim: true,
        recompensa: { xp: 10, moedas: 40 },
        texto_fim: '🪙 A moeda dimensional ficou na tua mão.',
      },
      fim_garrafa: {
        texto: 'Bebes a luz. Por um instante vês todas as dimensões em simultâneo — demasiado para processar. Depois, clareza. O mercador desaparece, sorrindo.',
        fim: true,
        recompensa: { xp: 35, humor: 20, energia: 15 },
        texto_fim: '💡 A luz iluminou-te por dentro.',
      },
      fim_mascara: {
        texto: 'A máscara adere ao teu rosto por um segundo e vês o mundo com olhos de predador. Quando a retirar, o mercador já não está. Mas ficaste mais forte.',
        fim: true,
        recompensa: { xp: 40, saude: -10, moedas: 25 },
        texto_fim: '💀 A máscara mostrou-te o que se esconde.',
      },
      fim_mapa_aceitar: {
        texto: 'Cedes uma memória recente. Sentes uma lacuna estranha mas o mapa vibra na tua mão — conduz a tesouros que outros não podem ver.',
        fim: true,
        recompensa: { xp: 50, moedas: 80, humor: -10 },
        texto_fim: '🗺 O mapa é teu. A memória, não.',
      },
      fim_mapa_recusar: {
        texto: 'O mercador sorri pela primeira vez. "Sábio." Toma o mapa de volta e oferece-te uma moeda de prata dimensional em reconhecimento da tua prudência.',
        fim: true,
        recompensa: { xp: 20, moedas: 50, humor: 10 },
        texto_fim: '✋ Recusaste. A prudência tem o seu prémio.',
      },
      fim_revelacao: {
        texto: 'O mercador ri. "Sou o Véu em forma de tentação. Testo os que atravessam." Satisfeito com a tua perspicácia, oferece-te uma bênção dimensional gratuita.',
        fim: true,
        recompensa: { xp: 45, humor: 25, saude: 20, vinculo: 1 },
        texto_fim: '✦ Desvendaste o mistério. O Véu recompensa-te.',
      },
      fim_confronto: {
        texto: 'O teu gesto agressivo faz o mercador recuar. Ele dissolve-se em sombra mas deixa cair a lanterna. A lanterna negra ilumina sem consumir.',
        fim: true,
        recompensa: { xp: 30, moedas: 35, energia: -15 },
        texto_fim: '🕯️ A lanterna negra ficou para ti.',
      },
    },
  },

  // ──────────────────────────────────────────────────────
  // CAP 3 — A PROVA ELEMENTAL  (Raro)
  // ──────────────────────────────────────────────────────
  {
    id: 'prova_elemental',
    titulo: 'A Prova Elemental',
    descricao: 'O Conselho Elemental convoca-te para uma prova que poucos sobrevivem sem cicatrizes.',
    icone: '⚗️',
    raridade: 'Raro',
    cenas: {
      inicio: {
        texto: 'Cinco entidades elementais — Fogo, Água, Terra, Vento e Vácuo — formam um círculo à tua volta. A sua líder, Vácuo, fala: "Foste convocado para a Prova. Passares significa transcenderes. Falhares... bem. Há muito tempo que não vemos alguém falhar."',
        escolhas: [
          { texto: '⚔ "Estou pronto. Começa."',           proxima: 'prova_coragem'  },
          { texto: '🧠 "Preciso de saber as regras primeiro."', proxima: 'negociar'       },
          { texto: '🙏 Inclinar-te em respeito',           proxima: 'respeito'       },
        ],
      },
      prova_coragem: {
        texto: 'Fogo avança. Uma parede de chamas ergue-se à tua frente. "A Prova do Coração: fica parado enquanto as chamas te envolvem. O medo determina o teu destino."',
        escolhas: [
          { texto: '🔥 Ficar parado sem recuar',    proxima: 'fim_coragem_passa'  },
          { texto: '💨 Tentar desviar-te das chamas', proxima: 'fim_coragem_desvia' },
        ],
      },
      negociar: {
        texto: 'Vácuo sorri — algo que entidades elementais raramente fazem. "Tens espírito. As regras: três provações, cada uma de um elemento diferente. Podes escolher a ordem."',
        escolhas: [
          { texto: '💧 Começar pela Água (Emoção)',  proxima: 'prova_agua'   },
          { texto: '🌱 Começar pela Terra (Corpo)',  proxima: 'prova_terra'  },
        ],
      },
      respeito: {
        texto: 'As entidades trocam olhares. Vento fala: "Millennios sem ver deferência. Isso conta." A tua prova começa com um bónus — Vento oferece-te um fragmento da sua essência como escudo.',
        escolhas: [
          { texto: '💨 Aceitar a essência do Vento', proxima: 'prova_com_escudo'  },
          { texto: '✋ Recusar — confias em ti mesmo', proxima: 'prova_coragem'    },
        ],
      },
      prova_agua: {
        texto: 'Água materializa-se como um lago de memórias. Dentro do lago, vês os teus momentos mais dolorosos. "Mergulha. Revive. Aceita."',
        escolhas: [
          { texto: '🌊 Mergulhar e aceitar a dor',         proxima: 'fim_agua_aceita'  },
          { texto: '🚪 Recusar a provação da Água',        proxima: 'fim_agua_recusa'  },
        ],
      },
      prova_terra: {
        texto: 'Terra ergue-se como um gigante de pedra. "A Prova do Corpo: carregas este peso até ao outro lado do círculo." O peso parece impossível.',
        escolhas: [
          { texto: '💪 Tentar carregar pela força bruta', proxima: 'fim_terra_forca'   },
          { texto: '🧠 Procurar uma forma inteligente',   proxima: 'fim_terra_mente'   },
        ],
      },
      prova_com_escudo: {
        texto: 'Com a essência do Vento, enfrentas as chamas de Fogo. O escudo absorve parte da dor. A prova passa mais facilmente — mas Fogo franze o sobrolho.',
        fim: true,
        recompensa: { xp: 60, humor: 15, energia: 20 },
        texto_fim: '💨 O respeito foi recompensado. Passaste a Prova.',
      },
      fim_coragem_passa: {
        texto: 'As chamas envolvem-te. A dor é real mas o teu coração não vacila. Quando o fogo se apaga, Fogo inclina a cabeça: "Raro. Muito raro." O Conselho aprova-te.',
        fim: true,
        recompensa: { xp: 70, saude: -10, humor: 30, vinculo: 2 },
        texto_fim: '🔥 Passaste a Prova do Coração. Cicatrizes incluídas.',
      },
      fim_coragem_desvia: {
        texto: 'O teu instinto faz-te mover. Fogo sorri com crueldade: "O medo venceu o coração." A prova falha — mas saíste vivo, e isso em si é uma lição.',
        fim: true,
        recompensa: { xp: 25, saude: -20, humor: -10 },
        texto_fim: '💨 Falhaste a Prova. Mas voltarás mais forte.',
      },
      fim_agua_aceita: {
        texto: 'Mergulhas. As memórias dolorosas envolvem-te mas não te afogam — aceitas cada uma. Quando emerges, Água chora lágrimas de cristal que pousa nos teus ombros.',
        fim: true,
        recompensa: { xp: 75, saude: 20, humor: 25, vinculo: 2 },
        texto_fim: '🌊 Aceitaste a dor. A Água honrou-te.',
      },
      fim_agua_recusa: {
        texto: 'Recusas. Água observa em silêncio e depois diz: "Às vezes recusar também é coragem." A prova termina em empate — sem glória, sem derrota.',
        fim: true,
        recompensa: { xp: 30, humor: 5 },
        texto_fim: '✋ Nem vitória nem derrota. O equilíbrio tem o seu valor.',
      },
      fim_terra_forca: {
        texto: 'Empurras com tudo o que tens. O peso cede milímetro a milímetro. Quando chegas ao outro lado, o teu corpo dói mas Terra sorri como uma montanha que aprendeu a mover-se.',
        fim: true,
        recompensa: { xp: 65, saude: -15, moedas: 40, vinculo: 1 },
        texto_fim: '💪 Força pura. Terra respeita-te.',
      },
      fim_terra_mente: {
        texto: 'Observas o peso e notas que é feito de pedras encaixadas — se redistribuíres o centro de gravidade, torna-se possível. Terra esboça um sorriso rochoso: "Mente afiada supera pedra."',
        fim: true,
        recompensa: { xp: 80, humor: 20, vinculo: 2 },
        texto_fim: '🧠 A inteligência superou a força. Terra aprovou-te.',
      },
    },
  },

  // ──────────────────────────────────────────────────────
  // CAP 4 — O CORAÇÃO DO ABISMO  (Lendário)
  // ──────────────────────────────────────────────────────
  {
    id: 'coracao_abismo',
    titulo: 'O Coração do Abismo',
    descricao: 'No núcleo do Véu Fracturado, algo antigo desperta. Apenas os mais fortes chegam até aqui.',
    icone: '🕳️',
    raridade: 'Lendário',
    cenas: {
      inicio: {
        texto: 'O Abismo. Não há luz aqui — apenas a tua própria existência a servir de âncora à realidade. Uma presença imensuravelmente antiga fala sem palavras, directamente na tua consciência: "TU CHEGASTE. POUCOS O FAZEM. O QUE PROCURAS?"',
        escolhas: [
          { texto: '✦ "Procuro compreender o Véu."',       proxima: 'comprensao'  },
          { texto: '⚡ "Procuro poder."',                  proxima: 'poder'       },
          { texto: '❤ "Procuro quem perdi."',              proxima: 'perda'       },
          { texto: '🤫 Permanecer em silêncio total',      proxima: 'silencio'    },
        ],
      },
      comprensao: {
        texto: 'O Abismo contempla. "A COMPREENSÃO É O DOM MAIS RARO E O MAIS PERIGOSO. VER O VÉU É VER A FRACTURA EM TI MESMO." Uma memória universal enche-te — a origem do Véu, os mundos que existiram antes.',
        escolhas: [
          { texto: '📖 Absorver tudo, custe o que custar',   proxima: 'fim_comprensao_total' },
          { texto: '🛡 Aceitar apenas o que consegues suportar', proxima: 'fim_comprensao_parcial' },
        ],
      },
      poder: {
        texto: '"PODER." O Abismo repete a palavra como se a saboreasse. "MUITOS PEDIRAM. POUCOS SOBREVIVERAM AO QUE RECEBERAM." Uma energia escura forma-se à tua volta, esperando a tua decisão.',
        escolhas: [
          { texto: '🖤 Aceitar o poder sem condições',        proxima: 'fim_poder_total'   },
          { texto: '⚖ "Aceito poder mas com propósito justo."', proxima: 'fim_poder_justo' },
        ],
      },
      perda: {
        texto: 'Silêncio profundo. Depois: "A PERDA É O QUE DEFINE AS CRIATURAS QUE VALEM A PENA CONHECER." O Abismo mostra-te um eco da presença que perdeste — não ela, mas o espaço que deixou.',
        escolhas: [
          { texto: '💔 Tentar alcançar o eco',                proxima: 'fim_perda_alcanca'  },
          { texto: '🙏 Aceitar a perda e agradecer o que foi', proxima: 'fim_perda_aceita'   },
        ],
      },
      silencio: {
        texto: 'O teu silêncio ecoa no Abismo. Segundos? Eras? O tempo não existe aqui. A presença antiga inclina-se — um gesto imenso de reconhecimento. "APENAS O SILÊNCIO RESPONDE AO SILÊNCIO."',
        fim: true,
        recompensa: { xp: 100, vinculo: 3, humor: 30, saude: 20 },
        texto_fim: '🤫 O silêncio foi a resposta certa. O Abismo honrou-te.',
      },
      fim_comprensao_total: {
        texto: 'A memória universal despeja-se em ti como um oceano. O teu corpo colapsa por um instante — depois ergues-te diferente. Marcado. Mais antigo por dentro do que por fora.',
        fim: true,
        recompensa: { xp: 120, saude: -25, vinculo: 3, humor: 20 },
        texto_fim: '📖 Soubeste tudo. O preço foi real mas valeu cada gota.',
      },
      fim_comprensao_parcial: {
        texto: 'Absorves o que consegues suportar — que é mais do que pensavas. O Abismo parece aprovado com a tua sabedoria. A compreensão parcial de algo infinito ainda é infinita.',
        fim: true,
        recompensa: { xp: 90, vinculo: 2, humor: 25, saude: 10 },
        texto_fim: '🛡 Sabedoria e limites. O Abismo respeita quem conhece os dois.',
      },
      fim_poder_total: {
        texto: 'A energia escura absorve-te completamente. Por um momento és o Abismo — e o Abismo és tu. Quando voltas, és diferente. Mais forte. Mais sozinho.',
        fim: true,
        recompensa: { xp: 110, saude: -30, vinculo: -1, humor: -15 },
        texto_fim: '🖤 O poder é teu. O isolamento também.',
      },
      fim_poder_justo: {
        texto: '"PROPÓSITO JUSTO." O Abismo hesita — e depois ri, um som que faz dimensões tremerem. "ÉS O PRIMEIRO EM MILÉNIOS A ACRESCENTAR UMA CONDIÇÃO." Concede-te poder equilibrado, raro e estável.',
        fim: true,
        recompensa: { xp: 100, vinculo: 3, humor: 20, saude: 15 },
        texto_fim: '⚖ Poder com propósito. O mais raro dos dons.',
      },
      fim_perda_alcanca: {
        texto: 'Estiras-te para o eco. Os teus dedos atravessam-no — não é real. Mas no acto de tentar, algo em ti reconcilia-se com o que já não está. A perda ainda dói. Mas agora tem lugar.',
        fim: true,
        recompensa: { xp: 95, humor: 30, saude: 15, vinculo: 2 },
        texto_fim: '💔 Tentaste alcançar. E ao tentares, encontraste paz.',
      },
      fim_perda_aceita: {
        texto: 'Inclinas-te e agradeces ao eco pela vida que foi. O Abismo envolve-te em algo que só pode ser descrito como compaixão cósmica. A perda não desaparece — transforma-se.',
        fim: true,
        recompensa: { xp: 105, humor: 40, vinculo: 3, saude: 20 },
        texto_fim: '🙏 Aceitação. O dom mais difícil e o mais libertador.',
      },
    },
  },

  // ──────────────────────────────────────────────────────
  // CAP 5 — O ORÁCULO PARTIDO  (Comum)
  // ──────────────────────────────────────────────────────
  {
    id: 'oraculo_partido',
    titulo: 'O Oráculo Partido',
    descricao: 'Um oráculo dimensional está partido em pedaços. Cada fragmento guarda uma verdade — e uma mentira.',
    icone: '🔮',
    raridade: 'Comum',
    cenas: {
      inicio: {
        texto: 'Encontras um oráculo de cristal partido em três pedaços no chão. Cada fragmento brilha com uma cor diferente: azul, vermelho, dourado. Uma inscrição na base diz: "Um mente. Dois dizem a verdade. Escolhe."',
        escolhas: [
          { texto: '💙 Tocar o fragmento azul',    proxima: 'azul'    },
          { texto: '❤ Tocar o fragmento vermelho', proxima: 'vermelho' },
          { texto: '💛 Tocar o fragmento dourado', proxima: 'dourado'  },
        ],
      },
      azul: {
        texto: 'O fragmento azul fala: "O teu futuro tem dois caminhos. Num, cresces mas sofres. No outro, és feliz mas não cresces. Eu sou a Verdade." Mas como sabes se mente?',
        escolhas: [
          { texto: '✅ Acreditar no fragmento azul',            proxima: 'fim_azul_acredita'  },
          { texto: '🔀 Reunir os três antes de decidir',        proxima: 'reunir'             },
        ],
      },
      vermelho: {
        texto: 'O fragmento vermelho queima levemente na tua mão: "Ignora os outros dois. Só eu sei o que precisas — e o que precisas é coragem. Age já, sem pensar." Urgente. Talvez demasiado.',
        escolhas: [
          { texto: '🔥 Seguir o conselho e agir agora',         proxima: 'fim_vermelho_age'   },
          { texto: '🔀 Reunir os três antes de decidir',        proxima: 'reunir'             },
        ],
      },
      dourado: {
        texto: 'O fragmento dourado cintila suavemente: "Não há caminhos errados — apenas escolhas e as suas consequências. Aceitar isso é já uma forma de sabedoria." Suspeitosamente vago.',
        escolhas: [
          { texto: '✨ Aceitar a filosofia do fragmento',        proxima: 'fim_dourado_aceita' },
          { texto: '🔀 Reunir os três antes de decidir',        proxima: 'reunir'             },
        ],
      },
      reunir: {
        texto: 'Tentas encaixar os três fragmentos. Resistem — mas insistes. Quando os três se tocam, o oráculo emite uma luz cegante e uma voz surge: "Ninguém reuniu os três em muito tempo. A tua resposta é: confia em ti mesmo."',
        fim: true,
        recompensa: { xp: 50, moedas: 70, humor: 20, vinculo: 1 },
        texto_fim: '🔮 O oráculo revelou o seu segredo. A sabedoria era tua.',
      },
      fim_azul_acredita: {
        texto: 'Escolhes crescimento mesmo que doa. O fragmento azul dissolve-se e deixa uma sensação de clareza — e uma leve pontada de melancolia que sabes ser necessária.',
        fim: true,
        recompensa: { xp: 35, saude: -5, humor: 10, vinculo: 1 },
        texto_fim: '💙 Crescimento escolhido. A dor faz parte.',
      },
      fim_vermelho_age: {
        texto: 'Ages sem pensar. Saltas para uma escolha ao acaso — e aterras bem. O fragmento vermelho ri: "A hesitação mata mais do que o erro." Desta vez, funcionou.',
        fim: true,
        recompensa: { xp: 30, moedas: 45, energia: 15 },
        texto_fim: '❤ Agiste. Esta vez correu bem.',
      },
      fim_dourado_aceita: {
        texto: 'Aceitas a vagueza como verdade. O fragmento dourado derrete em luz e pousa em ti como bênção. Às vezes não há respostas certas — e tá tudo bem assim.',
        fim: true,
        recompensa: { xp: 25, humor: 25, saude: 10 },
        texto_fim: '💛 Aceitaste a incerteza. Uma forma rara de coragem.',
      },
    },
  },

  // ──────────────────────────────────────────────────────
  // CAP 6 — A GUARDIÃ DOS SONHOS  (Raro)
  // ──────────────────────────────────────────────────────
  {
    id: 'guardia_sonhos',
    titulo: 'A Guardiã dos Sonhos',
    descricao: 'No limiar entre o sono e a vigília, uma guardiã dimensional aguarda. Os teus sonhos são a sua moeda.',
    icone: '🌙',
    raridade: 'Raro',
    cenas: {
      inicio: {
        texto: 'Adormeces e acordas num lugar impossível — o interior dos teus próprios sonhos, mas reorganizado por outra vontade. Uma figura de luz azul-prateada flutua à tua frente. "Sou Lyra, Guardiã dos Sonhos. Entras no meu domínio. Tem cuidado com o que desejas aqui."',
        escolhas: [
          { texto: '🌙 "O que é este lugar?"',              proxima: 'perguntar'   },
          { texto: '✨ "Posso controlar este sonho?"',       proxima: 'controlo'    },
          { texto: '🎁 "O que tens para oferecer?"',        proxima: 'oferta'      },
        ],
      },
      perguntar: {
        texto: 'Lyra sorri como lua crescente. "Este é o espaço entre o que és e o que poderias ser. Muitas criaturas vêm aqui sem o saber. Tu vieste consciente — o que é notável." Estende a mão.',
        escolhas: [
          { texto: '🤝 Aceitar a mão de Lyra',               proxima: 'fim_lyra_aceita'   },
          { texto: '🙅 Recusar — não confias facilmente',    proxima: 'fim_lyra_recusa'   },
        ],
      },
      controlo: {
        texto: '"Controlar?" Lyra ri, suave como brisa. "Podes tentar. Mas os sonhos resistem ao controlo — são como água. Podes guiá-los, não dominá-los." Desafia-te com um gesto.',
        escolhas: [
          { texto: '🌊 Tentar guiar o sonho suavemente',     proxima: 'fim_guiar'     },
          { texto: '💪 Tentar dominar pela força de vontade', proxima: 'fim_dominar'   },
        ],
      },
      oferta: {
        texto: '"Directo. Gosto." Lyra materializa três opções: visões do futuro, cura profunda, ou um presente para um ser amado que não existe nesta dimensão.',
        escolhas: [
          { texto: '🔮 Pedir visões do futuro',              proxima: 'fim_visoes'    },
          { texto: '💚 Pedir cura profunda',                 proxima: 'fim_cura'      },
          { texto: '🎁 Pedir o presente para o ser amado',   proxima: 'fim_presente'  },
        ],
      },
      fim_lyra_aceita: {
        texto: 'A mão de Lyra é fria como luar mas reconfortante. Ela conduz-te por memórias que ainda não aconteceram — ou que aconteceram noutras dimensões. Acordas renovado.',
        fim: true,
        recompensa: { xp: 70, humor: 30, energia: 25, vinculo: 2 },
        texto_fim: '🌙 Lyra mostrou-te o que podes ser. Sonha mais.',
      },
      fim_lyra_recusa: {
        texto: 'Lyra inclina a cabeça respeitosamente. "A desconfiança é um escudo legítimo." Deixa-te explorar o sonho sozinho. Encontras um tesouro esquecido no fundo da tua própria mente.',
        fim: true,
        recompensa: { xp: 45, moedas: 30, humor: 15 },
        texto_fim: '🙅 Confiaste em ti. O teu próprio sonho premiou-te.',
      },
      fim_guiar: {
        texto: 'O sonho responde à tua intenção suave como um barco ao vento. Lyra aplaude: "Excelente. A maioria tenta forçar. Tu entendeste." O sonho transforma-se em jardim de possibilidades.',
        fim: true,
        recompensa: { xp: 75, humor: 35, saude: 20, vinculo: 2 },
        texto_fim: '🌊 Guiaste o sonho. Lyra aprovou-te.',
      },
      fim_dominar: {
        texto: 'O sonho resiste e fragmenta-se. Acordas mais cedo do que desejavas, cansado — mas com uma lição que vale o dobro de qualquer vitória fácil.',
        fim: true,
        recompensa: { xp: 50, energia: -20, humor: -10 },
        texto_fim: '💪 O sonho resistiu. A lição ficou.',
      },
      fim_visoes: {
        texto: 'As visões chegam em fragmentos — não o futuro certo, mas futuros possíveis. Cada um exige escolhas diferentes. Acordas sabendo que o teu futuro ainda está em aberto.',
        fim: true,
        recompensa: { xp: 65, vinculo: 2, humor: 20 },
        texto_fim: '🔮 Viste possibilidades. O futuro ainda é teu.',
      },
      fim_cura: {
        texto: 'Lyra pousa a mão no teu peito. Uma luz percorre-te de dentro para fora. Acordas como se tivesses dormido mil anos num único momento.',
        fim: true,
        recompensa: { xp: 60, saude: 40, energia: 30, humor: 20 },
        texto_fim: '💚 Cura profunda. Acordaste novo.',
      },
      fim_presente: {
        texto: 'Lyra olha-te com tristeza e admiração simultâneas. "Não há ninguém assim nesta dimensão. Mas o gesto..." Ela cria o presente à mesma e guarda-o por ti. "Para quando encontrares."',
        fim: true,
        recompensa: { xp: 80, vinculo: 3, humor: 35, saude: 15 },
        texto_fim: '🎁 O presente existe agora. Lyra guardá-lo-á por ti.',
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ═══════════════════════════════════════════════════════════════════

function loreGetCusto(cap) {
  return LORE_CUSTOS[cap.raridade];
}

function loreGetRaridadeAcesso(cap) {
  // O jogador precisa de ter avatar com raridade >= raridade do capítulo
  const ordem = { Comum: 0, Raro: 1, Lendário: 2 };
  const minha = ordem[avatar?.raridade || 'Comum'] ?? 0;
  const req   = ordem[cap.raridade] ?? 0;
  return minha >= req;
}

// Abre o modal de lore e renderiza a lista de capítulos
function abrirLore() {
  const modal = document.getElementById('loreModal');
  if(!modal) return;
  modal.style.display = 'flex';
  _loreRenderLista();
}

function fecharLore() {
  const modal = document.getElementById('loreModal');
  if(modal) modal.style.display = 'none';
  _loreCapituloAtual = null;
  _loreCenaAtual     = null;
  _loreHistorico     = [];
}

// Renderiza a lista de capítulos disponíveis
function _loreRenderLista() {
  const body = document.getElementById('loreBody');
  if(!body) return;

  if(!hatched || dead) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 10px;color:var(--muted);font-size:9px;line-height:1.8;">
        <div style="font-size:28px;margin-bottom:8px;">📖</div>
        Precisas de ter um avatar vivo para explorar o Lore.
      </div>`;
    return;
  }

  body.innerHTML = LORE_CAPITULOS.map(cap => {
    const custo   = loreGetCusto(cap);
    const temAcesso = loreGetRaridadeAcesso(cap);
    const temSaldo  = custo.moeda === 'moedas'
      ? gs.moedas   >= custo.valor
      : gs.cristais >= custo.valor;
    const iconeRar = cap.raridade === 'Lendário' ? '🌟' : cap.raridade === 'Raro' ? '🔵' : '⚪';
    const corRar   = cap.raridade === 'Lendário' ? 'var(--lendario)' : cap.raridade === 'Raro' ? 'var(--raro)' : 'var(--muted)';
    const moedaIcon = custo.moeda === 'moedas' ? '🪙' : '💎';

    return `
      <div class="lore-cap-card ${!temAcesso ? 'lore-bloqueado' : ''}" onclick="${temAcesso ? `iniciarCapitulo('${cap.id}')` : ''}">
        <div class="lore-cap-icone">${cap.icone}</div>
        <div class="lore-cap-info">
          <div class="lore-cap-titulo">${cap.titulo}</div>
          <div class="lore-cap-desc">${cap.descricao}</div>
          <div class="lore-cap-meta">
            <span style="color:${corRar};font-size:7px;">${iconeRar} ${cap.raridade}</span>
            <span class="lore-cap-custo">${moedaIcon} ${custo.valor}</span>
          </div>
        </div>
        ${!temAcesso
          ? `<div class="lore-bloqueado-tag">🔒 Requer ${cap.raridade}</div>`
          : !temSaldo
          ? `<div class="lore-bloqueado-tag" style="background:rgba(231,76,60,.12);color:#e74c3c;border-color:rgba(231,76,60,.2);">Sem saldo</div>`
          : `<div class="lore-jogar-tag">▶ JOGAR</div>`}
      </div>`;
  }).join('');
}

// Inicia um capítulo — cobra o custo e abre a primeira cena
async function iniciarCapitulo(capId) {
  const cap = LORE_CAPITULOS.find(c => c.id === capId);
  if(!cap || !hatched || dead || !avatar) return;

  if(!loreGetRaridadeAcesso(cap)) {
    showBubble(`Precisas de um avatar ${cap.raridade} para este capítulo.`);
    return;
  }

  const custo = loreGetCusto(cap);
  if(custo.moeda === 'moedas') {
    if(gs.moedas < custo.valor) { showBubble(`Precisas de ${custo.valor} 🪙!`); return; }
    gs.moedas -= custo.valor;
  } else {
    if(gs.cristais < custo.valor) { showBubble(`Precisas de ${custo.valor} 💎!`); return; }
    gs.cristais -= custo.valor;
  }
  updateResourceUI();
  scheduleSave();

  _loreCapituloAtual = cap;
  _loreCenaAtual     = 'inicio';
  _loreHistorico     = [];

  _loreRenderCena();
}

// Renderiza a cena actual
function _loreRenderCena() {
  const body = document.getElementById('loreBody');
  if(!body || !_loreCapituloAtual || !_loreCenaAtual) return;

  const cap  = _loreCapituloAtual;
  const cena = cap.cenas[_loreCenaAtual];
  if(!cena) return;

  _loreHistorico.push(_loreCenaAtual);

  // Cena de fim
  if(cena.fim) {
    _loreAplicarRecompensa(cena.recompensa);
    const iconeRar = cap.raridade === 'Lendário' ? '🌟' : cap.raridade === 'Raro' ? '🔵' : '⚪';
    const recompTxt = _loreRecompensaTxt(cena.recompensa);
    body.innerHTML = `
      <div class="lore-cena-wrap">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:28px;">${cap.icone}</div>
          <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:1px;margin-top:4px;">${cap.titulo}</div>
        </div>
        <div class="lore-texto">${cena.texto}</div>
        <div class="lore-fim-tag">${cena.texto_fim}</div>
        <div class="lore-recomp-box">
          <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-bottom:6px;">RECOMPENSAS</div>
          ${recompTxt}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="lore-btn-secondary" onclick="_loreRenderLista()">← Capítulos</button>
          <button class="lore-btn-primary"   onclick="iniciarCapitulo('${cap.id}')">↺ Jogar de novo</button>
        </div>
      </div>`;
    return;
  }

  // Cena normal com escolhas
  body.innerHTML = `
    <div class="lore-cena-wrap">
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:22px;">${cap.icone}</div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;">${cap.titulo}</div>
      </div>
      <div class="lore-texto">${cena.texto}</div>
      <div class="lore-escolhas">
        ${cena.escolhas.map((e, i) => `
          <button class="lore-escolha-btn" onclick="loreEscolher(${i})">${e.texto}</button>
        `).join('')}
      </div>
      <button class="lore-btn-secondary" style="margin-top:10px;width:100%;" onclick="_loreRenderLista()">✕ Abandonar capítulo</button>
    </div>`;
}

// Processa a escolha do jogador
function loreEscolher(idx) {
  if(!_loreCapituloAtual || !_loreCenaAtual) return;
  const cena = _loreCapituloAtual.cenas[_loreCenaAtual];
  if(!cena || !cena.escolhas[idx]) return;

  _loreCenaAtual = cena.escolhas[idx].proxima;
  _loreRenderCena();
}

// Aplica as recompensas ao avatar
function _loreAplicarRecompensa(r) {
  if(!r || !hatched || !avatar) return;

  if(r.xp)      { xp      = (xp     || 0) + r.xp;      }
  if(r.moedas)  { gs.moedas   = Math.max(0, (gs.moedas   || 0) + r.moedas);  }
  if(r.humor)   { vitals.humor   = Math.min(100, Math.max(0, (vitals.humor   || 0) + r.humor));  }
  if(r.saude)   { vitals.saude   = Math.min(100, Math.max(0, (vitals.saude   || 0) + r.saude));  }
  if(r.energia) { vitals.energia = Math.min(100, Math.max(0, (vitals.energia || 0) + r.energia)); }
  if(r.vinculo) { vinculo  = Math.min(100, Math.max(0, (vinculo || 0) + r.vinculo)); }

  updateResourceUI();
  if(typeof updateAllUI === 'function') updateAllUI();
  scheduleSave();

  const moedaTxt = r.moedas ? ` +${r.moedas}🪙` : '';
  const xpTxt    = r.xp    ? ` +${r.xp}XP`     : '';
  addLog(`Lore: ${_loreCapituloAtual?.titulo}${xpTxt}${moedaTxt}`, 'good');
}

// Formata texto de recompensas
function _loreRecompensaTxt(r) {
  if(!r) return '';
  const items = [];
  if(r.xp)      items.push(`<span class="lore-recomp-item">⚡ +${r.xp} XP</span>`);
  if(r.moedas && r.moedas > 0)  items.push(`<span class="lore-recomp-item">🪙 +${r.moedas}</span>`);
  if(r.moedas && r.moedas < 0)  items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">🪙 ${r.moedas}</span>`);
  if(r.humor && r.humor > 0)    items.push(`<span class="lore-recomp-item">😊 +${r.humor} humor</span>`);
  if(r.humor && r.humor < 0)    items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😔 ${r.humor} humor</span>`);
  if(r.saude && r.saude > 0)    items.push(`<span class="lore-recomp-item">💚 +${r.saude} saúde</span>`);
  if(r.saude && r.saude < 0)    items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.saude} saúde</span>`);
  if(r.energia && r.energia > 0) items.push(`<span class="lore-recomp-item">⚡ +${r.energia} energia</span>`);
  if(r.energia && r.energia < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😴 ${r.energia} energia</span>`);
  if(r.vinculo && r.vinculo > 0) items.push(`<span class="lore-recomp-item">💜 +${r.vinculo} vínculo</span>`);
  if(r.vinculo && r.vinculo < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.vinculo} vínculo</span>`);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;">${items.join('')}</div>`;
}

// Exports
window.abrirLore       = abrirLore;
window.fecharLore      = fecharLore;
window.iniciarCapitulo = iniciarCapitulo;
window.loreEscolher    = loreEscolher;
window._loreRenderLista = _loreRenderLista;
