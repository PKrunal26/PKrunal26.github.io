// Escher case study: behaviour for the product screens and the generative UI figures
// (built by scripts/escher-screens.mjs). Each one starts when it scrolls into view, stops
// when it leaves, and shows its finished state under reduced motion.
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  function inView(el, on, off, margin) {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) on(); else if (off) off(); });
    }, { rootMargin: margin || '0px 0px -15% 0px' }).observe(el);
  }
  function timers() {
    var list = [];
    return {
      at: function (fn, ms) { list.push(setTimeout(fn, ms)); },
      clear: function () { list.forEach(clearTimeout); list = []; },
    };
  }

  // ── One question, two answers.
  $$('[data-live="compare"]').forEach(function (fig) {
    var btns = $$('.seg button', fig);
    var nums = $$('.gu-score b', fig);
    var touched = false;
    function count(b, to) {
      var from = +b.textContent || 0;
      if (still || from === to) { b.textContent = to; return; }
      var t0 = performance.now();
      (function step(now) {
        var f = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - f, 3);
        b.textContent = Math.round(from + (to - from) * e);
        if (f < 1) requestAnimationFrame(step);
      })(t0);
    }
    function set(mode) {
      fig.dataset.mode = mode;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === mode); });
      nums.forEach(function (b) { count(b, +b.dataset[mode]); });
      $$('.gu-pane', fig).forEach(function (p) { p.toggleAttribute('inert', p.dataset.pane !== mode); });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { touched = true; set(b.dataset.mode); }); });
    set('text');
    // Notes light up their pins, and pins light up their notes.
    function hi(n, on) {
      $$('.gu-pane[data-pane="' + fig.dataset.mode + '"] .gu-pin[data-pin="' + n + '"]', fig).forEach(function (p) { p.classList.toggle('hi', on); });
    }
    $$('.gu-notes li', fig).forEach(function (li) {
      li.addEventListener('mouseenter', function () { hi(li.dataset.pin, true); });
      li.addEventListener('mouseleave', function () { hi(li.dataset.pin, false); });
    });
    // Citations open on click as well as hover, for touch.
    $$('.gu-c', fig).forEach(function (c) {
      c.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var open = !c.classList.contains('open');
        $$('.gu-c.open', fig).forEach(function (o) { o.classList.remove('open'); });
        c.classList.toggle('open', open);
      });
    });
    document.addEventListener('click', function () { $$('.gu-c.open', fig).forEach(function (o) { o.classList.remove('open'); }); });
    // Show the plain answer first, then the interface, once, unless the reader has chosen.
    var wait = 0;
    inView(fig, function () {
      if (touched || still || wait) return;
      wait = setTimeout(function () { if (!touched) { touched = true; set('ui'); } }, 3200);
    }, function () { clearTimeout(wait); wait = 0; }, '0px 0px -35% 0px');
  });

  // ── Built while it streams: type each statement; when it parses, its part fills in.
  $$('[data-live="stream2"]').forEach(function (fig) {
    var lines = $$('.st-lines li', fig);
    var rootEl = $('.st-root', fig);
    var done = $('[data-c="done"]', fig), wait = $('[data-c="wait"]', fig);
    var T = timers(), started = false;
    var refs = { root: ['lead', 'head', 'drivers', 'take', 'next'], drivers: ['driver', 'kind', 'amount'], next: ['f1', 'f2'] };
    function parts(k) { return $$('[data-k="' + k + '"]', rootEl.parentNode).filter(function (n) { return !n.matches('li'); }); }
    function reset() {
      T.clear();
      fig.classList.remove('done');
      rootEl.classList.remove('on');
      $$('.st-slot, .st-col', fig).forEach(function (s) { s.classList.remove('on'); });
      lines.forEach(function (li) { li.classList.remove('typing', 'parsed'); li.style.setProperty('--c', 0); });
      done.textContent = 0; wait.textContent = 0;
    }
    function finish() {
      T.clear();
      rootEl.classList.add('on');
      $$('.st-slot, .st-col', fig).forEach(function (s) { s.classList.add('on'); });
      lines.forEach(function (li) { li.classList.remove('typing'); li.style.removeProperty('--c'); });
      done.textContent = lines.length; wait.textContent = 0;
      fig.classList.add('done');
    }
    function play() {
      reset();
      var t = 300, parsed = {}, named = {};
      lines.forEach(function (li, i) {
        var n = +li.style.getPropertyValue('--n') || li.textContent.length, k = li.dataset.k;
        var per = 16;
        T.at(function () { li.classList.add('typing'); }, t);
        for (var c = 1; c <= n; c += 2) (function (c) { T.at(function () { li.style.setProperty('--c', c); }, t + c * per / 2); })(c);
        t += n * per / 2 + 60;
        T.at(function () {
          li.classList.remove('typing'); li.style.removeProperty('--c'); li.classList.add('parsed');
          parsed[k] = 1;
          (refs[k] || []).forEach(function (r) { named[r] = 1; });
          if (k === 'root') rootEl.classList.add('on');
          else parts(k).forEach(function (p) { p.classList.add('on'); });
          done.textContent = i + 1;
          wait.textContent = Object.keys(named).filter(function (r) { return !parsed[r]; }).length;
          if (i === lines.length - 1) fig.classList.add('done');
        }, t);
        t += 220;
      });
    }
    $('.replay', fig).addEventListener('click', play);
    if (still) { finish(); return; }
    reset();
    inView(fig, function () { if (!started) { started = true; play(); } });
  });

  // ── Findings card: who wrote which part.
  $$('[data-live="who"]').forEach(function (fig) {
    var btns = $$('.seg button', fig), touched = false;
    function set(on) {
      fig.dataset.on = on;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.on === on); });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { touched = true; set(b.dataset.on); }); });
    var once = false;
    inView(fig, function () {
      if (once || still) return;
      once = true;
      setTimeout(function () { if (!touched) set('1'); }, 1800);
    }, null, '0px 0px -30% 0px');
  });

  // ── Plan, change set, run: canvas tabs that play through on their own until touched.
  $$('[data-live="exec"]').forEach(function (fig) {
    var canvas = $('.sx-canvas', fig), ctl = $$('.sx-ctl button', fig), caps = $$('[data-cap] [data-t]', fig);
    var runRows = $$('.sx-run li', fig), logs = $$('.sx-log', fig);
    var files = $$('.sx-file', fig), codes = $$('.sx-code', fig);
    var T = timers(), auto = !still, visible = false;
    var FN = [['01-snapshot-policy.py', '+2', '2 lines'], ['02-enable-pab.py', '+7', '7 lines'], ['03-strip-wildcard-grant.py', '+1 −1', '2 lines']];
    function file(i) {
      files.forEach(function (f, j) { f.classList.toggle('on', i === j); });
      codes.forEach(function (c, j) { c.hidden = i !== j; });
      $('[data-fname]', fig).textContent = FN[i][0];
      $('[data-fadd]', fig).textContent = FN[i][1];
      $('[data-flines]', fig).textContent = FN[i][2];
    }
    function runState(n, running) {
      runRows.forEach(function (r, i) { r.dataset.st = i < n ? 'done' : i === n && running ? 'run' : ''; if (!r.dataset.st) delete r.dataset.st; });
      logs.forEach(function (l, i) { if (i < n) l.dataset.st = 'done'; else delete l.dataset.st; });
    }
    function show(t) {
      canvas.dataset.tab = t;
      ctl.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
      caps.forEach(function (c) { c.hidden = c.dataset.t !== t; });
    }
    function cycle() {
      T.clear();
      if (!auto || !visible) return;
      show('plan'); file(1); runState(0);
      T.at(function () { show('change'); }, 3600);
      T.at(function () { file(0); }, 5200);
      T.at(function () { file(2); }, 6400);
      T.at(function () { file(1); }, 7600);
      T.at(function () { show('run'); runState(0, true); }, 8600);
      T.at(function () { runState(1, true); }, 9700);
      T.at(function () { runState(2, true); }, 11400);
      T.at(function () { runState(3); }, 12500);
      T.at(cycle, 17000);
    }
    function stop() { auto = false; T.clear(); }
    ctl.forEach(function (b) { b.addEventListener('click', function () { stop(); show(b.dataset.t); if (b.dataset.t === 'run') runState(3); }); });
    $$('.sx-tab', fig).forEach(function (tab) { tab.addEventListener('click', function () { if (!tab.dataset.t) return; stop(); show(tab.dataset.t); if (tab.dataset.t === 'run') runState(3); }); });
    files.forEach(function (f, i) { f.addEventListener('click', function () { stop(); file(i); }); });
    show('plan'); file(1); runState(still ? 3 : 0);
    inView(fig, function () { if (!visible) { visible = true; cycle(); } }, function () { visible = false; T.clear(); });
  });

  // ── Design mode: library and playbook.
  $$('[data-live="views"]').forEach(function (fig) {
    var main = $('.sx-dz', fig), ctl = $$('.sx-ctl button', fig), caps = $$('[data-cap] [data-t]', fig);
    var T = timers(), auto = !still, visible = false;
    function show(t) {
      main.dataset.view = t;
      ctl.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === t); });
      caps.forEach(function (c) { c.hidden = c.dataset.t !== t; });
      $$('.sx-pb li', fig).forEach(function (li) { li.classList.toggle('on', t === 'pb' && li.textContent.indexOf('S3 Lifecycle Policy') === 0); });
      $$('.sx-nav li', fig).forEach(function (li) { if (/^(New session|Playbooks)$/.test(li.textContent.trim())) li.classList.toggle('on', (t === 'lib') === (li.textContent.trim() === 'New session')); });
    }
    function cycle() {
      T.clear();
      if (!auto || !visible) return;
      T.at(function () { show(main.dataset.view === 'lib' ? 'pb' : 'lib'); cycle(); }, 5200);
    }
    ctl.forEach(function (b) { b.addEventListener('click', function () { auto = false; T.clear(); show(b.dataset.t); }); });
    show('lib');
    inView(fig, function () { if (!visible) { visible = true; cycle(); } }, function () { visible = false; T.clear(); });
  });

  // ── Agents: the break-glass lever.
  $$('[data-live="agents"]').forEach(function (fig) {
    var main = $('.sx-ag', fig), btn = $('.sx-ctl [data-glass]', fig);
    var modes = $$('.sx-am', fig);
    function set(on) {
      main.classList.toggle('glass', on);
      btn.setAttribute('aria-pressed', on);
      btn.textContent = on ? 'Restore' : 'Pull break glass';
      modes.forEach(function (m) {
        var was = m.dataset.m;
        m.textContent = on && was === 'Acts with approval' ? 'Proposes · held by break glass' : was;
      });
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-pressed') !== 'true'); });
    $('.sx-glass .sx-btn', fig).addEventListener('click', function () { set(btn.getAttribute('aria-pressed') !== 'true'); });
  });

  // ── Home: the composer types a few of the suggested questions.
  $$('.sx-home .sx-comp[data-type]').forEach(function (comp) {
    var ph = $('.sx-ph', comp), list = JSON.parse(comp.dataset.type), sug = $$('.sx-sug li', comp.parentNode);
    var T = timers(), visible = false, fit = comp.closest('.sx-fit');
    if (still) return;
    function play(k) {
      T.clear();
      if (!visible) return;
      var q = list[k % list.length], t = 600;
      sug.forEach(function (li) { li.classList.toggle('hi', li.textContent === q); });
      T.at(function () { ph.classList.add('typed'); ph.textContent = ''; }, t);
      for (var i = 1; i <= q.length; i++) (function (i) { T.at(function () { ph.textContent = q.slice(0, i); }, t + i * 38); })(i);
      t += q.length * 38 + 2200;
      T.at(function () { ph.classList.remove('typed'); ph.textContent = ph.dataset.ph; sug.forEach(function (li) { li.classList.remove('hi'); }); }, t);
      T.at(function () { play(k + 1); }, t + 1400);
    }
    inView(fit, function () { if (!visible) { visible = true; play(0); } }, function () { visible = false; T.clear(); ph.classList.remove('typed'); ph.textContent = ph.dataset.ph; });
  });
})();
