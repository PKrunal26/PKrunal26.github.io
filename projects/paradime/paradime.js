// Paradime Marketplace page: the play-mode editor, code panes, the extensions
// meter, the contents rail and sideways scrolling for wide figures. Every
// control works with a mouse, a keyboard and touch, and motion settles to a
// still state when the visitor prefers reduced motion.
(() => {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const span = (c, s) => `<span class="${c}">${esc(s)}</span>`;

  // ── Syntax colours: small highlighters for dbt SQL with Jinja, and YAML ──
  function sql(line) {
    const re = /(--.*$)|(\{#-?.*?-?#\})|(\{[{%]-?|-?[}%]\})|('(?:[^'\\]|\\.)*')|\b(select|from|where|left|join|using|on|as|group|by|with|if|else|endif|macro|endmacro|and|or|not|is|none|in)\b|\b(min|max|count|coalesce|sum|ref|source|trim|env_var)\b|\b(\d+)\b/gi;
    const cls = [null, 'c', 'c', 'j', 's', 'w', 'f', 'u'];
    let out = '', at = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(at, m.index));
      const g = cls.findIndex((_, i) => i && m[i] !== undefined);
      out += span(cls[g], m[0]);
      at = m.index + m[0].length;
    }
    return out + esc(line.slice(at));
  }
  function value(s) {
    const re = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(#.*$)|\b(true|false|null)\b|(?<![\w.])(\d+)(?![\w.])|(\|)/g;
    let out = '', at = 0, m;
    while ((m = re.exec(s))) {
      out += esc(s.slice(at, m.index));
      if (m[1]) out += span(m[1].includes('{{') ? 'j' : 's', m[1]);
      else if (m[2]) out += span('c', m[2]);
      else if (m[3] || m[4]) out += span('u', m[0]);
      else out += span('x', m[0]);
      at = m.index + m[0].length;
    }
    return out + esc(s.slice(at));
  }
  function yaml(line) {
    if (/^\s*#/.test(line)) return span('c', line);
    const m = line.match(/^(\s*(?:-\s+)?)([+\w.-]+)(:)(.*)$/);
    if (!m) return value(line);
    return esc(m[1]) + span('k', m[2]) + span('x', ':') + value(m[4]);
  }
  const hl = (lang, s) => (lang === 'sql' ? sql(s) : yaml(s));

  // ── The project: files the slog touches. A leading "+" marks a line it adds. ──
  const FILES = {
    'models/marts/customers.sql': { lang: 'sql', lines: [
      'with customers as (',
      "    select * from {{ ref('stg_customers') }}",
      '),',
      'orders as (',
      "    select * from {{ ref('stg_orders') }}",
      '),',
      'customer_orders as (',
      '    select',
      '        customer_id,',
      '        min(order_date) as first_order,',
      '        max(order_date) as most_recent_order,',
      '        count(order_id) as number_of_orders',
      '    from orders',
      '    group by customer_id',
      ')',
      'select',
      '    customers.customer_id,',
      '    customers.first_name,',
      '    customers.last_name,',
      '    customer_orders.first_order,',
      '    customer_orders.most_recent_order,',
      '    coalesce(customer_orders.number_of_orders, 0) as number_of_orders',
      'from customers',
      'left join customer_orders using (customer_id)',
    ] },
    'profiles.yml': { lang: 'yaml', lines: [
      'jaffle_shop:',
      '  target: dev',
      '  outputs:',
      '    dev:',
      '      type: snowflake',
      "      account: \"{{ env_var('SF_ACCOUNT') }}\"",
      "      user: \"{{ env_var('DBT_USER') }}\"",
      "      password: \"{{ env_var('DBT_PASSWORD') }}\"",
      '      role: transformer',
      '      database: analytics',
      '      warehouse: transforming',
      '      schema: dbt_krunal',
      '      threads: 4',
      '+    prod:',
      '+      type: snowflake',
      "+      account: \"{{ env_var('SF_ACCOUNT') }}\"",
      "+      user: \"{{ env_var('DBT_PROD_USER') }}\"",
      "+      password: \"{{ env_var('DBT_PROD_PASSWORD') }}\"",
      '+      role: transformer',
      '+      database: analytics',
      '+      warehouse: transforming',
      '+      schema: analytics',
      '+      threads: 8',
    ] },
    'macros/generate_schema_name.sql': { lang: 'sql', lines: [
      '+{% macro generate_schema_name(custom_schema_name, node) -%}',
      '+',
      '+    {#- Prod: the schema the folder sets. Dev: your own. -#}',
      "+    {%- if target.name == 'prod' and custom_schema_name is not none -%}",
      '+        {{ custom_schema_name | trim }}',
      '+    {%- else -%}',
      '+        {{ target.schema }}',
      '+    {%- endif -%}',
      '+',
      '+{%- endmacro %}',
    ] },
    'dbt_project.yml': { lang: 'yaml', lines: [
      'name: jaffle_shop',
      "version: '1.0.0'",
      'config-version: 2',
      'profile: jaffle_shop',
      '',
      'model-paths: ["models"]',
      'macro-paths: ["macros"]',
      'seed-paths: ["seeds"]',
      'target-path: "target"',
      '',
      'models:',
      '  jaffle_shop:',
      '    staging:',
      '      +materialized: view',
      '    marts:',
      '+      +schema: marts',
      "+      +materialized: \"{{ 'table' if target.name == 'prod' else 'view' }}\"",
    ] },
  };

  // The slog file, in the PRD's format. g: part of the file (1 header, 2 text,
  // 3 instruction); s: the step an instruction belongs to; t: a text section.
  const SLOG = [
    { g: 1, l: 'slog_name: "Switch to a production target"' },
    { g: 1, l: 'slog_description: "Add a prod target, and build marts as tables on prod"' },
    { g: 1, l: 'slog_author: "Jacob Jones"' },
    { l: '' },
    { g: 2, t: 1, l: 'Dev stays the default target. Prod gets its own user and schema.' },
    { l: '' },
    { g: 3, s: 1, l: '- instruction_name: "Add a prod output"' },
    { g: 3, s: 1, l: '  file_directory: "."' },
    { g: 3, s: 1, l: '  file_name: "profiles.yml"' },
    { g: 3, s: 1, l: '  change: |' },
    { g: 3, s: 1, l: '    prod:' },
    { g: 3, s: 1, l: '      type: snowflake' },
    { g: 3, s: 1, l: '      schema: analytics' },
    { g: 3, s: 1, l: '      # …and 6 more lines' },
    { l: '' },
    { g: 2, t: 1, l: 'On prod, models build into the schema their folder sets.' },
    { l: '' },
    { g: 3, s: 2, l: '- instruction_name: "Pick the schema by target"' },
    { g: 3, s: 2, l: '  file_directory: "macros"' },
    { g: 3, s: 2, l: '  file_name: "generate_schema_name.sql"' },
    { g: 3, s: 2, l: '  change: |' },
    { g: 3, s: 2, l: '    {% macro generate_schema_name(custom_schema_name, node) -%}', sql: 1 },
    { g: 3, s: 2, l: '      # …and 9 more lines' },
    { l: '' },
    { g: 3, s: 3, l: '- instruction_name: "Make marts tables on prod"' },
    { g: 3, s: 3, l: '  file_directory: "."' },
    { g: 3, s: 3, l: '  file_name: "dbt_project.yml"' },
    { g: 3, s: 3, l: '  change: |' },
    { g: 3, s: 3, l: '    +schema: marts' },
    { g: 3, s: 3, l: "    +materialized: \"{{ 'table' if target.name == 'prod' else 'view' }}\"" },
    { l: '' },
    { g: 3, s: 4, l: '- instruction_name: "Build against prod"' },
    { g: 3, s: 4, l: '  run: "dbt build --target prod"' },
  ];
  const SLOG_FILE = 'switch_to_prod.slog';

  function lineHTML(html, n, cls = '', k = 0, extra = '') {
    return `<li data-n="${n}"${cls ? ` class="${cls}"` : ''}${k ? ` style="--k:${k}"` : ''}${extra}><span>${html || ' '}</span></li>`;
  }
  function fileHTML(path, fresh) {
    const f = FILES[path];
    let k = 0;
    return f.lines.map((raw, i) => {
      const add = raw.startsWith('+');
      const text = add ? raw.slice(1) : raw;
      const cls = add ? (fresh ? 'add fresh' : 'add') : '';
      return lineHTML(hl(f.lang, text), i + 1, cls, add && fresh ? ++k : 0);
    }).join('');
  }
  function slogHTML(step, marks) {
    return SLOG.map((r, i) => {
      if (r.t) return lineHTML(esc(r.l), i + 1, 'text', 0, marks ? ` data-g="${r.g}"` : '');
      const cls = marks && r.g === 3 ? 'gb' : (step && r.s === step ? 'add' : '');
      return lineHTML(r.sql ? sql(r.l) : yaml(r.l), i + 1, cls, 0, marks && r.g ? ` data-g="${r.g}"` : '');
    }).join('');
  }

  // Static code panes elsewhere on the page.
  $$('[data-render]').forEach((box) => {
    const ol = $('ol', box);
    if (box.dataset.render === 'customers') ol.innerHTML = fileHTML('models/marts/customers.sql');
    if (box.dataset.render === 'slog') ol.innerHTML = slogHTML(0, true);
  });

  // ── Play mode ─────────────────────────────────────────────────────────────
  const play = $('#play');
  if (play) {
    const STEPS = [
      { file: 'profiles.yml', t: 'Add a prod output', d: 'A second connection, with its own user and schema. Dev stays the default target.' },
      { file: 'macros/generate_schema_name.sql', t: 'Pick the schema by target', d: 'A new macro. On prod, models build into the schema their folder sets. In dev, everything stays in your own schema.' },
      { file: 'dbt_project.yml', t: 'Make marts tables on prod', d: 'Marts get their own schema. They build as tables on prod and as views in dev.' },
      { term: true, t: 'Build against prod', d: 'Runs every seed, model and test on the prod target.' },
    ];
    const TERM = [
      '<span class="p">$</span> <span class="h">dbt build --target prod</span>',
      'Running with dbt=1.4.1',
      'Found 5 models, 20 tests, 3 seed files',
      "Concurrency: 8 threads (target='prod')",
      ' 1 of 28 <span class="g">OK</span> loaded seed file analytics.raw_customers .... [INSERT 100 in 1.21s]',
      ' 7 of 28 <span class="g">OK</span> created sql view model analytics.stg_orders  [SUCCESS 1 in 0.84s]',
      '24 of 28 <span class="g">OK</span> created sql table model marts.customers .... [SUCCESS 1 in 1.92s]',
      '25 of 28 <span class="g">OK</span> created sql table model marts.orders ....... [SUCCESS 1 in 1.64s]',
      '',
      '<span class="g">Completed successfully</span>',
      'Done. PASS=28 WARN=0 ERROR=0 SKIP=0 TOTAL=28',
    ];
    const BASE = 'models/marts/customers.sql';
    const code = $('.a-code', play), ol = $('ol', code);
    const tabs = $('.a-tabs', play), crumbs = $('.a-crumbs .path', play), chip = $('.a-crumbs .chip', play);
    const term = $('.a-term', play), termOl = $('ol', term), termChip = $('.a-term-h .chip', play);
    const list = $('.sl-steps', play), prog = $('.sl-prog i', play);
    const back = $('[data-go=back]', play), next = $('[data-go=next]', play);
    const modes = $$('[data-mode]', play), dot = $('.a-rail .dot', play);
    const icon = (name) => { const el = $(`[data-mode] .ic[data-ic="${name}"]`, play) || $(`.ic[data-ic="${name}"]`, play); return el ? el.outerHTML : ''; };
    const playIc = icon('play'), arrowIc = icon('arrow-right');
    termOl.innerHTML = TERM.map((l, i) => `<li style="--k:${i}">${l || ' '}</li>`).join('');

    list.innerHTML = STEPS.map((s, i) => `<li><button type="button" class="sl-step" data-step="${i + 1}"><span class="sl-n"><span>${i + 1}</span></span><span><span class="sl-t">${s.t}</span><span class="sl-f">${s.file || 'Terminal'}</span><span class="sl-d"><span>${s.d}</span></span></span></button></li>`).join('');
    const stepBtns = $$('.sl-step', list);
    const intro = document.createElement('div');
    intro.className = 'sl-intro';
    intro.innerHTML = '<p>Four steps, across three files and the terminal. Each change opens in its own file, highlighted, in order.</p>';
    list.before(intro);

    let k = 0, mode = 'play';
    const opened = () => [BASE, ...STEPS.slice(0, Math.min(k, 3)).map((s) => s.file)];
    const active = () => (mode === 'view' ? SLOG_FILE : k === 0 ? BASE : STEPS[Math.min(k, 3) - 1].file);
    const ext = (p) => (p.endsWith('.sql') ? ['sql', 'sql'] : p.endsWith('.slog') ? ['slg', 'slg'] : ['yml', 'yml']);

    function scrollTo(firstAdd, n) {
      const h = code.clientHeight - 20;
      const max = Math.max(0, n * 20 - h + 10);
      const y = firstAdd < 0 ? 0 : Math.min(max, Math.max(0, (firstAdd - 4) * 20));
      ol.style.transform = `translateY(${-y}px)`;
    }

    function render(animate) {
      const path = active();
      // Steps, progress and buttons
      stepBtns.forEach((b, i) => {
        b.classList.toggle('on', i + 1 === k);
        b.classList.toggle('done', i + 1 < k || k === 5);
        b.setAttribute('aria-current', i + 1 === k ? 'step' : 'false');
      });
      intro.hidden = k !== 0;
      prog.style.setProperty('--p', `${(Math.min(k, 4) / 4) * 100}%`);
      back.disabled = k === 0;
      next.innerHTML = k === 0 ? `Start${playIc}` : k < 4 ? `Next step${arrowIc}` : k === 4 ? `Finish${arrowIc}` : 'Replay';
      dot.classList.toggle('dot', k > 0 && k < 5);
      // Explorer: the new macro appears at step 2, and each touched file gets its step number.
      $$('[data-file]', play).forEach((li) => {
        const f = li.dataset.file, s = STEPS.findIndex((x) => x.file === f) + 1;
        if (f === 'macros/generate_schema_name.sql') {
          const show = k >= 2;
          if (show && li.hidden && animate) li.classList.add('new');
          li.hidden = !show;
        }
        li.classList.toggle('on', f === path);
        const b = $('b', li);
        if (b) { b.classList.toggle('show', s > 0 && s <= k); b.classList.toggle('done', s > 0 && (s < k || k === 5)); }
      });
      // Tabs and breadcrumbs
      const files = mode === 'view' ? [...opened(), SLOG_FILE] : opened();
      tabs.innerHTML = files.map((p) => {
        const [c, t] = ext(p);
        return `<span class="a-tab${p === path ? ' on' : ''}"><span class="ext ${c}">${t}</span>${p.split('/').pop()}</span>`;
      }).join('');
      const on = $('.a-tab.on', tabs);
      tabs.scrollLeft = on ? Math.max(0, on.offsetLeft + on.offsetWidth - tabs.clientWidth) : 0;
      crumbs.innerHTML = (path === SLOG_FILE ? ['slogs', SLOG_FILE] : ['jaffle_shop', ...path.split('/')]).map((p, i, a) => (i === a.length - 1 ? `<b>${p}</b>` : `${p} ›`)).join(' ');
      chip.textContent = k === 5 ? 'Slog done' : k ? `Step ${k} of 4` : '';
      chip.classList.toggle('show', k > 0);
      // Code
      if (path === SLOG_FILE) {
        ol.innerHTML = slogHTML(Math.min(k, 4));
        scrollTo(SLOG.findIndex((r) => r.s === k), SLOG.length);
      } else {
        const fresh = animate && !still && STEPS[k - 1] && STEPS[k - 1].file === path;
        ol.innerHTML = fileHTML(path, fresh);
        scrollTo(FILES[path].lines.findIndex((l) => l.startsWith('+')), FILES[path].lines.length);
      }
      // Terminal
      const open = k >= 4;
      if (open && !term.classList.contains('open')) {
        void term.offsetHeight;
        term.classList.add('open');
      } else if (!open) term.classList.remove('open');
      termChip.classList.toggle('show', k === 5 || (k === 4 && still));
      if (k === 4 && !still) setTimeout(() => { if (k >= 4) termChip.classList.add('show'); }, 1500);
    }

    function go(to) {
      const anim = to > k || to === 1;
      k = Math.max(0, Math.min(5, to));
      if (k === 0) term.classList.remove('open');
      render(anim);
    }
    next.addEventListener('click', () => go(k === 5 ? 0 : k + 1));
    back.addEventListener('click', () => go(k === 5 ? 3 : k - 1));
    stepBtns.forEach((b) => b.addEventListener('click', () => { if (+b.dataset.step !== k) go(+b.dataset.step); }));
    modes.forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.mode;
      modes.forEach((m) => m.setAttribute('aria-pressed', String(m === b)));
      render(false);
    }));
    render(false);
  }

  // ── Slog file: the parts of the file light up with their notes ──────────
  const sf = $('#slogfile');
  if (sf) {
    $$('.anat li', sf).forEach((li) => {
      li.tabIndex = 0;
      const on = () => { sf.dataset.hl = li.dataset.g; };
      const off = () => { delete sf.dataset.hl; };
      li.addEventListener('pointerenter', on); li.addEventListener('focus', on);
      li.addEventListener('pointerleave', off); li.addEventListener('blur', off);
    });
  }

  // ── Extensions: installed plugins add up against the free 100 ───────────
  const ext = $('#ext');
  if (ext) {
    const FREE = 100;
    const used = $('.xm-used', ext), fill = $('.xm-bar i', ext), over = $('.xm-bar i.over', ext), note = $('.xm-note', ext);
    const plus = $('.x-act[aria-pressed=false] .ic', ext);
    const plusIc = plus ? plus.outerHTML : '';
    const btns = $$('.x-act', ext);
    function sum() {
      const total = btns.filter((b) => b.getAttribute('aria-pressed') === 'true').reduce((a, b) => a + +b.closest('.x-item').dataset.d, 0);
      const scale = Math.max(FREE, total);
      used.textContent = total;
      fill.style.setProperty('--u', `${(Math.min(total, FREE) / scale) * 100}%`);
      over.style.setProperty('--o', `${(Math.max(0, total - FREE) / scale) * 100}%`);
      note.innerHTML = total <= FREE
        ? `${FREE - total} dimes to spare this month.`
        : `<b>${total - FREE} over the free 100.</b> Earn them, or pay $${((total - FREE) / 10).toFixed(2)}.`;
    }
    btns.forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      b.innerHTML = on ? 'Installed' : `${plusIc}Install`;
      sum();
    }));
    sum();
  }

  // ── Wide figures: on a narrow screen diagrams, charts and product screens
  // scroll sideways, with a bar that stays visible (touch browsers hide
  // native scrollbars). Drag the bar or tap the track to move. ────────────
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
  $$('.diagram > svg, .chart > .gantt, .chart > .hbars, .shot > .app').forEach((el) => {
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

  // ── Charts ease in once ─────────────────────────────────────────────────
  if (!still && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('reveal');
    const ro = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.pd .chart').forEach((el) => ro.observe(el));
  }
})();
