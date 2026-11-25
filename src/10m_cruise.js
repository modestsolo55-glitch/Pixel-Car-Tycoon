/* =============================================================================
   Teil 10m: Cruise-Modus – frei fahren ohne Gegner, Ziel und Zeit.
   Spur wechseln, Verkehr überholen, Automatik oder selbst schalten.
   Nutzt Strecke, Physik, Sound und Zeichnen des Drag Race (RACE.cruise = true).
   ============================================================================= */
const TRAFFIC_IDS = ['hatch3', 'hatch5', 'city', 'sedan', 'wagon', 'mpv', 'suv', 'offroad', 'coupe'];
const TRAFFIC_COLS = ['#f4f4f4', '#1a1c2c', '#94b0c2', '#b13e53', '#3b5dc9', '#38b764', '#8a8e98', '#ef7d57', '#29366f'];
const trafficAng = k => k / 4 * Math.PI * 2;

function startCruise() {
  const m = raceEntry(RSEL.modelId); if (!m) return;
  // Verkehr vorab zeichnen (4 Autos × 4 Radstellungen), damit die Fahrt nicht ruckelt
  const tdesigns = [];
  for (let i = 0; i < 4; i++) {
    const id = TRAFFIC_IDS[(i * 3 + randi(0, 8)) % TRAFFIC_IDS.length];
    tdesigns.push(Object.assign(defaultDesign(), { body: id, cls: BODIES[id].cls, color: pick(TRAFFIC_COLS), rim: 'steel', rimColor: '#c8ccd4', tire: 2, stripe: 'none', sticker: 'none', spoiler: 'none', ride: 0 }));
  }
  tdesigns.forEach(d => { for (let k = 0; k < 4; k++) renderCar(d, { angle: trafficAng(k) }); });
  const pl = { design: m.design, engine: m.engine, name: m.name, brand: m.brand };
  startRace({ player: pl, opp: Object.assign({}, pl, { name: '', react: [0.2, 0.3], skill: 1 }), dist: 'mile', prize: 0, xp: 0, rep: 0, fee: 0, own: true, cruise: true, track: RSEL.track, tod: RSEL.tod });
  const R = RACE;
  Object.assign(R, { D: 1e9, phase: 'cruise', traffic: [], tdesigns, lane: 1, laneF: 1, pY: LANE_NEAR, auto: true, vmax: 0, passed: 0, crashes: 0, nosRefill: 0, spawnT: 1 });
  raceMsg('FREIE FAHRT!', '#a7f070', 3);
  R.pv.x = 0; R.pv.launched = true; R.pv.locked = false; R.ov.x = -1e6;
  R.inp.brake = false;
  const top = $('#race .rtop .hf'); if (top) top.textContent = `${m.name} · CRUISEN · ${_raceBG.T.name}`;
  const q = $('#rquit'); if (q) q.textContent = 'Beenden';
  const ctl = $('#race .rctl'); ctl.classList.add('cr');
  ctl.innerHTML = `<button class="rbtn shift" id="cr-up">SPUR ↑</button><button class="rbtn shift" id="cr-dn">SPUR ↓</button>
    <button class="rbtn clutch" data-hold="brake">BREMSE</button><button class="rbtn gas" data-hold="gas">GAS</button>
    <button class="rbtn shift" id="cr-gd">−</button><button class="rbtn shift" id="cr-gu">+</button>
    <button class="rbtn stage on" id="cr-auto">AUTO</button><button class="rbtn stage" id="cr-horn">HUPE</button><button class="rbtn nos" id="rb-nos">NOS</button>`;
  $$('[data-hold]', ctl).forEach(b => {
    const k = b.dataset.hold;
    const on = e => { e.preventDefault(); RACE.inp[k] = true; b.classList.add('on'); audioStart(); };
    const off = e => { e.preventDefault(); RACE.inp[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  const tap = (id, fn) => $('#' + id).addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
  tap('cr-up', () => cruiseLane(-1)); tap('cr-dn', () => cruiseLane(1));
  tap('cr-gu', () => cruiseShift(1)); tap('cr-gd', () => cruiseShift(-1));
  tap('cr-auto', cruiseAuto); tap('cr-horn', cruiseHorn); tap('rb-nos', raceNos);
  $('#rb-nos').disabled = !R.pc.nos;
}
ACTIONS.cruise = () => startCruise();

function cruiseLane(dir) { const R = RACE; if (!R || !R.cruise) return; const n = clamp(R.lane + dir, 0, 1); if (n !== R.lane) { R.lane = n; popSound(0.05, 1800); const v = R.pv; v.vR = (v.vR || 0) + 2.2; v.vF = (v.vF || 0) + 2.6; } }
function cruiseAuto() {
  const R = RACE; if (!R || !R.cruise || R.pc.E.isEV) return;
  R.auto = !R.auto; const b = $('#cr-auto'); if (b) b.classList.toggle('on', R.auto);
  raceMsg(R.auto ? 'AUTOMATIK' : 'SELBST SCHALTEN', '#73eff7', 1.2);
}
function cruiseShift(dir) {
  const R = RACE; if (!R || !R.cruise || R.pc.E.isEV) return;
  if (R.auto) cruiseAuto();
  raceShift(dir);
}
function cruiseHorn() {
  if (streetAccept()) raceMsg('RENNEN ANGENOMMEN!', '#a7f070', 1);
  if (!AUD || !RACE || RACE.muted) return;
  try {
    const now = AUD.currentTime, g = AUD.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.06, now + 0.02); g.gain.setValueAtTime(0.06, now + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38); g.connect(AUD.destination);
    for (const f of [415, 523]) { const o = AUD.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(g); o.start(now); o.stop(now + 0.4); }
  } catch (e) { /* egal */ }
}
function cruiseKey(e, down) {
  const R = RACE, k = e.key;
  if (k === ' ' || k === 'ArrowRight' || k === 'd' || k === 'D') { R.inp.gas = down; e.preventDefault(); if (down) audioStart(); }
  else if (k === 'ArrowLeft' || k === 'Shift' || k === 'a' || k === 'A') { R.inp.brake = down; e.preventDefault(); }
  else if (!down) return;
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') { cruiseLane(-1); e.preventDefault(); }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { cruiseLane(1); e.preventDefault(); }
  else if (e.repeat) return;
  else if (k === '+' || k === 'e' || k === 'E') cruiseShift(1);
  else if (k === '-' || k === 'q' || k === 'Q') cruiseShift(-1);
  else if (k === 'm' || k === 'M') cruiseAuto();
  else if (k === 'h' || k === 'H') cruiseHorn();
  else if (k === 'n' || k === 'N') raceNos();
  else if (k === 'Escape') endRace(true);
}

function cruiseStep(dt) {
  const R = RACE, pv = R.pv, I = R.inp, E = R.pc.E;
  R.t += dt;
  if (R.msgT > 0) R.msgT -= dt;
  R.shake = Math.max(0, R.shake - dt * 6);
  R.flame.p = Math.max(0, R.flame.p - dt);
  pv.step(dt, { thr: I.gas && !I.brake ? 1 : 0, clutch: false });
  R.brakeF = clamp((R.brakeF || 0) + (I.brake ? dt * 4 : -dt * 8), 0, 1);                  // Bremsdruck baut sich auf
  if (R.brakeF > 0) pv.v = Math.max(0, pv.v - 9.5 * R.brakeF * dt);
  else if (!I.gas) pv.v = Math.max(0, pv.v - 0.5 * dt);                        // Motorbremse
  // Automatik: hoch bei hoher Drehzahl, runter wenn der Motor zu tief dreht
  if (R.auto && !E.isEV && pv.shiftT <= 0) {
    if (I.gas && pv.rpm >= E.red * 0.92 && pv.gear < E.ratios.length) { pv.shiftUp(); R.flame.p = 0.1; fxExhaust('p', 'pop'); if (E.ind === 'turbo' || E.ind === 'twin') blowOff(); }
    else if (pv.gear > 1 && pv.rpm < E.red * (I.gas ? 0.42 : 0.28)) pv.shiftDown();
  }
  // weicher Spurwechsel
  R.laneV = (R.laneV || 0) + ((R.lane - R.laneF) * 34 - (R.laneV || 0) * 10) * dt;        // Spurwechsel mit Masse (S-Kurve)
  R.laneF = clamp(R.laneF + R.laneV * dt, -0.08, 1.08);
  R.pY = lerp(LANE_FAR, LANE_NEAR, R.laneF);
  R.vmax = Math.max(R.vmax, pv.v * 3.6);
  // NOS füllt sich 20 s nach dem Verbrauch wieder auf
  if (R.pc.nos && pv.nosUsed && pv.nosT <= 0) { R.nosRefill += dt; if (R.nosRefill > 20) { pv.nosUsed = false; R.nosRefill = 0; raceMsg('NOS AUFGEFÜLLT', '#73eff7', 1.2); } }
  cruiseTraffic(dt);
  cruisePlusStep(dt);
  suspStep(pv, dt, { idle: pv.v < 0.5 && I.gas ? 0.4 : 0 });
  if (pv.slip > 0.25 && pv.v < 60) emitSmoke('p', pv.slip);
  fxStep(R, dt);
}

/** Verkehr: langsamere Autos auf beiden Spuren, die man überholen kann */
function cruiseTraffic(dt) {
  const R = RACE, pv = R.pv;
  for (const c of R.traffic) {                                         // nicht in den Vordermann fahren
    const front = R.traffic.filter(o => o !== c && o.lane === c.lane && o.x > c.x).sort((a, b) => a.x - b.x)[0];
    if (front && front.x - front.len - c.x < 3) c.v = Math.min(c.v, front.v);
    c.x += c.v * dt;
  }
  R.traffic = R.traffic.filter(c => c.x > pv.x - 40 && c.x < pv.x + 300);
  R.spawnT -= dt;
  if (R.traffic.length < 4 && R.spawnT <= 0 && pv.v > 3 && !(R.street && ['count', 'race'].includes(R.street.st))) {
    const lane = Math.random() < 0.5 ? 0 : 1, x = pv.x + rand(30, 70);
    if (!R.traffic.some(c => c.lane === lane && Math.abs(c.x - x) < 18)) {
      const d = pick(R.tdesigns), s = renderCar(d, { angle: 0 });
      R.traffic.push({ x, lane, v: rand(12, 24), d, len: s.L / PPM, passed: false });
    }
    R.spawnT = rand(1.2, 3.5);
  }
  for (const c of R.traffic) {
    const rear = c.x - c.len;
    if (!c.passed && pv.x - (R.sprites.p ? R.sprites.p.L / PPM : 4.5) > c.x) { c.passed = true; R.passed++; }
    if (Math.abs(c.lane - R.laneF) > 0.45) continue;
    if (pv.x > rear && pv.x < c.x && pv.v > c.v) {                                 // aufgefahren
      const dv = pv.v - c.v;
      pv.v = Math.max(0, c.v - 1); pv.x = rear - 0.05;
      R.shake = Math.min(5, 1 + dv * 0.3); R.crashes++;
      raceMsg(dv > 8 ? 'CRASH!' : 'ANGESTUPST!', '#ff4b55', 1); popSound(0.25, 260);
    }
  }
}

/** Autos nach Spur sortiert zeichnen (hintere Spur zuerst) */
function cruiseDrawCars(ctx, W, camX, sh) {
  const R = RACE, items = [];
  for (const c of R.traffic) items.push({ y: c.lane ? LANE_NEAR : LANE_FAR, f: () => {
    const k = Math.floor((((c.x / 0.31) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 4) % 4;
    const s = renderCar(c.d, { angle: trafficAng(k) }), gy = c.lane ? LANE_NEAR : LANE_FAR;
    const x0 = W(c.x) - (s.ox + s.L);
    if (x0 > RW_ + 10 || x0 + s.W < -10) return;
    if (_raceBG.T.night) ctx.filter = 'brightness(0.55) saturate(0.8)';
    ctx.drawImage(s.cv, x0, gy - s.gy, s.W, s.H); ctx.filter = 'none';
    if (_raceBG.T.night || _raceBG.T.lights) { ctx.fillStyle = 'rgba(255,60,80,0.8)'; ctx.fillRect(x0 + s.ox - 1, gy - 7, 2, 2); }
  } });
  items.push({ y: R.pY + 0.01, f: () => { drawRaceCar(ctx, 'p', R.pv, W(R.pv.x), Math.round(R.pY * 2) / 2); drawSmoke(ctx, 'p', camX, sh); } });
  cruisePlusCars(items, ctx, W, camX, sh);
  items.sort((a, b) => a.y - b.y).forEach(i => i.f());
}
