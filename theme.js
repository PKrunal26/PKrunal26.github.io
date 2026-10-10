// Theme: follows the system until the visitor picks one, then remembers it.
// Loaded in <head> so the saved theme applies before the first paint.
(() => {
  const root = document.documentElement;
  const system = matchMedia('(prefers-color-scheme: dark)');
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch {}
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;

  const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');

  addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.type = 'button';
    const label = () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      button.textContent = next === 'dark' ? 'Dark' : 'Light';
      button.setAttribute('aria-label', `Switch to ${next} mode`);
    };
    button.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch {}
      label();
    });
    system.addEventListener('change', label);
    label();
    document.body.append(button);
  });
})();
