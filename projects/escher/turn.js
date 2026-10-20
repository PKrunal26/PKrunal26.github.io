// Escher case study: "One turn". Plays one question through the app in five steps, with what
// the browser does at each step in the drawer under the screen. Built by scripts/escher-screens.mjs.
//
// Each step is a list of beats [ms, fn]. The state at the start of a step is every earlier beat
// run at once, so any step can be opened directly. A clock that only moves while playing drives
// the beats, so pausing holds everything exactly where it is. Under reduced motion nothing plays:
// a step opens in its finished state.
(function () {
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var $ = function (sel, el) { return (el || document).querySelector(sel); };

  $$('[data-live="turn"]').forEach(function (fig) {
    var sx = $('.sx', fig), main = $('.tj-main', fig), col = $('.tj-col', fig), view = $('.tj-view', fig);
    var rep = $('.tj-rep', fig), repi = $('.tj-repi', fig), canvas = $('.tj-canvas', fig);
    var cur = $('.tj-cur', fig), ph = $('.tj-comp .sx-ph', fig), home = $('.tj-home', fig);
    var ds = $('[data-ds]', fig), sc = $('[data-sc]', fig), playhead = $('[data-playhead]', fig);
    var wt = $('[data-wt]', fig), wl = $('[data-wl]', fig), wl2 = $('[data-wl2]', fig);
    var w1 = $('[data-k="w1"]', fig), w2 = $('[data-k="w2"]', fig), fc = $('[data-k="fc"]', fig), art = $('[data-k="art"]', fig);
    var sess = $('.tj-sess', fig), btns = $$('.tj-steps button', fig), prog = $$('.tj-steps .tj-pg i', fig);
    var bars = $$('.tj-wbar', fig), bands = $$('.tj-band', fig), outs = $$('.tj-out', fig), langs = $$('.tj-lang li', fig);
    var pauseBtn = $('[data-pause]', fig);
    var Q = $('[data-k="u1"]', fig).textContent;

    var instant = false;
    function K(k) { return $$('[data-k="' + k + '"]', fig); }
    function on(k) { K(k).forEach(function (n) { n.classList.add('on'); }); }
    function cls(el, c, v) { el.classList.toggle(c, v !== false); }
    function say(s) { ds.textContent = s; }

    // ── Pointer: positions are measured on the live layout, in unscaled screen pixels.
    function at(el, fx, fy) {
      var m = main.getBoundingClientRect(), r = el.getBoundingClientRect(), k = sx.getBoundingClientRect().width / 1200 || 1;
      return [(r.left - m.left + r.width * (fx == null ? 0.5 : fx)) / k, (r.top - m.top + r.height * (fy == null ? 0.5 : fy)) / k];
    }
    // The arrow's tip sits about 4.5px right and 2.5px down from the corner of its box.
    function place(p) { cur.style.transform = 'translate(' + (p[0] - 4.5).toFixed(1) + 'px,' + (p[1] - 2.5).toFixed(1) + 'px)'; }
    function jump(el, dx, dy) {
      var p = at(el);
      cur.classList.add('jump');
      place([p[0] + dx, p[1] + dy]);
      void cur.offsetWidth;
      cur.classList.remove('jump');
      cur.classList.add('on');
    }
    function moveTo(el, fx, fy) { place(at(el, fx, fy)); }
    function click(el) {
      if (instant) return;
      cur.classList.add('down');
      setTimeout(function () { cur.classList.remove('down'); }, 140);
      var p = at(el), r = document.createElement('i');
      r.className = 'tj-rip';
      r.style.left = p[0] + 'px'; r.style.top = p[1] + 'px';
      main.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    }
    function hideCur() { cur.classList.remove('on'); }

    // ── Beats
    var BEATS = [[], [], [], [], []];
    function b(step, ms, fn) { BEATS[step].push([ms, fn]); }
    function streamWords(step, k, start, per) {
      $$('[data-k="' + k + '"] .w', fig).forEach(function (w, i) { b(step, start + i * per, function () { w.classList.add('on'); }); });
    }
    var send = $('.tj-send', fig), f1 = $('.tj-f1', fig), save = $('.tj-save', fig);

    // 1 Compose: type, send, and the request is built.
    b(0, 0, function () { say('Composing'); });
    b(0, 350, function () { ph.classList.add('typed'); ph.textContent = ''; cls(home, 'typing'); });
    for (var i = 1; i <= Q.length; i++) (function (i) { b(0, 350 + i * 36, function () { ph.textContent = Q.slice(0, i); }); })(i);
    var tSend = 350 + Q.length * 36 + 700;
    b(0, tSend - 900, function () { jump(send, 150, 110); });
    b(0, tSend - 750, function () { moveTo(send, 0.45, 0.55); });
    b(0, tSend, function () { click(send); cls(send, 'press'); });
    b(0, tSend + 160, function () { cls(send, 'press', false); });
    b(0, tSend + 300, function () {
      ph.classList.remove('typed'); ph.textContent = ph.dataset.ph; cls(home, 'typing', false);
      home.classList.remove('on'); on('thread'); on('u1'); sess.classList.add('on'); sess.classList.remove('idle');
      say('POST /api/chat'); hideCur();
    });
    b(0, tSend + 450, function () { on('empty'); });
    ['r1', 'r2', 'r3', 'r4', 'r5'].forEach(function (k, i) { b(0, tSend + 450 + i * 150, function () { on(k); }); });
    b(0, tSend + 1150, function () { on('th'); });
    for (var t = 0; t < 14; t++) (function (t) { b(0, tSend + 1250 + t * 85, function () { on('t' + t); }); })(t);
    b(0, tSend + 1250 + 14 * 85 + 200, function () { on('leg'); say('14 tools · cache hit'); });

    // 2 Gather: three rounds of read-only calls. Times are the turn's own, in ms.
    var CALL_T = { c1: [1200, 1500], c2: [1200, 1900], c3: [3100, 4200], c4: [3100, 4000], c5: [5400, 6800] };
    b(1, 0, function () { on('w1'); wl.textContent = 'Working'; say('Thinking'); });
    b(1, 250, function () { on('s1'); });
    b(1, 2100, function () { on('s2'); });
    b(1, 4400, function () { on('s3'); });
    [['rd0', 1200, 'Round 1 of 3'], ['rd1', 3100, 'Round 2 of 3'], ['rd2', 5400, 'Round 3 of 3']].forEach(function (r) {
      b(1, r[1], function () { on(r[0]); say(r[2]); });
    });
    Object.keys(CALL_T).forEach(function (k) {
      b(1, CALL_T[k][0], function () { on(k); });
      b(1, CALL_T[k][1], function () { K(k).forEach(function (n) { n.classList.add('done'); }); });
    });
    b(1, 6800, function () { say('5 calls in 3 rounds'); wl.textContent = 'Writing the answer'; });

    // 3 Answer: OpenUI Lang streams in; each part fills when its line parses.
    var PART = { root: 'a1', lead: 'lead', stats: 'stats', m1: 'm1', m2: 'm2', m3: 'm3', take: 'take', next: 'next' };
    b(2, 0, function () { cls(w1, 'done'); cls(w1, 'fold'); wl.textContent = 'Worked for 9s'; say('Streaming OpenUI Lang'); });
    var tl = 300;
    langs.forEach(function (li, n) {
      var k = li.dataset.k.slice(2), len = +li.style.getPropertyValue('--n') || 40, per = 9;
      b(2, tl, function () { li.classList.add('on', 'typing'); li.style.setProperty('--c', 0); });
      for (var c = 2; c <= len; c += 2) (function (c) { b(2, tl + c * per, function () { li.style.setProperty('--c', c); }); })(c);
      tl += len * per + 90;
      b(2, tl, function () {
        li.classList.remove('typing'); li.style.removeProperty('--c'); li.classList.add('parsed');
        setTimeout(function () { li.classList.add('old'); }, 50);
        on(PART[k]); sc.textContent = n + 1;
        if (n === langs.length - 1) say(langs.length + ' of ' + langs.length + ' statements');
      });
      if (k === 'lead') streamWords(2, 'lead', tl + 60, 45);
      if (k === 'take') streamWords(2, 'take', tl + 60, 45);
      tl += 110;
    });

    // 4 Second pass: the report is asked for, captured, and written from pass 1's results only.
    b(3, 0, function () { jump(f1, 190, 120); say('Pass 1 · chat'); on('pc1'); });
    b(3, 150, function () { moveTo(f1, 0.3, 0.6); });
    b(3, 1050, function () { click(f1); cls(f1, 'press'); });
    b(3, 1250, function () { cls(f1, 'press', false); on('u2'); hideCur(); });
    b(3, 1700, function () { on('w2'); wl2.textContent = 'Thinking'; });
    b(3, 2100, function () { on('c6'); on('pc1c'); say('open_report · captured, never run'); });
    b(3, 2600, function () { cls(w2, 'done'); wl2.textContent = 'Thought for 2s'; });
    b(3, 2800, function () { on('art'); on('canvas'); canvas.dataset.view = 'rep'; on('rep'); on('pa'); });
    b(3, 3300, function () { on('pc2'); say('Pass 2 · report · no tools'); });
    b(3, 3700, function () { on('rk1'); });
    b(3, 4000, function () { on('rk2'); });
    streamWords(3, 'rtext', 4300, 55);

    // 5 Record: the report's findings come from a scan the app runs; the model only frames them.
    b(4, 0, function () { say('scan_findings · run by the app'); });
    for (var j = 0; j < 7; j++) (function (j) { b(4, 200 + j * 110, function () { on('j' + j); }); })(j);
    b(4, 1000, function () { on('fc'); on('frow'); on('wh1'); });
    b(4, 1700, function () { on('fch'); on('fnote'); on('wh2'); });
    b(4, 2300, function () { cls(fc, 'prov'); say('rows from the scan · words from the model'); });
    b(4, 4400, function () { cls(fc, 'prov', false); });
    b(4, 4500, function () { jump(save, -170, 110); });
    b(4, 4650, function () { moveTo(save, 0.5, 0.55); });
    b(4, 5500, function () { click(save); cls(save, 'press'); });
    b(4, 5700, function () { cls(save, 'press', false); cls(fc, 'saved'); on('log'); say('Saved · ufnd_xysj'); cls(art, 'ready'); $('[data-art]', fig).textContent = 'Ready'; sess.classList.add('idle'); });
    b(4, 6300, function () { on('ftab'); hideCur(); });
    b(4, 6650, function () { canvas.dataset.view = 'fnd'; on('fnd'); });

    var D = [tSend + 1250 + 14 * 85 + 1900, 8000, tl + 1900, 7600, 9800];
    BEATS.forEach(function (list) { list.sort(function (a, b) { return a[0] - b[0]; }); });

    // ── State
    function reset() {
      $$('[data-k]', fig).forEach(function (n) { n.classList.remove('on'); });
      $$('.w.on, .done, .fold, .prov, .saved, .press, .ready, .typing, .parsed, .old', fig).forEach(function (n) { n.classList.remove('on', 'done', 'fold', 'prov', 'saved', 'press', 'ready', 'typing', 'parsed', 'old'); });
      home.classList.add('on');
      sess.classList.remove('on', 'idle');
      ph.classList.remove('typed'); ph.textContent = ph.dataset.ph;
      langs.forEach(function (li) { li.style.setProperty('--c', 0); });
      sc.textContent = 0; say('');
      $('[data-art]', fig).textContent = 'Writing';
      canvas.dataset.view = 'rep';
      hideCur();
    }
    // The thread and the report keep their newest line in view, as the app does.
    var lastY = -1, lastR = -1;
    function fit() {
      var y = Math.max(0, col.scrollHeight - view.clientHeight);
      if (y !== lastY) { col.style.transform = 'translateY(' + -y + 'px)'; lastY = y; }
      var r = Math.max(0, repi.offsetHeight - (rep.clientHeight - 40));
      if (r !== lastR) { repi.style.transform = 'translateY(' + -r + 'px)'; lastR = r; }
    }
    // Waterfall and the working timer follow the clock during Gather; later steps show them whole.
    function wf(ms) {
      var s = ms / 1000;
      bars.forEach(function (el) {
        var a = +el.dataset.a, z = +el.dataset.b;
        el.style.setProperty('--f', Math.max(0, Math.min(1, (s - a) / (z - a))).toFixed(3));
      });
      outs.forEach(function (o) { o.classList.toggle('on', s >= +o.dataset.at); });
      bands.forEach(function (o) { o.classList.toggle('on', s >= +o.dataset.a); });
      playhead.style.setProperty('--t', Math.min(1, s / 8).toFixed(4));
      playhead.classList.toggle('on', s > 0 && s < 8);
    }

    var step = 0, t = 0, idx = 0, playing = false, visible = false, raf = 0, last = 0, started = false, fading = false;
    function mark() {
      fig.dataset.step = step;
      btns.forEach(function (bt, i) { if (i === step) bt.setAttribute('aria-current', 'step'); else bt.removeAttribute('aria-current'); });
      prog.forEach(function (p, i) { p.style.setProperty('--p', i < step ? 1 : i > step ? 0 : Math.min(1, t / D[step])); });
    }
    function go(i, whole) {
      step = i; t = 0; idx = 0; lastY = lastR = -1;
      instant = true;
      fig.classList.add('instant');
      reset();
      for (var j = 0; j < i; j++) BEATS[j].forEach(function (x) { x[1](); });
      if (whole) { BEATS[i].forEach(function (x) { x[1](); }); idx = BEATS[i].length; t = D[i]; }
      hideCur();
      wf(i > 1 || (whole && i === 1) ? 9000 : 0);
      wt.textContent = i > 1 ? '9.0s' : '0.0s';
      mark();
      fit();
      void fig.offsetWidth;
      instant = false;
      requestAnimationFrame(function () { fig.classList.remove('instant'); });
    }
    function frame(ts) {
      raf = 0;
      if (!playing || !visible) { last = 0; return; }
      var dt = last ? Math.min(ts - last, 50) : 16;
      last = ts;
      if (!fading) {
        t += dt;
        var list = BEATS[step];
        while (idx < list.length && list[idx][0] <= t) { list[idx][1](); idx++; }
        if (step === 1) { wf(t); if (t < 6800) wt.textContent = (t / 1000).toFixed(1) + 's'; }
        fit();
        mark();
        if (t >= D[step]) {
          if (step < 4) go(step + 1);
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
    addEventListener('resize', function () { lastY = lastR = -1; fit(); });

    if (still) { pauseBtn.hidden = true; fig.classList.add('paused'); go(0, true); return; }
    go(0);
    if (!('IntersectionObserver' in window)) { visible = true; setPlaying(true); return; }
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        visible = e.isIntersecting;
        if (visible && !started) { started = true; setPlaying(true); }
        run();
      });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0.25 }).observe($('.tj-stage', fig));
  });
})();
