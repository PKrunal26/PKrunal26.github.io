"""Build the data figures for the OpenFOAM Studio case study from real app runs.

Reads solved cases from `openfoam studio private/demo/projects`, then writes:
  - media/field-*.webp   rendered velocity / temperature fields
  - media/cavity.json    20x20 cavity velocity field for the hero canvas
  - SVG charts (Ghia comparison, residuals) injected into index.html between
    <!--fig:NAME--> and <!--/fig:NAME--> markers.

Run: python3 scripts/openfoam-figures.py
"""
import json, os, re, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, '..', 'projects', 'openfoam-studio')
MEDIA = os.path.join(PAGE, 'media')
PROJECTS = os.path.join(HERE, '..', '..', '..', 'openfoam studio private', 'demo', 'projects')

sys.path.insert(0, HERE)
from foamread import load  # noqa: E402

# Dark navy to pale cyan. Low end sits close to the panel colour.
STOPS = np.array([
    [0.00, 0x10, 0x16, 0x2a],
    [0.25, 0x1b, 0x36, 0x7a],
    [0.50, 0x24, 0x63, 0xd6],
    [0.75, 0x3f, 0xae, 0xe6],
    [1.00, 0xd8, 0xf6, 0xfb],
], float)

def cmap(v):
    v = np.clip(v, 0, 1)
    out = np.empty(v.shape + (3,))
    for c in range(3):
        out[..., c] = np.interp(v, STOPS[:, 0], STOPS[:, c + 1])
    return out

def render(polys, values, width, yscale=1.0, pad=0):
    """Rasterise cell polygons with values smoothed to the vertices."""
    allp = np.vstack(polys)
    x0, y0 = allp.min(0)
    x1, y1 = allp.max(0)
    sx = (width - 2 * pad) / (x1 - x0)
    height = int(round((y1 - y0) * sx * yscale)) + 2 * pad
    # Average cell values onto shared vertices.
    acc, cnt = {}, {}
    for poly, v in zip(polys, values):
        for p in poly:
            k = (round(p[0], 7), round(p[1], 7))
            acc[k] = acc.get(k, 0) + v
            cnt[k] = cnt.get(k, 0) + 1
    img = np.zeros((height, width))
    mask = np.zeros((height, width), bool)
    for poly in polys:
        vals = np.array([acc[(round(p[0], 7), round(p[1], 7))] / cnt[(round(p[0], 7), round(p[1], 7))] for p in poly])
        px = (poly[:, 0] - x0) * sx + pad
        py = height - pad - (poly[:, 1] - y0) * sx * yscale
        for i in range(1, len(poly) - 1):  # fan triangulation
            tri = [0, i, i + 1]
            _tri(img, mask, px[tri], py[tri], vals[tri])
    return img, mask

def _tri(img, mask, xs, ys, vs):
    h, w = img.shape
    xa, xb = int(max(np.floor(xs.min()), 0)), int(min(np.ceil(xs.max()), w - 1))
    ya, yb = int(max(np.floor(ys.min()), 0)), int(min(np.ceil(ys.max()), h - 1))
    if xb < xa or yb < ya:
        return
    gx, gy = np.meshgrid(np.arange(xa, xb + 1) + 0.5, np.arange(ya, yb + 1) + 0.5)
    d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
    if abs(d) < 1e-12:
        return
    a = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
    b = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
    c = 1 - a - b
    inside = (a >= -1e-6) & (b >= -1e-6) & (c >= -1e-6)
    sub = img[ya:yb + 1, xa:xb + 1]
    sub[inside] = (a * vs[0] + b * vs[1] + c * vs[2])[inside]
    mask[ya:yb + 1, xa:xb + 1] |= inside

def save(img, mask, vmax, name, bg=(0x10, 0x16, 0x2a)):
    rgb = cmap(img / vmax)
    rgb[~mask] = bg
    Image.fromarray(rgb.astype(np.uint8)).save(os.path.join(MEDIA, name), quality=90)
    return rgb.shape[1], rgb.shape[0]

def mag(U):
    return np.linalg.norm(U[:, :2], axis=1)

# ── Fields ────────────────────────────────────────────────────────────────
os.makedirs(MEDIA, exist_ok=True)
sizes = {}

polys, d, _ = load(os.path.join(PROJECTS, '82a55a15', 'case'))
cav_polys, cav_U = polys, d['U']
img, m = render(polys, mag(d['U']), 960)
sizes['cavity'] = save(img, m, 1.0, 'field-cavity.webp')

polys, d, _ = load(os.path.join(PROJECTS, '4da4e7d3', 'case'))
img, m = render(polys, mag(d['U']), 1600)
sizes['cylinder'] = save(img, m, 1.25, 'field-cylinder.webp')

polys, d, _ = load(os.path.join(PROJECTS, '69d3d2b6', 'case'))
img, m = render(polys, mag(d['U']), 1600, yscale=3)
sizes['step'] = save(img, m, mag(d['U']).max(), 'field-step.webp')

polys, d, _ = load(os.path.join(PROJECTS, '0223c0f2', 'case'), ('U', 'T'))
T = d['T'][:, 0]
img, m = render(polys, (T - T.min()), 1600, yscale=4)
sizes['channel'] = save(img, m, T.max() - T.min(), 'field-channel.webp')
print('fields', sizes, 'T range', T.min(), T.max())

# ── Cavity grid for the hero canvas ───────────────────────────────────────
cen = np.array([p.mean(0) for p in cav_polys])
n = 20
ix = np.clip((cen[:, 0] / 0.1 * n).astype(int), 0, n - 1)
iy = np.clip((cen[:, 1] / 0.1 * n).astype(int), 0, n - 1)
u = np.zeros((n, n)); v = np.zeros((n, n))
u[iy, ix] = cav_U[:, 0]; v[iy, ix] = cav_U[:, 1]
json.dump({'n': n, 'u': np.round(u, 4).ravel().tolist(), 'v': np.round(v, 4).ravel().tolist()},
          open(os.path.join(MEDIA, 'cavity.json'), 'w'), separators=(',', ':'))

# ── Ghia comparison: u along the vertical centreline ──────────────────────
GHIA_Y = [1, .9766, .9688, .9609, .9531, .8516, .7344, .6172, .5, .4531, .2813, .1719, .1016, .0703, .0625, .0547, 0]
GHIA_U = [1, .84123, .78871, .73722, .68717, .23151, .00332, -.13641, -.20581, -.21090, -.15662, -.10150, -.06434, -.04775, -.04192, -.03717, 0]
yc = (np.arange(n) + .5) / n
uc = (u[:, 9] + u[:, 10]) / 2  # the two columns either side of x = 0.05
gu = np.interp(yc, GHIA_Y[::-1], GHIA_U[::-1])
dev = np.abs(uc - gu).max()
print('ghia max abs deviation', round(dev, 4))

def ghia_svg():
    W, H, L, R, T_, B = 880, 420, 60, 20, 20, 50
    def X(val): return L + (val + .4) / 1.4 * (W - L - R)
    def Y(val): return T_ + (1 - val) * (H - T_ - B)
    s = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Horizontal velocity along the vertical centreline of the cavity. The OpenFOAM Studio run follows the Ghia et al. 1982 points closely.">']
    for gx in [-.4, -.2, 0, .2, .4, .6, .8, 1]:
        s.append(f'<path class="c-grid" d="M{X(gx):.1f} {T_}V{H - B}"/><text class="c-tick" x="{X(gx):.1f}" y="{H - B + 20}" text-anchor="middle">{gx:g}</text>')
    for gy in [0, .25, .5, .75, 1]:
        s.append(f'<path class="c-grid" d="M{L} {Y(gy):.1f}H{W - R}"/><text class="c-tick" x="{L - 10}" y="{Y(gy) + 4:.1f}" text-anchor="end">{gy:g}</text>')
    s.append(f'<path class="c-zero" d="M{X(0):.1f} {T_}V{H - B}"/>')
    pts = ' '.join(f'{X(a):.1f},{Y(b):.1f}' for a, b in zip([0] + list(uc) + [1], [0] + list(yc) + [1]))
    s.append(f'<polyline class="c-run" points="{pts}"/>')
    run_at = np.interp(GHIA_Y, [0] + list(yc) + [1], [0] + list(uc) + [1])
    for a, b, r in zip(GHIA_U, GHIA_Y, run_at):
        s.append(f'<circle class="c-ref" cx="{X(a):.1f}" cy="{Y(b):.1f}" r="4.5" data-y="{b:g}" data-g="{a:g}" data-r="{r:.4f}" data-rx="{X(r):.1f}"/>')
    s.append(f'<text class="c-axis" x="{(L + W - R) / 2}" y="{H - 8}" text-anchor="middle">u / U lid</text>')
    s.append(f'<text class="c-axis" x="14" y="{(T_ + H - B) / 2}" text-anchor="middle" transform="rotate(-90 14 {(T_ + H - B) / 2})">y / L</text>')
    s.append('</svg>')
    return ''.join(s)

# ── Residuals from the same run's log ─────────────────────────────────────
log = open(os.path.join(PROJECTS, '82a55a15', 'runs', '342d3523.log')).read()
series = {k: [float(x) for x in re.findall(rf'Solving for {k}, Initial residual = ([\d.eE+-]+)', log)] for k in ('Ux', 'Uy', 'p')}
steps = min(len(v) for v in series.values())
print('residual steps', steps, {k: v[-1] for k, v in series.items()})

def residual_svg():
    W, H, L, R, T_, B = 880, 300, 60, 20, 20, 44
    lo, hi = -10, 0
    def X(i): return L + i / (steps - 1) * (W - L - R)
    def Y(r): return T_ + (hi - np.log10(max(r, 1e-10))) / (hi - lo) * (H - T_ - B)
    s = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Initial residuals for Ux, Uy and p over {steps} time steps, falling from 1 to below 1e-5 on a log scale.">']
    for e in range(lo, hi + 1):
        s.append(f'<path class="c-grid" d="M{L} {Y(10 ** e):.1f}H{W - R}"/>')
        if e % 2 == 0 or e == hi:
            s.append(f'<text class="c-tick" x="{L - 10}" y="{Y(10 ** e) + 4:.1f}" text-anchor="end">1e{e}</text>')
    for i in [0, 500, 1000, 1500, 2000]:
        if i <= steps:
            s.append(f'<text class="c-tick" x="{X(min(i, steps - 1)):.1f}" y="{H - B + 20}" text-anchor="middle">{i}</text>')
    for k, cls in (('p', 'c-p'), ('Uy', 'c-uy'), ('Ux', 'c-ux')):
        v = series[k][:steps]
        idx = np.unique(np.r_[np.arange(0, steps, 4), steps - 1])
        pts = ' '.join(f'{X(i):.1f},{Y(v[i]):.1f}' for i in idx)
        s.append(f'<polyline class="{cls}" points="{pts}"/>')
    s.append(f'<text class="c-axis" x="{(L + W - R) / 2}" y="{H - 6}" text-anchor="middle">time step</text>')
    s.append('</svg>')
    return ''.join(s)

# ── Residual series for the hover readout ─────────────────────────────────
idx = list(range(0, steps, 4)) + [steps - 1]
json.dump({'steps': steps, 'i': idx, **{k: [float(f'{series[k][i]:.3g}') for i in idx] for k in ('Ux', 'Uy', 'p')}},
          open(os.path.join(MEDIA, 'residuals.json'), 'w'), separators=(',', ':'))

# ── Docs index: the same corpus and heading chunks the agent searches ─────
REPO = os.path.join(HERE, '..', '..', '..', 'openfoam studio private')
# Project-management pages in the wiki aren't OpenFOAM knowledge, so they stay out.
SKIP = {'wiki/analytics.md', 'wiki/dashboard.md', 'wiki/log.md', 'wiki/project-log.md', 'wiki/index.md', 'wiki/vision.md'}
chunks = []
for root in ('wiki', os.path.join('docs', 'openfoam-v13')):
    for dp, _, fs in os.walk(os.path.join(REPO, root)):
        for f in sorted(fs):
            if not f.endswith('.md'):
                continue
            rel = os.path.relpath(os.path.join(dp, f), REPO).replace(os.sep, '/')
            if rel in SKIP or rel.startswith('wiki/journal/'):
                continue
            heads, body = ['', '', ''], []
            def flush():
                text = re.sub(r'[`*_>#|\[\]()]', ' ', ' '.join(body))
                text = re.sub(r'\s+', ' ', text).strip()
                h = ' › '.join(x for x in heads if x)
                if h or text:
                    # The OpenFOAM guide is someone else's text: index its headings only.
                    chunks.append({'p': rel, 'h': h, 't': text[:180] if rel.startswith('wiki/') else ''})
            for line in open(os.path.join(dp, f), encoding='utf-8', errors='ignore'):
                m = re.match(r'^(#{1,3})\s+(.*)', line)
                if m:
                    flush(); body = []
                    lvl = len(m.group(1)) - 1
                    heads[lvl] = m.group(2).replace('`', '').strip()
                    for k in range(lvl + 1, 3):
                        heads[k] = ''
                else:
                    body.append(line.strip())
            flush()
json.dump(chunks, open(os.path.join(MEDIA, 'docs-index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('docs chunks', len(chunks))

# ── Inject ────────────────────────────────────────────────────────────────
figs = {'ghia': ghia_svg(), 'residuals': residual_svg()}
html_path = os.path.join(PAGE, 'index.html')
if os.path.exists(html_path):
    html = open(html_path).read()
    for k, svg in figs.items():
        html = re.sub(rf'<!--fig:{k}-->.*?<!--/fig:{k}-->', lambda _: f'<!--fig:{k}-->{svg}<!--/fig:{k}-->', html, flags=re.S)
    open(html_path, 'w').write(html)
json.dump({'ghia_max_dev': round(float(dev), 4), 'residual_steps': steps,
           'final': {k: v[steps - 1] for k, v in series.items()}, 'sizes': sizes},
          open(os.path.join(MEDIA, 'figures.json'), 'w'), indent=1)
