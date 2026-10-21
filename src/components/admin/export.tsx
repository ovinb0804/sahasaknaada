import { useState } from "react";
import { Download } from "lucide-react";

import type { School } from "@/lib/registration";
import { dateStamp, downloadCsv, membersToCsv, schoolsToCsv } from "@/lib/admin-helpers";

export function ExportPanel({ schools }: { schools: School[] }) {
  const [error, setError] = useState<string | null>(null);

  const active = schools.filter((s) => s.status !== "cancelled");
  const members = active.flatMap((s) => s.members);
  const checkedIn = members.filter((m) => m.checked_in_at).length;

  function run(count: number, file: string, build: () => string) {
    setError(null);
    if (count === 0) {
      setError("There are no records for that export yet.");
      return;
    }
    try {
      downloadCsv(file, build());
    } catch {
      setError("Export failed — please try again.");
    }
  }

  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Reports &amp; Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          CSV exports, opened with Excel or Google Sheets. Cancelled schools are left out of the
          member lists.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ExportCard
          title="All members"
          count={members.length}
          onClick={() =>
            run(members.length, `sahasaknaada-members-${dateStamp()}.csv`, () =>
              membersToCsv(active),
            )
          }
        />
        <ExportCard
          title="Schools summary"
          count={schools.length}
          unit="school"
          onClick={() =>
            run(schools.length, `sahasaknaada-schools-${dateStamp()}.csv`, () =>
              schoolsToCsv(schools),
            )
          }
        />
        <ExportCard
          title="Attendance list (checked in)"
          count={checkedIn}
          onClick={() =>
            run(checkedIn, `sahasaknaada-attendance-${dateStamp()}.csv`, () =>
              membersToCsv(active, (c) => c),
            )
          }
        />
        <ExportCard
          title="Not yet arrived"
          count={members.length - checkedIn}
          onClick={() =>
            run(members.length - checkedIn, `sahasaknaada-not-arrived-${dateStamp()}.csv`, () =>
              membersToCsv(active, (c) => !c),
            )
          }
        />
      </div>

      {active.length > 0 && (
        <>
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Per school
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((s) => (
              <ExportCard
                key={s.id}
                title={s.name}
                count={s.members.length}
                onClick={() =>
                  run(
                    s.members.length,
                    `sahasaknaada-${slug(s.name) || "school"}-${dateStamp()}.csv`,
                    () => membersToCsv([s]),
                  )
                }
              />
            ))}
          </div>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ExportCard({
  title,
  count,
  unit = "member",
  onClick,
}: {
  title: string;
  count: number;
  unit?: string;
  onClick: () => void;
}) {
  return (
    <button
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
        <Download className="h-4 w-4" />
      </span>
    </button>
  );
}
