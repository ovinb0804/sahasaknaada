/*
 * FlexCarousel — engine state, intro/focus helpers, and metrics wiring.
 * Pure-ish helpers that operate on a mutable state object, kept here so the
 * main engine module stays under the file-size limit.
 */
import { INTRO_DURATION, type Item, type Settings, type Slot } from "./flex-carousel-types";
import {
  clamp01,
  easeInOut,
  easeOut,
  easeOutQuint,
  makeMetrics,
  nearest,
  remap,
  snapPoint,
  wrap,
} from "./flex-carousel-helpers";
import type { Metrics } from "./flex-carousel-types";

export type FocusState = {
  index: number;
  pending: number;
  t: number;
  v: number;
  target: number;
};

export type IntroState = {
  kind: string;
  t: number;
  running: boolean;
  done: boolean;
  readyAt: number;
};

export type PointerState = {
  x: number;
  y: number;
  over: boolean;
  down: boolean;
  id: number;
  startX: number;
  startY: number;
  startPos: number;
  dragging: boolean;
  touch: boolean;
  samples: { x: number; t: number }[];
};

export type EngineState = {
  slots: Slot[];
  width: number;
  height: number;
  pos: number;
  vel: number;
  goal: number;
  mode: "spring" | "wheel";
  wheelAt: number;
  dirty: boolean;
  activeIndex: number;
  interactedAt: number;
  autoplayAt: number;
  hasFocus: boolean;
  deform: number;
  deformVel: number;
  layout: Metrics | null;
  resnap: boolean;
  hover: string;
  lift: number;
  energy: number;
  lastPos: number;
  lens: { x: number; y: number; vx: number; vy: number; ready: boolean };
  pointer: PointerState;
  intro: IntroState;
  focus: FocusState;
  instances: { index: number; x0: number; x1: number; y0: number; y1: number }[];
};

export function createState(): EngineState {
  return {
    slots: [],
    width: 1,
    height: 1,
    pos: 0,
    vel: 0,
    goal: 0,
    mode: "spring",
    wheelAt: 0,
    dirty: true,
    activeIndex: -1,
    interactedAt: -Infinity,
    autoplayAt: performance.now(),
    hasFocus: false,
    deform: 0,
    deformVel: 0,
    layout: null,
    resnap: false,
    hover: "",
    lift: 1,
    energy: 0,
    lastPos: 0,
    lens: { x: 0, y: 0, vx: 0, vy: 0, ready: false },
    pointer: {
      x: 0,
      y: 0,
      over: false,
      down: false,
      id: -1,
      startX: 0,
      startY: 0,
      startPos: 0,
      dragging: false,
      touch: false,
      samples: [],
    },
    intro: { kind: "none", t: 0, running: false, done: false, readyAt: 0 },
    focus: { index: -1, pending: -1, t: 0, v: 0, target: 0 },
    instances: [],
  };
}

export function metricsFor(state: EngineState, s: Settings): Metrics {
  const aspects = state.slots.map((slot) => slot.aspect);
  return makeMetrics(s, aspects, state.width, state.height);
}

export function stepIndex(state: EngineState, m: Metrics, delta: number) {
  let at = snapPoint(m, state.goal);
  let index = nearest(m, at);
  const n = m.centers.length;
  for (let k = 0; k < Math.abs(delta); k++) {
    const next = (index + (delta > 0 ? 1 : n - 1)) % n;
    const wi = m.widths[index] ?? 1;
    const wn = m.widths[next] ?? 1;
    const distance = delta > 0 ? wi / 2 + m.gap + wn / 2 : -(wn / 2 + m.gap + wi / 2);
    at += distance;
    index = next;
  }
  state.goal = at;
  state.mode = "spring";
  state.dirty = true;
}

export function goToIndex(state: EngineState, m: Metrics, index: number) {
  const i = ((index % m.centers.length) + m.centers.length) % m.centers.length;
  const ci = m.centers[i] ?? 0;
  state.goal = state.goal + wrap(ci - state.goal, m.loop);
  state.mode = "spring";
  state.dirty = true;
}

export function beginIntro(state: EngineState, s: Settings, m: Metrics, reducedMotion: boolean) {
  const kind = reducedMotion && s.intro !== "none" ? "fade" : s.intro;
  state.intro.kind = INTRO_DURATION[kind] ? kind : "none";
  state.intro.running = state.intro.kind !== "none";
  state.intro.done = !state.intro.running;
  state.intro.t = 0;
  if (state.intro.kind === "spin") {
    const distance = m.loop * 1.6 + state.width;
    state.pos = state.goal + distance;
    state.vel = -distance * 3;
    state.mode = "spring";
  }
}

export type IntroEffect = {
  sceneAlpha: number;
  strength: number;
  card: ((rel: number) => { alpha: number; x: number; y: number; scale: number }) | null;
};

export function introEffectsFor(state: EngineState): IntroEffect {
  const t = state.intro.running ? state.intro.t : state.intro.done ? 1 : 0;
  const e: IntroEffect = { sceneAlpha: 1, strength: 1, card: null };
  if (!state.intro.done && !state.intro.running) {
    e.sceneAlpha = 0;
    e.strength = 0;
    return e;
  }
  if (t >= 1) return e;
  const kind = state.intro.kind;
  const { width, height } = state;
  if (kind === "rise") {
    e.strength = easeInOut((t - 0.3) / 0.65);
    e.card = (rel: number) => {
      const delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.34;
      const local = clamp01((t - delay) / 0.6);
      return {
        alpha: clamp01(local * 4),
        x: 0,
        y: (1 - easeOutQuint(local)) * height * 0.62,
        scale: 0.5 + 0.5 * easeInOut((local - 0.18) / 0.82),
      };
    };
  } else if (kind === "bloom") {
    e.strength = easeInOut((t - 0.2) / 0.8);
    e.card = (rel: number) => {
      const delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.25;
      const local = easeOut((t - delay) / 0.55);
      return { alpha: local, x: 0, y: 0, scale: 0.92 + 0.08 * local };
    };
  } else if (kind === "spin") {
    e.sceneAlpha = easeOut(t / 0.25);
    e.strength = easeOut((t - 0.55) / 0.45);
  } else if (kind === "deal") {
    e.strength = easeOut((t - 0.45) / 0.5);
    e.card = (rel: number) => {
      const spread = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.3;
      const local = easeOut((t - 0.12 - spread) / 0.5);
      return {
        alpha: easeOut((t - spread) / 0.12),
        x: -rel * (1 - local),
        y: 0,
        scale: 1,
      };
    };
  } else {
    e.sceneAlpha = easeOut(t);
    e.strength = easeOut(t);
  }
  return e;
}

export function remapLayout(state: EngineState, m: Metrics) {
  if (state.layout && state.layout.loop !== m.loop) {
    state.pos = remap(state.layout, m, state.pos);
    state.goal = remap(state.layout, m, state.goal);
    state.pointer.startPos = state.pos + (state.pointer.x - state.pointer.startX);
  }
  state.layout = m;
}

export { easeInOut, easeOut, nearest, remap, snapPoint, wrap };
export type { Item, Metrics, Settings, Slot };
