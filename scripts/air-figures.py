"""Build the data figures for the Air Atlas case study from the app's real data.

Reads the published data in `air-pollution-map/public/data`, the analysis results, the event-card deck,
the git log and a GoatCounter snapshot (`media/stats.json`), then writes:
  - media/fig/plates.json   PM2.5, dust and NO2 over Africa and Asia for the ink-plate demo
  - media/fig/strip.json    PM2.5 over northern India at native 0.4 degrees for the halftone strip
  - media/cards/*.svg       card art copied from the app
  - SVG and HTML figures injected into index.html between <!--fig:NAME--> and <!--/fig:NAME--> markers.

Run: python3 scripts/air-figures.py
"""
import base64, datetime as dt, gzip, html, json, math, os, re, shutil, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, '..', 'projects', 'air-pollution')
MEDIA = os.path.join(PAGE, 'media')
APP = os.path.join(HERE, '..', '..', '..', 'air-pollution-map')
DATA = os.path.join(APP, 'public', 'data')
W, H, STEP = 900, 451, 0.4
FIGS = {}

def jload(*p):
    with open(os.path.join(*p), encoding='utf-8') as f:
        return json.load(f)

FIELDS = {f['id']: f for f in jload(APP, 'src', 'camsFields.json')}
INK = {k: FIELDS[k]['colour'] for k in FIELDS}
SHORT = {'pm2_5': 'PM2.5', 'pm10': 'PM10', 'nitrogen_dioxide': 'NO₂', 'nitrogen_monoxide': 'NO', 'ozone': 'Ozone',
         'dust': 'Dust', 'carbon_monoxide': 'CO', 'sulphur_dioxide': 'SO₂', 'aerosol_optical_depth': 'AOD',
         'uv_index': 'UV index', 'uv_index_clear_sky': 'UV clear-sky', 'formaldehyde': 'Formaldehyde',
         'glyoxal': 'Glyoxal', 'peroxyacyl_nitrates': 'PAN', 'sea_salt_aerosol': 'Sea salt'}
esc = html.escape

# ---------- data -------------------------------------------------------------------------------------------
META = jload(DATA, 'global-air-native.json')
ORDER = META['fieldOrder']
RAW = open(os.path.join(DATA, META['dataFile']), 'rb').read()
SNAP = np.frombuffer(RAW, dtype='<f4').reshape(len(ORDER), H, W)
SNAP_AT = dt.datetime.fromtimestamp(META['validAt'] / 1000, dt.timezone.utc)

def field(fid):
    return SNAP[ORDER.index(fid)]

def rowcol(lat, lon):
    return int(round((lat + 90) / STEP)), int(round((lon + 180) / STEP))

# ---------- land outlines (world-atlas, Natural Earth 110m) ------------------------------------------------
def land_rings(lon0, lon1, lat0, lat1):
    topo = jload(APP, 'node_modules', 'world-atlas', 'land-110m.json')
    sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
    arcs = []
    for arc in topo['arcs']:
        x = y = 0; pts = []
        for dx, dy in arc:
            x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    def ring(idx):
        out = []
        for i in idx:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out
    rings = []
    for geom in topo['objects']['land']['geometries']:
        polys = geom['arcs'] if geom['type'] == 'MultiPolygon' else [geom['arcs']]
        for poly in polys:
            for r in poly:
                pts = ring(r)
                xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
                if max(xs) < lon0 or min(xs) > lon1 or max(ys) < lat0 or min(ys) > lat1 or len(pts) < 4:
                    continue
                rings.append([[round(p[0], 2), round(p[1], 2)] for p in pts])
    return rings

def oklab(hexcol):
    rgb = [int(hexcol[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    r, g, b = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
    l = (.4122214708 * r + .5363325363 * g + .0514459929 * b) ** (1 / 3)
    m = (.2119034982 * r + .6806995451 * g + .1073969566 * b) ** (1 / 3)
    s_ = (.0883024619 * r + .2817188376 * g + .6299787005 * b) ** (1 / 3)
    return (.2104542553 * l + .793617785 * m - .0040720468 * s_, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s_, .0259040371 * l + .7827717662 * m - .808675766 * s_)

# ---------- plates.json: three real fields for the ink demo -----------------------------------------------
def plates():
    lon0, lon1, lat0, lat1 = -20, 130, -2, 60
    r0, c0 = rowcol(lat0, lon0); r1, c1 = rowcol(lat1, lon1)
    out = {'lon0': lon0, 'lon1': lon1, 'lat0': lat0, 'lat1': lat1, 'step': STEP * 2,
           'validAt': SNAP_AT.strftime('%Y-%m-%dT%H:%MZ'), 'fields': []}
    for fid, strength in (('pm2_5', 1), ('dust', .75), ('nitrogen_dioxide', 1)):
        a = field(fid)[r0:r1 + 1, c0:c1 + 1].astype(np.float64)
        a = np.nan_to_num(a, nan=0.0)
        hh, ww = (a.shape[0] // 2) * 2, (a.shape[1] // 2) * 2
        a = a[:hh, :ww].reshape(hh // 2, 2, ww // 2, 2).mean(axis=(1, 3))  # 0.8 degree blocks
        rng = FIELDS[fid]['range']
        q = np.clip(np.round(np.clip(a / rng, 0, 1) * 255), 0, 255).astype(np.uint8)
        out['fields'].append({'id': fid, 'label': SHORT[fid], 'ink': INK[fid], 'range': rng, 'strength': strength,
                              'index': list(FIELDS).index(fid), 'w': int(q.shape[1]), 'h': int(q.shape[0]),
                              'data': base64.b64encode(q.tobytes()).decode()})
    out['land'] = land_rings(lon0, lon1, lat0, lat1)
    out['inkL'] = round(sum(oklab(f['colour'])[0] for f in FIELDS.values()) / len(FIELDS), 5)  # shared ink lightness, as in GlobalAirLayer.js
    with open(os.path.join(MEDIA, 'fig', 'plates.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))

# ---------- strip.json: PM2.5 over the Indo-Gangetic plain ------------------------------------------------
def strip():
    lon0, lon1, lat0, lat1 = 66, 92, 21, 35
    r0, c0 = rowcol(lat0, lon0); r1, c1 = rowcol(lat1, lon1)
    a = field('pm2_5')[r0:r1 + 1, c0:c1 + 1]
    vals = [None if not np.isfinite(v) else round(float(v), 1) for v in a.ravel()]
    out = {'lon0': lon0, 'lon1': lon1, 'lat0': lat0, 'lat1': lat1, 'step': STEP, 'w': a.shape[1], 'h': a.shape[0],
           'range': FIELDS['pm2_5']['range'], 'ink': INK['pm2_5'], 'values': vals,
           'validAt': SNAP_AT.strftime('%Y-%m-%dT%H:%MZ'), 'land': land_rings(lon0, lon1, lat0, lat1),
           'max': round(float(np.nanmax(a)), 1)}
    with open(os.path.join(MEDIA, 'fig', 'strip.json'), 'w') as f:
        json.dump(out, f, separators=(',', ':'))

# ---------- hex: the bytes behind one value ---------------------------------------------------------------
def hexdump():
    r, c = rowcol(28.61, 77.21)
    i = (ORDER.index('pm2_5') * H + r) * W + c
    off = i * 4
    start = off - (off % 16) - 32
    rows = []
    for k in range(5):
        a = start + k * 16
        cells = []
        for b in range(16):
            p = a + b
            txt = f'{RAW[p]:02x}'
            cells.append(f'<b>{txt}</b>' if off <= p < off + 4 else txt)
        groups = ' '.join(cells[:8]) + '  ' + ' '.join(cells[8:])
        rows.append(f'<span class="ha">{a:08x}  </span>{groups}')
    v = float(SNAP[0, r, c])
    FIGS['hex'] = ('<pre class="hex" aria-label="Five rows of bytes from the data file, with four bytes highlighted">'
                   + '\n'.join(rows) + '</pre>'
                   f'<p class="hex-val"><span>Bytes {off:,} to {off + 3:,} of {len(RAW):,}</span>'
                   f'<span>float32, little-endian</span><b>{v:.1f} µg/m³</b><span>PM2.5 over Delhi, '
                   f'{SNAP_AT.strftime("%-d %b %Y, %H:%M")} UTC</span></p>')
    return v

# ---------- SVG helpers ------------------------------------------------------------------------------------
def svg(w, h, body, label, cls=''):
    return (f'<svg viewBox="0 0 {w} {h}" class="{cls}" role="img" aria-label="{esc(label)}">' + body + '</svg>')

def t(x, y, s, cls='ax', anchor='start', extra=''):
    return f'<text class="{cls}" x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}"{extra}>{esc(str(s))}</text>'

# ---------- Delhi monthly PM2.5 ---------------------------------------------------------------------------
def delhi():
    h = jload(DATA, 'air-history.json')
    k = h['fieldOrder'].index('pm2_5')
    r, c = rowcol(28.61, 77.21)
    pts = []
    for fr in h['frames']:
        a = np.frombuffer(gzip.open(os.path.join(DATA, fr['compressedFile'])).read(), dtype='<f2').reshape(len(h['fieldOrder']), H, W)
        pts.append((dt.datetime.fromtimestamp(fr['validAt'] / 1000, dt.timezone.utc), float(a[k, r, c])))
    n = len(pts)
    L, R, T, B, Wd, Hd = 44, 16, 24, 40, 880, 320
    pw, ph = Wd - L - R, Hd - T - B
    ymax = 140
    X = lambda i: L + pw * i / (n - 1)
    Y = lambda v: T + ph * (1 - v / ymax)
    body = []
    for i, (m, _) in enumerate(pts):  # winter bands, Nov to Jan
        if m.month == 11:
            body.append(f'<rect class="band" x="{X(i) - pw / (n - 1) / 2:.1f}" y="{T}" width="{pw / (n - 1) * 3:.1f}" height="{ph}"/>')
    for v in range(0, ymax + 1, 20):
        body.append(f'<path class="g" d="M{L} {Y(v):.1f}H{Wd - R}"/>' + t(L - 10, Y(v) + 4, v, anchor='end'))
    body.append(f'<path class="who" d="M{L} {Y(15):.1f}H{Wd - R}"/>' + t(Wd - R, Y(15) - 7, 'WHO daily guideline, 15', 'ax who-t', 'end'))
    line = ' '.join(f'{"M" if i == 0 else "L"}{X(i):.1f} {Y(v):.1f}' for i, (_, v) in enumerate(pts))
    area = line + f' L{X(n - 1):.1f} {Y(0):.1f} L{X(0):.1f} {Y(0):.1f}Z'
    body.append(f'<path d="{area}" fill="{INK["pm2_5"]}" fill-opacity=".14"/>')
    body.append(f'<path d="{line}" fill="none" stroke="{INK["pm2_5"]}" stroke-width="2" stroke-linejoin="round"/>')
    for i, (m, v) in enumerate(pts):
        if m.month == 1:
            body.append(t(X(i), Hd - 14, m.year, 'ax', 'middle'))
            body.append(f'<path class="g" d="M{X(i):.1f} {T + ph}v6"/>')
    # label each winter's peak
    seasons = {}
    for i, (m, v) in enumerate(pts):
        if m.month in (10, 11, 12, 1, 2):
            yr = m.year if m.month >= 10 else m.year - 1
            if yr not in seasons or v > seasons[yr][1]:
                seasons[yr] = (i, v, m)
    for yr, (i, v, m) in seasons.items():
        body.append(f'<circle cx="{X(i):.1f}" cy="{Y(v):.1f}" r="3.5" fill="{INK["pm2_5"]}"/>')
        body.append(t(X(i), Y(v) - 10, f'{v:.0f}', 'vl', 'middle'))
    body.append(t(L, 12, 'µg/m³, monthly mean', 'ax'))
    step = pw / (n - 1)
    for i, (m, v) in enumerate(pts):  # hover targets, one per month
        body.append(f'<rect class="hit" x="{X(i) - step / 2:.1f}" y="{T}" width="{step:.1f}" height="{ph}"><title>{m:%B %Y}: {v:.0f} µg/m³</title></rect>')
    peak = max(v for _, v in pts)
    FIGS['delhi'] = svg(Wd, Hd, ''.join(body),
                        f'Monthly mean PM2.5 over Delhi from {pts[0][0]:%B %Y} to {pts[-1][0]:%B %Y}. Every winter it rises above 100 µg/m³, '
                        f'peaking at {peak:.0f}, against a WHO daily guideline of 15.', 'chart-svg')
    return pts

# ---------- coefficient of variation per field (today's snapshot, cos-lat weighted) ----------------------
def cv():
    lat = -90 + np.arange(H) * STEP
    wts = np.repeat(np.maximum(0, np.cos(np.radians(lat)))[:, None], W, axis=1)
    rows = []
    for fid in ORDER:
        if fid.startswith('uv_'):
            continue
        a = field(fid).astype(np.float64)
        m = np.isfinite(a)
        ww = wts[m]; v = a[m]
        mean = (v * ww).sum() / ww.sum()
        sd = math.sqrt(((v - mean) ** 2 * ww).sum() / ww.sum())
        rows.append((fid, sd / mean))
    rows.sort(key=lambda r: r[1])
    L, R, row, T = 120, 70, 26, 34
    Wd = 880; Hd = T + row * len(rows) + 34
    lo, hi = math.log10(0.2), math.log10(50)
    X = lambda v: L + (Wd - L - R) * (math.log10(v) - lo) / (hi - lo)
    body = []
    for v in (0.2, 0.5, 1, 2, 5, 10, 20, 50):
        body.append(f'<path class="g" d="M{X(v):.1f} {T - 4}V{Hd - 28}"/>' + t(X(v), Hd - 10, f'{v:g}', 'ax', 'middle'))
    for i, (fid, v) in enumerate(rows):
        y = T + i * row
        muted = v < 0.5
        body.append(t(L - 14, y + 15, SHORT[fid], 'lb', 'end'))
        body.append(f'<rect x="{X(0.2):.1f}" y="{y + 5}" width="{X(v) - X(0.2):.1f}" height="12" rx="3" '
                    + (f'fill="{INK[fid]}"' if muted else 'class="bar-n"') + '/>')
        body.append(t(X(v) + 8, y + 15, f'{v:.2f}', 'vl'))
    body.append(f'<path class="thr" d="M{X(0.5):.1f} {T - 8}V{Hd - 28}"/>')
    body.append(t(X(0.5) + 8, T - 14, 'Below 0.5: baseline scale', 'ax thr-t'))
    FIGS['cv'] = svg(Wd, Hd, ''.join(body),
                     'Coefficient of variation per field in the snapshot, on a log scale. Only ozone is below 0.5, so only ozone uses the baseline scale.',
                     'chart-svg')
    return dict(rows)

# ---------- Europe vs global agreement --------------------------------------------------------------------
def agreement():
    rows = [a for a in jload(APP, 'analysis', 'results.json')['agreement'] if a['medianRatio'] > 0]
    rows.sort(key=lambda a: a['medianRatio'])
    L, R, row, T, Wd = 120, 40, 26, 30, 880
    Hd = T + row * len(rows) + 30
    lo, hi = math.log2(0.2), math.log2(2)
    X = lambda v: L + (Wd - L - R) * (math.log2(v) - lo) / (hi - lo)
    body = [t(X(1), 14, 'Same', 'ax', 'middle'), t(X(0.25), 14, 'A quarter as high', 'ax', 'middle'), t(X(2), 14, 'Twice as high', 'ax', 'end')]
    for v in (0.25, 0.5, 1, 2):
        body.append(f'<path class="{"g1" if v == 1 else "g"}" d="M{X(v):.1f} {T - 6}V{Hd - 22}"/>' + t(X(v), Hd - 6, f'{v:g}×', 'ax', 'middle'))
    for i, a in enumerate(rows):
        y = T + i * row + 13
        fid = a['id']; v = a['medianRatio']
        body.append(t(L - 14, y + 4, SHORT[fid], 'lb', 'end'))
        body.append(f'<path class="stem" d="M{X(1):.1f} {y}H{X(v):.1f}"/>')
        key = fid == 'dust'
        body.append(f'<circle cx="{X(v):.1f}" cy="{y}" r="{6 if key else 5}" ' + (f'fill="{INK[fid]}"' if key else 'class="dot-n"') + '/>')
        body.append(t(X(v) + (12 if v >= 1 else -12), y + 4, f'{v:.2f}', 'vl', 'start' if v >= 1 else 'end'))
    FIGS['agree'] = svg(Wd, Hd, ''.join(body),
                        'Median ratio of the 11 km Europe model to the 45 km global model per field, same hour, 9 October 2026. Dust is 0.25: a quarter as high.',
                        'chart-svg')

# ---------- PM2.5 follows CO where fires burn, dust over the Sahara ---------------------------------------
def combustion():
    rows = jload(APP, 'analysis', 'mechanisms.json')['combustion']
    L, Wd, row = 230, 880, 46
    Hd = 34 + row * len(rows) + 30
    X = lambda v: L + (Wd - L - 60) * v
    body = []
    for v in (0, .25, .5, .75, 1):
        body.append(f'<path class="g" d="M{X(v):.1f} 26V{Hd - 24}"/>' + t(X(v), Hd - 6, f'{v:g}', 'ax', 'middle'))
    body.append(f'<rect x="{L}" y="2" width="12" height="12" rx="3" fill="{INK["carbon_monoxide"]}"/>' + t(L + 18, 12, 'follows CO (smoke)', 'lb'))
    body.append(f'<rect x="{L + 190}" y="2" width="12" height="12" rx="3" fill="{INK["dust"]}"/>' + t(L + 208, 12, 'follows dust (sand)', 'lb'))
    for i, r in enumerate(rows):
        y = 34 + i * row
        body.append(t(L - 16, y + 20, r['region'], 'lb', 'end'))
        for j, (k, fid) in enumerate((('pmCo', 'carbon_monoxide'), ('pmDust', 'dust'))):
            v = max(0, r[k])
            body.append(f'<rect x="{L}" y="{y + 4 + j * 15}" width="{X(v) - L:.1f}" height="12" rx="3" fill="{INK[fid]}"/>')
            body.append(t(X(v) + 8, y + 14 + j * 15, f'{r[k]:.2f}', 'vl'))
    FIGS['combust'] = svg(Wd, Hd, ''.join(body),
                          'How closely PM2.5 follows carbon monoxide and dust in six regions (Spearman correlation). It follows CO in fire regions and dust over the Sahara and Sahel.',
                          'chart-svg')

# ---------- data sizes ------------------------------------------------------------------------------------
def sizes():
    def gz(name):
        return os.path.getsize(os.path.join(DATA, name))
    fr = jload(DATA, 'air-frames.json'); efr = jload(DATA, 'europe-frames.json')
    hi = jload(DATA, 'air-history.json'); ehi = jload(DATA, 'europe-history.json')
    sets = [
        ('Global snapshot', '15 fields, 1 hour', gz('global-air-native.bin.gz'), 'pm2_5'),
        ('Europe snapshot', '25 fields, 1 hour', gz('europe-air-native.bin.gz'), 'nitrogen_dioxide'),
        ('Weather', '4 fields, 1 hour', gz('weather-native.bin.gz'), 'sulphur_dioxide'),
        ('Forecast, global', f'{len(fr["frames"])} frames, 3 h apart', sum(gz(f['compressedFile']) for f in fr['frames']), 'pm2_5'),
        ('Forecast, Europe', f'{len(efr["frames"])} frames', sum(gz(f['compressedFile']) for f in efr['frames']), 'nitrogen_dioxide'),
        ('History, global', f'{len(hi["frames"])} monthly means', sum(gz(f['compressedFile']) for f in hi['frames']), 'dust'),
        ('History, Europe', f'{sum(1 for f in ehi["frames"] if f)} monthly means', sum(gz(f['compressedFile']) for f in ehi['frames'] if f), 'dust'),
    ]
    total = sum(s[2] for s in sets)
    mx = max(s[2] for s in sets)
    rows = []
    for name, note, b, fid in sets:
        mb = b / 1e6
        rows.append(f'<div class="hb"><span class="hb-l">{esc(name)}<small>{esc(note)}</small></span>'
                    f'<span class="hb-t"><i style="width:{100 * b / mx:.1f}%;background:{INK[fid]}"></i></span>'
                    f'<span class="hb-v">{mb:,.1f} MB</span></div>')
    FIGS['sizes'] = '<div class="hbars">' + ''.join(rows) + f'<p class="hb-total">{total / 1e6:,.0f} MB compressed in all. The first picture only needs the {sets[0][2] / 1e6:.1f} MB global snapshot. The frames load once it’s on screen.</p></div>'
    return total, sets

# ---------- lattice: lat-lon grid vs Fibonacci sphere -----------------------------------------------------
def lattice():
    tilt = math.radians(28)
    def project(lat, lon, lon0=20):
        la, lo = math.radians(lat), math.radians(lon - lon0)
        x = math.cos(la) * math.sin(lo)
        y = math.cos(tilt) * math.sin(la) - math.sin(tilt) * math.cos(la) * math.cos(lo)
        z = math.sin(tilt) * math.sin(la) + math.cos(tilt) * math.cos(la) * math.cos(lo)
        return x, y, z
    def sphere(cx, pts, r=120, dot=2.6):
        out = [f'<circle class="sph" cx="{cx}" cy="150" r="{r}"/>']
        for lat, lon in pts:
            x, y, z = project(lat, lon)
            if z <= 0.02:
                continue
            s = dot * (0.35 + 0.65 * z)
            out.append(f'<circle class="ld" cx="{cx + x * r:.1f}" cy="{150 - y * r:.1f}" r="{s:.2f}"/>')
        return ''.join(out)
    n = 900
    grid = [(-90 + (i + .5) * 180 / 30, -180 + j * 12) for i in range(30) for j in range(30)]
    g = math.pi * (3 - math.sqrt(5))
    fib = []
    for i in range(n):
        y = 1 - 2 * (i + .5) / n
        fib.append((math.degrees(math.asin(y)), ((math.degrees(i * g) + 180) % 360) - 180))
    body = sphere(150, grid) + sphere(450, fib)
    body += t(150, 300, 'Latitude and longitude grid', 'lb', 'middle') + t(150, 318, 'crowds at the poles', 'ax', 'middle')
    body += t(450, 300, 'Fibonacci sphere', 'lb', 'middle') + t(450, 318, 'equal area per dot', 'ax', 'middle')
    # ladder
    from_counts = [16000 * 2 ** i for i in range(7)]
    x0 = 610
    body += t(x0, 22, 'Seven levels', 'lb') + t(880, 22, 'spacing', 'ax', 'end')
    for i, cnt in enumerate(from_counts):
        y = 46 + i * 36
        km = math.sqrt(4 * math.pi / cnt) * 6371
        w = 78 + 112 * i / 6
        body += f'<rect class="lad{" k" if i == 0 else ""}" x="{x0}" y="{y}" width="{w:.0f}" height="22" rx="4"/>'
        body += t(x0 + 10, y + 15, f'{cnt:,}', 'lad-t k' if i == 0 else 'lad-t')
        body += t(880, y + 15, f'{km:.0f} km', 'vl', 'end')
    FIGS['lattice'] = svg(880, 330, body,
                          'Left: 900 points on a latitude-longitude grid bunch up near the pole. Middle: 900 points on a Fibonacci sphere are evenly spaced. Right: the seven lattice levels, from 16,000 dots about 178 km apart to 1,024,000 dots about 22 km apart.',
                          'chart-svg')

# ---------- radius curve ----------------------------------------------------------------------------------
def radius():
    L, T, pw, ph = 60, 20, 340, 240
    X = lambda v: L + pw * v
    Y = lambda r: T + ph * (1 - r / 0.6)
    body = []
    for v in (0, .25, .5, .75, 1):
        body.append(f'<path class="g" d="M{X(v):.1f} {T}V{T + ph}"/>' + t(X(v), T + ph + 20, f'{v:g}', 'ax', 'middle'))
    for r in (0, .2, .4, .56):
        body.append(f'<path class="g" d="M{L} {Y(r):.1f}H{L + pw}"/>' + t(L - 10, Y(r) + 4, f'{r:g}', 'ax', 'end'))
    lin = ' '.join(f'{"M" if i == 0 else "L"}{X(i / 100):.1f} {Y(.56 * i / 100):.1f}' for i in range(101))
    sq = ' '.join(f'{"M" if i == 0 else "L"}{X(i / 100):.1f} {Y(.56 * math.sqrt(i / 100)):.1f}' for i in range(101))
    body.append(f'<path d="{lin}" class="c-dash"/>')
    body.append(f'<path d="{sq}" fill="none" stroke="{INK["pm2_5"]}" stroke-width="2.25"/>')
    body.append(t(X(.62), Y(.56 * .62) + 22, 'radius ∝ value', 'ax'))
    body.append(t(X(.42), Y(.56 * math.sqrt(.42)) - 14, 'area ∝ value', 'lb', 'end'))
    body.append(t(L + pw / 2, T + ph + 44, 'value ÷ range', 'ax', 'middle'))
    body.append(t(20, T + ph / 2, 'radius', 'ax', 'middle', f' transform="rotate(-90 20 {T + ph / 2})"'))
    # dot row on a dark plate
    px, py, pwid, phgt = 450, 20, 430, 240
    body.append(f'<rect class="plate-r" x="{px}" y="{py}" width="{pwid}" height="{phgt}" rx="12"/>')
    vals = [.02, .1, .25, .5, 1]
    sp = 70
    for i, v in enumerate(vals):
        cx = px + 75 + i * 70; cy = py + 110
        rr = .56 * math.sqrt(v) * sp
        body.append(f'<circle cx="{cx}" cy="{cy}" r="{sp / 2:.1f}" class="cell"/>')
        body.append(f'<circle cx="{cx}" cy="{cy}" r="{rr:.2f}" fill="{INK["pm2_5"]}"/>')
        body.append(t(cx, py + 190, f'{v * 100:g}', 'pt', 'middle'))
    body.append(t(px + pwid / 2, py + 216, 'µg/m³ of PM2.5 (range 100)', 'pa', 'middle'))
    body.append(t(px + 24, py + 34, 'One lattice cell each', 'pa'))
    FIGS['radius'] = svg(880, 310, ''.join(body),
                         'Dot radius is 0.56 times the square root of value over range, so dot area grows in step with the value. Five example dots for 2, 10, 25, 50 and 100 µg/m³ of PM2.5.',
                         'chart-svg')

# ---------- plate offsets ---------------------------------------------------------------------------------
def offsets():
    golden = math.pi * (3 - math.sqrt(5))
    ids = ORDER  # the 15 global fields, in catalogue order
    cx, cy, unit = 190, 160, 230
    body = ['<rect class="plate-r" x="0" y="0" width="380" height="320" rx="12"/>',
            f'<circle class="cell" cx="{cx}" cy="{cy}" r="{unit / 2}"/>',
            f'<circle cx="{cx}" cy="{cy}" r="{0.26 * unit:.1f}" class="cell-o"/>',
            f'<circle cx="{cx}" cy="{cy}" r="2" class="cell-c"/>']
    for k, fid in enumerate(ids):
        a = math.pi / 2 + golden * k
        x, y = cx + 0.26 * unit * math.cos(a), cy - 0.26 * unit * math.sin(a)
        body.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7" fill="{INK[fid]}"><title>{esc(SHORT[fid])}</title></circle>')
    body.append(t(20, 300, 'One lattice cell. Ring: 0.26 from the centre', 'pa'))
    x0 = 430
    body.append(t(x0, 18, 'Plate', 'ax') + t(x0 + 180, 18, 'angle', 'ax', 'end'))
    body.append(t(x0 + 240, 18, 'Plate', 'ax') + t(x0 + 420, 18, 'angle', 'ax', 'end'))
    for k, fid in enumerate(ids):
        col, row = divmod(k, 8)
        x = x0 + col * 240; y = 48 + row * 34
        deg = (90 + math.degrees(golden) * k) % 360
        body.append(f'<circle cx="{x + 6}" cy="{y - 4}" r="6" fill="{INK[fid]}"/>')
        body.append(t(x + 20, y, f'{k}  {SHORT[fid]}', 'lb') + t(x + 180, y, f'{deg:.0f}°', 'vl', 'end'))
    FIGS['offsets'] = svg(880, 320, ''.join(body),
                          'The 15 global plates inside one lattice cell. Each sits 0.26 lattice units from the centre, at 90 degrees plus 137.5 degrees times its catalogue index.',
                          'chart-svg')

# ---------- tests -----------------------------------------------------------------------------------------
TEST_AREAS = [('Data', INK['nitrogen_dioxide'], ['airFrames', 'airProbe', 'fieldStats', 'nativeAsset', 'globalAir', 'nativeAir', 'weather']),
              ('Drawing', INK['dust'], ['paintLayers', 'sphereSampling', 'sunPosition', 'cameraTransition']),
              ('Interface', '#a9bccc', ['embedParams', 'readoutPref', 'settingsPref', 'places', 'placeName', 'userLocation', 'release-notes', 'stats']),
              ('Cards', '#e3c76a', ['cards-collection', 'cards-deck', 'cards-recovery', 'cards-format', 'cards-share', 'cards-params', 'cards-sets'])]
def tests():
    counts = {}
    for name in os.listdir(os.path.join(APP, 'tests')):
        if name.endswith('.test.js'):
            src = open(os.path.join(APP, 'tests', name), encoding='utf-8').read()
            counts[name[:-8]] = len(re.findall(r'\btest\(', src))
    listed = {f for _, _, fs in TEST_AREAS for f in fs}
    missing = set(counts) - listed
    assert not missing, missing
    total = sum(counts.values())
    L, Wd, row = 110, 880, 52
    mx = max(sum(counts[f] for f in fs) for _, _, fs in TEST_AREAS)
    scale = (Wd - L - 60) / mx
    body = []
    for i, (area, c, fs) in enumerate(TEST_AREAS):
        y = 10 + i * row
        body.append(t(L - 16, y + 22, area, 'lb', 'end'))
        x = L
        for f in sorted(fs, key=lambda f: -counts[f]):
            w = counts[f] * scale
            body.append(f'<rect x="{x:.1f}" y="{y + 8}" width="{max(w - 2, 1):.1f}" height="20" rx="3" fill="{c}"><title>{f}.test.js: {counts[f]}</title></rect>')
            if w > len(f) * 6.9 + 14:
                body.append(t(x + 8, y + 22, f, 'tm-in'))
            x += w
        body.append(t(x + 8, y + 22, sum(counts[f] for f in fs), 'vl'))
    FIGS['tests'] = svg(Wd, 10 + row * len(TEST_AREAS), ''.join(body),
                        f'{total} tests in {len(counts)} files: data, drawing, interface and cards. Cards has the most.', 'chart-svg')
    return total, len(counts)

# ---------- commits ---------------------------------------------------------------------------------------
AREAS = [('cards', 'Cards', '#e3c76a'), ('data', 'Data', INK['nitrogen_dioxide']), ('draw', 'Drawing', INK['dust']), ('product', 'Product', '#a9bccc')]
def area_of(msg):
    m = msg.lower()
    if 'merge pull request' in m or 'card' in m or 'deck' in m or 'share' in m or "what's new" in m or 'collect' in m or 'review' in m:
        return 'cards'
    if any(k in m for k in ('data', 'refresh', 'history', 'snapshot', 'nan', 'frames', 'month at a time', 'pm10 and co')):
        return 'data'
    if m == 'update site source' or 'halftone' in m or 'oklab' in m or 'dot' in m or 'save air pollution' in m:
        return 'draw'
    return 'product'

def commits():
    log = subprocess.run(['git', '-C', APP, 'log', '--reverse', '--format=%aI\t%s'], capture_output=True, text=True, check=True).stdout.strip().split('\n')
    rows = []
    for line in log:
        iso, msg = line.split('\t', 1)
        d = dt.datetime.fromisoformat(iso)
        rows.append((d, msg, area_of(msg)))
    day0 = dt.date(2026, 10, 8)
    days = [(day0 + dt.timedelta(days=i)) for i in range(11)]
    L, Wd, B = 20, 880, 40
    col = (Wd - L * 2) / len(days)
    stacks = {d: [] for d in days}
    for d, msg, a in rows:
        stacks[d.date()].append((a, msg))
    order = {k: i for i, (k, _, _) in enumerate(AREAS)}
    sq, gap = 14, 3
    tallest = max(len(v) for v in stacks.values())
    Hd = 40 + tallest * (sq + gap) + B
    body = []
    for i, (k, name, c) in enumerate(AREAS):
        body.append(f'<rect x="{L + i * 110}" y="4" width="11" height="11" rx="2" fill="{c}"/>' + t(L + 17 + i * 110, 14, name, 'lb'))
    base = Hd - B
    for i, d in enumerate(days):
        cx = L + col * i + col / 2
        items = sorted(stacks[d], key=lambda x: order[x[0]])
        for j, (a, msg) in enumerate(items):
            c = dict((k, cc) for k, _, cc in AREAS)[a]
            body.append(f'<rect x="{cx - sq / 2:.1f}" y="{base - (j + 1) * (sq + gap):.1f}" width="{sq}" height="{sq}" rx="2" fill="{c}"><title>{esc(msg)}</title></rect>')
        body.append(t(cx, base + 18, d.strftime('%-d Oct'), 'ax', 'middle'))
        if items:
            body.append(t(cx, base - len(items) * (sq + gap) - 8, len(items), 'vl', 'middle'))
    FIGS['commits'] = svg(Wd, Hd, ''.join(body),
                          f'{len(rows)} commits from 8 to 18 October 2026, stacked by day and coloured by area: drawing, data, product and cards.',
                          'chart-svg')
    return rows

# ---------- visitors --------------------------------------------------------------------------------------
def visitors():
    s = jload(MEDIA, 'stats.json')
    daily = [d for d in s['daily'] if d['day'] <= '2026-10-19']
    mx = max(d['visitors'] for d in daily)
    L, Wd, Hd, T, B = 30, 880, 220, 30, 34
    col = (Wd - L - 10) / len(daily)
    Y = lambda v: T + (Hd - T - B) * (1 - v / mx)
    body = []
    for i, d in enumerate(daily):
        x = L + i * col + col * .2
        body.append(f'<rect x="{x:.1f}" y="{Y(d["visitors"]):.1f}" width="{col * .6:.1f}" height="{Hd - B - Y(d["visitors"]):.1f}" rx="3" class="vbar"/>')
        body.append(t(x + col * .3, Y(d['visitors']) - 8, d['visitors'], 'vl', 'middle'))
        day = dt.date.fromisoformat(d['day'])
        body.append(t(x + col * .3, Hd - 12, day.strftime('%-d Oct'), 'ax', 'middle'))
    FIGS['visits'] = svg(Wd, Hd, ''.join(body), 'Visitors per day from 11 to 19 October 2026: 64 on the first day, then between 4 and 27 a day.', 'chart-svg')

    def bars(items, mx, key=None):
        out = []
        for name, v in items:
            k = ' class="k"' if name == key else ''
            out.append(f'<div class="hb"><span class="hb-l">{esc(name)}</span><span class="hb-t"><i style="width:{100 * v / mx:.1f}%"{k}></i></span><span class="hb-v">{v}</span></div>')
        return ''.join(out)
    ref = {}
    for r in s['breakdowns']:
        if r['dimension'] != 'Referrers':
            continue
        n = r['name']
        n = 'Reddit' if 'reddit' in n else 'Instagram' if 'instagram' in n else 'LinkedIn' if 'linkedin' in n else 'Direct or unknown' if n.startswith('Direct') else 'Google' if n == 'Google' else 'Own pages and links'
        ref[n] = ref.get(n, 0) + r['visitors']
    ref = sorted(ref.items(), key=lambda kv: -kv[1])
    acts = {r['name']: r['visitors'] for r in s['actions']}
    used = [('Tapped the globe for a reading', acts.get('Tapped the globe for a reading', 0)),
            ('Played the 48-hour forecast', acts.get('Played the 48-hour forecast', 0)),
            ('Opened the monthly history', acts.get('Opened History', 0)),
            ('Found a card', sum(v for k, v in acts.items() if k.startswith('card-found/'))),
            ('Searched a place', sum(r['visitors'] for r in s['actions'] if r['group'] == 'Places searched'))]
    screens = {r['name']: r['visitors'] for r in s['breakdowns'] if r['dimension'] == 'Screens'}
    FIGS['sources'] = ('<div class="bars2"><div><h3>Where visitors came from</h3>' + bars(ref, ref[0][1], 'Reddit') +
                       '</div><div><h3>What they did</h3>' + bars(used, used[0][1]) + '</div></div>')
    return s, screens, acts

# ---------- cards -----------------------------------------------------------------------------------------
RARITY = {'common': ('Every year', '#8e9a84', 1), 'uncommon': ('Every few years', '#a9bccc', 2), 'rare': ('Once in decades', '#e3c76a', 3)}
MONTHS = 'January February March April May June July August September October November December'.split()
def month_label(months):
    ms = [(int(m[:4]), int(m[5:])) for m in months]
    if len(ms) > 1 and all(mo == ms[0][1] for _, mo in ms):
        return f'Every {MONTHS[ms[0][1] - 1]}'
    y, mo = ms[0]
    return f'{MONTHS[mo - 1]} {y}'

def fmt_area(v):
    return f'{v / 1e6:.1f}M' if v >= 1e6 else f'{v / 1e3:.0f}k'

def cards():
    deck = {c['id']: c for c in jload(APP, 'src', 'cards', 'deck.json')}
    pick = ['canada-2023', 'indonesia-2026', 'north-india-november']
    out = []
    for cid in pick:
        c = deck[cid]
        shutil.copy(os.path.join(APP, 'public', 'cards', f'{cid}.svg'), os.path.join(MEDIA, 'cards', f'{cid}.svg'))
        name, colour, level = RARITY[c['rarity']]
        dots = ''.join(f'<i style="width:{s}px;height:{s}px;background:{"currentColor" if i < level else "transparent"}"></i>' for i, s in enumerate((4, 6, 8)))
        st = c['stats']; unit = st['peak']['unit']
        stats = (f'<div><dt>Peak</dt><dd>{st["peak"]["value"]:,.0f}<small>{esc(unit)}</small></dd></div>'
                 f'<div><dt>× WHO</dt><dd>{st["whoX"]["value"]:.1f}×</dd></div>'
                 f'<div><dt>Area</dt><dd>{fmt_area(st["areaKm2"]["value"])}<small>km²</small></dd></div>'
                 f'<div><dt>Reach</dt><dd>{st["reachKm"]["value"]:,}<small>km</small></dd></div>')
        paras = ''.join(f'<p class="cd-para">{esc(p)}</p>' for p in c['back'])
        helps = f'<div class="cd-blamed"><p>What helps</p><p>{esc(c["helps"]["text"])}</p></div>' if c.get('helps') else ''
        front = (f'<div class="cd-face cd-front"><img class="cd-art" src="media/cards/{cid}.svg" alt="" loading="lazy" width="300" height="460"><div class="cd-fade"></div>'
                 f'<div class="cd-pills"><span>{esc(c["type"])}</span><span class="cd-rarity">{name} <span class="cd-dots">{dots}</span></span></div>'
                 f'<div class="cd-text"><p class="cd-month">{month_label(c["months"])}</p><p class="cd-title">{esc(c["name"])}</p><dl class="cd-stats">{stats}</dl></div></div>')
        back = (f'<div class="cd-face cd-back"><div class="cd-strip"><img src="media/cards/{cid}.svg" alt="" loading="lazy"></div><div class="cd-body">'
                f'<p class="cd-month">{month_label(c["months"])} · {esc(c["region"])}</p><p class="cd-title">{esc(c["name"])}</p>{paras}'
                f'<div class="cd-blamed"><p>Often blamed: {esc(c["blamed"])}</p><p>{esc(c["actual"])}</p></div>{helps}'
                f'<p class="cd-sources">{esc(" · ".join(c["sources"]))}</p><p class="cd-foot"><span>{c["number"]:02d} / {len(deck)}</span><span>Full dot at {c["scale"]} µg/m³</span></p></div></div>')
        label = f'{c["name"]}, {c["type"].lower()}, {name.lower()}. Peak {st["peak"]["value"]:,.0f} {unit}, {st["whoX"]["value"]:.1f} times the WHO daily guideline. Press to turn it over.'
        out.append(f'<button type="button" class="cd" style="--rarity:{colour}" aria-label="{esc(label)}" aria-pressed="false"><span class="cd-inner"><span class="cd-turn">{front}{back}</span></span><span class="cd-ring"></span></button>')
    FIGS['cards'] = '<div class="cd-row">' + ''.join(out) + '</div>'
    counts = {}
    for c in deck.values():
        counts[c['rarity']] = counts.get(c['rarity'], 0) + 1
    return deck, counts

# ---------- manifest card ---------------------------------------------------------------------------------
def manifest():
    m = META
    lines = [
        ('domain', m['domain']), ('source', m['source'].replace('https://openmeteo.s3.amazonaws.com/', 's3://openmeteo/')),
        ('validAt', SNAP_AT.strftime('%Y-%m-%dT%H:%MZ')), ('grid', f'{m["grid"]["width"]} × {m["grid"]["height"]}, {m["grid"]["step"]}°'),
        ('fieldOrder', f'{len(m["fieldOrder"])} fields, pm2_5 … nitrogen_monoxide'), ('encoding', m['encoding']),
        ('byteLength', f'{m["byteLength"]:,}'), ('sha256', m['sha256'][:16] + '…'),
        ('missing', ', '.join(f'{k} {v}' for k, v in m['missing'].items()) + ' cells'),
    ]
    rows = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in lines)
    FIGS['manifest'] = f'<dl class="mf">{rows}</dl>'

def inject():
    p = os.path.join(PAGE, 'index.html')
    s = open(p, encoding='utf-8').read()
    for k, v in FIGS.items():
        pat = re.compile(rf'(<!--fig:{k}-->)(.*?)(<!--/fig:{k}-->)', re.S)
        if not pat.search(s):
            print('  no marker for', k); continue
        s = pat.sub(lambda mm: mm.group(1) + v + mm.group(3), s)
    open(p, 'w', encoding='utf-8').write(s)

if __name__ == '__main__':
    plates(); strip()
    v = hexdump()
    pts = delhi()
    cvs = cv()
    agreement(); combustion()
    total, sets = sizes()
    lattice(); radius(); offsets()
    nt, nf = tests()
    rows = commits()
    s, screens, acts = visitors()
    deck, counts = cards()
    manifest()
    inject()
    print('snapshot', SNAP_AT, 'Delhi pm2.5', round(v, 1))
    print('delhi', [(m.strftime('%Y-%m'), round(x)) for m, x in pts if m.month in (11, 12, 1)])
    print('cv', {k: round(x, 2) for k, x in cvs.items()})
    print('sizes MB', round(total / 1e6, 1), [(n, round(b / 1e6, 1)) for n, _, b, _ in sets])
    print('commits', len(rows), {a: sum(1 for r in rows if r[2] == a) for a, _, _ in AREAS})
    print('screens', screens, 'cards', counts, 'tests', nt, nf)
