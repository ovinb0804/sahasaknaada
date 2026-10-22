import { useEffect, useRef } from "react";

/**
 * Subtle animated gold audio waveform for the hero background.
 * Canvas bars driven by layered sine waves; pauses when off-screen or when the
 * viewer prefers reduced motion (a still frame is drawn instead).
 */
export function HeroWaveform({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const gap = w < 640 ? 9 : 12;
      const bars = Math.ceil(w / gap);
      const mid = h / 2;
      const time = t / 1000;
      for (let i = 0; i < bars; i++) {
        const x = i * gap + gap / 2;
        const p = i / bars;
        // layered travelling waves + a slow swelling envelope
        const wave =
          Math.sin(p * 9 + time * 1.1) * 0.5 +
          Math.sin(p * 23 - time * 1.9) * 0.3 +
          Math.sin(p * 51 + time * 2.7) * 0.2;
        const swell = 0.55 + 0.45 * Math.sin(p * 3.2 - time * 0.6);
        const amp = Math.abs(wave) * swell;
        const bh = Math.max(3, amp * h * 0.55);
        ctx.fillStyle = `rgba(245, 185, 33, ${0.1 + amp * 0.22})`;
        ctx.beginPath();
        ctx.roundRect(x - 1.5, mid - bh / 2, 3, bh, 1.5);
        ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (visible) draw(t);
      raf = requestAnimationFrame(loop);
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(0);
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    if (reduce) draw(1500);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{
        width: "100%",
        height: "100%",
        maskImage: "linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)",
        WebkitMaskImage: "linear-gradient(to right, transparent, #000 15%, #000 85%, transparent)",
      }}
    />
  );
}
