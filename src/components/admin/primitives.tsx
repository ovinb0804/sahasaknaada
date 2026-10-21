import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { School, SchoolPasses, SchoolStatus, StaffProfile } from "@/lib/registration";

export { fmtUtcLocal } from "@/lib/admin-helpers";

export type Tab = "overview" | "schools" | "checkin" | "export";

/* ---------------- Top bar + tabs ---------------- */

export function AdminTopBar({ staff, onSignOut }: { staff: StaffProfile; onSignOut: () => void }) {
  return (
    <div className="sticky top-0 z-40 border-b border-hairline bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            <strong className="font-medium text-foreground">{staff.display_name}</strong> ·{" "}
            {staff.role === "admin" ? "Admin" : "Check-in desk"}
          </span>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden>↗</span> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export function Tabs({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string }[] = [
    { id: "checkin", label: "Check-in" },
    { id: "overview", label: "Overview" },
    { id: "schools", label: "Schools" },
    { id: "export", label: "Reports & Export" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex flex-wrap gap-1 border-b border-hairline"
    >
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={tab === it.id}
          onClick={() => setTab(it.id)}
          className={cn(
            "rounded-t-md px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            tab === it.id
              ? "border-b-2 border-gold text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Small shared UI ---------------- */

export const STATUS_LABEL: Record<SchoolStatus, string> = {
  confirmed: "Confirmed",
  needs_review: "Needs review",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: SchoolStatus }) {
  const map: Record<SchoolStatus, string> = {
    confirmed: "text-gold",
    needs_review: "text-amber-400",
    cancelled: "text-muted-foreground line-through",
  };
  return <span className={cn("text-xs font-medium", map[status])}>{STATUS_LABEL[status]}</span>;
}

export function CheckBadge({ checkedIn }: { checkedIn: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        checkedIn ? "border-gold/40 text-gold" : "border-hairline text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", checkedIn ? "bg-gold" : "bg-muted-foreground/50")}
      />
      {checkedIn ? "Checked in" : "Not checked in"}
    </span>
  );
}

export function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="sr-only">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function schoolToPasses(s: School): SchoolPasses {
  return {
    school: {
      id: s.id,
      name: s.name,
      district: s.district,
      registration_code: s.registration_code,
      status: s.status,
      teacher_name: s.teacher_name,
    },
    members: [...s.members]
      .sort((a, b) => a.member_no - b.member_no)
      .map((m) => ({
        member_no: m.member_no,
        pass_code: m.pass_code,
        full_name: m.full_name,
        grade: m.grade,
        role: m.role,
      })),
  };
}
