// ═══════════════════════════════════════════════════════════════════
// I18N — Sessão (main.js + wallet.js + summon.js)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // main.js
    'main.bub.inativo':      'Vai sair? Ativa o repouso! 🌙',
    'main.log.inativo':      'Inativo há 5min — segure 💤 DORMIR para ativar o modo repouso.',
    'main.log.slot_changed': 'Slot activo alterado para Slot {n} via Marketplace.',
    'main.log.inbox_eggs':   '🥚 Novos ovos recebidos!',
    'main.bub.inbox_eggs':   'Ovos chegaram! 🥚',
    'main.zoom.info':        '{elem} · {rar} · {fase} · Nível {nivel}',

    // wallet.js
    'wallet.log.disconnected': 'Sessão encerrada. Conecte a carteira para continuar.',
    'wallet.log.address':      'Carteira: {addr}',
    'wallet.log.no_metamask':  'MetaMask não encontrada. Instale em metamask.io',
    'wallet.log.connected':    'Carteira conectada: {addr}',
    'wallet.log.restored':     'Estado restaurado da nuvem! ☁️',
    'wallet.log.wake_offline': 'Acordou com energia plena enquanto estava offline! ☀️',
    'wallet.log.mode_woke':    '☀️ acordou enquanto ausente',
    'wallet.log.mode_repouso': '💤 modo repouso activo',
    'wallet.log.mode_active':  'stats atualizados',
    'wallet.log.offline':      'Ausente por {h}h {m}min — {modo}.',
    'wallet.log.died_offline': '{nome} não sobreviveu à sua ausência...',
    'wallet.log.dead_time':    'Viveu {time} · Vínculo: {vinculo}',
    'wallet.log.repouso':      'Modo repouso activo. 💤',
    'wallet.log.no_save':      'Nenhum save encontrado. Comece uma nova aventura!',
    'wallet.label.repouso':    'REPOUSO',
    'wallet.err.blocked':      'Desbloqueie o MetaMask primeiro.',
    'wallet.err.rejected':     'Conexão cancelada.',
    'wallet.err.failed':       'Erro ao conectar. Tente novamente.',
    'wallet.btn.connect':      'CONECTAR METAMASK',
    'wallet.btn.connecting':   'CONECTANDO...',

    // summon.js
    'summon.log.no_login':   'Faz login primeiro!',
    'summon.bub.no_login':   'Precisas fazer login! 🔑',
    'summon.log.legendary':  '🌟 INVOCAÇÃO LENDÁRIA! Uma entidade primordial respondeu ao chamado!',
    'summon.log.rare':       '✨ Invocação Rara! Um guardião experiente surge!',
    'summon.log.common':     'Uma entidade dimensional foi invocada!',
    'summon.log.invoked':    '{nome} foi invocado!',
    'summon.bub.new_slot':   'Novo avatar no Slot {n}! 🐣',
    'summon.log.born_slot':  '{nome} nasceu no Slot {n}! Activa-o no Marketplace.',
    'summon.bub.hello':      'Olá! 🐣',
    'summon.log.born':       '{nome} nasceu! Cuide bem dele.',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // main.js
    'main.bub.inativo':      'Going away? Activate rest mode! 🌙',
    'main.log.inativo':      'Inactive for 5min — hold 💤 SLEEP to activate rest mode.',
    'main.log.slot_changed': 'Active slot changed to Slot {n} via Marketplace.',
    'main.log.inbox_eggs':   '🥚 New eggs received!',
    'main.bub.inbox_eggs':   'Eggs arrived! 🥚',
    'main.zoom.info':        '{elem} · {rar} · {fase} · Level {nivel}',

    // wallet.js
    'wallet.log.disconnected': 'Session ended. Connect wallet to continue.',
    'wallet.log.address':      'Wallet: {addr}',
    'wallet.log.no_metamask':  'MetaMask not found. Install at metamask.io',
    'wallet.log.connected':    'Wallet connected: {addr}',
    'wallet.log.restored':     'State restored from cloud! ☁️',
    'wallet.log.wake_offline': 'Woke up with full energy while offline! ☀️',
    'wallet.log.mode_woke':    '☀️ woke up while away',
    'wallet.log.mode_repouso': '💤 rest mode active',
    'wallet.log.mode_active':  'stats updated',
    'wallet.log.offline':      'Away for {h}h {m}min — {modo}.',
    'wallet.log.died_offline': '{nome} did not survive your absence...',
    'wallet.log.dead_time':    'Lived {time} · Bond: {vinculo}',
    'wallet.log.repouso':      'Rest mode active. 💤',
    'wallet.log.no_save':      'No save found. Start a new adventure!',
    'wallet.label.repouso':    'REST',
    'wallet.err.blocked':      'Unlock MetaMask first.',
    'wallet.err.rejected':     'Connection cancelled.',
    'wallet.err.failed':       'Error connecting. Please try again.',
    'wallet.btn.connect':      'CONNECT METAMASK',
    'wallet.btn.connecting':   'CONNECTING...',

    // summon.js
    'summon.log.no_login':   'Log in first!',
    'summon.bub.no_login':   'You need to log in! 🔑',
    'summon.log.legendary':  '🌟 LEGENDARY SUMMON! A primordial entity answered the call!',
    'summon.log.rare':       '✨ Rare Summon! An experienced guardian emerges!',
    'summon.log.common':     'A dimensional entity has been summoned!',
    'summon.log.invoked':    '{nome} was summoned!',
    'summon.bub.new_slot':   'New avatar in Slot {n}! 🐣',
    'summon.log.born_slot':  '{nome} was born in Slot {n}! Activate it in Marketplace.',
    'summon.bub.hello':      'Hello! 🐣',
    'summon.log.born':       '{nome} was born! Take good care of them.',
  }
);
