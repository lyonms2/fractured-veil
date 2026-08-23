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
  'hab.Terra.2.nome':    'Colapso Tectónico',
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
  'hab.Vento.3.efeito':  'Reduz o acerto de quem atacar em 15% por 2 turnos.',

  // ── ⚡ ELETRICIDADE ────────────────────────────────────────────────
  'hab.Eletricidade.0.nome':   'Choque Direto',
  'hab.Eletricidade.0.efeito': 'Descarga imediata, age sempre primeiro. Devolve energia.',
  'hab.Eletricidade.1.nome':   'Descarga em Cadeia',
  'hab.Eletricidade.1.efeito': 'Dano dobrado se o alvo já estiver com escudo.',
  'hab.Eletricidade.2.nome':   'Julgamento do Trovão',
  'hab.Eletricidade.2.efeito': '40% de chance de crítico.',
  'hab.Eletricidade.3.nome':   'Campo Estático',
  'hab.Eletricidade.3.efeito': 'Escudo que devolve 30 de energia.',

  // ── 🌑 SOMBRA ─────────────────────────────────────────────────────
  'hab.Sombra.0.nome':   'Toque Umbral',
  'hab.Sombra.0.efeito': 'Golpe silencioso pelas costas. Sempre disponível e devolve energia.',
  'hab.Sombra.1.nome':   'Presságio Sombrio',
  'hab.Sombra.1.efeito': 'Reduz a FOR e a INT do alvo por 3 turnos.',
  'hab.Sombra.2.nome':   'Devorar Essência',
  'hab.Sombra.2.efeito': 'Converte metade do dano causado em HP.',
  'hab.Sombra.3.nome':   'Manto de Penumbra',
  'hab.Sombra.3.efeito': 'O próximo ataque é crítico garantido.',

  // ── ✨ LUZ ────────────────────────────────────────────────────────
  'hab.Luz.0.nome':      'Lâmina Radiante',
  'hab.Luz.0.efeito':    'Corte luminoso limpo. Sempre disponível e devolve energia.',
  'hab.Luz.1.nome':      'Raio Purificador',
  'hab.Luz.1.efeito':    'Remove buffs e escudos do alvo.',
  'hab.Luz.2.nome':      'Aurora Sagrada',
  'hab.Luz.2.efeito':    'Dano alto, e cura metade do valor causado.',
  'hab.Luz.3.nome':      'Égide Solar',
  'hab.Luz.3.efeito':    'Escudo com regeneração por turno.',
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
  'hab.Vento.3.efeito':  'Lowers the attacker accuracy by 15% for 2 turns.',

  'hab.Eletricidade.0.nome':   'Direct Shock',
  'hab.Eletricidade.0.efeito': 'Instant discharge, always acts first. Returns energy.',
  'hab.Eletricidade.1.nome':   'Chain Discharge',
  'hab.Eletricidade.1.efeito': 'Double damage if the target already has a shield.',
  'hab.Eletricidade.2.nome':   'Thunder Judgement',
  'hab.Eletricidade.2.efeito': '40% chance to crit.',
  'hab.Eletricidade.3.nome':   'Static Field',
  'hab.Eletricidade.3.efeito': 'Shield that returns 30 energy.',

  'hab.Sombra.0.nome':   'Umbral Touch',
  'hab.Sombra.0.efeito': 'Silent strike from behind. Always available and returns energy.',
  'hab.Sombra.1.nome':   'Dark Omen',
  'hab.Sombra.1.efeito': 'Lowers the target FOR and INT for 3 turns.',
  'hab.Sombra.2.nome':   'Devour Essence',
  'hab.Sombra.2.efeito': 'Converts half the damage dealt into HP.',
  'hab.Sombra.3.nome':   'Penumbra Mantle',
  'hab.Sombra.3.efeito': 'The next attack is a guaranteed crit.',

  'hab.Luz.0.nome':      'Radiant Blade',
  'hab.Luz.0.efeito':    'Clean luminous cut. Always available and returns energy.',
  'hab.Luz.1.nome':      'Purifying Ray',
  'hab.Luz.1.efeito':    'Removes buffs and shields from the target.',
  'hab.Luz.2.nome':      'Sacred Aurora',
  'hab.Luz.2.efeito':    'High damage, and heals half the value dealt.',
  'hab.Luz.3.nome':      'Solar Aegis',
  'hab.Luz.3.efeito':    'Shield with regeneration each turn.',
});
