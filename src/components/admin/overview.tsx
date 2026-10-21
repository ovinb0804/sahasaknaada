import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, School as SchoolIcon, Users } from "lucide-react";

import {
  getEventSettings,
  listReviewQueue,
  resolveReviewItem,
  saveEventSettings,
  type EventSettings,
  type RegistrationPhase,
  type ReviewItem,
  type School,
} from "@/lib/registration";
import { flattenMembers, fmtUtcLocal, memberStatus } from "@/lib/admin-helpers";

export function Overview({ schools, isAdmin }: { schools: School[]; isAdmin: boolean }) {
  const activeSchools = schools.filter((s) => s.status !== "cancelled");
  const all = flattenMembers(activeSchools);
  const live = all.filter((r) => memberStatus(r.member) !== "cancelled");
  const cancelledMembers = all.length - live.length;
  const checked = live.filter((r) => r.member.checked_in_at).length;
  const rate = live.length ? Math.round((checked / live.length) * 100) : 0;
  const schoolsReview = schools.filter((s) => s.status === "needs_review").length;
  const membersReview = live.filter((r) => memberStatus(r.member) === "needs_review").length;
  const cancelledSchools = schools.length - activeSchools.length;
  const noMembers = activeSchools.filter((s) => s.members.filter((m) => memberStatus(m) !== "cancelled").length === 0).length;

  const rows = useMemo(
    () =>
      activeSchools
        .map((s) => {
          const members = s.members.filter((m) => memberStatus(m) !== "cancelled");
          return {
            id: s.id,
            name: s.name,
            total: members.length,
            here: members.filter((m) => m.checked_in_at).length,
          };
        })
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    [activeSchools],
  );

  const metrics = [
    { label: "Schools registered", value: activeSchools.length, icon: SchoolIcon },
    { label: "Members registered", value: live.length, icon: Users },
    { label: "Checked in", value: checked, icon: CheckCircle2 },
    { label: "Not yet arrived", value: live.length - checked, icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Counts come from saved registrations. Cancelled schools and members are excluded.
          {schoolsReview > 0 && ` ${schoolsReview} school${schoolsReview === 1 ? "" : "s"} need review.`}
          {membersReview > 0 && ` ${membersReview} member${membersReview === 1 ? "" : "s"} need review.`}
          {cancelledSchools > 0 && ` ${cancelledSchools} school${cancelledSchools === 1 ? "" : "s"} cancelled.`}
          {cancelledMembers > 0 && ` ${cancelledMembers} member${cancelledMembers === 1 ? "" : "s"} cancelled.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-hairline bg-surface p-5">
            <m.icon className="h-5 w-5 text-gold" aria-hidden />
            <p className="mt-4 font-display text-3xl font-bold tabular-nums">{m.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Attendance rate</h2>
          <p className="mt-3 font-display text-5xl font-bold text-gold">{rate}%</p>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-hairline"
            role="progressbar"
            aria-valuenow={rate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Attendance rate"
          >
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${rate}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {checked} of {live.length} checked in
          </p>
        </div>

        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Members by school</h2>
          {rows.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No schools have registered yet.</p>
          ) : (
            <>
              {noMembers > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {noMembers} school{noMembers === 1 ? " has" : "s have"} no members yet.
                </p>
              )}
              <ul className="mt-4 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 text-sm">
                    <span className="truncate text-foreground">{r.name}</span>
                    <span className="shrink-0 rounded-full border border-hairline px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                      {r.here}/{r.total} in
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <ReviewQueue isAdmin={isAdmin} />
      {isAdmin && <SettingsCard />}
    </div>
  );
}

/* ------------------- Possible duplicate school attempts ------------------- */

function ReviewQueue({ isAdmin }: { isAdmin: boolean }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listReviewQueue());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load the review queue.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        {error}
      </p>
    );
  }
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-surface p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-amber-400">
        Possible duplicate schools ({items.length})
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        These sign-ups matched an existing school's name or email, so no code was issued. Contact them if
        they're a genuinely different school.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-hairline p-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{it.payload.name ?? "Unnamed school"}</p>
              <p className="text-muted-foreground">
                {[it.payload.contact_email, it.payload.contact_phone, it.payload.mic_name].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{fmtUtcLocal(it.created_at)}</p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  void resolveReviewItem(it.id)
                    .then(load)
                    .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't update."));
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Mark handled
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------ Registration settings --------------------------- */

/** ISO (UTC) -> value for <input type="datetime-local"> in Sri Lanka time. */
function toColomboInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

/** datetime-local value (Sri Lanka time) -> ISO, or null when empty. */
function fromColomboInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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

  const checkbox = "h-4 w-4 accent-[var(--gold,#e7b54a)]";
  const field = "rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Registration settings</h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className={checkbox} checked={s.registration_open} disabled={busy}
            onChange={(e) => void save({ ...s, registration_open: e.target.checked })} />
          Registration is open (master switch)
        </label>

        <label className="flex items-center gap-3 text-sm">
          Phase
          <select
            value={s.registration_phase ?? "schools_first"}
            disabled={busy}
            onChange={(e) => void save({ ...s, registration_phase: e.target.value as RegistrationPhase })}
            className={field}
          >
            <option value="schools_first">Schools first</option>
            <option value="open">Open</option>
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className={checkbox} checked={s.school_form_open !== false} disabled={busy}
            onChange={(e) => void save({ ...s, school_form_open: e.target.checked })} />
          School form is open
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className={checkbox} checked={s.member_form_open !== false} disabled={busy}
            onChange={(e) => void save({ ...s, member_form_open: e.target.checked })} />
          Member form is open
        </label>

        <DateField label="School form opens" value={s.school_opens_at} disabled={busy} className={field}
          onCommit={(v) => void save({ ...s, school_opens_at: v })} />
        <DateField label="School form closes" value={s.school_closes_at} disabled={busy} className={field}
          onCommit={(v) => void save({ ...s, school_closes_at: v })} />
        <DateField label="Member form opens" value={s.member_opens_at} disabled={busy} className={field}
          onCommit={(v) => void save({ ...s, member_opens_at: v })} />
        <DateField label="Member form closes" value={s.member_closes_at} disabled={busy} className={field}
          onCommit={(v) => void save({ ...s, member_closes_at: v })} />

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className={checkbox} checked={s.member_cap_enabled === true} disabled={busy}
            onChange={(e) => void save({ ...s, member_cap_enabled: e.target.checked })} />
          Limit members per school
        </label>
        <label className="flex items-center gap-3 text-sm">
          Max members per school
          <input
            type="number"
            min={1}
            max={100}
            defaultValue={s.max_members_per_school}
            disabled={busy || s.member_cap_enabled !== true}
            onBlur={(e) => {
              const v = Math.min(100, Math.max(1, Number(e.target.value) || s.max_members_per_school));
              if (v !== s.max_members_per_school) void save({ ...s, max_members_per_school: v });
            }}
            className={`w-20 ${field}`}
          />
        </label>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Times are Sri Lanka time. Leave a date empty for no limit. The member form always needs a valid school code.
      </p>
      {msg && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {msg}
        </p>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
  disabled,
  className,
  onCommit,
}: {
  label: string;
  value: string | null | undefined;
  disabled: boolean;
  className: string;
  onCommit: (iso: string | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="datetime-local"
        defaultValue={toColomboInput(value)}
        disabled={disabled}
        onBlur={(e) => {
          const next = fromColomboInput(e.target.value);
          const current = value ? new Date(value).toISOString() : null;
          if (next !== current) onCommit(next);
        }}
        className={className}
      />
    </label>
  );
}
