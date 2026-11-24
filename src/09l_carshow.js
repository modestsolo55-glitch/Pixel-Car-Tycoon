/* =============================================================================
   Teil 9l: Autoshow – Auto ausstellen, abstimmen, Jury
   Jede Show-Runde dauert 7 Spieltage. Es stellen KI-Tuner aus und alle Konten,
   die auf diesem Computer/Browser spielen (gemeinsamer Speicher). Bewertet wird
   von drei Jury-Mitgliedern (Stil, Leistung, Exotik) und vom Publikum (Stimmen).
   HINWEIS: Echtes Online (Leute im Internet) braucht einen Server – die
   Ausstellung zwischen Konten im selben Browser funktioniert ohne.
   ============================================================================= */
const CSHOW_KEY = 'autotycoon_carshow';
const SHOW_DAYS = 7;
const JUDGES = [
  { id: 'style', name: 'Mila Lack', role: 'Stil & Design', face: { skin: '#f0c0a0', hair: '#c040ff', style: 'long', shirt: '#ff4bd0', glasses: 'round' } },
  { id: 'perf',  name: 'Turbo-Tom', role: 'Leistung',     face: { skin: '#d8a880', hair: '#3a2a1a', style: 'cap', cap: '#38b764', shirt: '#333c57', glasses: 'sun' } },
  { id: 'exo',   name: 'Dr. Exotik', role: 'Seltenheit',  face: { skin: '#c89070', hair: '#f4f4f4', style: 'slick', shirt: '#d4a640', glasses: 'visor', beard: true } }
];
JUDGES.forEach(j => { OPP_INFO['judge_' + j.id] = Object.assign({ hi: [''], win: [''], lose: [''] }, j.face); });
const SHOW_NICKS = ['NeonNico', 'DriftQueen', 'BoostBen', 'LowLina', 'TurboTara', 'RimRaj', 'StanceSam', 'VtecVera', 'GaragenGabi', 'NitroNils', 'ChromeChris', 'PixelPia'];
const SHOW_NAMES = ['Midnight Ghost', 'Sakura Spec', 'Red Viper', 'Blue Thunder', 'Kitsune', 'Lowrider X', 'Street Samurai', 'Sunset Cruiser', 'Neon Shark', 'Gold Rush', 'Ice Queen', 'Black Mamba'];

// ---------- gemeinsamer Speicher (alle Konten in diesem Browser) ----------
function showStore() { try { const s = JSON.parse(localStorage.getItem(CSHOW_KEY) || 'null'); if (s && s.entries) return s; } catch (e) { /* neu */ } return { entries: {} }; }
function showStoreSave(s) { try { localStorage.setItem(CSHOW_KEY, JSON.stringify(s)); } catch (e) { /* voll */ } }

// ---------- Wertung ----------
function showScores(car, d, extra = 0) {
  const excl = { small: 5, family: 10, suv: 25, sport: 45, super: 75, hyper: 95 }[car.cls] || 20;
  const paintB = { chrome: 18, pearl: 15, metallic: 8, matte: 6 }[d.paint] || 0;
  return {
    style: clamp(car.style, 0, 100),
    perf: clamp((17 - car.t14) / 9.5 * 100, 0, 100),
    exo: clamp(excl * 0.7 + paintB + (d.kit && d.kit !== 'none' ? 8 : 0) + (d.glow && d.glow !== 'none' ? 6 : 0) + extra, 0, 100)
  };
}
/** Jury-Punkte 1–10 (mit etwas Laune, aber fest pro Runde) */
function judgePoints(sc, seed) {
  const r = seededRand(seed);
  return JUDGES.map(j => clamp(Math.round((sc[j.id] / 10 + (r() - 0.5) * 1.6) * 10) / 10, 1, 10));
}

// ---------- Runde ----------
function npcShowEntry(r, i) {
  const L = S.level, maxC = clamp(Math.floor(L / 5), 1, 5);
  const cls = CLASS_ORDER[clamp(Math.floor(r() * (maxC + 1)), 0, 5)];
  const bodies = Object.keys(BODIES).filter(b => BODIES[b].cls === cls);
  const pickR = a => a[Math.floor(r() * a.length)];
  const d = oppDesign(cls, pickR(bodies), pickR(PAINT_COLORS), pickR(PAINT_COLORS), {
    stripe: pickR(Object.keys(STRIPES)), paint: pickR(Object.keys(PAINTS)), rim: pickR(Object.keys(RIMS)), rimColor: pickR(RIM_COLORS),
    tire: 2 + Math.floor(r() * 5), spoiler: pickR(Object.keys(SPOILERS)), lip: pickR(Object.keys(LIPS)), skirts: pickR(Object.keys(SKIRTS)),
    diffuser: pickR(Object.keys(DIFFUSERS)), ride: -Math.floor(r() * 5), kit: pickR(Object.keys(KITS)), glow: r() > 0.5 ? pickR(GLOWS) : 'none',
    sticker: pickR(Object.keys(STICKERS)), number: r() > 0.6 ? 1 + Math.floor(r() * 98) : 0, tint: Math.floor(r() * 5)
  });
  const types = ['i4', 'v6', 'v8', 'v10', 'v12'].slice(0, 1 + Math.floor(r() * (1 + maxC)));
  const ty = pickR(types), T = ENGINE_TYPES[ty];
  const e = oppEngine(ty, Math.round((T.dmin + r() * (T.dmax - T.dmin)) * 10) / 10, pickR(['none', 'turbo', 'twin', 'super']), 'alu', 6, r() > 0.6 ? 'small' : 'none');
  return { id: 'npc' + i, npc: true, user: pickR(SHOW_NICKS), name: pickR(SHOW_NAMES), design: d, engine: e, likes: Math.floor(r() * 8) };
}
function showEnsure() {
  if (!S) return null;
  if (!S.show || !S.show.npc) S.show = { round: 1, ends: S.day + SHOW_DAYS, entry: null, npc: [], voted: {}, history: [] };
  const X = S.show;
  if (!X.npc.length) { const r = seededRand('show' + X.round + S.company); X.npc = Array.from({ length: 6 }, (_, i) => npcShowEntry(r, i)); }
  return X;
}
/** alle Ausstellungsstücke der Runde (eigene, andere Konten, KI) */
function showEntries() {
  const X = showEnsure(), st = showStore(), list = [];
  for (const [u, e] of Object.entries(st.entries)) {
    if (u === AUTH_USER) continue;
    list.push({ id: 'acc_' + u, acc: u, user: e.user, name: e.name, design: e.design, engine: e.engine, likes: Object.keys(e.likes || {}).length, company: e.company });
  }
  if (X.entry) { const me = st.entries[AUTH_USER]; list.push(Object.assign({ id: 'me', me: true, user: (currentAccount() || {}).name || 'Du', likes: me ? Object.keys(me.likes || {}).length : 0 }, X.entry)); }
  return list.concat(X.npc.map(n => Object.assign({}, n, { likes: n.likes + (X.voted[n.id] ? 1 : 0) })));
}
function rankShow() {
  const X = showEnsure();
  return showEntries().map(en => {
    const car = computeCar(en.design, en.engine), sc = showScores(car, en.design, en.premium ? 10 : 0);
    const jp = judgePoints(sc, 'j' + X.round + en.id + en.name);
    const jury = jp.reduce((a, b) => a + b, 0) / 3 * 10;
    const crowd = clamp(sc.style * 0.5 + sc.perf * 0.25 + 15 + en.likes * 7, 0, 100);
    return Object.assign({}, en, { car, jp, jury, crowd, total: Math.round((jury * 0.7 + crowd * 0.3) * 10) / 10 });
  }).sort((a, b) => b.total - a.total);
}
/** am Ende jeder Runde aus dayTick */
function showDay() {
  const X = showEnsure(); if (!X || S.day < X.ends) return;
  const ranks = rankShow(), place = ranks.findIndex(e => e.me) + 1;
  let txt = '';
  if (place) {
    const prize = place <= 3 ? [[30, 8000, 4], [20, 4000, 2], [10, 2000, 1]][place - 1] : [3, 300, 0];
    const money = Math.round(prize[1] * Math.pow(S.level, 1.2));
    S.gems = (S.gems || 0) + prize[0]; S.money += money; if (prize[2]) addRep(prize[2]);
    addXP(place <= 3 ? 300 * S.level : 50 * S.level);
    txt = `Platz ${place} von ${ranks.length} mit „${esc(X.entry.name)}“ – +${prize[0]} Diamanten, +${fmtMoney(money)}`;
    X.history.unshift({ round: X.round, place, of: ranks.length, name: X.entry.name, total: ranks[place - 1].total });
    X.history = X.history.slice(0, 10);
    X.best = Math.min(X.best || 99, place);
    toast(`${ico('trophy', 'big')} <div><b>Autoshow beendet!</b><br>${txt}</div>`, place <= 3 ? 'good' : '', 9000);
    if (place === 1) sfx('goal');
  }
  X.lastResult = { round: X.round, top: ranks.slice(0, 3).map(e => ({ name: e.name, user: e.user, total: e.total, me: !!e.me })), place, of: ranks.length };
  X.round++; X.ends = S.day + SHOW_DAYS; X.npc = []; X.voted = {};
  showEnsure();
}

// ---------- Aktionen ----------
let SHOWSEL = null;
INPUTS.showcar = el => { SHOWSEL = el.value; rerender(); };
ACTIONS.showEnter = () => {
  const en = raceEntry(SHOWSEL || RSEL.modelId); if (!en) return;
  const X = showEnsure();
  X.entry = { name: en.name, design: clone(en.design), engine: clone(en.engine), premium: en.brand === 'PREMIUM', carId: en.id, company: S.company };
  const st = showStore(), old = st.entries[AUTH_USER];
  st.entries[AUTH_USER] = { user: (currentAccount() || {}).name || 'Spieler', company: S.company, name: en.name, design: X.entry.design, engine: X.entry.engine, likes: old && old.name === en.name ? old.likes : {}, updated: Date.now() };
  showStoreSave(st);
  sfx('buy'); toast(`${ico('star')} „${esc(en.name)}“ steht jetzt in der Autoshow!`, 'good'); rerender();
};
ACTIONS.showWithdraw = () => { const X = showEnsure(); X.entry = null; const st = showStore(); delete st.entries[AUTH_USER]; showStoreSave(st); rerender(); };
ACTIONS.showVote = d => {
  const X = showEnsure(), id = d.v;
  if (id.startsWith('acc_')) {
    const u = id.slice(4), st = showStore(), e = st.entries[u]; if (!e || !AUTH_USER) return;
    e.likes = e.likes || {};
    if (e.likes[AUTH_USER]) delete e.likes[AUTH_USER]; else e.likes[AUTH_USER] = 1;
    showStoreSave(st);
  } else X.voted[id] = !X.voted[id];
  sfx('click'); rerender();
};
const votedFor = en => en.acc ? !!((showStore().entries[en.acc] || {}).likes || {})[AUTH_USER] : !!showEnsure().voted[en.id];

// ---------- Online-Autoshow (Webseite mit gemeinsamer Abstimmung) ----------
const ONLINE_SHOW_URL = 'https://claude.ai/artifact/Xt6MDWdwWmwib2H1gAEpWA';
/** Code mit Bild und Werten des Autos – wird auf der Online-Seite eingefügt */
function onlineShowCode(en) {
  const car = en.car, s = renderCar(en.design, { brand: en.brand === 'PREMIUM' ? '' : S.company });
  const cv = document.createElement('canvas'); cv.width = s.cv.width; cv.height = s.cv.height;
  cv.getContext('2d').drawImage(s.cv, 0, 0);
  const data = { v: 1, name: en.name, company: S.company, nick: (currentAccount() || {}).name || 'Spieler', cls: car.cls, ps: car.ps, t14: Math.round(car.t14 * 100) / 100, style: Math.round(car.style), img: cv.toDataURL('image/png') };
  return 'ATSHOW1:' + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}
ACTIONS.showOnlineCopy = () => {
  const en = raceEntry(SHOWSEL || RSEL.modelId); if (!en) return;
  const code = onlineShowCode(en), done = () => toast(`${ico('check')} Code für „${esc(en.name)}“ kopiert! Öffne jetzt die Online-Autoshow und füge ihn dort ein.`, 'good', 6000);
  const fallback = () => {
    openModal(`<h2 class="title">${ico('star', 'big')} Code für die Online-Show</h2><div class="hint">Markiere den Code, kopiere ihn (Strg+C) und füge ihn auf der Online-Seite ein.</div>
      <textarea id="oscode" readonly style="width:100%;height:120px;font:11px monospace;background:#0d0f1a;color:#e8ecf4;border:0;margin:6px 0">${code}</textarea>
      <div class="flex"><a class="btn yellow" href="${ONLINE_SHOW_URL}" target="_blank" rel="noopener">Online-Autoshow öffnen</a><button class="btn gray" data-act="close">Schliessen</button></div>`, true);
    setTimeout(() => { const t = $('#oscode'); if (t) { t.focus(); t.select(); } }, 30);
  };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, fallback); else fallback(); } catch (e) { fallback(); }
};

// ---------- Laufsteg-Animation ----------
let _showT = 0;
function drawShowStage(t) {
  const cv = $('#showcv'); if (!cv) return;
  const ctx = hdCtx(cv), W = 320, H = 120, X = showEnsure();
  const en = X.entry || (rankShow()[0]);
  // Halle
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0c18'); g.addColorStop(1, '#1a1c2c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#14162a' : '#181a30'; ctx.fillRect(i * 36, 0, 36, 70); }
  // Publikum (Silhouetten) mit Kamerablitzen
  for (let x = 0; x < W; x += 5) { const h = 6 + ((x * 7) % 5); ctx.fillStyle = '#0d0f1a'; ctx.fillRect(x, 70 - h, 4, h); ctx.fillRect(x + 1, 70 - h - 3, 2, 3); }
  for (let i = 0; i < 4; i++) { const k = Math.floor(t * 3 + i * 7.3); if (hash2(k, i) > 0.72) { const fx = Math.floor(hash2(k, i + 9) * W); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(fx, 58, 2, 2); ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(fx - 4, 54, 10, 10); } }
  // Bühne (Drehteller)
  ctx.fillStyle = '#2a2e48'; ctx.beginPath(); ctx.ellipse(W / 2, 98, 120, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a4060'; ctx.beginPath(); ctx.ellipse(W / 2, 96, 116, 14, 0, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * 0.6; ctx.fillStyle = (i % 2) ? '#ffcd75' : '#566c86'; ctx.fillRect(W / 2 + Math.cos(a) * 112 - 1, 96 + Math.sin(a) * 13 - 0.5, 2, 1); }
  // Scheinwerfer, die über die Bühne wandern
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const sx = 40 + i * 120, tx = W / 2 + Math.sin(t * 0.9 + i * 2.1) * 70;
    const grd = ctx.createLinearGradient(sx, 0, tx, 98); grd.addColorStop(0, ['rgba(255,80,200,0.35)', 'rgba(120,200,255,0.35)', 'rgba(255,220,120,0.35)'][i]); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.beginPath(); ctx.moveTo(sx - 3, 0); ctx.lineTo(sx + 3, 0); ctx.lineTo(tx + 34, 100); ctx.lineTo(tx - 34, 100); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // Auto mit leichtem Schweben und Glanz
  if (en) {
    const s = renderCar(en.design, { brand: X.entry ? S.company : '' });
    const bob = Math.sin(t * 2) * 0.6, x0 = Math.round(W / 2 - s.W / 2), y0 = Math.round(94 - s.gy + bob);
    ctx.save(); ctx.globalAlpha = 0.25; ctx.translate(0, (94 + bob) * 2); ctx.scale(1, -1); ctx.drawImage(s.cv, x0, y0, s.W, s.H); ctx.restore();   // Spiegelung
    ctx.drawImage(s.cv, x0, y0, s.W, s.H);
    const sweep = ((t * 0.5) % 1.6) - 0.3;                                  // Glanzstreifen
    if (sweep > 0 && sweep < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); const gx = x0 + sweep * s.W; ctx.moveTo(gx, y0); ctx.lineTo(gx + 8, y0); ctx.lineTo(gx - 2, y0 + s.H); ctx.lineTo(gx - 10, y0 + s.H); ctx.fill(); ctx.restore(); }
    cxText(ctx, en.name.toUpperCase().slice(0, 26), W / 2, 6, '#ffcd75', 2, 'c', '#000');
    cxText(ctx, X.entry ? 'DEIN AUSSTELLUNGSSTÜCK' : 'FAVORIT DER RUNDE', W / 2, 20, '#94b0c2', 1, 'c');
  }
}

// ---------- Tab ----------
TABS.show = {
  title: 'Autoshow', icon: 'star',
  render(el) {
    const X = showEnsure(), ranks = rankShow(), meRank = ranks.findIndex(e => e.me) + 1;
    if (!SHOWSEL || !raceEntry(SHOWSEL)) SHOWSEL = X.entry && raceEntry(X.entry.carId) ? X.entry.carId : S.models[0].id;
    const sel = raceEntry(SHOWSEL);
    const card = (en, i) => {
      const v = votedFor(en);
      return `<div class="card showcard ${en.me ? 'mine' : ''}">
        <div class="flex"><span class="place">#${i + 1}</span><b>${esc(en.name)}</b><span class="sp"></span>${en.me ? '<span class="tag y">DU</span>' : en.acc ? '<span class="tag g">Konto</span>' : ''}</div>
        <img src="${carThumbURL(en.design, en.me ? S.company : '')}" class="showimg">
        <div class="hint" style="margin:0">von <b>${esc(en.user)}</b> · ${en.car.ps} PS · 1/4 ${en.car.t14.toFixed(2)} s · Stil ${Math.round(en.car.style)}</div>
        <div class="flex" style="margin-top:4px">
          ${JUDGES.map((j, k) => `<span class="jscore" title="${j.name} (${j.role})">${faceImg('judge_' + j.id, 18)}${en.jp[k].toFixed(1)}</span>`).join('')}
          <span class="sp"></span><span class="likes">♥ ${en.likes}</span>
          ${en.me ? '' : `<button class="btn sm ${v ? 'yellow' : ''}" data-act="showVote" data-v="${en.id}">${v ? '♥ Gewählt' : '♡ Abstimmen'}</button>`}
        </div>
        <div class="pbar" style="margin-top:4px"><i style="width:${en.total}%"></i><em>${en.total.toFixed(1)} Punkte</em></div>
      </div>`;
    };
    el.innerHTML = `<h2 class="title">${ico('star', 'big')} Autoshow – Runde ${X.round}</h2>
      <div class="panel dark" style="padding:6px"><canvas id="showcv" width="320" height="120" class="cv"></canvas></div>
      <div class="row">
        <div class="col" style="flex:1 1 300px">
          <div class="panel"><h3>${ico('car')}Dein Auto ausstellen</h3>
            <select data-inp="showcar" style="width:100%">${raceOptions(SHOWSEL)}</select>
            ${sel ? `<div class="hint">Stil ${Math.round(sel.car.style)} · ${sel.car.ps} PS · 1/4 Meile ${sel.car.t14.toFixed(2)} s</div>` : ''}
            <div class="flex"><button class="btn green" data-act="showEnter">${X.entry ? 'Ausstellungsstück wechseln' : 'Ausstellen!'}</button>${X.entry ? '<button class="btn gray" data-act="showWithdraw">Zurückziehen</button>' : ''}</div>
            ${X.entry ? `<div class="good" style="margin-top:6px">Ausgestellt: <b>${esc(X.entry.name)}</b> – aktuell Platz ${meRank} von ${ranks.length}</div>` : '<div class="hint">Stelle ein Auto aus – am Ende der Runde gibt es Preise für die Plätze 1–3.</div>'}
            <div class="hint">Runde endet am <b>${fmtDate(X.ends)}</b> (noch ${Math.max(0, X.ends - S.day)} Tage).</div>
          </div>
          <div class="panel"><h3>${ico('trophy')}Jury</h3>
            ${JUDGES.map(j => `<div class="flex" style="margin:4px 0">${faceImg('judge_' + j.id, 32)}<div><b>${j.name}</b><div class="hint" style="margin:0">achtet auf ${j.role}</div></div></div>`).join('')}
            <div class="hint">Wertung: 70 % Jury (je 1–10 Punkte) + 30 % Publikum. Jede Stimme (♥) zählt!</div>
            <div class="hint">Preise: 1. Platz 30 Diamanten + Geld + Ruf · 2. Platz 20 · 3. Platz 10.</div>
          </div>
          ${X.lastResult ? `<div class="panel"><h3>${ico('star')}Letzte Runde (${X.lastResult.round})</h3>
            ${X.lastResult.top.map((e, i) => `<div class="flex">${['🥇', '🥈', '🥉'][i]} <b>${esc(e.name)}</b> <span class="muted">von ${esc(e.user)}</span><span class="sp"></span>${e.total.toFixed(1)}</div>`).join('')}
            ${X.lastResult.place ? `<div class="hint">Dein Platz: ${X.lastResult.place} von ${X.lastResult.of}</div>` : ''}</div>` : ''}
          <div class="panel"><h3>${ico('star')}Online-Autoshow</h3>
            <div class="hint" style="color:var(--text)">Zeig dein Auto Freunden im Internet! Kopiere den Code des oben gewählten Autos, öffne die Online-Autoshow und füge ihn dort ein. Dort stimmen alle ab, die den Link haben.</div>
            <div class="flex"><button class="btn green" data-act="showOnlineCopy">Code für Online-Show kopieren</button>
              <a class="btn yellow" href="${ONLINE_SHOW_URL}" target="_blank" rel="noopener">Online-Autoshow öffnen ›</a></div></div>
          <div class="panel"><h3>${ico('user')}Auf diesem Computer</h3><div class="hint" style="color:var(--text)">Alle Konten, die auf diesem Computer spielen, sehen die Ausstellungsstücke der anderen hier im Spiel und können dafür abstimmen.</div></div>
        </div>
        <div class="col" style="flex:2 1 460px">
          <div class="panel"><h3>${ico('star')}Rangliste dieser Runde</h3><div class="showgrid">${ranks.map(card).join('')}</div></div>
        </div>
      </div>`;
    _showT = 0; drawShowStage(0);
  },
  tick(dt) { _showT += dt; if (every('show', 30)) drawShowStage(_showT); }
};
function showPanelHTML() {
  const X = showEnsure();
  return `<div class="panel"><h3>${ico('star')}Autoshow</h3>
    ${X.entry ? `<div>Ausgestellt: <b>${esc(X.entry.name)}</b></div>` : '<div class="hint" style="color:var(--text)">Stelle dein schönstes Auto aus und gewinne Diamanten!</div>'}
    ${X.best ? `<div class="hint">Beste Platzierung: ${X.best}.</div>` : ''}
    <button class="btn" data-act="tab" data-v="show">Zur Autoshow ›</button></div>`;
}
