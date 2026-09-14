// ═══════════════════════════════════════════════════════════════════
// A FICHA, DESENHADA — no padrão do manual
//
// UMA função, e dois sítios que a chamam: o painel "o que este avatar
// sabe fazer" na colónia, e o orbe da ficha dentro da batalha.
//
// Eram duas. O js/combate-ui.js desenhava a da colónia e o
// js/arena-fu.js desenhava a da arena, e as duas liam a mesma ficha para
// mostrar coisas ligeiramente diferentes. Duas versões da mesma tela
// divergem sempre — basta uma passar a mostrar as afinidades e a outra
// não, e o jogador vê dois avatares onde só há um.
//
// A diferença entre os dois sítios não é o que se mostra: é se há uma
// BATALHA a acontecer. Na colónia mostram-se os dados de nascença; na
// arena mostram-se esses e, ao lado, os de agora — que os estados
// encolhem e o Despertar aumenta. É um argumento opcional e não uma
// segunda função.
//
// ── PORQUE É QUE ISTO MUDOU DE FORMA ──
//
// A ficha dizia as mesmas coisas, mas à nossa maneira: quatro barras,
// três medidores, uma lista de linhas rótulo-valor, e no fim uma lista
// de nomes de magia com o custo ao lado. O jogador via QUE magias tinha
// e não via o que elas faziam — para saber tinha de as lançar.
//
// O manual escreve cada criatura num BLOCO, e o bloco é sempre igual:
//
//     cabeçalho    nome · Nv 20 · o que ele é
//     descrição    uma frase
//     traços       uma linha
//     atributos    DES d8 ✦ PER d6 ✦ … ✦ PV 110 ◆ 55 ✦ PM 60 ✦ Init. 7
//     defesas      DEF 8 ✦ M.DEF 6 ✦ as afinidades
//     ─────────────
//     ATAQUES BÁSICOS · MAGIAS · OUTRAS AÇÕES · REGRAS ESPECIAIS
//
// e cada acção é uma linha de campos separados por ✦, com o efeito
// escrito por baixo em prosa.
//
// O ganho não é estético: quem sabe ler o manual sabe ler a ficha, e
// quem aprende a ficha sabe ler o manual. E o efeito por baixo do nome
// obriga a ficha a dizer o que a magia FAZ — que é a pergunta que o
// jogador tem, e a única que a versão anterior não respondia.
//
// ── E NENHUMA LINHA É ESCRITA À MÃO ──
//
// Todos os números do bloco saem do js/magias-fu.js e do js/ficha-fu.js,
// pelas mesmas contas que o motor faz. Escrever "15 de dano" num texto
// era garantir que um dia o motor diria 20 e a ficha continuaria a
// prometer 15 — e uma ficha que mente sobre o dano é pior do que uma
// ficha que não o diz.
// ═══════════════════════════════════════════════════════════════════

/* O que a ficha mostra é a ficha, e o que a certidão mostra é a
   certidão. O sexo e o feitio vêm do DNA e não das regras — não mudam
   com o motor, e por isso continuam a sair de onde sempre saíram. */
function _ffuCertidao(slot) {
  return (slot && slot.nascimento) || null;
}

function _ffuSexo(slot) {
  const c = _ffuCertidao(slot);
  const sx = (c && c.sexo) || 'F';
  return (sx === 'M' ? '♂ ' : '♀ ') + t('af.f.sexo.' + sx);
}

/* ── O NOME E A DESCRIÇÃO DE UMA VANTAGEM ──

   As duas que o DNA acaba de escrever levam os números dentro do texto:
   a Guarda Cerrada diz QUAL dos dois lados leva o dois, e a Pele Calada
   diz QUE dois estados cala. Sem isso, dois avatares com a mesma
   vantagem liam exactamente igual e a escolha do DNA não se via. */
function fuVantagemNome(v) {
  return v ? t('afv.' + v.id + '.nome') : '';
}

function fuVantagemDesc(v) {
  if (!v) return '';
  const vars = {};
  if (v.id === 'guarda_cerrada') { vars.a = v.defesaMais; vars.b = v.defMagMais; }
  if (v.id === 'pele_calada' && Array.isArray(v.imunes)) {
    vars.a = t('af.est.' + v.imunes[0]);
    vars.b = t('af.est.' + v.imunes[1]);
  }
  if (v.id === 'mira_treinada')
    vars.lado = t(v.precisaoMais ? 'afv.mira.golpe' : 'afv.mira.magia');
  if (v.id === 'golpe_pesado')
    vars.lado = t(v.danoMaisMagia ? 'afv.dano.magia' : 'afv.dano.golpe');
  return t('afv.' + v.id + '.desc', vars);
}

/* A cor de cada atributo. A mesma em toda a ficha: na linha dos
   atributos e dentro dos 【 】 de cada acção. As duas leituras — o que
   ele tem, e o que cada golpe usa — ligam-se pela cor, sem o olho ter de
   voltar atrás. */
const FFU_COR = {
  DES: '#5ab4e8',   // Destreza — esquiva, iniciativa
  PER: '#c9a84c',   // Perspicácia — defesa mágica, precisão de magia
  VIG: '#e05555',   // Vigor — vida
  VON: '#7ab87a',   // Vontade — magia
};

// ═══════════════════════════════════════════════════════════════════
// O CABEÇALHO E AS DUAS LINHAS DE NÚMEROS
// ═══════════════════════════════════════════════════════════════════

/* O nome pode não vir. Na colónia o modal do zoom já o escreve por cima
   do bloco, e o slot que chega aqui nem sempre o traz; na arena vem no
   lutador. Sem nome, a faixa fica só com o que ele É — que é o que o
   manual põe do lado direito, e o que nunca falta. */
function _fbNome(slot, lutador) {
  const n = (lutador && lutador.nome) || (slot && slot.nome) || '';
  return String(n).split(',')[0].trim();
}

function _fbFaixa(slot, lutador, f) {
  const nome = _fbNome(slot, lutador);
  // O título do nível 50, logo por baixo do nome (tituloDe, js/identidade.js).
  const titulo = (typeof tituloDe === 'function') ? tituloDe(slot || lutador, f.nivel) : '';
  const tag = [t('af.b.nv', { n: f.nivel }), t('af.arr.' + f.arranjo), f.raridade]
    .map(x => esc(String(x))).join(' <i>•</i> ');
  return `<div class="fb-faixa">
    ${nome ? `<div class="fb-nome">${esc(nome)}</div>` : ''}
    ${titulo ? `<div class="fb-titulo">✦ ${esc(titulo)}</div>` : ''}
    <div class="fb-tag">${tag}</div>
  </div>`;
}

/* A descrição é a frase do feitio, e já estava escrita — era o `title`
   de uma linha dourada que ninguém passava o rato por cima para ler. No
   lugar do manual ela é a primeira coisa que se lê, que é o sítio certo
   para a única frase da ficha que diz o que este bicho É. */
function _fbDescricao(slot, f) {
  const i = (f && f.feitio) || (_ffuCertidao(slot) || {}).indole;
  if (!i) return '';
  return `<p class="fb-desc">${esc(t('af.indole.' + i + '.ex'))}</p>`;
}

/* ── TRAÇOS TÍPICOS ──

   O manual põe aqui os adjectivos que não têm regra agarrada. Os nossos
   têm-na toda — mas são na mesma as coisas que se dizem de um bicho
   antes de se abrir a conta: o sexo, o feitio, com que tipo bate, a que
   tipo é vulnerável. */
function _fbTracos(slot, f) {
  /* Sem o feitio: a descrição logo acima começa por dizer o nome dele
     ("Guarda — nasce para aguentar…"), e repeti-lo duas linhas abaixo
     gastava a linha dos traços com a única coisa que o leitor acabou de
     ler. */
  const p = [_ffuSexo(slot)];
  p.push(t('af.b.tr.tipo', { tipo: t('af.tipo.' + f.tipo) }));
  if (f.costura) p.push(t('af.b.tr.costura', { tipo: t('af.tipo.' + f.costura) }));
  return `<p class="fb-tracos"><i>${esc(t('af.b.tracos'))}:</i> ${esc(p.join(', '))}.</p>`;
}

/* Um campo da linha de números: o rótulo pequeno e o valor ao lado. */
function _fbCampo(rot, val, cor) {
  return `<span class="fb-campo"><i${cor ? ` style="color:${cor}"` : ''}>${
    esc(rot)}</i>${val}</span>`;
}

/* ── A LINHA DOS ATRIBUTOS ──

   Duas linhas: os quatro dados numa, e a vida, a magia e a iniciativa
   na de baixo. O manual escreve tudo numa linha só, mas aqui essa linha
   quebrava em lugares diferentes conforme a largura, e a vida ia parar
   no meio dos dados. O ◆ separa a vida da crise: é o símbolo dele, e quer
   dizer "e a metade em que isto vira outra coisa".

   Durante a batalha o dado de AGORA aparece ao lado do de nascença, e só
   quando é diferente — "d8 → d8" em todos os turnos em que nada
   aconteceu seria ruído a fingir-se de informação. */
function _fbAtributos(f, lutador) {
  const dados = FU_ATRIBS.map(k => {
    const base = f[k];
    const agora = lutador ? fuDado(lutador, k) : base;
    const mudou = agora !== base
      ? `<u class="${agora > base ? 'sobe' : 'desce'}">→ d${agora}</u>` : '';
    return _fbCampo(t('af.ab.' + k), `d${base}${mudou}`, FFU_COR[k]);
  }).join('');

  const vida = (lutador ? `${lutador.pv} / ${f.pvMax}` : f.pvMax)
             + ` <u class="fb-crise">◆ ${f.crise}</u>`;
  const magia = lutador ? `${lutador.pm} / ${f.pmMax}` : f.pmMax;

  return `<div class="fb-linha fb-atribs">
    <div class="fb-sub">${dados}</div>
    <div class="fb-sub">${_fbCampo(t('af.b.pv'), vida)}${
      _fbCampo(t('af.b.pm'), magia)}${_fbCampo(t('af.b.init'), f.iniciativa)}</div>
  </div>`;
}

/* ── A LINHA DAS DEFESAS E DAS AFINIDADES ──

   O manual põe as nove afinidades sempre, com um sinal em cada. Aqui
   mostram-se só as que têm alguma coisa: um avatar médio tem duas ou
   três, e nove casas com sete vazias diziam menos do que três cheias. */
function _fbDefesas(f, lutador) {
  // Fora da luta: o dado e o bônus do degrau (Lendário +2).
  const def = lutador ? fuDefesa(lutador) : f.defesaBase + (f.defesaDegrau | 0);
  const defM = lutador ? fuDefesaMag(lutador) : f.defMagBase + (f.defesaDegrau | 0);
  const chaves = Object.keys(f.afinidades || {}).filter(k => f.afinidades[k]);
  const afs = chaves.map(k =>
    `<span class="cb-f-af ${f.afinidades[k]}" title="${esc(t('af.af.' + f.afinidades[k]))}">${
      esc(t('af.tipo.' + k))} ${f.afinidades[k]}</span>`).join('');
  return `<div class="fb-linha fb-defs">${
    _fbCampo(t('af.b.def'), def)}${
    _fbCampo(t('af.b.mdef'), defM)}${afs}</div>`;
}

/* De onde vieram os dados a mais. Fica logo por baixo da linha que os
   mostra, porque é a linha que ela explica: sem isto, dois avatares do
   mesmo arranjo apareciam com dados diferentes e nada na tela dizia
   porquê — parecia acaso.

   As subidas vêm só do nível (20, 40 e 60). Houve uma segunda fonte, o
   ovo Raro ou Lendário, que saiu quando os ovos deixaram de ter
   raridade (ver js/ficha-fu.js). */
function _fbSubidas(f) {
  if (!f.subidas) return '';
  const partes = [];
  const doNivel = f.subidas;
  if (doNivel) {
    const degraus = (typeof FU_SUBIDAS_NIVEL !== 'undefined')
      ? FU_SUBIDAS_NIVEL.filter(d => f.nivel >= d) : [];
    /* Um nível diz-se no singular, vários numa lista com "e" no fim. A
       primeira versão encadeava tudo com vírgulas depois de um "e", e
       saiu "do ovo Lendário e do nível 20, do nível 40, do nível 60". */
    partes.push(degraus.length === 1
      ? t('af.f.subida_nv', { n: degraus[0] })
      : t('af.f.subida_nvs', {
          lista: degraus.slice(0, -1).join(', ')
                 + t('af.f.subida_e') + degraus[degraus.length - 1] }));
  }
  /* E as que não couberam, quando as há: um avatar com tudo em d12 que
     chega ao nível 60 não ganha nada, e tem o direito de saber porquê. */
  const perdidas = f.subidas - f.subidasUsadas;
  const aviso = perdidas ? ` — ${t('af.f.subida_tecto', { n: perdidas })}` : '';
  return `<p class="fb-nota">◈ ${
    esc(t(f.subidas === 1 ? 'af.f.subidas' : 'af.f.subidas_p', { n: f.subidas }))} · ${
    esc(partes.join(t('af.f.subida_e')) + aviso)}</p>`;
}

// ═══════════════════════════════════════════════════════════════════
// UMA ACÇÃO, NO FORMATO DO MANUAL
//
//   Nome ✦ 【DES + VIG】 ✦ 5 PM ✦ Um inimigo ✦ Instantâneo
//   O alvo sofre 【HR + 15】 de dano de fogo. Corpo a corpo: só alcança
//   quem estiver à frente.
//
// Os campos que não se aplicam não aparecem — a Devastação não rola
// nada, a Concha não aponta a ninguém, o Golpe Comum não custa PM.
// ═══════════════════════════════════════════════════════════════════

/* Quem ROLA e quem não rola. É a mesma pergunta que o motor faz, pela
   mesma ordem (ver as cinco formas de uma magia, em js/combate-fu.js):
   a própria, a aliada e a que cai em todos não rolam precisão nenhuma.
   Só a inimiga é que mira uma Defesa. */
function _fbRola(m) {
  return !(m.proprio || m.aliado || m.cura || m.todos);
}

/* Os dois atributos de cada coisa, e são os do motor: o golpe comum rola
   DES + VIG (o soco desarmado do manual) e as magias rolam PER + VON. */
function _fbAtribs(m) {
  return (m.lugar === 'comum') ? ['DES', 'VIG'] : ['PER', 'VON'];
}

/* O modificador de precisão que ele leva para esta acção. Sai da ficha
   (a raridade) mais o dom certo — a Mira Treinada soma a UM dos lados, e
   somá-la aos dois aqui era prometer o que o motor não dá. */
function _fbMod(f, m) {
  const d = f.dons || {};
  return (f.bonusPrecisao | 0)
       + (((m.lugar === 'comum') ? d.precisaoMais : d.magiaMais) | 0);
}

/* O dano fixo desta acção, com tudo o que se lhe soma. A conta é a do
   js/combate-fu.js, linha por linha: o da magia, o extra da raridade, e
   o Golpe Pesado — que engorda o murro e só o murro. */
function _fbDanoFixo(f, m) {
  return (m.fixo | 0) + (f.danoExtra | 0)
       + ((m.lugar === 'comum') ? ((f.dons && f.dons.danoMaisGolpe) | 0)
                                : ((f.dons && f.dons.danoMaisMagia) | 0));
}

function _fbAlvo(m) {
  if (m.proprio) return t('af.b.alvo.proprio');
  if (m.todos) return t('af.b.alvo.inimigoT');
  const dentro = m.aliado || m.cura;
  return t('af.b.alvo.' + (dentro ? 'aliado' : 'inimigo') + ((m.alvos || 1) > 1 ? '3' : '1'));
}

function _fbCusto(m) {
  if (!m.pm) return t('af.gratis');
  return m.porAlvo ? t('af.b.pm_alvo', { n: m.pm }) : t('af.pm', { n: m.pm });
}

/* O nome de uma magia. As oito Barragens e os oito Concentrados trazem o
   nome consigo (muda com o tipo do avatar); as outras dez têm nome fixo
   e vivem no idioma. */
function _fbMagiaNome(m) {
  if (m.nome) return (window._currentLang === 'en' && m.nomeEn) ? m.nomeEn : m.nome;
  return t('af.m.' + m.id);
}

/* ── O EFEITO, EM PROSA ──

   Uma frase por consequência, e todas as consequências que o motor
   produz — nem mais uma. Cada `if` daqui tem um `if` gémeo no
   js/combate-fu.js, e é assim que se percebe, a ler, que a ficha não
   promete nada que não aconteça. */
function _fbEfeito(f, m) {
  const fr = [];
  const varios = (m.alvos || 1) > 1 || m.todos;
  // O golpe comum é físico (ver fuAtacar); só as magias levam o elemento.
  const tipo = t('af.tipo.' + (m.lugar === 'comum' ? 'fisico' : (m.tipo || f.tipo)));

  if (m.danoFixo) {
    fr.push(t('af.b.ef.dano_fixo', { n: m.danoFixo, tipo }));
  } else if (m.fixo != null) {
    fr.push(t(varios ? 'af.b.ef.dano_cada' : 'af.b.ef.dano',
              { n: _fbDanoFixo(f, m), tipo }));
  }

  /* O Lamber Feridas é em si mesmo, e dizia "o alvo recupera" logo
     abaixo de um campo que dizia "O próprio" — duas maneiras de nomear a
     mesma criatura na mesma linha. */
  if (m.cura)
    fr.push(t(m.proprio ? 'af.b.ef.cura_proprio'
              : varios ? 'af.b.ef.cura_cada' : 'af.b.ef.cura', { n: m.cura }));

  /* O estado só acontece SEMPRE quando a magia o traz de origem. Sem
     isso é oportunidade de crítico — e é essa a diferença entre a
     Barragem e a Barragem Certa, que de resto são a mesma magia. */
  if (m.estado) {
    const e = t('af.est.' + m.estado);
    fr.push(m.estadoSempre
      ? t(varios ? 'af.b.ef.estado_cada' : 'af.b.ef.estado', { e })
      : t(varios ? 'af.b.ef.oportunidade_cada' : 'af.b.ef.oportunidade', { e }));
  }

  /* O que se põe de pé e dura a batalha. A chave do efeito é a chave do
     texto: uma linha nova no `cena` de uma magia aparece aqui sozinha,
     ou não aparece de todo — e não aparecer é visível. */
  for (const k of Object.keys(m.cena || {})) {
    /* A Barreira cai em três companheiros, e dizia "a Defesa DO ALVO".
       Quando há plural procura-se primeiro o texto plural; quando ele não
       existe (a Misericórdia é de um só) fica o singular, que é o certo. */
    const chave = 'af.b.ef.' + k;
    const plural = varios ? chave + '_cada' : null;
    const txtP = plural ? t(plural, { n: m.cena[k] }) : null;
    const txt = (txtP && txtP !== plural) ? txtP : t(chave, { n: m.cena[k] });
    if (txt && txt !== chave) fr.push(txt);
  }

  // O jeito do feitio no ataque forte (FU_ESTILO_FORTE, em js/magias-fu.js).
  const es = m.estilo || {};
  if (es.guardaAoAtacar)
    fr.push(t(es.guardaAoAtacar === 'equipa' ? 'af.b.ef.estilo_guarda3'
            : es.guardaAoAtacar === 'proprio_e_ferido' ? 'af.b.ef.estilo_guarda2'
            : 'af.b.ef.estilo_guarda'));
  if (es.furaGuarda)    fr.push(t('af.b.ef.estilo_fura'));
  if (es.semRSnaGuarda && !m.ignoraResistencias) fr.push(t('af.b.ef.estilo_fura_rs'));
  if (es.curaPorDano)
    fr.push(t(es.curaDividida ? 'af.b.ef.estilo_cura_div' : 'af.b.ef.estilo_cura'));
  if (es.limpaEstado)   fr.push(t('af.b.ef.estilo_limpa'));
  if (es.roubaPM)       fr.push(t('af.b.ef.estilo_rouba', { n: es.roubaPM }));
  if (m.proteger)       fr.push(t('af.b.ef.proteger'));
  if (m.limpa)          fr.push(t((m.alvos || 1) > 1 ? 'af.b.ef.limpa_cada' : 'af.b.ef.limpa'));
  // Cuidar da frente: toda cura da Sustentação vale mais em quem está na frente.
  if (f.feitio === 'sustentacao' && (m.cura || es.curaPorDano)) fr.push(t('af.b.ef.cuidar_frente'));

  if (m.ignoraResistencias) fr.push(t('af.b.ef.ignora'));
  if (m.corpoACorpo) fr.push(t('af.b.ef.corpo'));
  return fr.join(' ');
}

function _fbAccao(f, m) {
  const campos = [`<b>${esc(_fbMagiaNome(m))}</b>`];

  if (_fbRola(m)) {
    const [a, b] = _fbAtribs(m);
    const mod = _fbMod(f, m);
    campos.push(`<span class="fb-rolagem">【<i style="color:${FFU_COR[a]}">${
      esc(t('af.ab.' + a))}</i> + <i style="color:${FFU_COR[b]}">${
      esc(t('af.ab.' + b))}</i>】${mod ? ` +${mod}` : ''}</span>`);
  } else if (m.todos) {
    campos.push(`<span class="fb-semrol">${esc(t('af.b.sem_rolagem'))}</span>`);
  }

  campos.push(`<span>${esc(_fbCusto(m))}</span>`);
  campos.push(`<span>${esc(_fbAlvo(m))}</span>`);
  campos.push(`<span>${esc(t(m.cena ? 'af.b.cena' : m.proteger ? 'af.b.ate_turno' : 'af.b.instantaneo'))}</span>`);

  return `<div class="fb-acao">
    <div class="fb-campos">${campos.join('')}</div>
    <div class="fb-ef">${esc(_fbEfeito(f, m))}</div>
  </div>`;
}

/* As duas acções que não são magia nenhuma e que o menu da arena oferece
   em todos os turnos. Não estavam na ficha, e não estar não as tornava
   menos regras: um jogador que nunca carregou no escudo não sabia que
   guardar corta o dano a metade. */
function _fbOutras() {
  const linha = (nome, campos, efeito) => `<div class="fb-acao">
    <div class="fb-campos"><b>${esc(nome)}</b>${
      campos.map(c => `<span>${esc(c)}</span>`).join('')}</div>
    <div class="fb-ef">${esc(efeito)}</div>
  </div>`;
  return linha(t('af.b.guardar'),
               [t('af.b.turno'), t('af.b.alvo.proprio'), t('af.b.ate_turno')],
               t('af.b.guardar.ef'))
       + linha(t('af.b.mover'),
               [t('af.b.turno'), t('af.b.mover.alvo'), t('af.b.instantaneo')],
               t('af.b.mover.ef'))
       + linha(t('af.b.examinar'),
               [t('af.b.turno'), t('af.b.alvo.inimigo1'), t('af.b.instantaneo')],
               t('af.b.examinar.ef'));
}

/* ══ O QUE ESTÁ ACONTECENDO ══

   Só com batalha a correr, e só quando há alguma coisa: uma linha por
   efeito que está a mexer nos números deste avatar NESTE momento.

   ── PORQUE É QUE ISTO EXISTE ──

   Estas coisas já se viam — em etiquetas a flutuar por cima da cabeça,
   no céu do palco. Mas uma etiqueta que diz "Atordoado" não diz o que
   Atordoado faz, e não há espaço no céu para o dizer. O jogador via
   quatro palavras e não sabia porque é que o dado dele tinha encolhido.

   As duas coisas separam-se e cada uma fica onde serve: a MARCA no
   palco, para se ver de longe quem está como; a EXPLICAÇÃO aqui, na
   ficha que já se abre a tocar no bicho.

   ── DE ONDE SAI CADA LINHA ──

   Do lutador, que é o que a batalha tem na mão — nunca da ficha, que é
   o que ele é de nascença. Os seis estados dizem QUE DADO mordem, e esse
   dado sai do FU_ESTADOS (js/combate-fu.js) e não de uma lista escrita
   aqui: são a mesma tabela que o motor usa para encolher o dado, e a
   frase não pode discordar da conta. */
/* ══ O RESUMO, EM DADOS ══

   Uma lista só, com tudo o que está mexendo neste avatar agora. A ficha
   desenha a lista inteira; as marcas do palco usam os itens que têm
   marca (os passageiros) e o mesmo texto no `title`. Eram duas montagens
   da mesma frase, uma em cada arquivo, e elas já tinham começado a dizer
   coisas diferentes.

   Cada item traz:
     nome, texto   o que se lê (texto em texto puro, para o `title`)
     html          o mesmo texto com as setas coloridas, para a ficha
     tom           'mau' (vermelho), 'bom' (verde) ou 'fixo' (dourado)
     fixo          true nas vantagens e na costura, que não passam
     marca, classe o rótulo curto que vai para o céu do palco

   ── A ORDEM ──

   Primeiro o que passa: os estados, os efeitos a favor, no ar ou no
   chão, e a crise. Depois o que é dele de nascença: as vantagens e a
   costura. É a ordem em que a pergunta "o que está acontecendo?" se
   responde. */
function fuResumoAgora(c) {
  if (!c || !c.ficha) return [];
  const f = c.ficha;
  const L = [];
  const item = o => L.push(o);
  const dado = k => (typeof fuDado === 'function') ? ('d' + fuDado(c, k)) : '—';
  const seta = (sobe, k) => ({
    txt: (sobe ? '▲ ' : '▼ ') + t('af.ag.dado', { a: t('af.ab.' + k), d: dado(k) }),
    html: `<span class="fb-seta ${sobe ? 'sobe' : 'desce'}">${sobe ? '▲' : '▼'}</span> ${
      esc(t('af.ag.dado', { a: t('af.ab.' + k), d: dado(k) }))}`,
  });
  const simples = (id, nome, texto, tom, marca, classe) =>
    item({ id, nome, texto, html: esc(texto), tom, fixo: false, marca, classe });

  // ── os seis estados: seta vermelha e o tamanho em que o dado ficou ──
  const EST = (typeof FU_ESTADOS !== 'undefined') ? FU_ESTADOS : {};
  for (const e of Object.keys(c.estados || {})) {
    const partes = ((EST[e] && EST[e].morde) || []).map(k => seta(false, k));
    item({ id: 'est:' + e, nome: t('af.est.' + e),
           texto: partes.map(p => p.txt).join(' · '),
           html: partes.map(p => p.html).join(' · '),
           tom: 'mau', fixo: false, marca: t('af.est.' + e), classe: 'mal' });
  }

  // ── o que o ajuda, e passa ──
  const ef = c.efeitos || {};
  if (c.guardando)
    simples('guarda', t('af.ag.guarda'), t('af.ag.guarda.ef'), 'bom', '▲', 'bem');
  if (ef.resisteTipos && Object.keys(ef.resisteTipos).length) {
    const tipos = Object.keys(ef.resisteTipos).map(k => t('af.tipo.' + k)).join(', ');
    simples('concha', t('af.m.concha'), t('af.ag.concha.ef', { tipos }), 'bom', t('af.m.concha'), 'bem');
  }
  if (ef.defesaMinima)
    simples('barreira', t('af.m.barreira'),
            t(ef.defMagMinima ? 'af.ag.barreira2.ef' : 'af.ag.barreira.ef', { n: ef.defesaMinima }),
            'bom', t('af.m.barreira'), 'bem');
  if (ef.misericordia)
    simples('misericordia', t('af.m.misericordia'), t('af.ag.mercy.ef'),
            'bom', t('af.m.misericordia'), 'bem');
  if (ef.subirDado) {
    const p = seta(true, ef.subirDado);
    item({ id: 'despertar', nome: t('af.m.despertar'), texto: p.txt, html: p.html,
           tom: 'bom', fixo: false, marca: t('af.ab.' + ef.subirDado) + '▴', classe: 'bem' });
  }
  if (c.protegendo)
    simples('protegendo', t('af.ag.protegendo'), t('af.ag.protegendo.ef'), 'bom', '⛨', 'bem');

  // ── a crise, dita para ESTE avatar ──
  const vs = f.vantagens || [];
  const tem = id => vs.some(v => v && v.id === id);
  if (typeof fuEmCrise === 'function' && fuEmCrise(c)) {
    /* Nenhuma vantagem muda em crise desde que a Fúria da Crise e o Voo
       Baixo saíram (14/09/2026). O que muda é contra ele: a Execução do
       Lâmina inimigo bate mais em quem está em crise, e a frase diz isso. */
    const efeitos = [];
    void tem;
    const texto = t('af.ag.crise.ef', { pv: c.pv, max: f.pvMax })
      + ' — ' + (efeitos.length ? efeitos.join(' · ') : t('af.ag.crise.nada'));
    simples('crise', t('af.ag.crise'), texto, 'mau', '!', 'crise');
  }

  // ── o que é dele de nascença ──
  const base = id => (typeof FU_VANTAGENS !== 'undefined' && FU_VANTAGENS[id]) || {};
  const num = (v, k) => (v[k] != null ? v[k] : base(v.id)[k]);
  for (const v of vs) {
    if (!v) continue;
    const vars = {};
    if (v.id === 'guarda_cerrada') { vars.a = v.defesaMais; vars.b = v.defMagMais; }
    if (v.id === 'pele_calada' && Array.isArray(v.imunes)) {
      vars.a = t('af.est.' + v.imunes[0]); vars.b = t('af.est.' + v.imunes[1]);
    }
    if (v.id === 'carne_teimosa')  vars.n = num(v, 'pvMais');
    if (v.id === 'fonte_funda')    vars.n = num(v, 'pmMais');
    if (v.id === 'veia_avida')     vars.n = num(v, 'pmAoSofrer');
    if (v.id === 'golpe_pesado') {
      vars.n = v.danoMaisGolpe || v.danoMaisMagia || 0;
      vars.lado = t(v.danoMaisMagia ? 'afv.dano.magia' : 'afv.dano.golpe');
    }
    if (v.id === 'ultimo_suspiro') { vars.n = num(v, 'actoFinal'); vars.tipo = t('af.tipo.' + f.tipo); }
    if (v.id === 'mira_treinada') {
      vars.n = v.precisaoMais || v.magiaMais;
      vars.lado = t(v.precisaoMais ? 'afv.mira.golpe' : 'afv.mira.magia');
    }
    const chave = 'afv.' + v.id + '.curto';
    const texto = t(chave, vars);
    item({ id: 'vant:' + v.id, nome: fuVantagemNome(v), texto, html: esc(texto),
           tom: 'fixo', fixo: true });
  }
  if (f.costura) {
    const texto = t('af.ag.costura.ef', { tipo: t('af.tipo.' + f.costura) });
    item({ id: 'costura', nome: t('af.f.costura'), texto, html: esc(texto),
           tom: 'mau', fixo: true });
  }
  return L;
}

function _fbAgora(c, nivel) {
  /* Na ficha de um inimigo por examinar (`nivel` de 0 a 2): a fraqueza só
     aparece com 10+, e as vantagens com 13+. Os estados, que todos veem no
     palco, aparecem sempre. */
  const L = fuResumoAgora(c).filter(x => nivel == null
    || (x.id === 'costura' ? nivel >= 2
        : String(x.id).indexOf('vant:') === 0 ? nivel >= 3 : true));
  if (!L.length) return '';
  let jaFixo = false;
  return L.map(x => {
    /* Uma linha tracejada separa o que passa do que é dele de nascença. */
    const separa = x.fixo && !jaFixo && L[0] !== x;
    if (x.fixo) jaFixo = true;
    return `<div class="fb-ag ${x.tom}${separa ? ' separa' : ''}">
    <b>${esc(x.nome)}</b><span>${x.html}</span></div>`;
  }).join('');
}

/* ── AS REGRAS ESPECIAIS ──
   As vantagens, a costura que as paga, e a que ele ainda pode vir a ter. */
function _fbEspeciais(f) {
  const carta = (cls, nome, lado, desc) => `<div class="fb-regra ${cls}">
    <div class="fb-regra-top"><b>${esc(nome)}</b>${
      lado ? `<span>${esc(lado)}</span>` : ''}</div>
    <div class="fb-ef">${esc(desc)}</div>
  </div>`;

  /* A regra do feitio vem primeiro: é de todo avatar do feitio, e não do
     sorteio — Represália, Execução ou Resiliência, com o número do degrau
     (FU_REPRESALIA e as outras, em js/combate-fu.js). */
  const grau = f.raridade === 'Lendário' ? 3 : f.raridade === 'Raro' ? 2 : 1;
  const REGRA = {
    guarda:      ['af.regra.guarda',      typeof FU_REPRESALIA  !== 'undefined' ? FU_REPRESALIA[grau] : ''],
    lamina:      ['af.regra.lamina',      typeof FU_EXECUCAO    !== 'undefined' ? FU_EXECUCAO[grau] : ''],
    sustentacao: ['af.regra.sustentacao', typeof FU_RESILIENCIA !== 'undefined' ? Math.round(FU_RESILIENCIA[grau] * 100) : ''],
  }[f.feitio];
  let h = REGRA ? carta('boa', t(REGRA[0] + '.nome'), t('af.indole.' + f.feitio),
                        t(REGRA[0] + '.desc', { n: REGRA[1] })) : '';
  h += (f.vantagens || []).map(v =>
    carta('boa', fuVantagemNome(v), '', fuVantagemDesc(v))).join('');

  /* A costura é a desvantagem, e diz-se assim. Não é uma carta: é o tipo
     de dano a que ele é vulnerável, e é o preço da vantagem. */
  if (f.costura)
    h += carta('ma', t('af.f.costura'), t('af.tipo.' + f.costura),
               t('af.f.costura_desc'));

  /* E a que o Lendário ganharia se não fechasse a costura. Mostra-se a
     quem ainda tem a escolha por fazer, para a decisão ser uma decisão —
     sem isto escolhia-se às cegas entre fechar a costura e "outra
     coisa".

     O NOME em negrito e a condição à direita, como nas outras duas. Era
     ao contrário — "Se ficar com a costura, ganha:" em negrito e o nome
     da vantagem na etiqueta pequena — e o que se lê primeiro numa carta
     é o título dela. */
  if (f.raridade === 'Lendário' && f.costura && f.vantagens.length === 1
      && f.segundaPossivel)
    h += carta('porvir', fuVantagemNome(f.segundaPossivel),
               t('af.f.segunda'), fuVantagemDesc(f.segundaPossivel));
  return h;
}

function _fbSeccao(chave, corpo) {
  if (!corpo) return '';
  return `<div class="fb-sec">${esc(t(chave))}</div>${corpo}`;
}

// ═══════════════════════════════════════════════════════════════════
// O BLOCO INTEIRO
//
//   slot      o avatar, como está guardado (seed, nível, certidão)
//   lutador   opcional: o que a batalha lhe está a fazer agora
// ═══════════════════════════════════════════════════════════════════
/* ── A FICHA DE UM INIMIGO AINDA POR EXAMINAR ──
   Mostra só o que o jogador já descobriu (fuConhece, em js/combate-fu.js):
   nível 0 o nome e o nível; nível 1 o feitio, os traços sem a fraqueza e
   os atributos com a vida e o PM exatos; nível 2 as defesas, as afinidades
   e a fraqueza. As magias e as regras especiais só com o nível 3, e aí a
   ficha inteira volta a ser a de sempre. Antes do nível 2, as afinidades
   que os golpes já revelaram aparecem numa linha própria. */
function _fbFichaParcial(slot, lutador, f, conhece, aviso) {
  const n = conhece.nivel | 0;
  const af = conhece.af || {};
  const faixa = n >= 1 ? _fbFaixa(slot, lutador, f)
    : `<div class="fb-faixa"><div class="fb-nome">${esc(_fbNome(slot, lutador) || '')}</div>
       <div class="fb-tag">${esc(t('af.b.nv', { n: f.nivel }))}</div></div>`;
  const faixas = [1, 2, 3].map(k =>
    `<li class="${n >= k ? 'sabido' : ''}">${n >= k ? '✓' : '·'} ${esc(t('af.oculto.faixa.' + k))}</li>`).join('');
  const quadro = `<div class="fb-oculto"><b>${esc(t('af.oculto.titulo'))}</b>
    <ul>${faixas}</ul><p>${esc(t('af.oculto.como'))}</p></div>`;
  const soube = n < 2 ? Object.keys(af).map(k =>
    `<span class="cb-f-af ${af[k] === 'nada' ? '' : af[k]}">${esc(t('af.tipo.' + k))} ${
      af[k] === 'nada' ? '–' : af[k]}</span>`).join('') : '';
  const descobertas = soube
    ? `<div class="fb-linha fb-defs"><i>${esc(t('af.oculto.descobertas'))}</i> ${soube}</div>` : '';
  return `<div class="ficha fb">
    ${faixa}
    ${aviso}
    ${quadro}
    ${n >= 1 ? _fbDescricao(slot, f) : ''}
    ${n >= 1 ? _fbTracos(slot, n >= 2 ? f : Object.assign({}, f, { costura: null })) : ''}
    ${n >= 1 ? _fbAtributos(f, lutador) : ''}
    ${n >= 2 ? _fbDefesas(f, lutador) : descobertas}
    ${n >= 1 ? _fbSubidas(f) : ''}
    ${_fbSeccao('af.sec.agora', _fbAgora(lutador, n))}
  </div>`;
}

function renderFichaFU(slot, lutador, conhece) {
  if (typeof fuFicha !== 'function') return '';
  const f = lutador ? lutador.ficha : fuFicha(slot);
  if (!f) return '';

  /* Uma ficha de recurso não se mostra como se fosse boa. O `semDna` é
     ligado pelo js/ficha-fu.js quando o DNA não deu para ler, e sem este
     aviso o jogador via um avatar perfeitamente plausível — equilibrado
     8/8/8/8, fogo, 50 de vida — sem nada que dissesse que aqueles
     números não são dele. */
  const aviso = f.semDna
    ? `<div class="ficha-aviso">⚠ ${esc(t('af.f.sem_dna'))}</div>` : '';

  // A ficha do inimigo, até onde se sabe (a ação Examinar).
  if (conhece && conhece.nivel < 3) return _fbFichaParcial(slot, lutador, f, conhece, aviso);

  /* As magias, separadas pelo que o manual separa: o golpe comum é um
     ataque básico, e os outros dois lugares são magias. O feitio decide
     quais são — e por isso a secção das magias tem duas entradas e não
     quatro (ver o FU_LUGARES_DO_FEITIO, em js/magias-fu.js). */
  const magias = (typeof fuMagiasDe === 'function') ? fuMagiasDe(f) : {};
  const basicos = magias.comum ? _fbAccao(f, magias.comum) : '';
  const feitico = Object.keys(magias).filter(l => l !== 'comum')
    .map(l => _fbAccao(f, magias[l])).join('');

  return `<div class="ficha fb">
    ${_fbFaixa(slot, lutador, f)}
    ${aviso}
    ${_fbDescricao(slot, f)}
    ${_fbTracos(slot, f)}
    ${_fbAtributos(f, lutador)}
    ${_fbDefesas(f, lutador)}
    ${_fbSubidas(f)}
    ${_fbSeccao('af.sec.agora', _fbAgora(lutador))}
    ${_fbSeccao('af.sec.basicos', basicos)}
    ${_fbSeccao('af.sec.magias', feitico)}
    ${_fbSeccao('af.sec.outras', _fbOutras())}
    ${_fbSeccao('af.sec.especiais', _fbEspeciais(f))}
  </div>`;
}
