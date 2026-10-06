/**
 * Scroll-scrubbed film: real footage of each step of making coffee, pre-cut into numbered AVIF
 * frames (`<dir>/<set>/01.avif` …). Scroll picks the exact frame, and between steps the camera
 * moves the way a real one would, hiding each cut inside the motion:
 *   push         rushes forward into a point in the scene (radial motion blur), then lands in the
 *                next step still moving and settles
 *   down / up    a whip tilt, with vertical motion blur and a touch of camera roll
 *   left / right a whip pan, the same sideways
 * A soft exposure lift at the peak of each move and a gentle vignette finish the look. Motion
 * blur only exists during a move, so at rest the footage is pin-sharp.
 *
 * Rendering is one hand-written WebGL shader on a full-screen quad (no 3D library): frame
 * blending, blur and grading all happen on the GPU, and textures are uploaded only when the
 * frame changes. Without WebGL it falls back to a 2D canvas crossfade.
 *
 * Frame sets — the stage picks the smallest one that stays sharp on the visitor's screen:
 *   w1920  1920×1080  large / high-density landscape screens
 *   w1280  1280×720   smaller landscape screens
 *   t1920  1080×1920  portrait screens (608×1080 where the source is 1080p)
 *
 * Loading is driven by where the visitor is: only the frames just ahead of the current one, a
 * coarse pass of the film on screen, and the start of the next film once the current one is half
 * watched. Frames are fetched as compressed blobs and only a small window around the current
 * frame is decoded (off the main thread, via createImageBitmap), so memory stays low.
 */

export type FrameSet = "w1920" | "w1280" | "t1920";
/** `poster` is the frame shown before the film is ready (and loaded first). */
export type Film = { dir: string; count: number; poster?: number };
export type Move = "push" | "down" | "up" | "left" | "right";
export type Shot = { film: number; local: number };
/**
 * `a` is on screen; during a move `b` is coming in and `e` (0 → 1) is how far the move has gone.
 * `diveAt` / `landAt` are the screen points (0–1) a push rushes into and lands on.
 */
export type Scene = { a: Shot; b: Shot | null; e: number; move: Move; diveAt: [number, number]; landAt: [number, number] };

const FETCH_CONCURRENCY = 4;
/** Decoded frames (and their GPU textures) kept around the current position. */
const MAX_BITMAPS = 14;
const COARSE_STRIDE = 8;
/** Frames fetched ahead of / behind the current one. */
const AHEAD = 14;
const BEHIND = 4;
/** The slow push-in while a step plays. */
const DRIFT = 0.04;

export function frameUrl(film: Film, set: FrameSet, index: number): string {
  return `${film.dir}/${set}/${String(index + 1).padStart(2, "0")}.avif`;
}

export function createFilmStage(
  canvas: HTMLCanvasElement,
  films: Film[],
  options: { onFirstFrame?: () => void; onUnsupported?: () => void } = {},
) {
  const renderer = createGlRenderer(canvas) ?? create2dRenderer(canvas);
  if (!renderer) throw new Error("No canvas rendering context");

  let set: FrameSet = "w1280";
  let generation = 0;
  let blobs: (Blob | null)[][] = [];
  let requested = new Set<string>();
  let inflight = 0;
  const bitmaps = new Map<string, { bmp: ImageBitmap; film: number; index: number }>();
  const decoding = new Set<string>();
  let scene: Scene | null = null;
  /** Last frame shown per film, to tell which way the visitor is scrolling. */
  const lastAt = new Map<number, number>();
  /** Decoded frames waiting to go to the GPU, sent one per animation frame so scrolling never hitches. */
  let uploads: ImageBitmap[] = [];
  let uploadRaf = 0;
  let dirty = true;
  let raf = 0;
  let disposed = false;
  let announced = false;
  const controllers = new Set<AbortController>();

  const key = (fi: number, k: number) => `${fi}:${k}`;
  const indexOf = (s: Shot) => Math.floor(s.local * (films[s.film]!.count - 1));
  const shots = (): Shot[] => (scene ? (scene.b ? [scene.a, scene.b] : [scene.a]) : [{ film: 0, local: 0 }]);

  function pickSet(): FrameSet {
    if (canvas.clientWidth / Math.max(1, canvas.clientHeight) < 0.9) return "t1920";
    return canvas.width > 1350 ? "w1920" : "w1280";
  }

  function reset() {
    generation++;
    controllers.forEach((c) => c.abort());
    controllers.clear();
    bitmaps.forEach((b) => release(b.bmp));
    bitmaps.clear();
    decoding.clear();
    blobs = films.map((f) => Array.from({ length: f.count }, () => null));
    requested = new Set();
    inflight = 0;
    pump();
  }

  function release(bmp: ImageBitmap) {
    renderer!.forget(bmp);
    bmp.close();
  }

  /**
   * Download order for the current position: only what the visitor is about to see. Frames just
   * ahead (and a few behind), a coarse pass of the film on screen so a fast flick still lands on a
   * nearby frame, and the start of the next film once the current one is half watched.
   */
  function* wanted(): Generator<[number, number]> {
    const visible = shots();
    for (const s of visible) {
      const count = films[s.film]!.count;
      const at = indexOf(s);
      for (let d = 0; d <= AHEAD; d++) {
        if (at + d < count) yield [s.film, at + d];
        if (d && d <= BEHIND && at - d >= 0) yield [s.film, at - d];
      }
      for (let k = 0; k < count; k += COARSE_STRIDE) yield [s.film, k];
    }
    const focus = visible[visible.length - 1]!;
    const next = focus.film + 1;
    if (focus.local > 0.5 && next < films.length) {
      const film = films[next]!;
      yield [next, film.poster ?? 0];
      for (let k = 0; k <= AHEAD && k < film.count; k++) yield [next, k];
    }
  }

  function pump() {
    if (disposed) return;
    for (const [fi, k] of wanted()) {
      if (inflight >= FETCH_CONCURRENCY) break;
      const id = key(fi, k);
      if (requested.has(id)) continue;
      requested.add(id);
      fetchFrame(fi, k);
    }
  }

  function fetchFrame(fi: number, k: number) {
    const gen = generation;
    const controller = new AbortController();
    controllers.add(controller);
    inflight++;
    fetch(frameUrl(films[fi]!, set, k), { signal: controller.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((blob) => {
        controllers.delete(controller);
        if (gen !== generation || disposed) return;
        inflight--;
        if (blob) {
          blobs[fi]![k] = blob;
          if (shots().some((s) => s.film === fi) || (!announced && fi === 0)) decodeAround();
        }
        pump();
      });
  }

  /** Decode the frames each visible film needs next; drop decoded frames that are far away. */
  function decodeAround() {
    const targets = shots().map((s) => [s.film, indexOf(s)] as const);
    for (const [fi, at] of targets) {
      // The exact frame (or the nearest one downloaded so far), then its neighbours.
      const list = blobs[fi]!;
      for (let d = 0; d < list.length; d++) {
        if (list[at - d]) {
          decode(fi, at - d);
          break;
        }
        if (list[at + d]) {
          decode(fi, at + d);
          break;
        }
      }
      // Then the frames coming up next, in the direction the visitor is scrolling.
      const dir = at >= (lastAt.get(fi) ?? at) ? 1 : -1;
      lastAt.set(fi, at);
      for (const d of [1, 2, 3, 4, 5, -1]) if (list[at + d * dir]) decode(fi, at + d * dir);
    }
    if (bitmaps.size > MAX_BITMAPS) {
      const distance = (b: { film: number; index: number }) =>
        Math.min(...targets.map(([fi, at]) => (fi === b.film ? Math.abs(b.index - at) : 1000)));
      const far = [...bitmaps.entries()].sort((a, b) => distance(b[1]) - distance(a[1]));
      for (const [id, b] of far.slice(0, bitmaps.size - MAX_BITMAPS)) {
        release(b.bmp);
        bitmaps.delete(id);
      }
    }
  }

  function decode(fi: number, k: number) {
    const id = key(fi, k);
    const blob = blobs[fi]?.[k];
    if (!blob || bitmaps.has(id) || decoding.has(id)) return;
    decoding.add(id);
    const gen = generation;
    createImageBitmap(blob)
      .then((bmp) => {
        decoding.delete(id);
        if (gen !== generation || disposed) return bmp.close();
        bitmaps.set(id, { bmp, film: fi, index: k });
        uploads.push(bmp);
        if (!uploadRaf) uploadRaf = requestAnimationFrame(uploadNext);
        if (!announced && fi === 0) {
          announced = true;
          options.onFirstFrame?.();
        }
        invalidate();
      })
      .catch(() => {
        decoding.delete(id);
        // The browser can't decode AVIF: stop and leave the poster images in place.
        if (!announced && fi === 0) {
          disposed = true;
          options.onUnsupported?.();
        }
      });
  }

  /** The frame pair to show for a shot: nearest decoded frame, the next one, and the blend. */
  function frameOf(s: Shot): Face | null {
    const at = s.local * (films[s.film]!.count - 1);
    const lo = Math.floor(at);
    let best: ImageBitmap | null = null;
    let bestD = Infinity;
    for (const b of bitmaps.values()) {
      if (b.film !== s.film) continue;
      const d = Math.abs(b.index - lo);
      if (d < bestD) [best, bestD] = [b.bmp, d];
    }
    if (!best) return null;
    const hi = bitmaps.get(key(s.film, lo + 1))?.bmp ?? null;
    // Scroll lands between two frames: blend them, so motion reads as continuous.
    return { lo: best, hi: bestD === 0 ? hi : null, t: at - lo, drift: 1 + DRIFT * s.local };
  }

  function uploadNext() {
    uploadRaf = 0;
    if (disposed) return;
    // Skip frames that were dropped before their turn came.
    const live = new Set([...bitmaps.values()].map((b) => b.bmp));
    let bmp = uploads.shift();
    while (bmp && !live.has(bmp)) bmp = uploads.shift();
    if (bmp) renderer!.prepare(bmp);
    if (uploads.length) uploadRaf = requestAnimationFrame(uploadNext);
  }

  function draw() {
    raf = 0;
    if (!dirty || disposed || !scene) return;
    dirty = false;
    const a = frameOf(scene.a);
    const b = scene.b ? frameOf(scene.b) : null;
    renderer!.draw(a, b, scene);
  }

  function invalidate() {
    dirty = true;
    if (!raf && !disposed) raf = requestAnimationFrame(draw);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(canvas.clientWidth * dpr);
    const ch = Math.round(canvas.clientHeight * dpr);
    // Frames are at most 1920px; a backing store much larger than that only costs memory.
    const k = Math.min(1, 2560 / Math.max(cw, ch));
    canvas.width = Math.max(1, Math.round(cw * k));
    canvas.height = Math.max(1, Math.round(ch * k));
    renderer!.resize();
    const next = pickSet();
    if (next !== set || !blobs.length) {
      set = next;
      reset();
    }
    invalidate();
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    // The GPU dropped the context (driver reset, too many tabs): fall back to the posters.
    e.preventDefault();
    disposed = true;
    options.onUnsupported?.();
  });

  resize();

  return {
    /** Called from the scroll loop's animation frame: draws right away, in the same frame. */
    render(next: Scene) {
      scene = next;
      decodeAround();
      pump();
      cancelAnimationFrame(raf);
      raf = 0;
      dirty = true;
      draw();
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(uploadRaf);
      uploads = [];
      controllers.forEach((c) => c.abort());
      bitmaps.forEach((b) => release(b.bmp));
      bitmaps.clear();
      blobs = [];
      renderer!.dispose();
    },
  };
}

export type FilmStage = ReturnType<typeof createFilmStage>;

/* ------------------------------------------------------------------------------------------ */
/* Renderers                                                                                   */
/* ------------------------------------------------------------------------------------------ */

type Face = { lo: ImageBitmap; hi: ImageBitmap | null; t: number; drift: number };
type Renderer = {
  draw(a: Face | null, b: Face | null, scene: Scene): void;
  resize(): void;
  /** Send a frame to the GPU ahead of time. */
  prepare(bmp: ImageBitmap): void;
  forget(bmp: ImageBitmap): void;
  dispose(): void;
};

const VERTEX = `
attribute vec2 p;
varying vec2 v;
void main() {
  v = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/*
 * Each layer maps a screen point to its frame: zoom about a focus point, a shift and a small roll
 * (the camera), then "cover" fitting. Motion blur averages samples along the camera's motion —
 * towards the focus for a push (radial), along the travel for a whip. At rest the blur is 0 and
 * a pixel is one crisp sample (blended between neighbouring frames).
 */
const FRAGMENT = `
precision highp float;
varying vec2 v;
uniform vec2 screen;
uniform sampler2D a0;
uniform sampler2D a1;
uniform sampler2D b0;
uniform sampler2D b1;
uniform float ta;
uniform float tb;
uniform vec4 fitA;
uniform vec4 fitB;
uniform vec4 camA;
uniform vec4 camB;
uniform vec2 offA;
uniform vec2 offB;
uniform vec3 blurA;
uniform vec3 blurB;
uniform float mixB;
uniform float lift;

// cam = (zoom, roll, focus.x, focus.y)
vec2 place(vec2 p, vec4 cam, vec2 off) {
  vec2 q = cam.zw + (p - cam.zw) / cam.x + off;
  vec2 d = (q - 0.5) * screen;
  float c = cos(cam.y);
  float s = sin(cam.y);
  d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  return 0.5 + d / screen;
}

// blur = (amount, direction.x, direction.y); a zero direction means radial, towards the focus.
vec3 shade(sampler2D s0, sampler2D s1, float t, vec4 fit, vec4 cam, vec2 off, vec3 blur) {
  vec2 p = place(v, cam, off);
  if (blur.x < 0.0005) {
    vec2 uv = p * fit.xy + fit.zw;
    return mix(texture2D(s0, uv).rgb, texture2D(s1, uv).rgb, t);
  }
  vec2 streak = dot(blur.yz, blur.yz) > 0.0 ? blur.yz * blur.x : (cam.zw - p) * blur.x;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    float k = float(i) / 15.0 - 0.5;
    acc += texture2D(s0, (p + streak * k) * fit.xy + fit.zw).rgb;
  }
  return acc / 16.0;
}

void main() {
  vec3 col = shade(a0, a1, ta, fitA, camA, offA, blurA);
  if (mixB > 0.0) col = mix(col, shade(b0, b1, tb, fitB, camB, offB, blurB), mixB);
  // Exposure lift at the peak of a move, like a lens catching the light; warmest in the highlights.
  col += lift * vec3(0.22, 0.14, 0.06) * (0.35 + col);
  // A gentle vignette for depth.
  vec2 d = (v - 0.5) * vec2(1.0, 0.85);
  col *= 1.0 - 0.3 * smoothstep(0.3, 1.05, length(d) * 1.6);
  gl_FragColor = vec4(col, 1.0);
}`;

function createGlRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, powerPreference: "high-performance" });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? "shader");
    return sh;
  };
  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pLoc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(pLoc);
  gl.vertexAttribPointer(pLoc, 2, gl.FLOAT, false, 0, 0);
  const loc = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    screen: loc("screen"),
    ta: loc("ta"),
    tb: loc("tb"),
    fitA: loc("fitA"),
    fitB: loc("fitB"),
    camA: loc("camA"),
    camB: loc("camB"),
    offA: loc("offA"),
    offB: loc("offB"),
    blurA: loc("blurA"),
    blurB: loc("blurB"),
    mixB: loc("mixB"),
    lift: loc("lift"),
  };
  ["a0", "a1", "b0", "b1"].forEach((name, i) => gl.uniform1i(loc(name), i));

  // One texture per decoded frame, uploaded the first time it is drawn.
  const textures = new Map<ImageBitmap, WebGLTexture>();
  function texture(bmp: ImageBitmap): WebGLTexture {
    let tex = textures.get(bmp);
    if (tex) return tex;
    tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, bmp);
    textures.set(bmp, tex);
    return tex;
  }
  function bind(unit: number, bmp: ImageBitmap) {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texture(bmp));
  }

  /** "Cover" fit for a frame on this screen, as scale.xy + offset.xy in frame space. */
  function fit(f: Face): [number, number, number, number] {
    const screenAspect = canvas.width / canvas.height;
    const imgAspect = f.lo.width / f.lo.height;
    let sx = 1;
    let sy = 1;
    if (imgAspect > screenAspect) sx = screenAspect / imgAspect;
    else sy = imgAspect / screenAspect;
    return [sx, sy, (1 - sx) / 2, (1 - sy) / 2];
  }

  function layer(f: Face, c: LayerCam, units: [number, number], uniforms: { t: WebGLUniformLocation | null; fit: WebGLUniformLocation | null; cam: WebGLUniformLocation | null; off: WebGLUniformLocation | null; blur: WebGLUniformLocation | null }) {
    bind(units[0], f.lo);
    bind(units[1], f.hi ?? f.lo);
    gl!.uniform1f(uniforms.t, f.hi ? f.t : 0);
    gl!.uniform4f(uniforms.fit, ...fit(f));
    gl!.uniform4f(uniforms.cam, c.zoom * f.drift, c.roll, c.focus[0], c.focus[1]);
    gl!.uniform2f(uniforms.off, c.shift[0], c.shift[1]);
    gl!.uniform3f(uniforms.blur, c.blur, c.dir[0], c.dir[1]);
  }

  return {
    draw(a, b, scene) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (!a) {
        gl.clearColor(15 / 255, 12 / 255, 9 / 255, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        return;
      }
      const cam = camera(scene, canvas.width / canvas.height);
      gl.uniform2f(u.screen, canvas.width, canvas.height);
      layer(a, cam.a, [0, 1], { t: u.ta, fit: u.fitA, cam: u.camA, off: u.offA, blur: u.blurA });
      const showB = Boolean(b) && cam.mix > 0;
      if (b && showB) layer(b, cam.b, [2, 3], { t: u.tb, fit: u.fitB, cam: u.camB, off: u.offB, blur: u.blurB });
      gl.uniform1f(u.mixB, showB ? cam.mix : 0);
      gl.uniform1f(u.lift, cam.lift);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    resize() {},
    prepare(bmp) {
      texture(bmp);
    },
    forget(bmp) {
      const tex = textures.get(bmp);
      if (tex) gl.deleteTexture(tex);
      textures.delete(bmp);
    },
    dispose() {
      textures.forEach((tex) => gl.deleteTexture(tex));
      textures.clear();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

type LayerCam = { zoom: number; roll: number; focus: [number, number]; shift: [number, number]; blur: number; dir: [number, number] };

/**
 * The camera for both layers at a point in a move. The outgoing shot accelerates away (ease-in),
 * the incoming one arrives still moving and settles (ease-out), and the cut sits at the peak of
 * the motion where the blur is strongest, so the eye reads one continuous camera move.
 */
function camera(scene: Scene, aspect: number): { a: LayerCam; b: LayerCam; mix: number; lift: number } {
  const e = scene.e;
  const out = Math.min(1, e / 0.5);
  const arrive = Math.min(1, Math.max(0, (e - 0.5) / 0.5));
  const accel = out * out * out;
  const settle = Math.pow(1 - arrive, 3);
  const peak = Math.pow(Math.sin(Math.PI * e), 2);
  const rest: LayerCam = { zoom: 1, roll: 0, focus: [0.5, 0.5], shift: [0, 0], blur: 0, dir: [0, 0] };
  const mix = e <= 0 ? 0 : smoothstep(0.4, 0.6, e);
  const lift = 0.5 * peak;

  if (scene.move === "push") {
    return {
      a: { ...rest, zoom: 1 + 2.4 * accel, focus: scene.diveAt, blur: 0.45 * accel },
      b: { ...rest, zoom: 1 + 1.6 * settle, focus: scene.landAt, blur: 0.38 * settle },
      mix,
      lift,
    };
  }

  // Whips: the picture travels opposite to the camera (tilting down, the scene slides up).
  const vertical = scene.move === "down" || scene.move === "up";
  const sign = scene.move === "down" || scene.move === "right" ? 1 : -1;
  const dir: [number, number] = vertical ? [0, sign] : [sign, 0];
  const along = (k: number): [number, number] => (vertical ? [0, sign * k] : [sign * k, 0]);
  const travel = 0.24;
  const roll = (vertical ? 0.02 : 0.035) * sign;
  // Streak length in screen units; a wide screen needs a little less on a horizontal whip.
  const streak = vertical ? 0.18 : 0.18 / Math.max(1, aspect * 0.7);
  return {
    // A slight zoom-in hides the frame edge as the picture travels.
    a: { ...rest, zoom: 1 + 0.3 * accel, roll: roll * accel, shift: along(travel * accel), blur: streak * accel, dir },
    b: { ...rest, zoom: 1 + 0.3 * settle, roll: -roll * settle, shift: along(-travel * settle), blur: streak * settle, dir },
    mix,
    lift,
  };
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Without WebGL: a plain crossfade on a 2D canvas. */
function create2dRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  const paint = (img: ImageBitmap, scale: number, alpha: number) => {
    const w = canvas.width;
    const h = canvas.height;
    const s = Math.max(w / img.width, h / img.height) * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
  };
  const layer = (f: Face, alpha: number) => {
    paint(f.lo, f.drift, alpha);
    if (f.hi && f.t > 0.04) paint(f.hi, f.drift, alpha * f.t);
  };
  return {
    draw(a, b, scene) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#0f0c09";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (a) layer(a, 1);
      if (b && scene.e > 0) layer(b, scene.e);
    },
    resize() {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
    },
    prepare() {},
    forget() {},
    dispose() {},
  };
}
