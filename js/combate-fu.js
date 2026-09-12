// ═══════════════════════════════════════════════════════════════════
//  O MOTOR — Fabula Ultima
//
//  Substitui o js/combate-3dt.js. Lá o combate somava Força de Ataque
//  contra Força de Defesa; aqui rolam-se dois dados, compara-se com a
//  Defesa do alvo, e o maior dos dois dados entra no dano.
//
//  ── O QUE ESTE ARQUIVO PROMETE ──
//
//  1. NÃO TOCA NO ECRÃ. Nem um getElementById, nem um texto traduzido.
//     Devolve EVENTOS — dados — e quem os conta ao jogador é a arena.
//     O motor antigo misturava as duas coisas e por isso não havia como
//     o correr sem navegador.
//
//  2. REPETE-SE. O acaso vive DENTRO do estado: um contador ao lado do
//     seed. A mesma batalha com as mesmas escolhas dá exactamente os
//     mesmos dados, hoje e no servidor. É isso que torna as auditorias
//     possíveis — e é isso que, no dia do PvP, deixa o servidor
//     conferir uma luta que o cliente diz ter ganho.
//
//  3. É JSON. Nada no estado é uma função, uma data ou uma referência
//     circular. Grava-se, manda-se pela rede, recarrega-se.
// ═══════════════════════════════════════════════════════════════════

/* ── OS SEIS ESTADOS ──

   No manual são todos a mesma coisa: encolhem um dado. Isso é o que os
   torna fáceis de ler numa batalha — não há que decorar seis efeitos
   diferentes, há que saber que atributo cada um morde.

   E somam-se: atordoado com enfurecido tiram DOIS tamanhos à Percepção.
   Mas nenhum dado desce abaixo de d6, que é o piso do manual. */
const FU_ESTADOS = {
  atordoado:  { morde: ['PER'] },
  enfurecido: { morde: ['DES', 'PER'] },
  envenenado: { morde: ['VIG', 'VON'] },
  abalado:    { morde: ['VON'] },
  lento:      { morde: ['DES'] },
  fraco:      { morde: ['VIG'] },
};
const FU_ESTADOS_LISTA = Object.keys(FU_ESTADOS);

/* ── O ACASO ──

   Um gerador por batalha, guardado no estado como {semente, passo}. O
   passo conta quantos números já saíram; para repetir a batalha
   rebobina-se o passo a zero e joga-se outra vez.

   Não é o Math.random de propósito, e não é por preciosismo: sem isto
   uma luta não se pode repetir, e uma luta que não se pode repetir não
   se pode auditar nem verificar. */
function _fuAcaso(rng) {
  let x = ((rng.semente | 0) ^ 0x9E3779B9) >>> 0;
  // avança até ao passo actual — o estado guarda a POSIÇÃO, não o gerador
  for (let i = 0; i <= rng.passo; i++) {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
  }
  rng.passo++;
  return x;
}

/* Um dado de N faces. O manual só usa d6, d8, d10 e d12, mas isto
   aceita qualquer um — é o motor, não o catálogo. */
function fuRolar(rng, faces) {
  return 1 + (_fuAcaso(rng) % Math.max(1, faces | 0));
}

/* ═══════════════════════════════════════════════════════════════════
   A ROLAGEM

   Dois dados, sempre. O manual (p. 38): "as rolagens exigem sempre
   exactamente dois dados."

     resultado   os dois somados, mais o modificador
     HR          o maior dos dois — é ele que entra no dano
     crítico     os dois iguais E de 6 para cima
     pifão       os dois a 1, e falha sempre, aconteça o que acontecer

   O crítico NÃO é "tirar alto": é tirar IGUAL. Um duplo 6 é crítico e
   um 5+12 não é, embora some mais. É a regra que dá aos dados pequenos
   uma hipótese que os grandes não têm — um avatar de d6 e d6 critica
   uma vez em seis; um de d12 e d12, uma em doze.
   ═══════════════════════════════════════════════════════════════════ */
function fuRolagem(rng, faces1, faces2, modificador) {
  const a = fuRolar(rng, faces1);
  const b = fuRolar(rng, faces2);
  const mod = modificador | 0;
  return {
    dados: [a, b],
    hr: Math.max(a, b),
    resultado: a + b + mod,
    modificador: mod,
    critico: a === b && a >= 6,
    pifao: a === 1 && b === 1,
  };
}

/* ═══════════════════════════════════════════════════════════════════
   O LUTADOR

   Leva a ficha de nascença (que não muda) e o que a batalha lhe vai
   fazendo (que muda todo o turno). As duas coisas separadas de
   propósito: a ficha é a mesma que se vende no mercado, e o motor não
   lhe pode tocar.
   ═══════════════════════════════════════════════════════════════════ */
function fuLutador(slot, lado, posto) {
  const f = (typeof fuFicha === 'function') ? fuFicha(slot) : null;
  if (!f) return null;
  return {
    id: slot.id || (lado + posto),
    nome: slot.nome || '',
    lado, posto,
    ficha: f,
    pv: f.pvMax, pm: f.pmMax,
    estados: {},
    /* ── O QUE DURA A CENA ──
       As magias de defesa e de suporte não gastam o turno e vão-se
       embora: põem qualquer coisa de pé que dura até a luta acabar. O
       saco vive aqui, ao lado dos estados, e é lido pelo fuDado, pela
       Defesa e pelo dano.
       Nunca é uma função nem uma referência: só números e verdades,
       para o estado continuar a caber num JSON. */
    efeitos: {},
    guardando: false,
    /* No chão só enquanto durar a ronda; o suspiro dá-se uma vez só. Os
       dois vivem aqui e não num saco à parte porque são estado de
       batalha e não ficha — quem os lê é o motor e mais ninguém. */
    derrubado: false,
    suspirou: false,
    vivo: true,
  };
}

/* ── O DADO DE AGORA ──

   O base vem da ficha; os estados tiram-lhe tamanhos. É esta função e
   mais nenhuma que sabe qual é o dado ACTUAL de um atributo, e é por
   ela que passam a Defesa, a Defesa Mágica e todas as rolagens.

   Foi por causa disto que a ficha chama `defesaBase` ao que devolve: o
   que o manual quer é o dado actual, e o actual só se sabe aqui. */
function fuDado(c, atrib) {
  let d = c.ficha[atrib];
  /* O Despertar sobe um tamanho e dura a cena. Entra ANTES dos estados
     porque o manual conta os dois a partir do dado base — e porque um
     avatar despertado e envenenado deve ficar onde começou, não abaixo. */
  if (c.efeitos && c.efeitos.subirDado === atrib) d = fuSubirDado(d);
  for (const e of FU_ESTADOS_LISTA) {
    if (c.estados[e] && FU_ESTADOS[e].morde.indexOf(atrib) !== -1) d = fuDescerDado(d);
  }
  return d;
}

/* A Barreira e a Aura não dão bónus: põem um PISO. Quem tem d6 de
   Destreza ganha muito, quem já tem d12 não perde nada — o manual
   escreve-as assim de propósito, e é isso que as torna magias de quem
   precisa em vez de magias de quem já está bem. */
/* E a Guarda Cerrada soma-se DEPOIS do piso, porque é um bónus e não um
   piso: o manual diz que os efeitos dela acumulam com tudo o resto.
   Quem tem a Barreira (piso 12) e a Guarda Cerrada (+2) fica em 14. */
function fuDefesa(c) {
  return Math.max(fuDado(c, 'DES'), (c.efeitos && c.efeitos.defesaMinima) | 0)
       + (fuDonsDe(c).defesaMais | 0);
}
function fuDefesaMag(c) {
  return Math.max(fuDado(c, 'PER'), (c.efeitos && c.efeitos.defMagMinima) | 0)
       + (fuDonsDe(c).defMagMais | 0);
}

/* ── OS DONS DE QUEM LUTA ──

   Uma porta só, e nunca `c.ficha.dons` escrito à mão pelo caminho. A
   ficha de um lutador feito à mão numa auditoria pode não os ter, e um
   `undefined.voo` rebenta a meio de uma batalha — que é o pior sítio
   para descobrir uma coisa destas. */
const FU_SEM_DONS = { defesaMais: 0, defMagMais: 0, pvMais: 0, pmMais: 0,
                      precisaoMais: 0, magiaMais: 0, danoMaisGolpe: 0,
                      pmAoSofrer: 0, actoFinal: 0,
                      voo: false, criseIgnoraRS: false, dreno: false,
                      golpeNaDefMag: false, imunes: [] };
function fuDonsDe(c) {
  return (c && c.ficha && c.ficha.dons) || FU_SEM_DONS;
}

/* Em crise quando a vida está em metade ou menos. É o gatilho de meia
   dúzia de efeitos e é o número que a arena pinta de vermelho. */
function fuEmCrise(c) { return c.vivo && c.pv <= c.ficha.crise; }

/* ═══════════════════════════════════════════════════════════════════
   O DANO E AS AFINIDADES

   A conta é curta e a ordem importa: primeiro o dano bruto, depois a
   afinidade, e a afinidade pode inverter o sinal.

     VU  vulnerável  perde o dobro
     RS  resistente  perde metade
     IM  imune       não perde nada
     AB  absorve     RECUPERA o que teria perdido

   A absorção é a única que devolve vida, e é por isso que a arena tem
   de a mostrar de outra cor: um número vermelho a curar o inimigo é a
   pior leitura possível.
   ═══════════════════════════════════════════════════════════════════ */
/* ── A AFINIDADE DE AGORA ──

   A ficha diz a de nascença; a cena pode acrescentar-lhe. A Concha dá
   resistência ao físico, e um dia uma magia dará imunidade a outra
   coisa qualquer.

   Juntam-se pela MESMA regra do manual que a ficha usa, e não por
   sobreposição: a absorção ganha a tudo, a imunidade vem a seguir, e
   resistência com vulnerabilidade anulam-se. Foi por escrever isto como
   última-a-escrever-ganha que a ficha esteve errada em 14% dos Raros —
   o erro não se repete aqui. */
function fuAfinidadeDe(c, tipo) {
  const daFicha = (c.ficha.afinidades && c.ficha.afinidades[tipo]) || null;
  const ef = c.efeitos || {};
  const extraRS = (tipo === 'fisico' && ef.resisteFisico) || (ef.resiste === tipo);

  if (daFicha === 'AB') return 'AB';
  if (daFicha === 'IM') return 'IM';
  if (daFicha === 'VU') return extraRS ? null : 'VU';
  if (daFicha === 'RS' || extraRS) return 'RS';
  return null;
}

function fuAplicarDano(c, bruto, tipo, opcoes) {
  const o = opcoes || {};
  const af = fuAfinidadeDe(c, tipo);
  let perda = Math.max(0, bruto | 0);

  /* "Ignora resistências" e mais nada. O manual (p. 188) diz RESISTÊNCIAS
     — a imunidade e a absorção continuam a valer, e é isso que impede o
     golpe concentrado de ser a resposta a tudo: contra um Lendário do
     seu próprio tipo, continua a curá-lo. */
  if      (af === 'IM') perda = 0;
  else if (af === 'RS') perda = o.ignoraResistencias ? perda : Math.floor(perda / 2);
  else if (af === 'VU') perda = perda * 2;

  if (af === 'AB') {
    const antes = c.pv;
    c.pv = Math.min(c.ficha.pvMax, c.pv + perda);
    return { afinidade: af, perda: 0, curou: c.pv - antes, pv: c.pv, caiu: false };
  }

  const antes = c.pv;
  c.pv = Math.max(0, c.pv - perda);

  /* A Veia Ávida bebe do golpe que apanha. Só de um golpe que DOA — um
     ataque aparado pela imunidade não lhe dá nada, senão a vantagem
     premiava o avatar por ser invulnerável, que é o contrário do que a
     habilidade do manual faz. */
  const ganho = fuDonsDe(c).pmAoSofrer | 0;
  let pmGanho = 0;
  if (ganho && perda > 0) {
    const pmAntes = c.pm;
    c.pm = Math.min(c.ficha.pmMax, c.pm + ganho);
    pmGanho = c.pm - pmAntes;
  }

  /* ── A MISERICÓRDIA ──
     Salva uma vez e desfaz-se. Fica a UM ponto de vida, e não a zero —
     e o efeito acaba aí, portanto o golpe seguinte leva-o na mesma.
     É a única coisa no motor que impede uma queda. */
  let salvou = false;
  if (c.pv === 0 && antes > 0 && c.efeitos && c.efeitos.misericordia) {
    c.pv = 1; salvou = true;
    delete c.efeitos.misericordia;
  }

  const caiu = antes > 0 && c.pv === 0;
  if (caiu) { c.vivo = false; c.guardando = false; }
  return { afinidade: af, perda: antes - c.pv, curou: 0, pv: c.pv, caiu, salvou, pmGanho };
}

/* ── GUARDAR ──
   O manual dá resistência a TUDO até ao turno seguinte. Aqui isso é uma
   linha: quem guarda apanha metade de tudo, mesmo do que absorveria.
   A absorção continua a ganhar, porque o manual diz que ela ganha a
   tudo — guardar não impede um bicho de fogo de se alimentar de fogo. */
function fuDanoComGuarda(c, bruto, tipo, opcoes) {
  const b = c.guardando && (fuAfinidadeDe(c, tipo) !== 'AB')
    ? Math.floor(bruto / 2) : bruto;
  return fuAplicarDano(c, b, tipo, opcoes);
}

/* ── OS ESTADOS ──
   Dar um estado a quem já o tem não faz nada (manual, p. 94). Não é o
   mesmo que não fazer mal nenhum: quem já está lento não fica mais
   lento, e quem contava com isso desperdiçou o turno. */
function fuDarEstado(c, estado) {
  if (!FU_ESTADOS[estado] || !c.vivo || c.estados[estado]) return false;
  // A Pele Calada. Devolve falso como se ele já o tivesse: quem contava
  // com o estado desperdiçou o turno na mesma, e é isso que se quer.
  if (fuDonsDe(c).imunes.indexOf(estado) !== -1) return false;
  c.estados[estado] = true;
  return true;
}
function fuTirarEstado(c, estado) {
  if (!c.estados[estado]) return false;
  delete c.estados[estado];
  return true;
}

/* ═══════════════════════════════════════════════════════════════════
   QUEM SE PODE ATINGIR

   O da frente cobre os outros dois. É a regra do dono do jogo, e é esta
   função que a cumpre.

   ── DE QUÊ É QUE ELE COBRE ──

   De tudo o que aponte a UM alvo. Não do que varre a linha inteira.

   A primeira versão disto dizia outra coisa — cobria do corpo-a-corpo e
   a magia passava por cima — e estava errada por duas razões.

   A primeira é que não era a regra que me deram: "o da frente protege os
   outros", sem qualificativo nenhum. A segunda é que, das cinco acções
   que um avatar tem, só UMA é corpo-a-corpo — o golpe comum. A formação
   decidia um quinto do jogo, e reordenar custava um turno inteiro por
   quase nada.

   Com um alvo só de um lado e a linha toda do outro, a formação passa a
   decidir muito — e decide nos dois sentidos:

     um alvo só   golpe comum, Sopro, Sopro Maldito, Concentrado
                  vão todos ao da frente, sempre

     a linha      Barragem (três alvos), Devastação
                  chegam a qualquer um, e é para isso que existem

   O defensor não fica invencível nem o suporte fica seguro: quem encontra
   uma frente que aguenta abre a Barragem, e quem quer o suporte paga
   trinta PM pela Devastação. A formação deixa de ser um escudo e passa a
   ser uma pergunta com resposta.
   ═══════════════════════════════════════════════════════════════════ */
/* No ar enquanto tiver o Voo Baixo, não estiver em crise e não tiver
   sido derrubado nesta ronda. São as três condições do manual, por esta
   ordem. */
function fuNoAr(c) {
  return !!fuDonsDe(c).voo && c.vivo && !c.derrubado && !fuEmCrise(c);
}

function fuAlvosPossiveis(equipa, mira) {
  const vivos = equipa.filter(c => c.vivo);
  if (!vivos.length) return [];
  if (!mira) return vivos;

  /* Quem voa não se alcança com a mão — mas se for o ÚNICO que resta no
     ar e não houver mais ninguém no chão, alcança-se na mesma.

     Não é uma excepção de conveniência, é a regra a fechar-se: para
     atacar, ele tem de descer. Enquanto houver companheiros no chão
     ninguém o vê descer, porque são eles que estão à frente; quando não
     houver, a única forma de a luta continuar é ele próprio vir ao
     alcance — e aí apanha.

     Sem esta metade, três inimigos a voar e um atacante sem PM davam
     uma batalha que não acabava nunca.

     E vale só para quem ataca com as MÃOS — `mira` vem a 'mao'. Uma magia
     de alvo único alcança quem voa como alcança os outros: a cobertura da
     frente e o voo são duas coisas diferentes, e só a primeira olha ao
     número de alvos. */
  const noChao = (mira === 'mao') ? vivos.filter(c => !fuNoAr(c)) : vivos;
  const podem = noChao.length ? noChao : vivos;
  const frente = podem.reduce((m, c) => (c.posto < m.posto ? c : m), podem[0]);
  return [frente];
}

/* Os três de um lado por ordem de posto — vivos e caídos, porque a arena
   desenha os dois. O motor não guarda a equipa ordenada: guarda-a pela
   ordem em que entrou, e o posto é um campo que se troca. Ordenar aqui,
   uma vez, poupa toda a gente de ordenar por sua conta — e de o fazer de
   seis maneiras ligeiramente diferentes. */
function fuFormacao(estado, lado) {
  return estado[lado].slice().sort((a, b) => a.posto - b.posto);
}

/* Quem está à frente AGORA: o de posto mais baixo que ainda está de pé.
   Quando o defensor cai, o do meio passa a ser a frente sem ninguém ter
   de gastar um turno a mexer-se — e é de propósito, senão perder o
   defensor custava a vida dele E o turno de quem o substituísse. */
function fuFrente(equipa) {
  const vivos = equipa.filter(c => c.vivo);
  if (!vivos.length) return null;
  return vivos.reduce((m, c) => (c.posto < m.posto ? c : m), vivos[0]);
}

/* ── O ÚLTIMO SUSPIRO ──
   Dispara depois de o dono estar no chão, e é a única coisa no motor que
   age com o dono já fora da luta. */
function fuActoFinal(estado, caido, eventos) {
  const quanto = fuDonsDe(caido).actoFinal | 0;
  if (!quanto) return;
  const inimiga = caido.lado === 'A' ? estado.B : estado.A;
  const tipo = caido.ficha.tipo;
  for (const alvo of inimiga.filter(c => c.vivo)) {
    const d = fuAplicarDano(alvo, quanto, tipo);
    eventos.push({ tipo: 'actoFinal', quem: caido.id, alvo: alvo.id,
                   bruto: quanto, tipo_dano: tipo, afinidade: d.afinidade,
                   perda: d.perda, curou: d.curou, pvAlvo: d.pv,
                   caiu: d.caiu, salvou: d.salvou });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   O ATAQUE

   Passo a passo do manual (p. 68): escolhe-se o alvo, rola-se a
   precisão contra a Defesa dele, e a seguir o dano.

     acertou       resultado ≥ Defesa
     crítico       acerta SEMPRE, mesmo contra Defesa maior
     pifão         falha SEMPRE, mesmo contra Defesa menor

   O golpe comum rola DES + VIG, que é a fórmula do soco desarmado do
   manual. As magias rolam PER + VON. Os dois dados são sempre os do
   ATACANTE e a dificuldade é sempre a do alvo — não há rolagem de
   defesa, e é isso que torna um turno uma rolagem só.
   ═══════════════════════════════════════════════════════════════════ */
function fuAtacar(estado, quem, alvo, opcoes) {
  const o = opcoes || {};
  const a1 = o.atrib1 || 'DES', a2 = o.atrib2 || 'VIG';
  const mag = !!o.magico;
  const dq = fuDonsDe(quem);

  /* A Mira Treinada soma-se à precisão, e só do lado em que se treinou:
     +3 a bater OU +3 a lançar, nunca os dois. Quem escolheu qual foi o
     DNA, no js/vantagens-fu.js. */
  const r = fuRolagem(estado.rng, fuDado(quem, a1), fuDado(quem, a2),
                      (quem.ficha.bonusPrecisao | 0) + (o.bonus | 0)
                      + ((mag ? dq.magiaMais : dq.precisaoMais) | 0));
  /* O Golpe Certeiro mira a Defesa Mágica com o murro. Só com o murro —
     uma magia já mira lá, e somar as duas coisas não queria dizer nada. */
  const naMente = mag || !!dq.golpeNaDefMag;
  const dl = naMente ? fuDefesaMag(alvo) : fuDefesa(alvo);
  const acertou = r.critico || (!r.pifao && r.resultado >= dl);

  const ev = {
    tipo: mag ? 'magia' : 'ataque',
    quem: quem.id, alvo: alvo.id,
    nome: o.nome || null,
    dados: r.dados, hr: r.hr, resultado: r.resultado, modificador: r.modificador,
    dl, acertou, critico: r.critico, pifao: r.pifao,
    atribs: [a1, a2], naMente,
  };
  if (!acertou) return ev;

  /* O Golpe Pesado engorda o MURRO e não as magias: o manual manda
     escolher uma fonte de dano, e a escolhida é a que não custa PM. */
  const bruto = r.hr + (o.fixo | 0) + (quem.ficha.danoExtra | 0)
              + (mag ? 0 : (dq.danoMaisGolpe | 0));
  /* A Fúria da Crise: com a vida em metade ou menos, o dano dele passa a
     ignorar resistências — as dele, não as do alvo, e é do ATACANTE que
     a crise se lê. */
  const semRS = !!o.ignoraResistencias || (!!dq.criseIgnoraRS && fuEmCrise(quem));
  const tipoDano = o.tipo || quem.ficha.tipo;
  const dano = fuDanoComGuarda(alvo, bruto, tipoDano,
                               { ignoraResistencias: semRS });
  Object.assign(ev, {
    bruto, tipo_dano: o.tipo || quem.ficha.tipo,
    afinidade: dano.afinidade, perda: dano.perda, curou: dano.curou,
    pvAlvo: dano.pv, caiu: dano.caiu, salvou: dano.salvou,
    pmAlvo: dano.pmGanho || 0,
    ignorouResistencias: semRS,
  });

  /* ── O QUE O GOLPE DEIXA ATRÁS ──

     Por esta ordem, e a ordem importa: primeiro o que o alvo sofre,
     depois o que o atacante ganha, e só no fim quem caiu.

     A Sede Funda bebe METADE do que tirou, e do que tirou MESMO — um
     golpe absorvido pelo inimigo não alimenta ninguém. */
  if (!mag && dq.dreno && dano.perda > 0) {
    const pvAntes = quem.pv;
    quem.pv = Math.min(quem.ficha.pvMax, quem.pv + Math.floor(dano.perda / 2));
    ev.drenou = quem.pv - pvAntes;
    ev.pvQuem = quem.pv;
  }

  /* O Voo Baixo cai quando apanha do tipo a que é vulnerável — que neste
     jogo é a costura dele, e mais nada. Fica no chão até ao fim da
     ronda, que é quando o fuNovaRonda o levanta. */
  if (fuDonsDe(alvo).voo && dano.perda > 0 && tipoDano === alvo.ficha.costura) {
    alvo.derrubado = true;
    ev.derrubou = true;
  }

  /* O estado que a magia impõe. No crítico o manual deixa gastar uma
     OPORTUNIDADE, e a oportunidade destas magias é sempre a mesma: o
     estado acontece. Fora do crítico só acontece se a magia o der de
     origem — é a diferença entre o nível 2 e o nível 3 de um lugar. */
  const est = o.estado && (o.estadoSempre || r.critico) ? o.estado : null;
  if (est && fuDarEstado(alvo, est)) ev.estadoDado = est;

  return ev;
}

/* O acto final de quem caiu, com o evento do golpe já na mão. Vive numa
   função porque há DOIS sítios onde alguém pode cair — o golpe e a
   Devastação — e dois sítios a fazer a mesma coisa à mão acabam por
   fazê-la de duas maneiras.

   ── A CADEIA ──

   Um suspiro pode derrubar quem também o tem, e esse suspira também. O
   manual diz "ao ser reduzido a 0 PV" e não abre excepção para a causa,
   portanto a cadeia é a regra a ser coerente consigo mesma.

   Por VOLTAS e não numa passagem só, e é aí que está o cuidado. Uma
   passagem única sobre uma lista fixa disparava o suspiro de quem viesse
   DEPOIS do morto nessa lista e saltava o de quem viesse antes: a cadeia
   ficava a depender da ordem dos postos, e o mesmo cenário espelhado dava
   contas diferentes conforme o lado. Isso é pior do que não haver cadeia
   nenhuma — uma regra que ninguém consegue prever.

   Acaba sempre: cada um suspira uma vez (`suspirou`), são seis no máximo,
   e uma volta sem quedas novas fecha o ciclo. */
function fuColherQuedas(estado, eventos) {
  for (let volta = 0; volta < 12; volta++) {
    const caidos = estado.A.concat(estado.B).filter(c => !c.vivo && !c.suspirou);
    if (!caidos.length) return;
    for (const c of caidos) { c.suspirou = true; fuActoFinal(estado, c, eventos); }
  }
}

/* ═══════════════════════════════════════════════════════════════════
   O TURNO

   Uma acção por turno. As que existem são as do manual que fazem
   sentido aqui:

     atacar      o golpe comum
     magia       um dos quatro lugares
     guardar     metade do dano até ao turno seguinte
     mover       trocar de posto — E GASTA O TURNO

   O mover gastar o turno é o que faz a formação pesar: tirar o ferido
   da frente custa-lhe a acção. Sem isso, reposicionar era de graça e o
   posicionamento não era uma decisão.
   ═══════════════════════════════════════════════════════════════════ */
function fuAgir(estado, acao) {
  const quem = fuPorId(estado, acao.quem);
  if (!quem || !quem.vivo || estado.acabou) return [];
  if (estado.jaAgiu.indexOf(quem.id) !== -1) return [];

  const eventos = [];
  quem.guardando = false;

  if (acao.tipo === 'guardar') {
    quem.guardando = true;
    eventos.push({ tipo: 'guardar', quem: quem.id });

  } else if (acao.tipo === 'mover') {
    /* ── REORDENAR CUSTA O TURNO ──

       O turno de quem se mexe, e não o dos dois: os postos trocam aos
       pares, mas quem decidiu foi um só, e cobrar dois turnos por uma
       decisão fazia da reordenação uma coisa que ninguém pagaria.

       Uma troca que NÃO acontece não custa nada. É a mesma regra das
       magias que não se podem pagar: recusar e devolver o turno é melhor
       do que cobrar e não fazer nada — o jogador reescolhe em vez de
       descobrir que perdeu a vez.

       Com um companheiro CAÍDO não se troca, e não é mesquinhez: o lugar
       de um caído já não cobre ninguém — a frente é o de posto mais baixo
       que está DE PÉ — portanto a troca não mudava nada e só gastava o
       turno. */
    const outro = fuPorId(estado, acao.com);
    if (!outro || outro === quem || outro.lado !== quem.lado || !outro.vivo)
      return [];
    const p = quem.posto; quem.posto = outro.posto; outro.posto = p;
    const frente = fuFrente(quem.lado === 'A' ? estado.A : estado.B);
    eventos.push({ tipo: 'mover', quem: quem.id, com: outro.id,
                   postos: [quem.posto, outro.posto],
                   frente: frente ? frente.id : null });

  } else {
    /* ── AS CINCO FORMAS DE UMA MAGIA ──

       Sem magia é o golpe comum: corpo-a-corpo, um alvo, e o defensor
       do outro lado cobre os companheiros.

       Com magia há quatro caminhos, e a ordem em que se testam importa
       — o primeiro que couber é o que vale:

         propria    não aponta a ninguém: põe-se de pé em si mesmo
         aliada     aponta para dentro (curar, escudar, despertar)
         todos      não pergunta nem rola: cai em tudo o que está de pé
         inimiga    o caso normal — rola contra a Defesa de quem apanha
    */
    const magia = acao.magia || null;
    const inimiga = quem.lado === 'A' ? estado.B : estado.A;
    const aliada  = quem.lado === 'A' ? estado.A : estado.B;

    /* Quanto custa, antes de mais: uma magia que não se pode pagar não
       gasta o turno. Recusar em silêncio é melhor do que cobrar o turno
       e não fazer nada — o jogador reescolhe. */
    const escolhidos = (acao.alvos || []).map(id => fuPorId(estado, id)).filter(Boolean);
    const nAlvos = magia && magia.porAlvo
      ? Math.max(1, Math.min(magia.alvos || 1, escolhidos.length || 1)) : 1;
    const custo = magia ? (magia.pm | 0) * nAlvos : 0;
    if (custo > quem.pm) return [];

    // ── própria: Concha, Lamber Feridas ──
    if (magia && magia.proprio) {
      quem.pm -= custo;
      if (custo) eventos.push({ tipo: 'gasto', quem: quem.id, pm: custo, pmDepois: quem.pm });
      if (magia.cena) fuPorDePe(quem, magia, eventos);
      if (magia.cura) fuCurar(quem, quem, magia, eventos);

    // ── aliada: Barreira, Misericórdia, Curar, Despertar ──
    } else if (magia && (magia.aliado || magia.cura)) {
      let alvos = escolhidos.filter(c => c.vivo && aliada.indexOf(c) !== -1);
      if (!alvos.length) alvos = [quem];              // sem escolha, é em si
      alvos = alvos.slice(0, magia.alvos || 1);
      quem.pm -= (magia.pm | 0) * (magia.porAlvo ? alvos.length : 1);
      eventos.push({ tipo: 'gasto', quem: quem.id, pm: custo, pmDepois: quem.pm });
      for (const alvo of alvos) {
        if (magia.cena) fuPorDePe(alvo, magia, eventos, quem);
        if (magia.cura) fuCurar(quem, alvo, magia, eventos);
      }

    // ── todos: a Devastação ──
    } else if (magia && magia.todos) {
      /* Sem rolagem e sem Defesa que valha. É a única coisa no motor que
         não pergunta nada a ninguém — e é por isso que custa 30 PM e só
         um Lendário a tem.
         As afinidades CONTINUAM a valer: quem absorve o tipo dela
         cura-se com ela, e isso é uma armadilha a sério para quem a
         lança sem olhar. */
      const alvos = inimiga.filter(c => c.vivo);
      if (!alvos.length) return [];
      quem.pm -= custo;
      eventos.push({ tipo: 'gasto', quem: quem.id, pm: custo, pmDepois: quem.pm });
      for (const alvo of alvos) {
        const d = fuDanoComGuarda(alvo, magia.danoFixo | 0, magia.tipo || quem.ficha.tipo);
        eventos.push({ tipo: 'devastacao', quem: quem.id, alvo: alvo.id,
                       nome: magia.id, bruto: magia.danoFixo | 0,
                       tipo_dano: magia.tipo || quem.ficha.tipo,
                       afinidade: d.afinidade, perda: d.perda, curou: d.curou,
                       pvAlvo: d.pv, caiu: d.caiu, salvou: d.salvou });
      }

    // ── inimiga: o golpe comum e as duas de ataque ──
    } else {
      /* Três casos e não dois: 'mao' para o golpe comum, verdadeiro para
         uma magia de alvo único, falso para a que varre a linha. A frente
         cobre nos dois primeiros; o Voo Baixo só vale contra o primeiro. */
      const mira = (!magia || magia.corpoACorpo) ? 'mao'
                 : ((magia.alvos || 1) === 1);
      const possiveis = fuAlvosPossiveis(inimiga, mira);
      if (!possiveis.length) return [];

      /* O alvo pedido só vale se estiver entre os que se podem atingir.
         Um pedido para bater no de trás com o defensor de pé não é um
         erro do jogador — é o defensor a fazer o seu trabalho — e
         resolve-se batendo em quem está à frente, não recusando. */
      let alvos = escolhidos.filter(c => possiveis.indexOf(c) !== -1);
      if (!alvos.length) alvos = [possiveis[0]];
      alvos = alvos.slice(0, magia ? (magia.alvos || 1) : 1);

      if (magia) {
        const pago = (magia.pm | 0) * (magia.porAlvo ? alvos.length : 1);
        if (pago > quem.pm) return [];
        quem.pm -= pago;
        eventos.push({ tipo: 'gasto', quem: quem.id, pm: pago, pmDepois: quem.pm });
      }

      for (const alvo of alvos) {
        eventos.push(fuAtacar(estado, quem, alvo, magia ? {
          magico: true, nome: magia.id, fixo: magia.fixo,
          tipo: magia.tipo || quem.ficha.tipo,
          estado: magia.estado, estadoSempre: magia.estadoSempre,
          ignoraResistencias: magia.ignoraResistencias,
          atrib1: 'PER', atrib2: 'VON',
        } : { fixo: 5 }));
      }
    }
  }

  estado.jaAgiu.push(quem.id);
  /* Os suspiros ANTES de se ver o fim: quem cai a levar os últimos dois
     inimigos consigo ganha a batalha, e ver o fim primeiro dava-a ao
     outro lado. */
  fuColherQuedas(estado, eventos);
  fuVerFim(estado, eventos);
  return eventos;
}

/* ── PÔR UMA COISA DE PÉ ──

   O manual (p. 115): a mesma magia lançada outra vez no mesmo alvo NÃO
   se soma — a última substitui a anterior. Como cada efeito aqui é uma
   chave própria no saco, escrever por cima é exactamente isso.

   O Despertar é o único que precisa de saber QUAL atributo sobe, e a
   escolha é de quem lança: sobe o mais alto do alvo, que é o que ele
   faz melhor. Subir o mais fraco parece generoso e é desperdício — d6
   para d8 vale menos do que d10 para d12 em tudo o que esse atributo
   toca. */
function fuPorDePe(alvo, magia, eventos, quemLanca) {
  const antes = JSON.stringify(alvo.efeitos);
  for (const k of Object.keys(magia.cena)) {
    if (k === 'subirDado') {
      const melhor = ['DES', 'PER', 'VIG', 'VON']
        .reduce((m, a) => (alvo.ficha[a] > alvo.ficha[m] ? a : m), 'DES');
      alvo.efeitos.subirDado = melhor;
    } else {
      alvo.efeitos[k] = magia.cena[k];
    }
  }
  eventos.push({ tipo: 'cena', quem: (quemLanca || alvo).id, alvo: alvo.id,
                 nome: magia.id, efeitos: Object.assign({}, alvo.efeitos),
                 mudou: antes !== JSON.stringify(alvo.efeitos) });
}

/* Curar não passa do máximo, e diz quanto curou MESMO e não quanto
   prometia — quem está com a vida cheia vê um zero, que é a verdade. */
function fuCurar(quem, alvo, magia, eventos) {
  const antes = alvo.pv;
  alvo.pv = Math.min(alvo.ficha.pvMax, alvo.pv + (magia.cura | 0));
  eventos.push({ tipo: 'cura', quem: quem.id, alvo: alvo.id, nome: magia.id,
                 curou: alvo.pv - antes, pvAlvo: alvo.pv });
}

function fuPorId(estado, id) {
  return estado.A.concat(estado.B).find(c => c.id === id) || null;
}

/* ── QUEM PODE AGIR AGORA ──

   Cada lutador vivo age uma vez por ronda, e os lados alternam. Esta
   função é a que a arena pergunta: "de quem é a vez, e quais dos meus
   ainda não jogaram?"

   Devolve o LADO de quem joga e a lista de quem ainda tem turno. Quem
   escolhe qual deles age é quem controla esse lado — o jogador, do lado
   dele; a política, do outro. O manual chama-lhe ordem de turnos
   dinâmica e diz que é o coração táctico do sistema. */
function fuVez(estado) {
  const porJogar = lado => estado[lado].filter(c => c.vivo && estado.jaAgiu.indexOf(c.id) === -1);
  const a = porJogar('A'), b = porJogar('B');
  if (!a.length && !b.length) return null;

  /* Alternam enquanto der. Quando um lado fica sem gente, o outro joga
     os turnos que lhe sobram — é o que o manual manda quando um lado
     tem mais criaturas do que o outro. */
  const quantosA = estado[estado.comeca === 'A' ? 'A' : 'B'];
  const jogadosA = estado.A.length - a.length, jogadosB = estado.B.length - b.length;
  let lado;
  if (!a.length)      lado = 'B';
  else if (!b.length) lado = 'A';
  else if (estado.comeca === 'A') lado = jogadosA <= jogadosB ? 'A' : 'B';
  else                            lado = jogadosB <= jogadosA ? 'B' : 'A';

  return { lado, podem: (lado === 'A' ? a : b).map(c => c.id) };
}

/* ── O FIM DA RONDA ──
   Limpa quem já jogou e tira a guarda, que dura "até ao início do teu
   próximo turno". */
function fuNovaRonda(estado) {
  estado.jaAgiu = [];
  estado.ronda++;
  /* E levanta quem foi derrubado do ar: o manual diz que ele volta a
     voar automaticamente no fim da ronda. */
  for (const c of estado.A.concat(estado.B)) { c.guardando = false; c.derrubado = false; }
  return { tipo: 'ronda', n: estado.ronda };
}

function fuVerFim(estado, eventos) {
  const vivosA = estado.A.some(c => c.vivo), vivosB = estado.B.some(c => c.vivo);
  if (vivosA && vivosB) return;
  estado.acabou = true;
  estado.vencedor = vivosA ? 'A' : vivosB ? 'B' : null;
  if (eventos) eventos.push({ tipo: 'fim', vencedor: estado.vencedor });
}

/* ═══════════════════════════════════════════════════════════════════
   COMEÇAR

   A iniciativa rola-se UMA VEZ e decide só quem começa — não há fila de
   iniciativa, e é essa a diferença mais visível para o motor antigo.
   O manual: o líder rola DES + PER contra a maior Iniciativa do outro
   lado.
   ═══════════════════════════════════════════════════════════════════ */
function fuIniciar(equipaA, equipaB, semente) {
  const estado = {
    rng: { semente: (semente | 0) || 1, passo: 0 },
    A: equipaA.map((s, i) => fuLutador(s, 'A', i)).filter(Boolean),
    B: equipaB.map((s, i) => fuLutador(s, 'B', i)).filter(Boolean),
    ronda: 1, jaAgiu: [], acabou: false, vencedor: null,
  };

  const lider = estado.A.reduce((m, c) =>
    (fuDado(c, 'DES') + fuDado(c, 'PER') > fuDado(m, 'DES') + fuDado(m, 'PER') ? c : m), estado.A[0]);
  const dl = Math.max.apply(null, estado.B.map(c => c.ficha.iniciativa));
  const r = fuRolagem(estado.rng, fuDado(lider, 'DES'), fuDado(lider, 'PER'), 0);

  estado.comeca = (r.critico || (!r.pifao && r.resultado >= dl)) ? 'A' : 'B';
  estado.iniciativa = { quem: lider.id, dados: r.dados, resultado: r.resultado, dl,
                        ganhou: estado.comeca === 'A' };
  return estado;
}

/* ── PARA O SERVIDOR TAMBÉM ──
   Pela mesma razão da ficha: no dia do PvP é aqui que o servidor
   confere uma luta que o cliente diz ter ganho, e duas cópias do motor
   acabariam por discordar. */
/* O js/vantagens-fu.js tem de escrever os seis estados outra vez, porque
   carrega antes deste arquivo e a Pele Calada precisa deles. Escrever
   uma lista duas vezes é o começo de as duas divergirem — a não ser que
   alguém confira. Confere-se aqui, ao carregar. */
if (typeof FU_ESTADOS_QUE_PEGAM !== 'undefined') {
  const meus = FU_ESTADOS_LISTA.slice().sort().join(',');
  const deles = FU_ESTADOS_QUE_PEGAM.slice().sort().join(',');
  if (meus !== deles)
    throw new Error('combate-fu.js: os estados não batem certo com o '
                  + 'js/vantagens-fu.js.\n  motor: ' + meus + '\n  vantagens: ' + deles);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FU_ESTADOS, FU_ESTADOS_LISTA,
    fuRolar, fuRolagem, fuLutador, fuDado, fuDefesa, fuDefesaMag, fuEmCrise,
    fuAplicarDano, fuDanoComGuarda, fuDarEstado, fuTirarEstado,
    fuAlvosPossiveis, fuAtacar, fuAgir, fuPorId, fuVez, fuNovaRonda, fuIniciar,
    fuAfinidadeDe, fuPorDePe, fuCurar,
    fuDonsDe, fuNoAr, fuActoFinal, fuColherQuedas, fuFormacao, fuFrente,
  };
}
