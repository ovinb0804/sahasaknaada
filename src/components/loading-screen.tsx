import { useEffect, useState } from "react";

import { EVENT } from "@/lib/content";

/*
 * LoadingScreen — branded preloader shown once per browser session.
 *
 * Near-black canvas. The Sahasak Naada logo is revealed with a soft left-to-right
 * wipe (blur-to-sharp, slight rise), a gold light sweeps across the lettering,
 * and a thin gold progress line fills beneath it. After the hold, the whole
 * screen eases out (fade + gentle zoom) and unmounts so it never blocks the UI.
 *
 * It rendered on the server too, so the page never flashes before it appears.
 * Skipped for reduced-motion users and on repeat visits in the same session.
 * If the page is still loading when the hold ends, it waits (up to a cap).
 */
const STORAGE_KEY = "sahasaknaada-preloader-seen";
const HOLD_MS = 3000; // time on screen before the exit starts
const MAX_WAIT_MS = 2500; // extra time allowed for a slow page load
const EXIT_MS = 900;

export const PRELOADER_LOGO = "/logos/sahasak-naada.png";

export function LoadingScreen() {
  const [phase, setPhase] = useState<"show" | "hide" | "done">("show");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    let seen = false;
    try {
      seen = Boolean(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      /* sessionStorage may be unavailable */
    }
    if (reduce || seen) {
      setPhase("done");
      return;
    }

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    const timers: number[] = [];
    let exited = false;
    const exit = () => {
      if (exited) return;
      exited = true;
      root.style.overflow = prevOverflow;
      setPhase("hide");
      timers.push(
        window.setTimeout(() => {
          setPhase("done");
          try {
            sessionStorage.setItem(STORAGE_KEY, "1");
          } catch {
            /* ignore */
          }
        }, EXIT_MS),
      );
    };

    timers.push(
      window.setTimeout(() => {
        if (document.readyState === "complete") {
          exit();
        } else {
          window.addEventListener("load", exit, { once: true });
          timers.push(window.setTimeout(exit, MAX_WAIT_MS));
        }
      }, HOLD_MS),
    );

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("load", exit);
      root.style.overflow = prevOverflow;
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      className="pl-overlay"
      data-phase={phase}
      role="status"
      aria-live="polite"
      aria-label={`${EVENT.name} is loading`}
      style={{ ["--pl-hold" as string]: `${HOLD_MS}ms`, ["--pl-exit" as string]: `${EXIT_MS}ms` }}
    >
      <div className="pl-bloom" aria-hidden />

      <div className="pl-stage">
        <div className="pl-logo" style={{ ["--pl-src" as string]: `url(${PRELOADER_LOGO})` }}>
          <img
            src={PRELOADER_LOGO}
            alt=""
            width={1400}
            height={834}
            draggable={false}
            decoding="async"
            fetchPriority="high"
          />
          <span className="pl-shine" aria-hidden />
        </div>

        <div className="pl-bar" aria-hidden>
          <span className="pl-bar-fill" />
        </div>

        <p className="pl-host">{EVENT.host}</p>
      </div>
    </div>
  );
}
