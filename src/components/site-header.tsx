import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { NAV_SECTIONS, EVENT } from "@/lib/content";
import GradualBlur from "@/components/bits/gradual-blur";


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
        height="7rem"
        strength={2.5}
        layers={10}
        curve="bezier"
        exponential
        opacity={1}
        saturation={1.1}
        tint="rgba(7, 8, 10, 0.88)"
        zIndex={0}
      />

      {/* The GradualBlur above is the nav background: no bar, no border. */}
      <div className="relative z-10">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-5 sm:px-8 lg:px-14 xl:px-20">
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
            <LiquidGlassButton
              asChild
              variant="gold"
              size="sm"
              className="font-medium"
            >
              <Link to="/register">
                Register
              </Link>
            </LiquidGlassButton>

            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
              className="apple-liquid-glass grid h-9 w-9 p-0 rounded-xl"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — solid surface above the blur so it stays readable */}
      <div
        id="mobile-menu"
        className={cn(
          "relative z-20 overflow-hidden border-t border-hairline bg-background transition-[max-height] duration-300 ease-out",
          open ? "max-h-80" : "max-h-0",
        )}
      >
        <nav
          aria-label="Mobile page sections"
          className="flex w-full flex-col gap-1 px-5 py-4 sm:px-8 lg:px-14 xl:px-20"
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
          <LiquidGlassButton
            variant="gold"
            size="default"
            onClick={() => {
              setOpen(false);
              void navigate({ to: "/register" });
            }}
            className="mt-2 w-full justify-center"
          >
            Register for {EVENT.name}
          </LiquidGlassButton>
        </nav>
      </div>
    </header>
  );
}
