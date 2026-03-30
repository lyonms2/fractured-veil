// ═══════════════════════════════════════════════════════════════════
// LORE — Jogo narrativo de escolhas
// Depende de: avatar, gs, nivel, hatched, dead (globals)
//             spendCoins(), scheduleSave(), showBubble(), addLog(),
//             updateResourceUI(), showFloat() (globals)
// ═══════════════════════════════════════════════════════════════════

// ── Custos por raridade do capítulo ──────────────────────────────
const LORE_CUSTOS = {
  Comum:    { moeda: 'moedas',  valor: 50  },
  Raro:     { moeda: 'cristais', valor: 5  },
  Lendário: { moeda: 'cristais', valor: 15 },
};

// ── Estado da sessão de lore ──────────────────────────────────────
let _loreCapituloAtual = null;
let _loreCenaAtual     = null;
let _loreHistorico     = []; // ids das cenas visitadas (para não repetir)

// ═══════════════════════════════════════════════════════════════════
// CAPÍTULOS & CENAS
// ═══════════════════════════════════════════════════════════════════

// ─── Substitui [nome] e [elemento] pelo avatar actual ────────────
function _loreFmt(texto) {
  const nome = avatar?.nome?.split(',')[0]?.trim() || 'teu Avatar';
  const elem = avatar?.elemento || 'Desconhecido';
  return texto.replace(/\[nome\]/g, nome).replace(/\[elemento\]/g, elem);
}

const LORE_CAPITULOS = [

  // ──────────────────────────────────────────────────────
  // CAP 1 — O DIA SEGUINTE AO FIM DO MUNDO  (Comum)
  // ──────────────────────────────────────────────────────
  {
    id: 'dia_seguinte',
    titulo: 'Capítulo I — O Dia Seguinte ao Fim do Mundo',
    descricao: '2047. Três anos depois da 3ª Guerra Mundial. As bombas abriram fracturas na realidade — e por elas vieram os Avatares. Mas também veio O Vácuo.',
    icone: '☢️',
    raridade: 'Comum',
    cenas: {
      inicio: {
        texto: '2047. Três anos depois das bombas.\n\nO céu nunca mais voltou a ser azul. É desta cor agora — ferrugem oxidada, como se o mundo ainda estivesse a sangrar para o horizonte. A tua cidade não tem nome, porque as cidades sem sobreviventes perdem o direito a nomes.\n\nEstás nos escombros do que terá sido um supermercado. Tens água para dois dias. Tens medo há três anos.\n\nA cinquenta metros, a Fractura pulsa.\n\nÉ a quarta que vês esta semana — fendas abertas na realidade pelas explosões nucleares quando encontraram as linhas de falha dimensional. Os cientistas que sobreviveram chamam-lhes Fracturas do Véu. Os sobreviventes comuns chamam-lhes simplesmente portais.\n\nE desta Fractura... emerge algo.\n\nUma criatura pequena, feita de luz e [elemento]. Olhos que parecem conhecer mais do que qualquer humano vivo. Olha directamente para ti — como se sempre soubesse que estavas aqui.',
        escolhas: [
          { texto: '🚶 Caminhar até ela devagar', proxima: 'aproximar'  },
          { texto: '👁 Ficar imóvel e observar',  proxima: 'observar'   },
          { texto: '🏃 Recuar em silêncio',       proxima: 'recuar'     },
        ],
      },

      // ── Ramo: Aproximar ────────────────────────────
      aproximar: {
        texto: 'Cada passo faz a Fractura pulsar mais forte atrás da criatura.\n\nNão recua. Inclina a cabeça — uma expressão entre curiosidade e reconhecimento. Quando te ajoelhas e estendes a mão, ela pousa a pata na tua palma.\n\nCalor. Um calor que não sentias há três anos.\n\nO vínculo forma-se em silêncio, como duas coisas partidas que encontraram a forma de encaixar.\n\nMas a Fractura não fechou. Algo no outro lado empurra — uma escuridão sem forma mas com fome. A criatura sente antes de ti. Ergue-se, postura de combate. Os seus olhos mudam de cor.',
        escolhas: [
          { texto: '⚔️ Levantar e ficar ao lado de [nome]',  proxima: 'emissario_junto'   },
          { texto: '🛡 Pô-la atrás de ti e enfrentar',       proxima: 'emissario_protege'  },
        ],
      },

      // ── Ramo: Observar ─────────────────────────────
      observar: {
        texto: 'Do teu esconderijo, observas.\n\nOutro sobrevivente — um homem que não conheces — aproximou-se da Fractura antes de ti. Viste-o estender a mão para a criatura.\n\nAlgo escuro estendeu-se pela fenda antes dela chegar. Envolveu o homem. Não houve grito — apenas o silêncio de quem desapareceu do mundo em menos de um segundo.\n\nA criatura olhou para onde ele esteve. Depois olhou para o teu esconderijo.\n\nEncontrou o teu olhar entre os escombros. Veio ter contigo. Escondeu-se contigo entre os tijolos.\n\nNo teu colo. Como se sempre soubesse que ias estar aqui.\n\nA Fractura ainda pulsa. Algo ainda está lá.',
        escolhas: [
          { texto: '⚔️ Enfrentar o que saiu da Fractura', proxima: 'emissario_junto'   },
          { texto: '🏃 Fugir com ela enquanto há tempo',  proxima: 'emissario_fuga'     },
        ],
      },

      // ── Ramo: Recuar ───────────────────────────────
      recuar: {
        texto: 'Moves-te devagar, mas o chão trai-te.\n\nUm fragmento de vidro. Um som pequeno — mas suficiente. A criatura ouviu.\n\nSegue-te pelos escombros. Durante vinte minutos de labirinto de betão e cinzas, ela mantém a distância certa — perto o suficiente para não perder o rasto, longe o suficiente para não assustar.\n\nQuando finalmente paras, exausto, ela está sentada à tua frente. Paciente. Como se a perseguição tivesse sido o teste e tu o tivesses passado ao não parar.\n\nO vínculo forma-se de modo diferente — construído em movimento, não em quietude. Mais resiliente, talvez.\n\nMas um barulho atrás de vós paralisa os dois. A Fractura seguiu-vos. E pelo rasto dela, algo rastejou para este mundo.',
        escolhas: [
          { texto: '⚔️ Virar-se e enfrentar a ameaça',   proxima: 'emissario_junto'   },
          { texto: '🧠 Procurar uma saída táctica',       proxima: 'emissario_tatico'   },
        ],
      },

      // ── Encontro com o Emissário ────────────────────
      emissario_junto: {
        texto: 'Ele emerge da Fractura como fumo que aprendeu a ter forma.\n\nO primeiro Emissário do Vácuo.\n\nNão tem olhos — tem ausência de olhos. Não faz som — absorve o som à sua volta. A radioactividade do ar ao redor aumenta perceptivelmente. É feito do que as bombas deixaram para trás — não destruição física, mas o vazio que a destruição cria.\n\n[nome] posiciona-se entre tu e ele.\n\nA criatura sabe o que é. Já combateu isto antes — do outro lado da Fractura.',
        escolhas: [
          { texto: '⚔️ Lutar lado a lado com [nome]',              proxima: 'fim_juntos'     },
          { texto: '💥 Atacar primeiro e com tudo',                 proxima: 'fim_agressivo'  },
          { texto: '🧠 Distrair o Emissário para [nome] atacar',    proxima: 'fim_tatico'     },
          { texto: '🤚 Tentar perceber o que ele quer antes de agir', proxima: 'fim_observacao' },
        ],
      },

      emissario_protege: {
        texto: 'Colocas-te à frente da criatura.\n\nÉ um gesto que não planeaste — saiu antes de pensar. Ela deixa-te. Fica atrás de ti, pata no teu tornozelo, uma espécie de aprovação que sentes mais do que ouves.\n\nO Emissário emerge completamente. Fumo com forma. Vazio com fome.\n\nOlha para ti. Depois para a criatura atrás de ti. A sua atenção muda — és tu o obstáculo.',
        escolhas: [
          { texto: '⚔️ Segurar a posição enquanto [nome] flanqueia', proxima: 'fim_tatico'   },
          { texto: '💪 Enfrentar o Emissário de frente',             proxima: 'fim_agressivo' },
        ],
      },

      emissario_fuga: {
        texto: 'Corres. Com a criatura nos braços, corres pelos escombros.\n\nO Emissário não corre — desloca-se. Como sombra projectada em direcções impossíveis. Ganha terreno sem esforço aparente.\n\nNuma rua sem saída, paras. A criatura escorrega dos teus braços, vira-se, e faz algo que não esperavas:\n\nColoca-se entre ti e o Emissário. Sozinha. Voluntariamente.\n\nNão foge. Escolheu ficar.',
        escolhas: [
          { texto: '⚔️ Voltar e lutar ao lado dela',                      proxima: 'fim_juntos'  },
          { texto: '🧠 Procurar um ponto fraco enquanto ela o distrai',    proxima: 'fim_tatico'  },
        ],
      },

      emissario_tatico: {
        texto: 'Analisas o espaço rapidamente.\n\nOs escombros à volta formam um funil natural. Se o Emissário for atraído para o centro, as paredes de betão instável podem abater sobre ele. Improvável. Mas possível.\n\n[nome] entende antes de explicares — inclina a cabeça, lê a tua intenção de algum modo que não compreendes ainda, e começa a mover-se para o flanquear.\n\nO Emissário emerge completamente. Tem tempo. Ou julga que tem.',
        escolhas: [
          { texto: '🧠 Executar o plano — atrair e colapsar', proxima: 'fim_tatico'     },
          { texto: '⚔️ Mudar de plano e atacar directamente', proxima: 'fim_agressivo'  },
        ],
      },

      // ── FINAIS ─────────────────────────────────────
      fim_juntos: {
        texto: '[nome] e tu lutais como se sempre tivessem combatido juntos.\n\nNão é verdade — acabaram de se conhecer. Mas há qualquer coisa no vínculo que se formou hoje que transcende o tempo juntos. Ela amplifica o teu [elemento], tu cobres os seus flancos. O Emissário tenta dividir-vos. Não consegue.\n\nQuando o Emissário se dissolve, não morre — recua para a Fractura, que fecha atrás dele com um estalo que ressoa nos ossos.\n\nEles sempre recuam quando perdem.\n\nFicas a olhar para o espaço onde a Fractura esteve. [nome] aproxima-se e pousa a cabeça no teu joelho.\n\n"O Vácuo sabe que existes."\n\nNão sabes de onde vem a voz. Talvez da criatura. Talvez de ti mesmo.\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 40, vinculo: 2, humor: 15, saude: -10 },
        texto_fim: '⚔️ Combatestes juntos. O vínculo forjado na luta é diferente de qualquer outro.',
      },

      fim_agressivo: {
        texto: 'Atacas primeiro. Com tudo.\n\nO Emissário não esperava isso — a maioria dos humanos que encontrou fugiram. A tua agressividade surpreende-o por um segundo decisivo.\n\n[nome] aproveita o momento. O Emissário dissolve-se parcialmente, recua, e a Fractura fecha com violência.\n\nFicas a ofegar nos escombros. Saúde gasta. Mas de pé.\n\n[nome] observa-te com algo que parece ser uma mistura de respeito e preocupação.\n\nA Fractura fechou. Mas a sensação que ficou no ar — radioactiva, fria, com fome — diz que isto foi apenas o primeiro deles.\n\n"O Vácuo sabe que existes."\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 35, vinculo: 1, saude: -20, moedas: 30 },
        texto_fim: '💥 Agressividade funciona uma vez. Aprende outros métodos antes da próxima.',
      },

      fim_tatico: {
        texto: 'O plano funciona melhor do que esperavas.\n\n[nome] distrai o Emissário com precisão cirúrgica enquanto tu manobras para a posição certa. Quando o Emissário percebe a armadilha, já é tarde — o tecto de betão instável cede, e ele recua para a Fractura antes de ser completamente esmagado.\n\nA Fractura fecha. Silêncio.\n\n[nome] vem sentar-se ao teu lado nos escombros. Ambos exaustos. Nenhum ferido.\n\nIsso é raro neste mundo.\n\nNo pó, a criatura traça algo com a pata — linhas que não reconheces, mas que parecem um mapa.\n\n"O Vácuo sabe que existes. Mas tu também já sabes mais sobre ele."\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 45, vinculo: 2, humor: 20, moedas: 40 },
        texto_fim: '🧠 Inteligência e cooperação. A combinação mais rara no mundo pós-guerra.',
      },

      fim_observacao: {
        texto: 'Levantas a mão.\n\n[nome] para. O Emissário para. Tudo para durante três segundos que parecem uma eternidade.\n\nOlhas para ele — para a ausência de olhos, para o vazio com forma — e perguntas, em voz alta, algo que nunca pensaste perguntar:\n\n"O que queres?"\n\nNão responde com palavras. Mas algo muda na sua postura. Uma hesitação. Como se a pergunta fosse inesperada.\n\nDepois ataca — mas mais lento. [nome] deflecte com facilidade. O Emissário recua para a Fractura que fecha atrás dele.\n\nFicas imóvel muito depois de ir embora.\n\nHesitou. Porquê?\n\n"O Vácuo sabe que existes. E tu começaste a perceber que ele também tem algo a dizer."\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 50, vinculo: 3, humor: 10 },
        texto_fim: '🤚 Fizeste a pergunta certa. A resposta virá no Capítulo II.',
      },
    },
  },

  // ── Capítulos futuros (bloqueados) ───────────────────────────────
  {
    id: 'outras_fracturas',
    titulo: 'Capítulo II — As Outras Fracturas',
    descricao: 'O mapa que [nome] traçou no pó aponta para mais Fracturas. O Vácuo está a crescer.',
    icone: '🗺️',
    raridade: 'Comum',
    emBreve: true,
    cenas: {},
  },
  {
    id: 'conselho_sobreviventes',
    titulo: 'Capítulo III — O Conselho dos Sobreviventes',
    descricao: 'Outros sobreviventes com Avatares. Uma aliança frágil. Um inimigo em comum.',
    icone: '🏕️',
    raridade: 'Raro',
    emBreve: true,
    cenas: {},
  },
  {
    id: 'nucleo_vacuo',
    titulo: 'Capítulo IV — O Núcleo do Vácuo',
    descricao: 'A origem de tudo. O preço da vitória. A verdade sobre as Fracturas.',
    icone: '🕳️',
    raridade: 'Lendário',
    emBreve: true,
    cenas: {},
  },
];

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ═══════════════════════════════════════════════════════════════════

function loreGetCusto(cap) {
  return LORE_CUSTOS[cap.raridade];
}

function loreGetRaridadeAcesso(cap) {
  // O jogador precisa de ter avatar com raridade >= raridade do capítulo
  const ordem = { Comum: 0, Raro: 1, Lendário: 2 };
  const minha = ordem[avatar?.raridade || 'Comum'] ?? 0;
  const req   = ordem[cap.raridade] ?? 0;
  return minha >= req;
}

// Abre o modal de lore e renderiza a lista de capítulos
function abrirLore() {
  const modal = document.getElementById('loreModal');
  if(!modal) return;
  modal.style.display = 'flex';
  _loreRenderLista();
}

function fecharLore() {
  const modal = document.getElementById('loreModal');
  if(modal) modal.style.display = 'none';
  _loreCapituloAtual = null;
  _loreCenaAtual     = null;
  _loreHistorico     = [];
}

// Renderiza a lista de capítulos disponíveis
function _loreRenderLista() {
  const body = document.getElementById('loreBody');
  if(!body) return;

  if(!hatched || dead) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 10px;color:var(--muted);font-size:9px;line-height:1.8;">
        <div style="font-size:28px;margin-bottom:8px;">📖</div>
        Precisas de ter um avatar vivo para explorar o Lore.
      </div>`;
    return;
  }

  body.innerHTML = LORE_CAPITULOS.map(cap => {
    const custo   = loreGetCusto(cap);
    const temAcesso = loreGetRaridadeAcesso(cap);
    const temSaldo  = custo.moeda === 'moedas'
      ? gs.moedas   >= custo.valor
      : gs.cristais >= custo.valor;
    const iconeRar = cap.raridade === 'Lendário' ? '🌟' : cap.raridade === 'Raro' ? '🔵' : '⚪';
    const corRar   = cap.raridade === 'Lendário' ? 'var(--lendario)' : cap.raridade === 'Raro' ? 'var(--raro)' : 'var(--muted)';
    const moedaIcon = custo.moeda === 'moedas' ? '🪙' : '💎';
    const bloqueadoEmBreve = cap.emBreve;

    return `
      <div class="lore-cap-card ${(!temAcesso || bloqueadoEmBreve) ? 'lore-bloqueado' : ''}" onclick="${(temAcesso && !bloqueadoEmBreve) ? `iniciarCapitulo('${cap.id}')` : ''}">
        <div class="lore-cap-icone">${cap.icone}</div>
        <div class="lore-cap-info">
          <div class="lore-cap-titulo">${cap.titulo}</div>
          <div class="lore-cap-desc">${_loreFmt(cap.descricao)}</div>
          <div class="lore-cap-meta">
            <span style="color:${corRar};font-size:7px;">${iconeRar} ${cap.raridade}</span>
            <span class="lore-cap-custo">${moedaIcon} ${custo.valor}</span>
          </div>
        </div>
        ${bloqueadoEmBreve
          ? `<div class="lore-bloqueado-tag">🔜 Em breve</div>`
          : !temAcesso
          ? `<div class="lore-bloqueado-tag">🔒 Requer ${cap.raridade}</div>`
          : !temSaldo
          ? `<div class="lore-bloqueado-tag" style="background:rgba(231,76,60,.12);color:#e74c3c;border-color:rgba(231,76,60,.2);">Sem saldo</div>`
          : `<div class="lore-jogar-tag">▶ JOGAR</div>`}
      </div>`;
  }).join('');
}

// Inicia um capítulo — cobra o custo e abre a primeira cena
async function iniciarCapitulo(capId) {
  const cap = LORE_CAPITULOS.find(c => c.id === capId);
  if(!cap || !hatched || dead || !avatar) return;
  if(cap.emBreve) { showBubble('Este capítulo ainda não está disponível.'); return; }

  if(!loreGetRaridadeAcesso(cap)) {
    showBubble(`Precisas de um avatar ${cap.raridade} para este capítulo.`);
    return;
  }

  const custo = loreGetCusto(cap);
  if(custo.moeda === 'moedas') {
    if(gs.moedas < custo.valor) { showBubble(`Precisas de ${custo.valor} 🪙!`); return; }
    gs.moedas -= custo.valor;
  } else {
    if(gs.cristais < custo.valor) { showBubble(`Precisas de ${custo.valor} 💎!`); return; }
    gs.cristais -= custo.valor;
  }
  updateResourceUI();
  scheduleSave();

  _loreCapituloAtual = cap;
  _loreCenaAtual     = 'inicio';
  _loreHistorico     = [];

  _loreRenderCena();
}

// Renderiza a cena actual
function _loreRenderCena() {
  const body = document.getElementById('loreBody');
  if(!body || !_loreCapituloAtual || !_loreCenaAtual) return;

  const cap  = _loreCapituloAtual;
  const cena = cap.cenas[_loreCenaAtual];
  if(!cena) return;

  _loreHistorico.push(_loreCenaAtual);

  // Cena de fim
  if(cena.fim) {
    _loreAplicarRecompensa(cena.recompensa);
    const iconeRar = cap.raridade === 'Lendário' ? '🌟' : cap.raridade === 'Raro' ? '🔵' : '⚪';
    const recompTxt = _loreRecompensaTxt(cena.recompensa);
    body.innerHTML = `
      <div class="lore-cena-wrap">
        <div style="text-align:center;margin-bottom:12px;">
          <div style="font-size:28px;">${cap.icone}</div>
          <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:1px;margin-top:4px;">${cap.titulo}</div>
        </div>
        <div class="lore-texto">${_loreFmt(cena.texto)}</div>
        <div class="lore-fim-tag">${_loreFmt(cena.texto_fim)}</div>
        <div class="lore-recomp-box">
          <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-bottom:6px;">RECOMPENSAS</div>
          ${recompTxt}
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="lore-btn-secondary" onclick="_loreRenderLista()">← Capítulos</button>
          <button class="lore-btn-primary"   onclick="iniciarCapitulo('${cap.id}')">↺ Jogar de novo</button>
        </div>
      </div>`;
    return;
  }

  // Cena normal com escolhas
  body.innerHTML = `
    <div class="lore-cena-wrap">
      <div style="text-align:center;margin-bottom:10px;">
        <div style="font-size:22px;">${cap.icone}</div>
        <div style="font-family:'Cinzel',serif;font-size:7px;color:var(--muted);letter-spacing:1px;margin-top:3px;">${cap.titulo}</div>
      </div>
      <div class="lore-texto">${_loreFmt(cena.texto)}</div>
      <div class="lore-escolhas">
        ${cena.escolhas.map((e, i) => `
          <button class="lore-escolha-btn" onclick="loreEscolher(${i})">${_loreFmt(e.texto)}</button>
        `).join('')}
      </div>
      <button class="lore-btn-secondary" style="margin-top:10px;width:100%;" onclick="_loreRenderLista()">✕ Abandonar capítulo</button>
    </div>`;
}

// Processa a escolha do jogador
function loreEscolher(idx) {
  if(!_loreCapituloAtual || !_loreCenaAtual) return;
  const cena = _loreCapituloAtual.cenas[_loreCenaAtual];
  if(!cena || !cena.escolhas[idx]) return;

  _loreCenaAtual = cena.escolhas[idx].proxima;
  _loreRenderCena();
}

// Aplica as recompensas ao avatar
function _loreAplicarRecompensa(r) {
  if(!r || !hatched || !avatar) return;

  if(r.xp)      { xp      = (xp     || 0) + r.xp;      }
  if(r.moedas)  { gs.moedas   = Math.max(0, (gs.moedas   || 0) + r.moedas);  }
  if(r.humor)   { vitals.humor   = Math.min(100, Math.max(0, (vitals.humor   || 0) + r.humor));  }
  if(r.saude)   { vitals.saude   = Math.min(100, Math.max(0, (vitals.saude   || 0) + r.saude));  }
  if(r.energia) { vitals.energia = Math.min(100, Math.max(0, (vitals.energia || 0) + r.energia)); }
  if(r.vinculo) { vinculo  = Math.min(100, Math.max(0, (vinculo || 0) + r.vinculo)); }

  updateResourceUI();
  if(typeof updateAllUI === 'function') updateAllUI();
  scheduleSave();

  const moedaTxt = r.moedas ? ` +${r.moedas}🪙` : '';
  const xpTxt    = r.xp    ? ` +${r.xp}XP`     : '';
  addLog(`Lore: ${_loreCapituloAtual?.titulo}${xpTxt}${moedaTxt}`, 'good');
}

// Formata texto de recompensas
function _loreRecompensaTxt(r) {
  if(!r) return '';
  const items = [];
  if(r.xp)      items.push(`<span class="lore-recomp-item">⚡ +${r.xp} XP</span>`);
  if(r.moedas && r.moedas > 0)  items.push(`<span class="lore-recomp-item">🪙 +${r.moedas}</span>`);
  if(r.moedas && r.moedas < 0)  items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">🪙 ${r.moedas}</span>`);
  if(r.humor && r.humor > 0)    items.push(`<span class="lore-recomp-item">😊 +${r.humor} humor</span>`);
  if(r.humor && r.humor < 0)    items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😔 ${r.humor} humor</span>`);
  if(r.saude && r.saude > 0)    items.push(`<span class="lore-recomp-item">💚 +${r.saude} saúde</span>`);
  if(r.saude && r.saude < 0)    items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.saude} saúde</span>`);
  if(r.energia && r.energia > 0) items.push(`<span class="lore-recomp-item">⚡ +${r.energia} energia</span>`);
  if(r.energia && r.energia < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😴 ${r.energia} energia</span>`);
  if(r.vinculo && r.vinculo > 0) items.push(`<span class="lore-recomp-item">💜 +${r.vinculo} vínculo</span>`);
  if(r.vinculo && r.vinculo < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.vinculo} vínculo</span>`);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;">${items.join('')}</div>`;
}

// Exports
window.abrirLore        = abrirLore;
window.fecharLore       = fecharLore;
window.iniciarCapitulo  = iniciarCapitulo;
window.loreEscolher     = loreEscolher;
window._loreRenderLista = _loreRenderLista;
