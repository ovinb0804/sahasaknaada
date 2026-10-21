/*
 * RegisterAtmosphere — immersive, sound-inspired background for /register.
 *
 * Layer A: warm-gold + faint neutral radial light fields (atmospheric depth).
 * Layer B: a fine vertical frequency-line texture, masked toward the edges.
 * Layer C: a restrained decorative waveform SVG (editorial, not an equalizer).
 * Layer D: a very slow ambient drift on the warm light field.
 *
 * All decorative: pointer-events none, aria-hidden, reduced-motion safe.
 * Gold stays an accent; the page reads predominantly near-black/charcoal.
 */
export function RegisterAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Layer A — atmospheric lighting, slow drift */}
      <div className="reg-atmos reg-drift absolute inset-0" style={{ background: undefined }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(46% 50% at 22% 16%, rgba(231,181,74,0.12) 0%, transparent 62%), radial-gradient(42% 46% at 86% 30%, rgba(120,130,160,0.06) 0%, transparent 64%), radial-gradient(120% 80% at 50% 122%, rgba(8,9,12,0.96) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Layer B — fine frequency texture, masked toward edges */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.014) 0px, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 38px)",
          maskImage: "radial-gradient(80% 70% at 50% 30%, #000 0%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 50% 30%, #000 0%, transparent 78%)",
        }}
      />

      {/* Layer C — decorative waveform, low opacity, outer edges */}
      <svg
        className="reg-wave absolute left-0 right-0 top-1/3 h-40 w-full"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,60 C120,20 240,100 360,60 C480,20 600,100 720,60 C840,20 960,100 1080,60 C1140,40 1170,70 1200,60"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.5"
        />
        <path
          d="M0,72 C140,40 260,100 380,72 C500,44 620,100 740,72 C860,44 980,100 1100,72 C1150,58 1175,86 1200,72"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.28"
        />
      </svg>

      <svg
        className="reg-wave absolute bottom-10 left-0 right-0 h-28 w-full opacity-60"
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,40 C160,10 320,70 480,40 C640,10 800,70 960,40 C1080,20 1140,60 1200,40"
          stroke="currentColor"
          strokeWidth="1"
          strokeOpacity="0.32"
        />
      </svg>
    </div>
  );
}
