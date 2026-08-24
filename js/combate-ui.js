// ═══════════════════════════════════════════════════════════════════
// COMBATE — INTERFACE
//
// Duas coisas, ambas em "Meus Avatares":
//   · a ficha de combate de cada avatar (fichaDeCombate em combate-ficha.js)
//   · a escolha dos 3 que entram na equipa de batalha
//
// Aqui não se calcula nada. Os números todos vêm de combate-ficha.js —
// se um dia a fórmula mudar, muda num sítio só.
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// renderFichaHTML — a ficha 3D&T do avatar
//
// Quatro características de 0 a 5, as duas barras (PV = R×5, PM = R×5),
// a vantagem e a desvantagem com que nasceu, e as três magias que
// conhece. Não calcula nada: tudo vem de js/ficha-3dt.js, js/magias.js
// e js/vantagens.js.
// ═══════════════════════════════════════════════════════════════════
const FICHA_COR = {
  F: '#e05555',   // Força — dano
  H: '#5ab4e8',   // Habilidade — iniciativa, esquiva, tecto de magia
  R: '#7ab87a',   // Resistência — vida e magia
  A: '#c9a84c',   // Armadura — defesa
};

// Escala das barrinhas. Um avatar de nível 35 chega a 13 num atributo,
// mas a esmagadora maioria vive entre 0 e 6 — por isso a barra satura
// aos 8, senão as fichas normais apareciam todas vazias.
const FICHA_ESCALA = 8;

function renderFichaHTML(seed, raridade, elemento, nivel) {
  if (typeof fichaDeAvatar !== 'function') return '';
  const f = fichaDeAvatar(seed, raridade, elemento, nivel);
  if (!f) return '';
  f.seed = (seed && typeof seed === 'object') ? seed.seed : seed;

  const linhas = ['F', 'H', 'R', 'A'].map(k => {
    const pct = Math.min(100, Math.round(f[k] / FICHA_ESCALA * 100));
    return `<div class="ficha-stat">
      <div class="ficha-stat-lbl">${k}</div>
      <div class="ficha-stat-bar"><div class="ficha-stat-fill" style="width:${pct}%;background:${FICHA_COR[k]};"></div></div>
      <div class="ficha-stat-val">${f[k]}</div>
    </div>`;
  }).join('');

  return `<div class="ficha">
    <div class="ficha-title">${t('ficha.title')}</div>
    <div class="ficha-escalao">${f.escalao} · ${f.pontos} ${t('ficha.pontos')}</div>
    <div class="ficha-stats">${linhas}</div>
    <div class="ficha-bars">
      <div class="ficha-bar"><b style="color:#e05555;">${f.pv}</b><span>${t('ficha.pv')}</span></div>
      <div class="ficha-bar"><b style="color:#5ab4e8;">${f.pm}</b><span>${t('ficha.pm')}</span></div>
      <div class="ficha-bar"><b style="color:var(--gold-light);">${f.H * 5}</b><span>${t('ficha.tecto')}</span></div>
    </div>
    ${renderVantagensHTML(f)}
    ${renderMagiasHTML(f)}
  </div>`;
}

// ── Vantagem e desvantagem ──
function renderVantagensHTML(f) {
  if (!f.vantagem) return '';
  const nm = (id, el) => t('vd.' + id + '.nome').replace('{elem}', el || '');
  const ds = (id, el) => t('vd.' + id + '.desc').replace(/\{elem\}/g, el || '');
  const linha = (v, cls, sinal) => `<div class="vd ${cls}">
      <div class="vd-top"><span class="vd-nome">${nm(v.id, v.elemento)}</span>
        <span class="vd-custo">${sinal}${Math.abs(v.custo)}</span></div>
      <div class="vd-desc">${ds(v.id, v.elemento)}</div>
    </div>`;
  return `<div class="vd-bloco">
    ${linha(f.vantagem, 'boa', '−')}
    ${linha(f.desvantagem, 'ma', '+')}
  </div>`;
}

// ── As três magias ──
function renderMagiasHTML(f) {
  if (typeof magiasDoAvatar !== 'function') return '';
  const m = magiasDoAvatar(f);
  const custo = g => g.pm === 0 ? t('mag.custo.livre')
    : g.pmMax ? t('mag.custo.faixa', { min: g.pm, max: g.pmMax })
    : g.porTurno ? t('mag.custo.turno', { pm: g.pm })
    : t('mag.custo', { pm: g.pm });

  const linhas = ['ataque', 'forte', 'defesa'].map(cat => {
    const g = m[cat];
    if (!g) return `<div class="hab vazia">
        <div class="hab-top"><span class="hab-papel">${t('mag.cat.' + cat)}</span></div>
        <div class="hab-efeito">${t('ficha.sem_magia', {
          h: (typeof habilidadeNecessaria === 'function' ? habilidadeNecessaria(f.elemento, cat) : '?') })}</div>
      </div>`;
    return `<div class="hab">
      <div class="hab-top">
        <span class="hab-papel">${t('mag.cat.' + cat)}</span>
        <span class="hab-custo${g.pm === 0 ? ' livre' : ''}">${custo(g)}</span>
      </div>
      <div class="hab-nome">${t('mag.' + g.id + '.nome')}</div>
      <div class="hab-efeito">${t('mag.' + g.id + '.desc')}</div>
    </div>`;
  }).join('');

  return `<div class="hab-bloco">
    <div class="hab-titulo">${t('hab.titulo')}</div>
    ${linhas}
  </div>`;
}

// Preenche a ficha dentro do overlay de zoom do avatar.
// Chamada por openAvatarZoom() e openAvatarZoomData() em js/main.js.
function preencherFichaZoom(seed, raridade, elemento, nivel) {
  const el = document.getElementById('avatarZoomFicha');
  if (!el) return;
  el.innerHTML = renderFichaHTML(seed, raridade, elemento, nivel);
}

// ═══════════════════════════════════════════════════════════════════
// BARRA DA EQUIPA — o resumo por cima da grelha de slots
// ═══════════════════════════════════════════════════════════════════
function renderEquipaBar() {
  const box = document.getElementById('equipaBar');
  if (!box || typeof equipaIdx !== 'function') return;

  const idx   = equipaIdx();
  const cheia = idx.length >= COMBATE_EQUIPA_MAX;

  let cartoes = '';
  for (let n = 0; n < COMBATE_EQUIPA_MAX; n++) {
    const i = idx[n];
    const s = (typeof i === 'number') ? avatarSlots[i] : null;
    if (!s) { cartoes += `<div class="equipa-slot vazio">+</div>`; continue; }
    const nome = (s.nome || 'Avatar').split(',')[0].trim();
    const ec   = (typeof CARACTERISTICAS_ELEMENTAIS !== 'undefined') ? CARACTERISTICAS_ELEMENTAIS[s.elemento] : null;
    cartoes += `<div class="equipa-slot" title="${t('mkt.slot.label', {n: i+1})}">
      ${gerarSVG(s.elemento, s.raridade, s.seed || 0, 42, 42, _faseNum(s.nivel))}
      <div class="equipa-slot-nome">${nome}</div>
      <div class="equipa-slot-sub">${ec ? ec.emoji : '✦'} ${t('mkt.stat.nivel')} ${s.nivel || 1}</div>
    </div>`;
  }

  const faltam = COMBATE_EQUIPA_MAX - idx.length;
  // O poder passa a ser o total de pontos, que é a medida do manual
  const poder = (typeof poderDaEquipa3dt === 'function')
    ? poderDaEquipa3dt(equipaDoJogador()) : 0;

  box.innerHTML = `<div class="equipa-bar">
    <div class="equipa-head">
      <div class="equipa-title">${t('equipa.title')}</div>
      <div class="equipa-count ${cheia ? 'full' : ''}">${idx.length}/${COMBATE_EQUIPA_MAX}</div>
    </div>
    <div class="equipa-slots">${cartoes}</div>
    <div class="equipa-foot">
      ${cheia ? t('equipa.pronta') : t(faltam === 1 ? 'equipa.incompleta_1' : 'equipa.incompleta', { faltam })}<br>
      ${t('equipa.poder', { poder })}
    </div>
  </div>`;
}

// Botão ⚔ de cada card. Só re-renderiza a barra e a grelha — a escolha
// vai para gs.equipa, que o save normal do jogo já leva.
function toggleEquipa(i) {
  if (typeof alternarNaEquipa !== 'function') return;
  const r = alternarNaEquipa(i);
  if (r === 'cheia') {
    showToast(t('equipa.toast.cheia', { max: COMBATE_EQUIPA_MAX }), 'err');
    return;
  }
  if (r === 'inelegivel') { showToast(t('equipa.toast.inelegivel'), 'err'); return; }

  const nome = (avatarSlots[i]?.nome || 'Avatar').split(',')[0].trim();
  showToast(r === 'add' ? t('equipa.toast.add', { nome }) : t('equipa.toast.remove', { nome }), 'ok');

  if (typeof scheduleSave === 'function') scheduleSave();
  if (typeof renderSlots === 'function') renderSlots();
}
