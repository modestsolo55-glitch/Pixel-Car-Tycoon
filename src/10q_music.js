/* =============================================================================
   Teil 10q: Musik (selbst erzeugte Chiptune-Musik, 3 Stimmungen) und kräftigerer Motorsound
   - menu:   ruhiger Lo-Fi-Groove (Garage, Firma, Startbildschirm)
   - cruise: Synthwave mit Arpeggio (Cruisen)
   - race:   treibend und spannend (Drag Race, leiser wegen Motor)
   Startet erst nach der ersten Berührung/Klick (Browser-Regel).
   ============================================================================= */
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);                 // MIDI-Nummer → Hz
const SONGS = {
  menu: { bpm: 84, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], bass: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    arp: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
    arpType: 'triangle', arpVol: 0.05, bassType: 'triangle', bassVol: 0.12, swing: 0.08, lead: null },
  cruise: { bpm: 108, chords: [[52, 55, 59, 64], [48, 52, 55, 60], [55, 59, 62, 67], [50, 54, 57, 62]], bass: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    arp: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    arpType: 'sawtooth', arpVol: 0.035, bassType: 'square', bassVol: 0.07, swing: 0, lead: [76, 0, 74, 0, 71, 0, 0, 0, 74, 0, 76, 0, 79, 0, 0, 0] },
  race: { bpm: 140, chords: [[50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60], [45, 49, 52, 57]], bass: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    arp: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0], snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    arpType: 'square', arpVol: 0.03, bassType: 'sawtooth', bassVol: 0.06, swing: 0, lead: null }
};
const MUS = { gain: null, mood: null, song: null, step: 0, nextT: 0, timer: 0, unlocked: false };
function musOn() { return SET.music !== false; }
function musVol() { return (SET.musicVol == null ? 0.5 : SET.musicVol) * (RACE && !RACE.cruise ? 0.45 : RACE ? 0.7 : 1); }
function musEnsure() {
  const ac = sfxCtx(); if (!ac) return null;
  if (!MUS.gain) { MUS.gain = ac.createGain(); MUS.gain.gain.value = 0; MUS.gain.connect(ac.destination); }
  return ac;
}
/** ein Ton mit Hüllkurve, optional mit Tiefpass */
function musNote(ac, f, t, dur, type, vol, cut) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (cut) { const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; o.connect(lp); lp.connect(g); } else o.connect(g);
  g.connect(MUS.gain); o.start(t); o.stop(t + dur + 0.02);
}
function musDrum(ac, kind, t) {
  if (kind === 'kick') {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); o.connect(g); g.connect(MUS.gain); o.start(t); o.stop(t + 0.2);
    return;
  }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBufferAny(ac); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
  const dur = kind === 'hat' ? 0.035 : 0.13, vol = kind === 'hat' ? 0.05 : 0.14;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(MUS.gain); s.start(t, Math.random() * 0.5, dur + 0.02);
}
let _musNoise = null;
function noiseBufferAny(ac) { if (_musNoise) return _musNoise; const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return (_musNoise = b); }
/** Taktschritte vorausplanen (Sechzehntel) */
function musSchedule() {
  const ac = MUS.gain && MUS.gain.context; if (!ac || !MUS.song) return;
  const S0 = MUS.song, st = 60 / S0.bpm / 4;
  while (MUS.nextT < ac.currentTime + 0.25) {
    const i = MUS.step % 16, bar = Math.floor(MUS.step / 16) % 4, ch = S0.chords[bar];
    const t = MUS.nextT + (i % 2 ? S0.swing * st : 0);
    if (S0.bass[i]) musNote(ac, NOTE(ch[0] - 12), t, st * 1.8, S0.bassType, S0.bassVol, 900);
    if (S0.arp[i]) musNote(ac, NOTE(ch[(i >> (S0.arp[1] ? 0 : 1)) % 4] + 12), t, st * 0.9, S0.arpType, S0.arpVol, 2400);
    if (S0.lead && bar % 2 === 1 && S0.lead[i]) musNote(ac, NOTE(S0.lead[i]), t, st * 1.7, 'square', 0.03, 3000);
    if (S0.kick[i]) musDrum(ac, 'kick', t);
    if (S0.snare[i]) musDrum(ac, 'snare', t);
    if (S0.hat[i]) musDrum(ac, 'hat', t);
    MUS.step++; MUS.nextT += st;
  }
}
/** Stimmung wechseln (sanft ein-/ausblenden) */
function musSetMood(m) {
  if (MUS.mood === m) return;
  MUS.mood = m;
  const ac = MUS.unlocked ? musEnsure() : null; if (!ac) return;
  const now = ac.currentTime;
  MUS.gain.gain.cancelScheduledValues(now); MUS.gain.gain.setTargetAtTime(0, now, 0.15);
  setTimeout(() => { if (MUS.mood !== m) return; MUS.song = SONGS[m]; MUS.step = 0; MUS.nextT = ac.currentTime + 0.05; }, 450);
}
/** pro Bild: passende Stimmung wählen, Lautstärke nachführen, Noten planen */
function musTick() {
  if (!MUS.unlocked) return;
  const ac = musEnsure(); if (!ac) return;
  const want = RACE ? (RACE.cruise ? 'cruise' : 'race') : 'menu';
  if (MUS.mood !== want || !MUS.song && MUS.mood) { if (MUS.mood !== want) musSetMood(want); else { MUS.song = SONGS[want]; MUS.nextT = ac.currentTime + 0.05; } }
  const target = musOn() ? musVol() * 0.8 : 0;
  if (Math.abs(MUS.gain.gain.value - target) > 0.01) MUS.gain.gain.setTargetAtTime(target, ac.currentTime, 0.4);
  if (musOn()) musSchedule();
}
// Erst nach der ersten Berührung darf Ton starten
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => {
  if (MUS.unlocked) return;
  MUS.unlocked = true; const ac = musEnsure(); if (ac && ac.state === 'suspended') ac.resume();
  MUS.mood = null;
}, { capture: true }));
setInterval(() => { try { musTick(); } catch (e) { /* Ton ist nie wichtig genug für einen Absturz */ } }, 60);

// ---------- Kräftigerer Motorsound: Verzerrung (Grip im Klang), Unterton bei V-Motoren, Knallen beim Gaswegnehmen ----------
const _softClip = (() => { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 2.6) / Math.tanh(2.6); } return c; })();
function engineGrit(V) {
  if (!V || V.ev || V.grit) return;
  try {
    const ws = AUD.createWaveShaper(); ws.curve = _softClip; ws.oversample = '2x';
    const g = AUD.createGain(); g.gain.value = /^v|w/.test(V.type) ? 0.5 : 0.3;
    V.lp.connect(ws); ws.connect(g); g.connect(V.out);
    if (/^v|w/.test(V.type)) { const o = AUD.createOscillator(), og = AUD.createGain(); o.type = 'sine'; og.gain.value = 0.25; o.connect(og); og.connect(V.lp); o.start(); V.nodes.push(o); V.sub = o; }
    V.grit = true;
  } catch (e) { /* egal */ }
}
let _lastGas = false;
function engineExtras() {
  const R = RACE; if (!R || !R.snd || !AUD) return;
  engineGrit(R.snd.p); engineGrit(R.snd.o);
  const V = R.snd.p, now = AUD.currentTime;
  if (V && V.sub) V.sub.frequency.setTargetAtTime(Math.max(12, R.pv.rpm / 60 * 2), now, 0.03);
  // Gas weg bei hoher Drehzahl → Knallen und Blubbern im Auspuff
  const gas = !!R.inp.gas;
  if (_lastGas && !gas && R.pv.rpm > R.pc.E.red * 0.6 && !R.muted) { for (let i = 0; i < 3; i++) setTimeout(() => popSound(0.1, 400 + Math.random() * 300), 60 + i * 90 + Math.random() * 60); if (typeof fxExhaust === 'function') fxExhaust('p', 'pop'); }
  _lastGas = gas;
}
