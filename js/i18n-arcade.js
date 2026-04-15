// ═══════════════════════════════════════════════════════════════════
// I18N — Arcade (snake.js + labirinto.js)
// Carregado após i18n.js · usa registerStrings()
// ═══════════════════════════════════════════════════════════════════
window.registerStrings(
  // ── PORTUGUÊS ──────────────────────────────────────────────────
  {
    // Snake
    'snake.info':           '{diff} · Nível {nivel} · Coma os elementos!',
    'snake.score':          '🐍 {n} elemento{s}',
    'snake.result.gameover':'💀 GAME OVER',
    'snake.result.clear':   '🏆 CAMPO LIMPO! ({n} elementos)',
    'snake.result.good':    '🎉 {n} elementos!',
    'snake.result.ok':      '🐍 {n} elementos',
    'snake.reward.clear':   '+{xp} XP · +{coins} 🪙  ({n}× bola + bônus conclusão!)',
    'snake.reward.normal':  '+{xp} XP · +{coins} 🪙  ({n}× bola)',

    // Labirinto
    'maze.info':            '{diff} · 🪙 {got}/{total} moedas',
    'maze.timer':           '⏱ {s}s',
    'maze.result.caught':   '👁 APANHADO!',
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
    'snake.info':           '{diff} · Level {nivel} · Eat the elements!',
    'snake.score':          '🐍 {n} element{s}',
    'snake.result.gameover':'💀 GAME OVER',
    'snake.result.clear':   '🏆 FIELD CLEAR! ({n} elements)',
    'snake.result.good':    '🎉 {n} elements!',
    'snake.result.ok':      '🐍 {n} elements',
    'snake.reward.clear':   '+{xp} XP · +{coins} 🪙  ({n}× ball + clear bonus!)',
    'snake.reward.normal':  '+{xp} XP · +{coins} 🪙  ({n}× ball)',

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
