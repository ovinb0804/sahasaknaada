import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, School as SchoolIcon, Users } from "lucide-react";

import {
  getEventSettings,
  saveEventSettings,
  type EventSettings,
  type School,
} from "@/lib/registration";

export function Overview({ schools, isAdmin }: { schools: School[]; isAdmin: boolean }) {
  const active = schools.filter((s) => s.status !== "cancelled");
  const members = active.flatMap((s) => s.members);
  const checked = members.filter((m) => m.checked_in_at).length;
  const rate = members.length ? Math.round((checked / members.length) * 100) : 0;
  const review = schools.filter((s) => s.status === "needs_review").length;
  const cancelled = schools.length - active.length;

  const rows = useMemo(
    () =>
      active
        .map((s) => ({
          id: s.id,
          name: s.name,
          total: s.members.length,
          here: s.members.filter((m) => m.checked_in_at).length,
        }))
        .sort((a, b) => b.total - a.total),
    [active],
  );

  const metrics = [
    { label: "Schools registered", value: active.length, icon: SchoolIcon },
    { label: "Members registered", value: members.length, icon: Users },
    { label: "Checked in", value: checked, icon: CheckCircle2 },
    { label: "Not yet arrived", value: members.length - checked, icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cancelled schools are excluded.
          {review > 0 && ` ${review} school${review === 1 ? "" : "s"} need review.`}
          {cancelled > 0 && ` ${cancelled} cancelled.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-hairline bg-surface p-5">
            <m.icon className="h-5 w-5 text-gold" />
            <p className="mt-4 font-display text-3xl font-bold tabular-nums">{m.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Attendance rate
          </h2>
          <p className="mt-3 font-display text-5xl font-bold text-gold">{rate}%</p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-hairline">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {checked} of {members.length} checked in
          </p>
        </div>

        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Arrivals by school
          </h2>
          {rows.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <ul className="mt-4 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="truncate text-foreground">{r.name}</span>
                  <span className="shrink-0 rounded-full border border-hairline px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {r.here}/{r.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isAdmin && <SettingsCard />}
    </div>
  );
}

function SettingsCard() {
  const [s, setS] = useState<EventSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getEventSettings().then(setS);
  }, []);

  if (!s) return null;

  async function save(next: EventSettings) {
    setBusy(true);
    setMsg(null);
    try {
      await saveEventSettings(next);
      setS(next);
      setMsg("Saved.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Registration settings
      </h2>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={s.registration_open}
            disabled={busy}
            onChange={(e) => void save({ ...s, registration_open: e.target.checked })}
            className="h-4 w-4 accent-[var(--gold,#e7b54a)]"
          />
          Registration is open
        </label>
        <label className="flex items-center gap-3 text-sm">
          Max members per school
          <input
            type="number"
            min={1}
            max={100}
            defaultValue={s.max_members_per_school}
            disabled={busy}
            onBlur={(e) => {
              const v = Math.min(
                100,
                Math.max(1, Number(e.target.value) || s.max_members_per_school),
              );
              if (v !== s.max_members_per_school) void save({ ...s, max_members_per_school: v });
            }}
            className="w-20 rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {msg && (
          <span role="status" className="text-xs text-muted-foreground">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
