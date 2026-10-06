# ESPECIFICAÇÃO DO EXAME DE RARIDADE

> **Etapa 3I.11.** Especificação e auditoria. Não implementa o exame, não
> promove ninguém, não altera código de produção.
>
> **A etapa 3I.13 implementou o que está aqui**, sem mudar número nenhum:
> `rarExaminar` e `rarCertificar` em [js/raridades.js](../js/raridades.js),
> e o caminho server-side em [api/_certificar.js](../api/_certificar.js).
> As seções que diziam "não existe rotina" estão anotadas abaixo.
>
> O objetivo é que a etapa seguinte possa implementar sem tomar nenhuma
> decisão conceitual nova. Onde isso não foi possível, há uma **pendência**
> ou um **bloqueador** nomeado, e não um palpite.
>
> Antecessores: [exame-de-raridade.md](exame-de-raridade.md) (estrutura, 3I.8)
> e [calibracao-exame-raridade.md](calibracao-exame-raridade.md) (números,
> 3I.10).

---

## 1. OBJETIVO

Responder, sem ambiguidade, a duas perguntas:

> Dado qualquer estado histórico de um avatar, exatamente quais evidências o
> fazem cumprir Rare ou Legendary?

> Uma vez certificada a raridade, quais fatos posteriores podem ou não alterar
> essa certificação?

A resposta à primeira está na seção 4. A da segunda está na seção 11, e é
**nenhum** — com a demonstração na seção 10.

---

## 2. DEFINIÇÕES

Três coisas diferentes, e confundi-las é a origem de quase todo erro possível
aqui:

| termo | o que é | onde vive |
|---|---|---|
| **Evidência** | os fatos históricos que o servidor viu e gravou | `feitos[idAvatar]` |
| **Elegibilidade** | o resultado de aplicar o exame à evidência. Uma função pura, recalculável a qualquer momento | não é gravada |
| **Certificação** | o registro oficial de `Comum → Raro` ou `Raro → Lendário` | `raridades[idAvatar]` |

A elegibilidade é derivada e descartável. A certificação é **persistente e
irreversível**. A seção 11 trata da segunda; a seção 10 demonstra por que a
primeira nunca regride.

---

## 3. FONTE DE EVIDÊNCIA

### O que o exame lê

```text
feitos[idAvatar].ciclos['AAAA-MM'].v          vitórias de fila naquele mês
feitos[idAvatar].pvp.fila.vencidos[].uid      o JOGADOR derrotado
feitos[idAvatar].pvp.fila.vencidos[].pontos   o rank dele ANTES da partida
```

Três campos. Nada mais.

### O que o exame NÃO lê — e isto é normativo

```text
Feitio          Escola          nível           fase
idade           totalSecs       vidaAtiva       XP
vínculo         taxa de vitória volume total    PvE
amistosas       rank atual do avatar            rank atual do adversário
raridade atual  melhorAdversario                pvp.amistosa.*
```

`melhorAdversario` está nesta lista de propósito: ver a seção 6.

### Quem escreve a evidência

Um escritor só, e é servidor: `aplicarNoJogador` em
[api/pvp.js](../api/pvp.js), chamado por `aplicarPremios`, chamado por
`fecharSala`, **depois** de `pvpRepetir` refazer a partida inteira a partir da
semente e da lista de jogadas.

```text
partida de fila → fecharSala (transação RTDB, fecha uma vez só)
                → aplicarPremios
                → pvpRepetir (o servidor REFAZ a luta)
                → aplicarNoJogador (transação Firestore)
                → feitoPvp (js/feitos.js)
```

O cliente não tem endpoint para declarar um feito, e `feitos` está em
`camposDoServidor()` no [firestore.rules](../firestore.rules) — a escrita do
cliente é recusada por inteiro.

---

## 4. AS FÓRMULAS

### Rare

```text
R(feitos) = | { c ∈ feitos[id].ciclos : feitos[id].ciclos[c].v > 0 } |

Rare(feitos)  ⟺  R(feitos) >= 3
```

> O avatar venceu **ao menos uma partida de fila em três meses diferentes**.

### Legendary

```text
A(feitos) = | { v.uid : v ∈ feitos[id].pvp.fila.vencidos
                        ∧ v.pontos >= 1150 } |

Legendary(feitos)  ⟺  R(feitos) >= 5  ∧  A(feitos) >= 3
```

> O avatar venceu em **cinco meses diferentes** e derrotou **três pessoas
> diferentes** que valiam **1150 pontos ou mais** no momento da derrota.

### A assinatura

```text
examinarRare(feitos)      -> boolean
examinarLegendary(feitos) -> boolean
```

Funções **puras**: mesma evidência, mesmo resultado, sempre. Sem relógio, sem
estado externo, sem consulta a outro documento.

### O que foi eliminado por redundância, e fica registrado

| eliminado | por quê |
|---|---|
| `vitoriasFila >= V` | `R >= 3` implica 3 vitórias. Só acrescentaria com V > 3, e nada nos dados pede isso (3I.10 §5) |
| `P_R` (piso de partidas) | corta zero com atividade normal; acima de 5 corta jogadores legítimos de baixa atividade (3I.10 §5) |
| `melhorAdversario >= L` | `melhorAdversario.pontos === max(vencidos[].pontos)` (3I.8). Seria o mesmo fato duas vezes |
| `L_pico` separado | com `A_Q = 3` acima de `A_P`, o pico vem de graça da amplitude |

### Exemplo (o da etapa)

```text
2026-01 → 2 vitórias      conta 1 ciclo
2026-02 → 0               não conta
2026-03 → 1 vitória       conta 1 ciclo
2026-04 → 4 vitórias      conta 1 ciclo
2026-05 → 0               não conta
2026-06 → 1 vitória       conta 1 ciclo

R = 4  ⟹  Rare elegível.  (Legendary exige 5: ainda não.)
```

---

## 5. O CICLO

### Definição

O ciclo é o **mês do calendário em UTC**, pelo `pvpTemporada`
([js/pvp-rank.js:136](../js/pvp-rank.js)):

```js
d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0')
```

Chave `'AAAA-MM'`, validada na escrita e na leitura por
`FEITO_CICLO_RE = /^\d{4}-(0[1-9]|1[0-2])$/`.

**O ciclo é a temporada do rank.** A mesma função nomeia as duas coisas, e isso
não é coincidência: "atravessar N ciclos" significa literalmente "sobreviver a
N−1 zeragens parciais de rank".

### As regras, uma a uma

```text
v > 0 basta                 duas vitórias no mês contam o mesmo que uma
uma vitória, um ciclo       nunca abre dois
um mês, uma chave           é um mapa: duplicar é estruturalmente impossível
só a fila escreve ciclo     o guard é `tipo === 'fila'` em feitoPvp
o ciclo vem de FORA         feitoPvp recebe-o; não sabe que dia é hoje
quem o calcula é o servidor `RK.pvpTemporada(agora)`, api/pvp.js:638
`agora` é Date.now()        do servidor, nunca do corpo do pedido
a virada é UTC              sem tolerância de fuso, sem carência
não há substituto           vitórias totais NÃO substituem contagem de ciclos
```

### O mês é o do FECHAMENTO, não o do jogo

O `ciclo` é calculado em `aplicarPremios` com `Date.now()` — isto é, no instante
em que a sala **fecha**, não em que a luta começou. Consequência medida:

| instante do fechamento | ciclo |
|---|---|
| 31/05 23:59:59.999 UTC | `2026-05` |
| 01/06 00:00:00.000 UTC | `2026-06` |
| 31/05 23:00 em Brasília (UTC−3) | **`2026-06`** |
| 01/06 00:00 em Tóquio (UTC+9) | **`2026-05`** |

Uma vitória às 23h do dia 31 em Brasília cai no mês seguinte. É coerente em
todo o sistema (o rank usa a mesma função) e **continua ausente do manual** —
dívida de documentação, visível ao jogador.

### Quando a evidência de um ciclo fica final

Quase sempre na própria virada, com uma janela estreita: `varrerSalas` fecha
salas abandonadas `SALA_VELHA_MS = 1 hora` depois do fim
([api/pvp.js:367](../api/pvp.js)). Uma sala abandonada a 31/05 e varrida a
01/06 escreve em `2026-06`.

```text
o ciclo M fica final  ≈  1 hora depois de 00:00 UTC do 1.º de M+1
```

Em termos práticos isto não importa, porque `R(feitos)` só cresce (seção 10) e
a certificação é idempotente (seção 17): rodar cedo nunca é errado, só
prematuro.

---

## 6. O ADVERSÁRIO

### A unidade é o UID DO JOGADOR

```text
distinct(vencidos[].uid)      ← o jogador
NÃO  distinct(avatarId)       ← o avatar
```

Medido na 3I.7: um jogador roda até `MAX_SLOTS = 10` avatares. Pelo `avatarId`,
**um** cúmplice valeria por **dez** adversários distintos; pelo `uid`, vale por
**um**. É também a unidade do teto anti-conluio que já existia
(`rankPares.<uid>`), de modo que as duas defesas contam a mesma coisa.

Verificado no cenário K (seção 18): seis ciclos e dez vitórias contra dez
avatares do mesmo dono dão **1** adversário relevante, e Legendary é recusado.

### A ordem das operações

A deduplicação acontece **na estrutura**, antes de qualquer filtro: cada `uid`
ocupa uma posição única em `vencidos`, para sempre, e o valor guardado é o
**maior** rank pré-partida em que aquele `uid` foi derrotado. Logo:

```text
A(feitos) = | { v ∈ vencidos : v.pontos >= 1150 } |
```

já é uma contagem de uids distintos — não há dedup a fazer no exame.

### Exemplo (o da etapa)

```text
o avatar venceu:   uid A a 1200      uid A a 1300
                   uid B a 1180      uid C a 1160      uid D a 1000

o `vencidos` guarda:   A → 1300   (o maior dos dois)
                       B → 1180   C → 1160   D → 1000

acima de 1150:         A, B, C  =  3 adversários relevantes
```

Três, e não quatro. O D não qualifica; o A conta uma vez.

### `melhorAdversario` não é uma segunda evidência

A 3I.8 provou que `melhorAdversario.pontos === max(vencidos[].pontos)` — a
lista está ordenada por pontos decrescentes e a expulsão remove sempre o mais
fraco, logo o mais forte nunca é expulso.

**Normativo: o exame lê `vencidos` e nunca `melhorAdversario`.** Ler os dois
seria contar o mesmo fato duas vezes. O campo continua a existir como
conveniência de leitura e exibição.

---

## 7. O SNAPSHOT DE RANK

`1150` compara-se contra `v.pontos`, que é o rank do adversário **no instante
em que a vitória foi verificada pelo servidor** — lido do documento dele
**antes** da partida, em [api/pvp.js:613](../api/pvp.js).

```text
NÃO usar:   rank atual do adversário
            maior rank futuro dele
            rank depois da partida
            rank depois da virada de temporada
            rank recalculado por qualquer motivo
```

O valor é um **retrato imutável**. Nada no sistema o reescreve: `vencidos[i]` só
é substituído pela mesma função de escrita, e só para cima, e só pelo mesmo
`uid` numa vitória posterior.

Verificado nos cenários R e S (seção 18): o rank do adversário subir ou cair
depois da vitória **não altera** a evidência, porque a evidência não aponta
para o documento dele — contém uma cópia.

### Por que 1150, em linguagem humana

A 1000 contra 1000 uma vitória vale +12 pontos. Logo **1150 é "cerca de doze
vitórias líquidas acima da linha de partida"** — e, porque a virada de
temporada corta metade do caminho de volta aos 1000, doze vitórias líquidas
*recentes*. A definição não depende de população: depende da aritmética do
jogo.

A 3I.10 mediu que, de 20 a 1000 jogadores a 30 lutas por ciclo, **ninguém
chega a 1400**: o máximo observado foi 1271–1325. Os limiares da intuição do
xadrez não existem neste jogo.

---

## 8. COMO `vencidos` SE COMPORTA

Auditoria completa da estrutura, que é o que a seção 8 da etapa pediu:

| aspecto | comportamento |
|---|---|
| teto | `FEITO_VENCIDOS_MAX = 24` |
| uid repetido | atualiza a posição existente **só se** o rank novo for maior |
| lista cheia | substitui **o mais fraco**, e só se o novo for mais forte |
| ordenação | por pontos decrescentes, a cada escrita |
| venda | o registro acompanha o avatar, passando pelo saneador |
| compra | idem; nada é recalculado |
| virada de ciclo | **nenhum efeito**: `vencidos` não é por ciclo |
| retry de transação | valor absoluto recalculado da base relida: idempotente |

A regra, literal ([js/feitos.js:607](../js/feitos.js)):

```js
const i = lista.findIndex(x => x.uid === uid);
if (i !== -1) {
  if (entrada.pontos > lista[i].pontos) lista[i] = entrada;
} else if (lista.length < FEITO_VENCIDOS_MAX) {
  lista.push(entrada);
} else if (entrada.pontos > lista[lista.length - 1].pontos) {
  lista[lista.length - 1] = entrada;
}
lista.sort((x, y) => y.pontos - x.pontos);
```

---

## 9. O LIMITE DE 24 NÃO É UM REQUISITO

```text
FEITO_VENCIDOS_MAX = 24     é limite de ARMAZENAMENTO
A_Q = 3                     é o requisito do exame
```

O 24 existe porque um documento do Firestore tem 1 MiB e `vencidos` guarda
~100 bytes por entrada. **Nenhum critério lê esse número**, e nenhum parâmetro
do exame pode ser escolhido perto dele — senão a lotação passa a ser a regra
sem ninguém ter decidido isso.

Com `A_Q = 3` e teto 24 há folga de 8×. A consequência do teto é outra, e
está na seção seguinte.

---

## 10. O PROBLEMA DA EVIDÊNCIA MUTÁVEL — RESOLVIDO

A etapa colocou a pergunta certa:

> Se um avatar já cumpriu 3 adversários distintos ≥ 1150 e depois um desses
> registros sair de `vencidos` pelo limite técnico, ele **(A)** deixa de ser
> elegível, ou **(B)** a evidência fica congelada?

### A resposta é B, e não precisa de mecanismo nenhum

**Teorema.** Para qualquer limiar L, a contagem
`|{ v ∈ vencidos : v.pontos >= L }|` é monotonicamente **não decrescente** ao
longo de qualquer sequência de escritas.

**Demonstração.** A lista é mantida ordenada por pontos decrescentes. Três
casos, que são os únicos:

1. **uid já presente.** A entrada é substituída só se `entrada.pontos >
   lista[i].pontos`. Os pontos daquele uid só sobem. Uma entrada pode cruzar de
   baixo de L para cima; nunca o contrário.
2. **uid ausente, lista não cheia.** `push`. A contagem sobe 1 se a entrada
   nova for ≥ L, e fica igual se não.
3. **uid ausente, lista cheia.** Substitui `lista[length-1]`, que é **o mais
   fraco**, e só se `e > w` onde `w` são os pontos do mais fraco.
   - Se `w < L`: a entrada removida não contava. A contagem sobe 1 ou fica igual.
   - Se `w >= L`: como `w` é o mínimo da lista, **todas** as 24 entradas são
     ≥ L, logo a contagem é 24. Depois da troca, `e > w >= L`, logo continuam
     24. A contagem fica igual.

Em nenhum caso a contagem desce. ∎

### Verificado por força bruta

2005 sequências, incluindo as adversariais:

| sequência | resultado |
|---|---|
| 60 distintos, cada um mais forte | 0 quebras |
| 60 distintos, cada um mais fraco | 0 quebras |
| **3 fortes, depois 300 fracos tentando entrar** | **3 → 3**: os fracos não expulsam os fortes |
| 2000 sequências aleatórias (40 uids, pontos 800–1600) | 0 quebras |
| 10 vendas seguidas, passando pelo saneador | intacto |
| retry: 10 voltas da mesma base, lista cheia | resultado idêntico |

**Conclusão: a opção B está satisfeita por construção.** A próxima etapa **não
precisa** criar marco de certificação persistente para o Caminho A, nem
aumentar o 24.

### Mas é um invariante a nomear, não um acidente a confiar

A propriedade depende de três coisas na regra de inserção:

```text
a) a atualização de um uid existente só SOBE
b) a expulsão remove o MAIS FRACO (lista[length-1])
c) a lista está ordenada por pontos decrescentes
```

Trocar (b) por FIFO quebra tudo imediatamente. Medido no mesmo cenário:

```text
com "expulsa o mais fraco":   3 fortes → 3    (a certificação resiste)
com FIFO:                     3 fortes → 0    (a certificação evapora)
```

**Obrigação para a próxima etapa:** escrever um teste de invariante que falhe se
a política de expulsão mudar. Hoje a monotonia é verdadeira mas não está presa
por teste — é a única propriedade crítica do exame nessa situação.

### E `ciclos` é monotônico por outra razão

`ciclos` **não tem teto**. A etapa 3I.9 limitou apenas o sub-objeto `suporte`
aos 24 ciclos mais recentes; o `{ n, v }` de todos os ciclos sobrevive, e foi
uma decisão explícita precisamente para não transformar um limite de
armazenamento no requisito temporal. Logo `R(feitos)` é exato para sempre.

Com uma nota de longo prazo: isso é crescimento sem teto. Um avatar de dez anos
teria 120 chaves de ~15 bytes = 1,8 KB. Não é um problema hoje; é um número a
vigiar.

---

## 11. A CERTIFICAÇÃO

### O que já existe

`rarPromover(reg, para, por, agora)` em [js/raridades.js](../js/raridades.js)
é o único caminho de promoção, e já implementa as regras. Medido:

| tentativa | resultado |
|---|---|
| `Comum → Raro` | permite; histórico fica com `Raro` |
| `Comum → Lendário` | **permite**; histórico fica **só** com `Lendário` |
| `Raro → Lendário` | permite |
| `Raro → Raro` | **recusa** · `JA_TEM` |
| `Lendário → Lendário` | **recusa** · `JA_TEM` |
| `Lendário → Raro` | **recusa** · `NAO_DESCE` |

### As propriedades que isso garante

Uma vez certificada, a raridade:

```text
não desaparece porque o rank caiu
não desaparece porque a temporada virou
não depende do rank atual
não depende do estado atual de `vencidos`
não é revertida por falta de atividade
não sofre downgrade
```

As três primeiras são consequência de a certificação viver em
`raridades[id].atual`, que nada reescreve para baixo. As duas últimas são
`NAO_DESCE` e `JA_TEM`.

### A resposta à segunda pergunta do objetivo

> Quais fatos posteriores podem alterar uma certificação já obtida?

**Nenhum.** Nem a queda de rank, nem a virada de temporada, nem a inatividade,
nem a venda, nem a expulsão de uma entrada de `vencidos` (seção 10), nem uma
nova execução do exame (seção 17).

---

## 12. QUANDO O EXAME PODE SER CERTIFICADO

### Não é competição

```text
sem quota            sem top X%            sem número máximo
sem disputa direta   sem superar outro avatar
```

Se 0 avatares atingem o critério, 0 são promovidos. Se 100 atingem, 100 são
elegíveis. Nenhuma condição lê a posição de ninguém.

### A janela

| pergunta da etapa | resposta |
|---|---|
| quando começa uma temporada nova | 00:00:00.000 UTC do 1.º de cada mês (`pvpTemporada`) |
| quando a evidência de um ciclo fica encerrada | ≈1 h depois da virada, pelo `SALA_VELHA_MS` (seção 5) |
| quando o avatar se torna elegível | no instante em que a escrita da vitória que completa o critério é confirmada |
| quando a certificação pode rodar | **a qualquer momento depois**: `R` e `A` só crescem, logo rodar cedo nunca é errado, só prematuro |
| exatamente na virada ou depois | **depois**, por ≥1 h, para não apanhar um ciclo que ainda recebe escritas de salas varridas |
| avatar criado perto da virada | **sem caso especial**. Tem menos ciclos, e pronto. Um avatar nascido a 31/05 que vence a 01/06 tem o ciclo `2026-06` |
| vitória segundos antes/depois da virada | cai no mês UTC do **fechamento** (seção 5). Sem tolerância |
| rotina rodar duas vezes | **idempotente**: a segunda chamada recebe `JA_TEM` e não escreve |

### A rotina existe; o gatilho não  ·  atualizado na 3I.13

`api/_certificar.js` escreve em `raridades`, dentro de uma transação, depois
de ler os feitos do documento. O que continua a não existir é **quem o
chama**: não há cron, nem agendamento, nem endpoint, nem botão.

É deliberado. O exame não se pede — a raridade não é um requerimento que se
protocola, é um fato que o servidor constata. O gatilho (o ciclo mensal) é
etapa própria, e já só precisa de chamar `certificarJogador`.

---

## 13. OS ESTADOS

```text
Comum       nasce assim, sempre, sem exceção (3H)
Raro        certificado quando R >= 3
Lendário    certificado quando R >= 5 ∧ A >= 3
```

### Rare não é nível

```text
nível 40 ≠ Rare           Rare ≠ nível
nível 40 ≠ Lendário       Lendário ≠ nível
```

O avatar cumpre ou não cumpre independentemente de nível, idade, fase, Feitio e
Escola — nenhum deles aparece em condição alguma (seção 15).

### Jovem excepcional

Decisão mantida: **um avatar jovem pode ter desempenho excepcional, mas não
pode ignorar o requisito temporal.**

```text
criado em janeiro · vence em janeiro, fevereiro e março  →  Rare
```

E chega a Rare **porque atravessou três ciclos**, não porque é bom. Não existe
atalho por rank, por quantidade de vitórias, por adversário muito forte nem por
nível alto. Verificado no cenário G: dez ciclos com um adversário a 1400 **não**
dão Legendary; faltam-lhe dois adversários relevantes.

O inverso também é verdade e está medido: quatro adversários acima de 1150 em
três meses não dão Legendary — faltam dois meses. A dimensão temporal é a única
barreira à instantaneidade, e a única que nenhum jogador pode acelerar.

### Common → Legendary

`R >= 5` implica `R >= 3`, logo todo Legendary satisfaz Rare. Um avatar Comum
pode satisfazer Legendary diretamente, e `rarPromover` permite o salto numa só
chamada.

**Pendência de implementação (seção 20, item 1):** registrar `Raro` e `Lendário`
na mesma certificação (duas chamadas, dois itens de histórico com o mesmo
instante) ou só `Lendário` (uma chamada, um item)? A arquitetura permite as
duas. Não é decidido aqui.

---

## 14. PATH B — SUPORTE: DESABILITADO

```text
PATH B = DESABILITADO / NÃO DISPONÍVEL PARA CERTIFICAÇÃO
```

Nenhum limiar de cura, nenhum requisito de suporte em N ciclos, nenhum
parâmetro inventado.

A razão, medida no motor em **11 400 avatares-partida** (3I.10 §7):

| achado | número |
|---|---|
| `curaPv` depende de volume | correlação com partidas jogadas = **0,994** |
| Sustentação domina os dados | guarda e lâmina: **0,0** de cura, limpeza, curaPv |
| outras combinações têm zero suporte legítimo | 0,0% com suporte efetivo |
| `protegeuFez` é raro | **1 ocorrência em 11 400** (0,01%) |
| não há métrica de intensidade neutra | `limpa` só existe em magias de cura: há **uma** categoria, não três |
| um limiar criaria vantagem de Feitio | amplitude Leg-B entre as 9 combinações: **40,5 pp** |

E a prova aritmética: de `S_CURA` = 200 a 1500 a taxa de aprovação é **9,7% em
todos os valores**; de `N_S` = 1 a 5, **9,7% em todos**. Um parâmetro que não
muda o resultado em nenhum valor não é um parâmetro.

Qualquer limiar seria um **portão de feitio** (abaixo de ~4 300 passa 100% da
Sustentação e 0% dos outros) ou um **concurso de volume** (acima disso).

### O que o Path B precisa para voltar

Não são números; é motor e instrumentação:

1. **`danoMitigado` / `danoRedirecionado`** — a contribuição da Guarda é real e
   hoje invisível: `guardaAliado` conta a guarda *posta*, não o dano que ela
   evitou. Dívida listada desde a 3I.8.
2. **`protegeuFez` precisa acontecer** — 1 em 11 400 é a IA quase nunca escolher
   Proteger, ou o desvio quase nunca disparar.
3. **Uma métrica de suporte por partida** — a 3I.9 instrumentou o suporte por
   **ciclo**; falta o por **partida**, que é o que separaria intensidade de
   quantidade.

Com (1) e (3), o Path B volta a ser calibrável. Sem elas, não.

---

## 15. NEUTRALIDADE

### Prova por inspeção

Os predicados leem exatamente três coisas: contagens de vitória por ciclo, a
chave do mês, e o rank pré-partida de um adversário derrotado. Nenhuma consulta
direta ou indireta a:

```text
feitio    NÃO        nivel    NÃO        idade    NÃO
escola    NÃO        fase     NÃO        raridade NÃO
```

### Neutralidade da regra não é neutralidade do resultado

Esta distinção é normativa e precisa ficar registrada.

A 3I.10 mediu a amplitude entre as nove combinações, e separou sinal de ruído
crescendo a população:

| população | n por célula | amplitude Rare | amplitude Legendary |
|---|---|---|---|
| 900 | 100 | 18,0 pp | 7,1 pp |
| 2 700 | 300 | 12,9 pp | 4,3 pp |
| **9 000** | **1 000** | **4,0 pp** | **2,6 pp** |

A dispersão do Rare desaparece com a amostra: **era ruído**. Na Via A sobram
**2,6 pp**, que são reais — uma ordem de grandeza abaixo dos 16,9 pp que fizeram
a 3I.2 proibir a taxa de vitória como critério.

Os 2,6 pp vêm do balanço: a etapa 3B mediu a escola 1 a dominar o Lendário, e
uma combinação mais forte alcança 1150 com menos partidas.

**Qualquer diferença estrutural de resultado é tratada no balanceamento do jogo,
nunca adulterando o exame.** Compensar a escola 1 dentro do critério seria
embutir nele uma correção que ele próprio não pode verificar.

---

## 16. SEGURANÇA

### O cliente não determina nada disto

```text
vitória     ciclo     rank do adversário     uid do adversário
elegibilidade          raridade               certificação
```

As defesas, em ordem:

1. **`firestore.rules`** põe `feitos` e `raridades` em `camposDoServidor()`: a
   escrita do cliente é recusada por inteiro.
2. **O endpoint do PvP não aceita** `ciclo`, `temporada`, `mes`, `periodo`,
   `suporte`, `curaPv` nem nada equivalente no corpo do pedido — verificado por
   teste em `tools/testar-feitos.js`.
3. **O resultado sai do `pvpRepetir`**: o servidor refaz a luta a partir da
   semente e da lista de jogadas antes de gravar.
4. **O rank do adversário é lido pelo servidor** do documento dele, antes da
   partida.

O cliente pode pedir uma ação. Não pode declarar "cumpri o exame".

### Um achado importante sobre onde a defesa NÃO está

O cenário V testou um documento `feitos` forjado, com três adversários
inventados a 9999 pontos e cinco ciclos fabricados. **Ele passa os
predicados.** O saneador `feitoDe` valida a **forma** (uid é texto, pontos é
número finito positivo), não a **procedência**.

```text
a segurança do exame NÃO está nos predicados
está em `feitos` ser campo exclusivo do servidor
```

Isto é normativo para a implementação: **não adicionar validação de
plausibilidade aos predicados na esperança de que isso seja defesa.** Não é. A
defesa é a regra do Firestore mais o escritor único, e é lá que tem de ser
mantida. Um predicado que tentasse adivinhar se 9999 é plausível estaria
duplicando — mal — uma defesa que já existe em outro lugar.

---

## 17. IDEMPOTÊNCIA

### A evidência

Uma mesma partida nunca conta duas vezes, por duas camadas que já existem:

| camada | mecanismo |
|---|---|
| fechamento duplo de sala | transação RTDB em `fecharSala` sobre `estado`: `r.committed` é verdade exatamente uma vez |
| retry de transação Firestore | `aplicarNoJogador` relê o documento e escreve **valor absoluto recalculado**, não incremento. `feitoPvp` é pura sobre cópia funda |

É por isso que `feitos` **não** usa `FieldValue.increment`. Preso por mutação:
MUT=10 do conjunto 3I.9 devolve o suporte por referência e derruba 4
conferições.

### O exame

```text
mesma evidência + mesmo estado histórico = mesmo resultado
```

`examinarRare` e `examinarLegendary` são funções puras de um argumento. Sem
relógio, sem aleatoriedade, sem leitura externa.

### A certificação

`rarPromover` recusa `JA_TEM` para igual e `NAO_DESCE` para menor. Logo:

```text
rodar a rotina duas vezes   →  a segunda não escreve
reprocessar                  →  idem
refresh, repetição de chamada →  idem
compra/venda                 →  o registro viaja; não é recriado
```

### O que ficou garantido na 3I.13

A certificação é idempotente **como um todo**, e está medido: dez exames
seguidos sobre a mesma evidência escrevem uma vez e deixam um evento no
histórico. O `rarCertificar` devolve `JA_TEM` a partir do segundo, e o
`certificarAvatar` só grava quando `ok` é verdade.

A questão da seção 13 — registrar Raro e Lendário, ou só Lendário — foi
decidida: **só o que aconteceu**. Um Comum que já merece Lendário sobe num
salto e o histórico guarda um evento, `Comum → Lendário`. Não se inventa um
degrau por Raro que ninguém atravessou.

---

## 18. A MATRIZ DE CENÁRIOS

Verificada: os predicados foram implementados num script temporário e corridos
contra o `js/feitos.js` de verdade, com os registros montados partida a partida
pelo `feitoPvp`. A tabela é a saída dessa corrida.

| | cenário | ciclos | ≥1150 | Rare | Leg | motivo |
|---|---|---|---|---|---|---|
| **A** | 1 ciclo com vitória | 1 | 0 | não | não | `R=1 < 3` |
| **B** | 2 ciclos com vitória | 2 | 0 | não | não | `R=2 < 3`. Dois é o mínimo de "mais de um"; trajetória pede três |
| **C** | 3 ciclos com vitória | 3 | 0 | **SIM** | não | `R=3`. Rare não exige adversário forte |
| **D** | 5 ciclos, 2 adversários ≥1150 | 5 | 2 | SIM | **não** | `A=2 < 3` |
| **E** | 5 ciclos, 3 adversários ≥1150 | 5 | 3 | SIM | **SIM** | o caso mínimo de Legendary |
| **F** | 6 ciclos, 3 adversários ≥1150 | 6 | 3 | SIM | **SIM** | folga no tempo |
| **G** | 10 ciclos, 1 adversário ≥1150 | 10 | 1 | SIM | **não** | um pico não é amplitude. Tempo de sobra não compra adversários |
| **H** | 10 ciclos, 3 adversários todos a 1149 | 10 | **0** | SIM | não | `1149 < 1150`. O limiar é estrito |
| **I** | 3 ciclos + 200 amistosas contra 1500 | 3 | **0** | SIM | não | a amistosa escreve em `pvp.amistosa`, que o exame não lê |
| **J** | 5 ciclos + muito PvE | 5 | 3 | SIM | SIM | o PvE não escreve `feitos`: é irrelevante, nem ajuda nem atrapalha |
| **K** | 6 ciclos, mesmo UID com 10 avatares | 6 | **1** | SIM | **não** | **a defesa 10→1**: dez avatares de um dono são um adversário |
| **L** | já Rare, cumpre Rare outra vez | 4 | 0 | SIM | não | elegível, mas `rarPromover` recusa `JA_TEM`. Sem `Raro → Raro` |
| **M** | já Legendary | 6 | 3 | SIM | SIM | elegível, mas `JA_TEM`. Sem `Lendário → Lendário` |
| **N** | vendido depois de cumprir | 5 | 3 | SIM | SIM | o marco da venda é acrescentado; a evidência fica |
| **O** | comprado e revendido dez vezes | 5 | 3 | SIM | SIM | dez passagens pelo saneador, intacto |
| **P** | cumpriu, e 300 fracos tentam expulsar | 6 | **3** | SIM | SIM | **a expulsão remove o mais fraco**: a evidência resiste (§10) |
| **Q** | mesmo adversário com ranks diferentes | 5 | 3 | SIM | SIM | guarda o maior; conta uma vez |
| **R** | rank do adversário cai depois | 5 | 3 | SIM | SIM | a evidência é um retrato, não um ponteiro |
| **S** | rank do adversário sobe depois | 5 | 3 | SIM | SIM | idem |
| **T** | vitória 1 ms antes da virada UTC | 5 | 5 | SIM | SIM | cai no ciclo `2026-05` |
| **T2** | a mesma, 1 ms depois | 5 | 5 | SIM | SIM | cai no ciclo `2026-06`. Sem tolerância |
| **U** | 5 ciclos + vitória amistosa contra 1500 | 5 | **2** | SIM | **não** | o 1500 da amistosa não entra. `A=2 < 3` |
| **V** | documento forjado pelo cliente | 5 | 3 | **SIM** | **SIM** | **passa os predicados.** A defesa é o `firestore.rules`, não o saneador (§16) |

---

## 19. DADOS LEGADOS E MALFORMADOS

### Princípio

```text
dado inválido NUNCA cria elegibilidade
prefere-se  false  a assumir  true
```

### Verificado: 37 formas de corrupção

Nenhuma rebenta, e nenhuma cria elegibilidade — com **uma exceção nomeada**:

| categoria | casos testados | resultado |
|---|---|---|
| `feitos` ausente, null, texto, número, array | 5 | `R=0`, `A=0` |
| `ciclos` ausente, vazio, null, texto, array | 5 | `R=0` |
| `v` ausente, negativo, NaN, Infinity, objeto | 5 | `R=0` |
| chave de ciclo `'abc'`, `'2026-99'`, `'2026'`, `'__proto__'` | 4 | `R=0`; o protótipo do mapa fica intacto |
| `vencidos` ausente, null, texto, objeto | 4 | `A=0` |
| `uid` ausente, vazio, número, objeto | 4 | `A=0` |
| `pontos` ausente, negativo, NaN, Infinity | 4 | `A=0` |
| `uid` duplicado três vezes | 1 | `A=1` (dedup correto) |
| `vencidos` com `__proto__` | 1 | `A=0` |
| registro antigo sem os campos novos | 1 | lê-se; `R` correto; nenhum ciclo inventado |
| `pvp.amistosa` com 3 fortes | 1 | `A=0` na fila |

### A exceção, dita com todas as letras

`feitoDe` **coage texto numérico**: `c.v | 0` faz `'9' → 9`, e `+v.pontos` faz
`'9999' → 9999`. Logo:

```text
ciclos: { '2026-01': { v: '9' }, ... }        →  conta como ciclo com vitória
vencidos: [{ uid: 'a', pontos: '9999' }]      →  conta como adversário relevante
```

É uma **leniência**, não um furo: o escritor único sempre grava números, e o
cliente não escreve em `feitos`. Mas é um desvio do princípio "prefere-se
false", e fica registrado em vez de ser apresentado como perfeição. Se a próxima
etapa quiser fechá-lo, o lugar é `feitoDe`, com `Number.isInteger`.

---

## 20. DIVERGÊNCIAS ENCONTRADAS

A etapa pediu para registrar, não corrigir. São estas:

### Entre documentos (decisões que mudaram entre etapas)

| onde | o quê |
|---|---|
| `exame-de-raridade.md` §9 | recomendava o **modelo A2** (dois limiares, `L_pico` + `L_base`). A 3I.10 escolheu **A1**, um limiar só, porque com `A_Q=3` o pico vem de graça. **O §9 e o §22-D daquele documento estão superados.** |
| `exame-de-raridade.md` §22-B/C | escrevia Rare e Legendary com os parâmetros `M` e `V`. A 3I.10 eliminou os dois por redundância. **Superado.** |
| `exame-de-raridade.md` §13 e §22-E | recomendava o Caminho B com o modelo S1 e três parâmetros. A 3I.10 concluiu que não é calibrável. **Superado.** |
| `exame-de-raridade.md` §2.5 | diz que a distribuição temporal dos adversários é parcial. **Continua verdade**, e esta etapa acrescenta que a perda não afeta o exame, porque a *contagem* acima de um limiar é monotônica (§10) |

### Dentro do código

| onde | o quê |
|---|---|
| `js/feitos.js`, `_vencidosLimpos` | valida o campo `v.ciclo` com `/^\d{4}-\d{2}$/`, enquanto a **chave** do ciclo usa o mais estrito `FEITO_CICLO_RE`. Logo uma entrada de `vencidos` pode carregar `ciclo: '2026-99'`. Cosmético: o exame não lê `v.ciclo` |
| `js/feitos.js`, `feitoDe` | coage texto numérico (§19) |

Nenhuma foi corrigida.

---

## 21. BLOQUEADORES TÉCNICOS

Estes **impedem** a implementação do exame tal como está, e nenhum é resolvido
pela fórmula. São o trabalho real da próxima etapa.

### Bloqueador 1 — o legado por nível continua a responder

`rarDe(mapa, id, legado)` devolve o mapa se houver registro, e **senão devolve
o legado**, que é `fuRaridadeDoNivel`:

```text
nível 11+  →  Raro          nível 27+  →  Lendário
```

Medido contra as taxas da 3I.10 (~50–63% chegam a Rare, ~7–16% a Legendary), o
exame é **muito mais restritivo** que o legado. Daí três consequências:

1. **ligar o exame sem desligar o legado não muda nada visível**: quem falha
   fica sem registro no mapa e continua mostrando a raridade do nível;
2. **desligar o legado rebaixa todo avatar de nível 27+** de Lendário a Comum,
   a menos que passe;
3. **passar no exame pode rebaixar visivelmente.** Medido: um avatar de nível 40
   (legado = Lendário) que receba `Raro` no mapa passa a mostrar **Raro**.

Isto é uma decisão de migração com consequência visível ao jogador, e precisa de
ser tomada explicitamente — não é um efeito colateral aceitável de ligar o exame.

### Bloqueador 2 — o mercado e o preço leem o legado por fora

Três lugares calculam a raridade a partir do nível **sem passar pelo
`rarResolver`**:

```text
js/avatars-market.js:368     a tarja e o filtro do anúncio
js/cristais.js:894           o PREÇO
api/comprar-avatar.js:205    o recuo legado da compra
```

Depois de o exame entrar, o anúncio e o preço continuariam a sair do nível. São
44 chamadas a `fuRaridadeDoNivel` em 17 arquivos, e o
`tools/testar-raridade.js` falha se alguém a chamar de um lugar novo — a lista
está presa por teste, o que ajuda, mas não as converte.

### ~~Bloqueador 3 — não existe rotina de certificação~~  ·  resolvido na 3I.13

`api/_certificar.js` é o lugar, e é módulo interno sem rota. O que falta é o
gatilho, e isso é escolha de calendário e não de arquitetura: `certificarJogador`
recebe o `db` e o uid e faz o resto.

### Não-bloqueador, registrado como resolvido

A **mutabilidade da evidência** (seção 8 da etapa) parecia exigir mecanismo
novo e **não exige**: a monotonia é demonstrada e verificada (§10). Nenhum marco
de certificação persistente é necessário para o Caminho A.

---

## 22. PROPRIEDADES QUE A IMPLEMENTAÇÃO DEVE TESTAR

Além dos cenários, estas propriedades. As marcadas **★** não estão presas por
teste hoje.

| propriedade | o que exigir |
|---|---|
| **Monotonicidade** | acrescentar uma vitória válida em ciclo novo nunca remove elegibilidade |
| **★ Invariante da expulsão** | `|{v : v.pontos >= L}|` nunca desce, para qualquer L e qualquer sequência. **Deve falhar se a política de expulsão deixar de remover o mais fraco** (§10) |
| **Independência de Feitio** | trocar o feitio mantendo a evidência mantém o resultado |
| **Independência de Escola** | idem |
| **Independência de nível** | idem |
| **Independência de fase** | idem |
| **Independência do rank atual do avatar** | alterar o rank atual não altera certificação já conquistada |
| **Independência do rank futuro do adversário** | depois da vitória registrada, alterar o rank dele não altera a evidência |
| **Deduplicação** | dois registros do mesmo uid contam como um adversário |
| **Limiar estrito** | `1149 < 1150` recusa; `1150 >= 1150` aceita |
| **Ciclo** | 2 recusa; 3 aceita; 4 aceita |
| **Legendary** | 4 ciclos recusa; 5 ciclos + 2 adversários recusa; 5 ciclos + 3 adversários aceita |
| **Pureza** | mesma evidência, mesmo resultado, em chamadas repetidas |
| **Idempotência da certificação** | segunda execução não escreve |
| **★ Idempotência da rotina** | se a rotina fizer duas escritas (Raro e Lendário), ser idempotente como um todo |
| **Tolerância a corrupção** | nenhuma das 37 formas de corrupção cria elegibilidade nem rebenta (§19) |

---

## 23. PENDÊNCIAS PARA A ETAPA SEGUINTE

Em ordem de importância:

1. **O legado por nível: desligar, quando e como.** Bloqueador 1. Decisão de
   migração com consequência visível: rebaixar todo avatar de nível 27+, ou
   conviver com duas fontes.
2. ~~**`Comum → Lendário`: uma certificação ou duas?**~~ **Decidido na 3I.13:
   uma.** O histórico guarda o que aconteceu, e o avatar não passou por Raro —
   passou de Comum a Lendário. Dois eventos com o mesmo instante descreveriam
   uma escada que ninguém subiu.
3. ~~**Onde a certificação roda.**~~ **Feito na 3I.13:** `api/_certificar.js`.
   Falta o gatilho mensal, que é etapa própria.
4. **O mercado e o preço**, que leem o legado por fora. Bloqueador 2.
5. **O teste de invariante da expulsão** (★ na §22). É a única propriedade
   crítica verdadeira-mas-não-presa.
6. **Path B**: precisa de `danoMitigado`, de `protegeuFez` acontecer, e de uma
   métrica de suporte por partida (§14).
7. **A virada UTC no manual.** Dívida de documentação, visível ao jogador.
8. **A leniência do texto numérico** em `feitoDe` (§19), se se quiser fechar.
9. **`ciclos` sem teto.** 1,8 KB em dez anos; vigiar, não agir.

---

## 24. VALIDAÇÃO

```text
arquivos de produção alterados:  NENHUM
raridades modificado:            NÃO
avatar promovido:                NENHUM
exame executado:                 NÃO (só nos scripts temporários, fora do jogo)
regra de combate alterada:       NENHUMA
```

Suíte:

```text
testar-feitos      409 passaram · 0 falharam
testar-raridade    140 passaram · 0 falharam
testar-pvp         116 passaram · 0 falharam
testar-escolhas     74 passaram · 0 falharam
auditoria-lugares  628 · escolas 341 · IA 15 · avatares 3332 — 0 falhas
pt-br.js           limpo

mutações 3I.7      11 de 11 apanhadas
mutações 3I.9      14 de 14 apanhadas
```

Três ferramentas não correm neste ambiente, por falta de dependência externa e
não por regressão: `testar-mercado` e `testar-niveis` pedem
`firebase-admin/app`; `testar-regras` pede os emuladores rodando. Condição
pré-existente, não causada por esta etapa.

O único arquivo criado é este documento.
