// Machine learning for CFD: the explainer figures. The cutaway in Why bends, swirl strength along the pipe, and the
// six-step walkthrough of the method. All drawn from media/flow.json and the 8-bit atlases.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  };
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = () => Math.min(2, devicePixelRatio || 1);

  function once(node, fn, margin = '300px') {
    if (!node) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
    io.observe(node);
  }
  const themeSubs = [];
  new MutationObserver(() => themeSubs.forEach((f) => f())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => themeSubs.forEach((f) => f()));

  let flowP = null;
  const flow = () => (flowP ||= fetch('media/flow.json').then((r) => r.json()));
  const atlases = {};
  function atlas(src) {
    return (atlases[src] ||= new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data, a = new Uint8Array(c.width * c.height);
        for (let i = 0; i < a.length; i++) a[i] = d[i * 4];
        res({ w: c.width, h: c.height, a });
      };
      img.onerror = rej;
      img.src = src;
    }));
  }

  // Jet, as in the thesis figures
  const JET = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) { const t = i / 254, c = (x) => clamp(1.5 - Math.abs(4 * t - x), 0, 1) * 255; JET.set([c(3), c(2), c(1)], i * 3); }

  // One n x n tile of an atlas as a coloured canvas (255 = outside the pipe)
  function tile(A, n, col, row, flip = false) {
    const c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'), im = g.createImageData(n, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const sy = flip ? n - 1 - y : y, v = A.a[(row * n + sy) * A.w + col * n + x], o = (y * n + x) * 4;
      if (v === 255) { im.data[o + 3] = 0; continue; }
      im.data[o] = JET[v * 3]; im.data[o + 1] = JET[v * 3 + 1]; im.data[o + 2] = JET[v * 3 + 2]; im.data[o + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return c;
  }
  // Draw a disc tile into a visible canvas, clipped round, with a rim. Returns [context, size, scale].
  function disc(cv, src) {
    const w = Math.max(16, Math.round(cv.clientWidth * dpr()));
    if (cv.width !== w) { cv.width = w; cv.height = w; }
    const g = cv.getContext('2d');
    g.clearRect(0, 0, w, w);
    g.save(); g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2); g.clip();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, w); g.restore();
    g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2);
    g.lineWidth = Math.max(1, 1.25 * dpr()); g.strokeStyle = cssVar('--strong'); g.globalAlpha = 0.55; g.stroke(); g.globalAlpha = 1;
    return [g, w];
  }
  // (x, v) in metres on a plane -> canvas pixels; v up is the outer wall
  const px = (w, x, v) => [((x + 0.02) / 0.04) * w, ((0.02 - v) / 0.04) * w];
  function arrows(g, w, U, V, vec, max) {
    const sp = w * 0.1, sc = (sp * 1.5) / max, d = dpr();
    g.strokeStyle = 'rgba(12,12,51,.85)'; g.fillStyle = 'rgba(12,12,51,.85)'; g.lineWidth = 1.4 * d; g.lineCap = 'round';
    for (let j = 0; j < U.length; j++) {
      const u = vec[2 * j], v = vec[2 * j + 1], m = Math.hypot(u, v);
      if (m < max * 0.03) continue;
      const [x0, y0] = px(w, U[j], V[j]), L = Math.min(m * sc, sp * 1.6), ux = u / m, uy = -v / m;
      const x1 = x0 + ux * L, y1 = y0 + uy * L, hs = Math.min(4.5 * d, L * 0.45);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - ux * hs - uy * hs * 0.6, y1 - uy * hs + ux * hs * 0.6); g.lineTo(x1 - ux * hs + uy * hs * 0.6, y1 - uy * hs - ux * hs * 0.6); g.closePath(); g.fill();
    }
  }
  function dot(g, w, x, v, r, fill, ring) {
    const [cx, cy] = px(w, x, v);
    g.beginPath(); g.arc(cx, cy, r * dpr(), 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (ring) { g.lineWidth = 2 * dpr(); g.strokeStyle = ring; g.stroke(); }
  }

  // ── Why bends: the pipe cut open along its mid-plane, from the strip data ─
  const cutfig = $('#cutfig');
  once(cutfig, async () => {
    const [F, S, DA, DL] = await Promise.all([flow(), atlas('media/strip.png'), atlas('media/dean.png'), fetch('media/dean-lines.json').then((r) => r.json())]);
    const SN = F.strip.s, NN = F.strip.n, LEN = F.strip.length, K = F.times.length - 1;
    const R = 0.02, YB = 0.4, ZB = 0.06, RB = 0.06, BEND = (Math.PI / 2) * RB;
    const Y0 = 0.255, Z1 = 0.215, SPAN = 0.275;
    // (y, z) on the mid-plane -> (s along the centreline, n toward the outer wall), or null outside the pipe
    const sn = (y, z) => {
      if (y <= YB && Math.abs(z) <= R) return [y, -z];
      if (z >= ZB && Math.abs(y - 0.46) <= R) return [YB + BEND + (z - ZB), y - 0.46];
      if (y > YB && z < ZB) { const r = Math.hypot(y - YB, z - ZB); if (Math.abs(r - RB) <= R) return [YB + Math.atan2(y - YB, ZB - z) * RB, r - RB]; }
      return null;
    };
    const val = (s, n) => {
      const c = clamp((s / LEN) * SN - 0.5, 0, SN - 1), r = clamp(((n + R) / (2 * R)) * NN - 0.5, 0, NN - 1);
      const c0 = Math.floor(c), r0 = Math.floor(r), c1 = Math.min(SN - 1, c0 + 1), r1 = Math.min(NN - 1, r0 + 1), fc = c - c0, fr = r - r0;
      const at = (cc, rr) => S.a[(K * NN + rr) * SN + cc];
      return (at(c0, r0) * (1 - fc) + at(c1, r0) * fc) * (1 - fr) + (at(c0, r1) * (1 - fc) + at(c1, r1) * fc) * fr;
    };
    const cv = $('#cut-cv');
    function paint() {
      const w = Math.round(cv.clientWidth * dpr());
      if (!w) return;
      cv.width = cv.height = w;
      const g = cv.getContext('2d'), im = g.createImageData(w, w), k = w / SPAN;
      for (let py = 0; py < w; py++) for (let px = 0; px < w; px++) {
        const q = sn(Y0 + (px + 0.5) / k, Z1 - (py + 0.5) / k);
        if (!q) continue;
        const v = Math.round(val(q[0], q[1])), o = (py * w + px) * 4;
        im.data[o] = JET[v * 3]; im.data[o + 1] = JET[v * 3 + 1]; im.data[o + 2] = JET[v * 3 + 2]; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0);
    }
    paint();
    new ResizeObserver(paint).observe(cv);
    // Walls, cut ends, wear marks, the section line and labels
    const svg = $('#cut-svg'), k = 520 / SPAN, X = (y) => (y - Y0) * k, Yz = (z) => (Z1 - z) * k, wt = 2.6 / k;
    const out = `M${X(Y0)} ${Yz(-R - wt)}L${X(YB)} ${Yz(-R - wt)}A${(RB + R + wt) * k} ${(RB + R + wt) * k} 0 0 0 ${X(0.48 + wt)} ${Yz(ZB)}L${X(0.48 + wt)} ${Yz(Z1)}`;
    const inn = `M${X(Y0)} ${Yz(R + wt)}L${X(YB)} ${Yz(R + wt)}A${(RB - R - wt) * k} ${(RB - R - wt) * k} 0 0 0 ${X(0.44 - wt)} ${Yz(ZB)}L${X(0.44 - wt)} ${Yz(Z1)}`;
    svgEl('path', { class: 'cut-wall', d: out }, svg);
    svgEl('path', { class: 'cut-wall', d: inn }, svg);
    const zig = (x0, y0, x1, y1) => { const n = 7, pts = []; for (let i = 0; i <= n; i++) { const t = i / n, off = i % 2 ? 4 : -4; const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny); pts.push(`${x0 + (x1 - x0) * t + (nx / l) * off * (i && i < n ? 1 : 0)} ${y0 + (y1 - y0) * t + (ny / l) * off * (i && i < n ? 1 : 0)}`); } return 'M' + pts.join('L'); };
    svgEl('path', { class: 'cut-end', d: zig(X(Y0), Yz(R + wt), X(Y0), Yz(-R - wt)) }, svg);
    svgEl('path', { class: 'cut-end', d: zig(X(0.44 - wt), Yz(Z1), X(0.48 + wt), Yz(Z1)) }, svg);
    // wear: short marks outside the outer wall, through the bend and just after it
    const wear = [];
    for (let a = 28; a <= 90; a += 5) { const t = (a * Math.PI) / 180, r0 = RB + R + wt * 1.6, r1 = r0 + 5 / k; wear.push(`M${X(YB + r0 * Math.sin(t))} ${Yz(ZB - r0 * Math.cos(t))}L${X(YB + r1 * Math.sin(t))} ${Yz(ZB - r1 * Math.cos(t))}`); }
    for (let z = ZB + 0.008; z <= ZB + 0.06; z += 0.008) wear.push(`M${X(0.48 + wt * 1.6)} ${Yz(z)}L${X(0.48 + wt * 1.6) + 5} ${Yz(z)}`);
    svgEl('path', { class: 'cut-wear', d: wear.join('') }, svg);
    const label = (x, y, t1, t2, anchor = 'start') => { svgEl('text', { class: 'cut-t', x, y, 'text-anchor': anchor }, svg).textContent = t1; if (t2) svgEl('text', { class: 'cut-ts', x, y: y + 17, 'text-anchor': anchor }, svg).textContent = t2; };
    const lead = (x0, y0, x1, y1) => { svgEl('path', { class: 'cut-lead', d: `M${x0} ${y0}L${x1} ${y1}` }, svg); svgEl('circle', { class: 'cut-dot', cx: x1, cy: y1, r: 2.4 }, svg); };
    // outer wall
    const t30 = (34 * Math.PI) / 180, wx = X(YB + (RB + R + 8 / k) * Math.sin(t30)), wy = Yz(ZB - (RB + R + 8 / k) * Math.cos(t30));
    lead(wx + 6, wy + 24, wx, wy + 3);
    label(wx + 8, wy + 40, 'Outer wall wears', 'particles are thrown into it', 'end');
    // slow zone on the inner wall
    const sx = X(0.4415), sy = Yz(0.105);
    lead(sx - 70, sy - 40, sx, sy);
    label(sx - 74, sy - 62, 'Slow water on the inner wall', 'particles linger and settle', 'end');
    // inlet
    svgEl('path', { class: 'cut-lead', d: `M${X(0.262)} ${Yz(0)}H${X(0.3)}`, 'marker-end': 'url(#ah)' }, svg);
    label(X(0.258), Yz(R) - 36, 'Water and particles in', '0.5 m/s');
    // section A, one diameter after the bend
    const za = ZB + 0.04;
    svgEl('path', { class: 'cut-sec', d: `M${X(0.44) - 12} ${Yz(za)}H${X(0.48) + 12}` }, svg);
    svgEl('text', { class: 'cut-t', x: X(0.48) + 18, y: Yz(za) + 4 }, svg).textContent = 'A';
    svgEl('text', { class: 'cut-t', x: X(0.44) - 24, y: Yz(za) + 4 }, svg).textContent = 'A';
    // inset: section A with the real swirl streamlines
    const dc = $('#cut-disc'), st = 2, src = tile(DA, F.dean.n, st, 0);
    const paintDisc = () => disc(dc, src);
    paintDisc();
    new ResizeObserver(paintDisc).observe(dc);
    const ds = $('#cut-disc-svg');
    DL.lines[st].forEach((L) => { let d = ''; for (let i = 0; i < L.length; i += 2) d += `${i ? 'L' : 'M'}${(L[i] * 54).toFixed(2)} ${(-L[i + 1] * 54).toFixed(2)}`; svgEl('path', { class: 'cut-sl', d }, ds); });
    svgEl('text', { class: 'cut-io', x: 0, y: -58.5, 'text-anchor': 'middle', 'font-size': 6.4 }, ds).textContent = 'outer wall';
    svgEl('text', { class: 'cut-io', x: 0, y: 63.5, 'text-anchor': 'middle', 'font-size': 6.4 }, ds).textContent = 'inner wall';
  });

  // ── Dean vortices: swirl strength along the pipe ────────────────────
  const deanFig = $('#dean-fig');
  once(deanFig, async () => {
    const F = await flow();
    const Dn = F.dean, read = $('#dean-read');
    const svg = $('#dean-chart svg'), W = 960, H = 360, L = 64, R = 24, T = 26, B = 52, x0 = -4, x1 = 10.2, top = 0.26;
    const x = (d) => L + ((d - x0) / (x1 - x0)) * (W - L - R), y = (v) => T + (1 - v / top) * (H - T - B);
    svgEl('rect', { x: x(-Dn.bend), y: T, width: x(0) - x(-Dn.bend), height: H - T - B, fill: 'var(--strong)', opacity: 0.05 }, svg);
    svgEl('text', { class: 'c-lab', x: (x(-Dn.bend) + x(0)) / 2, y: T - 8, 'text-anchor': 'middle' }, svg).textContent = 'inside the bend';
    [0, 0.05, 0.1, 0.15, 0.2, 0.25].forEach((v) => {
      svgEl('line', { class: 'c-grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }, svg);
      svgEl('text', { class: 'c-tick', x: L - 10, y: y(v) + 4, 'text-anchor': 'end' }, svg).textContent = v.toFixed(2);
    });
    [-4, -2, 0, 2, 4, 6, 8, 10].forEach((d) => svgEl('text', { class: 'c-tick', x: x(d), y: H - B + 20, 'text-anchor': 'middle' }, svg).textContent = d === 0 ? 'exit' : `${d}`);
    svgEl('line', { class: 'c-axis', x1: L, x2: W - R, y1: H - B, y2: H - B }, svg);
    svgEl('text', { class: 'c-lab', x: (L + W - R) / 2, y: H - 8, 'text-anchor': 'middle' }, svg).textContent = 'Diameters from the bend’s exit (negative: before it)';
    svgEl('text', { class: 'c-lab', x: 14, y: (T + H - B) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(T + H - B) / 2})` }, svg).textContent = 'Sideways flow, m/s';
    const c = Dn.curve.filter((p) => p[0] >= x0 && p[0] <= x1);
    svgEl('path', { class: 'c-line', stroke: 'var(--muted)', 'stroke-dasharray': '4 4', d: c.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[2]).toFixed(1)}`).join('') }, svg);
    svgEl('path', { class: 'c-line', stroke: 'var(--acc)', 'stroke-width': 2.5, d: c.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join('') }, svg);
    svgEl('text', { class: 'c-lab', x: x(5.6), y: y(0.105) - 10, style: 'fill:var(--acc)' }, svg).textContent = 'strongest';
    svgEl('text', { class: 'c-lab', x: x(5.6), y: y(0.042) + 18 }, svg).textContent = 'average';
    [[1, 'a1'], [5, 'a5'], [9, 'a9']].forEach(([d, k]) => svgEl('line', { x1: x(d), x2: x(d), y1: H - B - 6, y2: H - B, stroke: `var(--s-${k})`, 'stroke-width': 3 }, svg));
    const hov = svgEl('g', { opacity: 0 }, svg), cross = svgEl('line', { class: 'c-cross', y1: T, y2: H - B }, hov);
    const d1 = svgEl('circle', { class: 'c-dot', r: 5.5, fill: 'var(--acc)' }, hov), d2 = svgEl('circle', { class: 'c-dot', r: 4.5, fill: 'var(--muted)' }, hov);
    svg.addEventListener('pointermove', (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = 0;
      const d = x0 + ((pt.matrixTransform(svg.getScreenCTM().inverse()).x - L) / (W - L - R)) * (x1 - x0);
      const p = c.reduce((a, q) => (Math.abs(q[0] - d) < Math.abs(a[0] - d) ? q : a), c[0]);
      cross.setAttribute('x1', x(p[0])); cross.setAttribute('x2', x(p[0]));
      d1.setAttribute('cx', x(p[0])); d1.setAttribute('cy', y(p[1])); d2.setAttribute('cx', x(p[0])); d2.setAttribute('cy', y(p[2]));
      hov.setAttribute('opacity', 1);
      const where = p[0] < -Dn.bend ? `${Math.abs(p[0] + Dn.bend).toFixed(1)} D before the bend` : p[0] < 0 ? 'inside the bend' : `${p[0].toFixed(1)} D after the bend`;
      read.innerHTML = `<b>${where}</b>: strongest sideways flow <b>${p[1].toFixed(3)} m/s</b>, average ${p[2].toFixed(3)} m/s.`;
    });
    svg.addEventListener('pointerleave', () => { hov.setAttribute('opacity', 0); read.textContent = 'Hover the chart.'; });
  });

  // ── How it works: six steps on real data ────────────────────────────────
  const how = $('#how-fig');
  once(how, async () => {
    const [F, D, C] = await Promise.all([flow(), atlas('media/discs.png'), atlas('media/compare.png')]);
    const N = F.discs.n, tabs = $$('.how-steps button', how), panels = $$('.how-p', how);
    const prev = $('#how-prev'), next = $('#how-next'), count = $('#how-count');
    const probe = F.probe.a1, pv = probe.xyz[1] - 0.46, pxx = probe.xyz[0];
    const t = (k) => (k * 0.05).toFixed(2);
    const f4 = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(4);
    const discs = [];  // [canvas, draw] pairs redrawn on resize
    const addDisc = (cv, draw) => { discs.push([cv, draw]); requestAnimationFrame(draw); };

    // 1 Simulate: the 1D-after plane in 14 snapshots
    {
      const box = $('#hv0'), g = document.createElement('div'); g.className = 'hv-thumbs'; box.append(g);
      for (let k = 1; k <= 40; k += 3) {
        const f = document.createElement('figure'); f.innerHTML = `<canvas></canvas><figcaption>${t(k)} s</figcaption>`; g.append(f);
        const cv = $('canvas', f), src = tile(D, N, k, 1); addDisc(cv, () => disc(cv, src));
      }
      const k = document.createElement('p'); k.className = 'hv-key'; k.innerHTML = '<span><i style="--c:#0000ff"></i>slow</span><span><i style="--c:#ff0000"></i>fast</span><span>Outer wall of the bend at the top</span>'; box.append(k);
    }
    // 2 Export: one snapshot becomes a table
    const rows5 = [[112898, -0.001866, 0.456234, -0.015046, 0.143468, 0.326067], [112899, 0, 0.456222, 0, 0.161616, 0.311972], [112900, 0.001866, 0.456234, 0.015047, 0.143467, 0.326067], [112909, -0.001885, 0.458115, -0.019699, 0.118715, 0.308863], [112910, 0, 0.458109, 0, 0.133207, 0.298873]];
    {
      const box = $('#hv1');
      box.innerHTML = `<div class="hv-row"><canvas></canvas><div><p class="hv-sub">t1.55.csv, 135,730 rows. Five of them:</p><div class="tbl-scroll"><table class="hv-tbl"><thead><tr><th>Point</th><th>x</th><th>y</th><th>Ux</th><th>Uy</th><th>Uz</th></tr></thead><tbody>${rows5.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((v, i) => `<td${i > 1 ? ' class="ft"' : ''}>${f4(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="hv-key"><span>Positions in metres, velocity in m/s</span></p></div></div>`;
      const cv = $('canvas', box), src = tile(D, N, 31, 1);
      addDisc(cv, () => {
        const [g, w] = disc(cv, src);
        g.fillStyle = 'rgba(12,12,51,.45)';
        const m = F.mesh.a1;
        for (let i = 0; i < m.length; i += 2) { const [x, y] = px(w, m[i], m[i + 1]); g.beginPath(); g.arc(x, y, 1.1 * dpr(), 0, Math.PI * 2); g.fill(); }
        rows5.forEach((r) => dot(g, w, r[1], r[2] - 0.46, 3.6, '#fff', 'rgba(12,12,51,.95)'));
      });
    }
    // Sparklines of one point's history, shared by steps 3 to 5
    function spark(box, mode) {
      const W = 620, H = 270, L = 46, R = 12, T = 10, RH = 80;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Ux, Uy and Uz of one point over the 41 saved steps' });
      const wrap = document.createElement('div'); wrap.className = 'hv-spark'; wrap.append(svg); box.append(wrap);
      const x = (k) => L + ((k - 1) / 39) * (W - L - R);
      if (mode === 'train') {
        svgEl('rect', { x: x(1), y: T - 4, width: x(30.5) - x(1), height: 3 * RH, fill: 'var(--y1)', opacity: 0.35 }, svg);
        svgEl('rect', { x: x(30.5), y: T - 4, width: x(40) - x(30.5), height: 3 * RH, fill: 'var(--strong)', opacity: 0.06 }, svg);
        svgEl('text', { class: 'c-lab', x: x(15), y: H - 4, 'text-anchor': 'middle' }, svg).textContent = 'train: 0.05 to 1.50 s';
        svgEl('text', { class: 'c-lab', x: x(35.3), y: H - 4, 'text-anchor': 'middle', style: 'fill:var(--strong)' }, svg).textContent = 'test';
      }
      const band = svgEl('rect', { y: T - 4, height: 3 * RH, fill: 'var(--o1)', opacity: 0, rx: 4 }, svg);
      const ys = [0, 1, 2].map((ci) => {
        const vals = probe.U.slice(1).map((u) => u[ci]);
        let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.15 || 0.01; lo -= pad; hi += pad;
        const y = (v) => T + ci * RH + (1 - (v - lo) / (hi - lo)) * (RH - 16);
        svgEl('line', { class: 'c-grid', x1: L, x2: W - R, y1: T + ci * RH + RH - 12, y2: T + ci * RH + RH - 12 }, svg);
        svgEl('text', { class: 'c-tick', x: 6, y: T + ci * RH + RH / 2 - 2, style: 'fill:var(--strong)' }, svg).textContent = ['Ux', 'Uy', 'Uz'][ci];
        svgEl('path', { class: 'c-line', stroke: ci === 0 ? 'var(--strong)' : 'var(--s-b1)', 'stroke-width': 1.8, d: vals.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join('') }, svg);
        return y;
      });
      if (mode !== 'train') [1, 10, 20, 30, 40].forEach((k) => svgEl('text', { class: 'c-tick', x: x(k), y: H - 4, 'text-anchor': 'middle' }, svg).textContent = `${t(k)} s`);
      const marks = svgEl('g', {}, svg);
      return {
        at(k) {
          marks.replaceChildren();
          band.setAttribute('x', x(k - 3) - 6); band.setAttribute('width', x(k) - x(k - 3) + 12); band.setAttribute('opacity', 0.16);
          for (let j = 1; j <= 3; j++) svgEl('circle', { cx: x(k - j), cy: ys[0](probe.U[k - j][0]), r: 4.5, fill: 'var(--acc)' }, marks);
          [1, 2].forEach((ci) => svgEl('circle', { cx: x(k), cy: ys[ci](probe.U[k][ci]), r: 4.5, fill: 'var(--s-b1)' }, marks));
          svgEl('circle', { cx: x(k), cy: ys[0](probe.U[k][0]), r: 6, fill: 'var(--card)', stroke: 'var(--strong)', 'stroke-width': 2.5 }, marks);
        },
      };
    }
    // 3 Follow a point
    {
      const box = $('#hv2'), row = document.createElement('div'); row.className = 'hv-row'; box.append(row);
      const cv = document.createElement('canvas'); row.append(cv);
      const right = document.createElement('div'); row.append(right);
      const src = tile(D, N, 31, 1);
      addDisc(cv, () => { const [g, w] = disc(cv, src); dot(g, w, pxx, pv, 6, null, '#fff'); dot(g, w, pxx, pv, 3, 'rgba(12,12,51,.95)'); });
      spark(right, 'plain');
      const k = document.createElement('p'); k.className = 'hv-key'; k.innerHTML = '<span>Velocity of this one point, m/s, at all 41 steps</span>'; right.append(k);
    }
    // 4 Build rows: a window slides along the history
    let rowsTimer = 0, rowK = 4;
    const rowsBox = $('#hv3');
    const sp4 = spark(rowsBox, 'plain');
    const key4 = document.createElement('p'); key4.className = 'hv-key'; key4.innerHTML = '<span><i style="--c:var(--acc)"></i>inputs: Ux at the last 3 steps</span><span><i style="--c:var(--s-b1)"></i>inputs: Uy and Uz now</span><span><i style="--c:var(--strong)"></i>answer: Ux now</span>'; rowsBox.append(key4);
    const tbl = document.createElement('table'); tbl.className = 'hv-tbl'; tbl.style.marginTop = '14px';
    tbl.innerHTML = '<thead><tr><th>t</th><th>Ux t−3</th><th>Ux t−2</th><th>Ux t−1</th><th>Uy t</th><th>Uz t</th><th>→ Ux t</th></tr></thead><tbody></tbody>';
    const tw = document.createElement('div'); tw.className = 'tbl-scroll'; tw.append(tbl); rowsBox.append(tw);
    const body = $('tbody', tbl), rowsSeen = [];
    function buildRow(k) {
      sp4.at(k);
      const U = probe.U;
      rowsSeen.push(`<td>${t(k)} s</td><td class="lag">${f4(U[k - 3][0])}</td><td class="lag">${f4(U[k - 2][0])}</td><td class="lag">${f4(U[k - 1][0])}</td><td class="ft">${f4(U[k][1])}</td><td class="ft">${f4(U[k][2])}</td><td class="tg">${f4(U[k][0])}</td>`);
      while (rowsSeen.length > 4) rowsSeen.shift();
      body.innerHTML = rowsSeen.map((r, i) => `<tr class="${i === rowsSeen.length - 1 ? 'new' : ''}">${r}</tr>`).join('');
    }
    for (let k = 4; k <= 7; k++) buildRow(k);
    rowK = 8;
    const startRows = () => {
      if (still || rowsTimer) return;
      rowsTimer = setInterval(() => { buildRow(rowK); rowK = rowK >= 30 ? 4 : rowK + 1; }, 700);
    };
    const stopRows = () => { clearInterval(rowsTimer); rowsTimer = 0; };
    // 5 Train
    {
      const box = $('#hv4');
      spark(box, 'train');
      const tree = '<svg viewBox="0 0 64 52" aria-hidden="true"><g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M32 8L16 26M32 8L48 26M16 26L8 44M16 26L24 44M48 26L40 44M48 26L56 44"/></g><g fill="var(--o2)"><circle cx="32" cy="8" r="4.5"/><circle cx="16" cy="26" r="4"/><circle cx="48" cy="26" r="4"/></g><g fill="var(--y2)"><circle cx="8" cy="44" r="3.5"/><circle cx="24" cy="44" r="3.5"/><circle cx="40" cy="44" r="3.5"/><circle cx="56" cy="44" r="3.5"/></g></svg>';
      const tr = document.createElement('div'); tr.className = 'hv-trees';
      tr.innerHTML = `<span style="color:var(--strong)">${tree}</span>+<span style="color:var(--strong)">${tree}</span>+<span style="color:var(--strong)">${tree}</span>+ …<b>= one model per component</b>`;
      box.append(tr);
    }
    // 6 Predict: the test steps, then model next to CFD
    {
      const box = $('#hv5');
      box.innerHTML = '<p class="hv-sub">The steps the model never saw, 1.55 to 2.00 s, from the solver:</p>';
      const g = document.createElement('div'); g.className = 'hv-thumbs ten'; box.append(g);
      for (let k = 31; k <= 40; k++) {
        const f = document.createElement('figure'); f.innerHTML = `<canvas></canvas><figcaption>${t(k)}</figcaption>`; g.append(f);
        const cv = $('canvas', f), src = tile(D, N, k, 1); addDisc(cv, () => disc(cv, src));
      }
      const pair = document.createElement('div'); pair.className = 'hv-pair';
      pair.innerHTML = '<figure><canvas></canvas><figcaption>CFD, 1.55 s</figcaption></figure><figure><canvas></canvas><figcaption>Model, 1.55 s</figcaption></figure>';
      box.append(pair);
      const [c1, c2] = $$('canvas', pair);
      const a = tile(C, F.compare.n, 1, 0), b = tile(C, F.compare.n, 1, 1);
      addDisc(c1, () => disc(c1, a)); addDisc(c2, () => disc(c2, b));
      const k = document.createElement('p'); k.className = 'hv-key'; k.innerHTML = `<span>1D after the bend. Mean gap ${F.compare.cases[1].mae.toFixed(4)} m/s. Compare every plane in Velocity predictions below.</span>`; box.append(k);
    }

    let cur = 0;
    function go(i) {
      cur = clamp(i, 0, 5);
      tabs.forEach((b, j) => b.setAttribute('aria-selected', String(j === cur)));
      panels.forEach((p, j) => { p.classList.toggle('on', j === cur); p.toggleAttribute('inert', j !== cur); });
      prev.disabled = cur === 0;
      next.textContent = cur === 5 ? 'Start again' : 'Next step';
      count.textContent = `${cur + 1} / 6`;
      if (cur === 3) startRows(); else stopRows();
      requestAnimationFrame(() => discs.forEach(([, d]) => d()));
    }
    tabs.forEach((b, j) => b.addEventListener('click', () => go(j)));
    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur === 5 ? 0 : cur + 1));
    how.addEventListener('keydown', (e) => {
      if (!e.target.closest('.how-steps')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); tabs[cur].focus(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); tabs[cur].focus(); }
    });
    go(0);
    new ResizeObserver(() => discs.forEach(([, d]) => d())).observe(how);
    themeSubs.push(() => discs.forEach(([, d]) => d()));
  });
})();
