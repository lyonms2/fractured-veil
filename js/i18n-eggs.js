// ═══════════════════════════════════════════════════════════════════
// I18N — Sistema de Ovos
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // Bubbles
    'egg.bub.hatch_first':  'Choca o ovo primeiro! 🥚',
    'egg.bub.no_slots':     'Sem slots livres! 😢',
    'egg.bub.burn_error':   'Erro ao queimar ovo 😢',

    // Logs
    'egg.log.hatch_first':       'Termine a chocagem antes de ir ao Marketplace.',
    'egg.log.apodreceu_1':   '🥚 Um ovo {raridade} apodreceu enquanto você esteve fora.',
    'egg.log.apodreceu_n':   '🥚 {n} ovos apodreceram enquanto você esteve fora.',
    'egg.toast.apodreceu_raro': 'Você perdeu {n} ovo(s) raro(s) por validade! Choque antes de vencer.',
    'egg.log.rotten_discarded':  'Ovo apodrecido descartado.',
    'egg.log.burned_common':     '🔥 Ovo Comum queimado! +{moedas} 🪙',
    'egg.log.burn_pool_error':   'Erro ao queimar para a pool.',
    'egg.log.rotten_hatch':      'Este ovo apodreceu — não pode mais ser chocado.',
    'egg.log.no_slots':          'Sem slots livres. Libere um slot no Marketplace.',
    'egg.log.no_gems':           'Cristais insuficientes para chocar (você precisa de {fee} 💎).',
    'egg.log.cancelled':         'Chocagem cancelada. Ovo devolvido ao inventário.',
    'egg.log.ready':             '🥚 Ovo {rar} de {elem} pronto para chocar!',

    // Hatch confirm modal (HTML)
    'egg.hatch.slots_full':  'Todos os slots estão ocupados.<br>Libere um slot no Marketplace antes de chocar.',
    'egg.hatch.multi_slot':  'O novo avatar nascerá no <b style="color:#7ab87a">Slot {slot}</b>.<br>Seu avatar ativo <b style="color:#e8a030">{nome}</b> continua no Slot {activeSlot}.<br><span style="font-size:0.4375rem;color:var(--muted);">Ative o novo avatar no Marketplace → Meus Avatares.</span>',
    'egg.hatch.same_slot':   'O ovo nascerá no Slot {slot}.',
    'egg.hatch.need_gems':   '<br><br><span style="color:#f87171;font-size:0.5rem;">⚠️ Você precisa de <b>{fee} 💎</b> para chocar.<br>Saldo atual: {saldo} 💎</span>',
    'egg.hatch.fee':         '<br><br><span style="color:#a78bfa;font-size:0.5rem;">Taxa de choco: <b>{fee} 💎</b></span>',

    // Egg screen
    'egg.hint.hatching':     'Chocando...',

    // Inventário
    'egg.inv.count':         '{n} / {max} ovo{s}',
    'egg.inv.empty':         'Nenhum ovo no inventário',
    'egg.inv.rotten':        '⚠️ APODRECIDO',
    'egg.inv.time_dh':       '{d}d {h}h restantes',
    'egg.inv.time_h':        '{h}h restantes',

    // Botões
    'egg.btn.discard':       'Descartar',
    'egg.btn.hatch':         'Chocar',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // Bubbles
    'egg.bub.hatch_first':  'Hatch the egg first! 🥚',
    'egg.bub.no_slots':     'No free slots! 😢',
    'egg.bub.burn_error':   'Error burning egg 😢',

    // Logs
    'egg.log.hatch_first':       'Finish hatching before going to Marketplace.',
    'egg.log.apodreceu_1':   '🥚 A {raridade} egg rotted while you were away.',
    'egg.log.apodreceu_n':   '🥚 {n} eggs rotted while you were away.',
    'egg.toast.apodreceu_raro': 'You lost {n} rare egg(s) to expiry! Hatch them before they turn.',
    'egg.log.rotten_discarded':  'Rotten egg discarded.',
    'egg.log.burned_common':     '🔥 Common egg burned! +{moedas} 🪙',
    'egg.log.burn_pool_error':   'Error burning to the pool.',
    'egg.log.rotten_hatch':      'This egg has rotted — it can no longer be hatched.',
    'egg.log.no_slots':          'No free slots. Free a slot in the Marketplace.',
    'egg.log.no_gems':           'Insufficient crystals to hatch (need {fee} 💎).',
    'egg.log.cancelled':         'Hatching canceled. Egg returned to inventory.',
    'egg.log.ready':             '🥚 {rar} {elem} egg ready to hatch!',

    // Hatch confirm modal (HTML)
    'egg.hatch.slots_full':  'All slots are occupied.<br>Free a slot in the Marketplace before hatching.',
    'egg.hatch.multi_slot':  'New avatar will be born in <b style="color:#7ab87a">Slot {slot}</b>.<br>Your active avatar <b style="color:#e8a030">{nome}</b> stays in Slot {activeSlot}.<br><span style="font-size:0.4375rem;color:var(--muted);">Activate the new avatar in Marketplace → My Avatars.</span>',
    'egg.hatch.same_slot':   'Egg will hatch in Slot {slot}.',
    'egg.hatch.need_gems':   '<br><br><span style="color:#f87171;font-size:0.5rem;">⚠️ You need <b>{fee} 💎</b> to hatch.<br>Current balance: {saldo} 💎</span>',
    'egg.hatch.fee':         '<br><br><span style="color:#a78bfa;font-size:0.5rem;">Hatching fee: <b>{fee} 💎</b></span>',

    // Egg screen
    'egg.hint.hatching':     'Hatching...',

    // Inventory
    'egg.inv.count':         '{n} / {max} egg{s}',
    'egg.inv.empty':         'No eggs in inventory',
    'egg.inv.rotten':        '⚠️ ROTTEN',
    'egg.inv.time_dh':       '{d}d {h}h left',
    'egg.inv.time_h':        '{h}h left',

    // Buttons
    'egg.btn.discard':       'Discard',
    'egg.btn.hatch':         'Hatch',
  }
);
