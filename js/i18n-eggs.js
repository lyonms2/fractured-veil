// ═══════════════════════════════════════════════════════════════════
// I18N — Sistema de Ovos
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // Bubbles
    'egg.bub.hatch_first':  'Choca o ovo primeiro! 🥚',
    'egg.bub.not_grown':    'Ainda não cresci o suficiente... 🥚',
    'egg.bub.cooldown':     'Preciso descansar... (~{h}h)',
    'egg.bub.no_coins':     'Sem moedas para botar ovo... 😢',
    'egg.bub.inv_full':     'Inventário cheio! (10 ovos máx) 🥚',
    'egg.bub.connect':      'Conecta a conta primeiro!',
    'egg.bub.laying':       'A botar ovo... 🥚',
    'egg.bub.laid_multi':   'Botei {n} ovos! 🥚',
    'egg.bub.laid_leg':     'Botei um ovo Lendário! 🌟',
    'egg.bub.laid_raro':    'Botei um ovo Raro! 💙',
    'egg.bub.laid_common':  'Botei um ovo Comum! 🥚',
    'egg.bub.no_slots':     'Sem slots livres! 😢',
    'egg.bub.sell_error':   'Erro ao vender ovo 😢',

    // Logs
    'egg.log.hatch_first':       'Termina a chocagem antes de ir ao Marketplace.',
    'egg.log.no_coins':          'Precisa de 50 🪙 para botar um ovo!',
    'egg.log.inv_full':          'Inventário cheio — descarta ou choca um ovo primeiro.',
    'egg.log.connect':           'Conecta a conta primeiro.',
    'egg.log.laid':              '🥚 Botou {word}! Verifique o inventário.',
    'egg.log.rotten_discarded':  'Ovo apodrecido descartado.',
    'egg.log.pool_unavail':      '⚠️ Pool indisponível para queimar ovo {rar}.',
    'egg.log.burned_common':     '🔥 Ovo Comum queimado! +{moedas} 🪙',
    'egg.log.burned_rare':       '🔥 Ovo {rar} queimado! +{gems} 💎{bonus}',
    'egg.log.not_found':         'Ovo não encontrado localmente.',
    'egg.log.common_no_pool':    'Ovos Comuns não são aceites pela pool.',
    'egg.log.sold':              '💎 Ovo {rar} vendido à pool por {preco} 💎!',
    'egg.log.sell_error':        'Erro ao vender à pool.',
    'egg.log.rotten_hatch':      'Este ovo apodreceu — não pode mais ser chocado.',
    'egg.log.no_slots':          'Sem slots livres. Liberta um slot no Marketplace.',
    'egg.log.no_gems':           'Cristais insuficientes para chocar (precisas de {fee} 💎).',
    'egg.log.cancelled':         'Chocagem cancelada. Ovo devolvido ao inventário.',
    'egg.log.ready':             '🥚 Ovo {rar} de {elem} pronto para chocar!',

    // Hatch confirm modal (HTML)
    'egg.hatch.slots_full':  'Todos os slots estão ocupados.<br>Liberta um slot no Marketplace antes de chocar.',
    'egg.hatch.multi_slot':  'O novo avatar nascerá no <b style="color:#7ab87a">Slot {slot}</b>.<br>O teu avatar activo <b style="color:#e8a030">{nome}</b> continua no Slot {activeSlot}.<br><span style="font-size:7px;color:var(--muted);">Activa o novo avatar no Marketplace → Meus Avatares.</span>',
    'egg.hatch.same_slot':   'O ovo nascerá no Slot {slot}.<br>Clica 5× para fazer nascer o teu novo avatar.',
    'egg.hatch.need_gems':   '<br><br><span style="color:#f87171;font-size:8px;">⚠️ Precisas de <b>{fee} 💎</b> para chocar.<br>Saldo actual: {saldo} 💎</span>',
    'egg.hatch.fee':         '<br><br><span style="color:#a78bfa;font-size:8px;">Taxa de choco: <b>{fee} 💎</b></span>',

    // Egg screen
    'egg.hint.hatching':     'A chocar...',

    // Inventário
    'egg.inv.count':         '{n} / {max} ovo{s}',
    'egg.inv.empty':         'Nenhum ovo no inventário',
    'egg.inv.rotten':        '⚠️ APODRECIDO',
    'egg.inv.time_dh':       '{d}d {h}h restantes',
    'egg.inv.time_h':        '{h}h restantes',
    'egg.inv.egg_word_multi':'{n} ovos',
    'egg.inv.egg_word_one':  'um ovo',

    // Botões
    'egg.btn.discard':       'Descartar',
    'egg.btn.hatch':         'Chocar',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // Bubbles
    'egg.bub.hatch_first':  'Hatch the egg first! 🥚',
    'egg.bub.not_grown':    "Haven't grown enough yet... 🥚",
    'egg.bub.cooldown':     'Need to rest... (~{h}h)',
    'egg.bub.no_coins':     'Not enough coins to lay egg... 😢',
    'egg.bub.inv_full':     'Inventory full! (10 eggs max) 🥚',
    'egg.bub.connect':      'Connect your account first!',
    'egg.bub.laying':       'Laying egg... 🥚',
    'egg.bub.laid_multi':   'Laid {n} eggs! 🥚',
    'egg.bub.laid_leg':     'Laid a Legendary egg! 🌟',
    'egg.bub.laid_raro':    'Laid a Rare egg! 💙',
    'egg.bub.laid_common':  'Laid a Common egg! 🥚',
    'egg.bub.no_slots':     'No free slots! 😢',
    'egg.bub.sell_error':   'Error selling egg 😢',

    // Logs
    'egg.log.hatch_first':       'Finish hatching before going to Marketplace.',
    'egg.log.no_coins':          'Need 50 🪙 to lay an egg!',
    'egg.log.inv_full':          'Inventory full — discard or hatch an egg first.',
    'egg.log.connect':           'Connect your account first.',
    'egg.log.laid':              '🥚 Laid {word}! Check your inventory.',
    'egg.log.rotten_discarded':  'Rotten egg discarded.',
    'egg.log.pool_unavail':      '⚠️ Pool unavailable to burn {rar} egg.',
    'egg.log.burned_common':     '🔥 Common egg burned! +{moedas} 🪙',
    'egg.log.burned_rare':       '🔥 {rar} egg burned! +{gems} 💎{bonus}',
    'egg.log.not_found':         'Egg not found locally.',
    'egg.log.common_no_pool':    'Common eggs are not accepted by the pool.',
    'egg.log.sold':              '💎 {rar} egg sold to pool for {preco} 💎!',
    'egg.log.sell_error':        'Error selling to pool.',
    'egg.log.rotten_hatch':      'This egg has rotted — it can no longer be hatched.',
    'egg.log.no_slots':          'No free slots. Free a slot in the Marketplace.',
    'egg.log.no_gems':           'Insufficient crystals to hatch (need {fee} 💎).',
    'egg.log.cancelled':         'Hatching cancelled. Egg returned to inventory.',
    'egg.log.ready':             '🥚 {rar} {elem} egg ready to hatch!',

    // Hatch confirm modal (HTML)
    'egg.hatch.slots_full':  'All slots are occupied.<br>Free a slot in the Marketplace before hatching.',
    'egg.hatch.multi_slot':  'New avatar will be born in <b style="color:#7ab87a">Slot {slot}</b>.<br>Your active avatar <b style="color:#e8a030">{nome}</b> stays in Slot {activeSlot}.<br><span style="font-size:7px;color:var(--muted);">Activate the new avatar in Marketplace → My Avatars.</span>',
    'egg.hatch.same_slot':   'Egg will hatch in Slot {slot}.<br>Click 5× to hatch your new avatar.',
    'egg.hatch.need_gems':   '<br><br><span style="color:#f87171;font-size:8px;">⚠️ You need <b>{fee} 💎</b> to hatch.<br>Current balance: {saldo} 💎</span>',
    'egg.hatch.fee':         '<br><br><span style="color:#a78bfa;font-size:8px;">Hatching fee: <b>{fee} 💎</b></span>',

    // Egg screen
    'egg.hint.hatching':     'Hatching...',

    // Inventory
    'egg.inv.count':         '{n} / {max} egg{s}',
    'egg.inv.empty':         'No eggs in inventory',
    'egg.inv.rotten':        '⚠️ ROTTEN',
    'egg.inv.time_dh':       '{d}d {h}h left',
    'egg.inv.time_h':        '{h}h left',
    'egg.inv.egg_word_multi':'{n} eggs',
    'egg.inv.egg_word_one':  'an egg',

    // Buttons
    'egg.btn.discard':       'Discard',
    'egg.btn.hatch':         'Hatch',
  }
);
