"""Generate the Escher case-study illustrations as inline SVG and inject them into index.html at <!--ill:name--> markers."""
import math, re, sys

PAGE = sys.argv[1]

def win(x, y, w, h, rot, body, shadow=True):
    s = f'<g transform="translate({x} {y}) rotate({rot} {w/2} {h/2})">'
    if shadow:
        s += f'<rect x="7" y="7" width="{w}" height="{h}" rx="8" fill="url(#d25)"/>'
    s += f'<rect class="i-paper i-ink" width="{w}" height="{h}" rx="8"/>'
    s += f'<path class="i-ink" d="M0 18H{w}"/><circle class="i-dot" cx="10" cy="9" r="2.2"/><circle class="i-dot" cx="18" cy="9" r="2.2"/>'
    s += body + '</g>'
    return s

def bars(w, h, red=1):
    out, n = '', 5
    bw = (w - 28) / n
    hs = [0.35, 0.6, 0.45, 0.85, 0.55]
    for i, k in enumerate(hs):
        bh = (h - 34) * k
        fill = 'url(#r50)' if i == red else 'url(#d50)'
        out += f'<rect x="{14 + i*bw:.1f}" y="{h-10-bh:.1f}" width="{bw-6:.1f}" height="{bh:.1f}" fill="{fill}"/>'
    return out

def lines(w, h, n=4, start=30, gap=12, red=None):
    out = ''
    for i in range(n):
        ww = w - 28 - (i % 3) * 18
        cls = 'i-red' if red == i else 'i-ink'
        out += f'<path class="{cls}" d="M14 {start + i*gap}H{14+ww}"/>'
    return out

def graph(w, h):
    pts = [(14, h-20), (w*.3, h-36), (w*.5, h-28), (w*.7, h-52), (w-14, 32)]
    p = ' '.join(f'{a:.0f},{b:.0f}' for a, b in pts)
    return f'<polyline class="i-ink" points="{p}"/><circle class="i-reddot" cx="{w-14}" cy="32" r="4"/>'

def shield(w, h):
    cx, cy = w/2, h/2 + 8
    return (f'<path class="i-ink" d="M{cx} {cy-26}L{cx+22} {cy-18}V{cy}C{cx+22} {cy+14} {cx} {cy+24} {cx} {cy+24}'
            f'C{cx} {cy+24} {cx-22} {cy+14} {cx-22} {cy}V{cy-18}Z" fill="url(#d25)"/>'
            f'<path class="i-red" d="M{cx} {cy-10}V{cy+4}M{cx} {cy+10}V{cy+11}"/>')

def term(w, h):
    return (f'<text class="i-mono" x="14" y="40">$ aws s3api …</text><text class="i-mono" x="14" y="58">$ terraform plan</text>'
            f'<rect x="14" y="66" width="8" height="12" fill="url(#d50)"/>')

def chat(w, h):
    return (f'<rect class="i-ink" x="14" y="28" width="{w*.55:.0f}" height="20" rx="10" fill="url(#d12)"/>'
            f'<rect class="i-ink" x="{w*.35:.0f}" y="56" width="{w*.55:.0f}" height="20" rx="10"/>')

def bell(w, h):
    cx, cy = w/2, h/2 + 6
    return (f'<path class="i-ink" d="M{cx-16} {cy+12}C{cx-16} {cy-4} {cx-14} {cy-20} {cx} {cy-20}C{cx+14} {cy-20} {cx+16} {cy-4} {cx+16} {cy+12}H{cx-16}Z" fill="url(#d25)"/>'
            f'<path class="i-ink" d="M{cx-21} {cy+12}H{cx+21}M{cx-5} {cy+17}C{cx-4} {cy+22} {cx+4} {cy+22} {cx+5} {cy+17}"/>'
            f'<circle class="i-reddot" cx="{cx+14}" cy="{cy-18}" r="5"/>')

def svg(name, vb, body, label):
    return (f'<figure class="art" data-ill="{name}"><svg viewBox="0 0 {vb[0]} {vb[1]}" role="img" aria-label="{label}">{body}</svg></figure>')

def icon(vb, body, label):
    return f'<svg class="ico" viewBox="0 0 {vb[0]} {vb[1]}" role="img" aria-label="{label}">{body}</svg>'

ILL = {}

# 1. Problem: the tools an engineer juggles, scattered, with a broken trail between them.
b = ''
b += '<path class="i-trail" d="M150 120C230 60 300 210 380 150S520 70 560 150S700 250 760 130"/>'
b += win(40, 50, 170, 120, -6, bars(170, 120), True)
b += win(250, 150, 150, 110, 4, graph(150, 110))
b += win(330, 20, 150, 100, 3, shield(150, 100))
b += win(470, 130, 180, 100, -3, term(180, 100))
b += win(520, 10, 140, 96, -7, lines(140, 96))
b += win(690, 40, 150, 100, 5, chat(150, 100))
b += win(700, 180, 130, 100, -4, bell(130, 100))
b += '<text class="i-q" x="222" y="132">?</text><text class="i-q" x="455" y="122">?</text><text class="i-q" x="672" y="160">?</text>'
ILL['problem'] = svg('problem', (880, 300), b, 'Seven separate tool windows: cost, performance, security, a terminal, a runbook, chat and alerts, with a broken trail between them.')

# 2. Who it's for: one estate, seven roles around it.
cx, cy = 440, 196
def layer(y, fill):
    d = f'M{cx-120} {y}L{cx} {y-42}L{cx+120} {y}L{cx} {y+42}Z'
    return f'<path class="i-paper" d="{d}"/><path class="i-ink" d="{d}" fill="{fill}"/>'
b = ''
roles = ['SRE', 'Admin', 'SecOps', 'DevOps', 'FinOps', 'Platform', 'Compliance']
pos = []
for i, r in enumerate(roles):
    a = math.pi * (1.0 + i / (len(roles) - 1))
    px, py = cx + 360 * math.cos(a), cy + 150 * math.sin(a) + 10
    pos.append((px, py, r))
for px, py, r in pos:
    b += f'<path class="i-line" d="M{cx} {cy-10}L{px:.0f} {py:.0f}"/>'
b += layer(cy + 34, 'url(#d12)') + layer(cy + 12, 'url(#d25)') + layer(cy - 10, 'url(#r50)')
b += f'<path class="i-paper-s" d="M{cx-120} {cy-10}L{cx} {cy-52}L{cx+120} {cy-10}L{cx} {cy+32}Z"/>'
b += f'<text class="i-cap" x="{cx}" y="{cy+98}" text-anchor="middle">One estate</text>'
for i, (px, py, r) in enumerate(pos):
    w = 14 + len(r) * 8.2
    cls = 'i-tag-key' if i == 0 else 'i-tag'
    tcls = 'i-tag-kt' if i == 0 else 'i-tag-t'
    b += f'<rect class="{cls}" x="{px-w/2:.0f}" y="{py-16:.0f}" width="{w:.0f}" height="32" rx="16"/><text class="{tcls}" x="{px:.0f}" y="{py+5:.0f}" text-anchor="middle">{r}</text>'
ILL['roles'] = svg('roles', (880, 300), b, 'One estate drawn as stacked layers, linked to seven roles: SRE, Admin, SecOps, DevOps, FinOps, Platform and Compliance.')

# 3. Three surfaces (icons, 320x170).
W, H = 320, 170
reactive = (win(40, 40, 110, 96, 0, bell(110, 96), True)
            + '<path class="i-line" d="M150 88H180"/>'
            + win(180, 30, 110, 116, 0, lines(110, 116, 5, 32, 14, red=0), True))
interactive = ('<rect x="46" y="36" width="170" height="36" rx="18" fill="url(#d25)"/><rect class="i-paper i-ink" x="40" y="30" width="170" height="36" rx="18"/><text class="i-small" x="58" y="53">Is prod exposed?</text>'
               '<rect class="i-paper i-ink" x="110" y="78" width="170" height="70" rx="12"/>'
               + ''.join(f'<rect x="{128+i*28}" y="{136-h}" width="18" height="{h}" fill="{"url(#r50)" if i==2 else "url(#d50)"}"/>' for i, h in enumerate([20, 34, 46, 26, 38])))
proactive = ('<circle class="i-line" cx="110" cy="88" r="62"/><circle class="i-line" cx="110" cy="88" r="40"/><circle class="i-line" cx="110" cy="88" r="18"/>'
             '<path d="M110 88L160 50A62 62 0 0 1 172 88Z" fill="url(#d50)"/><circle class="i-reddot" cx="148" cy="68" r="5"/>'
             '<path class="i-ink" d="M160 70L200 54"/>'
             + win(200, 30, 100, 64, 0, lines(100, 64, 2, 32, 14), False)
             + '<text class="i-small" x="214" y="112">Suggested fix</text>')
ILL['s-reactive'] = icon((W, H), reactive, 'An alert arrives with a context card attached.')
ILL['s-interactive'] = icon((W, H), interactive, 'A question bubble answered by a small chart.')
ILL['s-proactive'] = icon((W, H), proactive, 'A radar sweep finds drift and suggests a fix.')

# 4. Principles (icons, 320x170).
grounded = ('<rect class="i-paper i-ink" x="30" y="24" width="170" height="82" rx="12"/>'
            + lines(170, 82, 3, 48, 14).replace('M14', 'M44').replace('H', 'H', 1)
            + '<circle class="i-reddot" cx="186" cy="62" r="8"/><text class="i-badge" x="186" y="66" text-anchor="middle">1</text>'
            '<path class="i-red" d="M186 70V100C186 116 220 118 236 118"/>'
            '<ellipse class="i-paper i-ink" cx="262" cy="104" rx="30" ry="10"/><path class="i-ink" d="M232 104V146C232 152 245 156 262 156S292 152 292 146V104" fill="url(#d25)"/>'
            '<path class="i-ink" d="M232 124C232 130 245 134 262 134S292 130 292 124"/>')
safe = ('<rect class="i-paper i-ink" x="30" y="20" width="180" height="134" rx="10"/>'
        '<text class="i-mono" x="54" y="46">policy = get()</text>'
        '<rect x="40" y="60" width="4" height="14" class="i-fillred"/><text class="i-mono i-redt" x="54" y="71">- grant "*"</text>'
        '<rect x="40" y="82" width="4" height="14" class="i-fillink"/><text class="i-mono" x="54" y="93">+ block_public()</text>'
        '<text class="i-mono" x="54" y="118">verify()</text>'
        + ''.join(f'<rect class="i-paper i-ink" x="232" y="{30+i*40}" width="58" height="30" rx="6"/>' for i in range(3))
        + '<path class="i-ink" d="M248 45L256 52L272 38M248 85L256 92L272 78"/><rect x="238" y="116" width="46" height="18" fill="url(#d25)"/>'
        '<path class="i-line" d="M261 60V70M261 100V110"/>')
trust = ('<rect class="i-ink" x="30" y="110" width="80" height="40" fill="url(#d12)"/><rect class="i-ink" x="120" y="80" width="80" height="70" fill="url(#d25)"/><rect class="i-ink" x="210" y="44" width="80" height="106" fill="url(#d50)"/>'
         '<text class="i-small" x="70" y="102" text-anchor="middle">Draft</text><text class="i-small" x="160" y="72" text-anchor="middle">Shadow</text><text class="i-small" x="250" y="36" text-anchor="middle">Live</text>'
         '<path class="i-red" d="M250 156V164H70V156" stroke-dasharray="3 3"/>')
ILL['p-grounded'] = icon((W, H), grounded, 'A claim with a citation marker linked to a database.')
ILL['p-safe'] = icon((W, H), safe, 'A change shown as a diff, next to a checklist of steps.')
ILL['p-trust'] = icon((W, H), trust, 'Three rising steps: draft, shadow, live, with a dashed line back to the start.')

# 5. Ask: two passes.
b = ''
b += '<text class="i-cap" x="40" y="24">Pass 1 · find the facts</text><text class="i-cap" x="520" y="24">Pass 2 · write them up</text>'
b += '<rect class="i-paper i-ink" x="40" y="40" width="300" height="200" rx="12"/>'
for i in range(6):
    y = 70 + i * 28
    b += f'<path class="i-line" d="M40 {y+14}H340"/><rect x="58" y="{y-6}" width="{40+ (i*37)%90}" height="10" fill="{"url(#r50)" if i in (1,4) else "url(#d25)"}"/>'
b += '<circle class="i-paper i-ink" cx="292" cy="196" r="34" stroke-width="2"/><path class="i-ink" d="M316 220L340 244" stroke-width="4" stroke-linecap="round"/>'
b += '<path class="i-trail-s" d="M200 98C380 98 420 96 560 100M190 182C380 182 420 160 560 158"/>'
b += '<rect class="i-paper i-ink" x="520" y="40" width="320" height="200" rx="12"/>'
b += '<rect x="540" y="60" width="150" height="12" fill="url(#d50)"/>'
b += '<path class="i-ink" d="M540 88H800M540 102H780M540 116H720"/>'
for i, h in enumerate([30, 52, 40, 66, 46]):
    b += f'<rect x="{560+i*30}" y="{220-h}" width="20" height="{h}" fill="{"url(#r50)" if i==3 else "url(#d50)"}"/>'
b += '<path class="i-ink" d="M720 160H820M720 174H800M720 188H810"/>'
b += '<circle class="i-reddot" cx="560" cy="100" r="5"/><circle class="i-reddot" cx="560" cy="158" r="5"/>'
ILL['ask'] = svg('ask', (880, 260), b, 'Pass one scans a table of estate rows with a magnifier. Lines carry two highlighted rows across to pass two, a written report with a chart.')

# 6. Outcome: one codebase, two destinations.
b = ''
b += '<rect x="47" y="87" width="200" height="140" rx="12" fill="url(#d25)"/><rect class="i-paper i-ink" x="40" y="80" width="200" height="140" rx="12"/><text class="i-mono-l" x="70" y="140">&lt;/&gt;</text><text class="i-small" x="70" y="170">One frontend</text>'
b += '<path class="i-ink" d="M240 130C330 130 330 70 420 70M240 170C330 170 330 230 420 230"/>'
# demo screen on a stand
b += '<rect class="i-paper i-ink" x="420" y="20" width="240" height="120" rx="8"/><path class="i-ink" d="M540 140V160M500 160H580"/>'
for i, h in enumerate([30, 48, 38, 70, 56]):
    b += f'<rect x="{444+i*40}" y="{124-h}" width="26" height="{h}" fill="{"url(#r50)" if i==3 else "url(#d50)"}"/>'
b += '<text class="i-cap" x="690" y="76">Demos</text><text class="i-small" x="690" y="96">Customers, investors</text>'
# laptop
b += '<rect class="i-paper i-ink" x="440" y="190" width="200" height="110" rx="8"/><path class="i-ink" d="M410 300H670L654 314H426Z" fill="url(#d25)"/>'
b += '<rect x="452" y="202" width="46" height="86" fill="url(#d12)"/><path class="i-ink" d="M510 214H620M510 228H600M510 242H610"/><circle class="i-reddot" cx="514" cy="268" r="5"/>'
b += '<text class="i-cap" x="690" y="246">Tauri app</text><text class="i-small" x="690" y="266">The shipping product</text>'
ILL['outcome'] = svg('outcome', (880, 330), b, 'One frontend feeds two places: a demo screen for customers and investors, and a laptop running the Tauri app.')

# 7. Lessons (icons).
role = ('<circle class="i-ink" cx="125" cy="80" r="58" fill="url(#d12)"/><circle class="i-ink" cx="195" cy="80" r="58" fill="url(#d25)"/>'
        '<path d="M160 33A58 58 0 0 1 160 127A58 58 0 0 1 160 33Z" fill="url(#r50)"/>'
        '<text class="i-small" x="105" y="164" text-anchor="middle">Design</text><text class="i-small" x="215" y="164" text-anchor="middle">Code</text>')
process = ('<rect class="i-paper i-ink" x="40" y="22" width="240" height="126" rx="10"/>'
           '<path class="i-trail-s" d="M60 60C80 40 100 80 120 58S150 50 160 64"/><rect class="i-ink" x="60" y="80" width="80" height="44" rx="6" stroke-dasharray="4 3"/>'
           '<path class="i-ink" d="M160 100H176"/>'
           '<text class="i-mono" x="184" y="64">&lt;Plan&gt;</text><text class="i-mono" x="196" y="82">steps</text><text class="i-mono" x="184" y="100">&lt;/Plan&gt;</text>'
           '<rect x="184" y="112" width="80" height="16" fill="url(#d50)"/>')
pace = ('<circle class="i-paper i-ink" cx="160" cy="92" r="60"/><path class="i-ink" d="M150 24H170M160 24V32M206 44L214 36"/>'
        '<path d="M160 92V32A60 60 0 0 1 220 92Z" fill="url(#r50)"/><path class="i-ink" d="M160 92L196 60"/><circle class="i-dot" cx="160" cy="92" r="4"/>')
ILL['l-role'] = icon((W, H), role, 'Two overlapping circles, design and code, with the overlap in red.')
ILL['l-process'] = icon((W, H), process, 'A rough sketch on the left of a sheet turns into code on the right.')
ILL['l-pace'] = icon((W, H), pace, 'A stopwatch with a quarter of its face filled.')


# ---------- Backend illustrations ----------
def table(x, y, w, name, rows=3, key=False):
    h = 26 + rows * 14 + 8
    out = f'<rect x="{x+5}" y="{y+5}" width="{w}" height="{h}" rx="8" fill="url(#d25)"/>'
    out += f'<rect class="i-paper i-ink" x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/>'
    out += f'<path d="M{x+1} {y+26}H{x+w-1}" class="i-ink"/>'
    if key:
        out += f'<path class="i-fillink" d="M{x} {y+26}V{y+8}A8 8 0 0 1 {x+8} {y}H{x+w-8}A8 8 0 0 1 {x+w} {y+8}V{y+26}Z"/><rect class="i-fillred" x="{x+12}" y="{y+9}" width="8" height="8" rx="1"/>'
        out += f'<text class="i-mono i-onk" x="{x+28}" y="{y+17}">{name}</text>'
    else:
        out += f'<text class="i-mono" x="{x+12}" y="{y+17}">{name}</text>'
    for i in range(rows):
        ww = w - 24 - (i * 23) % 50
        out += f'<path class="i-line" d="M{x+12} {y+40+i*14}H{x+12+ww}"/>'
    return out, h

# Data model: scans feed resources; resources carry history, edges and embeddings; work objects point at resources.
b = '<text class="i-cap" x="20" y="20">Scans</text><text class="i-cap" x="330" y="20">Estate</text><text class="i-cap" x="700" y="20">Work</text>'
links = ('<path class="i-line" d="M180 60H240M180 120H240M180 180H240M180 240H240M240 60V240M240 200H300"/>'
         '<path class="i-line" d="M400 84V158M565 84V130H470V158M400 248V290M320 338V350M500 228H595V290"/>'
         '<path class="i-line" d="M500 190H650M650 120V280M650 120H690M650 200H690M650 280H690"/>')
b += links
for i, n in enumerate(['scans', 'scan_passes', 'scan_scopes', 'scan_errors']):
    t, _ = table(20, 36 + i * 60, 160, n, 1)
    b += t
t, _ = table(300, 158, 200, 'resources', 4, key=True); b += t
for (x, y, n) in [(330, 40, 'resource_types'), (500, 40, 'resource_edges')]:
    pass
t, _ = table(330, 36, 140, 'resource_types', 1); b += t
t, _ = table(490, 36, 150, 'resource_edges', 1); b += t
t, _ = table(300, 290, 200, 'resource_changes', 1); b += t
t, _ = table(300, 350, 200, 'resource_prescan', 1); b += t
t, _ = table(520, 290, 150, 'embeddings', 1); b += t
for i, n in enumerate(['findings', 'reports', 'alerts']):
    t, _ = table(690, 96 + i * 80, 160, n, 1)
    b += t
ILL['schema'] = svg('schema', (880, 410), b, 'Estate tables. Four scan tables feed a central resources table, which links to resource types, edges, changes, prescan snapshots and embeddings. Findings, reports and alerts point back at resources.')

# Scanning: every type in every region, 12 lanes at once, failures kept and retried.
svcs = ['EC2', 'S3', 'RDS', 'Lambda', 'IAM', 'VPC', 'EKS', 'KMS', 'ELB']
regs = 16
b = ''
cw, ch, gx, gy = 34, 22, 120, 40
for j in range(regs):
    b += f'<text class="i-tiny" x="{gx + j*(cw+6) + cw/2:.0f}" y="{gy-10}" text-anchor="middle">r{j+1}</text>'
for i, sname in enumerate(svcs):
    y = gy + i * (ch + 6)
    b += f'<text class="i-small" x="{gx-14}" y="{y+15}" text-anchor="end">{sname}</text>'
    for j in range(regs):
        x = gx + j * (cw + 6)
        k = (i * 7 + j * 3) % 23
        if (i, j) in [(2, 11), (6, 4)]:
            fill = 'url(#r50)'
        elif i * regs + j > 118:
            fill = 'none'
        elif i * regs + j > 106:
            fill = 'url(#d12)'
        else:
            fill = 'url(#d50)'
        cls = 'i-cell'
        b += f'<rect class="{cls}" x="{x}" y="{y}" width="{cw}" height="{ch}" rx="3" fill="{fill}"/>'
b += f'<path class="i-red" d="M{gx+11*(cw+6)+cw/2} {gy+2*(ch+6)-4}C{gx+11*(cw+6)+cw/2} {gy-2} {gx+12*(cw+6)+10} {gy-2} {gx+12*(cw+6)+10} {gy+2*(ch+6)-6}" stroke-dasharray="3 3"/>'
ly = gy + len(svcs) * (ch + 6) + 26
b += f'<rect x="{gx}" y="{ly-11}" width="14" height="14" rx="2" fill="url(#d50)" class="i-cell"/><text class="i-small" x="{gx+22}" y="{ly}">Scanned</text>'
b += f'<rect x="{gx+110}" y="{ly-11}" width="14" height="14" rx="2" fill="url(#d12)" class="i-cell"/><text class="i-small" x="{gx+132}" y="{ly}">Running, 12 at a time</text>'
b += f'<rect x="{gx+300}" y="{ly-11}" width="14" height="14" rx="2" fill="url(#r50)" class="i-cell"/><text class="i-small" x="{gx+322}" y="{ly}">Failed, recorded, retried</text>'
ILL['scan'] = svg('scan', (880, ly + 14), b, 'A grid of services by regions. Most cells are scanned, a few are running, and two failed cells are marked in red with a retry arrow.')

# Model layer: allowlist, router, two providers, one stream back.
b = ''
def node(x, y, w, h, t, sub=None, key=False):
    cls, tc = ('d-key', 'd-key-t') if key else ('d-node', 'd-t')
    o = f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}" rx="12"/>'
    o += f'<text class="{tc}" x="{x+w/2}" y="{y+(h/2 if not sub else h/2-4)+5}" text-anchor="middle" font-size="15">{t}</text>'
    if sub:
        o += f'<text class="{"d-key-t" if key else "d-s"}" x="{x+w/2}" y="{y+h/2+16}" text-anchor="middle" font-size="12"{" opacity=.7" if key else ""}>{sub}</text>'
    return o
b += node(0, 70, 150, 64, 'Request', 'model id, tools')
b += node(200, 70, 150, 64, 'Allowlist', 'unknown id → 400')
b += node(400, 70, 150, 64, 'Router', None, key=True)
b += node(640, 10, 220, 64, 'Anthropic', 'claude-*, cached prompt')
b += node(640, 130, 220, 64, 'OpenRouter', 'vendor/model')
b += '<path class="d-line" d="M150 102H200M350 102H400M550 102C600 102 590 42 640 42M550 102C600 102 590 162 640 162"/>'
# stream ribbon
sy = 250
b += f'<text class="d-s" x="0" y="{sy-14}">Back to the browser, one stream</text>'
x = 0
seq = ['t','t','t','tool','t','t','t','tool','t','t','t','t','t','usage']
for k in seq:
    w = 46 if k == 't' else 84
    if k == 't':
        b += f'<rect x="{x}" y="{sy}" width="{w}" height="30" rx="4" fill="url(#d25)"/>'
    elif k == 'tool':
        b += f'<rect class="i-fillred" x="{x}" y="{sy}" width="{w}" height="30" rx="4"/><text x="{x+w/2}" y="{sy+19}" text-anchor="middle" class="i-on">tool call</text>'
    else:
        b += f'<rect class="i-fillink" x="{x}" y="{sy}" width="{w}" height="30" rx="4"/><text x="{x+w/2}" y="{sy+19}" text-anchor="middle" class="i-onk">tokens</text>'
    x += w + 6
b += f'<text class="d-s" x="0" y="{sy+54}">Text renders as it arrives. Tool calls run in the browser. The last marker reports token use.</text>'
ILL['model'] = f'<div class="diagram"><svg viewBox="0 0 880 {sy+64}" role="img" aria-label="A request passes an allowlist, then a router sends claude models to Anthropic with a cached prompt and other models to OpenRouter. One stream comes back with text, tool-call markers and a final token-use marker.">{b}</svg></div>'

# Execution: propose, confirm, snapshot, run, verify; rollback restores.
b = ''
steps = [('Propose', 'the model'), ('Confirm', 'a person'), ('Snapshot', 'current state'), ('Run', 'one step'), ('Verify', 're-read it')]
for i, (t, sub) in enumerate(steps):
    x = i * 178
    b += node(x, 30, 150, 70, t, sub, key=(i == 1))
    if i:
        b += f'<path class="d-line" d="M{x-28} 65H{x}"/>'
# person cursor on confirm
b += '<path class="i-ink" d="M250 112L250 136L256 130L261 141L265 139L260 128L268 128Z" fill="url(#d50)"/>'
b += '<path class="d-red" d="M787 100V160H431V100" stroke-dasharray="4 4"/><text class="d-redt" x="609" y="180" text-anchor="middle">Rollback restores the snapshot</text>'
b += '<path class="d-line" d="M609 100V124"/><text class="d-s" x="609" y="140" text-anchor="middle">halt or ask</text>'
b += '<text class="d-s" x="75" y="122" text-anchor="middle">cannot run anything</text>'
ILL['exec'] = f'<div class="diagram"><svg viewBox="0 0 880 196" role="img" aria-label="Five steps: the model proposes, a person confirms, the current state is snapshotted, one step runs, and the result is re-read. A red dashed line shows rollback restoring the snapshot.">{b}</svg></div>'

# Evaluation: a finished turn passes six deterministic graders.
b = '<rect x="7" y="47" width="170" height="150" rx="10" fill="url(#d25)"/><rect class="i-paper i-ink" x="0" y="40" width="170" height="150" rx="10"/>'
b += '<text class="i-small" x="16" y="64">Finished turn</text><path class="i-ink" d="M16 84H150M16 100H130M16 116H140"/>'
for j, hh in enumerate([16, 28, 22, 34]):
    b += f'<rect x="{16+j*22}" y="{176-hh}" width="14" height="{hh}" fill="url(#d50)"/>'
graders = ['grounding', 'citation', 'parse', 'shape', 'absence', 'reachable']
b += '<path class="i-line" d="M170 115H860"/>'
for i, g in enumerate(graders):
    cx = 240 + i * 108
    bad = (i == 0)
    b += f'<circle class="i-paper i-ink" cx="{cx}" cy="115" r="30"/>'
    if bad:
        b += f'<circle cx="{cx}" cy="115" r="30" fill="url(#r25)"/><path class="i-red" d="M{cx-9} 106L{cx+9} 124M{cx+9} 106L{cx-9} 124" stroke-width="2.5"/>'
    else:
        b += f'<path class="i-ink" d="M{cx-10} 115L{cx-3} 122L{cx+11} 107" stroke-width="2"/>'
    b += f'<text class="i-mono" x="{cx}" y="170" text-anchor="middle">{g}</text>'
b += '<text class="i-small" x="212" y="200">A number that isn’t in the tool results fails grounding.</text>'
ILL['eval'] = svg('eval', (880, 210), b, 'A finished turn passes six graders: grounding, citation, parse, shape, absence and reachable. Grounding is marked failed because a number did not appear in the tool results.')

html = open(PAGE).read()
for k, v in ILL.items():
    marker = f'<!--ill:{k}-->'
    pat = re.compile(re.escape(marker) + r'.*?' + re.escape(f'<!--/ill:{k}-->'), re.S)
    block = marker + v + f'<!--/ill:{k}-->'
    if pat.search(html):
        html = pat.sub(lambda m: block, html)
    elif marker in html:
        html = html.replace(marker, block)
    else:
        print('missing marker', k)
open(PAGE, 'w').write(html)
print('ok', len(ILL))
