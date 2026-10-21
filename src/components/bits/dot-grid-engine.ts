/*
 * DotGrid — animation loop and WebGL2 lifecycle.
 * Uses the GLSL shaders and shared helpers split out into sibling modules.
 *
 * NOTE: the project enables `noUncheckedIndexedAccess`, so every read from
 * a Float32Array is `number | undefined`. We funnel all reads through a tiny
 * `at()` helper (defaulting to 0) so the simulation stays type-safe; writes
 * are unaffected.
 */
import { DOT_GRID_FRAGMENT, DOT_GRID_VERTEX } from "./dot-grid-shaders";
import {
  backOut,
  compileShader,
  smootherstep,
  toRgb,
  type DotGridHandle,
  type DotGridProps,
} from "./dot-grid-helpers";

type Shock = { x: number; y: number; start: number };
type ActiveShock = Shock & { front: number; amplitude: number };

// Safe typed-array read — `noUncheckedIndexedAccess` makes `a[i]` possibly
// undefined; default to 0 so arithmetic never propagates `undefined`.
const at = (a: ArrayLike<number>, i: number): number => a[i] ?? 0;

export function createEngine(
  canvas: HTMLCanvasElement,
  settingsRef: { current: DotGridProps },
): DotGridHandle {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (!gl) {
    // No WebGL2 — static fallback handled by the caller (nothing to draw).
    return { rebuild: () => {}, refresh: () => {}, destroy: () => {} };
  }

  const reduced = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  let program: WebGLProgram | null = null;
  try {
    program = gl.createProgram();
    if (!program) throw new Error("program");
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, DOT_GRID_VERTEX));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, DOT_GRID_FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("link");
    }
  } catch {
    return { rebuild: () => {}, refresh: () => {}, destroy: () => {} };
  }

  const uniforms: {
    uResolution: WebGLUniformLocation | null;
    uSize: WebGLUniformLocation | null;
    uSwell: WebGLUniformLocation | null;
    uStretch: WebGLUniformLocation | null;
    uGlow: WebGLUniformLocation | null;
    uBase: WebGLUniformLocation | null;
    uActive: WebGLUniformLocation | null;
    uOpacity: WebGLUniformLocation | null;
    uFade: WebGLUniformLocation | null;
    uShape: WebGLUniformLocation | null;
  } = {
    uResolution: gl.getUniformLocation(program, "uResolution"),
    uSize: gl.getUniformLocation(program, "uSize"),
    uSwell: gl.getUniformLocation(program, "uSwell"),
    uStretch: gl.getUniformLocation(program, "uStretch"),
    uGlow: gl.getUniformLocation(program, "uGlow"),
    uBase: gl.getUniformLocation(program, "uBase"),
    uActive: gl.getUniformLocation(program, "uActive"),
    uOpacity: gl.getUniformLocation(program, "uOpacity"),
    uFade: gl.getUniformLocation(program, "uFade"),
    uShape: gl.getUniformLocation(program, "uShape"),
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const cornerBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const instanceBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 24, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.bindVertexArray(null);

  const view = { width: 0, height: 0, left: 0, top: 0, ratio: 1 };
  const grid = {
    count: 0,
    cols: 1,
    rows: 1,
    cell: 1,
    centerX: 0,
    centerY: 0,
    reach: 1,
  };
  let rest = new Float32Array(0);
  let offset = new Float32Array(0);
  let velocity = new Float32Array(0);
  let force = new Float32Array(0);
  let next = new Float32Array(0);
  let wave = new Float32Array(0);
  let energy = new Float32Array(0);
  let instances = new Float32Array(0);
  const pointer = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    time: 0,
    inside: false,
    presence: 0,
  };
  const shocks: Shock[] = [];
  let introStart = settingsRef.current.intro && !reduced ? -1 : null;
  let visible = true;
  let raf = 0;
  let last = 0;

  const rebuild = () => {
    const { dotSize: size = 5, gap: spacing = 18 } = settingsRef.current;
    const cell = Math.max(2, size + spacing);
    const cols = Math.max(1, Math.floor((view.width + spacing) / cell));
    const rows = Math.max(1, Math.floor((view.height + spacing) / cell));
    const startX = (view.width - (cols * cell - spacing)) / 2 + size / 2;
    const startY = (view.height - (rows * cell - spacing)) / 2 + size / 2;
    const count = cols * rows;
    rest = new Float32Array(count * 2);
    offset = new Float32Array(count * 2);
    velocity = new Float32Array(count * 2);
    force = new Float32Array(count * 2);
    next = new Float32Array(count * 2);
    wave = new Float32Array(count * 4);
    energy = new Float32Array(count);
    instances = new Float32Array(count * 6);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = (row * cols + col) * 2;
        rest[index] = startX + col * cell;
        rest[index + 1] = startY + row * cell;
      }
    }
    Object.assign(grid, {
      count,
      cols,
      rows,
      cell,
      centerX: view.width / 2,
      centerY: view.height / 2,
      reach: Math.hypot(view.width, view.height) / 2,
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instances.byteLength, gl.DYNAMIC_DRAW);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(settingsRef.current.dpr ?? window.devicePixelRatio ?? 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    Object.assign(view, {
      width,
      height,
      left: rect.left,
      top: rect.top,
      ratio,
    });
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    rebuild();
    render(performance.now());
  };

  const step = (dt: number, now: number) => {
    const s = settingsRef.current;
    const motion = reduced ? 0 : 1;
    const zeta = 1 - 0.85 * Math.min(1, Math.max(0, s.bounce ?? 0.6));
    const omega = 4 / (zeta * Math.max(0.2, s.returnDuration ?? 0.8));
    const stiffness = omega * omega;
    const damping = 2 * zeta * omega;
    const radius = Math.max(1, s.proximity ?? 140);
    const speed = Math.hypot(pointer.vx, pointer.vy);
    const drive =
      s.mouseInteraction && pointer.inside && !reduced
        ? 6500 * Math.tanh(speed / 900) * (s.strength ?? 1) * motion
        : 0;
    const dirX = speed > 0.001 ? pointer.vx / speed : 0;
    const dirY = speed > 0.001 ? pointer.vy / speed : 0;
    const width = grid.cell * 1.4;
    const travel = 650;
    const active: ActiveShock[] = shocks.map((shock) => {
      const front = ((now - shock.start) / 1000) * travel;
      const power = smootherstep(1 - front / Math.max(1, s.shockRadius ?? 320));
      return {
        ...shock,
        front,
        amplitude: power * (s.shockStrength ?? 5) * grid.cell * 0.24 * motion,
      };
    });
    const coupling = Math.pow(Math.max(0, s.tension ?? 0.4) * 900, 2) / (grid.cell * grid.cell);
    const viscosity = Math.sqrt(coupling) * 0.06;
    const limit = Math.sqrt(stiffness + 8 * coupling) + damping + 8 * viscosity;
    const steps = Math.min(24, Math.max(1, Math.ceil(dt / Math.min(1 / 120, 1.2 / limit))));
    const h = dt / steps;
    for (let i = 0; i < grid.count; i++) {
      const index = i * 2;
      const rx = at(rest, index);
      const ry = at(rest, index + 1);
      let ax = 0;
      let ay = 0;
      if (drive > 0) {
        const ex = rx + at(offset, index) - pointer.x;
        const ey = ry + at(offset, index + 1) - pointer.y;
        const distance = Math.hypot(ex, ey);
        if (distance < radius) {
          const weight = smootherstep(1 - distance / radius) * drive;
          const nx = distance > 0.001 ? ex / distance : 0;
          const ny = distance > 0.001 ? ey / distance : 0;
          ax += weight * (dirX + nx * 0.6);
          ay += weight * (dirY + ny * 0.6);
        }
      }
      let wx = 0;
      let wy = 0;
      let wvx = 0;
      let wvy = 0;
      for (const shock of active) {
        if (shock.amplitude <= 0) continue;
        const ex = rx - shock.x;
        const ey = ry - shock.y;
        const distance = Math.hypot(ex, ey);
        const u = (distance - shock.front) / width;
        if (Math.abs(u) < 3 && distance > 0.001) {
          const nx = ex / distance;
          const ny = ey / distance;
          const profile = Math.exp(-u * u);
          const push = shock.amplitude * profile;
          const rate = ((shock.amplitude * 2 * u * profile) / width) * travel;
          wx += nx * push;
          wy += ny * push;
          wvx += nx * rate;
          wvy += ny * rate;
          ax += nx * push * stiffness * 0.35;
          ay += ny * push * stiffness * 0.35;
        }
      }
      force[index] = ax;
      force[index + 1] = ay;
      const target = i * 4;
      wave[target] = wx;
      wave[target + 1] = wy;
      wave[target + 2] = wvx;
      wave[target + 3] = wvy;
    }
    const { cols, rows } = grid;
    const stride = cols * 2;
    for (let n = 0; n < steps; n++) {
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const index = (row * cols + col) * 2;
          let ax = at(force, index) - stiffness * at(offset, index) - damping * at(velocity, index);
          let ay =
            at(force, index + 1) -
            stiffness * at(offset, index + 1) -
            damping * at(velocity, index + 1);
          if (coupling > 0) {
            let lx = -4 * at(offset, index);
            let ly = -4 * at(offset, index + 1);
            let mx = -4 * at(velocity, index);
            let my = -4 * at(velocity, index + 1);
            if (col > 0) {
              lx += at(offset, index - 2);
              ly += at(offset, index - 1);
              mx += at(velocity, index - 2);
              my += at(velocity, index - 1);
            }
            if (col < cols - 1) {
              lx += at(offset, index + 2);
              ly += at(offset, index + 3);
              mx += at(velocity, index + 2);
              my += at(velocity, index + 3);
            }
            if (row > 0) {
              lx += at(offset, index - stride);
              ly += at(offset, index - stride + 1);
              mx += at(velocity, index - stride);
              my += at(velocity, index - stride + 1);
            }
            if (row < rows - 1) {
              lx += at(offset, index + stride);
              ly += at(offset, index + stride + 1);
              mx += at(velocity, index + stride);
              my += at(velocity, index + stride + 1);
            }
            ax += coupling * lx + viscosity * mx;
            ay += coupling * ly + viscosity * my;
          }
          next[index] = at(velocity, index) + ax * h;
          next[index + 1] = at(velocity, index + 1) + ay * h;
        }
      }
      for (let i = 0; i < offset.length; i++) {
        velocity[i] = at(next, i);
        offset[i] = at(offset, i) + at(velocity, i) * h;
      }
    }
    for (let i = 0; i < grid.count; i++) {
      const index = i * 2;
      const target = i * 4;
      energy[i] = Math.min(
        1,
        (Math.hypot(
          at(velocity, index) + at(wave, target + 2),
          at(velocity, index + 1) + at(wave, target + 3),
        ) /
          380) *
          0.85 +
          (Math.hypot(
            at(offset, index) + at(wave, target),
            at(offset, index + 1) + at(wave, target + 1),
          ) /
            (grid.cell * 2.2)) *
            0.35,
      );
    }
    for (let i = shocks.length - 1; i >= 0; i--) {
      if ((active[i]?.front ?? 0) > (s.shockRadius ?? 320) + width * 3) shocks.splice(i, 1);
    }
    const decay = 1 - Math.exp(-dt / 0.08);
    pointer.vx -= pointer.vx * decay;
    pointer.vy -= pointer.vy * decay;
    const presenceTarget = s.mouseInteraction && pointer.inside && !reduced ? 1 : 0;
    pointer.presence += (presenceTarget - pointer.presence) * (1 - Math.exp(-dt / 0.2));
  };

  const render = (now: number) => {
    const s = settingsRef.current;
    const radius = Math.max(1, s.proximity ?? 140);
    const introAge =
      introStart === null ? Infinity : introStart < 0 ? 0 : (now - introStart) / 1000;
    const introFront = introAge * grid.reach * 1.25;
    const introBand = grid.cell * 4;
    for (let i = 0; i < grid.count; i++) {
      const index = i * 2;
      const source = i * 4;
      const x = at(rest, index) + at(offset, index) + at(wave, source);
      const y = at(rest, index + 1) + at(offset, index + 1) + at(wave, source + 1);
      let glowing = at(energy, i);
      if (pointer.presence > 0.001) {
        const distance = Math.hypot(x - pointer.x, y - pointer.y);
        if (distance < radius)
          glowing = Math.max(glowing, smootherstep(1 - distance / radius) * 0.4 * pointer.presence);
      }
      let scale = 1;
      if (introStart !== null) {
        const distance = Math.hypot(
          at(rest, index) - grid.centerX,
          at(rest, index + 1) - grid.centerY,
        );
        const appear = Math.min(1, Math.max(0, (introFront - distance) / introBand));
        scale = appear >= 1 ? 1 : Math.max(0, backOut(appear));
        glowing = Math.max(glowing, Math.sin(appear * Math.PI) * 0.6);
      }
      const target = i * 6;
      instances[target] = x;
      instances[target + 1] = y;
      instances[target + 2] = at(velocity, index) + at(wave, source + 2);
      instances[target + 3] = at(velocity, index + 1) + at(wave, source + 3);
      instances[target + 4] = glowing;
      instances[target + 5] = scale;
    }
    const base = toRgb(s.baseColor ?? "#3a3446");
    const accent = toRgb(s.activeColor ?? "#ffffff");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, view.width, view.height);
    gl.uniform1f(uniforms.uSize, Math.max(0.5, s.dotSize ?? 5));
    gl.uniform1f(uniforms.uSwell, reduced ? 0 : Math.max(0, s.swell ?? 0.8));
    gl.uniform1f(uniforms.uStretch, reduced ? 0 : Math.max(0, s.stretch ?? 0.5));
    gl.uniform1f(uniforms.uGlow, Math.max(0, s.glow ?? 0.5));
    gl.uniform3f(uniforms.uBase, base[0], base[1], base[2]);
    gl.uniform3f(uniforms.uActive, accent[0], accent[1], accent[2]);
    gl.uniform1f(uniforms.uOpacity, Math.min(1, Math.max(0, s.opacity ?? 1)));
    gl.uniform1f(uniforms.uFade, Math.min(1, Math.max(0, s.fade ?? 0)));
    gl.uniform1i(uniforms.uShape, s.shape === "square" ? 1 : 0);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, instances);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, grid.count);
    gl.bindVertexArray(null);
  };

  const settled = (now: number) => {
    if (shocks.length) return false;
    if (introStart !== null) {
      if (introStart < 0 || (now - introStart) / 1000 < 1.6) return false;
      introStart = null;
    }
    if (Math.abs(pointer.vx) + Math.abs(pointer.vy) > 1) return false;
    const presenceTarget =
      settingsRef.current.mouseInteraction && pointer.inside && !reduced ? 1 : 0;
    if (Math.abs(presenceTarget - pointer.presence) > 0.002) return false;
    for (let i = 0; i < offset.length; i++) {
      if (Math.abs(at(offset, i)) > 0.02 || Math.abs(at(velocity, i)) > 0.5) return false;
    }
    return true;
  };

  const frame = (now: number) => {
    raf = 0;
    const s = settingsRef.current;
    if (s.paused || !visible) return;
    if (introStart !== null && introStart < 0) introStart = now;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (!reduced) step(dt, now);
    render(now);
    if (!settled(now)) raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (raf || settingsRef.current.paused || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const locate = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    view.left = rect.left;
    view.top = rect.top;
    return [event.clientX - rect.left, event.clientY - rect.top] as const;
  };

  const onMove = (event: PointerEvent) => {
    if (!settingsRef.current.mouseInteraction || reduced) return;
    const [x, y] = locate(event);
    const inside = x >= 0 && y >= 0 && x <= view.width && y <= view.height;
    const time = event.timeStamp || performance.now();
    if (inside && pointer.inside && pointer.time) {
      const elapsed = Math.max(4, time - pointer.time) / 1000;
      const vx = (x - pointer.x) / elapsed;
      const vy = (y - pointer.y) / elapsed;
      pointer.vx += (vx - pointer.vx) * 0.6;
      pointer.vy += (vy - pointer.vy) * 0.6;
    } else {
      pointer.vx = 0;
      pointer.vy = 0;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.time = time;
    if (inside !== pointer.inside || inside) {
      pointer.inside = inside;
      wake();
    }
  };

  const onLeave = () => {
    pointer.inside = false;
    pointer.time = 0;
    wake();
  };

  const onOut = (event: PointerEvent) => {
    if (!event.relatedTarget) onLeave();
  };

  const onDown = (event: PointerEvent) => {
    if (!settingsRef.current.clickShock || reduced) return;
    const [x, y] = locate(event);
    if (x < 0 || y < 0 || x > view.width || y > view.height) return;
    shocks.push({ x, y, start: performance.now() });
    if (shocks.length > 6) shocks.shift();
    wake();
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerout", onOut);
  window.addEventListener("blur", onLeave);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    wake();
  });
  resizeObserver.observe(canvas);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry) visible = entry.isIntersecting;
    if (visible) wake();
  });
  visibilityObserver.observe(canvas);

  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      wake();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  wake();

  return {
    rebuild: () => {
      rebuild();
      render(performance.now());
      wake();
    },
    refresh: () => {
      render(performance.now());
      wake();
    },
    destroy: () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerout", onOut);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      gl.deleteBuffer(cornerBuffer);
      gl.deleteBuffer(instanceBuffer);
      gl.deleteVertexArray(vao);
      if (program) gl.deleteProgram(program);
    },
  };
}
