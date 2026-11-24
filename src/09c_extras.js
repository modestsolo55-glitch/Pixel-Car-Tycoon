/* =============================================================================
   Teil 9c: Soundeffekte, Bankkredit, Ziele (Missionen als roter Faden)
   ============================================================================= */

// ---------- Soundeffekte (WebAudio, alles synthetisch) ----------
const SFX = { on: true };
try { SFX.on = localStorage.getItem('at_sfx') !== '0'; } catch (e) { /* Standard: an */ }
function sfxCtx() {
  try { AUD = AUD || new (window.AudioContext || window.webkitAudioContext)(); if (AUD.state === 'suspended') AUD.resume(); return AUD; } catch (e) { return null; }
}
/** einzelner Pixel-Ton: Frequenz, Dauer, Wellenform, Lautstärke, Startversatz, Zielfrequenz */
function tone(f, dur, type = 'square', vol = 0.04, at = 0, f2 = null) {
  const ac = sfxCtx(); if (!ac) return;
  const t0 = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfx(kind) {
  if (!SFX.on) return;
  switch (kind) {
    case 'click': tone(660, 0.04, 'square', 0.025); break;
    case 'good': tone(523, 0.08, 'square', 0.03); tone(784, 0.12, 'square', 0.03, 0.07); break;
    case 'bad': tone(220, 0.18, 'sawtooth', 0.03, 0, 110); break;
    case 'cash': tone(988, 0.06, 'square', 0.03); tone(1319, 0.14, 'square', 0.03, 0.06); break;
    case 'level': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.035, i * 0.09)); break;
    case 'goal': [659, 784, 988].forEach((f, i) => tone(f, 0.12, 'triangle', 0.05, i * 0.08)); break;
    case 'buy': tone(392, 0.06, 'square', 0.03); tone(523, 0.1, 'square', 0.03, 0.05); break;
  }
}
ACTIONS.sfxToggle = () => {
  SFX.on = !SFX.on;
  try { localStorage.setItem('at_sfx', SFX.on ? '1' : '0'); } catch (e) { /* egal */ }
  const b = $('#tb-sfx'); if (b) { b.textContent = SFX.on ? 'TON AN' : 'TON AUS'; b.classList.toggle('on', SFX.on); }
  if (SFX.on) sfx('good');
};
function extraTopbarHTML() {
  return `<div class="chip" title="Diamanten – zum Shop" style="cursor:pointer" data-act="tab" data-v="shop">${ico('gem')}<span id="tb-gems"></span></div>
    <div class="chip" id="tb-goal" title="Aktuelles Ziel" style="cursor:pointer" data-act="tab" data-v="home">${ico('star')}<span id="tb-goaltxt"></span></div>${accountChipHTML()}`;
}

// ---------- Bankkredit ----------
const loanMax = () => 30000 + S.level * 25000 + S.factory.stage * 150000;
const loanStep = () => Math.max(10000, Math.round(loanMax() / 4 / 5000) * 5000);
const LOAN_RATE = 0.015;   // Zins pro Monat
ACTIONS.loanTake = () => {
  S.loan = S.loan || 0;
  const amt = Math.min(loanStep(), loanMax() - S.loan);
  if (amt <= 0) { toast('Die Bank gibt dir keinen weiteren Kredit.', 'bad'); return; }
  S.loan += amt; S.money += amt;
  toast(`${ico('money')} Kredit aufgenommen: <b>+${fmtMoney(amt)}</b> (Zins ${(LOAN_RATE * 100).toFixed(1)} %/Monat)`, 'good');
  rerender();
};
ACTIONS.loanPay = d => {
  if (!S.loan) return;
  const amt = Math.min(S.loan, d.v === 'all' ? S.loan : loanStep(), Math.max(0, Math.floor(S.money)));
  if (amt <= 0) { toast('Zu wenig Geld zum Tilgen.', 'bad'); return; }
  S.loan -= amt; S.money -= amt;
  toast(`${ico('money')} ${fmtMoney(amt)} getilgt.${S.loan ? '' : ' <b>Schuldenfrei!</b>'}`, 'good');
  rerender();
};
/** monatliche Zinsen (aus dem Tageswechsel aufgerufen) */
function loanMonthly() {
  if (!S.loan) return 0;
  const z = Math.round(S.loan * LOAN_RATE);
  S.money -= z;
  return z;
}
function bankPanelHTML() {
  const L = S.loan || 0, max = loanMax();
  return `<div class="panel"><h3>${ico('money')}Bank</h3>
    <div class="grid2"><div>Offener Kredit</div><div class="${L ? 'bad' : 'good'}">${fmtMoney(L)}</div>
      <div>Kreditrahmen</div><div>${fmtMoney(max)}</div><div>Zinsen / Monat</div><div>${fmtMoney(Math.round(L * LOAN_RATE))} (${(LOAN_RATE * 100).toFixed(1)} %)</div></div>
    <div class="pbar" style="margin:6px 2px"><i style="width:${Math.min(100, L / max * 100)}%;background:repeating-linear-gradient(90deg,var(--red) 0 6px,var(--orange) 6px 8px)"></i></div>
    <div class="flex"><button class="btn sm ${L < max ? 'yellow' : 'lock'}" data-act="loanTake" data-why="Kreditrahmen ausgeschöpft">Kredit +${fmtMoney(Math.min(loanStep(), Math.max(0, max - L)))}</button>
      ${L ? `<button class="btn sm green" data-act="loanPay">Tilgen ${fmtMoney(Math.min(L, loanStep()))}</button><button class="btn sm" data-act="loanPay" data-v="all">Alles tilgen</button>` : ''}</div>
    <div class="hint">Ein Kredit hilft beim schnellen Ausbau – aber die Zinsen kommen jeden Monat. Der Rahmen wächst mit Level und Fabrik.</div></div>`;
}

// ---------- Ziele (Missionen) ----------
const winsVs = id => (S.stats.beat && S.stats.beat[id]) || 0;
const clsModels = c => S.models.filter(m => BODIES[m.body].cls === c).length;
const GOALS = [
  { t: 'Starte die Produktion in der Fabrik', p: () => [S.stats.produced + (S.factory.lines.some(l => l.active) ? 1 : 0), 1], r: { money: 2000, xp: 60 } },
  { t: 'Verkaufe 5 Autos', p: () => [S.stats.sold, 5], r: { xp: 120 } },
  { t: 'Gewinne ein Drag Race', p: () => [S.stats.wins, 1], r: { money: 3000, xp: 80 } },
  { t: 'Erforsche eine Technologie', p: () => [S.techs.length, 1], r: { rp: 1 } },
  { t: 'Starte eine Werbekampagne', p: () => [Object.keys(S.stats.adsRun).length, 1], r: { money: 2500 } },
  { t: 'Entwickle ein eigenes Modell', p: () => [S.stats.designs, 1], r: { xp: 200 } },
  { t: 'Baue einen eigenen Motor', p: () => [S.engines.length - 1, 1], r: { money: 4000 } },
  { t: 'Kaufe einen Gebrauchtwagen am Schrottplatz', p: () => [S.salvage ? S.salvage.stats.bought : 0, 1], r: { xp: 150 } },
  { t: 'Erreiche Level 5', p: () => [S.level, 5], r: { rp: 1, money: 5000 } },
  { t: 'Baue die Garage zur Werkstatt aus', p: () => [S.factory.stage, 1], r: { money: 15000, xp: 200 } },
  { t: 'Schlage Street Sarah im Drag Race', p: () => [winsVs('street'), 1], r: { money: 8000, rp: 1 } },
  { t: 'Verkaufe 50 Autos', p: () => [S.stats.sold, 50], r: { rp: 2 } },
  { t: 'Habe 3 verschiedene Modelle', p: () => [S.models.length, 3], r: { money: 15000 } },
  { t: 'Erreiche Markenruf 35', p: () => [Math.floor(S.rep), 35], r: { xp: 400 } },
  { t: 'Fahre die 1/4 Meile unter 13 Sekunden', p: () => [S.stats.best14 && S.stats.best14 < 13 ? 1 : 0, 1], r: { money: 20000 } },
  { t: 'Entwickle ein Sportcoupé', p: () => [clsModels('sport'), 1], r: { rp: 1, xp: 400 } },
  { t: 'Baue eine Fabrik', p: () => [S.factory.stage, 2], r: { money: 60000, xp: 600 } },
  { t: 'Erreiche 25 % Marktanteil in einer Klasse', p: () => [Math.round(bestShare() * 100), 25], r: { rp: 2 } },
  { t: 'Schlage Pro Paolo', p: () => [winsVs('pro'), 1], r: { money: 50000, rp: 1 } },
  { t: 'Besitze $1 Mio', p: () => [Math.floor(S.money), 1e6], r: { rp: 2 } },
  { t: 'Verkaufe 500 Autos', p: () => [S.stats.sold, 500], r: { money: 150000 } },
  { t: 'Entwickle einen Supersportwagen', p: () => [clsModels('super'), 1], r: { rp: 2, xp: 1500 } },
  { t: 'Schlage Legende Lena', p: () => [winsVs('legend'), 1], r: { money: 200000, rp: 1 } },
  { t: 'Baue die Grossfabrik', p: () => [S.factory.stage, 3], r: { money: 300000, xp: 3000 } },
  { t: 'Fahre die 1/4 Meile unter 10 Sekunden', p: () => [S.stats.best14 && S.stats.best14 < 10 ? 1 : 0, 1], r: { rp: 3 } },
  { t: 'Schlage Boss Tanaka', p: () => [winsVs('boss'), 1], r: { money: 600000, rp: 2 } },
  { t: 'Baue die Megafabrik', p: () => [S.factory.stage, 4], r: { money: 1000000, xp: 8000 } },
  { t: 'Entwickle ein Hypercar', p: () => [clsModels('hyper'), 1], r: { rp: 3, xp: 6000 } },
  { t: 'Werde Marktführer bei den Hypercars (50 %)', p: () => [Math.round(classShare('hyper') * 100), 50], r: { money: 3000000 } },
  { t: 'Schlage den Drag King Kova', p: () => [winsVs('king'), 1], r: { money: 5000000, rp: 5 } }
];
function goalRewardText(r) {
  return [r.money ? fmtMoney(r.money) : '', r.xp ? r.xp + ' XP' : '', r.rp ? r.rp + ' FP' : ''].filter(Boolean).join(' · ');
}
/** prüft das aktuelle Ziel; wird bei jeder Erfolgsprüfung mit aufgerufen */
function checkGoals() {
  if (!S) return;
  S.goal = S.goal || 0;
  let guard = 0;
  while (S.goal < GOALS.length && guard++ < 5) {
    const G = GOALS[S.goal], [cur, max] = G.p();
    if (cur < max) break;
    S.goal++;
    if (G.r.money) S.money += G.r.money;
    if (G.r.rp) S.rp += G.r.rp;
    S.gems = (S.gems || 0) + 5;
    toast(`${ico('star', 'big')} <div><b>Ziel erreicht:</b> ${G.t}<br><span class="good">Belohnung: ${goalRewardText(G.r)}</span></div>`, 'good', 6000);
    sfx('goal');
    if (G.r.xp) addXP(G.r.xp);
    renderNav();
  }
  const txt = $('#tb-goaltxt');
  if (txt) {
    if (S.goal >= GOALS.length) txt.textContent = 'Alle Ziele erreicht!';
    else { const G = GOALS[S.goal], [c, m] = G.p(); txt.textContent = `${G.t} (${fmtShort(Math.min(c, m))}/${fmtShort(m)})`; }
  }
}
const fmtShort = v => v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + 'M' : v >= 1e4 ? Math.round(v / 1000) + 'k' : String(v);
function goalsPanelHTML() {
  S.goal = S.goal || 0;
  const list = GOALS.slice(Math.max(0, S.goal - 1), S.goal + 3);
  return `<div class="panel"><h3>${ico('star')}Ziele (${Math.min(S.goal, GOALS.length)}/${GOALS.length})</h3>
    ${list.map(G => {
      const i = GOALS.indexOf(G), done = i < S.goal, cur = i === S.goal, [c, m] = G.p();
      return `<div class="card" style="${cur ? 'box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--yellow)' : ''};${done ? 'opacity:.55' : ''}">
        <div class="flex">${ico(done ? 'check' : cur ? 'star' : 'lock')}<b style="color:${cur ? 'var(--yellow)' : 'var(--text)'}">${G.t}</b><span class="sp"></span><span class="tag g">${goalRewardText(G.r)}</span></div>
        ${cur ? `<div class="pbar" style="margin-top:5px"><i style="width:${clamp(c / m, 0, 1) * 100}%"></i><em>${fmtShort(Math.min(c, m))} / ${fmtShort(m)}</em></div>` : ''}</div>`;
    }).join('')}
    ${S.goal >= GOALS.length ? '<div class="good">Du hast alle Ziele erreicht – du bist eine Auto-Legende!</div>' : ''}</div>`;
}
