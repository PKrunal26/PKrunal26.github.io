// Escher case study: sidebar scrollspy, scroll reveals, and the three live visuals
// (gen-UI stream, scan grid, token toggle). Everything degrades to the finished state
// without IntersectionObserver or with reduced motion.
(function () {
  var root = document.documentElement;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };

  // Scroll reveals for the drawn illustrations.
  if (hasIO && !reduced) {
    root.classList.add('reveal');
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    $$('.cs .art:not(.live), .cs .ico').forEach(function (el) { ro.observe(el); });
  }

  // Sidebar: mark the section that holds the reading line (a third of the way down).
  var links = $$('.toc a');
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var sections = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var current = null;
  function setCurrent(id) {
    if (id === current) return;
    current = id;
    links.forEach(function (a) { a.setAttribute('aria-current', a === byId[id] ? 'true' : 'false'); });
  }
  function spy() {
    var line = innerHeight * 0.33, id = sections.length ? sections[0].id : null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= line) id = sections[i].id; else break;
    }
    setCurrent(id);
  }
  var ticking = false;
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; spy(); }); }
  }, { passive: true });
  addEventListener('resize', spy);
  spy();
  // The article starts hidden behind the password, so check again once it opens.
  var article = document.getElementById('locked');
  if (article && 'MutationObserver' in window) {
    new MutationObserver(function () { if (!article.hidden) spy(); }).observe(article, { attributes: true, attributeFilter: ['hidden'] });
  }

  // ---------- Live visuals ----------
  var timers = new WeakMap();
  function clear(el) { (timers.get(el) || []).forEach(clearTimeout); timers.set(el, []); }
  function later(el, fn, ms) { var t = setTimeout(fn, ms); (timers.get(el) || timers.set(el, []).get(el)).push(t); return t; }

  // Gen UI: type each line, then reveal the piece of the answer it declares.
  var stream = {
    prep: function (el) {
      el.classList.add('is-anim');
      el.classList.remove('done');
      $$('[data-k]', el).forEach(function (p) { p.classList.remove('on'); });
      $$('.ln', el).forEach(function (ln) { ln.textContent = ''; });
      el.querySelector('.stream-lines').appendChild(el.querySelector('.caret'));
    },
    run: function (el) {
      var lines = $$('.ln', el), caret = el.querySelector('.caret'), t = 300;
      lines.forEach(function (ln) {
        var text = ln.getAttribute('data-text'), node;
        later(el, function () { ln.textContent = ''; node = document.createTextNode(''); ln.appendChild(node); ln.appendChild(caret); }, t);
        for (var i = 0; i < text.length; i++) {
          (function (c) { later(el, function () { node.data += c; }, t + 14 * (i + 1)); })(text[i]);
        }
        t += 14 * text.length + 120;
        later(el, function () {
          var k = ln.getAttribute('data-k');
          var piece = k === 'root' ? el.querySelector('.stream-card') : el.querySelector('.stream-card [data-k="' + k + '"]');
          if (piece) piece.classList.add('on');
        }, t);
        t += 260;
      });
      later(el, function () { el.querySelector('.stream-lines').appendChild(caret); el.classList.add('done'); }, t + 200);
    },
    finish: function (el) {
      el.classList.remove('is-anim');
      $$('.ln', el).forEach(function (ln) { ln.textContent = ln.getAttribute('data-text'); });
      el.classList.add('done');
    }
  };

  // Scan: a pool of twelve calls works through every type × region; two fail, get recorded, and retry.
  var scan = {
    cells: function (el) { return $$('.sg i', el); },
    count: function (el, run, done) {
      el.querySelector('[data-c="run"]').textContent = run;
      el.querySelector('[data-c="done"]').textContent = done;
    },
    prep: function (el) {
      el.classList.remove('done');
      scan.cells(el).forEach(function (c) { c.className = ''; c.removeAttribute('data-tried'); });
      scan.count(el, 0, 0);
    },
    run: function (el) {
      var queue = scan.cells(el).slice(), running = 0, done = 0, total = queue.length, seed = 7;
      function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      function pump() {
        while (running < 12 && queue.length) start(queue.shift());
        scan.count(el, running, done);
        if (!running && !queue.length) el.classList.add('done');
      }
      function start(c) {
        running++;
        c.className = 'run';
        later(el, function () {
          running--;
          if (c.getAttribute('data-fail') === '1' && !c.hasAttribute('data-tried')) {
            c.className = 'fail';
            c.setAttribute('data-tried', '');
            later(el, function () { queue.push(c); pump(); }, 700);
          } else {
            c.className = c.hasAttribute('data-tried') ? 'done retried' : 'done';
            done++;
          }
          pump();
        }, 160 + rnd() * 420);
      }
      pump();
    },
    finish: function (el) {
      scan.cells(el).forEach(function (c) { c.className = c.getAttribute('data-fail') === '1' ? 'done retried' : 'done'; });
      var n = scan.cells(el).length;
      scan.count(el, 0, n);
      el.classList.add('done');
    }
  };

  // Tokens: toggle before / after caching; the readout eases to the new total.
  $$('[data-live="tokens"]').forEach(function (el) {
    var val = el.querySelector('[data-r="val"]');
    var before = +el.getAttribute('data-before'), after = +el.getAttribute('data-after'), shown = before, raf;
    $$('.seg button', el).forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = b.getAttribute('data-mode'), to = mode === 'after' ? after : before, from = shown, t0 = performance.now();
        $$('.seg button', el).forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        el.classList.toggle('after', mode === 'after');
        cancelAnimationFrame(raf);
        if (reduced) { shown = to; val.textContent = Math.round(to) + 'k'; return; }
        (function step(now) {
          var k = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - k, 3);
          shown = from + (to - from) * e;
          val.textContent = Math.round(shown) + 'k';
          if (k < 1) raf = requestAnimationFrame(step);
        })(t0);
      });
    });
  });

  var kinds = { stream: stream, scan: scan };
  $$('[data-live]').forEach(function (el) {
    var k = kinds[el.getAttribute('data-live')];
    if (!k) return;
    var replay = el.querySelector('.replay');
    if (reduced || !hasIO) { k.finish(el); if (replay) replay.remove(); return; }
    k.prep(el);
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); k.run(el); }
    }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(el);
    if (replay) replay.addEventListener('click', function () { clear(el); k.prep(el); k.run(el); });
  });

  // ---------- Data model: choose a table, trace its links ----------
  $$('[data-live="schema"]').forEach(function (fig) {
    var grid = fig.querySelector('.er-grid'), svg = fig.querySelector('.er-wires'), note = fig.querySelector('.er-note');
    var tables = {};
    $$('.er-t', fig).forEach(function (t) { tables[t.getAttribute('data-t')] = t; });
    var sel = 'resources', NS = 'http://www.w3.org/2000/svg';
    function box(el, g) {
      var r = el.getBoundingClientRect();
      return { l: r.left - g.left, r: r.right - g.left, t: r.top - g.top, b: r.bottom - g.top, y: (r.top + r.bottom) / 2 - g.top };
    }
    function wire(a, b) {
      var d, end;
      if (Math.abs(a.l - b.l) < 4) {            // same column: bracket down the left side
        var x = a.l - 14;
        d = 'M' + a.l + ' ' + a.y + 'H' + (x + 6) + 'Q' + x + ' ' + a.y + ' ' + x + ' ' + (a.y + (b.y > a.y ? 6 : -6)) +
            'V' + (b.y + (b.y > a.y ? -6 : 6)) + 'Q' + x + ' ' + b.y + ' ' + (x + 6) + ' ' + b.y + 'H' + b.l;
        end = [b.l, b.y];
      } else {                                   // across columns: elbow in the gap next to the target
        var right = b.l > a.r, sx = right ? a.r : a.l, ex = right ? b.l : b.r, mx = right ? ex - 24 : ex + 24;
        var dy = b.y - a.y, k = Math.min(6, Math.abs(dy) / 2), sg = dy > 0 ? 1 : -1, sd = right ? 1 : -1;
        d = 'M' + sx + ' ' + a.y + 'H' + (mx - sd * k) + (k ? 'Q' + mx + ' ' + a.y + ' ' + mx + ' ' + (a.y + sg * k) + 'V' + (b.y - sg * k) + 'Q' + mx + ' ' + b.y + ' ' + (mx + sd * k) + ' ' + b.y : '') + 'H' + ex;
        end = [ex, b.y];
      }
      return { d: d, end: end };
    }
    function draw(animate) {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      if (!grid.offsetWidth || getComputedStyle(svg).display === 'none') return;
      var g = grid.getBoundingClientRect(), a = box(tables[sel], g);
      (tables[sel].getAttribute('data-links') || '').split(' ').filter(Boolean).forEach(function (n) {
        var w = wire(a, box(tables[n], g));
        var p = document.createElementNS(NS, 'path'); p.setAttribute('d', w.d); svg.appendChild(p);
        var c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', w.end[0]); c.setAttribute('cy', w.end[1]); c.setAttribute('r', 3.5); svg.appendChild(c);
        if (animate && !reduced) {
          var L = p.getTotalLength();
          p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
          c.style.opacity = 0; c.style.transition = 'opacity .2s ease .45s';
          p.getBoundingClientRect();
          p.style.transition = 'stroke-dashoffset .5s cubic-bezier(.2,.7,.2,1)'; p.style.strokeDashoffset = 0; c.style.opacity = 1;
        }
      });
    }
    function choose(name, animate) {
      sel = name;
      var links = (tables[name].getAttribute('data-links') || '').split(' ').filter(Boolean);
      fig.classList.add('has-sel');
      Object.keys(tables).forEach(function (n) {
        var t = tables[n];
        t.classList.toggle('sel', n === name);
        t.classList.toggle('rel', links.indexOf(n) > -1);
        t.setAttribute('aria-pressed', n === name ? 'true' : 'false');
      });
      note.innerHTML = '';
      var b = document.createElement('b'); b.textContent = name;
      var sp = document.createElement('span');
      sp.textContent = tables[name].getAttribute('data-desc') + (links.length ? ' Links to ' + links.join(', ') + '.' : ' Links to no other table.');
      note.appendChild(b); note.appendChild(document.createTextNode(' ')); note.appendChild(sp);
      draw(animate);
    }
    Object.keys(tables).forEach(function (n) { tables[n].addEventListener('click', function () { choose(n, true); }); });
    choose(sel, false);
    addEventListener('resize', function () { draw(false); });
    if (article && 'MutationObserver' in window) new MutationObserver(function () { if (!article.hidden) draw(false); }).observe(article, { attributes: true, attributeFilter: ['hidden'] });
    if (hasIO) new IntersectionObserver(function (es) { if (es[0].isIntersecting) draw(false); }).observe(fig);
  });

  // ---------- Components: the working copies ----------
  $$('.gc').forEach(function (chart) {
    var tip = chart.querySelector('.gc-tip'), plot = chart.querySelector('.gc-plot');
    $$('.gc-band', chart).forEach(function (b) {
      function show() {
        var r = b.getBoundingClientRect(), p = plot.getBoundingClientRect(), bar = b.querySelector('i').getBoundingClientRect();
        tip.textContent = b.querySelector('span').textContent + '  ' + b.getAttribute('data-v');
        tip.style.left = (r.left + r.width / 2 - p.left) + 'px';
        tip.style.top = (bar.top - p.top - 6) + 'px';
        tip.classList.add('on');
      }
      b.addEventListener('mouseenter', show); b.addEventListener('focus', show);
      b.addEventListener('mouseleave', function () { tip.classList.remove('on'); });
      b.addEventListener('blur', function () { tip.classList.remove('on'); });
    });
  });
  $$('.gd').forEach(function (table) {
    var body = table.querySelector('tbody'), btns = $$('th button', table);
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = +btn.getAttribute('data-k'), dir = btn.getAttribute('aria-sort') === 'descending' ? 'ascending' : 'descending';
        btns.forEach(function (o) { o.removeAttribute('aria-sort'); });
        btn.setAttribute('aria-sort', dir);
        $$('tr', body).sort(function (x, y) {
          var a = x.children[k], c = y.children[k];
          var va = a.hasAttribute('data-v') ? +a.getAttribute('data-v') : a.textContent, vc = c.hasAttribute('data-v') ? +c.getAttribute('data-v') : c.textContent;
          var r = va > vc ? 1 : va < vc ? -1 : 0;
          return dir === 'ascending' ? r : -r;
        }).forEach(function (tr) { body.appendChild(tr); });
      });
    });
  });
  $$('.gw').forEach(function (w) {
    var input = w.querySelector('input'), rate = +w.getAttribute('data-rate');
    function upd() {
      w.querySelector('[data-w="days"]').textContent = input.value;
      w.querySelector('[data-w="cost"]').textContent = '$' + Math.round(input.value * rate).toLocaleString('en-US');
    }
    input.addEventListener('input', upd); upd();
  });
  $$('.gt-m').forEach(function (m) {
    var stage = m.closest('.gx-stage');
    m.addEventListener('click', function () { stage.classList.toggle('open'); });
  });
  $$('.gq').forEach(function (q) {
    var steps = [['Which environment?', ['Production', 'Staging', 'Development']], ['How far back?', ['7 days', '30 days', '90 days']]];
    var picked = [];
    function render() {
      var step = q.querySelector('.gq-step'), title = q.querySelector('.gq-q'), opts = q.querySelector('.gq-o');
      opts.innerHTML = '';
      if (picked.length < steps.length) {
        step.textContent = (picked.length + 1) + ' of ' + steps.length;
        title.textContent = steps[picked.length][0];
        steps[picked.length][1].forEach(function (o) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = o;
          b.addEventListener('click', function () { picked.push(o); render(); var f = q.querySelector('.gq-o button'); if (f) f.focus(); });
          opts.appendChild(b);
        });
      } else {
        step.textContent = 'Done';
        title.textContent = picked[0] + ', last ' + picked[1] + '.';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'again'; b.textContent = 'Start again';
        b.addEventListener('click', function () { picked = []; render(); });
        opts.appendChild(b);
      }
    }
    render();
  });

  // ---------- Evaluation: put a mistake in, see which grader catches it ----------
  $$('[data-live="graders"]').forEach(function (fig) {
    var data = JSON.parse(fig.querySelector('.gv-data').textContent);
    var chips = $$('.gv-chips button', fig), rows = $$('.gv-list li', fig);
    var tool = fig.querySelector('.gv-tool'), code = fig.querySelector('.gv-code');
    var msg = fig.querySelector('.gv-msg'), why = fig.querySelector('.gv-why');
    function lines(el, arr, bad) {
      el.innerHTML = '';
      arr.forEach(function (l, i) { var s = document.createElement('span'); s.textContent = l; if (bad.indexOf(i) > -1) s.className = 'bad'; el.appendChild(s); });
    }
    function settle(sc) {
      msg.classList.remove('hold');
      msg.classList.toggle('ok', !sc.fail);
      msg.querySelector('code').textContent = sc.fail ? sc.msg : 'All six graders pass.';
    }
    function run(i, animate) {
      var sc = data[i];
      clear(fig);
      chips.forEach(function (c, j) { c.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      lines(tool, sc.tool, []); lines(code, sc.code, sc.bad);
      why.textContent = sc.why;
      if (!animate || reduced) {
        rows.forEach(function (r) { r.className = r.getAttribute('data-g') === sc.fail ? 'fail' : 'pass'; });
        settle(sc); return;
      }
      rows.forEach(function (r) { r.className = 'wait'; });
      msg.classList.add('hold');
      rows.forEach(function (r, j) {
        later(fig, function () { r.className = 'run'; }, 120 + j * 260);
        later(fig, function () { r.className = r.getAttribute('data-g') === sc.fail ? 'fail' : 'pass'; }, 120 + j * 260 + 220);
      });
      later(fig, function () { settle(sc); }, 120 + rows.length * 260 + 60);
    }
    chips.forEach(function (c, j) { c.addEventListener('click', function () { run(j, true); }); });
    if (hasIO && !reduced) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); run(0, true); } }, { rootMargin: '0px 0px -25% 0px' });
      io.observe(fig);
    }
  });

  // ---------- Ask: trace a number in the report back to the call it came from ----------
  $$('[data-live="passes"]').forEach(function (fig) {
    var cites = $$('.ps-c', fig), calls = $$('.ps-calls li[data-f]', fig);
    var order = ['2', '1', '4', '3'], at = 0, timer = 0, held = false;
    function show(f) {
      fig.classList.toggle('tracing', !!f);
      cites.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-f') === f); });
      calls.forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-f') === f); });
    }
    function tour() {
      clearTimeout(timer);
      if (held || reduced) return;
      show(order[at]);
      at = (at + 1) % order.length;
      timer = setTimeout(tour, 2200);
    }
    cites.forEach(function (c) {
      var f = c.getAttribute('data-f');
      function hold() { held = true; clearTimeout(timer); show(f); }
      function release() { held = false; show(null); timer = setTimeout(tour, 2600); }
      c.addEventListener('mouseenter', hold);
      c.addEventListener('focus', hold);
      c.addEventListener('mouseleave', release);
      c.addEventListener('blur', release);
      c.addEventListener('click', hold);
    });
    if (hasIO && !reduced) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { if (!held) tour(); } else { clearTimeout(timer); if (!held) show(null); }
      }, { rootMargin: '0px 0px -20% 0px' }).observe(fig);
    }
  });
})();
