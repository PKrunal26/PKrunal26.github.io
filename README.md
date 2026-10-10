# Krunal Prajapati — local portfolio study

A compact, typography-led portfolio inspired by the restraint of https://paco.me. This is an original adaptation using Krunal's project names; no source code, proprietary fonts, copy, or artwork from Paco's website is included.

Run `python3 -m http.server 4174 --bind 127.0.0.1` in this directory and visit http://127.0.0.1:4174/.

The homepage links to four separate project pages. Project details are explicit coming-soon states pending real content. CSS uses native sans-serif fonts and a 640px content width. No dependencies. `fluid.js` adds an optional WebGL cursor fluid simulation drawn through an 8×8 Bayer ordered dither; it sits behind content, sleeps when idle, and is skipped for `prefers-reduced-motion` or browsers without WebGL. Tune it in the `config` block at the top of the file.

The previous playground source is retained in `archive/`; its assets remain in `assets/`. The published portfolio has not been changed.

Verified all four project routes and links back to the collection in the browser. Checked the 390px mobile layout for horizontal overflow.

Project previews are part of the fluid. Hovering a homepage project link (fine pointers only) stamps its image from `thumbs/` into the dye beside the cursor: the water under it is stilled so it holds while hovered, and on leave the flow takes it and it decays like the cursor trail. Dye is RGB absorbance, dithered per channel (4 levels each, 2px cells). Sources are in `thumbs/src/` (Escher logo, OpenFOAM Studio cavity-flow render, Air atlas globe captured from its build, Vietnam hero photo). `python3 scripts/prep.py` (needs Pillow and NumPy) crops each to 16:10 at 400×250; dark renders become coloured ink on transparent paper. Crop and tone per image are in the script.

Legibility: the canvas sits above the page (clicks pass through). The page's letters are redrawn glyph by glyph into a mask: the grey trail is erased on the strokes themselves, and a blurred copy acts as a repulsion field that pushes the flow away from letters (`repel`), so ink parts around words and slips between them. The trail is capped at about 40% grey (`trailLimit`). Hover images are not repelled or erased and paint over everything. Images only form after the cursor rests on a link (`intent`). Settings are in `config` at the top of `fluid.js`.

Dark mode: `theme.js` (loaded in `<head>` so there is no flash) follows the system setting until the visitor uses the Dark/Light toggle in the top-right corner, then remembers the choice in localStorage. Colours are CSS variables in `style.css`. In dark mode the fluid draws the trail as light dots and keeps image colours, with white parts of an image falling through to the page.
