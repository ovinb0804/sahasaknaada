import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useReveal } from "@/hooks/use-reveal";
import { getSession, onAuthChange, signIn, signOut, type Session } from "@/lib/supabase";
import { getStaffProfile, listSchools, type School, type StaffProfile } from "@/lib/registration";
import { AdminTopBar, Tabs, type Tab } from "@/components/admin/primitives";
import { Overview } from "@/components/admin/overview";
import { Schools } from "@/components/admin/schools";
import { CheckIn } from "@/components/admin/checkin";
import { ExportPanel } from "@/components/admin/export";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Organizer Dashboard — Sahasaknaada" },
      {
        name: "description",
        content:
          "Private organizer dashboard for Sahasaknaada registrations, check-in and reports.",
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
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
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
    <div className="grid min-h-screen place-items-center px-5">
      <div
        data-reveal
        className="reveal w-full max-w-sm rounded-3xl border border-hairline bg-surface p-8"
      >
        <div className="mb-6 flex items-center gap-2 text-gold">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-[0.18em]">Organizer access</span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Sign in to the dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For organizers and check-in desk staff only.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive-foreground">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="mt-2 border border-gold/40 bg-primary text-primary-foreground hover:border-gold/70 hover:bg-secondary focus-visible:ring-gold"
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <Link
          to="/"
          className="mt-5 inline-block text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to the public site
        </Link>
      </div>
    </div>
  );
}

function NoAccess({ session }: { session: Session }) {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-md rounded-3xl border border-hairline bg-surface p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">No organizer access yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re signed in as <strong className="text-foreground">{session.email}</strong>, but
          this account hasn&apos;t been added to the organizing team. Ask an admin to add you.
        </p>
        <p className="mt-3 break-all rounded-lg bg-background p-3 font-mono text-xs text-muted-foreground">
          {session.userId}
        </p>
        <Button onClick={() => void signOut()} variant="outline" className="mt-6">
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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSchools(await listSchools());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load registrations.");
    } finally {
      setLoaded(true);
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

  return (
    <div className="min-h-screen">
      <AdminTopBar staff={staff} onSignOut={onSignOut} />
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <Tabs tab={tab} setTab={setTab} />
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <span>{error}</span>
            <button
              onClick={() => void refresh()}
              className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-background"
            >
              Retry
            </button>
          </div>
        )}
        <div className="mt-8">
          {!loaded ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gold" aria-label="Loading" />
          ) : (
            <>
              {tab === "overview" && (
                <Overview schools={schools} isAdmin={staff.role === "admin"} />
              )}
              {tab === "schools" && (
                <Schools schools={schools} staff={staff} onChanged={() => void refresh()} />
              )}
              {tab === "checkin" && <CheckIn schools={schools} onChanged={() => void refresh()} />}
              {tab === "export" && <ExportPanel schools={schools} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
