/* =============================================================================
   Teil 9b: Schrottplatz & Gebrauchtwagen-Markt
   Günstige Autos mit versteckten Mängeln: Gutachter, Feilschen, Reparieren,
   Aufbereiten, mit Gewinn weiterverkaufen, im Drag Race fahren oder zerlegen
   (Reverse Engineering bringt Forschungspunkte). Selten: Scheunenfund-Jackpot.
   ============================================================================= */
ICONS.magnet = ['..kkkk..', '.krrrrk.', 'krrkkrrk', 'krk..krk', 'krk..krk', 'kwk..kwk', 'kwk..kwk', 'kkk..kkk'];

const SV_BRANDS = ['Vortek', 'Kessler', 'Aurion', 'Raijin', 'Volkara', 'Stellmark', 'Bravura', 'Nordhav', 'Castellan', 'Mirado', 'Quellmann', 'Tarvo'];
const SV_NAMES = ['Zentaro', 'Brivo', 'Kalmar', 'Ventra', 'Orvia', 'Strixx', 'Pellar', 'Domino', 'Taros', 'Fennix', 'Quasar', 'Mirelo', 'Ombra', 'Silvaro', 'Cobaltis', 'Rumba', 'Pixelo', 'Granito'];
// Mängel: repair = Anteil vom Neuwert, val = Wertfaktor solange unrepariert, ps/shift/grip = Fahrwerte
const SV_DEFECTS = {
  motor: { name: 'Motorschaden',              repair: 0.22,  days: 6, val: 0.55, ps: 0.62, risk: 0.4, hint: 'Motor klingt ein bisschen komisch, ist aber sicher nix.' },
  turbo: { name: 'Turbo defekt',              repair: 0.07,  days: 3, val: 0.85, ps: 0.84, hint: 'Pfeift beim Gasgeben – das ist Sound!' },
  gear:  { name: 'Getriebeschaden',           repair: 0.12,  days: 4, val: 0.75, shift: 3, hint: 'Gänge kratzen minimal.' },
  rust:  { name: 'Starker Rost',              repair: 0.09,  days: 4, val: 0.8, visible: true },
  crash: { name: 'Versteckter Unfallschaden', repair: 0.16,  days: 5, val: 0.65, grip: -0.06, hint: 'Unfallfrei! (glaube ich)' },
  elec:  { name: 'Elektrik spinnt',           repair: 0.05,  days: 2, val: 0.9, hint: 'Eine Warnleuchte ist an, einfach ignorieren.' },
  tires: { name: 'Uralte Reifen',             repair: 0.015, days: 1, val: 0.97, grip: -0.18, visible: true },
  odo:   { name: 'Tacho manipuliert',         repair: null,  days: 0, val: 0.78, hint: 'Original-Kilometer, ehrlich!' }
};
const SV_PRAISE = ['Läuft wie neu!', 'Nur von Oma sonntags gefahren.', 'Kleiner Kratzer, sonst top.', 'Muss dringend weg, Umzug!', 'Scheckheftgepflegt (Scheckheft verloren).',
  'Echter Liebhaberwagen.', 'Stand lange in der Scheune.', 'Preis ist fast verhandelbar.', 'TÜV neu… bald.', 'Keine Probefahrt, keine Fragen.'];
const SV_CLASS_W = { small: 30, family: 25, suv: 18, sport: 15, super: 8, hyper: 4 };
const SV_ENGINES = {
  small: ['i4', 'i4', 'hybrid'], family: ['i4', 'v6', 'hybrid'], suv: ['v6', 'v8', 'hybrid', 'ev'],
  sport: ['i4', 'v6', 'v8'], super: ['v8', 'v10', 'v12'], hyper: ['v12', 'w16', 'ev']
};

function ensureSalvage() {
  if (!S.salvage) S.salvage = { listings: [], owned: [], next: 0, stats: { flips: 0, gems: 0, profit: 0, bought: 0 } };
  if (S.day >= S.salvage.next) refreshListings();
  return S.salvage;
}
const svSlots = () => 2 + S.factory.stage;

/** Zufälliges Gebrauchtwagen-Angebot erzeugen */
function makeListing() {
  const pool = Object.entries(SV_CLASS_W).filter(([c]) => c !== 'hyper' || S.level >= 8).filter(([c]) => c !== 'super' || S.level >= 4);
  let r = Math.random() * pool.reduce((a, [, w]) => a + w, 0), cls = pool[0][0];
  for (const [c, w] of pool) { if ((r -= w) <= 0) { cls = c; break; } }
  const bodies = Object.keys(BODIES).filter(b => BODIES[b].cls === cls);
  const gem = Math.random() < 0.07;
  const d = defaultDesign();
  Object.assign(d, {
    cls, body: pick(bodies), color: pick(PAINT_COLORS), color2: pick(PAINT_COLORS), stripe: Math.random() < 0.35 ? pick(Object.keys(STRIPES)) : 'none',
    paint: pick(['gloss', 'gloss', 'matte', 'metallic']), rim: pick(Object.keys(RIMS)), rimColor: pick(RIM_COLORS), tire: randi(0, 5),
    spoiler: Math.random() < 0.3 ? pick(Object.keys(SPOILERS)) : 'none', lip: Math.random() < 0.25 ? pick(Object.keys(LIPS)) : 'none',
    skirts: Math.random() < 0.2 ? 'std' : 'none', ride: randi(-2, 1), tint: randi(0, 4), number: Math.random() < 0.15 ? randi(1, 99) : 0,
    sticker: Math.random() < 0.15 ? pick(['flames', 'bolt', 'sponsor']) : 'none'
  });
  d.interior = Object.assign(defaultInterior(), { tier: pick(['basic', 'komfort', 'komfort', 'luxus', 'race']), seatColor: pick(SEAT_COLORS) });
  const type = pick(SV_ENGINES[cls]), T = ENGINE_TYPES[type];
  const e = defaultEngine();
  Object.assign(e, { id: 'sv', type, disp: type === 'ev' ? randi(8, 24) * 5 : Math.round(rand(T.dmin, T.dmax) * 10) / 10,
    ind: type === 'ev' ? 'none' : pick(['none', 'none', 'turbo', 'twin', 'super']), mat: pick(['steel', 'steel', 'alu', 'titan']),
    exh: pick(['stock', 'sport', 'race']), nos: Math.random() < 0.12 ? 'small' : 'none', gears: randi(5, 7), ratio: pick(['short', 'normal', 'long']), motors: randi(1, 3) });
  if (type === 'ev') { e.nos = 'none'; e.exh = 'stock'; }
  const brand = pick(SV_BRANDS), name = brand + ' ' + pick(SV_NAMES);
  d.name = name; e.name = name + ' Motor';
  const cond = gem ? randi(12, 35) : randi(18, 92);
  // Mängel: je schlechter der Zustand, desto mehr
  const defects = [];
  const nDef = Math.min(4, poisson((100 - cond) / 32));
  const ids = Object.keys(SV_DEFECTS).filter(id => id !== 'turbo' || (e.ind !== 'none' && type !== 'ev'));
  for (let i = 0; i < nDef; i++) { const id = pick(ids); if (!defects.some(x => x.id === id)) defects.push({ id, known: !!SV_DEFECTS[id].visible, fixed: false }); }
  if (cond < 40 && !defects.some(x => x.id === 'rust') && Math.random() < 0.6) defects.push({ id: 'rust', known: true, fixed: false });
  const km = randi(20, 380) * 1000;
  const o = { id: 'sv' + uid(), name, brand, design: d, engine: e, cond, km, defects, gem, inspected: false, haggled: 0, expires: S.day + randi(6, 14) };
  o.desc = (() => { const hid = defects.filter(x => !x.known && SV_DEFECTS[x.id].hint); return hid.length && Math.random() < 0.45 ? SV_DEFECTS[pick(hid).id].hint : pick(SV_PRAISE); })();
  svSyncWear(o);
  // Verkäufer kennt nur die sichtbaren Mängel – und weiss nichts vom Scheunenfund
  o.price = Math.max(300, Math.round(svApparentValue(o) * rand(0.55, 0.85) / 100) * 100);
  return o;
}
function refreshListings() {
  const sv = S.salvage;
  sv.listings = sv.listings.filter(l => l.expires > S.day);
  while (sv.listings.length < 6) sv.listings.push(makeListing());
  sv.next = S.day + 7;
}
/** Neuwert des Autos (mit dem eigenen Forschungsstand bewertet) */
function svBaseValue(o) {
  if (!o._base || o._baseKey !== S.techs.length) { o._base = computeCar(o.design, o.engine).value; o._baseKey = S.techs.length; }
  return o._base;
}
const condF = c => 0.2 + 0.8 * Math.pow(c / 100, 1.3);
function svTrueValue(o) {
  let v = svBaseValue(o) * condF(o.cond);
  for (const d of o.defects) if (!d.fixed) v *= SV_DEFECTS[d.id].val;
  return Math.round(v * (o.gem ? 1.9 : 1));
}
function svApparentValue(o) {
  let v = svBaseValue(o) * condF(o.cond);
  for (const d of o.defects) if (!d.fixed && d.known) v *= SV_DEFECTS[d.id].val;
  return v;
}
const svSellPrice = o => Math.round(svTrueValue(o) * (0.72 + S.rep / 100 * 0.25) / 100) * 100;
const svInspectCost = o => Math.max(300, Math.round(o.price * 0.06 / 50) * 50);
const svRestoreCost = o => Math.round(svBaseValue(o) * 0.05 / 100) * 100;
const svRepairCost = (o, id) => Math.round(svBaseValue(o) * SV_DEFECTS[id].repair / 100) * 100;
/** Optik (Rost, Schmutz, Sprung) an Zustand & Mängel anpassen */
function svSyncWear(o) {
  const rust = o.defects.some(d => d.id === 'rust' && !d.fixed);
  o.design.wear = { w: Math.round(clamp(1 - o.cond / 100, 0, 1) * 20) / 20, rust, crack: o.cond < 30 };
  o.design.tire = o.defects.some(d => d.id === 'tires' && !d.fixed) ? 0 : o.design.tire;
}
/** Fahrbare Version mit allen Auswirkungen der Mängel */
function svEffective(o) {
  const e = clone(o.engine), d = clone(o.design);
  let ps = 0.75 + 0.25 * o.cond / 100, sm = 1, ga = 0;
  for (const df of o.defects) if (!df.fixed) { const D = SV_DEFECTS[df.id]; if (D.ps) ps *= D.ps; if (D.shift) sm *= D.shift; if (D.grip) ga += D.grip; }
  e.wearMul = ps; e.shiftMul = sm; d.gripAdj = ga;
  e.id = 'sv'; d.engineId = 'sv';
  return { d, e };
}
const svBusy = o => o.until && o.until > S.day;

// ---------- Aktionen ----------
function svFind(id) { const sv = ensureSalvage(); return sv.listings.find(x => x.id === id) || sv.owned.find(x => x.id === id); }
ACTIONS.svsel = d => { SVSEL = d.v; rerender(); };
ACTIONS.svinspect = d => {
  const o = svFind(d.v); if (!o || o.inspected) return;
  const c = svInspectCost(o);
  if (S.money < c) { toast('Zu wenig Geld für den Gutachter.', 'bad'); return; }
  S.money -= c; o.inspected = true; o.defects.forEach(x => x.known = true);
  const hidden = o.defects.filter(x => !SV_DEFECTS[x.id].visible);
  toast(`${ico('wrench')} Gutachter: ${o.defects.length ? o.defects.map(x => SV_DEFECTS[x.id].name).join(', ') : 'Keine Mängel gefunden!'}${o.gem ? ' – und: <b>Seltene Sonderedition!</b>' : ''}`, hidden.length ? 'bad' : 'good', 6000);
  rerender();
};
ACTIONS.svhaggle = d => {
  const o = svFind(d.v); if (!o) return;
  const chance = 0.55 + S.rep / 250 - o.haggled * 0.22;
  o.haggled++;
  if (Math.random() < chance) {
    o.price = Math.max(200, Math.round(o.price * 0.9 / 100) * 100);
    toast(`${ico('money')} „Na gut, ${fmtMoney(o.price)}. Mein letztes Wort!“`, 'good');
  } else if (Math.random() < 0.35) {
    S.salvage.listings = S.salvage.listings.filter(x => x.id !== o.id);
    toast('„Du willst mich wohl veräppeln? Verschwinde!“ – Der Verkäufer hat das Auto zurückgezogen.', 'bad', 5000);
  } else {
    o.price = Math.round(o.price * 1.05 / 100) * 100;
    toast(`„Jetzt kostet er ${fmtMoney(o.price)}. Frech kommt teuer!“`, 'bad');
  }
  addXP(5);
  rerender();
};
ACTIONS.svbuy = d => {
  const sv = ensureSalvage(), o = sv.listings.find(x => x.id === d.v); if (!o) return;
  if (sv.owned.length >= svSlots()) { toast(`Deine Gebrauchtwagen-Halle ist voll (${svSlots()} Plätze). Verkaufe oder zerlege zuerst ein Auto.`, 'bad', 4500); return; }
  if (S.money < o.price) { toast('Zu wenig Geld.', 'bad'); return; }
  S.money -= o.price;
  sv.listings = sv.listings.filter(x => x.id !== o.id);
  o.paid = o.price; o.boughtDay = S.day; sv.owned.push(o); sv.stats.bought++;
  // Nach dem Kauf zeigt sich die Wahrheit …
  const surprise = o.defects.filter(x => !x.known);
  o.defects.forEach(x => x.known = true);
  addXP(25);
  if (o.gem) { sv.stats.gems++; toast(`${ico('trophy', 'big')} <b>JACKPOT!</b> Der ${esc(o.name)} ist eine seltene Sonderedition! Wert x1.9!`, 'good', 7000); addXP(150); }
  if (surprise.length) toast(`${ico('fire', 'big')} Oh nein! Beim ${esc(o.name)} entdeckt: <b>${surprise.map(x => SV_DEFECTS[x.id].name).join(', ')}</b>`, 'bad', 7000);
  else if (!o.gem) toast(`${ico('car')} ${esc(o.name)} gekauft – keine bösen Überraschungen!`, 'good');
  SVSEL = o.id;
  checkAchievements();
  rerender();
};
ACTIONS.svrepair = d => {
  const o = svFind(d.k), df = o && o.defects.find(x => x.id === d.v && !x.fixed); if (!o || !df || svBusy(o)) return;
  const D = SV_DEFECTS[df.id], c = svRepairCost(o, df.id);
  if (S.money < c) { toast('Zu wenig Geld für die Reparatur.', 'bad'); return; }
  S.money -= c; o.paid += c; df.fixed = true; o.until = S.day + D.days; o.job = D.name + ' reparieren';
  svSyncWear(o); addXP(15);
  toast(`${ico('wrench')} Reparatur gestartet: ${D.name} (${D.days} Tage)`, 'good'); rerender();
};
ACTIONS.svrestore = d => {
  const o = svFind(d.v); if (!o || svBusy(o) || o.cond >= 100) return;
  const c = svRestoreCost(o);
  if (S.money < c) { toast('Zu wenig Geld.', 'bad'); return; }
  S.money -= c; o.paid += c; o.cond = Math.min(100, o.cond + 25); o.until = S.day + 3; o.job = 'Aufbereitung';
  svSyncWear(o); addXP(15);
  toast(`${ico('star')} Aufbereitung: Zustand jetzt ${o.cond} % (3 Tage)`, 'good'); rerender();
};
ACTIONS.svsell = d => {
  const sv = ensureSalvage(), o = sv.owned.find(x => x.id === d.v); if (!o || svBusy(o)) return;
  const p = svSellPrice(o), profit = p - o.paid;
  S.money += p; sv.owned = sv.owned.filter(x => x.id !== o.id);
  sv.stats.profit += profit; if (profit > 0) sv.stats.flips++;
  addXP(Math.max(20, profit / 400)); if (profit > 0) addRep(0.3);
  toast(`${ico('money')} ${esc(o.name)} verkauft für <b>${fmtMoney(p)}</b> – ${profit >= 0 ? '<span class="good">Gewinn ' + fmtMoney(profit) + '</span>' : '<span class="bad">Verlust ' + fmtMoney(-profit) + '</span>'}`, profit >= 0 ? 'good' : 'bad', 5000);
  checkAchievements(); rerender();
};
ACTIONS.svscrap = d => {
  const sv = ensureSalvage(), o = sv.owned.find(x => x.id === d.v); if (!o || svBusy(o)) return;
  confirmBox(`Den ${esc(o.name)} zerlegen? Du bekommst Teile-Geld und XP. Bei unbekannter Technik gibt es Forschungspunkte (Reverse Engineering).`, () => {
    const cls = o.design.cls, ci = classIdx(cls);
    const money = Math.round(svBaseValue(o) * 0.08 * (0.5 + o.cond / 200) / 100) * 100;
    S.money += money; sv.owned = sv.owned.filter(x => x.id !== o.id);
    let fp = 0;
    if (!classUnlocked(cls) && Math.random() < 0.7) fp++;
    if (!has(ENGINE_TYPES[o.engine.type].tech) && Math.random() < 0.6) fp++;
    if (!bodyUnlocked(o.design.body) && Math.random() < 0.3) fp++;
    S.rp += fp; addXP(40 + ci * 60);
    toast(`${ico('magnet')} Zerlegt: +${fmtMoney(money)}${fp ? ` · <b>Reverse Engineering: +${fp} Forschungspunkt${fp > 1 ? 'e' : ''}!</b>` : ''}`, 'good', 5000);
    renderNav(); rerender();
  }, 'Zerlegen');
};
ACTIONS.svrace = d => { RSEL.modelId = d.v; setTab('race'); };
ACTIONS.sv3d = d => { const o = svFind(d.v); if (o) open3D(o.design); };

/** Tageswechsel: Angebote erneuern, Reparaturen abschliessen */
function salvageDay() {
  if (!S.salvage) return;
  const sv = S.salvage;
  sv.listings = sv.listings.filter(l => l.expires > S.day);
  if (S.day >= sv.next) refreshListings();
  for (const o of sv.owned) if (o.until && o.until === S.day) { toast(`${ico('wrench')} Fertig: ${o.job} am ${esc(o.name)}`, 'good'); o.job = ''; }
}

// ---------- Pixel-Szene: Schrottplatz 320x110 ----------
let _yardBG = null;
function yardBackground() {
  if (_yardBG) return _yardBG;
  const W = 320, H = 110, pb = new PB(W, H);
  for (let y = 0; y < 60; y++) for (let x = 0; x < W; x++) pb.set(x, y, Crgb(mixRGB([86, 108, 134], [190, 170, 150], y / 60)));
  // Wolken
  for (let i = 0; i < 6; i++) for (let k = 0; k < 5; k++) pb.disc(20 + i * 55 + k * 6, 12 + (i * 7) % 16 - (k % 2) * 2, 5, Chex('#c8ccd4'));
  // Boden: Erde mit Pfützen und Öl
  for (let y = 60; y < H; y++) for (let x = 0; x < W; x++) {
    let c = shadeRGB([118, 92, 66], (hash2(x, y) - 0.5) * 0.2 - (y - 60) * 0.006);
    if (hash2(x >> 3, y >> 2) > 0.93) c = [70, 84, 104];
    pb.set(x, y, Crgb(c));
  }
  // Maschendrahtzaun
  for (let y = 30; y < 62; y++) for (let x = 0; x < W; x++) if (((x + y) % 6 === 0 || (x - y + 600) % 6 === 0)) pb.set(x, y, Chex('#8a8e98'));
  for (let x = 0; x < W; x += 40) pb.rect(x, 26, 2, 36, Chex('#566c86'));
  pb.rect(0, 29, W, 1, Chex('#a8acb8'));
  // Gestapelte Schrottautos links und rechts
  const crushed = (x, y, c) => { pb.rect(x, y, 34, 7, Chex(c)); pb.rect(x, y, 34, 1, Chex(shadeHex(c, 0.3))); pb.rect(x, y + 6, 34, 1, Chex(shadeHex(c, -0.5)));
    for (let i = 3; i < 34; i += 7) pb.rect(x + i, y + 2, 3, 2, Chex('#22263a')); for (let i = 0; i < 34; i += 3) if (hash2(x + i, y) > 0.6) pb.set(x + i, y + 3, Chex('#8a4a2a')); };
  const cols = ['#b13e53', '#3b5dc9', '#38b764', '#ffcd75', '#94b0c2', '#ef7d57', '#5d275d', '#257179'];
  for (let s = 0; s < 3; s++) for (let k = 0; k < 5 - s; k++) crushed(4 + s * 36, 64 - k * 7, cols[(s * 3 + k) % 8]);
  for (let s = 0; s < 2; s++) for (let k = 0; k < 4 - s; k++) crushed(244 + s * 36, 64 - k * 7, cols[(s * 5 + k + 2) % 8]);
  // Reifenberg
  for (let i = 0; i < 9; i++) { const cx = 120 + (i % 4) * 7 + (i > 3 ? 3 : 0) + (i > 6 ? 3 : 0), cy = 92 - Math.floor(i / 4) * 5; pb.disc(cx, cy, 4, Chex('#1e1e24')); pb.disc(cx, cy, 1.5, Chex('#3a3a44')); }
  // Bürocontainer mit Schild
  pb.rect(196, 40, 44, 24, Chex('#ef7d57')); for (let x = 198; x < 240; x += 4) pb.rect(x, 41, 1, 22, Chex('#b05a3a'));
  pb.rect(204, 46, 10, 7, Chex('#29366f')); pb.rect(204, 46, 10, 1, Chex('#73eff7')); pb.rect(222, 48, 8, 16, Chex('#5a3a28'));
  pb.rect(150, 14, 92, 11, Chex('#1a1c2c'));
  pb.rect(170, 25, 2, 15, Chex('#566c86')); pb.rect(220, 25, 2, 15, Chex('#566c86'));
  _yardBG = pb.canvas();
  return _yardBG;
}
function drawYard(ctx, o, t) {
  ctx.drawImage(yardBackground(), 0, 0);
  cxText(ctx, 'SCHROTT UND SCHÄTZE', 196, 17, '#ffcd75', 1, 'c');
  // Kran mit schwingendem Magneten
  const sw = Math.sin(t * 0.8) * 6;
  ctx.fillStyle = '#ffcd75'; ctx.fillRect(296, 4, 4, 92); ctx.fillRect(220, 4, 80, 3);
  for (let x = 222; x < 296; x += 6) { ctx.fillStyle = '#b08a3a'; ctx.fillRect(x, 7, 1, 3); }
  const mx = Math.round(250 + sw), my = 34;
  ctx.fillStyle = '#2a2b33'; ctx.fillRect(250, 7, 1, 1); for (let i = 0; i < 26; i++) ctx.fillRect(Math.round(250 + sw * i / 26), 7 + i, 1, 1);
  ctx.fillStyle = '#3a3e48'; ctx.fillRect(mx - 7, my, 14, 4); ctx.fillStyle = '#b13e53'; ctx.fillRect(mx - 7, my + 4, 14, 1);
  ctx.fillStyle = '#4a3c30'; ctx.fillRect(282, 92, 18, 8);
  if (!o) { cxText(ctx, 'WAEHLE EIN AUTO', 160, 80, '#f4f4f4', 1, 'c', '#000'); return; }
  const s = renderCar(o.design, { brand: o.brand });
  const x = Math.round(160 - s.W / 2), y = 104 - s.gy;
  ctx.drawImage(s.cv, x, y, s.W, s.H);
  // Preisschild an der Scheibe
  const owned = S.salvage && S.salvage.owned.includes(o);
  const tag = owned ? 'ZUSTAND ' + o.cond + '%' : fmtMoney(o.price).replace('’', "'");
  const tw = textW(tag) + 6, tx = Math.round(160 - tw / 2), ty = y - 4;
  ctx.fillStyle = '#0d0f1a'; ctx.fillRect(tx - 1, ty - 1, tw + 2, 9); ctx.fillStyle = owned ? '#38b764' : '#ffcd75'; ctx.fillRect(tx, ty, tw, 7);
  cxText(ctx, tag, 160, ty + 1, '#1a1c2c', 1, 'c');
  if (o.gem && (owned || o.inspected) && Math.floor(t * 4) % 2) cxText(ctx, '* SELTEN *', 160, ty - 8, '#ffcd75', 1, 'c', '#000');
}

// ---------- Tab ----------
let SVSEL = null;
function svCard(o, owned) {
  const D = o.defects, busy = owned && svBusy(o);
  const tags = D.map(x => x.known ? `<span class="tag ${x.fixed ? 'g' : 'r'}">${x.fixed ? '✓ ' : ''}${SV_DEFECTS[x.id].name}</span>` : '').join('') + (!owned && !o.inspected ? `<span class="tag">??? unbekannt</span>` : '') + (D.length === 0 && (owned || o.inspected) ? '<span class="tag g">keine Mängel</span>' : '');
  const car = computeCar(svEffective(o).d, svEffective(o).e);
  return `<div class="card" style="${SVSEL === o.id ? 'box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--yellow)' : ''}">
    <div style="background:linear-gradient(#94b0c2,#c8b8a0 70%,#76604a 70%);cursor:pointer" data-act="svsel" data-v="${o.id}"><img src="${carThumbURL(o.design, o.brand)}" style="width:100%;image-rendering:pixelated;display:block"></div>
    <div class="flex" style="margin-top:5px"><b style="font-size:16px">${esc(o.name)}</b><span class="tag">${CLASSES[o.design.cls].name}</span>${o.gem && (owned || o.inspected) ? '<span class="tag y">★ Sonderedition</span>' : ''}</div>
    <div class="hint" style="margin:2px 0">${ENGINE_TYPES[o.engine.type].name} · ${car.ps} PS (jetzt) · ${fmtNum(o.km)} km · 1/4 Meile ${car.t14.toFixed(2)} s</div>
    <div class="stat"><span>Zustand</span>${barHTML(o.cond, 100, o.cond > 70 ? 'var(--lime)' : o.cond > 40 ? 'var(--yellow)' : 'var(--red)')}<span>${o.cond} %</span></div>
    <div style="margin:4px 0">${tags}</div>
    ${owned ? `
      <div class="grid2" style="font-size:14px"><div>Investiert</div><div>${fmtMoney(o.paid)}</div><div>Verkaufswert</div><div class="${svSellPrice(o) >= o.paid ? 'good' : 'bad'}">${fmtMoney(svSellPrice(o))}</div></div>
      ${busy ? `<div class="warn" style="margin:4px 0">${ico('wrench')} ${o.job} – noch ${o.until - S.day} Tag(e)</div>` : `
      <div class="flex">${D.filter(x => !x.fixed && SV_DEFECTS[x.id].repair).map(x => `<button class="btn sm orange" data-act="svrepair" data-k="${o.id}" data-v="${x.id}">${SV_DEFECTS[x.id].name.split(' ').pop()} fixen ${fmtMoney(svRepairCost(o, x.id))}</button>`).join('')}
        ${o.cond < 100 ? `<button class="btn sm" data-act="svrestore" data-v="${o.id}">Aufbereiten +25% (${fmtMoney(svRestoreCost(o))})</button>` : ''}</div>
      <div class="flex"><button class="btn sm green" data-act="svsell" data-v="${o.id}">Verkaufen ${fmtMoney(svSellPrice(o))}</button>
        <button class="btn sm yellow" data-act="svrace" data-v="${o.id}">Drag Race</button><button class="btn sm dark" data-act="sv3d" data-v="${o.id}">3D</button>
        <button class="btn sm red" data-act="svscrap" data-v="${o.id}">Zerlegen</button></div>`}` : `
      <div class="hint" style="font-style:italic;color:var(--text)">Verkäufer: „${esc(o.desc)}“</div>
      <div class="flex" style="margin-top:4px"><b style="font-size:18px;color:var(--yellow)">${fmtMoney(o.price)}</b><span class="sp"></span><span class="muted" style="font-size:12px">noch ${o.expires - S.day} Tage</span></div>
      <div class="flex">${o.inspected ? '' : `<button class="btn sm" data-act="svinspect" data-v="${o.id}">Gutachter (${fmtMoney(svInspectCost(o))})</button>`}
        <button class="btn sm orange" data-act="svhaggle" data-v="${o.id}">Feilschen</button>
        <button class="btn sm green" data-act="svbuy" data-v="${o.id}">Kaufen</button></div>`}
  </div>`;
}
TABS.salvage = {
  title: 'Schrottplatz', icon: 'magnet',
  render(el) {
    const sv = ensureSalvage();
    if (!svFind(SVSEL)) SVSEL = (sv.owned[0] || sv.listings[0] || {}).id || null;
    el.innerHTML = `<h2 class="title">${ico('magnet', 'big')} Schrottplatz & Gebrauchtwagen</h2>
      <div class="panel dark" style="padding:6px"><canvas id="yardcv" width="320" height="110" class="cv"></canvas></div>
      <div class="panel"><div class="flex"><span>${ico('box')} Halle: <b>${sv.owned.length}/${svSlots()}</b> Plätze</span><span class="tag">Neue Angebote in ${Math.max(0, sv.next - S.day)} Tagen</span>
        <span class="tag g">Gewinn aus Flips: ${fmtMoney(sv.stats.profit)}</span><span class="tag y">Scheunenfunde: ${sv.stats.gems}</span></div>
        <div class="hint">Billig kaufen, reparieren, teuer verkaufen! Aber Vorsicht: Viele Mängel sind versteckt. Ein <b>Gutachter</b> deckt alles auf, <b>Feilschen</b> kann den Preis drücken – oder den Verkäufer verärgern.
        Kaputte Motoren können im Drag Race platzen. Autos mit noch nicht erforschter Technik kannst du <b>zerlegen</b> und bekommst Forschungspunkte. Und manchmal steht in der Scheune ein echter Schatz …</div></div>
      ${sv.owned.length ? `<h2 class="title" style="font-size:12px">${ico('car')} Deine Gebrauchten</h2><div class="cards">${sv.owned.map(o => svCard(o, true)).join('')}</div>` : ''}
      <h2 class="title" style="font-size:12px;margin-top:14px">${ico('money')} Aktuelle Angebote</h2>
      <div class="cards">${sv.listings.map(o => svCard(o, false)).join('') || '<div class="muted">Gerade keine Angebote.</div>'}</div>`;
  },
  tick(dt, t) { const cv = $('#yardcv'); if (cv) drawYard(hdCtx(cv), svFind(SVSEL), t); }
};

// ---------- Drag-Race-Anbindung: eigene Modelle + Gebrauchte ----------
/** liefert Fahrzeug für das Rennen: Modell-ID oder Gebrauchtwagen-ID */
function raceEntry(id) {
  const pe = premiumEntry(id);
  if (pe) { const h = (S.ptune || {})[id], tt = applyTune(pe.d, pe.e, h && h.tune); return { id, design: tt.d, engine: tt.e, name: pe.P.name, car: Object.assign(computeCar(tt.d, tt.e), { factory: true }), brand: 'PREMIUM' }; }
  const m = modelById(id);
  if (m) { const tt = applyTune(m, getEngine(m.engineId), m.tune); return { id, design: tt.d, engine: tt.e, name: m.name, car: computeCar(tt.d, tt.e), brand: S.company }; }
  const o = S.salvage && S.salvage.owned.find(x => x.id === id && !svBusy(x));
  if (!o) return null;
  const ef = svEffective(o), { d, e } = applyTune(ef.d, ef.e, o.tune);
  const motor = o.defects.find(x => x.id === 'motor' && !x.fixed);
  return { id, design: d, engine: e, name: o.name, car: computeCar(d, e), brand: o.brand, salvage: o, risk: motor ? SV_DEFECTS.motor.risk + (100 - o.cond) / 400 : 0 };
}
function raceOptions(sel) {
  const own = S.models.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)} – ${psStr(raceEntry(x.id).car)}${x.tune && Object.values(x.tune).some(v => v) ? ' (getunt)' : ''}</option>`).join('');
  const used = S.salvage ? S.salvage.owned.filter(o => !svBusy(o)).map(o => { const r = raceEntry(o.id); return `<option value="${o.id}" ${o.id === sel ? 'selected' : ''}>[Gebraucht] ${esc(o.name)} – ${r.car.ps} PS</option>`; }).join('') : '';
  const prem = (S.premium || []).map(id => { const r = raceEntry(id); return r ? `<option value="${id}" ${id === sel ? 'selected' : ''}>[Premium] ${esc(r.name)} – ${r.car.ps} PS</option>` : ''; }).join('');
  return own + prem + used;
}
