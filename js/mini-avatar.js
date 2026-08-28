// ═══════════════════════════════════════════════════════════════════
// O AVATAR NOS PASSATEMPOS
//
// Os três jogos eram tabuleiros soltos: podiam estar em qualquer site
// da internet e não se notava a diferença. Nada ali dizia que se estava
// a brincar COM a criatura — e brincar com ela é, na ficção, a razão
// de os jogos existirem: é o que lhe sobe o humor e o vínculo.
//
// Este módulo põe o avatar dentro da janela, a olhar para o tabuleiro,
// e a reagir a cada jogada. Um acerto e ele salta; um erro e ele
// encolhe-se. É pouco código para o que devolve.
//
// Reaproveita o gerarSVG() e as animações que a tela principal já usa,
// para o bicho ser exactamente o mesmo aqui e lá — não uma ilustração
// parecida.
//
// Depende de: avatar, getFase(), gerarSVG()
// ═══════════════════════════════════════════════════════════════════

// Os painéis abertos neste momento. Uma reacção chega a todos, o que
// evita ter de saber qual é o jogo em curso.
const _miniAvPaineis = new Set();

const _MINI_AV_EMOJI = {
  bom:   ['✨', '⭐', '💫', '🎵'],
  mau:   ['💧', '💭', '·'],
  festa: ['🎉', '🎊', '🏆', '✨'],
};

// ── Montar ───────────────────────────────────────────────────────
// Chamado ao abrir cada jogo. Sem avatar vivo o painel fica vazio e
// tudo o resto continua a funcionar.
function miniAvatarMontar(id) {
  const el = document.getElementById(id);
  if (!el) return;
  _miniAvPaineis.add(id);

  const temAvatar = typeof avatar !== 'undefined' && avatar
                 && typeof gerarSVG === 'function';
  if (!temAvatar) { el.innerHTML = ''; el.style.display = 'none'; return; }

  el.style.display = '';
  const fase = (typeof getFase === 'function') ? getFase() : 0;
  // Desenhado grande de propósito. O tamanho na tela vem do CSS, em
  // rem, para o bicho acompanhar a escala como o resto — cravar px
  // aqui deixava-o minúsculo no desktop, onde tudo o resto é 1,5x.
  el.innerHTML =
    '<div class="mini-av-corpo">' +
      gerarSVG(avatar.elemento, avatar.raridade, avatar.seed, 120, 120, fase) +
    '</div>' +
    '<div class="mini-av-borbulha"></div>';
}

function miniAvatarDesmontar(id) {
  _miniAvPaineis.delete(id);
}

// ── Reagir ───────────────────────────────────────────────────────
// `tipo` é 'bom', 'mau' ou 'festa'.
function miniAvatarReagir(tipo) {
  const classe = tipo === 'mau' ? 'reage-mau'
               : tipo === 'festa' ? 'reage-festa'
               : 'reage-bom';
  const pool = _MINI_AV_EMOJI[tipo] || _MINI_AV_EMOJI.bom;

  for (const id of _miniAvPaineis) {
    const el = document.getElementById(id);
    if (!el || !el.firstChild) continue;
    const corpo = el.querySelector('.mini-av-corpo');
    if (!corpo) continue;

    // Reiniciar a animação: sem isto, duas jogadas seguidas do mesmo
    // tipo só animavam a primeira, porque a classe já lá estava.
    corpo.classList.remove('reage-bom', 'reage-mau', 'reage-festa');
    void corpo.offsetWidth;
    corpo.classList.add(classe);

    const bolha = el.querySelector('.mini-av-borbulha');
    if (bolha) {
      const span = document.createElement('span');
      span.textContent = pool[Math.floor(Math.random() * pool.length)];
      // Um desvio horizontal por emoji, para dois seguidos não subirem
      // exactamente pelo mesmo sítio.
      span.style.setProperty('--dx', (Math.random() * 16 - 8).toFixed(1) + 'px');
      bolha.appendChild(span);
      setTimeout(() => span.remove(), 900);
    }
  }
}
