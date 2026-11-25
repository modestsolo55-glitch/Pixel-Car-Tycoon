/* =============================================================================
   Teil 9j: Vereinfachte Bedienung
   - Navigation in wenigen Gruppen mit Unter-Tabs (statt 15 Knöpfen)
   - Bereiche werden mit dem Level nach und nach freigeschaltet
   - Spiel-Menü (Speichern, Export/Import, Ton, Neues Spiel, Abmelden)
   - Neue, aufgeräumte Zentrale mit „Nächster Schritt“
   ============================================================================= */
ICONS.gear = ['...kk...', '.k.ww.k.', '.kwsswk.', 'kwsddswk', 'kwsddswk', '.kwsswk.', '.k.ww.k.', '...kk...'];
ICONS.menu = ['........', 'kkkkkkkk', 'wwwwwwww', '........', 'kkkkkkkk', 'wwwwwwww', '........', '........'];

const NAV = [
  { id: 'home',     title: 'Zentrale',     icon: 'home',     tabs: ['home'] },
  { id: 'garage',   title: 'Garage',       icon: 'car',      tabs: ['design', 'interior', 'engine', 'tuning'], sub: ['Karosserie', 'Innenraum', 'Motor', 'Tuning'] },
  { id: 'company',  title: 'Firma',        icon: 'factory',  tabs: ['factory', 'models', 'market'], sub: ['Fabrik', 'Modelle & Preise', 'Verkauf & Werbung'] },
  { id: 'research', title: 'Forschung',    icon: 'research', tabs: ['research'] },
  { id: 'racing',   title: 'Rennen',       icon: 'race',     tabs: ['race', 'career', 'league'], sub: ['Drag Race', 'Karriere', 'Liga'] },
  { id: 'show',     title: 'Autoshow',     icon: 'star',     tabs: ['show'] },
  { id: 'salvage',  title: 'Schrottplatz', icon: 'magnet',   tabs: ['salvage'] },
  { id: 'goals',    title: 'Ziele',        icon: 'trophy',   tabs: ['ach'] },
  { id: 'shop',     title: 'Shop',         icon: 'gem',      tabs: ['shop'] },
  { id: 'admin',    title: 'Admin',        icon: 'crown',    tabs: ['admin'], admin: true }
];
/** Ab welchem Level ein Bereich freigeschaltet ist (macht den Anfang übersichtlicher) */
const TAB_LVL = { salvage: 2, tuning: 3, league: 3 };
const TAB_NAME = { salvage: 'Schrottplatz', tuning: 'Tuning-Werkstatt', league: 'Drag-Liga' };
const tabLocked = id => !!(S && TAB_LVL[id] && S.level < TAB_LVL[id]);
const navOf = tab => NAV.find(n => n.tabs.includes(tab));
const _navMem = {};                                      // zuletzt besuchter Unter-Tab je Gruppe

function renderNavGrouped() {
  const nav = $('#nav'); if (!nav) return;
  const anyTech = S && TECHS.some(t => techState(t) === 'avail');
  const cur = navOf(curTab);
  nav.innerHTML = NAV.filter(n => !n.admin || isAdmin()).map(n => {
    const locked = n.tabs.every(tabLocked);
    const badge = (n.id === 'research' && anyTech) || (n.id === 'goals' && typeof dailyOpen === 'function' && dailyOpen()) ? '<span class="badge">!</span>' : '';
    if (locked) return `<button class="nlock" data-act="navGo" data-v="${n.id}" title="Ab Level ${TAB_LVL[n.tabs[0]]}">${ico('lock')}<span>${n.title}</span><span class="lv">Lvl ${TAB_LVL[n.tabs[0]]}</span></button>`;
    return `<button data-act="navGo" data-v="${n.id}" class="${cur === n ? 'on' : ''}">${ico(n.icon)}<span>${n.title}</span>${badge}</button>`;
  }).join('');
}
ACTIONS.navGo = d => {
  const n = NAV.find(x => x.id === d.v); if (!n) return;
  if (n.tabs.every(tabLocked)) { toast(`${ico('lock')} <b>${n.title}</b> wird ab <b>Level ${TAB_LVL[n.tabs[0]]}</b> freigeschaltet.`, 'bad'); return; }
  const t = _navMem[n.id] && !tabLocked(_navMem[n.id]) ? _navMem[n.id] : n.tabs.find(x => !tabLocked(x));
  setTab(t);
};
/** Unter-Tabs über dem Inhalt (z. B. Garage: Karosserie | Innenraum | Motor | Tuning) */
function subnavHTML() {
  const n = navOf(curTab); if (!n || !n.sub) return '';
  return `<div class="subnav">${n.tabs.map((t, i) => tabLocked(t)
    ? `<button class="lock" data-act="tab" data-v="${t}" data-why="${TAB_NAME[t] || n.sub[i]} gibt es ab Level ${TAB_LVL[t]}.">${ico('lock')}${n.sub[i]} <small>Lvl ${TAB_LVL[t]}</small></button>`
    : `<button class="${t === curTab ? 'on' : ''}" data-act="tab" data-v="${t}">${ico(TABS[t].icon)}${n.sub[i]}</button>`).join('')}</div>`;
}
/** Meldung, wenn mit einem Level-Aufstieg ein neuer Bereich dazukommt */
function unlockNotice() {
  if (!S) return;
  S.seenUnlock = S.seenUnlock || [];
  for (const [t, l] of Object.entries(TAB_LVL)) {
    if (S.level >= l && !S.seenUnlock.includes(t)) {
      S.seenUnlock.push(t);
      if (S.level > 1) toast(`${ico('star', 'big')} <div><b>Neu freigeschaltet:</b> ${TAB_NAME[t]}<br><span class="hint">Im Menü links.</span></div>`, 'good', 6000);
    }
  }
  renderNav();
}

// ---------- Spiel-Menü ----------
ACTIONS.gameMenu = () => {
  const u = currentAccount();
  openModal(`<h2 class="title">${ico('gear', 'big')} Spiel-Menü</h2>
    <div class="mgrid">
      <button class="btn green" data-act="saveNow">${ico('check')} Jetzt speichern</button>
      <button class="btn" data-act="exportSave">${ico('box')} Spielstand exportieren</button>
      <button class="btn" data-act="importSave">${ico('box')} Spielstand importieren</button>
      <button class="btn ${SFX.on ? 'yellow' : 'gray'}" data-act="sfxToggle2">${SFX.on ? 'Ton: AN' : 'Ton: AUS'}</button>
      <button class="btn" data-act="cinemaNow">${ico('star')} Kino-Modus starten</button>
      <button class="btn ${cinemaOn() ? 'yellow' : 'gray'}" data-act="cinemaToggle">Kino bei Pause: ${cinemaOn() ? 'AN' : 'AUS'}</button>
      <button class="btn" data-act="settings">${ico('gear')} Einstellungen</button>
      <button class="btn orange" data-act="newGame">Neues Spiel</button>
      ${u ? `<button class="btn red" data-act="logout">${u.guest ? 'Zum Startbildschirm (Konto erstellen)' : 'Abmelden (' + esc(u.name) + ')'}</button>` : ''}
    </div>
    <div class="hint">Automatisch gespeichert wird alle 15 Sekunden – aber nur in diesem Browser. Mit <b>Exportieren</b> bekommst du eine Datei als Sicherung, die du auch auf einem anderen Computer wieder <b>importieren</b> kannst.</div>
    <div class="hint">Tempo: Leertaste = Pause, Tasten 1 / 2 / 3 = 1x / 2x / 5x.</div>
    <div class="flex" style="margin-top:8px"><span class="sp"></span><button class="btn gray" data-act="close">Schliessen</button></div>
    <input type="file" id="imp-file" accept=".json,application/json" style="display:none">`, true);
  const f = $('#imp-file');
  if (f) f.addEventListener('change', () => { if (f.files && f.files[0]) importSaveFile(f.files[0]); });
};
ACTIONS.sfxToggle2 = () => { ACTIONS.sfxToggle(); ACTIONS.gameMenu(); };

// ---------- Export / Import ----------
ACTIONS.exportSave = () => {
  saveGame();
  const data = { game: 'AutoTycoon', format: 1, exported: new Date().toISOString(), user: AUTH_USER, state: S };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  const safe = String(S.company || 'spiel').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 30);
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  a.href = URL.createObjectURL(blob);
  a.download = `AutoTycoon_${safe}_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`${ico('check')} Spielstand als Datei gespeichert: <b>${a.download}</b>`, 'good', 6000);
};
ACTIONS.importSave = () => { const f = $('#imp-file'); if (f) f.click(); };
/** prüft eine Import-Datei und lädt sie nach Rückfrage */
function parseImport(text) {
  let d; try { d = JSON.parse(text); } catch (e) { return { err: 'Die Datei ist keine gültige Spielstand-Datei.' }; }
  const st = d && d.game === 'AutoTycoon' ? d.state : d;     // auch reine Spielstände annehmen
  if (!st || st.v !== 1 || !Array.isArray(st.models) || !st.factory) return { err: 'Diese Datei enthält keinen AutoTycoon-Spielstand.' };
  return { st, info: `${esc(st.company)} · Level ${st.level} · ${fmtMoney(st.money)}${d.exported ? ' · exportiert am ' + new Date(d.exported).toLocaleDateString('de-CH') : ''}` };
}
function importSaveFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    const r = parseImport(String(rd.result));
    if (r.err) { closeModal(); toast(r.err, 'bad', 5000); return; }
    confirmBox(`Spielstand laden?<br><b>${r.info}</b><br><span class="hint">Dein aktueller Spielstand wird dabei ersetzt. Tipp: Exportiere ihn vorher als Sicherung.</span>`, () => applyImport(r.st), 'Laden');
  };
  rd.readAsText(file);
}
function applyImport(st) {
  try { localStorage.setItem(curSaveKey(), JSON.stringify(st)); } catch (e) { toast('Speichern im Browser nicht möglich.', 'bad'); return; }
  const loaded = loadGame();
  if (!loaded) { toast('Der Spielstand konnte nicht geladen werden.', 'bad'); return; }
  S = loaded; _carCache.clear(); _spriteCache.clear(); _tbCache = '';
  renderTopbar(); setTab('home');
  toast(`${ico('check')} Spielstand <b>${esc(S.company)}</b> geladen.`, 'good', 5000);
}

// ---------- Zentrale (neu, aufgeräumt) ----------
/** wohin der Knopf beim aktuellen Ziel führt */
function goalTab(G) {
  const t = G.t;
  if (/Produktion|Fabrik|Garage zur|Grossfabrik|Megafabrik/.test(t)) return 'factory';
  if (/Drag Race|Schlage|Fahre|Level/.test(t)) return 'race';
  if (/Forsch/.test(t)) return 'research';
  if (/Motor/.test(t)) return 'engine';
  if (/Gebrauchtwagen/.test(t)) return tabLocked('salvage') ? 'race' : 'salvage';
  if (/Modell|Sportcoup|Supersport|Hypercar\b|Entwickle/.test(t)) return 'design';
  return 'market';
}
const TAB_LABEL = { factory: 'Zur Fabrik', race: 'Zum Drag Race', research: 'Zur Forschung', engine: 'Zum Motor-Designer', salvage: 'Zum Schrottplatz', design: 'Zum Auto-Designer', market: 'Zu Verkauf & Werbung' };

function homeRender(el) {
  const st = stockTotal(), mc = monthlyCost();
  const sold30 = S.models.reduce((a, m) => a + (m.stat.recent || []).reduce((x, y) => x + y, 0), 0);
  const tips = [];
  if (!S.factory.lines.some(l => l.active) && st === 0) tips.push(['Starte die <b>Produktion</b> deines Modells.', 'factory']);
  if (S.rp > 0 && TECHS.some(t => techState(t) === 'avail')) tips.push([`Du hast <b>${S.rp} Forschungspunkte</b> – schalte neue Technik frei!`, 'research']);
  if (st >= warehouseCap()) tips.push(['Dein <b>Lager ist voll</b>. Preis senken oder Werbung machen.', 'market']);
  if (S.money < 5000) tips.push(['Wenig Geld? Gewinne <b>Drag Races</b> gegen Rookie Rudi.', 'race']);
  if (!S.campaigns.length && S.money > 3000 && S.stats.sold > 0) tips.push(['Eine <b>Werbekampagne</b> erhöht die Nachfrage.', 'market']);
  const G = S.goal < GOALS.length ? GOALS[S.goal] : null;
  const gp = G ? G.p() : [1, 1], gt = G ? goalTab(G) : 'race';
  const tile = (icon, label, val, cls = '') => `<div class="tile">${ico(icon, 'big')}<div><div class="tl">${label}</div><div class="tv ${cls}">${val}</div></div></div>`;
  const mods = S.mods.filter(m => m.until > S.day), camp = S.campaigns;
  el.innerHTML = `
    <h2 class="title">${ico('home', 'big')} ${esc(S.company)}</h2>
    <div class="next">
      <div class="nl">${ico('star', 'big')}<div><div class="tl">NÄCHSTER SCHRITT</div>
        <div class="nt">${G ? G.t : 'Alle Ziele erreicht – du bist eine Auto-Legende!'}</div>
        ${G ? `<div class="pbar" style="margin-top:6px;max-width:360px"><i style="width:${clamp(gp[0] / gp[1], 0, 1) * 100}%"></i><em>${fmtShort(Math.min(gp[0], gp[1]))} / ${fmtShort(gp[1])}</em></div>
        <div class="hint">Belohnung: <span class="good">${goalRewardText(G.r)} · 5 Diamanten</span></div>` : ''}</div></div>
      ${G ? `<button class="btn green big" data-act="tab" data-v="${gt}">${TAB_LABEL[gt]} ›</button>` : ''}
    </div>
    <div class="tiles">
      ${tile('money', 'Kontostand', fmtMoney(S.money), S.money < 0 ? 'bad' : 'good')}
      ${tile('box', 'Lager', `${st} / ${warehouseCap()}`, st >= warehouseCap() ? 'bad' : '')}
      ${tile('market', 'Verkauft (30 Tage)', fmtNum(sold30))}
      ${tile('rep', 'Markenruf', Math.round(S.rep) + ' / 100')}
      ${tile('race', 'Rennen', `${S.stats.wins} Siege`)}
      ${tile('money', 'Kosten / Monat', '-' + fmtMoney(mc), 'bad')}
    </div>
    <div class="row">
      <div class="col">
        ${tips.length ? `<div class="panel"><h3>${ico('star')}Tipps</h3>${tips.map(([t, tab]) => `<div class="flex tip"><span>› ${t}</span><span class="sp"></span><button class="btn sm" data-act="tab" data-v="${tab}">Hin ›</button></div>`).join('')}</div>` : ''}
        ${typeof dailyPanelHTML === 'function' ? dailyPanelHTML(true) : ''}
        <div class="panel"><h3>${ico('money')}Kontostand (letzte Tage)</h3><canvas id="moneycv" width="240" height="60" class="cv"></canvas></div>
      </div>
      <div class="col">
        <details class="panel fold" ${camp.length || mods.length ? 'open' : ''}><summary><h3>${ico('ad')}Aktive Effekte (${camp.length + mods.length})</h3></summary>
          ${camp.length || mods.length ? '' : '<div class="muted">Keine aktiven Kampagnen oder Ereignisse.</div>'}
          ${camp.map(c => { const C0 = CAMPAIGNS.find(x => x.id === c.id); return `<div class="flex"><span class="tag g">Werbung</span>${C0.name}<span class="sp"></span><span class="muted">${c.until - S.day} Tage</span></div>`; }).join('')}
          ${mods.map(m => `<div class="flex"><span class="tag ${(m.mult || m.demand || m.sport || m.ev || m.fuel) > 0 && !m.cost && !(m.speed < 0) ? 'y' : 'r'}">Ereignis</span>${modLabel(m)}<span class="sp"></span><span class="muted">${m.until - S.day} Tage</span></div>`).join('')}
        </details>
        <details class="panel fold"><summary><h3>${ico('market')}Firmendetails</h3></summary>
          <div class="grid2">
            <div>Level</div><div>${S.level} (${S.xp}/${xpNeed(S.level)} XP)</div>
            <div>Fabrik</div><div>${STAGES[S.factory.stage].name} · ${S.factory.lines.length} Linie(n)</div>
            <div>Mitarbeiter</div><div>${staffCount()}</div>
            <div>Modelle</div><div>${S.models.length}</div>
            <div>Verkaufte Autos</div><div>${fmtNum(S.stats.sold)}</div>
            <div>Umsatz gesamt</div><div>${fmtMoney(S.stats.revenue)}</div>
            ${S.prestige ? `<div>Prestige</div><div class="good">${'★'.repeat(S.prestige)} (+${S.prestige * 10} %)</div>` : ''}
          </div></details>
        <details class="panel fold"><summary><h3>${ico('money')}Bank & Kredit</h3></summary>${bankPanelHTML().replace(/^<div class="panel"><h3>.*?<\/h3>/, '<div>')}</details>
        <details class="panel fold"><summary><h3>${ico('list')}Ereignis-Logbuch</h3></summary>
          ${S.log.length ? S.log.slice(0, 8).map(l => `<div style="margin-bottom:6px"><span class="tag">${fmtDate(l.day)}</span> <b>${l.title}</b><div class="hint">${l.text}</div></div>`).join('') : '<div class="muted">Noch keine Ereignisse.</div>'}
        </details>
      </div>
    </div>`;
  drawMoneyChart();
}
