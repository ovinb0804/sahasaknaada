import { useEffect, useMemo, useState } from "react";

import DriftWall from "@/components/bits/drift-wall";
import { BlurText } from "@/components/bits/blur-text";
import { GALLERY } from "@/lib/content";

/** Wall geometry per screen width (set after mount so SSR markup matches). */
function useWallLayout() {
  const [w, setW] = useState(1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  if (w < 640) return { columns: 3, tileWidth: 150, tileHeight: 104, gap: 12, height: 480 };
  if (w < 1024) return { columns: 4, tileWidth: 190, tileHeight: 128, gap: 16, height: 560 };
  return { columns: 6, tileWidth: 240, tileHeight: 160, gap: 18, height: 640 };
}

/**
 * Previous workshop photos on a React Bits DriftWall: columns of tiles that
 * drift in alternating directions. Replaces the old scroll-snap carousel.
 */
export function Gallery() {
  const layout = useWallLayout();
  const items = useMemo(
    () => GALLERY.filter((g) => g.src).map((g) => ({ image: g.src as string, title: g.alt })),
    [],
  );

  return (
    <section
      id="gallery"
      className="relative overflow-hidden border-b border-hairline"
      style={{ scrollMarginTop: "5.5rem" }}
    >
      <div className="relative z-10 w-full px-5 pt-20 sm:px-8 lg:px-14 xl:px-20 md:pt-24">
        <div className="flex flex-col items-center text-center">
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
            Moments from our previous workshops at D. S. Senanayake College.
          </p>
        </div>
      </div>

      <div className="relative w-full" style={{ height: layout.height }}>
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
          parallax={0.6}
          lift={44}
          fade={0.6}
          dim={0.55}
          overlayColor="#060010"
        />
      </div>
    </section>
  );
}
