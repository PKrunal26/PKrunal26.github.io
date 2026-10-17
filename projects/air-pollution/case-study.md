# Air Atlas case study

Copy for the case study version of the project page, now live in `index.html`. Directions sketches: `booths/directions.js`. Styles: the `cs-` rules at the end of `style.css`.

Voice: plain noun headings, one to three short sentences, no labels above headings, no lessons section.

## Sections

**Hero** (live globe): Air Atlas. What is in the air, printed as halftone ink.

**Facts**: Role: Design and code · Timeline: 10 days, Oct 2026 · Data: Copernicus CAMS via Open-Meteo · Status: Live, updated daily

**Why** (text): A side project, made for fun. Copernicus publishes a model of the world's air every day, free, as grids of numbers few people can read. Air Atlas is an experiment in turning them into something you look at.
It began as *Who owns the air?*, splitting each city's pollution by sector. Those numbers were made up, so I dropped them and stayed with the model data. The live site kept the name.

**One value, one dot** (interactive): I started with one parameter at a time and asked how to draw it. Here is one value from the forecast as one dot. Change the numbers or the pollutant and watch it change.

**Directions** (text + 5 stills): Then several parameters at once. Each layer needed its own colour, and overlaps had to stay readable. I tried these in order:
1. 8 Oct: A plume over one city. Only its opacity was data; the shape was invented. (`cfc92c8`, `02f09af`, ConcentrationPlume.js)
2. 9 Oct: A solid gradient shell, lifted higher where values were high. (`0c4ed62`)
3. 9 Oct: Several layers mixed into one shell. (`324e35a`)
4. 9 Oct: Dots of nearly fixed size, value as opacity. (`099b42a`, `d4b2d7c`)
5. 10 Oct: Halftone. Dot size is the value; each layer is its own offset plate. (`e774680`)
Media: one still per step, captured by checking out each commit.

**A screen of dots**: Concentration is dot size, as in halftone print. Zero prints nothing.

**Drawing rules** (text):
- Size, not opacity. Dot area matches the value.
- Fixed plates. Layers never move each other's dots.
- Quiet background. Ozone shows only where it departs from its usual level.
- Missing stays missing. Gaps draw nothing. They are never zero.

**Ink that mixes**: Each pollutant is its own ink plate with a fixed offset. Overlaps mix the same way, whatever order you turn layers on.

**Halftone globe**: One hour of the whole atmosphere, printed on a sphere. Play 48 hours of forecast, or step through monthly averages since August 2022.
Media: time bar, forecast and monthly history.

**Read any point**: Hover anywhere for the model values under the pointer. Click to pin it.

**Fly to a city**: Search 237 cities offline, or type coordinates. The camera arcs around the Earth and lands on the current PM2.5 estimate.

**Two models** (text): Over Europe the atlas switches to an 11 km regional model. It doesn't always agree with the 45 km global one: on the day I checked, its dust was about a quarter as high. The readout says which model you're reading.
Media: Europe, global and regional model, same hour.

**Data study** (text): Correlations across all 405,900 cells. Fine particles track carbon monoxide where fires burn, and dust over the Sahara. A hint of smoke versus sand, not source attribution. Link: Read the study.
Media: PM2.5 × CO map; fire photo + smoke-vs-dust chart.

**Next** (text): Collectible cards for real pollution events, found on the globe by place and month.

**See it live**: unchanged, plus "Live as Who Owns the Air?" and a Data study link.

## Sources for the facts
- Why / sector version: `air-pollution-map/src/prototype/previous-interface.jsx`, `src/data.js`
- Directions: commit hashes above, all in `air-pollution-map`
- Two models: `analysis/results.json` → `agreement`, dust median ratio 0.25, 9 Oct 2026 03:00 UTC
- Data study: `analysis/mechanisms.json` → `combustion`

## Open
- Media: time bar (`media/time-bar-monthly.jpg`, Nov 2025 monthly mean), model edge (`media/two-models-edge.jpg`, 16 Oct 2026 15:00 UTC, dust, ~34° N 6° E) and two study visuals were captured from the live site on 17 Oct 2026: the PM2.5 × CO local correlation map (`media/study-co-map.jpg`) and the fire photo with the smoke-vs-dust chart (`media/study-fire-dust.jpg`; photo NASA, ISS crew, public domain, from `air-pollution-map/public/study-img/fires.jpg`). Media cards: image centred with room around it, one short title below. Smoke photo credit is in the See it live credits. Directions use drawn sketches (`booths/directions.js`), not stills.
- Idle spin: a commit on 11 Oct makes the globe turn after 12 s untouched. Check whether that's still live.
