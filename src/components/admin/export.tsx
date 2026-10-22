import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { School } from "@/lib/registration";
import {
  dateStamp,
  downloadCsv,
  flattenMembers,
  memberStatus,
  registrationsToCsv,
  schoolsListToCsv,
} from "@/lib/admin-helpers";
import { cn } from "@/lib/utils";

/** CSV exports (admins only). Email and phone are left out unless ticked. */
export function ExportPanel({ schools }: { schools: School[] }) {
  const [error, setError] = useState<string | null>(null);
  const [includeContact, setIncludeContact] = useState(false);
  const [downloadedKey, setDownloadedKey] = useState<string | null>(null);

  const live = flattenMembers(schools).filter((r) => memberStatus(r.member) !== "cancelled");
  const arrived = live.filter((r) => r.member.checked_in_at);
  const waiting = live.filter((r) => !r.member.checked_in_at);

  function run(count: number, file: string, build: () => string) {
    setError(null);
    if (count === 0) {
      setError("There are no records for that export yet.");
      return;
    }
    try {
      downloadCsv(`${file}-${dateStamp()}.csv`, build());
      setDownloadedKey(file);
      setTimeout(() => setDownloadedKey(null), 2500);
    } catch {
      setError("Export failed. Please try again.");
    }
  }

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-300">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Reports &amp; Data Export
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate clean, formatted CSV reports compatible with Microsoft Excel, Apple Numbers, and
          Google Sheets.
        </p>
      </div>

      {/* Privacy and Contact Export Toggle */}
      <label className="flex items-start gap-3.5 rounded-2xl border border-hairline/60 bg-surface/80 p-5 text-xs sm:text-sm shadow-sm transition hover:border-gold/30 cursor-pointer">
        <input
          type="checkbox"
          checked={includeContact}
          onChange={(e) => setIncludeContact(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#F5B921] rounded cursor-pointer shrink-0"
        />
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            {includeContact ? (
              <ShieldAlert className="h-4 w-4 text-amber-400" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            )}
            <span>Include sensitive contact data (emails & phone numbers)</span>
          </span>
          <span className="text-muted-foreground leading-relaxed">
            Off by default for participant privacy. Only include contact information for approved
            liaison officers or reporting requirements.
          </span>
        </div>
      </label>

      {/* Primary Export Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ExportCard
          title="All Confirmed Registrations"
          subtitle="Master delegate roster across all participating schools"
          count={live.length}
          icon={Users}
          color="from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30"
          downloaded={downloadedKey === "sahasaknaada-registrations"}
          onClick={() =>
            run(live.length, "sahasaknaada-registrations", () =>
              registrationsToCsv(live, includeContact),
            )
          }
        />

        <ExportCard
          title="Attendance Roll (Checked In)"
          subtitle="All delegates marked as present at the workshop desk"
          count={arrived.length}
          icon={CheckCircle2}
          color="from-gold/25 to-amber-500/10 text-gold border-gold/40"
          downloaded={downloadedKey === "sahasaknaada-attendance"}
          onClick={() =>
            run(arrived.length, "sahasaknaada-attendance", () =>
              registrationsToCsv(arrived, includeContact),
            )
          }
        />

        <ExportCard
          title="Pending Arrivals (Awaiting Check-in)"
          subtitle="Registered delegates who have not yet arrived at the venue"
          count={waiting.length}
          icon={Clock}
          color="from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30"
          downloaded={downloadedKey === "sahasaknaada-not-arrived"}
          onClick={() =>
            run(waiting.length, "sahasaknaada-not-arrived", () =>
              registrationsToCsv(waiting, includeContact),
            )
          }
        />

        <ExportCard
          title="Schools & Teacher Directory"
          subtitle="Participating institutions, short codes, and teacher contacts"
          count={schools.length}
          unit="school"
          icon={GraduationCap}
          color="from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30"
          downloaded={downloadedKey === "sahasaknaada-schools"}
          onClick={() =>
            run(schools.length, "sahasaknaada-schools", () =>
              schoolsListToCsv(schools, includeContact),
            )
          }
        />
      </div>

      {/* Individual School Exports */}
      {schools.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-gold" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Delegation CSV Per School ({schools.length})
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {schools.map((s) => {
              const rows = live.filter((r) => r.school.id === s.id);
              const key = `sahasaknaada-${slug(s.name) || "school"}`;
              return (
                <ExportCard
                  key={s.id}
                  title={s.name}
                  subtitle={s.district}
                  count={rows.length}
                  icon={GraduationCap}
                  downloaded={downloadedKey === key}
                  onClick={() =>
                    run(rows.length, key, () => registrationsToCsv(rows, includeContact))
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive-foreground animate-in shake duration-200"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function ExportCard({
  title,
  subtitle,
  count,
  unit = "member",
  icon: Icon,
  color,
  downloaded,
  onClick,
}: {
  title: string;
  subtitle?: string;
  count: number;
  unit?: string;
  icon?: typeof Users;
  color?: string;
  downloaded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className={cn(
        "group relative flex items-center justify-between gap-4 rounded-2xl border border-hairline/60 bg-surface/80 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-xl hover:shadow-black/40 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed",
        downloaded && "border-emerald-500/50 bg-emerald-500/10",
      )}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br transition group-hover:scale-105",
              color ?? "border-hairline/60 bg-background/80 text-gold",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm sm:text-base font-bold text-foreground group-hover:text-gold transition-colors">
            {title}
          </p>
          {subtitle && <p className="truncate text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          <p className="mt-1 text-xs font-semibold tabular-nums text-gold">
            {count} {unit}
            {count === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hairline/80 bg-background/80 transition group-hover:border-gold/50 group-hover:bg-gold group-hover:text-black",
          downloaded ? "border-emerald-500 text-emerald-400 bg-emerald-500/20" : "text-gold",
        )}
      >
        <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
      </span>
    </button>
  );
}
