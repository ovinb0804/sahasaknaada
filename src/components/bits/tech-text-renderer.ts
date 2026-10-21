/*
 * TechText — animation loop and lifecycle.
 * Uses the shared RenderState + draw helpers from tech-text-draw.
 */
import {
  SPRING,
  INTRO_DELAY,
  KICK_DECAY,
  approach,
  clamp01,
  smoothstep,
  type TechTextProps,
} from "./tech-text-helpers";
import {
  type RenderState,
  ensureLayout,
  glyphAt,
  drawReveal,
  drawFrame,
  drawLines,
  drawFilling,
  drawAssembling,
  ensureCells,
  blit,
  palette,
} from "./tech-text-draw";

export type RendererHandle = {
  update: (next: TechTextProps) => void;
  destroy: () => void;
};

type Kick = { index: number; at: number; velocity: number };

export function createRenderer(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  initial: TechTextProps,
): RendererHandle {
  const ctx = canvas.getContext("2d");
  const scratch = document.createElement("canvas");
  const scratchCtx = scratch.getContext("2d");
  if (!ctx || !scratchCtx) {
    return { update: () => {}, destroy: () => {} };
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  let raf = 0;
  let last = performance.now();
  let visible = false;
  let alive = true;
  let clock = 0;
  let pulse = 0;
  let placed = false;
  let dragging = -1;
  let cursor = "";
  let introClock = 0;
  let introKind = "";
  let introducing = false;
  let fontsReady = !document.fonts;
  let guideAlpha = 0;
  let frameAlpha = 0;
  const kicks: Kick[] = [];
  const press = { x: 0, y: 0, time: 0, index: -1 };
  const pointer = { x: 0, y: 0, inside: false };
  const grab = { x: 0, y: 0 };
  const settingsRef: { current: TechTextProps } = { current: initial };

  const state: RenderState = {
    ctx,
    scratch,
    scratchCtx,
    canvas,
    container,
    width: 1,
    height: 1,
    dpr: 1,
    layoutKey: "",
    requestedFont: "",
    word: null,
    glyphs: [],
    frame: { x1: 0, y1: 0, x2: 0, y2: 0, alpha: 0, index: -1 },
    lens: { x: 0, y: 0 },
    presence: 0,
    pulse: 0,
  };
  const lens = state.lens;
  const frame = state.frame;

  const wakeRef = { current: () => {} };
  const refreshFonts = () => {
    state.layoutKey = "";
    wakeRef.current();
  };
  const fontsLoaded = () => {
    fontsReady = true;
    refreshFonts();
  };

  const kick = (index: number) => {
    const strength = (state.word ? state.word.size : 120) * 11;
    kicks.push({ index, at: pulse, velocity: strength });
    for (let d = 1; d < state.glyphs.length; d++) {
      const velocity = strength * Math.pow(KICK_DECAY, d);
      if (velocity < 30) break;
      for (const j of [index - d, index + d]) {
        if (j >= 0 && j < state.glyphs.length)
          kicks.push({ index: j, at: pulse + d * 0.055, velocity });
      }
    }
    wakeRef.current();
  };

  const tick = (now: number) => {
    raf = 0;
    const s = settingsRef.current;
    if (!s) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    state.pulse = pulse;
    state.frame.alpha = frameAlpha;
    const { ink, accent } = palette(s, container);
    const view = ensureLayout(state, s, ink);
    const damping = 2 * Math.sqrt(SPRING) * (1 - clamp01(s.bounce ?? 0) * 0.96);

    if (s.intro !== introKind) {
      introKind = s.intro ?? "none";
      introClock = 0;
    }
    const introOn = introKind !== "none" && !reducedMotion && state.glyphs.length > 0;
    if (introOn && fontsReady) introClock += dt;
    const progress = introOn
      ? clamp01((introClock - INTRO_DELAY) / Math.max(0.3, s.introDuration ?? 2))
      : 1;
    introducing = introOn && progress < 1;

    const sweeping = !introducing && !!s.sweep && !reducedMotion && !pointer.inside && dragging < 0;
    if (sweeping) clock += dt * (s.speed ?? 1);
    pulse += dt;
    let targetX = pointer.x;
    let targetY = pointer.y;
    if (sweeping) {
      targetX = view.left + (view.right - view.left) * (0.5 - 0.5 * Math.cos(clock * 0.45));
      targetY = view.top + (view.bottom - view.top) * (0.45 + 0.1 * Math.sin(clock * 0.8));
    }
    const active = !introducing && (pointer.inside || sweeping || dragging >= 0);
    if (active && !placed) {
      lens.x = targetX;
      lens.y = targetY;
    }
    if (active) {
      const lag = pointer.inside ? 0.05 : 0.22;
      lens.x = approach(lens.x, targetX, dt, lag);
      lens.y = approach(lens.y, targetY, dt, lag);
    }
    placed = active;
    state.presence = approach(
      state.presence,
      s.reveal === "area" && active && dragging < 0 ? 1 : 0,
      dt,
      0.16,
    );

    for (let k = kicks.length - 1; k >= 0; k--) {
      const kick = kicks[k];
      if (!kick) continue;
      if (kick.at > pulse) continue;
      const glyph = state.glyphs[kick.index];
      if (glyph) glyph.velocity.y -= kick.velocity;
      kicks.splice(k, 1);
    }

    let moving = false;
    state.glyphs.forEach((glyph, i) => {
      if (i === dragging) {
        glyph.offset.x = approach(glyph.offset.x, pointer.x - grab.x, dt, 0.03);
        glyph.offset.y = approach(glyph.offset.y, pointer.y - grab.y, dt, 0.03);
        glyph.velocity.x = 0;
        glyph.velocity.y = 0;
        moving = true;
        return;
      }
      const { offset, velocity } = glyph;
      if (
        Math.abs(offset.x) < 0.05 &&
        Math.abs(offset.y) < 0.05 &&
        Math.hypot(velocity.x, velocity.y) < 0.5
      ) {
        offset.x = 0;
        offset.y = 0;
        velocity.x = 0;
        velocity.y = 0;
        return;
      }
      velocity.x += (-SPRING * offset.x - damping * velocity.x) * dt;
      velocity.y += (-SPRING * offset.y - damping * velocity.y) * dt;
      offset.x += velocity.x * dt;
      offset.y += velocity.y * dt;
      moving = true;
    });

    let typing = -1;
    if (introducing && introKind === "type") {
      const step = 0.86 / state.glyphs.length;
      const cursorAt = Math.min(state.glyphs.length - 1, Math.floor(progress / step));
      typing = progress < 0.93 ? cursorAt : -1;
      state.glyphs.forEach((glyph, i) => {
        glyph.shown =
          i < cursorAt ? 1 : i === cursorAt ? smoothstep(0, step * 0.3, progress - i * step) : 0;
      });
    } else {
      state.glyphs.forEach((glyph) => {
        glyph.shown = 1;
      });
    }

    const focus = introducing
      ? typing
      : dragging >= 0
        ? dragging
        : active
          ? glyphAt(state, lens.x, lens.y)
          : -1;
    if (focus >= 0 && s.selection) {
      const glyph = state.glyphs[focus];
      if (glyph) {
        const bx1 = glyph.box.x1 + glyph.offset.x - 6;
        const by1 = glyph.box.y1 + glyph.offset.y - 6;
        const bx2 = glyph.box.x2 + glyph.offset.x + 6;
        const by2 = glyph.box.y2 + glyph.offset.y + 6;
        if (frame.index < 0 || frameAlpha < 0.02) {
          frame.x1 = bx1;
          frame.y1 = by1;
          frame.x2 = bx2;
          frame.y2 = by2;
        }
        const glide = focus === dragging ? 0.02 : 0.08;
        frame.x1 = approach(frame.x1, bx1, dt, glide);
        frame.y1 = approach(frame.y1, by1, dt, glide);
        frame.x2 = approach(frame.x2, bx2, dt, glide);
        frame.y2 = approach(frame.y2, by2, dt, glide);
        frame.index = focus;
      }
    }
    frameAlpha = approach(frameAlpha, focus >= 0 && s.selection ? 1 : 0, dt, 0.1);
    state.frame.alpha = frameAlpha;

    state.glyphs.forEach((glyph, i) => {
      const target = introducing
        ? introKind === "type" && (i === typing || (typing >= 0 && i > typing))
          ? 1
          : 0
        : s.reveal === "letter" && i === focus && i !== dragging
          ? 1
          : 0;
      if (introducing && glyph.shown === 0) glyph.outline = target;
      glyph.outline = approach(glyph.outline, target, dt, 0.09);
      if (Math.abs(glyph.outline - target) > 0.002) moving = true;
      else glyph.outline = target;
    });

    guideAlpha = approach(
      guideAlpha,
      s.guides && !introducing && (focus >= 0 || state.presence > 0.4) ? 1 : 0,
      dt,
      0.14,
    );

    const hovering = !introducing && focus >= 0 && pointer.inside;
    const nextCursor =
      dragging >= 0
        ? "grabbing"
        : hovering && s.draggable
          ? "grab"
          : hovering && s.clickKick
            ? "pointer"
            : "";
    if (nextCursor !== cursor) {
      cursor = nextCursor;
      container.style.cursor = nextCursor;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const glyph of state.glyphs) {
      const moved = Math.hypot(glyph.offset.x, glyph.offset.y);
      if (moved > 1) {
        ctx.globalAlpha = Math.min(1, moved / 24) * 0.55;
        blit(ctx, glyph.dashes, 0, 0, 0, 0, state.dpr);
        ctx.globalAlpha = 1;
      }
    }
    if (introducing && introKind === "metrics") {
      drawLines(state, s, view, accent, 1 - smoothstep(0.84, 1, progress), (k) =>
        smoothstep(0.02 + 0.04 * k, 0.2 + 0.04 * k, progress),
      );
    } else if (guideAlpha > 0.005) {
      drawLines(state, s, view, accent, guideAlpha * 0.6, () => 1);
    }
    state.glyphs.forEach((glyph, i) => {
      if (introducing && introKind === "assemble") {
        ensureCells(glyph, view, state.dpr);
        if (progress < glyph.assembled) {
          drawAssembling(state, glyph, progress, accent);
          return;
        }
      }
      if (introducing && introKind === "metrics") {
        const lead = state.glyphs.length > 1 ? i / (state.glyphs.length - 1) : 0;
        if (progress < 0.72 + 0.28 * lead) {
          drawFilling(state, glyph, lead, progress, view);
          return;
        }
      }
      if (glyph.shown < 0.001) return;
      if (glyph.outline < 0.999) {
        ctx.globalAlpha = (1 - glyph.outline) * glyph.shown;
        blit(ctx, glyph.fill, glyph.offset.x, glyph.offset.y, 0, 0, state.dpr);
      }
      if (glyph.outline > 0.001) {
        ctx.globalAlpha = glyph.outline * glyph.shown;
        blit(ctx, glyph.dashes, glyph.offset.x, glyph.offset.y, 0, 0, state.dpr);
      }
      ctx.globalAlpha = 1;
    });
    if (state.presence > 0.001) drawReveal(state, s);
    drawFrame(state, s, accent);

    const settling =
      moving ||
      introducing ||
      kicks.length > 0 ||
      (guideAlpha > 0.005 && guideAlpha < 0.995) ||
      Math.abs(state.presence - (s.reveal === "area" && active && dragging < 0 ? 1 : 0)) > 0.002 ||
      (frameAlpha > 0.01 && frameAlpha < 0.99);
    if ((active || settling) && visible && alive) raf = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (raf || !visible || !alive) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  };
  wakeRef.current = wake;

  const resize = () => {
    state.width = Math.max(1, container.clientWidth);
    state.height = Math.max(1, container.clientHeight);
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    state.layoutKey = "";
    wake();
  };

  const locate = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  };
  const onMove = (e: PointerEvent) => {
    locate(e);
    pointer.inside = true;
    wake();
  };
  const onLeave = () => {
    if (dragging >= 0) return;
    pointer.inside = false;
    wake();
  };
  const onDown = (e: PointerEvent) => {
    locate(e);
    pointer.inside = true;
    const s = settingsRef.current;
    const primary = e.pointerType !== "mouse" || e.button === 0;
    const index = introducing || !primary ? -1 : glyphAt(state, pointer.x, pointer.y);
    press.x = pointer.x;
    press.y = pointer.y;
    press.time = performance.now();
    press.index = index;
    if (s?.draggable && index >= 0) {
      dragging = index;
      const grabbed = state.glyphs[index];
      if (grabbed) {
        grab.x = pointer.x - grabbed.offset.x;
        grab.y = pointer.y - grabbed.offset.y;
      }
      container.setPointerCapture?.(e.pointerId);
    }
    wake();
  };
  const onUp = (e: PointerEvent) => {
    if (dragging >= 0) {
      dragging = -1;
      container.releasePointerCapture?.(e.pointerId);
      const rect = container.getBoundingClientRect();
      pointer.inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
    }
    if (
      e.type === "pointerup" &&
      press.index >= 0 &&
      settingsRef.current?.clickKick &&
      !reducedMotion &&
      performance.now() - press.time < 450
    ) {
      const rect = container.getBoundingClientRect();
      if (Math.hypot(e.clientX - rect.left - press.x, e.clientY - rect.top - press.y) < 6)
        kick(press.index);
    }
    press.index = -1;
    wake();
  };

  container.addEventListener("pointermove", onMove, { passive: true });
  container.addEventListener("pointerenter", onMove, { passive: true });
  container.addEventListener("pointerdown", onDown, { passive: true });
  container.addEventListener("pointerup", onUp, { passive: true });
  container.addEventListener("pointercancel", onUp, { passive: true });
  container.addEventListener("pointerleave", onLeave, { passive: true });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    if (entry) visible = entry.isIntersecting;
    wake();
  });
  intersectionObserver.observe(container);
  const themeObserver = new MutationObserver(wake);
  for (const node of [document.documentElement, document.body]) {
    if (node) {
      themeObserver.observe(node, {
        attributes: true,
        attributeFilter: ["class", "style", "data-theme"],
      });
    }
  }
  const schemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  schemeQuery?.addEventListener?.("change", wake);
  if (document.fonts) document.fonts.ready.then(fontsLoaded, fontsLoaded);

  resize();

  return {
    update: (next: TechTextProps) => {
      settingsRef.current = next;
      wake();
    },
    destroy: () => {
      alive = false;
      cancelAnimationFrame(raf);
      wakeRef.current = () => {};
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      themeObserver.disconnect();
      schemeQuery?.removeEventListener?.("change", wake);
      container.style.cursor = "";
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerenter", onMove);
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointercancel", onUp);
      container.removeEventListener("pointerleave", onLeave);
    },
  };
}
