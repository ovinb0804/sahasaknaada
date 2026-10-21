/*
 * GradualBlur — React Bits (JS + CSS variant), adapted for Sahasaknaada.
 *
 * Renders a stack of translucent layers that blur the content behind the
 * navbar, fading from strongest (at the top edge) to transparent. The result
 * is a soft, gradual blur that blends into the near-black page background
 * instead of a hard opaque strip.
 *
 * Lightweight: pure DOM layers + CSS transitions, no extra dependencies.
 * Reduced-motion safe: the layers still render (the blur is decorative, not
 * motion) but transitions are disabled.
 */

export type GradualBlurProps = {
  /** Which edge the blur emanates from. */
  position?: "top" | "bottom";
  /** "page" = fixed to the viewport (for sticky/fixed nav), "container" = absolute within the parent. */
  target?: "page" | "container";
  /** Reach of the blur. */
  height?: string;
  /** Per-layer blur strength multiplier. */
  strength?: number;
  /** Number of stacked layers. More = smoother gradient, more paint cost. */
  layers?: number;
  /** Easing for the reveal transition. */
  curve?: "bezier" | "linear" | "ease" | "ease-in" | "ease-out";
  /** Use an exponential falloff for a smoother gradient. */
  exponential?: boolean;
  /** Peak opacity of the strongest layer. */
  opacity?: number;
  /** Saturation boost applied to each layer (1 = none). */
  saturation?: number;
  /** Tint color blended into each layer (matches page background). */
  tint?: string;
  /** Reveal transition duration in seconds. */
  duration?: number;
  /** Stacking z-index for the blur container. */
  zIndex?: number;
  className?: string;
};

const EASE_MAP: Record<NonNullable<GradualBlurProps["curve"]>, string> = {
  bezier: "cubic-bezier(0.22, 1, 0.36, 1)",
  linear: "linear",
  ease: "ease",
  "ease-in": "ease-in",
  "ease-out": "ease-out",
};

export function GradualBlur({
  position = "top",
  target = "page",
  height = "6rem",
  strength = 2,
  layers = 8,
  curve = "bezier",
  exponential = true,
  opacity = 0.8,
  saturation = 1,
  tint = "#07080A",
  duration = 0.3,
  zIndex = 0,
  className = "",
}: GradualBlurProps) {
  const count = Math.max(1, Math.min(24, Math.round(layers)));
  const easing = EASE_MAP[curve];

  // Build the per-layer blur/opacity falloff.
  const layerStyles = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 1 : i / (count - 1); // 0..1
    const falloff = exponential ? Math.pow(t, 2) : t;
    const layerOpacity = opacity * (0.25 + 0.75 * falloff);
    const blur = strength * (0.4 + 1.6 * falloff);
    return {
      blur,
      layerOpacity,
      // Each layer occupies a slice of the total height, stacked from the edge.
      heightPct: 100 / count,
    };
  });

  const containerStyle: React.CSSProperties = {
    position: target === "page" ? "fixed" : "absolute",
    left: 0,
    right: 0,
    [position]: 0,
    height,
    zIndex,
    pointerEvents: "none",
    overflow: "hidden",
  } as React.CSSProperties;

  return (
    <div
      aria-hidden
      className={`gradual-blur ${className}`.trim()}
      style={containerStyle}
      data-position={position}
    >
      {layerStyles.map((layer, i) => (
        <div
          key={i}
          className="gradual-blur__layer"
          style={
            {
              position: "absolute",
              left: 0,
              right: 0,
              [position]: 0,
              height: `calc(${layer.heightPct}% + 1px)`,
              backdropFilter: `blur(${layer.blur.toFixed(2)}px) saturate(${saturation})`,
              backgroundColor: tint,
              opacity: 0,
              transition: `opacity ${duration}s ${easing}`,
              "--gb-opacity": layer.layerOpacity.toFixed(3),
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
