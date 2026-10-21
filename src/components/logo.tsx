import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { EVENT } from "@/lib/content";

/**
 * Sahasaknaada wordmark. A clean, restrained emblem — not an invented
 * official school crest. Replace the mark with the supplied approved logo
 * asset when provided (see src/lib/content.ts → EVENT).
 */
export function Logo({ className, onDark = true }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      to="/"
      aria-label={`${EVENT.name} — home`}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-10 w-10 place-items-center overflow-hidden rounded-xl border p-1 transition-colors",
          onDark
            ? "border-border bg-surface text-gold"
            : "border-black/10 bg-black/5 text-gold-deep",
        )}
      >
        <img src={EVENT.logoUrl} alt="" className="h-full w-full object-contain" />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-base font-bold tracking-tight",
            onDark ? "text-foreground" : "text-foreground",
          )}
        >
          {EVENT.name}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {EVENT.tagline}
        </span>
      </span>
    </Link>
  );
}

function Mark({ className }: { className?: string }) {
  // A stylized waveform + node — reads as "sound / signal".
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12h2l2 -5 3 11 3 -8 2 5 2 -3h4" />
    </svg>
  );
}
