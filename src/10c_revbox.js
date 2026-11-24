/* =============================================================================
   Teil 10c: Motor starten & hochdrehen (Garage, Motor-Designer, Rennauswahl)
   Nutzt die Motorstimmen aus 10b_race_plus.js – klingt je nach Motortyp,
   Zylinderzahl und Aufladung anders. Gas: Knopf gedrückt halten oder Leertaste.
   ============================================================================= */
const REV = { on: false, state: 'off', rpm: 0, thr: 0, key: '', V: null, E: null, eng: null, t: 0, raf: 0, last: 0, held: false, kb: false };

/** welcher Motor gehört zum aktuellen Bildschirm? */
const REVSEL = { design: 'draft', engine: 'draft' };           // welches Auto wird hochgedreht?
function revCarEntry(mode) {
  const id = mode === 'race' ? RSEL.modelId : REVSEL[mode];
  if (!id || id === 'draft') return null;
  const r = raceEntry(id); if (!r) { REVSEL[mode] = 'draft'; return null; }
  return r;
}
function revSource(mode) {
  const r = revCarEntry(mode); if (r) return r.engine;
  if (mode === 'engine') return S.engDraft;
  if (mode === 'race') return null;
  return getEngine(S.draft.engineId);
}
/** Design, das in der Garage gezeigt wird (gewähltes Auto oder Entwurf) */
function revShownDesign(mode) { const r = revCarEntry(mode); return r ? r.design : S.draft; }
INPUTS.revcar = el => { REVSEL[el.dataset.mode] = el.value; rerender(); };
function revPanelHTML(mode) {
  const eng = revSource(mode); if (!eng) return '';
  const c = computeEngine(eng);
  const on = REV.on && REV.mode === mode;
  const pick = mode === 'race' ? '' : `<div class="flex" style="margin-bottom:4px"><span class="lbl" style="margin:0">Auto</span>
      <select data-inp="revcar" data-mode="${mode}" style="flex:1;min-width:160px"><option value="draft" ${REVSEL[mode] === 'draft' ? 'selected' : ''}>${mode === 'engine' ? 'Motor-Entwurf (hier im Designer)' : 'Aktueller Entwurf'}</option>${raceOptions(REVSEL[mode])}</select></div>`;
  return `<div class="panel revbox" id="revbox" data-mode="${mode}">${pick}
    <div class="flex">
      <button class="btn ${on ? 'red' : 'green'}" data-act="revToggle" data-v="${mode}">${ico('engine')} ${on ? 'Motor aus' : 'Motor starten'}</button>
      <button class="btn orange revgas ${on ? '' : 'lock'}" id="revgas" data-why="Erst den Motor starten">GAS (halten)</button>
      <canvas id="revcv" width="150" height="20" class="cv"></canvas><span id="revtxt" class="revtxt">AUS</span>
    </div>
    <div class="hint">${esc(eng.name || 'Motor')} · ${c.isEV ? 'Elektromotor' : (ENGINE_TYPES[eng.type] ? ENGINE_TYPES[eng.type].name : '') + (eng.ind && eng.ind !== 'none' ? ' · ' + INDUCTIONS[eng.ind].name : '')} · Begrenzer bei ${fmtNum(c.red)} U/min.
      ${on ? 'Gas: Knopf gedrückt halten oder <b>Leertaste</b>.' : 'Starte den Motor und lass ihn aufheulen!'}${SFX.on ? '' : ' <span class="warn">(Ton ist im Menü ausgeschaltet)</span>'}</div>
  </div>`;
}
/** nach jedem Neuzeichnen des Tabs: Gas-Knopf verdrahten */
function revBind() {
  const b = $('#revgas'); if (!b) return;
  const on = e => { e.preventDefault(); if (!REV.on) return; REV.held = true; b.classList.add('on'); };
  const off = e => { e.preventDefault(); REV.held = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  b.addEventListener('contextmenu', e => e.preventDefault());
  drawRevGauge();
}
ACTIONS.revToggle = d => { if (REV.on) revStop(); else revStart(d.v); rerender(); };

function revStart(mode) {
  const eng = revSource(mode); if (!eng) return;
  try {
    AUD = AUD || new (window.AudioContext || window.webkitAudioContext)();
    if (AUD.state === 'suspended') AUD.resume();
  } catch (e) { toast('Dein Browser unterstützt keinen Ton.', 'bad'); return; }
  REV.E = computeEngine(eng); REV.eng = eng; REV.mode = mode; REV.key = JSON.stringify(eng);
  REV.V = makeVoice(REV.E, eng, 0.09, 0);
  REV.on = true; REV.state = REV.E.isEV ? 'run' : 'crank'; REV.t = 0; REV.rpm = 0; REV.thr = 0;
  if (REV.E.isEV) { tone(660, 0.08, 'sine', 0.05); setTimeout(() => tone(990, 0.1, 'sine', 0.05), 90); }
  REV.last = performance.now();
  cancelAnimationFrame(REV.raf); REV.raf = requestAnimationFrame(revLoop);
}
function revStop() {
  REV.on = false; REV.state = 'off'; REV.held = false;
  cancelAnimationFrame(REV.raf);
  if (REV.V) { const V = REV.V; try { V.out.gain.setTargetAtTime(0, AUD.currentTime, 0.15); setTimeout(() => { try { V.nodes.forEach(n => n.stop()); } catch (e) { /* egal */ } }, 600); } catch (e) { /* egal */ } }
  REV.V = null;
  ['garagecv', 'enginecv'].forEach(id => { const c = $('#' + id); if (c) c.style.transform = ''; });
}
function revLoop(now) {
  if (!REV.on) return;
  REV.raf = requestAnimationFrame(revLoop);
  const box = $('#revbox');
  if (!box || RACE || box.dataset.mode !== REV.mode) { revStop(); const b2 = $('#revbox'); if (b2 && !RACE) rerender(); return; }                          // Tab gewechselt oder Rennen gestartet
  const tn = performance.now(), dt = clamp((tn - REV.last) / 1000, 0, 0.05); REV.last = tn; void now;
  const E = REV.E, idle = E.isEV ? 0 : E.idle;
  // Motor geändert (z. B. im Motor-Designer)? → neue Stimme
  const eng = revSource(REV.mode);
  if (eng && JSON.stringify(eng) !== REV.key) { const was = REV.state; revStop(); revStart(box.dataset.mode); REV.state = was === 'crank' ? 'crank' : 'run'; REV.rpm = idle; return; }
  REV.t += dt;
  const thr = (REV.held || REV.kb) && REV.state === 'run' ? 1 : 0;
  REV.thr = thr;
  if (REV.state === 'crank') {
    // Anlasser: stotternd, dann springt der Motor an
    REV.rpm = 180 + Math.sin(REV.t * 70) * 60;
    if (Math.random() < 0.25) popSound(0.05, 180);
    if (REV.t > 0.75) { REV.state = 'run'; REV.rpm = idle * 1.9; popSound(0.14, 300); }
  } else {
    const target = idle + thr * (E.red - idle);
    REV.rpm = lerp(REV.rpm, target, clamp(dt * (target > REV.rpm ? (E.isEV ? 3 : 4.5) : 2.2), 0, 1));
    if (!E.isEV) REV.rpm += Math.sin(REV.t * 9) * 8;                 // leichtes Leerlauf-Schwanken
    if (REV.rpm >= E.red * 0.99 && thr) { REV.rpm = E.red * (0.95 + Math.random() * 0.04); if (Math.random() < 0.15) popSound(0.1, 520); }
    if (!thr && REV.lastThr && REV.rpm > E.red * 0.6 && !E.isEV) { popSound(0.12, 420); setTimeout(() => popSound(0.08, 380), 70); }   // Fehlzündung beim Gaswegnehmen
  }
  REV.lastThr = thr;
  if (REV.V && AUD) voiceUpdate(REV.V, { c: { E }, rpm: REV.rpm }, REV.state === 'crank' ? 0.4 : 0.15 + thr * 0.85, !SFX.on, AUD.currentTime);
  // Auto/Motor wackelt mit der Drehzahl
  const sh = REV.state === 'crank' ? 1.2 : (E.isEV ? 0.1 : 0.3 + REV.rpm / E.red * 1.2);
  ['garagecv', 'enginecv'].forEach(id => { const c = $('#' + id); if (c) c.style.transform = `translate(${((Math.random() - 0.5) * sh).toFixed(2)}px,${((Math.random() - 0.5) * sh).toFixed(2)}px)`; });
  drawRevGauge();
}
/** kleiner Balken-Drehzahlmesser mit Zahl */
function drawRevGauge() {
  const cv = $('#revcv'); if (!cv) return;
  const ctx = hdCtx(cv), W = 150, H = 20, E = REV.on ? REV.E : computeEngine(revSource(($('#revbox') || {}).dataset ? $('#revbox').dataset.mode : 'design') || defaultEngine());
  const rpm = REV.on ? Math.max(0, REV.rpm) : 0, maxR = Math.ceil(E.red / 1000 + 0.5) * 1000;
  ctx.fillStyle = '#05060c'; ctx.fillRect(0, 0, W, H);
  const n = 30;
  for (let i = 0; i < n; i++) {
    const f = (i + 1) / n, on = rpm / maxR >= f - 0.0001, red = f * maxR >= E.red;
    ctx.fillStyle = on ? (red ? '#ff4b55' : f > 0.65 ? '#ffcd75' : '#38e070') : (red ? '#3a1a22' : '#1a1e2c');
    ctx.fillRect(4 + i * 4.7, 3, 3.7, 14);
  }
  const tx = $('#revtxt');
  if (tx) { tx.textContent = REV.on ? (REV.state === 'crank' ? 'START…' : fmtNum(Math.round(rpm / 50) * 50) + ' U/min') : 'AUS';
    tx.style.color = !REV.on ? 'var(--muted)' : rpm >= E.red * 0.95 ? '#ff7b8a' : rpm >= E.red * 0.65 ? 'var(--yellow)' : 'var(--lime)'; }
}
// Leertaste = Gas, solange ein Motor läuft (statt Pause)
window.addEventListener('keydown', e => {
  if (!REV.on || RACE || e.key !== ' ') return;
  const tag = document.activeElement && document.activeElement.tagName;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
  e.preventDefault(); e.stopImmediatePropagation(); REV.kb = true;
}, true);
window.addEventListener('keyup', e => { if (e.key === ' ') REV.kb = false; }, true);
