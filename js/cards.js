// ═══════════════════════════════════════════════════════════════════
// FRACTURED VEIL — BARALHO DE CARTAS
// 52 cartas + 2 coringas = 54 cartas no total
//
// Avatares únicos: 13 (um por valor) + 1 (coringa) = 14 seeds
// O mesmo avatar repete nos 4 naipes — só muda cor/naipe
// ═══════════════════════════════════════════════════════════════════

// ── NAIPES ──
const NAIPES = [
  { simbolo: '♥', nome: 'Corações', cor: '#ef4444' },
  { simbolo: '♠', nome: 'Espadas',  cor: '#a78bfa' },
  { simbolo: '♦', nome: 'Ouros',    cor: '#f0d080' },
  { simbolo: '♣', nome: 'Paus',     cor: '#7ab87a' },
];

// ── VALORES ──
// Ordem de força no truco: 4 > 3 > 2 > A > K > J > Q > 7 > 6 > 5 > 8 > 9 > 10
const VALORES = [
  { label: '4',  poder: 14 },
  { label: '3',  poder: 13 },
  { label: '2',  poder: 12 },
  { label: 'A',  poder: 11 },
  { label: 'K',  poder: 10 },
  { label: 'J',  poder: 9  },
  { label: 'Q',  poder: 8  },
  { label: '7',  poder: 7  },
  { label: '6',  poder: 6  },
  { label: '5',  poder: 5  },
  { label: '8',  poder: 4  },
  { label: '9',  poder: 3  },
  { label: '10', poder: 2  },
];

// ── MANILHAS (Truco Paulista) ──
// Zap(♣4) > Copas(♥7) > Espadilha(♠A) > Ouros(♦7)
const MANILHAS = [
  { label: '4', simbolo: '♣', poder: 18 },
  { label: '7', simbolo: '♥', poder: 17 },
  { label: 'A', simbolo: '♠', poder: 16 },
  { label: '7', simbolo: '♦', poder: 15 },
];

// ── AVATAR POR VALOR ──
// Cada valor tem um elemento e raridade fixos
// Os 4 naipes repetem o mesmo avatar — só muda a cor
const AVATAR_POR_VALOR = {
  'A':  { elemento: 'Luz',          raridade: 'Lendário', seed: 1001 },
  'K':  { elemento: 'Sombra',       raridade: 'Raro',     seed: 1002 },
  'Q':  { elemento: 'Aether',       raridade: 'Raro',     seed: 1003 },
  'J':  { elemento: 'Eletricidade', raridade: 'Raro',     seed: 1004 },
  '10': { elemento: 'Vento',        raridade: 'Comum',    seed: 1005 },
  '9':  { elemento: 'Água',         raridade: 'Comum',    seed: 1006 },
  '8':  { elemento: 'Terra',        raridade: 'Comum',    seed: 1007 },
  '7':  { elemento: 'Fogo',         raridade: 'Comum',    seed: 1008 },
  '6':  { elemento: 'Void',         raridade: 'Comum',    seed: 1009 },
  '5':  { elemento: 'Vento',        raridade: 'Comum',    seed: 1010 },
  '4':  { elemento: 'Terra',        raridade: 'Raro',     seed: 1011 },
  '3':  { elemento: 'Fogo',         raridade: 'Raro',     seed: 1012 },
  '2':  { elemento: 'Água',         raridade: 'Raro',     seed: 1013 },
};

// Avatar do coringa
const AVATAR_CORINGA = [
  { elemento: 'Void',   raridade: 'Lendário', seed: 9901 }, // coringa 1
  { elemento: 'Aether', raridade: 'Lendário', seed: 9902 }, // coringa 2
];

// ── GERAR BARALHO COMPLETO ──
function generateDeck() {
  const deck = [];

  for(const naipe of NAIPES) {
    for(const valor of VALORES) {
      const avatar   = AVATAR_POR_VALOR[valor.label];
      const manilha  = MANILHAS.find(m => m.label === valor.label && m.simbolo === naipe.simbolo);

      deck.push({
        id:        `${valor.label}${naipe.simbolo}`,
        label:     valor.label,
        poder:     manilha ? manilha.poder : valor.poder,
        naipe:     naipe.simbolo,
        nomeNaipe: naipe.nome,
        corNaipe:  naipe.cor,
        elemento:  avatar.elemento,
        raridade:  avatar.raridade,
        seed:      avatar.seed,      // ← mesmo seed para os 4 naipes do mesmo valor
        isManilha: !!manilha,
        isCoringa: false,
      });
    }
  }

  // 2 coringas — cada um tem o seu próprio avatar
  for(let i = 0; i < 2; i++) {
    const av = AVATAR_CORINGA[i];
    deck.push({
      id:        `CORINGA_${i + 1}`,
      label:     '★',
      poder:     20,
      naipe:     i === 0 ? '★' : '✦',
      nomeNaipe: 'Coringa',
      corNaipe:  i === 0 ? '#a78bfa' : '#e8a030',
      elemento:  av.elemento,
      raridade:  av.raridade,
      seed:      av.seed,
      isManilha: false,
      isCoringa: true,
    });
  }

  return deck;
}

// ── EMBARALHAR ──
function shuffleDeck(deck) {
  const d = [...deck];
  for(let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// ── DISTRIBUIR N CARTAS ──
function dealCards(deck, n) {
  return deck.slice(0, n);
}

// ── RENDERIZAR CARTA (SVG string) ──
function renderCard(card, w = 120, h = 180, faceDown = false) {
  if(faceDown)       return _renderCardBack(w, h);
  if(card.isCoringa) return _renderCoringa(card, w, h);
  return _renderCardFront(card, w, h);
}

// ── VERSO ──
function _renderCardBack(w, h) {
  const rx  = Math.round(w * 0.1);
  const uid = 'bk_' + Math.random().toString(36).slice(2, 7);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}_bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0618"/>
        <stop offset="100%" stop-color="#160826"/>
      </linearGradient>
      <linearGradient id="${uid}_gld" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#c9a84c"/>
        <stop offset="50%" stop-color="#f0d080"/>
        <stop offset="100%" stop-color="#c9a84c"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" rx="${rx}" fill="url(#${uid}_bg)"/>
    <rect width="${w}" height="${h}" rx="${rx}" fill="none" stroke="url(#${uid}_gld)" stroke-width="1.2"/>
    <rect x="${w*0.06}" y="${h*0.04}" width="${w*0.88}" height="${h*0.92}"
          rx="${rx*0.7}" fill="none" stroke="#a78bfa" stroke-width="0.4" opacity="0.4"/>
    ${_losangosVerso(w, h)}
    <circle cx="${w/2}" cy="${h/2}" r="${w*0.22}"
            fill="#0a0618" stroke="#a78bfa" stroke-width="0.8" opacity="0.85"/>
    <text x="${w/2}" y="${h/2 - h*0.03}" text-anchor="middle"
          font-family="serif" font-size="${w*0.18}" fill="#a78bfa" opacity="0.9">✦</text>
    <text x="${w/2}" y="${h/2 + h*0.07}" text-anchor="middle"
          font-family="sans-serif" font-size="${w*0.07}" fill="#c4b5fd" letter-spacing="1">FV</text>
    <text x="${w*0.1}"  y="${h*0.08}" font-size="${w*0.1}" fill="#a78bfa" opacity="0.4">✧</text>
    <text x="${w*0.9}"  y="${h*0.08}" font-size="${w*0.1}" fill="#a78bfa" opacity="0.4" text-anchor="end">✧</text>
    <text x="${w*0.1}"  y="${h*0.97}" font-size="${w*0.1}" fill="#a78bfa" opacity="0.4">✧</text>
    <text x="${w*0.9}"  y="${h*0.97}" font-size="${w*0.1}" fill="#a78bfa" opacity="0.4" text-anchor="end">✧</text>
  </svg>`;
}

function _losangosVerso(w, h) {
  const step = w * 0.26;
  const rows = Math.ceil(h / step) + 1;
  const cols = Math.ceil(w / step) + 1;
  let out = '<g opacity="0.12">';
  for(let r = 0; r < rows; r++) {
    for(let c = 0; c < cols; c++) {
      const cx  = c * step + (r % 2 === 0 ? 0 : step / 2);
      const cy  = r * step * 0.6;
      const s   = step * 0.45;
      const col = (r + c) % 2 === 0 ? '#a78bfa' : '#7c3aed';
      out += `<path d="M${cx},${cy-s} L${cx+s},${cy} L${cx},${cy+s} L${cx-s},${cy} Z" fill="${col}"/>`;
    }
  }
  return out + '</g>';
}

// ── FRENTE ──
function _renderCardFront(card, w, h) {
  const rx        = Math.round(w * 0.1);
  const uid       = 'cf_' + card.id.replace(/[^a-zA-Z0-9]/g, '') + '_' + Math.random().toString(36).slice(2,5);
  const avatarSz  = Math.round(w * 0.72);
  const avatarX   = Math.round((w - avatarSz) / 2);
  const avatarY   = Math.round(h * 0.14);
  const labelSz   = Math.round(w * 0.22);
  const naipeSz   = Math.round(w * 0.15);

  // Avatar gerado pelo seed do valor (mesmo nos 4 naipes)
  const avatarSVG = gerarSVG(card.elemento, card.raridade, card.seed, avatarSz, avatarSz);

  // Cor de fundo subtil baseada no naipe
  const bgMap = {
    '♥': '#180a0a',
    '♠': '#0e0818',
    '♦': '#181408',
    '♣': '#0a1408',
  };
  const bgColor = bgMap[card.naipe] || '#0d0a1e';

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}_bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bgColor}"/>
        <stop offset="100%" stop-color="#0d0a1e"/>
      </linearGradient>
      <linearGradient id="${uid}_gld" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#c9a84c"/>
        <stop offset="50%" stop-color="#f0d080"/>
        <stop offset="100%" stop-color="#c9a84c"/>
      </linearGradient>
    </defs>
    <!-- Fundo -->
    <rect width="${w}" height="${h}" rx="${rx}" fill="url(#${uid}_bg)"/>
    <!-- Borda dourada -->
    <rect width="${w}" height="${h}" rx="${rx}" fill="none" stroke="url(#${uid}_gld)" stroke-width="1.2"/>
    <!-- Borda interna -->
    <rect x="${w*0.06}" y="${h*0.04}" width="${w*0.88}" height="${h*0.92}"
          rx="${rx*0.7}" fill="none" stroke="#c9a84c" stroke-width="0.4" opacity="0.25"/>

    <!-- Valor + naipe top-left -->
    <text x="${w*0.1}" y="${h*0.13}"
          font-family="Georgia,serif" font-size="${labelSz}" font-weight="bold" fill="#e8a030">${card.label}</text>
    <text x="${w*0.1}" y="${h*0.13 + naipeSz + 2}"
          font-family="sans-serif" font-size="${naipeSz}" fill="${card.corNaipe}">${card.naipe}</text>

    <!-- Valor + naipe bottom-right (invertido) -->
    <g transform="rotate(180 ${w/2} ${h/2})">
      <text x="${w*0.1}" y="${h*0.13}"
            font-family="Georgia,serif" font-size="${labelSz}" font-weight="bold" fill="#e8a030">${card.label}</text>
      <text x="${w*0.1}" y="${h*0.13 + naipeSz + 2}"
            font-family="sans-serif" font-size="${naipeSz}" fill="${card.corNaipe}">${card.naipe}</text>
    </g>

    <!-- Avatar (mesmo para os 4 naipes do mesmo valor) -->
    <g transform="translate(${avatarX}, ${avatarY})">
      ${avatarSVG}
    </g>

    <!-- Naipe decorativo central inferior -->
    <text x="${w/2}" y="${h*0.91}"
          font-family="sans-serif" font-size="${w*0.18}"
          fill="${card.corNaipe}" text-anchor="middle" opacity="0.5">${card.naipe}</text>

    ${card.isManilha ? `
    <!-- Destaque manilha -->
    <rect width="${w}" height="${h}" rx="${rx}" fill="none" stroke="#f0d080" stroke-width="2" opacity="0.5"/>
    <text x="${w/2}" y="${h*0.055}" font-family="sans-serif"
          font-size="${w*0.07}" fill="#f0d080" text-anchor="middle" letter-spacing="1" opacity="0.85">MANILHA</text>
    ` : ''}
  </svg>`;
}

// ── CORINGA ──
function _renderCoringa(card, w, h) {
  const rx       = Math.round(w * 0.1);
  const uid      = 'ck_' + card.id + '_' + Math.random().toString(36).slice(2,5);
  const avatarSz = Math.round(w * 0.72);
  const avatarX  = Math.round((w - avatarSz) / 2);
  const avatarY  = Math.round(h * 0.14);
  const avatarSVG = gerarSVG(card.elemento, card.raridade, card.seed, avatarSz, avatarSz);
  const cor      = card.corNaipe;

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}_bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0618"/>
        <stop offset="100%" stop-color="#1a0826"/>
      </linearGradient>
      <linearGradient id="${uid}_brd" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${cor}"/>
        <stop offset="50%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="${cor}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" rx="${rx}" fill="url(#${uid}_bg)"/>
    <rect width="${w}" height="${h}" rx="${rx}" fill="none" stroke="url(#${uid}_brd)" stroke-width="2"/>
    <rect x="${w*0.06}" y="${h*0.04}" width="${w*0.88}" height="${h*0.92}"
          rx="${rx*0.7}" fill="none" stroke="${cor}" stroke-width="0.6" opacity="0.5"/>

    <!-- Estrela top-left -->
    <text x="${w*0.1}" y="${h*0.14}"
          font-family="serif" font-size="${w*0.2}" fill="${cor}" font-weight="bold">★</text>

    <!-- Estrela bottom-right invertida -->
    <g transform="rotate(180 ${w/2} ${h/2})">
      <text x="${w*0.1}" y="${h*0.14}"
            font-family="serif" font-size="${w*0.2}" fill="${cor}" font-weight="bold">★</text>
    </g>

    <!-- Avatar Lendário -->
    <g transform="translate(${avatarX}, ${avatarY})">
      ${avatarSVG}
    </g>

    <!-- Label CORINGA -->
    <text x="${w/2}" y="${h*0.91}"
          font-family="Georgia,serif" font-size="${w*0.1}"
          fill="${cor}" text-anchor="middle" letter-spacing="1" opacity="0.85">CORINGA</text>
  </svg>`;
}

// ── COMPARAR CARTAS ──
function compareCards(a, b) {
  return a.poder > b.poder ? 1 : a.poder < b.poder ? -1 : 0;
}

// ── MANILHA DA RODADA (vira + 1) ──
function getManilhaDaRodada(cartaVira) {
  const labels = VALORES.map(v => v.label);
  const idx    = labels.indexOf(cartaVira.label);
  return labels[(idx + 1) % labels.length];
}

// ── INFO ──
function getDeckInfo(deck) {
  return {
    total:    deck.length,
    normais:  deck.filter(c => !c.isCoringa).length,
    coringas: deck.filter(c => c.isCoringa).length,
    manilhas: deck.filter(c => c.isManilha).length,
    avatarsUnicos: Object.keys(AVATAR_POR_VALOR).length + AVATAR_CORINGA.length,
  };
}

console.log('[CARDS] Módulo carregado — 54 cartas, 14 avatares únicos.');
