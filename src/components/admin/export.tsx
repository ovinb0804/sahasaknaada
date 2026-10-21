import { useState } from "react";
import { Download } from "lucide-react";

import type { School } from "@/lib/registration";
import {
  dateStamp,
  downloadCsv,
  flattenMembers,
  memberStatus,
  registrationsToCsv,
  schoolsListToCsv,
} from "@/lib/admin-helpers";

/** CSV exports (admins only). Email and phone are left out unless ticked. */
export function ExportPanel({ schools }: { schools: School[] }) {
  const [error, setError] = useState<string | null>(null);
  const [includeContact, setIncludeContact] = useState(false);

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
    } catch {
      setError("Export failed. Please try again.");
    }
  }

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Reports &amp; Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV files for Excel or Google Sheets. Cancelled registrations are left out of member lists.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-4 text-sm">
        <input
          type="checkbox"
          checked={includeContact}
          onChange={(e) => setIncludeContact(e.target.checked)}
          className="mt-1 h-4 w-4"
        />
        <span>
          <strong className="font-medium">Include email addresses and phone numbers</strong>
          <span className="block text-muted-foreground">
            Off by default. Only turn this on if the organizers have approved sharing contact details.
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <ExportCard title="All registrations" count={live.length} onClick={() => run(live.length, "sahasaknaada-registrations", () => registrationsToCsv(live, includeContact))} />
        <ExportCard title="Attendance list (checked in)" count={arrived.length} onClick={() => run(arrived.length, "sahasaknaada-attendance", () => registrationsToCsv(arrived, includeContact))} />
        <ExportCard title="Not yet arrived" count={waiting.length} onClick={() => run(waiting.length, "sahasaknaada-not-arrived", () => registrationsToCsv(waiting, includeContact))} />
        <ExportCard title="Schools list (with short codes)" count={schools.length} unit="school" onClick={() => run(schools.length, "sahasaknaada-schools", () => schoolsListToCsv(schools, includeContact))} />
      </div>

      {schools.length > 0 && (
        <>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Members by school</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {schools.map((s) => {
              const rows = live.filter((r) => r.school.id === s.id);
              return (
                <ExportCard
                  key={s.id}
                  title={s.name}
                  count={rows.length}
                  onClick={() => run(rows.length, `sahasaknaada-${slug(s.name) || "school"}`, () => registrationsToCsv(rows, includeContact))}
                />
              );
            })}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function ExportCard({ title, count, unit = "member", onClick }: { title: string; count: number; unit?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface p-5 text-left transition-colors hover:border-gold/40 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} {unit}
          {count === 1 ? "" : "s"}
        </p>
      </div>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-gold">
        <Download className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}
