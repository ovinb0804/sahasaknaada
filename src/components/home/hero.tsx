import { Link } from "@tanstack/react-router";

import { BlurText } from "@/components/bits/blur-text";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { EVENT } from "@/lib/content";
import { HeroLogo } from "@/components/home/hero-logo";
import { HeroWaveform } from "@/components/home/hero-waveform";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      {/* subtle warm ambient bloom, kept away from body copy */}
      <div
        className="ambient-gold pointer-events-none absolute inset-0 z-0 opacity-70"
        aria-hidden
      />
      {/* subtle animated gold audio waveform */}
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <HeroWaveform />
      </div>

      <div className="relative z-10 grid w-full gap-12 px-5 pb-20 pt-16 sm:px-8 lg:px-14 xl:px-20 md:grid-cols-[1.05fr_1fr] md:gap-10 md:pb-28 md:pt-24">
        {/* Left: copy */}
        <div className="flex flex-col justify-center">
          <p data-reveal className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
            {EVENT.host}
          </p>

          <h1
            data-reveal
            className="reveal mt-5 font-display text-5xl font-bold leading-[0.98] tracking-tight text-foreground text-balance sm:text-6xl md:text-7xl"
          >
            <BlurText
              text="The Future of"
              trigger="load"
              effect="blur"
              animateBy="words"
              direction="top"
              delay={120}
              stepDuration={0.4}
              blur={12}
              distance={40}
              className="block"
            />
            <BlurText
              text={EVENT.heroAccentWord}
              trigger="load"
              effect="blur"
              animateBy="words"
              direction="top"
              delay={120}
              stepDuration={0.4}
              blur={12}
              distance={40}
              className="block text-gold"
            />
            <BlurText
              text="Starts Here"
              trigger="load"
              effect="blur"
              animateBy="words"
              direction="top"
              delay={120}
              stepDuration={0.4}
              blur={12}
              distance={40}
              className="block"
            />
          </h1>

          <p
            data-reveal
            className="reveal mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty"
          >
            {EVENT.heroCopy}
          </p>

          <div data-reveal className="reveal mt-9 flex flex-wrap items-center gap-4">
            <LiquidGlassButton asChild variant="gold" size="lg">
              <Link to="/register">
                Register Now
              </Link>
            </LiquidGlassButton>
            <LiquidGlassButton asChild variant="glass" size="lg">
              <a href="/#agenda">
                See the agenda
              </a>
            </LiquidGlassButton>
          </div>
        </div>

        {/* Right: approved event logo visual anchor — metallic gold finish */}
        <div className="relative flex items-center justify-center md:justify-end">
          <HeroLogo />
        </div>
      </div>
    </section>
  );
}
