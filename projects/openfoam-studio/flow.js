// OpenFOAM Studio page: the hero cavity flow, the contents rail and figure reveals.
// The hero reads media/cavity.json: the 20x20 cell-centre velocity field of a real
// Re=100 run from the app. Particles are advected through it with bilinear sampling.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Hero flow ────────────────────────────────────────────────────────────
  const box = document.getElementById('flow');
  const fieldCv = document.getElementById('flow-field');
  const trailCv = document.getElementById('flow-trails');
  if (box && fieldCv && trailCv) {
    fetch('media/cavity.json').then((r) => r.json()).then(start).catch(() => {});
  }

  // Same stops as the rendered field images (scripts/openfoam-figures.py).
  const STOPS = [[0, 16, 22, 42], [0.25, 27, 54, 122], [0.5, 36, 99, 214], [0.75, 63, 174, 230], [1, 216, 246, 251]];
  function cmap(t) {
    t = Math.max(0, Math.min(1, t));
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        const a = STOPS[i - 1], b = STOPS[i], k = (t - a[0]) / (b[0] - a[0]);
        return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
      }
    }
    return STOPS[STOPS.length - 1].slice(1);
  }

  function start(data) {
    const n = data.n, N = n + 2;
    // Ghost cells so bilinear sampling hits the wall value exactly on the wall:
    // no-slip walls are 0, the lid (top) moves at u = 1.
    const pu = new Float32Array(N * N), pv = new Float32Array(N * N);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      pu[(j + 1) * N + i + 1] = data.u[j * n + i];
      pv[(j + 1) * N + i + 1] = data.v[j * n + i];
    }
    for (let k = 1; k <= n; k++) {
      pu[k * N] = -pu[k * N + 1]; pv[k * N] = -pv[k * N + 1];                    // left
      pu[k * N + n + 1] = -pu[k * N + n]; pv[k * N + n + 1] = -pv[k * N + n];    // right
      pu[k] = -pu[N + k]; pv[k] = -pv[N + k];                                    // bottom
      pu[(n + 1) * N + k] = 2 - pu[n * N + k]; pv[(n + 1) * N + k] = -pv[n * N + k]; // lid
    }
    function sample(x, y) {
      const fx = Math.min(Math.max(x * n + 0.5, 0), N - 1.001);
      const fy = Math.min(Math.max(y * n + 0.5, 0), N - 1.001);
      const i = fx | 0, j = fy | 0, a = fx - i, b = fy - j;
      const k = j * N + i;
      const u = (pu[k] * (1 - a) + pu[k + 1] * a) * (1 - b) + (pu[k + N] * (1 - a) + pu[k + N + 1] * a) * b;
      const v = (pv[k] * (1 - a) + pv[k + 1] * a) * (1 - b) + (pv[k + N] * (1 - a) + pv[k + N + 1] * a) * b;
      return [u, v];
    }

    const fctx = fieldCv.getContext('2d');
    const tctx = trailCv.getContext('2d');
    let W = 0, H = 0, dpr = 1, parts = [];

    function paintField() {
      const R = 160;
      const off = document.createElement('canvas');
      off.width = off.height = R;
      const ctx = off.getContext('2d');
      const img = ctx.createImageData(R, R);
      for (let py = 0; py < R; py++) for (let px = 0; px < R; px++) {
        const [u, v] = sample((px + 0.5) / R, 1 - (py + 0.5) / R);
        const c = cmap(Math.hypot(u, v) * 0.85);
        const o = (py * R + px) * 4;
        img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      fctx.imageSmoothingEnabled = true;
      fctx.imageSmoothingQuality = 'high';
      fctx.drawImage(off, 0, 0, W, H);
    }

    function spawn(p) {
      p.x = Math.random(); p.y = Math.random();
      p.life = 60 + Math.random() * 240;
      return p;
    }

    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.round(box.clientWidth * dpr); H = Math.round(box.clientHeight * dpr);
      if (!W || !H) return;
      fieldCv.width = trailCv.width = W; fieldCv.height = trailCv.height = H;
      paintField();
      const count = Math.round(Math.min(900, (W * H) / (dpr * dpr) / 260));
      parts = Array.from({ length: count }, () => spawn({}));
      tctx.clearRect(0, 0, W, H);
      if (still) drawStreamlines();
    }

    // Reduced motion: one still drawing of streamlines instead of moving particles.
    function drawStreamlines() {
      tctx.strokeStyle = 'rgba(225,245,255,.5)';
      tctx.lineWidth = 1 * dpr;
      for (let s = 0; s < 70; s++) {
        let x = 0.08 + Math.random() * 0.84, y = 0.08 + Math.random() * 0.84;
        tctx.beginPath(); tctx.moveTo(x * W, (1 - y) * H);
        for (let k = 0; k < 260; k++) {
          const [u, v] = sample(x, y), m = Math.hypot(u, v) || 1;
          x += (u / m) * 0.004; y += (v / m) * 0.004;
          if (x < 0 || x > 1 || y < 0 || y > 1) break;
          tctx.lineTo(x * W, (1 - y) * H);
        }
        tctx.stroke();
      }
    }

    // Point probe: the solved velocity under the cursor, as the app's probe shows it.
    const probe = document.getElementById('probe');
    function probeAt(x, y, e) {
      if (!probe || x < 0 || x > 1 || y < 0 || y > 1) return;
      const [u, v] = sample(x, y);
      probe.innerHTML = `<b>|U| ${Math.hypot(u, v).toFixed(3)} m/s</b><span>u ${u.toFixed(3)} · v ${v.toFixed(3)}</span>`;
      const r = box.getBoundingClientRect();
      probe.style.transform = `translate(${e.clientX - r.left + (x > 0.6 ? -14 : 14)}px, ${e.clientY - r.top + 14}px) translateX(${x > 0.6 ? '-100%' : '0'})`;
      probe.classList.add('on');
    }

    // Stirring: the pointer leaves short-lived swirls of velocity that fade with
    // momentum, so the flow drifts back to the solved field once the cursor stops.
    const stirs = [];
    const ptr = { x: 0, y: 0, vx: 0, vy: 0, in: false, t: 0 };
    const R2 = 0.12 * 0.12;
    function stirAt(x, y) {
      let u = 0, v = 0;
      for (const s of stirs) {
        const dx = x - s.x, dy = y - s.y, w = s.a * Math.exp(-(dx * dx + dy * dy) / R2);
        u += s.vx * w; v += s.vy * w;
      }
      return [u, v];
    }
    function stepStirs() {
      if (ptr.in) {
        const sp = Math.hypot(ptr.vx, ptr.vy);
        if (sp > 0.0004) stirs.push({ x: ptr.x, y: ptr.y, vx: ptr.vx * 7, vy: ptr.vy * 7, a: Math.min(1, sp * 120) });
        ptr.vx *= 0.6; ptr.vy *= 0.6;
      }
      for (let i = stirs.length - 1; i >= 0; i--) {
        const s = stirs[i];
        s.a *= 0.96;
        // Swirls are carried a little by the flow they sit in.
        const [u, v] = sample(s.x, s.y);
        s.x += u * STEP * 0.5; s.y += v * STEP * 0.5;
        if (s.a < 0.02) stirs.splice(i, 1);
      }
      if (stirs.length > 48) stirs.splice(0, stirs.length - 48);
    }
    if (!still) {
      box.style.touchAction = 'pan-y';
      const local = (e) => {
        const r = box.getBoundingClientRect();
        return [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height];
      };
      box.addEventListener('pointerenter', (e) => { [ptr.x, ptr.y] = local(e); ptr.vx = ptr.vy = 0; ptr.in = true; });
      box.addEventListener('pointermove', (e) => {
        const [x, y] = local(e);
        // Smooth the pointer's velocity so a jerky mouse still gives an even swirl.
        ptr.vx += ((x - ptr.x) - ptr.vx) * 0.35;
        ptr.vy += ((y - ptr.y) - ptr.vy) * 0.35;
        ptr.x = x; ptr.y = y; ptr.in = true;
        probeAt(x, y, e);
      });
      box.addEventListener('pointerleave', () => { ptr.in = false; probe.classList.remove('on'); });
    }

    let running = false, raf = 0;
    const STEP = 1 / 150; // a particle at lid speed crosses the cavity in 150 frames
    function frame() {
      stepStirs();
      tctx.globalCompositeOperation = 'destination-out';
      tctx.fillStyle = 'rgba(0,0,0,.07)';
      tctx.fillRect(0, 0, W, H);
      tctx.globalCompositeOperation = 'source-over';
      tctx.lineWidth = 1.15 * dpr;
      tctx.lineCap = 'round';
      // Particles the cursor is pushing draw brighter, so the stir reads clearly.
      const calm = new Path2D(), lit = new Path2D();
      for (const p of parts) {
        let [u, v] = sample(p.x, p.y), push = 0;
        if (stirs.length) { const [su, sv] = stirAt(p.x, p.y); u += su; v += sv; push = Math.hypot(su, sv); }
        const nx = p.x + u * STEP, ny = p.y + v * STEP;
        const path = push > 0.1 ? lit : calm;
        path.moveTo(p.x * W, (1 - p.y) * H);
        path.lineTo(nx * W, (1 - ny) * H);
        p.x = nx; p.y = ny;
        if (--p.life < 0 || nx < 0.003 || nx > 0.997 || ny < 0.003 || ny > 0.997) spawn(p);
      }
      tctx.strokeStyle = 'rgba(230,248,255,.6)';
      tctx.stroke(calm);
      tctx.lineWidth = 1.6 * dpr;
      tctx.strokeStyle = 'rgba(255,255,255,.95)';
      tctx.stroke(lit);
      if (running) raf = requestAnimationFrame(frame);
    }
    function play(on) {
      if (still || on === running) return;
      running = on;
      if (on) raf = requestAnimationFrame(frame); else cancelAnimationFrame(raf);
    }

    size();
    let rt = 0;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(size, 120); }).observe(box);
    let visible = true;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; play(visible && !document.hidden); }).observe(box);
    document.addEventListener('visibilitychange', () => play(visible && !document.hidden));
  }

  // ── Contents rail: mark the section being read ──────────────────────────
  const links = new Map();
  document.querySelectorAll('.toc a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
  if (links.size && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('on'));
        const a = links.get(e.target.id);
        if (a) a.classList.add('on');
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    // Back at the top, nothing is marked.
    const hero = document.querySelector('.of .hero');
    if (hero) new IntersectionObserver((es) => { if (es[0].isIntersecting) links.forEach((a) => a.classList.remove('on')); }, { rootMargin: '-35% 0px -60% 0px' }).observe(hero);
  }

  // ── Figures ease in once ────────────────────────────────────────────────
  if (!still && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal');
    const ro = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.of :is(.diagram,.chart,.map,.bars,.win.run)').forEach((el) => ro.observe(el));
  }
})();
