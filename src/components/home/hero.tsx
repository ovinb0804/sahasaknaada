import { Link } from "@tanstack/react-router";

import { DotGrid } from "@/components/bits/dot-grid";
import { BlurText } from "@/components/bits/blur-text";
import { Button } from "@/components/ui/button";
import { EVENT } from "@/lib/content";
import { HeroLogo } from "@/components/home/hero-logo";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-hairline">
      {/* Background DotGrid for Hero — responsive, interactive WebGL2 dots */}
      <DotGrid
        className="pointer-events-none absolute inset-0 z-0"
        baseColor="#3c3c46"
        activeColor="#f5b921"
        dotSize={4}
        gap={24}
        proximity={160}
        strength={1}
        bounce={0.5}
        swell={0.9}
        stretch={0.5}
        glow={0.6}
        opacity={0.9}
        intro
        mouseInteraction
        clickShock
      />
      {/* subtle warm ambient bloom, kept away from body copy */}
      <div
        className="ambient-gold pointer-events-none absolute inset-0 z-0 opacity-70"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-5 pb-20 pt-16 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:gap-8 md:pb-28 md:pt-24">
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
            <Button
              asChild
              size="lg"
              className="border border-gold/40 bg-primary px-7 text-primary-foreground transition-colors hover:border-gold/80 hover:bg-secondary focus-visible:ring-gold"
            >
              <Link to="/register" className="focus-visible:outline-none">
                Register Now
              </Link>
            </Button>
            <a
              href="/#agenda"
              className="text-sm font-medium text-foreground underline-offset-4 transition-colors hover:text-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded"
            >
              See the agenda
            </a>
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
