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
  if (typeof fuFicha !== 'function' || !avatar) return null;
  try { return fuFicha({ ...avatar, nivel, escolhaAnciao: qual }); }
  catch (_) { return null; }
}

/* ── O QUE PODE MUDAR COM A ESCOLHA ──

   No motor antigo mudavam sete números, porque as duas opções mexiam na
   bolsa de pontos que comprava as características: uma virtude nova
   custava pontos e o defeito que saía levava consigo os que dava, e por
   isso alguns números DESCIAM nos dois lados.

   Aqui não há bolsa nenhuma. Os quatro dados saem do arranjo que o DNA
   escolheu e não se compram — e por isso não mudam com a escolha, e não
   estão nesta lista.

   O que pode mudar é o que a SEGUNDA VANTAGEM trouxer consigo: dez de
   vida (Carne Teimosa), dez de magia (Fonte Funda), dois de Defesa
   (Guarda Cerrada). Nas outras nove não muda número nenhum — e nesse
   caso o cartão di-lo, em vez de mostrar sete linhas iguais dos dois
   lados. */
const ESC_LINHAS = [
  { k: 'pvMax',      rot: 'af.f.vida'   },
  { k: 'pmMax',      rot: 'af.f.magia'  },
  { k: 'crise',      rot: 'af.f.crise'  },
  { k: 'defesaBase', rot: 'af.f.defesa' },
  { k: 'defMagBase', rot: 'af.f.defmag' },
];

/* Só o que MUDA. As seis linhas sempre visíveis enchiam o cartão de
   valores iguais dos dois lados, e a diferença — que é o assunto todo —
   ficava a competir com quatro linhas que não diziam nada. */
/* A Defesa da ficha é a BASE — o dado — e a Guarda Cerrada soma-se por
   cima dela, no motor. Para o cartão não mentir, soma-se aqui o que os
   dons acrescentam: quem lê "Defesa 8 → 8" com uma Guarda Cerrada em
   cima acha que a vantagem não fez nada. */
function _escValor(f, k) {
  const v = f[k];
  const d = f.dons || {};
  if (k === 'defesaBase') return v + (d.defesaMais | 0);
  if (k === 'defMagBase') return v + (d.defMagMais | 0);
  return v;
}

/* Só o que MUDA. As linhas sempre visíveis enchiam o cartão de valores
   iguais dos dois lados, e a diferença — que é o assunto todo — ficava a
   competir com quatro linhas que não diziam nada. */
function _escDiferencas(base, depois) {
  if (!base || !depois) return [];
  return ESC_LINHAS
    .filter(l => _escValor(depois, l.k) !== _escValor(base, l.k))
    .map(l => ({ nome: t(l.rot), de: _escValor(base, l.k), para: _escValor(depois, l.k),
                 sobe: _escValor(depois, l.k) > _escValor(base, l.k) }));
}

// ── Um cartão ───────────────────────────────────────────────────────
function _escCartao(qual, base) {
  const f = _escFicha(qual);
  if (!f) return '';

  /* De que é que cada opção fala. Vêm da ficha SEM escolha feita — é ela
     que sabe o que está em jogo antes de haver escolha nenhuma:

       vantagem     a segunda virtude que ele ganharia
       semDefeito   a costura que se fecharia */
  const segunda = base.segundaPossivel;
  const costura = base.costura;
  if (qual === 'vantagem' ? !segunda : !costura) return '';

  const dif = _escDiferencas(base, f);
  const linhas = dif.length
    ? dif.map(d => `<div class="esc-dif ${d.sobe ? 'sobe' : 'desce'}">
         <span class="esc-dif-nome">${d.nome}</span>
         <span class="esc-dif-de">${d.de}</span>
         <span class="esc-dif-seta">→</span>
         <span class="esc-dif-para">${d.para}</span>
       </div>`).join('')
    : `<div class="esc-dif-nada">${t('esc.sem_mudanca')}</div>`;

  /* O PREÇO DE CADA UMA É A OUTRA.

     Não há pontos para pagar nada. O que se paga por ficar com a segunda
     virtude é ficar com a costura; o que se paga por fechar a costura é
     não ter a segunda virtude. As duas tiram, e por isso as duas se
     dizem a tirar — ler "custa 2" onde nada custa 2 era o que a tela
     dizia antes de o motor mudar. */
  const preco = t('esc.preco.' + qual);

  const nome = (qual === 'vantagem')
    ? fuVantagemNome(segunda)
    : t('esc.costura.nome', { tipo: t('af.tipo.' + costura) });
  const desc = (qual === 'vantagem')
    ? fuVantagemDesc(segunda)
    : t('esc.costura.desc', { tipo: t('af.tipo.' + costura) });

  return `<div class="esc-cartao ${qual === 'vantagem' ? 'ganha' : 'perde'}">
    <div class="esc-cab">
      <span class="esc-cab-tit">${t('esc.' + qual + '.titulo')}</span>
      <span class="esc-cab-preco">${preco}</span>
    </div>
    <div class="esc-carta">
      <div class="esc-carta-nome">${esc(nome)}</div>
      <div class="esc-carta-desc">${esc(desc)}</div>
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
  if (!base || !base.segundaPossivel || !base.costura) return;

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
  const nome = nomeCurto(avatar);
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
    'esc.preco.vantagem':   'fica com a costura',
    'esc.preco.semDefeito': 'abre mão da segunda virtude',
    'esc.costura.nome':     'A costura de {tipo} fecha-se',
    'esc.costura.desc':     'Deixa de levar o dobro do dano de {tipo}. O Véu fechou por onde ele entrou, e ninguém mais lhe encontra ali uma brecha.',
    'esc.escolher':    'ESCOLHER',
    'esc.depois':      'DECIDIR DEPOIS',
    'esc.sem_mudanca': 'nada muda nos números',
    'esc.nota':        'As duas se pagam uma à outra: ficar com a segunda virtude é ficar com a costura, e fechar a costura é abrir mão da virtude. Os dados não mudam com isto — o que muda é aquilo em que ele se torna. Só se escolhe uma vez.',
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
    'esc.preco.vantagem':   'keeps the seam',
    'esc.preco.semDefeito': 'gives up the second virtue',
    'esc.costura.nome':     'The {tipo} seam closes',
    'esc.costura.desc':     'It no longer takes double damage from {tipo}. The Veil sealed where it came through, and nobody finds a gap there again.',
    'esc.escolher':    'CHOOSE',
    'esc.depois':      'DECIDE LATER',
    'esc.sem_mudanca': 'the numbers stay the same',
    'esc.nota':        'Each pays for the other: keeping the second virtue means keeping the seam, and closing the seam means giving up the virtue. The dice do not change — what changes is what it becomes. You only choose once.',
    'esc.log.vantagem':   '{nome} awakened a second virtue.',
    'esc.log.semDefeito': '{nome} left behind the flaw it was born with.',
    'esc.bub.vantagem':   'I feel a new strength waking.',
    'esc.bub.semDefeito': 'What weighed on me is no longer here.',
  }
);
