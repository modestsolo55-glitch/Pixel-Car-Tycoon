/* =============================================================================
   Teil 5c: Garage einrichten – Wand, Boden, Licht, Deko links/rechts kaufen.
   Der Hintergrund wird pro Einrichtung einmal gezeichnet und zwischengespeichert;
   Fernseher, Spielautomat und Neonröhren werden in drawGarage animiert.
   ============================================================================= */
const GDECO = {
  wall:  { title: 'Wand', items: { brick: ['Backstein', 0], wood: ['Holzbretter', 8000], concrete: ['Sichtbeton', 6000], white: ['Weisse Fliesen', 12000], dark: ['Schwarz matt', 15000] } },
  floor: { title: 'Boden', items: { epoxy: ['Epoxid grau', 0], checker: ['Schachbrett', 9000], wood: ['Parkett', 14000], hex: ['Sechseck-Fliesen', 20000] } },
  light: { title: 'Licht', items: { warm: ['Warmweiss', 0], cold: ['Tageslicht', 3000], neon: ['Neon pink/blau', 10000] } },
  left:  { title: 'Deko links', items: { tools: ['Werkzeugwand', 0], poster: ['Poster', 4000], bikes: ['Fahrräder', 6000], trophy: ['Pokalregal', 15000] } },
  right: { title: 'Deko rechts', items: { shelf: ['Reifenregal', 0], tv: ['Fernseher', 9000], arcade: ['Spielautomat', 18000], sofa: ['Sofa-Ecke', 12000] } }
};
function gdeco() {
  if (!S.gdeco) S.gdeco = { own: [], sel: {} };
  const g = S.gdeco;
  for (const slot in GDECO) if (!g.sel[slot]) g.sel[slot] = Object.keys(GDECO[slot].items)[0];
  return g;
}
const gdecoOwned = (slot, id) => GDECO[slot].items[id][1] === 0 || gdeco().own.includes(slot + '.' + id) || (S && S.admin && S.admin.freeShop);
ACTIONS.gdeco = d => {
  const [slot, id] = String(d.v).split('.'), it = GDECO[slot] && GDECO[slot].items[id]; if (!it) return;
  const g = gdeco();
  if (!gdecoOwned(slot, id)) {
    if (S.money < it[1]) { toast('Zu wenig Geld für ' + it[0] + '.', 'bad'); return; }
    S.money -= it[1]; g.own.push(slot + '.' + id); finAdd && finAdd('inv', it[1]);
    toast(`${ico('car')} Gekauft: <b>${it[0]}</b> für deine Garage`, 'good');
  }
  g.sel[slot] = id; _garageBG = null; rerender();
};
function gdecoPanelHTML() {
  const g = gdeco();
  return `<div class="panel"><h3>${ico('wrench')}Garage einrichten</h3>
    ${Object.entries(GDECO).map(([slot, G]) => `<div class="lbl">${G.title}</div><div class="opts">${Object.entries(G.items).map(([id, [name, cost]]) => {
      const own = gdecoOwned(slot, id), sel = g.sel[slot] === id;
      return `<button class="btn sm ${sel ? 'sel' : ''} ${own ? '' : 'gray'}" data-act="gdeco" data-v="${slot}.${id}">${name}${own ? '' : ' · ' + fmtMoney(cost)}</button>`;
    }).join('')}</div>`).join('')}
    <div class="hint">Einmal gekauft, kannst du jederzeit umstellen. Die Einrichtung ist auch auf deinen Fotos zu sehen.</div></div>`;
}

/** Wand, Boden und Deko in den Garagen-Hintergrund zeichnen (200x112, Boden ab y=82) */
function drawGarageDeco(pb, W, H, floorY, sel) {
  // ---- Wand ----
  for (let y = 0; y < floorY; y++) for (let x = 0; x < W; x++) {
    let c, n = hash2(x, y);
    if (sel.wall === 'wood') {
      const pl = Math.floor(x / 11), gap = x % 11 === 10, tone = hash2(pl, 3);
      c = gap ? [44, 28, 20] : mixRGB([120, 78, 46], [150, 100, 60], tone);
      if (!gap && hash2(pl, Math.floor(y / 3)) > 0.82) c = shadeRGB(c, -0.12);                  // Maserung
      if (!gap && y % 37 === Math.floor(tone * 30)) c = shadeRGB(c, -0.25);                    // Stoss
    } else if (sel.wall === 'concrete') {
      c = mixRGB([118, 120, 126], [140, 142, 148], hash2(x >> 2, y >> 2) * 0.6 + n * 0.4);
      if (x % 50 === 0 || y % 26 === 0) c = shadeRGB(c, -0.15);
      if ((x % 50 === 12 || x % 50 === 37) && (y % 26 === 6 || y % 26 === 19)) c = [60, 62, 68];   // Ankerlöcher
    } else if (sel.wall === 'white') {
      const gx = x % 9 === 8, gy2 = y % 9 === 8;
      c = gx || gy2 ? [150, 156, 166] : mixRGB([226, 230, 236], [246, 248, 252], hash2(x / 9 | 0, y / 9 | 0));
    } else if (sel.wall === 'dark') {
      c = mixRGB([26, 27, 34], [34, 35, 44], n * 0.5 + hash2(x >> 3, y >> 3) * 0.5);
      if (y === 60 || y === 61) c = [150, 30, 44];                                               // Zierlinie
    } else {
      const row = Math.floor(y / 5), off = (row % 2) * 6;
      const mortar = y % 5 === 4 || (x + off) % 12 === 11;
      c = mortar ? [40, 36, 46] : mixRGB([110, 52, 52], [138, 66, 58], hash2(Math.floor((x + off) / 12), row));
    }
    c = shadeRGB(c, -0.35 + y / floorY * 0.25 + (n - 0.5) * 0.06);
    pb.set(x, y, Crgb(c));
  }
  pb.rect(0, 0, W, 5, Chex('#1c1d28')); pb.rect(0, 5, W, 1, Chex('#33343f'));
  // ---- Deko links ----
  if (sel.left === 'poster') {
    const poster = (x, y, w, h, top, bot) => { pb.rect(x - 1, y - 1, w + 2, h + 2, Chex('#0d0f1a')); for (let j = 0; j < h; j++) pb.rect(x, y + j, w, 1, Crgb(mixRGB(hex2rgb(top), hex2rgb(bot), j / h))); };
    poster(8, 18, 22, 30, '#ef7d57', '#5d275d'); pb.disc(19, 30, 5, Chex('#ffcd75'));                 // Sonnenuntergang
    pb.rect(8, 38, 22, 10, Chex('#1a1c2c')); pb.rect(10, 37, 18, 3, Chex('#b13e53')); pb.rect(14, 35, 9, 2, Chex('#b13e53')); pb.disc(13, 40, 1.5, Chex('#0d0f1a')); pb.disc(24, 40, 1.5, Chex('#0d0f1a'));
    poster(34, 22, 18, 24, '#f4f4f4', '#c8ccd4');
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if ((i + j) & 1) pb.rect(36 + i * 3.5, 25 + j * 3, 3, 3, Chex('#1a1c2c'));   // Zielflagge
    pb.rect(36, 39, 14, 2, Chex('#b13e53')); pb.rect(36, 42, 10, 1, Chex('#566c86'));
  } else if (sel.left === 'bikes') {
    const bike = (x, y, col) => {
      for (const wx of [x, x + 18]) { pb.ring(wx, y, 4.6, 6, Chex('#1a1b22')); pb.disc(wx, y, 1, Chex('#8a8e98')); for (let a = 0; a < 6; a++) pb.line(wx, y, wx + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, Chex('#5a5e68')); }
      pb.line(x, y, x + 7, y - 7, Chex(col)); pb.line(x + 7, y - 7, x + 16, y - 7, Chex(col)); pb.line(x + 16, y - 7, x + 18, y, Chex(col)); pb.line(x + 7, y - 7, x + 9, y, Chex(col)); pb.line(x, y, x + 9, y, Chex(col));
      pb.rect(x + 6, y - 9, 4, 1, Chex('#1a1b22')); pb.line(x + 16, y - 7, x + 15, y - 10, Chex('#8a8e98')); pb.rect(x + 13, y - 10, 4, 1, Chex('#1a1b22'));
      pb.rect(x + 8, y - 13, 2, 3, Chex('#5a5e68'));                                              // Haken
    };
    bike(12, 32, '#3b5dc9'); bike(12, 54, '#a7f070');
  } else if (sel.left === 'trophy') {
    for (const sy of [30, 48]) { pb.rect(6, sy, 48, 2, Chex('#6a4a2e')); pb.rect(6, sy, 48, 1, Chex('#8a6a44')); }
    const n = clamp(Math.floor(((S && S.stats && S.stats.wins) || 0) / 3) + 2, 2, 10);
    for (let i = 0; i < n; i++) {
      const tx = 10 + (i % 5) * 9, ty = i < 5 ? 30 : 48, gold = i % 3 ? '#ffcd75' : '#c8ccd4';
      pb.rect(tx, ty - 2, 5, 2, Chex('#3a3c48')); pb.rect(tx + 2, ty - 5, 1, 3, Chex(gold)); pb.rect(tx, ty - 9, 5, 4, Chex(gold)); pb.rect(tx, ty - 9, 5, 1, Chex('#fff4c8'));
      pb.set(tx - 1, ty - 8, Chex(gold)); pb.set(tx + 5, ty - 8, Chex(gold));
    }
  } else {
    pb.rect(8, 22, 44, 30, Chex('#8a6a44'));
    for (let y = 24; y < 51; y += 3) for (let x = 10; x < 51; x += 3) pb.set(x, y, Chex('#5a4430'));
    pb.rect(8, 22, 44, 1, Chex('#a8865a')); pb.rect(8, 51, 44, 1, Chex('#4a3826'));
    const tool = (x, y, h, c) => { pb.rect(x, y, 1, h, Chex(c)); pb.rect(x - 1, y, 3, 2, Chex(c)); };
    tool(14, 26, 14, '#c8ccd4'); tool(19, 26, 12, '#c8ccd4'); tool(24, 26, 16, '#b13e53'); tool(30, 27, 10, '#ffcd75'); tool(36, 26, 13, '#c8ccd4');
    pb.disc(44, 32, 3.5, Chex('#3b5dc9')); pb.disc(44, 32, 1.5, Chex('#8a6a44')); pb.rect(43, 35, 2, 9, Chex('#2a2a30'));
    for (let i = 0; i < 4; i++) { pb.rect(12, floorY - 6 - i * 6, 20, 6, Chex('#1e1e24')); pb.rect(12, floorY - 6 - i * 6, 20, 1, Chex('#3a3a44')); pb.rect(16, floorY - 4 - i * 6, 12, 1, Chex('#2a2a32')); }
  }
  // ---- Deko rechts ----
  if (sel.right === 'tv') {
    pb.rect(150, 24, 44, 27, Chex('#0d0f1a')); pb.rect(152, 26, 40, 23, Chex('#05060c')); pb.rect(170, 51, 4, 4, Chex('#2a2b33'));
    pb.rect(150, 66, 44, 16, Chex('#3a2a20')); pb.rect(150, 66, 44, 1, Chex('#6a4a2e')); pb.rect(171, 70, 2, 8, Chex('#1a1b22'));
    pb.rect(154, 60, 8, 6, Chex('#29366f')); pb.rect(184, 58, 6, 8, Chex('#38b764')); pb.rect(185, 54, 4, 4, Chex('#a7f070'));   // Konsole, Pflanze
  } else if (sel.right === 'arcade') {
    pb.rect(158, 36, 26, 46, Chex('#29366f')); pb.rect(158, 36, 26, 1, Chex('#41a6f6')); pb.rect(160, 38, 22, 6, Chex('#b13e53'));
    pb.rect(161, 46, 20, 16, Chex('#05060c')); pb.rect(158, 63, 26, 5, Chex('#1a1c2c'));
    pb.disc(165, 65, 1.5, Chex('#ff4b55')); pb.disc(171, 65, 1.5, Chex('#ffcd75')); pb.disc(177, 65, 1.5, Chex('#73eff7'));
    pb.rect(161, 70, 20, 12, Chex('#22263a')); pb.rect(168, 74, 6, 3, Chex('#ffcd75'));
  } else if (sel.right === 'sofa') {
    pb.rect(146, 66, 48, 10, Chex('#5d275d')); pb.rect(146, 60, 48, 7, Chex('#7a3a7a')); pb.rect(144, 62, 4, 16, Chex('#4a1e4a')); pb.rect(192, 62, 4, 16, Chex('#4a1e4a'));
    pb.rect(146, 60, 48, 1, Chex('#a05aa0')); pb.rect(169, 60, 1, 16, Chex('#4a1e4a')); pb.rect(148, 76, 2, 6, Chex('#1a1b22')); pb.rect(190, 76, 2, 6, Chex('#1a1b22'));
    pb.rect(186, 26, 1, 34, Chex('#3a3c48')); pb.rect(182, 22, 9, 5, Chex('#ffcd75'));                // Stehlampe
    pb.rect(150, 30, 26, 18, Chex('#0d0f1a')); pb.rect(152, 32, 22, 14, Chex('#41a6f6')); pb.rect(152, 40, 22, 6, Chex('#38b764')); pb.disc(167, 36, 2, Chex('#ffcd75'));   // Bild
  } else {
    pb.rect(150, 30, 44, 2, Chex('#5a5e68')); pb.rect(150, 52, 44, 2, Chex('#5a5e68'));
    pb.rect(151, 30, 2, 52, Chex('#3a3e48')); pb.rect(191, 30, 2, 52, Chex('#3a3e48'));
    for (let i = 0; i < 3; i++) { const cx = 160 + i * 12; pb.disc(cx, 45, 6, Chex('#1e1e24')); pb.ring(cx, 45, 4.5, 6, Chex('#2e2e36')); pb.disc(cx, 45, 2.5, Chex('#8a8e98')); }
    for (let i = 0; i < 3; i++) { const cx = 160 + i * 12; pb.rect(cx - 5, 22, 10, 8, Chex(['#b13e53', '#3b5dc9', '#38b764'][i])); pb.rect(cx - 5, 22, 10, 1, Chex('#f4f4f4')); }
    pb.rect(156, 62, 30, 20, Chex('#b13e53')); for (let y = 66; y < 82; y += 5) pb.rect(157, y, 28, 1, Chex('#6a1e2e'));
    for (let y = 64; y < 82; y += 5) pb.rect(169, y, 4, 1, Chex('#c8ccd4'));
    pb.rect(156, 62, 30, 1, Chex('#ef7d57'));
  }
  // ---- Boden ----
  for (let y = floorY; y < H; y++) for (let x = 0; x < W; x++) {
    const t = (y - floorY) / (H - floorY), gxf = (x - 100) * (1 - t * 0.5);
    let c;
    if (sel.floor === 'checker') {
      const cell = ((Math.floor(gxf / 12) + Math.floor((y - floorY) / 6)) & 1);
      c = cell ? [226, 228, 232] : [30, 32, 40]; c = shadeRGB(c, -t * 0.35);
    } else if (sel.floor === 'wood') {
      const row = Math.floor((y - floorY) / 4), seam = (y - floorY) % 4 === 0 || ((Math.floor(gxf + row * 17) % 31) + 31) % 31 === 0;
      c = mixRGB([150, 98, 56], [176, 120, 70], hash2(Math.floor((gxf + row * 17) / 31), row)); if (seam) c = shadeRGB(c, -0.3); c = shadeRGB(c, -t * 0.3);
    } else if (sel.floor === 'hex') {
      const row = Math.floor((y - floorY) / 5), off = (row & 1) * 6, u = ((Math.floor(gxf + off) % 12) + 12) % 12;
      c = mixRGB([88, 92, 104], [70, 74, 86], t); if ((y - floorY) % 5 === 0 || u === 0 || u === 6 && (y - floorY) % 5 < 2) c = shadeRGB(c, -0.25);
    } else {
      c = mixRGB([70, 76, 92], [44, 48, 60], t);
      if (y === floorY || (y - floorY) % 9 === 0 || ((Math.floor(gxf) % 25) + 25) % 25 === 0) c = shadeRGB(c, -0.18);
    }
    if (y === floorY) c = [30, 32, 42];
    pb.set(x, y, Crgb(shadeRGB(c, (hash2(x, y) - 0.5) * 0.05)));
  }
  for (let x = 40; x < 160; x++) { const st = ((x >> 2) & 1); pb.set(x, 108, Chex(st ? '#ffcd75' : '#1a1c2c')); pb.set(x, 109, Chex(st ? '#ffcd75' : '#1a1c2c')); }
}

/** animierte Deko (Fernseher, Spielautomat, Neon) über dem Hintergrund */
function drawGarageDecoLive(ctx, t, d) {
  const sel = gdeco().sel;
  if (sel.right === 'tv') {
    const k = Math.floor(t / 4) % 3;
    if (k === 0) { ctx.fillStyle = '#41a6f6'; ctx.fillRect(152, 26, 40, 14); ctx.fillStyle = '#566c86'; ctx.fillRect(152, 40, 40, 9); for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ffcd75'; ctx.fillRect(152 + ((i * 11 + t * 30) % 40), 44, 4, 1); } ctx.fillStyle = '#b13e53'; ctx.fillRect(166, 37, 12, 3); }
    else if (k === 1) { ctx.fillStyle = '#0d0f1a'; ctx.fillRect(152, 26, 40, 23); cxText(ctx, 'DRAG', 172, 29, '#ffcd75', 1, 'c'); cxText(ctx, (S.stats.best14 ? S.stats.best14.toFixed(2) : '--.--') + 'S', 172, 38, '#a7f070', 1, 'c'); }
    else { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(152, 26, 40, 23); for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#ff4b55', '#ffcd75', '#38e070'][i]; ctx.fillRect(160 + i * 9, 34, 6, 6 * (Math.floor(t * 2) % 3 === i ? 1 : 0.3)); } }
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(152, 26, 40, 2);
  }
  if (sel.right === 'arcade') {
    ctx.fillStyle = '#05060c'; ctx.fillRect(161, 46, 20, 16);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = ['#73eff7', '#ff4bd0', '#ffcd75'][i % 3]; ctx.fillRect(162 + ((i * 7 + t * 9) % 18), 47 + ((i * 5 + t * 4) % 14), 1, 1); }
    ctx.fillStyle = '#a7f070'; ctx.fillRect(170 + Math.round(Math.sin(t * 2) * 6), 59, 3, 2);
    if (Math.floor(t * 2) % 2) { ctx.fillStyle = 'rgba(255,75,85,0.5)'; ctx.fillRect(160, 38, 22, 6); }
  }
  if (sel.light === 'neon') {
    const fl = Math.sin(t * 17) > 0.96 ? 0.4 : 1;
    ctx.save(); ctx.globalAlpha = fl;
    ctx.fillStyle = '#ff4bd0'; ctx.fillRect(10, 9, 60, 2); ctx.fillStyle = '#73eff7'; ctx.fillRect(130, 9, 60, 2);
    ctx.globalAlpha = 0.12 * fl; ctx.fillStyle = '#ff4bd0'; ctx.fillRect(0, 6, 100, 76); ctx.fillStyle = '#41a6f6'; ctx.fillRect(100, 6, 100, 76);
    ctx.restore();
  } else if (sel.light === 'cold') { ctx.fillStyle = 'rgba(190,220,255,0.07)'; ctx.fillRect(0, 0, 200, 112); }
  void d;
}
