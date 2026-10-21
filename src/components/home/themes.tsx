import { TechText } from "@/components/bits/tech-text";
import { BlurText } from "@/components/bits/blur-text";
import { THEMES } from "@/lib/content";
import { cn } from "@/lib/utils";

/*
 * SOUND / SCIENCE / CREATIVITY — oversized editorial typography.
 *
 * Renders via React Bits TechText with dashed letter reveals, pointer drag,
 * sweep interaction, specks, and bouncy spring dynamics.
 */
export function Themes() {
  return (
    <section id="themes" className="border-b border-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 md:py-28">
        <div className="mb-10 flex items-center gap-4 md:mb-14">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            The three pillars
          </span>
          <span className="h-px flex-1 bg-hairline" aria-hidden />
        </div>

        {/* Editorial animated typography with staggered composition */}
        <div className="flex flex-col gap-6 md:gap-10">
          {THEMES.map((t) => (
            <div
              key={t.word}
              data-reveal
              style={{
                marginLeft: `clamp(0rem, ${t.offset * 0.75}vw, ${t.offset}rem)`,
              }}
              className={cn(
                "reveal relative w-full max-w-[min(100%,50rem)]",
                t.emphasis === "gold" ? "text-gold" : "text-foreground",
              )}
            >
              {/* Accessible heading for screen readers & SEO */}
              <h2 className="sr-only">{t.word}</h2>

              {/* Responsive container for the canvas */}
              <div
                className="relative h-28 w-full sm:h-36 md:h-44"
                style={{
                  color: t.emphasis === "gold" ? "#f5b921" : "#ffffff",
                }}
              >
                <TechText
                  text={t.word}
                  fontWeight={700}
                  fontSize={140}
                  reveal="letter"
                  dashLength={4}
                  dashGap={2}
                  specks={15}
                  intro="none"
                  introDuration={2}
                  clickKick
                  guides={false}
                  fontFamily=""
                  letterSpacing={-0.04}
                  accentColor="currentColor"
                  reach={220}
                  softness={0.7}
                  lineStyle="dashed"
                  strokeWidth={1.5}
                  speed={1}
                  bounce={0.4}
                  selection
                  labels
                  color="currentColor"
                  align="left"
                  draggable
                  sweep
                />
              </div>
            </div>
          ))}
        </div>

        <p
          data-reveal
          className="reveal mt-12 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty md:mt-14"
        >
          <BlurText
            text="Sound is the medium. Science is how we understand it. Creativity is what we do with it. Sahasaknaada brings students from different schools together to explore all three — hands on, in one room."
            trigger="view"
            effect="blur"
            animateBy="words"
            direction="top"
            delay={60}
            stepDuration={0.3}
            blur={8}
            distance={24}
          />
        </p>
      </div>
    </section>
  );
}
