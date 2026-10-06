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
`'exame-raridade'`, nunca o uid de quem pediu. **O que ainda não existe é o
gatilho**: nenhum cron, endpoint ou botão chama a certificação. O mecanismo
está pronto e à espera do ciclo mensal.

---

## O exame, e o que dele falta

A certificação por mérito está **implementada** (3I.13) e **sem gatilho**.
Os documentos que a desenharam:

- [especificacao-exame-raridade.md](especificacao-exame-raridade.md) — as
  fórmulas (3I.11)
- [calibracao-exame-raridade.md](calibracao-exame-raridade.md) — os números
  (3I.10)
- [exame-de-raridade.md](exame-de-raridade.md) — a estrutura (3I.8)

Enquanto o gatilho não existir, **todo avatar é Comum**, inclusive em combate
— ninguém chama a certificação, logo ninguém é promovido. É consequência
deliberada, e não efeito colateral: ver o relatório da 3I.12 para o que cada
raridade vale no motor.

---

## O que não pode voltar

O `tools/testar-raridade.js` falha se alguém:

- declarar ou chamar um `fuRaridadeDoNivel`;
- escrever uma conta de `nível >= X → 'Raro' | 'Lendário'`;
- indexar uma tabela de raridades por fase;
- fazer o mercado, o anúncio ou o preço calcularem raridade pelo nível;
- permitir um downgrade.
