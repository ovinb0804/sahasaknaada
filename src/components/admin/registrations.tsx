/*
 * Registrations (members) table: search, filters, sort and pagination run over the
 * FULL loaded dataset, not just the visible page. Status changes and notes are
 * admin-only; the database enforces that with row-level security.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Undo2 } from "lucide-react";

import {
  checkInMemberById,
  setMemberNotes,
  setMemberStatus,
  undoCheckIn,
  type MemberStatus,
  type School,
} from "@/lib/registration";
import {
  MEMBER_STATUS_LABEL,
  flattenMembers,
  fmtUtcLocal,
  memberRef,
  memberStatus,
  type MemberRow,
} from "@/lib/admin-helpers";
import { cn } from "@/lib/utils";
import { CheckBadge, Select } from "./primitives";

const PAGE_SIZE = 25;

type SortKey = "newest" | "oldest" | "name" | "name_desc" | "school" | "school_desc" | "status" | "attendance";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "school", label: "School A–Z" },
  { value: "school_desc", label: "School Z–A" },
  { value: "status", label: "Registration status" },
  { value: "attendance", label: "Check-in status" },
];

const STATUS_OPTIONS: MemberStatus[] = ["submitted", "confirmed", "needs_review", "cancelled"];

function compare(a: MemberRow, b: MemberRow, sort: SortKey): number {
  switch (sort) {
    case "newest":
      return b.member.created_at.localeCompare(a.member.created_at);
    case "oldest":
      return a.member.created_at.localeCompare(b.member.created_at);
    case "name":
      return a.member.full_name.localeCompare(b.member.full_name);
    case "name_desc":
      return b.member.full_name.localeCompare(a.member.full_name);
    case "school":
      return a.school.name.localeCompare(b.school.name) || a.member.member_no - b.member.member_no;
    case "school_desc":
      return b.school.name.localeCompare(a.school.name) || a.member.member_no - b.member.member_no;
    case "status":
      return memberStatus(a.member).localeCompare(memberStatus(b.member));
    case "attendance":
      return Number(!!b.member.checked_in_at) - Number(!!a.member.checked_in_at);
  }
}

export function Registrations({
  schools,
  isAdmin,
  onChanged,
}: {
  schools: School[];
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [schoolId, setSchoolId] = useState("all");
  const [grade, setGrade] = useState("all");
  const [status, setStatus] = useState("all");
  const [attendance, setAttendance] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const all = useMemo(() => flattenMembers(schools), [schools]);
  const grades = useMemo(
    () => [...new Set(all.map((r) => r.member.grade).filter((g): g is string => !!g))].sort(),
    [all],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const fromMs = from ? new Date(`${from}T00:00:00+05:30`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59+05:30`).getTime() : null;
    return all
      .filter((r) => {
        const { member: m, school: s } = r;
        if (schoolId !== "all" && s.id !== schoolId) return false;
        if (grade !== "all" && (m.grade ?? "") !== grade) return false;
        if (status !== "all" && memberStatus(m) !== status) return false;
        if (attendance === "in" && !m.checked_in_at) return false;
        if (attendance === "out" && m.checked_in_at) return false;
        const created = new Date(m.created_at).getTime();
        if (fromMs !== null && created < fromMs) return false;
        if (toMs !== null && created > toMs) return false;
        if (!term) return true;
        return (
          m.full_name.toLowerCase().includes(term) ||
          memberRef(m).toLowerCase().includes(term) ||
          s.name.toLowerCase().includes(term) ||
          (s.short_code ?? "").toLowerCase().includes(term) ||
          (m.email ?? "").toLowerCase().includes(term) ||
          (m.phone ?? "").includes(term)
        );
      })
      .sort((a, b) => compare(a, b, sort));
  }, [all, q, schoolId, grade, status, attendance, from, to, sort]);

  // Back to page 1 whenever the filters change.
  useEffect(() => setPage(0), [q, schoolId, grade, status, attendance, from, to, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const filtersActive =
    q !== "" || schoolId !== "all" || grade !== "all" || status !== "all" || attendance !== "all" || from !== "" || to !== "";

  function reset() {
    setQ("");
    setSchoolId("all");
    setGrade("all");
    setStatus("all");
    setAttendance("all");
    setFrom("");
    setTo("");
  }

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Registrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every member registration, across all schools.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="sm:col-span-2">
          <span className="sr-only">Search registrations</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, reference, school, code, email or phone"
            className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          options={SORTS}
        />
        <Select
          label="School"
          value={schoolId}
          onChange={setSchoolId}
          options={[
            { value: "all", label: "All schools" },
            ...schools.map((s) => ({ value: s.id, label: `${s.name}${s.short_code ? ` (${s.short_code})` : ""}` })),
          ]}
        />
        <Select
          label="Grade or year"
          value={grade}
          onChange={setGrade}
          options={[{ value: "all", label: "All grades" }, ...grades.map((g) => ({ value: g, label: `Grade ${g}` }))]}
        />
        <Select
          label="Registration status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Any status" },
            ...STATUS_OPTIONS.map((s) => ({ value: s, label: MEMBER_STATUS_LABEL[s] ?? s })),
          ]}
        />
        <Select
          label="Check-in status"
          value={attendance}
          onChange={setAttendance}
          options={[
            { value: "all", label: "Any attendance" },
            { value: "in", label: "Checked in" },
            { value: "out", label: "Not checked in" },
          ]}
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Registered from</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Registered to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" aria-live="polite">
        <p>
          {filtered.length} of {all.length} registration{all.length === 1 ? "" : "s"}
          {filtersActive ? " match your filters" : ""}
        </p>
        {filtersActive ? (
          <button type="button" onClick={reset} className="rounded-md border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Reset filters
          </button>
        ) : null}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </p>
      )}

      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
          No members have registered yet.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
          No registrations match. Try removing a filter.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((row) => (
            <MemberItem
              key={row.member.id}
              row={row}
              isAdmin={isAdmin}
              expanded={open === row.member.id}
              onToggle={() => setOpen(open === row.member.id ? null : row.member.id)}
              act={act}
            />
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm">
          <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Previous
          </button>
          <span className="tabular-nums text-muted-foreground">
            Page {current + 1} of {pages}
          </span>
          <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-surface disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function MemberItem({
  row,
  isAdmin,
  expanded,
  onToggle,
  act,
}: {
  row: MemberRow;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const { member: m, school: s } = row;
  const status = memberStatus(m) as MemberStatus;
  const [notes, setNotes] = useState(m.internal_notes ?? "");
  const [checking, setChecking] = useState(false);

  async function checkIn() {
    if (checking) return;
    setChecking(true);
    try {
      await act(() => checkInMemberById(m.id));
    } finally {
      setChecking(false);
    }
  }

  return (
    <li className="rounded-2xl border border-hairline bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{m.full_name}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            <span className="font-mono">{memberRef(m)}</span> · {s.name}
            {s.short_code ? <span className="font-mono"> ({s.short_code})</span> : null}
            {m.grade ? ` · Grade ${m.grade}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <span className={cn("text-xs font-medium", status === "needs_review" ? "text-amber-400" : status === "cancelled" ? "text-muted-foreground line-through" : "text-gold")}>
            {MEMBER_STATUS_LABEL[status] ?? status}
          </span>
          <CheckBadge checkedIn={!!m.checked_in_at} />
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-5 border-t border-hairline p-4 sm:p-5">
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Item label="Email" value={m.email ?? "—"} />
            <Item label="Phone" value={m.phone ?? "—"} />
            <Item label="Registered" value={fmtUtcLocal(m.created_at)} />
            <Item label="Checked in" value={m.checked_in_at ? fmtUtcLocal(m.checked_in_at) : "—"} />
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            {m.checked_in_at ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Undo the check-in for ${m.full_name}?`)) void act(() => undoCheckIn(m.id));
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Undo2 className="h-4 w-4" aria-hidden /> Undo check-in
              </button>
            ) : (
              <button
                type="button"
                disabled={checking || status === "cancelled"}
                onClick={() => void checkIn()}
                className="rounded-md bg-gold px-4 py-1.5 text-sm font-bold text-[#0A0A0A] hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Check in
              </button>
            )}
          </div>

          {isAdmin ? (
            <div className="grid gap-4 border-t border-hairline pt-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Registration status</span>
                <select
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as MemberStatus;
                    if (next === "cancelled" && !window.confirm(`Cancel the registration for ${m.full_name}? They won't be able to check in.`)) return;
                    void act(() => setMemberStatus(m.id, next));
                  }}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {MEMBER_STATUS_LABEL[o] ?? o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Internal notes (not shown to the member)</span>
                <textarea
                  value={notes}
                  maxLength={1000}
                  rows={3}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes.trim() !== (m.internal_notes ?? "")) void act(() => setMemberNotes(m.id, notes));
                  }}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-foreground">{value}</dd>
    </div>
  );
}
