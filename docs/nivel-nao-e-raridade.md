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

**Nada em produção o chama.** O mecanismo está pronto e desligado, à espera de
quem tenha autoridade para promover.

---

## O exame vem depois

A raridade será concedida por **certificação por mérito**, desenhada e
calibrada mas **não implementada**:

- [especificacao-exame-raridade.md](especificacao-exame-raridade.md) — as
  fórmulas (3I.11)
- [calibracao-exame-raridade.md](calibracao-exame-raridade.md) — os números
  (3I.10)
- [exame-de-raridade.md](exame-de-raridade.md) — a estrutura (3I.8)

Enquanto o exame não existir, **todo avatar é Comum**, inclusive em combate.
Isso é a consequência deliberada desta etapa, e não um efeito colateral: ver o
relatório da 3I.12 para o que cada raridade vale no motor.

---

## O que não pode voltar

O `tools/testar-raridade.js` falha se alguém:

- declarar ou chamar um `fuRaridadeDoNivel`;
- escrever uma conta de `nível >= X → 'Raro' | 'Lendário'`;
- indexar uma tabela de raridades por fase;
- fazer o mercado, o anúncio ou o preço calcularem raridade pelo nível;
- permitir um downgrade.
