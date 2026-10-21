import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { EVENT, FOOTER_SOCIALS, COPYRIGHT_YEAR } from "@/lib/content";

export function SiteFooter() {
  const year = COPYRIGHT_YEAR;
  return (
    <footer className="border-t border-hairline bg-background">
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
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
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {FOOTER_SOCIALS.map((s) => (
                <li key={s.label}>
                  {s.href ? (
                    <a
                      href={s.href}
                      className="text-sm text-foreground transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {s.label}
                    </a>
                  ) : (
                    <span
                      className="text-sm text-muted-foreground"
                      title="Link to be added by the site editor"
                    >
                      {s.label} · to be added
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Contact details to be added by the site editor.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>
            © {year} {EVENT.host}. Placeholder — replace with the confirmed edition year.
          </p>
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
