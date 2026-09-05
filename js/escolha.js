// ═══════════════════════════════════════════════════════════════════
// A ESCOLHA DO ANCIÃO
//
// Ao chegar a ANCIÃO o avatar decide uma coisa, uma vez, e para sempre:
//
//   MAIS UMA VIRTUDE   ganha uma segunda vantagem
//   SEM O DEFEITO      deixa de ter a desvantagem com que nasceu
//
// ── PORQUE AS DUAS CUSTAM ──
//
// Uma vantagem paga-se em pontos; uma desvantagem dá-os. Portanto ganhar
// a segunda virtude gasta orçamento, e tirar o defeito devolve o que ele
// dava — o orçamento DESCE nos dois casos, e as características podem
// descer com ele.
//
// Isso é o que faz disto uma escolha e não um prémio. Se uma das opções
// fosse de graça não haveria decisão nenhuma: haveria a boa e a outra.
//
// E não quebra a promessa de que subir de nível só soma, porque isto não
// é subir de nível. É uma troca — e por isso a tela mostra os DOIS lados
// de cada opção antes de ele decidir, com os números ao lado do nome.
//
// ── PORQUE O JOGADOR NÃO ESCOLHE QUAL VIRTUDE ──
//
// Escolhe TER uma segunda, não qual. Se escolhesse qual, todos
// escolheriam a mesma e o avatar deixava de ser dele para ser uma
// receita. A segunda vem sorteada do feitio do DNA, como veio a
// primeira (ver sortearVantagens, em js/vantagens.js).
// ═══════════════════════════════════════════════════════════════════

// ── O convite, preso ao avatar ──────────────────────────────────────
// Mesmo lugar e mesmo gesto do convite da evolução: é a mesma família de
// momento — o jogo tem algo para o jogador e espera que ele venha.
function atualizarChamadaEscolha() {
  const area = document.querySelector('.creature-area');
  if (!area) return;
  const ja = document.getElementById('chamadaEscolha');

  /* A evolução tem prioridade e por isso este convite espera. Dois
     convites em cima do mesmo bicho competem entre si, e o da evolução
     vem primeiro na ordem das coisas: primeiro chega-se a ANCIÃO, e só
     depois se decide o que fazer com isso. */
  const evoAntes = (typeof evolucaoPendente === 'function') && evolucaoPendente();

  const querem = !evoAntes
              && (typeof podeEscolherAnciao === 'function') && podeEscolherAnciao()
              && typeof hatched !== 'undefined' && hatched
              && typeof dead !== 'undefined' && !dead
              && !(typeof sleeping !== 'undefined' && sleeping);

  if (!querem) { if (ja) ja.remove(); return; }
  if (ja) return;

  const el = document.createElement('button');
  el.id = 'chamadaEscolha';
  el.className = 'chamada-escolha';
  el.type = 'button';
  el.innerHTML = `<span class="ce-brilho"></span><span class="ce-txt">${t('esc.chamada')}</span>`;
  el.onclick = (e) => { e.stopPropagation(); abrirEscolha(); };
  area.appendChild(el);
}

// ── As três fichas ──────────────────────────────────────────────────
// A de hoje, e a de cada uma das duas opções. É com elas que se dizem os
// números: nada aqui é calculado à mão, senão a tela prometia uma coisa
// e a ficha entregava outra.
function _escFicha(qual) {
  if (typeof fichaDeAvatar !== 'function' || !avatar) return null;
  try { return fichaDeAvatar({ ...avatar, nivel, escolhaAnciao: qual }); }
  catch (_) { return null; }
}

/* Os pontos vêm à frente porque são a CAUSA: as outras linhas descem
   porque esta desceu. Sem ela o cartão mostrava seis consequências e
   nenhum motivo, e a queda parecia um castigo em vez de um preço. */
const ESC_LINHAS = [
  { k: 'pontos', rot: 'esc.pontos' },
  { k: 'F',  rot: 'evo.f'  }, { k: 'H',  rot: 'evo.h'  },
  { k: 'R',  rot: 'evo.r'  }, { k: 'A',  rot: 'evo.a'  },
  { k: 'pv', rot: 'evo.pv' }, { k: 'pm', rot: 'evo.pm' },
];

/* Só o que MUDA. As seis linhas sempre visíveis enchiam o cartão de
   valores iguais dos dois lados, e a diferença — que é o assunto todo —
   ficava a competir com quatro linhas que não diziam nada. */
function _escDiferencas(base, depois) {
  if (!base || !depois) return [];
  return ESC_LINHAS
    .filter(l => depois[l.k] !== base[l.k])
    .map(l => ({ nome: t(l.rot), de: base[l.k], para: depois[l.k],
                 sobe: depois[l.k] > base[l.k] }));
}

// ── Um cartão ───────────────────────────────────────────────────────
function _escCartao(qual, base) {
  const f = _escFicha(qual);
  if (!f) return '';

  /* A carta de que a opção fala: a virtude oferecida, ou o defeito que
     sai. Vêm da ficha SEM escolha feita — é ela que sabe o que está em
     jogo antes de haver escolha nenhuma. */
  const carta = (qual === 'vantagem') ? base.vantagemOferta : base.desvantagem;
  if (!carta) return '';

  const dif = _escDiferencas(base, f);
  const linhas = dif.length
    ? dif.map(d => `<div class="esc-dif ${d.sobe ? 'sobe' : 'desce'}">
         <span class="esc-dif-nome">${d.nome}</span>
         <span class="esc-dif-de">${d.de}</span>
         <span class="esc-dif-seta">→</span>
         <span class="esc-dif-para">${d.para}</span>
       </div>`).join('')
    : `<div class="esc-dif-nada">${t('esc.sem_mudanca')}</div>`;

  /* O preço, dito na direção certa. Escrevi primeiro "devolve 1" para o
     defeito que sai, e lia-se ao contrário do que acontece: quem devolve
     é o AVATAR, que abre mão dos pontos que o defeito lhe dava. Um
     jogador a ler "devolve" entende que recebe. As duas opções tiram, e
     por isso as duas se dizem a tirar. */
  const preco = (qual === 'vantagem')
    ? t('esc.preco.paga',   { n: Math.abs(carta.custo) })
    : t('esc.preco.abre_mao', { n: Math.abs(carta.custo) });

  return `<div class="esc-cartao ${qual === 'vantagem' ? 'ganha' : 'perde'}">
    <div class="esc-cab">
      <span class="esc-cab-tit">${t('esc.' + qual + '.titulo')}</span>
      <span class="esc-cab-preco">${preco}</span>
    </div>
    <div class="esc-carta">
      <div class="esc-carta-nome">${vdNome(carta)}</div>
      <div class="esc-carta-desc">${vdDesc(carta)}</div>
    </div>
    <div class="esc-difs">${linhas}</div>
    <button type="button" class="esc-btn" onclick="confirmarEscolha('${qual}')">
      ${t('esc.escolher')}
    </button>
  </div>`;
}

// ── Abrir, fechar, decidir ──────────────────────────────────────────
function abrirEscolha() {
  if (typeof podeEscolherAnciao !== 'function' || !podeEscolherAnciao()) return;
  const ov = document.getElementById('escolhaOverlay');
  if (!ov) return;

  const base = _escFicha(null);
  if (!base || !base.vantagemOferta || !base.desvantagem) return;

  if (typeof ModalManager !== 'undefined' && ModalManager.closeAll) ModalManager.closeAll();

  const retrato = ov.querySelector('#escRetrato');
  if (retrato && typeof gerarSVG === 'function') {
    const tam = 96;
    retrato.innerHTML = gerarSVG(avatar, avatar.raridade, avatar.seed, tam, tam, getFase());
  }

  const box = ov.querySelector('#escCartoes');
  if (box) box.innerHTML = _escCartao('vantagem', base) + _escCartao('semDefeito', base);

  ov.classList.add('ativo');
  if (typeof lockBodyScroll === 'function') lockBodyScroll();
  if (typeof playSound === 'function') playSound('open');
}

function fecharEscolha() {
  const ov = document.getElementById('escolhaOverlay');
  if (!ov) return;
  if (ov.classList.contains('ativo') && typeof unlockBodyScroll === 'function') unlockBodyScroll();
  ov.classList.remove('ativo');
  const retrato = ov.querySelector('#escRetrato');
  setTimeout(() => { if (retrato && !ov.classList.contains('ativo')) retrato.innerHTML = ''; }, 500);
}

function confirmarEscolha(qual) {
  if (typeof FICHA_ESCOLHAS === 'undefined' || FICHA_ESCOLHAS.indexOf(qual) < 0) return;

  /* A segunda guarda, em quem FAZ. A de cima só decide se o convite
     aparece; esta é a que impede — um clique repetido, uma tela aberta
     desde antes de o avatar morrer, ou um caminho novo que ninguém
     previu. */
  if (typeof podeEscolherAnciao !== 'function' || !podeEscolherAnciao()) {
    fecharEscolha();
    if (typeof playSound === 'function') playSound('error');
    return;
  }

  avatar.escolhaAnciao = qual;
  fecharEscolha();

  if (typeof playSound === 'function') playSound('evolve');
  const nome = avatar.nome ? avatar.nome.split(',')[0] : '';
  if (typeof addLog === 'function')    addLog(t('esc.log.' + qual, { nome }), 'leg');
  if (typeof showBubble === 'function') showBubble(t('esc.bub.' + qual));
  if (typeof saveToFirebase === 'function') saveToFirebase();
  if (typeof updateAllUI === 'function') updateAllUI();
  atualizarChamadaEscolha();
}

window.registerStrings(
  {
    'esc.chamada':     '✦ CHEGOU A HORA DE DECIDIR',
    'esc.marca':       '◈ A ESCOLHA DO ANCIÃO',
    'esc.intro':       'Ele chegou ao fim do caminho. Daqui em diante é uma coisa só, e é para sempre.',
    'esc.vantagem.titulo':   'MAIS UMA VIRTUDE',
    'esc.semDefeito.titulo': 'SEM O DEFEITO',
    'esc.pontos':         'Pontos',
    'esc.preco.paga':     'custa {n}',
    'esc.preco.abre_mao': 'abre mão de {n}',
    'esc.escolher':    'ESCOLHER',
    'esc.depois':      'DECIDIR DEPOIS',
    'esc.sem_mudanca': 'nada muda nos números',
    'esc.nota':        'As duas se pagam: uma virtude nova custa pontos, e o defeito que sai leva com ele os pontos que dava. Por isso alguns números descem nos dois lados — o que muda é aquilo em que ele se torna. Só se escolhe uma vez.',
    'esc.log.vantagem':   '{nome} despertou uma segunda virtude.',
    'esc.log.semDefeito': '{nome} deixou para trás o defeito com que nasceu.',
    'esc.bub.vantagem':   'Sinto uma força nova acordar.',
    'esc.bub.semDefeito': 'O que me pesava já não está aqui.',
  },
  {
    'esc.chamada':     '✦ THE TIME HAS COME TO DECIDE',
    'esc.marca':       '◈ THE ELDER’S CHOICE',
    'esc.intro':       'It has reached the end of the road. From here on it is one thing only, and it is forever.',
    'esc.vantagem.titulo':   'ONE MORE VIRTUE',
    'esc.semDefeito.titulo': 'NO MORE FLAW',
    'esc.pontos':         'Points',
    'esc.preco.paga':     'costs {n}',
    'esc.preco.abre_mao': 'gives up {n}',
    'esc.escolher':    'CHOOSE',
    'esc.depois':      'DECIDE LATER',
    'esc.sem_mudanca': 'the numbers stay the same',
    'esc.nota':        'Both are paid for: a new virtue costs points, and the flaw takes with it the points it granted. That is why some numbers fall on both sides — what changes is what it becomes. You only choose once.',
    'esc.log.vantagem':   '{nome} awakened a second virtue.',
    'esc.log.semDefeito': '{nome} left behind the flaw it was born with.',
    'esc.bub.vantagem':   'I feel a new strength waking.',
    'esc.bub.semDefeito': 'What weighed on me is no longer here.',
  }
);
