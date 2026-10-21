import { useEffect, useState } from "react";

import { EVENT } from "@/lib/content";

/*
 * LoadingScreen — premium intro overlay shown once on first app load.
 *
 * Dark canvas, the approved Sahasaknaada logo as the visual anchor with a
 * soft warm-gold ambient bloom, the wordmark + tagline, and a restrained
 * sound-waveform "loading" indicator. Fades out cleanly after the assets /
 * page have had time to settle, then unmounts so it never blocks the UI.
 *
 * Shows once per browser session (sessionStorage) so reloads during
 * development / navigation don't replay it. Reduced-motion safe: the
 * waveform is static and the overlay dismisses immediately.
 */
const STORAGE_KEY = "sahasaknaada-intro-seen";
const HOLD_MS = 1900;
const FADE_MS = 700;

export function LoadingScreen() {
  const [phase, setPhase] = useState<"show" | "hide" | "done">("show");

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      setPhase("done");
      return;
    }
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) {
        setPhase("done");
        return;
      }
    } catch {
      /* ignore — sessionStorage may be unavailable */
    }

    const fadeTimer = window.setTimeout(() => setPhase("hide"), HOLD_MS);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, HOLD_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden
      className="intro-overlay"
      data-phase={phase}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {/* Ambient warm-gold bloom behind the logo */}
      <div className="intro-bloom" aria-hidden />

      <div className="intro-stage">
        {/* Large, attractive logo anchor with animated halo + ring */}
        <div className="intro-logo-wrap">
          <div className="intro-halo" aria-hidden />
          <div className="intro-ring" aria-hidden />
          <img src={EVENT.logoUrl} alt={EVENT.name} className="intro-logo" draggable={false} />
        </div>

        {/* Wordmark + tagline */}
        <div className="intro-words">
          <span className="intro-name">{EVENT.name}</span>
          <span className="intro-tag">{EVENT.tagline}</span>
        </div>

        {/* Sound-waveform loading indicator */}
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
