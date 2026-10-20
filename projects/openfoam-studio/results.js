// OpenFOAM Studio page: the Results viewer. A 2D version of the app's Results
// tab, run on the saved fields of three real runs (scripts/openfoam-results.py).
// The pipeline mirrors the app: the mesh coloured by a field, then streamlines,
// vector glyphs, iso-lines and a line probe, each with its own settings, played
// over every saved time. Values under the pointer are read from the run.
(() => {
  const fig = document.getElementById('rv');
  if (!fig) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => fig.querySelector(s);
  const view = $('#rv-view'), fieldCv = $('#rv-field'), overCv = $('#rv-over');
  const fctx = fieldCv.getContext('2d'), octx = overCv.getContext('2d');
  const pipeEl = $('#rv-pipe'), propsEl = $('#rv-props'), probeEl = $('#rv-probe'), plotEl = $('#rv-plot');
  const playBtn = $('#rv-play'), slider = $('#rv-slider'), tLabel = $('#rv-t'), tCount = $('#rv-n');
  const barEl = $('#rv-bar'), metaEl = $('#rv-meta'), titleEl = $('#rv-title'), solverEl = $('#rv-solver');
  const caseTabs = [...fig.querySelectorAll('[data-case]')];

  const CASES = {
    cylinder: { label: 'Cylinder', solver: 'incompressibleFluid', unit: 'm', fields: ['U', 'Ux', 'Uy', 's'], color: 'U', stream: true, edges: false },
    cavity: { label: 'Cavity', solver: 'incompressibleFluid', unit: 'm', fields: ['U', 'Ux', 'Uy', 's'], color: 'U', stream: true, edges: false },
    badapple: { label: 'Bad Apple!!', solver: 'incompressibleVoF', unit: 'm', fields: ['s', 'U'], color: 's', stream: false, edges: false, crisp: true },
  };
  const MAPS = {
    blue: [[0, 16, 22, 42], [0.25, 27, 54, 122], [0.5, 36, 99, 214], [0.75, 63, 174, 230], [1, 216, 246, 251]],
    cool: [[0, 59, 76, 192], [0.25, 124, 159, 249], [0.5, 221, 221, 221], [0.75, 238, 133, 105], [1, 180, 4, 38]],
    viridis: [[0, 68, 1, 84], [0.25, 59, 82, 139], [0.5, 33, 145, 140], [0.75, 94, 201, 98], [1, 253, 231, 37]],
  };
  const MAP_LABEL = { blue: 'Blue', cool: 'Cool to warm', viridis: 'Viridis' };
  const LUT = {};
  for (const k in MAPS) {
    const s = MAPS[k], lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let j = 1;
      while (j < s.length - 1 && t > s[j][0]) j++;
      const a = s[j - 1], b = s[j], f = (t - a[0]) / (b[0] - a[0]);
      for (let c = 0; c < 3; c++) lut[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f;
    }
    LUT[k] = lut;
  }
  const css = (lut, t) => { const i = Math.round(Math.max(0, Math.min(1, t)) * 255) * 3; return `rgb(${lut[i]},${lut[i + 1]},${lut[i + 2]})`; };

  // ── State ────────────────────────────────────────────────────────────────
  const st = {
    key: 'cylinder', frame: 0, playing: false,
    color: 'U', map: 'blue', range: 'all', rep: 'surface',
    sel: 'mesh',
    show: { stream: true, glyph: false, iso: false, line: false },
    seeds: 'normal', spacing: 'normal', levels: 10, lineX: 0.5,
  };
  const data = {};
  let C = null; // current case data
  let dpr = 1, VW = 0, VH = 0, R = null;
  let dirtyField = true, dirtyGeo = true, inView = false, raf = 0, lastT = 0, playAcc = 0;
  let streams = [], isoPath = null, glyphs = null, probe = null;

  // ── Loading ──────────────────────────────────────────────────────────────
  function b64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function load(key) {
    if (data[key]) return data[key];
    const [meta, img] = await Promise.all([
      fetch(`media/results/${key}.json`).then((r) => r.json()),
      new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `media/results/${key}.png`; }),
    ]);
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0);
    const px = cx.getImageData(0, 0, img.width, img.height).data;
    const { W, H, F, cols, lo, hi } = meta;
    const bits = b64(meta.mask), mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) mask[i] = (bits[i >> 3] >> (7 - (i & 7))) & 1;
    const eb = b64(meta.edges);
    const edges = new Uint16Array(eb.buffer, eb.byteOffset, eb.byteLength / 2);
    const frames = [];
    for (let f = 0; f < F; f++) {
      const ox = (f % cols) * W, oy = Math.floor(f / cols) * H;
      const ux = new Float32Array(W * H), uy = new Float32Array(W * H), s = new Float32Array(W * H), U = new Float32Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        // Values run a few pixels past the mesh edge (see the build script),
        // so every pixel is read; the mask still decides what is inside.
        const i = y * W + x, o = ((oy + y) * img.width + ox + x) * 4;
        ux[i] = lo[0] + (px[o] / 255) * (hi[0] - lo[0]);
        uy[i] = lo[1] + (px[o + 1] / 255) * (hi[1] - lo[1]);
        s[i] = lo[2] + (px[o + 2] / 255) * (hi[2] - lo[2]);
        U[i] = Math.hypot(ux[i], uy[i]);
      }
      frames.push({ ux, uy, s, U });
    }
    const walls = (meta.walls || []).map((w) => { const q = b64(w); return new Uint16Array(q.buffer, q.byteOffset, q.byteLength / 2); });
    return (data[key] = { ...meta, mask, edges, walls, frames });
  }

  // ── Fields ───────────────────────────────────────────────────────────────
  const FIELD = {
    U: (d) => ({ name: '|U|', units: 'm/s', lo: 0, hi: d.umax }),
    Ux: (d) => ({ name: 'Ux', units: 'm/s', lo: d.lo[0], hi: d.hi[0], div: true }),
    Uy: (d) => ({ name: 'Uy', units: 'm/s', lo: d.lo[1], hi: d.hi[1], div: true }),
    s: (d) => ({ name: d.scalar.name, units: d.scalar.units, lo: d.lo[2], hi: d.hi[2] }),
  };
  const arr = (fr, k) => (k === 'U' ? fr.U : k === 'Ux' ? fr.ux : k === 'Uy' ? fr.uy : fr.s);
  function range() {
    const f = FIELD[st.color](C);
    if (st.range === 'all') {
      if (f.div && st.color !== 'U') { const m = Math.max(Math.abs(f.lo), Math.abs(f.hi)); return [-m, m]; }
      return [f.lo, f.hi];
    }
    const a = arr(C.frames[st.frame], st.color);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < a.length; i++) if (C.mask[i]) { if (a[i] < lo) lo = a[i]; if (a[i] > hi) hi = a[i]; }
    if (hi - lo < 1e-12) hi = lo + 1e-12;
    return [lo, hi];
  }
  // Bilinear sample at grid coordinates (cell centres at i + 0.5).
  function sample(a, gx, gy) {
    const W = C.W, H = C.H;
    const fx = Math.min(Math.max(gx - 0.5, 0), W - 1.001), fy = Math.min(Math.max(gy - 0.5, 0), H - 1.001);
    const i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, k = j * W + i;
    return (a[k] * (1 - u) + a[k + 1] * u) * (1 - v) + (a[k + W] * (1 - u) + a[k + W + 1] * u) * v;
  }
  const inside = (gx, gy) => gx >= 0 && gy >= 0 && gx < C.W && gy < C.H && C.mask[(gy | 0) * C.W + (gx | 0)];

  // ── Layout ───────────────────────────────────────────────────────────────
  function size() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const w = view.clientWidth;
    if (!C || !w) return;
    const narrow = w < 560;
    const aspect = C.W / C.H;
    const pad = narrow ? 16 : 32;
    // On a phone the view takes the run's shape. The canvases get the final
    // size at once, and the view eases its height around them.
    const h = narrow ? Math.round(Math.min(w / aspect + pad * 2 + 44, 460)) : 460;
    view.style.height = `${h}px`;
    VW = Math.round(w * dpr); VH = Math.round(h * dpr);
    fieldCv.width = overCv.width = VW; fieldCv.height = overCv.height = VH;
    fieldCv.style.height = overCv.style.height = `${h}px`;
    const bottom = (narrow ? 44 : 52);
    const aw = w - pad * 2, ah = h - pad - bottom;
    let rw = aw, rh = aw / aspect;
    if (rh > ah) { rh = ah; rw = ah * aspect; }
    R = { x: (w - rw) / 2, y: pad + (ah - rh) / 2, w: rw, h: rh };
    dirtyField = dirtyGeo = true;
    paint();
  }
  const toScreen = (gx, gy) => [R.x + (gx / C.W) * R.w, R.y + (gy / C.H) * R.h];
  const toGrid = (sx, sy) => [((sx - R.x) / R.w) * C.W, ((sy - R.y) / R.h) * C.H];

  // ── Field layer ──────────────────────────────────────────────────────────
  const off = document.createElement('canvas'), offx = off.getContext('2d');
  function paintField() {
    const fr = C.frames[st.frame], a = arr(fr, st.color), lut = LUT[st.map];
    const [lo, hi] = range();
    off.width = C.W; off.height = C.H;
    const img = offx.createImageData(C.W, C.H), d = img.data;
    for (let i = 0; i < a.length; i++) {
      const t = Math.max(0, Math.min(1, (a[i] - lo) / (hi - lo)));
      const k = Math.round(t * 255) * 3, o = i * 4;
      d[o] = lut[k]; d[o + 1] = lut[k + 1]; d[o + 2] = lut[k + 2]; d[o + 3] = 255;
    }
    offx.putImageData(img, 0, 0);
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, VW, VH);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The two-phase case shows its cells as they are, so the interface stays sharp.
    fctx.imageSmoothingEnabled = !CASES[st.key].crisp;
    fctx.imageSmoothingQuality = 'high';
    fctx.drawImage(off, R.x, R.y, R.w, R.h);
    fctx.strokeStyle = 'rgba(255,255,255,.14)';
    fctx.lineWidth = 1;
    fctx.strokeRect(R.x - 0.5, R.y - 0.5, R.w + 1, R.h + 1);
    if (st.rep === 'edges') {
      fctx.beginPath();
      const e = C.edges;
      for (let i = 0; i < e.length; i += 4) {
        fctx.moveTo(R.x + (e[i] / 65535) * R.w, R.y + (1 - e[i + 1] / 65535) * R.h);
        fctx.lineTo(R.x + (e[i + 2] / 65535) * R.w, R.y + (1 - e[i + 3] / 65535) * R.h);
      }
      fctx.strokeStyle = 'rgba(255,255,255,.2)';
      fctx.lineWidth = 0.6;
      fctx.stroke();
    }
    // Walls inside the domain, drawn as shapes so their edge stays sharp.
    for (const w of C.walls) {
      fctx.beginPath();
      for (let i = 0; i < w.length; i += 2) fctx[i ? 'lineTo' : 'moveTo'](R.x + (w[i] / 65535) * R.w, R.y + (1 - w[i + 1] / 65535) * R.h);
      fctx.closePath();
      fctx.fillStyle = '#0d1120';
      fctx.fill();
      fctx.strokeStyle = 'rgba(255,255,255,.45)';
      fctx.lineWidth = 1;
      fctx.stroke();
    }
    bar(lo, hi);
  }
  function bar(lo, hi) {
    const f = FIELD[st.color](C), lut = LUT[st.map];
    const g = [0, 0.25, 0.5, 0.75, 1].map((t) => `${css(lut, t)} ${t * 100}%`).join(',');
    const fmt = (v) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : Math.abs(v) >= 0.01 || v === 0 ? v.toFixed(2) : v.toExponential(1));
    barEl.innerHTML = `<p>${f.name}${f.units ? ` <span>${f.units}</span>` : ''}</p><i style="background:linear-gradient(90deg,${g})"></i><div><span>${fmt(lo)}</span><span>${fmt(hi)}</span></div>`;
  }

  // ── Derived objects ──────────────────────────────────────────────────────
  // Evenly spaced streamlines: seeds on a grid, traced both ways with RK2,
  // stopping where another line already passes.
  function traceStreams() {
    const fr = C.frames[st.frame], W = C.W, H = C.H;
    const sep = W / ({ sparse: 18, normal: 28, dense: 42 }[st.seeds]);
    const cs = sep * 0.5, ow = Math.ceil(W / cs), oh = Math.ceil(H / cs);
    const occ = new Int32Array(ow * oh).fill(-1);
    const umax = C.umax, minU = umax * 0.004;
    const out = [];
    const step = 0.45;
    const vel = (x, y) => { const u = sample(fr.ux, x, y), v = -sample(fr.uy, x, y); return [u, v]; };
    function trace(x, y, dir, id) {
      const pts = [];
      for (let n = 0; n < 900; n++) {
        if (!inside(x, y)) break;
        const oc = ((y / cs) | 0) * ow + ((x / cs) | 0);
        if (occ[oc] !== -1 && occ[oc] !== id) break;
        pts.push(x, y);
        let [u, v] = vel(x, y);
        let m = Math.hypot(u, v);
        if (m < minU) break;
        const mx = x + (dir * step * u) / m / 2, my = y + (dir * step * v) / m / 2;
        [u, v] = vel(mx, my);
        m = Math.hypot(u, v);
        if (m < minU) break;
        x += (dir * step * u) / m; y += (dir * step * v) / m;
      }
      return pts;
    }
    let id = 0;
    for (let sy = sep / 2; sy < H; sy += sep) for (let sx = sep / 2; sx < W; sx += sep) {
      const x = sx + ((id * 7) % 5 - 2) * sep * 0.12, y = sy + ((id * 3) % 5 - 2) * sep * 0.12;
      id++;
      if (!inside(x, y)) continue;
      const oc = ((y / cs) | 0) * ow + ((x / cs) | 0);
      if (occ[oc] !== -1) continue;
      const b = trace(x, y, -1, id), f = trace(x, y, 1, id);
      const pts = [];
      for (let i = b.length - 2; i >= 2; i -= 2) pts.push(b[i], b[i + 1]);
      for (let i = 0; i < f.length; i++) pts.push(f[i]);
      if (pts.length < 24) continue;
      let sp = 0;
      for (let i = 0; i < pts.length; i += 2) {
        occ[((pts[i + 1] / cs) | 0) * ow + ((pts[i] / cs) | 0)] = id;
        sp += sample(fr.U, pts[i], pts[i + 1]);
      }
      out.push({ pts, speed: sp / (pts.length / 2) / (umax || 1) });
    }
    return out;
  }
  // Marching squares on the coloured field, at evenly spaced levels.
  function traceIso() {
    const a = arr(C.frames[st.frame], st.color), W = C.W, H = C.H, m = C.mask;
    const [lo, hi] = range();
    const p = new Path2D();
    for (let l = 1; l < st.levels; l++) {
      const v = lo + ((hi - lo) * l) / st.levels;
      for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
        const i = y * W + x;
        if (!(m[i] && m[i + 1] && m[i + W] && m[i + W + 1])) continue;
        const a0 = a[i], a1 = a[i + 1], a2 = a[i + W + 1], a3 = a[i + W];
        const c = (a0 > v) | ((a1 > v) << 1) | ((a2 > v) << 2) | ((a3 > v) << 3);
        if (c === 0 || c === 15) continue;
        const e = [
          [x + (v - a0) / (a1 - a0), y], [x + 1, y + (v - a1) / (a2 - a1)],
          [x + (v - a3) / (a2 - a3), y + 1], [x, y + (v - a0) / (a3 - a0)],
        ];
        const seg = ISO[c];
        for (let s = 0; s < seg.length; s += 2) {
          p.moveTo(e[seg[s]][0] + 0.5, e[seg[s]][1] + 0.5);
          p.lineTo(e[seg[s + 1]][0] + 0.5, e[seg[s + 1]][1] + 0.5);
        }
      }
    }
    return p;
  }
  const ISO = [[], [3, 0], [0, 1], [3, 1], [1, 2], [3, 0, 1, 2], [0, 2], [3, 2], [2, 3], [2, 0], [0, 1, 2, 3], [2, 1], [1, 3], [1, 0], [0, 3], []];

  function geometry() {
    streams = st.show.stream ? traceStreams() : [];
    isoPath = st.show.iso ? traceIso() : null;
    dirtyGeo = false;
  }

  // ── Overlay layer: redrawn every animation frame ─────────────────────────
  function paintOver(now) {
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, VW, VH);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = R.w / C.W, sy = R.h / C.H;
    if (isoPath) {
      octx.save();
      octx.translate(R.x, R.y); octx.scale(sx, sy);
      octx.strokeStyle = 'rgba(255,255,255,.55)';
      octx.lineWidth = 0.9 / sx;
      octx.stroke(isoPath);
      octx.restore();
    }
    if (streams.length) {
      octx.lineCap = 'round'; octx.lineJoin = 'round';
      const paths = [new Path2D(), new Path2D(), new Path2D()];
      for (const s of streams) {
        const p = paths[s.speed > 0.55 ? 2 : s.speed > 0.25 ? 1 : 0];
        const pts = s.pts;
        p.moveTo(R.x + pts[0] * sx, R.y + pts[1] * sy);
        for (let i = 2; i < pts.length; i += 2) p.lineTo(R.x + pts[i] * sx, R.y + pts[i + 1] * sy);
      }
      octx.lineWidth = 1;
      octx.setLineDash([]);
      paths.forEach((p, k) => { octx.strokeStyle = `rgba(255,255,255,${[0.16, 0.24, 0.32][k]})`; octx.stroke(p); });
      if (!still) {
        // Dashes travel along each line in the direction of the flow.
        octx.setLineDash([9, 23]);
        octx.lineDashOffset = -((now / 1000) * 26) % 32;
        octx.lineWidth = 1.4;
        paths.forEach((p, k) => { octx.strokeStyle = `rgba(255,255,255,${[0.5, 0.72, 0.92][k]})`; octx.stroke(p); });
        octx.setLineDash([]);
      } else {
        paths.forEach((p, k) => { octx.strokeStyle = `rgba(255,255,255,${[0.4, 0.55, 0.7][k]})`; octx.stroke(p); });
      }
    }
    if (st.show.glyph) drawGlyphs();
    if (st.show.line) drawLine();
    if (probe) {
      octx.beginPath();
      octx.arc(probe.sx, probe.sy, 5, 0, Math.PI * 2);
      octx.strokeStyle = '#fff'; octx.lineWidth = 1.5; octx.stroke();
      octx.beginPath(); octx.arc(probe.sx, probe.sy, 1.5, 0, Math.PI * 2); octx.fillStyle = '#fff'; octx.fill();
    }
  }
  function drawGlyphs() {
    const fr = C.frames[st.frame];
    const g = { coarse: 30, normal: 22, fine: 15 }[st.spacing];
    const umax = C.umax || 1;
    octx.strokeStyle = 'rgba(255,255,255,.85)'; octx.fillStyle = 'rgba(255,255,255,.85)';
    octx.lineWidth = 1.1;
    const p = new Path2D(), h = new Path2D();
    for (let y = R.y + g / 2; y < R.y + R.h; y += g) for (let x = R.x + g / 2; x < R.x + R.w; x += g) {
      const [gx, gy] = toGrid(x, y);
      if (!inside(gx, gy)) continue;
      const u = sample(fr.ux, gx, gy), v = -sample(fr.uy, gx, gy), m = Math.hypot(u, v);
      if (m < umax * 0.01) continue;
      const L = Math.max(4, Math.min(1, m / umax) * g * 1.05), dx = (u / m) * L, dy = (v / m) * L;
      const x0 = x - dx / 2, y0 = y - dy / 2, x1 = x + dx / 2, y1 = y + dy / 2;
      p.moveTo(x0, y0); p.lineTo(x1, y1);
      const a = Math.atan2(dy, dx), hs = Math.min(4.5, L * 0.45);
      h.moveTo(x1, y1);
      h.lineTo(x1 - hs * Math.cos(a - 0.45), y1 - hs * Math.sin(a - 0.45));
      h.lineTo(x1 - hs * Math.cos(a + 0.45), y1 - hs * Math.sin(a + 0.45));
      h.closePath();
    }
    octx.stroke(p); octx.fill(h);
  }
  function drawLine() {
    const x = R.x + st.lineX * R.w;
    octx.strokeStyle = '#ffd27a'; octx.lineWidth = 1.5;
    octx.beginPath(); octx.moveTo(x, R.y); octx.lineTo(x, R.y + R.h); octx.stroke();
    octx.fillStyle = '#ffd27a';
    octx.beginPath(); octx.arc(x, R.y + R.h, 5.5, 0, Math.PI * 2); octx.fill();
    octx.beginPath(); octx.arc(x, R.y, 3, 0, Math.PI * 2); octx.fill();
  }
  // Profile of the coloured field along the line probe, bottom to top.
  function plot() {
    if (!st.show.line) { plotEl.hidden = true; return; }
    plotEl.hidden = false;
    const a = arr(C.frames[st.frame], st.color), f = FIELD[st.color](C);
    const gx = st.lineX * C.W, pts = [];
    for (let k = 0; k <= 80; k++) {
      const gy = C.H - (k / 80) * C.H;
      if (!inside(gx, Math.min(gy, C.H - 0.01))) { pts.push(null); continue; }
      pts.push(sample(a, gx, Math.min(gy, C.H - 0.01)));
    }
    const [lo, hi] = range();
    const W = 176, H = 112, L = 6, T = 8, B = 8;
    const X = (v) => L + ((v - lo) / (hi - lo)) * (W - L * 2), Y = (k) => H - B - (k / 80) * (H - T - B);
    let d = '', pen = false;
    pts.forEach((v, k) => { if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(v).toFixed(1)} ${Y(k).toFixed(1)}`; pen = true; });
    const z = lo < 0 && hi > 0 ? `<path class="z" d="M${X(0).toFixed(1)} ${T}V${H - B}"/>` : '';
    const xm = C.box[0] + st.lineX * (C.box[2] - C.box[0]);
    plotEl.innerHTML = `<p>${f.name} along x = ${xm.toFixed(xm < 1 ? 3 : 2)} m</p><svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${z}<path class="ax" d="M${L} ${H - B}H${W - L}"/><path class="pl" d="${d}"/></svg>`;
  }

  function showProbe(sx, sy) {
    const [gx, gy] = toGrid(sx, sy);
    if (!inside(gx, gy)) { hideProbe(); return; }
    const fr = C.frames[st.frame];
    const x = C.box[0] + (gx / C.W) * (C.box[2] - C.box[0]), y = C.box[3] - (gy / C.H) * (C.box[3] - C.box[1]);
    const ux = sample(fr.ux, gx, gy), uy = sample(fr.uy, gx, gy), s = sample(fr.s, gx, gy);
    const p = (v) => (Math.abs(v) < 0.001 && v !== 0 ? v.toExponential(2) : v.toFixed(3));
    const sc = C.scalar.name === 'alpha.water' ? `alpha.water ${s.toFixed(2)}` : `p ${p(s)}`;
    probeEl.hidden = false;
    probeEl.innerHTML = `<b>|U| ${p(Math.hypot(ux, uy))} m/s</b><span>Ux ${p(ux)} · Uy ${p(uy)}</span><span>${sc}</span><span class="xy">x ${x.toFixed(3)} · y ${y.toFixed(3)} m</span>`;
    const right = sx > view.clientWidth * 0.6;
    probeEl.style.transform = `translate(${sx + (right ? -14 : 14)}px, ${sy + 14}px) translateX(${right ? '-100%' : '0'})`;
    probe = { sx, sy };
    if (!st.playing && !animating()) paint();
  }
  function hideProbe() { probe = null; probeEl.hidden = true; if (!animating()) paint(); }

  // ── Paint and the loop ───────────────────────────────────────────────────
  function paint(now = performance.now()) {
    if (!C || !R) return;
    if (dirtyField) { paintField(); dirtyField = false; plot(); }
    if (dirtyGeo) geometry();
    paintOver(now);
  }
  const animating = () => inView && !still && (st.playing || streams.length > 0);
  function loop(now) {
    raf = 0;
    if (st.playing) {
      playAcc += now - (lastT || now);
      const per = Math.max(140, 5200 / C.F);
      if (playAcc >= per) {
        playAcc = 0;
        if (st.frame >= C.F - 1) { setPlaying(false); }
        else setFrame(st.frame + 1, true);
      }
    }
    lastT = now;
    paint(now);
    if (animating()) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && animating()) { lastT = 0; raf = requestAnimationFrame(loop); } else if (!animating()) paint(); }

  function setFrame(f, fromLoop) {
    st.frame = Math.max(0, Math.min(C.F - 1, f));
    slider.value = st.frame;
    const t = C.times[st.frame];
    tLabel.textContent = `t = ${t.toFixed(C.times[C.F - 1] < 1 ? 2 : 1)} s`;
    slider.style.setProperty('--p', `${(st.frame / (C.F - 1)) * 100}%`);
    dirtyField = dirtyGeo = true;
    if (probe) showProbe(probe.sx, probe.sy);
    if (!fromLoop) kick();
  }
  function setPlaying(on) {
    st.playing = on;
    playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play');
    playBtn.classList.toggle('on', on);
    if (on && st.frame >= C.F - 1) setFrame(0, true);
    playAcc = 0;
    kick();
  }

  // ── Pipeline and properties ──────────────────────────────────────────────
  const EYE = '<svg viewBox="0 0 256 256" aria-hidden="true"><path fill="currentColor" d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/></svg>';
  const ITEMS = [
    { key: 'mesh', label: 'internalMesh', fixed: true },
    { key: 'stream', label: 'Streamlines' },
    { key: 'glyph', label: 'Vector glyphs' },
    { key: 'iso', label: 'Iso-lines' },
    { key: 'line', label: 'Line probe' },
  ];
  function pipe() {
    const fname = FIELD[st.color](C).name;
    pipeEl.innerHTML = ITEMS.map((it) => {
      const on = it.fixed || st.show[it.key];
      return `<li class="${st.sel === it.key ? 'sel' : ''} ${on ? '' : 'off'}" data-item="${it.key}">
        <button type="button" class="eye" data-eye="${it.key}" aria-pressed="${on}" aria-label="${on ? 'Hide' : 'Show'} ${it.label}" ${it.fixed ? 'disabled' : ''}>${EYE}</button>
        <button type="button" class="nm" data-pick="${it.key}">${it.label}</button>${it.key === 'mesh' || it.key === 'iso' || it.key === 'line' ? `<span class="fb">${fname}</span>` : ''}</li>`;
    }).join('');
  }
  function seg(name, opts, cur) {
    return `<div class="rv-row"><span>${name}</span><div class="rv-seg" role="group" aria-label="${name}">${opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(cur)}">${l}</button>`).join('')}</div></div>`;
  }
  function props() {
    const it = ITEMS.find((i) => i.key === st.sel);
    let h = `<p class="rv-ph">${it.label}</p>`;
    if (st.sel === 'mesh') {
      h += seg('Color by', CASES[st.key].fields.map((k) => [k, FIELD[k](C).name]), st.color);
      h += seg('Colormap', Object.keys(MAPS).map((k) => [k, MAP_LABEL[k]]), st.map);
      h += seg('Range', [['all', 'All time'], ['step', 'This step']], st.range);
      h += seg('Representation', [['surface', 'Surface'], ['edges', 'With edges']], st.rep);
    } else if (st.sel === 'stream') {
      h += seg('Seeds', [['sparse', 'Sparse'], ['normal', 'Normal'], ['dense', 'Dense']], st.seeds);
      h += `<p class="rv-pn">Traced through the velocity at this time step.</p>`;
    } else if (st.sel === 'glyph') {
      h += seg('Spacing', [['coarse', 'Coarse'], ['normal', 'Normal'], ['fine', 'Fine']], st.spacing);
      h += `<p class="rv-pn">Arrow length follows |U|.</p>`;
    } else if (st.sel === 'iso') {
      h += seg('Levels', [[5, '5'], [10, '10'], [20, '20']], st.levels);
      h += `<p class="rv-pn">Lines of equal ${FIELD[st.color](C).name}, the 2D form of an iso-surface.</p>`;
    } else {
      h += `<p class="rv-pn">Drag the yellow line in the view. The chart shows ${FIELD[st.color](C).name} from bottom to top.</p>`;
    }
    propsEl.innerHTML = h;
    propsEl.querySelectorAll('.rv-seg').forEach((g) => {
      const name = g.getAttribute('aria-label');
      g.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
        const v = b.dataset.v;
        if (name === 'Color by') st.color = v;
        if (name === 'Colormap') st.map = v;
        if (name === 'Range') st.range = v;
        if (name === 'Representation') st.rep = v;
        if (name === 'Seeds') st.seeds = v;
        if (name === 'Spacing') st.spacing = v;
        if (name === 'Levels') st.levels = +v;
        dirtyField = dirtyGeo = true;
        pipe(); props(); kick();
      }));
    });
  }
  pipeEl.addEventListener('click', (e) => {
    const eye = e.target.closest('[data-eye]'), pick = e.target.closest('[data-pick]');
    if (!eye && !pick) return;
    const k = (eye || pick).dataset.eye || pick.dataset.pick;
    if (eye && !eye.disabled) st.show[k] = !st.show[k];
    else if (pick && k !== 'mesh' && !st.show[k]) st.show[k] = true;
    st.sel = k;
    dirtyGeo = true;
    plot(); pipe(); props(); kick();
  });

  // ── Pointer: probe, and dragging the line probe ──────────────────────────
  let drag = false;
  const local = (e) => { const r = view.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const nearLine = (x) => st.show.line && Math.abs(x - (R.x + st.lineX * R.w)) < 14;
  view.addEventListener('pointerdown', (e) => {
    if (!R) return;
    const [x, y] = local(e);
    if (nearLine(x)) { drag = true; view.setPointerCapture(e.pointerId); hideProbe(); e.preventDefault(); return; }
    showProbe(x, y);
  });
  view.addEventListener('pointermove', (e) => {
    if (!R) return;
    const [x, y] = local(e);
    if (drag) {
      st.lineX = Math.max(0.005, Math.min(0.995, (x - R.x) / R.w));
      plot(); if (!animating()) paint();
      return;
    }
    view.style.cursor = nearLine(x) ? 'ew-resize' : 'crosshair';
    if (e.pointerType === 'mouse') showProbe(x, y);
  });
  const end = () => { drag = false; };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
  view.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) hideProbe(); });

  playBtn.addEventListener('click', () => setPlaying(!st.playing));
  slider.addEventListener('input', () => { setPlaying(false); setFrame(+slider.value); });

  // ── Cases ────────────────────────────────────────────────────────────────
  let seen = false;
  async function open(key, auto) {
    st.key = key;
    caseTabs.forEach((b) => { const on = b.dataset.case === key; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    fig.classList.add('busy');
    const d = await load(key);
    if (st.key !== key) return;
    C = d;
    const cfg = CASES[key];
    st.color = cfg.color;
    st.show.stream = cfg.stream;
    st.rep = cfg.edges ? 'edges' : 'surface';
    st.sel = 'mesh';
    st.range = 'all';
    titleEl.textContent = C.prompt;
    solverEl.textContent = cfg.solver;
    slider.max = C.F - 1;
    tCount.textContent = `${C.F} saved times`;
    metaEl.textContent = `${C.cells.toLocaleString()} cells`;
    fig.classList.remove('busy');
    st.frame = auto && !still ? 0 : C.F - 1;
    pipe(); props();
    size();
    setPlaying(false);
    setFrame(auto && !still ? 0 : C.F - 1);
    if (auto && !still) setPlaying(true);
  }
  caseTabs.forEach((b, i) => {
    b.addEventListener('click', () => open(b.dataset.case, true));
    b.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = caseTabs[(i + d + caseTabs.length) % caseTabs.length];
      n.focus(); open(n.dataset.case, true);
    });
  });

  // Load when near the screen; play the first case once when it's in view.
  const near = new IntersectionObserver((es) => { if (es[0].isIntersecting && !C) { near.disconnect(); open(st.key, false); } }, { rootMargin: '400px 0px' });
  near.observe(fig);
  new IntersectionObserver((es) => {
    inView = es[0].isIntersecting && es[0].intersectionRatio > 0.35;
    if (inView && C && !seen) { seen = true; if (!still) { setFrame(0); setPlaying(true); } }
    kick();
  }, { threshold: [0, 0.35, 0.6] }).observe(view);
  let lastW = 0;
  new ResizeObserver(() => { if (C && view.clientWidth !== lastW) { lastW = view.clientWidth; size(); } }).observe(view);
})();
