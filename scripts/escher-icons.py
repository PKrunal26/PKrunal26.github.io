"""Inline Phosphor icons (MIT, scripts/icons/phosphor) into the Escher page.

Same markers as scripts/openfoam-icons.py: <span class="spot" data-ic="NAME"> gets
the duotone icon and <span class="ic" data-ic="NAME"> the regular one. Run after
scripts/escher-illustrations.py, which writes empty markers into the live visuals:

    python3 scripts/escher-icons.py
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ICONS = os.path.join(HERE, 'icons', 'phosphor')
PAGE = os.path.join(HERE, '..', 'projects', 'escher', 'index.html')

def svg(weight, name):
    raw = open(os.path.join(ICONS, weight, name + '.svg')).read().strip()
    return raw.replace('<svg xmlns="http://www.w3.org/2000/svg"', '<svg aria-hidden="true" focusable="false"', 1)

html = open(PAGE).read()
pattern = re.compile(r'<span class="((?:spot|ic)(?: [\w-]+)*)" data-ic="([\w-]+)">.*?</span>', re.S)
html = pattern.sub(lambda m: f'<span class="{m[1]}" data-ic="{m[2]}">{svg("duotone" if m[1].startswith("spot") else "regular", m[2])}</span>', html)
open(PAGE, 'w').write(html)
print(len(pattern.findall(html)), 'icons')
