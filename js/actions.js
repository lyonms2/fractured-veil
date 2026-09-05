// ═══════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════

function canAct() {
  if(dead || !hatched || !avatar) return false;
  if(sleeping) { showBubble(t('bubble.sleeping')); return false; }
  return true;
}

// ── COIN SPEND / EARN ANIMATION ──
function showCoinAnim(amount, isSpend = true) {
  const el = document.getElementById('resMonedas');
  if(!el) return;
  el.parentElement.classList.remove('res-flash');
  void el.parentElement.offsetWidth;
  el.parentElement.classList.add('res-flash');
  setTimeout(() => el.parentElement.classList.remove('res-flash'), 500);

  const container = el.closest('.res') || el.parentElement;
  container.style.position = 'relative';
  const fly = document.createElement('div');
  fly.className   = isSpend ? 'coin-spend' : 'coin-earn';
  fly.textContent = isSpend ? `-${amount} 🪙` : `+${amount} 🪙`;
  fly.style.cssText = `position:absolute;left:50%;top:-0.25rem;transform:translateX(-50%);pointer-events:none;z-index:9999;white-space:nowrap;font-family:'Cinzel',serif;font-size:0.625rem;font-weight:700;color:${isSpend?'#e74c3c':'#7ab87a'};animation:coin-fly 0.9s ease-out forwards;`;
  container.appendChild(fly);
  setTimeout(() => fly.remove(), 950);
}

function showCristalAnim(amount, isSpend = true) {
  const el = document.getElementById('resCristais');
  if(!el) return;
  el.parentElement.classList.remove('res-flash');
  void el.parentElement.offsetWidth;
  el.parentElement.classList.add('res-flash');
  setTimeout(() => el.parentElement.classList.remove('res-flash'), 500);

  const container = el.closest('.res') || el.parentElement;
  container.style.position = 'relative';
  const fly = document.createElement('div');
  fly.className   = isSpend ? 'coin-spend' : 'coin-earn';
  fly.textContent = isSpend ? `-${amount} 💎` : `+${amount} 💎`;
  fly.style.cssText = `position:absolute;left:50%;top:-0.25rem;transform:translateX(-50%);pointer-events:none;z-index:9999;white-space:nowrap;font-family:'Cinzel',serif;font-size:0.625rem;font-weight:700;color:${isSpend?'#e74c3c':'#a78bfa'};animation:coin-fly 0.9s ease-out forwards;`;
  container.appendChild(fly);
  setTimeout(() => fly.remove(), 950);
}

function spendCoins(amount) {
  if(gs.moedas < amount) return false;
  gs.moedas -= amount;
  showCoinAnim(amount, true);
  updateResourceUI();
  return true;
}

function earnCoins(amount) {
  gs.moedas += amount;
  playSound('coin');
  showCoinAnim(amount, false);
  updateResourceUI();
}

function feedCreature() {
  if(!canAct()) return;
  if(vitals.fome >= 100){ showBubble(t('bubble.satisfied')); return; }
  const COST = CUSTO_NUTRIR;
  if(gs.moedas < COST) { playSound('no_coins'); showBubble(t('bubble.no_coins')); addLog(t('log.feed_no_coins', { cost: COST }),'bad'); return; }
  if(!spendCoins(COST)) return;
  const g = 20 + randInt(0,15);
  vitals.fome = Math.min(100, vitals.fome + g);
  const pressaoBase = 30 + Math.round(Math.random() * 10);
  const pressaoGain = Math.round(pressaoBase * rarityBonus().decay * getItemEffect('fomeDecayMult'));
  poopPressure = Math.min(100, poopPressure + pressaoGain);
  const _rb = rarityBonus();
  xp += Math.round(5 * _rb.xp); vinculo += 2;
  const coinBonus = Math.round(2 * _rb.moedas);
  if(_rb.moedas > 1) setTimeout(() => earnCoins(coinBonus), 650);
  playSound('feed');
  playAnim('anim-eat');
  spawnFoodParticles();
  showBubble(rnd(FALAS.happy));
  showFloat(`+${g} 🍖`,'#e74c3c');
  addLog(t('log.fed', { gain: g, cost: COST }), 'good');
  checkXP(); updateAllUI(); scheduleSave();
}

function playCreature() {
  if(dead)     { showBubble(t('bubble.dead')); return; }
  if(!hatched || !avatar) { showBubble(t('bubble.no_avatar')); return; }
  if(sleeping) { showBubble(t('bubble.sleeping')); return; }
  if(vitals.fome < 10)   { showBubble(t('bubble.hungry')); return; }
  if(vitals.energia < 10){ showBubble(t('bubble.tired')); return; }
  openGameSelector();
}

/* ── BAPTIZAR: UMA VEZ, E FICA ──

   O renomear era ilimitado. Passa a ser um uso só: o avatar nasce com um
   nome sorteado, o dono pode pôr-lhe o seu, e nessa altura o nome fica
   permanente — é o que faz dele um nome e não uma etiqueta.

   O uso não expira. "Uma vez durante o nascimento" podia ler-se como uma
   janela que fecha, mas uma janela castiga quem esteve fora e não
   acrescenta permanência nenhuma: ela cumpre-se no instante em que o uso
   é gasto. Para a fechar, é o podeRenomear() em js/identidade.js que
   passa a olhar também para a idade ou para o nível.

   Quem já não pode não fica com um botão morto: fica um selo, que
   explica porque não há botão.

   ── E DEIXOU DE SER UM CAMPO DE TEXTO ──

   Era um lápis que trocava o nome por um input com SALVAR e CANCELAR:
   a interface de editar um campo. Um acto que se faz uma vez e fica
   para sempre não pode ter essa cara — o jogador só descobria que era
   definitivo depois de o ter feito.

   Passa a ser uma cerimónia (#batismoOverlay): o bicho de quem se
   fala, o nome com que ele nasceu, o nome que vai ficar a formar-se
   enquanto se escreve, e o aviso ANTES e não depois. */
function _batNomeLimpo(raw) {
  return String(raw || '').replace(/[^\p{L}\p{N}\s\-]/gu, '').trim().slice(0, 16);
}

/* A prévia é o nome INTEIRO — o próprio e a alcunha que ele mantém.
   Mostrar só a primeira metade escondia metade do que fica gravado, e
   é a metade que o jogador não escolhe. */
function _batPreVer() {
  const input = document.getElementById('renameInput');
  const alvo  = document.getElementById('batPrevia');
  const erro  = document.getElementById('batErro');
  if (!input || !alvo || !avatar) return;

  const limpo  = _batNomeLimpo(input.value);
  const sufixo = avatar.nome.split(',').slice(1).join(',').trim();

  if (!limpo) {
    alvo.textContent = '—';
    alvo.classList.add('vazio');
    if (erro) erro.textContent = input.value.trim() ? t('bubble.invalid_name') : '';
    return;
  }
  alvo.classList.remove('vazio');
  alvo.textContent = limpo + (sufixo ? ', ' + sufixo : '');
  if (erro) erro.textContent = '';
}

function startRename() {
  if(!avatar || dead) return;
  if(typeof podeRenomear === 'function' && !podeRenomear(avatar)) {
    playSound('error');
    showBubble(t('rename.selado'));
    return;
  }
  const ov = document.getElementById('batismoOverlay');
  if (!ov) return;

  const nomeVelho = avatar.nome.split(',')[0].trim();
  const velhoEl = document.getElementById('batNomeVelho');
  if (velhoEl) velhoEl.textContent = avatar.nome;

  // O bicho de quem se fala. Uma cerimónia sobre um avatar sem o avatar
  // à vista é um formulário com outro nome.
  const retrato = document.getElementById('batRetrato');
  if (retrato && typeof gerarSVG === 'function') {
    const fase = (typeof getFaseVisual === 'function') ? getFaseVisual() : 0;
    retrato.innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, 96, 96, fase);
  }

  const input = document.getElementById('renameInput');
  if (input) input.value = nomeVelho;
  _batPreVer();

  ov.classList.add('open');
  if (typeof lockBodyScroll === 'function') lockBodyScroll();
  setTimeout(() => { if (input) { input.focus(); input.select(); } }, 60);
}

function cancelRename() {
  const ov = document.getElementById('batismoOverlay');
  if (!ov) return;
  if (ov.classList.contains('open') && typeof unlockBodyScroll === 'function') unlockBodyScroll();
  ov.classList.remove('open');
}

function confirmRename() {
  const input = document.getElementById('renameInput');
  const clean = _batNomeLimpo(input ? input.value : '');

  /* Um nome que não sobrevive à limpeza não fecha a caixa em silêncio:
     diz o que falta e fica onde está. Fechar era o que ela fazia, e
     quem escrevesse só símbolos via a cerimónia desaparecer sem nada
     ter acontecido — e sem saber se o gasto tinha sido gasto. */
  if(!clean) {
    playSound('error');
    const erro = document.getElementById('batErro');
    if (erro) erro.textContent = t('bubble.invalid_name');
    if (input) input.focus();
    return;
  }

  // A segunda guarda, em quem FAZ. A de cima só apaga o caminho; esta é a
  // que impede — um clique repetido, um estado antigo na tela, ou um
  // caminho novo que ninguém previu.
  if(typeof podeRenomear === 'function' && !podeRenomear(avatar)) {
    cancelRename();
    playSound('error');
    showBubble(t('rename.selado'));
    return;
  }

  const parts  = avatar.nome.split(',');
  const suffix = parts.slice(1).join(',');
  avatar.nome  = clean + (suffix ? ',' + suffix : '');
  // E fica. Daqui em diante este avatar chama-se isto, para quem o comprar
  // e para qualquer árvore em que venha a aparecer.
  if(typeof travarNome === 'function') travarNome(avatar);

  fillCreatureCard();
  cancelRename();

  if(walletAddress) scheduleSave();
  playSound('rename');
  addLog(t('log.renamed', { name: clean }), 'good');
  showBubble(t('rename.feito', { name: clean }));
  updateAllUI();
}
