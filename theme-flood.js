// Theme flood: the other theme as ink in a small stable-fluids solver, drawn
// through the same 8x8 Bayer dither as fluid.js. Near the toggle, the corner
// works like a diffuser: emitters just off-screen around the corner
// breathe soft ink-mist in from the edges, each on its own slow rhythm and
// strongest in the corner itself, so it wells up unevenly, billows out,
// sinks a little and thins out; the cursor stirs it just as it stirs the
// thumbnails. A click treats the space above the screen as a tank of ink:
// its floor crumbles from right to left and gravity pours the ink down
// over the page. The page's letters stand in the flow as they do in
// fluid.js: a soft repulsion field parts the ink around words and slows it
// through them, and the dither never sits on a glyph; each stroke flips
// whole, so text stays readable all the way through.
//
// The page is greyscale, so the other theme is almost exactly "invert, then
// lift by the dark background": white cells blended with `difference` invert
// the page, and a second copy of the cells in #121212 blended with
// `plus-lighter` lifts black to the dark theme's #121212 (and the inverted
// dark page back up to white). Once the ink has covered every cell, the
// real theme is swapped in on the same frame; the colours match.
//
// Both layers are drawn at one pixel per dither cell and scaled up with
// `image-rendering: pixelated`, so the cells stay crisp and the per-frame
// cost stays small even on large retina screens.
(() => {
  const LIFT = '#121212'; // --bg of the dark theme in style.css

  const layer = blend => {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = `position:fixed;left:0;top:0;z-index:12;pointer-events:none;image-rendering:pixelated;mix-blend-mode:${blend};visibility:hidden`;
    return c;
  };
  const canvas = layer('difference');
  const lift = layer(CSS.supports('mix-blend-mode', 'plus-lighter') ? 'plus-lighter' : 'screen');
  const liftCtx = lift.getContext('2d');

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl || !liftCtx) return;
  const half = gl.getExtension('OES_texture_half_float');
  const texType = half ? half.HALF_FLOAT_OES : gl.getExtension('OES_texture_float') ? gl.FLOAT : null;
  if (!texType) return;

  const config = {
    simRes: 256,             // fine enough that a single drop spans a few cells and can fall
    cell: 2,                 // CSS px per dither cell, as in fluid.js
    pressureIterations: 24,
    pressureDecay: 0.95,
    // gravity is the pull on inked fluid, texels per second squared: a
    // gentle sink for the mist, a pour for the flood.
    // repel is how hard letters push the flow away, drag how much they
    // slow what is already on them (per second).
    calm: { dissipation: 1.2, curl: 6, stir: 10, gravity: 90, repel: 4400, drag: 18 },
    // The pour: little damping, so the falling ink keeps accelerating.
    flood: { dissipation: 0.2, curl: 6, stir: 0, gravity: 1500, repel: 150000, drag: 60 },
    // Fixed emitters just off-screen along the top and right edges near the
    // corner. Only the soft tail of each reaches the screen, so the mist
    // flows in from the edges; each breathes on its own slow rhythm.
    mist: {
      ease: 0.5,             // s for the mist to fade in or out
      top: [16, 80, 150, 230], // CSS px from the corner along the top edge
      right: [16, 80],       // and down the right edge
      falloff: 140,          // CSS px: emitters weaken with distance from the corner
      offset: 20,            // CSS px past the edge
      radius: 46,            // CSS px
      ink: 2.6,              // ink per second per emitter at full breath
      push: 700,             // inward push, texels per second squared
      breath: [0.5, 1.3],    // rad/s range of the emitters' rhythms
      open: 320,             // CSS px around the corner where the edges let mist in
      decay: 0.5,            // ink lost per second: sets how far the mist reaches
      clearDecay: 1.3        // once the cursor has left
    },
    // On click: a tank of ink above the screen. Its floor cracks in chunks,
    // right to left, a little out of order: ink gushes through the cracks
    // under the tank's weight and curls down. A moment later each chunk
    // gives way, the top edge stops being a wall there, and gravity drains
    // the tank down over the page.
    pour: {
      span: 0.9,             // s for the crumbling to cross the screen
      chunk: 36,             // CSS px per chunk of the floor
      jitter: 0.18,          // s each chunk may give way early or late
      give: 0.15,            // s for a chunk to open fully
      band: 22,              // CSS px: depth of the spill under a breaking chunk
      ink: 30,               // ink per second spilling through an open chunk
      push: 1800,            // the weight of the tank behind it: downward shove under an open chunk
      breach: 1.2            // s after a chunk cracks until it gives way and the tank drains through
    },
    // Cursor stirring: gentle on hover, so reaching for the toggle doesn't
    // blow the mist away; as strong as the thumbnails during the pour, so
    // the falling ink can be pushed around.
    splatForce: { calm: 2400, flood: 8400 },
    splatRadius: 0.0012,
    floodLimit: 6            // s before the real theme is swapped in regardless
  };

  const vertex = `
    precision highp float;
    attribute vec2 aPos;
    uniform vec2 texel;
    varying vec2 uv, vL, vR, vT, vB;
    void main () {
      uv = aPos * 0.5 + 0.5;
      vL = uv - vec2(texel.x, 0.0);
      vR = uv + vec2(texel.x, 0.0);
      vT = uv + vec2(0.0, texel.y);
      vB = uv - vec2(0.0, texel.y);
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  const head = `
    precision highp float;
    varying vec2 uv, vL, vR, vT, vB;
    vec4 bilerp (sampler2D s, vec2 p, vec2 ts) {
      vec2 st = p / ts - 0.5;
      vec2 i = floor(st);
      vec2 f = fract(st);
      vec4 a = texture2D(s, (i + vec2(0.5, 0.5)) * ts);
      vec4 b = texture2D(s, (i + vec2(1.5, 0.5)) * ts);
      vec4 c = texture2D(s, (i + vec2(0.5, 1.5)) * ts);
      vec4 d = texture2D(s, (i + vec2(1.5, 1.5)) * ts);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }`;

  // How open the tank's floor is above column x at time t: chunk by chunk,
  // right to left across `span`, each a little early or late (hashed).
  const tankFloor = `
    uniform float time, span, chunk, jitter, give;
    float floorOpen (float x) {
      float c = floor(x / chunk);
      float h = fract(sin(c * 91.7 + 7.3) * 43758.5453);
      float delay = span * (1.0 - (c + 0.5) * chunk) + (h - 0.5) * jitter;
      return clamp((time - delay) / give, 0.0, 1.0) * (0.75 + 0.25 * h);
    }`;

  const shaders = {
    splat: `
      uniform sampler2D target;
      uniform float aspect, radius;
      uniform vec2 point, force;
      void main () {
        vec2 p = uv - point;
        p.x *= aspect;
        gl_FragColor = texture2D(target, uv) + vec4(force * exp(-dot(p, p) / radius), 0.0, 0.0);
      }`,
    curl: `
      uniform sampler2D velocity;
      void main () {
        float l = texture2D(velocity, vL).y;
        float r = texture2D(velocity, vR).y;
        float t = texture2D(velocity, vT).x;
        float b = texture2D(velocity, vB).x;
        gl_FragColor = vec4(0.5 * (r - l - t + b), 0.0, 0.0, 1.0);
      }`,
    vorticity: `
      uniform sampler2D velocity, curl;
      uniform float strength, dt;
      void main () {
        float l = texture2D(curl, vL).x;
        float r = texture2D(curl, vR).x;
        float t = texture2D(curl, vT).x;
        float b = texture2D(curl, vB).x;
        float c = texture2D(curl, uv).x;
        vec2 f = 0.5 * vec2(abs(t) - abs(b), abs(r) - abs(l));
        f = f / (length(f) + 0.0001) * strength * c;
        f.y *= -1.0;
        vec2 v = texture2D(velocity, uv).xy + f * dt;
        gl_FragColor = vec4(clamp(v, -4000.0, 4000.0), 0.0, 1.0);
      }`,
    // Divergence-free swirl from a slowly drifting stream function, only where ink is.
    stir: `
      uniform sampler2D velocity, ink;
      uniform vec2 inkTexel;
      uniform float aspect, time, strength, dt;
      float psi (vec2 p) {
        return sin(p.x * 7.0 + time * 0.6) * cos(p.y * 6.0 - time * 0.45)
             + 0.4 * sin(p.x * 13.0 - p.y * 11.0 + time * 0.8);
      }
      void main () {
        vec2 p = uv * vec2(aspect, 1.0);
        float e = 0.01;
        vec2 swirl = vec2(psi(p + vec2(0.0, e)) - psi(p - vec2(0.0, e)),
                          psi(p - vec2(e, 0.0)) - psi(p + vec2(e, 0.0))) / (2.0 * e);
        float wet = clamp(bilerp(ink, uv, inkTexel).r * 1.5, 0.0, 1.0);
        gl_FragColor = vec4(texture2D(velocity, uv).xy + swirl * strength * wet * dt, 0.0, 1.0);
      }`,
    // Letters push the flow down the slope of a blurred copy of the text, and
    // slow what is already on one, as in fluid.js.
    repel: `
      uniform sampler2D velocity, field;
      uniform vec2 fieldTexel;
      uniform float strength, drag, dt;
      float f (vec2 p) { return texture2D(field, p).a; } // coverage lives in alpha
      void main () {
        vec2 grad = vec2(f(uv + vec2(fieldTexel.x, 0.0)) - f(uv - vec2(fieldTexel.x, 0.0)),
                         f(uv + vec2(0.0, fieldTexel.y)) - f(uv - vec2(0.0, fieldTexel.y)));
        vec2 v = texture2D(velocity, uv).xy - grad * strength * dt;
        gl_FragColor = vec4(v * exp(-drag * f(uv) * dt), 0.0, 1.0);
      }`,
    // Ink is heavier than the page: inked fluid is pulled down (gl y is up).
    gravity: `
      uniform sampler2D velocity, ink;
      uniform vec2 inkTexel;
      uniform float strength, dt;
      void main () {
        float wet = clamp(bilerp(ink, uv, inkTexel).r, 0.0, 1.0);
        gl_FragColor = vec4(texture2D(velocity, uv).xy - vec2(0.0, strength * wet * dt), 0.0, 1.0);
      }`,
    // Top and right are walls; left and bottom are open, so displaced fluid
    // can leave.
    // Hover: top and right are walls; left and bottom are open, so displaced
    // fluid can leave. Pouring: while the floor only cracks, the same, so the
    // gushing ink recirculates and curls; once it gives way the left edge
    // becomes a wall too and the top opens wherever the floor is gone, so
    // the tank drains straight down and out the bottom.
    divergence: tankFloor + `
      uniform sampler2D velocity;
      uniform float pouring, walled;
      void main () {
        vec2 c = texture2D(velocity, uv).xy;
        bool topOpen = pouring > 0.5 && floorOpen(uv.x) > 0.5;
        float l = vL.x < 0.0 && walled > 0.5 ? -c.x : texture2D(velocity, vL).x;
        float r = vR.x > 1.0 ? -c.x : texture2D(velocity, vR).x;
        float t = vT.y > 1.0 ? (topOpen ? c.y : -c.y) : texture2D(velocity, vT).y;
        float b = texture2D(velocity, vB).y;
        gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
      }`,
    scale: `
      uniform sampler2D source;
      uniform float value;
      void main () { gl_FragColor = value * texture2D(source, uv); }`,
    // Open edges hold pressure at 0; walls mirror it.
    pressure: tankFloor + `
      uniform sampler2D pressure, divergence;
      uniform float pouring, walled;
      void main () {
        float p = texture2D(pressure, uv).x;
        float l = vL.x < 0.0 ? (walled > 0.5 ? p : 0.0) : texture2D(pressure, vL).x;
        float r = texture2D(pressure, vR).x;
        float t = vT.y > 1.0 && pouring > 0.5 && floorOpen(uv.x) > 0.5 ? 0.0 : texture2D(pressure, vT).x;
        float b = vB.y < 0.0 ? 0.0 : texture2D(pressure, vB).x;
        gl_FragColor = vec4((l + r + t + b - texture2D(divergence, uv).x) * 0.25, 0.0, 0.0, 1.0);
      }`,
    gradient: tankFloor + `
      uniform sampler2D pressure, velocity;
      uniform float pouring, walled;
      void main () {
        float p = texture2D(pressure, uv).x;
        float l = vL.x < 0.0 ? (walled > 0.5 ? p : 0.0) : texture2D(pressure, vL).x;
        float r = texture2D(pressure, vR).x;
        float t = vT.y > 1.0 && pouring > 0.5 && floorOpen(uv.x) > 0.5 ? 0.0 : texture2D(pressure, vT).x;
        float b = vB.y < 0.0 ? 0.0 : texture2D(pressure, vB).x;
        gl_FragColor = vec4(texture2D(velocity, uv).xy - vec2(r - l, t - b), 0.0, 1.0);
      }`,
    advect: tankFloor + `
      uniform sampler2D velocity, source;
      uniform vec2 texel, sourceTexel;
      uniform float dt, dissipation, sealed, aspect, open, tank;
      void main () {
        vec2 coord = uv - dt * bilerp(velocity, uv, texel).xy * texel;
        bool outside = coord.x < 0.0 || coord.y < 0.0 || coord.x > 1.0 || coord.y > 1.0;
        // Fluid drawn in from above an open floor comes out of the tank: ink.
        if (tank > 0.5 && coord.y > 1.0 && floorOpen(clamp(coord.x, 0.0, 1.0)) > 0.5) {
          gl_FragColor = vec4(1.2, 0.0, 0.0, 1.0);
          return;
        }
        // Otherwise off-screen counts as empty, or clamping smears the edge
        // row back in as a haze. Only around the corner, where the hover
        // emitters sit just past the edges, may mist flow in from outside.
        if (sealed > 0.5 && outside && length((uv - 1.0) * vec2(aspect, 1.0)) > open) {
          gl_FragColor = vec4(0.0);
          return;
        }
        gl_FragColor = bilerp(source, coord, sourceTexel) / (1.0 + dissipation * dt);
      }`,
    // Under an open chunk: ink spills in (mode 0) and is shoved down (mode 1).
    pour: tankFloor + `
      uniform sampler2D target;
      uniform float band, amount, mode, dt;
      void main () {
        vec4 v = texture2D(target, uv);
        float g = floorOpen(uv.x) * exp(-(1.0 - uv.y) / band);
        if (mode < 0.5) v.r = min(v.r + amount * g * dt, 1.2);
        else v.y -= amount * g * dt;
        gl_FragColor = v;
      }`,
    // Ink decays at `fade`.
    ink: `
      uniform sampler2D ink;
      uniform float fade, dt;
      void main () {
        float v = texture2D(ink, uv).r;
        v *= exp(-fade * dt);
        gl_FragColor = vec4(clamp(v, 0.0, 1.2), 0.0, 0.0, 1.0);
      }`,
    // One fragment per cell.
    display: `
      uniform sampler2D ink, glyphs;
      uniform vec2 resolution;
      float bayer2 (vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
      float bayer4 (vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float bayer8 (vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
      void main () {
        vec2 c = floor(gl_FragCoord.xy);
        vec2 p = (c + 0.5) / resolution;
        // wide ramp: thin tendrils still show, as sparse dither
        float level = smoothstep(0.1, 0.8, texture2D(ink, p).r);
        // Wrap to the 8x8 tile first: squaring raw cell coordinates loses
        // precision on tall screens and lit stray cells where there was no ink.
        float on = level > 0.0 ? step(bayer8(mod(c, 8.0)) + 0.5 / 64.0, level) : 0.0;
        // Never dithered on a letter: its strokes flip whole once the ink is half there.
        float letter = step(0.5, texture2D(glyphs, p).a);
        gl_FragColor = vec4(mix(on, step(0.5, level), letter));
      }`,
    probe: `
      uniform sampler2D ink;
      void main () { gl_FragColor = vec4(texture2D(ink, uv).r, 0.0, 0.0, 1.0); }`
  };

  function compile (type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const programs = {};
  try {
    const vs = compile(gl.VERTEX_SHADER, vertex);
    for (const [name, body] of Object.entries(shaders)) {
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, head + body));
      gl.bindAttribLocation(program, 0, 'aPos');
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      const uniforms = {};
      const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < count; i++) {
        const { name: uniform } = gl.getActiveUniform(program, i);
        uniforms[uniform] = gl.getUniformLocation(program, uniform);
      }
      programs[name] = { program, uniforms };
    }
  } catch (error) {
    console.warn('theme flood: shader setup failed', error);
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  function createFBO (w, h, type = texType) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    return { texture, fbo, w, h, ok, texel: [1 / w, 1 / h] };
  }
  function createDouble (w, h) {
    const pair = { read: createFBO(w, h), write: createFBO(w, h) };
    pair.swap = () => { [pair.read, pair.write] = [pair.write, pair.read]; };
    return pair;
  }

  let velocity, ink, pressure, divergenceFBO, curlFBO, probeFBO, aspect, cols = 0, rows = 0;
  const PROBE_W = 32, PROBE_H = 20;
  const probeData = new Uint8Array(PROBE_W * PROBE_H * 4);

  // One canvas pixel and one ink texel per dither cell. Returns 'same' when
  // nothing changed, 'new' after (re)allocating, '' on failure.
  function resize () {
    const w = Math.ceil(innerWidth / config.cell);
    const h = Math.ceil(innerHeight / config.cell);
    if (!w || !h) return '';
    if (w === cols && h === rows && velocity) return 'same';
    cols = w;
    rows = h;
    for (const c of [canvas, lift]) {
      c.width = w;
      c.height = h;
      c.style.width = `${w * config.cell}px`;
      c.style.height = `${h * config.cell}px`;
    }
    aspect = w / h;
    const sh = config.simRes, sw = Math.round(sh * aspect);
    velocity = createDouble(sw, sh);
    pressure = createDouble(sw, sh);
    divergenceFBO = createFBO(sw, sh);
    curlFBO = createFBO(sw, sh);
    ink = createDouble(w, h);
    probeFBO = createFBO(PROBE_W, PROBE_H, gl.UNSIGNED_BYTE);
    return velocity.read.ok && ink.read.ok && probeFBO.ok ? 'new' : '';
  }

  // Letters: the page's text redrawn glyph by glyph into a mask the size of
  // the canvas. `glyphs` (sharp, slightly thickened) keeps the dither off
  // the strokes; `field` (a blurred copy at a quarter size) is the
  // repulsion field. As in fluid.js.
  function maskTexture () {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return { texture };
  }
  const letters = {
    glyphs: maskTexture(),
    field: maskTexture(),
    canvas: document.createElement('canvas'),
    fieldCanvas: document.createElement('canvas'),
    dirty: true
  };

  function drawLetters (ctx) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.data.trim() && !node.parentElement.closest('script, style, [aria-hidden="true"]')
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const style = getComputedStyle(node.parentElement);
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const descent = ctx.measureText('g').fontBoundingBoxDescent || parseFloat(style.fontSize) * 0.22;
      const text = node.data;
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (!r.width || r.bottom < 0 || r.top > innerHeight) continue;
        ctx.strokeText(text[i], r.left, r.bottom - descent);
        ctx.fillText(text[i], r.left, r.bottom - descent);
      }
    }
  }

  function upload (target, source) {
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  }

  function updateLetters () {
    letters.dirty = false;
    const { canvas: mc, fieldCanvas: fc } = letters;
    mc.width = cols * config.cell;
    mc.height = rows * config.cell;
    const ctx = mc.getContext('2d');
    ctx.clearRect(0, 0, mc.width, mc.height);
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1; // a hair of margin around each stroke
    ctx.lineJoin = 'round';
    ctx.textBaseline = 'alphabetic';
    drawLetters(ctx);
    upload(letters.glyphs, mc);

    // Blur by halving twice, then a touch of filter blur.
    let src = mc;
    for (let i = 0; i < 2; i++) {
      const next = document.createElement('canvas');
      next.width = Math.max(1, Math.ceil(src.width / 2));
      next.height = Math.max(1, Math.ceil(src.height / 2));
      const c = next.getContext('2d');
      c.imageSmoothingEnabled = true;
      c.drawImage(src, 0, 0, next.width, next.height);
      src = next;
    }
    fc.width = src.width;
    fc.height = src.height;
    const fctx = fc.getContext('2d');
    fctx.filter = 'blur(0.75px)';
    fctx.drawImage(src, 0, 0);
    fctx.filter = 'none';
    upload(letters.field, fc);
  }

  const markLetters = () => { letters.dirty = true; };
  addEventListener('scroll', markLetters, { passive: true });
  addEventListener('resize', markLetters);
  if (document.fonts) document.fonts.ready.then(markLetters);

  let unit = 0;
  function use (name, texelOf) {
    const p = programs[name];
    gl.useProgram(p.program);
    if (p.uniforms.texel && texelOf) gl.uniform2fv(p.uniforms.texel, texelOf.texel);
    unit = 0;
    return p.uniforms;
  }
  function bind (location, target) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.uniform1i(location, unit++);
  }
  function draw (target) {
    if (target) {
      gl.viewport(0, 0, target.w, target.h);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    } else {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  // Add a gaussian to a field at uv (x, y): a push (fx, fy) in texels per
  // second for velocity, or an amount in fx for ink. radius is in
  // viewport-heights squared.
  function splat (target, x, y, fx, fy, radius) {
    const u = use('splat', target.read);
    bind(u.target, target.read);
    gl.uniform1f(u.aspect, aspect);
    gl.uniform1f(u.radius, radius);
    gl.uniform2f(u.point, x, y);
    gl.uniform2f(u.force, fx, fy);
    draw(target.write);
    target.swap();
  }

  // The hover mist: fixed emitters past the top and right edges, each with
  // its own rhythm, so the corner breathes unevenly but never flickers.
  const emitters = [];
  for (const edge of ['top', 'right']) {
    for (const along of config.mist[edge]) {
      const [lo, hi] = config.mist.breath;
      emitters.push({
        edge,
        along,
        weight: Math.exp(-along / config.mist.falloff), // strongest right in the corner
        rate: lo + Math.random() * (hi - lo),
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  function breathe (dt, strength, time) {
    const { offset, radius, ink: rate, push } = config.mist;
    const r = radius / innerHeight;
    for (const e of emitters) {
      // two slow sines: a soft, irregular breath between about 0.15 and 1
      const breath = 0.15 + 0.85 * (0.5 + 0.35 * Math.sin(time * e.rate + e.phase) + 0.15 * Math.sin(time * e.rate * 2.3 + e.phase * 1.7));
      const top = e.edge === 'top';
      const x = top ? 1 - e.along / innerWidth : 1 + offset / innerWidth;
      const y = top ? 1 + offset / innerHeight : 1 - e.along / innerHeight;
      const g = breath * strength * e.weight;
      splat(ink, x, y, rate * g * dt, 0, r * r);
      // inward from its edge, leaning a little away from the corner (gl y is up)
      const [dx, dy] = top ? [-0.35, -1] : [-1, -0.35];
      splat(velocity, x, y, dx * push * g * dt, dy * push * g * dt, r * r * 2);
    }
  }

  function tankUniforms (u, time) {
    const { span, chunk, jitter, give } = config.pour;
    gl.uniform1f(u.time, time);
    gl.uniform1f(u.span, span);
    gl.uniform1f(u.chunk, chunk / innerWidth);
    gl.uniform1f(u.jitter, jitter);
    gl.uniform1f(u.give, give);
  }

  // Under each breaking chunk: one pass spills the ink, one shoves it down.
  function spill (dt, time) {
    const { band, ink: amount, push } = config.pour;
    for (const [target, mode, value] of [[ink, 0, amount], [velocity, 1, push]]) {
      const u = use('pour', target.read);
      bind(u.target, target.read);
      tankUniforms(u, time);
      gl.uniform1f(u.band, band / innerHeight);
      gl.uniform1f(u.amount, value);
      gl.uniform1f(u.mode, mode);
      gl.uniform1f(u.dt, dt);
      draw(target.write);
      target.swap();
    }
  }

  // The cursor stirs the ink the way it stirs fluid.js: splats along its path.
  const strokes = [];
  let pointer = null;
  addEventListener('pointermove', event => {
    const x = event.clientX / innerWidth;
    const y = 1 - event.clientY / innerHeight;
    if (running && pointer) {
      const dx = x - pointer.x, dy = y - pointer.y;
      const dist = Math.hypot(dx * innerWidth / innerHeight, dy);
      if (dist > 0.0002) {
        const steps = Math.min(8, Math.ceil(dist / 0.012));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          strokes.push([pointer.x + dx * t, pointer.y + dy * t, dx / steps, dy / steps]);
        }
      }
    }
    pointer = { x, y };
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer = null; });

  function step (dt, s) {
    const sh = velocity.read.h, sw = velocity.read.w;
    let u = use('curl', velocity.read);
    bind(u.velocity, velocity.read);
    draw(curlFBO);

    u = use('vorticity', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.curl, curlFBO);
    gl.uniform1f(u.strength, s.feel.curl);
    gl.uniform1f(u.dt, dt);
    draw(velocity.write);
    velocity.swap();

    if (s.feel.stir) {
      u = use('stir', velocity.read);
      bind(u.velocity, velocity.read);
      bind(u.ink, ink.read);
      gl.uniform2fv(u.inkTexel, ink.read.texel);
      gl.uniform1f(u.aspect, aspect);
      gl.uniform1f(u.time, s.time);
      gl.uniform1f(u.strength, s.feel.stir);
      gl.uniform1f(u.dt, dt);
      draw(velocity.write);
      velocity.swap();
    }

    if (s.feel.gravity) {
      u = use('gravity', velocity.read);
      bind(u.velocity, velocity.read);
      bind(u.ink, ink.read);
      gl.uniform2fv(u.inkTexel, ink.read.texel);
      gl.uniform1f(u.strength, s.feel.gravity);
      gl.uniform1f(u.dt, dt);
      draw(velocity.write);
      velocity.swap();
    }

    u = use('repel', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.field, letters.field);
    gl.uniform2f(u.fieldTexel, 1 / letters.fieldCanvas.width, 1 / letters.fieldCanvas.height);
    gl.uniform1f(u.strength, s.feel.repel);
    gl.uniform1f(u.drag, s.feel.drag);
    gl.uniform1f(u.dt, dt);
    draw(velocity.write);
    velocity.swap();

    const pouring = s.pourTime >= 0 ? 1 : 0;
    // the top edge opens where the floor has given way, `breach` after it cracked
    const breached = s.pourTime - config.pour.breach;
    const walled = pouring && breached > 0 ? 1 : 0;
    u = use('divergence', velocity.read);
    bind(u.velocity, velocity.read);
    tankUniforms(u, breached);
    gl.uniform1f(u.pouring, pouring);
    gl.uniform1f(u.walled, walled);
    draw(divergenceFBO);

    u = use('scale', pressure.read);
    bind(u.source, pressure.read);
    gl.uniform1f(u.value, config.pressureDecay);
    draw(pressure.write);
    pressure.swap();

    for (let i = 0; i < config.pressureIterations; i++) {
      u = use('pressure', pressure.read);
      bind(u.divergence, divergenceFBO);
      bind(u.pressure, pressure.read);
      tankUniforms(u, breached);
      gl.uniform1f(u.pouring, pouring);
      gl.uniform1f(u.walled, walled);
      draw(pressure.write);
      pressure.swap();
    }

    u = use('gradient', velocity.read);
    bind(u.pressure, pressure.read);
    bind(u.velocity, velocity.read);
    tankUniforms(u, breached);
    gl.uniform1f(u.pouring, pouring);
    gl.uniform1f(u.walled, walled);
    draw(velocity.write);
    velocity.swap();

    u = use('advect', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.source, velocity.read);
    gl.uniform2fv(u.sourceTexel, velocity.read.texel);
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, s.feel.dissipation);
    gl.uniform1f(u.sealed, 0);
    gl.uniform1f(u.tank, 0);
    gl.uniform1f(u.aspect, aspect);
    gl.uniform1f(u.open, 0);
    draw(velocity.write);
    velocity.swap();

    u = use('advect', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.source, ink.read);
    gl.uniform2fv(u.sourceTexel, ink.read.texel);
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, 0);
    gl.uniform1f(u.sealed, 1);
    gl.uniform1f(u.tank, pouring);
    tankUniforms(u, breached);
    gl.uniform1f(u.aspect, aspect);
    gl.uniform1f(u.open, config.mist.open / innerHeight);
    draw(ink.write);
    ink.swap();

    u = use('ink', ink.read);
    bind(u.ink, ink.read);
    gl.uniform1f(u.fade, s.fade);
    gl.uniform1f(u.dt, dt);
    draw(ink.write);
    ink.swap();
  }

  function render () {
    const u = use('display');
    bind(u.ink, ink.read);
    bind(u.glyphs, letters.glyphs);
    gl.uniform2f(u.resolution, cols, rows);
    draw(null);
    // Same cells again, tinted, for the lift layer (copied while the GL frame is still current).
    liftCtx.globalCompositeOperation = 'copy';
    liftCtx.drawImage(canvas, 0, 0);
    liftCtx.globalCompositeOperation = 'source-in';
    liftCtx.fillStyle = LIFT;
    liftCtx.fillRect(0, 0, cols, rows);
  }

  // Coarse readback of the ink. It stalls the GPU a little, so it runs rarely.
  function probe () {
    const u = use('probe');
    bind(u.ink, ink.read);
    draw(probeFBO);
    gl.readPixels(0, 0, PROBE_W, PROBE_H, gl.RGBA, gl.UNSIGNED_BYTE, probeData);
    let min = 255, max = 0;
    for (let i = 0; i < probeData.length; i += 4) {
      min = Math.min(min, probeData[i]);
      max = Math.max(max, probeData[i]);
    }
    return { min: min / 255, max: max / 255 };
  }

  function clear () {
    for (const target of [velocity.read, velocity.write, pressure.read, pressure.write, ink.read, ink.write]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT);
    liftCtx.clearRect(0, 0, cols, rows);
  }

  const show = on => { canvas.style.visibility = lift.style.visibility = on ? 'visible' : 'hidden'; };

  // mode: idle -> ambient (the plume, intensity easing toward `near`) -> idle;
  // any -> flood -> idle.
  const state = { mode: 'idle', near: false, intensity: 0, time: 0, floodTime: 0, frames: 0, onCovered: null };
  let running = false, last = 0;

  function stop () {
    state.mode = 'idle';
    state.intensity = 0;
    running = false;
    strokes.length = 0;
    clear();
    show(false);
  }

  function frame (now) {
    if (state.mode === 'idle') { running = false; return; }
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (resize() !== 'same') {
      // A resize throws the fluid away: land on the end state instead of glitching.
      if (state.mode === 'flood') return finish();
      return stop();
    }
    state.time += dt;
    state.frames++;
    // Rebuilt before any pass binds textures: the upload rebinds the active unit.
    if (letters.dirty) updateLetters();

    while (strokes.length) {
      const [x, y, dx, dy] = strokes.shift();
      const force = state.mode === 'flood' ? config.splatForce.flood : config.splatForce.calm;
      splat(velocity, x, y, dx * force, dy * force, config.splatRadius * Math.max(aspect, 1));
    }

    const s = { fade: 0, pourTime: -1, feel: config.calm, time: state.time };
    if (state.mode === 'ambient') {
      const { ease, decay, clearDecay } = config.mist;
      // The plume fades in and out instead of switching.
      const target = state.near ? 1 : 0;
      state.intensity += (target - state.intensity) * (1 - Math.exp(-dt / (ease / 3)));
      if (state.intensity > 0.01) breathe(dt, state.intensity, state.time);
      s.fade = decay + (clearDecay - decay) * (1 - state.intensity);
    } else if (state.mode === 'flood') {
      state.floodTime += dt;
      const t = state.floodTime;
      spill(dt, t);
      s.pourTime = t;
      s.feel = config.flood;
    }

    step(dt, s);
    render();

    if (state.mode === 'flood' && state.frames % 8 === 0) {
      // every probed cell drawn solid (or, failing that, eventually)
      if (probe().min > 0.85 || state.floodTime > config.floodLimit) return finish();
    }
    // Below the display ramp nothing is drawn, so the loop can rest.
    if (state.mode === 'ambient' && !state.near && state.intensity < 0.02 &&
        state.frames % 10 === 0 && probe().max < 0.1) return stop();
    requestAnimationFrame(frame);
  }

  function start () {
    if (!canvas.isConnected) document.body.append(canvas, lift);
    if (!resize()) return false;
    letters.dirty = true; // the page may have changed since the last run
    show(true);
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
    return true;
  }

  // The ink covers every cell by now, and it already looks like the other
  // theme, so the real one is swapped in on the same frame.
  function finish () {
    const done = state.onCovered;
    state.onCovered = null;
    done();
    stop();
  }

  window.themeFlood = {
    // The cursor is near the toggle (or not). The plume fades in, or winds down and clears.
    peek (near) {
      state.near = near;
      if (state.mode === 'flood' || !near) return;
      if (state.mode === 'idle') {
        state.mode = 'ambient';
        start();
      }
    },
    // Flood the page from the corner, then call apply() once covered.
    flood (apply) {
      if (state.mode === 'flood') return; // already on its way
      state.mode = 'flood';
      state.floodTime = 0;
      state.frames = 0;
      state.onCovered = apply;
      if (!start()) {
        state.mode = 'idle';
        state.onCovered = null;
        apply();
      }
    }
  };
})();
