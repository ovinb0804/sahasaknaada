/*
 * Event-day check-in desk: fast search by name, reference (SSA-0007), school name,
 * school short code or pass code. Scanning a pass QR checks the person in atomically.
 * Includes audio confirmation chime, digital pass preview, filter pills, and recent arrivals feed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  IdCard,
  Loader2,
  QrCode,
  RotateCcw,
  Search,
  Undo2,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { checkInMemberById, undoCheckIn, type School } from "@/lib/registration";
import {
  MEMBER_STATUS_LABEL,
  flattenMembers,
  fmtUtcLocal,
  memberRef,
  memberStatus,
  type MemberRow,
} from "@/lib/admin-helpers";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PassCard } from "@/components/pass-card";

type Banner = { tone: "success" | "warn" | "error"; text: string };
type FilterMode = "all" | "pending" | "arrived" | "attention";
const MAX_RESULTS = 12;

function matches(row: MemberRow, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const { member: m, school: s } = row;
  const digits = q.replace(/^ssa-?/, "");
  if (/^\d{1,7}$/.test(digits) && m.member_no === Number(digits)) return true;
  return (
    m.full_name.toLowerCase().includes(q) ||
    memberRef(m).toLowerCase() === q ||
    m.pass_code.toLowerCase() === q ||
    s.name.toLowerCase().includes(q) ||
    (s.short_code ?? "").toLowerCase() === q.replace(/\s+/g, "")
  );
}

function playSuccessChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone rising chime (D5 -> A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    /* audio unsupported or blocked */
  }
}

export function CheckInDesk({ schools, onChanged }: { schools: School[]; onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [previewPass, setPreviewPass] = useState<MemberRow | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => flattenMembers(schools), [schools]);
  const live = all.filter((r) => memberStatus(r.member) !== "cancelled");
  const arrived = live.filter((r) => r.member.checked_in_at).length;
  const pending = live.length - arrived;
  const needsAttention = all.filter((r) => memberStatus(r.member) === "needs_review").length;

  // Recent arrivals ticker
  const recentArrivals = useMemo(
    () =>
      all
        .filter((r) => r.member.checked_in_at)
        .sort((a, b) => (b.member.checked_in_at ?? "").localeCompare(a.member.checked_in_at ?? ""))
        .slice(0, 4),
    [all],
  );

  // Global keydown to focus search with "/"
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const results = useMemo(() => {
    return all.filter((r) => {
      // Search query filter
      if (!matches(r, q)) return false;

      // Filter mode pill
      const st = memberStatus(r.member);
      const isChecked = Boolean(r.member.checked_in_at);

      if (filterMode === "pending") return !isChecked && st !== "cancelled";
      if (filterMode === "arrived") return isChecked;
      if (filterMode === "attention") return st === "needs_review" || st === "cancelled";
      return true;
    });
  }, [all, q, filterMode]);

  const shown = results.slice(0, MAX_RESULTS);

  async function checkIn(row: MemberRow) {
    if (busyId) return;
    setBusyId(row.member.id);
    setBanner(null);
    try {
      const res = await checkInMemberById(row.member.id);
      if (res.result === "checked_in") {
        if (soundEnabled) playSuccessChime();
        setBanner({ tone: "success", text: `${row.member.full_name} is checked in.` });
      } else if (res.result === "already_checked_in") {
        setBanner({
          tone: "warn",
          text: `Already checked in${res.checked_in_at ? ` at ${fmtUtcLocal(res.checked_in_at)}` : ""}.`,
        });
      } else if (res.result === "cancelled") {
        setBanner({
          tone: "error",
          text: "This registration is cancelled, so it cannot be checked in.",
        });
      } else {
        setBanner({
          tone: "error",
          text: "Registration no longer exists. Please refresh the page.",
        });
      }
      onChanged();
      setQ("");
      inputRef.current?.focus();
    } catch (e) {
      setBanner({
        tone: "error",
        text: e instanceof Error ? e.message : "Check-in failed. Try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function undo(row: MemberRow) {
    if (busyId) return;
    if (!window.confirm(`Undo the check-in for ${row.member.full_name}?`)) return;
    setBusyId(row.member.id);
    setBanner(null);
    try {
      await undoCheckIn(row.member.id);
      setBanner({ tone: "warn", text: `Check-in reversed for ${row.member.full_name}.` });
      onChanged();
    } catch (e) {
      setBanner({
        tone: "error",
        text: e instanceof Error ? e.message : "Couldn't undo. Try again.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-300">
      {/* Header and Live Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Event Check-In Desk
            </h1>
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan attendee QR code or type reference / school code to confirm attendance.
          </p>
        </div>

        {/* Live Attendance Pill & Audio Sound Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            title={soundEnabled ? "Audio chime enabled" : "Audio chime muted"}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
              soundEnabled
                ? "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
                : "border-hairline bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span>{soundEnabled ? "Chime on" : "Muted"}</span>
          </button>

          <div
            className="flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-semibold tabular-nums text-foreground shadow-[0_0_15px_rgba(245,185,33,0.15)]"
            aria-live="polite"
          >
            <CheckCircle2 className="h-4 w-4 text-gold" />
            <span>
              <strong className="text-gold font-bold">{arrived}</strong> / {live.length} Arrived
            </span>
          </div>
        </div>
      </div>

      {/* Main Scanner Search Bar */}
      <div className="relative">
        <label className="relative block">
          <span className="sr-only">Scan or search registrations</span>
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold/70"
            aria-hidden
          />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setBanner(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const typed = q.trim().toLowerCase();
              if (!typed) return;
              const exact = all.filter(
                (r) =>
                  r.member.pass_code.toLowerCase() === typed ||
                  memberRef(r.member).toLowerCase() === typed,
              );
              const only = exact.length === 1 ? exact[0] : undefined;
              if (only && !only.member.checked_in_at && memberStatus(only.member) !== "cancelled") {
                e.preventDefault();
                void checkIn(only);
              }
            }}
            placeholder="Scan pass QR code or type reference (e.g. SSA-0007), name, school code…"
            className="w-full rounded-2xl border border-hairline/80 bg-surface/90 py-4 pl-12 pr-28 text-base sm:text-lg text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 shadow-xl transition"
          />
        </label>

        {/* Clear and Hotkey Badge */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className="rounded-full p-1 text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-hairline bg-background/80 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            /
          </kbd>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={cn(
            "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
            filterMode === "all"
              ? "bg-gold text-black shadow-md shadow-gold/20"
              : "border border-hairline/60 bg-surface/60 text-muted-foreground hover:text-foreground",
          )}
        >
          All Delegates ({live.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("pending")}
          className={cn(
            "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
            filterMode === "pending"
              ? "bg-gold text-black shadow-md shadow-gold/20"
              : "border border-hairline/60 bg-surface/60 text-muted-foreground hover:text-foreground",
          )}
        >
          Pending Arrival ({pending})
        </button>

        <button
          type="button"
          onClick={() => setFilterMode("arrived")}
          className={cn(
            "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
            filterMode === "arrived"
              ? "bg-gold text-black shadow-md shadow-gold/20"
              : "border border-hairline/60 bg-surface/60 text-muted-foreground hover:text-foreground",
          )}
        >
          Checked In ({arrived})
        </button>

        {needsAttention > 0 && (
          <button
            type="button"
            onClick={() => setFilterMode("attention")}
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer",
              filterMode === "attention"
                ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
            )}
          >
            Needs Review ({needsAttention})
          </button>
        )}
      </div>

      {/* Animated Feedback Banner */}
      {banner && (
        <div
          role={banner.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-4 text-base font-semibold shadow-lg animate-in zoom-in-95 duration-200",
            banner.tone === "success" &&
              "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-emerald-500/10",
            banner.tone === "warn" &&
              "border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-amber-400/10",
            banner.tone === "error" &&
              "border-destructive/40 bg-destructive/15 text-destructive shadow-destructive/10",
          )}
        >
          {banner.tone === "success" && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
          {banner.tone === "warn" && <Clock className="h-5 w-5 text-amber-400 shrink-0" />}
          {banner.tone === "error" && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Recent Arrivals Stream Bar */}
      {recentArrivals.length > 0 && !q.trim() && (
        <div className="rounded-2xl border border-hairline/60 bg-surface/50 p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <span className="flex items-center gap-1.5 text-gold">
              <Clock className="h-3.5 w-3.5" /> Recent Arrivals
            </span>
            <span>Last {recentArrivals.length} scans</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {recentArrivals.map((row) => (
              <div
                key={row.member.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-hairline/40 bg-background/60 p-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">
                    {row.member.full_name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{row.school.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void undo(row)}
                  title="Undo this check-in"
                  className="rounded-lg border border-hairline/60 p-1 text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Results Table / Cards */}
      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline/60 p-12 text-center text-sm text-muted-foreground">
          No members registered yet.
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline/60 p-12 text-center text-sm text-muted-foreground">
          No registrations match your search or filter.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((row) => {
            const { member: m, school: s } = row;
            const status = memberStatus(m);
            const cancelled = status === "cancelled";
            const busy = busyId === m.id;
            const isChecked = Boolean(m.checked_in_at);

            return (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 sm:p-5 transition-all duration-200",
                  isChecked
                    ? "border-emerald-500/20 bg-surface/90 shadow-sm"
                    : "border-hairline/60 bg-surface/70 hover:border-gold/30 hover:bg-surface",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base sm:text-lg font-bold text-foreground">
                      {m.full_name}
                    </p>
                    {isChecked ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <Check className="h-3 w-3" /> Arrived
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" /> Pending
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-xs sm:text-sm text-muted-foreground">
                    <strong className="font-semibold text-foreground">{s.name}</strong>
                    {m.grade ? ` · Grade ${m.grade}` : ""}
                    {m.role ? ` · ${m.role}` : ""} · Ref:{" "}
                    <span className="font-mono text-gold font-semibold">{memberRef(m)}</span> · Code:{" "}
                    <span className="font-mono text-xs">{m.pass_code}</span>
                  </p>

                  {m.checked_in_at && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Checked in at {fmtUtcLocal(m.checked_in_at)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* View digital pass button */}
                  <button
                    type="button"
                    onClick={() => setPreviewPass(row)}
                    title="Preview Attendee Pass"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-hairline/80 bg-background/80 px-3 py-2 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold active:scale-95 transition cursor-pointer"
                  >
                    <IdCard className="h-4 w-4 text-gold" />
                    <span>Pass</span>
                  </button>

                  {isChecked ? (
                    <button
                      type="button"
                      onClick={() => void undo(row)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive active:scale-95 transition cursor-pointer disabled:opacity-50"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>Undo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void checkIn(row)}
                      disabled={busy || cancelled}
                      className="inline-flex min-h-10 min-w-36 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-black transition hover:brightness-110 active:scale-95 shadow-md shadow-gold/20 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin text-black" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-black" />
                      )}
                      <span>{cancelled ? "Cancelled" : "Check In"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {results.length > MAX_RESULTS && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              Showing top {MAX_RESULTS} of {results.length} results. Type to narrow search.
            </p>
          )}
        </div>
      )}

      {/* Digital Pass Preview Dialog */}
      <Dialog open={!!previewPass} onOpenChange={(open) => !open && setPreviewPass(null)}>
        {previewPass && (
          <DialogContent className="max-w-md border border-hairline/60 bg-surface/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <IdCard className="h-5 w-5 text-gold" />
                <span>Attendee Digital Pass</span>
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex justify-center">
              <PassCard member={previewPass.member} schoolName={previewPass.school.name} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
