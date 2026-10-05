/* ═══════════════════════════════════════════════════════════════════
   OS FEITOS — a memória do que o avatar fez, e o servidor viu

   A raridade vai deixar de ser dada e passar a ser conquistada (etapa
   3H). Para haver conquista é preciso haver memória, e a auditoria da
   etapa 3I encontrou o jogo sem ela: não existia, em lugar nenhum, uma
   contagem de batalhas por avatar. O que havia eram XP e vínculo dentro
   do `avatarSlots`, que o cliente grava por inteiro.

   Este arquivo é a memória. Não é o exame, não dá pontos, não promove
   ninguém e não tem critério nenhum: registra FATOS.

   ── A REGRA QUE DECIDE O QUE ENTRA ──

   Um feito só se registra se o servidor puder dizer:

     "eu vi isto acontecer, e sei que este avatar estava lá."

   Por isso só o PvP entra, por agora. Quando uma partida de PvP acaba,
   o servidor REFAZ a luta inteira a partir da semente e da lista de
   jogadas (pvpRepetir, em js/pvp-regras.js) e é a refeita que decide o
   vencedor — o navegador não é acreditado. E sabe quais três avatares
   de cada lado estavam em campo, porque foi ele que montou as equipes.

   O PvE fica de fora, e fica escrito porquê: o resultado dele chega num
   POST do cliente (`{acao:'laco', resultado:'vitoria'}`, em
   js/pve-fu.js), sem nenhuma reconstrução do lado do servidor. Registrar
   isso seria transformar um campo falsificável num feito — exatamente o
   que esta etapa existe para não fazer.

   ── A FILA E A AMISTOSA CONTAM-SE À PARTE ──

   As duas são verificadas pelo servidor, mas não valem o mesmo e a
   diferença não é de opinião: a FILA tem teto contra combinação (o
   saldo de 40 pontos por dia contra a mesma pessoa, em js/pvp-rank.js)
   e a AMISTOSA não tem nenhum — dois amigos podem jogar um contra o
   outro mil vezes, e todas as mil são partidas de verdade.

   Guardam-se separadas para que quem escrever o exame possa escolher. A
   escolha não é feita aqui: registrar dados não é definir critério.

   ── O FORMATO ──

     feitos[idDoAvatar] = {
       criadoEm,                      quando o primeiro feito entrou
       em,                            a última atualização
       pvp: {
         fila:    { n, v, d, e, x },  partidas, vitórias, derrotas,
         amistosa:{ n, v, d, e, x },  empates, desistências
       },
       ciclos: { 'AAAA-MM': { n, v } },   só a fila, mês a mês
       marcos: [ { tipo, em, pvp } ]      o retrato num instante
     }

   ── PORQUE NÃO É UMA LISTA DE PARTIDAS ──

   Era o desenho óbvio, e não cabe: um documento do Firestore tem 1 MiB,
   e dez avatares com milhares de partidas cada um estouram-no. O que o
   exame vai precisar de perguntar são contagens e ciclos, e esses cabem
   num punhado de números.

   Os MARCOS são a exceção, e existem para uma pergunta que a contagem
   sozinha não responde: "o que é que este avatar já tinha feito quando
   mudou de dono?". Um marco é o retrato das contagens num instante, e
   escreve-se uma vez por venda — não cresce com o jogo.

   ── O HISTÓRICO É DO AVATAR ──

   Acompanha a venda, como a certidão, o laço, o nível e a raridade. O
   comprador não começa do zero e não refaz nada; o que o avatar fez,
   fez. E o dono muda sem que a trajetória mude.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem. Quem
   ESCREVE é só o servidor (api/pvp.js); daqui não sai nenhuma função
   que deixe o cliente declarar um feito.
   ═══════════════════════════════════════════════════════════════════ */

/* Os quatro fins possíveis de uma partida, como o `pvpResultadoDe` os
   devolve (js/pvp-regras.js). A desistência conta à parte de propósito:
   é uma participação e não é uma derrota jogada, e quem escrever o
   exame decide o que fazer com ela. */
const FEITO_RESULTADOS = ['vitoria', 'derrota', 'empate', 'desistiu'];

/* A letra de cada um dentro do registro. `x` é a desistência — não `d`,
   que já é a derrota. */
const FEITO_LETRA = { vitoria: 'v', derrota: 'd', empate: 'e', desistiu: 'x' };

/* Os dois tipos de sala, com os nomes que o `sala.tipo` usa de verdade
   (criarSala, em api/pvp.js): a FILA e a AMISTOSA.

   A primeira versão chamou a segunda de `convite` — o nome da ação que
   cria (`acao='convidar'`) e não o da sala. O `sala.tipo === 'convite'`
   nunca era verdade, e por isso TODA a amistosa era gravada como fila:
   a separação que este arquivo existe para fazer não estava
   acontecendo. Apanhado na auditoria da etapa 3I.2, ao conferir os
   valores que o campo toma. */
const FEITO_TIPOS = ['fila', 'amistosa'];

/* Quantos marcos se guardam. Um por venda, e um avatar muito negociado
   não pode encher o documento: fica com os mais recentes, e o primeiro
   (o nascimento do registro) está sempre no `criadoEm`. */
const FEITO_MARCOS_MAX = 20;

/* As cinco contagens. Só números, e só isto — o `melhorAdversario` mora
   ao lado delas e não aqui, porque somar contagens faz sentido e somar
   recordes não faz nenhum. */
function _contaVazia() { return { n: 0, v: 0, d: 0, e: 0, x: 0 }; }

/* ── O MELHOR ADVERSÁRIO DERROTADO ──

   Um número e o seu contexto, e não uma lista: guardar os mil
   adversários de mil partidas estoura o documento, e a pergunta que
   interessa é uma só — "contra quem de melhor este avatar conseguiu
   ganhar?".

     { pontos, divisao, em, ciclo }

   A DIVISÃO vai junto de propósito. O rank é por divisão (jovem,
   adulto, ancião — js/pvp-rank.js), e 1200 pontos no jovem não querem
   dizer o mesmo que 1200 no ancião. Comparar as duas coisas é uma
   decisão de critério, e critério é a etapa seguinte; aqui guarda-se o
   que é preciso para essa decisão poder ser tomada depois. */
function _advVazio() { return null; }

/* Um ramo (a fila ou a amistosa): as contagens e o recorde, lado a
   lado. Separados porque se tratam de maneiras diferentes — as
   contagens somam-se, o recorde compara-se. */
/* ── O SUPORTE: O QUE O AVATAR FEZ PELOS OUTROS ──

   Sete números, e todos saem de eventos que o motor emitiu e que o
   SERVIDOR viu, ao refazer a partida (pvpSuporteSomar, em
   js/pvp-regras.js). Nenhum é declarado pelo cliente.

     cura           curas em aliado que entraram mesmo (curou > 0)
     curaPv         e quantos pontos de vida foram
     limpeza        estados tirados de aliado
     beneficio      efeitos de cena postos num aliado, que mudaram algo
     guardaAliado   vezes que pôs OUTRO avatar em guarda
     protegerTentou vezes que declarou proteger um aliado
     protegeuFez    vezes que o golpe foi mesmo desviado para si

   As duas últimas são a mesma ação vista de dois lados, e é de
   propósito: medido em 1440 lutas, a declaração aconteceu 298 vezes e o
   desvio 6. Guardar só uma delas seria perder a diferença entre tentar
   e conseguir. */
const FEITO_SUPORTE_CAMPOS = ['cura', 'curaPv', 'limpeza', 'beneficio',
                              'guardaAliado', 'protegerTentou', 'protegeuFez'];

function _suporteVazio() {
  const o = {};
  for (const k of FEITO_SUPORTE_CAMPOS) o[k] = 0;
  return o;
}

/* Os sete, saneados, de UM evento de suporte — uma partida.

   Existe para que a sanitização aconteça UMA VEZ e o resultado vá para
   os dois destinos: o total do ramo e o ciclo. Se cada destino saneasse
   por sua conta, os dois poderiam discordar, e o ciclo deixaria de ser
   uma fatia do total para passar a ser uma segunda contagem. */
function _suporteDoEvento(o) {
  const out = _suporteVazio();
  if (!o || typeof o !== 'object') return out;
  for (const k of FEITO_SUPORTE_CAMPOS) {
    /* PRÓPRIA, e não herdada. Um `{ __proto__: { cura: 9 } }` parece
       vazio ao JSON.stringify e devolve 9 em `o.cura`. */
    if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
    const n = +o[k];
    if (Number.isFinite(n) && n > 0) out[k] = Math.floor(n);
  }
  return out;
}

function _suporteTemAlgo(o) {
  for (const k of FEITO_SUPORTE_CAMPOS) if ((o[k] | 0) > 0) return true;
  return false;
}

/* ── A CHAVE DO CICLO ──

   O mês, como o `pvpTemporada` o escreve (js/pvp-rank.js): quatro
   dígitos, hífen, mês de 01 a 12. É o MESMO ciclo da temporada do rank,
   e de propósito — a mesma função nomeia os dois.

   O mês é validado de verdade, e não por `\d{2}`: o primeiro padrão
   aceitava '2026-99' e '2026-00', que o `pvpTemporada` nunca produz mas
   um documento corrompido pode conter. E recusar o que não casa fecha
   de graça a chave '__proto__' — num objeto literal, atribuir a essa
   chave troca o protótipo em vez de guardar o valor. */
const FEITO_CICLO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function feitoCicloValido(c) {
  return typeof c === 'string' && FEITO_CICLO_RE.test(c);
}

/* ── QUANTOS CICLOS GUARDAM O DETALHE DO SUPORTE ──

   Medido nesta etapa: o suporte de um ciclo custa 118 bytes em JSON.
   Dez avatares com dois anos de detalhe são 28 KB; com dez anos seriam
   140 KB, e o documento do jogador tem 1 MiB para TUDO. Logo o detalhe
   precisa de teto, e as contagens não.

   O teto é SÓ do detalhe. O `ciclos[c] = { n, v }` nunca é cortado,
   porque é dele que sai "em quantos ciclos este avatar venceu" — e
   cortar isso seria transformar um limite de armazenamento num
   critério de mérito, que é exatamente o que a etapa proíbe.

   Guardam-se os ciclos COM suporte mais recentes. As chaves 'AAAA-MM'
   ordenam-se como texto na mesma ordem em que o tempo passa, logo
   "mais recentes" é o fim da lista ordenada.

   O que isto custa, dito com todas as letras: acima de 24 ciclos com
   suporte, o detalhe deixa de ser completo — fica o dos 24 últimos. O
   TOTAL do ramo nunca se perde, e nenhum critério plausível de
   "suporte em K ciclos" chega perto de 24. Exato na faixa que
   interessa, conservador fora dela — como a lista dos vencidos. */
const FEITO_SUPORTE_CICLOS_MAX = 24;

/* ── OS ADVERSÁRIOS DISTINTOS DERROTADOS ──

   O `melhorAdversario` guarda um só, e sozinho não distingue um avatar
   que venceu UM forte de um que venceu CINCO. A etapa 3I.6 mediu que
   essa é a brecha do cenário "muitas vitórias contra o mesmo parceiro":
   com um cúmplice e dez dias, fabrica-se um pico de rank.

   Esta lista guarda QUEM foi vencido, para a certificação poder
   perguntar quantos distintos estavam acima de um patamar — e o
   patamar não se escolhe aqui.

   ── O ADVERSÁRIO É O JOGADOR, E NÃO O AVATAR ──

   É um desvio da letra do pedido da 3I.7, e o número manda:

     um cúmplice rodando os 10 slots dele produz
       por avatarId   até 10 "adversários distintos"
       por uid                             1

   A rotação de avatares derrotaria a defesa 10 para 1. E o uid é a
   unidade CERTA pelas outras duas razões: o rank pertence ao jogador
   (rank.<divisao> no documento dele), e o teto anti-conluio que já
   existe também é por jogador (rankPares.<uid>, 40 pontos por dia).

   Guardar o uid do adversário não é novidade neste documento: o
   `rankPares` já o faz, e o `donos` guarda a cadeia de donos.

   ── PORQUE É UMA LISTA LIMITADA ──

   Guardar todos é uma coleção sem fim dentro de um documento de 1 MiB.
   Guardam-se os 24 MAIS FORTES, distintos: 100 bytes cada, 23 KB com
   dez avatares, 2% do limite.

   O que isto custa, dito com todas as letras: acima de 24 adversários
   distintos a contagem deixa de ser exata — fica a dos 24 melhores.
   Qualquer critério plausível pede 3 a 5, logo a resposta é exata na
   faixa que interessa, e conservadora fora dela.

   Outras formas consideradas e recusadas:
     · uma lista completa      — sem limite, estoura o documento
     · contagens por faixa     — compacta, mas sem identidade não há
                                 como saber se o adversário é distinto
     · só um contador          — não dá para deduplicar sem o conjunto */
const FEITO_VENCIDOS_MAX = 24;

function _vencidosLimpos(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = {};
  const out = [];
  for (const v of lista) {
    if (!v || typeof v !== 'object') continue;
    const uid = typeof v.uid === 'string' ? v.uid.slice(0, 64) : '';
    const pontos = +v.pontos;
    if (!uid || !Number.isFinite(pontos) || pontos <= 0) continue;
    if (Object.prototype.hasOwnProperty.call(vistos, uid)) continue;
    vistos[uid] = true;
    out.push({
      uid,
      pontos: Math.round(pontos),
      divisao: typeof v.divisao === 'string' ? v.divisao.slice(0, 16) : null,
      ciclo: (typeof v.ciclo === 'string' && /^\d{4}-\d{2}$/.test(v.ciclo)) ? v.ciclo : null,
      em: +v.em || 0,
    });
  }
  // os mais fortes primeiro, e nunca mais do que o teto
  out.sort((a, b) => b.pontos - a.pontos);
  return out.slice(0, FEITO_VENCIDOS_MAX);
}

function _ramoVazio() {
  return Object.assign(_contaVazia(), {
    melhorAdversario: _advVazio(),
    vencidos: [],
    suporte: _suporteVazio(),
  });
}

/* Um adversário válido: pontos finitos e acima do piso do rank. O piso
   é 800 (PVP_RANK_PISO) e o começo é 1000 — um valor negativo, zero ou
   absurdo não é um adversário, é lixo, e não entra. */
function feitoAdvValido(adv) {
  return !!(adv && typeof adv === 'object'
            && Number.isFinite(+adv.pontos) && +adv.pontos > 0);
}

function _advLimpo(adv) {
  if (!feitoAdvValido(adv)) return null;
  return {
    pontos: Math.round(+adv.pontos),
    divisao: typeof adv.divisao === 'string' ? adv.divisao.slice(0, 16) : null,
    em: +adv.em || 0,
    ciclo: (typeof adv.ciclo === 'string' && /^\d{4}-\d{2}$/.test(adv.ciclo)) ? adv.ciclo : null,
  };
}

/* Um registro novo, do avatar que ainda não fez nada.

   Não depende de nível, de fase, de raridade, de feitio nem de escola —
   e não pode depender: o histórico é o que ele fez, e essas cinco
   coisas são o que ele é. */
function feitoVazio(agora) {
  const ts = agora || Date.now();
  return {
    criadoEm: ts,
    em: ts,
    pvp: { fila: _ramoVazio(), amistosa: _ramoVazio() },
    ciclos: {},
    marcos: [],
  };
}

function feitoValido(resultado) {
  return typeof resultado === 'string' && FEITO_RESULTADOS.indexOf(resultado) !== -1;
}

function feitoTipoValido(tipo) {
  return typeof tipo === 'string' && FEITO_TIPOS.indexOf(tipo) !== -1;
}

/* ── A LEITURA ──

   `mapa` é o `feitos` do documento; `id` o avatar. Devolvem o que está
   GRAVADO, e nunca olham para o slot — que é o ponto de tudo isto.
   Um registro estragado, ou que não existe, lê-se como vazio: quem
   pergunta recebe sempre a mesma forma. */
function feitoDe(mapa, id) {
  const r = mapa && id && mapa[id];
  if (!r || typeof r !== 'object') return feitoVazio(0);
  const pvp = (r.pvp && typeof r.pvp === 'object') ? r.pvp : {};
  // Só as contagens: serve os ramos e tambem os marcos.
  const conta = (c) => {
    const o = (c && typeof c === 'object') ? c : {};
    return { n: o.n | 0, v: o.v | 0, d: o.d | 0, e: o.e | 0, x: o.x | 0 };
  };
  // Um ramo: as contagens mais o recorde, saneado.
  // O suporte: sete inteiros, e nada mais passa.
  const sup = (c) => {
    const o = (c && typeof c === 'object') ? c : {};
    const out = {};
    for (const k of FEITO_SUPORTE_CAMPOS)
      out[k] = Object.prototype.hasOwnProperty.call(o, k) ? Math.max(0, o[k] | 0) : 0;
    return out;
  };
  const ramo = (c) => {
    const o = (c && typeof c === 'object') ? c : {};
    return Object.assign(conta(o), {
      melhorAdversario: _advLimpo(o.melhorAdversario),
      vencidos: _vencidosLimpos(o.vencidos),
      suporte: sup(o.suporte),
    });
  };
  /* ── A CÓPIA É FUNDA, E NÃO É ZELO: É CORREÇÃO ──

     A primeira versão devolvia `r.ciclos` e `r.marcos` tal e qual — as
     mesmas referências do registro recebido. O `feitoPvp` escreve em
     `base.ciclos[ciclo]`, e com a referência partilhada escrevia no
     ORIGINAL: a função dizia-se pura e mutava quem a chamava.

     Isso é um defeito de dados e não de estilo. Estas funções correm
     dentro de transações do Firestore, que o SDK repete quando há
     conflito — e uma transação repetida somava o ciclo duas vezes,
     porque a primeira volta já tinha mexido no objeto que a segunda
     volta ia ler. Apanhado pelo próprio tools/testar-feitos.js. */
  /* ── OS CICLOS, E O SUPORTE DENTRO DELES ──

     A CHAVE É CONFERIDA AQUI, e não era: a primeira versão copiava
     toda chave que o documento trouxesse. A escrita validava o mês, a
     leitura não — e um registro corrompido com 'abc' ou '2026-99'
     atravessava. Pior com '__proto__': `ciclos['__proto__'] = {...}`
     num objeto literal troca o PROTÓTIPO em vez de guardar a chave.
     A conferição fecha os dois de uma vez.

     E o `suporte` do ciclo passa por aqui, o que não é detalhe: este
     saneador é também o caminho da ESCRITA (o `feitoPvp` começa por
     ele) e o da VENDA (o `feitoMarco` também). O que esta função não
     copiar deixa de existir na partida seguinte e na venda. */
  const ciclos = {};
  const comSuporte = [];
  if (r.ciclos && typeof r.ciclos === 'object') {
    for (const k of Object.keys(r.ciclos)) {
      if (!feitoCicloValido(k)) continue;
      const c = r.ciclos[k];
      if (!c || typeof c !== 'object') continue;
      ciclos[k] = { n: c.n | 0, v: c.v | 0 };
      const sp = sup(c.suporte);
      /* Vazio não se guarda: um ciclo sem suporte nenhum não precisa de
         sete zeros, e são 118 bytes por ciclo por avatar. */
      if (_suporteTemAlgo(sp)) comSuporte.push([k, sp]);
    }
  }
  /* O teto é só do DETALHE, e guarda os mais recentes. As contagens
     ficam todas — ver a nota do FEITO_SUPORTE_CICLOS_MAX. */
  comSuporte.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [k, sp] of comSuporte.slice(-FEITO_SUPORTE_CICLOS_MAX)) ciclos[k].suporte = sp;
  const marcos = Array.isArray(r.marcos)
    ? r.marcos.filter(m => m && typeof m === 'object').map(m => ({
        tipo: String(m.tipo || ''), em: +m.em || 0, pvp: conta(m.pvp),
      }))
    : [];
  return {
    criadoEm: +r.criadoEm || 0,
    em: +r.em || 0,
    pvp: { fila: ramo(pvp.fila), amistosa: ramo(pvp.amistosa) },
    ciclos: ciclos,
    marcos: marcos,
  };
}

/* As partidas de fila e de amistosa somadas. É a resposta à pergunta
   "quantas partidas de PvP verificadas este avatar disputou?" — e quem
   quiser só as da fila lê o ramo. */
function feitoPvpTotal(mapa, id) {
  const f = feitoDe(mapa, id).pvp;
  const out = _contaVazia();
  for (const t of FEITO_TIPOS)
    for (const k of Object.keys(out)) out[k] += f[t][k] | 0;
  return out;
}

/* Em que ciclos (meses) este avatar entrou na fila, do mais antigo ao
   mais recente. */
function feitoCiclos(mapa, id) {
  return Object.keys(feitoDe(mapa, id).ciclos).sort();
}

/* ── O SUPORTE POR CICLO, NA FORMA QUE A CERTIFICAÇÃO VAI PEDIR ──

   `{ 'AAAA-MM': { os sete campos } }`, só dos ciclos que têm suporte, em
   ordem de tempo. Os ciclos sem suporte nenhum não aparecem — não é
   ausência de informação, é um mês em que não houve suporte.

   Mora DENTRO do `ciclos` e não num mapa ao lado, e a razão é a de
   sempre nesta base: dois mapas com a mesma chave podem discordar. Com
   um só, um ciclo tem as suas partidas, as suas vitórias e o seu
   suporte juntos, há um teto a vigiar em vez de dois, e é impossível
   existir suporte num ciclo que não existe.

   O que esta função responde é "em quantos ciclos diferentes houve
   suporte, e quanto em cada um". QUANTOS são necessários é número de
   exame, e não se escolhe aqui nem nesta etapa. */
function feitoSuportePorCiclo(mapa, id) {
  const ciclos = feitoDe(mapa, id).ciclos;
  const out = {};
  for (const k of Object.keys(ciclos).sort()) {
    if (ciclos[k].suporte) out[k] = ciclos[k].suporte;
  }
  return out;
}

/* Em quantos ciclos distintos houve suporte efetivo. O "efetivo" é a
   lista que a etapa 3I.8 fechou lendo o motor evento por evento: a
   cura que curou, a limpeza que tirou um estado, a proteção que
   desviou mesmo o golpe. Ficam de fora o `guardaAliado` (ação sem
   resultado), o `protegerTentou` (declaração) e o `beneficio` (o mapa
   de efeitos mudou, o que não prova que ajudou).

   Conta ciclos, e não eventos: é a pergunta temporal, e a de volume
   responde-se no total do ramo. */
const FEITO_SUPORTE_EFETIVO = ['cura', 'curaPv', 'limpeza', 'protegeuFez'];

function feitoCiclosComSuporte(mapa, id) {
  const porCiclo = feitoSuportePorCiclo(mapa, id);
  return Object.keys(porCiclo)
    .filter(k => FEITO_SUPORTE_EFETIVO.some(c => (porCiclo[k][c] | 0) > 0))
    .sort();
}

/* ── A ESCRITA ──

   PURA: devolve um registro NOVO e nunca mexe no que recebeu. Um
   registro mutado aqui dentro faria uma transação recusada deixar
   rasto — e estas correm dentro de transações do Firestore, que podem
   ser repetidas.

   `tipo` é o da sala e `ciclo` é o mês (a temporada do PvP). Um
   resultado ou um tipo que não existam não escrevem nada: devolvem o
   registro como estava, e o chamador não precisa de o saber.

   NÃO EXISTE AQUI NENHUMA FORMA DE O CLIENTE CHEGAR. Esta função é
   chamada de um lugar só — o aplicarNoJogador, em api/pvp.js, dentro do
   fecho da sala, depois de a luta ter sido refeita pelo servidor. */
function feitoPvp(reg, resultado, tipo, ciclo, agora, adversario, suporte) {
  if (!feitoValido(resultado) || !feitoTipoValido(tipo)) {
    return (reg && typeof reg === 'object') ? reg : feitoVazio(agora);
  }
  const base = feitoDe({ x: reg }, 'x');
  if (!base.criadoEm) base.criadoEm = agora || Date.now();
  base.em = agora || Date.now();

  /* O ramo e a letra conferem-se OUTRA VEZ, e não é desconfiança do
     guarda acima: é que estas funções correm dentro de transações do
     Firestore, e ali uma exceção é pior do que um nada. Sem isto, um
     `tipo` que escapasse ao guarda rebentava num `undefined.n` e
     derrubava o fecho da sala inteiro — o laço, o rank e os prêmios
     com ele. Apanhado a mutar o guarda, no scratchpad da 3I.1. */
  const letra = FEITO_LETRA[resultado];
  if (!base.pvp[tipo] || !letra) return base;
  base.pvp[tipo].n += 1;
  base.pvp[tipo][letra] += 1;

  /* ── O SUPORTE DESTA PARTIDA, SANEADO UMA VEZ SÓ ──

     Daqui sai para DOIS destinos: o total do ramo e o ciclo. Uma
     sanitização, duas aplicações — é o que garante que o ciclo seja uma
     FATIA do total e não uma segunda contagem do mesmo fato.

     Os valores vêm do `pvpSuporteSomar` (js/pvp-regras.js), que os leu
     dos eventos da partida REFEITA pelo servidor. Nada do cliente
     chega aqui: o `feitos` é campo de topo que ele não grava, e o
     endpoint do PvP não aceita suporte nenhum no corpo do pedido. */
  const supDaPartida = _suporteDoEvento(suporte);

  /* O CICLO É SÓ DA FILA. A amistosa não tem teto contra combinação
     (ver a nota do cabeçalho), e um mês cheio de amistosas não é um mês
     de participação. Guarda-se a partida e não o ciclo.

     O ciclo vem de FORA, e quem o calcula é o servidor com o mesmo
     `pvpTemporada` da temporada do rank. Esta função não sabe que dia é
     hoje, de propósito: um `new Date()` aqui dentro seria o relógio de
     quem chamou, e no cliente seria o relógio do navegador. */
  if (tipo === 'fila' && feitoCicloValido(ciclo)) {
    const c = base.ciclos[ciclo];
    /* O `suporte` que já estava NÃO SE PERDE. A primeira versão
       reconstruía `{ n, v }` e, com o detalhe do suporte dentro do
       ciclo, isso passaria a apagá-lo a cada partida. */
    const novo = { n: ((c && c.n) | 0) + 1,
                   v: ((c && c.v) | 0) + (resultado === 'vitoria' ? 1 : 0) };
    const sp = (c && c.suporte) ? c.suporte : _suporteVazio();
    for (const k of FEITO_SUPORTE_CAMPOS) sp[k] = (sp[k] | 0) + supDaPartida[k];
    if (_suporteTemAlgo(sp)) novo.suporte = sp;
    base.ciclos[ciclo] = novo;
  }

  /* ── O MELHOR ADVERSÁRIO DERROTADO ──

     SÓ NA VITÓRIA. A derrota, o empate e a desistência não mexem no
     recorde — perder para alguém forte não é um feito, e empatar
     também não. E a desistência não se reinterpreta aqui: se o
     resultado verificado deste avatar foi 'vitoria', conta; se foi
     'desistiu', não conta, aconteça o que acontecer do outro lado.

     E NUNCA DESCE. Um adversário mais fraco não substitui um mais
     forte, e um valor inválido não substitui nada — o recorde é o
     maior de todos, e um recorde que diminui não é um recorde.

     O VALOR VEM DE FORA, e de propósito: este arquivo não sabe o que é
     um rank. Quem o calcula é o api/pvp.js, com o que o próprio
     servidor leu do documento do adversário ANTES da partida. */
  /* ── O SUPORTE SOMA-SE SEMPRE ──

     Ganhe, perca, empate ou desista: o que foi feito pelos aliados
     ACONTECEU, e apagá-lo porque a partida acabou mal seria perder um
     fato por causa de um resultado. Curar um companheiro numa derrota
     continua a ser curar um companheiro.

     O negativo, o fracionado, o não-número e a propriedade herdada
     ficam de fora no `_suporteDoEvento`, acima — e ficam de fora uma
     vez só, para os dois destinos. */
  for (const k of FEITO_SUPORTE_CAMPOS)
    base.pvp[tipo].suporte[k] += supDaPartida[k];

  if (resultado === 'vitoria') {
    const novo = _advLimpo(adversario);
    if (novo) {
      const atual = base.pvp[tipo].melhorAdversario;
      if (!atual || novo.pontos > atual.pontos) base.pvp[tipo].melhorAdversario = novo;

      /* ── E ENTRA NA LISTA DOS DISTINTOS ──

         Pelo UID, que é a unidade do rank e a do teto anti-conluio.
         Um adversário sem uid não entra: é o que acontece numa
         amistosa, onde o bloco do rank nem roda.

         Três casos, e só três:

           já está na lista   atualiza SE o rank dele for maior agora.
                              O que interessa à certificação é o maior
                              patamar em que este avatar o venceu.
           não está, há vaga  entra.
           não está, cheia    entra SE for mais forte que o mais fraco,
                              e o mais fraco sai.

         A lista fica sempre com os `FEITO_VENCIDOS_MAX` mais fortes, em
         ordem. Nenhuma evidência qualificada se perde enquanto houver
         menos de 24 acima do patamar que a certificação pedir. */
      const uid = typeof adversario.uid === 'string' ? adversario.uid.slice(0, 64) : '';
      if (uid) {
        const lista = base.pvp[tipo].vencidos;
        const entrada = Object.assign({ uid }, novo);
        const i = lista.findIndex(x => x.uid === uid);
        if (i !== -1) {
          if (entrada.pontos > lista[i].pontos) lista[i] = entrada;
        } else if (lista.length < FEITO_VENCIDOS_MAX) {
          lista.push(entrada);
        } else if (entrada.pontos > lista[lista.length - 1].pontos) {
          lista[lista.length - 1] = entrada;
        }
        lista.sort((x, y) => y.pontos - x.pontos);
      }
    }
  }
  return base;
}

/* Um MARCO: o retrato das contagens num instante, com o motivo.

   Serve a uma pergunta só, e a contagem sozinha não a responde: "o que
   é que este avatar já tinha feito quando mudou de dono?". Escreve-se
   uma vez por venda (api/comprar-avatar.js).

   Não apaga nada e não muda contagem nenhuma — só acrescenta a linha. */
function feitoMarco(reg, tipo, agora) {
  const base = feitoDe({ x: reg }, 'x');
  if (!base.criadoEm) base.criadoEm = agora || Date.now();
  base.em = agora || Date.now();
  base.marcos = base.marcos.concat([{
    tipo: String(tipo || 'marco').slice(0, 24),
    em: agora || Date.now(),
    pvp: feitoPvpTotal({ x: reg }, 'x'),
  }]).slice(-FEITO_MARCOS_MAX);
  return base;
}

/* ═══════════════════════════════════════════════════════════════════
   O LADO DO NAVEGADOR

   O mapa que o servidor mandou, guardado no carregamento e lido por
   quem quiser mostrar a trajetória. Mesmo desenho do js/raridades.js e
   do js/escolhas.js.

   SÓ LEITURA. Não há aqui nenhuma função que escreva um feito, e é
   deliberado: quem escreve é o servidor, e uma porta no navegador seria
   a porta que esta etapa existe para não abrir.
   ═══════════════════════════════════════════════════════════════════ */
let _feitosMapa = {};

function feitosCarregar(mapa) {
  _feitosMapa = (mapa && typeof mapa === 'object') ? mapa : {};
}

function feitosMapa() { return _feitosMapa; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEITO_RESULTADOS, FEITO_LETRA, FEITO_TIPOS, FEITO_MARCOS_MAX,
    FEITO_SUPORTE_CAMPOS, FEITO_VENCIDOS_MAX,
    FEITO_SUPORTE_CICLOS_MAX, FEITO_SUPORTE_EFETIVO, FEITO_CICLO_RE,
    feitoCicloValido, feitoSuportePorCiclo, feitoCiclosComSuporte,
    feitoAdvValido,
    feitoVazio, feitoValido, feitoTipoValido,
    feitoDe, feitoPvpTotal, feitoCiclos,
    feitoPvp, feitoMarco,
    feitosCarregar, feitosMapa,
  };
}
