import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Sparkles,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { PassSheet } from "@/components/pass-card";
import { RegisterAtmosphere } from "@/components/home/register-atmosphere";
import { EVENT } from "@/lib/content";
import {
  getEventSettings,
  registerSchool,
  type EventSettings,
  type MemberInput,
  type MemberRole,
  type SchoolInput,
  type SchoolPasses,
} from "@/lib/registration";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — Sahasaknaada" },
      {
        name: "description",
        content:
          "Register for Sahasaknaada, the inter-school audio workshop by the Radio Club of D. S. Senanayake College.",
      },
      { property: "og:title", content: "Register — Sahasaknaada" },
      {
        property: "og:description",
        content:
          "Register for Sahasaknaada, the inter-school audio workshop by the Radio Club of D. S. Senanayake College.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <RegisterAtmosphere />
      <SiteHeader />
      <main className="relative z-10 mx-auto w-full max-w-[1200px] px-5 py-12 sm:px-8 md:py-16">
        <RegisterLayout />
      </main>
      <SiteFooter />
    </div>
  );
}

function RegisterLayout() {
  return (
    <div className="grid items-start gap-10 md:grid-cols-[0.92fr_1.08fr] md:gap-14 lg:gap-20">
      {/* Left column — event identity & experience */}
      <div className="flex flex-col gap-7">
        <Link
          to="/"
          className="reg-rise inline-flex w-fit items-center gap-2 rounded-md text-sm font-medium text-[var(--reg-text-2)] transition-colors hover:text-[var(--reg-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reg-bg)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <span className="reg-rise reg-rise-2 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--reg-gold-edge)] bg-[rgba(231,181,74,0.06)] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--reg-gold)]">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Inter-school audio workshop
        </span>

        <h1 className="reg-rise reg-rise-3 font-display text-4xl font-bold leading-[1.02] tracking-tight text-[var(--reg-text)] text-balance sm:text-5xl md:text-[3.4rem]">
          Register for{" "}
          <span className="bg-gradient-to-br from-[var(--reg-gold-2)] to-[var(--reg-gold)] bg-clip-text text-transparent">
            Sahasaknaada
          </span>
        </h1>

        <p className="reg-rise reg-rise-4 max-w-md text-base leading-relaxed text-[var(--reg-text-2)] text-pretty">
          Register your school's team in two quick steps: tell us about your school, then add your
          team members one by one. Every member gets an entry pass with a QR code and a number for a
          fast check-in on the day.
        </p>

        <Waveform />

        <div className="reg-rise reg-rise-5 mt-1 flex items-center gap-3 rounded-xl border border-[var(--reg-edge)] bg-[rgba(20,23,28,0.5)] p-3.5">
          <img
            src={EVENT.logoUrl}
            alt="Sahasaknaada official event logo"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--reg-text)]">{EVENT.host}</p>
            <p className="truncate text-xs text-[var(--reg-text-muted)]">{EVENT.tagline}</p>
          </div>
        </div>

        <p className="reg-rise reg-rise-6 flex items-center gap-2 text-xs text-[var(--reg-text-muted)]">
          <ShieldCheck className="h-4 w-4 text-[var(--reg-gold)]/80" aria-hidden />
          Your details are only used to manage your school&apos;s registration.
        </p>
      </div>

      {/* Right column — registration form */}
      <div className="reg-rise reg-rise-4">
        <RegisterForm />
      </div>
    </div>
  );
}

/* Calm, editorial decorative waveform — not an equalizer dashboard. */
function Waveform() {
  const bars = Array.from({ length: 28 }, (_, i) =>
    Math.round(28 + 52 * Math.abs(Math.sin(i * 0.6)) + 14 * Math.abs(Math.cos(i * 0.34))),
  );
  return (
    <div
      className="reg-rise reg-rise-5 flex h-12 items-center gap-[3px] overflow-hidden"
      aria-hidden
    >
      {bars.map((h, i) => (
        <span
          key={i}
          className="wave-bar w-[3px] shrink-0 rounded-full bg-gradient-to-t from-[var(--reg-gold)]/30 to-[var(--reg-gold)]/85"
          style={{
            height: `${h}%`,
            animationDelay: `${(i % 10) * 110}ms`,
            animationDuration: "1.6s",
          }}
        />
      ))}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\s-]{7,20}$/;

type SchoolKey = keyof SchoolInput;

const SCHOOL_FIELDS: {
  key: SchoolKey;
  label: string;
  required: boolean;
  maxLength: number;
  type: string;
  autoComplete: string;
  hint?: string;
  wide?: boolean;
}[] = [
  {
    key: "name",
    label: "School name",
    required: true,
    maxLength: 150,
    type: "text",
    autoComplete: "organization",
    wide: true,
  },
  {
    key: "district",
    label: "District",
    required: true,
    maxLength: 80,
    type: "text",
    autoComplete: "off",
  },
  {
    key: "teacher_name",
    label: "Teacher in charge",
    required: true,
    maxLength: 100,
    type: "text",
    autoComplete: "name",
  },
  {
    key: "contact_phone",
    label: "Contact number",
    required: true,
    maxLength: 20,
    type: "tel",
    autoComplete: "tel",
  },
  {
    key: "contact_email",
    label: "Contact email",
    required: true,
    maxLength: 254,
    type: "email",
    autoComplete: "email",
    hint: "You will need this email and your school code to find your passes later.",
  },
  {
    key: "notes",
    label: "Anything else we should know? (optional)",
    required: false,
    maxLength: 500,
    type: "text",
    autoComplete: "off",
    wide: true,
  },
];

const EMPTY_SCHOOL: SchoolInput = {
  name: "",
  district: "",
  teacher_name: "",
  contact_phone: "",
  contact_email: "",
  notes: "",
};

const EMPTY_MEMBER: MemberInput = { full_name: "", grade: "", role: "student" };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function validateSchool(v: SchoolInput): Partial<Record<SchoolKey, string>> {
  const out: Partial<Record<SchoolKey, string>> = {};
  for (const f of SCHOOL_FIELDS) {
    const val = v[f.key].trim();
    const label = f.label.replace(/\s*\(.*\)/, "");
    if (f.required && !val) {
      out[f.key] = `${label} is required.`;
      continue;
    }
    if (!val) continue;
    if (
      f.key !== "notes" &&
      f.key !== "contact_phone" &&
      f.key !== "contact_email" &&
      val.length < 2
    ) {
      out[f.key] = `${label} is too short.`;
    }
    if (f.key === "contact_email" && !EMAIL_RE.test(val))
      out[f.key] = "Enter a valid email address.";
    if (f.key === "contact_phone" && !PHONE_RE.test(val))
      out[f.key] = "Enter a valid contact number.";
    if (val.length > f.maxLength) out[f.key] = `Keep this under ${f.maxLength} characters.`;
  }
  return out;
}

function RegisterForm() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [step, setStep] = useState<"school" | "members">("school");
  const [school, setSchool] = useState<SchoolInput>(EMPTY_SCHOOL);
  const [schoolErrors, setSchoolErrors] = useState<Partial<Record<SchoolKey, string>>>({});
  const [members, setMembers] = useState<MemberInput[]>([]);
  const [draft, setDraft] = useState<MemberInput>(EMPTY_MEMBER);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SchoolPasses | null>(null);

  useEffect(() => {
    let active = true;
    void getEventSettings().then((s) => {
      if (active) setSettings(s);
    });
    return () => {
      active = false;
    };
  }, []);

  const max = settings?.max_members_per_school ?? 10;
  const full = members.length >= max;

  function goToMembers() {
    const found = validateSchool(school);
    setSchoolErrors(found);
    const first = SCHOOL_FIELDS.find((f) => found[f.key]);
    if (first) {
      document.getElementById(`field-${first.key}`)?.focus();
      return;
    }
    setStep("members");
  }

  function addMember(m: MemberInput = draft): boolean {
    const name = m.full_name.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      setDraftError("Enter the member's full name.");
      return false;
    }
    if (name.length > 120) {
      setDraftError("Name is too long.");
      return false;
    }
    if (m.grade.trim().length > 40) {
      setDraftError("Grade is too long.");
      return false;
    }
    if (members.some((x) => norm(x.full_name) === norm(name))) {
      setDraftError(`${name} is already on the team.`);
      return false;
    }
    if (full) {
      setDraftError(`A school can register at most ${max} members.`);
      return false;
    }
    setMembers((list) => [...list, { full_name: name, grade: m.grade.trim(), role: m.role }]);
    setDraft({ ...EMPTY_MEMBER, role: m.role });
    setDraftError(null);
    document.getElementById("member-name")?.focus();
    return true;
  }

  async function submit() {
    if (submitting || members.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const data = await registerSchool(school, members);
      setResult(data);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <SuccessPanel
        data={result}
        email={school.contact_email}
        onReset={() => {
          setResult(null);
          setSchool(EMPTY_SCHOOL);
          setMembers([]);
          setDraft(EMPTY_MEMBER);
          setStep("school");
        }}
      />
    );
  }

  if (settings && !settings.registration_open) {
    return (
      <div className="reg-panel px-6 py-10 text-center sm:px-9">
        <h2 className="font-display text-2xl font-bold text-[var(--reg-text)]">
          Registration is closed
        </h2>
        <p className="mt-2 text-sm text-[var(--reg-text-2)]">
          We are not accepting new school registrations right now. Already registered? You can{" "}
          <Link to="/passes" className="text-[var(--reg-gold)] underline underline-offset-4">
            get your passes here
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="reg-panel relative overflow-hidden px-6 py-8 sm:px-9 sm:py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[var(--reg-gold-edge)] to-transparent"
      />
      <div className="relative">
        <ol className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em]">
          {(
            [
              ["school", "1 · School"],
              ["members", "2 · Team"],
            ] as const
          ).map(([id, label]) => (
            <li
              key={id}
              aria-current={step === id ? "step" : undefined}
              className={cn(
                "rounded-full border px-3 py-1",
                step === id
                  ? "border-[var(--reg-gold-edge)] bg-[rgba(231,181,74,0.1)] text-[var(--reg-gold)]"
                  : "border-[var(--reg-edge)] text-[var(--reg-text-muted)]",
              )}
            >
              {label}
            </li>
          ))}
        </ol>

        {step === "school" ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              goToMembers();
            }}
          >
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--reg-text)]">
              Your school
            </h2>
            <p className="mt-2 text-sm text-[var(--reg-text-2)]">
              One registration per school. Fields marked{" "}
              <span className="text-[var(--reg-gold)]">*</span> are required.
            </p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {SCHOOL_FIELDS.map((f) => {
                const err = schoolErrors[f.key];
                return (
                  <div key={f.key} className={cn("flex flex-col gap-2", f.wide && "sm:col-span-2")}>
                    <label
                      htmlFor={`field-${f.key}`}
                      className="text-sm font-medium text-[var(--reg-text)]"
                    >
                      {f.label}
                      {f.required && (
                        <span className="ml-1 text-[var(--reg-gold)]" aria-hidden>
                          *
                        </span>
                      )}
                    </label>
                    {f.key === "notes" ? (
                      <textarea
                        id={`field-${f.key}`}
                        value={school[f.key]}
                        maxLength={f.maxLength}
                        rows={3}
                        onChange={(e) => setSchool((s) => ({ ...s, [f.key]: e.target.value }))}
                        className="reg-input w-full px-3.5 py-2.5 text-sm"
                      />
                    ) : (
                      <input
                        id={`field-${f.key}`}
                        type={f.type}
                        inputMode={
                          f.key === "contact_phone"
                            ? "tel"
                            : f.key === "contact_email"
                              ? "email"
                              : "text"
                        }
                        autoComplete={f.autoComplete}
                        value={school[f.key]}
                        maxLength={f.maxLength}
                        onChange={(e) => setSchool((s) => ({ ...s, [f.key]: e.target.value }))}
                        aria-invalid={!!err}
                        aria-describedby={err ? `${f.key}-error` : undefined}
                        className="reg-input w-full px-3.5 py-2.5 text-base"
                      />
                    )}
                    {f.hint && !err && (
                      <p className="text-xs text-[var(--reg-text-muted)]">{f.hint}</p>
                    )}
                    {err && (
                      <p
                        id={`${f.key}-error`}
                        role="alert"
                        className="text-xs font-medium text-[#f78a6e]"
                      >
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-7 flex justify-end">
              <button
                type="submit"
                className="reg-cta inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reg-raised)] sm:w-auto"
              >
                Next: add team members
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </form>
        ) : (
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--reg-text)]">
              Your team
            </h2>
            <p className="mt-2 text-sm text-[var(--reg-text-2)]">
              Add each member of{" "}
              <strong className="text-[var(--reg-text)]">{school.name.trim()}</strong> one at a time
              — students and accompanying teachers. Each gets their own pass.
            </p>

            <div className="mt-6 rounded-2xl border border-[var(--reg-edge)] bg-[rgba(14,17,22,0.6)] p-4">
              <div
                className="grid gap-3 sm:grid-cols-[1fr_7rem_8rem]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMember();
                  }
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="member-name"
                    className="text-xs font-medium text-[var(--reg-text-2)]"
                  >
                    Full name
                  </label>
                  <input
                    id="member-name"
                    value={draft.full_name}
                    maxLength={120}
                    autoComplete="off"
                    onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                    aria-invalid={!!draftError}
                    className="reg-input w-full px-3.5 py-2.5 text-base"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="member-grade"
                    className="text-xs font-medium text-[var(--reg-text-2)]"
                  >
                    Grade
                  </label>
                  <input
                    id="member-grade"
                    value={draft.grade}
                    maxLength={40}
                    autoComplete="off"
                    placeholder="e.g. 11"
                    onChange={(e) => setDraft((d) => ({ ...d, grade: e.target.value }))}
                    className="reg-input w-full px-3.5 py-2.5 text-base"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="member-role"
                    className="text-xs font-medium text-[var(--reg-text-2)]"
                  >
                    Role
                  </label>
                  <select
                    id="member-role"
                    value={draft.role}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, role: e.target.value as MemberRole }))
                    }
                    className="reg-input w-full px-3 py-2.5 text-base"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
              </div>
              {draftError && (
                <p role="alert" className="mt-3 text-xs font-medium text-[#f78a6e]">
                  {draftError}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => addMember()}
                  disabled={full}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--reg-gold-edge)] bg-[rgba(231,181,74,0.1)] px-4 py-2 text-sm font-semibold text-[var(--reg-gold)] transition-colors hover:bg-[rgba(231,181,74,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Add member
                </button>
                {!members.some((m) => m.role === "teacher") && !full && (
                  <button
                    type="button"
                    onClick={() =>
                      addMember({ full_name: school.teacher_name, grade: "", role: "teacher" })
                    }
                    className="text-xs text-[var(--reg-text-2)] underline underline-offset-4 hover:text-[var(--reg-text)]"
                  >
                    Add {school.teacher_name.trim() || "the teacher in charge"} as a teacher
                  </button>
                )}
                <span className="ml-auto text-xs text-[var(--reg-text-muted)]">
                  {members.length} of {max} added
                </span>
              </div>
            </div>

            <ul className="mt-5 flex flex-col gap-2" aria-label="Team members added">
              {members.length === 0 && (
                <li className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--reg-edge)] p-4 text-sm text-[var(--reg-text-muted)]">
                  <Users className="h-4 w-4" aria-hidden /> No members yet — add at least one.
                </li>
              )}
              {members.map((m, i) => (
                <li
                  key={m.full_name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--reg-edge)] bg-[var(--reg-input)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--reg-text)]">
                      {i + 1}. {m.full_name}
                    </p>
                    <p className="text-xs text-[var(--reg-text-muted)]">
                      {m.role === "teacher" ? "Teacher" : "Student"}
                      {m.grade ? ` · Grade ${m.grade}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMembers((list) => list.filter((x) => x !== m))}
                    aria-label={`Remove ${m.full_name}`}
                    className="rounded-md p-2 text-[var(--reg-text-muted)] transition-colors hover:text-[#f78a6e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>

            {submitError && (
              <p role="alert" className="mt-4 text-sm font-medium text-[#f78a6e]">
                {submitError}
              </p>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep("school")}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-[var(--reg-text-2)] hover:text-[var(--reg-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Edit school details
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting || members.length === 0}
                className="reg-cta inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reg-raised)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Registering…
                  </>
                ) : (
                  <>
                    Register school &amp; get passes
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-[var(--reg-text-muted)]">
          Already registered?{" "}
          <Link to="/passes" className="text-[var(--reg-gold)] underline underline-offset-4">
            Get your passes
          </Link>
        </p>
      </div>
    </div>
  );
}

function SuccessPanel({
  data,
  email,
  onReset,
}: {
  data: SchoolPasses;
  email: string;
  onReset: () => void;
}) {
  const review = data.possible_duplicate || data.school.status === "needs_review";
  return (
    <div className="reg-panel relative overflow-hidden px-6 py-10 sm:px-9 sm:py-11">
      <div className="no-print text-center">
        <div
          className="reg-rise mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--reg-gold-edge)] bg-[rgba(231,181,74,0.1)] text-[var(--reg-gold)]"
          style={{ boxShadow: "0 0 36px rgba(231,181,74,0.22)" }}
        >
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <span className="reg-rise reg-rise-2 mt-4 inline-block text-xs font-semibold uppercase tracking-[0.24em] text-[var(--reg-gold)]">
          Registration received
        </span>
        <h2 className="reg-rise reg-rise-3 mt-2 font-display text-3xl font-bold tracking-tight text-[var(--reg-text)] sm:text-4xl text-balance">
          {data.school.name} is registered!
        </h2>
        <div className="reg-rise reg-rise-4 mt-5 inline-flex items-center gap-3 rounded-2xl border border-[var(--reg-edge)] bg-[var(--reg-input)] px-6 py-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--reg-text-muted)]">
            School code
          </span>
          <span className="font-mono text-2xl font-bold tracking-wider text-[var(--reg-gold)]">
            {data.school.registration_code}
          </span>
        </div>

        {review && (
          <div
            className="mx-auto mt-5 flex max-w-md items-start gap-3 rounded-xl border border-[rgba(247,138,110,0.3)] bg-[rgba(247,138,110,0.07)] p-4 text-left text-sm text-[var(--reg-text)]"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f78a6e]" aria-hidden />
            <p>
              We may already have a registration for a school with this name. Yours was still saved
              and the organizers will review it.
            </p>
          </div>
        )}

        <p className="mx-auto mt-5 max-w-lg text-sm text-[var(--reg-text-2)]">
          Each team member has their own pass below. Print them, save the PNGs, or take screenshots
          — the check-in desk scans the QR code or looks up the pass number. Lost them? Use your
          school code and <strong className="text-[var(--reg-text)]">{email}</strong> on the{" "}
          <Link to="/passes" className="text-[var(--reg-gold)] underline underline-offset-4">
            passes page
          </Link>{" "}
          any time.
        </p>
      </div>

      <div className="mt-8">
        <PassSheet data={data} />
      </div>

      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          asChild
          variant="outline"
          className="border-[var(--reg-edge)] bg-transparent text-[var(--reg-text)] hover:bg-[var(--reg-raised-2)] hover:text-[var(--reg-text)]"
        >
          <Link to="/" className="focus-visible:outline-none">
            Back to home
          </Link>
        </Button>
        <button
          onClick={onReset}
          className="reg-cta inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reg-raised)]"
        >
          Register another school
        </button>
      </div>
    </div>
  );
}
