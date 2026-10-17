"""Draw the Bengaluru hover image: the city's road skeleton from OpenStreetMap.

Input is an Overpass API response (JSON, `out geom`) for major roads (only motorway, trunk and primary are drawn), e.g.

  [out:json];way["highway"~"^(motorway|trunk|primary|secondary|tertiary)$"]
  (12.83,77.45,13.12,77.76);out geom;

Roads are drawn in one ink colour inside a circle centred on MG Road, at 4x
and downsampled, onto a 208x208 transparent canvas laid out like the other
sources in thumbs/src. Then run prep.py.

Run from design-playground/:  python3 scripts/bengaluru.py roads.json
Map data © OpenStreetMap contributors (ODbL).
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "thumbs" / "src" / "bengaluru-map.png"

CENTRE = (12.975, 77.605)  # lat, lon
RADIUS_KM = 14
INK = (110, 110, 110)  # neutral grey, reads on light and dark
SCALE = 4
CANVAS = 208
CIRCLE = (72, 72, 68)  # cx, cy, r in canvas px, where the icons sit
WIDTH = {"motorway": 3.6, "trunk": 3.6, "primary": 2.4}  # thinner roads turn to mush in the 2px dither


def main(path):
    ways = json.loads(Path(path).read_text())["elements"]
    lat0, lon0 = CENTRE
    km_lat = 110.574
    km_lon = 111.320 * math.cos(math.radians(lat0))
    cx, cy, r = (v * SCALE for v in CIRCLE)
    px_per_km = r / RADIUS_KM

    def project(lat, lon):
        return (cx + (lon - lon0) * km_lon * px_per_km, cy - (lat - lat0) * km_lat * px_per_km)

    size = CANVAS * SCALE
    roads = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(roads)
    # thin roads first so arterials draw over them
    for way in sorted(ways, key=lambda w: WIDTH.get(w["tags"].get("highway"), 0)):
        width = WIDTH.get(way.get("tags", {}).get("highway"))
        if not width or "geometry" not in way:
            continue
        points = [project(p["lat"], p["lon"]) for p in way["geometry"]]
        draw.line(points, fill=255, width=max(1, round(width * SCALE)), joint="curve")

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    alpha = Image.composite(roads, Image.new("L", (size, size), 0), mask)

    image = Image.new("RGBA", (size, size), INK + (0,))
    image.putalpha(alpha)
    image.resize((CANVAS, CANVAS), Image.LANCZOS).save(OUT, optimize=True)
    print(f"{OUT.relative_to(ROOT)}  {len(ways)} ways")


if __name__ == "__main__":
    main(sys.argv[1])
