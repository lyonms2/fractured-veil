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
function _evoLinhasDaFicha() {
  if (typeof fichaDeAvatar !== 'function' || !avatar) return [];
  const nvAntes = nivelVisto > 0 ? nivelVisto : Math.max(1, nivel - 1);
  let antes, agora;
  try {
    // A certidão vai nas duas: sem ela a ficha não tem índole, e a
    // comparação do antes com o depois era entre dois avatares diferentes.
    antes = fichaDeAvatar(avatar.seed, avatar.raridade, nvAntes, avatar.nascimento);
    agora = fichaDeAvatar(avatar.seed, avatar.raridade, nivel, avatar.nascimento);
  } catch (_) { return []; }

  const carac = [['F', 'evo.f'], ['H', 'evo.h'], ['R', 'evo.r'], ['A', 'evo.a'],
                 ['pv', 'evo.pv'], ['pm', 'evo.pm']];
  return carac.map(([k, chave]) => ({
    nome: t(chave), de: antes[k], para: agora[k], subiu: agora[k] > antes[k],
  }));
}

// O que o CORPO ganhou nesta fase. Só o que é verdade: a fase 1 não
// acrescenta parte nenhuma, e dizer que sim seria mentir ao jogador.
function _evoGanhosDoCorpo(faseNova, faseAntiga) {
  const g = [];
  const tam = (typeof FASE_SIZES !== 'undefined') ? FASE_SIZES : [75, 100, 120, 140];
  g.push(t('evo.ganho.tamanho', { de: tam[faseAntiga], para: tam[faseNova] }));
  if (faseAntiga < 2 && faseNova >= 2) g.push(t('evo.ganho.corpo'));
  if (faseAntiga < 3 && faseNova >= 3) {
    // As asas são 70% por seed — não se promete o que pode não aparecer.
    // Pergunta-se ao avatar DA CERIMÓNIA, não ao do jogo: este já trocou
    // de fase dentro do clarão, enquanto o do jogo só muda ao fechar.
    // Perguntar ao do jogo dava sempre "não tem asas", e o ganho mais
    // vistoso da última evolução nunca seria anunciado.
    const temAsas = !!document.querySelector('#evoAvatar .av-asa > *');
    if (temAsas) g.push(t('evo.ganho.asas'));
    g.push(t('evo.ganho.ovos'));
  }
  return g;
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
    const ganhos = _evoGanhosDoCorpo(faseNova, faseAntiga);
    corpoUl.innerHTML = ganhos.map(g => `<li>${g}</li>`).join('');
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
    'evo.ficha':          '◆ FICHA',
    'evo.corpo':          '◆ O CORPO',
    'evo.f':  'Força',       'evo.h':  'Habilidade',
    'evo.r':  'Resistência', 'evo.a':  'Armadura',
    'evo.pv': 'Pontos de Vida', 'evo.pm': 'Pontos de Magia',
    'evo.ganho.tamanho':  'O corpo cresceu de {de} para {para} pixels',
    'evo.ganho.corpo':    'Ganhou o corpo inferior — já não é só cabeça e braços',
    'evo.ganho.asas':     'Nasceram asas',
    'evo.ganho.ovos':     'Já pode botar ovos',
  },
  {
    'evo.chamada':        '✦ I AM READY TO EVOLVE',
    'evo.titulo':         'I AM NOW {fase}',
    'evo.nivel.de_para':  'LEVEL {de} → {para}',
    'evo.nivel.so':       'LEVEL {nivel}',
    'evo.continuar':      'CONTINUE',
    'evo.ficha':          '◆ STATS',
    'evo.corpo':          '◆ THE BODY',
    'evo.f':  'Strength',  'evo.h':  'Skill',
    'evo.r':  'Endurance', 'evo.a':  'Armor',
    'evo.pv': 'Hit Points', 'evo.pm': 'Magic Points',
    'evo.ganho.tamanho':  'The body grew from {de} to {para} pixels',
    'evo.ganho.corpo':    'Gained a lower body — no longer just head and arms',
    'evo.ganho.asas':     'Wings appeared',
    'evo.ganho.ovos':     'Can now lay eggs',
  }
);
