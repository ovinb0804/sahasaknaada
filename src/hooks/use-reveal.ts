import { useEffect, useRef } from "react";

/**
 * Reveal-on-scroll using IntersectionObserver, with a graceful static
 * fallback for reduced-motion / no-IO. Add `data-reveal` (or pass
 * `selector`) to any element; it toggles the `.is-visible` class that
 * the `.reveal` utility in styles.css animates.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(selector = "[data-reveal]") {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current ?? document;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const seen = new WeakSet<HTMLElement>();

    let io: IntersectionObserver | null = null;
    if (!reduce && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              io?.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px 50px 0px", threshold: 0.05 },
      );
    }

    const checkElement = (el: HTMLElement) => {
      if (el.classList.contains("is-visible")) return;

      const rect = el.getBoundingClientRect();
      if (reduce || !io || (rect.top < window.innerHeight && rect.bottom > 0)) {
        el.classList.add("is-visible");
        return;
      }

      if (!seen.has(el)) {
        seen.add(el);
        io.observe(el);
      }
    };

    const scan = () => {
      const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
      els.forEach(checkElement);
    };

    scan();

    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(() => {
        scan();
      });
      mo.observe(root, { childList: true, subtree: true });
    }

    return () => {
      mo?.disconnect();
      io?.disconnect();
    };
  }, [selector]);

  return ref;
}
