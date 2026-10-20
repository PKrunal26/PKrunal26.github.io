// Escher case study: two static bench figures, built with the Anatomy kit
// (wheresryan22/anatomy, MIT, vendored in anatomy-kit/).
//
// - problem: seven tools on one bench, each holding part of the answer, with six
//   loose cables and nothing to plug them into.
// - outcome: one frontend, a cartridge in a dock, wired to a demo screen and to a
//   laptop running the Tauri app. Both screens show the same interface.
//
// Writes projects/escher/figures.css and figures.js, and each figure's markup
// between <!--ill:NAME--> and <!--/ill:NAME--> in projects/escher/index.html.
//
//   node scripts/escher-figures.mjs                  build
//   node scripts/escher-figures.mjs --preview <dir>  also write standalone preview pages

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy-kit/iso-kit.mjs";
import * as G from "./anatomy-kit/lathe.mjs";
import * as A from "./anatomy-kit/audit.mjs";
import { tubePieces, tubeSvg } from "./anatomy-kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "projects", "escher");
const t1 = (n) => Math.round(n * 10) / 10;

// ── Shared drawing helpers, bound to one projection.
function bench(P, prefix) {
  const at = (point) => k.iso(point, P);
  const KS = G.scaleOf(P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const R = A.recorder(P);
  const rec = R.solid;
  const put = (name, ref, svg, shapes = [], { bias = 0, ...rest } = {}) => R.put({ name, at: ref, bias, svg, shapes, piece: prefix, ...rest });
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const screw = (x, y, z, radius = 1.1) => L(k.ring(x, y, radius, z, P, 14), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });
  const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
  const sideOf = (x) => k.sideMatrix([x, 0], 0, P, "right");
  const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
  const frontSlot = (y, x0, x1, z, half = 0.7) => k.pathOf(k.roundedPlan({ x: x0, y: z - half, w: x1 - x0, d: half * 2, r: half }, 4).map(([u, w]) => at([u, y, w])), true);
  const sideSlot = (x, y, z0, z1, half = 0.7) => k.pathOf(k.roundedPlan({ x: y - half, y: z0, w: half * 2, d: z1 - z0, r: half }, 4).map(([u, z]) => at([x, u, z])), true);
  const box = (plan, z, h, style = {}, steps = 3, bevel = 0) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style });
  const boxShape = (name, plan, z, h, steps = 3) => rec(A.slab(plan, z, h, { name }, steps));
  const cyl = (x, y, r, z, h, style = {}, steps = 28, bevel = 0) => S(k.cylinder(x, y, r, z, h, P, steps, bevel), { tone: "mid", ...style });
  const cylShape = (name, x, y, r, z, h) => rec(A.cylinder(x, y, r, z, h, { name }));

  // A recess in a face at constant y (from the desk-computer example, as in the hero).
  let clips = 0;
  function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = `${prefix}-well`, inside = "") {
    const id = `${prefix}-clip-${clips++}`;
    const ringPts = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const { sinA } = k.cameraOf(P);
    const tops = [];
    const sides = [[], [], [], []];
    ringPts.forEach(([ax, az], index) => {
      const [bx, bz] = ringPts[(index + 1) % ringPts.length];
      const length = Math.hypot(bx - ax, bz - az) || 1;
      let [nx, nz] = [(bz - az) / length, -(bx - ax) / length];
      if (nx * (cx - (ax + bx) / 2) + nz * (cz - (az + bz) / 2) < 0) [nx, nz] = [-nx, -nz];
      if (nx <= 0 && nz <= 0) return;
      const quad = k.pathOf([at([ax, y, az]), at([bx, y, bz]), at([bx, y - depth, bz]), at([ax, y - depth, az])], true);
      if (nz >= nx) tops.push(quad);
      else sides[Math.min(3, Math.max(0, Math.floor(((nx * -sinA + 1) / 2) * 4)))].push(quad);
    });
    const shape = flat(x0, z0, x1, z1, r);
    return [
      `<clipPath id="${id}"><path transform="${planeOf(y)}" d="${shape}"/></clipPath>`,
      `<g clip-path="url(#${id})">`,
      `<path class="iso-top" d="${tops.join("")}"/>`,
      ...sides.map((d, shade) => (d.length ? `<path class="iso-shade" data-shade="${shade}" d="${d.join("")}"/>` : "")),
      `<g transform="${planeOf(y - depth)}"><path class="${backClass}" d="${shape}"/>${back}<path class="iso-line" data-tone="faint" d="${shape}"/></g>`,
      inside,
      `</g>`,
      `<g transform="${planeOf(y)}"><path class="iso-line" data-tone="lo" d="${shape}"/></g>`,
    ].join("");
  }

  // Base plate on feet, with a groove, corner screws and a label plate.
  function plate(PLATE, PLATE_H, FOOT_H, label) {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(cyl(x, y, 7, -PLATE_H - FOOT_H, 1.6, { tone: "lo" }));
      out.push(cyl(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const screws = k.corners(PLATE, 10);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    if (label) {
      out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
      out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
      out.push(L([30, 22, 14].map((w, i) => k.lineOnTop([label.x + 5, label.y + 3.6 + i * 2.6], [label.x + 5 + w, label.y + 3.6 + i * 2.6], 0.8, P)).join(""), { tone: "lo", free: true }));
      out.push(D([at([label.x + label.w - 3.4, label.y + 3, 0.8]), at([label.x + label.w - 3.4, label.y + label.d - 3, 0.8])], { size: 0.45 }));
    }
    return out.join("");
  }

  // A cable: a gland on its port, a filleted tube lying on the plate, and an end.
  // `plug` puts a loose plug on the end; otherwise the cable ends in a gland on `to`.
  function cable(name, points, { r = 1.1, bend = 5, tone = "mid", glandAt = 0, plug = false, gland = true, endGland = false } = {}) {
    const route = G.fillet(points, Math.max(bend, r * 2.6), 10, { P, tube: r });
    const total = G.pathLength(route);
    const pieces = tubePieces(route, r, P, { maxLength: 26, spacing: 1.2 });
    pieces.forEach((piece, index) => put(`${name}:${index}`, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { bias: 0.02, route: name, chunk: index }));
    const glandOn = (end, tangent, label) => {
      const F = G.frameAlong(end, tangent);
      const shape = rec(A.disc(F, 0, 2.2, r * 1.7, { name: `${name}.${label}` }));
      put(`${name}.${label}`, G.add3(end, G.mul3(tangent, 1.1)), S(G.disc(0, 2.2, r * 1.7, F, P, { steps: 24, bevel: 0.2 }), { tone: "mid" }) + L(G.arcOf(F, 1.1, r * 1.7, P), { tone: "faint" }), [shape], { bias: 0.1 });
    };
    if (gland) glandOn(route[0], G.tangentAlong(route, 0), "gland");
    const end = route[route.length - 1];
    const tangent = G.tangentAlong(route, total);
    if (endGland) glandOn(end, G.mul3(tangent, -1), "gland2");
    if (plug) {
      // A plug lying on the plate, its body along the cable's last leg, two prongs out.
      const a = G.unit3([tangent[0], tangent[1], 0]);
      const F = G.frameOf([end[0], end[1], 0], a, [-a[1], a[0], 0], [0, 0, 1]);
      const bodyPoly = [[-2.6, 0], [2.6, 0], [2.6, 3.2], [-2.6, 3.2]];
      const grip = [[-2.1, 0.4], [2.1, 0.4], [2.1, 2.8], [-2.1, 2.8]];
      const shapes = [rec(A.prism(F, bodyPoly, 1.4, 7.4, { name: `${name}.plug` })), rec(A.prism(F, grip, 0, 1.4, { name: `${name}.boot` }))];
      const prong = (u) => [[u - 0.4, 1.1], [u + 0.4, 1.1], [u + 0.4, 2.1], [u - 0.4, 2.1]];
      let svg = S(G.prismOf(F, grip, 0, 1.4, P), { tone: "lo" });
      svg += S(G.prismOf(F, bodyPoly, 1.4, 7.4, P), { tone: "mid" });
      svg += L(k.pathOf([G.pointOf(F, 4.4, 0, 0), G.pointOf(F, 4.4, 0, 0)].map(at)), { tone: "faint" });
      for (const u of [-1.2, 1.2]) {
        shapes.push(rec(A.prism(F, prong(u), 7.4, 10.4, { name: `${name}.prong` })));
        svg += S(G.prismOf(F, prong(u), 7.4, 10.4, P), { tone: "hi" });
      }
      put(`${name}.plug`, G.add3([end[0], end[1], 1.6], G.mul3(a, 4)), svg, shapes, { bias: 0.15 });
    }
    return route;
  }

  return { at, KS, S, L, D, R, rec, put, byDepth, screw, planeOf, sideOf, flat, frontSlot, sideSlot, box, boxShape, cyl, cylShape, recess, plate, cable };
}

function emit(R, P, back, front = []) {
  A.settle(R, P);
  if (process.env.SIZES) {
    const rows = [...R.items.map((item) => [item.name, item.svg.length]), ...back.map((svg, i) => [`back${i}`, svg.length])].sort((a, b) => b[1] - a[1]);
    console.log(rows.slice(0, 14).map(([n, l]) => `${n} ${(l / 1024).toFixed(1)}KB`).join("\n"));
  }
  R.items.sort((a, b) => a.key - b.key);
  return [...back, ...R.items.map((item) => item.svg), ...front];
}

// ════════════════════════════════════════════════════════════════════════════
// Problem: seven tools on one bench, and nothing connects them.
// ════════════════════════════════════════════════════════════════════════════
function problemFigure() {
  const WIDTH = 760;
  const HEIGHT = 380;
  const PLATE = { x: -186, y: -108, w: 372, d: 206, r: 10 };
  const PLATE_H = 10;
  const FOOT_H = 6;
  const LABEL = { x: -150, y: 80, w: 46, d: 12, r: 1.4 };
  const HUB = [8, 6]; // where the cables point: there is nothing there

  const SAFE = { x: -170, y: -96, w: 46, d: 38, r: 2.5 };
  const SAFE_Z = 2.4;
  const SAFE_H = 40;
  const SAFE_FRONT = SAFE.y + SAFE.d;
  const TERM = { x: -106, y: -100, w: 54, d: 42, r: 4 };
  const TERM_Z = 2;
  const TERM_H = 48;
  const TERM_FRONT = TERM.y + TERM.d;
  const BOOKS = [
    { x: -36, y: -98, w: 50, d: 36, r: 1.6, z: 0, h: 8 },
    { x: -33, y: -95, w: 45, d: 31, r: 1.6, z: 8, h: 7 },
    { x: -35, y: -93, w: 41, d: 28, r: 1.6, z: 15, h: 6 },
  ];
  const PHONE = { x: 32, y: -98, w: 46, d: 36, r: 5 };
  const PHONE_Z = 1.4;
  const PHONE_TOP = 11;
  const PHONE_FRONT = PHONE.y + PHONE.d;
  const BEACON = [148, -42];
  const CALC = { x: -172, y: 6, w: 50, d: 58, r: 4 };
  const CALC_Z = 1.2;
  const CALC_TOP = 11;
  const GAUGE = [124, 66];
  const DIAL_Z = 23;
  const DIAL_H = 8;
  const DIAL_R = 16;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(TERM, 0, TERM_H + TERM_Z + 1), ...k.boxCorners(SAFE, 0, SAFE_Z + SAFE_H + 1), [BEACON[0], BEACON[1], 32], [CALC.x + 13, CALC.y + 3, CALC_TOP + 25], [GAUGE[0] + DIAL_R, GAUGE[1] + DIAL_R, DIAL_Z + DIAL_H]],
    WIDTH,
    HEIGHT,
    { pad: 10, azimuth: 52, elevation: 32 },
  );
  const B = bench(P, "pf");
  const { at, S, L, D, put, rec, screw, planeOf, flat, frontSlot, sideSlot, box, boxShape, cyl, cylShape, recess, byDepth } = B;

  const back = [B.plate(PLATE, PLATE_H, FOOT_H, LABEL)];
  // A soft red glow on the plate round the alert lamp, pulsed by figures.js.
  back.push(`<ellipse class="pf-glow" cx="${t1(at([BEACON[0], BEACON[1], 0])[0])}" cy="${t1(at([BEACON[0], BEACON[1], 0])[1])}" rx="${t1(30 * B.KS)}" ry="${t1(30 * B.KS * Math.sin((32 * Math.PI) / 180))}"/>`);

  // ── Security: a safe with a combination dial and a handle.
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(SAFE, 0, 6, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(SAFE, 4.5))) out.push(cyl(x, y, 2, 0, SAFE_Z, { tone: "lo" }, 16));
    out.push(box(SAFE, SAFE_Z, SAFE_H, { inner: L(k.sideSeam(SAFE, SAFE_Z + SAFE_H - 4, P, 3), { tone: "faint" }) }, 3, 1));
    const door = { x0: SAFE.x + 4, x1: SAFE.x + 34, z0: SAFE_Z + 4, z1: SAFE_Z + SAFE_H - 7 };
    out.push(`<g transform="${planeOf(SAFE_FRONT)}">${L(flat(door.x0, door.z0, door.x1, door.z1, 1.6), { tone: "lo" })}${L(flat(door.x0 + 1.6, door.z0 + 1.6, door.x1 - 1.6, door.z1 - 1.6, 1), { tone: "faint" })}</g>`);
    // Hinges on the door's left edge.
    for (const z of [door.z0 + 4, door.z1 - 10]) out.push(cyl(door.x0 - 0.6, SAFE_FRONT + 0.5, 1.2, z, 6, { tone: "mid" }, 14));
    // Combination dial: a ring, the knurled dial, ticks on its face, a knob.
    const dialAt = [door.x0 + 18, SAFE_FRONT, door.z0 + 19];
    const F = G.frameOf(dialAt, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 0.8, 7.2, F, P, { steps: 40 }), { tone: "lo" }));
    out.push(S(G.disc(0.8, 3.4, 5.8, F, P, { steps: 40, bevel: 0.3 }), { tone: "hi", inner: k.fadedSvg(G.ribsOf(F, 0.8, 3.4, 5.8, 40, P, { fade: [0.1, 0.55] }), { tone: "lo" }) }));
    const ticks = Array.from({ length: 20 }, (_, i) => {
      const a = (i / 20) * Math.PI * 2;
      const r0 = i % 5 === 0 ? 3.2 : 4.1;
      return k.pathOf([G.pointOf(F, 3.4, r0, a), G.pointOf(F, 3.4, 5.1, a)].map(at));
    });
    out.push(L(ticks.join(""), { tone: "lo" }));
    out.push(S(G.disc(3.4, 4.6, 1.8, F, P, { steps: 24 }), { tone: "mid" }));
    out.push(`<g transform="${planeOf(SAFE_FRONT)}">${L(`M${t1(dialAt[0])} ${t1(-(dialAt[2] + 7.8))}V${t1(-(dialAt[2] + 9.8))}`, { tone: "hi", free: true })}</g>`);
    // Handle: a spindle and a bar.
    const hz = door.z0 + 6;
    const HF = G.frameOf([dialAt[0], SAFE_FRONT, hz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 2.4, 1.3, HF, P, { steps: 20 }), { tone: "mid" }));
    out.push(box({ x: dialAt[0] - 7, y: SAFE_FRONT + 2.4, w: 14, d: 1.8, r: 0.8 }, hz - 1.2, 2.4, { tone: "hi" }, 2, 0.3));
    // Status light and a key plate on the frame beside the door.
    out.push(`<g transform="${planeOf(SAFE_FRONT)}">${L(flat(door.x1 + 3, door.z1 - 12, door.x1 + 8, door.z1 - 2, 1, 3), { tone: "lo" })}</g>`);
    out.push(`<g transform="${planeOf(SAFE_FRONT)}">${D([[door.x1 + 5.5, -(door.z1 - 5)]], { size: 0.7, tone: "hi" })}</g>`);
    // Top screws.
    for (const [x, y] of [[SAFE.x + 4, SAFE.y + 4], [SAFE.x + SAFE.w - 4, SAFE.y + 4], [SAFE.x + SAFE.w - 4, SAFE_FRONT - 4]]) out.push(screw(x, y, SAFE_Z + SAFE_H, 0.9));
    put("safe", [SAFE.x + SAFE.w / 2, SAFE.y + SAFE.d / 2, 20], out.join(""), [boxShape("stand.safe", SAFE, 0, SAFE_Z + SAFE_H)]);
  }

  // ── Terminal: a console with a prompt on its screen.
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(TERM, 0, 6, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(TERM, 5))) out.push(cyl(x, y, 2.4, 0, TERM_Z, { tone: "lo" }, 16));
    out.push(box(TERM, TERM_Z, TERM_H, { inner: L(k.sideSeam(TERM, TERM_Z + 10, P, 4), { tone: "faint" }) }, 4, 1.2));
    // Top vents.
    out.push(L(Array.from({ length: 7 }, (_, i) => k.planOutline({ x: TERM.x + 14 + i * 4.4, y: TERM.y + 6, w: 1.4, d: 14, r: 0.7 }, TERM_Z + TERM_H, P, 3)).join(""), { tone: "faint" }));
    // Side vents.
    out.push(L(Array.from({ length: 5 }, (_, i) => sideSlot(TERM.x + TERM.w, TERM.y + 6 + i * 2.6, TERM_Z + 26, TERM_Z + 42)).join(""), { tone: "faint" }));
    // Screen: a prompt, a command, output and a cursor.
    const SCREEN = { x0: TERM.x + 7, x1: TERM.x + TERM.w - 7, z0: TERM_Z + 17, z1: TERM_Z + 43, r: 2.4, depth: 1.8 };
    const BEZEL = { x0: SCREEN.x0 - 3, x1: SCREEN.x1 + 3, z0: SCREEN.z0 - 3, z1: SCREEN.z1 + 3, r: 3.4, depth: 1.2 };
    const ui = [];
    const row = (z, x0, w, cls = "pf-r") => ui.push(`<path class="${cls}" d="M${t1(x0)} ${t1(-z)}H${t1(x0 + w)}"/>`);
    const sx = SCREEN.x0 + 3;
    [[SCREEN.z1 - 4, 22], [SCREEN.z1 - 8, 30], [SCREEN.z1 - 11.5, 18], [SCREEN.z1 - 15, 26]].forEach(([z, w], i) => {
      ui.push(`<path class="pf-r pf-r-hi" d="M${t1(sx)} ${t1(-z)}h1.6"/>`);
      row(z, sx + 3, w, i % 2 ? "pf-r pf-r-dim" : "pf-r");
    });
    ui.push(`<path class="pf-r pf-r-hi" d="M${t1(sx)} ${t1(-(SCREEN.z0 + 4))}h1.6"/><rect class="pf-cursor" x="${t1(sx + 3)}" y="${t1(-(SCREEN.z0 + 5.6))}" width="2.2" height="3.2" rx=".3"/>`);
    out.push(recess(BEZEL, TERM_FRONT, "", "pf-bezel", recess(SCREEN, TERM_FRONT - BEZEL.depth, ui.join(""), "pf-glass")));
    // Below the screen: vents, a power button and its light.
    out.push(L(Array.from({ length: 4 }, (_, i) => frontSlot(TERM_FRONT, TERM.x + 8, TERM.x + 26, TERM_Z + 4.4 + i * 2.4)).join(""), { tone: "faint" }));
    const PB = G.frameOf([TERM.x + TERM.w - 10, TERM_FRONT, TERM_Z + 8], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    out.push(S(G.disc(0, 1.2, 2.6, PB, P, { steps: 24, bevel: 0.2 }), { tone: "hi" }));
    out.push(`<g transform="${planeOf(TERM_FRONT)}">${D([[TERM.x + TERM.w - 16, -(TERM_Z + 8)]], { size: 0.7, tone: "hi" })}</g>`);
    put("term", [TERM.x + TERM.w / 2, TERM.y + TERM.d / 2, 24], out.join(""), [boxShape("stand.term", TERM, 0, TERM_Z + TERM_H)]);
  }

  // ── Runbooks: a stack of three binders, spines to the front.
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(BOOKS[0], 0, 4, P)}"/>`];
    const shapes = [];
    BOOKS.forEach((b, index) => {
      const pages = { x: b.x + 1.4, y: b.y + 1.2, w: b.w - 2.4, d: b.d - 4, r: 0.8 };
      const pageLines = Array.from({ length: Math.floor((b.h - 2.4) / 1.1) }, (_, i) => k.sideSeam(pages, b.z + 1.6 + i * 1.1, P, 2)).join("");
      out.push(box({ ...b }, b.z, 1, { tone: "mid" }, 3));
      out.push(box(pages, b.z + 1, b.h - 2, { tone: "hi", crease: "none", inner: L(pageLines, { tone: "faint" }) }, 2));
      out.push(box({ ...b }, b.z + b.h - 1, 1, { tone: "mid" }, 3, 0.3));
      // Spine along the front, with a label holder and two rule lines.
      const spine = { x: b.x, y: b.y + b.d - 3.2, w: b.w, d: 3.2, r: 1.4 };
      out.push(box(spine, b.z, b.h, { tone: "mid" }, 4, 0.3));
      const face = spine.y + spine.d;
      const lx = b.x + 6 + index * 4;
      out.push(`<g transform="${planeOf(face)}">${L(flat(lx, b.z + 1.6, lx + 14, b.z + b.h - 1.6, 0.6, 3), { tone: "lo" })}${L(`M${t1(lx + 2)} ${t1(-(b.z + b.h / 2))}H${t1(lx + 10)}`, { tone: "faint", free: true })}</g>`);
      shapes.push(boxShape(index ? `books.${index}` : "stand.books", b, b.z, b.h));
    });
    // A bookmark ribbon over the side of the top binder.
    const top = BOOKS[2];
    out.push(box({ x: top.x + top.w - 0.2, y: top.y + 9, w: 0.5, d: 2.6, r: 0.2 }, top.z - 6, top.h + 5.6, { tone: "hi", crease: "none" }, 1));
    put("books", [BOOKS[0].x + 25, BOOKS[0].y + 18, 10], out.join(""), shapes);
  }

  // ── The on-call phone: a desk phone with its handset and a coiled cord.
  const COIL = { x: PHONE.x + 23, from: PHONE_FRONT, to: PHONE_FRONT + 22, z: 2.6, r: 2.2, turns: 10 };
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(PHONE, 0, 4, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(PHONE, 5))) out.push(cyl(x, y, 1.8, 0, PHONE_Z, { tone: "lo" }, 14));
    out.push(box(PHONE, PHONE_Z, PHONE_TOP - PHONE_Z, { inner: L(k.sideSeam(PHONE, PHONE_Z + 3, P, 5), { tone: "faint" }) }, 5, 0.8));
    // Keypad, 3 × 4.
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) out.push(box({ x: PHONE.x + 15 + c * 6.6, y: PHONE.y + 17 + r * 4.2, w: 5, d: 3.2, r: 0.8 }, PHONE_TOP, 1.2 + (3 - r) * 0.1, { tone: r === 3 && c === 2 ? "hi" : "mid", crease: "faint" }, 2, 0.2));
    // A small display beside the keypad and a message light.
    out.push(S(k.slabOf({ x: PHONE.x + 4, y: PHONE.y + 18, w: 8, d: 12, r: 1 }, PHONE_TOP, 0.6, P, 3), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline({ x: PHONE.x + 5.4, y: PHONE.y + 19.4, w: 5.2, d: 9.2, r: 0.6 }, PHONE_TOP + 0.6, P, 3), { tone: "faint" }));
    out.push(D([at([PHONE.x + PHONE.w - 5, PHONE.y + 30, PHONE_TOP])], { size: 0.8, tone: "hi" }));
    // Handset on its cradle: two cups and the handle across them.
    for (const x of [PHONE.x + 9, PHONE.x + PHONE.w - 9]) {
      out.push(cyl(x, PHONE.y + 9, 4.8, PHONE_TOP, 3, { tone: "mid" }, 28, 0.4));
      out.push(L(k.ring(x, PHONE.y + 9, 3.2, PHONE_TOP + 3, P, 24), { tone: "faint" }));
    }
    out.push(box({ x: PHONE.x + 7, y: PHONE.y + 6, w: PHONE.w - 14, d: 6, r: 2.8 }, PHONE_TOP + 3, 3.2, { tone: "hi", crease: "lo" }, 4, 0.6));
    put("phone", [PHONE.x + PHONE.w / 2, PHONE.y + PHONE.d / 2, 6], out.join(""), [boxShape("stand.phone", PHONE, 0, PHONE_TOP + 6)]);
    // Coiled cord out of the front face.
    const c = k.coil(COIL.from + 0.6, COIL.to, [COIL.x, COIL.z], COIL.r, COIL.turns, "y", P);
    const F = G.frameOf([COIL.x, COIL.from, COIL.z], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    const coilSvg = S(G.disc(0, 1.6, COIL.r + 0.8, F, P, { steps: 24 }), { tone: "mid" }) + L(c.back, { tone: "lo", className: "pf-coil" }) + L(c.front, { tone: "mid", className: "pf-coil" });
    put("phone.coil", [COIL.x, (COIL.from + COIL.to) / 2, COIL.z], coilSvg, [rec(A.tube([[COIL.x, COIL.from, COIL.z], [COIL.x, COIL.to, COIL.z]], COIL.r + 0.5, { name: "phone.coil" }))]);
  }

  // ── Alerts: a beacon on a round base, the one lit thing on the bench.
  {
    const [x, y] = BEACON;
    const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - 12, y: y - 12, w: 24, d: 24, r: 12 }, 0, 4, P)}"/>`];
    out.push(cyl(x, y, 12, 0, 4.5, { tone: "mid", inner: L(k.sideArc(x, y, 12, 1.6, P, 40), { tone: "faint" }) }, 56, 0.6));
    out.push(D([0, 1, 2, 3].map((i) => at([x + 9.6 * Math.cos(Math.PI / 4 + (i * Math.PI) / 2), y + 9.6 * Math.sin(Math.PI / 4 + (i * Math.PI) / 2), 4.5])), { size: 0.45 }));
    out.push(cyl(x, y, 8.6, 4.5, 2.6, { tone: "lo" }, 48));
    out.push(`<g class="pf-lens">${cyl(x, y, 7.6, 7.1, 18, { tone: "hi", crease: "none", inner: L(k.knurl(x, y, 7.6, 7.1, 25.1, 22, P, 0.2), { tone: "red" }) }, 48)}</g>`);
    out.push(cyl(x, y, 8.6, 25.1, 3, { tone: "mid", inner: L(k.sideArc(x, y, 8.6, 26.6, P, 40), { tone: "faint" }) }, 48, 0.5));
    out.push(cyl(x, y, 3, 28.1, 2, { tone: "mid" }, 24, 0.3));
    put("beacon", [x, y, 14], out.join(""), [cylShape("stand.beacon", x, y, 12, 0, 30)]);
  }

  // ── Cost: an adding machine printing its tape.
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(CALC, 0, 4, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(CALC, 5))) out.push(cyl(x, y, 1.8, 0, CALC_Z, { tone: "lo" }, 14));
    out.push(box(CALC, CALC_Z, CALC_TOP - CALC_Z, { inner: L(k.sideSeam(CALC, CALC_Z + 3, P, 4), { tone: "faint" }) }, 4, 0.8));
    // Display.
    const disp = { x: CALC.x + 7, y: CALC.y + 7, w: 36, d: 10, r: 1.2 };
    out.push(S(k.slabOf(disp, CALC_TOP, 0.6, P, 3), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(disp, 1.4), CALC_TOP + 0.6, P, 3), { tone: "faint" }));
    // Keys, 4 × 4; the last column is the operator keys.
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) out.push(box({ x: CALC.x + 7 + c * 9.2, y: CALC.y + 22 + r * 8.4, w: 7.2, d: 6.4, r: 1 }, CALC_TOP, 1.6, { tone: c === 3 && r === 3 ? "hi" : "mid", crease: "faint" }, 2, 0.3));
    // Paper tape out of a slot at the back, with printed lines.
    const slot = { x: CALC.x + 11, y: CALC.y + 2.2, w: 28, d: 2.4, r: 1.2 };
    out.push(L(k.planOutline(slot, CALC_TOP, P, 3), { tone: "lo" }));
    const tape = { x: CALC.x + 13, y: CALC.y + 3, w: 24, d: 0.6, r: 0.2 };
    const tapeTop = CALC_TOP + 24;
    out.push(box(tape, CALC_TOP, tapeTop - CALC_TOP, { tone: "hi", crease: "none" }, 1));
    const face = tape.y + tape.d;
    const lines = [];
    for (let i = 0; i < 7; i++) {
      const z = tapeTop - 3.4 - i * 2.8;
      const w = i === 6 ? 12 : 6 + ((i * 5) % 9);
      lines.push(`M${t1(tape.x + tape.w - 3 - w)} ${t1(-z)}H${t1(tape.x + tape.w - 3)}`);
    }
    out.push(`<g transform="${B.planeOf(face)}">${L(lines.join(""), { tone: "lo", free: true })}${L(`M${t1(tape.x + 3)} ${t1(-(tapeTop - 21.4))}H${t1(tape.x + tape.w - 3)}`, { tone: "mid" })}</g>`);
    put("calc", [CALC.x + CALC.w / 2, CALC.y + CALC.d / 2, 6], out.join(""), [boxShape("stand.calc", CALC, 0, CALC_TOP + 2), boxShape("calc.tape", tape, CALC_TOP, tapeTop - CALC_TOP, 1)]);
  }

  // ── Latency: a dial gauge on a post.
  {
    const [x, y] = GAUGE;
    const BASE = { x: x - 14, y: y - 12, w: 28, d: 24, r: 2 };
    const out = [`<path class="iso-halo" d="${k.haloOf(BASE, 0, 4, P)}"/>`];
    out.push(box(BASE, 0, 5, { tone: "mid", inner: L(k.sideSeam(BASE, 2, P, 3), { tone: "faint" }) }, 3, 0.6));
    out.push(screw(BASE.x + 4, BASE.y + 4, 5, 0.9), screw(BASE.x + BASE.w - 4, BASE.y + BASE.d - 4, 5, 0.9));
    out.push(cyl(x, y, 4.2, 5, 1.6, { tone: "lo" }, 24));
    out.push(cyl(x, y, 2.4, 6.6, DIAL_Z - 6.6 - 3, { tone: "mid", crease: "none" }, 20));
    out.push(box({ x: x - 3.4, y: y - 3.4, w: 6.8, d: 6.8, r: 1.2 }, DIAL_Z - 3.4, 3.4, { tone: "mid" }, 3, 0.3));
    const top = DIAL_Z + DIAL_H;
    out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 72, 0.8), { tone: "hi", crease: "lo", inner: L(k.sideArc(x, y, DIAL_R, top - 3.2, P, 48), { tone: "faint" }) }));
    out.push(L(k.knurl(x, y, DIAL_R, top - 3.2, top, 84, P, 0.3), { tone: "lo" }));
    out.push(L(k.ring(x, y, DIAL_R - 2, top, P, 64), { tone: "lo" }));
    const from = (-135 * Math.PI) / 180;
    const span = (270 * Math.PI) / 180;
    const t = k.radialTicks(x, y, DIAL_R - 2.8, 40, 5, top, [1.2, 2.6], P, from, span);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    // The last stretch of the scale is marked red: the latency budget.
    const red = k.radialTicks(x, y, DIAL_R - 2.8, 40, 100, top, [1.2, 1.2], P, from + span * 0.8, span * 0.2);
    out.push(L(red.minor + red.major, { tone: "red" }));
    // Needle well into the red: p99 is over budget.
    const a = from + span * 0.86;
    out.push(L(k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIAL_R - 4), y - Math.cos(a) * (DIAL_R - 4)], top + 0.2, P), { tone: "lit", className: "pf-needle", free: true }));
    out.push(L(k.ring(x, y, 1.6, top, P, 16), { tone: "hi" }));
    out.push(D([at([x, y, top])], { size: 0.6, tone: "hi" }));
    // Crown on the side.
    out.push(box({ x: x + DIAL_R - 0.4, y: y - 2, w: 3, d: 4, r: 0.8 }, DIAL_Z + 2.4, 3.2, { tone: "mid" }, 2));
    put("gauge", [x, y, 14], out.join(""), [boxShape("stand.gauge", BASE, 0, 5), cylShape("gauge.dial", x, y, DIAL_R, DIAL_Z, DIAL_H)]);
  }

  // ── Six cables, each from a port toward the middle of the bench, each ending in a loose
  // plug. Every plug points at the same spot, and there is nothing there.
  const r = 1.1;
  const radial = (deg, reach, z = r) => [HUB[0] + Math.cos((deg * Math.PI) / 180) * reach, HUB[1] + Math.sin((deg * Math.PI) / 180) * reach, z];
  const lead = (deg, reach) => [radial(deg, reach + 14), radial(deg, reach)];
  const routes = [];
  {
    const p = [CALC.x + CALC.w, CALC.y + 26, 4.6];
    routes.push(B.cable("cable.calc", [p, [p[0] + 6, p[1], 4.6], [p[0] + 12, p[1] + 1, r], ...lead(180, 40)], { plug: true }));
  }
  {
    const p = [SAFE.x + SAFE.w - 7, SAFE_FRONT, 4.2];
    routes.push(B.cable("cable.safe", [p, [p[0], p[1] + 6, 4.2], [p[0] + 3, p[1] + 12, r], ...lead(208, 36)], { plug: true }));
  }
  {
    const p = [TERM.x + TERM.w - 9, TERM_FRONT, 4.6];
    routes.push(B.cable("cable.term", [p, [p[0], p[1] + 6, 4.6], [p[0] + 2, p[1] + 12, r], ...lead(238, 31)], { plug: true }));
  }
  {
    // The coiled cord runs on as a straight cord.
    const p = [COIL.x + COIL.r, COIL.to, COIL.z];
    routes.push(B.cable("cable.phone", [p, [p[0], p[1] + 4, r], ...lead(284, 28)], { plug: true, gland: false }));
  }
  {
    const [x, y] = BEACON;
    const end = radial(332, 36);
    const dx = end[0] + 14 - x;
    const dy = end[1] - y;
    const len = Math.hypot(dx, dy);
    const p = [x + (dx / len) * 12, y + (dy / len) * 12, 2.4];
    routes.push(B.cable("cable.beacon", [p, [p[0] + (dx / len) * 6, p[1] + (dy / len) * 6, r], ...lead(332, 36)], { plug: true }));
  }
  {
    const p = [GAUGE[0] - 14, GAUGE[1] - 2, 2.6];
    routes.push(B.cable("cable.gauge", [p, [p[0] - 6, p[1], r], ...lead(42, 34)], { plug: true }));
  }

  const body = emit(B.R, P, back);
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "A bench with seven separate tools on it: a safe for security, a terminal, a stack of runbooks, a desk phone, an alert beacon that is lit, an adding machine printing a cost tape, and a dial gauge reading latency in the red. Six cables run from the tools toward the middle of the bench and end in loose plugs. There is nothing in the middle to plug them into.",
    body,
  });
  const markup = `<!--ill:problem--><div class="iso esc-iso esc-fig" data-fig="problem" data-theme="light">${k.plateHtml({
    fig: "Fig 1",
    title: "Seven tools, no connection",
    readout: `7 tools · ${routes.length} loose cables · 0 links`,
    keys: [
      { mark: "red", label: "An alert is firing" },
      { mark: "raised", label: "Security, terminal, runbooks, the on-call phone, alerts, cost and latency" },
      { mark: "edge", label: "Cables with nothing to plug into" },
    ],
    caption: "Each tool holds part of the answer, and none of them talks to the others. During an incident, a person carries the context from one to the next.",
    body: `<div class="iso-stage">${svg}</div>`,
  })}</div><!--/ill:problem-->`;
  return { markup, items: B.R.items.length };
}


// ════════════════════════════════════════════════════════════════════════════
// Outcome: one frontend, a cartridge in a dock, wired to a demo screen and a laptop.
// ════════════════════════════════════════════════════════════════════════════
const BARS = [
  [0.42, 0.66, 0.3, 0.92, 0.54, 0.74],
  [0.58, 0.44, 0.72, 0.6, 0.88, 0.4],
  [0.36, 0.8, 0.5, 0.68, 0.46, 0.94],
];
const REDBAR = BARS.map((set) => set.indexOf(Math.max(...set)));

// The same interface on every screen: sidebar, title, three metrics, a chart.
function miniUi(x0, z0, x1, z1) {
  const w = x1 - x0;
  const h = z1 - z0;
  const X = (u) => t1(x0 + u * w);
  const Y = (v) => t1(-(z1 - v * h));
  const rect = (u0, v0, u1, v1, cls, rx = 0.6) => `<rect class="${cls}" x="${X(u0)}" y="${Y(v0)}" width="${t1((u1 - u0) * w)}" height="${t1((v1 - v0) * h)}" rx="${rx}"/>`;
  const line = (u0, u1, v, cls = "of-ui-l") => `<path class="${cls}" d="M${X(u0)} ${Y(v)}H${X(u1)}"/>`;
  const out = [rect(0, 0, 0.2, 1, "of-ui-side", 0)];
  out.push(`<circle class="of-ui-mark" cx="${X(0.06)}" cy="${Y(0.08)}" r="${t1(h * 0.028)}"/>`);
  [0.2, 0.28, 0.36, 0.44, 0.52].forEach((v, i) => out.push(line(0.04, i === 1 ? 0.16 : 0.13, v, i === 1 ? "of-ui-l of-ui-strong" : "of-ui-l")));
  out.push(line(0.26, 0.52, 0.1, "of-ui-l of-ui-strong"));
  out.push(line(0.8, 0.95, 0.1));
  for (let i = 0; i < 3; i++) {
    const u = 0.26 + i * 0.235;
    out.push(rect(u, 0.18, u + 0.215, 0.38, "of-ui-tile"));
    out.push(line(u + 0.02, u + 0.1, 0.24));
    out.push(line(u + 0.02, u + (i === 1 ? 0.15 : 0.12), 0.32, "of-ui-l of-ui-strong of-ui-big"));
  }
  out.push(rect(0.26, 0.44, 0.965, 0.94, "of-ui-tile"));
  out.push(line(0.29, 0.42, 0.51));
  const base = 0.88;
  const top = 0.58;
  BARS[0].forEach((value, i) => {
    const u = 0.31 + i * 0.105;
    const red = i === REDBAR[0] ? " r" : "";
    out.push(`<rect class="of-bar${red}" data-i="${i}" x="${X(u)}" y="${Y(top)}" width="${t1(0.07 * w)}" height="${t1((base - top) * h)}" style="transform:scaleY(${value})"/>`);
  });
  out.push(line(0.29, 0.94, base + 0.005, "of-ui-l of-ui-axis"));
  return out.join("");
}

function outcomeFigure() {
  const WIDTH = 760;
  const HEIGHT = 400;
  const PLATE = { x: -182, y: -104, w: 364, d: 196, r: 10 };
  const PLATE_H = 10;
  const FOOT_H = 6;
  const LABEL = { x: -150, y: 66, w: 46, d: 12, r: 1.4 };

  const DOCK = { x: -160, y: -22, w: 66, d: 46, r: 4 };
  const DOCK_Z = 1.6;
  const DOCK_TOP = 16;
  const CART = { x: -148, y: -6, w: 44, d: 9, r: 1.6 };
  const CART_Z = DOCK_TOP - 5;
  const CART_TOP = 58;
  const CART_FACE = CART.y + CART.d;

  const MFOOT = { x: -36, y: -90, w: 50, d: 26, r: 5 };
  const NECK = { x: -15, y: -84, w: 8, d: 8, r: 2 };
  const MON = { x: -68, y: -82, w: 114, d: 10, r: 3 };
  const MON_Z = 32;
  const MON_TOP = 104;
  const MON_FACE = MON.y + MON.d;

  const LAP = { x: 64, y: 0, w: 92, d: 62, r: 3.4 };
  const LAP_Z = 1.2;
  const LAP_TOP = 5;
  const LID = { x: LAP.x + 1, y: LAP.y, w: LAP.w - 2, d: 2.6, r: 1.2 };
  const LID_TOP = LAP_TOP + 56;
  const LID_FACE = LID.y + LID.d;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(MON, MON_Z, MON_TOP + 1), ...k.boxCorners(CART, 0, CART_TOP + 1), ...k.boxCorners(LID, 0, LID_TOP + 1)],
    WIDTH,
    HEIGHT,
    { pad: 10, azimuth: 54, elevation: 30 },
  );
  const B = bench(P, "of");
  const { at, S, L, D, put, rec, screw, planeOf, flat, frontSlot, sideSlot, box, boxShape, cyl, recess, byDepth } = B;
  const back = [B.plate(PLATE, PLATE_H, FOOT_H, LABEL)];

  // ── The dock, with the frontend in it as a cartridge.
  const PORTS = [DOCK.y + 12, DOCK.y + 32];
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(DOCK, 0, 6, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(DOCK, 5))) out.push(cyl(x, y, 2.2, 0, DOCK_Z, { tone: "lo" }, 16));
    out.push(box(DOCK, DOCK_Z, DOCK_TOP - DOCK_Z, { inner: L(k.sideSeam(DOCK, DOCK_Z + 4, P, 4), { tone: "faint" }) }, 4, 1));
    // The slot, a groove round it, a power light and screws.
    const slot = k.insetPlan(CART, -1.4);
    out.push(S(k.slabOf(slot, DOCK_TOP, 0.4, P, 3), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(CART, -3.4), DOCK_TOP, P, 3), { tone: "faint" }));
    out.push(D([at([DOCK.x + DOCK.w - 8, DOCK.y + DOCK.d - 8, DOCK_TOP])], { size: 0.8, tone: "hi" }));
    out.push(L(k.ring(DOCK.x + DOCK.w - 8, DOCK.y + DOCK.d - 8, 1.8, DOCK_TOP, P, 16), { tone: "lo" }));
    for (const [x, y] of [[DOCK.x + 5, DOCK.y + 5], [DOCK.x + DOCK.w - 5, DOCK.y + 5], [DOCK.x + 5, DOCK.y + DOCK.d - 5]]) out.push(screw(x, y, DOCK_TOP, 0.9));
    // Front vents.
    out.push(L(Array.from({ length: 3 }, (_, i) => frontSlot(DOCK.y + DOCK.d, DOCK.x + 10, DOCK.x + 34, DOCK_Z + 4 + i * 2.6)).join(""), { tone: "faint" }));
    // Port plates on the right side.
    for (const y of PORTS) out.push(`<g transform="${B.sideOf(DOCK.x + DOCK.w)}">${L(flat(-(y + 4.4), DOCK_Z + 2.4, -(y - 4.4), DOCK_Z + 9.6, 1.2, 3), { tone: "lo" })}</g>`);
    put("dock", [DOCK.x + DOCK.w / 2, DOCK.y + DOCK.d / 2, 6], out.join(""), [boxShape("stand.dock", DOCK, 0, DOCK_TOP)]);

    // Cartridge: a shell with a label recess, grip ribs on top.
    const c = [];
    c.push(S(k.slabOf(CART, CART_Z, CART_TOP - CART_Z, P, 3, 0.8), { tone: "hi", crease: "lo", lit: true, inner: L(k.sideSeam(CART, CART_TOP - 6, P, 3), { tone: "faint" }) }));
    const LBL = { x0: CART.x + 5, x1: CART.x + CART.w - 5, z0: DOCK_TOP + 6, z1: CART_TOP - 10, r: 1.4, depth: 0.8 };
    const label = [];
    label.push(`<rect class="of-label" x="${t1(LBL.x0)}" y="${t1(-LBL.z1)}" width="${t1(LBL.x1 - LBL.x0)}" height="${t1(LBL.z1 - LBL.z0)}"/>`);
    label.push(`<g class="of-mini">${miniUi(LBL.x0 + 3, LBL.z0 + 8, LBL.x1 - 3, LBL.z1 - 3)}</g>`);
    c.push(recess(LBL, CART_FACE, label.join(""), "of-well"));
    c.push(k.faceTextSvg(planeOf(CART_FACE), "ESCHER · UI", { size: 2.6, tone: "mid" }).replace(/<text /, `<text x="${t1(LBL.x0 + 3)}" y="${t1(-(LBL.z0 + 2.4))}" `));
    c.push(L(Array.from({ length: 9 }, (_, i) => k.lineOnTop([CART.x + 8 + i * 3.6, CART.y + 1.6], [CART.x + 8 + i * 3.6, CART.y + CART.d - 1.6], CART_TOP, P)).join(""), { tone: "lo" }));
    put("cart", [CART.x + CART.w / 2, CART.y + CART.d / 2, 30], c.join(""), [boxShape("cart", CART, CART_Z, CART_TOP - CART_Z)], { bias: 0.5 });
  }

  // ── The demo screen on a stand.
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(MFOOT, 0, 6, P)}"/>`];
    out.push(box(MFOOT, 0, 3.2, { tone: "mid" }, 6, 0.8));
    out.push(L(k.planOutline(k.insetPlan(MFOOT, 3), 3.2, P, 5), { tone: "faint" }));
    out.push(box(NECK, 3.2, MON_Z - 3.2 + 1, { tone: "mid", inner: L(k.sideSeam(NECK, 12, P, 3), { tone: "faint" }) }, 3, 0.4));
    out.push(L(k.ring(NECK.x + NECK.w / 2, NECK.y + NECK.d / 2, 6, 3.2, P, 24), { tone: "lo" }));
    put("stand", [MFOOT.x + MFOOT.w / 2, MFOOT.y + MFOOT.d / 2, 10], out.join(""), [boxShape("stand.foot", MFOOT, 0, 3.2), boxShape("neck", NECK, 3.2, MON_Z - 2.2)]);
    const m = [];
    m.push(box(MON, MON_Z, MON_TOP - MON_Z, { tone: "mid", inner: L(k.sideSeam(MON, MON_TOP - 4, P, 4), { tone: "faint" }) }, 4, 1.2));
    m.push(L(Array.from({ length: 10 }, (_, i) => k.planOutline({ x: MON.x + 30 + i * 5, y: MON.y + 3, w: 1.4, d: 4.4, r: 0.7 }, MON_TOP, P, 3)).join(""), { tone: "faint" }));
    const SCREEN = { x0: MON.x + 4, x1: MON.x + MON.w - 4, z0: MON_Z + 7, z1: MON_TOP - 4, r: 1.6, depth: 1.4 };
    m.push(recess(SCREEN, MON_FACE, `<g class="of-screen">${miniUi(SCREEN.x0, SCREEN.z0, SCREEN.x1, SCREEN.z1)}</g>`, "of-glass"));
    m.push(`<g transform="${planeOf(MON_FACE)}">${D([[MON.x + MON.w - 8, -(MON_Z + 3.4)]], { size: 0.7, tone: "hi" })}</g>`);
    m.push(k.faceTextSvg(planeOf(MON_FACE), "DEMO", { size: 2.4, tone: "lo" }).replace(/<text /, `<text x="${t1(MON.x + 6)}" y="${t1(-(MON_Z + 2.4))}" `));
    put("monitor", [MON.x + MON.w / 2, MON.y + MON.d / 2, 60], m.join(""), [boxShape("monitor", MON, MON_Z, MON_TOP - MON_Z)]);
  }

  // ── The laptop running the Tauri app.
  {
    const out = [`<path class="iso-halo" d="${k.haloOf(LAP, 0, 4, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(LAP, 6))) out.push(cyl(x, y, 2.2, 0, LAP_Z, { tone: "lo" }, 16));
    out.push(box(LAP, LAP_Z, LAP_TOP - LAP_Z, { tone: "mid" }, 4, 0.8));
    // Keyboard deck: key outlines, a space bar, the trackpad.
    const deck = { x: LAP.x + 8, y: LAP.y + 9, w: LAP.w - 16, d: 30, r: 1.6 };
    out.push(S(k.slabOf(deck, LAP_TOP, 0.3, P, 3), { tone: "lo", crease: "none" }));
    const keys = [];
    const U = (deck.w - 2) / 13;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 13; col++) keys.push(k.planOutline({ x: deck.x + 1 + col * U + 0.4, y: deck.y + 1 + row * 6.6 + 0.4, w: U - 0.8, d: 5.8, r: 0.6 }, LAP_TOP + 0.3, P, 2));
    }
    out.push(L(keys.join(""), { tone: "faint" }));
    out.push(L(k.planOutline({ x: deck.x + 1 + 4 * U, y: deck.y + 1 + 4 * 6.6 - 6.2, w: 5 * U, d: 5.8, r: 0.6 }, LAP_TOP + 0.3, P, 2), { tone: "lo" }));
    out.push(L(k.planOutline({ x: LAP.x + LAP.w / 2 - 16, y: LAP.y + 43, w: 32, d: 15, r: 1.6 }, LAP_TOP, P, 3), { tone: "lo" }));
    out.push(L(frontSlot(LAP.y + LAP.d, LAP.x + LAP.w / 2 - 8, LAP.x + LAP.w / 2 + 8, LAP_Z + 2, 0.5), { tone: "faint" }));
    put("laptop", [LAP.x + LAP.w / 2, LAP.y + LAP.d / 2, 3], out.join(""), [boxShape("stand.laptop", LAP, 0, LAP_TOP)]);
    // Lid, standing at the back edge; hinge barrels.
    const lid = [];
    lid.push(box(LID, LAP_TOP, LID_TOP - LAP_TOP, { tone: "mid" }, 3, 0.6));
    const SCREEN = { x0: LID.x + 4, x1: LID.x + LID.w - 4, z0: LAP_TOP + 5, z1: LID_TOP - 4, r: 1.2, depth: 0.6 };
    lid.push(recess(SCREEN, LID_FACE, `<g class="of-screen">${miniUi(SCREEN.x0, SCREEN.z0, SCREEN.x1, SCREEN.z1)}</g>`, "of-glass"));
    lid.push(`<g transform="${planeOf(LID_FACE)}">${D([[LID.x + LID.w / 2, -(LID_TOP - 2)]], { size: 0.5, tone: "lo" })}</g>`);
    for (const x of [LID.x + 10, LID.x + LID.w - 22]) lid.push(box({ x, y: LID.y + LID.d, w: 12, d: 1.6, r: 0.8 }, LAP_TOP, 2.6, { tone: "lo" }, 2));
    put("lid", [LID.x + LID.w / 2, LID.y + LID.d / 2, 30], lid.join(""), [boxShape("lid", LID, LAP_TOP, LID_TOP - LAP_TOP)]);
  }

  // ── Two cables from the dock: one to the screen's stand, one to the laptop.
  const r = 1.1;
  const dx = DOCK.x + DOCK.w;
  const toScreen = B.cable("cable.screen", [[dx, PORTS[0], 6], [dx + 7, PORTS[0], 6], [dx + 13, PORTS[0], r], [MFOOT.x + 12, PORTS[0], r], [MFOOT.x + 12, MFOOT.y + MFOOT.d + 8, r], [MFOOT.x + 12, MFOOT.y + MFOOT.d, 1.8]], { endGland: true, bend: 7 });
  const toLaptop = B.cable("cable.laptop", [[dx, PORTS[1], 6], [dx + 7, PORTS[1], 6], [dx + 13, PORTS[1], r], [LAP.x - 10, PORTS[1] + 4, r], [LAP.x - 2, PORTS[1] + 4, 2.6], [LAP.x, PORTS[1] + 4, 2.6]], { endGland: true, bend: 6 });

  const routeAttr = (route) => G.resample(route, 3).map((p) => at(p).map(t1).join(",")).join(" ");
  const front = [`<g class="of-pulses" aria-hidden="true">${[toScreen, toLaptop].map((route) => `<circle class="of-pulse" r="2.2" cx="-99" cy="-99" data-route="${routeAttr(route)}"/>`).join("")}</g>`];
  const body = emit(B.R, P, back, front);
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "A bench with a dock holding one cartridge, the frontend. Two cables leave the dock: one to a demo screen on a stand at the back, one to a laptop at the front. Both screens show the same interface: a sidebar, three metrics and a bar chart.",
    body,
  });
  const markup = `<!--ill:outcome--><div class="iso esc-iso esc-fig" data-fig="outcome" data-theme="light" data-bars='${JSON.stringify({ bars: BARS, red: REDBAR })}'>${k.plateHtml({
    fig: "Fig 3",
    title: "One frontend, two places",
    readout: "1 frontend · 2 builds · same screen",
    keys: [
      { mark: "lit", label: "The frontend: React, one codebase" },
      { mark: "raised", label: "Demo screen, for customers and investors" },
      { mark: "raised", label: "Laptop, running the Tauri app" },
    ],
    caption: "The prototype and the Tauri app load the same frontend, so a change made for a demo is already in the product. Both screens update together.",
    body: `<div class="iso-stage">${svg}</div>`,
  })}</div><!--/ill:outcome-->`;
  return { markup, items: B.R.items.length };
}

const problem = problemFigure();
const outcome = outcomeFigure();

const css = `/* Generated by scripts/escher-figures.mjs from the Anatomy kit (MIT). Do not edit by hand.
   The kit's styles and the page's theme tokens come from anatomy.css (.esc-iso). */
.esc-fig .iso-hint{display:none}
@media (max-width:600px){.esc-fig .iso-plate{padding:44px 0 48px}.esc-fig .iso-svg{width:112%;margin-left:-6%}}
.esc-fig .pf-well,.esc-fig .of-well{fill:var(--anatomy-shade-1)}
.esc-fig .pf-bezel,.esc-fig .of-bezel{fill:var(--anatomy-top)}
.esc-fig .pf-glass,.esc-fig .of-glass{fill:var(--anatomy-face)}
.esc-fig[data-theme="dark"] .pf-glass,.esc-fig[data-theme="dark"] .of-glass{fill:#151515}
.esc-fig .pf-r{fill:none;stroke:var(--anatomy-mid);stroke-width:.9px;vector-effect:non-scaling-stroke;stroke-linecap:round}
.esc-fig .pf-r-hi{stroke:var(--anatomy-hi)}
.esc-fig .pf-r-dim{stroke:var(--anatomy-lo)}
.esc-fig .pf-cursor{fill:var(--anatomy-hi)}
.esc-fig .pf-coil{stroke-width:1.1px}
.esc-fig .pf-lens .iso-top{fill:color-mix(in srgb,var(--anatomy-red) 30%,var(--anatomy-top))}
.esc-fig .pf-lens .iso-shade{fill:color-mix(in srgb,var(--anatomy-red) 22%,var(--anatomy-face))}
.esc-fig .pf-lens .iso-edge{stroke:color-mix(in srgb,var(--anatomy-red) 70%,var(--anatomy-hi))}
.esc-fig .pf-glow{fill:var(--anatomy-red);opacity:.16;filter:blur(6px)}
@media (prefers-reduced-motion:no-preference){
  .esc-fig .pf-glow{animation:pf-pulse 2.4s cubic-bezier(.45,0,.55,1) infinite}
  .esc-fig .pf-lens .iso-top,.esc-fig .pf-lens .iso-shade{animation:pf-lens 2.4s cubic-bezier(.45,0,.55,1) infinite}
}
.esc-fig .of-label{fill:var(--anatomy-face)}
.esc-fig .of-ui-side{fill:var(--anatomy-shade-2)}
.esc-fig .of-ui-tile{fill:var(--anatomy-top);stroke:var(--anatomy-faint);stroke-width:.6px;vector-effect:non-scaling-stroke}
.esc-fig .of-ui-l{fill:none;stroke:var(--anatomy-lo);stroke-width:.9px;vector-effect:non-scaling-stroke;stroke-linecap:round}
.esc-fig .of-ui-strong{stroke:var(--anatomy-mid)}
.esc-fig .of-ui-big{stroke-width:1.6px}
.esc-fig .of-ui-axis{stroke:var(--anatomy-faint)}
.esc-fig .of-ui-mark{fill:var(--anatomy-red)}
.esc-fig .of-mini .of-ui-l{stroke-width:.6px}
.esc-fig .of-bar{fill:var(--anatomy-mid);transform-box:fill-box;transform-origin:50% 100%;transition:transform .9s cubic-bezier(.2,.7,.2,1),fill .5s}
.esc-fig .of-bar.r{fill:var(--anatomy-red)}
.esc-fig .of-pulse{fill:var(--anatomy-red);opacity:0}
@keyframes pf-pulse{0%,100%{opacity:.06}50%{opacity:.24}}
@keyframes pf-lens{0%,100%{filter:saturate(.6)}50%{filter:saturate(1.6)}}
`;

const live = `// Generated by scripts/escher-figures.mjs. Do not edit by hand.
(() => {
const root = document.documentElement;
const system = matchMedia("(prefers-color-scheme: dark)");
const figs = document.querySelectorAll(".esc-fig");
const theme = () => { const t = root.dataset.theme || (system.matches ? "dark" : "light"); figs.forEach((el) => { el.dataset.theme = t; }); };
theme();
new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
system.addEventListener("change", theme);

// Outcome: a change leaves the dock on both cables at once, and both screens update together.
const fig = document.querySelector('.esc-fig[data-fig="outcome"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
if (fig && !still.matches) {
  const { bars, red } = JSON.parse(fig.dataset.bars);
  const pulses = [...fig.querySelectorAll(".of-pulse")].map((el) => ({ el, pts: el.dataset.route.split(" ").map((p) => p.split(",").map(Number)) }));
  const rects = [...fig.querySelectorAll(".of-bar")];
  let step = 0, start = 0, frame = 0, visible = false;
  const TRAVEL = 1400, HOLD = 2600;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const place = (pulse, t) => {
    const pts = pulse.pts;
    const f = ease(t) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const u = f - i;
    pulse.el.setAttribute("cx", (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u).toFixed(1));
    pulse.el.setAttribute("cy", (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u).toFixed(1));
    pulse.el.style.opacity = String(Math.min(1, Math.sin(Math.PI * t) * 1.6));
  };
  const apply = (n) => rects.forEach((rect) => {
    const i = Number(rect.dataset.i);
    rect.style.transform = "scaleY(" + bars[n][i] + ")";
    rect.classList.toggle("r", i === red[n]);
  });
  const tick = (now) => {
    if (!start) start = now;
    const t = (now - start) / TRAVEL;
    if (t < 1) pulses.forEach((p) => place(p, t));
    else if (t < 1 + HOLD / TRAVEL) { pulses.forEach((p) => { p.el.style.opacity = "0"; }); if (step % 1 === 0 && !fig.dataset.applied) { step = (step + 1) % bars.length; apply(step); fig.dataset.applied = "1"; } }
    else { start = now; delete fig.dataset.applied; }
    frame = visible ? requestAnimationFrame(tick) : 0;
  };
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !frame) { start = 0; frame = requestAnimationFrame(tick); }
  }, { rootMargin: "60px 0px" }).observe(fig);
}
})();
`;

writeFileSync(join(OUT, "figures.css"), css);
writeFileSync(join(OUT, "figures.js"), live);

const previewAt = process.argv.indexOf("--preview");
if (previewAt > 0) {
  const dir = process.argv[previewAt + 1];
  const anatomyCss = readFileSync(join(OUT, "anatomy.css"), "utf8");
  for (const theme of ["light", "dark"]) {
    const bg = theme === "dark" ? "#121212" : "#fff";
    const html = `<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Figures</title><style>${anatomyCss}${css}body{margin:0;background:${bg};font-family:Arial,sans-serif}main{max-width:1088px;margin:0 auto;padding:40px}</style></head><body><main>${problem.markup}${outcome.markup}</main><script>${live}</script></body></html>`;
    writeFileSync(join(dir, `figures-${theme}.html`), html);
  }
}

const pagePath = join(OUT, "index.html");
let page = readFileSync(pagePath, "utf8");
for (const [name, markup] of [["problem", problem.markup], ["outcome", outcome.markup]]) {
  const marked = new RegExp(`<!--ill:${name}-->[\\s\\S]*?<!--\\/ill:${name}-->`);
  if (!marked.test(page)) throw new Error(`index.html has no <!--ill:${name}--> markers`);
  page = page.replace(marked, () => markup);
}
if (!process.argv.includes("--dry")) writeFileSync(pagePath, page);
console.log("problem:", problem.items, "items · outcome:", outcome.items, "items");
