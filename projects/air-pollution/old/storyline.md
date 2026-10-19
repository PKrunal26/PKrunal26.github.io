# Air Atlas — project page storyline

The Air Atlas page on the personal website, read top to bottom as you scroll. (The markup uses `slide` / `deckpage` class names for layout only. This is a web page, not a deck.)

## The arc

**One dot → the whole world → back to you.**

Today the page reads like a feature list (globe, dots, ink, readout, search). Each section works alone, but nothing says *why*. As you scroll, the new arc gives every section a job:

| Beat | Job | Section |
|---|---|---|
| Hook | Air is invisible, yet it's measured everywhere | 01 Hero (live globe) |
| Problem | The data exists, free, but nobody sees it | 02 One dot (interactive) |
| Idea | Borrow print: how newspapers turned dots into pictures | 03 A screen of dots |
| Zoom out | Many dots become the whole atmosphere | 04 Halftone globe |
| Depth | Many pollutants, one image, honest mixing | 05 Ink that mixes |
| Zoom in | Every dot holds a number | 06 Read any point |
| Bring it home | Your city, against the WHO guideline | 07 Fly to a city |
| Honesty | What this is, and isn't | 08 (new, optional) |
| Close | Open the live site | 09 See it live |

Order change: **move "A screen of dots" above "Halftone globe"**. As you scroll, one dot → a screen of dots → a world of dots reads as one continuous zoom-out. Then 06–07 zoom back in.

---

## Section copy

Format: **eyebrow** (small grey label, optional) · **heading** · **body**. The same text goes in each section's `.cap` block, which carries the copy at mobile widths.

### 01 · Hero (`#cover`)
- **Heading (h1):** Air Atlas
- **Body:** What is in the air, printed as halftone ink. *(keep)*
- Alt body: *The air you can't see, printed so you can.*
- Layer line and drag hint: keep as is.

### 02 · One dot (`#unseen`)
- **Eyebrow:** The problem
- **Heading:** Air is measured everywhere and seen almost nowhere.
- **Body:** Every day, Copernicus models the whole atmosphere and publishes it for free. It arrives as grids of numbers. Here is one: fine particles over Delhi, printed as a single dot. Change the value or the pollutant and watch the dot answer.

> Replaces "A lot of public data goes unseen." Same idea, but it names the stakes (air) and points at the interaction.

### 03 · A screen of dots (`#dots`), moved up
- **Eyebrow:** The idea
- **Heading:** Borrowed from print.
- **Body:** Newspapers printed photographs with one ink and dots of different sizes. Your eye did the rest. Air Atlas uses the same rule: more in the air, bigger dot.

> Replaces the current line, which runs on and has grammar slips ("misaligned just like comics to create mix of colors…"). The comic-book offset idea moves to section 05, where it belongs.

### 04 · Halftone globe (`#globe`)
- **Eyebrow:** Zoom out
- **Heading:** One hour of the whole sky.
- **Body:** Put enough dots on a sphere and they turn into weather: dust lifting off the Sahara, haze settling over northern India. The globe holds that moment still. It moves only when you drag, zoom or search.

> Check the dust and haze examples against what's visible in the video. Swap in what's actually there.

### 05 · Ink that mixes (`#ink`)
- **Eyebrow:** Layers
- **Heading:** Every pollutant gets its own ink.
- **Body:** Like a comic printed in cyan, magenta and yellow, each pollutant sits on its own plate, set at its own angle. Where dust meets fine particles, the dots sit side by side and your eye mixes them. The result is the same in whatever order you turn the layers on.

### 06 · Read any point (`#readout`)
- **Eyebrow:** Zoom in
- **Heading:** Every dot has a number behind it.
- **Body:** Hover anywhere for the model values under the pointer, each one checked against WHO guidelines. Click to pin it.

### 07 · Fly to a city (`#city`)
- **Eyebrow:** Bring it home
- **Heading:** Start with where you breathe.
- **Body:** Search 237 cities offline, or type coordinates. The camera arcs around the Earth and lands on the latest estimate. New Delhi, the morning this was recorded: fine particles at 68.7 µg/m³, 4.6 times the WHO daily guideline.

> The number gives the section its sting. 68.7 ÷ 15 µg/m³ (WHO 24-hour PM2.5) = 4.58, so 4.6× checks out.

### 08 · What this is, and isn't (new, optional)
Could be a short text-only dark section, or folded into 09.
- **Eyebrow:** A note on the data
- **Heading:** A model, not a sensor.
- **Body:** These are estimates from an atmospheric model, about 45 km per cell (11 km over Europe). One street can be cleaner or dirtier than its cell. Use the atlas to see patterns, not to decide whether to open a window today.

### 09 · See it live (`#close`)
- **Eyebrow:** See it live
- **Heading:** pkrunal26.github.io/air-pollution-map *(keep the link)*
- **Body:** Turn it, search your city, stack the inks. *(If section 08 stays out, keep the current "Modeled estimates…" line here instead.)*
- Credits: keep as is.

---

## Short-form copy

**Home page project card (one line)**
What is in the air, printed as halftone ink.

**`<meta name="description">` (~40 words)**
Air Atlas turns the Copernicus atmosphere forecast into a halftone globe. Each pollutant prints as its own ink, and dot size shows how much is in the air. Drag it around, read any point, or fly to your city.

**Social post when sharing the link (~25 words)**
Air is measured everywhere and seen almost nowhere. I printed the whole atmosphere as halftone ink: one plate per pollutant, dot size for concentration. Try your city ↓

---

## Voice rules (from the current page)
- Short, plain sentences. No adjectives doing the work data should do.
- Say "fine particles" in prose and "PM2.5" in labels and readouts.
- Always "estimate" or "model". Never "reading" or "measurement".
- One idea per section. If the body needs "and also", split it.

## Open checks before shipping
- [ ] Dust and haze examples in section 04 match the video.
- [ ] "Every hour" (section 02) is true of CAMS via Open-Meteo for the source you use. Soften to "Several times a day" if unsure.
- [ ] Include section 08 or fold it into 09.
- [ ] Eyebrows are optional. Try one on a single section first and see whether it clutters the layout.
