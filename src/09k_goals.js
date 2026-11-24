/* =============================================================================
   Teil 9k: Tägliche Herausforderungen, Prestige, Ruhmeshalle
   ============================================================================= */

// ---------- Tägliche Herausforderungen (3 pro echtem Tag) ----------
const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
function seededRand(seed) { let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const CHAL_TYPES = [
  { id: 'win',     make: (r, L) => ({ n: 2 + Math.floor(r() * 3) }),           txt: c => `Gewinne ${c.n} Drag Races` },
  { id: 'track',   make: (r, L) => { const ok = Object.keys(TRACKS).filter(k => L >= (TRACKS[k].lvl || 1)); return { n: 1, track: ok[Math.floor(r() * ok.length)] }; }, txt: c => `Gewinne ein Rennen auf „${TRACKS[c.track].name}“` },
  { id: 'launch',  make: (r, L) => ({ n: 2 + Math.floor(r() * 2) }),           txt: c => `Schaffe ${c.n} perfekte Starts` },
  { id: 'shift',   make: (r, L) => ({ n: 5 + Math.floor(r() * 6) }),           txt: c => `Schalte ${c.n}-mal perfekt` },
  { id: 'sell',    make: (r, L) => ({ n: Math.round(5 + L * 4 + r() * L * 3) }), txt: c => `Verkaufe ${c.n} Autos` },
  { id: 'react',   make: (r, L) => ({ n: 1, lim: 0.2 }),                       txt: c => `Reaktionszeit unter ${c.lim.toFixed(2)} s` },
  { id: 'ghost',   make: (r, L) => ({ n: 1 }),                                 txt: c => 'Stelle eine neue Streckenbestzeit auf' }
];
function dailyEnsure() {
  if (!S) return null;
  const k = todayKey();
  if (S.daily && S.daily.key === k) return S.daily;
  const r = seededRand(k + '|' + (AUTH_USER || '') + '|' + S.company), L = S.level;
  const pool = CHAL_TYPES.slice(), list = [];
  while (list.length < 3 && pool.length) {
    const T = pool.splice(Math.floor(r() * pool.length), 1)[0];
    list.push(Object.assign({ type: T.id, cur: 0, done: false, claimed: false, gems: 10 + Math.floor(r() * 3) * 5, money: Math.round(2000 * Math.pow(L, 1.35) / 500) * 500 }, T.make(r, L)));
  }
  S.daily = { key: k, list };
  return S.daily;
}
const chalText = c => CHAL_TYPES.find(t => t.id === c.type).txt(c);
const dailyOpen = () => { const D = S && S.daily; return !!(D && D.key === todayKey() && D.list.some(c => c.done && !c.claimed)); };
/** Fortschritt melden: chalEvent('race', {win, R}) | chalEvent('sell', n) */
function chalEvent(kind, data) {
  const D = dailyEnsure(); if (!D) return;
  let changed = false;
  for (const c of D.list) {
    if (c.done) continue;
    const before = c.cur;
    if (kind === 'sell' && c.type === 'sell') c.cur += data;
    if (kind === 'race') {
      const R = data.R, p = R.p;
      if (c.type === 'win' && data.win) c.cur++;
      if (c.type === 'track' && data.win && R.cfg.track === c.track) c.cur++;
      if (c.type === 'launch' && p.launchQ === 'perfect') c.cur++;
      if (c.type === 'shift') c.cur += p.shifts.filter(s => s === 'perfect').length;
      if (c.type === 'react' && !p.foul && p.react != null && p.react < c.lim) c.cur++;
      if (c.type === 'ghost' && R.ghostNew) c.cur++;
    }
    if (c.cur !== before) changed = true;
    if (c.cur >= c.n) { c.cur = c.n; c.done = true; toast(`${ico('star', 'big')} <div><b>Tages-Herausforderung geschafft!</b><br>${chalText(c)} – hol dir die Belohnung unter <b>Ziele</b>.</div>`, 'good', 5000); sfx('goal'); }
  }
  if (changed) renderNav();
}
ACTIONS.chalClaim = d => {
  const D = dailyEnsure(), c = D && D.list[+d.v]; if (!c || !c.done || c.claimed) return;
  c.claimed = true; S.gems = (S.gems || 0) + c.gems; S.money += c.money; sfx('buy');
  toast(`${ico('gem', 'big')} +${c.gems} Diamanten · +${fmtMoney(c.money)}`, 'good');
  renderNav(); rerender();
};
function dailyPanelHTML(compact) {
  const D = dailyEnsure(); if (!D) return '';
  const left = (() => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); const h = Math.floor((m - n) / 3600000), mi = Math.floor((m - n) / 60000) % 60; return `${h} h ${mi} min`; })();
  return `<div class="panel"><h3>${ico('date')}Tages-Herausforderungen <span class="hint" style="margin:0 0 0 auto;text-transform:none;letter-spacing:0">neu in ${left}</span></h3>
    ${D.list.map((c, i) => `<div class="card chal ${c.claimed ? 'claimed' : ''}">
      <div class="flex">${ico(c.claimed ? 'check' : c.done ? 'star' : 'race')}<b style="color:${c.done ? 'var(--lime)' : 'var(--text)'}">${chalText(c)}</b><span class="sp"></span>
        <span class="tag g">${c.gems} ${ico('gem')} · ${fmtMoney(c.money)}</span>
        ${c.done && !c.claimed ? `<button class="btn sm green pulse" data-act="chalClaim" data-v="${i}">Abholen!</button>` : ''}</div>
      ${!c.done && !compact ? `<div class="pbar" style="margin-top:5px"><i style="width:${c.cur / c.n * 100}%"></i><em>${c.cur} / ${c.n}</em></div>` : ''}
      ${!c.done && compact ? `<div class="hint" style="margin:2px 0 0">${c.cur} / ${c.n}</div>` : ''}</div>`).join('')}</div>`;
}

// ---------- Prestige: Neustart mit dauerhaftem Bonus ----------
const PRESTIGE_LVL = 25;
const prestigeMul = () => 1 + 0.1 * ((S && S.prestige) || 0);
ACTIONS.prestige = () => {
  if (S.level < PRESTIGE_LVL) return;
  confirmBox(`<b>Prestige-Neustart</b><br>Du beginnst eine neue Firma von vorne – dafür bekommst du dauerhaft <b>+10 % Verkaufserlös und +10 % XP</b> (stapelbar).<br><br>
    Du <b>behältst</b>: Diamanten, Premium-Autos, Bestzeiten/Geister, Erfolge und Prestige-Sterne.<br>Alles andere (Geld, Modelle, Fabrik, Forschung, Level) beginnt neu.`, () => {
    const keep = { gems: S.gems, premium: S.premium, ptune: S.ptune, ghosts: S.ghosts, ach: S.ach, prestige: (S.prestige || 0) + 1, hall: S.hall, company: S.company, ghostOn: S.ghostOn, show: S.show };
    newState(keep.company); Object.assign(S, keep); S.speed = 1; S.seenUnlock = [];
    if (S.show) { S.show.ends = S.day + SHOW_DAYS; S.show.npc = []; }
    _carCache.clear(); _spriteCache.clear(); _tbCache = '';
    renderTopbar(); setTab('home'); saveGame();
    toast(`${ico('star', 'big')} <div><b>Prestige ${'★'.repeat(S.prestige)}</b><br>Neustart mit +${S.prestige * 10} % Erlös und XP!</div>`, 'good', 7000);
  }, 'Neu starten');
};
function prestigePanelHTML() {
  const p = S.prestige || 0, ok = S.level >= PRESTIGE_LVL;
  return `<div class="panel"><h3>${ico('star')}Prestige ${p ? '<span class="good">' + '★'.repeat(p) + '</span>' : ''}</h3>
    ${p ? `<div class="good">Aktiver Bonus: +${p * 10} % Verkaufserlös und XP.</div>` : ''}
    <div class="hint" style="color:var(--text)">Ab Level ${PRESTIGE_LVL} kannst du neu anfangen und bekommst jedes Mal einen dauerhaften Bonus. Diamanten, Premium-Autos und Bestzeiten bleiben.</div>
    <button class="btn ${ok ? 'yellow' : 'lock'}" data-act="prestige" data-why="Erst ab Level ${PRESTIGE_LVL} (du bist Level ${S.level})">Prestige-Neustart${ok ? '' : ' (ab Lvl ' + PRESTIGE_LVL + ')'}</button></div>`;
}

// ---------- Ruhmeshalle ----------
function hallPanelHTML() {
  const g = S.ghosts || {};
  const rows = Object.entries(g).sort((a, b) => a[1].total - b[1].total).map(([k, v]) => {
    const [trk, dist] = k.split('|');
    return `<tr><td>${TRACKS[trk] ? TRACKS[trk].name : trk}</td><td>${distOf(dist).short}</td><td><b>${v.total.toFixed(3)} s</b></td><td>${esc(v.name || '')}</td></tr>`;
  }).join('');
  const fastest = S.models.map(m => ({ m, c: carOf(m) })).sort((a, b) => a.c.t14 - b.c.t14)[0];
  const best = S.models.slice().sort((a, b) => b.stat.sold - a.stat.sold)[0];
  const trophies = (S.league && S.league.trophies) || [];
  return `<div class="panel"><h3>${ico('trophy')}Ruhmeshalle</h3>
    <div class="row">
      ${fastest ? `<div class="card" style="flex:1 1 220px"><div class="tl">Schnellstes Modell</div><img src="${carThumbURL(fastest.m)}" class="hallcar"><b>${esc(fastest.m.name)}</b><div class="hint" style="margin:0">${fastest.c.ps} PS · 1/4 Meile ${fastest.c.t14.toFixed(2)} s</div></div>` : ''}
      ${best && best.stat.sold ? `<div class="card" style="flex:1 1 220px"><div class="tl">Meistverkauft</div><img src="${carThumbURL(best)}" class="hallcar"><b>${esc(best.name)}</b><div class="hint" style="margin:0">${fmtNum(best.stat.sold)} verkauft · ${fmtMoney(best.stat.rev)} Umsatz</div></div>` : ''}
      <div class="card" style="flex:1 1 180px"><div class="tl">Bilanz</div>
        <div class="grid2"><div>Siege</div><div>${S.stats.wins} / ${S.stats.races}</div><div>Bestzeit 1/4</div><div>${S.stats.best14 ? S.stats.best14.toFixed(3) + ' s' : '–'}</div>
        <div>Beste Reaktion</div><div>${S.stats.react ? S.stats.react.toFixed(3) + ' s' : '–'}</div><div>Liga-Pokale</div><div>${trophies.length ? trophies.map(t => ['🥇', '🥈', '🥉'][t.place - 1]).join('') : '–'}</div>
        <div>Autos verkauft</div><div>${fmtNum(S.stats.sold)}</div></div></div>
    </div>
    ${rows ? `<div class="lbl">Streckenrekorde (ab Grün)</div><table class="t"><tr><th>Strecke</th><th>Distanz</th><th>Zeit</th><th>Auto</th></tr>${rows}</table>` : '<div class="hint">Fahre Rennen, um Streckenrekorde aufzustellen.</div>'}
  </div>`;
}
