import { useState } from "react";
import { Plus, Minus } from "lucide-react";

import { DotGrid } from "@/components/bits/dot-grid";
import { FAQS } from "@/lib/content";
import { cn } from "@/lib/utils";

export function Faq() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="faq" className="relative overflow-hidden border-b border-hairline">
      {/* Ambient dot-grid background — subtle, restrained, reduced-motion safe */}
      <DotGrid
        className="pointer-events-none absolute inset-0 z-0"
        baseColor="#3c3c46"
        activeColor="#f5b921"
        dotSize={4}
        gap={24}
        proximity={150}
        strength={1}
        swell={0.8}
        stretch={0.5}
        glow={0.55}
        opacity={0.9}
        intro
        mouseInteraction
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-background/40 via-background/10 to-background/60"
        aria-hidden
      />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 md:py-28">
        <div className="mb-10 text-center">
          <h2 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            FAQ
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Answers are being confirmed by the organizers. Placeholders below — not final event
            details.
          </p>
        </div>

        <div className="divide-y divide-hairline border-y border-hairline">
          {FAQS.map((f) => {
            const isOpen = open === f.id;
            const panelId = `faq-panel-${f.id}`;
            const btnId = `faq-btn-${f.id}`;
            return (
              <div key={f.id}>
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? null : f.id)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background rounded"
                  >
                    <span className="text-lg font-medium text-foreground">{f.question}</span>
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-hairline text-muted-foreground transition-colors",
                        isOpen && "border-gold/50 text-gold",
                      )}
                      aria-hidden
                    >
                      {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  hidden={!isOpen}
                  className="overflow-hidden"
                >
                  <p className="pb-6 pr-12 text-base leading-relaxed text-muted-foreground">
                    {f.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
