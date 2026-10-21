import { useEffect, useRef, type CSSProperties } from "react";

import "./tech-text.css";
import { type TechTextProps } from "./tech-text-helpers";
import { createRenderer, type RendererHandle } from "./tech-text-renderer";

export type { TechTextProps };

/**
 * TechText — canvas-based typographic effect (React Bits port).
 *
 * SSR-safe: all canvas/window work happens inside useEffect. The container
 * carries role="img" + aria-label so the word stays accessible even when the
 * canvas cannot draw. Callers that rely on the effect should also keep a
 * visible static fallback for reduced-motion / no-canvas / pre-hydration.
 */
export function TechText({
  text = "React Bits",
  fontFamily = "",
  fontWeight = 600,
  fontSize = 150,
  letterSpacing = -0.05,
  color = "currentColor",
  accentColor = "currentColor",
  align = "center",
  reach = 200,
  softness = 0.7,
  dashLength = 4,
  dashGap = 2,
  strokeWidth = 1.5,
  lineStyle = "dashed",
  reveal = "letter",
  specks = 15,
  selection = true,
  labels = true,
  draggable = true,
  bounce = 0.4,
  sweep = true,
  speed = 1,
  clickKick = true,
  intro = "none",
  introDuration = 2,
  guides = false,
  className = "",
  style,
}: TechTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<RendererHandle | null>(null);

  const props: TechTextProps = {
    text,
    fontFamily,
    fontWeight,
    fontSize,
    letterSpacing,
    color,
    accentColor,
    align,
    reach,
    softness,
    dashLength,
    dashGap,
    strokeWidth,
    lineStyle,
    reveal,
    specks,
    selection,
    labels,
    draggable,
    bounce,
    sweep,
    speed,
    clickKick,
    intro,
    introDuration,
    guides,
    className,
    style,
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return; // static fallback handles reduced motion
    handleRef.current = createRenderer(container, canvas, props);
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRef.current?.update(props);
  });

  return (
    <div
      ref={containerRef}
      className={`tech-text ${className}`.trim()}
      style={style}
      role="img"
      aria-label={text}
    >
      <canvas ref={canvasRef} className="tech-text-canvas" />
    </div>
  );
}

export default TechText;
