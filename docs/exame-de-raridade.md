# O EXAME DE RARIDADE — especificação formal, sem números

> **Etapa 3I.8.** Documento de desenho. Não é código, não promove nada, não
> escolhe nenhum limiar. Fecha a estrutura para que a etapa seguinte precise
> apenas preencher os parâmetros com valores observados em jogadores reais.
>
> Cada afirmação de fato neste documento foi conferida no código na data da
> etapa. Os arquivos e as linhas estão citados para que uma mudança futura
> possa ser detectada.

---

## 0. A regra deste documento

Separar **estrutura** de **parâmetro**.

Estrutura é o que precisa ser verdade: `ciclosComVitoria >= N`.
Parâmetro é quanto: `N = 3`.

Aqui só existe estrutura. Todo número aparece como símbolo, e a seção 19 diz
o que cada símbolo controla.

---

## 1. O que o motor já comprova

Levantamento feito nesta etapa, lendo o código:

| fato | onde |
|---|---|
| O ciclo é o **mês do calendário em UTC** | `pvpTemporada`, `js/pvp-rank.js:136` |
| O ciclo **é** a temporada do rank: a mesma função nomeia os dois | `pvpTemporada`, usado por `pvpRankAtual` e por `feitoPvp` |
| O rank **cai metade da distância até 1000** a cada temporada | `pvpRankAtual`, `js/pvp-rank.js:160` |
| O rank é **por divisão**, guardado em `rank.<divisao>` | `api/pvp.js:690` |
| A divisão sai da **média de nível da equipe** daquela partida | `pvpDivisao`, `js/pvp-rank.js:87` |
| `feitos[id].ciclos[c] = { n, v }` — partidas **e** vitórias por ciclo | `js/feitos.js:393` |
| Só a **fila** escreve ciclo; a amistosa não | mesma linha, guarda `tipo === 'fila'` |
| `melhorAdversario` guarda o rank **de antes** da partida | `api/pvp.js:613` |
| `vencidos[]` é por **uid do jogador**, não por avatar | `js/feitos.js:459` |
| A amistosa custa a **mesma energia** e paga zero moedas | `pvpPremioDe`, `js/pvp-regras.js:230` |
| A amistosa **acumula** `pvp.amistosa.suporte` | `api/pvp.js:639` |
| O suporte **não tem recorte por ciclo** | `_ramoVazio`, `js/feitos.js:225` |
| O PvE chega num POST do cliente, sem semente nem jogadas | auditoria da etapa 3I.5 |

### 1.1 Duas consequências que mudam o desenho

**O rank é perecível.** Como `pvpRankAtual` corta metade da distância até 1000
em cada temporada nova, um rank alto não pode ser acumulado devagar ao longo de
anos. Ele é prova de desempenho **recente**. Isso faz do limiar de rank uma
defesa que se mantém sozinha: o conluio que fabrica um adversário forte tem de
refazer o trabalho a cada mês.

**O ciclo e a temporada são a mesma coisa.** "Atravessar N ciclos" é, ao pé da
letra, "sobreviver a N−1 zeragens parciais de rank". O requisito temporal não é
um enfeite de calendário: é a única condição do sistema que nenhum jogador pode
acelerar com dinheiro, nível, cúmplice ou tempo de tela.

---

## 2. As variáveis observáveis

### 2.1 `participacaoFila`

**O que é:** `feitos[id].pvp.fila.n`.

Conta uma partida de fila **encerrada e refeita pelo servidor**. O incremento
acontece em `aplicarNoJogador`, depois de `pvpRepetir` reconstruir a luta
inteira a partir da semente e da lista de jogadas.

Não conta: amistosa (vai para `pvp.amistosa.n`), PvE (não chega aqui), sala
desfeita antes do primeiro dado (com `estado === 'encerrada'` o
`aplicarPremios` nem é chamado).

Qualquer resultado conta — vitória, derrota, empate, desistência. É
participação, não desempenho.

### 2.2 `vitoriasFila`

**O que é:** `feitos[id].pvp.fila.v`.

Só o resultado verificado pelo servidor. A desistência **não** se reinterpreta:
se o resultado deste avatar foi `desistiu`, conta em `x` e não em `v`, aconteça
o que acontecer do outro lado.

### 2.3 `ciclosCompetitivos`

**O que é:** as chaves de `feitos[id].ciclos`, cada uma com `{ n, v }`.

O ciclo é o mês UTC do instante em que a partida **fechou**. A chave é
`'AAAA-MM'`, validada por `/^\d{4}-\d{2}$/` na escrita e na leitura.

Duplicação é estruturalmente impossível: é um mapa, e a chave é o mês. Mil
partidas no mesmo mês escrevem na mesma chave.

Como `ciclos[c]` guarda `n` **e** `v`, o sistema já sabe distinguir, sem
instrumentação nova:

- `ciclosComParticipacao` = quantas chaves têm `n > 0`
- `ciclosComVitoria` = quantas chaves têm `v > 0`

Essa distinção é o que separa os modelos R1 e R2 da seção 4.

### 2.4 `melhorAdversario`

**O que é:** `{ uid, pontos, divisao, ciclo, em }` — o maior rank
**pré-partida** entre os adversários derrotados na fila. Só sobe, nunca desce.
Só na vitória.

Preserva rank, divisão, ciclo e instante da partida em que o recorde foi feito.
A estrutura não muda nesta etapa.

**Achado importante:** `melhorAdversario.pontos` é **idêntico** a
`max(vencidos[].pontos)`. A lista `vencidos` está ordenada por pontos
decrescentes e a expulsão por lotação remove sempre o **mais fraco** — logo o
mais forte nunca é expulso, e `vencidos[0]` é o recorde.

Os dois campos **não são evidências independentes**. Um exame que exigisse
`melhorAdversario >= L` *e* "P adversários com rank >= L" estaria contando a
mesma prova duas vezes. `melhorAdversario` existe porque antecede a lista
(etapa 3I.3) e porque é uma leitura barata. Ver a seção 9.

### 2.5 `adversariosDistintos`

**O que é:** `feitos[id].pvp.fila.vencidos` — uma lista de
`{ uid, pontos, divisao, ciclo, em }`.

Regras, todas presas por teste de mutação na etapa 3I.7:

- a unidade é o **`uid` do jogador**, nunca o `avatarId`;
- só vitórias entram;
- só a fila (a amistosa não tem rank a ler, e o bloco nem roda);
- cada `uid` ocupa **uma** posição, para sempre;
- a posição guarda o **maior rank** em que aquele `uid` foi derrotado;
- a lista tem lotação de armazenamento (`FEITO_VENCIDOS_MAX`).

**A unidade é o `uid`, e isso foi medido, não escolhido por gosto.**
`MAX_SLOTS = 10`: um jogador roda dez avatares. Se a unidade fosse o avatar, um
único cúmplice valeria por **dez** adversários distintos. Sendo o `uid`, vale
por **um**. É também a mesma unidade do teto anti-conluio que já existia
(`rankPares.<uid>`), de modo que as duas defesas contam a mesma coisa.

**A lotação não é requisito de mérito.** `FEITO_VENCIDOS_MAX` existe porque um
documento do Firestore tem tamanho máximo. Nenhum critério pode ler esse
número, e nenhum parâmetro do exame pode ser escolhido perto dele. Se o exame
pedir P adversários, P tem de ficar confortavelmente abaixo da lotação — senão
a lotação passa a ser a regra sem ninguém ter decidido isso.

**Perda de informação a registrar:** quando o mesmo `uid` é derrotado outra vez
com rank maior, a entrada **inteira** é substituída — inclusive `ciclo` e `em`.
Sobrevive o ciclo do **pico**, e o ciclo da **primeira** vitória contra aquele
`uid` se perde. Logo a distribuição temporal dos adversários distintos é
observável apenas em parte. Isso bloqueia um dos modelos da seção 11.

### 2.6 Suporte

**O que é:** `feitos[id].pvp.<tipo>.suporte`, sete contadores somados a partir
dos eventos da partida **refeita** pelo servidor (`pvpSuporteSomar`,
`js/pvp-regras.js:484`).

Nunca conta suporte em si próprio: `pvpSuporteSomar` descarta todo evento com
`e.quem === e.alvo`.

Fui ao motor conferir, evento por evento, o que cada contador prova:

| campo | o que prova | nível |
|---|---|---|
| `curaPv` | **PV restaurados de verdade** — `fuCurar` informa quanto curou mesmo, não o valor nominal, e o contador só soma com `curou > 0` | **efetivo, com magnitude** |
| `cura` | quantas curas tiveram efeito > 0 | **efetivo, contagem** |
| `limpeza` | um estado foi **removido** — o evento só sai depois de `fuTirarEstado` devolver verdadeiro (`js/combate-fu.js:1053` e `:1174`) | **efetivo** |
| `protegeuFez` | a interceptação **aconteceu**: o golpe foi assumido por quem protegia (`js/combate-fu.js:923`) | **efetivo** |
| `beneficio` | o mapa de efeitos do aliado **mudou** (`mudou: antes !== depois`) | **aplicado, não provado útil** |
| `guardaAliado` | a guarda foi **posta** num aliado | **ação, sem resultado** |
| `protegerTentou` | a proteção foi **declarada** (`js/combate-fu.js:843`) | **declaração, sem resultado** |

Três ressalvas que a especificação precisa carregar:

**`guardaAliado` não é suporte efetivo.** É um `estiloGuarda` apontado a outro.
Nada prova que o aliado chegou a ser atacado. Pôr guarda em alguém que ninguém
atacou é um gesto, não uma contribuição. Já apontado na etapa 3I.4.

**`protegerTentou` não equivale a `protegeuFez`.** O primeiro é a declaração; o
segundo é a interceptação. Um avatar pode declarar proteção toda rodada e nunca
interceptar nada.

**`beneficio` é aplicado, não necessariamente útil.** O portão é
`mudou: antes !== JSON.stringify(alvo.efeitos)` — o mapa de efeitos mudou. Um
`defesaMinima: 12` posto num aliado que já tem Defesa 20 **muda o mapa** e não
ajuda em nada. Mudou ≠ importou.

Duas coisas que conferi e que **não** são problema, ao contrário do que se
poderia temer:

- *`beneficio` pode contar um debuff no inimigo?* **Não.** Toda magia com
  `cena` é `proprio: true` ou `aliado: true` — conferido por varredura nas duas
  tabelas (`FU_MAGIAS` e `FU_SEGUNDA_ESCOLA`): nenhuma fica sem um dos dois. E
  a lista de alvos é cruzada com a equipe aliada
  (`alvos.filter(c => c.vivo && aliada.indexOf(c) !== -1)`,
  `js/combate-fu.js:848`).
- *O `!== false` do `mudou` deixa passar um `undefined`?* Em teoria sim, mas o
  único emissor de `cena` sempre calcula `mudou` (`js/combate-fu.js:1147`).
  Fica como dívida de robustez, não como furo aberto.

A etapa 3I.6 apontou `cura`, `curaPv` e `limpeza` como especialmente
relevantes. Esta etapa confirma que os três são efetivos e acrescenta
`protegeuFez` ao mesmo nível. Nenhum limiar é escolhido aqui.

**Lacuna estrutural:** o suporte é um total por tipo de sala. **Não existe
recorte por ciclo.** Nenhum modelo de distribuição temporal de suporte é
verificável hoje. Ver a seção 13.

---

## 3. O que é PvE e o que é amistosa, para o exame

**PvE não constitui evidência.** A etapa 3I.5 disparou dezoito payloads
fabricados contra a validação real e todos passaram: o resultado chega num POST
do cliente, sem semente, sem inimigo, sem jogadas, sem estado, sem id de
batalha. Nenhum critério de exame pode ler PvE enquanto isso não mudar.

**A amistosa não constitui mérito competitivo.** Não dá rank, não dá moeda, não
escreve ciclo, não causa fratura. Mas custa a **mesma** energia e **acumula
`pvp.amistosa.suporte`**. A defesa não é econômica: é a **separação de campo**.
Todo critério do exame lê `pvp.fila.*` e nunca `pvp.amistosa.*`. Essa separação
é a razão de o arquivo `js/feitos.js` existir, e foi exatamente ela que a etapa
3I.2 descobriu quebrada (o `sala.tipo === 'convite'` nunca era verdade, e toda
amistosa entrava como fila).

---

## 4. Rare — duas formulações, e uma recomendação

### Modelo R1 — ciclos em que participou

```text
Rare =
    participacaoFila      >= M
AND vitoriasFila          >= V
AND ciclosComParticipacao >= N
```

### Modelo R2 — ciclos em que venceu

```text
Rare =
    participacaoFila  >= M
AND vitoriasFila      >= V
AND ciclosComVitoria  >= N
```

### A diferença

`ciclos[c].n` cresce com **qualquer** resultado. Em R1, a condição temporal se
satisfaz entrando na fila uma vez por mês e perdendo. R1 continua exigindo V
vitórias no total, mas **não exige que elas sejam espalhadas**: um jogador pode
ganhar as V vitórias todas num mês e depois só dar presença em N−1 meses.

`ciclos[c].v` só cresce na vitória. R2 exige pelo menos uma vitória em cada um
de N ciclos — o que força as vitórias a atravessarem o calendário.

### Recomendação: **R2**

Rare representa "trajetória competitiva significativa e deliberada". Trajetória
é justamente o que R1 deixa de exigir. Presença sem vitória é o "entrou na fila"
que a etapa 3I.6 queria distinguir de "participou competitivamente", e R1
aceita N−1 ciclos exatamente disso.

R2 não precisa de instrumentação nova: `ciclos[c].v` já existe.

### Uma relação estrutural a registrar

**R2 implica `vitoriasFila >= N`.** Uma vitória em cada um de N ciclos são N
vitórias. Logo a condição `vitoriasFila >= V` **só acrescenta algo se V > N**.

Isso não é um detalhe de estilo: se a etapa dos números escolher V ≤ N, o
parâmetro V é código morto e dá a falsa impressão de uma terceira exigência.
A etapa dos números precisa escolher **V > N** ou **remover V**.

---

## 5. A vitória mínima de Rare

A etapa 3I.6 pediu alguma evidência de vitória para separar "entrou na fila" de
"participou competitivamente". Três maneiras de escrever isso:

| forma | o que exige | avaliação |
|---|---|---|
| `existe pelo menos uma vitória` | uma, em qualquer ciclo | fraco demais: não distingue desempenho de sorte |
| `vitoriasFila >= V` | volume, sem espalhamento | é a condição de R1; sozinha, não é trajetória |
| `ciclosComVitoria >= N` | ao menos uma vitória em N ciclos | é R2; traz o volume de graça (implica V ≥ N) |

**Recomendação:** a condição de vitória de Rare é `ciclosComVitoria >= N`, e
`vitoriasFila >= V` fica como **piso de volume** apenas se a etapa dos números
escolher V > N. Nenhuma das duas é pontuação: são condições lógicas, conjugadas
por E.

---

## 6. Os ciclos, pergunta por pergunta

**A — O mesmo ciclo conta uma única vez, independentemente do número de
partidas?**
**Sim.** `feitos[id].ciclos` é um mapa cuja chave é o mês. Mil partidas em
outubro escrevem em `'2026-10'` e produzem uma chave. Contar duas vezes é
estruturalmente impossível.

**B — Quem joga 500 partidas num único ciclo satisfaz apenas 1 unidade
temporal?**
**Sim, e é esse o propósito.** Volume vira `participacaoFila` e `vitoriasFila`;
tempo vira `ciclos`. São eixos separados de propósito. Nenhuma quantidade de
partidas num mês compra um segundo mês.

**C — Quem joga poucas partidas em vários ciclos satisfaz o requisito
temporal?**
**Sim** — e ainda precisa passar por M e por V. O requisito temporal é
necessário, nunca suficiente.

**D — Uma vitória no último dia de um ciclo conta para esse ciclo?**
Conta para o ciclo do **mês UTC** do instante em que a partida fechou. Sem
tolerância, sem exceção, sem período de carência.

> **Alerta para o dono, não é defeito.** `pvpTemporada` usa `getUTCMonth`. Uma
> vitória às 23h do dia 31 de outubro em Brasília é 02h de 1º de novembro em
> UTC, e cai no ciclo de **novembro** — tanto para o `feitos.ciclos` quanto
> para a temporada do rank, que usam a mesma função. O comportamento é coerente
> em todo o sistema; o que falta é o manual dizer isso, porque é visível ao
> jogador. Fica como dívida de documentação, fora desta etapa.

---

## 7. Legendary — a forma

```text
Legendary =
    baseLegendary
AND (
        caminhoA
     OR caminhoB
    )
```

Nenhum número aqui. As três partes estão nas seções 8, 9 e 13.

---

## 8. A base temporal do Legendary

| opção | o que faz | avaliação |
|---|---|---|
| **L1** | reutiliza o requisito temporal de Rare (mesmo N) | torna Legendary um Rare com um anexo. A dimensão excepcional fica inteira dentro de A/B, e o tempo deixa de distinguir. |
| **L2** | exige N_L > N_R, mesma forma | mantém o eixo temporal significativo; a diferença qualitativa continua em A/B |
| **L3** | exige um padrão temporal diferente — por exemplo ciclos **consecutivos** | atraente no papel, ruim na prática: pune doença, viagem e vida fora do jogo, e o jogo não tem mecanismo de pausa. Um mês de ausência apagaria uma trajetória de um ano. |

### Recomendação: **L2**, com a distinção qualitativa fora do tempo

```text
baseLegendary = Rare, com N_L no lugar de N_R   (N_L > N_R)
```

Duas razões, e a segunda é a que importa.

**Primeira:** como o ciclo é a temporada do rank, N_L é literalmente "quantas
zeragens parciais esta trajetória sobreviveu". É a condição mais barata de
verificar e a mais cara de fabricar de todo o sistema.

**Segunda, e é ela que atende à filosofia:** Legendary não deve ser "Rare + X".
Com L2, o que separa Legendary de Rare **não é o N maior** — é a conjunção com
A ou B, que são condições de **outra natureza**. Rare pergunta *quanto* e *por
quanto tempo*. A pergunta *contra quem* (A) ou *fazendo o quê pelos outros* (B).
Aumentar N só garante que o excepcional não seja um acidente de um mês.

### Legendary implica Rare, e isso resolve um problema de graça

Como `baseLegendary` é a condição de Rare com N maior, todo Legendary satisfaz
Rare. Isso é coerente com "raridade só sobe" e com a ideia de escada — e fecha,
sem parâmetro novo, o furo que o Caminho B teria sozinho: um avatar não pode
chegar a Legendary **sem nunca vencer**, porque a base exige as vitórias
espalhadas de Rare. Ver a seção 13.

---

## 9. Caminho A — adversário forte

### A distinção entre os dois campos

| campo | o que prova | o que **não** prova |
|---|---|---|
| `melhorAdversario` | houve ao menos **um pico de força** | que não foi um parceiro só |
| `adversariosDistintos` | houve **largura**: várias pessoas diferentes | — |

Mas, pelo achado da seção 2.4, `melhorAdversario.pontos` **é**
`max(vencidos[].pontos)`. Os dois não são independentes, e qualquer formulação
precisa levar isso em conta.

### Formulação A1 — um limiar só

```text
caminhoA =
    | { v em vencidos : v.pontos >= L } | >= P
```

Simples, um parâmetro de rank. Mas `melhorAdversario` fica **redundante**: se P
adversários estão acima de L, o recorde está acima de L por consequência.
Testá-lo também seria contar a mesma prova duas vezes.

### Formulação A2 — pico e largura, dois limiares

```text
caminhoA =
    vencidos[0].pontos                            >= L_pico
AND | { v em vencidos : v.pontos >= L_base } |     >= P

onde L_pico > L_base
```

Cada variável volta a ter papel próprio: `L_pico` é o pico, `P` com `L_base` é
a largura. E se escreve inteira sobre `vencidos`, sem ler `melhorAdversario` —
que passa a ser **conveniência derivada** (leitura barata, exibição na ficha), e
não fonte de evidência.

### Recomendação: **A2**

Atende ao que a etapa 3I.6 descreveu — "realização excepcional que exige
evidência além de simplesmente participar e vencer" — nas duas dimensões em que
isso pode falhar: um pico de sorte contra um só adversário forte (barrado por
P), e muita largura contra adversários medianos (barrado por `L_pico`).

Custo: um parâmetro a mais para escolher. Vale.

**Obrigação para a etapa dos números:** o exame lê `vencidos`, nunca
`melhorAdversario`, para decidir o Caminho A. Caso contrário o mesmo fato entra
duas vezes na conta.

---

## 10. O mesmo `uid` em ciclos diferentes

Um avatar derrota o mesmo `uid` no ciclo A, no ciclo B e no ciclo C.

```text
conta como  → 1 adversário distinto
e não como  → 3 adversários
```

**Sem exceção, e a estrutura já garante isso:** a lista é indexada por `uid` e
cada `uid` ocupa uma posição única. A repetição só pode **atualizar** a posição
existente, e só para cima (o maior rank em que aquele `uid` foi derrotado).
Preso por mutação na etapa 3I.7 (MUT=2 duplica a entrada; o teste pega).

A análise não encontrou nenhuma razão para outro comportamento. O contrário
desmontaria a defesa contra conluio: dois combinados se reencontrariam na fila
de propósito, mês após mês, e fabricariam "largura" sem nunca conhecer uma
terceira pessoa.

---

## 11. Adversários fortes espalhados no tempo, ou não

```text
cenário 1:  A forte → ciclo 1 ; B forte → ciclo 2 ; C forte → ciclo 3
cenário 2:  A, B, C fortes → todos no mesmo ciclo
```

### Modelo por quantidade

`P` adversários distintos acima do limiar, em qualquer momento. Os dois
cenários qualificam.

*Vantagem:* mede o que diz medir — largura de oposição — e é verificável com o
que existe hoje.
*Risco:* um único ciclo muito bom qualifica. Um mês em que o saguão estava
cheio de gente forte vale o mesmo que três meses de construção.

### Modelo por quantidade mais distribuição temporal

`P` adversários distintos acima do limiar, espalhados por ao menos K ciclos. Só
o cenário 1 qualifica.

*Vantagem:* exige construção, não oportunidade.
*Risco, e é fatal hoje:* **não é verificável.** Quando o mesmo `uid` é
derrotado outra vez com rank maior, a entrada inteira é substituída e o `ciclo`
do primeiro encontro se perde (seção 2.5). A distribuição temporal que se
observaria é a dos **picos**, não a dos encontros.

### Recomendação para agora: **modelo por quantidade**

Três razões:

1. É o único verificável com a instrumentação existente.
2. A base temporal do Legendary (N_L, seção 8) **já** impõe espalhamento à
   trajetória. Uma segunda condição temporal, sobre outro eixo, somaria
   exigência sem somar clareza.
3. Como o rank cai metade da distância a cada temporada, um adversário acima de
   `L_base` no ciclo X é prova **local ao ciclo X**. A informação temporal já
   está embutida no fato de o rank ser perecível — ninguém chega a `L_base`
   senão por desempenho daquele mês ou do anterior.

### Registro explícito para a futura etapa de números

**Esta decisão fica aberta, e tem um pré-requisito conhecido.** Se a etapa dos
números quiser distribuição temporal dos adversários, a instrumentação precisa
mudar **antes**, de uma destas formas:

- guardar `primeiroCiclo` ao lado de `ciclo` em cada entrada de `vencidos`, de
  modo que a substituição por rank maior não apague o primeiro encontro; ou
- guardar, por ciclo, a contagem de adversários qualificados daquele ciclo —
  que é o dado de que o modelo realmente precisa, e é menor.

Nenhuma das duas é feita nesta etapa.

---

## 12. Divisão

```text
o rank é comparado dentro da própria divisão
não existe equivalência entre divisões
não existe escala global
não se converte rank entre divisões
```

As divisões são `jovem` (média de nível < 11), `adulto` (< 27) e `anciao` (o
resto), pela **média de nível da equipe** daquela partida (`pvpDivisao`). O rank
vive em `rank.<divisao>` — um jogador tem até três ranks independentes.

### Por que nenhuma conversão é necessária

Cada divisão **começa em 1000 e cai metade da distância até 1000** a cada
temporada, pelas mesmas constantes. Chegar a um rank R em `jovem` custa a mesma
subida que chegar a R em `anciao`: a mesma escada, a mesma zeragem parcial, o
mesmo K.

Logo um limiar único de rank (`L_base`, `L_pico`) é **neutro entre divisões por
construção**, e não por decisão. Não há escala global a inventar, porque as três
escalas são a mesma escala, aplicadas a populações diferentes.

A ressalva honesta: as populações **são** diferentes. Se uma divisão tiver pouca
gente, chegar a um rank alto nela é mais fácil — não porque a escada seja outra,
mas porque há menos degraus ocupados. Isso é um fato de população, a observar na
seção 20, e não um defeito de desenho.

### Se o avatar muda de divisão entre duas partidas

```text
derrotou um adversário com rank 1500 na divisão jovem
depois a equipe subiu de nível e passou a jogar em adulto
```

**A evidência preserva a divisão original da partida.** Cada entrada de
`vencidos` guarda `divisao`, escrita no instante da partida (`api/pvp.js:621`),
e nada a reescreve depois.

```text
não se recalcula retroativamente
não se converte
não se desconta
não se invalida
```

O avatar derrotou alguém com 1500 em `jovem`. Isso aconteceu, e continua
verdadeiro depois de ele mudar de divisão. A divisão fica registrada para que
quem leia saiba **em que escada** aquele 1500 foi feito.

Consequência a registrar: um avatar pode acumular adversários qualificados em
divisões diferentes ao longo da vida. A formulação A2 trata a lista como um
conjunto só, sem separar por divisão — coerente com "não existe equivalência
entre divisões" no sentido de que nenhuma conversão é feita, e também com "o
limiar é neutro", porque as três escadas são idênticas.

---

## 13. Caminho B — suporte

```text
caminhoB = suporteEfetivo >= S  AND  distribuicaoTemporalDeSuporte
```

### Quais campos podem entrar

Pela seção 2.6, só os **efetivos**: `curaPv`, `cura`, `limpeza`, `protegeuFez`.

```text
fora:  guardaAliado    — ação sem resultado
fora:  protegerTentou  — declaração sem resultado
fora:  beneficio       — aplicado, não provado útil
```

Os três de fora continuam gravados e continuam úteis para exibição e para
diagnóstico. Simplesmente não podem ser limiar de mérito.

E **sempre de `pvp.fila.suporte`**, nunca de `pvp.amistosa.suporte`: a amistosa
custa só energia e um amigo disposto (seção 3).

### Os três modelos

**S1 — volume absoluto.** `curaPv >= S`, e análogos.
*Verificável hoje:* sim.
*Problema:* não exige vencer. Um avatar pode perder todas as partidas e
acumular cura. Isso é **correto em princípio** — curar um companheiro numa
derrota continua a ser curar um companheiro, e é por isso que o suporte se soma
em qualquer resultado — mas sozinho permitiria Legendary sem uma vitória. A base
temporal da seção 8 resolve isso de graça, porque exige as vitórias espalhadas
de Rare.

**S2 — distribuição por ciclos.** Suporte comprovado em ao menos K ciclos.
*Verificável hoje:* **não.** `suporte` é um total por tipo de sala. Não existe
`ciclos[c].suporte` nem nada equivalente.

**S3 — volume mínimo mais distribuição temporal.** O desejável.
*Verificável hoje:* **não**, pela mesma razão de S2.

### Recomendação: **S1 agora, S3 como alvo**

```text
caminhoB =
    curaPv    >= S_pv
AND ( limpeza >= S_lim  OR  protegeuFez >= S_prot )
```

A leitura: a evidência principal é **PV restaurados de verdade** — a única
grandeza do conjunto, e com portão de efetividade no motor. A condição
secundária prova que o suporte não foi um botão só repetido: remover um estado
ou assumir um golpe exige **ler a luta**, e as duas coisas têm portão de
efetividade.

Observe que é uma conjunção de condições lógicas com uma disjunção dentro.
**Não há soma, não há peso, não há pontuação.** `limpeza + protegeuFez >= S`
seria uma pontuação disfarçada, e está descartado pela seção 18.

A distribuição temporal do Caminho B fica, por ora, herdada de `baseLegendary`
— que já exige N_L ciclos de trajetória. Não é a mesma coisa que exigir suporte
**em** N ciclos, e a diferença fica registrada como dívida.

### Pré-requisito registrado

Para S2 ou S3, a instrumentação precisa ganhar recorte por ciclo. A forma
natural, seguindo o que já existe:

```text
feitos[id].ciclos['AAAA-MM'] = { n, v, suporte: { ... } }
```

Isso cresce o documento: sete contadores por mês por avatar. Uma alternativa
mais barata é guardar por ciclo apenas um contador — "partidas de fila em que
este avatar fez suporte efetivo" — que é o dado de que S3 realmente precisa.
**Nenhuma das duas é feita nesta etapa.**

---

## 14. Jovens excepcionais

```text
idade  não é requisito
nível  não é requisito
fase   não é requisito
```

Nenhuma condição deste documento lê idade, nível ou fase. Um avatar jovem pode
construir evidência de Legendary.

E a divisão não é um obstáculo: um avatar de nível baixo joga em `jovem`, contra
ranks de `jovem`, numa escada que começa em 1000 e decai como as outras. Um
`L_pico` em `jovem` é tão difícil quanto em `anciao` (seção 12).

**A distinção que importa:**

| o que se quer | o que não se quer |
|---|---|
| não bloquear por idade | Legendary instantâneo por uma partida |

A primeira é garantida porque idade não aparece em condição nenhuma.
A segunda é barrada porque `baseLegendary` exige N_L ciclos, e um ciclo é um
mês do relógio do servidor. Um avatar nascido hoje não pode ser Legendary
amanhã, por mais extraordinária que tenha sido a partida de hoje — não por ser
jovem, mas por a trajetória ainda não existir.

A dimensão temporal continua obrigatória, e é a única barreira à
instantaneidade. É também a única que nenhum jogador pode acelerar.

---

## 15. Neutralidade entre Feitio e Escola

A prova é por inspeção das variáveis. Nenhuma condição deste documento lê:

```text
taxa de vitória    dano    nível    Feitio    Escola    fase
```

Todas as variáveis são de três tipos só:

1. **contagens de partidas e vitórias verificadas pelo servidor** (`n`, `v`);
2. **chaves de calendário** (`ciclos`);
3. **rank de um adversário derrotado**, lido do documento dele antes da partida.

O critério se aplica igualmente a `G0 G1 G2 / L0 L1 L2 / S0 S1 S2`: nenhuma
combinação aparece em condição alguma, e nenhuma recebe limiar próprio.

> **Ressalva honesta, e é a razão de esta seção não terminar aqui.**
> Neutralidade da **regra** não é neutralidade do **resultado**. A etapa 3B
> mediu que a escola 1 domina o Lendário e que o eixo troca de papel no degrau
> 2. Uma combinação mais forte alcança um rank qualquer com menos partidas —
> logo alcança `L_pico` e `L_base` mais facilmente.
>
> A regra não privilegia ninguém. O **balanço** privilegia, e o exame herdaria
> isso. A correção pertence ao balanço, não ao exame: mudar o critério para
> compensar a escola 1 seria embutir no exame uma correção de balanço que o
> próprio exame não pode verificar. Fica como risco residual na seção 22-L.
> **Nenhuma alteração de balanceamento nesta etapa.**

---

## 16. Farming, critério por critério

| critério | classificação | por quê |
|---|---|---|
| `participacaoFila` (M) | **farmável diretamente**, limitado por energia | entrar na fila e perder já incrementa `n`. Cada partida custa 10 de energia, com mínimo de 20 para entrar; a energia volta com o tempo real. É limite de ritmo, não de possibilidade. |
| `vitoriasFila` (V) | **farmável com cúmplice** | o teto de 40 pontos de saldo por par por dia protege os **pontos**, não as vitórias. Duas pessoas combinadas produzem vitórias ao ritmo da energia. |
| `ciclosCompetitivos` (N) | **não acelerável** | o mês é do relógio do servidor em UTC. Nenhum dinheiro, nível, cúmplice, item ou tempo de tela compra um mês. É a única condição absolutamente inelástica do sistema. |
| `melhorAdversario` / `L_pico` | **farmável com cúmplice, caro e perecível** | medido na etapa 3I.6: com um cúmplice e o teto de 40/dia, chegar a 1400 leva cerca de dez dias de conluio — e a virada de temporada desfaz metade do caminho. Fabricar é possível; **sustentar** é o que custa. |
| `adversariosDistintos` (P) | **difícil de fabricar** | exige P **pessoas** distintas, não P avatares. A unidade é o `uid` (seção 2.5), medida contra os dez slots. P cúmplices são P pessoas reais a recrutar e manter. |
| suporte de fila (S) | **farmável diretamente**, limitado por energia | não exige vencer; curar numa derrota conta, e deve contar. O ritmo é o da energia. |
| suporte de amistosa | **farmável à vontade** com um amigo | e é por isso que mora em `pvp.amistosa.suporte`, campo separado que **o exame não lê**. A defesa é a separação de campo, não a economia. |
| amistosas | **farmáveis** | não dão rank, moeda nem ciclo. Custam energia e não produzem evidência alguma que o exame leia. |
| vida ativa | **farmável pelo tempo** | **não é critério, e esta especificação recomenda que nunca seja.** `vidaAtiva` mede permanência, não trajetória; um avatar guardado numa gaveta a acumula. |

### Como as três defesas funcionam juntas contra o conluio

Nenhum mecanismo novo é proposto. O que existe já se compõe:

```text
rank  (L_pico, L_base)  →  o cúmplice tem de ser FORTE
ciclos (N_L)            →  e a trajetória tem de atravessar MESES
distintos (P)           →  e tem de haver P PESSOAS, não P avatares
```

Multiplicadas, custam: recrutar P cúmplices; empurrar cada um acima de `L_base`
ao teto de 40 pontos de saldo por dia; **e refazer esse trabalho a cada
temporada**, porque `pvpRankAtual` corta metade da distância até 1000 na virada;
tudo isso espalhado por N_L meses, pagando energia em cada partida.

A propriedade que faz isso aguentar não é nenhum teto: é o rank **decair**. Um
pico fabricado derrete; um pico sustentado não. A etapa 3I.6 mediu que 2000
pontos viram cerca de 1500 no mês seguinte e 1250 no outro. Fabricar evidência
de Legendary não é uma despesa única — é uma assinatura.

E a composição é multiplicativa, não aditiva: o conluio precisa de **todas** as
três ao mesmo tempo, porque o Caminho A as conjuga com E.

---

## 17. Venda e compra

**O mérito pertence ao avatar.**

```text
vendedor → avatar → comprador
```

não reinicia:

```text
ciclos    vitórias    adversários    suporte    melhorAdversario    elegibilidade
```

Como é garantido: `feitos` é indexado pelo id do avatar, e a venda move a chave
inteira junto com ele. `api/comprar-avatar.js` grava um **marco**
(`FE.feitoMarco(..., 'venda')`) e **preserva** o resto. Preso por mutação na
etapa 3I.7: MUT=11 apaga os adversários na venda e três conferições falham.

A raridade segue o mesmo caminho: vive em `raridades[id]`, por avatar, e só
sobe. **Comprar um Rare mantém Rare.**

```text
o comprador pode continuar construindo evidência para Legendary
a compra não concede mérito novo
```

O marco existe justamente para que a história seja legível: quem olhar a ficha
vê que o avatar passou de mão, e vê as contagens no instante em que passou.
Comprar não produz um feito; comprar registra uma passagem.

---

## 18. Raridade não é pontuação

Está proibido, e não por gosto:

```text
score = ciclos * 10 + vitórias * 2 + rank * 0.1      ← NÃO
```

A razão é que uma soma ponderada permite **trocar** uma evidência por outra:
rank suficiente compra a falta de ciclos, volume compra a falta de largura. O
que o exame precisa afirmar não é "este avatar somou bastante" — é "estas coisas
aconteceram".

Toda a especificação é, por isso, um E de condições, com uma única disjunção
onde ela é intencional (os dois caminhos do Legendary):

```text
Rare      = temporal E participação E vitória
Legendary = temporal(maior) E participação E vitória E ( competitivo OU suporte )
```

Nenhuma condição pode ser satisfeita pelo excesso de outra.

---

## 19. Os quatro tipos de parâmetro

### Temporais

| símbolo | controla |
|---|---|
| `N_R` | ciclos com vitória necessários para **Rare** |
| `N_L` | ciclos com vitória necessários para **Legendary** (`N_L > N_R`) |

### De participação

| símbolo | controla |
|---|---|
| `M` | partidas de fila mínimas |
| `V` | vitórias de fila mínimas — **só significa algo se `V > N`** (seção 4) |

### Competitivos

| símbolo | controla |
|---|---|
| `P` | adversários distintos qualificados (por `uid`) |
| `L_base` | rank mínimo para um adversário **contar** para P |
| `L_pico` | rank mínimo do **recorde** (`L_pico > L_base`) |

### De suporte

| símbolo | controla |
|---|---|
| `S_pv` | PV restaurados mínimos (`curaPv`, de fila) |
| `S_lim` | limpezas efetivas mínimas |
| `S_prot` | interceptações efetivas mínimas |

**Dez parâmetros, e isso é muito.** Três podem cair sem perda de estrutura:

- `V`, se a etapa dos números não escolher `V > N_R`;
- `L_pico`, se ela preferir a formulação A1 à A2;
- um de `S_lim` / `S_prot`, se o Caminho B for simplificado.

Convém registrar que cada parâmetro a mais é um número que precisa ser
defendido com dados. Sete é um alvo melhor que dez.

---

## 20. Os dados que precisam ser observados antes dos números

Nada é coletado nesta etapa. O que a futura observação precisa medir, em
jogadores reais:

**Distribuições temporais**
- ciclos por avatar — quantos meses um avatar ativo realmente atravessa
- partidas por ciclo
- vitórias por ciclo
- fração de ciclos com `v = 0` (presença sem vitória) — calibra R2 contra R1

**Distribuições competitivas**
- `melhorAdversario.pontos` por avatar, por divisão
- número de adversários distintos por avatar
- **quantos jogadores distintos existem acima de cada rank candidato** — ver
  abaixo, é a observação mais importante da lista
- distribuição temporal dos adversários qualificados, **na medida em que o dado
  existir** (seção 11: é parcial por construção)

**Distribuições de suporte**
- `curaPv` por partida de fila, e por avatar
- fração de jogadores de fila que fazem **algum** suporte efetivo
- `limpeza` e `protegeuFez` por avatar
- relação entre suporte e vitória — se suporte alto acompanha vitória, o
  Caminho B pode ser redundante com o A

**Distribuições de neutralidade**
- por Feitio, por Escola, por divisão — para medir se a regra neutra produz
  resultado neutro (seção 15)

### O acoplamento que precisa ficar registrado

**`P` e `L_base` são acoplados, e os dois estão acoplados ao tamanho da
população.**

`P` não pode passar do número de jogadores **distintos** que existem acima de
`L_base`. Com um saguão de algumas dezenas de pessoas — que é o tamanho real
disto por muito tempo — se apenas cinco jogadores estiverem acima de `L_base`,
então `P <= 5`, e qualquer `P` maior torna o Caminho A **impossível para
todos**, sem que ninguém tenha decidido isso.

Logo a etapa dos números não pode escolher `L_base` e `P` em separado. Precisa
olhar a distribuição conjunta: para cada `L_base` candidato, quantas pessoas
distintas ficam acima, e quantas delas um jogador ativo encontra de fato na fila
num ciclo. E precisa refazer essa escolha quando a população mudar de ordem de
grandeza.

Mesma observação, menor, para `S_pv`: se quase ninguém faz suporte, qualquer
`S_pv` fecha o Caminho B.

---

## 21. Os onze cenários da 3I.6, contra esta especificação

Sem números. "pode" significa que a estrutura não o impede; o que decide é o
parâmetro.

| | cenário | Rare | Leg. A | Leg. B | que evidência falta |
|---|---|---|---|---|---|
| **A** | muito ativo, poucas vitórias | **pode**, se as poucas vitórias estiverem espalhadas por `N_R` ciclos | não | não | vitórias contra fortes (A) ou suporte efetivo (B) |
| **B** | poucas partidas, derrotou um forte | **não** — falta `M` e falta espalhamento | **não** — um forte não é `P` fortes | não | participação, ciclos e largura de adversários |
| **C** | muitas vitórias contra iniciantes | **pode** | **não** — nenhum adversário acima de `L_base` | não | adversários qualificados |
| **D** | muitas vitórias contra o mesmo parceiro | **pode** — e é correto que possa: Rare é trajetória, não excelência | **não** — um `uid` conta uma vez | não | `P−1` pessoas distintas |
| **E** | centenas de amistosas | **não** | **não** | **não** | tudo: a amistosa não escreve ciclo, não dá rank, e o suporte dela mora em campo separado que o exame não lê |
| **F** | suporte alto, poucas vitórias | **pode**, se as poucas vitórias cobrirem `N_R` ciclos | não | **pode**, se também cobrir `N_L` ciclos | o Caminho B não dispensa a base: `N_L` ciclos com vitória |
| **G** | jovem excepcional | **pode** — idade não entra em condição alguma | **pode**, com tempo | **pode**, com tempo | só tempo: `N_R`/`N_L` ciclos. Nada mais o barra |
| **H** | antigo sem desempenho | **não** — ciclos sem vitória não contam em R2 | não | não | vitórias. Idade não é evidência |
| **I** | vendido várias vezes | **pode** — o mérito é do avatar e atravessa a venda | **pode** | **pode** | nada por causa da venda; ela só acrescenta um marco |
| **J** | Rare comprado | **mantém Rare** | **pode** — o comprador continua construindo | **pode** | a compra não concede mérito; só o que o comprador acrescentar conta |
| **K** | todas as 9 combinações | **pode**, todas | **pode**, todas | **pode**, todas | nenhuma combinação aparece em condição alguma. Ressalva de resultado na seção 15 |

Dois cenários merecem nota:

**D não é um furo.** Um avatar que venceu muito o mesmo parceiro **deve** poder
ser Rare: Rare é "trajetória competitiva significativa e deliberada", e não
excelência. É no Legendary que a largura passa a ser exigida, e lá o `uid` único
a barra.

**F é o teste do Caminho B, e ele passa.** Suporte alto com poucas vitórias
chega a Legendary **somente** se as vitórias cobrirem `N_L` ciclos. Sem a base,
o Caminho B seria Legendary sem nunca vencer. Com a base (seção 8), não é — e
sem nenhum parâmetro extra.

---

## 22. ESPECIFICAÇÃO FORMAL

### A. Variáveis observáveis

```text
participacaoFila        = feitos[id].pvp.fila.n
vitoriasFila            = feitos[id].pvp.fila.v
ciclosComParticipacao   = | { c : feitos[id].ciclos[c].n > 0 } |
ciclosComVitoria        = | { c : feitos[id].ciclos[c].v > 0 } |
vencidos                = feitos[id].pvp.fila.vencidos    (ordenada, desc. por pontos)
melhorAdversario        = feitos[id].pvp.fila.melhorAdversario
                          (DERIVADO: pontos === vencidos[0].pontos)
suporte                 = feitos[id].pvp.fila.suporte
    efetivos:   curaPv, cura, limpeza, protegeuFez
    não usar:   beneficio, guardaAliado, protegerTentou
```

Nunca: `pvp.amistosa.*`, PvE, nível, fase, idade, Feitio, Escola, dano, taxa de
vitória, `vidaAtiva`.

### B. Rare

```text
Rare =
    participacaoFila  >= M
AND vitoriasFila      >= V          (só significativo se V > N_R)
AND ciclosComVitoria  >= N_R
```

### C. Legendary

```text
Legendary =
    participacaoFila  >= M
AND vitoriasFila      >= V
AND ciclosComVitoria  >= N_L        (N_L > N_R)
AND ( caminhoA OR caminhoB )
```

Legendary implica Rare.

### D. Legendary — caminho A

```text
caminhoA =
    vencidos[0].pontos                            >= L_pico
AND | { v em vencidos : v.pontos >= L_base } |     >= P

com  L_pico > L_base   e   P << FEITO_VENCIDOS_MAX
```

Lê `vencidos`, nunca `melhorAdversario` (evita contar a mesma prova duas vezes).

### E. Legendary — caminho B

```text
caminhoB =
    suporte.curaPv  >= S_pv
AND ( suporte.limpeza >= S_lim  OR  suporte.protegeuFez >= S_prot )
```

Sempre de `pvp.fila.suporte`.

### F. Semântica dos ciclos

```text
ciclo              = mês do calendário em UTC (pvpTemporada), 'AAAA-MM'
instante           = fechamento da partida
cada ciclo conta   uma vez, independentemente do número de partidas
chave inexistente  = ciclo não conta
ciclo com n>0, v=0 = participação sem vitória: NÃO conta para N
só a fila          escreve ciclo
ciclo == temporada do rank (a mesma função nomeia os dois)
sem tolerância de fuso, sem carência de virada
```

### G. Semântica dos adversários distintos

```text
unidade            = uid do JOGADOR (nunca avatarId)
entram             somente vitórias, somente fila
multiplicidade     cada uid ocupa uma posição, para sempre
valor da posição   o MAIOR rank pré-partida em que aquele uid foi derrotado
mesmo uid em N ciclos = 1 adversário distinto
lotação            é limite de armazenamento, NUNCA requisito de mérito
perda conhecida    a substituição por rank maior apaga o ciclo do primeiro
                   encontro: a distribuição temporal é parcial
```

### H. Semântica do rank

```text
origem             documento do adversário, lido pelo servidor ANTES da partida
nunca              do cliente, nunca pós-partida
comparação         dentro da própria divisão
conversão          nenhuma; não existe escala global
neutralidade       as três divisões usam a mesma escada (1000, mesmo K, mesma
                   zeragem parcial), logo um limiar único já é neutro
perecibilidade     cai metade da distância até 1000 em cada temporada nova —
                   é o que faz do limiar uma defesa que se sustenta
divisão registrada preservada por entrada, no instante da partida
mudança de divisão NÃO recalcula, NÃO converte, NÃO invalida evidência anterior
```

### I. Semântica do suporte

```text
origem             eventos da partida REFEITA pelo servidor (pvpSuporteSomar)
em si próprio      nunca conta (e.quem === e.alvo é descartado)
sala               somente fila; a amistosa fica em campo separado

efetivos           curaPv       PV restaurados de verdade (curou > 0)
                   cura         curas com efeito > 0
                   limpeza      um estado foi REMOVIDO (fuTirarEstado verdadeiro)
                   protegeuFez  a interceptação ACONTECEU

não efetivos       beneficio       o mapa de efeitos mudou — mudou ≠ importou
                   guardaAliado    ação sem resultado
                   protegerTentou  declaração sem resultado

recorte temporal   NÃO EXISTE. Suporte é total por tipo de sala.
                   S2 e S3 são inverificáveis até isso mudar.
```

### J. Parâmetros que continuam indecididos

```text
N_R     ciclos com vitória para Rare
N_L     ciclos com vitória para Legendary          (N_L > N_R)
M       partidas de fila mínimas
V       vitórias de fila mínimas                   (só vale se V > N_R)
P       adversários distintos qualificados         (P << FEITO_VENCIDOS_MAX)
L_base  rank mínimo para contar para P             (acoplado a P e à população)
L_pico  rank mínimo do recorde                     (L_pico > L_base)
S_pv    PV restaurados mínimos
S_lim   limpezas efetivas mínimas
S_prot  interceptações efetivas mínimas
```

Dez. Três são dispensáveis sem mudar a estrutura: `V` (se não for > N_R),
`L_pico` (se A1 for escolhido em vez de A2), e um de `S_lim` / `S_prot`.

### K. Dados necessários para escolher os parâmetros

```text
1  ciclos por avatar; partidas e vitórias por ciclo
2  fração de ciclos com v = 0
3  melhorAdversario.pontos por avatar e por divisão
4  adversários distintos por avatar
5  QUANTOS JOGADORES DISTINTOS existem acima de cada L_base candidato,
   e quantos deles um jogador ativo encontra na fila num ciclo
   → P e L_base NÃO podem ser escolhidos em separado, e os dois dependem
     do tamanho da população
6  curaPv por partida e por avatar
7  fração de jogadores de fila que fazem algum suporte efetivo
8  limpeza e protegeuFez por avatar
9  relação entre suporte e vitória (o Caminho B pode ser redundante com o A)
10 distribuição por Feitio, Escola e divisão (neutralidade de RESULTADO)
```

### L. Riscos restantes — só os comprovados

**1. PvE não é evidência, e isso fecha uma porta.**
Dezoito payloads fabricados passaram pela validação real (etapa 3I.5). O
resultado chega num POST do cliente, sem semente, sem jogadas, sem id de
batalha. Consequência: **todo o exame depende do PvP de fila.** Quem não joga
PvP não tem caminho nenhum para Rare. Isso é uma decisão de desenho que esta
especificação assume, e não um detalhe técnico.

**2. A distribuição temporal dos adversários é parcial.**
A substituição por rank maior apaga o ciclo do primeiro encontro (seção 2.5).
Qualquer modelo que queira "P adversários espalhados por K ciclos" precisa de
instrumentação nova antes.

**3. O suporte não tem recorte por ciclo.**
S2 e S3 são inverificáveis. O Caminho B herda a distribuição temporal da base, o
que não é a mesma coisa.

**4. `beneficio` conta aplicação, não utilidade.**
Um `defesaMinima: 12` num aliado com Defesa 20 muda o mapa e não ajuda. Por isso
está fora dos limiares. Se um dia entrar, precisa de portão de utilidade no
motor, não de ajuste no exame.

**5. Neutralidade da regra não é neutralidade do resultado.**
A etapa 3B mediu a escola 1 dominando o Lendário. Uma combinação mais forte
alcança `L_base` com menos partidas. A regra não privilegia; o balanço
privilegia, e o exame herda. **A correção pertence ao balanço.**

**6. `P` e `L_base` podem fechar o Caminho A sem ninguém decidir isso.**
Se poucos jogadores existirem acima de `L_base`, `P` fica impossível. Com uma
população pequena, isso é fácil de acontecer por acidente. Ver K-5.

**7. A virada de ciclo é em UTC.**
Coerente em todo o sistema, invisível no manual. Uma vitória às 23h do dia 31 em
Brasília cai no mês seguinte. Dívida de documentação, visível ao jogador.

**8. Nenhum número foi validado com jogadores reais.**
Não existem jogadores reais ainda. Todo parâmetro escolhido antes dos dados seria
chute, e um chute aqui decide quem chega a Lendário.

---

## 23. O que esta etapa NÃO fez

```text
não implementou o exame
não criou função de exame
não criou promoção automática
não escolheu nenhum limiar
não criou pontuação agregada
não criou mecanismo anti-farm novo
não alterou raridade, combate, IA, magia, Feitio, Escola, nível, fase
não alterou rank, matchmaking, Firestore
não fez balanceamento
não fez commit nem push
```

Nenhuma linha de lógica de produção foi tocada. O único arquivo criado é este
documento.
