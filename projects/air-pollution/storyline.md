# Air Atlas: case study storyline

Draft. Built from `../../../../air-pollution-map` (README, `docs/superpowers/specs/2026-10-16-event-cards-design.md`, `docs/outreach/`, `analysis/results.json`, `analysis/mechanisms.json`, `src/`, `scripts/`, `.github/workflows/pages.yml`, the data manifests in `public/data/` and 86 commits from 8 to 18 October 2026). Same structure as OpenFOAM Studio: problem, then the drawing, then the product, then system design, then reflection. Headings are plain nouns, and each body is 1 to 3 sentences.

The page has two halves. Sections 01 to 12 are the product. Sections 13 to 21 are the system design: there is no backend, so the work is in the data pipeline, the checks and the renderer. Give it the same weight as the first half: diagrams and real data, not bullet lists.

Built as `index.html` + `air-atlas.css` + `air-atlas.js`, replacing the current slide-style page (kept in `old/`). Reused: the embedded atlas build (`atlas/`), the one-dot booth (`booths/one-dot.js`), the direction sketches (`booths/directions.js`), the screen recordings in `media/`, and the card art in the app's `public/cards/`. New figures come from the real data files through `scripts/air-figures.py`.

Answers to the open questions are folded in. Visitor numbers come from a GoatCounter snapshot taken 19 Oct 2026, 19:10 IST (`media/stats.json`).

---

## Hero
- **Title:** Air Atlas. The live site is called *Who Owns the Air?*; say so once, in See it live.
- **Line:** An interactive globe of the world's air. Each pollutant is printed as its own halftone ink, and dot size shows how much is in the air.
- **Facts:** Role: Design and code, solo · Type: Personal project, live · Data: Copernicus CAMS via Open-Meteo · Built: 8 to 18 October 2026
- **Visual:** the live globe (embedded atlas), with PM2.5, dust and formaldehyde on. Drag hint under it.

## 01 Problem
Copernicus models the whole atmosphere every day and publishes it for free. It arrives as grids of numbers, and most maps of it show one pollutant at a time as a colour ramp, so you can't see dust and smoke and traffic gas together.
- **Origin:** I found the free CAMS data and wanted to see what it looks like. A side project, made for fun.
- **Three labels:**
  - **Hidden:** the data is free, but it ships as binary grid files and APIs.
  - **One at a time:** colour ramps can't overlap, so maps pick one field.
  - **Overclaimed:** pretty maps often read like sensor readings or source attribution. These are model estimates.
- **Closing line:** The data exists. The picture doesn't.

## 02 First version
It began as *Who owns the air?*, splitting each city's pollution by sector: power, industry, traffic, homes. Those numbers were made up, so I dropped them and kept only the model data.
- **Visual:** a drawn sketch of the sector version (city, eight sector icons, shares) with a strike through it. No real numbers on it.
- **Source:** `src/prototype/previous-interface.jsx`, `src/data.js`.

## 03 One value, one dot
I started with one value at a time and asked how to draw it. Here is one value from the forecast as one dot. Change the number or the pollutant and watch it change.
- **Interactive:** reuse `booths/one-dot.js`.

## 04 Directions
Then several values at once. Each layer needed its own colour, and overlaps had to stay readable. I tried five drawings in three days.
- **Interactive:** reuse `booths/directions.js`, five steps with dates:
  1. 8 Oct: a plume over one city. Only its opacity was data.
  2. 9 Oct: a solid gradient shell, lifted where values were high.
  3. 9 Oct: several layers mixed into one shell.
  4. 9 Oct: dots of nearly fixed size, value as opacity.
  5. 10 Oct: halftone. Dot size is the value; each layer is its own plate.

## 05 Drawing rules
- **Size, not opacity.** Dot area matches the value.
- **Fixed plates.** Layers never move each other's dots.
- **Quiet background.** Ozone shows only where it departs from its usual level.
- **Missing stays missing.** Gaps draw nothing. They are never zero.

## 06 A screen of dots
Concentration is dot size, as in halftone print. Zero prints nothing.
- **Visual (new, real data):** a strip of the real PM2.5 field across northern India, printed with the app's rule `r = 0.56 × √(value / range)`, next to the same strip as a colour ramp.

## 07 Ink that mixes
Each pollutant is its own ink plate with a fixed offset. Overlaps mix the same way, whatever order you turn layers on.
- **Interactive (new, real data):** a flat map of the snapshot with three plate toggles (PM2.5, dust, NO₂). Turning them on in any order gives the same picture.
- **Reuse:** `media/ink-that-mixes.mp4`.

## 08 Halftone globe
One hour of the whole atmosphere, printed on a sphere. 28 fields: 15 global at about 45 km, 13 more over Europe at about 11 km.
- **Reuse:** `media/halftone-globe.mp4`.

## 09 Time
Play 48 hours of forecast, or step through monthly means since August 2022.
- **Visual (new, real data):** Delhi's monthly PM2.5 over 50 months, with every November peak marked.
- **Reuse:** `media/time-bar-monthly.jpg`.

## 10 Read any point
Hover anywhere for the model values under the pointer, each compared with the WHO guideline. Click to pin it.
- **Reuse:** `media/read-any-point-globe.mp4`, `media/read-any-point-card.mp4`.

## 11 Fly to a city
Search 237 cities offline, or type coordinates. The camera arcs around the Earth and lands on the current PM2.5 estimate.
- **Reuse:** `media/fly-to-a-city.mp4`.
- **Iteration, one line:** on 10 Oct the site asked for your location on first open. A day later it turned to your rough region from your IP instead, and asks only when you press My location. 25 of the 30 people who saw the prompt said no.

## 12 Event cards
16 collectible cards of real pollution events: wildfire smoke, peat haze, crop burning, savanna fires, dust storms. You find each one on the globe, then answer a question about its cause to collect it.
- **Visual:** three real cards from `public/cards/` (Canada 2023, North India November, Harmattan), one flipped to its back.
- **Rules worth showing (diagram):** find → answer → collect → share. A wrong answer waits an hour, or until you find another card.
- **Rarity by how often, never by harm:** Every year (9), Every few years (5), Once in decades (2). Most air-pollution deaths happen where pollution is a yearly season, so a yearly card must not read as less important.
- **The question corrects a belief:** for example that Diwali fireworks cause North India's November smog. The answer is crop burning, plus winter weather.
- **Change after launch:** on 17 Oct visitors found the month rule too hard, so a card is now found by place alone, with 300 km of leeway. Friends told me they couldn't find any.

## 13 Two models
Over Europe the atlas switches to the 11 km regional model. It doesn't always agree with the 45 km global one: on 9 October its dust was about a quarter as high.
- **Visual (new, real data):** median ratio Europe ÷ global per field, from `analysis/results.json → agreement`.
- **Reuse:** `media/two-models-edge.jpg`.

## 14 Data study
A short study of correlations across all 405,900 cells. Fine particles track carbon monoxide where fires burn, and dust over the Sahara. A hint of smoke versus sand, not source attribution.
- **Visual (new, real data):** PM2.5 vs CO and PM2.5 vs dust by region, from `analysis/mechanisms.json → combustion`.
- **Reuse:** `media/study-co-map.jpg`, `media/study-fire-dust.jpg`. Link to the study page.

---

## 15 Architecture
There is no server. A scheduled GitHub Action pulls the newest CAMS and weather runs from Open-Meteo's open-data bucket, turns them into checked binary files and publishes them with the site on GitHub Pages. The browser does everything else.
- **Diagram:** Open-Meteo S3 (OM files) → GitHub Actions, 12:30 UTC daily (Python: `refresh-forecast.py`, history `month`) → tests → GitHub Pages (`public/data/`, 237 MB) → browser: verify → Web Worker builds dots → WebGL draws. Side arrow: the city readout calls the Open-Meteo air-quality API directly.
- **Why no backend:** the data changes once a day, so a static build is enough, and it costs nothing to host.

## 16 Data pipeline
- **Snapshot:** one forecast hour, 15 global fields, 900 × 451 cells at 0.4°: 405,900 cells per field, 24,354,000 bytes as float32 (2.8 MB gzipped).
- **Europe:** 25 fields at 0.1°, 700 × 420 cells, from the CAMS Europe ensemble.
- **Forecast:** 17 frames, 3 hours apart, float16, about 2.3 MB each.
- **History:** 50 monthly means from August 2022, each the mean of every hourly value in the archive (about 8 GB per field, streamed and deleted chunk by chunk).
- **Diagram:** a bar of file sizes per data set, plus one row per job (snapshot, frames, weather, history month).
- **Data is not in git:** each deploy starts by downloading the data already live, checked against its manifests, so a push never needs a refetch.

## 17 Checks
Every file ships with a manifest: source URL, valid time, grid, units, length and a SHA-256. The browser checks all of it before it draws, and a bad field shows an error instead of a picture.
- **Missing stays missing:** NaN cells stay NaN. About 0.01% of archive values are negative (dust down to −295 µg/m³); they are skipped when averaging, never clamped.
- **Fail closed:** if any download or test fails in the nightly job, nothing deploys and yesterday's data stays live.
- **Diagram:** manifest card (real fields from `global-air-native.json`) → five checks as a row of pass marks.

## 18 Dot lattice
Dots sit on a Fibonacci sphere: equal area per dot, no crowding at the poles, fixed to the Earth. Zoom picks one of seven lattices, 16,000 to 1,024,000 dots, each double the last, so dots stay at least 7 px apart.
- **Diagram (new):** the seven levels as a ladder with dot counts; a small sphere showing the even spacing vs a lat-lon grid that bunches at the poles.
- **Detail worth one line:** levels switch with hysteresis (up at 7.7 px, down at 6.65 px), and geometry is built in a Web Worker so the old level stays on screen until the new one is ready.

## 19 Halftone shader
Radius is `0.56 × √(value / range)` in lattice units, so dot area is linear in concentration and a full-range dot just touches its neighbours. Discs smaller than half a pixel keep their ink area and fade, so low values never drop out.
- **Diagram:** value → radius curve, with three example dots.
- **Plates:** each layer's offset comes from its catalogue index, at golden-angle steps, so turning on another layer never moves a dot.

## 20 Ink mixing
Mixing takes two passes. Every disc adds its ink's OKLab hue and coverage to a half-float buffer; a second pass averages the hue and restores the chroma, so overlaps stay as bright as their inks. Addition doesn't care about order, so the result doesn't either.
- **Diagram:** two plates → additive buffer (a·c, b·c, chroma·c, c) → composite → screen.
- **Display scales:** one chart of the real coefficient of variation per field. Fields below 0.5 (only ozone today) use a baseline scale, so its everywhere-background draws nothing.

## 21 Playback
Forecast frames load as half-float texture arrays. Each dot samples two frames on the GPU and blends them, so playing 48 hours never rebuilds geometry. In-between moments are display blends; the readout always shows the nearest real frame.
- **Diagram:** frame N and N+1 textures → vertex shader `mix()` → radius.

## 22 Card system
The deck is hand-written JSON, checked by tests. Card stats and art come from a hand-run tool that measures the real monthly field inside each card's footprint. A save link packs the collection into two bits per card: the card and its CO print.
- **Diagram:** `deck.json` → `card-tools.py stats/art` (monthly data) → card SVGs → headless Chrome → share pages with preview images.
- **Detail worth one line:** `order.json` lists every card ever published and only grows, because save links depend on card positions.

## 23 Stack and tests
- React 19, Three.js, Vite, Tailwind, Web Workers, WebGL shaders.
- Python with numpy and omfiles for the data jobs.
- 175 tests in 26 files (`node --test`): data boundaries, checksums, lattice spacing, dot radius, paint mixing order, camera paths, cards.
- GitHub Actions: daily refresh, tests, build, deploy to Pages. GoatCounter for visitor counts, no cookies.

---

## 24 How I worked
Sketch, then code. Each direction started as a quick drawing; I kept what read well and had AI coding agents build it. Bigger features, like the cards, got a written spec and plan first, and tests were the gate for every change.
- **Visual:** 86 commits over 11 days as a strip, coloured by area (drawing, data, product, cards).

## 25 Outcome
It's live and refreshes every day. On 17 October I sent it to 31 people and groups, including Open-Meteo, earth.nullschool.net, Datawrapper and Our World in Data.
- **Stat row:** **173** visitors in the first 9 days · **75%** on phones · **42** readings pinned · **14** cards found.
- **Where they came from (bar chart):** Reddit 49, direct 48, Instagram 39, own pages and links 22, LinkedIn 9, Google 3.
- **What they used (bar chart):** tapped for a reading 42, played the forecast 35, opened the history 26, searched a place 13, found a card 14.

## 26 What I learned
- **Sketch many, keep one.** Five drawings in three days before halftone. Throwing directions away fast was the work.
- **Ship, then listen.** Real visitors changed the location prompt and the card rule within days of launch.
- **Phones first.** Three in four visitors came on phones, mostly from Reddit and Instagram.

---

## Decisions
- Name: Air Atlas.
- Hero globe: keep the 10 Oct build in `atlas/`.
