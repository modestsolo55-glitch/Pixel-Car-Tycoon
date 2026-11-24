/* =============================================================================
   Teil 11: 3D-Showroom – Voxel-Modell aus dem Pixel-Sprite, gerendert in
   niedriger Auflösung (320x180) und pixelig hochskaliert. Drehscheibe, Maus-
   Steuerung (drehen/zoomen) und Türen zum Öffnen mit sichtbarem Interieur.
   ============================================================================= */
let SHOW = null;

function open3D(design) {
  if (typeof THREE === 'undefined') { toast('Die 3D-Ansicht braucht Internet (Three.js konnte nicht geladen werden).', 'bad', 5000); return; }
  openModal(`<h2 class="title">${ico('car', 'big')} 3D-Showroom – ${esc(design.name || 'Prototyp')}</h2>
    <div id="show3d"><canvas id="cv3d" width="320" height="180"></canvas></div>
    <div class="flex" style="margin-top:8px">
      <button class="btn yellow" data-act="s3door" id="s3door">Türen öffnen</button>
      <button class="btn" data-act="s3spin" id="s3spin">Drehscheibe: an</button>
      <button class="btn dark" data-act="s3reset">Ansicht zurücksetzen</button>
      <span class="hint" style="flex:1">Ziehen = drehen · Mausrad / Pinch = zoomen</span>
      <button class="btn gray" data-act="close">Schliessen</button>
    </div>`);
  $('#modal').dataset.onclose = 'close3D';
  try { init3D(design); } catch (e) { console.error(e); toast('3D-Ansicht konnte nicht gestartet werden.', 'bad'); }
}
ACTIONS.s3door = () => { if (!SHOW) return; SHOW.doorTarget = SHOW.doorTarget > 0 ? 0 : 1; $('#s3door').textContent = SHOW.doorTarget ? 'Türen schliessen' : 'Türen öffnen'; };
ACTIONS.s3spin = () => { if (!SHOW) return; SHOW.spin = !SHOW.spin; $('#s3spin').textContent = 'Drehscheibe: ' + (SHOW.spin ? 'an' : 'aus'); };
ACTIONS.s3reset = () => { if (!SHOW) return; Object.assign(SHOW.cam, { az: 0.7, el: 0.32, dist: 13 }); };

/** Pixel-Textur (Canvas) ohne Glättung */
function pixTex(cv) { const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; return t; }

function init3D(design) {
  const cv = $('#cv3d');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
  renderer.setPixelRatio(1); renderer.setSize(640, 360, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#14182a');
  scene.fog = new THREE.Fog('#14182a', 22, 45);
  const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 100);
  // Licht
  scene.add(new THREE.AmbientLight(0x8890b0, 0.55));
  const key = new THREE.DirectionalLight(0xfff0d8, 0.85); key.position.set(6, 12, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x73eff7, 0.35); rim.position.set(-8, 5, -6); scene.add(rim);
  const spot = new THREE.PointLight(0xffcd75, 0.6, 30); spot.position.set(0, 9, 0); scene.add(spot);
  // Boden mit Pixel-Karomuster
  const fc = document.createElement('canvas'); fc.width = 16; fc.height = 16; const fx = fc.getContext('2d');
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { fx.fillStyle = ((x >> 3) + (y >> 3)) % 2 ? '#22263a' : '#2b3150'; fx.fillRect(x, y, 1, 1); }
  const ftex = pixTex(fc); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(20, 20);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ map: ftex }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  // Rückwand mit Firmenlogo
  const wc = document.createElement('canvas'); wc.width = 128; wc.height = 32; const wx = wc.getContext('2d');
  wx.fillStyle = '#29366f'; wx.fillRect(0, 0, 128, 32); wx.fillStyle = '#ffcd75'; wx.fillRect(0, 0, 128, 1); wx.fillRect(0, 31, 128, 1);
  cxText(wx, S.company.toUpperCase().slice(0, 28), 64, 9, '#ffcd75', 1, 'c'); cxText(wx, 'SHOWROOM', 64, 19, '#73eff7', 1, 'c');
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshLambertMaterial({ map: pixTex(wc) }));
  wall.position.set(0, 5, -14); scene.add(wall);
  for (let i = -2; i <= 2; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.6), new THREE.MeshBasicMaterial({ color: 0xfff4c8 })); l.position.set(i * 5, 11, -4); scene.add(l); }
  // Drehscheibe
  const table = new THREE.Group(); scene.add(table);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.4, 0.3, 24), new THREE.MeshLambertMaterial({ color: 0x566c86 }));
  disc.position.y = 0.15; table.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.25, 0.08, 4, 32), new THREE.MeshBasicMaterial({ color: 0x73eff7 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; table.add(ring);
  // Auto
  const built = buildVoxelCar(design);
  built.group.position.y = 0.3;
  table.add(built.group);
  SHOW = { renderer, scene, camera, table, car: built, spin: true, door: 0, doorTarget: 0, cam: { az: 0.7, el: 0.32, dist: 13 }, raf: 0, last: performance.now() };
  // Maus/Touch-Steuerung
  let drag = null; const pts = new Map(); let pinch = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); drag = [e.clientX, e.clientY]; cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) SHOW.cam.dist = clamp(SHOW.cam.dist * pinch / d, 6, 26); pinch = d; return; }
    if (!drag) return;
    SHOW.cam.az -= (e.clientX - drag[0]) * 0.01; SHOW.cam.el = clamp(SHOW.cam.el + (e.clientY - drag[1]) * 0.006, 0.04, 1.3);
    drag = [e.clientX, e.clientY];
  });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (!pts.size) { drag = null; cv.style.cursor = 'grab'; } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); SHOW.cam.dist = clamp(SHOW.cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 6, 26); }, { passive: false });
  const loop = now => {
    if (!SHOW) return;
    const dt = Math.min(0.05, (now - SHOW.last) / 1000); SHOW.last = now;
    if (SHOW.spin) SHOW.table.rotation.y += dt * 0.35;
    SHOW.door += (SHOW.doorTarget - SHOW.door) * Math.min(1, dt * 5);
    SHOW.car.doors.forEach(dg => { dg.rotation.y = dg.userData.side * SHOW.door * 1.15; });
    const c = SHOW.cam;
    camera.position.set(Math.sin(c.az) * Math.cos(c.el) * c.dist, 1.4 + Math.sin(c.el) * c.dist, Math.cos(c.az) * Math.cos(c.el) * c.dist);
    camera.lookAt(0, 1.3, 0);
    renderer.render(scene, camera);
    SHOW.raf = requestAnimationFrame(loop);
  };
  SHOW.raf = requestAnimationFrame(loop);
}

function close3D() {
  if (!SHOW) return;
  cancelAnimationFrame(SHOW.raf);
  SHOW.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  SHOW.renderer.dispose();
  SHOW = null;
}

/** Baut aus dem Pixel-Sprite ein Voxel-Auto (Karosserieform, Farben, Felgen, Spoiler, Tieferlegung) */
function buildVoxelCar(design) {
  const s = drawCarSprite(design, { brand: S.company, exh: (getEngine(design.engineId) || {}).exh, sc: 1 });
  const B = BODIES[design.body], L = s.L, W = s.W, H = s.H;
  const I = Object.assign(defaultInterior(), design.interior || {});
  const hw0 = Math.max(9, Math.round(L / 4.6));
  const c1 = hex2rgb(design.color), c2 = hex2rgb(design.color2);
  const kb = Math.floor(s.beltY);
  const maskAt = (x, k) => { const sx = s.ox + x, sy = s.gy - 1 - k; if (sx < 0 || sy < 0 || sx >= W || sy >= H) return 0; return s.mask[sy * W + sx]; };
  const colAt = (x, k) => { const sx = s.ox + x, sy = s.gy - 1 - k; return s.pb.d[sy * W + sx]; };
  const solid = m => m === M_BODY || m === M_GLASS || m === M_TRIM || m === M_LIGHT || m === M_AERO;
  /** halbe Breite an einer Pixelposition (Dach eingezogen, Enden abgerundet) */
  const hwAt = (x, k) => {
    const m = maskAt(x, k);
    if (!solid(m)) return -1;
    if (m === M_AERO) return hw0 - 1;
    let h = hw0;
    if (k + 0.5 > s.beltY + 0.5) h -= 1 + Math.round((k - s.beltY) * 0.42);
    if (Math.abs(x - B.mirror) <= 1 && k >= kb && k <= kb + 2) h = hw0 + 1;
    const dx = Math.min(x, L - 1 - x);
    if (dx < 4) h -= Math.round((4 - dx) * 0.7);
    if (k - s.bot[clamp(x, 0, L - 1)] < 1.5) h -= 1;
    return Math.max(2, h);
  };
  const doorsX = B.doors.slice().sort((a, b) => a - b);
  const dFront = doorsX.length >= 3 ? [doorsX[doorsX.length - 2], doorsX[doorsX.length - 1]] : [doorsX[0], doorsX[doorsX.length - 1]];
  const inDoor = (x, k) => x > dFront[0] && x < dFront[1] && k > s.bot[x] + 0.5;
  const body = [], glass = [], doorL = [], doorR = [];
  // Front-/Heckdetails: in welchen Höhen liegen Scheinwerfer, Grill und Rückleuchten?
  const rowsOf = (x0, x1, mm) => { const set = new Set(); for (let x = x0; x <= x1; x++) for (let k = 0; k < H; k++) if (maskAt(x, k) === mm) set.add(k); return set; };
  const headRows = rowsOf(L - 9, L - 1, M_LIGHT), grilleRows = rowsOf(L - 9, L - 1, M_TRIM), tailRows = rowsOf(0, 8, M_LIGHT);
  const lit = (r, g, b) => [r / 255, g / 255, b / 255];
  /** Farbe einer Front- bzw. Heckfläche (Scheinwerfer, Grill, Nummernschild, Rückleuchten, Auspuff) */
  const endRGB = (x, k, z, hw, front) => {
    const az = Math.abs(z), bot = s.bot[clamp(x, 0, L - 1)], lowK = k - bot;
    if (front) {
      if (headRows.has(k) && az >= hw * 0.42 && az <= hw - 1) return az === hw - 1 || k === Math.min(...headRows) ? lit(42, 44, 56) : lit(240, 248, 255);
      if (headRows.has(k) && az >= hw * 0.35) return lit(60, 64, 80);
      if (grilleRows.has(k) && az < hw * 0.5) return k % 2 ? lit(15, 16, 22) : lit(90, 94, 110);
      if (lowK >= 1 && lowK < 3 && az <= 3) return lowK === 1 ? lit(40, 40, 50) : lit(232, 232, 236);    // Nummernschild
      if (lowK < 1) return lit(20, 20, 26);                                                               // Frontlippe
    } else {
      if (tailRows.has(k) && az >= hw * 0.38) return k === Math.max(...tailRows) ? lit(255, 120, 130) : lit(200, 26, 48);
      if (tailRows.has(k) && design.kit !== 'none' && az < hw * 0.38) return lit(120, 14, 30);           // Leuchtband
      if (lowK >= 1.5 && lowK < 3.5 && az <= 3) return Math.floor(lowK) === 1 ? lit(40, 40, 50) : lit(232, 232, 236);
      if (lowK < 1.5 && az >= hw * 0.45 && az <= hw * 0.45 + 2) return lit(60, 62, 70);                   // Auspuff
      if (lowK < 1) return lit(18, 18, 24);
    }
    return null;
  };
  const tmpC = new THREE.Color();
  const toC = c => { const u = unC(c); return [u[0] / 255, u[1] / 255, u[2] / 255]; };
  const paintTop = (x, z) => {
    let base = c1;
    if (design.stripe === 'racing' && Math.abs(z) < hw0 * 0.32 && Math.abs(z) > 0.6) base = c2;
    if (design.stripe === 'twotone') base = c1;
    const sh = design.paint === 'matte' ? -0.08 : design.paint === 'chrome' ? 0.4 : 0.04;
    let c = shadeRGB(base, sh + (design.paint === 'metallic' ? (hash2(x, z + 50) - 0.5) * 0.15 : 0));
    return [c[0] / 255, c[1] / 255, c[2] / 255];
  };
  for (let x = -12; x < L + 6; x++) for (let k = -2; k < H; k++) {
    const hw = hwAt(x, k); if (hw < 0) continue;
    const m = maskAt(x, k);
    const nb = [hwAt(x, k + 1), hwAt(x, k - 1), hwAt(x - 1, k), hwAt(x + 1, k)];
    const inner = Math.min(hw - 1, ...nb.map(v => v < 0 ? -1 : v));
    const sideRGB = (() => {
      // Kontur-Pixel des Sprites (dunkel) für die 3D-Seite durch Lackton ersetzen
      const edge = [maskAt(x, k + 1), maskAt(x, k - 1), maskAt(x - 1, k), maskAt(x + 1, k)].some(v => !solid(v) && v !== M_WHEEL && v !== M_WELL);
      if (edge && m === M_BODY) return paintTop(x, hw + 99).map(v => v * 0.8);
      return toC(colAt(x, k));
    })();
    for (let z = -hw; z <= hw; z++) {
      const side = Math.abs(z) === hw;
      if (!side && Math.abs(z) <= inner) continue;
      let rgb;
      const exF = x > L * 0.55 && hwAt(x + 1, k) < Math.abs(z), exR = x < L * 0.45 && hwAt(x - 1, k) < Math.abs(z);
      const er = !side && (m === M_BODY || m === M_LIGHT || m === M_TRIM) && (exF || exR) ? endRGB(x, k, z, hw, exF) : null;
      if (er) rgb = er;
      else if (side) rgb = sideRGB;
      else if (m === M_GLASS) { const g = toC(colAt(x, k)), sky = [0.42, 0.6, 0.78], f = 0.35 + 0.25 * (Math.abs(z) / hw); rgb = [lerp(g[0], sky[0], f), lerp(g[1], sky[1], f), lerp(g[2], sky[2], f)]; }
      else if (m === M_BODY) {
        const below = Math.abs(z) > (nb[1] < 0 ? -1 : nb[1]) && !(Math.abs(z) > (nb[0] < 0 ? -1 : nb[0]));
        rgb = below ? [0.08, 0.08, 0.1] : paintTop(x, z);
      } else rgb = toC(colAt(x, k));
      const v = { x: x - L / 2, y: k + 0.5, z, rgb, glass: m === M_GLASS };
      if (side && inDoor(x, k)) (z > 0 ? doorL : doorR).push(v);
      else if (m === M_GLASS && !side) glass.push(v);
      else if (m === M_GLASS) (inDoor(x, k) ? (z > 0 ? doorL : doorR) : glass).push(v);
      else body.push(v);
    }
  }
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mkInst = (list, mat) => {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    const m4 = new THREE.Matrix4();
    list.forEach((v, i) => { m4.makeTranslation(v.x, v.y, v.z); im.setMatrixAt(i, m4); tmpC.setRGB(v.rgb[0], v.rgb[1], v.rgb[2]); im.setColorAt(i, tmpC); });
    if (!list.length) im.count = 0;
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return im;
  };
  const scale = 0.1;
  const inner = new THREE.Group(); inner.scale.set(scale, scale, scale); group.add(inner);
  inner.add(mkInst(body, new THREE.MeshLambertMaterial({ color: 0xffffff })));
  inner.add(mkInst(glass, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })));
  // Türen als drehbare Gruppen (Scharnier an der Vorderkante)
  const doors = [];
  for (const [list, side] of [[doorL, 1], [doorR, -1]]) {
    const g = new THREE.Group();
    const hx = dFront[1] - L / 2 + 0.5, hz = side * hw0;
    g.position.set(hx, 0, hz); g.userData.side = side;
    list.forEach(v => { v.x -= hx; v.z -= hz; });
    g.add(mkInst(list, new THREE.MeshLambertMaterial({ color: 0xffffff })));
    inner.add(g); doors.push(g);
  }
  // Interieur: Boden, Sitze, Armaturenbrett, Lenkrad, ggf. Käfig
  const seatC = new THREE.Color(I.seatColor), dashC = new THREE.Color(I.dash === 'carbon' ? '#2a2b33' : I.tier === 'luxus' ? '#5a3a28' : '#2e2f38');
  const box = (w, h, d, x, y, z, col) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: col })); mesh.position.set(x - L / 2, y, z); inner.add(mesh); return mesh; };
  const g0 = B.glass[0], g1 = B.glass[1], cabinY = Math.ceil(s.bot[Math.floor(L / 2)]) + 1;
  box(Math.max(6, g1 - g0 - 2), 1, hw0 * 2 - 3, (g0 + g1) / 2, cabinY, 0, 0x14151c);
  const seatX = Math.round(g1 - (g1 - g0) * 0.45);
  for (const z of [hw0 * 0.45, -hw0 * 0.45]) {
    box(6, 2, 6, seatX + 1, cabinY + 2, z, seatC);
    box(2, I.seats === 'sport' || I.seats === 'carbon' ? 9 : 8, 6, seatX - 2, cabinY + 6, z, seatC);
    box(1.5, 2, 4, seatX - 2.5, cabinY + 11, z, seatC.clone().multiplyScalar(0.8));
  }
  box(4, 4, hw0 * 2 - 3, g1 - 4, kb + 1, 0, dashC);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.4, 4, 12), new THREE.MeshLambertMaterial({ color: 0x1a1b22 }));
  wheel.position.set(g1 - 8 - L / 2, kb + 3, hw0 * 0.45); wheel.rotation.y = Math.PI / 2; wheel.rotation.x = 0.3; inner.add(wheel);
  if (I.ambient !== 'none' && has('int_ambient')) box(1, 0.5, hw0 * 2 - 4, g1 - 6, kb + 3.2, 0, new THREE.Color(I.ambient));
  if (I.cage && has('int_rollcage')) { box(1, 12, 1, seatX - 5, kb + 2, hw0 - 3, 0xe8b830); box(1, 12, 1, seatX - 5, kb + 2, -hw0 + 3, 0xe8b830); box(1, 1, hw0 * 2 - 5, seatX - 5, kb + 8, 0, 0xe8b830); }
  // Räder aus den Sprite-Pixeln (Felgendesign bleibt erhalten)
  const tireC = new THREE.Color('#1e1e24');
  const wheelVox = [];
  for (const w of s.wheels) {
    const R = w.r;
    for (let dy = -Math.ceil(R); dy <= Math.ceil(R); dy++) for (let dx = -Math.ceil(R); dx <= Math.ceil(R); dx++) {
      const sx = Math.floor(w.x + dx), sy = Math.floor(w.y + dy);
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const dd = Math.hypot(sx + 0.5 - w.x, sy + 0.5 - w.y);
      if (dd > R) continue;
      const k = s.gy - 1 - sy, x = sx - s.ox;
      const faceRGB = s.mask[sy * W + sx] === M_WHEEL ? toC(s.pb.d[sy * W + sx]) : [0.07, 0.07, 0.09];
      for (const sgn of [1, -1]) for (let zz = 0; zz < 5; zz++) {
        const z = sgn * (hw0 + 1 - zz);
        const outer = zz === 0, tread = dd > R - 1.2;
        if (!outer && !tread && zz !== 4) continue;
        wheelVox.push({ x: x - L / 2, y: k + 0.5, z, rgb: outer ? faceRGB : [tireC.r, tireC.g, tireC.b] });
      }
    }
  }
  inner.add(mkInst(wheelVox, new THREE.MeshLambertMaterial({ color: 0xffffff })));
  // Unterboden-Schatten
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(L * 1.05, hw0 * 2.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; inner.add(shadow);
  return { group, doors };
}
