/* =============================================================================
   Teil 9f: Tuning-Werkstatt mit Leistungsprüfstand
   Renn-Tuning für eigene Modelle und Gebrauchtwagen (gilt nur fürs Drag Race,
   nicht für die Serienproduktion). Prüfstand mit animierter Leistungskurve.
   ============================================================================= */
ICONS.dyno = ['kkkkkkkk', 'kyyyyyyk', 'ky.yy.yk', 'kyyyyyyk', 'kkkkkkkk', '.kk..kk.', 'kssk.ssk', '.kk..kk.'];
// Anteile vom Neuwert pro Stufe; lvl = benötigtes Firmenlevel je Stufe
const TUNE_PARTS = {
  chip:    { name: 'Motor-Software',     max: 3, cost: [0.04, 0.08, 0.14], lvl: [1, 4, 9],  ps: [0.08, 0.16, 0.25], txt: l => `+${[8, 16, 25][l]} % Leistung` },
  boost:   { name: 'Ladedruck & Ansaugung', max: 3, cost: [0.06, 0.12, 0.2], lvl: [3, 8, 14], ps: [0.06, 0.12, 0.2], noEV: true, txt: l => `+${[6, 12, 20][l]} % Leistung` },
  weight:  { name: 'Leichtbau',          max: 3, cost: [0.05, 0.1, 0.18], lvl: [2, 7, 13], w: [0.96, 0.92, 0.87], txt: l => `-${[4, 8, 13][l]} % Gewicht` },
  tires:   { name: 'Semi-Slicks',        max: 3, cost: [0.02, 0.05, 0.09], lvl: [1, 5, 10], grip: [0.05, 0.1, 0.16], txt: l => `+${[0.05, 0.1, 0.16][l]} Grip` },
  gearbox: { name: 'Sportgetriebe',      max: 3, cost: [0.03, 0.07, 0.12], lvl: [2, 6, 11], shift: [0.85, 0.7, 0.55], noEV: true, txt: l => `Schaltzeit -${[15, 30, 45][l]} %` },
  susp:    { name: 'Drag-Fahrwerk',      max: 3, cost: [0.03, 0.06, 0.1], lvl: [1, 5, 9], grip: [0.02, 0.04, 0.07], txt: l => `+${[0.02, 0.04, 0.07][l]} Grip beim Start` },
  nitro:   { name: 'Lachgas-Kit',        max: 2, cost: [0.05, 0.12], lvl: [5, 12], nos: ['small', 'big'], noEV: true, txt: l => ['NOS klein (+30 %)', 'NOS gross (+55 %)'][l] }
};
/** Tuning auf Design/Motor anwenden (Kopien, Original bleibt unverändert) */
function applyTune(d, e, tune) {
  d = clone(d); e = clone(e);
  if (!tune) return { d, e };
  const isEV = e.type === 'ev';
  let ps = 1, w = 1, grip = 0, shift = 1;
  for (const [k, P] of Object.entries(TUNE_PARTS)) {
    const l = tune[k] | 0; if (!l || (P.noEV && isEV)) continue;
    if (P.ps) ps *= 1 + P.ps[l - 1];
    if (P.w) w *= P.w[l - 1];
    if (P.grip) grip += P.grip[l - 1];
    if (P.shift) shift *= P.shift[l - 1];
    if (P.nos) { const n = P.nos[l - 1]; if (NOS_TYPES[n].mul > (NOS_TYPES[e.nos] || NOS_TYPES.none).mul) e.nos = n; }
  }
  e.wearMul = (e.wearMul || 1) * ps; e.shiftMul = (e.shiftMul || 1) * shift;
  d.wAdj = (d.wAdj || 1) * w; d.gripAdj = (d.gripAdj || 0) + grip;
  return { d, e };
}
/** Fahrzeug-Objekt (Modell oder Gebrauchtwagen) zu einer ID */
function tuneTarget(id) {
  const pe = premiumEntry(id);
  if (pe) { S.ptune = S.ptune || {}; const h = S.ptune[id] = S.ptune[id] || { tune: {} }; return { obj: h, design: pe.d, engine: pe.e, name: pe.P.name, base: computeCar(pe.d, pe.e).prodCost }; }
  const m = modelById(id); if (m) return { obj: m, design: m, engine: getEngine(m.engineId), name: m.name, base: carOf(m).prodCost };
  const o = S.salvage && S.salvage.owned.find(x => x.id === id);
  if (o) { const ef = svEffective(o); return { obj: o, design: ef.d, engine: ef.e, name: o.name, base: svBaseValue(o) / 1.4, salvage: true }; }
  return null;
}
const tuneCost = (T, k, l) => Math.max(500, Math.round(T.base * TUNE_PARTS[k].cost[l] / 100) * 100);

let TSEL = null, DYNO = null;
INPUTS.tcar = el => { TSEL = el.value; DYNO = null; rerender(); };
ACTIONS.tbuy = d => {
  const T = tuneTarget(TSEL); if (!T) return;
  const k = d.v, P = TUNE_PARTS[k], tune = T.obj.tune = T.obj.tune || {}, l = tune[k] | 0;
  if (l >= P.max) return;
  if (S.level < P.lvl[l]) { toast(`Stufe ${l + 1} ab Level ${P.lvl[l]}.`, 'bad'); return; }
  const c = tuneCost(T, k, l);
  if (S.money < c) { toast('Zu wenig Geld.', 'bad'); return; }
  S.money -= c; tune[k] = l + 1; if (T.salvage) T.obj.paid += c;
  addXP(20 + l * 20);
  toast(`${ico('wrench')} ${P.name} Stufe ${l + 1} verbaut: ${P.txt(l)}`, 'good');
  rerender();
};
ACTIONS.treset = () => {
  const T = tuneTarget(TSEL); if (!T || !T.obj.tune) return;
  confirmBox('Alle Tuningteile ausbauen? Du bekommst 30 % der Kosten zurück.', () => {
    let back = 0; for (const [k, l] of Object.entries(T.obj.tune)) for (let i = 0; i < l; i++) back += tuneCost(T, k, i) * 0.3;
    S.money += Math.round(back); T.obj.tune = {}; rerender();
  }, 'Ausbauen');
};
ACTIONS.tdyno = () => {
  const T = tuneTarget(TSEL); if (!T) return;
  const tt = applyTune(T.design, T.engine, T.obj.tune);
  const car = computeCar(tt.d, tt.e);
  DYNO = { t0: performance.now(), car, design: tt.d, prev: T.obj.dyno || null };
  T.obj.dyno = car.ps; if (T.engine) dynoMark(engKey(T.engine));
  if (SFX.on) { tone(70, 4.2, 'sawtooth', 0.035, 0, 330); tone(35, 4.2, 'square', 0.02, 0, 165); }
};

// ---------- Prüfstand-Szene 320x150 ----------
let _dynoBG = null;
function dynoBackground() {
  if (_dynoBG) return _dynoBG;
  const W = 320, H = 150, pb = new PB(W, H);
  for (let y = 0; y < 112; y++) for (let x = 0; x < W; x++) {
    const row = Math.floor(y / 6), off = (row % 2) * 8, mortar = y % 6 === 5 || (x + off) % 16 === 15;
    pb.set(x, y, Crgb(shadeRGB(mortar ? [20, 16, 32] : [42, 30, 58], (hash2((x + off) >> 4, row) - 0.5) * 0.2 - 0.1)));
  }
  for (let y = 112; y < H; y++) for (let x = 0; x < W; x++) pb.set(x, y, Crgb(shadeRGB(((x >> 4) + (y >> 3)) % 2 ? [30, 32, 44] : [38, 40, 54], -(y - 112) / 90)));
  pb.rect(0, 112, W, 1, Chex('#0d0f1a'));
  // Werkzeugwagen und Reifen
  pb.rect(276, 84, 34, 28, Chex('#b13e53')); for (let y = 88; y < 112; y += 6) pb.rect(277, y, 32, 1, Chex('#6a1e2e')); pb.rect(276, 84, 34, 1, Chex('#ef7d57'));
  for (let i = 0; i < 3; i++) { pb.disc(14, 104 - i * 7, 7, Chex('#1e1e24')); pb.rect(7, 101 - i * 7, 14, 1, Chex('#3a3a44')); }
  _dynoBG = pb.canvas();
  return _dynoBG;
}
function drawDyno(ctx, T, t) {
  const W = 320;
  ctx.drawImage(dynoBackground(), 0, 0);
  // Neon-Schriftzug flackert
  const name = (S.company + ' TUNING').toUpperCase().slice(0, 26), on = !(Math.sin(t * 13) > 0.93);
  ctx.save(); ctx.globalAlpha = on ? 0.35 : 0.1; ctx.fillStyle = '#ff4bd0'; ctx.fillRect(W / 2 - textW(name, 2) / 2 - 6, 6, textW(name, 2) + 12, 16); ctx.restore();
  cxText(ctx, name, W / 2, 9, on ? '#ffd0f4' : '#8a4a7a', 2, 'c');
  ctx.fillStyle = on ? '#73eff7' : '#2a4a5a'; ctx.fillRect(20, 30, 70, 2); ctx.fillRect(230, 30, 70, 2);
  if (!T) return;
  const run = DYNO ? clamp((performance.now() - DYNO.t0) / 4200, 0, 1) : 0, active = DYNO && run < 1;
  const tt = DYNO ? { d: DYNO.design } : applyTune(T.design, T.engine, T.obj.tune);
  const car = DYNO ? DYNO.car : computeCar(tt.d, tt.e), E = car.E;
  const rpmF = active ? 0.15 + 0.85 * run : DYNO ? 0.15 : 0.12;
  const rpm = E.isEV ? rpmF * E.red : E.idle + rpmF * (E.red - E.idle);
  const s = renderCar(tt.d, { angle: active ? (t * 40 * rpmF) % (Math.PI * 2) : 0, lights: true, exh: tt.e ? tt.e.exh : 'race', brand: S.company });
  const shake = active ? Math.round((Math.random() - 0.5) * 2 * run) : 0;
  const K = 1.5;                                                   // 1,5-fach: ein Sprite-Pixel = ein Bildschirmpixel
  const x0 = Math.round(200 - s.W * K / 2), y0 = Math.round(128 - s.gy * K) + shake;
  // Prüfstand-Plattform und Rollen
  ctx.fillStyle = '#22263a'; ctx.fillRect(x0 + s.ox * K - 12, 126, s.L * K + 24, 8); ctx.fillStyle = '#ffcd75'; for (let x = x0 + s.ox * K - 12; x < x0 + (s.ox + s.L) * K + 12; x += 8) ctx.fillRect(x, 126, 4, 1);
  for (const w of s.wheels) for (const dx of [-4, 4]) { ctxDisc(ctx, x0 + w.x * K + dx, 130, 3, '#5a5e68'); ctx.fillStyle = '#c8ccd4'; ctx.fillRect(x0 + w.x * K + dx - 1, 129, 1, 1); }
  ctx.drawImage(s.cv, x0, y0, s.W * K, s.H * K);
  // Abgasflammen bei hoher Drehzahl
  if (active && run > 0.6 && Math.random() > 0.4) { const ex = x0 + s.exhaust.x * K, ey = y0 + s.exhaust.y * K; for (let i = 0; i < 6 + run * 8; i++) { ctx.fillStyle = i < 2 ? '#fff4c0' : i < 5 ? '#ffcd75' : '#ef7d57'; ctx.fillRect(ex - i, ey - (i > 3 ? 1 : 0), 1, 2); } }
  // Grosser Ventilator vor dem Auto
  const fx = Math.min(W - 14, x0 + (s.ox + s.L) * K + 18), fy = 104;
  ctxDisc(ctx, fx, fy, 13, '#14151c'); ctxDisc(ctx, fx, fy, 11, '#2a2b33');
  const fa = active ? t * 25 : t * 2;
  for (let i = 0; i < 5; i++) for (let r = 2; r < 10; r += 0.5) { const a = fa + i * 1.2566 + r * 0.08; ctx.fillStyle = '#5a5e68'; ctx.fillRect(Math.round(fx + Math.cos(a) * r), Math.round(fy + Math.sin(a) * r), 1, 1); }
  ctx.fillStyle = '#3a3e48'; ctx.fillRect(fx - 2, fy + 12, 4, 10);
  // Monitor mit Leistungskurve
  const mx = 8, my = 34, mw = 104, mh = 58;
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4); ctx.fillStyle = '#05060c'; ctx.fillRect(mx, my, mw, mh);
  for (let x = 0; x < mw; x += 13) { ctx.fillStyle = '#14182a'; ctx.fillRect(mx + x, my, 1, mh); }
  let maxP = 0; for (let i = 1; i <= 50; i++) { const r = i / 50 * E.red; maxP = Math.max(maxP, E.torque(r) * r); }
  const upto = DYNO ? (active ? run : 1) : 0;
  for (let x = 0; x < mw * upto; x++) {
    const r = Math.max(E.isEV ? 1 : E.idle, (x + 1) / mw * E.red);
    const tq = E.torque(r) / E.nm, p = E.torque(r) * r / maxP;
    ctx.fillStyle = '#ef7d57'; ctx.fillRect(mx + x, Math.round(my + mh - 4 - tq * (mh - 14)), 1, 2);
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(mx + x, Math.round(my + mh - 4 - p * (mh - 14)), 1, 2);
  }
  const psNow = DYNO ? Math.round(car.ps * (active ? Math.min(1, (E.torque(rpm) * rpm) / maxP) : 1)) : 0;
  cxText(ctx, DYNO ? psNow + ' PS' : 'BEREIT', mx + mw - 3, my + 3, '#a7f070', 1, 'r');
  cxText(ctx, Math.round(rpm) + ' U/MIN', mx + 3, my + 3, '#73eff7');
  if (DYNO && !active) {
    cxText(ctx, car.ps + ' PS', W / 2 + 4, 40, '#ffcd75', 3, 'c', '#000');
    cxText(ctx, car.nm + ' NM', W / 2 + 4, 62, '#ef7d57', 2, 'c', '#000');
    if (DYNO.prev && DYNO.prev !== car.ps) cxText(ctx, (car.ps > DYNO.prev ? '+' : '') + (car.ps - DYNO.prev) + ' PS ZUM LETZTEN LAUF', W / 2 + 4, 78, car.ps > DYNO.prev ? '#a7f070' : '#ff7b8a', 1, 'c', '#000');
  }
}

TABS.tuning = {
  title: 'Tuning', icon: 'dyno',
  render(el) {
    if (!tuneTarget(TSEL)) TSEL = S.models[0].id;
    const T = tuneTarget(TSEL), tune = T.obj.tune || {};
    const serie = computeCar(T.design, T.engine), tt = applyTune(T.design, T.engine, tune), tuned = computeCar(tt.d, tt.e);
    const isEV = T.engine.type === 'ev';
    const cmp = (lbl, a, b, f, better) => `<div class="stat"><span>${lbl}</span><span>${f(a)} → <b>${f(b)}</b></span><span class="${a === b ? 'muted' : (better(b, a) ? 'good' : 'bad')}">${a === b ? '' : (better(b, a) ? '▲' : '▼')}</span></div>`;
    el.innerHTML = `<h2 class="title">${ico('dyno', 'big')} Tuning-Werkstatt</h2>
    <div class="row">
      <div class="col" style="flex:1 1 520px">
        <div class="panel dark" style="padding:6px"><canvas id="dynocv" width="320" height="150" class="cv"></canvas></div>
        <div class="panel">
          <div class="flex"><span class="lbl" style="margin:0">Fahrzeug</span><select data-inp="tcar" style="flex:1">${raceOptions(TSEL)}</select></div>
          <div class="flex"><button class="btn yellow big" data-act="tdyno">${ico('dyno')} Prüfstand starten</button><button class="btn sm red" data-act="treset">Tuning ausbauen</button>
            <button class="btn sm orange" data-act="tracego">Damit zum Drag Race</button></div>
          <div class="hint">Renn-Tuning gilt nur für Drag Races – deine Serienproduktion bleibt unverändert. Optik (Neon, Bodykit, Felgen, Tieferlegung) machst du im Auto-Designer.</div>
        </div>
        <div class="panel"><h3>${ico('market')}Serie → Getunt</h3>
          ${cmp('Leistung', serie.ps, tuned.ps, v => v + ' PS', (a, b) => a > b)}
          ${cmp('Gewicht', serie.weight, tuned.weight, v => fmtNum(v) + ' kg', (a, b) => a < b)}
          ${cmp('Grip', +serie.grip.toFixed(2), +tuned.grip.toFixed(2), v => v.toFixed(2), (a, b) => a > b)}
          ${cmp('0–100 km/h', +serie.t100.toFixed(2), +tuned.t100.toFixed(2), v => v.toFixed(2) + ' s', (a, b) => a < b)}
          ${cmp('1/4 Meile', +serie.t14.toFixed(2), +tuned.t14.toFixed(2), v => v.toFixed(2) + ' s', (a, b) => a < b)}
          ${cmp('Vmax', serie.top, tuned.top, v => v + ' km/h', (a, b) => a > b)}
          <div class="stat"><span>NOS</span><span>${tuned.nos ? '+' + Math.round(tuned.nos.mul * 100) + ' % für ' + tuned.nos.dur + ' s' : 'keins'}</span><span></span></div>
        </div>
      </div>
      <div class="col" style="flex:1 1 330px">
        <div class="panel"><h3>${ico('wrench')}Teile</h3>
        ${Object.entries(TUNE_PARTS).map(([k, P]) => {
          const l = tune[k] | 0, na = P.noEV && isEV;
          const pips = Array.from({ length: P.max }, (_, i) => `<i style="display:inline-block;width:14px;height:8px;margin-right:2px;background:${i < l ? 'var(--lime)' : '#0d0f1a'};box-shadow:0 0 0 1px #000"></i>`).join('');
          const next = l < P.max ? `<button class="btn sm ${S.level >= P.lvl[l] && !na ? 'green' : 'lock'}" data-act="tbuy" data-v="${k}" data-why="${na ? 'Nicht für E-Autos' : 'Ab Level ' + P.lvl[l]}">Stufe ${l + 1}: ${fmtMoney(tuneCost(T, k, l))}</button>` : '<span class="good">MAX</span>';
          return `<div class="card"><div class="flex"><b>${P.name}</b><span class="sp"></span>${pips}</div>
            <div class="flex"><span class="hint" style="margin:0;flex:1">${na ? 'Nicht für E-Autos' : l < P.max ? 'Nächste Stufe: ' + P.txt(l) + (S.level < P.lvl[l] ? ` · ab Level ${P.lvl[l]}` : '') : 'Voll ausgebaut: ' + P.txt(P.max - 1)}</span>${next}</div></div>`;
        }).join('')}
        </div>
      </div>
    </div>`;
  },
  tick(dt, t) { const cv = $('#dynocv'); if (cv) drawDyno(hdCtx(cv), tuneTarget(TSEL), t); }
};
ACTIONS.tracego = () => { RSEL.modelId = TSEL; setTab('race'); };
