// Theme: follows the system until the visitor picks one, then remembers it.
// Loaded in <head> so the saved theme applies before the first paint.
(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;

  const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');

  // The switch itself is a fluid that wells out of the corner (theme-flood.js).
  if (!still.matches) {
    const flood = document.createElement('script');
    flood.src = new URL('theme-flood.js', document.currentScript.src).href;
    flood.defer = true;
    document.head.append(flood);
  }

  addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.type = 'button';
    const label = () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      button.textContent = next === 'dark' ? 'Dark' : 'Light';
      button.setAttribute('aria-label', `Switch to ${next} mode`);
    };
    const apply = () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch {}
      label();
    };

    // Nearing the toggle starts the corner breathing out the other theme;
    // it only winds down once the cursor is clearly away again.
    const NEAR = 110, FAR = 180;
    let near = false, armed = true;
    if (matchMedia('(pointer: fine)').matches) {
      addEventListener('pointermove', e => {
        const b = button.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2));
        // After a switch, wait for the cursor to leave before peeking again.
        if (!armed) { if (d > FAR) armed = true; return; }
        if (!near && d < NEAR) { near = true; window.themeFlood?.peek(true); }
        else if (near && d > FAR) { near = false; window.themeFlood?.peek(false); }
      }, { passive: true });
      // Leaving the window counts as moving away.
      root.addEventListener('pointerleave', () => {
        if (near) { near = false; window.themeFlood?.peek(false); }
      });
    }

    button.addEventListener('click', () => {
      near = false;
      armed = false;
      if (window.themeFlood && !still.matches) window.themeFlood.flood(apply);
      else apply();
    });
    system.addEventListener('change', label);
    label();
    document.body.append(button);
  });
})();
