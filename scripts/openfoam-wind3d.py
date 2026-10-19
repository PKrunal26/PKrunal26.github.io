"""Export the solved windAroundBuildings case for the OpenFOAM Studio cover.

Reads ~/openfoam-run/windAroundBuildings_fresh (OpenFOAM 13 tutorial, snappyHexMesh
mesh, foamRun incompressibleFluid with k-epsilon, fields saved every 50 iterations)
and writes to projects/openfoam-studio/media/wind/:

  wind.bin    building + ground surface mesh, streamlines (little-endian arrays)
  wind.json   offsets into wind.bin, mesh stats, convergence history, slice info
  slice.webp  |U| at 5 m above the ground, one row per saved iteration

Streamlines are traced through the solved cell velocities: each cell's value is
painted onto a 1.25 m voxel grid (finest cells last), lightly smoothed, and
integrated with RK2 at 1 m steps.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import foamread as fr

CASE = os.path.expanduser('~/openfoam-run/windAroundBuildings_fresh')
OUT = os.path.join(HERE, '..', 'projects', 'openfoam-studio', 'media', 'wind')
os.makedirs(OUT, exist_ok=True)
UIN = 10.0
X0, X1, Y0, Y1, Z0, Z1 = -20, 330, -50, 230, 0, 140

M = os.path.join(CASE, 'constant', 'polyMesh')
pts = fr.read_points(os.path.join(M, 'points'))
faces = fr.read_faces(os.path.join(M, 'faces'))
own = fr.read_labels(os.path.join(M, 'owner'))
nei = fr.read_labels(os.path.join(M, 'neighbour'))
bnd = fr.read_boundary(os.path.join(M, 'boundary'))
ncell = int(max(own.max(), nei.max())) + 1
print('mesh', len(pts), 'points', len(faces), 'faces', ncell, 'cells')

times = sorted((d for d in os.listdir(CASE) if d.replace('.', '').isdigit() and float(d) > 0), key=float)

# ── Cell bounding boxes ──────────────────────────────────────────────────────
F = np.array([f + [f[0]] * (8 - len(f)) for f in faces], np.int64)
fp = pts[F].astype(np.float32)
fmin, fmax = fp.min(1), fp.max(1)
cmin = np.full((ncell, 3), np.inf, np.float32); cmax = np.full((ncell, 3), -np.inf, np.float32)
np.minimum.at(cmin, own, fmin); np.maximum.at(cmax, own, fmax)
ni = len(nei)
np.minimum.at(cmin, nei, fmin[:ni]); np.maximum.at(cmax, nei, fmax[:ni])

# ── Building height map from upward-facing building faces ───────────────────
typ, nb, sb = bnd['buildings']
bfaces = [faces[i] for i in range(sb, sb + nb)]
HM = 0.5  # m per pixel
hw, hh = int((X1 - X0) / HM), int((Y1 - Y0) / HM)
hmap = Image.new('F', (hw, hh), 0.0)
hd = ImageDraw.Draw(hmap)
ups = []
for f in bfaces:
    p = pts[f]
    n = np.cross(p[1] - p[0], p[2] - p[0])
    if np.linalg.norm(n) > 0 and n[2] / np.linalg.norm(n) > 0.3:
        ups.append((p[:, 2].max(), p))
for z, p in sorted(ups, key=lambda t: t[0]):
    hd.polygon([((x - X0) / HM, (y - Y0) / HM) for x, y, _ in p], fill=float(z))
height = np.array(hmap)  # [y, x]

def inside(x, y, z):
    i = np.clip(((x - X0) / HM).astype(int), 0, hw - 1)
    j = np.clip(((y - Y0) / HM).astype(int), 0, hh - 1)
    return z < height[j, i]

# ── Voxel grid of cell indices ──────────────────────────────────────────────
DX = 1.25
nx, ny, nz = int((X1 - X0) / DX), int((Y1 - Y0) / DX), int((Z1 - Z0) / DX)
cell = np.full((nx, ny, nz), -1, np.int32)
lo = np.ceil((cmin - [X0, Y0, Z0]) / DX - 0.5).astype(int)
hi = np.floor((cmax - [X0, Y0, Z0]) / DX - 0.5).astype(int) + 1
lo = np.maximum(lo, 0); hi = np.minimum(hi, [nx, ny, nz])
vol = np.prod(cmax - cmin, 1)
for c in np.argsort(-vol):
    a, b = lo[c], hi[c]
    if (b > a).all():
        cell[a[0]:b[0], a[1]:b[1], a[2]:b[2]] = c
# Tiny cells may miss every voxel centre: drop them at their centre voxel.
cc = ((cmin + cmax) / 2 - [X0, Y0, Z0]) / DX
ci = np.clip(cc.astype(int), 0, [nx - 1, ny - 1, nz - 1])
small = (hi <= lo).any(1)
cell[ci[small, 0], ci[small, 1], ci[small, 2]] = np.nonzero(small)[0]
gx = X0 + DX * (np.arange(nx) + 0.5); gy = Y0 + DX * (np.arange(ny) + 0.5); gz = Z0 + DX * (np.arange(nz) + 0.5)
XX, YY = np.meshgrid(gx, gy, indexing='ij')
for k in range(nz):
    m = inside(XX, YY, np.full_like(XX, gz[k]))
    cell[:, :, k][m] = -1
solid = cell < 0
print('voxels', cell.shape, 'solid', round(solid.mean() * 100, 1), '%')

def smooth(a, mask, r=1):
    """Masked box blur, so values never bleed in from inside the buildings."""
    w = (~mask).astype(np.float32)
    num = a * w[..., None]
    out_n, out_w = num.copy(), w.copy()
    for ax in range(3):
        n2, w2 = out_n.copy(), out_w.copy()
        for s in range(1, r + 1):
            n2 += np.roll(out_n, s, ax) + np.roll(out_n, -s, ax)
            w2 += np.roll(out_w, s, ax) + np.roll(out_w, -s, ax)
        out_n, out_w = n2, w2
    return out_n / np.maximum(out_w, 1e-6)[..., None]

Ulast = fr.read_field(os.path.join(CASE, times[-1], 'U'), ncell).astype(np.float32)
UG = Ulast[np.maximum(cell, 0)]
UG[solid] = 0
UG = smooth(UG, solid, 1)
UG[solid] = 0

def sample(p):
    """Trilinear sample of UG at points p (n, 3); also returns solid flag."""
    f = (p - [X0, Y0, Z0]) / DX - 0.5
    i = np.clip(np.floor(f).astype(int), 0, [nx - 2, ny - 2, nz - 2])
    t = np.clip(f - i, 0, 1)
    out = np.zeros((len(p), 3), np.float32)
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (t[:, 0] if dx else 1 - t[:, 0]) * (t[:, 1] if dy else 1 - t[:, 1]) * (t[:, 2] if dz else 1 - t[:, 2])
                out += UG[i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz] * w[:, None]
    return out, inside(p[:, 0], p[:, 1], p[:, 2])

def trace(seeds, direction=1, max_len=650, h=1.0):
    p = seeds.astype(np.float32).copy()
    alive = np.ones(len(p), bool)
    paths = [[q.copy()] for q in p]
    speeds = [[0.0] for _ in p]
    v0, _ = sample(p)
    for i, v in enumerate(v0):
        speeds[i][0] = float(np.linalg.norm(v))
    for _ in range(int(max_len / h)):
        idx = np.nonzero(alive)[0]
        if not len(idx):
            break
        q = p[idx]
        v1, _ = sample(q)
        s1 = np.linalg.norm(v1, axis=1)
        ok = s1 > 0.15
        d1 = v1 / np.maximum(s1, 1e-6)[:, None] * direction
        v2, _ = sample(q + d1 * h * 0.5)
        s2 = np.linalg.norm(v2, axis=1)
        d2 = v2 / np.maximum(s2, 1e-6)[:, None] * direction
        qn = q + d2 * h
        _, sol = sample(qn)
        out = (qn[:, 0] < X0) | (qn[:, 0] > X1) | (qn[:, 1] < Y0) | (qn[:, 1] > Y1) | (qn[:, 2] < 0.3) | (qn[:, 2] > Z1)
        ok &= ~sol & ~out & (s2 > 0.15)
        for k, n in enumerate(idx):
            if ok[k]:
                p[n] = qn[k]
                paths[n].append(qn[k].copy())
                speeds[n].append(float(s2[k]))
        alive[idx[~ok]] = False
    return paths, speeds

rng = np.random.default_rng(4)
inlet = [(-18.0, y, z) for z in (2.5, 6, 11, 18, 28, 42) for y in np.arange(12, 168, 6.5)]
inlet = np.array(inlet) + np.c_[np.zeros(len(inlet)), rng.uniform(-1.5, 1.5, len(inlet)), rng.uniform(-0.5, 0.5, len(inlet))]
paths, speeds = trace(inlet)
# Seeds inside the street canyons and wakes, traced both ways and joined.
mid = []
while len(mid) < 40:
    q = np.array([rng.uniform(20, 260), rng.uniform(20, 160), rng.uniform(1.5, 22)])
    if not inside(q[:1], q[1:2], q[2:3])[0]:
        mid.append(q)
mid = np.array(mid)
fwd, fs = trace(mid, 1, 400)
bwd, bs = trace(mid, -1, 400)
for a, sa, b, sb_ in zip(fwd, fs, bwd, bs):
    paths.append(b[::-1][:-1] + a); speeds.append(sb_[::-1][:-1] + sa)
keep = [k for k, pth in enumerate(paths) if len(pth) > 40]
print('streamlines', len(keep), 'of', len(paths))

# ── Binary payload ──────────────────────────────────────────────────────────
blob = bytearray()
index = {}
def put(name, arr):
    global blob
    while len(blob) % 4:
        blob.append(0)
    index[name] = [len(blob), arr.dtype.str, list(arr.shape)]
    blob += arr.tobytes()

dm = lambda a: np.round(np.asarray(a) * 10).astype('<i2')

# Surface mesh: building + ground patches share one point table.
surf = {}
for name in ('buildings', 'ground'):
    _, n, s = bnd[name]
    surf[name] = [faces[i] for i in range(s, s + n)]
used = np.unique(np.concatenate([np.array(f) for fl in surf.values() for f in fl]))
remap = np.full(len(pts), -1, np.int64); remap[used] = np.arange(len(used))
put('spts', dm(pts[used]))
for name, fl in surf.items():
    # Boundary faces point out of the fluid, into the buildings: flip them to face the viewer.
    tris = [(remap[f[0]], remap[f[i + 1]], remap[f[i]]) for f in fl for i in range(1, len(f) - 1)]
    edges = set()
    for f in fl:
        for i in range(len(f)):
            a, b = remap[f[i]], remap[f[(i + 1) % len(f)]]
            edges.add((min(a, b), max(a, b)))
    if name == 'buildings':
        put(name + '_tri', np.array(tris, '<u2').ravel())
    put(name + '_edge', np.array(sorted(edges), '<u2').ravel())

# Streamlines, resampled to every 2nd point.
SMAX = 16.0
lp, ls, lens = [], [], []
for k in keep:
    pth = np.array(paths[k])[::2]; sp = np.array(speeds[k])[::2]
    lp.append(dm(pth)); ls.append(np.clip(sp / SMAX * 255, 0, 255).astype(np.uint8)); lens.append(len(pth))
put('line_len', np.array(lens, '<u2'))
put('line_pts', np.concatenate(lp).ravel())
put('line_spd', np.concatenate(ls))

open(os.path.join(OUT, 'wind.bin'), 'wb').write(bytes(blob))

# ── Slice at 5 m, every saved iteration ─────────────────────────────────────
ZS = 5.0
SD = 0.5
sw, sh = int((X1 - X0) / SD), int((Y1 - Y0) / SD)
cut = (cmin[:, 2] <= ZS) & (cmax[:, 2] >= ZS)
sidx = np.full((sw, sh), -1, np.int32)
l2 = np.ceil((cmin[:, :2] - [X0, Y0]) / SD - 0.5).astype(int); h2 = np.floor((cmax[:, :2] - [X0, Y0]) / SD - 0.5).astype(int) + 1
l2 = np.maximum(l2, 0); h2 = np.minimum(h2, [sw, sh])
for c in np.nonzero(cut)[0][np.argsort(-vol[cut])]:
    sidx[l2[c, 0]:h2[c, 0], l2[c, 1]:h2[c, 1]] = c
SX, SY = np.meshgrid(X0 + SD * (np.arange(sw) + 0.5), Y0 + SD * (np.arange(sh) + 0.5), indexing='ij')
smask = inside(SX, SY, np.full_like(SX, ZS)) | (sidx < 0)
STOPS = [(0, (16, 22, 42)), (0.25, (27, 54, 122)), (0.5, (36, 99, 214)), (0.75, (63, 174, 230)), (1, (216, 246, 251))]
def cmap(t):
    t = np.clip(t, 0, 1)[..., None]
    out = np.zeros(t.shape[:-1] + (3,))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = ((t >= a) & (t <= b))[..., 0]
        q = ((t - a) / (b - a))[m]
        out[m] = np.array(ca) + (np.array(cb) - np.array(ca)) * q
    return out
def blur2(a, mask, r):
    w = (~mask).astype(float); n = a * w
    for ax in (0, 1):
        n2, w2 = n.copy(), w.copy()
        for s_ in range(1, r + 1):
            n2 += np.roll(n, s_, ax) + np.roll(n, -s_, ax); w2 += np.roll(w, s_, ax) + np.roll(w, -s_, ax)
        n, w = n2, w2
    return n / np.maximum(w, 1e-6)
# Blur each pixel by about half its cell size, so coarse far-field cells don't show as tiles.
csz = (cmax - cmin)[np.maximum(sidx, 0), 0] / SD
RADII = [1, 3, 6, 12]
pick = np.digitize(csz, [5, 10, 20])
def adaptive(a):
    out = np.zeros_like(a)
    for n_, r in enumerate(RADII):
        out = np.where(pick == n_, blur2(a, smask, r), out)
    return out
SLMAX = 14.0
rows = []
conv = {'it': [], 'U': [], 'p': [], 'k': []}
prev = None
for t in times:
    U = fr.read_field(os.path.join(CASE, t, 'U'), ncell)
    P = fr.read_field(os.path.join(CASE, t, 'p'), ncell)[:, 0]
    K = fr.read_field(os.path.join(CASE, t, 'k'), ncell)[:, 0]
    sp = np.linalg.norm(U, axis=1)[np.maximum(sidx, 0)]
    sp = adaptive(sp)
    rgb = cmap(sp / SLMAX)
    a = np.where(smask, 0, 255)
    img = np.dstack([rgb, a]).astype(np.uint8).transpose(1, 0, 2)[::-1]  # rows = +y up
    rows.append(img)
    if prev is not None:
        dit = float(t) - float(prev[0])
        conv['it'].append(int(float(t)))
        conv['U'].append(float(np.abs(U - prev[1]).mean() / UIN / dit))
        conv['p'].append(float(np.abs(P - prev[2]).mean() / (0.5 * UIN ** 2) / dit))
        conv['k'].append(float(np.abs(K - prev[3]).mean() / max(np.abs(K).mean(), 1e-9) / dit))
    prev = (t, U, P, K)
Image.fromarray(np.concatenate(rows, 0)).save(os.path.join(OUT, 'slice.webp'), quality=88, method=6)

def read_dict(path, key):
    import re
    m = re.search(rf'\b{key}\s+([^;]+);', open(path).read())
    return m.group(1).strip() if m else None

meta = {
    'index': index,
    'domain': [X0, X1, Y0, Y1, Z0, Z1],
    'cells': int(ncell), 'points': int(len(pts)), 'faces': int(len(faces)),
    'patches': {k: v[1] for k, v in bnd.items()},
    'background': [25, 20, 10],
    'speedMax': SMAX, 'slice': {'z': ZS, 'w': sw, 'h': sh, 'frames': [int(float(t)) for t in times], 'max': SLMAX},
    'conv': conv,
    'uMaxCell': float(np.linalg.norm(Ulast, axis=1).max()),
    'nu': read_dict(os.path.join(CASE, 'constant', 'physicalProperties'), 'nu'),
}
json.dump(meta, open(os.path.join(OUT, 'wind.json'), 'w'), separators=(',', ':'))
print('wrote', len(blob) // 1024, 'KB bin;', 'slice frames', len(rows), '; conv', conv)
