import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BlurText } from "@/components/bits/blur-text";
import { Button } from "@/components/ui/button";
import { EVENT } from "@/lib/content";

export function RegisterCtaBand() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 md:py-28">
        <div
          data-reveal
          className="reveal relative overflow-hidden rounded-4xl border border-[#e5a710] bg-[#f5b921] px-8 py-14 text-[#0a0a0a] shadow-[0_20px_60px_-15px_rgba(245,185,33,0.35)] sm:px-14 md:py-20"
        >
          <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0a0a0a]/75">
                {EVENT.tagline}
              </p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-tight text-[#0a0a0a] sm:text-5xl md:text-6xl text-balance">
                <BlurText
                  text="Your place at Sahasaknaada is one registration away."
                  trigger="view"
                  effect="blur"
                  animateBy="words"
                  direction="top"
                  delay={80}
                  stepDuration={0.35}
                  blur={10}
                  distance={36}
                />
              </h2>
              <p className="mt-5 text-lg font-medium leading-relaxed text-[#0a0a0a]/80 text-pretty">
                Register your school's team for the inter-school audio workshop. Every member gets
                an entry pass with a QR code for a quick check-in on the day.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="shrink-0 rounded-xl border border-black bg-black px-7 py-3.5 font-semibold text-white shadow-md transition-colors hover:bg-black/85 focus-visible:ring-2 focus-visible:ring-black"
            >
              <Link
                to="/register"
                className="inline-flex items-center gap-2 focus-visible:outline-none"
              >
                Register
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
