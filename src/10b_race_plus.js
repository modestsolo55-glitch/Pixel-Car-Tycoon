/* =============================================================================
   Teil 10b: Rennen – Extras
   Geist (eigene Bestzeit), Fotofinish in Zeitlupe, Motorverschleiss,
   neuer Motorsound je Motortyp, Gegner mit Gesicht und Sprüchen
   ============================================================================= */

// ---------- Geist: eigene Bestzeit als durchsichtiges Auto ----------
const GHOST_HZ = 30;
const ghostKey = cfg => (cfg.track || 'sunset') + '|' + cfg.dist;
const ghostOf = cfg => (S.ghosts || {})[ghostKey(cfg)] || null;
const ghostOn = () => S.ghostOn !== false;
/** Position des Spielers ab Grün mitschreiben (aus raceStep) */
function ghostRecord(R) {
  if (R.greenT == null || R.t < R.greenT || R.p.fin || R.p.foul) return;
  R.gtrace = R.gtrace || [];
  const gi = Math.floor((R.t - R.greenT) * GHOST_HZ);
  while (R.gtrace.length <= gi) R.gtrace.push(Math.max(0, Math.round(R.pv.x * 100) / 100));
}
/** nach dem Rennen: neue Bestzeit als Geist speichern; liefert Text fürs Ergebnis */
function ghostSave(R) {
  const p = R.p; if (p.foul || p.blown || !p.et || p.react == null || R.cfg.own) return '';
  const total = p.react + p.et, key = ghostKey(R.cfg);
  S.ghosts = S.ghosts || {};
  const old = S.ghosts[key];
  if (old && old.total <= total) return `<div class="hint">Geist-Bestzeit hier: ${old.total.toFixed(3)} s (ab Grün) – dir fehlten <b>${(total - old.total).toFixed(3)} s</b>.</div>`;
  const xs = (R.gtrace || []).slice(); xs.push(Math.round(R.D * 100) / 100);
  R.ghostNew = true;
  S.ghosts[key] = { total, xs, design: clone(R.cfg.player.design), name: R.cfg.player.name };
  return `<div class="good">${ico('star')} Neue Bestzeit auf dieser Strecke: ${total.toFixed(3)} s ab Grün – dein Geist fährt ab jetzt mit!</div>`;
}
function ghostX(R) {
  const g = R.ghost; if (!g || R.greenT == null || R.t < R.greenT) return 0;
  const f = (R.t - R.greenT) * GHOST_HZ, i = Math.floor(f);
  if (i >= g.xs.length - 1) return g.xs[g.xs.length - 1] + (f - g.xs.length + 1) * 0.5;
  return lerp(g.xs[i], g.xs[i + 1], f - i);
}
/** Geist zeichnen (vor dem Spielerauto, gleiche Spur) */
function drawGhost(ctx, W) {
  const R = RACE, g = R.ghost; if (!g) return;
  const x = ghostX(R), s = renderCar(g.design, { angle: 0, brake: false, lights: false });
  const frontX = W(x), x0 = frontX - (s.ox + s.L), y0 = LANE_NEAR - s.gy;
  if (x0 > RW_ + 10 || x0 + s.W < -10) return;
  ctx.save(); ctx.globalAlpha = 0.32; ctx.drawImage(s.cv, x0, y0, s.W, s.H); ctx.restore();
  if (R.pv.launched && R.t - R.p.launchT < 6) {
    const gap = x - R.pv.x;
    cxText(ctx, 'BESTZEIT ' + (gap > 0 ? '+' : '') + gap.toFixed(1) + 'M', x0 + s.W / 2, y0 - 8, gap > 0 ? '#ff7b8a' : '#a7f070', 1, 'c', '#000');
  }
}

// ---------- Fotofinish: Zeitlupe bei knappem Zieleinlauf ----------
function photoFactor(R) {
  const pv = R.pv, ov = R.ov;
  if (!pv.launched || !ov.launched || R.p.foul || R.o.foul || R.p.blown) return 1;
  if (R.p.fin && R.o.fin) { if (R.photo && !R.photoEnd) { R.photoEnd = R.t; } return 1; }
  const lead = Math.max(pv.x, ov.x);
  if (lead > R.D - 12 && lead < R.D + 6 && Math.abs(pv.x - ov.x) < 3) {
    if (!R.photo) { R.photo = true; raceMsg('FOTOFINISH!', '#f4f4f4', 2.5); }
    return 0.22;
  }
  return 1;
}
/** Abstand im Ziel (Zeit ab Grün), positiv = du vorn */
function finishMargin(R) {
  const p = R.p, o = R.o;
  if (!p.et || !o.et || p.foul || o.foul) return null;
  return (o.react + o.et) - (p.react + p.et);
}

// ---------- Motorverschleiss ----------
const carWear = id => Math.round(((S.wear || {})[id]) || 0);
/** Leistungsfaktor bei Verschleiss: ab 40 % sinkt die Leistung bis -15 % */
const wearPower = w => 1 - Math.max(0, w - 40) / 60 * 0.15;
function wearRepairCost(id) {
  const e = raceEntry(id); if (!e) return 0;
  const base = e.car.prodCost || e.car.value || 20000;
  return Math.max(300, Math.round(base * 0.06 * carWear(id) / 100 / 50) * 50);
}
/** beim Rennstart: Verschleiss auf das Auto anwenden */
function wearApply(R) {
  const id = R.cfg.player.carId, w = carWear(id);
  R.wear0 = w;
  if (w > 40) {
    const f = wearPower(w), tq0 = R.pc.E.torque;
    R.pc = Object.assign({}, R.pc, { E: Object.assign({}, R.pc.E, { torque: r => tq0(r) * f }) });
    R.pv = new Vehicle(R.pc); R.pv.x = -4;
  }
  if (w > 85 && !R.cfg.player.blowAt && Math.random() < (w - 85) / 100) R.cfg.player.blowAt = rand(2, 8);
}
/** nach dem Rennen: Verschleiss erhöhen; liefert Text */
function wearAfter(R) {
  const id = R.cfg.player.carId; if (!id || R.cfg.own) return '';
  S.wear = S.wear || {};
  const add = Math.min(12, 1.5 + (R.p.limT || 0) * 5 + (R.p.launchQ === 'high' ? 1 : 0)) + (R.p.blown ? 20 : 0);
  const w = S.wear[id] = clamp((S.wear[id] || 0) + add, 0, 100);
  const col = w > 85 ? 'bad' : w > 40 ? 'warn' : 'muted';
  return `<div class="${col}">${ico('wrench')} Motorverschleiss +${add.toFixed(1)} % → ${Math.round(w)} %${(R.p.limT || 0) > 0.3 ? ' (zu lange im Begrenzer!)' : ''}${w > 40 ? ' – Leistung sinkt, bald reparieren.' : ''}</div>`;
}
ACTIONS.wearFix = d => {
  const c = wearRepairCost(d.v); if (!c) return;
  if (S.money < c) { toast('Zu wenig Geld für die Motorrevision.', 'bad'); return; }
  S.money -= c; S.wear[d.v] = 0; sfx('buy');
  toast(`${ico('wrench')} Motor revidiert für ${fmtMoney(c)} – wieder 100 % Leistung.`, 'good'); rerender();
};
function wearPanelHTML(id) {
  const w = carWear(id), c = wearRepairCost(id);
  const col = w > 85 ? 'var(--red)' : w > 40 ? 'var(--orange)' : 'var(--green)';
  return `<div class="lbl">Motorzustand</div>
    <div class="flex"><div class="pbar" style="flex:1"><i style="width:${100 - w}%;background:${col}"></i><em>${100 - w} %${w > 40 ? ' · Leistung -' + Math.round((1 - wearPower(w)) * 100) + ' %' : ''}</em></div>
    ${w >= 5 ? `<button class="btn sm ${S.money >= c ? 'green' : 'lock'}" data-act="wearFix" data-v="${id}" data-why="Zu wenig Geld">Revidieren ${fmtMoney(c)}</button>` : ''}</div>
    <div class="hint">Jedes Rennen nutzt den Motor ab – besonders langes Fahren im Drehzahlbegrenzer. Ab 40 % Verschleiss sinkt die Leistung, ab 85 % kann er platzen.</div>`;
}

// ---------- Gegner: Gesichter und Sprüche ----------
const OPP_INFO = {
  rookie: { skin: '#f0c0a0', hair: '#8a5a3c', style: 'cap', cap: '#ef7d57', shirt: '#38b764', glasses: false,
    hi: ['Hey! Ist das dein erstes Rennen? Meins auch!', 'Mama sagt, ich fahre super.'], win: ['Ich hab gewonnen?! Echt jetzt?'], lose: ['Okay, okay… nächstes Mal!'] },
  street: { skin: '#e0a882', hair: '#ff6ac1', style: 'long', shirt: '#3b5dc9', glasses: false,
    hi: ['Auf der Strasse gelten andere Regeln, Kleiner.', 'Hoffentlich hast du warme Reifen.'], win: ['Zu langsam. Wie erwartet.'], lose: ['Glück gehabt. Rückkampf, sofort!'] },
  pro: { skin: '#c89070', hair: '#1a1c2c', style: 'slick', shirt: '#ffcd75', glasses: 'sun',
    hi: ['Ich fahre seit 20 Jahren. Und du?', 'Perfekte Schaltpunkte. Immer.'], win: ['Erfahrung schlägt Talent.'], lose: ['Respekt. Das war sauber gefahren.'] },
  legend: { skin: '#f4d0b0', hair: '#f4f4f4', style: 'bob', shirt: '#5d275d', glasses: 'round',
    hi: ['Ich habe schon Rekorde gebrochen, als du noch Dreirad fuhrst.', 'Zeig mir, was du kannst.'], win: ['Die Legende lebt.'], lose: ['Endlich mal eine echte Herausforderung!'] },
  boss: { skin: '#d8a880', hair: '#101014', style: 'short', shirt: '#b13e53', glasses: 'sun', beard: true,
    hi: ['Mein Team hat 300 Ingenieure. Du hast… eine Garage.', 'Verlieren ist keine Option.'], win: ['So läuft das in der Oberliga.'], lose: ['Unmöglich! Ich will die Telemetrie sehen!'] },
  king: { skin: '#a8785a', hair: '#ffcd75', style: 'crown', shirt: '#29366f', glasses: 'visor',
    hi: ['Niemand hat mich je geschlagen.', 'Willkommen im Thronsaal.'], win: ['Der König bleibt König.'], lose: ['…Ein neuer König ist geboren.'] }
};
const _faceCache = {};
/** 16x16-Pixelporträt eines Gegners als Bild-URL */
function facePortrait(id) {
  if (_faceCache[id]) return _faceCache[id];
  const F = OPP_INFO[id]; if (!F) return '';
  const cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
  const c = cv.getContext('2d'), px = (x, y, col, w = 1, h = 1) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  px(0, 0, '#22263a', 16, 16);
  px(2, 13, F.shirt, 12, 3); px(6, 12, F.skin, 4, 2);                      // Schultern, Hals
  px(4, 4, F.skin, 8, 9); px(3, 6, F.skin, 1, 3); px(12, 6, F.skin, 1, 3);  // Kopf, Ohren
  const dk = shadeHex(F.skin, -0.35);
  px(5, 12, dk, 6, 1);                                                    // Kinnschatten
  // Haare
  if (F.style === 'long') { px(3, 2, F.hair, 10, 3); px(2, 4, F.hair, 2, 9); px(12, 4, F.hair, 2, 9); }
  else if (F.style === 'bob') { px(3, 2, F.hair, 10, 3); px(3, 4, F.hair, 2, 6); px(11, 4, F.hair, 2, 6); }
  else if (F.style === 'slick') { px(4, 2, F.hair, 8, 3); px(11, 3, F.hair, 2, 2); }
  else if (F.style === 'short') { px(4, 2, F.hair, 8, 2); px(4, 4, F.hair, 1, 2); px(11, 4, F.hair, 1, 2); }
  else if (F.style === 'cap') { px(4, 2, F.cap, 8, 3); px(9, 4, F.cap, 5, 1); px(4, 5, F.hair, 1, 2); }
  else if (F.style === 'crown') { px(4, 3, F.hair, 8, 2); px(4, 1, '#ffcd75', 1, 2); px(7, 0, '#ffcd75', 2, 3); px(11, 1, '#ffcd75', 1, 2); px(4, 2, '#ffcd75', 8, 1); px(7, 1, '#b13e53', 2, 1); }
  // Augen / Brillen
  if (F.glasses === 'sun') { px(5, 7, '#101014', 2, 2); px(9, 7, '#101014', 2, 2); px(7, 7, '#101014', 2, 1); px(5, 7, '#566c86'); px(9, 7, '#566c86'); }
  else if (F.glasses === 'round') { px(5, 7, '#94b0c2', 2, 2); px(9, 7, '#94b0c2', 2, 2); px(6, 8, '#1a1c2c'); px(10, 8, '#1a1c2c'); px(7, 7, '#94b0c2', 2, 1); }
  else if (F.glasses === 'visor') { px(4, 7, '#73eff7', 8, 2); px(4, 7, '#f4f4f4', 2, 1); }
  else { px(5, 7, '#f4f4f4', 2, 2); px(9, 7, '#f4f4f4', 2, 2); px(6, 8, '#1a1c2c'); px(10, 8, '#1a1c2c'); }
  if (F.beard) px(5, 10, F.hair, 6, 2); else px(7, 10, '#b13e53', 2, 1);   // Bart oder Mund
  px(7, 9, dk, 2, 1);                                                      // Nase
  return (_faceCache[id] = cv.toDataURL());
}
const faceImg = (id, size = 48) => OPP_INFO[id] ? `<img src="${facePortrait(id)}" class="face" style="width:${size}px;height:${size}px" alt="">` : '';
const oppQuote = (id, k) => { const F = OPP_INFO[id]; return F ? pick(F[k]) : ''; };

// ---------- Motorsound je Motortyp ----------
let _noiseBuf = null;
function noiseBuffer() {
  if (_noiseBuf) return _noiseBuf;
  const n = AUD.sampleRate, b = AUD.createBuffer(1, n, AUD.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return (_noiseBuf = b);
}
/** Eine Motorstimme: Grundton + Obertöne, Brummen (V-Motoren), Turbo-/Kompressor-Pfeifen, E-Surren */
function makeVoice(car, eng, vol, pan) {
  const out = AUD.createGain(); out.gain.value = 0;
  let dst = out;
  if (AUD.createStereoPanner) { const p = AUD.createStereoPanner(); p.pan.value = pan; out.connect(p); p.connect(AUD.destination); }
  else out.connect(AUD.destination);
  const V = { out, vol, ev: car.isEV, ind: eng.ind || 'none', cyl: car.cyl || 4, type: car.type, nodes: [] };
  const osc = (type, g0) => { const o = AUD.createOscillator(), g = AUD.createGain(); o.type = type; g.gain.value = g0; o.connect(g); o.start(); V.nodes.push(o); return { o, g }; };
  const lp = AUD.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2; lp.connect(dst);
  V.lp = lp;
  if (V.ev) {
    V.a = osc('sine', 0.5); V.a.g.connect(lp);
    V.b = osc('triangle', 0.25); V.b.g.connect(lp);
    V.c = osc('sine', 0.12); V.c.g.connect(lp);                            // hohes Inverter-Surren
  } else {
    V.a = osc('sawtooth', 0.55); V.b = osc('square', 0.3); V.c = osc('sawtooth', 0.18);
    // Brummen: Lautstärke schwankt mit halber Zündfrequenz (V6/V8/V10/V12 klingen „unrund“)
    const am = AUD.createGain(); am.gain.value = 0.7;
    V.a.g.connect(am); V.b.g.connect(am); V.c.g.connect(am); am.connect(lp);
    const lfo = osc('sine', /^v|w|flat/.test(V.type) ? 0.35 : V.type === 'rotary' ? 0.05 : 0.12); lfo.g.connect(am.gain); V.lfo = lfo;
    if (V.ind === 'turbo' || V.ind === 'twin') { V.t = osc('sine', 0); V.t.g.connect(dst); }
    if (V.ind === 'super') { V.t = osc('sawtooth', 0); const hp = AUD.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500; V.t.g.connect(hp); hp.connect(dst); }
  }
  return V;
}
function voiceUpdate(V, veh, thr, mute, now) {
  const E = veh.c.E, rpm = veh.rpm, u = rpm / E.red;
  if (V.ev) {
    const f = 40 + rpm / 9;
    V.a.o.frequency.setTargetAtTime(f, now, 0.03); V.b.o.frequency.setTargetAtTime(f * 2, now, 0.03); V.c.o.frequency.setTargetAtTime(f * 6, now, 0.03);
    V.lp.frequency.setTargetAtTime(1200 + rpm / 4, now, 0.05);
  } else {
    const fire = Math.max(18, rpm / 60 * Math.max(2, V.cyl / 2));
    V.a.o.frequency.setTargetAtTime(fire, now, 0.025); V.b.o.frequency.setTargetAtTime(fire * 0.5, now, 0.025); V.c.o.frequency.setTargetAtTime(fire * 2.01, now, 0.025);
    V.lfo.o.frequency.setTargetAtTime(fire / 2, now, 0.03);
    V.lp.frequency.setTargetAtTime(380 + thr * 1300 + rpm / 8, now, 0.05);
    if (V.t) {
      const boost = clamp((u - 0.35) * 1.6, 0, 1) * (0.4 + thr * 0.6);
      V.t.o.frequency.setTargetAtTime(V.ind === 'super' ? 900 + rpm * 0.9 : 1800 + rpm * 0.55, now, 0.08);
      V.t.g.gain.setTargetAtTime(boost * (V.ind === 'super' ? 0.05 : 0.07), now, 0.1);
    }
  }
  V.out.gain.setTargetAtTime(mute ? 0 : V.vol * (0.45 + thr * 0.55), now, 0.05);
}
/** kurzer Knall (Schalten, Fehlzündung im Begrenzer) */
function popSound(vol = 0.18, freq = 700) {
  if (!AUD || !RACE || RACE.muted) return;
  try {
    const s = AUD.createBufferSource(), f = AUD.createBiquadFilter(), g = AUD.createGain(), now = AUD.currentTime;
    s.buffer = noiseBuffer(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    s.connect(f); f.connect(g); g.connect(AUD.destination); s.start(now, Math.random() * 0.5, 0.15);
  } catch (e) { /* egal */ }
}
/** Turbo-Abblasen beim Schalten („Pssch“) */
function blowOff() {
  if (!AUD || !RACE || RACE.muted) return;
  try {
    const s = AUD.createBufferSource(), f = AUD.createBiquadFilter(), g = AUD.createGain(), now = AUD.currentTime;
    s.buffer = noiseBuffer(); f.type = 'highpass'; f.frequency.setValueAtTime(2600, now); f.frequency.exponentialRampToValueAtTime(900, now + 0.35);
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.07, now + 0.03); g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    s.connect(f); f.connect(g); g.connect(AUD.destination); s.start(now, Math.random() * 0.5, 0.45);
  } catch (e) { /* egal */ }
}
function audioStart() {
  const R = RACE; if (!R || R.snd) return;
  try {
    AUD = AUD || new (window.AudioContext || window.webkitAudioContext)();
    if (AUD.state === 'suspended') AUD.resume();
    const nos = AUD.createBufferSource(), nf = AUD.createBiquadFilter(), ng = AUD.createGain();
    nos.buffer = noiseBuffer(); nos.loop = true; nf.type = 'highpass'; nf.frequency.value = 3000; ng.gain.value = 0;
    nos.connect(nf); nf.connect(ng); ng.connect(AUD.destination); nos.start();
    R.snd = { p: makeVoice(R.pc.E, R.cfg.player.engine, 0.07, -0.15), o: makeVoice(R.oc.E, R.cfg.opp.engine, 0.035, 0.25), nos, ng };
  } catch (e) { R.snd = null; }
}
function audioUpdate() {
  const R = RACE; if (!R || !R.snd || !AUD) return;
  const now = AUD.currentTime, m = R.muted;
  voiceUpdate(R.snd.p, R.pv, R.inp.gas ? 1 : 0.1, m, now);
  const near = clamp(1 - Math.abs(R.ov.x - R.pv.x) / 60, 0.15, 1);
  voiceUpdate(R.snd.o, R.ov, R.ov.launched && !R.o.fin ? 1 : 0.3, m, now);
  R.snd.o.out.gain.setTargetAtTime(m || (R.cruise && !(R.street && R.ov.x > -1e5)) ? 0 : R.snd.o.vol * near, now, 0.1);
  R.snd.ng.gain.setTargetAtTime(!m && (R.pv.nosT > 0 || R.ov.nosT > 0) ? 0.05 : 0, now, 0.05);
  if (R.pv.limiterT > 0.05 && Math.random() < 0.08) popSound(0.12, 500);
  if (typeof engineExtras === 'function') engineExtras();
}
function audioStop() {
  const R = RACE; if (!R || !R.snd) return;
  try {
    for (const V of [R.snd.p, R.snd.o]) { V.out.gain.value = 0; V.nodes.forEach(n => n.stop()); }
    R.snd.ng.gain.value = 0; R.snd.nos.stop();
  } catch (e) { /* bereits gestoppt */ }
  R.snd = null;
}
