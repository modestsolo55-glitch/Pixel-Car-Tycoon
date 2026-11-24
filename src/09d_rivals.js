/* =============================================================================
   Teil 9d: Konkurrenzfirmen & Marktanteile
   Vier KI-Hersteller entwickeln ihre Autos laufend weiter. Je besser dein Auto
   im Vergleich zum besten Konkurrenten seiner Klasse, desto mehr verkaufst du.
   ============================================================================= */
const RIVALS = [
  { id: 'vortek',    name: 'Vortek Motors',     color: '#ef7d57', focus: { small: 1.12, family: 1.0, suv: 0.9, sport: 0.8, super: 0.55, hyper: 0.4 }, models: ['Pico', 'Strada', 'Terra', 'Furia', 'Saetta', 'Zenith'] },
  { id: 'kessler',   name: 'Kessler AG',        color: '#41a6f6', focus: { small: 0.85, family: 1.15, suv: 1.12, sport: 0.9, super: 0.7, hyper: 0.55 }, models: ['Mini', 'Kombi K5', 'Gelande X', 'Rapido', 'Blitz GT', 'Omega'] },
  { id: 'raijin',    name: 'Raijin Industries', color: '#a7f070', focus: { small: 0.95, family: 0.8, suv: 0.85, sport: 1.2, super: 1.1, hyper: 0.85 }, models: ['Kei', 'Sedan R', 'Yama', 'Kaze', 'Raiden', 'Tenkai'] },
  { id: 'stellmark', name: 'Stellmark',         color: '#c040a0', focus: { small: 0.35, family: 0.6, suv: 0.95, sport: 1.0, super: 1.22, hyper: 1.25 }, models: ['Petit', 'Royale', 'Atlante', 'Lumen', 'Vortice', 'Aeternum'] }
];
// Gesamtmarkt je Klasse (Autos pro Tag, die die Konkurrenz verkauft)
const CLASS_MARKET = { small: 3.5, family: 4.5, suv: 3.5, sport: 1.4, super: 0.35, hyper: 0.07 };
const RIVAL_BASE = { small: 46, family: 46, suv: 46, sport: 48, super: 52, hyper: 56 };

function ensureRivals() {
  if (!S.rivals) {
    S.rivals = {};
    for (const r of RIVALS) { const sc = {}; for (const c of CLASS_ORDER) sc[c] = Math.round(RIVAL_BASE[c] * r.focus[c] + rand(-3, 3)); S.rivals[r.id] = { score: sc, gen: {} }; }
    S.rivalNext = 40;
  }
  return S.rivals;
}
/** bester Konkurrenzwert einer Klasse (wächst mit der Zeit) */
function rivalBest(cls) {
  const R = ensureRivals(), drift = Math.min(25, S.day / 365 * 7);
  let best = 0, who = RIVALS[0];
  for (const r of RIVALS) { const v = Math.min(96, R[r.id].score[cls] + drift * r.focus[cls]); if (v > best) { best = v; who = r; } }
  return { v: best, r: who };
}
/** Nachfrage-Faktor: dein Auto im Vergleich zur besten Konkurrenz */
function rivalFactor(car) {
  const q = Math.max(car.score.family, car.score.sport, car.score.hyper, 1);
  const R = rivalBest(car.cls).v;
  return clamp(2 * Math.pow(q, 3) / (Math.pow(q, 3) + Math.pow(R, 3)), 0.15, 1.8);
}
/** dein Marktanteil in einer Klasse (aus erwarteter Nachfrage) */
function classShare(cls) {
  let mine = 0;
  for (const m of S.models) if (BODIES[m.body].cls === cls) mine += demandBreakdown(m).total;
  return mine / (mine + CLASS_MARKET[cls] * (0.6 + rivalBest(cls).v / 120));
}
function bestShare() { let b = 0; for (const c of CLASS_ORDER) if (S.models.some(m => BODIES[m.body].cls === c)) b = Math.max(b, classShare(c)); return b; }

/** Tageswechsel: Konkurrenz bringt neue Modelle oder hat Pech */
function rivalsDay() {
  ensureRivals();
  if (S.day < S.rivalNext) return;
  S.rivalNext = S.day + randi(35, 70);
  const r = pick(RIVALS), st = S.rivals[r.id];
  // Konkurrenz zielt bevorzugt auf Klassen, in denen du stark bist
  const mine = CLASS_ORDER.filter(c => S.models.some(m => BODIES[m.body].cls === c));
  const cls = mine.length && Math.random() < 0.6 ? pick(mine) : pick(CLASS_ORDER);
  if (Math.random() < 0.8) {
    const gain = randi(3, 7);
    st.score[cls] = Math.min(94, st.score[cls] + gain);
    st.gen[cls] = (st.gen[cls] || 1) + 1;
    const mname = `${r.name.split(' ')[0]} ${r.models[CLASS_ORDER.indexOf(cls)]} ${['', '', 'II', 'III', 'IV', 'V', 'VI'][Math.min(6, st.gen[cls])]}`.trim();
    const text = `${r.name} bringt den neuen <b>${esc(mname)}</b> (${CLASSES[cls].name}) – Wertung ${Math.round(rivalBest(cls).v)}. Halte deine Modelle aktuell!`;
    S.log.unshift({ day: S.day, title: 'Konkurrenz: neues Modell', text }); if (S.log.length > 30) S.log.pop();
    toast(`<div>${ico('market', 'big')}</div><div><b>Konkurrenz!</b><br>${text}</div>`, 'bad', 6500);
  } else {
    st.score[cls] = Math.max(30, st.score[cls] - 6);
    const text = `Grosser Rückruf bei <b>${r.name}</b> (${CLASSES[cls].name}): Die Kunden wechseln zu dir!`;
    S.log.unshift({ day: S.day, title: 'Konkurrenz patzt', text }); if (S.log.length > 30) S.log.pop();
    toast(`<div>${ico('trophy', 'big')}</div><div><b>Chance!</b><br>${text}</div>`, 'good', 6500);
  }
}

function rivalsPanelHTML() {
  ensureRivals();
  const drift = Math.min(25, S.day / 365 * 7);
  const myBest = c => { let b = 0; for (const m of S.models) if (BODIES[m.body].cls === c) b = Math.max(b, maxScore(m)); return b; };
  return `<div class="panel"><h3>${ico('market')}Konkurrenz & Marktanteile</h3><div style="overflow:auto">
    <table class="t"><tr><th>Hersteller</th>${CLASS_ORDER.map(c => `<th>${CLASSES[c].name}</th>`).join('')}</tr>
    <tr><td><b style="color:var(--yellow)">${esc(S.company)}</b></td>${CLASS_ORDER.map(c => { const v = myBest(c), R = rivalBest(c).v; return `<td class="${v ? (v >= R ? 'good' : 'bad') : 'muted'}">${v || '–'}</td>`; }).join('')}</tr>
    ${RIVALS.map(r => `<tr><td><span class="sw" style="width:10px;height:10px;background:${r.color}"></span> ${r.name}</td>${CLASS_ORDER.map(c => `<td>${Math.round(Math.min(96, S.rivals[r.id].score[c] + drift * r.focus[c]))}</td>`).join('')}</tr>`).join('')}
    <tr><td>Dein Marktanteil</td>${CLASS_ORDER.map(c => { const sh = S.models.some(m => BODIES[m.body].cls === c) ? classShare(c) : 0; return `<td><div class="bar" style="width:60px;display:inline-block;vertical-align:middle"><i style="width:${sh * 100}%;background:var(--yellow)"></i></div> ${Math.round(sh * 100)}%</td>`; }).join('')}</tr>
    </table></div>
    <div class="hint">Wertung = beste Kundengruppen-Punkte eines Modells. Ist dein Auto besser als die beste Konkurrenz seiner Klasse (grün), verkaufst du deutlich mehr. Die Konkurrenz entwickelt sich laufend weiter – bring regelmässig neue oder verbesserte Modelle!</div></div>`;
}
