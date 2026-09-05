// ═══════════════════════════════════════════════════════════════════
// I18N — Sessão (main.js + summon.js)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // main.js
    'main.bub.inativo':      'Vai sair? Bota ele pra dormir! 🌙',
    'main.log.inativo':      'Inativo há 5min — clique em 💤 DORMIR antes de sair.',
    'main.log.slot_changed': 'Slot ativo alterado para Slot {n} via Marketplace.',
    'main.log.inbox_eggs':   '🥚 Novos ovos recebidos!',
    'main.bub.inbox_eggs':   'Ovos chegaram! 🥚',
    'main.zoom.info':        '{rar} · {fase} · Nível {nivel}',

    // summon.js
    'summon.log.no_login':   'Faça login primeiro!',
    'summon.log.no_coins':   'Você precisa de {cost} 🪙 para invocar outro avatar. Volte para um avatar seu e jogue os minigames para ganhar moedas.',
    'summon.bub.no_coins':   'Moedas insuficientes... 😢',
    'summon.lock.title':     'INVOCAÇÕES GRÁTIS ESGOTADAS',
    'summon.lock.desc':      'A próxima invocação custa {cost} 🪙 e você tem {have} 🪙 — faltam {missing} 🪙. Volte para um avatar seu e jogue os minigames para ganhar moedas.',
    'summon.lock.desc_nofree':'A próxima invocação custa {cost} 🪙 e você ainda não tem o suficiente. Jogue os minigames para ganhar moedas.',
    // A saida do painel de invocar. Fica sempre a vista quando ha um
    // avatar para onde voltar, e nao so quando falta dinheiro.
    'summon.voltar':         '↩ Voltar à colônia',
    'summon.custo':          'Custa',
    'summon.saldo':          'Você tem',
    'summon.bub.no_login':   'Faça login primeiro! 🔑',
    'summon.log.legendary':  '🌟 INVOCAÇÃO LENDÁRIA! Uma entidade primordial respondeu ao chamado!',
    'summon.log.rare':       '✨ Invocação Rara! Um guardião experiente surge!',
    'summon.log.common':     'Uma entidade dimensional foi invocada!',
    'summon.log.invoked':    '{nome} foi invocado!',
    'summon.bub.new_slot':   'Novo avatar no Slot {n}! 🐣',
    'summon.log.born_slot':  '{nome} nasceu no Slot {n}! Ative-o no Marketplace.',
    'summon.bub.hello':      'Olá! 🐣',
    'summon.log.born':       '{nome} nasceu! Cuide bem dele.',

    // onboarding tips
    'onboard.tip.summon':  '💡 Dica: clique em INVOCAR para criar seu primeiro avatar — é gratuito!',
    'onboard.tip.feed':    '🍖 Dica: alimente seu avatar clicando em ALIMENTAR (10 🪙 por refeição).',
    'onboard.tip.play':    '🎮 Dica: jogue minigames para ganhar moedas e XP — clique em JOGOS.',
    'onboard.tip.rest':    '💤 Dica: antes de sair, clique no botão 💤 DORMIR — a energia continua subindo mesmo ausente.',
    'onboard.tip.coins':   '⚠️ Poucas moedas! Jogue minigames (JOGOS) para ganhar mais.',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // main.js
    'main.bub.inativo':      'Going away? Put it to sleep! 🌙',
    'main.log.inativo':      'Inactive for 5min — click 💤 SLEEP before you go.',
    'main.log.slot_changed': 'Active slot changed to Slot {n} via Marketplace.',
    'main.log.inbox_eggs':   '🥚 New eggs received!',
    'main.bub.inbox_eggs':   'Eggs arrived! 🥚',
    'main.zoom.info':        '{rar} · {fase} · Level {nivel}',

    // summon.js
    'summon.log.no_login':   'Log in first!',
    'summon.log.no_coins':   'You need {cost} 🪙 to summon another avatar. Go back to one of your avatars and play the minigames to earn coins.',
    'summon.bub.no_coins':   'Not enough coins... 😢',
    'summon.lock.title':     'FREE SUMMONS USED UP',
    'summon.lock.desc':      'The next summon costs {cost} 🪙 and you have {have} 🪙 — {missing} 🪙 short. Go back to one of your avatars and play the minigames to earn coins.',
    'summon.lock.desc_nofree':'The next summon costs {cost} 🪙 and you do not have enough yet. Play the minigames to earn coins.',
    'summon.voltar':         '↩ Back to the colony',
    'summon.custo':          'Costs',
    'summon.saldo':          'You have',
    'summon.bub.no_login':   'You need to log in! 🔑',
    'summon.log.legendary':  '🌟 LEGENDARY SUMMON! A primordial entity answered the call!',
    'summon.log.rare':       '✨ Rare Summon! An experienced guardian emerges!',
    'summon.log.common':     'A dimensional entity has been summoned!',
    'summon.log.invoked':    '{nome} was summoned!',
    'summon.bub.new_slot':   'New avatar in Slot {n}! 🐣',
    'summon.log.born_slot':  '{nome} was born in Slot {n}! Activate it in Marketplace.',
    'summon.bub.hello':      'Hello! 🐣',
    'summon.log.born':       '{nome} was born! Take good care of them.',

    // onboarding tips
    'onboard.tip.summon':  '💡 Tip: click SUMMON to create your first avatar — it\'s free!',
    'onboard.tip.feed':    '🍖 Tip: feed your avatar by clicking FEED (10 🪙 per meal).',
    'onboard.tip.play':    '🎮 Tip: play minigames to earn coins and XP — click GAMES.',
    'onboard.tip.rest':    '💤 Tip: before leaving, click the 💤 SLEEP button — energy keeps rising even while away.',
    'onboard.tip.coins':   '⚠️ Low on coins! Play minigames (GAMES) to earn more.',
  }
);
