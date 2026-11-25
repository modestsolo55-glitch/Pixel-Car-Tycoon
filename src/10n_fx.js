/* =============================================================================
   Teil 10n: Effekte & Licht für Rennen und Cruisen
   - Partikel: dicker Reifenqualm, Auspuff-Wölkchen, Fehlzündungen mit Funken,
     Gummi-Krümel beim Start, Funken bei tiefergelegten Autos
   - Himmel: ziehende Wolken, funkelnde Sterne, Sonnen-Reflexe
   - Licht: Scheinwerfer-Lichtpfützen, Laternenlicht auf der Fahrbahn,
     Blitzlichter im Publikum, Vignette, Hitzeflimmern, Feuerwerk beim Sieg
   ============================================================================= */
const FX_PART_MAX = 420;

// ---------- Partikel ----------
/** Rauch-Textur (Pixel-Wolke mit Licht oben links, ausgefranstem Rand), pro Farbe zwischengespeichert */
const _blobCache = {};
function fxBlob(kind, v) {
  const key = kind + v; if (_blobCache[key]) return _blobCache[key];
  const S = 24, pb = new PB(S, S), c = S / 2;
  const base = kind === 'night' ? [150, 160, 182] : kind === 'black' ? [40, 41, 50] : kind === 'grey' ? [178, 182, 190] : [236, 238, 242];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.sqrt(dx * dx + dy * dy);
    const edge = 10.5 + (hash2(x + v * 31, y) - 0.5) * 3 + Math.sin(Math.atan2(dy, dx) * 5 + v) * 1.2;
    if (d > edge) continue;
    if (d > edge - 1.6 && ((x + y) & 1)) continue;                                   // gedithert ausgefranst
    const l = (-dx - dy) / S;                                                          // Licht von oben links
    pb.set(x, y, Crgb(shadeRGB(base, l * 0.7 - (d / edge) * 0.12)));
  }
  return (_blobCache[key] = pb.canvas());
}
/** Reifenqualm am Hinterrad (Burnout, durchdrehende Räder) */
function fxTireSmoke(who, amount) {
  const R = RACE, v = who === 'p' ? R.pv : R.ov, s = R.sprites[who];
  if (!s) return;
  const n = (amount >= 1.5 ? 2 : Math.random() < amount * 0.7 ? 1 : 0) * (SET.gfx === 'low' && Math.random() < 0.5 ? 0 : 1);
  const relX = (s.wheels[0].x - (s.ox + s.L)) / PPM;
  for (let i = 0; i < n; i++) R.parts.push({ who, kind: 'smoke', v: randi(0, 3), x: v.x + relX + rand(-0.3, 0.3), y: rand(-3, 0), vx: -rand(0.5, 4) - v.v * 0.12, vy: -rand(3, 10), r: rand(2.5, 4.5), grow: rand(5, 9), life: rand(1.4, 2.6), max: 2.6 });
  if (amount > 0.4 && Math.random() < 0.25) R.parts.push({ who, kind: 'debris', x: v.x + relX, y: -1, vx: -rand(2, 8), vy: -rand(40, 90), life: 0.8, max: 0.8 });
}
/** Auspuff: kleines Wölkchen ('puff') oder Fehlzündung mit Funken ('pop') */
function fxExhaust(who, kind) {
  const R = RACE; if (!R) return;
  const v = who === 'p' ? R.pv : R.ov, s = R.sprites[who];
  if (!s) return;
  const x = v.x - (s.ox + s.L - s.exhaust.x) / PPM, y = s.exhaust.y - s.gy + 3 + (v.zR || 0);
  if (kind === 'pop') {
    for (let i = 0; i < 7; i++) R.parts.push({ who, kind: 'spark', x, y, vx: -rand(4, 14) + v.v * 0.6, vy: rand(-60, 20), life: rand(0.2, 0.45), max: 0.45 });
    R.parts.push({ who, kind: 'glow', x, y, vx: v.v * 0.8, vy: 0, life: 0.12, max: 0.12 });
  }
  R.parts.push({ who, kind: 'puff', v: randi(0, 3), x, y, vx: -rand(0.5, 2) + v.v * 0.3, vy: -rand(2, 6), r: rand(1, 1.8), grow: rand(3, 5), life: rand(0.5, 1), max: 1 });
}
/** Funken unter tiefergelegten Autos bei hohem Tempo */
function fxSparksUnder(who) {
  const R = RACE, v = who === 'p' ? R.pv : R.ov, s = R.sprites[who];
  if (!s) return;
  const x = v.x - rand(0.3, 0.7) * s.L / PPM;
  for (let i = 0; i < 5; i++) R.parts.push({ who, kind: 'spark', x, y: 2, vx: -rand(6, 20) + v.v * 0.5, vy: -rand(10, 60), life: rand(0.2, 0.5), max: 0.5 });
}
/** Partikel bewegen (Rauch wächst und steigt, Funken und Krümel fallen und hüpfen) */
function fxUpdate(p, dt) {
  p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.kind === 'spark' || p.kind === 'debris') {
    p.vy += 260 * dt;
    if (p.y > 2) { p.y = 2; p.vy *= -0.35; p.vx *= 0.6; }
  } else { p.r += dt * (p.grow || 6); p.vy *= 0.97; p.vx *= 0.985; }
}
/** pro Spielschritt: Partikel bewegen, begrenzen und laufende Auspuff-/Unterboden-Effekte erzeugen */
function fxStep(R, dt) {
  for (const p of R.parts) fxUpdate(p, dt);
  R.parts = R.parts.filter(p => p.life > 0);
  if (R.parts.length > FX_PART_MAX) R.parts.splice(0, R.parts.length - FX_PART_MAX);
  for (const who of R.cruise ? (R.street ? ['p', 'o'] : ['p']) : ['p', 'o']) {
    const v = who === 'p' ? R.pv : R.ov;
    if (!R.sprites[who]) continue;
    const gas = who === 'p' ? R.inp.gas : v.launched;
    if (Math.random() < dt * (gas ? (v.v < 20 ? 9 : 4) : 2)) fxExhaust(who, 'puff');
    if (v.limiterT > 0.05 && Math.random() < dt * 6) fxExhaust(who, 'pop');
    const ride = (who === 'p' ? R.cfg.player.design : R.cfg.opp.design).ride | 0;
    if (ride <= -4 && v.v > 28 && Math.random() < dt * (ride <= -5 ? 2.5 : 1)) fxSparksUnder(who);
  }
  // Feuerwerk nach dem Sieg
  if (R.fw) for (const f of R.fw) { f.t += dt; for (const q of f.p) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 30 * dt; q.vx *= 0.99; } }
  if (R.fw) R.fw = R.fw.filter(f => f.t < 2.2);
}
/** Partikel einer Spur zeichnen */
function drawSmoke(ctx, who, camX, sh) {
  const R = RACE;
  const gy = who === 'p' ? (R.cruise ? Math.round(R.pY) : LANE_NEAR) : LANE_FAR;
  const night = !!(_raceBG && _raceBG.T.night);
  for (const p of R.parts) {
    if (p.who !== who) continue;
    const x = (p.x - camX) * PPM + sh, y = gy - 3 + p.y;
    if (x < -40 || x > RW_ + 40) continue;
    const a = clamp(p.life / p.max, 0, 1);
    if (p.kind === 'spark') { ctx.fillStyle = a > 0.5 ? '#fff6c8' : '#ffcd75'; ctx.fillRect(Math.round(x), Math.round(y), 1 + (Math.abs(p.vx) > 8 ? 1 : 0), 0.5); continue; }
    if (p.kind === 'debris') { ctx.fillStyle = '#16171c'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); continue; }
    if (p.kind === 'glow') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, `rgba(255,190,90,${0.7 * a})`); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18); ctx.restore(); continue;
    }
    const tex = fxBlob(p.col ? 'black' : p.kind === 'puff' ? (night ? 'night' : 'grey') : night ? 'night' : 'white', p.v || 0);
    ctx.globalAlpha = (p.kind === 'puff' ? 0.45 : 0.82) * Math.pow(a, 0.7);
    ctx.drawImage(tex, x - p.r, y - p.r, p.r * 2, p.r * 2);
  }
  ctx.globalAlpha = 1;
}

// ---------- Himmel ----------
const _cloudTex = [];
function fxCloud(i, col) {
  const key = i + col; if (_cloudTex[key]) return _cloudTex[key];
  const W = 60, H = 22, pb = new PB(W, H), base = hex2rgb(col);
  const blobs = [[14, 14, 7], [24, 10, 9], [36, 11, 8], [46, 15, 6], [30, 15, 7]].map(([x, y, r]) => [x + (hash2(i, x) - 0.5) * 6, y, r * (0.8 + hash2(i, y) * 0.4)]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let inside = false, top = 1; for (const [bx, by, r] of blobs) { const d = Math.hypot(x - bx, y - by); if (d < r) { inside = true; top = Math.min(top, (y - (by - r)) / (2 * r)); } }
    if (!inside || y > 18) continue;
    pb.set(x, y, Crgb(shadeRGB(base, top < 0.25 ? 0.12 : y > 15 ? -0.14 : 0)));
  }
  return (_cloudTex[key] = pb.canvas());
}
/** ziehende Wolken, funkelnde Sterne, Sonnen-Reflexe – direkt nach dem Himmel zeichnen */
function drawFxSky(ctx, camX, t) {
  const T = _raceBG.T;
  if (T.cloud && !T.night && SET.gfx !== 'low') for (let i = 0; i < 4; i++) {
    const w = 60 + i * 8, sp = 2 + i * 1.3, x = ((i * 97 - t * sp - camX * PPM * 0.015) % (RW_ + w) + RW_ + w) % (RW_ + w) - w;
    ctx.globalAlpha = 0.85; ctx.drawImage(fxCloud(i, T.cloud), Math.round(x), 4 + (i * 9) % 24, w, w * 22 / 60); ctx.globalAlpha = 1;
  }
  if (T.night) for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash2(i, 77) * RW_), y = Math.floor(hash2(i, 78) * 46), tw = 0.5 + 0.5 * Math.sin(t * (1.5 + hash2(i, 79) * 3) + i);
    if (tw < 0.35) continue;
    ctx.fillStyle = `rgba(255,255,255,${(tw * 0.9).toFixed(2)})`; ctx.fillRect(x, y, 1, 1);
    if (tw > 0.93) { ctx.fillStyle = 'rgba(200,220,255,0.5)'; ctx.fillRect(x - 1, y, 3, 0.5); ctx.fillRect(x, y - 1, 0.5, 3); }
  }
}
/** Sonnen-Reflexe (Linsen-Lichter) über der ganzen Szene */
function drawFxFlare(ctx) {
  const T = _raceBG.T;
  if (T.night || !T.sun || SET.gfx === 'low') return;
  const [sx, sy] = T.sun, cx = RW_ / 2, cy = 80;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [[0.35, 5, 'rgba(255,220,150,0.10)'], [0.6, 3, 'rgba(160,220,255,0.10)'], [0.85, 8, 'rgba(255,180,120,0.06)'], [1.2, 4, 'rgba(200,255,200,0.07)']].forEach(([k, r, c]) => {
    const x = sx + (cx - sx) * k, y = sy + (cy - sy) * k; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  });
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 40); g.addColorStop(0, 'rgba(255,240,200,0.18)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - 40, sy - 40, 80, 80);
  ctx.restore();
}

// ---------- Licht ----------
/** Lichtpfütze eines Scheinwerfers auf der Fahrbahn (flach gedrückte Ellipse) */
function fxLightPool(ctx, x, y, rx, ry, rgb, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
}
/** Laternenlicht auf der Fahrbahn, Blitzlichter im Publikum, Hitzeflimmern, Vignette, Feuerwerk */
function drawFxLights(ctx, W, camX, t) {
  const R = RACE, T = _raceBG.T, NIGHT = T.night;
  if (NIGHT) for (let i = Math.floor(camX / 40) - 1; i < camX / 40 + RW_ / PPM / 40 + 1; i++) {
    const x = W(i * 40 + 20) + 1;
    fxLightPool(ctx, x, 85, 34, 7, '255,236,190', 0.16); fxLightPool(ctx, x, 112, 40, 9, '255,236,190', 0.12);
  }
  if (R.cruise) cruiseDrawOverlay(ctx);
  if (SET.gfx === 'low') return;
  // Blitzlichter im Publikum (mehr bei Nacht und kurz vor dem Ziel)
  if (!T.town) {
    const near = R.cruise ? 0 : clamp(1 - Math.abs(R.D - R.pv.x) / 120, 0, 1);
    const n = (NIGHT ? 2 : 0.6) + near * 6;
    for (let i = 0; i < n; i++) if (Math.random() < 0.35) {
      const x = Math.random() * RW_, y = 38 + Math.random() * 24;
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(x) - 1, Math.round(y), 3, 1); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
    }
  }
  // Hitzeflimmern über heissem Asphalt (Vulkan, Wüste)
  if (T.hot || T.mesa) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const cv = ctx.canvas, k = cv.width / RW_;
    for (let y = 60; y < 78; y += 1) { const off = Math.round(Math.sin(t * 7 + y * 0.9) * (y > 70 ? 1 : 0.6) * k * 0.5); if (off) ctx.drawImage(cv, 0, y * k, cv.width, k, off, y * k, cv.width, k); }
    ctx.restore();
  }
  // Feuerwerk beim Sieg
  if (R.fw) for (const f of R.fw) {
    const a = clamp(1 - f.t / 2.2, 0, 1);
    for (const q of f.p) { ctx.fillStyle = q.c; ctx.globalAlpha = a; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); }
    ctx.globalAlpha = 1;
    if (f.t < 0.15) fxLightPool(ctx, f.x, f.y, 26, 26, '255,230,200', 0.25);
  }
  // Vignette: Ränder etwas dunkler (nachts stärker) → mehr Tiefe
  const g = ctx.createRadialGradient(RW_ / 2, 70, 60, RW_ / 2, 70, 210);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${NIGHT ? 0.45 : 0.22})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, RW_, 126);
}
/** Feuerwerks-Rakete im Himmel starten */
function fxFirework() {
  const R = RACE; if (!R) return;
  R.fw = R.fw || [];
  const x = rand(40, RW_ - 40), y = rand(12, 40), c = pick(['#ff4b55', '#ffcd75', '#73eff7', '#a7f070', '#ff6ac1', '#f4f4f4']);
  const p = []; for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, sp = rand(18, 34); p.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: i % 5 ? c : '#ffffff' }); }
  R.fw.push({ x, y, t: 0, p });
}
