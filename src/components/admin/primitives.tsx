import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  FileSpreadsheet,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import type { School, SchoolPasses, SchoolStatus, StaffProfile } from "@/lib/registration";

export { fmtUtcLocal } from "@/lib/admin-helpers";

export type Tab = "overview" | "schools" | "registrations" | "checkin" | "export";

export type TabCounts = {
  checkin?: { arrived: number; total: number };
  schools?: number;
  registrations?: number;
};

/* ---------------- Top bar + tabs ---------------- */

export function AdminTopBar({
  staff,
  onSignOut,
  onRefresh,
  isRefreshing = false,
}: {
  staff: StaffProfile;
  onSignOut: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const [timeStr, setTimeStr] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/80 backdrop-blur-2xl transition-all duration-200">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <Logo />
          {/* Live Sync Beacon */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Live Sync</span>
          </div>

          {/* Real-time Clock */}
          {timeStr && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
              <Clock className="h-3.5 w-3.5 text-gold/70" />
              <span>{timeStr}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Manual Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh dashboard data"
              className="inline-flex items-center justify-center rounded-lg border border-hairline/60 bg-surface/80 p-2 text-muted-foreground transition hover:border-gold/40 hover:bg-surface hover:text-gold active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-gold")} />
              <span className="sr-only">Refresh data</span>
            </button>
          )}

          {/* Public site link */}
          <Link
            to="/"
            title="Go to public website"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-hairline/60 bg-surface/80 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-gold/40 hover:bg-surface hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5 text-gold/80" />
            <span>Public site</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>

          {/* User profile & role badge */}
          <div className="flex items-center gap-2 rounded-lg border border-hairline/60 bg-surface/60 px-3 py-1.5">
            <div className="flex flex-col text-right sm:text-left">
              <span className="text-xs font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">
                {staff.display_name}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide uppercase text-gold">
                {staff.role === "admin" ? (
                  <>
                    <Crown className="h-2.5 w-2.5" />
                    <span>Admin</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-2.5 w-2.5" />
                    <span>Desk</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={onSignOut}
            title="Sign out of dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive-foreground transition hover:border-destructive/40 hover:bg-destructive/20 active:scale-95 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function Tabs({
  tab,
  setTab,
  isAdmin = false,
  counts,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  isAdmin?: boolean;
  counts?: TabCounts;
}) {
  const items: {
    id: Tab;
    label: string;
    icon: typeof QrCode;
    badge?: string | number;
  }[] = [
    {
      id: "checkin",
      label: "Check-in Desk",
      icon: QrCode,
      badge:
        counts?.checkin && counts.checkin.total > 0
          ? `${counts.checkin.arrived}/${counts.checkin.total}`
          : undefined,
    },
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "schools",
      label: "Schools",
      icon: GraduationCap,
      badge: counts?.schools !== undefined ? counts.schools : undefined,
    },
    {
      id: "registrations",
      label: "Registrations",
      icon: Users,
      badge: counts?.registrations !== undefined ? counts.registrations : undefined,
    },
    ...(isAdmin
      ? [
          {
            id: "export" as Tab,
            label: "Reports & Export",
            icon: FileSpreadsheet,
          },
        ]
      : []),
  ];

  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex flex-wrap items-center gap-2 border-b border-hairline/60 pb-3"
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => setTab(it.id)}
            className={cn(
              "group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer",
              active
                ? "bg-gold/15 text-gold border border-gold/40 shadow-[0_0_20px_rgba(245,185,33,0.18)]"
                : "border border-hairline/40 bg-surface/40 text-muted-foreground hover:border-hairline hover:bg-surface hover:text-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                active ? "text-gold" : "text-muted-foreground group-hover:text-foreground",
              )}
            />
            <span>{it.label}</span>
            {it.badge !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums transition",
                  active
                    ? "bg-gold/25 text-gold"
                    : "bg-surface border border-hairline text-muted-foreground group-hover:text-foreground",
                )}
              >
                {it.badge}
              </span>
            )}
          </button>
        );
      })}
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
  if (status === "confirmed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        <span>Confirmed</span>
      </span>
    );
  }
  if (status === "needs_review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        <span>Needs review</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-500/20 bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-400 line-through">
      <XCircle className="h-3 w-3" />
      <span>Cancelled</span>
    </span>
  );
}

export function CheckBadge({ checkedIn }: { checkedIn: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
        checkedIn
          ? "border-gold/50 bg-gold/15 text-gold shadow-[0_0_12px_rgba(245,185,33,0.18)]"
          : "border-hairline bg-surface/50 text-muted-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-transform",
          checkedIn ? "bg-gold shadow-[0_0_8px_#F5B921]" : "bg-muted-foreground/40",
        )}
      />
      {checkedIn ? "Checked in" : "Not arrived"}
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
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold transition cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background text-foreground">
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
