/*
 * Registrations (members) table: search, filters, sort and pagination run over the
 * FULL loaded dataset, not just the visible page. Status changes and notes are
 * admin-only; the database enforces that with row-level security.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  GraduationCap,
  IdCard,
  Mail,
  Phone,
  QrCode,
  RotateCcw,
  Search,
  Undo2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PassCard } from "@/components/pass-card";

const PAGE_SIZE = 25;

type SortKey =
  | "newest"
  | "oldest"
  | "name"
  | "name_desc"
  | "school"
  | "school_desc"
  | "status"
  | "attendance";

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
  const [previewPass, setPreviewPass] = useState<MemberRow | null>(null);

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
    q !== "" ||
    schoolId !== "all" ||
    grade !== "all" ||
    status !== "all" ||
    attendance !== "all" ||
    from !== "" ||
    to !== "";

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
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            All Registrations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Directory of all student delegates and teacher representatives across participating schools.
          </p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="rounded-3xl border border-hairline/60 bg-surface/80 p-5 sm:p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sm:col-span-2 relative block">
            <span className="sr-only">Search registrations</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student name, reference (SSA-0007), school, code, email, phone…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/30 transition"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-surface hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
              ...schools.map((s) => ({
                value: s.id,
                label: `${s.name}${s.short_code ? ` (${s.short_code})` : ""}`,
              })),
            ]}
          />

          <Select
            label="Grade or year"
            value={grade}
            onChange={setGrade}
            options={[
              { value: "all", label: "All grades" },
              ...grades.map((g) => ({ value: g, label: `Grade ${g}` })),
            ]}
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

          <div className="flex items-center gap-2">
            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                From Date
              </span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition cursor-pointer"
              />
            </label>

            <label className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                To Date
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Filter Results Summary & Reset */}
        <div className="mt-5 pt-4 border-t border-hairline/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            Showing <strong className="text-foreground">{filtered.length}</strong> of{" "}
            {all.length} registered delegates
            {filtersActive ? " matching active filters" : ""}.
          </p>

          {filtersActive && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold active:scale-95 transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset all filters</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive-foreground"
        >
          {error}
        </div>
      )}

      {/* Registrations List */}
      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline/60 p-12 text-center text-sm text-muted-foreground">
          No members registered yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline/60 p-12 text-center text-sm text-muted-foreground">
          No registrations match the selected filters.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((row) => (
            <MemberItem
              key={row.member.id}
              row={row}
              isAdmin={isAdmin}
              expanded={open === row.member.id}
              onToggle={() => setOpen(open === row.member.id ? null : row.member.id)}
              onPreviewPass={() => setPreviewPass(row)}
              act={act}
            />
          ))}
        </ul>
      )}

      {/* Pagination Controls */}
      {pages > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-3 rounded-2xl border border-hairline/60 bg-surface/50 p-3 text-xs sm:text-sm"
        >
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 font-semibold text-foreground hover:border-gold/40 hover:text-gold disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <span className="tabular-nums font-medium text-muted-foreground">
            Page <strong className="text-foreground">{current + 1}</strong> of {pages}
          </span>

          <button
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-1.5 font-semibold text-foreground hover:border-gold/40 hover:text-gold disabled:opacity-40 transition cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
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

function MemberItem({
  row,
  isAdmin,
  expanded,
  onToggle,
  onPreviewPass,
  act,
}: {
  row: MemberRow;
  isAdmin: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPreviewPass: () => void;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const { member: m, school: s } = row;
  const status = memberStatus(m) as MemberStatus;
  const [notes, setNotes] = useState(m.internal_notes ?? "");
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  async function checkIn() {
    if (checking) return;
    setChecking(true);
    try {
      await act(() => checkInMemberById(m.id));
    } finally {
      setChecking(false);
    }
  }

  const copyRef = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(memberRef(m));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="rounded-2xl border border-hairline/60 bg-surface/80 transition-all duration-200 hover:border-gold/30 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl p-4 sm:p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hairline/60 bg-background/80 text-foreground font-mono text-xs font-bold">
            <User className="h-5 w-5 text-gold" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-base sm:text-lg font-bold text-foreground">
              {m.full_name}
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground flex flex-wrap items-center gap-2">
              <span className="font-mono text-gold font-semibold">{memberRef(m)}</span>
              <span>•</span>
              <span className="font-semibold text-foreground/90">{s.name}</span>
              {s.short_code && (
                <span className="font-mono text-muted-foreground">({s.short_code})</span>
              )}
              {m.grade ? <span>• Grade {m.grade}</span> : null}
              {m.role ? <span>• {m.role}</span> : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span
            className={cn(
              "text-xs font-semibold uppercase tracking-wider",
              status === "needs_review"
                ? "text-amber-400"
                : status === "cancelled"
                  ? "text-muted-foreground line-through"
                  : "text-gold",
            )}
          >
            {MEMBER_STATUS_LABEL[status] ?? status}
          </span>
          <CheckBadge checkedIn={!!m.checked_in_at} />
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border border-hairline/60 bg-background/50 transition-transform duration-200",
              expanded && "rotate-180 text-gold",
            )}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </div>
        </div>
      </button>

      {expanded && (
        <div className="flex flex-col gap-5 border-t border-hairline/60 p-5 sm:p-6 bg-background/30 rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
          <dl className="grid gap-4 text-xs sm:text-sm sm:grid-cols-2 lg:grid-cols-4 pb-4 border-b border-hairline/40">
            <Item label="Email" value={m.email ?? "—"} icon={Mail} />
            <Item label="Phone" value={m.phone ?? "—"} icon={Phone} />
            <Item label="Registered Date" value={fmtUtcLocal(m.created_at)} icon={Calendar} />
            <Item
              label="Check-in Timestamp"
              value={m.checked_in_at ? fmtUtcLocal(m.checked_in_at) : "Not arrived yet"}
              icon={UserCheck}
            />
          </dl>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onPreviewPass}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3.5 py-2 text-xs font-semibold text-gold hover:bg-gold/20 active:scale-95 transition cursor-pointer"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>View Digital Pass</span>
            </button>

            <button
              type="button"
              onClick={copyRef}
              className="inline-flex items-center gap-1.5 rounded-xl border border-hairline/80 bg-background px-3 py-2 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold active:scale-95 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Reference Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Reference</span>
                </>
              )}
            </button>

            {m.checked_in_at ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Undo the check-in for ${m.full_name}?`))
                    void act(() => undoCheckIn(m.id));
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive active:scale-95 transition cursor-pointer"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Undo Check-in</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={checking || status === "cancelled"}
                onClick={() => void checkIn()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-black hover:brightness-110 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="h-3.5 w-3.5 text-black" />
                <span>Confirm Check In</span>
              </button>
            )}
          </div>

          {isAdmin && (
            <div className="grid gap-4 border-t border-hairline/40 pt-5 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-xs sm:text-sm">
                <span className="font-semibold text-foreground">Registration Status</span>
                <select
                  value={status}
                  onChange={(e) => {
                    const next = e.target.value as MemberStatus;
                    if (
                      next === "cancelled" &&
                      !window.confirm(
                        `Cancel the registration for ${m.full_name}? They will not be able to check in.`,
                      )
                    )
                      return;
                    void act(() => setMemberStatus(m.id, next));
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition cursor-pointer"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o} value={o} className="bg-background text-foreground">
                      {MEMBER_STATUS_LABEL[o] ?? o}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-xs sm:text-sm">
                <span className="font-semibold text-foreground">Internal Notes (Organizers Only)</span>
                <textarea
                  value={notes}
                  maxLength={1000}
                  rows={2}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => {
                    if (notes.trim() !== (m.internal_notes ?? ""))
                      void act(() => setMemberNotes(m.id, notes));
                  }}
                  placeholder="Notes on badges, dietary restrictions, certificates…"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Item({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Mail;
}) {
  return (
    <div className="min-w-0 flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-gold/70" />}
        <span>{label}</span>
      </dt>
      <dd className="break-words font-medium text-foreground">{value}</dd>
    </div>
  );
}
