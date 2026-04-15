// ═══════════════════════════════════════════════════════════════════
// I18N — Minigames (Memória, Simon, Velha, Dormir, Curar)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // Genérico
    'mg.bub.tired':          'Cansado demais... 😴',
    'mg.bub.almost':         'Quase... 😔',
    'mg.bub.not_tired':      'Não estou cansado!',
    'mg.reward_humor':       '+{humor} 😊  +{xp} XP  +{coins} 🪙',
    'mg.reward_xp':          '+{xp} XP  +{coins} 🪙',

    // Memória Elemental
    'mg.mem.sub_pairs':      '{n} pares',
    'mg.mem.info':           'Pares: {matched}/{total} · Erros: {errors}',
    'mg.mem.perfect':        '🌟 PERFEITO!',
    'mg.mem.complete':       '✓ COMPLETO!',
    'mg.mem.done':           '😅 COMPLETO',
    'mg.mem.bub.perfect':    'Memória perfeita! 🌟',
    'mg.mem.bub.complete':   'Conseguimos! 🃏',

    // Simon Says
    'mg.simon.round':        'Rodada {n}/{max}',
    'mg.simon.watch':        'Observe...',
    'mg.simon.your_turn':    'Sua vez!',
    'mg.simon.correct':      '✓ Correto!',
    'mg.simon.master':       '🎵 MESTRE! (bônus conclusão!)',
    'mg.simon.failed':       '✗ ERROU! ({hits} acertos)',
    'mg.simon.bub.master':   'Mestre da memória! 🎵',

    // Dormir
    'mg.sleep.wake_btn':     'ACORDAR',
    'mg.sleep.sleep_btn':    'DORMIR',
    'mg.sleep.bub':          'zzz... 💤',
    'mg.sleep.log':          'Dormindo...',
    'mg.sleep.log.full':     'Acordou com energia plena!',
    'mg.sleep.log.rested':   'Acordou descansado!',

    // Medicar
    'mg.heal.bub.healthy':   'Estou bem!',
    'mg.heal.bub.no_coins':  'Sem moedas... 😢',
    'mg.heal.bub.better':    'Me sinto melhor! 💊',
    'mg.heal.log.diseases':  '⚠️ Tens {n} doença(s) activa(s)! O Medicar recupera saúde mas não cura doenças — usa o Antídoto Dimensional (300 🪙) na loja.',
    'mg.heal.log.no_coins':  'Precisa de {cost} 🪙 para medicar!',
    'mg.heal.log.healed':    'Medicado! +40 saúde  (-40 🪙)',

    // Antídoto
    'mg.antidote.bub.healthy':  'Não tenho nenhuma doença! 💪',
    'mg.antidote.bub.no_coins': 'Sem moedas para o antídoto... 😢',
    'mg.antidote.bub.cured':    'Curado! ✨',
    'mg.antidote.log.healthy':  'O avatar está saudável — antídoto não é necessário.',
    'mg.antidote.log.no_coins': 'Precisas de {cost} 🪙 para o Antídoto Dimensional!',
    'mg.antidote.msg.multi':    '{n} doenças curadas!',
    'mg.antidote.msg.one':      'Doença curada!',
    'mg.antidote.msg.none':     'Recuperado!',
    'mg.antidote.log.used':     '🧪 Antídoto Dimensional usado! {msg} +20 saúde  (-{cost} 🪙)',

    // Jogo da Velha
    'mg.velha.info':             '{diff} · Sua vez! ✕',
    'mg.velha.ai_turn':          'Vez do Avatar... 🤔',
    'mg.velha.incredible':       '🌟 INCRÍVEL!',
    'mg.velha.win':              '✕ VITÓRIA!',
    'mg.velha.lose':             '○ DERROTA',
    'mg.velha.draw':             '✕○ EMPATE',
    'mg.velha.bub.master_win':   'Venceu o mestre! 🏆',
    'mg.velha.bub.win':          'Venceu na velha! ✕',
    'mg.velha.bub.lose':         'Quase! Próxima vez... 😔',
    'mg.velha.bub.draw':         'Empate! Bem jogado 🤝',
    'mg.velha.log':              'Jogo da Velha: {msg} +{xp}XP +{coins}🪙',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // Generic
    'mg.bub.tired':          'Too tired... 😴',
    'mg.bub.almost':         'So close... 😔',
    'mg.bub.not_tired':      "I'm not tired!",
    'mg.reward_humor':       '+{humor} 😊  +{xp} XP  +{coins} 🪙',
    'mg.reward_xp':          '+{xp} XP  +{coins} 🪙',

    // Elemental Memory
    'mg.mem.sub_pairs':      '{n} pairs',
    'mg.mem.info':           'Pairs: {matched}/{total} · Errors: {errors}',
    'mg.mem.perfect':        '🌟 PERFECT!',
    'mg.mem.complete':       '✓ COMPLETE!',
    'mg.mem.done':           '😅 COMPLETE',
    'mg.mem.bub.perfect':    'Perfect memory! 🌟',
    'mg.mem.bub.complete':   'We did it! 🃏',

    // Simon Says
    'mg.simon.round':        'Round {n}/{max}',
    'mg.simon.watch':        'Watch...',
    'mg.simon.your_turn':    'Your turn!',
    'mg.simon.correct':      '✓ Correct!',
    'mg.simon.master':       '🎵 MASTER! (completion bonus!)',
    'mg.simon.failed':       '✗ WRONG! ({hits} correct)',
    'mg.simon.bub.master':   'Memory master! 🎵',

    // Sleep
    'mg.sleep.wake_btn':     'WAKE UP',
    'mg.sleep.sleep_btn':    'SLEEP',
    'mg.sleep.bub':          'zzz... 💤',
    'mg.sleep.log':          'Sleeping...',
    'mg.sleep.log.full':     'Woke up with full energy!',
    'mg.sleep.log.rested':   'Woke up rested!',

    // Heal
    'mg.heal.bub.healthy':   "I'm fine!",
    'mg.heal.bub.no_coins':  'Not enough coins... 😢',
    'mg.heal.bub.better':    'Feeling better! 💊',
    'mg.heal.log.diseases':  '⚠️ You have {n} active disease(s)! Heal restores health but does not cure diseases — use the Dimensional Antidote (300 🪙) from the shop.',
    'mg.heal.log.no_coins':  'Need {cost} 🪙 to heal!',
    'mg.heal.log.healed':    'Healed! +40 health  (-40 🪙)',

    // Antidote
    'mg.antidote.bub.healthy':  'No diseases! 💪',
    'mg.antidote.bub.no_coins': 'Not enough coins for the antidote... 😢',
    'mg.antidote.bub.cured':    'Cured! ✨',
    'mg.antidote.log.healthy':  'Avatar is healthy — antidote not needed.',
    'mg.antidote.log.no_coins': 'You need {cost} 🪙 for the Dimensional Antidote!',
    'mg.antidote.msg.multi':    '{n} diseases cured!',
    'mg.antidote.msg.one':      'Disease cured!',
    'mg.antidote.msg.none':     'Recovered!',
    'mg.antidote.log.used':     '🧪 Dimensional Antidote used! {msg} +20 health  (-{cost} 🪙)',

    // Tic-Tac-Toe
    'mg.velha.info':             '{diff} · Your turn! ✕',
    'mg.velha.ai_turn':          'Avatar thinking... 🤔',
    'mg.velha.incredible':       '🌟 INCREDIBLE!',
    'mg.velha.win':              '✕ VICTORY!',
    'mg.velha.lose':             '○ DEFEAT',
    'mg.velha.draw':             '✕○ DRAW',
    'mg.velha.bub.master_win':   'Beat the master! 🏆',
    'mg.velha.bub.win':          'Won at tic-tac-toe! ✕',
    'mg.velha.bub.lose':         'Almost! Next time... 😔',
    'mg.velha.bub.draw':         "It's a draw! Well played 🤝",
    'mg.velha.log':              'Tic-Tac-Toe: {msg} +{xp}XP +{coins}🪙',
  }
);
