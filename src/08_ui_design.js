/* =============================================================================
   Teil 8: Auto-Designer, Interieur-Designer, Motor-Designer
   ============================================================================= */

// ---------- Hilfen für Optionsknöpfe ----------
function setPath(obj, path, v) { const p = path.split('.'); let o = obj; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = v; }
function getPath(obj, path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj); }
/** Knopfreihe: items = [[wert, label, techId, extraLockGrund]] */
function optBtns(act, key, items, cur, type = '') {
  return `<div class="opts">${items.map(([v, label, tech, lockWhy]) => {
    const locked = (tech && !has(tech)) || !!lockWhy;
    const why = lockWhy || (tech ? 'Benötigt Forschung: ' + techLabel(tech) : '');
    return `<button class="btn sm ${String(cur) === String(v) ? 'sel' : ''} ${locked ? 'lock' : ''}" data-act="${act}" data-k="${key}" data-v="${v}" data-t="${type}" ${locked ? `data-why="${esc(why)}" title="${esc(why)}"` : ''}>${label}</button>`;
  }).join('')}</div>`;
}
function swatches(act, key, colors, cur, inpName) {
  return `<div class="opts" style="align-items:center">${colors.map(c => c === 'none'
    ? `<button class="btn sm ${cur === 'none' ? 'sel' : ''}" data-act="${act}" data-k="${key}" data-v="none">Aus</button>`
    : `<button class="sw ${String(cur).toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-act="${act}" data-k="${key}" data-v="${c}" title="${c}"></button>`).join('')}
    ${inpName ? `<input type="color" value="${cur && cur !== 'none' ? cur : '#ffffff'}" data-inp="${inpName}" data-k="${key}" title="Eigene Farbe">` : ''}</div>`;
}
const conv = (v, t) => t === 'n' ? +v : t === 'b' ? v === 'true' : v;
document.head.insertAdjacentHTML('beforeend', `<style>:root{--lock-ico:url(${iconURL('lock')})}</style>`);

// ---------- AUTO-DESIGNER ----------
ACTIONS.dset = d => {
  const v = conv(d.v, d.t);
  setPath(S.draft, d.k, v);
  if (d.k === 'cls') { const b = Object.keys(BODIES).find(id => BODIES[id].cls === v && bodyUnlocked(id)); if (b) S.draft.body = b; }
  rerender();
};
INPUTS.dcolor = (el, type) => { setPath(S.draft, el.dataset.k, el.value); if (type === 'change') rerender(); };
ACTIONS.dphoto = () => {
  const src = $('#garagecv'); if (!src) return;
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height + 54;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, src.height, cv.width, 54);
  ctx.setTransform(3, 0, 0, 3, 0, src.height);
  const car = computeCar(S.draft), nm = String(S.draft.name || 'Mein Auto').toUpperCase().slice(0, 24);
  cxText(ctx, nm, 6, 3, '#ffcd75', 1);
  cxText(ctx, `${S.company.toUpperCase().slice(0, 16)} · ${carKnown(car) ? car.ps + ' PS · ' + car.t14.toFixed(2) + ' S' : BODIES[S.draft.body].name.toUpperCase()}`, 6, 11, '#94b0c2', 1);
  const a = document.createElement('a'); a.download = 'autotycoon_' + String(S.draft.name || 'auto').replace(/[^a-z0-9_-]+/gi, '_') + '.png';
  a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
  toast(`${ico('star')} Foto gespeichert`, 'good');
};
INPUTS.dname = el => { S.draft.name = el.value.slice(0, 24); };
INPUTS.drange = (el, type) => {
  setPath(S.draft, el.dataset.k, +el.value);
  const l = $('#lbl-' + el.dataset.k.replace('.', '_')); if (l) l.textContent = rangeLabel(el.dataset.k, +el.value);
  if (type === 'change') updateDesignLive();
};
INPUTS.dengine = el => { S.draft.engineId = el.value; rerender(); };
INPUTS.dnum = (el, type) => { S.draft.number = clamp(parseInt(el.value, 10) || 0, 0, 99); if (type === 'change') rerender(); };
function rangeLabel(k, v) {
  if (k === 'tire') return TIRES[v].inch + ' Zoll';
  if (k === 'ride') return v === 0 ? 'Serie' : v < 0 ? `${-v * 15} mm tiefer` : `${v * 15} mm höher`;
  if (k === 'tint') return ['Klar', 'Leicht', 'Mittel', 'Dunkel', 'Limo'][v];
  return v;
}
function updateDesignLive() {
  const ex = S.draft.id && modelById(S.draft.id);
  const box = $('#dstats'); if (box) box.innerHTML = statsHTML(computeCar(S.draft), null, ex ? carOf(ex) : null);
  const dc = $('#devcost'); if (dc) dc.textContent = fmtMoney(devCost(computeCar(S.draft)));
}
ACTIONS.dsave = d => { const m = saveModelFromDraft(d.v === 'new'); if (m) rerender(); };
ACTIONS.dreset = () => { const e = S.draft.engineId; S.draft = defaultDesign(); S.draft.name = 'Neues Modell'; S.draft.engineId = e; rerender(); };
ACTIONS.d3d = () => open3D(S.draft);
ACTIONS.goto = d => setTab(d.v);

TABS.design = {
  title: 'Auto-Designer', icon: 'car',
  render(el) {
    const d = S.draft;
    if (!S.engines.find(e => e.id === d.engineId)) d.engineId = S.engines[0].id;
    const car = computeCar(d);
    const existing = d.id && modelById(d.id);
    const B = BODIES[d.body];
    const bodies = Object.keys(BODIES).filter(id => BODIES[id].cls === d.cls);
    el.innerHTML = `
    <h2 class="title">${ico('car', 'big')} Auto-Designer</h2>
    <div class="row">
      <div class="col" style="flex:1 1 470px">
        <div class="panel dark" style="padding:6px;overflow:hidden"><canvas id="garagecv" width="200" height="112" class="cv"></canvas></div>
        ${revPanelHTML('design')}
        <div class="panel">
          <div class="flex"><span class="lbl" style="margin:0">Modellname</span>
            <input type="text" maxlength="24" value="${esc(d.name)}" data-inp="dname" style="flex:1;min-width:140px"></div>
          <div class="flex" style="margin-top:6px">
            ${existing ? `<button class="btn green" data-act="dsave" data-v="upd">Modell aktualisieren</button>` : ''}
            <button class="btn ${existing ? 'gray' : 'green'}" data-act="dsave" data-v="new">${existing ? 'Als neues Modell' : 'Modell entwickeln'} (<span id="devcost">${fmtMoney(devCost(car))}</span>)</button>
            <button class="btn yellow" data-act="d3d">In 3D ansehen</button>
            <button class="btn" data-act="goto" data-v="interior">${ico('seat')} Interieur</button>
            <button class="btn dark" data-act="dreset">Neues Design</button>
            <button class="btn orange" data-act="dphoto" title="Bild deines Autos in der Garage als PNG speichern">${ico('star')} Foto</button>
          </div>
          <div class="hint">${existing ? `Du bearbeitest das Modell „${esc(existing.name)}“. Aktualisieren ist kostenlos.` : 'Ein neues Modell kostet Entwicklungsgeld und bringt viele XP.'}</div>
        </div>
        ${gdecoPanelHTML()}
        <div class="panel"><h3>${ico('market')}Werte${existing ? ' <span class="hint" style="margin:0">▲▼ = Änderung zum gespeicherten Modell</span>' : ''}</h3><div id="dstats">${statsHTML(car, null, existing ? carOf(existing) : null)}</div></div>
      </div>
      <div class="col" style="flex:1 1 340px">
        <div class="panel"><h3>${ico('car')}Klasse & Karosserie</h3>
          ${optBtns('dset', 'cls', CLASS_ORDER.map(c => [c, CLASSES[c].name, CLASSES[c].tech]), d.cls)}
          <div class="lbl">Karosserie (${CLASSES[d.cls].name})</div>
          ${optBtns('dset', 'body', bodies.map(b => [b, BODIES[b].name, BODIES[b].tech]), d.body)}
          <div class="hint">${B.drive} · Basisgewicht ${B.w} kg · cW ${B.cd} · Platz ${B.prac}</div>
        </div>
        <div class="panel"><h3>${ico('engine')}Motor</h3>
          <select data-inp="dengine" style="width:100%">${S.engines.map(e => { const c = computeEngine(e); return `<option value="${e.id}" ${e.id === d.engineId ? 'selected' : ''}>${esc(e.name)} – ${ENGINE_TYPES[e.type].name}, ${dynoKnown(c.key) ? c.ps + ' PS' : '??? PS'}</option>`; }).join('')}</select>
          <button class="btn sm" data-act="goto" data-v="engine">Motor-Designer öffnen</button>
        </div>
        <div class="panel"><h3>${ico('star')}Lack</h3>
          <div class="lbl">Lackfarbe</div>${swatches('dset', 'color', PAINT_COLORS, d.color, 'dcolor')}
          <div class="lbl">Lackart</div>${optBtns('dset', 'paint', Object.entries(PAINTS).filter(([, p]) => !p.career || (S.career && S.career.gold)).map(([k, p]) => [k, p.name, p.tech]), d.paint)}
          <div class="lbl">Streifen / Zweifarbig</div>${optBtns('dset', 'stripe', Object.entries(STRIPES).map(([k, p]) => [k, p.name]), d.stripe)}
          <div class="lbl">Zweitfarbe</div>${swatches('dset', 'color2', PAINT_COLORS, d.color2, 'dcolor')}
        </div>
        <div class="panel"><h3>${ico('wrench')}Felgen & Reifen</h3>
          ${optBtns('dset', 'rim', Object.entries(RIMS).map(([k, r]) => [k, r.name, r.tech]), d.rim)}
          <div class="lbl">Felgenfarbe</div>${swatches('dset', 'rimColor', has('shop_neon') ? RIM_COLORS.concat(RIM_COLORS_PRO) : RIM_COLORS, d.rimColor, 'dcolor')}
          <div class="lbl">Reifengrösse: <span id="lbl-tire">${rangeLabel('tire', d.tire)}</span></div>
          <input type="range" min="0" max="6" step="1" value="${d.tire}" data-inp="drange" data-k="tire">
        </div>
        <div class="panel"><h3>${ico('fire')}Aerodynamik</h3>
          <div class="lbl">Heckspoiler</div>${optBtns('dset', 'spoiler', Object.entries(SPOILERS).map(([k, p]) => [k, p.name, p.tech]), d.spoiler)}
          <div class="lbl">Frontlippe</div>${optBtns('dset', 'lip', Object.entries(LIPS).map(([k, p]) => [k, p.name, p.tech]), d.lip)}
          <div class="lbl">Seitenschweller</div>${optBtns('dset', 'skirts', Object.entries(SKIRTS).map(([k, p]) => [k, p.name, p.tech]), d.skirts)}
          <div class="lbl">Diffusor</div>${optBtns('dset', 'diffuser', Object.entries(DIFFUSERS).map(([k, p]) => [k, p.name, p.tech]), d.diffuser)}
        </div>
        <div class="panel"><h3>${ico('car')}Fahrwerk & Scheiben</h3>
          <div class="lbl">Tieferlegung: <span id="lbl-ride">${rangeLabel('ride', d.ride)}</span></div>
          <input type="range" min="${has('tun_airride') ? -5 : -3}" max="2" step="1" value="${d.ride}" data-inp="drange" data-k="ride">
          ${has('tun_airride') ? '<div class="hint">Luftfahrwerk: bis 75 mm tiefer – die Räder verschwinden im Radkasten.</div>' : `<div class="hint">${ico('lock')} Noch tiefer mit ${techLabel('tun_airride')}</div>`}
          <div class="lbl">Scheibentönung: <span id="lbl-tint">${rangeLabel('tint', d.tint)}</span></div>
          <input type="range" min="0" max="4" step="1" value="${d.tint}" data-inp="drange" data-k="tint">
        </div>
        <div class="panel"><h3>${ico('fire')}Street-Style</h3>
          <div class="lbl">Bodykit</div>${optBtns('dset', 'kit', Object.entries(KITS).map(([k, p]) => [k, p.name, p.tech]), d.kit || 'none')}
          <div class="lbl">Neon-Unterbodenbeleuchtung</div>${has('tun_glow') ? swatches('dset', 'glow', has('shop_neon') ? GLOWS.concat(GLOWS_PRO) : GLOWS, d.glow || 'none', null) : `<div class="hint">${ico('lock')} Benötigt ${techLabel('tun_glow')}</div>`}
          <div class="lbl">Scheibenbanner</div>${optBtns('dset', 'banner', [['false', 'Aus'], ['true', 'An (Zweitfarbe)']], String(!!d.banner), 'b')}
          <div class="hint">Street-Style bringt viel Stil – Sportfahrer lieben das!</div>
        </div>
        <div class="panel"><h3>${ico('race')}Startnummer & Aufkleber</h3>
          <div class="flex"><span class="lbl" style="margin:0">Nummer (0 = keine)</span><input type="number" min="0" max="99" value="${d.number}" data-inp="dnum" style="width:80px"></div>
          ${optBtns('dset', 'numStyle', [['circle', 'Kreis'], ['box', 'Box']], d.numStyle)}
          <div class="lbl">Aufkleber</div>${optBtns('dset', 'sticker', Object.entries(STICKERS).map(([k, p]) => [k, p.name]), d.sticker)}
          <div class="lbl">Eigener Aufkleber (Pixel-Editor)</div><div class="opts"><button class="btn sm yellow" data-act="decalEdit">${ico('star')} ${decalOf(d) ? 'Aufkleber bearbeiten' : 'Aufkleber malen'}</button>${decalOf(d) ? '<button class="btn sm gray" data-act="decRemove">Entfernen</button>' : ''}</div>
        </div>
      </div>
    </div>`;
  },
  tick(dt, t) { const cv = $('#garagecv'); if (cv && every('garage', REV.on ? 60 : 30)) drawGarage(hdCtx(cv, 3), revShownDesign('design'), t, S.company); }
};

// ---------- INTERIEUR ----------
const TIER_PRESETS = {
  basic:   { seats: ['cloth'], steer: ['standard'], dash: ['analog'], ambient: 'none', cage: false },
  komfort: { seats: ['leather', 'cloth'], steer: ['sport', 'standard'], dash: ['digital', 'analog'], ambient: 'none', cage: false },
  luxus:   { seats: ['premium', 'leather', 'cloth'], steer: ['standard'], dash: ['digital', 'analog'], ambient: '#41a6f6', cage: false },
  race:    { seats: ['carbon', 'sport', 'cloth'], steer: ['race', 'sport', 'standard'], dash: ['carbon', 'digital', 'analog'], ambient: 'none', cage: true }
};
ACTIONS.itier = d => {
  const t = d.v; if (!has(INT_TIERS[t].tech)) return;
  const P = TIER_PRESETS[t], I = S.draft.interior;
  I.tier = t;
  I.seats = P.seats.find(s => has(SEATS[s].tech));
  I.steer = P.steer.find(s => has(STEER[s].tech));
  I.dash = P.dash.find(s => has(DASHES[s].tech));
  I.ambient = has('int_ambient') ? P.ambient : 'none';
  I.cage = P.cage && has('int_rollcage');
  rerender();
};
TABS.interior = {
  title: 'Interieur', icon: 'seat',
  render(el) {
    const d = S.draft, I = d.interior = Object.assign(defaultInterior(), d.interior || {});
    const car = computeCar(d);
    const tier = INT_TIERS[I.tier];
    const icost = tier.cost + SEATS[I.seats].cost + STEER[I.steer].cost + DASHES[I.dash].cost + (I.cage ? 2500 : 0) + (I.ambient !== 'none' ? 400 : 0);
    const iw = tier.w + SEATS[I.seats].w + DASHES[I.dash].w + (I.cage ? 28 : 0);
    el.innerHTML = `
    <h2 class="title">${ico('seat', 'big')} Interieur – ${esc(d.name)}</h2>
    <div class="row">
      <div class="col" style="flex:1 1 470px">
        <div class="panel dark" style="padding:6px"><canvas id="cockpitcv" width="192" height="108" class="cv"></canvas></div>
        <div class="panel"><h3>${ico('market')}Interieur-Werte</h3>
          <div class="stat"><span>Komfort Auto</span>${barHTML(car.comfort, 100)}<span>${car.comfort}</span></div>
          <div class="stat"><span>Gewicht Interieur</span><span></span><span>${iw >= 0 ? '+' : ''}${iw} kg</span></div>
          <div class="stat"><span>Kosten Interieur</span><span></span><span class="bad">${fmtMoney(icost)}</span></div>
          <div class="stat"><span>Gesamtgewicht</span><span></span><span>${fmtNum(car.weight)} kg</span></div>
          <div class="lbl">Wirkung auf Kunden</div>
          ${Object.entries(SEGMENTS).map(([k, g]) => `<div class="stat"><span>${g.name}</span>${barHTML(car.score[k], 100, 'var(--sky)')}<span>${car.score[k]} Pkt</span></div>`).join('')}
          <div class="hint">${tier.desc} Luxus lockt Familien und Hypercar-Käufer, Race-Interieur spart Gewicht und begeistert Sportfahrer.</div>
          <div class="flex"><button class="btn" data-act="goto" data-v="design">${ico('car')} Zurück zum Auto-Designer</button>
          ${d.id && modelById(d.id) ? `<button class="btn green" data-act="dsave" data-v="upd">Modell aktualisieren</button>` : `<button class="btn green" data-act="dsave" data-v="new">Modell entwickeln</button>`}</div>
        </div>
      </div>
      <div class="col" style="flex:1 1 340px">
        <div class="panel"><h3>${ico('level')}Interieur-Stufe</h3>
          ${optBtns('itier', 'tier', Object.entries(INT_TIERS).map(([k, t]) => [k, t.name, t.tech]), I.tier)}
          <div class="hint">Die Stufe setzt passende Teile – du kannst sie danach einzeln ändern.</div>
        </div>
        <div class="panel"><h3>${ico('seat')}Sitze</h3>
          ${optBtns('dset', 'interior.seats', Object.entries(SEATS).map(([k, s]) => [k, s.name, s.tech]), I.seats)}
          <div class="lbl">Sitzfarbe</div>${swatches('dset', 'interior.seatColor', SEAT_COLORS, I.seatColor, 'dcolor')}
        </div>
        <div class="panel"><h3>${ico('wrench')}Lenkrad & Armaturen</h3>
          <div class="lbl">Lenkrad</div>${optBtns('dset', 'interior.steer', Object.entries(STEER).map(([k, s]) => [k, s.name, s.tech]), I.steer)}
          <div class="lbl">Armaturenbrett</div>${optBtns('dset', 'interior.dash', Object.entries(DASHES).map(([k, s]) => [k, s.name, s.tech]), I.dash)}
        </div>
        <div class="panel"><h3>${ico('star')}Ambientebeleuchtung</h3>
          ${has('int_ambient') ? swatches('dset', 'interior.ambient', AMBIENTS, I.ambient, null) : `<div class="hint">${ico('lock')} Benötigt Forschung: ${techLabel('int_ambient')}</div>`}
        </div>
        <div class="panel"><h3>${ico('race')}Überrollkäfig</h3>
          ${optBtns('dset', 'interior.cage', [['false', 'Aus'], ['true', 'Eingebaut', 'int_rollcage']], String(I.cage), 'b')}
          <div class="hint">+8 Sicherheit, +28 kg, -10 Komfort. Für echte Racer.</div>
        </div>
      </div>
    </div>`;
  },
  tick(dt, t) { const cv = $('#cockpitcv'); if (cv && every('cockpit', 20)) drawCockpit(hdCtx(cv), S.draft, t); }
};

// ---------- MOTOR-DESIGNER ----------
const maxGears = () => has('tun_gear8') ? 8 : has('tun_gear6') ? 6 : 5;
function fixEngineDraft() {
  const e = S.engDraft, T = ENGINE_TYPES[e.type];
  e.disp = clamp(+e.disp, T.dmin, T.dmax);
  if (e.type === 'ev') { e.ind = 'none'; e.nos = 'none'; e.exh = 'stock'; e.motors = clamp(e.motors | 0 || 1, 1, has('eng_evmulti') ? 4 : 2); }
  e.gears = clamp(e.gears | 0, 4, maxGears());
}
ACTIONS.eset = d => {
  const v = conv(d.v, d.t);
  S.engDraft[d.k] = v;
  if (d.k === 'type') { const T = ENGINE_TYPES[v]; S.engDraft.disp = v === 'ev' ? 70 : Math.round((T.dmin + (T.dmax - T.dmin) * 0.4) * 10) / 10; }
  fixEngineDraft(); rerender();
};
INPUTS.ename = el => { S.engDraft.name = el.value.slice(0, 24); };
INPUTS.erange = (el, type) => {
  S.engDraft[el.dataset.k] = +el.value;
  const l = $('#lbl-e' + el.dataset.k); if (l) l.textContent = engRangeLabel(el.dataset.k, +el.value);
  if (type === 'change') { fixEngineDraft(); rerender(); } else updateEngineLive();
};
function engRangeLabel(k, v) {
  if (k === 'disp') return S.engDraft.type === 'ev' ? v + ' kWh Batterie' : (+v).toFixed(1) + ' Liter';
  if (k === 'gears') return v + ' Gänge';
  return v;
}
function updateEngineLive() { const b = $('#estats'); if (b) b.innerHTML = engineStatsHTML(computeEngine(S.engDraft)); drawEngineCurve(); }
ACTIONS.esave = d => { const e = saveEngineFromDraft(d.v === 'new'); if (e) rerender(); };
ACTIONS.eload = d => { const e = S.engines.find(x => x.id === d.v); if (e) { S.engDraft = clone(e); fixEngineDraft(); rerender(); } };
ACTIONS.edel = d => confirmBox('Motor wirklich löschen?', () => { deleteEngine(d.v); rerender(); });
ACTIONS.euse = () => { if (S.engDraft.id && S.engines.find(e => e.id === S.engDraft.id)) { S.draft.engineId = S.engDraft.id; toast('Motor wird im Auto-Designer verwendet.', 'good'); setTab('design'); } else toast('Speichere den Motor zuerst.', 'bad'); };
ACTIONS.enew = () => { S.engDraft = defaultEngine(); S.engDraft.name = 'Neuer Motor'; rerender(); };

function engineStatsHTML(c) {
  const row = (l, v, max, txt, col) => `<div class="stat"><span>${l}</span>${barHTML(v, max, col)}<span>${txt}</span></div>`;
  const known = dynoKnown(c.key);
  return `${known ? row('Leistung', c.ps, 1600, c.ps + ' PS', 'var(--orange)') : row('Leistung', 0, 1, '??? PS', 'var(--orange)')}
    ${known ? row('Drehmoment', c.nm, 1800, c.nm + ' Nm', 'var(--orange)') : row('Drehmoment', 0, 1, '??? Nm', 'var(--orange)')}
    ${known ? '' : `<div class="card" style="box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--orange)"><div class="flex"><span>Leistung unbekannt – ab auf den Prüfstand!</span><span class="sp"></span><button class="btn yellow" data-act="dynoRun" data-v="draft">${ico('dyno')} Dyno (${fmtMoney(dynoCost(c))})</button></div></div>`}
    ${row('Drehzahlgrenze', c.red, 20000, fmtNum(c.red) + ' U/min', 'var(--yellow)')}
    ${row('Gewicht', 700 - c.weight, 650, c.weight + ' kg', 'var(--sky)')}
    ${row('Verbrauch', 25 - c.cons, 22, c.cons.toFixed(1) + (c.isEV ? ' kWh' : ' l') + '/100*', 'var(--lime)')}
    ${row('Zuverlässigk.', c.rel, 100, c.rel, 'var(--lime)')}
    <div class="stat"><span>Getriebe</span><span>${c.isEV ? '1-Gang (E-Antrieb)' : c.gears + ' Gänge'}</span><span>Achse ${c.final}</span></div>
    <div class="stat"><span>Schaltzeit</span><span></span><span>${c.shiftTime.toFixed(2)} s</span></div>
    ${c.nos ? `<div class="stat"><span>NOS</span><span>+${Math.round(c.nos.mul * 100)} % für ${c.nos.dur} s</span><span></span></div>` : ''}
    <div class="stat"><span>Kosten</span><span></span><span class="bad">${fmtMoney(c.cost)}</span></div>
    <div class="hint">* Verbrauch bei 1300 kg – im Auto hängt er vom Gewicht ab.</div>`;
}
function drawEngineCurve() {
  const cv = $('#curvecv'); if (!cv) return;
  const ctx = hdCtx(cv), W = cv._lw, H = cv._lh, c = computeEngine(S.engDraft);
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(0, 0, W, H);
  if (!dynoKnown(c.key)) { cxText(ctx, '? ? ?', W / 2, H / 2 - 8, '#566c86', 3, 'c'); cxText(ctx, 'LEISTUNGSKURVE NACH DEM DYNO', W / 2, H - 10, '#566c86', 1, 'c'); return; }
  for (let x = 0; x < W; x += 16) { ctx.fillStyle = '#1a1c2c'; ctx.fillRect(x, 0, 1, H); }
  let maxP = 0; for (let x = 0; x < W; x++) { const rpm = (x + 1) / W * c.red; maxP = Math.max(maxP, c.torque(rpm) * rpm); }
  for (let x = 0; x < W; x++) {
    const rpm = (x + 1) / W * c.red;
    const tq = c.torque(rpm) / c.nm, p = c.torque(rpm) * rpm / maxP;
    ctx.fillStyle = '#ef7d57'; ctx.fillRect(x, Math.round(H - 6 - tq * (H - 14)), 1, 2);
    ctx.fillStyle = '#ffcd75'; ctx.fillRect(x, Math.round(H - 6 - p * (H - 14)), 1, 2);
  }
  ctx.fillStyle = '#b13e53'; ctx.fillRect(Math.round(W * 0.86), 0, Math.round(W * 0.14), 3);
  cxText(ctx, 'NM', 3, 3, '#ef7d57'); cxText(ctx, 'PS', 16, 3, '#ffcd75');
  cxText(ctx, fmtNum(c.red) + ' U/MIN', W - 3, H - 6, '#94b0c2', 1, 'r');
}
TABS.engine = {
  title: 'Motor-Designer', icon: 'engine',
  render(el) {
    fixEngineDraft();
    const e = S.engDraft, T = ENGINE_TYPES[e.type], c = computeEngine(e), isEV = e.type === 'ev';
    const existing = e.id && S.engines.find(x => x.id === e.id);
    const mg = maxGears();
    el.innerHTML = `
    <h2 class="title">${ico('engine', 'big')} Motor-Designer</h2>
    <div class="row">
      <div class="col" style="flex:1 1 470px">
        <div class="panel dark" style="padding:6px;overflow:hidden"><canvas id="enginecv" width="192" height="108" class="cv"></canvas></div>
        ${revPanelHTML('engine')}
        <div class="panel">
          <div class="flex"><span class="lbl" style="margin:0">Motorname</span><input type="text" maxlength="24" value="${esc(e.name)}" data-inp="ename" style="flex:1;min-width:140px"></div>
          <div class="flex" style="margin-top:6px">
            ${existing ? `<button class="btn green" data-act="esave" data-v="upd">Motor aktualisieren</button>` : ''}
            <button class="btn ${existing ? 'gray' : 'green'}" data-act="esave" data-v="new">Als neuen Motor speichern</button>
            <button class="btn yellow" data-act="euse">Im Auto verwenden</button>
            <button class="btn dark" data-act="enew">Neuer Motor</button>
          </div>
          ${existing ? `<div class="hint">Achtung: Aktualisieren ändert alle Modelle mit diesem Motor.</div>` : ''}
        </div>
        <div class="panel"><h3>${ico('market')}Motorwerte</h3><div id="estats">${engineStatsHTML(c)}</div>
          <div class="lbl">Leistungskurve</div><canvas id="curvecv" width="192" height="56" class="cv"></canvas></div>
      </div>
      <div class="col" style="flex:1 1 340px">
        <div class="panel"><h3>${ico('engine')}Motortyp</h3>
          ${optBtns('eset', 'type', Object.entries(ENGINE_TYPES).map(([k, t]) => [k, t.name, t.tech]), e.type)}
          <div class="lbl">${isEV ? 'Batterie' : 'Hubraum'}: <span id="lbl-edisp">${engRangeLabel('disp', e.disp)}</span></div>
          <input type="range" min="${T.dmin}" max="${T.dmax}" step="${isEV ? 5 : 0.1}" value="${e.disp}" data-inp="erange" data-k="disp">
          ${isEV ? `<div class="lbl">E-Motoren</div>${optBtns('eset', 'motors', [1, 2, 3, 4].map(n => [n, n + ' Motor' + (n > 1 ? 'en' : ''), n > 2 ? 'eng_evmulti' : null]), e.motors, 'n')}` : ''}
        </div>
        ${isEV ? '' : `<div class="panel"><h3>${ico('fire')}Aufladung & Material</h3>
          <div class="lbl">Aufladung</div>${optBtns('eset', 'ind', Object.entries(INDUCTIONS).map(([k, t]) => [k, t.name, t.tech]), e.ind)}
          <div class="lbl">Material</div>${optBtns('eset', 'mat', Object.entries(MATERIALS).map(([k, t]) => [k, t.name, t.tech]), e.mat)}
          <div class="lbl">Auspuff</div>${optBtns('eset', 'exh', Object.entries(EXHAUSTS).map(([k, t]) => [k, t.name, t.tech]), e.exh)}
          <div class="lbl">NOS-System</div>${optBtns('eset', 'nos', Object.entries(NOS_TYPES).map(([k, t]) => [k, t.name, t.tech]), e.nos)}
        </div>`}
        ${isEV ? `<div class="panel"><h3>${ico('wrench')}Material</h3>${optBtns('eset', 'mat', Object.entries(MATERIALS).map(([k, t]) => [k, t.name, t.tech]), e.mat)}<div class="hint">Beim E-Antrieb beeinflusst das Material nur Kosten und Look.</div></div>` : ''}
        <div class="panel"><h3>${ico('wrench')}Getriebe</h3>
          ${isEV ? '<div class="hint">E-Autos haben ein 1-Gang-Getriebe – kein Schalten nötig.</div>' : `
          <div class="lbl">Gangzahl: <span id="lbl-egears">${engRangeLabel('gears', e.gears)}</span></div>
          <input type="range" min="4" max="${mg}" step="1" value="${e.gears}" data-inp="erange" data-k="gears">
          ${mg < 8 ? `<div class="hint">${ico('lock')} Mehr Gänge: ${techLabel(mg < 6 ? 'tun_gear6' : 'tun_gear8')}</div>` : ''}`}
          <div class="lbl">Übersetzung</div>${optBtns('eset', 'ratio', Object.entries(RATIOS).map(([k, r]) => [k, r.name]), e.ratio)}
          <div class="hint">Kurz = schnellere Beschleunigung, Lang = höhere Endgeschwindigkeit.</div>
        </div>
        <div class="panel"><h3>${ico('list')}Gespeicherte Motoren</h3>
          <table class="t"><tr><th>Name</th><th>Typ</th><th>PS</th><th></th></tr>
          ${S.engines.map(x => { const cc = computeEngine(x); const used = S.models.filter(m => m.engineId === x.id).length;
            return `<tr><td>${esc(x.name)}${used ? ` <span class="tag">${used}× genutzt</span>` : ''}</td><td>${ENGINE_TYPES[x.type].name}</td><td>${dynoKnown(cc.key) ? cc.ps : `<button class="btn sm yellow" data-act="dynoRun" data-v="${x.id}">Dyno</button>`}</td>
            <td><button class="btn sm" data-act="eload" data-v="${x.id}">Laden</button><button class="btn sm red" data-act="edel" data-v="${x.id}">X</button></td></tr>`; }).join('')}
          </table>
        </div>
        ${cratePanelHTML()}
      </div>
    </div>`;
    drawEngineCurve();
  },
  tick(dt, t) { const cv = $('#enginecv'); if (cv && every('engine', REV.on ? 40 : 24)) drawEngineBay(hdCtx(cv), revSource('engine') || S.engDraft, revShownDesign('engine').color, t); }
};
