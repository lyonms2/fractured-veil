// ═══════════════════════════════════════════════════════════════
//  api/fissura-inscrever.js — Vercel Serverless Function
//
//  Inscreve o jogador na Grande Fissura mensal.
//  Cobra a taxa de inscrição e regista a facção escolhida.
//
//  Body esperado:
//    { idToken: "...", faccao: "Caos"|"Equilíbrio"|"Éter" }
// ═══════════════════════════════════════════════════════════════

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { getAuth }                      = require('firebase-admin/auth');

const FACCOES = ['Caos', 'Equilíbrio', 'Éter'];

// Taxa de inscrição por raridade
const TAXA_INSCRICAO = {
  Comum:    { moedas: 200, cristais: 0  },
  Raro:     { moedas: 0,   cristais: 5  },
  Lendário: { moedas: 0,   cristais: 10 },
};

function initAdmin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return { db: getFirestore(), auth: getAuth() };
}

function getMesAtual() {
  return new Date().toISOString().slice(0, 7); // "2026-04"
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { idToken, faccao } = req.body;

  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({ erro: 'idToken em falta' });
  }
  if (!faccao || !FACCOES.includes(faccao)) {
    return res.status(400).json({ erro: 'Facção inválida' });
  }

  const { db, auth } = initAdmin();

  let uid;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  const mes        = getMesAtual();
  const playerRef  = db.collection('players').doc(uid);
  const fissuraRef = db.collection('fissura').doc(mes);

  try {
    const resultado = await db.runTransaction(async (tx) => {
      const playerSnap  = await tx.get(playerRef);
      const fissuraSnap = await tx.get(fissuraRef);

      if (!playerSnap.exists) throw new Error('Jogador não encontrado');

      const data = playerSnap.data();

      // Verifica se já está inscrito neste mês
      if (data.fissuraMes === mes) {
        throw new Error('Já estás inscrito na Fissura deste mês');
      }

      // Determina raridade do avatar ativo
      const activeSlot = (data.avatarSlots || [])[data.gs?.activeSlot ?? data.activeSlot ?? 0];
      if (!activeSlot || !activeSlot.hatched || activeSlot.dead) {
        throw new Error('Precisas de um avatar ativo para participar');
      }
      const raridade = activeSlot.raridade || 'Comum';
      const taxa     = TAXA_INSCRICAO[raridade] || TAXA_INSCRICAO.Comum;

      // Valida saldo
      const moedas   = data.gs?.moedas   ?? data.moedas   ?? 0;
      const cristais = data.gs?.cristais ?? data.cristais ?? 0;

      if (taxa.moedas > 0 && moedas < taxa.moedas) {
        throw new Error(`Saldo insuficiente: precisas de ${taxa.moedas} 🪙`);
      }
      if (taxa.cristais > 0 && cristais < taxa.cristais) {
        throw new Error(`Saldo insuficiente: precisas de ${taxa.cristais} 💎`);
      }

      // Debita taxa
      const novasMoedas   = moedas   - taxa.moedas;
      const novosCristais = cristais - taxa.cristais;

      tx.update(playerRef, {
        'gs.moedas':   novasMoedas,
        moedas:        novasMoedas,
        'gs.cristais': novosCristais,
        cristais:      novosCristais,
        faccao:        faccao,
        fissuraMes:    mes,
        fissuraPontos: 0,
        fissuraRaridade: raridade,
      });

      // Atualiza doc global da fissura
      const fissuraData = fissuraSnap.exists ? fissuraSnap.data() : {};
      const facData = fissuraData[faccao] || { pontos: 0, membros: 0, pontosTotal: 0 };

      tx.set(fissuraRef, {
        [faccao]: {
          pontos:      facData.pontos,
          membros:     (facData.membros || 0) + 1,
          pontosTotal: facData.pontosTotal || 0,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Taxa vai para a pool
      if (taxa.cristais > 0) {
        const poolRef = db.collection('config').doc('pool');
        tx.update(poolRef, {
          cristais:    FieldValue.increment(taxa.cristais),
          totalEntrou: FieldValue.increment(taxa.cristais),
        });
      }

      return { raridade, taxa, novasMoedas, novosCristais };
    });

    return res.status(200).json({
      ok:       true,
      faccao,
      raridade: resultado.raridade,
      taxa:     resultado.taxa,
      novoSaldoMoedas:   resultado.novasMoedas,
      novoSaldoCristais: resultado.novosCristais,
    });

  } catch (err) {
    console.error('[fissura-inscrever]', err.message);
    return res.status(400).json({ erro: err.message });
  }
};
