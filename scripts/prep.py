"""Prepare project images for the fluid hover previews.

Each source in thumbs/src is cropped to 16:10 and resized to 400x250 (one
pixel per CSS px of the preview). Light sources keep their colours and are
fully opaque. Dark sources (renders on black) become coloured ink on
transparent paper: alpha follows brightness, and the colour is darkened so it
reads on white. fluid.js stamps these into the dye and dithers them live.

Run from design-playground/:  python3 scripts/prep.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "thumbs" / "src"
OUT = ROOT / "thumbs"
SIZE = (400, 250)

# crop: pixel box (left, top, right, bottom) at 16:10; may extend past the
# image, padded with the corner colour. dark=True for renders on black.
# paper scales light sources so their white background still carries ink.
# clear_pad=True leaves padding transparent (for a small mark on open paper).
PROJECTS = {
    "escher": dict(file="escher-logo.png", crop=(-170, -60, 378, 283), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    "openfoam-studio": dict(file="openfoam-studio.jpg", crop=(250, 111, 1626, 971), dark=True, contrast=1.2, paper=1.0),
    "air-pollution": dict(file="air-pollution.png", crop=(-36, 85, 1132, 815), dark=True, contrast=1.3, paper=1.0),
    "vietnam": dict(file="vietnam.jpg", crop=(0, 41, 2000, 1291), dark=False, contrast=1.15, paper=1.0),
    # Paradime: the community screen redrawn for its case study (projects/paradime), captured at 2x
    "paradime": dict(file="paradime.png", crop=(0, 0, 2112, 1320), dark=False, contrast=1.05, paper=0.96),
    # Sustainable Supply Chain: the carbon-by-stage figure from its case study (projects/blue-yonder), captured at 2x
    "blue-yonder": dict(file="blue-yonder.png", crop=(880, 0, 1795, 572), dark=False, contrast=1.05, paper=0.96),
    # Cloud Migration Assistant: the Choose screen redrawn for its case study (projects/atlassian), captured at 2x
    "atlassian-cma": dict(file="atlassian-cma.png", crop=(0, 0, 2336, 1460), dark=False, contrast=1.05, paper=0.96),
    # Lucide icons (file-user, linkedin, mail) as coloured strokes on transparent
    "cv": dict(file="cv-icon.png", crop=(-170, -60, 378, 283), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    "linkedin": dict(file="linkedin-icon.png", crop=(-170, -60, 378, 283), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    "contact": dict(file="contact-icon.png", crop=(-170, -60, 378, 283), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    # About me: Tessell mark and IIT Guwahati crest; Bengaluru is its OSM road skeleton (scripts/bengaluru.py)
    "tessell": dict(file="tessell-logo.png", crop=(-100, -20, 252, 200), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    "bengaluru": dict(file="bengaluru-map.png", crop=(-56, -16, 264, 184), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    "iitg": dict(file="iitg-logo.png", crop=(-100, -20, 252, 200), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
    # Atlassian mark: official SVG from the atlassian.com header (thumbs/src/atlassian-logo.svg), rendered with headless Chrome
    "atlassian": dict(file="atlassian-logo.png", crop=(-100, -20, 252, 200), dark=False, contrast=1.0, paper=1.0, clear_pad=True),
}


def crop(image, box, clear_pad=False):
    left, top, right, bottom = box
    fill = (0, 0, 0, 0) if clear_pad else image.getpixel((4, 4))
    canvas = Image.new("RGBA", (right - left, bottom - top), fill)
    canvas.paste(image, (-left, -top))
    return canvas


def prepare(image, dark, contrast, paper):
    image = image.resize(SIZE, Image.LANCZOS)
    coverage = np.asarray(image.getchannel("A"), dtype=np.float32) / 255
    image = image.convert("RGB")
    image = ImageEnhance.Contrast(image).enhance(contrast)
    image = ImageEnhance.Color(image).enhance(1.25)
    rgb = np.asarray(image, dtype=np.float32) / 255
    if not dark:
        # paper < 1 tints white so a light UI shows as a pale card, not nothing
        rgb = rgb * paper
        alpha = np.ones(rgb.shape[:2], dtype=np.float32)
    else:
        lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        alpha = np.clip((lum - 0.08) / 0.35, 0, 1) ** 0.8
        # bright-on-black becomes the same hue, darker, on white
        rgb = np.clip(rgb / np.maximum(rgb.max(axis=2, keepdims=True), 1e-3), 0, 1) * 0.75
    rgba = np.dstack([rgb, alpha * coverage])
    return Image.fromarray((rgba * 255).round().astype(np.uint8))


def main():
    for name, cfg in PROJECTS.items():
        source = crop(Image.open(SRC / cfg["file"]).convert("RGBA"), cfg["crop"], cfg.get("clear_pad", False))
        path = OUT / f"{name}.png"
        prepare(source, cfg["dark"], cfg["contrast"], cfg["paper"]).save(path, optimize=True)
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
