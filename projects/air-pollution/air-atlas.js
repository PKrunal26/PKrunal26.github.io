// Air Atlas case study: contents rail, reveals, lazy videos, and the figures drawn from real data
// (media/fig/*.json, written by scripts/air-figures.py). Halftone constants mirror air-pollution-map/src/sphereSampling.js.
(() => {
  const FULL = .56, OFF = .26, PHASE = Math.PI / 2, GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const GROUND = [12, 16, 14], LAND = [24, 30, 26];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = (els, fn, opts) => {
    if (!('IntersectionObserver' in window)) return els.forEach(el => fn(el, true));
    const o = new IntersectionObserver(es => es.forEach(e => fn(e.target, e.isIntersecting, o)), opts);
    els.forEach(el => o.observe(el));
  };
  const once = (el, fn, margin = '200px') => io([el], (t, on, o) => { if (on) { o && o.unobserve(t); fn(); } }, {rootMargin: margin});
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

  // ---------- reveals, contents rail, videos ----------
  if (!still) {
    document.documentElement.classList.add('reveal');
    io([...document.querySelectorAll('.aa .diagram, .aa .chart, .aa .hbars, .aa .bars2')], (el, on, o) => { if (on) { el.classList.add('in'); o && o.unobserve(el); } }, {rootMargin: '0px 0px -12% 0px'});
  }
  // The current section is the last one whose top has passed 40% of the window.
  const links = [...document.querySelectorAll('.toc a')].map(a => [document.getElementById(a.getAttribute('href').slice(1)), a]).filter(([s]) => s);
  let tocFrame = 0, current = null;
  const mark = () => {
    tocFrame = 0;
    const line = innerHeight * .4;
    let hit = null;
    for (const [s, a] of links) if (s.getBoundingClientRect().top < line) hit = a;
    if (hit !== current) { current?.classList.remove('on'); hit?.classList.add('on'); current = hit; }
  };
  addEventListener('scroll', () => { tocFrame ||= requestAnimationFrame(mark); }, {passive: true});
  addEventListener('load', mark); // the browser may restore the scroll position after the first pass
  mark();
  io([...document.querySelectorAll('video[data-lazy]')], (v, on) => {
    if (on) { if (v.preload === 'none') v.preload = 'auto'; if (!still) v.play().catch(() => {}); }
    else v.pause();
  }, {threshold: .25});

  // ---------- canvas helpers ----------
  function surface(cv) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    return {ctx: cv.getContext('2d'), w: cv.width, h: cv.height, dpr};
  }
  // Bilinear sample of a south-to-north grid; NaN stays NaN.
  function sampler(grid, w, h, lon0, lat0, step) {
    return (lon, lat) => {
      const x = (lon - lon0) / step, y = (lat - lat0) / step;
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      if (x0 < 0 || y0 < 0 || x0 + 1 >= w || y0 + 1 >= h) return NaN;
      const g = (i, j) => grid[(y0 + j) * w + x0 + i];
      return (g(0, 0) * (1 - fx) + g(1, 0) * fx) * (1 - fy) + (g(0, 1) * (1 - fx) + g(1, 1) * fx) * fy;
    };
  }
  const where = (lon, lat) => `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}° ${lon >= 0 ? 'E' : 'W'}`;
  const num = v => v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
  // A small readout that follows the pointer over a flat map. read(lon, lat) returns its HTML, or '' for nothing.
  function hover(cv, box, read) {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('aria-hidden', 'true');
    cv.parentElement.append(tip);
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      const html = read(box.lon0 + fx * (box.lon1 - box.lon0), box.lat1 - fy * (box.lat1 - box.lat0));
      if (!html) { tip.classList.remove('on'); return; }
      tip.innerHTML = html;
      const x = cv.offsetLeft + e.clientX - r.left, y = cv.offsetTop + e.clientY - r.top;
      const flip = x + tip.offsetWidth + 24 > cv.offsetLeft + r.width;
      tip.style.left = `${flip ? x - tip.offsetWidth - 14 : x + 14}px`;
      tip.style.top = `${Math.max(cv.offsetTop, y - tip.offsetHeight - 10)}px`;
      tip.classList.add('on');
    });
    cv.addEventListener('pointerleave', () => tip.classList.remove('on'));
  }
  function drawLand(ctx, rings, proj, fill, stroke, lw) {
    ctx.beginPath();
    for (const r of rings) r.forEach(([lo, la], i) => { const [x, y] = proj(lo, la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    if (fill) { ctx.fillStyle = fill; ctx.fill('evenodd'); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }

  // ---------- Problem: one value as one dot ----------
  const one = document.getElementById('one-value');
  if (one) {
    const val = parseFloat(document.querySelector('.hex-val b')?.textContent) || 60;
    const {ctx, w, h, dpr} = surface(one);
    const s = w * .42, cx = w / 2, cy = h / 2, r = FULL * Math.sqrt(Math.min(val / 100, 1)) * s;
    const paint = k => {
      ctx.clearRect(0, 0, w, h);
      ctx.setLineDash([3 * dpr, 4 * dpr]); ctx.strokeStyle = '#e4ebd92e'; ctx.lineWidth = dpr;
      ctx.beginPath(); ctx.arc(cx, cy, s / 2, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#c2a140'; ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, 7); ctx.fill();
      ctx.fillStyle = '#94a480'; ctx.font = `${11 * dpr}px -apple-system,Arial,sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(`r = 0.56 × √(${val.toFixed(1)} ÷ 100)`, cx, h - 6 * dpr);
    };
    paint(still ? 1 : 0);
    if (!still) once(one, () => {
      const t0 = performance.now();
      const step = now => { const t = Math.min(1, (now - t0) / 1100); paint(Math.sqrt(1 - (1 - t) ** 3)); if (t < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, '-15% 0px');
  }

  // ---------- A screen of dots: ramp vs halftone, real PM2.5 ----------
  const rampCv = document.getElementById('strip-ramp'), dotCv = document.getElementById('strip-dots');
  if (rampCv && dotCv) once(rampCv, async () => {
    const d = await (await fetch('media/fig/strip.json')).json();
    const grid = Float32Array.from(d.values, v => v == null ? NaN : v);
    const at = sampler(grid, d.w, d.h, d.lon0, d.lat0, d.step);
    const ink = hex(d.ink);
    const ramp = t => { // ground to ink to pale ink, by value
      const a = Math.min(t, .7) / .7, b = Math.max(0, t - .7) / .3;
      return GROUND.map((g, i) => Math.round(g + (ink[i] - g) * a + (244 - ink[i]) * b * .7));
    };
    const draw = () => {
      for (const [cv, mode] of [[rampCv, 'ramp'], [dotCv, 'dots']]) {
        const {ctx, w, h, dpr} = surface(cv);
        const proj = (lo, la) => [(lo - d.lon0) / (d.lon1 - d.lon0) * w, (d.lat1 - la) / (d.lat1 - d.lat0) * h];
        ctx.fillStyle = `rgb(${GROUND})`; ctx.fillRect(0, 0, w, h);
        drawLand(ctx, d.land, proj, `rgb(${LAND})`);
        if (mode === 'ramp') {
          const img = ctx.getImageData(0, 0, w, h), px = img.data, step = Math.max(1, Math.round(dpr));
          for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
            const v = at(d.lon0 + (x + .5) / w * (d.lon1 - d.lon0), d.lat1 - (y + .5) / h * (d.lat1 - d.lat0));
            if (!(v >= 0)) continue;
            const c = ramp(Math.min(v / d.range, 1));
            for (let j = 0; j < step && y + j < h; j++) for (let i = 0; i < step && x + i < w; i++) { const k = ((y + j) * w + x + i) * 4; px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; }
          }
          ctx.putImageData(img, 0, 0);
        } else {
          const sp = Math.max(5 * dpr, w / 64), rowH = sp * Math.sqrt(3) / 2;
          ctx.fillStyle = d.ink;
          for (let j = 0, y = rowH / 2; y < h + sp; j++, y += rowH) for (let x = (j % 2) * sp / 2; x < w + sp; x += sp) {
            const v = at(d.lon0 + x / w * (d.lon1 - d.lon0), d.lat1 - y / h * (d.lat1 - d.lat0));
            if (!(v > 0)) continue;
            const r = FULL * Math.sqrt(Math.min(v / d.range, 1)) * sp;
            if (r < .3) continue;
            ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
          }
        }
        drawLand(ctx, d.land, proj, null, '#e4ebd933', dpr);
      }
    };
    draw();
    const read = (lon, lat) => { const v = at(lon, lat); return v >= 0 ? `<b>${where(lon, lat)}</b><span style="--c:${d.ink}">PM2.5<em>${num(v)}<small>µg/m³</small></em></span>` : ''; };
    hover(rampCv, d, read); hover(dotCv, d, read);
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
  });

  // ---------- Ink that mixes: three real plates, mixed in OKLab like the app ----------
  const toLinear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  const encode = c => { c = Math.min(Math.max(c, 0), 1); return c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055; };
  function oklab(rgb) {
    const [r, g, b] = rgb.map(c => toLinear(c / 255));
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
  }
  function fromLab(L, a, b) {
    let l = L + .3963377774 * a + .2158037573 * b, m = L - .1055613458 * a - .0638541728 * b, s = L - .0894841775 * a - 1.291485548 * b;
    l *= l * l; m *= m * m; s *= s * s;
    return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s].map(c => Math.round(encode(c) * 255));
  }
  const platesCv = document.getElementById('plates');
  if (platesCv) once(platesCv, async () => {
    const d = await (await fetch('media/fig/plates.json')).json();
    // Each stored value is a 2 × 2 block of 0.4° cells, so block centres sit 0.2° in from the grid corner.
    const plates = d.fields.map(f => {
      const bytes = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
      const lab = oklab(hex(f.ink)), C = Math.hypot(lab[1], lab[2]);
      return {...f, at: sampler(Float32Array.from(bytes, v => v / 255), f.w, f.h, d.lon0 + .2, d.lat0 + .2, d.step), a: lab[1] / C, b: lab[2] / C, C,
        ox: OFF * Math.cos(PHASE + GOLDEN * f.index), oy: OFF * Math.sin(PHASE + GOLDEN * f.index)};
    });
    const buttons = [...document.querySelectorAll('[data-plate]')], orderEl = document.querySelector('.plates-order');
    let order = buttons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.plate);
    let base = null, shown = null, anim = 0;

    function render() {
      const {ctx, w, h, dpr} = surface(platesCv);
      const proj = (lo, la) => [(lo - d.lon0) / (d.lon1 - d.lon0) * w, (d.lat1 - la) / (d.lat1 - d.lat0) * h];
      if (!base || base.width !== w) {
        base = document.createElement('canvas'); base.width = w; base.height = h;
        const b = base.getContext('2d');
        b.fillStyle = `rgb(${GROUND})`; b.fillRect(0, 0, w, h);
        drawLand(b, d.land, proj, `rgb(${LAND})`, '#e4ebd924', dpr);
      }
      const acc = new Float32Array(w * h * 4);
      const sp = Math.max(5 * dpr, w / 118), rowH = sp * Math.sqrt(3) / 2, pix = 1;
      for (const id of order) {
        const p = plates.find(q => q.id === id);
        const dx = p.ox * sp, dy = -p.oy * sp, ca = p.a * p.C, cb = p.b * p.C, cc = p.C;
        for (let j = 0, y = rowH / 2; y < h + sp; j++, y += rowH) for (let x = (j % 2) * sp / 2; x < w + sp; x += sp) {
          const v = p.at(d.lon0 + x / w * (d.lon1 - d.lon0), d.lat1 - y / h * (d.lat1 - d.lat0));
          if (!(v > 0)) continue;
          const r = FULL * Math.sqrt(Math.min(v * p.strength, 1)) * sp;
          // Discs under half a pixel keep ink area pi*r^2 (GlobalAirLayer.js): a half-pixel disc scaled by (2r/pix)^2.
          const re = Math.max(r, .5 * pix), k = Math.min(1, 4 * r * r / (pix * pix));
          const cx = x + dx, cy = y + dy;
          const x0 = Math.max(0, Math.floor(cx - re - 1)), x1 = Math.min(w - 1, Math.ceil(cx + re + 1));
          const y0 = Math.max(0, Math.floor(cy - re - 1)), y1 = Math.min(h - 1, Math.ceil(cy + re + 1));
          for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
            const dd = Math.hypot(px + .5 - cx, py + .5 - cy), c = k * Math.min(1, Math.max(0, re - dd + .5));
            if (c <= 0) continue;
            const i = (py * w + px) * 4;
            acc[i] += ca * c; acc[i + 1] += cb * c; acc[i + 2] += cc * c; acc[i + 3] += c; // additive: order does not matter
          }
        }
      }
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const o = out.getContext('2d'); o.drawImage(base, 0, 0);
      const img = o.getImageData(0, 0, w, h), px = img.data;
      for (let i = 0; i < acc.length; i += 4) {
        const c = acc[i + 3]; if (c < .002) continue;
        let a = acc[i] / c, b = acc[i + 1] / c; const m = Math.hypot(a, b), chroma = acc[i + 2] / c;
        if (m > 1e-5) { a = a / m * chroma; b = b / m * chroma; } else { a = b = 0; }
        const rgb = fromLab(d.inkL, a, b), al = Math.min(1, c);
        px[i] = px[i] * (1 - al) + rgb[0] * al; px[i + 1] = px[i + 1] * (1 - al) + rgb[1] * al; px[i + 2] = px[i + 2] * (1 - al) + rgb[2] * al;
      }
      o.putImageData(img, 0, 0);
      // Ease from the previous picture to the new one.
      const prev = shown; shown = out;
      cancelAnimationFrame(anim);
      if (!prev || still || prev.width !== w) { ctx.drawImage(out, 0, 0); return; }
      const t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / 320), e = 1 - (1 - t) ** 3;
        ctx.globalAlpha = 1; ctx.drawImage(prev, 0, 0); ctx.globalAlpha = e; ctx.drawImage(out, 0, 0); ctx.globalAlpha = 1;
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }
    const label = () => {
      const names = order.map(id => plates.find(p => p.id === id).label);
      orderEl.textContent = names.length ? `Turned on: ${names.join(' → ')}` : 'No plates on';
    };
    buttons.forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.plate, on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on);
      order = on ? [...order, id] : order.filter(x => x !== id);
      label(); render();
    }));
    label(); render();
    hover(platesCv, d, (lon, lat) => {
      const rows = order.map(id => plates.find(p => p.id === id)).map(p => { const v = p.at(lon, lat); return v >= 0 ? `<span style="--c:${p.ink}">${p.label}<em>${v > .995 ? `${p.range}+` : num(v * p.range)}<small>µg/m³</small></em></span>` : ''; }).join('');
      return rows && `<b>${where(lon, lat)}</b>${rows}`;
    });
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { base = null; shown = null; render(); }, 150); });
  });

  // ---------- Cards turn over ----------
  document.querySelectorAll('.cd').forEach(card => card.addEventListener('click', () => card.setAttribute('aria-pressed', card.getAttribute('aria-pressed') !== 'true')));

  // ---------- Save link bits: cards 1 and 2 held, no CO prints ----------
  const bits = document.getElementById('bits');
  if (bits) {
    const held = 0b00000101;
    for (let n = 0; n < 8; n++) {
      const card = (n >> 1) + 1, co = n & 1, on = (held >> n) & 1;
      const el = document.createElement('span');
      el.className = `bit${on ? ' on' : ''}${co ? ' co' : ''}`;
      el.innerHTML = `<i>${on}</i>${co ? 'CO' : `#${card}`}`;
      bits.append(el);
    }
  }
})();
