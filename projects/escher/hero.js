(() => {
const AZIMUTH = 45;
const ELEVATION = 30;
const SHADES = 4;
const RADIANS = Math.PI / 180;
const UNIT = Math.sqrt(1.6);
function cameraOf({ scale, azimuth = AZIMUTH, elevation = ELEVATION }) {
    const a = azimuth * RADIANS;
    const e = elevation * RADIANS;
    return { sinA: Math.sin(a), cosA: Math.cos(a), sinE: Math.sin(e), cosE: Math.cos(e), k: scale * UNIT };
}
function iso([x, y, z], projection) {
    const { origin } = projection;
    const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
    return [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}
function towardViewer(projection) {
    const { sinA, cosA } = cameraOf(projection);
    return [cosA, sinA];
}
function depthOf([x, y, z], projection) {
    const { sinA, cosA, sinE, cosE } = cameraOf(projection);
    return (x * cosA + y * sinA) * cosE + z * sinE;
}
const tenth = (value) => {
    const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
    return text === "-0" ? "0" : text;
};
function pathOf(points, closed = false) {
    if (!points.length)
        return "";
    return points.map(([x, y], at) => `${at ? "L" : "M"}${tenth(x)} ${tenth(y)}`).join("") + (closed ? "Z" : "");
}
const joinPaths = (paths) => paths.filter(Boolean).join("");
function roundedPlan({ x, y, w, d, r }, steps = 8) {
    const radius = Math.max(0, Math.min(r, w / 2, d / 2));
    const corners = [
        [x + w - radius, y + radius, -90],
        [x + w - radius, y + d - radius, 0],
        [x + radius, y + d - radius, 90],
        [x + radius, y + radius, 180],
    ];
    const out = [];
    for (const [cx, cy, start] of corners) {
        const count = radius > 0 ? steps : 0;
        for (let step = 0; step <= count; step++) {
            const angle = (start + (count ? (90 * step) / count : 45)) * RADIANS;
            out.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
        }
    }
    return out;
}
function signedArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index];
        const [bx, by] = points[(index + 1) % points.length];
        area += ax * by - bx * ay;
    }
    return area / 2;
}
const oriented = (points) => (signedArea(points) < 0 ? [...points].reverse() : points);
function convexHull(points) {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3)
        return sorted;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const point of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0)
            lower.pop();
        lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index--) {
        const point = sorted[index];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0)
            upper.pop();
        upper.push(point);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function runsOf(flags, want) {
    const count = flags.length;
    const runs = [];
    const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
    if (start < 0)
        return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
    let run = null;
    for (let step = 0; step < count; step++) {
        const index = (start + step) % count;
        if (flags[index] === want) {
            if (!run)
                run = [index];
            run.push((index + 1) % count);
        }
        else if (run) {
            runs.push(run);
            run = null;
        }
    }
    if (run)
        runs.push(run);
    return runs;
}
function extrude(ring, z, height, projection, options = {}) {
    const convex = options.convex ?? true;
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const { sinA, cosA } = cameraOf(projection);
    const normals = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy) || 1;
        return (counter ? [dy / length, -dx / length] : [-dy / length, dx / length]);
    });
    const facing = normals.map(([nx, ny]) => nx * vx + ny * vy > 1e-9);
    const top = ring.map(([x, y]) => iso([x, y, z + height], projection));
    const bottom = ring.map(([x, y]) => iso([x, y, z], projection));
    const outline = [];
    const crease = [];
    for (const run of runsOf(facing, false))
        outline.push(pathOf(run.map((index) => top[index])));
    for (const run of runsOf(facing, true)) {
        crease.push(pathOf(run.map((index) => top[index])));
        if (height > 0)
            outline.push(pathOf(run.map((index) => bottom[index])));
    }
    if (height > 0) {
        for (let index = 0; index < count; index++) {
            if (facing[(index + count - 1) % count] !== facing[index])
                outline.push(pathOf([top[index], bottom[index]]));
        }
    }
    let fill;
    if (convex) {
        fill = pathOf(convexHull([...top, ...bottom]), true);
    }
    else {
        const parts = [pathOf(oriented(top), true), pathOf(oriented(bottom), true)];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const next = (index + 1) % count;
            parts.push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
        fill = parts.join("");
    }
    const buckets = Array.from({ length: SHADES }, () => []);
    if (height > 0) {
        const [lx, ly] = [-sinA, cosA];
        for (let index = 0; index < count; index++) {
            if (!facing[index])
                continue;
            const [nx, ny] = normals[index];
            const lit = (nx * lx + ny * ly + 1) / 2;
            const shade = Math.min(SHADES - 1, Math.max(0, Math.floor(lit * SHADES)));
            const next = (index + 1) % count;
            buckets[shade].push(pathOf(oriented([top[index], top[next], bottom[next], bottom[index]]), true));
        }
    }
    let bevel;
    if (options.bevel && options.bevel > 0) {
        const by = options.bevel;
        const inset = ring.map(([x, y], index) => {
            const [ax, ay] = normals[(index + count - 1) % count];
            const [bx, by2] = normals[index];
            const mx = ax + bx;
            const my = ay + by2;
            const length = Math.hypot(mx, my) || 1;
            return [x - (mx / length) * by, y - (my / length) * by];
        });
        const insetTop = inset.map(([x, y]) => iso([x, y, z + height], projection));
        bevel = runsOf(facing, true)
            .map((run) => pathOf([top[run[0]], ...run.slice(1, -1).map((index) => insetTop[index]), top[run[run.length - 1]]]))
            .join("");
    }
    return {
        fill,
        outline: outline.join(""),
        crease: crease.join(""),
        top: pathOf(oriented(top), true),
        shades: buckets.map((paths) => paths.join("")),
        bevel,
    };
}
const ringOf = (plan, steps = 8) => roundedPlan(plan, steps);
function slabOf(plan, z, height, projection, steps = 8, bevel = 0) {
    return extrude(ringOf(plan, steps), z, height, projection, { convex: true, bevel });
}
function circleRing(cx, cy, radius, steps = 40) {
    return Array.from({ length: steps }, (_, step) => {
        const angle = (step / steps) * Math.PI * 2;
        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}
function cylinder(cx, cy, radius, z, height, projection, steps = 32, bevel = 0) {
    return extrude(circleRing(cx, cy, radius, steps), z, height, projection, { convex: true, bevel });
}
const insetPlan = ({ x, y, w, d, r }, by) => ({ x: x + by, y: y + by, w: w - by * 2, d: d - by * 2, r: Math.max(0, r - by) });
function onTop(points, z, projection, closed = false) {
    return pathOf(points.map(([x, y]) => iso([x, y, z], projection)), closed);
}
const planOutline = (plan, z, projection, steps = 8) => onTop(ringOf(plan, steps), z, projection, true);
const lineOnTop = (from, to, z, projection) => onTop([from, to], z, projection);
const segment = (from, to, projection) => pathOf([iso(from, projection), iso(to, projection)]);
const rise = (at, from, to, projection) => segment([at[0], at[1], from], [at[0], at[1], to], projection);
const ring = (cx, cy, radius, z, projection, steps = 40) => onTop(circleRing(cx, cy, radius, steps), z, projection, true);
const pointsAt = (points, projection) => points.map((point) => iso(point, projection));
function dotGrid(x, y, columns, rows, gap, z, projection) {
    const dots = [];
    for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++)
            dots.push(iso([x + column * gap, y + row * gap, z], projection));
    }
    return dots;
}
function corners({ x, y, w, d }, inset = 0) {
    return [
        [x + inset, y + inset],
        [x + w - inset, y + inset],
        [x + inset, y + d - inset],
        [x + w - inset, y + d - inset],
    ];
}
function boxCorners({ x, y, w, d }, z0, z1) {
    const out = [];
    for (const px of [x, x + w])
        for (const py of [y, y + d])
            for (const z of [z0, z1])
                out.push([px, py, z]);
    return out;
}
function knurl(cx, cy, radius, z0, z1, count, projection, inset = 0.4) {
    const [vx, vy] = towardViewer(projection);
    const lines = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        if (nx * vx + ny * vy < 0.15)
            continue;
        lines.push(segment([cx + radius * nx, cy + radius * ny, z0 + inset], [cx + radius * nx, cy + radius * ny, z1 - inset], projection));
    }
    return lines.join("");
}
function sideArc(cx, cy, radius, z, projection, steps = 24) {
    const [vx, vy] = towardViewer(projection);
    const facing = Math.atan2(vy, vx);
    const points = [];
    for (let step = 0; step <= steps; step++) {
        const angle = facing - Math.PI / 2 + (step / steps) * Math.PI;
        points.push(iso([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle), z], projection));
    }
    return pathOf(points);
}
function ringSeam(ring, z, projection) {
    const count = ring.length;
    const counter = signedArea(ring) > 0;
    const [vx, vy] = towardViewer(projection);
    const facing = ring.map(([ax, ay], index) => {
        const [bx, by] = ring[(index + 1) % count];
        const dx = bx - ax;
        const dy = by - ay;
        const [nx, ny] = counter ? [dy, -dx] : [-dy, dx];
        return nx * vx + ny * vy > 1e-9;
    });
    return runsOf(facing, true).map((run) => pathOf(run.map((index) => iso([ring[index][0], ring[index][1], z], projection)))).join("");
}
const sideSeam = (plan, z, projection, steps = 8) => ringSeam(ringOf(plan, steps), z, projection);
function sideRing(center, radius, axis, projection, steps = 20) {
    const [px, py, pz] = center;
    const points = [];
    for (let step = 0; step < steps; step++) {
        const angle = (step / steps) * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        points.push(iso(axis === "x" ? [px, py + u, pz + v] : [px + u, py, pz + v], projection));
    }
    return pathOf(points, true);
}
function coil(from, to, center, radius, turns, axis, projection, perTurn = 16) {
    const count = Math.max(1, Math.round(turns * perTurn));
    const back = [];
    const front = [];
    let run = [];
    let near = null;
    for (let index = 0; index <= count; index++) {
        const share = index / count;
        const angle = share * turns * Math.PI * 2;
        const u = radius * Math.cos(angle);
        const v = radius * Math.sin(angle);
        const along = from + (to - from) * share;
        const point = axis === "x" ? [along, center[0] + u, center[1] + v] : [center[0] + u, along, center[1] + v];
        const normal = axis === "x" ? [0, Math.cos(angle), Math.sin(angle)] : [Math.cos(angle), 0, Math.sin(angle)];
        const facing = depthOf(normal, projection) > 0;
        const flat = iso(point, projection);
        if (near === null)
            near = facing;
        if (facing !== near) {
            run.push(flat);
            (near ? front : back).push(pathOf(run));
            run = [flat];
            near = facing;
            continue;
        }
        run.push(flat);
    }
    if (run.length > 1)
        (near ? front : back).push(pathOf(run));
    return { back: back.join(""), front: front.join("") };
}
function topTicks(from, to, step, every, edge, z, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, edge] : [edge, at];
        const b = axis === "x" ? [at, edge + length] : [edge + length, at];
        (big ? major : minor).push(lineOnTop(a, b, z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function sideTicks(from, to, step, every, face, top, lengths, projection, axis = "x") {
    const minor = [];
    const major = [];
    const first = Math.ceil(from / step) * step;
    for (let at = first, index = Math.round(first / step); at <= to + 1e-9; at += step, index++) {
        const big = index % every === 0;
        const length = big ? lengths[1] : lengths[0];
        const a = axis === "x" ? [at, face, top] : [face, at, top];
        const b = axis === "x" ? [at, face, top - length] : [face, at, top - length];
        (big ? major : minor).push(segment(a, b, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
function radialTicks(cx, cy, radius, count, every, z, lengths, projection, from = 0, span = Math.PI * 2) {
    const minor = [];
    const major = [];
    const closed = Math.abs(span - Math.PI * 2) < 1e-9;
    const steps = closed ? count : count + 1;
    for (let index = 0; index < steps; index++) {
        const angle = from + (index / count) * span;
        const big = index % every === 0;
        const inner = radius - (big ? lengths[1] : lengths[0]);
        const sx = Math.sin(angle);
        const sy = -Math.cos(angle);
        (big ? major : minor).push(lineOnTop([cx + sx * inner, cy + sy * inner], [cx + sx * radius, cy + sy * radius], z, projection));
    }
    return { minor: minor.join(""), major: major.join("") };
}
const haloOf = (plan, z, height, projection) => slabOf(plan, z, height, projection).fill;
function axisVector(projection, [dx, dy, dz]) {
    const origin = iso([0, 0, 0], projection);
    const moved = iso([dx, dy, dz], projection);
    return [moved[0] - origin[0], moved[1] - origin[1]];
}
const fine = (value) => Math.round(value * 100) / 100;
function translateAlong(projection, by) {
    const [x, y] = axisVector(projection, by);
    return `translate(${fine(x)} ${fine(y)})`;
}
const thousandth = (value) => Math.round(value * 1000) / 1000;
function axesAt(at, z, projection) {
    const origin = iso([at[0], at[1], z], projection);
    const along = (point) => {
        const [px, py] = iso(point, projection);
        return [px - origin[0], py - origin[1]];
    };
    return { origin, x: along([at[0] + 1, at[1], z]), y: along([at[0], at[1] + 1, z]), z: along([at[0], at[1], z + 1]) };
}
const matrixOf = (u, v, origin) => `matrix(${thousandth(u[0])} ${thousandth(u[1])} ${thousandth(v[0])} ${thousandth(v[1])} ${thousandth(origin[0])} ${thousandth(origin[1])})`;
function holdStill(element, [dx, dy]) {
    const text = dx || dy ? `translate(${-dx} ${-dy})` : "";
    element.querySelectorAll("[data-hold]").forEach((node) => (text ? node.setAttribute("transform", text) : node.removeAttribute("transform")));
}
function topMatrix(at, z, projection, along = "x") {
    const { origin, x, y } = axesAt(at, z, projection);
    return along === "x" ? matrixOf(x, y, origin) : matrixOf([-y[0], -y[1]], x, origin);
}
function sideMatrix(at, z, projection, face) {
    const { origin, x, y, z: up } = axesAt(at, z, projection);
    const down = [-up[0], -up[1]];
    return face === "left" ? matrixOf(x, down, origin) : matrixOf([-y[0], -y[1]], down, origin);
}
function screenRise(height, projection) {
    const { cosE, k } = cameraOf(projection);
    return height * cosE * k;
}
function fitProjection(points, width, height, { pad = 24, headroom = 0, azimuth = AZIMUTH, elevation = ELEVATION } = {}) {
    const unit = { origin: [0, 0], scale: 1, azimuth, elevation };
    const flat = points.map((point) => iso(point, unit));
    const xs = flat.map(([x]) => x);
    const ys = flat.map(([, y]) => y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const up = Math.min(...ys);
    const down = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (right - left), (height - pad * 2 - headroom) / (down - up));
    return {
        origin: [width / 2 - ((left + right) / 2) * scale, headroom + (height - headroom) / 2 - ((up + down) / 2) * scale],
        scale,
        azimuth,
        elevation,
    };
}
const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attrs = (pairs) => Object.entries(pairs)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => ` ${key}="${escape(String(value))}"`)
    .join("");
function solidSvg(paths, { tone = "hi", crease = "faint", halo = false, lit = false, flat = false, className, inner = "" } = {}) {
    const parts = [];
    if (halo)
        parts.push(`<path class="iso-halo" d="${paths.fill}"/>`);
    parts.push(`<path class="iso-fill" d="${paths.fill}"/>`);
    if (!flat) {
        paths.shades.forEach((d, shade) => {
            if (d)
                parts.push(`<path class="iso-shade" data-shade="${shade}" d="${d}"/>`);
        });
        parts.push(`<path class="iso-top" d="${paths.top}"/>`);
    }
    if (crease !== "none" && paths.crease)
        parts.push(`<path class="iso-line iso-crease" data-tone="${crease}" d="${paths.crease}"/>`);
    if (crease !== "none" && paths.bevel)
        parts.push(`<path class="iso-line iso-bevel" data-tone="${crease}" d="${paths.bevel}"/>`);
    if (inner)
        parts.push(inner);
    parts.push(`<path class="iso-line iso-edge" data-tone="${tone}" d="${paths.outline}"/>`);
    return `<g${attrs({ class: className ? `iso-solid ${className}` : "iso-solid", "data-lit": lit ? "" : undefined, "data-seamless": paths.seamless ? "" : undefined })}>${parts.join("")}</g>`;
}
function lineSvg(d, { tone = "lo", dotted = false, dashed = false, flow = false, className, free } = {}) {
    if (!d)
        return "";
    return `<path${attrs({
        class: className ? `iso-line ${className}` : "iso-line",
        "data-tone": tone,
        "data-free": free === true ? "" : free || undefined,
        "data-dotted": dotted ? "" : undefined,
        "data-dashed": dashed ? "" : undefined,
        "data-flow": flow ? "" : undefined,
        d,
    })}/>`;
}
function dotsSvg(points, { size = 0.5, tone = "mid", pulse = false } = {}) {
    const dots = points
        .map(([x, y, alpha], index) => `<circle cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"${alpha !== undefined && alpha < 1 ? ` fill-opacity="${Math.max(0, alpha).toFixed(2)}"` : ""}${pulse ? ` data-pulse="" style="--pulse-at:${(index * 137) % 1600}ms"` : ""}/>`)
        .join("");
    return `<g class="iso-dots" data-tone="${tone}">${dots}</g>`;
}
function fadedSvg(list, style = {}) {
    const groups = new Map();
    for (const entry of list) {
        const [d, alpha] = Array.isArray(entry) ? entry : [entry.d, entry.alpha];
        if (!d || !(alpha > 0.02))
            continue;
        const level = Math.min(1, Math.round(alpha * 20) / 20);
        groups.set(level, (groups.get(level) ?? "") + d);
    }
    return [...groups].map(([alpha, d]) => (alpha >= 1 ? lineSvg(d, style) : `<g opacity="${alpha.toFixed(2)}">${lineSvg(d, style)}</g>`)).join("");
}
function fadeLineSvg(points, { fade = [0, 0], tone = "lo", className, stops = 6 } = {}) {
    if (points.length < 2)
        return "";
    const ease = (t) => t * t * (3 - 2 * t);
    const hashOf = (text) => {
        let hash = 2166136261;
        for (let index = 0; index < text.length; index++)
            hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
        return (hash >>> 0).toString(36);
    };
    const lengths = [0];
    for (let index = 1; index < points.length; index++)
        lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]));
    const at = (length) => {
        let index = 1;
        while (index < points.length - 1 && lengths[index] < length)
            index++;
        const span = lengths[index] - lengths[index - 1] || 1;
        const t = Math.max(0, Math.min(1, (length - lengths[index - 1]) / span));
        return [points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t, points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t];
    };
    const pieceOf = (from, to) => [at(from), ...points.filter((_, index) => lengths[index] > from + 1e-6 && lengths[index] < to - 1e-6), at(to)];
    const total = lengths[lengths.length - 1];
    if (total < 1e-6)
        return "";
    let [start, end] = Array.isArray(fade) ? fade : [fade, fade];
    if (start + end > total) {
        const share = total / (start + end);
        start *= share;
        end *= share;
    }
    const paint = `var(--anatomy-${tone})`;
    const ramp = (piece, rising) => {
        const d = pathOf(piece);
        const [x1, y1] = piece[0];
        const [x2, y2] = piece[piece.length - 1];
        const id = `iso-fade-${hashOf(`${d}|${tone}|${rising}`)}`;
        const marks = Array.from({ length: stops + 1 }, (_, index) => {
            const t = index / stops;
            const alpha = ease(rising ? t : 1 - t);
            return `<stop offset="${t.toFixed(3)}" stop-opacity="${alpha.toFixed(3)}" style="stop-color:${paint}"/>`;
        }).join("");
        const gradient = `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${tenth(x1)}" y1="${tenth(y1)}" x2="${tenth(x2)}" y2="${tenth(y2)}">${marks}</linearGradient>`;
        return `<defs>${gradient}</defs><path${attrs({ class: className ? `iso-line ${className}` : "iso-line", "data-tone": tone, "data-free": rising ? "start" : "end", d, style: `stroke:url(#${id})` })}/>`;
    };
    const parts = [];
    if (start > 0.05)
        parts.push(ramp(pieceOf(0, start), true));
    if (total - end - start > 0.05)
        parts.push(lineSvg(pathOf(pieceOf(start, total - end)), { tone, className }));
    if (end > 0.05)
        parts.push(ramp(pieceOf(total - end, total), false));
    return `<g class="iso-fade">${parts.join("")}</g>`;
}
function wireSvg(from, to, { via = [], tone = "lo", dotted = false, dashed = false, flow = false, ends = "both", size = 1.2 } = {}) {
    const d = pathOf([from, ...via, to]);
    const end = ([x, y]) => `<circle class="iso-wire-end" cx="${tenth(x)}" cy="${tenth(y)}" r="${size}"/>`;
    return `<g class="iso-wire" data-tone="${tone}">${lineSvg(d, { tone, dotted, dashed, flow })}${ends === "both" || ends === "from" ? end(from) : ""}${ends === "both" || ends === "to" ? end(to) : ""}</g>`;
}
function faceTextSvg(transform, text, { size = 3, tone = "mid", anchor = "start" } = {}) {
    return `<text class="iso-face-text" data-tone="${tone}" transform="${transform}" font-size="${size}" text-anchor="${anchor}">${escape(text)}</text>`;
}
function groupSvg(children, extra = {}) {
    return `<g${attrs(extra)}>${Array.isArray(children) ? children.join("") : children}</g>`;
}
function figureSvg({ width, height, label, body, standalone = false, className }) {
    const style = standalone ? `<style>${ISO_CSS}</style>` : "";
    return `<svg${attrs({
        xmlns: "http://www.w3.org/2000/svg",
        class: `iso-svg${standalone ? " iso" : ""}${className ? ` ${className}` : ""}`,
        "data-theme": standalone || undefined,
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": label,
    })}>${style}${Array.isArray(body) ? body.join("") : body}</svg>`;
}
function swatchSvg(mark) {
    if (mark === "raised" || mark === "flat" || mark === "lit") {
        const body = mark === "flat" ? "M2 6.5 8 3.5 14 6.5 8 9.5Z" : "M2 4.5 8 1.5 14 4.5 14 6 8 9 2 6Z";
        const crease = mark === "flat" ? "" : `<path class="iso-swatch-crease" d="M2 4.5 8 7.5 14 4.5"/>`;
        return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="${body}"/>${crease}</svg>`;
    }
    return `<svg class="iso-swatch" data-mark="${mark}" viewBox="0 0 16 10" aria-hidden="true"><path d="M1.5 5h13"/></svg>`;
}
function plateHtml({ fig, title, hint, readout = "", keys = [], caption, body }) {
    const corner = (name, text, extra = "") => `<span class="iso-plate-corner" data-corner="${name}"${extra}>${escape(text)}</span>`;
    const legend = keys.length || caption
        ? `<figcaption class="iso-legend">${keys.length ? `<span class="iso-keys">${keys.map((key) => `<span class="iso-key">${swatchSvg(key.mark)}${escape(key.label)}</span>`).join("")}</span>` : ""}${caption ? `<span class="iso-caption">${escape(caption)}</span>` : ""}</figcaption>`
        : "";
    return `<figure class="iso-figure"><div class="iso-plate"><div class="iso-plate-corners" aria-hidden="true">${corner("fig", fig)}${title ? corner("title", title) : ""}${hint ? corner("hint", hint) : ""}${corner("readout", readout, " data-readout")}</div>${body}</div>${legend}</figure>`;
}
function pageHtml({ title, theme = "dark", body, script = "", width = 650 }) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title><style>${ISO_CSS}${PAGE_CSS.replace("__WIDTH__", String(width))}</style></head><body class="iso" data-theme="${theme}"><main class="iso-page">${body}</main>${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}</body></html>`;
}
const PAGE_CSS = `
*{box-sizing:border-box}
html{color-scheme:dark}
body[data-theme="light"]{color-scheme:light}
body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.iso-page{width:min(__WIDTH__px,100% - 32px);margin:64px auto 96px}
`;
const ISO_CSS = `
.iso{
  --anatomy-page:#0b0b0b;--anatomy-card:#131313;--anatomy-text:#a3a3a3;--anatomy-strong:#e6e6e6;--anatomy-muted:#6e6e6e;
  --anatomy-paper:#131313;--anatomy-face:#1b1b1b;--anatomy-top:#1c1c1c;
  --anatomy-shade-0:#0f0f0f;--anatomy-shade-1:#121212;--anatomy-shade-2:#151515;--anatomy-shade-3:#181818;
  --anatomy-lit-top:#262626;--anatomy-lit-shade:#1d1d1d;
  --anatomy-hi:#d4d4d4;--anatomy-mid:#6a6a6a;--anatomy-lo:#3e3e3e;--anatomy-faint:#2a2a2a;--anatomy-lit:#ffffff;
  --anatomy-halo:#050505;--anatomy-halo-opacity:.9;--anatomy-dot:#e6e6e6;
  --anatomy-red:#ff6b6b;--anatomy-green:#6be0a0;--anatomy-blue:#6b9bff;
  --anatomy-weight:.6px;--anatomy-ease:cubic-bezier(.32,.72,0,1);
  --anatomy-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --anatomy-lift:inset 0 1px 0 0 #ffffff0a,inset 0 0 0 1px #ffffff06,0 0 0 1px #00000026,0 1px 1px -.5px #00000014,0 3px 3px -1.5px #00000014,0 6px 6px -3px #00000014,0 12px 12px -6px #00000014;
}
.iso[data-theme="light"]{
  --anatomy-page:#f2f2ef;--anatomy-card:#fbfbfa;--anatomy-text:#57575a;--anatomy-strong:#18181a;--anatomy-muted:#8c8c90;
  --anatomy-paper:#fbfbfa;--anatomy-face:#ffffff;--anatomy-top:#ffffff;
  --anatomy-shade-0:#dcdcd9;--anatomy-shade-1:#e5e5e2;--anatomy-shade-2:#ededea;--anatomy-shade-3:#f4f4f1;
  --anatomy-lit-top:#ffffff;--anatomy-lit-shade:#eeeeeb;
  --anatomy-hi:#26262a;--anatomy-mid:#8a8a8f;--anatomy-lo:#b4b4b8;--anatomy-faint:#d4d4d6;--anatomy-lit:#000000;
  --anatomy-halo:#8a8a80;--anatomy-halo-opacity:.32;--anatomy-dot:#3a3a3e;
  --anatomy-red:#e5484d;--anatomy-green:#30a46c;--anatomy-blue:#3e63dd;
  --anatomy-lift:inset 0 1px 0 0 #ffffff,0 0 0 1px #0000000f,0 1px 1px -.5px #0000000a,0 3px 3px -1.5px #0000000a,0 6px 6px -3px #0000000a,0 12px 12px -6px #0000000a;
}
.iso-svg{display:block;width:100%;height:auto;overflow:visible}
.iso-svg path,.iso-svg circle{vector-effect:non-scaling-stroke}
.iso-fill{fill:var(--anatomy-paper);stroke:none}
.iso-solid[data-lit]>.iso-fill{fill:var(--anatomy-face)}
.iso-shade,.iso-top{stroke:none}
.iso-shade[data-shade="0"]{fill:var(--anatomy-shade-0)}
.iso-shade[data-shade="1"]{fill:var(--anatomy-shade-1)}
.iso-shade[data-shade="2"]{fill:var(--anatomy-shade-2)}
.iso-shade[data-shade="3"]{fill:var(--anatomy-shade-3)}
.iso-top{fill:var(--anatomy-top)}
.iso-solid[data-lit]>.iso-top{fill:var(--anatomy-lit-top)}
.iso-solid[data-lit]>.iso-shade{fill:var(--anatomy-lit-shade)}
.iso-solid[data-seamless]>.iso-shade,.iso-solid[data-seamless]>.iso-top{stroke-width:.4;stroke-linejoin:round}
.iso-solid[data-seamless]>.iso-shade[data-shade="0"]{stroke:var(--anatomy-shade-0)}
.iso-solid[data-seamless]>.iso-shade[data-shade="1"]{stroke:var(--anatomy-shade-1)}
.iso-solid[data-seamless]>.iso-shade[data-shade="2"]{stroke:var(--anatomy-shade-2)}
.iso-solid[data-seamless]>.iso-shade[data-shade="3"]{stroke:var(--anatomy-shade-3)}
.iso-solid[data-seamless]>.iso-top{stroke:var(--anatomy-top)}
.iso-solid[data-seamless][data-lit]>.iso-top{stroke:var(--anatomy-lit-top)}
.iso-solid[data-seamless][data-lit]>.iso-shade{stroke:var(--anatomy-lit-shade)}
.iso-solid[data-lit]>.iso-edge{stroke:var(--anatomy-lit)}
.iso-halo{fill:var(--anatomy-halo);stroke:none;filter:blur(9px);opacity:var(--anatomy-halo-opacity);transform:translateY(3px)}
.iso-line{fill:none;stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight);stroke-linecap:round;stroke-linejoin:round}
.iso-line[data-tone="hi"]{stroke:var(--anatomy-hi)}
.iso-line[data-tone="mid"]{stroke:var(--anatomy-mid)}
.iso-line[data-tone="lo"]{stroke:var(--anatomy-lo)}
.iso-line[data-tone="faint"]{stroke:var(--anatomy-faint)}
.iso-line[data-tone="lit"]{stroke:var(--anatomy-lit)}
.iso-line[data-tone="red"]{stroke:var(--anatomy-red)}
.iso-line[data-tone="green"]{stroke:var(--anatomy-green)}
.iso-line[data-tone="blue"]{stroke:var(--anatomy-blue)}
.iso-line[data-dotted]{stroke-dasharray:.01 3.5;stroke-width:1}
.iso-line[data-dashed]{stroke-dasharray:3 3}
.iso-line[data-flow]{stroke-dasharray:2 6}
.iso-wire-end{fill:var(--anatomy-paper);stroke:var(--anatomy-lo);stroke-width:var(--anatomy-weight)}
.iso-wire[data-tone="hi"] .iso-wire-end{stroke:var(--anatomy-hi)}
.iso-wire[data-tone="mid"] .iso-wire-end{stroke:var(--anatomy-mid)}
.iso-wire[data-tone="faint"] .iso-wire-end{stroke:var(--anatomy-faint)}
.iso-wire[data-tone="lit"] .iso-wire-end{stroke:var(--anatomy-lit)}
.iso-dots circle{fill:var(--anatomy-dot);stroke:none;opacity:.32}
.iso-dots[data-tone="hi"] circle{opacity:.85}
.iso-dots[data-tone="mid"] circle{opacity:.45}
.iso-dots[data-tone="lo"] circle{opacity:.22}
.iso-dots[data-tone="faint"] circle{opacity:.12}
.iso-face-text{fill:var(--anatomy-mid);font-family:var(--anatomy-mono);letter-spacing:.04em}
.iso-face-text[data-tone="hi"]{fill:var(--anatomy-hi)}
.iso-face-text[data-tone="lo"]{fill:var(--anatomy-lo)}
.iso-face-text[data-tone="faint"]{fill:var(--anatomy-faint)}
.tb-body{fill:var(--anatomy-shade-2);stroke:none}
.tb-shine{fill:var(--anatomy-top);stroke:none}
.tb-shade{fill:var(--anatomy-shade-0);stroke:none}
.tb-ring{fill:none;stroke:var(--anatomy-lo);stroke-width:.45;stroke-linecap:butt;stroke-linejoin:round}
.tb-ring[data-tone="mid"]{stroke:var(--anatomy-mid)}
.tb-ring[data-tone="faint"]{stroke:var(--anatomy-faint)}
.tb-ring[data-tone="hi"]{stroke:var(--anatomy-hi)}
@keyframes iso-flow{to{stroke-dashoffset:-32}}
@keyframes iso-pulse{0%,100%{opacity:.18}12%{opacity:1}40%{opacity:.18}}
.iso-line[data-flow]{animation:iso-flow 1600ms linear infinite}
.iso-dots circle[data-pulse]{animation:iso-pulse 1600ms steps(1,end) infinite;animation-delay:var(--pulse-at,0ms)}
.iso-figure{margin:32px 0 36px}
.iso-plate{position:relative;padding:52px 24px;border-radius:0;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);--anatomy-paper:var(--anatomy-card)}
.iso-plate-corners{position:absolute;inset:18px 20px;pointer-events:none}
.iso-plate-corner{position:absolute;color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10.5px;line-height:1;letter-spacing:.04em;white-space:nowrap}
.iso-plate-corner[data-corner="fig"]{top:0;left:0;color:var(--anatomy-text)}
.iso-plate-corner[data-corner="title"]{top:0;right:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="hint"]{bottom:0;left:0;text-transform:uppercase;letter-spacing:.1em}
.iso-plate-corner[data-corner="readout"]{right:0;bottom:0;color:var(--anatomy-text);font-variant-numeric:tabular-nums}
.iso-plate .iso-svg{margin:0 auto}
.iso-legend{display:grid;gap:8px;margin-top:12px;color:var(--anatomy-muted);font-size:13px;line-height:1.55}
.iso-keys{display:flex;flex-wrap:wrap;gap:6px 18px}
.iso-key{display:inline-flex;align-items:center;gap:7px}
.iso-swatch{width:16px;height:10px;flex:none;overflow:visible}
.iso-swatch path{fill:none;stroke:var(--anatomy-hi);stroke-width:1;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}
.iso-swatch[data-mark="raised"] path,.iso-swatch[data-mark="flat"] path{stroke:var(--anatomy-mid)}
.iso-swatch[data-mark="lit"] path{stroke:var(--anatomy-lit)}
.iso-swatch[data-mark="dim"] path{stroke:var(--anatomy-lo)}
.iso-swatch[data-mark="dotted"] path{stroke-dasharray:.01 3;stroke-width:1.4}
.iso-swatch[data-mark="dashed"] path{stroke-dasharray:3 2.5}
.iso-swatch[data-mark="red"] path{stroke:var(--anatomy-red)}
.iso-swatch[data-mark="green"] path{stroke:var(--anatomy-green)}
.iso-swatch[data-mark="blue"] path{stroke:var(--anatomy-blue)}
.iso-swatch-crease{stroke:var(--anatomy-lo)!important}
@media (max-width:560px){.iso-plate{padding:48px 12px 70px}.iso-plate-corner[data-corner="hint"]{bottom:18px}}
@media (prefers-reduced-motion:reduce){.iso-line[data-flow],.iso-dots circle[data-pulse]{animation:none}}
`;

const C = {"P":{"origin":[367.9652901581172,285.9080691773588],"scale":1.2685698026531484,"azimuth":60,"elevation":38},"AX":[1.3896485933660188,0.4939538144246285],"AY":[-0.8023139894588667,0.8555531031759642],"AZ":[0,-1.2644641029253876],"N":41,"BINS":[[46,-72],[70,-72],[94,-72],[118,-72],[142,-72],[166,-72],[190,-72],[46,-53],[70,-53],[94,-53],[118,-53],[142,-53],[166,-53],[190,-53],[46,-34],[70,-34],[94,-34],[118,-34],[142,-34],[166,-34],[190,-34],[46,-15],[70,-15],[94,-15],[118,-15],[142,-15],[166,-15],[190,-15],[46,4],[70,4],[94,4],[118,4],[142,4],[166,4],[190,4],[46,23],[70,23],[94,23],[118,23],[142,23],[166,23]],"COLS":7,"ROWS":6,"PUBLIC_INDEX":38,"PUB":[118,23],"PIVOT":5.6,"SWING":80,"KEY":{"x":-100,"y":-6,"z":18},"ZONES":{"delete":{"x":92,"y":13,"w":52,"d":47,"r":6},"account":{"x":35,"y":-81,"w":167,"d":142,"r":6},"private":{"x":108.5,"y":13.5,"w":19,"d":19,"r":9.5}},"TRAY_H":6,"CABLES":{"net":[[290.6,205],[293.5,206],[295.6,209.3],[295.6,215.1],[297.2,214.1],[323.7,185.9],[325.6,182.8],[326.1,178]],"read":[[273,223.8],[275.9,224.8],[278,228.1],[278,233.9],[279.4,235.1],[387.8,273.7],[391.8,273.3],[393.3,270.7],[393.7,264.7]],"write":[[264.9,232.3],[267.9,233.4],[269.9,236.6],[269.9,242.5],[271.3,243.7],[389.5,285.7],[393.8,285],[403,274.2],[403.5,268.1]]},"QUESTION":"Are any S3 buckets public?","FIX":"Lock it down","TAGS":{"server":[-75,-91,51],"device":[-162,-22,95],"aws":[50,-74,18],"estate":[-152,32,2],"key":[-100,-6,34],"pub":[118,23,19.4],"write":[-78,-6,2]}};
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
let step = -1, target = 0, local = 0, clock = 0, pin = -1, pinUntil = 0, armed = false, visible = false, frame = 0, prev = 0;
const promptEl = stage.querySelector('[data-type="prompt"]');
const promptText = promptEl ? promptEl.dataset.text : "";
const rowsOf = panes.map((p) => [...p.querySelectorAll(".es-calls li, .es-rows div, .es-code li")]);
// The scroll sets a target step; the bench plays every step on the way there, faster when it is behind.
function goTo(i) {
  if (i === step) return;
  step = i;
  clock = 0;
  chipsT.forEach((c, k) => { c.classList.toggle("on", k === i); c.classList.toggle("done", k < i); c.setAttribute("aria-selected", k === i); });
  panes.forEach((p, k) => { p.classList.toggle("on", k === i); p.toggleAttribute("inert", k !== i); });
  stage.dataset.step = i;
  run();
}
function bars() {
  const played = pin < 0 && target > step ? Math.min(1, clock / DUR[step]) : Math.max(0.04, pin >= 0 ? 0 : local);
  chipsT.forEach((c, k) => c.style.setProperty("--p", k < step ? 1 : k === step ? played.toFixed(3) : 0));
}
function update() {
  const r = story.getBoundingClientRect();
  const vh = innerHeight;
  const e = clamp(1 - r.top / (vh * 0.55));
  stage.style.setProperty("--e", e.toFixed(3));
  root.classList.toggle("cover-full", e > 0.97 && r.bottom > vh * 0.6);
  if (!armed && r.top < vh * 0.08) { armed = true; run(); }
  const span = story.offsetHeight - stage.offsetHeight;
  const p = clamp(-r.top / Math.max(1, span), 0, 0.9999);
  target = Math.floor(p * n);
  local = p * n - target;
  if (pin >= 0 && (target === pin || performance.now() > pinUntil)) pin = -1;
  if (pin < 0 && (step < 0 || target < step || still.matches)) goTo(target);
  bars();
  run();
  tags(shown, step);
}
// A chip jumps straight to its step; the steps the scroll passes on the way are not replayed.
chipsT.forEach((c, k) => c.addEventListener("click", () => {
  pin = k;
  pinUntil = performance.now() + 1500;
  goTo(k);
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
  const behind = pin >= 0 ? 0 : target - step;
  if (armed || step > 0) clock += dt * (behind > 0 ? Math.min(6, 2 + behind) : 1);
  if (behind > 0 && clock >= DUR[step] + 0.3) goTo(step + 1);
  bars();
  const time = !armed && step === 0 ? 0 : calm ? 99 : clock;
  const goal = sample(step, Math.min(time, DUR[step]));
  const f = calm ? 1 : 1 - Math.exp(-dt / 0.12);
  for (const key of KEYS) shown[key] += (goal[key] - shown[key]) * f;
  const settled = KEYS.every((key) => Math.abs(goal[key] - shown[key]) < 0.01);
  const st = statusAt(step, Math.min(time, DUR[step] + 1));
  draw(shown, st, step, time);
  screen(step, time, st);
  card(step, time);
  tags(shown, step);
  const busy = time < DUR[step] + 0.8 || !settled || behind > 0;
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
