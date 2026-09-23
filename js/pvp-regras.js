// ═══════════════════════════════════════════════════════════════════
// AS REGRAS DO PVP — o que o navegador e o servidor contam igual
//
// Este arquivo não toca na tela nem no banco. Diz só três coisas:
//
//   · quem pode entrar em campo (o mesmo que o PvE pede, conferido de
//     novo no servidor, com a certidão dele e não com o slot do cliente)
//   · quanto a fila aceita de diferença de poder, conforme a espera
//   · quem forma par com quem
//
// O api/pvp.js carrega-o pelo require, o navegador pelo <script>. Duas
// cópias destas contas acabariam por discordar, e a primeira pessoa a
// dar por isso seria alguém que via "76–92" na tela e era pareado com
// um 110.
// ═══════════════════════════════════════════════════════════════════

const PVP_EQUIPA = 3;

/* ── A JANELA DA FILA ──
   Começa em ±10% do poder da equipe (o número do desenho do combate) e
   abre 5 pontos a cada 15 s de espera, até ±40%. Uma fila vazia de
   madrugada não pode deixar ninguém esperando para sempre, e uma cheia
   não precisa abrir nada: o par justo aparece logo. */
const PVP_JANELA_INICIAL = 0.10;
const PVP_JANELA_PASSO   = 0.05;
const PVP_JANELA_CADA_MS = 15000;
const PVP_JANELA_MAX     = 0.40;

// O convite de um amigo vale 30 s.
const PVP_CONVITE_MS = 30000;

/* ── ESTAR ONLINE ──
   A presença (pvp/online) renova-se a cada 30 s, e some sozinha quando a
   conexão cai (onDisconnect). Quem ficou 90 s sem sinal — um navegador
   que travou sem desconectar direito — conta como fora do ar. */
const PVP_SINAL_MS  = 30000;
const PVP_ONLINE_MS = 90000;

// A tela do versus, entre o par formado e a luta.
const PVP_VERSUS_MS = 7000;

// Quem esperou na fila sem dar sinal ao servidor por 20 s saiu dela.
const PVP_FILA_SINAL_MS = 20000;

/* ── A RESERVA ──
   Formar par é travar duas entradas da fila (api/pvp.js). Uma trava
   largada por um servidor que caiu no meio vence sozinha em 10 s, e a
   entrada volta a estar livre. */
const PVP_RESERVA_MS = 10000;

function pvpReservada(entrada, agora, por) {
  const r = entrada && entrada.res;
  return !!(r && r.por !== por && agora - (r.em || 0) < PVP_RESERVA_MS);
}

function pvpJanela(esperaMs) {
  const passos = Math.floor(Math.max(0, esperaMs | 0) / PVP_JANELA_CADA_MS);
  return Math.min(PVP_JANELA_MAX, PVP_JANELA_INICIAL + passos * PVP_JANELA_PASSO);
}

/* A faixa que a tela mostra: "aceitando 76–92". É a MESMA conta do par,
   vista de um lado só — o outro também abre a janela dele, e o par vale
   com a maior das duas (pvpCompativeis). */
function pvpFaixa(poder, esperaMs) {
  /* |p − q| ≤ j·max(p, q): abaixo, q ≥ p·(1 − j); acima, q ≤ p ÷ (1 − j).
     Uma pitada de folga no arredondamento, para a tela nunca prometer
     um número que o par recusaria por um centésimo. */
  const j = pvpJanela(esperaMs);
  return [Math.max(1, Math.ceil(poder * (1 - j) - 1e-9)), Math.floor(poder / (1 - j) + 1e-9)];
}

/* Dois da fila formam par? A diferença de poder cabe na maior das duas
   janelas, medida sobre o maior dos dois. Sobre o maior e não sobre a
   média: assim a faixa da tela (pvpFaixa) diz exatamente a verdade. */
function pvpCompativeis(a, b, agora) {
  if (!a || !b) return false;
  const pa = a.poder | 0, pb = b.poder | 0;
  if (pa <= 0 || pb <= 0) return false;
  const j = Math.max(pvpJanela(agora - (a.desde || agora)), pvpJanela(agora - (b.desde || agora)));
  return Math.abs(pa - pb) <= j * Math.max(pa, pb) + 1e-9;
}

/* O melhor par para `uid` na fila: o de poder mais próximo e, empatado,
   o que espera há mais tempo. `fila` é { uid: { poder, desde, sinal } }.
   Quem está sem sinal há mais de PVP_FILA_SINAL_MS não conta — fechou a
   aba sem sair da fila. */
function pvpEscolherPar(uid, fila, agora) {
  const eu = fila && fila[uid];
  if (!eu) return null;
  let melhor = null, melhorDif = Infinity, melhorDesde = Infinity;
  for (const outro of Object.keys(fila)) {
    if (outro === uid) continue;
    const o = fila[outro];
    if (!o || !(o.poder > 0) || agora - (o.sinal || o.desde || 0) > PVP_FILA_SINAL_MS) continue;
    if (pvpReservada(o, agora, uid)) continue;
    if (!pvpCompativeis(eu, o, agora)) continue;
    const dif = Math.abs((eu.poder | 0) - (o.poder | 0));
    const desde = o.desde || agora;
    if (dif < melhorDif || (dif === melhorDif && desde < melhorDesde)) {
      melhor = outro; melhorDif = dif; melhorDesde = desde;
    }
  }
  return melhor;
}

/* ── QUEM PODE ENTRAR EM CAMPO ──
   As mesmas perguntas do PvE (_pveImpedimentoDe), menos a doença e a
   energia, que vivem no save do cliente e o servidor não tem como
   conferir de verdade — essas o navegador pergunta antes de chamar.
   Aqui o que se confere é o que o servidor SABE: a certidão (que só ele
   grava), os mortos, e o slot como está no banco.

   Devolve o motivo, ou null se pode. */
function pvpMotivoMembro(slot, certidao, morto) {
  if (!slot || !slot.id) return 'vazio';
  if (!slot.hatched || slot.pendingEgg) return 'ovo';
  if (slot.dead || morto) return 'morto';
  if (slot.listed) return 'a_venda';
  if (!certidao) return 'sem_certidao';
  if (!(typeof slot.nome === 'string' && slot.nome.split(',')[0].trim())) return 'sem_nome';
  if (typeof ehBebe === 'function' && ehBebe(slot)) return 'bebe';
  /* ── DOENTE E CANSADO TAMBÉM NÃO ENTRAM ──

     As mesmas duas perguntas do PvE (_pveImpedimentoDe, em js/pve-fu.js)
     e com os mesmos números: qualquer doença impede, e a energia tem de
     estar em PVP_ENERGIA_MINIMA ou acima — 20, que é onde a exaustão
     começa a acumular.

     Estavam só no navegador, e o servidor deixava passar o que o botão
     escondia. Aqui elas valem para os dois lados: o jogo pergunta antes
     de mostrar a fila, e o servidor pergunta de novo antes de montar a
     sala. O que isto NÃO fecha é o save editado — os medidores vivem no
     `avatarSlots`, que o cliente grava; o nível, que é o que decide a
     luta, já não (js/niveis.js). */
  if (Array.isArray(slot.activeDiseases) && slot.activeDiseases.length) return 'doenca';
  const energia = Math.floor(Number((slot.vitals || {}).energia ?? 100));
  if (energia < PVP_ENERGIA_MINIMA) return 'energia';
  return null;
}

/* ── O QUE A LUTA CUSTA ──
   Os mesmos números do PvE (js/pve-fu.js): não entra quem tem menos de
   20 de energia, cada avatar gasta 10 na luta e 4 se o dono desistir. A
   diferença é quem cobra — aqui é o servidor, no fim (api/pvp.js). */
const PVP_ENERGIA_MINIMA   = 20;
const PVP_ENERGIA_CUSTO    = 10;
const PVP_ENERGIA_DESISTIR = 4;

/* ═══════════════════════════════════════════════════════════════════
   O QUE A LUTA DEIXA — decidido pelo dono do jogo em 22/09/2026

   "cobra 10 de energia, paga +humor se ganhar, se perder menos, paga
   moedas, pode dar doença de fratura, dá pontos de laço e o mais
   importante pontos em rank."

   ── AS CONTAS ──

   ENERGIA: 10 a cada um dos três, como no PvE, porque lutaram o mesmo.
   Quem desiste paga 4 — também como no PvE.

   MOEDAS: a vitória paga 180. A conta vem do PvE: uma vitória no Médio
   dá 144 (24 moedas do DIFF_TIERS × 6), e isto é um quarto acima,
   porque do outro lado está gente e não a máquina. A derrota paga 45,
   um quarto da vitória: a energia gastou-se igual, e sair de mãos
   vazias de uma luta difícil empurra toda a gente de volta para o PvE.

   E NÃO PAGA NO DESAFIO DE AMIGO. Dois amigos a perder de propósito um
   para o outro fariam 360 moedas por par de lutas, sem adversário
   nenhum para os travar. Pelo mesmo motivo por que o desafio de amigo
   não conta rank (decidido em 22/09), também não paga moedas — o que
   se leva de lá é o humor, o laço e o treino.

   HUMOR: lutar faz bem ao bicho, e ganhar faz mais: +15 na vitória, +8
   no empate, +5 na derrota, a cada um dos três.

   FRATURA: quem CAIU em campo, uma vez em cada dez — o mesmo risco do
   PvE fora do Fácil. Sorteada com o gerador da própria luta (a semente
   da sala), e não com o Math.random do servidor: assim o resultado é
   refazível por quem auditar a partida.

   XP NÃO. Não estava no pedido, e é de propósito: o nível é o que
   decide a luta e o que o servidor mal consegue conferir (js/niveis.js).
   Pôr a progressão a correr dentro do PvP era fazer do PvP o caminho
   mais barato para subir.
   ═══════════════════════════════════════════════════════════════════ */
const PVP_PREMIO = {
  vitoria: { moedas: 180, humor: 15 },
  empate:  { moedas:  90, humor:  8 },
  derrota: { moedas:  45, humor:  5 },
};
const PVP_FRATURA_CHANCE = 0.10;

/* O resultado de um lado, em palavra: é isto que escolhe o prémio.
   `motivo` é o que o servidor gravou ('luta', 'limite', 'desistiu',
   'desconectou'), e `saiu` é quem desistiu, quando foi isso. */
function pvpResultadoDe(uid, fim) {
  if (!fim) return null;
  if (fim.motivo === 'desistiu' && fim.saiu === uid) return 'desistiu';
  if (!fim.vencedor) return 'empate';
  return fim.vencedor === uid ? 'vitoria' : 'derrota';
}

/* O prémio de um lado. `tipo` é o da sala ('fila' ou 'convite') — o
   desafio de amigo não paga moedas. */
function pvpPremioDe(resultado, tipo) {
  if (!resultado) return null;
  if (resultado === 'desistiu') {
    return { resultado, energia: PVP_ENERGIA_DESISTIR, humor: 0, moedas: 0 };
  }
  const p = PVP_PREMIO[resultado] || PVP_PREMIO.derrota;
  return {
    resultado,
    energia: PVP_ENERGIA_CUSTO,
    humor:   p.humor,
    moedas:  tipo === 'amistosa' ? 0 : p.moedas,
  };
}

/* Quem caiu, de um lado, no estado final: devolve os LUGARES (0,1,2),
   que é como a equipa da sala está guardada. */
function pvpCaidos(estado, lado) {
  const out = [];
  for (let i = 0; i < PVP_EQUIPA; i++) {
    const c = (typeof fuPorId === 'function') ? fuPorId(estado, lado + i) : null;
    if (c && !c.vivo) out.push(i);
  }
  return out;
}

/* O retrato de um avatar como ele entra na sala: o que a ficha lê
   (js/ficha-fu.js) e o que o desenho lê (gerarSVG). O DNA vem da
   CERTIDÃO e o NÍVEL vem do registo do servidor (js/niveis.js) — os
   dois números que decidem a luta, e nenhum deles sai do slot, que o
   cliente grava por inteiro. O `nivel` chega aqui já decidido pelo
   api/pvp.js; sem ele, vale o do slot (é o caso do desenho local, que
   não decide nada). */
function pvpRetrato(slot, certidao, nivel) {
  const r = {
    id: slot.id,
    // O nome, sem a alcunha ("Brasa,Leo" → "Brasa"), como o nomeCurto.
    nome: String(slot.nome || '').split(',')[0].trim().slice(0, 40),
    nivel: Math.max(1, (nivel != null ? nivel : slot.nivel) | 0 || 1),
    seed: slot.seed | 0,
    raridade: slot.raridade || null,
    nascimento: certidao,
  };
  if (slot.escolhaAnciao) r.escolhaAnciao = slot.escolhaAnciao;
  return r;
}

function pvpPoder(retratos) {
  return (retratos || []).reduce((t, r) => t + Math.max(1, r.nivel | 0), 0);
}

/* ═══════════════════════════════════════════════════════════════════
   A LUTA (etapa 2) — as jogadas pela rede

   A sala guarda a semente, as duas equipes e a lista das jogadas
   (`acoes/0000`, `0001`… — com quatro dígitos para a ordem das chaves
   ser a ordem das jogadas). Os dois navegadores aplicam a lista na mesma
   ordem, no mesmo motor, e chegam à mesma luta; o servidor refaz a lista
   inteira para gravar o vencedor (api/pvp.js, acao 'encerrar').

   PELA REDE VAI A ESCOLHA, NUNCA A MAGIA. A arena do PvE entrega ao
   motor o objeto da magia — custo, dano, alvos —, e o motor confia nele.
   Pela rede isso seria dar a um trapaceiro uma Barragem de dano 999; vai
   só o LUGAR da magia no repertório, e cada lado busca a magia verdadeira
   na ficha de quem age (pvpParaMotor).

   Uma jogada que não vale — fora da vez, de quem não pode agir, que o
   motor recusa, um "tempo" pedido antes do prazo — é IGNORADA pelos três
   (os dois navegadores e o servidor), do mesmo jeito: não muda a luta e
   não conta como jogada. O relógio continua correndo para quem devia.
   ═══════════════════════════════════════════════════════════════════ */
const PVP_JOGADA_MS = 60000;     // o tempo de cada jogada
const PVP_FOLGA_MS  = 25000;     // a animação da jogada anterior (a mais longa passa de 14 s), antes de o relógio contar
const PVP_ESTOUROS_MAX = 3;      // estouros seguidos do mesmo lado: abandono
const PVP_FORA_MS   = 120000;    // desconectado há mais que isto: abandono
const PVP_TIPOS = ['atacar', 'magia', 'guardar', 'mover', 'examinar', 'tempo', 'desistir'];

function pvpChave(n) { return String(n).padStart(4, '0'); }

// A lista em ordem, até o primeiro buraco (um buraco é jogada que não houve).
function pvpListaAcoes(obj) {
  const out = [];
  if (!obj) return out;
  for (let n = 0; n < 10000; n++) {
    const a = obj[pvpChave(n)];
    if (!a) break;
    out.push(a);
  }
  return out;
}

/* As equipes como o motor as recebe: os retratos da sala, com ids de
   batalha curtos e iguais nos dois navegadores (A0…B2). */
function pvpEquipesDaSala(sala) {
  const eq = lado => (((sala.jogadores || {})[(sala.lados || {})[lado]] || {}).equipe || [])
    .map((r, i) => Object.assign({}, r, { id: lado + i }));
  return { A: eq('A'), B: eq('B') };
}

function pvpLadoDe(sala, uid) {
  const l = sala && sala.lados;
  return !l ? null : l.A === uid ? 'A' : l.B === uid ? 'B' : null;
}
function pvpOutroLado(lado) { return lado === 'A' ? 'B' : lado === 'B' ? 'A' : null; }

// O lugar de uma magia no repertório de quem a lança (para ir pela rede).
function pvpLugarDaMagia(ficha, magia) {
  if (!magia || typeof fuMagiasDe !== 'function') return null;
  const mg = fuMagiasDe(ficha) || {};
  for (const k of Object.keys(mg)) if (mg[k] && mg[k].id === magia.id) return k;
  return null;
}

// A jogada da arena, como vai pela rede.
function pvpParaRede(estado, acao) {
  const quem = fuPorId(estado, acao.quem);
  const a = { tipo: acao.tipo, quem: acao.quem };
  if (acao.tipo === 'magia') a.lugar = pvpLugarDaMagia(quem && quem.ficha, acao.magia);
  if (Array.isArray(acao.alvos)) a.alvos = acao.alvos.slice(0, 3);
  if (acao.com) a.com = acao.com;
  if (acao.alvo) a.alvo = acao.alvo;
  return a;
}

// A jogada da rede, como o motor a recebe — a magia vem da FICHA.
function pvpParaMotor(estado, a) {
  const quem = fuPorId(estado, String(a.quem || ''));
  if (!quem) return null;
  const m = { tipo: a.tipo, quem: quem.id };
  const alvos = Array.isArray(a.alvos) ? a.alvos.slice(0, 3).map(String) : null;
  if (a.tipo === 'guardar') return m;
  if (a.tipo === 'mover') { m.com = String(a.com || ''); return m; }
  if (a.tipo === 'examinar') { m.alvo = String(a.alvo || ''); return m; }
  if (a.tipo === 'atacar') { if (alvos) m.alvos = alvos; return m; }
  if (a.tipo === 'magia') {
    const mg = (typeof fuMagiaDe === 'function') ? fuMagiaDe(quem.ficha, String(a.lugar || '')) : null;
    if (!mg) return null;
    m.magia = mg;
    if (alvos) m.alvos = alvos;
    return m;
  }
  return null;
}

/* O contexto que corre ao lado do estado: quando foi a última jogada que
   valeu (o relógio conta dela) e quantos estouros seguidos cada lado tem. */
function pvpContexto(sala) {
  return { lados: sala.lados, ultimoTs: sala.inicio || 0, estouros: { A: 0, B: 0 } };
}
function pvpPrazo(ctx) { return (ctx.ultimoTs || 0) + PVP_JOGADA_MS + PVP_FOLGA_MS; }

/* Antes de uma jogada: a ronda nova, se a anterior acabou. É o que a
   arena faz entre uma jogada e outra (o _afAndar), e o servidor tem de
   fazer igual. */
function pvpAvancar(estado) {
  while (!estado.acabou && !fuVez(estado)) fuNovaRonda(estado);
}

/* Uma jogada da lista, lida contra o estado de AGORA. Devolve o que fazer:
     { tipo: 'jogada', eng, lado }   aplicar eng (fuAgir)
     { tipo: 'tempo',  eng, lado }   o tempo estourou: quem devia jogar guarda
     { tipo: 'desistir', lado }      quem escreveu desistiu
     { tipo: 'ignorar' }             não vale: não muda nada */
function pvpPreparar(estado, a, ctx) {
  if (!a || estado.acabou) return { tipo: 'ignorar' };
  const ladoPor = pvpLadoDe({ lados: ctx.lados }, a.por);
  if (!ladoPor) return { tipo: 'ignorar' };
  if (a.tipo === 'desistir') return { tipo: 'desistir', lado: ladoPor };
  const vez = fuVez(estado);
  if (!vez) return { tipo: 'ignorar' };
  if (a.tipo === 'tempo') {
    if ((+a.ts || 0) < pvpPrazo(ctx)) return { tipo: 'ignorar' };
    /* Guarda quem ainda não está guardando (guardar em cima de guarda é a
       guarda repetida, mais fraca); se todos estão, o primeiro. */
    const livre = vez.podem.find(id => { const c = fuPorId(estado, id); return c && !c.guardando; });
    return { tipo: 'tempo', lado: vez.lado, eng: { tipo: 'guardar', quem: livre || vez.podem[0] } };
  }
  if (ladoPor !== vez.lado || vez.podem.indexOf(String(a.quem || '')) === -1) return { tipo: 'ignorar' };
  const eng = pvpParaMotor(estado, a);
  return eng ? { tipo: 'jogada', lado: vez.lado, eng } : { tipo: 'ignorar' };
}

/* Depois de aplicar (ou não): o relógio e os estouros. Devolve o fim, se
   a jogada acabou com a luta por desistência ou por ausência. */
function pvpRegistrar(ctx, prep, aplicada, a) {
  if (prep.tipo === 'desistir') return { vencedor: pvpOutroLado(prep.lado), motivo: 'desistiu' };
  if (!aplicada || (prep.tipo !== 'jogada' && prep.tipo !== 'tempo')) return null;
  ctx.ultimoTs = +a.ts || ctx.ultimoTs;
  if (prep.tipo === 'jogada') { ctx.estouros[prep.lado] = 0; return null; }
  ctx.estouros[prep.lado] = (ctx.estouros[prep.lado] || 0) + 1;
  if (ctx.estouros[prep.lado] >= PVP_ESTOUROS_MAX)
    return { vencedor: pvpOutroLado(prep.lado), motivo: 'ausente' };
  return null;
}

/* A luta inteira, refeita da sala. É o que o servidor confere, e o que
   o navegador usa para voltar ao ponto certo depois de um F5. `ate`
   limita quantas jogadas se aplicam. */
function pvpRepetir(sala, ate) {
  const eq = pvpEquipesDaSala(sala);
  const estado = fuIniciar(eq.A, eq.B, sala.seed);
  const ctx = pvpContexto(sala);
  const acoes = pvpListaAcoes(sala.acoes);
  const n = (ate == null) ? acoes.length : Math.min(ate, acoes.length);
  let fim = null, lidas = 0;
  for (; lidas < n; lidas++) {
    pvpAvancar(estado);
    if (estado.acabou) break;
    const a = acoes[lidas];
    const prep = pvpPreparar(estado, a, ctx);
    const ok = prep.eng ? fuAgir(estado, prep.eng).length > 0 : false;
    fim = pvpRegistrar(ctx, prep, prep.tipo === 'desistir' || ok, a);
    if (fim) { lidas++; break; }
  }
  if (!fim) {
    pvpAvancar(estado);
    if (estado.acabou) fim = { vencedor: estado.vencedor, motivo: estado.porLimite ? 'limite' : 'luta' };
  }
  return { estado, ctx, fim, lidas, total: acoes.length };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PVP_JOGADA_MS, PVP_FOLGA_MS, PVP_ESTOUROS_MAX, PVP_FORA_MS, PVP_TIPOS,
    pvpChave, pvpListaAcoes, pvpEquipesDaSala, pvpLadoDe, pvpOutroLado, pvpLugarDaMagia,
    pvpParaRede, pvpParaMotor, pvpContexto, pvpPrazo, pvpAvancar, pvpPreparar, pvpRegistrar, pvpRepetir,
    PVP_EQUIPA, PVP_JANELA_INICIAL, PVP_JANELA_PASSO, PVP_JANELA_CADA_MS, PVP_JANELA_MAX,
    PVP_CONVITE_MS, PVP_SINAL_MS, PVP_ONLINE_MS, PVP_VERSUS_MS, PVP_FILA_SINAL_MS, PVP_RESERVA_MS,
    pvpReservada, pvpJanela, pvpFaixa, pvpCompativeis, pvpEscolherPar, pvpMotivoMembro, pvpRetrato, pvpPoder,
    PVP_ENERGIA_MINIMA, PVP_ENERGIA_CUSTO, PVP_ENERGIA_DESISTIR,
    PVP_PREMIO, PVP_FRATURA_CHANCE, pvpResultadoDe, pvpPremioDe, pvpCaidos,
  };
}
