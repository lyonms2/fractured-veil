// ═══════════════════════════════════════════════════════════════════
// TEXTOS DA ARENA — motor Fabula Ultima
// Português do Brasil e inglês.
//
// Chave própria (`af.`) e não a do `pve.`: as duas arenas convivem
// enquanto a antiga ainda corre o jogo, e uma chave partilhada entre
// motores diferentes acaba a dizer a coisa errada num deles.
// ═══════════════════════════════════════════════════════════════════

window.registerStrings({
  // ── o palco ──
  'af.titulo':        'BATALHA',
  'af.ronda':         'Rodada {n}',
  'af.vez':           'Sua vez',
  'af.vez_dele':      'Vez do inimigo',
  'af.menu.abrir':    'O que fazer neste turno',
  'af.ja_agiu':       'já agiu nesta rodada',
  'af.ficha.abrir':   'Ver a ficha de {nome}',

  // ── os cinco lugares ──
  'af.lugar.comum':       'Golpe Comum',
  'af.lugar.forte':       'Magia Forte',
  'af.lugar.muito_forte': 'Magia Muito Forte',
  'af.lugar.defesa':      'Defesa',
  'af.lugar.suporte':     'Suporte',
  'af.orbe.ficha':    'Ficha',
  'af.orbe.mover':    'Trocar de lugar',
  'af.orbe.voltar':   'Voltar',
  'af.orbe.todos':    'Todos',
  'af.pm':            '{n} PM',
  'af.pm.sem':        'sem PM',
  'af.gratis':        'grátis',

  // ── escolher ──
  'af.alvo.inimigo':  'Em quem cai?',
  'af.alvo.aliado':   'Quem recebe?',
  'af.mover.com':     'Trocar com quem?',
  'af.alvo.frente':   'o da frente cobre os outros',

  // ── o lance ──
  'af.lance.dados':   '{a}·{b}',
  'af.lance.acerta':  '{r} contra {dl}',
  'af.lance.critico': 'CRÍTICO',
  'af.lance.pifao':   'PIFÃO',
  'af.lance.falhou':  'não acertou',
  'af.lance.dano':    '−{n} de vida',
  'af.lance.nada':    'sem dano',
  'af.lance.cura':    '+{n} de vida',
  'af.lance.pm':      '−{n} PM',
  'af.lance.pmGanho': '+{n} PM',
  'af.lance.estado':  'ficou {e}',
  'af.lance.caiu':    '{nome} caiu',
  'af.lance.salvou':  'a Misericórdia segurou-o num ponto de vida',
  'af.lance.dreno':   'bebeu {n} de vida',
  'af.lance.derrubou':'foi derrubado do ar',
  'af.lance.guardar': '{nome} pôs-se em guarda',
  'af.lance.mover':   '{nome} trocou de lugar com {com}',
  'af.lance.cena':    '{nome} lançou {magia}',
  'af.lance.suspiro': 'o Último Suspiro de {nome}',
  'af.lance.devasta': 'Devastação em {nome}',
  'af.lance.ronda':   '— rodada {n} —',
  'af.lance.comeca':  '{nome} começa',

  // ── as afinidades, ditas em palavras ──
  'af.af.RS':         'resistiu',
  'af.af.VU':         'vulnerável!',
  'af.af.IM':         'imune',
  'af.af.AB':         'absorveu',

  // ── o fim ──
  'af.fim.ganhou':    'A colónia resistiu.',
  'af.fim.perdeu':    'A Fratura levou a melhor.',
  'af.fim.empate':    'Não sobrou ninguém.',
  'af.fim.sair':      'Voltar',

  // ── a ficha ──
  'af.f.dados':       'Dados',
  'af.f.vida':        'Vida',
  'af.f.magia':       'Magia',
  'af.f.crise':       'Crise',
  'af.f.defesa':      'Defesa',
  'af.f.defmag':      'Def. Mágica',
  'af.f.tipo':        'Tipo de dano',
  'af.f.costura':     'Costura',
  'af.f.vantagem':    'Vantagem',
  'af.f.lugares':     'O que sabe fazer',
  'af.f.sem_costura': 'fechada',

  // ── os seis estados ──
  'af.est.atordoado':  'atordoado',
  'af.est.enfurecido': 'enfurecido',
  'af.est.envenenado': 'envenenado',
  'af.est.abalado':    'abalado',
  'af.est.lento':      'lento',
  'af.est.fraco':      'fraco',

  // ── os nove tipos de dano ──
  'af.tipo.fisico':  'físico',
  'af.tipo.fogo':    'fogo',
  'af.tipo.terra':   'terra',
  'af.tipo.raio':    'raio',
  'af.tipo.ar':      'ar',
  'af.tipo.gelo':    'gelo',
  'af.tipo.veneno':  'veneno',
  'af.tipo.luz':     'luz',
  'af.tipo.treva':   'treva',

  /* ── OS NOMES DAS MAGIAS ──
     Só as que têm nome fixo. A Barragem e o Concentrado mudam de nome com
     o tipo do avatar (Ignis, Glacies, Beijo do Breu…) e esses vivem no
     js/magias-fu.js, ao lado dos números deles — são oito de cada e
     estarem aqui também era a mesma lista escrita duas vezes. */
  'af.m.golpe':          'Golpe Comum',
  'af.m.sopro':          'Sopro',
  'af.m.sopro_maldito':  'Sopro Maldito',
  'af.m.devastacao':     'Devastação',
  'af.m.concha':         'Concha',
  'af.m.barreira':       'Barreira',
  'af.m.misericordia':   'Misericórdia',
  'af.m.lamber':         'Lamber Feridas',
  'af.m.curar':          'Curar',
  'af.m.despertar':      'Despertar',
}, {
  'af.titulo':        'BATTLE',
  'af.ronda':         'Round {n}',
  'af.vez':           'Your turn',
  'af.vez_dele':      'Enemy turn',
  'af.menu.abrir':    'What to do this turn',
  'af.ja_agiu':       'already acted this round',
  'af.ficha.abrir':   "See {nome}'s sheet",

  'af.lugar.comum':       'Basic Strike',
  'af.lugar.forte':       'Strong Spell',
  'af.lugar.muito_forte': 'Very Strong Spell',
  'af.lugar.defesa':      'Defence',
  'af.lugar.suporte':     'Support',
  'af.orbe.ficha':    'Sheet',
  'af.orbe.mover':    'Swap places',
  'af.orbe.voltar':   'Back',
  'af.orbe.todos':    'All',
  'af.pm':            '{n} MP',
  'af.pm.sem':        'no MP',
  'af.gratis':        'free',

  'af.alvo.inimigo':  'Who takes it?',
  'af.alvo.aliado':   'Who receives it?',
  'af.mover.com':     'Swap with whom?',
  'af.alvo.frente':   'the one in front covers the others',

  'af.lance.dados':   '{a}·{b}',
  'af.lance.acerta':  '{r} against {dl}',
  'af.lance.critico': 'CRITICAL',
  'af.lance.pifao':   'FUMBLE',
  'af.lance.falhou':  'missed',
  'af.lance.dano':    '−{n} HP',
  'af.lance.nada':    'no damage',
  'af.lance.cura':    '+{n} HP',
  'af.lance.pm':      '−{n} MP',
  'af.lance.pmGanho': '+{n} MP',
  'af.lance.estado':  'is now {e}',
  'af.lance.caiu':    '{nome} went down',
  'af.lance.salvou':  'Mercy held them at one hit point',
  'af.lance.dreno':   'drank {n} HP',
  'af.lance.derrubou':'was forced to land',
  'af.lance.guardar': '{nome} took guard',
  'af.lance.mover':   '{nome} swapped places with {com}',
  'af.lance.cena':    '{nome} cast {magia}',
  'af.lance.suspiro': "{nome}'s Final Act",
  'af.lance.devasta': 'Devastation on {nome}',
  'af.lance.ronda':   '— round {n} —',
  'af.lance.comeca':  '{nome} goes first',

  'af.af.RS':         'resisted',
  'af.af.VU':         'vulnerable!',
  'af.af.IM':         'immune',
  'af.af.AB':         'absorbed',

  'af.fim.ganhou':    'The colony held.',
  'af.fim.perdeu':    'The Rift won this one.',
  'af.fim.empate':    'No one was left standing.',
  'af.fim.sair':      'Back',

  'af.f.dados':       'Dice',
  'af.f.vida':        'Hit Points',
  'af.f.magia':       'Mind Points',
  'af.f.crise':       'Crisis',
  'af.f.defesa':      'Defence',
  'af.f.defmag':      'Magic Defence',
  'af.f.tipo':        'Damage type',
  'af.f.costura':     'Seam',
  'af.f.vantagem':    'Advantage',
  'af.f.lugares':     'What it can do',
  'af.f.sem_costura': 'closed',

  'af.est.atordoado':  'dazed',
  'af.est.enfurecido': 'enraged',
  'af.est.envenenado': 'poisoned',
  'af.est.abalado':    'shaken',
  'af.est.lento':      'slow',
  'af.est.fraco':      'weak',

  'af.tipo.fisico':  'physical',
  'af.tipo.fogo':    'fire',
  'af.tipo.terra':   'earth',
  'af.tipo.raio':    'bolt',
  'af.tipo.ar':      'air',
  'af.tipo.gelo':    'ice',
  'af.tipo.veneno':  'poison',
  'af.tipo.luz':     'light',
  'af.tipo.treva':   'dark',

  'af.m.golpe':          'Basic Strike',
  'af.m.sopro':          'Breath',
  'af.m.sopro_maldito':  'Cursed Breath',
  'af.m.devastacao':     'Devastation',
  'af.m.concha':         'Shell',
  'af.m.barreira':       'Barrier',
  'af.m.misericordia':   'Mercy',
  'af.m.lamber':         'Lick Wounds',
  'af.m.curar':          'Heal',
  'af.m.despertar':      'Awaken',
});
