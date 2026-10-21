// Hero: the bent pipe in 3D at the last saved step (t = 2.00 s).
// World axes: X = pipe y (along the first leg), Y = pipe z (up), Z = pipe x. One world unit = 0.1 m.
// The mid-plane is a ribbon textured with the unrolled |U| strip, the sample planes are discs textured from the
// disc atlas, and dots ride the streamlines from media/streams.json.
import * as THREE from './vendor/three.module.min.js';

const box = document.getElementById('hero3d');
const canvas = document.getElementById('pipe3d');
if (box && canvas) init();

async function init() {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [F, streams, strip, discs] = await Promise.all([
    fetch('media/flow.json').then((r) => r.json()),
    fetch('media/streams.json').then((r) => r.json()),
    loadImg('media/strip.png'),
    loadImg('media/discs.png'),
  ]);
  const K = F.times.length - 1; // last saved step
  const S = 10; // metres -> world units
  const R = 0.02 * S, RB = 0.06 * S, LEG = 0.4 * S;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);

  // Centreline: leg 1 along +X, quarter bend about (LEG, RB), leg 2 up +Y at X = LEG + RB.
  class Bend extends THREE.Curve {
    getPoint(t, out = new THREE.Vector3()) {
      const a = -Math.PI / 2 + t * (Math.PI / 2);
      return out.set(LEG + RB * Math.cos(a), RB + RB * Math.sin(a), 0);
    }
  }
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(LEG, 0, 0)));
  path.add(new Bend());
  path.add(new THREE.LineCurve3(new THREE.Vector3(LEG + RB, RB, 0), new THREE.Vector3(LEG + RB, RB + LEG, 0)));
  const LEN = path.getLength();
  const at = (s) => path.getPointAt(Math.min(1, Math.max(0, s / LEN)));
  const tan = (s) => path.getTangentAt(Math.min(1, Math.max(0, s / LEN)));
  // In-plane normal pointing to the outer wall of the bend.
  const outward = (s) => { const t = tan(s); return new THREE.Vector3(t.y, -t.x, 0); };

  const root = new THREE.Group();
  scene.add(root);
  const centre = new THREE.Vector3(2.55, 2.2, 0);
  root.position.copy(centre).multiplyScalar(-1);

  // ── Glass tube ───────────────────────────────────────────────────────────
  const tubeGeo = new THREE.TubeGeometry(path, 360, R, 56, false);
  const glassBack = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.25, side: THREE.BackSide, depthWrite: false });
  const glassFront = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2, side: THREE.FrontSide, depthWrite: false });
  root.add(new THREE.Mesh(tubeGeo, glassBack));
  const front = new THREE.Mesh(tubeGeo, glassFront);
  front.renderOrder = 5;
  root.add(front);

  // Mesh lines, like the thesis' wireframe drawing: a ring every diameter and 12 lines along the pipe.
  const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false });
  const ringPts = [];
  const ring = (s, r = R) => {
    const p = at(s), t = tan(s), n = outward(s), b = new THREE.Vector3().crossVectors(t, n);
    const pts = [];
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push(p.clone().addScaledVector(n, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r)); }
    return pts;
  };
  for (let s = 0; s <= LEN + 1e-6; s += 0.4) ringPts.push(ring(s));
  [0, LEN].forEach((s) => ringPts.push(ring(s)));
  const rings = new THREE.Group();
  ringPts.forEach((pts) => rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat)));
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * Math.PI * 2, pts = [];
    for (let i = 0; i <= 240; i++) {
      const s = (i / 240) * LEN, p = at(s), t = tan(s), n = outward(s), b = new THREE.Vector3().crossVectors(t, n);
      pts.push(p.addScaledVector(n, Math.cos(a) * R).addScaledVector(b, Math.sin(a) * R));
    }
    rings.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  root.add(rings);

  // ── Colour helpers ───────────────────────────────────────────────────────
  const jet = (t) => { const c = (x) => Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - x))); return [c(3) * 255, c(2) * 255, c(1) * 255]; };
  function grey(img) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data };
  }
  function tex(w, h, fill) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), im = g.createImageData(w, h);
    fill(im.data);
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  }

  // ── Mid-plane ribbon ────────────────────────────────────────────────────
  const SG = grey(strip), SN = F.strip.s, NN = F.strip.n;
  const stripTex = tex(SN, NN, (d) => {
    for (let y = 0; y < NN; y++) for (let x = 0; x < SN; x++) {
      const v = SG.d[((K * NN + y) * SG.w + x) * 4], c = jet(v / 254), o = (y * SN + x) * 4;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
  });
  {
    const segs = 360, pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const s = (i / segs) * LEN, p = at(s), n = outward(s);
      // row 0 of the strip is the inner wall (n = -R); canvas textures flip, so v = 1 there
      for (const [k, sgn] of [[0, -1], [1, 1]]) {
        const q = p.clone().addScaledVector(n, sgn * R * 0.985);
        pos.push(q.x, q.y, q.z);
        uv.push(i / segs, k === 0 ? 1 : 0);
      }
      if (i < segs) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const ribbon = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: stripTex, side: THREE.DoubleSide, transparent: true, opacity: 0.96 }));
    ribbon.renderOrder = 1;
    root.add(ribbon);
  }

  // ── Sample planes ───────────────────────────────────────────────────────
  const DG = grey(discs), N = F.discs.n;
  const planeColor = { b1: '--s-b1', a1: '--s-a1', a5: '--s-a5', a9: '--s-a9' };
  const discMeshes = [];
  F.discs.planes.forEach((pl, i) => {
    const flip = pl.id === 'b1';
    const t = tex(N, N, (d) => {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const sy = flip ? N - 1 - y : y, v = DG.d[((i * N + sy) * DG.w + K * N + x) * 4], o = (y * N + x) * 4;
        if (v === 255) { d[o + 3] = 0; continue; }
        const c = jet(v / 254); d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    });
    const g = new THREE.CircleGeometry(R * 1.002, 72);
    // texture u -> pipe x (world Z), texture v up -> outer wall
    if (pl.axis === 'y') { g.rotateX(Math.PI); g.rotateY(-Math.PI / 2); } else { g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2); }
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: true, opacity: 0.97 }));
    const s = pl.axis === 'y' ? pl.at * S : (F.strip.stations[pl.id]) * S;
    m.position.copy(at(s));
    m.renderOrder = 2;
    root.add(m);
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring(s, R * 1.02)), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 }));
    edge.userData.var = planeColor[pl.id];
    root.add(edge);
    discMeshes.push({ id: pl.id, name: pl.name, pos: at(s), edge });
  });

  // ── Streamlines and tracers ─────────────────────────────────────────────
  const [ps, us] = streams.scale;
  const lines = streams.lines.map((l) => {
    const n = l.u.length, pts = new Float32Array(n * 3), sp = new Float32Array(n), cum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = l.p[i * 3] * ps * S, y = l.p[i * 3 + 1] * ps * S, z = l.p[i * 3 + 2] * ps * S;
      pts[i * 3] = y; pts[i * 3 + 1] = z; pts[i * 3 + 2] = x;
      sp[i] = Math.max(0.05, l.u[i] * us);
      if (i) cum[i] = cum[i - 1] + Math.hypot(pts[i * 3] - pts[i * 3 - 3], pts[i * 3 + 1] - pts[i * 3 - 2], pts[i * 3 + 2] - pts[i * 3 - 1]);
    }
    return { n, pts, sp, cum, len: cum[n - 1] };
  });
  const streamMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.12, depthWrite: false });
  const streamGroup = new THREE.Group();
  lines.forEach((l) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(l.pts, 3)); streamGroup.add(new THREE.Line(g, streamMat)); });
  root.add(streamGroup);

  const PER = 4;
  const tracers = [];
  lines.forEach((l, li) => { for (let j = 0; j < PER; j++) tracers.push({ l, d: ((j + (li * 0.618) % 1) / PER) * l.len }); });
  const tPos = new Float32Array(tracers.length * 3);
  const tGeo = new THREE.BufferGeometry();
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const tMat = new THREE.PointsMaterial({ size: 0.055, map: dot, alphaTest: 0.4, transparent: true, depthWrite: false });
  const points = new THREE.Points(tGeo, tMat);
  points.renderOrder = 6;
  root.add(points);
  function place(tr) {
    const { l } = tr;
    let i = 0, lo = 0, hi = l.n - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (l.cum[m] < tr.d) lo = m + 1; else hi = m; }
    i = Math.max(1, lo);
    const f = (tr.d - l.cum[i - 1]) / Math.max(1e-6, l.cum[i] - l.cum[i - 1]);
    return [i, f];
  }
  function stepTracers(dt) {
    tracers.forEach((tr, k) => {
      const [i, f] = place(tr), { l } = tr;
      const v = l.sp[i - 1] + (l.sp[i] - l.sp[i - 1]) * f;
      tr.d += v * S * dt * 0.55;
      if (tr.d >= l.len) tr.d -= l.len;
      const [j, g] = place(tr);
      for (let c = 0; c < 3; c++) tPos[k * 3 + c] = l.pts[(j - 1) * 3 + c] + (l.pts[j * 3 + c] - l.pts[(j - 1) * 3 + c]) * g;
    });
    tGeo.attributes.position.needsUpdate = true;
  }
  stepTracers(0);

  // ── Lights ──────────────────────────────────────────────────────────────
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9cdb5, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(4, 8, 6); scene.add(key);

  // ── Theme ───────────────────────────────────────────────────────────────
  function theme() {
    const cs = getComputedStyle(document.documentElement), ink = new THREE.Color(cs.getPropertyValue('--strong').trim() || '#0c0c33');
    const dark = (cs.getPropertyValue('--bg').trim() || '').toLowerCase() !== '#f4f1e9';
    lineMat.color.copy(ink); lineMat.opacity = dark ? 0.16 : 0.22;
    streamMat.color.copy(ink); streamMat.opacity = dark ? 0.16 : 0.12;
    tMat.color.copy(dark ? new THREE.Color('#fff7e6') : ink);
    glassFront.opacity = dark ? 0.08 : 0.16; glassBack.opacity = dark ? 0.05 : 0.1;
    glassFront.color.set(dark ? '#cfc6b0' : '#ffffff'); glassBack.color.set(dark ? '#cfc6b0' : '#ffffff');
    discMeshes.forEach((d) => d.edge.material.color.set(cs.getPropertyValue(d.edge.userData.var).trim()));
    dirty = true;
  }
  let dirty = true;
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);
  theme();

  // ── Labels ──────────────────────────────────────────────────────────────
  const tagsBox = document.getElementById('h-tags');
  const tags = discMeshes.map((d) => {
    const el = document.createElement('span');
    el.className = 'h-tag';
    el.style.setProperty('--c', `var(${planeColor[d.id]})`);
    el.innerHTML = `<i></i>${d.name}`;
    tagsBox.append(el);
    return { el, pos: d.pos, side: d.id === 'b1' ? 'down' : 'right' };
  });
  const io = [['Inlet · 0.5 m/s', at(0), 'up'], ['Outlet · 1 bar', at(LEN), 'up']].map(([t, pos, side]) => {
    const el = document.createElement('span'); el.className = 'h-tag'; el.textContent = t; el.style.background = 'none'; el.style.boxShadow = 'none'; el.style.color = 'var(--soft)';
    tagsBox.append(el); return { el, pos, side };
  });
  const allTags = [...tags, ...io];
  const v3 = new THREE.Vector3();
  function placeTags(w, h) {
    allTags.forEach((t) => {
      root.localToWorld(v3.copy(t.pos));
      v3.project(camera);
      const x = (v3.x * 0.5 + 0.5) * w, y = (-v3.y * 0.5 + 0.5) * h;
      // narrow screens: the vertical leg sits near the right edge, so its tags go on the left
      const side = w < 600 && t.side === 'right' ? 'left' : t.side;
      const off = { right: [18, -10], left: [-18, -10], down: [0, 22], up: [0, -34] }[side];
      const tx = side === 'left' ? 'translateX(-100%)' : side === 'down' || side === 'up' ? 'translateX(-50%)' : '';
      t.el.style.transform = `translate(${x + off[0]}px, ${y + off[1]}px) ${tx}`;
    });
  }

  // ── View: drag to turn, eased ───────────────────────────────────────────
  const group = new THREE.Group();
  scene.remove(root); group.add(root); scene.add(group);
  const HOME = { az: -0.55, el: 0.36 };
  let az = HOME.az, el = HOME.el, taz = az, tel = el, dist = 15, idle = !still, t0 = performance.now(), last = t0, playing = !still;
  function frame() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // fit the 5 x 5 unit pipe in both directions
      const fitH = 3.05 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fitW = fitH / Math.min(1, camera.aspect * 0.92);
      dist = Math.max(fitH, fitW);
      camera.updateProjectionMatrix();
      dirty = true;
    }
    return [w, h];
  }
  function render(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (idle) taz = HOME.az + Math.sin((now - t0) / 7000) * 0.28;
    const k = 1 - Math.exp(-dt * 6);
    az += (taz - az) * k; el += (tel - el) * k;
    const [w, h] = frame();
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, 0, 0);
    if (playing) stepTracers(dt);
    renderer.render(scene, camera);
    placeTags(w, h);
  }
  let visible = false, raf = 0;
  const loop = (now) => { render(now); if (visible) raf = requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    cancelAnimationFrame(raf);
    if (visible) raf = requestAnimationFrame(loop);
  }).observe(box);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { visible = false; cancelAnimationFrame(raf); } else if (box.getBoundingClientRect().top < innerHeight) { visible = true; last = performance.now(); raf = requestAnimationFrame(loop); } });
  render(performance.now());

  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, az: taz, el: tel, id: e.pointerId, moved: false }; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
    if (!drag.moved) { drag.moved = true; canvas.setPointerCapture(drag.id); idle = false; document.getElementById('h-hint').style.opacity = 0; }
    taz = drag.az - dx * 0.006;
    tel = Math.min(1.2, Math.max(-0.35, drag.el + dy * 0.004));
  });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('keydown', (e) => {
    const m = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
    if (!m) return;
    e.preventDefault(); idle = false; taz += m[0]; tel = Math.min(1.2, Math.max(-0.35, tel + m[1]));
  });
  document.getElementById('h-reset').addEventListener('click', () => { taz = HOME.az; tel = HOME.el; idle = !still && playing; t0 = performance.now() - 0; });
  const mBtn = document.getElementById('h-motion');
  const PAUSE = mBtn.innerHTML;
  const PLAY = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"/></svg>';
  const motionUI = () => { mBtn.innerHTML = playing ? PAUSE : PLAY; mBtn.setAttribute('aria-label', playing ? 'Pause motion' : 'Play motion'); mBtn.setAttribute('aria-pressed', String(!playing)); };
  mBtn.addEventListener('click', () => { playing = !playing; if (!playing) idle = false; motionUI(); });
  motionUI();
}

function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
