/*
 * TearTicket — physics/pointer simulation, split out from the view.
 * Owns the rAF loop, snap/tear state, and fibre painting.
 */
import { rad, type Geometry } from "./tear-ticket-geometry";

const GRAVITY = 2400;
const RETRACT = 0.17;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const f = (n: number) => n.toFixed(2);

export type SimCfg = {
  geo: Geometry;
  tearAngle: number;
  stretch: number;
  resistance: number;
  reduce: boolean | null;
  onTear?: (() => void) | undefined;
};

export type SimCtx = {
  stubEl: () => HTMLDivElement | null;
  bodyEl: () => HTMLDivElement | null;
  fibres: () => (SVGPathElement | null)[];
  setUsed: () => void;
};

type Phase = "idle" | "held" | "free" | "drop" | "return";

type SimState = {
  raf: number;
  last: number;
  phase: Phase;
  id: number | null;
  sign: number;
  hinge: { x: number; y: number };
  hingeV: number;
  grab: { x: number; y: number };
  start: { x: number; y: number };
  point: { x: number; y: number };
  a0: number;
  theta: number;
  thetaV: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  spin: number;
  pvx: number;
  pvy: number;
  pt: number;
  fade: number;
  age: number;
  bx: number;
  bv: number;
  snapped: boolean[];
  snapAt: number[];
  span: number[];
};

export type SimHandle = {
  reset: () => void;
  isBusy: () => boolean;
  startHold: (p: { x: number; y: number }, id: number) => void;
  move: (p: { x: number; y: number }) => void;
  release: () => void;
  tearNow: () => void;
};

export function createSim(cfg: SimCfg, ctx: SimCtx): SimHandle {
  const s: SimState = {
    raf: 0,
    last: 0,
    phase: "idle",
    id: null,
    sign: 1,
    hinge: { x: 0, y: 0 },
    hingeV: 0,
    grab: { x: 0, y: 0 },
    start: { x: 0, y: 0 },
    point: { x: 0, y: 0 },
    a0: 0,
    theta: 0,
    thetaV: 0,
    sx: 0,
    sy: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    pvx: 0,
    pvy: 0,
    pt: 0,
    fade: 1,
    age: 0,
    bx: 0,
    bv: 0,
    snapped: [],
    snapAt: [],
    span: [],
  };

  const paint = (now: number) => {
    const stubEl = ctx.stubEl();
    const bodyEl = ctx.bodyEl();
    if (stubEl) {
      stubEl.style.transform = `translate(${s.sx.toFixed(2)}px, ${s.sy.toFixed(2)}px) rotate(${((s.theta * s.sign * 180) / Math.PI).toFixed(3)}deg)`;
      stubEl.style.opacity = s.fade.toFixed(3);
    }
    const up = cfg.geo.vertical;
    if (bodyEl) bodyEl.style.transform = `translate${up ? "Y" : "X"}(${s.bx.toFixed(2)}px)`;
    const cos = Math.cos(s.theta * s.sign);
    const sin = Math.sin(s.theta * s.sign);
    const lx = up ? 1.6 : 0;
    const ly = up ? 0 : 1.6;
    let busy = false;
    const fibres = ctx.fibres();
    cfg.geo.bridges.forEach((b, i) => {
      const dx = b.x - s.hinge.x;
      const dy = b.y - s.hinge.y;
      const tx = s.hinge.x + dx * cos - dy * sin + s.sx;
      const ty = s.hinge.y + dx * sin + dy * cos + s.sy;
      const ox = b.x + (up ? 0 : s.bx);
      const oy = b.y + (up ? s.bx : 0);
      const gx = tx - ox;
      const gy = ty - oy;
      const gap = Math.hypot(gx, gy);
      const near = fibres[i * 2];
      const far = fibres[i * 2 + 1];
      if (!near || !far) return;
      const live = s.phase !== "idle" && !cfg.reduce;
      if (!s.snapped[i]) {
        if (!live || gap < 0.35) {
          near.style.opacity = "0";
          far.style.opacity = "0";
          return;
        }
        const k = clamp(gap / cfg.stretch, 0, 1);
        const sag = gap * 0.18;
        const w = (1.7 - 1.15 * k).toFixed(2);
        const sxp = (up ? sag : 0) + gx / 2;
        const syp = (up ? 0 : sag) + gy / 2;
        near.setAttribute(
          "d",
          `M${f(ox - lx)},${f(oy - ly)}Q${f(ox - lx + sxp)},${f(oy - ly + syp)} ${f(tx - lx)},${f(ty - ly)}`,
        );
        far.setAttribute(
          "d",
          `M${f(ox + lx)},${f(oy + ly)}Q${f(ox + lx + gx - sxp)},${f(oy + ly + gy - syp)} ${f(tx + lx)},${f(ty + ly)}`,
        );
        near.style.strokeWidth = w;
        far.style.strokeWidth = w;
        near.style.opacity = "1";
        far.style.opacity = "1";
        s.span[i] = gap;
        return;
      }
      const snapAt = s.snapAt[i];
      if (!live || !snapAt) {
        near.style.opacity = "0";
        far.style.opacity = "0";
        return;
      }
      const t = (now - snapAt) / 1000 / RETRACT;
      if (t >= 1) {
        near.style.opacity = "0";
        far.style.opacity = "0";
        return;
      }
      busy = true;
      const left = (1 - t) * (1 - t);
      const len = (s.span[i] || cfg.stretch) * 0.5 * left;
      const ux = gap > 0.01 ? gx / gap : 1;
      const uy = gap > 0.01 ? gy / gap : 0;
      near.setAttribute("d", `M${f(ox)},${f(oy)}L${f(ox + ux * len)},${f(oy + uy * len)}`);
      far.setAttribute("d", `M${f(tx)},${f(ty)}L${f(tx - ux * len)},${f(ty - uy * len)}`);
      near.style.strokeWidth = "0.9";
      far.style.strokeWidth = "0.9";
      near.style.opacity = left.toFixed(2);
      far.style.opacity = left.toFixed(2);
    });
    return busy;
  };

  const finish = () => {
    const stubEl = ctx.stubEl();
    if (stubEl) stubEl.style.visibility = "hidden";
    ctx.setUsed();
    cfg.onTear?.();
  };

  const step = (now: number) => {
    s.raf = 0;
    const dt = clamp((now - s.last) / 1000, 0.001, 0.034);
    s.last = now;
    const limit = rad(cfg.tearAngle);
    if (s.phase === "held") {
      const count = cfg.geo.bridges.length;
      let intact = 0;
      for (let i = 0; i < count; i += 1) if (!s.snapped[i]) intact += 1;
      const hold = count ? intact / count : 0;
      const follow = 0.92 * (1 - clamp(cfg.resistance, 0, 0.95) * hold);
      const a = Math.atan2(s.point.y - s.hinge.y, s.point.x - s.hinge.x);
      const want = clamp(wrap(a - s.a0) * s.sign * follow, 0, limit + 0.1);
      s.theta += (want - s.theta) * (1 - Math.exp(-dt / 0.035));
      const up = cfg.geo.vertical;
      const away = clamp(((up ? s.point.y - s.start.y : s.point.x - s.start.x) || 0) * 0.05, -2, 4);
      const side = clamp(((up ? s.point.x - s.start.x : s.point.y - s.start.y) || 0) * 0.05, -3, 3);
      const px = up ? side : away;
      const py = up ? away : side;
      s.sx += (px - s.sx) * (1 - Math.exp(-dt / 0.05));
      s.sy += (py - s.sy) * (1 - Math.exp(-dt / 0.05));
      const slack = Math.hypot(s.sx, s.sy);
      let left = 0;
      cfg.geo.bridges.forEach((b, i) => {
        if (s.snapped[i]) return;
        const d = Math.abs(b.mid - s.hingeV);
        if (2 * d * Math.sin(s.theta / 2) + slack > cfg.stretch || s.theta >= limit) {
          s.snapped[i] = true;
          s.snapAt[i] = now;
          s.bv -= 560 / cfg.geo.bridges.length;
        } else left += 1;
      });
      if (left === 0) {
        s.phase = "free";
        s.bv -= 150;
      }
    } else if (s.phase === "free") {
      const cos = Math.cos(s.theta * s.sign);
      const sin = Math.sin(s.theta * s.sign);
      const gx = s.grab.x - s.hinge.x;
      const gy = s.grab.y - s.hinge.y;
      const wx = s.point.x - s.hinge.x - (gx * cos - gy * sin);
      const wy = s.point.y - s.hinge.y - (gx * sin + gy * cos);
      s.sx += (wx - s.sx) * (1 - Math.exp(-dt / 0.045));
      s.sy += (wy - s.sy) * (1 - Math.exp(-dt / 0.045));
      const hang = limit * 0.55 + clamp(s.pvx * 0.0009 * s.sign, -0.3, 0.3);
      s.theta += (hang - s.theta) * (1 - Math.exp(-dt / 0.12));
    } else if (s.phase === "drop") {
      s.age += dt;
      s.vy += GRAVITY * dt;
      s.sx += s.vx * dt;
      s.sy += s.vy * dt;
      s.theta += s.spin * dt;
      if (s.age > 0.16) s.fade = clamp(1 - (s.age - 0.16) / 0.42, 0, 1);
      if (s.fade <= 0) {
        s.phase = "idle";
        finish();
      }
    } else if (s.phase === "return") {
      s.thetaV += (-300 * s.theta - 24 * s.thetaV) * dt;
      s.theta += s.thetaV * dt;
      s.sx += (0 - s.sx) * (1 - Math.exp(-dt / 0.07));
      s.sy += (0 - s.sy) * (1 - Math.exp(-dt / 0.07));
      if (
        Math.abs(s.theta) < 0.0008 &&
        Math.abs(s.thetaV) < 0.01 &&
        Math.hypot(s.sx, s.sy) < 0.05
      ) {
        s.theta = 0;
        s.thetaV = 0;
        s.sx = 0;
        s.sy = 0;
        s.phase = "idle";
      }
    }
    s.bv += (-520 * s.bx - 30 * s.bv) * dt;
    s.bx += s.bv * dt;
    const busy = paint(now);
    const moving = Math.abs(s.bx) > 0.02 || Math.abs(s.bv) > 0.5;
    if (s.phase !== "idle" || moving || busy) s.raf = requestAnimationFrame(step);
    else {
      s.bx = 0;
      s.bv = 0;
      paint(now);
      s.raf = 0;
    }
  };

  const run = () => {
    if (s.raf) return;
    s.last = performance.now();
    s.raf = requestAnimationFrame(step);
  };

  const tearNow = () => {
    cancelAnimationFrame(s.raf);
    s.raf = 0;
    s.phase = "idle";
    finish();
  };

  const startHold = (p: { x: number; y: number }, id: number) => {
    if (s.id !== null || s.phase === "drop") return;
    s.id = id;
    s.start = p;
    s.point = p;
    s.pt = performance.now();
    s.pvx = 0;
    s.pvy = 0;
    if (s.theta < 0.01) {
      const far = (cfg.geo.vertical ? p.x : p.y) < cfg.geo.cross / 2;
      const end = cfg.geo.ends[far ? 1 : 0]!;
      s.sign = (far ? 1 : -1) * (cfg.geo.vertical ? -1 : 1);
      s.hinge = { x: end.x, y: end.y };
      s.hingeV = end.v;
      const stubEl = ctx.stubEl();
      if (stubEl) stubEl.style.transformOrigin = `${s.hinge.x}px ${s.hinge.y}px`;
    }
    const cos = Math.cos(-s.theta * s.sign);
    const sin = Math.sin(-s.theta * s.sign);
    const ux = p.x - s.sx - s.hinge.x;
    const uy = p.y - s.sy - s.hinge.y;
    s.grab = { x: s.hinge.x + ux * cos - uy * sin, y: s.hinge.y + ux * sin + uy * cos };
    s.a0 = Math.atan2(s.grab.y - s.hinge.y, s.grab.x - s.hinge.x) - (s.theta * s.sign) / 0.92;
    s.phase = "held";
    s.thetaV = 0;
    run();
  };

  const move = (p: { x: number; y: number }) => {
    if (s.id === null) return;
    const now = performance.now();
    const dt = Math.max(0.004, (now - s.pt) / 1000);
    s.pvx += ((p.x - s.point.x) / dt - s.pvx) * 0.35;
    s.pvy += ((p.y - s.point.y) / dt - s.pvy) * 0.35;
    s.pt = now;
    s.point = p;
    if (cfg.reduce && Math.hypot(p.x - s.start.x, p.y - s.start.y) > 28) {
      s.id = null;
      tearNow();
    }
  };

  const release = () => {
    if (s.id === null) return;
    s.id = null;
    if (s.phase === "free") {
      const still = performance.now() - s.pt > 80;
      s.vx = still ? 0 : clamp(s.pvx, -1600, 1600);
      s.vy = still ? 0 : clamp(s.pvy, -1600, 1200);
      s.spin = clamp(s.vx * 0.004, -6, 6) + 1.2 * s.sign;
      s.age = 0;
      s.phase = "drop";
    } else if (s.phase === "held") {
      s.phase = "return";
    }
    run();
  };

  const reset = () => {
    cancelAnimationFrame(s.raf);
    Object.assign(s, {
      raf: 0,
      phase: "idle" as Phase,
      id: null,
      theta: 0,
      thetaV: 0,
      sx: 0,
      sy: 0,
      fade: 1,
      age: 0,
      bx: 0,
      bv: 0,
    });
    s.snapped = [];
    s.snapAt = [];
    s.span = [];
    const stubEl = ctx.stubEl();
    if (stubEl) stubEl.style.visibility = "";
    paint(performance.now());
  };

  return {
    reset,
    isBusy: () => s.phase !== "idle" || s.id !== null,
    startHold,
    move,
    release,
    tearNow,
  };
}
