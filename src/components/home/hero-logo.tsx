import { useEffect, useState } from "react";

import { MetallicPaint } from "@/components/bits/metallic-paint";
import { EVENT } from "@/lib/content";

/**
 * Hero logo visual anchor. Uses the React Bits MetallicPaint (WebGL2) to pour
 * a warm-gold metallic finish over the approved Sahasaknaada logo, with the
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
    <div className="ambient-gold-soft relative flex aspect-[16/10] w-full max-w-xl items-center justify-center overflow-hidden rounded-3xl border border-hairline bg-surface/80 p-6 sm:p-8 md:aspect-[4/3]">
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-transparent via-transparent to-black/40"
        aria-hidden
      />
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
          scale={0.7}
          mouseTilt={0.45}
          lightMode={false}
          intro
          className="relative z-10 h-full w-full"
        />
      ) : (
        <img
          src={EVENT.logoUrl}
          alt="Sahasaknaada official event logo featuring microphone in hand and stylized lettering"
          className="relative z-10 max-h-72 w-full object-contain drop-shadow-[0_12px_28px_rgba(245,185,33,0.18)] sm:max-h-80"
        />
      )}
    </div>
  );
}
