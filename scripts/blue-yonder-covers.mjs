// Sustainable Supply Chain: the cover drawings, built with the Anatomy kit (vendored in anatomy-kit/, MIT).
// One small diorama per chapter, on a base tile, in the kit's inks with one tinted subject:
//   plant      the loading dock: factory, dock, a flatbed loaded on slip sheets, a forklift, spare pallets
//   warehouse  three rows of racks, a pick cart in the aisle, pallets at the end of the row
//   packing    the packing bench: open boxes, the bag going in, tape, a conveyor of sealed boxes
//   lastmile   a street corner: dispatch centre, houses with water tanks, the van on its route
//   returns    the sorting bench, four bins, and plastic road being laid by a roller
//   plan       the five-year rollout as blocks, height = share switched over that year (report, page 9)
//   journey    the five chapter tiles in a row, for the hero
// Writes projects/blue-yonder/covers/<name>.svg (inline-ready <svg>) and covers.css.
//
//   node scripts/blue-yonder-covers.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./anatomy-kit/iso-kit.mjs";
import * as G from "./anatomy-kit/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "projects", "blue-yonder");
const f2 = (v) => Math.round(v * 100) / 100;

// ── Tools bound to one projection ────────────────────────────────────────────────────────────────────────────
function toolsOf(P) {
  const at = (p) => k.iso(p, P);
  const depth = (p) => k.depthOf(p, P);
  const S = (paths, o = {}) => k.solidSvg(paths, o);
  const L = (d, o = {}) => k.lineSvg(d, o);
  const matrix = (o, u, v) => `matrix(${f2(u[0] - o[0])} ${f2(u[1] - o[1])} ${f2(v[0] - o[0])} ${f2(v[1] - o[1])} ${f2(o[0])} ${f2(o[1])})`;
  // A face at x = X (normal +x): local u runs along -y, v along -z. A face at y = Y (normal +y): u along +x, v along -z.
  const faceX = (X, y0, z0) => matrix(at([X, y0, z0]), at([X, y0 - 1, z0]), at([X, y0, z0 - 1]));
  const faceY = (Y, x0, z0) => matrix(at([x0, Y, z0]), at([x0 + 1, Y, z0]), at([x0, Y, z0 - 1]));
  // A rectangle on the +x face spanning y in [y0, y1] and z in [z0, z1]; on the +y face spanning x and z.
  const onX = (X, y0, y1, z0, z1, cls, extra = "") => `<rect class="${cls}" transform="${faceX(X, y1, z1)}" width="${f2(y1 - y0)}" height="${f2(z1 - z0)}"${extra}/>`;
  const onY = (Y, x0, x1, z0, z1, cls, extra = "") => `<rect class="${cls}" transform="${faceY(Y, x0, z1)}" width="${f2(x1 - x0)}" height="${f2(z1 - z0)}"${extra}/>`;
  const halo = (plan, z, h, blur = 0) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"${blur ? ` style="filter:blur(${blur}px)"` : ""}/>`;
  const slab = (x, y, z, w, d, h, o = {}) => {
    const { r = 0.8, steps = 2, bevel = 0, tone = "mid", cls, lit, inner = "", crease } = o;
    return S(k.slabOf({ x, y, w, d, r }, z, h, P, steps, bevel), { tone, className: cls, lit, inner, crease });
  };
  const cyl = (cx, cy, r, z, h, o = {}) => S(k.cylinder(cx, cy, r, z, h, P, o.steps ?? 20, o.bevel ?? 0), { tone: o.tone ?? "mid", className: o.cls, lit: o.lit });
  const top = (pts, z, o = {}) => L(k.onTop(pts, z, P), o);

  // A list of items painted back to front by the depth of a point that stands for each.
  function layer() {
    const items = [];
    return {
      add(svg, p, bias = 0) { items.push({ svg, d: depth(p) + bias }); },
      svg() { return items.sort((a, b) => a.d - b.d).map((i) => i.svg).join(""); },
    };
  }

  // ── Parts ──
  function carton(x, y, z, w, d, h, cls = "cv-kraft") {
    if (P.lod) return slab(x, y, z, w, d, h, { r: 0.5, cls, tone: "mid" });
    const t = z + h;
    const inner = top([[x + 0.3, y + d / 2], [x + w - 0.3, y + d / 2]], t, { tone: "lo" }) +
      onY(y + d, x + w * 0.56, x + w * 0.86, z + h * 0.42, z + h * 0.72, "cv-label");
    return slab(x, y, z, w, d, h, { r: 0.5, cls, inner, tone: "mid" });
  }
  // Cartons in cols x rows x layers on a base at z, each carton w x d x h, gap g. Returns { svg, top }.
  function load(x, y, z, cols, rows, layers, w, d, h, g = 0.5, cls = "cv-kraft") {
    const L2 = layer();
    for (let l = 0; l < layers; l++) for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const cx = x + i * (w + g), cy = y + j * (d + g), cz = z + l * h;
      L2.add(carton(cx, cy, cz, w, d, h - 0.2, cls), [cx + w / 2, cy + d / 2, cz + h / 2]);
    }
    return L2.svg();
  }
  function pallet(x, y, z, w, d, cls = "cv-wood") {
    if (P.lod) return slab(x, y, z, w, d, 5.8, { r: 0.3, cls, tone: "mid", inner: L(k.sideSeam({ x, y, w, d, r: 0.3 }, z + 4.6, P, 2), { tone: "lo" }) + L(k.sideSeam({ x, y, w, d, r: 0.3 }, z + 1.2, P, 2), { tone: "lo" }) });
    const out = [];
    const b = d * 0.17;
    for (let j = 0; j < 3; j++) out.push(slab(x, y + j * (d - b) / 2, z, w, b, 1.2, { r: 0.2, cls, tone: "mid" }));
    const blocks = [];
    const bw = w * 0.13;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) blocks.push([x + i * (w - bw) / 2, y + j * (d - b) / 2]);
    blocks.sort((p, q) => depth([p[0], p[1], 0]) - depth([q[0], q[1], 0]));
    blocks.forEach(([bx, by]) => out.push(slab(bx, by, z + 1.2, bw, b, 3.4, { r: 0.2, cls, tone: "mid" })));
    const n = 7, tw = (w / n) * 0.8, gap = (w - tw * n) / (n - 1);
    for (let i = 0; i < n; i++) out.push(slab(x + i * (tw + gap), y, z + 4.6, tw, d, 1.2, { r: 0.2, cls, tone: "mid" }));
    return out.join("");
  }
  const PALLET_H = 5.8;
  function slip(x, y, z, w, d) {
    return slab(x - 0.6, y - 0.6, z, w + 1.2, d + 1.2, 0.6, { r: 0.3, cls: "cv-acc cv-pk", tone: "mid", crease: "none" }) +
      slab(x + w + 0.6, y + d * 0.15, z, 2.2, d * 0.7, 0.6, { r: 0.3, cls: "cv-acc cv-pk", tone: "mid", crease: "none" });
  }
  // A load unit: pallet or slip sheet, with 2 x 2 x layers cartons.
  function unit(x, y, z, kind = "pallet", layers = 2) {
    const w = 24, d = 20, base = kind === "pallet" ? pallet(x, y, z, w, d) : slip(x, y, z, w, d);
    const bz = z + (kind === "pallet" ? PALLET_H : 0.6);
    return base + load(x + 0.4, y + 0.4, bz, 2, 2, layers, 11.4, 9.4, 8.6);
  }
  // A wheel on a vehicle running along x (axis along y), tyre and hub; near = the +y side.
  function wheel(cx, y, cz, r, t = 3) {
    const F = G.frameAlong([cx, y, cz], [0, 1, 0]);
    return S(G.disc(0, t, r, F, P), { tone: "hi", className: "cv-tyre" }) + S(G.disc(t, t + 0.4, r * 0.5, F, P), { tone: "mid" });
  }
  // The same with the axle along x, for a vehicle running along y.
  function wheelX(x, cy, cz, r, t = 2.6) {
    const F = G.frameAlong([x, cy, cz], [1, 0, 0]);
    return S(G.disc(0, t, r, F, P), { tone: "hi", className: "cv-tyre" }) + S(G.disc(t, t + 0.4, r * 0.5, F, P), { tone: "mid" });
  }
  function tree(x, y, s = 1) {
    const trunk = cyl(x, y, 1.4 * s, 0, 9 * s, { tone: "mid", cls: "cv-wood", steps: 12 });
    const crown = S(G.sphereOf([x, y, 15 * s], 8 * s, P), { tone: "mid", className: "cv-leaf" });
    const crown2 = S(G.sphereOf([x + 2.5 * s, y + 2 * s, 21 * s], 5.5 * s, P), { tone: "mid", className: "cv-leaf" });
    return halo({ x: x - 7 * s, y: y - 7 * s, w: 14 * s, d: 14 * s, r: 7 * s }, 0, 0.5, 4) + trunk + crown + crown2;
  }
  // A flat-roofed building. doors: [[x0, x1, h]] on the +y face; windows on +x and +y faces as rows.
  function building(x, y, w, d, h, o = {}) {
    const { doors = [], winX = null, winY = null, roof = [], parapet = true, cls } = o;
    let inner = "";
    doors.forEach(([a, b, dh]) => {
      inner += onY(y + d, a, b, 0, dh, "cv-door");
      for (let z = 3; z < dh - 1; z += 3) inner += L(k.segment([a, y + d, z], [b, y + d, z], P), { tone: "faint" });
    });
    if (winY) for (const [z0, z1] of winY.rows) for (let a = x + winY.from; a + winY.w <= x + w - winY.from + 0.01; a += winY.step) inner += onY(y + d, a, a + winY.w, z0, z1, "cv-glass");
    if (winX) for (const [z0, z1] of winX.rows) for (let a = y + winX.from; a + winX.w <= y + d - winX.from + 0.01; a += winX.step) inner += onX(x + w, a, a + winX.w, z0, z1, "cv-glass");
    if (parapet) inner += L(k.planOutline(k.insetPlan({ x, y, w, d, r: 1 }, 1.6), h, P, 2), { tone: "lo" });
    const out = [halo({ x, y, w, d, r: 2 }, 0, h * 0.2, 6), slab(x, y, 0, w, d, h, { r: 1, bevel: 0.8, tone: "mid", cls, inner })];
    const R = layer();
    roof.forEach(([kind, a, b, c, e, f]) => {
      if (kind === "box") R.add(slab(a, b, h, c, e, f, { r: 0.6, tone: "mid", bevel: 0.4 }), [a + c / 2, b + e / 2, h]);
      if (kind === "light") R.add(slab(a, b, h, c, e, f, { r: 0.4, tone: "mid", cls: "cv-glass-s" }), [a + c / 2, b + e / 2, h]);
      if (kind === "tank") R.add(cyl(a, b, c, h, e, { tone: "mid", bevel: 0.4 }) + L(k.ring(a, b, c * 0.6, h + e, P, 20), { tone: "lo" }), [a, b, h]);
      if (kind === "stack") R.add(cyl(a, b, c, h, e, { tone: "mid", steps: 24 }) + L(G.arcOf(G.frameAlong([a, b, 0], [0, 0, 1]), h + e * 0.8, c, P), { tone: "lo" }), [a, b, h]);
    });
    return out.join("") + R.svg();
  }
  // A two-storey house with a rooftop water tank, door and windows on the visible faces.
  function house(x, y, w, d, h, cls) {
    return building(x, y, w, d, h, {
      cls,
      doors: [[x + w * 0.62, x + w * 0.62 + 5, 9]],
      winY: { rows: [[4, 9], [h - 9, h - 4]], from: 3, w: 5, step: w / 2.2 },
      winX: { rows: [[h - 9, h - 4]], from: 3, w: 5, step: d / 2 },
      roof: [["tank", x + w * 0.3, y + d * 0.35, 3.2, 4.5]],
    });
  }
  // A flatbed truck along x, cab at the +x end. Returns { svg, deck } where deck is the load area.
  function truck(x, y, len, wid, units = []) {
    const deckZ = 9, W = wid;
    const out = [];
    [x + 10, x + 18, x + len + 12].forEach((cx) => out.push(wheel(cx, y - 0.4, 5, 5)));
    out.push(slab(x + 2, y + 3, 4.5, len + 18, W - 6, 4.5, { r: 0.4, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x, y, deckZ, len, W, 2, { r: 0.5, tone: "mid", bevel: 0.4 }));
    for (let i = 1; i < 6; i++) out.push(L(k.segment([x + (len * i) / 6, y + W, deckZ + 0.4], [x + (len * i) / 6, y + W, deckZ + 1.6], P), { tone: "faint" }));
    const U = layer();
    units.forEach(([ux, kind, layers]) => U.add(unit(x + ux, y + 1, deckZ + 2, kind, layers), [x + ux + 12, y + 11, deckZ + 10]));
    out.push(U.svg());
    out.push(slab(x + len - 2, y, deckZ + 2, 2, W, 26, { r: 0.4, tone: "mid", bevel: 0.3 }));
    // cab
    const cx = x + len + 2, cw = 17;
    const cabInner =
      onX(cx + cw, y + 3, y + W - 3, 20, 30, "cv-glass") +
      onY(y + W, cx + 3, cx + 11, 20, 29, "cv-glass") +
      onX(cx + cw, y + 3, y + W - 3, 9, 13, "cv-grille") +
      L(k.segment([cx + 12.5, y + W, 6], [cx + 12.5, y + W, 30], P), { tone: "faint" });
    out.push(slab(cx, y, 5, cw, W, 28, { r: 1.6, steps: 3, tone: "mid", bevel: 0.6, inner: cabInner }));
    out.push(slab(cx + cw - 0.6, y - 0.4, 5, 1.6, W + 0.8, 3, { r: 0.4, tone: "mid", cls: "cv-dark" }));
    [x + 10, x + 18, x + len + 12].forEach((cx2) => out.push(wheel(cx2, y + W - 2.6, 5, 5)));
    return out.join("");
  }
  // A forklift facing -y (forks toward -y), body from (x, y) to (x + 16, y + 24), carrying a load.
  function forklift(x, y, liftZ = 8, carry = "slip") {
    const out = [];
    out.push(halo({ x: x - 2, y: y - 18, w: 22, d: 44, r: 6 }, 0, 1, 6));
    [y + 5, y + 19].forEach((cy) => out.push(wheelX(x - 2.4, cy, 4, 4)));
    out.push(slab(x + 3.2, y - 18, liftZ, 3, 19, 1.1, { r: 0.2, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x + 9.8, y - 18, liftZ, 3, 19, 1.1, { r: 0.2, tone: "mid", cls: "cv-dark" }));
    out.push(unit(x - 4, y - 21, liftZ + 1.1, carry, 2));
    out.push(slab(x + 1.5, y - 1.2, 2, 2.2, 2.2, 36, { r: 0.3, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x + 12.3, y - 1.2, 2, 2.2, 2.2, 36, { r: 0.3, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x + 1.5, y - 1.2, 34, 13, 2.2, 2, { r: 0.3, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x + 1, y - 2.2, liftZ, 14, 1.4, 9, { r: 0.3, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x, y + 1, 2.5, 16, 22, 8, { r: 1.2, steps: 3, tone: "mid", bevel: 0.5, cls: "cv-acc cv-tr" }));
    out.push(slab(x, y + 19, 2.5, 16, 5, 12, { r: 1.6, steps: 3, tone: "mid", bevel: 0.5, cls: "cv-acc cv-tr" }));
    out.push(slab(x + 4, y + 12, 10.5, 8, 5, 2.6, { r: 0.8, tone: "mid", cls: "cv-dark" }));
    out.push(slab(x + 4, y + 16.5, 10.5, 8, 1.6, 8, { r: 0.6, tone: "mid", cls: "cv-dark" }));
    out.push(cyl(x + 8, y + 6.5, 2.6, 10.5, 5, { tone: "mid", steps: 14, cls: "cv-dark" }));
    const posts = [[x + 1, y + 4], [x + 13.6, y + 4], [x + 1, y + 17], [x + 13.6, y + 17]];
    posts.sort((p, q) => depth([p[0], p[1], 0]) - depth([q[0], q[1], 0]));
    posts.forEach(([px, py]) => out.push(slab(px, py, 10.5, 1.4, 1.4, 17, { r: 0.2, tone: "mid", cls: "cv-dark" })));
    out.push(slab(x + 0.6, y + 3.6, 27.5, 14.8, 14.8, 1.2, { r: 0.6, tone: "mid", bevel: 0.3, cls: "cv-dark",
      inner: [0.3, 0.5, 0.7].map((t) => top([[x + 0.6 + 14.8 * t, y + 4], [x + 0.6 + 14.8 * t, y + 18]], 28.7, { tone: "lo" })).join("") }));
    [y + 5, y + 19].forEach((cy) => out.push(wheelX(x + 16, cy, 4, 4)));
    return out.join("");
  }
  // A rack along x with `levels` shelves; contents is a per-level list of carton spans [x0, w].
  function rack(x, y, len, dep, levels, lh, fill) {
    const out = [];
    const posts = [x, x + len / 2 - 0.7, x + len - 1.4];
    posts.forEach((px) => out.push(slab(px, y, 0, 1.4, 1.4, levels * lh + 2, { r: 0.2, tone: "mid", cls: "cv-acc cv-wh" })));
    for (let l = 0; l < levels; l++) {
      const z = l * lh + 1.4;
      out.push(slab(x, y, z - 1.4, len, dep, 1.4, { r: 0.2, tone: "mid", bevel: 0.2 }));
      const C = layer();
      fill(l).forEach(([cx, cw, ch = lh - 4, kind]) => {
        if (kind === "tote") C.add(slab(x + cx, y + 2, z, cw, dep - 4, ch, { r: 0.8, tone: "mid", cls: "cv-acc cv-wh" }), [x + cx + cw / 2, y + dep / 2, z]);
        else C.add(carton(x + cx, y + 1.5, z, cw, dep - 3, ch), [x + cx + cw / 2, y + dep / 2, z]);
      });
      out.push(C.svg());
    }
    out.push(slab(x, y, levels * lh, len, dep, 1.4, { r: 0.2, tone: "mid", bevel: 0.2 }));
    posts.forEach((px) => {
      out.push(slab(px, y + dep - 1.4, 0, 1.4, 1.4, levels * lh + 2, { r: 0.2, tone: "mid", cls: "cv-acc cv-wh" }));
      for (let l = 0; l <= levels; l++) out.push(L(k.segment([px + 1.4, y + dep - 1.4, l * lh + 0.7], [px + 1.4, y + 1.4, l * lh + 0.7], P), { tone: "faint" }));
    });
    return out.join("");
  }
  // An open-topped box or bin: floor, back walls, what is inside, front walls.
  function openBox(x, y, z, w, d, h, cls, contents = "", t = 0.8) {
    return slab(x, y, z, w, d, 0.6, { r: 0.2, cls: `${cls} cv-in`, crease: "none" }) +
      slab(x, y, z, t, d, h, { r: 0.1, cls }) + slab(x, y, z, w, t, h, { r: 0.1, cls }) + contents +
      slab(x + w - t, y, z, t, d, h, { r: 0.1, cls }) + slab(x, y + d - t, z, w, t, h, { r: 0.1, cls });
  }
  // The two back walls of a room, cut away at the front. features: { y: [...], x: [...] } as rects on the faces.
  function walls(w, d, h, f = {}) {
    let iy = L(k.sideSeam({ x: 0, y: 0, w, d: 3, r: 0 }, h - 6, P, 2), { tone: "faint" }), ix = "";
    (f.y || []).forEach(([a, b, z0, z1, cls]) => { iy += onY(3, a, b, z0, z1, cls); });
    (f.x || []).forEach(([a, b, z0, z1, cls]) => { ix += onX(3, a, b, z0, z1, cls); });
    return slab(0, 0, 0, 3, d, h, { r: 0, tone: "mid", cls: "cv-wall", inner: ix }) + slab(3, 0, 0, w - 3, 3, h, { r: 0, tone: "mid", cls: "cv-wall", inner: iy });
  }
  // A bale of shredded plastic, strapped.
  function bale(x, y, z, w, d, h, cls = "cv-acc cv-pk") {
    const pl = { x, y, w, d, r: 0.6 };
    const inner = [0.25, 0.75].map((t) => L(k.sideSeam(pl, z + h * t, P, 2), { tone: "hi" })).join("") +
      [0.3, 0.7].map((t) => top([[x + w * t, y + 0.3], [x + w * t, y + d - 0.3]], z + h, { tone: "hi" })).join("");
    return slab(x, y, z, w, d, h, { r: 0.6, cls, inner, bevel: 0.3 });
  }

  // The base tile every scene stands on.
  function tile(w, d, inset = true) {
    const plan = { x: 0, y: 0, w, d, r: 6 };
    return halo(plan, -8, 8, 14) + slab(0, 0, -8, w, d, 8, { r: 6, steps: 6, bevel: 1.2, tone: "mid", cls: "cv-ground",
      inner: k.lineSvg(k.sideSeam(plan, -3, P, 6), { tone: "faint" }) }) +
      (inset ? L(k.planOutline(k.insetPlan(plan, 4), 0, P, 6), { tone: "faint" }) : "");
  }
  return { at, depth, S, L, slab, cyl, top, onX, onY, halo, layer, carton, load, pallet, slip, unit, wheel, wheelX, tree, building, house, truck, forklift, rack, tile, openBox, walls, bale, PALLET_H };
}

// ── Scenes. Each draws on a 240 x 170 tile, with the origin at the tile's back corner. ──────────────────────
const TW = 240, TD = 170;
const SCENES = {
  plant(T) {
    const M = T.layer();
    M.add(T.building(12, 12, 118, 52, 44, {
      doors: [[22, 40, 22], [50, 68, 22], [78, 96, 22]],
      winX: { rows: [[28, 36]], from: 6, w: 9, step: 13 },
      roof: [["light", 22, 22, 26, 8, 1.6], ["light", 22, 38, 26, 8, 1.6], ["light", 60, 22, 26, 8, 1.6], ["light", 60, 38, 26, 8, 1.6], ["box", 98, 22, 16, 12, 6], ["stack", 112, 50, 4.5, 30]],
    }), [70, 38, 20]);
    M.add(T.slab(12, 64, 0, 118, 12, 9, { r: 0.6, bevel: 0.6, tone: "mid" }), [70, 70, 4], 4);
    M.add(T.truck(20, 92, 104, 24, [[2, "slip", 2], [27, "slip", 2], [52, "slip", 2], [77, "pallet", 1]]), [80, 104, 12], 6);
    M.add(T.forklift(168, 64, 6), [176, 64, 10], 8);
    const stack = [0, 1, 2, 3].map((i) => T.pallet(196, 20, i * T.PALLET_H, 24, 20)).join("");
    M.add(T.halo({ x: 196, y: 20, w: 24, d: 20, r: 2 }, 0, 4, 5) + stack, [208, 30, 6]);
    M.add(T.slab(196, 46, 0, 24, 20, 0.6, { r: 0.3, cls: "cv-acc cv-pk", crease: "none" }) + T.slab(196, 46, 0.6, 24, 20, 0.6, { r: 0.3, cls: "cv-acc cv-pk", crease: "none" }) + T.slab(196, 46, 1.2, 24, 20, 0.6, { r: 0.3, cls: "cv-acc cv-pk", crease: "none" }), [208, 56, 1]);
    let dash = "";
    for (let a = 10; a < 228; a += 14) dash += T.top([[a, 147], [a + 7, 147]], 0.6, { tone: "lit" });
    M.add(T.slab(4, 136, 0, 232, 22, 0.6, { r: 0.4, cls: "cv-road", crease: "none", inner: dash }), [120, 147, -2], -200);
    M.add(T.tree(226, 112, 0.9), [226, 112, 0]);
    M.add(T.tree(226, 20, 0.8), [226, 20, 0]);
    M.add(T.tree(170, 118, 0.7), [170, 118, 0]);
    return T.tile(TW, TD) + M.svg();
  },
  warehouse(T) {
    const M = T.layer();
    M.add(T.walls(TW, TD, 58, {
      y: [[20, 60, 42, 52, "cv-glass"], [70, 110, 42, 52, "cv-glass"], [120, 160, 42, 52, "cv-glass"], [170, 210, 42, 52, "cv-glass"]],
      x: [[112, 144, 0, 30, "cv-door"], [20, 60, 42, 52, "cv-glass"], [70, 100, 42, 52, "cv-glass"]],
    }), [0, 0, 0], -400);
    const fill = (seed) => (l) => {
      const out = [];
      let x = 3, i = 0;
      while (x < 142) {
        const w = [12, 15, 10, 13, 16, 11][(seed + l * 3 + i) % 6], gap = (seed + l + i) % 5 === 0 ? 13 : 1.2;
        if (x + w > 147) break;
        out.push([x, w, 9.5 - ((seed + i + l) % 3) * 1.5, (seed + i * 2 + l) % 7 === 3 ? "tote" : null]);
        x += w + gap;
        i++;
      }
      return out;
    };
    [[18, 1], [70, 2]].forEach(([y, sd]) => M.add(T.halo({ x: 26, y, w: 150, d: 18, r: 2 }, 0, 6, 6) + T.rack(26, y, 150, 18, 3, 14, fill(sd)), [101, y + 9, 10]));
    // Floor tape: the aisle and the pick zone
    M.add(T.top([[26, 40], [176, 40]], 0, { tone: "lo" }) + T.top([[26, 66], [176, 66]], 0, { tone: "lo" }) +
      T.top([[20, 104], [120, 104], [120, 160], [20, 160], [20, 104]], 0, { tone: "lo" }), [100, 100, -1], -300);
    // Pick cart with two totes and a handheld scanner
    const cx = 44, cy = 122;
    const cart = [cx + 3, cx + 20].map((x) => T.cyl(x, cy + 1.5, 1.4, 0, 3, { steps: 10, cls: "cv-dark" })).join("") +
      T.slab(cx, cy, 3, 24, 13, 1.4, { r: 0.6, tone: "mid", cls: "cv-dark" }) +
      T.slab(cx + 1, cy + 1.5, 4.4, 10, 10, 6.5, { r: 0.8, cls: "cv-acc cv-wh", bevel: 0.3 }) +
      T.slab(cx + 12.5, cy + 1.5, 4.4, 10, 10, 6.5, { r: 0.8, cls: "cv-acc cv-wh", bevel: 0.3 }) +
      [cx + 3, cx + 20].map((x) => T.cyl(x, cy + 11.5, 1.4, 0, 3, { steps: 10, cls: "cv-dark" })).join("") +
      T.slab(cx + 23, cy, 4.4, 1.2, 13, 17, { r: 0.3, cls: "cv-dark" }) +
      T.slab(cx + 23, cy, 21.4, 1.2, 13, 1.2, { r: 0.3, cls: "cv-dark" }) +
      T.slab(cx + 14, cy + 3, 10.9, 6, 4, 1, { r: 0.6, cls: "cv-dark", lit: true, inner: T.top([[cx + 15, cy + 4], [cx + 19, cy + 4], [cx + 19, cy + 6], [cx + 15, cy + 6], [cx + 15, cy + 4]], 11.9, { tone: "lit" }) });
    M.add(T.halo({ x: cx, y: cy, w: 24, d: 13, r: 2 }, 0, 2, 4) + cart, [cx + 12, cy + 6, 4]);
    M.add(T.unit(84, 118, 0, "pallet", 2), [96, 128, 8]);
    M.add(T.unit(84, 140, 0, "pallet", 1), [96, 150, 6]);
    M.add(T.forklift(196, 120, 14, "pallet"), [204, 116, 10], 8);
    M.add(T.unit(204, 22, 0, "pallet", 2), [216, 32, 8]);
    M.add(T.unit(204, 74, 0, "pallet", 1), [216, 84, 8]);
    return T.tile(TW, TD) + M.svg();
  },
  packing(T) {
    const M = T.layer();
    M.add(T.walls(TW, TD, 52, { x: [[104, 136, 0, 28, "cv-door"]], y: [[150, 220, 34, 44, "cv-glass"]] }), [0, 0, 0], -400);
    // Rolls of bags on a wall shelf
    const rolls = [0, 1, 2, 3].map((i) => { const F = G.frameAlong([150 + i * 17, 6.5, 41], [1, 0, 0]); return T.S(G.disc(0, 14, 3.6, F, T.P), { tone: "mid", className: "cv-bag" }) + T.S(G.disc(14, 14.3, 1.2, F, T.P), { tone: "mid", className: "cv-dark" }); }).join("");
    M.add(T.slab(146, 3, 36, 74, 8, 1.4, { r: 0.2, tone: "mid" }) + rolls, [183, 7, 40], -350);
    // Conveyor at the back carrying sealed boxes
    const conv = [];
    [30, 70, 110, 150, 190].forEach((x) => conv.push(T.slab(x, 22, 0, 1.6, 14, 14, { r: 0.2, cls: "cv-dark" })));
    conv.push(T.slab(24, 20, 14, 180, 18, 2.4, { r: 0.6, tone: "mid", bevel: 0.3,
      inner: Array.from({ length: 30 }, (_, i) => T.top([[26 + i * 6, 21], [26 + i * 6, 37]], 16.4, { tone: "faint" })).join("") }));
    const C = T.layer();
    [40, 82, 124, 166].forEach((x, i) => C.add(T.carton(x, 23, 16.4, 16, 12, 10 + (i % 2) * 2), [x + 8, 29, 20]));
    M.add(conv.join("") + C.svg(), [114, 29, 10]);
    // Packing bench
    const bx = 40, by = 64, bw = 150, bd = 30, bz = 24;
    const bench = [];
    [[bx + 3, by + 3], [bx + bw - 5, by + 3]].forEach(([x, y]) => bench.push(T.slab(x, y, 0, 2, 2, bz, { r: 0.2, cls: "cv-dark" })));
    bench.push(T.slab(bx + 3, by + 3, 6, bw - 6, bd - 6, 1.2, { r: 0.2, tone: "mid" }));
    [[bx + 3, by + bd - 5], [bx + bw - 5, by + bd - 5]].forEach(([x, y]) => bench.push(T.slab(x, y, 0, 2, 2, bz, { r: 0.2, cls: "cv-dark" })));
    bench.push(T.slab(bx, by, bz, bw, bd, 2.4, { r: 0.8, tone: "mid", bevel: 0.5, cls: "cv-wood" }));
    const B = T.layer();
    // Open box: back walls, floor, the bag inside, front walls
    const ob = (x, y, w, d, h, bag) => {
      const z = bz + 2.4, t = 0.7, out = [];
      out.push(T.slab(x, y, z, w, d, 0.6, { r: 0.2, cls: "cv-kraft-in", crease: "none" }));
      out.push(T.slab(x, y, z, t, d, h, { r: 0.1, cls: "cv-kraft" }), T.slab(x, y, z, w, t, h, { r: 0.1, cls: "cv-kraft" }));
      if (bag) out.push(T.slab(x + 2, y + 2, z + 0.6, w - 4, d - 4, h + 3, { r: 2.2, steps: 4, bevel: 0.6, cls: "cv-bag", lit: true }));
      out.push(T.slab(x + w - t, y, z, t, d, h, { r: 0.1, cls: "cv-kraft" }), T.slab(x, y + d - t, z, w, t, h, { r: 0.1, cls: "cv-kraft" }));
      return out.join("");
    };
    B.add(ob(bx + 46, by + 6, 22, 18, 9, true), [bx + 57, by + 15, bz + 6]);
    B.add(ob(bx + 80, by + 7, 18, 15, 8, false), [bx + 89, by + 14, bz + 6]);
    // Flat bags waiting, a tape dispenser, sealed boxes at the end
    B.add([0, 1, 2, 3].map((i) => T.slab(bx + 8, by + 8, bz + 2.4 + i * 1, 18, 14, 0.9, { r: 1.2, steps: 3, cls: "cv-bag", crease: "none" })).join(""), [bx + 17, by + 15, bz + 3]);
    B.add(T.slab(bx + 108, by + 10, bz + 2.4, 10, 6, 4, { r: 1, cls: "cv-dark" }) + T.cyl(bx + 112, by + 13, 3.4, bz + 6.4, 2.6, { steps: 18, tone: "mid", cls: "cv-kraft" }), [bx + 113, by + 13, bz + 6]);
    B.add(T.carton(bx + 126, by + 6, bz + 2.4, 16, 12, 9) + T.carton(bx + 127, by + 7, bz + 11.4, 14, 10, 7), [bx + 134, by + 12, bz + 8]);
    M.add(T.halo({ x: bx, y: by, w: bw, d: bd, r: 3 }, 0, 6, 6) + bench.join("") + B.svg(), [bx + bw / 2, by + bd / 2, 12]);
    // Flattened boxes stacked on a cart, and a bin of returned bags
    M.add(T.halo({ x: 40, y: 116, w: 30, d: 24, r: 3 }, 0, 2, 4) + [0, 1, 2, 3, 4, 5].map((i) => T.slab(40, 116, 3 + i * 1.4, 30, 24, 1.2, { r: 0.3, cls: "cv-kraft", crease: "none" })).join("") + [43, 67].map((x) => T.cyl(x, 137, 1.6, 0, 3, { steps: 10, cls: "cv-dark" })).join(""), [55, 128, 4]);
    // A tote of bags returned for Green Points
    const bags = [0, 1, 2].map((i) => T.slab(98 + i * 6, 120 + (i % 2) * 3, 1, 9, 12, 13 - i * 2, { r: 2, steps: 3, cls: "cv-bag", lit: true, bevel: 0.4 })).join("");
    M.add(T.halo({ x: 96, y: 118, w: 26, d: 20, r: 3 }, 0, 3, 4) + T.openBox(96, 118, 0, 26, 20, 11, "cv-acc cv-pk", bags), [109, 128, 6]);
    // Roll cage of sealed parcels, ready for dispatch
    const gx = 150, gy = 112, gw = 40, gd = 30, gh = 40;
    const cage = [];
    [[gx, gy], [gx + gw - 1.2, gy]].forEach(([x, y]) => cage.push(T.slab(x, y, 3, 1.2, 1.2, gh, { r: 0.2, cls: "cv-dark" })));
    cage.push(T.slab(gx, gy, 3, gw, gd, 1.4, { r: 0.4, cls: "cv-dark" }));
    const Pc = T.layer();
    [[0, 0, 0, 16, 12, 10], [18, 0, 0, 18, 13, 12], [1, 14, 0, 15, 13, 11], [18, 15, 0, 18, 12, 9], [2, 2, 10, 13, 10, 8], [19, 2, 12, 15, 10, 7], [3, 15, 11, 12, 11, 9]].forEach(([a, b, c, w, d, h]) => Pc.add(T.carton(gx + 2 + a, gy + 2 + b, 4.4 + c, w, d, h), [gx + 2 + a + w / 2, gy + 2 + b + d / 2, 4.4 + c + h / 2]));
    cage.push(Pc.svg());
    [[gx, gy + gd - 1.2], [gx + gw - 1.2, gy + gd - 1.2]].forEach(([x, y]) => cage.push(T.slab(x, y, 3, 1.2, 1.2, gh, { r: 0.2, cls: "cv-dark" })));
    for (let z = 10; z < gh; z += 7) cage.push(T.L(k.segment([gx + 0.6, gy + gd - 0.6, z], [gx + gw - 0.6, gy + gd - 0.6, z], T.P), { tone: "mid" }) + T.L(k.segment([gx + gw - 0.6, gy + 0.6, z], [gx + gw - 0.6, gy + gd - 0.6, z], T.P), { tone: "mid" }));
    [[gx + 3, gy + 3], [gx + gw - 3, gy + 3], [gx + 3, gy + gd - 3], [gx + gw - 3, gy + gd - 3]].forEach(([x, y]) => cage.push(T.cyl(x, y, 1.4, 0, 3, { steps: 10, cls: "cv-dark" })));
    M.add(T.halo({ x: gx, y: gy, w: gw, d: gd, r: 3 }, 0, 3, 5) + cage.join(""), [gx + gw / 2, gy + gd / 2, 10]);
    return T.tile(TW, TD) + M.svg();
  },
  lastmile(T) {
    const M = T.layer();
    // Roads: one along x, one along y, kerbs and lane dashes
    const road = (x, y, w, d, along) => {
      let inner = "";
      if (along === "x") for (let a = x + 4; a < x + w - 8; a += 12) inner += T.top([[a, y + d / 2], [a + 6, y + d / 2]], 0.6, { tone: "lit" });
      else for (let a = y + 4; a < y + d - 8; a += 12) inner += T.top([[x + w / 2, a], [x + w / 2, a + 6]], 0.6, { tone: "lit" });
      return T.slab(x, y, 0, w, d, 0.6, { r: 0.4, cls: "cv-road", crease: "none", inner });
    };
    M.add(road(4, 84, 232, 22, "x"), [120, 95, -2], -200);
    M.add(road(126, 4, 22, 80, "y") + road(126, 106, 22, 60, "y"), [137, 85, -2], -199);
    // Route: the van's path, dotted on the road
    M.add(T.L(k.onTop([[40, 98], [130, 98], [130, 150]], 0.8, T.P), { tone: "hi", dotted: true }), [100, 100, 0], -150);
    // Dispatch centre
    M.add(T.building(14, 14, 96, 54, 30, { doors: [[24, 42, 18], [50, 68, 18]], winX: { rows: [[20, 26]], from: 6, w: 8, step: 12 }, roof: [["box", 80, 24, 14, 10, 5], ["light", 26, 24, 40, 10, 1.4]] }), [62, 41, 15]);
    // Houses
    [[160, 14, 30, 26, 24], [196, 18, 28, 24, 20], [16, 118, 30, 26, 22], [56, 122, 26, 24, 26], [162, 118, 28, 26, 24], [198, 120, 26, 24, 20]].forEach(([x, y, w, d, h]) => M.add(T.house(x, y, w, d, h), [x + w / 2, y + d / 2, h / 2]));
    // The van on the road, heading +x
    const vx = 70, vy = 89;
    const van = T.wheel(vx + 6, vy - 0.4, 3.6, 3.6, 2.4) + T.wheel(vx + 26, vy - 0.4, 3.6, 3.6, 2.4) +
      T.slab(vx, vy, 3, 34, 13, 18, { r: 1.6, steps: 3, bevel: 0.6, cls: "cv-acc cv-tr", lit: true,
        inner: T.onX(vx + 34, vy + 2, vy + 11, 11, 17, "cv-glass") + T.onY(vy + 13, vx + 25, vx + 32, 11, 17, "cv-glass") + T.onY(vy + 13, vx + 3, vx + 20, 6, 15, "cv-panel") }) +
      T.wheel(vx + 6, vy + 11.4, 3.6, 3.6, 2.4) + T.wheel(vx + 26, vy + 11.4, 3.6, 3.6, 2.4);
    M.add(T.halo({ x: vx, y: vy, w: 34, d: 13, r: 3 }, 0, 2, 4) + van, [vx + 17, vy + 6, 8], 2);
    [[118, 72], [118, 112], [154, 72], [154, 112]].forEach(([x, y]) => M.add(T.cyl(x, y, 0.9, 0, 16, { steps: 10, cls: "cv-dark" }) + T.slab(x - 0.9, y - 4, 16, 1.8, 5, 1, { r: 0.3, cls: "cv-dark" }), [x, y, 8]));
    [[116, 150], [228, 72], [8, 74]].forEach(([x, y]) => M.add(T.tree(x, y, 0.75), [x, y, 0]));
    return T.tile(TW, TD) + M.svg();
  },
  returns(T) {
    const M = T.layer();
    // Returned parcels on a sorting bench
    const bx = 18, by = 20, bw = 100, bd = 26, bz = 20;
    const bench = [[bx + 2, by + 2], [bx + bw - 4, by + 2], [bx + 2, by + bd - 4], [bx + bw - 4, by + bd - 4]].map(([x, y]) => T.slab(x, y, 0, 2, 2, bz, { r: 0.2, cls: "cv-dark" })).join("") +
      T.slab(bx, by, bz, bw, bd, 2, { r: 0.6, bevel: 0.4, tone: "mid" });
    const P2 = T.layer();
    [[bx + 6, 14, 11, 8, "cv-acc cv-rt"], [bx + 24, 12, 10, 7, "cv-kraft"], [bx + 40, 16, 12, 9, "cv-acc cv-rt"], [bx + 60, 11, 9, 6, "cv-kraft"], [bx + 76, 14, 12, 10, "cv-acc cv-rt"]].forEach(([x, w, d, h, cls]) => P2.add(T.carton(x, by + 7, bz + 2, w, d, h, cls), [x + w / 2, by + 12, bz + 5]));
    M.add(T.halo({ x: bx, y: by, w: bw, d: bd, r: 2 }, 0, 4, 5) + bench + P2.svg(), [bx + bw / 2, by + bd / 2, 10]);
    // Four bins: resell, donate, recycle, dispose, each open with what goes in it
    const inside = [
      (x, y) => T.carton(x + 3, y + 3, 9, 8, 7, 7) + T.carton(x + 10, y + 7, 9, 7, 7, 8),
      (x, y) => T.slab(x + 3, y + 4, 9, 7, 9, 10, { r: 2, steps: 3, cls: "cv-bag", lit: true }) + T.slab(x + 10, y + 6, 9, 7, 8, 9, { r: 2, steps: 3, cls: "cv-bag", lit: true }),
      (x, y) => [0, 1, 2, 3, 4].map((i) => T.S(G.sphereOf([x + 5 + (i % 3) * 5, y + 5 + Math.floor(i / 3) * 6, 15 + (i % 2)], 2.6, T.P), { tone: "mid", className: "cv-acc cv-pk" })).join(""),
      (x, y) => T.slab(x + 3, y + 3, 9, 14, 12, 8, { r: 3, steps: 4, cls: "cv-dark" }),
    ];
    [["cv-kraft", 0], ["cv-wood", 1], ["cv-acc cv-pk", 2], ["cv-dark", 3]].forEach(([cls, i]) => {
      const x = 18 + i * 26, y = 68;
      M.add(T.halo({ x, y, w: 20, d: 18, r: 2 }, 0, 3, 4) + T.openBox(x, y, 0, 20, 18, 16, cls, inside[i](x, y), 1), [x + 10, y + 9, 9]);
    });
    // The new road: asphalt with plastic flecks, a strip still to lay, and a roller on it
    const rx = 132, ry = 10, rw = 34, rd = 150;
    let flecks = "";
    for (let i = 0; i < 70; i++) { const fx = rx + 3 + ((i * 37) % 28), fy = ry + 3 + ((i * 53) % 96); flecks += k.dotsSvg([T.at([fx, fy, 1.2])], { size: 0.7, tone: "hi" }); }
    M.add(T.slab(rx, ry, 0, rw, 104, 1.2, { r: 0.4, cls: "cv-road", crease: "none", inner: flecks + [0, 1, 2, 3, 4, 5, 6].map((i) => T.top([[rx + rw / 2, ry + 6 + i * 14], [rx + rw / 2, ry + 12 + i * 14]], 1.2, { tone: "lit" })).join("") }), [rx + rw / 2, ry + 52, -1], -200);
    M.add(T.slab(rx, ry + 104, 0, rw, rd - 104, 0.5, { r: 0.4, cls: "cv-gravel", crease: "none" }), [rx + rw / 2, ry + 127, -1], -199);
    // Roller: front drum, frame, cab, rear wheels; running along y
    const ox = rx + 4, oy = ry + 96;
    const drum = (cy) => { const F = G.frameAlong([ox - 0.5, cy, 7.5], [1, 0, 0]); return T.S(G.disc(0, 27, 7.5, F, T.P), { tone: "mid", className: "cv-dark" }) + T.S(G.disc(27, 27.5, 4, F, T.P), { tone: "mid" }); };
    const roller = drum(oy) +
      T.slab(ox + 1, oy + 5, 4, 24, 22, 9, { r: 1.2, steps: 3, bevel: 0.5, cls: "cv-acc cv-rt", lit: true }) +
      T.slab(ox + 4, oy + 12, 13, 18, 12, 2, { r: 0.6, cls: "cv-dark" }) +
      [[ox + 5, oy + 13], [ox + 20, oy + 13], [ox + 5, oy + 22], [ox + 20, oy + 22]].map(([x, y]) => T.slab(x, y, 15, 1.2, 1.2, 14, { r: 0.2, cls: "cv-dark" })).join("") +
      T.slab(ox + 3.5, oy + 11.5, 29, 19, 13, 1.2, { r: 0.6, bevel: 0.3, cls: "cv-dark" }) +
      T.wheelX(ox + 26.5, oy + 24, 5.5, 5.5, 2);
    M.add(T.halo({ x: ox, y: oy - 6, w: 28, d: 38, r: 4 }, 0, 2, 5) + roller, [ox + 14, oy + 14, 8], 4);
    // Bales of HDPE and LDPE waiting to go in, on a pallet
    M.add(T.halo({ x: 186, y: 26, w: 30, d: 24, r: 2 }, 0, 3, 4) + T.pallet(186, 26, 0, 30, 24) + T.bale(187, 27, 5.8, 13, 22, 12) + T.bale(201, 27, 5.8, 14, 22, 12) + T.bale(188, 28, 17.8, 26, 20, 10), [201, 38, 10]);
    M.add(T.halo({ x: 186, y: 62, w: 30, d: 24, r: 2 }, 0, 3, 4) + T.pallet(186, 62, 0, 30, 24) + T.bale(187, 63, 5.8, 28, 22, 12), [201, 74, 8]);
    M.add(T.tree(214, 140, 0.85), [214, 140, 0]);
    M.add(T.tree(30, 140, 0.8), [30, 140, 0]);
    M.add(T.tree(64, 150, 0.7), [64, 150, 0]);
    return T.tile(TW, TD) + M.svg();
  },
  // The rollout from page 9 of the report, in chapter order. Cells are [year, share %, kind]: kind "rd" is R&D,
  // "tier" a tier roll-out (no share given, drawn at a fixed low height).
  plan(T) {
    const rows = [
      ["pk", [[1, 14], [2, 24.75], [3, 61.25]]],
      ["wh", [[0, 35], [1, 65], [2, 0, "rd"], [3, 0, "rd"], [4, 0, "rd"]]],
      ["pk", [[0, 0, "rd"], [1, 10], [2, 18.5], [3, 30], [4, 41.5]]],
      ["tr", [[0, 0, "tier"], [1, 0, "tier"], [2, 0, "rd"], [3, 0, "rd"], [4, 0, "rd"]]],
      ["rt", [[2, 0, "tier"], [3, 0, "tier"], [4, 0, "rd"]]],
    ];
    const M = T.layer(), cw = 36, cd = 24, gx = 8, gy = 8, x0 = 18, y0 = 16;
    rows.forEach(([d, cells], r) => {
      const y = y0 + r * (cd + gy);
      for (let yr = 0; yr < 5; yr++) M.add(T.top([[x0 + yr * (cw + gx), y], [x0 + yr * (cw + gx) + cw, y], [x0 + yr * (cw + gx) + cw, y + cd], [x0 + yr * (cw + gx), y + cd], [x0 + yr * (cw + gx), y]], 0, { tone: "faint" }), [x0 + yr * (cw + gx) + cw / 2, y + cd / 2, -1], -100);
      cells.forEach(([yr, v, kind]) => {
        const x = x0 + yr * (cw + gx);
        if (kind === "rd") M.add(T.slab(x + 3, y + 3, 0, cw - 6, cd - 6, 1.2, { r: 1.2, cls: "cv-ground-2", crease: "none" }), [x + cw / 2, y + cd / 2, 0]);
        else {
          const hgt = kind === "tier" ? 10 : 4 + v * 1.1;
          M.add(T.slab(x + 3, y + 3, 0, cw - 6, cd - 6, hgt, { r: 1.4, steps: 3, bevel: 0.6, cls: `cv-acc cv-${d}` }), [x + cw / 2, y + cd / 2, hgt / 2]);
        }
      });
    });
    return T.tile(TW, TD) + M.svg();
  },
};

// ── Build ────────────────────────────────────────────────────────────────────────────────────────────────────
const VIEW = { w: 720, h: 470 };
const fitPts = (ox = 0, oy = 0) => [[ox, oy, -8], [ox + TW, oy, -8], [ox, oy + TD, -8], [ox + TW, oy + TD, -8], [ox, oy, 70], [ox + TW, oy + TD, 30]];
const P0 = k.fitProjection(fitPts(), VIEW.w, VIEW.h, { pad: 10 });

function render(name, P, body, w, h, label) {
  return `<svg class="iso-svg cv-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}
const LABELS = {
  plant: "Isometric drawing of a loading dock: a factory, a flatbed truck loaded on slip sheets, a forklift and spare pallets",
  warehouse: "Isometric drawing of a warehouse floor: three rows of racks with cartons and a pick cart in the aisle",
  packing: "Isometric drawing of a packing bench: open boxes, a delivery bag going in, tape and a conveyor of sealed boxes",
  lastmile: "Isometric drawing of a street corner: a dispatch centre, houses and a delivery van on its route",
  returns: "Isometric drawing of returns: a sorting bench, four bins, and a plastic road being laid by a roller",
  plan: "Isometric chart of the five-year rollout: one row per solution, block height is the share switched over each year",
};
mkdirSync(join(OUT, "covers"), { recursive: true });
for (const [name, build] of Object.entries(SCENES)) {
  const T = toolsOf(P0);
  T.P = P0;
  const svg = render(name, P0, build(T), VIEW.w, VIEW.h, LABELS[name]);
  writeFileSync(join(OUT, "covers", `${name}.svg`), svg);
  console.log(name, Math.round(svg.length / 1024), "KB");
}

// The hero: the five chapter tiles along the floor diagonal (1, -1), which runs straight across the screen.
{
  const names = ["plant", "warehouse", "packing", "lastmile", "returns"], D = 236;
  const all = names.flatMap((_, i) => fitPts(i * D, -i * D));
  const W = 1400, H = 250;
  const P = k.fitProjection(all, W, H, { pad: 6 });
  const parts = [], marks = [];
  names.forEach((name, i) => {
    const ox = i * D, oy = -i * D;
    const shift = { ...P, origin: k.iso([ox, oy, 0], P), lod: true };
    const T = toolsOf(shift);
    T.P = shift;
    parts.push(`<g data-stop="${i + 1}">${SCENES[name](T)}</g>`);
    const c = k.iso([ox + TW / 2, oy + TD / 2, -8], P), low = k.iso([ox + TW, oy + TD, -8], P);
    marks.push([f2((c[0] / W) * 100), f2((low[1] / H) * 100)]);
  });
  writeFileSync(join(OUT, "covers", "journey.svg"), render("journey", P, parts.join(""), W, H, "The five chapters as five small isometric scenes in a row: loading dock, warehouse, packing bench, street corner and returns"));
  writeFileSync(join(OUT, "covers", "journey.json"), JSON.stringify(marks));
  console.log("journey", marks);
}

// Inks: the kit's tones on the page's paper, and tints for the one subject in each scene.
const css = `/* Generated by scripts/blue-yonder-covers.mjs from the Anatomy kit (MIT). Do not edit by hand. */
${k.ISO_CSS}
.by .iso{
  --anatomy-card:var(--panel);--anatomy-paper:#fbfbf9;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#d9d9d4;--anatomy-shade-1:#e3e3de;--anatomy-shade-2:#ecece8;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#f1f1ee;
  --anatomy-hi:#232322;--anatomy-mid:#85857f;--anatomy-lo:#b1b1ab;--anatomy-faint:#d1d1cb;--anatomy-lit:#111110;
  --anatomy-halo:#6f6f64;--anatomy-halo-opacity:.3;--anatomy-dot:#232322;--anatomy-weight:.6px;
  --cv-ink:#232322;--cv-mix:#ffffff;--cv-asphalt:#3b3b3d}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .by .iso{
  --anatomy-paper:#272725;--anatomy-face:#2f2f2c;--anatomy-top:#363632;
  --anatomy-shade-0:#1b1b1a;--anatomy-shade-1:#20201e;--anatomy-shade-2:#252523;--anatomy-shade-3:#2b2b28;
  --anatomy-lit-top:#41413c;--anatomy-lit-shade:#32322e;
  --anatomy-hi:#dcdcd6;--anatomy-mid:#7a7a74;--anatomy-lo:#50504c;--anatomy-faint:#3a3a37;--anatomy-lit:#ffffff;
  --anatomy-halo:#000;--anatomy-halo-opacity:.8;--anatomy-dot:#e4e4de;--cv-ink:#e4e4de;--cv-mix:#121212;--cv-asphalt:#000}
  :root:not([data-theme=light]) .by .iso .cv-ground{--a:.42}:root:not([data-theme=light]) .by .iso .cv-wall{--a:.3}}
:root[data-theme=dark] .by .iso{
  --anatomy-paper:#272725;--anatomy-face:#2f2f2c;--anatomy-top:#363632;
  --anatomy-shade-0:#1b1b1a;--anatomy-shade-1:#20201e;--anatomy-shade-2:#252523;--anatomy-shade-3:#2b2b28;
  --anatomy-lit-top:#41413c;--anatomy-lit-shade:#32322e;
  --anatomy-hi:#dcdcd6;--anatomy-mid:#7a7a74;--anatomy-lo:#50504c;--anatomy-faint:#3a3a37;--anatomy-lit:#ffffff;
  --anatomy-halo:#000;--anatomy-halo-opacity:.8;--anatomy-dot:#e4e4de;--cv-ink:#e4e4de;--cv-mix:#121212;--cv-asphalt:#000}
:root[data-theme=dark] .by .iso .cv-ground{--a:.42}:root[data-theme=dark] .by .iso .cv-wall{--a:.3}
.by .iso .cv-tint{--t:var(--cv-ink)}
.by .iso .cv-acc,.by .iso .cv-wall,.by .iso .cv-kraft,.by .iso .cv-wood,.by .iso .cv-leaf,.by .iso .cv-dark,.by .iso .cv-road,.by .iso .cv-gravel,.by .iso .cv-ground,.by .iso .cv-ground-2,.by .iso .cv-bag,.by .iso .cv-kraft-in,.by .iso .cv-tyre{
  --anatomy-paper:color-mix(in srgb,var(--t) calc(var(--a,1) * 40%),var(--cv-mix));
  --anatomy-top:color-mix(in srgb,var(--t) calc(var(--a,1) * 24%),var(--cv-mix));
  --anatomy-shade-3:color-mix(in srgb,var(--t) calc(var(--a,1) * 34%),var(--cv-mix));
  --anatomy-shade-2:color-mix(in srgb,var(--t) calc(var(--a,1) * 44%),var(--cv-mix));
  --anatomy-shade-1:color-mix(in srgb,var(--t) calc(var(--a,1) * 54%),var(--cv-mix));
  --anatomy-shade-0:color-mix(in srgb,var(--t) calc(var(--a,1) * 64%),var(--cv-mix));
  --anatomy-lit-top:color-mix(in srgb,var(--t) calc(var(--a,1) * 20%),var(--cv-mix));
  --anatomy-lit-shade:color-mix(in srgb,var(--t) calc(var(--a,1) * 36%),var(--cv-mix))}
.by .iso .cv-pk{--t:var(--pk)}.by .iso .cv-wh{--t:var(--wh)}.by .iso .cv-tr{--t:var(--tr)}.by .iso .cv-rt{--t:var(--rt)}
.by .iso .cv-kraft{--t:#b0844a;--a:1}.by .iso .cv-kraft-in{--t:#8a6332;--a:1.2}.by .iso .cv-wood{--t:#8f6a3e;--a:1.1}
.by .iso .cv-leaf{--t:#4f8a52;--a:1.1}.by .iso .cv-dark{--t:var(--cv-ink);--a:1.25}.by .iso .cv-tyre{--t:#0b0b0b;--a:1.5}
.by .iso .cv-road{--t:var(--cv-asphalt);--a:1.5}.by .iso .cv-gravel{--t:#9a8f80;--a:.9}.by .iso .cv-ground{--t:var(--cv-ink);--a:.12}
.by .iso .cv-ground-2{--t:var(--cv-ink);--a:.3}.by .iso .cv-wall{--t:var(--cv-ink);--a:.08}.by .iso .cv-in{--a:1.4}.by .iso .cv-bag{--t:#9aa1a8;--a:.6}
.by .iso .cv-acc .iso-edge,.by .iso .cv-kraft .iso-edge,.by .iso .cv-wood .iso-edge{stroke:color-mix(in srgb,var(--t) 70%,var(--cv-ink))}
.by .iso .cv-label{fill:var(--anatomy-face);stroke:none}
.by .iso .cv-glass{fill:color-mix(in srgb,var(--wh) 22%,var(--cv-mix));stroke:var(--anatomy-lo);stroke-width:.4}
.by .iso .cv-glass-s .iso-top,.by .iso .cv-glass-s .iso-fill{fill:color-mix(in srgb,var(--wh) 22%,var(--cv-mix))}
.by .iso .cv-door{fill:var(--anatomy-shade-1);stroke:var(--anatomy-lo);stroke-width:.4}
.by .iso .cv-grille{fill:var(--anatomy-shade-0);stroke:var(--anatomy-lo);stroke-width:.4}
.by .iso .cv-panel{fill:color-mix(in srgb,var(--cv-mix) 55%,transparent);stroke:none}
`;
writeFileSync(join(OUT, "covers.css"), css);
console.log("covers.css", Math.round(css.length / 1024), "KB");
