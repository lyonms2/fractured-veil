// ═══════════════════════════════════════════════════════════════════
// I18N — Items (inventário, equip, tooltips, logs)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // O tipo e a raridade ficam guardados em português no ITEM_CATALOG
    // porque são CHAVE: o código compara tipo === 'Cenário', ordena por
    // TIPO_ORDER e agrupa por eles. Estas são só a fachada — traduzir o
    // valor guardado partia a lógica toda.
    'item.tipo.Amuleto':      'Amuleto',
    'item.tipo.Coroa':        'Coroa',
    'item.tipo.Cenário':      'Cenário',
    'item.tipo.Consumível':   'Consumível',
    'item.tipo.Especial':     'Especial',
    'item.tipo.Outro':        'Outro',
    'item.rar.Comum':         'Comum',
    'item.rar.Raro':          'Raro',
    'item.rar.Lendário':      'Lendário',
    'item.rar.Especial':      'Especial',

    'item.inv.word_one':      'item',
    'item.inv.word_multi':    'itens',
    'item.inv.count':         '{n} {word} · {eq}/{max} equipados',
    'item.inv.empty':         'Nenhum item no inventário',
    'item.card.days_left':    '{d}d restantes',
    'item.card.equipped':     'EQUIPADO',
    'item.btn.equip':         'EQUIPAR',
    'item.btn.unequip':       'DESEQUIPAR',
    'item.btn.delete':        'EXCLUIR',
    'item.tooltip.days_warn': '{d}d restantes!',
    'item.tooltip.days':      '{nome} ({d}d)',
    'item.log.expired':       '⏳ {nome} expirou após 30 dias.',
    'item.log.cenario_full':  'Você já tem uma decoração de cenário equipada.',
    'item.log.max_equipped':  'Máximo de {max} itens equipados.',
    'item.log.equipped':      '{emoji} {nome} equipado!',
    'item.log.unequipped':    '{emoji} {nome} desequipado.',
    'item.log.deleted':       '{nome} excluído.',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    'item.tipo.Amuleto':      'Amulet',
    'item.tipo.Coroa':        'Crown',
    'item.tipo.Cenário':      'Scenery',
    'item.tipo.Consumível':   'Consumable',
    'item.tipo.Especial':     'Special',
    'item.tipo.Outro':        'Other',
    'item.rar.Comum':         'Common',
    'item.rar.Raro':          'Rare',
    'item.rar.Lendário':      'Legendary',
    'item.rar.Especial':      'Special',

    'item.inv.word_one':      'item',
    'item.inv.word_multi':    'items',
    'item.inv.count':         '{n} {word} · {eq}/{max} equipped',
    'item.inv.empty':         'No items in inventory',
    'item.card.days_left':    '{d}d left',
    'item.card.equipped':     'EQUIPPED',
    'item.btn.equip':         'EQUIP',
    'item.btn.unequip':       'UNEQUIP',
    'item.btn.delete':        'DELETE',
    'item.tooltip.days_warn': '{d}d left!',
    'item.tooltip.days':      '{nome} ({d}d)',
    'item.log.expired':       '⏳ {nome} expired after 30 days.',
    'item.log.cenario_full':  'You already have a scenery decoration equipped.',
    'item.log.max_equipped':  'Maximum of {max} items equipped.',
    'item.log.equipped':      '{emoji} {nome} equipped!',
    'item.log.unequipped':    '{emoji} {nome} unequipped.',
    'item.log.deleted':       '{nome} deleted.',
  }
);
