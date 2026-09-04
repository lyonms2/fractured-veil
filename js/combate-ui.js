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

function renderFichaHTML(seed, raridade, elemento, nivel, nascimento) {
  if (typeof fichaDeAvatar !== 'function') return '';
  const f = fichaDeAvatar(seed, raridade, elemento, nivel, nascimento);
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
    : (g.pmMax && g.porTurno) ? t('mag.custo.faixa_turno', { min: g.pm, max: g.pmMax })
    : g.pmMax ? t('mag.custo.faixa', { min: g.pm, max: g.pmMax })
    : g.porTurno ? t('mag.custo.turno', { pm: g.pm })
    : t('mag.custo', { pm: g.pm });

  /* O GOLPE COMUM ABRE A LISTA.

     A ficha listava as três magias e mais nada, como se um avatar sem
     PM não pudesse fazer nada. O golpe comum é o que sobra quando a
     magia não chega ou não serve — está sempre disponível, não custa
     nada, e é com ele que se joga a maior parte dos turnos. O painel
     da batalha já o mostrava; aqui faltava. */
  const golpe = `<div class="hab tipo-golpe">
      <div class="hab-top">
        <span class="hab-papel">${t('pve.ajuda.golpe')}</span>
        <span class="hab-custo livre">${t('mag.custo.livre')}</span>
      </div>
      <div class="hab-nome">${t('pve.acao.comum')}</div>
      <div class="hab-efeito">${t('pve.ajuda.golpe_desc')}</div>
      <div class="hab-conta">FA H${f.H} + F${f.F} + 1d</div>
    </div>`;

  /* O bebé não tem magias, e a ficha tem de dizer porquê.
     Sem isto apareciam três caixas vazias a pedir Habilidade, quando o
     que falta é idade — e a batalha já lhe dá só o golpe comum. */
  if (typeof ehBebe === 'function' && ehBebe(f)) {
    return `<div class="hab-bloco">
      <div class="hab-titulo">${t('hab.titulo')}</div>
      ${golpe}
      <div class="hab vazia"><div class="hab-efeito">${t('ficha.bebe')}</div></div>
    </div>`;
  }

  const linhas = ['ataque', 'forte', 'defesa'].map(cat => {
    const g = m[cat];
    if (!g) return `<div class="hab vazia">
        <div class="hab-top"><span class="hab-papel">${t('mag.cat.' + cat)}</span></div>
        <div class="hab-efeito">${t('ficha.sem_magia', {
          h: (typeof habilidadeNecessaria === 'function' ? habilidadeNecessaria(f.elemento, cat) : '?') })}</div>
      </div>`;
    // A magia é do avatar desde que nasce e nunca muda. O que pode faltar
    // é Habilidade para a lançar — e isso mostra-se, em vez de esconder a
    // magia: é um objectivo concreto para subir de nível, e o avatar sabe
    // que chegará lá (o sorteio só dá magias alcançáveis ao nível 35).
    /* O cadeado passou a ter duas razões, e a ficha diz qual é.

       Antes só sabia da Habilidade, e uma magia fora do alcance da
       bolsa aparecia limpa — o jogador via-a na lista, escolhia-a em
       combate, e o botão estava apagado sem lhe dizer porquê. */
    const tranca = (typeof trancaDaMagia === 'function') ? trancaDaMagia(f, g) : null;
    const alcanca = !tranca;
    const porque  = tranca && tranca.motivo === 'R' ? 'mag.tranca.r' : 'mag.tecto';
    const falta   = tranca ? tranca.precisa
                  : (typeof habilidadeParaMagia === 'function' ? habilidadeParaMagia(g) : '?');
    /* Quando o elemento não tem magia defensiva — o Fogo não tem, e é
       de propósito — o slot cai num segundo ataque. Chamar-lhe
       "Defesa" era mentira; a batalha já o diz assim e a ficha tem de
       dizer o mesmo, senão a mesma magia tem dois nomes. */
    const atacaMesmo = (cat === 'defesa' && g.fa);
    const fam   = atacaMesmo ? 'ataque' : cat;
    const papel = atacaMesmo ? t('mag.cat.defesa_atq') : t('mag.cat.' + cat);
    // A conta que a magia rola. Estava só na batalha, e é a diferença
    // entre "faz dano" e saber quanto.
    const conta = (typeof _pveFormula === 'function') ? _pveFormula(g, f) : null;
    return `<div class="hab tipo-${fam}${alcanca ? '' : ' trancada'}">
      <div class="hab-top">
        <span class="hab-papel">${papel}</span>
        <span class="hab-custo${g.pm === 0 ? ' livre' : ''}">${custo(g)}</span>
      </div>
      <div class="hab-nome">${t('mag.' + g.id + '.nome')}</div>
      <div class="hab-efeito">${t('mag.' + g.id + '.desc')}</div>
      ${conta ? `<div class="hab-conta">${conta}</div>` : ''}
      ${alcanca ? '' : `<div class="hab-tranca">🔒 ${t(porque, { h: falta, r: falta })}</div>`}
    </div>`;
  }).join('');

  return `<div class="hab-bloco">
    <div class="hab-titulo">${t('hab.titulo')}</div>
    ${golpe}
    ${linhas}
  </div>`;
}

// Preenche a ficha dentro do overlay de zoom do avatar.
// Chamada por openAvatarZoom() e openAvatarZoomData() em js/main.js.
function preencherFichaZoom(seed, raridade, elemento, nivel, nascimento) {
  const el = document.getElementById('avatarZoomFicha');
  if (!el) return;
  el.innerHTML = renderFichaHTML(seed, raridade, elemento, nivel, nascimento);
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
    const nome = (s.nome || 'Avatar').split(',')[0].trim();
    const ec   = (typeof CARACTERISTICAS_ELEMENTAIS !== 'undefined') ? CARACTERISTICAS_ELEMENTAIS[s.elemento] : null;
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
      <div class="equipa-slot-sub">${ec ? ec.emoji : '✦'} ${t('mkt.stat.nivel')} ${s.nivel || 1}</div>
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
   gs.equipa, e o ecrã não mexia um pixel. Fechar e reabrir mostrava a
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

  const nome = (avatarSlots[i]?.nome || 'Avatar').split(',')[0].trim();
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
  const nome = (avatarSlots[i]?.nome || 'Avatar').split(',')[0].trim();
  const pos  = posicaoNaEquipa(i);
  showToast(pos === 1 ? t('equipa.toast.comeca', { nome })
                      : t('equipa.toast.posicao', { nome, n: pos }), 'ok');
}
