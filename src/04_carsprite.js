/* =============================================================================
   Teil 4: Pixel-Auto-Renderer (Seitenansicht, Front zeigt nach rechts)
   Jedes Pixel wird einzeln berechnet: Karosserie mit Schattierung, Glanzlicht,
   Lackart, Streifen, Fenster mit Spiegelung, Türfugen, Lichter, Felgen, Fahrwerk.
   ============================================================================= */
const M_BODY = 1, M_GLASS = 2, M_WHEEL = 3, M_LIGHT = 4, M_AERO = 5, M_TRIM = 6, M_WELL = 7;
const SHADE = [-0.66, -0.46, -0.24, 0, 0.2, 0.5];      // Schattierungsstufen L0..L5
const RIM_FRAC = [0.54, 0.58, 0.62, 0.66, 0.69, 0.72, 0.75]; // Felgenanteil je Reifengrösse
const GLASS_TINT = [['#8fb4cc', '#4c6f8a'], ['#6a8aa4', '#2c4258'], ['#4a6680', '#1e2e40'], ['#33465a', '#141c28'], ['#1f2a38', '#0b0f16']];

/** Profilpunkte in ein Höhen-Array pro Pixelspalte umwandeln (linear + leicht geglättet) */
function profileArr(points, L, sharp) {
  const a = new Float32Array(L);
  for (let x = 0; x < L; x++) {
    const px = x + 0.5;
    let i = 0;
    while (i < points.length - 2 && points[i + 1][0] < px) i++;
    const p0 = points[i], p1 = points[i + 1];
    const t = p1[0] === p0[0] ? 1 : clamp((px - p0[0]) / (p1[0] - p0[0]), 0, 1);
    a[x] = lerp(p0[1], p1[1], t);
  }
  if (sharp) return a;
  const b = a.slice();
  for (let x = 1; x < L - 1; x++) a[x] = (b[x - 1] + 2 * b[x] + b[x + 1]) / 4;
  return a;
}

const CAR_SC = 3;                                         // HD: Autos in dreifacher Auflösung (feine Details)
const _bodyCache = {};
/** Karosserie-Definition mit Faktor Q skaliert (für HD-Sprites) */
function scaledBody(id, Q) {
  const key = id + '@' + Q; if (_bodyCache[key]) return _bodyCache[key];
  const B = BODIES[id] || BODIES.hatch3, r4 = a => a && [a[0] * Q, a[1] * Q, a[2] * Q, a[3] * Q];
  return (_bodyCache[key] = Object.assign({}, B, {
    L: B.L * Q, wr: Math.round(B.wr * Q), wf: Math.round(B.wf * Q), top: B.top.map(([x, y]) => [x * Q, y * Q]), bot: B.bot.map(([x, y]) => [x * Q, y * Q]), belt: B.belt * Q,
    glass: [B.glass[0] * Q, B.glass[1] * Q + Q - 1], pillars: B.pillars.map(v => v * Q), doors: B.doors.map(v => v * Q),
    head: r4(B.head), tail: r4(B.tail), grille: r4(B.grille), intake: r4(B.intake), wing: B.wing * Q, mirror: B.mirror * Q
  }));
}
/** 5x7-HD-Glyphen in Pixelpuffer schreiben (k = Zeile von oben nach unten absteigend) */
function putTextHD(put, txt, x0, kTop, c) {
  for (let i = 0; i < txt.length; i++) { const g = glyphHD(txt[i]); for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (g[r] & (16 >> b)) put(x0 + i * 6 + b, kTop - r, c); }
}
const _spriteCache = new Map();
/**
 * Zeichnet ein Auto als Pixel-Sprite.
 * opt: { angle: Radrotation, lights: Scheinwerfer an, brake: Bremslicht, exh: Auspuffart, brand: Text für Sponsor }
 * Rückgabe: { pb, cv, W, H, ox, gy, L, wheels:[{x,y,r}], exhaust:{x,y}, mask }
 */
/** Rennen: Auto als zwei Ebenen – Karosserie (kann federn) und Räder mit Radhäusern und Schatten (pro Radstellung) */
const _layerCache = new Map();
function carLayers(d, opt = {}) {
  const key = JSON.stringify([d.body, d.color, d.color2, d.stripe, d.paint, d.rim, d.rimColor, d.tire, d.spoiler, d.lip, d.skirts, d.diffuser,
    d.ride, d.tint, d.number, d.numStyle, d.sticker, d.kit, d.glow, d.banner, d.interior && d.interior.seatColor, d.wear || 0, opt.lights, opt.brake, opt.exh, opt.brand, opt.sc || CAR_SC, d.decal || '']);
  let L = _layerCache.get(key);
  if (L) return L;
  const s = drawCarSprite(d, Object.assign({}, opt, { angle: 0, layers: true }));
  L = Object.assign({}, s, { wheelCv: [] });
  if (_layerCache.size > 40) _layerCache.delete(_layerCache.keys().next().value);
  _layerCache.set(key, L);
  return L;
}
/** Räder-Ebene für Radstellung k (0..15) */
function carWheelLayer(L, k) {
  if (L.wheelCv[k]) return L.wheelCv[k];
  const sp = L.spec, pb = new PB(sp.W, sp.H); pb.d.set(sp.wellD);
  const zero = sp.zero || (sp.zero = new Uint8Array(sp.W * sp.H));
  for (const w of sp.wheels) drawWheel(pb, w.cx, w.cy, sp.R, sp.rimR, sp.rimRGB, sp.rim, k / 16 * Math.PI * 2, zero, sp.W, sp.Q);
  return (L.wheelCv[k] = pb.canvas());
}
function renderCar(d, opt = {}) {
  const key = JSON.stringify([d.body, d.color, d.color2, d.stripe, d.paint, d.rim, d.rimColor, d.tire, d.spoiler, d.lip, d.skirts, d.diffuser,
    d.ride, d.tint, d.number, d.numStyle, d.sticker, d.kit, d.glow, d.banner, d.interior && d.interior.seatColor, d.wear || 0, opt.angle ? Math.round(opt.angle * 8 / Math.PI) : 0, opt.lights, opt.brake, opt.exh, opt.brand, opt.sc || CAR_SC, d.decal || '']);
  if (_spriteCache.has(key)) return _spriteCache.get(key);
  const out = drawCarSprite(d, opt);
  if (_spriteCache.size > 260) _spriteCache.delete(_spriteCache.keys().next().value);
  _spriteCache.set(key, out);
  return out;
}

function drawCarSprite(d, opt) {
  const Q = opt.sc || CAR_SC;                          // Auflösungsfaktor (2 = HD)
  const B = scaledBody(d.body, Q);
  const L = B.L, ti = clamp(d.tire | 0, 0, 6);
  const R = (B.art ? B.art.R + 0.3 + (ti >= 4 ? 0.2 : 0) + (ti >= 6 ? 0.2 : 0) : CLASSES[B.cls].r + (ti >= 4 ? 0.3 : 0) + (ti >= 6 ? 0.3 : 0)) * Q;
  const rimR = R * (B.art ? Math.min(0.84, RIM_FRAC[ti] + 0.1) : RIM_FRAC[ti]);
  const minBot = Math.min(...B.bot.map(p => p[1]));
  const by = B.art ? Math.round(Math.max(clamp(d.ride | 0, -5, 2) * 0.5, 0.5 - B.art.minY) * Q) : Math.max(clamp(d.ride | 0, -5, 2) * Q, 0.6 * Q - minBot);                 // Fahrhöhe verschiebt die Karosserie
  const ra = R + (B.sharp ? 0.5 : 1.0) * Q;                // Radlauf-Radius (neue Karosserien: eng wie tiefergelegt)
  const top = profileArr(B.top, L, B.sharp), bot = profileArr(B.bot, L, B.sharp);
  for (let x = 0; x < L; x++) { top[x] += by; bot[x] += by; }
  const beltY = B.belt + by;
  // Haifischflosse: verlängert die Silhouette über dem Motordeckel
  if (B.fin) {
    const fx1 = B.glass[0] - 2 * Q, fx0 = 6 * Q;
    for (let x = fx0; x <= fx1; x++) top[x] = Math.max(top[x], lerp(top[fx0] + 3 * Q, top[fx1], (x - fx0) / (fx1 - fx0)));
  }
  const ox = 10 * Q;
  let maxTop = 0; for (let x = 0; x < L; x++) maxTop = Math.max(maxTop, top[x]);
  if (B.art) maxTop = Math.max(maxTop, B.art.maxY * Q + by);
  const H = Math.ceil(maxTop) + 18 * Q, W = L + ox + 8 * Q, gy = H - 3 * Q;
  const pb = new PB(W, H), mask = new Uint8Array(W * H);
  // gezeichnete Kontur: Ober-/Unterkante pro Spalte aus der Rasterung übernehmen
  const ART = B.art ? artRaster(B.art, Q, by, W, H, ox, gy) : null;
  if (ART) for (let x = 0; x < L; x++) {
    let lo = 1e9, hi = -1e9;
    for (let sy = 0; sy < H; sy++) if (ART.body[sy * W + ox + x]) { const k = gy - 1 - sy; if (k < lo) lo = k; if (k > hi) hi = k; }
    if (hi > -1e9) { top[x] = hi + 1; bot[x] = lo; } else { top[x] = bot[x] = 0; }
  }
  const row = k => gy - 1 - k;                         // lokale Zeile -> Bildschirmzeile
  const put = (x, k, c, m) => { const sx = ox + x, sy = row(k); if (sx < 0 || sy < 0 || sx >= W || sy >= H) return; pb.d[sy * W + sx] = c; if (m) mask[sy * W + sx] = m; };
  const mAt = (x, k) => { const sx = ox + x, sy = row(k); if (sx < 0 || sy < 0 || sx >= W || sy >= H) return 0; return mask[sy * W + sx]; };
  const c1 = hex2rgb(d.color), c2 = hex2rgb(d.color2);
  const wheels = [{ x: B.wr, y: R }, { x: B.wf, y: R }];
  const archY = R + by;
  const inWell = (x, k) => wheels.some(w => { const dx = x + 0.5 - w.x, dy = k + 0.5 - archY; return dx * dx + dy * dy < ra * ra; });
  const paint = d.paint;
  const I = d.interior || defaultInterior();

  // Lackfarbe mit Schattierung (je nach Lackart)
  function paintCol(rgb, lvl, x, k, f) {
    if (paint === 'chrome') {
      const tint = mixRGB([230, 236, 245], rgb, 0.28);
      let c;
      if (f > 0.78) c = shadeRGB(tint, 0.35); else if (f > 0.58) c = shadeRGB(tint, 0.05);
      else if (f > 0.5) c = [58, 63, 80]; else if (f > 0.3) c = shadeRGB(tint, -0.35); else c = mixRGB(tint, [200, 184, 160], 0.4);
      if (lvl <= 1) c = shadeRGB(c, -0.35); if (lvl >= 5) c = [255, 255, 255];
      return c;
    }
    if (paint === 'gold') {                              // Champion-Gold: Goldflitter, leicht in Lackfarbe
      const base = mixRGB(rgb, [214, 168, 58], 0.78);
      let cc = shadeRGB(base, SHADE[lvl] * 1.1 + (lvl >= 4 ? 0.08 : 0));
      if (hash2(x * 3 + 1, k * 7) > 0.97) cc = shadeRGB(cc, 0.45);
      return cc;
    }
    if (paint === 'carbon') {                            // Carbon-Folie: Köperbindung, leicht in Lackfarbe getönt
      const w = ((Math.floor(x / Q) + Math.floor(k / Q)) & 3) < 2, base = mixRGB([34, 35, 42], rgb, 0.12);
      let cc = shadeRGB(base, (w ? 0.12 : -0.04) + SHADE[lvl] * 0.5);
      if (lvl >= 5) cc = shadeRGB(cc, 0.4);
      return cc;
    }
    let s = SHADE[lvl];
    if (B.art && lvl >= 1 && lvl <= 4 && f != null && f < 1) s = f > 0.74 ? 0.14 : f > 0.68 ? 0.02 : f > 0.4 ? -0.08 : f > 0.34 ? -0.2 : -0.28 - (0.34 - f) * 0.5;   // Pixel-Art-Bänder: helle Schulter, Flanke, dunkle Unterseite
    else if (B.sharp && lvl >= 1 && lvl <= 4 && f != null && f < 1) s = -0.5 + 0.6 * Math.pow(f, 0.8) + (f > 0.42 ? 0.05 : -0.05);
    if (paint === 'matte') s = Math.min(0.1, s * 0.55 - 0.04);
    if (paint === 'satin') s = s * 0.78 - 0.02;
    let c = shadeRGB(rgb, s);
    if (paint === 'candy') {                             // Candy: tiefe, satte Farbe mit hellen Spitzlichtern
      const g = (rgb[0] + rgb[1] + rgb[2]) / 3, sat = rgb.map(v => clamp(g + (v - g) * 1.55, 0, 255));
      c = shadeRGB(sat, s * 1.25 + (lvl >= 4 ? 0.06 : -0.08)); if (lvl >= 5) c = mixRGB(c, [255, 255, 255], 0.35);
    }
    if (paint === 'chameleon') {                         // Chamäleon: Farbton wandert über die Karosserie
      const ph = x / L * 2.2 + (f || 0) * 0.8, a1 = [rgb[1], rgb[2], rgb[0]], a2 = [rgb[2], rgb[0], rgb[1]];
      c = shadeRGB(mixRGB(mixRGB(rgb, a1, 0.5 + 0.5 * Math.sin(ph * Math.PI)), a2, clamp(ph - 1.2, 0, 1) * 0.6), s);
    }
    if (paint === 'pearl') {                             // Perleffekt: Farbton wandert mit dem Lichteinfall
      const alt = [rgb[2] * 0.7 + rgb[0] * 0.3, rgb[0] * 0.7 + rgb[1] * 0.3, rgb[1] * 0.7 + rgb[2] * 0.3];
      c = mixRGB(c, shadeRGB(alt, s), clamp(f * 0.8 + Math.sin(x * 0.05) * 0.2, 0, 0.85));
      if (hash2(x * 5 + 1, k * 3) > 0.975) c = shadeRGB(c, 0.6);
    }
    if (paint === 'metallic') { c = shadeRGB(c, (hash2(x >> 1, k >> 1) - 0.5) * 0.06 + Math.sin(x * 0.09 / (CAR_SC || 1)) * 0.035); if (hash2(x * 3 + 7, k * 5) > 0.994) c = shadeRGB(c, 0.28); }
    return c;
  }

  // ---------- 1) Karosserie, Glas und Radhäuser rastern ----------
  const g0 = B.glass[0], g1 = B.glass[1];
  for (let x = 0; x < L; x++) {
    for (let k = Math.floor(bot[x]); k <= Math.ceil(top[x]); k++) {
      const yc = k + 0.5;
      if (ART) { const sy0 = gy - 1 - k; if (sy0 < 0 || sy0 >= H || !ART.body[sy0 * W + ox + x]) continue; }
      else if (yc < bot[x] || yc > top[x]) continue;
      if (inWell(x, k)) { put(x, k, Chex('#0b0b10'), M_WELL); continue; }
      const isGlass = ART ? ART.glass[(gy - 1 - k) * W + ox + x] === 1 : (x >= g0 && x <= g1 && yc > beltY && yc < top[x] - 0.8 * Q);
      if (isGlass) {
        if (ART ? (B.art.pil || []).some(([p, w]) => x >= p * Q && x < (p + w) * Q) : B.pillars.some(p => x >= p && x < p + 2 * Q)) { put(x, k, Chex('#16161c'), M_TRIM); continue; }
        put(x, k, 0, M_GLASS);
        continue;
      }
      put(x, k, 0, M_BODY);
    }
  }
  // ---------- 2) Karosserie einfärben (Schattierung, Streifen, Aufkleber) ----------
  const doors = B.doors.slice().sort((a, b) => a - b);
  const flameX0 = B.wf - R - 20 * Q;
  for (let x = 0; x < L; x++) {
    const refTop = Math.min(beltY, top[x]);
    for (let k = Math.floor(bot[x]); k <= Math.ceil(top[x]); k++) {
      if (mAt(x, k) !== M_BODY) continue;
      const yc = k + 0.5;
      let lvl, f;
      if (yc > beltY) {                                  // Dach, Säulen, Flosse
        f = 1; lvl = yc > top[x] - 0.8 * Q ? 4 : 3;
      } else {
        f = clamp((yc - bot[x]) / Math.max(1, refTop - bot[x]), 0, 1);
        if (top[x] < beltY + 0.5 && yc > top[x] - 0.6 * Q) lvl = 5;          // Haube/Heckdeckel glänzt
        else if (top[x] < beltY + 0.5 && yc > top[x] - 1.4 * Q) lvl = 4;
        else if (k === Math.floor(beltY) - 2 * Q) lvl = 5;                      // Schulter-Glanzlinie
        else if (f >= 0.8) lvl = 4;
        else if (f >= 0.44) lvl = 3;
        else if (f >= 0.16) lvl = 2;
        else lvl = 1;
      }
      // Zweitfarbe / Streifen
      let base = c1;
      const sideZone = x > B.wr - 2 * Q && x < B.wf + 2 * Q;
      switch (d.stripe) {
        case 'side': if (yc <= beltY && f >= 0.45 && f <= 0.58) base = c2; break;
        case 'double': if (yc <= beltY && ((f >= 0.3 && f <= 0.39) || (f >= 0.5 && f <= 0.59))) base = c2; break;
        case 'twotone': if (yc <= beltY && f < 0.4) base = c2; break;
        case 'racing': if (yc > top[x] - 2.2 * Q) base = c2; break;
        case 'checker': if (sideZone && yc <= beltY && f >= 0.3 && f <= 0.62 && (((x >> Q) + (k >> Q)) & 1)) base = c2; break;
      }
      let col = paintCol(base, lvl, x, k, f);
      // Glanz-Reflexstreifen bei Glanz/Metallic
      if ((paint === 'gloss' || paint === 'metallic') && yc <= beltY && f > 0.5 && f < 0.78 && Math.abs(((x / L) - 0.36)) < 0.1) col = shadeRGB(col, 0.08);   // weicher Lichtfleck
      // Aufkleber
      if (d.sticker === 'flames' && yc <= beltY && x > flameX0 && k > bot[x] + 0.5) {
        const rel = (L - 2 - x) / (L - 2 - flameX0);
        const tongue = ((Math.floor(x / Q) * 7) % 11) / 11;
        const hgt = (1 - rel) * (0.5 + 0.28 * Math.sin(x * 0.75 / Q + 1)) + 0.12 + (tongue > 0.6 ? 0.08 : 0);
        const fc = f - 0.1;
        if (fc > 0 && fc < hgt) {
          const p = fc / hgt;
          col = p < 0.35 ? [255, 224, 112] : p < 0.7 ? [239, 125, 87] : [177, 62, 83];
          if (lvl >= 4) col = shadeRGB(col, 0.2);
        }
      }
      if (d.sticker === 'bolt' && yc <= beltY && x > B.wr + R && x < B.wf - R) {
        const tri = Math.abs(((x - B.wr) / (6 * Q)) % 2 - 1);
        const fcen = 0.42 + 0.2 * tri;
        if (Math.abs(f - fcen) < 0.07) col = paintCol(c2, 4, x, k, f);
        else if (Math.abs(f - fcen) < 0.11) col = paintCol(c2, 1, x, k, f);
      }
      // Speedlines: drei schräge Streifen, die nach hinten auslaufen
      if (d.sticker === 'speed' && yc <= beltY && f > 0.25 && f < 0.75 && x > B.wr && x < B.wf + R) {
        const u = (x - B.wr) / (B.wf + R - B.wr), band = (f - 0.25) * 10;
        if (Math.abs(band - Math.round(band)) < 0.22 && Math.round(band) % 2 === 1 && u > 0.15 + Math.round(band) * 0.08) col = paintCol(c2, lvl, x, k, f);
      }
      // Farbsplash: diagonale Fläche in Zweitfarbe mit gezackter Kante
      if (d.sticker === 'splash' && yc <= beltY) {
        const edge = (x - L * 0.42) / Q + f * 22 + Math.sin(x * 0.9 / Q) * 2 + Math.sin(f * 20) * 1.5;
        if (edge < 0) col = paintCol(c2, lvl, x, k, f); else if (edge < 1.5) col = shadeRGB(paintCol(c2, lvl, x, k, f), -0.35);
      }
      // Folien: Farbverlauf, Diagonalstreifen, Renn-Livery, Camouflage, Sakura
      if (d.sticker === 'fade' && yc <= beltY) {
        const bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((k & 3) << 2) | (x & 3)] / 16;
        if (x / L < 0.28 + bay * 0.36) col = paintCol(c2, lvl, x, k, f);
      }
      if (d.sticker === 'diagonal' && yc <= beltY && x > B.wr && x < B.wf) {
        const band = ((((x + (k - bot[x]) * 1.1) / Q) % 24) + 24) % 24;
        if (band < 4) col = paintCol(c2, lvl, x, k, f); else if (band >= 5 && band < 6.2) col = paintCol([244, 244, 244], lvl, x, k, f);
      }
      if (d.sticker === 'racing' && yc <= beltY) {
        if (f < 0.32 + x / L * 0.08) col = paintCol(c2, Math.min(lvl, 3), x, k, f);
        else if (Math.abs(f - 0.47) < 0.035) col = paintCol(c2, 4, x, k, f);
        const sx0 = B.wf - R - 15 * Q;
        if (x > sx0 && x < sx0 + 9 * Q && f > 0.55 && f < 0.72) col = (x - sx0 < Q || x - sx0 > 8 * Q || ((k - Math.floor(bot[x])) % (2 * Q) < 1)) ? [26, 28, 44] : [244, 244, 244];
      }
      if (d.sticker === 'camo') {
        const bx = Math.floor(x / (2 * Q)), bk = Math.floor(k / (2 * Q)), n = hash2(bx, bk) * 0.35 + hash2(bx >> 2, bk >> 2) * 0.65;
        if (n > 0.64) col = paintCol(c2, lvl, x, k, f); else if (n > 0.44) col = shadeRGB(paintCol(mixRGB(c1, c2, 0.5), lvl, x, k, f), -0.15);
      }
      if (d.sticker === 'sakura' && yc <= beltY && f > 0.12) {
        const cs = 7 * Q, cx = Math.floor(x / cs), ck = Math.floor(k / cs);
        if (hash2(cx * 3 + 1, ck + 7) > 0.42) {
          const px = (cx + 0.25 + 0.5 * hash2(cx, ck + 11)) * cs, pk = (ck + 0.25 + 0.5 * hash2(cx + 5, ck)) * cs;
          const dx = x + 0.5 - px, dk = k + 0.5 - pk, dd = Math.sqrt(dx * dx + dk * dk), an = Math.atan2(dk, dx) + hash2(cx, ck) * 3;
          const rr = 1.9 * Q * (0.72 + 0.28 * Math.abs(Math.cos(an * 2.5)));
          if (dd < 0.5 * Q) col = [214, 70, 120]; else if (dd < rr) col = shadeRGB([255, 183, 208], lvl >= 4 ? 0.1 : dd > rr - 0.8 ? -0.12 : 0);
        }
      }
      put(x, k, Crgb(col), M_BODY);
    }
  }
  // ---------- 2b) Volumen (gezeichnete Autos): Kotflügel wölben sich, Enden runden sich ab, Kanten glänzen ----------
  if (ART) {
    const vol = new Float32Array(W * H), solid = v => v === M_BODY || v === M_GLASS || v === M_TRIM;
    for (let sy = 0; sy < H; sy++) {                                   // Rundung nach vorne/hinten: Zeilenränder dunkler
      let a = -1, b = -1;
      for (let sx = 0; sx < W; sx++) if (solid(mask[sy * W + sx])) { if (a < 0) a = sx; b = sx; }
      if (a < 0) continue;
      for (let sx = a; sx <= b; sx++) { const e = Math.min(sx - a, b - sx) / (3.5 * Q); if (e < 1) vol[sy * W + sx] -= 0.22 * (1 - e) * (1 - e); }
    }
    for (const w of wheels) {                                          // Kotflügel-Wölbung über jedem Rad
      const span = 6 * Q;
      for (let sy = Math.max(0, Math.floor(row(archY + ra + span))); sy < Math.min(H, row(archY - R * 0.2) + 1); sy++) for (let sx = Math.max(0, Math.floor(ox + w.x - ra - span)); sx < Math.min(W, ox + w.x + ra + span); sx++) {
        const x = sx - ox, k = gy - 1 - sy, dx = x + 0.5 - w.x, dk = k + 0.5 - archY, dd = Math.sqrt(dx * dx + dk * dk);
        if (dk < -R * 0.2 || dd < ra || dd > ra + span) continue;
        const t = (dd - ra) / span;
        vol[sy * W + sx] += t < 0.16 ? -0.1 : 0.17 * Math.pow(1 - t, 1.5) * clamp(0.4 + dk / (ra + span), 0, 1.2);
      }
    }
    for (let x = 0; x < L; x++) {                                      // Glanzkante unter der Oberkante (Dach, Haube, Heck)
      let k = Math.ceil(top[x]) + 1; while (k > bot[x] && !solid(mAt(x, k))) k--;
      if (mAt(x, k) !== M_BODY) continue;
      const sy = row(k);
      if (sy + 3 < H) { vol[(sy + 2) * W + ox + x] += 0.32; vol[(sy + 3) * W + ox + x] += 0.12; }
    }
    for (let i = 0; i < W * H; i++) if (vol[i] && mask[i] === M_BODY) { const u = unC(pb.d[i]); pb.d[i] = Crgb(shadeRGB([u[0], u[1], u[2]], clamp(vol[i], -0.5, 0.5))); }
  }
  // ---------- 3) Glas mit Tönung, Spiegelung und Innenraum-Silhouette ----------
  const tint = GLASS_TINT[clamp(d.tint | 0, 0, 4)];
  const gt = hex2rgb(tint[0]), gb = hex2rgb(tint[1]);
  const seatRGB = hex2rgb(I.seatColor || '#2a2a30');
  const seatX = Math.round(g1 - (g1 - g0) * 0.45);
  for (let x = g0; x <= g1; x++) {
    for (let k = Math.floor(beltY); k <= Math.ceil(top[x]); k++) {
      if (mAt(x, k) !== M_GLASS) continue;
      const f = clamp((k + 0.5 - beltY) / Math.max(1, top[x] - beltY), 0, 1);
      let c = mixRGB(gb, gt, f);
      if (ART) {                                                         // dunkel getönt wie echte Scheiben in der Seitenansicht
        const tt = clamp(d.tint | 0, 0, 4), lo = [[56, 66, 80], [42, 50, 62], [32, 38, 48], [22, 26, 34], [14, 16, 22]][tt];
        c = mixRGB(shadeRGB(lo, -0.3), shadeRGB(lo, 0.3), Math.pow(f, 1.3));
        const dd = (x - g0) - (k - beltY) * 0.9, w1 = g1 - g0;
        if (dd > w1 * 0.55 && dd < w1 * 0.55 + 3 * Q) c = shadeRGB(c, 0.2);                      // eine breite, weiche Spiegelung
        if (k + 0.5 > top[x] - 1.2 * Q) c = shadeRGB(c, -0.3);
        put(x, k, Crgb(c), M_GLASS); continue;
      }
      { const dd = (x - g0) - (k - beltY) * 1.2, w1 = (g1 - g0); if (d.tint < 4 && ((dd > w1 * 0.18 && dd < w1 * 0.18 + 2.5 * Q) || (dd > w1 * 0.62 && dd < w1 * 0.62 + 1.2 * Q))) c = shadeRGB(c, 0.38); }   // Spiegelung
      if (k + 0.5 > top[x] - 1.5 * Q) c = shadeRGB(c, -0.25);                                    // dunkle Dachkante
      if (d.tint <= 2 && x >= seatX - Q && x <= seatX + 2 * Q && k + 0.5 < beltY + 6 * Q && !B.open) c = mixRGB(c, seatRGB, 0.45 - d.tint * 0.1); // Kopfstütze
      put(x, k, Crgb(c), M_GLASS);
    }
    // Fensterleiste (Zierleiste unter dem Glas)
    const kb = Math.floor(beltY);
    if (!ART && mAt(x, kb) === M_BODY) put(x, kb, Chex(I.tier === 'luxus' ? '#d0d4dc' : '#22232b'), M_TRIM);
  }
  // Offenes Cockpit (Roadster): Sitze sichtbar
  if (B.open) {
    for (let x = doors[0] - 6 * Q; x < doors[0] + Q; x++) for (let k = Math.floor(beltY) - Q; k < Math.floor(beltY) + 3 * Q; k++) {
      if (k + 0.5 > top[x] && k + 0.5 < top[x] + 3 * Q) put(x, k, Crgb(shadeRGB(seatRGB, (k % 2) ? -0.2 : 0.05)), M_TRIM);
    }
  }
  // ---------- 4) Konturen ----------
  const outC = Crgb(shadeRGB(c1, -0.8));
  const lipC = Crgb(shadeRGB(c1, -0.5));
  const snap = mask.slice();
  for (let sy = 0; sy < H; sy++) for (let sx = 0; sx < W; sx++) {
    const m = snap[sy * W + sx];
    if (m !== M_BODY && m !== M_GLASS && m !== M_TRIM) continue;
    const nb = (dx, dy) => { const X = sx + dx, Y = sy + dy; return X < 0 || Y < 0 || X >= W || Y >= H ? 0 : snap[Y * W + X]; };
    const n4 = [nb(1, 0), nb(-1, 0), nb(0, 1), nb(0, -1)];
    const far = Q > 1 && (nb(2, 0) === 0 || nb(-2, 0) === 0 || nb(0, 2) === 0 || nb(0, -2) === 0) && m === M_BODY;
    if (n4.some(v => v === 0)) pb.d[sy * W + sx] = m === M_GLASS ? Crgb(shadeRGB(c1, -0.7)) : outC;
    else if (far) pb.d[sy * W + sx] = Crgb(shadeRGB(c1, -0.5));
    else if (n4.some(v => v === M_WELL)) pb.d[sy * W + sx] = lipC;                            // Radlauf-Kante
  }
  // ---------- 4b) Fensterrahmen, Charakterlinie, Stossstangen-Fugen, Schweller ----------
  { const sealC = Crgb([18, 18, 24]), snap2 = mask.slice();
    for (let sy = 1; sy < H - 1; sy++) for (let sx = 1; sx < W - 1; sx++) {
      if (snap2[sy * W + sx] !== M_BODY) continue;
      if (snap2[sy * W + sx + 1] === M_GLASS || snap2[sy * W + sx - 1] === M_GLASS || snap2[(sy + 1) * W + sx] === M_GLASS || snap2[(sy - 1) * W + sx] === M_GLASS) pb.d[sy * W + sx] = sealC;
    }
    const creaseC = Crgb(shadeRGB(c1, -0.32)), creaseHi = Crgb(paintCol(c1, 4, 0, 0, 0.6));
    if (!ART) for (let x = 3 * Q; x < L - 3 * Q; x++) {                                    // Charakterlinie (Sicke)
      const kc = Math.floor(bot[x] + (Math.min(beltY, top[x]) - bot[x]) * 0.42);
      if (mAt(x, kc) === M_BODY && mAt(x, kc + 1) === M_BODY) { put(x, kc, creaseC); if (mAt(x, kc - 1) === M_BODY) put(x, kc - 1, creaseHi); }
    }
    if (!ART) for (const bx of [Math.round(5.5 * Q), L - Math.round(7 * Q)]) {                        // Stossstangen-Fugen
      const k1 = Math.floor(bot[bx] + (Math.min(beltY, top[bx]) - bot[bx]) * 0.62);
      for (let k = Math.ceil(bot[bx]) + Q; k < k1; k++) if (mAt(bx, k) === M_BODY) put(bx, k, fugeC0());
    }
    if (B.sharp && !ART) for (let x = 0; x < L; x++) {                                             // Unterteile der Stossstangen in Schwarz
      if (!(x < B.wr - R - Q || x > B.wf + R + Q)) continue;
      for (let k = Math.ceil(bot[x]); k < Math.ceil(bot[x]) + Math.round(1.6 * Q); k++) if (mAt(x, k) === M_BODY) put(x, k, Chex(k === Math.ceil(bot[x]) + Math.round(1.6 * Q) - 1 ? '#3a3c48' : '#16171e'));
    }
    for (let x = B.wr + Math.round(R * 1.2); x < B.wf - Math.round(R * 1.2); x++) {        // Schweller dunkler
      for (let k = Math.ceil(bot[x]); k < Math.ceil(bot[x]) + Q; k++) if (mAt(x, k) === M_BODY) put(x, k, Crgb(shadeRGB(c1, -0.55)));
    }
    // Tankdeckel hinten über dem Radhaus
    const fx = B.wr + Math.round(R * 1.4), fk = Math.floor(beltY) - 3 * Q;
    if (!ART && mAt(fx, fk) === M_BODY && mAt(fx + 2 * Q, fk + 2 * Q) === M_BODY) for (let a = 0; a <= 2 * Q; a++) { put(fx + a, fk, creaseC); put(fx + a, fk + 2 * Q, creaseC); put(fx, fk + a, creaseC); put(fx + 2 * Q, fk + a, creaseC); }
    // Seitenmarkierungsleuchten (vorne orange, hinten rot)
    const mk2 = Math.floor(bot[L - 5 * Q] + 2.5 * Q);
    if (!ART) for (let a = 0; a < Q * 2; a++) { if (mAt(L - 5 * Q + a, mk2) === M_BODY) put(L - 5 * Q + a, mk2, Chex('#f0a030')); if (mAt(3 * Q + a, mk2) === M_BODY) put(3 * Q + a, mk2, Chex('#c01830')); }
  }
  function fugeC0() { return Crgb(shadeRGB(c1, -0.55)); }
  if (ART) {
    const hiC = Crgb(paintCol(c1, 5, 0, 0, 1)), hi2 = Crgb(paintCol(c1, 4, 0, 0, 0.9)), shC = Crgb(shadeRGB(c1, -0.42));
    // Schulter-Glanzlinie: folgt der Unterkante der Fenster, läuft vorne/hinten auf Haube und Heck aus
    let lastGk = null;
    for (let x = 0; x < L; x++) {
      let gk = null;
      for (let k = Math.floor(bot[x]); k <= Math.ceil(top[x]); k++) if (mAt(x, k) === M_GLASS || mAt(x, k) === M_TRIM) { gk = k; break; }
      if (gk == null && lastGk != null && x < B.wf) gk = lastGk;
      if (gk == null) continue;
      lastGk = gk;
      const k1 = gk - Math.round(1.5 * Q);
      for (const [kk, c] of [[k1, hiC], [k1 + 1, hi2], [k1 - 1, shC]]) if (mAt(x, kk) === M_BODY) put(x, kk, c);
    }
    // Kotflügel: Lippe rund um die Radläufe (heller Rand oben, Schatten innen) = ausgestellte Radhäuser
    for (const w of wheels) for (let a = Math.PI * 0.03; a < Math.PI * 0.97; a += 0.012 / Q) {
      for (let t2 = 0; t2 < 2.2 * Q; t2 += 0.5) {
        const rr2 = ra + t2, x = Math.round(w.x + Math.cos(a) * rr2), k = Math.round(archY + Math.sin(a) * rr2);
        if (mAt(x, k) !== M_BODY) continue;
        const f2 = t2 / (2.2 * Q);
        put(x, k, Crgb(f2 < 0.3 ? shadeRGB(c1, -0.5) : f2 < 0.65 ? paintCol(c1, 4, x, k, 0.9) : paintCol(c1, 3, x, k, 0.7)));
      }
    }
    // tiefe Seitenschweller: dunkles Band mit heller Oberkante zwischen den Rädern
    for (let x = B.wr + Math.round(ra); x < B.wf - Math.round(ra); x++) {
      const b0 = Math.ceil(bot[x]);
      for (let k = b0; k < b0 + Math.round(2 * Q); k++) if (mAt(x, k) === M_BODY) put(x, k, Crgb(shadeRGB(c1, k === b0 ? -0.7 : -0.55)));
      if (mAt(x, b0 + Math.round(2 * Q)) === M_BODY) put(x, b0 + Math.round(2 * Q), Crgb(paintCol(c1, 4, x, b0, 0.8)));
    }
  }
  // ---------- 4c) Gezeichnete Details pro Auto: Kunststoff, Chrom, Fugen, Lichter, Griffe, Spiegel ----------
  if (ART) {
    const A = B.art, AM = (polys, s) => artPolyMask(polys, Q, by, W, H, ox, gy, s);
    const inM = (m, x, k) => { const sx = ox + x, sy = gy - 1 - k; return sx >= 0 && sy >= 0 && sx < W && sy < H && m[sy * W + sx] === 1; };
    const each = (m, ok, fn) => { for (let i = 0; i < W * H; i++) if (m[i] && ok(mask[i])) fn(i % W - ox, gy - 1 - ((i / W) | 0)); };
    const onBody = v => v === M_BODY || v === M_TRIM;
    const edgeOf = (m, x, k) => !inM(m, x - 1, k) || !inM(m, x + 1, k) || !inM(m, x, k - 1) || !inM(m, x, k + 1);
    if (A.dark) { const m = AM(A.dark); each(m, onBody, (x, k) => put(x, k, Chex(!inM(m, x, k + 1) ? '#3a3c46' : !inM(m, x, k - 1) ? '#0b0b0f' : ((x * 7 + k * 3) % 11 === 0 ? '#1e1f25' : '#16171c')), M_TRIM)); }
    if (A.chrome) { const m = AM(A.chrome); each(m, v => v !== M_WELL, (x, k) => put(x, k, Chex(!inM(m, x, k + 1) ? '#ffffff' : !inM(m, x, k - 1) ? '#565c68' : !inM(m, x, k + 2) ? '#e4e8ee' : '#a8aeb8'), M_TRIM)); }
    if (A.seams) { const m = AM(A.seams, 1), sc = Crgb(shadeRGB(c1, -0.55)); each(m, v => v === M_BODY, (x, k) => put(x, k, sc)); }
    if (A.hi) {                                                        // Sicken: helle Kante, darunter Schatten
      const m = AM(A.hi, 1), hc = Crgb(shadeRGB(c1, 0.22)), sc = Crgb(shadeRGB(c1, -0.22));
      each(m, v => v === M_BODY, (x, k) => { put(x, k, hc); if (mAt(x, k - 1) === M_BODY && !inM(m, x, k - 1)) put(x, k - 1, sc); });
    }
    if (!B.open && (d.tint | 0) <= 3) {                                // Innenraum: Sitz, Kopfstütze, Lenkrad hinter der Scheibe
      const gb = B.belt / Q + 0.4, g0u = B.glass[0] / Q, g1u = B.glass[1] / Q;
      const sx = A.pil && A.pil.length ? A.pil[0][0] + A.pil[0][1] + 0.6 : g0u + (g1u - g0u) * 0.3;
      const seatRGB = hex2rgb(I.seatColor || '#2a2a30');
      const tint = (m, mix, c) => each(m, v => v === M_GLASS, (x, k) => { const sx2 = ox + x, sy2 = gy - 1 - k, u = unC(pb.d[sy2 * W + sx2]); put(x, k, Crgb(mixRGB([u[0], u[1], u[2]], c, mix))); });
      tint(AM([[[sx, gb - 0.5], [sx + 2.6, gb - 0.5], [sx + 2.2, gb + 3.6], [sx + 0.4, gb + 4]], [[sx + 0.3, gb + 4.3], [sx + 2, gb + 4.3], [sx + 2.1, gb + 5.8], [sx + 0.5, gb + 5.9]]]), 0.5, shadeRGB(seatRGB, -0.35));
      tint(AM([[[sx + 8.4, gb - 0.2], [sx + 9.3, gb + 2.6], [sx + 10.4, gb + 3.1]]], Q), 0.6, [6, 6, 8]);
    }
    const lamp = (polys, cIn, cTop, cEdge) => { const m = AM(polys); each(m, onBody, (x, k) => put(x, k, Chex(edgeOf(m, x, k) ? cEdge : !inM(m, x, k + 2) ? cTop : cIn), M_LIGHT)); };
    if (A.head) lamp(A.head, opt.lights ? '#fff6c8' : '#c2d0da', '#ffffff', '#30323c');
    if (A.tail) lamp(A.tail, opt.brake ? '#ff4060' : '#b0182a', opt.brake ? '#ffd0d8' : '#f05468', '#3c0a12');
    for (const [hx, hy] of A.handle || []) {
      const x0 = Math.round(hx * Q), k0 = Math.round(hy * Q + by), n = Math.round(2.4 * Q);
      for (let a = 0; a < n; a++) { if (mAt(x0 + a, k0) === M_BODY) put(x0 + a, k0, Crgb(shadeRGB(c1, -0.6))); if (mAt(x0 + a, k0 - 1) === M_BODY) put(x0 + a, k0 - 1, Crgb(paintCol(c1, 5, 0, 0, 1))); }
    }
    if (A.mirror) {
      const [mx, my] = A.mirror, m = AM([[[mx - 1.4, my], [mx + 1.2, my], [mx + 1.7, my + 1.5], [mx + 0.7, my + 2.2], [mx - 1.1, my + 2]], [[mx - 0.3, my - 0.4], [mx + 0.5, my - 0.4], [mx + 0.5, my + 0.2], [mx - 0.3, my + 0.2]]]);
      each(m, () => true, (x, k) => put(x, k, edgeOf(m, x, k) ? outC : Crgb(paintCol(c1, inM(m, x, k + Math.round(0.8 * Q)) ? 3 : 5, x, k, 0.9)), M_BODY));
    }
  }
  // ---------- 5) Details: Türfugen, Griffe, Spiegel, Lichter, Grill, Lufteinlässe ----------
  const fugeC = Crgb(shadeRGB(c1, -0.55));
  if (!ART) for (const dx of doors) for (let k = Math.ceil(bot[dx]) + 1; k < Math.floor(beltY); k++) if (mAt(dx, k) === M_BODY) put(dx, k, fugeC);
  if (!ART) for (let i = 0; i < doors.length - 1; i++) {                                     // Türgriffe
    const hx = doors[i] + 2 * Q, hk = Math.floor(beltY) - 3 * Q;
    if (mAt(hx, hk) === M_BODY) for (let a = 0; a < 2 * Q + 1; a++) { put(hx + a, hk, Crgb(shadeRGB(c1, 0.5))); put(hx + a, hk - 1, fugeC); }
  }
  // Seitenspiegel
  if (!ART) { const mx = B.mirror, mk = Math.floor(beltY);
    const mc = Crgb(paintCol(c1, 3, mx, mk, 1)), mh = Crgb(paintCol(c1, 5, mx, mk, 1));
    [[0, 0, outC], [1, 0, mc], [2, 0, mc], [3, 0, outC], [0, 1, outC], [1, 1, mh], [2, 1, mc], [3, 1, mc], [1, 2, outC], [2, 2, outC], [3, 2, outC]]
      .forEach(([dx, dk, c]) => { for (let a = 0; a < Q; a++) for (let b = 0; b < Q; b++) put(mx - Q + dx * Q + a, mk + dk * Q + b, c, M_BODY); }); }
  // Scheinwerfer
  if (!ART) { const [hx, hy, hw, hh] = B.head;
    for (let x = hx; x < hx + hw; x++) for (let k = Math.floor(hy + by); k < Math.floor(hy + by) + hh; k++) {
      if (mAt(x, k) !== M_BODY) continue;
      const edge = x === hx || k === Math.floor(hy + by);
      const lit = opt.lights;
      let c = edge ? '#2a2c38' : (k === Math.floor(hy + by) + hh - 1 ? (lit ? '#ffffff' : '#dff6ff') : (lit ? '#fff8c0' : '#c8d4de'));
      if (!edge && x === hx + hw - 2 && k === Math.floor(hy + by) + 1) c = '#ffffff';
      put(x, k, Chex(c), M_LIGHT);
    } }
  // Rückleuchten
  if (!ART) { const [tx, ty, tw, th] = B.tail;
    for (let x = tx; x < tx + tw + Q; x++) for (let k = Math.floor(ty + by); k < Math.floor(ty + by) + th; k++) {
      if (mAt(x, k) !== M_BODY && mAt(x, k) !== M_LIGHT) continue;
      const topRow = k === Math.floor(ty + by) + th - 1;
      put(x, k, Chex(opt.brake ? (topRow ? '#ffd0d8' : '#ff5068') : (topRow ? '#ff6a7a' : (x >= tx + tw ? '#7a1020' : '#c01830'))), M_LIGHT);
    } }
  // Kühlergrill / Frontlufteinlass
  if (!ART) { const [gx, gyy, gw, gh] = B.grille;
    for (let x = gx; x < gx + gw; x++) for (let k = Math.floor(gyy + by); k < Math.floor(gyy + by) + gh; k++) {
      if (mAt(x, k) !== M_BODY) continue;
      put(x, k, Chex(((k - Math.floor(gyy + by)) % 2) ? '#0f1016' : (I.tier === 'luxus' ? '#a8acb8' : '#3a3c48')), M_TRIM);
    } }
  // Seitlicher Lufteinlass (Supersportler/Hypercars)
  if (B.intake && !ART) {
    const [ix, iy, iw, ih] = B.intake;
    for (let j = 0; j < ih; j++) {
      const k = Math.floor(iy + by) + j;
      const xs = ix + Math.round(j * 0.6), xe = ix + iw;
      for (let x = xs; x < xe; x++) if (mAt(x, k) === M_BODY) put(x, k, Chex(x === xs ? '#05050a' : (x % 2 ? '#14151c' : '#22232c')), M_TRIM);
    }
  }
  // Kotflügel-Kiemen (Sportwagen)
  if (B.vent && !ART) {
    const vx = Math.round(B.wf - R - 5 * Q), vk = Math.floor(archY) + 2 * Q;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3 * Q; j++) if (mAt(vx + i * 2 * Q + j, vk + j) === M_BODY) put(vx + i * 2 * Q + j, vk + j, Chex('#14151c'));
  }
  // Startnummer
  if (d.number > 0) {
    const dd = doors.length >= 3 ? [doors[1], doors[2]] : [doors[0], doors[doors.length - 1]];
    const cx = Math.round((dd[0] + dd[1]) / 2), ck = Math.round(bot[cx] + (beltY - bot[cx]) * 0.42);
    const txt = String(d.number | 0).slice(0, 2), hd = Q >= 2, tw = hd ? txt.length * 6 - 1 : textW(txt);
    const bw = 5 * Q, bh = 4 * Q;
    if (d.numStyle === 'box') { for (let x = cx - bw; x <= cx + bw; x++) for (let k = ck - bh; k <= ck + bh; k++) if (mAt(x, k) === M_BODY) put(x, k, Chex(Math.abs(x - cx) > bw - Q || Math.abs(k - ck) > bh - Q ? '#1a1c2c' : '#f4f4f4')); }
    else { const rr = 5.2 * Q; for (let x = cx - bw - Q; x <= cx + bw + Q; x++) for (let k = ck - bw - Q; k <= ck + bw + Q; k++) { const dx = x - cx, dk = k - ck + 0.5, dd2 = dx * dx + dk * dk; if (dd2 <= rr * rr && mAt(x, k) === M_BODY) put(x, k, Chex(dd2 > (rr - Q) * (rr - Q) ? '#1a1c2c' : '#f4f4f4')); } }
    const sx0 = cx - Math.floor(tw / 2);
    if (hd) putTextHD(put, txt, sx0, ck + 3, Chex('#1a1c2c'));
    else for (let i = 0; i < txt.length; i++) { const gl = glyph(txt[i]); for (let j = 0; j < 15; j++) if (gl[j] === '1') put(sx0 + i * 4 + (j % 3), ck + 2 - Math.floor(j / 3), Chex('#1a1c2c')); }
  }
  // Sponsor-Schriftzug
  if (d.sticker === 'sponsor') {
    const brand = (opt.brand || 'AUTOTYCOON').toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    const x0 = Math.round(B.wr + R + 3 * Q), x1 = Math.round(B.wf - R - 3 * Q);
    const maxCh = Math.floor((x1 - x0 + 1) / (Q >= 2 ? 6 : 4));
    const txt = brand.slice(0, Math.max(0, maxCh));
    const k0 = Math.ceil(bot[x0] + 1) + (Q >= 2 ? 9 * Q / 2 + 3 : 5);
    const sc = Crgb(paintCol(c2, 4, 0, 0, 0.5));
    if (Q >= 2) putTextHD((X, K, c) => { if (mAt(X, K) === M_BODY) put(X, K, c); }, txt, x0, k0, sc);
    else for (let i = 0; i < txt.length; i++) { const gl = glyph(txt[i]); for (let j = 0; j < 15; j++) if (gl[j] === '1') { const X = x0 + i * 4 + (j % 3), K = k0 - Math.floor(j / 3); if (mAt(X, K) === M_BODY) put(X, K, sc); } }
  }
  // Reserverad am Heck (Geländewagen)
  if (B.spare) {
    const cx = ox - 3 * Q, cy = row(20 * Q + by);
    pb.disc(cx, cy, 5.5 * Q, Chex('#1e1e24')); pb.ring(cx, cy, 4.2 * Q, 5.5 * Q, Chex('#2c2c34')); pb.disc(cx, cy, 3 * Q, Chex(d.rimColor)); pb.disc(cx, cy, 1.2 * Q, Chex('#1e1e24'));
  }
  drawDecalOn(d, put, mAt, B, bot, beltY, Q);                         // eigener Pixel-Aufkleber
  // ---------- 5a) Zusatzdetails: Sicke, Stossfänger-Fugen, Tankdeckel, Dachreling, Antenne ----------
  const shadePx = (x, k, f) => { if (mAt(x, k) !== M_BODY) return; const sx = ox + x, sy = row(k), u = unC(pb.d[sy * W + sx]); pb.d[sy * W + sx] = Crgb(shadeRGB([u[0], u[1], u[2]], f)); };
  // Charakterlinie (Sicke) über die ganze Flanke: dunkle Kante, darüber Glanz
  if (!ART) for (let x = 3 * Q; x < L - 3 * Q; x++) {
    const k = Math.floor(lerp(bot[x], Math.min(beltY, top[x]), 0.6));
    if (inWell(x, k) || inWell(x, k + 1) || top[x] - k < 3 * Q) continue;
    if (mAt(x, k - 1) === M_BODY && mAt(x, k + 2) === M_BODY) { shadePx(x, k, -0.16); shadePx(x, k + 1, 0.14); }
  }
  // Stossfänger-Fugen vorne und hinten
  if (!ART) for (const bx of [3 * Q, L - 5 * Q]) { const kTop = Math.floor(lerp(bot[bx], beltY, 0.38)); for (let k = Math.ceil(bot[bx]) + 1; k <= kTop; k++) shadePx(bx, k, -0.3); }
  // Tankdeckel über dem Hinterrad
  if (!ART) { const tx = Math.round(B.wr + R * 0.3), tk = Math.floor(lerp(bot[Math.round(B.wr)], beltY, 0.72));
    const ts = 3 * Q - 1;
    if (mAt(tx, tk) === M_BODY && mAt(tx + ts, tk + ts) === M_BODY && !d.wear) for (let a = 0; a <= ts; a++) for (let b = 0; b <= ts; b++) { if (a === 0 || b === 0) shadePx(tx + a, tk + b, -0.3); else if (a === ts || b === ts) shadePx(tx + a, tk + b, 0.15); } }
  // Dachreling bei Kombi, Van und SUVs
  if (['wagon', 'mpv', 'suv', 'offroad'].includes(d.body)) {
    const r0 = B.glass[0] + 3 * Q, r1 = B.glass[1] - 9 * Q;
    for (let x = r0; x <= r1; x++) { const k = Math.floor(top[x] - 0.5) + 1 + Q; for (let t = 0; t < Q; t++) put(x, k + t, Chex(x === r0 || x === r1 || t === Q - 1 && Q > 1 ? '#1a1b22' : '#4a4c58'), M_AERO); if (x - r0 < Q || r1 - x < Q || (x - r0) % (12 * Q) < Q) for (let t = 1; t < Q + 1; t++) put(x, k - t, Chex('#1a1b22'), M_AERO); }
  }
  // Haifischflossen-Antenne auf dem Dach (nicht bei offenen Autos / Supersportlern)
  if (!B.open && !ART && !['super', 'hyper'].includes(B.cls)) {
    const axx = Math.round(B.glass[0] + (B.glass[1] - B.glass[0]) * 0.22), k = Math.floor(top[axx] - 0.5) + 1;
    for (let a = 0; a < 2 * Q + 1; a++) for (let b = 0; b < Q + 1; b++) if (b <= a / 2) put(axx + a, k + b, Chex(b ? '#2a2b33' : '#1a1b22'), M_AERO);
  }
  // ---------- 5c) Street-Style: Kotflügelverbreiterung, Canards, Scheibenbanner ----------
  if (d.kit === 'wide' || d.kit === 'race') {
    for (const w of wheels) for (let a = Math.PI * 0.04; a < Math.PI * 0.96; a += 0.03 / Q) for (let rr = ra + 0.1 * Q; rr < ra + 2.4 * Q; rr += 0.4) {
      const x = Math.floor(w.x + Math.cos(a) * rr), k = Math.floor(archY + Math.sin(a) * rr);
      if (mAt(x, k) !== M_BODY) continue;
      const sx = ox + x, sy = row(k), u = unC(pb.d[sy * W + sx]);
      pb.d[sy * W + sx] = rr < ra + 0.7 * Q ? outC : rr > ra + 1.8 * Q ? Crgb(shadeRGB([u[0], u[1], u[2]], -0.5)) : Crgb(shadeRGB([u[0], u[1], u[2]], 0.28));
      if (rr > ra + 0.9 * Q && rr < ra + 1.6 * Q && Math.round(a * 30) % 7 === 0) pb.d[sy * W + sx] = Chex('#e0e4ec');          // Nieten
    }
    if (d.kit === 'race') {
      const kc = Math.floor(lerp(bot[L - 3], beltY, 0.3));                                              // Canards vorne
      for (let i = 0; i < 4 * Q; i++) { put(L - 2 * Q + i, kc + Math.floor(i / 2), Chex('#22232a'), M_AERO); put(L - 3 * Q + i, kc + 3 * Q + Math.floor(i / 2), Chex('#22232a'), M_AERO); }
    }
  }
  if (d.banner && !B.open) {
    const c2b = Crgb(shadeRGB(c2, -0.1)), wsx = g1 - Math.round((g1 - g0) * 0.32);
    for (let x = wsx; x <= g1; x++) for (let k = Math.floor(top[x]) - 3 * Q; k <= Math.ceil(top[x]); k++) if (mAt(x, k) === M_GLASS && k + 0.5 > top[x] - 3.4 * Q) put(x, k, (x + k) % (5 * Q) ? c2b : Chex('#f4f4f4'));
  }
  // ---------- 5b) Abnutzung (Gebrauchtwagen): ausgebleicht, Schmutz, Rost, Sprung in der Scheibe ----------
  const WR = d.wear;
  if (WR && WR.w > 0.02) {
    const w = WR.w;
    for (let x = 0; x < L; x++) for (let k = Math.floor(bot[x]) - 1; k <= Math.ceil(top[x]) + 1; k++) {
      const m = mAt(x, k);
      if (m !== M_BODY && m !== M_TRIM && m !== M_GLASS && m !== M_LIGHT) continue;
      const sx = ox + x, sy = row(k), u = unC(pb.d[sy * W + sx]);
      let c = [u[0], u[1], u[2]];
      const f = clamp((k + 0.5 - bot[x]) / Math.max(1, beltY - bot[x]), 0, 1);
      if (m === M_GLASS) {
        if (hash2(x * 5, k * 3) < w * 0.35) c = mixRGB(c, [110, 96, 70], 0.45);
      } else {
        const g = luma(c) * 255;
        c = mixRGB(c, [g, g, g], w * 0.45);                                           // ausgebleichter Lack
        if (hash2(x * 7, k * 3) < w * 0.3) c = mixRGB(c, [96, 74, 52], 0.5);              // Schmutz
        if (WR.rust && m === M_BODY && f < 0.5) {                                          // Rost von unten
          const n = hash2(x >> Q, k >> Q) * 0.65 + hash2(x, k) * 0.35;
          if (n < w * 0.7 + 0.08 - f * 0.4) c = n < 0.22 ? [86, 44, 24] : n < 0.4 ? [138, 74, 42] : [178, 104, 60];
        }
      }
      pb.d[sy * W + sx] = Crgb(c);
    }
    // Sprung in der Frontscheibe
    if (WR.crack) {
      const cx = g1 - 3 * Q, ck = Math.floor(top[g1 - 3 * Q]) - 3 * Q;
      for (let r = 0; r < 6; r++) { const a = r * 1.05 + 0.4; for (let t = 0; t < 6 * Q; t++) { const X = Math.round(cx + Math.cos(a) * t), K = Math.round(ck + Math.sin(a) * t * 0.8); if (mAt(X, K) === M_GLASS) put(X, K, Chex(t < 2 * Q ? '#ffffff' : '#c8dce8')); } }
    }
  }
  // ---------- 6) Fahrwerk sichtbar im Radhaus ----------
  for (const w of wheels) {
    const sx = ox + w.x;
    for (let k = Math.ceil(R); k < Math.floor(archY + ra); k++) {
      if (mAt(Math.floor(w.x), k) !== M_WELL) continue;
      const coil = (Math.floor(k / Q) % 2) ? (I.tier === 'race' ? '#ffcd75' : '#c03040') : '#2b2b33';
      for (let o = -Q; o <= Q; o++) put(Math.floor(w.x) + o, k, Chex(Math.abs(o) < Q / 2 ? '#5a5e68' : coil));
    }
    void sx;
  }
  // ---------- 7) Räder ----------
  const rimRGB = d.wear && d.wear.w > 0.3 ? mixRGB(hex2rgb(d.rimColor || '#c8ccd4'), [96, 84, 70], d.wear.w * 0.6) : hex2rgb(d.rimColor || '#c8ccd4');
  const angle = opt.angle || 0;
  for (const w of wheels) drawWheel(pb, ox + w.x, gy - w.y, R, rimR, rimRGB, d.rim, angle, mask, W, Q);
  // ---------- 8) Aerodynamik-Anbauteile ----------
  const carbon = (x, k) => Chex(((x + k) & 1) ? '#22232a' : '#34353e');
  const aeroPut = (x, k, c) => put(x, k, c, M_AERO);
  // Frontlippe / Splitter
  if (d.lip !== 'none') {
    const kk = Math.floor(bot[L - 4 * Q]) - 1;
    for (let x = L - 13 * Q; x <= L + (d.lip === 'lip' ? 0 : Q); x++) for (let t = 0; t < Q; t++) aeroPut(x, kk - t, d.lip === 'lip' ? Crgb(shadeRGB(c1, t ? -0.6 : -0.45)) : d.lip === 'carbon' ? carbon(x, kk - t) : Chex(t ? '#121216' : '#2a2b33'));
    if (d.lip !== 'lip') for (let t = 0; t < Q; t++) aeroPut(L + Q, kk + 1 + t, Chex('#1c1c22'));
  }
  // Seitenschweller
  if (d.skirts !== 'none') {
    for (let x = Math.ceil(B.wr + ra); x <= Math.floor(B.wf - ra); x++) {
      const kk = Math.floor(bot[x]);
      for (let k = kk - 2 * Q + 1; k <= kk; k++) aeroPut(x, k, d.skirts === 'carbon' ? carbon(x, k) : Crgb(shadeRGB(c1, k > kk - Q ? -0.25 : -0.5)));
    }
  }
  // Diffusor
  if (d.diffuser !== 'none') {
    for (let x = 0; x <= 9 * Q; x++) {
      const kk = Math.floor(bot[x]) - 1;
      for (let t = 0; t < Q; t++) aeroPut(x, kk - t, Chex('#1c1c22'));
      if (d.diffuser === 'race' && x % (2 * Q) < Q) for (let t = Q; t < 2 * Q; t++) aeroPut(x, kk - t, Chex('#2a2b33'));
    }
  }
  // Heckflügel (alle Masse mit Q skaliert)
  if (d.spoiler !== 'none') {
    const q = n => Math.round(n * Q);
    const wx = B.wing, deck = Math.ceil(top[wx + q(4)]);
    const wcB = Crgb(paintCol(c1, 3, 0, 0, 1)), wcL = Crgb(paintCol(c1, 5, 0, 0, 1)), wcD = Crgb(paintCol(c1, 1, 0, 0, 1));
    const vbar = (x, k0, k1, c) => { for (let k = k0; k < k1; k++) for (let t = 0; t < Q; t++) aeroPut(x + t, k, c); };
    if (d.spoiler === 'ducktail') {
      for (let x = 0; x <= wx + q(4); x++) { const k = Math.ceil(top[x]); for (let t = 0; t < Q; t++) aeroPut(x, k + t, x <= wx + q(1) ? wcL : wcB); if (x <= wx) aeroPut(x, k + Q, outC); }
    } else if (d.spoiler === 'low') {
      vbar(wx + q(5), deck, deck + q(3), Chex('#1c1c22'));
      for (let x = wx - q(1); x <= wx + q(9); x++) { for (let t = 0; t < Q; t++) aeroPut(x, deck + q(3) + t, x < wx + q(8) ? wcD : outC); for (let t = 0; t < Q; t++) aeroPut(x, deck + q(4) + t, x > wx - q(1) ? (t === Q - 1 ? wcL : wcB) : outC); }
    } else if (d.spoiler === 'gt' || d.spoiler === 'swan') {
      if (d.spoiler === 'gt') { vbar(wx + q(6), deck, deck + q(5), Chex('#1c1c22')); vbar(wx + q(7), deck, deck + q(5), Chex('#2a2b33')); }
      else { vbar(wx + q(9), deck, deck + q(11), Chex('#1c1c22')); for (let x = wx + q(4); x <= wx + q(9); x++) for (let t = 0; t < Q; t++) aeroPut(x, deck + q(10) + t, Chex('#2a2b33')); }
      // Endplatte mit Carbon-Muster
      const ex0 = wx - q(2), ex1 = wx + q(11), ek0 = deck + q(4), ek1 = deck + q(9);
      for (let x = ex0; x <= ex1; x++) for (let k = ek0; k <= ek1; k++) {
        const edge = x === ex0 || x === ex1 || k === ek0 || k === ek1;
        if ((x === ex0 || x === ex1) && (k === ek0 || k === ek1)) continue;
        aeroPut(x, k, edge ? Chex('#0e0f14') : carbon(x >> (Q - 1), k >> (Q - 1)));
      }
      for (let x = wx - q(1); x <= wx + q(10); x++) for (let t = 0; t < Q; t++) aeroPut(x, deck + q(7) - Math.floor((x - wx + q(1)) / q(6)) + t, Chex(t ? '#3a3c48' : '#6a6e80'));  // Flügelprofil
    } else if (d.spoiler === 'active') {
      vbar(wx + q(8), deck, deck + q(3), Chex('#5a5e68'));
      for (let x = wx - q(2); x <= wx + q(15); x++) { const kk = deck + q(3) + (x < wx + q(4) ? Q : 0); for (let t = 0; t < Q; t++) aeroPut(x, kk + t, carbon(x >> (Q - 1), kk + t)); aeroPut(x, kk + Q, Chex('#0e0f14')); }
    }
  }
  // Auspuff
  const exh = opt.exh || 'stock';
  const exK = Math.floor(bot[2 * Q]);
  const exC = { stock: '#4a4a52', sport: '#c8ccd4', race: '#9a9aa8', titan: '#8a7ae0' }[exh] || '#4a4a52';
  const pipe = (k0, big) => { const n = big ? Q + 1 : Q; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) aeroPut(-n + a, k0 - b, Chex(b === 0 ? shadeHex(exC, -0.3) : a === 0 ? '#101014' : b === n - 1 ? shadeHex(exC, 0.35) : exC)); };
  pipe(exK, exh === 'race' || exh === 'titan');
  if (exh !== 'stock') { pipe(exK - Q - 1, false); if (exh === 'titan') for (let a = 1; a <= Q; a++) aeroPut(-a, exK - Q - 1, Chex('#d8a040')); }
  // ---------- 8b) Neon-Unterbodenbeleuchtung ----------
  if (d.glow && d.glow !== 'none') {
    const gc = Chex(d.glow), x0 = Math.floor(B.wr - R * 0.6), x1 = Math.ceil(B.wf + R * 0.6);
    for (let x = x0 - 6 * Q; x <= x1 + 6 * Q; x++) {
      const fade = x < x0 ? (x - x0 + 6 * Q) / (6 * Q) : x > x1 ? (x1 + 6 * Q - x) / (6 * Q) : 1;
      if (fade <= 0) continue;
      const bk = x >= 0 && x < L ? Math.floor(bot[x]) : 1;
      for (let k = -3 * Q; k < bk; k++) {
        const sx = ox + x, sy = row(k);
        if (sx < 0 || sy < 0 || sx >= W || sy >= H || mask[sy * W + sx] === M_WHEEL) continue;
        const a = (k < 0 ? 0.85 + k * 0.2 / Q : 0.75 - k / Math.max(1, bk) * 0.5) * fade;
        pb.blend(sx, sy, gc, clamp(a, 0, 0.85));
      }
      if (x >= x0 && x <= x1 && x >= 0 && x < L) put(x, Math.floor(bot[x]), Chex(shadeHex(d.glow, 0.4)));   // Leuchtleiste
    }
  }
  // ---------- 9) Bodenschatten ----------
  for (let x = -3 * Q; x < L + 3 * Q; x++) {
    const nearW = wheels.some(w => Math.abs(x - w.x) < R);
    const gf = d.glow && d.glow !== 'none' && !nearW ? 0.25 : 1;      // Neon überstrahlt den Schatten
    for (let t = 0; t < Q; t++) { pb.blend(ox + x, gy + t, Chex('#000000'), (nearW ? 0.55 : 0.38) * gf); pb.blend(ox + x, gy + Q + t, Chex('#000000'), (nearW ? 0.3 : 0.18) * gf); }
  }
  // Ebenen fürs Rennen trennen: alles am Boden (Radhäuser, Räder, Schatten, Neon) bleibt stehen, die Karosserie federt
  let layers = null;
  if (opt.layers) {
    const body = new PB(W, H), well = new Uint32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      const c = pb.d[i]; if (!c) continue;
      const m = mask[i];
      if (m === M_WHEEL) continue;
      if (m === M_WELL || ((i / W) | 0) >= gy) well[i] = c; else body.d[i] = c;
    }
    layers = { bodyCv: body.canvas(), spec: { W, H, Q, R, rimR, rimRGB, rim: d.rim, wellD: well, wheels: wheels.map(w => ({ cx: ox + w.x, cy: gy - w.y })) } };
  }
  const cv = pb.canvas(), iq = 1 / Q;
  const logical = a => { const n = Math.ceil(L / Q), o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = a[Math.min(L - 1, i * Q)] / Q; return o; };
  // Masse in logischen Pixeln (Sprite-Canvas ist Q-mal so gross: beim Zeichnen Zielgrösse W x H angeben)
  return { pb, cv, k: Q, W: W * iq, H: H * iq, ox: ox * iq, gy: gy * iq, L: L * iq, R: R * iq,
    wheels: wheels.map(w => ({ x: (ox + w.x) * iq, y: (gy - w.y) * iq, r: R * iq })), exhaust: { x: (ox - 2 * Q) * iq, y: row(exK) * iq },
    mask, beltY: beltY * iq, top: Q === 1 ? top : logical(top), bot: Q === 1 ? bot : logical(bot), by: by * iq,
    bodyCv: layers && layers.bodyCv, spec: layers && layers.spec, tailY: (gy - row(Math.floor((B.tail[1] || 12 * Q) + by)) ) * iq };
}

/** Rad zeichnen: Reifen mit Profilkante, Felge nach Design, Bremsscheibe und Bremssattel */
function drawWheel(pbOut, cx, cy, R, rimR, rimRGB, design, angle, mask, W, Q = 1) {
  // Proxy: Karosseriepixel (z. B. bei Tieferlegung) verdecken das Rad
  const free = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= pbOut.w || y >= pbOut.h) return false; const m = mask[y * W + x]; return m === 0 || m === M_WELL || m === M_WHEEL; };
  const pb = {
    w: pbOut.w, h: pbOut.h,
    set: (x, y, c) => { if (free(x, y)) pbOut.set(x, y, c); },
    disc: (x, y, r, c) => { const t = new PB(pbOut.w, pbOut.h); t.disc(x, y, r, c); copy(t); },
    ring: (x, y, a, b, c) => { const t = new PB(pbOut.w, pbOut.h); t.ring(x, y, a, b, c); copy(t); },
    rect: (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) pb.set(x + i, y + j, c); }
  };
  function copy(t) { const x0 = Math.max(0, Math.floor(cx - R - 2)), x1 = Math.min(pbOut.w - 1, Math.ceil(cx + R + 2)), y0 = Math.max(0, Math.floor(cy - R - 2)), y1 = Math.min(pbOut.h - 1, Math.ceil(cy + R + 2));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const c = t.d[y * t.w + x]; if (c) pb.set(x, y, c); } }
  const mark = (x, y) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < pb.w && y < pb.h) mask[y * W + x] = M_WHEEL; };
  // Reifen
  const Rc = Math.ceil(R) + 1;
  for (let y = Math.floor(cy - Rc); y <= cy + Rc; y++) for (let x = Math.floor(cx - Rc); x <= cx + Rc; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dd = Math.sqrt(dx * dx + dy * dy);
    if (dd > R) continue;
    let c;
    if (dd > R - Q) { const a = Math.atan2(dy, dx) + angle; c = (Math.floor(a * R * 0.95 + 100) % 2) ? '#363640' : '#24242a'; }   // Profilkante
    else if (dd > rimR + 0.6 * Q) {
      c = (dx + dy < -R * 0.5 && dd > rimR + 1.2 * Q) ? '#3a3a44' : '#2a2a31';                                                // Flanke mit Glanz
      const mid = (rimR + 0.6 * Q + R - Q) / 2, aa = ((Math.atan2(dy, dx) + angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (R - rimR > 2.2 * Q && Math.abs(dd - mid) < 0.55 * Q && ((aa > 0.4 && aa < 1.5) || (aa > 3.5 && aa < 4.6)) && (Math.floor(aa * R * 1.1) % 3) !== 0) c = '#d8d6cc';   // Schriftzug
    }
    else c = '#121218';                                                                                                    // Felgenbett
    if (free(x, y)) { pbOut.set(x, y, Chex(c)); mark(x, y); }
  }
  // Bremsscheibe + Sattel
  pb.disc(cx, cy, rimR * 0.8, Chex('#5f636d'));
  pb.ring(cx, cy, rimR * 0.62, rimR * 0.8, Chex('#767a85'));
  { const ca = -2.3, px = cx + Math.cos(ca) * rimR * 0.62, py = cy + Math.sin(ca) * rimR * 0.62;
    pb.rect(Math.floor(px) - Q, Math.floor(py) - Q, 2 * Q, 3 * Q, Chex('#c02838')); pb.rect(Math.floor(px) - Q, Math.floor(py) - Q, Q, Q, Chex('#ff5a68')); }
  // Farbe der Felge abhängig von Lichtrichtung (oben links hell)
  const rimCol = (dx, dy, extra = 0) => { const l = (-dx - dy) / (Math.hypot(dx, dy) + 0.001); return Crgb(shadeRGB(rimRGB, clamp(l * 0.28 + extra, -0.6, 0.6))); };
  const sp = (x, y, c) => { pb.set(x, y, c); if (Q >= 3) { pb.set(x + 0.8, y, c); pb.set(x, y + 0.8, c); } };
  const spoke = (th, r0, r1, wide) => {
    for (let r = r0; r <= r1; r += 0.35 / Q) {
      const px = cx + Math.cos(th) * r, py = cy + Math.sin(th) * r;
      sp(px, py, rimCol(Math.cos(th), Math.sin(th)));
      if (wide) for (let wq = 0.6; wq <= 0.7 * Q + 0.01; wq += 0.5) { const qx = px - Math.sin(th) * wq, qy = py + Math.cos(th) * wq; sp(qx, qy, rimCol(Math.cos(th), Math.sin(th), -0.18)); }
    }
  };
  const lip = (r0, r1, chrome) => {
    const Rr = Math.ceil(r1) + 1;
    for (let y = Math.floor(cy - Rr); y <= cy + Rr; y++) for (let x = Math.floor(cx - Rr); x <= cx + Rr; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, dd = Math.sqrt(dx * dx + dy * dy);
      if (dd <= r1 && dd > r0) sp(x, y, chrome ? Crgb(shadeRGB([214, 220, 230], clamp((-dx - dy) / (dd + 0.01) * 0.3, -0.4, 0.5))) : rimCol(dx, dy, 0.08));
    }
  };
  switch (design) {
    case 'steel': {
      pb.disc(cx, cy, rimR - 0.6 * Q, Crgb(shadeRGB(rimRGB, -0.12)));
      for (let i = 0; i < 8; i++) { const a = angle + i * Math.PI / 4; pb.disc(cx + Math.cos(a) * rimR * 0.6, cy + Math.sin(a) * rimR * 0.6, 0.45 * Q + 0.15, Chex('#121218')); }
      pb.ring(cx, cy, rimR * 0.28, rimR * 0.42, Crgb(shadeRGB(rimRGB, 0.2)));
      lip(rimR - Q, rimR, false);
      break;
    }
    case 'five': for (let i = 0; i < 5; i++) spoke(angle + i * Math.PI * 2 / 5, 1.2 * Q, rimR - 0.8 * Q, true); lip(rimR - Q, rimR, false); break;
    case 'multi': for (let i = 0; i < 10; i++) spoke(angle + i * Math.PI / 5, 1.2 * Q, rimR - 0.8 * Q, false); lip(rimR - Q, rimR, false); break;
    case 'mesh':
      for (let i = 0; i < 8; i++) {
        const a = angle + i * Math.PI / 4;
        for (let t = 0; t <= 1; t += 0.06) {
          const r = 1.2 + t * (rimR - 2);
          sp(cx + Math.cos(a + t * 0.45) * r, cy + Math.sin(a + t * 0.45) * r, rimCol(Math.cos(a), Math.sin(a)));
          sp(cx + Math.cos(a - t * 0.45) * r, cy + Math.sin(a - t * 0.45) * r, rimCol(Math.cos(a), Math.sin(a), -0.15));
        }
      }
      lip(rimR - Q, rimR, false); break;
    case 'dish': for (let i = 0; i < 6; i++) spoke(angle + i * Math.PI / 3, 1.2 * Q, rimR - 2 * Q, false); lip(rimR - 2.2 * Q, rimR, true); break;
    case 'turbine':
      for (let i = 0; i < 12; i++) { const a0 = angle + i * Math.PI / 6; for (let r = 1.2; r <= rimR - 0.8; r += 0.3) { const a = a0 + r * 0.3; sp(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rimCol(Math.cos(a), Math.sin(a))); } }
      lip(rimR - Q, rimR, false); break;
    case 'star':
      for (let i = 0; i < 7; i++) { const a = angle + i * Math.PI * 2 / 7; spoke(a - 0.1, 1.4 * Q, rimR - 0.8 * Q, false); spoke(a + 0.1, 1.4 * Q, rimR - 0.8 * Q, false); }
      lip(rimR - Q, rimR, false); break;
    case 'split':
      for (let i = 0; i < 5; i++) { const a = angle + i * Math.PI * 2 / 5; spoke(a, 1.2, rimR * 0.45, true);
        for (let t = 0; t <= 1; t += 0.07) { const r = rimR * 0.45 + t * (rimR * 0.55 - 0.8); for (const sgn of [-1, 1]) sp(cx + Math.cos(a + sgn * (0.1 + t * 0.25)) * r, cy + Math.sin(a + sgn * (0.1 + t * 0.25)) * r, rimCol(Math.cos(a), Math.sin(a), sgn * 0.12)); } }
      lip(rimR - Q, rimR, false); break;
    case 'blade':
      for (let i = 0; i < 6; i++) { const a0 = angle + i * Math.PI / 3; for (let r = 1.2; r <= rimR - 0.8; r += 0.25) { const a = a0 + r * 0.55 / rimR * 3; sp(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rimCol(Math.cos(a), Math.sin(a))); sp(cx + Math.cos(a + 0.2) * r, cy + Math.sin(a + 0.2) * r, rimCol(Math.cos(a), Math.sin(a), -0.2)); } }
      lip(rimR - Q, rimR, false); break;
    case 'dishmesh':
      for (let i = 0; i < 10; i++) { const a = angle + i * Math.PI / 5; for (let t = 0; t <= 1; t += 0.08) { const r = 1.2 + t * (rimR - 3.2); sp(cx + Math.cos(a + t * 0.5) * r, cy + Math.sin(a + t * 0.5) * r, rimCol(Math.cos(a), Math.sin(a))); sp(cx + Math.cos(a - t * 0.5) * r, cy + Math.sin(a - t * 0.5) * r, rimCol(Math.cos(a), Math.sin(a), -0.15)); } }
      lip(rimR - 2.4 * Q, rimR, true); break;
    case 'forged':
      for (let i = 0; i < 5; i++) {
        const a = angle + i * Math.PI * 2 / 5;
        spoke(a, 1.2, rimR * 0.55, true);
        for (let t = 0; t <= 1; t += 0.08) { const r = rimR * 0.55 + t * (rimR * 0.45 - 0.8); for (const s of [-1, 1]) sp(cx + Math.cos(a + s * t * 0.3) * r, cy + Math.sin(a + s * t * 0.3) * r, rimCol(Math.cos(a), Math.sin(a), s * 0.1)); }
      }
      lip(rimR - Q, rimR, false); break;
  }
  // Nabe
  pb.disc(cx, cy, 1.5 * Q, Crgb(shadeRGB(rimRGB, 0.3)));
  pb.disc(cx, cy, 0.5 * Q, Chex('#1a1c2c'));
}

/** Halb so grosses Mini-Sprite (z. B. für das Fliessband) */
const _miniCache = new Map();
function miniCar(d) {
  const key = JSON.stringify([d.body, d.color, d.color2, d.stripe, d.rim, d.rimColor, d.spoiler, d.wear || 0, d.decal || '', d.paint, d.sticker]);
  if (_miniCache.has(key)) return _miniCache.get(key);
  const s = renderCar(d);
  const cv = document.createElement('canvas'); cv.width = Math.ceil(s.W / 2); cv.height = Math.ceil(s.H / 2);
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(s.cv, 0, 0, cv.width, cv.height);
  const out = { cv, W: cv.width, H: cv.height, gy: Math.floor(s.gy / 2) };
  _miniCache.set(key, out);
  return out;
}

/** Vorschau-Bild eines Modells als Data-URL (für Listen) */
const _thumbCache = new Map();
function carThumbURL(d, brand) {
  const key = JSON.stringify([d.body, d.color, d.color2, d.stripe, d.paint, d.rim, d.rimColor, d.tire, d.spoiler, d.lip, d.skirts, d.diffuser, d.ride, d.tint, d.number, d.numStyle, d.sticker, d.kit, d.glow, d.banner, d.wear || 0, brand || '', d.decal || '']);
  const hit = _thumbCache.get(key); if (hit) return hit;
  const url = carThumbURLRaw(d, brand);
  if (_thumbCache.size > 300) _thumbCache.delete(_thumbCache.keys().next().value);
  _thumbCache.set(key, url);
  return url;
}
function carThumbURLRaw(d, brand) {
  const s = renderCar(d, { brand });
  const cv = document.createElement('canvas'); cv.width = s.cv.width; cv.height = s.cv.height;
  const ctx = cv.getContext('2d'); ctx.drawImage(s.cv, 0, 0);
  return cv.toDataURL();
}
