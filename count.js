// Visit counts for GoatCounter (https://pkrunal.goatcounter.com), sent straight to its count endpoint:
// no third-party script, no cookies. GoatCounter works out country, region, browser and device on its side.
// Off on localhost, in automated browsers, and in any browser that opened the site with #no-count.
(() => {
  const SITE = 'pkrunal';

  // Opening any page with #no-count stops counting in this browser (for my own visits); #count turns it back on.
  let skip = false;
  try {
    if (location.hash === '#no-count') localStorage.setItem('no-count', '1');
    if (location.hash === '#count') localStorage.removeItem('no-count');
    skip = localStorage.getItem('no-count') === '1';
  } catch {}

  const local = location.protocol === 'file:' || /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname);
  if (local || skip || navigator.webdriver) return;

  const send = (path, title, event) => {
    const query = new URLSearchParams({
      p: path,
      t: title,
      s: `${screen.width},${screen.height},${devicePixelRatio || 1}`,
      rnd: Math.random().toString(36).slice(2),
    });
    if (event) query.set('e', 'true');
    else query.set('r', document.referrer);
    new Image().src = `https://${SITE}.goatcounter.com/count?${query}`;
  };
  const count = name => { try { send(name.slice(0, 200), name, true); } catch {} };

  send(location.pathname, document.title, false);

  // New or returning, counted once a day per browser: a visit on a later day than the first one counts as returning.
  // Only the first and last dates are stored.
  try {
    const day = new Date().toISOString().slice(0, 10);
    let first = localStorage.getItem('first-seen');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first || '')) localStorage.setItem('first-seen', first = day);
    if (localStorage.getItem('last-seen') !== day) {
      localStorage.setItem('last-seen', day);
      count(first < day ? 'visit/returning' : 'visit/new');
    }
  } catch {}

  // The CV, email and outside links show up as events beside the pages.
  const clicked = e => {
    const link = e.target.closest?.('a[href]');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (url.protocol === 'mailto:') count('click/email');
    else if (url.pathname.endsWith('.pdf')) count(`click/${url.pathname.split('/').pop()}`);
    else if (url.host && url.host !== location.host) count(`out/${url.host.replace(/^www\./, '')}`);
  };
  // auxclick catches middle-clicks that open a link in a new tab.
  for (const type of ['click', 'auxclick']) addEventListener(type, clicked, { capture: true, passive: true });
})();
