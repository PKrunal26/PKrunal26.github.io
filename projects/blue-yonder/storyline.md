# Sustainable Supply Chain — storyline

Source: `~/Downloads/Blue yonder, sustainable supply chain/merged pdf.pdf` (10 pages, Team 11).
Blue Yonder's brief at Inter IIT Tech Meet. Edition and result not in the report; confirm with Krunal.

The report's own order (overview, problem tables, solutions, timeline) was hard to follow, so the page follows
the goods instead: each stage of the chain is a chapter, and each chapter pairs its problems with the fix.

## Order

Hero: title, lede, facts. Journey cover: the five chapter dioramas in a row, each a link to its chapter.

Intro
- Brief: pandemic, speed and cost over carbon; five-year plan; COP26 targets (added, sourced).
- Scale (Fig 1 waffle): 35 Gt; China 11,680, US 4,535, India 2,412 Mt; 30% GMV lost; 660,788 t plastic.
- Approach: map, diagnose, rank, solve, phase.
- Carbon by stage (Fig 2): the report's chain, circles sized as drawn; pills light each chapter's stages.
- Problems and fixes (Fig 3): nine problems to five solutions, in chapter order (my mapping).

Chapters. Each: cover band (number, title, one line, chain locator, link to the fix, isometric cover),
then Today (process map), Problems (cards with every lens from the report), the fix, strategic fit.
1. Leaving the plant: transport map; unused truck space, pallets 14.43%; sustainable tertiary packaging.
2. In the warehouse: warehouse stages; digitisation, automation, storage; WMS and pick path.
3. Packing the order: packaging layers; single-use plastic, packaging design; convertible delivery bag.
4. The last mile: routes, pickups; day-before message and delivery day.
5. Coming back: returns process; no circular alternatives, deadstock (20%, 16 Mt); waste management.

Plan: cover (rollout as blocks), Timeline (Fig 17), Rollout (Fig 18), Impact table, Outcome.

## Data notes
- Grade C is 15% (report prints 35%; totals only add up at 15%).
- Tertiary packaging uses the table split 14 / 24.75 / 61.25 (report's gantt shows 14 / 28.5 / 57.5).
- "Saves 99.1% of volume" reworded as cartons get 99.1% of the load space.

## Covers
`node scripts/blue-yonder-covers.mjs` writes `covers/*.svg` and `covers.css` (Anatomy kit, page inks, one tinted
subject per scene). by.js fetches each cover as it nears the viewport.
