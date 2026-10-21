import { BlurText } from "@/components/bits/blur-text";
import { AGENDA } from "@/lib/content";

export function Agenda() {
  return (
    <section id="agenda" className="border-b border-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 md:py-28">
        <div className="grid gap-10 md:grid-cols-[0.4fr_0.6fr] md:gap-16">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              The day
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              <BlurText
                text="Agenda"
                trigger="view"
                effect="blur"
                animateBy="letters"
                direction="top"
                delay={50}
                stepDuration={0.4}
                blur={12}
                distance={40}
              />
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty">
              The final agenda is being confirmed by the organizers. Until then, this is a clearly
              marked placeholder — not a final schedule.
            </p>
          </div>

          <ol className="divide-y divide-hairline border-y border-hairline">
            {AGENDA.map((entry) => (
              <li
                key={entry.id}
                data-reveal
                className="reveal flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                  <span className="text-lg font-medium text-foreground">{entry.item}</span>
                  {entry.isPlaceholder && (
                    <span className="rounded-full border border-hairline px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      To be announced
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-display text-lg font-semibold text-gold tabular-nums">
                  {entry.time}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
