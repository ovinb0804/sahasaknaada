import { useMemo, useState } from "react";
import { ChevronDown, QrCode, Printer, Trash2, Undo2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PassCard, PassSheet } from "@/components/pass-card";
import {
  checkInMember,
  checkInTeam,
  deleteSchool,
  formatMemberNo,
  setSchoolStatus,
  undoCheckIn,
  type Member,
  type School,
  type SchoolStatus,
  type StaffProfile,
} from "@/lib/registration";
import { cn } from "@/lib/utils";
import {
  CheckBadge,
  STATUS_LABEL,
  Select,
  StatusBadge,
  fmtUtcLocal,
  schoolToPasses,
} from "./primitives";

export function Schools({
  schools,
  staff,
  onChanged,
}: {
  schools: School[];
  staff: StaffProfile;
  onChanged: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | SchoolStatus>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passFor, setPassFor] = useState<{ school: School; member: Member | null } | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return schools.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        s.district.toLowerCase().includes(term) ||
        s.registration_code.toLowerCase().includes(term) ||
        s.teacher_name.toLowerCase().includes(term) ||
        s.contact_email.toLowerCase().includes(term) ||
        s.members.some(
          (m) =>
            m.full_name.toLowerCase().includes(term) || m.pass_code.toLowerCase().includes(term),
        )
      );
    });
  }, [schools, q, status]);

  async function act(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const isAdmin = staff.role === "admin";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Schools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered.length} of {schools.length} school{schools.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-hairline bg-surface p-4 sm:grid-cols-[2fr_1fr]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search school, district, code, teacher, email or member"
          aria-label="Search schools"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Select
          label="Status filter"
          value={status}
          onChange={(v) => setStatus(v as "all" | SchoolStatus)}
          options={[
            { value: "all", label: "All statuses" },
            ...(Object.keys(STATUS_LABEL) as SchoolStatus[]).map((k) => ({
              value: k,
              label: STATUS_LABEL[k],
            })),
          ]}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
          {schools.length === 0 ? "No schools have registered yet." : "No schools match."}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {filtered.map((s) => {
          const members = [...s.members].sort((a, b) => a.member_no - b.member_no);
          const inCount = members.filter((m) => m.checked_in_at).length;
          const expanded = open === s.id;
          return (
            <li key={s.id} className="rounded-2xl border border-hairline bg-surface">
              <button
                onClick={() => setOpen(expanded ? null : s.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-4 rounded-2xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{s.name}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {s.district} · <span className="font-mono">{s.registration_code}</span> ·{" "}
                    {fmtUtcLocal(s.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <StatusBadge status={s.status} />
                  <span className="rounded-full border border-hairline px-2.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {inCount}/{members.length} in
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      expanded && "rotate-180",
                    )}
                    aria-hidden
                  />
                </div>
              </button>

              {expanded && (
                <div className="border-t border-hairline p-5">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Teacher in charge" value={s.teacher_name} />
                    <Detail label="Phone" value={s.contact_phone} />
                    <Detail label="Email" value={s.contact_email} />
                    <Detail label="Notes" value={s.notes ?? "—"} />
                  </dl>

                  <div className="mt-5 overflow-x-auto rounded-xl border border-hairline">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-background/60 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">No.</th>
                          <th className="px-4 py-2.5 font-medium">Name</th>
                          <th className="px-4 py-2.5 font-medium">Role</th>
                          <th className="px-4 py-2.5 font-medium">Attendance</th>
                          <th className="px-4 py-2.5 font-medium">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline">
                        {members.map((m) => (
                          <tr key={m.id}>
                            <td className="px-4 py-2.5 font-mono text-gold">
                              #{formatMemberNo(m.member_no)}
                            </td>
                            <td className="px-4 py-2.5">
                              {m.full_name}
                              {m.grade ? (
                                <span className="text-muted-foreground"> · Gr {m.grade}</span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 capitalize text-muted-foreground">
                              {m.role}
                            </td>
                            <td className="px-4 py-2.5">
                              <CheckBadge checkedIn={!!m.checked_in_at} />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => setPassFor({ school: s, member: m })}
                                  aria-label={`Show pass for ${m.full_name}`}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold hover:border-gold/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <QrCode className="h-3.5 w-3.5" aria-hidden /> Pass
                                </button>
                                {m.checked_in_at ? (
                                  <button
                                    onClick={() => void act(() => undoCheckIn(m.id))}
                                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-background"
                                  >
                                    <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
                                  </button>
                                ) : (
                                  <button
                                    disabled={s.status === "cancelled"}
                                    onClick={() => void act(() => checkInMember(m.pass_code))}
                                    className="rounded-md bg-gold px-2.5 py-1 text-xs font-semibold text-gold-foreground hover:bg-gold-deep disabled:opacity-40"
                                  >
                                    Check in
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setPassFor({ school: s, member: null })}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Printer className="h-4 w-4" aria-hidden /> All passes / print
                    </button>
                    {inCount < members.length && s.status !== "cancelled" && (
                      <button
                        onClick={() => void act(() => checkInTeam(s.id))}
                        className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-gold-foreground hover:bg-gold-deep"
                      >
                        Check in whole team
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <div className="ml-auto w-44">
                          <Select
                            label="Registration status"
                            value={s.status}
                            onChange={(v) =>
                              void act(() => setSchoolStatus(s.id, v as SchoolStatus))
                            }
                            options={(Object.keys(STATUS_LABEL) as SchoolStatus[]).map((k) => ({
                              value: k,
                              label: STATUS_LABEL[k],
                            }))}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete ${s.name} and its ${members.length} member(s)? This can't be undone.`,
                              )
                            ) {
                              void act(() => deleteSchool(s.id));
                            }
                          }}
                          aria-label={`Delete ${s.name}`}
                          className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={passFor !== null} onOpenChange={(o) => !o && setPassFor(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-hairline bg-surface">
          {passFor && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl tracking-tight">
                  {passFor.member ? "Entry pass" : `Passes — ${passFor.school.name}`}
                </DialogTitle>
                <DialogDescription>
                  The QR encodes the pass code; the desk can also type the number.
                </DialogDescription>
              </DialogHeader>
              {passFor.member ? (
                <PassCard
                  schoolName={passFor.school.name}
                  member={{
                    member_no: passFor.member.member_no,
                    pass_code: passFor.member.pass_code,
                    full_name: passFor.member.full_name,
                    grade: passFor.member.grade,
                    role: passFor.member.role,
                  }}
                />
              ) : (
                <PassSheet data={schoolToPasses(passFor.school)} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}
