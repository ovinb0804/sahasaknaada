import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { NAV_SECTIONS, EVENT } from "@/lib/content";
import { GradualBlur } from "@/components/bits/gradual-blur";

import "@/components/bits/gradual-blur.css";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Close mobile menu on route change / resize.
  useEffect(() => {
    const onResize = () => setOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* GradualBlur sits behind the nav content. It blurs the page content
          scrolling under the header and fades into the near-black background.
          pointer-events:none on the blur layers keeps clicks reaching the UI. */}
      <GradualBlur
        position="top"
        target="page"
        height="6rem"
        strength={2}
        layers={8}
        curve="bezier"
        exponential
        opacity={0.8}
        saturation={1}
        tint="#07080A"
        duration={0.3}
        zIndex={0}
      />

      {/* Nav content sits above the blur. Translucent near-black surface with
          a fine border; the GradualBlur supplies the soft atmospheric edge. */}
      <div className="relative z-10 border-b border-hairline/80 bg-background/72 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Logo />

          <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
            {NAV_SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="hidden border border-gold/40 bg-primary text-primary-foreground transition-colors hover:border-gold/70 hover:bg-secondary focus-visible:ring-gold sm:inline-flex"
            >
              <Link to="/register" className="focus-visible:outline-none">
                Register
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="border border-gold/40 bg-primary text-primary-foreground transition-colors hover:border-gold/70 hover:bg-secondary focus-visible:ring-gold sm:hidden"
            >
              <Link to="/register" className="focus-visible:outline-none">
                Register
              </Link>
            </Button>

            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — solid surface above the blur so it stays readable */}
      <div
        id="mobile-menu"
        className={cn(
          "relative z-20 overflow-hidden border-t border-hairline bg-background transition-[max-height] duration-300 ease-out md:hidden",
          open ? "max-h-80" : "max-h-0",
        )}
      >
        <nav
          aria-label="Mobile page sections"
          className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4"
        >
          {NAV_SECTIONS.map((s) => (
            <a
              key={s.href}
              href={s.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.label}
            </a>
          ))}
          <Button
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/register" });
            }}
            className="mt-2 border border-gold/40 bg-primary text-primary-foreground hover:border-gold/70 hover:bg-secondary focus-visible:ring-gold"
          >
            Register for {EVENT.name}
          </Button>
        </nav>
      </div>
    </header>
  );
}
