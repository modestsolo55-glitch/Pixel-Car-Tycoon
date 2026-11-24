/* =============================================================================
   Teil 10k: Kino-Modus (Leerlauf-Szenen)
   Nach einer Weile ohne Eingabe steht das gewählte Auto an einem der Orte –
   Tag oder Nacht – und die Kamera zeigt wechselnde Einstellungen: Totale,
   Nahaufnahme von Front, Rad und Heck, langsame Fahrten und Zooms. Mit
   Kinobalken, Einblendungen und den Animationen des Ortes.
   Jede Eingabe (Maus, Taste, Tippen) beendet den Kino-Modus.
   ============================================================================= */
let CUT = null, _lastInput = performance.now();
const CUT_IDLE_MS = 60000, SHOT_LEN = 5.2;
const cinemaOn = () => { try { return localStorage.getItem('at_cinema') !== '0'; } catch (e) { return true; } };
['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { _lastInput = performance.now(); if (CUT && performance.now() - CUT.started > 1500) cinemaStop(); }, { passive: true, capture: true }));

/** wird aus der Hauptschleife aufgerufen */
function cinemaCheck() {
  if (CUT || RACE || !S || !cinemaOn() || document.hidden) return;
  if (!$('#modal').classList.contains('hidden') || $('#login') && !$('#login').classList.contains('hidden')) return;
  if (performance.now() - _lastInput > CUT_IDLE_MS) cinemaStart();
}
function cinemaCar() {
  const id = (typeof REVSEL !== 'undefined' && REVSEL.design && REVSEL.design !== 'draft') ? REVSEL.design : RSEL.modelId;
  const e = raceEntry(id) || raceEntry(S.models[0].id);
  return e ? { design: e.design, engine: e.engine, name: e.name, brand: e.brand || S.company } : { design: S.draft, engine: getEngine(S.draft.engineId), name: S.draft.name, brand: S.company };
}
function cinemaStart() {
  const tracks = Object.keys(TRACKS).filter(k => S.level >= (TRACKS[k].lvl || 1));
  const car = cinemaCar();
  const el = document.createElement('div'); el.id = 'cinema';
  el.innerHTML = `<canvas id="cinecv" width="320" height="180"></canvas><div class="cinehint">Kino-Modus · beliebige Taste oder Klick zum Weiterspielen</div>`;
  document.body.appendChild(el);
  CUT = { car, tracks, t: 0, shot: -1, shotT: 0, started: performance.now(), last: performance.now(), raf: 0, puffs: [] };
  cinemaNextShot();
  CUT.raf = requestAnimationFrame(cinemaLoop);
}
function cinemaStop() {
  if (!CUT) return;
  cancelAnimationFrame(CUT.raf); CUT = null;
  const el = $('#cinema'); if (el) el.remove();
  _lastInput = performance.now();
}
const SHOTS = ['wide', 'front', 'wheel', 'pan', 'rear', 'sky', 'low'];
function cinemaNextShot() {
  const C = CUT;
  C.shot++; C.shotT = 0;
  // alle zwei Einstellungen ein neuer Ort (Tag oder Nacht)
  if (C.shot % 2 === 0) {
    C.track = C.tracks[Math.floor(Math.random() * C.tracks.length)];
    C.tod = Math.random() < 0.45 ? 'night' : 'day';
    const key = C.track + '|' + C.tod;
    C.bg = _raceBGCache[key] || (_raceBGCache[key] = buildRaceBG(C.track, C.tod));
    C.x = 40 + Math.random() * 120;                                              // Standort auf der Strecke (Meter)
  }
  C.type = SHOTS[(C.shot * 3 + Math.floor(Math.random() * 3)) % SHOTS.length];
}
function cinemaLoop(now) {
  const C = CUT; if (!C) return;
  C.raf = requestAnimationFrame(cinemaLoop);
  const dt = clamp((now - C.last) / 1000, 0, 0.05); C.last = now; C.t += dt; C.shotT += dt;
  if (C.shotT > SHOT_LEN) cinemaNextShot();
  try { cinemaDraw(); } catch (e) { if (!C.err) { C.err = 1; console.error('Kino:', e); } }
}
function cinemaDraw() {
  const C = CUT, cv = $('#cinecv'); if (!cv) return;
  const ctx = hdCtx(cv), bg = C.bg, T = bg.T, TH = THEMES[T.scene], t = C.t, st = C.shotT / SHOT_LEN, night = T.night;
  const s = renderCar(C.car.design, { lights: !!(night || T.lights), brake: false, exh: C.car.engine.exh, brand: C.car.brand });
  const groundY = LANE_NEAR, carFront = 190;                                      // Auto steht in der nahen Spur
  const x0 = carFront - (s.ox + s.L), y0 = groundY - s.gy;
  // Kamera je Einstellung: Zoom + Brennpunkt (logische Pixel), sanft animiert
  const ease = v => v * v * (3 - 2 * v);
  let z = 1, fx = 160, fy = 90, pan = 0;
  const cxCar = x0 + s.W / 2, cyCar = y0 + s.H / 2;
  switch (C.type) {
    case 'wide':  z = 1.05 + 0.08 * st; fx = cxCar; fy = 92; pan = -12 + 24 * ease(st); break;
    case 'front': z = 2.6 - 0.25 * st; fx = x0 + s.W - 14; fy = cyCar + 2; break;
    case 'wheel': z = 3.2 + 0.2 * st; fx = x0 + s.wheels[1].x; fy = y0 + s.wheels[1].y - 1; break;
    case 'pan':   z = 1.9; fx = x0 + 10 + (s.W - 20) * ease(st); fy = cyCar; break;
    case 'rear':  z = 2.5 + 0.2 * st; fx = x0 + 14; fy = cyCar + 3; break;
    case 'sky':   z = 1.0; fx = 160; fy = 90 - 20 * (1 - ease(st)); break;
    case 'low':   z = 1.5 + 0.35 * ease(st); fx = cxCar; fy = cyCar + 6; break;
  }
  const camX = C.x - 170 / PPM + pan / PPM, W = x => Math.round((x - camX) * PPM);
  ctx.save();
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, RW_, RH_);
  ctx.translate(160, 90); ctx.scale(z, z); ctx.translate(-clamp(fx, 160 / z, 320 - 160 / z), -clamp(fy, 90 / z, 180 - 90 / z));
  // Szene (wie im Rennen, aber ohne Tribünen-Gewusel und HUD)
  ctx.drawImage(bg.sky, 0, 0);
  if (TH && TH.landmark) { if (night) ctx.filter = 'brightness(0.4) saturate(0.75)'; TH.landmark(ctx, t); ctx.filter = 'none'; }
  const sl = -((camX * PPM * 0.05) % RW_);
  ctx.drawImage(bg.skyline, Math.round(sl), 10); ctx.drawImage(bg.skyline, Math.round(sl) + RW_, 10);
  const stand = T.town ? bg.stands[night ? 1 : 0] : bg.stands[Math.floor(t * 2) % 2], so = -((camX * PPM * 0.35) % 192);
  for (let x = Math.round(so) - 192; x < RW_ + 192; x += 192) ctx.drawImage(stand, x, 34);
  const TW = T.wall; ctx.fillStyle = TW[0]; ctx.fillRect(-40, 66, RW_ + 80, 9); ctx.fillStyle = TW[1]; ctx.fillRect(-40, 66, RW_ + 80, 1); ctx.fillStyle = TW[2]; ctx.fillRect(-40, 74, RW_ + 80, 1);
  const ao = -(((camX * PPM) % 64) + 64) % 64;
  for (let x = Math.round(ao) - 128; x < RW_ + 64; x += 64) { ctx.drawImage(bg.asph, x, 75, 64, 20); ctx.drawImage(bg.asph, x, 98, 64, 28); ctx.drawImage(bg.asph, x, 126, 64, 54); }
  ctx.fillStyle = '#c8ccd4'; ctx.fillRect(-40, 95, RW_ + 80, 2);
  for (let i = Math.floor(camX / 4) - 2; i < camX / 4 + RW_ / PPM / 4 + 2; i++) { ctx.fillStyle = '#e8d44d'; ctx.fillRect(W(i * 4), 124, 18, 1); }
  if (night) {
    ctx.fillStyle = 'rgba(4,6,20,0.42)'; ctx.fillRect(-40, 30, RW_ + 80, 160);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = Math.floor(camX / 40) - 1; i < camX / 40 + RW_ / PPM / 40 + 1; i++) { const x = W(i * 40 + 20); ctx.fillStyle = '#3a3e48'; ctx.fillRect(x, 26, 2, 40); ctx.drawImage(lightCone('flood'), x + 1 - 30, 26, 60, 130); }
    ctx.restore();
  }
  if (TH && TH.front) { if (night) ctx.filter = 'brightness(0.55) saturate(0.85)'; TH.front(ctx, W, camX, t); ctx.filter = 'none'; }
  // Spiegelung + Schatten + Auto (leichtes Leerlauf-Zittern)
  const bob = Math.sin(t * 38) * 0.15;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x0 + s.ox + s.L / 2, groundY + 0.5, s.L * 0.55, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.globalAlpha = night ? 0.22 : 0.14; ctx.translate(0, groundY * 2); ctx.scale(1, -1); ctx.drawImage(s.cv, x0, y0, s.W, s.H); ctx.restore();
  ctx.drawImage(s.cv, x0, y0 + bob, s.W, s.H);
  if (night || T.lights) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hy = y0 + s.gy - Math.round(BODIES[C.car.design.body].head[1] + (C.car.design.ride | 0) + 1); ctx.drawImage(lightCone('head'), x0 + s.ox + s.L, hy - 16, 70, 32); ctx.restore(); }
  // Abgas im Leerlauf
  if (Math.random() < 0.18) C.puffs.push({ x: x0 + s.exhaust.x, y: y0 + s.exhaust.y, r: 0.6, life: 1.6 });
  for (const p of C.puffs) { p.life -= 1 / 60; p.x -= 0.18; p.y -= 0.05; p.r += 0.035; ctx.fillStyle = `rgba(210,214,222,${(0.28 * p.life / 1.6).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
  C.puffs = C.puffs.filter(p => p.life > 0);
  if (TH && TH.ambient) TH.ambient(ctx, camX, t);
  // Lichtreflex über den Lack (Nahaufnahmen)
  if (['front', 'pan', 'rear', 'low'].includes(C.type)) {
    const gx = x0 + ((t * 18) % (s.W + 40)) - 20;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.moveTo(gx, y0); ctx.lineTo(gx + 5, y0); ctx.lineTo(gx - 3, y0 + s.H); ctx.lineTo(gx - 8, y0 + s.H); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  // Vignette + Kinobalken + Einblendungen + Überblendung
  const vg = ctx.createRadialGradient(160, 90, 60, 160, 90, 200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, RW_, RH_);
  const bar = 18 * clamp(C.t / 1.2, 0, 1); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, RW_, bar); ctx.fillRect(0, RH_ - bar, RW_, bar);
  const capA = clamp(Math.min(C.shotT - 0.6, SHOT_LEN - 0.6 - C.shotT) / 0.6, 0, 1);
  if (capA > 0 && C.shot % 2 === 0) {
    ctx.globalAlpha = capA;
    cxText(ctx, C.car.name.toUpperCase(), 14, RH_ - 34, '#ffffff', 2, 'l', '#000');
    cxText(ctx, (T.name.replace(' – ', ' - ') + '  -  ' + (night ? 'NACHT' : 'TAG')).toUpperCase(), 14, RH_ - 22, '#ffcd75', 1, 'l', '#000');
    ctx.globalAlpha = 1;
  }
  const fade = Math.max(clamp(1 - C.shotT / 0.5, 0, 1), clamp((C.shotT - (SHOT_LEN - 0.45)) / 0.45, 0, 1));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fade.toFixed(3)})`; ctx.fillRect(0, 0, RW_, RH_); }
}
ACTIONS.cinemaNow = () => { closeModal(); setTimeout(() => { _lastInput = performance.now(); cinemaStart(); }, 50); };
ACTIONS.cinemaToggle = () => { try { localStorage.setItem('at_cinema', cinemaOn() ? '0' : '1'); } catch (e) { /* egal */ } ACTIONS.gameMenu(); };
