/* =============================================================================
   Teil 5b: Motorraum in hoher Auflösung (Draufsicht, Front oben)
   Gezeichnet mit Pfaden und Verläufen: Gussteile, polierte Rohre, Schläuche,
   Kabelbaum. Statische Teile werden pro Motor zwischengespeichert, bewegte
   Teile (Riemen, Lüfter, Turbinenrad, Glühen) jedes Bild darübergelegt.
   ============================================================================= */
const BAY_W = 192, BAY_H = 108;
const _bayCache = new Map();

// ---------- Zeichenhelfer ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
function metalFill(c, x, y, w, h, cols, horiz) { const g = horiz ? c.createLinearGradient(x, 0, x + w, 0) : c.createLinearGradient(0, y, 0, y + h); cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col)); return g; }
function part(c, x, y, w, h, r, cols, horiz, edge = 'rgba(0,0,0,0.55)') {
  c.save(); c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 3; c.shadowOffsetY = 1.2;
  rr(c, x, y, w, h, r); c.fillStyle = metalFill(c, x, y, w, h, cols, horiz); c.fill(); c.restore();
  rr(c, x + 0.25, y + 0.25, w - 0.5, h - 0.5, r); c.strokeStyle = edge; c.lineWidth = 0.5; c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.moveTo(x + r, y + 0.6); c.lineTo(x + w - r, y + 0.6); c.stroke();
}
function bolt(c, x, y, r = 0.9) { c.fillStyle = '#9aa0ac'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.fillStyle = '#3a3e48'; c.beginPath(); c.arc(x + 0.15, y + 0.15, r * 0.45, 0, Math.PI * 2); c.fill(); }
function tube(c, pts, w, col, hi = 'rgba(255,255,255,0.35)', smooth = true) {
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); if (smooth && pts.length > 2) { for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); } const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); } else pts.slice(1).forEach(p => c.lineTo(p[0], p[1])); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  path(); c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = w + 1; c.stroke();
  path(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  c.save(); c.translate(-w * 0.18, -w * 0.18); path(); c.strokeStyle = hi; c.lineWidth = Math.max(0.4, w * 0.28); c.stroke(); c.restore();
}
function coupler(c, x, y, w, h) { part(c, x, y, w, h, 0.6, ['#4a7ad8', '#2a4ab0', '#1a2a70']); c.fillStyle = '#c8ccd4'; c.fillRect(x + 0.3, y, 0.5, h); c.fillRect(x + w - 0.8, y, 0.5, h); }
const MAT_COVER = {
  steel: ['#3a3c46', '#24252c', '#16171c'],                   // schwarzer Schrumpflack
  alu: ['#eef1f6', '#b4bac6', '#7a808c', '#c4cad4'],           // poliertes Aluminium
  titan: ['#f0d89a', '#c09a50', '#7a5a2a', '#c8a460']          // Titan/Bronze
};
const EXH_TUBE = { stock: '#5a4a44', sport: '#c8ccd4', race: '#e8e8e8', titan: '#8a6ae0' };

// ---------- Motorraum (statisch, pro Farbe) ----------
function bayBase(bodyColor) {
  const key = 'bay|' + bodyColor; if (_bayCache.has(key)) return _bayCache.get(key);
  const cv = document.createElement('canvas'); cv.width = BAY_W; cv.height = BAY_H; const c = hdCtx(cv);
  // Boden
  let g = c.createLinearGradient(0, 0, 0, BAY_H); g.addColorStop(0, '#15161d'); g.addColorStop(0.6, '#0e0f14'); g.addColorStop(1, '#08090c');
  c.fillStyle = g; c.fillRect(0, 0, BAY_W, BAY_H);
  for (let i = 0; i < 200; i++) { c.fillStyle = `rgba(255,255,255,${(0.02 + hash2(i, 3) * 0.03).toFixed(3)})`; c.fillRect(hash2(i, 1) * BAY_W, hash2(i, 2) * BAY_H, 0.5, 0.5); }
  // Innenkotflügel in Wagenfarbe
  const bc = hex2rgb(bodyColor), sh = f => rgb2hex(shadeRGB(bc, f).map(Math.round));
  for (const [x0, dir] of [[0, 1], [BAY_W, -1]]) {
    c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + dir * 26, 0); c.lineTo(x0 + dir * 24, 40); c.quadraticCurveTo(x0 + dir * 20, 70, x0 + dir * 24, BAY_H); c.lineTo(x0, BAY_H); c.closePath();
    g = c.createLinearGradient(x0, 0, x0 + dir * 26, 0); g.addColorStop(0, sh(0.25)); g.addColorStop(0.6, sh(-0.05)); g.addColorStop(1, sh(-0.45)); c.fillStyle = g; c.fill();
    c.strokeStyle = sh(0.5); c.lineWidth = 0.6; c.beginPath(); c.moveTo(x0 + dir * 25.5, 0); c.lineTo(x0 + dir * 23.5, 40); c.stroke();
    // Federbeindom mit Domlager
    const dx = x0 + dir * 33, dy = 30;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 4; c.fillStyle = sh(-0.25); c.beginPath(); c.ellipse(dx, dy, 10, 9, 0, 0, Math.PI * 2); c.fill(); c.restore();
    g = c.createRadialGradient(dx - 2, dy - 2, 1, dx, dy, 9); g.addColorStop(0, sh(0.2)); g.addColorStop(1, sh(-0.35)); c.fillStyle = g; c.beginPath(); c.ellipse(dx, dy, 9, 8, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1a1b22'; c.beginPath(); c.arc(dx, dy, 3.5, 0, Math.PI * 2); c.fill(); bolt(c, dx, dy, 1.6);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; bolt(c, dx + Math.cos(a) * 6, dy + Math.sin(a) * 5.5, 0.8); }
  }
  // Schlossträger + Kühler
  part(c, 22, 0, BAY_W - 44, 5, 0.5, ['#2a2b33', '#16171c']);
  part(c, 36, 5, BAY_W - 72, 11, 0.8, ['#3a3c46', '#22232a']);
  c.fillStyle = '#5a5e68'; for (let x = 38; x < BAY_W - 38; x += 1.2) c.fillRect(x, 6.5, 0.45, 8.5);
  part(c, 36, 4.5, BAY_W - 72, 2.4, 0.6, ['#6a6e78', '#3a3c46']);
  part(c, BAY_W - 54, 2.2, 6, 3.4, 1.6, ['#d8dce4', '#8a8e98']);                               // Kühlerdeckel
  // Scheinwerfer-Rückseiten
  for (const x of [8, BAY_W - 22]) { part(c, x, 2, 14, 10, 3, ['#3a3c46', '#1a1b22']); c.fillStyle = '#5a5e68'; c.beginPath(); c.arc(x + 7, 7, 3, 0, Math.PI * 2); c.fill(); }
  // Spritzwand mit Wasserkasten-Abdeckung
  part(c, 22, BAY_H - 14, BAY_W - 44, 14, 1, ['#2a2b33', '#121318']);
  c.fillStyle = '#08090c'; for (let x = 30; x < BAY_W - 30; x += 3.4) c.fillRect(x, BAY_H - 9, 2.2, 5);
  // Bremskraftverstärker + Hauptbremszylinder + Bremsflüssigkeit
  c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 4; g = c.createRadialGradient(36, BAY_H - 22, 1, 38, BAY_H - 20, 12); g.addColorStop(0, '#4a4c58'); g.addColorStop(1, '#111216'); c.fillStyle = g; c.beginPath(); c.arc(38, BAY_H - 20, 11, 0, Math.PI * 2); c.fill(); c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.5; c.beginPath(); c.arc(38, BAY_H - 20, 8, 0, Math.PI * 2); c.stroke();
  part(c, 34, BAY_H - 38, 8, 12, 1, ['#d8dce4', '#8a8e98', '#c8ccd4'], true); part(c, 33, BAY_H - 42, 10, 5, 1.2, ['#f0ecd8', '#c8c0a0']); c.fillStyle = '#e8d44d'; c.beginPath(); c.arc(38, BAY_H - 40, 1.6, 0, Math.PI * 2); c.fill();
  // Batterie mit Polkappen
  part(c, 150, 44, 20, 26, 1.2, ['#3a3c46', '#1e1f26', '#2a2b33']);
  c.fillStyle = '#c03040'; c.fillRect(152, 46, 5, 3); c.fillStyle = '#2a2b33'; c.fillRect(163, 46, 5, 3);
  cxText(c, '12V', 160, 58, '#8a8e98', 1, 'c'); c.fillStyle = '#c03040'; c.fillRect(151, 66, 18, 1);
  // Ausgleichsbehälter (Kühlmittel) + Waschwasser
  g = c.createLinearGradient(0, 74, 0, 90); g.addColorStop(0, 'rgba(240,240,236,0.95)'); g.addColorStop(1, 'rgba(200,200,196,0.95)');
  rr(c, 152, 74, 16, 14, 2); c.fillStyle = g; c.fill(); c.fillStyle = 'rgba(255,110,170,0.6)'; c.fillRect(153, 81, 14, 6.5); c.fillStyle = '#16171c'; c.beginPath(); c.arc(160, 77, 2.4, 0, Math.PI * 2); c.fill();
  part(c, 152, 20, 12, 14, 2, ['#4a8ad8', '#2a5ab0']); c.fillStyle = '#e8e8f0'; c.beginPath(); c.arc(158, 22, 1.8, 0, Math.PI * 2); c.fill();
  // Sicherungskasten
  part(c, 26, 46, 14, 16, 1.2, ['#2a2b33', '#16171c']); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.strokeRect(28, 48, 10, 12);
  // Kabelbaum entlang der Seiten
  tube(c, [[33, 62], [30, 74], [32, 84], [46, 92], [80, 93], [120, 93], [150, 92]], 1.6, '#16171c', 'rgba(255,255,255,0.15)');
  for (const [x, y] of [[31, 70], [60, 93], [100, 93], [140, 92]]) { c.fillStyle = '#e88a30'; c.fillRect(x - 1, y - 1, 2.2, 2); }
  const out = cv; _bayCache.set(key, out); return out;
}

// ---------- Motor (statisch, pro Konfiguration) ----------
function bayEngine(e) {
  const key = 'eng|' + JSON.stringify([e.type, e.disp, e.ind, e.mat, e.exh, e.nos, e.motors]);
  if (_bayCache.has(key)) return _bayCache.get(key);
  const cv = document.createElement('canvas'); cv.width = BAY_W; cv.height = BAY_H; const c = hdCtx(cv);
  const T = ENGINE_TYPES[e.type] || ENGINE_TYPES.i4, ty = e.type, cx = 96, isEV = ty === 'ev', hyb = ty === 'hybrid';
  const cover = MAT_COVER[e.mat] || MAT_COVER.steel, exC = EXH_TUBE[e.exh] || EXH_TUBE.stock;
  const info = { pulleys: [], fans: [], turbos: [], glow: [], sc: null };
  const head = (x, y, w, h, n, label, rot) => {                                         // Zylinderkopf mit Ventildeckel
    part(c, x - 1.5, y - 1.5, w + 3, h + 3, 2, ['#5a5e68', '#3a3c46', '#2a2b33']);           // Kopf (Guss)
    part(c, x, y, w, h, 2.4, cover, true);
    if (e.mat === 'steel') { for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + hash2(i, w) * w, y + hash2(i, h) * h, 0.5, 0.5); } }
    else { c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 0.5; for (let yy = y + 3; yy < y + h - 2; yy += 2.2) { c.beginPath(); c.moveTo(x + 1.5, yy); c.lineTo(x + 3.5, yy); c.moveTo(x + w - 3.5, yy); c.lineTo(x + w - 1.5, yy); c.stroke(); } }
    for (let i = 0; i < n; i++) {                                                         // Zündspulen
      const yy = y + 4 + i * ((h - 8) / Math.max(1, n - 1 || 1));
      part(c, x + w / 2 - 2.5, yy - 1.6, 5, 3.2, 0.6, ['#2a2b33', '#101114']); c.fillStyle = '#c03040'; c.fillRect(x + w / 2 + 1.2, yy - 0.6, 1.4, 1.2);
    }
    for (const [bx, by] of [[x + 1.4, y + 1.4], [x + w - 1.4, y + 1.4], [x + 1.4, y + h - 1.4], [x + w - 1.4, y + h - 1.4]]) bolt(c, bx, by, 0.6);
    if (label) { c.save(); c.translate(x + w / 2, y + h / 2); if (rot) c.rotate(-Math.PI / 2); cxText(c, label, 0, -2, e.mat === 'steel' ? '#c03040' : 'rgba(30,30,40,0.7)', 1, 'c'); c.restore(); }
  };
  const header = (pts, n) => { tube(c, pts, n || 2.2, exC); };
  if (isEV) {
    const n = clamp(e.motors | 0, 1, 4);
    for (let i = 0; i < Math.min(2, n); i++) {
      const mx = n === 1 ? cx : cx - 20 + i * 40, my = 52;
      part(c, mx - 15, my - 18, 30, 36, 8, ['#9aa2b2', '#5a6070', '#3a3e4a'], true);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; for (let yy = my - 14; yy < my + 16; yy += 2.4) { c.beginPath(); c.moveTo(mx - 13, yy); c.lineTo(mx + 13, yy); c.stroke(); }
      c.fillStyle = '#2a2e38'; c.beginPath(); c.arc(mx, my, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#73eff7'; c.beginPath(); c.arc(mx, my, 2, 0, Math.PI * 2); c.fill();
    }
    part(c, cx - 26, 22, 52, 14, 2, ['#c8ccd4', '#8a8e98', '#5a5e68']); cxText(c, 'HV-INVERTER', cx, 27, '#3a3e48', 1, 'c');
    c.fillStyle = '#e88a30'; c.fillRect(cx - 24, 23, 3, 3);
    tube(c, [[cx - 20, 36], [cx - 24, 46], [cx - 18, 52]], 2.4, '#e8781a'); tube(c, [[cx + 20, 36], [cx + 24, 46], [cx + 18, 52]], 2.4, '#e8781a');
    tube(c, [[cx - 8, 70], [cx - 30, 84], [cx - 50, 92]], 2.4, '#e8781a'); tube(c, [[cx + 8, 70], [cx + 30, 84], [cx + 50, 92]], 2.4, '#e8781a');
    tube(c, [[60, 16], [64, 30], [70, 40]], 2, '#2a5ab0'); tube(c, [[132, 16], [128, 30], [122, 40]], 2, '#2a5ab0');
    if (n > 2) cxText(c, 'x' + n, cx, 74, '#73eff7', 2, 'c', '#000');
    cxText(c, 'HIGH VOLTAGE', cx, 82, '#e8781a', 1, 'c');
  } else {
    const cyl = T.cyl;
    let banks;
    if (ty === 'flat6') banks = 'flat'; else if (ty === 'rotary') banks = 'rot'; else if (cyl === 16) banks = 'w'; else if (/^v/.test(ty)) banks = 'v'; else banks = 'inline';
    const n = ty === 'i6' ? 6 : cyl === 4 || hyb ? 4 : cyl / 2;
    const len = banks === 'inline' ? n * 8.5 + 10 : banks === 'v' ? n * 8 + 10 : banks === 'w' ? 44 : 34;
    const y0 = 56 - len / 2;
    // Ölwanne/Block-Silhouette
    part(c, cx - (banks === 'flat' ? 56 : banks === 'inline' ? 18 : 36), y0 - 4, (banks === 'flat' ? 112 : banks === 'inline' ? 36 : 72), len + 8, 4, ['#4a4c56', '#2a2b33', '#1a1b20']);
    if (banks === 'inline') {
      head(cx - 12, y0, 24, len, n, ty === 'i6' ? 'DOHC 24V' : 'DOHC 16V', true);
      // Ansaugbrücke links mit Saugrohren + Sammler
      for (let i = 0; i < n; i++) { const yy = y0 + 5 + i * ((len - 10) / (n - 1)); tube(c, [[cx - 12, yy], [cx - 18, yy], [cx - 24, yy + 1]], 2.6, '#c4cad4'); }
      part(c, cx - 32, y0 + 2, 8, len - 4, 2.5, ['#e4e8ee', '#9aa0ac', '#6a6e78'], true);
      part(c, cx - 33, y0 - 6, 10, 7, 3, ['#d8dce4', '#7a808c']); info.tb = [cx - 28, y0 - 3];
      // Krümmer rechts
      for (let i = 0; i < n; i++) { const yy = y0 + 5 + i * ((len - 10) / (n - 1)); header([[cx + 12, yy], [cx + 19, yy + 2], [cx + 24, y0 + len * 0.55]], 2); }
      info.glow.push([cx + 22, y0 + len * 0.55]); info.exOut = [cx + 26, y0 + len * 0.6]; info.exSide = 1;
    } else if (banks === 'v' || banks === 'w') {
      const bw = banks === 'w' ? 12 : 18, gap = banks === 'w' ? 30 : 12;
      const bx = banks === 'w' ? [cx - 44, cx - 30, cx + 18, cx + 32] : [cx - gap / 2 - bw, cx + gap / 2];
      bx.forEach((x, i) => head(x, y0, bw, len, n, i === 0 && banks !== 'w' ? T.name.toUpperCase() : null, true));
      // Ansaugbrücke im V mit Saugrohren
      if (e.ind !== 'super') {
        part(c, cx - (banks === 'w' ? 14 : 9), y0 + 2, banks === 'w' ? 28 : 18, len - 4, 3, ['#eef1f6', '#a8aeb8', '#6a707c'], true);
        for (let i = 0; i < n; i++) { const yy = y0 + 5 + i * ((len - 10) / Math.max(1, n - 1)); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(cx - (banks === 'w' ? 14 : 9), yy, banks === 'w' ? 28 : 18, 0.7); }
        cxText(c, banks === 'w' ? 'W16' : (T.name + ' ' + (+e.disp).toFixed(1)).toUpperCase(), cx, y0 + len / 2 - 2, '#3a3e48', 1, 'c');
      }
      part(c, cx - 5, y0 - 8, 10, 8, 4, ['#d8dce4', '#7a808c']); info.tb = [cx, y0 - 4];
      // Krümmer an beiden Aussenseiten
      const L0 = bx[0] - 1.5, R0 = bx[bx.length - 1] + bw + 1.5;
      for (let i = 0; i < n; i++) { const yy = y0 + 5 + i * ((len - 10) / Math.max(1, n - 1)); header([[L0, yy], [L0 - 6, yy + 1.5], [L0 - 10, y0 + len * 0.62]], 1.9); header([[R0, yy], [R0 + 6, yy + 1.5], [R0 + 10, y0 + len * 0.62]], 1.9); }
      info.glow.push([L0 - 8, y0 + len * 0.6], [R0 + 8, y0 + len * 0.6]); info.exL = [L0 - 10, y0 + len * 0.62]; info.exR = [R0 + 10, y0 + len * 0.62];
    } else if (banks === 'flat') {
      // Boxer: liegende Zylinder links/rechts, Gebläse in der Mitte
      head(cx - 56, y0, 16, len, 3, null); head(cx + 40, y0, 16, len, 3, null);
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const yy = y0 + 6 + i * 11; part(c, cx + sx * 26 - 7, yy - 3.5, 14, 7, 2, ['#6a6e78', '#3a3c46']); c.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 5; k++) c.fillRect(cx + sx * 26 - 6 + k * 2.6, yy - 3, 0.6, 6); }
      part(c, cx - 16, y0 - 2, 32, len + 4, 6, ['#3a3c46', '#1a1b20']);
      info.fans.push([cx, y0 + len / 2, 12]);
      part(c, cx - 8, y0 - 10, 16, 8, 3, ['#d8dce4', '#7a808c']); info.tb = [cx, y0 - 6];
      for (const sx of [-1, 1]) header([[cx + sx * 56, y0 + len - 4], [cx + sx * 60, y0 + len + 4], [cx + sx * 48, y0 + len + 10]], 2.2);
      info.glow.push([cx - 52, y0 + len + 6], [cx + 52, y0 + len + 6]); info.exL = [cx - 48, y0 + len + 10]; info.exR = [cx + 48, y0 + len + 10];
    } else {
      // Kreiskolben: zwei Läufergehäuse, langer Ansaugkrümmer oben drauf
      for (let r = 0; r < 2; r++) { part(c, cx - 22 + r * 23, y0, 21, len, 5, ['#8a8e98', '#5a5e68', '#3a3c46'], true); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.5; for (let yy = y0 + 4; yy < y0 + len - 3; yy += 2.5) { c.beginPath(); c.moveTo(cx - 20 + r * 23, yy); c.lineTo(cx - 3 + r * 23, yy); c.stroke(); } }
      for (let i = 0; i < 4; i++) tube(c, [[cx - 16 + i * 10, y0 + 6], [cx - 14 + i * 9, y0 - 2], [cx - 6 + i * 4, y0 - 8]], 2.4, '#c4cad4');
      part(c, cx - 10, y0 - 14, 20, 7, 3, ['#eef1f6', '#9aa0ac']); cxText(c, 'ROTARY', cx, y0 - 13, '#3a3e48', 1, 'c'); info.tb = [cx, y0 - 16];
      for (let i = 0; i < 4; i++) { c.fillStyle = '#101114'; c.fillRect(cx - 21 + i * 11, y0 + len - 6, 3, 3); c.fillStyle = '#c03040'; c.fillRect(cx - 20 + i * 11, y0 + len - 5, 1, 1); }
      header([[cx + 23, y0 + 8], [cx + 30, y0 + 12], [cx + 34, y0 + len * 0.7]], 3); header([[cx + 23, y0 + len - 8], [cx + 30, y0 + len - 4], [cx + 34, y0 + len * 0.7]], 3);
      info.glow.push([cx + 32, y0 + len * 0.6]); info.exOut = [cx + 34, y0 + len * 0.7]; info.exSide = 1;
    }
    if (hyb) { part(c, cx - 18, y0 + len + 4, 36, 9, 3, ['#9aa2b2', '#5a6070']); tube(c, [[cx + 16, y0 + len + 8], [cx + 40, y0 + len + 14], [150, 90]], 2.2, '#e8781a'); cxText(c, 'HYBRID', cx, y0 + len + 6, '#e8781a', 1, 'c'); }
    // Riementrieb vorne: Kurbelwelle, Lichtmaschine, Wasserpumpe, Klima
    const py = y0 - 3;
    info.pulleys = [[cx - 14, py - 6, 4.2], [cx + 14, py - 8, 3.4], [cx, py - 12, 3.4], [cx - 24, py - 12, 2.8]];
    // Luftfilter / Ansaugung
    if (e.ind === 'none' || e.ind === 'super') {
      part(c, 46, 20, 26, 16, 3, ['#3a3c46', '#1a1b20']); c.strokeStyle = 'rgba(255,255,255,0.1)'; for (let x = 49; x < 70; x += 2.5) { c.beginPath(); c.moveTo(x, 22); c.lineTo(x, 34); c.stroke(); }
      if (info.tb) tube(c, [[70, 30], [info.tb[0] - 10, info.tb[1] - 6], info.tb], 4.2, '#1e1f26', 'rgba(255,255,255,0.15)');
    }
    // Kompressor auf der Ansaugbrücke
    if (e.ind === 'super') {
      part(c, cx - 12, y0 + 2, 24, len - 4, 5, ['#f4f6fa', '#b4bac6', '#6a707c'], true);
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.6; for (let yy = y0 + 6; yy < y0 + len - 4; yy += 2.6) { c.beginPath(); c.moveTo(cx - 10, yy); c.lineTo(cx + 10, yy); c.stroke(); }
      part(c, cx - 7, y0 + len / 2 - 4, 14, 8, 2, ['#c03040', '#801820']); cxText(c, 'SC', cx, y0 + len / 2 - 2, '#ffffff', 1, 'c');
      info.sc = [cx, y0 - 2, 5];
    }
    // Turbolader + Ladeluftkühler + Ladeluftrohre
    if (e.ind === 'turbo' || e.ind === 'twin') {
      part(c, 34, 16, BAY_W - 68, 7, 1, ['#d8dce4', '#8a8e98']); c.fillStyle = 'rgba(0,0,0,0.3)'; for (let x = 36; x < BAY_W - 36; x += 1.3) c.fillRect(x, 17, 0.45, 5);
      const turbos = e.ind === 'twin' ? [[info.exL || info.exOut, -1], [info.exR || info.exOut, 1]] : [[info.exR || info.exOut, 1]];
      turbos.forEach(([p, sd]) => {
        if (!p) return;
        const tx = clamp(p[0] + sd * 8, 44, BAY_W - 44), tyy = p[1] - 6;
        c.save(); c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 4;
        let gg = c.createRadialGradient(tx - 1, tyy + 5, 1, tx, tyy + 6, 6); gg.addColorStop(0, '#8a5a3a'); gg.addColorStop(1, '#3a2a22'); c.fillStyle = gg; c.beginPath(); c.arc(tx, tyy + 6, 5.5, 0, Math.PI * 2); c.fill();   // Turbinengehäuse
        gg = c.createRadialGradient(tx - 1.5, tyy - 2, 1, tx, tyy - 1, 7); gg.addColorStop(0, '#f4f6fa'); gg.addColorStop(1, '#7a808c'); c.fillStyle = gg; c.beginPath(); c.arc(tx, tyy - 1, 6.5, 0, Math.PI * 2); c.fill();     // Verdichter
        c.restore();
        c.fillStyle = '#1a1b20'; c.beginPath(); c.arc(tx, tyy - 1, 3.4, 0, Math.PI * 2); c.fill(); info.turbos.push([tx, tyy - 1]);
        tube(c, [[tx, tyy - 7], [tx, 26], [tx + sd * -6, 22]], 3, '#c8ccd4'); coupler(c, tx - 2, 24.5, 4, 2.2);
        info.glow.push([tx, tyy + 6]);
        // Ladeluft zurück zur Drosselklappe
        if (info.tb && sd > 0) { tube(c, [[BAY_W - 40, 20], [BAY_W - 46, 28], [info.tb[0] + 14, info.tb[1] - 8], info.tb], 3.2, '#c8ccd4'); coupler(c, BAY_W - 47, 26, 4, 2.4); }
        if (info.tb && sd < 0 && e.ind === 'twin') tube(c, [[40, 20], [46, 28], [info.tb[0] - 14, info.tb[1] - 8], [info.tb[0] - 3, info.tb[1]]], 3.2, '#c8ccd4');
        part(c, tx + sd * 8 - 2, tyy - 9, 4, 4, 1.6, ['#c8ccd4', '#6a6e78']);                        // Schubumluftventil
      });
    }
    // Kühlerschläuche
    tube(c, [[60, 15], [64, 24], [cx - 20, y0 - 2]], 3, '#1a1b20', 'rgba(255,255,255,0.12)');
    tube(c, [[132, 15], [128, 26], [cx + 20, y0 + 6]], 3, '#1a1b20', 'rgba(255,255,255,0.12)');
    // NOS-Flaschen an der Spritzwand
    if (e.nos !== 'none') {
      const nn = e.nos === 'big' ? 2 : 1;
      for (let i = 0; i < nn; i++) { part(c, 52 + i * 11, 70, 9, 18, 4, ['#6a8af0', '#2a4ab0', '#18287a'], true); cxText(c, 'N', 56.5 + i * 11, 76, '#ffffff', 1, 'c'); part(c, 54 + i * 11, 67, 5, 4, 1.5, ['#d8dce4', '#8a8e98']); }
      tube(c, [[56, 67], [62, 60], [info.tb ? info.tb[0] - 6 : cx, info.tb ? info.tb[1] + 4 : y0]], 0.9, '#3a5ab8', 'rgba(255,255,255,0.4)');
    }
    // Domstrebe bei Leichtbau
    if (e.mat !== 'steel') { tube(c, [[33, 30], [BAY_W - 33, 30]], 2.4, e.mat === 'titan' ? '#8a6ae0' : '#c03040', 'rgba(255,255,255,0.5)', false); bolt(c, 33, 30, 1.2); bolt(c, BAY_W - 33, 30, 1.2); }
    // Typenschild
    cxText(c, (T.name + ' ' + (+e.disp).toFixed(1) + 'L' + (e.ind !== 'none' ? ' ' + INDUCTIONS[e.ind].name : '')).toUpperCase(), cx, BAY_H - 20, '#ffcd75', 1, 'c', '#000');
  }
  const out = { cv, info };
  if (_bayCache.size > 40) _bayCache.delete(_bayCache.keys().next().value);
  _bayCache.set(key, out); return out;
}

// ---------- Hauptfunktion (ersetzt die alte grobe Darstellung) ----------
let _bayAng = 0;
function drawEngineBay(ctx, e, bodyColor, t) {
  const run = typeof REV !== 'undefined' && REV.on && REV.mode === 'engine' && REV.E, ru = run ? clamp(REV.rpm / REV.E.red, 0, 1) : 0;
  _bayAng += run ? 0.2 + ru * 1.6 : 0.02;
  const E = bayEngine(e), info = E.info;
  ctx.drawImage(bayBase(bodyColor || '#b13e53'), 0, 0, BAY_W, BAY_H);
  const jig = run ? Math.sin(t * 70) * (0.25 + ru * 0.6) : 0;
  ctx.save(); ctx.translate(jig, jig * 0.4);
  ctx.drawImage(E.cv, 0, 0, BAY_W, BAY_H);
  // Riementrieb (dreht sich mit)
  if (info.pulleys.length) {
    const P = info.pulleys;
    ctx.strokeStyle = '#0c0c10'; ctx.lineWidth = 1.2; ctx.beginPath(); P.concat([P[0]]).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    for (const [x, y, r] of P) {
      let g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0.5, x, y, r); g.addColorStop(0, '#e8ecf2'); g.addColorStop(1, '#5a5e68');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2b33'; ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++) { const a = _bayAng * (6 / r) + k * 2.094; ctx.fillStyle = '#c8ccd4'; ctx.fillRect(x + Math.cos(a) * r * 0.7 - 0.4, y + Math.sin(a) * r * 0.7 - 0.4, 0.8, 0.8); }
    }
  }
  if (info.sc) { const [x, y, r] = info.sc; ctx.fillStyle = '#2a2b33'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 6; k++) { const a = _bayAng * 2 + k * 1.047; ctx.fillStyle = '#8a8e98'; ctx.fillRect(x + Math.cos(a) * 3 - 0.4, y + Math.sin(a) * 3 - 0.4, 0.8, 0.8); } }
  // Gebläse (Boxer) und Turbinenrad dreht sich
  for (const [x, y, r] of info.fans) { ctx.fillStyle = '#16171c'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 11; k++) { const a = _bayAng * 3 + k * 0.571; ctx.strokeStyle = '#6a6e78'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); ctx.lineTo(x + Math.cos(a + 0.25) * (r - 1), y + Math.sin(a + 0.25) * (r - 1)); ctx.stroke(); } ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); }
  for (const [x, y] of info.turbos) for (let k = 0; k < 7; k++) { const a = _bayAng * 9 + k * 0.898; ctx.strokeStyle = '#9aa0ac'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); ctx.stroke(); }
  // Krümmer glühen bei hoher Drehzahl
  const glow = run ? clamp((ru - 0.5) * 2.2, 0, 1) : 0;
  if (glow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [x, y] of info.glow) { const g = ctx.createRadialGradient(x, y, 0.5, x, y, 9); g.addColorStop(0, `rgba(255,120,40,${(0.65 * glow).toFixed(2)})`); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18); } ctx.restore(); }
  ctx.restore();
  // Kühlerlüfter-Andeutung (vorne, dreht)
  for (const fx of [72, 120]) { ctx.save(); ctx.globalAlpha = 0.5; for (let k = 0; k < 5; k++) { const a = _bayAng * 2.5 + k * 1.257; ctx.strokeStyle = '#2a2b33'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(fx, 11); ctx.lineTo(fx + Math.cos(a) * 5, 11 + Math.sin(a) * 2.2); ctx.stroke(); } ctx.restore(); }
}
