'use strict';
/* =============================================================================
   AUTOTYCOON – Autofirma-Simulation mit Drag Racing im Pixel-Art-Stil
   Teil 1: Hilfsfunktionen, Farben, Pixel-Puffer, Bitmap-Schrift, Pixel-Icons
   ============================================================================= */

// ---------- Kurzhelfer ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Geld formatieren, z. B. $ 12'500 oder $ 3.25 Mio */
function fmtMoney(v) {
  const a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e9) return s + '$' + (a / 1e9).toFixed(2) + ' Mrd';
  if (a >= 1e7) return s + '$' + (a / 1e6).toFixed(2) + ' Mio';
  return s + '$' + Math.round(a).toLocaleString('de-CH');
}
const fmtNum = (v, d = 0) => Number(v).toLocaleString('de-CH', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Deterministisches Pixel-Rauschen (0..1) – für Metallic-Glitzer, Dithering usw. */
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Zufallszahl mit Seed (für reproduzierbare Szenen) */
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

// ---------- Farben ----------
function hex2rgb(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb2hex = c => '#' + c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
/** f < 0 abdunkeln, f > 0 aufhellen (-1..1) */
function shadeRGB(c, f) {
  if (f < 0) return [c[0] * (1 + f), c[1] * (1 + f), c[2] * (1 + f)];
  return [c[0] + (255 - c[0]) * f, c[1] + (255 - c[1]) * f, c[2] + (255 - c[2]) * f];
}
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shadeHex = (h, f) => rgb2hex(shadeRGB(hex2rgb(h), f));
const mixHex = (a, b, t) => rgb2hex(mixRGB(hex2rgb(a), hex2rgb(b), t).map(Math.round));
/** Farbe als 32-Bit-Zahl für ImageData (Little Endian: AABBGGRR) */
function C(r, g, b, a = 255) {
  return ((clamp(a | 0, 0, 255) << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255)) >>> 0;
}
const Crgb = (c, a = 255) => C(Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), a);
const Chex = (h, a = 255) => Crgb(hex2rgb(h), a);
const unC = c => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];
/** Helligkeit 0..1 */
const luma = c => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;

// ---------- Pixel-Puffer: alles wird pixelgenau ohne Anti-Aliasing gezeichnet ----------
/** Drosselung: true höchstens hz-mal pro Sekunde (für langsame Menü-Animationen) */
const _thr = {};
function every(key, hz) { const now = performance.now(); if (now - (_thr[key] || 0) < 1000 / hz - 2) return false; _thr[key] = now; return true; }
class PB {
  constructor(w, h) { this.w = w | 0; this.h = h | 0; this.d = new Uint32Array(this.w * this.h); }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.d[y * this.w + x] = c; }
  get(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0; return this.d[y * this.w + x]; }
  /** Farbe mit Deckkraft a (0..1) über bestehenden Pixel legen */
  blend(x, y, c, a) {
    x = Math.floor(x); y = Math.floor(y); if (!this.inb(x, y)) return;
    const i = y * this.w + x, o = this.d[i];
    const n = unC(c);
    if (!o) { this.d[i] = C(n[0], n[1], n[2], 255 * a); return; }
    const p = unC(o), oa = p[3] / 255, na = a + oa * (1 - a);
    this.d[i] = C((n[0] * a + p[0] * oa * (1 - a)) / na, (n[1] * a + p[1] * oa * (1 - a)) / na, (n[2] * a + p[2] * oa * (1 - a)) / na, na * 255);
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hline(x0, x1, y, c) { if (x1 < x0) [x0, x1] = [x1, x0]; for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { if (y1 < y0) [y0, y1] = [y1, y0]; for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  /** Bresenham-Linie */
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (let n = 0; n < 2000; n++) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  /** gefüllter Kreis (Mittelpunkt in Pixelkoordinaten, kann .5 sein) */
  disc(cx, cy, r, c) {
    const R = Math.ceil(r) + 1;
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r * r) this.set(x, y, c);
    }
  }
  /** Ring zwischen r0 und r1 */
  ring(cx, cy, r0, r1, c) {
    const R = Math.ceil(r1) + 1;
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = dx * dx + dy * dy;
      if (d <= r1 * r1 && d > r0 * r0) this.set(x, y, c);
    }
  }
  /** Anderen Puffer hineinkopieren (transparente Pixel überspringen) */
  blit(src, ox, oy, flip = false) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + (flip ? src.w - 1 - x : x)];
      if (!c) continue;
      const a = (c >>> 24) / 255;
      if (a >= 0.99) this.set(ox + x, oy + y, c); else this.blend(ox + x, oy + y, c | 0xff000000, a);
    }
  }
  /** In ein Canvas umwandeln */
  canvas() {
    const cv = document.createElement('canvas'); cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d'); const id = ctx.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.d); ctx.putImageData(id, 0, 0);
    return cv;
  }
}

/** Canvas mit niedriger Auflösung erstellen (wird per CSS pixelig hochskaliert) */
function lowCanvas(w, h, cls = 'cv') {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.className = cls;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  return cv;
}

// ---------- 3x5 Bitmap-Pixelschrift ----------
const FONT = (() => {
  const g = {
    '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001',
    '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
    'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
    'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
    'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
    'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
    'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
    'Z': '111001010100111', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '+': '000010111010000',
    '/': '001001010100100', '%': '101001010100101', '!': '010010010000010', '?': '111001010000010', ' ': '000000000000000',
    '#': '101111101111101', ',': '000000000010100', "'": '010010000000000', '$': '011110010011110', '(': '010100100100010',
    ')': '010001001001010', '=': '000111000111000', '>': '100010001010100', '<': '001010100010001', '*': '000101010101000',
    '"': '101101000000000', '_': '000000000000111'
  };
  const map = { 'Ä': 'A', 'Ö': 'O', 'Ü': 'U', 'É': 'E', 'È': 'E', 'À': 'A' };
  return { g, map };
})();
const glyph = ch => { ch = ch.toUpperCase(); ch = FONT.map[ch] || ch; return FONT.g[ch] || FONT.g['?']; };
const textW = (s, sc = 1) => Math.max(0, String(s).length * 4 * sc - sc);
/** Text in Pixel-Puffer schreiben */
function pbText(pb, s, x, y, c, sc = 1) {
  s = String(s);
  for (let i = 0; i < s.length; i++) {
    const gl = glyph(s[i]);
    for (let j = 0; j < 15; j++) if (gl[j] === '1') pb.rect(x + (i * 4 + (j % 3)) * sc, y + Math.floor(j / 3) * sc, sc, sc, c);
  }
}
/** Text auf 2D-Canvas (fillRect = gestochen scharf), align: 'l' | 'c' | 'r' */
function cxText(ctx, s, x, y, color, sc = 1, align = 'l', shadow = null) {
  const k = ctx.getTransform ? ctx.getTransform().a : 1;
  if (k >= 2) return cxTextHD(ctx, s, x, y, color, sc, align, shadow, k);   // feine 5x7-Schrift
  s = String(s);
  const w = textW(s, sc);
  if (align === 'c') x -= Math.floor(w / 2); else if (align === 'r') x -= w;
  x = Math.round(x); y = Math.round(y);
  if (shadow) cxText(ctx, s, x + sc, y + sc, shadow, sc, 'l', null);
  ctx.fillStyle = color;
  for (let i = 0; i < s.length; i++) {
    const gl = glyph(s[i]);
    for (let j = 0; j < 15; j++) if (gl[j] === '1') ctx.fillRect(x + (i * 4 + (j % 3)) * sc, y + Math.floor(j / 3) * sc, sc, sc);
  }
}


// ---------- 5x7 HD-Pixelschrift (für Canvas in doppelter Auflösung) ----------
const FONT_HD = {
  '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14], '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
  'A': [14, 17, 17, 17, 31, 17, 17], 'B': [30, 17, 17, 30, 17, 17, 30], 'C': [14, 17, 16, 16, 16, 17, 14], 'D': [28, 18, 17, 17, 17, 18, 28], 'E': [31, 16, 16, 30, 16, 16, 31],
  'F': [31, 16, 16, 30, 16, 16, 16], 'G': [14, 17, 16, 23, 17, 17, 15], 'H': [17, 17, 17, 31, 17, 17, 17], 'I': [14, 4, 4, 4, 4, 4, 14], 'J': [7, 2, 2, 2, 2, 18, 12],
  'K': [17, 18, 20, 24, 20, 18, 17], 'L': [16, 16, 16, 16, 16, 16, 31], 'M': [17, 27, 21, 21, 17, 17, 17], 'N': [17, 17, 25, 21, 19, 17, 17], 'O': [14, 17, 17, 17, 17, 17, 14],
  'P': [30, 17, 17, 30, 16, 16, 16], 'Q': [14, 17, 17, 17, 21, 18, 13], 'R': [30, 17, 17, 30, 20, 18, 17], 'S': [15, 16, 16, 14, 1, 1, 30], 'T': [31, 4, 4, 4, 4, 4, 4],
  'U': [17, 17, 17, 17, 17, 17, 14], 'V': [17, 17, 17, 17, 17, 10, 4], 'W': [17, 17, 17, 21, 21, 21, 10], 'X': [17, 17, 10, 4, 10, 17, 17], 'Y': [17, 17, 17, 10, 4, 4, 4],
  'Z': [31, 1, 2, 4, 8, 16, 31], ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0],
  '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '/': [0, 1, 2, 4, 8, 16, 0], '%': [24, 25, 2, 4, 8, 19, 3], '!': [4, 4, 4, 4, 4, 0, 4],
  '?': [14, 17, 1, 2, 4, 0, 4], "'": [12, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0], '$': [4, 15, 20, 14, 5, 30, 4], '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '*': [0, 4, 21, 14, 21, 4, 0],
  '_': [0, 0, 0, 0, 0, 0, 31], '#': [10, 10, 31, 10, 31, 10, 10], '&': [12, 18, 20, 8, 21, 18, 13], '@': [14, 17, 23, 21, 23, 16, 14]
};
function glyphHD(ch) { ch = ch.toUpperCase(); ch = FONT.map[ch] || ch; return FONT_HD[ch] || FONT_HD['?']; }
/** Text in HD-Auflösung: p = Gerätepixel pro Glyphenpixel */
function cxTextHD(ctx, s, x, y, color, sc, align, shadow, k) {
  s = String(s);
  const p = Math.max(1, Math.round(sc * k / 2)), M = ctx.getTransform();
  const w = (s.length * 6 - 1) * p / k, h = 7 * p / k;
  if (align === 'c') x -= w / 2; else if (align === 'r') x -= w;
  y += (5 * sc - h) / 2;
  const X0 = Math.round(M.a * x + M.e), Y0 = Math.round(M.d * y + M.f);
  const key = s + '\u0001' + color + '\u0001' + (shadow || '') + '\u0001' + p;
  let c = _txtCache.get(key);
  if (!c) {                                             // einmal rendern, danach nur noch kopieren (schnell)
    c = document.createElement('canvas'); c.width = Math.max(1, s.length * 6 * p + p); c.height = 8 * p;
    const g = c.getContext('2d');
    const draw = (ox, oy, col) => {
      g.fillStyle = col;
      for (let i = 0; i < s.length; i++) { const gl = glyphHD(s[i]); for (let r = 0; r < 7; r++) { const row = gl[r]; if (!row) continue; for (let b = 0; b < 5; b++) if (row & (16 >> b)) g.fillRect(ox + (i * 6 + b) * p, oy + r * p, p, p); } }
    };
    if (shadow) draw(p, p, shadow);
    draw(0, 0, color);
    if (_txtCache.size > 900) _txtCache.clear();
    _txtCache.set(key, c);
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(c, X0, Y0); ctx.restore();
}
const _txtCache = new Map();
/** Canvas auf doppelte Auflösung umstellen; liefert Kontext mit Zeichnen in logischen Pixeln */
function hdCtx(cv, f = 2) {
  if (!cv._hd) { cv._lw = cv.width; cv._lh = cv.height; cv.width = cv._lw * f; cv.height = cv._lh * f; cv._hd = f; }
  const ctx = cv.getContext('2d'); ctx.setTransform(cv._hd, 0, 0, cv._hd, 0, 0); ctx.imageSmoothingEnabled = false;
  return ctx;
}
const cssOf = c => { const u = unC(c); return `rgb(${u[0]},${u[1]},${u[2]})`; };

// ---------- Pixel-Icons (8x8, im Code definiert) ----------
const ICON_PAL = {
  k: '#0d0f1a', y: '#ffcd75', o: '#ef7d57', w: '#f4f4f4', g: '#38b764', l: '#a7f070', b: '#3b5dc9', c: '#73eff7',
  r: '#b13e53', s: '#94b0c2', d: '#566c86', p: '#5d275d', n: '#8a5a3c', e: '#41a6f6', m: '#333c57'
};
const ICONS = {
  money: ['..kkkk..', '.kyyyyk.', 'kyykkyok', 'kykyyyok', 'kyykkyok', 'kyyyykok', '.kkkkoo.', '..kkkk..'],
  level: ['...kk...', '..kyyk..', 'kkkyykkk', 'kyyyyyyk', '.kyyyok.', '.kyokyk.', 'kyok.kok', 'kkk...kk'],
  rp: ['..kkkk..', '...kk...', '...kk...', '..kcck..', '.kccwck.', 'kcccccwk', 'kcclcccк'.replace('к', 'k'), '.kkkkkk.'],
  rep: ['k..kk..k', 'kk.kk.kk', 'kykyykyk', 'kyyyyyyk', 'kyryyryk', 'kyyyyyyk', 'kkkkkkkk', '........'],
  date: ['.k.kk.k.', 'kkkkkkkk', 'krrrrrrk', 'kwwwwwwk', 'kwkwkwwk', 'kwwwwwwk', 'kwkwwkwk', 'kkkkkkkk'],
  home: ['...kk...', '..krrk..', '.krrrrk.', 'krrrrrrk', '.kwwwwk.', '.kwnnwk.', '.kwnnwk.', '.kkkkkk.'],
  car: ['........', '..kkkk..', '.kbccbk.', 'kbbbbbbk', 'kybbbbrk', 'kkkkkkkk', '.kdk.kdk', '..k...k.'],
  engine: ['...kk...', '.kksskk.', '.kssssk.', 'kssddssk', 'kssddssk', '.kssssk.', '.kksskk.', '...kk...'],
  seat: ['..kkk...', '.kppk...', '.kppk...', '.kppk...', '.kpppkk.', '.kppppk.', '..kkkkk.', '...k.k..'],
  list: ['kkkkkkkk', 'kykwwwwk', 'kkkkkkkk', 'kykwwwwk', 'kkkkkkkk', 'kykwwwwk', 'kkkkkkkk', '........'],
  factory: ['kk......', 'kk......', 'kk.k..k.', 'kkkkkkkk', 'kssksskk', 'ksskssk k'.replace(' ', ''), 'kyykyykk', 'kkkkkkkk'],
  market: ['.......k', '......kg', '..k..kg.', '.kgkkg..', 'kg.kg...', 'k.......', 'k.......', 'kkkkkkkk'],
  research: ['..kkk...', '.kcwck..', 'kcccccк.'.replace('к', 'k'), 'kcccccck', '.kcccck.', '..kkkk..', '..kssk..', '..kkkk..'],
  race: ['kwkwkwk.', 'kkwkwkk.', 'kwkwkwk.', 'kkwkwkk.', 'kk......', 'kk......', 'kk......', 'kk......'],
  trophy: ['kkkkkkkk', 'kyyyyyyk', 'kkyyyykk', '.kyyyyk.', '..kyyk..', '...kk...', '..kyyk..', '.kkkkkk.'],
  play: ['.k......', '.kkk....', '.klllk..', '.kllllk.', '.klllk..', '.kkk....', '.k......', '........'],
  lock: ['..kkkk..', '.kk..kk.', '.k....k.', 'kkkkkkkk', 'kyyyyyyk', 'kyykkyyk', 'kyyyyyyk', 'kkkkkkkk'],
  check: ['........', '......kk', '.....klk', 'kk..klk.', 'klkklk..', '.kllk...', '..kk....', '........'],
  box: ['kkkkkkkk', 'knnnnnnk', 'knyyyynk', 'kkkkkkkk', 'knnnnnnk', 'knnnnnnk', 'knnnnnnk', 'kkkkkkkk'],
  ad: ['......kk', '....kkwk', 'kkkkwwwk', 'krkwwwwk', 'krkwwwwk', 'kkkkwwwk', '..k.kkwk', '..k...kk'],
  wrench: ['.....kk.', '....ks.k', '....kssk', '...kssk.', '..kssk..', '.kssk...', 'kssk....', 'kkk.....'],
  star: ['...k....', '..kyk...', 'kkyyykk.', 'kyyyyyk.', '.kyyyk..', '.kykyk..', 'kk...kk.', '........'],
  fire: ['...k....', '..kok...', '..koyk..', '.koyyok.', 'koyywyok', 'koywwyok', '.koyyok.', '..kkkk..'],
  nos: ['..kkkk..', '..kssk..', '.kbbbbk.', '.kbwbbk.', '.kbwbbk.', '.kbbbbk.', '.kbbbbk.', '..kkkk..']
};
const _iconCache = {};
/** Icon als Data-URL (8x8, wird per CSS pixelig vergrössert) */
function iconURL(name) {
  if (_iconCache[name]) return _iconCache[name];
  const rows = ICONS[name] || ICONS.star;
  const cv = document.createElement('canvas'); cv.width = 8; cv.height = 8;
  const ctx = cv.getContext('2d');
  rows.forEach((row, y) => { for (let x = 0; x < 8; x++) { const ch = row[x]; if (ch && ch !== '.' && ICON_PAL[ch]) { ctx.fillStyle = ICON_PAL[ch]; ctx.fillRect(x, y, 1, 1); } } });
  return (_iconCache[name] = cv.toDataURL());
}
const ico = (n, cls = '') => `<img class="ico ${cls}" src="${iconURL(n)}" alt="">`;

/** Pixel-Balken als HTML */
function barHTML(v, max, color = 'var(--lime)') {
  const p = clamp(v / max, 0, 1) * 100;
  return `<div class="bar"><i style="width:${p.toFixed(1)}%;background:repeating-linear-gradient(90deg,${color} 0 5px,rgba(0,0,0,.25) 5px 6px)"></i></div>`;
}

/** Poisson-Zufallszahl (für Verkäufe pro Tag) */
function poisson(l) {
  if (l <= 0) return 0;
  if (l > 30) return Math.max(0, Math.round(l + Math.sqrt(l) * (Math.random() + Math.random() + Math.random() - 1.5) * 2));
  const L = Math.exp(-l); let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 200);
  return k - 1;
}

/** Datum aus Spieltag (Start: 1. Januar 2026) */
function dayToDate(day) {
  const d = new Date(2026, 0, 1); d.setDate(d.getDate() + Math.floor(day));
  return d;
}
const fmtDate = day => { const d = dayToDate(day); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
