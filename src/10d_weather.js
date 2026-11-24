/* =============================================================================
   Teil 10d: Wetter-Effekte im Rennen
   Regen: zwei Regenschichten mit Wind, Wolken, Blitze mit Donner, Pfützen mit
   Ringen, spiegelnde Lichter auf nassem Asphalt, Gischt hinter den Reifen,
   Tropfen auf der „Kameralinse“. Schnee: Pulverschnee hinter den Reifen,
   Windböen. Vulkan: Ausbrüche mit Lava-Brocken und Glutfunken.
   ============================================================================= */

// ---------- Donner ----------
function thunderSound(dist) {
  if (!AUD || !RACE || RACE.muted) return;
  try {
    const now = AUD.currentTime + dist, s = AUD.createBufferSource(), f = AUD.createBiquadFilter(), g = AUD.createGain();
    s.buffer = noiseBuffer(); s.loop = true; f.type = 'lowpass'; f.frequency.value = 180 + Math.random() * 120;
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.5, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
    s.connect(f); f.connect(g); g.connect(AUD.destination); s.start(now); s.stop(now + 2.8);
  } catch (e) { /* kein Ton */ }
}

// ---------- vor den Autos: nasser Asphalt, Pfützen, Lichtspiegelungen ----------
function drawWetRoad(ctx, W, camX) {
  const R = RACE, t = R.t;
  // Spiegelnde Lichtstreifen der Hafenlaternen auf dem Asphalt
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = Math.floor(camX / 26) - 1; i < camX / 26 + RW_ / PPM / 26 + 1; i++) {
    const x = W(i * 26 + 9);
    for (let y = 76; y < 125; y += 2) {
      if (y >= 95 && y < 98) continue;
      const wob = Math.round(Math.sin(t * 6 + y * 0.7 + i) * 1.5);
      const a = 0.1 * (1 - Math.abs(y - 100) / 40);
      ctx.fillStyle = `rgba(255,214,140,${Math.max(0, a).toFixed(3)})`; ctx.fillRect(x + wob - 1, y, 3, 1);
    }
  }
  ctx.restore();
  // Pfützen (feste Plätze auf der Strecke) mit Ringen von Regentropfen
  for (let i = Math.floor(camX / 17) - 1; i < camX / 17 + RW_ / PPM / 17 + 1; i++) {
    if (hash2(i, 77) < 0.45) continue;
    const near = hash2(i, 78) > 0.5, x = W(i * 17 + hash2(i, 79) * 10), y = near ? 108 + Math.round(hash2(i, 80) * 12) : 80 + Math.round(hash2(i, 81) * 10);
    const w = 14 + Math.round(hash2(i, 82) * 16);
    ctx.fillStyle = 'rgba(20,34,60,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, w / 2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,180,230,0.22)'; ctx.fillRect(x - w / 2 + 3, y - 1, w - 8, 0.5);
    for (let k = 0; k < 2; k++) {
      const ph = ((t * 1.6 + hash2(i, 83 + k) * 5) % 1), rx = 1 + ph * 6;
      ctx.strokeStyle = `rgba(200,225,255,${(0.5 * (1 - ph)).toFixed(3)})`; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.ellipse(x + (hash2(i, 85 + k) - 0.5) * w * 0.6, y, rx, rx * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

// ---------- Gischt / Pulverschnee hinter den Hinterrädern ----------
function sprayEmit(R, who, v, s, x0, y0) {
  const T = _raceBG.T; if (!(T.wet || T.snow) || v.v < 2) return;
  R.spray = R.spray || [];
  const rw = s.wheels[0], wx = x0 + rw.x - rw.r * 0.6, wy = y0 + rw.y + rw.r - 1;
  const n = Math.min(6, Math.floor(v.v / 9) + (Math.random() < (v.v % 9) / 9 ? 1 : 0)) + (v.slip > 0.2 ? 3 : 0);
  for (let i = 0; i < n; i++) R.spray.push({ x: wx + Math.random() * 3, y: wy - Math.random() * 2, vx: -(10 + Math.random() * 25) - v.v * 0.35, vy: -(8 + Math.random() * 22), life: 0.35 + Math.random() * 0.35, max: 0.7, snow: !!T.snow, mist: Math.random() < 0.35 });
  if (R.spray.length > 420) R.spray.splice(0, R.spray.length - 420);
}
function drawSpray(ctx) {
  const R = RACE; if (!R.spray || !R.spray.length) return;
  const dt = clamp(R.t - (R.sprayT == null ? R.t : R.sprayT), 0, 0.05); R.sprayT = R.t;
  for (const p of R.spray) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 70 * dt; p.vx *= 0.97;
    const a = clamp(p.life / p.max, 0, 1);
    if (p.mist) { ctx.globalAlpha = a * 0.22; ctxDisc(ctx, p.x, p.y, 1.5 + (1 - a) * 4, p.snow ? '#ffffff' : '#c8dcf0'); }
    else { ctx.globalAlpha = a * 0.85; ctx.fillStyle = p.snow ? '#ffffff' : '#b8d4f0'; ctx.fillRect(Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2, 1, 0.5); }
  }
  ctx.globalAlpha = 1;
  R.spray = R.spray.filter(p => p.life > 0);
}

// ---------- nach der Szene: Regen, Blitze, Linsentropfen ----------
function drawRain(ctx, camX) {
  const R = RACE, t = R.t;
  // Wolkenbänder, die über den Himmel ziehen
  for (let i = 0; i < 7; i++) {
    const x = ((hash2(i, 31) * (RW_ + 120) - t * (4 + i) - camX * PPM * 0.03) % (RW_ + 120) + RW_ + 120) % (RW_ + 120) - 60;
    ctx.fillStyle = 'rgba(30,36,52,0.45)'; ctx.beginPath(); ctx.ellipse(x, 6 + hash2(i, 32) * 18, 40 + hash2(i, 33) * 30, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(18,26,44,0.26)'; ctx.fillRect(0, 0, RW_, HUD_Y);
  // Blitz: zufällig alle 5–11 s, doppeltes Aufflackern, Donner kommt verzögert
  if (R.boltNext == null) R.boltNext = t + 2.5 + Math.random() * 4;
  if (t >= R.boltNext) { R.boltT = t; R.boltX = 30 + Math.random() * (RW_ - 60); R.boltSeed = Math.random() * 1000; R.boltNext = t + 5 + Math.random() * 6; thunderSound(0.25 + Math.random() * 0.8); }
  const bt = R.boltT != null ? t - R.boltT : 99;
  const flash = bt < 0.6 ? Math.max(0, (bt < 0.08 ? 1 : bt < 0.14 ? 0.25 : bt < 0.22 ? 0.85 : 1 - (bt - 0.22) / 0.38)) : 0;
  if (flash > 0.3 && bt < 0.3) {
    ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.shadowColor = '#a8d0ff'; ctx.shadowBlur = 6;
    ctx.beginPath(); let x = R.boltX, y = 0; ctx.moveTo(x, y);
    for (let k = 0; k < 9; k++) { x += (hash2(R.boltSeed, k) - 0.5) * 14; y += 4 + hash2(R.boltSeed, k + 20) * 3; ctx.lineTo(x, y); if (k === 4) { ctx.moveTo(x, y); ctx.lineTo(x + 9, y + 8); ctx.moveTo(x, y); } }
    ctx.stroke(); ctx.restore();
  }
  // Regen: hinten fein und langsamer, vorne lange schräge Striche
  const wind = 0.28;
  ctx.fillStyle = 'rgba(170,200,235,0.35)';
  for (let i = 0; i < 90; i++) {
    const y = (hash2(i, 2) * 150 + t * 190) % 150 - 12, x = ((hash2(i, 1) * RW_ - y * wind - t * 40 + camX * PPM * 0.2) % RW_ + RW_) % RW_;
    ctx.fillRect(Math.round(x), Math.round(y), 0.5, 3);
  }
  ctx.fillStyle = 'rgba(205,225,250,0.6)';
  for (let i = 0; i < 110; i++) {
    const y = (hash2(i, 12) * 150 + t * 330) % 150 - 12, x = ((hash2(i, 11) * RW_ - y * wind - t * 70 + camX * PPM * 0.45) % RW_ + RW_) % RW_;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 3); ctx.fillRect(Math.round(x - 1), Math.round(y + 3), 1, 3);
  }
  // Aufspritzende Tropfen auf der Fahrbahn
  for (let i = 0; i < 34; i++) {
    const ph = (t * 3 + hash2(i, 40)) % 1, cyc = Math.floor(t * 3 + hash2(i, 40));
    const x = Math.round(hash2(i, cyc) * RW_), y = hash2(i + 50, cyc) > 0.5 ? 78 + Math.round(hash2(i + 60, cyc) * 16) : 99 + Math.round(hash2(i + 70, cyc) * 25);
    if (ph > 0.35) continue;
    const sp = ph / 0.35;
    ctx.fillStyle = `rgba(220,235,255,${(0.8 * (1 - sp)).toFixed(2)})`;
    ctx.fillRect(x - Math.round(sp * 2), y - Math.round(sp * 2), 1, 1); ctx.fillRect(x + Math.round(sp * 2), y - Math.round(sp * 2), 1, 1); ctx.fillRect(x, y - Math.round(sp * 3), 1, 1);
  }
  // Blitz erhellt die ganze Szene
  if (flash > 0) { ctx.fillStyle = `rgba(225,235,255,${(flash * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, RW_, HUD_Y); }
  // Tropfen auf der Kameralinse: laufen langsam herunter
  for (let i = 0; i < 7; i++) {
    const life = (t * (0.08 + hash2(i, 90) * 0.06) + hash2(i, 91)) % 1, cyc = Math.floor(t * (0.08 + hash2(i, 90) * 0.06) + hash2(i, 91));
    const x = 10 + hash2(i, cyc + 100) * (RW_ - 20), y = 4 + hash2(i, cyc + 200) * 50 + life * life * 50, r = 1.5 + hash2(i, 92) * 2;
    ctx.fillStyle = 'rgba(200,220,255,0.13)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - r * 0.4, y - r * 0.5, 0.5, 0.5);
    if (life > 0.25) { ctx.fillStyle = 'rgba(200,220,255,0.08)'; ctx.fillRect(x - 0.5, y - life * 30, 1, life * 30); }
  }
}

// ---------- Schnee: Windböen ----------
function drawSnowGusts(ctx, camX) {
  const t = RACE.t, g = Math.max(0, Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1));
  if (g < 0.2) return;
  ctx.fillStyle = `rgba(255,255,255,${(g * 0.35).toFixed(2)})`;
  for (let i = 0; i < 40; i++) {
    const x = ((hash2(i, 5) * RW_ - t * (140 + i * 2) + camX * PPM * 0.5) % RW_ + RW_) % RW_, y = 20 + hash2(i, 6) * 100;
    ctx.fillRect(Math.round(x), Math.round(y), 6 + Math.round(g * 8), 0.5);
  }
}

// ---------- Vulkan: Ausbrüche ----------
function drawEruption(ctx, camX) {
  const R = RACE, t = R.t;
  if (R.eruptNext == null) R.eruptNext = t + 3 + Math.random() * 4;
  R.lava = R.lava || [];
  const vx = Math.round(-((camX * PPM * 0.05) % RW_)) + 200;
  if (t >= R.eruptNext) {
    R.eruptNext = t + 9 + Math.random() * 8; R.eruptT = t; R.shake = Math.max(R.shake, 2.5);
    for (let i = 0; i < 46; i++) R.lava.push({ x: vx, y: 14, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, life: 1.4 + Math.random(), max: 2.4 });
    if (AUD && !R.muted) thunderSound(0.05);
  }
  const dt = clamp(t - (R.lavaT == null ? t : R.lavaT), 0, 0.05); R.lavaT = t;
  for (const p of R.lava) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 55 * dt;
    ctx.fillStyle = p.life > 1.2 ? '#fff0a0' : p.life > 0.6 ? '#ffcd75' : '#ef7d57';
    ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    for (const ox of [RW_, -RW_]) if (p.x + ox > 0 && p.x + ox < RW_) ctx.fillRect(Math.round(p.x + ox), Math.round(p.y), 1, 1);
  }
  R.lava = R.lava.filter(p => p.life > 0 && p.y < 70);
  // Glühen am Horizont nach dem Ausbruch
  const eb = R.eruptT != null ? t - R.eruptT : 99;
  if (eb < 2) { ctx.fillStyle = `rgba(255,120,40,${(0.22 * (1 - eb / 2)).toFixed(3)})`; ctx.fillRect(0, 0, RW_, 70); }
  // Glutfunken von der heissen Fahrbahn
  for (let i = 0; i < 18; i++) {
    const ph = (t * 0.6 + hash2(i, 300)) % 1, x = ((hash2(i, 301) * RW_ + camX * PPM * 0.9) % RW_ + RW_) % RW_ - ph * 10, y = 124 - ph * 50;
    ctx.fillStyle = `rgba(255,${Math.round(140 + 80 * (1 - ph))},60,${(0.8 * (1 - ph)).toFixed(2)})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}
