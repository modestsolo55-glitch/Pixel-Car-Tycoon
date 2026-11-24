/* =============================================================================
   Teil 10e: Längere Distanzen + Strecke „Koh Samui – Lamai“
   Lamai: grüne Hügel, türkises Meer mit Longtail-Booten, bunte Shophouses mit
   Markisen und Schildern, Strommasten, Palmen am Strassenrand, Roller.
   ============================================================================= */
const DISTS = {
  eighth:  { m: 201.17,  label: '1/8 Meile (201 m)',   short: '1/8 Meile', prize: 0.6, lvl: 1 },
  quarter: { m: 402.34,  label: '1/4 Meile (402 m)',   short: '1/4 Meile', prize: 1,   lvl: 1 },
  half:    { m: 804.67,  label: '1/2 Meile (805 m)',   short: '1/2 Meile', prize: 1.5, lvl: 6 },
  mile:    { m: 1609.34, label: '1 Meile (1609 m)',    short: '1 Meile',   prize: 2.2, lvl: 12 }
};
const distOf = k => DISTS[k] || DISTS.quarter;
const distOK = () => S.level >= distOf(RSEL.dist).lvl || (RSEL.dist = 'quarter');
/** geschätzte Zeit (perfekt gefahren) für eine Distanz */
function distTime(car, k) {
  if (k === 'eighth') return car.t18;
  if (k === 'quarter' || !DISTS[k]) return car.t14;
  const ck = [k, car.ps, car.nm, car.weight, car.cd, car.grip, car.E.red, car.E.gears, car.top, car.launchU].join('|');
  if (_distCache.has(ck)) return _distCache.get(ck);
  const res = distTimeRaw(car, k); if (_distCache.size > 400) _distCache.clear(); _distCache.set(ck, res); return res;
}
const _distCache = new Map();
function distTimeRaw(car, k) {
  const D = DISTS[k].m, v = new Vehicle(car), E = car.E; v.heat = 0.8;
  v.rpm = E.isEV ? 0 : E.idle + (car.launchU || 0.5) * (E.red - E.idle); v.launched = true;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 120; i++) {
    v.step(dt, { thr: 1, clutch: false });
    if (!E.isEV && v.rpm >= E.red * 0.95 && v.shiftT <= 0 && v.gear < E.ratios.length) v.shiftUp();
    if (v.x >= D) return v.t;
  }
  return 120;
}

// ---------- Lamai: Hügel + Meer im Hintergrund-Streifen (320x30, pro Spalte) ----------
function drawSamuiScene(p, T, x) {
  const set = (y, c) => p.set(x, y, Chex(c));
  const m = Math.round(9 + 5 * Math.sin(x * 0.021 + 1) + 3 * Math.sin(x * 0.067) + 2 * Math.sin(x * 0.17));
  for (let y = m; y < 22; y++) set(y, (hash2(x >> 1, y >> 1) > 0.7) ? '#24603a' : (y < m + 2 ? '#4a9a56' : '#2f7a4a'));
  if (hash2(x, 4) > 0.93 && m < 18) { set(m - 1, '#3a8a4a'); set(m - 2, '#58aa5e'); }             // Baumkronen
  for (let y = 22; y < 29; y++) set(y, (y + Math.floor(x / 3)) % 5 === 0 ? '#73eff7' : y < 24 ? '#2aa8c0' : '#1f8fb0');   // Meer
  set(29, '#f0dca8');                                                                          // Strand
  const b = x % 97;                                                                            // Longtail-Boote
  if (b >= 10 && b < 19) { set(25, '#6a3a1e'); set(26, b > 11 && b < 18 ? '#8a5a2e' : '#6a3a1e'); if (b > 12 && b < 16) set(24, '#f4f4f4'); if (b === 18) set(24, '#6a3a1e'); }
}

// ---------- Shophouses (ersetzen die Tribüne), 192x34, 2 Bilder für Lichter ----------
function samuiTownTile(fr) {
  const W = 192, H = 34, p = new PB(W, H);
  const cols = ['#f4c87a', '#8fd0c8', '#f49ab0', '#c8e070', '#f4f0e0', '#a0c0f0', '#f0a070', '#d8b0f0'];
  let x = 0, i = 0;
  while (x < W) {
    const w = 20 + Math.floor(hash2(i, 1) * 14), h = 18 + Math.floor(hash2(i, 2) * 14), top = H - h;
    if (hash2(i, 9) > 0.78 && x > 4 && x < W - 12) {                                       // Lücke mit Palme
      const tx = x + 5;
      for (let y = top + 2; y < H; y++) p.set(tx + Math.round(Math.sin((H - y) * 0.12) * 1.5), y, Chex(y % 3 ? '#8a6a3a' : '#6a4a2a'));
      const cx = tx + Math.round(Math.sin((H - top - 2) * 0.12) * 1.5), cy = top + 2;
      for (let a = 0; a < 7; a++) { const ang = -Math.PI + a * Math.PI / 6; for (let r = 1; r < 8; r++) p.set(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r * 0.5 + r * r * 0.05), Chex(r > 5 ? '#4a9a46' : '#2f7a3a')); }
      x += 12; i++; continue;
    }
    const c = hex2rgb(cols[Math.floor(hash2(i, 3) * cols.length)]);
    const ww = Math.min(w, W - x);
    p.rect(x, top, ww, h, Crgb(c));
    p.rect(x, top, ww, 2, Crgb(shadeRGB(c, -0.35)));                                         // Dachkante
    p.rect(x, top, 1, h, Crgb(shadeRGB(c, 0.15))); p.rect(x + ww - 1, top, 1, h, Crgb(shadeRGB(c, -0.25)));
    const floors = Math.floor((h - 12) / 7);
    for (let f = 0; f < floors; f++) {                                                      // Fenster + Balkone
      const wy = top + 4 + f * 7;
      for (let k = 0; k < Math.floor((ww - 4) / 6); k++) {
        const wx = x + 3 + k * 6, lit = fr && hash2(i * 10 + k, f + 30) > 0.6;
        p.rect(wx, wy, 4, 4, Chex(lit ? '#ffe8a0' : '#29366f')); p.rect(wx, wy, 4, 1, Chex('#1a1c2c'));
        if (hash2(i * 10 + k, f) > 0.5) p.rect(wx - 1, wy + 4, 6, 1, Chex('#f4f4f4'));
      }
    }
    // Erdgeschoss: offener Laden, Markise, Schild
    const sy = H - 12;
    const sc = ['#b13e53', '#3b5dc9', '#38b764', '#ffcd75', '#ef7d57'][Math.floor(hash2(i, 5) * 5)];
    p.rect(x + 1, sy - 4, ww - 2, 4, Chex(sc));
    for (let k = x + 3; k < x + ww - 3; k += 2) if (hash2(k, i) > 0.35) p.set(k, sy - 2 - (k % 3 ? 0 : 1), Chex(fr && hash2(i, 6) > 0.5 ? '#ffffff' : '#f4f4e0'));   // „Schrift“
    for (let k = 0; k < ww - 2; k++) p.rect(x + 1 + k, sy, 1, 2, Chex(Math.floor(k / 3) % 2 ? '#f4f4f4' : (hash2(i, 7) > 0.5 ? '#b13e53' : '#38b764')));   // Markise
    p.rect(x + 2, sy + 2, ww - 4, 10, Chex('#1a1c2c'));
    for (let k = 0; k < 3; k++) { const ox = x + 4 + Math.floor(hash2(i, 20 + k) * (ww - 8)); p.rect(ox, H - 5, 2, 3, Chex(['#ef7d57', '#ffcd75', '#73eff7'][k])); }   // Waren
    x += ww; i++;
  }
  // Strommasten + durchhängende Kabel
  for (let px = 14; px < W; px += 64) {
    p.rect(px, 0, 1, H, Chex('#3a3e48')); p.rect(px - 3, 2, 7, 1, Chex('#3a3e48'));
    for (let k = 0; k < 64 && px + k < W; k++) { const sag = Math.round(Math.sin(k / 64 * Math.PI) * 3); p.set(px + k, 2 + sag, Chex('#22263a')); p.set(px + k, 4 + sag, Chex('#22263a')); }
  }
  return p.canvas();
}

// ---------- vor den Autos: Meeresglitzern, Roller, Palmen am Strassenrand ----------
function drawSamuiFront(ctx, W, camX) {
  const t = sceneT();
  // Glitzern auf dem Meer (gleiche Parallaxe wie der Hintergrund-Streifen)
  const sl = -((camX * PPM * 0.05) % RW_);
  for (let i = 0; i < 26; i++) {
    const x = ((hash2(i, 401) * RW_ + sl) % RW_ + RW_) % RW_, y = 32 + Math.floor(hash2(i, 402) * 7);
    if (Math.sin(t * 3 + i * 1.7) > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), y, 1, 1); }
  }
  // Möwen
  for (let i = 0; i < 4; i++) {
    const x = ((hash2(i, 410) * RW_ + t * (12 + i * 3)) % (RW_ + 40)) - 20, y = 10 + hash2(i, 411) * 14 + Math.sin(t * 2 + i) * 2, f = Math.sin(t * 9 + i) > 0 ? 1 : 0;
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - f, 2, 1); ctx.fillRect(Math.round(x) + 1, Math.round(y) - f, 2, 1); ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // Roller auf der Gegenfahrbahn hinter der Mauer
  for (let i = 0; i < 3; i++) {
    const x = ((hash2(i, 420) * 400 - t * (30 + i * 9) - camX * PPM * 0.35) % 400 + 400) % 400 - 40, y = 63;
    ctx.fillStyle = ['#b13e53', '#3b5dc9', '#ffcd75'][i]; ctx.fillRect(Math.round(x), y, 6, 2);
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(Math.round(x), y + 2, 2, 1); ctx.fillRect(Math.round(x) + 4, y + 2, 2, 1);
    ctx.fillStyle = '#f0c0a0'; ctx.fillRect(Math.round(x) + 2, y - 3, 1, 1); ctx.fillStyle = ['#38b764', '#f4f4f4', '#ef7d57'][i]; ctx.fillRect(Math.round(x) + 2, y - 2, 2, 2);
  }
  // Palmen am Strassenrand (wiegen sich im Wind)
  for (let k = Math.floor(camX / 6.5) - 2; k < camX / 6.5 + RW_ / PPM / 6.5 + 2; k++) {
    if (hash2(k, 430) < 0.4) continue;
    const bx = W(k * 6.5 + hash2(k, 431) * 2.5), h = 30 + Math.round(hash2(k, 432) * 12), lean = (hash2(k, 433) - 0.5) * 0.5, sway = Math.sin(t * 1.3 + k) * 1.2;
    for (let y = 0; y < h; y++) { const xx = bx + Math.round(lean * y + Math.sin(y * 0.08) * 2 + sway * y / h); ctx.fillStyle = y % 3 ? '#8a6a3a' : '#6a4a2a'; ctx.fillRect(xx, 74 - y, 2, 1); }
    const cx = bx + Math.round(lean * h + Math.sin(h * 0.08) * 2 + sway), cy = 74 - h;
    for (let a = 0; a < 8; a++) {
      const ang = -Math.PI * 1.05 + a * Math.PI * 1.1 / 7 + Math.sin(t * 1.6 + k + a) * 0.06;
      for (let r = 1; r < 12; r++) { ctx.fillStyle = r > 8 ? '#5aaa50' : r > 4 ? '#3a8a40' : '#2a6a32'; ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.55 + r * r * 0.045), 1, 1); }
    }
    ctx.fillStyle = '#6a4a20'; ctx.fillRect(cx - 1, cy + 1, 2, 2); ctx.fillRect(cx + 1, cy + 2, 1, 1);    // Kokosnüsse
  }
}
