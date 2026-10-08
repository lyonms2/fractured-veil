# Nível ≠ Raridade

> **Etapa 3I.12.** A regra que decidia raridade pelo nível saiu do jogo.
> Este documento é o contrato curto: o que cada conceito é, e quem responde
> por ele.

---

## Os dois conceitos

| | o que é | quem o move | onde vive |
|---|---|---|---|
| **Nível** | progressão | jogar | `niveis[idAvatar]`, só o servidor escreve |
| **Raridade** | conquista | certificação | `raridades[idAvatar]`, só o servidor escreve |

Não se misturam. Nenhuma regra do jogo converte um no outro.

```text
nível 11  ≠  Raro
nível 27  ≠  Lendário
nível 40  ≠  Lendário
fase      ≠  raridade
nascimento ≠ raridade
```

---

## A fonte única

```text
raridades[idAvatar] = { atual: 'Comum' | 'Raro' | 'Lendário',
                        historico: [{ para, em, por }] }
```

Quem pergunta, pergunta a uma função só:

```js
rarDe(mapa, id)          // js/raridades.js — sem registro, devolve 'Comum'
rarResolver(mapa, slot)  // escreve slot.raridadeReconhecida e slot.raridade
fuRaridadeDa(slot)       // js/ficha-fu.js — o que a ficha de combate lê
```

**Não existe recuo.** Um avatar sem registro é Comum, tenha o nível que tiver.

Dois campos no slot, e a diferença importa:

- `raridadeReconhecida` — o que o servidor reconhece. O carregamento escreve-o
  a partir do mapa; o cliente **não** o grava (não está na lista do save). É o
  que a ficha de combate lê.
- `raridade` — o espelho que o desenho lê (33 chamadas ao `gerarSVG`). Recebe a
  mesma resposta, pela mesma função.

No PvP, o `pvpRetrato` leva a raridade reconhecida como argumento, do mapa do
servidor — pela mesma razão que já levava o nível e a escolha do Ancião.

---

## O avatar nasce Comum

Sempre, sem exceção, e independentemente de nível, fase, Feitio, Escola, magia
ou qualquer outro atributo. Não há promoção automática em lugar nenhum.

---

## A raridade não altera a anatomia

Desde a 3J.6. Para a mesma seed e o mesmo DNA, um Comum, um Raro e um Lendário
têm **a mesma anatomia**:

```text
DNA + seed   →  ANATOMIA      quantas partes, de que tipo
fase/idade   →  CRESCIMENTO   que tamanho, em que posição
raridade     →  PRESENÇA      aura, glow, partículas
```

O que saiu: o teto de braços (`[4,6,8]` por grau), o teto de espinhos
(`[0,2,4]`, que era **zero** no Comum) e a tranca dos tentáculos (`grau >= 1`).
O `tools/testar-fase-geo.js` falha se algum deles voltar, mesmo disfarçado.

### Na arena, a raridade é uma camada externa

Desde a 3J.7. A presença vive no DOM da arena, na `.cb-efeitos-tras` do posto —
**fora do SVG anatômico**:

```text
Comum      nenhum elemento
Raro       um halo atrás do corpo
Lendário   o mesmo mais forte, e um segundo mais largo em contratempo
```

A cor é a da Fratura (`var(--fenda)`, declarada uma vez no `.cb-palco`) e não a
cor genética do avatar: a do DNA diz **quem** ele é, e esta tem de dizer **o
que** ele é — e matiz não ordena três degraus, intensidade ordena.

**Essa camada não participa do `getBBox()`**, e isso não é detalhe. O
`_afAssentar` (`js/arena-fu.js`) mede o SVG para assentar os pés no chão e para
calcular o `--cabeca` onde o nome se pendura. Medido no browser, com uma aura
dentro do desenho:

| estado da aura | `getBBox()` |
|---|---|
| visível | y −41, altura 352 |
| `display: none` | y 55, altura 203 |
| `opacity: 0` | y −41, altura 352 |
| `visibility: hidden` | y −41, altura 352 |

Só o `display: none` sai da medida — e aí não se vê nada. Por isso a presença
não pode morar no SVG, e por isso a `av-aura` continua escondida na arena.

O `.cb-anel` **não** é raridade: é a vez, o poder agir e o alvo. O estado abafa
a presença (quem cai perde-a), nunca o contrário.

O que ainda é raridade **dentro** do SVG, e sai em etapas próprias: as
partículas (5/9/14), a espessura delas e o `stdDeviation` do glow.
**Anatomia, nenhuma.**

**As manchas saíram na 3J.11.** Eram `random(4,6)` no Lendário e `random(3,5)` nos
outros; passaram a `random(3,5)` para todos. A auditoria classificou-as como
**corpo** e não como efeito, por três evidências: caem em `dx 75–125, dy 80–120`,
dentro da silhueta; nenhuma regra de CSS as abafa, enquanto a `av-particula` e a
`av-aura` são abafadas quando o avatar adoece ou cai; e tirá-las não muda o
`getBBox()` em nenhum de 24 casos medidos no browser.

### A pendência medida

As partículas ainda vivem **dentro** do SVG e entram no `getBBox()`. Na arena, onde
a `av-aura` está escondida, elas passam a ser o que está mais longe do centro em
**17 de 24 casos** — e por isso a raridade ainda mexe no que põe o bicho de pé.
Medido entre um Comum e um Lendário com a mesma seed, em 60 casos:

| | difere | máximo |
|---|---|---|
| fundo da tinta (os pés) | 7/60 | 39,5 unidades |
| `--cabeca` (onde o nome pendura) | 45/60 | 41,5 unidades |

Isso é layout, não cosmética.

**Resolvido na 3J.12A, e só na arena.** O `getBBox()` do SVG inteiro é consumido
num lugar só em todo o projeto — o `_afAssentar` — e é lá que o estrago
acontecia. O `gerarSVG` continua a desenhar as partículas para as outras 34
chamadas, que nunca pedem a caixa; a arena esconde as dela com `display:none` (o
único que as tira do `getBBox`) e volta a desenhá-las num segundo `<svg
class="cb-part">` dentro do `.cb-corpo`, com o mesmo `viewBox`, largura, altura e
`preserveAspectRatio` — portanto sem conversão de coordenadas nenhuma. É a mesma
decisão que a `av-aura` já tinha.

Medido com a arena real, nos mesmos 60 casos:

| | antes | depois |
|---|---|---|
| caixa do SVG difere entre raridades | 49/60 | **0/60** |
| fundo da tinta | 7/60 | **0/60** |
| `--cabeca` | 45/60 | **0/60** |

E a posição da primeira partícula não se mexeu um pixel: −42,6 · −126, tamanho
3,4 × 3,2, antes e depois.

**A espessura do braço saiu na 3J.9.** Era `stroke-width` 8 no Lendário e 6 nos
outros dois — um braço um terço mais grosso por certificado. Passou a **6** para
todos, que é o valor que o Comum e o Raro já tinham, portanto só o Lendário
mudou. O **comprimento** continua a crescer com a fase pelo `mE()` da `FASE_GEO`,
e isso é legítimo: idade é crescimento, raridade não é. O
`tools/testar-bracos-raridade.js` falha se a raridade voltar ao braço.

**A garra saiu na 3J.10, e não foi substituída.** Era uma `<line>` na ponta de
cada braço, acesa só em quem não era Comum — a última peça do corpo que a
raridade decidia. A auditoria procurou uma fonte legítima e não encontrou
nenhuma: a garra não tinha gene, nem nome no código, nem sorteio próprio, nem
classe de CSS. Os candidatos existentes não serviam:

| candidato | porquê não |
|---|---|
| `temAsas` | é o único traço sorteado e nunca desenhado, mas é um gene de **asas**: usá-lo tornava a garra hereditária como asa |
| `bracoDet` | são curvaturas; um limiar sobre elas é pseudo-genética |
| `seed % 2` | o mesmo defeito, mais à vista |

> A garra foi removida da anatomia atual porque a sua única fonte era a
> raridade. Uma futura característica de garra exigirá uma decisão explícita de
> design e, se for hereditária, uma especificação genética — incluindo o lugar
> dela na fila de sorteios, que não se pode mudar depois sem trocar a cara de
> todos os avatares que já existem.

O `tools/testar-garra-raridade.js` guarda a ausência, e guarda-a por contagem
total e não por igualdade entre raridades: uma garra inventada que fosse igual
nas três — por `seed % 2`, por limiar — também falha.

**O raio do olho saiu na 3J.8.** Era `10/12/14` por raridade — três faixas que
não se tocavam (Comum 9–11, Raro 11–13, Lendário 13–15), e portanto um Lendário
tinha o olho uma vez e meia o de um Comum com a mesma seed. Passou a **12** para
todos, a mediana das três; a variação entre os olhos de um mesmo bicho continua
a vir do `olhoDet` (`random(-1, 1)`), que sai da fila principal — da seed, como
deve. O `tools/testar-olhos-raridade.js` falha se a raridade voltar a opinar
sobre o olho, inclusive escondida num helper ou disfarçada de deslocamento.

---

## A certificação, desde a 3I.13

```js
rarExaminar(feitos)                     // js/raridades.js — PURA
rarCertificar(reg, feitos, agora, por)  // examina e promove, sem escrever
certificarAvatar(db, uid, idAvatar)     // api/_certificar.js — lê e grava
```

O que o exame pede:

```text
Raro       venceu ao menos uma partida de FILA em 3 meses diferentes
Lendário   o mesmo em 5 meses, E derrotou 3 PESSOAS diferentes que
           valiam 1150 pontos ou mais no instante da derrota
```

Os adversários contam-se por **uid do jogador**, nunca por avatar: dez
avatares do mesmo dono são um adversário. O `pontos` é o retrato do rank
antes daquela partida, e nada o recalcula.

O **caminho do suporte continua desativado**: a etapa 3I.10 mediu que a cura
acumulada tem correlação 0,994 com o número de partidas (é volume, não
mérito) e que só a Sustentação produz cura. Volta quando o motor tiver uma
métrica de intensidade.

Não há quota, nem top X%, nem disputa: se ninguém for elegível, ninguém é
promovido; se todos forem, todos são.

## A promoção é explícita

```js
rarPromover(reg, para, por, agora)   // js/raridades.js
```

Só sobe, e registra no histórico quem promoveu e quando:

```text
Comum → Raro         permite
Comum → Lendário     permite (num salto)
Raro  → Lendário     permite

Raro     → Raro      recusa · JA_TEM
Lendário → Lendário  recusa · JA_TEM
Lendário → Raro      recusa · NAO_DESCE
Lendário → Comum     recusa · NAO_DESCE
Raro     → Comum     recusa · NAO_DESCE
```

Quem o chama é o `rarCertificar`, e só ele — com o `por` fixo em
`'exame-raridade'`, nunca o uid de quem pediu.

**O gatilho é mensal e do servidor** (3I.14): `api/certificar-ciclo.js`, às
01:00 UTC do dia 1, agendado em `vercel.json` e autenticado pelo `CRON_SECRET`.
Nenhuma tela o dispara, e o exame não se pede.

---

## O exame, e o que dele falta

A certificação por mérito está **implementada** (3I.13) e **agendada**
(3I.14). Os documentos que a desenharam:

- [especificacao-exame-raridade.md](especificacao-exame-raridade.md) — as
  fórmulas (3I.11)
- [calibracao-exame-raridade.md](calibracao-exame-raridade.md) — os números
  (3I.10)
- [exame-de-raridade.md](exame-de-raridade.md) — a estrutura (3I.8)

Até a primeira execução do gatilho, **todo avatar é Comum**, inclusive em
combate. E enquanto o `CRON_SECRET` não estiver no ambiente, o gatilho recusa
tudo e nada é promovido — nada quebra, a evidência continua a acumular-se, e a
primeira execução apanha o que ficou para trás. Ver o relatório da 3I.12 para
o que cada raridade vale no motor.

---

## O que não pode voltar

O `tools/testar-raridade.js` falha se alguém:

- declarar ou chamar um `fuRaridadeDoNivel`;
- escrever uma conta de `nível >= X → 'Raro' | 'Lendário'`;
- indexar uma tabela de raridades por fase;
- fazer o mercado, o anúncio ou o preço calcularem raridade pelo nível;
- permitir um downgrade.
