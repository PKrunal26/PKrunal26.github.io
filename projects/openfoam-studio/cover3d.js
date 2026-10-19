// OpenFOAM Studio cover: one real 3D case told in six scroll-pinned steps.
// Data: OpenFOAM's windAroundBuildings tutorial, solved locally and exported by
// scripts/openfoam-wind3d.py (surface mesh, saved slices, convergence, streamlines).
import * as THREE from './vendor/three.module.min.js';

const story = document.getElementById('story');
const stage = document.getElementById('stage');
const cv = document.getElementById('cover3d');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BASE = 'media/wind/';
const cover = { top: 0, vh: innerHeight, e: 0 }; // where the story sits, shared with the frame loop

if (story && stage && cv) init();

async function init() {
  const anims = makeStepAnims();
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  } catch (e) {
    stage.classList.add('no-gl');
    wireSteps((i) => anims.start(i), () => anims.arm());
    return;
  }
  renderer.setClearColor(0x000000, 0);

  let visible = false, raf = 0, last = performance.now(), idle = 0, ready = false;
  let W = 1, H = 1, narrow = false;
  let step = -1, t0 = performance.now();

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0f1d, 40, 90);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 300);
  scene.add(new THREE.HemisphereLight(0xe4ebff, 0x141a30, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-6, 14, 9);
  scene.add(sun);

  // OpenFOAM metres (x downwind, y across, z up) → scene units (y up), 1 unit = 25 m.
  const SC = 1 / 25;
  const V = (x, y, z) => new THREE.Vector3(x * SC, z * SC, -y * SC);
  const push = (a, x, y, z) => a.push(x * SC, z * SC, -y * SC);
  const [X0, X1, Y0, Y1, Z0, Z1] = [-20, 330, -50, 230, 0, 140];

  const PATCH = { inlet: 0x5b8cff, outlet: 0x45c79b, ground: 0x8e9ab8, sym: 0xc58cff, buildings: 0xffb54c };
  const ACC = 0x7aa2ff;
  const faders = {};
  function fader(key, obj, mats, uni) {
    mats.forEach((m) => { m.transparent = true; m.opacity = 0; if (m.userData.base == null) m.userData.base = 1; });
    obj.visible = false;
    scene.add(obj);
    faders[key] = { obj, mats, uni, cur: 0, to: 0 };
  }
  const lineMat = (color, base) => { const m = new THREE.LineBasicMaterial({ color, depthWrite: false }); m.userData.base = base; return m; };
  const segs = (arr, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); return new THREE.LineSegments(g, mat); };
  const boxEdges = (x0, x1, y0, y1, z0, z1, out = []) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { push(out, ...c[a]); push(out, ...c[b]); });
    return out;
  };

  // Domain outline and a quiet ground.
  const outlineMat = lineMat(0x9fb0d6, 0.5);
  fader('outline', segs(boxEdges(X0, X1, Y0, Y1, Z0, Z1), outlineMat), [outlineMat]);
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x111a33, depthWrite: false, side: THREE.DoubleSide });
  groundMat.userData.base = 0.85;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry((X1 - X0) * SC, (Y1 - Y0) * SC), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.copy(V((X0 + X1) / 2, (Y0 + Y1) / 2, 0));
  ground.renderOrder = -2;
  fader('ground', ground, [groundMat]);

  // Background block: corner vertices, then its 25 × 20 × 10 cells on the faces.
  const vpos = [];
  [Z0, Z1].forEach((z) => [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]].forEach(([x, y]) => push(vpos, x, y, z)));
  const vGeo = new THREE.BufferGeometry(); vGeo.setAttribute('position', new THREE.Float32BufferAttribute(vpos, 3));
  const vMat = new THREE.PointsMaterial({ color: ACC, size: 7, sizeAttenuation: false, depthWrite: false });
  fader('verts', new THREE.Points(vGeo, vMat), [vMat]);
  const bg = [];
  for (let i = 0; i <= 25; i++) { const x = X0 + (X1 - X0) * i / 25; push(bg, x, Y0, 0); push(bg, x, Y1, 0); push(bg, x, Y1, 0); push(bg, x, Y1, Z1); }
  for (let j = 0; j <= 20; j++) { const y = Y0 + (Y1 - Y0) * j / 20; push(bg, X0, y, 0); push(bg, X1, y, 0); push(bg, X0, y, 0); push(bg, X0, y, Z1); }
  for (let k = 0; k <= 10; k++) { const z = Z1 * k / 10; push(bg, X0, Y1, z); push(bg, X1, Y1, z); push(bg, X0, Y0, z); push(bg, X0, Y1, z); }
  const bgMat = lineMat(ACC, 0.42);
  const bgLines = segs(bg, bgMat);
  fader('bgGrid', bgLines, [bgMat]);

  // Patches.
  const pg = new THREE.Group();
  const pMats = [];
  function plane(w, h, color, base, place) {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false });
    m.userData.base = base;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w * SC, h * SC), m);
    place(p); pg.add(p); pMats.push(m);
  }
  const L = X1 - X0, Wd = Y1 - Y0, Hh = Z1 - Z0;
  plane(Wd, Hh, PATCH.inlet, 0.34, (p) => { p.rotation.y = Math.PI / 2; p.position.copy(V(X0, (Y0 + Y1) / 2, Hh / 2)); });
  plane(Wd, Hh, PATCH.outlet, 0.28, (p) => { p.rotation.y = Math.PI / 2; p.position.copy(V(X1, (Y0 + Y1) / 2, Hh / 2)); });
  plane(L, Wd, PATCH.sym, 0.07, (p) => { p.rotation.x = -Math.PI / 2; p.position.copy(V((X0 + X1) / 2, (Y0 + Y1) / 2, Z1)); });
  plane(L, Hh, PATCH.sym, 0.08, (p) => { p.position.copy(V((X0 + X1) / 2, Y1, Hh / 2)); });
  plane(L, Wd, PATCH.ground, 0.16, (p) => { p.rotation.x = -Math.PI / 2; p.position.copy(V((X0 + X1) / 2, (Y0 + Y1) / 2, 0.2)); });
  const arr = [];
  for (let j = 0; j < 5; j++) for (let k = 0; k < 3; k++) {
    const y = Y0 + 30 + j * 55, z = 20 + k * 45;
    push(arr, X0 - 22, y, z); push(arr, X0 - 2, y, z);
    push(arr, X0 - 2, y, z); push(arr, X0 - 8, y + 4, z);
    push(arr, X0 - 2, y, z); push(arr, X0 - 8, y - 4, z);
  }
  const arrowMat = lineMat(PATCH.inlet, 1);
  pg.add(segs(arr, arrowMat)); pMats.push(arrowMat);
  fader('patches', pg, pMats);

  // Colour map shared with the field images.
  const STOPS = [[0, 16, 22, 42], [0.25, 27, 54, 122], [0.5, 36, 99, 214], [0.75, 63, 174, 230], [1, 216, 246, 251]];
  function cmap(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) {
      const a = STOPS[i - 1], b = STOPS[i], q = (t - a[0]) / (b[0] - a[0]);
      return [(a[1] + (b[1] - a[1]) * q) / 255, (a[2] + (b[2] - a[2]) * q) / 255, (a[3] + (b[3] - a[3]) * q) / 255];
    }
    return [216 / 255, 246 / 255, 251 / 255];
  }

  // Labels projected from 3D.
  const tagBox = document.getElementById('tags');
  const tags = [];
  const tag = (key, pos, text, steps) => {
    const el = document.createElement('span');
    el.className = 'tag t-' + key; el.textContent = text;
    tagBox.appendChild(el);
    tags.push({ el, pos, steps });
  };
  tag('inlet', V(X0, 90, Z1), 'inlet · 10 m/s', [3]);
  tag('outlet', V(X1, 90, Z1), 'outlet', [3]);
  tag('sym', V(150, Y1, Z1), 'symmetry', [3]);
  tag('buildings', V(122, 88, 76), 'buildings', [3]);
  tag('cells', V(240, 160, 90), '185,237 cells', [2]);
  tag('box', V(X1, Y1, Z1), '25 × 20 × 10', [1]);
  tag('slice', V(300, 200, 5), 'z = 5 m', [4]);

  // ── Camera: a preset per step, plus drag, pinch, ⌘-scroll and keys.
  const PRE = [
    { t: [150, 90, 15], th: -0.72, ph: 0.5, r: 25 },
    { t: [155, 90, 45], th: -0.78, ph: 0.48, r: 35 },
    { t: [125, 88, 8], th: -0.92, ph: 0.62, r: 14 },
    { t: [150, 90, 30], th: -1.0, ph: 0.42, r: 25 },
    { t: [145, 90, 0], th: -0.12, ph: 1.15, r: 19 },
    { t: [135, 88, 10], th: -0.62, ph: 0.46, r: 16 },
  ];
  const cam = { t: V(...PRE[0].t), th: PRE[0].th, ph: PRE[0].ph, r: PRE[0].r };
  let tween = null, touched = false;
  function goTo(i, snap) {
    const p = PRE[i], to = { t: V(...p.t), th: p.th, ph: p.ph, r: p.r };
    if (snap || reduce) { Object.assign(cam, to); tween = null; return; }
    while (to.th - cam.th > Math.PI) cam.th += 2 * Math.PI;
    while (cam.th - to.th > Math.PI) cam.th -= 2 * Math.PI;
    tween = { from: { t: cam.t.clone(), th: cam.th, ph: cam.ph, r: cam.r }, to, t0: performance.now(), dur: 1400 };
  }
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clampR = (r) => Math.max(4, Math.min(40, r));
  const clampPh = (p) => Math.max(0.05, Math.min(1.5, p));
  function interacted() { tween = null; touched = true; stage.classList.add('used'); kick(); }

  const ptrs = new Map();
  let pinch0 = 0, r0 = 0;
  cv.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    cv.setPointerCapture(e.pointerId);
    stage.classList.add('grab');
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); r0 = cam.r; }
    interacted();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    const [px, py] = ptrs.get(e.pointerId);
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptrs.size === 1) {
      cam.th -= (e.clientX - px) * 0.0072;
      cam.ph = clampPh(cam.ph + (e.clientY - py) * 0.006);
    } else if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      cam.r = clampR(r0 * pinch0 / Math.max(20, Math.hypot(a[0] - b[0], a[1] - b[1])));
    }
    kick();
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (!ptrs.size) stage.classList.remove('grab'); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return; // plain scrolling moves through the steps
    e.preventDefault();
    cam.r = clampR(cam.r * Math.exp(e.deltaY * 0.01));
    interacted();
  }, { passive: false });
  cv.addEventListener('keydown', (e) => {
    const m = { ArrowLeft: [0.12, 0, 1], ArrowRight: [-0.12, 0, 1], ArrowUp: [0, -0.08, 1], ArrowDown: [0, 0.08, 1], '+': [0, 0, 0.9], '=': [0, 0, 0.9], '-': [0, 0, 1.1] }[e.key];
    if (!m) return;
    e.preventDefault();
    cam.th += m[0]; cam.ph = clampPh(cam.ph + m[1]); cam.r = clampR(cam.r * m[2]);
    interacted();
  });
  stage.querySelector('[data-zoom="in"]').addEventListener('click', () => { cam.r = clampR(cam.r * 0.8); interacted(); });
  stage.querySelector('[data-zoom="out"]').addEventListener('click', () => { cam.r = clampR(cam.r * 1.25); interacted(); });
  stage.querySelector('[data-zoom="reset"]').addEventListener('click', () => { touched = false; goTo(step); kick(); });

  // ── Layout: keep the subject clear of the step card.
  const card = stage.querySelector('.card');
  const timeline = stage.querySelector('.s-time');
  function size() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    narrow = W < 760;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    offKey = '';
    kick();
  }
  // Keep the subject clear of the card and, before the stage pins, inside the part
  // of it that's on screen. The card moves as the stage widens, so this runs per frame.
  let offKey = '';
  function frameOffset(clipX) {
    const top = Math.max(0, cover.top);
    const shown = Math.max(120, Math.min(H, cover.vh - top));
    const lift = (H - shown) / 2;
    let ox, oy;
    if (narrow) { ox = 0; oy = H / 2 - (56 + card.offsetTop) / 2; }
    else { ox = -Math.min(W * 0.25, (card.offsetLeft + card.offsetWidth + W - clipX) / 2 - W / 2); oy = (H - timeline.offsetTop) / 2 - 12; }
    oy += lift;
    const key = ox.toFixed(1) + ',' + oy.toFixed(1);
    if (key === offKey) return;
    offKey = key;
    camera.setViewOffset(W, H, ox, oy, W, H);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(stage);

  // ── Frame loop, only while the stage is on screen.
  function kick() { idle = 0; if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }, { rootMargin: '100px' }).observe(stage);
  document.addEventListener('visibilitychange', kick);

  const TARGET = [
    { outline: 0.55, ground: 1, buildings: 0.35 },
    { outline: 0.35, ground: 1, verts: 1, bgGrid: 1 },
    { outline: 0.4, ground: 1, buildings: 1, bEdges: 1, gEdges: 1 },
    { outline: 0.35, ground: 1, buildings: 1, patches: 1 },
    { outline: 0.3, ground: 1, buildings: 1, slice: 1 },
    { outline: 0.3, ground: 1, buildings: 1, stream: 1 },
  ];
  function setStep(i) {
    if (i === step) return;
    step = i; t0 = performance.now();
    Object.entries(faders).forEach(([k, f]) => { f.to = TARGET[i][k] || 0; });
    touched = false;
    goTo(i);
    anims.start(i);
    requestAnimationFrame(size); // the card changes height with the step
    kick();
  }

  const tmp = new THREE.Vector3(), q = new THREE.Quaternion();
  const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 0, -1), z: new THREE.Vector3(0, 1, 0) };
  const giz = Object.fromEntries(['x', 'y', 'z'].map((k) => [k, [stage.querySelector(`.gizmo line[data-ax="${k}"]`), stage.querySelector(`.gizmo text[data-ax="${k}"]`)]]));

  // Load the case, then build what depends on it.
  let bMat, sliceMat, sMat, longest = 1, nFrames = 1;
  try {
    const [meta, bin, img] = await Promise.all([
      fetch(BASE + 'wind.json').then((r) => r.json()),
      fetch(BASE + 'wind.bin').then((r) => r.arrayBuffer()),
      new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = BASE + 'slice.webp'; }),
    ]);
    const get = (k) => {
      const [off, type, shape] = meta.index[k];
      const n = shape.reduce((a, b) => a * b, 1);
      const T = { '<i2': Int16Array, '<u2': Uint16Array, '<u4': Uint32Array, '|u1': Uint8Array }[type];
      return new T(bin, off, n);
    };
    const sp = get('spts');
    const spos = new Float32Array(sp.length);
    for (let i = 0; i < sp.length; i += 3) { spos[i] = sp[i] / 10 * SC; spos[i + 1] = sp[i + 2] / 10 * SC; spos[i + 2] = -sp[i + 1] / 10 * SC; }
    const posAttr = new THREE.BufferAttribute(spos, 3);

    // Buildings: the snapped surface mesh itself.
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', posAttr);
    bGeo.setIndex(new THREE.BufferAttribute(get('buildings_tri'), 1));
    const flat = bGeo.toNonIndexed(); flat.computeVertexNormals();
    bMat = new THREE.MeshStandardMaterial({ color: 0xcfd7ec, roughness: 0.85, metalness: 0, flatShading: true });
    bMat.userData.base = 1;
    const bMesh = new THREE.Mesh(flat, bMat);
    fader('buildings', bMesh, [bMat]);
    const edgeObj = (key, color, base) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', posAttr);
      g.setIndex(new THREE.BufferAttribute(get(key), 1));
      const m = lineMat(color, base);
      return [new THREE.LineSegments(g, m), m];
    };
    const [be, beM] = edgeObj('buildings_edge', 0x0d1428, 0.55); be.renderOrder = 2;
    fader('bEdges', be, [beM]);
    const [ge, geM] = edgeObj('ground_edge', 0x5f74a8, 0.55); ge.position.y = 0.002;
    fader('gEdges', ge, [geM]);

    // Slice at 5 m, one texture row per saved iteration.
    nFrames = meta.slice.frames.length;
    const tex = new THREE.Texture(img); tex.needsUpdate = true; tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    sliceMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uA: { value: 0 }, uB: { value: 0 }, uMix: { value: 0 }, uN: { value: nFrames }, uOpacity: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D uTex; uniform float uA; uniform float uB; uniform float uMix; uniform float uN; uniform float uOpacity; varying vec2 vUv;
        vec4 at(float f){ return texture2D(uTex, vec2(vUv.x, (uN - 1.0 - f + vUv.y) / uN)); }
        void main(){ vec4 c=mix(at(uA),at(uB),uMix); if(c.a<0.5) discard; gl_FragColor=vec4(c.rgb,0.94*uOpacity); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const slice = new THREE.Mesh(new THREE.PlaneGeometry(L * SC, Wd * SC), sliceMat);
    slice.rotation.x = -Math.PI / 2;
    slice.position.copy(V((X0 + X1) / 2, (Y0 + Y1) / 2, meta.slice.z));
    fader('slice', slice, [], sliceMat.uniforms.uOpacity);

    // Streamlines through the solved velocity.
    const lens = get('line_len'), lp = get('line_pts'), ls = get('line_spd');
    const P = [], C = [], S = [], Q = [];
    const LO = 0.34;
    let o = 0;
    for (let l = 0; l < lens.length; l++) {
      const n = lens[l]; let s = 0;
      const q = (l * 0.618) % 1;
      for (let k = 0; k < n - 1; k++) {
        const a = (o + k) * 3, b = a + 3;
        const ax = lp[a] / 10, ay = lp[a + 1] / 10, az = lp[a + 2] / 10;
        const bx = lp[b] / 10, by = lp[b + 1] / 10, bz = lp[b + 2] / 10;
        const d = Math.hypot(bx - ax, by - ay, bz - az) * SC;
        push(P, ax, ay, az); push(P, bx, by, bz);
        C.push(...cmap(LO + (1 - LO) * ls[o + k] / 255), ...cmap(LO + (1 - LO) * ls[o + k + 1] / 255));
        S.push(s, s + d); Q.push(q, q); s += d;
      }
      longest = Math.max(longest, s);
      o += n;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setAttribute('s', new THREE.Float32BufferAttribute(S, 1));
    g.setAttribute('q', new THREE.Float32BufferAttribute(Q, 1));
    sMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `attribute float s; attribute float q; attribute vec3 color; varying float vS; varying float vQ; varying vec3 vC;
        void main(){ vS=s; vQ=q; vC=color; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; uniform float uReveal; uniform float uOpacity; varying float vS; varying float vQ; varying vec3 vC;
        void main(){ if(vS>uReveal) discard;
          float ph=fract(vS*0.5-uTime*0.45+vQ); float pulse=pow(ph,12.0);
          float edge=smoothstep(uReveal,uReveal-1.0,vS);
          gl_FragColor=vec4(vC*(1.0+1.1*pulse),(0.6+0.4*pulse)*uOpacity*edge); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    fader('stream', new THREE.LineSegments(g, sMat), [], sMat.uniforms.uOpacity);
    anims.setConv(meta.conv, meta.slice.frames);
    ready = true;
    stage.classList.add('ready');
  } catch (e) {
    stage.classList.add('failed');
  }

  wireSteps(setStep, () => anims.arm(), kick);
  size();


  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const el = (now - t0) / 1000;
    let busy = false;

    if (tween) {
      const k = ease(Math.min(1, (now - tween.t0) / tween.dur));
      cam.t.lerpVectors(tween.from.t, tween.to.t, k);
      cam.th = tween.from.th + (tween.to.th - tween.from.th) * k;
      cam.ph = tween.from.ph + (tween.to.ph - tween.from.ph) * k;
      cam.r = tween.from.r + (tween.to.r - tween.from.r) * k;
      if (k >= 1) tween = null;
      busy = true;
    } else if (step === 5 && !touched && !reduce) {
      cam.th += dt * 0.04; busy = true;
    }
    // Before it pins, the stage is clipped to the page column: back off to fit that width.
    const clipX = narrow ? 0 : (1 - cover.e) * Math.max(0, (W - Math.min(W - 80, 1168)) / 2);
    const fit = Math.min(1.8, W / Math.max(200, W - 2 * clipX));
    frameOffset(clipX);
    const rr = cam.r * Math.max(0.88, Math.min(2, 1.35 / (W / H))) * fit;
    const cp = Math.cos(cam.ph);
    camera.position.set(cam.t.x + rr * cp * Math.sin(cam.th), cam.t.y + rr * Math.sin(cam.ph), cam.t.z + rr * cp * Math.cos(cam.th));
    camera.lookAt(cam.t);

    const kf = reduce ? 1 : 1 - Math.exp(-dt * 6);
    Object.values(faders).forEach((f) => {
      f.cur += (f.to - f.cur) * kf;
      if (Math.abs(f.to - f.cur) < 0.003) f.cur = f.to; else busy = true;
      f.obj.visible = f.cur > 0.003;
      if (f.uni) f.uni.value = f.cur;
      f.mats.forEach((m) => { m.opacity = f.cur * m.userData.base; m.depthWrite = f.cur > 0.98 && m.isMeshStandardMaterial; });
    });

    if (step === 1) {
      const p = anims.progress(el);
      vGeo.setDrawRange(0, Math.round(8 * Math.min(1, p / 0.35)));
      bgLines.geometry.setDrawRange(0, 2 * Math.round((bg.length / 6) * Math.max(0, Math.min(1, (p - 0.35) / 0.55))));
      if (p < 1) busy = true;
    } else { vGeo.setDrawRange(0, 8); bgLines.geometry.setDrawRange(0, Infinity); }
    if (bMat) bMat.color.setHex(step === 3 ? PATCH.buildings : step === 5 ? 0x6f7b9c : 0xcfd7ec);
    if (sliceMat && step === 4) {
      const f = anims.progress(el) * (nFrames - 1);
      sliceMat.uniforms.uA.value = Math.floor(f);
      sliceMat.uniforms.uB.value = Math.min(nFrames - 1, Math.floor(f) + 1);
      sliceMat.uniforms.uMix.value = f - Math.floor(f);
      if (f < nFrames - 1) busy = true;
    }
    if (sMat && (step === 5 || faders.stream.cur > 0)) {
      sMat.uniforms.uReveal.value = reduce ? longest : Math.min(longest, el * 9);
      sMat.uniforms.uTime.value = reduce ? 0 : now / 1000;
      if (!reduce) busy = true;
    }

    renderer.render(scene, camera);

    tags.forEach((tg) => {
      tmp.copy(tg.pos).project(camera);
      const x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      tg.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      tg.el.classList.toggle('on', ready && tg.steps.includes(step) && tmp.z < 1 && x > 0 && x < W && y > 84 && y < H - 60);
    });
    q.copy(camera.quaternion).invert();
    Object.entries(AX).forEach(([k, a]) => {
      tmp.copy(a).applyQuaternion(q);
      const [ln, tx] = giz[k];
      ln.setAttribute('x2', (tmp.x * 17).toFixed(1)); ln.setAttribute('y2', (-tmp.y * 17).toFixed(1));
      tx.setAttribute('x', (tmp.x * 24).toFixed(1)); tx.setAttribute('y', (-tmp.y * 24 + 3).toFixed(1));
    });

    if (busy || ptrs.size || idle++ < 30) raf = requestAnimationFrame(frame);
  }
}

// ── Steps: the scroll position picks one; the timeline jumps to one.
function wireSteps(onStep, onArm, onScroll = () => {}) {
  const chips = [...stage.querySelectorAll('.s-time button')];
  const panes = [...stage.querySelectorAll('.st')];
  const n = panes.length;
  let cur = -1, armed = false;
  function update() {
    const r = story.getBoundingClientRect();
    const vh = innerHeight;
    // The stage grows from an inset card to edge to edge as it reaches the top.
    const e = Math.max(0, Math.min(1, 1 - r.top / (vh * 0.55)));
    cover.top = r.top; cover.vh = vh; cover.e = e;
    onScroll();
    stage.style.setProperty('--e', e.toFixed(3));
    document.documentElement.classList.toggle('cover-full', e > 0.97 && r.bottom > vh * 0.6);
    // Nothing plays until the reader has scrolled the cover into place.
    if (!armed && r.top < vh * 0.08) { armed = true; onArm(); }
    const span = story.offsetHeight - stage.offsetHeight;
    const p = Math.max(0, Math.min(0.9999, -r.top / Math.max(1, span)));
    const i = Math.floor(p * n), local = p * n - i;
    chips.forEach((c, k) => c.style.setProperty('--p', k < i ? 1 : k === i ? Math.max(0.04, local).toFixed(3) : 0));
    if (i !== cur) {
      cur = i;
      chips.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.toggle('done', k < i); c.setAttribute('aria-selected', k === i); });
      panes.forEach((pn, k) => { pn.classList.toggle('on', k === i); pn.toggleAttribute('inert', k !== i); });
      stage.dataset.step = i;
      onStep(i);
    }
  }
  chips.forEach((c, k) => c.addEventListener('click', () => {
    const span = story.offsetHeight - stage.offsetHeight;
    const top = story.getBoundingClientRect().top + scrollY;
    scrollTo({ top: top + span * (k + 0.06) / n + 1, behavior: reduce ? 'auto' : 'smooth' });
  }));
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  // Layout can shift under a still page (fonts, images): re-check then too.
  new ResizeObserver(update).observe(document.body);
  update();
}

// ── Card animations: typing, file list, counter, convergence chart.
function makeStepAnims() {
  const DUR = [2.8, 3.0, 1.4, 1.0, 4.2, 1];
  let timer = 0, cur = -1, conv = null, frames = [], armed = reduce;
  const promptEl = stage.querySelector('[data-type="prompt"]');
  const promptText = promptEl ? promptEl.dataset.text : '';
  const files = [...stage.querySelectorAll('.st-files li')];
  const bot = stage.querySelector('.st-msg.bot');
  const dictLines = [...stage.querySelectorAll('.st-code li')];
  const counters = [...stage.querySelectorAll('[data-count]')];
  const cc = stage.querySelector('#conv3d');
  const rd = Object.fromEntries([...stage.querySelectorAll('[data-r]')].map((e) => [e.dataset.r, e]));
  const COL = { U: '#7aa2ff', p: '#ffb54c', k: '#45c79b' };
  const ease3 = (t) => 1 - Math.pow(1 - t, 3);
  const fmt = (v) => v.toExponential(1).replace('e-', 'e-');

  function drawConv(p) {
    if (!cc || !conv) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = cc.clientWidth, h = cc.clientHeight;
    if (cc.width !== Math.round(w * dpr)) { cc.width = Math.round(w * dpr); cc.height = Math.round(h * dpr); }
    const g = cc.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const Lp = 34, Rp = 8, Tp = 8, Bp = 18, lo = -4, hi = -2;
    const it = conv.it, i0 = 50, i1 = it[it.length - 1];
    const xOf = (x) => Lp + (x - i0) / (i1 - i0) * (w - Lp - Rp);
    const yOf = (v) => Tp + (hi - Math.log10(v)) / (hi - lo) * (h - Tp - Bp);
    g.font = '11px Geist, Arial, sans-serif';
    g.lineWidth = 1;
    for (let e = hi; e >= lo; e--) {
      const y = Math.round(yOf(Math.pow(10, e))) + 0.5;
      g.strokeStyle = '#1a2340'; g.beginPath(); g.moveTo(Lp, y); g.lineTo(w - Rp, y); g.stroke();
      g.fillStyle = '#5d6b92'; g.fillText('1e' + e, 2, y + 3);
    }
    [50, 250, 500].forEach((x) => { g.fillStyle = '#5d6b92'; g.fillText(String(x), Math.min(w - Rp - 18, Math.max(Lp - 4, xOf(x) - 8)), h - 4); });
    const upto = i0 + (i1 - i0) * p;
    Object.keys(COL).forEach((k) => {
      g.strokeStyle = COL[k]; g.fillStyle = COL[k]; g.lineWidth = 1.6;
      g.beginPath();
      let started = false;
      for (let j = 0; j < it.length; j++) {
        if (it[j] > upto + 0.01) break;
        const x = xOf(it[j]), y = yOf(conv[k][j]);
        started ? g.lineTo(x, y) : g.moveTo(x, y); started = true;
      }
      g.stroke();
      for (let j = 0; j < it.length && it[j] <= upto + 0.01; j++) { g.beginPath(); g.arc(xOf(it[j]), yOf(conv[k][j]), 2.2, 0, 7); g.fill(); }
    });
    const fi = Math.min(frames.length - 1, Math.floor(p * (frames.length - 1) + 1e-6));
    if (rd.it) rd.it.textContent = frames[fi] ?? '';
    const ci = it.indexOf(frames[fi]);
    ['U', 'p', 'k'].forEach((k) => { if (rd[k]) rd[k].textContent = ci >= 0 ? fmt(conv[k][ci]) : '–'; });
  }

  function render(i, el) {
    const p = Math.min(1, el / DUR[i]);
    if (i === 0 && promptEl) {
      const q = Math.min(1, p / 0.5);
      promptEl.textContent = promptText.slice(0, Math.round(promptText.length * q));
      promptEl.classList.toggle('typing', q < 1);
      files.forEach((f, k) => f.classList.toggle('on', p > 0.55 + k * 0.032));
      if (bot) bot.classList.toggle('on', p > 0.5);
    } else if (i === 1) {
      dictLines.forEach((li, k) => li.classList.toggle('on', p >= (k / dictLines.length) * 0.9));
    } else if (i === 2) {
      counters.forEach((c) => {
        const a = +(c.dataset.from || 0), b = +c.dataset.count;
        c.textContent = Math.round(a + (b - a) * ease3(p)).toLocaleString('en-US');
      });
    } else if (i === 4) {
      drawConv(p);
    }
    return p;
  }

  return {
    start(i) {
      cur = i;
      cancelAnimationFrame(timer);
      if (i === 0 && !armed) { render(0, 0); return; }
      const t0 = performance.now();
      const tick = (now) => {
        if (cur !== i) return;
        const p = render(i, reduce ? 99 : (now - t0) / 1000);
        if (p < 1) timer = requestAnimationFrame(tick);
      };
      timer = requestAnimationFrame(tick);
    },
    progress(el) { return reduce ? 1 : Math.min(1, el / DUR[+(stage.dataset.step || 0)]); },
    arm() { if (armed) return; armed = true; if (cur === 0) this.start(0); },
    setConv(c, f) { conv = c; frames = f; if (cur === 4) this.start(4); },
  };
}
