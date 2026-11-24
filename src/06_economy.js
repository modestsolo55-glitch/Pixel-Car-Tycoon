/* =============================================================================
   Teil 6: Wirtschaft – Produktion, Verkauf, Werbung, Ereignisse, Kosten,
   Fabrik-Ausbau, Forschung, Modelle/Motoren speichern, Erfolge
   ============================================================================= */
const classIdx = cls => CLASS_ORDER.indexOf(cls);
const modelById = id => S.models.find(m => m.id === id);
const stockTotal = () => Object.values(S.stock).reduce((a, b) => a + (b || 0), 0);
const pendingUnits = () => S.factory.lines.filter(l => l.paid).length;
const warehouseCap = () => Math.round(STAGES[S.factory.stage].wh * (1 + 0.5 * S.factory.wh));
function buildDays(m) {
  const f = S.factory;
  const sp = STAGES[f.stage].rate * (1 + 0.2 * f.speed) * (1 + bonus('prodSpeed')) * Math.max(0.2, 1 + modSum('speed'));
  return CLASSES[BODIES[m.body].cls].buildDays / sp;
}
/** Finanzbuch: Beträge des laufenden Tages sammeln (rev, prod, fixed, ads, inv) */
function finAdd(k, v) {
  if (!S) return;
  if (!S.fin) S.fin = { cur: {}, days: [], m0: S.money };
  S.fin.cur[k] = (S.fin.cur[k] || 0) + v;
}
function finCloseDay() {
  if (!S.fin) S.fin = { cur: {}, days: [], m0: S.money };
  const c = S.fin.cur, known = (c.rev || 0) - (c.prod || 0) - (c.fixed || 0) - (c.ads || 0) - (c.inv || 0);
  const other = Math.round(S.money - S.fin.m0 - known);
  S.fin.days.push(Object.assign({ d: S.day, other }, c)); if (S.fin.days.length > 60) S.fin.days.shift();
  S.fin.cur = {}; S.fin.m0 = S.money;
}
/** Gewinn pro Tag eines Modells bei einem Preis (begrenzt durch Nachfrage und Produktion) */
function modelProfitDay(m, price) {
  const car = carOf(m), keep = m.price;
  if (price != null) m.price = price;
  const dmd = demandBreakdown(m).total;
  m.price = keep;
  const cap = S.factory.lines.filter(l => l.modelId === m.id && l.active).reduce((a) => a + 1 / buildDays(m), 0);
  const units = cap > 0 ? Math.min(dmd, cap) : dmd;
  return { units, dmd, cap, profit: units * ((price != null ? price : m.price) - car.prodCost) };
}
/** bester Preis: Gewinn pro Tag maximieren */
function bestPrice(m) {
  const car = carOf(m); let best = null;
  for (let f = 0.7; f <= 2.2; f += 0.02) { const p = Math.round(car.value * f / 100) * 100, r = modelProfitDay(m, p); if (!best || r.profit > best.profit) best = Object.assign({ price: p }, r); }
  return best;
}
function staffCount() { return STAGES[S.factory.stage].staff + (S.factory.lines.length - 1) * 3; }
function monthlyCost() { return STAGES[S.factory.stage].rent + staffCount() * WAGE + S.factory.lines.length * 300; }

// ---------- Produktion (läuft kontinuierlich in Spieltagen) ----------
function tickProduction(dtDays) {
  const cap = warehouseCap();
  for (const L of S.factory.lines) {
    L.stall = '';
    if (!L.active) continue;
    const m = modelById(L.modelId);
    if (!m) { L.active = false; continue; }
    if (!L.paid) {
      if (stockTotal() + pendingUnits() >= cap) { L.stall = 'Lager voll'; continue; }
      if (L.mode === 'keep' && (S.stock[m.id] || 0) >= Math.max(1, L.qty)) { L.stall = 'Lager reicht'; continue; }
      const cost = carOf(m).prodCost;
      if (S.money < cost) { L.stall = 'Kein Geld'; continue; }
      S.money -= cost; m.stat.cost += cost; L.paid = true; L.prog = 0; finAdd('prod', cost);
    }
    L.prog += dtDays / buildDays(m);
    if (L.prog >= 1) {
      L.prog = 0; L.paid = false; L.done++;
      S.stock[m.id] = (S.stock[m.id] || 0) + 1;
      m.stat.prod++; S.stats.produced++;
      addXP(6 + carOf(m).prodCost / 1500);
      if (L.mode !== 'keep' && L.qty > 0 && L.done >= L.qty) { L.active = false; toast(`${ico('factory')} Auftrag fertig: ${L.qty}× ${esc(m.name)}`, 'good'); }
    }
  }
}

// ---------- Nachfrage ----------
function adMult(seg) {
  let v = 0;
  for (const c of S.campaigns) { const C0 = CAMPAIGNS.find(x => x.id === c.id); if (C0 && c.until > S.day) v += C0.mult * (C0.seg[seg] || 0); }
  return 1 + Math.min(2.5, v);
}
/** erwartete Verkäufe pro Tag je Kundengruppe */
function demandBreakdown(m) {
  const car = carOf(m), cls = CLASSES[car.cls];
  const price = m.price || car.value;
  const pr = price / car.value;
  const repF = 0.25 + S.rep / 100 * 1.5;
  const dem = Math.max(0.1, 1 + bonus('demand') + modSum('demand'));
  const same = S.models.filter(x => x.id !== m.id && BODIES[x.body].cls === car.cls && (S.stock[x.id] || 0) > 0).length;
  const comp = 1 / Math.sqrt(1 + same);
  const rivF = rivalFactor(car);            // Vergleich mit der Konkurrenz
  const evF = (car.isEV || car.E.type === 'hybrid') ? 1 + modSum('ev') : 1;
  let mBoost = 1;
  for (const md of S.mods) if (md.until > S.day && md.modelId === m.id) mBoost += md.mult;
  const out = {}; let total = 0;
  for (const seg in SEGMENTS) {
    const G = SEGMENTS[seg];
    const base = G.size * (cls.aff[seg] || 0) * Math.pow(car.score[seg] / 100, 2.2);
    const pf = clamp(Math.exp(-G.sens * (pr - 1)), 0, 3);
    const segMod = seg === 'sport' ? 1 + modSum('sport') : 1;
    out[seg] = base * pf * repF * dem * comp * evF * adMult(seg) * segMod * Math.max(0.1, mBoost) * rivF;
    total += out[seg];
  }
  out.total = total;
  return out;
}

// ---------- Tageswechsel ----------
function dayTick() {
  S.day++;
  // Verkäufe
  let soldToday = 0, revToday = 0;
  for (const m of S.models) {
    const stock = S.stock[m.id] || 0;
    let n = 0;
    if (stock > 0) {
      const dmd = demandBreakdown(m);
      n = Math.min(stock, poisson(dmd.total));
    }
    m.stat.recent.push(n); if (m.stat.recent.length > 30) m.stat.recent.shift();
    if (!n) continue;
    const car = carOf(m), ci = classIdx(car.cls);
    S.stock[m.id] = stock - n;
    const rev = Math.round(n * m.price * prestigeMul());
    S.money += rev; m.stat.sold += n; m.stat.rev += rev; S.stats.sold += n; S.stats.revenue += rev;
    soldToday += n; revToday += rev;
    addXP(n * (10 + m.price / 600));
    const q = Math.max(car.score.family, car.score.sport, car.score.hyper) / 100;
    addRep(n * (q - 0.45) * 0.05 * (1 + ci * 0.4) * (m.price > car.value * 1.4 ? 0.5 : 1));
  }
  finAdd('rev', revToday);
  if (soldToday) chalEvent('sell', soldToday);
  if (soldToday && S.speed <= 2) toast(`${ico('money')} ${soldToday} Auto${soldToday > 1 ? 's' : ''} verkauft: <b>+${fmtMoney(revToday)}</b>`, 'good', 2200);
  // Werbung: Ruf verteilt über die Laufzeit
  for (const c of S.campaigns) { const C0 = CAMPAIGNS.find(x => x.id === c.id); if (C0 && c.until >= S.day) addRep(C0.rep / C0.days); }
  const ended = S.campaigns.filter(c => c.until <= S.day);
  ended.forEach(c => { const C0 = CAMPAIGNS.find(x => x.id === c.id); toast(`${ico('ad')} Kampagne beendet: ${C0 ? C0.name : c.id}`); });
  S.campaigns = S.campaigns.filter(c => c.until > S.day);
  S.mods = S.mods.filter(md => md.until > S.day);
  // langsamer Rufverlust ohne Aktivität
  if (S.rep > 25 && !soldToday) S.rep = Math.max(25, S.rep - 0.01);
  // Monatskosten
  if (S.day % 30 === 0) {
    const cost = monthlyCost();
    S.money -= cost;
    const zins = loanMonthly();
    finAdd('fixed', cost + zins);
    toast(`${ico('date')} Monatskosten (Löhne ${staffCount()} MA, Miete${zins ? ', Kreditzins' : ''}): <b class="bad">-${fmtMoney(cost + zins)}</b>`, S.money < 0 ? 'bad' : '', 4500);
    if (S.money < 0) toast('Achtung: Dein Konto ist im Minus! Verkaufe Autos oder senke Kosten.', 'bad', 6000);
  }
  // Zufallsereignisse
  if (S.day >= S.nextEvent) { triggerEvent(); S.nextEvent = S.day + randi(22, 42); }
  salvageDay();
  leagueDay();
  showDay();
  rivalsDay();
  // Statistik
  S.hist.push(Math.round(S.money)); if (S.hist.length > 120) S.hist.shift();
  finCloseDay();
  checkAchievements();
}

// ---------- Werbekampagnen ----------
function startCampaign(id) {
  const C0 = CAMPAIGNS.find(x => x.id === id);
  if (!C0 || !has(C0.tech)) return false;
  if (S.campaigns.some(c => c.id === id)) { toast('Diese Kampagne läuft bereits.', 'bad'); return false; }
  if (S.money < C0.cost) { toast('Nicht genug Geld für die Kampagne.', 'bad'); return false; }
  S.money -= C0.cost; finAdd('ads', C0.cost);
  S.campaigns.push({ id, until: S.day + C0.days });
  S.stats.adsRun[id] = (S.stats.adsRun[id] || 0) + 1;
  addXP(C0.xp);
  toast(`${ico('ad')} Kampagne <b>${C0.name}</b> gestartet (${C0.days} Tage)`, 'good');
  checkAchievements();
  return true;
}

// ---------- Zufallsereignisse ----------
function triggerEvent() {
  const soldModels = S.models.filter(m => m.stat.sold > 0);
  const pool = EVENTS.filter(e => {
    if (['review', 'badreview', 'recall'].includes(e.id)) return soldModels.length > 0;
    if (e.id === 'evsub') return S.models.some(m => { const c = carOf(m); return c.isEV || c.E.type === 'hybrid'; });
    if (e.id === 'strike') return S.factory.stage >= 1;
    return true;
  });
  for (let tries = 0; tries < 8; tries++) {
    const ev = pick(pool);
    let text = ev.text;
    if (ev.special === 'review') {
      const m = soldModels.slice().sort((a, b) => maxScore(b) - maxScore(a))[0];
      if (maxScore(m) < 45) continue;
      addRep(4); S.mods.push({ modelId: m.id, mult: 0.5, until: S.day + 30 });
      text = `Das Magazin <b>PixelMotor</b> vergibt 5 Sterne an den „${esc(m.name)}“! +4 Ruf, +50 % Nachfrage (30 Tage).`;
    } else if (ev.special === 'badreview') {
      const m = soldModels.slice().sort((a, b) => maxScore(a) - maxScore(b))[0];
      if (maxScore(m) > 55) continue;
      addRep(-3); S.mods.push({ modelId: m.id, mult: -0.3, until: S.day + 30 });
      text = `Tester bemängeln den „${esc(m.name)}“. -3 Ruf, -30 % Nachfrage (30 Tage).`;
    } else if (ev.special === 'recall') {
      const m = soldModels.slice().sort((a, b) => carOf(a).rel - carOf(b).rel)[0];
      const rel = carOf(m).rel;
      if (Math.random() > (100 - rel) / 55 * (1 - S.factory.qc * 0.12)) continue;
      const cost = Math.round(Math.min(m.stat.sold, 300) * carOf(m).prodCost * 0.08);
      S.money -= cost; addRep(-5);
      text = `Beim „${esc(m.name)}“ (Zuverlässigkeit ${rel}) gibt es einen Defekt. Rückruf kostet <b class="bad">${fmtMoney(cost)}</b>, -5 Ruf. Tipp: Qualitätskontrolle ausbauen!`;
    } else if (ev.special === 'carshow') { addRep(3); addXP(150); }
    else if (ev.special === 'investor') {
      const amt = Math.round(5000 * Math.pow(S.level, 1.4) / 100) * 100;
      S.money += amt; text = `Ein Investor glaubt an ${esc(S.company)}: <b>+${fmtMoney(amt)}</b>`;
    }
    if (ev.mod) S.mods.push(Object.assign({ id: ev.id }, ev.mod, { until: S.day + ev.mod.days }));
    if (ev.rep) addRep(ev.rep);
    S.log.unshift({ day: S.day, title: ev.title, text }); if (S.log.length > 30) S.log.pop();
    showEventPopup(ev, text);
    return;
  }
}
const maxScore = m => { const s = carOf(m).score; return Math.max(s.family, s.sport, s.hyper); };

// ---------- Fabrik-Ausbau ----------
function nextStageInfo() {
  const n = STAGES[S.factory.stage + 1];
  if (!n) return null;
  const ok = has(n.tech) && S.level >= n.lvl && S.money >= n.cost;
  const why = !has(n.tech) ? `Forschung „${TECH[n.tech].name}“ nötig` : S.level < n.lvl ? `Level ${n.lvl} nötig` : S.money < n.cost ? 'Zu wenig Geld' : '';
  return { st: n, ok, why };
}
function buyStage() {
  const info = nextStageInfo();
  if (!info || !info.ok) return false;
  S.money -= info.st.cost; S.factory.stage++; finAdd('inv', info.st.cost);
  addXP(250 * S.factory.stage);
  toast(`${ico('factory')} Ausbau abgeschlossen: <b>${info.st.name}</b>!`, 'good', 5000);
  checkAchievements();
  return true;
}
const lineCost = () => STAGES[S.factory.stage].lineCost * Math.pow(1.35, Math.max(0, S.factory.lines.length - 1));
function buyLine() {
  const f = S.factory, st = STAGES[f.stage];
  if (f.lines.length >= st.maxLines) return false;
  const cost = Math.round(lineCost());
  if (S.money < cost) { toast('Nicht genug Geld für eine neue Linie.', 'bad'); return false; }
  S.money -= cost; finAdd('inv', cost); f.lines.push(newLine(S.models[0] && S.models[0].id));
  addXP(80); toast(`${ico('factory')} Neue Produktionslinie gebaut!`, 'good');
  return true;
}
const upgradeCost = k => Math.round(UPGRADES[k].base * Math.pow(1.9, S.factory[k]) * (1 + S.factory.stage * 0.8));
function buyUpgrade(k) {
  const U = UPGRADES[k];
  if (S.factory[k] >= U.max || !has(U.tech)) return false;
  const cost = upgradeCost(k);
  if (S.money < cost) { toast('Nicht genug Geld.', 'bad'); return false; }
  S.money -= cost; finAdd('inv', cost); S.factory[k]++; _carCache.clear();
  addXP(40 + S.factory[k] * 20);
  toast(`${ico('wrench')} ${U.name} auf Stufe ${S.factory[k]} verbessert`, 'good');
  return true;
}

// ---------- Forschung ----------
function techState(t) {
  if (S.techs.includes(t.id)) return 'done';
  if (S.level >= t.lvl && t.req.every(r => S.techs.includes(r))) return S.rp >= t.cost ? 'avail' : 'nopts';
  return 'lock';
}
function research(id) {
  const t = TECH[id];
  if (!t || techState(t) !== 'avail') return false;
  S.rp -= t.cost; S.techs.push(id); _carCache.clear();
  toast(`${ico('research')} Erforscht: <b>${t.name}</b>`, 'good');
  checkAchievements();
  return true;
}

// ---------- Modelle & Motoren ----------
function validateDesign(d) {
  if (!String(d.name || '').trim()) return 'Bitte gib dem Modell einen Namen.';
  if (!classUnlocked(d.cls)) return 'Diese Fahrzeugklasse ist noch nicht erforscht.';
  if (!bodyUnlocked(d.body) || BODIES[d.body].cls !== d.cls) return 'Diese Karosserie ist nicht verfügbar.';
  if (!S.engines.find(e => e.id === d.engineId)) return 'Bitte wähle einen Motor.';
  return '';
}
const devCost = car => Math.round(car.prodCost * 0.5 / 100) * 100;
function saveModelFromDraft(asNew) {
  const d = S.draft, err = validateDesign(d);
  if (err) { toast(err, 'bad'); return null; }
  const car = computeCar(d);
  const existing = !asNew && d.id && modelById(d.id);
  if (existing) {
    const keep = { id: existing.id, stat: existing.stat, price: existing.price, created: existing.created };
    Object.assign(existing, clone(d), keep);
    _carCache.delete(existing.id);
    toast(`${ico('car')} Modell „${esc(existing.name)}“ aktualisiert`, 'good');
    return existing;
  }
  const cost = devCost(car);
  if (S.money < cost) { toast(`Entwicklung kostet ${fmtMoney(cost)} – zu wenig Geld.`, 'bad'); return null; }
  S.money -= cost; finAdd('inv', cost);
  const m = clone(d); m.id = 'm' + uid(); m.stat = newModelStats(); m.created = S.day;
  m.price = Math.round(car.value / 100) * 100;
  S.models.push(m); S.stock[m.id] = 0; S.stats.designs++;
  S.draft.id = m.id;
  addXP(100 + classIdx(car.cls) * 70);
  toast(`${ico('car')} Neues Modell „${esc(m.name)}“ entwickelt (${fmtMoney(cost)})`, 'good', 4000);
  checkAchievements();
  return m;
}
function deleteModel(id) {
  const m = modelById(id);
  if (!m) return;
  const refund = Math.round((S.stock[id] || 0) * carOf(m).prodCost * 0.4);
  S.money += refund;
  S.factory.lines.forEach(l => { if (l.modelId === id) { if (l.paid) S.money += carOf(m).prodCost; l.active = false; l.paid = false; l.prog = 0; l.modelId = null; } });
  delete S.stock[id];
  S.models = S.models.filter(x => x.id !== id);
  if (S.draft.id === id) S.draft.id = null;
  toast(`Modell gelöscht${refund ? ', Lager verkauft: +' + fmtMoney(refund) : ''}`);
}
function saveEngineFromDraft(asNew) {
  const e = S.engDraft;
  if (!String(e.name || '').trim()) { toast('Bitte gib dem Motor einen Namen.', 'bad'); return null; }
  if (!has(ENGINE_TYPES[e.type].tech)) { toast('Motortyp nicht erforscht.', 'bad'); return null; }
  const existing = !asNew && e.id && S.engines.find(x => x.id === e.id);
  if (existing) { Object.assign(existing, clone(e)); _carCache.clear(); toast(`${ico('engine')} Motor „${esc(e.name)}“ aktualisiert`, 'good'); return existing; }
  const ne = clone(e); ne.id = 'e' + uid();
  S.engines.push(ne); S.engDraft.id = ne.id;
  addXP(50);
  toast(`${ico('engine')} Neuer Motor „${esc(ne.name)}“ gespeichert`, 'good');
  checkAchievements();
  return ne;
}
function deleteEngine(id) {
  if (S.engines.length <= 1) { toast('Mindestens ein Motor muss bleiben.', 'bad'); return; }
  if (S.models.some(m => m.engineId === id)) { toast('Motor wird noch von einem Modell verwendet.', 'bad'); return; }
  S.engines = S.engines.filter(e => e.id !== id);
  if (S.draft.engineId === id) S.draft.engineId = S.engines[0].id;
  if (S.engDraft.id === id) S.engDraft.id = null;
}

// ---------- Erfolge ----------
function checkAchievements() {
  if (!S) return;
  const st = S.stats;
  const cond = {
    model1: st.designs >= 1, sale1: st.sold >= 1, sale100: st.sold >= 100, sale1000: st.sold >= 1000,
    money1m: S.money >= 1e6, money10m: S.money >= 1e7, lvl10: S.level >= 10, lvl25: S.level >= 25,
    race1: st.wins >= 1, race10: st.wins >= 10, q10: st.best14 > 0 && st.best14 < 10, q8: st.best14 > 0 && st.best14 < 8,
    react: st.react > 0 && st.react < 0.05, rep50: S.rep >= 50, rep90: S.rep >= 90, mega: S.factory.stage >= 4,
    hyper: S.models.some(m => BODIES[m.body].cls === 'hyper'), v12: S.engines.some(e => e.type === 'v12' || e.type === 'w16'),
    ads: CAMPAIGNS.every(c => st.adsRun[c.id]), tech20: S.techs.length >= 20,
    gem: !!(S.salvage && S.salvage.stats.gems >= 1), champ: !!(S.league && S.league.trophies.some(t => t.place === 1)), tuner: S.models.some(m => m.tune && Object.values(m.tune).reduce((a, b) => a + b, 0) >= 10), flip5: !!(S.salvage && S.salvage.stats.flips >= 5)
  };
  for (const a of ACHIEVEMENTS) {
    if (S.ach.includes(a.id) || !cond[a.id]) continue;
    S.ach.push(a.id);
    S.money += a.reward;
    S.gems = (S.gems || 0) + 10;
    addXP(60);
    toast(`${ico('trophy')} Erfolg: <b>${a.name}</b>${a.reward ? ' +' + fmtMoney(a.reward) : ''}`, 'good', 5000);
  }
  checkGoals();
}
