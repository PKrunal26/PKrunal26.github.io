"""Cut the IIT Guwahati main-gate slab out of Commons "IIT Guwahati 2.jpg" (Ganesh Mohan T, CC BY-SA 4.0).

https://commons.wikimedia.org/wiki/File:IIT_Guwahati_2.jpg (4000x3000). Writes projects/onestop/media/gate.webp.
Run:  python3 scripts/onestop-gate.py IIT_Guwahati_2.jpg projects/onestop/media/gate.webp
"""
import sys
from PIL import Image, ImageDraw, ImageEnhance
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
poly = [(1594, 914), (2534, 921), (2637, 2280), (1517, 2290)]  # slab corners, inset a few px off the trees
W, H = im.size
big = Image.new('L', (W * 2, H * 2), 0)
ImageDraw.Draw(big).polygon([(x * 2, y * 2) for x, y in poly], fill=255)
im.putalpha(big.resize((W, H), Image.LANCZOS))
cut = ImageEnhance.Color(im.crop((1505, 905, 2645, 2295))).enhance(.92)
cut.resize((round(cut.width * 780 / cut.height), 780), Image.LANCZOS).save(dst, quality=86, method=6)
