/* =============================================================================
   Teil 10f: Länder-Kulissen (für Rennstrecken und die freie Fahrt)
   Jedes Land: Hintergrund-Streifen (320x30, spaltenweise), Häuserreihe
   (192x34, 2 Bilder für Lichter), Requisiten vor der Strasse und Animationen.
   Länder: Japan (Fuji, Izakaya), Vietnam (Halong-Felsen, Röhrenhäuser),
   Kambodscha (Tempel, Pfahlhäuser), China (Grosse Mauer, Pagoden),
   Schweiz (Gipfel, Chalets, Gondel), Thailand (Lamai, siehe 10e).
   ============================================================================= */
let ROAM = null;                                         // (früher: freie Fahrt – entfernt)
let TILE_SEED = 0;                                       // Varianten der Häuserreihen
const sceneT = () => (RACE ? RACE.t : ROAM ? ROAM.t : (typeof CUT !== 'undefined' && CUT) ? CUT.t : 0);

// ---------- kleine Zeichenhelfer (PB = Pixelpuffer) ----------
/** zeichenähnliches 5x5-Muster (wirkt wie Kanji/Hanzi, ist aber frei erfunden) */
function pbGlyph(p, x, y, seed, col) {
  const c = Chex(col);
  p.rect(x, y + 1 + Math.floor(hash2(seed, 1) * 3), 5, 1, c);
  p.rect(x + 1 + Math.floor(hash2(seed, 2) * 3), y, 1, 5, c);
  for (let k = 0; k < 4; k++) if (hash2(seed, 10 + k) > 0.45) p.set(x + Math.floor(hash2(seed, 20 + k) * 5), y + Math.floor(hash2(seed, 30 + k) * 5), c);
}
function pbTree(p, x, base, kind, fr, seed) {
  if (kind === 'sakura') {
    for (let y = base - 9; y < base; y++) p.set(x, y, Chex('#5a3a2a'));
    for (let a = 0; a < 40; a++) { const r = hash2(seed, a) * 6, an = hash2(seed, a + 50) * Math.PI * 2; p.set(x + Math.round(Math.cos(an) * r * 1.3), base - 11 + Math.round(Math.sin(an) * r * 0.8), Chex(hash2(seed, a + 99) > 0.4 ? '#ffb0d0' : '#ff8ab8')); }
  } else if (kind === 'pine') {
    for (let y = base - 3; y < base; y++) p.set(x, y, Chex('#4a3020'));
    for (let k = 0; k < 12; k++) { const w = Math.round(k * 0.45); p.rect(x - w, base - 15 + k, w * 2 + 1, 1, Chex(k % 3 ? '#1e5a3a' : '#2a7048')); }
  } else if (kind === 'palm') {
    for (let y = base - 14; y < base; y++) p.set(x + Math.round(Math.sin((base - y) * 0.12) * 1.5), y, Chex(y % 3 ? '#8a6a3a' : '#6a4a2a'));
    const cx = x + 2, cy = base - 14;
    for (let a = 0; a < 7; a++) { const ang = -Math.PI + a * Math.PI / 6; for (let r = 1; r < 8; r++) p.set(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r * 0.5 + r * r * 0.05), Chex(r > 5 ? '#4a9a46' : '#2f7a3a')); }
  } else if (kind === 'bamboo') {
    for (let s = 0; s < 4; s++) { const bx = x + s * 2 - 3, h = 16 + Math.floor(hash2(seed, s) * 10); for (let y = base - h; y < base; y++) p.set(bx, y, Chex(y % 5 ? '#5aa050' : '#3a7a3a')); p.set(bx + 1, base - h + 2, Chex('#7ac060')); }
  }
}
/** Reihe von Gebäuden: house(p, x, w, h, i, fr) zeichnet eins; Lücken optional mit Baum */
function pbStreet(fr, house, opt = {}) {
  const W = 192, H = 34, p = new PB(W, H);
  if (opt.back) for (let bx = 0; bx < W; bx++) { const hb = Math.round(6 + 4 * Math.sin(bx * 0.11) + 3 * hash2(bx >> 2, 3)); for (let y = hb; y < H; y++) p.set(bx, y, Chex(y === hb ? shadeHex(opt.back, 0.15) : opt.back)); }
  let x = 0, i = TILE_SEED;
  while (x < W) {
    if (opt.tree && hash2(i, 9) > (opt.gap || 0.8) && x > 3 && x < W - 12) { pbTree(p, x + 5, H, opt.tree, fr, i); x += 11; i++; continue; }
    const w = Math.min((opt.wMin || 18) + Math.floor(hash2(i, 1) * (opt.wVar || 14)), W - x), h = (opt.hMin || 16) + Math.floor(hash2(i, 2) * (opt.hVar || 14));
    house(p, x, w, h, i, fr, H);
    x += w + (opt.space || 0); i++;
  }
  if (opt.poles) for (let px = 14; px < W; px += 64) {
    p.rect(px, 0, 1, H, Chex('#3a3e48')); p.rect(px - 3, 2, 7, 1, Chex('#3a3e48'));
    for (let k = 0; k < 64 && px + k < W; k++) { const sag = Math.round(Math.sin(k / 64 * Math.PI) * 3); p.set(px + k, 2 + sag, Chex('#22263a')); if (opt.poles > 1) p.set(px + k, 5 + sag, Chex('#22263a')); }
  }
  return p.canvas();
}

// ---------- vor der Strasse: Requisiten mit Bewegung (Canvas) ----------
function ctxSakura(ctx, x, t, k) {
  ctx.fillStyle = '#4a2e22'; ctx.fillRect(x, 46, 3, 29); ctx.fillRect(x - 5, 49, 5, 2); ctx.fillRect(x + 3, 45, 6, 2); ctx.fillRect(x - 2, 42, 2, 5);
  const sw = Math.sin(t * 1.2 + k) * 1;
  for (let a = 0; a < 130; a++) {
    const r = Math.sqrt(hash2(k, a)) * 14, an = hash2(k, a + 150) * Math.PI * 2, yy = Math.sin(an) * r * 0.62;
    ctx.fillStyle = yy > 4 ? '#e86a9a' : hash2(k, a + 300) > 0.35 ? '#ffb8d8' : '#ffd8ea';
    ctx.fillRect(Math.round(x + 1 + Math.cos(an) * r * 1.5 + sw * (1 - yy / 10)), Math.round(38 + yy), 2, 2);
  }
}
function ctxLanternPole(ctx, x, t, k, col = '#d83030') {
  ctx.fillStyle = '#2a2b33'; ctx.fillRect(x, 44, 1, 31);
  ctx.fillRect(x - 4, 44, 9, 1);
  for (const [ox, ph] of [[-3, 0], [4, 1.7]]) {
    const sw = Math.sin(t * 2 + k + ph) * 1.2, lx = Math.round(x + ox + sw);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,120,60,0.16)'; ctx.beginPath(); ctx.arc(lx, 50, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#2a2b33'; ctx.fillRect(lx, 45, 1, 1);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(lx + 0.5, 50, 3.2, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb070'; ctx.fillRect(lx - 1, 48, 1, 4);
    ctx.fillStyle = '#d4a640'; ctx.fillRect(lx - 2, 46, 5, 1); ctx.fillRect(lx - 2, 54, 5, 1); ctx.fillRect(lx, 55, 1, 3);
  }
}
function ctxPine(ctx, x, k) {
  const h = 26 + Math.round(hash2(k, 7) * 12);
  ctx.fillStyle = '#4a3020'; ctx.fillRect(x, 70, 2, 5);
  for (let i = 0; i < h; i++) { const w = Math.round(i * 0.32); ctx.fillStyle = i % 4 ? '#1e5a3a' : '#2a7048'; ctx.fillRect(x + 1 - w, 70 - h + i, w * 2 + 1, 1); }
}
function ctxScooter(ctx, x, y, i, hat) {
  ctx.fillStyle = ['#b13e53', '#3b5dc9', '#ffcd75', '#38b764', '#f4f4f4'][i % 5]; ctx.fillRect(Math.round(x), y, 6, 2);
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(Math.round(x), y + 2, 2, 1); ctx.fillRect(Math.round(x) + 4, y + 2, 2, 1);
  ctx.fillStyle = ['#38b764', '#f4f4f4', '#ef7d57', '#5d275d'][i % 4]; ctx.fillRect(Math.round(x) + 2, y - 2, 2, 2);
  if (hat) { ctx.fillStyle = '#e8d8a0'; ctx.fillRect(Math.round(x) + 1, y - 3, 4, 1); ctx.fillRect(Math.round(x) + 2, y - 4, 2, 1); } else { ctx.fillStyle = '#f0c0a0'; ctx.fillRect(Math.round(x) + 2, y - 3, 1, 1); }
}
/** Fahrzeuge hinter der Mauer (Roller, Tuk-Tuks) */
function ctxTraffic(ctx, camX, t, n, kind) {
  for (let i = 0; i < n; i++) {
    const x = ((hash2(i, 420) * 420 - t * (26 + i * 7) - camX * PPM * 0.35) % 420 + 420) % 420 - 50, y = 63;
    if (kind === 'tuk' && i % 2 === 0) {
      ctx.fillStyle = '#2a6ac8'; ctx.fillRect(Math.round(x), y - 5, 9, 1); ctx.fillStyle = '#ffcd75'; ctx.fillRect(Math.round(x), y - 4, 1, 5); ctx.fillRect(Math.round(x) + 8, y - 4, 1, 5);
      ctx.fillStyle = '#b13e53'; ctx.fillRect(Math.round(x) + 6, y - 2, 4, 3); ctx.fillStyle = '#1a1c2c'; ctx.fillRect(Math.round(x) + 1, y + 1, 2, 1); ctx.fillRect(Math.round(x) + 7, y + 1, 2, 1);
    } else ctxScooter(ctx, x, y, i, kind === 'hat');
  }
}

// =============================================================================
const THEMES = {
  // ---------------- Japan ----------------
  japan: {
    landmark: (ctx, t, ox, oy, sc) => drawFuji(ctx, t, ox, oy, sc),
    strip(set, x) {
      const hl = Math.round(21 + 2 * Math.sin(x * 0.05) + 2 * Math.sin(x * 0.13));
      for (let y = hl; y < 30; y++) set(y, y < hl + 2 ? '#4a8a5a' : (hash2(x >> 1, y) > 0.8 ? '#24583a' : '#2f6a48'));
      if (x % 97 > 40 && x % 97 < 46 && hl < 22) { set(hl - 1, '#c83030'); set(hl - 2, '#c83030'); }
    },
    tile: fr => pbStreet(fr, (p, x, w, h, i, fr, H) => {
      const top = H - h, wood = hash2(i, 3) > 0.5 ? '#5a3a2a' : '#6a4a32';
      p.rect(x, top + 4, w, h - 4, Chex('#f0e8d8')); p.rect(x, H - 13, w, 13, Chex(wood));          // Putz oben, Holz unten
      p.rect(x - 1, top + 2, w + 2, 3, Chex('#3a4058')); p.rect(x - 2, top + 4, w + 4, 1, Chex('#22263a'));   // Ziegeldach mit Überstand
      p.rect(x - 1, H - 15, w + 2, 2, Chex('#3a4058'));
      for (let k = 0; k < Math.floor((w - 4) / 5); k++) { p.rect(x + 3 + k * 5, top + 7, 3, 4, Chex(fr && hash2(i, k) > 0.5 ? '#ffe8a0' : '#c8b8a0')); p.rect(x + 4 + k * 5, top + 7, 1, 4, Chex('#5a3a2a')); }
      const nc = ['#29366f', '#b13e53', '#1a1c2c', '#38704a'][Math.floor(hash2(i, 4) * 4)];      // Noren-Vorhang
      for (let k = 0; k < w - 6; k++) if (k % 4 !== 3) p.rect(x + 3 + k, H - 11, 1, 5, Chex(nc));
      p.rect(x + 3, H - 6, w - 6, 6, Chex(fr ? '#3a2a1a' : '#2a1e14'));
      if (hash2(i, 5) > 0.35) { const lx = x + 1, lit = fr || hash2(i, 6) > 0.5; p.rect(lx, H - 14, 3, 4, Chex(lit ? '#ff5040' : '#c83030')); p.set(lx + 1, H - 15, Chex('#1a1c2c')); }   // Laterne
      if (hash2(i, 7) > 0.4) { const sx = x + w - 5; p.rect(sx, top + 5, 4, 12, Chex(hash2(i, 8) > 0.5 ? '#f4f4e8' : '#b13e53')); for (let g = 0; g < 2; g++) pbGlyph(p, sx, top + 6 + g * 5, i * 7 + g, '#1a1c2c'); }   // Hochkant-Schild
      if (hash2(i, 11) > 0.82) { p.rect(x + 2, H - 10, 5, 10, Chex('#e8eef8')); p.rect(x + 3, H - 8, 3, 3, Chex(fr ? '#73eff7' : '#41a6f6')); }   // Getränkeautomat
    }, { tree: 'sakura', gap: 0.82, wMin: 18, wVar: 10, hMin: 20, hVar: 10, poles: 2, back: '#4a5a6a' }),
    front(ctx, W, camX, t) {
      drawSakuraRoad(ctx, W, camX);
      for (let k = Math.floor(camX / 9) - 2; k < camX / 9 + RW_ / PPM / 9 + 2; k++) {
        const x = W(k * 9 + hash2(k, 441) * 3);
        if (hash2(k, 440) > 0.55) ctxSakura(ctx, x, t, k); else if (hash2(k, 440) > 0.3) ctxLanternPole(ctx, x, t, k);
      }
    },
    ambient(ctx, camX, t) {                                                               // Kirschblüten wehen durchs Bild
      drawSakuraParts(ctx, camX, clamp(t - (SAKURA.lastT == null ? t : SAKURA.lastT), 0, 0.05)); SAKURA.lastT = t;
      for (let i = 0; i < 50; i++) {
        const y = (hash2(i, 2) * 140 + t * (14 + hash2(i, 3) * 10)) % 140 - 10, x = ((hash2(i, 1) * RW_ - t * 22 + Math.sin(t * 2 + i) * 6 + camX * PPM * 0.5) % RW_ + RW_) % RW_;
        ctx.fillStyle = i % 3 ? '#ffb8d8' : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), Math.sin(t * 5 + i) > 0 ? 2 : 1, 1);
      }
    },
    ads: ['RAMEN', 'SUSHI BAR', 'IZAKAYA', 'MATCHA', 'KARAOKE', 'ONSEN', 'TAKOYAKI', 'PACHINKO']
  },
  // ---------------- Vietnam ----------------
  vietnam: {
    strip(set, x) {
      for (let y = 22; y < 30; y++) set(y, (y + Math.floor(x / 4)) % 6 === 0 ? '#9ad8c8' : '#4a9a90');   // Bucht
      let best = 0, side = 0;                                                               // Karstfelsen: steil, oben rund
      for (let k = Math.floor(x / 15) - 1; k <= Math.floor(x / 15) + 1; k++) {
        const cx = k * 15 + hash2(k, 3) * 8, w = 5 + hash2(k, 2) * 6, h = 8 + hash2(k, 1) * 16, d = Math.abs(x - cx) / w;
        if (d < 1) { const v = h * (1 - Math.pow(d, 4)); if (v > best) { best = v; side = x < cx ? -1 : 1; } }
      }
      const top = Math.round(22 - best);
      for (let y = top; y < 23; y++) { const veg = y < top + 2 || hash2(x, y) > 0.72; set(y, y > 18 ? '#a8c4bc' : veg ? (side < 0 ? '#4a8a5a' : '#3a7048') : (side < 0 ? '#7a8a84' : '#5a6a66')); }
      const b = x % 83; if (b >= 30 && b < 38) { set(26, '#6a3a1e'); set(27, '#6a3a1e'); if (b > 32 && b < 36) { set(24, '#c83030'); set(25, '#c83030'); set(23, '#c83030'); } }   // Dschunke
    },
    tile: fr => pbStreet(fr, (p, x, w, h, i, fr, H) => {
      const top = H - h, c = hex2rgb(['#f4d06a', '#8fd0c8', '#f4a0a0', '#c8e070', '#f4f0e0', '#f0b060'][Math.floor(hash2(i, 3) * 6)]);
      p.rect(x, top, w, h, Crgb(c)); p.rect(x, top, w, 1, Crgb(shadeRGB(c, -0.3))); p.rect(x + w - 1, top, 1, h, Crgb(shadeRGB(c, -0.25)));
      for (let f = 0; f * 7 + 12 < h; f++) {
        const wy = top + 3 + f * 7;
        p.rect(x + 2, wy, w - 4, 4, Chex(fr && hash2(i, f) > 0.5 ? '#ffe8a0' : '#29366f')); p.rect(x + 1, wy + 4, w - 2, 1, Chex('#f4f4f4'));
        if (hash2(i, f + 9) > 0.5) p.rect(x + 2, wy + 3, 2, 1, Chex('#38b764'));                   // Pflanzen am Balkon
      }
      const sc = ['#b13e53', '#3b5dc9', '#ffcd75', '#38b764'][Math.floor(hash2(i, 5) * 4)];
      p.rect(x, H - 13, w, 3, Chex(sc)); for (let k = x + 2; k < x + w - 2; k += 2) if (hash2(k, i) > 0.4) p.set(k, H - 12, Chex('#f4f4f4'));
      p.rect(x + 1, H - 10, w - 2, 10, Chex('#22263a'));
      for (let k = 0; k < 3; k++) p.rect(x + 2 + Math.floor(hash2(i, 20 + k) * (w - 5)), H - 4, 2, 2, Chex(['#ef7d57', '#a7f070', '#ffcd75'][k]));   // Plastikhocker
    }, { tree: 'palm', gap: 0.88, wMin: 12, wVar: 8, hMin: 22, hVar: 12, poles: 3, back: '#7a8a8a' }),
    front(ctx, W, camX, t) {
      // Lampion-Ketten (Hoi An) quer über der Strasse
      for (let k = Math.floor(camX / 14) - 1; k < camX / 14 + RW_ / PPM / 14 + 1; k++) {
        const x0 = W(k * 14);
        for (let j = 0; j < 9; j++) { const x = x0 + j * 28, sag = Math.sin(j / 9 * Math.PI) * 4, sw = Math.sin(t * 2.2 + j + k) * 0.8; ctx.fillStyle = ['#ff5040', '#ffcd75', '#ff8a30', '#c040ff', '#38b764'][(j + k) % 5]; ctx.beginPath(); ctx.ellipse(x + sw, 46 + sag, 2, 2.6, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(30,30,40,0.6)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x0, 42); ctx.quadraticCurveTo(x0 + 126, 52, x0 + 252, 42); ctx.stroke();
      }
    },
    ambient(ctx, camX, t) { ctxTraffic(ctx, camX, t, 7, 'hat'); },
    ads: ['PHO 24H', 'BANH MI', 'CA PHE', 'HOI AN', 'HALONG TOURS', 'SPRING ROLLS', 'NUOC MIA', 'MOTORBIKE']
  },
  // ---------------- Kambodscha ----------------
  cambodia: {
    strip(set, x) {
      for (let y = 18; y < 30; y++) set(y, (hash2(x >> 1, y) > 0.75) ? '#1e5a32' : '#2f7a42');                // Dschungel
      const dx = (x % 160) - 80, ad = Math.abs(dx);                                               // Tempeltürme (5 Spitzen)
      for (const [cx, hh, ww] of [[0, 16, 7], [-22, 11, 6], [22, 11, 6], [-40, 7, 5], [40, 7, 5]]) {
        const d = Math.abs(dx - cx); if (d < ww) for (let y = 20 - hh + Math.round(d * hh / ww * 0.9); y < 20; y++) set(y, (y % 3 === 0) ? '#5a5048' : '#7a6a58');
      }
      if (ad < 56) for (let y = 18; y < 22; y++) set(y, y === 18 ? '#8a7a66' : '#6a5a4a');
      for (let y = 27; y < 30; y++) set(y, '#4a7aa0');                                            // Wassergraben
    },
    tile: fr => pbStreet(fr, (p, x, w, h, i, fr, H) => {
      const top = H - h + 6;
      p.rect(x + 1, top, w - 2, H - top - 6, Chex(hash2(i, 3) > 0.5 ? '#9a6a3a' : '#7a5230'));           // Holzhaus auf Pfählen
      for (let k = 0; k < w; k += 3) p.rect(x + k, top, 1, H - top - 6, Chex('#6a4a2a'));
      for (let k = 0; k < w + 2; k++) p.rect(x - 1 + k, top - 3 + Math.abs(k - w / 2) * -0.25 | 0, 1, 3, Chex(k % 2 ? '#a8acb8' : '#8a8e98'));   // Wellblech
      p.rect(x + 2, top + 3, 4, 3, Chex(fr ? '#ffe8a0' : '#2a1e14'));
      for (const px of [x + 1, x + w - 2]) p.rect(px, H - 6, 1, 6, Chex('#5a3a22'));
      if (hash2(i, 5) > 0.5) { p.rect(x + 3, H - 5, w - 6, 3, Chex('#e8d8a0')); p.rect(x + 3, H - 6, w - 6, 1, Chex('#c83030')); }   // Marktstand
    }, { tree: 'palm', gap: 0.6, wMin: 16, wVar: 10, hMin: 16, hVar: 8, space: 3, back: '#2f5a32' }),
    front(ctx, W, camX, t) {
      for (let k = Math.floor(camX / 8) - 2; k < camX / 8 + RW_ / PPM / 8 + 2; k++) if (hash2(k, 450) > 0.5) {
        const bx = W(k * 8 + hash2(k, 451) * 3), h = 28 + Math.round(hash2(k, 452) * 12), sway = Math.sin(t * 1.3 + k) * 1.2;
        for (let y = 0; y < h; y++) { ctx.fillStyle = y % 3 ? '#8a6a3a' : '#6a4a2a'; ctx.fillRect(bx + Math.round(sway * y / h), 74 - y, 2, 1); }
        for (let a = 0; a < 9; a++) { const ang = a / 9 * Math.PI * 2 + sway * 0.05; for (let r = 1; r < 8; r++) { ctx.fillStyle = r > 5 ? '#5aaa50' : '#2a7a3a'; ctx.fillRect(Math.round(bx + sway + Math.cos(ang) * r), Math.round(74 - h + Math.sin(ang) * r * 0.7), 1, 1); } }   // Zuckerpalme
      }
      ctx.fillStyle = '#b8603a'; ctx.fillRect(0, 74, RW_, 1);                                           // rote Erde am Rand
    },
    ambient(ctx, camX, t) { ctxTraffic(ctx, camX, t, 5, 'tuk'); },
    ads: ['ANGKOR', 'TUK TUK', 'AMOK', 'SIEM REAP', 'NIGHT MARKET', 'LOTUS', 'KHMER BBQ', 'TEMPLE TOURS']
  },
  // ---------------- China ----------------
  china: {
    strip(set, x) {
      const hl = Math.round(12 + 5 * Math.sin(x * 0.03) + 3 * Math.sin(x * 0.09 + 2));
      for (let y = hl; y < 30; y++) set(y, y < hl + 2 ? '#5a8a5a' : '#3a6a48');                          // Hügel
      set(hl - 1, '#c8b890'); set(hl - 2, '#a89870'); if (x % 23 < 3) { set(hl - 3, '#a89870'); set(hl - 4, '#a89870'); }   // Grosse Mauer mit Türmen
      const pg = x % 140;                                                                         // Pagode
      if (pg > 100 && pg < 112) { const c = pg - 106; for (let f = 0; f < 5; f++) { const yy = 26 - f * 3, ww = 6 - f; if (Math.abs(c) <= ww) { set(yy, '#c83030'); set(yy - 1, Math.abs(c) === ww ? '#2a6a48' : '#c83030'); } } if (c === 0) set(10, '#ffcd75'); }
    },
    tile: fr => pbStreet(fr, (p, x, w, h, i, fr, H) => {
      const top = H - h + 4;
      p.rect(x + 1, top, w - 2, H - top, Chex('#e8dcc8'));
      for (const px of [x + 1, x + w - 3]) p.rect(px, top, 2, H - top, Chex('#b02828'));                   // rote Säulen
      for (let k = -2; k < w + 2; k++) { const up = (k < 1 || k > w - 2) ? 1 : 0; p.set(x + k, top - 2 - up, Chex('#2a6a48')); p.set(x + k, top - 1, Chex('#1e4a32')); }   // geschwungenes Dach
      p.rect(x, top, w, 1, Chex('#d4a640'));
      p.rect(x + 3, top + 3, w - 6, 5, Chex('#b02828')); for (let g = 0; g < Math.floor((w - 6) / 6); g++) pbGlyph(p, x + 4 + g * 6, top + 3, i * 9 + g, '#ffcd75');   // Ladenschild
      p.rect(x + 3, top + 10, w - 6, H - top - 10, Chex(fr ? '#5a2a1a' : '#3a1a12'));
      if (fr || hash2(i, 6) > 0.5) p.rect(x + 4, top + 11, w - 8, 1, Chex('#ffcd75'));
    }, { tree: 'bamboo', gap: 0.84, wMin: 18, wVar: 10, hMin: 18, hVar: 10, back: '#3a2a3a' }),
    front(ctx, W, camX, t) {
      for (let k = Math.floor(camX / 7) - 2; k < camX / 7 + RW_ / PPM / 7 + 2; k++) if (hash2(k, 460) > 0.4) ctxLanternPole(ctx, W(k * 7 + hash2(k, 461) * 2), t, k, '#e02828');
    },
    ambient(ctx, camX, t) {                                                               // Feuerwerk über der Stadt
      for (let n = 0; n < 2; n++) {
        const cyc = Math.floor(t / 2.6 + n * 0.5), ph = (t / 2.6 + n * 0.5) % 1;
        const fx = 30 + hash2(cyc, n) * (RW_ - 60), fy = 10 + hash2(cyc, n + 5) * 20, col = ['#ffcd75', '#ff5040', '#73eff7', '#a7f070', '#ff6ac1'][Math.floor(hash2(cyc, n + 9) * 5)];
        if (ph < 0.25) { ctx.fillStyle = '#fff4c0'; ctx.fillRect(Math.round(fx), Math.round(60 - (60 - fy) * ph / 0.25), 1, 2); }
        else if (ph < 0.8) { const r = (ph - 0.25) / 0.55 * 14; ctx.globalAlpha = 1 - (ph - 0.25) / 0.55; ctx.fillStyle = col; for (let a = 0; a < 14; a++) { const an = a / 14 * Math.PI * 2; ctx.fillRect(Math.round(fx + Math.cos(an) * r), Math.round(fy + Math.sin(an) * r + (ph - 0.25) * 6), 1, 1); } ctx.globalAlpha = 1; }
      }
    },
    ads: ['DIM SUM', 'NOODLES', 'TEA HOUSE', 'DRAGON', 'BAO', 'KUNG FU', 'HOT POT', 'SILK']
  },
  // ---------------- Schweiz ----------------
  swiss: {
    sky(pb) {                                                                             // markanter Pyramiden-Gipfel
      for (let x = 150; x < 320; x++) {
        const dx = x - 236, top = dx < 0 ? 3 + (-dx) * 0.62 : 3 + dx * 0.9 + (dx > 10 ? (dx - 10) * 0.5 : 0);
        for (let y = Math.ceil(top); y < 80; y++) {
          const snow = (y < top + 3 + hash2(x, y >> 2) * 3) || (hash2(x >> 1, y >> 1) > 0.72 && y < 30);
          pb.set(x, y, Chex(snow ? (dx > 0 ? '#dfe8f4' : '#ffffff') : (dx < 0 ? '#8a94aa' : '#6a7488')));
        }
      }
    },
    strip(set, x) {
      const tri = v => Math.abs(((v % 2) + 2) % 2 - 1);
      const peak = Math.round(6 + 14 * tri((x - 40) / 70) + 4 * tri(x / 19));
      const top = Math.max(0, peak);
      for (let y = top; y < 22; y++) set(y, y < top + 4 + (x % 3) ? '#ffffff' : ((x + y) % 6 ? '#7a8aa4' : '#6a7890'));
      for (let y = 18; y < 26; y++) if (y > 18 + Math.round(2 * Math.sin(x * 0.07))) set(y, y % 4 ? '#5aaa50' : '#4a9a46');   // Alpweiden
      for (let y = 26; y < 30; y++) set(y, (y + Math.floor(x / 5)) % 4 === 0 ? '#a8d8f0' : '#4a8ac8');   // Bergsee
    },
    tile: fr => pbStreet(fr, (p, x, w, h, i, fr, H) => {
      if (hash2(i, 12) > 0.86) {                                                              // Dorfkirche
        p.rect(x + 2, H - 28, 6, 28, Chex('#f4f0e8')); p.rect(x + 3, H - 33, 4, 5, Chex('#2a6a48')); p.set(x + 4, H - 34, Chex('#2a6a48')); p.rect(x + 3, H - 24, 4, 4, Chex('#d4a640'));
        p.rect(x + 8, H - 14, w - 9, 14, Chex('#f4f0e8')); return;
      }
      const top = H - h + 6;
      p.rect(x + 1, H - 8, w - 2, 8, Chex('#e8e4dc'));                                       // gemauerter Sockel
      p.rect(x + 1, top, w - 2, H - 8 - top, Chex(hash2(i, 3) > 0.5 ? '#8a5a32' : '#a06a3a'));     // Holz
      for (let k = 0; k < w + 4; k++) { const d = Math.abs(k - (w + 4) / 2); p.rect(x - 2 + k, top - 5 + Math.round(d * 0.4), 1, 2, Chex('#5a3a2a')); }   // flaches Satteldach
      for (let k = 0; k < Math.floor((w - 4) / 6); k++) {
        const wx = x + 3 + k * 6;
        p.rect(wx, top + 2, 4, 4, Chex(fr && hash2(i, k) > 0.5 ? '#ffe8a0' : '#29366f')); p.rect(wx - 1, top + 2, 1, 4, Chex('#2a6a48')); p.rect(wx + 4, top + 2, 1, 4, Chex('#2a6a48'));   // Fensterläden
        for (let f = 0; f < 4; f++) p.set(wx + f, top + 6, Chex(f % 2 ? '#38b764' : '#e02828'));    // Geranien
      }
      p.rect(x + 1, top + 8, w - 2, 1, Chex('#5a3a2a'));
      if (hash2(i, 9) > 0.7) { p.rect(x + 3, H - 6, 4, 6, Chex('#5a3a2a')); }
    }, { tree: 'pine', gap: 0.72, wMin: 18, wVar: 10, hMin: 20, hVar: 8, space: 2, back: '#3a7a40' }),
    front(ctx, W, camX, t) {
      for (let k = Math.floor(camX / 8) - 2; k < camX / 8 + RW_ / PPM / 8 + 2; k++) {
        const x = W(k * 8 + hash2(k, 471) * 3);
        if (hash2(k, 470) > 0.6) ctxPine(ctx, x, k);
        else if (hash2(k, 470) > 0.42) {                                                     // Kuh auf der Weide (kaut)
          const ch = Math.sin(t * 3 + k) > 0 ? 1 : 0;
          ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, 67, 9, 5); ctx.fillStyle = '#3a2a1e'; ctx.fillRect(x + 2, 68, 3, 2); ctx.fillRect(x + 6, 67, 2, 2);
          ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 9, 66 + ch, 3, 3); ctx.fillStyle = '#e8a0a0'; ctx.fillRect(x + 11, 68 + ch, 1, 1);
          ctx.fillStyle = '#3a2a1e'; for (const lx of [x + 1, x + 7]) ctx.fillRect(lx, 72, 1, 3); ctx.fillStyle = '#d4a640'; ctx.fillRect(x + 10, 69 + ch, 1, 1);   // Glocke
        }
      }
      ctx.fillStyle = '#5aaa50'; ctx.fillRect(0, 73, RW_, 2);
    },
    ambient(ctx, camX, t) {                                                               // Gondelbahn über die Berge
      const sl = -((camX * PPM * 0.05) % RW_);
      ctx.strokeStyle = 'rgba(40,44,60,0.7)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-10, 34); ctx.lineTo(RW_ + 10, 14); ctx.stroke();
      for (let i = 0; i < 3; i++) { const ph = ((t * 0.03 + i / 3) % 1), x = -10 + ph * (RW_ + 20), y = 34 - ph * 20; ctx.fillStyle = '#e02828'; ctx.fillRect(Math.round(x) - 2, Math.round(y) + 2, 5, 4); ctx.fillStyle = '#a8d8f0'; ctx.fillRect(Math.round(x) - 1, Math.round(y) + 3, 3, 1); ctx.fillStyle = '#3a3e48'; ctx.fillRect(Math.round(x), Math.round(y), 1, 2); }
      void sl;
    },
    ads: ['KÄSEFONDUE', 'SCHOKOLADE', 'RACLETTE', 'BERGBAHN', 'UHRMACHER', 'GRÜEZI', 'ALPKÄSE', 'SKISCHULE']
  }
};
// Lamai (10e) ins gleiche System einhängen
THEMES.samui = { strip: null, tile: fr => samuiTownTile(fr), front: (ctx, W, camX) => drawSamuiFront(ctx, W, camX), ambient: null, ads: null };
