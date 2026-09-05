// ═══════════════════════════════════════════════════════════════════
// I18N — Game Tick (banho, poop, doenças, evolução, morte, level up)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // Poop
    'gt.poop.title':       'Clique para limpar',
    'gt.poop.log':         'Seu avatar fez as necessidades! 💩',
    'gt.poop.bub':         'Ops... 😳',

    // Banho
    'gt.bath.no_energy':   'Sem energia para se banhar! 😩',
    'gt.bath.bub_0':       'Que limpinho! 🛁✨',
    'gt.bath.bub_1':       'Adoro banho! 💧',
    'gt.bath.bub_2':       'Me sinto novo! ✨',
    'gt.bath.bub_3':       'Cheiro bem agora! 🌸',
    'gt.bath.log':         'Banho tomado! +{hygiene} higiene  +{humor} humor  (-15 ⚡)',

    // Auto-dormir
    'gt.autosleep.bub':    'Exausto... 😴 dormindo!',

    // Doença
    'gt.sick.log':         'Ficou doente! Use medicar!',
    'gt.disease.log':      '⚠️ {emoji} {nome} desenvolvida! Usa o Antídoto Dimensional (300 🪙).',
    'gt.disease.bub':      '{emoji} Sinto-me mal...',

    // Ovo pronto

    // Evolução de fase
    'gt.phase.label':      'FASE: {fase}',
    'gt.phase.bub':        'Evoluí para {fase}! 🌟',
    'gt.phase.log':        '✨ EVOLUÇÃO! {nome} chegou à fase {fase}!',

    // Morte
    'gt.dead.stats1':      'Nível {nivel} · {fase} · {vida} de vida',
    'gt.dead.stats2':      'Vínculo {vinculo}',
    'gt.dead.log':         '{nome} partiu para outra dimensão... 💀',

    // Level up
    'gt.levelup.log':      'Nível {nivel}! Seu avatar ficou mais forte!',
    'gt.raridade.subiu':   '✦ Seu avatar agora é {raridade}.',
    'gt.levelup.log_sem_ponto': 'Nível {nivel}!',
    // O plural de nível é NÍVEIS, não nívels: o {s} genérico que serve o
    // inglês não serve aqui, e a palavra tem de vir montada de fora.
    'gt.levelup.faltam':   'Próximo ponto de ficha em {n} {p}',
    'gt.levelup.mais_forte': 'Mais forte',
    'gt.nivel_um':         'nível',
    'gt.nivel_varios':     'níveis',
    'gt.levelup.title':    'NÍVEL UP!',
    'gt.levelup.nivel':    'NÍVEL {nivel}',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // Poop
    'gt.poop.title':       'Click to clean',
    'gt.poop.log':         'Your avatar did their business! 💩',
    'gt.poop.bub':         'Oops... 😳',

    // Bath
    'gt.bath.no_energy':   'Not enough energy to bathe! 😩',
    'gt.bath.bub_0':       'So clean! 🛁✨',
    'gt.bath.bub_1':       'Love my bath! 💧',
    'gt.bath.bub_2':       'Feeling fresh! ✨',
    'gt.bath.bub_3':       'Smelling good now! 🌸',
    'gt.bath.log':         'Bath done! +{hygiene} hygiene  +{humor} mood  (-15 ⚡)',

    // Auto-sleep
    'gt.autosleep.bub':    'Exhausted... 😴 sleeping!',

    // Disease
    'gt.sick.log':         'Got sick! Use Heal!',
    'gt.disease.log':      '⚠️ {emoji} {nome} developed! Use the Dimensional Antidote (300 🪙).',
    'gt.disease.bub':      '{emoji} Feeling sick...',

    // Egg ready

    // Phase evolution
    'gt.phase.label':      'PHASE: {fase}',
    'gt.phase.bub':        'Evolved to {fase}! 🌟',
    'gt.phase.log':        '✨ EVOLUTION! {nome} reached phase {fase}!',

    // Death
    'gt.dead.stats1':      'Level {nivel} · {fase} · {vida} lived',
    'gt.dead.stats2':      'Bond {vinculo}',
    'gt.dead.log':         '{nome} departed to another dimension... 💀',

    // Level up
    'gt.levelup.log':      'Level {nivel}! Your avatar got stronger!',
    'gt.raridade.subiu':   '✦ Your avatar is now {raridade}.',
    'gt.levelup.log_sem_ponto': 'Level {nivel}!',
    'gt.levelup.faltam':   'Next stat point in {n} {p}',
    'gt.levelup.mais_forte': 'Stronger',
    'gt.nivel_um':         'level',
    'gt.nivel_varios':     'levels',
    'gt.levelup.title':    'LEVEL UP!',
    'gt.levelup.nivel':    'LEVEL {nivel}',
  }
);
