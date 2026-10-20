# Escher: case study storyline

Draft. Built from `../../../../escher-V7` (README, PRODUCT_BRIEF, sketches, apps). Follows the CourseHub structure: problem, then solution, then product, then how it's built, then reflection. Headings are plain nouns, and each body is 1 to 3 sentences.

Built as `index.html` + `escher.css`. Screens in `media/` come from the prototype's seeded demo estate. Screens of the Cloud estate view and the estate-header sketch were left out because they show a real account name and ID.

The page stays behind the password gate. Leave out customer names, design-partner names and anything from `.env` or `docs/_raw`.

---

## Hero
- **Title:** Escher
- **Line:** An AI interface for running a cloud estate. Ask about cost, security or reliability, and get an answer you can check and act on.
- **Facts:** Role: Product designer; built the entire prototype repo (design, sketches, prototype, design system, agent governance); now also builds the Tauri app frontend · Company: Tessell · Platforms: desktop app (product), web prototype (this work) · Team: two product designers · Year 2026
- **Visual:** the logo mark, then a scroll-pinned story like the OpenFOAM Studio cover: one question ("Are any of our S3 buckets actually public right now?") told in seven steps (Scan, Ask, Look up, Answer, Plan, Fix, Sync) on an isometric bench built with the Anatomy kit. Four machines joined by cables: your device (the app, plus the local estate as a drawer of index cards and the approval key), the Escher server (writes every script and answer), AWS (41 buckets, the account switch, and the CDN, export job and analytics that read them). The device runs every call with keys from its keychain. Plan shows three fixes with their blast radius painted on the tray: delete the bucket, block the account, make the bucket private. Data from the seeded S3 public-access and remediation stories. Built by `scripts/escher-hero.mjs`. The home screenshot moved to Ask.

## 01 The problem
Companies were forecast to spend $723 billion on public cloud in 2025, and nearly a third of it is wasted. When something breaks, the answer is spread across a dozen consoles, runbooks and people's heads. AI can answer fast, but no engineer will put an answer they can't check on call.

- **Stat row** (large numbers, CourseHub hero style):
  - **$723B**: public cloud spend in 2025 (Gartner)
  - **29%**: estimated share of that spend wasted (Flexera, 2026)
  - **84%**: organisations that call managing cloud spend their top challenge (Flexera, 2025)
  - **60%+**: outages that cost $100K or more (Uptime Institute, 2022)
- **Three labels:**
  - **Scattered:** cost, security and performance data live in separate tools.
  - **Untrusted:** confident prose isn't evidence.
  - **Manual:** fixes are still hand-written in Python, Bash and Terraform.
- **Closing line:** The data to fix all of this already exists. Nothing connects it, checks it and acts on it safely.
- Put the sources in small type under the stat row. Swap in Tessell's own numbers if there are any you can share.

## 02 Who it's for
A staff-level SRE who owns production reliability and writes the runbooks today. Their test is simple: would I put this on call?
- The same estate serves 7 roles: Admin, SRE, SecOps, DevOps, FinOps, Platform, Compliance.

## 03 The model
Every cloudops task is one of five steps: Design, Develop, Detect, Debug, Deploy. Building something new and fixing something broken both end at Deploy.
- **Diagram:** the D5E loop with its two arcs.
- **Three surfaces:** Reactive (an alert arrives with context), Interactive (ask anything), Proactive (Escher proposes work itself).

## 04 Principles
- **Grounded:** every claim cites live estate data, and missing data is said plainly.
- **Safe:** plans are reviewable diffs, with approval, dry run and rollback.
- **Earned trust:** each playbook moves from shadow to live on evidence, and one break-glass switch caps everything.

## 05 Sketches
Stakeholder ideas became HTML sketches people could click before any of them reached the prototype. 24 sketches, from knowledge base to model failover.
- **Visual:** horizontal strip, like CourseHub's wireframes. Pick 4 to 6: `turn-journey`, `rich-thinking`, `design-mode`, `execution-in-chat`, `kb-as-chat`, `notifications`.

## 06 Ask
Type a question and the answer comes back as interface: charts, tables and cards built for that question, each one citing its data.
- Before/after pair: a plain text answer vs a gen-UI answer.

## 07 Report
Reports run in two passes. The first finds the facts and the second writes them up, so the prose can't claim more than the data shows.

## 08 Plan and execute
A fix arrives as a plan you can read like a diff. You approve it, dry-run it and watch it run, with a record of why every step happened.

## 09 Design mode
Operators write playbooks by talking them through instead of scripting them. Imported runbooks become playbooks too.

## 10 Agents
Agents start in shadow mode, earn a scorecard, then go live one playbook at a time.

## 11 Design system
One token file builds CSS variables, a Tailwind theme and typed tokens, and every app reads from it. Change a colour once and every app picks it up. 89 semantic tokens (colour, space, radius, type, shadow), set in Geist and Geist Mono. Lay it out like CourseHub's colour, type and components section.

## 12 How it's built
- React + Vite, client-only, with a synthetic estate (the real product is a Tauri desktop app).
- Gen-UI over OpenUI Lang. Typed stores behind a Repository.
- pnpm + Turborepo monorepo: apps plus a shared design-system package.
- Share links in Vercel Blob. Password-gated deploy.

## 13 How we worked
One governed repo for people and AI agents: rules, an agent roster, issue-first changes and a decision log. Vision became sketches, and approved sketches became the prototype.
- This part is unusual, and it's probably the strongest section. Consider giving it more space.

## 14 Outcome
Tessell uses the prototype to demo Escher to potential customers and investors. Its frontend code moves straight into the Tauri app, so the prototype is a working spec as well as a demo.

## 15 What I learned
- **A bigger role.** I started as a product designer making a prototype. Now I build the frontend of the Tauri app as well.
- **A different process.** Design happens in working code instead of static mockups, and the sketch, the prototype and the shipped frontend are the same material.
- **A faster pace.** Ideas go from sketch to something people can click in days, not weeks.

Note: leave the layoffs off the page. "I now own the app's frontend" says the same thing without the backstory.
