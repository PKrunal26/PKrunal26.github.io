// Machine learning for CFD: every figure except the 3D hero (hero3d.js).
// Data comes from media/*.json and the 8-bit atlases built by scripts/cfd-ml-figures.py.
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
  const PLANES = ['b1', 'a1', 'a5', 'a9'];
  const NAMES = { b1: '1D before', a1: '1D after', a5: '5D after', a9: '9D after', in: 'Inlet' };
  const sup = (n) => String(n).replace(/-/g, '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  const sci = (v, p = 1) => { const e = Math.floor(Math.log10(Math.abs(v))); return `${(v / 10 ** e).toFixed(p)} × 10${sup(e)}`; };

  function once(node, fn, margin = '300px') {
    if (!node) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
    io.observe(node);
  }
  const themeSubs = [];
  new MutationObserver(() => themeSubs.forEach((f) => f())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => themeSubs.forEach((f) => f()));

  // ── Colour maps ─────────────────────────────────────────────────────────
  const JET = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 254, c = (x) => clamp(1.5 - Math.abs(4 * t - x), 0, 1) * 255;
    JET.set([c(3), c(2), c(1)], i * 3);
  }
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  function ramp(stops) {
    const s = stops.map(([t, h]) => [t, hex(h)]);
    return (t) => {
      t = clamp(t, 0, 1);
      let i = 0; while (i < s.length - 2 && t > s[i + 1][0]) i++;
      const [t0, a] = s[i], [t1, b] = s[i + 1], f = (t - t0) / (t1 - t0);
      return a.map((v, k) => v + (b[k] - v) * f);
    };
  }
  const DIV = ramp([[0, '#24418f'], [0.3, '#7d97cf'], [0.5, '#f4efe4'], [0.7, '#f0a06a'], [1, '#c2410c']]);

  // ── Phones: wide figures scroll sideways with a visible bar ─────────────
  function hscroll(box) {
    const bar = document.createElement('div');
    bar.className = 'hs-bar';
    bar.setAttribute('aria-hidden', 'true');
    const thumb = document.createElement('i');
    bar.append(thumb);
    box.after(bar);
    const sync = () => {
      const over = box.scrollWidth - box.clientWidth;
      box.classList.toggle('wide', over > 1);
      if (over <= 1) return;
      const r = box.clientWidth / box.scrollWidth, p = box.scrollLeft / over;
      thumb.style.width = `${r * 100}%`;
      thumb.style.transform = `translateX(${(p * (1 - r) / r) * 100}%)`;
      box.classList.toggle('at-start', p < 0.01);
      box.classList.toggle('at-end', p > 0.99);
    };
    box.addEventListener('scroll', sync, { passive: true });
    new ResizeObserver(sync).observe(box);
    bar.addEventListener('pointerdown', (e) => {
      const rect = bar.getBoundingClientRect();
      const over = box.scrollWidth - box.clientWidth, tw = rect.width * (box.clientWidth / box.scrollWidth);
      let grab = e.clientX - rect.left - (box.scrollLeft / over) * (rect.width - tw);
      if (grab < 0 || grab > tw) grab = tw / 2;
      const move = (ev) => { box.scrollLeft = ((ev.clientX - rect.left - grab) / (rect.width - tw)) * over; };
      move(e);
      bar.setPointerCapture(e.pointerId);
      bar.onpointermove = move;
      bar.onpointerup = bar.onpointercancel = () => { bar.onpointermove = null; };
    });
  }
  $$('.diagram > svg, .chart > svg, .forces-fig > svg, .sb-fig > svg, .cm-iso .iso-stage > svg').forEach((el) => {
    const box = document.createElement('div');
    box.className = 'hs';
    el.before(box);
    box.append(el);
    hscroll(box);
  });
  const stripScroll = $('.strip-scroll');
  if (stripScroll) { stripScroll.classList.add('hs', 'strip-hs'); hscroll(stripScroll); }
  $$('.tbl-wrap, .feat, .eq-m').forEach((el) => { el.classList.add('hs', 'hs-own'); hscroll(el); });
  // the geometry is mostly empty corner on the left; start phones on the bend
  // on phones, open the wide drawings on the part that matters
  [['#geo .hs', 1], ['.forces-fig .hs', 0.6], ['.cm-iso[data-fig="bench"] .hs', 0.55], ['.cm-iso[data-fig="dean"] .hs', 0.6]].forEach(([sel, f]) => {
    const box = $(sel);
    if (box) requestAnimationFrame(() => { box.scrollLeft = (box.scrollWidth - box.clientWidth) * f; });
  });
  // equations start closed, so measure their scrollers again when opened
  $$('details.maths').forEach((d) => d.addEventListener('toggle', () => $$('.eq-m', d).forEach((el) => el.dispatchEvent(new Event('scroll')))));

  // ── Contents rail ───────────────────────────────────────────────────────
  const tocLinks = $$('.toc a');
  if (tocLinks.length) {
    const map = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        tocLinks.forEach((a) => a.classList.remove('on'));
        map.get(e.target.id)?.classList.add('on');
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ── Geometry: find a sample plane ───────────────────────────────────────
  const geo = $('#geo');
  if (geo) {
    $$('.d-pl', geo).forEach((g) => {
      g.style.cursor = 'pointer';
      g.addEventListener('pointerenter', () => { geo.dataset.hl = g.dataset.pl; g.classList.add('on'); });
      g.addEventListener('pointerleave', () => { delete geo.dataset.hl; g.classList.remove('on'); });
    });
  }

  // ── Shared readout helper for SVG charts ────────────────────────────────
  function readout(chart) {
    const r = document.createElement('div');
    r.className = 'readout';
    r.hidden = true;
    chart.append(r);
    return {
      show(html, clientX) {
        r.innerHTML = html;
        r.hidden = false;
        const box = chart.getBoundingClientRect(), x = clientX - box.left;
        const right = x > box.width * 0.6;
        r.style.left = `${x}px`;
        r.style.transform = `translateX(${right ? 'calc(-100% - 16px)' : '16px'})`;
      },
      hide() { r.hidden = true; },
    };
  }
  const svgX = (svg, clientX) => { const p = svg.createSVGPoint(); p.x = clientX; p.y = 0; return p.matrixTransform(svg.getScreenCTM().inverse()).x; };
  function keys(ul, chart, items) {
    if (!ul) return;
    items.forEach(([k, label]) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'true');
      b.innerHTML = `<i style="--c:var(--s-${k})"></i>${label}`;
      b.addEventListener('click', () => {
        const off = new Set((chart.dataset.off || '').split(' ').filter(Boolean));
        if (off.has(k)) off.delete(k); else off.add(k);
        chart.dataset.off = [...off].join(' ');
        b.setAttribute('aria-pressed', String(!off.has(k)));
      });
      li.append(b);
      ul.append(li);
    });
  }
  function axes(svg, { W, H, L, R, T, B, x, y, xt, yt, xl, yl }) {
    const g = svgEl('g', {}, svg);
    yt.forEach(([v, s]) => {
      svgEl('line', { class: 'c-grid', x1: L, x2: W - R, y1: y(v), y2: y(v) }, g);
      svgEl('text', { class: 'c-tick', x: L - 10, y: y(v) + 4, 'text-anchor': 'end' }, g).textContent = s;
    });
    xt.forEach(([v, s]) => {
      svgEl('line', { class: 'c-axis', x1: x(v), x2: x(v), y1: H - B, y2: H - B + 5 }, g);
      svgEl('text', { class: 'c-tick', x: x(v), y: H - B + 20, 'text-anchor': 'middle' }, g).textContent = s;
    });
    svgEl('line', { class: 'c-axis', x1: L, x2: W - R, y1: H - B, y2: H - B }, g);
    if (xl) svgEl('text', { class: 'c-lab', x: (L + W - R) / 2, y: H - 6, 'text-anchor': 'middle' }, g).textContent = xl;
    if (yl) svgEl('text', { class: 'c-lab', x: 14, y: (T + H - B) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(T + H - B) / 2})` }, g).textContent = yl;
    return g;
  }

  // ── Data ────────────────────────────────────────────────────────────────
  let flowP = null;
  const flow = () => (flowP ||= fetch('media/flow.json').then((r) => r.json()));
  let psdP = null;
  const psd = () => (psdP ||= fetch('media/psd.json').then((r) => r.json()));
  function atlas(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data, out = new Uint8Array(c.width * c.height);
        for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
        res({ w: c.width, h: c.height, a: out });
      };
      img.onerror = rej;
      img.src = src;
    });
  }

  // ── Shared time: index into the 41 saved steps (1 = 0.05 s, 40 = 2.00 s) ─
  const Time = {
    k: 1, subs: [], playing: false, raf: 0,
    set(k) { this.k = clamp(k, 1, 40); this.subs.forEach((f) => f(this.k)); },
    on(f) { this.subs.push(f); f(this.k); },
    toggle() {
      if (this.playing) return this.stop();
      if (this.k >= 39.99) this.set(1);
      this.playing = true;
      let last = performance.now();
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        this.set(this.k + dt * 5.5);
        if (this.k >= 40) return this.stop();
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
      this.playSubs.forEach((f) => f(true));
    },
    stop() { this.playing = false; cancelAnimationFrame(this.raf); this.playSubs.forEach((f) => f(false)); },
    playSubs: [],
  };
  const PLAY = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z"/></svg>';
  const PAUSE = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48V208a16,16,0,0,1-16,16H160a16,16,0,0,1-16-16V48a16,16,0,0,1,16-16h40A16,16,0,0,1,216,48ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Z"/></svg>';
  function scrubber(box) {
    if (!box) return;
    box.innerHTML = `<button class="play" type="button" aria-label="Play">${PLAY}</button>
      <div class="track" role="slider" tabindex="0" aria-label="Time" aria-valuemin="0.05" aria-valuemax="2" aria-valuenow="0.05">
        <i class="train"></i><i class="fill"></i><i class="knob"></i>
        ${[0, 0.5, 1, 1.5, 2].map((t) => `<span class="tk" style="left:${(t / 2) * 100}%">${t.toFixed(1)}</span>`).join('')}
      </div>
      <div class="tread"><span>0.05 s</span><small>train</small></div>`;
    const btn = $('.play', box), track = $('.track', box), knob = $('.knob', box), fill = $('.fill', box), read = $('.tread span', box), tag = $('.tread small', box);
    $('.train', box).style.width = `${(1.5 / 2) * 100}%`;
    btn.addEventListener('click', () => Time.toggle());
    Time.playSubs.push((on) => { btn.innerHTML = on ? PAUSE : PLAY; btn.setAttribute('aria-label', on ? 'Pause' : 'Play'); });
    const fromX = (cx) => { const r = track.getBoundingClientRect(); return clamp(((cx - r.left) / r.width) * 40, 1, 40); };
    track.addEventListener('pointerdown', (e) => {
      Time.stop();
      track.setPointerCapture(e.pointerId);
      Time.set(fromX(e.clientX));
      track.onpointermove = (ev) => Time.set(fromX(ev.clientX));
      track.onpointerup = track.onpointercancel = () => { track.onpointermove = null; Time.set(Math.round(Time.k)); };
    });
    track.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!d) return;
      e.preventDefault(); Time.stop(); Time.set(Math.round(Time.k) + d);
    });
    Time.on((k) => {
      const p = (k / 40) * 100;
      knob.style.left = `${p}%`;
      fill.style.width = `${p}%`;
      const t = Math.round(k) * 0.05;
      read.textContent = `${t.toFixed(2)} s`;
      tag.textContent = t <= 1.5 + 1e-9 ? 'train' : 'test';
      track.setAttribute('aria-valuenow', t.toFixed(2));
    });
  }

  // ── Flow: unrolled mid-plane and the four sample planes ─────────────────
  const flowFig = $('#flowfig');
  once(flowFig, async () => {
    const [F, S, D] = await Promise.all([flow(), atlas('media/strip.png'), atlas('media/discs.png')]);
    const SN = F.strip.s, NN = F.strip.n, LEN = F.strip.length, N = F.discs.n;
    const strip = $('#strip'), sctx = strip.getContext('2d');
    const sOff = document.createElement('canvas'); sOff.width = SN; sOff.height = NN;
    const sImg = sOff.getContext('2d').createImageData(SN, NN);
    const probe = $('#flow-probe');
    const axis = $('#strip-axis');
    const marks = [[0, 'inlet'], [F.strip.stations.b1, '1D before', 'b1'], [0.4 + (Math.PI * 0.06) / 4, 'bend'], [F.strip.stations.a1, '1D after', 'a1'], [F.strip.stations.a5, '5D', 'a5'], [F.strip.stations.a9, '9D', 'a9']];
    axis.innerHTML = marks.map(([s, l, k]) => `<span class="${k ? 'st' : ''}" style="left:${(s / LEN) * 100}%;${k ? `color:var(--s-${k})` : ''};${s === 0 ? 'transform:none' : s === LEN ? 'transform:translateX(-100%)' : ''}">${l}</span>`).join('');

    // Discs
    const discBox = $('#discs');
    const discs = PLANES.map((id, i) => {
      const d = document.createElement('div');
      d.className = 'disc';
      d.innerHTML = `<canvas aria-label="Water speed on the ${NAMES[id]} plane"></canvas><p><span style="color:var(--strong);font:inherit"><i class="dot" style="--c:var(--s-${id})"></i>${NAMES[id]}</span><span class="pk"></span></p>`;
      discBox.append(d);
      const off = document.createElement('canvas'); off.width = N; off.height = N;
      return { id, i, el: d, cv: $('canvas', d), off, img: off.getContext('2d').createImageData(N, N), pk: $('.pk', d), flip: id === 'b1' };
    });
    const VU = F.vectors.u, VV = F.vectors.v;

    function sizeCanvas(cv, aspect) {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(w / aspect);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      return [w, h, dpr];
    }

    let cur = 1;
    function draw(k) {
      cur = k;
      const k0 = Math.floor(k), k1 = Math.min(40, k0 + 1), f = k - k0;
      // strip
      const sd = sImg.data;
      for (let y = 0; y < NN; y++) for (let x = 0; x < SN; x++) {
        const a = S.a[(k0 * NN + y) * SN + x], b = S.a[(k1 * NN + y) * SN + x];
        const v = Math.round(a + (b - a) * f), o = (y * SN + x) * 4;
        sd[o] = JET[v * 3]; sd[o + 1] = JET[v * 3 + 1]; sd[o + 2] = JET[v * 3 + 2]; sd[o + 3] = 255;
      }
      sOff.getContext('2d').putImageData(sImg, 0, 0);
      const [W, H, dpr] = sizeCanvas(strip, LEN / (0.04 * 4));
      sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
      sctx.clearRect(0, 0, W, H);
      sctx.drawImage(sOff, 0, 0, W, H);
      sctx.save();
      sctx.setLineDash([4 * dpr, 4 * dpr]);
      sctx.lineWidth = 1.25 * dpr;
      sctx.strokeStyle = 'rgba(255,255,255,.85)';
      PLANES.forEach((id) => { const x = (F.strip.stations[id] / LEN) * W; sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, H); sctx.stroke(); });
      sctx.setLineDash([]);
      sctx.strokeStyle = 'rgba(12,12,51,.35)';
      [0.4, 0.4 + (Math.PI / 2) * 0.06].forEach((s) => { const x = (s / LEN) * W; sctx.beginPath(); sctx.moveTo(x, 0); sctx.lineTo(x, 6 * dpr); sctx.moveTo(x, H - 6 * dpr); sctx.lineTo(x, H); sctx.stroke(); });
      sctx.restore();
      $('#strip-time').textContent = `t = ${(Math.round(k) * 0.05).toFixed(2)} s`;
      // discs
      discs.forEach((d) => {
        const px = d.img.data;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const sy = d.flip ? N - 1 - y : y;
          const a = D.a[(d.i * N + sy) * D.w + k0 * N + x], b = D.a[(d.i * N + sy) * D.w + k1 * N + x], o = (y * N + x) * 4;
          if (a === 255 || b === 255) { px[o + 3] = 0; continue; }
          const v = Math.round(a + (b - a) * f);
          px[o] = JET[v * 3]; px[o + 1] = JET[v * 3 + 1]; px[o + 2] = JET[v * 3 + 2]; px[o + 3] = 255;
        }
        d.off.getContext('2d').putImageData(d.img, 0, 0);
        const [w, , dpr] = sizeCanvas(d.cv, 1), c = d.cv.getContext('2d');
        c.clearRect(0, 0, w, w);
        c.save();
        c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2); c.clip();
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(d.off, 0, 0, w, w);
        c.restore();
        c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2);
        c.lineWidth = 1.5 * dpr; c.strokeStyle = cssVar('--strong'); c.globalAlpha = 0.6; c.stroke(); c.globalAlpha = 1;
        // secondary-flow arrows
        const va = F.vectors.data[d.id][k0], vb = F.vectors.data[d.id][k1];
        const sp = w * 0.1, sc = (sp * 1.5) / 0.2;
        c.strokeStyle = 'rgba(12,12,51,.82)'; c.fillStyle = 'rgba(12,12,51,.82)'; c.lineWidth = 1.3 * dpr; c.lineCap = 'round';
        for (let j = 0; j < VU.length; j++) {
          let u = va[2 * j] + (vb[2 * j] - va[2 * j]) * f, v = va[2 * j + 1] + (vb[2 * j + 1] - va[2 * j + 1]) * f;
          let py = VV[j];
          if (d.flip) { v = -v; py = -py; }
          const m = Math.hypot(u, v);
          if (m < 0.004) continue;
          const x0 = ((VU[j] + 0.02) / 0.04) * w, y0 = ((0.02 - py) / 0.04) * w;
          const L = Math.min(m * sc, sp * 1.6), ux = u / m, uy = -v / m;
          const x1 = x0 + ux * L, y1 = y0 + uy * L, hs = Math.min(4 * dpr, L * 0.45);
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
          c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - ux * hs - uy * hs * 0.6, y1 - uy * hs + ux * hs * 0.6); c.lineTo(x1 - ux * hs + uy * hs * 0.6, y1 - uy * hs - ux * hs * 0.6); c.closePath(); c.fill();
        }
        const pk = F.peak[d.id][k0] + (F.peak[d.id][k1] - F.peak[d.id][k0]) * f;
        d.pk.textContent = `peak ${pk.toFixed(2)} m/s`;
      });
    }
    let queued = false;
    Time.on((k) => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; draw(Time.k); }); } });
    new ResizeObserver(() => draw(cur)).observe(strip);
    themeSubs.push(() => draw(cur));

    // probes
    const showProbe = (html, clientX, clientY) => {
      const box = flowFig.getBoundingClientRect();
      probe.innerHTML = html;
      probe.classList.add('on');
      const x = clientX - box.left, y = clientY - box.top, right = x > box.width * 0.65;
      probe.style.transform = `translate(${right ? `calc(${x - 14}px - 100%)` : `${x + 14}px`}, ${y + 14}px)`;
    };
    const hide = () => probe.classList.remove('on');
    const at = (src, rowW, k, idx) => { const k0 = Math.floor(k), k1 = Math.min(40, k0 + 1), f = k - k0; const a = src.a[idx(k0)], b = src.a[idx(k1)]; return a === 255 || b === 255 ? null : ((a + (b - a) * f) / 254) * F.vmax; };
    strip.addEventListener('pointermove', (e) => {
      const r = strip.getBoundingClientRect();
      const sx = clamp(Math.floor(((e.clientX - r.left) / r.width) * SN), 0, SN - 1), ny = clamp(Math.floor(((e.clientY - r.top) / r.height) * NN), 0, NN - 1);
      const v = at(S, SN, cur, (k) => (k * NN + ny) * SN + sx);
      const s = ((sx + 0.5) / SN) * LEN * 1000, n = ((ny + 0.5) / NN) * 40 - 20;
      const where = s < 400 ? 'horizontal leg' : s < 494 ? 'bend' : 'vertical leg';
      showProbe(`<b>|U| ${v.toFixed(3)} m/s</b><br>${Math.round(s)} mm along, ${where}<br>${Math.abs(n).toFixed(0)} mm toward the ${n < 0 ? 'inner' : 'outer'} wall`, e.clientX, e.clientY);
    });
    strip.addEventListener('pointerleave', hide);
    discs.forEach((d) => {
      d.cv.addEventListener('pointermove', (e) => {
        const r = d.cv.getBoundingClientRect();
        const x = clamp(Math.floor(((e.clientX - r.left) / r.width) * N), 0, N - 1);
        let y = clamp(Math.floor(((e.clientY - r.top) / r.height) * N), 0, N - 1);
        const sy = d.flip ? N - 1 - y : y;
        const v = at(D, D.w, cur, (k) => (d.i * N + sy) * D.w + k * N + x);
        if (v == null) return hide();
        const vv = (0.02 - ((y + 0.5) / N) * 0.04) * 1000;
        showProbe(`<b>|U| ${v.toFixed(3)} m/s</b><br>${NAMES[d.id]}<br>${Math.abs(vv).toFixed(0)} mm toward the ${vv > 0 ? 'outer' : 'inner'} wall`, e.clientX, e.clientY);
      });
      d.cv.addEventListener('pointerleave', hide);
    });

    // first look: play the run once
    if (!still) once(flowFig, () => setTimeout(() => { if (!Time.playing && Time.k === 1) Time.toggle(); }, 400), '-30%');
  }, '400px');
  scrubber($('#flow-scrub'));
  scrubber($('#prof-scrub'));

  // ── Profiles ────────────────────────────────────────────────────────────
  const profFig = $('#prof');
  once(profFig, async () => {
    const F = await flow();
    const svg = $('svg', profFig), W = 960, H = 400, L = 64, R = 24, T = 20, B = 52;
    const s = F.profiles.s.map((v) => v / 0.02);
    const x = (v) => L + ((v + 1) / 2) * (W - L - R), y = (v) => T + (1 - v / 0.7) * (H - T - B);
    axes(svg, { W, H, L, R, T, B, x, y, xt: [[-1, 'inner wall'], [-0.5, '−0.5'], [0, 'centre'], [0.5, '0.5'], [1, 'outer wall']], yt: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((v) => [v, v.toFixed(1)]), xl: 'Position across the pipe, r / R', yl: '|U|, m/s' });
    const lines = PLANES.map((id) => svgEl('path', { class: `c-line s-${id}`, stroke: `var(--s-${id})` }, svg));
    const hov = svgEl('g', { opacity: 0 }, svg), cross = svgEl('line', { class: 'c-cross', y1: T, y2: H - B }, hov);
    const dots = PLANES.map((id) => svgEl('circle', { class: `c-dot s-${id}`, r: 4.5, fill: `var(--s-${id})` }, hov));
    keys($('#prof-keys'), profFig, PLANES.map((id) => [id, NAMES[id]]));
    const ro = readout(profFig);
    let vals = null, hoverX = null;
    const at = (id, k) => { const k0 = Math.floor(k), k1 = Math.min(40, k0 + 1), f = k - k0, a = F.profiles.data[id][k0], b = F.profiles.data[id][k1]; return a.map((v, i) => v + (b[i] - v) * f); };
    function draw(k) {
      vals = Object.fromEntries(PLANES.map((id) => [id, at(id, k)]));
      PLANES.forEach((id, j) => lines[j].setAttribute('d', vals[id].map((v, i) => `${i ? 'L' : 'M'}${x(s[i]).toFixed(1)} ${y(v).toFixed(1)}`).join('')));
      if (hoverX != null) hover(hoverX);
    }
    function hover(clientX) {
      hoverX = clientX;
      const xv = clamp(((svgX(svg, clientX) - L) / (W - L - R)) * 2 - 1, -1, 1), i = Math.round(((xv + 1) / 2) * (s.length - 1));
      cross.setAttribute('x1', x(s[i])); cross.setAttribute('x2', x(s[i]));
      PLANES.forEach((id, j) => { dots[j].setAttribute('cx', x(s[i])); dots[j].setAttribute('cy', y(vals[id][i])); });
      hov.setAttribute('opacity', 1);
      ro.show(`<b>${s[i] === 0 ? 'Centre' : `${Math.abs(s[i] * 20).toFixed(0)} mm toward the ${s[i] < 0 ? 'inner' : 'outer'} wall`} · t = ${(Math.round(Time.k) * 0.05).toFixed(2)} s</b>${PLANES.map((id) => `<span><i style="--c:var(--s-${id})"></i>${NAMES[id]}<em>${vals[id][i].toFixed(3)} m/s</em></span>`).join('')}`, clientX);
    }
    svg.addEventListener('pointermove', (e) => hover(e.clientX));
    svg.addEventListener('pointerleave', () => { hoverX = null; hov.setAttribute('opacity', 0); ro.hide(); });
    Time.on(draw);
  });

  // ── Train and test ──────────────────────────────────────────────────────
  const splitFig = $('#splitc');
  once(splitFig, async () => {
    const F = await flow();
    const svg = $('svg', splitFig), W = 960, H = 380, L = 64, R = 24, T = 28, B = 52, lo = 0.48, hi = 0.64;
    const x = (t) => L + (t / 2) * (W - L - R), y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    svgEl('rect', { class: 'c-test', x: x(1.5), y: T - 20, width: x(2) - x(1.5), height: H - B - T + 20 }, svg);
    axes(svg, { W, H, L, R, T, B, x, y, xt: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((t) => [t, t.toFixed(2)]), yt: [0.48, 0.52, 0.56, 0.6, 0.64].map((v) => [v, v.toFixed(2)]), xl: 'Time, s', yl: 'Peak |U|, m/s' });
    svgEl('text', { class: 'c-lab', x: x(0.05), y: T - 6 }, svg).textContent = 'Train · 0 to 1.50 s';
    svgEl('text', { class: 'c-lab', x: x(1.52), y: T - 6, style: 'fill:var(--strong)' }, svg).textContent = 'Test · 1.55 to 2.00 s';
    const ts = F.times.slice(1);
    PLANES.forEach((id) => {
      const v = F.peak[id].slice(1);
      svgEl('path', { class: `c-line s-${id}`, stroke: `var(--s-${id})`, d: v.map((p, i) => `${i ? 'L' : 'M'}${x(ts[i]).toFixed(1)} ${y(p).toFixed(1)}`).join('') }, svg);
      v.forEach((p, i) => { if (ts[i] > 1.5) svgEl('circle', { class: `s-${id}`, cx: x(ts[i]), cy: y(p), r: 3, fill: `var(--s-${id})` }, svg); });
    });
    const now = svgEl('line', { class: 'c-cross', y1: T - 20, y2: H - B, style: 'opacity:.35;stroke-dasharray:none' }, svg);
    Time.on((k) => { now.setAttribute('x1', x(k * 0.05)); now.setAttribute('x2', x(k * 0.05)); });
    const hov = svgEl('g', { opacity: 0 }, svg), cross = svgEl('line', { class: 'c-cross', y1: T, y2: H - B }, hov);
    const dots = PLANES.map((id) => svgEl('circle', { class: `c-dot s-${id}`, r: 4.5, fill: `var(--s-${id})` }, hov));
    keys($('#split-keys'), splitFig, PLANES.map((id) => [id, NAMES[id]]));
    const ro = readout(splitFig);
    svg.addEventListener('pointermove', (e) => {
      const t = clamp(((svgX(svg, e.clientX) - L) / (W - L - R)) * 2, 0.05, 2), k = Math.round(t / 0.05);
      cross.setAttribute('x1', x(k * 0.05)); cross.setAttribute('x2', x(k * 0.05));
      PLANES.forEach((id, j) => { dots[j].setAttribute('cx', x(k * 0.05)); dots[j].setAttribute('cy', y(F.peak[id][k])); });
      hov.setAttribute('opacity', 1);
      ro.show(`<b>t = ${(k * 0.05).toFixed(2)} s · ${k * 0.05 <= 1.5 + 1e-9 ? 'train' : 'test'}</b>${PLANES.map((id) => `<span><i style="--c:var(--s-${id})"></i>${NAMES[id]}<em>${F.peak[id][k].toFixed(3)} m/s</em></span>`).join('')}`, e.clientX);
    });
    svg.addEventListener('pointerleave', () => { hov.setAttribute('opacity', 0); ro.hide(); });
  });

  // ── Particles: the 30 size classes ──────────────────────────────────────
  const classes = $('#classes');
  if (classes) psd().then((P) => {
    const tot = P.inlet.reduce((a, b) => a + b, 0), read = $('#classes-read');
    const show = (i) => {
      $$('button', classes).forEach((b, j) => b.classList.toggle('on', j === i));
      read.innerHTML = `<span>Class <b>${i + 1}</b> of 30</span><span><b>${P.d[i] < 10 ? P.d[i].toFixed(2) : P.d[i].toFixed(1)} µm</b></span><span><b>${((P.inlet[i] / tot) * 100).toFixed(1)}%</b> of particle volume at the inlet</span>`;
    };
    P.d.forEach((d, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<i style="--s:${(i / 29).toFixed(3)}"></i><b>${i % 5 === 0 || i === 29 ? (d < 10 ? d.toFixed(0) : Math.round(d)) : ''}</b>`;
      b.setAttribute('aria-label', `Class ${i + 1}, ${d.toFixed(1)} micrometres`);
      b.addEventListener('pointerenter', () => show(i));
      b.addEventListener('focus', () => show(i));
      b.addEventListener('click', () => show(i));
      classes.append(b);
    });
    show(P.inlet.indexOf(Math.max(...P.inlet)));
    const ref = $('#classes-ref');
    if (ref) ref.innerHTML = [[1, 'Bacterium, 1 µm', 'Bacterium'], [7, 'Red blood cell, 7 µm', 'Blood cell'], [70, 'Width of a hair, 70 µm', 'Hair'], [250, 'Fine sand, 250 µm', 'Sand']].map(([d, l, sh], i, a) => {
      const pos = ((29 * Math.log(d)) / Math.log(250) + 0.5) / 30;
      return `<span class="${i === 0 ? 'first' : i === a.length - 1 ? 'last' : ''}" style="left:${i === 0 ? 0 : i === a.length - 1 ? 100 : pos * 100}%"><b class="lg">${l}</b><b class="sm">${sh}</b></span>`;
    }).join('');
  });

  // ── Size distribution chart ─────────────────────────────────────────────
  const psdFig = $('#psd');
  once(psdFig, async () => {
    const P = await psd();
    const svg = $('svg', psdFig), W = 960, H = 420, L = 64, R = 24, T = 16, B = 52;
    const lx = Math.log10(250), x = (d) => L + (Math.log10(d) / lx) * (W - L - R), y = (v) => T + (1 - v / 0.1) * (H - T - B);
    axes(svg, { W, H, L, R, T, B, x, y, xt: [1, 2, 5, 10, 20, 50, 100, 250].map((d) => [d, String(d)]), yt: [0, 0.02, 0.04, 0.06, 0.08, 0.1].map((v) => [v, v.toFixed(2)]), xl: 'Particle diameter, µm (log scale)', yl: 'Volumetric density' });
    const S = [['in', 'inlet', 'Inlet'], ['a1', 'L1', '1D after'], ['a5', 'L5', '5D after'], ['a9', 'L9', '9D after']];
    S.forEach(([k, key]) => {
      svgEl('path', { class: `c-line s-${k}`, stroke: `var(--s-${k})`, d: P[key].map((v, i) => `${i ? 'L' : 'M'}${x(P.d[i]).toFixed(1)} ${y(v).toFixed(1)}`).join('') }, svg);
      P[key].forEach((v, i) => svgEl('circle', { class: `s-${k}`, cx: x(P.d[i]), cy: y(v), r: 2.6, fill: `var(--s-${k})` }, svg));
    });
    keys($('#psd-keys'), psdFig, S.map(([k, , n]) => [k, n]));
    const hov = svgEl('g', { opacity: 0 }, svg), cross = svgEl('line', { class: 'c-cross', y1: T, y2: H - B }, hov);
    const dots = S.map(([k]) => svgEl('circle', { class: `c-dot s-${k}`, r: 5, fill: `var(--s-${k})` }, hov));
    const ro = readout(psdFig);
    svg.addEventListener('pointermove', (e) => {
      const lv = ((svgX(svg, e.clientX) - L) / (W - L - R)) * lx, i = clamp(Math.round((lv / lx) * 29), 0, 29);
      cross.setAttribute('x1', x(P.d[i])); cross.setAttribute('x2', x(P.d[i]));
      S.forEach(([, key], j) => { dots[j].setAttribute('cx', x(P.d[i])); dots[j].setAttribute('cy', y(P[key][i])); });
      hov.setAttribute('opacity', 1);
      ro.show(`<b>Class ${i + 1} · ${P.d[i] < 10 ? P.d[i].toFixed(2) : P.d[i].toFixed(1)} µm</b>${S.map(([k, key, n]) => `<span><i style="--c:var(--s-${k})"></i>${n}<em>${P[key][i].toFixed(4)}</em></span>`).join('')}`, e.clientX);
    });
    svg.addEventListener('pointerleave', () => { hov.setAttribute('opacity', 0); ro.hide(); });
  });

  // ── Aggregation and breakage kernels ────────────────────────────────────
  const agg = $('#agg');
  if (agg) psd().then((P) => {
    const d = P.d, n = 30, ctx = agg.getContext('2d'), img = ctx.createImageData(n, n);
    const max = Math.log10(((d[29] + d[29]) / 2) ** 3);
    function paint() {
      const dark = cssVar('--bg').toLowerCase() !== '#f4f1e9';
      const R = ramp(dark ? [[0, '#211d16'], [0.35, '#6b4a1f'], [0.6, '#c97d2c'], [0.8, '#f8b971'], [1, '#fbe7b5']] : [[0, '#fbf6e9'], [0.35, '#f5dc99'], [0.6, '#f8b971'], [0.8, '#fc944e'], [1, '#9a3412']]);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const i = n - 1 - r, v = Math.log10(((d[i] + d[c]) / 2) ** 3) / max, col = R(v), o = (r * n + c) * 4;
        img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    paint();
    themeSubs.push(paint);
    const read = $('#agg-read'), f = (v) => (v < 10 ? v.toFixed(1) : Math.round(v));
    agg.addEventListener('pointermove', (e) => {
      const r = agg.getBoundingClientRect(), c = clamp(Math.floor(((e.clientX - r.left) / r.width) * n), 0, n - 1), i = n - 1 - clamp(Math.floor(((e.clientY - r.top) / r.height) * n), 0, n - 1);
      const ratio = ((d[i] + d[c]) / 2) ** 3;
      read.innerHTML = `<b>${f(d[c])} µm and ${f(d[i])} µm</b> stick ${ratio < 1000 ? `${ratio.toFixed(ratio < 10 ? 1 : 0)} times` : `${sci(ratio)} times`} as fast as two 1 µm particles.`;
    });
    agg.addEventListener('pointerleave', () => { read.textContent = 'Hover a cell.'; });
  });
  const brk = $('#brk');
  if (brk) {
    const svg = $('svg', brk), W = 520, H = 380, L = 56, R = 16, T = 16, B = 52;
    const x = (r) => L + ((Math.log10(r) + 1) / 2) * (W - L - R), y = (v) => T + (1 - v) * (H - T - B);
    axes(svg, { W, H, L, R, T, B, x, y, xt: [[0.1, '0.1'], [0.3, '0.3'], [1, '1'], [3, '3'], [10, '10']], yt: [0, 0.25, 0.5, 0.75, 1].map((v) => [v, `${v * 100}%`]), xl: 'ε / ε_cr (log scale)', yl: 'Rate, share of limit' });
    const pts = []; for (let i = 0; i <= 200; i++) { const r = 10 ** (-1 + (2 * i) / 200); pts.push([r, Math.exp(-1 / r)]); }
    svgEl('path', { class: 'c-line', stroke: 'var(--acc)', d: pts.map(([r, v], i) => `${i ? 'L' : 'M'}${x(r).toFixed(1)} ${y(v).toFixed(1)}`).join('') }, svg);
    svgEl('line', { class: 'c-cross', x1: x(1), x2: x(1), y1: T, y2: H - B, style: 'opacity:.3' }, svg);
    const dot = svgEl('circle', { class: 'c-dot', r: 5.5, fill: 'var(--acc)', opacity: 0 }, svg), read = $('#brk-read');
    svg.addEventListener('pointermove', (e) => {
      const r = 10 ** clamp(((svgX(svg, e.clientX) - L) / (W - L - R)) * 2 - 1, -1, 1), v = Math.exp(-1 / r);
      dot.setAttribute('cx', x(r)); dot.setAttribute('cy', y(v)); dot.setAttribute('opacity', 1);
      read.innerHTML = `At <b>ε = ${r < 1 ? r.toFixed(2) : r.toFixed(1)} ε<sub>cr</sub></b>, breakage runs at <b>${(v * 100).toFixed(v < 0.01 ? 2 : 0)}%</b> of its limit.`;
    });
    svg.addEventListener('pointerleave', () => { dot.setAttribute('opacity', 0); read.textContent = 'Hover the curve.'; });
  }

  // ── Features: one row per sample plane, real values ─────────────────────
  const feat = $('#feat');
  if (feat) flow().then((F) => {
    let target = 0, tsel = 0.8;
    const comp = ['Ux', 'Uy', 'Uz'];
    const v = (x) => (x >= 0 ? ' ' : '') + x.toFixed(4);
    function render() {
      const k = Math.round(tsel / 0.05), others = [0, 1, 2].filter((c) => c !== target);
      const col = (cls, head, vals, note, style = '') => `<div class="fcol ${cls}" style="${style}"><span class="h">${head}</span><div class="cells">${vals.map((x) => `<span>${x}</span>`).join('')}</div><span class="f">${note}</span></div>`;
      const rows = PLANES.map((id) => F.probe[id].U);
      feat.innerHTML = [
        `<div class="fcol rowlab"><span class="h">&nbsp;</span><div class="cells">${PLANES.map((id) => `<span>${NAMES[id]}</span>`).join('')}</div><span class="f">&nbsp;</span></div>`,
        col('target', `${comp[target]}<sup>t</sup>`, rows.map((U) => v(U[k][target])), 'Target'),
        '<span class="op" aria-hidden="true">=</span>',
        col('', `${comp[others[0]]}<sup>t</sup>`, rows.map((U) => v(U[k][others[0]])), 'Velocity feature'),
        col('', `${comp[others[1]]}<sup>t</sup>`, rows.map((U) => v(U[k][others[1]])), 'Velocity feature'),
        '<span class="op" aria-hidden="true">+</span>',
        col('lag', `${comp[target]}<sup>t−1</sup>`, rows.map((U) => v(U[k - 1][target])), 'Lag feature'),
        col('lag', `${comp[target]}<sup>t−2</sup>`, rows.map((U) => v(U[k - 2][target])), 'Lag feature'),
        col('lag', `${comp[target]}<sup>t−3</sup>`, rows.map((U) => v(U[k - 3][target])), 'Lag feature'),
        '<span class="op" aria-hidden="true">+</span>',
        col('opt', 'α<sub>water</sub>', PLANES.map(() => '·'), 'Optional', 'opacity:.55'),
      ].join('');
    }
    $$('#feat-target button').forEach((b) => b.addEventListener('click', () => { target = +b.dataset.k; $$('#feat-target button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); }));
    $$('#feat-time button').forEach((b) => b.addEventListener('click', () => { tsel = +b.dataset.t; $$('#feat-time button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); }));
    render();
  });

  // ── XGBoost: gradient boosting on one real profile, live ────────────────
  const boost = $('#boost');
  once(boost, async () => {
    const F = await flow();
    const k = F.times.indexOf(1.55), ys = F.profiles.data.a1[k], xs = F.profiles.s.map((v) => v / 0.02), n = xs.length;
    const M = 150, lr = 0.3, G = 400, gx = Array.from({ length: G }, (_, i) => -1 + (2 * i) / (G - 1));
    function fit(idx, r, depth) {
      const mean = idx.reduce((a, i) => a + r[i], 0) / idx.length;
      if (depth === 0 || idx.length < 2) return { v: mean };
      let best = null;
      for (let s = 1; s < idx.length; s++) {
        const L = idx.slice(0, s), R = idx.slice(s);
        const sse = (I) => { const m = I.reduce((a, i) => a + r[i], 0) / I.length; return I.reduce((a, i) => a + (r[i] - m) ** 2, 0); };
        const e = sse(L) + sse(R);
        if (!best || e < best.e) best = { e, s, t: (xs[idx[s - 1]] + xs[idx[s]]) / 2 };
      }
      return { t: best.t, l: fit(idx.slice(0, best.s), r, depth - 1), r: fit(idx.slice(best.s), r, depth - 1) };
    }
    const pred = (node, x) => (node.v !== undefined ? node.v : pred(x < node.t ? node.l : node.r, x));
    const base = ys.reduce((a, b) => a + b, 0) / n;
    const Fx = [new Array(n).fill(base)], Fg = [new Array(G).fill(base)], mse = [];
    const idx = xs.map((_, i) => i);
    for (let m = 0; m <= M; m++) {
      mse.push(ys.reduce((a, y, i) => a + (y - Fx[m][i]) ** 2, 0) / n);
      if (m === M) break;
      const r = ys.map((y, i) => y - Fx[m][i]), tree = fit(idx, r, 2);
      Fx.push(Fx[m].map((v, i) => v + lr * pred(tree, xs[i])));
      Fg.push(Fg[m].map((v, i) => v + lr * pred(tree, gx[i])));
    }
    const svg = $('svg', boost), W = 960, H = 360, L = 64, R = 24, T = 16, B = 52;
    const x = (v) => L + ((v + 1) / 2) * (W - L - R), y = (v) => T + (1 - v / 0.7) * (H - T - B);
    axes(svg, { W, H, L, R, T, B, x, y, xt: [[-1, 'inner wall'], [0, 'centre'], [1, 'outer wall']], yt: [0, 0.2, 0.4, 0.6].map((v) => [v, v.toFixed(1)]), xl: 'Position across the pipe, 1D after the bend, t = 1.55 s', yl: '|U|, m/s' });
    const model = svgEl('path', { class: 'c-line', stroke: 'var(--acc)', 'stroke-width': 2.5 }, svg);
    ys.forEach((v, i) => svgEl('circle', { cx: x(xs[i]), cy: y(v), r: 3.6, fill: 'var(--strong)' }, svg));
    const input = $('#boost-n'), read = $('#boost-read');
    function draw(m) {
      model.setAttribute('d', Fg[m].map((v, i) => `${i ? 'L' : 'M'}${x(gx[i]).toFixed(1)} ${y(clamp(v, 0, 0.7)).toFixed(1)}`).join(''));
      read.innerHTML = `<span>Trees <b>${m}</b></span><span>MSE <b>${mse[m] >= 1e-4 ? mse[m].toFixed(5) : sci(mse[m])}</b> m²/s²</span><span>${m ? `Each tree adds ${(lr * 100).toFixed(0)}% of its fit to what is left` : 'Start from the mean speed'}</span>`;
    }
    input.addEventListener('input', () => draw(+input.value));
    draw(+input.value);
    let raf = 0;
    const btn = $('#boost-play');
    btn.addEventListener('click', () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now(), dur = 6000;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), m = Math.round(M * (1 - (1 - p) ** 2.2));
        input.value = m; draw(m);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
  });

  // ── Size predictions: thesis plots per plane ────────────────────────────
  $$('#sz-tabs button').forEach((b) => b.addEventListener('click', () => {
    $$('#sz-tabs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const p = b.dataset.p;
    $('#sz-time').src = `media/psd-time-${p}.webp`;
    $('#sz-time').alt = `CFD volumetric density against diameter for every saved time step, ${NAMES[p]} the bend`;
    $('#sz-pred').src = `media/psd-pred-${p}.webp`;
    $('#sz-pred').alt = `Predicted and actual volumetric density over the test steps, ${NAMES[p]} the bend`;
  }));

  // ── Bars ────────────────────────────────────────────────────────────────
  function bars(box, rows, { log, lo, hi, ticks, fmt }) {
    if (!box) return;
    const pos = (v) => (log ? (Math.log10(v) - lo) / (hi - lo) : v / hi);
    box.innerHTML = rows.map(([k, label, v, c]) => `<div class="bar-row"><span class="k">${label}</span><span class="b"><i style="--c:${c}" data-w="${(clamp(pos(v), 0, 1) * 100).toFixed(1)}"></i></span><span class="v">${fmt(v)}</span></div>`).join('')
      + `<div class="bars-scale"><span></span><div>${ticks.map((t) => `<span>${t}</span>`).join('')}</div><span></span></div>`;
    once(box, () => $$('i[data-w]', box).forEach((i, j) => setTimeout(() => { i.style.width = `${i.dataset.w}%`; }, j * 90)), '-10%');
  }
  bars($('#sz-bars'), [['b1', '1D before', 2.609989697937207e-06, 'var(--s-b1)'], ['a1', '1D after', 5.269123776642438e-05, 'var(--s-a1)'], ['a5', '5D after', 0.00027965799864636883, 'var(--s-a5)'], ['a9', '9D after', 0.0011358807917618572, 'var(--s-a9)']],
    { log: true, lo: -7, hi: -2, ticks: [-7, -6, -5, -4, -3, -2].map((e) => `10${sup(e)}`), fmt: (v) => sci(v, 2) });
  bars($('#acc-mse'), [['ux', 'Ux', 0.0003824836318086309, 'var(--s-b1)'], ['uy', 'Uy', 0.0009411978926528672, 'var(--s-a5)'], ['uz', 'Uz', 0.004398609218795747, 'var(--s-a1)']],
    { hi: 0.005, ticks: ['0', '0.0025', '0.005'], fmt: (v) => v.toFixed(5) });
  bars($('#acc-mae'), [['ux', 'Ux', 0.01683042858577114, 'var(--s-b1)'], ['uy', 'Uy', 0.024632653013431212, 'var(--s-a5)'], ['uz', 'Uz', 0.053886809057597, 'var(--s-a1)']],
    { hi: 0.06, ticks: ['0', '0.03', '0.06'], fmt: (v) => v.toFixed(4) });

  // ── Speed ───────────────────────────────────────────────────────────────
  const speed = $('#speedfig');
  if (speed) {
    const [cfd, ml] = $$('.track2 i', speed);
    const run = () => {
      [cfd, ml].forEach((i) => { i.style.transition = 'none'; i.style.width = '0'; });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cfd.style.transition = `width ${still ? 0 : 4}s linear`; ml.style.transition = `width ${still ? 0 : 0.2}s linear`;
        cfd.style.width = '100%'; ml.style.width = '100%';
      }));
    };
    once(speed, run, '-20%');
    $('#speed-replay').addEventListener('click', run);
  }

  // ── Velocity predictions: decoded thesis figures ────────────────────────
  const cmp = $('#cmp');
  once(cmp, async () => {
    const [F, A] = await Promise.all([flow(), atlas('media/compare.png')]);
    const C = F.compare, N = C.n, stage = $('#cmp-stage'), probe = $('#cmp-probe'), statsBox = $('#cmp-stats'), note = $('#cmp-note'), legend = $('#cmp-legend');
    let plane = 1, tsel = 0, mode = 'side', wipe = 0.5;
    const val = (row, i, x, y) => { const v = A.a[(row * N + y) * A.w + i * N + x]; return v === 255 ? null : (v / 254) * F.vmax; };
    const GAP = 0.03;
    function field(row, i, flip, kind) {
      const c = document.createElement('canvas'); c.width = N; c.height = N;
      const g = c.getContext('2d'), im = g.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const sy = flip ? N - 1 - y : y, o = (y * N + x) * 4;
        let col;
        if (kind === 'gap') {
          const a = val(0, i, x, sy), b = val(1, i, x, sy);
          if (a == null || b == null) { im.data[o + 3] = 0; continue; }
          col = DIV(0.5 + (b - a) / (2 * GAP));
        } else {
          const v = A.a[(row * N + sy) * A.w + i * N + x];
          if (v === 255) { im.data[o + 3] = 0; continue; }
          col = [JET[v * 3], JET[v * 3 + 1], JET[v * 3 + 2]];
        }
        im.data[o] = col[0]; im.data[o + 1] = col[1]; im.data[o + 2] = col[2]; im.data[o + 3] = 255;
      }
      g.putImageData(im, 0, 0);
      return c;
    }
    function paint(cv, srcs) {
      const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(cv.clientWidth * dpr);
      if (cv.width !== w) { cv.width = w; cv.height = w; }
      const g = cv.getContext('2d');
      g.clearRect(0, 0, w, w);
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      srcs.forEach(([src, x0, x1]) => {
        g.save(); g.beginPath(); g.rect(x0 * w, 0, (x1 - x0) * w, w); g.clip();
        g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2); g.clip();
        g.drawImage(src, 0, 0, w, w); g.restore();
      });
      g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
      g.lineWidth = 1.5 * dpr; g.strokeStyle = cssVar('--strong'); g.globalAlpha = 0.6; g.stroke(); g.globalAlpha = 1;
    }
    let fields = null, canv = [];
    function build() {
      const i = tsel * 4 + plane, flip = plane === 0, cs = C.cases[i];
      fields = { act: field(0, i, flip), pre: field(1, i, flip), gap: field(0, i, flip, 'gap'), i, flip };
      stage.className = `cmp-stage${mode === 'side' ? '' : ' one'}`;
      const panel = (label, sub) => `<div class="cmp-panel"><canvas></canvas><div class="lbl">${label}<span>${sub}</span></div></div>`;
      const t = cs.t.toFixed(2);
      stage.innerHTML = mode === 'side' ? panel('CFD', `t = ${t} s`) + panel('Model', `t = ${t} s`)
        : mode === 'swipe' ? `<div class="cmp-panel">${'<canvas></canvas><i class="swipe-h"></i>'}<div class="lbl"><span>← CFD</span>${NAMES[PLANES[plane]]}, t = ${t} s<span>Model →</span></div></div>`
          : panel('Model minus CFD', `t = ${t} s`);
      canv = $$('canvas', stage);
      legend.classList.toggle('div', mode === 'gap');
      $('.ends', legend).innerHTML = mode === 'gap' ? '<span>−0.03</span><span>0</span><span>+0.03 m/s</span>' : '<span>0</span><span>0.35</span><span>0.70 m/s</span>';
      $('span', legend).textContent = mode === 'gap' ? 'Gap, model minus CFD' : 'Water speed |U|';
      note.textContent = mode === 'swipe' ? 'Drag across the plane' : 'Outer wall at the top';
      statsBox.innerHTML = `<div><dt>Mean gap</dt><dd>${cs.mae.toFixed(4)} m/s</dd></div><div><dt>Largest gap</dt><dd>${cs.max_gap.toFixed(3)} m/s</dd></div><div><dt>Decoding error</dt><dd>±${cs.decode_mae.toFixed(3)} m/s</dd></div>`;
      draw();
      canv.forEach((cv) => {
        cv.addEventListener('pointermove', (e) => hover(e, cv));
        cv.addEventListener('pointerleave', () => probe.classList.remove('on'));
        if (mode === 'swipe') cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); hover(e, cv, true); cv.onpointermove = (ev) => hover(ev, cv, true); cv.onpointerup = () => { cv.onpointermove = null; }; });
      });
    }
    function draw() {
      if (mode === 'side') { paint(canv[0], [[fields.act, 0, 1]]); paint(canv[1], [[fields.pre, 0, 1]]); }
      else if (mode === 'gap') paint(canv[0], [[fields.gap, 0, 1]]);
      else { paint(canv[0], [[fields.act, 0, wipe], [fields.pre, wipe, 1]]); $('.swipe-h', stage).style.left = `${wipe * 100}%`; }
    }
    function hover(e, cv, drag) {
      const r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      if (mode === 'swipe' && (drag || e.pointerType === 'mouse')) { wipe = clamp(fx, 0, 1); draw(); }
      const x = clamp(Math.floor(fx * N), 0, N - 1), y = clamp(Math.floor(fy * N), 0, N - 1), sy = fields.flip ? N - 1 - y : y;
      const a = val(0, fields.i, x, sy), b = val(1, fields.i, x, sy);
      if (a == null || b == null) { probe.classList.remove('on'); return; }
      const box = cmp.getBoundingClientRect(), px = e.clientX - box.left, py = e.clientY - box.top, right = px > box.width * 0.65;
      probe.innerHTML = `CFD   <b>${a.toFixed(3)}</b> m/s<br>Model <b>${b.toFixed(3)}</b> m/s<br>Gap   <b>${b - a >= 0 ? '+' : '−'}${Math.abs(b - a).toFixed(3)}</b> m/s`;
      probe.style.transform = `translate(${right ? `calc(${px - 14}px - 100%)` : `${px + 14}px`}, ${py + 14}px)`;
      probe.classList.add('on');
    }
    const seg = (sel, fn) => $$(`${sel} button`).forEach((b) => b.addEventListener('click', () => { $$(`${sel} button`).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); fn(b); build(); }));
    seg('#cmp-plane', (b) => { plane = +b.dataset.p; });
    seg('#cmp-time', (b) => { tsel = +b.dataset.t; });
    seg('#cmp-mode', (b) => { mode = b.dataset.m; });
    build();
    new ResizeObserver(() => fields && draw()).observe(stage);
    themeSubs.push(() => fields && draw());
  });
})();
