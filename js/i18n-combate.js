// ═══════════════════════════════════════════════════════════════════
// I18N — Habilidades de combate
//
// As 28 habilidades: 7 elementos × 4 slots. A chave é
// hab.<elemento>.<índice do slot>.nome / .efeito — montada por
// habilidadesDoAvatar() em js/combate-ficha.js.
//
// A ordem dos slots é sempre a mesma: 0 ataque comum, 1 habilidade,
// 2 habilidade forte, 3 defesa/suporte.
// ═══════════════════════════════════════════════════════════════════

window.registerStrings({
  // ── Rótulos dos slots ─────────────────────────────────────────────
  'hab.slot.comum':      'Ataque comum',
  'hab.slot.skill':      'Habilidade',
  'hab.slot.forte':      'Habilidade forte',
  'hab.slot.suporte':    'Defesa / suporte',
  'hab.custo.livre':     '0 EN · +{gera}',
  'hab.custo.en':        '{custo} EN',
  'hab.val.dano':        '{v} dano',
  'hab.val.cura':        '{v} cura',
  'hab.val.escudo':      '{v} escudo',
  'hab.titulo':          '✦ HABILIDADES',

  // ── 🔥 FOGO ───────────────────────────────────────────────────────
  'hab.Fogo.0.nome':     'Garra Ígnea',
  'hab.Fogo.0.efeito':   'Golpe rápido em brasa. Sempre disponível e devolve energia.',
  'hab.Fogo.1.nome':     'Brasa Persistente',
  'hab.Fogo.1.efeito':   'Queimadura por 3 turnos, que ignora escudo.',
  'hab.Fogo.2.nome':     'Explosão Solar',
  'hab.Fogo.2.efeito':   'Ignora 30% da RES do alvo.',
  'hab.Fogo.3.nome':     'Manto de Cinzas',
  'hab.Fogo.3.efeito':   'Escudo que devolve 45% do dano a quem atacar.',

  // ── 💧 ÁGUA ───────────────────────────────────────────────────────
  'hab.Água.0.nome':     'Jato Cortante',
  'hab.Água.0.efeito':   'Lâmina de água pressurizada. Sempre disponível e devolve energia.',
  'hab.Água.1.nome':     'Maré Curativa',
  'hab.Água.1.efeito':   'Recupera HP em vez de causar dano.',
  'hab.Água.2.nome':     'Tsunami Dimensional',
  'hab.Água.2.efeito':   'Dano alto e drena energia do alvo.',
  'hab.Água.3.nome':     'Casulo de Marés',
  'hab.Água.3.efeito':   'Absorve dano e regenera energia.',

  // ── 🌿 TERRA ──────────────────────────────────────────────────────
  'hab.Terra.0.nome':    'Punho de Pedra',
  'hab.Terra.0.efeito':  'Impacto pesado e lento. Sempre disponível e devolve energia.',
  'hab.Terra.1.nome':    'Estilhaços de Rocha',
  'hab.Terra.1.efeito':  'Reduz o acerto do alvo em 15% por 2 turnos.',
  'hab.Terra.2.nome':    'Colapso Tectônico',
  'hab.Terra.2.efeito':  'Dano massivo, com 50% de chance de atordoar 1 turno.',
  'hab.Terra.3.nome':    'Muralha Primordial',
  'hab.Terra.3.efeito':  'Escudo 30% maior que o normal, dura 2 turnos.',

  // ── 🌪️ VENTO ──────────────────────────────────────────────────────
  'hab.Vento.0.nome':    'Corte de Vento',
  'hab.Vento.0.efeito':  'Golpe veloz. Sempre disponível e devolve energia.',
  'hab.Vento.1.nome':    'Rajada Tripla',
  'hab.Vento.1.efeito':  'Três golpes de 125% no total, e cada um pode criticar.',
  'hab.Vento.2.nome':    'Ciclone Dimensional',
  'hab.Vento.2.efeito':  'Dano crescente a cada golpe acertado antes.',
  'hab.Vento.3.nome':    'Véu de Correntes',
  'hab.Vento.3.efeito':  'Escudo que também reduz o acerto de quem atacar, por 2 turnos.',
}, {
  // ── ENGLISH ───────────────────────────────────────────────────────
  'hab.slot.comum':      'Basic attack',
  'hab.slot.skill':      'Skill',
  'hab.slot.forte':      'Heavy skill',
  'hab.slot.suporte':    'Defense / support',
  'hab.custo.livre':     '0 EN · +{gera}',
  'hab.custo.en':        '{custo} EN',
  'hab.val.dano':        '{v} damage',
  'hab.val.cura':        '{v} healing',
  'hab.val.escudo':      '{v} shield',
  'hab.titulo':          '✦ ABILITIES',

  'hab.Fogo.0.nome':     'Ember Claw',
  'hab.Fogo.0.efeito':   'Quick burning strike. Always available and returns energy.',
  'hab.Fogo.1.nome':     'Lingering Ember',
  'hab.Fogo.1.efeito':   'Burn for 3 turns, ignoring shields.',
  'hab.Fogo.2.nome':     'Solar Burst',
  'hab.Fogo.2.efeito':   'Ignores 30% of the target RES.',
  'hab.Fogo.3.nome':     'Ash Mantle',
  'hab.Fogo.3.efeito':   'Shield that reflects 45% of the damage back at the attacker.',

  'hab.Água.0.nome':     'Cutting Jet',
  'hab.Água.0.efeito':   'Pressurised water blade. Always available and returns energy.',
  'hab.Água.1.nome':     'Healing Tide',
  'hab.Água.1.efeito':   'Restores HP instead of dealing damage.',
  'hab.Água.2.nome':     'Dimensional Tsunami',
  'hab.Água.2.efeito':   'High damage and drains the target energy.',
  'hab.Água.3.nome':     'Tidal Cocoon',
  'hab.Água.3.efeito':   'Absorbs damage and regenerates energy.',

  'hab.Terra.0.nome':    'Stone Fist',
  'hab.Terra.0.efeito':  'Heavy, slow impact. Always available and returns energy.',
  'hab.Terra.1.nome':    'Rock Shards',
  'hab.Terra.1.efeito':  'Lowers the target accuracy by 15% for 2 turns.',
  'hab.Terra.2.nome':    'Tectonic Collapse',
  'hab.Terra.2.efeito':  'Massive damage, with a 50% chance to stun for 1 turn.',
  'hab.Terra.3.nome':    'Primordial Wall',
  'hab.Terra.3.efeito':  'Shield 30% larger than normal, lasts 2 turns.',

  'hab.Vento.0.nome':    'Wind Slash',
  'hab.Vento.0.efeito':  'Swift strike. Always available and returns energy.',
  'hab.Vento.1.nome':    'Triple Gust',
  'hab.Vento.1.efeito':  'Three hits totalling 125%, and each one can crit.',
  'hab.Vento.2.nome':    'Dimensional Cyclone',
  'hab.Vento.2.efeito':  'Damage grows with every hit that landed before it.',
  'hab.Vento.3.nome':    'Veil of Currents',
  'hab.Vento.3.efeito':  'Shield that also lowers the attacker accuracy, for 2 turns.',

});
