import { DotGrid } from "@/components/bits/dot-grid";

/*
 * RegisterAtmosphere — refined, atmospheric background for registration flows.
 *
 * Layer 0: interactive DotGrid matching the home page, with restrained opacity.
 * Layer A: very subtle radial lighting behind page content (#07080A base).
 * Layer B: minimal decorative audio-wave lines near background edges.
 *
 * All decorative: pointer-events none, aria-hidden, reduced-motion safe.
 * Restrained gold details; the page reads predominantly near-black/charcoal.
 */
export function RegisterAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#07080A]">
      {/* Interactive DotGrid background matching the home page - restrained opacity */}
      <DotGrid
        className="pointer-events-none absolute inset-0 z-0"
        baseColor="#23252d"
        activeColor="#E7B54A"
        dotSize={3.5}
        gap={26}
        proximity={140}
        strength={0.8}
        swell={0.6}
        stretch={0.4}
        glow={0.35}
        opacity={0.35}
        intro
        mouseInteraction
      />

      {/* Subtle radial lighting behind content — calm, atmospheric, not a yellow patch */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 18%, rgba(231,181,74,0.05) 0%, transparent 65%), radial-gradient(70% 50% at 50% 85%, rgba(11,13,16,0.85) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#07080A]/60 via-transparent to-[#07080A]/90"
        aria-hidden
      />

      {/* Decorative low-opacity waveform near top edge */}
      <svg
        className="pointer-events-none absolute left-0 right-0 top-1/4 h-36 w-full opacity-20"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,60 C120,20 240,100 360,60 C480,20 600,100 720,60 C840,20 960,100 1080,60 C1140,40 1170,70 1200,60"
          stroke="#E7B54A"
          strokeWidth="1"
          strokeOpacity="0.35"
        />
        <path
          d="M0,72 C140,40 260,100 380,72 C500,44 620,100 740,72 C860,44 980,100 1100,72 C1150,58 1175,86 1200,72"
          stroke="#E7B54A"
          strokeWidth="1"
          strokeOpacity="0.18"
        />
      </svg>
    </div>
  );
}
