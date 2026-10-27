// CV page. Draws the timeline, then runs the scroll effects: text fades up as it arrives, the bars grow in, the stats
// count up, and the journey rail fills to a reading line, marking each stop it passes and lighting the current date.
// "now" is read from the clock, so the ongoing bar keeps up on its own. The page head adds .cv-motion unless the
// reader prefers reduced motion; without it everything is shown at once and only the rail still follows the scroll.
(() => {
  const motion = document.documentElement.classList.contains('cv-motion');
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const fig = document.querySelector('.span');
  if (fig) {
    const today = new Date();
    const now = today.getFullYear() + (today.getMonth() + today.getDate() / 31) / 12;
    const start = 2020;
    const end = Math.max(2027, Math.ceil(now + 0.1));
    const at = t => (t - start) / (end - start);
    // "2023-05" starts at the beginning of May; as an end it runs to the end of that month.
    const month = (s, edge) => s === 'now' ? now : +s.slice(0, 4) + (+s.slice(5, 7) - 1 + edge) / 12;

    const lines = [];
    for (let y = start; y < end; y++) lines.push(`<i style="left:${at(y) * 100}%"></i>`);
    for (const track of fig.querySelectorAll('.span-track')) track.insertAdjacentHTML('afterbegin', lines.join(''));

    const axis = fig.querySelector('.span-axis .span-track');
    for (let y = start; y < end; y++) axis.insertAdjacentHTML('beforeend', `<b class="${y % 2 ? 'odd' : ''}" style="left:${at(y) * 100}%">${y}</b>`);

    fig.querySelectorAll('.span-row').forEach((row, i) => {
      const bar = row.querySelector('.span-bar');
      const from = month(row.dataset.from, 0), to = month(row.dataset.to, 1);
      bar.style.setProperty('--a', at(from));
      bar.style.setProperty('--b', at(to));
      bar.style.setProperty('--i', i);
      if (row.dataset.split) bar.style.setProperty('--s', (month(row.dataset.split, 0) - from) / (to - from) * 100 + '%');
      bar.classList.toggle('on', row.dataset.to === 'now');
    });

    // Sideways scroll on narrow screens: a bar under the chart that stays visible; drag it or tap the track.
    const box = fig.querySelector('.span-scroll');
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
      box.classList.toggle('at-end', p > 0.99);
    };
    box.addEventListener('scroll', sync, { passive: true });
    new ResizeObserver(sync).observe(box);
    bar.addEventListener('pointerdown', e => {
      const rect = bar.getBoundingClientRect();
      const over = box.scrollWidth - box.clientWidth, tw = rect.width * (box.clientWidth / box.scrollWidth);
      let grab = e.clientX - rect.left - (box.scrollLeft / over) * (rect.width - tw);
      if (grab < 0 || grab > tw) grab = tw / 2;
      const move = ev => { box.scrollLeft = ((ev.clientX - rect.left - grab) / (rect.width - tw)) * over; };
      move(e);
      bar.setPointerCapture(e.pointerId);
      bar.onpointermove = move;
      bar.onpointerup = bar.onpointercancel = () => { bar.onpointermove = null; };
    });

    if (motion) {
      fig.classList.add('anim');
      const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(() => fig.classList.add('drawn'));
      }, { threshold: 0.3 });
      io.observe(fig);
    }
  }

  if (motion) {
    // Items that arrive together come in one after another, 70ms apart.
    const seen = new IntersectionObserver(entries => {
      let n = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.style.setProperty('--d', Math.min(n++, 5) * 0.07 + 's');
        entry.target.classList.add('in');
        seen.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.cv .about>p, .stats>li, .cv section>h2, .steps .what>*, .rows>div, .cv .contact>p, .span figcaption').forEach(el => seen.observe(el));

    const count = el => {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now();
      const tick = time => {
        const t = Math.min(1, (time - t0) / 1400);
        el.textContent = Math.round(target * easeOut(t)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const counters = document.querySelectorAll('[data-count]');
    counters.forEach(el => { el.textContent = '0' + (el.dataset.suffix || ''); });
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.unobserve(entry.target);
      count(entry.target);
    }), { threshold: 1 });
    counters.forEach(el => io.observe(el));
  }

  const steps = document.querySelector('.steps');
  if (steps) {
    const stops = [...steps.children];
    let queued = false;
    const update = () => {
      queued = false;
      const box = steps.getBoundingClientRect();
      const fill = Math.max(0, Math.min(box.height, innerHeight * 0.55 - box.top));
      steps.style.setProperty('--fill', fill + 'px');
      // A stop is passed once the fill reaches its dot (8px down, 7px tall). The last one passed is being read.
      let current = null;
      for (const li of stops) {
        const passed = fill >= li.offsetTop + 11;
        li.classList.toggle('passed', passed);
        if (passed) current = li;
      }
      for (const li of stops) li.classList.toggle('current', li === current);
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    update();
  }
})();
