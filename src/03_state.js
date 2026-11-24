/* =============================================================================
   Teil 3: Spielzustand, Speichern, Werte-Berechnung (Motor/Auto), Fahrphysik
   ============================================================================= */
const SAVE_KEY = 'autotycoon_save_v1';
const DAY_SEC = 3;          // Echtzeit-Sekunden pro Spieltag bei 1x
const RW = 0.32;            // Reifenradius in Metern
let S = null;               // aktueller Spielstand
/** Speicherplatz des angemeldeten Kontos */
const curSaveKey = () => (typeof AUTH_USER !== 'undefined' && AUTH_USER) ? SAVE_KEY + ':' + AUTH_USER : SAVE_KEY;

function defaultInterior() {
  return { tier: 'basic', seats: 'cloth', seatColor: '#2a2a30', steer: 'standard', dash: 'analog', ambient: 'none', cage: false };
}
function defaultDesign() {
  return { id: null, name: 'Piccolo', cls: 'small', body: 'hatch3', engineId: 'e1', color: '#b13e53', color2: '#f4f4f4', stripe: 'none',
    paint: 'gloss', rim: 'steel', rimColor: '#c8ccd4', tire: 1, spoiler: 'none', lip: 'none', skirts: 'none', diffuser: 'none', ride: 0,
    tint: 1, number: 0, numStyle: 'circle', sticker: 'none', kit: 'none', glow: 'none', banner: false, interior: defaultInterior(), price: 0 };
}
function defaultEngine() {
  return { id: null, name: 'Ecoline 1.2', type: 'i4', disp: 1.2, ind: 'none', mat: 'steel', exh: 'stock', nos: 'none', gears: 5, ratio: 'normal', motors: 1 };
}
function newModelStats() { return { prod: 0, sold: 0, rev: 0, cost: 0, recent: [] }; }

/** Neues Spiel anlegen */
function newState(company) {
  const e1 = defaultEngine(); e1.id = 'e1';
  const m1 = defaultDesign(); m1.id = 'm1'; m1.stat = newModelStats(); m1.created = 0;
  const st = {
    v: 1, company: company || 'Pixel Motors', money: 40000, gems: 50, level: 1, xp: 0, rp: 3, rep: 10, day: 0, speed: 1,
    techs: [], engines: [e1], models: [m1],
    draft: null, engDraft: null,
    factory: { stage: 0, lines: [newLine('m1')], speed: 0, wh: 0, qc: 0 },
    stock: { m1: 0 }, campaigns: [], mods: [],
    stats: { sold: 0, produced: 0, races: 0, wins: 0, revenue: 0, best14: 0, best18: 0, react: 0, adsRun: {}, designs: 0, beat: {} },
    ach: [], hist: [], log: [], nextEvent: 20, tutorial: true
  };
  S = st;
  m1.price = Math.round(computeCar(m1).value / 100) * 100;
  st.draft = clone(m1); st.draft.id = null; st.draft.name = 'Neues Modell';
  st.engDraft = clone(e1); st.engDraft.id = null; st.engDraft.name = 'Neuer Motor';
  return st;
}
function newLine(modelId) { return { modelId: modelId || null, qty: 10, done: 0, prog: 0, paid: false, active: false, stall: '' }; }

// ---------- Speichern / Laden ----------
function saveGame() {
  if (!S) return false;
  try { localStorage.setItem(curSaveKey(), JSON.stringify(S)); return true; } catch (e) { return false; }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(curSaveKey());
    if (!raw) return null;
    const st = JSON.parse(raw);
    if (!st || st.v !== 1 || !Array.isArray(st.models)) return null;
    // fehlende Felder ergänzen (robust gegen alte Stände)
    st.models.forEach(m => { m.stat = m.stat || newModelStats(); m.interior = Object.assign(defaultInterior(), m.interior || {}); });
    st.draft = Object.assign(defaultDesign(), st.draft || {}); st.draft.interior = Object.assign(defaultInterior(), st.draft.interior || {});
    st.engDraft = Object.assign(defaultEngine(), st.engDraft || {});
    st.stats = Object.assign({ sold: 0, produced: 0, races: 0, wins: 0, revenue: 0, best14: 0, best18: 0, react: 0, adsRun: {}, designs: 0, beat: {} }, st.stats || {});
    if (st.gems == null) st.gems = 50;
    st.mods = st.mods || []; st.campaigns = st.campaigns || []; st.ach = st.ach || []; st.hist = st.hist || []; st.stock = st.stock || {};
    return st;
  } catch (e) { return null; }
}
function wipeSave() { try { localStorage.removeItem(curSaveKey()); } catch (e) { /* ignorieren */ } }

// ---------- Forschung & Boni ----------
const has = id => !id || (S && S.techs.includes(id));
function bonus(key) {
  let v = 0;
  if (!S) return 0;
  for (const id of S.techs) { const t = TECH[id]; if (t && t.fx && t.fx[key]) v += t.fx[key]; }
  return v;
}
/** aktive Ereignis-Modifikatoren aufsummieren */
function modSum(key) {
  if (!S) return 0;
  let v = 0;
  for (const m of S.mods) if (m.until > S.day && m[key]) v += m[key];
  return v;
}
const classUnlocked = cls => has(CLASSES[cls].tech);
const bodyUnlocked = id => has(BODIES[id].tech);
function techLabel(id) { if (String(id).startsWith('shop_')) return 'Shop (Diamanten)'; const t = TECH[id]; return t ? `${t.name} (Lvl ${t.lvl})` : ''; }

// ---------- Motorwerte ----------
const getEngine = id => S.engines.find(e => e.id === id) || S.engines[0];

/** Berechnet alle Kennwerte eines Motors inkl. Drehmomentkurve und Getriebe */
function computeEngine(e) {
  const T = ENGINE_TYPES[e.type] || ENGINE_TYPES.i4;
  const isEV = e.type === 'ev', isHy = e.type === 'hybrid';
  const ind = isEV ? INDUCTIONS.none : (INDUCTIONS[e.ind] || INDUCTIONS.none);
  const mat = MATERIALS[e.mat] || MATERIALS.steel;
  const exh = isEV ? EXHAUSTS.stock : (EXHAUSTS[e.exh] || EXHAUSTS.stock);
  const nos = isEV ? NOS_TYPES.none : (NOS_TYPES[e.nos] || NOS_TYPES.none);
  const disp = clamp(+e.disp || T.dmin, T.dmin, T.dmax);
  const psMul = 1 + bonus('psMul');
  let ps;
  if (isEV) ps = disp * T.ppl * EV_MOTORS[clamp(e.motors | 0, 1, 4)];
  else ps = disp * T.ppl * ind.mul * exh.mul + (isHy ? 120 + disp * 25 : 0);
  ps = Math.round(ps * psMul * (e.wearMul || 1));          // wearMul: Leistungsverlust bei Gebrauchtwagen
  // Gewicht
  let weight = (T.w0 + disp * T.wpl) * (isEV ? 1 : mat.wm) + ind.w + exh.w + nos.w;
  if (isEV) weight += disp * 5.2 + (e.motors - 1) * 35;         // Batterie + Motoren
  // Drehzahl
  const red = Math.round(isEV ? T.red : (T.red + ind.red) * mat.red);
  const idle = isEV ? 0 : 900;
  const u0 = isEV ? 0.33 : isHy ? 0.4 : ind.u0;
  // Normierte Drehmomentkurve f(u), u = rpm/red
  const f = isEV ? (u => u < u0 ? 1 : u0 / u) : (u => Math.max(0.25, 1 - 1.15 * Math.pow(u - u0, 2) / Math.pow(Math.max(u0, 1 - u0), 2) * 0.55));
  let best = 0, bestU = 0.8;
  for (let u = 0.1; u <= 1.0001; u += 0.01) { const p = f(u) * u; if (p > best) { best = p; bestU = u; } }
  const redRad = red * Math.PI / 30;
  const pW = ps * 735.5;
  const tqPeak = pW / (best * redRad);                     // Nm im Maximum
  const torque = rpm => tqPeak * f(clamp(rpm / red, 0.05, 1.05));
  // Getriebe
  const ratioSet = RATIOS[e.ratio] || RATIOS.normal;
  let ratios, final;
  const gears = isEV ? 1 : clamp(e.gears | 0, 4, 8);
  if (isEV) { ratios = [1]; final = ratioSet.ev; }
  else {
    final = ratioSet.final;
    const g1 = 3.45, gn = gears >= 7 ? 0.64 : gears >= 6 ? 0.7 : 0.78;
    ratios = []; for (let i = 0; i < gears; i++) ratios.push(g1 * Math.pow(gn / g1, i / (gears - 1)));
  }
  const shiftTime = (has('tun_dct') ? 0.08 : 0.24 - gears * 0.008) * (e.shiftMul || 1);
  // Verbrauch (l/100 km bzw. kWh/100 km bei 1300 kg)
  let cons = isEV ? 13 + ps * 0.009 : (2.2 + disp * 1.9 * ind.cons + ps * 0.004) * (isHy ? 0.55 : 1);
  // Zuverlässigkeit
  let rel = T.rel - ind.rel + mat.rel - exh.rel - nos.rel - Math.max(0, ps / Math.max(1, disp) - 120) * (isEV ? 0 : 0.05) + bonus('rel');
  rel = clamp(Math.round(rel), 20, 99);
  // Kosten
  let cost = (T.cost + disp * T.cpl) * (isEV ? 1 : mat.cm) + ind.cost + exh.cost + nos.cost + (isEV ? (e.motors - 1) * 3500 : gears * 250);
  if (isHy) cost += 2500;
  const key = engKey(e);
  return {
    key, ps, nm: Math.round(tqPeak), red, idle, weight: Math.round(weight), cons, rel, cost: Math.round(cost), torque, peakU: bestU,
    isEV, gears, ratios, final, shiftTime, nos: nos.mul ? { mul: nos.mul, dur: nos.dur } : null, type: e.type, cyl: T.cyl, disp,
    ind: isEV ? 'none' : (INDUCTIONS[e.ind] ? e.ind : 'none'), indMul: ind.mul
  };
}

// ---------- Autowerte ----------
/** Berechnet sämtliche Werte eines Autodesigns (inkl. simulierter Fahrleistungen) */
function computeCar(d, engOverride) {
  const B = BODIES[d.body] || BODIES.hatch3;
  const eDef = engOverride || getEngine(d.engineId);
  const E = computeEngine(eDef);
  const I = Object.assign(defaultInterior(), d.interior || {});
  const tier = INT_TIERS[I.tier] || INT_TIERS.basic, seat = SEATS[I.seats] || SEATS.cloth, steer = STEER[I.steer] || STEER.standard, dash = DASHES[I.dash] || DASHES.analog;
  const sp = SPOILERS[d.spoiler] || SPOILERS.none, lip = LIPS[d.lip] || LIPS.none, sk = SKIRTS[d.skirts] || SKIRTS.none, df = DIFFUSERS[d.diffuser] || DIFFUSERS.none;
  const rim = RIMS[d.rim] || RIMS.steel, tire = TIRES[clamp(d.tire | 0, 0, 6)], paint = PAINTS[d.paint] || PAINTS.gloss;
  const cage = I.cage && has('int_rollcage');
  // Gewicht
  const bodyW = B.w * (1 + bonus('wMul'));
  const kit = KITS[d.kit] || KITS.none, glow = d.glow && d.glow !== 'none';
  const weight = Math.round((bodyW + E.weight + tier.w + seat.w + dash.w + sp.w + lip.w + sk.w + df.w + kit.w + (rim.w + tire.w) * 4 + (cage ? 28 : 0) + (I.ambient !== 'none' ? 2 : 0) + (glow ? 3 : 0)) * (d.wAdj || 1));
  // Aerodynamik
  const cd = Math.max(0.2, (B.cd + sp.cd + lip.cd + sk.cd + df.cd + d.ride * 0.003) * (1 + bonus('cdMul')));
  const cl = sp.df + lip.df + df.df + kit.df;
  // Grip
  const grip = 0.92 + tire.grip + bonus('grip') + (-d.ride) * 0.006 + cl * 0.15 + (d.gripAdj || 0);
  // Antrieb & Gewichtsverteilung (statisch angetriebener Anteil)
  const drive = E.isEV && B.cls !== 'small' && B.cls !== 'family' ? 'AWD' : B.drive;
  const wd = drive === 'AWD' ? 1 : drive === 'FWD' ? 0.62 : (B.eng === 'rear' ? 0.62 : B.eng === 'mid' ? 0.58 : 0.48);
  // Komfort, Sicherheit, Zuverlässigkeit
  const exh = E.isEV ? EXHAUSTS.stock : (EXHAUSTS[eDef.exh] || EXHAUSTS.stock);
  const comfort = clamp(Math.round(B.comfort + tier.comfort + seat.comfort + steer.comfort + dash.comfort + tire.comfort + d.ride * 2 + exh.comfort
    - (cage ? 10 : 0) + (I.ambient !== 'none' ? 3 : 0) + (E.isEV ? 4 : 0)), 0, 100);
  const safety = clamp(Math.round(B.safety + bonus('safety') + (cage ? 8 : 0) + (weight - 1200) * 0.01), 0, 100);
  const qc = S ? S.factory.qc : 0;
  const rel = clamp(Math.round(E.rel * 0.85 + 8 + qc * 3), 0, 100);
  const style = clamp(Math.round(B.style + paint.style + rim.style + sp.style + (STICKERS[d.sticker] || STICKERS.none).style + (d.stripe !== 'none' ? 3 : 0) + kit.style + (glow ? 6 : 0) + (d.banner ? 2 : 0)
    + (lip.df ? 2 : 0) + (sk.w ? 2 : 0) + (-d.ride) * 1.5 + tire.inch * 0.3 - 4), 0, 100);
  const cons = E.cons * Math.pow(weight / 1300, 0.5) * (1 + (cd - 0.3));
  // Produktionskosten
  const costMul = 1 + bonus('costMul') + modSum('cost');
  const partsCost = sp.cost + lip.cost + sk.cost + df.cost + (rim.cost + tire.cost) * 4 + paint.cost + tier.cost + seat.cost + steer.cost + dash.cost
    + (cage ? 2500 : 0) + (I.ambient !== 'none' ? 400 : 0) + (d.stripe !== 'none' ? 250 : 0) + (d.sticker !== 'none' ? 150 : 0) + kit.cost + (glow ? 600 : 0) + (d.banner ? 80 : 0);
  const prodCost = Math.round((B.cost + E.cost + partsCost) * costMul);
  const car = {
    B, E, weight, mass: weight + 75, ps: E.ps, nm: E.nm, cd, area: B.area, cl, grip, drive, wd, comfort, safety, rel, style, cons,
    prac: B.prac, prodCost, cls: B.cls, isEV: E.isEV, interior: I, nos: E.nos
  };
  // Fahrleistungen simulieren
  const perf = simulateRun(car);
  Object.assign(car, perf);
  car.top = topSpeed(car);
  // Kundengruppen-Bewertung
  car.engKey = engKey(eDef);
  car.score = scoreCar(car, d);
  const q = Math.max(car.score.family, car.score.sport, car.score.hyper) / 100;
  car.value = Math.round(prodCost * (1.08 + 0.45 * q) + (B.cls === 'hyper' ? prodCost * 0.4 : B.cls === 'super' ? prodCost * 0.2 : 0));
  return car;
}

/** Punkte je Kundengruppe (0..100) */
function scoreCar(c, d) {
  const econ = c.isEV ? clamp(100 - (c.cons - 12) * 3.5, 0, 100) : clamp(100 - (c.cons - 4) * 9, 0, 100);
  const fuelW = 0.25 * (1 + modSum('fuel'));
  const tier = c.interior.tier;
  const fam = (0.3 * c.safety + fuelW * econ + 0.2 * c.comfort + 0.15 * c.rel + 0.12 * c.prac) / (0.77 + fuelW) * 1.05
    + (tier === 'luxus' ? 6 : tier === 'komfort' ? 3 : tier === 'race' ? -12 : 0) - Math.max(0, c.ps - 350) * 0.03;
  const power = clamp(c.ps / 6, 0, 100), accel = clamp((14 - c.t100) / 10.5 * 100, 0, 100), spd = clamp((c.top - 150) / 200 * 100, 0, 100);
  const handling = clamp((c.grip - 0.85) * 220, 0, 100);
  const sport = 0.28 * power + 0.25 * accel + 0.2 * spd + 0.17 * c.style + 0.1 * handling + (tier === 'race' ? 7 : 0) + (c.nos ? 3 : 0);
  const excl = { small: 0, family: 0, suv: 10, sport: 25, super: 65, hyper: 100 }[c.cls];
  const hpow = clamp(c.ps / 15, 0, 100), hacc = clamp((4.2 - c.t100) / 2.2 * 100, 0, 100), hspd = clamp((c.top - 280) / 150 * 100, 0, 100);
  const hyper = 0.27 * hpow + 0.22 * hacc + 0.13 * hspd + 0.15 * c.style + 0.18 * excl + 0.05 * c.comfort + (tier === 'luxus' ? 5 : 0);
  return { family: clamp(Math.round(fam), 0, 100), sport: clamp(Math.round(sport), 0, 100), hyper: clamp(Math.round(hyper), 0, 100) };
}

// ---------- Fahrphysik (für Simulation, KI und Drag Race) ----------
class Vehicle {
  constructor(car) { this.c = car; this.reset(); }
  reset() {
    const c = this.c;
    this.v = 0; this.x = 0; this.t = 0; this.gear = 1; this.rpm = c.E.isEV ? 0 : c.E.idle; this.shiftT = 0; this.slip = 0;
    this.nosT = 0; this.nosUsed = false; this.bonusT = 0; this.launched = false; this.locked = false; this.acc = 0;
    this.heat = 0.35; this.limiterT = 0; this.wheelAng = 0; this.spin = 0; this.lastShift = ''; this.boost = 0;
  }
  get ratio() { return this.c.E.ratios[this.gear - 1] * this.c.E.final; }
  rpmFromV() { return this.v / RW * this.ratio * 30 / Math.PI; }
  /** NOS zünden */
  fireNos() { if (this.c.nos && !this.nosUsed) { this.nosUsed = true; this.nosT = this.c.nos.dur; return true; } return false; }
  /** Hochschalten – liefert Bewertung 'perfect' | 'good' | 'early' | 'late' */
  shiftUp() {
    const E = this.c.E;
    if (this.gear >= E.ratios.length || this.shiftT > 0) return null;
    const u = this.rpm / E.red;
    let q = 'good';
    if (this.limiterT > 0.12) q = 'late';
    else if (u >= 0.86 && u <= 0.985) q = 'perfect';
    else if (u < 0.72) q = 'early';
    this.gear++; this.shiftT = E.shiftTime * (q === 'perfect' ? 0.6 : q === 'late' ? 1.6 : 1);
    this.boost *= 0.8;                                             // Schubumluftventil: etwas Ladedruck geht beim Schalten verloren
    if (q === 'perfect') this.bonusT = 1.2;
    this.limiterT = 0; this.lastShift = q;
    return q;
  }
  shiftDown() { if (this.gear > 1 && this.shiftT <= 0) { this.gear--; this.shiftT = this.c.E.shiftTime; return true; } return false; }
  /** Ein Physikschritt. inp = { thr: 0..1, clutch: bool, burnout: bool } */
  step(dt, inp) {
    const c = this.c, E = c.E, g = 9.81, m = c.mass;
    const thr = clamp(inp.thr || 0, 0, 1);
    this.t += dt;
    if (this.nosT > 0) this.nosT -= dt;
    if (this.bonusT > 0) this.bonusT -= dt;
    const nosMul = this.nosT > 0 ? 1 + c.nos.mul : 1;
    const turbo = E.ind === 'turbo' || E.ind === 'twin';
    const spool = (bt, up) => { this.boost += (bt - this.boost) * clamp(dt * (bt > this.boost ? up : 4), 0, 1); };
    const bonusMul = this.bonusT > 0 ? 1.06 : 1;
    let Fdrive = 0;
    const rpmV = this.rpmFromV();
    const engaged = this.launched && !inp.clutch;
    if (!engaged || this.shiftT > 0) {
      // Kupplung getreten bzw. Schaltvorgang: Motor dreht frei
      if (this.shiftT > 0) {
        this.shiftT -= dt;
        this.rpm = lerp(this.rpm, Math.max(E.idle, rpmV), clamp(dt * 14, 0, 1));
      } else {
        const target = E.isEV ? 0 : E.idle + thr * (E.red - E.idle);
        this.rpm = lerp(this.rpm, target, clamp(dt * (target > this.rpm ? 2.2 : 2.6), 0, 1));   // langsam genug zum Dosieren
        if (this.rpm >= E.red * 0.995 && thr > 0.5) this.rpm = E.red * (0.96 + Math.random() * 0.03); // Begrenzer
      }
      // Turbo an der Linie vorspannen (Two-Step): hohe Drehzahl mit getretener Kupplung baut Teil-Ladedruck auf
      if (turbo) spool(this.shiftT > 0 ? this.boost : (thr > 0.5 && this.rpm / E.red > 0.45 ? 0.55 : 0), 1.5);
      this.slip = inp.burnout && thr > 0.3 ? 1 : Math.max(0, this.slip - dt * 3);
      if (inp.burnout && thr > 0.3) { this.heat = Math.min(1.1, this.heat + dt * 0.22 * thr * (has('tun_radials') ? 1.4 : 1)); this.spin = this.rpm; }
    } else {
      // Kupplung greift
      let eRpm = this.rpm, slipClutch = false;
      if (this.gear === 1 && eRpm > rpmV + 80 && !this.locked && !E.isEV) {
        slipClutch = true;
        eRpm = Math.max(rpmV, E.idle * 0.95, eRpm - dt * (1800 + 9000 * (1 - thr)));
        if (eRpm - rpmV < 120) this.locked = true;
      } else { this.locked = true; eRpm = Math.max(rpmV, E.isEV ? 0 : E.idle * 0.95); }
      if (eRpm >= E.red) { this.limiterT += dt; eRpm = E.red; } else this.limiterT = 0;
      this.rpm = eRpm;
      // Ladedruck baut sich mit Last und Drehzahl verzögert auf (Turboloch); ohne Druck nur Saugerleistung
      if (turbo) spool(thr * clamp((eRpm / E.red - 0.25) / 0.35, 0, 1), E.ind === 'twin' ? 3.2 : 2.2);
      const boostMul = turbo ? 1 / E.indMul + (1 - 1 / E.indMul) * this.boost : 1;
      let tq = E.torque(eRpm) * thr * nosMul * bonusMul * boostMul;
      if (this.limiterT > 0) tq *= 0.15;                            // Begrenzer schneidet Leistung
      if (slipClutch) tq *= 1 + clamp((eRpm - rpmV) / E.red, 0, 1) * 0.5;  // Schwungmasse beim Start
      Fdrive = tq * this.ratio * (c.drive === 'AWD' ? 0.84 : c.drive === 'FWD' ? 0.9 : 0.88) / RW;   // Antriebsverluste je Antriebsart
    }
    // Traktion
    const transfer = clamp(this.acc / g, 0, 2) * 0.28;
    const wd = c.drive === 'AWD' ? 1 : c.drive === 'FWD' ? clamp(c.wd - transfer, 0.3, 1) : clamp(c.wd + transfer, 0, 0.95);
    const down = 0.5 * 1.2 * c.cl * c.area * this.v * this.v;
    const heatF = this.heat < 0.85 ? 0.82 + 0.25 * this.heat : 1.03 - (this.heat - 0.85) * 0.4;
    const Fmax = c.grip * heatF * (m * g + down) * wd;
    let F = Fdrive;
    if (Fdrive > Fmax) {
      this.slip = clamp((Fdrive - Fmax) / Fmax, 0.15, 1); F = Fmax * (0.97 - 0.17 * this.slip);   // durchdrehende Reifen haften schlechter
      this.heat = Math.min(1.1, this.heat + dt * 0.25 * this.slip);
      if (this.locked) this.rpm = Math.min(E.red, this.rpm + dt * 2500 * this.slip);
    } else this.slip = Math.max(0, this.slip - dt * 4);
    this.heat = Math.max(0.2, this.heat - dt * 0.012);
    const Faero = 0.5 * 1.2 * c.cd * c.area * this.v * this.v;
    const Froll = 0.013 * m * g * (this.v > 0.1 ? 1 : 0);
    const mEff = m * (1.03 + (this.launched && !inp.clutch ? 0.0012 * this.ratio * this.ratio : 0));   // drehende Massen: in kleinen Gängen träger
    const a = this.launched ? (F - Faero - Froll) / mEff : 0;
    this.acc = a;
    this.v = Math.max(0, this.v + a * dt);
    this.x += this.v * dt;
    this.wheelAng += (this.v / RW + (this.slip > 0.1 ? this.slip * 40 : 0) + (!this.launched && inp.burnout && thr > 0.3 ? 45 : 0)) * dt;
  }
}

/** Automatische Fahrt (perfekter Fahrer) für 0–100, 1/8 und 1/4 Meile */
const _simCache = new Map();
/** Rennsimulation (teuer) – Ergebnis pro Fahrzeug-Kennwerten zwischenspeichern */
function simulateRun(car, launchU, opt = {}) {
  const E = car.E, key = [car.ps, car.nm, car.weight, car.mass, car.cd, car.area, car.cl, car.grip, car.drive, car.wd, E.red, E.idle, E.peakU, E.type, E.disp, E.ratios.join(','), E.final, E.shiftTime, E.ind, car.nos ? car.nos.mul + ':' + car.nos.dur : 0,
    launchU, opt.heat, opt.nos, has('tun_radials') ? 1 : 0].join('|');
  const hit = _simCache.get(key); if (hit) return hit;
  const res = simulateRunRaw(car, launchU, opt);
  if (_simCache.size > 600) _simCache.delete(_simCache.keys().next().value);
  _simCache.set(key, res);
  return res;
}
function simulateRunRaw(car, launchU, opt = {}) {
  const E = car.E;
  const tries = launchU != null ? [launchU] : E.isEV ? [0] : [0.3, 0.42, 0.55, 0.7];
  let best = null;
  for (const lu of tries) {
    const v = new Vehicle(car); v.heat = opt.heat != null ? opt.heat : 0.8; v.boost = E.ind === 'turbo' || E.ind === 'twin' ? 0.55 : 0;
    v.rpm = E.isEV ? 0 : E.idle + lu * (E.red - E.idle); v.launched = true;
    let t100 = 0, t18 = 0, t14 = 0, trap18 = 0, trap14 = 0;
    const dt = 1 / 120;
    for (let i = 0; i < 120 * 45; i++) {
      if (opt.nos && v.t > 0.3) v.fireNos();
      v.step(dt, { thr: v.slip > 0.3 ? 0.8 : 1, clutch: false });            // guter Fahrer: Gas leicht lupfen, wenn die Reifen durchdrehen
      if (!E.isEV && v.rpm >= E.red * 0.95 && v.shiftT <= 0 && v.gear < E.ratios.length) v.shiftUp();
      if (!t100 && v.v >= 27.78) t100 = v.t;
      if (!t18 && v.x >= 201.17) { t18 = v.t; trap18 = v.v * 3.6; }
      if (!t14 && v.x >= 402.34) { t14 = v.t; trap14 = v.v * 3.6; }
      if (t14 && t100) break;
    }
    const r = { t100: t100 || 45, t18: t18 || 45, t14: t14 || 45, trap18, trap14, launchU: lu };
    if (!best || r.t14 < best.t14) best = r;
  }
  return best;
}

/** Höchstgeschwindigkeit: grösstes v, bei dem Antriebskraft ≥ Widerstand */
function topSpeed(car) {
  const E = car.E, m = car.mass;
  let top = 0;
  for (let kmh = 20; kmh <= 520; kmh += 1) {
    const v = kmh / 3.6;
    let fAvail = 0;
    for (const r of E.ratios) {
      const rpm = v / RW * r * E.final * 30 / Math.PI;
      if (rpm > E.red) continue;
      fAvail = Math.max(fAvail, E.torque(Math.max(rpm, E.idle)) * r * E.final * 0.88 / RW);
    }
    const fRes = 0.5 * 1.2 * car.cd * car.area * v * v + 0.013 * m * 9.81 + 0.5 * 1.2 * car.cl * car.area * v * v * 0.08;
    if (fAvail >= fRes) top = kmh; else if (top) break;
  }
  return top;
}

/** Werte eines gespeicherten Modells (gecacht, solange sich Forschung/QK nicht ändern) */
const _carCache = new Map();
function carOf(m) {
  const eng = getEngine(m.engineId);
  const key = JSON.stringify([m, eng, S.techs.length, S.factory.qc, S.mods.filter(x => x.until > S.day && (x.cost || x.fuel)).length]);
  let c = _carCache.get(m.id);
  if (c && c.key === key) return c.car;
  const car = computeCar(m);
  _carCache.set(m.id, { key, car });
  return car;
}

// ---------- XP / Level ----------
const xpNeed = l => Math.round(80 * Math.pow(l, 1.5));
const rpGain = l => 2 + Math.floor(l / 5);
function addXP(n) {
  if (!S || n <= 0) return;
  if (S.boost && S.boost.xpUntil > S.day) n *= 2;
  n *= prestigeMul();          // Shop-Booster: doppelte XP
  S.xp += Math.round(n);
  let ups = 0;
  while (S.xp >= xpNeed(S.level)) { S.xp -= xpNeed(S.level); S.level++; const g = rpGain(S.level); S.rp += g; ups += g; }
  if (ups) { showLevelUp(S.level, ups); checkAchievements(); unlockNotice(); }
}
function addRep(n) {
  if (n > 0) n *= (1 + bonus('repGain')) * Math.max(0.12, 1 - S.rep / 100 * 0.88);   // je höher der Ruf, desto schwerer wird es
  S.rep = clamp(S.rep + n, 0, 100);
}
