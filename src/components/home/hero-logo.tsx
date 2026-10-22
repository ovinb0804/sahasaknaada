import { useEffect, useState } from "react";

import { MetallicPaint } from "@/components/bits/metallic-paint";
import { EVENT } from "@/lib/content";

/**
 * Hero logo visual anchor. Uses the React Bits MetallicPaint (WebGL2) to pour
 * a warm-gold metallic finish over the approved Sahasak Naada logo, with the
 * logo's intro reveal. Falls back to the clean static logo when WebGL2 is
 * unavailable, on SSR, or when reduced motion is requested — never leaving a
 * blank or broken canvas.
 */
export function HeroLogo() {
  const [mode, setMode] = useState<"loading" | "paint" | "static">("loading");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      setMode("static");
      return;
    }
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    setMode(gl ? "paint" : "static");
  }, []);

  return (
    <div className="relative flex aspect-square w-full max-w-2xl items-center justify-center overflow-hidden p-3 sm:p-4">
      {mode === "paint" ? (
        <MetallicPaint
          imageSrc={EVENT.logoUrl}
          color="#f0cc78"
          density={2.4}
          softness={0.12}
          dispersion={0.34}
          distortion={0.06}
          edgeBend={0.7}
          angle={70}
          speed={0.7}
          scale={0.95}
          mouseTilt={0.45}
          lightMode={false}
          intro
          className="relative z-10 h-full w-full"
        />
      ) : (
        <img
          src={EVENT.logoUrl}
          alt="Sahasak Naada official event logo featuring microphone in hand and stylized lettering"
          className="relative z-10 max-h-[34rem] w-full object-contain"
        />
      )}
    </div>
  );
}
