/* =============================================================================
   Teil 10g: Weltreise – Weltkarte + freie Fahrt
   Weltkarte mit Orten zum Anklicken. Dort fährt man frei durch das Land:
   endlose Strasse, die Gegend wechselt (Stadt, offenes Land, gespiegelte und
   neu gewürfelte Häuserreihen), Tag/Nacht, Verkehr, Münzen und Orte zum
   Entdecken (Sammelalbum mit Belohnungen).
   ============================================================================= */
ICONS.map = ['kkkkkkkk', 'kbbglbbk', 'kbgglbbk', 'kbbglgbk', 'kbbbggbk', 'kgbbbgbk', 'kggbbbbk', 'kkkkkkkk'];
let ROAM = null;
let TILE_SEED = 0;                                       // Varianten der Häuserreihen

const PLACES = [
  { id: 'samui',    lon: 100.0, lat: 9.5,  land: 'Thailand',   spots: ['Lamai Beach', 'Grossvater-Felsen', 'Nachtmarkt', 'Kokos-Plantage', 'Muay-Thai-Arena', 'Aussichtspunkt'] },
  { id: 'japan',    lon: 138.7, lat: 35.4, land: 'Japan',      spots: ['Fuji-Aussicht', 'Ramen-Gasse', 'Kirschblüten-Allee', 'Torii-Tor', 'Onsen-Dorf', 'Karaoke-Strasse'] },
  { id: 'vietnam',  lon: 105.8, lat: 21.0, land: 'Vietnam',    spots: ['Halong-Blick', 'Pho-Küche', 'Lampion-Gasse', 'Kaffee-Ecke', 'Rollerwerkstatt', 'Alter Markt'] },
  { id: 'cambodia', lon: 103.9, lat: 13.4, land: 'Kambodscha', spots: ['Tempeltor', 'Lotus-Teich', 'Nachtmarkt', 'Pfahldorf', 'Zuckerpalmen-Hain', 'Sonnenuntergang'] },
  { id: 'china',    lon: 116.4, lat: 39.9, land: 'China',      spots: ['Mauer-Blick', 'Teehaus', 'Laternen-Tor', 'Nudel-Gasse', 'Pagode', 'Feuerwerk-Platz'] },
  { id: 'swiss',    lon: 7.7,   lat: 46.0, land: 'Schweiz',    spots: ['Gipfel-Blick', 'Käserei', 'Bergsee', 'Talstation', 'Dorfkirche', 'Alp-Hütte'] },
  { id: 'sunset',   lon: -118.2, lat: 34.0, land: 'USA',       spots: ['Strand-Pier', 'Diner', 'Palmen-Boulevard', 'Tankstelle', 'Hollywood-Hügel', 'Skatepark'] },
  { id: 'desert',   lon: -111.0, lat: 36.0, land: 'USA',       spots: ['Tafelberg', 'Motel', 'Kakteen-Feld', 'Geisterstadt', 'Canyon-Blick', 'Route-Schild'] }
];
const placeById = id => PLACES.find(p => p.id === id);
const SPOT_GAP = 420;                                    // Meter zwischen den Sehenswürdigkeiten
const worldState = () => (S.world = S.world || { found: {}, coins: 0, visits: {}, km: 0 });

// ---------- Weltkarte (320x160) ----------
const LANDS = [[-100, 48, 30, 18], [-85, 60, 25, 10], [-150, 64, 18, 8], [-100, 30, 15, 10], [-88, 15, 6, 7], [-42, 72, 12, 8], [-75, 45, 10, 8],
  [-62, -10, 16, 18], [-68, -35, 8, 15], [-75, 5, 8, 8],
  [15, 52, 18, 10], [25, 60, 12, 8], [-4, 40, 6, 4], [12, 43, 3, 5], [-2, 54, 3, 4], [10, 62, 6, 6],
  [15, 8, 22, 18], [25, -18, 14, 14], [5, 28, 25, 8], [40, 5, 8, 10],
  [90, 55, 50, 15], [100, 35, 30, 12], [78, 20, 8, 10], [102, 12, 6, 8], [45, 24, 10, 8], [138, 36, 3, 6], [115, 32, 10, 10], [60, 40, 15, 8], [130, 48, 10, 8],
  [115, -3, 14, 4], [122, 10, 3, 6], [134, -25, 18, 10], [145, -38, 5, 3], [172, -42, 3, 5]];
let _worldMap = null;
function worldMapBase() {
  if (_worldMap) return _worldMap;
  const W = 320, H = 160, p = new PB(W, H);
  const land = (x, y) => { const lon = x / W * 360 - 180, lat = 90 - y / H * 180; if (lat < -68) return true; return LANDS.some(([a, b, rx, ry]) => ((lon - a) / rx) ** 2 + ((lat - b) / ry) ** 2 < 1 + (hash2(x >> 2, y >> 2) - 0.5) * 0.35); };
  const L = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) L[y * W + x] = land(x, y);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lat = 90 - y / H * 180, isL = L[y * W + x];
    let c;
    if (isL) {
      const coast = !L[y * W + x - 1] || !L[y * W + x + 1] || !L[(y - 1) * W + x] || !L[(y + 1) * W + x];
      c = Math.abs(lat) > 62 ? '#e8eef8' : (Math.abs(lat) > 15 && Math.abs(lat) < 33 && hash2(x >> 3, y >> 3) > 0.45) ? '#d8b878' : (hash2(x >> 1, y >> 1) > 0.7 ? '#3a8a46' : '#4a9a50');
      if (coast) c = shadeHex(c, -0.3);
    } else c = (x + y * 3) % 11 === 0 ? '#3b6ab8' : (y % 8 === 0 ? '#2e5aa8' : '#29509a');
    p.set(x, y, Chex(c));
  }
  return (_worldMap = p.canvas());
}
const mapXY = pl => [Math.round((pl.lon + 180) / 360 * 320), Math.round((90 - pl.lat) / 180 * 160)];
let WSEL = 'samui', WCAR = null, _wT = 0;
function drawWorldMap(t) {
  const cv = $('#worldcv'); if (!cv) return;
  const ctx = hdCtx(cv);
  ctx.drawImage(worldMapBase(), 0, 0);
  // Wellen-Glitzern
  for (let i = 0; i < 40; i++) { const x = Math.floor(hash2(i, 1) * 320), y = Math.floor(hash2(i, 2) * 160); if (Math.sin(t * 2 + i) > 0.85) { ctx.fillStyle = 'rgba(200,230,255,0.7)'; ctx.fillRect(x, y, 2, 0.5); } }
  // Flugroute zum gewählten Ort (von der Heimat-Garage in der Schweiz)
  const home = [Math.round((8.5 + 180) / 360 * 320), Math.round((90 - 47.4) / 180 * 160)], sel = placeById(WSEL), [sx, sy] = mapXY(sel);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.setLineDash([2, 2]); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(home[0], home[1]); ctx.quadraticCurveTo((home[0] + sx) / 2, Math.min(home[1], sy) - 25, sx, sy); ctx.stroke(); ctx.setLineDash([]);
  const ph = (t * 0.25) % 1, bx = (1 - ph) ** 2 * home[0] + 2 * (1 - ph) * ph * (home[0] + sx) / 2 + ph * ph * sx, by = (1 - ph) ** 2 * home[1] + 2 * (1 - ph) * ph * (Math.min(home[1], sy) - 25) + ph * ph * sy;
  ctx.fillStyle = '#f4f4f4'; ctx.fillRect(Math.round(bx) - 2, Math.round(by), 5, 1); ctx.fillRect(Math.round(bx), Math.round(by) - 1, 1, 3);
  // Orte
  const ws = worldState();
  for (const pl of PLACES) {
    const [x, y] = mapXY(pl), on = pl.id === WSEL, locked = S.level < (TRACKS[pl.id].lvl || 1), bob = on ? Math.round(Math.sin(t * 5) * 1.5) : 0;
    const done = ((ws.found[pl.id] || []).length) >= pl.spots.length;
    if (on) { ctx.strokeStyle = 'rgba(255,205,117,' + (0.5 + 0.5 * Math.sin(t * 4)).toFixed(2) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 6 + Math.sin(t * 4), 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#0d0f1a'; ctx.fillRect(x - 3, y - 9 + bob, 7, 7); ctx.fillRect(x, y - 2 + bob, 1, 2);
    ctx.fillStyle = locked ? '#566c86' : done ? '#a7f070' : on ? '#ffcd75' : '#ff5068'; ctx.fillRect(x - 2, y - 8 + bob, 5, 5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 7 + bob, 1, 1);
    if (on) cxText(ctx, TRACKS[pl.id].name.split(' – ')[0].toUpperCase(), x, y - 16 + bob, '#ffcd75', 1, 'c', '#000');
  }
  ctx.fillStyle = '#ff5068'; ctx.fillRect(home[0] - 1, home[1] - 1, 3, 3);
}
function worldPick(ev) {
  const cv = $('#worldcv'), r = cv.getBoundingClientRect(), mx = (ev.clientX - r.left) / r.width * 320, my = (ev.clientY - r.top) / r.height * 160;
  let best = null, bd = 18;
  for (const pl of PLACES) { const [x, y] = mapXY(pl), d = Math.hypot(mx - x, my - (y - 5)); if (d < bd) { bd = d; best = pl; } }
  if (best) { WSEL = best.id; sfx('click'); rerender(); }
}

TABS.world = {
  title: 'Weltreise', icon: 'map',
  render(el) {
    const ws = worldState(), pl = placeById(WSEL), T = TRACKS[pl.id], locked = S.level < (T.lvl || 1), found = ws.found[pl.id] || [];
    if (!WCAR || !raceEntry(WCAR)) WCAR = S.models[0].id;
    const total = PLACES.reduce((a, p) => a + p.spots.length, 0), totalFound = PLACES.reduce((a, p) => a + (ws.found[p.id] || []).length, 0);
    el.innerHTML = `<h2 class="title">${ico('map', 'big')} Weltreise</h2>
      <div class="panel dark" style="padding:6px"><canvas id="worldcv" width="320" height="160" class="cv" style="cursor:pointer"></canvas>
        <div class="opts" style="margin:6px 2px 2px">${PLACES.map(p => { const lk = S.level < (TRACKS[p.id].lvl || 1); return `<button class="btn sm ${p.id === WSEL ? 'sel' : ''}" data-act="wsel" data-v="${p.id}">${lk ? '🔒 ' : ''}${esc(TRACKS[p.id].name.split(' – ')[0])}</button>`; }).join('')}</div>
        <div class="hint" style="margin:4px">Wähle einen Ort auf der Karte oder in der Liste. Dort kannst du frei herumfahren und Sehenswürdigkeiten entdecken.</div></div>
      <div class="row">
        <div class="col">
          <div class="panel"><h3>${ico('star')}${esc(T.name)}</h3>
            <div class="hint" style="color:var(--text)">${esc(pl.land)} · ${esc(T.desc)}</div>
            <div class="lbl">Sehenswürdigkeiten (${found.length}/${pl.spots.length})</div>
            <div class="opts">${pl.spots.map((s, i) => `<span class="tag ${found.includes(i) ? 'g' : ''}">${found.includes(i) ? '✓ ' + esc(s) : '?'.repeat(Math.min(8, s.length))}</span>`).join('')}</div>
            <div class="lbl">Dein Auto</div>
            <select data-inp="wcar" style="width:100%">${raceOptions(WCAR)}</select>
            <div class="flex" style="margin-top:8px"><button class="btn ${locked ? 'lock' : 'green big'}" data-act="roamGo" data-why="Ab Level ${T.lvl}">Losfahren ›</button>
              ${locked ? `<span class="warn">Ab Level ${T.lvl}</span>` : ''}</div>
            <div class="hint">Offene Welt: fahr frei durch die Stadt. <b>↑ / W</b> Gas · <b>↓ / S</b> Bremse und Rückwärts · <b>← →</b> lenken · <b>Leertaste</b> Handbremse zum Driften · <b>Shift</b> Nitro (wenn das Auto NOS hat) · <b>N</b> Tag/Nacht · <b>Esc</b> zurück. Die Minikarte zeigt die Sehenswürdigkeiten (★).</div>
          </div>
        </div>
        <div class="col">
          <div class="panel"><h3>${ico('trophy')}Reise-Album</h3>
            <div class="grid2"><div>Entdeckt</div><div>${totalFound} / ${total}</div><div>Gesammelte Münzen</div><div>${fmtNum(ws.coins || 0)}</div><div>Gefahrene Strecke</div><div>${(ws.km || 0).toFixed(1)} km</div></div>
            ${PLACES.map(p => { const f = (ws.found[p.id] || []).length; return `<div class="flex" style="margin:3px 0"><span style="min-width:140px">${esc(TRACKS[p.id].name)}</span><div class="pbar" style="flex:1"><i style="width:${f / p.spots.length * 100}%"></i><em>${f}/${p.spots.length}</em></div></div>`; }).join('')}
            <div class="hint">Jede neue Sehenswürdigkeit gibt XP und Geld. Wer ein Land komplett entdeckt, bekommt 25 Diamanten.</div>
          </div>
        </div>
      </div>`;
    const cv = $('#worldcv'); cv.addEventListener('click', worldPick);
    _wT = 0; drawWorldMap(0);
  },
  tick(dt) { _wT += dt; drawWorldMap(_wT); }
};
INPUTS.wcar = el => { WCAR = el.value; };
ACTIONS.wsel = d => { WSEL = d.v; rerender(); };
const roamNight = R => clamp((Math.cos((R.tod - 0.5) * Math.PI * 2) * -1 - 0.15) * 1.8, 0, 1);
function roamToggleNight() { if (!ROAM) return; ROAM.tod = roamNight(ROAM) > 0.5 ? 0.5 : 0.0; }
/** offenes Land: Felder/Wiesen mit den typischen Bäumen des Landes (192x34) */
const RURAL = { japan: ['#6aa050', 'sakura', '#5a9a4a'], vietnam: ['#7ab850', 'palm', '#6aa848'], cambodia: ['#8aa848', 'palm', '#6a9a88'], china: ['#6a9a50', 'bamboo', '#5a8a46'],
  swiss: ['#5aaa50', 'pine', '#4a9a46'], samui: ['#7ab060', 'palm', '#6aa858'], sunset: ['#9aa868', 'palm', '#8a9a5a'], desert: ['#d8b078', null, '#c8a068'] };
function ruralTile(id, fr) {
  const [g, tree, g2] = RURAL[id] || RURAL.sunset, W = 192, H = 34, p = new PB(W, H);
  for (let x = 0; x < W; x++) {
    const hb = Math.round(14 + 2 * Math.sin(x * 0.05) + hash2(x >> 3, 1) * 2);
    for (let y = hb; y < H; y++) p.set(x, y, Chex((y - hb) % 5 === 0 ? g2 : (hash2(x >> 1, y) > 0.85 ? shadeHex(g, -0.12) : g)));   // Felder mit Furchen/Wasserstreifen
  }
  for (let k = 0; k < 9; k++) { const x = 8 + k * 21 + Math.floor(hash2(k, id.length) * 10); if (tree && hash2(k, 7) > 0.3) pbTree(p, x, 22 + Math.floor(hash2(k, 8) * 4), tree, fr, k + 40); }
  if (id === 'desert') for (let k = 0; k < 6; k++) { const x = 15 + k * 30; p.rect(x, 18, 2, 8, Chex('#3a7a3a')); p.rect(x - 2, 20, 2, 1, Chex('#3a7a3a')); p.rect(x - 2, 18, 1, 2, Chex('#3a7a3a')); p.rect(x + 2, 21, 2, 1, Chex('#3a7a3a')); p.rect(x + 3, 19, 1, 2, Chex('#3a7a3a')); }
  const hx = 60 + Math.floor(hash2(id.length, 3) * 60);                                     // kleines Bauernhaus
  p.rect(hx, 14, 10, 7, Chex('#e8dcc8')); for (let k = 0; k < 12; k++) p.rect(hx - 1 + k, 12 + Math.abs(k - 5.5) * 0.4 | 0, 1, 2, Chex('#8a4a3a'));
  p.rect(hx + 3, 16, 3, 3, Chex(fr ? '#ffe8a0' : '#29366f'));
  return p.canvas();
}
ACTIONS.roamGo = () => { const T = TRACKS[WSEL]; if (S.level < (T.lvl || 1)) return; owStart(WSEL, WCAR); };

// =============================================================================
// Freie Fahrt
// =============================================================================
const ROAM_H = 150;                                      // Unterkante der Strasse (HUD darunter)
function roamStart(placeId, carId) {
  const en = raceEntry(carId); if (!en) return;
  const T = TRACKS[placeId];
  const bg = _raceBGCache[placeId] || (_raceBGCache[placeId] = buildRaceBG(placeId));
  // zusätzliche Häuser-Varianten für Abwechslung
  const TH = THEMES[T.scene];
  if (!bg.rural) bg.rural = [0, 1].map(fr => ruralTile(placeId, fr));
  if (TH && !bg.variants) { bg.variants = [0, 1, 2].map(sd => { TILE_SEED = sd * 37; const v = [0, 1].map(fr => TH.tile(fr)); TILE_SEED = 0; return v; }); }
  const car = computeCar(en.design, en.engine);
  ROAM = { place: placeById(placeId), T, bg, en, car, veh: new Vehicle(car), x: 40, rev: 0, dir: 1, t: 0, tod: 0.42, inp: { gas: false, brake: false, left: false, right: false }, last: performance.now(), raf: 0,
    view: '3d', z: 0, px: 0.45, steer: 0, seed: hash2(placeId.length * 7 + placeId.charCodeAt(0), 3) * 6, cars: Array.from({ length: 8 }, (_, i) => ({ z: 70 + i * 45 + Math.random() * 30, lane: i % 2 ? -0.5 : 0.5, v: 9 + Math.random() * 12, d: (OPPONENTS[(i + 2) % OPPONENTS.length]).design })),
    coins: new Set(), traffic: Array.from({ length: 6 }, (_, i) => ({ x: 40 + i * 70 + Math.random() * 40, v: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 10), d: (OPPONENTS[i % OPPONENTS.length]).design })), msg: '', msgT: 0, gotCoins: 0 };
  ROAM.veh.launched = true; ROAM.veh.locked = true;
  const ws = worldState(); ws.visits[placeId] = (ws.visits[placeId] || 0) + 1;
  const el = document.createElement('div'); el.id = 'roam';
  el.innerHTML = `<div class="rtop"><span class="hf" style="font-size:10px;color:var(--yellow)">${esc(T.name)} · ${esc(en.name)}</span><span class="sp"></span>
      <button class="btn sm" id="ro-view">Ansicht: Hinten</button><button class="btn sm" id="ro-night">Tag/Nacht</button><button class="btn sm yellow" id="ro-photo">Foto</button><button class="btn sm gray" id="ro-mute">Ton</button><button class="btn sm red" id="ro-exit">Zur Karte</button></div>
    <canvas id="roamcv" width="320" height="180"></canvas>
    <div class="rctl"><button class="rbtn" data-roam="left">◀</button><button class="rbtn" data-roam="right">▶</button><button class="rbtn" data-roam="brake">BREMSE</button><button class="rbtn gas" data-roam="gas">GAS</button></div>`;
  document.body.appendChild(el);
  $$('[data-roam]', el).forEach(b => {
    const k = b.dataset.roam, on = e => { e.preventDefault(); ROAM.inp[k] = true; b.classList.add('on'); roamAudio(); }, off = e => { e.preventDefault(); ROAM.inp[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  $('#ro-exit').onclick = roamEnd;
  $('#ro-night').onclick = roamToggleNight;
  $('#ro-view').onclick = e => { const R = ROAM; R.view = R.view === '3d' ? 'side' : '3d'; e.target.textContent = 'Ansicht: ' + (R.view === '3d' ? 'Hinten' : 'Seite'); if (R.view === 'side') { R.x = Math.max(40, R.z); R.coins = new Set(); } else { R.z = R.x; R.coins = new Set(); } e.target.blur(); };
  $('#ro-mute').onclick = () => { ROAM.muted = !ROAM.muted; };
  $('#ro-photo').onclick = roamPhoto;
  roamMsg(`Willkommen in ${T.name.split(' – ')[1] || T.name}!`, 3);
  ROAM.raf = requestAnimationFrame(roamLoop);
}
function roamEnd() {
  const R = ROAM; if (!R) return;
  cancelAnimationFrame(R.raf);
  if (R.V) { try { R.V.out.gain.value = 0; R.V.nodes.forEach(n => n.stop()); } catch (e) { /* egal */ } }
  worldState().km += Math.abs(R.x - 40) / 1000;
  ROAM = null; const el = $('#roam'); if (el) el.remove();
  saveGame(); updateTopbar(true); if (curTab === 'world') rerender();
}
function roamMsg(t, d = 2) { ROAM.msg = t; ROAM.msgT = d; }
function roamPhoto() {
  const cv = $('#roamcv'); if (!cv) return;
  try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `AutoTycoon_${ROAM.place.id}_${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); roamMsg('Foto gespeichert!', 1.5); sfx('click'); }
  catch (e) { roamMsg('Foto nicht möglich', 1.5); }
}
function roamAudio() {
  const R = ROAM; if (!R || R.V) return;
  try { AUD = AUD || new (window.AudioContext || window.webkitAudioContext)(); if (AUD.state === 'suspended') AUD.resume(); R.V = makeVoice(R.car.E, R.en.engine, 0.06, 0); } catch (e) { R.V = null; }
}
window.addEventListener('keydown', e => {
  if (!ROAM || OW) return;
  const k = e.key, I = ROAM.inp;
  if (ROAM.view === '3d') {
    const map = { ArrowUp: 'gas', w: 'gas', W: 'gas', ' ': 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
    if (map[k]) { I[map[k]] = true; roamAudio(); e.preventDefault(); e.stopImmediatePropagation(); return; }
  }
  if (['ArrowRight', 'd', 'D', ' '].includes(k)) { ROAM.inp.gas = true; roamAudio(); e.preventDefault(); e.stopImmediatePropagation(); }
  else if (['ArrowLeft', 'a', 'A'].includes(k)) { ROAM.inp.brake = true; roamAudio(); e.preventDefault(); e.stopImmediatePropagation(); }
  else if (k === 'n' || k === 'N') roamToggleNight();
  else if (k === 'Escape') roamEnd();
}, true);
window.addEventListener('keyup', e => {
  if (!ROAM || OW) return;
  const I = ROAM.inp;
  if (ROAM.view === '3d') { const map = { ArrowUp: 'gas', w: 'gas', W: 'gas', ' ': 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }; if (map[e.key]) I[map[e.key]] = false; return; }
  if (['ArrowRight', 'd', 'D', ' '].includes(e.key)) I.gas = false;
  if (['ArrowLeft', 'a', 'A'].includes(e.key)) I.brake = false;
}, true);

function roamLoop() {
  const R = ROAM; if (!R) return;
  R.raf = requestAnimationFrame(roamLoop);
  const now = performance.now(), dt = clamp((now - R.last) / 1000, 0, 0.05); R.last = now;
  try { if (R.view === '3d') { roam3dStep(dt); drawRoam3d(); } else { roamStep(dt); drawRoam(); } } catch (e) { if (!R.err) { R.err = 1; console.error('Freie Fahrt:', e); } }
}
function roamStep(dt) {
  const R = ROAM, v = R.veh, E = R.car.E, I = R.inp;
  R.t += dt; R.tod = (R.tod + dt / 240) % 1;                                     // ein Tag = 4 Minuten
  if (R.msgT > 0) R.msgT -= dt;
  // Fahren: Gas = vorwärts, Bremse = bremsen und danach rückwärts
  if (R.rev > 0) { if (I.brake) R.rev = Math.min(9, R.rev + 5 * dt); else R.rev = Math.max(0, R.rev - 10 * dt); if (I.gas) R.rev = Math.max(0, R.rev - 14 * dt); }
  if (R.rev <= 0) {
    for (let i = 0; i < 4; i++) v.step(dt / 4, { thr: I.gas ? 1 : 0, clutch: false });
    if (!I.gas) v.v = Math.max(0, v.v - (I.brake ? 16 : 1.2) * dt);
    if (!E.isEV && v.rpm >= E.red * 0.95 && v.shiftT <= 0 && v.gear < E.ratios.length) v.shiftUp();
    if (!E.isEV && v.gear > 1 && v.rpm < E.idle * 1.6 && v.shiftT <= 0) v.shiftDown();
    if (v.v < 0.05 && I.brake && !I.gas) R.rev = 0.5;
    if (!E.isEV) v.rpm = Math.max(v.rpm, E.idle);
  }
  const speed = R.rev > 0 ? -R.rev : v.v;
  R.x = Math.max(0, R.x + speed * dt);
  // Verkehr auf der Gegenfahrbahn
  for (const c of R.traffic) { c.x += c.v * dt; if (c.x < R.x - 40) c.x = R.x + 30 + Math.random() * 30; if (c.x > R.x + 40) c.x = R.x - 30 - Math.random() * 20; }
  // Münzen alle ~55 m
  const ci = Math.round((R.x - 20) / 55), cx = 20 + ci * 55;
  if (ci > 0 && Math.abs(R.x - cx) < 1.6 && !R.coins.has(ci)) {
    R.coins.add(ci); R.gotCoins++; const ws = worldState(); ws.coins = (ws.coins || 0) + 1;
    const m = 50 * S.level; S.money += m; sfx('buy'); roamMsg(`+${fmtMoney(m)}`, 0.8);
  }
  // Sehenswürdigkeiten
  const P = R.place, si = Math.round((R.x - 260) / SPOT_GAP), sx = 260 + si * SPOT_GAP;
  if (si >= 0 && Math.abs(R.x - sx) < 6) {
    const k = si % P.spots.length, ws = worldState(), F = ws.found[P.id] = ws.found[P.id] || [];
    if (!F.includes(k)) {
      F.push(k); addXP(120 * S.level); const m = 1500 * S.level; S.money += m; sfx('goal');
      toast(`${ico('star', 'big')} <div><b>Entdeckt: ${esc(P.spots[k])}</b><br>+${fmtMoney(m)} · ${F.length}/${P.spots.length} in ${esc(R.T.name)}</div>`, 'good', 5000);
      if (F.length === P.spots.length) { S.gems = (S.gems || 0) + 25; toast(`${ico('gem', 'big')} <b>${esc(R.T.name)} komplett entdeckt!</b> +25 Diamanten`, 'good', 6000); }
      roamMsg('ENTDECKT: ' + P.spots[k].toUpperCase(), 2.5);
    }
  }
  // Motorsound
  if (R.V && AUD) voiceUpdate(R.V, v, I.gas ? 1 : 0.15, R.muted || !SFX.on, AUD.currentTime);
}

function drawRoam() {
  const R = ROAM, cv = $('#roamcv'); if (!cv) return;
  const ctx = hdCtx(cv), bg = R.bg, T = R.T, TH = THEMES[T.scene], t = R.t;
  const camX = R.x - 150 / PPM, W = x => Math.round((x - camX) * PPM);
  const night = roamNight(R);                                                 // 0 = Tag, 1 = Nacht
  ctx.drawImage(bg.sky, 0, 0);
  if (TH && TH.landmark) TH.landmark(ctx, t);
  if (night > 0) {                                                             // Nachthimmel mit Sternen
    ctx.fillStyle = `rgba(6,8,26,${(night * 0.85).toFixed(2)})`; ctx.fillRect(0, 0, RW_, 80);
    for (let i = 0; i < 60; i++) if (hash2(i, 9) * 1.2 < night) { ctx.fillStyle = Math.sin(t * 3 + i) > 0.7 ? '#ffffff' : '#94b0c2'; ctx.fillRect(Math.floor(hash2(i, 1) * RW_), Math.floor(hash2(i, 2) * 40), 1, 1); }
  }
  const sl = -((camX * PPM * 0.05) % RW_);
  ctx.drawImage(bg.skyline, Math.round(sl), 10); ctx.drawImage(bg.skyline, Math.round(sl) + RW_, 10);
  // Häuserreihen: Viertel wechseln zwischen Stadt und offenem Land, Häuser gespiegelt/variiert
  if (TH) {
    const base = camX * PPM * 0.35, n0 = Math.floor(base / 192), fr = night > 0.45 ? 1 : 0;
    for (let n = n0 - 1; n <= n0 + 2; n++) {
      const dz = Math.floor(n / 4), xo = Math.round(n * 192 - base);
      if (hash2(dz, 501) < 0.3) { ctx.drawImage(bg.rural[fr], xo, 34); continue; }   // offenes Land
      const variant = bg.variants ? bg.variants[Math.floor(hash2(n, 502) * bg.variants.length)] : bg.stands;
      const img = variant[fr], x = Math.round(n * 192 - base);
      if (hash2(n, 503) > 0.5) { ctx.save(); ctx.translate(x + 192, 34); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
      else ctx.drawImage(img, x, 34);
    }
  }
  else { const base = camX * PPM * 0.35, n0 = Math.floor(base / 192); for (let n = n0 - 1; n <= n0 + 2; n++) ctx.drawImage(bg.rural[night > 0.45 ? 1 : 0], Math.round(n * 192 - base), 34); }
  // Gehweg/Mauer + Schilder
  const TW = T.wall || ['#94b0c2', '#c8ccd4', '#566c86'];
  ctx.fillStyle = TW[0]; ctx.fillRect(0, 66, RW_, 9); ctx.fillStyle = TW[1]; ctx.fillRect(0, 66, RW_, 1); ctx.fillStyle = TW[2]; ctx.fillRect(0, 74, RW_, 1);
  const ads = (TH && TH.ads) || T.ads || ['DRIVE IN', 'MOTEL', 'GAS', 'DINER'];
  for (let i = Math.floor(camX / 30) - 1; i < camX / 30 + RW_ / PPM / 30 + 1; i++) {
    if (hash2(i, 510) < 0.5) continue;
    const x = W(i * 30), txt = ads[Math.floor(hash2(i, 511) * ads.length)], w = textW(txt) + 8;
    ctx.fillStyle = ['#b13e53', '#3b5dc9', '#38b764', '#29366f', '#ef7d57'][Math.floor(hash2(i, 512) * 5)]; ctx.fillRect(x, 67, w, 7); cxText(ctx, txt, x + 4, 68, '#f4f4f4');
  }
  // Strasse (zwei Spuren, Mittellinie)
  const ao = -(((camX * PPM) % 64) + 64) % 64;
  for (let x = Math.round(ao) - 64; x < RW_; x += 64) { ctx.drawImage(bg.asph, x, 75, 64, 40); ctx.drawImage(bg.asph, x, 112, 64, ROAM_H - 112); }
  for (let i = Math.floor(camX / 4); i < camX / 4 + RW_ / PPM / 4 + 1; i++) { if (i % 2) continue; ctx.fillStyle = '#e8d44d'; ctx.fillRect(W(i * 4), 98, 30, 1); }
  ctx.fillStyle = '#c8ccd4'; ctx.fillRect(0, ROAM_H - 2, RW_, 2);
  if (TH && TH.front) TH.front(ctx, W, camX, t);
  // Sehenswürdigkeit: Wegweiser mit Namen
  const P = R.place;
  for (let si = Math.floor((camX - 260) / SPOT_GAP); si <= Math.floor((camX + 25 - 260) / SPOT_GAP) + 1; si++) {
    if (si < 0) continue;
    const sx = W(260 + si * SPOT_GAP); if (sx < -60 || sx > RW_ + 60) continue;
    const k = si % P.spots.length, found = (worldState().found[P.id] || []).includes(k), name = P.spots[k].toUpperCase();
    ctx.fillStyle = '#3a3e48'; ctx.fillRect(sx, 52, 2, 23);
    const w = textW(name) + 10, bob = Math.round(Math.sin(t * 3) * 1);
    ctx.fillStyle = '#0d0f1a'; ctx.fillRect(sx - w / 2 - 1, 41 + bob, w + 2, 11); ctx.fillStyle = found ? '#38b764' : '#d4a640'; ctx.fillRect(sx - w / 2, 42 + bob, w, 9);
    cxText(ctx, (found ? '' : '★ ') + name, sx + 1, 44 + bob, '#ffffff', 1, 'c');
  }
  // Gegenverkehr (obere Spur)
  for (const c of R.traffic) {
    const s = renderCar(c.d, { lights: night > 0.4 }), x0 = W(c.x) - s.W / 2, y0 = 92 - s.gy;
    if (x0 > RW_ + 10 || x0 + s.W < -10) continue;
    if (c.v < 0) { ctx.save(); ctx.translate(x0 + s.W, y0); ctx.scale(-1, 1); ctx.drawImage(s.cv, 0, 0, s.W, s.H); ctx.restore(); } else ctx.drawImage(s.cv, x0, y0, s.W, s.H);
  }
  // Münzen
  for (let ci = Math.floor((camX - 20) / 55); ci <= Math.floor((camX + 20 - 20) / 55) + 1; ci++) {
    if (ci <= 0 || R.coins.has(ci)) continue;
    const x = W(20 + ci * 55), sp = Math.abs(Math.cos(t * 4 + ci)), y = 108 + Math.sin(t * 3 + ci) * 2;
    ctx.fillStyle = '#8a6a10'; ctx.fillRect(Math.round(x - 3 * sp), Math.round(y) - 3, Math.max(1, Math.round(6 * sp)), 7);
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(Math.round(x - 2 * sp), Math.round(y) - 2, Math.max(1, Math.round(4 * sp)), 5);
  }
  // Spielerauto (untere Spur)
  const v = R.veh, a = ((v.wheelAng % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), aq = Math.floor(a / (Math.PI * 2) * 16) / 16 * Math.PI * 2;
  const s = renderCar(R.en.design, { angle: R.rev > 0 ? 0 : aq, brake: R.inp.brake, lights: night > 0.35, exh: R.en.engine.exh, brand: R.en.brand || S.company });
  const x0 = 150 - (s.ox + s.L) + Math.round(s.L / 2), y0 = 128 - s.gy + (v.v > 1 ? Math.round(Math.sin(t * 30) * 0.3) : 0);
  ctx.drawImage(s.cv, x0, y0, s.W, s.H);
  if (night > 0.35) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightCone('head'), x0 + s.ox + s.L, y0 + s.gy - Math.round(BODIES[R.en.design.body].head[1] + 1) - 16, 70, 32); ctx.restore(); }
  if (TH && TH.ambient) TH.ambient(ctx, camX, t);
  // Nacht: dunkler, Laternen leuchten
  if (night > 0) {
    ctx.fillStyle = `rgba(6,10,30,${(night * 0.45).toFixed(2)})`; ctx.fillRect(0, 30, RW_, ROAM_H - 30);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = Math.floor(camX / 20) - 1; i < camX / 20 + RW_ / PPM / 20 + 1; i++) { const x = W(i * 20 + 5); ctx.globalAlpha = night; ctx.drawImage(lightCone('flood'), x - 30, 60, 60, 90); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // HUD
  ctx.fillStyle = '#14161f'; ctx.fillRect(0, ROAM_H, RW_, RH_ - ROAM_H); ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, ROAM_H, RW_, 2);
  const kmh = Math.round((R.rev > 0 ? R.rev : v.v) * 3.6), found = (worldState().found[P.id] || []).length;
  cxText(ctx, String(kmh), 40, ROAM_H + 7, '#73eff7', 3, 'r'); cxText(ctx, 'KM/H', 44, ROAM_H + 13, '#566c86', 1, 'l');
  cxText(ctx, R.rev > 0 ? 'R' : R.car.E.isEV ? 'D' : String(v.gear), 82, ROAM_H + 7, '#ffcd75', 3, 'c');
  cxText(ctx, `${((R.x - 40) / 1000).toFixed(2)} KM`, 130, ROAM_H + 8, '#f4f4f4', 1, 'l');
  cxText(ctx, `★ ${found}/${P.spots.length}`, 200, ROAM_H + 8, '#a7f070', 1, 'l');
  cxText(ctx, `● ${R.gotCoins}`, 250, ROAM_H + 8, '#ffcd75', 1, 'l');
  const nextSpot = Math.max(0, Math.ceil((R.x - 260) / SPOT_GAP)) * SPOT_GAP + 260 - R.x;
  cxText(ctx, `NÄCHSTER ORT IN ${Math.max(0, Math.round(nextSpot))} M →`, RW_ / 2, ROAM_H + 20, '#94b0c2', 1, 'c');
  if (R.msgT > 0) cxText(ctx, R.msg, RW_ / 2, 22, '#ffcd75', R.msg.length > 16 ? 2 : 3, 'c', '#000');
}
