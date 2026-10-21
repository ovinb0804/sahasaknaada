/*
 * FlexCarousel — WebGL engine (ogl).
 *
 * Owns the renderer, programs, render target, slot list, animation loop,
 * intro, focus, and input wiring. Heavy WebGL lifecycle isolated here so
 * the React component stays small. SSR-safe (only invoked from useEffect).
 */
import { Renderer, Program, Mesh, Triangle, Plane, Texture, RenderTarget } from "ogl";
import type { OGLRenderingContext } from "ogl";

import {
  INTRO_DURATION,
  PIXEL_BUDGET,
  TAPS,
  type Callbacks,
  type Item,
  type Settings,
  type Slot,
} from "./flex-carousel-types";
import { clamp01, easeInOut, nearest, snapPoint, wrap } from "./flex-carousel-helpers";
import { cardFragment, cardVertex, lensFragment, lensVertex } from "./flex-carousel-shaders";
import { loadSlot } from "./flex-carousel-slots";
import { attachInput } from "./flex-carousel-input";
import {
  beginIntro,
  createState,
  goToIndex,
  introEffectsFor,
  metricsFor,
  remapLayout,
  stepIndex,
  type EngineState,
} from "./flex-carousel-state";

type EngineRefs = {
  settingsRef: { current: Settings | null };
  itemsRef: { current: Item[] };
  callbacksRef: { current: Callbacks };
  setRevealed: (v: boolean) => void;
  setActive: (v: number) => void;
  setFocusOpen: (v: boolean) => void;
};

export type FlexCarouselHandle = {
  destroy: () => void;
};

export function createEngine(container: HTMLDivElement, refs: EngineRefs): FlexCarouselHandle {
  const { settingsRef, itemsRef, callbacksRef, setRevealed, setActive, setFocusOpen } = refs;
  const state = createState();
  let alive = true;
  let visible = true;
  let raf = 0;
  let last = performance.now();

  const renderer = new Renderer({
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
  });
  const gl = renderer.gl as OGLRenderingContext;
  if (!renderer.isWebgl2) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return { destroy: () => {} };
  }
  gl.clearColor(0, 0, 0, 0);
  const canvas = gl.canvas as HTMLCanvasElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.setAttribute("aria-hidden", "true");
  container.prepend(canvas);

  const cardProgram = new Program(gl, {
    vertex: cardVertex,
    fragment: cardFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      tMap: { value: new Texture(gl) },
      uRect: { value: [0, 0, 1, 1] },
      uResolution: { value: [1, 1] },
      uSize: { value: [1, 1] },
      uImage: { value: [1, 1] },
      uRadius: { value: 16 },
      uAlpha: { value: 1 },
      uReady: { value: 0 },
      uShift: { value: 0 },
      uDpr: { value: 1 },
      uPlaceholder: { value: [0.5, 0.5, 0.5] },
    },
  });
  cardProgram.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const cardMesh = new Mesh(gl, { geometry: new Plane(gl), program: cardProgram });

  const target = new RenderTarget(gl, {
    width: 2,
    height: 2,
    depth: false,
    minFilter: gl.LINEAR_MIPMAP_LINEAR,
    magFilter: gl.LINEAR,
  });

  const lensUniforms = {
    tScene: { value: target.texture },
    uResolution: { value: [1, 1] },
    uDpr: { value: 1 },
    uCenter: { value: [0, 0] },
    uHalf: { value: [1, 1] },
    uAngle: { value: 0 },
    uExponent: { value: 2 },
    uInner: { value: 60 },
    uOuter: { value: 80 },
    uFlow: { value: 0 },
    uCurl: { value: 0 },
    uDispersion: { value: 0 },
    uStrength: { value: 0 },
    uSceneAlpha: { value: 0 },
  };
  const lensMesh = new Mesh(gl, {
    geometry: new Triangle(gl),
    program: new Program(gl, {
      vertex: lensVertex,
      fragment: lensFragment,
      uniforms: lensUniforms,
      depthTest: false,
      depthWrite: false,
    }),
  });

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const anisotropy = renderer.getExtension("EXT_texture_filter_anisotropic") ? 8 : 0;
  void TAPS;

  const start = () => {
    if (raf || !visible || !alive) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const openFocus = (index: number) => {
    state.focus.index = index;
    state.focus.pending = -1;
    state.focus.target = 1;
    setFocusOpen(true);
    state.dirty = true;
    start();
  };

  const closeFocus = (): boolean => {
    state.focus.pending = -1;
    if (state.focus.target === 0) return false;
    state.focus.target = 0;
    setFocusOpen(false);
    state.dirty = true;
    start();
    return true;
  };

  const skipIntro = () => {
    if (state.intro.running) state.intro.t = 1;
  };

  const onSelect = (index: number) => {
    const item = itemsRef.current[index];
    if (item) callbacksRef.current.onSelect?.(index, item);
  };

  const detachInput = attachInput(
    container,
    state,
    () => settingsRef.current,
    (s) => metricsFor(state, s),
    () => state.instances,
    (m, d) => {
      stepIndex(state, m, d);
      start();
    },
    (m, i) => {
      goToIndex(state, m, i);
      start();
    },
    openFocus,
    closeFocus,
    skipIntro,
    start,
    onSelect,
  );

  const resize = () => {
    state.width = Math.max(1, container.clientWidth);
    state.height = Math.max(1, container.clientHeight);
    renderer.dpr = Math.min(
      window.devicePixelRatio || 1,
      2,
      Math.sqrt(PIXEL_BUDGET / (state.width * state.height)),
    );
    renderer.setSize(state.width, state.height);
    target.setSize(
      Math.max(2, Math.round(state.width * renderer.dpr)),
      Math.max(2, Math.round(state.height * renderer.dpr)),
    );
    lensUniforms.tScene.value = target.texture;
    state.dirty = true;
    start();
  };

  const setItems = (next: Item[]) => {
    state.slots.forEach((slot) => slot.dispose());
    state.slots = next.map((item, index) =>
      loadSlot(
        gl,
        anisotropy,
        item,
        index,
        () => alive,
        (slot: Slot) => state.slots.includes(slot),
        () => {
          state.dirty = true;
          start();
        },
      ),
    );
    state.activeIndex = -1;
    state.layout = null;
    state.resnap = true;
    state.focus.target = 0;
    state.focus.t = 0;
    state.focus.v = 0;
    state.focus.pending = -1;
    setFocusOpen(false);
    state.intro.readyAt = performance.now();
    state.dirty = true;
    start();
  };

  function frame(now: number) {
    raf = 0;
    if (!alive) return;
    const s = settingsRef.current;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (!s || !state.slots.length) {
      if (visible) raf = requestAnimationFrame(frame);
      return;
    }

    const m = metricsFor(state, s);
    const n = state.slots.length;
    let animating = false;

    if (state.resnap) {
      state.goal = snapPoint(m, state.goal);
      state.pos = state.goal;
      state.vel = 0;
      state.resnap = false;
    } else {
      remapLayout(state, m);
      if (state.layout && state.layout.loop !== m.loop) animating = true;
    }
    state.layout = m;

    if (!state.intro.running && !state.intro.done) {
      const allSettled = state.slots.every((slot) => slot.loaded || slot.failed);
      if (allSettled || now - state.intro.readyAt > 3500) {
        state.goal = snapPoint(m, state.goal);
        state.pos = state.goal;
        beginIntro(state, s, m, reducedMotion);
      }
    }
    if (state.intro.running) {
      const dur = INTRO_DURATIONS[state.intro.kind] ?? 1;
      state.intro.t = Math.min(1, state.intro.t + dt / dur);
      if (state.intro.t >= 1) {
        state.intro.running = false;
        state.intro.done = true;
        setRevealed(true);
      }
      animating = true;
    }

    if (state.mode === "wheel" && now - state.wheelAt > 150) {
      state.goal = snapPoint(m, state.goal);
      state.mode = "spring";
    }
    if (!state.pointer.dragging) {
      const spinning = state.intro.running && state.intro.kind === "spin";
      const stiffness = spinning ? 9 : state.mode === "wheel" ? 80 : 55;
      const damping = 2 * Math.sqrt(stiffness);
      const steps = Math.ceil(dt / (1 / 240));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const acc = stiffness * (state.goal - state.pos) - damping * state.vel;
        state.vel += acc * h;
        state.pos += state.vel * h;
      }
      if (Math.abs(state.goal - state.pos) < 0.05 && Math.abs(state.vel) < 0.5) {
        state.pos = state.goal;
        state.vel = 0;
      } else {
        animating = true;
      }
    } else {
      animating = true;
    }

    if (Math.abs(state.pos) > m.loop * 8) {
      const shift = Math.round(state.pos / m.loop) * m.loop;
      state.pos -= shift;
      state.goal -= shift;
      state.pointer.startPos -= shift;
    }

    const current = nearest(m, state.pos);
    if (current !== state.activeIndex) {
      state.activeIndex = current;
      setActive(current);
      const item = itemsRef.current[current];
      if (item) callbacksRef.current.onChange?.(current, item);
    }

    if (
      state.focus.pending >= 0 &&
      state.mode === "spring" &&
      Math.abs(state.goal - state.pos) < 1.5 &&
      Math.abs(state.vel) < 30
    ) {
      if (current === state.focus.pending) openFocus(current);
      else state.focus.pending = -1;
    }

    if (
      s.autoplay &&
      !reducedMotion &&
      state.intro.done &&
      state.focus.target === 0 &&
      state.focus.t < 0.01 &&
      !state.pointer.over &&
      !state.pointer.down &&
      !state.hasFocus &&
      state.mode === "spring" &&
      Math.abs(state.goal - state.pos) < 1 &&
      now - state.interactedAt > 3000 &&
      now - state.autoplayAt > s.interval * 1000
    ) {
      state.autoplayAt = now;
      stepIndex(state, m, 1);
    }
    if (s.autoplay && !reducedMotion) animating = true;

    const travel = Math.abs(state.pos - state.lastPos) / dt;
    state.lastPos = state.pos;
    const energyTarget = reducedMotion ? 0 : Math.min(travel / 2600, 1);
    state.energy +=
      (energyTarget - state.energy) *
      (1 - Math.exp(-dt / (energyTarget > state.energy ? 0.07 : 0.35)));
    if (state.energy > 0.001) animating = true;
    const liquidAmount = reducedMotion ? 0 : s.liquid;
    const push = Math.max(-1, Math.min(1, state.vel / 2200));
    const deformStiffness = 120;
    const deformDamping = 2 * Math.sqrt(deformStiffness) * 0.32;
    state.deformVel +=
      (deformStiffness * (push - state.deform) - deformDamping * state.deformVel) * dt;
    state.deform += state.deformVel * dt;
    if (Math.abs(state.deform) > 0.0005 || Math.abs(state.deformVel) > 0.005) animating = true;

    const focusStiffness = 64;
    state.focus.v +=
      (focusStiffness * (state.focus.target - state.focus.t) -
        2 * Math.sqrt(focusStiffness) * state.focus.v) *
      dt;
    state.focus.t += state.focus.v * dt;
    if (Math.abs(state.focus.target - state.focus.t) < 0.0005 && Math.abs(state.focus.v) < 0.001) {
      state.focus.t = state.focus.target;
      state.focus.v = 0;
    } else {
      animating = true;
    }
    const focusAmount = clamp01(state.focus.t);
    const focusEase = easeInOut(focusAmount);
    const focusW =
      state.focus.index >= 0 && state.focus.index < n
        ? (m.widths[state.focus.index] ?? m.cardH)
        : m.cardH;
    const focusScale = Math.max(
      1,
      Math.min(1.3, (state.height * 0.84) / m.cardH, (state.width * 0.92) / focusW),
    );
    const nextLift = 1 + (focusScale - 1) * focusEase;
    if (Math.abs(nextLift - state.lift) > 0.0005) {
      state.lift = nextLift;
      container.style.setProperty("--flex-carousel-lift", state.lift.toFixed(4));
    }

    const effects = introEffectsFor(state);
    const homeX = state.width / 2;
    const homeY = state.height / 2;
    const follow =
      s.followCursor &&
      state.pointer.over &&
      !state.pointer.dragging &&
      !state.pointer.touch &&
      state.focus.target === 0;
    const aimX = follow ? state.pointer.x : homeX;
    const aimY = follow ? state.pointer.y : homeY;
    if (!state.lens.ready) {
      state.lens.x = homeX;
      state.lens.y = homeY;
      state.lens.ready = true;
    }
    const lensK = 110;
    const lensC = 2 * Math.sqrt(lensK) * 0.8;
    state.lens.vx += (lensK * (aimX - state.lens.x) - lensC * state.lens.vx) * dt;
    state.lens.vy += (lensK * (aimY - state.lens.y) - lensC * state.lens.vy) * dt;
    state.lens.x += state.lens.vx * dt;
    state.lens.y += state.lens.vy * dt;
    if (
      Math.abs(aimX - state.lens.x) + Math.abs(aimY - state.lens.y) > 0.2 ||
      Math.abs(state.lens.vx) + Math.abs(state.lens.vy) > 0.5
    )
      animating = true;

    let halfW = (s.lensWidth * state.width) / 2;
    let halfH = (s.lensHeight * state.width) / 2;
    const squash = Math.abs(state.deform) * liquidAmount;
    halfW *= 1 + squash * 0.16;
    halfH *= 1 - squash * 0.08;
    const lensX = state.lens.x - state.deform * 14 * liquidAmount;

    for (let i = 0; i < n; i++) {
      const slot = state.slots[i];
      if (slot && slot.loaded && slot.ready < 1) {
        slot.ready = Math.min(1, slot.ready + dt / 0.45);
        animating = true;
      }
    }

    if (state.dirty || animating || state.pointer.dragging) {
      state.dirty = false;
      state.instances = [];
      const dpr = renderer.dpr;
      cardProgram.uniforms["uResolution"].value = [state.width, state.height];
      cardProgram.uniforms["uDpr"].value = dpr;
      cardProgram.uniforms["uRadius"].value = s.radius;
      const shrink = 1 - clamp01(s.squeeze) * state.energy;
      const draws = buildDraws(state, m, effects, shrink);
      let first = true;
      for (const draw of draws) {
        const slot = state.slots[draw.i];
        if (!slot) continue;
        cardProgram.uniforms["tMap"].value = slot.texture;
        cardProgram.uniforms["uRect"].value = [draw.x, draw.y, draw.cw + 2, draw.ch + 2];
        cardProgram.uniforms["uSize"].value = [draw.cw, draw.ch];
        cardProgram.uniforms["uImage"].value = slot.image;
        cardProgram.uniforms["uAlpha"].value = draw.alpha;
        cardProgram.uniforms["uReady"].value = slot.ready;
        cardProgram.uniforms["uShift"].value = reducedMotion
          ? 0
          : Math.max(-1, Math.min(1, draw.rel / (state.width * 0.75)));
        cardProgram.uniforms["uPlaceholder"].value = slot.color;
        renderer.render({ scene: cardMesh, target, clear: first });
        first = false;
        state.instances.push({
          index: draw.i,
          x0: draw.x - draw.cw / 2,
          x1: draw.x + draw.cw / 2,
          y0: draw.y - draw.ch / 2,
          y1: draw.y + draw.ch / 2,
        });
      }
      if (first) {
        renderer.bindFramebuffer(target);
        gl.viewport(0, 0, target.width, target.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      renderer.bindFramebuffer();
      target.texture.bind();
      gl.generateMipmap(gl.TEXTURE_2D);

      lensUniforms.uResolution.value = [state.width, state.height];
      lensUniforms.uDpr.value = dpr;
      lensUniforms.uCenter.value = [lensX, state.lens.y];
      lensUniforms.uHalf.value = [Math.max(halfW, 1), Math.max(halfH, 1)];
      lensUniforms.uAngle.value = (s.tilt * Math.PI) / 180;
      lensUniforms.uExponent.value = 2 + Math.pow(1 - clamp01(s.roundness), 1.5) * 10;
      const spanW = Math.max(halfW, 1);
      const spanH = Math.max(halfH, 1);
      const inner = Math.max(4, s.reach * (spanW + spanH) * 0.5);
      lensUniforms.uInner.value = inner;
      lensUniforms.uOuter.value = inner * 1.6;
      lensUniforms.uFlow.value = s.bend * (spanW + spanH) * 0.45;
      lensUniforms.uCurl.value = s.curl === "rise" ? 1 : s.curl === "fall" ? -1 : 0;
      lensUniforms.uDispersion.value =
        s.dispersion * 0.12 * (1 + Math.abs(state.deform) * liquidAmount * 1.2);
      lensUniforms.uStrength.value = effects.strength * (1 - focusEase);
      lensUniforms.uSceneAlpha.value = effects.sceneAlpha;
      renderer.render({ scene: lensMesh });
    }

    let nextHover = "";
    if (
      state.pointer.over &&
      !state.pointer.dragging &&
      state.intro.done &&
      settingsRef.current?.focusOnClick
    ) {
      const hit = state.instances.find(
        (inst) =>
          state.pointer.x >= inst.x0 &&
          state.pointer.x <= inst.x1 &&
          state.pointer.y >= inst.y0 &&
          state.pointer.y <= inst.y1,
      );
      if (state.focus.target > 0) nextHover = "close";
      else if (hit) nextHover = "open";
    }
    if (nextHover !== state.hover) {
      state.hover = nextHover;
      if (nextHover) container.setAttribute("data-hover", nextHover);
      else container.removeAttribute("data-hover");
    }

    if (visible && (animating || !state.intro.done || state.dirty || state.pointer.down))
      raf = requestAnimationFrame(frame);
  }

  const onFocus = () => {
    state.hasFocus = true;
  };
  const onBlur = () => {
    state.hasFocus = false;
  };
  const onVisibility = () => {
    if (!document.hidden) start();
  };

  container.addEventListener("focus", onFocus);
  container.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    if (!entry) return;
    visible = entry.isIntersecting;
    if (visible) start();
  });
  intersectionObserver.observe(container);

  resize();
  setItems(itemsRef.current);

  return {
    destroy: () => {
      alive = false;
      visible = false;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      detachInput();
      container.removeEventListener("focus", onFocus);
      container.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      state.slots.forEach((slot) => slot.dispose());
      state.slots = [];
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}

const INTRO_DURATIONS: Record<string, number> = INTRO_DURATION;

type Draw = { i: number; rel: number; x: number; y: number; cw: number; ch: number; alpha: number };

function buildDraws(
  state: EngineState,
  m: { cardH: number; widths: number[]; centers: number[]; loop: number },
  effects: {
    card: ((rel: number) => { alpha: number; x: number; y: number; scale: number }) | null;
  },
  shrink: number,
): Draw[] {
  const draws: Draw[] = [];
  const n = state.slots.length;
  const width = state.width;
  const homeX = width / 2;
  const homeY = state.height / 2;
  let focusAmount = clamp01(state.focus.t);
  let focusEase = easeInOut(focusAmount);
  const focusW =
    state.focus.index >= 0 && state.focus.index < n
      ? (m.widths[state.focus.index] ?? m.cardH)
      : m.cardH;
  const focusScale = Math.max(
    1,
    Math.min(1.3, (state.height * 0.84) / m.cardH, (width * 0.92) / focusW),
  );
  for (let i = 0; i < n; i++) {
    const w = m.widths[i] ?? 1;
    const baseRel = wrap((m.centers[i] ?? 0) - state.pos, m.loop);
    for (let k = -3; k <= 3; k++) {
      const rel = baseRel + k * m.loop;
      if (Math.abs(rel) - w / 2 > width + 40) continue;
      const fx = effects.card ? effects.card(rel) : null;
      let x = homeX + rel + (fx ? fx.x : 0);
      let scale = shrink * (fx ? fx.scale : 1);
      let alpha = fx ? fx.alpha : 1;
      if (focusAmount > 0) {
        if (i === state.focus.index && Math.abs(rel) < w) {
          scale *= 1 + (focusScale - 1) * focusEase;
        } else {
          const order = Math.min(Math.abs(rel) / width, 1) * 0.25;
          const part = easeInOut(focusAmount * 1.25 - order);
          x += Math.sign(rel) * part * width * 0.7;
          alpha *= 1 - part;
        }
      }
      const cw = w * scale;
      if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
      draws.push({ i, rel, x, y: homeY + (fx ? fx.y : 0), cw, ch: m.cardH * scale, alpha });
    }
  }
  draws.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
  return draws;
}
