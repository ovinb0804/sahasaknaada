import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { EVENT, FOOTER_SOCIALS, COPYRIGHT_YEAR, type FooterLink } from "@/lib/content";

function SocialIcon({ name }: { name: NonNullable<FooterLink["icon"]> }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "instagram") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  if (name === "facebook") {
    return (
      <svg {...common}>
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3z" />
      <path d="M9 9.2c0 3.2 2.6 5.8 5.8 5.8l1.4-1.4-2-1-.9.8a4 4 0 0 1-2.3-2.3l.8-.9-1-2z" />
    </svg>
  );
}

export function SiteFooter() {
  const year = COPYRIGHT_YEAR;
  return (
    <footer className="border-t border-hairline bg-background">
      <div className="w-full px-5 py-14 sm:px-8 lg:px-14 xl:px-20">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground">
              {EVENT.host}. {EVENT.tagline}.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Follow
            </p>
            <ul className="flex flex-wrap gap-3">
              {FOOTER_SOCIALS.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={l.label}
                      className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2 text-sm text-foreground transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {l.icon && <SocialIcon name={l.icon} />}
                      <span>{l.label}</span>
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {year} {EVENT.host}.
          </p>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground/25 select-none hover:text-muted-foreground/50 transition">
            THENUX
          </span>
          <Link
            to="/admin"
            className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Organizer sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
