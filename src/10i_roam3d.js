/* =============================================================================
   Teil 10i: Freie Fahrt in der Verfolger-Ansicht (Pseudo-3D, Retro-Stil)
   Endlose Strasse aus Segmenten mit Kurven und Hügeln, Häusern/Bäumen/Laternen
   des Landes am Rand (aus den gleichen Pixel-Kulissen), Verkehr, Münzen,
   Sehenswürdigkeiten, Tag/Nacht. Das Auto wird von hinten gezeigt.
   Steuerung: ↑/W/Leertaste Gas · ↓/S Bremse · ←/→ bzw. A/D lenken.
   ============================================================================= */
const SEG = 2;                       // Meter pro Strassensegment
const ROAD_W = 4.2;                  // halbe Strassenbreite in Metern
const CAM_H = 1.7, CAM_D = 0.84;     // Kamerahöhe, Brennweite (~100° Sichtfeld)
const DRAW_SEGS = 170, VIEW_H = 150, HORIZON = 64;

// ---------- Strassenverlauf (endlos, aus Sinus-Wellen pro Ort) ----------
function roadCurve(n, seed) { return 0.028 * (Math.sin(n / 47 + seed) * 1.0 + Math.sin(n / 19 + seed * 2) * 0.45) * (Math.sin(n / 130 + seed) > -0.3 ? 1 : 0.2); }
function roadHill(n, seed) { return 7 * Math.sin(n / 61 + seed * 1.3) + 3 * Math.sin(n / 23 + seed); }
const isTown = (n, seed) => hash2(Math.floor(n / 70), 901 + seed) > 0.32;

// ---------- Auto von hinten (aus dem Design erzeugt) ----------
const _rearCache = new Map();
function carRearSprite(d, brake, lights) {
  const key = JSON.stringify([d.body, d.color, d.color2, d.stripe, d.paint, d.spoiler, d.kit, d.glow, d.tint, d.ride, d.rimColor, brake, lights]);
  if (_rearCache.has(key)) return _rearCache.get(key);
  const B = BODIES[d.body], cls = B.cls, K = 4;
  const w = { small: 30, family: 32, suv: 34, sport: 34, super: 36, hyper: 38 }[cls] || 32;
  const roofH = Math.max(...B.top.map(p => p[1])), h = clamp(Math.round(roofH * 0.62), 12, 21);
  const kitW = d.kit === 'wide' || d.kit === 'race' ? 2 : 0, W = w + 8 + kitW * 2, H = h + 10;
  const cv = document.createElement('canvas'); cv.width = W * K; cv.height = H * K;
  const c = cv.getContext('2d'); c.scale(K, K);
  const cx = W / 2, bodyT = H - 5 - Math.round(h * 0.55), bodyB = H - 4;
  const col = hex2rgb(d.color), sh = f => rgb2hex(shadeRGB(col, f).map(Math.round));
  // Unterbodenbeleuchtung + Schatten
  if (d.glow && d.glow !== 'none') { const g = c.createRadialGradient(cx, H - 1.5, 1, cx, H - 1.5, w * 0.7); g.addColorStop(0, d.glow); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.8; c.fillStyle = g; c.fillRect(0, H - 6, W, 6); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(cx, H - 1.5, w * 0.58, 1.6, 0, 0, Math.PI * 2); c.fill();
  // Räder
  c.fillStyle = '#16161c'; c.fillRect(cx - w / 2 - kitW + 0.5, bodyB - 4, 5, 6); c.fillRect(cx + w / 2 + kitW - 5.5, bodyB - 4, 5, 6);
  c.fillStyle = d.rimColor || '#c8ccd4'; c.fillRect(cx - w / 2 - kitW + 1, bodyB - 2, 1, 2); c.fillRect(cx + w / 2 + kitW - 2, bodyB - 2, 1, 2);
  // Kabine (Trapez) + Heckscheibe
  const cabT = H - 5 - h, cabB = bodyT + 1, topHalf = w * (cls === 'suv' || cls === 'family' || cls === 'small' ? 0.4 : 0.32), botHalf = w * 0.47;
  c.fillStyle = sh(-0.05); c.beginPath(); c.moveTo(cx - topHalf, cabT); c.lineTo(cx + topHalf, cabT); c.lineTo(cx + botHalf, cabB); c.lineTo(cx - botHalf, cabB); c.closePath(); c.fill();
  const tint = ['#3a4a6a', '#2e3a56', '#222a40', '#181c2c', '#0e1018'][clamp(d.tint | 0, 0, 4)];
  c.fillStyle = tint; c.beginPath(); c.moveTo(cx - topHalf + 1.2, cabT + 1.2); c.lineTo(cx + topHalf - 1.2, cabT + 1.2); c.lineTo(cx + botHalf - 2, cabB - 0.6); c.lineTo(cx - botHalf + 2, cabB - 0.6); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(cx - topHalf + 2, cabT + 1.5); c.lineTo(cx - topHalf + 5, cabT + 1.5); c.lineTo(cx - botHalf + 6, cabB - 1); c.lineTo(cx - botHalf + 3, cabB - 1); c.closePath(); c.fill();
  c.fillStyle = sh(0.25); c.fillRect(cx - topHalf, cabT, topHalf * 2, 0.8);        // Dachkante
  // Karosserie
  const g = c.createLinearGradient(0, bodyT, 0, bodyB); g.addColorStop(0, sh(d.paint === 'chrome' ? 0.45 : 0.16)); g.addColorStop(0.5, sh(0)); g.addColorStop(1, sh(-0.3));
  c.fillStyle = g; c.beginPath(); c.moveTo(cx - w / 2 - kitW + 1.5, bodyT); c.lineTo(cx + w / 2 + kitW - 1.5, bodyT); c.lineTo(cx + w / 2 + kitW, bodyT + 2); c.lineTo(cx + w / 2 + kitW, bodyB - 1); c.lineTo(cx - w / 2 - kitW, bodyB - 1); c.lineTo(cx - w / 2 - kitW, bodyT + 2); c.closePath(); c.fill();
  if (d.stripe === 'racing' || d.stripe === 'double') { c.fillStyle = d.color2; c.fillRect(cx - 4, cabT, 2.4, bodyB - cabT - 1); c.fillRect(cx + 1.6, cabT, 2.4, bodyB - cabT - 1); }
  if (d.stripe === 'twotone') { c.fillStyle = d.color2; c.fillRect(cx - w / 2 - kitW, bodyB - 5, w + kitW * 2, 2); }
  // Rückleuchten
  const tl = brake ? '#ff3048' : '#b01830', th = Math.max(2, Math.round(h * 0.16));
  if (brake || lights) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = brake ? 'rgba(255,40,60,0.45)' : 'rgba(255,40,60,0.2)'; c.fillRect(cx - w / 2 - kitW - 2, bodyT, 9, th + 3); c.fillRect(cx + w / 2 + kitW - 7, bodyT, 9, th + 3); c.restore(); }
  c.fillStyle = tl; c.fillRect(cx - w / 2 - kitW + 1, bodyT + 1, 6, th); c.fillRect(cx + w / 2 + kitW - 7, bodyT + 1, 6, th);
  c.fillStyle = brake ? '#ffd0d8' : '#ff6a7a'; c.fillRect(cx - w / 2 - kitW + 1, bodyT + 1, 6, 0.8); c.fillRect(cx + w / 2 + kitW - 7, bodyT + 1, 6, 0.8);
  if (d.kit && d.kit !== 'none') { c.fillStyle = tl; c.fillRect(cx - w / 2 + 7, bodyT + 1.5, w - 14, 0.8); }   // Leuchtband
  // Kennzeichen, Stossstange, Auspuff
  c.fillStyle = '#e8e8ec'; c.fillRect(cx - 4, bodyB - 5, 8, 2.6); c.fillStyle = '#29366f'; c.fillRect(cx - 3, bodyB - 4.2, 6, 0.8);
  c.fillStyle = sh(-0.45); c.fillRect(cx - w / 2 - kitW, bodyB - 2, w + kitW * 2, 1.4);
  c.fillStyle = '#1a1a20'; c.fillRect(cx - w / 2 + 3, bodyB - 1, w - 6, 1.2);
  c.fillStyle = '#8a8e98'; c.beginPath(); c.arc(cx - w * 0.3, bodyB - 0.4, 1, 0, Math.PI * 2); c.fill(); if (cls !== 'small') { c.beginPath(); c.arc(cx + w * 0.3, bodyB - 0.4, 1, 0, Math.PI * 2); c.fill(); }
  // Heckflügel
  if (d.spoiler && d.spoiler !== 'none') {
    const big = ['gt', 'swan', 'active', 'race'].includes(d.spoiler), wy = big ? cabT + 2 : bodyT - 1.5;
    c.fillStyle = '#1a1c24'; if (big) { c.fillRect(cx - w * 0.3, wy, 1, bodyT - wy); c.fillRect(cx + w * 0.3 - 1, wy, 1, bodyT - wy); }
    c.fillStyle = d.spoiler === 'active' || big ? '#22242c' : sh(-0.1); c.fillRect(cx - w / 2 + (big ? 1 : 4), wy - 1.2, w - (big ? 2 : 8), 1.6);
  }
  const out = { cv, W, H };
  if (_rearCache.size > 120) _rearCache.clear();
  _rearCache.set(key, out);
  return out;
}

// ---------- Kulissen-Bausteine als Billboards ----------
function roamBillboards(R) {
  if (R.bill) return R.bill;
  const TH = THEMES[R.T.scene], tiles = R.bg.variants ? R.bg.variants.flat() : null;
  const trees = {};
  for (const k of ['sakura', 'pine', 'palm', 'bamboo']) trees[k] = [0, 1, 2].map(s => { const p = new PB(24, 32); pbTree(p, 12, 32, k, 0, s * 13 + 5); return p.canvas(); });
  const rk = (RURAL[R.place.id] || RURAL.sunset)[1] || 'palm';
  const mk = (w, h, f) => { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d')); return c; };
  const bush = [0, 1].map(k => mk(32, 16, g => { for (let i = 0; i < 14; i++) { g.fillStyle = ['#2f6a38', '#3a8040', '#4a9a4a'][i % 3]; g.beginPath(); g.ellipse(6 + hash2(i, k) * 20, 9 + hash2(i, k + 5) * 4, 5, 4, 0, 0, Math.PI * 2); g.fill(); } if (k) { g.fillStyle = '#ff6a8a'; for (let i = 0; i < 6; i++) g.fillRect(4 + hash2(i, 9) * 24, 5 + hash2(i, 10) * 6, 2, 2); } }));
  const fence = mk(16, 12, g => { g.fillStyle = '#8a6a4a'; g.fillRect(1, 2, 2, 10); g.fillRect(13, 2, 2, 10); g.fillRect(0, 4, 16, 2); g.fillRect(0, 8, 16, 2); });
  const lamp = mk(16, 64, g => { g.fillStyle = '#3a3e48'; g.fillRect(7, 6, 2, 58); g.fillRect(3, 4, 8, 2); g.fillStyle = '#ffe0a0'; g.fillRect(2, 6, 4, 2); });
  R.bill = { tiles, trees, treeKind: rk, TH, bush, fence, lamp };
  return R.bill;
}

// ---------- Projektion ----------
function project(p, camX, camY, camZ) {
  const dz = Math.max(0.1, p.z - camZ), s = CAM_D / dz;
  p.sx = RW_ / 2 + s * (p.x - camX) * RW_ / 2; p.sy = HORIZON - s * (p.y - camY) * RW_ / 2; p.sw = s * ROAD_W * RW_ / 2; p.s = s;
}

function roam3dStep(dt) {
  const R = ROAM, v = R.veh, E = R.car.E, I = R.inp;
  R.t += dt; R.tod = (R.tod + dt / 240) % 1;
  if (R.msgT > 0) R.msgT -= dt;
  const off = Math.abs(R.px) > 1.05;
  for (let i = 0; i < 4; i++) v.step(dt / 4, { thr: I.gas ? 1 : 0, clutch: false });
  if (!I.gas) v.v = Math.max(0, v.v - (I.brake ? 18 : 1.4) * dt);
  if (off) { v.v = Math.max(0, v.v - (v.v > 16 ? 14 : 2) * dt); R.shakeT = 0.1; }
  if (!E.isEV && v.rpm >= E.red * 0.95 && v.shiftT <= 0 && v.gear < E.ratios.length) v.shiftUp();
  if (!E.isEV && v.gear > 1 && v.rpm < E.idle * 1.6 && v.shiftT <= 0) v.shiftDown();
  if (!E.isEV) v.rpm = Math.max(v.rpm, E.idle);
  const sp = v.v, n = Math.floor(R.z / SEG);
  // Lenken + Fliehkraft in Kurven
  const steer = (I.right ? 1 : 0) - (I.left ? 1 : 0);
  R.steer = lerp(R.steer || 0, steer, clamp(dt * 8, 0, 1));
  R.px += R.steer * dt * clamp(sp / 18, 0.25, 1.6) * 1.15;
  R.px -= roadCurve(n, R.seed) * sp * dt * 1.9;
  R.px = clamp(R.px, -2.6, 2.6);
  R.z += sp * dt; R.x = R.z;                                      // R.x = gefahrene Strecke (für Album/HUD)
  // Verkehr (gleiche Richtung, zwei Spuren)
  for (const c of R.cars) {
    c.z += c.v * dt;
    if (c.z < R.z - 30) c.z = R.z + 250 + Math.random() * 200;
    if (c.z > R.z + 420) c.z = R.z - 20;
    const dz = c.z - R.z;
    if (dz > 0 && dz < 3.2 && Math.abs(c.lane - R.px) < 0.42) { v.v = Math.min(v.v, c.v * 0.7); R.px += R.px > c.lane ? 0.08 : -0.08; R.shakeT = 0.25; if (!R.bumpT || R.t - R.bumpT > 1) { R.bumpT = R.t; roamMsg('RUMMS!', 0.8); sfx('bad'); } }
  }
  // Münzen alle 27 Segmente
  const ci = Math.round(R.z / (SEG * 27));
  if (ci > 0 && Math.abs(R.z - ci * SEG * 27) < 2 && !R.coins.has(ci) && Math.abs(R.px - coinLane(ci)) < 0.35) {
    R.coins.add(ci); R.gotCoins++; const ws = worldState(); ws.coins = (ws.coins || 0) + 1; const m = 50 * S.level; S.money += m; sfx('buy'); roamMsg('+' + fmtMoney(m), 0.8);
  }
  // Sehenswürdigkeiten (gleiche Logik wie in der Seitenansicht)
  const P = R.place, si = Math.round((R.z - 260) / SPOT_GAP), sx = 260 + si * SPOT_GAP;
  if (si >= 0 && Math.abs(R.z - sx) < 6) {
    const k = si % P.spots.length, ws = worldState(), F = ws.found[P.id] = ws.found[P.id] || [];
    if (!F.includes(k)) {
      F.push(k); addXP(120 * S.level); const m = 1500 * S.level; S.money += m; sfx('goal');
      toast(`${ico('star', 'big')} <div><b>Entdeckt: ${esc(P.spots[k])}</b><br>+${fmtMoney(m)} · ${F.length}/${P.spots.length} in ${esc(R.T.name)}</div>`, 'good', 5000);
      if (F.length === P.spots.length) { S.gems = (S.gems || 0) + 25; toast(`${ico('gem', 'big')} <b>${esc(R.T.name)} komplett entdeckt!</b> +25 Diamanten`, 'good', 6000); }
      roamMsg('ENTDECKT: ' + P.spots[k].toUpperCase(), 2.5);
    }
  }
  // Partikel: Kirschblüten (Japan), Gras abseits der Strasse
  R.parts = R.parts || [];
  if (sp > 3 && (R.T.scene === 'japan' || off) && Math.random() < (off ? 0.8 : 0.6)) {
    for (const sd of [-1, 1]) R.parts.push({ x: RW_ / 2 + sd * 15 + R.steer * 4, y: VIEW_H - 8, vx: sd * (10 + Math.random() * 30), vy: -(20 + Math.random() * 40 + sp), life: 0.8 + Math.random() * 0.6, col: off ? (Math.random() > 0.5 ? '#4a8a3a' : '#7a6a3a') : (Math.random() > 0.4 ? '#ffb8d8' : '#ff8ab8'), petal: !off });
  }
  for (const p of R.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.petal ? 40 : 120) * dt; p.vx *= p.petal ? 0.99 : 0.96; }
  R.parts = R.parts.filter(p => p.life > 0);
  if (R.parts.length > 300) R.parts.splice(0, R.parts.length - 300);
  if (R.shakeT > 0) R.shakeT -= dt;
  if (R.V && AUD) voiceUpdate(R.V, v, I.gas ? 1 : 0.15, R.muted || !SFX.on, AUD.currentTime);
}
const coinLane = ci => [-0.5, 0, 0.5][Math.floor(hash2(ci, 931) * 3)];

function drawRoam3d() {
  const R = ROAM, cv = $('#roamcv'); if (!cv) return;
  const ctx = hdCtx(cv), bg = R.bg, T = R.T, TH = THEMES[T.scene], t = R.t, BB = roamBillboards(R);
  const night = roamNight(R), seed = R.seed;
  const n0 = Math.floor(R.z / SEG), frac = (R.z % SEG) / SEG;
  // Kurvenversatz für den Hintergrund (Himmel dreht sich mit)
  R.bgOff = (R.bgOff || 0) + roadCurve(n0, seed) * (R.veh.v / 30) * 2.2;
  const shk = R.shakeT > 0 ? Math.round((Math.random() - 0.5) * 2) : 0;
  ctx.save(); ctx.translate(0, shk);
  // Himmel + Wahrzeichen (fest) + Hügel-Streifen (verschiebt sich in Kurven)
  ctx.drawImage(bg.sky, 0, -16, RW_, 80);
  if (TH && TH.landmark) TH.landmark(ctx, t, Math.sin(R.bgOff * 0.004) * 30, 4, 0.78);
  if (night > 0) { ctx.fillStyle = `rgba(6,8,26,${(night * 0.85).toFixed(2)})`; ctx.fillRect(0, 0, RW_, HORIZON + 2); for (let i = 0; i < 60; i++) if (hash2(i, 9) * 1.2 < night) { ctx.fillStyle = '#e8eef8'; ctx.fillRect(Math.floor(hash2(i, 1) * RW_), Math.floor(hash2(i, 2) * 40), 1, 1); } }
  const so = -(((R.bgOff * 1.2) % RW_) + RW_) % RW_;
  ctx.drawImage(bg.skyline, Math.round(so), HORIZON - 26); ctx.drawImage(bg.skyline, Math.round(so) + RW_, HORIZON - 26);
  // Boden bis zum Horizont
  const [grass, , grass2] = RURAL[R.place.id] || RURAL.sunset;
  ctx.fillStyle = grass; ctx.fillRect(0, HORIZON + 2, RW_, VIEW_H - HORIZON);
  // Segmente projizieren (nah → fern)
  const camY = CAM_H + roadHill(n0, seed) * (1 - frac) + roadHill(n0 + 1, seed) * frac;
  let x = 0, dx = -roadCurve(n0, seed) * frac;
  const segs = [];
  for (let i = 0; i < DRAW_SEGS; i++) {
    const n = n0 + i, z1 = n * SEG, z2 = (n + 1) * SEG;
    const p1 = { x: x, y: roadHill(n, seed), z: z1 }, p2 = { x: x + dx, y: roadHill(n + 1, seed), z: z2 };
    x += dx; dx += roadCurve(n, seed);
    const camX = R.px * ROAD_W;
    project(p1, camX, camY, R.z - 4); project(p2, camX, camY, R.z - 4);
    segs.push({ n, p1, p2, clip: 0 });
  }
  let maxy = VIEW_H;
  const asph = T.asph || [60, 62, 72], roadC = rgb2hex(asph.map(Math.round)), roadC2 = rgb2hex(shadeRGB(asph, 0.06).map(Math.round));
  const poly = (x1, y1, w1, x2, y2, w2, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x1 - w1, y1 + 0.35); ctx.lineTo(x1 + w1, y1 + 0.35); ctx.lineTo(x2 + w2, y2 - 0.35); ctx.lineTo(x2 - w2, y2 - 0.35); ctx.closePath(); ctx.fill(); };
  for (const s of segs) {
    const { p1, p2, n } = s;
    s.clip = maxy;
    if (p1.z - (R.z - 4) <= 0.2 || p2.sy >= maxy || p2.sy >= p1.sy) continue;
    const alt = Math.floor(n / 3) % 2;
    ctx.fillStyle = alt ? grass : grass2; ctx.fillRect(0, p2.sy - 0.5, RW_, p1.sy - p2.sy + 1);
    // Gehweg (Stadt) bzw. Randstreifen
    const town = isTown(n, seed) && TH;
    poly(p1.sx, p1.sy, p1.sw * (town ? 1.55 : 1.2), p2.sx, p2.sy, p2.sw * (town ? 1.55 : 1.2), town ? (alt ? (T.wall || ['#c8c4bc'])[0] : (T.wall || ['#c8c4bc'])[1]) : (alt ? '#8a7a5a' : '#9a8a6a'));
    poly(p1.sx, p1.sy, p1.sw * 1.08, p2.sx, p2.sy, p2.sw * 1.08, alt ? '#d83a3a' : '#f4f4f4');          // Randsteine
    poly(p1.sx, p1.sy, p1.sw, p2.sx, p2.sy, p2.sw, alt ? roadC : roadC2);
    if (alt) for (const ln of [-0.33, 0.33]) poly(p1.sx + p1.sw * ln, p1.sy, p1.sw * 0.025, p2.sx + p2.sw * ln, p2.sy, p2.sw * 0.025, '#e8e4d8');
    if (T.scene === 'japan' && s.p1.sw > 6) for (let k = 0; k < 3; k++) {                                     // Blüten auf dem Asphalt
      const u = hash2(n, 940 + k) * 2 - 1, f = hash2(n, 950 + k); if (n <= n0 + 1 && Math.abs(u - R.px) < 0.5) continue;
      ctx.fillStyle = k ? '#ffb8d8' : '#ff8ab8'; ctx.fillRect(lerp(p1.sx, p2.sx, f) + u * lerp(p1.sw, p2.sw, f), lerp(p1.sy, p2.sy, f), Math.max(1, p1.sw * 0.03), Math.max(0.5, p1.sw * 0.012));
    }
    maxy = p2.sy;
  }
  // Billboards und Fahrzeuge (fern → nah)
  const sprite = (img, sx, sy, sw, sh, wM, hM, s, side, clip) => {      // wM/hM in Metern
    const scale = s.p1.s * RW_ / 2, dw = wM * scale, dh = hM * scale;
    const bx = s.p1.sx + side * s.p1.sw / ROAD_W - (side < 0 ? dw : 0) * 0, by = s.p1.sy;
    const x0 = bx - dw / 2, y0 = by - dh;
    if (y0 > clip || dw < 0.6) return;
    const visH = Math.min(dh, clip - y0); if (visH <= 0) return;
    ctx.drawImage(img, sx, sy, sw, sh * visH / dh, x0, y0, dw, visH);
  };
  const ads = (TH && TH.ads) || T.ads || ['MOTEL', 'DINER', 'GAS'];
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i], n = s.n; if (s.p1.z - (R.z - 4) <= 0.5) continue;
    const town = isTown(n, seed) && BB.tiles;
    for (const side of [-1, 1]) {
      const hs = hash2(n, side > 0 ? 960 : 961);
      if (town && n % 3 === 0) {                                                        // Hausfassade aus der Häuserreihe
        const vs = R.bg.variants, tile = vs[Math.floor(hash2(n, 962) * vs.length) % vs.length][night > 0.45 ? 1 : 0], sx0 = Math.floor(hash2(n, 963 + side) * 7) * 24;
        sprite(tile, sx0, 0, 24, 34, 9, 12.5, s, side * (ROAD_W * 1.55 + 4.5), s.clip);
      } else if (!town && hs > 0.42) {
        const tk = BB.trees[BB.treeKind] || BB.trees.palm; sprite(tk[Math.floor(hs * 7) % 3], 0, 0, 24, 32, 6, 8, s, side * (ROAD_W * 1.25 + 2 + (hs - 0.42) * 30), s.clip);
      } else if (!town && hs > 0.2) sprite(BB.bush[Math.floor(hs * 10) % 2], 0, 0, 32, 16, 2.4, 1.2, s, side * (ROAD_W * 1.2 + 1 + hs * 8), s.clip);
      if (!town && n % 4 === 0) sprite(BB.fence, 0, 0, 16, 12, 2, 1.1, s, side * (ROAD_W * 1.12 + 0.6), s.clip);
      if (town && n % 8 === 4) { sprite(BB.lamp, 0, 0, 16, 64, 1, 5, s, side * (ROAD_W * 1.15), s.clip); if (night > 0.3) { const sc2 = s.p1.s * RW_ / 2, lx = s.p1.sx + side * ROAD_W * 1.15 * sc2 - side * 0.4 * sc2, ly = s.p1.sy - 4.8 * sc2; if (ly < s.clip) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night * 0.5; ctx.fillStyle = '#ffe0a0'; ctx.beginPath(); ctx.arc(lx, ly, Math.max(1, 1.2 * sc2), 0, Math.PI * 2); ctx.fill(); ctx.restore(); } } }
      if (n % 14 === 7 && side > 0) {                                                  // Werbeschild
        const txt = ads[Math.floor(hash2(n, 965) * ads.length)];
        if (!R.signs) R.signs = {};
        if (!R.signs[txt]) { const c = document.createElement('canvas'), w = textW(txt) + 8; c.width = w * 2; c.height = 18; const g = hdCtx(c); g.fillStyle = '#0d0f1a'; g.fillRect(0, 0, w, 9); g.fillStyle = ['#b13e53', '#3b5dc9', '#38b764', '#ef7d57'][txt.length % 4]; g.fillRect(1, 1, w - 2, 7); cxText(g, txt, 4, 2, '#f4f4f4'); c._w = w; R.signs[txt] = c; }
        const sc = R.signs[txt]; sprite(sc, 0, 0, sc.width, sc.height, sc._w * 0.11, 1.0, s, ROAD_W * 1.2 + 1, s.clip);
        sprite(BB.trees.pine[0], 11, 0, 2, 32, 0.15, 2.6, s, ROAD_W * 1.2 + 1, s.clip);
      }
    }
    // Sehenswürdigkeit: grosses Schild über der Strasse
    const zM = n * SEG;
    if ((zM - 260) % SPOT_GAP === 0 && zM >= 260) {
      const k = Math.round((zM - 260) / SPOT_GAP) % R.place.spots.length, found = (worldState().found[R.place.id] || []).includes(k), name = R.place.spots[k].toUpperCase();
      const key = name + found; R.spotC = R.spotC || {};
      if (!R.spotC[key]) { const c = document.createElement('canvas'), w = textW(name) + 14; c.width = w * 2; c.height = 26; const g = hdCtx(c); g.fillStyle = '#0d0f1a'; g.fillRect(0, 0, w, 13); g.fillStyle = found ? '#38b764' : '#d4a640'; g.fillRect(1, 1, w - 2, 11); cxText(g, (found ? '✓ ' : '★ ') + name, w / 2, 4, '#ffffff', 1, 'c'); c._w = w; R.spotC[key] = c; }
      const c = R.spotC[key]; sprite(c, 0, 0, c.width, c.height, ROAD_W * 2.4, 1.6, { p1: { ...s.p1, sy: s.p1.sy - 4.2 * s.p1.s * RW_ / 2 } }, 0, s.clip);
      for (const sd of [-1, 1]) sprite(BB.trees.pine[0], 11, 0, 2, 32, 0.2, 4.4, s, sd * ROAD_W * 1.25, s.clip);
    }
    // Münzen
    const ci = n * SEG / (SEG * 27);
    if (Number.isInteger(ci) && ci > 0 && !R.coins.has(ci)) {
      const sp = Math.abs(Math.cos(t * 4 + ci)), lane = coinLane(ci), sc = s.p1.s * RW_ / 2, cx0 = s.p1.sx + lane * s.p1.sw, cy0 = s.p1.sy - 0.9 * sc - Math.sin(t * 3) * 0.2 * sc, r = 0.45 * sc;
      if (cy0 < s.clip && r > 0.4) { ctx.fillStyle = '#8a6a10'; ctx.fillRect(cx0 - r * sp, cy0 - r, Math.max(0.5, 2 * r * sp), 2 * r); ctx.fillStyle = '#ffcd75'; ctx.fillRect(cx0 - r * sp * 0.7, cy0 - r * 0.75, Math.max(0.5, 1.4 * r * sp), 1.5 * r); }
    }
    // Verkehr
    for (const c of R.cars) {
      const cn = Math.floor(c.z / SEG); if (cn !== n) continue;
      const rs = carRearSprite(c.d, false, night > 0.4), sc = s.p1.s * RW_ / 2, wM = 2.0, dw = wM * sc, dh = dw * rs.H / rs.W;
      const cx0 = s.p1.sx + c.lane * s.p1.sw, y0 = s.p1.sy - dh;
      if (y0 < s.clip && dw > 1) ctx.drawImage(rs.cv, 0, 0, rs.cv.width, rs.cv.height * Math.min(1, (s.clip - y0) / dh), cx0 - dw / 2, y0, dw, Math.min(dh, s.clip - y0));
    }
  }
  // Nacht: Abdunkeln (Spieler und Lichter danach)
  if (night > 0) { ctx.fillStyle = `rgba(6,10,30,${(night * 0.45).toFixed(2)})`; ctx.fillRect(0, HORIZON - 30, RW_, VIEW_H - HORIZON + 30); }
  // Spielerauto von hinten
  const v = R.veh, rs = carRearSprite(R.en.design, R.inp.brake, night > 0.35);
  const pw = 66, ph = pw * rs.H / rs.W, bob = v.v > 1 ? Math.sin(t * 25) * 0.4 : 0, lean = R.steer * 3;
  if (night > 0.35) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(RW_ / 2 + lean * 4, VIEW_H - 50, 4, RW_ / 2 + lean * 4, VIEW_H - 50, 90); g.addColorStop(0, 'rgba(255,240,190,0.28)'); g.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(RW_ / 2 - 20, VIEW_H - 12); ctx.lineTo(RW_ / 2 + 20, VIEW_H - 12); ctx.lineTo(RW_ / 2 + 90 + lean * 8, HORIZON + 6); ctx.lineTo(RW_ / 2 - 90 + lean * 8, HORIZON + 6); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.translate(RW_ / 2 + lean, VIEW_H - 4 - ph / 2 + bob); ctx.rotate(R.steer * 0.035); ctx.drawImage(rs.cv, -pw / 2, -ph / 2, pw, ph); ctx.restore();
  for (const p of R.parts) { ctx.globalAlpha = clamp(p.life / 0.4, 0, 1); ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.petal ? 2 : 1.5, p.petal ? 1 : 1.5); }
  ctx.globalAlpha = 1;
  if (TH && TH.ambient && T.scene !== 'vietnam' && T.scene !== 'cambodia') TH.ambient(ctx, R.bgOff * 0.05 / PPM, t);   // Blüten, Feuerwerk, Gondel
  ctx.restore();
  // HUD
  ctx.fillStyle = '#14161f'; ctx.fillRect(0, VIEW_H, RW_, RH_ - VIEW_H); ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, VIEW_H, RW_, 2);
  const kmh = Math.round(v.v * 3.6), P = R.place, found = (worldState().found[P.id] || []).length;
  cxText(ctx, String(kmh), 40, VIEW_H + 7, '#73eff7', 3, 'r'); cxText(ctx, 'KM/H', 44, VIEW_H + 13, '#566c86', 1, 'l');
  cxText(ctx, R.car.E.isEV ? 'D' : String(v.gear), 82, VIEW_H + 7, '#ffcd75', 3, 'c');
  cxText(ctx, `${(R.z / 1000).toFixed(2)} KM`, 130, VIEW_H + 8, '#f4f4f4', 1, 'l');
  cxText(ctx, `★ ${found}/${P.spots.length}`, 200, VIEW_H + 8, '#a7f070', 1, 'l');
  cxText(ctx, `● ${R.gotCoins}`, 250, VIEW_H + 8, '#ffcd75', 1, 'l');
  const nextSpot = Math.max(0, Math.ceil((R.z - 260) / SPOT_GAP)) * SPOT_GAP + 260 - R.z;
  cxText(ctx, Math.abs(R.px) > 1.05 ? 'ABSEITS DER STRASSE – ZURÜCK AUF DEN ASPHALT!' : `NÄCHSTER ORT IN ${Math.max(0, Math.round(nextSpot))} M`, RW_ / 2, VIEW_H + 20, Math.abs(R.px) > 1.05 ? '#ff7b8a' : '#94b0c2', 1, 'c');
  if (R.msgT > 0) cxText(ctx, R.msg, RW_ / 2, 16, '#ffcd75', R.msg.length > 16 ? 2 : 3, 'c', '#000');
}
