// ═══════════════════════════════════════════════════════════════════
// I18N — Batalha Naval
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    'bn.title':          '🚢 BATALHA NAVAL',
    'bn.sub':            'Duelo estratégico · Fila',
    'bn.enter_queue':    '🚢 ENTRAR NA FILA',
    'bn.loading':        'Carregando...',

    // Colocação
    'bn.place_ships':    '🚢 POSICIONAR NAVIOS',
    'bn.all_placed':     '✅ Todos os navios posicionados!',
    'bn.placing':        'A colocar: <b>{nome}</b> ({tam} casas)',
    'bn.placed':         '✅ Colocado',
    'bn.click_board':    'Clica no tabuleiro',
    'bn.my_board_col':   'MEU TABULEIRO — clica para colocar',
    'bn.undo':           '↩ DESFAZER',
    'bn.confirm_pos':    '✅ CONFIRMAR POSIÇÕES',
    'bn.waiting_op':     'Aguardando oponente...',
    'bn.waiting_place':  'Aguardando oponente posicionar navios...',

    // Batalha
    'bn.your_turn':      '⚡ SUA VEZ',
    'bn.wait':           '⏳ AGUARDANDO',
    'bn.click_fire':     '🎯 CLICA PARA ATIRAR',
    'bn.op_board':       '🌊 OPONENTE',
    'bn.op_board_lbl':   '🌊 TABULEIRO DO OPONENTE',
    'bn.my_board':       '🛡️ MEU TABULEIRO',
    'bn.me':             'EU',
    'bn.opponent':       'Oponente',
    'bn.abandon_btn':    'ABANDONAR',
    'bn.hit_label':      'Acerto!',
    'bn.sunk_label':     'AFUNDADO!',
    'bn.miss_label':     'Água',

    // Resultado
    'bn.play_again':     '🚢 JOGAR DE NOVO',

    // Bubbles
    'bn.bub.unavailable':  'Batalha Naval indisponível',
    'bn.bub.sent':         'Desafio enviado! 🚢',
    'bn.bub.challenged':   'Desafio de Batalha Naval! 🚢',
    'bn.bub.reconnected':  'Reconectado! 🚢',
    'bn.bub.timeout':      'Tempo esgotado! ⏳',
    'bn.bub.invalid_pos':  'Posição inválida! 🚫',
    'bn.bub.place_all':    'Coloca todos os navios primeiro!',
    'bn.bub.hit':          'Acerto! 💥 Joga de novo!',
    'bn.bub.sunk':         '{nome} afundado! 🔥',
    'bn.bub.already_hit':  'Já atacada! ⚡',

    // Logs
    'bn.log.joined':       'Entrou na fila da Batalha Naval! 🚢',
    'bn.log.left':         'Saiu da fila da Batalha Naval.',
    'bn.log.sent':         'Desafio de Batalha Naval enviado!',
    'bn.log.cancelled':    'Partida cancelada.',
    'bn.log.timeout':      'Tempo esgotado! Oponente ganhou. ⏳',
    'bn.log.hit':          'Batalha Naval: 💥 Acerto em {coord}',
    'bn.log.hit_sunk':     'Batalha Naval: 💥 Acerto em {coord} — {nome} afundado!',
    'bn.log.miss':         'Batalha Naval: 🌊 Água em {coord}',
    'bn.log.abandoned':    'Abandonaste a partida. 🏳️',
    'bn.log.result':       'Batalha Naval: {titulo} · {meusAc} vs {opAc} acertos',
    'bn.log.recon_match':  'Reconectado à partida de Batalha Naval!',
    'bn.log.recv_from':    'Desafio de Batalha Naval recebido de {wallet}...',

    // How-to (multiline via {ships} e {size})
    'bn.how_to_text':      '🚢 Coloca {ships} navios no teu tabuleiro {size}×{size}<br>🎯 Turnos alternados — escolhe uma coordenada do adversário<br>💥 Acerto → joga de novo · 🌊 Água → passa a vez<br>🏆 Quem afundar todos os navios do oponente vence',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    'bn.title':          '🚢 NAVAL BATTLE',
    'bn.sub':            'Strategic duel · Queue',
    'bn.enter_queue':    '🚢 JOIN QUEUE',
    'bn.loading':        'Loading...',

    // Placement
    'bn.place_ships':    '🚢 PLACE SHIPS',
    'bn.all_placed':     '✅ All ships placed!',
    'bn.placing':        'Placing: <b>{nome}</b> ({tam} cells)',
    'bn.placed':         '✅ Placed',
    'bn.click_board':    'Click on the board',
    'bn.my_board_col':   'MY BOARD — click to place',
    'bn.undo':           '↩ UNDO',
    'bn.confirm_pos':    '✅ CONFIRM POSITIONS',
    'bn.waiting_op':     'Waiting for opponent...',
    'bn.waiting_place':  'Waiting for opponent to place ships...',

    // Battle
    'bn.your_turn':      '⚡ YOUR TURN',
    'bn.wait':           '⏳ WAITING',
    'bn.click_fire':     '🎯 CLICK TO FIRE',
    'bn.op_board':       '🌊 OPPONENT',
    'bn.op_board_lbl':   "🌊 OPPONENT'S BOARD",
    'bn.my_board':       '🛡️ MY BOARD',
    'bn.me':             'ME',
    'bn.opponent':       'Opponent',
    'bn.abandon_btn':    'ABANDON',
    'bn.hit_label':      'Hit!',
    'bn.sunk_label':     'SUNK!',
    'bn.miss_label':     'Miss',

    // Result
    'bn.play_again':     '🚢 PLAY AGAIN',

    // Bubbles
    'bn.bub.unavailable':  'Naval Battle unavailable',
    'bn.bub.sent':         'Challenge sent! 🚢',
    'bn.bub.challenged':   'Naval Battle challenge! 🚢',
    'bn.bub.reconnected':  'Reconnected! 🚢',
    'bn.bub.timeout':      'Time\'s up! ⏳',
    'bn.bub.invalid_pos':  'Invalid position! 🚫',
    'bn.bub.place_all':    'Place all ships first!',
    'bn.bub.hit':          'Hit! 💥 Play again!',
    'bn.bub.sunk':         '{nome} sunk! 🔥',
    'bn.bub.already_hit':  'Already targeted! ⚡',

    // Logs
    'bn.log.joined':       'Joined the Naval Battle queue! 🚢',
    'bn.log.left':         'Left the Naval Battle queue.',
    'bn.log.sent':         'Naval Battle challenge sent!',
    'bn.log.cancelled':    'Match cancelled.',
    'bn.log.timeout':      "Time's up! Opponent wins. ⏳",
    'bn.log.hit':          'Naval Battle: 💥 Hit at {coord}',
    'bn.log.hit_sunk':     'Naval Battle: 💥 Hit at {coord} — {nome} sunk!',
    'bn.log.miss':         'Naval Battle: 🌊 Miss at {coord}',
    'bn.log.abandoned':    'You abandoned the match. 🏳️',
    'bn.log.result':       'Naval Battle: {titulo} · {meusAc} vs {opAc} hits',
    'bn.log.recon_match':  'Reconnected to Naval Battle match!',
    'bn.log.recv_from':    'Naval Battle challenge received from {wallet}...',

    'bn.how_to_text':      '🚢 Place {ships} ships on your {size}×{size} board<br>🎯 Alternate turns — pick a coordinate on the opponent\'s board<br>💥 Hit → play again · 🌊 Miss → opponent\'s turn<br>🏆 Sink all opponent\'s ships to win',
  }
);
