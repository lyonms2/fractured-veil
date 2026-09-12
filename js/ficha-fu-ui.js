// ═══════════════════════════════════════════════════════════════════
// A FICHA, DESENHADA
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

/* O feitio, e o que ele lhe dá.

   Vem da FICHA e já não da certidão: é ela que o lê do DNA, e uma
   certidão velha a que falte o campo continua a dar o feitio certo.

   E diz-se o lugar que ele abre, porque é essa a consequência que
   interessa — sem isso o feitio era uma palavra bonita sem efeito
   visível, que é o que ele foi até hoje. */
function _ffuIndole(slot, f) {
  const i = (f && f.feitio) || (_ffuCertidao(slot) || {}).indole;
  if (!i) return '';
  const lugar = (typeof FU_LUGAR_DO_FEITIO !== 'undefined') ? FU_LUGAR_DO_FEITIO[i] : null;
  const abre = lugar ? ` · ${esc(t('af.lugar.' + lugar))}` : '';
  return `<div class="ficha-vocacao ficha-indole" title="${esc(t('af.indole.' + i + '.ex'))}">◇ ${
    esc(t('af.f.feitio', { i: t('af.indole.' + i) }))}${abre}</div>`;
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
  return t('afv.' + v.id + '.desc', vars);
}

/* ── AS QUATRO BARRAS ──

   A barra mede o DADO e não um número de 0 a 5: são quatro tamanhos
   possíveis (d6, d8, d10, d12) e a barra vai de um a outro. Um d6 não é
   "metade" de um d12 — é o pior dos quatro, e é isso que a barra tem de
   dizer.

   Quando há batalha a correr, o dado de AGORA aparece ao lado, e só
   quando é diferente: mostrar "d8 → d8" seria ruído em todos os turnos
   em que nada aconteceu. */
const FFU_COR = {
  DES: '#5ab4e8',   // Destreza — esquiva, iniciativa
  PER: '#c9a84c',   // Perspicácia — defesa mágica, precisão de magia
  VIG: '#e05555',   // Vigor — vida
  VON: '#7ab87a',   // Vontade — magia
};

function _ffuDados(f, c) {
  return FU_ATRIBS.map(k => {
    const base = f[k];
    const agora = c ? fuDado(c, k) : base;
    // d6 → 0%, d12 → 100%. É o intervalo verdadeiro dos quatro dados.
    const pct = Math.round((base - 6) / 6 * 100);
    const mudou = agora !== base
      ? `<span class="ficha-dado-agora ${agora > base ? 'sobe' : 'desce'}">d${agora}</span>` : '';
    return `<div class="ficha-stat" title="${esc(t('af.at.' + k))}">
      <div class="ficha-stat-lbl">${k}</div>
      <div class="ficha-stat-bar"><div class="ficha-stat-fill"
           style="width:${Math.max(8, pct)}%;background:${FFU_COR[k]};"></div></div>
      <div class="ficha-stat-val">d${base}${mudou}</div>
    </div>`;
  }).join('');
}

/* ── A LINHA DO ARRANJO ──

   Dizia só os quatro tamanhos: "◆ Especialista · d10 d10 d6 d6". E era
   por aí que dois avatares diferentes se liam como gémeos — porque essa
   linha mostra os dados por ORDEM DE FORÇA e não diz a quem pertencem.

   Um com o d10 no Vigor é um muro de vida; outro com o d10 na Vontade é
   um lançador com o dobro da magia. A ficha já dizia isso nas quatro
   barras logo abaixo, mas a linha de cima é a que se compara de relance,
   e era ela que mentia.

   Cada atributo leva a COR da sua barra. As duas leituras — a linha e as
   barras — passam a ser a mesma informação vista de duas distâncias, e o
   olho liga-as pela cor sem ter de as ler duas vezes.

   Pela ordem de força e não por DES/PER/VIG/VON: o que interessa é em que
   é que ele é bom, e isso lê-se da esquerda para a direita. */
function _ffuArranjo(f) {
  const dados = f.ordem.map(a =>
    `<span class="ficha-arr-at" style="color:${FFU_COR[a]}">${a}</span> d${f[a]}`
  ).join(' <i>·</i> ');
  return `<div class="ficha-vocacao ficha-arranjo" title="${esc(t('af.f.arranjo'))}">◆ ${
    esc(t('af.arr.' + f.arranjo))} · ${dados}</div>`;
}

/* ── O QUE LHE DÓI E O QUE NÃO ──

   As nove, e só as que têm alguma coisa. Um avatar médio tem duas ou
   três linhas aqui, e são elas que decidem contra quem ele é bom. */
/* ── DE ONDE VIERAM OS DADOS A MAIS ──

   Os quatro dados que a ficha mostra já têm as subidas dentro. Sem esta
   linha, dois avatares do mesmo arranjo apareciam com dados diferentes e
   não havia nada na tela que explicasse porquê — parecia acaso, e o
   jogador que pagou por um ovo Lendário não via o que comprou.

   Diz as duas fontes em separado porque são duas decisões diferentes: o
   ovo foi escolhido, o nível foi ganho. */
function _ffuSubidas(f) {
  if (!f.subidas) return '';
  const partes = [];
  const doOvo = (typeof FU_SUBIDA_DA_ORIGEM !== 'undefined')
    ? (FU_SUBIDA_DA_ORIGEM[f.origem] | 0) : 0;
  if (doOvo) partes.push(t('af.f.subida_de', { origem: f.origem }));
  const doNivel = f.subidas - doOvo;
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
  const aviso = perdidas
    ? ` <i class="ficha-subida-tecto">${esc(t('af.f.subida_tecto', { n: perdidas }))}</i>` : '';
  return `<div class="ficha-vocacao ficha-subidas">◈ ${
    esc(t(f.subidas === 1 ? 'af.f.subidas' : 'af.f.subidas_p', { n: f.subidas }))} · ${
    esc(partes.join(t('af.f.subida_e')))}${aviso}</div>`;
}

function _ffuAfinidades(f) {
  const chaves = Object.keys(f.afinidades || {}).filter(k => f.afinidades[k]);
  if (!chaves.length) return '';
  return `<div class="cb-f-afs">${chaves.map(k =>
    `<span class="cb-f-af ${f.afinidades[k]}" title="${esc(t('af.af.' + f.afinidades[k]))}">${
      esc(t('af.tipo.' + k))} ${f.afinidades[k]}</span>`).join(' ')}</div>`;
}

/* ── OS CINCO LUGARES ──
   O nome da magia, o lugar que ela ocupa e o que custa. O nome muda com
   o tipo do avatar nos dois lugares de ataque, e é isso que faz a ficha
   de um avatar de gelo ler-se diferente da de um de treva. */
function _ffuLugares(f) {
  if (typeof fuMagiasDe !== 'function') return '';
  const magias = fuMagiasDe(f);
  const nome = m => (window._currentLang === 'en' && m.nomeEn) ? m.nomeEn : (m.nome || t('af.m.' + m.id));
  return `<div class="ficha-lugares">${Object.keys(magias).map(l => {
    const m = magias[l];
    const custo = fuCusto(m, m.porAlvo ? (m.alvos || 1) : 1);
    return `<div class="cb-f-magia"><b>${esc(nome(m))}</b>
      <i>${esc(t('af.lugar.' + l))} · ${custo ? t('af.pm', { n: custo }) : t('af.gratis')}</i></div>`;
  }).join('')}</div>`;
}

function _ffuVantagens(f) {
  const cartas = (f.vantagens || []).slice();
  if (!cartas.length) return '';
  const linha = v => `<div class="vd boa">
      <div class="vd-top"><span class="vd-nome">${esc(fuVantagemNome(v))}</span></div>
      <div class="vd-desc">${esc(fuVantagemDesc(v))}</div>
    </div>`;

  /* A costura é a desvantagem, e diz-se assim. Não é uma carta: é o tipo
     de dano a que ele é vulnerável, e é o preço da vantagem. */
  const costura = f.costura
    ? `<div class="vd ma">
         <div class="vd-top"><span class="vd-nome">${esc(t('af.f.costura'))}</span>
           <span class="vd-custo">${esc(t('af.tipo.' + f.costura))}</span></div>
         <div class="vd-desc">${esc(t('af.f.costura_desc'))}</div>
       </div>` : '';

  /* E a que o Lendário ganharia se não fechasse a costura. Mostra-se a
     quem ainda tem a escolha por fazer, para a decisão ser uma decisão
     — sem isto escolhia-se às cegas entre fechar a costura e "outra
     coisa". */
  const segunda = (f.raridade === 'Lendário' && f.costura && f.vantagens.length === 1
                   && f.segundaPossivel)
    ? `<div class="vd boa porvir">
         <div class="vd-top"><span class="vd-nome">${esc(t('af.f.segunda'))}</span></div>
         <div class="vd-desc"><b>${esc(fuVantagemNome(f.segundaPossivel))}</b> · ${
           esc(fuVantagemDesc(f.segundaPossivel))}</div>
       </div>` : '';

  return `<div class="vd-bloco">${cartas.map(linha).join('')}${costura}${segunda}</div>`;
}

// ═══════════════════════════════════════════════════════════════════
// A FICHA INTEIRA
//
//   slot      o avatar, como está guardado (seed, nível, certidão)
//   lutador   opcional: o que a batalha lhe está a fazer agora
// ═══════════════════════════════════════════════════════════════════
function renderFichaFU(slot, lutador) {
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

  const linha = (r, v) => `<p class="cb-f-linha"><i>${esc(r)}</i><b>${v}</b></p>`;
  const vida = lutador ? `${lutador.pv} / ${f.pvMax}` : f.pvMax;
  const magia = lutador ? `${lutador.pm} / ${f.pmMax}` : f.pmMax;
  const def = lutador ? fuDefesa(lutador) : f.defesaBase;
  const defM = lutador ? fuDefesaMag(lutador) : f.defMagBase;

  return `<div class="ficha">
    <div class="ficha-title">${esc(t('af.f.titulo'))}</div>
    <div class="ficha-escalao">${_ffuSexo(slot)} · ${esc(t('af.f.nivel', { n: f.nivel }))} · ${esc(f.raridade)}</div>
    ${aviso}
    ${_ffuArranjo(f)}
    ${_ffuIndole(slot, f)}
    ${_ffuSubidas(f)}

    <div class="ficha-stats">${_ffuDados(f, lutador)}</div>

    <div class="ficha-bars">
      <div class="ficha-bar"><b style="color:#e05555;">${vida}</b><span>${esc(t('af.f.vida'))}</span></div>
      <div class="ficha-bar"><b style="color:#5ab4e8;">${magia}</b><span>${esc(t('af.f.magia'))}</span></div>
      <div class="ficha-bar"><b style="color:var(--gold-light);">${f.crise}</b><span>${esc(t('af.f.crise'))}</span></div>
    </div>

    ${linha(t('af.f.defesa'), def)}
    ${linha(t('af.f.defmag'), defM)}
    ${linha(t('af.f.tipo'), esc(t('af.tipo.' + f.tipo)))}
    ${f.bonusPrecisao ? linha(t('af.f.precisao'), '+' + f.bonusPrecisao) : ''}
    ${f.danoExtra ? linha(t('af.f.dano_extra'), '+' + f.danoExtra) : ''}

    <h4>${esc(t('af.f.afinidades'))}</h4>
    ${_ffuAfinidades(f)}

    ${_ffuVantagens(f)}

    <h4>${esc(t('af.f.lugares'))}</h4>
    ${_ffuLugares(f)}
  </div>`;
}
