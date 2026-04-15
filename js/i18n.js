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

      // Arena + Rouba Monte → js/i18n-pvp.js
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
