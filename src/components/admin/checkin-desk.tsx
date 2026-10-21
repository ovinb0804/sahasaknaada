/*
 * Event-day check-in desk: search by name, reference (SSA-0007 or 7), school name,
 * school short code or pass code, then press one Check in button. The database does
 * the check-in atomically, so a repeat press never creates a second attendance record.
 */
import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, Search, Undo2 } from "lucide-react";

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

type Banner = { tone: "success" | "warn" | "error"; text: string };
const MAX_RESULTS = 10;

function matches(row: MemberRow, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return false;
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

export function CheckInDesk({ schools, onChanged }: { schools: School[]; onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(() => flattenMembers(schools), [schools]);
  const live = all.filter((r) => memberStatus(r.member) !== "cancelled");
  const arrived = live.filter((r) => r.member.checked_in_at).length;

  const results = useMemo(() => all.filter((r) => matches(r, q)), [all, q]);
  const shown = results.slice(0, MAX_RESULTS);

  async function checkIn(row: MemberRow) {
    if (busyId) return;
    setBusyId(row.member.id);
    setBanner(null);
    try {
      const res = await checkInMemberById(row.member.id);
      if (res.result === "checked_in") {
        setBanner({ tone: "success", text: `${row.member.full_name} is checked in.` });
      } else if (res.result === "already_checked_in") {
        setBanner({
          tone: "warn",
          text: `Already checked in${res.checked_in_at ? ` at ${fmtUtcLocal(res.checked_in_at)}` : ""}.`,
        });
      } else if (res.result === "cancelled") {
        setBanner({ tone: "error", text: "This registration is cancelled, so it can't be checked in." });
      } else {
        setBanner({ tone: "error", text: "That registration no longer exists. Refresh and search again." });
      }
      onChanged();
      setQ("");
      inputRef.current?.focus();
    } catch (e) {
      setBanner({ tone: "error", text: e instanceof Error ? e.message : "Check-in failed. Try again." });
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
      setBanner({ tone: "warn", text: `Check-in undone for ${row.member.full_name}.` });
      onChanged();
    } catch (e) {
      setBanner({ tone: "error", text: e instanceof Error ? e.message : "Couldn't undo. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Check-in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Search by name, reference (e.g. SSA-0007), school or school code.
          </p>
        </div>
        <p className="rounded-full border border-hairline px-4 py-1.5 text-sm tabular-nums" aria-live="polite">
          <strong className="text-gold">{arrived}</strong> of {live.length} arrived
        </p>
      </div>

      <label className="relative block">
        <span className="sr-only">Search registrations</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          autoFocus
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setBanner(null);
          }}
          placeholder="Start typing a name, reference or school code…"
          className="w-full rounded-2xl border border-border bg-surface py-4 pl-12 pr-4 text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        />
      </label>

      {banner && (
        <div
          role={banner.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 text-base font-medium",
            banner.tone === "success" && "border-gold/50 bg-gold/10 text-foreground",
            banner.tone === "warn" && "border-amber-400/50 bg-amber-400/10 text-foreground",
            banner.tone === "error" && "border-destructive/50 bg-destructive/10 text-foreground",
          )}
        >
          {banner.tone === "success" ? <CheckCircle2 className="h-5 w-5 text-gold" aria-hidden /> : null}
          {banner.text}
        </div>
      )}

      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
          No members have registered yet.
        </p>
      ) : q.trim() === "" ? null : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
          No registration matches “{q.trim()}”. Check the spelling, or try the school code.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {shown.map((row) => {
              const { member: m, school: s } = row;
              const status = memberStatus(m);
              const cancelled = status === "cancelled";
              const busy = busyId === m.id;
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-5">
                  <div className="min-w-0">
                    <p className="truncate text-xl font-semibold">{m.full_name}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {s.name}
                      {m.grade ? ` · Grade ${m.grade}` : ""} ·{" "}
                      <span className="font-mono">{memberRef(m)}</span>
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn("rounded-full border px-2.5 py-0.5 font-medium", m.checked_in_at ? "border-gold/40 text-gold" : "border-hairline text-muted-foreground")}>
                        {m.checked_in_at ? `Checked in · ${fmtUtcLocal(m.checked_in_at)}` : "Not checked in"}
                      </span>
                      {status !== "submitted" && status !== "confirmed" ? (
                        <span className="rounded-full border border-amber-400/40 px-2.5 py-0.5 font-medium text-amber-400">
                          {MEMBER_STATUS_LABEL[status] ?? status}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.checked_in_at ? (
                      <button
                        type="button"
                        onClick={() => void undo(row)}
                        disabled={busy}
                        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-background disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Undo2 className="h-4 w-4" aria-hidden /> Undo
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void checkIn(row)}
                        disabled={busy || cancelled}
                        className="inline-flex min-h-12 min-w-40 items-center justify-center gap-2 rounded-xl bg-gold px-6 text-base font-bold text-[#0A0A0A] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        {cancelled ? "Cancelled" : "Check in"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {results.length > MAX_RESULTS ? (
            <p className="text-sm text-muted-foreground">
              Showing the first {MAX_RESULTS} of {results.length} matches. Type more to narrow it down.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
