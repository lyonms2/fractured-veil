// ═══════════════════════════════════════════════════════════════════
// LORE — Jogo narrativo de escolhas
// Depende de: avatar, gs, nivel, hatched, dead (globals)
//             scheduleSave(), showBubble(), addLog(),
//             updateResourceUI() (globals)
// ═══════════════════════════════════════════════════════════════════

// ── Custos por raridade do capítulo ──────────────────────────────
const LORE_CUSTOS = {
  Comum:    { moeda: 'moedas',   valor: 50 },
  Raro:     { moeda: 'cristais', valor: 5  },
  Lendário: { moeda: 'cristais', valor: 15 },
};

// ── Estado da sessão ──────────────────────────────────────────────
let _loreCapituloAtual = null;
let _loreCenaAtual     = null;
let _loreEscolhasFeitas = []; // [{cenaId, texto}] — para salvar o caminho

// ── Substitui [nome] e [elemento] pelo avatar atual ──────────────
function _loreFmt(texto) {
  const nome = avatar?.nome?.split(',')[0]?.trim() || 'seu Avatar';
  const elem = avatar?.elemento || 'Desconhecido';
  return texto.replace(/\[nome\]/g, nome).replace(/\[elemento\]/g, elem);
}

// ═══════════════════════════════════════════════════════════════════
// CAPÍTULOS
// ═══════════════════════════════════════════════════════════════════

const LORE_CAPITULOS = [

  // ──────────────────────────────────────────────────────
  // CAP I — O DIA SEGUINTE AO FIM DO MUNDO  (Comum, 50🪙)
  // ──────────────────────────────────────────────────────
  {
    id: 'dia_seguinte',
    titulo: 'Capítulo I — O Dia Seguinte ao Fim do Mundo',
    descricao: '2047. Três anos depois da 3ª Guerra Mundial. As bombas abriram Fracturas na realidade — e por elas vieram os Avatares. Mas também veio O Vácuo.',
    icone: '☢️',
    raridade: 'Comum',
    cenas: {

      // ── Cena inicial ─────────────────────────────────
      inicio: {
        texto: '2047. Três anos depois das bombas.\n\nO céu nunca mais voltou a ser azul. É dessa cor agora — ferrugem oxidada, como se o mundo ainda estivesse sangrando para o horizonte. Sua cidade não tem nome, porque cidades sem sobreviventes perdem o direito a nomes.\n\nVocê está nos escombros do que deve ter sido um supermercado. Tem água para dois dias. Tem medo há três anos.\n\nA cinquenta metros, a Fractura pulsa.\n\nÉ a quarta que você vê nessa semana — fendas abertas na realidade pelas explosões nucleares quando encontraram as linhas de falha dimensional. Os cientistas que sobreviveram as chamam de Fracturas do Véu. Os sobreviventes comuns chamam simplesmente de portais.\n\nE dessa Fractura... emerge algo.\n\nUma criatura pequena, feita de luz e [elemento]. Olhos que parecem saber mais do que qualquer humano vivo. Ela olha diretamente para você — como se sempre soubesse que você estaria aqui.',
        escolhas: [
          { texto: '🚶 Caminhar até ela devagar', proxima: 'aproximar' },
          { texto: '👁 Ficar imóvel e observar',  proxima: 'observar'  },
          { texto: '🏃 Recuar em silêncio',       proxima: 'recuar'    },
        ],
      },

      // ── Ramo: Aproximar ──────────────────────────────
      aproximar: {
        texto: 'Cada passo faz a Fractura pulsar mais forte atrás da criatura.\n\nEla não recua. Inclina a cabeça — uma expressão entre curiosidade e reconhecimento. Quando você se ajoelha e estende a mão, ela pousa a pata na sua palma.\n\nCalor. Um calor que você não sentia há três anos.\n\nO vínculo se forma em silêncio, como duas coisas quebradas que encontraram a forma de se encaixar.\n\nMas a Fractura não fechou. Algo do outro lado empurra — uma escuridão sem forma, mas com fome. A criatura sente antes de você. Se ergue, postura de combate. Seus olhos mudam de cor.',
        escolhas: [
          { texto: '⚔️ Levantar e ficar ao lado de [nome]', proxima: 'emissario_junto'   },
          { texto: '🛡 Colocá-la atrás de você e enfrentar', proxima: 'emissario_protege' },
        ],
      },

      // ── Ramo: Observar ───────────────────────────────
      observar: {
        texto: 'Do seu esconderijo, você observa.\n\nOutro sobrevivente — um homem que você não conhece — se aproximou da Fractura antes de você. Você o viu estender a mão para a criatura.\n\nAlgo escuro se estendeu pela fenda antes de ela chegar. Envolveu o homem. Não houve grito — apenas o silêncio de quem desapareceu do mundo em menos de um segundo.\n\nA criatura olhou para onde ele esteve. Depois olhou para o seu esconderijo.\n\nEncontrou o seu olhar entre os escombros. Veio até você. Se escondeu com você entre os tijolos.\n\nNo seu colo. Como se sempre soubesse que você estaria aqui.\n\nA Fractura ainda pulsa. Algo ainda está lá.',
        escolhas: [
          { texto: '⚔️ Enfrentar o que saiu da Fractura', proxima: 'emissario_junto' },
          { texto: '🏃 Fugir com ela enquanto há tempo',  proxima: 'emissario_fuga'  },
        ],
      },

      // ── Ramo: Recuar ─────────────────────────────────
      recuar: {
        texto: 'Você se move devagar, mas o chão te trai.\n\nUm fragmento de vidro. Um som pequeno — mas suficiente. A criatura ouviu.\n\nSe a segue pelos escombros. Durante vinte minutos de labirinto de concreto e cinzas, ela mantém a distância certa — perto o suficiente para não perder o rastro, longe o suficiente para não assustar.\n\nQuando você finalmente para, exausto, ela está sentada à sua frente. Paciente. Como se a perseguição tivesse sido o teste e você o tivesse passado ao não parar.\n\nO vínculo se forma de modo diferente — construído em movimento, não em quietude. Mais resiliente, talvez.\n\nMas um barulho atrás de vocês paralisa os dois. A Fractura os seguiu. E pelo rastro dela, algo rastejou para este mundo.',
        escolhas: [
          { texto: '⚔️ Virar e enfrentar a ameaça',    proxima: 'emissario_junto'  },
          { texto: '🧠 Procurar uma saída tática',      proxima: 'emissario_tatico' },
        ],
      },

      // ── Encontro com o Emissário ─────────────────────
      emissario_junto: {
        texto: 'Ele emerge da Fractura como fumaça que aprendeu a ter forma.\n\nO primeiro Emissário do Vácuo.\n\nNão tem olhos — tem ausência de olhos. Não faz som — absorve o som ao redor. A radioatividade do ar aumenta perceptivelmente. É feito do que as bombas deixaram para trás — não destruição física, mas o vazio que a destruição cria.\n\n[nome] se posiciona entre você e ele.\n\nA criatura sabe o que é. Já combateu isso antes — do outro lado da Fractura.',
        escolhas: [
          { texto: '⚔️ Lutar lado a lado com [nome]',               proxima: 'fim_juntos'      },
          { texto: '💥 Atacar primeiro e com tudo',                  proxima: 'fim_agressivo'   },
          { texto: '🧠 Distrair o Emissário para [nome] atacar',     proxima: 'fim_tatico'      },
          { texto: '🤚 Tentar entender o que ele quer antes de agir', proxima: 'fim_observacao' },
        ],
      },

      emissario_protege: {
        texto: 'Você se coloca à frente da criatura.\n\nFoi um gesto que você não planejou — saiu antes de pensar. Ela deixa. Fica atrás de você, pata no seu tornozelo, uma espécie de aprovação que você sente mais do que ouve.\n\nO Emissário emerge completamente. Fumaça com forma. Vazio com fome.\n\nOlha para você. Depois para a criatura atrás de você. A atenção dele muda — você é o obstáculo.',
        escolhas: [
          { texto: '⚔️ Segurar a posição enquanto [nome] flanqueia', proxima: 'fim_tatico'    },
          { texto: '💪 Enfrentar o Emissário de frente',             proxima: 'fim_agressivo' },
        ],
      },

      emissario_fuga: {
        texto: 'Você corre. Com a criatura nos braços, corre pelos escombros.\n\nO Emissário não corre — se desloca. Como sombra projetada em direções impossíveis. Ganha terreno sem esforço aparente.\n\nNuma rua sem saída, você para. A criatura escorrega dos seus braços, se vira, e faz algo que você não esperava:\n\nSe coloca entre você e o Emissário. Sozinha. Voluntariamente.\n\nNão foge. Ela escolheu ficar.',
        escolhas: [
          { texto: '⚔️ Voltar e lutar ao lado dela',                      proxima: 'fim_juntos' },
          { texto: '🧠 Procurar um ponto fraco enquanto ela o distrai',    proxima: 'fim_tatico' },
        ],
      },

      emissario_tatico: {
        texto: 'Você analisa o espaço rapidamente.\n\nOs escombros ao redor formam um funil natural. Se o Emissário for atraído para o centro, as paredes de concreto instável podem desabar sobre ele. Improvável. Mas possível.\n\n[nome] entende antes de você explicar — inclina a cabeça, lê sua intenção de algum modo que você ainda não compreende, e começa a se mover para flanqueá-lo.\n\nO Emissário emerge completamente. Acha que tem tempo. Ou pelo menos julga que tem.',
        escolhas: [
          { texto: '🧠 Executar o plano — atrair e colapsar', proxima: 'fim_tatico'    },
          { texto: '⚔️ Mudar de plano e atacar diretamente',  proxima: 'fim_agressivo' },
        ],
      },

      // ── Finais ───────────────────────────────────────
      fim_juntos: {
        texto: '[nome] e você lutam como se sempre tivessem combatido juntos.\n\nNão é verdade — acabaram de se conhecer. Mas há algo no vínculo que se formou hoje que transcende o tempo juntos. Ela amplifica o seu [elemento], você cobre os flancos dela. O Emissário tenta dividir vocês. Não consegue.\n\nQuando o Emissário se dissolve, ele não morre — recua para a Fractura, que fecha atrás dele com um estalo que ressoa nos ossos.\n\nEles sempre recuam quando perdem.\n\nVocê fica olhando para o espaço onde a Fractura esteve. [nome] se aproxima e pousa a cabeça no seu joelho.\n\n"O Vácuo sabe que você existe."\n\nVocê não sabe de onde vem a voz. Talvez da criatura. Talvez de você mesmo.\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 40, vinculo: 2, humor: 15, saude: -10 },
        texto_fim: '⚔️ Vocês lutaram juntos. O vínculo forjado na batalha é diferente de qualquer outro.',
      },

      fim_agressivo: {
        texto: 'Você ataca primeiro. Com tudo.\n\nO Emissário não esperava isso — a maioria dos humanos que ele encontrou fugiu. Sua agressividade o surpreende por um segundo decisivo.\n\n[nome] aproveita o momento. O Emissário se dissolve parcialmente, recua, e a Fractura fecha com violência.\n\nVocê fica ofegando nos escombros. Saúde gasta. Mas de pé.\n\n[nome] te observa com algo que parece ser uma mistura de respeito e preocupação.\n\nA Fractura fechou. Mas a sensação que ficou no ar — radioativa, fria, faminta — diz que esse foi apenas o primeiro deles.\n\n"O Vácuo sabe que você existe."\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 35, vinculo: 1, saude: -20, moedas: 30 },
        texto_fim: '💥 Agressividade funciona uma vez. Aprenda outros métodos antes da próxima.',
      },

      fim_tatico: {
        texto: 'O plano funciona melhor do que você esperava.\n\n[nome] distrai o Emissário com precisão cirúrgica enquanto você manobra para a posição certa. Quando o Emissário percebe a armadilha, já é tarde — o teto de concreto instável cede, e ele recua para a Fractura antes de ser completamente esmagado.\n\nA Fractura fecha. Silêncio.\n\n[nome] vem se sentar ao seu lado nos escombros. Ambos exaustos. Nenhum ferido.\n\nIsso é raro neste mundo.\n\nNo pó, a criatura traça algo com a pata — linhas que você não reconhece, mas que parecem um mapa.\n\n"O Vácuo sabe que você existe. Mas você também já sabe mais sobre ele."\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 45, vinculo: 2, humor: 20, moedas: 40 },
        texto_fim: '🧠 Inteligência e cooperação. A combinação mais rara no mundo pós-guerra.',
      },

      fim_observacao: {
        texto: 'Você levanta a mão.\n\n[nome] para. O Emissário para. Tudo para durante três segundos que parecem uma eternidade.\n\nVocê olha para ele — para a ausência de olhos, para o vazio com forma — e pergunta, em voz alta, algo que nunca pensou em perguntar:\n\n"O que você quer?"\n\nEle não responde com palavras. Mas algo muda na postura dele. Uma hesitação. Como se a pergunta fosse inesperada.\n\nDepois ataca — mas mais devagar. [nome] desvia com facilidade. O Emissário recua para a Fractura que fecha atrás dele.\n\nVocê fica imóvel muito depois dele ter ido embora.\n\nEle hesitou. Por quê?\n\n"O Vácuo sabe que você existe. E você começou a perceber que ele também tem algo a dizer."\n\n― Capítulo II: As Outras Fracturas ― (em breve)',
        fim: true,
        recompensa: { xp: 50, vinculo: 3, humor: 10 },
        texto_fim: '🤚 Você fez a pergunta certa. A resposta virá no Capítulo II.',
      },
    },
  },

  // ── Capítulos futuros (bloqueados) ───────────────────────────────
  {
    id: 'outras_fracturas',
    titulo: 'Capítulo II — As Outras Fracturas',
    descricao: 'O mapa que [nome] traçou no pó aponta para mais Fracturas. O Vácuo está crescendo.',
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
  const ordem = { Comum: 0, Raro: 1, Lendário: 2 };
  const minha = ordem[avatar?.raridade || 'Comum'] ?? 0;
  const req   = ordem[cap.raridade] ?? 0;
  return minha >= req;
}

function abrirLore() {
  const modal = document.getElementById('loreModal');
  if(!modal) return;
  modal.style.display = 'flex';
  _loreRenderLista();
}

function fecharLore() {
  const modal = document.getElementById('loreModal');
  if(modal) modal.style.display = 'none';
  _loreCapituloAtual  = null;
  _loreCenaAtual      = null;
  _loreEscolhasFeitas = [];
}

// ── Lista de capítulos ────────────────────────────────────────────
function _loreRenderLista() {
  const body = document.getElementById('loreBody');
  if(!body) return;

  if(!hatched || dead) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 10px;color:var(--muted);font-size:9px;line-height:1.8;">
        <div style="font-size:28px;margin-bottom:8px;">📖</div>
        Você precisa de um avatar vivo para explorar o Lore.
      </div>`;
    return;
  }

  body.innerHTML = LORE_CAPITULOS.map(cap => {
    const custo        = loreGetCusto(cap);
    const temAcesso    = loreGetRaridadeAcesso(cap);
    const temSaldo     = custo.moeda === 'moedas' ? gs.moedas >= custo.valor : gs.cristais >= custo.valor;
    const concluido    = !!(gs.loreProgresso?.[cap.id]);
    const emBreve      = !!cap.emBreve;
    const iconeRar     = cap.raridade === 'Lendário' ? '🌟' : cap.raridade === 'Raro' ? '🔵' : '⚪';
    const corRar       = cap.raridade === 'Lendário' ? 'var(--lendario)' : cap.raridade === 'Raro' ? 'var(--raro)' : 'var(--muted)';
    const moedaIcon    = custo.moeda === 'moedas' ? '🪙' : '💎';

    let tagHtml;
    if(emBreve)         tagHtml = `<div class="lore-bloqueado-tag">🔜 Em breve</div>`;
    else if(!temAcesso) tagHtml = `<div class="lore-bloqueado-tag">🔒 Requer ${cap.raridade}</div>`;
    else if(concluido)  tagHtml = `<div class="lore-jogar-tag" style="background:rgba(100,200,120,.12);color:#6ee7a0;border-color:rgba(100,200,120,.25);">📖 LER</div>`;
    else if(!temSaldo)  tagHtml = `<div class="lore-bloqueado-tag" style="background:rgba(231,76,60,.12);color:#e74c3c;border-color:rgba(231,76,60,.2);">Sem saldo</div>`;
    else                tagHtml = `<div class="lore-jogar-tag">▶ JOGAR</div>`;

    let acao = '';
    if(!emBreve && temAcesso) {
      acao = concluido ? `lerCapituloSalvo('${cap.id}')` : `iniciarCapitulo('${cap.id}')`;
    }

    return `
      <div class="lore-cap-card ${(!temAcesso || emBreve) ? 'lore-bloqueado' : ''}" ${acao ? `onclick="${acao}"` : ''}>
        <div class="lore-cap-icone">${cap.icone}</div>
        <div class="lore-cap-info">
          <div class="lore-cap-titulo">${cap.titulo}</div>
          <div class="lore-cap-desc">${_loreFmt(cap.descricao)}</div>
          <div class="lore-cap-meta">
            <span style="color:${corRar};font-size:7px;">${iconeRar} ${cap.raridade}</span>
            <span class="lore-cap-custo">${moedaIcon} ${custo.valor}</span>
          </div>
        </div>
        ${tagHtml}
      </div>`;
  }).join('');
}

// ── Iniciar capítulo (cobra custo) ───────────────────────────────
async function iniciarCapitulo(capId) {
  const cap = LORE_CAPITULOS.find(c => c.id === capId);
  if(!cap || !hatched || dead || !avatar) return;
  if(cap.emBreve) { showBubble('Este capítulo ainda não está disponível.'); return; }
  if(!loreGetRaridadeAcesso(cap)) { showBubble(`Você precisa de um avatar ${cap.raridade} para este capítulo.`); return; }

  const custo = loreGetCusto(cap);
  if(custo.moeda === 'moedas') {
    if(gs.moedas < custo.valor) { showBubble(`Você precisa de ${custo.valor} 🪙!`); return; }
    gs.moedas -= custo.valor;
  } else {
    if(gs.cristais < custo.valor) { showBubble(`Você precisa de ${custo.valor} 💎!`); return; }
    gs.cristais -= custo.valor;
  }
  updateResourceUI();
  scheduleSave();

  _loreCapituloAtual  = cap;
  _loreCenaAtual      = 'inicio';
  _loreEscolhasFeitas = [];

  _loreRenderCena();
}

// ── Renderiza a cena atual (modo interativo) ──────────────────────
function _loreRenderCena() {
  const body = document.getElementById('loreBody');
  if(!body || !_loreCapituloAtual || !_loreCenaAtual) return;

  const cap  = _loreCapituloAtual;
  const cena = cap.cenas[_loreCenaAtual];
  if(!cena) return;

  // Cena de fim — salva o caminho e exibe o encerramento
  if(cena.fim) {
    _loreAplicarRecompensa(cena.recompensa);

    // Salvar progresso
    if(!gs.loreProgresso) gs.loreProgresso = {};
    gs.loreProgresso[cap.id] = {
      caminho: [..._loreEscolhasFeitas],
      fimId:   _loreCenaAtual,
    };
    scheduleSave();

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
        <div style="margin-top:14px;">
          <button class="lore-btn-secondary" style="width:100%;" onclick="_loreRenderLista()">← Capítulos</button>
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

// ── Processa a escolha do jogador ────────────────────────────────
function loreEscolher(idx) {
  if(!_loreCapituloAtual || !_loreCenaAtual) return;
  const cena = _loreCapituloAtual.cenas[_loreCenaAtual];
  if(!cena || !cena.escolhas[idx]) return;

  _loreEscolhasFeitas.push({
    cenaId: _loreCenaAtual,
    texto:  _loreFmt(cena.escolhas[idx].texto),
  });

  _loreCenaAtual = cena.escolhas[idx].proxima;
  _loreRenderCena();
}

// ── Modo leitura — exibe o caminho salvo sem interação ───────────
function lerCapituloSalvo(capId) {
  const cap  = LORE_CAPITULOS.find(c => c.id === capId);
  const prog = gs.loreProgresso?.[capId];
  if(!cap || !prog) { iniciarCapitulo(capId); return; }

  const body = document.getElementById('loreBody');
  if(!body) return;

  let html = `<div class="lore-cena-wrap">
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:28px;">${cap.icone}</div>
      <div style="font-family:'Cinzel',serif;font-size:8px;color:var(--gold);letter-spacing:1px;margin-top:4px;">${cap.titulo}</div>
    </div>`;

  // Percorre o caminho salvo
  for(const passo of prog.caminho) {
    const cena = cap.cenas[passo.cenaId];
    if(!cena) continue;
    html += `<div class="lore-texto">${_loreFmt(cena.texto)}</div>`;
    html += `<div class="lore-escolha-lida">▶ ${passo.texto}</div>`;
  }

  // Cena final
  const cenaFim = cap.cenas[prog.fimId];
  if(cenaFim) {
    html += `<div class="lore-texto">${_loreFmt(cenaFim.texto)}</div>`;
    html += `<div class="lore-fim-tag">${_loreFmt(cenaFim.texto_fim)}</div>`;
  }

  html += `
    <div style="margin-top:14px;">
      <button class="lore-btn-secondary" style="width:100%;" onclick="_loreRenderLista()">← Capítulos</button>
    </div>
  </div>`;

  body.innerHTML = html;
}

// ── Reiniciar capítulo (apaga progresso e cobra novamente) ────────
function rejograrCapitulo(capId) {
  if(gs.loreProgresso) delete gs.loreProgresso[capId];
  iniciarCapitulo(capId);
}

// ── Aplica recompensas ao avatar ─────────────────────────────────
function _loreAplicarRecompensa(r) {
  if(!r || !hatched || !avatar) return;

  if(r.xp)      { xp             = (xp             || 0) + r.xp; }
  if(r.moedas)  { gs.moedas      = Math.max(0,   (gs.moedas      || 0) + r.moedas);  }
  if(r.humor)   { vitals.humor   = Math.min(100, Math.max(0, (vitals.humor   || 0) + r.humor));  }
  if(r.saude)   { vitals.saude   = Math.min(100, Math.max(0, (vitals.saude   || 0) + r.saude));  }
  if(r.energia) { vitals.energia = Math.min(100, Math.max(0, (vitals.energia || 0) + r.energia)); }
  if(r.vinculo) { vinculo        = Math.min(100, Math.max(0, (vinculo        || 0) + r.vinculo)); }

  updateResourceUI();
  if(typeof updateAllUI === 'function') updateAllUI();
  scheduleSave();

  const moedaTxt = r.moedas ? ` +${r.moedas}🪙` : '';
  const xpTxt    = r.xp    ? ` +${r.xp}XP`     : '';
  addLog(`Lore: ${_loreCapituloAtual?.titulo}${xpTxt}${moedaTxt}`, 'good');
}

// ── Formata texto de recompensas ─────────────────────────────────
function _loreRecompensaTxt(r) {
  if(!r) return '';
  const items = [];
  if(r.xp)                      items.push(`<span class="lore-recomp-item">⚡ +${r.xp} XP</span>`);
  if(r.moedas  && r.moedas > 0) items.push(`<span class="lore-recomp-item">🪙 +${r.moedas}</span>`);
  if(r.moedas  && r.moedas < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">🪙 ${r.moedas}</span>`);
  if(r.humor   && r.humor  > 0) items.push(`<span class="lore-recomp-item">😊 +${r.humor} humor</span>`);
  if(r.humor   && r.humor  < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😔 ${r.humor} humor</span>`);
  if(r.saude   && r.saude  > 0) items.push(`<span class="lore-recomp-item">💚 +${r.saude} saúde</span>`);
  if(r.saude   && r.saude  < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.saude} saúde</span>`);
  if(r.energia && r.energia > 0) items.push(`<span class="lore-recomp-item">⚡ +${r.energia} energia</span>`);
  if(r.energia && r.energia < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">😴 ${r.energia} energia</span>`);
  if(r.vinculo && r.vinculo > 0) items.push(`<span class="lore-recomp-item">💜 +${r.vinculo} vínculo</span>`);
  if(r.vinculo && r.vinculo < 0) items.push(`<span class="lore-recomp-item" style="color:#e74c3c;">💔 ${r.vinculo} vínculo</span>`);
  return `<div style="display:flex;flex-wrap:wrap;gap:6px;">${items.join('')}</div>`;
}

// ── Exports ───────────────────────────────────────────────────────
window.abrirLore        = abrirLore;
window.fecharLore       = fecharLore;
window.iniciarCapitulo  = iniciarCapitulo;
window.loreEscolher     = loreEscolher;
window._loreRenderLista = _loreRenderLista;
window.lerCapituloSalvo = lerCapituloSalvo;
window.rejograrCapitulo = rejograrCapitulo;
