// Escher case study: the "strictest rule wins" figure in the Agents section.
// Built with the Anatomy kit (wheresryan22/anatomy, MIT, vendored in anatomy-kit/).
// Writes projects/escher/anatomy.css and anatomy.js, and the figure's markup
// between <!--ill:stops--> and <!--/ill:stops--> in projects/escher/index.html.
//
//   node scripts/escher-anatomy.mjs
//
// The rule comes from escher-V7 DECISIONS #152: what an agent may do is the
// strictest of its own mode, the playbook's grant and the org-wide break-glass
// lever, which caps every agent at propose.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy-kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "projects", "escher");

const WIDTH = 600;
const HEIGHT = 300;
const AZIMUTH = 50;
const ELEVATION = 32;

const LEVELS = ["observe", "propose", "act with approval"];
const WHO = ["agent mode", "playbook", "break glass"];
const AT = [-30, 6, 42]; // the carriage's contact face at each level
const PARK = 72; // the break-glass stop when the lever is off: past act, so it never holds anything back
const LANES = [-28, 0, 28]; // agent mode, playbook grant, break glass, back to front

const PLATE = { x: -132, y: -74, w: 264, d: 148, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const RAIL_Y = [-50, 50];
const RAIL_FROM = -104;
const RAIL_TO = 110;

const CAR = { x: -41.2, y: -54, w: 40, d: 108, r: 3 }; // built with its contact face at x = 0
const CAR_Z = 8;
const CAR_TOP = 18;
const BUMPER = { x: -1.2, y: -38, w: 1.2, d: 76, r: 0.5 };

const STOP = { w: 16, d: 20, h: 20 };
const KNOB = [10, 0]; // thumb screw on top of each stop, relative to the stop
const DOCK = { x: PARK + STOP.w + 1, y: LANES[2] - 12, w: 20, d: 24, r: 2 };
const DOCK_H = 22;

const ABUT = { x: -100, y: -40, w: 8, d: 80, r: 1.5 };
const ABUT_H = 24;
const SPRING_Y = [-26, 26];
const SPRING_Z = 13;
const SPRING_R = 5.2;
const SPRING_TURNS = 11;
const SPRING_FROM = ABUT.x + ABUT.w;

const RULER = { x: AT[0] - 10, y: 60, w: AT[2] - AT[0] + 20, d: 7, r: 1 };
const ARM = { x: -2.5, y: 50, w: 5, d: 20, r: 1 };
const ARM_Z = CAR_Z;
const ARM_TOP = CAR_Z + 2.2;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...k.boxCorners(DOCK, 0, DOCK_H),
    ...k.boxCorners(ABUT, 0, ABUT_H),
    [AT[2] + KNOB[0], LANES[0], STOP.h + 6],
    [PARK + KNOB[0], LANES[2], STOP.h + 10],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZIMUTH, elevation: ELEVATION },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screw = (x, y, z, radius = 1.1) => L(k.ring(x, y, radius, z, P, 14), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const corners = k.corners(PLATE, 10);
  out.push(L(corners.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(corners.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // Ruler under the carriage's pointer: a major tick at each level.
  out.push(S(k.slabOf(RULER, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(AT[0], AT[2], 4, 9, RULER.y + 0.8, 0.6, [2, 4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([RULER.x + 3, RULER.y + 3.5, 0.6]), at([RULER.x + RULER.w - 3, RULER.y + 3.5, 0.6])], { size: 0.45 }));

  // Label plate.
  const label = { x: -94, y: 58, w: 40, d: 10, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  [[label.x + 6, 27], [label.x + 6, 20], [label.x + 6, 24]].forEach(([x, w], index) => {
    out.push(L(k.lineOnTop([x, label.y + 2.6 + index * 2.4], [x + w, label.y + 2.6 + index * 2.4], 0.8, P), { tone: "lo", free: true }));
  });
  out.push(D([at([label.x + 3, label.y + label.d / 2, 0.8]), at([label.x + label.w - 3, label.y + label.d / 2, 0.8])], { size: 0.4 }));

  // One slot per stop, each a closed groove.
  LANES.forEach((y, lane) => {
    const end = lane === 2 ? DOCK.x : AT[2] + STOP.w + 2;
    const slot = { x: AT[0] - 4, y: y - 3, w: end - (AT[0] - 4), d: 6, r: 3 };
    out.push(L(k.planOutline(slot, 0, P, 6), { tone: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(slot, 1.3), 0, P, 6), { tone: "faint" }));
  });
  return out.join("");
}

const railEnd = (y, x) =>
  S(k.slabOf({ x, y: y - 7, w: 6, d: 14, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }) + D([at([x + 3, y - 4, 8]), at([x + 3, y + 4, 8])], { size: 0.45 });

function rail(y, ends) {
  const out = [S(k.slabOf({ x: RAIL_FROM, y: y - 3, w: RAIL_TO - RAIL_FROM, d: 6, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" })];
  for (const x of ends) out.push(railEnd(y, x));
  return out.join("");
}

function abutment() {
  const out = [S(k.slabOf(ABUT, 0, ABUT_H, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(ABUT, 6, P, 3), { tone: "faint" }) })];
  out.push(D([-30, -10, 10, 30].map((y) => at([ABUT.x + ABUT.w / 2, y, ABUT_H])), { size: 0.45 }));
  // Spring seats: the coil starts on the inner ring.
  for (const y of SPRING_Y) {
    out.push(L(k.sideRing([ABUT.x + ABUT.w, y, SPRING_Z], SPRING_R + 1.6, "x", P), { tone: "faint" }));
    out.push(L(k.sideRing([ABUT.x + ABUT.w, y, SPRING_Z], SPRING_R, "x", P, 32), { tone: "lo" }));
  }
  return out.join("");
}

const springAt = (to) =>
  SPRING_Y.map((y) => k.coil(SPRING_FROM, to, [y, SPRING_Z], SPRING_R, SPRING_TURNS, "x", P));

function springs(to) {
  return springAt(to)
    .map((c, index) => `<g data-spring="${index}">${L(c.back, { tone: "lo" })}${L(c.front, { tone: "mid" })}</g>`)
    .join("");
}

function carriage() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(CAR, 4), CAR_Z, 0.1, P)}" style="filter:blur(5px)"/>`];
  // Bearing blocks on both rails, back pair first.
  for (const y of RAIL_Y) {
    for (const x of [-36, -16]) {
      const block = { x, y: y - 6, w: 12, d: 12, r: 1.5 };
      out.push(S(k.slabOf(block, 3, CAR_Z - 3, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(block, 5, P, 3), { tone: "faint" }) }));
    }
  }
  out.push(S(k.slabOf(CAR, CAR_Z, CAR_TOP - CAR_Z, P, 5, 0.8), { tone: "hi", crease: "lo", lit: true }));
  out.push(L(k.planOutline(k.insetPlan(CAR, 3), CAR_TOP, P, 4), { tone: "faint" }));
  for (const [x, y] of k.corners(CAR, 7)) out.push(screw(x, y, CAR_TOP));
  // Two T-slots along the carriage, and a knurled lock knob between them.
  for (const x of [-31, -13]) {
    const slot = { x: x - 2, y: -38, w: 4, d: 76, r: 2 };
    out.push(L(k.planOutline(slot, CAR_TOP, P, 4), { tone: "lo" }));
    out.push(L(k.planOutline(k.insetPlan(slot, 0.9), CAR_TOP, P, 4), { tone: "faint" }));
  }
  out.push(L(k.ring(-22, 0, 6.4, CAR_TOP, P, 32), { tone: "faint" }));
  out.push(S(k.cylinder(-22, 0, 5, CAR_TOP, 4, P, 32), { tone: "mid" }));
  out.push(L(k.knurl(-22, 0, 5, CAR_TOP, CAR_TOP + 4, 30, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([-22 - 3.4, 0], [-22 + 3.4, 0], CAR_TOP + 4, P), { tone: "hi" }));
  out.push(D([at([-22, 0, CAR_TOP + 4])], { size: 0.5, tone: "hi" }));
  // Bumper on the contact face, then the pointer arm over the ruler.
  out.push(S(k.slabOf(BUMPER, CAR_Z + 3, CAR_TOP - CAR_Z - 5, P, 2), { tone: "hi", crease: "lo" }));
  out.push(S(k.slabOf(ARM, ARM_Z, ARM_TOP - ARM_Z, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  out.push(L(k.lineOnTop([0, CAR.y + CAR.d], [0, ARM.y + ARM.d], ARM_TOP, P), { tone: "lit" }));
  out.push(D([at([0, ARM.y + ARM.d - 1.6, ARM_TOP])], { size: 0.55, tone: "hi" }));
  return out.join("");
}

function stop(lane) {
  const y = LANES[lane];
  const plan = { x: 0, y: y - STOP.d / 2, w: STOP.w, d: STOP.d, r: 1.5 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(plan, 2), 0, 0.1, P)}" style="filter:blur(3px);opacity:.5"/>`];
  out.push(S(k.slabOf(plan, 0, STOP.h, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(plan, 4, P, 3), { tone: "faint" }) }));
  out.push(screw(3, y - 6, STOP.h, 1), screw(3, y + 6, STOP.h, 1));
  const [kx] = KNOB;
  if (lane < 2) {
    // Thumb screw that locks the stop in its slot.
    out.push(L(k.ring(kx, y, 4.3, STOP.h, P, 24), { tone: "faint" }));
    out.push(S(k.cylinder(kx, y, 3.2, STOP.h, 3.6, P, 24), { tone: "mid" }));
    out.push(L(k.knurl(kx, y, 3.2, STOP.h, STOP.h + 3.6, 22, P), { tone: "lo" }));
    out.push(L(k.lineOnTop([kx - 2.2, y], [kx + 2.2, y], STOP.h + 3.6, P), { tone: "hi" }));
  } else {
    // Break-glass pull knob, ringed red.
    out.push(S(k.cylinder(kx, y, 1.8, STOP.h, 5, P, 18), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(kx, y, 4.6, STOP.h + 5, 4.4, P, 32, 0.4), { tone: "hi", crease: "lo" }));
    out.push(L(k.sideArc(kx, y, 4.6, STOP.h + 7.2, P, 24), { tone: "red" }));
    out.push(L(k.ring(kx, y, 2.6, STOP.h + 9.4, P, 24), { tone: "red" }));
  }
  return out.join("");
}

function endCap(lane) {
  const y = LANES[lane];
  const x = AT[2] + STOP.w + 2;
  return S(k.slabOf({ x, y: y - 7, w: 6, d: 14, r: 1 }, 0, 10, P, 3, 0.4), { tone: "mid" }) + D([at([x + 3, y - 4, 10]), at([x + 3, y + 4, 10])], { size: 0.45 });
}

function dock() {
  const out = [S(k.slabOf(DOCK, 0, DOCK_H, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(DOCK, 5, P, 4), { tone: "faint" }) })];
  const pane = k.insetPlan(DOCK, 4);
  out.push(S(k.slabOf(pane, DOCK_H, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(pane, 1.4), DOCK_H + 0.8, P, 3), { tone: "faint" }));
  for (const [x, y] of k.corners(DOCK, 2)) out.push(D([at([x, y, DOCK_H])], { size: 0.45 }));
  return out.join("");
}

const move = (x) => k.translateAlong(P, [x, 0, 0]);
const START = { levels: [2, 2], glass: false };
const startX = [AT[START.levels[0]], AT[START.levels[1]], PARK];
const carX = Math.min(...startX);

const stopLabel = (lane) => (lane < 2 ? `${WHO[lane] === "playbook" ? "Playbook grant" : "Agent mode"}: ${LEVELS[START.levels[lane]]}. Press to change.` : "Break glass: off. Press to pull.");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench rig. A spring pushes a carriage toward act with approval, and three stops in slots can hold it back: agent mode, playbook grant and break glass. The carriage rests on the strictest stop, and its pointer reads the level on a ruler.",
  body: [
    plate(),
    rail(RAIL_Y[0], [RAIL_FROM - 6, RAIL_TO]),
    abutment(),
    `<g data-part="springs">${springs(carX + CAR.x)}</g>`,
    rail(RAIL_Y[1], [RAIL_FROM - 6]),
    `<g data-part="carriage" transform="${move(carX)}">${carriage()}</g>`,
    `<g data-stop="0" tabindex="0" role="button" aria-label="${stopLabel(0)}" transform="${move(startX[0])}">${stop(0)}</g>`,
    endCap(0),
    `<g data-stop="1" tabindex="0" role="button" aria-label="${stopLabel(1)}" transform="${move(startX[1])}">${stop(1)}</g>`,
    endCap(1),
    `<g data-stop="2" tabindex="0" role="button" aria-label="${stopLabel(2)}" transform="${move(startX[2])}">${stop(2)}</g>`,
    dock(),
    railEnd(RAIL_Y[1], RAIL_TO), // after the dock, which it stands in front of
  ],
});

const plateMarkup = k.plateHtml({
  fig: "Fig 2",
  title: "Agent permission",
  hint: "Click a stop",
  readout: `${LEVELS[2]} · set by agent mode + playbook`,
  keys: [
    { mark: "lit", label: "Carriage: what the agent may do" },
    { mark: "raised", label: "Stops, back to front: agent mode, playbook grant, break glass" },
    { mark: "red", label: "Break-glass knob" },
  ],
  caption:
    "A spring pushes the carriage toward act with approval, and each stop can hold it back, so it always rests on the strictest one. The ruler reads observe, propose and act with approval, left to right. Break glass moves the front stop to propose for every agent at once.",
  body: `<div class="iso-stage">${svg}</div>`,
});

const markup = `<!--ill:stops--><div class="iso esc-iso" data-fig="stops" data-theme="dark">${plateMarkup}</div><!--/ill:stops-->`;

// Live code. The kit's camera and coil are copied in as source, so the page needs no kit bundle.
const tenth = `const tenth = (value) => { const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\\.0$/, ""); return text === "-0" ? "0" : text; };`;
const live = `// Generated by scripts/escher-anatomy.mjs. Do not edit by hand.
(() => {
const wrap = document.querySelector('.esc-iso[data-fig="stops"]');
if (!wrap) return;
const root = document.documentElement;
const system = matchMedia("(prefers-color-scheme: dark)");
const theme = () => { wrap.dataset.theme = root.dataset.theme || (system.matches ? "dark" : "light"); };
theme();
new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
system.addEventListener("change", theme);

const RADIANS = Math.PI / 180, UNIT = Math.sqrt(1.6);
${k.cameraOf.toString()}
${k.iso.toString()}
${k.depthOf.toString()}
${tenth}
${k.pathOf.toString()}
${k.coil.toString()}

const P = ${JSON.stringify(P)};
const AX = ${JSON.stringify(k.axisVector(P, [1, 0, 0]))};
const LEVELS = ${JSON.stringify(LEVELS)};
const WHO = ${JSON.stringify(WHO)};
const AT = ${JSON.stringify(AT)}, PARK = ${PARK}, CAR_BACK = ${CAR.x};
const SPRING = { from: ${SPRING_FROM}, y: ${JSON.stringify(SPRING_Y)}, z: ${SPRING_Z}, r: ${SPRING_R}, turns: ${SPRING_TURNS} };
const TOUR = [[2, 2, false], [2, 1, false], [0, 1, false], [0, 2, false], [2, 2, true]];
const LABELS = ["Agent mode", "Playbook grant"];

const svg = wrap.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const stops = [0, 1, 2].map((lane) => svg.querySelector('[data-stop="' + lane + '"]'));
const springs = [0, 1].map((index) => svg.querySelectorAll('[data-spring="' + index + '"] path'));
const readout = wrap.querySelector("[data-readout]");
readout.setAttribute("aria-live", "polite");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const state = { levels: [2, 2], glass: false };
const x = [AT[2], AT[2], PARK];
let carX = Math.min(...x), drawnCar = null;
let frame = 0, last = 0, clock = 0, step = 0, touring = !still.matches, visible = false, idle = 0;

const translate = (dx) => "translate(" + (dx * AX[0]).toFixed(2) + " " + (dx * AX[1]).toFixed(2) + ")";
const target = (lane) => (lane < 2 ? AT[state.levels[lane]] : state.glass ? AT[1] : PARK);
const limits = () => [state.levels[0], state.levels[1], state.glass ? 1 : 3];

function describe() {
  const limit = limits();
  const level = Math.min(...limit);
  const who = WHO.filter((_, lane) => limit[lane] === level);
  return { level, text: LEVELS[level] + " · set by " + who.join(" + "), binding: limit.map((value) => value === level) };
}

function label() {
  state.levels.forEach((level, lane) => stops[lane].setAttribute("aria-label", LABELS[lane] + ": " + LEVELS[level] + ". Press to change."));
  stops[2].setAttribute("aria-label", "Break glass: " + (state.glass ? "pulled, every agent capped at propose. Press to reset." : "off. Press to pull."));
}

function draw() {
  stops.forEach((el, lane) => el.setAttribute("transform", translate(x[lane])));
  carriage.setAttribute("transform", translate(carX));
  if (drawnCar === null || Math.abs(drawnCar - carX) > 0.02) {
    drawnCar = carX;
    SPRING.y.forEach((y, index) => {
      const c = coil(SPRING.from, carX + CAR_BACK, [y, SPRING.z], SPRING.r, SPRING.turns, "x", P);
      springs[index][0].setAttribute("d", c.back);
      springs[index][1].setAttribute("d", c.front);
    });
  }
}

function settle() {
  const now = describe();
  if (readout.textContent !== now.text) readout.textContent = now.text;
  now.binding.forEach((on, lane) => stops[lane].toggleAttribute("data-bind", on));
  label();
}

function tick(time) {
  const dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60;
  last = time;
  if (touring) {
    clock += dt;
    if (clock > 2.8) { clock = 0; step = (step + 1) % TOUR.length; apply(TOUR[step]); }
  }
  const ease = still.matches ? 1 : 1 - Math.exp(-dt / 0.24);
  let moving = false;
  x.forEach((value, lane) => {
    const goal = target(lane);
    x[lane] = Math.abs(goal - value) < 0.02 ? goal : value + (goal - value) * ease;
    if (x[lane] !== goal) moving = true;
  });
  // The spring keeps the carriage on whichever stop is nearest.
  carX = Math.min(...x);
  draw();
  frame = visible && (moving || touring) ? requestAnimationFrame(tick) : 0;
}

const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
function apply([agent, playbook, glass]) {
  state.levels = [agent, playbook];
  state.glass = glass;
  settle();
  run();
}

function touch(change) {
  touring = false;
  change();
  settle();
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) { touring = true; clock = 0; run(); } }, 8000);
  run();
}

stops.forEach((el, lane) => {
  const press = () => touch(() => {
    if (lane < 2) state.levels[lane] = (state.levels[lane] + 1) % 3;
    else state.glass = !state.glass;
  });
  el.addEventListener("click", press);
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); press(); return; }
    const left = event.key === "ArrowLeft" || event.key === "ArrowDown";
    const right = event.key === "ArrowRight" || event.key === "ArrowUp";
    if (!left && !right) return;
    event.preventDefault();
    touch(() => {
      if (lane < 2) state.levels[lane] = Math.max(0, Math.min(2, state.levels[lane] + (right ? 1 : -1)));
      else state.glass = left;
    });
  });
});

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "80px 0px" }).observe(wrap);
still.addEventListener("change", () => { if (still.matches) touring = false; });
settle();
draw();
})();
`;

const css = `/* Generated by scripts/escher-anatomy.mjs from the Anatomy kit (MIT). Do not edit by hand. */
${k.ISO_CSS}
/* Escher page: the plate sits on the page's panel colour, like the other diagrams. */
.esc-iso{margin-top:64px;--anatomy-mono:"Geist Mono",ui-monospace,"SF Mono",Menlo,monospace}
.esc-iso .iso-figure{margin:0}
.esc-iso .iso-plate{border-radius:20px;box-shadow:none;padding:64px 40px 56px}
.esc-iso .iso-plate-corners{inset:24px 28px}
.esc-iso .iso-svg{max-width:880px}
.esc-iso .iso-legend{margin-top:16px;max-width:760px;font-size:14px}
.esc-iso.iso[data-theme="dark"]{
  --anatomy-card:#1a1a1a;--anatomy-paper:#1a1a1a;--anatomy-face:#232323;--anatomy-top:#242424;
  --anatomy-shade-0:#151515;--anatomy-shade-1:#181818;--anatomy-shade-2:#1c1c1c;--anatomy-shade-3:#1f1f1f;
  --anatomy-lit-top:#303030;--anatomy-lit-shade:#262626;
  --anatomy-hi:#d8d8d8;--anatomy-mid:#737373;--anatomy-lo:#474747;--anatomy-faint:#313131;
  --anatomy-halo:#080808;--anatomy-halo-opacity:.85;--anatomy-text:#a8a8a8;--anatomy-muted:#727272;--anatomy-red:#fa504a;
}
.esc-iso.iso[data-theme="light"]{
  --anatomy-card:#f7f7f5;--anatomy-paper:#f7f7f5;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#d9d9d6;--anatomy-shade-1:#e2e2df;--anatomy-shade-2:#eaeae7;--anatomy-shade-3:#f1f1ee;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#ebebe8;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b2b2b6;--anatomy-faint:#d2d2d4;
  --anatomy-red:#e5484d;
}
/* Stops are buttons. The one holding the carriage back brightens. */
.esc-iso [data-stop]{cursor:pointer;outline:none}
.esc-iso [data-stop] .iso-edge{transition:stroke .3s var(--anatomy-ease)}
.esc-iso [data-stop][data-bind]>.iso-solid:nth-of-type(1)>.iso-edge{stroke:var(--anatomy-hi)}
.esc-iso [data-stop]:focus-visible>.iso-solid>.iso-edge{stroke:var(--anatomy-lit)}
@media (hover:hover){.esc-iso [data-stop]:hover>.iso-solid:nth-of-type(1)>.iso-top{fill:var(--anatomy-lit-top)}}
@media (max-width:600px){.esc-iso .iso-plate{padding:52px 4px 96px;overflow:hidden}.esc-iso .iso-svg{width:116%;margin-left:-8%}.esc-iso .iso-plate-corners{inset:18px 16px}.esc-iso .iso-plate-corner[data-corner="hint"]{bottom:44px}.esc-iso .iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;line-height:1.5}}
`;

const previewAt = process.argv.indexOf("--preview");
if (previewAt > 0) {
  const dir = process.argv[previewAt + 1];
  for (const theme of ["dark", "light"]) {
    const bg = theme === "dark" ? "#121212" : "#fff";
    const html = `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Stops</title><style>${css}body{margin:0;background:${bg};font-family:Arial,sans-serif}main{max-width:1088px;margin:0 auto;padding:40px}</style></head><body><main>${markup}</main><script>${live}</script></body></html>`;
    writeFileSync(join(dir, theme === "dark" ? "stops.html" : "stops-light.html"), html);
  }
}

writeFileSync(join(OUT, "anatomy.css"), css);
writeFileSync(join(OUT, "anatomy.js"), live);

const pagePath = join(OUT, "index.html");
const page = readFileSync(pagePath, "utf8");
const marked = /<!--ill:stops-->[\s\S]*?<!--\/ill:stops-->/;
if (!marked.test(page)) throw new Error("index.html has no <!--ill:stops--> markers");
writeFileSync(pagePath, page.replace(marked, () => markup));
console.log("wrote anatomy.css, anatomy.js and the figure in index.html");
