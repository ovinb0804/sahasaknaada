import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MessageCircle,
  Plus,
  School,
  ShieldCheck,
  Trash2,
  User,
  Users,
} from "lucide-react";

import { BackLink, EMAIL_RE, PHONE_RE, RegisterShell } from "@/components/register/shared";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { EVENT } from "@/lib/content";
import {
  formIsOpen,
  getEventSettings,
  lookupSchoolCode,
  normalizeCode,
  registerMembers,
  type EventSettings,
  type MembersRegistrationResult,
} from "@/lib/registration";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register/member")({
  validateSearch: (s: Record<string, unknown>): { code?: string } => ({
    code: typeof s["code"] === "string" ? (s["code"] as string).slice(0, 32) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Register members — Sahasak Naada" },
      {
        name: "description",
        content:
          "Register student delegates for Sahasak Naada using your school's unique registration code.",
      },
    ],
  }),
  component: MemberRegistration,
});

type Lookup =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok"; school: string }
  | { state: "bad"; message: string }
  | { state: "error"; message: string };

const CODE_MESSAGES = {
  empty: "Enter your 6-character school code.",
  unknown: "That code was not recognised. Please verify it with your teacher/radio club.",
  deactivated:
    "This school code is no longer active. Please contact your radio club or the organizers.",
  full: "Registrations for this school have reached capacity. Please contact the organizers.",
} as const;

const MAX_ROWS = 30;

type Row = { key: number; full_name: string; grade: string; email: string; phone: string };
type RowErrors = Partial<Record<"full_name" | "grade" | "email" | "phone", string>>;

let nextKey = 1;
const blankRow = (): Row => ({ key: nextKey++, full_name: "", grade: "", email: "", phone: "" });

function validateRow(r: Row): RowErrors {
  const e: RowErrors = {};
  if (r.full_name.trim().length < 2) e.full_name = "Enter the student's full name.";
  if (!r.grade.trim()) e.grade = "Enter the grade / year.";
  if (!EMAIL_RE.test(r.email.trim())) e.email = "Enter a valid email address.";
  if (!PHONE_RE.test(r.phone.trim())) e.phone = "Enter a valid phone number.";
  return e;
}

function MemberRegistration() {
  useReveal();
  const { code: codeFromQr } = Route.useSearch();
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [code, setCode] = useState(codeFromQr ?? "");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [rows, setRows] = useState<Row[]>(() => [blankRow()]);
  const [codeError, setCodeError] = useState<string | undefined>();
  const [rowErrors, setRowErrors] = useState<Record<number, RowErrors>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<MembersRegistrationResult | null>(null);
  const lookupSeq = useRef(0);

  useEffect(() => {
    let active = true;
    void getEventSettings().then((s) => active && setSettings(s));
    return () => {
      active = false;
    };
  }, []);

  async function checkCode(raw: string): Promise<boolean> {
    const norm = normalizeCode(raw);
    if (!norm) {
      setLookup({ state: "bad", message: CODE_MESSAGES.empty });
      return false;
    }
    const seq = ++lookupSeq.current;
    setLookup({ state: "checking" });
    try {
      const res = await lookupSchoolCode(norm);
      if (seq !== lookupSeq.current) return false;
      if (res.valid) {
        setLookup({ state: "ok", school: res.school_name });
        return true;
      }
      setLookup({ state: "bad", message: CODE_MESSAGES[res.reason] });
      return false;
    } catch (err) {
      if (seq === lookupSeq.current)
        setLookup({
          state: "error",
          message: err instanceof Error ? err.message : "Could not verify school code.",
        });
      return false;
    }
  }

  // QR link: validate the prefilled code on load
  useEffect(() => {
    if (codeFromQr) void checkCode(codeFromQr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchRow = (key: number, patch: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    const row = blankRow();
    setRows((list) => [...list, row]);
    window.setTimeout(() => {
      const el = document.getElementById(`m-${row.key}-name`);
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function removeRow(key: number) {
    setRows((list) => (list.length > 1 ? list.filter((r) => r.key !== key) : list));
    setRowErrors((e) => {
      const { [key]: _gone, ...rest } = e;
      return rest;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const nextCodeError = normalizeCode(code) ? undefined : CODE_MESSAGES.empty;
    const nextRowErrors: Record<number, RowErrors> = {};
    for (const r of rows) {
      const found = validateRow(r);
      if (Object.keys(found).length) nextRowErrors[r.key] = found;
    }

    // Catch duplicate email or phone within the same submission
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    for (const r of rows) {
      const em = r.email.trim().toLowerCase();
      const ph = r.phone.trim();
      if (em && seenEmail.has(em))
        nextRowErrors[r.key] = {
          ...nextRowErrors[r.key],
          email: "This email was already used for a member above.",
        };
      if (ph && seenPhone.has(ph))
        nextRowErrors[r.key] = {
          ...nextRowErrors[r.key],
          phone: "This phone number was already used above.",
        };
      seenEmail.add(em);
      seenPhone.add(ph);
    }
    setCodeError(nextCodeError);
    setRowErrors(nextRowErrors);

    if (nextCodeError) {
      const el = document.getElementById("m-code");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const badRow = rows.find((r) => nextRowErrors[r.key]);
    if (badRow) {
      const first = (["full_name", "grade", "email", "phone"] as const).find(
        (k) => nextRowErrors[badRow.key]?.[k],
      );
      const suffix = first === "full_name" ? "name" : first;
      const el = document.getElementById(`m-${badRow.key}-${suffix}`);
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      if (lookup.state !== "ok" && !(await checkCode(code))) return;
      const res = await registerMembers(
        code,
        rows.map((r) => ({
          full_name: r.full_name.trim(),
          grade: r.grade.trim(),
          email: r.email.trim(),
          phone: r.phone.trim(),
        })),
      );
      setDone(res);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function registerMore() {
    setDone(null);
    setRows([blankRow()]);
    setRowErrors({});
    setFailure(null);
  }

  const closed = settings !== null && !formIsOpen(settings, "member");
  const shownCodeError =
    codeError ?? (lookup.state === "bad" || lookup.state === "error" ? lookup.message : undefined);

  return (
    <RegisterShell narrow>
      {/* Top back action */}
      <div className="mb-2">
        <BackLink to="/register">Back to registration options</BackLink>
      </div>

      {/* Header introduction with step badge */}
      <div className="mb-8 md:mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E7B54A]/30 bg-[#E7B54A]/10 px-3 py-1 text-xs font-semibold text-[#E7B54A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E7B54A]" aria-hidden="true" />
          <span>Step 2 of 2 · Member registration</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-[#F5F5F5] sm:text-4xl md:text-5xl text-balance">
          Register <span className="text-[#E7B54A]">members</span>
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A5A9B2] sm:text-base text-pretty">
          Enter your school code once, then add the details of students attending Sahasak Naada from
          your institution.
        </p>
      </div>

      {/* Main SaaS Card */}
      <div
        data-reveal
        className="reveal relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.09] bg-[#111318] p-6 shadow-2xl shadow-black/80 ring-1 ring-white/[0.04] sm:p-10 md:p-12"
      >
        {/* Subtle warm-gold ambient line at card top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#E7B54A]/40 to-transparent"
          aria-hidden="true"
        />

        {done ? (
          <div className="flex flex-col gap-8" role="status">
            {/* Success Header */}
            <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-6">
              <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Registrations confirmed</span>
              </div>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
                {done.members.length === 1
                  ? "1 member registered"
                  : `${done.members.length} members registered`}
              </h2>
              <p className="text-sm text-[#A5A9B2]">
                School: <strong className="text-[#F5F5F5]">{done.school_name}</strong>
              </p>
            </div>

            {/* Passes list */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
                Delegate Pass Summary
              </span>
              <ul className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.09] bg-[#171A20] overflow-hidden">
                {done.members.map((m) => (
                  <li
                    key={m.reference}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-[#A5A9B2]">
                        <User className="h-4 w-4 text-[#E7B54A]" />
                      </div>
                      <span className="font-semibold text-[#F5F5F5] text-sm sm:text-base">
                        {m.full_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#0B0D11] border border-white/[0.09] px-3 py-1 font-mono text-xs font-bold tracking-wider text-[#F0CC78]">
                        {m.reference}
                      </span>
                    </div>

                    {m.possible_duplicate ? (
                      <div className="w-full text-xs text-amber-400/90 flex items-center gap-1.5 mt-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          Notice: This record matches a previous submission and will be reviewed by
                          organizers.
                        </span>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[#777E89]">
                These entry passes have been recorded in the event system. Individual QR passes can
                be retrieved at check-in desk on the day of the event.
              </p>
            </div>

            {/* Next actions */}
            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.07] pt-6">
              <LiquidGlassButton
                type="button"
                onClick={registerMore}
                variant="gold"
                size="default"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Register more members</span>
              </LiquidGlassButton>

              {EVENT.whatsappGroupUrl ? (
                <LiquidGlassButton
                  asChild
                  variant="glass"
                  size="default"
                >
                  <a
                    href={EVENT.whatsappGroupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>Join official WhatsApp group</span>
                  </a>
                </LiquidGlassButton>
              ) : null}

              <LiquidGlassButton
                asChild
                variant="subtle"
                size="default"
              >
                <Link to="/">
                  Return home
                </Link>
              </LiquidGlassButton>
            </div>
          </div>
        ) : closed ? (
          <div className="flex flex-col gap-4 py-4 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-[#171A20] text-[#E7B54A]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-[#F5F5F5]">
                Member registration is not open right now
              </h2>
              <p className="mt-2 text-sm text-[#A5A9B2]">
                Registrations for student members are currently closed. Please check back later or
                consult your school's radio club representative.
              </p>
            </div>
            <div className="mt-4">
              <Link
                to="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E7B54A] px-5 py-2.5 text-sm font-semibold text-[#07080A] transition hover:bg-[#F0CC78]"
              >
                Return to homepage
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-8">
            {/* School Code Section */}
            <div className="rounded-2xl border border-white/[0.09] bg-[#171A20] p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A] mb-3">
                <School className="h-4 w-4" aria-hidden="true" />
                <span>School Authorization</span>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="m-code"
                  className="flex items-center justify-between text-xs sm:text-sm font-medium text-[#F5F5F5]"
                >
                  <span>
                    School code <span className="text-[#E7B54A]">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-[#777E89]">6 characters</span>
                </label>

                <div className="relative">
                  <input
                    id="m-code"
                    type="text"
                    required
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={32}
                    value={code}
                    placeholder="e.g. DSK912"
                    aria-invalid={Boolean(shownCodeError)}
                    aria-describedby={shownCodeError ? "m-code-err" : "m-code-hint"}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setCodeError(undefined);
                      setLookup({ state: "idle" });
                    }}
                    onBlur={() => code.trim() && lookup.state === "idle" && void checkCode(code)}
                    className={cn(
                      "w-full rounded-xl bg-[#0B0D11] px-4 py-3 text-base sm:text-lg font-mono uppercase tracking-[0.22em] text-[#F5F5F5] placeholder:text-[#777E89]/50",
                      "border transition-all duration-150 focus:outline-none focus:ring-2",
                      shownCodeError
                        ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                        : lookup.state === "ok"
                          ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20"
                          : "border-white/[0.11] hover:border-white/[0.2] focus:border-[#E7B54A] focus:ring-[#E7B54A]/25",
                    )}
                  />
                  {lookup.state === "checking" && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-[#A5A9B2]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#E7B54A]" />
                      <span className="hidden sm:inline">Verifying…</span>
                    </div>
                  )}
                </div>

                {shownCodeError ? (
                  <p
                    id="m-code-err"
                    role="alert"
                    className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-400"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{shownCodeError}</span>
                  </p>
                ) : (
                  <p id="m-code-hint" className="text-xs text-[#777E89]">
                    The code your school received upon registering. Case insensitive.
                  </p>
                )}

                {lookup.state === "ok" && (
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>
                      Registered for: <strong className="text-white">{lookup.school}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Member Rows Fieldset */}
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  <span>Student Delegates</span>
                </div>
                <span className="text-[11px] font-medium text-[#777E89]">
                  {rows.length} {rows.length === 1 ? "member" : "members"} added
                </span>
              </div>

              <ol className="flex flex-col gap-5">
                {rows.map((r, i) => {
                  const err = rowErrors[r.key] ?? {};
                  return (
                    <li key={r.key}>
                      <div className="rounded-2xl border border-white/[0.09] bg-[#171A20] p-5 sm:p-6 transition-colors hover:border-white/[0.14]">
                        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E7B54A]/15 border border-[#E7B54A]/30 text-xs font-bold text-[#E7B54A]">
                              {i + 1}
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#F5F5F5]">
                              Member {i + 1}
                            </span>
                          </div>

                          {rows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeRow(r.key)}
                              className="apple-liquid-glass h-7 px-2.5 py-0.5 text-xs text-red-400 hover:text-red-300 border-red-500/20 bg-red-500/10 hover:bg-red-500/20 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Remove</span>
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          {/* Full Name */}
                          <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label
                              htmlFor={`m-${r.key}-name`}
                              className="text-xs sm:text-sm font-medium text-[#F5F5F5]"
                            >
                              Full name <span className="text-[#E7B54A]">*</span>
                            </label>
                            <input
                              id={`m-${r.key}-name`}
                              type="text"
                              required
                              autoComplete="off"
                              maxLength={120}
                              placeholder="e.g. Kaveen Silva"
                              value={r.full_name}
                              aria-invalid={Boolean(err.full_name)}
                              onChange={(e) => patchRow(r.key, { full_name: e.target.value })}
                              className={cn(
                                "w-full rounded-xl bg-[#0B0D11] px-4 py-2.5 text-sm sm:text-base text-[#F5F5F5] placeholder:text-[#777E89]/60",
                                "border transition-all duration-150 focus:outline-none focus:ring-2",
                                err.full_name
                                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-white/[0.11] hover:border-white/[0.2] focus:border-[#E7B54A] focus:ring-[#E7B54A]/25",
                              )}
                            />
                            {err.full_name && (
                              <p
                                role="alert"
                                className="mt-1 flex items-center gap-1.5 text-xs text-red-400"
                              >
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{err.full_name}</span>
                              </p>
                            )}
                          </div>

                          {/* Grade / year */}
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`m-${r.key}-grade`}
                              className="text-xs sm:text-sm font-medium text-[#F5F5F5]"
                            >
                              Grade / Year <span className="text-[#E7B54A]">*</span>
                            </label>
                            <input
                              id={`m-${r.key}-grade`}
                              type="text"
                              required
                              autoComplete="off"
                              maxLength={40}
                              placeholder="e.g. Grade 11 or A/L 2026"
                              value={r.grade}
                              aria-invalid={Boolean(err.grade)}
                              onChange={(e) => patchRow(r.key, { grade: e.target.value })}
                              className={cn(
                                "w-full rounded-xl bg-[#0B0D11] px-4 py-2.5 text-sm sm:text-base text-[#F5F5F5] placeholder:text-[#777E89]/60",
                                "border transition-all duration-150 focus:outline-none focus:ring-2",
                                err.grade
                                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-white/[0.11] hover:border-white/[0.2] focus:border-[#E7B54A] focus:ring-[#E7B54A]/25",
                              )}
                            />
                            {err.grade && (
                              <p
                                role="alert"
                                className="mt-1 flex items-center gap-1.5 text-xs text-red-400"
                              >
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{err.grade}</span>
                              </p>
                            )}
                          </div>

                          {/* Phone number */}
                          <div className="flex flex-col gap-1.5">
                            <label
                              htmlFor={`m-${r.key}-phone`}
                              className="text-xs sm:text-sm font-medium text-[#F5F5F5]"
                            >
                              Contact number <span className="text-[#E7B54A]">*</span>
                            </label>
                            <input
                              id={`m-${r.key}-phone`}
                              type="tel"
                              required
                              autoComplete="off"
                              maxLength={20}
                              placeholder="07X XXX XXXX"
                              value={r.phone}
                              aria-invalid={Boolean(err.phone)}
                              onChange={(e) => patchRow(r.key, { phone: e.target.value })}
                              className={cn(
                                "w-full rounded-xl bg-[#0B0D11] px-4 py-2.5 text-sm sm:text-base text-[#F5F5F5] placeholder:text-[#777E89]/60",
                                "border transition-all duration-150 focus:outline-none focus:ring-2",
                                err.phone
                                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-white/[0.11] hover:border-white/[0.2] focus:border-[#E7B54A] focus:ring-[#E7B54A]/25",
                              )}
                            />
                            {err.phone && (
                              <p
                                role="alert"
                                className="mt-1 flex items-center gap-1.5 text-xs text-red-400"
                              >
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{err.phone}</span>
                              </p>
                            )}
                          </div>

                          {/* Email */}
                          <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label
                              htmlFor={`m-${r.key}-email`}
                              className="text-xs sm:text-sm font-medium text-[#F5F5F5]"
                            >
                              Student email <span className="text-[#E7B54A]">*</span>
                            </label>
                            <input
                              id={`m-${r.key}-email`}
                              type="email"
                              required
                              autoComplete="off"
                              maxLength={254}
                              placeholder="student@example.com"
                              value={r.email}
                              aria-invalid={Boolean(err.email)}
                              onChange={(e) => patchRow(r.key, { email: e.target.value })}
                              className={cn(
                                "w-full rounded-xl bg-[#0B0D11] px-4 py-2.5 text-sm sm:text-base text-[#F5F5F5] placeholder:text-[#777E89]/60",
                                "border transition-all duration-150 focus:outline-none focus:ring-2",
                                err.email
                                  ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
                                  : "border-white/[0.11] hover:border-white/[0.2] focus:border-[#E7B54A] focus:ring-[#E7B54A]/25",
                              )}
                            />
                            {err.email && (
                              <p
                                role="alert"
                                className="mt-1 flex items-center gap-1.5 text-xs text-red-400"
                              >
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{err.email}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Add member button */}
              <LiquidGlassButton
                type="button"
                onClick={addRow}
                disabled={rows.length >= MAX_ROWS}
                variant="glass"
                size="default"
                className="self-start text-xs sm:text-sm font-medium"
              >
                <Plus className="h-4 w-4 text-[#E7B54A]" aria-hidden="true" />
                <span>Add another member ({rows.length}/{MAX_ROWS})</span>
              </LiquidGlassButton>
            </div>

            {/* Server failure alert */}
            {failure ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-300"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-semibold text-red-200">Registration could not be completed</p>
                  <p className="mt-0.5 text-xs text-red-300/90">{failure}</p>
                </div>
              </div>
            ) : null}

            {/* Bottom action bar */}
            <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-[#777E89]">
                <ShieldCheck className="h-4 w-4 text-[#E7B54A] shrink-0" aria-hidden="true" />
                <span>All member information is securely verified by event organizers.</span>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#E7B54A] px-8 py-3 text-sm sm:text-base font-semibold text-[#07080A] shadow-md shadow-[#E7B54A]/10 transition-all hover:bg-[#F0CC78] hover:shadow-lg hover:shadow-[#E7B54A]/20 active:bg-[#d6a53d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E7B54A]/30 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-[#07080A]" aria-hidden="true" /> : null}
                <span>
                  {busy
                    ? "Submitting registrations…"
                    : rows.length === 1
                      ? "Register member"
                      : `Register ${rows.length} members`}
                </span>
                {!busy && <ArrowRight className="h-4 w-4 text-[#07080A]" aria-hidden="true" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </RegisterShell>
  );
}
