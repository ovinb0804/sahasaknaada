import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

import { EVENT } from "@/lib/content";

/*
 * RouteTransition — branded loading overlay shown during route navigation.
 *
 * When the router enters a pending state (e.g. navigating from "/" to
 * "/register"), this overlay fades in with the same Sahasaknaada identity
 * treatment as the intro screen: dark canvas, the approved logo with a soft
 * warm-gold bloom, the wordmark + tagline, and a restrained sound-waveform
 * indicator. It fades out cleanly once the destination route finishes loading.
 *
 * It only reacts to actual route changes — not in-page scrolling — and
 * dismisses immediately when reduced motion is enabled.
 */

const FADE_MS = 420;
const MIN_SHOW_MS = 360;

export function RouteTransition() {
  const status = useRouterState({ select: (s) => s.status });
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  const [phase, setPhase] = useState<"hidden" | "show" | "hide">("hidden");
  const showTimer = useRef<number>(0);
  const hideTimer = useRef<number>(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }, []);

  useEffect(() => {
    window.clearTimeout(showTimer.current);
    window.clearTimeout(hideTimer.current);

    const pending = status === "pending" || isLoading;

    if (pending) {
      // Only show if the transition actually takes a beat — avoids a flash
      // for instant/same-route navigations.
      showTimer.current = window.setTimeout(() => {
        if (reduced.current) return;
        setPhase("show");
      }, MIN_SHOW_MS);
    } else if (phase !== "hidden") {
      setPhase("hide");
      hideTimer.current = window.setTimeout(() => setPhase("hidden"), FADE_MS);
    }

    return () => {
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isLoading]);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden
      className="intro-overlay route-transition"
      data-phase={phase === "show" ? undefined : "hide"}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="intro-bloom" aria-hidden />

      <div className="intro-stage">
        <div className="intro-logo-wrap">
          <div className="intro-halo" aria-hidden />
          <div className="intro-ring" aria-hidden />
          <img src={EVENT.logoUrl} alt={EVENT.name} className="intro-logo" draggable={false} />
        </div>

        <div className="intro-words">
          <span className="intro-name">{EVENT.name}</span>
          <span className="intro-tag">{EVENT.tagline}</span>
        </div>

        <div className="intro-wave" role="presentation">
          {WAVE.map((h, i) => (
            <span
              key={i}
              className="intro-bar"
              style={{
                animationDelay: `${i * 90}ms`,
                animationDuration: `${900 + (i % 3) * 180}ms`,
                height: `${h}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const WAVE = [38, 64, 92, 72, 100, 56, 80, 44];
