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





# Choosing the chart: from the data's shape vs from the reader's question.
b = '<text class="i-cap" x="20" y="24">Chosen from the data</text><text class="i-cap" x="470" y="24">Chosen from the question</text>'
b += '<rect class="i-paper i-ink" x="20" y="40" width="390" height="190" rx="12"/>'
for j, lab in enumerate(['RDS', 'DocDB', 'Redshift', 'OAuth', 'SSH', 'Other']):
    b += f'<rect x="{46+j*60}" y="150" width="36" height="40" fill="url(#d50)"/><text class="i-tiny" x="{64+j*60}" y="144" text-anchor="middle">1</text><text class="i-tiny" x="{64+j*60}" y="206" text-anchor="middle">{lab}</text>'
b += '<path class="i-line" d="M36 190H396"/><text class="i-small i-redt" x="36" y="68">Every bar is 1. Nothing is answered.</text>'
b += '<rect class="i-paper i-ink" x="470" y="40" width="390" height="190" rx="12"/>'
b += '<text class="i-small" x="494" y="78">Secrets</text><text class="i-huge" x="494" y="140">1,200</text>'
b += '<rect class="i-fillred" x="494" y="168" width="10" height="10" rx="2"/><text class="i-small" x="512" y="177">0 rotating</text><rect class="i-fillred" x="604" y="168" width="10" height="10" rx="2"/><text class="i-small" x="622" y="177">0 encrypted with KMS</text>'
b += '<text class="i-small" x="494" y="210">One number and two qualifiers.</text>'
ILL['chart'] = svg('chart', (880, 240), b, 'Left: a bar chart where all six bars equal one. Right: the same data as a single number with two qualifiers.')



# Data model: the real tables and columns from packages/estate-store/migrations.
# Click a table to see what it holds and what it links to; wires are drawn by escher.js.
from html import escape as esc
import json

TABLES = {
    'scans': ('One row per scan of an account, with when it started and finished.',
              [('id', 'uuid', 'pk'), ('profile', 'text', ''), ('account_id', 'text', ''), ('started_at', 'timestamptz', ''), ('finished_at', 'timestamptz', '')]),
    'scan_passes': ('Every scan runs three passes: overview, services and extras.',
                    [('scan_id', 'uuid', 'fk'), ('pass', 'text', ''), ('finished_at', 'timestamptz', '')]),
    'scan_scopes': ('Which resource type in which region was scanned, and whether it worked.',
                    [('scan_id', 'uuid', 'fk'), ('region', 'text', ''), ('resource_type', 'text', 'fk'), ('status', 'ok | error', '')]),
    'scan_errors': ('Calls that failed, with the AWS error code, so a gap in the data is never silent.',
                    [('scan_id', 'uuid', 'fk'), ('resource_type', 'text', ''), ('error_code', 'text', '')]),
    'resource_types': ('The registry: how to list each type, where its ID and tags live, and how it links to others.',
                       [('resource_type', 'text', 'pk'), ('service', 'text', ''), ('list_call', 'text', ''), ('edge_paths', 'jsonb', '')]),
    'resources': ('Current state of every resource, one row per profile, account and ARN. A deleted resource stays, marked deleted.',
                  [('arn', 'text', 'pk'), ('resource_type', 'text', 'fk'), ('attrs', 'jsonb', ''), ('metrics', 'jsonb', ''), ('secrets_encrypted', 'text', ''), ('content_hash', 'text', ''), ('status', 'live | deleted', ''), ('last_seen_scan', 'uuid', 'fk')]),
    'resource_changes': ('One row for each resource a scan created, changed or deleted, with the diff.',
                         [('arn', 'text', 'fk'), ('scan_id', 'uuid', 'fk'), ('change_type', 'text', ''), ('diff', 'jsonb', '')]),
    'resource_edges': ('How resources connect, read from paths in their own configuration.',
                       [('from_arn', 'text', 'fk'), ('to_arn', 'text', 'fk'), ('rel_type', 'text', '')]),
    'resource_prescan': ('A photograph of each resource before a scan touches it. The scan diffs against it, writes the changes, then deletes it.',
                         [('scan_id', 'uuid', 'fk'), ('arn', 'text', 'fk'), ('existed', 'boolean', ''), ('prev_hash', 'text', '')]),
    'resource_embeddings': ('A vector for each resource, so search can match meaning as well as names.',
                            [('arn', 'text', 'fk'), ('embedding', 'vector(384)', ''), ('doc', 'text', '')]),
    'findings': ('Problems found by a scan, an alert, a report or a question, each tied to one resource.',
                 [('id', 'text', 'pk'), ('severity', 'text', ''), ('category', 'text', ''), ('resource_id', 'text', 'fk')]),
    'alerts': ('Rule matches for an account, open or archived, with when they were first and last seen.',
               [('id', 'text', 'pk'), ('rule_slug', 'text', ''), ('severity', 'text', ''), ('status', 'open | archived', '')]),
    'reports': ('Saved reports, each marked Clean, Warning, Failed or Stale.',
                [('id', 'text', 'pk'), ('title', 'text', ''), ('status', 'text', ''), ('data', 'jsonb', '')]),
}
EDGES = [('scan_passes', 'scans'), ('scan_scopes', 'scans'), ('scan_errors', 'scans'), ('scan_scopes', 'resource_types'),
         ('resources', 'scans'), ('resources', 'resource_types'), ('resource_changes', 'resources'), ('resource_changes', 'scans'),
         ('resource_edges', 'resources'), ('resource_prescan', 'resources'), ('resource_prescan', 'scans'),
         ('resource_embeddings', 'resources'), ('findings', 'resources')]
COLS = [('Scans', ['scans', 'scan_passes', 'scan_scopes', 'scan_errors']),
        ('Estate', ['resource_types', 'resources', 'resource_changes']),
        ('History and search', ['resource_edges', 'resource_prescan', 'resource_embeddings']),
        ('Work', ['findings', 'alerts', 'reports'])]

def er_table(name):
    desc, cols = TABLES[name]
    links = sorted({b for a, b in EDGES if a == name} | {a for a, b in EDGES if b == name})
    rows = ''.join(f'<span class="er-c{" " + k if k else ""}"><span>{c}</span><em>{esc(t)}</em></span>' for c, t, k in cols)
    key = ' key' if name == 'resources' else ''
    return (f'<button class="er-t{key}" type="button" data-t="{name}" data-links="{" ".join(links)}" data-desc="{esc(desc)}" aria-pressed="false">'
            f'<span class="er-n">{name}</span><span class="er-cs">{rows}</span></button>')

cols_html = ''.join(f'<div class="er-col"><p class="er-h">{h}</p>{"".join(er_table(t) for t in ts)}</div>' for h, ts in COLS)
ILL['schema'] = f"""<figure class="art live er" data-live="schema" data-edges="{" ".join(a + ">" + b for a, b in EDGES)}" aria-label="The thirteen estate tables in four groups: scans, estate, history and search, and work. Choose a table to see its columns, what it holds and which tables it links to.">
<div class="er-grid"><svg class="er-wires" aria-hidden="true"></svg>{cols_html}</div>
<p class="er-note" aria-live="polite"><b>resources</b> <span>{esc(TABLES['resources'][0])}</span></p>
<p class="er-key"><span class="er-k pk">Primary key</span><span class="er-k fk">Links to another table</span><span>Choose a table to trace it.</span></p></figure>"""


# Components: real Escher components, drawn in HTML so they can be used.
def gx(name, hint, body):
    h = f'<span class="gx-hint">{hint}</span>' if hint else ''
    open_ = ' open' if name == 'Cite' else ''
    return f'<figure class="gx" data-gx="{name}"><div class="gx-stage{open_}">{body}</div><figcaption><code>{name}</code>{h}</figcaption></figure>'

bars = [('EC2', 18.4), ('RDS', 12.9), ('S3', 4.1), ('Lambda', 2.2), ('EBS', 3.6)]
top = 20
ticks = ''.join(f'<span class="gc-tick" style="--y:{v / top * 100:.1f}%"><i>${v}k</i></span>' for v in (0, 10, 20))
bands = ''.join(
    f'<button type="button" class="gc-band{" on" if n == "RDS" else ""}" style="--h:{v / top * 100:.1f}%" data-v="${v}k" aria-label="{n}, ${v}k">'
    f'<i></i><span>{n}</span></button>' for n, v in bars)
grid_rows = [('orders-db', 'us-east-1', 4210), ('warehouse', 'us-west-2', 3880), ('etl-jobs', 'us-east-1', 1290), ('cdn-logs', 'eu-west-1', 412)]
grid = ('<table class="gd"><thead><tr><th><button type="button" data-k="0">Resource</button></th><th><button type="button" data-k="1">Region</button></th>'
        '<th class="r"><button type="button" data-k="2" aria-sort="descending">Cost / mo</button></th></tr></thead><tbody>'
        + ''.join(f'<tr><td>{a}</td><td>{b}</td><td class="r" data-v="{c}">${c:,}</td></tr>' for a, b, c in grid_rows) + '</tbody></table>')
M = [
    gx('Metric', '', '<div class="gm"><span class="gm-l">Monthly cost</span><b class="gm-v">$41.2k</b><span class="gm-d bad">▲ 8% vs September</span><span class="gm-n">Budget $45k</span></div>'),
    gx('BarChart', 'Hover a bar', f'<div class="gc" role="group" aria-label="Cost by service, RDS emphasised"><div class="gc-plot">{ticks}<div class="gc-bands">{bands}</div><p class="gc-tip" aria-hidden="true"></p></div></div>'),
    gx('DataGrid', 'Sort a column', grid),
    gx('HtmlFigure', '', '<svg class="gf" viewBox="0 0 220 110" role="img" aria-label="A figure: the internet reaches a bucket through a public bucket policy."><text x="2" y="60">Internet</text>'
       '<path class="gf-l" d="M54 56H82"/><rect class="gf-b red" x="82" y="38" width="62" height="36" rx="6"/><text x="113" y="60" text-anchor="middle">Policy</text>'
       '<path class="gf-l" d="M144 56H166"/><rect class="gf-b" x="166" y="38" width="52" height="36" rx="6"/><text x="192" y="60" text-anchor="middle">Bucket</text>'
       '<text class="gf-s" x="113" y="94" text-anchor="middle">Principal: * opens it to anyone</text></svg>'),
    gx('Widget', 'Drag', '<div class="gw" data-rate="34.67"><label class="gw-l" for="gw-days">Log retention, <b data-w="days">90</b> days</label>'
       '<input id="gw-days" type="range" min="7" max="365" step="1" value="90"><b class="gw-v"><span data-w="cost">$3,120</span> / mo</b></div>'),
    gx('Cite', 'Click the marker', '<p class="gt">Spend rose 8% this month, mostly from RDS.<button type="button" class="gt-m" aria-describedby="gt-pop">1</button></p>'
       '<div class="gt-pop" id="gt-pop" role="tooltip"><span class="gt-src"><i></i>Evidence · AWS Cost Explorer</span>'
       '<span class="gt-kv"><em>Scope</em>prod · us-east-1</span><span class="gt-kv"><em>Period</em>Oct 2026</span><span class="gt-ts">Data as of Oct 2, 2026 · 2:04 PM</span></div>'),
    gx('Questionnaire', 'Pick one', '<div class="gq" aria-live="polite"><p class="gq-step">1 of 2</p><p class="gq-q">Which environment?</p>'
       '<div class="gq-o"><button type="button">Production</button><button type="button">Staging</button><button type="button">Development</button></div></div>'),
    gx('Report', '', '<div class="gr-sheet"><span class="gr-st">Warning</span><b class="gr-t">S3 exposure review</b><span class="gr-s">3 findings · 24 buckets</span>'
       '<div class="gr-ch"><i style="--h:40%"></i><i style="--h:70%"></i><i style="--h:30%" class="on"></i><i style="--h:55%"></i></div>'
       '<div class="gr-ln"><i></i><i></i><i></i></div></div>'),
]
ILL['minis'] = '<div class="gxs">' + ''.join(M) + '</div>'


# Evaluation: one turn, six graders. Pick a mistake and watch which grader catches it.
# Rules and failure messages follow apps/prototype/src/eval/graders.ts.
GRADERS = [('grounding', 'Every number is in a tool result'), ('citation', 'Knowledge answers cite a source'),
           ('parse', 'The interface code parses'), ('shape', 'No empty or one-column parts'),
           ('absence', 'Empty results aren’t read as “none”'), ('reachable', 'Every part is on screen')]
TOOL = ['query_resources → {"type": "ebs-snapshot", "count": 5152,', '  "byAccount": {"prod": 3904, "data": 1248}}',
        'search_knowledge → {"count": 2, "results": ["Snapshot retention", …]}']
CODE = ['root = Stack([head, kpi, grid, cite, more])',
        'head = TextContent("Prod holds 3,904 of 5,152 snapshots")',
        'kpi = Metric("EBS snapshots", "5,152")',
        'grid = Table([Col("Account", accts), Col("Snapshots", counts)])',
        'cite = Cite(1, "evidence", "Snapshot retention runbook")',
        'more = FollowUpBlock(["Which are older than 90 days?"])']
def sc(label, why, fail=None, msg='', tool=None, code=None, bad=()):
    return {'label': label, 'why': why, 'fail': fail, 'msg': msg, 'tool': tool or TOOL, 'code': code or CODE, 'bad': list(bad)}
def edit(i, s):
    c = list(CODE); c[i] = s; return c
SCEN = [
    sc('Invented number', 'The model rounded from memory. 4,812 is nowhere in what the tools returned.', 'grounding',
       'numeric claim "4,812" does not appear in this turn’s tool results', code=edit(1, 'head = TextContent("Prod holds 4,812 of 5,152 snapshots")'), bad=[1]),
    sc('Clean turn', 'Every number traces to a tool result, the runbook is cited, and every part renders.'),
    sc('No citation', 'The runbook was used, but the answer doesn’t say so.', 'citation',
       'search_knowledge returned passages but the answer has no Cite node with type "evidence"',
       code=[CODE[0].replace(', cite', '')] + CODE[1:4] + CODE[5:], bad=[0]),
    sc('Text outside the code', 'A friendly sentence before the code means part of the answer isn’t interface.', 'parse',
       'content: prose before the first Lang statement', code=['Here’s what I found:'] + CODE, bad=[0]),
    sc('One-column table', 'A table of names with nothing beside them answers nothing.', 'shape',
       'content: Table with 1 column (needs >= 2)', code=edit(3, 'grid = Table([Col("Account", accts)])'), bad=[3]),
    sc('False “none”', 'The real case: the query asked for ebs_snapshot, the estate spells it ebs-snapshot, and the answer denied 5,152 snapshots. Grounding passes, because zero matches an empty result.', 'absence',
       'content: asserts absence on an all-empty tool result — "No accounts currently have EBS snapshots."',
       tool=['query_resources → {"type": "ebs_snapshot", "count": 0}', '', 'search_knowledge → {"count": 0}'],
       code=['root = Stack([head, more])', 'head = TextContent("No accounts currently have EBS snapshots.")', CODE[5]], bad=[1]),
    sc('Forgotten table', 'The table is written but never placed, so the reader sees a heading with nothing under it.', 'reachable',
       'content: component(s) defined but never reached from root: grid', code=edit(0, 'root = Stack([head, kpi, cite, more])'), bad=[0]),
]

def gr_rows(fail):
    return ''.join(f'<li class="{"fail" if g == fail else "pass"}" data-g="{g}"><span class="gv-i" aria-hidden="true"></span><span class="gv-n">{g}</span><span class="gv-d">{d}</span></li>' for g, d in GRADERS)
def code_html(lines, bad):
    return ''.join(f'<span class="{"bad" if i in bad else ""}">{esc(l)}</span>' for i, l in enumerate(lines))
s0 = SCEN[0]
scen_json = json.dumps(SCEN, ensure_ascii=False).replace('</', '<\\/')
chips = ''.join(f'<button type="button" data-i="{i}" aria-pressed="{"true" if i == 0 else "false"}">{esc(s["label"])}</button>' for i, s in enumerate(SCEN))
ILL['eval'] = f"""<figure class="art live gv" data-live="graders" aria-label="One answer checked by six graders. Choose a mistake to put into the answer and see which grader catches it.">
<div class="gv-chips" role="group" aria-label="Mistake">{chips}</div>
<div class="gv-body"><div class="gv-turn"><p class="gv-h">Tool results</p><pre class="gv-tool">{code_html(s0['tool'], [])}</pre>
<p class="gv-h">Answer, in OpenUI Lang</p><pre class="gv-code">{code_html(s0['code'], s0['bad'])}</pre></div>
<div class="gv-side"><ol class="gv-list">{gr_rows(s0['fail'])}</ol>
<p class="gv-msg"><code>{esc(s0['msg'])}</code></p><p class="gv-why">{esc(s0['why'])}</p></div></div>
<script type="application/json" class="gv-data">{scen_json}</script></figure>"""


# ---------- Live (HTML + escher.js) ----------
# Gen UI: OpenUI Lang types in on the left, the answer assembles on the right, one piece per line.
code = [
    ('root', 'root = Stack([head, kpis, chart, cite])'),
    ('head', 'head = TextContent("Prod exposure")'),
    ('kpis', 'kpis = Metric("Internet-reachable", "1 bucket")'),
    ('chart', 'chart = BarChart(byService, "Exposed")'),
    ('cite', 'cite = Cite("evidence", "S3 policy")'),
]
lines_html = ''.join(f'<span class="ln" data-k="{k}" data-text="{t.replace(chr(34), "&quot;")}">{t.replace(chr(34), "&quot;")}</span>' for k, t in code)
bars_html = ''.join(f'<i style="--h:{h}%"{" class=r" if i == 3 else ""}></i>' for i, h in enumerate([40, 66, 28, 92, 52, 74]))
ILL['genui'] = f"""<figure class="art live stream" data-live="stream" aria-label="OpenUI Lang streams in on the left while the answer assembles on the right: a heading, two metric tiles, a bar chart and a citation.">
<div class="stream-code"><div class="stream-lines">{lines_html}</div><span class="caret"></span><span class="stream-label">OpenUI Lang, streaming</span></div>
<div class="stream-card" data-k="root"><p class="sc-head" data-k="head">Prod exposure</p>
<div class="sc-kpis" data-k="kpis"><div><span>Internet-reachable</span><b>1 bucket</b></div><div><span>At risk</span><b>8</b></div></div>
<div class="sc-chart" data-k="chart">{bars_html}</div>
<span class="sc-cite" data-k="cite"><i></i>S3 policy</span></div>
<button class="replay" type="button"><span class="ic" data-ic="arrow-counter-clockwise"></span>Replay</button></figure>"""

# Scanning: a simulated run. Every cell is one call; twelve run at once; two fail and are retried.
svcs = ['EC2', 'S3', 'RDS', 'Lambda', 'IAM', 'VPC', 'EKS', 'KMS', 'ELB']
regs = 16
rows = ''
for i, sname in enumerate(svcs):
    cells = ''.join(f'<i data-fail="{1 if (i, j) in [(2, 11), (6, 4)] else 0}"></i>' for j in range(regs))
    rows += f'<div class="sg-row"><span>{sname}</span>{cells}</div>'
head = '<div class="sg-row sg-head"><span></span>' + ''.join(f'<b>r{j+1}</b>' for j in range(regs)) + '</div>'
ILL['scan'] = f"""<figure class="art live scan" data-live="scan" aria-label="A grid of services by regions fills as a scan runs twelve calls at a time. Two calls fail, are marked in red, and are retried.">
<div class="sg">{head}{rows}</div>
<div class="sg-foot"><span class="key k-done">Scanned</span><span class="key k-run">Running</span><span class="key k-fail">Failed, recorded, retried</span><span class="sg-count"><b data-c="run">0</b> in flight · <b data-c="done">0</b> of {len(svcs)*regs} done</span></div>
<button class="replay" type="button"><span class="ic" data-ic="arrow-counter-clockwise"></span>Replay</button></figure>"""

# Tokens: one example turn, toggle between before and after prompt caching.
hist = [0, 1.2, 2.6, 4.0, 5.6, 7.0, 8.6, 10.0]
tools, system, new = 2.2, 9.0, 1.2
mx = tools + system + max(hist) + new
cols = ''
for h in hist:
    seg = lambda cls, v: f'<i class="{cls}" style="--v:{v/mx*100:.2f}%"></i>'
    cols += '<div class="tk-bar">' + seg('n', new) + seg('h', h) + seg('s', system) + seg('t', tools) + '</div>'
before = sum(tools + system + h + new for h in hist)
after = sum((tools + system + h) * 0.1 + new * 1.25 for h in hist)
ILL['tokens'] = f"""<figure class="art live tokens" data-live="tokens" data-before="{before:.0f}" data-after="{after:.0f}" aria-label="Eight stacked bars, one per model call in a report turn. A toggle switches between before and after prompt caching: after, the shared prefix is read from cache at a tenth of the price.">
<div class="tk-top"><div class="seg" role="group" aria-label="Show"><button type="button" data-mode="before" aria-pressed="true">Before</button><button type="button" data-mode="after" aria-pressed="false">After caching</button></div>
<p class="tk-read"><b data-r="val">{before:.0f}k</b> billed input, in token-equivalents</p></div>
<div class="tk-chart">{cols}</div>
<div class="tk-foot"><span class="key k-full">Re-read in full</span><span class="key k-cache">Read from cache, 0.1×</span><span class="key k-new">New this call, cache write 1.25×</span></div>
<p class="tk-note">An example report turn of eight calls. Bottom to top: tool schemas, system prompt, conversation so far, the new turn. Prices are the published cache multipliers.</p></figure>"""

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
