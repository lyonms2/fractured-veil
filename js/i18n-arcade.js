// ═══════════════════════════════════════════════════════════════════
// I18N — Arcade (snake.js + labirinto.js)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // Snake
    'snake.info':           '{diff} · Nível {nivel} · Coma os símbolos!',
    'snake.score':          '🐍 {n} símbolo{s}',
    'snake.result.gameover':'💀 GAME OVER',
    'snake.result.clear':   '🏆 CAMPO LIMPO! ({n} símbolos)',
    'snake.result.good':    '🎉 {n} símbolos!',
    'snake.result.ok':      '🐍 {n} símbolos',
    'snake.reward.clear':   '+{xp} XP · +{coins} 🪙  ({n}× bola + bônus conclusão!)',
    'snake.reward.normal':  '+{xp} XP · +{coins} 🪙  ({n}× bola)',
    'snake.record.title':   '✦ NOVO RECORDE ✦',

    // Labirinto
    'maze.info':            '{diff} · 🪙 {got}/{total} moedas',
    'maze.timer':           '⏱ {s}s',
    'maze.result.caught':   '👁 TE PEGARAM!',
    'maze.result.timeout':  '⏰ TEMPO ESGOTADO',
    'maze.result.exit':     '🚪 SAÍDA ENCONTRADA!',
    'maze.result.exit_gold':'⚡ SAÍDA DOURADA!',
    'maze.reward.coins':    '🪙 {n} moeda{s} coletada{s} (+{coins} 🪙)',
    'maze.reward.win':      '+{xp} XP · 🪙 {got}/{total} moedas (+{coins} 🪙 — {bonus})',
    'maze.bonus.exit':      'bônus saída!',
    'maze.bonus.exit_gold': 'bônus saída dourada!',
  },
  // ── ENGLISH ────────────────────────────────────────────────────
  {
    // Snake
    'snake.info':           '{diff} · Level {nivel} · Eat the symbols!',
    'snake.score':          '🐍 {n} symbol{s}',
    'snake.result.gameover':'💀 GAME OVER',
    'snake.result.clear':   '🏆 FIELD CLEAR! ({n} symbols)',
    'snake.result.good':    '🎉 {n} symbols!',
    'snake.result.ok':      '🐍 {n} symbols',
    'snake.reward.clear':   '+{xp} XP · +{coins} 🪙  ({n}× ball + clear bonus!)',
    'snake.reward.normal':  '+{xp} XP · +{coins} 🪙  ({n}× ball)',
    'snake.record.title':   '✦ NEW RECORD ✦',

    // Maze
    'maze.info':            '{diff} · 🪙 {got}/{total} coins',
    'maze.timer':           '⏱ {s}s',
    'maze.result.caught':   '👁 CAUGHT!',
    'maze.result.timeout':  '⏰ TIME\'S UP',
    'maze.result.exit':     '🚪 EXIT FOUND!',
    'maze.result.exit_gold':'⚡ GOLDEN EXIT!',
    'maze.reward.coins':    '🪙 {n} coin{s} collected (+{coins} 🪙)',
    'maze.reward.win':      '+{xp} XP · 🪙 {got}/{total} coins (+{coins} 🪙 — {bonus})',
    'maze.bonus.exit':      'exit bonus!',
    'maze.bonus.exit_gold': 'golden exit bonus!',
  }
);
