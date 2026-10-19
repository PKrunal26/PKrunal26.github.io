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
