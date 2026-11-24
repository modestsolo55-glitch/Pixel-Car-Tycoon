/* =============================================================================
   Teil 12: Start, Hauptschleife, Autospeichern
   ============================================================================= */
let _autoDay = -1, _last = performance.now(), _dayAcc = 0, _animT = 0, _saveT = 0, _navT = 0;

function mainLoop(now) {
  const dt = clamp((now - _last) / 1000, 0, 0.1); _last = Math.max(_last, now);
  _animT += dt;
  if (S) {
    adminTick();
    cinemaCheck();
    // Spielzeit läuft nur ausserhalb von Rennen
    if (!RACE && !ROAM && S.speed > 0) {
      const days = dt * S.speed / DAY_SEC;
      tickProduction(days);
      _dayAcc += days;
      while (_dayAcc >= 1) { _dayAcc -= 1; dayTick(); }
    }
    updateTopbar(false);
    const tab = TABS[curTab];
    if (tab && tab.tick && !RACE) tab.tick(dt, _animT);
    // Seiten mit Live-Werten gelegentlich neu aufbauen
    _navT += dt;
    if (_navT > 2) {
      _navT = 0; renderNav();
      const focused = document.activeElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (!focused && ['home', 'models', 'market'].includes(curTab) && $('#modal').classList.contains('hidden') && S.day !== _autoDay) { _autoDay = S.day; rerender(); }
    }
    _saveT += dt;
    if (_saveT > 15 && !RACE && !CUT) { _saveT = 0; saveGame(); }   // nicht mitten im Rennen (Ruckler) – danach wird ohnehin gespeichert
  }
  requestAnimationFrame(mainLoop);
}

function boot() {
  bindDelegation(document.body);
  // Tastenkürzel: Leertaste = Pause/Weiter, 1/2/3 = Tempo (nicht im Rennen oder beim Tippen)
  window.addEventListener('keydown', e => {
    if (RACE || ROAM || !S) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
    if (e.key === ' ') { e.preventDefault(); S.speed = S.speed ? 0 : (S._lastSpeed || 1); if (S.speed) S._lastSpeed = S.speed; updateTopbar(true); }
    else if (['1', '2', '3'].includes(e.key)) { S.speed = [1, 2, 5][+e.key - 1]; S._lastSpeed = S.speed; updateTopbar(true); }
  });
  window.addEventListener('beforeunload', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  requestAnimationFrame(mainLoop);
  // Startbildschirm: gemerktes Konto ist vorausgewählt, Anmelden ist freiwillig
  const u = sessionUser();
  if (u) AUTH_USER = u;
  showTitle();
}
/** Spielstand des angemeldeten Kontos laden (oder neues Spiel) */
function startGameForUser(fresh) {
  hideTitle();
  const st = fresh ? null : loadGame();
  if (st && !st.seenUnlock) st.seenUnlock = Object.keys(TAB_LVL).filter(t => st.level >= TAB_LVL[t]);
  _carCache.clear(); _spriteCache.clear(); _tbCache = '';
  if (st) {
    S = st;
    renderTopbar(); renderNav(); setTab('home');
    toast(`Willkommen zurück bei <b>${esc(S.company)}</b>, ${esc(currentAccount().name)}!`, 'good');
    let again = false; try { again = localStorage.getItem('at_tour_again') === '1'; localStorage.removeItem('at_tour_again'); } catch (e) { /* egal */ }
    if (!S.tutDone || again) setTimeout(() => tourStart(again), 600);
  } else {
    newState('Pixel Motors'); S.speed = 0;
    renderTopbar(); renderNav(); setTab('home');
    showNewGame(false);
  }
  if (isAdmin()) toast(`${ico('crown')} Angemeldet als <b>${ROLE_NAME[currentAccount().role]}</b> – siehe Tab <b>Admin</b>.`, 'good', 5000);
}
boot();
