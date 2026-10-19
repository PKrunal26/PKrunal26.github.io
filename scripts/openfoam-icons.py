"""Inline Phosphor icons (MIT, scripts/icons/phosphor) into the OpenFOAM Studio page.

Fills every <span class="spot" data-ic="NAME"> with the duotone icon and every
<span class="ic" data-ic="NAME"> with the regular one, so the page needs no
icon font or extra requests. Re-run after adding or changing a marker:

    python3 scripts/openfoam-icons.py [page.html]
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, 'icons', 'phosphor')
PAGE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'projects', 'openfoam-studio', 'index.html')

def svg(weight, name):
    raw = open(os.path.join(ICONS, weight, name + '.svg')).read().strip()
    return raw.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg aria-hidden="true" focusable="false"', 1)

html = open(PAGE).read()
pattern = re.compile(r'<span class="((?:spot|ic)(?: [\w-]+)*)" data-ic="([\w-]+)">.*?</span>', re.S)
html = pattern.sub(lambda m: f'<span class="{m[1]}" data-ic="{m[2]}">{svg("duotone" if m[1].startswith("spot") else "regular", m[2])}</span>', html)
open(PAGE, 'w').write(html)
print(len(pattern.findall(html)), 'icons')
