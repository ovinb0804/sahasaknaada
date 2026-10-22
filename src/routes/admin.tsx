import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { getSession, onAuthChange, signIn, signOut, type Session } from "@/lib/supabase";
import { getStaffProfile, listSchools, type School, type StaffProfile } from "@/lib/registration";
import { flattenMembers, memberStatus } from "@/lib/admin-helpers";
import { AdminTopBar, Tabs, type Tab, type TabCounts } from "@/components/admin/primitives";
import { Overview } from "@/components/admin/overview";
import { Schools } from "@/components/admin/schools";
import { CheckInDesk } from "@/components/admin/checkin-desk";
import { Registrations } from "@/components/admin/registrations";
import { ExportPanel } from "@/components/admin/export";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Organizer Dashboard — Sahasak Naada" },
      {
        name: "description",
        content:
          "Private organizer dashboard for Sahasak Naada registrations, check-in and reports.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Auth =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "no-access"; session: Session }
  | { status: "ready"; staff: StaffProfile };

function AdminPage() {
  useReveal();
  const [auth, setAuth] = useState<Auth>({ status: "loading" });

  const resolve = useCallback(async () => {
    const session = await getSession();
    if (!session) {
      setAuth({ status: "signed-out" });
      return;
    }
    try {
      const staff = await getStaffProfile(session.userId);
      setAuth(staff ? { status: "ready", staff } : { status: "no-access", session });
    } catch {
      setAuth({ status: "no-access", session });
    }
  }, []);

  useEffect(() => {
    void resolve();
    return onAuthChange(() => void resolve());
  }, [resolve]);

  if (auth.status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Loading" />
      </div>
    );
  }
  if (auth.status === "signed-out") return <AdminSignIn />;
  if (auth.status === "no-access") return <NoAccess session={auth.session} />;
  return <AdminDashboard staff={auth.staff} onSignOut={() => void signOut()} />;
}

function AdminSignIn() {
  useReveal();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email, pass);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-5 py-12 overflow-hidden bg-background">
      {/* Background ambient lighting */}
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      <div
        data-reveal
        className="reveal relative z-10 w-full max-w-md rounded-3xl border border-hairline/80 bg-surface/90 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-2 text-gold">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Authorized Access Only</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Organizer Command
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Sign in to manage delegations, scan passes, and operate the check-in desk for Sahasak
          Naada &apos;26.
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@dsse.edu"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3.5 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition"
              />
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPass ? "text" : "password"}
                required
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition"
              />
              <button
                type="button"
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-medium text-destructive-foreground animate-in shake duration-200"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="mt-2 min-h-11 rounded-xl bg-gold font-bold text-black hover:brightness-110 active:scale-95 transition shadow-lg shadow-gold/20 cursor-pointer"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-black" />
                Signing in…
              </span>
            ) : (
              "Sign In to Dashboard"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-hairline/60 flex items-center justify-between text-xs">
          <Link
            to="/"
            className="text-muted-foreground hover:text-gold transition font-medium"
          >
            ← Back to public site
          </Link>
          <span className="text-[11px] text-muted-foreground">Sahasak Naada &apos;26</span>
        </div>
      </div>
    </div>
  );
}

function NoAccess({ session }: { session: Session }) {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface p-8 shadow-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight">No organizer access yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re signed in as <strong className="text-foreground">{session.email}</strong>, but
          this account hasn&apos;t been added to the organizing team. Ask an admin to add you.
        </p>
        <p className="mt-3 break-all rounded-lg bg-background p-3 font-mono text-xs text-muted-foreground">
          {session.userId}
        </p>
        <Button onClick={() => void signOut()} variant="outline" className="mt-6 rounded-xl">
          Sign out
        </Button>
      </div>
    </div>
  );
}

function AdminDashboard({ staff, onSignOut }: { staff: StaffProfile; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("checkin");
  const [schools, setSchools] = useState<School[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setSchools(await listSchools());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load registrations.");
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Several desks may be checking people in at once — keep numbers fresh.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  const activeSchools = useMemo(() => schools.filter((s) => s.status !== "cancelled"), [schools]);
  const allMembers = useMemo(() => flattenMembers(activeSchools), [activeSchools]);
  const liveMembers = useMemo(
    () => allMembers.filter((r) => memberStatus(r.member) !== "cancelled"),
    [allMembers],
  );
  const arrivedCount = useMemo(
    () => liveMembers.filter((r) => r.member.checked_in_at).length,
    [liveMembers],
  );

  const tabCounts: TabCounts = useMemo(
    () => ({
      checkin: { arrived: arrivedCount, total: liveMembers.length },
      schools: activeSchools.length,
      registrations: liveMembers.length,
    }),
    [arrivedCount, liveMembers.length, activeSchools.length],
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminTopBar
        staff={staff}
        onSignOut={onSignOut}
        onRefresh={refresh}
        isRefreshing={refreshing}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <Tabs
          tab={tab}
          setTab={setTab}
          isAdmin={staff.role === "admin"}
          counts={tabCounts}
        />

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm shadow-md"
          >
            <span className="font-medium text-destructive-foreground">{error}</span>
            <button
              onClick={() => void refresh()}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold hover:border-gold/40 hover:text-gold transition cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mt-8">
          {!loaded ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gold" aria-label="Loading dashboard" />
              <p className="text-xs text-muted-foreground font-mono">Synchronizing live data…</p>
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <Overview
                  schools={schools}
                  isAdmin={staff.role === "admin"}
                  onNavigateTab={(nextTab) => setTab(nextTab)}
                />
              )}
              {tab === "schools" && (
                <Schools schools={schools} staff={staff} onChanged={() => void refresh()} />
              )}
              {tab === "registrations" && (
                <Registrations
                  schools={schools}
                  isAdmin={staff.role === "admin"}
                  onChanged={() => void refresh()}
                />
              )}
              {tab === "checkin" && (
                <CheckInDesk schools={schools} onChanged={() => void refresh()} />
              )}
              {tab === "export" && staff.role === "admin" && <ExportPanel schools={schools} />}
            </>
          )}
        </div>

        {/* Bottom THENUX watermark footer */}
        <footer className="mt-16 border-t border-hairline/60 pt-6 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Sahasak Naada • All Rights Reserved</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Designed &amp; Developed by
            </span>
            <span className="font-display text-xs font-black tracking-widest text-gold bg-gold/10 border border-gold/30 px-2.5 py-0.5 rounded-md shadow-[0_0_12px_rgba(245,185,33,0.18)] select-none">
              THENUX
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
