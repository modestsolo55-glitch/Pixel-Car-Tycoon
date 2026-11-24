/* =============================================================================
   Teil 10j: Offene Welt – freies Herumfahren in einer Stadt pro Land
   Schräg-von-oben-Ansicht (Dächer + Fassaden aus den Länder-Kulissen), Strassen-
   netz mit Kreuzungen, Parks, Wasser/Strand, Verkehr, Fussgänger, Münzen,
   Sehenswürdigkeiten, Minikarte, Tag/Nacht, Kirschblüten (Japan), Fuji am
   Nordrand. Steuerung: ↑/W Gas · ↓/S Bremse/Rückwärts · ←/→ bzw. A/D lenken ·
   Leertaste Handbremse (Drift).
   ============================================================================= */
const TS = 16, MW = 256, MH = 256;                         // Kachelgrösse (px), Kartengrösse (Kacheln)
const G = { GRASS: 0, ROAD: 1, WALK: 2, BLD: 3, WATER: 4, SAND: 5, PARK: 6, FIELD: 7, PLAZA: 8 };
const OW_VIEW_H = 150, OW_PX_PER_M = 3.2;                // Weltpixel pro Meter
let OW = null;
const OW_CACHE = {};                                     // einmal gebaute Städte bleiben im Speicher

const OW_STYLE = {
  japan:    { roof: ['#3a4058', '#4a5070', '#2e3448'], wall: '#f0e8d8', grass: '#6aa050', tree: 'sakura', water: 'river', lamp: '#ff5040' },
  vietnam:  { roof: ['#c86a40', '#a8acb8', '#d8a060', '#8a6a5a'], wall: '#f4d06a', grass: '#7ab850', tree: 'palm', water: 'bay', lamp: '#ffcd75' },
  cambodia: { roof: ['#a8acb8', '#8a8e98', '#b87a50'], wall: '#9a6a3a', grass: '#8aa848', tree: 'palm', water: 'moat', lamp: '#ffcd75' },
  china:    { roof: ['#2a6a48', '#3a7a58', '#b02828'], wall: '#e8dcc8', grass: '#6a9a50', tree: 'bamboo', water: 'canal', lamp: '#ff3030' },
  swiss:    { roof: ['#5a3a2a', '#6a4632', '#7a5038'], wall: '#a06a3a', grass: '#5aaa50', tree: 'pine', water: 'lake', lamp: '#ffe0a0' },
  samui:    { roof: ['#c8503a', '#d87a3a', '#b8a070'], wall: '#f4c87a', grass: '#7ab060', tree: 'palm', water: 'sea', lamp: '#ffcd75' },
  sunset:   { roof: ['#c8c4bc', '#a8a49c', '#d8b090'], wall: '#e8d8c0', grass: '#9aa868', tree: 'palm', water: 'ocean', lamp: '#ffe0a0' },
  desert:   { roof: ['#d8c0a0', '#c8a880', '#b89870'], wall: '#e0c8a0', grass: '#d8b078', tree: null, water: null, lamp: '#ffe0a0' }
};

// ---------- Kartengenerator ----------
function owGenerate(id) {
  const st = OW_STYLE[id] || OW_STYLE.sunset, r = seededRand('ow' + id), ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const m = new Uint8Array(MW * MH), at = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? G.WATER : m[y * MW + x], set = (x, y, v) => { if (x >= 0 && y >= 0 && x < MW && y < MH) m[y * MW + x] = v; };
  if (id === 'desert') m.fill(G.SAND);
  const water = (x, y) => set(x, y, G.WATER);
  // Wasser je nach Land (relativ zur Kartengrösse)
  if (st.water === 'sea') { for (let y = 0; y < MH; y++) { const e = MW - 22 + Math.round(Math.sin(y * 0.06) * 4 + Math.sin(y * 0.17) * 1.5); for (let x = e; x < MW; x++) water(x, y); for (let x = e - 4; x < e; x++) set(x, y, G.SAND); } }
  if (st.water === 'ocean') { for (let y = 0; y < MH; y++) { const e = 20 + Math.round(Math.sin(y * 0.05) * 4); for (let x = 0; x < e; x++) water(x, y); for (let x = e; x < e + 4; x++) set(x, y, G.SAND); } }
  if (st.water === 'bay') { for (let x = 0; x < MW; x++) { const e = MH - 24 + Math.round(Math.sin(x * 0.045) * 6); for (let y = e; y < MH; y++) water(x, y); for (let y = e - 3; y < e; y++) set(x, y, G.SAND); } for (let k = 0; k < 14; k++) { const cx = ri(5, MW - 5), cy = ri(MH - 14, MH - 3), rr = ri(1, 3); for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) if (dx * dx + dy * dy <= rr * rr) set(cx + dx, cy + dy, G.PARK); } }
  if (st.water === 'river' || st.water === 'canal') { let x = Math.round(MW * (st.water === 'river' ? 0.32 : 0.62)); for (let y = 0; y < MH; y++) { if (st.water === 'river') x += Math.round(Math.sin(y * 0.08) * 0.9); for (let k = 0; k < 4; k++) water(x + k, y); } }
  if (st.water === 'lake') { for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (((x - MW * 0.74) / (MW * 0.15)) ** 2 + ((y - MH * 0.22) / (MH * 0.11)) ** 2 < 1 + (hash2(x >> 2, y >> 2) - 0.5) * 0.2) water(x, y); }
  if (st.water === 'moat') { const x0 = Math.round(MW * 0.38), x1 = Math.round(MW * 0.62), y0 = Math.round(MH * 0.1), y1 = Math.round(MH * 0.34); for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (x < x0 + 3 || x > x1 - 4 || y < y0 + 3 || y > y1 - 4) water(x, y); }
  // Siedlungen: Hauptstadt + Dörfer
  const towns = [{ cx: Math.round(MW / 2 + ri(-12, 12)), cy: Math.round(MH / 2 + ri(-12, 12)), r: 62 }];
  for (let k = 0; k < 6; k++) { for (let tries = 0; tries < 50; tries++) { const cx = ri(20, MW - 20), cy = ri(20, MH - 20); if (at(cx, cy) === G.WATER) continue; if (towns.every(t => Math.hypot(t.cx - cx, t.cy - cy) > t.r + 34)) { towns.push({ cx, cy, r: ri(18, 28) }); break; } } }
  const townAt = (x, y) => towns.some(t => Math.hypot(x - t.cx, y - t.cy) < t.r);
  // Strassennetz: Gitter in den Siedlungen, Landstrassen dazwischen, Ringstrasse aussen
  const bridge = new Uint8Array(MW * MH);
  const road = (x, y) => { const t = at(x, y); if (t === G.WATER && !(st.water === 'river' || st.water === 'canal' || st.water === 'moat' || st.water === 'lake')) return; if (t === G.WATER && x >= 0 && y >= 0 && x < MW && y < MH) bridge[y * MW + x] = 1; set(x, y, G.ROAD); };
  const roadsX = [], roadsY = [];
  for (let v = 6; v < MW - 6; v += ri(11, 15)) roadsX.push(v);
  for (let v = 6; v < MH - 6; v += ri(11, 15)) roadsY.push(v);
  for (const ry of roadsY) for (let i = 0; i < roadsX.length - 1; i++) {
    const midX = (roadsX[i] + roadsX[i + 1]) / 2, inT = townAt(midX, ry);
    if (!inT && r() < 0.55) continue; if (inT && r() < 0.12) continue;
    for (let x = roadsX[i]; x <= roadsX[i + 1] + 1; x++) { road(x, ry); road(x, ry + 1); }
  }
  for (const rx of roadsX) for (let i = 0; i < roadsY.length - 1; i++) {
    const midY = (roadsY[i] + roadsY[i + 1]) / 2, inT = townAt(rx, midY);
    if (!inT && r() < 0.55) continue; if (inT && r() < 0.12) continue;
    for (let y = roadsY[i]; y <= roadsY[i + 1] + 1; y++) { road(rx, y); road(rx + 1, y); }
  }
  // Ringstrasse (zum schnellen Fahren) – nur auf Land
  const R0 = roadsX[0], R1 = roadsX[roadsX.length - 1], Q0 = roadsY[0], Q1 = roadsY[roadsY.length - 1];
  for (let x = R0; x <= R1 + 1; x++) for (const y of [Q0, Q1]) { road(x, y); road(x, y + 1); }
  for (let y = Q0; y <= Q1 + 1; y++) for (const x of [R0, R1]) { road(x, y); road(x + 1, y); }
  // Gehwege in den Siedlungen
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = m[y * MW + x]; if ((t !== G.GRASS && t !== G.SAND) || !townAt(x, y)) continue;
    let nb = false; for (let dy = -1; dy <= 1 && !nb; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === G.ROAD) { nb = true; break; }
    if (nb) set(x, y, G.WALK);
  }
  // Gebäude, Parks, Felder, Bäume
  const blds = [], trees = [];
  const free = (x, y, w, h) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const t = at(x + i, y + j); if (t !== G.GRASS && t !== G.SAND) return false; } return true; };
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const t = at(x, y); if (t !== G.GRASS && t !== G.SAND) continue;
    if (townAt(x, y)) {
      const w = ri(2, 4), h = ri(1, 2);
      if (free(x, y, w, h) && r() < 0.85) {
        if (r() < 0.1) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, G.PARK); trees.push({ x: (x + w / 2) * TS, y: (y + h / 2) * TS + 6 }); continue; }
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, G.BLD);
        blds.push({ x, y, w, h, seed: ri(0, 9999), fh: ri(28, 34), roof: st.roof[ri(0, st.roof.length - 1)] });
      }
    } else {
      const forest = hash2(x >> 4, y >> 4) > 0.6;
      if (st.tree && r() < (forest ? 0.22 : 0.05)) { trees.push({ x: x * TS + ri(2, 14), y: y * TS + ri(4, 15) }); set(x, y, G.PARK); }
      else if (r() < 0.006 && free(x, y, 3, 2)) { for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) set(x + i, y + j, G.BLD); blds.push({ x, y, w: 3, h: 2, seed: ri(0, 9999), fh: 24, roof: st.roof[0], farm: true }); }
      else if (id !== 'desert' && t === G.GRASS && hash2(x >> 3, y >> 3) > 0.55) set(x, y, G.FIELD);
    }
  }
  // Sehenswürdigkeiten: über die ganze Karte verteilt, an Strassen
  const main = towns[0], spots = [], sectors = [[0.18, 0.18], [0.8, 0.2], [0.15, 0.62], [0.82, 0.66], [0.48, 0.86], [0.5, 0.3]];
  for (const [sx, sy] of sectors) {
    let best = null, bd = 1e9;
    for (let k = 0; k < 1500; k++) { const x = ri(3, MW - 4), y = ri(3, MH - 4); if (at(x, y) !== G.ROAD) continue; const dd = Math.hypot(x - sx * MW, y - sy * MH); if (dd < bd && Math.hypot(x - main.cx, y - main.cy) > 14 && !spots.some(s => Math.hypot(s.tx - x, s.ty - y) < 25)) { bd = dd; best = [x, y]; } }
    if (best) spots.push({ tx: best[0], ty: best[1], x: best[0] * TS + 8, y: best[1] * TS + 8 });
  }
  const roadTiles = []; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (m[y * MW + x] === G.ROAD) roadTiles.push([x, y]);
  const walkTiles = []; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (m[y * MW + x] === G.WALK) walkTiles.push([x, y]);
  const coins = []; for (let k = 0; k < 140; k++) { const [x, y] = roadTiles[Math.floor(r() * roadTiles.length)]; coins.push({ x: x * TS + 8, y: y * TS + 8, got: false }); }
  let start = roadTiles[0], sd = 1e9; for (const [x, y] of roadTiles) { const dd = Math.hypot(x - main.cx, y - main.cy + 4); if (dd < sd) { sd = dd; start = [x, y]; } }
  return { id, st, m, at, blds, trees, spots, coins, roadTiles, walkTiles, start, towns, bridge, cx: main.cx, cy: main.cy };
}

// ---------- Vorgezeichnete Ebenen ----------
// Boden wird pro sichtbarer Kachel aus kleinen Texturen gezeichnet (schnell, beliebig grosse Karten)
function owTileTex(W) {
  const st = W.st, tex = {};
  const mk = (key, f) => { const c = document.createElement('canvas'); c.width = TS; c.height = TS; const p = new PB(TS, TS); f(p); c.getContext('2d').drawImage(p.canvas(), 0, 0); tex[key] = c; };
  const fill = (p, base, fn) => { for (let y = 0; y < TS; y++) for (let x = 0; x < TS; x++) p.set(x, y, Crgb(fn ? fn(x, y, base) : base)); };
  for (let v = 0; v < 4; v++) {
    const n = (x, y) => hash2(x + v * 31, y + v * 17);
    mk('g' + v, p => fill(p, hex2rgb(st.grass), (x, y, b) => shadeRGB(b, (n(x, y) - 0.5) * 0.14 + (n(x >> 1, y >> 1) > 0.93 ? 0.12 : 0))));
    mk('p' + v, p => fill(p, hex2rgb(st.grass), (x, y, b) => shadeRGB(b, (n(x, y) - 0.5) * 0.12 - 0.07)));
    mk('f' + v, p => fill(p, hex2rgb(W.id === 'vietnam' || W.id === 'cambodia' ? '#7ac060' : '#b0b860'), (x, y, b) => shadeRGB(b, (y % 4 === 0 ? -0.16 : 0) + (n(x, y) - 0.5) * 0.08)));
    mk('s' + v, p => fill(p, hex2rgb('#e8d4a0'), (x, y, b) => shadeRGB(b, (n(x, y) - 0.5) * 0.12)));
    mk('w' + v, p => fill(p, hex2rgb('#2a78b8'), (x, y, b) => shadeRGB(b, (n(x, y) - 0.5) * 0.06 + ((x + y * 2 + v * 5) % 13 === 0 ? 0.22 : 0))));
    mk('k' + v, p => fill(p, hex2rgb(W.id === 'swiss' ? '#c8c4bc' : '#b8b0a0'), (x, y, b) => shadeRGB(b, ((x % 8 === 0 || y % 8 === 0) ? -0.13 : 0) + (n(x, y) - 0.5) * 0.05)));
    mk('r' + v, p => fill(p, hex2rgb('#4a4c58'), (x, y, b) => shadeRGB(b, (n(x, y) - 0.5) * 0.09)));
    mk('b' + v, p => fill(p, hex2rgb('#8a7a66'), (x, y, b) => shadeRGB(b, (y % 4 === 0 ? -0.2 : 0) + (n(x, y) - 0.5) * 0.06)));
  }
  return tex;
}
function owDrawGround(ctx, ox, oy) {
  const R = OW, W = R.W, T = R.tex || (R.tex = owTileTex(W)), at = W.at;
  const tx0 = Math.floor(ox / TS), ty0 = Math.floor(oy / TS), tx1 = Math.floor((ox + RW_) / TS), ty1 = Math.floor((oy + OW_VIEW_H) / TS);
  const key = { [G.GRASS]: 'g', [G.BLD]: 'g', [G.PARK]: 'p', [G.FIELD]: 'f', [G.SAND]: 's', [G.WATER]: 'w', [G.WALK]: 'k', [G.ROAD]: 'r', [G.PLAZA]: 'k' };
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
    const t = W.m[ty * MW + tx], x = tx * TS - ox, y = ty * TS - oy, v = (tx * 7 + ty * 13) & 3;
    const br = t === G.ROAD && W.bridge[ty * MW + tx];
    ctx.drawImage(T[(br ? 'b' : key[t]) + v], x, y);
    if (t === G.ROAD) {
      const L = at(tx - 1, ty) === G.ROAD, Rr = at(tx + 1, ty) === G.ROAD, U = at(tx, ty - 1) === G.ROAD, D = at(tx, ty + 1) === G.ROAD;
      ctx.fillStyle = '#d8d0a0';
      if (L && Rr && U && !D && !(at(tx - 1, ty + 1) === G.ROAD && at(tx + 1, ty + 1) === G.ROAD && at(tx, ty - 2) === G.ROAD)) { if (tx % 2 === 0) ctx.fillRect(x + 2, y, 9, 1); }   // Mittellinie waagrecht
      if (U && D && L && !Rr && !(at(tx + 1, ty - 1) === G.ROAD && at(tx + 1, ty + 1) === G.ROAD && at(tx - 2, ty) === G.ROAD)) { if (ty % 2 === 0) ctx.fillRect(x, y + 2, 1, 9); }
      if (!U) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y, TS, 1); }                                    // Bordstein-Kante
      if (!L) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y, 1, TS); }
      if (br) { ctx.fillStyle = '#c8b898'; if (!U || at(tx, ty - 1) === G.WATER) ctx.fillRect(x, y, TS, 2); if (!D || at(tx, ty + 1) === G.WATER) ctx.fillRect(x, y + TS - 2, TS, 2); if (at(tx - 1, ty) === G.WATER) ctx.fillRect(x, y, 2, TS); if (at(tx + 1, ty) === G.WATER) ctx.fillRect(x + TS - 2, y, 2, TS); }
    } else if (t === G.WATER) {                                                                                       // Ufer-Schaum
      ctx.fillStyle = '#c8e8f8';
      if (at(tx, ty - 1) !== G.WATER) ctx.fillRect(x, y, TS, 1);
      if (at(tx, ty + 1) !== G.WATER) ctx.fillRect(x, y + TS - 1, TS, 1);
      if (at(tx - 1, ty) !== G.WATER) ctx.fillRect(x, y, 1, TS);
      if (at(tx + 1, ty) !== G.WATER) ctx.fillRect(x + TS - 1, y, 1, TS);
    }
  }
}
function owBSpr(i, fr) {
  const k = i * 2 + fr, C = OW.bCache; let c = C.get(k);
  if (!c) { c = owBuildingSprite(OW.W, OW.W.blds[i], fr); C.set(k, c); if (C.size > 700) C.delete(C.keys().next().value); }
  return c;
}
function owDrawSkids(ctx, ox, oy) {
  const R = OW; ctx.lineWidth = 1.3;
  for (const k of R.skids) { const a = clamp(1 - (R.t - k.t) / 14, 0, 1) * 0.5; if (a <= 0) continue; const x = k.x - ox, y = k.y - oy; if (x < -10 || y < -10 || x > RW_ + 10 || y > OW_VIEW_H + 10) continue; ctx.strokeStyle = `rgba(18,18,24,${a.toFixed(2)})`; ctx.beginPath(); ctx.moveTo(k.px - ox, k.py - oy); ctx.lineTo(x, y); ctx.stroke(); }
}
function owBuildingSprite(W, b, fr) {
  const bw = b.w * TS, bh = b.h * TS, fh = b.fh, cv = document.createElement('canvas'); cv.width = bw * 2; cv.height = (bh + fh) * 2;
  const c = cv.getContext('2d'); c.scale(2, 2); c.imageSmoothingEnabled = false;
  const roofH = bh;                                                                    // Dach (von oben) = Grundfläche, Fassade davor
  const rc = hex2rgb(b.roof);
  c.fillStyle = W.st.wall; c.fillRect(0, roofH, bw, fh);
  if (OW.facades && OW.facades.length) {                                              // Fassade aus der Häuserreihe des Landes
    const tile = OW.facades[b.seed % OW.facades.length][fr], sx = (b.seed * 13) % Math.max(1, 192 - bw), hh = Math.min(34, fh);
    c.drawImage(tile, sx, 34 - hh, bw, hh, 0, roofH + fh - hh, bw, hh);
  } else {                                                                            // Fallback: Fenster + Tür
    for (let k = 0; k < Math.floor((bw - 4) / 7); k++) { c.fillStyle = fr ? '#ffe8a0' : '#29366f'; c.fillRect(3 + k * 7, roofH + 4, 4, 5); }
    c.fillStyle = '#5a3a2a'; c.fillRect(bw / 2 - 3, roofH + fh - 9, 6, 9);
  }
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(bw - 3, roofH, 3, fh);
  // Dach mit Struktur je nach Land
  for (let y = 0; y < roofH; y++) for (let x = 0; x < bw; x++) {
    let k = 0;
    if (W.id === 'japan' || W.id === 'china' || W.id === 'samui') k = (y % 3 === 0 ? -0.18 : 0) + (x % 4 === 0 ? -0.06 : 0);
    else if (W.id === 'cambodia') k = (x % 3 === 0 ? -0.2 : 0.05) + (hash2(x + b.seed, y) > 0.92 ? -0.25 : 0);
    else if (W.id === 'swiss') k = (y < roofH / 2 ? 0.08 : -0.08) + (y % 3 === 0 ? -0.12 : 0);
    else k = (hash2(x + b.seed, y) - 0.5) * 0.08;
    c.fillStyle = rgb2hex(shadeRGB(rc, k).map(Math.round)); c.fillRect(x, y, 1, 1);
  }
  c.fillStyle = rgb2hex(shadeRGB(rc, 0.3).map(Math.round)); c.fillRect(0, 0, bw, 1);
  c.fillStyle = rgb2hex(shadeRGB(rc, -0.28).map(Math.round)); c.fillRect(0, roofH - 2, bw, 2); c.fillRect(0, 0, 1, roofH); c.fillRect(bw - 1, 0, 1, roofH);   // Traufe
  const hr = (k) => hash2(b.seed, k);
  if (hr(1) > 0.5) { c.fillStyle = '#5a5e68'; c.fillRect(Math.floor(hr(2) * (bw - 6)) + 2, 2, 3, 3); c.fillStyle = '#3a3e48'; c.fillRect(Math.floor(hr(2) * (bw - 6)) + 2, 2, 3, 1); }   // Kamin/Lüftung
  if (hr(3) > 0.7 && W.id !== 'cambodia') { c.fillStyle = '#29366f'; c.fillRect(bw - 12, 3, 8, 5); c.fillStyle = '#41a6f6'; for (let k = 0; k < 4; k++) c.fillRect(bw - 11 + k * 2, 4, 1, 3); }   // Solarzellen
  if (W.id === 'samui' || W.id === 'cambodia') { if (hr(4) > 0.6) { c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(0, 1, bw, 1); } }
  if (W.id === 'swiss' || W.id === 'japan') { c.fillStyle = rgb2hex(shadeRGB(rc, -0.3).map(Math.round)); c.fillRect(0, Math.floor(roofH / 2), bw, 1); }
  if (W.id === 'china') { c.fillStyle = '#d4a640'; c.fillRect(0, roofH - 1, bw, 1); c.fillRect(0, 0, 2, 2); c.fillRect(bw - 2, 0, 2, 2); }
  if (W.id === 'vietnam' && b.seed % 3 === 0) { c.fillStyle = '#4a8ac8'; c.fillRect(4, 3, 5, 4); c.fillStyle = '#38b764'; c.fillRect(bw - 8, roofH - 6, 4, 3); }   // Wassertank, Pflanzen
  if ((W.id === 'sunset' || W.id === 'desert') && b.seed % 2) { c.fillStyle = '#8a8e98'; c.fillRect(bw - 9, 4, 5, 4); }
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, roofH, bw, 1);                             // Dachkante wirft Schatten
  return cv;
}
function owTreeSprite(kind) {
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 52; const c = cv.getContext('2d'); c.scale(2, 2);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(10, 24, 7, 2.5, 0, 0, Math.PI * 2); c.fill();
  if (kind === 'palm') {
    c.fillStyle = '#8a6a3a'; c.fillRect(9, 10, 2, 14);
    for (let a = 0; a < 7; a++) { const an = a / 7 * Math.PI * 2; c.strokeStyle = a % 2 ? '#3a8a40' : '#5aaa50'; c.lineWidth = 2; c.beginPath(); c.moveTo(10, 9); c.quadraticCurveTo(10 + Math.cos(an) * 6, 6 + Math.sin(an) * 3, 10 + Math.cos(an) * 9, 10 + Math.sin(an) * 5); c.stroke(); }
  } else if (kind === 'pine') {
    c.fillStyle = '#4a3020'; c.fillRect(9, 20, 2, 4);
    for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? '#2a7048' : '#1e5a3a'; c.beginPath(); c.moveTo(10, 1 + i * 5); c.lineTo(17 - i, 12 + i * 4); c.lineTo(3 + i, 12 + i * 4); c.fill(); }
  } else if (kind === 'bamboo') {
    for (let s = 0; s < 4; s++) { c.fillStyle = s % 2 ? '#5aa050' : '#3a7a3a'; c.fillRect(5 + s * 3, 3 + s % 2 * 3, 1.5, 21); c.fillStyle = '#7ac060'; c.fillRect(3 + s * 3, 4 + s * 2, 4, 1.5); }
  } else {
    const pink = kind === 'sakura';
    c.fillStyle = '#5a3a2a'; c.fillRect(9, 13, 2, 11);
    for (let i = 0; i < 26; i++) { c.fillStyle = pink ? ['#ff8ab8', '#ffb8d8', '#ffd8ea'][i % 3] : ['#2f7a3a', '#3a8a46', '#4a9a50'][i % 3]; c.beginPath(); c.arc(10 + (hash2(i, 1) - 0.5) * 13, 9 + (hash2(i, 2) - 0.5) * 10, 3, 0, Math.PI * 2); c.fill(); }
  }
  return cv;
}

// ---------- Auto von oben ----------
const _topCache = new Map();
function carTopSprite(d, brake, lights) {
  const key = JSON.stringify([d.body, d.color, d.color2, d.stripe, d.spoiler, d.glow, d.kit, d.rimColor, brake, lights]);
  if (_topCache.has(key)) return _topCache.get(key);
  const cls = BODIES[d.body].cls, w = { small: 9, family: 10, suv: 11, sport: 10, super: 11, hyper: 11 }[cls] || 10, l = { small: 16, family: 19, suv: 19, sport: 19, super: 20, hyper: 21 }[cls] || 18;
  const K = 4, cv = document.createElement('canvas'); cv.width = (w + 8) * K; cv.height = (l + 8) * K;
  const c = cv.getContext('2d'); c.scale(K, K); c.translate(4, 4);
  const col = hex2rgb(d.color), sh = f => rgb2hex(shadeRGB(col, f).map(Math.round));
  if (d.glow && d.glow !== 'none') { c.globalAlpha = 0.5; c.fillStyle = d.glow; c.beginPath(); c.ellipse(w / 2, l / 2, w / 2 + 3, l / 2 + 2, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(1, 1.5, w, l);
  c.fillStyle = '#16161c'; for (const [x, y] of [[-1, 3], [w - 1, 3], [-1, l - 6], [w - 1, l - 6]]) c.fillRect(x, y, 2, 4);   // Räder
  c.fillStyle = sh(-0.35); c.fillRect(0, 0, w, l);
  c.fillStyle = sh(0); c.fillRect(0.5, 0.5, w - 1, l - 1);
  c.fillStyle = sh(0.18); c.fillRect(1, 1, w - 2, 1);
  const roofY = Math.round(l * (cls === 'suv' || cls === 'family' ? 0.3 : 0.38)), roofL = Math.round(l * (cls === 'suv' || cls === 'family' ? 0.5 : 0.32));
  c.fillStyle = '#2e3a56'; c.fillRect(1.5, roofY - 2.5, w - 3, 2.5); c.fillRect(1.5, roofY + roofL, w - 3, 2);   // Front- und Heckscheibe
  c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(2, roofY - 2.4, 2, 1);
  c.fillStyle = sh(0.08); c.fillRect(1.5, roofY, w - 3, roofL);                               // Dach
  if (d.stripe === 'racing' || d.stripe === 'double') { c.fillStyle = d.color2; c.fillRect(w / 2 - 2, 0, 1.3, l); c.fillRect(w / 2 + 0.7, 0, 1.3, l); }
  c.fillStyle = lights ? '#ffffff' : '#fff4c0'; c.fillRect(0.5, 0, 2, 1); c.fillRect(w - 2.5, 0, 2, 1);   // Scheinwerfer (vorne = oben)
  c.fillStyle = brake ? '#ff3048' : '#b01830'; c.fillRect(0.5, l - 1, 2.2, 1); c.fillRect(w - 2.7, l - 1, 2.2, 1);
  if (d.spoiler && d.spoiler !== 'none') { c.fillStyle = '#1a1c24'; c.fillRect(-0.5, l - 2.5, w + 1, 1.3); }
  const out = { cv, w: w + 8, l: l + 8 };
  if (_topCache.size > 80) _topCache.clear();
  _topCache.set(key, out);
  return out;
}

// =============================================================================
function owStart(placeId, carId, sync) {
  const en = raceEntry(carId); if (!en) return;
  if (!sync) {
    const ld = document.createElement('div'); ld.id = 'owload'; ld.className = 'ov';
    ld.innerHTML = `<div class="mbox small" style="text-align:center"><h2 class="title" style="justify-content:center">${ico('map', 'big')} ${esc(TRACKS[placeId].name)}</h2><div class="hint">Die Stadt wird gebaut …</div><div class="pbar" style="margin:10px 0"><i class="ldbar" style="width:100%"></i></div></div>`;
    document.body.appendChild(ld);
    setTimeout(() => { try { owStart(placeId, carId, true); } finally { ld.remove(); } }, 60);
    return;
  }
  const T = TRACKS[placeId], TH = THEMES[T.scene];
  const W = OW_CACHE[placeId] || (OW_CACHE[placeId] = owGenerate(placeId));
  OW = { place: placeById(placeId), T, W, en, car: computeCar(en.design, en.engine), veh: null, t: 0, tod: 0.45, inp: {}, raf: 0, last: performance.now(), msg: '', msgT: 0, gotCoins: 0, parts: [], petalsGone: new Map(), cam: { x: 0, y: 0 } };
  ROAM = OW;                                              // für sceneT(), Tasten-Sperren usw.
  OW.facades = TH ? [0, 1, 2].map(sd => { TILE_SEED = sd * 37; const v = [0, 1].map(fr => TH.tile(fr)); TILE_SEED = 0; return v; }) : null;
  W.coins.forEach(c => { c.got = false; });
  OW.bCache = W.bCache || (W.bCache = new Map());
  OW.treeSpr = owTreeSprite(W.st.tree || 'oak');
  OW.spec = owCarSpec(OW.car); OW.skids = []; OW.nosFuel = 3; OW.nosT = 0; OW.f = 0; OW.gear = 1; OW.rpm = 0;
  OW.x = W.start[0] * TS + 8; OW.y = W.start[1] * TS + 8; OW.vx = 0; OW.vy = 0; OW.steer = 0;
  OW.ang = W.at(W.start[0] + 1, W.start[1]) === G.ROAD && W.at(W.start[0] - 1, W.start[1]) === G.ROAD ? Math.PI / 2 : 0;
  // Verkehr: fährt auf Strassenkacheln, biegt an Kreuzungen ab
  OW.npcs = Array.from({ length: 26 }, (_, i) => { const [tx, ty] = W.roadTiles[Math.floor(hash2(i, 7) * W.roadTiles.length)]; return { x: tx * TS + 8, y: ty * TS + 8, dir: i % 4, v: 26 + hash2(i, 8) * 20, d: OPPONENTS[i % OPPONENTS.length].design, cool: 0 }; });
  OW.peds = Array.from({ length: 70 }, (_, i) => { const [tx, ty] = W.walkTiles.length ? W.walkTiles[Math.floor(hash2(i, 9) * W.walkTiles.length)] : W.start; return { x: tx * TS + hash2(i, 1) * 16, y: ty * TS + hash2(i, 2) * 16, vx: (hash2(i, 3) - 0.5) * 14, vy: (hash2(i, 4) - 0.5) * 14, c: ['#b13e53', '#3b5dc9', '#ffcd75', '#38b764', '#f4f4f4', '#ef7d57'][i % 6], hop: 0, seed: i * 17 }; });
  worldState().visits[placeId] = (worldState().visits[placeId] || 0) + 1;
  const el = document.createElement('div'); el.id = 'roam';
  el.innerHTML = `<div class="rtop"><span class="hf" style="font-size:10px;color:var(--yellow)">${esc(T.name)} · ${esc(en.name)}</span><span class="sp"></span>
      <button class="btn sm" id="ow-night">Tag/Nacht</button><button class="btn sm yellow" id="ow-photo">Foto</button><button class="btn sm gray" id="ow-mute">Ton</button><button class="btn sm red" id="ow-exit">Zur Weltkarte</button></div>
    <canvas id="roamcv" width="320" height="180"></canvas>
    <div class="rctl"><button class="rbtn" data-ow="left">◀</button><button class="rbtn" data-ow="right">▶</button><button class="rbtn" data-ow="hand">DRIFT</button>${OW.spec.nos ? '<button class="rbtn nos" data-ow="nos">NITRO</button>' : ''}<button class="rbtn" data-ow="brake">BREMSE</button><button class="rbtn gas" data-ow="gas">GAS</button></div>`;
  document.body.appendChild(el);
  $$('[data-ow]', el).forEach(b => {
    const k = b.dataset.ow, on = e => { e.preventDefault(); OW.inp[k] = true; b.classList.add('on'); owAudio(); }, off = e => { e.preventDefault(); OW.inp[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  $('#ow-exit').onclick = owEnd;
  $('#ow-night').onclick = () => { OW.tod = owNight() > 0.5 ? 0.45 : 0.0; };
  $('#ow-mute').onclick = () => { OW.muted = !OW.muted; };
  $('#ow-photo').onclick = () => { const cv = $('#roamcv'); try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `AutoTycoon_${placeId}_${Date.now()}.png`; document.body.appendChild(a); a.click(); a.remove(); owMsg('Foto gespeichert!', 1.5); } catch (e) { owMsg('Foto nicht möglich', 1.5); } };
  owMsg(`Willkommen in ${T.name.split(' – ')[1] || T.name}! Fahr los und entdecke die Stadt.`, 3.5);
  OW.raf = requestAnimationFrame(owLoop);
}
function owEnd() {
  const R = OW; if (!R) return;
  cancelAnimationFrame(R.raf);
  if (R.V) { try { R.V.out.gain.value = 0; R.V.nodes.forEach(n => n.stop()); } catch (e) { /* egal */ } }
  worldState().km += (R.odo || 0) / 1000;
  OW = null; ROAM = null; const el = $('#roam'); if (el) el.remove();
  saveGame(); updateTopbar(true); if (curTab === 'world') rerender();
}
const owMsg = (t, d = 2) => { OW.msg = t; OW.msgT = d; };
const owNight = () => clamp((Math.cos((OW.tod - 0.5) * Math.PI * 2) * -1 - 0.15) * 1.8, 0, 1);
function owAudio() { const R = OW; if (!R || R.V) return; try { AUD = AUD || new (window.AudioContext || window.webkitAudioContext)(); if (AUD.state === 'suspended') AUD.resume(); R.V = makeVoice(R.car.E, R.en.engine, 0.06, 0); } catch (e) { R.V = null; } }
const OW_KEYS = { ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ' ': 'hand', Shift: 'nos', e: 'nos', E: 'nos' };
window.addEventListener('keydown', e => {
  if (!OW) return;
  if (OW_KEYS[e.key]) { OW.inp[OW_KEYS[e.key]] = true; owAudio(); e.preventDefault(); e.stopImmediatePropagation(); }
  else if (e.key === 'n' || e.key === 'N') { OW.tod = owNight() > 0.5 ? 0.45 : 0.0; e.stopImmediatePropagation(); }
  else if (e.key === 'Escape') { owEnd(); e.stopImmediatePropagation(); }
}, true);
window.addEventListener('keyup', e => { if (OW && OW_KEYS[e.key]) { OW.inp[OW_KEYS[e.key]] = false; e.stopImmediatePropagation(); } }, true);

function owLoop() {
  const R = OW; if (!R) return;
  R.raf = requestAnimationFrame(owLoop);
  const now = performance.now(), dt = clamp((now - R.last) / 1000, 0, 0.05); R.last = now; R.fdt = dt;
  try { owStep(dt); owDraw(); } catch (e) { if (!R.err) { R.err = 1; console.error('Offene Welt:', e); } }
}
const owSolid = (W, x, y) => { const t = W.at(Math.floor(x / TS), Math.floor(y / TS)); return t === G.BLD || t === G.WATER; };
/** Fahrwerte aus dem echten Auto: Beschleunigung aus 0–100, Höchsttempo aus Vmax */
function owCarSpec(car) {
  const vmax = clamp(car.top / 3.6, 25, 120);                       // m/s
  const a0 = clamp(27.8 / Math.max(1.8, car.t100) * 1.15, 3.5, 16);  // m/s² beim Anfahren
  return { vmax, a0, grip: clamp(car.grip, 0.8, 1.6), nos: car.nos ? car.nos.mul : 0 };
}
function owStep(dt) {
  const R = OW, W = R.W, I = R.inp, sp = R.spec, E = R.car.E;
  R.t += dt; R.tod = (R.tod + dt / 300) % 1; if (R.msgT > 0) R.msgT -= dt;
  const tx = Math.floor(R.x / TS), ty = Math.floor(R.y / TS), tile = W.at(tx, ty);
  const rough = tile === G.GRASS || tile === G.FIELD || tile === G.PARK || tile === G.SAND || tile === G.WALK && false;
  // Lenken zuerst (Tempo vom letzten Schritt): direkt bei wenig Tempo, ruhiger bei hohem Tempo
  const steerIn = (I.right ? 1 : 0) - (I.left ? 1 : 0);
  R.steer = lerp(R.steer, steerIn, clamp(dt * (steerIn ? 12 : 16), 0, 1));
  const f0 = R.f || 0, spd0 = Math.abs(f0), low = clamp(spd0 / 7, 0, 1), high = 1 - 0.5 * clamp(spd0 / sp.vmax, 0, 1);
  R.ang += R.steer * 3.1 * low * high * (I.hand ? 1.5 : 1) * (f0 < -0.3 ? -1 : 1) * dt;
  const hx = Math.sin(R.ang), hy = -Math.cos(R.ang), rx = -hy, ry = hx;      // neue Blickrichtung & rechts
  // bisherige Geschwindigkeit (Welt) in Längs- und Querteil zerlegen (m/s)
  let f = (R.vx * hx + R.vy * hy) / OW_PX_PER_M, l = (R.vx * rx + R.vy * ry) / OW_PX_PER_M;
  const vmax = sp.vmax * (rough ? 0.45 : 1) * (R.nosT > 0 ? 1.25 : 1);
  // Nitro
  if (I.nos && sp.nos && R.nosFuel > 0) { R.nosT = 0.1; R.nosFuel = Math.max(0, R.nosFuel - dt); } if (R.nosT > 0) R.nosT -= dt;
  if (!I.nos && sp.nos) R.nosFuel = Math.min(3, R.nosFuel + dt * 0.25);
  // Gas / Bremse / Rückwärts
  if (I.gas) { const k = clamp(1 - f / vmax, 0, 1); f += sp.a0 * Math.pow(k, 0.65) * (R.nosT > 0 ? 1 + sp.nos * 1.6 : 1) * dt; }
  if (I.brake) { if (f > 0.5) f -= 22 * dt; else f = Math.max(-9, f - 7 * dt); }
  if (!I.gas && !I.brake) f -= Math.sign(f) * Math.min(Math.abs(f), (1.6 + Math.abs(f) * 0.03) * dt);
  if (f > vmax) f = lerp(f, vmax, clamp(dt * 3, 0, 1));
  if (I.hand) f -= Math.sign(f) * Math.min(Math.abs(f), 6 * dt);
  const spd = Math.abs(f);
  // seitliche Haftung: normal fest, mit Handbremse/auf Gras rutschig → Drift
  const gripK = I.hand ? 1.3 : rough ? 4 : 7.5 * sp.grip;
  l *= Math.exp(-gripK * dt);
  R.drift = Math.abs(l);
  const hx2 = hx, hy2 = hy, rx2 = rx, ry2 = ry;
  R.vx = (hx2 * f + rx2 * l) * OW_PX_PER_M; R.vy = (hy2 * f + ry2 * l) * OW_PX_PER_M;
  // Bewegung mit Gleiten an Wänden
  const pts = [[0, -8], [0, 8], [-4.5, -6], [4.5, -6], [-4.5, 6], [4.5, 6]];
  const hit = (x, y) => pts.some(([px, py]) => owSolid(W, x + px * Math.cos(R.ang) - py * Math.sin(R.ang), y + px * Math.sin(R.ang) + py * Math.cos(R.ang)));
  let nx = R.x + R.vx * dt, ny = R.y + R.vy * dt, impact = 0;
  if (hit(nx, R.y)) { impact = Math.max(impact, Math.abs(R.vx)); nx = R.x; R.vx *= -0.2; }
  if (hit(nx, ny)) { impact = Math.max(impact, Math.abs(R.vy)); ny = R.y; R.vy *= -0.2; }
  if (hit(nx, ny)) { nx = R.x; ny = R.y; R.vx *= 0.5; R.vy *= 0.5; }               // ganz eingeklemmt
  if (impact > 20) {
    R.shakeT = clamp(impact / 200, 0.1, 0.35);
    if (!R.bumpT || R.t - R.bumpT > 0.35) { R.bumpT = R.t; sfx('bad'); }
    for (let i = 0; i < 8; i++) R.parts.push({ x: R.x + hx2 * 8, y: R.y + hy2 * 8, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, life: 0.35, r: 1, col: i % 2 ? '#ffcd75' : '#ffffff' });
  }
  if (nx < 6 || nx > MW * TS - 6) R.vx = 0; if (ny < 6 || ny > MH * TS - 6) R.vy = 0;
  R.x = clamp(nx, 6, MW * TS - 6); R.y = clamp(ny, 6, MH * TS - 6);
  R.f = (R.vx * hx2 + R.vy * hy2) / OW_PX_PER_M;
  R.odo = (R.odo || 0) + Math.hypot(R.vx, R.vy) * dt / OW_PX_PER_M;
  if (R.shakeT > 0) R.shakeT -= dt;
  // Gang & Drehzahl für Anzeige und Motorsound
  const gears = E.isEV ? 1 : E.ratios.length, u = clamp(Math.abs(R.f) / sp.vmax, 0, 1);
  const gf = u * gears * 1.02, gear = clamp(Math.floor(gf) + 1, 1, gears), within = E.isEV ? u : clamp(gf - (gear - 1), 0, 1);
  if (gear > (R.gear || 1)) { R.shiftT = 0.12; popSound(0.08, 600); }
  R.gear = gear; if (R.shiftT > 0) R.shiftT -= dt;
  const tgt = E.isEV ? u * E.red : (I.gas ? E.idle + (E.red - E.idle) * (0.35 + 0.62 * within) : E.idle + (E.red - E.idle) * 0.3 * within) * (R.shiftT > 0 ? 0.8 : 1);
  R.rpm = lerp(R.rpm || E.idle, tgt, clamp(dt * 10, 0, 1));
  // Reifenspuren beim Driften / Vollbremsung
  if ((R.drift > 3 || (I.brake && R.f > 8) || (I.hand && spd > 5)) && !rough) {
    for (const sd of [-1, 1]) { const bx = R.x - hx2 * 6 + rx2 * sd * 3.5, by = R.y - hy2 * 6 + ry2 * sd * 3.5; const last = R.skids[R.skids.length - (sd < 0 ? 2 : 1)]; R.skids.push({ x: bx, y: by, px: last && last.sd === sd && R.t - last.t < 0.06 ? last.x : bx, py: last && last.sd === sd && R.t - last.t < 0.06 ? last.y : by, t: R.t, sd }); }
    if (R.skids.length > 900) R.skids.splice(0, R.skids.length - 900);
    if (Math.random() < 0.5) R.parts.push({ x: R.x - hx2 * 7, y: R.y - hy2 * 7, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 0.7, r: 1.5, col: '#d8dce4', smoke: true });
  }
  if (rough && spd > 6 && Math.random() < 0.7) R.parts.push({ x: R.x - hx2 * 7, y: R.y - hy2 * 7, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, life: 0.6, r: 1.5, col: tile === G.SAND ? '#e8d4a0' : '#6a8a4a', smoke: true });
  if (R.nosT > 0) for (let i = 0; i < 2; i++) R.parts.push({ x: R.x - hx2 * 10, y: R.y - hy2 * 10, vx: -hx2 * 60 + (Math.random() - 0.5) * 10, vy: -hy2 * 60 + (Math.random() - 0.5) * 10, life: 0.25, r: 1, col: i ? '#73eff7' : '#ffffff' });
  // Verkehr (fährt auf seiner Spur, biegt an Kreuzungen ab)
  for (const n of R.npcs) {
    const dx = [0, 1, 0, -1][n.dir], dy = [-1, 0, 1, 0][n.dir];
    n.x += dx * n.v * dt; n.y += dy * n.v * dt; n.cool -= dt;
    const ntx = Math.floor(n.x / TS), nty = Math.floor(n.y / TS), cxp = ntx * TS + 8, cyp = nty * TS + 8;
    if (n.cool <= 0 && Math.abs(n.x - cxp) < 1.5 && Math.abs(n.y - cyp) < 1.5) {
      const opts = [0, 1, 2, 3].filter(d => d !== (n.dir + 2) % 4 && W.at(ntx + [0, 1, 0, -1][d] * 2, nty + [-1, 0, 1, 0][d] * 2) === G.ROAD);
      if (W.at(ntx + dx, nty + dy) !== G.ROAD || (opts.length > 1 && Math.random() < 0.35)) { n.dir = opts.length ? opts[Math.floor(Math.random() * opts.length)] : (n.dir + 2) % 4; n.x = cxp; n.y = cyp; n.cool = 0.5; }
    }
    const lane = 4, lx = n.x + [lane, 0, -lane, 0][n.dir], ly = n.y + [0, lane, 0, -lane][n.dir], d2 = Math.hypot(lx - R.x, ly - R.y);
    if (d2 < 11) { const k = (11 - d2) / 11; R.vx += (R.x - lx) * k * 9; R.vy += (R.y - ly) * k * 9; if (!R.bumpT || R.t - R.bumpT > 0.6) { R.bumpT = R.t; R.shakeT = 0.2; sfx('bad'); owMsg('RUMMS!', 0.7); } }
    if (Math.hypot(n.x - R.x, n.y - R.y) > 420) { for (let k = 0; k < 6; k++) { const [qx, qy] = W.roadTiles[Math.floor(Math.random() * W.roadTiles.length)]; const dd = Math.hypot(qx * TS - R.x, qy * TS - R.y); if (dd > 200 && dd < 380) { n.x = qx * TS + 8; n.y = qy * TS + 8; break; } } }
  }
  // Fussgänger
  for (const p of R.peds) {
    const d2 = Math.hypot(p.x - R.x, p.y - R.y);
    if (d2 < 24 && spd > 3) { p.vx = (p.x - R.x) / d2 * 45; p.vy = (p.y - R.y) / d2 * 45; p.hop = 0.4; }
    p.hop = Math.max(0, p.hop - dt);
    const nx2 = p.x + p.vx * dt, ny2 = p.y + p.vy * dt, t2 = W.at(Math.floor(nx2 / TS), Math.floor(ny2 / TS));
    if (t2 === G.BLD || t2 === G.WATER) { p.vx *= -1; p.vy *= -1; } else { p.x = nx2; p.y = ny2; }
    if (p.hop <= 0) { p.vx = lerp(p.vx, (hash2(Math.floor(R.t / 3), p.seed) - 0.5) * 14, dt); p.vy = lerp(p.vy, (hash2(Math.floor(R.t / 3) + 9, p.seed) - 0.5) * 14, dt); }
    if (d2 > 380 && W.walkTiles.length) { const [qx, qy] = W.walkTiles[Math.floor(Math.random() * W.walkTiles.length)]; const dd = Math.hypot(qx * TS - R.x, qy * TS - R.y); if (dd > 180 && dd < 360) { p.x = qx * TS + 8; p.y = qy * TS + 8; } }
  }
  // Münzen
  for (const c of W.coins) if (!c.got && Math.abs(c.x - R.x) < 10 && Math.abs(c.y - R.y) < 10) { c.got = true; R.gotCoins++; const ws = worldState(); ws.coins = (ws.coins || 0) + 1; const m = 50 * S.level; S.money += m; sfx('buy'); owMsg('+' + fmtMoney(m), 0.8); }
  // Sehenswürdigkeiten
  const P = R.place, ws = worldState(), F = ws.found[P.id] = ws.found[P.id] || [];
  W.spots.forEach((s, k) => {
    if (k >= P.spots.length || F.includes(k) || Math.hypot(s.x - R.x, s.y - R.y) > 20) return;
    F.push(k); addXP(120 * S.level); const m = 1500 * S.level; S.money += m; sfx('goal');
    toast(`${ico('star', 'big')} <div><b>Entdeckt: ${esc(P.spots[k])}</b><br>+${fmtMoney(m)} · ${F.length}/${P.spots.length} in ${esc(R.T.name)}</div>`, 'good', 5000);
    if (F.length === P.spots.length) { S.gems = (S.gems || 0) + 25; toast(`${ico('gem', 'big')} <b>${esc(R.T.name)} komplett entdeckt!</b> +25 Diamanten`, 'good', 6000); }
    owMsg('ENTDECKT: ' + P.spots[k].toUpperCase(), 2.5);
    for (let i = 0; i < 30; i++) R.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80 - 20, life: 1, r: 1, col: ['#ffcd75', '#a7f070', '#73eff7'][i % 3] });
  });
  // Kirschblüten (Japan): das Auto wirbelt sie auf
  if (R.T.scene === 'japan' && spd > 2) {
    for (let ty2 = ty - 1; ty2 <= ty + 1; ty2++) for (let tx2 = tx - 1; tx2 <= tx + 1; tx2++) for (let k = 0; k < 5; k++) {
      const id = (ty2 * MW + tx2) * 8 + k, gone = R.petalsGone.get(id); if (gone && R.t - gone < 40) continue;
      const px = tx2 * TS + hash2(id, 1) * TS, py = ty2 * TS + hash2(id, 2) * TS;
      if (Math.hypot(px - R.x, py - R.y) < 10) { R.petalsGone.set(id, R.t); const a = Math.atan2(py - R.y, px - R.x), s2 = 20 + spd * 1.3; R.parts.push({ x: px, y: py, vx: Math.cos(a) * s2 + R.vx * 0.3, vy: Math.sin(a) * s2 + R.vy * 0.3, life: 1.2 + Math.random(), r: 1, col: hash2(id, 3) > 0.5 ? '#ffb8d8' : '#ff8ab8', petal: true, z: 0, vz: 20 + Math.random() * 30 }); }
    }
    if (R.petalsGone.size > 5000) R.petalsGone.clear();
  }
  for (const p of R.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= p.petal ? 0.97 : 0.92; p.vy *= p.petal ? 0.97 : 0.92; if (p.smoke) p.r += dt * 6; if (p.petal) { p.z = Math.max(0, p.z + p.vz * dt); p.vz -= 40 * dt; } }
  R.parts = R.parts.filter(p => p.life > 0); if (R.parts.length > 500) R.parts.splice(0, R.parts.length - 500);
  if (R.V && AUD) voiceUpdate(R.V, { c: { E }, rpm: R.rpm }, I.gas ? 1 : 0.15, R.muted || !SFX.on, AUD.currentTime);
}

function owDraw() {
  const R = OW, cv = $('#roamcv'); if (!cv) return;
  const ctx = hdCtx(cv), W = R.W, t = R.t, night = owNight();
  // Kamera folgt mit Vorausblick in Fahrtrichtung
  const lookX = clamp(R.vx * 0.45, -95, 95), lookY = clamp(R.vy * 0.3, -40, 40), kc = 1 - Math.exp(-(R.fdt || 0.016) * 4.5);
  R.cam.x = R.cam.x ? lerp(R.cam.x, R.x + lookX, kc) : R.x; R.cam.y = R.cam.y ? lerp(R.cam.y, R.y + lookY, kc) : R.y;
  const shk = R.shakeT > 0 ? (Math.random() - 0.5) * 3 : 0;
  const ox = Math.round(clamp(R.cam.x - RW_ / 2, -40, MW * TS - RW_ + 40) + shk), oy = Math.round(clamp(R.cam.y - OW_VIEW_H / 2, -140, MH * TS - OW_VIEW_H + 20));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, RW_, OW_VIEW_H); ctx.clip();
  // ausserhalb der Karte: Meer bzw. Fuji am Nordrand (Japan)
  ctx.fillStyle = '#2a78b8'; ctx.fillRect(0, 0, RW_, OW_VIEW_H);
  if (oy < 0) {
    const g = ctx.createLinearGradient(0, -oy - 140, 0, -oy); g.addColorStop(0, '#5a8ad8'); g.addColorStop(1, '#f0d8e0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, RW_, -oy);
    if (R.T.scene === 'japan') ctx.drawImage(fujiHD(), Math.round(MW * TS / 2 - 320 - ox + 40), -oy - 150, 640, 160);
    else if (R.T.scene === 'swiss') { ctx.fillStyle = '#7a8aa4'; for (let x = 0; x < RW_; x++) { const wx = x + ox, h = 60 + 40 * Math.abs(((wx / 140) % 2 + 2) % 2 - 1) + 10 * Math.sin(wx * 0.05); ctx.fillRect(x, -oy - h, 1, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, -oy - h, 1, 8); ctx.fillStyle = '#7a8aa4'; } }
  }
  owDrawGround(ctx, ox, oy);
  owDrawSkids(ctx, ox, oy);
  // Wasser glitzert
  for (let i = 0; i < 40; i++) { const x = Math.floor(hash2(i, Math.floor(t * 2)) * RW_), y = Math.floor(hash2(i + 50, Math.floor(t * 2)) * OW_VIEW_H); if (W.at(Math.floor((x + ox) / TS), Math.floor((y + oy) / TS)) === G.WATER) { ctx.fillStyle = 'rgba(230,245,255,0.8)'; ctx.fillRect(x, y, 2, 0.5); } }
  // Kirschblüten am Boden
  if (R.T.scene === 'japan') {
    const tx0 = Math.floor(ox / TS), ty0 = Math.floor(oy / TS);
    for (let ty = ty0; ty <= ty0 + Math.ceil(OW_VIEW_H / TS) + 1; ty++) for (let tx = tx0; tx <= tx0 + Math.ceil(RW_ / TS) + 1; tx++) {
      const tt = W.at(tx, ty); if (tt !== G.ROAD && tt !== G.WALK && tt !== G.PARK) continue;
      for (let k = 0; k < 5; k++) { const id = (ty * MW + tx) * 8 + k, gone = R.petalsGone.get(id); if (gone && R.t - gone < 40) continue; if (hash2(id, 5) < (tt === G.PARK ? 0.1 : 0.45)) continue; ctx.fillStyle = hash2(id, 3) > 0.5 ? '#ffb8d8' : '#ff8ab8'; ctx.fillRect(Math.round(tx * TS + hash2(id, 1) * TS - ox), Math.round(ty * TS + hash2(id, 2) * TS - oy), hash2(id, 4) > 0.6 ? 2 : 1, 1); }
    }
  }
  // Münzen + Orte (am Boden)
  for (const c of W.coins) if (!c.got) { const x = c.x - ox, y = c.y - oy; if (x < -8 || y < -8 || x > RW_ + 8 || y > OW_VIEW_H + 8) continue; const sp = Math.abs(Math.cos(t * 4 + c.x)); ctx.fillStyle = '#8a6a10'; ctx.fillRect(x - 3 * sp, y - 3 - Math.sin(t * 3 + c.y) , Math.max(1, 6 * sp), 6); ctx.fillStyle = '#ffcd75'; ctx.fillRect(x - 2 * sp, y - 2 - Math.sin(t * 3 + c.y), Math.max(1, 4 * sp), 4); }
  const F = worldState().found[R.place.id] || [];
  W.spots.forEach((s, k) => { if (k >= R.place.spots.length) return; const x = s.x - ox, y = s.y - oy; if (x < -60 || y < -40 || x > RW_ + 60 || y > OW_VIEW_H + 40) return; const done = F.includes(k); ctx.strokeStyle = done ? 'rgba(167,240,112,0.6)' : `rgba(255,205,117,${(0.5 + 0.4 * Math.sin(t * 4)).toFixed(2)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 16 + Math.sin(t * 3) * 1.5, 9, 0, 0, Math.PI * 2); ctx.stroke(); });
  // Objekte nach Tiefe sortiert: Gebäude, Bäume, Autos, Fussgänger
  const objs = [];
  const fr = night > 0.45 ? 1 : 0;
  W.blds.forEach((b, i) => { const x = b.x * TS - ox, y = b.y * TS - oy; if (x > RW_ + 4 || x + b.w * TS < -4 || y - b.fh > OW_VIEW_H + 4 || y + b.h * TS < -4) return; objs.push({ z: (b.y + b.h) * TS, f: () => ctx.drawImage(owBSpr(i, fr), x, y - b.fh, b.w * TS, b.h * TS + b.fh) }); });
  for (const tr of W.trees) { const x = tr.x - ox, y = tr.y - oy; if (x < -20 || x > RW_ + 20 || y < -10 || y > OW_VIEW_H + 30) continue; objs.push({ z: tr.y, f: () => ctx.drawImage(R.treeSpr, x - 10, y - 24 + Math.sin(t * 1.3 + tr.x) * 0.3, 20, 26) }); }
  for (const p of R.peds) { const x = p.x - ox, y = p.y - oy; if (x < -4 || x > RW_ + 4 || y < -6 || y > OW_VIEW_H + 4) continue; objs.push({ z: p.y, f: () => { const b = Math.abs(Math.sin(t * 8 + p.x)) * (Math.hypot(p.vx, p.vy) > 3 ? 1 : 0) + (p.hop > 0 ? 2 : 0); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - 1.5, y, 3, 1); ctx.fillStyle = p.c; ctx.fillRect(x - 1, y - 3 - b, 2, 3); ctx.fillStyle = '#f0c0a0'; ctx.fillRect(x - 1, y - 5 - b, 2, 2); } }); }
  const drawCar = (d, x, y, ang, brake, lights) => { const s = carTopSprite(d, brake, lights); ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.drawImage(s.cv, -s.w / 2, -s.l / 2, s.w, s.l); ctx.restore(); };
  for (const n of R.npcs) { const x = n.x - ox, y = n.y - oy; if (x < -20 || x > RW_ + 20 || y < -20 || y > OW_VIEW_H + 20) continue; const lane = 4, lx = [lane, 0, -lane, 0][n.dir], ly = [0, lane, 0, -lane][n.dir]; objs.push({ z: n.y, f: () => drawCar(n.d, x + lx, y + ly, n.dir * Math.PI / 2, false, night > 0.4) }); }
  objs.push({ z: R.y, f: () => drawCar(R.en.design, R.x - ox, R.y - oy, R.ang, !!R.inp.brake, night > 0.35) });
  objs.sort((a, b) => a.z - b.z).forEach(o => o.f());
  // Partikel
  for (const p of R.parts) { ctx.globalAlpha = clamp(p.life / 0.5, 0, 1) * (p.smoke ? 0.5 : 1); ctx.fillStyle = p.col; if (p.smoke) { ctx.beginPath(); ctx.arc(p.x - ox, p.y - oy, p.r, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy - (p.z || 0)), p.petal ? 2 : 1, 1); }
  ctx.globalAlpha = 1;
  // Kirschblüten fallen von oben (Japan)
  if (R.T.scene === 'japan') for (let i = 0; i < 26; i++) { const y = (hash2(i, 2) * 170 + t * 14) % 170 - 10, x = ((hash2(i, 1) * RW_ - t * 9 + Math.sin(t * 2 + i) * 5) % RW_ + RW_) % RW_; ctx.fillStyle = i % 3 ? '#ffb8d8' : '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  // Nacht: dunkel, Laternen an Kreuzungen und Scheinwerfer leuchten
  if (night > 0) {
    ctx.fillStyle = `rgba(6,10,34,${(night * 0.62).toFixed(2)})`; ctx.fillRect(0, 0, RW_, OW_VIEW_H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night;
    for (let ty = Math.floor(oy / TS) - 1; ty <= Math.floor((oy + OW_VIEW_H) / TS) + 1; ty++) for (let tx = Math.floor(ox / TS) - 1; tx <= Math.floor((ox + RW_) / TS) + 1; tx++) {
      if (W.at(tx, ty) !== G.WALK || hash2(tx, ty * 3) < 0.86) continue;
      const g = ctx.createRadialGradient(tx * TS + 8 - ox, ty * TS + 8 - oy, 1, tx * TS + 8 - ox, ty * TS + 8 - oy, 26); g.addColorStop(0, 'rgba(255,214,150,0.35)'); g.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = g; ctx.fillRect(tx * TS + 8 - ox - 26, ty * TS + 8 - oy - 26, 52, 52);
    }
    const hx = Math.sin(R.ang), hy = -Math.cos(R.ang), px = R.x - ox, py = R.y - oy, g = ctx.createRadialGradient(px + hx * 30, py + hy * 30, 2, px + hx * 30, py + hy * 30, 40);
    g.addColorStop(0, 'rgba(255,244,200,0.45)'); g.addColorStop(1, 'rgba(255,244,200,0)'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(px + hx * 6 - hy * 4, py + hy * 6 + hx * 4); ctx.lineTo(px + hx * 70 - hy * 28, py + hy * 70 + hx * 28); ctx.lineTo(px + hx * 70 + hy * 28, py + hy * 70 - hx * 28); ctx.lineTo(px + hx * 6 + hy * 4, py + hy * 6 - hx * 4); ctx.fill();
    ctx.restore();
  }
  // Name der nächsten Sehenswürdigkeit über dem Ring
  W.spots.forEach((s, k) => { if (k >= R.place.spots.length) return; const x = s.x - ox, y = s.y - oy; if (Math.abs(x - RW_ / 2) > 200 || Math.abs(y - OW_VIEW_H / 2) > 120) return; const done = F.includes(k), name = (done ? '✓ ' : '★ ') + R.place.spots[k].toUpperCase(); cxText(ctx, name, x, y - 22 + Math.sin(t * 3) * 1, done ? '#a7f070' : '#ffcd75', 1, 'c', '#000'); });
  ctx.restore();
  // Minikarte (oben rechts)
  if (!R.mini) { const c = document.createElement('canvas'); c.width = MW; c.height = MH; const g = c.getContext('2d'); for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const tt = W.m[y * MW + x]; g.fillStyle = tt === G.ROAD ? '#d8d8e0' : tt === G.WATER ? '#2a78b8' : tt === G.BLD ? '#8a7a6a' : tt === G.SAND ? '#e8d4a0' : '#4a8a46'; g.fillRect(x, y, 1, 1); } R.mini = c; }
  const MS = 48, mx = RW_ - MS - 4, my = 4;
  ctx.globalAlpha = 0.85; ctx.fillStyle = '#0d0f1a'; ctx.fillRect(mx - 1, my - 1, MS + 2, MS + 2); ctx.drawImage(R.mini, mx, my, MS, MS); ctx.globalAlpha = 1;
  W.spots.forEach((s, k) => { if (k >= R.place.spots.length) return; ctx.fillStyle = F.includes(k) ? '#a7f070' : (Math.sin(t * 5) > 0 ? '#ffcd75' : '#ff5068'); ctx.fillRect(mx + s.tx / MW * MS - 1, my + s.ty / MH * MS - 1, 2, 2); });
  ctx.fillStyle = '#ffffff'; ctx.fillRect(mx + R.x / (MW * TS) * MS - 1, my + R.y / (MH * TS) * MS - 1, 2, 2);
  // HUD
  ctx.fillStyle = '#14161f'; ctx.fillRect(0, OW_VIEW_H, RW_, RH_ - OW_VIEW_H); ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, OW_VIEW_H, RW_, 2);
  const kmh = Math.round(Math.abs(R.f || 0) * 3.6), P = R.place;
  cxText(ctx, String(kmh), 40, OW_VIEW_H + 7, '#73eff7', 3, 'r'); cxText(ctx, 'KM/H', 44, OW_VIEW_H + 13, '#566c86', 1, 'l');
  cxText(ctx, (R.f || 0) < -0.5 ? 'R' : R.car.E.isEV ? 'D' : String(R.gear || 1), 82, OW_VIEW_H + 7, '#ffcd75', 3, 'c');
  cxText(ctx, `★ ${F.length}/${P.spots.length} ENTDECKT`, 110, OW_VIEW_H + 8, '#a7f070', 1, 'l');
  cxText(ctx, `● ${R.gotCoins} MÜNZEN`, 190, OW_VIEW_H + 8, '#ffcd75', 1, 'l');
  if (R.spec.nos) { ctx.fillStyle = '#05060c'; ctx.fillRect(262, OW_VIEW_H + 6, 52, 6); ctx.fillStyle = R.nosT > 0 ? (Math.floor(R.t * 12) % 2 ? '#73eff7' : '#3b5dc9') : '#3b5dc9'; ctx.fillRect(263, OW_VIEW_H + 7, Math.round(50 * R.nosFuel / 3), 4); cxText(ctx, 'NITRO', 288, OW_VIEW_H + 13, '#73eff7', 1, 'c'); }
  let near = null, nd = 1e9; W.spots.forEach((s, k) => { if (k < P.spots.length && !F.includes(k)) { const d = Math.hypot(s.x - R.x, s.y - R.y); if (d < nd) { nd = d; near = s; } } });
  if (near) { const a = Math.atan2(near.y - R.y, near.x - R.x), dir = ['O', 'SO', 'S', 'SW', 'W', 'NW', 'N', 'NO'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]; cxText(ctx, `NÄCHSTER ORT: ${Math.round(nd / OW_PX_PER_M)} M RICHTUNG ${dir}`, RW_ / 2, OW_VIEW_H + 20, '#94b0c2', 1, 'c'); }
  else cxText(ctx, 'ALLES ENTDECKT! FAHR WEITER HERUM ODER BESUCHE EIN ANDERES LAND', RW_ / 2, OW_VIEW_H + 20, '#a7f070', 1, 'c');
  if (R.msgT > 0) cxText(ctx, R.msg, RW_ / 2, 8, '#ffcd75', R.msg.length > 26 ? 1 : 2, 'c', '#000');
}
