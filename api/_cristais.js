// ═══════════════════════════════════════════════════════════════════
//  _cristais.js — os DOIS baldes de cristais de um jogador
//
//  Lido por: comprar-avatar.js, comprar-ovo.js, pool.js, resgatar.js,
//            processar-compra.js
//
//  ── PORQUE É QUE HÁ DOIS ──
//
//  Um cristal comprado vale 0,1 MATIC de verdade: o contrato cunhou-o
//  contra MATIC que ficou no cofre, e o dono pode resgatá-lo quando
//  quiser. É uma dívida com lastro.
//
//  Um cristal de BÓNUS não tem MATIC nenhum atrás. Nasce de uma oferta
//  — "deposita 100 💎, ganha +10" — e se pudesse ser resgatado seria
//  dinheiro impresso: quem depositasse 10 MATIC recebia 110 💎 e sacava
//  10,89 MATIC de volta, com lucro garantido de 0,89 por volta e sem
//  limite de quantas voltas. O cofre pagava a diferença, e a cobertura
//  que a página da Transparência promete caía abaixo dos 100%.
//
//  Por isso o bónus vive num campo próprio: gasta-se em tudo dentro do
//  jogo — mercado, chocagem, slots — e não sai para MATIC.
//
//  ── A ORDEM DE GASTO ──
//
//  Gasta-se o BÓNUS primeiro. Convém aos dois lados: o jogador mantém
//  intacto o que pode sacar, e o jogo baixa a parte não-resgatável antes
//  da parte com lastro.
//
//  ── ONDE ESTÃO GUARDADOS ──
//
//  Como o saldo antigo: em gs.cristais e no cristais do topo, os dois em
//  espelho, porque partes diferentes do cliente lêem sítios diferentes.
//  O balde do bónus segue a mesma forma. Nenhum dos dois é escrito pelo
//  cliente — as regras do Firestore recusam-nos.
// ═══════════════════════════════════════════════════════════════════

// Os cristais com lastro, que se podem resgatar.
function reais(pData) {
  return pData?.gs?.cristais ?? pData?.cristais ?? 0;
}

// Os cristais de bónus, que só valem dentro do jogo.
function deBonus(pData) {
  return pData?.gs?.cristaisBonus ?? pData?.cristaisBonus ?? 0;
}

// O que o jogador pode gastar. É este o número que a loja mostra.
function total(pData) {
  return +(reais(pData) + deBonus(pData)).toFixed(2);
}

/* Os campos a escrever para gastar `custo`, ou null se não chegar.
   Devolve os quatro caminhos de uma vez — os dois baldes, cada um nos
   seus dois espelhos — para nenhum sítio se esquecer de metade. */
function camposDebito(pData, custo) {
  const b = deBonus(pData);
  const r = reais(pData);
  if (+(b + r).toFixed(2) + 1e-9 < custo) return null;

  const doBonus = Math.min(b, custo);
  const novoB   = +(b - doBonus).toFixed(2);
  const novoR   = +(r - (custo - doBonus)).toFixed(2);

  return {
    cristais:           novoR,
    'gs.cristais':      novoR,
    cristaisBonus:      novoB,
    'gs.cristaisBonus': novoB,
  };
}

/* Os campos a escrever para CREDITAR bónus. Separado do débito porque
   quem credita bónus é só um sítio — a compra de cristais. */
function camposCreditoBonus(pData, valor) {
  const novoB = +(deBonus(pData) + valor).toFixed(2);
  return { cristaisBonus: novoB, 'gs.cristaisBonus': novoB };
}

module.exports = { reais, deBonus, total, camposDebito, camposCreditoBonus };
