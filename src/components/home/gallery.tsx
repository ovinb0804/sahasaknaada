import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import DriftWall, { type DriftWallItem } from "@/components/bits/drift-wall";
import { BlurText } from "@/components/bits/blur-text";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { GALLERY, type GalleryItem } from "@/lib/content";
import { useNearViewport, usePerfTier } from "@/lib/perf";

/*
 * DriftWall's own mask feathers the top edge (and the sides via the ellipse).
 * Same mask plus a matching feather at the bottom edge. Fade strength follows
 * the `fade` prop (0.6 → --dw-edge = 40%).
 */
const WALL_MASK =
  "radial-gradient(ellipse 78% 82% at 50% 46%, #000 var(--dw-edge), transparent 100%), " +
  "linear-gradient(to top, #000 var(--dw-edge), transparent 100%), " +
  "linear-gradient(to bottom, #000 var(--dw-edge), transparent 100%)";

/* Cheaper mask for low-end devices: one linear gradient instead of three. */
const WALL_MASK_LITE =
  "linear-gradient(to bottom, transparent 0%, #000 28%, #000 72%, transparent 100%)";

/** Wall geometry per screen width (set after mount so SSR markup matches). */
function useWallLayout(lite: boolean) {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  if (w < 640) return { columns: lite ? 2 : 3, tileWidth: 150, tileHeight: 104, gap: 12 };
  if (w < 1024) return { columns: lite ? 3 : 4, tileWidth: 190, tileHeight: 128, gap: 16 };
  return { columns: lite ? 4 : 6, tileWidth: 240, tileHeight: 160, gap: 18 };
}

/**
 * Previous workshop photos on a React Bits DriftWall: columns of tiles that
 * drift in alternating directions. Replaces the old scroll-snap carousel.
 */
export function Gallery() {
  const tier = usePerfTier();
  const lite = tier === "low";
  const layout = useWallLayout(lite);
  // Only run the wall (rAF loop + 3D layers) while it is near the screen.
  const [wallRef, wallNear] = useNearViewport<HTMLDivElement>("200px");

  const galleryItems = useMemo(
    () => GALLERY.filter((g): g is GalleryItem & { src: string } => Boolean(g.src)),
    [],
  );

  const items = useMemo(
    () => galleryItems.map((g) => ({ image: g.thumb ?? g.src, title: g.alt })),
    [galleryItems],
  );

  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const activePhoto = activePhotoIndex !== null ? galleryItems[activePhotoIndex] : null;

  const handleItemClick = (item: DriftWallItem) => {
    const idx = galleryItems.findIndex((g) => (g.thumb ?? g.src) === item.image);
    if (idx !== -1) {
      setActivePhotoIndex(idx);
    }
  };

  useEffect(() => {
    if (activePhotoIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev > 0 ? prev - 1 : galleryItems.length - 1) : null,
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setActivePhotoIndex((prev) =>
          prev !== null ? (prev < galleryItems.length - 1 ? prev + 1 : 0) : null,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePhotoIndex, galleryItems.length]);

  return (
    <section
      id="gallery"
      className="relative flex flex-col overflow-hidden border-b border-hairline"
      style={{ scrollMarginTop: "5.5rem", height: "100svh", minHeight: "36rem" }}
    >
      <div className="relative z-10 w-full px-5 pt-20 sm:px-8 lg:px-14 xl:px-20 md:pt-24">
        <div className="flex flex-col items-center text-center">
          <p data-reveal className="reveal reveal-fly text-xs font-medium uppercase tracking-[0.28em] text-gold">Intra-school</p>
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
          <p data-reveal className="reveal reveal-fly reveal-d2 mt-3 max-w-md text-sm text-muted-foreground">
            Moments from our previous workshops at D. S. Senanayake College.
          </p>
        </div>
      </div>

      <div ref={wallRef} className="relative min-h-0 w-full flex-1">
        {wallNear && (
        <DriftWall
          items={items}
          columns={layout.columns}
          tileWidth={layout.tileWidth}
          tileHeight={layout.tileHeight}
          gap={layout.gap}
          tilt={0}
          turn={3}
          perspective={1200}
          depth={120}
          speed={42}
          direction="up"
          variance={0.45}
          parallax={0}
          lift={44}
          fade={0.6}
          dim={0.55}
          overlayColor="#060010"
          style={{ maskImage: lite ? WALL_MASK_LITE : WALL_MASK, WebkitMaskImage: lite ? WALL_MASK_LITE : WALL_MASK }}
          onItemClick={handleItemClick}
        />
        )}
      </div>

      {/* Full image preview lightbox */}
      <Dialog
        open={activePhotoIndex !== null}
        onOpenChange={(open) => {
          if (!open) setActivePhotoIndex(null);
        }}
      >
        {activePhoto && activePhotoIndex !== null && (
          <DialogContent className="max-w-[94vw] sm:max-w-4xl lg:max-w-5xl border border-white/10 bg-[#090910]/95 backdrop-blur-2xl p-3 sm:p-5 text-white shadow-2xl rounded-2xl flex flex-col items-center gap-3">
            {/* Header info */}
            <div className="flex w-full items-center justify-between pr-10">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                Intra-School Workshop &bull; {activePhotoIndex + 1} of {galleryItems.length}
              </span>
            </div>

            {/* Main Image with navigation controls */}
            <div className="relative flex w-full max-h-[72vh] items-center justify-center overflow-hidden rounded-xl bg-black/60 py-1">
              <img
                src={activePhoto.src}
                alt={activePhoto.alt || activePhoto.title}
                className="max-h-[66vh] sm:max-h-[70vh] w-auto max-w-full rounded-lg object-contain select-none shadow-2xl transition-all duration-300"
              />

              {galleryItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex((prev) =>
                        prev !== null ? (prev > 0 ? prev - 1 : galleryItems.length - 1) : null,
                      )
                    }
                    aria-label="Previous photo"
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/75 p-2 sm:p-3 text-white/80 backdrop-blur-md transition hover:border-gold/50 hover:bg-black hover:text-gold hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold z-10"
                  >
                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex((prev) =>
                        prev !== null ? (prev < galleryItems.length - 1 ? prev + 1 : 0) : null,
                      )
                    }
                    aria-label="Next photo"
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-black/75 p-2 sm:p-3 text-white/80 backdrop-blur-md transition hover:border-gold/50 hover:bg-black hover:text-gold hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold z-10"
                  >
                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </>
              )}
            </div>

            {/* Caption & Title */}
            <div className="w-full px-2 pb-1 text-center sm:text-left">
              <DialogTitle className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                {activePhoto.title}
              </DialogTitle>
              {activePhoto.caption && (
                <DialogDescription className="mt-1 text-xs sm:text-sm text-neutral-400">
                  {activePhoto.caption}
                </DialogDescription>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
  );
}

