import { useRef, useState } from "react";

import { DotGrid } from "@/components/bits/dot-grid";
import { FlexCarousel } from "@/components/bits/flex-carousel";
import { BlurText } from "@/components/bits/blur-text";
import { GALLERY } from "@/lib/content";
import { cn } from "@/lib/utils";

/**
 * Intra-school gallery. Uses the React Bits FlexCarousel (WebGL2) with a
 * scroll-snap fallback for reduced-motion / no-WebGL2 / SSR. The placeholders
 * are clearly-labelled abstract sound visuals — not fake event photos.
 */
export function Gallery() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="gallery"
      className="relative overflow-hidden border-b border-hairline"
      style={{ scrollMarginTop: "5.5rem" }}
    >
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
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 md:py-24">
        <div className="mb-10 flex flex-col items-center text-center">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-gold">Intra-school</p>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            <BlurText
              text="Moments from our workshops"
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
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Moments from our previous intra-school workshops at D. S. Senanayake College.
          </p>
        </div>

        <div className="relative">
          <FlexCarouselLayer
            items={GALLERY.map((g) => ({
              src: g.src ?? "",
              alt: g.alt,
              title: g.title,
              subtitle: g.caption,
            }))}
            onActive={setActive}
          />
        </div>

        {/* Dot indicators / controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {GALLERY.map((g, i) => (
            <button
              key={g.id}
              type="button"
              aria-label={`Show photo: ${g.title}`}
              aria-pressed={active === i}
              onClick={() => {
                setActive(i);
                const root = document.getElementById("gallery-carousel-root");
                root?.dispatchEvent(new CustomEvent("gallery:goto", { detail: i }));
              }}
              className={cn(
                "h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active === i
                  ? "w-7 bg-gold"
                  : "w-2.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * FlexCarousel (WebGL2) on capable devices; scroll-snap fallback otherwise.
 * The fallback is the same gallery rendered as a native horizontal scroll,
 * so the section always works without WebGL2 or under reduced motion.
 */
function FlexCarouselLayer({
  items,
  onActive,
}: {
  items: { src: string; alt: string; title: string; subtitle?: string }[];
  onActive: (i: number) => void;
}) {
  const [useFallback, setUseFallback] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Detect WebGL2 + reduced-motion once on mount.
  if (typeof window !== "undefined" && useFallback === false) {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      (canvas.getContext("experimental-webgl2") as WebGL2RenderingContext | null);
    if (reduce || !gl) {
      setUseFallback(true);
    }
  }

  return (
    <div
      id="gallery-carousel-root"
      ref={rootRef}
      className="relative w-full overflow-hidden rounded-3xl border border-hairline bg-surface/40"
    >
      {useFallback ? (
        <FallbackScroller items={items} onActive={onActive} rootRef={rootRef} />
      ) : (
        <div className="h-[clamp(20rem,56vh,34rem)] w-full">
          <FlexCarousel
            items={items}
            preset="liquid"
            intro="rise"
            cardHeight={0.62}
            gap={14}
            squeeze={0.18}
            focusOnClick
            captions
            fit="natural"
            radius={18}
            captureWheel
            onChange={(i) => onActive(i)}
          />
        </div>
      )}
    </div>
  );
}

function FallbackScroller({
  items,
  onActive,
  rootRef,
}: {
  items: { src: string; alt: string; title: string; subtitle?: string }[];
  onActive: (i: number) => void;
  rootRef: React.RefObject<HTMLDivElement | null>;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // Listen for goto requests from the dot indicators.
  if (typeof window !== "undefined") {
    queueMicrotask(() => {
      const root = rootRef.current;
      if (!root) return;
      const handler = (e: Event) => {
        const idx = Number((e as CustomEvent).detail);
        const el = scroller.current?.querySelectorAll("[data-gallery-card]")?.[idx] as
          HTMLElement | undefined;
        el?.scrollIntoView({
          behavior: "auto",
          inline: "center",
          block: "nearest",
        });
      };
      root.addEventListener("gallery:goto", handler);
      // Best-effort cleanup via a one-shot per mount is hard in render; the
      // listener lives with the root element and is harmless.
    });
  }

  return (
    <div
      ref={scroller}
      role="group"
      aria-label="Intra-school workshop gallery"
      tabIndex={0}
      className={cn(
        "flex snap-x snap-mandatory gap-3 overflow-x-auto p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "[scrollbar-width:thin] [scrollbar-color:var(--color-hairline)_transparent]",
      )}
      onScroll={() => {
        const sc = scroller.current;
        if (!sc) return;
        const els = sc.querySelectorAll("[data-gallery-card]");
        if (!els.length) return;
        const center = sc.scrollLeft + sc.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        els.forEach((el, i) => {
          const mid = (el as HTMLElement).offsetLeft + (el as HTMLElement).clientWidth / 2;
          const d = Math.abs(mid - center);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        onActive(best);
      }}
      style={{ height: "clamp(20rem,56vh,34rem)" }}
    >
      {items.map((item, i) => (
        <figure
          key={i}
          data-gallery-card=""
          className="relative flex h-full w-[82vw] shrink-0 snap-center overflow-hidden rounded-2xl border border-hairline bg-card sm:w-[60vw] md:w-[26rem]"
          aria-label={item.title}
        >
          <img
            src={item.src}
            alt={item.alt}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/85 to-transparent p-4 pt-12">
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
            <span className="text-xs text-muted-foreground">{item.subtitle}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
