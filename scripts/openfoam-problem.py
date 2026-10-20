"""Build the data for the Problem figure on the OpenFOAM Studio page.

Writes media/problem.json from real files in `openfoam studio private/demo/projects`:
  - files  the eight hand-written files of the cavity case shown on the page
           (project 82a55a15), line by line, exactly as OpenFOAM reads them
  - links  values that have to agree across those files, found by pattern,
           as [file, line, first char, last char] hits
  - fails  four failed runs from the app's history: the commands that ran with
           their exit codes and durations, the log length, and the fatal error

Run: python3 scripts/openfoam-problem.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'projects', 'openfoam-studio', 'media', 'problem.json')
PROJECTS = os.path.join(HERE, '..', '..', '..', 'openfoam studio private', 'demo', 'projects')
CASE = os.path.join(PROJECTS, '82a55a15', 'case')

FILES = [
    ('system/blockMeshDict', 'Mesh and boundary names'),
    ('system/controlDict', 'Solver and time steps'),
    ('system/fvSchemes', 'Discretisation'),
    ('system/fvSolution', 'Linear solvers'),
    ('0/U', 'Starting and boundary velocity'),
    ('0/p', 'Starting and boundary pressure'),
    ('constant/physicalProperties', 'Viscosity'),
    ('constant/momentumTransport', 'Laminar or turbulent'),
]
files = [dict(path=p, role=r, lines=open(os.path.join(CASE, p)).read().rstrip('\n').split('\n')) for p, r in FILES]
idx = {f['path']: i for i, f in enumerate(files)}


def find(path, pattern, group=0, start=0, stop=None, first=False):
    """Hits for a regex in one file: [file, line, a, b] with 0-based line and char span."""
    f = idx[path]
    out = []
    for ln, text in enumerate(files[f]['lines'][start:stop], start):
        for m in re.finditer(pattern, text):
            out.append([f, ln, m.start(group), m.end(group)])
            if first:
                return out
    return out


def block(path, name):
    """Line range of a `name { ... }` block (name on its own line)."""
    lines = files[idx[path]]['lines']
    s = next(i for i, l in enumerate(lines) if l.strip() == name)
    depth, i = 0, s + 1
    while True:
        depth += lines[i].count('{') - lines[i].count('}')
        if depth == 0 and '}' in lines[i]:
            return s, i
        i += 1


B, C, S, V, U, P, PP, MT = (f for f, _ in FILES)
links = []
links.append(dict(
    key='patches', label='Boundary names',
    note='The mesh names three boundaries. Velocity and pressure must use the same three names, spelled the same way.',
    hits=[h for p in (B, U, P) for h in find(p, r'^\s*(movingWall|fixedWalls|frontAndBack)\s*$', 1)]))
lo, hi = block(B, 'frontAndBack')
links.append(dict(
    key='2d', label='2D',
    note='The mesh is one cell deep. The front and back are type empty in all three files.',
    hits=find(B, r'\((\d+ \d+ 1)\) simpleGrading', 1) + find(B, r'type (empty)', 1, lo, hi + 1)
    + [h for p in (U, P) for h in find(p, r'type\s+(empty)', 1)]))
links.append(dict(
    key='re', label='Reynolds number',
    note='Re = U·L/ν = 1 × 0.1 / 0.001 = 100. Lid speed, box size and viscosity sit in three different files.',
    hits=find(U, r'uniform (\(1 0 0\))', 1) + find(B, r'convertToMeters (0\.1)', 1) + find(PP, r'nu\s+(0\.001)', 1)))
links.append(dict(
    key='co', label='Courant number',
    note='Co = U·Δt/Δx = 1 × 0.005 / 0.005 = 1. Halve the cell size and the time step has to halve too.',
    hits=find(C, r'deltaT\s+(0\.005)', 1) + find(B, r'\((20 20) 1\)', 1) + find(B, r'convertToMeters (0\.1)', 1) + find(U, r'uniform (\(1 0 0\))', 1)))
links.append(dict(
    key='fields', label='Field names',
    note='Every field file needs a matching solver entry, and a second one for the final pass of each time step.',
    hits=find(U, r'object\s+(U);', 1) + find(P, r'object\s+(p);', 1)
    + find(V, r'^\s{4}(p|pFinal|U|UFinal)\s*$', 1) + find(S, r'(grad\(p\)|div\(phi,U\))', 1)))
links.append(dict(
    key='pref', label='Pressure reference',
    note='No boundary fixes the pressure, so fvSolution has to pin it in one cell.',
    hits=find(P, r'type\s+(zeroGradient)', 1) + find(V, r'(pRefCell|pRefValue)', 1)))
links.append(dict(
    key='solver', label='Solver',
    note='An incompressible solver reads PIMPLE settings, a laminar model and pressure divided by density, in m²/s².',
    hits=find(C, r'solver\s+(incompressibleFluid)', 1) + find(V, r'^(PIMPLE)', 1)
    + find(MT, r'simulationType\s+(laminar)', 1) + find(P, r'dimensions\s+(\[0 2 -2 0 0 0 0\])', 1)))
for l in links:
    assert l['hits'], l['key']

# ── Failed runs ────────────────────────────────────────────────────────────
def run(pid, rid):
    cmds = [json.loads(l) for l in open(os.path.join(PROJECTS, pid, 'commands.jsonl')) if l.strip()]
    log = open(os.path.join(PROJECTS, pid, 'runs', rid + '.log')).read().rstrip('\n').split('\n')
    end = next(i for i, l in enumerate(log) if 'exited with code' in l and 'code 0' not in l)
    fat = next(i for i, l in enumerate(log) if 'FOAM FATAL' in l)
    err = [l.rstrip() for l in log[fat:end] if l.strip()]
    steps = [dict(cmd=c['cmd'], code=c['exitCode'], s=round(c['durationMs'] / 1000, 1)) for c in cmds if c['runId'] == rid]
    last = [l for l in log[:fat] if l.startswith('Time = ')]
    return dict(project=pid, run=rid, steps=steps, log=end + 1, error=err, time=last[-1][7:] if last else None)


ulo, uhi = block(V, 'UFinal')
bl = files[idx[B]]['lines']
b0 = next(i for i, l in enumerate(bl) if l.startswith('boundary'))
b1 = next(i for i in range(b0, len(bl)) if bl[i].startswith(');'))
fails = [
    dict(key='pref', title='No pressure reference', file=V,
         cause='missing', at=[idx[V], *[i for i, l in enumerate(files[idx[V]]['lines']) if 'pRef' in l][:1], 2],
         fix=['pRefCell        0;', 'pRefValue       0;'],
         note='Every pressure boundary is zeroGradient, so nothing fixes the pressure level. Two lines in fvSolution set it.',
         **run('4c1baf78', '03c61316')),
    dict(key='ufinal', title='No final-pass solver', file=V,
         cause='missing', at=[idx[V], ulo, uhi - ulo + 1],
         fix=files[idx[V]]['lines'][ulo:uhi + 1],
         note='The solver wants separate settings for the last pass of each time step. The mesh had built and the first step had started.',
         **run('4c1baf78', '1e2a1607')),
    dict(key='faces', title='Faces in made-up syntax', file=B,
         cause='wrong', at=[idx[B], b0, b1 - b0 + 1],
         fix=['faces           ( patch(0 3 2 1) );'],
         note='Each boundary lists its faces by vertex number. This file used a syntax OpenFOAM doesn’t have, and the error spans 24 lines.',
         **run('aa9f43ea', '14cba0c8')),
    dict(key='control', title='No controlDict', file=C,
         cause='file', at=[idx[C], 0, len(files[idx[C]]['lines'])],
         fix=[],
         note='blockMesh only builds the mesh, but it reads the time settings first. With that file missing, nothing runs.',
         **run('a0053f81', 'afeb2515')),
]
for f in fails:
    f['error'] = [re.sub(r'//cavity/', '/case/', l) for l in f['error']]

prompt = json.load(open(os.path.join(PROJECTS, '82a55a15', 'meta.json')))
prompt = prompt.get('prompt') or prompt.get('name')
data = dict(prompt=prompt, files=files, links=links, fails=fails)
json.dump(data, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
n = sum(len(f['lines']) for f in files)
lk = {(h[0], h[1]) for l in links for h in l['hits']}
print(f'{len(files)} files, {n} lines; {len(links)} links over {len(lk)} lines in {len({h[0] for h in lk})} files')
for l in links:
    print(' ', l['key'], [(files[h[0]]['path'].split('/')[-1], h[1] + 1, files[h[0]]['lines'][h[1]][h[2]:h[3]]) for h in l['hits']])
for f in fails:
    print(' ', f['key'], f['steps'], 'log', f['log'], 'time', f['time'], f['error'][:2])
print(os.path.getsize(OUT) // 1024, 'KB', prompt)
