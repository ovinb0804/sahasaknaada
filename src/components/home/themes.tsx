import { TechText } from "@/components/bits/tech-text";
import { THEMES } from "@/lib/content";
import { cn } from "@/lib/utils";

const ALIGNS = ["left", "center", "right"] as const;

/*
 * SOUND / SCIENCE / CREATIVITY — oversized editorial typography.
 *
 * Renders via React Bits TechText with dashed letter reveals, pointer drag,
 * sweep interaction, specks, and bouncy spring dynamics.
 */
export function Themes() {
  return (
    <section id="themes" className="border-b border-hairline">
      <div className="w-full px-5 py-20 sm:px-8 lg:px-14 xl:px-20 md:py-28">
        <div className="mb-10 flex items-center gap-4 md:mb-14">
          <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            The three pillars
          </span>
          <span className="h-px flex-1 bg-hairline" aria-hidden />
        </div>

        {/* Editorial animated typography with staggered composition */}
        <div className="flex flex-col gap-6 md:gap-10">
          {THEMES.map((t, i) => (
            <div
              key={t.word}
              data-reveal
              style={{ transitionDelay: `${i * 140}ms` }}
              className={cn(
                "reveal reveal-left relative w-full",
                t.emphasis === "gold" ? "text-gold" : "text-foreground",
              )}
            >
              {/* Accessible heading for screen readers & SEO */}
              <h2 className="sr-only">{t.word}</h2>

              {/* Responsive container for the canvas */}
              <div
                className="relative h-28 w-full sm:h-36 md:h-44 lg:h-52 xl:h-60"
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
                  align={ALIGNS[i] ?? "center"}
                  draggable
                  sweep
                />
              </div>
            </div>
          ))}
        </div>

        <p
          data-reveal
          className="reveal reveal-fly reveal-d2 mt-12 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty md:mt-14"
        >
          Sound is the medium. Science is how we understand it. Creativity is what we do with it.
          Sahasak Naada brings students from different schools together to explore all three — hands
          on, in one room.
        </p>
      </div>
    </section>
  );
}
