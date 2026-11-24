/* =============================================================================
   Teil 9g: Shop mit In-App-Käufen
   Premium-Währung „Diamanten“: Premium-Rennwagen, Booster, exklusiver Lack.
   ACHTUNG: Echte Zahlungen sind in einer reinen HTML-Datei nicht möglich.
   IAP.purchase() läuft im TESTMODUS (kein echtes Geld). Für echte Käufe muss
   hier später ein Zahlungsanbieter (App Store, Google Play Billing, Stripe …)
   angebunden werden – die restliche Spiellogik bleibt gleich.
   ============================================================================= */
ICONS.gem = ['........', '..kkkk..', '.kcwcck.', 'kcwccbbk', '.kccbbk.', '..kcbk..', '...kk...', '........'];

// ---------- Kauf-Schnittstelle ----------
const IAP = {
  provider: 'demo',            // später z. B. 'stripe' | 'appstore' | 'playstore'
  /** Startet einen Kauf. Liefert ein Promise, das bei Erfolg mit true aufgelöst wird. */
  purchase(product) {
    if (adminInf('freeShop')) { toast(`${ico('crown')} Admin: ${product.name} gratis`, 'good', 1800); return Promise.resolve(true); }
    return new Promise(resolve => {
      ACTIONS._iapOk = () => { closeModal(); resolve(true); };
      ACTIONS._iapNo = () => { closeModal(); resolve(false); };
      openModal(`<h2 class="title">${ico('gem', 'big')} Kauf bestätigen</h2>
        <div class="card"><div class="flex"><b style="font-size:18px">${product.name}</b><span class="sp"></span><b style="font-size:18px;color:var(--yellow)">${product.price}</b></div></div>
        <div class="card" style="box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--orange)"><b class="warn">TESTMODUS</b> – es wird <b>kein echtes Geld</b> abgebucht.
          <div class="hint">Für echte Käufe muss das Spiel später mit einem Zahlungsanbieter (z. B. App Store, Google Play oder Stripe) verbunden werden.</div></div>
        <div class="flex" style="margin-top:8px"><button class="btn green big" data-act="_iapOk">Kauf simulieren</button><button class="btn gray" data-act="_iapNo">Abbrechen</button></div>`, true);
    });
  }
};

// ---------- Angebote ----------
const GEM_PACKS = [
  { id: 'gems_s',  gems: 100,  bonus: 0,    price: 'CHF 1.00' },
  { id: 'gems_m',  gems: 550,  bonus: 50,   price: 'CHF 5.00',  tag: 'Beliebt' },
  { id: 'gems_l',  gems: 1200, bonus: 200,  price: 'CHF 10.00' },
  { id: 'gems_xl', gems: 2600, bonus: 600,  price: 'CHF 20.00', tag: 'Bester Wert' },
  { id: 'gems_xxl', gems: 7000, bonus: 2000, price: 'CHF 50.00' }
];
const STARTER = { id: 'starter', name: 'Starterpaket', price: 'CHF 3.00', gems: 500, money: 75000, car: 'pc_ronin', desc: '500 Diamanten + $75\'000 + Premium-Auto „Neon Ronin“ – nur einmal kaufbar!' };
const PREMIUM_CARS = [
  { id: 'pc_ronin', name: 'Neon Ronin', price: 400, desc: 'Street-Coupé mit Widebody und Neon.',
    design: oppDesign('sport', 'coupe', '#101014', '#ff4bd0', { stripe: 'none', sticker: 'speed', paint: 'gloss', rim: 'star', rimColor: '#ff4bd0', tire: 5, kit: 'wide', glow: '#ff4bd0', ride: -5, spoiler: 'gt', lip: 'carbon', skirts: 'carbon', banner: true, number: 13, tint: 4 }),
    engine: oppEngine('v6', 3.8, 'twin', 'alu', 7, 'small', 1, 'short') },
  { id: 'pc_storm', name: 'Desert Storm', price: 650, desc: 'Geländemonster mit Kompressor-V8.',
    design: oppDesign('suv', 'offroad', '#d48a3c', '#1a1c2c', { stripe: 'twotone', paint: 'matte', rim: 'dishmesh', rimColor: '#2a2a30', tire: 6, kit: 'wide', ride: 2, glow: '#ef7d57', number: 77 }),
    engine: oppEngine('v8', 6.5, 'super', 'alu', 6, 'big') },
  { id: 'pc_gold', name: 'Goldfinger GT', price: 1100, desc: 'Gran Turismo mit Twin-Turbo-V12 in Gold-Metallic.',
    design: oppDesign('super', 'gt', '#d4a640', '#101014', { paint: 'metallic', stripe: 'double', rim: 'forged', rimColor: '#101014', tire: 6, spoiler: 'swan', lip: 'carbon', skirts: 'carbon', diffuser: 'race', ride: -3, kit: 'race' }),
    engine: oppEngine('v12', 6.5, 'twin', 'titan', 8, 'small') },
  { id: 'pc_thunder', name: 'Raijin Thunder EV', price: 1500, desc: 'Elektro-Hypercar mit vier Motoren – brutaler Start.',
    design: oppDesign('hyper', 'hyperA', '#73eff7', '#29366f', { stripe: 'racing', paint: 'pearl', rim: 'blade', rimColor: '#f4f4f4', tire: 6, spoiler: 'active', lip: 'carbon', diffuser: 'race', ride: -3, glow: '#73eff7' }),
    engine: oppEngine('ev', 120, 'none', 'titan', 1, 'none', 4, 'normal') },
  { id: 'pc_phantom', name: 'Phantom X', price: 2400, desc: 'Le-Mans-Prototyp mit W16, grosses NOS. Das schnellste Auto im Spiel.',
    design: oppDesign('hyper', 'lmp', '#1a1c2c', '#a7f070', { stripe: 'racing', paint: 'matte', rim: 'forged', rimColor: '#a7f070', tire: 6, spoiler: 'active', lip: 'carbon', skirts: 'carbon', diffuser: 'race', ride: -3, kit: 'race', glow: '#a7f070', number: 1 }),
    engine: oppEngine('w16', 8.5, 'twin', 'titan', 8, 'big') }
];
const BOOSTERS = [
  { id: 'xp2',    name: 'Doppelte XP (7 Tage)',   price: 120, desc: 'Alle XP zählen 7 Spieltage lang doppelt.' },
  { id: 'cash',   name: 'Geldkoffer',             price: 80,  desc: 'Sofort Bargeld – wächst mit deinem Level.' },
  { id: 'rp',     name: 'Forscher-Paket (+2 FP)', price: 150, desc: 'Zwei Forschungspunkte sofort.' },
  { id: 'skip',   name: 'Zeitsprung (7 Tage)',    price: 60,  desc: 'Produktion & Verkauf von 7 Tagen sofort.' },
  { id: 'repair', name: 'Turbo-Mechaniker',       price: 40,  desc: 'Alle Reparaturen am Schrottplatz sofort fertig.' },
  { id: 'tv',     name: 'Gratis TV-Kampagne',     price: 100, desc: 'Startet sofort einen TV-Spot (auch ohne Forschung).' }
];
const STYLE_ITEMS = [
  { id: 'shop_pearl', name: 'Perleffekt-Lack', price: 250, desc: 'Lackart, die je nach Licht die Farbe wechselt.' },
  { id: 'shop_neon',  name: 'Neon- & Felgenfarben-Paket', price: 180, desc: '6 zusätzliche Neonfarben und 6 Felgenfarben.' }
];
const GLOWS_PRO = ['#ff2040', '#20ff90', '#ffe040', '#9040ff', '#ff8020', '#40c0ff'];
const RIM_COLORS_PRO = ['#ffe080', '#e0e8ff', '#ff6040', '#40ff80', '#8a40ff', '#101014'];
const cashAmount = () => Math.round(15000 * Math.pow(S.level, 1.3) / 1000) * 1000;

// ---------- Premium-Autos im Spiel ----------
const premiumById = id => PREMIUM_CARS.find(p => p.id === id);
const ownsPremium = id => (S.premium || []).includes(id);
function premiumEntry(id) {
  const P = premiumById(id); if (!P || !ownsPremium(id)) return null;
  const d = Object.assign(clone(P.design), { name: P.name, id }), e = Object.assign(clone(P.engine), { name: P.name });
  return { d, e, P };
}

// ---------- Aktionen ----------
function spendGems(n, what) {
  if (adminInf('freeShop')) { sfx('buy'); toast(`${ico('crown')} ${what} gratis (Admin)`, 'good'); return true; }
  if ((S.gems || 0) < n) { toast(`Zu wenig Diamanten (${n} nötig).`, 'bad'); setTab('shop'); return false; }
  S.gems -= n; updateTopbar(true); sfx('buy');
  toast(`${ico('gem')} ${what} gekauft (−${n} Diamanten)`, 'good');
  return true;
}
ACTIONS.shopPack = async d => {
  const P = GEM_PACKS.find(x => x.id === d.v); if (!P) return;
  const ok = await IAP.purchase({ id: P.id, name: `${P.gems + P.bonus} Diamanten`, price: P.price });
  if (!ok) return;
  S.gems = (S.gems || 0) + P.gems + P.bonus; S.shopStats = S.shopStats || {}; S.shopStats.bought = (S.shopStats.bought || 0) + 1;
  toast(`${ico('gem', 'big')} <b>+${P.gems + P.bonus} Diamanten!</b>`, 'good'); saveGame(); rerender();
};
ACTIONS.shopStarter = async () => {
  if (S.starterBought) return;
  const ok = await IAP.purchase({ id: STARTER.id, name: STARTER.name, price: STARTER.price });
  if (!ok) return;
  S.starterBought = true; S.gems = (S.gems || 0) + STARTER.gems; S.money += STARTER.money;
  S.premium = S.premium || []; if (!S.premium.includes(STARTER.car)) S.premium.push(STARTER.car);
  toast(`${ico('gem', 'big')} <b>Starterpaket aktiviert!</b> Der Neon Ronin steht in deiner Garage.`, 'good', 6000); saveGame(); rerender();
};
ACTIONS.shopCar = d => {
  const P = premiumById(d.v); if (!P || ownsPremium(P.id)) return;
  confirmBox(`<b>${P.name}</b> für ${ico('gem')} ${P.price} Diamanten kaufen?`, () => {
    if (!spendGems(P.price, P.name)) return;
    S.premium = S.premium || []; S.premium.push(P.id); addXP(100); saveGame(); rerender();
  }, 'Kaufen');
};
ACTIONS.shopBoost = d => {
  const B = BOOSTERS.find(x => x.id === d.v); if (!B) return;
  if (B.id === 'repair' && !(S.salvage && S.salvage.owned.some(o => svBusy(o)))) { toast('Gerade läuft keine Reparatur.', 'bad'); return; }
  if (B.id === 'tv' && S.campaigns.some(c => c.id === 'tv')) { toast('Ein TV-Spot läuft bereits.', 'bad'); return; }
  if (!spendGems(B.price, B.name)) return;
  switch (B.id) {
    case 'xp2': S.boost = S.boost || {}; S.boost.xpUntil = Math.max(S.day, S.boost.xpUntil || 0) + 7; break;
    case 'cash': S.money += cashAmount(); break;
    case 'rp': S.rp += 2; renderNav(); break;
    case 'skip': for (let i = 0; i < 7; i++) { tickProduction(1); dayTick(); } break;
    case 'repair': S.salvage.owned.forEach(o => { if (svBusy(o)) { o.until = S.day; o.job = ''; } }); break;
    case 'tv': { const C0 = CAMPAIGNS.find(c => c.id === 'tv'); S.campaigns.push({ id: 'tv', until: S.day + C0.days }); S.stats.adsRun.tv = (S.stats.adsRun.tv || 0) + 1; break; }
  }
  saveGame(); rerender();
};
ACTIONS.shopStyle = d => {
  const I = STYLE_ITEMS.find(x => x.id === d.v); if (!I || has(I.id)) return;
  if (!spendGems(I.price, I.name)) return;
  S.techs.push(I.id); saveGame(); rerender();
};
ACTIONS.shopDaily = () => {
  const today = new Date().toDateString();
  if (S.dailyGift === today) return;
  S.dailyGift = today; S.gems = (S.gems || 0) + 15;
  toast(`${ico('gem')} Tägliches Geschenk: <b>+15 Diamanten</b>. Komm morgen wieder!`, 'good'); saveGame(); rerender();
};
ACTIONS.shop3d = d => { const p = premiumEntry(d.v) || { d: Object.assign(clone(premiumById(d.v).design), { name: premiumById(d.v).name }) }; open3D(p.d); };
ACTIONS.shopRace = d => { RSEL.modelId = d.v; setTab('race'); };

// ---------- Shop-Tab ----------
TABS.shop = {
  title: 'Shop', icon: 'gem',
  render(el) {
    S.gems = S.gems || 0;
    const dailyOk = S.dailyGift !== new Date().toDateString();
    const xpOn = S.boost && S.boost.xpUntil > S.day;
    el.innerHTML = `<h2 class="title">${ico('gem', 'big')} Shop</h2>
    <div class="panel"><div class="flex"><span style="font-size:22px">${ico('gem', 'big')} <b>${fmtNum(S.gems)}</b> Diamanten</span><span class="sp"></span>
      ${dailyOk ? `<button class="btn yellow" data-act="shopDaily">${ico('star')} Tägliches Geschenk: +15</button>` : '<span class="tag">Geschenk heute schon abgeholt</span>'}
      ${xpOn ? `<span class="tag g">Doppelte XP noch ${S.boost.xpUntil - S.day} Tage</span>` : ''}</div>
      <div class="hint">Diamanten bekommst du auch im Spiel: +5 pro erreichtem Ziel, +10 pro Erfolg, bis zu +30 für einen Liga-Pokal und jeden Tag ein Geschenk.</div></div>
    ${S.starterBought ? '' : `<div class="panel" style="background:linear-gradient(90deg,#5d275d,#29366f)"><div class="flex">${ico('star', 'big')}<div style="flex:1"><b style="font-size:20px">${STARTER.name}</b><div class="hint" style="color:var(--text)">${STARTER.desc}</div></div>
      <button class="btn yellow big" data-act="shopStarter">${STARTER.price}</button></div></div>`}
    <div class="panel"><h3>${ico('gem')}Diamanten kaufen</h3>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(170px,1fr))">${GEM_PACKS.map(P => `<div class="card" style="text-align:center">
        ${P.tag ? `<div class="tag y">${P.tag}</div>` : '<div class="tag" style="visibility:hidden">-</div>'}
        <div style="margin:6px 0">${Array.from({ length: Math.min(5, 1 + GEM_PACKS.indexOf(P)) }, () => ico('gem', 'big')).join('')}</div>
        <b style="font-size:22px">${fmtNum(P.gems)}</b>${P.bonus ? `<div class="good">+${fmtNum(P.bonus)} Bonus</div>` : '<div>&nbsp;</div>'}
        <button class="btn green" style="width:90%" data-act="shopPack" data-v="${P.id}">${P.price}</button></div>`).join('')}</div>
      <div class="hint"><b class="warn">Testmodus:</b> Käufe werden nur simuliert, es wird kein echtes Geld abgebucht.</div></div>
    <div class="panel"><h3>${ico('car')}Premium-Rennwagen</h3>
      <div class="hint" style="margin-bottom:6px">Exklusive Autos, die du nicht selbst bauen kannst. Fahrbar im Drag Race und in der Liga, tunbar in der Werkstatt.</div>
      <div class="cards">${PREMIUM_CARS.map(P => { const c = computeCar(P.design, P.engine), own = ownsPremium(P.id);
        return `<div class="card" style="${own ? 'box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--lime)' : ''}">
          <div style="background:linear-gradient(#1a1c2c,#3b2a5a 70%,#14151c 70%);padding:4px 0"><img src="${carThumbURL(P.design, 'PREMIUM')}" style="width:100%;image-rendering:pixelated;display:block"></div>
          <div class="flex" style="margin-top:5px"><b style="font-size:17px">${P.name}</b><span class="tag y">Premium</span></div>
          <div class="hint" style="margin:2px 0">${P.desc}</div>
          <div class="grid2" style="font-size:14px"><div>Leistung</div><div>${c.ps} PS</div><div>0–100</div><div>${c.t100.toFixed(2)} s</div><div>1/4 Meile</div><div>${c.t14.toFixed(2)} s</div><div>Vmax</div><div>${c.top} km/h</div></div>
          <div class="flex">${own ? `<span class="good">${ico('check')} In deiner Garage</span><span class="sp"></span><button class="btn sm orange" data-act="shopRace" data-v="${P.id}">Rennen</button>`
            : `<button class="btn green" data-act="shopCar" data-v="${P.id}">${ico('gem')} ${fmtNum(P.price)}</button>`}<button class="btn sm dark" data-act="shop3d" data-v="${P.id}">3D</button></div></div>`; }).join('')}</div></div>
    <div class="row">
      <div class="col"><div class="panel"><h3>${ico('fire')}Booster</h3>${BOOSTERS.map(B => `<div class="card"><div class="flex"><div style="flex:1"><b>${B.name}</b><div class="hint" style="margin:0">${B.desc}${B.id === 'cash' ? ` (jetzt ${fmtMoney(cashAmount())})` : ''}</div></div>
        <button class="btn sm green" data-act="shopBoost" data-v="${B.id}">${ico('gem')} ${B.price}</button></div></div>`).join('')}</div></div>
      <div class="col"><div class="panel"><h3>${ico('star')}Lack & Style</h3>${STYLE_ITEMS.map(I => `<div class="card"><div class="flex"><div style="flex:1"><b>${I.name}</b><div class="hint" style="margin:0">${I.desc}</div></div>
        ${has(I.id) ? `<span class="good">${ico('check')} Freigeschaltet</span>` : `<button class="btn sm green" data-act="shopStyle" data-v="${I.id}">${ico('gem')} ${I.price}</button>`}</div></div>`).join('')}
        <div class="hint">Freigeschalteter Lack und Farben erscheinen im Auto-Designer.</div></div></div>
    </div>`;
  }
};
