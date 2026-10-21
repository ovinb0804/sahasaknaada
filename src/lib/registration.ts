/*
 * Sahasaknaada — registration data layer (Supabase).
 *
 * A *school* registers a team. Each team member gets a pass number and a
 * QR code (the QR encodes the member's pass code). On event day the check-in
 * desk scans the QR or types the number.
 *
 * All authorization lives in the database (RLS + SECURITY DEFINER functions);
 * nothing in this file is trusted for security.
 */
import { rpc, select, update, remove } from "@/lib/supabase";

export type SchoolStatus = "confirmed" | "needs_review" | "cancelled";
export type MemberRole = "student" | "teacher";

export type Member = {
  id: string;
  member_no: number;
  school_id: string;
  pass_code: string;
  full_name: string;
  grade: string | null;
  role: MemberRole;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
};

export type School = {
  id: string;
  school_no: number;
  registration_code: string;
  name: string;
  district: string;
  teacher_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string | null;
  status: SchoolStatus;
  created_at: string;
  members: Member[];
  /** School-first flow fields (added by the school_first_registration migration). */
  short_code?: string | null;
  code_active?: boolean;
  address?: string | null;
  club_name?: string | null;
  mic_phone?: string | null;
  mic_email?: string | null;
};

export type SchoolInput = {
  name: string;
  district: string;
  teacher_name: string;
  contact_phone: string;
  contact_email: string;
  notes: string;
};

export type MemberInput = {
  full_name: string;
  grade: string;
  role: MemberRole;
};

/** What a school gets back after registering / looking up its passes. */
export type PassMember = {
  member_no: number;
  pass_code: string;
  full_name: string;
  grade: string | null;
  role: MemberRole;
};

export type SchoolPasses = {
  school: {
    id: string;
    name: string;
    district: string;
    registration_code: string;
    status: SchoolStatus;
    teacher_name: string;
  };
  members: PassMember[];
  possible_duplicate?: boolean;
};

export type MemberCard = {
  member: {
    id: string;
    member_no: number;
    pass_code: string;
    full_name: string;
    grade: string | null;
    role: MemberRole;
    checked_in_at: string | null;
  };
  school: {
    id: string;
    name: string;
    district: string;
    registration_code: string;
    status: SchoolStatus;
    teacher_name: string;
  };
  team: {
    id: string;
    member_no: number;
    full_name: string;
    role: MemberRole;
    checked_in_at: string | null;
  }[];
};

export type CheckInResult =
  | {
      result: "checked_in" | "already_checked_in" | "school_cancelled" | "undone";
      card: MemberCard;
    }
  | { result: "not_found" };

export type RegistrationPhase = "schools_first" | "open";

export type EventSettings = {
  registration_open: boolean;
  max_members_per_school: number;
  registration_phase?: RegistrationPhase;
  school_form_open?: boolean;
  member_form_open?: boolean;
  school_opens_at?: string | null;
  school_closes_at?: string | null;
  member_opens_at?: string | null;
  member_closes_at?: string | null;
  member_cap_enabled?: boolean;
};

/** Is a form currently accepting submissions, according to the public settings? */
export function formIsOpen(settings: EventSettings, form: "school" | "member"): boolean {
  if (!settings.registration_open) return false;
  const now = Date.now();
  const flag = form === "school" ? settings.school_form_open : settings.member_form_open;
  const opens = form === "school" ? settings.school_opens_at : settings.member_opens_at;
  const closes = form === "school" ? settings.school_closes_at : settings.member_closes_at;
  if (flag === false) return false;
  if (opens && new Date(opens).getTime() > now) return false;
  if (closes && new Date(closes).getTime() <= now) return false;
  return true;
}

/** Display number for a member, e.g. 7 → "0007". */
export function formatMemberNo(n: number): string {
  return String(n).padStart(4, "0");
}

/* ------------------------------- Public API ------------------------------- */

export function registerSchool(school: SchoolInput, members: MemberInput[]): Promise<SchoolPasses> {
  return rpc<SchoolPasses>("register_school", {
    p_school: school,
    p_members: members,
  });
}

/** Look passes up again with the school's registration code + contact email. */
export function getSchoolPasses(code: string, email: string): Promise<SchoolPasses | null> {
  return rpc<SchoolPasses | null>("get_school_passes", { p_code: code, p_email: email });
}

const DEFAULT_SETTINGS: EventSettings = {
  registration_open: true,
  max_members_per_school: 10,
  registration_phase: "schools_first",
  school_form_open: true,
  member_form_open: true,
};

export async function getEventSettings(): Promise<EventSettings> {
  try {
    const rows = await select<EventSettings[]>(
      "event_settings?select=registration_open,max_members_per_school,registration_phase,school_form_open,member_form_open,school_opens_at,school_closes_at,member_opens_at,member_closes_at,member_cap_enabled&limit=1",
    );
    return rows[0] ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/* ------------------------------- Staff API -------------------------------- */

export type StaffProfile = { user_id: string; display_name: string; role: "admin" | "desk" };

export async function getStaffProfile(userId: string): Promise<StaffProfile | null> {
  const rows = await select<StaffProfile[]>(
    `staff?select=user_id,display_name,role&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  );
  return rows[0] ?? null;
}

export function listSchools(): Promise<School[]> {
  return select<School[]>("schools?select=*,members(*)&order=created_at.desc");
}

export function checkInMember(code: string): Promise<CheckInResult> {
  return rpc<CheckInResult>("check_in_member", { p_code: code });
}

export function checkInTeam(schoolId: string): Promise<number> {
  return rpc<number>("check_in_team", { p_school_id: schoolId });
}

export function undoCheckIn(memberId: string): Promise<CheckInResult> {
  return rpc<CheckInResult>("undo_check_in", { p_member_id: memberId });
}

/* Admin-only (enforced by RLS) */

export function setSchoolStatus(id: string, status: SchoolStatus): Promise<void> {
  return update(`schools?id=eq.${encodeURIComponent(id)}`, { status });
}

export function deleteSchool(id: string): Promise<void> {
  return remove(`schools?id=eq.${encodeURIComponent(id)}`);
}

export function saveEventSettings(s: EventSettings): Promise<void> {
  return update("event_settings?id=eq.true", { ...s, updated_at: new Date().toISOString() });
}

/* --------------------------- School-first flow ---------------------------- */

export type SchoolRegistrationInput = {
  name: string;
  address: string;
  district: string;
  contact_email: string;
  contact_phone: string;
  club_name: string;
  mic_name: string;
  mic_phone: string;
  mic_email: string;
  notes: string;
};

export type SchoolRegistrationResult =
  | { status: "created"; school_name: string; short_code: string }
  | { status: "duplicate" };

export function registerSchoolV2(input: SchoolRegistrationInput): Promise<SchoolRegistrationResult> {
  return rpc<SchoolRegistrationResult>("register_school_v2", { p_school: input });
}

export type CodeLookup =
  | { valid: true; school_name: string }
  | { valid: false; reason: "empty" | "unknown" | "deactivated" | "full" };

/** Normalise what a person typed: strip whitespace, upper-case. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function lookupSchoolCode(code: string): Promise<CodeLookup> {
  return rpc<CodeLookup>("lookup_school_code", { p_code: normalizeCode(code) });
}

export type MemberRegistrationInput = {
  full_name: string;
  grade: string;
  email: string;
  phone: string;
};

export type MemberRegistrationResult = {
  status: "created";
  full_name: string;
  school_name: string;
  reference: string;
  pass_code: string;
  possible_duplicate: boolean;
};

export function registerMember(
  code: string,
  input: MemberRegistrationInput,
): Promise<MemberRegistrationResult> {
  return rpc<MemberRegistrationResult>("register_member", {
    p_code: normalizeCode(code),
    p_member: input,
  });
}

/** The URL a school's QR code encodes. */
export function memberRegistrationUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/register/member?code=${encodeURIComponent(code)}`;
}

/* Admin: deactivate / reactivate a school's code (admins only, enforced by RLS). */
export function setSchoolCodeActive(id: string, active: boolean): Promise<void> {
  return update(`schools?id=eq.${encodeURIComponent(id)}`, { code_active: active });
}

export type MemberCheckIn = { result: "checked_in" | "already_checked_in" | "cancelled" | "not_found"; checked_in_at?: string };

export function checkInMemberById(memberId: string): Promise<MemberCheckIn> {
  return rpc<MemberCheckIn>("check_in_member_id", { p_member_id: memberId });
}
