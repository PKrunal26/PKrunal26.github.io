// Dithered cursor fluid: a small stable-fluids solver whose dye is drawn
// through an 8x8 Bayer ordered dither. Dye RGB holds image ink (absorbance,
// so colours mix like ink on paper); dye A holds the grey cursor trail.
// The page's letters push the flow away (a soft repulsion field) and the
// trail never sits on a glyph. Hovering a link with data-fluid stamps that image into the dye
// on top of everything; it re-forms while hovered and swirls away after.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fluid';
  canvas.setAttribute('aria-hidden', 'true');
  // Above the page so image ink paints over everything; clicks pass through.
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:10;pointer-events:none';
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return canvas.remove();

  const half = gl.getExtension('OES_texture_half_float');
  const texType = half ? half.HALF_FLOAT_OES : gl.getExtension('OES_texture_float') ? gl.FLOAT : null;
  if (!texType) return canvas.remove();

  const config = {
    simRes: 128,
    velocityDissipation: 0.25,
    dyeDissipation: 1.1,
    pressureDecay: 0.8,
    pressureIterations: 20,
    curl: 22,
    splatRadius: 0.001,
    splatForce: 4200,
    trailLimit: 0.5, // max trail absorbance: about 40% grey
    repel: 2200, // how hard letters push the flow away
    cellSize: 2, // CSS px per dither cell; dye has one texel per cell
    idleMs: 6000,
    intent: { dwellMs: 180, maxSpeed: 0.35 }, // hover must settle before an image forms
    image: { width: 400, height: 250, offsetX: 28, offsetY: 20, formRate: 12, follow: 0.18 },
    dock: { height: 150, gap: 32 }, // docked previews: 240x150, this far right of the text
    // Touch: a press develops the image above the finger; a tap waits this
    // long for it to form before following the link.
    touch: { gap: 36, margin: 24, settleMs: 260, slop: 24, ripple: 0.05 }
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

  const shaders = {
    splat: `
      uniform sampler2D target;
      uniform float aspect, radius, limit;
      uniform vec2 point;
      uniform vec4 color;
      void main () {
        vec2 p = uv - point;
        p.x *= aspect;
        vec4 base = texture2D(target, uv);
        vec4 added = base + exp(-dot(p, p) / radius) * color;
        // never push past the limit, but never lighten what is already darker
        gl_FragColor = min(added, max(base, vec4(limit)));
      }`,
    stamp: `
      uniform sampler2D target, image;
      uniform vec4 rect;
      uniform float strength;
      void main () {
        vec4 dye = texture2D(target, uv);
        vec3 d = dye.rgb;
        vec2 p = (uv - rect.xy) / (rect.zw - rect.xy);
        if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) { gl_FragColor = dye; return; }
        vec4 img = texture2D(image, p);
        vec2 edge = min(p, 1.0 - p);
        float feather = smoothstep(0.0, 0.025, min(edge.x, edge.y * 1.6));
        vec3 absorb = -log(max(img.rgb, vec3(0.02)));
        gl_FragColor = vec4(mix(d, absorb, strength * img.a * feather), dye.a);
      }`,
    calm: `
      uniform sampler2D velocity, image;
      uniform vec4 rect;
      uniform float strength;
      void main () {
        vec2 v = texture2D(velocity, uv).xy;
        vec2 p = (uv - rect.xy) / (rect.zw - rect.xy);
        float inside = step(0.0, p.x) * step(0.0, p.y) * step(p.x, 1.0) * step(p.y, 1.0);
        float a = inside * texture2D(image, clamp(p, 0.0, 1.0)).a;
        gl_FragColor = vec4(v * (1.0 - strength * a), 0.0, 1.0);
      }`,
    repel: `
      uniform sampler2D velocity, field;
      uniform vec2 fieldTexel;
      uniform float strength, dt;
      float f (vec2 p) { return texture2D(field, p).a; } // coverage lives in alpha
      void main () {
        vec2 grad = vec2(f(uv + vec2(fieldTexel.x, 0.0)) - f(uv - vec2(fieldTexel.x, 0.0)),
                         f(uv + vec2(0.0, fieldTexel.y)) - f(uv - vec2(0.0, fieldTexel.y)));
        // push down the slope, away from letters; slow what is already on one
        vec2 v = texture2D(velocity, uv).xy - grad * strength * dt;
        gl_FragColor = vec4(v * (1.0 - 0.3 * f(uv)), 0.0, 1.0);
      }`,
    advect: `
      uniform sampler2D velocity, source, glyphs;
      uniform vec2 texel, sourceTexel;
      uniform float dt, dissipation;
      uniform vec4 block; // channels zeroed on letters
      void main () {
        vec2 coord = uv - dt * bilerp(velocity, uv, texel).xy * texel;
        float solid = texture2D(glyphs, uv).a;
        gl_FragColor = bilerp(source, coord, sourceTexel) / (1.0 + dissipation * dt) * (1.0 - block * solid);
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
        gl_FragColor = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
      }`,
    divergence: `
      uniform sampler2D velocity;
      void main () {
        vec2 c = texture2D(velocity, uv).xy;
        float l = vL.x < 0.0 ? -c.x : texture2D(velocity, vL).x;
        float r = vR.x > 1.0 ? -c.x : texture2D(velocity, vR).x;
        float t = vT.y > 1.0 ? -c.y : texture2D(velocity, vT).y;
        float b = vB.y < 0.0 ? -c.y : texture2D(velocity, vB).y;
        gl_FragColor = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
      }`,
    scale: `
      uniform sampler2D source;
      uniform float value;
      void main () { gl_FragColor = value * texture2D(source, uv); }`,
    pressure: `
      uniform sampler2D pressure, divergence;
      void main () {
        float l = texture2D(pressure, vL).x;
        float r = texture2D(pressure, vR).x;
        float t = texture2D(pressure, vT).x;
        float b = texture2D(pressure, vB).x;
        gl_FragColor = vec4((l + r + t + b - texture2D(divergence, uv).x) * 0.25, 0.0, 0.0, 1.0);
      }`,
    gradient: `
      uniform sampler2D pressure, velocity;
      void main () {
        float l = texture2D(pressure, vL).x;
        float r = texture2D(pressure, vR).x;
        float t = texture2D(pressure, vT).x;
        float b = texture2D(pressure, vB).x;
        gl_FragColor = vec4(texture2D(velocity, uv).xy - vec2(r - l, t - b), 0.0, 1.0);
      }`,
    display: `
      uniform sampler2D dye, glyphs;
      uniform vec2 dyeTexel, resolution;
      uniform float cell, dark;
      float bayer2 (vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
      float bayer4 (vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      float bayer8 (vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }
      void main () {
        vec2 c = floor(gl_FragCoord.xy / cell);
        vec2 p = (c + 0.5) * cell / resolution;
        vec4 d = max(bilerp(dye, p, dyeTexel), 0.0);
        float trail = d.a * (1.0 - texture2D(glyphs, p).a);
        float b = bayer8(c) + 0.5 / 64.0;
        if (dark < 0.5) {
          // light: ink absorbs on white paper
          vec3 ink = smoothstep(0.05, 1.0, 1.0 - exp(-(d.rgb + trail)));
          vec3 q = min(floor(ink * 3.0 + b) / 3.0, 1.0);
          float a = step(0.01, max(q.r, max(q.g, q.b)));
          gl_FragColor = vec4((1.0 - q) * a, a);
        } else {
          // dark: images keep their colours (white parts fall to the page),
          // the trail turns to light dots
          vec3 qi = min(floor(smoothstep(0.05, 1.0, 1.0 - exp(-d.rgb)) * 3.0 + b) / 3.0, 1.0);
          float qt = min(floor(smoothstep(0.05, 1.0, 1.0 - exp(-trail)) * 3.0 + b) / 3.0, 1.0);
          float ai = step(0.01, max(qi.r, max(qi.g, qi.b)));
          float a = max(ai, step(0.01, qt));
          vec3 col = mix(vec3(qt * 0.8), 1.0 - qi, ai);
          gl_FragColor = vec4(col * a, a);
        }
      }`
  };

  function compile (type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, vertex);
  const programs = {};
  try {
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
    console.warn('fluid: shader setup failed', error);
    return canvas.remove();
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  function createFBO (w, h) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, texType, null);
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

  function size (res) {
    const aspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const long = Math.round(res * (aspect < 1 ? 1 / aspect : aspect));
    return aspect >= 1 ? [long, res] : [res, long];
  }
  const maxTexture = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 2048);

  let velocity, dye, pressure, divergenceFBO, curlFBO, cell;

  function resize () {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(innerWidth * dpr);
    const h = Math.round(innerHeight * dpr);
    if (!w || !h) return false;
    if (canvas.width === w && canvas.height === h && velocity) return true;
    canvas.width = w;
    canvas.height = h;
    cell = Math.max(2, Math.round(config.cellSize * dpr));
    const [sw, sh] = size(config.simRes);
    const dw = Math.min(maxTexture, Math.ceil(w / cell));
    const dh = Math.min(maxTexture, Math.ceil(h / cell));
    velocity = createDouble(sw, sh);
    dye = createDouble(dw, dh);
    pressure = createDouble(sw, sh);
    divergenceFBO = createFBO(sw, sh);
    curlFBO = createFBO(sw, sh);
    if (!velocity.read.ok || !dye.read.ok) {
      removeEventListener('pointermove', onMove);
      canvas.remove();
      return false;
    }
    return true;
  }

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

  function splat (x, y, dx, dy, amount) {
    const aspect = canvas.width / canvas.height;
    let u = use('splat', velocity.read);
    bind(u.target, velocity.read);
    gl.uniform1f(u.aspect, aspect);
    gl.uniform2f(u.point, x, y);
    gl.uniform4f(u.color, dx, dy, 0, 0);
    gl.uniform1f(u.limit, 1e6);
    gl.uniform1f(u.radius, config.splatRadius * Math.max(aspect, 1));
    draw(velocity.write);
    velocity.swap();

    u = use('splat', dye.read);
    bind(u.target, dye.read);
    gl.uniform1f(u.aspect, aspect);
    gl.uniform2f(u.point, x, y);
    gl.uniform4f(u.color, 0, 0, 0, amount); // trail lives in dye alpha
    gl.uniform1f(u.limit, config.trailLimit);
    gl.uniform1f(u.radius, config.splatRadius * Math.max(aspect, 1));
    draw(dye.write);
    dye.swap();
  }

  const images = new Map();
  function loadImage (src) {
    if (images.has(src)) return images.get(src);
    const entry = { texture: null };
    images.set(src, entry);
    const img = new Image();
    img.onload = () => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      entry.texture = texture;
    };
    img.src = src;
    return entry;
  }

  // The hovered image sits beside the cursor (flipping sides near the edges)
  // and eases after it, so moving drags the picture through the ink. A link
  // with data-fluid-dock instead docks its image to the right of its entry,
  // top-aligned with it. Every docked entry shares one x, just past the
  // longest docked line, so the previews line up in a column.
  const hover = { entry: null, dock: null, touch: false, x: 0, y: 0, placed: false };

  function dockRect (article) {
    const { width, height } = config.image;
    const h = config.dock.height;
    const w = h * width / height;
    // right edge of the text itself (block boxes would report the full column)
    let textRight = 0;
    const range = document.createRange();
    for (const link of document.querySelectorAll('[data-fluid-dock]')) {
      const walker = document.createTreeWalker(link.closest('article') || link, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) textRight = Math.max(textRight, r.right);
      }
    }
    const x = textRight + config.dock.gap;
    if (x + w > innerWidth - 12) return null;
    return { x, y: article.getBoundingClientRect().top, w, h };
  }

  function stamp (dt) {
    const { entry } = hover;
    if (!entry || !entry.texture) return;
    const { offsetX, offsetY, formRate, follow } = config.image;
    let { width: iw, height: ih } = config.image;
    let tx, ty;
    const docked = !hover.touch && hover.dock && dockRect(hover.dock);
    if (hover.touch) {
      // Centred in the column, just above the finger so it stays in view;
      // below it when the finger is too near the top.
      const { gap, margin } = config.touch;
      iw = Math.min(iw, innerWidth - margin * 2);
      ih = iw * config.image.height / config.image.width;
      const my = (1 - pointer.y) * innerHeight;
      tx = (innerWidth - iw) / 2;
      ty = my - gap - ih;
      if (ty < 12) ty = my + gap;
    } else if (docked) {
      ({ x: tx, y: ty, w: iw, h: ih } = docked);
    } else {
      const mx = pointer.x * innerWidth;
      const my = (1 - pointer.y) * innerHeight;
      tx = mx + offsetX;
      ty = my + offsetY;
      if (tx + iw > innerWidth - 12) tx = mx - offsetX - iw;
      if (ty + ih > innerHeight - 12) ty = my - offsetY - ih;
    }
    hover.x = hover.placed ? hover.x + (tx - hover.x) * follow : tx;
    hover.y = hover.placed ? hover.y + (ty - hover.y) * follow : ty;
    hover.placed = true;

    const rect = [hover.x / innerWidth, 1 - (hover.y + ih) / innerHeight, (hover.x + iw) / innerWidth, 1 - hover.y / innerHeight];
    const strength = 1 - Math.exp(-formRate * dt);
    const pass = (name, target) => {
      const u = use(name, target.read);
      bind(name === 'stamp' ? u.target : u.velocity, target.read);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.uniform1i(u.image, unit++);
      gl.uniform4fv(u.rect, rect);
      gl.uniform1f(u.strength, strength);
      draw(target.write);
      target.swap();
    };
    // Still the water under the picture so it holds while hovered; the flow
    // only takes it once the hover ends.
    pass('calm', velocity);
    pass('stamp', dye);
  }

  function step (dt) {
    let u = use('curl', velocity.read);
    bind(u.velocity, velocity.read);
    draw(curlFBO);

    u = use('vorticity', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.curl, curlFBO);
    gl.uniform1f(u.strength, config.curl);
    gl.uniform1f(u.dt, dt);
    draw(velocity.write);
    velocity.swap();

    if (letters.dirty) updateLetters();

    u = use('repel', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.field, letters.field);
    gl.uniform2f(u.fieldTexel, 1 / letters.fieldCanvas.width, 1 / letters.fieldCanvas.height);
    gl.uniform1f(u.strength, config.repel);
    gl.uniform1f(u.dt, dt);
    draw(velocity.write);
    velocity.swap();

    u = use('divergence', velocity.read);
    bind(u.velocity, velocity.read);
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
      draw(pressure.write);
      pressure.swap();
    }

    u = use('gradient', velocity.read);
    bind(u.pressure, pressure.read);
    bind(u.velocity, velocity.read);
    draw(velocity.write);
    velocity.swap();

    u = use('advect', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.source, velocity.read);
    bind(u.glyphs, letters.glyphs);
    gl.uniform4f(u.block, 0, 0, 0, 0);
    gl.uniform2fv(u.sourceTexel, velocity.read.texel);
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, config.velocityDissipation);
    draw(velocity.write);
    velocity.swap();

    u = use('advect', velocity.read);
    bind(u.velocity, velocity.read);
    bind(u.source, dye.read);
    bind(u.glyphs, letters.glyphs);
    gl.uniform4f(u.block, 0, 0, 0, 1); // letters erase the trail, not image ink
    gl.uniform2fv(u.sourceTexel, dye.read.texel);
    gl.uniform1f(u.dt, dt);
    gl.uniform1f(u.dissipation, config.dyeDissipation);
    draw(dye.write);
    dye.swap();
  }

  // Letters: the page's text redrawn glyph by glyph into a viewport-sized
  // mask. `glyphs` (sharp, slightly thickened) erases trail ink on the strokes;
  // `field` (a blurred copy) is a repulsion field whose slope pushes the flow
  // away, so ink parts around words and slips between them.
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
    mc.width = Math.max(1, innerWidth);
    mc.height = Math.max(1, innerHeight);
    const ctx = mc.getContext('2d');
    ctx.clearRect(0, 0, mc.width, mc.height);
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1; // a hair of margin around each stroke
    ctx.lineJoin = 'round';
    ctx.textBaseline = 'alphabetic';
    drawLetters(ctx);
    upload(letters.glyphs, mc);

    // Blur by halving twice: smooth, no canvas filter support needed. The
    // field is 1/4 of the viewport, so the push stays close to each letter.
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

  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (document.documentElement.dataset.theme || (systemDark.matches ? 'dark' : 'light')) === 'dark';
  const rerender = () => { if (!running) render(); };
  new MutationObserver(rerender).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  systemDark.addEventListener('change', rerender);

  function render () {
    // Rebuild the letter mask before binding: its upload rebinds the active
    // texture unit, which would otherwise replace the dye with the mask.
    if (letters.dirty) updateLetters();
    const u = use('display');
    bind(u.dye, dye.read);
    gl.uniform2fv(u.dyeTexel, dye.read.texel);
    gl.uniform2f(u.resolution, canvas.width, canvas.height);
    gl.uniform1f(u.cell, cell);
    gl.uniform1f(u.dark, isDark() ? 1 : 0);
    bind(u.glyphs, letters.glyphs);
    draw(null);
  }

  const pointer = { x: 0, y: 0, has: false, speed: 0, time: 0 };
  const queue = [];
  let lastInput = 0;
  let lastFrame = 0;
  let running = false;

  // Interactive demos (data-fluid-quiet) get a faint trail, and none while something is being dragged.
  function quietness (event) {
    const target = event.target instanceof Element && event.target.closest('[data-fluid-quiet]');
    return !target ? 1 : event.buttons ? 0 : 0.1;
  }

  function onMove (event) {
    // Touch goes through the touch events below: pointer events stop as soon
    // as the page starts to scroll, touch events keep coming.
    if (event.pointerType === 'touch') return;
    move(event.clientX, event.clientY, event.timeStamp, quietness(event));
  }

  function move (clientX, clientY, time, quiet) {
    const x = clientX / innerWidth;
    const y = 1 - clientY / innerHeight;
    if (pointer.has && quiet) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const dist = Math.hypot(dx * innerWidth / innerHeight, dy);
      if (dist > 0.0002) {
        const steps = Math.min(8, Math.ceil(dist / 0.012));
        const amount = Math.min(0.3, 0.06 + dist * 4) * quiet;
        const force = config.splatForce * quiet;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          queue.push([pointer.x + dx * t, pointer.y + dy * t, dx * force / steps, dy * force / steps, amount / Math.sqrt(steps)]);
        }
      }
    }
    // smoothed cursor speed in CSS px per ms, for hover intent
    if (pointer.has && time > pointer.time) {
      const px = Math.hypot((x - pointer.x) * innerWidth, (y - pointer.y) * innerHeight);
      pointer.speed += (px / (time - pointer.time) - pointer.speed) * 0.5;
    }
    pointer.time = time;
    pointer.x = x;
    pointer.y = y;
    pointer.has = true;
    wake();
  }

  function wake () {
    if (document.documentElement.dataset.particles === 'off') {
      queue.length = 0;
      hover.entry = null;
      return;
    }
    lastInput = performance.now();
    if (running) return;
    running = true;
    lastFrame = lastInput;
    requestAnimationFrame(frame);
  }

  function frame (now) {
    const dt = Math.min((now - lastFrame) / 1000, 1 / 60);
    lastFrame = now;
    if (!resize()) { running = false; return; }
    while (queue.length) splat(...queue.shift());
    if (hover.entry) {
      stamp(dt);
      lastInput = now;
    }
    step(dt);
    render();
    if (now - lastInput < config.idleMs) requestAnimationFrame(frame);
    else running = false;
  }

  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerleave', () => { pointer.has = false; });
  document.addEventListener('mouseleave', () => { pointer.has = false; });
  addEventListener('resize', wake);

  // A finger stirs the water too, including while it scrolls the page. A
  // touch on open space drops a small ring into it.
  const touchQuiet = event => quietness({ target: event.target, buttons: 1 }); // a finger is always dragging
  addEventListener('touchstart', event => {
    const t = event.touches[0];
    if (!t || event.touches.length > 1) return;
    pointer.has = false;
    move(t.clientX, t.clientY, event.timeStamp, 0);
    if (touchQuiet(event) < 1 || (event.target instanceof Element && event.target.closest('a, button, input, label'))) return;
    const x = t.clientX / innerWidth;
    const y = 1 - t.clientY / innerHeight;
    const r = 6 / innerHeight;
    const force = config.splatForce * 0.004;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const dx = Math.cos(a) * innerHeight / innerWidth;
      const dy = Math.sin(a);
      queue.push([x + dx * r, y + dy * r, dx * force, dy * force, config.touch.ripple]);
    }
  }, { passive: true });
  addEventListener('touchmove', event => {
    const t = event.touches[0];
    if (t && event.touches.length === 1) move(t.clientX, t.clientY, event.timeStamp, touchQuiet(event));
  }, { passive: true });
  addEventListener('touchend', () => { pointer.has = false; }, { passive: true });
  addEventListener('touchcancel', () => { pointer.has = false; }, { passive: true });

  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    // Hover intent: only form the image once the cursor has rested on the
    // link and slowed down, so sweeping across titles stays quiet.
    let timer = 0;
    for (const link of document.querySelectorAll('a[data-fluid]')) {
      const entry = loadImage(link.dataset.fluid);
      const check = () => {
        const resting = performance.now() - pointer.time > 80;
        if (!resting && pointer.speed > config.intent.maxSpeed) {
          timer = setTimeout(check, 60);
          return;
        }
        hover.entry = entry;
        hover.dock = 'fluidDock' in link.dataset ? link.closest('article') : null;
        hover.touch = false;
        hover.placed = false;
        wake();
      };
      link.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        clearTimeout(timer);
        timer = setTimeout(check, config.intent.dwellMs);
      });
      link.addEventListener('pointerleave', event => {
        if (event.pointerType === 'touch') return;
        clearTimeout(timer);
        hover.entry = null;
      });
    }
  }

  // Touch has no hover, so the press stands in for it: the image starts to
  // develop above the finger as soon as it lands on a link. A tap lets it
  // finish forming, then follows the link; holding keeps it up as a preview.
  // Sliding off or scrolling lets the water take it, and swallows the click.
  let press = null;
  const release = () => {
    if (press && !press.going) { press.cancelled = true; hover.entry = null; }
  };
  for (const link of document.querySelectorAll('a[data-fluid]')) {
    const entry = loadImage(link.dataset.fluid);
    link.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      press = { link, start: event.timeStamp, x: event.clientX, y: event.clientY, going: false, cancelled: false };
      pointer.x = event.clientX / innerWidth;
      pointer.y = 1 - event.clientY / innerHeight;
      hover.entry = entry;
      hover.dock = null;
      hover.touch = true;
      hover.placed = false;
      wake();
    });
    link.addEventListener('pointermove', event => {
      if (press && press.link === link && event.pointerType === 'touch' &&
          Math.hypot(event.clientX - press.x, event.clientY - press.y) > config.touch.slop) release();
    });
    link.addEventListener('pointerup', event => {
      if (!press || press.link !== link || press.cancelled || event.pointerType !== 'touch') return;
      press.going = true;
      const wait = entry.texture ? Math.max(0, config.touch.settleMs - (event.timeStamp - press.start)) : 0;
      // A new-tab link leaves this page up, so let the water take the image back.
      // (The wait is short enough to stay inside the tap's user activation.)
      setTimeout(() => {
        if (link.target !== '_blank') { location.href = link.href; return; }
        open(link.href, '_blank', 'noopener');
        press = null;
        hover.entry = null;
      }, wait);
    });
    link.addEventListener('pointercancel', release);
    // The click that follows the tap is ours; keyboard clicks pass through.
    link.addEventListener('click', event => {
      if (event.detail && press && press.link === link && (press.going || press.cancelled)) event.preventDefault();
    });
    // Android opens a link menu on a long press; the preview replaces it.
    link.addEventListener('contextmenu', event => {
      if (press && press.link === link) event.preventDefault();
    });
  }
  // Coming back from the linked page (back/forward cache) starts clean.
  addEventListener('pageshow', event => {
    if (event.persisted) { press = null; hover.entry = null; }
  });
  if (resize()) render();
})();
