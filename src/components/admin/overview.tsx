import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  QrCode,
  Radio,
  School as SchoolIcon,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { Tab } from "./primitives";

export function Overview({
  schools,
  isAdmin,
  onNavigateTab,
}: {
  schools: School[];
  isAdmin: boolean;
  onNavigateTab?: (tab: Tab) => void;
}) {
  const [schoolFilter, setSchoolFilter] = useState("");

  const activeSchools = schools.filter((s) => s.status !== "cancelled");
  const all = flattenMembers(activeSchools);
  const live = all.filter((r) => memberStatus(r.member) !== "cancelled");
  const cancelledMembers = all.length - live.length;
  const checked = live.filter((r) => r.member.checked_in_at).length;
  const rate = live.length ? Math.round((checked / live.length) * 100) : 0;
  const schoolsReview = schools.filter((s) => s.status === "needs_review").length;
  const membersReview = live.filter((r) => memberStatus(r.member) === "needs_review").length;
  const cancelledSchools = schools.length - activeSchools.length;
  const noMembers = activeSchools.filter(
    (s) => s.members.filter((m) => memberStatus(m) !== "cancelled").length === 0,
  ).length;

  const rows = useMemo(
    () =>
      activeSchools
        .map((s) => {
          const members = s.members.filter((m) => memberStatus(m) !== "cancelled");
          const here = members.filter((m) => m.checked_in_at).length;
          return {
            id: s.id,
            name: s.name,
            district: s.district,
            total: members.length,
            here,
            pct: members.length > 0 ? Math.round((here / members.length) * 100) : 0,
          };
        })
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
    [activeSchools],
  );

  const filteredRows = useMemo(() => {
    if (!schoolFilter.trim()) return rows;
    const q = schoolFilter.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.district.toLowerCase().includes(q));
  }, [rows, schoolFilter]);

  const metrics = [
    {
      label: "Schools registered",
      value: activeSchools.length,
      icon: GraduationCap,
      color: "from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400",
      accent: "#3b82f6",
      hint: `${cancelledSchools > 0 ? `${cancelledSchools} cancelled` : "Active institutions"}`,
      tab: "schools" as Tab,
    },
    {
      label: "Delegates registered",
      value: live.length,
      icon: Users,
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
      accent: "#a855f7",
      hint: `${cancelledMembers > 0 ? `${cancelledMembers} cancelled` : "Total student passes"}`,
      tab: "registrations" as Tab,
    },
    {
      label: "Checked in",
      value: checked,
      icon: CheckCircle2,
      color: "from-gold/25 to-amber-500/10 border-gold/40 text-gold",
      accent: "#F5B921",
      hint: `${rate}% total arrival rate`,
      tab: "checkin" as Tab,
    },
    {
      label: "Not yet arrived",
      value: live.length - checked,
      icon: Clock,
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
      accent: "#10b981",
      hint: "Expected delegates",
      tab: "checkin" as Tab,
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in-50 duration-300">
      {/* Hero Welcome & Quick Action Card */}
      <div className="relative overflow-hidden rounded-3xl border border-hairline/60 bg-gradient-to-br from-surface via-surface/90 to-background p-6 sm:p-8 shadow-2xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-gold/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-gold">
              <Radio className="h-4 w-4 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-[0.25em]">
                Live Command Center
              </span>
            </div>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Workshop Overview
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Real-time monitoring for Sahasak Naada &apos;26 by Radio Electronics Association of D.
              S. Senanayake College.
            </p>

            {(schoolsReview > 0 || membersReview > 0) && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {schoolsReview > 0 && `${schoolsReview} school(s) need review. `}
                  {membersReview > 0 && `${membersReview} member(s) need review.`}
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigateTab?.("checkin")}
              className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs sm:text-sm font-bold text-black transition hover:brightness-110 active:scale-95 shadow-lg shadow-gold/20 cursor-pointer"
            >
              <QrCode className="h-4 w-4" />
              <span>Check-in Desk</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.("schools")}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline/60 bg-surface/80 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition hover:border-gold/40 hover:bg-surface active:scale-95 cursor-pointer"
            >
              <GraduationCap className="h-4 w-4 text-gold" />
              <span>Schools</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab?.("registrations")}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline/60 bg-surface/80 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition hover:border-gold/40 hover:bg-surface active:scale-95 cursor-pointer"
            >
              <Users className="h-4 w-4 text-purple-400" />
              <span>Registrations</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigateTab?.("export")}
                className="inline-flex items-center gap-2 rounded-xl border border-hairline/60 bg-surface/80 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground transition hover:border-gold/40 hover:bg-surface active:scale-95 cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Reports</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Interactive Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              onClick={() => onNavigateTab?.(m.tab)}
              className="group relative overflow-hidden rounded-2xl border border-hairline/60 bg-surface/80 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
                    m.color,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100 group-hover:text-gold" />
              </div>

              <div className="mt-4">
                <p className="font-display text-4xl font-bold tracking-tight text-foreground tabular-nums">
                  {m.value}
                </p>
                <p className="mt-1 text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {m.label}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-gold/80 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>{m.hint}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Visualizer & School Leaderboard */}
      <div className="grid gap-6 md:grid-cols-5">
        {/* Attendance Visualizer (2 cols) */}
        <div className="md:col-span-2 flex flex-col justify-between rounded-3xl border border-hairline/60 bg-surface/80 p-6 sm:p-7 shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                Venue Check-in Progress
              </span>
              <TrendingUp className="h-4 w-4 text-gold" />
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-display text-6xl font-extrabold text-gold tracking-tight">
                {rate}%
              </span>
              <span className="text-xs font-medium text-muted-foreground">arrived</span>
            </div>

            {/* Sound-wave style progress bar */}
            <div className="mt-6 flex flex-col gap-2">
              <div
                className="h-3 w-full overflow-hidden rounded-full bg-hairline/60 p-0.5"
                role="progressbar"
                aria-valuenow={rate}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-gold to-yellow-300 transition-all duration-700 shadow-[0_0_12px_rgba(245,185,33,0.5)]"
                  style={{ width: `${rate}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground pt-1">
                <span>0%</span>
                <span className="text-gold font-semibold">
                  {checked} of {live.length} checked in
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Attendance breakdown stats */}
            <div className="mt-6 grid grid-cols-2 gap-3 pt-4 border-t border-hairline/40">
              <div className="rounded-xl border border-hairline/40 bg-background/50 p-3">
                <span className="text-[11px] text-muted-foreground">Present in Hall</span>
                <p className="mt-1 text-lg font-bold text-foreground tabular-nums">{checked}</p>
              </div>
              <div className="rounded-xl border border-hairline/40 bg-background/50 p-3">
                <span className="text-[11px] text-muted-foreground">En Route / Pending</span>
                <p className="mt-1 text-lg font-bold text-amber-400 tabular-nums">
                  {live.length - checked}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab?.("checkin")}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 py-3 text-xs font-semibold text-gold transition hover:bg-gold/20 active:scale-95 cursor-pointer"
          >
            <QrCode className="h-4 w-4" />
            <span>Launch Check-in Scanner</span>
          </button>
        </div>

        {/* Members By School Progress Leaderboard (3 cols) */}
        <div className="md:col-span-3 rounded-3xl border border-hairline/60 bg-surface/80 p-6 sm:p-7 shadow-xl flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                School Delegations ({rows.length})
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live arrival tracker per participating institution
              </p>
            </div>

            {/* Mini Search inside leaderboard */}
            <div className="relative w-full sm:w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Filter schools…"
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="my-auto py-12 text-center text-sm text-muted-foreground">
              {schoolFilter ? `No schools matching “${schoolFilter}”` : "No schools registered yet."}
            </div>
          ) : (
            <ul className="mt-4 flex max-h-80 flex-col gap-2.5 overflow-y-auto pr-1">
              {filteredRows.map((r) => {
                const complete = r.total > 0 && r.here === r.total;
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-1.5 rounded-xl border border-hairline/50 bg-background/40 p-3 transition hover:border-gold/30 hover:bg-background/80"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground">{r.district}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {complete && (
                          <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <Check className="h-2.5 w-2.5" /> All in
                          </span>
                        )}
                        <span className="rounded-full border border-hairline/80 bg-surface px-2.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                          {r.here}/{r.total}
                        </span>
                      </div>
                    </div>

                    {/* Progress line */}
                    {r.total > 0 && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hairline/60">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            complete ? "bg-emerald-400" : "bg-gold",
                          )}
                          style={{ width: `${r.pct}%` }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
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
    <div className="rounded-3xl border border-amber-400/40 bg-surface/80 p-6 sm:p-7 shadow-xl">
      <div className="flex items-center gap-2 text-amber-400">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Duplicate School Applications Queue ({items.length})
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        These sign-ups matched an existing school&apos;s name or email. Review and mark handled.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-hairline/60 bg-background/60 p-4 text-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{it.payload.name ?? "Unnamed school"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[it.payload.contact_email, it.payload.contact_phone, it.payload.mic_name]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground font-mono">
                {fmtUtcLocal(it.created_at)}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  void resolveReviewItem(it.id)
                    .then(load)
                    .catch((e: unknown) =>
                      setError(e instanceof Error ? e.message : "Couldn't update."),
                    );
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold active:scale-95 transition cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Mark handled</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------ Registration settings --------------------------- */

function toColomboInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

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
      setMsg("Settings updated successfully.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  const checkbox = "h-4 w-4 accent-[#F5B921] rounded cursor-pointer";
  const field =
    "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-gold transition";

  return (
    <div className="rounded-3xl border border-hairline/60 bg-surface/80 p-6 sm:p-7 shadow-xl">
      <div className="flex items-center gap-2 text-gold">
        <Settings className="h-5 w-5" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Event & Registration Controls
        </h2>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-medium text-foreground p-3 rounded-xl border border-hairline/40 bg-background/40">
          <input
            type="checkbox"
            className={checkbox}
            checked={s.registration_open}
            disabled={busy}
            onChange={(e) => void save({ ...s, registration_open: e.target.checked })}
          />
          Master Registration Switch (Open)
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-foreground p-3 rounded-xl border border-hairline/40 bg-background/40">
          Registration Phase:
          <select
            value={s.registration_phase ?? "schools_first"}
            disabled={busy}
            onChange={(e) =>
              void save({ ...s, registration_phase: e.target.value as RegistrationPhase })
            }
            className={field}
          >
            <option value="schools_first">Schools First (Two-step)</option>
            <option value="open">Open (Direct)</option>
          </select>
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-foreground p-3 rounded-xl border border-hairline/40 bg-background/40">
          <input
            type="checkbox"
            className={checkbox}
            checked={s.school_form_open !== false}
            disabled={busy}
            onChange={(e) => void save({ ...s, school_form_open: e.target.checked })}
          />
          School Registration Form Active
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-foreground p-3 rounded-xl border border-hairline/40 bg-background/40">
          <input
            type="checkbox"
            className={checkbox}
            checked={s.member_form_open !== false}
            disabled={busy}
            onChange={(e) => void save({ ...s, member_form_open: e.target.checked })}
          />
          Member Registration Form Active
        </label>

        <DateField
          label="School Registration Opens"
          value={s.school_opens_at}
          disabled={busy}
          className={field}
          onCommit={(v) => void save({ ...s, school_opens_at: v })}
        />
        <DateField
          label="School Registration Closes"
          value={s.school_closes_at}
          disabled={busy}
          className={field}
          onCommit={(v) => void save({ ...s, school_closes_at: v })}
        />
        <DateField
          label="Member Registration Opens"
          value={s.member_opens_at}
          disabled={busy}
          className={field}
          onCommit={(v) => void save({ ...s, member_opens_at: v })}
        />
        <DateField
          label="Member Registration Closes"
          value={s.member_closes_at}
          disabled={busy}
          className={field}
          onCommit={(v) => void save({ ...s, member_closes_at: v })}
        />

        <label className="flex items-center gap-3 text-sm font-medium text-foreground p-3 rounded-xl border border-hairline/40 bg-background/40">
          <input
            type="checkbox"
            className={checkbox}
            checked={s.member_cap_enabled === true}
            disabled={busy}
            onChange={(e) => void save({ ...s, member_cap_enabled: e.target.checked })}
          />
          Limit Delegates Per School
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-foreground p-3 rounded-xl border border-hairline/40 bg-background/40">
          Max Delegates Per School:
          <input
            type="number"
            min={1}
            max={100}
            defaultValue={s.max_members_per_school}
            disabled={busy || s.member_cap_enabled !== true}
            onBlur={(e) => {
              const v = Math.min(
                100,
                Math.max(1, Number(e.target.value) || s.max_members_per_school),
              );
              if (v !== s.max_members_per_school) void save({ ...s, max_members_per_school: v });
            }}
            className={`w-24 ${field}`}
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>Times configured in Sri Lanka Standard Time (GMT+5:30).</span>
        {msg && <span className="font-semibold text-gold animate-in fade-in">{msg}</span>}
      </div>
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
    <label className="flex flex-col gap-1.5 text-sm p-3 rounded-xl border border-hairline/40 bg-background/40">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
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
