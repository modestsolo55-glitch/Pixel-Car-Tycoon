/* =============================================================================
   Teil 9h: Konten, Anmeldung und Super-Admin
   Jedes Konto hat einen eigenen Spielstand. Konten liegen im localStorage des
   Browsers. HINWEIS: Das ist ein lokales Login ohne Server – wer Zugriff auf
   den Browser hat, kann die Daten ändern. Für echte Sicherheit braucht es
   später einen Server mit Datenbank.
   ============================================================================= */
ICONS.crown = ['........', '.k.kk.k.', 'kykyykyk', 'kyyyyyyk', 'kyryyeyk', 'kyyyyyyk', 'kooooook', 'kkkkkkkk'];
ICONS.user = ['..kkkk..', '.kssssk.', '.kswwsk.', '.kssssk.', '..kkkk..', '.kbbbbk.', 'kbbbbbbk', 'kkkkkkkk'];

const ACC_KEY = 'autotycoon_accounts';
const SES_KEY = 'autotycoon_session';
let AUTH_USER = null;                     // angemeldeter Benutzername (klein geschrieben)

// ---------- Passwort-Hash (gesalzen, mehrfach) ----------
function _h53(str, seed) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}
function pwHash(pw, salt) { let h = salt + ':' + pw; for (let i = 0; i < 2000; i++) h = _h53(h + pw, i); return h; }
const newSalt = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---------- Kontenspeicher ----------
function loadAccounts() {
  let a = null;
  try { a = JSON.parse(localStorage.getItem(ACC_KEY) || 'null'); } catch (e) { a = null; }
  if (!a || typeof a.users !== 'object') a = { users: {} };
  // Super-Admin-Konto immer vorhanden (Standard: admin / admin)
  if (!a.users.admin) { const s = newSalt(); a.users.admin = { name: 'admin', salt: s, hash: pwHash('admin', s), role: 'superadmin', created: Date.now(), last: 0 }; saveAccounts(a); }
  return a;
}
function saveAccounts(a) { try { localStorage.setItem(ACC_KEY, JSON.stringify(a)); } catch (e) { /* ignorieren */ } }
const userKey = n => String(n || '').trim().toLowerCase();
const currentAccount = () => AUTH_USER ? loadAccounts().users[AUTH_USER] : null;
const isAdmin = () => { const u = currentAccount(); return !!(u && (u.role === 'superadmin' || u.role === 'admin')); };
const isSuperAdmin = () => { const u = currentAccount(); return !!(u && u.role === 'superadmin'); };
const saveKeyFor = n => SAVE_KEY + ':' + userKey(n);
const ROLE_NAME = { superadmin: 'Super-Admin', admin: 'Admin', player: 'Spieler' };

function checkLogin(name, pw) {
  const u = loadAccounts().users[userKey(name)];
  return !!(u && pwHash(pw, u.salt) === u.hash);
}
function createAccount(name, pw, role = 'player') {
  const k = userKey(name);
  if (!/^[a-z0-9_.-]{3,16}$/.test(k)) return 'Benutzername: 3–16 Zeichen (Buchstaben, Zahlen, _ . -).';
  if (String(pw).length < 4) return 'Passwort: mindestens 4 Zeichen.';
  const a = loadAccounts();
  if (a.users[k]) return 'Diesen Benutzernamen gibt es schon.';
  const s = newSalt();
  a.users[k] = { name: String(name).trim(), salt: s, hash: pwHash(pw, s), role, created: Date.now(), last: 0 };
  saveAccounts(a);
  return null;
}

// ---------- Anmeldebildschirm ----------
let _loginMode = 'login';
function showLogin(msg) {
  const el = $('#login'); el.classList.remove('hidden');
  const reg = _loginMode === 'register';
  const car = PREMIUM_CARS[(Math.random() * PREMIUM_CARS.length) | 0];
  el.innerHTML = `<div class="lbox">
      <div class="lhead">${ico('car', 'big')}<span>AutoTycoon</span></div>
      <img class="lcar" src="${carThumbURL(car.design, 'PREMIUM')}" alt="">
      <h3>${reg ? 'Neues Konto erstellen' : 'Anmelden'}</h3>
      ${msg ? `<div class="lmsg">${msg}</div>` : ''}
      <div class="lbl">Benutzername</div>
      <input type="text" id="lg-user" maxlength="16" autocomplete="username" spellcheck="false">
      <div class="lbl">Passwort</div>
      <input type="password" id="lg-pw" maxlength="40" autocomplete="${reg ? 'new-password' : 'current-password'}">
      ${reg ? `<div class="lbl">Passwort wiederholen</div><input type="password" id="lg-pw2" maxlength="40" autocomplete="new-password">` : ''}
      <label class="lrem"><input type="checkbox" id="lg-rem" checked> Angemeldet bleiben</label>
      <button class="btn green big" style="width:calc(100% - 8px)" data-act="${reg ? 'lgRegister' : 'lgLogin'}">${reg ? 'Konto erstellen' : 'Einloggen'}</button>
      <button class="btn gray" style="width:calc(100% - 8px)" data-act="lgMode">${reg ? 'Ich habe schon ein Konto' : 'Neues Konto erstellen'}</button>
      <div class="hint" style="margin-top:8px">Jedes Konto hat seinen eigenen Spielstand.</div>
    </div>`;
  setTimeout(() => { const i = $('#lg-user'); if (i) i.focus(); }, 30);
}
ACTIONS.lgMode = () => { _loginMode = _loginMode === 'login' ? 'register' : 'login'; showLogin(); };
ACTIONS.lgLogin = () => {
  const n = $('#lg-user').value, pw = $('#lg-pw').value;
  if (!checkLogin(n, pw)) { sfx('bad'); showLogin('<b class="bad">Benutzername oder Passwort falsch.</b>'); const u = $('#lg-user'); if (u) u.value = n; return; }
  loginAs(userKey(n), $('#lg-rem').checked);
};
ACTIONS.lgRegister = () => {
  const n = $('#lg-user').value, pw = $('#lg-pw').value, pw2 = $('#lg-pw2').value;
  const err = pw !== pw2 ? 'Die Passwörter stimmen nicht überein.' : createAccount(n, pw);
  if (err) { sfx('bad'); showLogin(`<b class="bad">${err}</b>`); const u = $('#lg-user'); if (u) u.value = n; return; }
  loginAs(userKey(n), $('#lg-rem').checked, true);
};
// Enter-Taste im Anmeldeformular
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || $('#login').classList.contains('hidden')) return;
  e.preventDefault(); (ACTIONS[_loginMode === 'register' ? 'lgRegister' : 'lgLogin'])();
});

function loginAs(k, remember, fresh) {
  AUTH_USER = k;
  try {
    if (remember) localStorage.setItem(SES_KEY, k); else localStorage.removeItem(SES_KEY);
    sessionStorage.setItem(SES_KEY, k);
  } catch (e) { /* ignorieren */ }
  const a = loadAccounts(); a.users[k].last = Date.now(); saveAccounts(a);
  // alter Spielstand von vor den Konten → geht an den Super-Admin
  try {
    if (k === 'admin' && !localStorage.getItem(saveKeyFor(k)) && localStorage.getItem(SAVE_KEY)) localStorage.setItem(saveKeyFor(k), localStorage.getItem(SAVE_KEY));
  } catch (e) { /* ignorieren */ }
  $('#login').classList.add('hidden'); $('#login').innerHTML = '';
  startGameForUser(fresh);
}
function sessionUser() {
  let k = null;
  try { k = sessionStorage.getItem(SES_KEY) || localStorage.getItem(SES_KEY); } catch (e) { k = null; }
  return k && loadAccounts().users[k] ? k : null;
}
ACTIONS.logout = () => {
  saveGame();
  try { localStorage.removeItem(SES_KEY); sessionStorage.removeItem(SES_KEY); } catch (e) { /* ignorieren */ }
  AUTH_USER = null; S = null;
  location.reload();
};

/** Konto-Chip in der Topbar */
function accountChipHTML() {
  const u = currentAccount();
  return `<button class="chip menubtn" data-act="gameMenu" title="Spiel-Menü: Speichern, Export, Ton, Abmelden">${ico('gear')}<span>Menü</span>${u ? `<span class="muted">· ${ico(u.role === 'player' ? 'user' : 'crown')}${esc(u.name)}</span>` : ''}</button>`;
}

// =============================================================================
// Super-Admin
// =============================================================================
const adm = () => (S.admin = S.admin || { money: false, gems: false, rp: false, freeShop: false, noCost: false });
/** jede Frame: „unendlich“-Werte auffüllen */
function adminTick() {
  if (!S || !S.admin || !isAdmin()) return;
  const A = S.admin;
  if (A.money && S.money < 1e9) S.money = 1e9;
  if (A.gems && S.gems < 99999) S.gems = 99999;
  if (A.rp && S.rp < 999) S.rp = 999;
}
const adminInf = k => !!(S && S.admin && S.admin[k] && isAdmin());

function adminUnlockAll() {
  S.techs = Array.from(new Set(S.techs.concat(TECHS.map(t => t.id), STYLE_ITEMS.map(s => s.id))));
  S.premium = PREMIUM_CARS.map(p => p.id);
  _carCache.clear(); _spriteCache.clear();
}
function adminMaxTune() {
  S.ptune = S.ptune || {};
  const full = Object.fromEntries(Object.entries(TUNE_PARTS).map(([k, p]) => [k, p.max]));
  (S.premium || []).forEach(id => { S.ptune[id] = { tune: clone(full) }; });
  S.models.forEach(m => { m.tune = clone(full); });
  _carCache.clear(); _spriteCache.clear();
}
function adminSetLevel(l) {
  l = clamp(Math.round(l) || 1, 1, 99);
  while (S.level < l) { S.level++; S.rp += rpGain(S.level); }
  S.level = l; S.xp = 0;
}

ACTIONS.admToggle = d => { const A = adm(); A[d.v] = !A[d.v]; adminTick(); _tbCache = ''; updateTopbar(true); rerender(); };
ACTIONS.admDo = d => {
  const A = adm(), v = d.v;
  const num = id => { const el = $('#' + id); return el ? +el.value : 0; };
  switch (v) {
    case 'm1':     S.money += 1e6; break;
    case 'm100':   S.money += 1e8; break;
    case 'mset':   S.money = num('adm-money'); break;
    case 'g1000':  S.gems = (S.gems || 0) + 1000; break;
    case 'gset':   S.gems = Math.max(0, num('adm-gems')); break;
    case 'rp50':   S.rp += 50; break;
    case 'lvl1':   adminSetLevel(S.level + 1); break;
    case 'lvlset': adminSetLevel(num('adm-lvl')); break;
    case 'lvlmax': adminSetLevel(30); break;
    case 'xp':     addXP(xpNeed(S.level) * 3); break;
    case 'rep':    S.rep = 100; break;
    case 'all':    adminUnlockAll(); break;
    case 'tune':   adminMaxTune(); break;
    case 'ach':    ACHIEVEMENTS.forEach(a => { if (!S.ach.includes(a.id)) S.ach.push(a.id); }); break;
    case 'fac':    S.factory.stage = STAGES.length - 1; break;
    case 'loan':   S.loan = 0; break;
    case 'days7':  for (let i = 0; i < 7; i++) { tickProduction(1); dayTick(); } break;
    case 'days30': for (let i = 0; i < 30; i++) { tickProduction(1); dayTick(); } break;
    case 'gift':   S.dailyGift = 0; break;
    case 'starter': S.starterBought = false; break;
    case 'league': { const L = ensureLeague(); if (L) { L.tier = clamp(num('adm-tier'), 0, LEAGUE_TIERS.length - 1); L.round = 0; L.me = 0; L.drivers = newSeasonDrivers(L.tier); } break; }
    case 'salv':   if (S.salvage) { S.salvage.next = 0; refreshListings(); } break;
    case 'all3':   adminUnlockAll(); adminSetLevel(30); S.money = Math.max(S.money, 1e9); S.gems = Math.max(S.gems || 0, 99999); S.rp = Math.max(S.rp, 999); S.rep = 100; S.factory.stage = STAGES.length - 1; Object.assign(A, { money: true, gems: true, rp: true, freeShop: true }); break;
  }
  checkAchievements(); _tbCache = ''; renderTopbar(); renderNav(); rerender();
  toast(`${ico('crown')} Admin: erledigt.`, 'good', 1800);
};

// ---------- Benutzerverwaltung ----------
function readUserSave(k) { try { return JSON.parse(localStorage.getItem(saveKeyFor(k)) || 'null'); } catch (e) { return null; } }
function writeUserSave(k, st) { try { localStorage.setItem(saveKeyFor(k), JSON.stringify(st)); } catch (e) { /* ignorieren */ } }
ACTIONS.admUser = d => {
  const [op, k] = d.v.split('|'); const a = loadAccounts(), u = a.users[k];
  if (!u) return;
  if (op === 'pw') {
    const pw = ($('#adm-pw-' + k) || {}).value || '';
    if (pw.length < 4) { toast('Neues Passwort: mindestens 4 Zeichen.', 'bad'); return; }
    u.salt = newSalt(); u.hash = pwHash(pw, u.salt); saveAccounts(a); toast(`Passwort von <b>${esc(u.name)}</b> geändert.`, 'good');
  } else if (op === 'role') {
    if (u.role === 'superadmin') return;
    u.role = u.role === 'admin' ? 'player' : 'admin'; saveAccounts(a); toast(`${esc(u.name)} ist jetzt <b>${ROLE_NAME[u.role]}</b>.`, 'good');
  } else if (op === 'money') {
    if (k === AUTH_USER) { S.money += 1e6; } else { const st = readUserSave(k); if (!st) { toast('Dieses Konto hat noch keinen Spielstand.', 'bad'); return; } st.money += 1e6; writeUserSave(k, st); }
    toast(`${esc(u.name)} hat <b>+${fmtMoney(1e6)}</b> bekommen.`, 'good');
  } else if (op === 'gems') {
    if (k === AUTH_USER) { S.gems = (S.gems || 0) + 1000; } else { const st = readUserSave(k); if (!st) { toast('Dieses Konto hat noch keinen Spielstand.', 'bad'); return; } st.gems = (st.gems || 0) + 1000; writeUserSave(k, st); }
    toast(`${esc(u.name)} hat <b>+1'000 Diamanten</b> bekommen.`, 'good');
  } else if (op === 'del') {
    if (u.role === 'superadmin' || k === AUTH_USER) return;
    confirmBox(`Konto <b>${esc(u.name)}</b> und seinen Spielstand wirklich löschen? Das kann man nicht rückgängig machen.`, () => {
      const a2 = loadAccounts(); delete a2.users[k]; saveAccounts(a2);
      try { localStorage.removeItem(saveKeyFor(k)); } catch (e) { /* ignorieren */ }
      toast(`Konto ${esc(u.name)} gelöscht.`, 'good'); rerender();
    }, 'Löschen');
    return;
  }
  _tbCache = ''; updateTopbar(true); rerender();
};
ACTIONS.admNewUser = () => {
  const n = $('#adm-nu').value, pw = $('#adm-npw').value, role = $('#adm-nrole').value;
  const err = createAccount(n, pw, role === 'admin' ? 'admin' : 'player');
  if (err) { toast(err, 'bad'); return; }
  toast(`Konto <b>${esc(n)}</b> erstellt.`, 'good'); rerender();
};
ACTIONS.admOwnPw = () => {
  const pw = $('#adm-own').value || '';
  if (pw.length < 4) { toast('Neues Passwort: mindestens 4 Zeichen.', 'bad'); return; }
  const a = loadAccounts(), u = a.users[AUTH_USER]; u.salt = newSalt(); u.hash = pwHash(pw, u.salt); saveAccounts(a);
  toast('Dein Passwort wurde geändert.', 'good'); rerender();
};

TABS.admin = {
  title: 'Admin', icon: 'crown',
  render(el) {
    if (!isAdmin()) { el.innerHTML = '<p>Kein Zugriff.</p>'; return; }
    const A = adm(), sup = isSuperAdmin();
    const tog = (k, label, hint) => `<div style="display:grid;grid-template-columns:80px 1fr;align-items:center;margin:3px 0">
        <button class="btn ${A[k] ? 'green' : 'gray'}" style="min-width:64px" data-act="admToggle" data-v="${k}">${A[k] ? 'AN' : 'AUS'}</button>
        <div><b>${label}</b><div class="hint">${hint}</div></div></div>`;
    const b = (v, label, cls = '') => `<button class="btn ${cls}" data-act="admDo" data-v="${v}">${label}</button>`;
    const accs = loadAccounts().users;
    const rows = Object.entries(accs).sort((x, y) => (x[1].role === 'superadmin' ? -1 : 0) - (y[1].role === 'superadmin' ? -1 : 0) || x[0].localeCompare(y[0])).map(([k, u]) => {
      const st = k === AUTH_USER ? S : readUserSave(k);
      const info = st ? `${esc(st.company)} · Lvl ${st.level} · ${fmtMoney(st.money)} · ${fmtNum(st.gems || 0)} Diam.` : '<span class="hint">noch kein Spielstand</span>';
      return `<div class="card">
        <div class="flex">${ico(u.role === 'player' ? 'user' : 'crown')}<b>${esc(u.name)}</b><span class="tag">${ROLE_NAME[u.role] || u.role}</span>${k === AUTH_USER ? '<span class="tag">du</span>' : ''}<span class="sp"></span>
          <span class="hint">letzter Login: ${u.last ? new Date(u.last).toLocaleString('de-CH') : '–'}</span></div>
        <div style="margin:4px 0">${info}</div>
        <div class="flex">
          <button class="btn" data-act="admUser" data-v="money|${k}">+$1 Mio</button>
          <button class="btn" data-act="admUser" data-v="gems|${k}">+1'000 Diam.</button>
          ${sup && u.role !== 'superadmin' ? `<button class="btn orange" data-act="admUser" data-v="role|${k}">${u.role === 'admin' ? 'Admin entfernen' : 'Zum Admin machen'}</button>` : ''}
          ${sup && u.role !== 'superadmin' && k !== AUTH_USER ? `<button class="btn red" data-act="admUser" data-v="del|${k}">Löschen</button>` : ''}
        </div>
        ${sup && u.role !== 'superadmin' ? `<div class="flex"><input type="text" id="adm-pw-${k}" placeholder="neues Passwort" maxlength="40" style="width:170px"><button class="btn gray" data-act="admUser" data-v="pw|${k}">Passwort setzen</button></div>` : ''}
      </div>`;
    }).join('');
    el.innerHTML = `
      <h2 class="title">${ico('crown', 'big')} ${sup ? 'Super-Admin' : 'Admin'} – Kontrollzentrum</h2>
      <div class="card" style="box-shadow:0 0 0 3px var(--line),inset 0 0 0 2px var(--yellow)">Du bist als <b>${esc(currentAccount().name)}</b> angemeldet und kannst hier alles einstellen. Nur Admins sehen diesen Bereich.</div>
      <div class="row">
        <div class="col">
          <div class="panel"><h3>${ico('star')}Unendlich & Cheats</h3>
            ${tog('money', 'Unendlich Geld', 'Kontostand bleibt immer bei mindestens $1 Mrd.')}
            ${tog('gems', 'Unendlich Diamanten', 'Immer mindestens 99\'999 Diamanten.')}
            ${tog('rp', 'Unendlich Forschungspunkte', 'Immer mindestens 999 FP.')}
            ${tog('freeShop', 'Gratis Shop', 'Alles im Shop kostet nichts, auch die CHF-Pakete (ohne Bestätigung).')}
            <div style="margin-top:8px">${b('all3', 'ALLES FREISCHALTEN', 'green big')}</div>
            <div class="hint">Schaltet alle Forschung, Autos und Extras frei, setzt Level 30 und schaltet alle Unendlich-Optionen ein.</div>
          </div>
          <div class="panel"><h3>${ico('money')}Geld & Währungen</h3>
            <div class="flex">${b('m1', '+$1 Mio')}${b('m100', '+$100 Mio')}${b('g1000', '+1\'000 Diamanten')}${b('rp50', '+50 FP')}</div>
            <div class="flex"><span class="lbl" style="width:90px">Geld</span><input type="number" id="adm-money" value="${Math.round(S.money)}" style="width:160px">${b('mset', 'Setzen', 'gray')}</div>
            <div class="flex"><span class="lbl" style="width:90px">Diamanten</span><input type="number" id="adm-gems" value="${S.gems || 0}" style="width:160px">${b('gset', 'Setzen', 'gray')}</div>
            <div class="flex">${b('loan', 'Kredit tilgen', 'gray')}${b('gift', 'Tagesgeschenk zurücksetzen', 'gray')}${b('starter', 'Starterpaket wieder kaufbar', 'gray')}</div>
          </div>
          <div class="panel"><h3>${ico('level')}Level & Ruf</h3>
            <div class="flex">${b('lvl1', 'Level +1')}${b('xp', 'Viel XP')}${b('lvlmax', 'Level 30')}${b('rep', 'Markenruf 100')}</div>
            <div class="flex"><span class="lbl" style="width:90px">Level</span><input type="number" id="adm-lvl" value="${S.level}" min="1" max="99" style="width:90px">${b('lvlset', 'Setzen', 'gray')}</div>
          </div>
        </div>
        <div class="col">
          <div class="panel"><h3>${ico('rp')}Freischalten</h3>
            <div class="flex">${b('all', 'Alle Forschung + Premium-Autos')}${b('tune', 'Alles voll getunt')}</div>
            <div class="flex">${b('ach', 'Alle Erfolge')}${b('fac', 'Fabrik ganz ausbauen')}</div>
          </div>
          <div class="panel"><h3>${ico('date')}Zeit & Welt</h3>
            <div class="flex">${b('days7', '+7 Tage')}${b('days30', '+30 Tage')}${b('salv', 'Neue Schrottplatz-Angebote')}</div>
            <div class="flex"><span class="lbl" style="width:90px">Liga-Stufe</span>
              <select id="adm-tier">${LEAGUE_TIERS.map((t, i) => `<option value="${i}" ${ensureLeague().tier === i ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>${b('league', 'Setzen', 'gray')}</div>
          </div>
          <div class="panel"><h3>${ico('crown')}Mein Konto</h3>
            <div class="flex"><input type="text" id="adm-own" placeholder="neues Passwort" maxlength="40" style="width:170px"><button class="btn gray" data-act="admOwnPw">Mein Passwort ändern</button></div>
            <div class="hint">Standard-Login ist admin / admin – das solltest du ändern, falls andere an deinen Computer kommen.</div>
          </div>
        </div>
      </div>
      <div class="panel"><h3>${ico('user')}Benutzer (${Object.keys(accs).length})</h3>
        ${rows}
        <div class="card"><b>Neues Konto anlegen</b>
          <div class="flex"><input type="text" id="adm-nu" placeholder="Benutzername" maxlength="16" style="width:150px"><input type="text" id="adm-npw" placeholder="Passwort" maxlength="40" style="width:150px">
            ${sup ? '<select id="adm-nrole"><option value="player">Spieler</option><option value="admin">Admin</option></select>' : '<select id="adm-nrole"><option value="player">Spieler</option></select>'}
            <button class="btn green" data-act="admNewUser">Erstellen</button></div></div>
      </div>`;
  }
};
