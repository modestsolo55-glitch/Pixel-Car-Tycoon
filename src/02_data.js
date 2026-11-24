/* =============================================================================
   Teil 2: Spieldaten – Klassen, Karosserien, Teile, Motoren, Forschung,
   Fabrikstufen, Werbung, Ereignisse, Erfolge, Gegner
   ============================================================================= */

// ---------- Fahrzeugklassen ----------
// aff = Anziehung der Klasse für die Kundengruppen
const CLASSES = {
  small:  { name: 'Kleinwagen',      r: 5.8, buildDays: 2,  tech: null,       aff: { family: 1.0,  sport: 0.22, hyper: 0 } },
  family: { name: 'Familienauto',    r: 6.3, buildDays: 3,  tech: 'ch_family', aff: { family: 1.3,  sport: 0.25, hyper: 0 } },
  suv:    { name: 'SUV',             r: 7.8, buildDays: 4,  tech: 'ch_suv',    aff: { family: 1.2,  sport: 0.4,  hyper: 0.02 } },
  sport:  { name: 'Sportcoupé',      r: 6.5, buildDays: 5,  tech: 'ch_sport',  aff: { family: 0.12, sport: 1.3,  hyper: 0.12 } },
  super:  { name: 'Supersportwagen', r: 7,   buildDays: 8,  tech: 'ch_super',  aff: { family: 0.02, sport: 0.95, hyper: 0.8 } },
  hyper:  { name: 'Hypercar',        r: 7.3, buildDays: 14, tech: 'ch_hyper',  aff: { family: 0,    sport: 0.3,  hyper: 1.45 } }
};
const CLASS_ORDER = ['small', 'family', 'suv', 'sport', 'super', 'hyper'];

// ---------- Karosserien ----------
// Koordinaten in Pixeln: x = 0 Heck bis L Front, y = Höhe über Boden.
// top/bot = Silhouette oben/unten, belt = Gürtellinie (Fensterunterkante),
// glass = Fensterbereich [x0,x1], pillars = B/C/D-Säulen, doors = Türfugen,
// head/tail/grille = [x, y, w, h], intake = Seitenlufteinlass, wing = Position Heckflügel
const BODIES = {
  // --- Kleinwagen ---
  hatch3: { cls: 'small', name: 'Hatch 3-Türer', L: 64, wr: 11, wf: 52, drive: 'FWD', eng: 'front',
    top: [[0, 13], [1, 19], [2, 23], [4, 26], [8, 27], [20, 27.5], [31, 27], [35, 25], [40, 21], [44, 18.5], [52, 17], [59, 16], [62, 14], [64, 11]],
    bot: [[0, 6], [2, 4.5], [61, 4.5], [64, 6]], belt: 18, glass: [3, 42], pillars: [21], doors: [21, 44],
    head: [58, 13, 5, 3], tail: [0, 15, 2, 5], grille: [59, 6, 5, 4], wing: 3, mirror: 41,
    w: 650, cd: 0.33, area: 2.0, safety: 45, comfort: 40, prac: 50, style: 40, cost: 3500, tech: null },
  hatch5: { cls: 'small', name: 'Hatch 5-Türer', L: 66, wr: 12, wf: 54, drive: 'FWD', eng: 'front',
    top: [[0, 13], [1, 20], [2, 24], [4, 27], [9, 28], [22, 28.5], [33, 28], [37, 26], [42, 21.5], [46, 19], [54, 17.5], [61, 16], [64, 14], [66, 11]],
    bot: [[0, 6], [2, 4.5], [63, 4.5], [66, 6]], belt: 18.5, glass: [3, 44], pillars: [10, 29], doors: [13, 29, 46],
    head: [60, 13, 5, 3], tail: [0, 15, 2, 5], grille: [61, 6, 5, 4], wing: 3, mirror: 43,
    w: 690, cd: 0.32, area: 2.05, safety: 48, comfort: 43, prac: 62, style: 38, cost: 3900, tech: 'ch_hatch5' },
  city: { cls: 'small', name: 'City-Floh', L: 58, wr: 10, wf: 47, drive: 'FWD', eng: 'front',
    top: [[0, 13], [0.5, 22], [2, 27], [6, 29], [26, 29], [32, 26], [38, 20], [47, 17], [54, 15], [57, 13], [58, 10]],
    bot: [[0, 6], [2, 4.5], [56, 4.5], [58, 6]], belt: 18, glass: [2, 36], pillars: [21], doors: [21, 39],
    head: [53, 12, 4, 3], tail: [0, 16, 2, 5], grille: [54, 6, 4, 3], wing: 2, mirror: 36,
    w: 600, cd: 0.35, area: 2.1, safety: 40, comfort: 38, prac: 46, style: 46, cost: 3300, tech: 'ch_city' },
  // --- Familienautos ---
  sedan: { cls: 'family', name: 'Limousine', L: 80, wr: 15, wf: 64, drive: 'FWD', eng: 'front',
    top: [[0, 13], [1, 17], [3, 19], [12, 20], [18, 21.5], [25, 26], [31, 29], [45, 29.5], [52, 27], [60, 21], [66, 19], [74, 17.5], [78, 15.5], [80, 12]],
    bot: [[0, 6], [3, 5], [77, 5], [80, 6.5]], belt: 19.5, glass: [21, 58], pillars: [39], doors: [24, 39, 55],
    head: [74, 13, 5, 3], tail: [0, 15, 3, 3], grille: [75, 7, 5, 4], wing: 6, mirror: 56,
    w: 980, cd: 0.29, area: 2.2, safety: 62, comfort: 60, prac: 70, style: 50, cost: 7000, tech: 'ch_family' },
  wagon: { cls: 'family', name: 'Kombi', L: 82, wr: 15, wf: 65, drive: 'FWD', eng: 'front',
    top: [[0, 13], [0.5, 21], [2, 27], [5, 29.5], [12, 30], [45, 30], [52, 27.5], [60, 21], [67, 19], [76, 17.5], [80, 15.5], [82, 12]],
    bot: [[0, 6], [3, 5], [79, 5], [82, 6.5]], belt: 19.5, glass: [3, 58], pillars: [14, 40], doors: [24, 40, 56],
    head: [76, 13, 5, 3], tail: [0, 16, 2, 6], grille: [77, 7, 5, 4], wing: 4, mirror: 57,
    w: 1040, cd: 0.30, area: 2.25, safety: 64, comfort: 60, prac: 86, style: 45, cost: 7600, tech: 'ch_wagon' },
  mpv: { cls: 'family', name: 'Van', L: 80, wr: 14, wf: 64, drive: 'FWD', eng: 'front',
    top: [[0, 13], [0.5, 24], [2, 31], [6, 33], [40, 33.5], [48, 31], [58, 23], [66, 19.5], [75, 17.5], [79, 15], [80, 12]],
    bot: [[0, 6.5], [3, 5.5], [77, 5.5], [80, 7]], belt: 20, glass: [2, 57], pillars: [16, 38], doors: [20, 38, 56],
    head: [74, 13, 5, 3], tail: [0, 17, 2, 7], grille: [75, 7, 5, 4], wing: 3, mirror: 56,
    w: 1100, cd: 0.33, area: 2.6, safety: 66, comfort: 64, prac: 96, style: 34, cost: 8200, tech: 'ch_mpv' },
  // --- SUV ---
  suv: { cls: 'suv', name: 'SUV', L: 84, wr: 16, wf: 67, drive: 'AWD', eng: 'front',
    top: [[0, 15], [0.5, 25], [2, 33], [6, 35.5], [14, 36], [46, 36], [53, 33], [61, 27], [68, 25], [78, 23.5], [82, 21], [84, 16]],
    bot: [[0, 9], [3, 8], [81, 8], [84, 10]], belt: 26, glass: [3, 59], pillars: [15, 40], doors: [25, 41, 57],
    head: [78, 19, 5, 3], tail: [0, 21, 2, 6], grille: [78, 11, 6, 6], wing: 4, mirror: 58,
    w: 1350, cd: 0.36, area: 2.7, safety: 72, comfort: 65, prac: 85, style: 55, cost: 12000, tech: 'ch_suv' },
  offroad: { cls: 'suv', name: 'Geländewagen', L: 80, wr: 15, wf: 64, drive: 'AWD', eng: 'front', spare: true,
    top: [[0, 14], [0, 34], [1, 36], [44, 36], [47, 35], [52, 28], [56, 26.5], [76, 26], [79, 24.5], [80, 14]],
    bot: [[0, 10], [2, 9], [78, 9], [80, 10]], belt: 27, glass: [2, 50], pillars: [16, 34], doors: [22, 35, 50],
    head: [76, 20, 4, 4], tail: [0, 20, 2, 6], grille: [76, 12, 4, 8], wing: 3, mirror: 50,
    w: 1450, cd: 0.42, area: 2.9, safety: 68, comfort: 50, prac: 76, style: 60, cost: 12500, tech: 'ch_offroad' },
  suvcoupe: { cls: 'suv', name: 'SUV-Coupé', L: 86, wr: 16, wf: 69, drive: 'AWD', eng: 'front',
    top: [[0, 15], [1, 22], [4, 26], [12, 30], [24, 34], [44, 35], [52, 32.5], [61, 27], [69, 25], [80, 23.5], [84, 20.5], [86, 16]],
    bot: [[0, 9], [3, 8], [83, 8], [86, 10]], belt: 25.5, glass: [13, 59], pillars: [39], doors: [26, 40, 57],
    head: [80, 19, 5, 3], tail: [0, 20, 3, 4], grille: [80, 11, 6, 6], wing: 4, mirror: 58,
    w: 1380, cd: 0.34, area: 2.6, safety: 70, comfort: 62, prac: 70, style: 68, cost: 13500, tech: 'ch_suvcoupe' },
  // --- Sportcoupés ---
  coupe: { cls: 'sport', name: 'Coupé', L: 84, wr: 15, wf: 67, drive: 'RWD', eng: 'front', vent: true,
    top: [[0, 11], [1, 15.5], [3, 17.5], [12, 18.5], [18, 20], [26, 24.5], [34, 26.5], [44, 26.5], [50, 24.5], [57, 19], [66, 16], [76, 14], [81, 12], [84, 9]],
    bot: [[0, 5], [4, 3.5], [80, 3.5], [84, 4.5]], belt: 17.5, glass: [22, 55], pillars: [30], doors: [30, 57],
    head: [77, 11, 6, 2], tail: [0, 13, 2, 3], grille: [79, 5, 5, 3], wing: 5, mirror: 54,
    w: 1050, cd: 0.31, area: 2.0, safety: 55, comfort: 48, prac: 30, style: 75, cost: 14000, tech: 'ch_sport' },
  fastback: { cls: 'sport', name: 'Fastback', L: 86, wr: 15, wf: 69, drive: 'RWD', eng: 'front', vent: true,
    top: [[0, 11.5], [1, 16], [4, 18], [12, 20], [22, 23], [32, 26], [42, 27], [50, 25.5], [57, 20], [66, 16.5], [78, 14], [83, 12], [86, 9]],
    bot: [[0, 5], [4, 3.5], [82, 3.5], [86, 4.5]], belt: 17.5, glass: [17, 56], pillars: [32], doors: [32, 58],
    head: [79, 11, 6, 2], tail: [0, 13, 2, 3], grille: [81, 5, 5, 3], wing: 4, mirror: 55,
    w: 1080, cd: 0.30, area: 2.0, safety: 56, comfort: 50, prac: 32, style: 80, cost: 15000, tech: 'ch_fastback' },
  roadster: { cls: 'sport', name: 'Roadster', L: 80, wr: 14, wf: 64, drive: 'RWD', eng: 'front', open: true,
    top: [[0, 11], [2, 16], [10, 17.5], [26, 18], [29, 20], [32, 21], [34, 20], [36, 18.5], [44, 18.5], [47, 21.5], [49, 22], [51, 19], [54, 16.5], [64, 15], [74, 13], [78, 11], [80, 8]],
    bot: [[0, 5], [4, 3.5], [76, 3.5], [80, 4.5]], belt: 16.5, glass: [46, 52], pillars: [], doors: [36, 54],
    head: [73, 10, 6, 2], tail: [0, 12, 2, 3], grille: [75, 5, 5, 3], wing: 5, mirror: 52,
    w: 980, cd: 0.34, area: 1.9, safety: 48, comfort: 45, prac: 20, style: 85, cost: 14500, tech: 'ch_roadster' },
  // --- Supersportwagen ---
  wedge: { cls: 'super', name: 'Keil', L: 90, wr: 16, wf: 71, drive: 'RWD', eng: 'mid',
    top: [[0, 9.5], [1, 15], [3, 17], [14, 18], [24, 20], [32, 23.5], [40, 25], [46, 24.5], [52, 22], [59, 17], [64, 14], [76, 12], [86, 10], [90, 7]],
    bot: [[0, 4.5], [4, 3], [86, 3], [90, 4]], belt: 16.5, glass: [32, 60], pillars: [], doors: [36, 58],
    head: [82, 9, 6, 2], tail: [0, 12, 2, 3], grille: [84, 4, 5, 3], intake: [26, 7, 7, 6], wing: 6, mirror: 58,
    w: 1050, cd: 0.30, area: 1.95, safety: 58, comfort: 40, prac: 15, style: 90, cost: 45000, tech: 'ch_super' },
  midship: { cls: 'super', name: 'Mittelmotor', L: 92, wr: 17, wf: 72, drive: 'RWD', eng: 'mid',
    top: [[0, 10], [1, 15.5], [5, 17.5], [16, 18.5], [26, 21], [34, 24], [42, 25.5], [48, 25], [55, 21], [61, 16], [66, 14], [78, 12.5], [87, 10.5], [92, 7.5]],
    bot: [[0, 4.5], [4, 3], [88, 3], [92, 4]], belt: 16.5, glass: [31, 61], pillars: [], doors: [36, 60],
    head: [84, 9.5, 6, 2], tail: [0, 12, 2, 3], grille: [86, 4, 5, 3], intake: [26, 7, 7, 7], wing: 6, mirror: 59,
    w: 1080, cd: 0.29, area: 1.95, safety: 60, comfort: 42, prac: 15, style: 92, cost: 50000, tech: 'ch_midship' },
  gt: { cls: 'super', name: 'Gran Turismo', L: 94, wr: 18, wf: 76, drive: 'RWD', eng: 'front', vent: true,
    top: [[0, 11], [1, 16], [4, 18], [14, 19], [22, 21], [30, 25], [38, 26.5], [46, 26], [52, 23], [58, 18.5], [66, 16], [80, 14.5], [89, 12.5], [94, 9]],
    bot: [[0, 5], [4, 3], [90, 3], [94, 4.5]], belt: 17.5, glass: [24, 56], pillars: [37], doors: [37, 60],
    head: [86, 11, 7, 2], tail: [0, 13, 2, 3], grille: [89, 5, 5, 4], wing: 6, mirror: 55,
    w: 1200, cd: 0.30, area: 2.0, safety: 62, comfort: 56, prac: 25, style: 88, cost: 48000, tech: 'ch_gt' },
  // --- Hypercars ---
  hyperA: { cls: 'hyper', name: 'Hyper Klinge', L: 98, wr: 18, wf: 77, drive: 'AWD', eng: 'mid',
    top: [[0, 9], [1, 14], [6, 16], [18, 17], [28, 19.5], [38, 23], [45, 24.5], [52, 24], [58, 20.5], [64, 15.5], [70, 13], [84, 11], [94, 9], [98, 6]],
    bot: [[0, 4], [5, 2], [94, 2], [98, 3.5]], belt: 15.5, glass: [37, 64], pillars: [], doors: [40, 62],
    head: [89, 8, 7, 2], tail: [0, 11, 2, 3], grille: [91, 3, 6, 3], intake: [30, 6, 7, 7], wing: 7, mirror: 62,
    w: 1000, cd: 0.28, area: 1.9, safety: 64, comfort: 45, prac: 10, style: 96, cost: 150000, tech: 'ch_hyper' },
  hyperB: { cls: 'hyper', name: 'Hyper Haifisch', L: 100, wr: 19, wf: 79, drive: 'AWD', eng: 'mid', fin: true,
    top: [[0, 9.5], [1, 15], [8, 17], [20, 18], [30, 21], [40, 24], [47, 25], [54, 24.5], [60, 20], [66, 15], [72, 13], [86, 11.5], [96, 9], [100, 6]],
    bot: [[0, 4], [5, 2], [96, 2], [100, 3.5]], belt: 15.5, glass: [40, 66], pillars: [], doors: [42, 64],
    head: [91, 8.5, 7, 2], tail: [0, 11, 2, 3], grille: [93, 3, 6, 3], intake: [32, 6, 7, 7], wing: 7, mirror: 64,
    w: 980, cd: 0.27, area: 1.9, safety: 65, comfort: 44, prac: 10, style: 98, cost: 170000, tech: 'ch_hyperB' },
  lmp: { cls: 'hyper', name: 'Le-Mans-Prototyp', L: 104, wr: 20, wf: 82, drive: 'AWD', eng: 'mid', fin: true,
    top: [[0, 10], [1, 17], [10, 18], [24, 18.5], [34, 20], [42, 23.5], [50, 24], [56, 23], [62, 19], [68, 16], [76, 17.5], [84, 18], [90, 16], [98, 11], [104, 7]],
    bot: [[0, 4], [5, 2], [100, 2], [104, 3]], belt: 15.5, glass: [44, 64], pillars: [], doors: [44, 64],
    head: [95, 9, 7, 2], tail: [0, 12, 2, 3], grille: [97, 3, 6, 3], intake: [34, 6, 7, 7], wing: 8, mirror: 64,
    w: 900, cd: 0.26, area: 1.85, safety: 66, comfort: 35, prac: 8, style: 100, cost: 200000, tech: 'ch_lmp' }
};

// ---------- Lack, Streifen, Felgen, Reifen, Aero ----------
const PAINT_COLORS = ['#b13e53', '#8b1e2e', '#ef7d57', '#ffcd75', '#e8d44d', '#a7f070', '#38b764', '#0e5e3a', '#257179', '#73eff7',
  '#41a6f6', '#3b5dc9', '#29366f', '#5d275d', '#c040a0', '#f4f4f4', '#c0c4cc', '#94b0c2', '#566c86', '#333c57', '#1a1c2c', '#101014', '#8a5a3c', '#d48a3c'];
const PAINTS = {
  gloss:    { name: 'Glanz',    cost: 0,    style: 0,  tech: null },
  matte:    { name: 'Matt',     cost: 400,  style: 4,  tech: null },
  metallic: { name: 'Metallic', cost: 800,  style: 6,  tech: 'ch_metallic' },
  chrome:   { name: 'Chrom',    cost: 6000, style: 14, tech: 'ch_chrome' },
  pearl:    { name: 'Perleffekt', cost: 3000, style: 16, tech: 'shop_pearl' },
  satin:    { name: 'Seidenmatt', cost: 900,  style: 7,  tech: null },
  candy:    { name: 'Candy',      cost: 2500, style: 12, tech: 'ch_metallic' },
  carbon:   { name: 'Carbon-Folie', cost: 4000, style: 13, tech: 'ch_metallic' },
  chameleon:{ name: 'Chamäleon',  cost: 9000, style: 18, tech: 'ch_chrome' }
};
const STRIPES = {
  none: { name: 'Keine' }, side: { name: 'Seitenstreifen' }, double: { name: 'Doppelstreifen' },
  twotone: { name: 'Zweifarbig' }, racing: { name: 'Rennstreifen' }, checker: { name: 'Karo' }
};
const STICKERS = {
  none: { name: 'Keine', style: 0 }, sponsor: { name: 'Sponsor', style: 3 }, flames: { name: 'Flammen', style: 6 }, bolt: { name: 'Blitz', style: 5 },
  speed: { name: 'Speedlines', style: 6 }, splash: { name: 'Farbsplash', style: 7 },
  fade: { name: 'Farbverlauf', style: 7 }, diagonal: { name: 'Diagonalstreifen', style: 6 }, racing: { name: 'Renn-Livery', style: 9 }, camo: { name: 'Camouflage', style: 6 }, sakura: { name: 'Sakura', style: 8 }
};
const RIMS = {
  steel:   { name: 'Stahl',         w: 9,   cost: 80,   style: 0,  tech: null },
  five:    { name: '5-Speichen',    w: 8,   cost: 250,  style: 8,  tech: 'tun_rims' },
  multi:   { name: 'Vielspeichen',  w: 8,   cost: 320,  style: 10, tech: 'tun_rims' },
  mesh:    { name: 'Kreuzspeichen', w: 7.5, cost: 600,  style: 15, tech: 'tun_rims2' },
  dish:    { name: 'Tiefbett',      w: 8.5, cost: 550,  style: 14, tech: 'tun_rims2' },
  turbine: { name: 'Turbine',       w: 8,   cost: 700,  style: 16, tech: 'tun_rims2' },
  forged:  { name: 'Geschmiedet',   w: 5.5, cost: 1800, style: 20, tech: 'tun_forged' },
  star:    { name: 'Stern-7',       w: 7,   cost: 900,  style: 17, tech: 'tun_rims3' },
  split:   { name: 'Split-Speiche', w: 7,   cost: 1100, style: 18, tech: 'tun_rims3' },
  blade:   { name: 'Klinge',        w: 7.5, cost: 1300, style: 19, tech: 'tun_rims3' },
  dishmesh:{ name: 'Tiefbett-Mesh', w: 8,   cost: 1600, style: 22, tech: 'tun_rims3' }
};
const RIM_COLORS = ['#c8ccd4', '#2a2a30', '#d4a640', '#5a5e68', '#f4f4f4', '#b13e53', '#a0643c', '#41a6f6', '#a7f070', '#ff4bd0', '#c040ff', '#73eff7', '#ef7d57'];
// Street-Style: Bodykits und Neon-Unterbodenbeleuchtung
const KITS = {
  none: { name: 'Serie',    w: 0,  cost: 0,    style: 0,  df: 0,    tech: null },
  wide: { name: 'Widebody', w: 12, cost: 4000, style: 10, df: 0.02, tech: 'tun_kit' },
  race: { name: 'Rennkit',  w: 6,  cost: 7000, style: 12, df: 0.06, tech: 'tun_kit' }
};
const GLOWS = ['none', '#41a6f6', '#c040ff', '#ff4bd0', '#a7f070', '#73eff7', '#ef7d57', '#ffcd75', '#f4f4f4'];
const TIRES = [
  { inch: 15, grip: 0,     comfort: 6,  w: 0,  cost: 0 },
  { inch: 16, grip: 0.02,  comfort: 4,  w: 1,  cost: 120 },
  { inch: 17, grip: 0.04,  comfort: 2,  w: 2,  cost: 260 },
  { inch: 18, grip: 0.06,  comfort: 0,  w: 3,  cost: 420 },
  { inch: 19, grip: 0.075, comfort: -2, w: 4,  cost: 620 },
  { inch: 20, grip: 0.09,  comfort: -5, w: 5,  cost: 850 },
  { inch: 21, grip: 0.1,   comfort: -8, w: 7,  cost: 1150 }
];
const SPOILERS = {
  none:     { name: 'Keiner',        df: 0,    cd: 0,     w: 0,  cost: 0,     style: 0,  tech: null },
  ducktail: { name: 'Ducktail',      df: 0.03, cd: 0,     w: 3,  cost: 300,   style: 4,  tech: 'aero_spoiler' },
  low:      { name: 'Flügel klein',  df: 0.06, cd: 0.01,  w: 5,  cost: 600,   style: 5,  tech: 'aero_spoiler' },
  gt:       { name: 'GT-Flügel',     df: 0.14, cd: 0.025, w: 9,  cost: 2500,  style: 9,  tech: 'aero_gtwing' },
  swan:     { name: 'Schwanenhals',  df: 0.18, cd: 0.022, w: 8,  cost: 5000,  style: 11, tech: 'aero_swan' },
  active:   { name: 'Aktiv-Aero',    df: 0.2,  cd: 0.008, w: 12, cost: 12000, style: 12, tech: 'aero_active' }
};
const LIPS = {
  none:     { name: 'Keine',           df: 0,    cd: 0,      w: 0, cost: 0,    tech: null },
  lip:      { name: 'Frontlippe',      df: 0.02, cd: -0.003, w: 2, cost: 200,  tech: 'aero_lip' },
  splitter: { name: 'Splitter',        df: 0.05, cd: 0.004,  w: 4, cost: 800,  tech: 'aero_lip' },
  carbon:   { name: 'Carbon-Splitter', df: 0.06, cd: 0.002,  w: 2, cost: 2500, tech: 'ch_carbon' }
};
const SKIRTS = {
  none:   { name: 'Keine',            cd: 0,      w: 0, cost: 0,    tech: null },
  std:    { name: 'Schweller',        cd: -0.003, w: 4, cost: 300,  tech: 'aero_lip' },
  carbon: { name: 'Carbon-Schweller', cd: -0.004, w: 2, cost: 1500, tech: 'ch_carbon' }
};
const DIFFUSERS = {
  none:   { name: 'Keiner',  df: 0,    cd: 0,      w: 0, cost: 0,    tech: null },
  street: { name: 'Strasse', df: 0.03, cd: -0.002, w: 3, cost: 500,  tech: 'aero_diffuser' },
  race:   { name: 'Race',    df: 0.07, cd: -0.004, w: 5, cost: 2500, tech: 'aero_diffuser' }
};

// ---------- Interieur ----------
const INT_TIERS = {
  basic:   { name: 'Basic',   comfort: 0,   w: 0,   cost: 0,    tech: null,        desc: 'Einfach und günstig.' },
  komfort: { name: 'Komfort', comfort: 12,  w: 25,  cost: 1200, tech: null,        desc: 'Klima, Dämmung, Infotainment.' },
  luxus:   { name: 'Luxus',   comfort: 28,  w: 70,  cost: 6000, tech: 'int_luxus', desc: 'Lockt Familien & Hypercar-Käufer.' },
  race:    { name: 'Race',    comfort: -15, w: -60, cost: 4000, tech: 'int_race',  desc: 'Leicht! Lockt Sportfahrer.' }
};
const SEATS = {
  cloth:   { name: 'Stoff',          comfort: 0,  w: 0,   cost: 0,    tech: null },
  leather: { name: 'Leder',          comfort: 6,  w: 8,   cost: 900,  tech: 'int_leather' },
  premium: { name: 'Premium-Leder',  comfort: 12, w: 14,  cost: 3500, tech: 'int_premium' },
  sport:   { name: 'Sportschalen',   comfort: -4, w: -12, cost: 1500, tech: 'int_race' },
  carbon:  { name: 'Carbon-Schalen', comfort: -8, w: -25, cost: 6000, tech: 'int_carbon' }
};
const STEER = {
  standard: { name: 'Standard',    comfort: 0,  cost: 0,    tech: null },
  sport:    { name: 'Sport',       comfort: 1,  cost: 400,  tech: 'int_leather' },
  race:     { name: 'Rennlenkrad', comfort: -2, cost: 1800, tech: 'int_race' }
};
const DASHES = {
  analog:  { name: 'Analog',  comfort: 0, w: 0,  cost: 0,    tech: null },
  digital: { name: 'Digital', comfort: 4, w: 0,  cost: 900,  tech: 'int_digital' },
  carbon:  { name: 'Carbon',  comfort: 2, w: -8, cost: 3000, tech: 'int_carbon' }
};
const SEAT_COLORS = ['#2a2a30', '#5a3a28', '#8b1e2e', '#d8c8a8', '#f4f4f4', '#29366f', '#ef7d57', '#566c86'];
const AMBIENTS = ['none', '#41a6f6', '#b13e53', '#a7f070', '#ffcd75', '#c040ff', '#73eff7', '#f4f4f4'];

// ---------- Motoren ----------
// ppl = PS pro Liter (Sauger), red = Drehzahlgrenze, u0 = Lage des Drehmomentmaximums
const ENGINE_TYPES = {
  i4:     { name: 'Reihe-4',  cyl: 4,  dmin: 1.0, dmax: 2.5, ppl: 78,  w0: 90,  wpl: 15, red: 6800,  cost: 1800,  cpl: 500,  rel: 88, tech: null },
  i6:     { name: 'Reihe-6',  cyl: 6,  dmin: 2.5, dmax: 4.0, ppl: 84,  w0: 140, wpl: 15, red: 7200,  cost: 4500,  cpl: 800,  rel: 90, tech: 'eng_v6' },
  rotary: { name: 'Kreiskolben', cyl: 2, dmin: 1.3, dmax: 2.6, ppl: 112, w0: 75,  wpl: 20, red: 9000,  cost: 5000,  cpl: 1600, rel: 70, tech: 'eng_v6' },
  flat6:  { name: 'Boxer-6',  cyl: 6,  dmin: 3.0, dmax: 4.0, ppl: 90,  w0: 130, wpl: 15, red: 7800,  cost: 6500,  cpl: 1000, rel: 86, tech: 'eng_v6' },
  v6:     { name: 'V6',       cyl: 6,  dmin: 2.5, dmax: 4.0, ppl: 80,  w0: 120, wpl: 15, red: 7000,  cost: 3500,  cpl: 700,  rel: 85, tech: 'eng_v6' },
  v8:     { name: 'V8',       cyl: 8,  dmin: 3.5, dmax: 7.0, ppl: 82,  w0: 150, wpl: 18, red: 7200,  cost: 6000,  cpl: 900,  rel: 83, tech: 'eng_v8' },
  v10:    { name: 'V10',      cyl: 10, dmin: 4.5, dmax: 6.0, ppl: 95,  w0: 180, wpl: 16, red: 8700,  cost: 15000, cpl: 1800, rel: 80, tech: 'eng_v10' },
  v12:    { name: 'V12',      cyl: 12, dmin: 5.0, dmax: 7.0, ppl: 98,  w0: 200, wpl: 18, red: 9000,  cost: 30000, cpl: 3000, rel: 78, tech: 'eng_v12' },
  w16:    { name: 'W16',      cyl: 16, dmin: 7.0, dmax: 8.5, ppl: 100, w0: 300, wpl: 20, red: 7000,  cost: 80000, cpl: 6000, rel: 74, tech: 'eng_w16' },
  ev:     { name: 'Elektro',  cyl: 0,  dmin: 40,  dmax: 120, ppl: 4.5, w0: 80,  wpl: 5,  red: 20000, cost: 6000,  cpl: 220,  rel: 92, tech: 'eng_ev' },
  hybrid: { name: 'Hybrid',   cyl: 4,  dmin: 1.5, dmax: 4.0, ppl: 78,  w0: 230, wpl: 15, red: 6600,  cost: 9000,  cpl: 900,  rel: 84, tech: 'eng_hybrid' }
};
const INDUCTIONS = {
  none:  { name: 'Sauger',     mul: 1.0,  u0: 0.68, w: 0,  cost: 0,    rel: 0, cons: 1.0,  red: 0,    tech: null },
  turbo: { name: 'Turbo',      mul: 1.4,  u0: 0.45, w: 12, cost: 1500, rel: 4, cons: 1.05, red: -300, tech: 'eng_turbo' },
  twin:  { name: 'Twin-Turbo', mul: 1.6,  u0: 0.5,  w: 22, cost: 3500, rel: 7, cons: 1.1,  red: -200, tech: 'eng_twinturbo' },
  super: { name: 'Kompressor', mul: 1.35, u0: 0.42, w: 18, cost: 2500, rel: 5, cons: 1.12, red: -100, tech: 'eng_super' }
};
const MATERIALS = {
  steel: { name: 'Stahl',     wm: 1.0,  cm: 1.0,  rel: 3, red: 1.0,  tech: null },
  alu:   { name: 'Aluminium', wm: 0.78, cm: 1.35, rel: 0, red: 1.02, tech: 'eng_alu' },
  titan: { name: 'Titan',     wm: 0.65, cm: 2.2,  rel: 1, red: 1.06, tech: 'eng_titan' }
};
const EXHAUSTS = {
  stock:  { name: 'Serie',  mul: 1.0,  w: 0,  cost: 0,    rel: 0,  comfort: 0,  tech: null },
  sport:  { name: 'Sport',  mul: 1.03, w: -2, cost: 600,  rel: 0,  comfort: -1, tech: 'tun_exhaust' },
  race:   { name: 'Race',   mul: 1.06, w: -4, cost: 1800, rel: 2,  comfort: -5, tech: 'tun_exhaust' },
  titan:  { name: 'Titan',  mul: 1.06, w: -9, cost: 4500, rel: 1,  comfort: -4, tech: 'eng_titan' }
};
const NOS_TYPES = {
  none:  { name: 'Kein NOS', mul: 0,    dur: 0, cost: 0,    rel: 0, w: 0,  tech: null },
  small: { name: 'NOS klein', mul: 0.3,  dur: 4, cost: 1500, rel: 4, w: 10, tech: 'tun_nos' },
  big:   { name: 'NOS gross', mul: 0.55, dur: 5, cost: 4000, rel: 8, w: 18, tech: 'tun_nos2' }
};
const RATIOS = { short: { name: 'Kurz', final: 4.2, ev: 9.5 }, normal: { name: 'Normal', final: 3.7, ev: 8 }, long: { name: 'Lang', final: 3.2, ev: 6.5 } };
const EV_MOTORS = [0, 1.0, 1.6, 2.1, 2.6]; // Leistungsfaktor je Motorenanzahl

// ---------- Forschung (Technologiebaum wie ARK-Engramme) ----------
const TECH_CATS = [
  { id: 'eng', name: 'Motoren' }, { id: 'ch', name: 'Chassis & Karosserie' }, { id: 'aero', name: 'Aerodynamik' },
  { id: 'int', name: 'Interieur' }, { id: 'tun', name: 'Tuning' }, { id: 'prod', name: 'Produktion' }, { id: 'mkt', name: 'Marketing' }
];
// fx = Zahlenboni: psMul, wMul, cdMul, grip, prodSpeed, costMul, demand, repGain, safety, rel
const TECHS = [
  // Motoren
  { id: 'eng_v6', cat: 'eng', name: 'V6-Motor', lvl: 3, cost: 1, req: [], desc: 'Schaltet V6-Motoren frei.' },
  { id: 'eng_turbo', cat: 'eng', name: 'Turbolader', lvl: 4, cost: 2, req: [], desc: '+40 % Leistung per Abgasturbine.' },
  { id: 'eng_alu', cat: 'eng', name: 'Aluminium-Block', lvl: 5, cost: 2, req: [], desc: 'Leichtere Motoren (-22 %).' },
  { id: 'eng_tune1', cat: 'eng', name: 'Motoroptimierung I', lvl: 6, cost: 2, req: [], desc: '+5 % PS für alle Motoren.', fx: { psMul: 0.05 } },
  { id: 'eng_v8', cat: 'eng', name: 'V8-Motor', lvl: 7, cost: 2, req: ['eng_v6'], desc: 'Schaltet V8-Motoren frei.' },
  { id: 'eng_super', cat: 'eng', name: 'Kompressor', lvl: 8, cost: 2, req: ['eng_turbo'], desc: 'Sofortiger Ladedruck ohne Turboloch.' },
  { id: 'eng_twinturbo', cat: 'eng', name: 'Twin-Turbo', lvl: 10, cost: 3, req: ['eng_turbo'], desc: '+60 % Leistung mit zwei Turbos.' },
  { id: 'eng_hybrid', cat: 'eng', name: 'Hybrid-Antrieb', lvl: 11, cost: 3, req: ['eng_turbo'], desc: 'Benziner plus E-Motor, sehr sparsam.' },
  { id: 'eng_ev', cat: 'eng', name: 'Elektro-Antrieb', lvl: 13, cost: 3, req: ['eng_hybrid'], desc: 'Batterie & E-Motoren, sofortiges Drehmoment.' },
  { id: 'eng_tune2', cat: 'eng', name: 'Motoroptimierung II', lvl: 14, cost: 3, req: ['eng_tune1'], desc: '+8 % PS für alle Motoren.', fx: { psMul: 0.08 } },
  { id: 'eng_v10', cat: 'eng', name: 'V10-Motor', lvl: 15, cost: 3, req: ['eng_v8'], desc: 'Hochdrehender Zehnzylinder.' },
  { id: 'eng_titan', cat: 'eng', name: 'Titan-Bauteile', lvl: 16, cost: 3, req: ['eng_alu'], desc: 'Titan-Motoren & Titan-Auspuff.' },
  { id: 'eng_v12', cat: 'eng', name: 'V12-Motor', lvl: 19, cost: 4, req: ['eng_v10'], desc: 'Der König der Sauger.' },
  { id: 'eng_evmulti', cat: 'eng', name: 'Mehrmotor-EV', lvl: 21, cost: 4, req: ['eng_ev'], desc: 'Drei und vier E-Motoren.' },
  { id: 'eng_tune3', cat: 'eng', name: 'Motoroptimierung III', lvl: 23, cost: 4, req: ['eng_tune2'], desc: '+10 % PS für alle Motoren.', fx: { psMul: 0.1 } },
  { id: 'eng_w16', cat: 'eng', name: 'W16-Motor', lvl: 25, cost: 5, req: ['eng_v12', 'eng_twinturbo'], desc: 'Sechzehn Zylinder, absolute Spitze.' },
  // Chassis & Karosserie
  { id: 'ch_metallic', cat: 'ch', name: 'Metallic-Lack', lvl: 2, cost: 1, req: [], desc: 'Glitzernder Metallic-Lack.' },
  { id: 'ch_hatch5', cat: 'ch', name: 'Hatch 5-Türer', lvl: 2, cost: 1, req: [], desc: 'Praktischer Kleinwagen.' },
  { id: 'ch_family', cat: 'ch', name: 'Familienautos', lvl: 3, cost: 2, req: [], desc: 'Klasse Familienauto: Limousine.' },
  { id: 'ch_city', cat: 'ch', name: 'City-Floh', lvl: 4, cost: 1, req: [], desc: 'Kurzer Stadtflitzer.' },
  { id: 'ch_wagon', cat: 'ch', name: 'Kombi', lvl: 5, cost: 1, req: ['ch_family'], desc: 'Viel Platz für Familien.' },
  { id: 'ch_suv', cat: 'ch', name: 'SUVs', lvl: 6, cost: 2, req: ['ch_family'], desc: 'Klasse SUV mit Allradantrieb.' },
  { id: 'ch_safety', cat: 'ch', name: 'Sicherheitszelle', lvl: 6, cost: 2, req: [], desc: '+8 Sicherheit für alle Autos.', fx: { safety: 8 } },
  { id: 'ch_mpv', cat: 'ch', name: 'Van', lvl: 7, cost: 1, req: ['ch_wagon'], desc: 'Maximale Praktikabilität.' },
  { id: 'ch_sport', cat: 'ch', name: 'Sportcoupés', lvl: 9, cost: 2, req: [], desc: 'Klasse Sportcoupé mit Heckantrieb.' },
  { id: 'ch_offroad', cat: 'ch', name: 'Geländewagen', lvl: 9, cost: 1, req: ['ch_suv'], desc: 'Kantig, robust, mit Reserverad.' },
  { id: 'ch_light', cat: 'ch', name: 'Leichtbau-Chassis', lvl: 10, cost: 3, req: [], desc: '-8 % Karosseriegewicht.', fx: { wMul: -0.08 } },
  { id: 'ch_chrome', cat: 'ch', name: 'Chrom-Lack', lvl: 11, cost: 2, req: ['ch_metallic'], desc: 'Spiegelnder Chrom-Look.' },
  { id: 'ch_fastback', cat: 'ch', name: 'Fastback', lvl: 12, cost: 2, req: ['ch_sport'], desc: 'Fliessendes Sportheck.' },
  { id: 'ch_suvcoupe', cat: 'ch', name: 'SUV-Coupé', lvl: 12, cost: 1, req: ['ch_suv'], desc: 'SUV mit Coupé-Dach.' },
  { id: 'ch_roadster', cat: 'ch', name: 'Roadster', lvl: 14, cost: 2, req: ['ch_sport'], desc: 'Offener Zweisitzer.' },
  { id: 'ch_safety2', cat: 'ch', name: 'Crash-Struktur II', lvl: 15, cost: 2, req: ['ch_safety'], desc: '+8 Sicherheit für alle Autos.', fx: { safety: 8 } },
  { id: 'ch_super', cat: 'ch', name: 'Supersportwagen', lvl: 16, cost: 3, req: ['ch_sport'], desc: 'Klasse Supersportwagen.' },
  { id: 'ch_midship', cat: 'ch', name: 'Mittelmotor-Karosse', lvl: 18, cost: 2, req: ['ch_super'], desc: 'Kurvige Mittelmotor-Form.' },
  { id: 'ch_carbon', cat: 'ch', name: 'Carbon-Monocoque', lvl: 20, cost: 4, req: ['ch_light'], desc: '-15 % Gewicht, Carbon-Teile.', fx: { wMul: -0.15 } },
  { id: 'ch_gt', cat: 'ch', name: 'Gran Turismo', lvl: 20, cost: 2, req: ['ch_super'], desc: 'Lange Haube, viel Stil.' },
  { id: 'ch_hyper', cat: 'ch', name: 'Hypercars', lvl: 25, cost: 5, req: ['ch_super', 'ch_carbon'], desc: 'Klasse Hypercar – die Spitze.' },
  { id: 'ch_hyperB', cat: 'ch', name: 'Hyper Haifisch', lvl: 27, cost: 3, req: ['ch_hyper'], desc: 'Mit Haifischflosse.' },
  { id: 'ch_lmp', cat: 'ch', name: 'Le-Mans-Prototyp', lvl: 30, cost: 4, req: ['ch_hyperB'], desc: 'Strassenzugelassener Prototyp.' },
  // Aerodynamik
  { id: 'aero_lip', cat: 'aero', name: 'Lippe & Schweller', lvl: 3, cost: 1, req: [], desc: 'Frontlippe, Splitter, Schweller.' },
  { id: 'aero_spoiler', cat: 'aero', name: 'Heckspoiler', lvl: 5, cost: 1, req: [], desc: 'Ducktail und kleiner Flügel.' },
  { id: 'aero_diffuser', cat: 'aero', name: 'Diffusor', lvl: 8, cost: 2, req: ['aero_lip'], desc: 'Mehr Abtrieb am Heck.' },
  { id: 'aero_tunnel', cat: 'aero', name: 'Windkanal', lvl: 10, cost: 3, req: [], desc: '-8 % Luftwiderstand.', fx: { cdMul: -0.08 } },
  { id: 'aero_gtwing', cat: 'aero', name: 'GT-Flügel', lvl: 12, cost: 2, req: ['aero_spoiler'], desc: 'Grosser Flügel mit Endplatten.' },
  { id: 'aero_swan', cat: 'aero', name: 'Schwanenhals-Flügel', lvl: 17, cost: 2, req: ['aero_gtwing'], desc: 'Von oben montiert.' },
  { id: 'aero_tunnel2', cat: 'aero', name: 'CFD-Simulation', lvl: 19, cost: 3, req: ['aero_tunnel'], desc: '-7 % Luftwiderstand.', fx: { cdMul: -0.07 } },
  { id: 'aero_active', cat: 'aero', name: 'Aktiv-Aerodynamik', lvl: 23, cost: 4, req: ['aero_swan'], desc: 'Viel Abtrieb, wenig Widerstand.' },
  // Interieur
  { id: 'int_leather', cat: 'int', name: 'Leder & Sportlenkrad', lvl: 3, cost: 1, req: [], desc: 'Ledersitze und Sportlenkrad.' },
  { id: 'int_digital', cat: 'int', name: 'Digital-Cockpit', lvl: 6, cost: 1, req: [], desc: 'Digitale Instrumente.' },
  { id: 'int_ambient', cat: 'int', name: 'Ambientelicht', lvl: 7, cost: 1, req: ['int_digital'], desc: 'Farbige LED-Leisten.' },
  { id: 'int_luxus', cat: 'int', name: 'Luxus-Interieur', lvl: 8, cost: 2, req: ['int_leather'], desc: 'Stufe Luxus freischalten.' },
  { id: 'int_race', cat: 'int', name: 'Race-Interieur', lvl: 10, cost: 2, req: [], desc: 'Sportschalen, Rennlenkrad, Stufe Race.' },
  { id: 'int_rollcage', cat: 'int', name: 'Überrollkäfig', lvl: 12, cost: 2, req: ['int_race'], desc: 'Käfig: +Sicherheit, -Komfort.' },
  { id: 'int_carbon', cat: 'int', name: 'Carbon-Interieur', lvl: 14, cost: 2, req: ['int_race'], desc: 'Carbon-Schalen & Carbon-Armaturen.' },
  { id: 'int_premium', cat: 'int', name: 'Premium-Leder', lvl: 15, cost: 2, req: ['int_luxus'], desc: 'Gestepptes Premium-Leder.' },
  // Tuning
  { id: 'tun_rims', cat: 'tun', name: 'Leichtmetallfelgen', lvl: 2, cost: 1, req: [], desc: '5-Speichen & Vielspeichen.' },
  { id: 'tun_tires', cat: 'tun', name: 'Sportreifen', lvl: 4, cost: 2, req: [], desc: '+0.06 Grip.', fx: { grip: 0.06 } },
  { id: 'tun_exhaust', cat: 'tun', name: 'Sportauspuff', lvl: 4, cost: 1, req: [], desc: 'Sport- und Race-Auspuff.' },
  { id: 'tun_gear6', cat: 'tun', name: '6-Gang-Getriebe', lvl: 5, cost: 1, req: [], desc: 'Bis zu 6 Gänge.' },
  { id: 'tun_rims2', cat: 'tun', name: 'Designfelgen', lvl: 9, cost: 1, req: ['tun_rims'], desc: 'Kreuzspeichen, Tiefbett, Turbine.' },
  { id: 'tun_nos', cat: 'tun', name: 'NOS-System', lvl: 9, cost: 2, req: [], desc: 'Lachgas-Einspritzung (klein).' },
  { id: 'tun_gear8', cat: 'tun', name: '8-Gang-Getriebe', lvl: 11, cost: 2, req: ['tun_gear6'], desc: 'Bis zu 8 Gänge.' },
  { id: 'tun_radials', cat: 'tun', name: 'Drag-Radials', lvl: 13, cost: 2, req: ['tun_tires'], desc: '+0.1 Grip, Reifen heizen schneller.', fx: { grip: 0.1 } },
  { id: 'tun_dct', cat: 'tun', name: 'Doppelkupplung', lvl: 14, cost: 3, req: ['tun_gear8'], desc: 'Schaltzeit nur 0.08 s.' },
  { id: 'tun_forged', cat: 'tun', name: 'Schmiedefelgen', lvl: 15, cost: 2, req: ['tun_rims2'], desc: 'Ultraleichte Felgen.' },
  { id: 'tun_glow', cat: 'tun', name: 'Neon-Unterboden', lvl: 4, cost: 1, req: [], desc: 'Unterbodenbeleuchtung in vielen Farben.' },
  { id: 'tun_rims3', cat: 'tun', name: 'Street-Felgen', lvl: 6, cost: 1, req: ['tun_rims'], desc: 'Stern, Split, Klinge, Tiefbett-Mesh.' },
  { id: 'tun_kit', cat: 'tun', name: 'Bodykits', lvl: 7, cost: 2, req: [], desc: 'Widebody und Rennkit mit Nieten.' },
  { id: 'tun_airride', cat: 'tun', name: 'Luftfahrwerk', lvl: 8, cost: 1, req: [], desc: 'Tieferlegung bis 75 mm – richtig tief!' },
  { id: 'tun_nos2', cat: 'tun', name: 'NOS gross', lvl: 16, cost: 3, req: ['tun_nos'], desc: 'Grosse Lachgas-Flaschen.' },
  { id: 'tun_launch', cat: 'tun', name: 'Launch-Assistent', lvl: 18, cost: 2, req: ['tun_dct'], desc: 'Grüner Bereich beim Start breiter.' },
  // Produktion
  { id: 'prod_werkstatt', cat: 'prod', name: 'Werkstatt', lvl: 3, cost: 1, req: [], desc: 'Ausbau zur Werkstatt erlauben.' },
  { id: 'prod_qc', cat: 'prod', name: 'Qualitätskontrolle', lvl: 5, cost: 1, req: [], desc: 'QK-Upgrades in der Fabrik.' },
  { id: 'prod_robot', cat: 'prod', name: 'Roboter', lvl: 6, cost: 2, req: [], desc: '+25 % Produktionstempo.', fx: { prodSpeed: 0.25 } },
  { id: 'prod_fabrik', cat: 'prod', name: 'Fabrik', lvl: 8, cost: 2, req: ['prod_werkstatt'], desc: 'Ausbau zur Fabrik erlauben.' },
  { id: 'prod_lean', cat: 'prod', name: 'Lean Production', lvl: 9, cost: 2, req: [], desc: '-8 % Produktionskosten.', fx: { costMul: -0.08 } },
  { id: 'prod_gross', cat: 'prod', name: 'Grossfabrik', lvl: 15, cost: 3, req: ['prod_fabrik'], desc: 'Ausbau zur Grossfabrik erlauben.' },
  { id: 'prod_robot2', cat: 'prod', name: 'Roboter II', lvl: 18, cost: 3, req: ['prod_robot'], desc: '+35 % Produktionstempo.', fx: { prodSpeed: 0.35 } },
  { id: 'prod_lean2', cat: 'prod', name: 'Lean Production II', lvl: 20, cost: 3, req: ['prod_lean'], desc: '-10 % Produktionskosten.', fx: { costMul: -0.1 } },
  { id: 'prod_mega', cat: 'prod', name: 'Megafabrik', lvl: 24, cost: 4, req: ['prod_gross'], desc: 'Ausbau zur Megafabrik erlauben.' },
  // Marketing
  { id: 'mkt_radio', cat: 'mkt', name: 'Radiowerbung', lvl: 2, cost: 1, req: [], desc: 'Radio-Kampagnen.' },
  { id: 'mkt_social', cat: 'mkt', name: 'Social Media', lvl: 5, cost: 1, req: ['mkt_radio'], desc: 'Social-Media-Kampagnen.' },
  { id: 'mkt_dealer', cat: 'mkt', name: 'Händlernetz', lvl: 7, cost: 2, req: [], desc: '+20 % Nachfrage.', fx: { demand: 0.2 } },
  { id: 'mkt_influencer', cat: 'mkt', name: 'Influencer', lvl: 9, cost: 2, req: ['mkt_social'], desc: 'Influencer-Kampagnen.' },
  { id: 'mkt_brand', cat: 'mkt', name: 'Markenpflege', lvl: 11, cost: 2, req: [], desc: '+25 % Markenruf-Gewinn.', fx: { repGain: 0.25 } },
  { id: 'mkt_tv', cat: 'mkt', name: 'TV-Werbung', lvl: 12, cost: 2, req: ['mkt_radio'], desc: 'TV-Spots.' },
  { id: 'mkt_motorsport', cat: 'mkt', name: 'Motorsport', lvl: 17, cost: 3, req: ['mkt_tv'], desc: 'Motorsport-Sponsoring.' },
  { id: 'mkt_dealer2', cat: 'mkt', name: 'Weltweiter Vertrieb', lvl: 19, cost: 3, req: ['mkt_dealer'], desc: '+30 % Nachfrage.', fx: { demand: 0.3 } }
];
const TECH = Object.fromEntries(TECHS.map(t => [t.id, t]));

// ---------- Fabrikstufen ----------
const STAGES = [
  { name: 'Garage',      cost: 0,        maxLines: 1, rate: 1.0, rent: 400,   staff: 2,   wh: 8,   lineCost: 0,      tech: null,             lvl: 1 },
  { name: 'Werkstatt',   cost: 60000,    maxLines: 2, rate: 1.4, rent: 1500,  staff: 6,   wh: 20,  lineCost: 25000,  tech: 'prod_werkstatt', lvl: 3 },
  { name: 'Fabrik',      cost: 350000,   maxLines: 3, rate: 2.2, rent: 6000,  staff: 25,  wh: 60,  lineCost: 120000, tech: 'prod_fabrik',    lvl: 8 },
  { name: 'Grossfabrik', cost: 2000000,  maxLines: 5, rate: 3.5, rent: 25000, staff: 80,  wh: 150, lineCost: 500000, tech: 'prod_gross',     lvl: 15 },
  { name: 'Megafabrik',  cost: 12000000, maxLines: 8, rate: 5.5, rent: 90000, staff: 250, wh: 400, lineCost: 2000000, tech: 'prod_mega',     lvl: 24 }
];
const WAGE = 2400; // Lohn pro Mitarbeiter und Monat
const UPGRADES = {
  speed: { name: 'Tempo',        max: 5, base: 8000,  desc: '+20 % Produktionstempo je Stufe' },
  wh:    { name: 'Lager',        max: 5, base: 5000,  desc: '+50 % Lagerkapazität je Stufe' },
  qc:    { name: 'Qualität (QK)', max: 5, base: 10000, desc: '+3 Zuverlässigkeit, weniger Rückrufe', tech: 'prod_qc' }
};

// ---------- Kundengruppen ----------
const SEGMENTS = {
  family: { name: 'Familien',         size: 3.0,  sens: 3.0, desc: 'Sicherheit, Verbrauch, Komfort, Preis' },
  sport:  { name: 'Sportfahrer',      size: 1.2,  sens: 2.0, desc: 'PS, Beschleunigung, Speed, Stil' },
  hyper:  { name: 'Hypercar-Käufer',  size: 0.25, sens: 0.8, desc: 'Leistung, Exklusivität, Luxus' }
};

// ---------- Werbekampagnen ----------
const CAMPAIGNS = [
  { id: 'flyer',      name: 'Flyer',                 cost: 800,    days: 14, mult: 0.15, rep: 1,  xp: 20,  seg: { family: 1, sport: 0.6, hyper: 0 },   tech: null },
  { id: 'radio',      name: 'Radio',                 cost: 5000,   days: 21, mult: 0.3,  rep: 2,  xp: 50,  seg: { family: 1, sport: 0.8, hyper: 0.2 }, tech: 'mkt_radio' },
  { id: 'social',     name: 'Social Media',          cost: 12000,  days: 30, mult: 0.4,  rep: 3,  xp: 90,  seg: { family: 0.8, sport: 1.2, hyper: 0.5 }, tech: 'mkt_social' },
  { id: 'influencer', name: 'Influencer',            cost: 25000,  days: 20, mult: 0.55, rep: 4,  xp: 140, seg: { family: 0.4, sport: 1.5, hyper: 1 },   tech: 'mkt_influencer' },
  { id: 'tv',         name: 'TV-Spot',               cost: 40000,  days: 30, mult: 0.7,  rep: 5,  xp: 200, seg: { family: 1.3, sport: 1, hyper: 0.6 },   tech: 'mkt_tv' },
  { id: 'motorsport', name: 'Motorsport-Sponsoring', cost: 150000, days: 60, mult: 0.6,  rep: 12, xp: 400, seg: { family: 0.3, sport: 1.6, hyper: 1.6 }, tech: 'mkt_motorsport' }
];

// ---------- Zufallsereignisse ----------
// mod: Effekt für eine Anzahl Tage (demand = Nachfrage, fuel = Verbrauchsgewichtung, cost = Produktionskosten, speed = Tempo, ev = E-Autos)
const EVENTS = [
  { id: 'fuel_up',    title: 'Benzinpreis steigt!',         text: 'Sparsame Autos sind jetzt besonders gefragt (60 Tage).', mod: { fuel: 1.0, days: 60 }, bad: false },
  { id: 'fuel_down',  title: 'Benzin wird billiger',        text: 'Sportfahrer kaufen mehr (45 Tage).', mod: { sport: 0.25, days: 45 } },
  { id: 'review',     title: 'Testbericht lobt dein Auto!', text: '', special: 'review', good: true },
  { id: 'badreview',  title: 'Kritischer Testbericht',      text: '', special: 'badreview', bad: true },
  { id: 'recall',     title: 'Rückruf wegen Defekt!',       text: '', special: 'recall', bad: true },
  { id: 'boom',       title: 'Wirtschaftsboom',             text: 'Alle kaufen mehr Autos (30 Tage).', mod: { demand: 0.3, days: 30 }, good: true },
  { id: 'recession',  title: 'Rezession',                   text: 'Die Nachfrage sinkt (40 Tage).', mod: { demand: -0.25, days: 40 }, bad: true },
  { id: 'carshow',    title: 'Einladung zur Automesse',     text: 'Dein Stand war ein Erfolg: +3 Markenruf, +150 XP.', special: 'carshow', good: true },
  { id: 'supplier',   title: 'Zulieferer erhöht Preise',    text: 'Produktion kostet 12 % mehr (30 Tage).', mod: { cost: 0.12, days: 30 }, bad: true },
  { id: 'investor',   title: 'Investor steigt ein',         text: '', special: 'investor', good: true },
  { id: 'strike',     title: 'Streik in der Fabrik',        text: 'Produktion läuft mit halbem Tempo (7 Tage).', mod: { speed: -0.5, days: 7 }, bad: true },
  { id: 'viral',      title: 'Video geht viral!',           text: 'Ein Burnout-Video deiner Firma: +4 Ruf, Sportfahrer +40 % (14 Tage).', mod: { sport: 0.4, days: 14 }, rep: 4, good: true },
  { id: 'evsub',      title: 'E-Auto-Förderung',            text: 'Elektro- und Hybridautos +50 % Nachfrage (60 Tage).', mod: { ev: 0.5, days: 60 }, good: true }
];

// ---------- Erfolge ----------
const ACHIEVEMENTS = [
  { id: 'model1',   name: 'Designer',           desc: 'Speichere dein erstes eigenes Modell.', reward: 2000 },
  { id: 'sale1',    name: 'Erster Kunde',       desc: 'Verkaufe ein Auto.', reward: 1000 },
  { id: 'sale100',  name: 'Serienhersteller',   desc: 'Verkaufe 100 Autos.', reward: 20000 },
  { id: 'sale1000', name: 'Massenmarkt',        desc: 'Verkaufe 1000 Autos.', reward: 250000 },
  { id: 'money1m',  name: 'Millionär',          desc: 'Besitze $1 Mio.', reward: 0 },
  { id: 'money10m', name: 'Multimillionär',     desc: 'Besitze $10 Mio.', reward: 0 },
  { id: 'lvl10',    name: 'Aufsteiger',         desc: 'Erreiche Level 10.', reward: 30000 },
  { id: 'lvl25',    name: 'Industrie-Legende',  desc: 'Erreiche Level 25.', reward: 500000 },
  { id: 'race1',    name: 'Grünes Licht',       desc: 'Gewinne ein Drag Race.', reward: 2000 },
  { id: 'race10',   name: 'Strassenkönig',      desc: 'Gewinne 10 Drag Races.', reward: 25000 },
  { id: 'q10',      name: 'Zehn-Sekunden-Auto', desc: 'Fahre die 1/4 Meile unter 10 s.', reward: 40000 },
  { id: 'q8',       name: 'Raketenstart',       desc: 'Fahre die 1/4 Meile unter 8 s.', reward: 200000 },
  { id: 'react',    name: 'Reflexe',            desc: 'Reaktionszeit unter 0.050 s.', reward: 5000 },
  { id: 'rep50',    name: 'Bekannte Marke',     desc: 'Markenruf 50 erreichen.', reward: 15000 },
  { id: 'rep90',    name: 'Kultmarke',          desc: 'Markenruf 90 erreichen.', reward: 300000 },
  { id: 'mega',     name: 'Megafabrik',         desc: 'Baue die Megafabrik.', reward: 0 },
  { id: 'hyper',    name: 'Hypercar-Hersteller', desc: 'Speichere ein Hypercar-Modell.', reward: 100000 },
  { id: 'v12',      name: 'Zwölf Töpfe',        desc: 'Baue einen V12- oder W16-Motor.', reward: 20000 },
  { id: 'ads',      name: 'Werbeprofi',         desc: 'Starte jede Kampagnenart einmal.', reward: 50000 },
  { id: 'tech20',   name: 'Forscher',           desc: 'Erforsche 20 Technologien.', reward: 50000 },
  { id: 'gem',      name: 'Schatzsucher',       desc: 'Finde einen Scheunenfund auf dem Schrottplatz.', reward: 10000 },
  { id: 'champ',    name: 'Champion',           desc: 'Gewinne eine Saison der Drag-Liga.', reward: 25000 },
  { id: 'tuner',    name: 'Tuning-Freak',       desc: 'Baue 10 Tuning-Stufen in ein Modell.', reward: 20000 },
  { id: 'flip5',    name: 'Schrotthändler',     desc: 'Verkaufe 5 Gebrauchtwagen mit Gewinn.', reward: 15000 }
];

// ---------- KI-Gegner für Drag Races (erfundene Marken) ----------
function oppEngine(type, disp, ind, mat, gears, nos = 'none', motors = 1, ratio = 'normal') {
  return { id: 'ai', name: '', type, disp, ind, mat, exh: 'sport', nos, gears, ratio, motors };
}
function oppDesign(cls, body, color, color2, extra = {}) {
  return Object.assign({ id: 'ai', name: '', cls, body, color, color2, stripe: 'none', paint: 'gloss', rim: 'five', rimColor: '#c8ccd4', tire: 3,
    spoiler: 'none', lip: 'none', skirts: 'none', diffuser: 'none', ride: 0, tint: 2, number: 0, numStyle: 'circle', sticker: 'none',
    interior: { tier: 'basic', seats: 'cloth', seatColor: '#2a2a30', steer: 'standard', dash: 'analog', ambient: 'none', cage: false } }, extra);
}
const OPPONENTS = [
  { id: 'rookie', name: 'Rookie Rudi', brand: 'Vortek Pico', lvl: 1, fee: 0, prize: 1500, xp: 40, rep: 0.5, react: [0.32, 0.55], skill: 0.35,
    design: oppDesign('small', 'hatch3', '#ef7d57', '#f4f4f4', { stripe: 'side', rim: 'steel', tire: 1 }), engine: oppEngine('i4', 1.4, 'none', 'steel', 5) },
  { id: 'street', name: 'Street Sarah', brand: 'Kessler Rapido', lvl: 4, fee: 1000, prize: 6000, xp: 90, rep: 1, react: [0.22, 0.4], skill: 0.55,
    design: oppDesign('small', 'hatch5', '#3b5dc9', '#f4f4f4', { stripe: 'racing', number: 7, spoiler: 'ducktail', ride: -1 }), engine: oppEngine('i4', 2.0, 'turbo', 'steel', 6) },
  { id: 'pro', name: 'Pro Paolo', brand: 'Aurion Vex S', lvl: 9, fee: 5000, prize: 25000, xp: 180, rep: 2, react: [0.15, 0.3], skill: 0.7,
    design: oppDesign('sport', 'coupe', '#ffcd75', '#1a1c2c', { stripe: 'double', rim: 'multi', spoiler: 'low', lip: 'splitter', ride: -2, number: 21 }), engine: oppEngine('v8', 5.0, 'none', 'alu', 6) },
  { id: 'legend', name: 'Legende Lena', brand: 'Raijin Kaze', lvl: 15, fee: 20000, prize: 90000, xp: 350, rep: 3, react: [0.1, 0.22], skill: 0.82,
    design: oppDesign('sport', 'fastback', '#73eff7', '#5d275d', { stripe: 'side', paint: 'metallic', rim: 'mesh', rimColor: '#2a2a30', spoiler: 'gt', lip: 'splitter', skirts: 'std', ride: -3, tire: 5, number: 44 }),
    engine: oppEngine('v8', 6.0, 'twin', 'alu', 7, 'small') },
  { id: 'boss', name: 'Boss Tanaka', brand: 'Volkara Z9', lvl: 22, fee: 80000, prize: 350000, xp: 800, rep: 5, react: [0.06, 0.16], skill: 0.9,
    design: oppDesign('super', 'wedge', '#101014', '#b13e53', { stripe: 'racing', paint: 'matte', rim: 'forged', rimColor: '#b13e53', spoiler: 'swan', lip: 'carbon', skirts: 'carbon', diffuser: 'race', ride: -3, tire: 5, number: 1 }),
    engine: oppEngine('v10', 5.5, 'twin', 'titan', 8, 'small') },
  { id: 'king', name: 'Drag King Kova', brand: 'Stellmark Omega', lvl: 28, fee: 250000, prize: 1200000, xp: 2000, rep: 8, react: [0.03, 0.1], skill: 0.96,
    design: oppDesign('hyper', 'hyperB', '#f4f4f4', '#3b5dc9', { stripe: 'racing', paint: 'chrome', rim: 'forged', rimColor: '#2a2a30', spoiler: 'active', lip: 'carbon', skirts: 'carbon', diffuser: 'race', ride: -3, tire: 6, number: 0 }),
    engine: oppEngine('w16', 8.0, 'twin', 'titan', 8, 'big') }
];
