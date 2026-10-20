"""Build the data for the Results viewer on the OpenFOAM Studio page.

Reads every saved time of three solved app runs from
`openfoam studio private/demo/projects` and writes:
  - media/results/<case>.png   one atlas per case: every saved time as a tile,
                               R = Ux, G = Uy, B = the case's scalar field,
                               each quantised to 8 bits over its all-time range
  - media/results/<case>.json  times, ranges, units, the prompt, a bit-packed
                               mask of where the mesh is, and the mesh edges

Values are resampled from cell centres onto a regular grid the same way as the
field images (scripts/openfoam-figures.py): cell values are averaged onto the
mesh vertices, then each front-face polygon is fan-triangulated and filled
with barycentric interpolation.

Run: python3 scripts/openfoam-results.py
"""
import base64, json, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'projects', 'openfoam-studio', 'media', 'results')
PROJECTS = os.path.join(HERE, '..', '..', '..', 'openfoam studio private', 'demo', 'projects')
sys.path.insert(0, HERE)
from foamread import load, read_field  # noqa: E402

CASES = [
    # key, project id, grid width, scalar field, scalar label, scalar units, max frames
    ('cylinder', '4da4e7d3', 288, 'p', 'p', 'm²/s²', None),
    ('cavity', '10b09e56', 144, 'p', 'p', 'm²/s²', 31),
    ('badapple', 'badapple', 192, 'alpha.water', 'alpha.water', '', None),
]


def times(case):
    ts = []
    for d in os.listdir(case):
        try:
            ts.append((float(d), d))
        except ValueError:
            pass
    return [d for _, d in sorted(ts)]


def raster(polys, W):
    """Per grid pixel: three vertex ids and barycentric weights, plus the mask."""
    keys, vid = {}, []
    for p in polys:
        ids = []
        for x, y in p:
            k = (round(x, 7), round(y, 7))
            if k not in keys:
                keys[k] = len(keys)
            ids.append(keys[k])
        vid.append(ids)
    verts = np.array(list(keys.keys()))
    x0, y0 = verts.min(0)
    x1, y1 = verts.max(0)
    s = W / (x1 - x0)
    H = int(round((y1 - y0) * s))
    pid = np.zeros((H, W, 3), np.int32)
    pw = np.zeros((H, W, 3), np.float32)
    mask = np.zeros((H, W), bool)
    for ids in vid:
        px = (verts[ids, 0] - x0) * s
        py = H - (verts[ids, 1] - y0) * s
        for i in range(1, len(ids) - 1):
            t = [0, i, i + 1]
            xs, ys = px[t], py[t]
            xa, xb = int(max(np.floor(xs.min()), 0)), int(min(np.ceil(xs.max()), W - 1))
            ya, yb = int(max(np.floor(ys.min()), 0)), int(min(np.ceil(ys.max()), H - 1))
            if xb < xa or yb < ya:
                continue
            gx, gy = np.meshgrid(np.arange(xa, xb + 1) + 0.5, np.arange(ya, yb + 1) + 0.5)
            d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
            if abs(d) < 1e-12:
                continue
            a = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
            b = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
            c = 1 - a - b
            inside = (a >= -1e-6) & (b >= -1e-6) & (c >= -1e-6)
            yy, xx = np.nonzero(inside)
            yy += ya; xx += xa
            pid[yy, xx] = [ids[t[0]], ids[t[1]], ids[t[2]]]
            pw[yy, xx, 0] = a[inside]; pw[yy, xx, 1] = b[inside]; pw[yy, xx, 2] = c[inside]
            mask[yy, xx] = True
    # Cell -> vertex averaging matrix, as sparse lists.
    nv = len(verts)
    cnt = np.zeros(nv)
    for ids in vid:
        cnt[ids] += 1
    edges = set()
    for ids in vid:
        for i in range(len(ids)):
            a, b = ids[i], ids[(i + 1) % len(ids)]
            edges.add((min(a, b), max(a, b)))
    return dict(vid=vid, cnt=cnt, pid=pid, pw=pw, mask=mask, verts=verts,
                box=(x0, y0, x1, y1), W=W, H=H, edges=np.array(sorted(edges)))


def to_grid(r, cellvals):
    acc = np.zeros(len(r['verts']))
    for ids, v in zip(r['vid'], cellvals):
        acc[ids] += v
    vv = acc / np.maximum(r['cnt'], 1)
    img = (vv[r['pid']] * r['pw']).sum(2)
    img[~r['mask']] = 0
    return img


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()


os.makedirs(OUT, exist_ok=True)
for key, pid, W, sname, slabel, sunits, maxf in CASES:
    case = os.path.join(PROJECTS, pid, 'case')
    polys, _, _ = load(case)
    m = json.load(open(os.path.join(PROJECTS, pid, 'meta.json')))
    prompt = m.get('prompt') or next((x['content'] for x in m.get('messages', []) if x.get('role') == 'user'), m.get('name'))
    r = raster(polys, W)
    n = len(polys)
    ts = [t for t in times(case) if os.path.exists(os.path.join(case, t, 'U'))]
    if maxf:
        ts = ts[:maxf]
    frames = []
    for t in ts:
        U = read_field(os.path.join(case, t, 'U'), n)
        sp = os.path.join(case, t, sname)
        S = read_field(sp, n)[:, 0] if os.path.exists(sp) else np.zeros(n)
        frames.append([to_grid(r, U[:, 0]), to_grid(r, U[:, 1]), to_grid(r, S)])
    frames = np.array(frames)  # F, 3, H, W
    mk = r['mask']
    # Carry values a few pixels past the mesh edge, so the smoothed image has
    # no dark fringe where it meets a wall drawn on top.
    filled = mk.copy()
    for _ in range(6):
        acc = np.zeros_like(frames)
        cnt = np.zeros(filled.shape)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh = np.roll(filled, (dy, dx), (0, 1))
            acc += np.roll(frames, (dy, dx), (2, 3)) * sh
            cnt += sh
        grow = (~filled) & (cnt > 0)
        frames[:, :, grow] = acc[:, :, grow] / cnt[grow]
        filled |= grow
    lo = [float(frames[:, c][:, mk].min()) for c in range(3)]
    hi = [float(frames[:, c][:, mk].max()) for c in range(3)]
    if key == 'badapple':
        lo[2], hi[2] = 0.0, 1.0
    q = np.zeros_like(frames, dtype=np.uint8)
    for c in range(3):
        span = (hi[c] - lo[c]) or 1
        q[:, c] = np.clip(np.round((frames[:, c] - lo[c]) / span * 255), 0, 255)
    F, H = len(ts), r['H']
    cols = int(np.ceil(np.sqrt(F * H / W)))
    rows = int(np.ceil(F / cols))
    atlas = np.zeros((rows * H, cols * W, 3), np.uint8)
    for f in range(F):
        y, x = (f // cols) * H, (f % cols) * W
        atlas[y:y + H, x:x + W] = q[f].transpose(1, 2, 0)
    Image.fromarray(atlas).save(os.path.join(OUT, f'{key}.png'), optimize=True)
    x0, y0, x1, y1 = r['box']
    # Walls inside the domain (the cylinder): boundary edges off the outer box,
    # chained into closed loops.
    use = {}
    for ids in r['vid']:
        for i in range(len(ids)):
            e = tuple(sorted((ids[i], ids[(i + 1) % len(ids)])))
            use[e] = use.get(e, 0) + 1
    V = r['verts']
    eps = 1e-6 * max(x1 - x0, y1 - y0)
    on_box = lambda v: abs(V[v, 0] - x0) < eps or abs(V[v, 0] - x1) < eps or abs(V[v, 1] - y0) < eps or abs(V[v, 1] - y1) < eps
    inner = [e for e, k in use.items() if k == 1 and not (on_box(e[0]) and on_box(e[1]))]
    nb = {}
    for a, b in inner:
        nb.setdefault(a, []).append(b); nb.setdefault(b, []).append(a)
    loops, seen = [], set()
    for start in nb:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            nxt = [v for v in nb[cur] if v != prev and (v not in seen or (v == start and len(loop) > 2))]
            if not nxt or nxt[0] == start:
                break
            prev, cur = cur, nxt[0]
            seen.add(cur); loop.append(cur)
        if len(loop) > 2:
            q = np.round((V[loop] - [x0, y0]) / [x1 - x0, y1 - y0] * 65535).astype('<u2')
            loops.append(b64(q))
    ev = r['verts'][r['edges']].reshape(-1, 2)
    eq = np.round((ev - [x0, y0]) / [x1 - x0, y1 - y0] * 65535).astype('<u2')
    # |U| colour range over all time. The VoF case has a few spurious spikes at
    # the interface, so its range stops at the 99.5th percentile.
    um = np.sqrt(frames[:, 0] ** 2 + frames[:, 1] ** 2)[:, mk]
    umax = float(np.percentile(um, 99.5) if key == 'badapple' else um.max())
    meta = dict(
        project=pid, prompt=prompt, cells=n, W=W, H=H, cols=cols, F=F,
        times=[float(t) for t in ts], box=[float(x0), float(y0), float(x1), float(y1)],
        lo=[round(v, 6) for v in lo], hi=[round(v, 6) for v in hi], umax=round(umax, 5),
        scalar=dict(name=slabel, units=sunits),
        mask=b64(np.packbits(mk.ravel())), edges=b64(eq), walls=loops,
    )
    json.dump(meta, open(os.path.join(OUT, f'{key}.json'), 'w'), separators=(',', ':'))
    kb = os.path.getsize(os.path.join(OUT, f'{key}.png')) / 1024
    print(f'{key}: {n} cells, {F} frames {ts[0]}..{ts[-1]}, grid {W}x{H}, atlas {cols}x{rows} {kb:.0f} KB, '
          f'{len(r["edges"])} edges, {len(loops)} wall loops, U {lo[0]:.3f}..{hi[0]:.3f}, S {lo[2]:.4g}..{hi[2]:.4g}')
