// ═══════════════════════════════════════════════════════════════════
// A CERIMÓNIA DA EVOLUÇÃO
//
// Antes: o avatar crescia sozinho, e 600ms DEPOIS vinha o clarão que
// devia ter escondido a mudança. O jogador via o corpo mudar e só a
// seguir recebia a fanfarra — a ordem estava trocada, e nada lhe dizia
// o que tinha mudado.
//
// Agora a fase ganha-se mas o corpo espera (ver faseVista em
// js/state.js). Aparece um convite no avatar, e é o jogador que decide
// quando. Ao clicar:
//
//   0ms     a tela escurece
//   500ms   o avatar aparece sozinho, ainda na fase antiga
//   900ms   carrega energia — pulsa e as partículas convergem
//   1700ms  CLARÃO. É por dentro dele que o svg troca de fase e de
//           tamanho: a mudança nunca se vê acontecer, só o antes e o
//           depois, que é o que a faz parecer transformação e não
//           substituição
//   2300ms  o corpo novo revela-se, e faz um gesto seu
//   3000ms  a ficha entra, com o que subiu em verde
//
// As partículas convergem PARA DENTRO, ao contrário das do playPhaseUp
// que explodiam para fora. Convergir lê-se como acumular; explodir, como
// acabar. Aqui ainda não acabou.
// ═══════════════════════════════════════════════════════════════════

// ── O convite, preso ao avatar ──────────────────────────────────────
function atualizarChamadaEvolucao() {
  const area = document.querySelector('.creature-area');
  if (!area) return;
  const ja = document.getElementById('chamadaEvolucao');
  const querem = (typeof evolucaoPendente === 'function') && evolucaoPendente()
              && typeof hatched !== 'undefined' && hatched
              && typeof dead !== 'undefined' && !dead
              && !(typeof sleeping !== 'undefined' && sleeping);

  if (!querem) { if (ja) ja.remove(); return; }
  if (ja) return;

  const el = document.createElement('button');
  el.id = 'chamadaEvolucao';
  el.className = 'chamada-evolucao';
  el.type = 'button';
  el.innerHTML = `<span class="ce-brilho"></span><span class="ce-txt">${t('evo.chamada')}</span>`;
  el.onclick = (e) => { e.stopPropagation(); abrirEvolucao(); };
  area.appendChild(el);
}

// ── A ficha antes e depois ──────────────────────────────────────────
// Compara o nível da última cerimónia com o de agora. Não é o nível
// anterior: entre duas evoluções cabem vários níveis, e o jogador quer
// ver tudo o que ganhou desde a última vez que olhou.
/* As duas fichas: a da última cerimónia e a de agora.

   Não é o nível anterior: entre duas evoluções cabem vários níveis, e o
   jogador quer ver tudo o que ganhou desde a última vez que olhou.

   A certidão vai nas duas — sem ela a ficha não tem índole, e a
   comparação do antes com o depois era entre dois avatares diferentes. */
function _evoFichas() {
  if (typeof fichaDeAvatar !== 'function' || !avatar) return null;
  const nvAntes = nivelVisto > 0 ? nivelVisto : Math.max(1, nivel - 1);
  try {
    return {
      antes: fichaDeAvatar(avatar.seed, avatar.raridade, nvAntes, avatar.nascimento),
      agora: fichaDeAvatar(avatar.seed, avatar.raridade, nivel, avatar.nascimento),
    };
  } catch (_) { return null; }
}

/* ── SÓ O QUE MUDOU ──

   O painel mostrava as seis linhas sempre, e as que não tinham subido
   ficavam apagadas a ocupar metade dele — quatro linhas a dizer "aqui
   não aconteceu nada" no meio de uma cerimónia que existe para dizer o
   que aconteceu.

   Ficam as que subiram. Se nenhuma subir — o que não devia acontecer,
   porque entre duas cerimónias passam quatro níveis no mínimo — mostram-
   se todas, que é melhor do que um painel vazio sem explicação. */
function _evoLinhasDaFicha() {
  const f = _evoFichas();
  if (!f) return [];

  const carac = [['F', 'evo.f'], ['H', 'evo.h'], ['R', 'evo.r'], ['A', 'evo.a'],
                 ['pv', 'evo.pv'], ['pm', 'evo.pm']];
  const todas = carac.map(([k, chave]) => ({
    nome: t(chave), de: f.antes[k], para: f.agora[k], subiu: f.agora[k] > f.antes[k],
  }));
  const subiram = todas.filter(l => l.subiu);
  return subiram.length ? subiram : todas;
}

/* ── O QUE ELE APRENDEU ──

   Faltava, e era o ganho mais concreto que uma evolução dá. A escada das
   magias (MAGIA_ESCADA, em js/magias.js) abre uma gaveta na fase 1 e
   outra na fase 2; as outras duas vêm do grau de raridade. O painel
   falava do corpo e dos números e nunca disto — o jogador chegava a
   JOVEM e só descobria a magia nova ao abrir a ficha por acaso.

   Não se lê da escada: lê-se do repertório ANTES e DEPOIS, e diz-se a
   diferença. Assim vale para as gavetas que abrem por fase e para as que
   abrem por raridade, sem esta função ter de saber qual é qual. */
function _evoMagiasNovas() {
  const f = _evoFichas();
  if (!f || typeof magiasDoAvatar !== 'function') return [];
  let antes, agora;
  try { antes = magiasDoAvatar(f.antes); agora = magiasDoAvatar(f.agora); }
  catch (_) { return []; }

  const novas = [];
  for (const papel of Object.keys(agora)) {
    if (antes[papel] || !agora[papel]) continue;
    novas.push({
      papel: t('mag.cat.' + papel),
      nome:  t('mag.' + agora[papel].id + '.nome'),
      pm:    agora[papel].pm,
    });
  }
  return novas;
}

// ── A cerimónia ─────────────────────────────────────────────────────
let _evoACorrer = false;

function abrirEvolucao() {
  if (_evoACorrer) return;
  if (typeof evolucaoPendente !== 'function' || !evolucaoPendente()) return;
  _evoACorrer = true;

  const faseAntiga = getFaseVisual();
  const faseNova   = getFase();
  const chamada = document.getElementById('chamadaEvolucao');
  if (chamada) chamada.remove();
  if (typeof ModalManager !== 'undefined' && ModalManager.closeAll) ModalManager.closeAll();
  if (typeof playSound === 'function') playSound('evolve');

  const ov = document.getElementById('evolucaoOverlay');
  if (!ov) { _evoConcluir(faseNova); return; }

  const palco   = ov.querySelector('.evo-palco');
  const svgBox  = ov.querySelector('#evoAvatar');
  const clarao  = ov.querySelector('.evo-clarao');
  const painel  = ov.querySelector('.evo-painel');
  const titulo  = ov.querySelector('#evoTitulo');
  const linhas  = ov.querySelector('#evoLinhas');
  const corpoUl = ov.querySelector('#evoCorpo');

  painel.classList.remove('mostra');
  clarao.classList.remove('dispara');
  palco.classList.remove('revelado');
  ov.classList.add('ativo');

  const tamAntes = FASE_SIZES[faseAntiga], tamDepois = FASE_SIZES[faseNova];
  const desenhar = (fase, tam) => {
    if (!avatar || typeof gerarSVG !== 'function') return;
    // Um pouco maior do que no jogo: aqui o bicho é o assunto.
    const t2 = Math.round(tam * 1.5);
    svgBox.innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, t2, t2, fase);
  };
  desenhar(faseAntiga, tamAntes);

  // 900ms — carrega
  const t1 = setTimeout(() => { palco.classList.add('carrega'); _evoParticulas(palco); }, 900);

  // 1700ms — o clarão, e a troca por dentro dele
  const t2 = setTimeout(() => {
    clarao.classList.add('dispara');
    setTimeout(() => {
      palco.classList.remove('carrega');
      desenhar(faseNova, tamDepois);
      palco.classList.add('revelado');
      // O corpo novo estreia-se com um gesto — se ganhou asas, abre-as.
      const svg = svgBox.querySelector('svg');
      if (svg && typeof avatarPartesReagem === 'function' && typeof _AV_ACAO_GESTOS !== 'undefined') {
        avatarPartesReagem(svg, _AV_ACAO_GESTOS.brincar);
      }
    }, 260);   // a meio do clarão, quando está mais branco
  }, 1700);

  // 3000ms — a ficha
  const t3 = setTimeout(() => {
    titulo.textContent = t('evo.titulo', { fase: FASES[faseNova] });
    const lin = _evoLinhasDaFicha();
    linhas.innerHTML = lin.length ? lin.map(l => `
      <div class="evo-linha${l.subiu ? ' subiu' : ''}">
        <span class="evo-nome">${l.nome}</span>
        <span class="evo-de">${l.de}</span>
        <span class="evo-seta">${l.subiu ? '→' : ''}</span>
        <span class="evo-para">${l.subiu ? l.para : ''}</span>
      </div>`).join('') : '';
    /* O QUE O CORPO GANHOU SAIU DAQUI.

       Eram três linhas a descrever o que o jogador estava a ver: "o
       corpo cresceu de 100 para 120 pixels" — e píxeis, ainda por cima,
       que é medida de dentro do desenho e não quer dizer nada a
       ninguém. O bicho novo está no ecrã dois centímetros acima. Uma
       cerimónia que descreve o que se vê está a duvidar do desenho.

       No lugar fica o que NÃO se vê: a magia que abriu. */
    const magias = _evoMagiasNovas();
    corpoUl.innerHTML = magias.map(m =>
      `<li><span class="evo-mag-papel">${m.papel}</span>` +
      `<span class="evo-mag-nome">${m.nome}</span>` +
      `<span class="evo-mag-pm">${t('mag.custo', { pm: m.pm })}</span></li>`).join('');
    // A secção inteira desaparece quando não há magia nova — um título
    // por cima de uma lista vazia lê-se como avaria.
    const subMagias = ov.querySelector('#evoSubMagias');
    if (subMagias) subMagias.style.display = magias.length ? '' : 'none';
    corpoUl.style.display = magias.length ? '' : 'none';
    const nvLinha = ov.querySelector('#evoNivel');
    if (nvLinha) {
      const de = nivelVisto > 0 ? nivelVisto : nivel;
      nvLinha.textContent = de < nivel ? t('evo.nivel.de_para', { de, para: nivel })
                                       : t('evo.nivel.so', { nivel });
    }
    painel.classList.add('mostra');
  }, 3000);

  ov._temporizadores = [t1, t2, t3];
}

function fecharEvolucao() {
  const ov = document.getElementById('evolucaoOverlay');
  const faseNova = getFase();
  if (ov) {
    (ov._temporizadores || []).forEach(clearTimeout);
    ov.classList.remove('ativo');
    setTimeout(() => {
      const b = ov.querySelector('#evoAvatar'); if (b) b.innerHTML = '';
    }, 600);
  }
  _evoConcluir(faseNova);
}

function _evoConcluir(faseNova) {
  faseVista  = faseNova;
  nivelVisto = nivel;
  _evoACorrer = false;
  if (typeof updateAvatarSize === 'function') updateAvatarSize();
  const pl = document.getElementById('phaseLabel');
  if (pl) pl.textContent = t('gt.phase.label', { fase: FASES[faseNova] });
  if (typeof addLog === 'function') {
    addLog(t('gt.phase.log', { nome: avatar ? avatar.nome.split(',')[0] : '', fase: FASES[faseNova] }), 'leg');
  }
  if (typeof showBubble === 'function') showBubble(t('gt.phase.bub', { fase: FASES[faseNova] }));
  if (typeof saveToFirebase === 'function') saveToFirebase();
  atualizarChamadaEvolucao();
}

// Partículas a convergir para o centro. O playPhaseUp fazia-as explodir
// para fora; aqui vão ao contrário porque isto é a carga, não o fim.
function _evoParticulas(palco) {
  const cores = ['#c4b5fd', '#fff', '#a78bfa', '#e9d5ff'];
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    const ang = (i / 14) * 360 + Math.random() * 12;
    const dist = 90 + Math.random() * 70;
    p.className = 'evo-part';
    p.style.cssText =
      `--dx:${(Math.cos(ang * Math.PI / 180) * dist) / 16}rem;` +
      `--dy:${(Math.sin(ang * Math.PI / 180) * dist) / 16}rem;` +
      `background:${cores[i % cores.length]};` +
      `animation-delay:${(Math.random() * 0.5).toFixed(2)}s;`;
    palco.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

window.registerStrings(
  {
    'evo.chamada':        '✦ ESTOU PRONTO PARA EVOLUIR',
    'evo.titulo':         'AGORA SOU {fase}',
    'evo.nivel.de_para':  'NÍVEL {de} → {para}',
    'evo.nivel.so':       'NÍVEL {nivel}',
    'evo.continuar':      'CONTINUAR',
    'evo.ficha':          '◆ O QUE SUBIU',
    'evo.corpo':          '◆ O QUE APRENDEU',
    'evo.f':  'Força',       'evo.h':  'Habilidade',
    'evo.r':  'Resistência', 'evo.a':  'Armadura',
    'evo.pv': 'Pontos de Vida', 'evo.pm': 'Pontos de Magia',
  },
  {
    'evo.chamada':        '✦ I AM READY TO EVOLVE',
    'evo.titulo':         'I AM NOW {fase}',
    'evo.nivel.de_para':  'LEVEL {de} → {para}',
    'evo.nivel.so':       'LEVEL {nivel}',
    'evo.continuar':      'CONTINUE',
    'evo.ficha':          '◆ WHAT ROSE',
    'evo.corpo':          '◆ WHAT IT LEARNED',
    'evo.f':  'Strength',  'evo.h':  'Skill',
    'evo.r':  'Endurance', 'evo.a':  'Armor',
    'evo.pv': 'Hit Points', 'evo.pm': 'Magic Points',
  }
);
