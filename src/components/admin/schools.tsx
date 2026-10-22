import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  Search,
  Trash2,
  Undo2,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PassCard, PassSheet } from "@/components/pass-card";
import { SchoolCodePanel } from "./school-code";
import {
  checkInMember,
  checkInTeam,
  deleteSchool,
  formatMemberNo,
  setSchoolCodeActive,
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return schools.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        s.district.toLowerCase().includes(term) ||
        s.registration_code.toLowerCase().includes(term) ||
        (s.short_code ?? "").toLowerCase().includes(term) ||
        (s.club_name ?? "").toLowerCase().includes(term) ||
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isAdmin = staff.role === "admin";

  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            School Delegations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Showing {filtered.length} of {schools.length} registered school
            {schools.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid gap-3 rounded-2xl border border-hairline/60 bg-surface/80 p-4 sm:grid-cols-[2fr_1fr] shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search school name, district, code, teacher, email or student…"
            aria-label="Search schools"
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
        </div>

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
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-medium text-destructive-foreground"
        >
          {error}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-hairline/60 p-12 text-center text-sm text-muted-foreground">
          {schools.length === 0 ? "No schools have registered yet." : "No schools match your search query."}
        </div>
      )}

      {/* Schools Accordion Cards */}
      <ul className="flex flex-col gap-3">
        {filtered.map((s) => {
          const members = [...s.members].sort((a, b) => a.member_no - b.member_no);
          const inCount = members.filter((m) => m.checked_in_at).length;
          const expanded = open === s.id;
          const code = s.short_code ?? s.registration_code;
          const complete = members.length > 0 && inCount === members.length;

          return (
            <li
              key={s.id}
              className="rounded-2xl border border-hairline/60 bg-surface/80 transition-all duration-200 hover:border-gold/30 shadow-sm"
            >
              <button
                onClick={() => setOpen(expanded ? null : s.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-4 rounded-2xl p-4 sm:p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hairline/60 bg-background/80 text-gold">
                    <GraduationCap className="h-5 w-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-base sm:text-lg font-bold text-foreground">
                        {s.name}
                      </p>
                      {complete && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <Check className="h-2.5 w-2.5" /> All Arrived
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                      <span>{s.district}</span>
                      <span>•</span>
                      <span className="font-mono text-gold font-semibold">{code}</span>
                      {s.code_active === false && (
                        <span className="text-destructive font-medium">(code deactivated)</span>
                      )}
                      <span>•</span>
                      <span>Teacher: {s.teacher_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={s.status} />
                  <span className="rounded-full border border-hairline/80 bg-background/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
                    {inCount}/{members.length} in
                  </span>
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
                <div className="border-t border-hairline/60 p-5 sm:p-6 bg-background/30 rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
                  {/* Detailed Information Grid */}
                  <dl className="grid gap-4 text-xs sm:text-sm sm:grid-cols-2 lg:grid-cols-4 pb-5 border-b border-hairline/40">
                    <Detail label="Teacher in Charge" value={s.teacher_name} icon={User} />
                    <Detail label="Phone" value={s.contact_phone} icon={Phone} />
                    <Detail label="Email" value={s.contact_email} icon={Mail} />
                    <Detail label="District" value={s.district} icon={MapPin} />
                    <Detail label="Short Code" value={s.short_code ?? "—"} />
                    <Detail label="Radio Club" value={s.club_name ?? "—"} />
                    <Detail
                      label="MIC Contacts"
                      value={[s.mic_phone, s.mic_email].filter(Boolean).join(" · ") || "—"}
                    />
                    <Detail label="Address" value={s.address ?? "—"} />
                  </dl>

                  {/* School Code Sharing Component */}
                  {s.short_code && (
                    <div className="mt-5">
                      <SchoolCodePanel
                        code={s.short_code}
                        schoolName={s.name}
                        active={s.code_active !== false}
                      />
                    </div>
                  )}

                  {staff.role === "admin" && s.short_code && (
                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => {
                          const next = s.code_active === false;
                          const msg = next
                            ? `Reactivate the code for ${s.name}? Members will be able to register with it again.`
                            : `Deactivate the code for ${s.name}? New members will be blocked; existing registrations are kept.`;
                          if (window.confirm(msg)) void act(() => setSchoolCodeActive(s.id, next));
                        }}
                        className="rounded-xl border border-hairline/80 bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold transition cursor-pointer"
                      >
                        {s.code_active === false
                          ? "Reactivate school code"
                          : "Deactivate school code"}
                      </button>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(code)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-hairline/80 bg-surface px-3 py-1.5 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold transition cursor-pointer"
                      >
                        {copiedCode === code ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Code Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Copy School Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Registered Delegation Members Table */}
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-hairline/60 bg-surface/50 shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-background/80 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-hairline/60">
                        <tr>
                          <th className="px-4 py-3">Pass No.</th>
                          <th className="px-4 py-3">Student / Member Name</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">Attendance</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hairline/40">
                        {members.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
                              No members registered under this school yet.
                            </td>
                          </tr>
                        ) : (
                          members.map((m) => (
                            <tr key={m.id} className="hover:bg-background/40 transition">
                              <td className="px-4 py-3 font-mono font-bold text-gold text-xs">
                                #{formatMemberNo(m.member_no)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-foreground text-sm">
                                {m.full_name}
                                {m.grade ? (
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {" "}
                                    · Grade {m.grade}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 capitalize text-xs text-muted-foreground">
                                {m.role}
                              </td>
                              <td className="px-4 py-3">
                                <CheckBadge checkedIn={!!m.checked_in_at} />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setPassFor({ school: s, member: m })}
                                    aria-label={`Show pass for ${m.full_name}`}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold hover:bg-gold/20 active:scale-95 transition cursor-pointer"
                                  >
                                    <QrCode className="h-3.5 w-3.5" aria-hidden /> Pass
                                  </button>
                                  {m.checked_in_at ? (
                                    <button
                                      onClick={() => void act(() => undoCheckIn(m.id))}
                                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:text-destructive active:scale-95 transition cursor-pointer"
                                    >
                                      <Undo2 className="h-3 w-3" aria-hidden /> Undo
                                    </button>
                                  ) : (
                                    <button
                                      disabled={s.status === "cancelled"}
                                      onClick={() => void act(() => checkInMember(m.pass_code))}
                                      className="rounded-lg bg-gold px-3 py-1 text-xs font-bold text-black hover:brightness-110 active:scale-95 disabled:opacity-40 transition cursor-pointer"
                                    >
                                      Check In
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Delegation Controls Toolbar */}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setPassFor({ school: s, member: null })}
                      className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:border-gold/40 hover:text-gold active:scale-95 transition cursor-pointer"
                    >
                      <Printer className="h-4 w-4" aria-hidden />
                      <span>Print All Delegation Passes</span>
                    </button>

                    {inCount < members.length && s.status !== "cancelled" && members.length > 0 && (
                      <button
                        onClick={() => void act(() => checkInTeam(s.id))}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-xs font-bold text-black hover:brightness-110 active:scale-95 transition cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4 text-black" />
                        <span>Check In Whole Team ({members.length - inCount} remaining)</span>
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
                                `Permanently delete ${s.name} and its ${members.length} member(s)? This cannot be undone.`,
                              )
                            ) {
                              void act(() => deleteSchool(s.id));
                            }
                          }}
                          title={`Delete ${s.name}`}
                          className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-destructive hover:bg-destructive/20 active:scale-95 transition cursor-pointer"
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

      {/* Digital Pass Preview Dialog */}
      <Dialog open={passFor !== null} onOpenChange={(o) => !o && setPassFor(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border border-hairline/60 bg-surface/95 backdrop-blur-xl p-6 shadow-2xl">
          {passFor && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-gold" />
                  <span>{passFor.member ? "Entry Pass" : `Delegation Passes — ${passFor.school.name}`}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  The QR encodes the pass code; check-in staff can scan with a camera or scanner gun.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 flex justify-center">
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
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof User;
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
