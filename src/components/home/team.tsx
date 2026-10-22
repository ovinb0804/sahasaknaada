import { BlurText } from "@/components/bits/blur-text";
import { EVENT, TEAM } from "@/lib/content";

/** "The team behind the workshop": the association's top board. */
export function Team() {
  return (
    <section id="team" className="border-b border-hairline" style={{ scrollMarginTop: "5.5rem" }}>
      <div className="w-full px-5 py-20 sm:px-8 lg:px-14 xl:px-20 md:py-28">
        <div className="grid items-center gap-10 md:grid-cols-[0.36fr_0.64fr] md:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">The team</p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              <BlurText
                text="The team behind the workshop"
                trigger="view"
                effect="blur"
                animateBy="words"
                direction="top"
                delay={90}
                stepDuration={0.35}
                blur={10}
                distance={36}
              />
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
              Meet the top board of {EVENT.host}, the team behind {EVENT.name}.
            </p>
          </div>

          <figure data-reveal className="reveal m-0">
            <img
              src={TEAM.photoUrl}
              alt={TEAM.alt}
              width={TEAM.width}
              height={TEAM.height}
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded-3xl object-cover"
            />
            <figcaption className="mt-3 text-sm text-muted-foreground">{TEAM.caption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
