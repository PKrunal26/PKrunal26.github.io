// Booth: five small sketches of the rendering directions tried before halftone (Directions section).
// Invented blobs, not data. Same view and fields in every tile so only the drawing method changes. No dependencies.
(() => {
  const D = Math.PI / 180;
  const VIEW = {lat: 22, lon: 60};
  const INK = {pm: [194, 161, 64], no2: [25, 188, 185], dust: [228, 137, 107]};
  const BASE = [21, 27, 23];
  const BLOBS = {
    pm: [[26, 80, 9, 1], [33, 114, 8, .9], [-8, 24, 10, .8], [8, 4, 7, .55], [30, 50, 6, .4]],
    no2: [[50, 8, 6, .9], [34, 116, 6, 1], [25, 78, 4, .6], [31, 50, 4, .5]],
    dust: [[20, 8, 12, 1], [24, 45, 8, .7], [15, -5, 8, .6]],
  };
  const field = (k, lat, lon) => {
    let v = 0;
    for (const [a, b, s, w] of BLOBS[k]) {
      const c = Math.sin(lat * D) * Math.sin(a * D) + Math.cos(lat * D) * Math.cos(a * D) * Math.cos((lon - b) * D);
      const d = Math.acos(Math.max(-1, Math.min(1, c))) / D;
      v += w * Math.exp(-(d * d) / (2 * s * s));
    }
    return Math.min(v, 1);
  };
  // Orthographic projection, unit disk, y up.
  const p0 = VIEW.lat * D;
  const inv = (u, v) => {
    const r2 = u * u + v * v;
    if (r2 > 1) return null;
    const z = Math.sqrt(1 - r2);
    return [Math.asin(z * Math.sin(p0) + v * Math.cos(p0)) / D, VIEW.lon + Math.atan2(u, z * Math.cos(p0) - v * Math.sin(p0)) / D];
  };
  const fwd = (lat, lon) => {
    const f = lat * D, l = (lon - VIEW.lon) * D;
    const z = Math.sin(p0) * Math.sin(f) + Math.cos(p0) * Math.cos(f) * Math.cos(l);
    return {x: Math.cos(f) * Math.sin(l), y: Math.cos(p0) * Math.sin(f) - Math.sin(p0) * Math.cos(f) * Math.cos(l), z};
  };
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const seeded = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function setup(cv) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return {ctx, w, h, dpr, cx: w / 2, cy: h / 2 + h * .02, R: Math.min(w, h) * .4};
  }
  function disk(g) {
    g.ctx.fillStyle = rgba(BASE, 1);
    g.ctx.beginPath(); g.ctx.arc(g.cx, g.cy, g.R, 0, 7); g.ctx.fill();
  }
  function graticule(g, alpha = .07) {
    const {ctx, cx, cy, R} = g;
    ctx.strokeStyle = `rgba(225,231,213,${alpha})`; ctx.lineWidth = .6;
    const line = pts => { ctx.beginPath(); let on = false; for (const [la, lo] of pts) { const p = fwd(la, lo); if (p.z <= 0) { on = false; continue; } const x = cx + p.x * R, y = cy - p.y * R; on ? ctx.lineTo(x, y) : ctx.moveTo(x, y); on = true; } ctx.stroke(); };
    for (let la = -60; la <= 60; la += 30) line(Array.from({length: 181}, (_, i) => [la, -180 + i * 2]));
    for (let lo = -180; lo < 180; lo += 30) line(Array.from({length: 91}, (_, i) => [-90 + i * 2, lo]));
  }
  // Paint a per-pixel surface into the disk. shade(lat, lon) -> [r, g, b, a].
  function surface(g, shade) {
    const {ctx, dpr, cx, cy, R} = g;
    const x0 = Math.floor((cx - R) * dpr), y0 = Math.floor((cy - R) * dpr), n = Math.ceil(2 * R * dpr);
    const img = ctx.getImageData(x0, y0, n, n), d = img.data;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const u = ((x0 + i + .5) / dpr - cx) / R, v = -((y0 + j + .5) / dpr - cy) / R, ll = inv(u, v);
      if (!ll) continue;
      const [r, gg, b, a] = shade(ll[0], ll[1], u, v), k = (j * n + i) * 4;
      d[k] = d[k] * (1 - a) + r * a; d[k + 1] = d[k + 1] * (1 - a) + gg * a; d[k + 2] = d[k + 2] * (1 - a) + b * a;
    }
    ctx.putImageData(img, x0, y0);
  }

  const SKETCH = {
    plume(g) {
      disk(g); graticule(g, .1);
      const rand = seeded(3981);
      const {ctx, cx, cy, R} = g, c = fwd(28.6, 77.2), bx = cx + c.x * R, by = cy - c.y * R;
      let dx = .35 * c.x, dy = -1; const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 110; i++) {
        const t = i / 109, spread = (rand() + rand() + rand() - 1.5) * (.05 + .22 * t) * R;
        const x = bx + dx * t * .78 * R - dy * spread, y = by + dy * t * .78 * R + dx * spread;
        const r = (.07 + rand() * .1) * (1 - .3 * t) * R, w = .55 + .45 * Math.sin(Math.PI * t);
        const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, rgba(INK.pm, .16 * w)); grd.addColorStop(1, rgba(INK.pm, 0));
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = rgba(INK.pm, 1); ctx.beginPath(); ctx.arc(bx, by, 1.6, 0, 7); ctx.fill();
    },
    shell(g) {
      const {ctx, cx, cy, R} = g;
      // Rim lifted by value: trace the limb, pushed out where the field is high.
      ctx.beginPath();
      for (let k = 0; k <= 240; k++) {
        const th = k / 240 * Math.PI * 2, ll = inv(Math.cos(th) * .999, Math.sin(th) * .999);
        const r = R * (1 + .16 * field('pm', ll[0], ll[1]));
        const x = cx + Math.cos(th) * r, y = cy - Math.sin(th) * r;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.fillStyle = rgba(INK.pm, .55); ctx.fill();
      disk(g);
      surface(g, (la, lo, u, v) => {
        const f = field('pm', la, lo), nb = inv(u - .025, v + .025);
        const lit = nb ? Math.max(.45, Math.min(1.6, 1 + 9 * (field('pm', nb[0], nb[1]) - f))) : 1;
        return [...INK.pm.map(c => Math.min(255, c * lit)), .92 * Math.min(1, f * 1.2)];
      });
      graticule(g, .06);
    },
    mix(g) {
      disk(g);
      surface(g, (la, lo) => {
        let c = BASE.slice(), a = 0;
        for (const k of ['pm', 'no2', 'dust']) {
          const f = .8 * field(k, la, lo);
          c = c.map((ch, i) => ch * (1 - f) + INK[k][i] * f); a = 1 - (1 - a) * (1 - f);
        }
        return [...c, a > 0 ? 1 : 0];
      });
      graticule(g, .06);
    },
    opacity(g) {
      disk(g); graticule(g, .05);
      const {ctx, cx, cy, R} = g, s = 7;
      for (let y = cy - R; y <= cy + R; y += s * .866) for (let x = cx - R + ((Math.round((y - cy) / (s * .866)) & 1) ? s / 2 : 0); x <= cx + R; x += s) {
        const ll = inv((x - cx) / R, -(y - cy) / R); if (!ll) continue;
        const f = field('pm', ll[0], ll[1]); if (f < .03) continue;
        ctx.fillStyle = rgba(INK.pm, f); ctx.beginPath(); ctx.arc(x, y, 2.3, 0, 7); ctx.fill();
      }
    },
    halftone(g) {
      disk(g);
      const {ctx, cx, cy, R} = g, s = 6.5;
      const plates = [['pm', 90], ['no2', 227.5], ['dust', 5]];
      ctx.globalCompositeOperation = 'screen';
      for (const [k, deg] of plates) {
        const ox = .26 * s * Math.cos(deg * D), oy = -.26 * s * Math.sin(deg * D);
        ctx.fillStyle = rgba(INK[k], 1);
        for (let y = cy - R; y <= cy + R; y += s * .866) for (let x = cx - R + ((Math.round((y - cy) / (s * .866)) & 1) ? s / 2 : 0); x <= cx + R; x += s) {
          const ll = inv((x - cx) / R, -(y - cy) / R); if (!ll) continue;
          const r = .56 * s * Math.sqrt(field(k, ll[0], ll[1])); if (r < .25) continue;
          ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, 7); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
  };

  const draw = cv => { const g = setup(cv); SKETCH[cv.dataset.sketch]?.(g); };
  const all = [...document.querySelectorAll('canvas[data-sketch]')];
  const ro = new ResizeObserver(es => es.forEach(e => draw(e.target)));
  all.forEach(cv => ro.observe(cv));
})();
