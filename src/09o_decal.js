/* =============================================================================
   Teil 9o: Eigener Aufkleber – 16x16-Pixel-Editor
   Der Aufkleber wird als Text im Design gespeichert (d.decal, 256 Zeichen:
   '.' = durchsichtig, '0'..'b' = Farbe) und mittig auf die Tür geklebt.
   ============================================================================= */
const DECAL_PAL = ['#1a1c2c', '#f4f4f4', '#b13e53', '#ef7d57', '#ffcd75', '#a7f070', '#38b764', '#41a6f6', '#3b5dc9', '#ff6ac1', '#5d275d', '#94b0c2'];
const DECAL_N = 16;
/** Vorlagen werden aus Formeln erzeugt (16x16) */
const _decGen = f => { let o = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) o += f(x + 0.5 - 8, y + 0.5 - 8) || '.'; return o; };
const DECAL_PRESETS = {
  'Blitz': _decGen((x, y) => { const u = y + 8; const c = u < 7 ? 2 - u * 0.75 : u < 9 ? 0 : -1 - (u - 9) * 0.75; return u < 14 && Math.abs(x - c) < (u >= 6 && u < 9 ? 3.2 : 1.6) ? '4' : ''; }),
  'Stern': _decGen((x, y) => { const P = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.1 : 7.6; P.push([Math.cos(a) * r, Math.sin(a) * r]); } let inn = false; for (let i = 0, j = 9; i < 10; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } return inn ? (Math.hypot(x, y) < 2.5 ? '3' : '4') : ''; }),
  'Herz': _decGen((x, y) => { const X = x / 6.5, Y = -(y + 1) / 6.5; return Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y < 0 ? (y < -3 && x < -1 ? '9' : '2') : ''; }),
  'Flamme': _decGen((x, y) => { const u = (y + 8) / 16, w = (1 - u) * 6.5 * (0.6 + 0.4 * Math.sin(u * 9 + x * 0.4)); return Math.abs(x + Math.sin(u * 7) * 1.2) < w && u > 0.08 ? (Math.abs(x) < w * 0.45 && u > 0.35 ? '4' : u > 0.6 ? '3' : '2') : ''; }),
  'Nummer 7': _decGen((x, y) => { const X = x + 8, Y = y + 8; const disc = Math.hypot(x, y) < 7.6; if (!disc) return ''; const seven = (Y >= 3 && Y < 5 && X >= 4 && X < 12) || (Y >= 5 && Y < 13 && Math.abs(X - (11 - (Y - 5) * 0.55)) < 1.1); return seven ? '0' : '1'; })
};
function decalOf(d) { const s = d && d.decal; return typeof s === 'string' && s.length === DECAL_N * DECAL_N ? s : null; }
/** im Auto-Renderer aufgerufen: Aufkleber auf die Tür (nur auf Lackpixeln) */
function drawDecalOn(d, put, mAt, B, bot, beltY, Q) {
  const s = decalOf(d); if (!s) return;
  const cx = Math.round((B.wr + B.wf) / 2), midX = Math.min(Math.max(cx, 0), B.L - 1);
  const ck = Math.round(bot[midX] + (beltY - bot[midX]) * 0.5);
  const sz = Math.max(1, Math.round(Q * 0.75));                                  // ein Aufkleber-Pixel ≈ ¾ Spielpixel
  const x0 = cx - (DECAL_N * sz) / 2, k0 = ck + (DECAL_N * sz) / 2;
  for (let j = 0; j < DECAL_N; j++) for (let i = 0; i < DECAL_N; i++) {
    const ch = s[j * DECAL_N + i]; if (ch === '.') continue;
    const c = Chex(DECAL_PAL[parseInt(ch, 16) % DECAL_PAL.length]);
    for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) { const x = Math.round(x0 + i * sz + a), k = Math.round(k0 - j * sz - b); if (mAt(x, k) === M_BODY) put(x, k, c); }
  }
}
// ---------- Editor ----------
const DEC = { grid: null, col: 0, tool: 'pen', down: false };
ACTIONS.decalEdit = () => {
  const cur = decalOf(S.draft);
  DEC.grid = (cur || '.'.repeat(DECAL_N * DECAL_N)).split('');
  openModal(`<h2 class="title">${ico('star', 'big')} Eigener Aufkleber</h2>
    <div class="row"><div class="col" style="flex:0 0 auto">
      <canvas id="dec-cv" width="256" height="256" style="width:min(256px,70vw);height:min(256px,70vw);image-rendering:pixelated;background:repeating-conic-gradient(#2a2e40 0 25%,#22263a 0 50%) 0 0/32px 32px;touch-action:none;cursor:crosshair;box-shadow:0 0 0 4px var(--line)"></canvas>
    </div><div class="col">
      <div class="lbl">Farbe</div><div class="opts" id="dec-pal">${DECAL_PAL.map((c, i) => `<button class="sw ${i === DEC.col ? 'on' : ''}" style="background:${c}" data-act="decCol" data-v="${i}"></button>`).join('')}</div>
      <div class="lbl">Werkzeug</div><div class="opts">${[['pen', 'Stift'], ['erase', 'Radierer'], ['fill', 'Füllen']].map(([k, l]) => `<button class="btn sm ${DEC.tool === k ? 'sel' : ''}" data-act="decTool" data-v="${k}">${l}</button>`).join('')}
        <button class="btn sm gray" data-act="decClear">Alles löschen</button><button class="btn sm gray" data-act="decMirror">Spiegeln</button></div>
      <div class="lbl">Vorlagen</div><div class="opts">${Object.keys(DECAL_PRESETS).map(k => `<button class="btn sm" data-act="decPreset" data-v="${k}">${k}</button>`).join('')}</div>
      <div class="lbl">Vorschau auf dem Auto</div><img id="dec-prev" style="width:100%;max-width:320px;image-rendering:pixelated;background:#8a8e98">
    </div></div>
    <div class="flex" style="margin-top:8px"><button class="btn green" data-act="decSave">Auf das Auto kleben</button>${cur ? '<button class="btn red" data-act="decRemove">Aufkleber entfernen</button>' : ''}<span class="sp"></span><button class="btn gray" data-act="close">Abbrechen</button></div>`, true);
  const cv = $('#dec-cv');
  const cell = e => { const r = cv.getBoundingClientRect(); return [Math.floor((e.clientX - r.left) / r.width * DECAL_N), Math.floor((e.clientY - r.top) / r.height * DECAL_N)]; };
  const paint = e => {
    const [i, j] = cell(e); if (i < 0 || j < 0 || i >= DECAL_N || j >= DECAL_N) return;
    if (DEC.tool === 'fill') { decFill(i, j); DEC.down = false; }
    else DEC.grid[j * DECAL_N + i] = DEC.tool === 'erase' ? '.' : DEC.col.toString(16);
    decDraw();
  };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); DEC.down = true; cv.setPointerCapture(e.pointerId); paint(e); });
  cv.addEventListener('pointermove', e => { if (DEC.down) paint(e); });
  cv.addEventListener('pointerup', () => { DEC.down = false; decPreview(); });
  decDraw(); decPreview();
};
function decFill(i, j) {
  const g = DEC.grid, from = g[j * DECAL_N + i], to = DEC.col.toString(16); if (from === to) return;
  const st = [[i, j]];
  while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= DECAL_N || y >= DECAL_N || g[y * DECAL_N + x] !== from) continue; g[y * DECAL_N + x] = to; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); }
}
function decDraw() {
  const cv = $('#dec-cv'); if (!cv) return; const c = cv.getContext('2d'), k = cv.width / DECAL_N;
  c.clearRect(0, 0, cv.width, cv.height);
  DEC.grid.forEach((ch, n) => { if (ch === '.') return; c.fillStyle = DECAL_PAL[parseInt(ch, 16) % DECAL_PAL.length]; c.fillRect((n % DECAL_N) * k, Math.floor(n / DECAL_N) * k, k, k); });
  c.strokeStyle = 'rgba(255,255,255,0.08)'; for (let i = 1; i < DECAL_N; i++) { c.beginPath(); c.moveTo(i * k, 0); c.lineTo(i * k, cv.height); c.moveTo(0, i * k); c.lineTo(cv.width, i * k); c.stroke(); }
}
function decPreview() { const im = $('#dec-prev'); if (!im) return; const d = Object.assign({}, S.draft, { decal: DEC.grid.join('') }); const s = drawCarSprite(d, {}); im.src = s.cv.toDataURL(); }
ACTIONS.decCol = d => { DEC.col = +d.v; $$('#dec-pal .sw').forEach((b, i) => b.classList.toggle('on', i === DEC.col)); if (DEC.tool === 'erase') DEC.tool = 'pen'; };
ACTIONS.decTool = d => { DEC.tool = d.v; $$('[data-act="decTool"]').forEach(b => b.classList.toggle('sel', b.dataset.v === d.v)); };
ACTIONS.decClear = () => { DEC.grid = '.'.repeat(DECAL_N * DECAL_N).split(''); decDraw(); decPreview(); };
ACTIONS.decMirror = () => { const g = DEC.grid.slice(); for (let j = 0; j < DECAL_N; j++) for (let i = 0; i < DECAL_N; i++) DEC.grid[j * DECAL_N + i] = g[j * DECAL_N + DECAL_N - 1 - i]; decDraw(); decPreview(); };
ACTIONS.decPreset = d => { const p = DECAL_PRESETS[d.v]; if (!p) return; DEC.grid = p.padEnd(DECAL_N * DECAL_N, '.').slice(0, DECAL_N * DECAL_N).split(''); decDraw(); decPreview(); };
ACTIONS.decSave = () => { const s = DEC.grid.join(''); S.draft.decal = /[^.]/.test(s) ? s : null; closeModal(); rerender(); toast(`${ico('star')} Aufkleber aufs Auto geklebt`, 'good'); };
ACTIONS.decRemove = () => { S.draft.decal = null; closeModal(); rerender(); };
