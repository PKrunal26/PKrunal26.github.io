// Machine learning for CFD: the two instrument figures, built with the Anatomy kit (vendored in anatomy-kit/, MIT).
//   Fig 1, CFD bench (Problem): a pipe sample on V-blocks with its cut face showing the real |U| field and the 553
//   mesh points, a probe on one mesh node with a readout box, and a rack of 41 slides, one per saved snapshot.
//   Fig 2, Dean rig: a flanged pipe bend on supports, a collar that slides up the vertical leg, and a viewer whose
//   screen shows that cross-section with streamlines of the sideways flow, plus a dial for its peak speed.
// Writes projects/cfd-ml/iso.css and iso.js, and the markup between <!--ill:bench--> / <!--ill:dean--> markers.
//
//   node scripts/cfd-ml-anatomy.mjs [--preview <dir>]
//
// Every number comes from media/flow.json and media/dean-lines.json (scripts/cfd-ml-figures.py).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy-kit/iso-kit.mjs";
import * as G from "./anatomy-kit/lathe.mjs";
import { tubePieces, tubeSvg } from "./anatomy-kit/tube.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "projects", "cfd-ml");
const FLOW = JSON.parse(readFileSync(join(OUT, "media", "flow.json"), "utf8"));
const f3 = (v) => Math.round(v * 1000) / 1000;

function toolsOf(P) {
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  const screw = (x, y, z, r = 1.1) => L(k.ring(x, y, r, z, P, 14), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });
  const matrix = (o, u, v) => `matrix(${f3(u[0] - o[0])} ${f3(u[1] - o[1])} ${f3(v[0] - o[0])} ${f3(v[1] - o[1])} ${f3(o[0])} ${f3(o[1])})`;
  // A face at x = X (normal +x): local u runs along -y (screen right), v along -z (screen down).
  const faceX = (X, y0, z0) => matrix(at([X, y0, z0]), at([X, y0 - 1, z0]), at([X, y0, z0 - 1]));
  // A face at y = Y (normal +y): u along +x, v along -z.
  const faceY = (Y, x0, z0) => matrix(at([x0, Y, z0]), at([x0 + 1, Y, z0]), at([x0, Y, z0 - 1]));
  const halo = (plan, z, h, blur = 0, op = 1) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"${blur ? ` style="filter:blur(${blur}px);opacity:${op}"` : ""}/>`;

  function plate(PLATE, PLATE_H, FOOT_H, strip) {
    const out = [halo(PLATE, -PLATE_H - FOOT_H, PLATE_H)];
    for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
      out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -5, P, 8), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const corners = k.corners(PLATE, 10);
    out.push(L(corners.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(corners.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
    if (strip) {
      out.push(S(k.slabOf(strip.plan, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
      const t = k.topTicks(strip.from, strip.to, strip.step, strip.every, strip.plan.y + 0.8, 0.6, [2, 3.8], P);
      out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
      out.push(D([at([strip.plan.x + 2, strip.plan.y + 3.5, 0.6]), at([strip.plan.x + strip.plan.w - 2, strip.plan.y + 3.5, 0.6])], { size: 0.45 }));
    }
    return out.join("");
  }

  function label(plan, z = 0) {
    const out = [S(k.slabOf(plan, z, 0.8, P, 4), { tone: "lo", crease: "none" })];
    out.push(L(k.planOutline(k.insetPlan(plan, 1.6), z + 0.8, P), { tone: "faint" }));
    [[plan.w - 14], [plan.w - 20], [plan.w - 16]].forEach(([w], i) => {
      const y = plan.y + 2.6 + i * 2.3;
      out.push(L(k.lineOnTop([plan.x + 6, y], [plan.x + 6 + w * 0.55, y], z + 0.8, P), { tone: "lo", free: true }));
    });
    out.push(D([at([plan.x + 3, plan.y + plan.d / 2, z + 0.8]), at([plan.x + plan.w - 3, plan.y + plan.d / 2, z + 0.8])], { size: 0.4 }));
    return out.join("");
  }

  function knob(x, y, z, r, h, count = 24) {
    return S(k.cylinder(x, y, r, z, h, P, 28), { tone: "mid" }) + L(k.knurl(x, y, r, z, z + h, count, P), { tone: "lo" }) +
      L(k.lineOnTop([x - r * 0.6, y], [x + r * 0.6, y], z + h, P), { tone: "hi" });
  }

  return { at, S, L, D, byDepth, screw, faceX, faceY, halo, plate, label, knob, matrix };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fig 1: CFD bench
// ═══════════════════════════════════════════════════════════════════════════
function bench() {
  const W = 640, H = 420;
  const PLATE = { x: -176, y: -84, w: 340, d: 156, r: 8 };
  const PY = -24, ZC = 50, R = 30, RI = 26.5; // pipe sample: axis y, centre height, outer and inner radius
  const X0 = -160, FX = -36; // far end and cut face
  const SCALE = RI / 0.02; // world units per metre on the face
  const pr = FLOW.probe.a1;
  const NODE = [FX, PY - pr.xyz[0] * SCALE, ZC + (pr.xyz[1] - 0.46) * SCALE];
  const TRAY = { x: -158, y: 30, w: 262, d: 28, r: 3 };
  const SLIDE0 = -151, PITCH = 6.2, SLIDE_Z = 6, SLIDE_H = 22, LIFT = 9;
  const SPLIT = SLIDE0 + 30.5 * PITCH;
  const STAND = { x: 30, y: NODE[1] - 16, w: 34, d: 32, r: 3 };
  const POST = [47, NODE[1]];
  const ARM_Z = 94;
  const BOX = { x: 98, y: -70, w: 54, d: 40, r: 4 };
  const BOX_H = 50;

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -17, 0), [POST[0], POST[1], ARM_Z + 10], [X0, PY, ZC + R + 6], [BOX.x + BOX.w, BOX.y, BOX_H + 2]],
    W, H, { pad: 22, azimuth: 36, elevation: 28 },
  );
  const t = toolsOf(P);
  const { at, S, L, D, byDepth, screw } = t;
  const PIPE = G.frameAlong([X0, PY, ZC], [1, 0, 0]);

  function vblock(cx) {
    const out = [t.halo({ x: cx - 11, y: PY - 26, w: 22, d: 52, r: 2 }, 0, 0.1, 3, 0.6)];
    const base = { x: cx - 10, y: PY - 25, w: 20, d: 50, r: 2 };
    out.push(S(k.slabOf(base, 0, 12, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(base, 4, P, 3), { tone: "faint" }) }));
    const F = G.frameOf([cx - 10, PY, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    // Two jaws, their faces tangent to the pipe at 45 degrees.
    out.push(S(G.prismOf(F, [[-25, 12], [-6.4, 12], [-21, 26.6], [-25, 26.6]], 0, 20, P), { tone: "mid" }));
    out.push(S(G.prismOf(F, [[6.4, 12], [25, 12], [25, 26.6], [21, 26.6]], 0, 20, P), { tone: "mid" }));
    out.push(screw(cx - 5, PY + 23, 26.6, 0.9), screw(cx + 5, PY + 23, 26.6, 0.9));
    out.push(screw(cx - 5, PY - 23, 26.6, 0.9));
    return out.join("");
  }

  function pipe() {
    const out = [t.halo({ x: X0, y: PY - R + 4, w: FX - X0, d: 2 * R - 8, r: 12 }, 0, 0.1, 6, 0.55)];
    // Flange at the far end with a bolt circle
    out.push(S(G.disc(0, 6, R + 7, PIPE, P), { tone: "mid" }));
    out.push(D(G.dotsOf(PIPE, 6, R + 3.6, 12, P, { fade: [0.04, 0.42] }), { size: 0.5 }));
    // The glass body, with two etched bands
    const body = G.disc(6, FX - X0, R, PIPE, P);
    const bands = [26, 60, 94].map((s) => G.arcOf(PIPE, s, R, P)).join("");
    out.push(S(body, { tone: "hi", inner: L(bands, { tone: "faint" }) }));
    // The cut face: wall ring, then the field and the mesh drawn in its plane
    const s = FX - X0;
    out.push(L(G.circleOf(PIPE, s, RI, P), { tone: "mid" }));
    const m = t.faceX(FX + 0.05, PY, ZC);
    out.push(`<g data-part="face" transform="${m}"><clipPath id="cm-face-clip"><circle r="${RI - 0.3}"/></clipPath><rect x="${-RI}" y="${-RI}" width="${2 * RI}" height="${2 * RI}" class="cm-face-glass" clip-path="url(#cm-face-clip)"/><image data-face href="" x="${-RI}" y="${-RI}" width="${2 * RI}" height="${2 * RI}" preserveAspectRatio="none" clip-path="url(#cm-face-clip)"/></g>`);
    const mesh = FLOW.mesh.a1, dots = [];
    for (let i = 0; i < mesh.length; i += 2) dots.push(at([FX, PY - mesh[i] * SCALE, ZC + mesh[i + 1] * SCALE]));
    out.push(`<g class="cm-mesh">${D(dots, { size: 0.3, tone: "hi" })}</g>`);
    out.push(L(G.circleOf(PIPE, s, R, P), { tone: "hi" }));
    return out.join("");
  }

  function stand() {
    const out = [t.halo(STAND, 0, 0.1, 3, 0.6)];
    out.push(S(k.slabOf(STAND, 0, 10, P, 4, 0.6), { tone: "mid" }));
    out.push(S(k.slabOf(k.insetPlan(STAND, 1), 10, 10, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(k.insetPlan(STAND, 1), 15, P, 4), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(STAND, 3.5), 20, P), { tone: "faint" }));
    out.push(t.knob(STAND.x + 25, STAND.y + 24, 20, 4.6, 3.6, 30));
    for (const [x, y] of [[STAND.x + 4, STAND.y + 4], [STAND.x + 4, STAND.y + STAND.d - 4]]) out.push(D([at([x, y, 20])], { size: 0.45 }));
    // Post, clamp, arm, drop rod
    out.push(S(k.cylinder(POST[0], POST[1], 4.2, 20, 3, P, 28), { tone: "mid" }));
    out.push(S(k.cylinder(POST[0], POST[1], 3, 23, ARM_Z - 23 - 4, P, 24), { tone: "mid", crease: "none", inner: L([46, 70].map((z) => k.sideArc(POST[0], POST[1], 3, z, P, 16)).join(""), { tone: "faint" }) }));
    const clamp = { x: POST[0] - 6.5, y: POST[1] - 6.5, w: 13, d: 13, r: 2.4 };
    out.push(S(k.slabOf(clamp, ARM_Z - 4, 12, P, 4, 0.5), { tone: "mid" }));
    out.push(S(k.cylinder(POST[0], POST[1], 3, ARM_Z + 8, 8, P, 24), { tone: "mid", crease: "none" }));
    out.push(S(k.cylinder(POST[0], POST[1], 3.6, ARM_Z + 16, 1.6, P, 24), { tone: "mid" }));
    const arm = { x: FX + 40, y: POST[1] - 3, w: POST[0] - 6.5 - (FX + 40), d: 6, r: 1.6 };
    out.push(S(k.slabOf(arm, ARM_Z, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([arm.x + 3.5, POST[1], ARM_Z + 4]), at([arm.x + arm.w - 4, POST[1], ARM_Z + 4])], { size: 0.45 }));
    out.push(S(k.cylinder(FX + 44, POST[1], 2.2, NODE[2] + 6, ARM_Z - NODE[2] - 6, P, 20), { tone: "mid", crease: "none" }));
    // Probe holder block, probe body and needle along -x, tip on the node
    const holder = { x: FX + 38, y: NODE[1] - 5, w: 12, d: 10, r: 1.5 };
    out.push(S(k.slabOf(holder, NODE[2] - 5, 11, P, 3, 0.4), { tone: "mid" }));
    out.push(screw(FX + 44, NODE[1], NODE[2] + 6, 1));
    const F = G.frameAlong([FX, NODE[1], NODE[2]], [1, 0, 0]);
    out.push(S(G.solidOf([[14, 1.2], [16, 2.6], [38, 2.6]], F, P), { tone: "hi" }));
    out.push(S(G.disc(0.4, 14, 0.55, F, P), { tone: "hi", lit: true }));
    out.push(D([at(NODE)], { size: 0.9, tone: "hi" }));
    return out.join("");
  }

  function box() {
    const out = [t.halo(BOX, 0, 0.1, 4, 0.7)];
    out.push(S(k.slabOf(BOX, 0, BOX_H, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(BOX, 7, P, 5), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(BOX, 3.5), BOX_H, P, 4), { tone: "faint" }));
    for (const [x, y] of k.corners(BOX, 6)) out.push(screw(x, y, BOX_H, 0.9));
    // Vent slots on the lid
    for (let i = 0; i < 5; i++) {
      const slot = { x: BOX.x + 10 + i * 6, y: BOX.y + 8, w: 2.6, d: 14, r: 1.3 };
      out.push(L(k.planOutline(slot, BOX_H, P, 3), { tone: "lo" }));
    }
    // Screen on the +x face, with the node's four numbers
    const X = BOX.x + BOX.w, yc = BOX.y + BOX.d / 2;
    const m = t.faceX(X + 0.05, yc, 30);
    out.push(`<g transform="${m}"><rect x="-17" y="-14" width="34" height="24" rx="2" class="cm-bezel"/><rect x="-15" y="-12" width="30" height="20" rx="1.2" class="cm-screen"/>` +
      ["Ux", "Uy", "Uz", "p"].map((name, i) => `<text class="cm-screen-text" x="-12.6" y="${-7.2 + i * 4.3}" font-size="3.4">${name}</text><text class="cm-screen-text" data-val="${i}" x="12.6" y="${-7.2 + i * 4.3}" font-size="3.4" text-anchor="end">0</text>`).join("") +
      `<circle cx="-11" cy="14" r="1.6" class="cm-btn"/><circle cx="-6" cy="14" r="1.6" class="cm-btn"/><circle cx="12.4" cy="14" r="1.1" class="cm-led"/></g>`);
    return out.join("");
  }

  function tray() {
    const out = [t.halo(TRAY, 0, 0.1, 3, 0.6)];
    out.push(S(k.slabOf(TRAY, 0, SLIDE_Z, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(TRAY, 3, P, 4), { tone: "faint" }) }));
    const groove = { x: TRAY.x + 4, y: TRAY.y + 5, w: TRAY.w - 8, d: TRAY.d - 10, r: 2 };
    out.push(L(k.planOutline(groove, SLIDE_Z, P, 3), { tone: "lo" }));
    out.push(D([at([TRAY.x + 2.2, TRAY.y + TRAY.d / 2, SLIDE_Z]), at([TRAY.x + TRAY.w - 2.2, TRAY.y + TRAY.d / 2, SLIDE_Z])], { size: 0.45 }));
    return out.join("");
  }
  const slidePlan = (i) => ({ x: SLIDE0 + i * PITCH - 0.9, y: TRAY.y + 6, w: 1.8, d: TRAY.d - 12, r: 0.4 });
  function slide(i) {
    const plan = slidePlan(i);
    return S(k.slabOf(plan, SLIDE_Z, SLIDE_H, P, 2), { tone: i > 30 ? "lo" : "mid", crease: "none" });
  }
  function splitStop() {
    const plan = { x: SPLIT - 1.6, y: TRAY.y - 2, w: 3.2, d: TRAY.d + 4, r: 0.8 };
    return S(k.slabOf(plan, SLIDE_Z, 14, P, 2, 0.3), { tone: "hi", crease: "lo" }) + D([at([SPLIT, TRAY.y + 1, SLIDE_Z + 14]), at([SPLIT, TRAY.y + TRAY.d - 1, SLIDE_Z + 14])], { size: 0.4 });
  }

  // Cable from the back of the probe holder down to the bench and round the front of the stand to the box.
  // Drawn in two parts: the drop sits behind the stand, the run along the front is in front of it.
  const CY = STAND.y + STAND.d + 5;
  const cableBack = k.wireSvg(at([FX + 50, NODE[1], NODE[2] + 1]), at([FX + 60, CY, 0.6]), { via: [at([FX + 60, NODE[1], NODE[2] + 1]), at([FX + 60, NODE[1], 0.6])], tone: "mid", ends: "from" });
  const cableFront = k.wireSvg(at([FX + 60, CY, 0.6]), at([BOX.x + 12, BOX.y + BOX.d, 9]), { via: [at([BOX.x + 12, CY, 0.6]), at([BOX.x + 12, BOX.y + BOX.d, 0.6])], tone: "mid", ends: "to" });

  const strip = { plan: { x: TRAY.x, y: TRAY.y + TRAY.d + 4, w: TRAY.w, d: 7, r: 1 }, from: SLIDE0, to: SLIDE0 + 40 * PITCH, step: PITCH, every: 10 };
  const slides = [];
  for (let i = 0; i <= 40; i++) slides.push(`<g data-slide="${i}">${slide(i)}</g>`);

  const svg = k.figureSvg({
    width: W, height: H,
    label: "A CFD bench. A glass pipe sample lies on two V-blocks; its cut face shows the water speed and the 553 mesh points of the plane one diameter after the bend. A probe on a stand touches one mesh point and a readout box shows its velocity and pressure. In front, a rack holds 41 slides, one per saved snapshot, with a stop at 1.5 seconds; the current slide is raised.",
    body: [
      t.plate(PLATE, 12, 5, strip),
      t.label({ x: PLATE.x + PLATE.w - 58, y: PLATE.y + 10, w: 44, d: 11, r: 1.5 }),
      vblock(-134), vblock(-70),
      pipe(),
      cableBack,
      stand(),
      box(),
      cableFront,
      tray(),
      slides.slice(0, 31).join(""),
      splitStop(),
      slides.slice(31).join(""),
    ],
  });
  const markup = k.plateHtml({
    fig: "Fig 1",
    title: "CFD bench",
    hint: "Drag along the slides",
    readout: "t = 0.05 s · snapshot 1 of 41",
    keys: [
      { mark: "lit", label: "Probe tip and the current snapshot" },
      { mark: "raised", label: "Pipe sample, stand, readout and slide rack" },
      { mark: "dotted", label: "Mesh points on the cut face" },
    ],
    caption: "Real data from the thesis run. The cut face is the plane one diameter after the bend, coloured by water speed, with its 553 mesh points. The probe sits on one point, and the box shows that point’s velocity and pressure at the current snapshot. Slides left of the stop block (up to 1.5 s) trained the model; the rest tested it.",
    body: `<div class="iso-stage">${svg}</div>`,
  });
  const live = {
    P, slide: { lift: LIFT, pitch: PITCH, x0: SLIDE0 }, node: NODE,
    probe: { U: pr.U, p: pr.p },
  };
  return { markup, live };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fig 2: Dean rig
// ═══════════════════════════════════════════════════════════════════════════
function dean() {
  const W = 640, H = 470;
  const PLATE = { x: -176, y: -62, w: 340, d: 112, r: 8 };
  const RP = 9, DD = 18, ZP = 42, XB = -34, RB = 27; // pipe radius, diameter, leg height, bend start, bend radius
  const XV = XB + RB, ZE = ZP + RB; // vertical leg x, bend exit height
  const ZT = ZE + 10 * DD; // outlet
  const XIN = -158;
  const COL = { x: XV - 9, y: -44, w: 18, d: 15, r: 2 };
  const COL_TOP = ZT + 12;
  const ZREF = ZE + DD; // collar built at 1 D
  const CR = 13.5, CH = 7;
  const VIEW = { x: 64, y: -30, w: 52, d: 64, r: 4 };
  const SCR = [VIEW.x + VIEW.w, VIEW.y + VIEW.d / 2, 74]; // screen centre on the +x face
  const SR = 25;
  const DIAL = [VIEW.x + 24, VIEW.y + 28, 109];

  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -17, 0), [XV, 0, COL_TOP + 4], [COL.x, COL.y, COL_TOP + 4], [XIN, 0, ZP + 20], [VIEW.x + VIEW.w, VIEW.y + VIEW.d, 0]],
    W, H, { pad: 22, azimuth: 40, elevation: 24 },
  );
  const t = toolsOf(P);
  const { at, S, L, D, screw } = t;
  const FX = G.frameAlong([XIN, 0, ZP], [1, 0, 0]);
  const FZ = G.frameAlong([XV, 0, 0], [0, 0, 1]);

  // Route of the horizontal leg and the bend, ending at the bend's exit flange
  const route = [];
  for (let x = XIN + 6; x < XB; x += 6) route.push([x, 0, ZP]);
  route.push([XB, 0, ZP]);
  for (let i = 1; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; route.push([XB + RB * Math.sin(a), 0, ZP + RB - RB * Math.cos(a)]); }
  const along = (x) => x - (XIN + 6);
  const SUP = [-128, -78];
  const gaps = [...SUP.map((x) => [along(x) - 2.2, along(x) + 2.2]), [along(XB) - 9, along(XB) - 3]];
  const pieces = tubePieces(route, RP, P, { maxLength: 18, gaps, caps: [true, false] });

  function supports(x) {
    const out = [t.halo({ x: x - 8, y: -10, w: 16, d: 20, r: 3 }, 0, 0.1, 3, 0.6)];
    out.push(S(k.cylinder(x, 0, 8, 0, 3, P, 28), { tone: "mid" }));
    out.push(D(G.dotsOf(G.frameAlong([x, 0, 0], [0, 0, 1]), 3, 6, 4, P, { all: true, phase: 0.8 }), { size: 0.45 }));
    out.push(S(k.cylinder(x, 0, 3.4, 3, ZP - RP - 5 - 3, P, 24), { tone: "mid", crease: "none" }));
    const saddle = { x: x - 5, y: -8, w: 10, d: 16, r: 1.5 };
    out.push(S(k.slabOf(saddle, ZP - RP - 5, 3.4, P, 3, 0.3), { tone: "mid" }));
    out.push(S(k.slabOf({ x: x - 2.2, y: -3, w: 4.4, d: 6, r: 0.8 }, ZP - RP - 1.6, 1.6, P, 2), { tone: "mid", crease: "none" }));
    return out.join("");
  }
  const band = (x) => {
    const F = G.frameAlong([x - 2.2, 0, ZP], [1, 0, 0]);
    return S(G.ringBand(0, 4.4, RP, RP + 1.6, F, P), { tone: "mid", inner: L(G.arcOf(F, 2.2, RP + 1.6, P), { tone: "faint" }) });
  };

  function pipeLow() {
    const out = [t.halo({ x: XIN, y: -RP, w: XV - XIN + RP, d: 2 * RP, r: 8 }, 0, 0.1, 6, 0.5)];
    // Inlet flange and stub
    out.push(S(G.disc(0, 6, RP + 6, FX, P), { tone: "mid" }));
    out.push(D(G.dotsOf(FX, 6, RP + 3.4, 8, P, { fade: [0.04, 0.42] }), { size: 0.45 }));
    return out.join("");
  }
  // Pipe chunks, clamp bands and the bend flange painted together in true depth order,
  // so each band sits between the chunk behind it and the chunk in front of it.
  const depth = (p) => G.dot3(p, G.viewOf(P));
  const tubeSorted = () => [
    ...pieces.map((p) => [depth(p.mid), tubeSvg(p, { tone: "hi" })]),
    ...SUP.map((x) => [depth([x, 0, ZP]), band(x)]),
    [depth([XB - 6, 0, ZP]), bendFlange()],
  ].sort((a, b) => a[0] - b[0]).map((q) => q[1]).join("");
  const bendFlange = () => {
    const F = G.frameAlong([XB - 9, 0, ZP], [1, 0, 0]);
    return S(G.disc(0, 6, RP + 5, F, P), { tone: "mid" }) + D(G.dotsOf(F, 6, RP + 3, 8, P, { fade: [0.04, 0.42] }), { size: 0.45 });
  };
  const exitFlange = () => S(k.cylinder(XV, 0, RP + 5, ZE, 5, P, 40, 0.4), { tone: "mid" }) + D(G.dotsOf(FZ, ZE + 5, RP + 3, 8, P, { all: true, phase: 0.2 }), { size: 0.45 });

  function column() {
    const out = [t.halo(COL, 0, 0.1, 4, 0.7)];
    const foot = k.insetPlan(COL, -5);
    out.push(S(k.slabOf(foot, 0, 4, P, 4, 0.5), { tone: "mid" }));
    for (const [x, y] of k.corners(foot, 3)) out.push(D([at([x, y, 4])], { size: 0.45 }));
    out.push(S(k.slabOf(COL, 4, COL_TOP - 4, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(COL, 8, P, 4), { tone: "faint" }) }));
    out.push(S(k.slabOf(k.insetPlan(COL, -1), COL_TOP, 3, P, 4, 0.4), { tone: "mid" }));
    // Ruler on the +x face: a tick per half diameter, longer at each diameter, counted from the bend's exit
    const X = COL.x + COL.w, ticks = [];
    for (let d = 0; d <= 20; d++) {
      const z = ZE + d * DD / 2, len = d % 2 ? 2.4 : 4.6;
      ticks.push([k.segment([X, COL.y + 1.5, z], [X, COL.y + 1.5 + len, z], P), d % 2 ? "lo" : "mid"]);
    }
    out.push(L(ticks.filter((q) => q[1] === "lo").map((q) => q[0]).join(""), { tone: "lo", free: "end" }));
    out.push(L(ticks.filter((q) => q[1] === "mid").map((q) => q[0]).join(""), { tone: "mid", free: "end" }));
    out.push(L(k.segment([X, COL.y + 1.5, ZE], [X, COL.y + 1.5, ZE + 10 * DD], P), { tone: "lo" }));
    // Rail on the front face
    const rail = { x: XV - 3, y: COL.y + COL.d, w: 6, d: 2.5, r: 0.6 };
    out.push(S(k.slabOf(rail, ZE + 8, 10 * DD - 16, P, 2), { tone: "mid", crease: "none" }));
    for (const z of [ZE + 14, ZT - 14]) out.push(D([at([XV, rail.y + rail.d, z])], { size: 0.45 }));
    // Top bracket holding the outlet
    const arm = { x: XV - 4, y: COL.y + COL.d, w: 8, d: -COL.y - COL.d - RP - 2, r: 1 };
    out.push(S(k.slabOf(arm, ZT - 12, 5, P, 3, 0.3), { tone: "mid" }));
    return out.join("");
  }
  const topClamp = () => S(k.cylinder(XV, 0, RP + 3, ZT - 13, 7, P, 36, 0.3), { tone: "mid" }) + D([at([XV + RP + 1.6, 0, ZT - 6])], { size: 0.4 });

  // Vertical leg as one cylinder; the copy above the collar is clipped by a region that moves with it
  const legZ0 = ZE + 5, legH = ZT - legZ0;
  const leg = S(k.cylinder(XV, 0, RP, legZ0, legH, P, 40), { tone: "hi", crease: "none", inner: L([ZE + 4 * DD, ZE + 8 * DD].map((z) => k.sideArc(XV, 0, RP, z, P, 24)).join(""), { tone: "faint" }) });
  const aV = Math.atan2(k.towardViewer(P)[1], k.towardViewer(P)[0]);
  const clipPts = [];
  for (let i = 0; i <= 32; i++) { const a = aV - Math.PI / 2 + (i / 32) * Math.PI; clipPts.push(at([XV + RP * 1.02 * Math.cos(a), RP * 1.02 * Math.sin(a), ZREF + CH / 2])); }
  const [l, r] = [clipPts[0], clipPts[clipPts.length - 1]];
  const clipD = `M${l[0] - 0.4} ${l[1]}L${clipPts.map(([x, y]) => `${f3(x)} ${f3(y)}`).join("L")}L${r[0] + 0.4} ${r[1]}L${r[0] + 0.4} -400L${l[0] - 0.4} -400Z`;

  function carriage() {
    const out = [];
    const block = { x: XV - 7, y: COL.y + COL.d + 2.5, w: 14, d: 5, r: 1 };
    out.push(S(k.slabOf(block, ZREF - 7, 14, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([XV - 4, block.y + block.d, ZREF + 4]), at([XV + 4, block.y + block.d, ZREF - 4])], { size: 0.4 }));
    const arm = { x: XV - 3, y: block.y + block.d, w: 6, d: -(block.y + block.d) - CR + 1, r: 0.8 };
    out.push(S(k.slabOf(arm, ZREF - 2, 4, P, 2, 0.3), { tone: "mid" }));
    out.push(t.knob(XV + 9, block.y + 2.5, ZREF + 7, 2.6, 3, 18));
    return out.join("");
  }
  function collar() {
    const out = [];
    out.push(S(k.cylinder(XV, 0, CR, ZREF - CH / 2, CH, P, 48, 0.5), { tone: "hi", crease: "lo", lit: true, inner: L(k.sideArc(XV, 0, CR, ZREF, P, 32), { tone: "faint" }) }));
    out.push(L(k.ring(XV, 0, RP + 1.4, ZREF + CH / 2, P, 40), { tone: "lo" }));
    out.push(D(G.dotsOf(FZ, ZREF + CH / 2, (CR + RP) / 2 + 0.6, 6, P, { all: true, phase: 0.3 }), { size: 0.45 }));
    return out.join("");
  }

  function viewer() {
    const out = [t.halo(VIEW, 0, 0.1, 5, 0.75)];
    const base = k.insetPlan(VIEW, -4);
    out.push(S(k.slabOf(base, 0, 5, P, 5, 0.5), { tone: "mid" }));
    for (const [x, y] of k.corners(base, 4)) out.push(D([at([x, y, 5])], { size: 0.45 }));
    out.push(S(k.slabOf(VIEW, 5, 100, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(VIEW, 22, P, 5) + k.sideSeam(VIEW, 96, P, 5), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(VIEW, 3.5), 105, P, 4), { tone: "faint" }));
    for (const [x, y] of k.corners(VIEW, 6)) out.push(screw(x, y, 105, 0.9));
    // Screen, in the plane of the +x face
    const m = t.faceX(SCR[0] + 0.05, SCR[1], SCR[2]);
    out.push(`<g data-part="screen" transform="${m}"><circle r="${SR + 3.4}" class="cm-bezel"/><circle r="${SR + 1.2}" class="cm-bezel-in"/><clipPath id="cm-scr-clip"><circle r="${SR}"/></clipPath><circle r="${SR}" class="cm-screen"/><image data-scr href="" x="${-SR}" y="${-SR}" width="${2 * SR}" height="${2 * SR}" preserveAspectRatio="none" clip-path="url(#cm-scr-clip)" class="cm-scr-img"/><g data-lines clip-path="url(#cm-scr-clip)"></g><g data-lines-b clip-path="url(#cm-scr-clip)"></g><path d="M${-SR} 0H${SR}M0 ${-SR}V${SR}" class="cm-cross"/><text x="0" y="${-SR - 6}" class="cm-scr-label" text-anchor="middle" font-size="3.4">outer wall</text></g>`);
    // Knobs under the screen on the same face
    for (const dy of [-12, 0, 12]) {
      const c = [SCR[0], SCR[1] - dy, 20];
      out.push(L(k.sideRing(c, 3.6, "x", P), { tone: "lo" }) + L(k.sideRing(c, 2.2, "x", P), { tone: "mid" }));
    }
    // Dial on top
    const [dx, dy, dz] = DIAL;
    out.push(S(k.cylinder(dx, dy, 15, 105, 4, P, 48, 0.6), { tone: "hi", crease: "lo" }));
    out.push(L(k.knurl(dx, dy, 15, 106, 109, 60, P, 0.3), { tone: "lo" }));
    out.push(L(k.ring(dx, dy, 13, 109, P, 48), { tone: "lo" }));
    const ticks = k.radialTicks(dx, dy, 12, 25, 5, 109, [1.2, 2.6], P, -Math.PI * 0.75, Math.PI * 1.5);
    out.push(L(ticks.minor, { tone: "lo", free: true }), L(ticks.major, { tone: "mid", free: true }));
    out.push(L(k.ring(dx, dy, 1.4, 109, P, 14), { tone: "mid" }));
    return out.join("");
  }
  const needleAt = (v) => {
    const a = -Math.PI * 0.75 + Math.min(1, v / 0.25) * Math.PI * 1.5, [x, y] = DIAL;
    return k.lineOnTop([x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6], [x + Math.sin(a) * 10.5, y - Math.cos(a) * 10.5], 109.2, P);
  };

  const cableFrom = [XV + 7, COL.y + COL.d + 7.5, ZREF];
  const cablePath = (dz) => {
    const pts = [[cableFrom[0], cableFrom[1], cableFrom[2] + dz], [XV + 12, COL.y + COL.d + 7.5, cableFrom[2] + dz], [XV + 12, COL.y + COL.d + 7.5, 6], [XV + 16, COL.y + COL.d + 7.5, 0.6], [VIEW.x - 8, VIEW.y + 10, 0.6], [VIEW.x, VIEW.y + 10, 9]];
    return pts.map((p) => at(p));
  };
  const cable0 = cablePath(0);

  const move = (dz) => k.translateAlong(P, [0, 0, dz]);
  const svg = k.figureSvg({
    width: W, height: H, className: "cm-dean-svg",
    label: "A flow rig: a flanged pipe that runs along the bench, bends upward and rises ten diameters. A collar on a rail slides up the vertical leg; a viewer shows the cross-section at the collar, outer wall at the top, with streamlines of the sideways flow, and a dial on top reads its peak speed.",
    body: [
      t.plate(PLATE, 12, 5, null),
      t.label({ x: PLATE.x + 14, y: PLATE.y + PLATE.d - 24, w: 44, d: 11, r: 1.5 }),
      column(),
      `<g data-part="carriage" transform="${move(0)}">${carriage()}</g>`,
      `<path data-part="cable" class="iso-line" data-tone="lo" d="${k.pathOf ? k.pathOf(cable0) : ""}"/>`,
      `<circle data-part="cable-a" class="iso-wire-end" cx="${f3(cable0[0][0])}" cy="${f3(cable0[0][1])}" r="1.2"/><circle class="iso-wire-end" cx="${f3(cable0[cable0.length - 1][0])}" cy="${f3(cable0[cable0.length - 1][1])}" r="1.2"/>`,
      supports(SUP[0]), supports(SUP[1]),
      pipeLow(),
      tubeSorted(),
      exitFlange(),
      leg,
      `<g data-part="collar" transform="${move(0)}">${collar()}</g>`,
      `<clipPath id="cm-leg-clip"><path data-part="legclip" d="${clipD}" transform="${move(0)}"/></clipPath><g clip-path="url(#cm-leg-clip)">${leg}</g>`,
      topClamp(),
      S(k.cylinder(XV, 0, RP + 6, ZT, 5, P, 40, 0.5), { tone: "mid" }) + D(G.dotsOf(FZ, ZT + 5, RP + 3.4, 8, P, { all: true, phase: 0.2 }), { size: 0.45 }) + L(k.ring(XV, 0, RP - 2.4, ZT + 5, P, 32), { tone: "lo" }),
      viewer(),
      `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(0.2)}" style="stroke-width:1.1"/>`,
      D([at([DIAL[0], DIAL[1], 109.2])], { size: 0.6, tone: "hi" }),
    ],
  });
  const markup = k.plateHtml({
    fig: "Fig 2",
    title: "Dean rig",
    hint: "Drag the collar up or down",
    readout: "1.0 D after the bend · 0.20 m/s sideways",
    keys: [
      { mark: "lit", label: "Collar: where the cross-section is taken" },
      { mark: "raised", label: "Pipe, supports, rail and viewer" },
      { mark: "dotted", label: "Streamlines of the sideways flow" },
    ],
    caption: "Real data at t = 2.00 s. The collar rides a rail up the vertical leg, ticked every half diameter from the bend’s exit. The screen shows the cross-section at the collar, outer wall at the top, coloured by water speed, with streamlines of the sideways flow traced from the dataset: two counter-rotating swirls. The dial reads the fastest sideways flow there, up to 0.25 m/s.",
    body: `<div class="iso-stage">${svg}</div>`,
  });
  const live = {
    P, zref: ZREF, ze: ZE, dd: DD, cableFrom, view: { x: VIEW.x, y: VIEW.y }, col: { y: COL.y, d: COL.d }, xv: XV,
    dial: DIAL, sr: SR, curve: FLOW.dean.curve.filter((c) => c[0] >= -0.01).map((c) => [c[0], c[1]]),
  };
  return { markup, live };
}

const B = bench();
const Dn = dean();

const css = `/* Generated by scripts/cfd-ml-anatomy.mjs from the Anatomy kit (MIT). Do not edit by hand. */
${k.ISO_CSS}
/* Machine learning for CFD: the kit tinted to the page's paper and navy ink. */
.cm-iso{margin-top:56px;--anatomy-mono:"IBM Plex Mono",ui-monospace,"SF Mono",Menlo,monospace}
.cm-iso .iso-figure{margin:0}
.cm-iso .iso-plate{border-radius:18px;box-shadow:inset 0 0 0 1px var(--rule,#ddd5c4);padding:58px 32px 52px}
.cm-iso .iso-plate-corners{inset:22px 26px}
.cm-iso .iso-svg{max-width:920px}
.cm-iso .iso-legend{margin-top:16px;max-width:780px;font-size:14px}
.cm-iso.iso[data-theme="light"]{
  --anatomy-card:#ebe5d8;--anatomy-paper:#ebe5d8;--anatomy-face:#fbf9f4;--anatomy-top:#fdfcf8;
  --anatomy-shade-0:#d3cbbb;--anatomy-shade-1:#ddd6c7;--anatomy-shade-2:#e7e1d4;--anatomy-shade-3:#f1ece1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#efe9dc;
  --anatomy-hi:#14143a;--anatomy-mid:#857d6e;--anatomy-lo:#b3aa98;--anatomy-faint:#d2cab9;--anatomy-lit:#0c0c33;
  --anatomy-halo:#7d7260;--anatomy-halo-opacity:.3;--anatomy-dot:#14143a;--anatomy-text:#45414f;--anatomy-strong:#0c0c33;--anatomy-muted:#8b8475;
}
.cm-iso.iso[data-theme="dark"]{
  --anatomy-card:#1b1813;--anatomy-paper:#1b1813;--anatomy-face:#24211b;--anatomy-top:#26221c;
  --anatomy-shade-0:#16130f;--anatomy-shade-1:#191612;--anatomy-shade-2:#1d1a15;--anatomy-shade-3:#211e18;
  --anatomy-lit-top:#322d25;--anatomy-lit-shade:#28241d;
  --anatomy-hi:#e9e3d6;--anatomy-mid:#7d7566;--anatomy-lo:#4f493e;--anatomy-faint:#35302a;--anatomy-lit:#fff7e6;
  --anatomy-halo:#060504;--anatomy-halo-opacity:.85;--anatomy-dot:#e9e3d6;--anatomy-text:#cec7b8;--anatomy-strong:#f4f1e9;--anatomy-muted:#776f60;
}
.cm-iso .cm-face-glass{fill:#0f1730}
.cm-iso .cm-mesh .iso-dots,.cm-iso .cm-mesh circle{fill:#fff;opacity:.55}
.cm-iso .cm-bezel{fill:var(--anatomy-shade-0);stroke:var(--anatomy-mid);stroke-width:.35}
.cm-iso .cm-bezel-in{fill:var(--anatomy-shade-1);stroke:var(--anatomy-lo);stroke-width:.3}
.cm-iso .cm-screen{fill:#0d1424;stroke:#000;stroke-width:.3}
.cm-iso .cm-screen-text{fill:#9ff0c8;font-family:var(--anatomy-mono);font-variant-numeric:tabular-nums}
.cm-iso .cm-btn{fill:var(--anatomy-shade-2);stroke:var(--anatomy-mid);stroke-width:.3}
.cm-iso .cm-led{fill:#5be39b}
.cm-iso .cm-scr-img{opacity:.88}
.cm-iso .cm-cross{stroke:#ffffff;stroke-width:.25;opacity:.25;fill:none}
.cm-iso .cm-scr-label{fill:var(--anatomy-muted);font-family:var(--anatomy-mono)}
.cm-iso .cm-sl{fill:none;stroke:#fff;stroke-width:.55;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:2.2 1.6;animation:cm-flow 1.6s linear infinite}
@keyframes cm-flow{to{stroke-dashoffset:-3.8}}
.cm-iso [data-slide][data-on] .iso-top{fill:var(--anatomy-lit-top)}
.cm-iso [data-slide][data-on] .iso-edge{stroke:var(--anatomy-lit);stroke-width:1}
.cm-iso [data-slide][data-on] .iso-shade{fill:var(--anatomy-lit-shade)}
.cm-iso .iso-stage svg{touch-action:pan-y;cursor:grab}
.cm-iso .iso-stage svg:active{cursor:grabbing}
@media (prefers-reduced-motion:reduce){.cm-iso .cm-sl{animation:none}}
@media (max-width:700px){.cm-iso .iso-plate{padding:48px 14px 92px;overflow:hidden}.cm-iso .iso-plate-corners{inset:16px 14px}.cm-iso .iso-plate-corner[data-corner="hint"]{bottom:44px}.cm-iso .iso-plate-corner[data-corner="readout"]{left:0;white-space:normal;line-height:1.5}}
`;

const live = `// Generated by scripts/cfd-ml-anatomy.mjs. Do not edit by hand.
(() => {
const root = document.documentElement, system = matchMedia("(prefers-color-scheme: dark)"), still = matchMedia("(prefers-reduced-motion: reduce)");
const RADIANS = Math.PI / 180, UNIT = Math.sqrt(1.6);
${k.cameraOf.toString()}
${k.iso.toString()}
${k.depthOf.toString()}
${k.pathOf.toString()}
const tenth = (v) => Math.round(v * 10) / 10;
const jet = (t) => { const c = (x) => Math.min(1, Math.max(0, 1.5 - Math.abs(4 * t - x))) * 255; return [c(3), c(2), c(1)]; };
const wraps = [...document.querySelectorAll(".cm-iso")];
const theme = () => wraps.forEach((w) => { w.dataset.theme = root.dataset.theme || (system.matches ? "dark" : "light"); });
theme();
new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
system.addEventListener("change", theme);
const translate = (P, d) => { const o = iso([0, 0, 0], P), q = iso(d, P); return "translate(" + (q[0] - o[0]).toFixed(2) + " " + (q[1] - o[1]).toFixed(2) + ")"; };
const atlases = {};
const atlas = (src) => (atlases[src] ||= new Promise((res) => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0); res({ w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }); }; img.src = src; }));
function tileURL(A, n, col, row, flip) {
  const c = document.createElement("canvas"); c.width = c.height = n;
  const g = c.getContext("2d"), im = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const sy = flip ? n - 1 - y : y, v = A.d[((row * n + sy) * A.w + col * n + x) * 4], o = (y * n + x) * 4;
    if (v === 255) { im.data[o + 3] = 0; continue; }
    const q = jet(v / 254); im.data[o] = q[0]; im.data[o + 1] = q[1]; im.data[o + 2] = q[2]; im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return c.toDataURL();
}
const watch = (el, fn) => new IntersectionObserver((es) => fn(es[es.length - 1].isIntersecting), { rootMargin: "80px 0px" }).observe(el);

// ── Fig 1: CFD bench ─────────────────────────────────────────────
(() => {
  const wrap = document.querySelector('.cm-iso[data-fig="bench"]');
  if (!wrap) return;
  const B = ${JSON.stringify(B.live)};
  const svg = wrap.querySelector("svg"), readout = wrap.querySelector("[data-readout]");
  readout.setAttribute("aria-live", "polite");
  const slides = [...svg.querySelectorAll("[data-slide]")], face = svg.querySelector("[data-face]"), vals = [...svg.querySelectorAll("[data-val]")];
  const urls = [];
  let A = null, cur = -1, k = 1, touring = !still.matches, visible = false, timer = 0, idle = 0;
  atlas("media/discs.png").then((a) => { A = a; show(k, true); });
  const fmt = (v) => (v < 0 ? "−" : " ") + Math.abs(v).toFixed(4);
  function show(i, force) {
    i = Math.max(1, Math.min(40, Math.round(i)));
    if (i === cur && !force) return;
    if (cur >= 0) slides[cur].setAttribute("transform", "");
    cur = i;
    slides[i].setAttribute("transform", translate(B.P, [0, 0, B.slide.lift]));
    slides.forEach((s, j) => s.toggleAttribute("data-on", j === i));
    if (A) { urls[i] ||= tileURL(A, 96, i, 1, false); face.setAttribute("href", urls[i]); }
    const U = B.probe.U[i], p = B.probe.p[i];
    vals[0].textContent = fmt(U[0]); vals[1].textContent = fmt(U[1]); vals[2].textContent = fmt(U[2]); vals[3].textContent = Math.round(p).toLocaleString("en");
    readout.textContent = "t = " + (i * 0.05).toFixed(2) + " s · snapshot " + (i + 1) + " of 41 · " + (i <= 30 ? "train" : "test");
  }
  const tick = () => { if (!touring || !visible) return; k = k >= 40 ? 1 : k + 1; show(k); timer = setTimeout(tick, k === 40 ? 2200 : k === 30 ? 1200 : 260); };
  const run = () => { clearTimeout(timer); if (touring && visible) timer = setTimeout(tick, 400); };
  const AX = (() => { const o = iso([0, 0, 0], B.P), q = iso([1, 0, 0], B.P); return [q[0] - o[0], q[1] - o[1]]; })();
  const pick = (e) => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sx = (e.clientX - r.left) * vb.width / r.width, sy = (e.clientY - r.top) * vb.height / r.height;
    const o = iso([B.slide.x0, 0, 0], B.P), along = ((sx - o[0]) * AX[0] + (sy - o[1]) * AX[1]) / (AX[0] * AX[0] + AX[1] * AX[1]);
    k = Math.max(1, Math.min(40, Math.round(along / B.slide.pitch))); show(k);
  };
  const pause = () => { touring = false; clearTimeout(timer); clearTimeout(idle); idle = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 9000); };
  svg.addEventListener("pointerdown", (e) => { pause(); pick(e); svg.setPointerCapture(e.pointerId); svg.onpointermove = pick; svg.onpointerup = svg.onpointercancel = () => { svg.onpointermove = null; }; });
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("keydown", (e) => { const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (!d) return; e.preventDefault(); pause(); k = Math.max(1, Math.min(40, k + d)); show(k); });
  watch(wrap, (v) => { visible = v; run(); });
  show(still.matches ? 31 : 1, true);
})();

// ── Fig 2: Dean rig ──────────────────────────────────────────────
(() => {
  const wrap = document.querySelector('.cm-iso[data-fig="dean"]');
  if (!wrap) return;
  const D = ${JSON.stringify(Dn.live)};
  const svg = wrap.querySelector("svg"), readout = wrap.querySelector("[data-readout]");
  readout.setAttribute("aria-live", "polite");
  const q = (s) => svg.querySelector('[data-part="' + s + '"]');
  const carriage = q("carriage"), collar = q("collar"), clip = q("legclip"), cable = q("cable"), cableA = q("cable-a"), needle = q("needle");
  const scr = svg.querySelector("[data-scr]"), layerA = svg.querySelector("[data-lines]"), layerB = svg.querySelector("[data-lines-b]");
  let LINES = null, A = null, urls = [], shown = -1;
  let dist = 1, goal = 1, touring = !still.matches, visible = false, frame = 0, last = 0, clock = 0, idle = 0, dir = 1;
  const MIN = 0.8, MAX = 8.8;
  Promise.all([fetch("media/dean-lines.json").then((r) => r.json()), atlas("media/dean.png")]).then(([l, a]) => { LINES = l; A = a; draw(true); });
  const peakAt = (d) => { const c = D.curve; let i = 0; while (i < c.length - 2 && c[i + 1][0] < d) i++; const [d0, v0] = c[i], [d1, v1] = c[i + 1]; return v0 + (v1 - v0) * Math.max(0, Math.min(1, (d - d0) / (d1 - d0 || 1))); };
  const R = D.sr;
  const pathOfLine = (L) => { let s = ""; for (let i = 0; i < L.length; i += 2) s += (i ? "L" : "M") + (L[i] * R).toFixed(2) + " " + (-L[i + 1] * R).toFixed(2); return s; };
  const fill = (layer, st) => { layer.innerHTML = LINES.lines[st].map((L) => '<path class="cm-sl" d="' + pathOfLine(L) + '"/>').join(""); };
  function needleD(v) {
    const a = -Math.PI * 0.75 + Math.min(1, v / 0.25) * Math.PI * 1.5, x = D.dial[0], y = D.dial[1], z = D.dial[2] + 0.2;
    return pathOf([iso([x - Math.sin(a) * 2.6, y + Math.cos(a) * 2.6, z], D.P), iso([x + Math.sin(a) * 10.5, y - Math.cos(a) * 10.5, z], D.P)]);
  }
  function draw(force) {
    const dz = (dist - 1) * D.dd, tr = translate(D.P, [0, 0, dz]);
    carriage.setAttribute("transform", tr); collar.setAttribute("transform", tr); clip.setAttribute("transform", tr);
    const f = D.cableFrom, c0 = iso([f[0], f[1], f[2] + dz], D.P), c1 = iso([D.xv + 12, f[1], f[2] + dz], D.P), rest = cable.getAttribute("d").split("L").slice(2).join("L");
    cable.setAttribute("d", "M" + c0[0].toFixed(1) + " " + c0[1].toFixed(1) + "L" + c1[0].toFixed(1) + " " + c1[1].toFixed(1) + "L" + rest);
    cableA.setAttribute("cx", c0[0].toFixed(1)); cableA.setAttribute("cy", c0[1].toFixed(1));
    const v = peakAt(dist);
    needle.setAttribute("d", needleD(v));
    readout.textContent = dist.toFixed(1) + " D after the bend · " + v.toFixed(2) + " m/s sideways";
    if (LINES && A) {
      const st = Math.max(0, Math.min(20, Math.round(dist * 2)));
      if (st !== shown || force) {
        shown = st;
        urls[st] ||= tileURL(A, 96, st, 0, false);
        scr.setAttribute("href", urls[st]);
        fill(layerA, st);
      }
    }
  }
  function tick(time) {
    const dt = last ? Math.min((time - last) / 1000, 1 / 30) : 1 / 60; last = time;
    if (touring) { goal += dir * dt * 0.75; if (goal > MAX) { goal = MAX; dir = -1; } if (goal < MIN) { goal = MIN; dir = 1; } }
    const ease = still.matches ? 1 : 1 - Math.exp(-dt / 0.18);
    dist += (goal - dist) * ease;
    draw(false);
    frame = visible && (touring || Math.abs(goal - dist) > 0.002) ? requestAnimationFrame(tick) : 0;
  }
  const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
  const pause = () => { touring = false; clearTimeout(idle); idle = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 9000); };
  const AZ = (() => { const o = iso([0, 0, 0], D.P), p = iso([0, 0, 1], D.P); return [p[0] - o[0], p[1] - o[1]]; })();
  const pick = (e) => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sy = (e.clientY - r.top) * vb.height / r.height;
    const o = iso([D.xv, 0, D.ze], D.P);
    goal = Math.max(MIN, Math.min(MAX, ((sy - o[1]) / AZ[1]) / D.dd)); run();
  };
  svg.addEventListener("pointerdown", (e) => { pause(); pick(e); svg.setPointerCapture(e.pointerId); svg.onpointermove = pick; svg.onpointerup = svg.onpointercancel = () => { svg.onpointermove = null; }; });
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("keydown", (e) => { const d = { ArrowUp: 0.5, ArrowRight: 0.5, ArrowDown: -0.5, ArrowLeft: -0.5 }[e.key]; if (!d) return; e.preventDefault(); pause(); goal = Math.max(MIN, Math.min(MAX, Math.round((goal + d) * 2) / 2)); run(); });
  watch(wrap, (v) => { visible = v; if (v) run(); });
  draw(true);
})();
})();
`;

const benchMarkup = `<!--ill:bench--><div class="iso cm-iso" data-fig="bench" data-theme="light">${B.markup}</div><!--/ill:bench-->`;
const deanMarkup = `<!--ill:dean--><div class="iso cm-iso" data-fig="dean" data-theme="light">${Dn.markup}</div><!--/ill:dean-->`;

writeFileSync(join(OUT, "iso.css"), css);
writeFileSync(join(OUT, "iso.js"), live);
const pagePath = join(OUT, "index.html");
let page = readFileSync(pagePath, "utf8");
for (const [name, markup] of [["bench", benchMarkup], ["dean", deanMarkup]]) {
  const re = new RegExp(`<!--ill:${name}-->[\\s\\S]*?<!--\\/ill:${name}-->`);
  if (!re.test(page)) throw new Error(`index.html has no <!--ill:${name}--> markers`);
  page = page.replace(re, () => markup);
}
writeFileSync(pagePath, page);
console.log("wrote iso.css, iso.js and both figures in index.html");
