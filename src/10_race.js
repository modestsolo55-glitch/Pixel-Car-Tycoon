/* =============================================================================
   Teil 10: Drag Race – Seitenansicht mit Parallax, Christmas Tree, Cockpit-HUD,
   Burnout, Kupplung, Schalten, NOS, Rauch & Flammen, KI-Gegner, Ergebnis
   ============================================================================= */
let RW_ = 320; const RW0 = 320, RH_ = 180, HUD_Y = 126, PPM = 18;   // RW_ = sichtbare Szenenbreite (wird beim Cruise-Zoom grösser)   // Canvas-Grösse, HUD-Start, Pixel pro Meter
const LANE_FAR = 91, LANE_NEAR = 121;                   // Boden-y der Spuren
let RACE = null, AUD = null;

/** gefüllter Pixel-Kreis direkt auf Canvas (HD: aus Zwischenspeicher kopiert) */
const _discCache = new Map();
function ctxDisc(ctx, cx, cy, r, col) {
  const M = ctx.getTransform();
  if (M.a >= 2) {
    const rr = Math.round(r * M.a * 4) / 4, RR = Math.ceil(rr), key = col + '|' + rr;
    let c = _discCache.get(key);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = RR * 2 + 1;
      const g = c.getContext('2d'); g.fillStyle = col;
      for (let y = -RR; y <= RR; y++) { const w = Math.floor(Math.sqrt(Math.max(0, rr * rr - y * y))); g.fillRect(RR - w, RR + y, w * 2 + 1, 1); }
      if (_discCache.size > 400) _discCache.clear();
      _discCache.set(key, c);
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(c, Math.round(M.a * cx + M.e) - RR, Math.round(M.d * cy + M.f) - RR);
    ctx.restore(); return;
  }
  ctx.fillStyle = col;
  const R = Math.ceil(r);
  for (let y = -R; y <= R; y++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y))); if (w >= 0) ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); }
}

// ---------- Rennstrecken (Tag / Abend / Nacht) ----------
const TRACKS = {
  sunset: { name: 'Sunset Strip', desc: 'Abendrot am Stadtrand', skyTop: [41, 54, 111], skyBot: [239, 125, 87], sun: [250, 44, '#ffcd75', '#fff0b0'], cloud: '#ef9d87',
    hills: '#5d275d', bld: ['#29366f', '#333c57'], win: ['#ffcd75'], wall: ['#94b0c2', '#c8ccd4', '#566c86'], night: false },
  desert: { name: 'Wüsten-Strip', desc: 'Pralle Mittagssonne zwischen Tafelbergen', skyTop: [48, 140, 230], skyBot: [196, 228, 250], sun: [54, 18, '#fff4c8', '#ffffff'], cloud: '#f4f4f4',
    hills: '#c0703a', mesa: true, bld: null, win: null, wall: ['#d8b078', '#f0d8a8', '#9a7048'], night: false },
  night: { name: 'Neon City', desc: 'Nachtrennen unter Flutlicht – mit Scheinwerfern', skyTop: [6, 8, 20], skyBot: [44, 28, 78], moon: true, cloud: null,
    hills: '#14182a', bld: ['#1a1c2c', '#22263a'], win: ['#73eff7', '#c040ff', '#ffcd75', '#ff6ac1'], wall: ['#3a4060', '#5a6488', '#22263a'], night: true, lvl: 3, prizeMul: 1.1 },
  airfield: { name: 'Flugplatz', desc: 'Rennen auf der Startbahn – Jets im Tiefflug', lvl: 5, prizeMul: 1.15, skyTop: [80, 140, 215], skyBot: [210, 226, 238], sun: [280, 20, '#fff4c8', '#ffffff'], cloud: '#f4f4f4',
    hills: '#6a8a5a', scene: 'hangar', plane: true, wall: ['#a8acb8', '#d0d4dc', '#566c86'], asph: [62, 62, 68] },
  samui: { name: 'Koh Samui – Lamai', desc: 'Durch Lamai: Meer, Palmen und bunte Shophouses', lvl: 7, prizeMul: 1.25, skyTop: [50, 140, 225], skyBot: [250, 222, 176], sun: [262, 20, '#fff4c8', '#ffffff'], cloud: '#ffffff',
    hills: '#2f7a4a', scene: 'samui', town: true, wall: ['#e8dcc0', '#fff4dc', '#a89878'], asph: [72, 72, 80], ads: ['LAMAI', 'SAMUI', 'PAD THAI', 'COCONUT', 'BEACH BAR', 'MUAY THAI', 'SCOOTER RENT', 'MANGO SHAKE'] },
  japan: { name: 'Japan – Fuji-Strasse', desc: 'Izakaya, rote Laternen, Kirschblüten und der Fuji', lvl: 9, prizeMul: 1.35, skyTop: [80, 140, 215], skyBot: [250, 214, 222], sun: [60, 18, '#fff4c8', '#ffffff'], cloud: '#ffffff',
    hills: '#2f6a48', scene: 'japan', town: true, wall: ['#d8d0c0', '#f0e8d8', '#8a8070'], asph: [58, 60, 70] },
  vietnam: { name: 'Vietnam – Altstadt', desc: 'Röhrenhäuser, Lampions, Roller und die Halong-Felsen', lvl: 10, prizeMul: 1.35, skyTop: [110, 165, 205], skyBot: [232, 230, 205], sun: [250, 16, '#fff4c8', '#ffffff'], cloud: '#f4f4f4',
    hills: '#4a9a90', scene: 'vietnam', town: true, wall: ['#e8d8a0', '#f8ecc0', '#a89060'], asph: [66, 64, 70] },
  cambodia: { name: 'Kambodscha – Tempelweg', desc: 'Pfahlhäuser, Zuckerpalmen, Tuk-Tuks und Tempeltürme im Abendrot', lvl: 11, prizeMul: 1.4, skyTop: [70, 50, 120], skyBot: [252, 160, 90], sun: [80, 26, '#ffcd75', '#fff0b0'], cloud: '#f0a080',
    hills: '#2f7a42', scene: 'cambodia', town: true, wall: ['#c88a5a', '#e0a878', '#8a5a3a'], asph: [70, 58, 54] },
  china: { name: 'China – Laternenstadt', desc: 'Geschwungene Dächer, rote Laternen, Feuerwerk und die Grosse Mauer', lvl: 13, prizeMul: 1.45, skyTop: [28, 26, 64], skyBot: [196, 86, 90], cloud: '#6a4a6a', lights: true,
    hills: '#3a6a48', scene: 'china', town: true, wall: ['#b02828', '#d84040', '#6a1010'], asph: [50, 48, 56] },
  swiss: { name: 'Schweiz – Bergdorf', desc: 'Chalets mit Geranien, Kühe, Bergsee und Gondelbahn', lvl: 14, prizeMul: 1.45, skyTop: [60, 130, 220], skyBot: [205, 228, 246], sun: [40, 16, '#fff4c8', '#ffffff'], cloud: '#ffffff',
    hills: '#7a8aa4', scene: 'swiss', town: true, wall: ['#e8e4dc', '#ffffff', '#a8a49c'], asph: [64, 66, 74] },
  harbor: { name: 'Hafen im Regen', desc: 'Nasse Fahrbahn: 15 % weniger Grip, aber 30 % mehr Preisgeld', lvl: 8, prizeMul: 1.3, grip: 0.85, skyTop: [36, 42, 58], skyBot: [86, 96, 114], cloud: '#4a5060',
    hills: '#22283a', scene: 'harbor', weather: 'rain', wet: true, lights: true, wall: ['#566c86', '#7a8098', '#333c57'], asph: [36, 38, 48] },
  alpine: { name: 'Alpen-Strip', desc: 'Schnee und Eis: 25 % weniger Grip, 50 % mehr Preisgeld', lvl: 12, prizeMul: 1.5, grip: 0.75, skyTop: [110, 160, 215], skyBot: [214, 228, 242], sun: [60, 20, '#fff4c8', '#ffffff'], cloud: '#f4f4f4',
    hills: '#7a8aa4', scene: 'alps', weather: 'snow', snow: true, wall: ['#e4ecf4', '#ffffff', '#94b0c2'], asph: [66, 70, 82] },
  volcano: { name: 'Vulkan-Ring', desc: 'Glühender Asphalt: Reifen sofort warm, doppeltes Preisgeld', lvl: 18, prizeMul: 2, hot: true, skyTop: [36, 8, 18], skyBot: [196, 70, 40], cloud: '#5a2a2a',
    hills: '#22101a', scene: 'volcano', weather: 'ash', lights: true, wall: ['#3a2a2a', '#6a3a2a', '#1a1010'], asph: [44, 34, 34] }
};
const _raceBGCache = {};
/** Hintergrund-Kulissen der Spezialstrecken (eine Pixelspalte x des 320x30-Streifens) */
function drawScene(p, T, x) {
  const set = (y, c) => p.set(x, y, Chex(c));
  const TH = THEMES[T.scene];
  if (TH && TH.strip) { TH.strip((y, c) => { if (c) p.set(x, y, Chex(c)); }, x); return; }
  if (T.scene === 'samui') { drawSamuiScene(p, T, x); return; }
  if (T.scene === 'hangar') {
    for (let y = 24; y < 30; y++) set(y, T.hills);
    const h = x % 110;                                         // Hangar mit Bogendach
    if (h < 56) { const dx = h - 28, top = 12 + Math.round(dx * dx / 90); for (let y = top; y < 30; y++) set(y, y === top ? '#c8ccd4' : (h > 14 && h < 42 && y > 21) ? (y % 2 ? '#3a3e48' : '#566c86') : '#94a0b0'); }
    if (x >= 76 && x < 82) for (let y = 4; y < 30; y++) set(y, y < 9 ? (x % 2 ? '#73eff7' : '#29366f') : '#d0d4dc');   // Tower
    if (x >= 74 && x < 84) set(3, '#3a3e48');
    if (x === 300) for (let y = 12; y < 30; y++) set(y, '#566c86');                                                       // Windsack
    if (x > 300 && x < 307) set(13 + Math.floor((x - 300) / 4), (x % 2) ? '#ef7d57' : '#f4f4f4');
  } else if (T.scene === 'harbor') {
    for (let y = 26; y < 30; y++) set(y, (y + x) % 7 ? '#2a3a50' : '#4a5a70');                                          // Meer
    const c = x % 120;                                                                                                   // Containerkran
    if (c === 20 || c === 34) for (let y = 4; y < 26; y++) set(y, '#b13e53');
    if (c >= 8 && c <= 60) { set(5, '#b13e53'); if (c % 4 === 0) set(6, '#b13e53'); }
    if (c === 52) for (let y = 6; y < 14; y++) set(y, '#3a3e48');
    const st = x % 50;                                                                                                   // Containerstapel
    if (x % 120 > 62 && st < 44) { const hgt = 2 + Math.floor(hash2(Math.floor(x / 11), 4) * 4); const cols = ['#b13e53', '#3b5dc9', '#38b764', '#ef7d57', '#ffcd75'];
      for (let k = 0; k < hgt; k++) for (let y = 25 - k * 4 - 3; y < 25 - k * 4; y++) set(y, x % 11 === 0 ? '#1a1c2c' : shadeHex(cols[Math.floor(hash2(Math.floor(x / 11), k) * 5)], -0.35)); }
  } else if (T.scene === 'alps') {
    const tri = v => Math.abs(((v % 2) + 2) % 2 - 1);
    const m = Math.round(3 + 14 * tri(x / 55) + 5 * tri(x / 17 + 0.3));                                                 // gezackte Gipfel
    for (let y = m; y < 30; y++) set(y, y < m + 4 + (x % 3) ? '#ffffff' : ((x + y) % 5 ? T.hills : '#6a7890'));
    if (hash2(x, 11) > 0.55) { const th = 3 + Math.floor(hash2(x, 12) * 4); for (let y = 30 - th; y < 30; y++) set(y, y === 30 - th ? '#f4f4f4' : '#1e4a3a'); }   // Tannen
  } else if (T.scene === 'volcano') {
    const dx = x - 200, ad = Math.abs(dx), cone = 5 + Math.round(ad * 0.3);              // Vulkankegel mit Lavaströmen
    for (let y = Math.min(30, cone); y < 30; y++) {
      let c = dx > 0 ? '#2e141c' : '#4a2028';
      if (y < cone + 1) c = '#6a3030';
      const lava1 = Math.round(-2 - (y - 5) * 0.22 + Math.sin(y * 0.7) * 1.2), lava2 = Math.round(3 + (y - 5) * 0.35 + Math.sin(y * 0.5 + 2));
      if ((dx === lava1 || dx === lava2) && y < 27) c = y < 12 ? '#ffcd75' : '#ef7d57';
      set(y, c);
    }
    if (ad < 4) { set(4, '#ffcd75'); set(5, '#ef7d57'); }
    const hl = Math.round(19 + 4 * Math.sin(x * 0.05));
    if (ad > 45) for (let y = hl; y < 30; y++) set(y, '#140a10');
  }
}

/** Wetter & Effekte der Strecke: Regen, Schnee, Asche, Tiefflieger */
function drawWeather(ctx, camX) {
  const T = _raceBG.T, t = RACE.t;
  { const TH = THEMES[T.scene]; if (TH && TH.ambient) TH.ambient(ctx, camX, t); }
  if (T.plane) {
    const ph = (t % 16) / 16, px = Math.round(RW_ + 40 - ph * (RW_ + 140)), py = 16 + Math.round(Math.sin(ph * 3) * 2);
    ctx.fillStyle = 'rgba(244,244,244,0.5)'; ctx.fillRect(px + 20, py + 1, Math.round(ph * 160), 1);
    ctx.fillStyle = '#c8ccd4'; ctx.fillRect(px, py, 20, 3); ctx.fillStyle = '#94b0c2'; ctx.fillRect(px, py + 2, 20, 1);
    ctx.fillStyle = '#566c86'; ctx.fillRect(px + 8, py + 2, 6, 3); ctx.fillRect(px + 16, py - 4, 3, 4); ctx.fillStyle = '#29366f'; ctx.fillRect(px + 2, py, 3, 1);
  }
  if (T.scene === 'volcano') {                                                        // Rauchsäule über dem Krater
    const vx = Math.round(-((camX * PPM * 0.05) % RW_)) + 200;
    for (let i = 0; i < 10; i++) { const p = ((t * 0.15 + i / 10) % 1); for (const ox of [0, RW_]) { ctx.globalAlpha = 0.55 * (1 - p); ctxDisc(ctx, vx + ox + p * 26 + Math.sin(p * 5 + i) * 3, 14 - p * 16, 2 + p * 6, p < 0.15 ? '#ef7d57' : '#3a2a2e'); } }
    ctx.globalAlpha = 1;
    drawEruption(ctx, camX);
  }
  if (T.weather === 'rain') {
    drawRain(ctx, camX);
  } else if (T.weather === 'snow') {
    drawSnowGusts(ctx, camX);
    for (let i = 0; i < 110; i++) {
      const sz = hash2(i, 3) > 0.7 ? 2 : 1;
      const x = ((hash2(i, 1) * RW_ + Math.sin(t * 1.5 + i) * 6 - t * 18 + camX * PPM * (0.2 + sz * 0.3)) % RW_ + RW_) % RW_, y = (hash2(i, 2) * 140 + t * (25 + sz * 15)) % 140 - 10;
      ctx.fillStyle = sz > 1 ? '#ffffff' : '#dfe8f2'; ctx.fillRect(Math.round(x), Math.round(y), sz, sz);
    }
  } else if (T.weather === 'ash') {
    ctx.fillStyle = 'rgba(120,30,10,0.12)'; ctx.fillRect(0, 0, RW_, HUD_Y);
    for (let i = 0; i < 70; i++) {
      const x = ((hash2(i, 1) * RW_ + Math.sin(t + i) * 8 + camX * PPM * 0.4) % RW_ + RW_) % RW_, y = 130 - (hash2(i, 2) * 140 + t * 14) % 140;
      ctx.fillStyle = i % 4 ? 'rgba(120,110,110,0.6)' : (Math.floor(t * 6 + i) % 2 ? '#ffcd75' : '#ef7d57'); ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
}

/** Tag- bzw. Nachtversion einer Strecke (ohne die Originaldaten zu verändern) */
function trackVariant(id, tod) {
  const T = TRACKS[id] || TRACKS.sunset;
  if (tod === 'night' && !T.night) return Object.assign({}, T, { night: true, lights: true, skyTop: [6, 8, 22], skyBot: shadeRGB(T.skyBot, -0.72).map(v => Math.max(18, v)), sun: null,
    cloud: T.cloud ? '#262a44' : null, bld: T.bld || null, win: T.win || ['#ffcd75', '#ffe8a0', '#73eff7'], wall: T.wall ? T.wall.map(c => shadeHex(c, -0.35)) : T.wall });
  if (tod === 'day' && T.night) return Object.assign({}, T, { night: false, lights: false, skyTop: [80, 140, 215], skyBot: [214, 228, 242], sun: [250, 20, '#fff4c8', '#ffffff'], cloud: '#f4f4f4' });
  return T;
}
const trackIsNight = (id, tod) => trackVariant(id, tod).night;
function buildRaceBG(id, tod) {
  const T = trackVariant(id, tod);
  const sky = new PB(RW_, 80);
  for (let y = 0; y < 80; y++) for (let x = 0; x < RW_; x++) {
    let c = mixRGB(T.skyTop, T.skyBot, Math.pow(y / 80, 1.6));
    if (!T.night && y > 40 && ((x + y) & 1)) c = mixRGB(c, [255, 205, 117], id === 'desert' ? 0.08 : 0.25);
    sky.set(x, y, Crgb(c));
  }
  if (T.night) {
    for (let i = 0; i < 90; i++) { const x = Math.floor(hash2(i, 1) * RW_), y = Math.floor(hash2(i, 2) * 50); sky.set(x, y, Chex(hash2(i, 3) > 0.8 ? '#ffffff' : '#94b0c2')); }
    sky.disc(60, 18, 8, Chex('#f4f4f4')); sky.disc(64, 15, 7, Crgb(T.skyTop));
  } else if (T.sun) { const [sx, sy, c1, c2] = T.sun; sky.disc(sx, sy, 12, Chex(c1)); sky.disc(sx, sy, 9, Chex(c2)); }
  { const TH = THEMES[T.scene]; if (TH && TH.sky) TH.sky(sky); }
  if (T.cloud) for (let i = 0; i < 6; i++) { const cx = 20 + i * 55, cy = 12 + (i * 13) % 22; for (let k = 0; k < 5; k++) sky.disc(cx + k * 5, cy - (k % 2), 4 - (k % 2), Chex(T.cloud)); }
  const skyline = new PB(RW_, 30);
  for (let x = 0; x < RW_; x++) {
    let m = Math.round(14 + 6 * Math.sin(x * 0.03) + 4 * Math.sin(x * 0.11 + 1));
    if (T.mesa) { const b = hash2(Math.floor(x / 40), 9); m = b > 0.5 ? 6 + Math.round(b * 6) : 22; }
    for (let y = m; y < 30; y++) skyline.set(x, y, Chex(T.mesa && y < m + 2 ? shadeHex(T.hills, 0.25) : T.hills));
    if (T.mesa && hash2(x, 5) > 0.97) for (let y = 22; y < 30; y++) skyline.set(x, y, Chex('#38804a'));
    if (T.scene) { drawScene(skyline, T, x); continue; }
    if (!T.bld) continue;
    const b = hash2(Math.floor(x / 9), 3); const bh = Math.round((T.night ? 12 : 8) + b * (T.night ? 18 : 14));
    if (b > 0.45) for (let y = 30 - bh; y < 30; y++) skyline.set(x, y, Chex((x % 9 === 0) ? T.bld[0] : T.bld[1]));
    if (b > 0.45 && (x % 3 === 1)) for (let y = 30 - bh + 2; y < 29; y += 3) if (hash2(x, y) > (T.night ? 0.4 : 0.55)) skyline.set(x, y, Chex(T.win[Math.floor(hash2(x >> 2, y) * T.win.length)]));
  }
  // Tribüne (2 Frames für jubelnde Zuschauer, nachts mit Handy-Blitzen)
  const stands = T.town && THEMES[T.scene] ? [0, 1].map(fr => THEMES[T.scene].tile(fr)) : [0, 1].map(fr => {
    const p = new PB(192, 34);
    p.rect(0, 0, 192, 2, Chex('#566c86')); p.rect(0, 2, 192, 2, Chex(T.night ? '#c040ff' : '#b13e53'));
    for (let x = 0; x < 192; x += 24) p.rect(x, 0, 2, 34, Chex('#3a3e48'));
    for (let r = 0; r < 6; r++) {
      const y = 6 + r * 4;
      p.rect(0, y + 3, 192, 1, Chex('#22263a'));
      for (let x = 1; x < 192; x += 3) {
        if ((x % 24) < 2) continue;
        const h = hash2(x, r * 7);
        if (h < 0.15) continue;
        const jump = fr && hash2(x, r) > 0.6 ? 1 : 0;
        let shirt = ['#b13e53', '#3b5dc9', '#ffcd75', '#38b764', '#f4f4f4', '#ef7d57', '#73eff7'][Math.floor(h * 7)];
        const skin = T.night ? '#8a6a5a' : '#f0c0a0';
        if (T.night) shirt = shadeHex(shirt, -0.45);
        p.set(x, y - jump, Chex(skin)); p.set(x, y + 1 - jump, Chex(shirt)); p.set(x + 1, y + 1 - jump, Chex(shirt));
        if (jump && h > 0.8) p.set(x - 1, y - 1, Chex(skin));
        if (T.night && fr && hash2(x, r + 40) > 0.97) { p.set(x, y - 2, Chex('#ffffff')); p.set(x - 1, y - 2, Chex('#c8dce8')); p.set(x + 1, y - 2, Chex('#c8dce8')); }
      }
    }
    return p.canvas();
  });
  // Asphalt-Kachel
  const asph = new PB(64, 40), base = T.asph || (T.night ? [34, 36, 50] : id === 'desert' ? [74, 70, 70] : [54, 56, 68]);
  for (let y = 0; y < 40; y++) for (let x = 0; x < 64; x++) asph.set(x, y, Crgb(shadeRGB(base, (hash2(x, y) - 0.5) * 0.18)));
  return { sky: sky.canvas(), skyline: skyline.canvas(), stands, asph: asph.canvas(), T };
}
let _raceBG = null;

// ---------- Rennen starten ----------
function startRace(cfg) {
  cfg.player.carId = cfg.player.carId || RSEL.modelId;
  const trk = TRACKS[cfg.track] ? cfg.track : 'sunset';
  const bgKey = trk + '|' + (cfg.tod || '');
  _raceBG = _raceBGCache[bgKey] || (_raceBGCache[bgKey] = buildRaceBG(trk, cfg.tod));
  const pc = computeCar(cfg.player.design, cfg.player.engine);
  const oc = computeCar(cfg.opp.design, cfg.opp.engine);
  const TT = TRACKS[trk];
  if (TT.grip) { pc.grip *= TT.grip; oc.grip *= TT.grip; }        // Regen/Schnee: weniger Haftung
  const skill = cfg.opp.skill;
  const R = RACE = {
    cfg, pc, oc, pv: new Vehicle(pc), ov: new Vehicle(oc), phase: 'prestage', t: 0, D: distOf(cfg.dist).m,
    inp: { gas: false, clutch: false, burnout: false }, greenT: null, treeT: null, parts: [], msg: 'BURNOUT? DANN STAGE!', msgT: 4, msgC: '#ffcd75', shake: 0,
    p: { launchT: null, t100: null, t18: null, et: null, fin: null, trap: 0, foul: false, shifts: [] },
    o: { launchT: null, t100: null, t18: null, et: null, fin: null, trap: 0, foul: false },
    ai: { react: rand(cfg.opp.react[0], cfg.opp.react[1]), shiftU: clamp(0.92 + (Math.random() - 0.5) * (1 - skill) * 0.25, 0.75, 0.995),
      launchU: clamp((oc.launchU || 0.5) + (Math.random() - 0.5) * (1 - skill) * 0.5, 0.15, 0.9), nosAt: rand(0.3, 1.4 - skill), foul: Math.random() < (1 - skill) * 0.05 },
    flame: { p: 0, o: 0 }, done: false, resultShown: false, muted: (() => { try { return localStorage.getItem('at_mute') === '1'; } catch (e) { return false; } })(),
    sprites: { p: null, o: null }, sx: { p: 0, o: 0 }, marks: { p: new Set(), o: new Set() }
  };
  wearApply(R);
  R.cruise = !!cfg.cruise;
  R.ghost = !cfg.cruise && ghostOn() ? ghostOf(cfg) : null;
  R.pv.x = -4; R.ov.x = -4; R.pv.heat = R.ov.heat = TT.hot ? 0.75 : 0.35;
  buildRaceDOM();
  audioStart();
  preloadRace(R);
}

/** Alle Radstellungen beider Autos vorab zeichnen, damit das Rennen nicht ruckelt (mit Ladebalken) */
function preloadRace(R) {
  const jobs = [];
  for (const who of ['p', 'o']) for (const br of [true, false]) for (let k = 0; k < 16; k++) jobs.push([who, k / 16 * Math.PI * 2, br]);
  if (R.ghost) jobs.push(['g', 0, false]);
  const total = jobs.length;
  R.loading = true; R.raf = 0;
  const tick = () => {
    if (RACE !== R || R.manual) return;
    const t0 = performance.now();
    while (jobs.length && performance.now() - t0 < 25) { const [who, a, br] = jobs.shift(); if (who === 'g') { renderCar(R.ghost.design, { angle: 0, brake: false, lights: false }); continue; } const [d, o] = raceCarArgs(R, who, a, br); const Ly = carLayers(d, o); carWheelLayer(Ly, Math.round(a / (Math.PI * 2) * 16) % 16); }
    drawLoading(R, 1 - jobs.length / total);
    if (jobs.length) { R.loadTO = setTimeout(tick, 0); return; }
    R.hud = buildHUDLayer(R);
    R.loading = false; R.last = performance.now();
    R.raf = requestAnimationFrame(raceLoop);
  };
  drawLoading(R, 0);
  R.loadTO = setTimeout(tick, 16);
}
function drawLoading(R, f) {
  const cv = $('#racecv'); if (!cv) return;
  const ctx = hdCtx(cv, R.cruise ? 3 : 2);
  ctx.drawImage(_raceBG.sky, 0, 0); ctx.drawImage(_raceBG.skyline, 0, 10);
  ctx.fillStyle = 'rgba(7,8,15,0.72)'; ctx.fillRect(0, 0, RW_, RH_);
  cxText(ctx, _raceBG.T.name.toUpperCase(), RW_ / 2, 62, '#ffcd75', 3, 'c', '#000');
  cxText(ctx, 'STRECKE WIRD GELADEN ' + Math.round(f * 100) + '%', RW_ / 2, 92, '#c8ccd4', 1, 'c');
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(80, 102, 160, 8);
  ctx.fillStyle = '#333c57'; ctx.fillRect(82, 104, 156, 4);
  ctx.fillStyle = '#a7f070'; ctx.fillRect(82, 104, Math.round(156 * f), 4);
}
/** Argumente für renderCar eines Rennautos (identisch beim Vorladen und Zeichnen → Cache-Treffer) */
function raceCarArgs(R, who, angle, braking) {
  const d = who === 'p' ? R.cfg.player.design : R.cfg.opp.design;
  const eng = who === 'p' ? R.cfg.player.engine : R.cfg.opp.engine;
  const night = !!(_raceBG && (_raceBG.T.night || _raceBG.T.lights));
  return [d, { angle, brake: braking, lights: night, exh: eng.exh, brand: who === 'p' ? (R.cfg.player.brand || S.company) : R.cfg.opp.brand }];
}

function buildRaceDOM() {
  const R = RACE;
  let el = $('#race'); if (el) el.remove();
  el = document.createElement('div'); el.id = 'race';
  const D = distOf(R.cfg.dist).short.toUpperCase();
  el.innerHTML = `
    <div class="rtop"><span class="hf" style="font-size:10px;color:var(--yellow)">${esc(R.cfg.player.name)} vs ${esc(R.cfg.opp.name)} · ${D}</span>
      ${R.cfg.oppId && OPP_INFO[R.cfg.oppId] ? `<span class="rquote">${faceImg(R.cfg.oppId, 28)}<span>„${esc(oppQuote(R.cfg.oppId, 'hi'))}“</span></span>` : ''}<span class="sp"></span>
      <button class="btn sm gray" id="rmute">${R.muted ? 'Ton an' : 'Ton aus'}</button><button class="btn sm red" id="rquit">Aufgeben</button></div>
    <canvas id="racecv" width="${RW_}" height="${RH_}"></canvas>
    <div class="rctl">
      <button class="rbtn stage" id="rb-burn" data-hold="burnout">BURNOUT</button>
      <button class="rbtn stage" id="rb-stage">STAGE</button>
      <button class="rbtn clutch" data-hold="clutch">KUPPLUNG</button>
      <button class="rbtn gas" data-hold="gas">GAS</button>
      <button class="rbtn shift" id="rb-down">−</button>
      <button class="rbtn shift" id="rb-up">+</button>
      <button class="rbtn nos" id="rb-nos">NOS</button>
    </div>`;
  document.body.appendChild(el);
  // Halte-Knöpfe (Maus & Touch)
  $$('[data-hold]', el).forEach(b => {
    const k = b.dataset.hold;
    const on = e => { e.preventDefault(); RACE.inp[k] = true; b.classList.add('on'); audioStart(); };
    const off = e => { e.preventDefault(); RACE.inp[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  $('#rb-stage').addEventListener('click', raceStage);
  $('#rb-up').addEventListener('pointerdown', e => { e.preventDefault(); raceShift(1); });
  $('#rb-down').addEventListener('pointerdown', e => { e.preventDefault(); raceShift(-1); });
  $('#rb-nos').addEventListener('pointerdown', e => { e.preventDefault(); raceNos(); });
  $('#rquit').addEventListener('click', () => endRace(true));
  $('#rmute').addEventListener('click', e => { RACE.muted = !RACE.muted; try { localStorage.setItem('at_mute', RACE.muted ? '1' : '0'); } catch (er) { /* egal */ } e.target.textContent = RACE.muted ? 'Ton an' : 'Ton aus'; });
  $('#rb-nos').disabled = !R.pc.nos;
}

// ---------- Tastatur ----------
const RACE_KEYS = { ' ': 'gas', Shift: 'clutch', b: 'burnout', B: 'burnout' };
window.addEventListener('keydown', e => {
  if (!RACE || RACE.resultShown) return;
  if (RACE.cruise) { cruiseKey(e, true); return; }
  if (RACE_KEYS[e.key]) { RACE.inp[RACE_KEYS[e.key]] = true; e.preventDefault(); audioStart(); }
  else if (e.key === 'ArrowUp' || e.key === '+') { if (!e.repeat) raceShift(1); e.preventDefault(); }
  else if (e.key === 'ArrowDown' || e.key === '-') { if (!e.repeat) raceShift(-1); e.preventDefault(); }
  else if (e.key === 'n' || e.key === 'N') raceNos();
  else if (e.key === 's' || e.key === 'S') raceStage();
  else if (e.key === 'Escape') endRace(true);
});
window.addEventListener('keyup', e => { if (RACE && RACE.cruise) { cruiseKey(e, false); return; } if (RACE && RACE_KEYS[e.key]) { RACE.inp[RACE_KEYS[e.key]] = false; e.preventDefault(); } });

function raceMsg(txt, col = '#ffcd75', dur = 1.2) { RACE.msg = txt; RACE.msgC = col; RACE.msgT = dur; }
function raceStage() {
  const R = RACE; if (!R || R.phase !== 'prestage') return;
  R.phase = 'staging'; R.stageT = R.t; R.inp.burnout = false;
  $('#rb-burn').disabled = true; $('#rb-stage').disabled = true;
  raceMsg('KUPPLUNG + GAS: NADEL INS GRÜNE!', '#73eff7', 3);
}
function raceShift(dir) {
  const R = RACE; if (!R || !R.pv.launched || R.p.fin) return;
  if (dir > 0) {
    const q = R.pv.shiftUp();
    if (!q) return;
    R.flame.p = 0.14; R.shake = Math.max(R.shake, 1); popSound(0.16, 650); fxExhaust('p', 'pop');
    if (R.pc.E.ind === 'turbo' || R.pc.E.ind === 'twin') blowOff();
    R.p.shifts.push(q);
    const M = { perfect: ['PERFEKT!', '#a7f070'], good: ['GUT', '#73eff7'], early: ['ZU FRÜH', '#ffcd75'], late: ['ZU SPÄT!', '#ef7d57'] }[q];
    raceMsg(M[0], M[1], 0.8);
  } else R.pv.shiftDown();
}
function raceNos() {
  const R = RACE; if (!R || !R.pv.launched || R.p.fin) return;
  if (R.pv.fireNos()) { raceMsg('NOS!!!', '#73eff7', 1); R.shake = 3; }
}

// ---------- Hauptschleife ----------
function raceLoop(now) {
  const R = RACE; if (!R) return;
  RW_ = RW0;
  R.raf = requestAnimationFrame(raceLoop);                 // zuerst neu anmelden: ein Fehler darf das Rennen nie einfrieren
  // Zeitschritt nie negativ (der Zeitstempel des ersten Bildes kann vor R.last liegen) und höchstens 50 ms
  const dt = clamp((now - R.last) / 1000, 0, 0.05) * photoFactor(R); R.last = Math.max(R.last, now);
  try {
    const steps = Math.max(1, Math.round(dt / (1 / 240)));
    for (let i = 0; i < steps; i++) (R.cruise ? cruiseStep : raceStep)(dt / steps);
    drawRace();
    audioUpdate();
  } catch (e) { if (!R.errLogged) { R.errLogged = true; console.error('Rennen:', e); } }
}

function raceStep(dt) {
  const R = RACE, pv = R.pv, ov = R.ov;
  R.t += dt;
  if (R.msgT > 0) R.msgT -= dt;
  R.shake = Math.max(0, R.shake - dt * 6);
  R.flame.p = Math.max(0, R.flame.p - dt); R.flame.o = Math.max(0, R.flame.o - dt);
  const pre = !pv.launched;
  // --- Phasen ---
  if (R.phase === 'staging') {
    const k = clamp((R.t - R.stageT) / 1.4, 0, 1);
    pv.x = ov.x = lerp(-4, 0, k);
    if (k >= 1) { R.phase = 'tree'; R.treeT = R.t + rand(0.9, 1.7); R.greenT = R.treeT + 1.5; }
  }
  if (R.phase === 'tree' && R.t >= R.greenT) R.phase = 'race';
  // --- Spieler ---
  const I = R.inp;
  if (!pv.launched) {
    const canLaunch = R.phase === 'tree' || R.phase === 'race';
    if (canLaunch && I.gas && !I.clutch) {
      pv.launched = true; pv.locked = false; R.p.launchT = R.t;
      if (R.t < R.greenT) { R.p.foul = true; raceMsg('FRÜHSTART! ROT!', '#ff4b55', 3); }
      else {
        R.p.react = R.t - R.greenT;
        // Startdrehzahl bewerten (grüner Bereich auf dem Drehzahlmesser)
        if (!R.pc.E.isEV) {
          const z = launchZone(R.pc), u = pv.rpm / R.pc.E.red;
          if (Math.abs(u - z.c) <= z.w) { raceMsg('PERFEKTER START!', '#a7f070', 1.2); pv.bonusT = 1.0; R.p.launchQ = 'perfect'; }
          else if (u > z.c) { raceMsg('ZU VIEL GAS!', '#ef7d57', 1.2); R.p.launchQ = 'high'; }
          else { raceMsg('ZU WENIG DREHZAHL', '#ffcd75', 1.2); R.p.launchQ = 'low'; }
        }
      }
      R.shake = 2;
    }
    pv.step(dt, { thr: I.gas ? 1 : 0, clutch: true, burnout: R.phase === 'prestage' && I.burnout });
    if (R.phase === 'prestage' && I.burnout && I.gas) emitSmoke('p', 2);
  } else {
    const pb = R.cfg.player.blowAt;
    if (pb && !R.p.blown && R.t - R.p.launchT > pb) { R.p.blown = true; R.p.blowT = R.t; R.shake = 4; raceMsg('MOTORSCHADEN!', '#ff4b55', 3.5); }
    if (R.p.blown && !R.p.fin) { pv.step(dt, { thr: 0, clutch: true }); pv.v = Math.max(0, pv.v - 2.5 * dt); if (Math.random() < 0.5) emitSmoke('p', 2, true); }
    else if (R.p.fin) { pv.step(dt, { thr: 0, clutch: true }); pv.v = Math.max(0, pv.v - (chuteOpen(R.p) ? 13 : 7) * dt); }
    else { pv.step(dt, { thr: I.gas ? 1 : 0, clutch: I.clutch }); if (pv.limiterT > 0 && pv.gear < R.pc.E.ratios.length) R.p.limT = (R.p.limT || 0) + dt; }   // Begrenzer im letzten Gang zählt nicht
    if (pv.slip > 0.25 && pv.v < 70) emitSmoke('p', pv.slip);
  }
  // --- KI ---
  const ai = R.ai;
  if (!ov.launched) {
    const burn = R.phase === 'prestage' && R.t > 0.6 && R.t < 3.2;
    const revTo = R.phase === 'tree' || R.phase === 'race' ? ai.launchU : 0;
    ov.step(dt, { thr: burn ? 1 : revTo ? (ov.rpm < oc_idle(ov) + revTo * (ov.c.E.red - oc_idle(ov)) ? 1 : 0.2) : 0, clutch: true, burnout: burn });
    if (burn) emitSmoke('o', 2);
    const go = R.phase === 'race' && R.t >= R.greenT + ai.react;
    const foulGo = R.phase === 'tree' && ai.foul && R.t >= R.greenT - 0.25;
    if (go || foulGo) { ov.launched = true; ov.locked = false; R.o.launchT = R.t; if (foulGo) R.o.foul = true; else R.o.react = R.t - R.greenT; }
  } else {
    if (R.o.fin) { ov.step(dt, { thr: 0, clutch: true }); ov.v = Math.max(0, ov.v - (chuteOpen(R.o) ? 13 : 7) * dt); }
    else {
      ov.step(dt, { thr: ov.slip > 0.3 ? 0.8 : 1, clutch: false });
      if (!ov.c.E.isEV && ov.rpm >= ov.c.E.red * ai.shiftU && ov.shiftT <= 0 && ov.gear < ov.c.E.ratios.length) { ov.shiftUp(); R.flame.o = 0.14; fxExhaust('o', 'pop'); }
      if (ov.c.nos && !ov.nosUsed && R.t - R.o.launchT > ai.nosAt) ov.fireNos();
    }
    if (ov.slip > 0.25 && ov.v < 70) emitSmoke('o', ov.slip);
  }
  ghostRecord(R);
  suspStep(pv, dt, { idle: !pv.launched && pv.rpm > pv.c.E.red * 0.5 ? pv.rpm / pv.c.E.red : 0 }); suspStep(ov, dt, { idle: !ov.launched && ov.rpm > ov.c.E.red * 0.5 ? 0.6 : 0 });
  for (const who of ['p', 'o']) {                                  // Gummi auf der Bahn, wo die Reifen durchdrehen
    const v = who === 'p' ? pv : ov, s = R.sprites[who];
    const spin = v.slip > 0.2 || (!v.launched && R.phase === 'prestage' && (who === 'p' ? I.burnout && I.gas : R.t > 0.6 && R.t < 3.2));
    if (spin && s && R.marks[who].size < 4000) R.marks[who].add(Math.round((v.x + (s.wheels[0].x - (s.ox + s.L)) / PPM) * 6));
  }
  // --- Messpunkte ---
  for (const [v, rec] of [[pv, R.p], [ov, R.o]]) {
    if (!v.launched || rec.fin) continue;
    const el = R.t - rec.launchT;
    if (!rec.t100 && v.v >= 27.78) rec.t100 = el;
    if (!rec.t60 && v.x >= 18.29) rec.t60 = el;                     // 60 ft
    if (!rec.t330 && v.x >= 100.58) rec.t330 = el;                  // 330 ft
    if (!rec.t18 && v.x >= 201.17) { rec.t18 = el; rec.v18 = v.v * 3.6; }
    if (!rec.t1000 && v.x >= 304.8) rec.t1000 = el;                 // 1000 ft
    if (!rec.t14 && v.x >= 402.34) { rec.t14 = el; rec.v14 = v.v * 3.6; }
    if (v.x >= R.D) { rec.et = el; rec.fin = R.t; rec.trap = v.v * 3.6; if (rec.trap > 230) rec.chuteT = R.t + 0.35; }
  }
  if (R.p.fin && !R.p.announced) { R.p.announced = true; const win = playerWins(); raceMsg(win ? 'SIEG!' : 'NIEDERLAGE', win ? '#a7f070' : '#ff4b55', 5); if (win) R.fwT = 3; }
  // Partikel
  if (R.fwT > 0) { R.fwT -= dt; if (Math.random() < dt * 3.5) fxFirework(); }
  fxStep(R, dt);
  // Ende?
  const pDone = R.p.fin || (R.p.foul && R.t - R.p.launchT > 2.5) || (R.p.blown && R.t - R.p.blowT > 2.5);
  const oDone = R.o.fin || R.o.foul || R.t - R.greenT > 120;
  if (!R.done && R.phase === 'race' && pDone && (oDone || (R.p.fin && R.t - R.p.fin > 3.5))) { R.done = true; R.doneT = R.t; }
  if (R.done && !R.resultShown && R.t - R.doneT > 1.2) showRaceResult();
}
const oc_idle = v => v.c.E.isEV ? 0 : v.c.E.idle;
/** optimaler Startdrehzahl-Bereich (Anteil der Drehzahlgrenze) */
function launchZone(car) {
  const E = car.E, c = (E.idle + (car.launchU || 0.5) * (E.red - E.idle)) / E.red;
  return { c, w: has('tun_launch') ? 0.13 : 0.08 };
}
function playerWins() {
  const R = RACE;
  if (R.p.blown && !R.p.fin) return false;
  if (R.p.foul && !R.o.foul) return false;
  if (R.o.foul && !R.p.foul) return true;
  if (R.p.foul && R.o.foul) return false;
  if (R.p.fin && !R.o.fin) return true;
  if (!R.p.fin) return false;
  return R.p.fin <= R.o.fin;
}

function emitSmoke(who, amount, black) {
  const R = RACE, v = who === 'p' ? R.pv : R.ov, s = R.sprites[who];
  if (!s || Math.random() > 0.5 * amount) return;
  const wr = s.wheels[0];
  const relX = (wr.x - (s.ox + s.L)) / PPM;               // Hinterrad relativ zur Front (m)
  // schwarzer Rauch aus dem Motorraum (Motorschaden)
  if (black) { R.parts.push({ who, x: v.x - s.L / PPM * 0.15, y: -rand(10, 16), vx: -rand(1, 3) - v.v * 0.3, vy: -rand(3, 8), r: rand(2, 4), life: rand(1, 2), max: 2, col: '#2a2b33' }); return; }
  void relX; fxTireSmoke(who, amount);
}

// ---------- Zeichnen ----------
function drawRace() {
  const R = RACE, cv = $('#racecv'); if (!cv) return;
  const ctx = hdCtx(cv, R.cruise ? 3 : 2);
  const pv = R.pv, ov = R.ov;
  // Cruise-Zoom: mehr Strasse sichtbar (Szene wird verkleinert, Cockpit bleibt gleich)
  const z = R.cruise ? (R.zoom || 1) : 1;
  RW_ = Math.round(RW0 / z);
  // Kamera hängt beim Beschleunigen etwas nach und holt auf (Masse spürbar), beim Bremsen umgekehrt
  const camX = pv.x - (R.cruise ? RW_ * 0.34 : 170) / PPM - (pv.camOff || 0);
  const sh = R.shake > 0 && SET.shake ? Math.round((Math.random() - 0.5) * R.shake * 2) : 0;
  const shy = R.shake > 0 && SET.shake ? Math.round((Math.random() - 0.5) * R.shake) : 0;
  const W = (x) => Math.round((x - camX) * PPM * 2) / 2 + sh;      // halbe Pixel = 1 Bildschirmpixel → ruhiges Scrollen      // Welt -> Bildschirm
  ctx.save();
  if (z !== 1) {                                                        // Zoom um die Strassenunterkante
    ctx.beginPath(); ctx.rect(0, 0, RW0, HUD_Y); ctx.clip();
    ctx.fillStyle = `rgb(${_raceBG.T.skyTop.join(',')})`; ctx.fillRect(0, 0, RW0, HUD_Y);
    ctx.translate(0, HUD_Y); ctx.scale(z, z); ctx.translate(0, -HUD_Y);
  }
  ctx.translate(0, shy);
  // Himmel & Parallax
  ctx.drawImage(_raceBG.sky, 0, 0, RW_, 80);
  drawFxSky(ctx, camX, R.t);
  { const TH = THEMES[_raceBG.T.scene]; if (TH && TH.landmark) { if (_raceBG.T.night) ctx.filter = 'brightness(0.4) saturate(0.75)'; TH.landmark(ctx, R.t); ctx.filter = 'none'; } }
  const sl = -((camX * PPM * 0.05) % RW0);
  for (let x = Math.round(sl); x < RW_; x += RW0) ctx.drawImage(_raceBG.skyline, x, 10);
  const st = _raceBG.T.town ? _raceBG.stands[_raceBG.T.night ? 1 : 0] : _raceBG.stands[Math.abs(Math.floor(R.t * 4)) % 2];
  const so = -((camX * PPM * 0.35) % 192);
  for (let x = Math.round(so) - 192; x < RW_; x += 192) ctx.drawImage(st, x, 34);
  // Mauer mit Werbebannern
  const TW = _raceBG.T.wall, NIGHT = _raceBG.T.night;
  ctx.fillStyle = TW[0]; ctx.fillRect(0, 66, RW_, 9); ctx.fillStyle = TW[1]; ctx.fillRect(0, 66, RW_, 1); ctx.fillStyle = TW[2]; ctx.fillRect(0, 74, RW_, 1);
  const ads = (_raceBG.T.ads || (THEMES[_raceBG.T.scene] || {}).ads || ['PIXELOIL', 'TURBOX', 'NITRO COLA', 'GRIPMAX', 'VOLTWERK']).concat([S.company.toUpperCase().slice(0, 12)]);
  for (let i = Math.floor(camX / 30) - 1; i < camX / 30 + RW_ / PPM / 30 + 1; i++) {
    const x = W(i * 30); const txt = ads[((i % ads.length) + ads.length) % ads.length];
    const w = textW(txt) + 8; const col = ['#b13e53', '#3b5dc9', '#38b764', '#29366f', '#ef7d57', '#5d275d'][((i % 6) + 6) % 6];
    ctx.fillStyle = col; ctx.fillRect(x, 67, w, 7); cxText(ctx, txt, x + 4, 68, '#f4f4f4');
    if (NIGHT) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 1, 66, w + 2, 9); }
  }
  // Distanztafeln
  if (!R.cruise) for (let m = 0; m <= R.D; m += R.D > 500 ? 100 : 50) { if (m === 0) continue; const x = W(m); if (x < -20 || x > RW_ + 20) continue; ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 9, 58, 19, 8); cxText(ctx, m + 'M', x, 59, '#ffcd75', 1, 'c'); ctx.fillStyle = '#566c86'; ctx.fillRect(x, 66, 1, 2); }
  // Reifenstapel hinten
  for (let i = Math.floor(camX / 14); i < camX / 14 + RW_ / PPM / 14 + 1; i++) { const x = W(i * 14 + 6); for (let k = 0; k < 3; k++) { ctx.fillStyle = '#1e1e24'; ctx.fillRect(x, 72 - k * 3, 10, 3); ctx.fillStyle = k === 1 ? '#f4f4f4' : '#3a3a44'; ctx.fillRect(x, 72 - k * 3, 10, 1); } }
  // Fahrbahn
  const ao = -(((camX * PPM) % 64) + 64) % 64;
  for (let x = Math.round(ao) + sh - 64; x < RW_; x += 64) { ctx.drawImage(_raceBG.asph, x, 75, 64, 20); ctx.drawImage(_raceBG.asph, x, 98, 64, 28); }
  ctx.fillStyle = '#c8ccd4'; ctx.fillRect(0, 95, RW_, 2); ctx.fillStyle = '#7a8090'; ctx.fillRect(0, 97, RW_, 1);
  for (let i = Math.floor(camX / 4); i < camX / 4 + RW_ / PPM / 4 + 1; i++) { ctx.fillStyle = '#e8d44d'; ctx.fillRect(W(i * 4), 124, 18, 1); }
  // Burnout-Box (nass) und Startlinie
  ctx.fillStyle = 'rgba(20,30,50,0.45)'; ctx.fillRect(W(-16), 75, 11 * PPM, 20); ctx.fillRect(W(-16), 98, 11 * PPM, 26);
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(W(0), 75, 2, 20); ctx.fillRect(W(0), 98, 2, 26);
  // Ziel
  const fx = W(R.D);
  for (let y = 75; y < 124; y += 2) for (let k = 0; k < 3; k++) { if (y >= 95 && y < 98) continue; ctx.fillStyle = ((y >> 1) + k) % 2 ? '#f4f4f4' : '#1a1c2c'; ctx.fillRect(fx + k * 2, y, 2, 2); }
  // Christmas-Tree-Pfosten an der Startlinie
  if (!R.cruise) { const x = W(0) - 6; ctx.fillStyle = '#2a2b33'; ctx.fillRect(x, 62, 3, 34); ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x - 3, 58, 9, 10); const lit = treeState(); ctx.fillStyle = lit.green ? '#38b764' : lit.red ? '#ff4b55' : lit.amber ? '#ffcd75' : '#333'; ctx.fillRect(x - 1, 60, 5, 5); }
  // Nacht: Szene abdunkeln, Flutlichtmasten mit Lichtkegeln
  if (NIGHT) {
    ctx.fillStyle = 'rgba(4,6,20,0.42)'; ctx.fillRect(0, 30, RW_, 96);
    for (let i = Math.floor(camX / 40) - 1; i < camX / 40 + RW_ / PPM / 40 + 1; i++) {
      const x = W(i * 40 + 20);
      ctx.fillStyle = '#3a3e48'; ctx.fillRect(x, 26, 2, 40); ctx.fillStyle = '#fff8d0'; ctx.fillRect(x - 3, 24, 8, 2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightCone('flood'), x + 1 - 30, 26, 60, 100); ctx.restore();
    }
  }
  if (_raceBG.T.wet) drawWetRoad(ctx, W, camX);
  { const TH = THEMES[_raceBG.T.scene]; if (TH && TH.front) { if (NIGHT) ctx.filter = 'brightness(0.55) saturate(0.85)'; TH.front(ctx, W, camX, R.t); ctx.filter = 'none'; } }
  if (!R.cruise) { drawRubber(ctx, W, camX); drawScoreboard(ctx, W(R.D + 70)); } else cruiseDrawScenery(ctx, W);
  // Autos
  if (R.cruise) cruiseDrawCars(ctx, W, camX, sh);
  else {
    drawRaceCar(ctx, 'o', ov, W(ov.x), LANE_FAR);
    drawSmoke(ctx, 'o', camX, sh);
    if (R.ghost) drawGhost(ctx, W);
    drawRaceCar(ctx, 'p', pv, W(pv.x), LANE_NEAR);
    drawSmoke(ctx, 'p', camX, sh);
  }
  drawSpray(ctx);
  // Reifenstapel vorne
  for (let i = Math.floor(camX / 20); i < camX / 20 + RW_ / PPM / 20 + 1; i++) { const x = W(i * 20 + 11); for (let k = 0; k < 2; k++) { ctx.fillStyle = '#1e1e24'; ctx.fillRect(x, 123 - k * 2, 12, 2); ctx.fillStyle = k ? '#b13e53' : '#3a3a44'; ctx.fillRect(x, 123 - k * 2, 12, 1); } }
  if (_raceBG.T.snow) { ctx.fillStyle = '#f4f8fc'; ctx.fillRect(0, 124, RW_, 2); for (let x = 0; x < RW_; x += 3) ctx.fillRect(x, 123 - (((x + Math.round(camX * PPM)) >> 2) % 2), 2, 1); ctx.fillRect(0, 63, RW_, 3); }
  // Zielbogen
  if (fx > -30 && fx < RW_ + 30) {
    ctx.fillStyle = '#566c86'; ctx.fillRect(fx - 2, 44, 3, 32); ctx.fillRect(fx + 8, 44, 3, 82);
    for (let x = 0; x < 14; x++) for (let y = 0; y < 2; y++) { ctx.fillStyle = (x + y) % 2 ? '#f4f4f4' : '#1a1c2c'; ctx.fillRect(fx - 4 + x * 2 - 4, 40 + y * 2, 2, 2); }
    cxText(ctx, 'ZIEL', fx + 4, 33, '#ffcd75', 1, 'c', '#000');
  }
  // Gegner-Abstand, wenn ausserhalb
  const gap = ov.x - pv.x;
  if (!R.cruise && Math.abs(gap) > 7 && pv.launched) cxText(ctx, (gap > 0 ? '>> ' : '<< ') + Math.abs(gap).toFixed(1) + 'M', gap > 0 ? RW_ - 4 : 4, 80, gap > 0 ? '#ff7b8a' : '#a7f070', 1, gap > 0 ? 'r' : 'l', '#000');
  drawWeather(ctx, camX);
  drawFxLights(ctx, W, camX, R.t);
  drawFxFlare(ctx);
  ctx.restore();
  RW_ = RW0;
  if (R.cruise) { cruiseDrawOverlay(ctx); cruiseDrawRadar(ctx, z, camX); }
  if (!R.cruise) drawTreeHUD(ctx);
  drawHUD(ctx);
  // Meldungen
  if (R.msgT > 0 && R.msg) { const sc = R.msg.length > 12 ? 2 : 3; cxText(ctx, R.msg, RW_ / 2, 62, R.msgC, sc, 'c', '#000'); }
}

function drawRaceCar(ctx, who, v, frontX, groundY) {
  const R = RACE;
  const a = (((v.wheelAng % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
  const k16 = Math.floor(a / (Math.PI * 2) * 16) % 16;
  const braking = !!(R.cruise ? (who === 'p' && R.inp.brake) : (!v.launched || (who === 'p' ? R.p.fin : R.o.fin)));
  const [d, opt] = raceCarArgs(R, who, k16 / 16 * Math.PI * 2, braking);
  const night = opt.lights;
  const s = carLayers(d, opt);
  R.sprites[who] = s;
  const x0 = frontX - (s.ox + s.L), y0 = groundY - s.gy;
  if (x0 > RW_ + 10 || x0 + s.W < -10) return;
  drawChute(ctx, who === 'p' ? R.p : R.o, v, x0 + s.ox, groundY);
  // Räder (bei hohem Tempo verwischt, damit sie nicht „rückwärts“ flackern)
  const spin = (v.v / RW + (v.slip > 0.1 ? v.slip * 40 : 0)) / 60;             // Radumdrehung pro Bild
  ctx.drawImage(carWheelLayer(s, k16), x0, y0, s.W, s.H);
  if (spin > 0.18 && SET.gfx !== 'low') { ctx.globalAlpha = 0.5; ctx.drawImage(carWheelLayer(s, (k16 + 1) % 16), x0, y0, s.W, s.H); if (spin > 0.45) { ctx.globalAlpha = 0.33; ctx.drawImage(carWheelLayer(s, (k16 + 2) % 16), x0, y0, s.W, s.H); } ctx.globalAlpha = 1; }
  // Karosserie federt: hinten/vorne getrennt (in Streifen gezeichnet → leichtes Nicken)
  drawBodySprung(ctx, s, v, x0, y0, night);
  if (braking && v.v > 0.5 && (R.cruise || (who === 'p' ? R.p.fin : R.o.fin))) {                       // Bremslicht-Schein
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const gx = x0 + s.ox, gyy = groundY - s.tailY - (v.zR || 0);
    const g = ctx.createRadialGradient(gx, gyy, 0, gx, gyy, 12); g.addColorStop(0, 'rgba(255,40,60,0.55)'); g.addColorStop(1, 'rgba(255,40,60,0)'); ctx.fillStyle = g; ctx.fillRect(gx - 12, gyy - 12, 24, 24); ctx.restore();
  }
  sprayEmit(R, who, v, s, x0, y0);
  // Spiegelung auf nasser Fahrbahn
  if (_raceBG.T.wet) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, groundY, RW_, who === 'p' ? 126 - groundY : 95 - groundY); ctx.clip();
    ctx.globalAlpha = 0.25; ctx.translate(0, groundY * 2); ctx.scale(1, -1); ctx.drawImage(s.cv, x0, y0, s.W, s.H); ctx.restore();
  }
  // Scheinwerferkegel bei Nacht
  if (night) {
    const hx = frontX, hy = y0 + s.gy - Math.round(BODIES[d.body].head[1] + (d.ride | 0) + 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightCone('head'), hx, hy - 16, 70, 32); ctx.restore();
    fxLightPool(ctx, hx + 34, groundY - 1, 38, 5, '255,244,200', 0.24);                    // Lichtpfütze auf der Strasse
  }
  // Abgasflammen (Schalten) & NOS
  const ex = x0 + s.exhaust.x, ey = y0 + s.exhaust.y + (v.zR || 0);
  const fl = who === 'p' ? R.flame.p : R.flame.o;
  if (fl > 0 || (v.limiterT > 0.05 && Math.random() > 0.6)) {
    const len = 4 + Math.round(Math.random() * 5);
    for (let i = 0; i < len; i++) { ctx.fillStyle = i < 2 ? '#fff4c0' : i < 4 ? '#ffcd75' : '#ef7d57'; ctx.fillRect(ex - i, ey - (i > 2 ? (Math.random() > 0.5 ? 1 : 0) : 0), 1, i < 3 ? 2 : 1); }
  }
  if (v.nosT > 0) {
    const len = 10 + Math.round(Math.random() * 8);
    for (let i = 0; i < len; i++) { ctx.fillStyle = i < 3 ? '#ffffff' : i < 8 ? '#73eff7' : '#3b5dc9'; ctx.fillRect(ex - i, ey - 1 + Math.round(Math.random() * 1.2), 1, i < 6 ? 3 : 2); }
    // Geschwindigkeitslinien
    if (who === 'p') for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(244,244,244,0.5)'; ctx.fillRect(Math.round(Math.random() * RW_), 60 + Math.round(Math.random() * 60), 14, 1); }
  }
  // Fahrtwind-Linien ab hohem Tempo (dezent)
  if (who === 'p' && v.v > 45 && !v.nosT && SET.gfx !== 'low') { const n = Math.min(5, (v.v - 45) / 10); for (let i = 0; i < n; i++) { ctx.fillStyle = 'rgba(244,244,244,0.18)'; ctx.fillRect(Math.round(Math.random() * RW_), 50 + Math.round(Math.random() * 74), 10 + Math.round(v.v / 8), 1); } }
}

/** Federung pro Auto: Feder-Dämpfer hinten und vorne, angeregt von Beschleunigung, Bremsen, Schalten und Fahrbahn */
function suspStep(v, dt, extra) {
  if (v.zR == null) { v.zR = v.zF = v.vR = v.vF = 0; v.aS = 0; v.pv = v.v; }
  const aRaw = dt > 0 ? (v.v - v.pv) / dt : 0; v.pv = v.v;
  v.aS += (clamp(aRaw, -14, 14) - v.aS) * clamp(dt * 10, 0, 1);                   // geglättete Längsbeschleunigung
  const A = v.aS;
  // Gas: hinten geht in die Knie, vorne kaum hoch · Bremsen: vorne taucht ein, hinten kommt etwas hoch
  const tR = A >= 0 ? clamp(A * 0.2, 0, 1.4) : clamp(A * 0.06, -0.7, 0);
  const tF = A >= 0 ? clamp(-A * 0.04, -0.4, 0) : clamp(-A * 0.17, 0, 1.6);
  const K = 85, C = 8.5;
  v.vR += (K * (tR - v.zR) - C * v.vR) * dt; v.zR += v.vR * dt;
  v.vF += (K * (tF - v.zF) - C * v.vF) * dt; v.zF += v.vF * dt;
  // Fahrbahn: feine Unebenheiten ab Tempo, Motor schüttelt im Stand
  if (extra && extra.idle) { const n = extra.idle * 14 * dt; v.vR += (Math.random() - 0.5) * n; v.vF += (Math.random() - 0.5) * n; }   // nur Motorschütteln im Stand
  v.zR = clamp(v.zR, -1.4, 2.2); v.zF = clamp(v.zF, -1.2, 2.5);
  // Kamera-Trägheit (Meter): eilt beim Beschleunigen nach, beim Bremsen vor
  const camT = clamp(A * 0.16, -1.3, 1.2);
  v.camOff = (v.camOff || 0) + (camT - (v.camOff || 0)) * clamp(dt * 1.3, 0, 1);
}
/** Karosserie in senkrechten Streifen zeichnen – jeder Streifen um die Federung hinten/vorne verschoben; dazu wandernde Lack-Spiegelung */
let _bodyFx = null;
function drawBodySprung(ctx, s, v, x0, y0, night) {
  const cv = s.bodyCv, Q = s.k, wr = s.wheels[0].x, wf = s.wheels[1].x;
  if (SET.gfx === 'low') { ctx.drawImage(cv, x0, y0 + Math.round(((v.zR || 0) + (v.zF || 0))) / 2, s.W, s.H); return; }   // Grafik niedrig: ohne Spiegelung und Nicken
  // Spiegelung: heller Streifen gleitet beim Fahren über den Lack (nur auf Karosseriepixeln)
  if (!_bodyFx) _bodyFx = document.createElement('canvas');
  const fx = _bodyFx; if (fx.width !== cv.width || fx.height !== cv.height) { fx.width = cv.width; fx.height = cv.height; }
  const c = fx.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, fx.width, fx.height); c.drawImage(cv, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  const per = fx.width * 1.6, ph = ((-(v.x || 0) * PPM * Q * (night ? 1.4 : 0.8)) % per + per) % per - fx.width * 0.3;
  const g = c.createLinearGradient(ph, 0, ph + fx.height * 0.9, fx.height);
  const al = night ? 0.22 : 0.13;
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.45, `rgba(255,255,255,${al})`); g.addColorStop(0.55, `rgba(255,255,255,${al})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, fx.width, fx.height);
  const hq = (z, prev) => { const q = Math.round(z * 2) / 2; return prev != null && Math.abs(z - prev) < 0.4 ? prev : q; };   // Hysterese
  v.qR = hq(v.zR || 0, v.qR); v.qF = hq(v.zF || 0, v.qF);
  const qM = Math.round((v.qR + v.qF)) / 2;
  const cut1 = Math.round((wr + (wf - wr) * 0.33) * Q), cut2 = Math.round((wr + (wf - wr) * 0.67) * Q);
  const seg = [[0, cut1, v.qR], [cut1, cut2, qM], [cut2, cv.width, v.qF]];
  for (const [a, b, dy] of seg) if (b > a) ctx.drawImage(fx, a, 0, b - a, cv.height, x0 + a / Q, y0 + dy, (b - a) / Q, cv.height / Q);
}

/** Lichtkegel (Flutlicht / Scheinwerfer) – einmal gezeichnet, dann nur kopiert */
const _coneCache = {};
function lightCone(kind) {
  if (_coneCache[kind]) return _coneCache[kind];
  const cv = document.createElement('canvas');
  if (kind === 'flood') {
    cv.width = 60; cv.height = 100; const ctx = hdCtx(cv); ctx.fillStyle = 'rgba(255,240,190,0.07)';
    for (let y = 0; y < 100; y++) { const w = 4 + y * 0.55; ctx.fillRect(Math.round(30 - w / 2), y, Math.round(w), 1); }
  } else {
    cv.width = 70; cv.height = 32; const ctx = hdCtx(cv);
    for (let i = 0; i < 70; i++) { const h = 1 + i * 0.22; ctx.fillStyle = 'rgba(255,244,200,' + (0.22 * (1 - i / 70)).toFixed(3) + ')'; ctx.fillRect(i, Math.round(16 - h / 2 + i * 0.12), 1, Math.round(h)); }
  }
  return (_coneCache[kind] = cv);
}


/** Zustand der Startampel */
function treeState() {
  const R = RACE, t = R.t;
  const s = { pre: R.phase !== 'prestage' && (R.phase !== 'staging' || R.pv.x > -2.5), stage: R.phase === 'tree' || R.phase === 'race' || (R.phase === 'staging' && R.pv.x > -0.3), amber: 0, green: false, red: R.p.foul };
  if (R.treeT != null) { s.amber = t >= R.treeT + 1.0 ? 3 : t >= R.treeT + 0.5 ? 2 : t >= R.treeT ? 1 : 0; s.green = t >= R.greenT && !R.p.foul; }
  if (R.greenT && t > R.greenT + 0.6 && R.pv.launched) s.amber = 0;
  return s;
}
function drawTreeHUD(ctx) {
  const R = RACE;
  if (R.pv.launched && R.t - (R.p.launchT || 0) > 2.5) return;
  const s = treeState(), cx = RW_ / 2, y0 = 4;
  ctx.fillStyle = 'rgba(13,15,26,0.85)'; ctx.fillRect(cx - 17, y0 - 2, 34, R.p.react != null || R.o.react != null ? 72 : 64);
  const rt = r => r == null ? '' : (r < 1 ? r.toFixed(3).slice(1) : r.toFixed(2));
  cxText(ctx, rt(R.o.react), cx - 9, y0 + 62, '#ffcd75', 1, 'c'); cxText(ctx, rt(R.p.react), cx + 9, y0 + 62, R.p.react != null && R.p.react < 0.2 ? '#a7f070' : '#ffcd75', 1, 'c');
  ctx.fillStyle = '#2a2b33'; ctx.fillRect(cx - 1, y0, 2, 52);
  const lamp = (x, y, on, col, r = 3) => { if (on) { ctx.globalAlpha = 0.35; ctxDisc(ctx, x, y, r + 2, col); ctx.globalAlpha = 1; } ctxDisc(ctx, x, y, r, on ? col : '#33343f'); if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 1, 1); } };
  for (const side of [-1, 1]) {
    const x = cx + side * 9;
    const isP = side === 1;
    const v = isP ? R.pv : R.ov;
    const pre = R.phase !== 'prestage' && v.x > -2.5, stg = R.phase === 'tree' || R.phase === 'race' || v.x > -0.3;
    lamp(x - 3, y0 + 3, pre, '#fff0b0', 1.5); lamp(x + 3, y0 + 3, pre, '#fff0b0', 1.5);
    lamp(x - 3, y0 + 8, stg, '#fff0b0', 1.5); lamp(x + 3, y0 + 8, stg, '#fff0b0', 1.5);
    for (let i = 0; i < 3; i++) lamp(x, y0 + 17 + i * 8, s.amber === i + 1, '#ffcd75');
    const foul = isP ? R.p.foul : R.o.foul;
    lamp(x, y0 + 41, s.green && !foul && R.t >= R.greenT, '#38e070');
    lamp(x, y0 + 49, foul, '#ff3040');
  }
  cxText(ctx, 'KI', cx - 9, y0 + 55, '#94b0c2', 1, 'c');
  cxText(ctx, 'DU', cx + 9, y0 + 55, '#94b0c2', 1, 'c');
}

const G_A0 = Math.PI * 0.8, G_A1 = Math.PI * 2.2;          // Skalenbereich der Rundinstrumente
const HUD_RPM = { x: 34, r: 24 }, HUD_SPD = { x: RW_ - 34, r: 24 };
/** Statische HUD-Ebene (Carbon, Skalen mit Zahlen, Rahmen) – einmal pro Rennen gezeichnet */
function buildHUDLayer(R) {
  const c = R.pc, E = c.E, y0 = HUD_Y, cy = y0 + 28;
  const cv = document.createElement('canvas'); cv.width = RW_; cv.height = RH_ - y0;
  const ctx = hdCtx(cv); ctx.translate(0, -y0);
  ctx.fillStyle = '#14161f'; ctx.fillRect(0, y0, RW_, RH_ - y0);
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, y0, RW_, 2); ctx.fillStyle = '#333c57'; ctx.fillRect(0, y0 + 2, RW_, 1);
  ctx.fillStyle = '#1a1c28';
  for (let y = y0 + 3; y < RH_; y += 2) for (let x = (y >> 1) % 2 * 2; x < RW_; x += 4) ctx.fillRect(x, y, 2, 1);
  const face = (cx, r, max, redFrom, ticks, lab, label) => {
    ctxDisc(ctx, cx, cy, r + 2, '#0d0f1a'); ctxDisc(ctx, cx, cy, r, '#1e2030'); ctxDisc(ctx, cx, cy, r - 1, '#05060c');
    ctx.save(); ctx.lineCap = 'butt';
    // roter Bereich
    ctx.strokeStyle = '#b13e53'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy, r - 2, G_A0 + (G_A1 - G_A0) * Math.min(1, redFrom / max), G_A1); ctx.stroke();
    // Striche (gross) und Zwischenstriche
    for (let i = 0; i <= ticks * 2; i++) {
      const f = i / (ticks * 2), a = G_A0 + (G_A1 - G_A0) * f, big = i % 2 === 0;
      ctx.strokeStyle = f * max >= redFrom ? '#ff4b55' : '#f4f4f4'; ctx.lineWidth = big ? 1 : 0.5;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (r - (big ? 5 : 3.5)), cy + Math.sin(a) * (r - (big ? 5 : 3.5))); ctx.lineTo(cx + Math.cos(a) * (r - 1.5), cy + Math.sin(a) * (r - 1.5)); ctx.stroke();
      const t = big ? lab(i / 2) : '';
      if (t) cxText(ctx, t, cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10) - 1.75, f * max >= redFrom ? '#ff7b8a' : '#c8ccd4', 1, 'c');
    }
    ctx.restore();
    cxText(ctx, label, cx, cy + 15, '#566c86', 1, 'c');
  };
  const redK = E.red / 1000, gMax = Math.ceil(redK + 0.5), stepR = gMax > 10 ? 2 : 1;
  face(HUD_RPM.x, HUD_RPM.r, gMax, redK, gMax, i => i % stepR ? '' : String(i), 'X1000');
  const maxK = Math.max(200, Math.ceil((c.top + 20) / 50) * 50);
  face(HUD_SPD.x, HUD_SPD.r, maxK, maxK * 2, 10, i => i % 2 ? '' : String(Math.round(maxK * i / 10)), 'KM/H');
  // Anzeigefelder
  ctx.fillStyle = '#05060c';
  ctx.fillRect(140, y0 + 18, 40, 30); ctx.fillRect(90, y0 + 18, 46, 14); ctx.fillRect(184, y0 + 18, 46, 14);
  ctx.fillRect(90, y0 + 42, 46, 5); ctx.fillRect(184, y0 + 40, 46, 9); ctx.fillRect(66, y0 + 48, 188, 5);
  cxText(ctx, 'KM/H', 113, y0 + 34, '#566c86', 1, 'c');
  cxText(ctx, 'ZEIT', 207, y0 + 34, '#566c86', 1, 'c');
  ctx.fillStyle = '#38b764'; ctx.fillRect(92 + 6 * 9 - 3, y0 + 14, 3 * 9 + 2, 1);   // Markierung idealer Schaltbereich
  return { cv, gMax, redK, maxK };
}

/** Nadel eines Rundinstruments (glatte Linie) */
function hudNeedle(ctx, cx, cy, r, f, col) {
  const a = G_A0 + (G_A1 - G_A0) * clamp(f, 0, 1.03), ca = Math.cos(a), sa = Math.sin(a);
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - ca * 3 + 0.5, cy - sa * 3 + 0.5); ctx.lineTo(cx + ca * (r - 3) + 0.5, cy + sa * (r - 3) + 0.5); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - ca * 3, cy - sa * 3); ctx.lineTo(cx + ca * (r - 3), cy + sa * (r - 3)); ctx.stroke();
  ctx.restore();
  ctxDisc(ctx, cx, cy, 2.5, '#c8ccd4'); ctxDisc(ctx, cx, cy, 1, '#566c86');
}

/** Cockpit-HUD: Drehzahlmesser, Tacho, Gang, Schaltlichter, NOS, Reifentemperatur */
function drawHUD(ctx) {
  const R = RACE, v = R.pv, c = R.pc, E = c.E;
  const y0 = HUD_Y, cy = y0 + 28;
  if (!R.hud) R.hud = buildHUDLayer(R);
  const H = R.hud;
  ctx.drawImage(H.cv, 0, y0, RW_, RH_ - y0);
  // Anzeige geglättet: Nadel und Zahlen springen nicht, folgen aber schnell
  const dt = clamp(R.t - (R.hudT == null ? R.t : R.hudT), 0, 0.1); R.hudT = R.t;
  const k = 1 - Math.exp(-dt * 24);
  R.rpmD = R.rpmD == null ? v.rpm : lerp(R.rpmD, v.rpm, k);
  R.kmhD = R.kmhD == null ? v.v * 3.6 : lerp(R.kmhD, v.v * 3.6, k);
  const rpm = R.rpmD, kmh = R.kmhD, u = rpm / E.red;
  // Startbereich (grün) vor dem Start
  if (!v.launched && !E.isEV) {
    const z = launchZone(c), sc = H.redK / H.gMax;
    ctx.save(); ctx.strokeStyle = '#38e070'; ctx.lineWidth = 3; ctx.beginPath();
    ctx.arc(HUD_RPM.x, cy, 17.5, G_A0 + (G_A1 - G_A0) * (z.c - z.w) * sc, G_A0 + (G_A1 - G_A0) * (z.c + z.w) * sc); ctx.stroke(); ctx.restore();
  }
  hudNeedle(ctx, HUD_RPM.x, cy, HUD_RPM.r, rpm / 1000 / H.gMax, '#ef7d57');
  hudNeedle(ctx, HUD_SPD.x, cy, HUD_SPD.r, kmh / H.maxK, '#ef7d57');
  // Drehzahl als Zahl im Drehzahlmesser
  const lim = v.limiterT > 0.05, zone = v.launched && !E.isEV && u >= 0.86 && v.gear < E.ratios.length;
  const rcol = lim ? '#ff4b55' : zone ? '#a7f070' : '#f4f4f4';
  const rs = String(Math.round(rpm / 10) * 10), rw = rs.length * 3 + 2;
  ctx.fillStyle = '#05060c'; ctx.fillRect(HUD_RPM.x - rw / 2, cy + 5, rw, 6);
  cxText(ctx, rs, HUD_RPM.x, cy + 6, rcol, 1, 'c');
  if (E.ind === 'turbo' || E.ind === 'twin') { ctx.fillStyle = '#05060c'; ctx.fillRect(HUD_RPM.x - 15, cy + 12, 30, 7); }
  if (E.ind === 'turbo' || E.ind === 'twin') cxText(ctx, (v.boost * (E.indMul - 1) * 2.2).toFixed(1) + ' BAR', HUD_RPM.x, cy + 13, v.boost > 0.5 ? '#73eff7' : '#566c86', 1, 'c');
  // Schaltlichter
  const lx = 92;
  for (let i = 0; i < 10; i++) {
    const on = u >= 0.6 + i * 0.04;
    const col = i < 4 ? '#38e070' : i < 7 ? '#ffcd75' : i < 9 ? '#ff4b55' : '#41a6f6';
    const blink = u > 0.985 && Math.floor(R.t * 16) % 2;
    ctxDisc(ctx, lx + i * 9, y0 + 9, 3, on && !blink ? col : '#2a2b36');
  }
  // Gang (grün blinkend = jetzt schalten)
  if (zone && Math.floor(R.t * 8) % 2) { ctx.fillStyle = '#1e4a2a'; ctx.fillRect(141, y0 + 19, 38, 28); }
  cxText(ctx, E.isEV ? 'D' : (v.launched ? String(v.gear) : 'N'), 160, y0 + 21, v.shiftT > 0 ? '#566c86' : zone ? '#a7f070' : '#ffcd75', 4, 'c');
  if (zone) cxText(ctx, 'HOCH!', 160, y0 + 42, '#a7f070', 1, 'c');
  // Digitaltacho, Zeit, Fortschritt
  cxText(ctx, String(Math.round(kmh)).padStart(3, ' '), 133, y0 + 21, '#73eff7', 2, 'r');
  const el = v.launched ? R.t - R.p.launchT : 0;
  if (R.cruise) { ctx.fillStyle = '#05060c'; ctx.fillRect(190, y0 + 33, 34, 6); cxText(ctx, (v.x / 1000).toFixed(1), 228, y0 + 21, '#a7f070', 2, 'r'); cxText(ctx, R.auto ? 'KM  AUTO' : 'KM', 207, y0 + 34, '#566c86', 1, 'c'); }
  else cxText(ctx, (R.p.et || el).toFixed(2), 228, y0 + 21, '#a7f070', 2, 'r');
  const prog = clamp(v.x / R.D, 0, 1), oprog = clamp(R.ov.x / R.D, 0, 1);
  if (!R.cruise) { ctx.fillStyle = '#ff7b8a'; ctx.fillRect(90 + Math.round(oprog * 44), y0 + 41, 2, 7); }
  ctx.fillStyle = '#a7f070'; ctx.fillRect(90, y0 + 43, Math.round(prog * 46), 3);
  // NOS-Anzeige
  if (c.nos) {
    const fill = v.nosUsed ? clamp(v.nosT / c.nos.dur, 0, 1) : 1;
    ctx.fillStyle = v.nosT > 0 ? (Math.floor(R.t * 10) % 2 ? '#73eff7' : '#3b5dc9') : '#3b5dc9'; ctx.fillRect(186, y0 + 42, Math.round(fill * 30), 5);
    cxText(ctx, 'NOS', 228, y0 + 42, fill > 0 ? '#73eff7' : '#566c86', 1, 'r');
  } else cxText(ctx, 'KEIN NOS', 207, y0 + 42, '#566c86', 1, 'c');
  // Reifentemperatur
  for (let i = 0; i < 46; i++) { const f = i / 46; if (f > v.heat / 1.1) break; ctx.fillStyle = f < 0.55 ? '#3b5dc9' : f < 0.82 ? '#38b764' : '#b13e53'; ctx.fillRect(68 + i * 4, y0 + 49, 3, 3); }
  cxText(ctx, 'REIFEN', 64, y0 + 48, v.heat > 0.6 && v.heat < 0.92 ? '#a7f070' : '#94b0c2', 1, 'r');
}

// ---------- Ergebnis ----------
function showRaceResult() {
  const R = RACE; R.resultShown = true;
  const win = playerWins(), cfg = R.cfg;
  const p = R.p, o = R.o;
  let reward = '';
  S.stats.races++;
  if (win) {
    S.stats.wins++;
    if (cfg.oppId) { S.stats.beat = S.stats.beat || {}; S.stats.beat[cfg.oppId] = (S.stats.beat[cfg.oppId] || 0) + 1; }
    S.money += cfg.prize; addXP(cfg.xp); if (cfg.rep) addRep(cfg.rep);
    reward = `${cfg.prize ? `<div class="good">+${fmtMoney(cfg.prize)}</div>` : ''}<div class="good">+${cfg.xp} XP${cfg.rep ? ` · +${cfg.rep} Ruf` : ''}</div>`;
  } else { addXP(Math.round(cfg.xp * 0.25)); reward = `<div class="muted">+${Math.round(cfg.xp * 0.25)} XP fürs Mitmachen</div>`; }
  if (!p.foul && p.et) {
    if (cfg.dist === 'quarter' && (!S.stats.best14 || p.et < S.stats.best14)) S.stats.best14 = p.et;
    if (p.t18 && (!S.stats.best18 || p.t18 < S.stats.best18)) S.stats.best18 = p.t18;
    if (p.react != null && (!S.stats.react || p.react < S.stats.react)) S.stats.react = p.react;
  }
  if (p.blown && cfg.player.salvageId && S.salvage) {
    const o = S.salvage.owned.find(x => x.id === cfg.player.salvageId);
    if (o) { o.cond = Math.max(5, o.cond - 15); svSyncWear(o); }
  }
  const leagueTxt = cfg.league ? leagueAfterRace(cfg, p, o) : '';
  const careerTxt = careerAfterRace(cfg, win);
  const ghostTxt = ghostSave(R), wearTxt = wearAfter(R), mg = finishMargin(R);
  if (typeof chalEvent === 'function') chalEvent('race', { win, R });
  checkAchievements();
  const fmt = v => v != null ? v.toFixed(3) + ' s' : '–';
  const perf = p.shifts.filter(s => s === 'perfect').length;
  const box = document.createElement('div');
  box.className = 'ov';
  box.style.position = 'absolute';
  box.innerHTML = `<div class="mbox small">
    <h2 class="title" style="color:${win ? 'var(--lime)' : '#ff7b8a'}">${ico(win ? 'trophy' : 'race', 'big')} ${win ? 'SIEG!' : 'NIEDERLAGE'}</h2>
    ${p.blown ? '<div class="bad" style="margin:4px">💥 MOTORSCHADEN – Ausgeschieden! Der Wagen hat 15 % Zustand verloren.</div>' : ''}
    ${timeslipHTML(R, win, mg)}
    <div class="hint" style="margin:4px">0–100 km/h: ${fmt(p.t100)} · Perfekte Schaltvorgänge: ${perf}/${p.shifts.length}${p.launchQ ? ' · Start: ' + ({ perfect: 'perfekt', high: 'zu viel Gas', low: 'zu wenig Drehzahl' })[p.launchQ] : ''}</div>
    ${cfg.oppId && OPP_INFO[cfg.oppId] ? `<div class="flex" style="margin:8px 4px">${faceImg(cfg.oppId, 40)}<i>„${esc(oppQuote(cfg.oppId, win ? 'lose' : 'win'))}“</i></div>` : ''}
    <div style="margin:10px 4px">Gewinner: <b>${win ? 'Du (' + esc(cfg.player.name) + ')' : esc(cfg.opp.name)}</b>${reward}${ghostTxt}${wearTxt}</div>${leagueTxt}${careerTxt}
    <div class="flex"><button class="btn green ${cfg.league ? 'hidden' : ''}" id="rr-again">Nochmal${cfg.fee ? ' (' + fmtMoney(cfg.fee) + ')' : ''}</button><button class="btn gray" id="rr-back">Zurück</button></div></div>`;
  $('#race').appendChild(box);
  $('#rr-back').onclick = () => endRace(false);
  $('#rr-again').onclick = () => {
    if (S.money < cfg.fee) { toast('Zu wenig Geld für das Startgeld.', 'bad'); return; }
    S.money -= cfg.fee; const c2 = cfg; endRace(false, true); startRace(c2);
  };
  saveGame();
}

function endRace(quit, silent) {
  const R = RACE; if (!R) return;
  if (typeof sirenOn === 'function') sirenOn(false);
  cancelAnimationFrame(R.raf); clearTimeout(R.loadTO);
  if (R.cruise) { const km = R.pv.x / 1000; if (km >= 0.5) addXP(Math.min(150, Math.round(km * 12))); toast(`${ico('car')} Cruise beendet: ${km.toFixed(1)} km · Spitze ${Math.round(R.vmax || 0)} km/h · ${R.passed || 0} überholt${R.crashes ? ' · ' + R.crashes + '× angestossen' : ''}`, 'good', 5000); }
  else if (quit && !R.resultShown) { S.stats.races++; toast('Rennen aufgegeben.', 'bad'); }
  audioStop();
  RACE = null;
  const el = $('#race'); if (el) el.remove();
  if (!silent) { updateTopbar(true); if (curTab === 'race') rerender(); }
}

// ---------- Dragstrip-Details: Gummi, Anzeigetafel, Bremsschirm, Zeitzettel ----------
/** Gummi auf der Bahn: dunkle Startzone (viele Starts vorher) + eigene Spuren dieses Rennens */
function drawRubber(ctx, W, camX) {
  const R = RACE;
  for (const gy of [LANE_FAR, LANE_NEAR]) {
    const x0 = W(-16), x1 = W(160);
    if (x1 < 0 || x0 > RW_) continue;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, 'rgba(8,8,10,0.7)'); g.addColorStop(0.15, 'rgba(8,8,10,0.55)'); g.addColorStop(1, 'rgba(8,8,10,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.max(0, x0), gy - 4, Math.min(RW_, x1) - Math.max(0, x0), 4);
  }
  ctx.fillStyle = 'rgba(6,6,8,0.6)';
  for (const who of ['p', 'o']) {
    const gy = who === 'p' ? LANE_NEAR : LANE_FAR;
    for (const k of R.marks[who]) { const x = W(k / 6); if (x >= -2 && x <= RW_ + 2) ctx.fillRect(x, gy - 2, 2, 2); }
  }
  void camX;
}
/** Anzeigetafel hinter dem Ziel: Zeit und Geschwindigkeit je Bahn, Siegerlampe */
function drawScoreboard(ctx, x) {
  const R = RACE;
  if (x < -80 || x > RW_ + 10) return;
  ctx.fillStyle = '#3a3e48'; ctx.fillRect(x + 6, 44, 3, 22); ctx.fillRect(x + 62, 44, 3, 22);
  ctx.fillStyle = '#0b0c12'; ctx.fillRect(x, 18, 72, 28); ctx.fillStyle = '#566c86'; ctx.fillRect(x, 18, 72, 1); ctx.fillRect(x, 45, 72, 1);
  const both = (R.p.fin || R.p.foul || R.p.blown) && (R.o.fin || R.o.foul);
  const win = both ? playerWins() : null;
  const row = (rec, y, name, isP) => {
    cxText(ctx, name, x + 3, y, '#94b0c2', 1);
    if (rec.foul) { cxText(ctx, 'ROT', x + 40, y, '#ff4b55', 1, 'c'); return; }
    if (rec.et) { cxText(ctx, rec.et.toFixed(3), x + 44, y, '#ffcd75', 1, 'r'); cxText(ctx, String(Math.round(rec.trap)), x + 62, y, '#ff7b8a', 1, 'r'); }
    const lit = win != null && (isP ? win : !win);
    ctxDisc(ctx, x + 67, y + 2, 2, lit ? '#fff0a0' : '#2a2b33');
  };
  row(R.o, 22, 'KI', false); row(R.p, 33, 'DU', true);
}
const chuteOpen = rec => rec.chuteT != null && RACE && RACE.t >= rec.chuteT;
/** Bremsschirm hinter schnellen Autos (ab 230 km/h im Ziel) */
function drawChute(ctx, rec, v, rearX, groundY) {
  const R = RACE;
  if (!chuteOpen(rec) || v.v < 0.5) return;
  const k = clamp((R.t - rec.chuteT) / 0.45, 0, 1), ax = rearX, ay = groundY - 9;
  const cx = ax - 10 - 22 * k, cy = ay - 4 + Math.round(Math.sin(R.t * 18) * 0.6), rr = 2 + 7 * k;
  ctx.fillStyle = '#2a2b33';
  for (let i = 0; i <= 12; i++) { const t = i / 12; ctx.fillRect(Math.round(lerp(ax, cx + 2, t)), Math.round(lerp(ay, cy - rr * 0.7, t)), 1, 1); ctx.fillRect(Math.round(lerp(ax, cx + 2, t)), Math.round(lerp(ay, cy + rr * 0.7, t)), 1, 1); }
  for (let y = -rr; y <= rr; y++) {
    const w = Math.round(Math.sqrt(Math.max(0, rr * rr - y * y)) * 0.8) + 1;
    ctx.fillStyle = (Math.floor((y + rr) / 2) % 2) ? '#f4f4f4' : '#d82838';
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w + 1, 1);
  }
}
/** Zeitzettel wie an echten Dragstrips */
function timeslipHTML(R, win, mg) {
  const p = R.p, o = R.o, D = R.D;
  const f3 = v => v != null ? v.toFixed(3) : '—', kmh = v => v ? Math.round(v) + '' : '—';
  const rows = [['R/T', o.foul ? 'ROT' : f3(o.react), p.foul ? 'ROT' : f3(p.react)], ['18 m (60 ft)', f3(o.t60), f3(p.t60)], ['100 m (330 ft)', f3(o.t330), f3(p.t330)]];
  if (D >= 201) rows.push(['1/8 MEILE', f3(o.t18), f3(p.t18)], ['1/8 KM/H', kmh(o.v18), kmh(p.v18)]);
  if (D >= 402) rows.push(['305 m (1000 ft)', f3(o.t1000), f3(p.t1000)], ['1/4 MEILE', f3(o.t14), f3(p.t14)], ['1/4 KM/H', kmh(o.v14), kmh(p.v14)]);
  if (D > 403) rows.push([distOf(R.cfg.dist).short.toUpperCase(), f3(o.et), f3(p.et)], ['ZIEL KM/H', kmh(o.trap), kmh(p.trap)]);
  const tr = rows.map(([a, b, c]) => `<tr><td style="text-align:left;padding:1px 6px">${a}</td><td style="text-align:right;padding:1px 6px">${b}</td><td style="text-align:right;padding:1px 6px;font-weight:bold">${c}</td></tr>`).join('');
  const day = S ? S.day : 1;
  return `<div style="background:#f3efe2;color:#1d1d22;font:13px/1.35 'Courier New',monospace;margin:6px 4px;padding:8px 6px;border-top:2px dashed #9a9488;border-bottom:2px dashed #9a9488;box-shadow:0 3px 8px rgba(0,0,0,.35)">
    <div style="text-align:center;font-weight:bold;letter-spacing:1px">${esc(_raceBG.T.name.toUpperCase())}</div>
    <div style="text-align:center;font-size:11px;margin-bottom:4px">ZEITZETTEL · TAG ${day} · ${distOf(R.cfg.dist).short.toUpperCase()}</div>
    <table style="width:100%;border-collapse:collapse"><tr style="border-bottom:1px solid #9a9488"><th style="text-align:left;padding:1px 6px"></th><th style="text-align:right;padding:1px 6px">LINKS</th><th style="text-align:right;padding:1px 6px">RECHTS</th></tr>
    <tr><td style="padding:1px 6px;font-size:11px"></td><td style="text-align:right;padding:1px 6px;font-size:11px">${esc(R.cfg.opp.name).slice(0, 14)}</td><td style="text-align:right;padding:1px 6px;font-size:11px">${esc(R.cfg.player.name).slice(0, 14)}</td></tr>
    ${tr}</table>
    <div style="text-align:center;margin-top:4px;font-weight:bold">${win ? '◄ SIEG: RECHTE BAHN ►' : '◄ SIEG: LINKE BAHN ►'}${mg != null ? ` · ${Math.abs(mg).toFixed(3)} s${R.photo ? ' FOTOFINISH' : ''}` : ''}</div></div>`;
}
