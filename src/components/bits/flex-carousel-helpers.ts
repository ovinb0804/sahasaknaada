/*
 * FlexCarousel — pure math helpers and layout/metrics functions.
 * No DOM or WebGL; safe to import anywhere.
 */
import {
  FIT_ASPECT,
  type FlexCarouselIntro,
  type Metrics,
  type Settings,
} from "./flex-carousel-types";

export const wrap = (value: number, size: number) =>
  ((((value + size / 2) % size) + size) % size) - size / 2;

export const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export const easeOut = (value: number) => 1 - Math.pow(1 - clamp01(value), 3);

export const easeOutQuint = (value: number) => 1 - Math.pow(1 - clamp01(value), 5);

export const easeInOut = (value: number) => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

export function makeMetrics(
  s: Settings,
  slotAspects: number[],
  width: number,
  height: number,
): Metrics {
  const cardH = Math.max(24, s.cardHeight * height);
  const fixed = FIT_ASPECT[s.fit] ?? 0;
  const widths = slotAspects.map((aspect) => (fixed || aspect) * cardH);
  const centers: number[] = [];
  let cursor = 0;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] ?? 0;
    centers.push(cursor + w / 2);
    cursor += w + s.gap;
  }
  return { cardH, widths, centers, gap: s.gap, loop: Math.max(cursor, 1) };
}

export const nearest = (m: Metrics, at: number) => {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < m.centers.length; i++) {
    const c = m.centers[i] ?? 0;
    const dist = Math.abs(wrap(c - at, m.loop));
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
};

export const snapPoint = (m: Metrics, at: number) => {
  const i = nearest(m, at);
  return at + wrap((m.centers[i] ?? 0) - at, m.loop);
};

export const remap = (from: Metrics, to: Metrics, at: number) => {
  const i = nearest(from, at);
  const fc = from.centers[i] ?? 0;
  const offset = wrap(at - fc, from.loop);
  const cycles = Math.round((at - offset - fc) / from.loop);
  const tw = to.widths[i] ?? 1;
  const fw = from.widths[i] ?? 1;
  return cycles * to.loop + (to.centers[i] ?? 0) + offset * (tw / fw);
};

/**
 * Pure intro animation effects. Returns the scene alpha, lens strength, and
 * an optional per-card transform function for the given intro kind/time.
 */
export function introEffects(
  kind: FlexCarouselIntro,
  t: number,
  width: number,
  height: number,
): {
  sceneAlpha: number;
  strength: number;
  card: ((rel: number) => { alpha: number; x: number; y: number; scale: number }) | null;
} {
  const e: {
    sceneAlpha: number;
    strength: number;
    card: ((rel: number) => { alpha: number; x: number; y: number; scale: number }) | null;
  } = { sceneAlpha: 1, strength: 1, card: null };

  if (t >= 1) return e;
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
