// Escher case study: the player behind the scripted screen demos (One turn, Plan and execute).
//
// A demo is a list of steps, and each step a list of beats [ms, fn]. The state at the start of
// a step is every earlier beat run at once, so any step can be opened directly. A clock that only
// moves while playing drives the beats, so pausing holds everything exactly where it is. Under
// reduced motion nothing plays: a step opens in its finished state.
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function all(sel, el) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }
  var STATES = ['on', 'done', 'fold', 'press', 'ready', 'typing', 'parsed', 'old'];

  window.EscherPlayer = function (fig, n) {
    var main = fig.querySelector('.sx-main'), sx = fig.querySelector('.sx'), cur = fig.querySelector('.tj-cur');
    var ds = fig.querySelector('[data-ds]');
    var P = { still: still, instant: false, BEATS: [], fits: [] };
    for (var i = 0; i < n; i++) P.BEATS.push([]);
    P.$ = function (s) { return fig.querySelector(s); };
    P.$$ = function (s) { return all(s, fig); };
    P.K = function (k) { return all('[data-k="' + k + '"]', fig); };
    P.on = function () { for (var i = 0; i < arguments.length; i++) P.K(arguments[i]).forEach(function (el) { el.classList.add('on'); }); };
    P.off = function () { for (var i = 0; i < arguments.length; i++) P.K(arguments[i]).forEach(function (el) { el.classList.remove('on'); }); };
    P.cls = function (el, c, v) { el.classList.toggle(c, v !== false); };
    P.say = function (s) { if (ds) ds.textContent = s; };
    P.b = function (step, ms, fn) { P.BEATS[step].push([ms, fn]); };
    // Reveal the .w words inside [data-k=k] one at a time; returns when the last one shows.
    P.words = function (step, k, start, per) {
      var ws = all('[data-k="' + k + '"] .w', fig);
      ws.forEach(function (w, i) { P.b(step, start + i * per, function () { w.classList.add('on'); }); });
      return start + ws.length * per;
    };
    // Type text into an element as a caret line; returns when the last character lands.
    P.type = function (step, el, text, start, per) {
      P.b(step, start, function () { el.classList.add('typed'); el.textContent = ''; });
      for (var i = 1; i <= text.length; i++) (function (i) { P.b(step, start + i * per, function () { el.textContent = text.slice(0, i); }); })(i);
      return start + text.length * per;
    };

    // ── Pointer: positions are measured on the live layout, in unscaled screen pixels.
    function at(el, fx, fy) {
      var m = main.getBoundingClientRect(), r = el.getBoundingClientRect(), k = sx.getBoundingClientRect().width / 1200 || 1;
      return [(r.left - m.left + r.width * (fx == null ? 0.5 : fx)) / k, (r.top - m.top + r.height * (fy == null ? 0.5 : fy)) / k];
    }
    // The arrow's tip sits about 4.5px right and 2.5px down from the corner of its box.
    function place(p) { cur.style.transform = 'translate(' + (p[0] - 4.5).toFixed(1) + 'px,' + (p[1] - 2.5).toFixed(1) + 'px)'; }
    P.jump = function (el, dx, dy) {
      var p = at(el);
      cur.classList.add('jump');
      place([p[0] + dx, p[1] + dy]);
      void cur.offsetWidth;
      cur.classList.remove('jump');
      cur.classList.add('on');
    };
    P.move = function (el, fx, fy) { place(at(el, fx, fy)); };
    P.click = function (el) {
      if (P.instant) return;
      cur.classList.add('down');
      setTimeout(function () { cur.classList.remove('down'); }, 140);
      var p = at(el), r = document.createElement('i');
      r.className = 'tj-rip';
      r.style.left = p[0] + 'px'; r.style.top = p[1] + 'px';
      main.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    };
    // Point at an element, press it, and run fn as the press lands.
    P.tap = function (step, ms, sel, fn, from) {
      var el = typeof sel === 'string' ? P.$(sel) : sel;
      from = from || [-150, 110];
      P.b(step, ms - 1000, function () { P.jump(el, from[0], from[1]); });
      P.b(step, ms - 850, function () { P.move(el, 0.5, 0.55); });
      P.b(step, ms, function () { P.click(el); el.classList.add('press'); });
      P.b(step, ms + 180, function () { el.classList.remove('press'); if (fn) fn(); });
    };
    P.hide = function () { cur.classList.remove('on'); };

    // Scrolling panes keep their newest line in view, as the app does: [box, inner, padding].
    P.fit = function () {
      P.fits.forEach(function (f) {
        var y = Math.max(0, f[1].offsetHeight - (f[0].clientHeight - (f[2] || 0)));
        if (y !== f[3]) { f[1].style.transform = 'translateY(' + -y + 'px)'; f[3] = y; }
      });
    };

    // cfg: { D: step lengths in ms, reset(), after(step, whole), live(step, t), states: [] }
    P.start = function (cfg) {
      var btns = all('.tj-steps button', fig), prog = all('.tj-steps .tj-pg i', fig), pauseBtn = fig.querySelector('[data-pause]');
      var states = STATES.concat(cfg.states || []).filter(function (s) { return s !== 'on'; }), D = cfg.D;
      var step = 0, t = 0, idx = 0, playing = false, visible = false, raf = 0, last = 0, started = false, fading = false;
      P.BEATS.forEach(function (list) { list.sort(function (a, b) { return a[0] - b[0]; }); });
      function reset() {
        // Only parts the script drives lose 'on'; static markup keeps its own (the Ask toggle, the nav).
        all('[data-k], .w', fig).forEach(function (el) { el.classList.remove('on'); });
        all('.' + states.join(', .'), fig).forEach(function (el) { el.classList.remove.apply(el.classList, states); });
        P.hide(); P.say('');
        P.fits.forEach(function (f) { f[3] = -1; });
        if (cfg.reset) cfg.reset();
      }
      function mark() {
        fig.dataset.step = step;
        btns.forEach(function (bt, i) { if (i === step) bt.setAttribute('aria-current', 'step'); else bt.removeAttribute('aria-current'); });
        prog.forEach(function (p, i) { p.style.setProperty('--p', i < step ? 1 : i > step ? 0 : Math.min(1, t / D[step])); });
      }
      function go(i, whole) {
        step = i; t = 0; idx = 0;
        P.instant = true;
        fig.classList.add('instant');
        reset();
        for (var j = 0; j < i; j++) P.BEATS[j].forEach(function (x) { x[1](); });
        if (whole) { P.BEATS[i].forEach(function (x) { x[1](); }); idx = P.BEATS[i].length; t = D[i]; }
        P.hide();
        if (cfg.after) cfg.after(i, whole);
        mark();
        P.fit();
        void fig.offsetWidth;
        P.instant = false;
        requestAnimationFrame(function () { fig.classList.remove('instant'); });
      }
      function frame(ts) {
        raf = 0;
        if (!playing || !visible) { last = 0; return; }
        var dt = last ? Math.min(ts - last, 50) : 16;
        last = ts;
        if (!fading) {
          t += dt;
          var list = P.BEATS[step];
          while (idx < list.length && list[idx][0] <= t) { list[idx][1](); idx++; }
          if (cfg.live) cfg.live(step, t);
          P.fit();
          mark();
          if (t >= D[step]) {
            if (step < D.length - 1) go(step + 1);
            else {
              fading = true;
              fig.classList.add('fade');
              setTimeout(function () { go(0); fig.classList.remove('fade'); fading = false; }, 500);
            }
          }
        }
        raf = requestAnimationFrame(frame);
      }
      function run() { if (!raf && playing && visible) raf = requestAnimationFrame(frame); }
      function setPlaying(v) {
        playing = v;
        fig.classList.toggle('paused', !v);
        pauseBtn.setAttribute('aria-label', v ? 'Pause' : 'Play');
        run();
      }
      btns.forEach(function (bt) {
        bt.addEventListener('click', function () {
          var i = +bt.dataset.i;
          if (still) { go(i, true); return; }
          go(i);
          setPlaying(true);
        });
      });
      pauseBtn.addEventListener('click', function () { setPlaying(!playing); });
      addEventListener('resize', function () { P.fits.forEach(function (f) { f[3] = -1; }); P.fit(); });

      if (still) { pauseBtn.hidden = true; fig.classList.add('paused'); go(0, true); return; }
      go(0);
      if (!('IntersectionObserver' in window)) { visible = true; setPlaying(true); return; }
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          visible = e.isIntersecting;
          if (visible && !started) { started = true; setPlaying(true); }
          run();
        });
      }, { rootMargin: '0px 0px -20% 0px', threshold: 0.25 }).observe(fig.querySelector('.tj-stage'));
    };
    return P;
  };
})();
