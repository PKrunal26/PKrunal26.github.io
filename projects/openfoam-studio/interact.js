// OpenFOAM Studio page: interactions on the figures. Every one works with a
// mouse, a keyboard (focus) and touch (tap), and settles on a still state when
// the visitor prefers reduced motion.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = (v) => (v === 0 ? '0' : Math.abs(v) < 1e-3 ? v.toExponential(1) : v.toFixed(3));
  const once = (el, fn, margin = '0px 0px -15% 0px') => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin });
    io.observe(el);
  };
  // Hover, focus and tap all set the same highlight; leaving clears it.
  function linkHover(items, set, clear) {
    items.forEach((el) => {
      el.addEventListener('pointerenter', () => set(el));
      el.addEventListener('focus', () => set(el));
      el.addEventListener('pointerleave', clear);
      el.addEventListener('blur', clear);
    });
  }

  // ── Problem: follow a patch name, fix the typo ──────────────────────────
  const patches = $('#patches');
  if (patches) {
    linkHover($$('text[data-patch]', patches), (el) => { patches.dataset.hl = el.dataset.patch; }, () => { delete patches.dataset.hl; });
    const btn = $('#typo-btn'), typo = $('#typo'), link = $('#typo-link');
    btn.addEventListener('click', () => {
      const fixed = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(fixed));
      btn.textContent = fixed ? 'Show the typo' : 'Fix the typo';
      typo.textContent = fixed ? 'movingWall' : 'movingwall';
      typo.classList.toggle('r', !fixed); typo.classList.toggle('a', fixed);
      link.classList.toggle('lr', !fixed); link.classList.toggle('la', fixed);
      link.setAttribute('stroke-dasharray', fixed ? 'none' : '4 5');
      patches.classList.toggle('fixed', fixed);
    });
  }

  // ── Describe: a phrase in the prompt and the file it becomes ────────────
  const map = $('.map');
  if (map) {
    linkHover($$('mark[data-i], .mc[data-i]', map), (el) => { map.dataset.hl = el.dataset.i; }, () => { delete map.dataset.hl; });
  }

  // ── Run: read the residuals at any time step ────────────────────────────
  const resFig = $('#res-chart');
  if (resFig) once(resFig, () => fetch('media/residuals.json').then((r) => r.json()).then((d) => residuals(resFig, d)).catch(() => {}), '200px');
  function residuals(fig, d) {
    const svg = $('svg', fig), read = $('#res-read');
    // Geometry matches residual_svg() in scripts/openfoam-figures.py.
    const W = 880, H = 300, L = 60, R = 20, T = 20, B = 44, lo = -10, hi = 0;
    const X = (i) => L + (i / (d.steps - 1)) * (W - L - R);
    const Y = (r) => T + ((hi - Math.log10(Math.max(r, 1e-10))) / (hi - lo)) * (H - T - B);
    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g'); g.setAttribute('class', 'c-hov'); g.style.opacity = 0;
    const line = document.createElementNS(ns, 'path'); line.setAttribute('class', 'c-cross'); g.append(line);
    const dots = ['Ux', 'Uy', 'p'].map((k) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('r', 4); c.setAttribute('class', 'c-dot c-dot-' + k.toLowerCase()); g.append(c); return [k, c]; });
    svg.append(g);
    function show(clientX) {
      const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = 0;
      const x = pt.matrixTransform(svg.getScreenCTM().inverse()).x;
      const step = Math.round(((Math.min(Math.max(x, L), W - R) - L) / (W - L - R)) * (d.steps - 1));
      let j = 0; while (j < d.i.length - 1 && d.i[j + 1] <= step) j++;
      const i = d.i[j], px = X(i);
      line.setAttribute('d', `M${px} ${T}V${H - B}`);
      dots.forEach(([k, c]) => { c.setAttribute('cx', px); c.setAttribute('cy', Y(d[k][j])); });
      g.style.opacity = 1;
      read.hidden = false;
      read.innerHTML = `<b>Step ${(i + 1).toLocaleString()}</b><span>t = ${((i + 1) * 0.005).toFixed(2)} s</span><span class="k-ux">Ux ${fmt(d.Ux[j])}</span><span class="k-uy">Uy ${fmt(d.Uy[j])}</span><span class="k-p">p ${fmt(d.p[j])}</span>`;
      const f = px / W;
      read.style.left = `${f * 100}%`;
      read.style.transform = `translateX(${f > 0.6 ? 'calc(-100% - 14px)' : '14px'})`;
    }
    const hide = () => { g.style.opacity = 0; read.hidden = true; };
    svg.addEventListener('pointermove', (e) => show(e.clientX));
    svg.addEventListener('pointerdown', (e) => show(e.clientX));
    svg.addEventListener('pointerleave', hide);
  }

  // ── Validation: compare any Ghia point with the run ─────────────────────
  const ghia = $('#ghia-chart');
  if (ghia) {
    const svg = $('svg', ghia), read = $('#ghia-read');
    const pts = $$('circle.c-ref', svg);
    const ns = 'http://www.w3.org/2000/svg';
    const gap = document.createElementNS(ns, 'path'); gap.setAttribute('class', 'c-gap'); svg.append(gap);
    let cur = null;
    function pick(c) {
      if (cur === c) return;
      if (cur) cur.classList.remove('on');
      cur = c;
      if (!c) { gap.setAttribute('d', ''); read.hidden = true; return; }
      c.classList.add('on');
      const y = +c.dataset.y, g = +c.dataset.g, r = +c.dataset.r;
      gap.setAttribute('d', `M${c.getAttribute('cx')} ${c.getAttribute('cy')}H${c.dataset.rx}`);
      read.hidden = false;
      read.innerHTML = `<b>y/L = ${y}</b><span class="k-ref">Ghia ${g.toFixed(3)}</span><span class="k-run">Run ${r.toFixed(3)}</span><span>Gap ${(Math.abs(r - g) * 100).toFixed(1)}% of lid speed</span>`;
      const vb = svg.viewBox.baseVal, cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy');
      read.style.left = `${(cx / vb.width) * 100}%`;
      read.style.top = `${(cy / vb.height) * 100}%`;
      read.style.transform = `translate(${cx / vb.width > 0.55 ? 'calc(-100% - 16px)' : '16px'}, -50%)`;
    }
    svg.addEventListener('pointermove', (e) => {
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      let best = null, bd = 60 * 60;
      pts.forEach((c) => { const dx = c.cx.baseVal.value - q.x, dy = c.cy.baseVal.value - q.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = c; } });
      pick(best);
    });
    svg.addEventListener('pointerleave', () => pick(null));
    pts.forEach((c) => { c.setAttribute('tabindex', '0'); c.addEventListener('focus', () => pick(c)); c.addEventListener('blur', () => pick(null)); });
  }

  // ── Agent loop: play a run step by step ─────────────────────────────────
  const play = $('#play');
  if (play) {
    const items = $$('.play-list li', play), loop = $('#loop'), stepN = $('#step-n'), count = $('#play-count'), btn = $('#play-btn');
    let timer = 0;
    function show(n) {
      items.forEach((li, k) => { li.classList.toggle('done', k < n); li.classList.toggle('cur', k === n - 1); });
      count.textContent = n;
      stepN.textContent = n ? `step ${n} of 16` : 'step 1 … 16';
      const last = n === items.length;
      loop.classList.toggle('calling', n > 0 && !last);
      loop.classList.toggle('finished', last);
    }
    function run() {
      clearInterval(timer);
      if (still) return show(items.length);
      let n = 0; show(0);
      timer = setInterval(() => { show(++n); if (n >= items.length) clearInterval(timer); }, 560);
    }
    show(still ? items.length : 0);
    once(play, run);
    btn.addEventListener('click', run);
  }

  // ── Sandbox: test a command against the allowlist ───────────────────────
  const input = $('#cmd'), out = $('#cmd-out');
  if (input) {
    const ALLOW = new Set(['blockMesh', 'checkMesh', 'setFields', 'foamRun', 'foamToVTK', 'icoFoam', 'simpleFoam', 'pimpleFoam']);
    const esc = (v) => `'${v.replace(/'/g, `'\\''`)}'`;
    const html = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function check() {
      const parts = input.value.trim().split(/\s+/).filter(Boolean);
      out.className = 't-out';
      if (!parts.length) { out.innerHTML = '<p>Type a command to see what the runner does with it.</p>'; return; }
      const [cmd, ...args] = parts;
      if (!ALLOW.has(cmd)) {
        out.classList.add('no');
        out.innerHTML = `<p><b>Rejected before Docker.</b> <code>${html(cmd)}</code> is not on the allowlist, so no container is created.</p>`;
        return;
      }
      out.classList.add('yes');
      const shell = `source /opt/openfoam13/etc/bashrc && ${cmd}${args.length ? ' ' + args.map(esc).join(' ') : ''}`;
      const quoted = args.some((a) => /[;&|`$<>()]/.test(a) || a === 'cat' || a === 'sh');
      out.innerHTML = `<p><b>Allowed.</b> Runs in a fresh container with only <code>case/</code> mounted at <code>/cavity</code>:</p><pre>bash -c "${html(shell)}"</pre>` +
        (quoted ? '<p>Each argument is quoted, so anything after the command is plain text, never a second command.</p>' : '');
    }
    input.addEventListener('input', check);
    $$('.t-ex button', $('#tester')).forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.cmd; check(); input.focus(); }));
    $$('#allow li').forEach((li) => {
      li.tabIndex = 0; li.setAttribute('role', 'button');
      const use = () => { input.value = `${li.textContent} -case /cavity`; check(); };
      li.addEventListener('click', use);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); use(); } });
    });
    check();
  }

  // ── Knowledge: search the real index ────────────────────────────────────
  const q = $('#q');
  if (q) {
    const hits = $('#hits'), readdoc = $('#readdoc');
    let docs = null, t = 0;
    const html = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function search() {
      if (!docs) return;
      const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) { hits.innerHTML = '<li class="none">Type a word from OpenFOAM, like a keyword or a solver.</li>'; readdoc.textContent = '…'; return; }
      const scored = [];
      for (const d of docs) {
        const h = d.h.toLowerCase(), p = d.p.toLowerCase(), x = d.t.toLowerCase();
        let s = 0, all = true;
        for (const w of terms) {
          const sw = (h.includes(w) ? 3 : 0) + (x.includes(w) ? 1 : 0) + (p.includes(w) ? 1 : 0);
          if (!sw) { all = false; break; }
          s += sw;
        }
        if (all) scored.push([s + (d.p.startsWith('wiki/') ? 0.5 : 0), d]);
      }
      scored.sort((a, b) => b[0] - a[0]);
      const top = scored.slice(0, 4).map(([, d]) => d);
      if (!top.length) { hits.innerHTML = '<li class="none">No sections match. The agent would try another term.</li>'; readdoc.textContent = '…'; return; }
      hits.innerHTML = top.map((d) => {
        const head = d.h.split(' › ').slice(-2).join(' › ');
        return `<li><span class="hp">${html(d.p)}</span><span class="hh">${html(head)}</span>${d.t ? `<span class="ht">${html(d.t.slice(0, 120))}…</span>` : ''}</li>`;
      }).join('') + (scored.length > 4 ? `<li class="more">${scored.length - 4} more sections</li>` : '');
      readdoc.textContent = top[0].p;
    }
    once($('#search'), () => fetch('media/docs-index.json').then((r) => r.json()).then((d) => { docs = d; search(); }).catch(() => {}), '300px');
    q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(search, 120); });
    $$('.s-ex button').forEach((b) => b.addEventListener('click', () => { q.value = b.dataset.q; search(); }));
  }

  // ── Recovery: which path a log line takes ───────────────────────────────
  const tiers = $('#tiers'), table = $('#err-table');
  if (tiers && table) {
    linkHover($$('.tr[data-tier]', table), (el) => { tiers.dataset.hl = el.dataset.tier; table.dataset.hl = el.dataset.tier; el.classList.add('on'); },
      () => { delete tiers.dataset.hl; delete table.dataset.hl; $$('.tr.on', table).forEach((r) => r.classList.remove('on')); });
  }
})();
