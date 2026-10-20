// OpenFOAM Studio page: the Problem figure. media/problem.json holds the eight
// real files of the cavity case (scripts/openfoam-problem.py), the values that
// have to agree across them, and four failed runs from the app's history.
// The wall draws every line of every file as a bar, laid out for the width.
(() => {
  const fig = document.getElementById('cw');
  if (!fig) return;
  const wall = document.getElementById('cw-wall');
  const side = document.getElementById('cw-side');
  const tabs = [...fig.querySelectorAll('.cw-tabs [role=tab]')];
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const el = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.append(e);
    return e;
  };
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let D, tab = 'files', group = 'patches', fail = 'pref', svg, geo, tip, shown = still;

  fetch('media/problem.json').then((r) => r.json()).then((d) => {
    D = d;
    D.files.forEach((f) => {
      const end = f.lines.findIndex((l) => l.startsWith('// * * *'));
      f.head = end;
    });
    draw();
    panel();
    reveal();
    new ResizeObserver(() => { if (geo && Math.abs(wall.clientWidth - geo.W) > 2) { draw(); apply(); } }).observe(wall);
  }).catch(() => { wall.innerHTML = '<p class="cw-load">The case files could not be loaded.</p>'; });

  // ── Tokens: keyword, value, punctuation, comment, header ─────────────────
  function tokens(line, isHead) {
    const out = [];
    if (isHead) {
      const m = line.match(/\S.*\S|\S/);
      if (m) out.push(['h', m.index, m.index + m[0].length]);
      return out;
    }
    const re = /\/\/.*$|[A-Za-z_][\w.:,()]*|[-+]?[\d.][\w.+-]*|"[^"]*"|\$\w+|[^\s\w]+/g;
    let m, first = true;
    while ((m = re.exec(line))) {
      const t = m[0];
      let c = 'v';
      if (t.startsWith('//')) c = 'c';
      else if (/^[^\w"$]+$/.test(t)) c = 'p';
      else if (first && /^[A-Za-z_]/.test(t)) c = 'k';
      out.push([c, m.index, m.index + t.length]);
      if (c !== 'p') first = false;
    }
    return out;
  }

  // ── Layout and drawing ───────────────────────────────────────────────────
  function layout(W) {
    const cols = W >= 520 ? 4 : 2;
    const gap = cols === 4 ? 10 : 8;
    const cw = (W - gap * (cols - 1)) / cols;
    const lp = cols === 4 ? (W > 640 ? 4.6 : 3.6) : 2.8;
    const pad = 9, head = 38;
    const chars = 58, cx = (cw - pad * 2) / chars;
    const cards = [];
    let y = 0;
    for (let r = 0; r * cols < D.files.length; r++) {
      const row = D.files.slice(r * cols, r * cols + cols);
      const h = head + Math.max(...row.map((f) => f.lines.length)) * lp + pad;
      row.forEach((f, k) => cards.push({ f, i: r * cols + k, x: k * (cw + gap), y, w: cw, h: head + f.lines.length * lp + pad }));
      y += h + gap;
    }
    return { W, H: y - gap, cols, cw, lp, pad, head, cx, chars, cards };
  }
  const lineY = (c, ln) => c.y + geo.head + ln * geo.lp;
  const charX = (c, ch) => c.x + geo.pad + Math.min(ch, geo.chars) * geo.cx;

  function draw() {
    const W = Math.round(wall.clientWidth);
    if (!W) return;
    geo = layout(W);
    wall.innerHTML = '';
    svg = el('svg', { viewBox: `0 0 ${W} ${geo.H}`, width: W, height: geo.H, class: 'cw-svg', role: 'img', 'aria-label': `The eight files of the cavity case, ${D.files.reduce((a, f) => a + f.lines.length, 0)} lines, drawn as one bar per line.` });
    const bh = Math.max(1.6, geo.lp * 0.6);
    geo.cards.forEach((c) => {
      const g = el('g', { class: 'cw-card', 'data-file': c.i }, svg);
      el('rect', { class: 'cw-box', x: c.x + 0.5, y: c.y + 0.5, width: c.w - 1, height: c.h - 1, rx: 8 }, g);
      const name = c.f.path.split('/').pop();
      el('text', { class: 'cw-name', x: c.x + geo.pad, y: c.y + 17 }, g).textContent = name;
      el('text', { class: 'cw-sub', x: c.x + geo.pad, y: c.y + 30 }, g).textContent = `${c.f.path.split('/')[0]}/ · ${c.f.lines.length} lines`;
      // Each file writes itself in, top to bottom, the first time the figure is seen.
      const clip = el('clipPath', { id: 'cwc' + c.i }, g);
      c.clip = el('rect', { x: c.x, y: c.y, width: c.w, height: shown ? c.h : geo.head }, clip);
      const bars = el('g', { class: 'cw-bars', 'clip-path': `url(#cwc${c.i})` }, g);
      let d = { h: '', k: '', v: '', p: '', c: '' };
      c.f.lines.forEach((line, ln) => {
        const head = ln <= c.f.head || /^\/\/ \*{8}/.test(line);
        const y = lineY(c, ln) + (geo.lp - bh) / 2;
        for (const [cls, a, b] of tokens(line, head)) {
          if (a >= geo.chars) continue;
          const x0 = charX(c, a), x1 = charX(c, b);
          d[cls] += `M${x0.toFixed(1)} ${y.toFixed(2)}h${Math.max(0.8, x1 - x0 - geo.cx * 0.25).toFixed(1)}v${bh.toFixed(2)}h${-Math.max(0.8, x1 - x0 - geo.cx * 0.25).toFixed(1)}z`;
        }
      });
      for (const k in d) if (d[k]) el('path', { class: 'b-' + k, d: d[k] }, bars);
    });
    // Links: the agreeing values, and threads that join them.
    const lg = el('g', { class: 'cw-links' }, svg);
    D.links.forEach((L) => {
      const g = el('g', { class: 'cw-g', 'data-g': L.key }, lg);
      const pts = L.hits.map(([f, ln, a, b]) => {
        const c = geo.cards[f];
        const y = lineY(c, ln) + geo.lp / 2;
        const x0 = charX(c, a), x1 = charX(c, b);
        return { f, x0, x1, y, t: famOf(L.key, D.files[f].lines[ln].slice(a, b)) };
      });
      // Thread each hit to the next one in the same family, in another file or line.
      const fams = {};
      pts.forEach((p) => (fams[p.t] = fams[p.t] || []).push(p));
      Object.values(fams).forEach((list) => {
        for (let i = 1; i < list.length; i++) {
          const a = list[i - 1], b = list[i];
          if (a.f === b.f && Math.abs(a.y - b.y) < 1) continue;
          el('path', { class: 'cw-th', d: curve(a, b), pathLength: 1 }, g);
        }
      });
      pts.forEach((p) => {
        el('rect', { class: 'cw-hit', x: p.x0 - 1.5, y: p.y - geo.lp * 0.6, width: Math.max(4, p.x1 - p.x0 + 1), height: geo.lp * 1.2, rx: 1.5 }, g);
        el('circle', { class: 'cw-dot', cx: (p.x0 + p.x1) / 2, cy: p.y, r: 2.6 }, g);
      });
    });
    // Failures: where each one sits in the case.
    const fg = el('g', { class: 'cw-fails' }, svg);
    D.fails.forEach((F) => {
      const [f, ln, n] = F.at;
      const c = geo.cards[f];
      const g = el('g', { class: 'cw-f cw-f-' + F.cause, 'data-f': F.key }, fg);
      if (F.cause === 'file') {
        el('rect', { class: 'cw-miss', x: c.x + 3, y: c.y + 3, width: c.w - 6, height: c.h - 6, rx: 6 }, g);
        el('text', { class: 'cw-flab', x: c.x + c.w / 2, y: c.y + c.h / 2 + 4, 'text-anchor': 'middle' }, g).textContent = 'missing file';
      } else {
        const y0 = lineY(c, ln) - 1, y1 = lineY(c, ln + n) + 1;
        el('rect', { class: F.cause === 'missing' ? 'cw-miss' : 'cw-wrong', x: c.x + 4, y: y0, width: c.w - 8, height: y1 - y0, rx: 3 }, g);
        const lab = el('text', { class: 'cw-flab', x: c.x + c.w - 8, y: y0 - 5, 'text-anchor': 'end' }, g);
        lab.textContent = F.cause === 'missing' ? `${n} lines missing` : `${n} lines wrong`;
      }
    });
    wall.append(svg);
    tip = document.createElement('div');
    tip.className = 'cw-tip';
    tip.hidden = true;
    wall.append(tip);
    svg.addEventListener('pointermove', hover);
    svg.addEventListener('pointerdown', hover);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; focusFile(-1); });
    apply();
  }

  function reveal() {
    if (shown) return;
    const io = new IntersectionObserver((es) => {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      shown = true;
      const t0 = performance.now();
      const ease = (k) => 1 - Math.pow(1 - k, 3);
      const nums = [...fig.querySelectorAll('.cw-count dd')].slice(0, 2).map((dd) => [dd, +dd.textContent]);
      (function tick(now) {
        let busy = false;
        geo.cards.forEach((c) => {
          // Same writing speed for every file, so long files take longer.
          const k = Math.min(1, Math.max(0, (now - t0 - c.i * 70) / (300 + c.f.lines.length * 16)));
          if (k < 1) busy = true;
          c.clip.setAttribute('height', geo.head + (c.h - geo.head) * ease(k));
        });
        const k = ease(Math.min(1, (now - t0) / 1500));
        nums.forEach(([dd, v]) => (dd.textContent = Math.round(v * k)));
        if (busy || k < 1) requestAnimationFrame(tick);
      })(t0);
    }, { rootMargin: '0px 0px -25% 0px' });
    io.observe(wall);
  }

  function famOf(key, text) {
    if (key === 'patches') return text;
    if (key === 'fields') return /U/.test(text) ? 'U' : 'p';
    return 'all';
  }

  // Threads bow out to the side so they read as joins, not strikethroughs.
  function curve(a, b) {
    const ax = (a.x0 + a.x1) / 2, bx = (b.x0 + b.x1) / 2;
    const dx = bx - ax, dy = b.y - a.y;
    if (Math.abs(dx) < geo.cw * 0.5) {
      const bow = -Math.min(42, 14 + Math.abs(dy) * 0.12);
      return `M${ax} ${a.y}C${ax + bow} ${a.y + dy * 0.3} ${bx + bow} ${b.y - dy * 0.3} ${bx} ${b.y}`;
    }
    return `M${ax} ${a.y}C${ax + dx * 0.45} ${a.y} ${bx - dx * 0.45} ${b.y} ${bx} ${b.y}`;
  }

  // Line under the pointer, with its real text.
  function hover(e) {
    const r = svg.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const c = geo.cards.find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
    if (!c) { tip.hidden = true; focusFile(-1); return; }
    if (tab === 'files') focusFile(c.i);
    const ln = Math.floor((y - c.y - geo.head) / geo.lp);
    if (ln < 0 || ln >= c.f.lines.length) { tip.hidden = true; return; }
    const text = c.f.lines[ln];
    tip.hidden = false;
    tip.innerHTML = `<span>${esc(c.f.path)}:${ln + 1}</span><code>${esc(text.trim() ? text : ' ')}</code>`;
    const tw = tip.offsetWidth, left = Math.min(Math.max(x - tw / 2, 0), geo.W - tw);
    tip.style.transform = `translate(${left}px, ${lineY(c, ln) - tip.offsetHeight - 8}px)`;
  }

  // Files view: one file stands out in the wall and in the list.
  function focusFile(i) {
    i = +i;
    svg.classList.toggle('dim', i >= 0);
    svg.querySelectorAll('.cw-card').forEach((c) => c.classList.toggle('focus', +c.dataset.file === i));
    side.querySelectorAll('li[data-file]').forEach((li) => li.classList.toggle('on', +li.dataset.file === i));
  }

  // ── State ────────────────────────────────────────────────────────────────
  function apply() {
    if (!svg) return;
    svg.dataset.tab = tab;
    if (tab !== 'files') focusFile(-1);
    svg.querySelectorAll('.cw-g').forEach((g) => g.classList.toggle('on', tab === 'links' && g.dataset.g === group));
    svg.querySelectorAll('.cw-f').forEach((g) => g.classList.toggle('on', tab === 'fails' && g.dataset.f === fail));
    const F = D.fails.find((f) => f.key === fail);
    svg.querySelectorAll('.cw-card').forEach((c) => {
      c.classList.toggle('hit', tab === 'fails' && +c.dataset.file === F.at[0]);
      c.classList.toggle('gone', tab === 'fails' && F.cause === 'file' && +c.dataset.file === F.at[0]);
    });
    const used = new Set(D.links.find((l) => l.key === group).hits.map((h) => h[0]));
    svg.querySelectorAll('.cw-card').forEach((c) => c.classList.toggle('lit', tab === 'links' && used.has(+c.dataset.file)));
  }

  function panel() {
    tabs.forEach((t) => {
      const on = t.dataset.tab === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    if (tab === 'files') {
      side.innerHTML = `<ol class="cw-list">${D.files.map((f, i) => `<li data-file="${i}"><code>${esc(f.path)}</code><span>${esc(f.role)}</span><em>${f.lines.length}</em></li>`).join('')}</ol>
        <p class="cw-note">There’s no schema. Nothing reads these files together until a solver starts.</p>
        <button type="button" class="cw-next" data-go="links">Next: what must agree →</button>`;
      side.querySelectorAll('[data-file]').forEach((li) => {
        li.addEventListener('pointerenter', () => focusFile(li.dataset.file));
        li.addEventListener('pointerleave', () => focusFile(-1));
      });
    } else if (tab === 'links') {
      const lines = new Set(D.links.flatMap((l) => l.hits.map((h) => h[0] + ':' + h[1])));
      side.innerHTML = `<p class="cw-lead">${D.links.length} things that must agree, on ${lines.size} lines across all ${D.files.length} files.</p>
        <div class="cw-list g" role="group" aria-label="Values that must agree">${D.links.map((l) => {
          const n = new Set(l.hits.map((h) => h[0])).size;
          return `<button type="button" data-g="${l.key}" aria-pressed="${l.key === group}">${esc(l.label)}<em>${n} files</em></button>`;
        }).join('')}</div>
        <p class="cw-note" id="cw-gnote"></p>
        <button type="button" class="cw-next" data-go="fails">Next: what breaks →</button>`;
      const pick = (k) => {
        group = k;
        side.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.g === k));
        side.querySelector('#cw-gnote').textContent = D.links.find((l) => l.key === k).note;
        apply();
      };
      side.querySelectorAll('[data-g]').forEach((b) => {
        b.addEventListener('click', () => pick(b.dataset.g));
        b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pick(b.dataset.g); });
      });
      pick(group);
    } else {
      side.innerHTML = `<p class="cw-lead">Four failed runs from building the app. Each came down to one or two lines.</p>
        <div class="cw-list f" role="group" aria-label="Failed runs">${D.fails.map((f) => `<button type="button" data-f="${f.key}" aria-pressed="${f.key === fail}">${esc(f.title)}<em>${esc(f.file.split('/').pop())}</em></button>`).join('')}</div>
        <div class="cw-run" id="cw-run"></div>`;
      const pick = (k) => {
        fail = k;
        side.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === k));
        const F = D.fails.find((f) => f.key === k);
        const steps = F.steps.map((s) => `<li class="${s.code ? 'bad' : 'ok'}"><i></i>${s.cmd}<span>${s.code ? 'exit ' + s.code : s.s + ' s'}</span></li>`).join('');
        const err = F.error.filter((l) => !/^FOAM exiting/.test(l.trim())).map((l) => {
          const src = /^\s*(From function|in file)/.test(l);
          return `<span class="${/FATAL/.test(l) ? 'x' : src ? 's' : ''}" title="${esc(l.trim())}">${esc(l.trim())}</span>`;
        }).join('');
        const at = F.time ? `, at t = ${F.time.replace('s', ' s')}` : '';
        side.querySelector('#cw-run').innerHTML = `<ol class="cw-steps">${steps}</ol>
          <p class="cw-meta">Failed after ${F.log} lines of log${at}.</p>
          <pre class="cw-err">${err}</pre>
          <p class="cw-src"><i>From function</i> and <i>in file</i> point into OpenFOAM’s own C++ source, not the case.</p>
          <p class="cw-note">${esc(F.note)}</p>`;
        apply();
      };
      side.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.f)));
      pick(fail);
    }
    side.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go, true)));
    apply();
  }

  function go(t, focus) {
    if (!D || t === tab) return;
    tab = t;
    panel();
    if (focus) tabs.find((x) => x.dataset.tab === t).focus({ preventScroll: true });
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => go(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = tabs[(i + d + tabs.length) % tabs.length];
      go(n.dataset.tab, true);
    });
  });
})();
