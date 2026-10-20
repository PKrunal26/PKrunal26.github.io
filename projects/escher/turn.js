// Escher case study: "One turn". Plays one question through the app in five steps, with what
// the browser does at each step in the drawer under the screen. Built by scripts/escher-screens.mjs,
// played by player.js.
(function () {
  Array.prototype.slice.call(document.querySelectorAll('[data-live="turn"]')).forEach(function (fig) {
    var P = EscherPlayer(fig, 5), $ = P.$, $$ = P.$$, b = P.b, on = P.on, cls = P.cls, say = P.say;
    var col = $('.tj-col'), view = $('.tj-view'), rep = $('.tj-rep'), repi = $('.tj-repi'), canvas = $('.tj-canvas');
    var ph = $('.tj-comp .sx-ph'), home = $('.tj-home'), sc = $('[data-sc]'), playhead = $('[data-playhead]');
    var wt = $('[data-wt]'), wl = $('[data-wl]'), wl2 = $('[data-wl2]');
    var w1 = $('[data-k="w1"]'), w2 = $('[data-k="w2"]'), fc = $('[data-k="fc"]'), art = $('[data-k="art"]'), sess = $('.tj-sess');
    var bars = $$('.tj-wbar'), bands = $$('.tj-band'), outs = $$('.tj-out'), langs = $$('.tj-lang li');
    var send = $('.tj-send'), f1 = $('.tj-f1'), save = $('.tj-save');
    var Q = $('[data-k="u1"]').textContent;
    P.fits.push([view, col, 0], [rep, repi, 40]);

    // 1 Compose: type, send, and the request is built.
    b(0, 0, function () { say('Composing'); cls(home, 'typing'); });
    var tSend = P.type(0, ph, Q, 350, 36) + 700;
    P.tap(0, tSend, send, null, [150, 110]);
    b(0, tSend + 300, function () {
      ph.classList.remove('typed'); ph.textContent = ph.dataset.ph; cls(home, 'typing', false);
      home.classList.remove('on'); on('thread', 'u1'); sess.classList.add('on'); sess.classList.remove('idle');
      say('POST /api/chat'); P.hide();
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
      b(1, CALL_T[k][1], function () { P.K(k).forEach(function (n) { n.classList.add('done'); }); });
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
      if (k === 'lead') P.words(2, 'lead', tl + 60, 45);
      if (k === 'take') P.words(2, 'take', tl + 60, 45);
      tl += 110;
    });

    // 4 Second pass: the report is asked for, captured, and written from pass 1's results only.
    b(3, 0, function () { say('Pass 1 · chat'); on('pc1'); });
    P.tap(3, 1050, f1, function () { on('u2'); P.hide(); }, [190, 120]);
    b(3, 1700, function () { on('w2'); wl2.textContent = 'Thinking'; });
    b(3, 2100, function () { on('c6', 'pc1c'); say('open_report · captured, never run'); });
    b(3, 2600, function () { cls(w2, 'done'); wl2.textContent = 'Thought for 2s'; });
    b(3, 2800, function () { on('art', 'canvas', 'rep', 'pa'); canvas.dataset.view = 'rep'; });
    b(3, 3300, function () { on('pc2'); say('Pass 2 · report · no tools'); });
    b(3, 3700, function () { on('rk1'); });
    b(3, 4000, function () { on('rk2'); });
    P.words(3, 'rtext', 4300, 55);

    // 5 Record: the report's findings come from a scan the app runs; the model only frames them.
    b(4, 0, function () { say('scan_findings · run by the app'); });
    for (var j = 0; j < 7; j++) (function (j) { b(4, 200 + j * 110, function () { on('j' + j); }); })(j);
    b(4, 1000, function () { on('fc', 'frow', 'wh1'); });
    b(4, 1700, function () { on('fch', 'fnote', 'wh2'); });
    b(4, 2300, function () { cls(fc, 'prov'); say('rows from the scan · words from the model'); });
    b(4, 4400, function () { cls(fc, 'prov', false); });
    P.tap(4, 5500, save, function () {
      cls(fc, 'saved'); on('log'); say('Saved · ufnd_xysj'); cls(art, 'ready'); $('[data-art]').textContent = 'Ready'; sess.classList.add('idle');
    }, [-170, 110]);
    b(4, 6300, function () { on('ftab'); P.hide(); });
    b(4, 6650, function () { canvas.dataset.view = 'fnd'; on('fnd'); });

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

    P.start({
      D: [tSend + 1250 + 14 * 85 + 1900, 8000, tl + 1900, 7600, 9800],
      states: ['prov', 'saved', 'typing'],
      reset: function () {
        home.classList.add('on');
        sess.classList.remove('on', 'idle');
        ph.classList.remove('typed'); ph.textContent = ph.dataset.ph;
        langs.forEach(function (li) { li.style.setProperty('--c', 0); });
        sc.textContent = 0;
        $('[data-art]').textContent = 'Writing';
        canvas.dataset.view = 'rep';
      },
      after: function (i, whole) {
        wf(i > 1 || (whole && i === 1) ? 9000 : 0);
        wt.textContent = i > 1 ? '9.0s' : '0.0s';
      },
      live: function (step, t) {
        if (step !== 1) return;
        wf(t);
        if (t < 6800) wt.textContent = (t / 1000).toFixed(1) + 's';
      },
    });
  });
})();
