# CALIBRAÇÃO DO EXAME DE RARIDADE — os números, e por quê

> **Etapa 3I.10.** Calibração. Não implementa o exame, não promove ninguém, não
> altera código de produção. Produz uma proposta numérica defensável e diz
> exatamente onde a evidência não chega.
>
> Companheiro de [exame-de-raridade.md](exame-de-raridade.md), que fixou a
> estrutura. Aqui entram os números.

---

## 0. A RESPOSTA, EM PRIMEIRO LUGAR

```text
N_R    = 3        ciclos com vitória, para Rare
N_L    = 5        ciclos com vitória, para Legendary
P_R    = N/A      redundante — provado na seção 5
A_P    = 1150     rank mínimo de um adversário relevante
A_Q    = 3        adversários relevantes distintos (por uid)
S_CURA = INDETERMINADO
N_S    = INDETERMINADO
```

**A Via B não é calibrável com a evidência que existe.** Não por falta de
jogadores: por um achado estrutural medido no motor. A seção 7 mostra o número
que fecha a questão — a correlação entre cura acumulada e partidas jogadas é
**0,994**. Qualquer limiar de cura é ou um portão de feitio ou um concurso de
volume, e a própria etapa proíbe volume como critério principal.

Recomendação: **Legendary com a Via A apenas**, e a Via B registrada como
extensão desenhada e não calibrada, com a lista exata do que falta no motor
para que ela passe a medir mérito.

---

## 1. OS DADOS: O QUE É REAL E O QUE É SINTÉTICO

### Real — sai do jogo, não de um modelo

| o que | de onde | tamanho |
|---|---|---|
| suporte por partida | **o motor de combate**: partidas completas com a IA de verdade, refeitas pelo `pvpRepetir` e contadas pelo `pvpSuporteSomar` | **11 400** avatares-partida (1 900 partidas em três níveis) |
| taxa de vitória por combinação | as mesmas partidas | 11 400 |
| a aritmética do rank | `js/pvp-rank.js`: delta, K, colocação, teto por par, virada de temporada | — |
| o ciclo | `pvpTemporada` (mês UTC) | — |
| energia por partida | `PVP_ENERGIA_CUSTO = 10`, mínimo 20 para entrar | — |
| regeneração | `+4` por ciclo de 60 s dormindo | — |

### Sintético — declarado como tal

**Não existem jogadores reais.** Tudo em produção é conta de teste. Logo a
população é um modelo, e estes são os seus parâmetros:

| o que | o modelo | por que assim |
|---|---|---|
| habilidade | normal, σ = 200 de Elo | é a forma que o Elo assume; a curva logística da diferença dá a chance de vitória |
| atividade | log-normal, σ = 1,1, mediana 30 lutas de fila por ciclo | p10 = 7, mediana = 30, p75 = 63, p90 = 121. A maioria joga pouco e uns poucos muito — a forma que a atividade tem em qualquer jogo. **O primeiro modelo dava 30 a todos, e era ele que fazia o Rare passar 100%.** |
| retenção | 0,75 por ciclo | de 100 que entram, 32 continuam ativos no 5.º ciclo |
| emparelhamento | o mais próximo em pontos entre 12 sorteados | é o que o `tentarPar` faz: a fila pareia por pontos |
| vantagem de combinação | derivada da taxa de vitória **medida**: `e = 400·log₁₀(p/(1−p))` | −42 a +23 de Elo, por combinação |
| população | 20, 30, 50, 100, 300, 500, 1 000, 3 000, 9 000 | varrida |

O que isto **não** modela: churn correlacionado com desempenho, jogadores que
entram depois do início, mercado de avatares, e a possibilidade de a fila estar
vazia a certas horas.

### Método

Cada avatar seguido acumula `feitos` pelas regras de verdade: `ciclos[c].{n,v}`
pelo resultado, `vencidos[uid]` com o maior rank pré-partida, e o suporte
**amostrado das 11 400 linhas reais** da sua própria combinação. Depois
aplicam-se os candidatos e conta-se quem passa.

Ferramentas, todas temporárias e fora do jogo: `suporte.js` (mede o motor),
`rank-pop.js` (a escada do rank), `calibrar.js` (varre), `decidir.js` (decide).

---

## 2. O ACHADO QUE MUDA TUDO: A ESCADA DO RANK É CURTA

A primeira coisa a medir era a distribuição de rank, porque dela saem `A_P` e
`A_Q`. A etapa pediu para não assumir 1200/1400/1600/1800/2000 sem mostrar como
se relacionam à população. Medido:

**População 200, um ciclo, por atividade:**

| lutas/ciclo | mediana | p90 | p99 | máx | ≥1100 | ≥1200 | ≥1300 | ≥1400 |
|---|---|---|---|---|---|---|---|---|
| 10 | 1000 | 1099 | 1181 | 1204 | 19 | 1 | 0 | 0 |
| 30 | 1000 | 1133 | 1226 | 1271 | 30 | 2 | 0 | 0 |
| 50 | 1000 | 1136 | 1280 | 1345 | 38 | 10 | 1 | 0 |
| 120 | 1000 | 1204 | 1403 | 1471 | 49 | 21 | 4 | 2 |
| 200 | 1005 | 1238 | 1477 | 1590 | 60 | 30 | 12 | 4 |

**Em populações de 20 a 1 000, a 30 lutas por ciclo, ninguém chega a 1400.**
O máximo observado foi 1271–1325.

### Por que a escada é tão curta

Duas razões, e as duas são estruturais:

1. **A fila pareia por pontos.** A expectativa de cada luta é 0,5, logo o delta
   é ±12 e o rank é um passeio aleatório em torno de 1000. A mediana fica em
   1000 por construção — não por falta de habilidade.
2. **A virada de temporada corta metade do caminho de volta aos 1000.** Nada se
   acumula ao longo de anos. 2000 vira 1500 no mês seguinte e 1250 no outro.

Consequência: **os limiares da intuição do xadrez não existem neste jogo.** A
faixa útil de `A_P` é 1100–1250, e não 1400+. Um `A_P = 1400` fecharia a Via A
para todos sem ninguém ter decidido isso — o risco que a etapa 3I.8 previu e
que aqui fica medido.

### O que 1150 significa, em linguagem humana

A 1000 contra 1000, uma vitória vale +12. Logo **1150 é "cerca de doze vitórias
líquidas acima da linha de partida"** — e, por causa da virada mensal, doze
vitórias líquidas *recentes*. É uma definição que não depende de população
nenhuma: depende da aritmética do jogo.

---

## 3. N_R — OS CICLOS DO RARE

### Os candidatos, medidos

População 600, 8 ciclos, atividade heterogênea, retenção 0,75:

| N_R | passam a Rare |
|---|---|
| 2 | 73,0% |
| **3** | **56,0%** |
| 4 | 38,8% |
| 5 | 30,3% |
| 6 | 23,5% |

### O que o N_R mede de fato

Com atividade mediana (30 lutas no mês), ganhar ao menos uma vez é quase certo.
Medido: de quem viveu N ciclos a essa atividade, **100%** satisfazem N≥N. Com
atividade baixa (5 lutas por ciclo) o filtro aparece: 3 ciclos vividos → 77%
passam N≥3.

Logo o `N_R` **não mede habilidade — mede meses de presença ativa.** E é isso
que se quer dele: a habilidade é medida pela Via A. Dizê-lo em voz alta evita
que uma etapa futura tente afinar o `N_R` para selecionar os bons.

### Por que 3 é melhor que 2

A 73%, Rare é quase automático para quem volta uma vez. Dois ciclos é o mínimo
aritmético de "mais de um" — e **"trajetória" implica direção, que não se
distingue de um único retorno com dois pontos.** Três é o primeiro número em
que a presença tem forma.

### Por que 3 é melhor que 4

Três coisas:

1. A 38,8%, Rare passa a ser minoria dos persistentes — e Rare, por decisão da
   3I.6, **não representa excelência**. O patamar que separa "experimentou" de
   "jogou" deve alcançar o avatar mediano que persiste, e não só a minoria.
2. O custo de calendário é um terço do ano antes de qualquer reconhecimento.
3. Com retenção de 0,75, só 32% chegam ao 5.º ciclo. Um `N_R` alto passa a
   medir **retenção** e não trajetória — e retenção não é mérito.

**N_R = 3.** Três meses distintos com ao menos uma vitória de fila cada.

---

## 4. N_L — OS CICLOS DO LEGENDARY

Com A_P = 1150 e A_Q = 3, população 600, 8 ciclos:

| N_L | Leg-A |
|---|---|
| 4 | 12,2% |
| **5** | **10,5%** |
| 6 | 8,3% |
| 7 | 6,2% |

A curva é suave: o `N_L` não é a alavanca de selectividade (a alavanca é o
`A_P`). O seu trabalho é outro, e único: **garantir que o excepcional não foi
um acidente de um mês.**

Escolhe-se **N_L = 5**, `N_R + 2`:

- `N_R + 1` = 4 deixaria um mês só de diferença entre as duas certificações, e
  o eixo temporal deixaria de distinguir Legendary de Rare;
- `N_R + 3` = 6 empurra Legendary para meio ano de calendário, e a 8,3% contra
  10,5% compra pouca selectividade por dois meses de espera;
- **5 ciclos é também "sobreviveu a quatro viradas de temporada"** — porque o
  ciclo é a temporada do rank (a mesma função nomeia os dois). Essa é a leitura
  que importa: o `N_L` mede quantas zeragens parciais a trajetória atravessou.

**Legendary implica Rare**, porque a base é a condição de Rare com o N maior.

---

## 5. P_R — REJEITADO, COM PROVA

A etapa pediu para só acrescentar um piso de participação com justificação
demonstrável. Não há.

**Com atividade normal:** dos 400 avatares que satisfazem N_R = 3, as partidas
de fila vão de um mínimo de **73** a 340 (mediana 177). `P_R` de 0 a 20 corta
**zero**.

**Com atividade mínima** (2 lutas por ciclo), onde um piso poderia morder:

| P_R | corta |
|---|---|
| 3 | 0 de 338 |
| 5 | 4 de 338 (1,2%) |
| 10 | 66 de 338 (20%) |
| 20 | 326 de 338 (96%) |

Os únicos valores que cortam algo cortam **jogadores legítimos de baixa
atividade** — precisamente o "volume favorece disponibilidade de tempo" que a
seção 6 da etapa proíbe.

E há a redundância aritmética: `ciclosComVitoria >= 3` implica **3 vitórias**,
logo implica ao menos 3 partidas. Qualquer `P_R ≤ 3` é consequência de R2.

**P_R = N/A.** Redundante abaixo de 3, nocivo acima de 5.

### A mesma redundância, para `vitoriasFila`

`ciclosComVitoria >= N_R` implica `vitoriasFila >= N_R`. Um requisito
`vitoriasFila >= V` só acrescenta algo se **V > 3**, e nada nos dados pede isso.
**Eliminado**, e registrado como eliminado para que não reapareça.

---

## 6. VIA A — A_P E A_Q

### A grelha completa

População 3 000, 8 ciclos, percentual sobre **todos os que entraram**:

| N_L | A_P | Q=1 | Q=2 | **Q=3** | Q=4 | Q=5 | Q=6 |
|---|---|---|---|---|---|---|---|
| 5 | 1100 | 14,4% | 12,7% | **11,7%** | 10,9% | 10,1% | 9,4% |
| 5 | **1150** | 10,9% | 9,0% | **7,8%** | 7,0% | 6,1% | 5,6% |
| 5 | 1200 | 8,3% | 6,1% | **5,0%** | 4,2% | 3,5% | 3,0% |
| 5 | 1250 | 6,0% | 4,1% | **2,7%** | 2,2% | 1,9% | 1,7% |

### A_P: a alavanca de selectividade

| A_P | Leg-A (pop 600) |
|---|---|
| 1050 | 19,5% |
| 1100 | 15,0% |
| **1150** | **10,5%** |
| 1200 | 6,7% |
| 1250 | 4,2% |
| 1300 | 1,7% |

O que decide é a **população pequena**. Contagem absoluta de elegíveis, N_L=5,
8 ciclos — a pergunta não é a percentagem, é se o número é zero:

| pop | A_P=1100, Q3 | A_P=1150, Q3 | A_P=1200, Q3 |
|---|---|---|---|
| 20 | 3 | **3** | **0** |
| 30 | 4 | **2** | **0** |
| 50 | 5 | 4 | 4 |
| 100 | 14 | 8 | 6 |
| 1000 | 134 | 90 | 69 |

**A_P = 1200 fecha a Via A em populações de 20 e 30.** A_P = 1150 mantém-se
positivo em todas. É o limiar mais exigente que sobrevive ao servidor pequeno —
e esse é o critério, não a percentagem.

**A_P = 1150.**

### A_Q: não é alavanca de selectividade, é alavanca anti-conluio

Este é o achado mais útil da Via A. De Q=1 a Q=6 a taxa honesta cai pouco
(14,3% → 8,3%), porque **quem vence um forte tende a vencer vários**: é forte, e
a fila volta a emparelhá-lo com fortes. Mas o custo de fabricar cresce
**linearmente no número de PESSOAS distintas**:

| A_Q | pessoas a recrutar | dias-pessoa por mês | taxa honesta |
|---|---|---|---|
| 1 | 1 | 4 | 14,3% |
| 2 | 2 | 8 | 11,3% |
| **3** | **3** | **12** | **10,5%** |
| 4 | 4 | 16 | 9,8% |
| 6 | 6 | 24 | 8,3% |

Logo o `A_Q` deve ser **o maior valor que a população pequena aguenta**, porque
é quase grátis para quem joga e caro para quem combina. Medido (A_P=1150):

| pop | Q=3 | Q=4 | Q=5 | Q=6 |
|---|---|---|---|---|
| 20 | **3** | **0** | **0** | **0** |
| 30 | 2 | 1 | 1 | **0** |
| 50 | 4 | 4 | 3 | 2 |
| 1000 | 90 | 84 | 79 | 76 |

**A_Q = 3**, e é um valor de fronteira: A_Q = 4 já dá zero aos 20 jogadores.

### A regra final da Via A, e o modelo escolhido

A etapa pediu para comparar A1 (pico **e** Q adversários acima do mesmo pico) e
A2 (pico **e** Q distintos, os outros podendo estar abaixo).

**Escolhido: A1 — um limiar só.** Razão: a 3I.8 provou que
`melhorAdversario.pontos === max(vencidos[].pontos)`, logo exigir o pico *e* a
amplitude com dois limiares diferentes acrescenta um parâmetro que a medição
não justifica. Com `A_Q = 3` acima de `A_P = 1150`, o pico está acima de 1150
por consequência: **o pico vem de graça da amplitude**, e um `L_pico` separado
seria um número a mais a defender sem dados.

```text
viaA(avatar) =
    | { v ∈ feitos[id].pvp.fila.vencidos : v.pontos >= 1150 } |  >=  3
```

Lê `vencidos`, nunca `melhorAdversario` — para o mesmo fato não entrar duas
vezes. Cada `uid` conta uma vez, pela estrutura da 3I.7.

**Simplicidade ganha, e era o critério 6 da regra de decisão.** Um parâmetro de
rank, um de quantidade.

---

## 7. VIA B — INDETERMINADO, E POR UM ACHADO ESTRUTURAL

Aqui a calibração produziu conhecimento em vez de números, e o conhecimento é
negativo.

### Achado 1 — só um feitio produz suporte

Medido em 11 400 avatares-partida reais, nível 40:

| combinação | curaPv/partida | cura | limpeza | protegeuFez | % com efetivo |
|---|---|---|---|---|---|
| guarda × e0/e1/e2 | **0,0** | 0,00 | 0,00 | 0,000 | **0,0%** |
| lamina × e0/e1/e2 | **0,0** | 0,00 | 0,00 | 0,000 | **0,0%** |
| sustentacao × e0 | 34,2 | 1,56 | 1,51 | 0,000 | 89,1% |
| sustentacao × e1 | 33,7 | 1,47 | 1,52 | 0,000 | 86,3% |
| sustentacao × e2 | 30,3 | 1,33 | 1,26 | 0,000 | 83,8% |

Por escola o eixo é neutro (30,2% / 28,6% / 28,7%). **A assimetria é inteira do
feitio, e é total.** Um avatar de Lâmina nunca satisfaz um limiar de cura.

### Achado 2 — a cura acumulada *é* o volume de partidas

```text
correlação (curaPv acumulado × partidas de fila jogadas) = 0,994
```

Da sustentação que chega a 5 ciclos: p10 = 4 298, mediana = 13 552,
p90 = 50 978, máx = 210 112 de `curaPv`.

| S_CURA | passam, da sustentação | passam, dos outros |
|---|---|---|
| 1 a 1 000 | **100%** | **0%** |
| 2 000 | 98% | 0% |
| 10 000 | 61% | 0% |
| 50 000 | 10% | 0% |

E a sensibilidade confirma, com a aritmética: de `S_CURA = 200` a `1500`, a taxa
de Leg-B é **9,7% em todos**. De `N_S = 1` a `5`, **9,7% em todos**. Alavanca
zero. Um parâmetro que não muda o resultado não é um parâmetro.

**Logo qualquer limiar é uma de duas coisas:**

- **abaixo de ~4 300** → passa 100% da sustentação e 0% dos outros: é um
  **portão de feitio** com passos extra;
- **acima disso** → o que separa é quantas partidas jogou: é um **concurso de
  volume**, proibido pela seção 6 como critério principal.

### Achado 3 — não existe uma segunda categoria de suporte

A seção 18 pediu para determinar, pela implementação, se `limpeza` é
independente de `cura`. Não é, e a prova está nas tabelas de magia: o campo
`limpa` **só existe em magias de cura** (`curar` 1, `lamber` 1,
`transfusao` 2). Nenhuma magia limpa sem curar. Medido: limpeza aparece em 20,9%
e cura em 25,6%, sempre juntas e sempre em Sustentação.

E `protegeuFez` aconteceu **1 vez em 11 400** avatares-partida (0,01%). Um
limiar sobre ele é inviável.

**Há uma categoria efetiva de suporte, não três.** A exigência de diversidade
que a etapa pediu é insatisfazível por construção.

### Achado 4 — o limiar de cura depende de nível por via indireta

| nível | curaPv por partida (sustentação) |
|---|---|
| 15 | 69,9 |
| 40 | 32,7 |
| 60 | 52,7 |

A seção 7 da etapa proíbe nível como critério. Um `S_CURA` fixo **é** um
critério de nível disfarçado: um avatar de nível 15 alcança-o com metade das
partidas de um de nível 40. (A causa é o `fuCurar` limitar a cura ao que falta
de PV, e os valores de cura serem fixos enquanto os PV crescem.)

### O veredicto, e o que o sustenta

```text
S_CURA = INDETERMINADO
N_S    = INDETERMINADO
```

Não por falta de jogadores reais — a medição tem 11 400 partidas do motor. Por
**o espaço de métricas não conseguir expressar o conceito.** Nenhum número
existe que torne a Via B um teste de mérito.

### O que o Legendary passa a ser

Se a Via B entrasse com qualquer limiar plausível, a neutralidade do exame
quebrava:

| | Rare | Leg-A | Leg-B | Leg total |
|---|---|---|---|---|
| amplitude entre as 9 combinações | 4,0 pp | **2,6 pp** | **40,5 pp** | **35,1 pp** |

Via B daria 26–40% a cada combinação de Sustentação e **0,0% a todas as outras
seis**, e Leg-B (9,7%) rivalizaria com Leg-A (10,5%): metade dos Legendary
seriam "é Sustentação e apareceu cinco meses". O cenário F mede isto — um
avatar com duas vitórias por mês e muita cura passaria.

**Recomendação: Legendary = base temporal AND Via A.** A Via B fica desenhada e
registrada, à espera de instrumentação.

### O que teria de mudar para a Via B existir

Não são números; é motor e instrumentação:

1. **`danoMitigado` / `danoRedirecionado`** — a contribuição da Guarda é real
   (absorve golpes) e hoje é invisível: o `guardaAliado` conta a guarda
   **posta**, não o dano que ela evitou. Com essa métrica, a Guarda passaria a
   ter suporte medível e a Via B deixaria de ser de um feitio só. Já estava
   listada como dívida na 3I.8.
2. **`protegeuFez` precisa de acontecer** — 1 em 11 400 é a IA quase nunca
   escolher Proteger, ou o desvio quase nunca disparar. É questão de motor/IA.
3. **Uma métrica de suporte independente de volume** — intensidade por partida,
   ou fração das partidas em que houve suporte efetivo. A 3I.9 instrumentou o
   suporte **por ciclo**; falta o **por partida**, que é o que separaria
   intensidade de quantidade.

Com (1) e (3) a Via B volta a ser calibrável. Sem elas, não.

---

## 8. AS REGRAS FINAIS

### Rare — em linguagem matemática

```text
Rare(avatar) ⟺
    | { c ∈ feitos[id].ciclos : feitos[id].ciclos[c].v > 0 } |  >=  3
```

### Rare — em linguagem humana

> O avatar venceu ao menos uma partida de fila em **três meses diferentes**.

Nada mais. Sem piso de partidas, sem piso de vitórias, sem taxa de vitória, sem
nível, sem idade, sem PvE, sem amistosas.

### Legendary — em linguagem matemática

```text
Legendary(avatar) ⟺
    | { c ∈ feitos[id].ciclos : feitos[id].ciclos[c].v > 0 } |  >=  5
AND | { v ∈ feitos[id].pvp.fila.vencidos : v.pontos >= 1150 } |  >=  3
```

### Legendary — em linguagem humana

> O avatar venceu ao menos uma partida de fila em **cinco meses diferentes**, e
> derrotou **três pessoas diferentes** que valiam **1150 pontos ou mais** no
> momento em que foram derrotadas.

"Pessoas diferentes" é literal: a unidade é o `uid` do jogador. Dez avatares do
mesmo dono contam como um.

### Como a Via A lê os dados, exatamente

```text
para cada entrada v de feitos[id].pvp.fila.vencidos:
    v.uid     o JOGADOR derrotado (um por entrada, para sempre)
    v.pontos  o MAIOR rank pré-partida em que esse uid foi derrotado
    v.divisao a divisão daquela partida — registrada, nunca convertida
conta-se  | { v : v.pontos >= 1150 } |
```

Não lê `melhorAdversario` (seria o mesmo fato duas vezes). Não lê
`pvp.amistosa`. Não lê a distribuição temporal dos adversários — a 3I.8 decidiu
que a Via A é quantitativa, e a 3I.9 confirmou que o dado temporal é parcial por
construção.

---

## 9. OS CENÁRIOS A–K

| cenário | Rare | Leg-A | o que falta, e por que está certo |
|---|---|---|---|
| **A** muito ativo, poucas vitórias | **SIM** | não | 0/3 fortes. Participação não é excelência |
| **B** poucas partidas, venceu um forte | **não** | não | 1/3 ciclos. Um pico não é trajetória |
| **C** muitas vitórias contra iniciantes | **SIM** | não | 0/3 fortes. Volume contra fracos não qualifica |
| **D** muitas vitórias, mesmo parceiro | **SIM** | **não** | 1/3 pessoas distintas. **A defesa anti-conluio funciona** |
| **E** centenas de amistosas | **não** | não | 0/3 ciclos. A amistosa não escreve ciclo |
| **F** muito suporte, poucas vitórias | **SIM** | não | 0/3 fortes. *Com Via B passaria — e é por isso que ela sai* |
| **G** jovem excepcional, 3 meses | **SIM** | não | 3/5 ciclos. Idade não barra; **tempo barra** |
| **H** antigo sem desempenho | **não** | não | 0/3 ciclos com vitória. Idade não é evidência |
| **I** vendido várias vezes | **SIM** | **SIM** | nada. O mérito é do avatar e atravessa a venda |
| **J** comprado já Rare | **SIM** | não | 3/5 ciclos. A compra não concede mérito |
| **K** as 9 combinações | ver §11 | ver §11 | nenhuma entra em condição alguma |

Dois a destacar:

**D é o teste que importa, e passa.** Um avatar com 210 vitórias contra o mesmo
parceiro, incluindo um a 1300 pontos, **não** é Legendary: tem 1 pessoa
distinta das 3 exigidas. O `A_Q` está lá exatamente para isto.

**G está correto e vai doer.** Um jovem com 90 vitórias em 3 meses e quatro
adversários acima de 1150 não é Legendary — faltam-lhe dois meses. Não por ser
jovem: idade não aparece em condição nenhuma. Por a trajetória ainda não existir.
É a única barreira à instantaneidade, e a única que ninguém pode acelerar.

---

## 10. O CONLUIO

### Rare, fabricado

`N_R = 3` exige uma vitória em três meses distintos. Com um cúmplice: três
vitórias entregues, uma por mês. **Custo: 30 de energia e três meses.**

Barato em esforço, impossível de acelerar no tempo. E é aceitável: Rare não
representa excelência. Fabricar Rare é fabricar "apareci três meses", que é o
que Rare diz.

### Legendary, fabricado — é aqui que o custo aparece

Medido com a aritmética real do rank:

| alvo | dias ao teto de 40/dia | na virada cai a |
|---|---|---|
| 1100 | 3 | 1050 |
| **1150** | **4** | **1075** |
| 1200 | 5 | 1100 |

Com `A_Q = 3`: **3 pessoas reais recrutadas**, 4 dias cada ao teto por par,
≈12 dias-pessoa e 7 200 de energia por mês — **refeito todos os meses**, porque
a virada corta metade do caminho. Mais 5 meses de calendário.

**Dito com honestidade: um grupo dedicado de quatro pessoas consegue.** 12
dias-pessoa por mês não é proibitivo. O que o encarece é ser uma **assinatura**
e não uma despesa única: o rank decai, logo o trabalho nunca termina.

A etapa não pede impossibilidade — pede que o custo torne a falsificação
significativamente difícil sem destruir a acessibilidade legítima. Com A_Q=3 o
jogador honesto perde 3,8 pp de taxa (14,3% → 10,5%) e o conluio triplica de
custo. É a melhor troca que os números oferecem, e o limite é a população
pequena, não a vontade.

### Os dez avatares

`vencidos` é indexado pelo **uid do jogador**:

```text
um cúmplice rodando 10 avatares  →  1 adversário distinto
se fosse por avatarId            →  10
```

A defesa 10→1 está medida (3I.7) e presa por mutação (MUT=2 e MUT=9 do conjunto
3I.7, ambas apanhadas). Sem ela, `A_Q = 3` custaria **um** cúmplice em vez de
três, e a Via A inteira cairia.

### A energia não limita

`+4` por ciclo de 60 s dormindo: de 0 a 100 em 25 minutos. A 10 por partida, são
~8 partidas por cada 25 min de sono. **A energia é um limite de ritmo fraco, não
um limite de volume.** Registrado como fato, sem propor mudança — a etapa
proíbe criar mecanismos anti-farm novos.

---

## 11. NEUTRALIDADE — AS NOVE COMBINAÇÕES

### O teste de uso direto (seção 26 da etapa)

As condições finais leem exatamente três coisas: contagens de vitória por
ciclo, a chave do mês, e o rank pré-partida de um adversário derrotado.

```text
Feitio    NÃO        Nível     NÃO
Escola    NÃO        Fase      NÃO
Raridade  NÃO        Idade     NÃO
```

### O teste de resultado — e a separação entre sinal e ruído

A primeira medição deu uma amplitude de 26,1 pp no Rare entre as nove
combinações, o que parecia grave. Era ruído de amostra, e a maneira de
demonstrá-lo é crescer a população:

| população | n por célula | amplitude Rare | amplitude Leg-A |
|---|---|---|---|
| 900 | 100 | 18,0 pp | 7,1 pp |
| 2 700 | 300 | 12,9 pp | 4,3 pp |
| **9 000** | **1 000** | **4,0 pp** | **2,6 pp** |

Encolhe para zero com a amostra: **não há sinal.** E faz sentido — nada liga a
combinação a "ciclos com vitória", que é o que o Rare mede.

Na Via A sobra uma amplitude de **2,6 pp**, e ela é real mas pequena. A causa é
a vantagem de combinação medida (−42 a +23 de Elo, 7,3 pontos percentuais de
taxa de vitória), muito atenuada porque **a fila pareia por pontos**: uma equipe
mais forte sobe até encontrar oposição à altura e volta à expectativa de 0,5.

Comparação com o que a etapa 3I.2 rejeitou: a matriz 9×9 deu **16,9 pp** de
amplitude em taxa de vitória, e foi por isso que taxa de vitória foi proibida
como critério. A Via A entrega **2,6 pp** — uma ordem de grandeza menor, e pela
razão certa: mede *contra quem venceu*, não *com que frequência*.

### A ressalva que fica

Neutralidade de regra não é neutralidade de resultado, e a 3B mediu a escola 1
a dominar o Lendário. Uma combinação mais forte alcança 1150 com menos partidas.
A regra não privilegia; o balanço privilegia, e o exame herda 2,6 pp disso.
**A correção pertence ao balanço**, nunca ao critério — compensar a escola 1
dentro do exame seria embutir nele uma correção que ele não pode verificar.

---

## 12. AS TAXAS DE ELEGIBILIDADE

Com os números finais (N_R=3, N_L=5, A_P=1150, A_Q=3, **Via A apenas**),
percentual sobre **todos os avatares que entraram**:

| pop | ciclos | → Rare | → Legendary |
|---|---|---|---|
| 20 | 3 | 45,0% | 0,0% |
| 20 | 6 | 60,0% | 5,0% |
| 20 | 12 | 50,0% | 10,0% |
| 50 | 6 | 60,0% | 10,0% |
| 50 | 12 | 58,0% | 16,0% |
| 100 | 6 | 63,0% | 11,0% |
| 100 | 12 | 56,0% | 10,0% |
| 500 | 6 | 55,8% | 7,2% |
| 500 | 12 | 55,8% | 9,2% |
| 1000 | 6 | 49,6% | 7,9% |
| 1000 | 12 | 51,4% | 8,3% |

Convertido como a etapa pediu:

```text
Common → candidato a Rare        ≈ 50 a 63%   dos que entram
Rare   → candidato a Legendary   ≈ 14 a 28%   dos Rare
Common → candidato a Legendary   ≈  7 a 16%   dos que entram
```

**Nenhuma destas taxas foi escolhida.** São o resultado do conceito aplicado à
população simulada, como a seção 27 exigiu. E com três ressalvas:

1. **Rare a ~55% é alto, e é por desenho.** Rare é "trajetória significativa",
   não excelência. O avatar mediano que persiste três meses alcança-a; o
   turista não. O filtro real é a **retenção** (0,75/ciclo no modelo), que não
   tenho dado para calibrar.
2. **Legendary a ~8–16% é alto para "excepcional".** A alavanca é o `A_P`, não
   o `A_Q`: subir a 1200 traz Legendary para ~5%, ao custo de o fechar em
   servidores de 20–30 jogadores. **É uma escolha do dono, e é a única
   realmente em aberto nesta calibração.** Os dois valores estão medidos.
3. As percentagens em população 20 e 50 oscilam muito (poucos avatares, muita
   variância). A leitura fiável nessas é a **contagem absoluta** da seção 6.

### Sem quota, e isso é verificável

```text
0 avatares atingem o critério  →  0 promovidos
100 atingem                    →  100 elegíveis
```

Nenhuma condição lê a posição de ninguém. Não há `top 10`, nem `top 1%`, nem
competição pela vaga. A certificação é acumulada e absoluta.

### O tempo mínimo

```text
Rare:       3 meses de calendário
Legendary:  5 meses de calendário
```

Inelástico: o ciclo é o mês UTC do relógio do servidor. Nenhum dinheiro, nível,
cúmplice, item ou tempo de tela compra um mês. **É a única condição do sistema
que não se acelera**, e é por isso que carrega o peso do desenho.

---

## 13. SENSIBILIDADE — O QUE ACONTECE SE CADA LIMIAR SE MEXER

População 600, 8 ciclos:

| parâmetro | ↓ abaixo | escolhido | ↑ acima | alavanca |
|---|---|---|---|---|
| `N_R` | 2 → 73,0% | **3 → 56,0%** | 4 → 38,8% | **forte** |
| `N_L` | 4 → 12,2% | **5 → 10,5%** | 6 → 8,3% | média |
| `A_P` | 1100 → 15,0% | **1150 → 10,5%** | 1200 → 6,7% | **forte** |
| `A_Q` | 2 → 11,3% | **3 → 10,5%** | 4 → 9,8% | **fraca** (e é bom: ver §6) |
| `S_CURA` | 200 → 9,7% | — | 1500 → 9,7% | **zero** |
| `N_S` | 1 → 9,7% | — | 5 → 9,7% | **zero** |

A alavanca zero do `S_CURA` e do `N_S` é a demonstração aritmética do veredicto
da seção 7: um parâmetro que não muda o resultado em nenhum valor não é um
parâmetro.

---

## 14. PARÂMETROS REJEITADOS, UM A UM

| rejeitado | por quê |
|---|---|
| **taxa de vitória** | a 3I.2 mediu 41,3%–58,3% na matriz 9×9 (16,9 pp): estruturalmente sensível a Feitio × Escola. Decisão fechada, não reaberta |
| **`P_R` (piso de partidas)** | corta zero com atividade normal; acima de 5 corta jogadores legítimos de baixa atividade (§5) |
| **`vitoriasFila >= V`** | consequência aritmética de `ciclosComVitoria >= N_R`. Só acrescentaria algo com V > 3, e nada pede isso |
| **`melhorAdversario` como critério** | `=== max(vencidos[].pontos)` (3I.8): seria o mesmo fato duas vezes |
| **`L_pico` separado (modelo A2)** | com A_Q=3 acima de A_P, o pico vem de graça. Um parâmetro a mais sem dados que o justifiquem |
| **A_P ≥ 1200** | fecha a Via A em populações de 20 e 30 (§6). Disponível como escolha do dono, com o custo medido |
| **A_P ≥ 1400** | **ninguém chega**: máximo observado 1271–1325 a 30 lutas/ciclo (§2) |
| **A_Q ≥ 4** | zero elegíveis aos 20 jogadores (§6) |
| **temporalidade na Via A** | `vencidos` perde o ciclo do primeiro encontro ao substituir por rank maior (3I.8/3I.9). Não é verificável |
| **`protegeuFez` como limiar** | 1 ocorrência em 11 400 avatares-partida (0,01%) |
| **diversidade de suporte (2 categorias)** | `limpa` só existe em magias de cura: não há segunda categoria (§7) |
| **`S_CURA` e `N_S`** | alavanca zero; portão de feitio abaixo de 4 300, concurso de volume acima (§7) |
| **nível, fase, idade, `totalSecs`, `vidaAtiva`** | progressão e permanência não são mérito competitivo (§11) |
| **PvE** | 18 payloads fabricados passaram pela validação real (3I.5). Não é evidência |
| **amistosas** | não escrevem ciclo, não dão rank; o suporte delas mora em campo separado |
| **pontuação agregada** | uma soma ponderada permite trocar evidências entre si. Só conjunções |
| **quota, top X%** | a certificação é absoluta e acumulada (§12) |

---

## 15. RISCOS

### Risco de farm

**Médio, e quantificado.** Um grupo de 4 pessoas fabrica Legendary com ~12
dias-pessoa por mês, sustentados por 5 meses. Não é proibitivo; é uma
assinatura, porque o rank decai todo mês. A defesa que carrega o peso é o
`A_Q = 3` sobre **uid de jogador** — sem ela o custo cairia a um cúmplice.

**Rare é facilmente fabricável** (3 vitórias entregues em 3 meses) e isso é
aceitável, porque Rare afirma presença e não excelência.

### Risco estrutural

**A Via A é neutra a 2,6 pp**, uma ordem de grandeza abaixo dos 16,9 pp que
condenaram a taxa de vitória. Mas herda o desequilíbrio do balanço: a escola 1
domina o Lendário (3B), e alcança 1150 com menos partidas. A correção pertence
ao balanço.

**A Via B é estruturalmente impossível de calibrar** enquanto o suporte efetivo
viver num feitio só e crescer com o volume (correlação 0,994).

### Risco populacional

**O maior dos quatro.** `A_P` e `A_Q` são acoplados ao tamanho da população, e
`A_Q = 3` é valor de fronteira: aos 20 jogadores dá 3 elegíveis, e `A_Q = 4` dá
zero. Se o servidor encolher abaixo de ~20 jogadores ativos, ou se a fila
estiver vazia em certas horas, **a Via A fecha sozinha sem ninguém decidir
isso.**

Os números precisam de ser revistos quando a população mudar de ordem de
grandeza. Não é um defeito corrigível por escolha de número: é a natureza de um
limiar absoluto sobre uma grandeza relativa.

### Risco de implementação

Baixo. As duas condições leem campos que já existem, já são escritos só pelo
servidor, já estão presos por 25 mutações (11 da 3I.7 + 14 da 3I.9) e já
atravessam a venda. A regra é duas desigualdades sobre dois campos — não precisa
de instrumentação nova.

O cuidado: ler `vencidos` e **não** `melhorAdversario`, e `pvp.fila` e **não**
`pvp.amistosa`.

### O risco que fica por cima de todos

**Nenhum número aqui foi validado com jogadores reais, porque não existem.** A
medição do motor é real (11 400 partidas); a população é um modelo declarado.
Três coisas que o modelo não sabe e que mudariam os números:

1. **a retenção real** — decide a taxa de Rare quase por inteiro;
2. **a distribuição real de atividade** — decide o teto do rank, logo o `A_P`;
3. **quantas pessoas estão simultaneamente na fila** — decide se o `A_Q` é
   alcançável.

Antes da promoção entrar no ar, estas três precisam de ser observadas em gente
de verdade. Os números desta calibração são a melhor proposta defensável com a
evidência que existe hoje — não são uma medição de jogadores.

---

## 16. CONFIRMAÇÃO

```text
produção alterada:      NÃO
raridade implementada:  NÃO
exame implementado:     NÃO
promoção criada:        NÃO
quota criada:           NÃO
balanceamento alterado: NÃO
commit:                 NÃO
push:                   NÃO
```

Suíte, depois da calibração:

```text
testar-feitos      409 passaram · 0 falharam
testar-raridade    140 · testar-pvp 116
auditoria-lugares  628 · escolas 341 · IA 15 · avatares 3332
mutações 3I.7      11 de 11 apanhadas
mutações 3I.9      14 de 14 apanhadas
pt-br.js           limpo
```

Zero regressões. O único arquivo criado é este documento.
