/* =============================================================================
   Teil 9e: Drag-Liga – Saisons mit 6 Rennen, Punktetabelle, Pokale, Sponsoren
   Jede Woche ein Ligarennen. Gewertet wird deine Gesamtzeit (Reaktion + Fahrzeit)
   gegen alle Fahrer der Liga. Top 2 steigen auf, Top 3 bekommen Pokal & Sponsor.
   ============================================================================= */
ICONS.cup = ['k.kkkk.k', 'kykyyyky', 'kkyyyykk', '.kyyyyk.', '..kyyk..', '...kk...', '..kyyk..', '.kkkkkk.'];
const LEAGUE_TIERS = [
  { name: 'Amateur-Liga',  lvl: 1,  opps: ['rookie', 'street'],        prize: 20000,   sponsor: 400,   xp: 60 },
  { name: 'Pro-Liga',      lvl: 8,  opps: ['street', 'pro'],           prize: 120000,  sponsor: 2500,  xp: 160 },
  { name: 'Elite-Liga',    lvl: 15, opps: ['pro', 'legend'],           prize: 500000,  sponsor: 10000, xp: 400 },
  { name: 'Legenden-Liga', lvl: 22, opps: ['legend', 'boss', 'king'],  prize: 2500000, sponsor: 45000, xp: 1000 }
];
const LEAGUE_NAMES = ['Nina „Nitro“ Brandt', 'Jo Kawa', 'Mika Sturm', 'Dario Vento', 'Lea Blitz', 'Kenji Hara', 'Toni Zünder', 'Sam Rakete', 'Rita Rauch', 'Oskar Vollgas', 'Yuki Funke', 'Ben Kolben'];
const SPONSORS = ['PixelOil', 'Turbox Energy', 'Nitro Cola', 'GripMax Reifen', 'Voltwerk', 'Rakete Versicherung'];
const ROUNDS = 6, LPOINTS = [25, 18, 15, 12, 10, 8], LPRIZE = [1, 0.6, 0.4, 0.25, 0.15, 0.1];
const LTRACKS = ['sunset', 'desert', 'night', 'airfield', 'harbor', 'alpine', 'volcano'];

function newSeasonDrivers(tier) {
  const T = LEAGUE_TIERS[tier], names = LEAGUE_NAMES.slice().sort(() => Math.random() - 0.5);
  return names.slice(0, 5).map((name, i) => {
    const o = OPPONENTS.find(x => x.id === T.opps[i % T.opps.length]);
    return { name, opp: o.id, color: pick(PAINT_COLORS), color2: pick(PAINT_COLORS), num: randi(2, 99), skill: clamp(o.skill + rand(-0.15, 0.08), 0.2, 0.98), pts: 0 };
  });
}
function ensureLeague() {
  if (!S.league) S.league = { tier: 0, season: 1, round: 0, next: 0, me: 0, drivers: newSeasonDrivers(0), trophies: [], log: [] };
  return S.league;
}
/** Auto eines Ligafahrers (Gegner-Auto in eigener Lackierung) */
function leagueCar(dr) {
  const o = OPPONENTS.find(x => x.id === dr.opp);
  const d = Object.assign(clone(o.design), { color: dr.color, color2: dr.color2, number: dr.num, name: dr.name });
  return { design: d, engine: o.engine, brand: o.brand, react: o.react };
}
const leagueTrack = L => { const ok = LTRACKS.filter(t => S.level >= (TRACKS[t].lvl || 1)); return ok[(L.season * 3 + L.round) % ok.length]; };
const leagueOpp = L => L.drivers[L.round % L.drivers.length];

ACTIONS.lgstart = () => {
  const L = ensureLeague();
  if (S.day < L.next) { toast(`Das nächste Ligarennen ist am ${fmtDate(L.next)}.`, 'bad'); return; }
  const me = raceEntry(RSEL.modelId); if (!me) { toast('Wähle ein Auto.', 'bad'); return; }
  const dr = leagueOpp(L), c = leagueCar(dr);
  startRace({
    player: { design: me.design, engine: me.engine, name: me.name, brand: me.brand, blowAt: me.risk && Math.random() < me.risk ? rand(1.2, 7) : null, salvageId: me.salvage ? me.id : null },
    opp: { design: c.design, engine: c.engine, name: dr.name, brand: c.brand, react: c.react, skill: dr.skill },
    dist: 'quarter', prize: 0, xp: LEAGUE_TIERS[L.tier].xp, rep: 1, fee: 0, league: true, track: leagueTrack(L), tod: RSEL.tod
  });
};
INPUTS.lgcar = el => { RSEL.modelId = el.value; rerender(); };

/** nach einem Ligarennen: Gesamtwertung aller Fahrer berechnen (aus showRaceResult aufgerufen) */
function leagueAfterRace(cfg, p, o) {
  const L = ensureLeague(), opp = leagueOpp(L);
  const total = (rec, foul) => (foul || !rec.et) ? 99 : (rec.react || 0) + rec.et;
  const res = [{ who: 'me', t: total(p, p.foul || p.blown) }];
  for (const dr of L.drivers) {
    if (dr === opp) { res.push({ who: dr, t: total(o, o.foul) }); continue; }
    const c = leagueCar(dr), car = computeCar(c.design, c.engine);
    res.push({ who: dr, t: car.t14 * (1 + rand(0.005, 0.02 + (1 - dr.skill) * 0.08)) + rand(c.react[0], c.react[1]) });
  }
  res.sort((a, b) => a.t - b.t);
  res.forEach((r, i) => { if (r.who === 'me') L.me += LPOINTS[i]; else r.who.pts += LPOINTS[i]; });
  const place = res.findIndex(r => r.who === 'me') + 1;
  L.log.unshift({ season: L.season, round: L.round + 1, place, track: cfg.track }); if (L.log.length > 12) L.log.pop();
  L.round++; L.next = S.day + 7;
  let txt = `<div class="card"><b>${ico('cup')} Ligarennen ${L.round}/${ROUNDS}: Platz ${place} von 6</b> – +${LPOINTS[place - 1]} Punkte<div class="hint">Gewertet: Reaktion + Fahrzeit aller 6 Fahrer.</div></div>`;
  if (L.round >= ROUNDS) setTimeout(leagueSeasonEnd, 400);
  return txt;
}
function leagueTable(L) {
  return [{ name: S.company + ' (Du)', me: true, pts: L.me }, ...L.drivers.map(d => ({ name: d.name, pts: d.pts, d }))].sort((a, b) => b.pts - a.pts);
}
function leagueSeasonEnd() {
  const L = ensureLeague(), T = LEAGUE_TIERS[L.tier], tab = leagueTable(L);
  const place = tab.findIndex(r => r.me) + 1, prize = Math.round(T.prize * LPRIZE[place - 1]);
  S.money += prize; addXP(T.xp * (7 - place)); addRep([5, 3, 2, 1, 0, 0][place - 1]);
  let extra = '';
  if (place <= 3) {
    L.trophies.push({ season: L.season, tier: L.tier, place });
    S.gems = (S.gems || 0) + [30, 20, 10][place - 1];
    extra += `<p>${ico('gem')} +${[30, 20, 10][place - 1]} Diamanten</p>`;
    const sp = pick(SPONSORS), per = Math.round(T.sponsor * [1, 0.6, 0.35][place - 1]);
    S.sponsor = { name: sp, perDay: per, until: S.day + 90 };
    extra += `<p>${ico('money')} Neuer Sponsor: <b>${sp}</b> zahlt dir <b>${fmtMoney(per)} pro Tag</b> für 90 Tage!</p>`;
  }
  const up = place <= 2 && L.tier < LEAGUE_TIERS.length - 1;
  if (up && S.level >= LEAGUE_TIERS[L.tier + 1].lvl) { L.tier++; extra += `<p class="good">${ico('star')} <b>Aufstieg in die ${LEAGUE_TIERS[L.tier].name}!</b></p>`; }
  else if (up) extra += `<p class="warn">Aufstieg in die ${LEAGUE_TIERS[L.tier + 1].name} ab Level ${LEAGUE_TIERS[L.tier + 1].lvl}.</p>`;
  openModal(`<h2 class="title">${ico('cup', 'big')} Saison ${L.season} beendet – Platz ${place}!</h2>
    <canvas id="podiumcv" width="200" height="70" class="cv" style="max-width:420px;margin:0 auto 10px;display:block"></canvas>
    <table class="t"><tr><th>#</th><th>Fahrer</th><th>Punkte</th></tr>${tab.map((r, i) => `<tr><td>${i + 1}</td><td>${r.me ? '<b>' + esc(r.name) + '</b>' : esc(r.name)}</td><td>${r.pts}</td></tr>`).join('')}</table>
    <p style="margin-top:8px">Preisgeld: <b class="good">${fmtMoney(prize)}</b></p>${extra}
    <button class="btn green" data-act="close">Neue Saison starten</button>`, true);
  drawPodium($('#podiumcv'), tab);
  sfx(place <= 3 ? 'level' : 'good');
  L.season++; L.round = 0; L.me = 0; L.drivers = newSeasonDrivers(L.tier); L.next = S.day + 3;
  checkAchievements(); saveGame();
}
/** Siegertreppchen mit Pixel-Pokalen */
function drawPodium(cv, tab) {
  if (!cv) return;
  const ctx = hdCtx(cv);
  ctx.fillStyle = '#1a1c2c'; ctx.fillRect(0, 0, 200, 70);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = ['#ffcd75', '#a7f070', '#73eff7', '#ef7d57'][i % 4]; ctx.fillRect(Math.floor(hash2(i, 1) * 200), Math.floor(hash2(i, 2) * 40), 2, 1); }
  const steps = [[80, 30, 40, 1], [40, 40, 40, 2], [120, 46, 40, 3]];
  for (const [x, y, w, p] of steps) {
    ctx.fillStyle = '#566c86'; ctx.fillRect(x, y, w, 70 - y); ctx.fillStyle = '#94b0c2'; ctx.fillRect(x, y, w, 2);
    cxText(ctx, String(p), x + w / 2, y + 6, '#1a1c2c', 2, 'c');
    const r = tab[p - 1];
    cxText(ctx, (r.me ? 'DU' : r.name.split(' ')[0]).toUpperCase().slice(0, 9), x + w / 2, y - 8, r.me ? '#ffcd75' : '#f4f4f4', 1, 'c');
    drawTrophy(ctx, x + w / 2 - 5, y - 22, p);
  }
}
function drawTrophy(ctx, x, y, place) {
  const c = ['#ffcd75', '#c8ccd4', '#d48a3c'][place - 1] || '#566c86', d = shadeHex(c, -0.35);
  ctx.fillStyle = c; ctx.fillRect(x, y, 10, 6); ctx.fillRect(x + 1, y + 6, 8, 2); ctx.fillRect(x + 4, y + 8, 2, 3); ctx.fillRect(x + 2, y + 11, 6, 2);
  ctx.fillStyle = d; ctx.fillRect(x - 2, y + 1, 2, 3); ctx.fillRect(x + 10, y + 1, 2, 3); ctx.fillRect(x + 7, y + 1, 2, 6);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 2, y + 1, 1, 3);
}
/** Tageswechsel: Sponsorgeld */
function leagueDay() {
  if (S.sponsor && S.sponsor.until > S.day) S.money += S.sponsor.perDay;
  else if (S.sponsor) { toast(`Sponsorvertrag mit ${S.sponsor.name} ist ausgelaufen.`); S.sponsor = null; }
}

TABS.league = {
  title: 'Drag-Liga', icon: 'cup',
  render(el) {
    const L = ensureLeague(), T = LEAGUE_TIERS[L.tier], tab = leagueTable(L);
    if (!raceEntry(RSEL.modelId)) RSEL.modelId = S.models[0].id;
    const me = raceEntry(RSEL.modelId), dr = leagueOpp(L), c = leagueCar(dr), oc = computeCar(c.design, c.engine), trk = leagueTrack(L);
    const ready = S.day >= L.next;
    el.innerHTML = `<h2 class="title">${ico('cup', 'big')} Drag-Liga – ${T.name}</h2>
    <div class="row">
      <div class="col">
        <div class="panel"><h3>${ico('race')}Saison ${L.season} · Rennen ${Math.min(L.round + 1, ROUNDS)}/${ROUNDS}</h3>
          <div class="card"><div class="flex"><img src="${carThumbURL(c.design, c.brand)}" style="width:150px;image-rendering:pixelated;background:#22263a">
            <div style="flex:1"><b>Gegner: ${esc(dr.name)}</b><div class="hint" style="margin:0">${c.brand} · ${oc.ps} PS · ca. ${oc.t14.toFixed(2)} s</div>
            <div><span class="tag y">${TRACKS[trk].name}</span><span class="tag">1/4 Meile</span>${TRACKS[trk].grip ? `<span class="tag r">Grip ${Math.round(TRACKS[trk].grip * 100)} %</span>` : ''}</div></div></div></div>
          <div class="lbl">Dein Auto</div><select data-inp="lgcar" style="width:100%">${raceOptions(RSEL.modelId)}</select>
          <div class="hint">Dein Auto: ${me.car.ps} PS · ca. ${me.car.t14.toFixed(2)} s (perfekt gefahren). Tipp: In der Tuning-Werkstatt holst du mehr raus!</div>
          ${ready ? `<button class="btn green big" data-act="lgstart">Ligarennen starten</button>` : `<button class="btn lock big" data-act="lgstart" data-why="Nächstes Rennen am ${fmtDate(L.next)}">Nächstes Rennen am ${fmtDate(L.next)}</button>`}
          <div class="hint">Jede Woche ein Rennen. Gewertet wird deine Gesamtzeit (Reaktion + Fahrzeit) gegen alle 6 Fahrer. Punkte: ${LPOINTS.join(' / ')}.</div>
        </div>
        <div class="panel"><h3>${ico('list')}Tabelle</h3>
          <table class="t"><tr><th>#</th><th>Fahrer</th><th>Auto</th><th>Punkte</th></tr>
          ${tab.map((r, i) => `<tr style="${r.me ? 'background:rgba(255,205,117,.15)' : ''}"><td>${i + 1}</td><td>${r.me ? '<b>' + esc(r.name) + '</b>' : esc(r.name)}</td><td class="muted">${r.me ? esc(me.name) : OPPONENTS.find(o => o.id === r.d.opp).brand}</td><td><b>${r.pts}</b></td></tr>`).join('')}</table>
          ${L.log.length ? `<div class="lbl">Letzte Rennen</div>${L.log.slice(0, 4).map(l => `<span class="tag ${l.place <= 3 ? 'g' : ''}">S${l.season} R${l.round}: Platz ${l.place}</span>`).join('')}` : ''}
        </div>
      </div>
      <div class="col">
        <div class="panel"><h3>${ico('cup')}Pokalvitrine (${L.trophies.length})</h3><canvas id="trophycv" width="200" height="56" class="cv"></canvas></div>
        <div class="panel"><h3>${ico('money')}Sponsor</h3>${S.sponsor && S.sponsor.until > S.day ? `<div><b>${S.sponsor.name}</b> zahlt <b class="good">${fmtMoney(S.sponsor.perDay)}/Tag</b> – noch ${S.sponsor.until - S.day} Tage</div>` : '<div class="muted">Kein Sponsor. Werde Top 3 einer Saison!</div>'}</div>
        <div class="panel"><h3>${ico('star')}Ligen</h3>
          ${LEAGUE_TIERS.map((t, i) => `<div class="card ${S.level < t.lvl ? 'locked' : ''}" style="${i === L.tier ? 'box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--yellow)' : ''}"><div class="flex"><b>${t.name}</b><span class="sp"></span><span class="tag">ab Level ${t.lvl}</span></div>
            <div class="hint" style="margin:0">Saison-Preisgeld bis ${fmtMoney(t.prize)} · Sponsor bis ${fmtMoney(t.sponsor)}/Tag${i === L.tier ? ' · <span class="warn">aktuelle Liga</span>' : ''}</div></div>`).join('')}
          <div class="hint">Top 2 steigen auf (wenn dein Level reicht). Top 3 bekommen einen Pokal und einen Sponsor.</div>
        </div>
      </div>
    </div>`;
    drawTrophyCase();
  }
};
function drawTrophyCase() {
  const cv = $('#trophycv'); if (!cv) return;
  const ctx = hdCtx(cv), L = ensureLeague();
  ctx.fillStyle = '#29200e'; ctx.fillRect(0, 0, 200, 56);
  for (let y = 26; y < 56; y += 27) { ctx.fillStyle = '#5a3a28'; ctx.fillRect(0, y, 200, 3); ctx.fillStyle = '#8a5a3c'; ctx.fillRect(0, y, 200, 1); }
  if (!L.trophies.length) { cxText(ctx, 'NOCH LEER', 100, 10, '#8a5a3c', 1, 'c'); return; }
  L.trophies.slice(-16).forEach((tr, i) => { const x = 8 + (i % 8) * 24, y = 10 + Math.floor(i / 8) * 27; drawTrophy(ctx, x, y, tr.place); cxText(ctx, ['A', 'P', 'E', 'L'][tr.tier] + tr.season, x + 5, y - 8 + 0, '#94b0c2', 1, 'c'); });
}
