import { useEffect, useRef, useState, type CSSProperties } from "react";

import "./flex-carousel.css";
import {
  BEND_PRESETS,
  type Callbacks,
  type FlexCarouselCurl,
  type FlexCarouselFit,
  type FlexCarouselIntro,
  type FlexCarouselItem,
  type FlexCarouselPreset,
  type Item,
  type Settings,
} from "./flex-carousel-types";
import { createEngine, type FlexCarouselHandle } from "./flex-carousel-engine";

export type { FlexCarouselItem };

export type FlexCarouselProps = {
  items?: FlexCarouselItem[];
  preset?: FlexCarouselPreset;
  intro?: FlexCarouselIntro;
  cardHeight?: number;
  gap?: number;
  squeeze?: number;
  focusOnClick?: boolean;
  captions?: boolean;
  fit?: FlexCarouselFit;
  radius?: number;
  lensWidth?: number;
  lensHeight?: number;
  tilt?: number;
  roundness?: number;
  bend?: number;
  reach?: number;
  curl?: FlexCarouselCurl;
  dispersion?: number;
  liquid?: number;
  followCursor?: boolean;
  autoplay?: boolean;
  interval?: number;
  captureWheel?: boolean;
  onChange?: (index: number, item: Item) => void;
  onSelect?: (index: number, item: Item) => void;
  className?: string;
  style?: CSSProperties;
};

/**
 * FlexCarousel — React Bits (JS + CSS variant), adapted for Sahasaknaada.
 *
 * SSR-safe: all WebGL/window work happens inside useEffect. The component
 * degrades to a no-op (nothing drawn) when WebGL2 is unavailable; callers
 * should render a scroll-snap fallback for reduced-motion / no-WebGL / SSR.
 */
export function FlexCarousel({
  items = [],
  preset = "liquid",
  intro = "rise",
  cardHeight = 0.5,
  gap = 12,
  squeeze = 0.2,
  focusOnClick = true,
  captions = true,
  fit = "natural",
  radius = 0,
  lensWidth,
  lensHeight,
  tilt,
  roundness,
  bend,
  reach,
  curl,
  dispersion,
  liquid,
  followCursor,
  autoplay = false,
  interval = 4,
  captureWheel = true,
  onChange,
  onSelect,
  className = "",
  style,
}: FlexCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<Settings | null>(null);
  const itemsRef = useRef<Item[]>(items);
  const callbacksRef = useRef<Callbacks>({ onChange, onSelect } as Callbacks);
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [focusOpen, setFocusOpen] = useState(false);

  const list = items && items.length ? items : [];
  const base = BEND_PRESETS[preset] || BEND_PRESETS.liquid;
  const pick = <T,>(value: T | undefined, key: keyof typeof base) =>
    (value === undefined || value === null ? base[key] : value) as T;

  const settings: Settings = {
    intro,
    cardHeight,
    gap,
    radius,
    fit,
    lensWidth: pick(lensWidth, "lensWidth"),
    lensHeight: pick(lensHeight, "lensHeight"),
    tilt: pick(tilt, "tilt"),
    roundness: pick(roundness, "roundness"),
    bend: pick(bend, "bend"),
    reach: pick(reach, "reach"),
    curl: pick(curl, "curl"),
    dispersion: pick(dispersion, "dispersion"),
    liquid: pick(liquid, "liquid"),
    followCursor: pick(followCursor, "followCursor"),
    squeeze,
    focusOnClick,
    autoplay,
    interval,
    captureWheel,
  };
  settingsRef.current = settings;
  callbacksRef.current = { onChange, onSelect };

  const itemsKey = list.map((item) => item.src).join("|");

  useEffect(() => {
    itemsRef.current = list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return; // caller renders a scroll-snap fallback
    const handle = createEngine(container, {
      settingsRef,
      itemsRef,
      callbacksRef,
      setRevealed,
      setActive,
      setFocusOpen,
    });
    return () => {
      (handle as FlexCarouselHandle | null)?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the engine's item list in sync when the source list changes.
  useEffect(() => {
    itemsRef.current = list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  const current = list[active] || list[0];
  const label = current ? current.title || current.alt || `Image ${active + 1}` : "";

  return (
    <div
      ref={containerRef}
      className={`flex-carousel ${className}`.trim()}
      style={
        {
          ...style,
          "--flex-carousel-half": `${Math.min(Math.max(cardHeight, 0.05), 1) * 50}%`,
        } as CSSProperties
      }
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      tabIndex={0}
    >
      {captions && current && revealed ? (
        <div className="flex-carousel__caption" aria-hidden="true">
          <span key={active} className="flex-carousel__title">
            {current.title || current.alt}
            {current.subtitle ? (
              <span className="flex-carousel__subtitle">{current.subtitle}</span>
            ) : null}
          </span>
          <span className="flex-carousel__count" data-hidden={focusOpen ? "" : undefined}>
            <Digits value={active + 1} />
            <span className="flex-carousel__slash">/</span>
            <span>{String(list.length).padStart(2, "0")}</span>
          </span>
        </div>
      ) : null}
      <div className="flex-carousel__live" aria-live="polite" aria-atomic="true">
        {`${label}, ${active + 1} of ${list.length}`}
      </div>
    </div>
  );
}

function Digits({ value }: { value: number }) {
  return (
    <span className="flex-carousel__digits">
      {String(value)
        .padStart(2, "0")
        .split("")
        .map((digit, index) => (
          <span key={index} className="flex-carousel__digit">
            <span
              className="flex-carousel__reel"
              style={{ transform: `translateY(${-Number(digit) * 10}%)` }}
            >
              {"0123456789".split("").map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        ))}
    </span>
  );
}

export default FlexCarousel;
