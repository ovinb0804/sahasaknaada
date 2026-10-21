import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { RegisterAtmosphere } from "@/components/home/register-atmosphere";
import { PassSheet } from "@/components/pass-card";
import { getSchoolPasses, type SchoolPasses } from "@/lib/registration";

export const Route = createFileRoute("/passes")({
  head: () => ({
    meta: [
      { title: "Get your passes — Sahasaknaada" },
      { name: "description", content: "Find your school's Sahasaknaada entry passes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PassesPage,
});

function PassesPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SchoolPasses | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await getSchoolPasses(code, email);
      if (!res) setError("We couldn't find a registration with that school code and email.");
      setData(res);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <RegisterAtmosphere />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 md:py-16">
        <Link
          to="/register"
          className="no-print inline-flex items-center gap-2 text-sm font-medium text-[var(--reg-text-2)] hover:text-[var(--reg-text)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to registration
        </Link>
        <h1 className="no-print mt-6 font-display text-4xl font-bold tracking-tight text-[var(--reg-text)]">
          Get your passes
        </h1>
        <p className="no-print mt-2 text-sm text-[var(--reg-text-2)]">
          Enter the school code you received when you registered and the contact email you used.
        </p>

        <form
          onSubmit={lookup}
          className="reg-panel no-print mt-8 grid gap-4 px-6 py-6 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--reg-text)]">
            School code
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="SCH-XXXXXX"
              autoCapitalize="characters"
              autoComplete="off"
              className="reg-input px-3.5 py-2.5 font-mono text-base uppercase"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-[var(--reg-text)]">
            Contact email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="reg-input px-3.5 py-2.5 text-base"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="reg-cta inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Find passes
          </button>
        </form>

        {error && (
          <p role="alert" className="no-print mt-4 text-sm font-medium text-[#f78a6e]">
            {error}
          </p>
        )}

        {data && (
          <div className="mt-8">
            <PassSheet data={data} />
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
