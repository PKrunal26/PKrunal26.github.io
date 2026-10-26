"""Draw the IIT Guwahati campus map for the OneStop page from OpenStreetMap data.

Inputs are OSM API extracts saved in one folder (not committed, about 7 MB):

  campus.osm      api/0.6/map?bbox=91.676,26.165,91.712,26.200
  east.osm        api/0.6/map?bbox=91.712,26.172,91.730,26.200   (the road to the ferry ghat)
  rel9616556.osm  api/0.6/relation/9616556/full                  (Brahmaputra, water=river)
  rel9616555.osm  api/0.6/relation/9616555/full

Writes scripts/data/onestop-campus.svg, an inline SVG that onestop-page.py drops into the Campus section.
Of the three north-bank ferry ghats only Majgaon is named in OSM, so Rajaduar and Madhyamkhanda get a pointer
to the east instead of a pin. Colours come from CSS classes on the page (.cmap ...), so it follows light and dark.
Distances are straight lines between OSM features, in km.

Run from design-playground/:  python3 scripts/onestop-campus.py <folder>
Map data © OpenStreetMap contributors (ODbL).
"""
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'scripts' / 'data' / 'onestop-campus.svg'

LON0, LON1, LAT0, LAT1 = 91.6835, 91.7255, 26.1805, 26.2010
W = 960
KX = 111.320 * math.cos(math.radians((LAT0 + LAT1) / 2))  # km per degree of longitude
KY = 110.574
H = round(W * (LAT1 - LAT0) * KY / ((LON1 - LON0) * KX))
PX = W / ((LON1 - LON0) * KX)  # px per km

HOSTELS = ['Brahmaputra', 'Lohit', 'Manas', 'Dihing', 'Kapili', 'Siang', 'Dibang', 'Disang', 'Kameng', 'Barak', 'Umiam', 'Subansiri', 'Gaurang']
ACADEMIC = ['Academic Complex', 'Core 5', 'Lecture Halls', 'Administrative Block', 'Mechnical Workshop', 'Conference Hall', 'Bhupen Hazarika Auditorium']


def xy(lat, lon):
    return ((lon - LON0) * KX * PX, (LAT1 - lat) * KY * PX)


def km(a, b):
    return math.hypot((a[1] - b[1]) * KX, (a[0] - b[0]) * KY)


def load(folder):
    nodes, ways, rels = {}, {}, {}
    for f in sorted(Path(folder).glob('*.osm')):
        r = ET.parse(f).getroot()
        for n in r.iter('node'):
            nodes[n.get('id')] = (float(n.get('lat')), float(n.get('lon')))
        for w in r.iter('way'):
            ways[w.get('id')] = ([nd.get('ref') for nd in w.findall('nd')], {t.get('k'): t.get('v') for t in w.findall('tag')})
        for rel in r.iter('relation'):
            rels[rel.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in rel.findall('member')], {t.get('k'): t.get('v') for t in rel.findall('tag')})
    return nodes, ways, rels


def clip(poly, x0, y0, x1, y1):
    """Sutherland–Hodgman against a rectangle."""
    def edge(pts, inside, cut):
        out = []
        for i, p in enumerate(pts):
            q = pts[i - 1]
            if inside(p):
                if not inside(q):
                    out.append(cut(q, p))
                out.append(p)
            elif inside(q):
                out.append(cut(q, p))
        return out

    def at_x(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))

    def at_y(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)

    for inside, cut in ((lambda p: p[0] >= x0, at_x(x0)), (lambda p: p[0] <= x1, at_x(x1)),
                        (lambda p: p[1] >= y0, at_y(y0)), (lambda p: p[1] <= y1, at_y(y1))):
        poly = edge(poly, inside, cut)
        if not poly:
            break
    return poly


def rings(member_ways, ways):
    """Join a multipolygon's member ways end to end into closed rings."""
    segs = [list(ways[w][0]) for w in member_ways if w in ways]
    out = []
    while segs:
        ring = segs.pop(0)
        grew = True
        while ring[0] != ring[-1] and grew:
            grew = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[::-1][1:]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[::-1][:-1] + ring
                else:
                    continue
                segs.pop(i)
                grew = True
                break
        if ring[0] == ring[-1]:
            out.append(ring)
    return out


def path(pts, close=True):
    keep, last = [], None
    for p in pts:
        if last is None or abs(p[0] - last[0]) + abs(p[1] - last[1]) > 0.7:
            keep.append(p)
            last = p
    if len(keep) < 2:
        return ''
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in keep)
    return d + ('Z' if close else '')


def centroid(ids, nodes):
    pts = [nodes[i] for i in ids if i in nodes]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def main(folder):
    nodes, ways, rels = load(folder)
    pad = 40
    box = (-pad, -pad, W + pad, H + pad)
    svg = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Map of the IIT Guwahati campus: hostels to the east, the academic complex to the west, and the ferry ghat on the Brahmaputra" style="overflow:hidden">']

    # river
    river = []
    for rid in ('9616556', '9616555'):
        if rid not in rels:
            continue
        members, _ = rels[rid]
        for role in ('outer', 'inner'):
            for ring in rings([ref for t, ref, r in members if t == 'way' and r == role], ways):
                pts = clip([xy(*nodes[i]) for i in ring if i in nodes], *box)
                if len(pts) > 2:
                    river.append(path(pts))
    if river:
        svg.append(f'<path class="river" fill-rule="evenodd" d="{" ".join(river)}"/>')

    # lakes and ponds
    for ids, t in ways.values():
        if t.get('natural') == 'water' and t.get('water') != 'river' and ids[0] == ids[-1]:
            pts = clip([xy(*nodes[i]) for i in ids if i in nodes], *box)
            if len(pts) > 2:
                svg.append(f'<path class="water" d="{path(pts)}"/>')

    # roads, minor first
    minor, major = [], []
    for ids, t in ways.values():
        hw = t.get('highway')
        if hw in ('primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service', 'living_street'):
            pts = [xy(*nodes[i]) for i in ids if i in nodes]
            if any(-pad < x < W + pad and -pad < y < H + pad for x, y in pts):
                (major if hw in ('primary', 'secondary', 'tertiary') else minor).append(path(pts, False))
    svg.append(f'<path class="road" stroke-width="2.2" d="{" ".join(minor)}"/>')
    svg.append(f'<path class="road major" stroke-width="4" d="{" ".join(major)}"/>')

    # buildings
    named = {}
    for ids, t in ways.values():
        if 'building' not in t or ids[0] != ids[-1]:
            continue
        name = t.get('name', '')
        short = name.replace(' Hostel', '')
        cls = 'bld hostel' if short in HOSTELS else 'bld core' if name in ACADEMIC else 'bld'
        pts = clip([xy(*nodes[i]) for i in ids if i in nodes], *box)
        if len(pts) > 2:
            svg.append(f'<path class="{cls}" d="{path(pts)}"/>')
        if name:
            named[name] = centroid(ids, nodes)
    for ids, t in ways.values():
        if t.get('name') and t.get('name') not in named:
            named[t['name']] = centroid(ids, nodes)
    for nid, (lat, lon) in nodes.items():
        pass
    node_names = {}
    for f in sorted(Path(folder).glob('*.osm')):
        for n in ET.parse(f).getroot().iter('node'):
            for tg in n.findall('tag'):
                if tg.get('k') == 'name':
                    node_names[tg.get('v')] = (float(n.get('lat')), float(n.get('lon')))
    for k, v in node_names.items():
        named.setdefault(k, v)

    # distances: farthest-east hostel to the academic complex, and the academic complex to the ferry ghat
    core = named['Academic Complex']
    ghat = named['Mazgaon Ferry Ghat']
    hostel = named['Kameng Hostel']
    bus = named['IIT to PB firststop']
    lines = [(hostel, core, 'walk'), (core, ghat, 'walk')]
    for a, b, _ in lines:
        (x1, y1), (x2, y2) = xy(*a), xy(*b)
        svg.append(f'<path class="walk" d="M{x1:.1f} {y1:.1f} L{x2:.1f} {y2:.1f}"/>')
    # each label runs along its line, just below it, where the map is quiet
    for (a, b, _), t in zip(lines, (0.8, 0.5)):
        (x1, y1), (x2, y2) = xy(*a), xy(*b)
        ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
        if ang > 90 or ang < -90:
            ang -= 180 if ang > 0 else -180
        px, py = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t
        nx, ny = -math.sin(math.radians(ang)), math.cos(math.radians(ang))
        svg.append(f'<text class="km" transform="translate({px + nx * 14:.1f} {py + ny * 14:.1f}) rotate({ang:.1f})" text-anchor="middle">{km(a, b):.1f} km</text>')

    # labels
    def label(name, text, cls='lbl', dx=0, dy=0, anchor='middle', dot=False):
        if name not in named:
            print('missing', name)
            return
        x, y = xy(*named[name])
        if dot:
            svg.append(f'<circle class="dot" cx="{x:.1f}" cy="{y:.1f}" r="4"/>')
        svg.append(f'<text class="{cls}" x="{x + dx:.1f}" y="{y + dy:.1f}" text-anchor="{anchor}">{text}</text>')

    # label offsets that keep the hostel cluster readable
    nudge = {'Kapili': (-14, 4, 'end'), 'Dibang': (-16, 4, 'end'), 'Disang': (-16, 4, 'end'), 'Siang': (-8, -12, 'end'),
             'Dihing': (0, 22, 'middle'), 'Manas': (16, 4, 'start'), 'Barak': (16, 4, 'start'), 'Umiam': (18, 10, 'start'),
             'Kameng': (16, 0, 'start'), 'Lohit': (0, -12, 'middle'), 'Brahmaputra': (14, 40, 'middle'), 'Gaurang': (14, 0, 'start')}
    for h in HOSTELS:
        dx, dy, anchor = nudge.get(h, (0, -10, 'middle'))
        label(h + ' Hostel', h, 'lbl a', dx, dy, anchor)
    label('Academic Complex', 'Academic complex', 'lbl y', 0, 30)
    label('Core 5', 'Core 5', 'lbl y', 0, -12)
    label('Lecture Halls', 'Lecture halls', 'lbl s', -6, -12, 'end')
    label('IITG lake', 'Lake', 'lbl s', 0, 4)
    label('Food Court', 'Food court', 'lbl s', 0, 18)
    label('IITG Hospital', 'Hospital', 'lbl s', 10, 4, 'start', True)
    label('Mazgaon Ferry Ghat', 'Majgaon ghat', 'lbl', 0, 22, 'middle', True)
    gx, gy = xy(*named['Mazgaon Ferry Ghat'])
    svg.append(f'<text class="lbl s" x="{W - 14}" y="{gy + 44:.1f}" text-anchor="end">Rajaduar and Madhyamkhanda ghats, further east →</text>')
    label('IIT to PB firststop', 'Bus to the city', 'lbl', 10, 4, 'start', True)
    if river:
        svg.append(f'<text class="lbl s" x="{W - 24}" y="{H - 18}" text-anchor="end" style="font-style:italic">Brahmaputra</text>')
    # scale bar
    svg.append(f'<path class="walk" style="stroke-dasharray:none;stroke-width:2" d="M{W - 24 - PX:.1f} 28 H{W - 24}"/><text class="lbl s" x="{W - 24}" y="20" text-anchor="end">1 km</text>')
    svg.append('</svg>')
    OUT.write_text('\n'.join(svg))
    print(OUT.relative_to(ROOT), f'{W}x{H}', 'hostel→core', f'{km(hostel, core):.2f}', 'core→ghat', f'{km(core, ghat):.2f}', 'bus→core', f'{km(bus, core):.2f}')


if __name__ == '__main__':
    main(sys.argv[1])
