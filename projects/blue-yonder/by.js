// Sustainable Supply Chain page: every figure is drawn here as inline SVG on the page tokens, from the numbers in the
// team's report. Demos that compute (the delivery day and the pick list) solve their routes exactly on the drawing.
// Every control works with a mouse, a keyboard and touch, and motion settles to a still state when the visitor
// prefers reduced motion.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const IC = window.BY_ICONS || {};
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (v) => (typeof v === 'number' ? String(Math.round(v * 100) / 100) : esc(v));
  const at = (a) => Object.entries(a).filter(([, v]) => v != null && v !== false).map(([k, v]) => ` ${k}="${num(v)}"`).join('');
  const h = (t, a = {}, inner = '') => `<${t}${at(a)}>${inner}</${t}>`;
  const svgOf = (w, hh, inner, a = {}) => h('svg', { viewBox: `0 0 ${w} ${hh}`, xmlns: 'http://www.w3.org/2000/svg', role: 'img', ...a }, inner);
  const icon = (name, x, y, s, cls = '') => h('svg', { x, y, width: s, height: s, viewBox: '0 0 256 256', class: `ico ${cls}` }, h('path', { d: IC[name] || '' }));
  const cv = document.createElement('canvas').getContext('2d');
  const tw = (s, size = 13, wt = 400) => { cv.font = `${wt} ${size}px InterVariable, Inter, Arial, sans-serif`; return cv.measureText(s).width; };
  // Text centred on (x, y); "\n" breaks lines.
  const text = (s, x, y, cls, a = {}, lh = 16) => {
    const ls = String(s).split('\n'), y0 = y - ((ls.length - 1) * lh) / 2;
    return h('text', { class: cls, ...a }, ls.map((l, i) => h('tspan', { x, y: y0 + i * lh, dy: '0.35em' }, esc(l))).join(''));
  };
  const box = (x, y, w, hh, label, cls = 'box', tcls = 'tx-b', r = 10, a = {}) =>
    h('rect', { x, y, width: w, height: hh, rx: r, class: cls, ...a }) + text(label, x + w / 2, y + hh / 2, tcls, { 'text-anchor': 'middle' });
  const arrow = (d, cls = 'ln-s', mk = 'ah-s', a = {}) => h('path', { d, class: cls, 'marker-end': `url(#${mk})`, ...a });
  const read = (k, s) => { const r = $(`[data-read="${k}"]`); if (r) r.innerHTML = s; };
  const seg = (group, attr, on) => {
    const bs = $$('button', group);
    bs.forEach((b) => b.addEventListener('click', () => {
      bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      on(b.dataset[attr]);
    }));
  };
  const once = (el, fn, margin = '0px 0px -15% 0px') => {
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: margin });
    io.observe(el);
  };
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const DOM = { wh: 'Warehousing', tr: 'Transportation', pk: 'Packaging', rt: 'Returns' };

  // ── Fig 1 · Carbon by stage. The report's chain, circle radius as drawn in the report (measured from its
  // figure). Each solution lights the stages it acts on. ─────────────────────────────────────────────────────
  const CHAIN = [
    { k: 'node', label: 'Plant', name: 'Manufacturing plant' },
    { d: 'pk', r: 23.5, label: 'Palletised', name: 'Palletised at the plant' },
    { d: 'tr', r: 14, name: 'Plant to company warehouse' },
    { d: 'wh', r: 9.5, label: 'Company\nwarehouse', name: 'Company warehouse' },
    { d: 'tr', r: 20, name: 'Company warehouse to fulfilment centre' },
    { d: 'wh', r: 19, label: 'Fulfilment\ncentre', name: 'Fulfilment centre' },
    { d: 'pk', r: 27.5, label: 'Individually\npacked', name: 'Bulk packaging off, each order packed' },
    { d: 'tr', r: 19.5, name: 'Fulfilment centre to dispatch centre' },
    { d: 'wh', r: 15.5, label: 'Dispatch\ncentre', name: 'Dispatch centre' },
    { d: 'tr', r: 15, name: 'Dispatch centre to distribution centre' },
    { d: 'wh', r: 9.5, label: 'Distribution\ncentre', name: 'Distribution centre' },
    { d: 'tr', r: 30.5, label: 'Last mile', name: 'Last-mile delivery' },
    { d: 'pk', r: 23, label: 'Unpacking', name: 'Unpacked by the customer' },
    { k: 'node', label: 'End user', name: 'End user' },
  ];
  const CHAIN_SOL = {
    all: [null, 'Last-mile delivery is the largest source in the chain.'],
    plant: [[1, 2, 4], '<b>1 Leaving the plant</b> · slip sheets for the bulk loads · 20% less carbon · <a href="#plant">Read</a>'],
    warehouse: [[3, 5, 8, 10], '<b>2 In the warehouse</b> · every storage stage · 2× less carbon than manual · <a href="#warehouse">Read</a>'],
    packing: [[6, 7, 12], '<b>3 Packing the order</b> · from packing to unpacking · 21% less carbon per delivery · <a href="#packing">Read</a>'],
    lastmile: [[8, 11], '<b>4 The last mile</b> · slots and daily re-routing · 20–25% less carbon · <a href="#last-mile">Read</a>'],
    returns: [[3, 5, 'rt'], '<b>5 Coming back</b> · returns and deadstock · 3.5 t of carbon credits per km of road · <a href="#returns">Read</a>'],
  };
  function chain() {
    const host = $('[data-fig="chain"]');
    if (!host) return;
    const K = 1.885, GAP = 16, CY = 124, W = 1160, H = 300;
    const rad = (s) => (s.k ? 6 : s.r * K);
    const xs = [];
    CHAIN.forEach((s, i) => xs.push(i ? xs[i - 1] + rad(CHAIN[i - 1]) + GAP + rad(s) : 40));
    let out = h('line', { x1: xs[0], y1: CY, x2: xs[xs.length - 1], y2: CY, class: 'ln' });
    const TOP = 46, BOT = 208;
    CHAIN.forEach((s, i) => {
      const x = xs[i], r = rad(s), up = s.d === 'pk';
      if (s.label) {
        const ly = up ? (s.label.includes('\n') ? 28 : 36) : (s.label.includes('\n') ? 228 : 220);
        out += h('line', { x1: x, y1: up ? CY - r - 6 : CY + r + 6, x2: x, y2: up ? TOP : BOT, class: 'ln tick', 'data-i': i });
        out += text(s.label, x, ly, 'tx lab', { 'text-anchor': 'middle', 'data-i': i });
      }
      const mark = s.k
        ? h('rect', { x: x - 6, y: CY - 6, width: 12, height: 12, rx: 2, class: 'c', style: 'fill:var(--strong)' })
        : h('circle', { cx: x, cy: CY, r: r + 6, class: 'ring' }) + h('circle', { cx: x, cy: CY, r, class: `c f-${s.d}` });
      out += h('g', { class: 'st', 'data-i': i, tabindex: 0, 'aria-label': s.name }, mark + (s.k ? '' : h('circle', { cx: x, cy: CY, r: Math.max(r, 14), fill: 'transparent' })));
    });
    const e = xs[13], d = xs[8];
    out += h('g', { class: 'rt-arc', 'data-i': 'rt' },
      arrow(`M${e},246 V262 Q${e},276 ${e - 14},276 H${d + 14} Q${d},276 ${d},262 V250`, 'ln s-rt', 'ah-rt', { style: 'stroke-width:1.5' }) +
      text('Returns and deadstock', (e + d) / 2, 292, 'tx-s', { 'text-anchor': 'middle' }));
    host.innerHTML = svgOf(W, H, out, { class: 'chain', 'aria-label': 'Supply chain stages from plant to end user, sized by relative emissions' });
    const svg = $('svg', host), fig = host.closest('.fig');
    const tip = document.createElement('div');
    tip.className = 'tip';
    fig.append(tip);
    const show = (g) => {
      const s = CHAIN[+g.dataset.i], r = g.querySelector('.c').getBoundingClientRect(), f = fig.getBoundingClientRect();
      tip.innerHTML = `${esc(s.name)}${s.d ? `<small><i style="background:var(--${s.d})"></i>${DOM[s.d]}</small>` : ''}`;
      tip.style.left = `${r.left + r.width / 2 - f.left}px`;
      tip.style.top = `${r.top - f.top}px`;
      tip.classList.add('on');
    };
    const hide = () => tip.classList.remove('on');
    $$('.st', svg).forEach((g) => {
      g.addEventListener('pointerenter', () => show(g));
      g.addEventListener('pointerleave', hide);
      g.addEventListener('focus', () => show(g));
      g.addEventListener('blur', hide);
    });
    seg($('.seg', fig), 'sol', (k) => {
      const [on, msg] = CHAIN_SOL[k];
      svg.classList.toggle('has-sol', !!on);
      $$('[data-i]', svg).forEach((n) => {
        const i = n.dataset.i === 'rt' ? 'rt' : +n.dataset.i;
        n.classList.toggle('on', !!on && on.includes(i));
      });
      read('chain', msg);
    });
  }

  // ── Fig 2 · Waffle: 100 squares, each 1% of 35,000 Mt ───────────────────────────────────────────────────────
  const WAFFLE = [['China', '11,680', 33], ['United States', '4,535', 13], ['India', '2,412', 7], ['Rest of the world', '16,373', 47]];
  function waffle() {
    const host = $('[data-fig="waffle"]');
    if (!host) return;
    const S = 28, G = 4, owner = [];
    WAFFLE.forEach(([, , n], c) => { for (let j = 0; j < n; j++) owner.push(c); });
    let out = '';
    for (let i = 0; i < 100; i++) out += h('rect', { x: (i % 10) * (S + G), y: Math.floor(i / 10) * (S + G), width: S, height: S, rx: 5, class: `w${owner[i]}`, 'data-k': owner[i] });
    host.innerHTML = svgOf(10 * S + 9 * G, 10 * S + 9 * G, out, { 'aria-label': 'China 33%, United States 13%, India 7%, rest of the world 47% of global CO2' });
    const wrap = host.closest('.waffle');
    const lit = (k) => {
      wrap.classList.toggle('hl', k != null);
      $$('[data-k]', wrap).forEach((n) => n.classList.toggle('on', k != null && +n.dataset.k === k));
      read('waffle', k == null ? '' : `<b>${WAFFLE[k][0]}</b> · ${WAFFLE[k][1]} million tonnes · ${WAFFLE[k][2]}% of the world`);
    };
    $$('[data-k]', wrap).forEach((n) => {
      n.addEventListener('pointerenter', () => lit(+n.dataset.k));
      n.addEventListener('focus', () => lit(+n.dataset.k));
      n.addEventListener('pointerleave', () => lit(null));
      n.addEventListener('blur', () => lit(null));
    });
  }

  // ── Fig 3 · The four domains, one diagram each ─────────────────────────────────────────────────────────────
  function dWarehousing() {
    const W = 1080, rows = [
      ['Gatekeeping\nand receiving', ['Documentation', 'Unload', 'Counting', 'Staged', 'Quality check', 'Unpacked', 'Labelling', 'Putaway']],
      ['Storage', ['Reserve and forward areas', 'Layout zoning', 'Slotting', 'Replenishment', 'Marshalling']],
      ['Picking', ['Search sequence travel', 'Zone, wave, batch and single-order picking', 'Sorting']],
      ['Shipping', ['Kitting', 'Packing', 'Labelling', 'Loading', 'Quality check']],
    ];
    let out = '';
    const X0 = 300, X1 = W - 6, GP = 18;
    rows.forEach(([stage, steps], r) => {
      const y = 46 + r * 76;
      out += box(84, y - 25, 180, 50, stage, 'fs-wh s-wh', 'tx-b', 10, { style: 'stroke-width:1.25' });
      if (r < 3) out += arrow(`M174,${y + 27} V${y + 49}`, 'ln-s', 'ah-s');
      out += h('line', { x1: 264, y1: y, x2: X0, y2: y, class: 'ln' });
      const txt = steps.map((s) => tw(s, 12.5)), room = X1 - X0 - GP * (steps.length - 1);
      const pad = Math.min(24, (room - txt.reduce((a, b) => a + b, 0)) / steps.length), nat = txt.map((w) => w + pad);
      const extra = Math.max(0, (room - nat.reduce((a, b) => a + b, 0)) / steps.length);
      let x = X0;
      steps.forEach((s, i) => {
        const w = nat[i] + extra;
        out += h('rect', { x, y: y - 18, width: w, height: 36, rx: 8, class: 'box' }) + text(s, x + w / 2, y, 'tx', { 'text-anchor': 'middle', style: 'font-size:12.5px' });
        if (i < steps.length - 1) out += h('path', { d: `M${x + w + GP / 2 - 2},${y - 4} L${x + w + GP / 2 + 2},${y} L${x + w + GP / 2 - 2},${y + 4}`, class: 'ln-s' });
        x += w + GP;
      });
    });
    out += arrow('M84,46 H62 Q48,46 48,60 V260 Q48,274 62,274 H80', 'ln-s', 'ah-s');
    out += text('Cross-docking', 28, 160, 'tx-s', { 'text-anchor': 'middle', transform: 'rotate(-90 28 160)' });
    return svgOf(W, 312, out, { 'data-dom': 'wh', 'aria-label': 'Warehousing stages' });
  }
  function dTransport() {
    const W = 1080, Y = 196, xs = [85, 315, 545, 775, 1000];
    const names = ['Manufacturing\nplant', 'Warehouse', 'Distribution or\nfulfilment centre', 'Retailer or\ndispatch centre', 'End\nconsumer'];
    const modes = [['truck', 'train', 'boat', 'airplane'], ['truck', 'train', 'boat', 'airplane'], ['truck', 'train'], ['truck', 'moped']];
    let out = arrow(`M${xs[0]},166 V96 Q${xs[0]},72 ${xs[0] + 24},72 H${xs[2] - 24} Q${xs[2]},72 ${xs[2]},96 V160`, 'ln-s', 'ah-s');
    ['airplane', 'train', 'truck'].forEach((m, i) => { out += h('rect', { x: xs[1] - 46 + i * 32, y: 58, width: 28, height: 28, rx: 7, class: 'box' }) + icon(m, xs[1] - 42 + i * 32, 62, 20, 'c-tr'); });
    out += text('Direct', xs[1], 102, 'tx-s', { 'text-anchor': 'middle' });
    xs.forEach((x, i) => {
      out += box(x - 76, Y - 30, 152, 60, names[i], 'fs-tr s-tr', 'tx-b', 10, { style: 'stroke-width:1.25' });
      if (i < 4) {
        const a = x + 76, b = xs[i + 1] - 76, m = (a + b) / 2, ms = modes[i];
        out += arrow(`M${a + 6},${Y} H${b - 6}`, 'ln-s', 'ah-s');
        ms.forEach((md, j) => {
          const cols = ms.length > 2 ? 2 : ms.length, cx = m - (cols * 24) / 2 + (j % cols) * 24, cy = (ms.length > 2 ? 132 : 150) + Math.floor(j / cols) * 22;
          out += icon(md, cx + 2, cy, 18, 'c-tr');
        });
      }
    });
    const legend = [['truck', 'Road'], ['train', 'Rail'], ['boat', 'Sea'], ['airplane', 'Air'], ['moped', 'Two-wheeler']];
    let lx = 0;
    const lw = legend.map(([, n]) => 26 + tw(n, 12) + 28), total = lw.reduce((a, b) => a + b, 0) - 28;
    lx = (W - total) / 2;
    legend.forEach(([ic, n], i) => { out += icon(ic, lx, 270, 18, 'c-soft') + h('text', { x: lx + 24, y: 279, dy: '0.35em', class: 'tx-s' }, n); lx += lw[i]; });
    return svgOf(W, 300, out, { 'data-dom': 'tr', 'aria-label': 'Transportation stages and modes' });
  }
  function dReturns() {
    const W = 1080, xs = [100, 320, 540, 760, 980];
    const steps = ['Consumers', 'Product\nacquisition', 'Reverse\nlogistics', 'Inspection\nand sorting', 'Disposition'];
    let out = '';
    steps.forEach((s, i) => {
      out += box(xs[i] - 85, 36, 170, 56, s, 'fs-rt s-rt', 'tx-b', 10, { style: 'stroke-width:1.25' });
      if (i < 4) out += arrow(`M${xs[i] + 91},64 H${xs[i + 1] - 91}`, 'ln-s', 'ah-s');
    });
    const outs = [[320, 'Forward supply\nchain'], [540, 'Reuse'], [760, 'Recycle'], [980, 'Dispose']];
    out += h('path', { d: 'M980,92 V160 M320,160 H980', class: 'ln-s' });
    outs.forEach(([x, s]) => { out += arrow(`M${x},160 V218`, 'ln-s', 'ah-s') + box(x - 85, 222, 170, 56, s, 'box', 'tx-b'); });
    out += arrow('M455,250 H411', 'ln-s', 'ah-s');
    out += arrow('M760,278 V298 Q760,310 748,310 H332 Q320,310 320,298 V284', 'ln-s', 'ah-s');
    out += arrow('M235,250 H112 Q100,250 100,238 V98', 'ln-s', 'ah-s');
    out += text('Back to customers', 168, 236, 'tx-s', { 'text-anchor': 'middle' });
    return svgOf(W, 320, out, { 'data-dom': 'rt', 'aria-label': 'Returns process and disposition' });
  }
  function dPackaging() {
    const W = 1080, xs = [135, 405, 675, 945];
    const steps = [
      ['package', 'Primary', 'The pack that holds\nthe product'],
      ['stack', 'Secondary and pallets', 'Cartons on pallets,\nwrapped for bulk transport'],
      ['arrows-clockwise', 'Unpack and repack', 'Bulk loads opened and\nrepacked to each order'],
      ['trash', 'Unpacking and disposal', 'The customer opens the\norder and throws it away'],
    ];
    let out = '';
    steps.forEach(([ic, t, d], i) => {
      const x = xs[i];
      out += h('circle', { cx: x, cy: 76, r: 40, class: 'fs-pk s-pk', style: 'stroke-width:1.25' }) + icon(ic, x - 18, 58, 36, 'c-pk');
      out += text(t, x, 146, 'tx-h', { 'text-anchor': 'middle' }) + text(d, x, 186, 'tx-s', { 'text-anchor': 'middle' }, 17);
      if (i < 3) out += arrow(`M${x + 52},76 H${xs[i + 1] - 52}`, 'ln-s', 'ah-s');
    });
    return svgOf(W, 220, out, { 'data-dom': 'pk', 'aria-label': 'Packaging stages' });
  }
  function domains() {
    [['d-tr', dTransport], ['d-wh', dWarehousing], ['d-pk', dPackaging], ['d-rt', dReturns]].forEach(([k, f]) => {
      const host = $(`[data-fig="${k}"]`);
      if (host) host.innerHTML = f();
    });
  }

  // ── Fig 4 · Problems to solutions ───────────────────────────────────────────────────────────────────────────
  const PROB = [
    ['tr', 'Unused truck space', [0]],
    ['wh', 'Lack of digitisation', [1]], ['wh', 'Lack of automation', [1]], ['wh', 'Poor use of storage', [1, 0]],
    ['pk', 'Single-use plastic', [2, 4]], ['pk', 'Packaging design', [2]],
    ['tr', 'Unoptimised last-mile routes', [3]], ['tr', 'Last-mile pickups', [3, 4]],
    ['pk', 'No circular alternatives', [2, 4]],
  ];
  const PROB_GROUP = [0, 1, 1, 1, 2, 2, 3, 3, 4];
  const SOLS = ['Sustainable tertiary packaging', 'Warehouse and inventory automation', 'Convertible delivery bag', 'Last mile optimisation', 'Systematic waste management'];
  function priorities() {
    const host = $('[data-fig="priorities"]');
    if (!host) return;
    const W = 1000, H = 476, py = (i) => 40 + i * 40 + PROB_GROUP[i] * 22, sy = (j) => 40 + j * 99, L = 376, R = 640;
    let links = '', rows = '';
    PROB.forEach(([d, n, to], i) => {
      to.forEach((j) => { links += h('path', { d: `M${L},${py(i)} C${(L + R) / 2},${py(i)} ${(L + R) / 2},${sy(j)} ${R},${sy(j)}`, class: `lnk s-${d}`, 'data-p': i, 'data-s': j }); });
      rows += h('g', { class: 'row', 'data-p': i, tabindex: 0 },
        h('rect', { x: 60, y: py(i) - 18, width: L - 52, height: 36, fill: 'transparent' }) +
        text(n, L - 16, py(i), 'tx', { 'text-anchor': 'end' }) + h('circle', { cx: L, cy: py(i), r: 5, class: `f-${d}` }));
    });
    SOLS.forEach((n, j) => {
      rows += h('g', { class: 'row', 'data-s': j, tabindex: 0 },
        h('rect', { x: R - 8, y: sy(j) - 20, width: 360, height: 40, fill: 'transparent' }) +
        h('circle', { cx: R, cy: sy(j), r: 11, class: 'box-k' }) + text(String(j + 1), R, sy(j), 'tx-b', { 'text-anchor': 'middle', style: 'font-size:11px' }) +
        text(n, R + 22, sy(j), 'tx-b', {}));
    });
    host.innerHTML = svgOf(W, H, links + rows, { class: 'prio', 'aria-label': 'Which solutions answer which problems' });
    const svg = $('svg', host);
    const lit = (p, s) => {
      svg.classList.toggle('hl', p != null || s != null);
      $$('.lnk', svg).forEach((l) => l.classList.toggle('on', (p != null && +l.dataset.p === p) || (s != null && +l.dataset.s === s)));
      const ps = new Set(), ss = new Set();
      $$('.lnk.on', svg).forEach((l) => { ps.add(+l.dataset.p); ss.add(+l.dataset.s); });
      $$('.row', svg).forEach((r) => r.classList.toggle('on', r.dataset.p != null ? ps.has(+r.dataset.p) : ss.has(+r.dataset.s)));
      if (p != null) read('priorities', `<b>${PROB[p][1]}</b> → ${PROB[p][2].map((j) => SOLS[j]).join(', ')}`);
      else if (s != null) read('priorities', `<b>${SOLS[s]}</b> answers ${ss.size ? ps.size : 0} problem${ps.size === 1 ? '' : 's'}`);
      else read('priorities', '9 problems, 5 solutions');
    };
    $$('.row', svg).forEach((r) => {
      const go = () => (r.dataset.p != null ? lit(+r.dataset.p, null) : lit(null, +r.dataset.s));
      r.addEventListener('pointerenter', go);
      r.addEventListener('focus', go);
      r.addEventListener('pointerleave', () => lit(null, null));
      r.addEventListener('blur', () => lit(null, null));
    });
  }

  // ── Fig 5 · The day-before message: a phone and the flow it drives ──────────────────────────────────────────
  const FLOW_N = {
    order: [0, 122, 130, 'Order placed\nwith a slot'], wa: [164, 122, 140, 'WhatsApp the\nday before'],
    confirm: [430, 12, 150, 'Delivered\nin the slot'], change: [430, 92, 150, 'Delivered in\nthe new slot'],
    pickup: [430, 172, 150, 'Collected at the\ndispatch centre'], none: [430, 252, 150, 'Asked again\nthe next day'],
    call: [430, 340, 150, 'Automated call\non day 3'], cancel: [610, 340, 140, 'Cancelled before\nit leaves'],
  };
  const FLOW_E = { confirm: 'Confirms', change: 'Changes slot', pickup: 'Picks up', none: 'No reply' };
  const REPLY = {
    confirm: { on: ['order', 'wa', 'confirm'], read: 'Delivered in the slot the customer chose, in one trip.' },
    change: { on: ['order', 'wa', 'change'], read: 'Delivered in the new slot. Routes are re-planned the night before.' },
    pickup: { on: ['order', 'wa', 'pickup'], read: 'No delivery trip. The customer collects from the dispatch centre.' },
    none: { on: ['order', 'wa', 'none', 'call', 'cancel'], read: 'No reply to the message or the call: the order is cancelled before it leaves, not at the door.' },
  };
  const ASK = ['Confirm', 'Change slot', 'Pick up at dispatch centre'];
  const CHAT = {
    confirm: [['day', 'Monday'], ['biz', 'Your xyz order arrives tomorrow, 10 am – 12 pm.', ASK, 0], ['me', 'Confirm'], ['biz', 'Thanks. See you tomorrow between 10 am and 12 pm.']],
    change: [['day', 'Monday'], ['biz', 'Your xyz order arrives tomorrow, 10 am – 12 pm.', ASK, 1], ['me', 'Change slot'], ['biz', 'Pick a new slot.', ['2 pm – 4 pm', '6 pm – 8 pm', 'Wednesday, 10 am – 12 pm'], 1], ['me', '6 pm – 8 pm'], ['biz', 'Done. Your order arrives tomorrow, 6 pm – 8 pm.']],
    pickup: [['day', 'Monday'], ['biz', 'Your xyz order arrives tomorrow, 10 am – 12 pm.', ASK, 2], ['me', 'Pick up at dispatch centre'], ['biz', 'Your order will wait at the dispatch centre from tomorrow, 9 am to 9 pm. Show code 4821 when you collect it.']],
    none: [['day', 'Monday'], ['biz', 'Your xyz order arrives tomorrow, 10 am – 12 pm.', ASK, -1], ['day', 'Tuesday'], ['biz', 'We didn’t hear back, so your delivery moves to Wednesday, 10 am – 12 pm.', ASK, -1], ['day', 'Wednesday'], ['call'], ['biz', 'We couldn’t confirm your delivery, so the order was cancelled before dispatch.']],
  };
  function reply() {
    const host = $('[data-fig="reply"]');
    if (!host) return;
    let out = '';
    const cy = (k) => FLOW_N[k][1] + 28;
    out += arrow('M130,150 H158', 'ln ed', 'ah-s', { 'data-e': 'order' });
    Object.keys(FLOW_E).forEach((k) => {
      const y = cy(k);
      out += arrow(`M304,150 C330,150 330,${y} 346,${y} H424`, 'ln ed', 'ah-s', { 'data-e': k });
      out += h('text', { x: 350, y: y - 9, class: 'tx-m el', 'data-e': k }, FLOW_E[k]);
    });
    out += arrow('M505,308 V334', 'ln ed', 'ah-s', { 'data-e': 'call' }) + arrow('M580,368 H604', 'ln ed', 'ah-s', { 'data-e': 'cancel' });
    Object.entries(FLOW_N).forEach(([k, [x, y, w, s]]) => { out += h('g', { class: 'nd', 'data-n': k }, box(x, y, w, 56, s, 'box', 'tx-b')); });
    host.innerHTML = svgOf(750, 400, out, { class: 'flow', 'aria-label': 'What happens after each reply' });
    const svg = $('svg', host), chat = $('[data-chat]');
    const msg = (m, i) => {
      const dl = still ? 0 : i * 260;
      if (m[0] === 'day') return `<span class="day" style="animation-delay:${dl}ms">${m[1]}</span>`;
      if (m[0] === 'call') return `<div class="msg biz call" style="animation-delay:${dl}ms"><i>${icon('phone-call', 0, 0, 14).replace('<svg', '<svg style="width:14px;height:14px"')}</i><span>Missed voice call<small>9:10 am</small></span></div>`;
      const btns = m[2] ? `<span class="btns">${m[2].map((b, j) => `<span${j === m[3] ? ' class="picked"' : ''}>${esc(b)}</span>`).join('')}</span>` : '';
      return `<div class="msg ${m[0]}" style="animation-delay:${dl}ms">${esc(m[1])}<small>${m[0] === 'me' ? '7:14 pm ✓✓' : '7:02 pm'}</small>${btns}</div>`;
    };
    const pick = (k) => {
      const on = REPLY[k].on;
      $$('.nd', svg).forEach((n) => n.classList.toggle('on', on.includes(n.dataset.n)));
      $$('[data-e]', svg).forEach((e) => {
        const lit = on.includes(e.dataset.e);
        e.classList.toggle('on', lit);
        if (e.tagName === 'path') e.setAttribute('marker-end', `url(#${lit ? 'ah' : 'ah-s'})`);
      });
      chat.innerHTML = CHAT[k].map(msg).join('');
      read('reply', REPLY[k].read);
    };
    pick('confirm');
    seg($('.seg', host.closest('.fig')), 'reply', pick);
  }

  // ── Exact shortest tours, for the route and the pick list (Held–Karp over at most 14 stops) ────────────────
  function bestPath(P, start, dist, close) {
    const n = P.length, N = 1 << n, dp = new Float64Array(N * n).fill(Infinity), par = new Int8Array(N * n).fill(-1);
    for (let j = 0; j < n; j++) dp[(1 << j) * n + j] = dist(start, P[j]);
    for (let m = 1; m < N; m++) {
      for (let j = 0; j < n; j++) {
        const v = dp[m * n + j];
        if (v === Infinity || !(m & (1 << j))) continue;
        for (let k = 0; k < n; k++) {
          if (m & (1 << k)) continue;
          const mm = m | (1 << k), c = v + dist(P[j], P[k]);
          if (c < dp[mm * n + k] - 1e-9) { dp[mm * n + k] = c; par[mm * n + k] = j; }
        }
      }
    }
    let best = Infinity, bj = -1;
    for (let j = 0; j < n; j++) { const c = dp[(N - 1) * n + j] + close(P[j]); if (c < best - 1e-9) { best = c; bj = j; } }
    const order = [];
    for (let m = N - 1, j = bj; j >= 0;) { order.push(j); const pj = par[m * n + j]; m &= ~(1 << j); j = pj; }
    return { order: order.reverse(), cost: best };
  }
  // Draw a path in over `ms`, with a marker riding its tip.
  function drawIn(path, rider, ms = 2200) {
    const L = path.getTotalLength();
    path.style.strokeDasharray = `${L} ${L}`;
    if (still) { path.style.strokeDashoffset = '0'; if (rider) rider.style.opacity = '0'; return () => {}; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      path.style.strokeDashoffset = String(L * (1 - e));
      if (rider) { const p = path.getPointAtLength(L * e); rider.setAttribute('transform', `translate(${p.x} ${p.y})`); rider.style.opacity = t < 1 ? '1' : '0'; }
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }

  // ── Fig 6 · A delivery day on a street grid: 50 px blocks, 100 px = 1 km ─────────────────────────────────────
  const DEPOT = [100, 250];
  const STOPS = [[250, 100], [350, 150], [450, 50], [550, 150], [700, 100], [850, 150], [900, 300], [800, 350], [650, 300], [550, 400], [400, 450], [300, 350], [200, 450], [500, 250]];
  const AWAY = { 3: 'pick', 7: 'move', 10: 'late' };
  const man = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  const lpath = (pts) => pts.map((p, i) => (i ? `H${p[0]} V${p[1]}` : `M${p[0]},${p[1]}`)).join(' ');
  function routePlans() {
    const all = STOPS.map((p, i) => i);
    const a = bestPath(STOPS, DEPOT, man, (p) => man(p, DEPOT));
    const failed = [3, 7, 10], retry = bestPath(failed.map((i) => STOPS[i]), DEPOT, man, (p) => man(p, DEPOT));
    const keep = all.filter((i) => !AWAY[i]), late = STOPS[10];
    const b = bestPath(keep.map((i) => STOPS[i]), DEPOT, man, (p) => man(p, late) + man(late, DEPOT));
    return {
      fixed: { seq: a.order.map((j) => all[j]), km: a.cost / 100, retry: retry.order.map((j) => failed[j]), rkm: retry.cost / 100 },
      slots: { seq: [...b.order.map((j) => keep[j]), 10], km: b.cost / 100 },
    };
  }
  function route() {
    const host = $('[data-fig="route"]');
    if (!host) return;
    const W = 1000, H = 500, plans = routePlans();
    let base = '';
    for (let x = 0; x < W; x += 50) for (let y = 0; y < H; y += 50) base += h('rect', { x: x + 5, y: y + 5, width: 40, height: 40, rx: 5, class: 'block' });
    base += h('path', { class: 'path2', d: '' }) + h('path', { class: 'path', d: '' });
    STOPS.forEach((p, i) => { base += h('g', { class: 'stop', 'data-i': i, transform: `translate(${p[0]} ${p[1]})` }, h('circle', { r: 9, style: 'fill:var(--panel)' }) + h('circle', { r: 6, class: 'sm' })); });
    base += h('g', { transform: `translate(${DEPOT[0]} ${DEPOT[1]})` }, h('rect', { x: -22, y: -22, width: 44, height: 44, rx: 10, style: 'fill:var(--strong)' }) + icon('storefront', -12, -12, 24, 'c-card'));
    base += text('Dispatch\ncentre', DEPOT[0], DEPOT[1] + 46, 'tx-s', { 'text-anchor': 'middle' }, 15);
    base += h('g', { class: 'van', style: 'opacity:0' }, h('circle', { r: 13, style: 'fill:var(--card);stroke:var(--strong);stroke-width:1.5' }) + icon('truck', -8, -8, 16, 'c-k'));
    host.innerHTML = svgOf(W, H, base, { class: 'route', 'aria-label': 'A delivery route on a street grid' });
    const svg = $('svg', host), p1 = $('.path', svg), p2 = $('.path2', svg), van = $('.van', svg);
    let stop = () => {};
    const style = (i, mode) => {
      const c = $(`.stop[data-i="${i}"] .sm`, svg), k = AWAY[i];
      let s = 'fill:var(--strong)';
      if (k && mode === 'fixed') s = 'fill:var(--card);stroke:var(--bad);stroke-width:2.5';
      else if (k === 'pick') s = 'fill:var(--card);stroke:var(--strong);stroke-width:2.5';
      else if (k === 'move') s = 'fill:var(--g1)';
      else if (k === 'late') s = 'fill:var(--tr)';
      c.setAttribute('style', s);
    };
    const show = (mode, animate) => {
      stop();
      const pl = plans[mode];
      p1.setAttribute('d', lpath([DEPOT, ...pl.seq.map((i) => STOPS[i]), DEPOT]));
      p2.setAttribute('d', mode === 'fixed' ? lpath([DEPOT, ...pl.retry.map((i) => STOPS[i]), DEPOT]) : '');
      p2.style.opacity = '0';
      STOPS.forEach((_, i) => style(i, mode));
      const done = () => { p2.style.transition = 'opacity .5s ease'; p2.style.opacity = mode === 'fixed' ? '1' : '0'; };
      if (animate) { stop = drawIn(p1, van, 2600); setTimeout(done, still ? 0 : 2500); } else { p1.style.strokeDasharray = 'none'; done(); }
      read('route', mode === 'fixed'
        ? `<b>${(pl.km + pl.rkm).toFixed(1)} km</b> in all, ${pl.km.toFixed(1)} on the day and ${pl.rkm.toFixed(1)} to retry · 3 failed deliveries`
        : `<b>${pl.km.toFixed(1)} km</b> in all · no failed deliveries`);
    };
    let mode = 'fixed', seen = false;
    show(mode, false);
    p1.style.strokeDasharray = '1 99999';
    once(host, () => { seen = true; show(mode, true); });
    seg($('.seg', host.closest('.fig')), 'route', (k) => { mode = k; show(k, seen); });
  }

  // ── Fig 7 · Warehouse management system ─────────────────────────────────────────────────────────────────────
  const WMS_IN = ['Storage capacity', 'Stock levels', 'Supplier lead times\nand schedules', 'Seasonal trends', 'Upcoming campaigns'];
  const WMS_FN = [
    ['Path optimisation', 'Shortest routes for putaway and picking.'],
    ['Package sizing', 'The right box size for each order.'],
    ['Demand forecast', 'Predicts future stock demand.'],
    ['Replenishment', 'Alerts when stock should move from the reserve area to the forward area.'],
    ['Product positioning', 'Places each product by how fast it moves, its size, its quantity and how easy it is to pick.'],
    ['Performance tracking', 'Tracks how products sell and when they expire, and releases stock first expired, first out.'],
  ];
  function wms() {
    const host = $('[data-fig="wms"]');
    if (!host) return;
    let out = '';
    WMS_IN.forEach((s, i) => { const y = 64 + i * 83; out += box(0, y - 25, 220, 50, s, 'box', 'tx') + arrow(`M222,${y} H294`, 'ln-s', 'ah-s'); });
    out += h('rect', { x: 300, y: 20, width: 210, height: 420, rx: 16, class: 'fs-wh s-wh', style: 'stroke-width:1.25' });
    out += icon('cpu', 381, 150, 48, 'c-wh') + text('Warehouse\nmanagement system', 405, 236, 'tx-h', { 'text-anchor': 'middle' }, 18);
    out += box(325, 330, 160, 36, 'IoT devices', 'box', 'tx', 8) + box(325, 378, 160, 36, 'Cloud storage', 'box', 'tx', 8);
    WMS_FN.forEach(([n], i) => {
      const y = 52 + i * 71;
      out += arrow(`M512,${y} H584`, 'ln-s fe', 'ah-s', { 'data-f': i });
      out += h('g', { class: 'fn', 'data-f': i, tabindex: 0 }, box(590, y - 25, 230, 50, n, 'box', 'tx-b'));
      out += h('path', { d: `M822,${y} C862,${y} 862,230 900,230`, class: 'ln fe', 'data-f': i });
    });
    out += h('rect', { x: 902, y: 150, width: 178, height: 160, rx: 14, class: 'box-k' });
    out += text('Warehouse tasks', 991, 182, 'tx-h', { 'text-anchor': 'middle' });
    ['Goods allocation', 'Picking route lists', 'Order division'].forEach((s, i) => { out += text(s, 991, 222 + i * 26, 'tx', { 'text-anchor': 'middle' }); });
    host.innerHTML = svgOf(1080, 460, out, { class: 'wms', 'aria-label': 'Inputs, functions and outputs of the warehouse management system' });
    const svg = $('svg', host);
    const lit = (f) => {
      svg.classList.toggle('hl', f != null);
      $$('[data-f]', svg).forEach((n) => n.classList.toggle('on', f != null && +n.dataset.f === f));
      read('wms', f == null ? 'Six functions turn the inputs into warehouse tasks.' : `<b>${WMS_FN[f][0]}</b> · ${WMS_FN[f][1]}`);
    };
    $$('.fn', svg).forEach((g) => {
      g.addEventListener('pointerenter', () => lit(+g.dataset.f));
      g.addEventListener('focus', () => lit(+g.dataset.f));
      g.addEventListener('pointerleave', () => lit(null));
      g.addEventListener('blur', () => lit(null));
    });
  }

  // ── Fig 8 · One pick list. A single-block warehouse: eight aisles between nine racks, cross-aisles at the top
  // and bottom, 10 px = 1 m. Travel between aisles goes round the nearer end. ──────────────────────────────────
  const PK = { T: 40, B: 420, ax: (a) => 150 + a * 105, dock: [60, 420] };
  const PICKS = {
    random: [[0, 150], [1, 310], [2, 118], [3, 246], [4, 182], [5, 342], [5, 86], [6, 214], [7, 278], [3, 374]],
    velocity: [[0, 342], [0, 278], [0, 374], [1, 374], [1, 310], [1, 246], [2, 342], [2, 374], [0, 214], [1, 182]],
  };
  const pdist = (p, q) => (p[0] === q[0] ? Math.abs(p[1] - q[1]) : Math.abs(p[0] - q[0]) + Math.min(p[1] - PK.T + q[1] - PK.T, PK.B - p[1] + PK.B - q[1]));
  function pickPlan(slot, routeK) {
    const items = PICKS[slot].map(([a, y]) => [PK.ax(a), y]);
    if (routeK === 'opt') {
      const r = bestPath(items, PK.dock, pdist, (p) => pdist(p, PK.dock));
      let d = `M${PK.dock[0]},${PK.dock[1]}`, cur = PK.dock;
      const seq = r.order.map((j) => items[j]);
      [...seq, PK.dock].forEach((q) => {
        if (cur[0] === q[0]) d += ` V${q[1]}`;
        else { const Y = cur[1] - PK.T + q[1] - PK.T < PK.B - cur[1] + PK.B - q[1] ? PK.T : PK.B; d += ` V${Y} H${q[0]} V${q[1]}`; }
        cur = q;
      });
      return { d, len: r.cost, order: r.order };
    }
    // Aisle by aisle: walk each aisle with an item end to end, alternating; an odd last aisle is entered and left
    // from the bottom.
    const aisles = [...new Set(items.map((p) => p[0]))].sort((x, y) => x - y);
    let d = `M${PK.dock[0]},${PK.dock[1]}`, len = 0, cur = PK.dock;
    const go = (q) => { len += Math.abs(q[0] - cur[0]) + Math.abs(q[1] - cur[1]); d += q[0] !== cur[0] ? ` H${q[0]}` : ` V${q[1]}`; cur = q; };
    const order = [];
    aisles.forEach((x, i) => {
      const inA = items.map((p, j) => [p, j]).filter(([p]) => p[0] === x);
      const lastOdd = i === aisles.length - 1 && aisles.length % 2 === 1, up = i % 2 === 0;
      go([x, cur[1]]);
      if (lastOdd) {
        inA.sort((a, b) => b[0][1] - a[0][1]).forEach(([, j]) => order.push(j));
        const top = Math.min(...inA.map(([p]) => p[1]));
        go([x, top]); go([x, PK.B]);
      } else {
        inA.sort((a, b) => (up ? b[0][1] - a[0][1] : a[0][1] - b[0][1])).forEach(([, j]) => order.push(j));
        go([x, up ? PK.T : PK.B]);
      }
    });
    go([PK.dock[0], PK.B]);
    return { d, len, order };
  }
  function pick() {
    const host = $('[data-fig="pick"]');
    if (!host) return;
    const W = 1000, H = 470;
    let out = h('rect', { x: 10, y: 398, width: 56, height: 50, rx: 8, class: 'box-k' }) + text('Dock', 38, 423, 'tx-s', { 'text-anchor': 'middle' });
    const racks = [[72.5, 122.5]];
    for (let a = 0; a < 8; a++) racks.push([PK.ax(a) + 27.5, PK.ax(a) + 77.5]);
    racks.forEach(([x0, x1]) => {
      out += h('rect', { x: x0, y: 70, width: x1 - x0, height: 320, rx: 4, class: 'rack' });
      for (let k = 1; k < 10; k++) out += h('line', { x1: x0, x2: x1, y1: 70 + k * 32, y2: 70 + k * 32, class: 'slot' });
      out += h('line', { x1: (x0 + x1) / 2, x2: (x0 + x1) / 2, y1: 70, y2: 390, class: 'slot' });
    });
    for (let a = 0; a < 8; a++) out += text(`Aisle ${a + 1}`, PK.ax(a), 24, 'tx-m', { 'text-anchor': 'middle' });
    out += h('path', { class: 'walk', d: '' });
    for (let i = 0; i < 10; i++) out += h('g', { class: 'item', 'data-i': i }, h('circle', { r: 10, class: 'f-wh', style: 'stroke:var(--panel);stroke-width:2' }) + h('text', { y: 0, dy: '0.35em', 'text-anchor': 'middle', class: 'tx-b tx-on', style: 'font-size:10px' }, ''));
    out += h('g', { class: 'van', style: 'opacity:0' }, h('circle', { r: 7, style: 'fill:var(--strong);stroke:var(--panel);stroke-width:2' }));
    host.innerHTML = svgOf(W, H, out, { class: 'pick', 'aria-label': 'A pick path through a warehouse' });
    const svg = $('svg', host), walk = $('.walk', svg), rider = $('.van', svg);
    const base = pickPlan('random', 's').len;
    let slot = 'random', rt = 's', seen = false, stop = () => {};
    const show = (animate) => {
      stop();
      const pl = pickPlan(slot, rt), pts = PICKS[slot];
      walk.setAttribute('d', pl.d);
      $$('.item', svg).forEach((g, i) => {
        const [a, y] = pts[i], x = PK.ax(a) + (i % 2 ? 20 : -20);
        g.style.transform = `translate(${x}px, ${y}px)`;
        g.querySelector('text').textContent = String(pl.order.indexOf(i) + 1);
      });
      if (animate) stop = drawIn(walk, rider, 2200); else walk.style.strokeDasharray = 'none';
      const m = Math.round(pl.len / 10), pct = Math.round((1 - pl.len / base) * 100);
      read('pick', `${m} m walked${pct > 0 ? ` · ${pct}% shorter than aisle by aisle from any free slot` : ''}`);
    };
    svg.classList.add('init');
    show(false);
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('init')));
    walk.style.strokeDasharray = '1 99999';
    once(host, () => { seen = true; show(true); });
    const fig = host.closest('.fig');
    seg($('[aria-label="Routing"]', fig), 'pickRoute', (k) => { rt = k; show(seen); });
    seg($('[aria-label="Product positioning"]', fig), 'pickSlot', (k) => { slot = k; show(seen); });
  }

  // ── Fig 9 · One truckload. Seven stacks, two cartons deep. Pallets: two tiers of pallet + 3 cartons. Slip sheets:
  // 4 + 3 cartons on sheets 1/16 as thick. 84 → 98 cartons, +16.7%. ────────────────────────────────────────────
  function truck() {
    const host = $('[data-fig="truck"]');
    if (!host) return;
    const W = 1000, H = 330, FL = 270, CH = 30;
    const palY = (r) => (r < 3 ? 220 - 30 * r : 110 - 30 * (r - 3)), slipY = (r) => (r < 4 ? 238.5 - 30 * r : 117 - 30 * (r - 4));
    let out = h('rect', { x: 40, y: 36, width: 720, height: 246, rx: 6, class: 'shell' });
    out += h('path', { d: 'M770,282 V150 Q770,128 790,124 L872,112 Q884,110 890,122 L918,190 Q922,198 922,208 V282 Z', class: 'cab' });
    out += h('path', { d: 'M786,140 L866,128 Q874,127 877,135 L896,186 H786 Z', style: 'fill:var(--rule);stroke:var(--g0);stroke-width:1' });
    out += h('rect', { x: 30, y: 282, width: 900, height: 10, rx: 3, style: 'fill:var(--g0)' });
    [118, 166, 640, 688, 858].forEach((x) => { out += h('circle', { cx: x, cy: 300, r: 21, class: 'tyre' }) + h('circle', { cx: x, cy: 300, r: 8, class: 'hub' }); });
    for (let c = 0; c < 7; c++) {
      const x = 60 + c * 98;
      [250, 140].forEach((y, t) => {
        out += h('g', { class: 'base pal', style: `transform-box:fill-box;transform-origin:50% 100%;transition-delay:${c * 30}ms` },
          h('rect', { x, y, width: 92, height: 4, rx: 1, class: 'wood' }) +
          [x + 2, x + 41, x + 80].map((bx) => h('rect', { x: bx, y: y + 4, width: 10, height: 12, class: 'wood' })).join('') +
          h('rect', { x, y: y + 16, width: 92, height: 4, rx: 1, class: 'wood' }));
        const sy = t ? 147 : 268.5;
        out += h('g', { class: 'base slip' }, h('rect', { x: x - 2, y: sy, width: 96, height: 1.5, class: 'sheet' }) + h('path', { d: `M${x - 2},${sy + 1.5} l-5,-5`, style: 'stroke:var(--pk);stroke-width:1.5' }));
      });
      for (let s = 0; s < 2; s++) {
        for (let r = 0; r < 7; r++) {
          const cx = x + s * 47;
          out += h('g', { class: 'cart', 'data-r': r, 'data-x': cx, style: `transition-delay:${r * 45 + c * 20}ms` },
            h('rect', { x: 0, y: 0, width: 45, height: CH - 1, rx: 2, class: 'cb' }) + h('line', { x1: 3, x2: 42, y1: 6, y2: 6 }) + h('rect', { x: 30, y: 17, width: 10, height: 6, rx: 1, style: 'fill:var(--card);opacity:.75' }));
        }
      }
    }
    host.innerHTML = svgOf(W, H, out, { class: 'truck', 'aria-label': 'A truck loaded on pallets or on slip sheets' });
    const svg = $('svg', host), fig = host.closest('.fig');
    const set = (k) => {
      const slip = k === 'slip';
      fig.classList.toggle('truck-slip', slip);
      $$('.cart', svg).forEach((g) => {
        const r = +g.dataset.r, y = slip ? slipY(r) : r === 6 ? 20 : palY(r);
        g.style.transform = `translate(${g.dataset.x}px, ${y}px)`;
        g.style.opacity = slip || r < 6 ? '1' : '0';
      });
      $$('.pal', svg).forEach((g) => { g.style.opacity = slip ? '0' : '1'; g.style.transform = slip ? 'scaleY(.08)' : 'none'; });
      $$('.slip', svg).forEach((g) => { g.style.opacity = slip ? '1' : '0'; });
      $('[data-vb="base"]', fig).textContent = slip ? '0.9%' : '14.43%';
      $('[data-vb="load"]', fig).textContent = slip ? '99.1%' : '85.57%';
      $('[data-vb="base-name"]', fig).textContent = slip ? 'Slip sheets' : 'Pallets';
      read('truck', slip ? '98 cartons a trip, 17% more' : '84 cartons a trip');
    };
    svg.classList.add('init');
    set('pallet');
    requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('init')));
    seg($('.seg', fig), 'load', set);
  }

  // ── Fig 10 · The bag ────────────────────────────────────────────────────────────────────────────────────────
  function flip() {
    const b = $('.flip');
    if (!b) return;
    b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      read('flip', on ? 'Inside out, it’s a handbag' : 'Delivered');
    });
  }

  // ── Fig 11 · Two loops: the box between fulfilment and dispatch, the bag between dispatch and home ──────────
  function loop() {
    const host = $('[data-fig="loop"]');
    if (!host) return;
    const xs = [56, 196, 336, 476, 636], Y = 190, names = ['Plant', 'Warehouse', 'Fulfilment\ncentre', 'Dispatch\ncentre', 'Customer'];
    let out = '';
    for (let i = 0; i < 4; i++) out += arrow(`M${xs[i] + 52},${Y} H${xs[i + 1] - 56}`, 'ln-s', 'ah-s');
    const boxGo = `M${xs[2]},${Y - 28} C${xs[2]},${Y - 96} ${xs[3]},${Y - 96} ${xs[3]},${Y - 32}`;
    const boxBack = `M${xs[3] - 12},${Y + 28} C${xs[3] - 12},${Y + 100} ${xs[2]},${Y + 100} ${xs[2]},${Y + 32}`;
    const bagBack = `M${xs[4]},${Y + 28} C${xs[4]},${Y + 92} ${xs[3] + 14},${Y + 92} ${xs[3] + 14},${Y + 32}`;
    out += arrow(boxGo, 'ln s-pk', 'ah-pk', { style: 'stroke-width:1.75' }) + arrow(boxBack, 'ln s-pk', 'ah-pk', { style: 'stroke-width:1.75' });
    out += arrow(bagBack, 'ln-k', 'ah', {});
    out += arrow(`M${xs[3] + 52},${Y} H${xs[4] - 56}`, 'ln-k', 'ah', { style: 'stroke-width:1.75' });
    out += text('Box with the bag inside', (xs[2] + xs[3]) / 2, Y - 92, 'tx-s', { 'text-anchor': 'middle' });
    out += text('Box rides back, several\ntimes, then is recycled', (xs[2] + xs[3]) / 2 - 6, Y + 104, 'tx-s', { 'text-anchor': 'middle' });
    out += text('Bag returned\nfor Green Points', (xs[3] + xs[4]) / 2 + 8, Y + 96, 'tx-s', { 'text-anchor': 'middle' });
    out += text('Bag', (xs[3] + xs[4]) / 2, Y - 14, 'tx-s', { 'text-anchor': 'middle' });
    names.forEach((n, i) => { out += box(xs[i] - 52, Y - 28, 104, 56, n, i === 2 || i === 3 ? 'fs-pk s-pk' : 'box', 'tx-b'); });
    out += icon('handbag', xs[4] - 12, Y - 70, 24, 'c-k') + text('Kept as a handbag', xs[4], Y - 84, 'tx-s', { 'text-anchor': 'middle' });
    if (!still) {
      const dot = (d, cls, b) => h('circle', { r: 4, class: `dot ${cls}` }, h('animateMotion', { dur: '4.5s', repeatCount: 'indefinite', begin: b, path: d, keyPoints: '0;1', keyTimes: '0;1', calcMode: 'spline', keySplines: '.45 0 .55 1' }));
      out += dot(boxGo, '', '0s') + dot(boxBack, '', '2.25s') + dot(bagBack, 'k', '1.1s');
    }
    host.innerHTML = svgOf(700, 330, out, { class: 'loop', 'aria-label': 'The box loop and the bag loop' });
  }

  // ── Fig 12 · Disposition by category ────────────────────────────────────────────────────────────────────────
  const OUTS = ['Donated', 'Resold in secondary markets', 'Sold in bulk', 'Refunded, no return', 'Packaging recycled', 'Recycled into roads and fibres', 'Disposed'];
  const CATS = {
    food: { name: 'Food and\nbeverages', on: { 0: 'Intact deadstock', 4: 'From returns', 6: 'Returned product' }, read: 'Returned food is disposed and its packaging recycled. Intact deadstock is donated.' },
    care: { name: 'Personal care,\nhousehold and\nhealth supplements', on: { 3: 'Most refunds', 4: 'From returns', 6: 'Returned products', 2: 'Cleaning products, to laundries' }, read: 'Most refunds need no return. Returns are disposed and their packaging recycled. Cleaning products are consolidated in warehouses and sold in bulk to laundries and similar buyers.' },
    paper: { name: 'Paper and\nstationery', on: { 1: 'Unopened deadstock and returns', 5: 'Damaged products' }, read: 'Unopened deadstock and returns are resold in secondary markets. Damaged stationery is recycled into roads and fibres.' },
  };
  function disp() {
    const host = $('[data-fig="disp"]');
    if (!host) return;
    const oy = (i) => 54 + i * 56, CX = 450, CYc = 214;
    let out = box(0, 116, 150, 52, 'Returns', 'fs-rt s-rt', 'tx-b') + box(0, 260, 150, 52, 'Deadstock', 'fs-rt s-rt', 'tx-b');
    out += arrow('M152,142 C200,142 200,200 254,206', 'ln-s', 'ah-s') + arrow('M152,286 C200,286 200,228 254,222', 'ln-s', 'ah-s');
    out += h('rect', { x: 260, y: CYc - 50, width: 190, height: 100, rx: 14, class: 'box-k' }) + h('g', { class: 'cat' }, '');
    OUTS.forEach((n, i) => {
      out += h('path', { d: `M${CX + 2},${CYc} C${CX + 90},${CYc} ${CX + 80},${oy(i)} ${634},${oy(i)}`, class: 'ln s-rt de', 'marker-end': 'url(#ah-rt)', 'data-o': i, style: 'stroke-width:1.5' });
      out += h('g', { class: 'out', 'data-o': i },
        h('rect', { x: 640, y: oy(i) - 24, width: 360, height: 48, rx: 10, class: 'box' }) +
        h('text', { x: 658, y: oy(i), dy: '0.35em', class: 'tx-b' }, esc(n)) +
        h('text', { x: 984, y: oy(i), dy: '0.35em', 'text-anchor': 'end', class: 'tx-s sub' }, ''));
    });
    host.innerHTML = svgOf(1000, 440, out, { class: 'disp', 'aria-label': 'Where returns and deadstock go, by product category' });
    const svg = $('svg', host);
    const pick = (k) => {
      const c = CATS[k];
      $('.cat', svg).innerHTML = text(c.name, 355, CYc, 'tx-h', { 'text-anchor': 'middle' }, 18);
      $$('.out', svg).forEach((g) => { const o = +g.dataset.o, on = o in c.on; g.classList.toggle('on', on); g.querySelector('.sub').textContent = on ? c.on[o] : ''; });
      $$('.de', svg).forEach((p) => p.classList.toggle('on', +p.dataset.o in c.on));
      read('disp', c.read);
    };
    pick('food');
    seg($('.seg', host.closest('.fig')), 'cat', pick);
  }

  // ── Fig 13 · Plastic into road: 1 t per km, 3.5 t of credits per km ─────────────────────────────────────────
  function road() {
    const host = $('[data-fig="road"]'), input = $('#road-t');
    if (!host || !input) return;
    const W = 1000, MAX = 500, px = W / MAX;
    let out = h('rect', { x: 0, y: 26, width: W, height: 48, rx: 8, style: 'fill:var(--chip)' });
    out += h('g', { class: 'paved' }, h('rect', { x: 0, y: 26, width: 0, height: 48, rx: 8, class: 'asphalt' }) + h('line', { x1: 0, x2: 0, y1: 50, y2: 50, class: 'lane' }) + h('line', { x1: 8, x2: 0, y1: 31, y2: 31, class: 'edge' }) + h('line', { x1: 8, x2: 0, y1: 69, y2: 69, class: 'edge' }));
    for (let k = 0; k <= MAX; k += 50) out += h('line', { x1: k * px, x2: k * px, y1: 82, y2: 88, class: 'ln-s' }) + h('text', { x: Math.min(W - 2, Math.max(2, k * px)), y: 104, 'text-anchor': k === 0 ? 'start' : k === MAX ? 'end' : 'middle', class: 'tx-m' }, `${k} km`);
    host.innerHTML = svgOf(W, 112, out, { class: 'road', 'aria-label': 'Length of road made from the plastic' });
    const svg = $('svg', host), parts = $('.paved', svg);
    let shown = 0, target = +input.value, raf = 0;
    const paint = (v) => {
      const w = v * px;
      parts.children[0].setAttribute('width', w.toFixed(1));
      parts.children[1].setAttribute('x2', Math.max(0, w - 8).toFixed(1));
      parts.children[2].setAttribute('x2', Math.max(8, w - 8).toFixed(1));
      parts.children[3].setAttribute('x2', Math.max(8, w - 8).toFixed(1));
    };
    const tick = () => {
      shown += (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.2) shown = target;
      paint(shown);
      if (shown !== target) raf = requestAnimationFrame(tick);
    };
    const fmt = (v) => v.toLocaleString('en-GB');
    const set = () => {
      target = +input.value;
      $('[data-road="t"]').textContent = `${fmt(target)} t`;
      $('[data-road="km"]').textContent = fmt(target);
      $('[data-road="cc"]').textContent = fmt(Math.round(target * 3.5));
      cancelAnimationFrame(raf);
      if (still) { shown = target; paint(shown); } else raf = requestAnimationFrame(tick);
    };
    input.addEventListener('input', set);
    once(host, set);
    paint(0);
  }

  // ── Fig 14 · Five years. Bars are each solution's phases; drag the line to read a year. ─────────────────────
  const GANTT = [
    ['Sustainable tertiary\npackaging', [[1, 2, '14%'], [2, 3, '24.75%'], [3, 4, '61.25%']]],
    ['Warehouse and\ninventory automation', [[0, 1, '35%'], [1, 2, '65%'], [2, 5, 'R&D', 1]]],
    ['Convertible\ndelivery bag', [[0, 1, 'R&D', 1], [1, 2, '10%'], [2, 3, '18.5%'], [3, 4, '30%'], [4, 5, '41.5%']]],
    ['Last mile\noptimisation', [[0, 1, 'Tier 1'], [1, 2, 'Tier 2 and 3'], [2, 5, 'R&D', 1]]],
    ['Systematic waste\nmanagement', [[2, 3, 'Tier 1'], [3, 4, 'Tier 2 and 3'], [4, 5, 'R&D', 1]]],
  ];
  const SHORT = ['Tertiary packaging', 'Warehouse', 'Delivery bag', 'Last mile', 'Waste'];
  function gantt() {
    const host = $('[data-fig="gantt"]');
    if (!host) return;
    const W = 1000, X0 = 240, X1 = 990, yr = (t) => X0 + (t / 5) * (X1 - X0), ry = (i) => 30 + i * 60, BH = 42, H = 366;
    let out = '';
    out += h('rect', { x: 0, y: 14, width: yr(1) - yr(0), height: 306, rx: 10, class: 'band' });
    for (let t = 0; t <= 5; t++) out += h('line', { x1: yr(t), x2: yr(t), y1: 16, y2: 318, class: 'ln', style: t % 5 ? 'stroke:var(--rule)' : '' }) + h('text', { x: yr(t), y: 340, 'text-anchor': 'middle', class: 'tx-b' }, String(t));
    out += h('text', { x: X0 - 22, y: 340, 'text-anchor': 'end', class: 'tx-s' }, 'Year');
    GANTT.forEach(([n, ph], i) => {
      out += text(n, 0, ry(i) + BH / 2, 'tx-b', {}, 16);
      ph.forEach(([a, b, l, rd], j) => {
        const x = yr(a) + 1, w = yr(b) - yr(a) - 2;
        out += h('g', { class: 'bar', 'data-r': i, 'data-a': a, 'data-b': b, 'data-j': j },
          h('rect', { x, y: ry(i), width: w, height: BH, rx: 6, style: rd ? 'fill:url(#hatch);stroke:var(--rule2)' : 'fill:var(--strong)' }) +
          h('text', { x: x + w / 2, y: ry(i) + BH / 2, dy: '0.35em', 'text-anchor': 'middle', class: rd ? 'tx-s' : 'tx-b', style: rd ? '' : 'fill:var(--card)' }, esc(l)));
      });
    });
    out += h('rect', { x: X0, y: 10, width: X1 - X0, height: 312, class: 'hit' });
    out += h('g', { class: 'scrub', tabindex: 0, role: 'slider', 'aria-label': 'Year', 'aria-valuemin': 0, 'aria-valuemax': 5 },
      h('line', { x1: 0, x2: 0, y1: 2, y2: 14, class: 'now' }) + h('circle', { cx: 0, cy: 6, r: 6, class: 'knob' }));
    host.innerHTML = svgOf(W, H, out, { class: 'gantt', 'aria-label': 'Five-year timeline of the five solutions' });
    const svg = $('svg', host), scrub = $('.scrub', svg);
    let t = 0.5, shown = 0.5, raf = 0;
    const band = $('.band', svg);
    const place = (v) => {
      scrub.setAttribute('transform', `translate(${yr(v)} 0)`);
      band.setAttribute('x', yr(Math.max(0, Math.min(4, v - 0.5))).toFixed(1));
    };
    const set = (v, now) => {
      t = Math.max(0, Math.min(4.999, v));
      const y = Math.floor(t);
      const parts = GANTT.map(([, ph], i) => { const p = ph.find(([a, b]) => t >= a && t < b); return p ? `${SHORT[i]} ${p[2]}` : null; }).filter(Boolean);
      $$('.bar', svg).forEach((g) => g.classList.toggle('off', !(t >= +g.dataset.a && t < +g.dataset.b)));
      scrub.setAttribute('aria-valuenow', y + 1);
      scrub.setAttribute('aria-valuetext', `Year ${y + 1}`);
      read('gantt', `<b>Year ${y + 1}</b> · ${parts.join(' · ')}`);
      cancelAnimationFrame(raf);
      const goal = y + 0.5;
      if (now || still) { shown = goal; place(goal); return; }
      const step = () => { shown += (goal - shown) * 0.18; if (Math.abs(goal - shown) < 0.002) shown = goal; place(shown); if (shown !== goal) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const toT = (e) => { const r = svg.getBoundingClientRect(), x = ((e.clientX - r.left) / r.width) * W; return ((x - X0) / (X1 - X0)) * 5; };
    const down = (e) => {
      svg.classList.add('drag');
      set(toT(e));
      svg.setPointerCapture(e.pointerId);
      svg.onpointermove = (ev) => set(toT(ev));
      svg.onpointerup = svg.onpointercancel = () => { svg.onpointermove = null; svg.classList.remove('drag'); };
    };
    $('.hit', svg).addEventListener('pointerdown', down);
    scrub.addEventListener('pointerdown', down);
    $$('.bar', svg).forEach((g) => g.addEventListener('pointerdown', down));
    scrub.addEventListener('keydown', (e) => {
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (k) { e.preventDefault(); set(Math.floor(t) + 0.5 + k); }
      if (e.key === 'Home') { e.preventDefault(); set(0.5); }
      if (e.key === 'End') { e.preventDefault(); set(4.5); }
    });
    set(0.5, true);
  }

  // ── Fig 15 · Rollout by grade and type (Grade C taken as 15%, the share that makes the report's totals add up) ─
  const ROLL = [
    { t: 'Sustainable tertiary packaging', by: 'warehouse grade', d: 'pk', groups: [['Grade A', 35], ['Grade B', 50], ['Grade C', 15]], unit: 'warehouses',
      years: [[[0, 40]], [[0, 60], [1, 7.5]], [[1, 92.5], [2, 100]]] },
    { t: 'Warehouse and inventory automation', by: 'warehouse grade', d: 'wh', groups: [['Grade A', 35], ['Grade B', 50], ['Grade C', 15]], unit: 'warehouses',
      years: [[[0, 100]], [[1, 100], [2, 100]]] },
    { t: 'Convertible delivery bag', by: 'product type, by volume', d: 'pk', groups: [['Type 1', 50], ['Type 2', 35], ['Type 3', 15]], unit: 'products',
      years: [[], [[0, 20]], [[0, 30], [1, 10]], [[0, 40], [1, 20], [2, 20]], [[0, 10], [1, 70], [2, 80]]] },
  ];
  function rollout() {
    const host = $('[data-fig="rollout"]');
    if (!host) return;
    const W = 320, H = 210, X0 = 34, X1 = 312, Y0 = 176, Y1 = 22, MAXV = 70, yv = (v) => Y0 - (v / MAXV) * (Y0 - Y1);
    const tone = [100, 58, 30];
    host.innerHTML = ROLL.map((c, ci) => {
      const n = c.years.length, slot = (X1 - X0) / n, bw = Math.min(44, slot * 0.56);
      let out = '';
      [0, 20, 40, 60].forEach((v) => { out += h('line', { x1: X0, x2: X1, y1: yv(v), y2: yv(v), class: 'ln', style: v ? 'stroke:var(--rule)' : '' }) + h('text', { x: X0 - 8, y: yv(v), dy: '0.35em', 'text-anchor': 'end', class: 'tx-m' }, `${v}%`); });
      c.years.forEach((segs, yi) => {
        const cx = X0 + slot * (yi + 0.5);
        let acc = 0;
        segs.forEach(([g, p], si) => {
          const v = (p * c.groups[g][1]) / 100, y = yv(acc + v), hh = yv(acc) - y;
          out += h('rect', { x: cx - bw / 2, y, width: bw, height: Math.max(0, hh - 2), rx: si === segs.length - 1 ? 4 : 1, class: 'seg-b', 'data-c': ci, 'data-y': yi, 'data-s': si, style: `fill:color-mix(in srgb,var(--${c.d}) ${tone[g]}%,var(--card))` });
          acc += v;
        });
        const total = segs.reduce((s, [g, p]) => s + (p * c.groups[g][1]) / 100, 0);
        out += h('text', { x: cx, y: total ? yv(total) - 8 : Y0 - 10, 'text-anchor': 'middle', class: total ? 'tx-b' : 'tx-m', style: 'font-size:12px' }, total ? `${+total.toFixed(2)}%` : 'R&D');
        out += h('text', { x: cx, y: Y0 + 20, 'text-anchor': 'middle', class: 'tx-s' }, `Y${yi + 1}`);
      });
      const key = c.groups.map(([gn, gs], g) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:12px"><i style="width:9px;height:9px;border-radius:2px;display:inline-block;background:color-mix(in srgb,var(--${c.d}) ${tone[g]}%,var(--card))"></i>${gn} · ${gs}%</span>`).join('');
      return `<div><h3>${c.t}</h3><p>By ${c.by}</p>${svgOf(W, H, out, { 'aria-label': `${c.t} rollout by year` })}<p style="margin:8px 0 0">${key}</p></div>`;
    }).join('');
    const lit = (b) => {
      host.classList.toggle('hl', !!b);
      $$('.seg-b', host).forEach((r) => r.classList.toggle('on', r === b));
      if (!b) return read('rollout', 'Year 1 is each solution’s first year of rollout.');
      const c = ROLL[+b.dataset.c], [g, p] = c.years[+b.dataset.y][+b.dataset.s];
      read('rollout', `<b>${c.t}, year ${+b.dataset.y + 1}</b> · ${c.groups[g][0]}: ${p}% of its ${c.unit} = ${+((p * c.groups[g][1]) / 100).toFixed(2)}% of the network`);
    };
    $$('.seg-b', host).forEach((r) => { r.addEventListener('pointerenter', () => lit(r)); r.addEventListener('pointerleave', () => lit(null)); });
  }

  // ── Chapter locators: the chain from Fig 2 in miniature, with the chapter's stages in colour ──────────────
  function locators() {
    const K = 0.62, GAP = 6, CY = 26;
    const rad = (s) => (s.k ? 3 : s.r * K);
    const xs = [];
    CHAIN.forEach((s, i) => xs.push(i ? xs[i - 1] + rad(CHAIN[i - 1]) + GAP + rad(s) : 6));
    const W = xs[xs.length - 1] + 8;
    $$('.loc[data-loc]').forEach((host) => {
      const on = (CHAIN_SOL[host.dataset.loc] || [[]])[0] || [];
      let out = h('line', { x1: xs[0], y1: CY, x2: xs[xs.length - 1], y2: CY, class: 'ln' });
      CHAIN.forEach((s, i) => {
        const lit = on.includes(i);
        out += s.k ? h('rect', { x: xs[i] - 3, y: CY - 3, width: 6, height: 6, rx: 1, style: 'fill:var(--g0)' })
          : h('circle', { cx: xs[i], cy: CY, r: rad(s), class: lit ? `f-${s.d}` : '', style: lit ? '' : 'fill:var(--g3)' });
      });
      if (on.includes('rt')) out += h('path', { d: `M${xs[13]},${CY + 6} V48 H${xs[8]} V${CY + 13}`, class: 'ln s-rt', style: 'stroke-width:1.5', 'marker-end': 'url(#ah-rt)' });
      host.innerHTML = svgOf(W, 56, out, { 'aria-hidden': 'true' });
    });
  }

  // ── Covers: isometric drawings built by scripts/blue-yonder-covers.mjs, fetched as they come near ─────────────
  function covers() {
    const load = (el) => fetch(`covers/${el.dataset.cover}.svg`).then((r) => (r.ok ? r.text() : '')).then((t) => {
      el.innerHTML = t;
      el.classList.add('in');
      if (el.dataset.cover === 'journey') journey(el);
    }).catch(() => {});
    const els = $$('[data-cover]');
    if (!('IntersectionObserver' in window)) return els.forEach(load);
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); load(e.target); } }), { rootMargin: '900px 0px' });
    els.forEach((el) => io.observe(el));
  }
  // The hero row: each tile goes to its chapter, and lifts with its label on hover.
  function journey(el) {
    const ids = ['plant', 'warehouse', 'packing', 'last-mile', 'returns'], links = $$('.stops a');
    $$('g[data-stop]', el).forEach((g, i) => {
      const lit = (on) => { g.classList.toggle('on', on); links[i] && links[i].classList.toggle('on', on); };
      g.addEventListener('pointerenter', () => lit(true));
      g.addEventListener('pointerleave', () => lit(false));
      g.addEventListener('click', () => document.getElementById(ids[i]).scrollIntoView({ behavior: still ? 'auto' : 'smooth' }));
      links[i] && links[i].addEventListener('pointerenter', () => lit(true));
      links[i] && links[i].addEventListener('pointerleave', () => lit(false));
    });
  }

  // ── Wide figures: on a narrow screen diagrams scroll sideways, with a bar that stays visible (touch browsers
  // hide native scrollbars). Drag the bar or tap the track to move. ────────────────────────────────────────────
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
    };
    box.addEventListener('scroll', sync, { passive: true });
    new ResizeObserver(sync).observe(box);
    bar.addEventListener('pointerdown', (e) => {
      const rect = bar.getBoundingClientRect();
      const over = box.scrollWidth - box.clientWidth, tw2 = rect.width * (box.clientWidth / box.scrollWidth);
      const left = (box.scrollLeft / over) * (rect.width - tw2);
      let grab = e.clientX - rect.left - left;
      if (grab < 0 || grab > tw2) grab = tw2 / 2;
      const move = (ev) => { box.scrollLeft = ((ev.clientX - rect.left - grab) / (rect.width - tw2)) * over; };
      move(e);
      bar.setPointerCapture(e.pointerId);
      bar.onpointermove = move;
      bar.onpointerup = bar.onpointercancel = () => { bar.onpointermove = null; };
    });
  }
  function wrapWide() {
    $$('.diagram > svg, .journey .j-in').forEach((el) => {
      const box = document.createElement('div');
      box.className = 'hs';
      el.before(box);
      box.append(el);
      hscroll(box);
    });
  }

  // ── Contents rail: appears once the hero figure has scrolled away, and marks the section being read ─────────
  function toc() {
    const links = new Map();
    $$('.toc a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
    if (!links.size || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('on'));
        const a = links.get(e.target.id);
        if (a) a.classList.add('on');
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    const hero = $('.hero-fig');
    if (hero) new IntersectionObserver((es) => { document.documentElement.classList.toggle('toc-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(hero);
  }

  // ── Figures and numbers ease in once ──────────────────────────────────────────────────────────────────────
  function reveal() {
    if (still || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('reveal');
    const ro = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.by .fig:not(.hero-fig), .by .stats, .by .targets, .by .ch-head, .by .probs, .by .steps').forEach((el) => ro.observe(el));
  }

  const build = () => {
    [chain, waffle, domains, priorities, reply, route, wms, pick, truck, flip, loop, disp, road, gantt, rollout, locators, covers].forEach((f) => {
      try { f(); } catch (err) { console.error(f.name, err); }
    });
    wrapWide();
    toc();
    reveal();
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
})();
