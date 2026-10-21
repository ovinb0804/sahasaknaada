/*
 * TearTicket — pure SVG geometry for the ticket body / stub / perforation.
 */

export type Pt = { x: number; y: number };
export type Bridge = Pt & { y0: number; y1: number; mid: number; pts: number[][] };
export type End = Pt & { v: number };

export type Geometry = {
  vertical: boolean;
  cross: number;
  body: string;
  stub: string;
  bridges: Bridge[];
  ends: End[];
  bodyOutline: string;
  stubOutline: string;
};

const f = (n: number) => n.toFixed(2);
export const rad = (deg: number) => (deg * Math.PI) / 180;
const num = (v: number | undefined) => v ?? 0;
const noise = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export function buildGeometry(
  W: number,
  H: number,
  S: number,
  R: number,
  holes: number,
  hole: number,
  not0: number,
  rough: number,
  vertical: boolean,
): Geometry {
  const main = vertical ? H : W;
  const cross = vertical ? W : H;
  const x = main - S;
  const hr = hole / 2;
  const n = Math.max(1, Math.round(holes));
  const span = cross - 2 * not0;
  const bridge = Math.max(2, (span - n * hole) / (n + 1));
  const random = noise(n * 7919 + Math.round(cross));
  const at = (u: number, v: number): Pt => (vertical ? { x: v, y: u } : { x: u, y: v });
  const pt = (u: number, v: number) => (vertical ? `${f(v)},${f(u)}` : `${f(u)},${f(v)}`);
  const arc = (r: number, sweep: number, u: number, v: number) =>
    `A${f(r)},${f(r)} 0 0 ${vertical ? 1 - sweep : sweep} ${pt(u, v)}`;
  const bridges: Bridge[] = [];
  for (let i = 0; i <= n; i += 1) {
    const y0 = not0 + i * (bridge + hole);
    const y1 = y0 + bridge;
    const steps = Math.max(2, Math.round(bridge / 2.2));
    const pts: number[][] = [];
    for (let k = 1; k < steps; k += 1)
      pts.push([x + (random() - 0.5) * 2 * rough, y0 + (bridge * k) / steps]);
    bridges.push({ y0, y1, mid: (y0 + y1) / 2, pts, ...at(x, (y0 + y1) / 2) });
  }
  let body = `M${pt(R, 0)}L${pt(x - not0, 0)}${arc(not0, 0, x, not0)}`;
  bridges.forEach((b, i) => {
    b.pts.forEach((p) => {
      body += `L${pt(num(p[0]), num(p[1]))}`;
    });
    body += `L${pt(x, b.y1)}`;
    if (i < n) body += arc(hr, 0, x, b.y1 + hole);
  });
  body += `${arc(not0, 0, x - not0, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}Z`;
  let stub = `M${pt(x + not0, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + not0, cross)}${arc(not0, 0, x, cross - not0)}`;
  for (let i = n; i >= 0; i -= 1) {
    const b = bridges[i];
    if (!b) continue;
    for (let k = b.pts.length - 1; k >= 0; k -= 1) {
      const pk = b.pts[k];
      if (!pk) continue;
      stub += `L${pt(num(pk[0]), num(pk[1]))}`;
    }
    stub += `L${pt(x, b.y0)}`;
    if (i > 0) stub += arc(hr, 0, x, b.y0 - hole);
  }
  stub += `${arc(not0, 0, x + not0, 0)}Z`;
  const ends: End[] = [
    { ...at(x, not0), v: not0 },
    { ...at(x, cross - not0), v: cross - not0 },
  ];
  const bodyOutline = `M${pt(x, cross - not0)}${arc(not0, 0, x - not0, cross)}L${pt(R, cross)}${arc(R, 1, 0, cross - R)}L${pt(0, R)}${arc(R, 1, R, 0)}L${pt(x - not0, 0)}${arc(not0, 0, x, not0)}`;
  const stubOutline = `M${pt(x, not0)}${arc(not0, 0, x + not0, 0)}L${pt(main - R, 0)}${arc(R, 1, main, R)}L${pt(main, cross - R)}${arc(R, 1, main - R, cross)}L${pt(x + not0, cross)}${arc(not0, 0, x, cross - not0)}`;
  return { vertical, cross, body, stub, bridges, ends, bodyOutline, stubOutline };
}
