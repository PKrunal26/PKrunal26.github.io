// Cloud Migration Assistant page: the redrawn product screens (Choose for a new
// plan, annotated, and opened from a saved plan; the old five-step flow; the
// migrations dashboard), the annotated pins, the home before and after with its
// instance map, sideways scrolling for wide figures and the contents rail.
// Every control works with a mouse, a keyboard and touch. Data is made up.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // ── Icons: Phosphor (MIT) paths, and small status glyphs in the Atlassian style ──
  const P = {
    search: 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z',
    bell: 'M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z',
    help: 'M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z',
    gear: 'M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm109.94-52.79a8,8,0,0,0-3.89-5.4l-29.83-17-.12-33.62a8,8,0,0,0-2.83-6.08,111.91,111.91,0,0,0-36.72-20.67,8,8,0,0,0-6.46.59L128,41.85,97.88,25a8,8,0,0,0-6.47-.6A112.1,112.1,0,0,0,54.73,45.15a8,8,0,0,0-2.83,6.07l-.15,33.65-29.83,17a8,8,0,0,0-3.89,5.4,106.47,106.47,0,0,0,0,41.56,8,8,0,0,0,3.89,5.4l29.83,17,.12,33.62a8,8,0,0,0,2.83,6.08,111.91,111.91,0,0,0,36.72,20.67,8,8,0,0,0,6.46-.59L128,214.15,158.12,231a7.91,7.91,0,0,0,3.9,1,8.09,8.09,0,0,0,2.57-.42,112.1,112.1,0,0,0,36.68-20.73,8,8,0,0,0,2.83-6.07l.15-33.65,29.83-17a8,8,0,0,0,3.89-5.4A106.47,106.47,0,0,0,237.94,107.21Zm-15,34.91-28.57,16.25a8,8,0,0,0-3,3c-.58,1-1.19,2.06-1.81,3.06a7.94,7.94,0,0,0-1.22,4.21l-.15,32.25a95.89,95.89,0,0,1-25.37,14.3L134,199.13a8,8,0,0,0-3.91-1h-.19c-1.21,0-2.43,0-3.64,0a8.08,8.08,0,0,0-4.1,1l-28.84,16.1A96,96,0,0,1,67.88,201l-.11-32.2a8,8,0,0,0-1.22-4.22c-.62-1-1.23-2-1.8-3.06a8.09,8.09,0,0,0-3-3.06l-28.6-16.29a90.49,90.49,0,0,1,0-28.26L61.67,97.63a8,8,0,0,0,3-3c.58-1,1.19-2.06,1.81-3.06a7.94,7.94,0,0,0,1.22-4.21l.15-32.25a95.89,95.89,0,0,1,25.37-14.3L122,56.87a8,8,0,0,0,4.1,1c1.21,0,2.43,0,3.64,0a8.08,8.08,0,0,0,4.1-1l28.84-16.1A96,96,0,0,1,188.12,55l.11,32.2a8,8,0,0,0,1.22,4.22c.62,1,1.23,2,1.8,3.06a8.09,8.09,0,0,0,3,3.06l28.6,16.29A90.49,90.49,0,0,1,222.9,142.12Z',
    grid: 'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z',
    lock: 'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z',
    cloud: 'M160,40A88.09,88.09,0,0,0,81.29,88.67,64,64,0,1,0,72,216h88a88,88,0,0,0,0-176Zm0,160H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.29.11A88,88,0,0,0,72,128a8,8,0,0,0,16,0,72,72,0,1,1,72,72Z',
    x: 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z',
    caret: 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z',
    spark: 'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z',
    back: 'M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z',
  };
  const ph = (d, c = '') => `<svg class="ph ${c}" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
  const SI = {
    ok: '<svg class="si ok" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path class="m" d="M4.9 8.3l2 2 4.2-4.6"/></svg>',
    err: '<svg class="si err" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path class="m" d="M8 4.6v4.2M8 11.2v.2"/></svg>',
    warn: '<svg class="si warn" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.6l7 12.6H1z"/><path class="m" d="M8 6.2v3.8M8 12.1v.2"/></svg>',
    info: '<svg class="si info" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7"/><path class="m" d="M8 7.4v4M8 4.9v.2"/></svg>',
    spin: '<svg class="si spin" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 2a6 6 0 0 1 6 6"/></svg>',
    dot: '<svg class="si dot" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.5"/></svg>',
  };

  // The Jira logo, from Atlassian's own logo package (@atlaskit/logo, brand appearance). The gradient is in the page's defs.
  const JIRA = '<svg class="jira" viewBox="0 0 69 32" role="img" aria-label="Jira" focusable="false"><g fill-rule="nonzero"><path fill="#2684FF" d="M22.9366667,4 L11.41,4 C11.41,5.3800098 11.9582068,6.703498 12.934021,7.67931228 C13.9098353,8.65512657 15.2333235,9.20333333 16.6133333,9.20333333 L18.7366667,9.20333333 L18.7366667,11.2533333 C18.7385054,14.1244521 21.0655479,16.4514946 23.9366667,16.4533333 L23.9366667,5 C23.9366667,4.44771525 23.4889514,4 22.9366667,4 Z"/><path fill="url(#jira-g)" d="M17.2333333,9.74333333 L5.70666667,9.74333333 C5.70850536,12.6144521 8.03554792,14.9414946 10.9066667,14.9433333 L13.03,14.9433333 L13.03,17 C13.0336786,19.8711178 15.3622132,22.196669 18.2333333,22.1966667 L18.2333333,10.7433333 C18.2333333,10.1910486 17.7856181,9.74333333 17.2333333,9.74333333 Z"/><path fill="url(#jira-g)" d="M11.5266667,15.4833333 L0,15.4833333 C3.51929402e-16,18.357055 2.32961169,20.6866667 5.20333333,20.6866667 L7.33333333,20.6866667 L7.33333333,22.7366667 C7.33516565,25.6051863 9.65815176,27.9311544 12.5266667,27.9366667 L12.5266667,16.4833333 C12.5266667,15.9310486 12.0789514,15.4833333 11.5266667,15.4833333 Z"/><path fill="currentColor" fill-rule="evenodd" d="M37.07,18.956 C37.07,20.646 36.394,21.842 34.418,21.842 C33.56,21.842 32.702,21.686 32,21.4 L32,23.662 C32.65,23.896 33.586,24.104 34.808,24.104 C38.032,24.104 39.41,21.946 39.41,18.8 L39.41,6.918 L37.07,6.918 L37.07,18.956 Z M42.894,7.568 C42.894,8.556 43.544,9.128 44.454,9.128 C45.364,9.128 46.014,8.556 46.014,7.568 C46.014,6.58 45.364,6.008 44.454,6.008 C43.544,6.008 42.894,6.58 42.894,7.568 Z M43.31,24 L45.546,24 L45.546,11 L43.31,11 L43.31,24 Z M48.926,24 L51.11,24 L51.11,16.33 C51.11,13.574 52.852,12.716 55.712,13.002 L55.712,10.818 C53.164,10.662 51.864,11.754 51.11,13.288 L51.11,11 L48.926,11 L48.926,24 Z M66.45,24 L66.45,21.66 C65.618,23.376 64.058,24.26 62.056,24.26 C58.598,24.26 56.856,21.322 56.856,17.5 C56.856,13.834 58.676,10.74 62.316,10.74 C64.214,10.74 65.67,11.598 66.45,13.288 L66.45,11 L68.686,11 L68.686,24 L66.45,24 Z M59.092,17.5 C59.092,20.62 60.34,22.18 62.654,22.18 C64.656,22.18 66.45,20.906 66.45,18.02 L66.45,16.98 C66.45,14.094 64.812,12.82 62.914,12.82 C60.392,12.82 59.092,14.484 59.092,17.5 Z"/></g></svg>';

  // Jira Data Center's top bar: the assistant runs on the customer's own server.
  const TOP = `<span class="a-apps">${ph(P.grid)}</span><span class="a-logo">${JIRA}</span><span class="a-nav">${['Dashboards', 'Projects', 'Issues', 'Boards', 'Plans'].map((n) => `<span>${n}${ph(P.caret)}</span>`).join('')}</span><span class="a-create">Create</span><span class="a-search">${ph(P.search)}Search</span><span class="a-ico">${ph(P.bell)}</span><span class="a-ico">${ph(P.help)}</span><span class="a-ico">${ph(P.gear)}</span><span class="a-av">KP</span>`;
  const STEPS = ['Connect', 'Choose', 'Check', 'Review', 'Migrate'];
  const flowHead = (cur, label) => `<div class="a-head"><span class="a-close">${ph(P.x)}Close</span><ol class="a-steps" aria-label="${label || 'Steps'}">${STEPS.map((s, i) => `<li class="${i < cur ? 'done' : i === cur ? 'cur' : ''}"${i === cur ? ' aria-current="step"' : ''}>${s}</li>`).join('')}</ol><span class="a-help" aria-hidden="true"><span>Give feedback</span><span>Need help? ${ph(P.caret)}</span></span></div>`;
  const av = (n, c) => `<i class="av" style="--c:${c}">${esc(n[0])}</i>`;
  const lz = (k, t) => `<span class="a-lz ${k}">${esc(t)}</span>`;

  $$('.a-top:empty').forEach((el) => { el.innerHTML = TOP; });
  $$('.win .url').forEach((el) => { el.insertAdjacentHTML('afterbegin', ph(P.lock)); });

  // ── The instance: five sections of data, each with its own options ────────
  // gb is the size of a row; kind "data" picks what part of each project moves,
  // kind "scope" picks which rows move (all, some, none).
  const SEGS = [
    { id: 'roadmaps', tab: 'Advanced Roadmaps', what: 'plans', kind: 'scope', col: 'Projects', filter: 'All plans',
      title: 'Choose plans to migrate', desc: 'Plans keep their views and settings. The issues in them move with their projects.',
      opts: [['all', 'All plans', 'Every plan and its saved views'], ['some', 'Select plans', 'Only the plans you tick'], ['none', 'None', 'Plans stay on the server for now']], def: 'some',
      rows: [{ n: 'Company roadmap', k: '12 projects', gb: 1.4, pre: 1, c: '#6e5dc6' }, { n: 'Platform plan', k: '5 projects', gb: 0.6, pre: 1, c: '#1d7f8c' }, { n: 'Mobile releases', k: '3 projects', gb: 0.4, c: '#1d7afc' }, { n: 'Support capacity', k: '2 projects', gb: 0.2, c: '#e56910' }] },
    { id: 'projects', tab: 'Projects', what: 'projects', kind: 'data', col: 'Key', filter: 'All types',
      title: 'Choose what to migrate', desc: 'Move everything at once, or a few projects at a time. You can also move only the attachments or only the configuration of the projects you pick.',
      opts: [['all', 'All project data', 'Configuration, issues and attachments'], ['attach', 'Attachments only', 'Move the rest later'], ['config', 'Configuration only', 'No issues or attachments']], def: 'all',
      rows: [
        // q3: how each project did in the saved Q3 move (journey 3); mig: moved in an earlier run (new plans).
        { n: 'Mobile app', k: 'MOB', gb: 14.2, pre: 1, c: '#1d7afc', q3: 'fail' },
        { n: 'Platform', k: 'PLAT', gb: 11.8, pre: 1, c: '#22a06b', q3: 'mig' },
        { n: 'Customer support', k: 'SUP', gb: 9.6, pre: 1, c: '#e56910', q3: 'mig' },
        { n: 'Website', k: 'WEB', gb: 6.1, c: '#6e5dc6', mig: '13 Jul', q3: 'mig' },
        { n: 'Data pipeline', k: 'DATA', gb: 5.4, pre: 1, c: '#1d7f8c', q3: 'fail' },
        { n: 'Design system', k: 'DS', gb: 3.2, c: '#c9372c' },
        { n: 'Finance requests', k: 'FIN', gb: 2.7, pre: 1, c: '#b38600', q3: 'mig' },
        { n: 'Hiring', k: 'HR', gb: 1.3, c: '#943d73' },
        { n: 'Old intranet', k: 'INT', gb: 4.4, c: '#626f86', mig: '13 Jul', q3: 'mig' },
      ] },
    { id: 'users', tab: 'Users and groups', what: 'groups', kind: 'scope', col: 'Members', filter: 'All groups',
      title: 'Choose users and groups', desc: 'Groups linked to the projects you picked move with them. You can also pick groups by hand.',
      opts: [['all', 'All users and groups', 'Everyone on the server'], ['related', 'Related to projects', 'Groups the picked projects use'], ['manual', 'Select groups', 'Only the groups you tick'], ['none', 'None', 'Users stay for now']], def: 'related',
      rows: [{ n: 'Engineering', k: '318 users', gb: 0.32, rel: 1, c: '#1d7afc' }, { n: 'Support', k: '142 users', gb: 0.14, rel: 1, c: '#e56910' }, { n: 'Design', k: '36 users', gb: 0.04, rel: 1, c: '#c9372c' }, { n: 'Finance', k: '28 users', gb: 0.03, c: '#b38600' }, { n: 'Contractors', k: '64 users', gb: 0.06, c: '#626f86' }] },
    { id: 'customers', tab: 'Customers', what: 'organisations', kind: 'scope', col: 'Customers', filter: 'All organisations',
      title: 'Choose customers', desc: 'Customers who raise requests in your service projects. Their organisations come with them.',
      opts: [['all', 'All customers', 'Every organisation'], ['related', 'Related to projects', 'Customers of the picked projects'], ['none', 'None', 'Customers stay for now']], def: 'related',
      rows: [{ n: 'Northwind', k: '214 customers', gb: 0.42, rel: 1, c: '#22a06b' }, { n: 'Globex', k: '96 customers', gb: 0.19, rel: 1, c: '#1d7f8c' }, { n: 'Initech', k: '58 customers', gb: 0.11, c: '#6e5dc6' }, { n: 'Umbrella', k: '31 customers', gb: 0.06, c: '#c9372c' }] },
    { id: 'apps', tab: 'Apps', what: 'apps', kind: 'scope', col: 'Migration path', filter: 'All apps',
      title: 'Choose apps to migrate', desc: 'Other companies make these apps. Some move on their own; others need steps after the migration.',
      opts: [['all', 'All apps', 'Every app that can move'], ['some', 'Select apps', 'Only the apps you tick'], ['none', 'None', 'Install them in Cloud later']], def: 'some',
      rows: [{ n: 'Time tracking', k: 'Moves automatically', gb: 0.8, pre: 1, c: '#0c66e4' }, { n: 'Test management', k: 'Moves automatically', gb: 1.9, pre: 1, c: '#22a06b' }, { n: 'Diagrams', k: 'Steps after migration', gb: 0.3, c: '#e56910', warn: 1 }, { n: 'Custom fields', k: 'Moves automatically', gb: 0.2, pre: 1, c: '#6e5dc6' }, { n: 'Old reporting', k: 'No cloud version', gb: 0, c: '#626f86', na: 1 }] },
  ];
  const FACTOR = { all: 1, attach: 0.67, config: 0.05 };
  const SPLIT = [['Issues', 0.28], ['Attachments', 0.67], ['Configuration', 0.05]];

  const fmtS = (gb) => (gb <= 0 ? '0 MB' : gb < 1 ? `${Math.max(10, Math.round(gb * 100) * 10)} MB` : gb < 10 ? `${gb.toFixed(1)} GB` : `${Math.round(gb)} GB`);
  const fmtT = (h) => {
    if (h <= 0) return '0 min';
    const m = Math.max(5, Math.round((h * 60) / 5) * 5);
    if (m < 60) return `${m} min`;
    const hh = Math.floor(m / 60), mm = m % 60;
    return mm ? `${hh} hr ${mm} min` : `${hh} hr`;
  };

  // ── Choose, redesigned ───────────────────────────────────────────────────
  function makeApp(root, mode) {
    const pin = (n) => (mode === 'annot' ? ` data-pin="${n}"` : '');
    const S = { tab: 'projects', open: { projects: true }, q: '', segs: {}, trimmed: false, reco: null };
    SEGS.forEach((seg) => { S.segs[seg.id] = { opt: seg.def, sel: new Set(seg.rows.flatMap((r, i) => (r.pre ? [i] : []))) }; });
    const P0 = SEGS[1];
    // Journey 3: the saved Q3 move had seven projects; five migrated, two failed. Opening it trims the five.
    const idx = (f) => P0.rows.flatMap((r, i) => (f(r) ? [i] : []));
    const migrated = idx((r) => r.q3 === 'mig'), failed = idx((r) => r.q3 === 'fail'), fresh = idx((r) => !r.q3);
    if (mode === 'edit') {
      S.segs.projects.sel = new Set(failed);
      S.trimmed = true;
    }

    const seg = () => SEGS.find((s) => s.id === S.tab);
    const locked = (sg) => sg.kind === 'scope' && ['all', 'none', 'related'].includes(S.segs[sg.id].opt);
    const isSel = (sg, i) => {
      const st = S.segs[sg.id], r = sg.rows[i];
      if (r.na) return false;
      if (sg.kind === 'scope' && st.opt === 'all') return true;
      if (sg.kind === 'scope' && st.opt === 'none') return false;
      if (sg.kind === 'scope' && st.opt === 'related') return !!r.rel;
      return st.sel.has(i);
    };
    const size = (sg, r) => (sg.kind === 'data' ? r.gb * FACTOR[S.segs[sg.id].opt] : r.gb);
    const hours = (sg, gb) => (gb <= 0 ? 0 : sg.kind === 'data' ? gb * 0.075 + 0.04 : gb * 0.12 + 0.03);
    const picked = (sg) => sg.rows.flatMap((r, i) => (isSel(sg, i) ? [r] : []));
    const sum = (sg) => picked(sg).reduce((a, r) => { const g = size(sg, r); return [a[0] + g, a[1] + hours(sg, g)]; }, [0, 0]);

    root.innerHTML = `
      <div class="a-top" aria-hidden="true">${TOP}</div>
      ${flowHead(1)}
      <div class="a-body">
        <nav class="a-tabs" aria-label="Sections"${pin(1)}><p class="a-tabs-h">Migration options</p><p class="a-tabs-s">${mode === 'edit' ? 'Saved plan: Q3 move' : 'Pick each section in turn'}</p><div class="a-tablist"></div></nav>
        <div class="a-main"></div>
        <aside class="a-cart" aria-label="Your current selection"${pin(5)}><div class="a-cart-h"><b>Your current selection</b><small>${mode === 'edit' ? 'Changes to your saved plan' : 'Size and time to migrate'}</small></div><div class="a-trimbox"></div><div class="a-groups"></div><div class="a-total"></div></aside>
      </div>
      <div class="a-foot"><span class="a-dest"${pin(6)}>${ph(P.cloud)}Cloud destination <b>acme.atlassian.net</b></span><span class="a-count"></span><button type="button" class="a-btn" data-act="back">Back</button><button type="button" class="a-btn pri" data-act="next">Next</button></div>`;
    const tabsEl = $('.a-tablist', root), mainEl = $('.a-main', root), groupsEl = $('.a-groups', root), totalEl = $('.a-total', root), trimEl = $('.a-trimbox', root), countEl = $('.a-count', root);

    function renderTabs() {
      tabsEl.innerHTML = SEGS.map((sg) => {
        const n = picked(sg).length, none = sg.kind === 'scope' && S.segs[sg.id].opt === 'none';
        const st = none ? 'skip' : n ? 'ok' : '';
        return `<button type="button" class="a-tab" data-tab="${sg.id}" aria-current="${S.tab === sg.id}"><span class="a-st ${st}"></span>${esc(sg.tab)}<small>${none ? '–' : n}</small></button>`;
      }).join('');
    }

    function status(sg, r) {
      if (sg.id === 'projects') {
        if (mode === 'edit') return r.q3 === 'mig' ? lz('ok', 'Migrated 13 Jul') : r.q3 === 'fail' ? lz('bad', 'Failed 13 Jul') : '<span class="a-dash">—</span>';
        return r.mig ? lz('ok', `Migrated ${r.mig}`) : '<span class="a-dash">—</span>';
      }
      if (sg.id === 'apps') return r.na ? lz('bad', 'Can’t move') : r.warn ? lz('warn', 'Manual') : lz('ok', 'Ready');
      return null;
    }

    function renderMain() {
      const sg = seg(), st = S.segs[sg.id], lock = locked(sg);
      const title = mode === 'edit' && sg.id === 'projects' ? 'Make changes to your selection' : sg.title;
      const hasStatus = sg.id === 'projects' || sg.id === 'apps';
      let h = `<p class="a-title">${esc(title)}</p><p class="a-desc"${pin(2)}>${esc(sg.desc)}</p>`;
      h += `<div class="a-opts" role="radiogroup" aria-label="Migration option" style="--n:${sg.opts.length}"${pin(3)}>${sg.opts.map(([v, b, s]) => `<label class="a-opt"><input type="radio" name="${mode}-${sg.id}" value="${v}"${st.opt === v ? ' checked' : ''}><span><b>${esc(b)}</b><small>${esc(s)}</small></span></label>`).join('')}</div>`;
      if (mode === 'edit' && sg.id === 'projects') {
        h += S.reco
          ? `<div class="a-reco">${ph(P.spark)}<span>Using the recommended plan: the ${failed.length} failed projects, and the ${fresh.length} that haven’t moved yet.</span><button type="button" class="a-btn sub" data-act="reco-undo">Undo</button></div>`
          : `<div class="a-reco">${ph(P.spark)}<span><b>Recommended plan.</b> Retry the ${failed.length} failed projects, and add the ${fresh.length} that haven’t moved yet.</span><button type="button" class="a-btn pri sub" data-act="reco">Use plan</button></div>`;
      }
      h += `<div class="a-tools"><label class="a-find">${ph(P.search)}<input type="search" placeholder="Search ${sg.what}" aria-label="Search ${sg.what}" value="${esc(S.q)}"></label><span class="a-chipf">${esc(sg.filter)}${ph(P.caret)}</span></div>`;
      h += `<table class="a-tbl"><thead><tr><th><input type="checkbox" data-all aria-label="Select all ${sg.what}"${lock ? ' disabled' : ''}></th><th>Name</th><th>${esc(sg.col)}</th>${hasStatus ? `<th${sg.id === 'projects' ? pin(4) : ''}>${sg.id === 'projects' ? 'Migrated' : 'Status'}</th>` : ''}<th class="num">Size</th><th class="num">Time</th></tr></thead><tbody>`;
      h += sg.rows.map((r, i) => {
        const on = isSel(sg, i), dis = lock || r.na, g = size(sg, r);
        const hide = S.q && !`${r.n} ${r.k}`.toLowerCase().includes(S.q.toLowerCase());
        return `<tr data-i="${i}" class="${on ? 'sel' : ''}${(lock && !on) || r.na ? ' off' : ''}"${hide ? ' hidden' : ''}><td><input type="checkbox" data-i="${i}"${on ? ' checked' : ''}${dis ? ' disabled' : ''} aria-label="${esc(r.n)}"></td><td><span class="nm">${av(r.n, r.c)}${esc(r.n)}</span></td><td class="k">${esc(r.k)}</td>${hasStatus ? `<td>${status(sg, r)}</td>` : ''}<td class="num">${r.na ? '—' : fmtS(g)}</td><td class="num k">${r.na ? '—' : fmtT(hours(sg, g))}</td></tr>`;
      }).join('');
      h += '</tbody></table>';
      mainEl.innerHTML = h;
      syncAll();
    }

    // Header checkbox: checked, mixed or empty for the rows that can change.
    function syncAll() {
      const sg = seg(), all = $('[data-all]', mainEl);
      if (!all) return;
      const can = sg.rows.map((r, i) => i).filter((i) => !sg.rows[i].na);
      const n = can.filter((i) => isSel(sg, i)).length;
      all.checked = n === can.length && n > 0;
      all.indeterminate = n > 0 && n < can.length;
    }

    function renderCart() {
      let G = 0, H = 0;
      groupsEl.innerHTML = SEGS.map((sg) => {
        const rows = picked(sg), [gb, h] = sum(sg), opt = S.segs[sg.id].opt;
        G += gb; H += h;
        const sub = sg.kind === 'scope' && opt === 'none' ? 'Not migrating' : `${rows.length} ${rows.length === 1 ? sg.what.replace(/s$/, '') : sg.what}${sg.kind === 'data' && opt !== 'all' ? `, ${opt === 'attach' ? 'attachments' : 'configuration'} only` : ''}`;
        let lines;
        if (sg.kind === 'data') {
          lines = SPLIT.filter(([k]) => opt === 'all' || (opt === 'attach' ? k === 'Attachments' : k === 'Configuration'))
            .map(([k, f]) => { const share = opt === 'all' ? f : 1; return `<li><span>${k}</span><span>${fmtS(gb * share)}</span><span>${fmtT(h * share)}</span></li>`; });
        } else {
          lines = rows.slice(0, 3).map((r) => { const g = size(sg, r); return `<li><span>${esc(r.n)}</span><span>${fmtS(g)}</span><span>${fmtT(hours(sg, g))}</span></li>`; });
          if (rows.length > 3) lines.push(`<li class="more"><span>and ${rows.length - 3} more</span><span></span><span></span></li>`);
        }
        if (!lines.length) lines = ['<li class="more"><span>Nothing selected</span><span></span><span></span></li>'];
        const open = !!S.open[sg.id];
        return `<div class="a-g${open ? ' open' : ''}" data-g="${sg.id}"><button type="button" class="a-g-h" aria-expanded="${open}"><span><b>${esc(sg.tab)}</b><small>${esc(sub)}</small></span><em>${fmtS(gb)}<br>${fmtT(h)}</em>${ph(P.caret)}</button><div class="a-g-b"><div><ul>${lines.join('')}</ul></div></div></div>`;
      }).join('');
      const prev = totalEl.dataset.v, now = `${fmtS(G)}|${fmtT(H)}`;
      totalEl.innerHTML = `<p><span>Total size</span><b class="a-num">${fmtS(G)}</b></p><p class="big"><span>Time to migrate</span><b class="a-num">about ${fmtT(H)}</b></p>`;
      if (prev && prev !== now) $$('.a-num', totalEl).forEach((el) => el.classList.add('flash'));
      totalEl.dataset.v = now;
      if (mode === 'edit') {
        trimEl.innerHTML = S.trimmed
          ? `<p class="a-trim">${SI.info}<span>We removed ${migrated.length} projects that already migrated. <button type="button" data-act="restore">Restore</button></span></p>`
          : `<p class="a-trim">${SI.info}<span>Your original selection is back. <button type="button" data-act="trim">Remove migrated</button></span></p>`;
      }
    }

    function renderFoot() {
      const sg = seg(), n = picked(sg).length, i = SEGS.indexOf(sg);
      countEl.innerHTML = `Selected ${sg.what}: <b>${n} of ${sg.rows.length}</b>`;
      $('[data-act=next]', root).textContent = i < SEGS.length - 1 ? 'Next' : 'Continue to Check';
      $('[data-act=back]', root).textContent = i > 0 ? 'Back' : 'Back to Connect';
    }

    const renderSide = () => { renderTabs(); renderCart(); renderFoot(); };
    const renderAll = () => { renderMain(); renderSide(); };
    function go(id, focus) {
      S.tab = id; S.q = ''; S.open[id] = true;
      renderAll();
      mainEl.scrollTop = 0;
      if (focus) $(`[data-tab="${id}"]`, tabsEl)?.focus();
    }

    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab], [data-act], .a-g-h');
      if (!t || !root.contains(t)) return;
      if (t.dataset.tab) return go(t.dataset.tab, true);
      if (t.classList.contains('a-g-h')) {
        const g = t.parentElement, id = g.dataset.g;
        S.open[id] = !S.open[id];
        g.classList.toggle('open', S.open[id]);
        t.setAttribute('aria-expanded', S.open[id]);
        return;
      }
      const act = t.dataset.act, i = SEGS.indexOf(seg()), st = S.segs.projects;
      if (act === 'next' && i < SEGS.length - 1) go(SEGS[i + 1].id);
      if (act === 'back' && i > 0) go(SEGS[i - 1].id);
      if (act === 'restore') { migrated.forEach((k) => st.sel.add(k)); S.trimmed = false; S.reco = null; renderAll(); $('[data-act=trim]', root)?.focus(); }
      if (act === 'trim') { migrated.forEach((k) => st.sel.delete(k)); S.trimmed = true; renderAll(); $('[data-act=restore]', root)?.focus(); }
      if (act === 'reco') { S.reco = new Set(st.sel); st.sel = new Set([...failed, ...fresh]); renderAll(); $('[data-act=reco-undo]', root)?.focus(); }
      if (act === 'reco-undo') { st.sel = S.reco; S.reco = null; renderAll(); $('[data-act=reco]', root)?.focus(); }
    });

    root.addEventListener('change', (e) => {
      const t = e.target, sg = seg(), st = S.segs[sg.id];
      if (t.type === 'radio') {
        st.opt = t.value;
        renderAll();
        $(`input[type=radio][value="${t.value}"]`, mainEl)?.focus();
        return;
      }
      if (t.matches('[data-all]')) {
        sg.rows.forEach((r, i) => { if (!r.na) t.checked ? st.sel.add(i) : st.sel.delete(i); });
        renderAll();
        $('[data-all]', mainEl)?.focus();
        return;
      }
      if (t.dataset.i != null) {
        const i = +t.dataset.i;
        t.checked ? st.sel.add(i) : st.sel.delete(i);
        if (sg.id === 'projects' && mode === 'edit' && P0.rows[i].q3 === 'mig') S.trimmed = migrated.every((k) => !st.sel.has(k));
        t.closest('tr').classList.toggle('sel', t.checked);
        syncAll();
        renderSide();
      }
    });

    root.addEventListener('input', (e) => {
      if (e.target.type !== 'search') return;
      S.q = e.target.value;
      const sg = seg(), q = S.q.toLowerCase();
      $$('tbody tr', mainEl).forEach((tr) => { const r = sg.rows[+tr.dataset.i]; tr.hidden = !!q && !`${r.n} ${r.k}`.toLowerCase().includes(q); });
    });

    renderAll();
  }

  // ── The flow before the redesign: five steps, redrawn ───────────────────
  // data-a marks the part of a screen each pain point is about.
  const foot = (back, pri, extra = '') => `<div class="a-foot"><span class="a-count"></span>${extra}<span class="a-btn"${back === 'back' ? ' data-a="back"' : ''}>Back</span><span class="a-btn pri">${pri}</span></div>`;
  const check = (k, t, side = '') => `<li>${SI[k]}<span>${t}</span>${side}</li>`;

  function oldConnect() {
    return `<div class="a-top" aria-hidden="true">${TOP}</div>${flowHead(0)}
      <div class="o-body"><div class="o-col">
        <p class="a-title">Connect to cloud</p>
        <p class="a-desc">Link to an existing cloud site, or create a new one. If you don’t have a cloud site, get a free trial first.</p>
        <div class="o-form" data-a="form">
          <p class="o-label">Choose your destination cloud site <i>*</i></p>
          <div class="o-select"><span>acme.atlassian.net</span>${ph(P.caret)}</div>
          <p class="o-help">The cloud site you’ll migrate your data to.</p>
          <p class="o-links"><span class="a-btn sub">Choose cloud site</span><span class="a-btn sub">Get a Jira Cloud trial</span></p>
        </div>
      </div></div>
      ${foot('', 'Continue')}`;
  }

  function oldChoose() {
    const card = (t, d, items, pri) => `<div class="o-card"><b>${t}</b><p>${d}</p><p class="o-small">This option lets you migrate:</p><ul class="o-list">${items.map(([k, x]) => check(k, x)).join('')}</ul><span class="a-btn sub${pri ? ' pri' : ''}">${t}</span></div>`;
    return `<div class="a-top" aria-hidden="true">${TOP}</div>${flowHead(1)}
      <div class="o-body"><div class="o-col wide">
        <ol class="o-pages" data-a="pages" aria-label="Pages in Choose">${['Migration options', 'Advanced Roadmaps', 'Projects', 'Users and groups', 'Customers', 'Apps'].map((p, i) => `<li${i === 0 ? ' class="on"' : ''}><b>${i + 1}</b>${p}</li>`).join('')}</ol>
        <p class="a-title">Migration options</p>
        <p class="a-desc" data-a="copy">You can use our server to cloud migration guide to help you plan your migration.</p>
        <div class="o-cards" data-a="opts">
          ${card('Migrate all data at once', 'Migrate all data in a single migration. Only available when your cloud site has no projects.', [['ok', 'Users, groups and customers'], ['ok', 'Projects and attachments'], ['err', 'Apps']], false)}
          ${card('Choose what to migrate', 'Choose what you want to migrate. For example, move users first, then projects.', [['ok', 'Users, groups and customers'], ['ok', 'Projects and attachments'], ['ok', 'Apps']], true)}
        </div>
      </div></div>
      ${foot('', 'Next')}`;
  }

  function oldCheck() {
    return `<div class="a-top" aria-hidden="true">${TOP}</div>${flowHead(2)}
      <div class="o-body"><div class="o-col wide">
        <p class="a-title">Pre-migration checks</p>
        <p class="a-desc">We’ve checked your server and cloud site for problems. You can continue with errors, but your migration might fail.</p>
        <p class="o-group">System</p>
        <ul class="o-checks">
          ${check('ok', 'The Cloud Migration Assistant is up to date')}
          ${check('ok', 'Your cloud token is valid')}
        </ul>
        <ul class="o-checks" data-a="errs">
          ${check('warn', 'Your cloud plan doesn’t support Advanced Roadmaps', '<em>Upgrade plan</em>')}
          ${check('err', 'Jira Service Management isn’t on your cloud site', '<em>Add now</em>')}
        </ul>
        <p class="o-group">Users and groups</p>
        <ul class="o-checks" data-a="running">
          ${check('spin', 'Checking for duplicate email addresses', '<span class="o-run">Running</span>')}
          ${check('spin', 'Checking for invalid email addresses', '<span class="o-run">Running</span>')}
          ${check('ok', 'No group names conflict')}
        </ul>
      </div></div>
      ${foot('', 'Continue', `<span class="o-errs">${SI.err}1 error, 1 warning</span><span class="a-btn">Refresh</span>`)}`;
  }

  function oldReview() {
    const row = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
    return `<div class="a-top" aria-hidden="true">${TOP}</div>${flowHead(3)}
      <div class="o-body"><div class="o-col wide">
        <div data-a="head"><p class="a-title">Review your migration</p>
        <p class="a-desc">Check your migration before you run it. You can save it and run it later.</p></div>
        <div class="o-alert">${SI.err}<div><b>Errors found</b><p>Fix them before you run your migration. <em>View errors and warnings</em></p></div></div>
        <dl class="o-dl" data-a="config">
          ${row('Migration name', 'Q3 move')}${row('Stage', 'Production')}${row('Destination', 'acme.atlassian.net')}
          ${row('Advanced Roadmaps', '2 plans')}${row('Projects', '5 projects, with configuration, issues and attachments')}
          ${row('Users and groups', 'Users and groups related to the selected projects')}${row('Customers', 'Customers related to the selected projects')}${row('Apps', '3 apps')}
        </dl>
      </div></div>
      ${foot('back', 'Run', '<span class="a-btn">Save</span>')}`;
  }

  // The migrations dashboard. "run": a plan has just started. "saved": the Q3 move ran and two projects failed.
  function dash(variant) {
    const q3 = variant === 'run'
      ? { st: lz('prog', 'Running'), prog: check('spin', 'Migrating projects: 3 of 7'), act: 'View details' }
      : { st: lz('warn', 'Incomplete'), prog: check('ok', '5 projects migrated') + check('err', '2 projects failed'), act: 'View details' };
    const rows = [
      { st: q3.st, n: 'Q3 move', stage: 'Production', prog: q3.prog, at: '12 Jul 2023, 09:40', act: q3.act, hl: true },
      { st: lz('ok', 'Complete'), n: 'Pilot: support', stage: 'Testing', prog: check('ok', 'Migration complete') + check('ok', 'App data migrated'), at: '28 Jun 2023, 14:05', act: 'Go to cloud site' },
      { st: lz('def', 'Saved'), n: 'Q4 move', stage: 'Production', prog: check('dot', 'Ready to migrate'), at: '14 Jul 2023, 11:20', act: 'Run' },
      { st: lz('ok', 'Complete'), n: 'Pilot: platform', stage: 'Testing', prog: check('ok', 'Migration complete'), at: '21 Jun 2023, 16:30', act: 'Go to cloud site' },
    ];
    const run = variant === 'run';
    return `<div class="a-top" aria-hidden="true">${TOP}</div>
      <div class="a-head d-head"${run ? ' data-a="top"' : ''}><span class="a-close">${ph(P.back)}Migration Assistant home</span><span></span><span class="a-help" aria-hidden="true"><span>Give feedback</span><span>Need help? ${ph(P.caret)}</span></span></div>
      <div class="o-body"><div class="o-col wide dash">
        <div class="d-title"><div><p class="a-title">Migrations dashboard</p><p class="a-desc">Manage your migrations from this dashboard.</p></div><span class="a-btn pri sub">Create new migration</span></div>
        <table class="a-tbl d-tbl"><thead><tr><th>Status</th><th>Name</th><th>Stage</th><th>Progress</th><th>Created</th><th>Actions</th></tr></thead><tbody>
        ${rows.map((r) => `<tr${r.hl ? ' class="hl"' : ''}><td>${r.st}</td><td class="d-n">${esc(r.n)}</td><td class="k">${r.stage}</td><td${r.hl && run ? ' data-a="progress"' : ''}><ul class="o-checks tight">${r.prog}</ul></td><td class="k">${r.at}</td><td${r.hl && run ? ' data-a="actions"' : ''}><span class="a-btn sub">${r.act}${ph(P.caret)}</span></td></tr>`).join('')}
        </tbody></table>
      </div></div>`;
  }

  const FLOW = [
    { name: 'Connect', html: oldConnect, does: 'The admin picks the cloud site to move to, or creates one.',
      pains: [['No information on cloud security, compared with the server', 't', 'form'], ['Levels of third-party access aren’t shown', 't', 'form']] },
    { name: 'Choose', html: oldChoose, does: 'The admin chooses how to migrate, then picks the data one page at a time: roadmaps, projects, users and groups, customers, then apps.',
      pains: [['Little information on how the options differ', 't', 'opts'], ['Each section behaves differently, one page each', 'p', 'pages'], ['No time or storage cost for the selection', 't', 'opts'], ['Lots of back and forth for information', 'p', 'pages'], ['Sections hidden behind several clicks', 'p', 'pages'], ['Page copy gives little context', 't', 'copy'], ['Options change from page to page', 'r', 'pages']] },
    { name: 'Check', html: oldCheck, does: 'The assistant checks the server, the cloud site and the data for anything that could stop the migration.',
      pains: [['No progress shown for the checks', 't', 'running'], ['Some checks take hours, others seconds', 'p', 'running'], ['Not clear which failures block the migration', 't', 'errs']] },
    { name: 'Review', html: oldReview, does: 'A summary of the plan. The admin saves it to run later, or runs it now.',
      pains: [['Hard to get an overview', 't', 'config'], ['No context for migrations already running', 't', 'head'], ['Hard to go back and change a choice', 'r', 'back']] },
    { name: 'Migrate', html: () => dash('run'), does: 'The plan runs. The flow ends, and the admin follows the migration on the dashboard.',
      pains: [['Leaves the flow without warning', 'p', 'top'], ['Only in progress, success or failure', 't', 'progress'], ['Hard to make changes', 'r', 'actions']] },
  ];
  const PILLAR = { p: 'Predictable', r: 'Reliable', t: 'Transparent' };

  const flow = $('[data-flow]');
  if (flow) {
    const tabs = $('.flow-tabs', flow), app = $('.app.old', flow), list = $('.flow-pains', flow);
    tabs.innerHTML = FLOW.map((s, i) => `<button type="button" role="tab" id="ft-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}"><span class="ft-n">${i + 1}</span>${s.name}<span class="ft-c" title="Pain points">${s.pains.length}</span></button>`).join('');
    // Light up pain points (numbers) in the list and the parts of the screen they are about.
    const hl = (ns) => {
      const on = (ns || []).map(String);
      $$('[data-a]', app).forEach((a) => a.classList.toggle('on', a.dataset.nums.split(' ').some((n) => on.includes(n))));
      $$('li', list).forEach((li) => li.classList.toggle('on', on.includes(li.dataset.n)));
      flow.classList.toggle('hl', on.length > 0);
    };
    const show = (i, focus) => {
      const s = FLOW[i];
      $$('[role=tab]', tabs).forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
      app.innerHTML = s.html();
      app.setAttribute('aria-label', `${s.name}, before the redesign`);
      $$('[data-a]', app).forEach((a) => {
        const nums = s.pains.flatMap(([, , area], k) => (area === a.dataset.a ? [k + 1] : []));
        a.dataset.nums = nums.join(' ');
        a.insertAdjacentHTML('beforeend', `<span class="pa-n" aria-hidden="true">${nums.map((n) => `<b>${n}</b>`).join('')}</span>`);
      });
      $('.flow-t', flow).textContent = s.name;
      $('.flow-d', flow).textContent = s.does;
      list.innerHTML = s.pains.map(([t, p], k) => `<li data-n="${k + 1}" class="k-${p}" tabindex="0"><b>${k + 1}</b><span>${esc(t)}<small>${PILLAR[p]}</small></span></li>`).join('');
      if (focus) $(`#ft-${i}`, tabs).focus();
    };
    tabs.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) show(+b.dataset.i); });
    tabs.addEventListener('keydown', (e) => {
      const i = FLOW.findIndex((_, k) => $(`#ft-${k}`, tabs).getAttribute('aria-selected') === 'true');
      const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (d) { e.preventDefault(); show((i + d + FLOW.length) % FLOW.length, true); }
    });
    list.addEventListener('pointerover', (e) => { const li = e.target.closest('li'); if (li) hl([li.dataset.n]); });
    list.addEventListener('pointerleave', () => hl(null));
    list.addEventListener('focusin', (e) => { const li = e.target.closest('li'); if (li) hl([li.dataset.n]); });
    list.addEventListener('focusout', () => hl(null));
    app.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-a]'); hl(a ? a.dataset.nums.split(' ') : null); });
    app.addEventListener('pointerleave', () => hl(null));
    show(0);
  }

  $$('.app[data-app]').forEach((el) => {
    if (el.dataset.app === 'dash') el.innerHTML = dash('saved');
    else makeApp(el, el.dataset.app);
  });
  $$('.at .shot').forEach((el) => { el.dataset.fluidQuiet = ''; });

  // ── Annotated screen: a detail in the key lights up on the screen ────────
  const annot = $('.annot-fig');
  if (annot) {
    const set = (k) => { if (k) annot.dataset.on = k; else delete annot.dataset.on; $$('.pins-key li', annot).forEach((li) => li.classList.toggle('on', li.dataset.k === k)); };
    $$('.pins-key li', annot).forEach((li) => {
      li.tabIndex = 0;
      li.addEventListener('pointerenter', () => set(li.dataset.k));
      li.addEventListener('focus', () => set(li.dataset.k));
      li.addEventListener('pointerleave', () => set(null));
      li.addEventListener('blur', () => set(null));
    });
    const app = $('.app.annot', annot);
    app.addEventListener('pointerover', (e) => { const p = e.target.closest('[data-pin]'); set(p ? p.dataset.pin : null); });
    app.addEventListener('pointerleave', () => set(null));
  }

  // ── Before and after ─────────────────────────────────────────────────────
  $$('[data-ba]').forEach((fig) => {
    const btns = $$('.ba-seg button', fig);
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-pressed', x === b));
      $$('[data-pane]', fig).forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.v; });
      $$('[data-for]', fig).forEach((k) => { k.hidden = k.dataset.for !== b.dataset.v; });
    }));
  });

  // ── Map of the instance: hover a part for its size, click to keep it ──────
  const tmap = $('.tmap');
  if (tmap) {
    const read = $('.tm-read'), idle = read.innerHTML;
    let pinned = null;
    const show = (b) => {
      if (!b) { read.innerHTML = idle; return; }
      read.innerHTML = `<span><b>${esc(b.dataset.k)}</b></span><span>${esc(b.dataset.n)}</span><span><b>${esc(b.dataset.s)}</b></span><span>${esc(b.dataset.t)} to migrate</span>`;
    };
    $$('.tm', tmap).forEach((b) => {
      b.setAttribute('aria-label', `${b.dataset.k}: ${b.dataset.n}, ${b.dataset.s}`);
      b.addEventListener('pointerenter', () => show(b));
      b.addEventListener('focus', () => show(b));
      b.addEventListener('pointerleave', () => show(pinned));
      b.addEventListener('blur', () => show(pinned));
      b.addEventListener('click', () => {
        pinned = pinned === b ? null : b;
        $$('.tm', tmap).forEach((x) => { x.classList.toggle('on', x === pinned); x.setAttribute('aria-pressed', x === pinned); });
        tmap.classList.toggle('pinned', !!pinned);
        show(pinned || b);
      });
    });
  }

  // ── Wide figures scroll sideways on small screens, with a visible bar ────
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
  // The annotated screen scales down to the column; phones keep it full size and scroll sideways.
  $$('.at .annot-wrap .shot').forEach((el) => {
    const box = document.createElement('div');
    box.className = 'annot-box';
    el.before(box);
    box.append(el);
    const fit = () => {
      const w = box.clientWidth, z = w >= 700 ? Math.min(1, w / 1280) : 1;
      el.style.zoom = z;
    };
    new ResizeObserver(fit).observe(box);
    fit();
  });
  $$('.at .diagram > svg, .at .wide-me').forEach((el) => {
    if (el.closest('.annot-wrap')) return;
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
        links.get(e.target.id)?.classList.add('on');
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    links.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
    const hero = $('.hero-fig');
    if (hero) new IntersectionObserver((es) => { document.documentElement.classList.toggle('toc-on', !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(hero);
  }
})();
