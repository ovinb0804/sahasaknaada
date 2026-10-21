import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { BackLink, GoldPanel, RegisterShell } from "@/components/register/shared";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { getEventSettings, type EventSettings } from "@/lib/registration";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register/")({
  head: () => ({
    meta: [
      { title: "Register — Sahasaknaada" },
      {
        name: "description",
        content:
          "Register for Sahasaknaada, the inter-school audio workshop by the Radio Club of D. S. Senanayake College.",
      },
    ],
  }),
  component: RegisterEntry,
});

function RegisterEntry() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  useEffect(() => {
    let active = true;
    void getEventSettings().then((s) => active && setSettings(s));
    return () => {
      active = false;
    };
  }, []);
  const schoolsFirst = (settings?.registration_phase ?? "schools_first") === "schools_first";

  return (
    <RegisterShell>
      <BackLink to="/">Back to home</BackLink>
      <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white text-balance sm:text-5xl">
        Register for <span className="text-[#F5B921]">Sahasaknaada</span>
      </h1>
      <p className="mt-3 max-w-2xl text-base text-[var(--reg-text-2)]">
        Registration is school-first. A school registers once and receives a short code and a QR
        code. Students then register using that code.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <GoldPanel className={cn("flex flex-col", schoolsFirst && "md:scale-[1.02]")}>
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Step 1</p>
          <h2 className="mt-2 font-display text-3xl font-bold">Register your school</h2>
          <p className="mt-3 flex-1 text-base">
            A radio club or school representative registers the school and gets a code to share.
          </p>
          <LiquidGlassButton
            asChild
            variant="glass"
            size="lg"
            className="mt-8 font-semibold"
          >
            <Link to="/register/school">
              Register your school <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </LiquidGlassButton>
        </GoldPanel>

        <GoldPanel className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">Step 2</p>
          <h2 className="mt-2 font-display text-3xl font-bold">I have a school code</h2>
          <p className="mt-3 flex-1 text-base">
            Students register using the code or QR their school received.
          </p>
          <LiquidGlassButton
            asChild
            variant="glass"
            size="lg"
            className="mt-8 font-semibold"
          >
            <Link to="/register/member">
              Register as a member <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </LiquidGlassButton>
        </GoldPanel>
      </div>
    </RegisterShell>
  );
}
