/* =============================================================================
   Teil 10p: Cruisen mit Inhalt
   - Strassenrennen: ein Herausforderer fährt neben dich – HUPEN = annehmen,
     3-2-1, dann 400 m bis zur Ziellinie
   - Polizei: wer zu lange zu schnell fährt, wird verfolgt – anhalten (Strafzettel)
     oder abhängen (Erfahrung)
   - Tuner-Treffpunkte am Strassenrand: langsam vorbeifahren bringt Ruf
   - Tag und Nacht wechseln während der Fahrt (4 Minuten pro Tag)
   ============================================================================= */
const CRUISE_DAY = 240;                                     // Sekunden pro Tag-Nacht-Zyklus
const POLICE_DESIGN = () => oppDesign('family', 'sedan', '#f4f4f4', '#1a1c2c', { stripe: 'twotone', rim: 'steel', rimColor: '#c8ccd4', tire: 2, tint: 3 });

/** beim Start des Cruisens: Zustand, beide Tageszeit-Kulissen vorbereiten */
function cruisePlusInit(R) {
  const trk = R.cfg.track, todNow = trackIsNight(trk, R.cfg.tod) ? 'night' : 'day';
  for (const tod of ['day', 'night']) { const k = trk + '|' + tod; if (!_raceBGCache[k]) _raceBGCache[k] = buildRaceBG(trk, tod); }
  Object.assign(R, { cyc: todNow === 'night' ? 0.62 : 0.08, cycTod: todNow, street: null, nextOffer: 25 + Math.random() * 20, police: null, speedT: 0,
    nextMeet: 700 + Math.random() * 500, meetDone: {}, overlayA: 0 });
  // Scheinwerfer-Version des eigenen Autos im Hintergrund vorbereiten (kein Ruckeln beim Wechsel)
  setTimeout(() => { if (RACE !== R) return; for (const br of [false, true]) { const [d, o] = raceCarArgs(R, 'p', 0, br); const L = carLayers(d, Object.assign({}, o, { lights: !o.lights })); for (let k = 0; k < 16; k += 4) carWheelLayer(L, k); } }, 800);
}
const cruiseLimit = () => (_raceBG.T.town ? 120 : 170);

// ---------- pro Schritt ----------
function cruisePlusStep(dt) {
  const R = RACE, pv = R.pv;
  if (R.cyc == null) cruisePlusInit(R);
  // Tag und Nacht
  R.cyc = (R.cyc + dt / CRUISE_DAY) % 1;
  const c = R.cyc, wantNight = c >= 0.5 && c < 0.95;
  const tod = wantNight ? 'night' : 'day';
  if (tod !== R.cycTod) { R.cycTod = tod; _raceBG = _raceBGCache[R.cfg.track + '|' + tod]; raceMsg(tod === 'night' ? 'DIE NACHT BRICHT AN' : 'EIN NEUER TAG', '#ffcd75', 2); }
  R.overlayA = c >= 0.4 && c < 0.5 ? (c - 0.4) / 0.1 * 0.55 : c >= 0.5 && c < 0.55 ? (0.55 - c) / 0.05 * 0.55 : c >= 0.9 && c < 0.95 ? (c - 0.9) / 0.05 * 0.45 : c >= 0.95 ? (1 - c) / 0.05 * 0.45 : 0;
  streetStep(R, dt);
  policeStep(R, dt);
  // Treffpunkt: langsam vorbeifahren
  const mx = R.nextMeet;
  if (pv.x > mx && pv.x < mx + 60 && !R.meetDone[mx] && pv.v * 3.6 < 35) {
    R.meetDone[mx] = true;
    const car = R.pc, rep = clamp(car.style / 100, 0.2, 1) * 1.2;
    addRep(rep); addXP(30 + Math.round(car.style / 3));
    raceMsg('DIE SZENE FEIERT DEIN AUTO!', '#ff6ac1', 2.2); sfx('goal');
  }
  if (pv.x > mx + 200) R.nextMeet = pv.x + 1800 + Math.random() * 1400;
}

// ---------- Strassenrennen ----------
function streetStep(R, dt) {
  const pv = R.pv;
  if (!R.street) {
    if (R.t > R.nextOffer && pv.v > 8 && !R.police) {
      // Herausforderer passend zum eigenen Auto: die drei mit der ähnlichsten 1/4-Meilen-Zeit
      const myT = R.pc.t14 || 16, pool = OPPONENTS.filter(o => o.lvl <= S.level + 3).map(o => ({ o, d: Math.abs(computeCar(o.design, o.engine).t14 - myT) })).sort((a, b) => a.d - b.d).slice(0, 3);
      const o = (pick(pool.length ? pool : [{ o: OPPONENTS[0] }])).o;
      R.cfg.opp = { design: o.design, engine: o.engine, name: o.name, brand: o.brand, react: o.react, skill: o.skill };
      R.oc = computeCar(o.design, o.engine);
      const ov = R.ov = new Vehicle(R.oc); ov.launched = true; ov.locked = true; ov.x = pv.x - 14; ov.v = pv.v + 4; ov.gear = Math.max(1, pv.gear);
      const lane = R.lane === 1 ? pick([0, 2]) : 1;                              // Herausforderer kommt auf der Nachbarspur
      R.street = { st: 'approach', lane, o, t: 0 };
      R.traffic = R.traffic.filter(cc => cc.lane !== lane);
    }
    return;
  }
  const s = R.street, ov = R.ov;
  s.t += dt;
  const matchSpeed = () => { ov.v += clamp(pv.v - ov.v, -6 * dt, 6 * dt); ov.x += ov.v * dt; };
  if (s.st === 'approach') {
    ov.v = pv.v + 4; ov.x += ov.v * dt;
    if (ov.x >= pv.x - 0.5) { s.st = 'offer'; s.t = 0; raceMsg('HERAUSFORDERUNG! HUPEN = ANNEHMEN', '#ff6ac1', 5); popSound(0.12, 900); }
  } else if (s.st === 'offer') {
    matchSpeed();
    if (s.t > 7) { s.st = 'leave'; raceMsg(s.o.name.toUpperCase() + ' FÄHRT WEITER', '#94b0c2', 1.6); }
  } else if (s.st === 'count') {
    matchSpeed(); ov.x = pv.x + (ov.x - pv.x) * 0.95;
    const n = 3 - Math.floor(s.t);
    if (n !== s.lastN && n > 0) { s.lastN = n; raceMsg(String(n), '#ffcd75', 0.8); popSound(0.1, 700); }
    if (s.t >= 3) { s.st = 'race'; s.t = 0; s.target = Math.max(pv.x, ov.x) + 400; raceMsg('LOS!', '#a7f070', 1); popSound(0.15, 1200); R.shake = 2; }
  } else if (s.st === 'race') {
    ov.step(dt, { thr: ov.slip > 0.3 ? 0.8 : 1, clutch: false });
    if (!ov.c.E.isEV && ov.rpm >= ov.c.E.red * 0.93 && ov.shiftT <= 0 && ov.gear < ov.c.E.ratios.length) { ov.shiftUp(); fxExhaust('o', 'pop'); }
    const pw = pv.x >= s.target, ow = ov.x >= s.target;
    if (pw || ow) {
      const win = pw && (!ow || pv.x - s.target >= ov.x - s.target);
      s.st = 'leave'; s.t = 0;
      if (win) { const prize = Math.round(s.o.prize * 0.6 / 100) * 100 + 500; S.money += prize; addXP(Math.round(s.o.xp * 0.8)); finAdd && finAdd('rev', 0); raceMsg('GEWONNEN! +' + fmtMoney(prize), '#a7f070', 3); sfx('cash'); R.fwT = 2; }
      else raceMsg(s.o.name.toUpperCase() + ' WAR SCHNELLER', '#ff4b55', 2.5);
    }
  } else if (s.st === 'leave') {
    ov.step(dt, { thr: 1, clutch: false });
    if (!ov.c.E.isEV && ov.rpm >= ov.c.E.red * 0.9 && ov.shiftT <= 0 && ov.gear < ov.c.E.ratios.length) ov.shiftUp();
    if (ov.x - pv.x > 60 || s.t > 20) { R.street = null; R.ov.x = -1e6; R.nextOffer = R.t + 50 + Math.random() * 60; }
  }
  suspStep(ov, dt);
}
/** Hupe: Herausforderung annehmen */
function streetAccept() {
  const R = RACE; if (!R || !R.street || R.street.st !== 'offer') return false;
  R.street.st = 'count'; R.street.t = 0; R.street.lastN = 0; R.traffic = []; R.spawnT = 99;
  return true;
}

// ---------- Polizei ----------
function policeStep(R, dt) {
  const pv = R.pv, kmh = pv.v * 3.6, lim = cruiseLimit();
  if (!R.police) {
    R.speedT = kmh > lim ? R.speedT + dt : Math.max(0, R.speedT - dt * 2);
    if (R.speedT > 3.5 && !(R.street && ['count', 'race'].includes(R.street.st)) && Math.random() < dt * 0.6) {
      R.police = { x: pv.x - 35, v: pv.v, lane: R.lane, laneF: R.lane, t: 0, close: 0, slow: 0, d: POLICE_DESIGN() };
      raceMsg('POLIZEI! ANHALTEN ODER ABHAUEN!', '#41a6f6', 3); sirenOn(true); R.speedT = 0;
    }
    return;
  }
  const P = R.police; P.t += dt;
  const vmax = 255 / 3.6, want = Math.min(vmax, pv.v + (pv.x - P.x > 15 ? 12 : 3));
  P.v += clamp(want - P.v, -8 * dt, 7 * dt); P.x += P.v * dt;
  if (P.t > 1.5 && Math.abs(P.lane - R.lane) > 0) { P.lane = R.lane; }
  P.laneF += clamp(P.lane - P.laneF, -dt * 1.5, dt * 1.5);
  const gap = pv.x - P.x;
  P.close = gap < 9 ? P.close + dt : Math.max(0, P.close - dt);
  P.slow = kmh < 25 ? P.slow + dt : 0;
  if (P.slow > 2 && gap < 30) {
    const fine = Math.min(5000, Math.max(300, Math.round(S.money * 0.03 / 100) * 100));
    S.money -= fine; raceMsg('STRAFZETTEL: -' + fmtMoney(fine), '#ff4b55', 3); sfx('bad'); policeEnd(R);
  } else if (P.close > 6) {
    const fine = Math.min(9000, Math.max(800, Math.round(S.money * 0.06 / 100) * 100));
    S.money -= fine; raceMsg('ERWISCHT! -' + fmtMoney(fine), '#ff4b55', 3); sfx('bad'); policeEnd(R);
  } else if (gap > 160) {
    addXP(80); raceMsg('ENTKOMMEN! +80 XP', '#a7f070', 2.5); sfx('goal'); policeEnd(R);
  }
}
function policeEnd(R) { R.police = null; sirenOn(false); }
let _siren = null;
function sirenOn(on) {
  try {
    if (on && !_siren && AUD && !(RACE && RACE.muted)) {
      const o = AUD.createOscillator(), l = AUD.createOscillator(), lg = AUD.createGain(), g = AUD.createGain();
      o.type = 'square'; o.frequency.value = 820; l.frequency.value = 1.6; lg.gain.value = 260; l.connect(lg); lg.connect(o.frequency);
      g.gain.value = 0.025; o.connect(g); g.connect(AUD.destination); o.start(); l.start(); _siren = { o, l, g };
    } else if (!on && _siren) { _siren.o.stop(); _siren.l.stop(); _siren = null; }
  } catch (e) { _siren = null; }
}

// ---------- Zeichnen ----------
/** zusätzliche Autos (Herausforderer, Polizei) in die Spur-Sortierung einreihen */
function cruisePlusCars(items, ctx, W, camX, sh) {
  const R = RACE;
  if (R.street && R.ov && R.ov.x > -1e5) {
    const y = laneY(R.street.lane);
    items.push({ y, f: () => { drawRaceCar(ctx, 'o', R.ov, W(R.ov.x), Math.round(y * 2) / 2); drawSmoke(ctx, 'o', camX, sh); } });
  }
  if (R.police) {
    const P = R.police, y = laneY(P.laneF);
    items.push({ y, f: () => {
      const night = !!(_raceBG.T.night || _raceBG.T.lights);
      const L = carLayers(P.d, { lights: night, brake: false }), k = Math.floor(((P.x / 0.31) % 16 + 16) % 16);
      const x0 = W(P.x) - (L.ox + L.L), y0 = Math.round(y * 2) / 2 - L.gy;
      if (x0 > RW_ + 10 || x0 + L.W < -10) return;
      ctx.drawImage(carWheelLayer(L, k & 15), x0, y0, L.W, L.H); ctx.drawImage(L.bodyCv, x0, y0, L.W, L.H);
      const roof = Math.max(...L.top), bx = x0 + L.ox + L.L * 0.42, by = Math.round(y) - roof - 2, ph = Math.floor(R.t * 6) % 2;
      ctx.fillStyle = '#1a1c2c'; ctx.fillRect(bx - 1, by, 10, 2);
      ctx.fillStyle = ph ? '#ff3040' : '#5a1820'; ctx.fillRect(bx, by - 1, 4, 2); ctx.fillStyle = ph ? '#1e3a8a' : '#41a6f6'; ctx.fillRect(bx + 4, by - 1, 4, 2);
      fxLightPool(ctx, bx + 4, by, 22, 14, ph ? '255,48,64' : '65,166,246', night ? 0.35 : 0.18);
    } });
  }
}
/** Treffpunkt und Ziellinie des Strassenrennens (hinter den Autos) */
function cruiseDrawScenery(ctx, W) {
  const R = RACE;
  const mx = R.nextMeet, x = W(mx);
  if (x > -140 && x < RW_ + 40) {
    const night = _raceBG.T.night;
    ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x + 10, 30, 70, 14); ctx.fillStyle = night ? '#ff4bd0' : '#b13e53'; ctx.fillRect(x + 10, 30, 70, 1); ctx.fillRect(x + 10, 43, 70, 1);
    cxText(ctx, 'CAR MEET', x + 45, 34, night && Math.floor(R.t * 3) % 4 ? '#ff9bf0' : '#73eff7', 1, 'c');
    ctx.fillStyle = '#3a3e48'; ctx.fillRect(x + 20, 44, 2, 22); ctx.fillRect(x + 68, 44, 2, 22);
    const guests = R.meetCars || (R.meetCars = [0, 1, 2, 3].map(i => Object.assign(defaultDesign(), { body: pick(['rx7', 'supra', 's911', 'r34', 'z240', 'e30', 'c6']), color: pick(['#ff4bd0', '#73eff7', '#ffcd75', '#1a1c2c', '#f4f4f4', '#a7f070']), rim: pick(['mesh', 'star', 'forged']), tire: 5, ride: -4, glow: i % 2 ? '#ff4bd0' : '#73eff7', stripe: 'none', sticker: pick(['none', 'racing', 'fade']) })));
    guests.forEach((d, i) => { d.cls = BODIES[d.body].cls; const m = miniCar(d); ctx.drawImage(m.cv, x + i * 26, 74 - m.gy * 0.5, m.W * 0.5, m.H * 0.5); });
    if (night) fxLightPool(ctx, x + 50, 72, 60, 6, '255,75,208', 0.2);
  }
  const s = R.street;
  if (s && s.target && (s.st === 'race' || s.st === 'leave')) {
    const fx = W(s.target);
    if (fx > -20 && fx < RW_ + 20) {
      for (let y = 75; y < 124; y += 2) for (let k = 0; k < 3; k++) { ctx.fillStyle = ((y >> 1) + k) % 2 ? '#f4f4f4' : '#1a1c2c'; ctx.fillRect(fx + k * 2, y, 2, 2); }
      cxText(ctx, 'ZIEL', fx + 3, 64, '#ffcd75', 1, 'c', '#000');
    }
  }
}
/** Dämmerung, Anzeigen für Rennen/Polizei – über der Szene, unter dem Cockpit */
function cruiseDrawOverlay(ctx) {
  const R = RACE;
  if (R.overlayA > 0.01) { ctx.fillStyle = `rgba(36,18,60,${R.overlayA.toFixed(3)})`; ctx.fillRect(0, 0, RW_, 126); }
  const s = R.street;
  if (s && s.st === 'race') {
    const left = Math.max(0, Math.round(s.target - R.pv.x)), lead = R.pv.x - R.ov.x;
    cxText(ctx, 'STRASSENRENNEN  ' + left + ' M', 4, 4, '#ffcd75', 1, 'l', '#000');
    cxText(ctx, (lead >= 0 ? 'VORNE +' : 'HINTEN ') + Math.abs(lead).toFixed(1) + ' M', 4, 12, lead >= 0 ? '#a7f070' : '#ff7b8a', 1, 'l', '#000');
  } else if (s && s.st === 'offer') cxText(ctx, 'HUPE = RENNEN ANNEHMEN (' + Math.max(0, Math.ceil(7 - s.t)) + ')', 4, 4, '#ff9bf0', 1, 'l', '#000');
  if (R.police) { const gap = Math.max(0, Math.round(R.pv.x - R.police.x)); cxText(ctx, 'POLIZEI ' + gap + ' M  (ABHÄNGEN: 160 M)', RW_ - 4, 4, Math.floor(R.t * 4) % 2 ? '#41a6f6' : '#ff4b55', 1, 'r', '#000'); }
  else if (R.pv.v * 3.6 > cruiseLimit()) cxText(ctx, 'LIMIT ' + cruiseLimit() + ' KM/H', RW_ - 4, 4, '#ffcd75', 1, 'r', '#000');
}
