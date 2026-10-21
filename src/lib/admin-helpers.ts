import { formatMemberNo, type Member, type School } from "@/lib/registration";

/** Sri Lanka time display from a UTC ISO string. */
export function fmtUtcLocal(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Asia/Colombo",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

/** Today's date as YYYY-MM-DD for export filenames. */
export function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

const CSV_HEADER = [
  "pass_number",
  "pass_code",
  "member_name",
  "role",
  "grade",
  "school",
  "district",
  "school_code",
  "school_status",
  "teacher_in_charge",
  "contact_phone",
  "contact_email",
  "checked_in",
  "checked_in_at",
  "registered_at",
] as const;

function esc(v: string) {
  // Prefix cells that spreadsheets would treat as formulas (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** One CSV row per team member, with their school's details alongside. */
export function membersToCsv(schools: School[], only?: (checkedIn: boolean) => boolean): string {
  const lines: string[] = [CSV_HEADER.join(",")];
  for (const s of schools) {
    for (const m of [...s.members].sort((a, b) => a.member_no - b.member_no)) {
      const checkedIn = m.checked_in_at !== null;
      if (only && !only(checkedIn)) continue;
      lines.push(
        [
          formatMemberNo(m.member_no),
          m.pass_code,
          m.full_name,
          m.role,
          m.grade ?? "",
          s.name,
          s.district,
          s.registration_code,
          s.status,
          s.teacher_name,
          s.contact_phone,
          s.contact_email,
          checkedIn ? "yes" : "no",
          m.checked_in_at ?? "",
          m.created_at,
        ]
          .map((v) => esc(String(v)))
          .join(","),
      );
    }
  }
  return lines.join("\n");
}

/** One CSV row per school. */
export function schoolsToCsv(schools: School[]): string {
  const lines = [
    [
      "school_code",
      "school",
      "district",
      "status",
      "teacher_in_charge",
      "contact_phone",
      "contact_email",
      "members",
      "checked_in",
      "notes",
      "registered_at",
    ].join(","),
  ];
  for (const s of schools) {
    lines.push(
      [
        s.registration_code,
        s.name,
        s.district,
        s.status,
        s.teacher_name,
        s.contact_phone,
        s.contact_email,
        String(s.members.length),
        String(s.members.filter((m) => m.checked_in_at).length),
        s.notes ?? "",
        s.created_at,
      ]
        .map((v) => esc(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}

/** Trigger a client-side CSV download. */
export function downloadCsv(name: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------- Member rows + new CSVs ------------------------- */

export type MemberRow = { member: Member; school: School };

export function flattenMembers(schools: School[]): MemberRow[] {
  return schools.flatMap((school) => school.members.map((member) => ({ member, school })));
}

/** Display reference for a member, e.g. SSA-0007. */
export function memberRef(m: Member): string {
  return `SSA-${formatMemberNo(m.member_no)}`;
}

export const MEMBER_STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  confirmed: "Confirmed",
  needs_review: "Needs review",
  cancelled: "Cancelled",
};

export function memberStatus(m: Member): string {
  return m.registration_status ?? "submitted";
}

/**
 * Registrations CSV. Email and phone are only included when explicitly asked for,
 * because the organizers haven't confirmed that exports may contain contact details.
 */
export function registrationsToCsv(rows: MemberRow[], includeContact: boolean): string {
  const header = [
    "reference",
    "name",
    "grade",
    "school",
    "school_short_code",
    "registration_status",
    "checked_in",
    "checked_in_at_utc",
    "submitted_at_utc",
    ...(includeContact ? ["email", "phone"] : []),
  ];
  const lines = [header.join(",")];
  const sorted = [...rows].sort((a, b) => a.member.member_no - b.member.member_no);
  for (const { member: m, school: s } of sorted) {
    const cells = [
      memberRef(m),
      m.full_name,
      m.grade ?? "",
      s.name,
      s.short_code ?? "",
      memberStatus(m),
      m.checked_in_at ? "yes" : "no",
      m.checked_in_at ?? "",
      m.created_at,
      ...(includeContact ? [m.email ?? "", m.phone ?? ""] : []),
    ];
    lines.push(cells.map((v) => esc(String(v))).join(","));
  }
  return lines.join("\n");
}

/** Schools list with short codes and radio club details. MIC contact fields are opt-in. */
export function schoolsListToCsv(schools: School[], includeContact: boolean): string {
  const header = [
    "short_code",
    "code_active",
    "school",
    "district",
    "address",
    "radio_club",
    "mic_name",
    "status",
    "members",
    "checked_in",
    "registered_at_utc",
    ...(includeContact ? ["school_email", "school_phone", "mic_phone", "mic_email"] : []),
  ];
  const lines = [header.join(",")];
  for (const s of schools) {
    const live = s.members.filter((m) => memberStatus(m) !== "cancelled");
    const cells = [
      s.short_code ?? "",
      s.code_active === false ? "no" : "yes",
      s.name,
      s.district,
      s.address ?? "",
      s.club_name ?? "",
      s.teacher_name,
      s.status,
      String(live.length),
      String(live.filter((m) => m.checked_in_at).length),
      s.created_at,
      ...(includeContact
        ? [s.contact_email, s.contact_phone, s.mic_phone ?? "", s.mic_email ?? ""]
        : []),
    ];
    lines.push(cells.map((v) => esc(String(v))).join(","));
  }
  return lines.join("\n");
}
