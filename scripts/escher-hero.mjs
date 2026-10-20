// Escher case study: the hero. One question about public S3 buckets, told in seven
// scroll-pinned steps on an isometric bench, like the OpenFOAM Studio cover.
// Built with the Anatomy kit (wheresryan22/anatomy, MIT, vendored in anatomy-kit/).
// Writes projects/escher/hero.css and hero.js, and the story's markup between
// <!--ill:hero--> and <!--/ill:hero--> in projects/escher/index.html.
//
//   node scripts/escher-hero.mjs                  build
//   node scripts/escher-hero.mjs --preview <dir>  also write standalone preview pages
//
// Four machines on one bench, joined by cables:
// - your device: the app (monitor and keyboard), the local estate (a card drawer in the
//   device) and the approval key that opens the write line to AWS;
// - the Escher server: it writes every script and every answer, and never holds AWS keys;
// - AWS: the real buckets, the account's Block Public Access switch, and the services that
//   read the buckets;
// - the cables: the prompt, scripts and answers travel to and from the server; reads and
//   writes travel from the device to AWS, with keys that stay in the device's keychain.
// The data is the seeded S3 public-access and remediation stories in escher-V7.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy-kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "projects", "escher");
const KIT = readFileSync(join(HERE, "anatomy-kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

const WIDTH = 760;
const HEIGHT = 520;
const AZIMUTH = 60;
const ELEVATION = 38;

// ── World, in units of about 1 px. x runs along the bench, y across it, z up.
const PLATE = { x: -214, y: -108, w: 428, d: 186, r: 10 };
const PLATE_H = 10;
const FOOT_H = 6;

// Your device: a base unit with the local estate in its drawer, a monitor, a keyboard.
const BASE = { x: -198, y: -48, w: 118, d: 58, r: 4 };
const BASE_H = 18;
const BASE_FRONT = BASE.y + BASE.d;
const BASE_SIDE = BASE.x + BASE.w;
const FOOT = { x: -182, y: -42, w: 40, d: 22, r: 4 };
const NECK = { x: -166, y: -36, w: 8, d: 8, r: 2 };
const MON = { x: -198, y: -34, w: 72, d: 12, r: 3 };
const MON_Z = 36;
const MON_TOP = 92;
const FACE = MON.y + MON.d;
const BEZEL = { x0: -194, x1: -130, z0: 40, z1: 88, r: 4, depth: 1.4 };
const SCREEN = { x0: -191, x1: -133, z0: 43, z1: 85, r: 3, depth: 2 };
const KB = { x: -198, y: 36, w: 58, d: 26, r: 3 };
const DRAWER = { x: -188, y: BASE_FRONT, w: 72, d: 20, z0: 3, z1: 15 };
const CARD_PITCH = 1.6;
const CARD_X0 = DRAWER.x + 3.4;
const KEY = { x: -100, y: -6, z: BASE_H };
const PORT = { net: -38, read: -16, write: -6, z: 8 };

// The Escher server: a tower across the bench.
const SRV = { x: -104, y: -104, w: 58, d: 26, r: 3 };
const SRV_H = 48;
const SRV_FRONT = SRV.y + SRV.d;

// AWS: an API panel, a tray of 41 buckets and the account switch, and three services.
const API = { x: 2, y: -44, w: 18, d: 22, r: 2 };
const API_H = 16;
const COLS = 7;
const ROWS = 6;
const PX = 24;
const PY = 19;
const X0 = 46;
const Y0 = -72;
const TRAY = { x: 30, y: -84, w: 176, d: 150, r: 6 };
const TRAY_H = 6;
const CUP_R = 6.6;
const CUP_H = 9;
const CUP_TOP = TRAY_H + CUP_H;
const LID_R = 7;
const LID_H = 1.4;
const LID_TOP = CUP_TOP + LID_H;
const PIVOT = 5.6;
const SWING = 80;
const PUBLIC = [3, 5];
const ORIGIN = [1, 5]; // cdn-origin, the bucket the CDN serves from
const SWITCH = [6, 5];
const binAt = (i, j) => [X0 + i * PX, Y0 + j * PY];
const [PUB_X, PUB_Y] = binAt(...PUBLIC);
const [SW_X, SW_Y] = binAt(...SWITCH);
const SERVICES = [
  { key: "cdn", plan: { x: 58, y: 44, w: 24, d: 12, r: 2 }, uses: ORIGIN },
  { key: "export", plan: { x: 95, y: 44, w: 20, d: 12, r: 2 }, uses: PUBLIC },
  { key: "analytics", plan: { x: 121, y: 44, w: 20, d: 12, r: 2 }, uses: PUBLIC },
];
const SVC_H = 11;
// Blast radius of each option, as a zone painted on the tray.
const ZONES = {
  delete: { x: 92, y: 13, w: 52, d: 47, r: 6 },
  account: { x: 35, y: -81, w: 167, d: 142, r: 6 },
  private: { x: PUB_X - 9.5, y: PUB_Y - 9.5, w: 19, d: 19, r: 9.5 },
};

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...k.boxCorners(MON, MON_Z, MON_TOP + 1), ...k.boxCorners(SRV, 0, SRV_H + 3)],
  WIDTH,
  HEIGHT,
  { pad: 8, azimuth: AZIMUTH, elevation: ELEVATION },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const depth2 = ([x, y]) => k.depthOf([x, y, 0], P);
const byDepth = (points) => [...points].sort((a, b) => depth2(a) - depth2(b));
const screw = (x, y, z, radius = 1.1) => L(k.ring(x, y, radius, z, P, 14), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });
const slab = (plan, z, h, tone = "mid", steps = 3, bevel = 0, extra = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, ...extra });
const cyl = (x, y, r, z, h, tone = "mid", steps = 24, extra = {}) => S(k.cylinder(x, y, r, z, h, P, steps), { tone, ...extra });
const planeOf = (y) => k.sideMatrix([0, y], 0, P, "left");
const flat = (x0, z0, x1, z1, r, steps = 6) => k.pathOf(k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, steps).map(([u, z]) => [u, -z]), true);
const sideSlot = (x, y, z0, z1, half = 0.7) => k.pathOf(k.roundedPlan({ x: y - half, y: z0, w: half * 2, d: z1 - z0, r: half }, 4).map(([u, z]) => at([x, u, z])), true);
const frontSlot = (y, x0, x1, z, half = 0.7) => k.pathOf(k.roundedPlan({ x: x0, y: z - half, w: x1 - x0, d: half * 2, r: half }, 4).map(([u, w]) => at([u, y, w])), true);
const t1 = (n) => Math.round(n * 10) / 10;
function hull(points) {
  const p = points.map(([x, y]) => [x, y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}

// A recess in a face at constant y (from the desk-computer example).
let clips = 0;
function recess({ x0, x1, z0, z1, r, depth }, y, back = "", backClass = "es-well", inside = "") {
  const id = `es-clip-${clips++}`;
  const ring = k.roundedPlan({ x: x0, y: z0, w: x1 - x0, d: z1 - z0, r }, 6);
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const { sinA } = k.cameraOf(P);
  const tops = [];
  const sides = [[], [], [], []];
  ring.forEach(([ax, az], index) => {
    const [bx, bz] = ring[(index + 1) % ring.length];
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

// ── Base plate on feet, with a label plate.
// Where a screen segment from a (inside a convex outline) to b leaves the outline.
function exitOf(a, b, poly) {
  let best = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const r = [b[0] - a[0], b[1] - a[1]], s = [q[0] - p[0], q[1] - p[1]];
    const den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-9) continue;
    const t = ((p[0] - a[0]) * s[1] - (p[1] - a[1]) * s[0]) / den;
    const u = ((p[0] - a[0]) * r[1] - (p[1] - a[1]) * r[0]) / den;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return [a[0] + (b[0] - a[0]) * best, a[1] + (b[1] - a[1]) * best];
}
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(cyl(x, y, 7, -PLATE_H - FOOT_H, 1.6, "lo", 28));
    out.push(cyl(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, "mid", 28));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const label = { x: 150, y: 70 - 12, w: 46, d: 12, r: 1.4 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
  out.push(L([30, 22, 14].map((w, i) => k.lineOnTop([label.x + 5, label.y + 3.6 + i * 2.6], [label.x + 5 + w, label.y + 3.6 + i * 2.6], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([label.x + label.w - 3.4, label.y + 3, 0.8]), at([label.x + label.w - 3.4, label.y + label.d - 3, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ── The Escher server.
function server() {
  const out = [`<path class="iso-halo" d="${k.haloOf(SRV, 0, 8, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(SRV, 5))) out.push(cyl(x, y, 2.6, 0, 2, "lo", 16));
  out.push(S(k.slabOf(SRV, 2, SRV_H - 2, P, 4, 1.2), { tone: "mid", inner: L(k.sideSeam(SRV, SRV_H - 6, P, 4), { tone: "faint" }) }));
  // Front: six drive bays in two columns, each with its light, and a column of status lights.
  const bays = [];
  const bayDots = [];
  for (let r = 0; r < 6; r++) {
    for (const [x0, x1] of [[SRV.x + 14, SRV.x + 32], [SRV.x + 35, SRV.x + 53]]) {
      const z = SRV_H - 12 - r * 5.2;
      bays.push(k.pathOf([[x0, z - 1.8], [x1, z - 1.8], [x1, z + 1.8], [x0, z + 1.8]].map(([x, zz]) => at([x, SRV_FRONT, zz])), true));
      bayDots.push(at([x1 - 2.2, SRV_FRONT, z]));
    }
  }
  out.push(L(bays.join(""), { tone: "lo" }));
  out.push(D(bayDots, { size: 0.4, tone: "mid" }));
  out.push(`<g class="es-srv-leds">${Array.from({ length: 6 }, (_, i) => D([at([SRV.x + 7, SRV_FRONT, SRV_H - 12 - i * 5.2])], { size: 0.8, tone: "lo" })).join("")}</g>`);
  out.push(L(k.segment([SRV.x + 11, SRV_FRONT, SRV_H], [SRV.x + 11, SRV_FRONT, 2], P), { tone: "faint" }));
  // Side vents, a fan on top, two handles.
  const side = SRV.x + SRV.w;
  out.push(L(Array.from({ length: 6 }, (_, i) => sideSlot(side, SRV.y + 4 + i * 3.2, 14, 36)).join(""), { tone: "faint" }));
  const fan = [SRV.x + 38, SRV.y + 13];
  out.push(L(k.ring(fan[0], fan[1], 8, SRV_H, P, 40) + k.ring(fan[0], fan[1], 6.4, SRV_H, P, 40) + k.ring(fan[0], fan[1], 1.6, SRV_H, P, 16), { tone: "lo" }));
  out.push(L(Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return k.lineOnTop([fan[0] + 1.6 * Math.cos(a), fan[1] + 1.6 * Math.sin(a)], [fan[0] + 6.4 * Math.cos(a + 0.5), fan[1] + 6.4 * Math.sin(a + 0.5)], SRV_H, P); }).join(""), { tone: "faint" }));
  for (const y of [SRV.y + 5, SRV.y + 21]) out.push(slab({ x: SRV.x + 8, y: y - 1, w: 16, d: 2, r: 0.8 }, SRV_H, 2.2, "hi", 2, 0.3));
  for (const [x, y] of [[SRV.x + 3, SRV.y + 3], [SRV.x + SRV.w - 3, SRV.y + SRV.d - 3], [SRV.x + 3, SRV.y + SRV.d - 3]]) out.push(screw(x, y, SRV_H, 0.9));
  // Network port where the cable from your device lands.
  out.push(slab({ x: -76, y: SRV_FRONT, w: 4, d: 2, r: 0.5 }, 3.6, 4.4, "lo", 2));
  return out.join("");
}

// ── Your device.
const CARDS = [];
function deviceBase() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BASE, 0, 6, P)}"/>`];
  out.push(S(k.slabOf(BASE, 0, BASE_H, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(BASE, 3, P, 4), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(BASE, 3), BASE_H, P, 4), { tone: "faint" }));
  // Front: vents and a power light beside the drawer.
  out.push(L(Array.from({ length: 5 }, (_, i) => frontSlot(BASE_FRONT, BASE_SIDE - 30, BASE_SIDE - 8, 6 + i * 2.2)).join(""), { tone: "faint" }));
  out.push(D([at([BASE_SIDE - 33, BASE_FRONT, 13])], { size: 0.7, tone: "hi" }));
  // Side: three ports, to the server and to AWS.
  for (const y of [PORT.net, PORT.read, PORT.write]) out.push(slab({ x: BASE_SIDE, y: y - 2, w: 2.4, d: 4, r: 0.5 }, PORT.z - 2.2, 4.4, "lo", 2));
  // Read light and write lamp on top, beside the approval key.
  out.push(cyl(BASE_SIDE - 8, PORT.read, 2.2, BASE_H, 1, "lo", 18));
  out.push(`<g class="es-rlamp">${S(k.cylinder(BASE_SIDE - 8, PORT.read, 1.6, BASE_H + 1, 1.2, P, 18), { tone: "mid" })}</g>`);
  out.push(cyl(BASE_SIDE - 8, PORT.write, 2.2, BASE_H, 1, "lo", 18));
  out.push(`<g class="es-wlamp" data-part="wlamp" data-locked>${S(k.cylinder(BASE_SIDE - 8, PORT.write, 1.6, BASE_H + 1, 1.2, P, 18), { tone: "mid" })}</g>`);
  out.push(cyl(KEY.x, KEY.y, 6, KEY.z, 1.2, "lo", 32));
  out.push(cyl(KEY.x, KEY.y, 5, KEY.z + 1.2, 4, "mid", 32));
  out.push(L(k.knurl(KEY.x, KEY.y, 5, KEY.z + 1.8, KEY.z + 4.8, 24, P), { tone: "faint" }));
  out.push(L(k.ring(KEY.x, KEY.y, 4, KEY.z + 5.2, P, 28), { tone: "lo" }));
  out.push(D([at([KEY.x, KEY.y - 4, KEY.z + 5.2]), at([KEY.x + 4, KEY.y, KEY.z + 5.2])], { size: 0.5, tone: "mid" }));
  out.push(cyl(KEY.x, KEY.y, 2.8, KEY.z + 5.2, 0.8, "hi", 24));
  out.push(`<g data-part="key"></g>`);
  for (const [x, y] of [[BASE.x + 4, BASE.y + 4], [BASE_SIDE - 4, BASE.y + 4], [BASE_SIDE - 4, BASE_FRONT - 4]]) out.push(screw(x, y, BASE_H, 0.9));
  return out.join("");
}
function monitor() {
  const out = [S(k.slabOf(FOOT, BASE_H, 3, P, 6, 0.8), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(FOOT, 3), BASE_H + 3, P, 5), { tone: "faint" }));
  out.push(S(k.slabOf(NECK, BASE_H + 3, MON_Z - BASE_H - 1, P, 3, 0.4), { tone: "mid", inner: L(k.sideSeam(NECK, BASE_H + 8, P, 3), { tone: "faint" }) }));
  out.push(S(k.slabOf(MON, MON_Z, MON_TOP - MON_Z, P, 4, 1.2), { tone: "mid", inner: L(k.sideSeam(MON, MON_TOP - 4, P, 4), { tone: "faint" }) }));
  out.push(L(Array.from({ length: 8 }, (_, i) => k.planOutline({ x: MON.x + 18 + i * 4.4, y: MON.y + 3.2, w: 1.4, d: 5.6, r: 0.7 }, MON_TOP, P, 3)).join(""), { tone: "faint" }));
  out.push(L(Array.from({ length: 4 }, (_, i) => sideSlot(MON.x + MON.w, MON.y + 2.6 + i * 2.2, 54, 72)).join(""), { tone: "faint" }));
  out.push(recess(BEZEL, FACE, "", "es-bezel", recess(SCREEN, FACE - BEZEL.depth, `<g data-part="ui">${screenUi()}</g>`, "es-glass")));
  out.push(`<g transform="${planeOf(FACE)}">${D([[-133, -38]], { size: 0.7, tone: "hi" })}</g>`);
  out.push(k.faceTextSvg(planeOf(FACE), "ESCHER", { size: 2.2, tone: "lo" }).replace(/<text /, `<text x="-191" y="-37.4" `));
  return out.join("");
}
// The local estate: one index card per bucket, in the drawer of the device.
function drawer() {
  const { x, y, w, d, z0, z1 } = DRAWER;
  const out = [];
  out.push(slab({ x, y, w, d, r: 0.8 }, z0, 1.2, "lo", 2));
  out.push(slab({ x, y, w: 1.2, d, r: 0.4 }, z0, z1 - z0, "mid", 2));
  for (let i = 0; i < 41; i++) {
    const cx = CARD_X0 + i * CARD_PITCH;
    const tab = { x: cx, y: y + 3 + (i % 3) * 5, w: 0.6, d: 4.6, r: 0.2 };
    CARDS.push(cx);
    out.push(
      `<g class="es-card-i" data-card="${i}">` +
        S(k.slabOf({ x: cx, y: y + 2.4, w: 0.6, d: d - 4.8, r: 0.2 }, z0 + 1.2, 8, P, 1), { tone: "lo", className: "es-cardf" }) +
        `<g class="es-ctab">${S(k.slabOf(tab, z0 + 9.2, 1.6, P, 1), { tone: "lo" })}</g></g>`,
    );
  }
  out.push(slab({ x: x + w - 1.2, y, w: 1.2, d, r: 0.4 }, z0, z1 - z0, "mid", 2));
  // Front panel with a pull and a label holder.
  const front = { x: x - 2, y: y + d, w: w + 4, d: 1.8, r: 0.6 };
  out.push(S(k.slabOf(front, z0 - 1, z1 - z0 + 2, P, 2, 0.4), { tone: "mid" }));
  const face = y + d + 1.8;
  out.push(`<g transform="${planeOf(face)}">${L(flat(x + 6, z0 + 6, x + 22, z0 + 11, 0.8, 3), { tone: "lo" })}${L(`M${t1(x + 8)} ${t1(-(z0 + 8.6))}H${t1(x + 18)}`, { tone: "faint", free: true })}</g>`);
  out.push(slab({ x: x + w / 2 - 9, y: face, w: 1.6, d: 2.2, r: 0.4 }, z0 + 5, 2.4, "mid", 2));
  out.push(slab({ x: x + w / 2 + 7.4, y: face, w: 1.6, d: 2.2, r: 0.4 }, z0 + 5, 2.4, "mid", 2));
  out.push(slab({ x: x + w / 2 - 9, y: face + 2.2, w: 18, d: 1.6, r: 0.6 }, z0 + 5, 2.4, "hi", 2, 0.3));
  return out.join("");
}
const KEYS = [];
function keyboard() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KB, 0, 3, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(KB, 5))) out.push(cyl(x, y, 2.2, 0, 1.4, "lo", 14));
  out.push(S(k.slabOf(KB, 1.4, 3.6, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline({ x: KB.x + 2.6, y: KB.y + 2.6, w: KB.w - 5.2, d: KB.d - 5.2, r: 1.6 }, 5, P, 3), { tone: "lo" }));
  const U = 4.8;
  for (let r = 0; r < 4; r++) {
    const row = r < 3 ? Array.from({ length: 11 }, () => 1) : [2, 7, 2];
    let x = KB.x + 3.2;
    for (const width of row) {
      const plan = { x: x + 0.5, y: KB.y + 3.2 + r * U + 0.5, w: width * U - 1, d: U - 1, r: 0.9 };
      KEYS.push(plan);
      out.push(S(k.slabOf(plan, 5, 1.6 + (3 - r) * 0.25, P, 2, 0.3), { tone: "mid", crease: "faint" }));
      x += width * U;
    }
  }
  return out.join("");
}

// ── The screen: one page per step.
const UI = { x0: SCREEN.x0, x1: SCREEN.x1, z0: SCREEN.z0, z1: SCREEN.z1 };
const sz = (z) => t1(-z);
const rect = (x0, z0, x1, z1, r, cls, extra = "") => `<rect class="${cls}" x="${t1(x0)}" y="${sz(z1)}" width="${t1(x1 - x0)}" height="${t1(z1 - z0)}" rx="${r}"${extra}/>`;
const rule = (x0, x1, z, cls = "es-r") => `<path class="${cls}" d="M${t1(x0)} ${sz(z)}H${t1(x1)}"/>`;
const text = (x, z, value, size, cls = "es-t", anchor = "start", extra = "") => `<text class="${cls}" x="${t1(x)}" y="${sz(z)}" font-size="${size}"${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${extra}>${value}</text>`;
const QUESTION = "Are any S3 buckets public?";
const FIX = "Lock it down";
function screenUi() {
  const { x0, x1, z0, z1 } = UI;
  const out = [];
  out.push(`<path class="es-glow" d="${flat(x0 + 6, z0 + 6, x1 - 6, z1 - 6, 14, 8)}"/>`);
  out.push(rule(x0, x1, z1 - 5, "es-r es-chrome"));
  out.push([0, 1, 2].map((i) => `<circle class="es-dotc" cx="${t1(x0 + 3 + i * 2.6)}" cy="${sz(z1 - 2.5)}" r="0.75"/>`).join(""));
  out.push(rule(x1 - 14, x1 - 4, z1 - 2.5, "es-r es-dim"));
  const bubble = (value, z = z1 - 12.5) => rect(x1 - 33, z, x1 - 3, z + 5, 2.5, "es-bub") + text(x1 - 31.2, z + 1.7, value, 1.75, "es-t es-small");
  const tick = (x, z) => `<circle class="es-spin" cx="${t1(x)}" cy="${sz(z + 0.9)}" r="1.5"/><path class="es-tick" d="M${t1(x - 0.9)} ${sz(z + 0.9)}l0.8 0.8l1.6 -1.7"/>`;
  const row = (n, z, name, value, cls = "es-t") => `<g class="es-row" data-row="${n}">${tick(x0 + 4.4, z)}${text(x0 + 7.6, z, name, 2.2, cls)}${value ? text(x1 - 3.4, z, value, 2.4, "es-t es-val", "end") : ""}</g>`;
  // 0 · Scan
  out.push(
    `<g class="es-pg" data-pg="0">${text(x0 + 3.4, z1 - 12, "Scanning prod", 2.6, "es-t es-head")}${text(x0 + 3.4, z1 - 16.4, "read-only · keys stay on this device", 1.8, "es-t es-small es-dim")}` +
      `${rect(x0 + 3.4, z1 - 22, x1 - 3.4, z1 - 20.6, 0.7, "es-track")}<rect class="es-fill" data-part="progress" x="${t1(x0 + 3.4)}" y="${sz(z1 - 20.6)}" width="0" height="1.4" rx="0.7"/>` +
      `<text class="es-t es-num" data-part="count" x="${t1(x0 + 3.4)}" y="${sz(z0 + 6)}" font-size="12">0</text>${text(x0 + 3.4, z0 + 2.6, "S3 buckets copied to the local estate", 1.9, "es-t es-small es-dim")}</g>`,
  );
  // 1 · Ask
  out.push(`<g class="es-pg" data-pg="1">${rule(-176, -150, 70, "es-r es-big")}${rule(-170, -156, 65.5, "es-r es-dim")}${rect(x0 + 3, z0 + 3, x1 - 3, z0 + 12, 2.4, "es-box")}<text class="es-t" data-part="typed" x="${t1(x0 + 5.4)}" y="${sz(z0 + 6.4)}" font-size="2.6"></text><rect class="es-cursor" data-part="cursor" x="${t1(x0 + 5.6)}" y="${sz(z0 + 9)}" width="0.9" height="3.4"/><circle class="es-send" cx="${t1(x1 - 6.6)}" cy="${sz(z0 + 7.5)}" r="2"/></g>`);
  // 2 · Look up
  out.push(`<g class="es-pg" data-pg="2">${bubble(QUESTION)}${text(x0 + 3.4, z1 - 18, "Searching the local estate", 1.9, "es-t es-small es-dim")}${row(0, z1 - 24, "query_resources", "41 rows", "es-t es-mono")}${row(1, z1 - 29.4, "public_access: true", "1 match", "es-t es-mono")}</g>`);
  // 3 · Answer
  out.push(
    `<g class="es-pg" data-pg="3">${bubble(QUESTION)}` +
      `<g class="es-a" data-a="0">${rect(x0 + 3, z1 - 30, x0 + 25, z1 - 15, 2, "es-ucard")}${text(x0 + 5, z1 - 18.2, "Public buckets", 1.9, "es-t es-small es-dim")}${text(x0 + 5, z1 - 27.6, "1", 8.2, "es-t es-num")}${text(x0 + 11.4, z1 - 27.4, "of 41", 2.4, "es-t es-dim")}<circle class="es-red" cx="${t1(x0 + 22.4)}" cy="${sz(z1 - 17.6)}" r="1.1"/></g>` +
      `<g class="es-a" data-a="1">${rect(x0 + 27, z1 - 30, x1 - 3, z1 - 15, 2, "es-ucard")}${text(x0 + 29, z1 - 18.2, "sellers-exports", 2.1)}${text(x0 + 29, z1 - 22.4, "s3:GetObject", 1.9, "es-t es-small es-dim")}${text(x0 + 29, z1 - 26.4, "Principal: *", 2.1, "es-t es-redt")}</g>` +
      `<g class="es-a" data-a="2">${rect(x0 + 3, z0 + 3.4, x0 + 31, z0 + 8.6, 2.6, "es-cchip")}<circle class="es-cite" cx="${t1(x0 + 6)}" cy="${sz(z0 + 6)}" r="1.6"/>${text(x0 + 6, z0 + 5.3, "1", 1.9, "es-t es-citet", "middle")}${text(x0 + 8.8, z0 + 5.2, "AWS Config", 2.1)}${rule(x0 + 34, x1 - 4, z0 + 7.2, "es-r es-dim")}${rule(x0 + 34, x1 - 12, z0 + 4.4, "es-r es-dim")}</g></g>`,
  );
  // 4 · Plan: three options, each with its blast radius.
  const options = [
    ["Delete the bucket", "3 hit"],
    ["Block the account", "42 hit"],
    ["Make it private", "1 hit"],
  ]
    .map(([name, value], m) => {
      const z = z1 - 22 - m * 5.4;
      return `<g class="es-opt" data-opt="${m}">${rect(x0 + 2.4, z - 1.4, x1 - 2.4, z + 3.4, 1.4, "es-optbg")}<circle class="es-optc" cx="${t1(x0 + 4.6)}" cy="${sz(z + 0.9)}" r="1.1"/>${text(x0 + 7.4, z, name, 2.2)}${text(x1 - 4, z, value, 2.2, "es-t es-val", "end")}</g>`;
    })
    .join("");
  out.push(
    `<g class="es-pg" data-pg="4"><g class="es-uq">${rect(x1 - 20, z1 - 12.5, x1 - 3, z1 - 7.5, 2.5, "es-bub")}<text class="es-t es-small" data-part="typed2" x="${t1(x1 - 18.4)}" y="${sz(z1 - 10.8)}" font-size="1.75"></text></g>` +
      `<g class="es-a" data-a="0">${text(x0 + 3.4, z1 - 16.6, "3 options, by blast radius", 1.9, "es-t es-small es-dim")}${options}</g>` +
      `<g class="es-approve">${rect(x1 - 22, z0 + 1.5, x1 - 3, z0 + 6.5, 2.5, "es-btn")}${text(x1 - 12.5, z0 + 3.2, "Approve", 2.1, "es-t es-btnt", "middle")}</g>${text(x0 + 3.4, z0 + 3.2, "Rollback: 1 call", 1.9, "es-t es-small es-dim")}</g>`,
  );
  // 5 · Fix
  out.push(`<g class="es-pg" data-pg="5">${text(x0 + 3.4, z1 - 12, "Make it private · approved", 1.9, "es-t es-small es-dim")}${row(0, z1 - 18.5, "Policy saved", "")}${row(1, z1 - 23.9, "Wildcard removed", "")}${row(2, z1 - 29.3, "Block Public Access on", "")}</g>`);
  // 6 · Sync
  out.push(`<g class="es-pg" data-pg="6">${bubble(QUESTION)}<g class="es-a" data-a="0">${text(x0 + 3.4, z1 - 17, "Public buckets", 1.9, "es-t es-small es-dim")}${text(x0 + 3.4, z1 - 27.6, "0", 9, "es-t es-num")}${text(x0 + 10.4, z1 - 27.4, "of 41", 2.4, "es-t es-dim")}</g><g class="es-a" data-a="1">${rect(x0 + 3, z0 + 1.5, x1 - 3, z0 + 9.5, 2, "es-ucard")}${text(x0 + 5, z0 + 4.6, "Anonymous GET", 2.1, "es-t es-dim")}${text(x1 - 5, z0 + 3.2, "403", 5.4, "es-t es-num", "end")}</g></g>`);
  return out.join("");
}

// ── AWS.
function apiBox() {
  const out = [`<path class="iso-halo" d="${k.haloOf(API, 0, 4, P)}"/>`];
  out.push(S(k.slabOf(API, 0, API_H, P, 3, 0.8), { tone: "mid", inner: L(k.sideSeam(API, API_H - 3, P, 3), { tone: "faint" }) }));
  const front = API.y + API.d;
  for (const x of [5, 12]) out.push(slab({ x, y: front, w: 4, d: 2, r: 0.5 }, 5, 4.4, "lo", 2));
  out.push(D([at([7, front, 11.6]), at([14, front, 11.6])], { size: 0.55, tone: "mid" }));
  out.push(L(Array.from({ length: 4 }, (_, i) => k.planOutline({ x: API.x + 3, y: API.y + 3 + i * 3.6, w: 12, d: 1.4, r: 0.7 }, API_H, P, 3)).join(""), { tone: "faint" }));
  out.push(slab({ x: API.x + API.w, y: -35, w: 2, d: 4, r: 0.5 }, 6.8, 4.4, "lo", 2));
  return out.join("");
}
function trayBase() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 6, P)}"/>`];
  out.push(S(k.slabOf(TRAY, 0, TRAY_H, P, 6, 1), { tone: "mid", inner: L(k.sideSeam(TRAY, 2, P, 6), { tone: "faint" }) }));
  const inner = k.insetPlan(TRAY, 4);
  out.push(L(k.planOutline(inner, TRAY_H, P, 5), { tone: "lo" }));
  const grooves = [];
  for (let j = 0; j < ROWS; j++) grooves.push(k.lineOnTop([inner.x, Y0 + (j + 0.5) * PY], [inner.x + inner.w, Y0 + (j + 0.5) * PY], TRAY_H, P));
  out.push(L(grooves.join(""), { tone: "faint" }));
  for (const [x, y] of k.corners(TRAY, 2.2)) out.push(D([at([x, y, TRAY_H])], { size: 0.45 }));
  return out.join("");
}
// What each service reads, drawn as lines on the deck from the service to the bucket's rim.
function edges() {
  const lines = SERVICES.map(({ key, plan, uses }) => {
    const [bx, by] = binAt(...uses);
    const sx = plan.x + plan.w / 2;
    const sy = plan.y;
    const len = Math.hypot(sx - bx, sy - by);
    const ex = bx + ((sx - bx) / len) * CUP_R;
    const ey = by + ((sy - by) / len) * CUP_R;
    // The line starts where it comes out from behind the service's box, on its outline.
    const from = exitOf(at([sx, sy + 2, TRAY_H]), at([ex, ey, TRAY_H]), hull(k.ringOf(plan, 3).flatMap(([x, y]) => [at([x, y, TRAY_H]), at([x, y, TRAY_H + SVC_H])])));
    return `<path class="iso-line es-edge" data-e="${key}" data-tone="mid" d="${k.pathOf([from, at([ex, ey, TRAY_H])])}"/>` + D([at([ex, ey, TRAY_H])], { size: 0.7, tone: "mid" });
  });
  // The bus from the API panel onto the tray.
  const bus = k.pathOf([[API.x + API.w + 2, -33, 9], [26, -33, 9], [29, -33, 7.8], [31.6, -33, 6.2], [36, -33, 6.1]].map(at));
  return lines.join("") + `<path class="iso-line es-bus" data-tone="mid" d="${bus}"/>` + D([at([36, -33, 6.1]), at([API.x + API.w + 2, -33, 9])], { size: 0.9, tone: "mid" });
}
const zoneLayer = `<g class="es-zone" data-part="zone"><path class="es-zfill" data-part="zfill"/><path class="es-zline" data-part="zline"/></g>`;
function binSymbol() {
  const out = [S(k.cylinder(0, 0, CUP_R, TRAY_H, CUP_H, P, 28), { tone: "mid", inner: L(k.sideArc(0, 0, CUP_R, CUP_TOP - 2.2, P, 20), { tone: "faint" }) })];
  out.push(S(k.cylinder(0, 0, LID_R, CUP_TOP, LID_H, P, 32), { tone: "hi" }), S(k.cylinder(0, 0, 1.9, LID_TOP, 1, P, 16), { tone: "hi" }));
  out.push(L(k.ring(0, -PIVOT, 0.9, LID_TOP, P, 12), { tone: "lo" }) + D([at([0, -PIVOT, LID_TOP])], { size: 0.45 }));
  return `<defs><g id="es-bin">${out.join("")}</g></defs>`;
}
function bin(i, j, index) {
  const [cx, cy] = binAt(i, j);
  const { cosA, sinA } = k.cameraOf(P);
  const led = `<g class="es-led" data-bin="${index}" data-s="0">${D([at([cx + (CUP_R + 0.05) * cosA, cy + (CUP_R + 0.05) * sinA, TRAY_H + 4.6])], { size: 1.15, tone: "lo" })}</g>`;
  if (!(i === PUBLIC[0] && j === PUBLIC[1])) return `<use class="es-b" data-b="${index}" href="#es-bin" transform="${k.translateAlong(P, [cx, cy, 0])}"/>` + led;
  const out = [S(k.cylinder(cx, cy, CUP_R, TRAY_H, CUP_H, P, 28), { tone: "mid", inner: L(k.sideArc(cx, cy, CUP_R, CUP_TOP - 2.2, P, 20), { tone: "faint" }) })];
  const voidPath = k.ring(cx, cy, CUP_R - 0.7, CUP_TOP, P, 40);
  out.push(`<path class="es-void" d="${voidPath}"/><path class="es-tint" d="${voidPath}"/>`, L(voidPath, { tone: "lo" }));
  const [s, c] = [Math.sin((SWING * Math.PI) / 180), Math.cos((SWING * Math.PI) / 180)];
  const open = [PIVOT * s, -PIVOT + PIVOT * c];
  out.push(`<g data-part="lid" transform="${k.translateAlong(P, [open[0], open[1], 0])}">${S(k.cylinder(cx, cy, LID_R, CUP_TOP, LID_H, P, 32), { tone: "hi" })}${S(k.cylinder(cx, cy, 1.9, LID_TOP, 1, P, 16), { tone: "hi" })}</g>`);
  out.push(L(k.ring(cx, cy - PIVOT, 0.9, LID_TOP, P, 12), { tone: "lo" }) + D([at([cx, cy - PIVOT, LID_TOP])], { size: 0.45 }));
  // The bucket's own Block Public Access: a latch that rises over the lid's front edge.
  const front = cy + CUP_R;
  out.push(slab({ x: cx - 2.4, y: front, w: 4.8, d: 1, r: 0.3 }, TRAY_H + 1.6, 4.4, "lo", 2));
  out.push(`<g data-part="latch" class="es-latch" transform="${k.translateAlong(P, [0, 0, -3.2])}">${slab({ x: cx - 1.8, y: front + 0.2, w: 3.6, d: 0.8, r: 0.3 }, TRAY_H + 4.6, CUP_H - 1.4 + LID_H + 0.6, "hi", 2)}${slab({ x: cx - 1.8, y: front - 1.2, w: 3.6, d: 2.2, r: 0.4 }, LID_TOP + 0.1, 0.9, "hi", 2)}</g>`);
  out.push(led);
  return `<g class="es-b" data-b="${index}">${out.join("")}</g>`;
}
function accountSwitch() {
  const [cx, cy] = [SW_X, SW_Y];
  const base = { x: cx - 9, y: cy - 6, w: 18, d: 12, r: 2 };
  const out = [S(k.slabOf(base, TRAY_H, 8, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(base, TRAY_H + 2.4, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline({ x: cx - 7, y: cy - 1.6, w: 14, d: 3.2, r: 1.6 }, TRAY_H + 8, P, 4), { tone: "lo" }));
  out.push(D([at([cx - 6.4, cy - 4, TRAY_H + 8])], { size: 0.7, tone: "lo" }), D([at([cx + 6.4, cy - 4, TRAY_H + 8])], { size: 0.7, tone: "lo" }));
  out.push(D([at([cx - 6.4, cy + 4, TRAY_H + 8]), at([cx + 6.4, cy + 4, TRAY_H + 8])], { size: 0.4 }));
  const knob = { x: cx - 4.4 - 2.4, y: cy - 3, w: 4.8, d: 6, r: 1.2 };
  out.push(S(k.slabOf({ x: cx - 4.4 - 1, y: cy - 1, w: 2, d: 2, r: 0.5 }, TRAY_H + 7, 2, P, 2), { tone: "lo" }));
  out.push(S(k.slabOf(knob, TRAY_H + 9, 3.6, P, 3, 0.5), { tone: "hi" }));
  out.push(L(k.lineOnTop([cx - 4.4, cy - 2], [cx - 4.4, cy + 2], TRAY_H + 12.6, P), { tone: "lo" }));
  return `<g class="es-b" data-b="sw">${out.join("")}</g>`;
}
const SLOTS = [];
for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) SLOTS.push([i, j]);
const BINS = SLOTS.filter(([i, j]) => !(i === SWITCH[0] && j === SWITCH[1]));
const indexOf = ([a, b]) => BINS.findIndex(([i, j]) => i === a && j === b);
const PUBLIC_INDEX = indexOf(PUBLIC);
function tray() {
  const items = SLOTS.map(([i, j]) => ({ i, j, depth: depth2(binAt(i, j)) })).sort((a, b) => a.depth - b.depth);
  return binSymbol() + items.map(({ i, j }) => (i === SWITCH[0] && j === SWITCH[1] ? accountSwitch() : bin(i, j, indexOf([i, j])))).join("");
}
function services() {
  const out = [];
  for (const { key, plan } of SERVICES) {
    out.push(`<g class="es-svc" data-svc="${key}">`);
    out.push(S(k.slabOf(plan, TRAY_H, SVC_H, P, 3, 0.6), { tone: "mid", inner: L(k.sideSeam(plan, TRAY_H + 3, P, 3), { tone: "faint" }) }));
    const top = TRAY_H + SVC_H;
    const cx = plan.x + plan.w / 2;
    const cy = plan.y + plan.d / 2;
    if (key === "cdn") {
      // Edge network: a dish on a short mast.
      out.push(cyl(cx, cy, 1.4, top, 3, "mid", 14), cyl(cx, cy, 4.6, top + 3, 1, "hi", 28));
      out.push(L(k.ring(cx, cy, 2.6, top + 4, P, 20), { tone: "lo" }));
    } else if (key === "export") {
      // A scheduled job: a knurled timer knob.
      out.push(cyl(cx, cy, 3.6, top, 2.6, "hi", 24), L(k.knurl(cx, cy, 3.6, top + 0.5, top + 2.1, 18, P), { tone: "lo" }), L(k.lineOnTop([cx, cy], [cx + 2.6, cy - 1], top + 2.6, P), { tone: "hi", free: "end" }));
    } else {
      // Analytics: three bars.
      [4, 6.4, 3].forEach((h, n) => out.push(slab({ x: plan.x + 4 + n * 4.4, y: cy - 1.6, w: 3, d: 3.2, r: 0.4 }, top, h, "hi", 2)));
    }
    out.push(D([at([plan.x + 3, plan.y + plan.d, TRAY_H + 7.6])], { size: 0.7, tone: "mid" }));
    out.push(`</g>`);
  }
  return out.join("");
}

// ── Cables. Each starts at your device.
const CABLES = {
  net: [[BASE_SIDE + 2.4, PORT.net, 8], [-75.5, PORT.net, 8], [-74, PORT.net, 6], [-74, PORT.net, 1.4], [-74, PORT.net - 2, 0.8], [-74, SRV_FRONT + 5, 0.8], [-74, SRV_FRONT + 2.6, 1.6], [-74, SRV_FRONT + 2, 5]],
  read: [[BASE_SIDE + 2.4, PORT.read, 8], [-75.5, PORT.read, 8], [-74, PORT.read, 6], [-74, PORT.read, 1.4], [-73, PORT.read, 0.8], [5, PORT.read, 0.8], [7, PORT.read - 1.6, 0.8], [7, API.y + API.d + 2.6, 1.6], [7, API.y + API.d + 2, 6]],
  write: [[BASE_SIDE + 2.4, PORT.write, 8], [-75.5, PORT.write, 8], [-74, PORT.write, 6], [-74, PORT.write, 1.4], [-73, PORT.write, 0.8], [12, PORT.write, 0.8], [14, PORT.write - 2, 0.8], [14, API.y + API.d + 2.6, 1.6], [14, API.y + API.d + 2, 6]],
};
const CABLE_FLAT = Object.fromEntries(Object.entries(CABLES).map(([key, list]) => [key, list.map(at)]));
function cables() {
  const out = [];
  for (const [key, points] of Object.entries(CABLE_FLAT)) out.push(`<path class="iso-line es-cord" data-cable="${key}" data-tone="mid" d="${k.pathOf(points)}"/>`, D([points[0], points[points.length - 1]], { size: 0.85, tone: "mid" }));
  // Clips hold the AWS lines to the plate.
  for (const x of [-40, -10]) {
    out.push(slab({ x: x - 2, y: PORT.read - 2.2, w: 4, d: PORT.write - PORT.read + 4.4, r: 0.8 }, 0, 1.6, "lo", 2));
    out.push(D([at([x, PORT.read - 1, 1.6]), at([x, PORT.write + 1, 1.6])], { size: 0.4 }));
  }
  out.push(slab({ x: -76.2, y: -60, w: 4.4, d: 4, r: 0.8 }, 0, 1.6, "lo", 2));
  out.push(`<g data-part="pulses">${Array.from({ length: 6 }, () => `<circle class="es-pulse" r="1.5" cx="0" cy="0" style="opacity:0"/>`).join("")}</g>`);
  return out.join("");
}

const body = [plate(), server(), deviceBase(), monitor(), drawer(), keyboard(), apiBox(), trayBase(), zoneLayer, edges(), tray(), services(), cables()];

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench with four machines joined by cables. On the left, your device: a monitor and keyboard, and a drawer of index cards that is the local copy of the estate. At the back, the Escher server. On the right, AWS: a tray of 41 lidded buckets, an account switch and three services. One bucket's lid is open. The write line from the device to AWS opens only when the key on the device is turned.",
  body,
});

// ── The page: a pinned stage with the figure, a step card and a timeline.
const STEPS = [
  {
    chip: "Scan",
    h: "A copy of the estate, on your device",
    p: "The Escher server sends a scan. The app on your device runs it against AWS with read-only calls, using keys that never leave the device, and keeps what it finds.",
    body: `<dl class="es-rows"><div><dt>Account</dt><dd>prod</dd></div><div><dt>Calls</dt><dd>Read-only, 12 at a time</dd></div><div><dt>Keys</dt><dd>In the device’s keychain</dd></div><div><dt>Copied</dt><dd><span data-count="41">41</span> S3 buckets</dd></div></dl>`,
  },
  {
    chip: "Ask",
    h: "One question in",
    p: "You ask in plain English. Only the prompt goes up to the Escher server.",
    body: `<div class="es-msg"><span>You</span><p data-type="prompt" data-text="Are any of our S3 buckets actually public right now?">Are any of our S3 buckets actually public right now?</p></div>`,
  },
  {
    chip: "Look up",
    h: "The server writes a query",
    p: "The server sends a query back down, and the app runs it on the local estate. The answer comes from your data, not from the model’s memory.",
    body: `<div class="es-win"><p class="es-tab">query_resources</p><ol class="es-code"><li><span class="n">1</span>type: s3-bucket</li><li><span class="n">2</span>public_access: true</li><li class="res"><span class="n">→</span>41 rows checked, 1 match</li><li class="del"><span class="n"></span>sellers-exports</li></ol></div>`,
  },
  {
    chip: "Answer",
    h: "An answer you can check",
    p: "The row goes up, and the server turns it into interface. Every value on it points back to the estate.",
    body: `<dl class="es-rows"><div><dt>Public</dt><dd><b>1</b> of 41 buckets</dd></div><div><dt>Bucket</dt><dd class="code">sellers-exports</dd></div><div><dt>Grants</dt><dd class="code">s3:GetObject to <em>Principal: "*"</em></dd></div><div><dt>Objects</dt><dd>~12,400</dd></div><div><dt>Source</dt><dd><i class="es-cite-i">1</i>AWS Config, bucket ACLs</dd></div></dl>`,
  },
  {
    chip: "Plan",
    h: "Fixes, sized by blast radius",
    p: "Ask Escher to lock it down and the server sends back options. Each one shows what else it would touch. The write line stays locked.",
    body: `<ol class="es-opts">${[
      ["Delete the bucket", "1 bucket, 2 services", "The export job and analytics break. ~12,400 objects are lost."],
      ["Block public access for the account", "41 buckets, 1 CDN", "cdn-origin may stop serving the CDN."],
      ["Make sellers-exports private", "1 bucket", "Every read came from internal roles. Presigned links keep working."],
    ]
      .map(([a, b, c], i) => `<li data-opt="${i}"><p><span>${a}</span><b>${b}</b></p><small>${c}</small>${i === 2 ? '<em>Recommended</em>' : ""}</li>`)
      .join("")}</ol>`,
  },
  {
    chip: "Fix",
    h: "You approve, then it runs",
    p: "Turning the key opens the write line. The app runs each step on AWS with your keys and reads it back before the next one.",
    body: `<ol class="es-calls">${[
      ["Policy saved", "rollback point"],
      ['"Principal": "*" removed', "read back"],
      ["Block Public Access on", "read back"],
    ]
      .map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`)
      .join("")}</ol><p class="es-foot">2 writes · rollback: 1 call</p>`,
  },
  {
    chip: "Sync",
    h: "The local copy catches up",
    p: "The app reads the bucket back from AWS and updates the local estate. Ask again, and the answer is none.",
    body: `<ol class="es-calls es-done">${[
      ["Read back from AWS", "private"],
      ["Anonymous GET", "403 Forbidden"],
      ["Local estate", "0 of 41 public"],
    ]
      .map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`)
      .join("")}</ol>`,
  },
];

const ICON_HAND = `<svg aria-hidden="true" focusable="false" viewBox="0 0 256 256" fill="currentColor"><path d="M188,80a27.79,27.79,0,0,0-13.36,3.4,28,28,0,0,0-46.64-11A28,28,0,0,0,80,92v20H68a28,28,0,0,0-28,28v12a88,88,0,0,0,176,0V108A28,28,0,0,0,188,80Zm12,72a72,72,0,0,1-144,0V140a12,12,0,0,1,12-12H80v24a8,8,0,0,0,16,0V92a12,12,0,0,1,24,0v28a8,8,0,0,0,16,0V92a12,12,0,0,1,24,0v28a8,8,0,0,0,16,0V108a12,12,0,0,1,24,0Z"/></svg>`;

const story = `<!--ill:hero--><section class="es-story" id="story" aria-label="One question, from the scan to the fix">
  <div class="es-stage iso" data-step="0" data-theme="light" data-fluid-quiet>
    <div class="es-fig">${svg}</div>
    <div class="es-tags" aria-hidden="true"></div>
    <div class="es-top">
      <p class="es-case"><span class="es-dots" aria-hidden="true"><i></i><i></i><i></i></span><b>Are any S3 buckets public?</b><span class="es-meta"><span>prod account</span><span>41 buckets</span><span>demo estate</span></span></p>
      <p class="es-read" data-readout>local estate 0/41 · writes locked</p>
    </div>
    <div class="es-card">
      ${STEPS.map((s, i) => `<div class="es-st${i ? "" : " on"}" role="tabpanel"${i ? " inert" : ""}><p class="es-h">${s.h}</p><p class="es-p">${s.p}</p>${s.body}</div>`).join("\n      ")}
    </div>
    <p class="es-hint" aria-hidden="true">${ICON_HAND}Scroll to run the question</p>
    <div class="es-time" role="tablist" aria-label="Steps">${STEPS.map((s, i) => `<button type="button" role="tab" aria-selected="${i ? "false" : "true"}"${i ? "" : ' class="on"'}><i></i><b>0${i + 1}</b><span>${s.chip}</span></button>`).join("")}</div>
  </div>
</section>
<p class="cap es-cap">A worked example from the prototype’s demo estate. The Escher server writes every script and every answer, the app on your device runs them, and AWS keys stay on the device.</p><!--/ill:hero-->`;

// ── Live behaviour.
const AXv = k.axisVector(P, [1, 0, 0]);
const AYv = k.axisVector(P, [0, 1, 0]);
const AZv = k.axisVector(P, [0, 0, 1]);
const CONST = {
  P,
  AX: AXv,
  AY: AYv,
  AZ: AZv,
  N: BINS.length,
  BINS: BINS.map(([i, j]) => binAt(i, j)),
  COLS,
  ROWS,
  PUBLIC_INDEX,
  PUB: [PUB_X, PUB_Y],
  PIVOT,
  SWING,
  KEY,
  ZONES,
  TRAY_H,
  CABLES: Object.fromEntries(Object.entries(CABLE_FLAT).map(([key, list]) => [key, list.map(([x, y]) => [t1(x), t1(y)])])),
  QUESTION,
  FIX,
  TAGS: {
    server: [SRV.x + SRV.w / 2, SRV.y + SRV.d / 2, SRV_H + 3],
    device: [MON.x + MON.w / 2, FACE, MON_TOP + 3],
    aws: [TRAY.x + 20, TRAY.y + 10, TRAY_H + 12],
    estate: [DRAWER.x + DRAWER.w / 2, DRAWER.y + DRAWER.d + 2, 2],
    key: [KEY.x, KEY.y, KEY.z + 16],
    pub: [PUB_X, PUB_Y, LID_TOP + 3],
    write: [BASE_SIDE + 2, PORT.write, 2],
  },
};

const live = `(() => {
${KIT}
const C = ${JSON.stringify(CONST)};
const P = C.P;
const story = document.querySelector(".es-story");
if (!story) return;
const stage = story.querySelector(".es-stage");
const svg = stage.querySelector(".es-fig svg");
const root = document.documentElement;
const system = matchMedia("(prefers-color-scheme: dark)");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const theme = () => { stage.dataset.theme = root.dataset.theme || (system.matches ? "dark" : "light"); };
theme();
new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
system.addEventListener("change", theme);

const $ = (s) => svg.querySelector(s);
const el = {
  lid: $('[data-part="lid"]'), latch: $('[data-part="latch"]'), key: $('[data-part="key"]'), wlamp: $('[data-part="wlamp"]'),
  zone: $('[data-part="zone"]'), zfill: $('[data-part="zfill"]'), zline: $('[data-part="zline"]'),
  typed: $('[data-part="typed"]'), cursor: $('[data-part="cursor"]'), typed2: $('[data-part="typed2"]'),
  progress: $('[data-part="progress"]'), count: $('[data-part="count"]'),
};
const leds = [...svg.querySelectorAll(".es-led")].sort((a, b) => a.dataset.bin - b.dataset.bin);
const binEls = [...svg.querySelectorAll(".es-b[data-b]")].filter((b) => b.dataset.b !== "sw").sort((a, b) => a.dataset.b - b.dataset.b);
const swEl = svg.querySelector('.es-b[data-b="sw"]');
const svcEls = Object.fromEntries([...svg.querySelectorAll(".es-svc")].map((s) => [s.dataset.svc, s]));
const lastH = { bins: [], sw: "", svc: {} };
const cards = [...svg.querySelectorAll(".es-card-i")].sort((a, b) => a.dataset.card - b.dataset.card);
const pulseEls = [...svg.querySelectorAll(".es-pulse")];
const readout = stage.querySelector("[data-readout]");
const off = (v) => "translate(" + v[0].toFixed(2) + " " + v[1].toFixed(2) + ")";
const world = (dx, dy, dz) => [C.AX[0] * dx + C.AY[0] * dy + C.AZ[0] * dz, C.AX[1] * dx + C.AY[1] * dy + C.AZ[1] * dz];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const RAD = Math.PI / 180;
const lidOffset = (open) => [C.PIVOT * Math.sin(open * C.SWING * RAD), -C.PIVOT + C.PIVOT * Math.cos(open * C.SWING * RAD)];

// ── The script. Continuous values ease between keyframes; each step starts where the last one ended.
const Z = C.ZONES;
const zoneOf = (z, a) => ({ zx: z.x, zy: z.y, zw: z.w, zd: z.d, zr: z.r, za: a });
const BASE = { lid: 1, latch: 0, key: 0, lift: 0, ...zoneOf(Z.private, 0) };
function track(start, list) {
  const keys = [[0, { ...start }]];
  let cur = { ...start };
  for (const [t, change] of list) { cur = { ...cur, ...change }; keys.push([t, cur]); }
  return keys;
}
// Scan order: down and up the columns, 3 s for the whole tray.
const ORDER = [];
for (let c = 0; c < C.COLS; c++) for (let r = 0; r < C.ROWS; r++) {
  const row = c % 2 ? C.ROWS - 1 - r : r;
  const index = C.BINS.findIndex(([x, y]) => Math.abs(x - C.BINS[0][0] - c * (C.BINS[1][0] - C.BINS[0][0])) < 1 && Math.abs(y - C.BINS[0][1] - row * (C.BINS[7][1] - C.BINS[0][1])) < 1);
  if (index >= 0) ORDER.push(index);
}
const SCAN0 = 1.0, SCAN1 = 4.0;
const VISIT = [];
ORDER.forEach((index, n) => { VISIT[index] = SCAN0 + ((SCAN1 - SCAN0) * n) / ORDER.length; });
const tracks = [];
const ends = [];
function add(list) { const start = ends.length ? ends[ends.length - 1] : BASE; const tr = track(start, list); tracks.push(tr); ends.push(tr[tr.length - 1][1]); }
add([[5.0, {}]]);
add([[3.4, {}]]);
add([[1.3, { lift: 0 }], [1.8, { lift: 1 }], [3.6, {}]]);
add([[2.8, {}]]);
const PLAN_OPT = [3.3, 4.9, 6.5];
add([[3.1, {}], [PLAN_OPT[0], zoneOf(Z.delete, 0)], [PLAN_OPT[0] + 0.5, zoneOf(Z.delete, 1)], [PLAN_OPT[1], zoneOf(Z.delete, 1)], [PLAN_OPT[1] + 0.6, zoneOf(Z.account, 1)], [PLAN_OPT[2], zoneOf(Z.account, 1)], [PLAN_OPT[2] + 0.6, zoneOf(Z.private, 1)], [8.2, {}]]);
add([[0.3, { key: 0 }], [1.2, { key: 1 }], [3.3, { lid: 1 }], [4.1, { lid: 0 }], [4.9, { latch: 0 }], [5.4, { latch: 1 }], [5.7, { za: 1 }], [6.4, { za: 0 }]]);
add([[1.4, { lift: 1 }], [1.9, { lift: 0 }], [3.6, {}]]);
const DUR = tracks.map((tr) => tr[tr.length - 1][0]);
const KEYS = Object.keys(BASE);
function sample(step, time) {
  const keys = tracks[step];
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1][0] <= time) i++;
  const [ta, a] = keys[i];
  if (i === keys.length - 1) return { ...a };
  const [tb, b] = keys[i + 1];
  const f = ease((time - ta) / Math.max(1e-6, tb - ta));
  const out = {};
  for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * f;
  return out;
}

// Messages on the cables: [step, start, seconds, cable, direction (1 = away from your device), label].
const PULSES = [
  [0, 0.2, 0.8, "net", -1, "scan"],
  [1, 2.1, 0.8, "net", 1, "prompt"],
  [2, 0.4, 0.8, "net", -1, "query"],
  [2, 2.0, 0.8, "net", 1, "1 row"],
  [3, 0.2, 0.8, "net", -1, "answer"],
  [4, 1.2, 0.8, "net", 1, "lock it down"],
  [4, 2.3, 0.8, "net", -1, "3 options"],
  [5, 1.5, 0.6, "read", 1, "get policy"],
  [5, 2.2, 0.6, "read", -1, "saved"],
  [5, 2.7, 0.6, "write", 1, "remove *"],
  [5, 4.3, 0.6, "write", 1, "block public"],
  [6, 0.2, 0.6, "read", 1, "read back"],
  [6, 0.9, 0.6, "read", -1, "private"],
];
for (let t = SCAN0; t < SCAN1 - 0.2; t += 0.3) { PULSES.push([0, t, 0.5, "read", 1, t === SCAN0 ? "read-only calls" : null]); PULSES.push([0, t + 0.3, 0.5, "read", -1, null]); }
PULSES.push([0, SCAN1, 0.6, "read", -1, "41 buckets"]);
const BUSY = { 0: [[0, 0.25]], 1: [[2.9, 3.4]], 2: [[0, 0.4], [2.8, 3.3]], 3: [[0, 0.25]], 4: [[2.0, 2.4]] };
const lengths = {};
for (const [key, list] of Object.entries(C.CABLES)) {
  let total = 0;
  const acc = [0];
  for (let i = 1; i < list.length; i++) { total += Math.hypot(list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1]); acc.push(total); }
  lengths[key] = { total, acc };
}
function along(key, f) {
  const list = C.CABLES[key], { total, acc } = lengths[key];
  const d = f * total;
  let i = 1;
  while (i < list.length - 1 && acc[i] < d) i++;
  const a = list[i - 1], b = list[i];
  const g = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
  return [a[0] + (b[0] - a[0]) * g, a[1] + (b[1] - a[1]) * g];
}

// ── What the bench shows at a moment: copied cards, lights, the count.
function statusAt(step, time) {
  const copied = C.BINS.map((_, i) => step > 0 || time >= VISIT[i] + 0.35);
  const led = C.BINS.map((_, i) => (step === 0 ? (time >= VISIT[i] && time < VISIT[i] + 0.35 ? 2 : time >= VISIT[i] ? 1 : 0) : 1));
  if ((step === 5 && time >= 1.6 && time < 2.2) || (step === 6 && time >= 0.4 && time < 0.9)) led[C.PUBLIC_INDEX] = 2;
  const known = step < 6 || time < 1.4; // the local copy still says public
  const n = copied.filter(Boolean).length;
  return { copied, led, n, known, writes: step === 5 && time >= 1.2 ? "open" : step === 6 ? "open" : "locked" };
}

// ── Drawing a pose.
const shown = { ...BASE };
const last = { copied: [], led: [], page: -1, known: null };
function keyPaths(turn) {
  const a = turn * 90 * RAD, c = Math.cos(a), s = Math.sin(a);
  const box = (hx, hy) => [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([x, y]) => [C.KEY.x + x * c - y * s, C.KEY.y + x * s + y * c]);
  return solidSvg(extrude(box(0.8, 1.8), C.KEY.z + 6, 2.4, P), { tone: "hi", lit: true }) + solidSvg(extrude(box(0.7, 3.6), C.KEY.z + 8.4, 6, P, { bevel: 0.3 }), { tone: "hi", lit: true });
}
function highlights(step, time) {
  const bins = C.BINS.map(() => "");
  const svc = {};
  let sw = "";
  const P_ = C.PUBLIC_INDEX;
  if (step === 0) C.BINS.forEach((_, i) => { if (time >= VISIT[i] && time < VISIT[i] + 0.45) bins[i] = "read"; });
  if (step === 3 && time >= 0.9) bins[P_] = "hot";
  if (step === 4) {
    const o = optAt(time);
    if (o === 0) { bins[P_] = "hot"; svc.export = "hot"; svc.analytics = "hot"; }
    if (o === 1) { bins.fill("hot"); sw = "hot"; svc.cdn = "hot"; }
    if (o === 2) bins[P_] = "hot";
  }
  if (step === 5) bins[P_] = time < 5.4 ? "hot" : time < 6.4 ? "read" : "";
  if (step === 6 && time >= 0.4 && time < 1.5) bins[P_] = "read";
  return { bins, sw, svc };
}
let drawnKey = -1, drawnZone = "";
function draw(pose, st, step, time) {
  el.lid.setAttribute("transform", off(world(...lidOffset(pose.lid), 0)));
  el.latch.setAttribute("transform", off(world(0, 0, -3.2 * (1 - pose.latch))));
  el.latch.toggleAttribute("data-on", pose.latch > 0.95);
  if (Math.abs(drawnKey - pose.key) > 0.002) { drawnKey = pose.key; el.key.innerHTML = keyPaths(pose.key); }
  el.wlamp.toggleAttribute("data-locked", pose.key < 0.98);
  const zone = [pose.zx, pose.zy, pose.zw, pose.zd, pose.zr].map((v) => v.toFixed(2)).join();
  if (zone !== drawnZone) {
    drawnZone = zone;
    const d = planOutline({ x: pose.zx, y: pose.zy, w: pose.zw, d: pose.zd, r: pose.zr }, C.TRAY_H, P, 6);
    el.zfill.setAttribute("d", d);
    el.zline.setAttribute("d", d);
  }
  el.zone.style.opacity = pose.za.toFixed(3);
  st.copied.forEach((on, i) => { if (last.copied[i] !== on) cards[i].toggleAttribute("data-on", on); });
  last.copied = st.copied;
  st.led.forEach((s, i) => { if (last.led[i] !== s) leds[i].dataset.s = s; });
  last.led = st.led;
  const card = cards[C.PUBLIC_INDEX];
  card.setAttribute("transform", off(world(0, 0, 7 * pose.lift)));
  if (last.known !== st.known) { card.toggleAttribute("data-public", st.known); last.known = st.known; }
  // Blast radius and attention: buckets and services take a colour.
  const h = highlights(step, time);
  binEls.forEach((b, i) => { const v = h.bins[i] || ""; if (lastH.bins[i] !== v) { if (v) b.dataset.h = v; else delete b.dataset.h; lastH.bins[i] = v; } });
  if (lastH.sw !== h.sw) { if (h.sw) swEl.dataset.h = h.sw; else delete swEl.dataset.h; lastH.sw = h.sw; }
  for (const [key, node] of Object.entries(svcEls)) { const v = h.svc[key] || ""; if (lastH.svc[key] !== v) { if (v) node.dataset.h = v; else delete node.dataset.h; lastH.svc[key] = v; } }
  card.toggleAttribute("data-up", pose.lift > 0.4);
  // Server lights while it works.
  const busy = (BUSY[step] || []).some(([a, b]) => time >= a && time < b);
  svg.toggleAttribute("data-busy", busy);
  // Pulses and the chips that name them.
  let used = 0;
  const active = [];
  for (const [s, t0, dur, cable, dir, label] of PULSES) {
    if (s !== step || time < t0 || time >= t0 + dur || used >= pulseEls.length) continue;
    const f = (time - t0) / dur;
    const [x, y] = along(cable, dir > 0 ? f : 1 - f);
    const dot = pulseEls[used++];
    dot.setAttribute("cx", x.toFixed(1));
    dot.setAttribute("cy", y.toFixed(1));
    dot.style.opacity = String(Math.min(1, Math.sin(Math.PI * f) * 3));
    dot.dataset.cable = cable;
    if (label) active.push({ x, y, label, f });
  }
  for (let i = used; i < pulseEls.length; i++) pulseEls[i].style.opacity = "0";
  svg.toggleAttribute("data-reading", PULSES.some(([s, t0, dur, cable]) => s === step && cable === "read" && time >= t0 && time < t0 + dur));
  chips(active);
  const text = "local estate " + st.n + "/41 · " + (st.n ? (st.known ? "1 public" : "0 public") + " · " : "") + "writes " + st.writes;
  if (readout.textContent !== text) readout.textContent = text;
}

// ── The screen.
const pages = [...svg.querySelectorAll(".es-pg")];
const optEls = [...svg.querySelectorAll(".es-opt")];
const cardOpts = [...stage.querySelectorAll(".es-opts li")];
function optAt(time) { return time >= PLAN_OPT[2] ? 2 : time >= PLAN_OPT[1] ? 1 : time >= PLAN_OPT[0] ? 0 : -1; }
function type(node, cursor, value) {
  if (node.textContent === value) return;
  node.textContent = value;
  if (cursor) cursor.setAttribute("x", (+node.getAttribute("x") + (value ? node.getComputedTextLength() : 0) + 0.3).toFixed(2));
}
function screen(step, time, st) {
  if (last.page !== step) { pages.forEach((p) => p.toggleAttribute("data-on", +p.dataset.pg === step)); last.page = step; if (step !== 4) svg.dataset.opt = -1; }
  const node = pages[step];
  if (step === 0) {
    el.progress.setAttribute("width", (st.n / C.N * (+el.progress.parentNode.querySelector(".es-track").getAttribute("width"))).toFixed(2));
    el.count.textContent = String(st.n);
  }
  if (step === 1) type(el.typed, el.cursor, C.QUESTION.slice(0, Math.round(C.QUESTION.length * clamp((time - 0.3) / 1.6))));
  if (step === 4) type(el.typed2, null, C.FIX.slice(0, Math.round(C.FIX.length * clamp((time - 0.2) / 0.8))));
  const done = { 2: [1.6, 1.9], 5: [2.6, 3.9, 5.5] }[step];
  const start = { 2: [0.9, 1.2], 5: [1.4, 2.7, 4.3] }[step];
  [...node.querySelectorAll(".es-row")].forEach((row, n) => {
    row.toggleAttribute("data-on", !start || time >= start[n]);
    if (done) row.toggleAttribute("data-done", time >= done[n]);
  });
  node.querySelectorAll(".es-a").forEach((a) => {
    const n = +a.dataset.a;
    a.toggleAttribute("data-on", step === 4 ? time >= 3.0 : time >= 0.9 + n * 0.5);
  });
  if (step === 4) {
    const o = optAt(time);
    optEls.forEach((opt, i) => opt.toggleAttribute("data-hi", i === o));
    svg.dataset.opt = o;
    cardOpts.forEach((li, i) => { li.classList.toggle("hi", i === o); li.classList.toggle("on", time >= PLAN_OPT[i] - 0.1); });
    const approve = node.querySelector(".es-approve");
    approve.toggleAttribute("data-on", time >= PLAN_OPT[2] + 0.6);
  }
}

// ── Tags: names pinned to the machines, and chips that name each message on a cable.
const tagBox = stage.querySelector(".es-tags");
const zoneCentre = (p) => [p.zx + p.zw / 2, p.zy + 1, C.TRAY_H + 12]; // the zone's back edge, so the tag clears what it marks
const TAGS = [
  { text: "Escher server", at: () => C.TAGS.server, steps: [0, 1] },
  { text: "Your device", at: () => C.TAGS.device, steps: [0, 1] },
  { text: "AWS", at: () => C.TAGS.aws, steps: [0] },
  { text: "Local estate", cls: "below", at: () => C.TAGS.estate, steps: [0, 2, 6] },
  { text: "sellers-exports", cls: "red", at: () => C.TAGS.pub, steps: [3] },
  { text: "Blast radius", cls: "red", at: zoneCentre, steps: [4] },
  { text: "Write line · locked", cls: "red below", at: () => C.TAGS.write, steps: [4] },
  { text: "Approval key", at: () => C.TAGS.key, steps: [5] },
  { text: "sellers-exports · private", at: () => C.TAGS.pub, steps: [6] },
].map((tag) => {
  const node = document.createElement("span");
  node.className = "es-tag" + (tag.cls ? " " + tag.cls : "");
  node.textContent = tag.text;
  tagBox.append(node);
  return { ...tag, node };
});
const chipEls = [0, 1].map(() => { const node = document.createElement("span"); node.className = "es-msg-chip"; tagBox.append(node); return node; });
const pt = svg.createSVGPoint();
function toStage(x, y) {
  const m = svg.getScreenCTM();
  if (!m) return null;
  pt.x = x; pt.y = y;
  const q = pt.matrixTransform(m);
  const box = stage.getBoundingClientRect();
  return [q.x - box.left, q.y - box.top];
}
function tags(pose, step) {
  for (const tag of TAGS) {
    const on = tag.steps.includes(step);
    tag.node.classList.toggle("on", on);
    if (!on && tag.node.dataset.placed) continue;
    const [x, y] = iso(tag.at(pose), P);
    const q = toStage(x, y);
    if (!q) continue;
    tag.node.style.transform = "translate(" + q[0].toFixed(1) + "px," + q[1].toFixed(1) + "px) " + (tag.cls && tag.cls.includes("below") ? "translate(-50%,40%)" : "translate(-50%,-135%)");
    tag.node.dataset.placed = "1";
  }
}
function chips(active) {
  chipEls.forEach((node, i) => {
    const a = active[i];
    node.classList.toggle("on", !!a);
    if (!a) return;
    if (node.textContent !== a.label) node.textContent = a.label;
    const q = toStage(a.x, a.y);
    if (q) node.style.transform = "translate(" + q[0].toFixed(1) + "px," + q[1].toFixed(1) + "px) translate(-50%,-160%)";
  });
}

// ── Steps from the scroll position, as on the OpenFOAM cover.
const chipsT = [...stage.querySelectorAll(".es-time button")];
const panes = [...stage.querySelectorAll(".es-st")];
const n = panes.length;
let step = -1, t0 = performance.now(), armed = false, visible = false, frame = 0, prev = 0;
const promptEl = stage.querySelector('[data-type="prompt"]');
const promptText = promptEl ? promptEl.dataset.text : "";
const rowsOf = panes.map((p) => [...p.querySelectorAll(".es-calls li, .es-rows div, .es-code li")]);
function goTo(i) {
  if (i === step) return;
  step = i;
  t0 = performance.now();
  chipsT.forEach((c, k) => { c.classList.toggle("on", k === i); c.classList.toggle("done", k < i); c.setAttribute("aria-selected", k === i); });
  panes.forEach((p, k) => { p.classList.toggle("on", k === i); p.toggleAttribute("inert", k !== i); });
  stage.dataset.step = i;
  run();
}
function update() {
  const r = story.getBoundingClientRect();
  const vh = innerHeight;
  const e = clamp(1 - r.top / (vh * 0.55));
  stage.style.setProperty("--e", e.toFixed(3));
  root.classList.toggle("cover-full", e > 0.97 && r.bottom > vh * 0.6);
  if (!armed && r.top < vh * 0.08) { armed = true; t0 = performance.now(); run(); }
  const span = story.offsetHeight - stage.offsetHeight;
  const p = clamp(-r.top / Math.max(1, span), 0, 0.9999);
  const i = Math.floor(p * n), local = p * n - i;
  chipsT.forEach((c, k) => c.style.setProperty("--p", k < i ? 1 : k === i ? Math.max(0.04, local).toFixed(3) : 0));
  goTo(i);
  tags(shown, step);
}
chipsT.forEach((c, k) => c.addEventListener("click", () => {
  const span = story.offsetHeight - stage.offsetHeight;
  const top = story.getBoundingClientRect().top + scrollY;
  scrollTo({ top: top + (span * (k + 0.06)) / n + 1, behavior: still.matches ? "auto" : "smooth" });
}));
addEventListener("scroll", update, { passive: true });
addEventListener("resize", update);
new ResizeObserver(update).observe(document.body);

function card(i, time) {
  if (i === 1 && promptEl) {
    const q = clamp((time - 0.3) / 1.6);
    promptEl.textContent = promptText.slice(0, Math.round(promptText.length * q));
    promptEl.classList.toggle("typing", q < 1);
  }
  const rows = rowsOf[i] || [];
  const at = { 0: [0.4, 0.8, 1.2, SCAN1 + 0.4], 2: [0.9, 1.2, 1.6, 1.9], 5: [2.6, 3.9, 5.5], 6: [1.0, 1.4, 1.9] }[i] || rows.map((_, k) => 0.9 + k * 0.18);
  rows.forEach((row, k) => row.classList.toggle("on", time >= at[k]));
}

function tick(now) {
  const dt = prev ? Math.min((now - prev) / 1000, 1 / 20) : 1 / 60;
  prev = now;
  const calm = still.matches;
  const time = !armed && step === 0 ? 0 : calm ? 99 : (now - t0) / 1000;
  const goal = sample(step, Math.min(time, DUR[step]));
  const f = calm ? 1 : 1 - Math.exp(-dt / 0.12);
  for (const key of KEYS) shown[key] += (goal[key] - shown[key]) * f;
  const settled = KEYS.every((key) => Math.abs(goal[key] - shown[key]) < 0.01);
  const st = statusAt(step, Math.min(time, DUR[step] + 1));
  draw(shown, st, step, time);
  screen(step, time, st);
  card(step, time);
  tags(shown, step);
  const busy = time < DUR[step] + 0.8 || !settled;
  frame = visible && busy ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { prev = 0; frame = requestAnimationFrame(tick); } }
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
still.addEventListener("change", run);
update();
const first = statusAt(0, 0);
draw(shown, first, 0, 0);
screen(0, 0, first);
requestAnimationFrame(() => tags(shown, 0));
})();
`;

const css = `/* Generated by scripts/escher-hero.mjs from the Anatomy kit (MIT). Do not edit by hand. */
/* The story spans the viewport, and the stage fills it once pinned (as on the OpenFOAM cover). */
html:has(.es-story){overflow-x:clip}
html.cover-full .theme-toggle{opacity:0;pointer-events:none}
.theme-toggle{transition:opacity .3s}
.cs .es-story{position:relative;width:100vw;margin:0 0 0 calc(50% - 50vw);height:calc(100vh + 7 * 80vh)}
@media(min-width:1200px){
  .cs article>.hero{grid-row:1}
  .cs article>.es-story{grid-column:1/-1;grid-row:2}
  .cs article>.toc{grid-row:4/span 80;margin-top:200px}
}
.cs .es-cap{margin:20px 0 0;font-size:14px;color:var(--soft);max-width:640px}
.cs .es-stage{
  --es-bg:#f7f7f5;--es-line:#1d1c1b14;--es-txt:#3a3a3a;--es-strong:#111;--es-dim:#8a8a87;--es-faint:#b9b9b5;--es-glass:#ffffffc7;--es-red:#e5484d;
  --x:calc((1 - var(--e,0)) * max(0px,(100vw - min(100vw - 80px,1384px)) / 2));
  --g:max(28px,calc(var(--x) + 24px),calc((100vw - 1520px) / 2 + 28px));
  --cw:clamp(320px,25vw,400px);
  position:sticky;top:0;height:100vh;height:100svh;min-height:560px;overflow:hidden;
  clip-path:inset(0 var(--x) round calc((1 - var(--e,0)) * 20px));
  color:var(--es-txt);font-family:'Geist',Arial,sans-serif;font-variant-numeric:tabular-nums;background:var(--es-bg);line-height:1.5
}
.cs .es-stage[data-theme="dark"]{--es-bg:#161616;--es-line:#ffffff12;--es-txt:#c9c9c9;--es-strong:#f2f2f2;--es-dim:#7d7d7d;--es-faint:#555;--es-glass:#1c1c1cd9;--es-red:#fa504a}
.cs .es-fig{position:absolute;top:64px;bottom:72px;left:calc(var(--g) + var(--cw) + 16px);right:var(--g);display:flex;align-items:center;justify-content:center}
.cs .es-fig .iso-svg{width:100%;height:100%;max-width:none;display:block}
.cs .es-top{position:absolute;left:0;right:0;top:0;height:56px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 var(--g);z-index:3;border-bottom:1px solid var(--es-line);background:color-mix(in srgb,var(--es-bg) 82%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.cs .es-case{display:flex;align-items:center;gap:14px;margin:0;min-width:0;white-space:nowrap}
.cs .es-dots{display:flex;gap:6px;flex:none}
.cs .es-dots i{width:10px;height:10px;border-radius:50%;background:var(--es-line);box-shadow:inset 0 0 0 1px var(--es-line)}
.cs .es-case b{font-size:13.5px;font-weight:500;color:var(--es-strong)}
.cs .es-meta{display:flex;gap:6px;min-width:0;overflow:hidden}
.cs .es-meta span{font-size:12px;color:var(--es-dim);padding:3px 9px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--es-line)}
.cs .es-read{margin:0;font:12px/1 'Geist Mono',ui-monospace,monospace;color:var(--es-dim);white-space:nowrap}
.cs .es-card{position:absolute;left:var(--g);top:80px;width:var(--cw);max-height:calc(100% - 80px - 100px);overflow:auto;scrollbar-width:thin;z-index:2;background:var(--es-glass);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);border-radius:16px;padding:22px;box-shadow:inset 0 0 0 1px var(--es-line),0 20px 44px -28px #0000003d}
.cs .es-st{display:none}
.cs .es-st.on{display:block;animation:es-in .45s ease}
@keyframes es-in{from{opacity:0;transform:translateY(6px)}}
.cs .es-h{margin:0 0 8px;font-size:22px;line-height:1.25;font-weight:500;letter-spacing:-.015em;color:var(--es-strong)}
.cs .es-p{margin:0 0 18px;font-size:14.5px;line-height:1.55;color:var(--es-txt)}
.cs .es-msg{border-radius:12px;padding:12px 14px;box-shadow:inset 0 0 0 1px var(--es-line)}
.cs .es-msg>span{display:block;font-size:12px;font-weight:500;color:var(--es-dim);margin-bottom:5px}
.cs .es-msg>p{margin:0;font-size:14.5px;line-height:1.5;color:var(--es-strong);min-height:1.5em}
.cs [data-type].typing::after{content:'';display:inline-block;width:1.5px;height:1.05em;margin-left:2px;vertical-align:-2px;background:currentColor;animation:es-blink 1s steps(1) infinite}
@keyframes es-blink{50%{opacity:0}}
.cs .es-calls{list-style:none;margin:0;padding:0;font-size:13.5px}
.cs .es-calls li{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:4px 8px;align-items:baseline;padding:9px 0;border-bottom:1px solid var(--es-line);color:var(--es-dim);transition:color .3s}
.cs .es-calls li:last-child{border-bottom:0}
.cs .es-calls li::before{content:'';width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--es-faint);align-self:center;transition:background .3s,box-shadow .3s}
.cs .es-calls li.on{color:var(--es-strong)}
.cs .es-calls li.on::before{background:var(--es-strong);box-shadow:none}
.cs .es-calls b{font:500 12px/1.4 'Geist Mono',ui-monospace,monospace;color:var(--es-dim);opacity:0;transition:opacity .3s}
.cs .es-calls li.on b{opacity:1;color:var(--es-txt)}
.cs .es-foot{margin:12px 0 0;font:12px 'Geist Mono',ui-monospace,monospace;color:var(--es-dim)}
.cs .es-rows{margin:0;font-size:14px;line-height:1.45}
.cs .es-rows div{display:grid;grid-template-columns:96px minmax(0,1fr);gap:12px;padding:9px 0;border-bottom:1px solid var(--es-line);opacity:0;transform:translateY(3px);transition:opacity .35s,transform .35s}
.cs .es-rows div.on{opacity:1;transform:none}
.cs .es-rows div:last-child{border-bottom:0}
.cs .es-rows dt{color:var(--es-dim)}
.cs .es-rows dd{margin:0;color:var(--es-strong)}
.cs .es-rows dd.code{font:12.5px/1.55 'Geist Mono',ui-monospace,monospace}
.cs .es-rows em{font-style:normal;color:var(--es-red)}
.cs .es-rows b{font-weight:500;color:var(--es-red)}
.cs .es-cite-i{display:inline-grid;place-items:center;width:16px;height:16px;margin-right:6px;border-radius:50%;background:var(--es-strong);color:var(--es-bg);font:500 10px/1 'Geist',Arial,sans-serif;font-style:normal;vertical-align:1px}
.cs .es-win{border-radius:12px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--es-line)}
.cs .es-tab{margin:0;padding:8px 14px;font:12px 'Geist Mono',ui-monospace,monospace;color:var(--es-dim);border-bottom:1px solid var(--es-line)}
.cs .es-code{list-style:none;margin:0;padding:10px 0 12px;font:12px/1.8 'Geist Mono',ui-monospace,monospace;color:var(--es-strong)}
.cs .es-code li{padding:0 14px;opacity:0;transition:opacity .3s}
.cs .es-code li.on{opacity:1}
.cs .es-code .n{display:inline-block;width:18px;color:var(--es-dim)}
.cs .es-code .res{color:var(--es-dim)}
.cs .es-code .del{background:color-mix(in srgb,var(--es-red) 10%,transparent);color:var(--es-red)}
.cs .es-opts{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.cs .es-opts li{position:relative;padding:10px 12px;border-radius:10px;box-shadow:inset 0 0 0 1px var(--es-line);opacity:.35;transition:opacity .35s,box-shadow .35s,background .35s}
.cs .es-opts li.on{opacity:.6}
.cs .es-opts li.hi{opacity:1;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--es-red) 45%,transparent);background:color-mix(in srgb,var(--es-red) 5%,transparent)}
.cs .es-opts p{display:flex;justify-content:space-between;gap:10px;margin:0;font-size:13.5px;color:var(--es-strong)}
.cs .es-opts b{font:500 11.5px/1.5 'Geist Mono',ui-monospace,monospace;color:var(--es-red);white-space:nowrap}
.cs .es-opts small{display:block;margin-top:3px;font-size:12.5px;line-height:1.45;color:var(--es-dim)}
.cs .es-opts em{position:absolute;right:12px;bottom:10px;font:500 11px/1 'Geist',Arial,sans-serif;font-style:normal;color:var(--es-strong);opacity:0;transition:opacity .35s}
.cs .es-opts li.hi em{opacity:1}
.cs .es-opts li[data-opt="2"] small{padding-right:84px}
.cs .es-time{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:14px;padding:0 var(--g) 8px;z-index:3;background:linear-gradient(transparent,color-mix(in srgb,var(--es-bg) 85%,transparent) 40%)}
.cs .es-time button{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:baseline;gap:4px 8px;padding:16px 2px 14px;background:none;border:0;color:var(--es-dim);cursor:pointer;text-align:left;font:inherit}
.cs .es-time i{grid-column:1/-1;display:block;height:3px;border-radius:2px;background:var(--es-line);position:relative;overflow:hidden;margin-bottom:8px}
.cs .es-time i::after{content:'';position:absolute;inset:0;background:var(--es-strong);transform-origin:left;transform:scaleX(var(--p,0));transition:transform .15s linear}
.cs .es-time b{font-size:12px;font-weight:500;color:var(--es-faint)}
.cs .es-time span{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .25s}
.cs .es-time button:hover span{color:var(--es-strong)}
.cs .es-time button.on span{color:var(--es-strong)}
.cs .es-time button.on b,.cs .es-time button.done b{color:var(--red)}
.cs .es-time button:focus-visible{outline:2px solid var(--es-strong);outline-offset:2px;border-radius:6px}
.cs .es-tags{position:absolute;inset:0;pointer-events:none;z-index:1}
.cs .es-tag{position:absolute;left:0;top:0;font-size:12px;font-weight:500;line-height:1;padding:5px 9px;border-radius:7px;white-space:nowrap;color:var(--es-strong);background:var(--es-glass);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);box-shadow:inset 0 0 0 1px var(--es-line),0 4px 12px -6px #0000002e;opacity:0;transition:opacity .35s}
.cs .es-tag.on{opacity:1}
.cs .es-tag.red{color:var(--es-red);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--es-red) 35%,transparent),0 4px 12px -6px #0000002e}
.cs .es-msg-chip{position:absolute;left:0;top:0;font:500 11px/1 'Geist Mono',ui-monospace,monospace;padding:5px 8px;border-radius:999px;white-space:nowrap;color:var(--es-bg);background:var(--es-strong);box-shadow:0 4px 12px -6px #00000059;opacity:0;transition:opacity .2s}
.cs .es-msg-chip.on{opacity:1}
.cs .es-hint{position:absolute;right:var(--g);bottom:92px;z-index:2;display:flex;align-items:center;gap:8px;margin:0;padding:7px 13px;border-radius:999px;background:var(--es-glass);box-shadow:inset 0 0 0 1px var(--es-line);font-size:12.5px;color:var(--es-dim);opacity:0;transform:translateY(4px);transition:opacity .35s,transform .35s;pointer-events:none}
.cs .es-hint svg{width:15px;height:15px}
.cs .es-stage[data-step="0"] .es-hint{opacity:1;transform:none}
@media(min-width:1600px) and (min-height:900px){.cs .es-card{top:88px;padding:26px}.cs .es-h{font-size:24px}.cs .es-p{font-size:15px}}
@media(max-width:1000px){.cs .es-meta span:nth-child(n+3){display:none}.cs .es-read{display:none}}
@media(max-width:700px){
  .cs .es-story{height:calc(100svh + 7 * 70svh)}
  .cs .es-stage{--x:calc((1 - var(--e,0)) * 16px);--g:calc(var(--x) + 10px);min-height:520px}
  .cs .es-top{height:50px;padding:0 var(--g) 0 calc(var(--g) + 4px)}
  .cs .es-meta,.cs .es-dots{display:none}
  .cs .es-fig{top:50px;left:var(--g);right:var(--g);bottom:auto;height:40%}
  .cs .es-card{left:var(--g);right:var(--g);top:auto;bottom:64px;width:auto;max-height:44%;padding:16px 16px 18px}
  .cs .es-h{font-size:18px}
  .cs .es-p{font-size:14px;margin-bottom:12px}
  .cs .es-time{gap:6px;padding:0 calc(var(--g) + 2px)}
  .cs .es-time span{display:none}
  .cs .es-time button{padding:12px 0 10px}
  .cs .es-hint{left:var(--g);right:auto;top:60px;bottom:auto}
  .cs .es-tag{font-size:10.5px;padding:4px 7px}
  .cs .es-msg-chip{font-size:10px;padding:4px 6px}
}
@media(prefers-reduced-motion:reduce){.cs .es-st.on{animation:none}.cs [data-type].typing::after{animation:none}}

/* The figure's inks: the plate's paper is the stage colour, so fills hide what is behind. */
.es-stage.iso{
  --anatomy-card:#f7f7f5;--anatomy-paper:#f7f7f5;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#cfcfcb;--anatomy-shade-1:#dadad6;--anatomy-shade-2:#e4e4e0;--anatomy-shade-3:#eeeeea;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#e9e9e6;
  --anatomy-hi:#1d1c1b;--anatomy-mid:#6e6e72;--anatomy-lo:#9c9ca0;--anatomy-faint:#c6c6c8;--anatomy-lit:#000000;--anatomy-weight:.75px;
  --anatomy-halo:#00000033;--anatomy-halo-opacity:.3;--anatomy-dot:#26262a;--anatomy-red:#e5484d;
  --anatomy-text:#57575a;--anatomy-muted:#8c8c90;--anatomy-mono:"Geist Mono",ui-monospace,"SF Mono",Menlo,monospace
}
.es-stage.iso[data-theme="dark"]{
  --anatomy-card:#161616;--anatomy-paper:#161616;--anatomy-face:#202020;--anatomy-top:#212121;
  --anatomy-shade-0:#121212;--anatomy-shade-1:#151515;--anatomy-shade-2:#191919;--anatomy-shade-3:#1c1c1c;
  --anatomy-lit-top:#2d2d2d;--anatomy-lit-shade:#242424;
  --anatomy-hi:#dcdcdc;--anatomy-mid:#7c7c7c;--anatomy-lo:#505050;--anatomy-faint:#333333;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.85;--anatomy-dot:#e6e6e6;--anatomy-red:#fa504a
}
/* Screen. */
.es-stage .es-well{fill:var(--anatomy-shade-1)}
.es-stage .es-bezel{fill:var(--anatomy-top)}
.es-stage .es-glass{fill:var(--anatomy-face)}
.es-stage[data-theme="dark"] .es-glass{fill:#1a1a1a}
.es-stage .es-glow{fill:var(--anatomy-lit);opacity:.03;filter:blur(5px)}
.es-stage .es-r{fill:none;stroke:var(--anatomy-mid);stroke-width:.9px;vector-effect:non-scaling-stroke;stroke-linecap:round}
.es-stage .es-r.es-big{stroke:var(--anatomy-hi);stroke-width:1.6px}
.es-stage .es-r.es-dim,.es-stage .es-r.es-chrome{stroke:var(--anatomy-faint)}
.es-stage .es-r.es-chrome{stroke-linecap:butt}
.es-stage .es-dotc{fill:var(--anatomy-faint)}
.es-stage .es-t{fill:var(--anatomy-hi);font-family:var(--anatomy-mono);letter-spacing:.01em}
.es-stage .es-t.es-dim{fill:var(--anatomy-mid)}
.es-stage .es-t.es-small{letter-spacing:0}
.es-stage .es-t.es-head{font-family:'Geist',Arial,sans-serif;font-weight:500}
.es-stage .es-t.es-num{font-family:'Geist',Arial,sans-serif;font-weight:500;letter-spacing:-.02em}
.es-stage .es-t.es-redt{fill:var(--anatomy-red)}
.es-stage .es-t.es-val{fill:var(--anatomy-hi)}
.es-stage .es-pg[data-pg="2"] .es-row[data-row="1"][data-done] .es-val{fill:var(--anatomy-red)}
.es-stage .es-box,.es-stage .es-ucard,.es-stage .es-cchip{fill:none;stroke:var(--anatomy-lo);stroke-width:.7px;vector-effect:non-scaling-stroke}
.es-stage .es-bub{fill:var(--anatomy-shade-3);stroke:none}
.es-stage .es-track{fill:var(--anatomy-shade-3)}
.es-stage .es-fill{fill:var(--anatomy-hi)}
.es-stage .es-cursor{fill:var(--anatomy-hi);animation:es-blink 1.06s steps(1,end) infinite}
.es-stage .es-send{fill:var(--anatomy-hi)}
.es-stage .es-red{fill:var(--anatomy-red)}
.es-stage .es-cite{fill:var(--anatomy-hi)}
.es-stage .es-citet{fill:var(--anatomy-paper);font-family:'Geist',Arial,sans-serif;font-weight:500}
.es-stage .es-spin{fill:none;stroke:var(--anatomy-lo);stroke-width:.7px;vector-effect:non-scaling-stroke}
.es-stage .es-tick{fill:none;stroke:var(--anatomy-paper);stroke-width:.9px;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.es-stage .es-row[data-done] .es-spin{fill:var(--anatomy-hi);stroke:var(--anatomy-hi)}
.es-stage .es-row[data-done] .es-tick{opacity:1}
.es-stage .es-pg{opacity:0;transition:opacity .4s var(--anatomy-ease)}
.es-stage .es-pg[data-on]{opacity:1}
.es-stage .es-row,.es-stage .es-a,.es-stage .es-approve{opacity:0;transition:opacity .35s var(--anatomy-ease)}
.es-stage .es-row[data-on],.es-stage .es-a[data-on],.es-stage .es-approve[data-on]{opacity:1}
.es-stage .es-optbg{fill:transparent;stroke:transparent;stroke-width:.7px;vector-effect:non-scaling-stroke;transition:fill .3s,stroke .3s}
.es-stage .es-opt[data-hi] .es-optbg{fill:color-mix(in srgb,var(--anatomy-red) 8%,transparent);stroke:var(--anatomy-red)}
.es-stage .es-optc{fill:none;stroke:var(--anatomy-lo);stroke-width:.7px;vector-effect:non-scaling-stroke}
.es-stage .es-opt[data-hi] .es-optc{fill:var(--anatomy-red);stroke:var(--anatomy-red)}
.es-stage .es-opt .es-val{fill:var(--anatomy-red)}
.es-stage .es-btn{fill:none;stroke:var(--anatomy-hi);stroke-width:.8px;vector-effect:non-scaling-stroke}
.es-stage .es-btnt{fill:var(--anatomy-hi);font-family:'Geist',Arial,sans-serif;font-weight:500}
/* Machine. */
.es-stage .es-cord{stroke-width:1.1px}
.es-stage .es-bus{stroke-width:1.8px}
.es-stage .es-edge{stroke-width:1.2px;transition:stroke .3s}
.es-stage svg[data-opt="0"] .es-edge:is([data-e="export"],[data-e="analytics"]),.es-stage svg[data-opt="1"] .es-edge[data-e="cdn"]{stroke:var(--anatomy-red)}
.es-stage .es-pulse{fill:var(--anatomy-hi)}
.es-stage .es-pulse[data-cable="write"]{fill:var(--anatomy-red)}
.es-stage .es-void{fill:var(--anatomy-shade-0)}
.es-stage[data-theme="dark"] .es-void{fill:#0b0b0b}
.es-stage .es-tint{fill:var(--anatomy-red);opacity:.85}
.es-stage .es-led circle{transition:fill .25s}
.es-stage .es-led[data-s="0"] circle{fill:var(--anatomy-faint)}
.es-stage .es-led[data-s="1"] circle{fill:var(--anatomy-mid)}
.es-stage .es-led[data-s="2"] circle{fill:var(--anatomy-lit)}
.es-stage .es-card-i{opacity:0;transition:opacity .3s}
.es-stage .es-card-i[data-on]{opacity:1}
.es-stage .es-card-i[data-public] .es-ctab .iso-top,.es-stage .es-card-i[data-public] .es-ctab .iso-shade,.es-stage .es-card-i[data-public] .es-ctab .iso-fill{fill:var(--anatomy-red)}
.es-stage .es-card-i[data-public] .es-ctab .iso-edge{stroke:var(--anatomy-red)}
.es-stage .es-cardf>.iso-top,.es-stage .es-cardf>.iso-fill{fill:var(--anatomy-face)}
.es-stage .es-latch[data-on] .iso-edge{stroke:var(--anatomy-lit)}
.es-stage .es-wlamp .iso-top,.es-stage .es-wlamp .iso-shade,.es-stage .es-wlamp .iso-fill{transition:fill .3s}
.es-stage .es-wlamp[data-locked] .iso-top,.es-stage .es-wlamp[data-locked] .iso-shade,.es-stage .es-wlamp[data-locked] .iso-fill{fill:var(--anatomy-red)}
.es-stage .es-wlamp:not([data-locked]) .iso-top,.es-stage .es-wlamp:not([data-locked]) .iso-shade{fill:var(--anatomy-hi)}
.es-stage svg[data-reading] .es-rlamp .iso-top,.es-stage svg[data-reading] .es-rlamp .iso-shade{fill:var(--anatomy-hi)}
.es-stage .es-srv-leds circle{fill:var(--anatomy-faint)}
.es-stage svg[data-busy] .es-srv-leds .iso-dots circle{animation:es-chase .6s steps(1) infinite}
.es-stage svg[data-busy] .es-srv-leds .iso-dots:nth-child(2) circle{animation-delay:.1s}
.es-stage svg[data-busy] .es-srv-leds .iso-dots:nth-child(3) circle{animation-delay:.2s}
.es-stage svg[data-busy] .es-srv-leds .iso-dots:nth-child(4) circle{animation-delay:.3s}
.es-stage svg[data-busy] .es-srv-leds .iso-dots:nth-child(5) circle{animation-delay:.4s}
.es-stage svg[data-busy] .es-srv-leds .iso-dots:nth-child(6) circle{animation-delay:.5s}
@keyframes es-chase{0%{fill:var(--anatomy-hi)}34%{fill:var(--anatomy-faint)}}
.es-stage .es-zone{opacity:0}
/* Highlighted buckets and services: the token set changes, so <use> copies follow too. */
#es-bin .iso-solid>*,.es-stage .es-b .iso-solid>*,.es-stage .es-svc .iso-solid>*{transition:fill .35s var(--anatomy-ease),stroke .35s var(--anatomy-ease)}
.es-stage .es-b[data-h="hot"],.es-stage .es-svc[data-h="hot"]{
  --anatomy-paper:#fff1f0;--anatomy-face:#fff1f0;--anatomy-top:#ffe3e1;
  --anatomy-shade-0:#f4b4b1;--anatomy-shade-1:#f7c3c0;--anatomy-shade-2:#f9d1cf;--anatomy-shade-3:#fcdedc;
  --anatomy-hi:#b42a26;--anatomy-mid:#d83f3a;--anatomy-lo:#e88783;--anatomy-faint:#f2b6b3;--anatomy-dot:#b42a26
}
.es-stage[data-theme="dark"] .es-b[data-h="hot"],.es-stage[data-theme="dark"] .es-svc[data-h="hot"]{
  --anatomy-paper:#2a1312;--anatomy-face:#2a1312;--anatomy-top:#3f1a18;
  --anatomy-shade-0:#1f0e0d;--anatomy-shade-1:#26100f;--anatomy-shade-2:#2e1312;--anatomy-shade-3:#361614;
  --anatomy-hi:#ff8a85;--anatomy-mid:#fa504a;--anatomy-lo:#a3403c;--anatomy-faint:#6b2a27;--anatomy-dot:#ff8a85
}
.es-stage .es-b[data-h="read"]{--anatomy-mid:var(--anatomy-hi);--anatomy-lo:var(--anatomy-hi);--anatomy-top:var(--anatomy-lit-top);--anatomy-faint:var(--anatomy-mid)}
.es-stage .es-card-i[data-public][data-up] .es-cardf .iso-top,.es-stage .es-card-i[data-public][data-up] .es-cardf .iso-fill,.es-stage .es-card-i[data-public][data-up] .es-cardf .iso-shade{fill:color-mix(in srgb,var(--anatomy-red) 30%,var(--anatomy-paper))}
.es-stage .es-card-i[data-public][data-up] .es-cardf .iso-edge{stroke:var(--anatomy-red)}
.es-stage .es-zfill{fill:var(--anatomy-red);fill-opacity:.14}
.es-stage .es-zline{fill:none;stroke:var(--anatomy-red);stroke-width:1.2px;vector-effect:non-scaling-stroke}
@media (prefers-reduced-motion:reduce){.es-stage .es-cursor{animation:none}.es-stage svg[data-busy] .es-srv-leds .iso-dots circle{animation:none;fill:var(--anatomy-hi)}}
`;

const previewAt = process.argv.indexOf("--preview");
if (previewAt > 0) {
  const dir = process.argv[previewAt + 1];
  const anatomyCss = readFileSync(join(OUT, "anatomy.css"), "utf8");
  for (const themeName of ["light", "dark"]) {
    const html = `<!doctype html><html lang="en" data-theme="${themeName}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hero</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&display=swap"><style>${anatomyCss}${css}body{margin:0;background:${themeName === "dark" ? "#121212" : "#fff"}}main{max-width:1168px;margin:0 auto;padding:0 40px}.pad{height:60vh}</style></head><body><main class="cs"><div class="pad"></div>${story}<div class="pad"></div></main><script src="${"file://" + join(OUT, "hero.js")}"></script></body></html>`;
    writeFileSync(join(dir, `hero-${themeName}.html`), html);
    writeFileSync(join(dir, `review-${themeName}.html`), html.replace("</style>", ".cs .es-card,.cs .es-top,.cs .es-time,.cs .es-hint{display:none}.cs .es-stage{--cw:0px;--g:8px!important}.cs .es-fig{top:8px;bottom:8px;left:8px;right:8px}</style>"));
  }
}

writeFileSync(join(OUT, "hero.css"), css);
writeFileSync(join(OUT, "hero.js"), live);
const pagePath = join(OUT, "index.html");
const page = readFileSync(pagePath, "utf8");
const marked = /<!--ill:hero-->[\s\S]*?<!--\/ill:hero-->/;
if (!marked.test(page)) throw new Error("index.html has no <!--ill:hero--> markers");
writeFileSync(pagePath, page.replace(marked, () => story));
console.log("wrote hero.css, hero.js and the story in index.html", { paths: (svg.match(/<path/g) || []).length, kb: Math.round(svg.length / 1024) });
