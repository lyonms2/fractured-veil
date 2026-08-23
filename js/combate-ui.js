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

// Escala das barras: um Lendário nível 35 chega perto de 45 no atributo
// primário, portanto 45 é o topo visual. Acima disso a barra fica cheia.
const FICHA_ESCALA = 45;

const FICHA_COR = {
  FOR: '#e05555',   // vermelho — dano bruto
  RES: '#7ab87a',   // verde — sobrevivência
  HAB: '#5ab4e8',   // azul — velocidade e economia
  INT: '#a855f7',   // roxo — dano mágico e suporte
};

// ═══════════════════════════════════════════════════════════════════
// renderFichaHTML — o bloco visual da ficha
//
// Aceita um slot ({seed, raridade, elemento, nivel}) ou os 4 valores.
// Devolve HTML; quem chama decide onde o mete.
// ═══════════════════════════════════════════════════════════════════
function renderFichaHTML(seed, raridade, elemento, nivel) {
  if (typeof fichaDeCombate !== 'function') return '';
  const f = fichaDeCombate(seed, raridade, elemento, nivel);
  if (!f) return '';

  const linhas = ['FOR', 'RES', 'HAB', 'INT'].map(k => {
    const papel = k === f.primaria ? 'prim' : k === f.secundaria ? 'sec' : '';
    const tag   = k === f.primaria ? '◆' : k === f.secundaria ? '◈' : '';
    const pct   = Math.min(100, Math.round(f[k] / FICHA_ESCALA * 100));
    return `<div class="ficha-stat ${papel}">
      <div class="ficha-stat-lbl">${k}</div>
      <div class="ficha-stat-tag">${tag}</div>
      <div class="ficha-stat-bar"><div class="ficha-stat-fill" style="width:${pct}%;background:${FICHA_COR[k]};"></div></div>
      <div class="ficha-stat-val">${f[k]}</div>
    </div>`;
  }).join('');

  const poder = typeof poderDoAvatar === 'function'
    ? Math.round(poderDoAvatar(f.raridade, f.nivel)) : 0;

  return `<div class="ficha">
    <div class="ficha-title">${t('ficha.title')}</div>
    <div class="ficha-stats">${linhas}</div>
    <div class="ficha-bars">
      <div class="ficha-bar"><b style="color:#e05555;">${f.hpMax}</b><span>${t('ficha.hp')}</span></div>
      <div class="ficha-bar"><b style="color:#5ab4e8;">${f.enMax}</b><span>${t('ficha.energia')}</span></div>
      <div class="ficha-bar"><b style="color:var(--gold-light);">${poder}</b><span>${t('ficha.poder')}</span></div>
    </div>
    <div class="ficha-foot">
      ${t('ficha.afinidade', { elem: f.elemento, prim: f.primaria, sec: f.secundaria })}<br>
      ${t('ficha.ultimate', { stat: f.statDoUltimate })}
    </div>
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

  const poder = (typeof poderDaEquipa === 'function')
    ? Math.round(poderDaEquipa(equipaDoJogador())) : 0;

  box.innerHTML = `<div class="equipa-bar">
    <div class="equipa-head">
      <div class="equipa-title">${t('equipa.title')}</div>
      <div class="equipa-count ${cheia ? 'full' : ''}">${idx.length}/${COMBATE_EQUIPA_MAX}</div>
    </div>
    <div class="equipa-slots">${cartoes}</div>
    <div class="equipa-foot">
      ${cheia ? t('equipa.pronta') : t('equipa.incompleta', { faltam: COMBATE_EQUIPA_MAX - idx.length })}<br>
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

// Abre a ficha de um slot no overlay de zoom (o mesmo do 🔍).
function abrirFichaSlot(i) {
  const s = (typeof avatarSlots !== 'undefined') ? avatarSlots[i] : null;
  if (!s) return;
  openAvatarZoomData(s.elemento, s.raridade, s.seed || 0, s.nivel || 1, s.nome || 'Avatar');
}
