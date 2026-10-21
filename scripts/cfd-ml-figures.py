"""Build the data for the bachelor's thesis case study (projects/cfd-ml) from the original OpenFOAM export.

Inputs
  - the thesis dataset: one ParaView CSV per saved time (t0.00.csv ... t2.00.csv), 135,730 mesh points each,
    with U.water and p / p_rgh. Path given as the first argument (default ~/Downloads/archive).
  - the thesis report PDF (second argument). Its velocity figures hold the model's predictions, which were never
    saved as data, so they are decoded from the jet colours back into m/s and checked against the CFD values.

Writes to projects/cfd-ml/media:
  - strip.png     |U| on the pipe's mid-plane (x = 0) unrolled along the centreline, 448x40 per saved time, 8-bit
  - discs.png     |U| on the four thesis sample planes, 96x96 per plane per time
  - compare.png   decoded thesis figures: actual and predicted |U| on the four planes at t = 1.55 and 1.60 s
  - flow.json     times, tile layouts, secondary-flow vectors, profiles, peak-speed series, probe-point series
  - dean.png      |U| on cross-sections every half diameter up the vertical leg at t = 2.00 s
  - streams.json  water streamlines through the bend at t = 2.00 s
  - psd.json      Fig. 4.1 (volumetric size distribution at four stations), digitised from the report

Needs numpy, scipy and Pillow, plus pdfimages (poppler).
Run: python3 scripts/cfd-ml-figures.py ~/Downloads/archive "~/Downloads/BTP_Report_Final (1).pdf"
"""
import glob, json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy.interpolate import LinearNDInterpolator, griddata
from scipy.spatial import Delaunay, cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
MEDIA = os.path.join(HERE, '..', 'projects', 'cfd-ml', 'media')
DATA = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Downloads/archive')
REPORT = os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else '~/Downloads/BTP_Report_Final (1).pdf')
VMAX = 0.70  # |U| scale for the 8-bit tiles, m/s

# Geometry, read off the mesh: 40 mm pipe, 10 D straight legs, bend centreline radius 60 mm (1.5 D).
# Leg 1 runs along +y at z = 0, the bend turns about (y, z) = (0.40, 0.06), leg 2 runs up +z at y = 0.46.
R, RB, YB, ZB = 0.02, 0.06, 0.40, 0.06
# The thesis sample planes. Distances are counted from the bend's ends (y = 0.40, z = 0.06).
PLANES = [
    dict(id='b1', name='1D before', axis='y', at=0.36),
    dict(id='a1', name='1D after', axis='z', at=0.10),
    dict(id='a5', name='5D after', axis='z', at=0.26),
    dict(id='a9', name='9D after', axis='z', at=0.42),
]


def load(path):
    with open(path) as f:
        head = f.readline().strip().split(',')
    a = np.loadtxt(path, delimiter=',', skiprows=1, usecols=range(1, len(head)), dtype=np.float64)
    return dict(zip(head[1:], a.T))


def inside(y, z, pad=0.0):
    """Mid-plane mask of the L-shaped pipe in (y, z)."""
    r = R - pad
    leg1 = (y <= YB) & (np.abs(z) <= r)
    bend = (y > YB) & (z < ZB) & (np.abs(np.hypot(y - YB, z - ZB) - RB) <= r)
    leg2 = (z >= ZB) & (np.abs(y - (YB + RB)) <= r)
    return leg1 | bend | leg2


def q8(v, mask):
    out = np.clip(np.round(np.nan_to_num(v) / VMAX * 254), 0, 254).astype(np.uint8)
    out[~mask | np.isnan(v)] = 255
    return out


def main():
    os.makedirs(MEDIA, exist_ok=True)
    files = sorted(glob.glob(os.path.join(DATA, 't*.*.csv')), key=lambda f: float(os.path.basename(f)[1:-4]))
    times = [round(float(os.path.basename(f)[1:-4]), 2) for f in files]
    print(len(files), 'snapshots', times[0], '...', times[-1])

    first = load(files[0])
    P = np.c_[first['Points_0'], first['Points_1'], first['Points_2']]
    _, uniq = np.unique(first['Point ID'], return_index=True)
    snaps = []
    for f in files:
        d = load(f)
        snaps.append(np.c_[d['U.water_0'], d['U.water_1'], d['U.water_2']].astype(np.float32))
    x, y, z = P.T

    # ── Mid-plane, unrolled ─────────────────────────────────────────────────
    # The x = 0 plane, straightened along the pipe centreline: s runs inlet to outlet, n runs inner wall to outer
    # wall of the bend (row 0 = inner). 2 mm along, 1 mm across.
    LS = 2 * YB + np.pi / 2 * RB
    SN, NN = 448, 40
    ss = (np.arange(SN) + .5) / SN * LS
    nn = -R + (np.arange(NN) + .5) / NN * 2 * R
    GS, GN = np.meshgrid(ss, nn)
    th = np.clip((GS - YB) / RB, 0, np.pi / 2)
    gy = np.where(GS < YB, GS, np.where(GS < YB + np.pi / 2 * RB, YB + (RB + GN) * np.sin(th), YB + RB + GN))
    gz = np.where(GS < YB, -GN, np.where(GS < YB + np.pi / 2 * RB, ZB - (RB + GN) * np.cos(th), ZB + GS - YB - np.pi / 2 * RB))
    mid = np.abs(x) < 1e-6
    tri = Delaunay(np.c_[y[mid], z[mid]])
    strip = np.full((len(times) * NN, SN), 255, np.uint8)
    full = np.ones_like(GS, bool)
    for k, U in enumerate(snaps):
        f = LinearNDInterpolator(tri, np.linalg.norm(U[mid], axis=1))
        strip[k * NN:(k + 1) * NN] = q8(f(gy, gz), full)
    Image.fromarray(strip).save(os.path.join(MEDIA, 'strip.png'), optimize=True)
    stations = {p['id']: round(p['at'] if p['axis'] == 'y' else YB + np.pi / 2 * RB + p['at'] - ZB, 4) for p in PLANES}

    # ── Sample planes ────────────────────────────────────────────────────────
    N = 96
    g = (np.arange(N) + .5) / N * 0.04 - 0.02
    GU, GV = np.meshgrid(g, g[::-1])
    disc = GU**2 + GV**2 <= R**2
    vg = np.linspace(-0.016, 0.016, 9)
    VU, VV = [a.ravel() for a in np.meshgrid(vg, vg[::-1])]
    vin = VU**2 + VV**2 <= 0.0165**2
    VU, VV = VU[vin], VV[vin]
    pg = np.linspace(-0.02, 0.02, 41)  # profile, inner wall to outer wall on the bend plane
    datlas = np.full((4 * N, len(times) * N), 255, np.uint8)
    vec, prof, peak, mean = {}, {}, {}, {}
    for i, pl in enumerate(PLANES):
        if pl['axis'] == 'y':
            m = np.abs(y - pl['at']) < 1e-5
            uv = np.c_[x[m], z[m]]
            comp = (0, 2)          # in-plane (Ux, Uz); +z is the inner side of the coming bend
            pv = -pg               # inner wall (z = +R) first
        else:
            m = (np.abs(z - pl['at']) < 1e-5) & (y > 0.435)
            uv = np.c_[x[m], y[m] - 0.46]
            comp = (0, 1)          # in-plane (Ux, Uy); -y is the inner wall
            pv = pg
        pl['points'] = int(m.sum())
        t2 = Delaunay(uv)
        vec[pl['id']], prof[pl['id']], peak[pl['id']], mean[pl['id']] = [], [], [], []
        for k, U in enumerate(snaps):
            Um = np.linalg.norm(U[m], axis=1)
            f = LinearNDInterpolator(t2, Um)
            grid = f(GU, GV)
            datlas[i * N:(i + 1) * N, k * N:(k + 1) * N] = q8(grid, disc)
            fu = LinearNDInterpolator(t2, U[m][:, comp[0]]); fv = LinearNDInterpolator(t2, U[m][:, comp[1]])
            vec[pl['id']].append([round(float(v), 4) for pair in zip(fu(VU, VV), fv(VU, VV)) for v in pair])
            prof[pl['id']].append([round(float(v), 4) for v in np.nan_to_num(f(np.zeros_like(pv), pv))])
            peak[pl['id']].append(round(float(Um.max()), 4))
            mean[pl['id']].append(round(float(np.nanmean(grid[disc])), 4))
    Image.fromarray(datlas).save(os.path.join(MEDIA, 'discs.png'), optimize=True)

    # A probe point on each plane, off the symmetry plane so Ux is not zero, for the lag-feature example
    probe = {}
    press = [load(f).get('p') for f in files]
    for pl in PLANES:
        c = np.array([0.008, pl['at'], 0.004]) if pl['axis'] == 'y' else np.array([0.008, 0.464, pl['at']])
        j = int(np.argmin(np.linalg.norm(P - c, axis=1)))
        probe[pl['id']] = {'xyz': [round(float(v), 4) for v in P[j]], 'id': int(first['Point ID'][j]),
                           'U': [[round(float(v), 4) for v in U[j]] for U in snaps],
                           'p': [round(float(q[j]), 1) if q is not None else None for q in press]}

    # Pressure drop inlet to outlet over time
    dp = []
    inl, out = np.abs(y) < 1e-6, np.abs(z - 0.46) < 1e-6
    for f in files:
        d = load(f)
        key = 'p' if 'p' in d else None
        dp.append(round(float(d['p'][inl].mean() - d['p'][out].mean()), 1) if key else None)

    a1m = (np.abs(z - 0.10) < 1e-5) & (y > 0.435)
    _, keep = np.unique(np.round(np.c_[x[a1m], y[a1m]], 6), axis=0, return_index=True)
    a1m = np.where(a1m)[0][np.sort(keep)]

    # ── Streamlines at the last saved time ──────────────────────────────────
    # Inverse-distance weights over the 8 nearest mesh points: the mesh is fine (4 mm along the legs) and a 3D
    # Delaunay of a structured hex mesh is very slow.
    Pu, Uu = P[uniq], snaps[-1][uniq].astype(np.float64)
    kd = cKDTree(Pu)

    def fU(p):
        d, k = kd.query(p, k=8)
        w = 1 / np.maximum(d, 1e-6) ** 2
        return (Uu[k] * w[..., None]).sum(1) / w.sum(1)[:, None]
    gold = np.pi * (3 - 5 ** .5)
    n = 90
    seeds = np.array([[0.016 * ((k + .5) / n) ** .5 * np.cos(k * gold), 0.004, 0.016 * ((k + .5) / n) ** .5 * np.sin(k * gold)] for k in range(n)])

    def inside3(p):
        px, py, pz = p.T
        leg1 = (py <= YB) & (px**2 + pz**2 <= R**2)
        rr = np.hypot(py - YB, pz - ZB)
        bend = (py > YB) & (pz < ZB) & (px**2 + (rr - RB)**2 <= R**2)
        leg2 = (pz >= ZB) & (px**2 + (py - 0.46)**2 <= R**2)
        return leg1 | bend | leg2

    pts = seeds.copy(); alive = np.ones(n, bool)
    paths = [[p.copy()] for p in seeds]; speeds = [[float(np.linalg.norm(fU(p[None])[0]))] for p in seeds]
    dt = 0.002
    for step in range(1400):
        if not alive.any(): break
        p = pts[alive]
        k1 = fU(p); k2 = fU(p + .5 * dt * k1); k3 = fU(p + .5 * dt * k2); k4 = fU(p + dt * k3)
        nxt = p + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        ok = inside3(nxt) & (nxt[:, 2] < 0.455) & (np.linalg.norm(k1, axis=1) > 1e-3)
        idx = np.where(alive)[0]
        for jj, i in enumerate(idx):
            if ok[jj]:
                paths[i].append(nxt[jj].copy()); speeds[i].append(float(np.linalg.norm(k1[jj])))
            else:
                alive[i] = False
        pts[idx[ok]] = nxt[ok]
    lines = []
    for pth, sp in zip(paths, speeds):
        pth = np.array(pth); sp = np.array(sp)
        if len(pth) < 50 or pth[-1, 2] < 0.3: continue
        s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pth, axis=0), axis=1))]
        ss = np.linspace(0, s[-1], 160)
        rs = np.c_[[np.interp(ss, s, pth[:, c]) for c in range(3)]].T
        rv = np.interp(ss, s, sp)
        lines.append({'p': [int(round(v * 1e4)) for v in rs.ravel()], 'u': [int(round(v * 1e3)) for v in rv]})
    print(len(lines), 'streamlines')
    json.dump({'scale': [1e-4, 1e-3], 'lines': lines}, open(os.path.join(MEDIA, 'streams.json'), 'w'), separators=(',', ':'))

    # ── Dean vortices: secondary flow along the pipe at the last saved time ─
    # x is distance from the bend's exit in diameters: leg 1 and the bend are negative.
    Ul = snaps[-1].astype(np.float64)
    BEND = np.pi / 2 * RB / 0.04
    curve = []
    for yy in np.unique(np.round(y[np.abs(z) <= R + 1e-9], 5)):
        m = (np.abs(y - yy) < 1e-6) & (np.abs(z) <= R + 1e-9)
        if m.sum() < 500 or yy > YB + 1e-9: continue
        sec = np.hypot(Ul[m, 0], Ul[m, 2])
        curve.append([round((yy - YB) / 0.04 - BEND, 3), round(float(sec.max()), 4), round(float(sec.mean()), 4)])
    bm = (y > YB + 1e-7) & (z < ZB - 1e-7)
    th = np.arctan2(z[bm] - ZB, y[bm] - YB) + np.pi / 2
    Ub = Ul[bm]
    ur = Ub[:, 1] * np.sin(th) - Ub[:, 2] * np.cos(th)
    secb = np.hypot(Ub[:, 0], ur)
    edges = np.linspace(0, np.pi / 2, 25)
    for a, b in zip(edges[:-1], edges[1:]):
        k = (th >= a) & (th < b)
        if k.sum() < 100: continue
        curve.append([round(((a + b) / 2) * RB / 0.04 - BEND, 3), round(float(secb[k].max()), 4), round(float(secb[k].mean()), 4)])
    dean_st = []
    for zz in np.unique(np.round(z[y > 0.435], 5)):
        m = (np.abs(z - zz) < 1e-6) & (y > 0.435)
        if m.sum() < 500 or zz < ZB - 1e-9: continue
        sec = np.hypot(Ul[m, 0], Ul[m, 1])
        curve.append([round((zz - ZB) / 0.04, 3), round(float(sec.max()), 4), round(float(sec.mean()), 4)])
        if abs(((zz - ZB) / 0.02) - round((zz - ZB) / 0.02)) < 1e-6: dean_st.append(zz)
    curve.sort()
    # cross-sections every half diameter up the vertical leg
    datl = np.full((N, len(dean_st) * N), 255, np.uint8)
    dvec = []
    for k, zz in enumerate(dean_st):
        m = (np.abs(z - zz) < 1e-6) & (y > 0.435)
        uv = np.c_[x[m], y[m] - 0.46]
        t2 = Delaunay(uv)
        datl[:, k * N:(k + 1) * N] = q8(LinearNDInterpolator(t2, np.linalg.norm(Ul[m], axis=1))(GU, GV), disc)
        fu = LinearNDInterpolator(t2, Ul[m, 0]); fv = LinearNDInterpolator(t2, Ul[m, 1])
        dvec.append([round(float(v), 4) for pair in zip(fu(VU, VV), fv(VU, VV)) for v in pair])
    Image.fromarray(datl).save(os.path.join(MEDIA, 'dean.png'), optimize=True)
    dlines = []
    for zz in dean_st:
        m = (np.abs(z - zz) < 1e-6) & (y > 0.435)
        t2 = Delaunay(np.c_[x[m], y[m] - 0.46])
        fu = LinearNDInterpolator(t2, Ul[m, 0]); fv = LinearNDInterpolator(t2, Ul[m, 1])
        lines_here = []
        for sx in (-1, 1):
            for r0 in (0.0035, 0.0065, 0.0095, 0.0125, 0.0155, 0.0180):
                p = np.array([sx * r0, 0.0]); pts = [p.copy()]; travelled = 0.0
                c0 = np.array([sx * 0.0095, -0.002]); a_prev = np.arctan2(*(p - c0)[::-1]); turned = 0.0
                for _ in range(600):
                    u = np.array([fu(*p), fv(*p)], float)
                    if not np.all(np.isfinite(u)) or np.hypot(*u) < 1e-5: break
                    mid = p + 0.5 * 0.00025 * u / np.hypot(*u)
                    u2 = np.array([fu(*mid), fv(*mid)], float)
                    if not np.all(np.isfinite(u2)) or np.hypot(*u2) < 1e-5: break
                    p = p + 0.00025 * u2 / np.hypot(*u2); travelled += 0.00025
                    if np.hypot(*p) > 0.0192: break
                    pts.append(p.copy())
                    a = np.arctan2(*(p - c0)[::-1]); turned += (a - a_prev + np.pi) % (2 * np.pi) - np.pi; a_prev = a
                    if abs(turned) >= 2 * np.pi - 0.05: break
                    if travelled > 0.012 and np.hypot(*(p - pts[0])) < 0.0006: pts.append(pts[0].copy()); break
                if len(pts) > 12:
                    pts = np.array(pts)[::3]
                    lines_here.append([round(float(v) / R, 3) for v in pts.ravel()])
        dlines.append(lines_here)
    json.dump({'at': [round((zz - ZB) / 0.04, 2) for zz in dean_st], 'lines': dlines}, open(os.path.join(MEDIA, 'dean-lines.json'), 'w'), separators=(',', ':'))
    dean = {'img': 'dean.png', 'n': N, 'at': [round((zz - ZB) / 0.04, 2) for zz in dean_st], 'vectors': dvec,
            'curve': curve, 'bend': round(BEND, 3), 'De': round(0.5 * 0.04 / 1e-6 * np.sqrt(0.04 / (2 * RB)))}
    print('dean', len(dean_st), 'stations, curve', len(curve), 'peak', max(c[1] for c in curve))

    # ── Decoded thesis figures ──────────────────────────────────────────────
    compare = decode_report(P, files, times)
    digitise_psd()

    json.dump({
        'times': times, 'vmax': VMAX, 'train_end': 1.50,
        'geometry': {'D': 0.04, 'rb': RB, 'leg': 0.40, 'bend_y': YB, 'bend_z': ZB},
        'strip': {'img': 'strip.png', 's': SN, 'n': NN, 'length': round(LS, 5), 'stations': stations},
        'discs': {'img': 'discs.png', 'n': N, 'planes': PLANES},
        'vectors': {'u': [round(v, 4) for v in VU], 'v': [round(v, 4) for v in VV], 'data': vec},
        'profiles': {'s': [round(v, 4) for v in pg], 'data': prof},
        'peak': peak, 'mean': mean, 'probe': probe, 'dp': dp,
        'compare': compare, 'dean': dean,
        'mesh': {'points': int(len(P)), 'unique': int(len(uniq)), 'snapshots': len(files), 'columns': 11,
                 # the 601 mesh points on the 1D-after plane, (x, y - 0.46) in metres, for the mesh figures
                 'a1': [round(float(v), 5) for v in np.c_[x[a1m], y[a1m] - 0.46].ravel()]},
    }, open(os.path.join(MEDIA, 'flow.json'), 'w'), separators=(',', ':'))


# Decoding: each figure is a 6000x2400 PNG with actual (left) and predicted (right) |U| as jet tricontourf.
FIGS = [('008', 'b1', 1.55), ('010', 'a1', 1.55), ('012', 'a5', 1.55), ('014', 'a9', 1.55),
        ('016', 'b1', 1.60), ('018', 'a1', 1.60), ('020', 'a5', 1.60), ('022', 'a9', 1.60)]
# Bottom tick value and tick step of every colour bar, read off its labels.
TICK = {'008A': (.012, .060), '008P': (.012, .060), '010A': (.012, .066), '010P': (.018, .066),
        '012A': (.012, .054), '012P': (.018, .054), '014A': (.012, .060), '014P': (.012, .060),
        '016A': (.012, .060), '016P': (.012, .060), '018A': (.012, .066), '018P': (.016, .064),
        '020A': (.012, .054), '020P': (.018, .054), '022A': (.012, .060), '022P': (.018, .060)}
AXES = {'A': (750, 2441, 2593), 'P': (3286, 4977, 5129)}  # frame left, frame right, colour bar centre (px)
TOP, BOT = 288, 2136


def ticks_px(a, c0):
    col = a[:, c0 + 8].mean(1)
    rows = np.where(col < 100)[0]
    groups = np.split(rows, np.where(np.diff(rows) > 2)[0] + 1)
    centres = np.array([g.mean() for g in groups if len(g)])
    return float(np.diff(centres).mean())


def decode_report(P, files, times):
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdfimages', '-png', '-f', '36', '-l', '39', REPORT, os.path.join(tmp, 'r')], check=True)
    imgs = sorted(f for f in glob.glob(os.path.join(tmp, 'r-*.png')) if Image.open(f).size == (6000, 2400) and Image.open(f).mode != 'L')
    assert len(imgs) == 8, imgs
    N = 128
    g = (np.arange(N) + .5) / N * 0.04 - 0.02
    GU, GV = np.meshgrid(g, g[::-1])
    disc = GU**2 + GV**2 <= 0.0196**2
    atlas = np.full((2 * N, 8 * N), 255, np.uint8)
    cases = []
    for k, ((fid, pid, t), path) in enumerate(zip(FIGS, imgs)):
        a = np.asarray(Image.open(path).convert('RGB')).astype(float)
        fields = {}
        for side in 'AP':
            l, r, cb = AXES[side]
            v0, st = TICK[fid + side]
            px = ticks_px(a, 2640 if side == 'A' else 5176)
            rows = np.arange(TOP + 3, BOT - 2)
            lut = a[rows, cb - 20:cb + 21].mean(1)
            val = v0 + st * (BOT - rows) / px
            tree = cKDTree(lut)
            cx = l + (GU + .02) / .04 * (r - l)
            cy = TOP + (.02 - GV) / .04 * (BOT - TOP)
            out = np.full((N, N), np.nan)
            for i in range(N):
                for j in range(N):
                    if not disc[i, j]: continue
                    x0, y0 = int(cx[i, j]), int(cy[i, j])
                    d, kk = tree.query(a[y0 - 3:y0 + 4, x0 - 3:x0 + 4].reshape(-1, 3))
                    ok = d < 40
                    if ok.sum() >= 10: out[i, j] = np.median(val[kk[ok]])
            fields[side] = out
        # CFD on the same grid, to check the decoding
        pl = next(p for p in PLANES if p['id'] == pid)
        d = load(files[times.index(t)])
        Um = np.sqrt(d['U.water_0']**2 + d['U.water_1']**2 + d['U.water_2']**2)
        if pl['axis'] == 'y':
            m = np.abs(P[:, 1] - pl['at']) < 1e-5; uv = np.c_[P[m, 0], P[m, 2]]
        else:
            m = (np.abs(P[:, 2] - pl['at']) < 1e-5) & (P[:, 1] > 0.435); uv = np.c_[P[m, 0], P[m, 1] - 0.46]
        cfd = griddata(uv, Um[m], (GU, GV))
        ok = disc & ~np.isnan(fields['A']) & ~np.isnan(fields['P']) & ~np.isnan(cfd)
        gap = fields['P'] - fields['A']
        cases.append({'plane': pid, 't': t,
                      'decode_mae': round(float(np.abs(fields['A'] - cfd)[ok].mean()), 4),
                      'mae': round(float(np.abs(gap)[ok].mean()), 4),
                      'max_gap': round(float(np.abs(gap)[ok].max()), 4)})
        atlas[0:N, k * N:(k + 1) * N] = q8(fields['A'], disc)
        atlas[N:2 * N, k * N:(k + 1) * N] = q8(fields['P'], disc)
        print('decoded', fid, pid, t, cases[-1])
    Image.fromarray(atlas).save(os.path.join(MEDIA, 'compare.png'), optimize=True)
    return {'img': 'compare.png', 'n': N, 'cases': cases}


def digitise_psd():
    """Fig. 4.1: MATLAB markers at the 30 size classes; take each series' marker centre in every class column."""
    tmp = tempfile.mkdtemp()
    subprocess.run(['pdfimages', '-png', '-f', '32', '-l', '32', REPORT, os.path.join(tmp, 'f')], check=True)
    path = max(glob.glob(os.path.join(tmp, 'f-*.png')), key=os.path.getsize)
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    top, bot, left, right = 75, 1151, 270.5, 1944.5  # axes frame, px
    legend_bottom = 340
    colours = {'inlet': (0, 114, 189), 'L1': (217, 83, 25), 'L5': (237, 177, 32), 'L9': (126, 47, 142)}
    d = 250 ** (np.arange(30) / 29)
    X = left + np.log10(d) / np.log10(250) * (right - left)
    out = {}
    for k, c in colours.items():
        m = np.abs(a - np.array(c)).sum(2) < 90
        vals = []
        for i, x in enumerate(X):
            xi = int(round(x))
            lo = legend_bottom if x < 600 else top
            ys = np.where(m[lo:bot + 1, xi - 2:xi + 3].any(1))[0]
            if len(ys) == 0:
                vals.append(0.0); continue
            cl = [g for g in np.split(ys, np.where(np.diff(ys) > 6)[0] + 1) if len(g)]
            best = max(cl, key=len)
            vals.append(round(max(0.0, (bot - ((best.min() + best.max()) / 2 + lo)) / (bot - top) * 0.1), 5))
        out[k] = vals
    json.dump({'d': [round(float(v), 3) for v in d], **out}, open(os.path.join(MEDIA, 'psd.json'), 'w'), separators=(',', ':'))
    print('psd', {k: (round(float(d[int(np.argmax(v))]), 1), max(v)) for k, v in out.items()})


if __name__ == '__main__':
    main()
