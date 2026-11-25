/* =============================================================================
   Teil 9m: Startbildschirm, Einstellungen, freiwilliges Konto, Tutorial-Tour
   - Startbildschirm mit animierter Strasse, PLAY, EINSTELLUNGEN, Konto oben rechts
   - Ohne Konto spielt man als „Gast“ (eigener Spielstand in diesem Browser)
   - Nach PLAY erklärt eine Tour Schritt für Schritt, was wo ist
   ============================================================================= */

// ---------- Einstellungen (gelten für alle Konten in diesem Browser) ----------
const SET_KEY = 'at_settings';
const SET = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}; } catch (e) { s = {}; } return Object.assign({ shake: true, ui: 100, startSpeed: 1, music: true, musicVol: 0.5, gfx: 'high' }, s); })();
function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { /* egal */ } }
function applySettings() { document.body.style.zoom = SET.ui === 100 ? '' : String(SET.ui / 100); }
const raceMuted = () => { try { return localStorage.getItem('at_mute') === '1'; } catch (e) { return false; } };

function settingsHTML(inGame) {
  const row = (label, hint, ctrl) => `<div class="card"><div class="flex"><div style="flex:1"><b>${label}</b><div class="hint" style="margin:0">${hint}</div></div>${ctrl}</div></div>`;
  const tog = (act, on) => `<button class="btn sm ${on ? 'green' : 'gray'}" data-act="${act}">${on ? 'AN' : 'AUS'}</button>`;
  const opt = (act, cur, list) => `<div class="opts" style="margin:0">${list.map(([v, l]) => `<button class="btn sm ${String(cur) === String(v) ? 'sel' : ''}" data-act="${act}" data-v="${v}">${l}</button>`).join('')}</div>`;
  return `<h2 class="title">${ico('gear', 'big')} Einstellungen</h2>
    ${row('Soundeffekte', 'Klicks, Kasse, Level-Aufstieg', tog('setSfx', SFX.on))}
    ${row('Musik', 'Eigene Pixel-Musik: ruhig im Menü, treibend beim Cruisen, spannend im Rennen', tog('setMusic', SET.music !== false))}
    ${row('Musik-Lautstärke', '', opt('setMusicVol', SET.musicVol, [[0.25, 'Leise'], [0.5, 'Mittel'], [0.75, 'Laut'], [1, 'Voll']]))}
    ${row('Grafik', 'Niedrig: weniger Rauch, keine Spiegelungen und Licht-Effekte – für ältere Handys', opt('setGfx', SET.gfx, [['high', 'Hoch'], ['low', 'Niedrig']]))}
    ${row('Motorsound im Rennen', 'Motor, Turbo, NOS und Hupe beim Fahren', tog('setRaceSnd', !raceMuted()))}
    ${row('Kamera wackelt', 'Bildschirm-Wackeln bei Start, Schalten und NOS', tog('setShake', SET.shake))}
    ${row('Kino-Modus bei Pause', 'Nach 60 s ohne Eingabe zeigt die Kamera dein Auto', tog('setCinema', cinemaOn()))}
    ${row('Grösse der Oberfläche', 'Alles grösser oder kleiner darstellen', opt('setUi', SET.ui, [[85, 'Klein'], [100, 'Normal'], [115, 'Gross'], [130, 'Sehr gross']]))}
    ${row('Spieltempo beim Start', 'Wie schnell die Tage nach dem Laden laufen', opt('setSpeed', SET.startSpeed, [[0, 'Pause'], [1, '1x'], [2, '2x'], [5, '5x']]))}
    ${row('Tutorial', 'Die Erklär-Tour beim nächsten Spielstart nochmals zeigen', `<button class="btn sm yellow" data-act="setTour">${inGame ? 'Jetzt zeigen' : 'Wieder zeigen'}</button>`)}
    <div class="flex" style="margin-top:8px"><span class="sp"></span><button class="btn gray" data-act="${inGame ? 'close' : 'titleBack'}">Fertig</button></div>`;
}
const _setRefresh = () => { if ($('#title') && !$('#title').classList.contains('hidden') && $('#ttl-panel')) $('#ttl-panel').innerHTML = settingsHTML(false); else if (!$('#modal').classList.contains('hidden')) openModal(settingsHTML(true), true); };
ACTIONS.setSfx = () => { SFX.on = !SFX.on; try { localStorage.setItem('at_sfx', SFX.on ? '1' : '0'); } catch (e) { /* egal */ } if (SFX.on) sfx('good'); _setRefresh(); };
ACTIONS.setRaceSnd = () => { try { localStorage.setItem('at_mute', raceMuted() ? '0' : '1'); } catch (e) { /* egal */ } _setRefresh(); };
ACTIONS.setMusic = () => { SET.music = SET.music === false; saveSettings(); _setRefresh(); };
ACTIONS.setMusicVol = d => { SET.musicVol = +d.v; saveSettings(); _setRefresh(); };
ACTIONS.setGfx = d => { SET.gfx = d.v === 'low' ? 'low' : 'high'; saveSettings(); _setRefresh(); };
ACTIONS.setShake = () => { SET.shake = !SET.shake; saveSettings(); _setRefresh(); };
ACTIONS.setCinema = () => { try { localStorage.setItem('at_cinema', cinemaOn() ? '0' : '1'); } catch (e) { /* egal */ } _setRefresh(); };
ACTIONS.setUi = d => { SET.ui = +d.v; saveSettings(); applySettings(); _setRefresh(); };
ACTIONS.setSpeed = d => { SET.startSpeed = +d.v; saveSettings(); _setRefresh(); };
ACTIONS.setTour = () => {
  if (S) { S.tutDone = false; closeModal(); tourStart(true); return; }
  try { localStorage.setItem('at_tour_again', '1'); } catch (e) { /* egal */ }
  toast('Die Tour startet beim nächsten Spielstart.', 'good');
};
ACTIONS.settings = () => openModal(settingsHTML(true), true);

// ---------- Startbildschirm ----------
let _ttlRaf = 0, _ttlMode = 'main', _ttlAuth = 'login', _ttlCars = null;
function titleEl() {
  let el = $('#title');
  if (!el) { el = document.createElement('div'); el.id = 'title'; document.body.appendChild(el); }
  return el;
}
function showTitle() {
  applySettings();
  const el = titleEl(); el.classList.remove('hidden');
  el.innerHTML = `<canvas id="ttl-cv" width="320" height="180"></canvas>
    <div class="ttl-logo">AUTOTYCOON<small>BAUEN - TUNEN - RENNEN</small></div>
    <div class="ttl-top"><div id="ttl-acc"></div></div>
    <div class="ttl-mid" id="ttl-mid"></div>
    <div class="ttl-foot">AutoTycoon · Pixel-Autofirma & Drag Racing · Spielstand nur in diesem Browser</div>`;
  _ttlMode = 'main'; titleRender();
  cancelAnimationFrame(_ttlRaf);
  const t0 = performance.now();
  const loop = now => { const cv = $('#ttl-cv'); if (!cv || el.classList.contains('hidden')) return; drawTitleScene(hdCtx(cv), (now - t0) / 1000); _ttlRaf = requestAnimationFrame(loop); };
  _ttlRaf = requestAnimationFrame(loop);
}
function hideTitle() { const el = $('#title'); if (el) { el.classList.add('hidden'); el.innerHTML = ''; } cancelAnimationFrame(_ttlRaf); }
function titleSaveInfo(k) {
  try { const st = JSON.parse(localStorage.getItem(saveKeyFor(k)) || 'null'); return st && st.company ? `${esc(st.company)} · Level ${st.level} · ${fmtMoney(st.money)}` : ''; } catch (e) { return ''; }
}
function titleRender() {
  const u = AUTH_USER && loadAccounts().users[AUTH_USER];
  const real = u && !u.guest;
  $('#ttl-acc').innerHTML = real
    ? `<div class="ttl-chip">${ico(u.role === 'player' ? 'user' : 'crown')}<span>${esc(u.name)}</span><button class="btn sm gray" data-act="titleLogout">Abmelden</button></div>`
    : `<button class="btn sm ttl-login" data-act="titleAuth" data-v="login">${ico('user')} Anmelden</button><button class="btn sm gray" data-act="titleAuth" data-v="register">Konto erstellen</button>`;
  const mid = $('#ttl-mid');
  if (_ttlMode === 'settings') { mid.innerHTML = `<div class="ttl-panel" id="ttl-panel">${settingsHTML(false)}</div>`; return; }
  if (_ttlMode === 'auth') {
    const reg = _ttlAuth === 'register';
    mid.innerHTML = `<div class="ttl-panel lbox" id="ttl-panel"><h3>${reg ? 'Neues Konto erstellen' : 'Anmelden'}</h3>
      <div id="ttl-msg"></div>
      <div class="lbl">Benutzername</div><input type="text" id="lg-user" maxlength="16" autocomplete="username" spellcheck="false">
      <div class="lbl">Passwort</div><input type="password" id="lg-pw" maxlength="40" autocomplete="${reg ? 'new-password' : 'current-password'}">
      ${reg ? `<div class="lbl">Passwort wiederholen</div><input type="password" id="lg-pw2" maxlength="40" autocomplete="new-password">` : ''}
      <label class="lrem"><input type="checkbox" id="lg-rem" checked> Angemeldet bleiben</label>
      <button class="btn green big" style="width:calc(100% - 8px)" data-act="titleAuthGo">${reg ? 'Konto erstellen' : 'Einloggen'}</button>
      <button class="btn gray" style="width:calc(100% - 8px)" data-act="titleAuth" data-v="${reg ? 'login' : 'register'}">${reg ? 'Ich habe schon ein Konto' : 'Neues Konto erstellen'}</button>
      <button class="btn dark" style="width:calc(100% - 8px)" data-act="titleBack">Zurück</button>
      <div class="hint" style="margin-top:6px">Ein Konto ist freiwillig. Damit hat jeder Spieler in diesem Browser seinen eigenen Spielstand.${reg && titleSaveInfo('gast') ? ' Dein Gast-Spielstand wird ins neue Konto übernommen.' : ''}</div></div>`;
    setTimeout(() => { const i = $('#lg-user'); if (i) i.focus(); }, 30);
    return;
  }
  const k = AUTH_USER || 'gast', info = titleSaveInfo(k);
  mid.innerHTML = `<button class="ttl-play" data-act="titlePlay">▶ PLAY</button>
    <div class="ttl-sub">${info ? 'Weiterspielen: ' + info : real ? 'Neues Spiel starten' : 'Ohne Konto als <b>Gast</b> spielen – oder oben rechts anmelden'}</div>
    <div class="flex" style="justify-content:center;margin-top:10px"><button class="btn big" data-act="titleSettings">${ico('gear')} Einstellungen</button></div>`;
}
ACTIONS.titleSettings = () => { _ttlMode = 'settings'; titleRender(); };
ACTIONS.titleBack = () => { _ttlMode = 'main'; titleRender(); };
ACTIONS.titleAuth = d => { _ttlMode = 'auth'; _ttlAuth = d.v === 'register' ? 'register' : 'login'; titleRender(); };
ACTIONS.titleLogout = () => { try { localStorage.removeItem(SES_KEY); sessionStorage.removeItem(SES_KEY); } catch (e) { /* egal */ } AUTH_USER = null; titleRender(); };
ACTIONS.titleAuthGo = () => {
  const reg = _ttlAuth === 'register', n = $('#lg-user').value, pw = $('#lg-pw').value, rem = $('#lg-rem').checked;
  const msg = t => { sfx('bad'); const m = $('#ttl-msg'); if (m) m.innerHTML = `<div class="lmsg"><b class="bad">${t}</b></div>`; };
  if (reg) {
    const err = pw !== $('#lg-pw2').value ? 'Die Passwörter stimmen nicht überein.' : createAccount(n, pw);
    if (err) { msg(err); return; }
    const k = userKey(n);
    try { const g = localStorage.getItem(saveKeyFor('gast')); if (g && !localStorage.getItem(saveKeyFor(k))) localStorage.setItem(saveKeyFor(k), g); } catch (e) { /* egal */ }
    authSet(k, rem); toast(`${ico('user')} Konto <b>${esc(n)}</b> erstellt!`, 'good');
  } else {
    if (!checkLogin(n, pw)) { msg('Benutzername oder Passwort falsch.'); return; }
    authSet(userKey(n), rem); toast(`${ico('user')} Angemeldet als <b>${esc(loadAccounts().users[userKey(n)].name)}</b>`, 'good');
  }
  sfx('good'); _ttlMode = 'main'; titleRender();
};
document.addEventListener('keydown', e => {
  const el = $('#title'); if (!el || el.classList.contains('hidden')) return;
  if (e.key === 'Enter') { e.preventDefault(); if (_ttlMode === 'auth') ACTIONS.titleAuthGo(); else if (_ttlMode === 'main') ACTIONS.titlePlay(); }
  else if (e.key === 'Escape' && _ttlMode !== 'main') ACTIONS.titleBack();
});
/** Konto setzen (ohne das Spiel zu starten) */
function authSet(k, remember) {
  AUTH_USER = k;
  try { if (remember) localStorage.setItem(SES_KEY, k); else localStorage.removeItem(SES_KEY); sessionStorage.setItem(SES_KEY, k); } catch (e) { /* egal */ }
  const a = loadAccounts(); if (a.users[k]) { a.users[k].last = Date.now(); saveAccounts(a); }
}
/** Gast-Konto (ohne Passwort-Login) bei Bedarf anlegen */
function ensureGuest() {
  const a = loadAccounts();
  if (!a.users.gast) { const s = newSalt(); a.users.gast = { name: 'Gast', salt: s, hash: pwHash(newSalt() + Math.random(), s), role: 'player', guest: true, created: Date.now(), last: 0 }; saveAccounts(a); }
  return 'gast';
}
ACTIONS.titlePlay = () => {
  sfx('good');
  if (!AUTH_USER || !loadAccounts().users[AUTH_USER]) { AUTH_USER = ensureGuest(); try { sessionStorage.setItem(SES_KEY, AUTH_USER); } catch (e) { /* egal */ } }
  hideTitle();
  startGameForUser(false);
  if (S && S.speed && SET.startSpeed !== 1) S.speed = SET.startSpeed;
};

/** animierte Startszene: Abendhimmel, Skyline, Strasse mit vorbeifahrenden Autos */
function drawTitleScene(ctx, t) {
  const bg = _raceBGCache['japan|night'] || (_raceBGCache['japan|night'] = buildRaceBG('japan', 'night'));
  ctx.drawImage(bg.sky, 0, 0);
  const TH = THEMES[bg.T.scene]; if (TH && TH.landmark) { ctx.filter = 'brightness(0.45) saturate(0.8)'; TH.landmark(ctx, t); ctx.filter = 'none'; }
  const sl = -((t * 6) % RW_);
  ctx.drawImage(bg.skyline, Math.round(sl), 10); ctx.drawImage(bg.skyline, Math.round(sl) + RW_, 10);
  const so = -((t * 22) % 192); for (let x = Math.round(so) - 192; x < RW_; x += 192) ctx.drawImage(bg.stands[1], x, 34);
  ctx.fillStyle = 'rgba(4,6,20,0.45)'; ctx.fillRect(0, 30, RW_, 50);
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 66, RW_, 9); ctx.fillStyle = '#333c57'; ctx.fillRect(0, 66, RW_, 1);
  const ao = -((t * 90) % 64); for (let x = Math.round(ao) - 64; x < RW_; x += 64) { ctx.drawImage(bg.asph, x, 75, 64, 20); ctx.drawImage(bg.asph, x, 98, 64, 28); }
  ctx.fillStyle = 'rgba(4,6,20,0.35)'; ctx.fillRect(0, 75, RW_, 51);
  ctx.fillStyle = '#c8ccd4'; ctx.fillRect(0, 95, RW_, 2);
  for (let i = 0; i < 12; i++) { ctx.fillStyle = '#e8d44d'; ctx.fillRect(Math.round(((i * 40 - t * 90) % 480 + 480) % 480 - 80), 124, 18, 1); }
  // vorbeifahrende Autos (Startbildschirm-Kamera fährt mit, Autos überholen langsam)
  if (!_ttlCars) {
    const ds = [PREMIUM_CARS[0].design, Object.assign(defaultDesign(), { body: 's911', cls: 'sport', color: '#1f4fc8', rim: 'multi', rimColor: '#d8dce4', tire: 5, paint: 'candy' }),
      Object.assign(defaultDesign(), { body: 'supra', cls: 'sport', color: '#e8e8ec', color2: '#d82838', sticker: 'racing', rim: 'forged', rimColor: '#2a2a30', tire: 6, spoiler: 'gt' })];
    _ttlCars = ds.map((d, i) => ({ d, lane: i % 2, ph: i * 0.37 }));
  }
  for (const c of _ttlCars.slice().sort((a, b) => a.lane - b.lane)) {
    const cyc = ((t * 0.09 + c.ph) % 1), gy = c.lane ? 121 : 91;
    const k = Math.floor(t * 12 + c.ph * 10) % 4;
    const s = renderCar(c.d, { angle: k / 4 * Math.PI * 2, lights: true });
    const x0 = Math.round(-s.W + cyc * (RW_ + s.W * 2));
    ctx.drawImage(s.cv, x0, gy - s.gy, s.W, s.H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(lightCone('head'), x0 + s.ox + s.L, gy - 22, 70, 32); ctx.restore();
  }
  // Gehweg mit Bordstein, Laternen und Lichtpfützen im Vordergrund
  ctx.fillStyle = '#9aa0aa'; ctx.fillRect(0, 126, RW_, 3); ctx.fillStyle = '#5a5e68'; ctx.fillRect(0, 129, RW_, 1);
  for (let y = 130; y < 180; y++) { ctx.fillStyle = `rgb(${46 - (y - 130) * 0.6 | 0},${48 - (y - 130) * 0.6 | 0},${60 - (y - 130) * 0.7 | 0})`; ctx.fillRect(0, y, RW_, 1); }
  const po = -((t * 90) % 24); ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let x = Math.round(po); x < RW_; x += 24) ctx.fillRect(x, 130, 1, 50);
  const lo = -((t * 90) % 110);
  for (let x = Math.round(lo) - 110; x < RW_ + 110; x += 110) {
    ctx.fillStyle = 'rgba(255,214,140,0.07)'; ctx.beginPath(); ctx.ellipse(x + 2, 150, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a2b33'; ctx.fillRect(x, 92, 2, 58); ctx.fillRect(x - 6, 90, 10, 2); ctx.fillStyle = '#fff0c0'; ctx.fillRect(x - 6, 92, 6, 1);
  }
  // Logo
  const glow = 0.75 + 0.25 * Math.sin(t * 2);
  void glow;
}

// ---------- Tutorial-Tour ----------
const TOUR_STEPS = [
  { t: 'Willkommen bei AutoTycoon!', x: 'Du leitest deine eigene Autofirma: Autos entwerfen, in der Fabrik bauen, verkaufen – und im Drag Race beweisen, wer am schnellsten ist. Diese kurze Tour zeigt dir, wo du was findest. Du kannst sie jederzeit überspringen.' },
  { sel: '#topbar .chip[title="Geld"]', t: 'Dein Geld', x: 'Damit bezahlst du Produktion, Fabrik-Ausbau, Teile und Startgelder. Geld verdienst du, wenn Kunden deine Autos kaufen – und mit Rennsiegen.' },
  { sel: '#topbar .chip[title="Level & Erfahrung"]', t: 'Level & Erfahrung', x: 'Fast alles gibt Erfahrung (XP). Mit jedem Level schaltest du Neues frei: Bereiche wie Schrottplatz oder Liga, stärkere Gegner und längere Strecken.' },
  { sel: '#topbar .chip[title="Forschungspunkte"]', t: 'Forschungspunkte (FP)', x: 'Pro Level bekommst du FP. Damit erforschst du unter „Forschung“ neue Karosserien, Motoren, Turbos, Lacke und Fabrik-Technik.' },
  { sel: '#topbar .chip.spd', t: 'Die Zeit läuft', x: 'Hier steuerst du das Spieltempo: Pause, 1x, 2x oder 5x. Mit jedem Tag baut die Fabrik Autos und Kunden kaufen sie. Tipp: Leertaste = Pause.' },
  { sel: '#nav [data-v="garage"]', t: 'Garage', x: 'Hier entwirfst du deine Autos: Karosserie, Lack, Folien, Felgen, Spoiler, Innenraum. Unter „Motor“ baust du Motoren (und testest sie auf dem Prüfstand), unter „Tuning“ machst du sie rennfertig. Ein neuer Entwurf wird mit „Modell entwickeln“ zu einem Modell, das du bauen kannst.' },
  { sel: '#nav [data-v="company"]', t: 'Firma', x: 'In der Fabrik startest du die Produktion deiner Modelle – jede Linie baut ein Modell. Unter „Modelle & Preise“ legst du den Verkaufspreis fest („Bester Preis“ hilft dir), unter „Verkauf & Werbung“ siehst du deine Finanzen und startest Werbung.' },
  { sel: '#nav [data-v="research"]', t: 'Forschung', x: 'Gib deine FP für neue Technik aus. Ein rotes „!“ zeigt, dass du etwas erforschen kannst.' },
  { sel: '#nav [data-v="racing"]', t: 'Rennen', x: 'Drag Race: Burnout für warme Reifen → Stage → Kupplung halten und Gas geben → bei GRÜN Kupplung loslassen → schalten, wenn die Lichter grün/blau leuchten. Oder einfach „Cruisen“: frei fahren und Spur wechseln. In der Liga fährst du um Pokale.' },
  { sel: '#nav [data-v="goals"]', t: 'Ziele', x: 'Erfolge, tägliche Herausforderungen und deine Ruhmeshalle. Hier gibt es Belohnungen für Geld, Diamanten und FP.' },
  { sel: '#tb-goal', t: 'Dein nächstes Ziel', x: 'Hier oben steht immer, was als Nächstes zu tun ist. Klick darauf, um direkt hinzukommen.' },
  { sel: '.menubtn', t: 'Menü & Einstellungen', x: 'Speichern, Spielstand als Datei sichern, Einstellungen (Ton, Grösse, Tempo) und diese Tour nochmals anschauen. Gespeichert wird auch automatisch.' },
  { t: 'Los geht’s!', x: 'Dein erster Schritt: In der <b>Firma → Fabrik</b> die Produktion deines ersten Autos starten und die Zeit laufen lassen. Viel Spass!', go: 'factory' }
];
let TOUR = null;
function tourStart(force) {
  if (!S || window.__noTour) return;
  if (S.tutDone && !force) return;
  TOUR = { i: 0, speed: S.speed }; S.speed = 0; updateTopbar(true);
  tourShow();
}
function tourShow() {
  const st = TOUR_STEPS[TOUR.i];
  let el = $('#tour'); if (!el) { el = document.createElement('div'); el.id = 'tour'; document.body.appendChild(el); }
  const tgt = st.sel ? $(st.sel) : null;
  if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({ block: 'nearest', inline: 'center' });
  const r = tgt ? tgt.getBoundingClientRect() : null;
  const z = (SET.ui || 100) / 100;
  const last = TOUR.i === TOUR_STEPS.length - 1;
  el.innerHTML = `${r ? `<div class="tour-hole" style="left:${r.left / z - 6}px;top:${r.top / z - 6}px;width:${r.width / z + 12}px;height:${r.height / z + 12}px"></div>` : '<div class="tour-dim"></div>'}
    <div class="tour-card" id="tour-card"><div class="tour-step">${TOUR.i + 1} / ${TOUR_STEPS.length}</div><h3>${st.t}</h3><p>${st.x}</p>
      <div class="flex">${TOUR.i ? '<button class="btn sm gray" data-act="tourPrev">Zurück</button>' : ''}<span class="sp"></span>
      ${last ? '' : '<button class="btn sm dark" data-act="tourEnd">Überspringen</button>'}<button class="btn green" data-act="${last ? 'tourEnd' : 'tourNext'}" data-v="${last && st.go ? st.go : ''}">${last ? (st.go ? 'Zur Fabrik' : 'Fertig') : 'Weiter ▶'}</button></div></div>`;
  const card = $('#tour-card'), cw = card.offsetWidth, ch = card.offsetHeight, W = window.innerWidth / z, H = window.innerHeight / z;
  let x = W / 2 - cw / 2, y = H / 2 - ch / 2;
  if (r) {
    const rl = r.left / z, rt = r.top / z, rb = r.bottom / z, rr = r.right / z;
    if (rr + 20 + cw < W && rl < W / 3) { x = rr + 20; y = rt - 10; }          // rechts neben dem Ziel (Navigation)
    else { x = rl + (rr - rl) / 2 - cw / 2; y = rb + 16; if (y + ch > H - 8) y = rt - ch - 16; }
  }
  card.style.left = clamp(x, 8, W - cw - 8) + 'px'; card.style.top = clamp(y, 8, H - ch - 8) + 'px';
}
ACTIONS.tourNext = () => { if (!TOUR) return; TOUR.i = Math.min(TOUR_STEPS.length - 1, TOUR.i + 1); sfx('click'); tourShow(); };
ACTIONS.tourPrev = () => { if (!TOUR) return; TOUR.i = Math.max(0, TOUR.i - 1); tourShow(); };
ACTIONS.tourEnd = d => {
  const el = $('#tour'); if (el) el.remove();
  if (S) { S.tutDone = true; S.speed = TOUR && TOUR.speed ? TOUR.speed : 1; updateTopbar(true); saveGame(); }
  TOUR = null;
  if (d && d.v) setTab(d.v);
};
window.addEventListener('resize', () => { if (TOUR) tourShow(); });
