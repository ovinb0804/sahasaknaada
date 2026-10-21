/*
 * FlexCarousel — pointer/keyboard/wheel input handlers.
 * Pure functions that mutate the engine's mutable state object. Kept here
 * so the engine module stays focused on the render loop.
 */
import type { Metrics, Settings } from "./flex-carousel-types";
import { snapPoint, wrap } from "./flex-carousel-helpers";

export type EngineState = {
  pos: number;
  vel: number;
  goal: number;
  mode: "spring" | "wheel";
  width: number;
  height: number;
  activeIndex: number;
  interactedAt: number;
  wheelAt: number;
  focus: { index: number; pending: number; t: number; v: number; target: number };
  pointer: {
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
};

export type StepFn = (m: Metrics, delta: number) => void;
export type GoToF = (m: Metrics, index: number) => void;
export type OpenFocus = (index: number) => void;
export type CloseFocus = () => boolean;
export type SkipIntro = () => void;
export type Start = () => void;

export function attachInput(
  container: HTMLDivElement,
  state: EngineState,
  getSettings: () => Settings | null,
  metrics: (s: Settings) => Metrics,
  instances: () => { index: number; x0: number; x1: number; y0: number; y1: number }[],
  step: StepFn,
  goTo: GoToF,
  openFocus: OpenFocus,
  closeFocus: CloseFocus,
  skipIntro: SkipIntro,
  start: Start,
  onSelect: (index: number) => void,
): () => void {
  const localPoint = (e: PointerEvent | WheelEvent): [number, number] => {
    const rect = container.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== undefined && e.button > 0) return;
    skipIntro();
    const [x, y] = localPoint(e);
    state.pointer.down = true;
    state.pointer.id = e.pointerId;
    state.pointer.touch = e.pointerType === "touch";
    state.pointer.startX = x;
    state.pointer.startY = y;
    state.pointer.x = x;
    state.pointer.y = y;
    state.pointer.startPos = state.pos;
    state.pointer.dragging = false;
    state.pointer.samples = [{ x, t: performance.now() }];
    state.interactedAt = performance.now();
    if (Math.abs(state.vel) > 40) {
      state.goal = state.pos;
      state.vel = 0;
    }
    start();
  };

  const onPointerMove = (e: PointerEvent) => {
    const [x, y] = localPoint(e);
    state.pointer.x = x;
    state.pointer.y = y;
    state.pointer.over = true;
    if (state.pointer.down && e.pointerId === state.pointer.id) {
      const dx = x - state.pointer.startX;
      const dy = y - state.pointer.startY;
      const slop = state.pointer.touch ? 10 : 5;
      if (!state.pointer.dragging) {
        if (state.pointer.touch && Math.abs(dy) > slop && Math.abs(dy) > Math.abs(dx)) {
          state.pointer.down = false;
          return;
        }
        if (Math.abs(dx) > slop) {
          state.pointer.dragging = true;
          state.pointer.startX = x;
          state.pointer.startPos = state.pos;
          closeFocus();
          try {
            container.setPointerCapture(e.pointerId);
          } catch {
            state.pointer.dragging = true;
          }
          container.setAttribute("data-dragging", "");
        }
      }
      if (state.pointer.dragging) {
        state.pos = state.pointer.startPos - (x - state.pointer.startX);
        state.goal = state.pos;
        state.vel = 0;
        const now = performance.now();
        state.pointer.samples.push({ x, t: now });
        while (
          state.pointer.samples.length > 2 &&
          now - (state.pointer.samples[0]?.t ?? now) > 100
        ) {
          state.pointer.samples.shift();
        }
      }
    }
    start();
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!state.pointer.down || e.pointerId !== state.pointer.id) return;
    state.pointer.down = false;
    container.removeAttribute("data-dragging");
    const s = getSettings();
    if (!s) return;
    const m = metrics(s);
    state.interactedAt = performance.now();
    if (state.pointer.dragging) {
      state.pointer.dragging = false;
      const now = performance.now();
      const first2 = state.pointer.samples[0];
      const last2 = state.pointer.samples[state.pointer.samples.length - 1];
      let velocity = 0;
      if (first2 && last2 && last2.t > first2.t && now - last2.t < 70) {
        velocity = -((last2.x - first2.x) / (last2.t - first2.t)) * 1000;
      }
      state.vel = velocity;
      const landing = snapPoint(m, state.pos + velocity * 0.32);
      state.goal = landing;
      if (Math.abs(velocity) > 400 && Math.abs(landing - state.pos) < 1) {
        step(m, velocity > 0 ? 1 : -1);
      }
      state.mode = "spring";
      start();
      return;
    }
    if (closeFocus()) return;
    const [x, y] = localPoint(e);
    const hit = instances().find(
      (inst) => x >= inst.x0 && x <= inst.x1 && y >= inst.y0 && y <= inst.y1,
    );
    if (!hit) return;
    if (hit.index === state.activeIndex && Math.abs(state.goal - state.pos) < 2) {
      onSelect(hit.index);
      if (s.focusOnClick) openFocus(hit.index);
    } else {
      const rel = (hit.x0 + hit.x1) / 2 - state.width / 2;
      state.goal = snapPoint(m, state.pos + rel);
      state.mode = "spring";
      if (s.focusOnClick) state.focus.pending = hit.index;
      start();
    }
  };

  const onPointerLeave = () => {
    state.pointer.over = false;
    start();
  };

  const onPointerCancel = () => {
    state.pointer.down = false;
    state.pointer.dragging = false;
    container.removeAttribute("data-dragging");
    const s = getSettings();
    if (!s) return;
    state.goal = snapPoint(metrics(s), state.pos);
    state.mode = "spring";
    start();
  };

  const onWheel = (e: WheelEvent) => {
    const s = getSettings();
    if (!s || e.ctrlKey) return;
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
      dx = dy;
      dy = 0;
    }
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? state.height : 1;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (!horizontal && !s.captureWheel) return;
    e.preventDefault();
    skipIntro();
    state.interactedAt = performance.now();
    if (closeFocus()) return;
    const delta = Math.max(-120, Math.min(120, (horizontal ? dx : dy) * unit));
    state.goal += delta * 1.25;
    state.mode = "wheel";
    state.wheelAt = performance.now();
    start();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const s = getSettings();
    if (!s) return;
    const m = metrics(s);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      skipIntro();
      closeFocus();
      state.interactedAt = performance.now();
      step(m, 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      skipIntro();
      closeFocus();
      state.interactedAt = performance.now();
      step(m, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      closeFocus();
      goTo(m, 0);
    } else if (e.key === "End") {
      e.preventDefault();
      closeFocus();
      goTo(m, Math.max(0, metrics(s).centers.length - 1));
    } else if (e.key === "Escape") {
      if (closeFocus()) e.preventDefault();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (closeFocus() || state.activeIndex < 0) return;
      onSelect(state.activeIndex);
      if (s.focusOnClick) openFocus(state.activeIndex);
    }
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointerleave", onPointerLeave);
  container.addEventListener("pointercancel", onPointerCancel);
  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("keydown", onKeyDown);

  return () => {
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointerleave", onPointerLeave);
    container.removeEventListener("pointercancel", onPointerCancel);
    container.removeEventListener("wheel", onWheel);
    container.removeEventListener("keydown", onKeyDown);
  };
}

// Re-export wrap so the engine can normalize position across loop boundaries.
export { wrap };
