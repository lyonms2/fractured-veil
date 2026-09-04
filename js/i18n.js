// ═══════════════════════════════════════════════════════════════════
// I18N — Sistema de internacionalização
// Carregado antes de state.js para que t() esteja disponível
// ═══════════════════════════════════════════════════════════════════

(function () {
  const STRINGS = {

    // ── PORTUGUÊS ─────────────────────────────────────────────────
    pt: {
      // Auth — abas e navegação
      'ui.avatars_title':        'Meus Avatares',
      // -- A PAUSA --
      // A tela diz o que PARA, e nao so que esta parado: a pergunta a
      // seguir a “pausa” e sempre “e isso para o quê?”.
      // -- POR QUE ESTES DOIS PAINEIS SO ABREM A CUIDAR DE UM --
      // Diz o motivo E o caminho: uma recusa sem saida e so uma porta
      // fechada.
      'painel.so_cuidando.colonia':    'Estes itens são de um avatar de cada vez — os amuletos equipam nele, os consumíveis dão-se a ele. Na colônia não dá para saber em qual. Toque em CUIDAR de um avatar e abra outra vez.',
      'painel.so_cuidando.sem_avatar': 'Estes itens usam-se num avatar. Entre em algum na colônia e abra outra vez.',
      // -- IDENTIDADE PERMANENTE --
      // O nome de quem joga, pedido uma vez, e o baptismo do avatar,
      // que tambem e uma vez so.
      // -- AS DOZE CORES DA RODA --
      // Nomes de tinta, nao de ecra: e a roda do pintor.
      'cor.vermelho':          'Vermelho',
      'cor.vermelho_laranja':  'Vermelho-alaranjado',
      'cor.laranja':           'Laranja',
      'cor.amarelo_laranja':   'Amarelo-alaranjado',
      'cor.amarelo':           'Amarelo',
      'cor.amarelo_verde':     'Amarelo-esverdeado',
      'cor.verde':             'Verde',
      'cor.azul_verde':        'Azul-esverdeado',
      'cor.azul':              'Azul',
      'cor.azul_roxo':         'Azul-arroxeado',
      'cor.roxo':              'Roxo',
      'cor.vermelho_roxo':     'Vermelho-arroxeado',
      'cor.par':               '{a} com {b}',
      'cor.pura':              '{a} puro',
      'nomej.marca':      '◆ ANTES DE ATRAVESSAR ◆',
      'nomej.titulo':     'COMO TE CHAMAMOS?',
      'nomej.texto':      'Este nome fica gravado em cada criatura que você trouxer ao mundo — vendê-la não apaga quem a criou.',
      'nomej.ph':         'Seu nome',
      'nomej.btn':        'ATRAVESSAR',
      'nomej.nota':       'Você pode mudar este nome depois. As criaturas que já nasceram guardam o nome que você tinha quando as criou.',
      'nomej.invalido':   'Escreva pelo menos uma letra ou um número.',
      'nomej.log':        'Você atravessa o véu como {nome}.',
      // O baptismo do avatar
      'rename.selado':    'O nome dele já está selado. Só se batiza uma vez.',
      'rename.feito':     'Ele se chama {name} — agora e sempre.',
      'rename.uma_vez':   'Batize-o. Só dá uma vez.',
      'ident.criador':    'Criado por',
      'ident.criador_nulo':'desconhecido',
      'ident.mae':        'Mãe',
      'ident.pai':        'Pai',
      'ident.sem_pais':   'raiz de linhagem',
      'pausa.btn_pausar':   'Pausar o jogo',
      'pausa.btn_retomar':  'Continuar o jogo',
      'pausa.titulo':       'JOGO EM PAUSA',
      'pausa.item_vitais':  'Fome, humor, energia e higiene ficaram onde estavam. Nada desce.',
      'pausa.item_idade':   'O tempo de vida também parou. A idade conta tempo de jogo, não tempo de relógio — e é ela que manda na evolução.',
      'pausa.item_doenca':  'Ninguém adoece, ninguém suja a casa, nenhum ovo se estraga. Quem dorme também não recupera energia: a pausa não dá nada, só deixa de tirar.',
      'pausa.nota':         'O jogo já pausa sozinho quando você fecha a aba ou troca de janela. Este botão serve para deixar o jogo aberto à vista sem que nada corra.',
      'pausa.retomar':      '▶ CONTINUAR',
      'pausa.atalho':       'Barra de espaço pausa e continua.',
      'pausa.agora_nao':    'Não dá para pausar no meio de uma batalha ou de um minijogo. Termine ou desista primeiro.',
      'auth.google.btn':         'Entrar com Google',
      // Entrar e criar conta sao o mesmo clique: o Firebase faz a conta
      // na primeira entrada, e por isso nao ha “criar conta” nenhum.
      'auth.so_google':          'Entrar cria a conta na primeira vez. Não há senha para guardar nem para esquecer.',
      // Ja nao se pode mandar “entre com a senha e depois vincule”: nao
      // ha senha. Uma conta antiga de e-mail precisa de quem administre.
      'auth.google.conta_antiga':'Este e-mail tem uma conta antiga com senha. O jogo agora entra só pelo Google — fale com o administrador para migrar a conta.',
      'auth.google.erro':        'Não foi possível entrar com o Google. Tente novamente.',
      'auth.google.dominio':     'Este endereço não está autorizado no Firebase. Avise o administrador.',
      'auth.google.desactivado': 'O login com Google ainda não está ativado neste projeto.',

      // Auth — placeholders

      // Auth — hint reset

      // Auth — login
      'auth.error.login':          'Erro ao entrar. Tente novamente.',
      // Auth — registo
      // Auth — reset
      // Auth — botões

      // Logs
      'log.session_ended':       'Sessão encerrada.',
      'log.session_other':       '⚠️ Sessão iniciada em outro dispositivo. Encerrando...',
      'log.welcome_back':        'Bem-vindo de volta! ✨',
      'log.state_restored':      'Estado restaurado da nuvem! ☁️',
      'log.died':                '{name} partiu para outra dimensão... 💀',
      'log.welcome_new':         'Bem-vindo! Comece uma nova aventura! ✨',
      'log.fed':                 'Alimentado! +{gain} fome  (-{cost} 🪙)',
      'log.feed_no_coins':       'Precisa de {cost} 🪙 para alimentar!',
      'log.renamed':             'Avatar renomeado para "{name}" 💕',
      'log.offline_away':        'Ausente por {h}h {m}min — {status}',
      'log.offline_paused':      'o avatar ficou em pausa, nada mudou. ⏸',
      'log.offline_slept':       'dormiu e recuperou energia. 💤',
      'log.woke_offline':        'Acordou com energia plena enquanto estava ausente! ☀️',

      // Bolhas de fala (showBubble)
      'bubble.sleeping':         'Shh... está dormindo 💤',
      'bubble.satisfied':        'Estou satisfeito!',
      'bubble.no_coins':         'Sem moedas... 😢',
      'bubble.dead':             '...💀',
      'bubble.no_avatar':        'Nenhum avatar ativo!',
      'bubble.hungry':           'Estou faminto! 🍖',
      'bubble.tired':            'Cansado demais... 😴',
      'bubble.invalid_name':     'Nome inválido! ✕',
      'bubble.back':             'De volta! ✨',
      'bubble.renamed':          '{name}... Adoro esse nome! 💕',
      'bubble.session_ended':    'Sessão encerrada ⚠️',

      // FALAS do avatar (arrays)
      'falas.happy':  ['Estou feliz! ✨','Te amo! 💕','Que dia incrível!','Brinca comigo!','Hoje tá ótimo! 🌟','Tô no meu melhor! 💪','Que energia boa!','Sorrindo à toa! 😊','Tudo certo por aqui!','Sinto-me invencível! ⚡'],
      'falas.hungry': ['Estou com fome...','Me alimente!','Faminto aqui! 🍖','Preciso comer!','Meu estômago tá roncando...','Aqui ó, tô definhando! 🍽️','Comer... agora... por favor','Tô fraco de fome!','Me dá alguma coisa! 🥺'],
      'falas.tired':  ['Tão cansado...','Vou dormir zzz','Preciso descansar','Exausto...','Não aguento mais... 😴','Os olhos tão pesados...','Preciso de uma cama!','Caindo de sono...','Minha energia acabou! 💤'],
      'falas.sick':   ['Me sinto mal...','Preciso de remédio','Não estou bem :(','Que mal-estar...','Tô febril acho... 🤒','Alguém me ajuda?','Tô precisando do antídoto... 🧪','Minha cabeça tá rodando...'],
      'falas.pet':    ['Heee~ 💕','Mais! Mais!','*ronrona*','♪ ♪ ♪','Adoro você!','Continua! 🥰','*purr purr*','Ahh que bom...','Não para! 💫','Felicidade! ✨'],
      'falas.bored':  ['Entediado...','Me divirta!','Tão entediado...','Não tem nada pra fazer...','Cadê as aventuras? 😑','Alguém tá me ouvindo?','Boredom máximo 😶','Joga comigo pelo menos!','Suspiro profundo...'],
      'falas.dirty':  ['Estou sujo... 😔','Preciso de banho!','Limpeza por favor! 🧹','Que cheiro ruim...','Tô um lixo aqui...','Banho! Banho! 🛁','Assim não dá...','Me sinto pegajoso 🤢','Cheira mal aqui! 👃'],

      // FALAS situacionais
      'falas.win':        ['Sabia que ia ganhar! 😤','Imparável! 🔥','Quem manda aqui sou eu!','Vitória é meu nome! 🏆','Muito bom! Mais um!','Não tem quem me segure!','Isso sim é jogar! ✨','Fácil fácil 😎','Tô em chamas! 🔥'],
      'falas.lose':       ['Fui azarado...','Da próxima te pego! 😤','Não acredito...','Tive azar mesmo!','Isso não acabou... 👀','Aprendi a lição!','Revanche! Agora! 😠','Podia ter ido melhor...','Bah!'],
      'falas.roubo':      ['ROUBEI! 🔥🔥','É tudo meu agora! 😈','Tá bom assim!','Que jogada perfeita! ♠','Meu monte tá crescendo! 🃏','Ninguém me para! 🔥','Isso é puro talento! 😏'],
      'falas.levelup':    ['Nível up! 🌟','Tô ficando mais forte! ⚡','Mais um nível!','Evoluindo! 🌟','Tô crescendo!','Cada vez melhor! 💪','Sinto a diferença! ✨','Ninguém me para agora!'],
      'falas.vinculo':    ['Nosso vínculo cresce! 💕','Você é especial pra mim... ✨','Juntos somos mais fortes!','Cada dia mais perto de você 💫','Sinto algo diferente... algo bom 💕','Você me faz bem!'],
      'falas.fullEnergy': ['Pronto pra tudo! ☀️','Descansado e cheio de energia!','Esse sono foi incrível! 😊','Tô novo de pilha! ⚡','Bom dia! Tô ótimo! 🌅','Acordei renovado! 🌟','Que sono gostoso! 💤✨','Cheio de energia! Bora! 💪'],
      'falas.item':       ['Esse item fica incrível em mim! ✨','Que estilo! 😎','Agora sim! Equipado!','Me sinto mais poderoso! 💪','Isso combina comigo! 🌟','Que upgrade! ✨'],

      // FALAS por elemento
      'falas.elem.Fogo':         ['Sinto o fogo dentro de mim! 🔥','Arder é minha natureza! 🔥','Minha chama nunca apaga! 🔥','Intenso e imparável! 🔥'],
      'falas.elem.Água':         ['Fluindo com calma... 🌊','Como a água, me adapto a tudo! 💧','Sereno como o mar... 🌊','A água encontra sempre o caminho! 💧'],
      'falas.elem.Terra':        ['Minhas raízes são profundas! 🌿','Firme como uma montanha! 🏔️','Sólido e inabalável! 🌱','Da terra vim, à terra pertenço! 🌍'],
      'falas.elem.Vento':        ['Livre como o vento! 💨','Ninguém me prende! 🌬️','Leve e veloz! 💨','Sou pura leveza! 🌬️'],
      'falas.elem.Sombra':       ['As sombras são minha morada... 🌑','Vejo o que os outros não veem! 🌑','Confortável na escuridão... 🌑','Mistério é meu dom! 🖤'],

      // Passivos elementais
      'elem.bonus.Fogo':         'Espírito Ardente: humor decai 15% mais devagar, fome 10% mais rápido',
      'elem.bonus.Água':         'Serenidade das Marés: humor e higiene decaem 15% mais devagar',
      'elem.bonus.Terra':        'Raízes Profundas: fome decai 15% mais devagar',
      'elem.bonus.Vento':        'Leveza do Vento: energia decai 15% mais devagar',
      'elem.bonus.Sombra':       'Ciclo Lunar: energia decai 10% mais devagar e recupera 15% mais rápido dormindo, mas o humor decai 10% mais rápido',

      // Fases
      'fases': ['BEBÊ','CRIANÇA','JOVEM','ADULTO'],

      // Vínculo
      'vinculo.distant':    'Distante',
      'vinculo.friend':     'Amigo',
      'vinculo.companion':  'Companheiro',
      'vinculo.soulmate':   'Alma Gêmea',

      // Doenças
      'disease.exhaustion':   'Exaustão Crônica',
      'disease.malnutrition': 'Desnutrição',
      'disease.infection':    'Infecção',
      'disease.melancholy':   'Melancolia Dimensional',
      'disease.fracture':     'Fratura de Batalha',

      // Itens — nomes
      'item.satiety_amulet.name':  'Amuleto da Saciedade',
      'item.satiety_amulet.desc':  'Uma erva dimensional que suprime a fome e melhora a digestão.',
      'item.satiety_amulet.eff':   'A barriga cheia dura 1/3 a mais, e o cocô aparece 25% menos vezes',
      'item.joy_mask.name':        'Máscara da Alegria',
      'item.joy_mask.desc':        'Uma máscara etérea que irradia serenidade e mantém o humor elevado.',
      'item.joy_mask.eff':         'O bom humor dura 1,7× mais tempo',
      'item.sleep_amulet.name':    'Amuleto do Sono Profundo',
      'item.sleep_amulet.desc':    'Um cristal que pulsa durante o sono, amplificando a recuperação de energia.',
      'item.sleep_amulet.eff':     'Dormindo, a energia enche na metade do tempo — inclusive com o jogo fechado',
      'item.tide_cloth.name':      'Pano das Marés',
      'item.tide_cloth.desc':      'Um tecido que bebe a sujeira antes que ela assente. Nunca fica encardido.',
      'item.tide_cloth.eff':       'Cada cocô suja metade: tira 9 de higiene em vez de 18',
      'item.battle_wind.name':     'Fôlego de Combate',
      'item.battle_wind.desc':     'O peito aprende a poupar ar. Sai da luta com sobra para a próxima.',
      'item.battle_wind.eff':      'As batalhas cansam 6 de energia em vez de 10 — só quem usa o amuleto',
      'item.bone_splint.name':     'Tala de Osso',
      'item.bone_splint.desc':     'Osso de uma criatura que caiu muitas vezes e se levantou todas elas.',
      'item.bone_splint.eff':      'Caindo em batalha, a chance de Fratura cai de 10% para 4%',
      'item.antidote.name':        'Antídoto Dimensional',
      'item.antidote.desc':        'Uma poção de cristal purificado que dissolve qualquer mal que aflige o avatar.',
      'item.antidote.eff':         'Cura todas as doenças ativas + recupera +20 saúde',

      // UI estático
      'ui.loading':              'CARREGANDO...',
      'ui.lang_btn':             '🌐 EN',
      'ui.logout':               '✕ SAIR',
      'ui.sleeping':             '💤 dormindo',
      'ui.no_items':             'Nenhum item no inventário',
      'ui.no_eggs':              'Nenhum ovo ainda',
      'ui.sick':                 '🤒 Doente',
      'ui.life_remaining':       '⏳ VIDA RESTANTE',
      'ui.summon_btn':           '▶ Invocar Avatar (Gratuito)',
      'ui.summon_btn_paid':      '▶ Invocar Avatar ({cost} 🪙)',
      'ui.nivel':                'NÍVEL {n}',
      'ui.stable':               '✅ estável',
      'ui.rarity_bonus':         '🥚×{eggs} · ⚡×{xp} XP · 💚-{decay}% decay',
      'ui.active_slot':          'ATIVO · SLOT {n}',
      'ui.sleep_btn':            'DORMIR',
      'ui.sleep_btn_mobile':     'Dormir',

      // Modal reward labels
      'modal.reward_range':      '+{xpMin}~{xpMax} XP · +{cMin}~{cMax} 🪙',
      'modal.reward_maze':       '+{xpMin}~{xpMax} XP · até {cMax} 🪙 (colete no labirinto!)',

      'ui.login_required':       'LOGIN NECESSÁRIO',
      'ui.login_required_desc':  'Entre na sua conta para invocar seu avatar e guardar o progresso.',
      'ui.do_login':             '🔑 FAZER LOGIN',

      // Header / nav
      // O que a dica diz por fora tem de ser o que o painel diz por
      // dentro. O 🪙 dizia "Câmbio de Moedas" e abria "🪙 MOEDAS"; o 💎
      // tinha o título escrito à mão no HTML e era o único que não
      // traduzia.
      'ui.coins_title':          'Moedas',
      'ui.eggs_title':           'Inventário de ovos',
      'ui.items_title':          'Inventário de itens',
      'ui.marketplace_title':    'Marketplace',

      // Modais de inventário
      'inv.items_title':         '🎒 INVENTÁRIO DE ITENS',
      'inv.eggs_title':          '🥚 INVENTÁRIO DE OVOS',
      'inv.coins_title':         '🪙 MOEDAS',
      'inv.coins_sub':           'Compre itens e troque por cristais',
      'inv.exchange_label':      '◆ CÂMBIO 🪙 → 💎',
      'inv.exchange_empty':      'Abre a loja para ver o câmbio.',
      'inv.crystals_cta':        '💎 Precisa de mais Cristais?',
      'inv.crystals_desc':       'Compra cristais com MATIC ou vende ovos no Marketplace.',
      'inv.crystals_btn':        'Ir ao Marketplace →',
      'inv.items_store':         '◆ LOJA DE ITENS',

      // Game selector
      'gs.title':                '◆ ESCOLHA UM JOGO',
      'gs.tab.pve':              'PVE',
      'gs.tab.pvp':              'PVP',
      'gs.tab.lore':             'LORE',
      // PVE
      'gs.memoria.name':         'MEMÓRIA ELEMENTAL',
      'gs.memoria.desc':         'Encontre todos os pares de elementos',
      'gs.mina.name':            'CAMPO MINADO',
      'gs.mina.desc':            'Revele o campo sem explodir as minas',
      'gs.simon.name':           'SIMON SAYS',
      'gs.simon.desc':           'Repita a sequência de elementos',
      'gs.snake.name':           'SNAKE ELEMENTAL',
      'gs.snake.desc':           'Colete os elementos sem bater em si mesmo',
      'gs.maze.name':            'LABIRINTO ELEMENTAL',
      'gs.maze.desc':            'Navegue na névoa e ache a saída',
      // Lore
      'gs.lore1.name':           'HISTÓRIAS DO VÉU',
      'gs.lore1.desc':           'A saga pós-guerra — Fraturas, Avatares e O Vácuo',
      'gs.lore1.reward':         '⚪ Avatar Comum · 50🪙 por capítulo',
      'gs.lore2.name':           'CRÔNICAS DOS RAROS',
      'gs.lore2.desc':           'Histórias exclusivas para Avatares Raros',
      'gs.lore2.reward':         '🔵 Avatar Raro · 5💎 por capítulo',
      'gs.lore3.name':           'ÉPICOS DO VÁCUO',
      'gs.lore3.desc':           'A verdade sobre as Fraturas — apenas para Lendários',
      'gs.lore3.reward':         '🌟 Avatar Lendário · 15💎 por capítulo',
      // PVP
      'gs.arena.name':           'ARENA DIMENSIONAL',
      'gs.arena.desc':           'Jo-Ken-Pô ao vivo contra outros jogadores',
      'gs.arena.reward':         'Apostas · Ranking · Pool semanal',
      'gs.rouba.name':           'ROUBA MONTE',
      'gs.rouba.desc':           'Duelo de cartas ao vivo contra outros jogadores',
      'gs.rouba.reward':         'Apostas · Pool P2E',
      'gs.naval.name':           'BATALHA NAVAL',
      'gs.naval.desc':           'Afunda os navios do oponente',
      'gs.naval.reward':         'Apostas · Ranking · Pool P2E',

      // Minigames — títulos e botões comuns
      'mini.play_again':         'JOGAR DE NOVO',
      'mini.close':              'FECHAR',
      'mini.confirm':            '✓ CONFIRMAR',
      'mini.cancel':             'CANCELAR',
      'mini.memoria.title':      '🃏 MEMÓRIA ELEMENTAL',
      'mini.memoria.sub':        'Encontre todos os pares!',
      'mini.simon.title':        '🎵 SIMON SAYS',
      'mini.simon.observe':      'Observe a sequência...',
      'mini.mina.title':         '💣 CAMPO MINADO',
      'mini.snake.title':        '🐍 SNAKE ELEMENTAL',
      'mini.maze.title':         '🌀 LABIRINTO ELEMENTAL',
      'mini.maze.info':          'Navegue na névoa e ache a saída!',
      // Hatch confirm
      'hatch.title':             '🥚 CHOCAR OVO',
      'hatch.confirm':           '✓ CONFIRMAR',
      'hatch.cancel':            'CANCELAR',

      // Difficulty tiers
      'diff.easy':               'FÁCIL',
      'diff.medium':             'MÉDIO',
      'diff.hard':               'DIFÍCIL',
      'diff.master':             'MESTRE',
      'diff.locked_tip':         'Desbloqueie no nível',

      // Action buttons
      'btn.feed':                'NUTRIR',
      'btn.play':                'JOGOS',
      'btn.sleep':               'DORMIR',
      'btn.heal':                'MEDICAR',
      'btn.bath':                'BANHO',
      'btn.lay_egg':             'BOTAR OVO',
      'btn.wake':                'ACORDAR',
      'btn.friends':             'AMIGOS',
      // A linha por baixo do nome nos botões de ação: ou o custo, ou a
      // razão de estar apagado.
      'act.sub.cheio':           'cheio',
      'act.sub.com_fome':        'com fome',
      'act.sub.sem_forcas':      'sem forças',
      'act.sub.sem_sono':        'sem sono',
      'act.sub.saudavel':        'saudável',
      'act.sub.limpo':           'limpo',
      'act.sub.dormindo':        'dormindo',

      // Stat labels
      'stat.fome':               '🍖 FOME',
      'stat.humor':              '😊 HUMOR',
      'stat.energia':            '⚡ ENERGIA',
      'stat.saude':              '❤️ SAÚDE',
      'stat.higiene':            '🧹 HIGIENE',

      // Misc UI
      'ui.cancel':               'Cancelar',
      'ui.elem_passive':         'Passivo Elemental',

      // Egg actions
      'egg.burn.title':          '🔥 Queimar Ovo',
      'egg.burn.btn':            '🔥 Confirmar',

      // Panel / right side
      'panel.summon_title':      '◆ INVOCAR AVATAR',
      'panel.login_desc':        'Entre na sua conta para invocar seu avatar e guardar o progresso.',
      'panel.xp_label':          'XP',
      'panel.vinculo_label':     'VÍNCULO',
      'panel.diary_title':       '◆ DIÁRIO DIMENSIONAL',

      // Dead screen
      'dead.title':              'ENTIDADE PERDIDA',
      'dead.sub':                'partiu para outra dimensão...\nsua essência persiste nos ovos.',
      'dead.btn':                '✦ INVOCAR NOVO AVATAR',

      // Portal (idle)
      'portal.waiting':          'PORTAL DIMENSIONAL',
      'portal.sub':              'aguardando invocação',

      // Egg screen

      // Rename
      'rename.placeholder':      'Novo nome...',
      'rename.save':             '✓ SALVAR',
      'rename.cancel':           '✕ CANCELAR',

      // Arena + Rouba Monte → js/i18n-pvp.js
    },

    // ── ENGLISH ───────────────────────────────────────────────────
    en: {
      // Auth — tabs and navigation
      'ui.avatars_title':        'My Avatars',
      'painel.so_cuidando.colonia':    'These items belong to one avatar at a time — charms equip on it, consumables are given to it. In the colony there is no way to tell which. Tap CARE on an avatar and open this again.',
      'painel.so_cuidando.sem_avatar': 'These items are used on an avatar. Enter one from the colony and open this again.',
      'cor.vermelho':          'Red',
      'cor.vermelho_laranja':  'Red-orange',
      'cor.laranja':           'Orange',
      'cor.amarelo_laranja':   'Yellow-orange',
      'cor.amarelo':           'Yellow',
      'cor.amarelo_verde':     'Yellow-green',
      'cor.verde':             'Green',
      'cor.azul_verde':        'Blue-green',
      'cor.azul':              'Blue',
      'cor.azul_roxo':         'Blue-violet',
      'cor.roxo':              'Violet',
      'cor.vermelho_roxo':     'Red-violet',
      'cor.par':               '{a} with {b}',
      'cor.pura':              'pure {a}',
      'nomej.marca':      '◆ BEFORE YOU CROSS ◆',
      'nomej.titulo':     'WHAT SHALL WE CALL YOU?',
      'nomej.texto':      'This name is written into every creature you bring into the world — selling one does not erase who made it.',
      'nomej.ph':         'Your name',
      'nomej.btn':        'CROSS OVER',
      'nomej.nota':       'You can change this name later. Creatures already born keep the name you had when you made them.',
      'nomej.invalido':   'Type at least one letter or number.',
      'nomej.log':        'You cross the veil as {nome}.',
      'rename.selado':    'Its name is already sealed. You only name it once.',
      'rename.feito':     'It is called {name} — now and always.',
      'rename.uma_vez':   'Name it. You only get one chance.',
      'ident.criador':    'Created by',
      'ident.criador_nulo':'unknown',
      'ident.mae':        'Mother',
      'ident.pai':        'Father',
      'ident.sem_pais':   'root of a line',
      'pausa.btn_pausar':   'Pause the game',
      'pausa.btn_retomar':  'Resume the game',
      'pausa.titulo':       'GAME PAUSED',
      'pausa.item_vitais':  'Hunger, mood, energy and hygiene stay exactly where they were. Nothing drops.',
      'pausa.item_idade':   'Lifetime is stopped too. Age counts play time, not clock time — and age is what drives evolution.',
      'pausa.item_doenca':  'Nobody gets sick, nobody messes the place, no egg spoils. Sleepers do not recover energy either: pausing gives you nothing, it only stops taking.',
      'pausa.nota':         'The game already pauses itself when you close the tab or switch windows. This button is for leaving the game open in front of you with nothing running.',
      'pausa.retomar':      '▶ RESUME',
      'pausa.atalho':       'Spacebar pauses and resumes.',
      'pausa.agora_nao':    'You cannot pause in the middle of a battle or a minigame. Finish or withdraw first.',
      'auth.google.btn':         'Sign in with Google',
      'auth.so_google':          'Signing in creates your account the first time. No password to store, none to forget.',
      'auth.google.conta_antiga':'This e-mail has an older password account. The game now signs in with Google only — contact the administrator to migrate it.',
      'auth.google.erro':        'Could not sign in with Google. Please try again.',
      'auth.google.dominio':     'This address is not authorized in Firebase. Let the administrator know.',
      'auth.google.desactivado': 'Google sign-in is not enabled on this project yet.',

      // Auth — placeholders

      // Auth — reset hint

      // Auth — login
      'auth.error.login':          'Login error. Please try again.',
      // Auth — register
      // Auth — reset
      // Auth — buttons

      // Logs
      'log.session_ended':       'Session ended.',
      'log.session_other':       '⚠️ Session started on another device. Disconnecting...',
      'log.welcome_back':        'Welcome back! ✨',
      'log.state_restored':      'State restored from cloud! ☁️',
      'log.died':                '{name} departed to another dimension... 💀',
      'log.welcome_new':         'Welcome! Begin a new adventure! ✨',
      'log.fed':                 'Fed! +{gain} hunger  (-{cost} 🪙)',
      'log.feed_no_coins':       'You need {cost} 🪙 to feed!',
      'log.renamed':             'Avatar renamed to "{name}" 💕',
      'log.offline_away':        'Away for {h}h {m}min — {status}',
      'log.offline_paused':      'your avatar was paused, nothing changed. ⏸',
      'log.offline_slept':       'it slept and recovered energy. 💤',
      'log.woke_offline':        'Woke up fully rested while you were away! ☀️',

      // Bubbles
      'bubble.sleeping':         'Shh... sleeping 💤',
      'bubble.satisfied':        "I'm full!",
      'bubble.no_coins':         'Not enough coins... 😢',
      'bubble.dead':             '...💀',
      'bubble.no_avatar':        'No active avatar!',
      'bubble.hungry':           "I'm starving! 🍖",
      'bubble.tired':            'Too tired... 😴',
      'bubble.invalid_name':     'Invalid name! ✕',
      'bubble.back':             'Back! ✨',
      'bubble.renamed':          '{name}... I love that name! 💕',
      'bubble.session_ended':    'Session ended ⚠️',

      // Avatar speech
      'falas.happy':  ["I'm happy! ✨","I love you! 💕","What an amazing day!","Play with me!","Today is great! 🌟","I'm at my best! 💪","Such good vibes!","Smiling for no reason! 😊","All good here!","I feel unstoppable! ⚡"],
      'falas.hungry': ["I'm hungry...","Feed me!","Starving here! 🍖","Need to eat!","My stomach is growling...","I'm fading away! 🍽️","Food... now... please","So weak from hunger!","Give me something! 🥺"],
      'falas.tired':  ["So tired...","Going to sleep zzz","Need to rest","Exhausted...","Can't take it anymore... 😴","My eyes are so heavy...","I need a bed!","Falling asleep...","Out of energy! 💤"],
      'falas.sick':   ["I feel sick...","I need medicine","I don't feel well :(","What a bad feeling...","I think I have a fever... 🤒","Someone help me?","I need the antidote... 🧪","My head is spinning..."],
      'falas.pet':    ["Heee~ 💕","More! More!","*purrs*","♪ ♪ ♪","I love you!","Keep going! 🥰","*purr purr*","Ahh that's nice...","Don't stop! 💫","Happiness! ✨"],
      'falas.bored':  ["Bored...","Entertain me!","So bored...","Nothing to do...","Where are the adventures? 😑","Is anyone listening?","Max boredom 😶","At least play with me!","Deep sigh..."],
      'falas.dirty':  ["I'm dirty... 😔","I need a bath!","Clean me please! 🧹","What a bad smell...","I'm a mess...","Bath! Bath! 🛁","This won't do...","I feel sticky 🤢","It smells bad here! 👃"],

      // Situational speech
      'falas.win':        ["Knew I'd win! 😤","Unstoppable! 🔥","I'm in charge here!","Victory is my name! 🏆","Nice! Next one!","Nobody can stop me!","That's how you play! ✨","Easy 😎","I'm on fire! 🔥"],
      'falas.lose':       ["Bad luck...","I'll get you next time! 😤","I can't believe it...","Just unlucky!","This isn't over... 👀","Lesson learned!","Rematch! Now! 😠","Could've gone better...","Ugh!"],
      'falas.roubo':      ["STOLEN! 🔥🔥","It's all mine now! 😈","That's what I'm talking about!","Perfect move! ♠","My pile is growing! 🃏","Nobody stops me! 🔥","Pure talent! 😏"],
      'falas.levelup':    ["Level up! 🌟","Getting stronger! ⚡","One more level!","Evolving! 🌟","I'm growing!","Better every day! 💪","I can feel the difference! ✨","Nothing can stop me now!"],
      'falas.vinculo':    ["Our bond grows! 💕","You're special to me... ✨","Together we're stronger!","Closer every day 💫","Something feels different... good 💕","You do me good!"],
      'falas.fullEnergy': ["Ready for anything! ☀️","Rested and full of energy!","That sleep was amazing! 😊","Good as new! ⚡","Good morning! Feeling great! 🌅","Woke up renewed! 🌟","What a great sleep! 💤✨","Full of energy! Let's go! 💪"],
      'falas.item':       ["This item looks amazing on me! ✨","What style! 😎","Now we're talking! Equipped!","I feel more powerful! 💪","This suits me! 🌟","What an upgrade! ✨"],

      // Element speech
      'falas.elem.Fogo':         ["I feel the fire within! 🔥","Burning is my nature! 🔥","My flame never dies! 🔥","Intense and unstoppable! 🔥"],
      'falas.elem.Água':         ["Flowing calmly... 🌊","Like water, I adapt to everything! 💧","Serene as the sea... 🌊","Water always finds its way! 💧"],
      'falas.elem.Terra':        ["My roots run deep! 🌿","Steady as a mountain! 🏔️","Solid and unshakeable! 🌱","From earth I came, to earth I belong! 🌍"],
      'falas.elem.Vento':        ["Free as the wind! 💨","Nobody holds me back! 🌬️","Light and swift! 💨","I am pure lightness! 🌬️"],
      'falas.elem.Sombra':       ["Shadows are my home... 🌑","I see what others can't! 🌑","Comfortable in the dark... 🌑","Mystery is my gift! 🖤"],

      // Elemental passives
      'elem.bonus.Fogo':         'Burning Spirit: mood decays 15% slower, hunger 10% faster',
      'elem.bonus.Água':         'Tidal Serenity: mood and hygiene decay 15% slower',
      'elem.bonus.Terra':        'Deep Roots: hunger decays 15% slower',
      'elem.bonus.Vento':        'Wind\'s Lightness: energy decays 15% slower',
      'elem.bonus.Sombra':       'Lunar Cycle: energy decays 10% slower and recovers 15% faster while sleeping, but mood decays 10% faster',

      // Phases
      'fases': ['BABY','CHILD','YOUNG','ADULT'],

      // Bond
      'vinculo.distant':    'Distant',
      'vinculo.friend':     'Friend',
      'vinculo.companion':  'Companion',
      'vinculo.soulmate':   'Soulmate',

      // Diseases
      'disease.exhaustion':   'Chronic Exhaustion',
      'disease.malnutrition': 'Malnutrition',
      'disease.infection':    'Infection',
      'disease.melancholy':   'Dimensional Melancholy',
      'disease.fracture':     'Battle Fracture',

      // Items — names
      'item.satiety_amulet.name':  'Satiety Amulet',
      'item.satiety_amulet.desc':  'A dimensional herb that suppresses hunger and improves digestion.',
      'item.satiety_amulet.eff':   'A full belly lasts a third longer, and poop shows up 25% less often',
      'item.joy_mask.name':        'Joy Mask',
      'item.joy_mask.desc':        'An ethereal mask that radiates serenity and keeps mood high.',
      'item.joy_mask.eff':         'Good mood lasts 1.7× longer',
      'item.sleep_amulet.name':    'Deep Sleep Amulet',
      'item.sleep_amulet.desc':    'A crystal that pulses during sleep, amplifying energy recovery.',
      'item.sleep_amulet.eff':     'Sleeping fills energy in half the time — even with the game closed',
      'item.tide_cloth.name':      'Tidal Cloth',
      'item.tide_cloth.desc':      'A weave that drinks the mess before it settles. It never stains.',
      'item.tide_cloth.eff':       'Each poop soils half as much: 9 hygiene instead of 18',
      'item.battle_wind.name':     'Battle Wind',
      'item.battle_wind.desc':     'The chest learns to spare its air. You leave the fight with something left.',
      'item.battle_wind.eff':      'Battles tire 6 energy instead of 10 — only for whoever wears it',
      'item.bone_splint.name':     'Bone Splint',
      'item.bone_splint.desc':     'Bone from a creature that fell many times and rose every one of them.',
      'item.bone_splint.eff':      'On falling in battle, Fracture chance drops from 10% to 4%',
      'item.antidote.name':        'Dimensional Antidote',
      'item.antidote.desc':        'A purified crystal potion that dissolves any ailment affecting the avatar.',
      'item.antidote.eff':         'Cures all active diseases + restores +20 health',

      // Static UI
      'ui.loading':              'LOADING...',
      'ui.lang_btn':             '🌐 PT',
      'ui.logout':               '✕ LOGOUT',
      'ui.sleeping':             '💤 sleeping',
      'ui.no_items':             'No items in inventory',
      'ui.no_eggs':              'No eggs yet',
      'ui.sick':                 '🤒 Sick',
      'ui.life_remaining':       '⏳ LIFE REMAINING',
      'ui.summon_btn':           '▶ Summon Avatar (Free)',
      'ui.summon_btn_paid':      '▶ Summon Avatar ({cost} 🪙)',
      'ui.nivel':                'LEVEL {n}',
      'ui.stable':               '✅ stable',
      'ui.rarity_bonus':         '🥚×{eggs} · ⚡×{xp} XP · 💚-{decay}% decay',
      'ui.active_slot':          'ACTIVE · SLOT {n}',
      'ui.sleep_btn':            'SLEEP',
      'ui.sleep_btn_mobile':     'Sleep',

      // Modal reward labels
      'modal.reward_range':      '+{xpMin}~{xpMax} XP · +{cMin}~{cMax} 🪙',
      'modal.reward_maze':       '+{xpMin}~{xpMax} XP · up to {cMax} 🪙 (collect in maze!)',

      'ui.login_required':       'LOGIN REQUIRED',
      'ui.login_required_desc':  'Sign in to summon your avatar and save your progress.',
      'ui.do_login':             '🔑 SIGN IN',

      // Header / nav
      'ui.coins_title':          'Coins',
      'ui.eggs_title':           'Egg Inventory',
      'ui.items_title':          'Item Inventory',
      'ui.marketplace_title':    'Marketplace',

      // Inventory modals
      'inv.items_title':         '🎒 ITEM INVENTORY',
      'inv.eggs_title':          '🥚 EGG INVENTORY',
      'inv.coins_title':         '🪙 COINS',
      'inv.coins_sub':           'Buy items and trade for crystals',
      'inv.exchange_label':      '◆ EXCHANGE 🪙 → 💎',
      'inv.exchange_empty':      'Open the shop to see the exchange.',
      'inv.crystals_cta':        '💎 Need more Crystals?',
      'inv.crystals_desc':       'Buy crystals with MATIC or sell eggs on the Marketplace.',
      'inv.crystals_btn':        'Go to Marketplace →',
      'inv.items_store':         '◆ ITEM SHOP',

      // Game selector
      'gs.title':                '◆ CHOOSE A GAME',
      'gs.tab.pve':              'PVE',
      'gs.tab.pvp':              'PVP',
      'gs.tab.lore':             'LORE',
      // PVE
      'gs.memoria.name':         'ELEMENTAL MEMORY',
      'gs.memoria.desc':         'Find all pairs of elements',
      'gs.mina.name':            'MINESWEEPER',
      'gs.mina.desc':            'Clear the field without hitting mines',
      'gs.simon.name':           'SIMON SAYS',
      'gs.simon.desc':           'Repeat the elemental sequence',
      'gs.snake.name':           'ELEMENTAL SNAKE',
      'gs.snake.desc':           'Collect elements without hitting yourself',
      'gs.maze.name':            'ELEMENTAL MAZE',
      'gs.maze.desc':            'Navigate the fog and find the exit',
      // Lore
      'gs.lore1.name':           'TALES OF THE VEIL',
      'gs.lore1.desc':           'The post-war saga — Fractures, Avatars and The Void',
      'gs.lore1.reward':         '⚪ Common Avatar · 50🪙 per chapter',
      'gs.lore2.name':           'CHRONICLES OF THE RARE',
      'gs.lore2.desc':           'Exclusive stories for Rare Avatars',
      'gs.lore2.reward':         '🔵 Rare Avatar · 5💎 per chapter',
      'gs.lore3.name':           'EPICS OF THE VOID',
      'gs.lore3.desc':           'The truth about the Fractures — Legendary only',
      'gs.lore3.reward':         '🌟 Legendary Avatar · 15💎 per chapter',
      // PVP
      'gs.arena.name':           'DIMENSIONAL ARENA',
      'gs.arena.desc':           'Rock-Paper-Scissors live against other players',
      'gs.arena.reward':         'Bets · Ranking · Weekly pool',
      'gs.rouba.name':           'STEAL THE PILE',
      'gs.rouba.desc':           'Live card duel against other players',
      'gs.rouba.reward':         'Bets · P2E Pool',
      'gs.naval.name':           'BATTLESHIP',
      'gs.naval.desc':           "Sink the opponent's ships",
      'gs.naval.reward':         'Bets · Ranking · P2E Pool',

      // Minigames — titles and common buttons
      'mini.play_again':         'PLAY AGAIN',
      'mini.close':              'CLOSE',
      'mini.confirm':            '✓ CONFIRM',
      'mini.cancel':             'CANCEL',
      'mini.memoria.title':      '🃏 ELEMENTAL MEMORY',
      'mini.memoria.sub':        'Find all the pairs!',
      'mini.simon.title':        '🎵 SIMON SAYS',
      'mini.simon.observe':      'Watch the sequence...',
      'mini.mina.title':         '💣 MINESWEEPER',
      'mini.snake.title':        '🐍 ELEMENTAL SNAKE',
      'mini.maze.title':         '🌀 ELEMENTAL MAZE',
      'mini.maze.info':          'Navigate the fog and find the exit!',
      // Hatch confirm
      'hatch.title':             '🥚 HATCH EGG',
      'hatch.confirm':           '✓ CONFIRM',
      'hatch.cancel':            'CANCEL',

      // Difficulty tiers
      'diff.easy':               'EASY',
      'diff.medium':             'MEDIUM',
      'diff.hard':               'HARD',
      'diff.master':             'MASTER',
      'diff.locked_tip':         'Unlock at level',

      // Action buttons
      'btn.feed':                'FEED',
      'btn.play':                'GAMES',
      'btn.sleep':               'SLEEP',
      'btn.heal':                'HEAL',
      'btn.bath':                'BATH',
      'btn.lay_egg':             'LAY EGG',
      'btn.wake':                'WAKE UP',
      'btn.friends':             'FRIENDS',
      'act.sub.cheio':           'full',
      'act.sub.com_fome':        'hungry',
      'act.sub.sem_forcas':      'too tired',
      'act.sub.sem_sono':        'not sleepy',
      'act.sub.saudavel':        'healthy',
      'act.sub.limpo':           'clean',
      'act.sub.dormindo':        'asleep',

      // Stat labels
      'stat.fome':               '🍖 HUNGER',
      'stat.humor':              '😊 MOOD',
      'stat.energia':            '⚡ ENERGY',
      'stat.saude':              '❤️ HEALTH',
      'stat.higiene':            '🧹 HYGIENE',

      // Misc UI
      'ui.cancel':               'Cancel',
      'ui.elem_passive':         'Elemental Passive',

      // Egg actions
      'egg.burn.title':          '🔥 Burn Egg',
      'egg.burn.btn':            '🔥 Confirm',

      // Panel / right side
      'panel.summon_title':      '◆ SUMMON AVATAR',
      'panel.login_desc':        'Sign in to summon your avatar and save your progress.',
      'panel.xp_label':          'XP',
      'panel.vinculo_label':     'BOND',
      'panel.diary_title':       '◆ DIMENSIONAL DIARY',

      // Dead screen
      'dead.title':              'LOST ENTITY',
      'dead.sub':                'departed to another dimension...\nyour essence lives on in the eggs.',
      'dead.btn':                '✦ SUMMON NEW AVATAR',

      // Portal (idle)
      'portal.waiting':          'DIMENSIONAL PORTAL',
      'portal.sub':              'awaiting invocation',

      // Egg screen

      // Rename
      'rename.placeholder':      'New name...',
      'rename.save':             '✓ SAVE',
      'rename.cancel':           '✕ CANCEL',

      // Arena + Rouba Monte → js/i18n-pvp.js
    },
  };

  const _lang = localStorage.getItem('fv_lang') || 'pt';
  window.LANG_STRINGS = STRINGS[_lang] || STRINGS.pt;
  window._currentLang = _lang;
})();

// ── registerStrings(pt, en) — extensão modular de strings ───────
window.registerStrings = function(pt, en) {
  if(!window.LANG_STRINGS) { console.warn('[i18n] registerStrings chamado antes de init'); return; }
  const ext = window._currentLang === 'en' ? (en || pt) : pt;
  Object.assign(window.LANG_STRINGS, ext);
};

// ── fmtC(v) — formata valor de cristais com 2 casas decimais ─────
function fmtC(v) { return parseFloat(v || 0).toFixed(2); }

// ── t(key, vars) — retorna string traduzida ──────────────────────
function t(key, vars) {
  const s = window.LANG_STRINGS || {};
  let val = s[key];
  if(val === undefined) {
    if(typeof console !== 'undefined') console.warn('[i18n] chave ausente:', key);
    return key;
  }
  if(Array.isArray(val)) return val;
  if(vars) {
    Object.entries(vars).forEach(([k, v]) => {
      val = val.replace(new RegExp('\\{' + k + '\\}', 'g'), v);
    });
  }
  return val;
}

// ── tItemTipo / tItemRaridade — a fachada do catálogo de itens ───
//
// O tipo e a raridade ficam guardados em português no ITEM_CATALOG
// porque são CHAVE, não texto: o código compara tipo === 'Cenário',
// ordena por TIPO_ORDER e agrupa por eles. Traduzir o valor guardado
// partia tudo isso — traduz-se só na hora de o mostrar.
//
// Vão direitos ao LANG_STRINGS em vez de passarem pelo t(): um tipo
// novo que ainda não tenha tradução cai no próprio valor, que já está
// em português, em vez de encher a consola de avisos.
function tItemTipo(tipo) {
  return (window.LANG_STRINGS || {})['item.tipo.' + tipo] || tipo;
}
function tItemRaridade(rar) {
  return (window.LANG_STRINGS || {})['item.rar.' + rar] || rar;
}

// ── Troca idioma e recarrega ─────────────────────────────────────
function setLang(lang) {
  localStorage.setItem('fv_lang', lang);
  location.reload();
}

// ── Aplica data-i18n no DOM ──────────────────────────────────────
function applyI18nDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if(val !== key) {
      if(val.includes('\n')) el.innerHTML = val.replace(/\n/g, '<br>');
      else if(val.includes('<')) el.innerHTML = val;
      else el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if(val !== key) el.placeholder = val;
  });
  // O data-i18n-title existia no HTML desde sempre e ninguém o lia: as
  // dicas do cabeçalho ficavam em português mesmo com o jogo em inglês.
  // E nesses quatro botões a dica é a ÚNICA legenda que existe — o que
  // se vê é só o ícone e o número.
  //
  // Vai também para aria-label, que é o que um leitor de tela anuncia;
  // o title sozinho não chega.
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if(val !== key) { el.title = val; el.setAttribute('aria-label', val); }
  });
}
