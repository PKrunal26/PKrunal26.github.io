"""Read a 2D OpenFOAM case (ASCII polyMesh + latest time) into front-face polygons and cell fields."""
import os, re
import numpy as np

def _strip(text):
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'//[^\n]*', '', text)
    return re.sub(r'FoamFile\s*\{.*?\}', '', text, count=1, flags=re.S)

def _list_body(text):
    """Return the contents of the first top-level N( ... ) list."""
    m = re.search(r'(\d+)\s*\(', text)
    start = m.end()
    depth, i = 1, start
    while depth:
        c = text[i]
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        i += 1
    return int(m.group(1)), text[start:i - 1]

def read_points(path):
    n, body = _list_body(_strip(open(path).read()))
    return np.array([r.split() for r in re.findall(r'\(([^()]*)\)', body)], float)

def read_faces(path):
    n, body = _list_body(_strip(open(path).read()))
    return [list(map(int, f.split())) for f in re.findall(r'\d+\s*\(([^()]*)\)', body)]

def read_labels(path):
    n, body = _list_body(_strip(open(path).read()))
    return np.array(body.split(), int)

def read_boundary(path):
    text = _strip(open(path).read())
    out = {}
    for name, block in re.findall(r'(\w+)\s*\{([^{}]*)\}', text):
        t = re.search(r'\btype\s+(\w+)', block)
        nf = re.search(r'nFaces\s+(\d+)', block)
        sf = re.search(r'startFace\s+(\d+)', block)
        if t and nf and sf:
            out[name] = (t.group(1), int(nf.group(1)), int(sf.group(1)))
    return out

def read_field(path, ncells):
    text = _strip(open(path).read())
    m = re.search(r'internalField\s+uniform\s+(\([^)]*\)|[-\d.eE+]+)', text)
    if m:
        v = np.array(m.group(1).strip('()').split(), float)
        return np.tile(v, (ncells, 1))
    m = re.search(r'internalField\s+nonuniform\s+List<(\w+)>', text)
    n, body = _list_body(text[m.end():])
    if m.group(1) == 'vector':
        return np.array([r.split() for r in re.findall(r'\(([^()]*)\)', body)], float)
    return np.array(body.split(), float).reshape(-1, 1)

def latest_time(case):
    ts = []
    for d in os.listdir(case):
        try:
            ts.append((float(d), d))
        except ValueError:
            pass
    return max(ts)[1]

def load(case, fields=('U',)):
    mesh = os.path.join(case, 'constant', 'polyMesh')
    pts = read_points(os.path.join(mesh, 'points'))
    faces = read_faces(os.path.join(mesh, 'faces'))
    owner = read_labels(os.path.join(mesh, 'owner'))
    bnd = read_boundary(os.path.join(mesh, 'boundary'))
    ncells = owner.max() + 1
    zmin = pts[:, 2].min()
    polys = [None] * ncells
    for name, (typ, nf, sf) in bnd.items():
        if typ != 'empty':
            continue
        for fi in range(sf, sf + nf):
            p = pts[faces[fi]]
            if np.allclose(p[:, 2], zmin):
                polys[owner[fi]] = p[:, :2]
    t = latest_time(case)
    data = {}
    for f in fields:
        fp = os.path.join(case, t, f)
        if os.path.exists(fp):
            data[f] = read_field(fp, ncells)
    return polys, data, t
