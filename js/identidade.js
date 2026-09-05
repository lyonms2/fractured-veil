// ═══════════════════════════════════════════════════════════════════
// IDENTIDADE PERMANENTE
//
// Até aqui um avatar não tinha identidade nenhuma. O que servia de
// identidade era o `seed`, e o seed é um hash de texto: na invocação sai
// de `nome + elemento`, e com 12 prefixos × 16 sufixos × 5 elementos dá
// 960 avatares possíveis em todo o jogo. Dois com o mesmo nome eram
// gémeos idênticos — mesma ficha, mesmas magias, mesmo desenho — e
// partilhavam até a entrada no `avataresEmitidos` do servidor, que é
// indexada pelo seed.
//
// O seed continua a ser o que DESENHA o avatar. O que ele deixa de ser é
// quem ele É. Isso passa a ser o `id`, e o id não se repete nem se muda.
//
// ── O QUE NUNCA MUDA, E PORQUÊ ──
//
//   id           dois avatares nunca são o mesmo, ainda que se pareçam
//   criadorUid   quem o trouxe ao mundo. Vender não apaga a autoria.
//   criadorNome  o nome que essa pessoa escolheu, guardado no momento
//   mae, pai     os ids dos progenitores. Vazios enquanto não houver
//                reprodução — mas o campo existe desde já, para não ser
//                preciso migrar avatares nascidos antes dela.
//   nascidoEm    o instante, que ordena qualquer árvore
//
// O dono ATUAL não é campo nenhum: é quem tem o avatar no seu documento.
// Guardá-lo aqui seria uma segunda verdade sobre a mesma coisa, e as duas
// divergiriam na primeira venda que falhasse a meio.
//
// ── CAMPOS PLANOS, DE PROPÓSITO ──
//
// `criador: { uid, nome }` lia-se melhor. Mas o avatar é reconstruído
// campo a campo em três sítios — js/firebase.js ao gravar, e duas vezes
// no api/comprar-avatar.js, ao listar e ao entregar — e um objecto
// encaixado sobrevive a esses três até ao dia em que alguém escrever o
// quarto e se esquecer dele. Sete campos planos não se perdem por
// omissão: perdem-se por engano visível.
//
// ── O QUE ISTO AINDA NÃO É ──
//
// O cliente escreve o avatarSlots — está dito no próprio firestore.rules,
// na lista de campos do servidor: "o avatarSlots, que o cliente escreve".
// Portanto estes campos são ESTRUTURA, não prova. Quando a reprodução
// chegar, a linhagem precisa do mesmo tratamento que os ovos e os
// avatares emitidos já têm: um registo do lado do servidor. A forma aqui
// foi escolhida para essa mudança não obrigar a mexer no formato — só a
// passar a confiar noutra fonte.
// ═══════════════════════════════════════════════════════════════════

/* Um id que não se repete e que se ordena pelo nascimento.

   Tempo em base 36 à frente, seis caracteres de acaso atrás. O tempo dá
   ordem — uma árvore genealógica lê-se por ele — e os seis dão a
   separação: são 2,1 mil milhões de hipóteses dentro do mesmo
   milissegundo, o que chega para dois avatares nascidos no mesmo instante
   em máquinas diferentes.

   Usa a fonte criptográfica quando existe. O Math.random() fica como
   recurso para um navegador antigo, e não como escolha. */
function novoIdDeAvatar() {
  const tempo = Date.now().toString(36);
  const N = 6;
  const alfabeto = '0123456789abcdefghijklmnopqrstuvwxyz';
  let acaso = '';
  const cripto = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
  if (cripto) {
    const bytes = new Uint8Array(N);
    cripto.getRandomValues(bytes);
    for (let i = 0; i < N; i++) acaso += alfabeto[bytes[i] % 36];
  } else {
    for (let i = 0; i < N; i++) acaso += alfabeto[Math.floor(Math.random() * 36)];
  }
  return 'av_' + tempo + '_' + acaso;
}

/* O bloco de identidade de um avatar que nasce agora.

   `mae` e `pai` chegam por parâmetro e ficam nulos enquanto não houver
   reprodução — um avatar invocado é raiz de árvore por definição, e um
   avatar chocado de um ovo comprado no mercado também: o ovo não sabe de
   quem veio (ver a auditoria). Quando souber, passa a saber-se aqui. */
function identidadeNova(opts) {
  const o = opts || {};
  return {
    id:          novoIdDeAvatar(),
    criadorUid:  o.criadorUid  || (typeof walletAddress !== 'undefined' ? walletAddress : null),
    criadorNome: o.criadorNome || nomeDoJogador(),
    mae:         o.mae || null,
    pai:         o.pai || null,
    // Ainda não passou por mãos nenhumas além das de quem o fez.
    // Só a venda escreve aqui (api/comprar-avatar.js).
    donos:       [],
    nascidoEm:   Date.now(),
    // O nome vem sorteado. Fica um uso para o dono lhe pôr o seu.
    nomeTravado: false,
  };
}

/* Os avatares que nasceram antes disto existir.

   Não se inventa um criador: ninguém sabe quem os fez, e escrever o dono
   actual seria transformar uma venda em autoria. Ficam com criador nulo,
   e a interface diz "desconhecido" — que é a verdade.

   O id, esse, tem de existir: sem ele não há âncora para linhagem
   nenhuma. O `nascidoEm` aproveita o bornAt quando o há.

   O nome fica TRAVADO. Um avatar antigo já viveu com o nome que tem, e
   quem o vê na colônia há semanas não devia ver esse nome mudar por causa
   de uma regra nova. Quem quiser o direito de baptizar tem os que
   nascerem daqui em diante. */
function garantirIdentidade(slot) {
  if (!slot || typeof slot !== 'object') return false;
  if (slot.id) return false;
  slot.id          = novoIdDeAvatar();
  slot.criadorUid  = null;
  slot.criadorNome = null;
  slot.mae         = null;
  slot.pai         = null;
  /* Lista vazia, e não inventada. Este avatar pode muito bem já ter
     mudado de mãos antes de haver registo — mas escrever ali um nome
     que eu não sei é pior do que dizer que não se sabe. */
  slot.donos       = [];
  slot.nascidoEm   = slot.bornAt || Date.now();
  slot.nomeTravado = true;
  return true;
}

// Passa por todos os slots. Devolve quantos foram carimbados, para quem
// chamar poder decidir se vale a pena gravar.
function garantirIdentidades(slots) {
  if (!Array.isArray(slots)) return 0;
  let n = 0;
  for (const s of slots) if (garantirIdentidade(s)) n++;
  return n;
}

// ═══════════════════════════════════════════════════════════════════
// O NOME DE QUEM JOGA
//
// O avatar guarda quem o criou, e para isso é preciso haver um nome para
// guardar. O uid do Firebase serve para ligar as coisas mas não se mostra
// a ninguém — numa árvore genealógica lê-se "criado por Leo", não por
// "criado por hK3n…".
//
// Pede-se uma vez, na primeira entrada. Fica mudável depois: mudar o nome
// de quem joga não reescreve o que já ficou carimbado nos avatares, que é
// o que a permanência exige. O nome no avatar é o do MOMENTO da criação.
// ═══════════════════════════════════════════════════════════════════
const NOME_JOGADOR_MAX = 18;

function nomeDoJogador() {
  return (typeof nomeJogador !== 'undefined' && nomeJogador) ? nomeJogador : null;
}

function jogadorTemNome() {
  return !!nomeDoJogador();
}

/* A mesma limpeza do renomear de avatares: letras, números, espaços e
   hífen. Sem isto entra HTML, e este nome vai parar a fichas e a listas. */
function limparNomeDeJogador(bruto) {
  return String(bruto || '')
    .replace(/[^\p{L}\p{N}\s\-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOME_JOGADOR_MAX);
}

function definirNomeDoJogador(bruto) {
  const limpo = limparNomeDeJogador(bruto);
  if (!limpo) return null;
  nomeJogador = limpo;
  if (typeof scheduleSave === 'function' && typeof walletAddress !== 'undefined' && walletAddress) {
    scheduleSave();
  }
  return limpo;
}

// ═══════════════════════════════════════════════════════════════════
// O NOME DO AVATAR — UM USO SÓ
//
// Nasce sorteado. O dono pode pôr-lhe o seu, uma vez, e nessa altura o
// nome fica permanente.
//
// O uso não expira. "Uma vez durante o nascimento" podia ler-se como uma
// janela que fecha, mas uma janela castiga quem esteve fora e não
// acrescenta permanência nenhuma — ela cumpre-se no instante em que o uso
// é gasto. Para a fechar, basta esta função passar a olhar também para a
// idade ou para o nível.
// ═══════════════════════════════════════════════════════════════════
function podeRenomear(slot) {
  const s = slot || (typeof avatar !== 'undefined' ? avatar : null);
  if (!s) return false;
  if (s.dead) return false;
  return !s.nomeTravado;
}

function travarNome(slot) {
  const s = slot || (typeof avatar !== 'undefined' ? avatar : null);
  if (s) s.nomeTravado = true;
}

// Quem criou este avatar, para mostrar. Nunca devolve o uid cru.
function criadorDe(slot) {
  if (!slot) return null;
  return slot.criadorNome || null;
}

// ═══════════════════════════════════════════════════════════════════
// PEDIR O NOME, UMA VEZ
//
// Aparece antes do prólogo e não depois: o prólogo termina no gesto de
// invocar, e invocar já carimba um criador. Perguntar depois seria
// perguntar tarde de mais para o primeiro avatar — logo o único que
// ficaria sem autoria era justamente o primeiro.
//
// Não tem fechar. Não é teimosia: é um campo só, e sem ele não há a quem
// atribuir o que se cria a seguir. A caixa chega com uma sugestão já
// escrita, portanto quem não quiser pensar carrega e segue.
// ═══════════════════════════════════════════════════════════════════
const _NOMES_SUGERIDOS = ['Guardião', 'Andarilho', 'Zelador', 'Errante', 'Vigia', 'Peregrino'];

function _sugestaoDeNome() {
  return _NOMES_SUGERIDOS[Math.floor(Math.random() * _NOMES_SUGERIDOS.length)];
}

function pedirNomeDoJogador(aoFechar) {
  const ov = document.getElementById('nomeJogadorOverlay');
  if (!ov) { if (typeof aoFechar === 'function') aoFechar(); return; }

  const input = document.getElementById('nomeJogadorInput');
  const btn   = document.getElementById('nomeJogadorBtn');
  const erro  = document.getElementById('nomeJogadorErro');
  if (input) input.value = _sugestaoDeNome();
  if (erro)  erro.textContent = '';

  window._nomeJogadorAoFechar = (typeof aoFechar === 'function') ? aoFechar : null;
  ov.classList.add('open');
  if (typeof lockBodyScroll === 'function') lockBodyScroll();
  setTimeout(() => { if (input) { input.focus(); input.select(); } }, 60);
}

function confirmarNomeDoJogador() {
  const input = document.getElementById('nomeJogadorInput');
  const erro  = document.getElementById('nomeJogadorErro');
  const limpo = definirNomeDoJogador(input ? input.value : '');

  // Diz o que falta em vez de não fazer nada. Um botão que não responde
  // lê-se como avaria; a única razão de recusa aqui é o nome ficar vazio
  // depois da limpeza, e isso explica-se numa linha.
  if (!limpo) {
    if (erro) erro.textContent = t('nomej.invalido');
    if (typeof playSound === 'function') playSound('error');
    if (input) input.focus();
    return;
  }

  const ov = document.getElementById('nomeJogadorOverlay');
  if (ov) ov.classList.remove('open');
  if (typeof unlockBodyScroll === 'function') unlockBodyScroll();
  if (typeof addLog === 'function') addLog(t('nomej.log', { nome: limpo }), 'good');

  const seguir = window._nomeJogadorAoFechar;
  window._nomeJogadorAoFechar = null;
  if (typeof seguir === 'function') seguir();
}

// ═══════════════════════════════════════════════════════════════════
// A CERTIDÃO
//
// Tudo o que um avatar é para além dos números da ficha: o nome, o id,
// quando nasceu, quem o fez, de quem nasceu, por que mãos passou.
//
// Não calcula nada. Lê o que está gravado e diz "—" onde não há nada —
// e essa é a regra que interessa: um avatar do jogo antigo não tem
// criador, e escrever ali o dono actual seria transformar uma compra em
// autoria. A interface diz desconhecido, que é a verdade.
// ═══════════════════════════════════════════════════════════════════
function _certData(ms) {
  if (!ms) return '—';
  try {
    const d = new Date(ms);
    return d.toLocaleDateString(window._currentLang === 'en' ? 'en-GB' : 'pt-BR',
                                { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) { return '—'; }
}

/* O nome do pai ou da mãe, se o houver.

   O campo slot.mae guarda o ID do progenitor, que é o que serve para a
   árvore: um id é único e permanente, um nome repete-se e muda de dono.
   Mas mostrar "av_mtnq3x_8fj2ka" a um jogador não é dizer-lhe nada — e
   por isso o nome viaja ao lado, gravado na certidão no momento em que
   o ovo foi posto. Se o progenitor for vendido ou queimado, o nome
   continua aqui: é história, e a história não desaparece com ele. */
function _certPai(slot, qual) {
  const n = slot.nascimento;
  if (n && n[qual + 'Nome']) return n[qual + 'Nome'];
  return slot[qual] || (n && n[qual]) || null;
}

function _certLinha(rot, val, cls) {
  return `<div class="cert-linha${cls ? ' ' + cls : ''}">
    <span class="cert-rot">${rot}</span><span class="cert-val">${val}</span>
  </div>`;
}

function renderCertidaoHTML(slot) {
  if (!slot || typeof slot !== 'object') return '';
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nada = t('cert.nada');

  const nomeProprio = slot.nome ? String(slot.nome).split(',')[0].trim() : nada;
  const dna = (slot.nascimento && typeof dnaLegivel === 'function')
    ? dnaLegivel(slot.nascimento.dna) : '—';

  /* Os donos anteriores, do mais antigo para o mais recente. O dono
     ACTUAL não entra: é quem tem o avatar em mãos agora, e escrevê-lo
     aqui era ter a mesma pessoa em dois sítios à espera de divergirem. */
  const donos = Array.isArray(slot.donos) ? slot.donos : [];
  const listaDonos = donos.length
    ? `<div class="cert-donos">
         <div class="cert-rot">${t('cert.donos')}</div>
         <ol class="cert-donos-lista">${donos.map(d =>
           `<li>${esc(d.nome || t('cert.anonimo'))}</li>`).join('')}</ol>
       </div>`
    : '';

  return `<div class="certidao">
    <div class="cert-titulo">${t('cert.titulo')}</div>
    ${_certLinha(t('cert.nome'),     esc(nomeProprio))}
    ${_certLinha(t('cert.id'),       esc(slot.id || nada), 'cert-mono')}
    ${_certLinha(t('cert.nascimento'), _certData(slot.nascidoEm || slot.bornAt))}
    ${_certLinha(t('cert.criador'),  esc(slot.criadorNome || nada))}
    ${_certLinha(t('cert.mae'),      esc(_certPai(slot, 'mae') || nada))}
    ${_certLinha(t('cert.pai'),      esc(_certPai(slot, 'pai') || nada))}
    ${_certLinha('DNA',              esc(dna), 'cert-mono')}
    ${listaDonos}
  </div>`;
}

/* Preenche a certidão dentro do overlay de zoom. Chamada por
   openAvatarZoom() e openAvatarZoomData() em js/main.js.

   A LINHAGEM SAIU DAQUI. Vivia colada ao fundo da certidão, e a
   certidão vem depois da ficha de combate inteira — magias, vantagens,
   os quatro medidores. Para chegar à árvore era preciso rolar por tudo
   isso, e quem não soubesse que ela existia não a encontrava.
   Passou a ter porta própria: o 🌳 ao lado do 🔍. */
function preencherCertidaoZoom(slot) {
  const el = document.getElementById('avatarZoomCertidao');
  if (!el) return;
  el.innerHTML = slot ? renderCertidaoHTML(slot) : '';
}

// ═══════════════════════════════════════════════════════════════════
// A ÁRVORE
//
// Cada avatar guarda o ID da mãe e do pai. Um id não é um ponteiro: o
// progenitor pode ter sido vendido, queimado ou nunca ter estado nesta
// colónia. Por isso a árvore tem dois níveis de certeza, e diz qual é
// qual em vez de fingir que sabe tudo:
//
//   · o NOME dos pais está sempre lá — foi gravado na certidão no
//     momento em que o ovo foi posto, e fica mesmo depois de eles
//     desaparecerem. É história, e a história não se apaga com eles.
//
//   · o AVATAR dos pais só aparece se ainda estiver na colónia. Aí
//     dá para subir mais um degrau e ver os avós.
//
// Os filhos não se guardam em lado nenhum, e é de propósito: uma lista
// de filhos dentro do pai seria uma segunda cópia da mesma relação, à
// espera de divergir da que os filhos já têm. Procuram-se.
// ═══════════════════════════════════════════════════════════════════
function _arvNome(slot) {
  return slot && slot.nome ? String(slot.nome).split(',')[0].trim() : null;
}

function _arvPorId(id, slots) {
  if (!id || !Array.isArray(slots)) return null;
  return slots.find(s => s && s.id === id) || null;
}

/* Um progenitor: o nome que a certidão guardou, e o avatar se ele ainda
   cá estiver. O nome vem primeiro porque é o que nunca falha. */
function _arvProgenitor(slot, qual, slots) {
  const n = slot && slot.nascimento;
  const id   = (n && n[qual]) || (slot && slot[qual]) || null;
  const nome = (n && n[qual + 'Nome']) || null;
  if (!id && !nome) return null;
  const vivo = _arvPorId(id, slots);
  return { id, nome: nome || _arvNome(vivo), presente: !!vivo, slot: vivo };
}

function arvoreDe(slot, slots) {
  if (!slot) return null;
  const lista = Array.isArray(slots) ? slots.filter(Boolean) : [];

  const mae = _arvProgenitor(slot, 'mae', lista);
  const pai = _arvProgenitor(slot, 'pai', lista);

  // Os avós, só pelo lado de quem ainda cá está.
  const avos = [];
  for (const p of [mae, pai]) {
    if (!p || !p.slot) continue;
    for (const q of ['mae', 'pai']) {
      const av = _arvProgenitor(p.slot, q, lista);
      if (av) avos.push({ ...av, por: p.nome });
    }
  }

  /* Os filhos: quem tem este avatar como mãe ou pai. Só se acham os que
     estão na colónia — um filho vendido continua a saber quem é o pai,
     mas o pai não tem por onde saber dele. */
  const filhos = lista.filter(s => {
    if (!s || s === slot || !slot.id) return false;
    const n = s.nascimento || {};
    return n.mae === slot.id || n.pai === slot.id || s.mae === slot.id || s.pai === slot.id;
    // O avatar inteiro vai junto: o modal desenha o bicho, e não só o
    // nome dele.
  }).map(s => ({ id: s.id, nome: _arvNome(s), presente: true, slot: s }));

  return { mae, pai, avos, filhos };
}

/* ═══════════════════════════════════════════════════════════════════
   A SALA DA LINHAGEM

   Havia aqui uma árvore de TEXTO — três linhas coladas ao fundo da
   certidão. Serviu enquanto a linhagem não tinha casa; tem, e saiu.
   Guardar as duas era guardar duas maneiras de desenhar a mesma árvore,
   à espera de divergirem à primeira geração que se acrescentasse a uma
   delas.

   Esta desenha o BICHO em cada lugar, que é o que se quer ver quando se
   abre uma genealogia de propósito — e é onde a herança se vê: uma
   mãe rosa e um pai amarelo, e o filho a sair de uma das duas.

   Três estados por lugar, e a diferença entre eles é a razão de a
   árvore existir:

     PRESENTE   está na colónia · desenha-se
     HISTÓRIA   só o nome ficou na certidão · silhueta apagada
     VAZIO      nunca houve · um lugar tracejado

   O terceiro não é falta de dados: um avatar sem pais é um PRIMORDIAL,
   e isso diz-se por extenso em vez de se mostrar dois quadrados vazios.
   ═══════════════════════════════════════════════════════════════════ */

// A silhueta de quem já cá não está. É um ovo fechado de propósito —
// sabe-se que existiu, não se sabe que forma tinha.
const _LIN_SILHUETA =
  '<svg viewBox="0 0 60 70" width="100%" height="100%" aria-hidden="true">' +
  '<ellipse cx="30" cy="40" rx="21" ry="27" fill="rgba(255,255,255,.05)"' +
  ' stroke="rgba(255,255,255,.14)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
  '<circle cx="30" cy="36" r="6" fill="rgba(255,255,255,.06)"/></svg>';

function _linFase(nivel) {
  return (typeof faseFromNivel === 'function') ? faseFromNivel(nivel || 1) : 0;
}

function _linSexo(slot) {
  const sx = (typeof sexoDe === 'function') ? sexoDe(slot) : null;
  if (!sx) return '';
  return sx === 'F' ? '<span class="lin-sexo f">\u2640</span>'
                    : '<span class="lin-sexo m">\u2642</span>';
}

/* Um lugar da árvore. `p` é o que o arvoreDe devolve — {nome, presente,
   slot} — ou null quando não há ninguém para pôr ali. */
function _linCartao(p, cls) {
  const esc = (x) => String(x == null ? '' : x)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  cls = 'lin-cartao' + (cls ? ' ' + cls : '');

  if (!p) {
    return `<div class="${cls} vazio"><div class="lin-retrato"></div>
      <div class="lin-nome">${t('cert.nada')}</div></div>`;
  }

  const nome = esc(p.nome || t('cert.anonimo'));

  if (!p.slot) {
    return `<div class="${cls} historia" title="${t('lin.historia')}">
      <div class="lin-retrato">${_LIN_SILHUETA}</div>
      <div class="lin-nome">${nome}</div>
      <div class="lin-marca">${t('lin.historia')}</div>
    </div>`;
  }

  const s = p.slot;
  const svg = (typeof gerarSVG === 'function')
    ? gerarSVG(s, s.raridade || 'Comum', s.seed || 0, 64, 64, _linFase(s.nivel)) : '';
  const prim = (typeof ehPrimordial === 'function' && ehPrimordial(s))
    ? `<div class="lin-marca prim">${t('lin.primordial_curto')}</div>` : '';
  return `<div class="${cls} presente">
    <div class="lin-retrato">${svg}</div>
    <div class="lin-nome">${_linSexo(s)}${nome}</div>
    <div class="lin-nv">${t('mkt.stat.nivel')} ${s.nivel || 1}</div>
    ${prim}
  </div>`;
}

function _linNivel(rotulo, conteudo, cls) {
  return `<div class="lin-nivel ${cls || ''}">
    <div class="lin-rot">${rotulo}</div>
    <div class="lin-fila">${conteudo}</div>
  </div>`;
}

function renderLinhagemHTML(slot, slots) {
  if (!slot) return '';
  const a = arvoreDe(slot, slots);
  if (!a) return '';

  const partes = [];

  /* SEM PAIS NÃO SE MOSTRAM DOIS LUGARES VAZIOS.

     Um avatar sem pais não tem uma árvore incompleta: tem uma árvore
     que começa nele. É a diferença entre "faltam dados" e "é isto", e
     o jogador merece que se lhe diga qual das duas é. */
  if (!a.mae && !a.pai) {
    partes.push(`<div class="lin-primordial">
      <div class="lin-prim-selo">${t('lin.primordial')}</div>
      <div class="lin-prim-txt">${t('lin.primordial_desc')}</div>
    </div>`);
  } else {
    if (a.avos.length) {
      partes.push(_linNivel(t('arv.avos'), a.avos.map(v => _linCartao(v, 'pequeno')).join(''), 'lin-avos'));
      partes.push('<div class="lin-tronco"></div>');
    }
    partes.push(_linNivel(t('arv.pais'),
      _linCartao(a.mae) + `<span class="lin-mais">+</span>` + _linCartao(a.pai)));
    partes.push('<div class="lin-tronco"></div>');
  }

  partes.push(_linNivel(t('arv.este'), _linCartao({ nome: _arvNome(slot), presente: true, slot }, 'grande'), 'lin-este'));

  if (a.filhos.length) {
    partes.push('<div class="lin-tronco"></div>');
    partes.push(_linNivel(t('arv.filhos'), a.filhos.map(f => _linCartao(f, 'pequeno')).join(''), 'lin-filhos'));
  }

  /* A nota explica o que separa um cartão aceso de um apagado. Só se
     diz quando há um apagado — num primordial sozinho ela estava a
     explicar uma distinção que não se via em lado nenhum. */
  const haHistoria = [a.mae, a.pai, ...a.avos, ...a.filhos].some(p => p && !p.slot);
  if (haHistoria) partes.push(`<div class="lin-nota">${t('arv.nota')}</div>`);
  return `<div class="lin">${partes.join('')}</div>`;
}

// ── A porta ──
function abrirLinhagem(slot) {
  const alvo = slot || ((typeof avatar !== 'undefined') ? avatar : null);
  const el = document.getElementById('linhagemCorpo');
  if (!el) return;
  const slots = (typeof avatarSlots !== 'undefined') ? avatarSlots : [];
  el.innerHTML = alvo ? renderLinhagemHTML(alvo, slots) : '';
  const sub = document.getElementById('linhagemSub');
  if (sub) sub.textContent = alvo ? (_arvNome(alvo) || '') : '';
  if (typeof ModalManager !== 'undefined') ModalManager.open('linhagemModal');
}

function fecharLinhagem() {
  if (typeof ModalManager !== 'undefined') ModalManager.close('linhagemModal');
}
