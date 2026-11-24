/* =============================================================================
   Teil 5: Pixel-Szenen – Garage mit Hebebühne, Motorraum, Cockpit, Fabrik
   ============================================================================= */

// ---------- Garage (Auto-Designer) 200x112 ----------
let _garageBG = null, _garageKey = '';
function garageBackground() {
  const sel = gdeco().sel, key = JSON.stringify(sel) + (sel.left === 'trophy' ? '|' + Math.floor(((S.stats && S.stats.wins) || 0) / 3) : '');
  if (_garageBG && _garageKey === key) return _garageBG;
  const W = 200, H = 112, pb = new PB(W, H);
  drawGarageDeco(pb, W, H, 82, sel);
  _garageKey = key;
  _garageBG = pb.canvas();
  return _garageBG;
}

/** Garage-Szene mit Auto auf der Hebebühne zeichnen */
let _gSmoke = [];
function drawGarage(ctx, d, t, company) {
  const W = 200, H = 112, floorY = 82;
  ctx.drawImage(garageBackground(), 0, 0);
  const LT = gdeco().sel.light;
  drawGarageDecoLive(ctx, t, d);
  // Deckenlampe mit Lichtkegel (gedithert) – Kabel hinter dem Schild
  ctx.fillStyle = '#2a2b33'; ctx.fillRect(99, 5, 2, 18); ctx.fillStyle = '#5a5e68'; ctx.fillRect(90, 22, 20, 3);
  ctx.fillStyle = LT === 'cold' ? '#eef8ff' : LT === 'neon' ? '#ffd0f4' : '#fff4c8'; ctx.fillRect(92, 25, 16, 1);
  ctx.fillStyle = LT === 'cold' ? 'rgba(210,235,255,0.08)' : LT === 'neon' ? 'rgba(255,150,240,0.05)' : 'rgba(255,240,190,0.07)';
  for (let y = 26; y < floorY; y += 1) { const w = 16 + (y - 26) * 1.4; ctx.fillRect(Math.round(100 - w / 2), y, Math.round(w), 1); }
  // Staubkörnchen im Lichtkegel
  for (let i = 0; i < 16; i++) {
    const yy = 28 + ((hash2(i, 1) * 54 + t * (2 + hash2(i, 2) * 3)) % 54), half = (16 + (yy - 26) * 1.4) / 2;
    const xx = 100 + (hash2(i, 3) - 0.5) * 2 * half * 0.85 + Math.sin(t * 0.7 + i) * 3;
    ctx.fillStyle = `rgba(255,244,210,${(0.25 + 0.35 * Math.abs(Math.sin(t * 1.3 + i * 2))).toFixed(2)})`; ctx.fillRect(Math.round(xx * 2) / 2, Math.round(yy * 2) / 2, 0.5, 0.5);
  }
  // Firmenschild an der Wand
  const name = String(company || '').toUpperCase().slice(0, 18);
  const sw = textW(name) + 10;
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(100 - sw / 2 - 1, 8, sw + 2, 11);
  ctx.fillStyle = '#29366f'; ctx.fillRect(100 - sw / 2, 9, sw, 9);
  const blink = Math.sin(t * 3) > -0.9;
  cxText(ctx, name, 100, 11, blink ? '#ffcd75' : '#a08040', 1, 'c');
  // Auto + Hebebühne
  const eng = S ? getEngine(d.engineId) : null;
  const running = typeof REV !== 'undefined' && REV.on && REV.mode === 'design';
  const s = renderCar(d, { brand: company, exh: eng ? eng.exh : 'stock', lights: running });
  const lift = 7 + Math.round(Math.sin(t * 1.2) * 0.6);
  const cx = Math.round((W - s.W) / 2), cy = floorY + 6 - s.gy - lift;
  // Spiegelung auf dem Boden
  ctx.save(); ctx.globalAlpha = 0.13; ctx.translate(0, (cy + s.gy) * 2 + lift * 2 - 6); ctx.scale(1, -1); ctx.drawImage(s.cv, cx, cy, s.W, s.H); ctx.restore();
  // Säulen der Hebebühne
  const pL = cx + s.ox - 8, pR = cx + s.ox + s.L + 6;
  for (const px of [pL, pR]) {
    ctx.fillStyle = '#b13e53'; ctx.fillRect(px, 30, 5, floorY + 8 - 30);
    ctx.fillStyle = '#ef7d57'; ctx.fillRect(px, 30, 1, floorY + 8 - 30);
    ctx.fillStyle = '#6a1e2e'; ctx.fillRect(px + 4, 30, 1, floorY + 8 - 30);
    ctx.fillStyle = '#2a2b33'; ctx.fillRect(px - 1, 28, 7, 3); ctx.fillRect(px - 2, floorY + 6, 9, 3);
  }
  // Arme unter dem Schweller
  const armY = cy + s.gy - Math.round(s.bot[Math.floor(s.L / 2)]) + 1;
  ctx.fillStyle = '#3a3e48'; ctx.fillRect(pL + 5, armY, s.R * 2 + 10, 2); ctx.fillRect(pR - s.R * 2 - 10, armY, s.R * 2 + 10, 2);
  ctx.fillStyle = '#ffcd75'; ctx.fillRect(pL + 5 + s.R * 2 + 8, armY - 1, 3, 1); ctx.fillRect(pR - s.R * 2 - 11, armY - 1, 3, 1);
  ctx.drawImage(s.cv, cx, cy, s.W, s.H);
  // Motor läuft: Abgas, Fehlzündungs-Flammen, Scheinwerferkegel
  _gSmoke = _gSmoke.filter(p => (p.life -= 1 / 60) > 0);
  if (running) {
    const ex = cx + s.exhaust.x, ey = cy + s.exhaust.y, u = REV.E ? REV.rpm / REV.E.red : 0;
    if (Math.random() < 0.25 + u * 0.6) _gSmoke.push({ x: ex, y: ey, vx: -6 - u * 14 - Math.random() * 4, vy: -2 - Math.random() * 3, r: 0.8, life: 1.2, max: 1.2 });
    if (u > 0.93 && Math.random() < 0.35 || REV.thr === 0 && REV.lastFlame > 0) {
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i < 2 ? '#fff4c0' : i < 4 ? '#ffcd75' : '#ef7d57'; ctx.fillRect(ex - 1 - i, ey - (i > 2 && Math.random() > 0.5 ? 1 : 0), 1, i < 3 ? 2 : 1); }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const hx = cx + s.ox + s.L, hy = cy + s.gy - Math.round(BODIES[d.body].head[1] + (d.ride | 0) + 1);
    for (let i = 0; i < 40; i++) { const h = 1 + i * 0.25; ctx.fillStyle = `rgba(255,244,200,${(0.18 * (1 - i / 40)).toFixed(3)})`; ctx.fillRect(hx + i, Math.round(hy - h / 2 + i * 0.15), 1, Math.round(h)); }
    ctx.restore();
  }
  for (const p of _gSmoke) {
    p.x += p.vx / 60; p.y += p.vy / 60; p.r += 0.05; p.vx *= 0.98;
    ctx.fillStyle = `rgba(200,204,212,${(0.35 * p.life / p.max).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  // Schatten der Bühne
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx + s.ox - 4, floorY + 6, s.L + 8, 2);
}

// ---------- Motorraum (Motor-Designer) 192x108, Draufsicht, Front oben ----------
const MAT_COL = { steel: '#6b6f7a', alu: '#b8bcc6', titan: '#9a96b8' };
const COVER_COL = { steel: '#2a2a30', alu: '#c8ccd4', titan: '#c8a050' };
const EXH_COL = { stock: ['#6a5a50', '#4a3e38'], sport: ['#d0d4dc', '#8a8e98'], race: ['#c88a50', '#8a4a30'], titan: ['#8a7ae0', '#d8a040'] };
let _engFanA = 0, _bayFloor = null;
function drawEngineBayOld(ctx, e, bodyColor, t) {
  const _T = [], pbText = (pb, s, x, y, c, sc = 1) => _T.push([s, x, y, c, sc]);   // Text später scharf zeichnen
  const W = 192, H = 108;
  const pb = new PB(W, H);
  const bc = hex2rgb(bodyColor || '#b13e53');
  const isEV = e.type === 'ev', isHy = e.type === 'hybrid';
  const T = ENGINE_TYPES[e.type];
  // Boden des Motorraums
  if (!_bayFloor) { _bayFloor = new PB(W, H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) _bayFloor.set(x, y, Crgb(shadeRGB([30, 31, 40], (hash2(x, y) - 0.5) * 0.12 - y / H * 0.1))); }
  pb.d.set(_bayFloor.d);
  // Kotflügel links/rechts in Wagenfarbe
  for (let y = 0; y < H; y++) for (let x = 0; x < 24; x++) {
    const f = x / 24;
    pb.set(x, y, Crgb(shadeRGB(bc, f > 0.85 ? -0.55 : f < 0.15 ? 0.35 : 0.05 - f * 0.25)));
    pb.set(W - 1 - x, y, Crgb(shadeRGB(bc, f > 0.85 ? -0.55 : f < 0.15 ? 0.35 : 0.05 - f * 0.25)));
  }
  // Federbeindome
  for (const sx of [34, W - 35]) { pb.disc(sx, 26, 7, Chex('#3a3c48')); pb.disc(sx, 26, 4, Chex('#20212a')); pb.disc(sx, 26, 1.5, Chex('#8a8e98')); }
  // Kühler vorne mit Lüfter
  pb.rect(26, 2, W - 52, 12, Chex('#14151c'));
  for (let x = 28; x < W - 28; x += 2) pb.rect(x, 3, 1, 10, Chex('#3a3c48'));
  pb.rect(26, 2, W - 52, 1, Chex('#5a5e68'));
  const run = typeof REV !== 'undefined' && REV.on && REV.mode === 'engine' && REV.E, ru = run ? clamp(REV.rpm / REV.E.red, 0, 1) : 0;
  _engFanA += run ? 0.15 + ru * 1.4 : 0.05;                 // Lüfter dreht mit der Drehzahl
  const fanA = _engFanA;
  for (const fx of [70, 122]) {
    pb.disc(fx, 18, 7, Chex('#1a1b22'));
    for (let i = 0; i < 5; i++) { const a = fanA + i * 1.2566; for (let r = 1; r < 6.5; r += 0.5) pb.set(fx + Math.cos(a + r * 0.12) * r, 18 + Math.sin(a + r * 0.12) * r * 0.55, Chex('#4a4c58')); }
    pb.disc(fx, 18, 1.5, Chex('#8a8e98'));
  }
  // Spritzwand hinten
  pb.rect(24, H - 12, W - 48, 12, Chex('#121218')); pb.rect(24, H - 12, W - 48, 1, Chex('#3a3c48'));
  for (let x = 30; x < W - 30; x += 6) pb.rect(x, H - 8, 3, 1, Chex('#22232c'));
  // Nebenaggregate: Batterie + Behälter
  pb.rect(28, 60, 14, 18, Chex('#1a1c2c')); pb.rect(28, 60, 14, 2, Chex('#3a3c48')); pb.rect(30, 58, 3, 2, Chex('#b13e53')); pb.rect(37, 58, 3, 2, Chex('#3a3c48'));
  pb.rect(W - 42, 64, 12, 16, Chex('#6a8ab0')); pb.rect(W - 40, 62, 6, 2, Chex('#3b5dc9')); pb.rect(W - 42, 64, 12, 1, Chex('#a8c8e8'));
  const jig = run ? Math.round(Math.sin(t * 70) * (0.6 + ru * 1.6)) : 0;   // Motor vibriert, wenn er läuft
  const cx = 96 + jig, cy = 58;
  const matC = hex2rgb(MAT_COL[e.mat] || MAT_COL.steel), covC = hex2rgb(COVER_COL[e.mat] || COVER_COL.steel);
  const ex0 = EXH_COL[e.exh] || EXH_COL.stock, glowK = run ? clamp((ru - 0.55) * 2.2, 0, 1) : 0;
  const ex = glowK > 0 ? [mixHex(ex0[0], '#ff7a30', glowK), mixHex(ex0[1], '#d04020', glowK)] : ex0;   // Krümmer glüht bei hoher Drehzahl
  const block = (x, y, w, h) => { pb.rect(x, y, w, h, Crgb(shadeRGB(matC, -0.15))); pb.rect(x, y, w, 1, Crgb(shadeRGB(matC, 0.3))); pb.rect(x, y + h - 1, w, 1, Crgb(shadeRGB(matC, -0.5))); pb.rect(x, y, 1, h, Crgb(shadeRGB(matC, 0.1))); };
  const cover = (x, y, w, h, n) => {
    pb.rect(x, y, w, h, Crgb(covC)); pb.rect(x, y, w, 1, Crgb(shadeRGB(covC, 0.4))); pb.rect(x, y + h - 1, w, 1, Crgb(shadeRGB(covC, -0.45)));
    for (let i = 0; i < n; i++) { const yy = y + 3 + Math.round(i * (h - 6) / Math.max(1, n - 1)); pb.rect(x + Math.floor(w / 2) - 1, yy - 1, 3, 3, Chex('#1a1c2c')); pb.set(x + Math.floor(w / 2), yy, Chex('#b13e53')); }
    if (e.mat === 'steel') for (let yy = y + 2; yy < y + h - 2; yy += 2) pb.set(x + 1, yy, Chex('#b13e53'));
  };
  const header = (x0, y0, dir, n, len) => { for (let i = 0; i < n; i++) { const yy = y0 + i * 6; for (let k = 0; k < len; k++) pb.set(x0 + dir * k, yy + Math.round(k * 0.3), Chex(k % 3 ? ex[0] : ex[1])); } };
  const snail = (x, y) => { pb.disc(x, y, 6, Chex('#8a8e98')); pb.ring(x, y, 4, 6, Chex('#c8ccd4')); pb.disc(x, y, 3, Chex('#2a2b33')); for (let a = 0; a < 6.2; a += 0.6) pb.set(x + Math.cos(a + _engFanA * 3) * 2, y + Math.sin(a + _engFanA * 3) * 2, Chex('#c8ccd4')); };
  const pipe = (x0, y0, x1, y1, c) => { pb.line(x0, y0, x1, y1, Chex(c)); pb.line(x0 + 1, y0, x1 + 1, y1, Chex(shadeHex(c, -0.3))); };
  let banks = [];
  if (isEV) {
    // Elektromotor(en), Inverter und Hochvoltkabel
    const n = clamp(e.motors | 0, 1, 4);
    const mw = n > 2 ? 26 : 34;
    for (let i = 0; i < Math.min(n, 2); i++) {
      const mx = n === 1 ? cx - mw / 2 : cx - mw - 3 + i * (mw + 6), my = cy - 14;
      pb.rect(mx, my, mw, 30, Chex('#5a6070')); pb.rect(mx, my, mw, 2, Chex('#a8b0c0')); pb.rect(mx, my + 28, mw, 2, Chex('#2a2e38'));
      for (let y = my + 4; y < my + 27; y += 3) pb.rect(mx + 2, y, mw - 4, 1, Chex('#444a58'));
      pb.disc(mx + mw / 2, my + 15, 5, Chex('#2a2e38')); pb.disc(mx + mw / 2, my + 15, 2, Chex('#73eff7'));
    }
    if (n > 2) { pb.rect(cx - 16, cy + 20, 32, 10, Chex('#5a6070')); pb.rect(cx - 16, cy + 20, 32, 1, Chex('#a8b0c0')); cxText2(pb, 'x' + n, cx - 4, cy + 22, Chex('#73eff7')); }
    pb.rect(cx - 22, 24, 44, 12, Chex('#2a2e38')); pb.rect(cx - 22, 24, 44, 1, Chex('#6a7080')); pbText(pb, 'HV', cx - 3, 27, Chex('#ef7d57'));
    pipe(cx - 18, 36, cx - 20, cy - 14, '#ef7d57'); pipe(cx + 16, 36, cx + 18, cy - 14, '#ef7d57');
    pipe(cx - 10, cy + 18, cx - 30, H - 14, '#ef7d57'); pipe(cx + 10, cy + 18, cx + 30, H - 14, '#ef7d57');
    // Batteriezellen sichtbar an der Spritzwand
    for (let i = 0; i < 10; i++) pb.rect(46 + i * 10, H - 22, 8, 8, Chex(i % 2 ? '#2a4a6a' : '#305478'));
    pb.rect(46, H - 23, 100, 1, Chex('#73eff7'));
  } else {
    const cyl = T.cyl, ty = e.type;
    if (ty === 'i6') banks = [{ x: cx - 12, w: 24, n: 6 }];
    else if (ty === 'flat6') banks = [{ x: cx - 52, w: 18, n: 3 }, { x: cx + 34, w: 18, n: 3 }];
    else if (ty === 'rotary') banks = [{ x: cx - 18, w: 36, n: 2 }];
    else if (cyl === 4) banks = [{ x: cx - 13, w: 26, n: 4 }];
    else if (cyl === 16) banks = [{ x: cx - 44, w: 14, n: 4 }, { x: cx - 28, w: 14, n: 4 }, { x: cx + 14, w: 14, n: 4 }, { x: cx + 30, w: 14, n: 4 }];
    else banks = [{ x: cx - 34, w: 20, n: cyl / 2 }, { x: cx + 14, w: 20, n: cyl / 2 }];
    const len = ty === 'rotary' ? 34 : Math.max(30, banks[0].n * 9 + 6);
    const y0 = cy - Math.round(len / 2) + 2;
    if (isHy) {
      // Hybrid: zusätzlich E-Motor & orange Kabel
      pb.rect(cx - 15, y0 + len + 2, 30, 9, Chex('#5a6070')); pb.rect(cx - 15, y0 + len + 2, 30, 1, Chex('#a8b0c0'));
      pipe(cx + 12, y0 + len + 6, W - 44, H - 14, '#ef7d57'); pipe(cx - 12, y0 + len + 6, 44, H - 14, '#ef7d57');
    }
    // Block + Ventildeckel pro Zylinderbank
    block(banks[0].x - 3, y0 - 2, banks[banks.length - 1].x + banks[banks.length - 1].w - banks[0].x + 6, len + 4);
    if (ty === 'rotary') {
      // zwei Läufergehäuse nebeneinander, Rotor-Dreieck sichtbar
      for (let r = 0; r < 2; r++) {
        const rx = cx - 9 + r * 18, ry = y0 + len / 2;
        pb.disc(rx, ry, 8, Crgb(shadeRGB(covC, -0.1))); pb.ring(rx, ry, 7, 8, Crgb(shadeRGB(covC, 0.35)));
        const a0 = _engFanA * 0.6 + r;
        for (let k = 0; k < 3; k++) { const a = a0 + k * 2.094, b = a0 + (k + 1) * 2.094; pb.line(rx + Math.cos(a) * 6, ry + Math.sin(a) * 6, rx + Math.cos(b) * 6, ry + Math.sin(b) * 6, Chex('#ffcd75')); }
        pb.disc(rx, ry, 1.5, Chex('#1a1c2c'));
        pb.rect(rx - 1, ry - 11, 3, 3, Chex('#1a1c2c')); pb.set(rx, ry - 10, Chex('#b13e53'));     // Zündkerzen (2 pro Läufer)
        pb.rect(rx + 4, ry - 11, 3, 3, Chex('#1a1c2c')); pb.set(rx + 5, ry - 10, Chex('#b13e53'));
      }
      pb.rect(cx - 6, y0 - 4, 12, 6, Chex('#5a5e68')); pb.rect(cx - 6, y0 - 4, 12, 1, Chex('#8a8e98'));     // Ansaugstutzen
    } else if (ty === 'flat6') {
      // Boxer: Zylinder liegen flach links/rechts, in der Mitte das Gebläse (luftgekühlter Look)
      banks.forEach(b => cover(b.x, y0, b.w, len, b.n));
      pb.rect(cx - 30, y0 + 1, 60, len - 2, Chex('#3a3c48'));
      pb.disc(cx, y0 + len / 2, 13, Chex('#5a5e68')); pb.ring(cx, y0 + len / 2, 11, 13, Chex('#8a8e98'));
      for (let k = 0; k < 9; k++) { const a = _engFanA * 2 + k * 0.698; pb.line(cx, y0 + len / 2, cx + Math.cos(a) * 10, y0 + len / 2 + Math.sin(a) * 10, Chex('#2a2b33')); }
      pb.disc(cx, y0 + len / 2, 3, Chex('#c8ccd4'));
      for (const sx of [cx - 26, cx + 22]) pb.rect(sx, y0 + 4, 4, len - 8, Chex('#c8ccd4'));       // Ansaugrohre zu den Bänken
    } else banks.forEach(b => cover(b.x, y0, b.w, len, b.n));
    // Zündspulen + Kabel auf jeder Zylinderbank (Detail)
    if (ty !== 'rotary') banks.forEach(b => { for (let i = 0; i < b.n; i++) { const yy = y0 + 3 + Math.round(i * (len - 6) / Math.max(1, b.n - 1)); pb.rect(b.x + b.w - 5, yy - 1, 3, 3, Chex('#101014')); pb.set(b.x + b.w - 4, yy, Chex('#e8d44d')); pb.line(b.x + b.w - 2, yy, b.x + b.w + 1, yy + 1, Chex('#22232c')); } });
    // Öleinfülldeckel + Ölmessstab (gelb)
    pb.disc(banks[0].x + Math.round(banks[0].w / 2), y0 + len - 5, 2, Chex('#e8d44d')); pb.set(banks[0].x + Math.round(banks[0].w / 2), y0 + len - 5, Chex('#1a1c2c'));
    pb.disc(banks[0].x - 6, y0 + len + 3, 1.5, Chex('#e8d44d')); pb.line(banks[0].x - 6, y0 + len + 3, banks[0].x - 3, y0 + len - 4, Chex('#8a8e98'));
    // Riementrieb vorne: Kurbelwelle, Lichtmaschine, Wasserpumpe (dreht sich)
    { const px = banks[0].x + 4, py = y0 - 7, pulleys = [[px, py, 4], [px + 14, py - 3, 3], [px + 7, py - 6, 2.5]];
      pb.line(pulleys[0][0], pulleys[0][1] - 4, pulleys[2][0], pulleys[2][1] - 2.5, Chex('#101014')); pb.line(pulleys[2][0], pulleys[2][1] - 2.5, pulleys[1][0], pulleys[1][1] - 3, Chex('#101014')); pb.line(pulleys[1][0], pulleys[1][1] + 3, pulleys[0][0], pulleys[0][1] + 4, Chex('#101014'));
      for (const [qx, qy, qr] of pulleys) { pb.disc(qx, qy, qr, Chex('#8a8e98')); pb.disc(qx, qy, qr * 0.45, Chex('#3a3c48')); const a = _engFanA * 4; pb.set(qx + Math.cos(a) * (qr - 1), qy + Math.sin(a) * (qr - 1), Chex('#f4f4f4')); } }
    // Bremskraftverstärker an der Spritzwand
    pb.disc(40, H - 22, 7, Chex('#2a2b33')); pb.ring(40, H - 22, 5, 7, Chex('#4a4c58')); pb.disc(40, H - 22, 2, Chex('#6a6e78'));
    // Domstrebe bei Leichtbau-Material
    if (e.mat === 'titan' || e.mat === 'alu') { pb.rect(34, 25, W - 68, 2, Chex(e.mat === 'titan' ? '#8a7ae0' : '#b13e53')); pb.rect(34, 25, W - 68, 1, Chex('#f4f4f4')); }
    // Ansaugbrücke in der Mitte (V-Motoren)
    if (ty === 'i6') {
      pb.rect(cx - 26, y0 + 2, 10, len - 4, Chex('#3a3c48')); for (let i = 0; i < 6; i++) pb.rect(cx - 16, y0 + 5 + i * 9, 4, 2, Chex('#5a5e68')); pb.rect(cx - 26, y0 + 2, 10, 1, Chex('#8a8e98'));
    }
    if (cyl > 4 && cyl !== 16 && /^v/.test(ty)) {
      pb.rect(cx - 12, y0 + 2, 24, len - 4, Chex('#3a3c48'));
      for (let i = 0; i < banks[0].n; i++) { const yy = y0 + 5 + i * 9; pb.rect(cx - 12, yy, 24, 2, Chex('#5a5e68')); }
      pb.rect(cx - 12, y0 + 2, 24, 1, Chex('#8a8e98'));
    }
    if (cyl === 16) { pb.rect(cx - 12, y0 + 2, 24, len - 4, Chex('#3a3c48')); pb.rect(cx - 10, y0 + 4, 20, len - 8, Chex('#2a2b33')); pbText(pb, 'W16', cx - 5, cy - 2, Chex('#ffcd75')); }
    // Drosselklappe + Ansaugrohr zum Luftfilter
    pb.disc(cx, y0 - 5, 4, Chex('#8a8e98')); pb.disc(cx, y0 - 5, 2, Chex('#1a1b22'));
    pipe(cx, y0 - 9, cx - 40, 30, e.ind === 'none' ? '#2a2b33' : '#3b5dc9');
    pb.disc(cx - 42, 30, 5, Chex('#b13e53')); pb.ring(cx - 42, 30, 3, 5, Chex('#6a1e2e'));
    // Krümmer
    const firstX = banks[0].x - 3, lastX = banks[banks.length - 1].x + banks[banks.length - 1].w + 3;
    if (ty !== 'i6' && ty !== 'rotary') header(firstX - 1, y0 + 4, -1, banks[0].n, 12);
    if (cyl > 4 || ty === 'rotary') header(lastX, y0 + 4, 1, ty === 'rotary' ? 2 : banks[0].n, ty === 'rotary' ? 16 : 12);
    // Aufladung
    if (e.ind === 'turbo' || e.ind === 'twin') { for (let x = cx - 34; x < cx + 34; x += 2) pb.rect(x, 4, 1, 8, Chex('#c8ccd4')); pb.rect(cx - 35, 3, 70, 1, Chex('#8a8e98')); pb.rect(cx - 35, 12, 70, 1, Chex('#8a8e98')); }
    if (e.ind === 'turbo') { snail(lastX + 16, y0 + 8); pipe(lastX + 16, y0 + 2, cx + 20, 18, '#3b5dc9'); pb.rect(cx - 30, 15, 60, 5, Chex('#8a8e98')); }
    if (e.ind === 'twin') { snail(firstX - 16, y0 + 8); snail(lastX + 16, y0 + 8); pipe(firstX - 16, y0 + 2, cx - 20, 18, '#3b5dc9'); pipe(lastX + 16, y0 + 2, cx + 20, 18, '#3b5dc9'); pb.rect(cx - 34, 15, 68, 5, Chex('#8a8e98')); }
    if (e.ind === 'super') {
      pb.rect(cx - 10, y0 + 4, 20, len - 10, Chex('#c8ccd4'));
      for (let yy = y0 + 6; yy < y0 + len - 8; yy += 3) pb.rect(cx - 10, yy, 20, 1, Chex('#8a8e98'));
      pb.disc(cx, y0 - 2, 5, Chex('#2a2b33')); pb.disc(cx, y0 - 2, 2.5, Chex('#8a8e98'));
      pb.line(cx - 5, y0 - 2, cx - 8, y0 + 14, Chex('#1a1b22')); pb.line(cx + 5, y0 - 2, cx + 8, y0 + 14, Chex('#1a1b22'));
      pbText(pb, 'SC', cx - 3, y0 + Math.floor(len / 2) - 4, Chex('#b13e53'));
    }
  }
  // NOS-Flaschen
  if (e.nos !== 'none' && !isEV) {
    const n = e.nos === 'big' ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const x = 28 + i * 9, y = 40;
      pb.rect(x, y, 7, 16, Chex('#3b5dc9')); pb.rect(x, y, 2, 16, Chex('#6a8af0')); pb.rect(x + 5, y, 2, 16, Chex('#22348a'));
      pb.rect(x + 2, y - 3, 3, 3, Chex('#c8ccd4')); pbText(pb, 'N', x + 2, y + 6, Chex('#f4f4f4'));
      pb.line(x + 3, y - 3, cx - 20, 34, Chex('#3b5dc9'));
    }
  }
  // Schriftzug Motortyp
  const label = (isEV ? 'ELEKTRO ' + e.motors + 'M' : T.name.toUpperCase() + ' ' + (+e.disp).toFixed(1) + 'L');
  pbText(pb, label, 28, H - 20 + (isEV ? -12 : 0), Chex('#ffcd75'));
  ctx.drawImage(pb.canvas(), 0, 0);
  if (typeof _T !== 'undefined') _T.forEach(([s, x, y, c, sc]) => cxText(ctx, s, x, y, cssOf(c), sc, 'l', '#0d0f1a'));
}
// kleine Hilfe: Text auf PB (für EV-Label)
function cxText2(pb, s, x, y, c) { pbText(pb, s, x, y, c); }

// ---------- Cockpit (Interieur) 192x108 ----------
function drawCockpit(ctx, d, t) {
  const _T = [], pbText = (pb, s, x, y, c, sc = 1) => _T.push([s, x, y, c, sc]);   // Text später scharf zeichnen
  const W = 192, H = 108, I = Object.assign(defaultInterior(), d.interior || {});
  const pb = new PB(W, H);
  const seatC = hex2rgb(I.seatColor);
  const amb = I.ambient !== 'none' && has('int_ambient') ? hex2rgb(I.ambient) : null;
  const pulse = 0.75 + Math.sin(t * 2) * 0.25;
  // Aussenwelt durch die Frontscheibe: Abendhimmel, Berge, Strasse
  for (let y = 0; y < 62; y++) for (let x = 0; x < W; x++) {
    let c;
    if (y < 34) { const f = y / 34; c = mixRGB([41, 54, 111], [239, 125, 87], f * f); if (((x + y) & 1) && y > 26) c = mixRGB(c, [255, 205, 117], 0.3); }
    else if (y < 40) { const m = 34 + Math.round(3 * Math.sin(x * 0.07) + 2 * Math.sin(x * 0.19)); c = y < m + 2 ? [93, 39, 93] : [51, 60, 87]; }
    else { const f = (y - 40) / 22; const half = 6 + f * 70; c = Math.abs(x - 110) < half ? [52, 54, 66] : [37, 113, 121]; if (Math.abs(x - 110) < 1 + f * 1.5 && ((y + Math.floor(t * 20)) % 6) < 3) c = [244, 244, 244]; }
    pb.set(x, y, Crgb(c));
  }
  pb.disc(150, 30, 6, Chex('#ffcd75'));
  // Dachhimmel und A-Säulen
  const liner = I.tier === 'race' ? [34, 34, 40] : I.tier === 'luxus' ? [70, 62, 56] : [58, 60, 70];
  pb.rect(0, 0, W, 7, Crgb(liner)); pb.rect(0, 7, W, 1, Crgb(shadeRGB(liner, -0.4)));
  for (let y = 0; y < 62; y++) {
    const l = Math.round(30 - y * 0.25), r = Math.round(W - 30 + y * 0.25);
    for (let x = 0; x < l; x++) pb.set(x, y, Crgb(shadeRGB(liner, x > l - 3 ? -0.4 : -0.15)));
    for (let x = r; x < W; x++) pb.set(x, y, Crgb(shadeRGB(liner, x < r + 2 ? -0.4 : -0.15)));
  }
  // Innenspiegel
  pb.rect(86, 7, 2, 4, Chex('#1a1b22')); pb.rect(76, 11, 22, 6, Chex('#1a1b22')); pb.rect(77, 12, 20, 4, Chex('#6e93ad')); pb.rect(78, 12, 8, 1, Chex('#bfe0ee'));
  // Überrollkäfig
  if (I.cage && has('int_rollcage')) {
    const cc = '#e8b830', cd = '#a07818';
    for (let y = 8; y < 62; y++) { const l = Math.round(31 - y * 0.25) + 2, r = Math.round(W - 31 + y * 0.25) - 4; pb.rect(l, y, 3, 1, Chex(cc)); pb.set(l + 2, y, Chex(cd)); pb.rect(r, y, 3, 1, Chex(cc)); pb.set(r, y, Chex(cd)); }
    pb.rect(30, 8, W - 60, 3, Chex(cc)); pb.rect(30, 10, W - 60, 1, Chex(cd));
    pb.line(140, 11, 176, 60, Chex(cc)); pb.line(141, 11, 177, 60, Chex(cd));
  }
  // Armaturenbrett
  const dashBase = I.dash === 'carbon' ? null : I.tier === 'luxus' ? [44, 34, 30] : I.tier === 'race' ? [30, 30, 34] : I.tier === 'komfort' ? [50, 52, 60] : [44, 45, 52];
  for (let y = 58; y < 82; y++) for (let x = 0; x < W; x++) {
    const curve = 58 + Math.round(Math.abs(x - 96) * 0.03);
    if (y < curve) continue;
    let c = dashBase ? shadeRGB(dashBase, (y < curve + 2 ? 0.25 : 0) + (hash2(x, y) - 0.5) * (I.tier === 'basic' ? 0.12 : 0.05)) : (((x + y) & 1) ? [34, 35, 42] : [52, 53, 62]);
    pb.set(x, y, Crgb(c));
  }
  // Holz- bzw. Silberzierleiste
  if (I.tier === 'luxus') for (let x = 0; x < W; x++) { pb.set(x, 72, Crgb(mixRGB([138, 90, 60], [170, 120, 74], hash2(x >> 2, 1)))); pb.set(x, 73, Crgb(mixRGB([110, 70, 46], [150, 100, 64], hash2(x >> 2, 2)))); }
  else if (I.tier === 'komfort') pb.rect(0, 73, W, 1, Chex('#94b0c2'));
  else if (I.tier === 'race') for (let x = 0; x < W; x += 4) pb.rect(x, 72, 2, 1, Chex('#b13e53'));
  // Ambientelicht-Leiste
  if (amb) for (let x = 0; x < W; x++) { const c = Crgb(shadeRGB(amb, (pulse - 1) * 0.6)); pb.set(x, 70, c); pb.blend(x, 69, c, 0.35); pb.blend(x, 71, c, 0.35); }
  // Instrumente hinter dem Lenkrad
  const gx = 58, gy = 66;
  if (I.dash === 'analog') {
    for (const ox of [-13, 13]) {
      pb.disc(gx + ox, gy, 8, Chex('#0d0f1a')); pb.ring(gx + ox, gy, 7, 8, Chex('#8a8e98'));
      for (let i = 0; i <= 8; i++) { const a = Math.PI * 0.75 + i * Math.PI * 1.5 / 8; pb.set(gx + ox + Math.cos(a) * 6, gy + Math.sin(a) * 6, Chex(i > 6 && ox > 0 ? '#b13e53' : '#f4f4f4')); }
      const na = Math.PI * 0.75 + (0.2 + 0.15 * Math.sin(t * 1.5 + ox)) * Math.PI * 1.5;
      pb.line(gx + ox, gy, gx + ox + Math.cos(na) * 5, gy + Math.sin(na) * 5, Chex('#ef7d57'));
    }
  } else {
    // Digital- bzw. Carbon-Display mit Leuchten
    pb.rect(gx - 24, gy - 8, 48, 15, Chex('#05060c')); pb.rect(gx - 24, gy - 8, 48, 1, Chex('#33343f'));
    const glow = I.dash === 'carbon' ? '#ef7d57' : '#73eff7';
    const spd = Math.round(88 + Math.sin(t) * 6);
    pbText(pb, String(spd), gx - 6, gy - 4, Chex(glow));
    for (let i = 0; i < 12; i++) pb.rect(gx - 21 + i * 3, gy + 3, 2, 2, Chex(i < 8 ? glow : '#33343f'));
    pbText(pb, 'D', gx + 14, gy - 4, Chex('#a7f070'));
  }
  // Mittelkonsole mit Infotainment
  if (I.tier !== 'basic') {
    const big = I.tier === 'luxus';
    const sx = 104, sy = 60, sw = big ? 36 : 26, sh = big ? 14 : 11;
    pb.rect(sx - 1, sy - 1, sw + 2, sh + 2, Chex('#0d0f1a'));
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) pb.set(sx + x, sy + y, Crgb(mixRGB([20, 40, 80], [40, 90, 140], y / sh)));
    pb.rect(sx + 2, sy + 2, 8, 4, Chex('#41a6f6')); pb.rect(sx + 12, sy + 2, sw - 15, 1, Chex('#94b0c2')); pb.rect(sx + 12, sy + 4, sw - 18, 1, Chex('#566c86'));
    for (let i = 0; i < 4; i++) pb.rect(sx + 2 + i * 6, sy + sh - 4, 4, 2, Chex(i === 1 ? '#a7f070' : '#566c86'));
  } else {
    pb.rect(106, 62, 20, 6, Chex('#14151c')); for (let i = 0; i < 3; i++) pb.disc(110 + i * 6, 72, 2, Chex('#3a3c48'));
  }
  // Lüftungsdüsen
  for (const vx of [94, 148]) { pb.rect(vx, 62, 8, 5, Chex('#14151c')); for (let y = 63; y < 67; y += 2) pb.rect(vx + 1, y, 6, 1, Chex('#3a3c48')); }
  // Türverkleidung links
  for (let y = 60; y < H; y++) for (let x = 0; x < 16 + (y - 60) * 0.1; x++) pb.set(x, y, Crgb(shadeRGB(I.tier === 'luxus' ? seatC : [46, 47, 56], x > 13 ? -0.4 : -0.1)));
  if (amb) for (let y = 64; y < 100; y++) pb.set(12, y, Crgb(shadeRGB(amb, (pulse - 1) * 0.6)));
  // Beifahrersitz rechts (Material sichtbar)
  drawSeat(pb, 132, 66, I, seatC, t);
  // Lenkrad
  drawSteering(pb, 58, 90, I);
  ctx.drawImage(pb.canvas(), 0, 0);
  if (typeof _T !== 'undefined') _T.forEach(([s, x, y, c, sc]) => cxText(ctx, s, x, y, cssOf(c), sc, 'l', '#0d0f1a'));
}

/** Sitz in Rückansicht/Seitenansicht mit Material-Muster */
function drawSeat(pb, x0, y0, I, seatC, t) {
  const bucket = I.seats === 'sport' || I.seats === 'carbon';
  const w = 44, h = 42;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // Form: Lehne mit Kopfstütze (bzw. Schale mit Wangen)
    const head = y < 10 && x > 12 && x < 32;
    const back = y >= 9 && x > 3 - (bucket ? 2 : 0) && x < w - 3 + (bucket ? 2 : 0);
    const shell = bucket && y < 12 && x > 8 && x < 36;
    if (!(head || back || shell)) continue;
    const edge = x < 6 || x > w - 7;
    let c = shadeRGB(seatC, edge ? (bucket ? 0.15 : -0.15) : 0);
    switch (I.seats) {
      case 'cloth': c = shadeRGB(c, ((x + y) & 1) ? -0.08 : 0.04); break;                                  // Stoffmuster
      case 'leather': c = shadeRGB(c, (x === 12 || x === 31) ? -0.3 : (y % 8 === 0 ? -0.2 : (x > 16 && x < 22 ? 0.18 : 0))); break;  // Nähte + Glanz
      case 'premium': { const q = ((x + y) % 8 === 0 || ((x - y) % 8 + 8) % 8 === 0); c = shadeRGB(c, q ? -0.3 : 0.08); break; }    // Steppung
      case 'sport': c = shadeRGB(c, edge ? 0.1 : (y > 14 && y < 30 && x > 14 && x < 30 ? -0.15 : 0)); if (y > 14 && y < 18 && (x === 16 || x === 28)) c = [20, 20, 26]; break;
      case 'carbon': c = edge || y < 12 ? (((x + y) & 1) ? [34, 35, 42] : [56, 57, 66]) : c; if (y > 14 && y < 18 && (x === 16 || x === 28)) c = [20, 20, 26]; break;
    }
    if (y === 9 || (!head && x === 3) ) c = shadeRGB(c, -0.35);
    pb.set(x0 + x, y0 + y, Crgb(c));
  }
  // Gurte bei Race
  if (I.tier === 'race' || bucket) { pb.rect(x0 + 15, y0 + 12, 2, h - 12, Chex('#b13e53')); pb.rect(x0 + 27, y0 + 12, 2, h - 12, Chex('#b13e53')); }
  void t;
}

/** Lenkrad je nach Typ */
function drawSteering(pb, cx, cy, I) {
  const dark = Chex('#1a1b22'), mid = Chex('#2e2f38'), hi = Chex('#4a4c58');
  if (I.steer === 'race') {
    // Rechteckiges Rennlenkrad mit Display und Tasten
    pb.rect(cx - 24, cy - 12, 48, 22, dark);
    pb.rect(cx - 24, cy - 12, 7, 22, mid); pb.rect(cx + 17, cy - 12, 7, 22, mid);
    pb.rect(cx - 24, cy - 12, 48, 1, hi);
    pb.rect(cx - 10, cy - 8, 20, 8, Chex('#05060c')); pbText(pb, '3', cx - 1, cy - 7, Chex('#a7f070'));
    for (let i = 0; i < 5; i++) pb.set(cx - 9 + i * 2, cy - 9, Chex(i < 3 ? '#38b764' : i < 4 ? '#ffcd75' : '#b13e53'));
    [['#b13e53', -14, 3], ['#ffcd75', -14, 7], ['#3b5dc9', 13, 3], ['#38b764', 13, 7]].forEach(([c, dx, dy]) => pb.rect(cx + dx, cy + dy, 2, 2, Chex(c)));
    pb.rect(cx - 3, cy + 2, 6, 6, mid);
    return;
  }
  const r = 21, flat = I.steer === 'sport';
  for (let y = -r - 2; y <= r + 2; y++) for (let x = -r - 2; x <= r + 2; x++) {
    const dd = Math.sqrt(x * x + y * y);
    if (flat && y > r - 6) continue;
    if (dd <= r && dd > r - (flat ? 4 : 3)) pb.set(cx + x, cy + y, (x + y < -r * 0.6) ? hi : (dd > r - 1 ? dark : mid));
  }
  if (flat) { pb.rect(cx - 15, cy + r - 6, 30, 3, mid); pb.rect(cx - 15, cy + r - 6, 30, 1, hi); for (let y = -r; y < -r + 4; y++) pb.rect(cx - 1, cy + y, 2, 1, Chex('#b13e53')); }
  // Speichen
  for (const [ax, ay] of [[-1, 0.15], [1, 0.15], [0, 1]]) { if (flat && ay === 1) continue; for (let i = 6; i < r - 2; i++) { pb.set(cx + ax * i, cy + ay * i, mid); pb.set(cx + ax * i, cy + ay * i + 1, dark); } }
  // Pralltopf (Airbag) mit Logo
  pb.disc(cx, cy, 7, mid); pb.ring(cx, cy, 6, 7, dark); pb.rect(cx - 2, cy - 1, 4, 2, Chex('#ffcd75'));
}

// ---------- Fabrik 320x180 ----------
let _facBase = null;
function facBase(W, H) {
  if (_facBase) return _facBase;
  const b = new PB(W, H);
  for (let y = 0; y < 92; y++) for (let x = 0; x < W; x++) b.set(x, y, Crgb(mixRGB([65, 166, 246], [160, 220, 250], y / 92)));
  for (let y = 80; y < 96; y++) for (let x = 0; x < W; x++) b.set(x, y, Crgb(shadeRGB([56, 183, 100], (hash2(x, y) - 0.5) * 0.2 - (y - 80) * 0.02)));
  return (_facBase = b);
}
function drawFactory(ctx, st, t) {
  const _T = [], pbText = (pb, s, x, y, c, sc = 1) => _T.push([s, x, y, c, sc]);   // Text später scharf zeichnen
  const W = 320, H = ctx.canvas._lh || 180, f = st.factory, stage = f.stage;
  const pb = new PB(W, H);
  // Tag-/Nacht-Zyklus (90 Sekunden Echtzeit)
  const night = clamp(0.5 - 0.5 * Math.cos(t * Math.PI * 2 / 90) - 0.1, 0, 1) * 1.25;
  const winRects = [];
  // Himmel + Boden aus dem Zwischenspeicher (ändern sich nie), Wolken darüber
  pb.d.set(facBase(W, H).d);
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 83 + t * (4 + i)) % (W + 60)) - 30, cy = 12 + (i * 17) % 30;
    for (let k = 0; k < 4; k++) pb.disc(cx + k * 6, cy - (k % 2) * 2, 5 - (k % 2), Chex('#f4f4f4'));
  }
  // Boden
  for (let y = 80; y < 92; y++) pb.d.set(facBase(W, H).d.subarray(y * W, y * W + W), y * W);   // Boden über den Wolken
  pb.rect(0, 92, W, 4, Chex('#333c57')); for (let x = 0; x < W; x += 14) pb.rect(x, 93, 7, 1, Chex('#ffcd75'));
  // Gebäude je nach Ausbaustufe
  const wallC = ['#8a5a3c', '#94b0c2', '#c8ccd4', '#d4d8e0', '#e0e4ec'][stage];
  const roofC = ['#5a3a28', '#566c86', '#3b4a6b', '#333c57', '#29366f'][stage];
  const smoke = (x, y) => { for (let i = 0; i < 6; i++) { const p = ((t * 0.4 + i / 6) % 1); pb.disc(x + Math.sin(p * 6 + i) * 3 + p * 10, y - p * 30, 2 + p * 4, Chex(p > 0.6 ? '#c8ccd4' : '#94b0c2')); } };
  const hall = (x, w, h, teeth) => {
    const y0 = 82 - h;
    pb.rect(x, y0, w, h, Chex(wallC)); pb.rect(x, y0, w, 1, Chex('#f4f4f4')); pb.rect(x + w - 2, y0, 2, h, Chex(shadeHex(wallC, -0.25)));
    if (teeth) { const tw = Math.floor(w / teeth); for (let i = 0; i < teeth; i++) for (let j = 0; j < 8; j++) { pb.rect(x + i * tw, y0 - 8 + j, Math.round(tw * j / 8), 1, Chex(roofC)); pb.set(x + i * tw + Math.round(tw * j / 8), y0 - 8 + j, Chex('#73eff7')); } }
    else pb.rect(x - 2, y0 - 4, w + 4, 4, Chex(roofC));
    for (let wx = x + 5; wx < x + w - 8; wx += 12) { pb.rect(wx, y0 + 5, 7, 6, Chex('#29366f')); pb.rect(wx, y0 + 5, 7, 1, Chex('#73eff7')); winRects.push([wx, y0 + 5, 7, 6]); }
    return y0;
  };
  const door = (x, y, w, h) => { pb.rect(x, y, w, h, Chex('#566c86')); for (let j = y + 1; j < y + h; j += 2) pb.rect(x, j, w, 1, Chex('#3a4458')); };
  const sign = (x, y, txt) => { const w = textW(txt) + 6; pb.rect(x - w / 2, y, w, 9, Chex('#1a1c2c')); pbText(pb, txt, Math.round(x - w / 2 + 3), y + 2, Chex('#ffcd75')); };
  const company = st.company.toUpperCase().slice(0, 16);
  if (stage === 0) { const y0 = hall(130, 60, 34, 0); door(140, y0 + 12, 40, 22); sign(160, y0 - 14, company); }
  if (stage === 1) { const y0 = hall(100, 120, 38, 0); door(110, y0 + 14, 34, 24); door(176, y0 + 14, 34, 24); sign(160, y0 - 14, company); }
  if (stage >= 2) {
    const halls = stage === 2 ? [[70, 170, 44]] : stage === 3 ? [[30, 140, 48], [180, 110, 40]] : [[10, 120, 50], [134, 110, 56], [250, 64, 44]];
    halls.forEach(([x, w, h], i) => { const y0 = hall(x, w, h, Math.floor(w / 28)); door(x + 10, y0 + h - 18, 22, 18); if (i === 0) sign(x + w / 2, y0 - 22, company); });
    const chimneys = stage === 2 ? [228] : stage === 3 ? [150, 276] : [120, 236, 300];
    chimneys.forEach(cx => { pb.rect(cx, 20, 7, 62, Chex('#8a5a3c')); for (let y = 24; y < 82; y += 6) pb.rect(cx, y, 7, 1, Chex('#b13e53')); smoke(cx + 3, 18); });
    if (stage === 4) {
      // Glas-Turm mit Logo
      pb.rect(196, 14, 34, 68, Chex('#29366f'));
      for (let y = 16; y < 80; y += 4) for (let x = 198; x < 228; x += 4) pb.rect(x, y, 3, 3, Chex(hash2(x, y + Math.floor(t)) > 0.3 ? '#73eff7' : '#41a6f6'));
      pb.rect(194, 12, 38, 3, Chex('#1a1c2c'));
      pbText(pb, 'AT', 207, 6, Chex('#ffcd75'));
    }
  }
  // Nacht: Aussenbereich abdunkeln, Sterne, beleuchtete Fenster und Strassenlaternen
  if (night > 0.02) {
    const nc = [10, 14, 40], a = Math.min(0.68, night * 0.68);
    for (let y = 0; y < 96; y++) for (let x = 0; x < W; x++) { const i = y * W + x, u = unC(pb.d[i]); pb.d[i] = Crgb(mixRGB([u[0], u[1], u[2]], nc, a)); }
    if (night > 0.45) for (let i = 0; i < 40; i++) { const sx = Math.floor(hash2(i, 7) * W), sy = Math.floor(hash2(i, 8) * 40); if (hash2(sx, sy) > 0.2) pb.set(sx, sy, Chex((Math.floor(t * 2 + i) % 5) ? '#c8ccd4' : '#ffffff')); }
    if (night > 0.35) {
      winRects.forEach(([x, y, w, h], i) => { if (hash2(i, Math.floor(t / 7)) > 0.25) { pb.rect(x, y, w, h, Chex('#ffcd75')); pb.rect(x, y, w, 1, Chex('#fff4c8')); } });
      for (let lx = 20; lx < W; lx += 60) { pb.rect(lx, 70, 1, 22, Chex('#3a3e48')); pb.rect(lx - 2, 69, 5, 1, Chex('#fff4c8')); for (let y = 71; y < 96; y++) { const w = (y - 70) * 0.7; for (let x = Math.round(lx - w); x <= lx + w; x++) pb.blend(x, y, Chex('#ffe8a0'), 0.12); } }
    }
  }
  // ---- Innenansicht: Fertigungsstrasse mit vier Stationen ----
  const y0 = 100;
  for (let y = y0; y < H; y++) for (let x = 0; x < W; x++) pb.set(x, y, Crgb(shadeRGB([38, 43, 68], (y - y0) / (H - y0) * -0.4 + (hash2(x >> 1, y >> 1) - 0.5) * 0.05)));
  pb.rect(0, y0, W, 2, Chex('#0d0f1a'));
  const ST = [['ROHBAU', 14, 72, '#ef7d57'], ['LACK', 72, 130, '#41a6f6'], ['MONTAGE', 130, 190, '#ffcd75'], ['PRÜFUNG', 190, 250, '#a7f070']];
  ST.forEach(([n, a, b, c]) => { pb.rect(a, y0 + 2, 1, H - y0 - 5, Chex('#2a3048')); pb.rect(a + 1, y0 + 3, b - a - 1, 8, Chex('#1a1e30')); pbText(pb, n, a + 3, y0 + 4, Chex(c)); });
  for (let lx = 43; lx < 250; lx += 58) {
    pb.rect(lx - 5, y0 + 12, 11, 1, Chex('#5a5e68')); pb.rect(lx - 4, y0 + 13, 9, 1, Chex('#fff4c8'));
    for (let y = y0 + 14; y < H - 4; y++) { const w = (y - y0 - 13) * 0.42; for (let x = Math.round(lx - w); x <= lx + w; x++) if ((x + y) & 1) pb.blend(x, y, Chex('#fff0c0'), 0.045); }
  }
  for (let x = 0; x < 252; x++) pb.set(x, H - 3, Chex(((x >> 2) & 1) ? '#ffcd75' : '#1a1c2c'));
  if (stage >= 1) {                                                  // Gabelstapler
    const fx = Math.round(((t * 18) % 300) - 30), fy = H - 11;
    pb.rect(fx, fy, 12, 5, Chex('#ffcd75')); pb.rect(fx, fy, 12, 1, Chex('#fff4c8')); pb.rect(fx + 2, fy - 4, 6, 4, Chex('#29366f'));
    pb.rect(fx + 12, fy - 6, 1, 11, Chex('#3a3c48')); pb.rect(fx + 13, fy + 4, 4, 1, Chex('#3a3c48')); pb.rect(fx + 13, fy, 4, 4, Chex('#8a5a3c'));
    pb.disc(fx + 3, fy + 6, 1.5, Chex('#1a1b22')); pb.disc(fx + 9, fy + 6, 1.5, Chex('#1a1b22'));
  }
  const robot = has('prod_robot') || stage >= 2;
  const worker = (x, y, shirt) => { pb.rect(x, y - 7, 3, 5, Chex(shirt)); pb.rect(x, y - 10, 3, 3, Chex('#f0c0a0')); pb.rect(x, y - 11, 3, 1, Chex('#ffcd75')); pb.rect(x, y - 2, 1, 2, Chex('#29366f')); pb.rect(x + 2, y - 2, 1, 2, Chex('#29366f')); };
  const arm = (bx, by, tx, ty, work) => {                            // Industrieroboter: Sockel, zwei Glieder, Werkzeug
    pb.rect(bx - 3, by - 3, 7, 3, Chex('#3a3c48')); pb.rect(bx - 2, by - 5, 5, 2, Chex('#ef7d57'));
    const ex = (bx + tx) / 2 + (tx > bx ? -3 : 3), ey = Math.min(by, ty) - 6;
    pb.line(bx, by - 5, ex, ey, Chex('#ef7d57')); pb.line(bx + 1, by - 5, ex + 1, ey, Chex('#b13e53'));
    pb.line(ex, ey, tx, ty, Chex('#ffcd75')); pb.rect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 3, Chex('#3a3c48'));
    pb.rect(Math.round(tx) - 1, Math.round(ty), 2, 2, Chex('#1a1b22'));
    if (work) for (let k = 0; k < 7; k++) { const sa = hash2(Math.floor(t * 30) + k, bx) * Math.PI * 2, sr = 1 + hash2(k, Math.floor(t * 30)) * 5; pb.set(tx + Math.cos(sa) * sr, ty + 2 + Math.abs(Math.sin(sa)) * sr, Chex(k % 3 ? '#ffffff' : '#ffcd75')); }
  };
  const lines = f.lines, shown = Math.min(lines.length, 4);
  const top0 = y0 + 14, rowH = Math.floor((H - top0 - 6) / Math.max(1, shown));
  for (let i = 0; i < shown; i++) {
    const L = lines[i], ry = top0 + i * rowH, beltY = ry + rowH - 4;
    const active = L.active && !L.stall;
    pb.rect(14, beltY, 236, 3, Chex('#1a1b22')); pb.rect(14, beltY, 236, 1, Chex('#5a5e68'));
    const off = active ? Math.floor(t * 20) % 6 : 0;
    for (let x = 14 + off; x < 250; x += 6) pb.set(x, beltY + 1, Chex('#8a8e98'));
    pbText(pb, 'L' + (i + 1), 2, beltY - 4, Chex('#ffcd75'));
    const m = S.models.find(mm => mm.id === L.modelId);
    const pr = m && (L.prog > 0 || L.active) ? L.prog : -1;
    const stn = pr < 0 ? -1 : Math.min(3, Math.floor(pr * 4)), inSt = pr * 4 - stn;
    const ctr = k => (ST[k][1] + ST[k][2]) / 2;
    const carC = stn < 0 ? 0 : inSt < 0.18 && stn > 0 ? lerp(ctr(stn - 1), ctr(stn), inSt / 0.18) : ctr(stn);   // Takt: kurz fahren, dann arbeiten
    const working = active && stn >= 0 && inSt >= 0.18;
    // Station 1: Schweissroboter (oder Arbeiter)
    if (robot) { arm(22, beltY, ctr(0) - 10, beltY - Math.min(12, rowH - 12) + Math.sin(t * 5 + i) * 2, working && stn === 0); arm(66, beltY, ctr(0) + 10, beltY - Math.min(10, rowH - 14) + Math.cos(t * 4 + i) * 2, working && stn === 0 && Math.sin(t * 9) > 0); }
    else worker(24 + Math.round(Math.sin(t * 1.5 + i) * 3), beltY, '#3b5dc9');
    // Station 3: Portalkran bringt Räder/Motor, Arbeiter
    pb.rect(134, ry + 1, 54, 1, Chex('#566c86'));
    const trol = working && stn === 2 ? ctr(2) + Math.sin(t * 2) * 8 : 150;
    pb.rect(Math.round(trol) - 2, ry, 5, 3, Chex('#ffcd75'));
    const hookY = ry + 3 + (working && stn === 2 ? Math.round((0.5 + 0.5 * Math.sin(t * 2.4)) * Math.max(2, rowH - 22)) : 2);
    pb.rect(Math.round(trol), ry + 3, 1, hookY - ry - 3, Chex('#8a8e98'));
    if (working && stn === 2) { pb.disc(Math.round(trol), hookY + 3, 3, Chex('#1a1b22')); pb.disc(Math.round(trol), hookY + 3, 1.5, Chex('#c8ccd4')); }
    worker(178, beltY, '#38b764');
    // Auto auf dem Band: Rohbau grau, in der Lackiererei bekommt es Farbe
    if (stn >= 0) {
      const mini = miniCar(m);
      if (!mini._d32) { const id = mini.cv.getContext('2d').getImageData(0, 0, mini.W, mini.H); mini._d32 = new Uint32Array(id.data.buffer.slice(0)); }
      const d32 = mini._d32, px = Math.round(carC - mini.W / 2), mix = stn === 0 ? 0 : stn === 1 ? clamp((inSt - 0.2) / 0.7, 0, 1) : 1;
      for (let yy = 0; yy < mini.H; yy++) for (let xx = 0; xx < mini.W; xx++) {
        const c = d32[yy * mini.W + xx]; if (!c || (c >>> 24) < 128) continue;
        let col = c;
        if (mix < 1) { const u = unC(c), g = (u[0] * 0.3 + u[1] * 0.55 + u[2] * 0.15) * 0.8 + 40; col = Crgb(mixRGB([g, g + 2, g + 6], [u[0], u[1], u[2]], mix)); }
        pb.set(px + xx, beltY - mini.gy - 1 + yy, col);
      }
      if (stn === 3 && working && Math.floor(t * 4) % 2) pb.rect(px + mini.W - 4, beltY - 8, 2, 2, Chex('#fff6c8'));    // Lichttest
    }
    // Station 2: Lackierkabine mit Glasfront und Sprühnebel
    { const a = ST[1][1] + 2, b = ST[1][2] - 2, ky = ry + 2;
      pb.rect(a, ky, b - a, 1, Chex('#5a5e68')); pb.rect(a, ky, 1, beltY - ky, Chex('#5a5e68')); pb.rect(b - 1, ky, 1, beltY - ky, Chex('#5a5e68'));
      for (let y = ky + 1; y < beltY; y++) for (let x = a + 1; x < b - 1; x++) pb.blend(x, y, Chex('#9ad4f0'), 0.14);
      if (working && stn === 1) { const pc = Chex(m.color || '#c8ccd4'); for (let k = 0; k < 26; k++) pb.blend(a + 2 + hash2(k, Math.floor(t * 12)) * (b - a - 4), ky + 2 + hash2(k + 9, Math.floor(t * 12)) * (beltY - ky - 4), pc, 0.55); }
    }
    // Station 4: Prüfportal mit Scanner-Linie
    { const a = ST[3][1] + 8, b = ST[3][2] - 8, ky = ry + 2;
      pb.rect(a, ky, 2, beltY - ky, Chex('#3a3c48')); pb.rect(b, ky, 2, beltY - ky, Chex('#3a3c48')); pb.rect(a, ky, b - a + 2, 2, Chex('#3a3c48'));
      if (working && stn === 3) { const sy = ky + 3 + Math.round((0.5 + 0.5 * Math.sin(t * 5)) * (beltY - ky - 5)); for (let x = a + 2; x < b; x++) pb.blend(x, sy, Chex('#a7f070'), 0.8); }
      pb.disc(b + 1, ky - 1, 1.5, Chex(working && stn === 3 ? (inSt > 0.8 ? '#38e070' : '#ffcd75') : '#33343f'));
    }
    if (L.stall) pbText(pb, L.stall.toUpperCase(), 80, ry + 2, Chex(hash2(Math.floor(t * 3), i) > 0.3 ? '#ff7b8a' : '#b13e53'));
  }
  if (lines.length > shown) pbText(pb, '+' + (lines.length - shown) + ' LINIEN', 200, y0 + 4, Chex('#94b0c2'));
  // Lager
  const cap = warehouseCap(), used = stockTotal();
  pb.rect(256, y0 + 10, 60, H - y0 - 14, Chex('#22263a')); pb.rect(256, y0 + 10, 60, 1, Chex('#566c86'));
  pbText(pb, 'LAGER', 266, y0 + 14, Chex('#ffcd75'));
  const slots = 36, filled = Math.round(clamp(used / Math.max(1, cap), 0, 1) * slots);
  for (let s = 0; s < slots; s++) { const sx = 262 + (s % 6) * 8, sy = y0 + 24 + Math.floor(s / 6) * 10; if (sy + 7 > H - 12) break; pb.rect(sx, sy, 6, 7, Chex(s < filled ? (filled >= slots ? '#b13e53' : '#8a5a3c') : '#14182a')); if (s < filled) pb.rect(sx, sy, 6, 1, Chex('#ffcd75')); }
  pbText(pb, used + '/' + cap, 262, H - 9, Chex(used >= cap ? '#ff7b8a' : '#a7f070'));
  ctx.drawImage(pb.canvas(), 0, 0);
  { const lot = []; for (const m of S.models) for (let k = 0; k < (S.stock[m.id] || 0) && lot.length < 11; k++) lot.push(m);
    if (night > 0.35) ctx.filter = 'brightness(0.55)';
    lot.forEach((m, k) => { const mi = miniCar(m), w = mi.W * 0.5, h = mi.H * 0.5; ctx.drawImage(mi.cv, W - 8 - (k + 1) * 28, 91 - mi.gy * 0.5, w, h); });
    ctx.filter = 'none'; }
  if (typeof _T !== 'undefined') _T.forEach(([s, x, y, c, sc]) => cxText(ctx, s, x, y, cssOf(c), sc, 'l', '#0d0f1a'));
}
