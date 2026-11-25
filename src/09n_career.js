/* =============================================================================
   Teil 9n: Karriere – acht Boss-Rivalen, einer pro Strecke, nacheinander zu schlagen.
   Belohnung: Geld, Diamanten, Erfahrung; wer alle schlägt, bekommt den Champion-Gold-Lack.
   ============================================================================= */
const BOSSES = [
  { id: 'b_sam', name: 'Sunset-Sam', brand: 'Nordwerk E-Coupé', track: 'sunset', dist: 'quarter', lvl: 2, react: [0.2, 0.35], skill: 0.55, prize: 8000, gems: 10, xp: 160,
    design: oppDesign('family', 'e30', '#f4f4f4', '#d82838', { sticker: 'racing', rim: 'mesh', rimColor: '#d4a640', tire: 4, ride: -2, spoiler: 'low', number: 12, numStyle: 'box' }), engine: oppEngine('i4', 1.4, 'super', 'alu', 5),
    face: { skin: '#f0c0a0', hair: '#c8a050', style: 'short', shirt: '#d82838', glasses: 'sun' }, hi: 'Der Sonnenuntergang gehört mir. Mal sehen, ob du mithältst.', lose: 'Okay… du bist echt. Die Wüste wartet auf dich.', win: 'Komm wieder, wenn du schalten gelernt hast.' },
  { id: 'b_dana', name: 'Dune Dana', brand: 'Brahma Corsaire', track: 'desert', dist: 'quarter', lvl: 4, react: [0.18, 0.32], skill: 0.62, prize: 18000, gems: 15, xp: 240,
    design: oppDesign('super', 'c6', '#d4a640', '#1a1c2c', { stripe: 'racing', rim: 'forged', rimColor: '#1a1c2c', tire: 5, ride: -2, lip: 'splitter' }), engine: oppEngine('v6', 2.9, 'none', 'alu', 6),
    face: { skin: '#c89070', hair: '#3a2010', style: 'long', shirt: '#d4a640', glasses: false }, hi: 'Sand im Getriebe? Hier draussen gewinnt nur Hubraum.', lose: 'Respekt. In Neon City fährt einer, der ist anders.', win: 'Die Hitze hat dich geschafft, was?' },
  { id: 'b_nico', name: 'Neon Nico', brand: 'Mazu Kreisel', track: 'night', dist: 'quarter', lvl: 6, react: [0.15, 0.28], skill: 0.7, prize: 35000, gems: 20, xp: 320,
    design: oppDesign('sport', 'rx7', '#5d275d', '#73eff7', { sticker: 'fade', rim: 'star', rimColor: '#73eff7', tire: 5, ride: -4, glow: '#73eff7', spoiler: 'gt', kit: 'wide' }), engine: oppEngine('rotary', 1.4, 'super', 'alu', 6),
    face: { skin: '#e0a882', hair: '#73eff7', style: 'slick', shirt: '#5d275d', glasses: 'sun' }, hi: 'Die Nacht ist mein Revier. Der Kreiskolben singt nur für mich.', lose: 'Mein Rotor… Am Flugplatz wartet der Captain.', win: 'Zu langsam für die Neonlichter.' },
  { id: 'b_kurt', name: 'Captain Kurt', brand: 'Falcon GT40', track: 'airfield', dist: 'half', lvl: 8, react: [0.14, 0.26], skill: 0.75, prize: 60000, gems: 25, xp: 420,
    design: oppDesign('super', 'fordgt', '#f4f4f4', '#3b5dc9', { stripe: 'racing', rim: 'dishmesh', tire: 6, ride: -2, spoiler: 'gt', number: 40, numStyle: 'circle' }), engine: oppEngine('v8', 3.5, 'none', 'alu', 6),
    face: { skin: '#f0c0a0', hair: '#94b0c2', style: 'cap', cap: '#3b5dc9', shirt: '#f4f4f4', glasses: 'sun' }, hi: 'Auf der Startbahn hebe ich ab – du bleibst am Boden.', lose: 'Gelandet. Auf Samui fährt Lek, die ist gnadenlos.', win: 'Tower an Rookie: Landeerlaubnis verweigert.' },
  { id: 'b_lek', name: 'Lamai Lek', brand: 'Toyota-Style Turbo', track: 'samui', dist: 'quarter', lvl: 10, react: [0.13, 0.24], skill: 0.8, prize: 90000, gems: 30, xp: 520,
    design: oppDesign('sport', 'supra', '#ef7d57', '#1a1c2c', { sticker: 'diagonal', rim: 'forged', rimColor: '#1a1c2c', tire: 6, ride: -3, spoiler: 'swan', lip: 'carbon' }), engine: oppEngine('i6', 3.9, 'none', 'alu', 6),
    face: { skin: '#c89070', hair: '#1a1c2c', style: 'bob', shirt: '#ef7d57', glasses: false }, hi: 'Willkommen auf der Insel. Hier fährt man schnell oder gar nicht.', lose: 'Gut gefahren! In Japan wartet Yuki – die Beste.', win: 'Geh lieber an den Strand, Tourist.' },
  { id: 'b_yuki', name: 'Yuki Tanaka', brand: 'Nissun R-Spec', track: 'japan', dist: 'quarter', lvl: 12, react: [0.12, 0.22], skill: 0.85, prize: 140000, gems: 35, xp: 640,
    design: oppDesign('sport', 'r34', '#29366f', '#f4f4f4', { sticker: 'sakura', rim: 'mesh', rimColor: '#c8ccd4', tire: 6, ride: -3, spoiler: 'gt', lip: 'splitter' }), engine: oppEngine('i6', 2.8, 'turbo', 'alu', 6),
    face: { skin: '#f0c0a0', hair: '#1a1c2c', style: 'long', shirt: '#29366f', glasses: false }, hi: 'Unter dem Fuji gibt es keine zweite Chance.', lose: 'Sugoi… Fahr in die Schweizer Berge. Gian ist ein Fuchs.', win: 'Übe weiter. Vielleicht nächstes Jahr.' },
  { id: 'b_gian', name: 'Gletscher-Gian', brand: 'Porsch-Art 930', track: 'swiss', dist: 'half', lvl: 14, react: [0.11, 0.2], skill: 0.9, prize: 220000, gems: 45, xp: 800,
    design: oppDesign('sport', 's911', '#2f6a48', '#f4f4f4', { stripe: 'side', rim: 'multi', rimColor: '#c8ccd4', tire: 6, ride: -2, spoiler: 'ducktail' }), engine: oppEngine('flat6', 3.2, 'super', 'alu', 7),
    face: { skin: '#f0c0a0', hair: '#8a5a3c', style: 'short', shirt: '#2f6a48', glasses: false }, hi: 'Grüezi. Am Berg zählt Präzision, nicht Lärm.', lose: 'Uff. Am Vulkan wartet der König. Viel Glück.', win: 'Gemach, gemach. Der Berg ist geduldig.' },
  { id: 'b_viktor', name: 'Vulkan-König Viktor', brand: 'Bugari Hyper', track: 'volcano', dist: 'mile', lvl: 18, react: [0.1, 0.18], skill: 0.95, prize: 500000, gems: 80, xp: 1400, final: true,
    design: oppDesign('hyper', 'chiron', '#1a1c2c', '#d82838', { stripe: 'twotone', rim: 'forged', rimColor: '#d82838', tire: 6, ride: -3, spoiler: 'active', glow: '#d82838' }), engine: oppEngine('w16', 7.0, 'none', 'steel', 7),
    face: { skin: '#c89070', hair: '#1a1c2c', style: 'crown', shirt: '#d82838', glasses: 'sun' }, hi: 'Niemand schlägt den König auf seinem eigenen Vulkan.', lose: 'Unmöglich… Die Krone gehört dir. Fahr sie in Gold.', win: 'Die Lava ist heisser als dein Motor.' }
];
for (const b of BOSSES) OPP_INFO[b.id] = Object.assign({ hi: [b.hi], win: [b.win], lose: [b.lose] }, b.face);
const career = () => (S.career = S.career || { beat: [] });
function bossState(i) {
  const b = BOSSES[i], c = career();
  if (c.beat.includes(b.id)) return 'beat';
  if (i > 0 && !c.beat.includes(BOSSES[i - 1].id)) return 'prev';
  if (S.level < b.lvl) return 'lvl';
  return 'open';
}
ACTIONS.cstart = d => {
  const i = BOSSES.findIndex(b => b.id === d.v), b = BOSSES[i]; if (!b) return;
  const st = bossState(i);
  if (st === 'prev') { toast('Schlag zuerst ' + BOSSES[i - 1].name + '.', 'bad'); return; }
  if (st === 'lvl') { toast('Dieser Boss wartet ab Level ' + b.lvl + '.', 'bad'); return; }
  const m = raceEntry(RSEL.modelId); if (!m) return;
  startRace({ player: { design: m.design, engine: m.engine, name: m.name, brand: m.brand, blowAt: m.risk && Math.random() < m.risk ? rand(1.2, 7) : null, salvageId: m.salvage ? m.id : null },
    opp: { design: b.design, engine: b.engine, name: b.name, brand: b.brand, react: b.react, skill: b.skill },
    dist: b.dist, prize: st === 'beat' ? Math.round(b.prize * 0.15) : b.prize, xp: st === 'beat' ? Math.round(b.xp * 0.3) : b.xp, rep: 2, fee: 0, oppId: b.id, track: b.track, tod: b.track === 'night' ? 'night' : null, career: b.id });
};
/** nach dem Rennen: Fortschritt und Belohnungen */
function careerAfterRace(cfg, win) {
  if (!cfg.career) return '';
  const b = BOSSES.find(x => x.id === cfg.career), c = career();
  if (!b) return '';
  if (!win) return `<div class="card"><b>${esc(b.name)} bleibt ungeschlagen.</b><div class="hint">Tipp: Reifen im Burnout warm machen, im grünen Drehzahlbereich starten und bei den blauen Lichtern schalten. Mehr Leistung gibt es in Tuning und Motor-Designer.</div></div>`;
  if (c.beat.includes(b.id)) return `<div class="card good"><b>Revanche gewonnen!</b> ${esc(b.name)} gibt dir Respekt.</div>`;
  c.beat.push(b.id);
  S.gems = (S.gems || 0) + b.gems;
  let extra = '';
  if (b.final) { c.gold = true; extra = `<div class="good" style="margin-top:4px">👑 Du bist der <b>Champion</b>! Neuer Lack freigeschaltet: <b>Champion-Gold</b> (Auto-Designer → Lackart).</div>`; }
  const next = BOSSES[BOSSES.indexOf(b) + 1];
  return `<div class="card" style="box-shadow:0 0 0 3px var(--yellow)"><b style="color:var(--yellow)">BOSS BESIEGT: ${esc(b.name)}</b> · +${b.gems} Diamanten${extra}
    ${next ? `<div class="hint">Nächster Rivale: <b>${esc(next.name)}</b> (${esc(TRACKS[next.track].name)}, ab Level ${next.lvl})</div>` : ''}</div>`;
}
TABS.career = {
  title: 'Karriere', icon: 'trophy',
  render(el) {
    const c = career(), n = c.beat.length;
    if (!raceEntry(RSEL.modelId)) RSEL.modelId = S.models[0].id;
    el.innerHTML = `<h2 class="title">${ico('trophy', 'big')} Karriere – ${n} / ${BOSSES.length} Bosse besiegt</h2>
    <div class="panel"><div class="pbar"><i style="width:${n / BOSSES.length * 100}%"></i><em>${n === BOSSES.length ? 'CHAMPION!' : 'Schlag alle acht Rivalen – der letzte schenkt dir den Champion-Gold-Lack'}</em></div>
      <div class="flex" style="margin-top:6px"><span class="lbl" style="margin:0">Dein Auto</span><select data-inp="rcar" style="flex:1">${raceOptions(RSEL.modelId)}</select></div></div>
    <div class="cards">${BOSSES.map((b, i) => {
      const st = bossState(i), oc = computeCar(b.design, b.engine), T = TRACKS[b.track];
      const badge = st === 'beat' ? '<span class="tag g">✓ BESIEGT</span>' : st === 'open' ? '<span class="tag y">BEREIT</span>' : st === 'lvl' ? `<span class="tag r">AB LEVEL ${b.lvl}</span>` : '<span class="tag">GESPERRT</span>';
      return `<div class="card ${st === 'prev' || st === 'lvl' ? 'locked' : ''}" ${b.final ? 'style="box-shadow:0 0 0 3px var(--red)"' : ''}>
        <div class="flex">${faceImg(b.id, 48)}<div style="flex:1"><b style="font-size:16px">${i + 1}. ${esc(b.name)}</b> ${badge}<div class="hint" style="margin:0">${esc(T.name)} · ${distOf(b.dist).short} · ${esc(b.brand)} · ${oc.ps} PS</div></div></div>
        <div style="background:#22263a;margin:6px 0"><img src="${carThumbURL(b.design, b.brand)}" style="width:100%;image-rendering:pixelated;display:block"></div>
        ${st === 'prev' ? '<div class="hint">Schlag zuerst den Boss davor.</div>' : `<div class="hint" style="color:var(--text)"><i>„${esc(st === 'beat' ? b.lose : b.hi)}“</i></div>`}
        <div class="flex"><span class="tag g">${fmtMoney(b.prize)}</span><span class="tag y">+${b.gems} 💎</span><span class="tag">${b.xp} XP</span><span class="sp"></span>
          <button class="btn ${st === 'open' ? 'green' : st === 'beat' ? 'gray' : 'lock'}" data-act="cstart" data-v="${b.id}">${st === 'beat' ? 'Revanche' : 'Herausfordern'}</button></div></div>`;
    }).join('')}</div>`;
  }
};
