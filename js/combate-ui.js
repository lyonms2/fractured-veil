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


// ═════════════════════════════════════════════════════════════════
// A FICHA — duas portas para o js/ficha-fu-ui.js
// ═════════════════════════════════════════════════════════════════
/* O primeiro argumento pode ser o SLOT inteiro, e é assim que se pede.
   A forma de quatro campos soltos fica a funcionar para quem ainda a use,
   mas não leva a certidão nem a escolha do ancião — e uma ficha sem elas
   mostra outro avatar. */
/* ── A FICHA MUDOU DE DONO ──

   Aqui desenhavam-se as quatro características de 0 a 5, as três magias
   do 3D&T e o par vantagem/desvantagem com os custos em pontos. Nada
   disso existe no motor novo: são quatro DADOS, cinco lugares de magia e
   uma vantagem paga por uma costura.

   O desenho passou para o js/ficha-fu-ui.js, e está lá por uma razão que
   não é arrumação: a ARENA precisa da mesma ficha, e ter duas cópias era
   garantir que um dia mostravam avatares diferentes.

   Esta continua a existir porque é o contrato com o js/main.js — quem a
   chama não tem de saber que o motor mudou por baixo. */
function renderFichaHTML(slot) {
  return (typeof renderFichaFU === 'function') ? renderFichaFU(slot) : '';
}

function preencherFichaZoom(seed, raridade, nivel, nascimento) {   // seed = o slot
  const el = document.getElementById('avatarZoomFicha');
  if (!el) return;
  el.innerHTML = renderFichaHTML(seed, raridade, nivel, nascimento);
}

// ═══════════════════════════════════════════════════════════════════
// BARRA DA EQUIPA — o resumo por cima da grelha de slots
// ═══════════════════════════════════════════════════════════════════
function renderEquipaBar() {
  const box = document.getElementById('equipaBar');
  if (!box || typeof equipaIdx !== 'function') return;

  const idx   = equipaIdx();
  const cheia = idx.length >= COMBATE_EQUIPA_MAX;
  // Uma vez só, e serve o rodapé, os cartões e o aviso: três leituras
  // separadas da mesma regra é como se chega a um "pronta para batalhar"
  // por cima de um "não dá para batalhar".
  const impedidos = (typeof _pveImpedidos === 'function') ? _pveImpedidos() : [];

  // ── A ORDEM À VISTA ──
  // O primeiro da fila abre a luta; os outros entram por ordem, à medida
  // que os da frente caem. Isso decidia-se pela ordem de clique e não se
  // via em lado nenhum — o jogador montava a equipa sem saber quem ia
  // apanhar o primeiro golpe.
  let cartoes = '';
  for (let n = 0; n < COMBATE_EQUIPA_MAX; n++) {
    const i = idx[n];
    const s = (typeof i === 'number') ? avatarSlots[i] : null;
    if (!s) {
      cartoes += `<div class="equipa-slot vazio"><span class="equipa-pos">${n + 1}</span>+</div>`;
      continue;
    }
    const nome = nomeCurto(s);
    const papel = n === 0 ? t('equipa.ordem.comeca')
                : n === 1 ? t('equipa.ordem.segundo')
                          : t('equipa.ordem.terceiro');
    // Setas só onde há para onde ir, e desativadas em vez de ausentes:
    // um botão que aparece e desaparece muda a largura do cartão a cada
    // troca, e o dedo vai bater ao lado.
    const setas = `<div class="equipa-mover">
      <button ${n === 0 ? 'disabled' : ''} onclick="moverEquipa(${i},-1)"
              title="${t('equipa.ordem.subir')}">◀</button>
      <button ${n >= idx.length - 1 ? 'disabled' : ''} onclick="moverEquipa(${i},1)"
              title="${t('equipa.ordem.descer')}">▶</button>
    </div>`;
    /* Quem não pode lutar diz-o no seu próprio cartão.

       O aviso por baixo já nomeava os impedidos, mas obrigava a ler uma
       frase e a procurar o nome entre três cartões. A marca vai onde o
       olho já está: por cima do avatar, com o motivo escrito.

       O cartão não desaparece nem se apaga a ponto de não se ver — é
       preciso continuar a reconhecê-lo para o trocar por outro, que é
       exatamente o que se quer que o jogador faça. */
    const imp = (typeof _pveImpedimentoDe === 'function') ? _pveImpedimentoDe(i) : null;
    const marca = imp ? `<div class="equipa-bloqueio ${imp.motivo}">
        <span class="eb-selo">${t('equipa.bloqueio.' + imp.motivo)}</span>
        <span class="eb-porque">${imp.etiqueta}</span>
      </div>` : '';

    cartoes += `<div class="equipa-slot${n === 0 ? ' primeiro' : ''}${imp ? ' bloqueado' : ''}"
         title="${imp ? t('equipa.bloqueio.title.' + imp.motivo, { nome })
                      : t('mkt.slot.label', {n: i+1})}">
      <span class="equipa-pos">${n + 1}</span>
      ${gerarSVG(s, s.raridade, s.seed || 0, 42, 42, _faseNum(s.nivel))}
      <div class="equipa-slot-nome">${nome}</div>
      <div class="equipa-slot-sub">${t('mkt.stat.nivel')} ${s.nivel || 1}</div>
      <div class="equipa-papel">${papel}</div>
      ${marca}
      ${setas}
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
    ${idx.length ? `<div class="equipa-ordem-nota">${t('equipa.ordem.nota')}</div>` : ''}
    <div class="equipa-foot">
      ${/* "Equipe pronta para batalhar" ficava a dizer isso mesmo por cima
            do aviso a explicar que não dava — a contradição estava a dois
            centímetros de si própria. Três de três continua a ser três de
            três, e isso o contador em cima diz; o que não se pode é
            chamar-lhe pronta. */''}
      ${!cheia ? t(faltam === 1 ? 'equipa.incompleta_1' : 'equipa.incompleta', { faltam })
        : impedidos.length ? t('equipa.bloqueio.nao_pronta')
        : t('equipa.pronta')}<br>
      ${t('equipa.poder', { poder })}
    </div>
    ${renderBotaoBatalhar(cheia, impedidos)}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// O BOTÃO DE BATALHAR
//
// Fica onde a equipa é escolhida, que é onde o jogador está quando
// acaba de a montar. Diz sempre porque não dá, em vez de só ficar
// apagado: falta gente na equipa, ou há alguém cansado de mais.
// ═══════════════════════════════════════════════════════════════════
/* O AVISO, e já não o botão.

   Havia aqui um BATALHAR grande que entrava direto no PvE. Fazia
   sentido quando esta barra vivia enterrada no 🧬 e era o único caminho
   para lutar. Agora a barra está na página da batalha, com os cartões
   dos modos logo por baixo — e dois botões para a mesma luta, à
   distância de dois centímetros, é escolha inventada.

   O que fica é a parte que os cartões não sabem dizer: PORQUE é que não
   dá. Falta gente na equipa, ou há gente cansada de mais e com nome.
   Com a equipa pronta isto some, e quem manda são os cartões. */
function renderBotaoBatalhar(cheia, impedidos) {
  if (!cheia) return `<div class="equipa-batalhar-off">${t('equipa.batalhar.incompleta')}</div>`;

  /* O aviso diz três coisas, e a terceira é a que faltava: QUEM está de
     fora, PORQUÊ, e que a equipa não fica presa por causa disso — basta
     trocar por outro avatar. Sem a última linha, o jogador que só tem
     três criaturas conclui que não pode lutar e fecha a página. */
  if (impedidos && impedidos.length) {
    const linhas = impedidos.map(x =>
      `<li><b>${x.nome}</b> — ${t('equipa.bloqueio.motivo.' + x.motivo, {
        etiqueta: x.etiqueta, min: PVE_ENERGIA_MINIMA,
      })}</li>`).join('');
    return `<div class="equipa-batalhar-off cansada">
      <div class="eb-titulo">${t('equipa.bloqueio.titulo')}</div>
      <ul class="eb-lista">${linhas}</ul>
      <div class="eb-saida">${t('equipa.bloqueio.saida')}</div>
    </div>`;
  }
  return '';
}

/* ── REDESENHAR O QUE SE MEXEU ──

   As duas funções abaixo mudavam gs.equipa e depois pediam um
   renderSlots() — que é o desenho da GRELHA do 🧬 Meus Avatares. A
   barra da equipa vinha de borla no fim dele, e enquanto a barra vivia
   dentro desse mesmo painel isso bastava.

   A barra mudou-se para a página ⚔ BATALHA, e o renderSlots() tem um
   `if (!playerData) return` logo no princípio. O playerData só é
   carregado ao abrir o 🧬 ou o marketplace — portanto quem fosse
   direto à batalha carregava nas setas, a ordem MUDAVA de verdade em
   gs.equipa, e a tela não mexia um pixel. Fechar e reabrir mostrava a
   ordem nova, o que é a pior forma de descobrir que afinal funcionava.

   Cada uma passa a redesenhar aquilo que mexeu, e a grelha fica a
   ser o extra e não o caminho. */
function _equipaRedesenhar() {
  if (typeof renderEquipaBar === 'function') renderEquipaBar();
  // Entrar ou sair da equipa muda se o PvE está disponível; o cartão
  // do modo tem de saber disso sem se fechar a página.
  if (typeof _btSincronizarModos === 'function') _btSincronizarModos();
  if (typeof renderSlots === 'function') renderSlots();
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

  const nome = nomeCurto(avatarSlots[i]);
  showToast(r === 'add' ? t('equipa.toast.add', { nome }) : t('equipa.toast.remove', { nome }), 'ok');

  if (typeof scheduleSave === 'function') scheduleSave();
  _equipaRedesenhar();
}

// Trocar de lugar na fila. Não gasta nada e não tem consequência
// nenhuma fora da próxima batalha — por isso não pede confirmação.
function moverEquipa(i, dir) {
  if (typeof moverNaEquipa !== 'function') return;
  if (!moverNaEquipa(i, dir)) return;
  if (typeof scheduleSave === 'function') scheduleSave();
  _equipaRedesenhar();
  const nome = nomeCurto(avatarSlots[i]);
  const pos  = posicaoNaEquipa(i);
  showToast(pos === 1 ? t('equipa.toast.comeca', { nome })
                      : t('equipa.toast.posicao', { nome, n: pos }), 'ok');
}
