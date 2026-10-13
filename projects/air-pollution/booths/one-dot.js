// Booth 02: one value from the CAMS snapshot printed as one halftone dot on a hand-rolled orthographic globe.
// Constants mirror air-pollution-map/src (sphereSampling.js, fieldStats.js, camsFields.json); values are the Delhi
// cell (28.8 N, 77.2 E) of the 9 Oct 2026 03:00 UTC global snapshot. No dependencies.
(() => {
  const slide = document.getElementById('unseen');
  if (!slide) return;
  const frame = slide.querySelector('.frame'), cap = slide.closest('.slide-wrap').querySelector('.cap');

  // name, ink, full-ink range, default strength, Delhi value, unit, [p5, p99] for near-uniform fields
  const CAT = [
    ['PM2.5', '#c2a140', 100, 1, 78.9, 'µg/m³'], ['NO₂', '#19bcb9', 20, 1, 34, 'µg/m³'],
    ['O₃', '#ab95e7', 120, .35, 85, 'µg/m³', [26, 126]], ['Dust', '#e4896b', 300, .75, 135, 'µg/m³'],
    ['PM10', '#8cb087', 150, .65, 149.9, 'µg/m³'], ['CO', '#c693ad', 500, .65, 730, 'µg/m³'],
    ['SO₂', '#7faace', 50, .65, 38.3, 'µg/m³'], ['AOD', '#58bb89', 1, .65, .63, ''],
    ['UV', '#959cee', 12, .65, 1.5, ''], ['UV clear', '#6eb3b2', 12, .65, 1.55, ''],
    ['CH₂O', '#afa947', 10, .65, 10.7, 'µg/m³'], ['C₂H₂O₂', '#db84b3', 2, .65, .22, 'µg/m³'],
    ['PAN', '#5dacea', 10, .65, 4.5, 'µg/m³'], ['Sea salt', '#cd9491', 50, .65, .1, 'µg/m³'],
    ['NO', '#e3839a', 20, .65, 4.8, 'µg/m³'],
  ].map((c, k) => ({name: c[0], ink: c[1], range: c[2], str: c[3], v: c[4], unit: c[5], muted: c[6], k}));
  const COUNT = 16000, FULL = .56, OFF = .26, GOLDEN = Math.PI * (3 - Math.sqrt(5)), DEG = Math.PI / 180;
  const SPACING = Math.sqrt(4 * Math.PI / COUNT) / DEG; // mean lattice spacing in degrees

  const st = {lat: 28.8, lon: 77.2, sel: 0}, view = {lat: 26.4, lon: 77.2, zoom: 6}, goal = {...view};
  const P = () => CAT[st.sel];
  const fx = v => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);

  function plate(p) {
    const base = p.muted ? Math.max(0, Math.min(1, (p.v - p.muted[0]) / (p.muted[1] - p.muted[0]))) : Math.min(Math.max(p.v, 0) / p.range, 1);
    const w = base * p.str, a = Math.PI / 2 + GOLDEN * p.k;
    return {base, w, r: FULL * Math.sqrt(w), ox: OFF * Math.cos(a), oy: OFF * Math.sin(a), deg: Math.round(((90 + 137.508 * p.k) % 360 + 360) % 360)};
  }
  // Nearest point of the equal-area golden-angle lattice (sphereSamples in the app).
  function latticePoint(lat, lon) {
    const t = [Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.sin(lon * DEG)];
    let best = 0, bd = -2;
    const i0 = Math.max(0, Math.floor(COUNT * (1 - Math.sin((lat + 3) * DEG)) / 2)), i1 = Math.min(COUNT, Math.ceil(COUNT * (1 - Math.sin((lat - 3) * DEG)) / 2));
    for (let i = i0; i < i1; i++) {
      const y = 1 - 2 * (i + .5) / COUNT, h = Math.sqrt(1 - y * y), lo = ((i * GOLDEN / DEG + 180) % 360) - 180;
      const d = h * Math.cos(lo * DEG) * t[0] + y * t[1] + h * Math.sin(lo * DEG) * t[2];
      if (d > bd) { bd = d; best = [Math.asin(y) / DEG, lo]; }
    }
    return best;
  }

  // ---------- UI ----------
  // One panel for both layouts. Desktop: a small card pinned over the slide, maths on hover. Phone (<=600px): the slide
  // grows taller, the globe sits on top and the panel flows under it inside the same dark slide, with pollutant chips
  // and a persistent line of maths instead of hover tips. The pollutant is chosen from a scrolling tab strip on top.
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const phone = matchMedia('(max-width:600px)'), mouse = e => e.pointerType === 'mouse';
  const haptic = () => { try { navigator.vibrate?.(6); } catch {} };
  const ui = el('div', 'od-ui');
  ui.dataset.fluidQuiet = ''; // keeps the page's cursor fluid faint over the panel
  const source = el('div', 'od-source', 'CAMS forecast · 9 Oct 2026, 03:00 UTC');
  const card = el('div', 'od-card'), tip = el('div', 'od-tip'), chips = el('div', 'od-chips');
  const hint = el('div', 'od-hint', '<span class="od-hint-arrows" aria-hidden="true">‹ ›</span><span>Drag a row sideways, or tap a number to type</span>');
  ui.append(card, hint, tip);
  const canvas = el('canvas', 'od-globe');
  canvas.setAttribute('role', 'img');
  frame.prepend(canvas, source);
  frame.append(ui);
  const layout = () => { slide.classList.toggle('od-phone', phone.matches); ui.classList.toggle('od-flow', phone.matches); size = [0, 0]; kick(); context(); };

  const ICON = {
    lat: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><path d="M3.6 7h12.8M3.6 13h12.8"/></svg>',
    lon: '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.25"/><ellipse cx="10" cy="10" rx="3.2" ry="7.25"/></svg>',
  };
  const ns = v => `${Math.abs(v).toFixed(1)}° ${v < 0 ? 'S' : 'N'}`, ew = v => `${Math.abs(v).toFixed(1)}° ${v < 0 ? 'W' : 'E'}`;
  const formula = () => {
    const p = P(), c = plate(p), I = t => `<span style="color:${p.ink}">${t}</span>`;
    const w1 = p.muted
      ? `(${I(fx(p.v))} − ${p.muted[0]}) ÷ ${p.muted[1] - p.muted[0]} = ${c.base.toFixed(2)} <span class="od-m">· O₃ barely varies, so it is stretched between its 5th and 99th percentile</span>`
      : `${I(fx(p.v))} ÷ ${p.range} = ${c.base.toFixed(2)}${p.v > p.range ? ' (capped)' : ''} <span class="od-m">· ${p.range}${p.unit ? ' ' + p.unit : ''} prints as full ink</span>`;
    return `${w1}<br>× ${p.str} strength = ${c.w.toFixed(2)} → dot size 0.56 × √${c.w.toFixed(2)} = ${c.r.toFixed(2)}`;
  };
  const lattice = () => `<br><span class="od-m">The dot snaps to the nearest of 16,000 evenly spaced lattice points (the cross), then shifts to its ${P().name} plate offset.</span>`;
  const TIPS = {
    lat: () => `${ns(st.lat)}: how far ${st.lat < 0 ? 'south' : 'north'} of the equator. The line is every place at this latitude.${lattice()}`,
    lon: () => `${ew(st.lon)}: how far ${st.lon < 0 ? 'west' : 'east'} of Greenwich. The line runs pole to pole through every place at this longitude.${lattice()}`,
    value: formula,
  };

  // Which field is being explained / guided. Desktop: set by mouse hover or keyboard focus, cleared on leave.
  // Phone: the last field touched stays explained, starting with the value maths.
  let active = null, used = false;
    function context() {
    const key = active || (phone.matches ? 'value' : null);
    tip.classList.toggle('on', !!key);
    if (key) tip.innerHTML = TIPS[key]();
    kick();
  }
  const setActive = k => { active = k; context(); };
  const touched = () => { if (used) return; used = true; hint.classList.add('gone'); };

  // A scrubbable row: drag anywhere on it sideways (mouse or finger), click or tap the number to type, arrow keys step.
  // The tick ruler along its foot moves 1:1 with the pointer, so it reads as a dial.
  function scrubRow(key, label, get, set, step, min, max, fmt, unitOf) {
    const r = el('div', 'od-row od-scrub'), lab = el('div', 'od-l'), val = el('div', 'od-val'), n = el('span', 'od-n'), u = el('span', 'od-u'), ruler = el('div', 'od-ruler');
    lab.append(label);
    n.tabIndex = 0; n.inputMode = 'decimal'; n.setAttribute('role', 'spinbutton');
    val.append(n, u); r.append(lab, val, ruler); card.append(r);
    const sync = () => {
      if (!n.isContentEditable) n.textContent = fmt(get());
      u.textContent = unitOf(get());
      n.setAttribute('aria-valuenow', get());
      ruler.style.backgroundPositionX = `${-get() / step()}px`;
    };
    const commit = v => { set(Math.max(min(), Math.min(max(), v))); update(); };
    const edit = () => { n.contentEditable = 'true'; n.focus(); getSelection().selectAllChildren(n); };
    let x0 = null, v0 = 0, moved = false, kind = '';
    r.addEventListener('pointerenter', e => { if (mouse(e)) setActive(key); });
    r.addEventListener('pointerleave', e => { if (mouse(e) && x0 === null && document.activeElement !== n) setActive(null); });
    r.addEventListener('pointerdown', e => {
      if (n.isContentEditable || e.button > 0) return;
      x0 = e.clientX; v0 = get(); moved = false; kind = e.pointerType;
      try { r.setPointerCapture(e.pointerId); } catch {}
    });
    r.addEventListener('pointermove', e => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; r.classList.add('dragging'); setActive(key); touched(); dragKind = kind; }
      if (moved) commit(v0 + dx * step());
    });
    const release = e => {
      if (x0 === null) return;
      const tapped = !moved && e.type === 'pointerup';
      x0 = null; dragKind = ''; r.classList.remove('dragging');
      if (tapped && (e.target === n || e.pointerType !== 'mouse')) { setActive(key); touched(); edit(); }
      else if (!phone.matches && mouse(e) && !r.matches(':hover')) setActive(null);
    };
    r.addEventListener('pointerup', release); r.addEventListener('pointercancel', release);
    n.addEventListener('focus', () => setActive(key));
    n.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); n.isContentEditable ? n.blur() : edit(); touched(); }
      else if (!n.isContentEditable && /^Arrow(Up|Down|Left|Right)$/.test(e.key)) { e.preventDefault(); touched(); commit(get() + (/Up|Right/.test(e.key) ? 1 : -1) * step() * 10); }
    });
    n.addEventListener('blur', () => {
      if (n.isContentEditable) {
        n.contentEditable = 'false';
        const t = n.textContent.trim(), v = parseFloat(t.replace(/[^\d.+-]/g, ''));
        if (isFinite(v)) commit(/[sw]\s*$/i.test(t) ? -Math.abs(v) : v); else update();
      }
      if (!phone.matches) setActive(null);
    });
    return {sync, label: lab, n};
  }
  let dragKind = '';

  const latRow = scrubRow('lat', el('span', 'od-lab', `${ICON.lat}<span>Latitude</span>`), () => st.lat,
    v => { st.lat = v; vel = null; goal.lat = v - 2.4 / Math.max(1, goal.zoom / 6); }, () => .1, () => -85, () => 85,
    v => Math.abs(v).toFixed(1), v => `° ${v < 0 ? 'S' : 'N'}`);
  const lonRow = scrubRow('lon', el('span', 'od-lab', `${ICON.lon}<span>Longitude</span>`), () => st.lon,
    v => { st.lon = v; vel = null; goal.lon = v; }, () => .1, () => -180, () => 180,
    v => Math.abs(v).toFixed(1), v => `° ${v < 0 ? 'W' : 'E'}`);
  const name = el('span', 'od-lab od-name');
  const valRow = scrubRow('value', name, () => P().v, v => { P().v = v; }, () => P().range / 150, () => 0, () => P().range * 4, fx, () => P().unit);
  latRow.n.setAttribute('aria-label', 'Latitude, degrees north (negative is south)');
  lonRow.n.setAttribute('aria-label', 'Longitude, degrees east (negative is west)');
  valRow.n.setAttribute('aria-label', 'Value');

  // Pollutant tabs: the first row, scrolling sideways (swipe, trackpad, or the mouse wheel), faded at the cut edges.
  card.prepend(chips);
  chips.setAttribute('role', 'tablist'); chips.setAttribute('aria-label', 'Pollutant');
  const choose = (k, c) => {
    if (st.sel !== k) haptic();
    st.sel = k; touched(); setActive('value'); update();
    const left = c.chip.offsetLeft - (chips.clientWidth - c.chip.offsetWidth) / 2;
    chips.scrollTo({left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };
  CAT.forEach(c => {
    const chip = el('button', 'od-chip', `<span class="od-sw" style="--c:${c.ink}"></span>${c.name}`);
    chip.type = 'button'; chip.setAttribute('role', 'tab');
    chip.onclick = () => choose(c.k, c);
    chip.addEventListener('pointerenter', e => { if (mouse(e)) setActive('value'); });
    c.chip = chip; chips.append(chip);
  });
  chips.addEventListener('pointerleave', e => { if (mouse(e)) setActive(null); });
  chips.addEventListener('keydown', e => {
    if (!/^Arrow(Left|Right)$/.test(e.key)) return;
    e.preventDefault();
    const k = (st.sel + (e.key === 'ArrowRight' ? 1 : CAT.length - 1)) % CAT.length;
    choose(k, CAT[k]); CAT[k].chip.focus();
  });
  chips.addEventListener('wheel', e => { // a plain mouse wheel scrolls the strip sideways
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || chips.scrollWidth <= chips.clientWidth) return;
    const before = chips.scrollLeft;
    chips.scrollLeft += e.deltaY;
    if (chips.scrollLeft !== before) e.preventDefault();
  }, {passive: false});
  const fadeEdges = () => {
    chips.classList.toggle('at-start', chips.scrollLeft < 2);
    chips.classList.toggle('at-end', chips.scrollLeft + chips.clientWidth >= chips.scrollWidth - 2);
  };
  chips.addEventListener('scroll', fadeEdges, {passive: true});

  function update() {
    latRow.sync(); lonRow.sync(); valRow.sync();
    const p = P();
    name.innerHTML = `<span class="od-sw" style="--c:${p.ink}"></span><span>${p.name}</span>`;
    CAT.forEach(c => {
      c.chip.classList.toggle('on', c.k === st.sel); c.chip.setAttribute('aria-selected', c.k === st.sel); c.chip.tabIndex = c.k === st.sel ? 0 : -1;
    });
    canvas.setAttribute('aria-label', `Globe with one ${p.name} dot at ${ns(st.lat)}, ${ew(st.lon)}`);
    fadeEdges(); context();
  }
  phone.addEventListener('change', layout);

  // ---------- Globe (orthographic, back-side points pinned to the limb) ----------
  let land = null, R = 1, cx = 0, cy = 0;
  function project(lat, lon) {
    const p = lat * DEG, l = (lon - view.lon) * DEG, p0 = view.lat * DEG;
    const x = Math.cos(p) * Math.sin(l), y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l);
    const front = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l) >= 0;
    if (front) return [cx + x * R, cy - y * R, true];
    const m = Math.hypot(x, y) || 1;
    return [cx + x / m * R, cy - y / m * R, false];
  }
  function ring(ctx, pts) { // pts: flat [lon, lat, ...]
    for (let i = 0; i < pts.length; i += 2) { const q = project(pts[i + 1], pts[i]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
  }
  function smallCircle(lat, lon, rDeg, n = 64) { // points rDeg from (lat, lon), flat [lon, lat, ...]
    const out = [], p1 = lat * DEG, d = rDeg * DEG;
    for (let i = 0; i <= n; i++) {
      const b = i / n * 2 * Math.PI, p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
      out.push(lon + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2)) / DEG, p2 / DEG);
    }
    return out;
  }
  // Everything that moves eases toward a goal; one requestAnimationFrame loop runs only while something is moving.
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const shown = {lat: null, lon: null, r: 0, ink: null};
  let raf = 0, last = 0, vel = null, size = [0, 0], cache = {key: '', at: null};
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  const wrap = d => ((d + 540) % 360) - 180;
  function dotGoal() {
    const key = st.lat.toFixed(2) + ',' + st.lon.toFixed(2);
    if (cache.key !== key) {
      const at = latticePoint(st.lat, st.lon);
      if (dragKind === 'touch' && cache.at && (at[0] !== cache.at[0] || at[1] !== cache.at[1])) haptic(); // a tick per lattice point
      cache = {key, at};
    }
    const p = P(), c = plate(p), [la, lo] = cache.at;
    return {lla: la, llo: lo, lat: la + c.oy * SPACING, lon: lo + c.ox * SPACING / Math.cos(la * DEG), r: c.r, ink: p.ink};
  }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const k = still.matches ? 1 : 1 - Math.exp(-dt * 11);
    let moving = false;
    const ease = (o, f, g, wrapped) => {
      const d = wrapped ? wrap(g - o[f]) : g - o[f];
      if (Math.abs(d) < 1e-4) { o[f] = g; return; }
      o[f] += d * k; moving = true;
    };
    if (vel && !drag) { // momentum after a fling
      goal.lon = wrap(goal.lon + vel.lon * dt); goal.lat = Math.max(-89, Math.min(89, goal.lat + vel.lat * dt));
      const f = Math.exp(-dt * 4); vel.lon *= f; vel.lat *= f;
      if (Math.hypot(vel.lon, vel.lat) < .05) vel = null; else moving = true;
    }
    ease(view, 'lat', goal.lat); ease(view, 'lon', goal.lon, true);
    const z = Math.log(view.zoom), zg = Math.log(goal.zoom);
    if (Math.abs(zg - z) > 1e-4) { view.zoom = Math.exp(z + (zg - z) * k); moving = true; } else view.zoom = goal.zoom;
    const g = dotGoal();
    if (shown.lat === null || shown.ink !== g.ink) { shown.lat = g.lat; shown.lon = g.lon; shown.ink = g.ink; }
    ease(shown, 'lat', g.lat); ease(shown, 'lon', g.lon, true); ease(shown, 'r', g.r);
    draw(g);
    if (moving) kick(); else last = 0;
  }
  function draw(g) {
    const dpr = devicePixelRatio || 1, W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W) return;
    if (size[0] !== W * dpr || size[1] !== H * dpr) { size = [W * dpr, H * dpr]; canvas.width = Math.round(size[0]); canvas.height = Math.round(size[1]); }
    const x = canvas.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, W, H);
    R = Math.min(W, H) * .46 * view.zoom; cx = W * (phone.matches ? .5 : .62); cy = H / 2;
    x.save();
    x.beginPath(); x.arc(cx, cy, R, 0, 2 * Math.PI); x.fillStyle = '#121714'; x.fill(); x.clip();
    if (land) {
      // Skip rings that cannot reach the visible cap of the sphere.
      const reach = Math.min(Math.PI / 2, Math.asin(Math.min(1, Math.hypot(W, H) / R))) + .02;
      const c0 = [Math.cos(view.lat * DEG) * Math.cos(view.lon * DEG), Math.sin(view.lat * DEG), Math.cos(view.lat * DEG) * Math.sin(view.lon * DEG)];
      x.beginPath();
      for (const r of land) {
        if (Math.acos(Math.max(-1, Math.min(1, r.c[0] * c0[0] + r.c[1] * c0[1] + r.c[2] * c0[2]))) - r.a > reach) continue;
        ring(x, r.pts); x.closePath();
      }
      x.fillStyle = '#1b221d'; x.fill('evenodd'); x.strokeStyle = '#2a342c'; x.lineWidth = .7; x.stroke();
    }
    x.beginPath();
    for (let lo = -180; lo < 180; lo += 10) graticule(x, lat => [lat, lo], -80, 80);
    for (let la = -80; la <= 80; la += 10) graticule(x, lon => [la, lon], -180, 180);
    x.strokeStyle = '#ffffff09'; x.lineWidth = .5; x.stroke();
    const guide = active === 'lat' || active === 'lon' ? active : null;
    if (guide) drawGuide(x, W, H, guide);
    if (shown.r > .001) { x.beginPath(); ring(x, smallCircle(shown.lat, shown.lon, shown.r * SPACING)); x.closePath(); x.fillStyle = shown.ink; x.fill(); }
    const q = project(g.lla, g.llo);
    if (q[2]) {
      x.strokeStyle = '#e4ebd966'; x.lineWidth = 1; x.beginPath();
      x.moveTo(q[0] - 5, q[1]); x.lineTo(q[0] + 5, q[1]); x.moveTo(q[0], q[1] - 5); x.lineTo(q[0], q[1] + 5); x.stroke();
      if (view.zoom < 3) { x.strokeStyle = `rgba(228,235,217,${.67 * Math.min(1, 3 - view.zoom)})`; x.beginPath(); x.arc(q[0], q[1], 13, 0, 2 * Math.PI); x.stroke(); }
    }
    x.restore();
    if (phone.matches) { // melt the globe's lower edge into the panel below it
      const f = x.createLinearGradient(0, H - 56, 0, H);
      f.addColorStop(0, '#0c100e00'); f.addColorStop(1, '#0c100e');
      x.fillStyle = f; x.fillRect(0, H - 56, W, 56);
    }
  }
  // Latitude: the parallel through the dot (plus the equator for reference). Longitude: the meridian (plus Greenwich).
  function drawGuide(x, W, H, guide) {
    const line = (at, a, b, colour, width) => { x.beginPath(); graticule(x, at, a, b, .5); x.strokeStyle = colour; x.lineWidth = width; x.stroke(); };
    const label = (text, la, lo, dx, dy, colour, axis) => {
      const q = project(la, lo); if (!q[2]) return;
      // Off-screen lines get their label pinned to the nearest edge with an arrow pointing to them.
      let tx = q[0] + dx, ty = q[1] + dy;
      const top = source.offsetTop + source.offsetHeight + 18; // keep clear of the source line
      if (ty > H - 8) { if (axis === 'y') text += ' ↓'; ty = H - 10; } else if (ty < top) { if (axis === 'y') text += ' ↑'; ty = top; }
      if (tx > W - 8) { if (axis === 'x') text += ' →'; } else if (tx < 8) { if (axis === 'x') text = '← ' + text; }
      x.font = `${Math.max(11, Math.min(14, W / 70))}px -apple-system, BlinkMacSystemFont, sans-serif`; x.fillStyle = colour;
      x.fillText(text, Math.max(8, Math.min(W - x.measureText(text).width - 8, tx)), ty);
    };
    if (guide === 'lat') {
      line(lo => [0, lo], -180, 180, '#e4ebd924', 1);
      line(lo => [st.lat, lo], -180, 180, '#e4ebd98c', 1.25);
      label(`${Math.abs(st.lat).toFixed(1)}° ${st.lat < 0 ? 'S' : 'N'}`, st.lat, st.lon - 3 / Math.max(1, view.zoom / 6), 0, -8, '#e4ebd9');
      label('Equator 0°', 0, view.lon, 8, -8, '#e4ebd966', 'y');
    } else {
      line(la => [la, 0], -89, 89, '#e4ebd924', 1);
      line(la => [la, st.lon], -89, 89, '#e4ebd98c', 1.25);
      label(`${Math.abs(st.lon).toFixed(1)}° ${st.lon < 0 ? 'W' : 'E'}`, st.lat + 2.4 / Math.max(1, view.zoom / 6), st.lon, 8, 0, '#e4ebd9');
      label('Greenwich 0°', view.lat - 4 / Math.max(1, view.zoom / 6), 0, 8, 0, '#e4ebd966', 'x');
    }
  }
  function graticule(x, at, a, b, stepDeg = 2) {
    let pen = false;
    for (let t = a; t <= b; t += stepDeg) { const [la, lo] = at(t), q = project(la, lo); if (q[2]) { pen ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); pen = true; } else pen = false; }
  }

  // Drag turns the globe (with a little momentum); pinch or ⌘/Ctrl-scroll zooms, so plain scrolling still scrolls
  // the page; double-click recentres on the dot.
  let drag = null, pinch = null;
  const touches = new Map();
  canvas.addEventListener('pointerdown', e => {
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) { const [p, q] = [...touches.values()]; pinch = {d: Math.hypot(p[0] - q[0], p[1] - q[1]), zoom: view.zoom}; drag = null; return; }
    drag = {x: e.clientX, y: e.clientY, lat: view.lat, lon: view.lon, t: e.timeStamp, px: e.clientX, py: e.clientY};
    vel = null; canvas.setPointerCapture(e.pointerId); canvas.classList.add('grabbing');
  });
  canvas.addEventListener('pointermove', e => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && touches.size === 2) {
      const [p, q] = [...touches.values()];
      view.zoom = goal.zoom = Math.max(.8, Math.min(80, pinch.zoom * Math.hypot(p[0] - q[0], p[1] - q[1]) / pinch.d));
      kick(); return;
    }
    if (!drag) return;
    const k = 1 / DEG / R, dt = Math.max(1, e.timeStamp - drag.t) / 1000;
    view.lon = goal.lon = wrap(drag.lon - (e.clientX - drag.x) * k);
    view.lat = goal.lat = Math.max(-89, Math.min(89, drag.lat + (e.clientY - drag.y) * k));
    drag.v = {lon: -(e.clientX - drag.px) * k / dt, lat: (e.clientY - drag.py) * k / dt};
    drag.t = e.timeStamp; drag.px = e.clientX; drag.py = e.clientY;
    kick();
  });
  const end = e => {
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    if (!drag) { canvas.classList.remove('grabbing'); return; }
    if (drag.v && !still.matches && e.timeStamp - drag.t < 80) vel = drag.v;
    drag = null; canvas.classList.remove('grabbing'); kick();
  };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', () => { vel = null; goal.lat = st.lat - 2.4 / Math.max(1, goal.zoom / 6); goal.lon = st.lon; kick(); });
  canvas.addEventListener('wheel', e => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    goal.zoom = Math.max(.8, Math.min(80, goal.zoom * Math.exp(-e.deltaY * .006)));
    kick();
  }, {passive: false});

  new ResizeObserver(() => { size = [0, 0]; kick(); }).observe(canvas);
  layout(); update();

  // Land outline (Natural Earth 1:50m via world-atlas), delta-encoded at 1/20 degree; loaded when the slide nears view.
  // Each ring keeps a bounding cap (centre vector c, angular radius a) for culling.
  new IntersectionObserver((entries, io) => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    fetch(new URL('media/land-50m.json', location.href)).then(r => r.json()).then(d => {
      land = d.rings.map(r => {
        const pts = [], v = [];
        let a = 0, b = 0, sx = 0, sy = 0, sz = 0;
        for (let i = 0; i < r.length; i += 2) {
          a += r[i]; b += r[i + 1];
          const lo = a / d.scale, la = b / d.scale, u = [Math.cos(la * DEG) * Math.cos(lo * DEG), Math.sin(la * DEG), Math.cos(la * DEG) * Math.sin(lo * DEG)];
          pts.push(lo, la); v.push(u); sx += u[0]; sy += u[1]; sz += u[2];
        }
        const m = Math.hypot(sx, sy, sz) || 1, c = [sx / m, sy / m, sz / m];
        let ang = 0;
        for (const u of v) ang = Math.max(ang, Math.acos(Math.max(-1, Math.min(1, u[0] * c[0] + u[1] * c[1] + u[2] * c[2]))));
        return {pts, c, a: m < 1e-6 ? Math.PI : ang};
      });
      kick();
    }).catch(() => {});
  }, {rootMargin: '400px'}).observe(slide);
})();
