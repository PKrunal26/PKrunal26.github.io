// Escher case study: "Plan and execute". Plays one fix from a finding to a verified change in
// seven steps, with what runs underneath in the drawer under the screen. Built by
// scripts/escher-screens.mjs, played by player.js.
(function () {
  Array.prototype.slice.call(document.querySelectorAll('[data-live="run"]')).forEach(function (fig) {
    var P = EscherPlayer(fig, 7), $ = P.$, $$ = P.$$, b = P.b, on = P.on, off = P.off, cls = P.cls, say = P.say;
    var col = $('.tj-col'), view = $('.tj-view'), canvas = $('.tx-canvas'), sess = $('.tj-sess');
    var ph = $('.tx-comp .sx-ph'), gate = $('[data-k="gate"]'), gs = $('[data-gs]'), cs = $('[data-cs]');
    var rc = $('[data-rc]'), rb = $('[data-rb]'), qn = $('[data-qn]'), rv = $('[data-rv]');
    var runRows = $$('.tx-rsteps li[data-s]'), files = $$('.tx-file'), codes = $$('.tx-code');
    var fname = $('[data-fname]'), fsrc = $('[data-fsrc]');
    var LABEL = { w1: 'Working', w2: 'Working', w3: 'Planning', w4: 'Thinking' };
    function label(k, s) { $('[data-wl="' + k + '"]').textContent = s; }
    function fold(k, s) { var w = $('[data-k="' + k + '"]'); cls(w, 'done'); cls(w, 'fold'); label(k, s); }
    function done(k) { P.K(k).forEach(function (el) { el.classList.add('done'); }); }
    function show(v) { canvas.dataset.view = v; }
    function file(i) {
      files.forEach(function (f, j) { cls(f, 'sel', i === j); });
      codes.forEach(function (c, j) { cls(c, 'sel', i === j); });
      fname.textContent = files[i].querySelector('span').textContent + '.py';
      fsrc.textContent = files[i].querySelector('.tx-rv') ? 'new' : 'playbook';
    }
    function step(i, st) { runRows[i].dataset.st = st; }
    function bar(p, s) { rb.style.width = p + '%'; rc.textContent = s; }
    $$('.tx-view').forEach(function (v) { P.fits.push([v, v.querySelector('.tx-vi'), 40]); });
    P.fits.push([view, col, 0]);

    // 1 Ask: open the finding's question box, ask, and get an answer from the estate.
    b(0, 0, function () { say('ufnd_xysj · open'); });
    P.tap(0, 1100, '.tx-askb', function () { on('att'); say('F-1 attached'); }, [-170, 120]);
    b(0, 1300, function () { on('r-empty'); });
    ['r-0', 'r-1', 'r-2', 'r-3', 'r-4'].forEach(function (k, i) { b(0, 1350 + i * 120, function () { on(k); }); });
    var tAsk = P.type(0, ph, 'What breaks if we close it?', 1500, 40) + 600;
    P.tap(0, tAsk, '.tx-send', function () {
      ph.classList.remove('typed'); ph.textContent = ph.dataset.ph; off('att');
      on('u1', 'w1'); sess.classList.add('on'); say('2 calls'); P.hide();
    }, [-150, -70]);
    b(0, tAsk + 400, function () { on('x1'); });
    b(0, tAsk + 1000, function () { done('x1'); on('r-gh', 'r-e0', 'x2'); });
    b(0, tAsk + 1150, function () { on('r-e1'); });
    b(0, tAsk + 1900, function () { done('x2'); });
    b(0, tAsk + 2100, function () { fold('w1', 'Worked for 3s'); on('a1', 'l1'); });
    P.words(0, 'l1', tAsk + 2200, 45);
    b(0, tAsk + 3000, function () { on('rdrs'); });
    b(0, tAsk + 3500, function () { on('fu1', 'r-n'); say('2 readers · 1 breaks'); });

    // 2 Options: three fixes, each with a blast radius the estate graph worked out.
    P.tap(1, 1000, '.tx-fplan', function () { on('u2'); P.hide(); }, [160, 100]);
    b(1, 1400, function () { on('w2', 'x3'); say('query_estate · blast radius'); });
    b(1, 2200, function () { done('x3'); on('t-0'); });
    b(1, 2350, function () { on('t-1'); });
    b(1, 2500, function () { on('t-2'); fold('w2', 'Worked for 1s'); on('a2'); });
    b(1, 2800, function () { on('opts'); });
    ['o1', 'o2', 'o3'].forEach(function (k, i) { b(1, 3000 + i * 250, function () { on(k); }); });
    b(1, 3700, function () { on('t-n'); say('3 options'); });
    P.tap(1, 5400, '[data-k="o1"]', function () {
      cls($('[data-k="o1"]'), 'pick'); cls($('[data-k="o2"]'), 'dim'); cls($('[data-k="o3"]'), 'dim'); say('Picked: private behind the CDN');
    }, [170, 90]);
    b(1, 5900, function () { on('u3'); P.hide(); });

    // 3 Questions: only what the estate can't answer; the turn waits for each one.
    b(2, 200, function () { on('askc', 'q1'); qn.textContent = 1; say('ask_user · 3 questions'); });
    ['a-0', 'a-1', 'a-2'].forEach(function (k, i) { b(2, 300 + i * 120, function () { on(k); }); });
    b(2, 800, function () { on('a-lh'); });
    ['a-l0', 'a-l1', 'a-l2'].forEach(function (k, i) { b(2, 900 + i * 120, function () { on(k); }); });
    [2600, 4300, 6000].forEach(function (ms, i) {
      var q = 'q' + (i + 1), opt = $('.tx-qo[data-q="' + q + '"][data-o="0"]');
      P.tap(2, ms, opt, function () { cls(opt, 'pick'); on('a-' + i + 'a'); }, [-150, 80]);
      b(2, ms + 400, function () {
        on(q + 'd'); cls($('[data-k="' + q + '"]'), 'done');
        if (i < 2) { on('q' + (i + 2)); qn.textContent = i + 2; }
        say((i + 1) + ' of 3 answered');
      });
    });
    b(2, 6900, function () { off('askc'); on('u4'); P.hide(); say('3 answers'); });

    // 4 Plan: steps, parameters and blast radius, written in its own pass.
    b(3, 0, function () { on('w3', 'x4'); say('create_plan · captured'); });
    for (var j = 0; j < 8; j++) (function (j) { b(3, 200 + j * 100, function () { on('p-' + j); }); })(j);
    b(3, 1000, function () { fold('w3', 'Thought for 3s'); });
    b(3, 1200, function () { on('tab-plan'); show('plan'); say('Plan P-1 · 5 steps'); });
    b(3, 1400, function () { on('ps', 'p-k0'); });
    for (var s = 0; s < 5; s++) (function (s) { b(3, 1500 + s * 180, function () { on('ps' + s); }); })(s);
    b(3, 2100, function () { on('p-k1'); });
    b(3, 2600, function () { on('pp', 'p-k2'); });
    for (var p = 0; p < 6; p++) (function (p) { b(3, 2700 + p * 120, function () { on('pp' + p); }); })(p);
    b(3, 3600, function () { on('pb', 'p-k3'); });
    ['g2', 'g0', 'g1', 'g3', 'g4'].forEach(function (k, i) { b(3, 3700 + i * 220, function () { on(k); }); });
    b(3, 4200, function () { on('p-k4'); say('Blast radius 2 · low risk'); });
    b(3, 4900, function () { on('art1'); });
    b(3, 5200, function () { on('a3', 'l3'); });
    P.words(3, 'l3', 5300, 40);
    b(3, 6400, function () { on('fu3'); });

    // 5 Change set: one file per step; new files are reviewed, then the whole set is dry-run.
    P.tap(4, 1000, '.tx-fcs', function () { on('u5'); P.hide(); }, [170, 90]);
    b(4, 1300, function () { on('w4', 'x5'); say('create_changeset · captured'); });
    b(4, 2000, function () { fold('w4', 'Thought for 2s'); on('tab-cs'); show('cs'); });
    for (var f = 0; f < 5; f++) (function (f) { b(4, 2100 + f * 120, function () { on('f' + f, 'c-' + f); }); })(f);
    b(4, 2800, function () { on('art2'); say('5 files · 2 new'); });
    b(4, 3100, function () { on('gate'); });
    [[4300, 1], [5600, 2]].forEach(function (x, n) {
      P.tap(4, x[0], files[x[1]], function () {
        file(x[1]); cls(files[x[1]], 'rev'); rv.textContent = n + 1;
        say('Reviewed ' + files[x[1]].querySelector('span').textContent + '.py');
      }, [-140, 70]);
    });
    P.tap(4, 7000, '.tx-dryb', function () { on('dry', 'c-dh'); say('Dry run'); P.hide(); }, [-130, 80]);
    ['d0', 'd1', 'd2', 'd3'].forEach(function (k, i) { b(4, 7300 + i * 160, function () { on(k, 'c-k' + i); }); });
    b(4, 8100, function () {
      on('dok'); cls(gate, 'ready'); gs.textContent = 'Dry run passed · 2 resources change'; cs.textContent = 'Ready'; say('0 errors · 2 resources change');
    });

    // 6 Run: approved once; the step that closes public access asks again.
    P.tap(5, 1000, '.tx-go', function () {
      cls(gate, 'went'); gs.textContent = 'Approved by Sam Rivera'; on('runc', 'tab-run', 'g-0'); show('run'); say('Run E-1 approved'); P.hide();
    }, [-110, 90]);
    b(5, 1300, function () { step(0, 'run'); on('g-1'); bar(10, 'Running step 1 of 5'); });
    b(5, 2100, function () { step(0, 'done'); step(1, 'run'); on('g-2'); bar(30, 'Running step 2 of 5'); });
    b(5, 3200, function () { step(1, 'done'); step(2, 'run'); on('g-3'); bar(50, 'Running step 3 of 5'); });
    b(5, 3900, function () { step(2, 'done'); on('conf', 'g-4'); bar(60, 'Step 4 is waiting for you'); say('Step 4 asks first'); });
    P.tap(5, 5600, '.tx-cont', function () { off('conf'); step(3, 'run'); on('g-5'); bar(70, 'Running step 4 of 5'); say('Confirmed'); P.hide(); }, [-120, 80]);
    b(5, 6900, function () { step(3, 'done'); step(4, 'run'); on('g-6'); bar(90, 'Running step 5 of 5'); });
    b(5, 7600, function () { step(4, 'done'); bar(100, 'Ran 5 steps · 9.7s'); cls($('.tx-rst'), 'res'); on('g-n'); say('5 of 5 steps done'); });

    // 7 Verify: fresh reads, then the finding closes with them as evidence.
    b(6, 0, function () { on('vf'); say('Verifying with fresh reads'); });
    for (var v = 0; v < 4; v++) (function (v) {
      b(6, 300 + v * 800, function () { on('v' + (v + 1)); });
      b(6, 950 + v * 800, function () { done('v' + (v + 1)); on('v-' + v); });
    })(v);
    b(6, 3700, function () { on('vres', 'resv', 'v-r'); cls($('.tx-st'), 'res'); sess.classList.add('idle'); say('F-1 resolved'); });
    b(6, 4200, function () { on('a4', 'l4'); });
    P.words(6, 'l4', 4300, 40);
    b(6, 5600, function () { on('slack', 'v-s'); });
    b(6, 6000, function () { on('v-n'); });
    b(6, 6800, function () { show('fnd'); });

    P.start({
      D: [tAsk + 5000, 7200, 8000, 7800, 9600, 9000, 9600],
      states: ['pick', 'dim', 'sel', 'rev', 'went', 'res'],
      reset: function () {
        sess.classList.remove('on', 'idle');
        ph.classList.remove('typed'); ph.textContent = ph.dataset.ph;
        Object.keys(LABEL).forEach(function (k) { label(k, LABEL[k]); });
        show('fnd'); file(0);
        qn.textContent = 1; rv.textContent = 0;
        runRows.forEach(function (r) { delete r.dataset.st; });
        bar(0, 'Running step 1 of 5');
        gs.textContent = 'Dry run it first.'; cs.textContent = 'Review';
      },
    });
  });
})();
