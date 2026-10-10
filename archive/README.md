# Krunal's design playground

A standalone, local portfolio design exploration. Serve this directory with `python3 -m http.server 4174 --bind 127.0.0.1` and open http://127.0.0.1:4174.

Presets change composition, typography, surface, and accent. Individual ingredients can be changed independently. The Homepage and Project page controls preview two contexts. Saved combinations stay in browser local storage; Export tokens downloads the current choices and saved combinations as JSON.

Project descriptions are illustrative copy. This playground does not modify the published portfolio.

## Artwork

- `assets/open-doodles-coffee.svg`: Pablo Stanley, [Open Doodles](https://www.opendoodles.com/), free for personal and commercial use. Source: https://opendoodles.s3-us-west-1.amazonaws.com/coffee.svg
- `assets/open-peeps.svg`: Pablo Stanley, [Open Peeps](https://www.openpeeps.com/), CC0. Source: https://cdn.prod.website-files.com/5e51c674258ffe10d286d30a/5e535aa1d871310896104715_peep-77.svg
- `assets/fieldnotes.png`: original illustration generated with the built-in image generation tool. Prompt: Refined field notebook ink illustration on pure white; a folded map, an abstract fluid-flow experiment around a tiny block, and a sprig of leaves; thin graphite-black pen lines, sparing crosshatching, tiny burnt vermilion accents; airy scientific sketchbook composition; no words, labels, UI, borders, or watermarks.

Fonts are loaded from Google Fonts. Fraunces, Libre Baskerville, DM Sans, and DM Mono have system fallbacks.
