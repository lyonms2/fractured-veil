// ═══════════════════════════════════════════════════════════════════
// I18N — Sistema de internacionalização
// Carregado antes de state.js para que t() esteja disponível
// ═══════════════════════════════════════════════════════════════════

(function () {
  const STRINGS = {

    // ── PORTUGUÊS ─────────────────────────────────────────────────
    pt: {
      // Auth — login
      'auth.fill_fields':        'Preenche e-mail e senha.',
      'auth.error.not_found':    'E-mail não encontrado.',
      'auth.error.wrong_pass':   'Senha incorreta.',
      'auth.error.invalid_email':'E-mail inválido.',
      'auth.error.too_many':     'Muitas tentativas. Tenta mais tarde.',
      'auth.error.invalid_cred': 'E-mail ou senha incorretos.',
      'auth.error.login':        'Erro ao entrar. Tenta novamente.',
      // Auth — registo
      'auth.reg.fill_all':       'Preenche todos os campos.',
      'auth.reg.pass_mismatch':  'As senhas não coincidem.',
      'auth.reg.pass_short':     'Senha deve ter pelo menos 6 caracteres.',
      'auth.reg.email_in_use':   'Este e-mail já está em uso.',
      'auth.reg.weak_pass':      'Senha muito fraca.',
      'auth.reg.error':          'Erro ao criar conta. Tenta novamente.',
      // Auth — reset
      'auth.reset.fill':         'Insere o teu e-mail.',
      'auth.reset.sent':         '✓ E-mail de recuperação enviado!',
      'auth.reset.not_found':    'E-mail não encontrado.',
      'auth.reset.error':        'Erro ao enviar. Tenta novamente.',
      // Auth — botões
      'auth.btn.logging_in':     'ENTRANDO...',
      'auth.btn.login':          'ENTRAR',
      'auth.btn.creating':       'CRIANDO...',
      'auth.btn.create':         'CRIAR CONTA',
      'auth.btn.sending':        'ENVIANDO...',
      'auth.btn.send_email':     'ENVIAR E-MAIL',
      'auth.btn.sent':           'ENVIADO ✓',

      // Logs
      'log.session_ended':       'Sessão encerrada.',
      'log.session_other':       '⚠️ Sessão iniciada noutro dispositivo. A encerrar...',
      'log.welcome_back':        'Bem-vindo de volta! ✨',
      'log.state_restored':      'Estado restaurado da nuvem! ☁️',
      'log.woke_offline':        'Acordou com energia plena enquanto estava offline! ☀️',
      'log.repouso_active':      'Modo repouso activo. 💤',
      'log.died_offline':        '{name} não sobreviveu à sua ausência...',
      'log.died':                '{name} partiu para outra dimensão... 💀',
      'log.welcome_new':         'Bem-vindo! Comece uma nova aventura! ✨',
      'log.fed':                 'Alimentado! +{gain} fome  (-{cost} 🪙)',
      'log.feed_no_coins':       'Precisa de {cost} 🪙 para alimentar!',
      'log.renamed':             'Avatar renomeado para "{name}" 💕',
      'log.repouso_on':          'Modo repouso ativado. Stats desaceleram. ⏸',
      'log.repouso_off':         'Modo repouso desativado. Bem-vindo de volta! ✨',
      'log.offline_away':        'Ausente por {h}h {m}min — {status}.',
      'log.offline_slept':       '☀️ acordou enquanto ausente',
      'log.offline_repouso':     '💤 modo repouso activo',
      'log.offline_updated':     'stats atualizados',

      // Bolhas de fala (showBubble)
      'bubble.sleeping':         'Shh... está dormindo 💤',
      'bubble.repouso':          'Em repouso... segure 💤 para retomar',
      'bubble.satisfied':        'Estou satisfeito!',
      'bubble.no_coins':         'Sem moedas... 😢',
      'bubble.dead':             '...💀',
      'bubble.no_avatar':        'Nenhum avatar activo!',
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
      'falas.elem.Eletricidade': ['Carregado de energia! ⚡','Nada me para! ⚡','Mente acelerada! ⚡','Puro poder elétrico! ⚡'],
      'falas.elem.Sombra':       ['As sombras são minha morada... 🌑','Vejo o que os outros não veem! 🌑','Confortável na escuridão... 🌑','Mistério é meu dom! 🖤'],
      'falas.elem.Luz':          ['Brilho onde há escuridão! ☀️','Sou pura luz! ✨','Ilumino tudo ao meu redor! 🌟','A luz nunca mente! ☀️'],
      'falas.elem.Void':         ['O vazio dentro de mim... é paz! 🌌','Vejo além do que existe! 🌌','No nada, tudo começa! ⚫','Sou além do tempo! 🌌'],
      'falas.elem.Aether':       ['Potencial infinito! ✨🌌','Sou de outro plano! ✨','O éter flui por mim! 🌟','Equilíbrio perfeito! ✨'],

      // Fases
      'fases': ['BEBÊ','CRIANÇA','JOVEM','ADULTO'],

      // Vínculo
      'vinculo.distant':    'Distante',
      'vinculo.friend':     'Amigo',
      'vinculo.companion':  'Companheiro',
      'vinculo.soulmate':   'Alma Gémea',

      // Doenças
      'disease.exhaustion':   'Exaustão Crónica',
      'disease.malnutrition': 'Desnutrição',
      'disease.infection':    'Infecção',
      'disease.melancholy':   'Melancolia Dimensional',

      // Itens — nomes
      'item.satiety_amulet.name':  'Amuleto da Saciedade',
      'item.satiety_amulet.desc':  'Uma erva dimensional que suprime a fome e melhora a digestão.',
      'item.satiety_amulet.eff':   'Reduz consumo de Fome em 25% e frequência de cocô',
      'item.easter_deco.name':     'Decoração de Páscoa',
      'item.easter_deco.desc':     'Ovos coloridos enfeitam o cenário. Edição limitada de Páscoa!',
      'item.easter_deco.eff':      'Decora o cenário com ovos animados',
      'item.joy_mask.name':        'Máscara da Alegria',
      'item.joy_mask.desc':        'Uma máscara etérea que irradia serenidade e mantém o humor elevado.',
      'item.joy_mask.eff':         'Reduz decay de Humor em 40% por ciclo',
      'item.sleep_amulet.name':    'Amuleto do Sono Profundo',
      'item.sleep_amulet.desc':    'Um cristal que pulsa durante o sono, amplificando a recuperação de energia.',
      'item.sleep_amulet.eff':     'Energia recupera 2× mais rápido dormindo',
      'item.antidote.name':        'Antídoto Dimensional',
      'item.antidote.desc':        'Uma poção de cristal purificado que dissolve qualquer mal que aflige o avatar.',
      'item.antidote.eff':         'Cura todas as doenças activas + recupera +20 saúde',

      // UI estático
      'ui.loading':              'CARREGANDO...',
      'ui.logout':               '✕ SAIR',
      'ui.repouso_mode':         'MODO REPOUSO',
      'ui.repouso_resume':       '▶ RETOMAR',
      'ui.sleeping':             '💤 dormindo',
      'ui.no_items':             'Nenhum item no inventário',
      'ui.no_eggs':              'Nenhum ovo ainda',
      'ui.sick':                 '🤒 Doente',
      'ui.life_remaining':       '⏳ VIDA RESTANTE',
      'ui.summon_btn':           '▶ Invocar Avatar (Gratuito)',
      'ui.login_required':       'LOGIN NECESSÁRIO',
      'ui.login_required_desc':  'Entra na tua conta para invocar o teu avatar e guardar o progresso.',
      'ui.do_login':             '🔑 FAZER LOGIN',

      // Header / nav
      'ui.market_title':         'Mercado',
      'ui.coins_title':          'Câmbio de Moedas',
      'ui.eggs_title':           'Inventário de ovos',
      'ui.items_title':          'Inventário de itens',

      // Modais de inventário
      'inv.items_title':         '🎒 INVENTÁRIO DE ITENS',
      'inv.eggs_title':          '🥚 INVENTÁRIO DE OVOS',
      'inv.coins_title':         '🪙 MOEDAS',
      'inv.coins_sub':           'Moeda interna do jogo',
      'inv.exchange_label':      '◆ CÂMBIO 🪙 → 💎',
      'inv.exchange_empty':      'Abre a loja para ver o câmbio.',
      'inv.crystals_cta':        '💎 Precisas de mais Cristais?',
      'inv.crystals_desc':       'Compra cristais com MATIC ou vende ovos no Marketplace.',
      'inv.crystals_btn':        'Ir ao Marketplace →',
      'inv.items_store':         '🔮 ITENS',

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
      'gs.lore1.desc':           'A saga pós-guerra — Fracturas, Avatares e O Vácuo',
      'gs.lore1.reward':         '⚪ Avatar Comum · 50🪙 por capítulo',
      'gs.lore2.name':           'CRÔNICAS DOS RAROS',
      'gs.lore2.desc':           'Histórias exclusivas para Avatares Raros',
      'gs.lore2.reward':         '🔵 Avatar Raro · 5💎 por capítulo',
      'gs.lore3.name':           'ÉPICOS DO VÁCUO',
      'gs.lore3.desc':           'A verdade sobre as Fracturas — apenas para Lendários',
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
      'btn.play':                'BRINCAR',
      'btn.sleep':               'DORMIR',
      'btn.heal':                'MEDICAR',
      'btn.bath':                'BANHO',
      'btn.lay_egg':             'BOTAR OVO',
      'btn.wake':                'ACORDAR',
      'btn.repouso':             'REPOUSO',

      // Panel / right side
      'panel.summon_title':      '◆ INVOCAR AVATAR',
      'panel.login_desc':        'Entra na tua conta para invocar o teu avatar e guardar o progresso.',
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
      'egg.hint':                'CLIQUE PARA CHOCAR',

      // Rename
      'rename.placeholder':      'Novo nome...',
      'rename.save':             '✓ SALVAR',
      'rename.cancel':           '✕ CANCELAR',

      // Arena — UI
      'arena.title':             '⚔️ ARENA DIMENSIONAL',
      'arena.sub':               'Jo-Ken-Pô ao vivo · Fila',
      'arena.tab.lobby':         'LOBBY',
      'arena.tab.ranking':       'RANKING',
      'arena.queue_active':      'Na fila — matchmaking automático ativo...',
      'arena.leave_queue':       '⬅ SAIR DA FILA',
      'arena.enter_queue':       '⚔️ ENTRAR NA FILA',
      'arena.no_balance_cost':   'Saldo insuficiente ({cost} necessário)',
      'arena.no_avatars':        'Nenhum avatar na fila ainda...',
      'arena.queue_label':       'Avatares na fila {rar}',
      'arena.search_ph':         'Buscar avatar...',
      'arena.no_results':        'Nenhum resultado para "{q}"',
      'arena.challenge_btn':     '⚔️ DESAFIAR',
      'arena.join_to_challenge': 'Entre na fila<br>para desafiar',
      'arena.bet_label':         'Aposta: {val}',
      'arena.winner_takes':      'Vencedor leva: {val}',
      'arena.pool_pct':          '15% → pool do ranking',
      'arena.no_matches':        'Nenhuma partida ainda.',
      'arena.pool_title':        '💰 POOL SEMANAL',
      'arena.pool_reset':        'Distribuído toda segunda-feira · Reset automático',
      'arena.pool_how':          '◆ COMO É DISTRIBUÍDO',
      'arena.waiting_accept':    'Aguardando o oponente aceitar...',
      'arena.challenge_sent':    'DESAFIO ENVIADO',
      'arena.room_id':           'Sala #{id}',
      'arena.cancel_btn':        '✕ CANCELAR',
      'arena.ch_received':       'DESAFIO RECEBIDO!',
      'arena.from_wallet':       'De: {wallet}...',
      'arena.accept_btn':        '✅ ACEITAR',
      'arena.refuse_btn':        '✕ RECUSAR',
      'arena.round_badge':       'RODADA {n} / {max}',
      'arena.your_turn':         'SUA VEZ',
      'arena.wait':              'AGUARDE',
      'arena.choose':            '⚔️ Escolha sua jogada!',
      'arena.waiting_op':        '⏳ Aguardando oponente...',
      'arena.calculating':       '⚡ Calculando resultado...',
      'arena.revealing':         '⚡ Revelando...',
      'arena.rock':              'PEDRA',
      'arena.paper':             'PAPEL',
      'arena.scissors':          'TESOURA',
      'arena.round_win':         '🏆 VOCÊ VENCEU A RODADA!',
      'arena.round_lose':        '💀 VOCÊ PERDEU A RODADA',
      'arena.draw_round':        '🤝 EMPATE!',
      'arena.victory':           '🏆 VITÓRIA!',
      'arena.defeat':            '💀 DERROTA',
      'arena.draw_final':        '🤝 EMPATE!',
      'arena.tie_refund':        'Empate — apostas devolvidas',
      'arena.prize_received':    '+{val} {moeda} recebidos!',
      'arena.rank_pts_win':      '+{pts} pontos no ranking',
      'arena.better_luck':       'Melhor sorte na próxima!',
      'arena.rank_pts_lose':     '+{pts} ponto no ranking',
      'arena.play_again':        '⚔️ JOGAR DE NOVO',
      'arena.close_btn':         '✕ FECHAR',
      'arena.you':               'Você',
      // Arena — bubbles
      'arena.bub.need_avatar':   'Precisa de um avatar ativo!',
      'arena.bub.resting':       'Descansando agora...',
      'arena.bub.unavailable':   'Arena indisponível',
      'arena.bub.no_balance':    'Saldo insuficiente!',
      'arena.bub.op_in_match':   'Oponente já entrou em outra partida!',
      'arena.bub.sent':          'Desafio enviado! ⚔️',
      'arena.bub.no_bal_accept': 'Saldo insuficiente para aceitar!',
      'arena.bub.ch_unavail':    'Desafio não disponível!',
      'arena.bub.ch_cancelled':  'Desafio cancelado! 😔',
      'arena.bub.reconnected':   'Reconectado! ⚔️',
      'arena.bub.pending':       'Desafio pendente! ⚔️',
      'arena.bub.challenged':    'Você foi desafiado! ⚔️',
      'arena.bub.victory':       'Vitória! +{val} {moeda} 🏆',
      'arena.bub.placement':     '{pos}º lugar na Arena! {moeda}',
      // Arena — logs
      'arena.log.joined':        'Entrou na fila da Arena! ⚔️',
      'arena.log.left':          'Saiu da fila da Arena.',
      'arena.log.sent_to':       'Desafio enviado para {wallet}...',
      'arena.log.cancelled':     'Desafio cancelado ou recusado.',
      'arena.log.refused':       'Desafio recusado.',
      'arena.log.recv_from':     'Desafio recebido de {wallet}...! Abra a Arena para aceitar.',
      'arena.log.received':      'Desafio recebido! Abra a Arena para aceitar.',
      'arena.log.op_cancelled':  'Desafio cancelado pelo oponente.',
      'arena.log.recon_waiting': 'Reconectado — aguardando oponente aceitar.',
      'arena.log.has_pending':   'Você tem um desafio pendente!',
      'arena.log.recon_match':   'Reconectado à partida em andamento!',
      'arena.log.result':        'Arena: {titulo} contra {nome}',
      'arena.log.placement':     'Arena {fila}: {pos}º lugar — +{val} {moeda}!',
      'arena.log.ch_expired':    'Desafio já foi cancelado ou expirou.',

      // Rouba Monte — UI
      'rm.title':              '🃏 ROUBA MONTE',
      'rm.sub':                'Duelo de cartas · Fila',
      'rm.bub.unavailable':    'Rouba Monte indisponível',
      'rm.enter_queue':        '🃏 ENTRAR NA FILA',
      'rm.queue_label':        'JOGADORES NA FILA · {rar}',
      'rm.no_players':         'Nenhum jogador na fila ainda...',
      'rm.no_results':         'Nenhum resultado para "{q}"',
      'rm.challenge_btn':      '🃏 DESAFIAR',
      'rm.how_to':             '◆ COMO JOGAR',
      'rm.bet_col':            'APOSTA',
      'rm.prize_col':          'PRÉMIO',
      'rm.tax_col':            'TAXA',
      'rm.your_turn':          '⚡ SUA VEZ',
      'rm.wait':               '⏳ AGUARDANDO',
      'rm.time_left':          'TEMPO RESTANTE',
      'rm.op_pile':            'Monte: {n} cartas',
      'rm.pile_top_lbl':       'TOPO MONTE',
      'rm.pile_empty':         'monte<br>vazio',
      'rm.table':              'MESA CENTRAL · {n} CARTAS',
      'rm.table_empty':        'mesa vazia',
      'rm.my_pile':            '📦 MEU MONTE',
      'rm.pile_cards':         '{n} cartas',
      'rm.pile_top_mine':      'Topo: {card}',
      'rm.my_hand':            'MINHA MÃO · {n} CARTAS',
      'rm.no_cards':           'sem cartas',
      'rm.play_card':          '✅ JOGAR CARTA',
      'rm.op_turn':            '⏳ vez do oponente...',
      'rm.abandon_title':      'ABANDONAR?',
      'rm.abandon_desc':       'O oponente ganhará a partida<br>e ficará com o prémio.',
      'rm.abandon_confirm':    '🏳️ CONFIRMAR',
      'rm.abandon_back':       '← CONTINUAR',
      'rm.victory_abandon':    '🏆 VITÓRIA! (abandono)',
      'rm.victory':            '🏆 VITÓRIA!',
      'rm.defeat':             '💀 DERROTA',
      'rm.prize_xp':           '+{val} {moeda} · +{xp} XP',
      'rm.bets_returned':      'Apostas devolvidas · +{xp} XP',
      'rm.better_luck_xp':     'Melhor sorte! · +{xp} XP',
      'rm.play_again':         '🃏 JOGAR DE NOVO',
      'rm.stole':              '🔥 ROUBASTE O MONTE!',
      'rm.pile_stolen':        '💀 MONTE ROUBADO!',
      'rm.stole_sub':          '{card} bateu no topo do oponente',
      'rm.stolen_sub':         'Oponente roubou o teu monte',
      // Rouba Monte — bubbles/logs
      'rm.bub.sent':           'Desafio enviado! 🃏',
      'rm.bub.challenged':     'Desafio de Rouba Monte! 🃏',
      'rm.bub.reconnected':    'Reconectado! 🃏',
      'rm.log.joined':         'Entrou na fila do Rouba Monte! 🃏',
      'rm.log.left':           'Saiu da fila do Rouba Monte.',
      'rm.log.sent_to':        'Desafio enviado para {wallet}...',
      'rm.log.recv_from':      'Desafio de Rouba Monte recebido de {wallet}...',
      'rm.log.recon_match':    'Reconectado à partida de Rouba Monte!',
      'rm.log.abandoned':      'Abandonaste a partida. O oponente ganhou. 🏳️',
      'rm.log.expired':        'Desafio já expirou.',
      'rm.log.result':         'Rouba Monte: {titulo} · {meu} vs {op} cartas',
    },

    // ── ENGLISH ───────────────────────────────────────────────────
    en: {
      // Auth — login
      'auth.fill_fields':        'Please fill in your email and password.',
      'auth.error.not_found':    'Email not found.',
      'auth.error.wrong_pass':   'Incorrect password.',
      'auth.error.invalid_email':'Invalid email address.',
      'auth.error.too_many':     'Too many attempts. Please try again later.',
      'auth.error.invalid_cred': 'Incorrect email or password.',
      'auth.error.login':        'Login error. Please try again.',
      // Auth — register
      'auth.reg.fill_all':       'Please fill in all fields.',
      'auth.reg.pass_mismatch':  'Passwords do not match.',
      'auth.reg.pass_short':     'Password must be at least 6 characters.',
      'auth.reg.email_in_use':   'This email is already in use.',
      'auth.reg.weak_pass':      'Password is too weak.',
      'auth.reg.error':          'Account creation error. Please try again.',
      // Auth — reset
      'auth.reset.fill':         'Please enter your email.',
      'auth.reset.sent':         '✓ Recovery email sent!',
      'auth.reset.not_found':    'Email not found.',
      'auth.reset.error':        'Send error. Please try again.',
      // Auth — buttons
      'auth.btn.logging_in':     'SIGNING IN...',
      'auth.btn.login':          'SIGN IN',
      'auth.btn.creating':       'CREATING...',
      'auth.btn.create':         'CREATE ACCOUNT',
      'auth.btn.sending':        'SENDING...',
      'auth.btn.send_email':     'SEND EMAIL',
      'auth.btn.sent':           'SENT ✓',

      // Logs
      'log.session_ended':       'Session ended.',
      'log.session_other':       '⚠️ Session started on another device. Disconnecting...',
      'log.welcome_back':        'Welcome back! ✨',
      'log.state_restored':      'State restored from cloud! ☁️',
      'log.woke_offline':        'Woke up fully rested while offline! ☀️',
      'log.repouso_active':      'Rest mode active. 💤',
      'log.died_offline':        '{name} did not survive your absence...',
      'log.died':                '{name} departed to another dimension... 💀',
      'log.welcome_new':         'Welcome! Begin a new adventure! ✨',
      'log.fed':                 'Fed! +{gain} hunger  (-{cost} 🪙)',
      'log.feed_no_coins':       'You need {cost} 🪙 to feed!',
      'log.renamed':             'Avatar renamed to "{name}" 💕',
      'log.repouso_on':          'Rest mode activated. Stats slow down. ⏸',
      'log.repouso_off':         'Rest mode deactivated. Welcome back! ✨',
      'log.offline_away':        'Away for {h}h {m}min — {status}.',
      'log.offline_slept':       '☀️ woke up while away',
      'log.offline_repouso':     '💤 rest mode was active',
      'log.offline_updated':     'stats updated',

      // Bubbles
      'bubble.sleeping':         'Shh... sleeping 💤',
      'bubble.repouso':          'Resting... hold 💤 to resume',
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
      'falas.elem.Eletricidade': ["Charged with energy! ⚡","Nothing stops me! ⚡","Accelerated mind! ⚡","Pure electric power! ⚡"],
      'falas.elem.Sombra':       ["Shadows are my home... 🌑","I see what others can't! 🌑","Comfortable in the dark... 🌑","Mystery is my gift! 🖤"],
      'falas.elem.Luz':          ["I shine where there's darkness! ☀️","I am pure light! ✨","I illuminate everything around me! 🌟","Light never lies! ☀️"],
      'falas.elem.Void':         ["The void within me... is peace! 🌌","I see beyond what exists! 🌌","In nothing, everything begins! ⚫","I am beyond time! 🌌"],
      'falas.elem.Aether':       ["Infinite potential! ✨🌌","I'm from another plane! ✨","Aether flows through me! 🌟","Perfect balance! ✨"],

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

      // Items — names
      'item.satiety_amulet.name':  'Satiety Amulet',
      'item.satiety_amulet.desc':  'A dimensional herb that suppresses hunger and improves digestion.',
      'item.satiety_amulet.eff':   'Reduces Hunger decay by 25% and poop frequency',
      'item.easter_deco.name':     'Easter Decoration',
      'item.easter_deco.desc':     'Colorful eggs decorate the scene. Limited Easter edition!',
      'item.easter_deco.eff':      'Decorates scene with animated eggs',
      'item.joy_mask.name':        'Joy Mask',
      'item.joy_mask.desc':        'An ethereal mask that radiates serenity and keeps mood high.',
      'item.joy_mask.eff':         'Reduces Mood decay by 40% per cycle',
      'item.sleep_amulet.name':    'Deep Sleep Amulet',
      'item.sleep_amulet.desc':    'A crystal that pulses during sleep, amplifying energy recovery.',
      'item.sleep_amulet.eff':     'Energy recovers 2× faster while sleeping',
      'item.antidote.name':        'Dimensional Antidote',
      'item.antidote.desc':        'A purified crystal potion that dissolves any ailment affecting the avatar.',
      'item.antidote.eff':         'Cures all active diseases + restores +20 health',

      // Static UI
      'ui.loading':              'LOADING...',
      'ui.logout':               '✕ LOGOUT',
      'ui.repouso_mode':         'REST MODE',
      'ui.repouso_resume':       '▶ RESUME',
      'ui.sleeping':             '💤 sleeping',
      'ui.no_items':             'No items in inventory',
      'ui.no_eggs':              'No eggs yet',
      'ui.sick':                 '🤒 Sick',
      'ui.life_remaining':       '⏳ LIFE REMAINING',
      'ui.summon_btn':           '▶ Summon Avatar (Free)',
      'ui.login_required':       'LOGIN REQUIRED',
      'ui.login_required_desc':  'Sign in to summon your avatar and save your progress.',
      'ui.do_login':             '🔑 SIGN IN',

      // Header / nav
      'ui.market_title':         'Market',
      'ui.coins_title':          'Coin Exchange',
      'ui.eggs_title':           'Egg Inventory',
      'ui.items_title':          'Item Inventory',

      // Inventory modals
      'inv.items_title':         '🎒 ITEM INVENTORY',
      'inv.eggs_title':          '🥚 EGG INVENTORY',
      'inv.coins_title':         '🪙 COINS',
      'inv.coins_sub':           'In-game currency',
      'inv.exchange_label':      '◆ EXCHANGE 🪙 → 💎',
      'inv.exchange_empty':      'Open the shop to see the exchange.',
      'inv.crystals_cta':        '💎 Need more Crystals?',
      'inv.crystals_desc':       'Buy crystals with MATIC or sell eggs on the Marketplace.',
      'inv.crystals_btn':        'Go to Marketplace →',
      'inv.items_store':         '🔮 ITEMS',

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
      'btn.play':                'PLAY',
      'btn.sleep':               'SLEEP',
      'btn.heal':                'HEAL',
      'btn.bath':                'BATH',
      'btn.lay_egg':             'LAY EGG',
      'btn.wake':                'WAKE UP',
      'btn.repouso':             'REST',

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
      'egg.hint':                'CLICK TO HATCH',

      // Rename
      'rename.placeholder':      'New name...',
      'rename.save':             '✓ SAVE',
      'rename.cancel':           '✕ CANCEL',

      // Arena — UI
      'arena.title':             '⚔️ DIMENSIONAL ARENA',
      'arena.sub':               'Rock-Paper-Scissors live · Queue',
      'arena.tab.lobby':         'LOBBY',
      'arena.tab.ranking':       'RANKING',
      'arena.queue_active':      'In queue — auto matchmaking active...',
      'arena.leave_queue':       '⬅ LEAVE QUEUE',
      'arena.enter_queue':       '⚔️ JOIN QUEUE',
      'arena.no_balance_cost':   'Insufficient balance ({cost} required)',
      'arena.no_avatars':        'No avatars in queue yet...',
      'arena.queue_label':       '{rar} queue avatars',
      'arena.search_ph':         'Search avatar...',
      'arena.no_results':        'No results for "{q}"',
      'arena.challenge_btn':     '⚔️ CHALLENGE',
      'arena.join_to_challenge': 'Join the queue<br>to challenge',
      'arena.bet_label':         'Bet: {val}',
      'arena.winner_takes':      'Winner takes: {val}',
      'arena.pool_pct':          '15% → ranking pool',
      'arena.no_matches':        'No matches yet.',
      'arena.pool_title':        '💰 WEEKLY POOL',
      'arena.pool_reset':        'Distributed every Monday · Auto reset',
      'arena.pool_how':          '◆ HOW IT\'S DISTRIBUTED',
      'arena.waiting_accept':    'Waiting for opponent to accept...',
      'arena.challenge_sent':    'CHALLENGE SENT',
      'arena.room_id':           'Room #{id}',
      'arena.cancel_btn':        '✕ CANCEL',
      'arena.ch_received':       'CHALLENGE RECEIVED!',
      'arena.from_wallet':       'From: {wallet}...',
      'arena.accept_btn':        '✅ ACCEPT',
      'arena.refuse_btn':        '✕ REFUSE',
      'arena.round_badge':       'ROUND {n} / {max}',
      'arena.your_turn':         'YOUR TURN',
      'arena.wait':              'WAIT',
      'arena.choose':            '⚔️ Choose your move!',
      'arena.waiting_op':        '⏳ Waiting for opponent...',
      'arena.calculating':       '⚡ Calculating result...',
      'arena.revealing':         '⚡ Revealing...',
      'arena.rock':              'ROCK',
      'arena.paper':             'PAPER',
      'arena.scissors':          'SCISSORS',
      'arena.round_win':         '🏆 YOU WON THE ROUND!',
      'arena.round_lose':        '💀 YOU LOST THE ROUND',
      'arena.draw_round':        '🤝 DRAW!',
      'arena.victory':           '🏆 VICTORY!',
      'arena.defeat':            '💀 DEFEAT',
      'arena.draw_final':        '🤝 DRAW!',
      'arena.tie_refund':        'Draw — bets refunded',
      'arena.prize_received':    '+{val} {moeda} received!',
      'arena.rank_pts_win':      '+{pts} points in ranking',
      'arena.better_luck':       'Better luck next time!',
      'arena.rank_pts_lose':     '+{pts} point in ranking',
      'arena.play_again':        '⚔️ PLAY AGAIN',
      'arena.close_btn':         '✕ CLOSE',
      'arena.you':               'You',
      // Arena — bubbles
      'arena.bub.need_avatar':   'You need an active avatar!',
      'arena.bub.resting':       'Resting now...',
      'arena.bub.unavailable':   'Arena unavailable',
      'arena.bub.no_balance':    'Insufficient balance!',
      'arena.bub.op_in_match':   'Opponent is already in another match!',
      'arena.bub.sent':          'Challenge sent! ⚔️',
      'arena.bub.no_bal_accept': 'Insufficient balance to accept!',
      'arena.bub.ch_unavail':    'Challenge unavailable!',
      'arena.bub.ch_cancelled':  'Challenge cancelled! 😔',
      'arena.bub.reconnected':   'Reconnected! ⚔️',
      'arena.bub.pending':       'Pending challenge! ⚔️',
      'arena.bub.challenged':    "You've been challenged! ⚔️",
      'arena.bub.victory':       'Victory! +{val} {moeda} 🏆',
      'arena.bub.placement':     '{pos}th place in Arena! {moeda}',
      // Arena — logs
      'arena.log.joined':        'Joined the Arena queue! ⚔️',
      'arena.log.left':          'Left the Arena queue.',
      'arena.log.sent_to':       'Challenge sent to {wallet}...',
      'arena.log.cancelled':     'Challenge cancelled or refused.',
      'arena.log.refused':       'Challenge refused.',
      'arena.log.recv_from':     'Challenge received from {wallet}...! Open Arena to accept.',
      'arena.log.received':      'Challenge received! Open Arena to accept.',
      'arena.log.op_cancelled':  'Challenge cancelled by opponent.',
      'arena.log.recon_waiting': 'Reconnected — waiting for opponent to accept.',
      'arena.log.has_pending':   'You have a pending challenge!',
      'arena.log.recon_match':   'Reconnected to ongoing match!',
      'arena.log.result':        'Arena: {titulo} against {nome}',
      'arena.log.placement':     'Arena {fila}: {pos}th place — +{val} {moeda}!',
      'arena.log.ch_expired':    'Challenge was already cancelled or expired.',

      // Rouba Monte — UI
      'rm.title':              '🃏 STEAL THE PILE',
      'rm.sub':                'Card duel · Queue',
      'rm.bub.unavailable':    'Steal the Pile unavailable',
      'rm.enter_queue':        '🃏 JOIN QUEUE',
      'rm.queue_label':        'PLAYERS IN QUEUE · {rar}',
      'rm.no_players':         'No players in queue yet...',
      'rm.no_results':         'No results for "{q}"',
      'rm.challenge_btn':      '🃏 CHALLENGE',
      'rm.how_to':             '◆ HOW TO PLAY',
      'rm.bet_col':            'BET',
      'rm.prize_col':          'PRIZE',
      'rm.tax_col':            'FEE',
      'rm.your_turn':          '⚡ YOUR TURN',
      'rm.wait':               '⏳ WAITING',
      'rm.time_left':          'TIME LEFT',
      'rm.op_pile':            'Pile: {n} cards',
      'rm.pile_top_lbl':       'PILE TOP',
      'rm.pile_empty':         'pile<br>empty',
      'rm.table':              'CENTER TABLE · {n} CARDS',
      'rm.table_empty':        'table empty',
      'rm.my_pile':            '📦 MY PILE',
      'rm.pile_cards':         '{n} cards',
      'rm.pile_top_mine':      'Top: {card}',
      'rm.my_hand':            'MY HAND · {n} CARDS',
      'rm.no_cards':           'no cards',
      'rm.play_card':          '✅ PLAY CARD',
      'rm.op_turn':            "⏳ opponent's turn...",
      'rm.abandon_title':      'ABANDON?',
      'rm.abandon_desc':       'Opponent will win the match<br>and keep the prize.',
      'rm.abandon_confirm':    '🏳️ CONFIRM',
      'rm.abandon_back':       '← CONTINUE',
      'rm.victory_abandon':    '🏆 VICTORY! (forfeit)',
      'rm.victory':            '🏆 VICTORY!',
      'rm.defeat':             '💀 DEFEAT',
      'rm.prize_xp':           '+{val} {moeda} · +{xp} XP',
      'rm.bets_returned':      'Bets refunded · +{xp} XP',
      'rm.better_luck_xp':     'Better luck! · +{xp} XP',
      'rm.play_again':         '🃏 PLAY AGAIN',
      'rm.stole':              '🔥 YOU STOLE THE PILE!',
      'rm.pile_stolen':        '💀 PILE STOLEN!',
      'rm.stole_sub':          '{card} matched the opponent\'s top',
      'rm.stolen_sub':         'Opponent stole your pile',
      // Rouba Monte — bubbles/logs
      'rm.bub.sent':           'Challenge sent! 🃏',
      'rm.bub.challenged':     'Steal the Pile challenge! 🃏',
      'rm.bub.reconnected':    'Reconnected! 🃏',
      'rm.log.joined':         'Joined the Steal the Pile queue! 🃏',
      'rm.log.left':           'Left the Steal the Pile queue.',
      'rm.log.sent_to':        'Challenge sent to {wallet}...',
      'rm.log.recv_from':      'Steal the Pile challenge received from {wallet}...',
      'rm.log.recon_match':    'Reconnected to Steal the Pile match!',
      'rm.log.abandoned':      'You abandoned the match. Opponent wins. 🏳️',
      'rm.log.expired':        'Challenge already expired.',
      'rm.log.result':         'Steal the Pile: {titulo} · {meu} vs {op} cards',
    },
  };

  const _lang = localStorage.getItem('fv_lang') || 'pt';
  window.LANG_STRINGS = STRINGS[_lang] || STRINGS.pt;
  window._currentLang = _lang;
})();

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
      else el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = t(key);
    if(val !== key) el.placeholder = val;
  });
}
