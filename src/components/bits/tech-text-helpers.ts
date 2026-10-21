/*
 * TechText — pure helpers, types, and constants.
 * Split out so the React component stays focused on the canvas lifecycle.
 */

export const LABEL_FONT = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
export const FALLOFF_STEPS = 8;
export const SPRING = 320;
export const INHERIT = /^(currentcolor|inherit)$/i;
export const INTRO_DELAY = 0.15;
export const KICK_DECAY = 0.62;

export type TechTextProps = {
  text?: string;
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  color?: string;
  accentColor?: string;
  align?: "left" | "center" | "right";
  reach?: number;
  softness?: number;
  dashLength?: number;
  dashGap?: number;
  strokeWidth?: number;
  lineStyle?: "dashed" | "solid";
  reveal?: "letter" | "area";
  specks?: number;
  selection?: boolean;
  labels?: boolean;
  draggable?: boolean;
  bounce?: number;
  sweep?: boolean;
  speed?: number;
  clickKick?: boolean;
  intro?: "none" | "letter" | "type" | "metrics" | "assemble";
  introDuration?: number;
  guides?: boolean;
  className?: string;
  style?: import("react").CSSProperties | undefined;
};

export type Art = { image: HTMLCanvasElement; left: number; top: number };

export type Cell = {
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
  start: number;
  land: number;
};

export type Glyph = {
  char: string;
  x: number;
  box: { x1: number; y1: number; x2: number; y2: number };
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
  outline: number;
  shown: number;
  cells: Cell[] | null;
  assembled: number;
  index: number;
  fill: Art;
  dashes: Art;
};

export type ViewLine = { y: number; label: string };
export type ViewBand = { y0: number; y1: number; up: boolean; order: number };
export type View = {
  size: number;
  baseline: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  lines: ViewLine[];
  bands: ViewBand[];
};

export const approach = (current: number, target: number, dt: number, seconds: number) =>
  current + (target - current) * (1 - Math.exp(-dt / seconds));

export const clamp01 = (value: number) => Math.min(1, Math.max(0, Number(value) || 0));

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const noise = (...values: number[]) => {
  let h = 2166136261;
  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
};

export const signed = (value: number) =>
  value > 0 ? `+${value}` : value < 0 ? `\u2212${-value}` : "0";
