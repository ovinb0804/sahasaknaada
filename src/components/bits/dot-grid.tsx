import { useEffect, useRef, type CSSProperties } from "react";

import "./dot-grid.css";
import { createEngine } from "./dot-grid-engine";
import { type DotGridHandle, type DotGridProps } from "./dot-grid-helpers";

export type { DotGridProps };

/*
 * DotGrid — WebGL2 dotted field (React Bits port).
 *
 * SSR-safe: all WebGL/window work happens inside useEffect. Degrades to a
 * no-op (nothing drawn) when WebGL2 is unavailable, and to a single static
 * frame when the visitor prefers reduced motion. The container is marked
 * aria-hidden because it is decorative ambient texture, not content.
 */
export function DotGrid({
  dotSize = 5,
  gap = 18,
  baseColor = "#3a3446",
  activeColor = "#ffffff",
  proximity = 140,
  strength = 1,
  bounce = 0.6,
  tension = 0.4,
  returnDuration = 0.8,
  shockRadius = 320,
  shockStrength = 5,
  swell = 0.8,
  stretch = 0.5,
  glow = 0.5,
  shape = "circle",
  fade = 0,
  opacity = 1,
  intro = true,
  mouseInteraction = true,
  clickShock = true,
  paused = false,
  dpr,
  className = "",
  style,
}: DotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<DotGridHandle | null>(null);

  const props: DotGridProps = {
    dotSize,
    gap,
    baseColor,
    activeColor,
    proximity,
    strength,
    bounce,
    tension,
    returnDuration,
    shockRadius,
    shockStrength,
    swell,
    stretch,
    glow,
    shape,
    fade,
    opacity,
    intro,
    mouseInteraction,
    clickShock,
    paused,
    dpr,
    className,
    style,
  };
  const settingsRef = useRef<DotGridProps>(props);
  settingsRef.current = props;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined") return;
    engineRef.current = createEngine(canvas, settingsRef);
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh colors / shape / flags live without rebuilding the grid.
  useEffect(() => {
    engineRef.current?.refresh();
  }, [
    baseColor,
    activeColor,
    swell,
    stretch,
    glow,
    shape,
    fade,
    opacity,
    paused,
    proximity,
    mouseInteraction,
  ]);

  // Rebuild geometry when the dot layout changes.
  useEffect(() => {
    engineRef.current?.rebuild();
  }, [dotSize, gap]);

  return (
    <div className={`dot-grid ${className}`.trim()} style={style as CSSProperties} aria-hidden>
      <canvas ref={canvasRef} className="dot-grid__canvas" />
    </div>
  );
}

export default DotGrid;
