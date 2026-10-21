/*
 * DotGrid — shared types and pure helpers. Split out so the engine module
 * stays focused on the animation loop and WebGL lifecycle.
 */

export type DotGridProps = {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  strength?: number;
  bounce?: number;
  tension?: number;
  returnDuration?: number;
  shockRadius?: number;
  shockStrength?: number;
  swell?: number;
  stretch?: number;
  glow?: number;
  shape?: "circle" | "square";
  fade?: number;
  opacity?: number;
  intro?: boolean;
  mouseInteraction?: boolean;
  clickShock?: boolean;
  paused?: boolean;
  dpr?: number | undefined;
  className?: string;
  style?: import("react").CSSProperties | undefined;
};

export type DotGridHandle = {
  rebuild: () => void;
  refresh: () => void;
  destroy: () => void;
};

export const toRgb = (color: string): [number, number, number] => {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  const raw = match?.[1];
  if (!raw) return [1, 1, 1];
  const hex = raw.length === 3 ? raw.replace(/./g, (d) => d + d) : raw;
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
};

export const smootherstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export const backOut = (t: number) => {
  const s = 1.9;
  const x = t - 1;
  return 1 + x * x * ((s + 1) * x + s);
};

export const compileShader = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};
