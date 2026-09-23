// ═══════════════════════════════════════════════════════════════════
// O AVATAR NOS PASSATEMPOS
//
// Os três jogos eram tabuleiros soltos: podiam estar em qualquer site
// da internet e não se notava a diferença. Nada ali dizia que se estava
// a brincar COM a criatura — e brincar com ela é, na ficção, a razão
// de os jogos existirem: é o que lhe sobe o humor e o vínculo.
//
// Este módulo põe o avatar dentro da janela, olhando para o tabuleiro,
// e a reagir a cada jogada. Um acerto e ele salta; um erro e ele
// encolhe-se. É pouco código para o que devolve.
//
// Reaproveita o gerarSVG() e as animações que a tela principal já usa,
// para o bicho ser exatamente o mesmo aqui e lá — não uma ilustração
// parecida.
//
// Depende de: avatar, getFase(), gerarSVG()
// ═══════════════════════════════════════════════════════════════════

// Os painéis abertos neste momento. Uma reação chega a todos, o que
// evita ter de saber qual é o jogo em curso.
const _miniAvPaineis = new Set();

const _MINI_AV_EMOJI = {
  bom:   ['✨', '⭐', '💫', '🎵'],
  mau:   ['💧', '💭', '·'],
  festa: ['🎉', '🎊', '🏆', '✨'],
};

// ── Montar ───────────────────────────────────────────────────────
// Chamado ao abrir cada jogo. Sem avatar vivo o painel fica vazio e
// tudo o resto continua funcionando.
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
  // Duas camadas de propósito. A de fora flutua sem parar; a de dentro
  // reage. Estavam na mesma e por isso a reação SUBSTITUÍA a
  // flutuação: o bicho parava no ar, saltava, e voltava de repente.
  // Com transforms em elementos separados, os dois somam-se.
  el.innerHTML =
    '<div class="mini-av-flutua">' +
      '<div class="mini-av-corpo">' +
        gerarSVG(avatar, avatar.raridade, avatar.seed, 120, 120, fase) +
      '</div>' +
    '</div>' +
    '<div class="mini-av-borbulha"></div>';
}

function miniAvatarDesmontar(id) {
  _miniAvPaineis.delete(id);
}

/* ── O RETRATO DO RANKING ──

   O ranking mostrava só o nome. Agora mostra o bicho: cada linha guarda
   o mínimo para redesenhá-lo — a semente, a raridade, a fase e o DNA,
   que juntos dão uns 150 bytes — e quem lê a lista desenha com o mesmo
   gerarSVG do resto do jogo. Um desenho pronto (SVG ou PNG) custaria
   dezenas de vezes mais no banco, para cada jogador de cada lista.

   Serve ao Snake e à Fusão; por isso mora aqui, que carrega antes dos
   dois. */
function rankMeuRetrato() {
  if (typeof avatar === 'undefined' || !avatar) return null;
  const dna = avatar.dna || (avatar.nascimento && avatar.nascimento.dna) || null;
  if (!dna) return null;
  return {
    seed:     avatar.seed || 0,
    raridade: avatar.raridade || 'Comum',
    fase:     (typeof getFase === 'function') ? getFase() : 0,
    dna:      JSON.parse(JSON.stringify(dna)),
  };
}

/* ════════════════════════════════════════════════════════════════════
   POR QUE É QUE O RANKING NÃO VEIO

   Os três jogos liam e gravavam o ranking dentro de um `catch` vazio. O
   jogador via "Não foi possível carregar o ranking." e mais nada, e do
   lado de cá não havia por onde começar: uma recusa das regras do
   banco, uma queda de rede e um erro de programação davam exatamente a
   mesma tela. Pior era a GRAVAÇÃO, que falhava em silêncio absoluto —
   o recorde sumia e ninguém sabia porquê.

   Agora o motivo vai para o console inteiro, e um resumo de três
   palavras aparece na tela. Não conserta nada sozinho; diz onde doer.
   ════════════════════════════════════════════════════════════════════ */
function rankMotivo(e) {
  const txt = String((e && (e.code || e.message)) || '').toLowerCase();
  const diz = k => (typeof t === 'function') ? t(k) : k;
  if (txt.indexOf('permission') !== -1 || txt.indexOf('denied') !== -1) return diz('rank.motivo.permissao');
  if (txt.indexOf('network') !== -1 || txt.indexOf('offline') !== -1
      || txt.indexOf('unavailable') !== -1 || txt.indexOf('disconnect') !== -1) return diz('rank.motivo.rede');
  if (txt.indexOf('index') !== -1) return diz('rank.motivo.indice');
  return diz('rank.motivo.outro');
}

/* Regista e devolve o motivo. `onde` diz qual jogo e se era leitura ou
   escrita — sem isso, a linha do console não serve para nada. */
function rankFalhou(onde, e) {
  try { console.warn('[ranking] ' + onde + ':', (e && e.code) || '', (e && e.message) || e); } catch (_) {}
  return rankMotivo(e);
}

function rankRetratoDe(linha) {
  const av = linha && linha.av;
  if (!av || !av.dna || typeof gerarSVG !== 'function') {
    return '<span class="rank-av vazio"></span>';
  }
  try {
    return '<span class="rank-av">' +
      gerarSVG(av, av.raridade || 'Comum', av.seed || 0, 64, 64, av.fase || 0) +
      '</span>';
  } catch (e) {
    return '<span class="rank-av vazio"></span>';
  }
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

    // E as partes por dentro, cada uma por si.
    _miniAvatarPartesReagem(corpo, tipo);

    const bolha = el.querySelector('.mini-av-borbulha');
    if (bolha) {
      const span = document.createElement('span');
      span.textContent = pool[Math.floor(Math.random() * pool.length)];
      // Um desvio horizontal por emoji, para dois seguidos não subirem
      // exatamente pelo mesmo sítio.
      span.style.setProperty('--dx', (Math.random() * 16 - 8).toFixed(1) + 'px');
      bolha.appendChild(span);
      setTimeout(() => span.remove(), 900);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// AS PARTES REAGEM
//
// O CSS dá a cada parte uma vida de fundo: piscar, respirar, abanar a
// cauda. Uma reação não deve substituir isso — deve somar-se-lhe.
//
// É para isso que serve o composite:'add' da Web Animations API: a
// transformação da reação acumula sobre a que já está rodando, em
// vez de a apagar. Com CSS puro não dá: `animation` guarda um valor
// só, que foi exatamente o problema que a flutuação teve.
//
// Se o browser não suportar composite (fica em 'replace'), a parte
// ainda anima — só perde a soma durante a reação. Degrada bem.
// ═══════════════════════════════════════════════════════════════════

// Cada entrada: [selector, quadros, duração, atraso por índice].
// O atraso é zero nos olhos: piscam e arregalam juntos, como olhos.
const _MINI_AV_GESTOS = {
  bom: [
    ['.av-olho-un', [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], 380, 0],
    ['.av-membro',  [{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(0)' }], 480, 55],
    ['.av-asa',     [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.22)' }, { transform: 'scaleY(1)' }], 420, 0],
  ],
  mau: [
    // Os olhos apertam-se e demoram a abrir: é o que lê como desânimo.
    ['.av-olho-un', [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.35)' }, { transform: 'scaleY(1)' }], 620, 0],
    ['.av-membro',  [{ transform: 'rotate(0)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(0)' }], 620, 40],
    ['.av-cauda',   [{ transform: 'rotate(0)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], 620, 0],
  ],
  festa: [
    ['.av-olho-un', [{ transform: 'scale(1)' }, { transform: 'scale(1.5)' }, { transform: 'scale(1)' },
                     { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], 900, 0],
    ['.av-membro',  [{ transform: 'rotate(0)' }, { transform: 'rotate(-22deg)' }, { transform: 'rotate(8deg)' },
                     { transform: 'rotate(-12deg)' }, { transform: 'rotate(0)' }], 900, 70],
    ['.av-asa',     [{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.35)' }, { transform: 'scaleY(0.9)' },
                     { transform: 'scaleY(1.2)' }, { transform: 'scaleY(1)' }], 900, 0],
    ['.av-cauda',   [{ transform: 'rotate(0)' }, { transform: 'rotate(-11deg)' }, { transform: 'rotate(9deg)' },
                     { transform: 'rotate(0)' }], 900, 0],
  ],
};

const _miniAvSuportaSoma = (() => {
  try { return typeof Element !== 'undefined'
      && typeof Element.prototype.animate === 'function'; }
  catch (_) { return false; }
})();

/* O executor é o mesmo para os dois avatares — o dos passatempos e o do
   jogo. Recebe a lista de gestos já resolvida, em vez de ir buscá-la a
   uma tabela sua, para que o avatar principal possa trazer a dele sem
   duplicar isto tudo. Ver _AV_ACAO_GESTOS em js/ui.js.

   O atraso extra existe para o antídoto, onde o efeito tem de PERCORRER
   o corpo: o peito primeiro, depois os membros, as asas, a cauda. Sem
   ele todas as partes acendiam ao mesmo tempo e não se lia viagem. */
function avatarPartesReagem(raiz, gestos) {
  if (!_miniAvSuportaSoma) return;
  if (!raiz || !gestos) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (const [selector, quadros, duracao, passo, atrasoBase] of gestos) {
    const partes = raiz.querySelectorAll(selector);
    partes.forEach((parte, i) => {
      try {
        // Os quadros podem vir como função em vez de lista. É o que
        // permite medir a peça antes de a animar — a boca precisa disso,
        // porque o mesmo scaleY que abre um traço de 5px rebenta uma
        // elipse de 22, e os dois desenhos existem.
        const q = typeof quadros === 'function' ? quadros(parte) : quadros;
        if (!q) return;
        parte.animate(q, {
          duration: duracao,
          delay: (atrasoBase || 0) + i * passo,
          easing: 'cubic-bezier(.34,1.4,.64,1)',
          composite: 'add',   // soma-se ao que o CSS já está fazendo
        });
      } catch (_) { /* browser sem WAAPI: fica só a animação do corpo */ }
    });
  }
}

function _miniAvatarPartesReagem(raiz, tipo) {
  avatarPartesReagem(raiz, _MINI_AV_GESTOS[tipo]);
}
