// GAME LOOP
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
// POOP & HYGIENE SYSTEM
// ═══════════════════════════════════════════
/* Seis lugares fixos no chão.
   Tinham todos o mesmo `bottom`, o que punha os seis numa linha reta
   perfeita — nada cai assim. Agora cada um tem a sua altura, entre
   1.3125 e 1.75rem, e o `z` acompanha: quem está mais à frente (bottom
   menor) tapa quem está atrás. É o que dá profundidade ao chão. */
const POOP_POSITIONS = [
  {left:'12%', bottom:'1.375rem',  z:10},
  {left:'27%', bottom:'1.6875rem', z: 7},
  {left:'41%', bottom:'1.3125rem', z:11},
  {left:'56%', bottom:'1.75rem',   z: 6},
  {left:'70%', bottom:'1.4375rem', z: 9},
  {left:'83%', bottom:'1.625rem',  z: 8},
];

/* Qual o primeiro lugar vago.
   Antes era POOP_POSITIONS[poopCount % 6] — escolhia pela CONTAGEM, não
   por lugar livre. Bastava limpar um do meio para o seguinte nascer
   exatamente em cima de outro: com três no chão, limpar o primeiro punha
   a contagem a 2 e o próximo ia para o lugar 2, que estava ocupado.
   Dois cocós sobrepostos ao pixel, e o jogador só conseguia limpar um.
   Agora pergunta-se ao DOM quem está lá, que é a única fonte fiável —
   a contagem e os elementos podem divergir. */
/* Varre os que ficaram a meio de sair.
   O removePoop tira o elemento do DOM 200ms depois, por temporizador — e
   um temporizador não é garantido: com a aba em segundo plano o browser
   estrangula-os, e o elemento fica lá com dataset.saindo posto. Invisível
   (está em scale(0)), a ocupar o lugar, e imune a cliques por causa da
   guarda do clique duplo. Um cocó trancado.
   Isto corre antes de procurar lugar e antes de restaurar: se algum ficou
   pendurado, sai agora. */
function _cocoLimparPendentes() {
  document.querySelectorAll('#poopContainer .poop[data-saindo]').forEach(e => e.remove());
}

function _cocoSlotLivre() {
  _cocoLimparPendentes();
  const postos = new Set(
    [...document.querySelectorAll('#poopContainer .poop')].map(e => e.dataset.slot)
  );
  for(let i = 0; i < POOP_POSITIONS.length; i++) {
    if(!postos.has(String(i))) return i;
  }
  return -1;
}

/* Só o elemento. Isto era escrito duas vezes — aqui e no js/auth.js, que
   recria os cocós ao entrar — e as duas cópias tinham de andar a par. */
function _criarCoco(slot) {
  const container = document.getElementById('poopContainer');
  if(!container || slot < 0) return null;
  const pos = POOP_POSITIONS[slot];
  const el = document.createElement('div');
  el.className = 'poop';
  el.dataset.slot = String(slot);
  el.style.left   = pos.left;
  el.style.bottom = pos.bottom;
  el.style.zIndex = pos.z;
  el.title = t('gt.poop.title');
  // O tamanho vai por variável e não por transform em linha. Em linha era
  // ignorado: o .poop tem animation:poop-appear a animar o transform, e
  // uma animação ganha ao estilo em linha. O cocó crescia até scale(1),
  // a animação acabava, e só então saltava para o tamanho sorteado.
  // Com a variável, os quadros e o repouso falam do mesmo número.
  el.style.setProperty('--esc', (.8 + Math.random() * .4).toFixed(2));
  el.textContent = '💩';
  el.onclick = (e) => { e.stopPropagation(); removePoop(el); };
  container.appendChild(el);
  return el;
}

/* Recria o chão a partir da contagem gravada, ao entrar no jogo. */
function restaurarCocos() {
  const container = document.getElementById('poopContainer');
  if(!container) return;
  _cocoLimparPendentes();
  container.innerHTML = '';
  const quantos = Math.min(Math.max(0, poopCount|0), POOP_POSITIONS.length);
  for(let i = 0; i < quantos; i++) _criarCoco(i);
  poopCount = quantos;   // clamp: uma contagem gravada acima de 6 mentia
}

function spawnPoop() {
  if(poopCount >= POOP_POSITIONS.length) return;
  const slot = _cocoSlotLivre();
  if(slot < 0) return;
  if(!_criarCoco(slot)) return;

  poopCount++;
  dirtyLevel = Math.min(3, Math.floor(poopCount / 2));
  // O Pano das Marés parte a rajada ao meio. É aqui e não no desgaste
  // porque é daqui que vem a pressão na higiene: 18 de uma vez a cada
  // ~3 refeições, contra 0,12 por segundo a decair.
  const perdaHigiene = Math.round(18 * getItemEffect('poopHigieneMult'));
  vitals.higiene = Math.max(0, vitals.higiene - perdaHigiene);

  addLog(t('gt.poop.log'), 'bad');
  showBubble(t('gt.poop.bub'));
  playAnim('anim-poop');
  const wrap = document.getElementById('creatureWrap');
  if(wrap) {
    ['-0.75rem','0','0.75rem'].forEach((px, i) => {
      const cl = document.createElement('div');
      cl.className = 'poop-cloud';
      cl.textContent = ['💨','💩','😖'][i];
      cl.style.cssText = `--px:${px};bottom:1.875rem;left:50%;animation-delay:${i*0.12}s`;
      wrap.appendChild(cl);
      setTimeout(() => cl.remove(), 1400);
    });
  }
}

function removePoop(el) {
  // O elemento só sai do DOM 200ms depois, para se ver encolher. Nesses
  // 200ms continuava clicável, e dois cliques no mesmo cocó tiravam dois
  // da conta, davam vínculo a dobrar e disparavam a animação duas vezes.
  if(el.dataset.saindo) return;
  el.dataset.saindo = '1';
  el.style.pointerEvents = 'none';
  // O lugar liberta-se agora, não daqui a 200ms. Enquanto o elemento
  // encolhia continuava a ocupar o slot, e um cocó que nascesse nessa
  // janela era descartado sem aviso — o _cocoSlotLivre não achava lugar
  // e o spawnPoop desistia em silêncio. Medido: acontecia mesmo.
  delete el.dataset.slot;

  el.style.transform = 'scale(0)';
  el.style.transition = 'transform .2s';
  setTimeout(() => el.remove(), 200);
  poopCount = Math.max(0, poopCount - 1);
  dirtyLevel = Math.min(3, Math.floor(poopCount / 2));
  vinculo += 2;
  playAnim('anim-clean', false);
  showFloat(t('gt.bath.bub_0'), '#a78bfa');
  updateAllUI();
  scheduleSave();
}

function cleanCreature() {
  // O canAct() já barra quem dorme (e mostra o balão). Havia aqui um
  // segundo if(sleeping) que nunca corria.
  if(!canAct()) return;
  if(vitals.energia < BANHO_ENERGIA) { showBubble(t('gt.bath.no_energy')); return; }

  vitals.energia = Math.max(0, vitals.energia - BANHO_ENERGIA);

  const higieneGain = Math.round(50 + Math.random() * 20);
  const humorGain   = 15;
  vitals.higiene = Math.min(100, vitals.higiene + higieneGain);
  vitals.humor   = Math.min(100, vitals.humor   + humorGain);
  vinculo += 3;

  playSound('bath');
  playAnim('anim-clean', false);
  spawnBathParticles();

  showBubble(rnd([t('gt.bath.bub_0'), t('gt.bath.bub_1'), t('gt.bath.bub_2'), t('gt.bath.bub_3')]));
  showFloat(`+${higieneGain} 🛁`, '#5ab4e8');
  setTimeout(() => showFloat(`+${humorGain} 😄`, '#a78bfa'), 500);
  addLog(t('gt.bath.log', {hygiene: higieneGain, humor: humorGain}), 'good');

  // Havia aqui um decaimento de vínculo — somava 3 acima e tirava 0,02
  // logo a seguir. Era lógica de tick que foi parar dentro da ação, e o
  // humorBad era avaliado DEPOIS do +15 que o próprio banho dá, portanto
  // quase nunca disparava. O vínculo decai no tick, que é o sítio dele.
  updateDirtyVisuals();
  updateAllUI();          // as outras ações já o faziam; esta esperava pelo tick
  scheduleSave();
}

function spawnBathParticles() {
  const wrap = document.getElementById('creatureWrap');
  if(!wrap) return;

  const curtain = document.createElement('div');
  curtain.className = 'bath-curtain';
  wrap.appendChild(curtain);
  setTimeout(() => curtain.remove(), 1000);

  for(let i = 0; i < 10; i++) {
    setTimeout(() => {
      const d = document.createElement('div');
      d.className = 'bath-drop';
      d.textContent = ['💧','💦'][i % 2];
      d.style.left = `${8 + i * 8 + (Math.random()*6-3)}%`;
      d.style.setProperty('--fall', (90 + Math.random() * 60).toFixed(0) + 'px');
      d.style.setProperty('--dur',  (0.4 + Math.random() * 0.25).toFixed(2) + 's');
      wrap.appendChild(d);
      setTimeout(() => d.remove(), 800);
    }, i * 40);
  }

  [200, 380].forEach((delay, i) => {
    setTimeout(() => {
      const ring = document.createElement('div');
      ring.className = 'bath-ring';
      ring.style.setProperty('--rsize', (50 + i * 20) + 'px');
      wrap.appendChild(ring);
      setTimeout(() => ring.remove(), 650);
    }, delay);
  });

  for(let i = 0; i < 6; i++) {
    setTimeout(() => {
      const b = document.createElement('div');
      b.className = 'bath-bubble';
      b.textContent = '🫧';
      b.style.left = `${12 + i * 14}%`;
      b.style.bottom = `${15 + Math.random() * 20}%`;
      b.style.fontSize = `${(10 + Math.random() * 8)/16}rem`;
      b.style.setProperty('--rise', (50 + Math.random() * 40).toFixed(0) + 'px');
      wrap.appendChild(b);
      setTimeout(() => b.remove(), 900);
    }, 350 + i * 70);
  }

  const sparkles = ['✨','💫','⭐','✨','💫','✨'];
  sparkles.forEach((e, i) => {
    setTimeout(() => {
      const s = document.createElement('div');
      s.className = 'bath-sparkle';
      s.textContent = e;
      const angle = (i / sparkles.length) * Math.PI * 2;
      const dist  = 38 + Math.random() * 18;
      s.style.left   = `calc(50% + ${((Math.cos(angle) * dist).toFixed(0))/16}rem)`;
      s.style.bottom = `calc(40% + ${((Math.sin(angle) * dist).toFixed(0))/16}rem)`;
      wrap.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }, 700 + i * 55);
  });

  ['🌸','🌿','🫧','💎','🌸'].forEach((e, i) => {
    setTimeout(() => {
      const sc = document.createElement('div');
      sc.className = 'bath-scent';
      sc.textContent = e;
      sc.style.left = `${15 + i * 17}%`;
      sc.style.setProperty('--sway', (i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 8) + 'px');
      wrap.appendChild(sc);
      setTimeout(() => sc.remove(), 1300);
    }, 1100 + i * 80);
  });
}

/* Redesenha o avatar quando a fase VISTA muda.
   Duas coisas foram corrigidas aqui.
   Primeira: desenha pela getFaseVisual(), não pela getFase() — o corpo
   espera pela cerimónia.
   Segunda, e esta era um estrago diário: não havia guarda nenhuma, e o
   tick chama isto de cinco em cinco minutos (linha ~458). Cada chamada
   fazia innerHTML = gerarSVG(...), criando um svg novo. Medido: as dez
   animações de repouso reiniciavam a zero — perdendo o escalonamento dos
   membros, que voltavam todos a sincronizar — e seis gestos em curso eram
   destruídos. Quem estivesse a comer ou a tomar banho quando o tick
   calhasse via a animação morrer a meio.
   Agora só regenera quando há de facto o que mudar. */
function updateAvatarSize() {
  const wrap = document.getElementById('creatureSVG');
  if(!wrap || !hatched || dead) return;
  const sz    = getFaseSize();
  const fase  = getFaseVisual();
  const marca = avatar ? `${avatar.seed}|${fase}|${sz}` : '';
  if(avatar && wrap.dataset.marca === marca) return;   // nada mudou
  if(avatar) {
    wrap.dataset.marca = marca;
    wrap.innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, sz, sz, fase);
  } else {
    const svg = wrap.querySelector('svg');
    if(svg) { svg.setAttribute('width', sz); svg.setAttribute('height', sz); }
  }
  wrap.style.width  = sz + 'px';
  wrap.style.height = sz + 'px';
  if(sleeping) positionSleepEyes();
}

function updateDirtyVisuals() {
  const screen  = document.querySelector('.screen');
  const wrap    = document.getElementById('creatureWrap');
  const dirts   = document.querySelectorAll('.dirt-spot');
  const stinks  = document.querySelectorAll('.stink');

  if(!screen || !wrap) return;

  const dirtyPct = parseFloat(Math.max(0, (1 - vitals.higiene / 100)).toFixed(3));
  screen.style.setProperty('--dirty', dirtyPct);
  wrap.style.setProperty('--dirty', dirtyPct);

  dirts.forEach((d, i) => {
    const threshold = 0.30 + i * 0.12;
    d.classList.toggle('visible', dirtyPct >= threshold);
  });

  stinks.forEach((st, i) => {
    st.style.opacity = dirtyLevel >= 2 ? '1' : '0';
    st.style.animationPlayState = dirtyLevel >= 2 ? 'running' : 'paused';
  });

  wrap.classList.toggle('dirty-creature', dirtyLevel >= 2);
  screen.classList.toggle('dirty', dirtyLevel >= 1);
}

// ═══════════════════════════════════════════════════════════════════
// BÔNUS ELEMENTAIS PASSIVOS
// Retorna multiplicadores para cada stat baseado no elemento do avatar.
// Todos os 9 elementos têm um bônus distinto.
// Multiplicador < 1.0 = decay mais lento (bônus positivo).
// Multiplicador > 1.0 = recuperação mais rápida (bônus positivo).
// ═══════════════════════════════════════════════════════════════════
function getElementoBonus(quem) {
  const elem = (quem || avatar)?.elemento;
  switch(elem) {
    case 'Fogo':
      // Espírito Ardente — metabolismo acelerado compensado por ânimo elevado
      return { fomeDecay: 1.10, humorDecay: 0.85, energiaDecay: 1.0, higieneDecay: 1.0, sleepEnergy: 1.0, vinculoDecay: 1.0 };
    case 'Água':
      // Serenidade das Marés — humor se mantém, higiene melhor
      return { fomeDecay: 1.0, humorDecay: 0.85, energiaDecay: 1.0, higieneDecay: 0.85, sleepEnergy: 1.0, vinculoDecay: 1.0 };
    case 'Terra':
      // Raízes Profundas — fome decai mais devagar
      return { fomeDecay: 0.85, humorDecay: 1.0, energiaDecay: 1.0, higieneDecay: 1.0, sleepEnergy: 1.0, vinculoDecay: 1.0 };
    case 'Vento':
      // Leveza do Vento — energia decai mais devagar
      return { fomeDecay: 1.0, humorDecay: 1.0, energiaDecay: 0.85, higieneDecay: 1.0, sleepEnergy: 1.0, vinculoDecay: 1.0 };
    case 'Sombra':
      // Ciclo Lunar — dorme melhor e gasta menos energia acordada, mas o
      // humor cai mais depressa: é o único elemento que paga por aquilo
      // que ganha, tirando o Fogo.
      //
      // Havia aqui mais DOIS return por baixo deste, inalcançáveis, de
      // versões anteriores — um deles dava higiene 0.90, que é o que o
      // comentário antigo prometia com "higiene estável". Ficam os
      // valores que estavam mesmo a correr: mexer nisto é rebalancear a
      // Sombra, e isso é decisão de desenho, não limpeza de código.
      return { fomeDecay: 1.0, humorDecay: 1.10, energiaDecay: 0.90, higieneDecay: 1.0, sleepEnergy: 1.15, vinculoDecay: 1.0 };
    default:
      return { fomeDecay: 1.0, humorDecay: 1.0, energiaDecay: 1.0, higieneDecay: 1.0, sleepEnergy: 1.0, vinculoDecay: 1.0 };
  }
}

/* ═══════════════════════════════════════════════════════════════════
   A FAZENDA — todos vivem ao mesmo tempo

   Havia aqui um recuperarEnergiaNoBanco. O jogo tinha um avatar ATIVO,
   que decaía e crescia, e um banco onde os outros ficavam congelados —
   só recuperavam energia, a metade do ritmo, e a sua saúde parava em 1
   para nunca morrerem sem o dono ver.

   Esse desenho discordava do combate. A batalha pede três avatares e
   cobra energia aos três, mas só um envelhecia: a fase sai de
   faseFromAge(totalSecs) e o totalSecs só avançava para o ativo,
   portanto três adultos custavam sessenta horas em série, com troca
   manual de slot entre cada um. E os cartões da coleção não mostravam
   um único vital, por isso nem dava para saber como estavam os outros.

   Agora não há banco. Todos os avatares chocados vivem: envelhecem,
   têm fome, ficam sujos, adoecem. O que era "o ativo" passa a ser só
   "o que estou a ver na tela de cuidar", e a escolha de quem luta
   mudou-se para a página de batalha.

   A ausência não mudou: enquanto o jogador está fora nada decai (o
   gameTick não corre), e quem estiver a dormir recupera energia na
   volta. O que era verdade para um passa a ser verdade para dez.

   NOTA SOBRE A MORTE. A saúde continua a parar em MORTE_MINIMA para
   quem não está aberto na tela de cuidar. O argumento antigo — "não
   morre sem o dono ver" — enfraqueceu, porque agora vêem-se todos de
   relance na tela principal; mas dez avatares a poder morrer de uma vez
   é uma perda grande e irreversível, e eles valem dinheiro no mercado.
   Fica no conservador, num sítio só, e é uma linha para mudar.
   ═══════════════════════════════════════════════════════════════════ */

// A saúde de quem não está aberto na tela de cuidar não desce abaixo
// disto. Põe a 0 para deixar morrer em qualquer lado.
const MORTE_MINIMA = 1;

// Um ciclo do gameTick são 60 segundos reais.
const SEGUNDOS_POR_CICLO = 60;

function viverTodos() {
  if (typeof avatarSlots === 'undefined') return;
  avatarSlots.forEach((s, i) => {
    // O que está aberto na tela de cuidar corre pelo caminho de baixo,
    // com bolhas, cocó e animações. Este trata dos outros.
    if (!s || i === activeSlotIdx) return;
    if (!s.hatched || s.dead || !s.vitals) return;

    // ── O TEMPO ──
    // É isto que derruba a parede das sessenta horas: a idade passa a
    // correr para a coleção toda, não só para um.
    s.totalSecs = (s.totalSecs || 0) + SEGUNDOS_POR_CICLO;

    // Cada um decai com a SUA raridade e o SEU elemento. Os efeitos de
    // itens ficam de fora aqui de propósito: o getItemEffect lê o
    // inventário do avatar aberto, e aplicá-lo aos outros dava a todos
    // o amuleto de um só.
    const d  = rarityBonus(s).decay;
    const eb = getElementoBonus(s);
    const v  = s.vitals;

    if (s.sleeping) {
      v.energia = Math.min(100, (v.energia ?? 100) + 4 * eb.sleepEnergy);
      v.fome    = Math.max(0, (v.fome    ?? 100) - 0.30 * d * eb.fomeDecay);
      v.higiene = Math.max(0, (v.higiene ?? 100) - 0.05 * eb.higieneDecay);
      if (v.energia >= 100) s.sleeping = false;
    } else {
      v.fome    = Math.max(0, (v.fome    ?? 100) - 0.8  * d * GAME_SPEED * eb.fomeDecay);
      v.humor   = Math.max(0, (v.humor   ?? 100) - 1.5  * d * GAME_SPEED * eb.humorDecay);
      v.energia = Math.max(0, (v.energia ?? 100) - 0.6  * d * GAME_SPEED * eb.energiaDecay);
      v.higiene = Math.max(0, (v.higiene ?? 100) - 0.12 * GAME_SPEED     * eb.higieneDecay);
      // Adormece sozinho com a energia no fim, tal como o que está aberto.
      if (v.energia < 5) s.sleeping = true;
    }

    // ── STRESS E DOENÇAS ──
    // Mesmos limiares do ciclo de baixo. Sem isto, deixar um avatar
    // fechado era imunidade: passava fome sem nunca adoecer.
    if (!s.diseaseStress) {
      s.diseaseStress = { exaustao:0, desnutricao:0, infeccao:0, melancolia:0, fratura:0 };
    }
    const st = s.diseaseStress;
    if (!s.sleeping) {
      st.exaustao    = v.energia < 20 ? (st.exaustao    || 0) + 1 : 0;
      st.desnutricao = v.fome    < 15 ? (st.desnutricao || 0) + 1 : 0;
      st.infeccao    = v.higiene < 15 ? (st.infeccao    || 0) + 1 : 0;
      st.melancolia  = v.humor   < 20 ? (st.melancolia  || 0) + 1 : 0;
    } else {
      st.exaustao = 0;
    }

    if (!s.activeDiseases) s.activeDiseases = [];
    for (const id of Object.keys(DISEASES)) {
      if (DISEASES[id].limiar == null) continue;   // a fratura vem da batalha
      if ((st[id] || 0) >= DISEASE_STRESS_THRESHOLD && !s.activeDiseases.includes(id)) {
        s.activeDiseases.push(id);
      }
    }

    if (s.activeDiseases.length > 0) {
      v.saude = Math.max(MORTE_MINIMA,
        (v.saude ?? 100) - DISEASE_DECAY_PER_CYCLE * s.activeDiseases.length);
    }
    s.sick = (v.saude ?? 100) < 20 || s.activeDiseases.length > 0;

    /* ── E TAMBÉM FAZ COCÓ ──

       Até aqui só sujava a casa o avatar que estava aberto, porque a
       pressão só subia ao alimentar e ao jogar — duas coisas que só
       se fazem a quem se está a ver. Os outros nove viviam, tinham
       fome, adoeciam e morriam, mas a casa deles ficava limpa.

       Aqui a pressão sobe com o TEMPO e não com a refeição, que é a
       única coisa que um avatar fechado tem. E sobe só enquanto
       houver comida lá dentro: quem está a passar fome não tem o que
       digerir. Isso faz do descuido uma coisa coerente — deixa-se um
       avatar à míngua e ele deixa de sujar, o que não é prémio
       nenhum, é só o corpo dele a não ter nada para dar.

       Quem dorme também não: é a mesma regra do ciclo de baixo. */
    if (!s.sleeping && (v.fome ?? 100) > 20) {
      s.poopPressure = (s.poopPressure || 0) + 1.5 * GAME_SPEED;
    }
    if (!s.sleeping && (s.poopPressure || 0) >= 100) {
      s.poopPressure = 0;
      // Seis é o que cabe no chão do ecrã (POOP_POSITIONS): passar
      // disso guardava um número que a interface não sabe desenhar.
      if ((s.poopCount || 0) < POOP_POSITIONS.length) {
        s.poopCount = (s.poopCount || 0) + 1;
        s.dirtyLevel = Math.min(3, Math.floor(s.poopCount / 2));
        v.higiene = Math.max(0, (v.higiene ?? 100) - 18);
      }
    }
  });
}

function gameTick() {
  /* ── O MUNDO PARADO ──

     Duas coisas param aqui, e uma delas já se dizia por escrito sem
     nunca ter sido feita.

     O `document.hidden`: o auth.js e o main.js prometem os dois, em
     comentário, que "nada decai enquanto a aba está escondida". Nada
     no código o garantia — o setInterval continua a correr numa aba de
     segundo plano, só estrangulado pelo navegador. Portanto o desgaste
     continuava, mais devagar, e o quanto dependia de que navegador o
     jogador usasse. A promessa passa a ser cumprida.

     O `jogoPausado`: o botão. É a mesma paragem e não uma segunda —
     duas noções de "o mundo está parado" divergem, e já vimos isso
     acontecer quatro vezes neste projeto.

     Sai antes do tickCount e antes do totalSecs de propósito: a idade
     do avatar é tempo de JOGO, não tempo de relógio, e é ela que decide
     a evolução. Se o contador andasse com o jogo parado, pausar passava
     a ser uma forma de envelhecer de graça. */
  if (jogoPausado || document.hidden) return;

  tickCount++;
  if(hatched && !dead) totalSecs++;

  if(hatched && !dead && !bornAt) {
    bornAt = Date.now();
    if(avatar) avatar.bornAt = bornAt;
    scheduleSave();
  }

  if(!hatched || dead || !avatar) return;

  updateAllUI();
  // Fica ANTES do guarda dos 60. Atrás dele, uma doença apanhada numa
  // batalha ou herdada de uma troca de avatar só aparecia na próxima
  // fronteira do minuto. A função sai sozinha quando nada mudou.
  if(typeof updateSickVisuals === 'function') updateSickVisuals();
  if(petCooldown > 0) petCooldown--;

  if(tickCount % 60 !== 0) return; // 1 ciclo = 60s reais

  // ── TODOS OS OUTROS VIVEM TAMBÉM ──
  viverTodos();

  // E a colônia mostra isso ao vivo, se for ela que está aberta.
  if (typeof fzAtualizarVitais === 'function') fzAtualizarVitais();

  const _d  = rarityBonus().decay;
  const _eb = getElementoBonus(); // bônus elementais passivos

  // ── RECUPERAÇÃO / DECAY DE ENERGIA ──
  if(sleeping) {
    // Dormindo → recupera energia, fome e higiene ainda decaem (mais devagar)
    vitals.energia = Math.min(100, vitals.energia + (4 * getItemEffect('sleepEnergyMult') * _eb.sleepEnergy));
    vitals.fome    = Math.max(0, vitals.fome    - (0.30 * _d * _eb.fomeDecay   * getItemEffect('fomeDecayMult')));
    vitals.higiene = Math.max(0, vitals.higiene - (0.05 * _eb.higieneDecay));
    if(vitals.energia >= 100) { wakeUp('full'); }

  } else {
    // Acordado e ativo → decay normal com bônus elementais e de itens
    vitals.fome    = Math.max(0, vitals.fome    - (0.8  * _d * GAME_SPEED * _eb.fomeDecay    * getItemEffect('fomeDecayMult')));
    vitals.humor   = Math.max(0, vitals.humor   - (1.5  * _d * GAME_SPEED * _eb.humorDecay   * getItemEffect('humorDecayMult')));
    vitals.energia = Math.max(0, vitals.energia - (0.6  * _d * GAME_SPEED * _eb.energiaDecay));
    vitals.higiene = Math.max(0, vitals.higiene - (0.12 * GAME_SPEED      * _eb.higieneDecay));
  }

  // Auto-sleep: energia crítica e nenhum modal aberto
  if(!sleeping && hatched && !dead && vitals.energia < 5) {
    if(!ModalManager.anyOpen()) {
      showBubble(t('gt.autosleep.bub'));
      setTimeout(() => { if(typeof startSleep === 'function') startSleep(); }, 600);
    }
  }

  if(vitals.saude < 20 && !sick && Math.random() < (0.02 * GAME_SPEED)) {
    sick = true;
    showBubble(rnd(FALAS.sick));
    addLog(t('gt.sick.log'), 'bad');
  }

  // ── DOENÇAS — contadores de stress ──
  if(!sleeping) {
    diseaseStress.exaustao    = vitals.energia < 20 ? diseaseStress.exaustao    + 1 : 0;
    diseaseStress.desnutricao = vitals.fome    < 15 ? diseaseStress.desnutricao + 1 : 0;
    diseaseStress.infeccao    = vitals.higiene < 15 ? diseaseStress.infeccao    + 1 : 0;
    diseaseStress.melancolia  = vitals.humor   < 20 ? diseaseStress.melancolia  + 1 : 0;
  } else {
    diseaseStress.exaustao = 0;
  }
  for(const id of Object.keys(DISEASES)) {
    // Doenças sem limiar não nascem do descuido — a fratura vem da
    // batalha, e é lá que é ligada.
    if(DISEASES[id].limiar == null) continue;
    if(diseaseStress[id] >= DISEASE_STRESS_THRESHOLD && !activeDiseases.includes(id)) {
      activeDiseases.push(id);
      const d = DISEASES[id];
      addLog(t('gt.disease.log', {emoji: d.emoji, nome: d.nome}), 'bad');
      showBubble(t('gt.disease.bub', {emoji: d.emoji}));
    }
  }
  // Única fonte de perda de saúde do jogo — vitals críticos por si só não
  // causam dano direto, só levam a uma doença depois de sustidos por
  // DISEASE_STRESS_THRESHOLD ciclos (ver js/state.js).
  if(activeDiseases.length > 0) {
    vitals.saude = Math.max(0, vitals.saude - DISEASE_DECAY_PER_CYCLE * activeDiseases.length);
  }
  // ── COCÔ — só no modo ativo ──
  if(!sleeping && poopPressure >= 100) {
    playSound('poop_alert');
    spawnPoop();
    poopPressure = 0;
  }

  if(tickCount % 60 === 0 && walletAddress) scheduleSave();

  // Sujeira afeta o humor (a saúde só cai por doença — ver infecção, que já
  // é causada por higiene baixa sustida)
  if(dirtyLevel >= 1) vitals.humor = Math.max(0, vitals.humor - 0.1);

  // ── VÍNCULO — decaimento passivo (só modo ativo) ──
  if(!sleeping) {
    const humorBad = vitals.humor < 30;
    const decayV   = humorBad ? 0.05 : 0.02;
    vinculo = Math.max(0, vinculo - (decayV * _eb.vinculoDecay));
  }

  updateDirtyVisuals();

  if(vitals.saude <= 0) { killCreature(); return; }

  if(tickCount % (60 * 5) === 0) { autoSpeak(); updateEquippedDisplay(); updateAvatarSize(); }
  if(tickCount % 5 === 0 && typeof atualizarChamadaEvolucao === 'function') atualizarChamadaEvolucao();

  // ── POSTURA DE OVOS (apenas fase Adulto) ──
  if(getFase() === 3) {
    // Recalcula a partir do timestamp real — imune a drift do setInterval
    if(window._eggLayReadyAt && window._eggLayReadyAt > Date.now()) {
      eggLayCooldown = Math.ceil((window._eggLayReadyAt - Date.now()) / 60000);
    } else {
      eggLayCooldown = 0;
      window._eggLayReadyAt = 0;
    }
    const corner = document.getElementById('btnLayEggCorner');
    if(eggLayCooldown > 0) {
      const btn = document.getElementById('btnLayEgg');
      if(btn) btn.style.display = 'none';
      if(corner) corner.style.display = 'none';
    } else {
      const btn = document.getElementById('btnLayEgg');
      if(btn) btn.style.display = '';
      if(corner) {
        corner.style.display = 'block';
        corner.style.opacity = '1';
        corner.style.animation = 'egg-ready-pulse 1.4s ease-in-out infinite';
        corner.title = t('gt.egg_ready.corner');
        corner.textContent = '🥚';
      }
      if(!eggLayNotified) {
        eggLayNotified = true;
        showBubble(t('gt.egg_ready.bub'));
        addLog(t('gt.egg_ready.log'), 'leg');
      }
    }
  } else {
    const btn = document.getElementById('btnLayEgg');
    if(btn) btn.style.display = 'none';
  }

}

function autoSpeak() {
  if(sleeping) return;
  if(dirtyLevel >= 2)          showBubble(rnd(FALAS.dirty));
  else if(vitals.fome < 25)    showBubble(rnd(FALAS.hungry));
  else if(vitals.energia < 20) showBubble(rnd(FALAS.tired));
  else if(sick)                showBubble(rnd(FALAS.sick));
  else if(vitals.humor < 30)   showBubble(rnd(FALAS.bored));
  else if(Math.random() < .3)  showBubble(Math.random() < .35 ? rnd(FALAS.elemento) : rnd(FALAS.happy));
}

/* A playPhaseUp vivia aqui: som, salto de escala no avatar, clarão fixo
   no centro da tela, 16 partículas a explodir e o overlay #phaseUpOverlay
   com o nome da fase. Corria sozinha assim que o nível subia.
   Foi substituída pela cerimónia de js/evolucao.js, que espera o clique
   do jogador e diz o que mudou. Já ninguém a chamava. */

function killCreature() {
  dead = true;
  playSound('death');
  // Cancela qualquer save agendado e persiste imediatamente — garante dead:true no Firebase
  clearTimeout(_saveTimeout); _saveTimeout = null;
  saveToFirebase();
  // Backup server-side via RTDB onDisconnect — garante dead:true mesmo se browser fechar antes do Firestore salvar
  setPresenceDead(walletAddress, activeSlotIdx);
  ModalManager.closeAll();

  const name = avatar ? avatar.nome.split(',')[0] : 'Avatar';
  document.getElementById('deadAvatarName').textContent = name.toUpperCase();
  const diasVividos = bornAt ? Math.floor((Date.now() - bornAt) / (1000*60*60*24)) + 1 : 1;
  document.getElementById('deadStats').innerHTML =
    t('gt.dead.stats1', {nivel, fase: FASES[getFase()], n: eggsInInventory.length, s: eggsInInventory.length !== 1 ? 's' : ''}) + '<br>' +
    t('gt.dead.stats2', {dias: diasVividos, ds: diasVividos !== 1 ? 's' : '', vinculo: Math.floor(vinculo)});

  const souls = ['👻','✦','💀','✧','🌑'];
  const dp = document.getElementById('deadParticles');
  if(dp) {
    dp.innerHTML = '';
    for(let i=0;i<6;i++) {
      const s = document.createElement('div');
      s.className = 'dead-float-soul';
      s.textContent = souls[i%souls.length];
      s.style.cssText = `left:${15+Math.random()*70}%;bottom:${10+Math.random()*30}%;animation-delay:${(Math.random()*3).toFixed(1)}s;animation-duration:${(3+Math.random()*2).toFixed(1)}s;`;
      dp.appendChild(s);
    }
  }

  document.getElementById('aliveScreen').style.display = 'none';
  document.getElementById('deadScreen').style.display  = 'flex';
  document.getElementById('actionBtns').style.opacity  = '0';
  document.getElementById('actionBtns').style.pointerEvents = 'none';
  addLog(t('gt.dead.log', {nome: name}), 'bad');
  showBubble('...');
}

function checkXP() {
  const needed = xpParaNivel(nivel);
  if(xp >= needed) {
    const faseBefore = getFase();
    xp -= needed; nivel++;
    const faseAfter = getFase();
    const _pl = document.getElementById('phaseLabel');
    if(_pl) {
      _pl.textContent = t('gt.phase.label', {fase: FASES[faseAfter]});
      _pl.className = 'phase-label fase-' + FASES[faseAfter].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace('ê','e').replace('ç','c');
    }
    // A frase era sempre "ficou mais forte". Só é verdade de quatro em
    // quatro níveis: o FICHA_NIVEIS_POR_PONTO dá um ponto de ficha a cada
    // quatro. Nos outros três prometia-se uma coisa que não acontecera.
    addLog(t(_luSubiuPonto(nivel) ? 'gt.levelup.log' : 'gt.levelup.log_sem_ponto',
             {nivel}), 'leg');
    playLevelUp(nivel);
    if(faseAfter !== faseBefore) {
      // A fase foi GANHA, mas o corpo não muda já. Antes mudava aqui, e o
      // clarão que devia esconder a mudança só vinha 600ms depois — o
      // jogador via o bicho crescer e só a seguir recebia a fanfarra.
      // Agora aparece o convite no avatar e é ele que escolhe o momento.
      // Ver js/evolucao.js.
      if(typeof atualizarChamadaEvolucao === 'function') atualizarChamadaEvolucao();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   O QUE SE GANHA AO SUBIR DE NÍVEL

   O overlay dizia "NÍVEL UP! / NÍVEL 7" e mais nada, e o registo dizia
   sempre "seu avatar ficou mais forte". Fui verificar: o
   FICHA_NIVEIS_POR_PONTO é 4, portanto o ponto de ficha vem de quatro em
   quatro níveis. Em três de cada quatro subidas a frase prometia uma
   coisa que não tinha acontecido.

   Agora há duas mensagens e ambas são verdade. Quando o ponto vem, diz-se
   qual característica subiu e de quanto, em verde. Quando não vem, diz-se
   quantos níveis faltam — que transforma três subidas vazias em progresso
   visível, em vez de três mentiras pequenas.

   Isto NÃO é a cerimónia: o nível sobe muitas vezes e não deve pedir um
   clique. É a mesma janela de 1,8s de sempre, com uma linha a mais.
═══════════════════════════════════════════════════════════════════ */
function _luSubiuPonto(nv) {
  if (typeof pontosDoAvatar !== 'function' || !avatar) return false;
  try {
    return pontosDoAvatar(avatar.raridade, nv) > pontosDoAvatar(avatar.raridade, nv - 1);
  } catch (_) { return false; }
}

// Quantos níveis faltam para o próximo ponto de ficha.
function _luFaltamParaPonto(nv) {
  const passo = (typeof FICHA_NIVEIS_POR_PONTO !== 'undefined') ? FICHA_NIVEIS_POR_PONTO : 4;
  const proximo = passo * (Math.floor((nv - 1) / passo) + 1) + 1;
  return Math.max(1, proximo - nv);
}

function _luGanho(nv) {
  const el = document.getElementById('luGanho');
  if (!el) return;
  el.className = 'lu-ganho';
  el.textContent = '';
  if (!avatar || typeof fichaDeAvatar !== 'function') return;

  if (!_luSubiuPonto(nv)) {
    const faltam = _luFaltamParaPonto(nv);
    el.textContent = t('gt.levelup.faltam', { n: faltam, p: t(faltam === 1 ? 'gt.nivel_um' : 'gt.nivel_varios') });
    return;
  }

  // Subiu um ponto: descobre QUAL característica levou com ele.
  let antes, agora;
  try {
    antes = fichaDeAvatar(avatar.seed, avatar.raridade, avatar.elemento, nv - 1);
    agora = fichaDeAvatar(avatar.seed, avatar.raridade, avatar.elemento, nv);
  } catch (_) { return; }

  const nomes = { F: 'evo.f', H: 'evo.h', R: 'evo.r', A: 'evo.a', pv: 'evo.pv', pm: 'evo.pm' };
  const subiu = Object.keys(nomes).filter(k => agora[k] > antes[k]);
  if (!subiu.length) { el.textContent = t('gt.levelup.mais_forte'); return; }

  el.classList.add('mostra');
  el.innerHTML = subiu.map(k =>
    `<span class="lu-g-item">${t(nomes[k])} <b>${antes[k]} → ${agora[k]}</b></span>`
  ).join('');
}

function playLevelUp(newNivel) {
  playSound('levelup');
  const ov = document.getElementById('levelUpOverlay');
  if(!ov) return;

  document.getElementById('luText').textContent = t('gt.levelup.title');
  document.getElementById('luNivel').textContent = t('gt.levelup.nivel', {nivel: newNivel});
  _luGanho(newNivel);

  /* Aqui havia oito emojis de estrela (✦ ✧ ★ ✨ ⭐) a disparar para fora
     em oito posições fixas, e no HTML três anéis dourados concêntricos a
     expandir. Vocabulário de arcade, num jogo que é Cinzel, ouro e escuro
     — destoavam de tudo o resto.

     Ficam motas de luz a SUBIR. É a leitura certa para subir de nível, e
     lê-se como brasa ou pó de ouro em vez de confete. São 16, com
     tamanho, velocidade, atraso e desvio próprios: iguais entre si dariam
     chuva ao contrário, e o que se quer é uma coisa desordenada e lenta.

     Nascem espalhadas em largura mas todas em baixo, porque o movimento
     único (para cima) é que dá a leitura — espalhá-las também na vertical
     tirava-lhe o sentido. */
  ov.querySelectorAll('.lu-mota').forEach(m => m.remove());
  for (let i = 0; i < 16; i++) {
    const m = document.createElement('div');
    m.className = 'lu-mota';
    const tam = (2 + Math.random() * 3).toFixed(1);
    m.style.cssText =
      `left:${(8 + Math.random() * 84).toFixed(1)}%;` +
      `width:${tam}px;height:${tam}px;` +
      `--sobe:${(9 + Math.random() * 7).toFixed(1)}rem;` +
      `--desvio:${(Math.random() * 2.4 - 1.2).toFixed(2)}rem;` +
      `animation-duration:${(1.9 + Math.random() * 1.6).toFixed(2)}s;` +
      `animation-delay:${(Math.random() * 1.5).toFixed(2)}s;` +
      `opacity:0;`;
    ov.appendChild(m);
  }

  const clone = ov.cloneNode(true);
  ov.parentNode.replaceChild(clone, ov);

  clone.classList.add('active');
  clone.style.opacity = '1';

  /* Ficava 1,8s e desaparecia. Era pouco desde que passou a haver três
     linhas: o título entra aos 0,15s, o número aos 0,45 e o ganho aos
     0,8, portanto a última só assenta perto de 1,5 — sobrava meio segundo
     para a ler. Agora fica 3,2s e sai em 0,6.

     O overlay é pointer-events:none e nunca bloqueou nada, mas tapa a
     tela, e o nível sobe muitas vezes. Por isso qualquer toque ou tecla
     manda-o embora antes do tempo: quem quer ler, lê; quem já sabe o que
     diz, segue. É o mesmo pacto do prólogo. */
  let _luSaiu = false;
  const _luSair = (ms) => {
    if (_luSaiu) return;
    _luSaiu = true;
    document.removeEventListener('pointerdown', _luAtalho, true);
    document.removeEventListener('keydown', _luAtalho, true);
    clone.style.transition = `opacity ${ms}ms ease`;
    clone.style.opacity = '0';
    setTimeout(() => {
      clone.style.transition = '';
      clone.style.opacity = '';
      clone.classList.remove('active');
    }, ms + 60);
  };
  function _luAtalho() { _luSair(220); }   // saída rápida quando é a pedido

  setTimeout(() => {
    document.addEventListener('pointerdown', _luAtalho, true);
    document.addEventListener('keydown', _luAtalho, true);
  }, 450);   // não apanha o clique que causou a subida de nível

  setTimeout(() => _luSair(600), 3200);

  showBubble(rnd(FALAS.levelup));
}
