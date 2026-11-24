/* =============================================================================
   Teil 7: UI-Grundgerüst – Topbar, Navigation, Toasts, Dialoge, Level-Up,
   Ereignis-Popups, Zentrale (Startseite), Neues Spiel
   ============================================================================= */
const TABS = {};            // Tab-Definitionen: { title, icon, render(el), tick(dt,t) }
const ACTIONS = {};         // Klick-Aktionen: data-act="name"
const INPUTS = {};          // Eingabe-Handler: data-inp="name"
let curTab = 'home';

// ---------- Tabs / Rendering ----------
function setTab(id) {
  if (!TABS[id]) return;
  if (tabLocked(id)) { toast(`${ico('lock')} ${TAB_NAME[id] || TABS[id].title} gibt es ab <b>Level ${TAB_LVL[id]}</b>.`, 'bad'); return; }
  curTab = id; const n = navOf(id); if (n) _navMem[n.id] = id;
  renderNav(); renderTab(false);
}
function renderTab(keep) {
  const c = $('#content'), st = c.scrollTop;
  c.innerHTML = '';
  TABS[curTab].render(c);
  const sn = subnavHTML(); if (sn) c.insertAdjacentHTML('afterbegin', sn);
  revBind();
  c.scrollTop = keep ? st : 0;
  if (!keep) { c.classList.remove('anim'); void c.offsetWidth; c.classList.add('anim'); }
}
const rerender = () => renderTab(true);

function renderNav() { renderNavGrouped(); }
function renderNavOld() {
  const nav = $('#nav');
  const anyTech = S && TECHS.some(t => techState(t) === 'avail');
  const order = ['home', 'design', 'interior', 'engine', 'models', 'factory', 'market', 'salvage', 'research', 'race', 'tuning', 'league', 'ach', 'shop', 'admin'];
  nav.innerHTML = order.filter(id => TABS[id] && (id !== 'admin' || isAdmin())).map(id => [id, TABS[id]]).map(([id, t]) =>
    `<button data-act="tab" data-v="${id}" class="${id === curTab ? 'on' : ''}">${ico(t.icon)}<span>${t.title}</span>${id === 'research' && anyTech ? '<span class="badge">!</span>' : ''}</button>`).join('');
}

// ---------- Topbar ----------
function renderTopbar() {
  dynoMigrate();
  $('#topbar').innerHTML = `
    <div class="brand" id="tb-name"></div>
    <div class="chip" title="Geld">${ico('money')}<span id="tb-money"></span></div>
    <div class="chip" title="Level & Erfahrung">${ico('level')}<span id="tb-lvl"></span><div class="xpbar"><i id="tb-xp"></i></div></div>
    <div class="chip" title="Forschungspunkte">${ico('rp')}<span id="tb-rp"></span></div>
    <div class="chip" title="Markenruf (0–100)">${ico('rep')}<span id="tb-rep"></span></div>
    <div class="chip" title="Datum">${ico('date')}<span id="tb-date"></span></div>
    <div class="chip spd" title="Spielgeschwindigkeit">
      ${[0, 1, 2, 5].map(v => `<button data-act="speed" data-v="${v}" id="spd${v}">${v ? v + 'x' : 'II'}</button>`).join('')}
    </div>${extraTopbarHTML()}`;
  updateTopbar(true); checkGoals();
}
let _tbCache = '', _tbMoney = null;
function updateTopbar(force) {
  if (!S) return;
  const key = [Math.round(S.money), S.gems, JSON.stringify(S.admin || 0), S.level, S.xp, S.rp, S.rep.toFixed(1), S.day, S.speed, S.company].join('|');
  if (!force && key === _tbCache) return;
  _tbCache = key;
  $('#tb-name').textContent = S.company;
  const m = $('#tb-money'); m.textContent = fmtMoney(S.money); m.className = S.money < 0 ? 'bad' : '';
  const mr = Math.round(S.money), mc = m.parentElement;
  if (_tbMoney != null && mr !== _tbMoney && mc) { mc.classList.remove('up', 'down'); void mc.offsetWidth; mc.classList.add(mr > _tbMoney ? 'up' : 'down'); }
  _tbMoney = mr;
  if (adminInf('money')) m.textContent = '∞';
  $('#tb-lvl').textContent = 'Lvl ' + S.level;
  $('#tb-xp').style.width = (S.xp / xpNeed(S.level) * 100).toFixed(1) + '%';
  $('#tb-xp').parentElement.title = `${S.xp} / ${xpNeed(S.level)} XP`;
  $('#tb-rp').textContent = S.rp + ' FP';
  const gm = $('#tb-gems'); if (gm) gm.textContent = adminInf('gems') ? '∞' : fmtNum(S.gems || 0);
  if (adminInf('rp')) $('#tb-rp').textContent = '∞ FP';
  $('#tb-rep').textContent = Math.round(S.rep);
  $('#tb-date').textContent = fmtDate(S.day);
  [0, 1, 2, 5].forEach(v => { const b = $('#spd' + v); if (b) b.classList.toggle('on', S.speed === v); });
}

// ---------- Ereignis-Delegation ----------
function bindDelegation(root) {
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled || !root.contains(b)) return;
    if (b.classList.contains('lock')) { if (b.dataset.why) toast(b.dataset.why, 'bad'); return; }
    const fn = ACTIONS[b.dataset.act];
    if (fn) { e.preventDefault(); if (b.dataset.act !== 'sfxToggle') sfx('click'); fn(b.dataset, b, e); }
  });
  const inp = e => {
    const el = e.target.closest('[data-inp]');
    if (!el) return;
    const fn = INPUTS[el.dataset.inp];
    if (fn) fn(el, e.type);
  };
  root.addEventListener('input', inp);
  root.addEventListener('change', inp);
}
ACTIONS.tab = d => setTab(d.v);
ACTIONS.speed = d => { S.speed = +d.v; updateTopbar(true); };
ACTIONS.close = () => closeModal();

// ---------- Toasts ----------
function toast(html, type = '', ms = 3200) {
  const box = $('#toasts');
  while (box.children.length >= 5) box.firstChild.remove();
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.innerHTML = html.trim().startsWith('<div') ? html : '<div>' + html + '</div>';
  if (type === 'good') sfx(html.includes(iconURL('money')) ? 'cash' : 'good'); else if (type === 'bad') sfx('bad');
  box.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
}

// ---------- Dialog ----------
function openModal(html, small = false) {
  const m = $('#modal');
  m.innerHTML = `<div class="mbox ${small ? 'small' : ''}">${html}</div>`;
  m.classList.remove('hidden');
}
function closeModal() {
  const m = $('#modal');
  if (m.dataset.onclose) { const f = window[m.dataset.onclose]; m.dataset.onclose = ''; if (f) f(); }
  m.classList.add('hidden'); m.innerHTML = '';
}
function confirmBox(text, onYes, yesLabel = 'Ja') {
  ACTIONS._confirmYes = () => { closeModal(); onYes(); };
  openModal(`<h2 class="title">${ico('star', 'big')} Bestätigen</h2><p style="margin:6px 4px 14px;line-height:1.4">${text}</p>
    <div class="flex"><button class="btn red" data-act="_confirmYes">${yesLabel}</button><button class="btn gray" data-act="close">Abbrechen</button></div>`, true);
}

// ---------- Ereignis-Popup (Zufallsereignis) ----------
function showEventPopup(ev, text) {
  const type = ev.good ? 'good' : ev.bad ? 'bad' : '';
  toast(`<div>${ico(ev.good ? 'star' : ev.bad ? 'fire' : 'ad', 'big')}</div><div><b>${ev.title}</b><br>${text}</div>`, type, 8000);
}

// ---------- Level-Up-Animation (Pixel) ----------
let _lvlAnim = null;
function showLevelUp(level, rp) {
  const box = $('#lvlup'), cv = $('#lvlup canvas'), ctx = hdCtx(cv);
  box.classList.remove('hidden');
  const parts = Array.from({ length: 70 }, () => ({ x: 160, y: 80, vx: rand(-90, 90), vy: rand(-110, 20), c: pick(['#ffcd75', '#a7f070', '#73eff7', '#ef7d57', '#f4f4f4']), s: randi(1, 3) }));
  const t0 = performance.now();
  cancelAnimationFrame(_lvlAnim);
  const frame = now => {
    const t = (now - t0) / 1000;
    ctx.clearRect(0, 0, 320, 180);
    // Hintergrund-Streifen
    const a = Math.min(1, t * 4) * (t > 2.4 ? Math.max(0, 1 - (t - 2.4) * 3) : 1);
    ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 52, 320, 76);
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(0, 52, 320, 2); ctx.fillRect(0, 126, 320, 2);
    ctx.globalAlpha = a;
    // Partikel
    for (const p of parts) { const px = p.x + p.vx * t, py = p.y + p.vy * t + 60 * t * t; ctx.fillStyle = p.c; ctx.fillRect(Math.round(px), Math.round(py), p.s, p.s); }
    // Text mit Hüpfen
    const bounce = Math.max(0, Math.sin(t * 9) * 6 * Math.max(0, 1 - t * 1.2));
    cxText(ctx, 'LEVEL UP!', 160, 62 - bounce, (Math.floor(t * 8) % 2) ? '#ffcd75' : '#ef7d57', 4, 'c', '#000');
    cxText(ctx, 'LEVEL ' + level, 160, 92, '#f4f4f4', 2, 'c', '#000');
    cxText(ctx, '+' + rp + ' FORSCHUNGSPUNKTE', 160, 110, '#a7f070', 1, 'c', '#000');
    ctx.globalAlpha = 1;
    if (t < 2.8) _lvlAnim = requestAnimationFrame(frame); else box.classList.add('hidden');
  };
  _lvlAnim = requestAnimationFrame(frame);
  sfx('level');
  toast(`${ico('level')} <b>Level ${level}!</b> +${rp} Forschungspunkte`, 'good', 4000);
  renderNav();
}

// ---------- Neues Spiel ----------
function showNewGame(canCancel) {
  openModal(`<h2 class="title">${ico('car', 'big')} AutoTycoon</h2>
    <p style="margin:4px 4px 10px;line-height:1.45">Gründe deine eigene Autofirma! Du startest mit einer kleinen Garage, ${fmtMoney(40000)} und einem einfachen Kleinwagen.
    Entwirf Autos und Motoren, baue die Fabrik aus, mach Werbung, gewinne Drag Races und erforsche neue Technik – bis zum Hypercar.</p>
    <div class="lbl">Firmenname</div>
    <input type="text" id="ng-name" maxlength="22" value="Pixel Motors" style="width:100%">
    <div class="flex" style="margin-top:12px"><button class="btn green big" data-act="ngStart">Firma gründen</button>${canCancel ? '<button class="btn gray" data-act="close">Abbrechen</button>' : ''}</div>`, true);
  setTimeout(() => { const i = $('#ng-name'); if (i) { i.focus(); i.select(); } }, 50);
}
ACTIONS.ngStart = () => {
  const name = ($('#ng-name').value || '').trim().slice(0, 22) || 'Pixel Motors';
  wipeSave();
  newState(name); S.speed = 1;
  _carCache.clear(); _spriteCache.clear(); _tbCache = '';
  closeModal(); renderTopbar(); setTab('home'); saveGame();
  toast(`Willkommen bei <b>${esc(name)}</b>! Starte die Produktion deines ersten Autos in der Fabrik.`, 'good', 6000);
  setTimeout(() => tourStart(true), 500);
};
ACTIONS.newGame = () => confirmBox('Wirklich ein neues Spiel starten? Der aktuelle Spielstand wird gelöscht.', () => showNewGame(true), 'Neues Spiel');
ACTIONS.saveNow = () => { const ok = saveGame(); toast(ok ? 'Spiel gespeichert.' : 'Speichern nicht möglich (Browser blockiert localStorage).', ok ? 'good' : 'bad'); };

// ---------- Zentrale (Startseite) ----------
TABS.home = {
  title: 'Zentrale', icon: 'home',
  render(el) { homeRender(el); },
  renderOld(el) {
    const mc = monthlyCost();
    const prodActive = S.factory.lines.filter(l => l.active).length;
    const st = stockTotal();
    const mods = S.mods.filter(m => m.until > S.day);
    const camp = S.campaigns;
    const tips = [];
    if (!S.factory.lines.some(l => l.active) && st === 0) tips.push('Gehe zur <b>Fabrik</b> und starte die Produktion deines Modells.');
    if (S.rp > 0 && TECHS.some(t => techState(t) === 'avail')) tips.push(`Du hast <b>${S.rp} Forschungspunkte</b> – schalte neue Technik frei!`);
    if (st >= warehouseCap()) tips.push('Dein <b>Lager ist voll</b>. Senke den Preis, mach Werbung oder baue das Lager aus.');
    if (S.models.length === 1 && S.level >= 2) tips.push('Entwirf im <b>Auto-Designer</b> ein zweites Modell für neue Kunden.');
    if (S.money < 5000) tips.push('Wenig Geld? Gewinne ein paar <b>Drag Races</b> gegen Rookie Rudi.');
    if (!camp.length && S.money > 3000) tips.push('Eine <b>Werbekampagne</b> erhöht die Nachfrage.');
    el.innerHTML = `
      <h2 class="title">${ico('home', 'big')} ${esc(S.company)} – Zentrale</h2>
      <div class="row">
        <div class="col">
          <div class="panel"><h3>${ico('market')}Firmenübersicht</h3>
            <div class="grid2">
              <div>Kontostand</div><div class="${S.money < 0 ? 'bad' : 'good'}">${fmtMoney(S.money)}</div>
              <div>Level</div><div>${S.level} (${S.xp}/${xpNeed(S.level)} XP)</div>
              <div>Markenruf</div><div>${Math.round(S.rep)} / 100</div>
              <div>Fabrik</div><div>${STAGES[S.factory.stage].name} · ${S.factory.lines.length} Linie(n)</div>
              <div>Mitarbeiter</div><div>${staffCount()}</div>
              <div>Monatskosten</div><div class="bad">-${fmtMoney(mc)}</div>
              <div>Modelle</div><div>${S.models.length}</div>
              <div>Lager</div><div>${st} / ${warehouseCap()}</div>
              <div>Produktion</div><div>${prodActive} aktive Linie(n)</div>
              <div>Verkaufte Autos</div><div>${fmtNum(S.stats.sold)}</div>
              <div>Umsatz gesamt</div><div>${fmtMoney(S.stats.revenue)}</div>
              <div>Drag Races</div><div>${S.stats.wins} Siege / ${S.stats.races}</div>
            </div>
          </div>
          <div class="panel"><h3>${ico('money')}Kontostand (letzte Tage)</h3><canvas id="moneycv" width="240" height="60" class="cv"></canvas></div>
          ${bankPanelHTML()}
        </div>
        <div class="col">
          ${goalsPanelHTML()}
          ${tips.length ? `<div class="panel"><h3>${ico('star')}Tipps</h3>${tips.map(t => `<div class="hint" style="color:var(--text)">› ${t}</div>`).join('')}</div>` : ''}
          <div class="panel"><h3>${ico('ad')}Aktive Effekte</h3>
            ${camp.length || mods.length ? '' : '<div class="muted">Keine aktiven Kampagnen oder Ereignisse.</div>'}
            ${camp.map(c => { const C0 = CAMPAIGNS.find(x => x.id === c.id); return `<div class="flex"><span class="tag g">Werbung</span>${C0.name}<span class="sp"></span><span class="muted">${c.until - S.day} Tage</span></div>`; }).join('')}
            ${mods.map(m => `<div class="flex"><span class="tag ${(m.mult || m.demand || m.sport || m.ev || m.fuel) > 0 && !m.cost && !(m.speed < 0) ? 'y' : 'r'}">Ereignis</span>${modLabel(m)}<span class="sp"></span><span class="muted">${m.until - S.day} Tage</span></div>`).join('')}
          </div>
          <div class="panel"><h3>${ico('list')}Ereignis-Logbuch</h3>
            ${S.log.length ? S.log.slice(0, 8).map(l => `<div style="margin-bottom:6px"><span class="tag">${fmtDate(l.day)}</span> <b>${l.title}</b><div class="hint">${l.text}</div></div>`).join('') : '<div class="muted">Noch keine Ereignisse.</div>'}
          </div>
          <div class="panel"><h3>${ico('wrench')}Spiel</h3>
            <div class="hint">Das Spiel speichert automatisch alle 15 Sekunden im Browser.</div>
            <button class="btn green" data-act="saveNow">Jetzt speichern</button>
            <button class="btn red" data-act="newGame">Neues Spiel</button>
            <div class="hint">Spielgeschwindigkeit oben: II = Pause, 1x, 2x, 5x – oder Tasten: Leertaste = Pause, 1 / 2 / 3 = Tempo.</div>
          </div>
        </div>
      </div>`;
    drawMoneyChart();
  },
  tick() { }
};
function modLabel(m) {
  if (m.modelId) { const mm = modelById(m.modelId); return `${mm ? esc(mm.name) : 'Modell'}: Nachfrage ${m.mult > 0 ? '+' : ''}${Math.round(m.mult * 100)} %`; }
  const ev = EVENTS.find(e => e.id === m.id);
  return ev ? ev.title : 'Ereignis';
}
function drawMoneyChart() {
  const cv = $('#moneycv'); if (!cv) return;
  const ctx = hdCtx(cv), W = cv._lw, H = cv._lh;
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 10) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, y, W, 1); }
  const h = S.hist.slice(-W / 2);
  if (h.length < 2) { cxText(ctx, 'NOCH KEINE DATEN', W / 2, H / 2 - 2, '#566c86', 1, 'c'); return; }
  const mn = Math.min(0, ...h), mx = Math.max(1, ...h);
  const yOf = v => Math.round(H - 4 - (v - mn) / (mx - mn) * (H - 10));
  if (mn < 0) { ctx.fillStyle = '#b13e53'; ctx.fillRect(0, yOf(0), W, 1); }
  for (let i = 1; i < h.length; i++) {
    const x0 = (i - 1) * 2, x1 = i * 2, y0 = yOf(h[i - 1]), y1 = yOf(h[i]);
    ctx.fillStyle = h[i] >= h[i - 1] ? '#a7f070' : '#ef7d57';
    const ya = Math.min(y0, y1), yb = Math.max(y0, y1);
    ctx.fillRect(x1, ya, 2, Math.max(1, yb - ya + 1));
    ctx.fillStyle = 'rgba(167,240,112,0.12)'; ctx.fillRect(x1, y1 + 1, 2, H - y1);
    void x0;
  }
  cxText(ctx, fmtMoney(h[h.length - 1]).replace('’', "'"), W - 3, 3, '#ffcd75', 1, 'r');
}

/** Gemeinsame Werte-Anzeige für Autos */
function statsHTML(car, price, base) {
  if (!carKnown(car)) return `<div class="card" style="box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--orange)"><b>Leistung und Fahrwerte unbekannt.</b><div class="hint">Der Motor war noch nicht auf dem Prüfstand. Im Motor-Designer findest du den Dyno.</div><button class="btn yellow sm" data-act="goto" data-v="engine">${ico('dyno')} Zum Motor-Designer</button></div>` + statsHTMLRaw(car, price, true);
  return statsHTMLRaw(car, price, false, base && carKnown(base) ? base : null);
}
function statsHTMLRaw(car, price, hide, base) {
  if (hide) car = Object.assign({}, car, { ps: 0, nm: 0, top: 0, t100: 15, t18: 14, t14: 22 });
  // Änderung zum Vergleichsauto: grün = besser, rot = schlechter
  const DIFF = { 'Leistung': ['ps', 1, 0], 'Drehmoment': ['nm', 1, 0], 'Gewicht': ['weight', -1, 0], 'Vmax': ['top', 1, 0], '0–100 km/h': ['t100', -1, 2], '1/8 Meile': ['t18', -1, 2], '1/4 Meile': ['t14', -1, 2],
    'Verbrauch': ['cons', -1, 1], 'Sicherheit': ['safety', 1, 0], 'Komfort': ['comfort', 1, 0], 'Zuverlässigk.': ['rel', 1, 0], 'Stil': ['style', 1, 0] };
  const diff = lbl => {
    const D = DIFF[lbl]; if (!base || !D) return '';
    const dv = car[D[0]] - base[D[0]]; if (Math.abs(dv) < Math.pow(10, -D[2]) / 2) return '';
    const good = dv * D[1] > 0;
    return ` <b style="color:${good ? 'var(--lime)' : '#ff7b8a'};font-size:12px">${good ? '▲' : '▼'}${dv > 0 ? '+' : ''}${dv.toFixed(D[2])}</b>`;
  };
  const row = (lbl, v, max, txt, col) => `<div class="stat"><span>${lbl}</span>${barHTML(v, max, col)}<span>${txt}${diff(lbl)}</span></div>`;
  const cons = car.isEV ? car.cons.toFixed(1) + ' kWh' : car.cons.toFixed(1) + ' l';
  return `
    ${row('Leistung', car.ps, 1600, car.ps + ' PS', 'var(--orange)')}
    ${row('Drehmoment', car.nm, 1800, car.nm + ' Nm', 'var(--orange)')}
    ${row('Gewicht', 2600 - car.weight, 2000, fmtNum(car.weight) + ' kg', 'var(--sky)')}
    ${row('Vmax', car.top, 480, car.top + ' km/h', 'var(--yellow)')}
    ${row('0–100 km/h', 15 - car.t100, 13, car.t100.toFixed(2) + ' s', 'var(--yellow)')}
    ${row('1/8 Meile', 14 - car.t18, 10, car.t18.toFixed(2) + ' s', 'var(--yellow)')}
    ${row('1/4 Meile', 22 - car.t14, 16, car.t14.toFixed(2) + ' s', 'var(--yellow)')}
    ${row('Verbrauch', 22 - car.cons, 20, cons + '/100', 'var(--lime)')}
    ${row('Sicherheit', car.safety, 100, car.safety, 'var(--lime)')}
    ${row('Komfort', car.comfort, 100, car.comfort, 'var(--lime)')}
    ${row('Zuverlässigk.', car.rel, 100, car.rel, 'var(--lime)')}
    ${row('Stil', car.style, 100, car.style, 'var(--cyan)')}
    <div class="stat"><span>Antrieb</span><span>${car.drive} · ${car.E.isEV ? '1 Gang' : car.E.gears + ' Gänge'}</span><span>Grip ${car.grip.toFixed(2)}</span></div>
    <div class="stat"><span>Prod.-Kosten</span><span></span><span class="bad">${fmtMoney(car.prodCost)}</span></div>
    <div class="stat"><span>Marktwert</span><span></span><span class="good">${fmtMoney(car.value)}</span></div>
    ${price ? `<div class="stat"><span>Verkaufspreis</span><span></span><span class="warn">${fmtMoney(price)}</span></div>` : ''}
    <div class="lbl">Kundengruppen</div>
    ${Object.entries(SEGMENTS).map(([k, g]) => row(g.name, car.score[k], 100, car.score[k] + ' Pkt', k === 'family' ? 'var(--sky)' : k === 'sport' ? 'var(--orange)' : 'var(--purple)')).join('')}`;
}
