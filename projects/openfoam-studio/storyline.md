# OpenFOAM Studio: case study storyline

Draft. Built from `../../../../openfoam studio private` (README, `wiki/vision.md`, `wiki/project-log.md`, `docs/ARCHITECTURE.md`, `docs/TOOLS.md`, `docs/AGENT_PIPELINE.md`, `docs/UI_SPEC.md`, `docs/research-summary.md`, `REDDIT_POST.md`, `core/` source, git history) and the landing page in `../../../../openfoam_studio_landing`. Same structure as Escher: problem, then solution, then product, then system design, then reflection. Headings are plain nouns, and each body is 1 to 3 sentences.

The page has two halves. Sections 01 to 11 are the product. Sections 12 to 19 are the system design, which is where most of the work went. Give the second half the same weight as the first: diagrams, not bullet lists.

Built as `index.html` + `openfoam-studio.css`, replacing the current "coming soon" page. Screens in `media/` come from the `phase*.png` captures in the repo root.

Check the `byok-*.png` and `settings-modal-open.png` screens for API keys before using them.

---

## Hero
- **Title:** OpenFOAM Studio
- **Line:** A desktop app for running CFD simulations. Describe the flow in plain English, and it writes the case, runs the real OpenFOAM solver and checks the result.
- **Facts:** Role: Design, frontend and backend, solo · Type: Personal project, open source (MIT) · Platforms: macOS and Windows desktop app · Stack: Electron, React, Node, OpenFOAM 13 in Docker · Year: 2026 (April to July)
- **Visual:** the app with a solved lid-driven cavity in the Results tab: file tree, editor, chat and the coloured velocity field.

## Quote
> Whatever job you end up doing, find a way to contribute to the field you graduated in.

Prof. Gautam Barua, former Director, IIT Guwahati, at our graduation tea party.

- Set it large, alone, between the hero and 01.
- Note: this is a paraphrase. I couldn't find a published version, so check the wording against what you remember. If it isn't close to his words, drop the quote marks and write "Prof. Gautam Barua told us…" instead.

## 01 The problem
OpenFOAM is one of the most capable CFD solvers there is, and one of the hardest to use. An engineer can describe a case in one sentence. OpenFOAM needs it as a folder of plain text files with no schema, and the files have to agree with each other.
- **Figure (case wall, `problem.js`):** the prompt, then counts (8 files, 349 lines, 0 checked before a run), then every line of the real cavity case (project 82a55a15) as one bar. Three views:
  - **Files:** the eight files and what each holds.
  - **Links:** seven things that must agree across files (boundary names, 2D, Reynolds number, Courant number, field names, pressure reference, solver), drawn as threads between the real lines.
  - **Failures:** four failed runs from the app's history (no pressure reference, no final-pass solver, faces in made-up syntax, no controlDict), with the commands that ran, the log length and the real `FOAM FATAL` error. The cause is marked in the wall.
- Data: `media/problem.json`, built by `scripts/openfoam-problem.py`.
- **Origin:** I first hit this during my bachelor's thesis, then saw students in a CFD course get stuck the same way. I work in product design now, and this project is my contribution back to that field.
- **Closing line:** The hard part is the tooling, not the physics.

## 02 Who it's for
Mechanical and aerospace engineers who understand fluid dynamics but don't want to become OpenFOAM configuration specialists. Also researchers who need quick parametric sweeps (Reynolds number, geometry, turbulence model) without writing boilerplate case files for each run.
- **Not for:** people who need GUI meshing or CAD import. That is a different problem.

## 03 Research
Before building the agent, I read four papers on LLMs for CFD: MetaOpenFOAM, Foam-Agent 2.0, ChatCFD and CFDLLMBench. All four landed on the same loop: plan, generate, run, review. The review step mattered most.
- **Stat row:**
  - **85% → 27.5%**: MetaOpenFOAM success rate with and without its reviewer
  - **+30 pts**: success the reviewer adds in Foam-Agent 2.0, beyond file ordering alone
  - **6 to 7**: interdependent files in a typical case, 300 to 600 lines
- Put the paper names and arXiv IDs in small type under the stat row.

## 04 The model
Every simulation goes through five steps: Plan, Generate, Run, Review, Validate. If a run fails, Review sends it back to Generate with a fix.
- **Diagram:** the five steps in a row, with a loop arrow from Review back to Generate (max 3 loops).
- Matches the landing page's Workflow section, so the two can share the drawing.

## 05 Principles
- **Inspectable:** the AI writes dictionaries, not results. Every file is open in the editor before it runs.
- **Real solver:** no surrogate model and no predicted flow field. `blockMesh`, `foamRun` and `foamToVTK` run in a container.
- **Correct, not just running:** a case that converges to the wrong answer is worse than one that fails loudly.
- **Local:** everything runs on your machine, and the agent never gets a raw shell.

## 06 Describe
Type a case in plain English, like "lid-driven cavity, Re=100, 2D, run for 0.5 s". The agent writes the case files in dependency order, so patch names in the mesh match every boundary condition. Follow-up messages change only the files that need it.
- **Visual:** `phase3-chat-hydrated.png`.

## 07 Inspect
The layout borrows from code editors: file tree on the left, Monaco editor in the middle, chat on the right. Files open as the agent writes them, and a Parameters tab turns the main values into fields you can edit without touching syntax.
- **Visuals:** `phase2-monaco-open.png`, `phase6-params.png`.

## 08 Run
Runs happen inside an OpenFOAM 13 Docker container, with the log and a residual chart streaming live. Each run is saved to a history you can reopen.
- **Visuals:** `phase4-run-active.png`, `phase5-residual-fixed.png`.

## 09 Recover
When a run fails, the app reads the log, explains the likely cause and proposes a fix as a diff. You approve it before anything re-runs.
- **Visual:** `phase4-diagnosis.png`.
- Before/after pair: the raw `FOAM FATAL ERROR` log vs the diagnosis card.

## 10 Results
Solved cases open in a 3D viewer inside the app, modelled on ParaView and ANSYS CFD-Post. A result is a pipeline: the mesh coloured by any field, then slices, clips, iso-surfaces, streamlines and vector glyphs, each with its own settings, played over every saved time.
- **Figure (viewer, `results.js`):** a 2D copy of the Results tab running on three real runs: cylinder (21 saved times), cavity (31) and the Bad Apple!! VoF stress test (24). Pipeline with eye toggles (internalMesh, streamlines, vector glyphs, iso-lines, line probe), properties (colour by, colormap, range, representation), time playback and a point probe.
- Data: `media/results/*.png` atlases and `*.json`, built by `scripts/openfoam-results.py`.
- Below it, the step and channel runs as two strips.

## 11 Setup
Docker and a model key are the two things that stop people on day one. A health check runs on first launch, checks Docker, the OpenFOAM image and the model login, and repairs what it can. Bring your own key (Anthropic, OpenAI, Google) or point it at a local model through Ollama.
- **Visuals:** `health-check-ui.png`, `byok-ollama.png` (check for keys first).

---

## 12 Architecture
The app has three layers. Electron starts a local Node server on port 3456, and the React UI talks to it over REST, with live streams over server-sent events. All the real work lives in `core/`, plain Node with no Electron in it, so the whole pipeline runs and tests without a window.
- **Diagram:** four boxes left to right: Renderer (React) → Server (`demo/server.ts`) → Core (agent, Docker, recovery, post-processing) → Docker (OpenFOAM 13). Label the first arrow "REST + SSE" and the last "dockerode". Under Core, a second row: LLM providers and the docs index.
- **Why three layers:** the UI also runs in a plain browser with a mocked backend, and every core module has unit tests.

## 13 Agent loop
Generation is a tool-calling loop, not one big prompt. The model gets eight tools (list, read, write and edit case files, search and read the docs, run a command, finish) and works until it calls `finish` or hits 16 steps. Its instructions tell it to save the last few steps for `blockMesh`, `checkMesh` and a short solver run, so it tests a case before calling it done.
- **Diagram:** a loop: model → tool call → result → model, with an exit arrow to `finish` and a counter showing "16 steps max".
- **Two engines:** API-key providers go through the Vercel AI SDK. The `claude-cli` option uses the person's own Claude Code login, so it works with no key at all.
- **Safe file writes:** every write is path-guarded to the case folder and converts line endings to LF.

## 14 Knowledge
The agent looks things up instead of relying on memory. A keyword index (FlexSearch) covers 48 scraped OpenFOAM 13 doc pages and 18 wiki pages, split at headings. Search returns the source path, so the agent can read the full page and cite it.
- **Why no vector database:** the corpus is small, and exact keyword hits with a source path worked better than embeddings for OpenFOAM's very specific vocabulary.
- **Visual:** a search for "UFinal" returning three hits, each with a path and heading.

## 15 Sandbox
Every solver command runs in a fresh container with only the case folder mounted, and the container is removed when the command ends. Commands are checked against an allowlist of eight OpenFOAM tools in code, not in the prompt, and every argument is shell-escaped. Cancelling a run kills the container.
- **Allowlist chip row:** `blockMesh` `checkMesh` `setFields` `foamRun` `foamToVTK` `icoFoam` `simpleFoam` `pimpleFoam`
- **Detail worth one line:** Windows paths broke the usual `src:dst` Docker bind, because of the colon in `C:\`, so mounts use an explicit mount object.

## 16 Recovery
Recovery has two tiers. Known failures (a missing `UFinal` entry, an unknown boundary type, no pressure reference, a Courant number that's too high, missing `phaseProperties`) are matched by pattern and fixed by set rules. Anything else goes to an LLM reviewer, which returns a corrected file or says it can't identify the problem instead of guessing.
- **Diagram:** log → pattern match → (known) rule fix / (unknown) LLM reviewer → fix as a diff → your approval → re-run. Mark the cap of 3 retries per run.
- **Why two tiers:** common errors get the same correct fix every time, with no model call, and the model handles only the long tail.

## 17 Storage and streams
There's no database. Each project is a folder: `meta.json` with the chat history, the `case/` directory, `runs.jsonl` and `commands.jsonl` as append-only logs, and one log file per run. Generation, runs and health repairs all stream to the UI as server-sent events.
- **Why files:** an OpenFOAM case is already plain files, so a user can open the same folder in ParaView or a terminal and nothing is locked inside the app.
- **Visual:** the project folder as a file tree.

## 18 Results pipeline
After a run, `foamToVTK` converts every time step inside the container. The server builds a manifest of time steps and patches, and the UI fetches each step on demand. vtk.js has no reader for legacy unstructured VTK, so I wrote a parser, extracted the outer surface and cached parsed steps so scrubbing through time never re-reads from disk.
- **Diagram:** case → `foamToVTK` (Docker) → `VTK/*.vtk` → manifest API → parser → surface extract → cache → vtk.js.
- **Detail worth one line:** all vtk.js code sits behind one `ResultsEngine` class, and the viewer recovers from a lost WebGL context instead of going blank.

## 19 Stack and release
- Electron, Vite, React, TypeScript, Zustand, Monaco, vtk.js.
- Node server with REST and SSE, `dockerode`, Vercel AI SDK, FlexSearch.
- Vitest, with 25 test files across unit tests and stages 0 to 5.
- GitHub Actions builds a macOS DMG and a Windows installer and publishes them to GitHub Releases.

---

## 20 Validation
Physics is in the test suite. One stage runs the lid-driven cavity and compares centreline velocity with Ghia et al. (1982), and a physics regression fails the build.
- **Stat:** **3.2%** max deviation from Ghia.
- **Visual:** a chart of the app's velocity profile over the Ghia data points.

## 21 How I worked
I built it with AI coding agents, in stages. No layer started until the layer below it passed its tests: Docker, then file generation, then mesh, then solver, then physics, then conversation and recovery. A markdown wiki of OpenFOAM knowledge and an agent change log kept every session grounded.
- **Visual:** stages 0 to 5 as a row of pass marks, with test counts for stages 0 to 4 (5, 4, 3, 3, 3).
- Like Escher, this is probably the strongest section. Consider giving it more space.

## 22 Outcome
Version 1.0.2 is out on GitHub for macOS and Windows, MIT-licensed. It's validated on the lid-driven cavity and works best on incompressible laminar cases for now.
- **Next:** I'm sharing it with a professor for feedback.
- Note: update this section after the professor replies (late October 2026). A quote or "used in a course" would be stronger than any number.

## 23 What I learned
- **End to end.** Every project before this was product design only. This is the first one I took from problem to shipped software: design, code, tests, packaging and release.
- **Systems, not screens.** Most decisions were about where the safety lives: in code, not the prompt; in rules for known errors, the model only for the rest.
- **Correct over working.** Using a benchmark as the pass gate changed what "done" meant.
