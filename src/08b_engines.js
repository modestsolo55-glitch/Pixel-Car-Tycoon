/* =============================================================================
   Teil 8b: Motoren – Prüfstand (Dyno) und Fertigmotoren
   Neu entwickelte Motoren zeigen ihre Leistung erst nach einem Prüfstandlauf
   („??? PS“) – das macht das Entwickeln spannender. Fertigmotoren kauft man
   mit Herstellerangabe und kann sie sofort einbauen.
   ============================================================================= */
const engKey = e => JSON.stringify([e.type, +(+e.disp).toFixed(2), e.ind, e.mat, e.exh, e.nos, e.gears | 0, e.ratio, e.motors | 0]);
function dynoKnown(key) { return !!(S && S.dyno && S.dyno[key]); }
function dynoMark(key) { S.dyno = S.dyno || {}; S.dyno[key] = 1; }
/** alte Spielstände: alle vorhandenen Motoren gelten als bekannt */
function dynoMigrate() { if (!S || S.dynoInit) return; S.dyno = S.dyno || {}; S.engines.forEach(e => dynoMark(engKey(e))); S.dynoInit = 1; }
/** Anzeige-Helfer: Werte nur, wenn der Motor schon auf dem Prüfstand war */
const carKnown = car => !car.engKey || car.factory || dynoKnown(car.engKey);
const psStr = car => carKnown(car) ? car.ps + ' PS' : '??? PS';
const tStr = (car, v, dec = 2) => carKnown(car) ? v.toFixed(dec) + ' s' : '?.?? s';

// ---------- Prüfstand ----------
let DYN = null;
function dynoCost(c) { return Math.max(300, Math.round(c.cost * 0.06 / 50) * 50); }
ACTIONS.dynoRun = d => {
  const e = d.v === 'draft' ? S.engDraft : S.engines.find(x => x.id === d.v); if (!e) return;
  const c = computeEngine(e), cost = dynoCost(c), key = engKey(e);
  if (S.money < cost) { toast('Zu wenig Geld für den Prüfstand.', 'bad'); return; }
  S.money -= cost; updateTopbar(true);
  openModal(`<h2 class="title">${ico('dyno', 'big')} Prüfstand – ${esc(e.name)}</h2>
    <div class="panel dark" style="padding:6px"><canvas id="dyncv" width="320" height="150" class="cv"></canvas></div>
    <div class="flex"><span class="hint" id="dynmsg" style="margin:0">Der Motor läuft warm …</span><span class="sp"></span><button class="btn gray" data-act="close" id="dynclose" disabled>Weiter</button></div>`);
  $('#modal').dataset.onclose = 'dynoStop';
  DYN = { e, c, key, t0: performance.now(), raf: 0, done: false, V: null };
  try { AUD = AUD || new (window.AudioContext || window.webkitAudioContext)(); if (AUD.state === 'suspended') AUD.resume(); DYN.V = makeVoice(c, e, 0.08, 0); } catch (er) { DYN.V = null; }
  DYN.raf = requestAnimationFrame(dynoLoop);
};
function dynoStop() { if (!DYN) return; cancelAnimationFrame(DYN.raf); if (DYN.V) { try { DYN.V.out.gain.value = 0; DYN.V.nodes.forEach(n => n.stop()); } catch (e) { /* egal */ } } DYN = null; rerender(); }
function dynoLoop() {
  const D = DYN; if (!D) return;
  D.raf = requestAnimationFrame(dynoLoop);
  const t = (performance.now() - D.t0) / 1000, c = D.c, warm = 1.2, pull = 3.6;
  const u = clamp((t - warm) / pull, 0, 1), rpm = t < warm ? (c.isEV ? 0 : c.idle) + Math.sin(t * 20) * 30 : (c.isEV ? 0 : c.idle * 1.2) + u * (c.red - (c.isEV ? 0 : c.idle * 1.2));
  if (D.V && AUD) voiceUpdate(D.V, { c: { E: c }, rpm: Math.max(0, rpm) }, t < warm ? 0.2 : 1, !SFX.on, AUD.currentTime);
  if (u >= 1 && !D.done) {
    D.done = true; dynoMark(D.key); sfx('goal');
    const m = $('#dynmsg'); if (m) m.innerHTML = `<b style="font-size:18px">${c.ps} PS</b> bei ${fmtNum(Math.round(c.red * (c.peakU || 0.85) / 100) * 100)} U/min · <b style="font-size:18px">${c.nm} Nm</b>`;
    const b = $('#dynclose'); if (b) { b.disabled = false; b.className = 'btn green'; }
    if (D.V) setTimeout(() => { if (D && D.V) D.V.out.gain.setTargetAtTime(0, AUD.currentTime, 0.3); }, 200);
  }
  const cv = $('#dyncv'); if (!cv) return;
  const ctx = hdCtx(cv), W = 320, H = 150;
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, 0, W, H);
  // Raster
  for (let x = 30; x < W - 10; x += 26) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x, 10, 1, H - 40); }
  for (let y = 10; y < H - 30; y += 20) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(30, y, W - 40, 1); }
  // Rolle + Auto-Silhouette (Rad dreht)
  const spin = t * (2 + u * 30);
  ctx.fillStyle = '#22263a'; ctx.fillRect(0, H - 26, W, 26);
  for (const rx of [70, 250]) { ctxDisc(ctx, rx, H - 14, 9, '#3a3e48'); for (let k = 0; k < 6; k++) { const a = spin + k * Math.PI / 3; ctx.fillStyle = '#8a8e98'; ctx.fillRect(rx + Math.cos(a) * 6 - 0.5, H - 14 + Math.sin(a) * 6 - 0.5, 1.5, 1.5); } }
  // Messkurven bis zur aktuellen Drehzahl
  let maxP = 0; for (let r = 500; r <= c.red; r += 50) maxP = Math.max(maxP, c.torque(r) * r);
  const X = r => 30 + (r / c.red) * (W - 44), Y = v => H - 32 - v * (H - 46);
  for (let r = (c.isEV ? 200 : c.idle * 1.2); r <= rpm; r += c.red / 260) {
    const tq = c.torque(r) / (c.nm || 1), p = c.torque(r) * r / maxP;
    ctx.fillStyle = '#ef7d57'; ctx.fillRect(X(r), Y(tq), 1.2, 1.2);
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(X(r), Y(p), 1.2, 1.2);
  }
  // Anzeige
  const psNow = Math.round(c.ps * clamp((c.torque(rpm) * rpm) / maxP, 0, 1));
  cxText(ctx, fmtNum(Math.round(rpm / 10) * 10) + ' U/MIN', W - 8, 14, '#94b0c2', 1, 'r');
  cxText(ctx, t < warm ? 'WARMLAUF' : (D.done ? 'FERTIG' : 'VOLLGAS'), 34, 14, D.done ? '#a7f070' : '#ef7d57', 1, 'l');
  cxText(ctx, (D.done ? c.ps : psNow) + ' PS', W / 2, H - 22 - 0, '#ffcd75', 2, 'c', '#000');
  cxText(ctx, 'NM', 34, 24, '#ef7d57'); cxText(ctx, 'PS', 48, 24, '#ffcd75');
  if (!D.done && t > warm) { ctx.fillStyle = 'rgba(255,120,60,' + (0.1 + Math.random() * 0.1).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
}

// ---------- Fertigmotoren (mit Herstellerangabe) ----------
const CRATE_ENGINES = [
  { id: 'cr_k20',  name: 'K20 Vierzylinder Turbo',    lvl: 2,  e: { type: 'i4', disp: 2.0, ind: 'turbo', mat: 'alu', exh: 'sport', nos: 'none', gears: 6, ratio: 'short', motors: 1 } },
  { id: 'cr_r13',  name: 'R13 Kreiskolben Biturbo',   lvl: 5,  e: { type: 'rotary', disp: 1.3, ind: 'twin', mat: 'alu', exh: 'sport', nos: 'none', gears: 5, ratio: 'normal', motors: 1 } },
  { id: 'cr_j30',  name: 'J30 Reihensechser Turbo',   lvl: 6,  e: { type: 'i6', disp: 3.0, ind: 'turbo', mat: 'steel', exh: 'sport', nos: 'none', gears: 6, ratio: 'normal', motors: 1 } },
  { id: 'cr_b36',  name: 'B36 Boxer Biturbo',         lvl: 8,  e: { type: 'flat6', disp: 3.6, ind: 'twin', mat: 'alu', exh: 'sport', nos: 'none', gears: 6, ratio: 'normal', motors: 1 } },
  { id: 'cr_l70',  name: 'L70 V8 Sauger 7.0',         lvl: 8,  e: { type: 'v8', disp: 7.0, ind: 'none', mat: 'alu', exh: 'sport', nos: 'none', gears: 6, ratio: 'normal', motors: 1 } },
  { id: 'cr_l62s', name: 'L62 V8 Kompressor',         lvl: 11, e: { type: 'v8', disp: 6.2, ind: 'super', mat: 'alu', exh: 'race', nos: 'none', gears: 6, ratio: 'normal', motors: 1 } },
  { id: 'cr_v10',  name: 'V10 5.2 Hochdrehzahl',      lvl: 14, e: { type: 'v10', disp: 5.2, ind: 'none', mat: 'titan', exh: 'race', nos: 'none', gears: 7, ratio: 'short', motors: 1 } },
  { id: 'cr_v12',  name: 'V12 6.5 Sauger',            lvl: 17, e: { type: 'v12', disp: 6.5, ind: 'none', mat: 'titan', exh: 'race', nos: 'none', gears: 7, ratio: 'normal', motors: 1 } },
  { id: 'cr_ev3',  name: 'E-Antrieb Tri-Motor',       lvl: 18, e: { type: 'ev', disp: 100, ind: 'none', mat: 'alu', exh: 'stock', nos: 'none', gears: 1, ratio: 'normal', motors: 3 } },
  { id: 'cr_w16',  name: 'W16 8.0 Quad-Turbo',        lvl: 24, e: { type: 'w16', disp: 8.0, ind: 'twin', mat: 'titan', exh: 'race', nos: 'none', gears: 7, ratio: 'long', motors: 1 } }
];
const crateFull = C => Object.assign(defaultEngine(), C.e, { name: C.name });
const cratePrice = C => Math.round(computeEngine(crateFull(C)).cost * 2.2 / 500) * 500;
ACTIONS.crateBuy = d => {
  const C = CRATE_ENGINES.find(x => x.id === d.v); if (!C) return;
  if (S.level < C.lvl) { toast(`Ab Level ${C.lvl}.`, 'bad'); return; }
  const price = cratePrice(C); if (S.money < price) { toast('Zu wenig Geld.', 'bad'); return; }
  confirmBox(`<b>${esc(C.name)}</b> für <b>${fmtMoney(price)}</b> kaufen? Der Motor steht danach in deiner Motorenliste und kann sofort in jedes Modell eingebaut werden.`, () => {
    S.money -= price;
    const e = crateFull(C); e.id = 'e' + Date.now().toString(36); S.engines.push(e); dynoMark(engKey(e));
    sfx('buy'); toast(`${ico('engine')} <b>${esc(C.name)}</b> gekauft – jetzt im Auto-Designer auswählbar.`, 'good', 5000);
    _carCache.clear(); rerender();
  }, 'Kaufen');
};
function cratePanelHTML() {
  return `<div class="panel"><h3>${ico('engine')}Fertigmotoren kaufen</h3>
    <div class="hint" style="margin-top:0">Fertig entwickelt, mit Herstellerangabe – keine Forschung nötig.</div>
    ${CRATE_ENGINES.map(C => { const c = computeEngine(crateFull(C)), p = cratePrice(C), lk = S.level < C.lvl;
      return `<div class="card" style="${lk ? 'opacity:.55' : ''}"><div class="flex"><b>${esc(C.name)}</b><span class="sp"></span><span class="tag">${ENGINE_TYPES[C.e.type].name}</span></div>
        <div class="hint" style="margin:2px 0">${c.ps} PS · ${c.nm} Nm · ${fmtNum(c.red)} U/min · ${c.weight} kg</div>
        <div class="flex"><span class="good">${fmtMoney(p)}</span><span class="sp"></span><button class="btn sm ${lk ? 'lock' : 'green'}" data-act="crateBuy" data-v="${C.id}" data-why="Ab Level ${C.lvl}">${lk ? 'Ab Lvl ' + C.lvl : 'Kaufen'}</button></div></div>`; }).join('')}
  </div>`;
}
