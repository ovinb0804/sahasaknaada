import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { EVENT } from "@/lib/content";

/**
 * Sahasak Naada wordmark. A clean, restrained emblem — not an invented
 * official school crest. Replace the mark with the supplied approved logo
 * asset when provided (see src/lib/content.ts → EVENT).
 */
export function Logo({ className }: { className?: string; onDark?: boolean }) {
  return (
    <Link
      to="/"
      aria-label={`${EVENT.name} — home`}
      className={cn(
        "inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      <img
        src="/logos/reads.png"
        alt="READS logo"
        width={512}
        height={512}
        className="h-11 w-11 object-contain sm:h-12 sm:w-12"
      />
      <img
        src="/logos/school.png"
        alt="D. S. Senanayake College crest"
        width={512}
        height={557}
        className="h-11 w-auto object-contain sm:h-12"
      />
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
