/* ═══════════════════════════════════════════════════════════════════
   O SELO E O PRÉMIO DA TEMPORADA

   Decidido com o dono do jogo em 23/09/2026, depois de medir cada peça
   (tools/simular-rank.js e a conversa dessa data).

   ── O SELO ──

   Custa 100 💎, é opcional, vale uma temporada e NÃO DÁ NADA DENTRO DA
   LUTA. Nem um dado, nem um ponto de vida. Ele compra duas coisas: o
   direito de receber prémio no fim do mês e uma marca ao lado do nome
   na tabela. Quem não o compra joga, pontua e aparece na tabela do
   mesmo jeito.

   Isto não é escrúpulo: o rank inteiro foi construído para medir
   habilidade em vez de carteira (js/pvp-rank.js). Vender vantagem aqui
   desfaria esse trabalho numa linha.

   ── O BOLO ──

   Todos os selos, num bolo só. SEM taxa da casa: o dono recebe 1% no
   saque (api/resgatar.js) e mais nada — cobrar rake de um prémio que a
   própria pool ajuda a encher seria dinheiro a andar em círculo.

   ── COMO SE REPARTE ──

   Duas regras, nesta ordem, e a ordem é o que faz isto funcionar:

   1. PISO. Todo o premiado recebe o selo de volta. É o que responde à
      pergunta que decide se alguém compra o selo: "e se eu não ficar
      nos primeiros?". Fica na metade de cima, recebe de volta.

   2. PESO. O que sobra do piso reparte-se entre as divisões por
      `selos × peso` — Jovens 1, Adultos 1,5, Anciãos 2. Assim um
      ancião ganha mais do que um jovem mesmo quando os anciãos são
      menos, que é o que o dono pediu.

      Medido antes de escolher: com peso e SEM piso, o último premiado
      dos Jovens levava 0,86 do que pagou — os novatos a subsidiarem os
      veteranos, e o argumento do selo por terra.

   Dentro de cada divisão, a curva é 1/√posição: o campeão leva cerca
   de cinco vezes o selo, o último premiado quase três.

   ── QUEM ENTRA NA CONTA ──

   Ter selo, ter jogado 10 partidas ranqueadas na divisão, e a divisão
   ter pelo menos 4 desses. Divisão com menos gente não paga: a parte
   dela acumula para a temporada seguinte — prémio ridículo é pior do
   que prémio nenhum, e um bolo acumulado é um motivo para voltar.

   Este arquivo só tem as regras, sem Firestore e sem DOM: é o mesmo no
   navegador e no servidor, para as duas contas nunca discordarem.
   ═══════════════════════════════════════════════════════════════════ */

const SELO_CUSTO      = 100;   // 💎
const SELO_PREMIADOS  = 0.35;  // a fração da lista que recebe
const SELO_MIN_LUTAS  = 10;    // partidas ranqueadas para entrar na conta
const SELO_MIN_GENTE  = 4;     // menos do que isto numa divisão, não paga
const SELO_PESOS      = { jovem: 1, adulto: 1.5, anciao: 2 };

/* ══ O QUE A POOL PÕE NO BOLO ══

   A Pool P2E recebe as taxas do mercado — a listagem e os 10% da venda
   — e devolve isso aos jogadores por dois caminhos: os eventos e este,
   a premiação da temporada. Regra do dono do jogo, 27/09/2026.

   São duas travas, e a segunda importa mais do que a primeira:

     1. UMA FRAÇÃO DO SALDO, e não um valor fixo. Uma fração nunca esvazia
        a pool: dez por cento de cada vez deixa sempre noventa, e o que
        entra pelas taxas repõe. Um valor fixo secaria a pool no mês em
        que o mercado estivesse parado.

     2. NUNCA MAIS DO QUE OS SELOS JUNTOS. É isto que torna o aporte
        justo em vez de generoso: a pool no máximo DOBRA o que os
        jogadores puseram. Uma temporada com quatro participantes não
        leva uma fatia grande de uma pool cheia, e quanto mais gente
        disputa, mais a pool acrescenta. Sem esta trava, a pool pagaria
        quase tudo e o selo deixaria de ser a aposta de quem joga.

   Dez por cento é um número conservador de propósito — é para subir
   com o jogo cheio, não para começar alto. Mudar é esta linha. */
const SELO_POOL_FRACAO = 0.10;

/* Quanto a pool entrega a esta temporada. `saldoPool` é o que há hoje e
   `boloDosSelos` é o que os jogadores já puseram (selos mais o
   acumulado). Devolve cristais inteiros — a pool nunca paga frações. */
function temporadaAporteDaPool(saldoPool, boloDosSelos) {
  const saldo = Math.max(0, Math.floor(Number(saldoPool) || 0));
  const bolo  = Math.max(0, Math.floor(Number(boloDosSelos) || 0));
  if (saldo <= 0 || bolo <= 0) return 0;
  return Math.floor(Math.min(saldo * SELO_POOL_FRACAO, bolo));
}

/* A ORDEM DA TABELA, que aqui decide dinheiro e por isso não pode
   depender de sorte nem da ordem em que o banco devolveu as linhas:
   pontos, depois vitórias, depois menos derrotas, e por fim quem
   chegou primeiro à sua pontuação. */
function temporadaOrdenar(lista) {
  return (lista || []).slice().sort((a, b) =>
    (b.p | 0) - (a.p | 0)
    || (b.v | 0) - (a.v | 0)
    || (a.d | 0) - (b.d | 0)
    || (a.em | 0) - (b.em | 0)
    || String(a.uid).localeCompare(String(b.uid)));
}

// Quantos recebem numa divisão de `n` gente.
function temporadaQuantosPremiados(n) {
  return Math.max(1, Math.round(n * SELO_PREMIADOS));
}

/* O prémio da temporada inteira.

   `bolo` são os cristais juntos (os selos mais o que ficou acumulado de
   antes). `porDivisao` é { jovem: [linha…], adulto: […], anciao: […] },
   onde cada linha tem { uid, p, v, d, em, lutas } e JÁ SÓ TEM quem
   comprou selo — quem não comprou nem chega aqui.

   Devolve { pagamentos: [{ uid, divisao, pos, valor }], pago, acumula }.
   O `acumula` é o que fica para a temporada seguinte: a parte das
   divisões que não pagaram, mais as sobras de arredondamento. */
function temporadaPremiar(bolo, porDivisao) {
  const divs = Object.keys(SELO_PESOS);
  const elegiveis = {};
  let genteTotal = 0, pesoTotal = 0;

  for (const d of divs) {
    const lista = temporadaOrdenar((porDivisao && porDivisao[d]) || [])
      .filter(x => (x.lutas | 0) >= SELO_MIN_LUTAS);
    genteTotal += lista.length;
    if (lista.length >= SELO_MIN_GENTE) {
      elegiveis[d] = lista;
      pesoTotal += lista.length * SELO_PESOS[d];
    }
  }
  const pagantes = Object.keys(elegiveis);
  if (!pagantes.length || bolo <= 0) return { pagamentos: [], pago: 0, acumula: Math.max(0, bolo | 0) };

  /* O bolo que sai HOJE é a parte de quem paga. A das divisões que não
     juntaram gente suficiente fica para a próxima temporada — e não vai
     para as outras: quem comprou selo nos Jovens não financia os
     Anciãos. */
  const genteQuePaga = pagantes.reduce((s, d) => s + elegiveis[d].length, 0);
  const disponivel = genteTotal ? Math.floor(bolo * genteQuePaga / genteTotal) : 0;

  // 1. o piso: o selo de volta a cada premiado
  const premiados = {};
  let piso = 0;
  for (const d of pagantes) {
    premiados[d] = temporadaQuantosPremiados(elegiveis[d].length);
    piso += premiados[d] * SELO_CUSTO;
  }
  /* Se o bolo não chega para o piso — só acontece se muita gente
     comprou selo e não jogou as dez partidas —, paga-se o que há,
     proporcionalmente, e não se promete o que não existe. */
  const fator = piso > disponivel ? disponivel / piso : 1;
  const sobra = Math.max(0, disponivel - piso);

  const pagamentos = [];
  let pago = 0;
  for (const d of pagantes) {
    const lista = elegiveis[d];
    const quantos = premiados[d];
    const parte = pesoTotal ? sobra * (lista.length * SELO_PESOS[d]) / pesoTotal : 0;
    let H = 0;
    for (let i = 1; i <= quantos; i++) H += 1 / Math.sqrt(i);
    for (let i = 1; i <= quantos; i++) {
      const merito = H ? parte * (1 / Math.sqrt(i)) / H : 0;
      // Para baixo: o que a divisão inteira deixa de centavos acumula.
      const valor = Math.floor(SELO_CUSTO * fator + merito);
      if (valor <= 0) continue;
      pagamentos.push({ uid: lista[i - 1].uid, divisao: d, pos: i, valor });
      pago += valor;
    }
  }
  return { pagamentos, pago, acumula: Math.max(0, (bolo | 0) - pago) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SELO_CUSTO, SELO_PREMIADOS, SELO_MIN_LUTAS, SELO_MIN_GENTE, SELO_PESOS,
    temporadaOrdenar, temporadaQuantosPremiados, temporadaPremiar,
    SELO_POOL_FRACAO, temporadaAporteDaPool,
  };
}
