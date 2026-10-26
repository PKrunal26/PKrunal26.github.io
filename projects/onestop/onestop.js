// OneStop page: sideways scrolling for wide figures and screen rows, the
// contents rail, and the test scores easing in once.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ── Wide figures: on a narrow screen diagrams, tables and rows of screens
  // scroll sideways, with a bar that stays visible (touch browsers hide native
  // scrollbars). Drag the bar or tap the track to move.
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
      const left = (box.scrollLeft / over) * (rect.width - tw);
      let grab = e.clientX - rect.left - left;
      if (grab < 0 || grab > tw) grab = tw / 2;
      const move = (ev) => { box.scrollLeft = ((ev.clientX - rect.left - grab) / (rect.width - tw)) * over; };
      move(e);
      bar.setPointerCapture(e.pointerId);
      bar.onpointermove = move;
      bar.onpointerup = bar.onpointercancel = () => { bar.onpointermove = null; };
    });
  }
  $$('.diagram > svg, .cmap > svg, .day-grid, .ttdoc-in, .ia-in, .tbl > table, .screens .stage > .row').forEach((el) => {
    const box = document.createElement('div');
    box.className = 'hs';
    el.before(box);
    box.append(el);
    hscroll(box);
  });

  // ── Contents rail: appears once the hero has scrolled away, and marks the
  // section being read ─────────────────────────────────────────────────────
  const links = new Map();
  $$('.toc a').forEach((a) => links.set(a.getAttribute('href').slice(1), a));
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
    const hero = $('.hero-fig');
    if (hero) new IntersectionObserver((es) => { document.documentElement.classList.toggle('toc-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(hero);
  }

  // ── Test scores fill in once ─────────────────────────────────────────────
  if (!still && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal');
    const ro = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.os .tests').forEach((el) => ro.observe(el));
  }
})();
