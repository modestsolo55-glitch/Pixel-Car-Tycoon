/* =============================================================================
   Teil 10h: Fuji in hoher Auflösung + Sakura-Blätter auf der Strasse
   Der Fuji wird mit Pfaden und Verläufen in doppelter Auflösung gezeichnet und
   steht fest im Hintergrund (keine Parallaxe) hinter Hügeln, Häusern, Bäumen.
   Auf der Strasse liegen Kirschblüten; fährt ein Auto durch, wirbeln sie auf.
   ============================================================================= */
let _fujiCv = null;
function fujiHD() {
  if (_fujiCv) return _fujiCv;
  const K = 4, W = 320 * K, H = 80 * K, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), cx = 202 * K, top = 3 * K, sh = 7 * K, base = 76 * K, half = 205 * K;
  const yAt = u => { const d = clamp((Math.abs(u) - sh) / (half - sh), 0, 1); return top + (base - top) * (1 - Math.pow(1 - d, 1.55)); };
  // Silhouette
  const path = () => { c.beginPath(); c.moveTo(cx - half, base + 4 * K); for (let u = -half; u <= half; u += K) c.lineTo(cx + u, yAt(u) + (Math.abs(u) < sh ? Math.sin(u * 0.4) * 0.6 * K : 0)); c.lineTo(cx + half, base + 4 * K); c.closePath(); };
  path(); c.save(); c.clip();
  let g = c.createLinearGradient(0, top, 0, base); g.addColorStop(0, '#4c5c96'); g.addColorStop(0.45, '#6474aa'); g.addColorStop(1, '#a4b2d4');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  g = c.createLinearGradient(cx - half * 0.5, 0, cx + half * 0.5, 0); g.addColorStop(0, 'rgba(255,240,230,0.20)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(10,16,50,0.22)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);                                         // Sonnenseite links
  // Rinnen/Grate am Hang
  for (let i = -26; i <= 26; i++) {
    const u0 = i * 7 * K + Math.sin(i * 3.1) * 2 * K; if (Math.abs(u0) < sh) continue;
    c.strokeStyle = i % 2 ? 'rgba(30,40,80,0.18)' : 'rgba(255,255,255,0.06)'; c.lineWidth = K * 0.8;
    c.beginPath(); c.moveTo(cx + u0 * 0.25, yAt(u0 * 0.25) + K); c.quadraticCurveTo(cx + u0 * 0.6, yAt(u0 * 0.6), cx + u0, yAt(u0) + 6 * K); c.stroke();
  }
  // Schneekappe mit Zungen, die in den Rinnen hinunterlaufen
  c.beginPath(); c.moveTo(cx - half, 0);
  for (let u = -half; u <= half; u += K) {
    const d = Math.abs(u) / half, tongue = Math.max(0, Math.sin(u / K * 0.55 + 1.3)) ** 3 * 9 * K + Math.max(0, Math.sin(u / K * 1.7)) ** 4 * 4 * K;
    const snowY = yAt(u) + (11 * K - d * 40 * K) + tongue;
    c.lineTo(cx + u, Math.max(yAt(u), Math.min(snowY, top + 21 * K)));
  }
  c.lineTo(cx + half, 0); c.closePath();
  g = c.createLinearGradient(cx - 50 * K, 0, cx + 50 * K, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#f2f6ff'); g.addColorStop(1, '#c4d0ea');
  c.fillStyle = g; c.fill();
  for (let i = -12; i <= 12; i++) {                                                 // Schatten-Rillen im Schnee
    const u0 = i * 5 * K; c.strokeStyle = 'rgba(120,140,190,0.35)'; c.lineWidth = K * 0.6;
    c.beginPath(); c.moveTo(cx + u0 * 0.3, yAt(u0 * 0.3) + K); c.lineTo(cx + u0, yAt(u0) + 8 * K); c.stroke();
  }
  c.restore();
  // Kraterrand
  c.fillStyle = 'rgba(150,160,200,0.6)'; c.fillRect(cx - sh * 0.8, top + K * 0.4, sh * 1.6, K * 0.6);
  // Dunst am Fuss: verschmilzt mit dem Himmel
  g = c.createLinearGradient(0, 30 * K, 0, 62 * K); g.addColorStop(0, 'rgba(250,214,222,0)'); g.addColorStop(1, 'rgba(250,214,222,0.85)');
  path(); c.save(); c.clip(); c.fillStyle = g; c.fillRect(0, 30 * K, W, 50 * K); c.restore();
  return (_fujiCv = cv);
}
/** Fuji + ziehendes Wolkenband – direkt nach dem Himmel zeichnen */
function drawFuji(ctx, t, ox = 0, oy = 0, sc = 1) {
  ctx.drawImage(fujiHD(), ox + 160 * (1 - sc), oy, 320 * sc, 80 * sc);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 6; i++) { const x = ((150 + i * 30 + t * 1.5) % 200) + 100; ctx.beginPath(); ctx.ellipse(ox + 160 + (x - 160) * sc, oy + (24 + Math.sin(i * 1.7) * 1.5) * sc, (14 + (i % 3) * 5) * sc, 2.2 * sc, 0, 0, Math.PI * 2); ctx.fill(); }
}

// ---------- Kirschblüten auf der Strasse ----------
const SAKURA = { key: null, kicked: new Set(), parts: [] };
const PETAL_STEP = 0.3;                                    // Meter zwischen möglichen Blütenplätzen
function sakuraReset() { const k = RACE || ROAM; if (SAKURA.key !== k) { SAKURA.key = k; SAKURA.kicked = new Set(); SAKURA.parts = []; } }
/** Fahrzeuge, die gerade Blüten aufwirbeln: [vorne (m), Länge (m), Spur 0=nah 1=fern, Tempo] */
function sakuraMovers() {
  if (RACE) return [[RACE.pv.x, 4.2, 0, RACE.pv.v], [RACE.ov.x, 4.2, 1, RACE.ov.v]];
  if (ROAM) { const sp = ROAM.rev > 0 ? ROAM.rev : ROAM.veh.v; const m = [[ROAM.x + 2.2, 4.4, 0, sp]]; for (const c of ROAM.traffic) m.push([c.x + 2, 4, 1, Math.abs(c.v)]); return m; }
  return [];
}
function drawSakuraRoad(ctx, W, camX) {
  sakuraReset();
  const movers = sakuraMovers();
  const i0 = Math.floor(camX / PETAL_STEP) - 2, i1 = Math.ceil((camX + RW_ / PPM) / PETAL_STEP) + 2;
  for (let i = i0; i <= i1; i++) for (let lane = 0; lane < 2; lane++) {
    if (hash2(i, 600 + lane) < 0.45) continue;
    const id = i * 2 + lane; if (SAKURA.kicked.has(id)) continue;
    const wx = i * PETAL_STEP + hash2(i, 610 + lane) * PETAL_STEP, y = lane ? 77 + hash2(i, 620) * 17 : 100 + hash2(i, 630) * 25;
    // Wird gerade überfahren? → aufwirbeln
    const mv = movers.find(m => m[2] === lane && m[3] > 1.2 && wx <= m[0] && wx >= m[0] - m[1]);
    if (mv) {
      SAKURA.kicked.add(id);
      const sp = mv[3];
      SAKURA.parts.push({ x: wx, y, vx: -(sp * 0.25 + Math.random() * 5), vy: -(12 + Math.random() * 22 + sp * 0.4), life: 1.6 + Math.random(), max: 2.6, ph: Math.random() * 6, col: hash2(i, 640) > 0.5 ? '#ffb8d8' : '#ff8ab8' });
      continue;
    }
    ctx.fillStyle = hash2(i, 640 + lane) > 0.5 ? '#ffb8d8' : hash2(i, 650) > 0.5 ? '#ff8ab8' : '#ffd8ea';
    ctx.fillRect(W(wx), Math.round(y), hash2(i, 660) > 0.6 ? 2 : 1, 1);
  }
  if (SAKURA.kicked.size > 6000) { const lim = Math.floor((camX - 30) / PETAL_STEP) * 2; for (const id of SAKURA.kicked) if (id < lim) SAKURA.kicked.delete(id); }
}
/** aufgewirbelte Blüten – nach den Autos zeichnen */
function drawSakuraParts(ctx, camX, dt) {
  const P = SAKURA.parts; if (!P.length) return;
  for (const p of P) {
    p.life -= dt; p.x += p.vx * dt; p.vx *= 0.985; p.y += p.vy * dt; p.vy = Math.min(14, p.vy + 30 * dt);
    const sx = Math.round((p.x - camX) * PPM + Math.sin(p.life * 6 + p.ph) * 2);
    ctx.globalAlpha = clamp(p.life / 0.6, 0, 1);
    ctx.fillStyle = p.col; ctx.fillRect(sx, Math.round(p.y), Math.sin(p.life * 9 + p.ph) > 0 ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;
  SAKURA.parts = P.filter(p => p.life > 0 && p.y < 130);
}
