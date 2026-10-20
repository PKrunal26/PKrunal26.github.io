"""Generate the Escher case-study visuals (inline SVG diagrams, HTML figures and icon markers) and inject them into index.html at <!--ill:name--> markers."""
import math, re, sys

PAGE = sys.argv[1]

ILL = {}

# The problem and outcome figures are Anatomy bench figures: scripts/escher-figures.mjs.

def spot(name):
    return f'<span class="spot" data-ic="{name}"></span>'

# 2. Who it's for: seven roles, one estate. Topics follow docs/testing/prompt-matrix.md.
ROLES = [
    ('heartbeat', 'SRE', 'Owns production reliability. Asks about scaling, capacity, incident root cause and latency.'),
    ('user-gear', 'Admin', 'Connects the first accounts and gets the team started.'),
    ('shield-check', 'SecOps', 'IAM hygiene, open security groups, encryption and patching.'),
    ('infinity', 'DevOps', 'Drift, network layout, runbook automation and tickets.'),
    ('currency-circle-dollar', 'FinOps', 'Rightsizing, reserved coverage, orphaned resources and cost spikes.'),
    ('stack', 'Platform', 'Many accounts, scanned and read as one estate.'),
    ('certificate', 'Compliance', 'Gaps against SOC 2, HIPAA, ISO 27001 and PCI DSS.'),
]
cards = ''
for i, (ic, name, text) in enumerate(ROLES):
    if i == 0:
        cards += (f'<div class="role main"><span class="role-ic"><span class="ic" data-ic="{ic}"></span></span>'
                  f'<span class="role-tag">Primary user</span><b>{name}</b><p>{text}</p></div>')
    else:
        cards += f'<div class="role"><span class="role-ic"><span class="ic" data-ic="{ic}"></span></span><b>{name}</b><p>{text}</p></div>'
ILL['roles'] = f'<div class="roles">{cards}</div><p class="roles-note">Each role has its own test journeys in the prompt matrix: 70 in all, four or five turns each.</p>'

# 3. Three surfaces, 4. principles, 7. lessons: icons, filled in by scripts/escher-icons.py.
ILL['s-reactive'] = spot('bell-ringing')
ILL['s-interactive'] = spot('chat-circle-text')
ILL['s-proactive'] = spot('binoculars')
ILL['p-grounded'] = spot('seal-check')
ILL['p-safe'] = spot('git-diff')
ILL['p-trust'] = spot('steps')
ILL['l-role'] = spot('intersect')
ILL['l-process'] = spot('code')
ILL['l-pace'] = spot('timer')

# 5. Ask: two passes. Pass 1 is the chat with read-only tools; it asks for a report with the
# open_report control tool, which the app captures and never runs. Pass 2 has no tools and
# writes from pass 1's results only (DECISIONS #104). Data: the seeded S3 public-access story.
CALLS = [
    ('query_resources', 'type: s3-bucket', '41 buckets in prod'),
    ('analyze_posture', 'service: s3', '1 public: sellers-exports'),
    ('aws_cli', 's3api get-bucket-policy', 's3:GetObject to Principal "*"'),
    ('query_blast_radius', 'sellers-exports', 'Read by 2 services'),
]
from html import escape as _esc
rows = ''.join(f'<li data-f="{i + 1}"><span class="ps-n">{i + 1}</span><span class="ps-call"><code>{c}</code><span class="ps-arg">{_esc(a)}</span></span><span class="ps-out">{_esc(o)}</span></li>'
               for i, (c, a, o) in enumerate(CALLS))
rows += ('<li class="ps-ctl"><span class="ps-n" aria-hidden="true"><span class="ic" data-ic="hand-tap"></span></span>'
         '<span class="ps-call"><code>open_report</code><span class="ps-arg">&quot;S3 exposure review&quot;</span></span><span class="ps-out">Captured, never run</span></li>')
cite = lambda n: f'<button type="button" class="ps-c" data-f="{n}" aria-label="Source {n}: {CALLS[n - 1][0]}">{n}</button>'
ILL['ask'] = f"""<figure class="art live passes" data-live="passes" aria-label="Two passes. Pass one is the chat with read-only tools: four tool calls, then open_report, which the app captures and never runs. Pass two has no tools and writes the report from those four results, and each number in it points back to the call it came from.">
<div class="ps-grid">
<div class="ps-col"><p class="ps-h"><b>Pass 1</b><span>Chat, read-only tools</span></p><ol class="ps-calls">{rows}</ol></div>
<div class="ps-hand" aria-hidden="true"><span>Tool results only</span></div>
<div class="ps-col"><p class="ps-h"><b>Pass 2</b><span>Report, no tools</span></p>
<div class="ps-doc"><p class="ps-title">S3 exposure review<span class="ps-st">Warning</span></p><p class="ps-sub">prod · 41 buckets</p>
<div class="ps-kpis"><div><span>Public buckets</span><b>1 of 41{cite(2)}{cite(1)}</b></div><div><span>Services reading it</span><b>2{cite(4)}</b></div></div>
<p class="ps-text">sellers-exports lets anyone read its objects{cite(3)}. Two services read from it{cite(4)}, so make it private rather than delete it.</p></div></div>
</div>
<p class="ps-note">Hover a number to see the call it came from.</p></figure>"""

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
        b += f'<rect class="i-tok" x="{x}" y="{sy}" width="{w}" height="30" rx="4"/>'
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
b += '<path class="i-cur" d="M250 112L250 136L256 130L261 141L265 139L260 128L268 128Z"/>'
b += '<path class="d-red" d="M787 100V160H431V100" stroke-dasharray="4 4"/><text class="d-redt" x="609" y="180" text-anchor="middle">Rollback restores the snapshot</text>'
b += '<path class="d-line" d="M609 100V124"/><text class="d-s" x="609" y="140" text-anchor="middle">halt or ask</text>'
b += '<text class="d-s" x="75" y="122" text-anchor="middle">cannot run anything</text>'
ILL['exec'] = f'<div class="diagram"><svg viewBox="0 0 880 196" role="img" aria-label="Five steps: the model proposes, a person confirms, the current state is snapshotted, one step runs, and the result is re-read. A red dashed line shows rollback restoring the snapshot.">{b}</svg></div>'





# Choosing the chart: from the data's shape vs from the reader's question.
flat_bars = ''.join(f'<span class="cc-b"><i></i><em>1</em><small>{n}</small></span>' for n in ['RDS', 'DocDB', 'Redshift', 'OAuth', 'SSH', 'Other'])
ILL['chart'] = f"""<div class="cc"><figure class="cc-card bad"><figcaption><span class="cc-tag">Before</span>Chosen from the data</figcaption>
<div class="cc-stage"><div class="cc-chart" role="img" aria-label="Secrets by type: six bars, each equal to one.">{flat_bars}</div></div>
<p class="cc-say"><span class="ic" data-ic="prohibit"></span>Every bar is 1. The chart answers nothing.</p></figure>
<figure class="cc-card"><figcaption><span class="cc-tag">After</span>Chosen from the question</figcaption>
<div class="cc-stage"><div class="gm cc-metric"><span class="gm-l">Secrets</span><b class="gm-v">1,200</b><span class="gm-d bad">0 rotating</span><span class="gm-d bad">0 encrypted with KMS</span></div></div>
<p class="cc-say"><span class="ic" data-ic="seal-check"></span>One number and the two facts that matter.</p></figure></div>"""



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
def gx(name, hint, body, q):
    h = f'<span class="gx-hint">{hint}</span>' if hint else ''
    open_ = ' open' if name == 'Cite' else ''
    return f'<figure class="gx" data-gx="{name}"><p class="gx-q">{q}</p><div class="gx-stage{open_}">{body}</div><figcaption><code>{name}</code>{h}</figcaption></figure>'

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
    gx('Metric', '', '<div class="gm"><span class="gm-l">Monthly cost</span><b class="gm-v">$41.2k</b><span class="gm-d bad">▲ 8% vs September</span><span class="gm-n">Budget $45k</span></div>', '“What are we spending this month?”'),
    gx('BarChart', 'Hover a bar', f'<div class="gc" role="group" aria-label="Cost by service, RDS emphasised"><div class="gc-plot">{ticks}<div class="gc-bands">{bands}</div><p class="gc-tip" aria-hidden="true"></p></div></div>', '“Which service costs the most?”'),
    gx('DataGrid', 'Sort a column', grid, '“What are our most expensive resources?”'),
    gx('HtmlFigure', '', '<svg class="gf" viewBox="0 0 220 110" role="img" aria-label="A figure: the internet reaches a bucket through a public bucket policy."><text x="2" y="60">Internet</text>'
       '<path class="gf-l" d="M54 56H82"/><rect class="gf-b red" x="82" y="38" width="62" height="36" rx="6"/><text x="113" y="60" text-anchor="middle">Policy</text>'
       '<path class="gf-l" d="M144 56H166"/><rect class="gf-b" x="166" y="38" width="52" height="36" rx="6"/><text x="192" y="60" text-anchor="middle">Bucket</text>'
       '<text class="gf-s" x="113" y="94" text-anchor="middle">Principal: * opens it to anyone</text></svg>', '“How is this bucket exposed?”'),
    gx('Widget', 'Drag', '<div class="gw" data-rate="34.67"><label class="gw-l" for="gw-days">Log retention, <b data-w="days">90</b> days</label>'
       '<input id="gw-days" type="range" min="7" max="365" step="1" value="90"><b class="gw-v"><span data-w="cost">$3,120</span> / mo</b></div>', '“What would shorter log retention save?”'),
    gx('Cite', 'Click the marker', '<p class="gt">Spend rose 8% this month, mostly from RDS.<button type="button" class="gt-m" aria-describedby="gt-pop">1</button></p>'
       '<div class="gt-pop" id="gt-pop" role="tooltip"><span class="gt-src"><i></i>Evidence · AWS Cost Explorer</span>'
       '<span class="gt-kv"><em>Scope</em>prod · us-east-1</span><span class="gt-kv"><em>Period</em>Oct 2026</span><span class="gt-ts">Data as of Oct 2, 2026 · 2:04 PM</span></div>', '“Why did spend go up?”'),
    gx('Questionnaire', 'Pick one', '<div class="gq" aria-live="polite"><p class="gq-step">1 of 2</p><p class="gq-q">Which environment?</p>'
       '<div class="gq-o"><button type="button">Production</button><button type="button">Staging</button><button type="button">Development</button></div></div>', '“Lock down the public bucket.”'),
    gx('Report', '', '<div class="gr-sheet"><span class="gr-st">Warning</span><b class="gr-t">S3 exposure review</b><span class="gr-s">3 findings · 24 buckets</span>'
       '<div class="gr-ch"><i style="--h:40%"></i><i style="--h:70%"></i><i style="--h:30%" class="on"></i><i style="--h:55%"></i></div>'
       '<div class="gr-ln"><i></i><i></i><i></i></div></div>', '“Review S3 exposure across prod.”'),
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
