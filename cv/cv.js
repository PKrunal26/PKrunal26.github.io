// CV timeline: puts each place on one axis from 2020 to now, draws the year lines and labels, and grows the bars in
// once the figure scrolls into view. "now" is read from the clock, so the ongoing bar keeps up on its own.
(() => {
  const fig = document.querySelector('.span');
  if (!fig) return;

  const today = new Date();
  const now = today.getFullYear() + (today.getMonth() + today.getDate() / 31) / 12;
  const start = 2020;
  const end = Math.max(2027, Math.ceil(now + 0.1));
  const at = t => (t - start) / (end - start);
  // "2023-05" starts at the beginning of May; as an end it runs to the end of that month.
  const month = (s, edge) => s === 'now' ? now : +s.slice(0, 4) + (+s.slice(5, 7) - 1 + edge) / 12;

  const lines = [];
  for (let y = start; y < end; y++) lines.push(`<i style="left:${at(y) * 100}%"></i>`);
  for (const track of fig.querySelectorAll('.span-track')) track.insertAdjacentHTML('afterbegin', lines.join(''));

  const axis = fig.querySelector('.span-axis .span-track');
  for (let y = start; y < end; y++) axis.insertAdjacentHTML('beforeend', `<b class="${y % 2 ? 'odd' : ''}" style="left:${at(y) * 100}%">${y}</b>`);

  fig.querySelectorAll('.span-row').forEach((row, i) => {
    const bar = row.querySelector('.span-bar');
    bar.style.setProperty('--a', at(month(row.dataset.from, 0)));
    bar.style.setProperty('--b', at(month(row.dataset.to, 1)));
    bar.style.setProperty('--i', i);
    bar.classList.toggle('on', row.dataset.to === 'now');
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in self)) return;
  fig.classList.add('anim');
  const io = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    requestAnimationFrame(() => fig.classList.add('drawn'));
  }, { threshold: 0.5 });
  io.observe(fig);
})();
