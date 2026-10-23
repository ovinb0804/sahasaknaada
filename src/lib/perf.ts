import { useEffect, useState } from "react";

/**
 * Rough device tier. "low" = devices that struggle with several WebGL canvases,
 * stacked backdrop blurs and constant animation: few CPU cores, little memory,
 * or the user asked to save data. Everything else is "high".
 * Heuristic only — these APIs are missing on some browsers (then we assume high).
 */
export type PerfTier = "high" | "low";

type NavExtra = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectPerfTier(): PerfTier {
  if (typeof navigator === "undefined") return "high";
  const n = navigator as NavExtra;
  if (n.connection?.saveData) return "low";
  if (typeof n.deviceMemory === "number" && n.deviceMemory <= 4) return "low";
  if (typeof n.hardwareConcurrency === "number" && n.hardwareConcurrency <= 4) return "low";
  return "high";
}

/** Marks <html data-perf="low|high"> so CSS can drop expensive effects. Call once on mount. */
export function applyPerfTier(): PerfTier {
  const tier = detectPerfTier();
  if (typeof document !== "undefined") document.documentElement.dataset.perf = tier;
  return tier;
}

/** "high" during SSR / first render (matches server markup), real tier after mount. */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>("high");
  useEffect(() => setTier(applyPerfTier()), []);
  return tier;
}

/** True once the element has been near the viewport; goes false again when far away. */
export function useNearViewport<T extends Element>(rootMargin = "300px") {
  const [el, setEl] = useState<T | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [el, rootMargin]);
  return [setEl, near] as const;
}
