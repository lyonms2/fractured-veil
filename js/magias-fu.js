// ═══════════════════════════════════════════════════════════════════
//  AS MAGIAS — Fabula Ultima
//
//  Cinco lugares por avatar, três degraus de raridade. O primeiro lugar
//  — o golpe comum — não tem magia nenhuma: sobe por número, porque não
//  há magia para trocar. Os outros quatro trocam de magia ao subir.
//
//  ── DE ONDE VEM CADA UMA ──
//
//  Doze das dezoito casas vêm do manual sem um número mexido. As que
//  levam `nosso: true` são as seis que tivemos de escrever, e todas
//  seguem o molde de uma que já lá estava — não há mecânica inventada,
//  há um tipo de dano trocado.
//
//  ── O QUE ABRE QUANDO ──
//
//  Os cinco lugares abrem TODOS ao nível 5, quando o avatar fica JOVEM
//  e pode lutar. Nunca se ganha um lugar novo: melhora-se o que já se
//  tem, e quem decide o degrau é a raridade, que sai do nível.
//
//    Comum      5–10    nv 1
//    Raro      11–26    nv 2
//    Lendário  27 +     nv 3
// ═══════════════════════════════════════════════════════════════════

const FU_LUGARES = ['comum', 'forte', 'muito_forte', 'defesa', 'suporte'];

/* ── O NOME E O ESTADO DE CADA TIPO ──

   A linha das barragens é latina e é a do manual — Ignis, Fulgur,
   Glacies, Terra, Ventus, Umbra, Lux. Serve as duas línguas sem
   tradução, que é meio caminho andado num jogo bilingue.

   Falta a do veneno, que o manual não tem: fica VENENUM, no mesmo
   registo e pela mesma regra de formação.

   O ESTADO de cada tipo sai do que o manual dá como oportunidade de
   cada magia, e onde ele não se aplica ao nosso combate escolhi o mais
   próximo: o Ventus derruba quem voa e aqui ninguém voa, portanto fica
   lento; o Terra tira uma acção e aqui um turno é uma acção, portanto
   também. */
const FU_ELEMENTAL = {
  fogo:   { nome: 'Ignis',    estado: 'abalado'    },
  terra:  { nome: 'Terra',    estado: 'lento'      },
  raio:   { nome: 'Fulgur',   estado: 'atordoado'  },
  ar:     { nome: 'Ventus',   estado: 'lento'      },
  gelo:   { nome: 'Glacies',  estado: 'lento'      },
  veneno: { nome: 'Venenum',  estado: 'envenenado', nosso: true },
  luz:    { nome: 'Lux',      estado: 'atordoado'  },
  treva:  { nome: 'Umbra',    estado: 'abalado'    },
};

/* ── O GOLPE CONCENTRADO ──

   O manual escreve três — Flare (fogo), Thunderbolt (raio) e Iceberg
   (gelo) — e são a mesma magia com o tipo trocado: 20 PM, um alvo,
   HR+25, e ignora resistências.

   As outras cinco são nossas. E os nomes do manual estão em três
   registos diferentes (um latim, um inglês composto, um substantivo
   comum), o que num lugar ao lado da linha latina das barragens dava
   confusão: o jogador não saberia, ao ler, qual dos dois lugares estava
   a olhar.

   Ficam todos num registo só, em português e inglês — o que também os
   separa à vista da linha latina. O de fogo deixa de se chamar Flare e
   passa a Lança de Brasa; é o preço de os oito falarem a mesma língua.

   Os números são do manual e não se discutem; os nomes foram aprovados
   pelo dono do jogo em 12/09/2026, e passam a ser os nomes. */
const FU_CONCENTRADO = {
  fogo:   { nome: 'Lança de Brasa',   en: 'Emberlance'   },
  terra:  { nome: 'Peso do Mundo',    en: 'Worldweight',  nosso: true },
  raio:   { nome: 'Dedo do Trovão',   en: 'Thunderfinger' },
  ar:     { nome: 'Faca de Vento',    en: 'Windknife',    nosso: true },
  gelo:   { nome: 'Prego de Gelo',    en: 'Icenail'      },
  veneno: { nome: 'Sopro Apodrecido', en: 'Rotbreath',    nosso: true },
  luz:    { nome: 'Agulha de Luz',    en: 'Lightneedle',  nosso: true },
  treva:  { nome: 'Beijo do Breu',    en: 'Pitchkiss',    nosso: true },
};

/* ═══════════════════════════════════════════════════════════════════
   AS DEZOITO CASAS

   O `id` é a chave de tradução; o resto são os números que o motor lê.
   Nenhuma casa tem texto — quem diz ao jogador o que a magia faz é o
   i18n, e o motor nunca lê uma palavra.
   ═══════════════════════════════════════════════════════════════════ */
const FU_MAGIAS = {

  /* ── O GOLPE COMUM ──
     Sem custo e sempre disponível. Não troca de magia: sobe pelo dano
     extra da raridade, que o motor já soma (ver ficha.danoExtra). */
  comum: {
    1: { id: 'golpe', pm: 0, alvos: 1, fixo: 5, corpoACorpo: true, manual: 'p.303' },
    2: { id: 'golpe', pm: 0, alvos: 1, fixo: 5, corpoACorpo: true, manual: 'p.303' },
    3: { id: 'golpe', pm: 0, alvos: 1, fixo: 5, corpoACorpo: true, manual: 'p.303' },
  },

  /* ── ATAQUE FORTE — a barragem ──
     Espalha-se pela equipa inimiga. O manual escreve estas magias para
     grupos de três a cinco e a nossa formação é de três: uma barragem
     atinge o lado inteiro. */
  forte: {
    1: { id: 'sopro', pm: 5, alvos: 1, fixo: 10, manual: 'p.310' },
    2: { id: 'barragem', pm: 10, alvos: 3, porAlvo: true, fixo: 15,
         porTipo: 'elemental', manual: 'p.188' },
    /* O degrau do Lendário não traz números novos: traz o estado a
       acontecer SEMPRE, em vez de só no crítico. É o degrau mais barato
       da tabela inteira e provavelmente o mais sentido em jogo. */
    3: { id: 'barragem_certa', pm: 10, alvos: 3, porAlvo: true, fixo: 15,
         porTipo: 'elemental', estadoSempre: true, manual: 'p.188 (adaptada)' },
  },

  /* ── ATAQUE MUITO FORTE — o concentrado ──
     Um alvo, e dói. Separado da barragem de propósito: assim o jogador
     escolhe ENTRE os dois em cada turno, em vez de o segundo tornar o
     primeiro obsoleto. */
  muito_forte: {
    1: { id: 'sopro_maldito', pm: 10, alvos: 1, fixo: 15,
         porTipo: 'elemental', estadoSempre: true, manual: 'p.310' },
    2: { id: 'concentrado', pm: 20, alvos: 1, fixo: 25,
         ignoraResistencias: true, porTipo: 'concentrado', manual: 'p.188' },
    /* Devastação: sem rolagem e sem defesa que valha. É a única magia
       do jogo que não pergunta nada a ninguém — o manual reserva-a para
       campeões de nível 30+, e o nosso Lendário chega aos 27. */
    3: { id: 'devastacao', pm: 30, todos: true, danoFixo: 30,
         umaPorTurno: true, manual: 'p.310' },
  },

  /* ── DEFESA ──
     Aguentar. E é o lugar do da frente, que cobre os outros dois. */
  defesa: {
    1: { id: 'concha', pm: 10, proprio: true, cena: { resisteFisico: true }, manual: 'p.311' },
    /* Piso fixo e não bónus: quem tem dado pequeno de Destreza ganha
       muito, quem já tem d12 não perde nada — o manual escreve-a assim
       de propósito, e é o que a torna uma magia de quem precisa. */
    2: { id: 'barreira', pm: 5, alvos: 3, porAlvo: true, aliado: true,
         cena: { defesaMinima: 12 }, manual: 'p.208' },
    3: { id: 'misericordia', pm: 20, alvos: 1, aliado: true,
         cena: { misericordia: true }, manual: 'p.209' },
  },

  /* ── SUPORTE ──
     Curar, limpar, levantar. */
  suporte: {
    1: { id: 'lamber', pm: 5, proprio: true, cura: 20, manual: 'p.311' },
    2: { id: 'curar', pm: 10, alvos: 3, porAlvo: true, aliado: true, cura: 40, manual: 'p.209' },
    /* Despertar mexe na FICHA e não nos pontos: um d8 vira d10, e com
       ele sobem a defesa, a precisão e o dano. É a única magia do jogo
       que muda um atributo. */
    3: { id: 'despertar', pm: 20, alvos: 1, aliado: true,
         cena: { subirDado: true }, manual: 'p.208' },
  },
};

/* ── O DEGRAU DE UMA RARIDADE ── */
function fuDegrau(raridade) {
  return raridade === 'Lendário' ? 3 : raridade === 'Raro' ? 2 : 1;
}

/* ═══════════════════════════════════════════════════════════════════
   A MAGIA DE UM AVATAR, NUM LUGAR

   Junta a casa da tabela com o que o avatar lhe traz: o tipo de dano da
   cor dele, o nome da variante e o estado que ela impõe.

   É esta função e mais nenhuma que decide o que um avatar tem em cada
   lugar. O motor recebe o objecto pronto e não sabe de tabelas.
   ═══════════════════════════════════════════════════════════════════ */
function fuMagiaDe(ficha, lugar) {
  const casa = FU_MAGIAS[lugar] && FU_MAGIAS[lugar][fuDegrau(ficha.raridade)];
  if (!casa) return null;

  const m = Object.assign({}, casa, { lugar, tipo: ficha.tipo });

  if (casa.porTipo === 'elemental') {
    const e = FU_ELEMENTAL[ficha.tipo] || FU_ELEMENTAL.fogo;
    m.nome = e.nome;
    m.estado = e.estado;
  } else if (casa.porTipo === 'concentrado') {
    const c = FU_CONCENTRADO[ficha.tipo] || FU_CONCENTRADO.fogo;
    m.nome = c.nome;
    m.nomeEn = c.en;
  }
  return m;
}

/* Os cinco lugares de um avatar, prontos a desenhar no menu. */
function fuMagiasDe(ficha) {
  const out = {};
  for (const l of FU_LUGARES) out[l] = fuMagiaDe(ficha, l);
  return out;
}

/* Quanto custa mesmo, com o número de alvos que se escolheu. O manual
   escreve "10 × A" nas que cobram por alvo. */
function fuCusto(magia, nAlvos) {
  if (!magia) return 0;
  return (magia.pm | 0) * (magia.porAlvo ? Math.max(1, nAlvos | 0) : 1);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FU_LUGARES, FU_ELEMENTAL, FU_CONCENTRADO, FU_MAGIAS,
    fuDegrau, fuMagiaDe, fuMagiasDe, fuCusto,
  };
}
