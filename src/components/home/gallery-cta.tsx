import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { BlurText } from "@/components/bits/blur-text";
import { Button } from "@/components/ui/button";

export function GalleryCta() {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 md:py-20">
        <div
          data-reveal
          className="reveal relative overflow-hidden rounded-3xl border border-[#e5a710] bg-[#f5b921] px-8 py-12 text-[#0a0a0a] shadow-[0_16px_50px_-12px_rgba(245,185,33,0.35)] sm:px-14 md:py-16"
        >
          <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0a0a0a] sm:text-4xl md:text-5xl">
                <BlurText
                  text="Be part of the room where sound comes alive."
                  trigger="view"
                  effect="blur"
                  animateBy="words"
                  direction="top"
                  delay={90}
                  stepDuration={0.35}
                  blur={10}
                  distance={32}
                />
              </h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-[#0a0a0a]/80">
                Schools from anywhere are welcome to register a team and take part in Sahasaknaada.
              </p>
            </div>

            <Button
              asChild
              size="lg"
              className="shrink-0 rounded-xl border border-black bg-black px-6 py-3 font-semibold text-white shadow-md transition-colors hover:bg-black/85 focus-visible:ring-2 focus-visible:ring-black"
            >
              <Link
                to="/register"
                className="inline-flex items-center gap-2 focus-visible:outline-none"
              >
                Register Now
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
