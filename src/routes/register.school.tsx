import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Printer,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BackLink, EMAIL_RE, PHONE_RE, RegisterShell } from "@/components/register/shared";
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button";
import { EVENT } from "@/lib/content";
import {
  formIsOpen,
  getEventSettings,
  memberRegistrationUrl,
  registerSchoolV2,
  type EventSettings,
  type SchoolRegistrationInput,
} from "@/lib/registration";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register/school")({
  head: () => ({
    meta: [
      { title: "Register your school — Sahasak Naada" },
      {
        name: "description",
        content:
          "Register your school for Sahasak Naada and receive your official code and QR pass for delegate registration.",
      },
    ],
  }),
  component: SchoolRegistration,
});

type Key = keyof SchoolRegistrationInput;

interface FieldConfig {
  key: Key;
  label: string;
  required: boolean;
  type: string;
  autoComplete: string;
  group: "School details" | "Radio club details";
  max: number;
  placeholder: string;
  wide?: boolean;
}

const FIELDS: FieldConfig[] = [
  {
    key: "name",
    label: "School name",
    required: true,
    type: "text",
    autoComplete: "organization",
    group: "School details",
    max: 150,
    placeholder: "e.g. Royal College, Colombo",
    wide: true,
  },
  {
    key: "address",
    label: "School address (street / town)",
    required: true,
    type: "text",
    autoComplete: "street-address",
    group: "School details",
    max: 200,
    placeholder: "e.g. Rajakeeya Mawatha, Colombo 07",
    wide: true,
  },
  {
    key: "district",
    label: "District / province",
    required: true,
    type: "text",
    autoComplete: "off",
    group: "School details",
    max: 80,
    placeholder: "e.g. Colombo, Western Province",
  },
  {
    key: "contact_email",
    label: "School email",
    required: true,
    type: "email",
    autoComplete: "email",
    group: "School details",
    max: 254,
    placeholder: "info@school.sch.lk",
  },
  {
    key: "contact_phone",
    label: "School contact number",
    required: true,
    type: "tel",
    autoComplete: "tel",
    group: "School details",
    max: 20,
    placeholder: "011 269 0000",
  },
  {
    key: "club_name",
    label: "Radio club name",
    required: true,
    type: "text",
    autoComplete: "off",
    group: "Radio club details",
    max: 120,
    placeholder: "e.g. D.S.S.C. Media & Radio Club",
  },
  {
    key: "mic_name",
    label: "MIC (member in charge) name",
    required: true,
    type: "text",
    autoComplete: "name",
    group: "Radio club details",
    max: 100,
    placeholder: "Teacher or Master/Mistress-in-Charge",
  },
  {
    key: "mic_phone",
    label: "MIC contact number",
    required: true,
    type: "tel",
    autoComplete: "off",
    group: "Radio club details",
    max: 20,
    placeholder: "07X XXX XXXX",
  },
  {
    key: "mic_email",
    label: "MIC email",
    required: false,
    type: "email",
    autoComplete: "off",
    group: "Radio club details",
    max: 254,
    placeholder: "teacher@example.com",
  },
  {
    key: "notes",
    label: "Anything else we should know?",
    required: false,
    type: "text",
    autoComplete: "off",
    group: "Radio club details",
    max: 500,
    placeholder: "Special requirements, delegate count estimates, or additional notes...",
    wide: true,
  },
];

const EMPTY: SchoolRegistrationInput = {
  name: "",
  address: "",
  district: "",
  contact_email: "",
  contact_phone: "",
  club_name: "",
  mic_name: "",
  mic_phone: "",
  mic_email: "",
  notes: "",
};

function validate(v: SchoolRegistrationInput): Partial<Record<Key, string>> {
  const out: Partial<Record<Key, string>> = {};
  for (const f of FIELDS) {
    const val = v[f.key].trim();
    if (!val) {
      if (f.required) out[f.key] = `${f.label} is required.`;
      continue;
    }
    if (val.length > f.max) {
      out[f.key] = `Keep this under ${f.max} characters.`;
    } else if ((f.key === "contact_email" || f.key === "mic_email") && !EMAIL_RE.test(val)) {
      out[f.key] = "Enter a valid email address.";
    } else if ((f.key === "contact_phone" || f.key === "mic_phone") && !PHONE_RE.test(val)) {
      out[f.key] = "Enter a valid phone number.";
    } else if (f.type === "text" && f.key !== "notes" && val.length < 2) {
      out[f.key] = "Please enter at least 2 characters.";
    }
  }
  return out;
}

type Outcome = { kind: "created"; schoolName: string; code: string } | { kind: "duplicate" };

function SchoolRegistration() {
  useReveal();
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [values, setValues] = useState<SchoolRegistrationInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let active = true;
    void getEventSettings().then((s) => active && setSettings(s));
    return () => {
      active = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found = validate(values);
    setErrors(found);
    const first = FIELDS.find((f) => found[f.key]);
    if (first) {
      const el = document.getElementById(`f-${first.key}`);
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v.trim()]),
      ) as SchoolRegistrationInput;
      const res = await registerSchoolV2(trimmed);
      if (res.status === "created") {
        setOutcome({ kind: "created", schoolName: res.school_name, code: res.short_code });
      } else {
        setOutcome({ kind: "duplicate" });
      }
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const closed = settings !== null && !formIsOpen(settings, "school");
  const schoolFields = FIELDS.filter((f) => f.group === "School details");
  const clubFields = FIELDS.filter((f) => f.group === "Radio club details");

  return (
    <RegisterShell narrow>
      {/* Top breadcrumb / back action */}
      <div className="mb-2">
        <BackLink to="/register">Back to registration options</BackLink>
      </div>

      {/* Header introduction with clean typography and progress indicator */}
      <div className="mb-8 md:mb-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E7B54A]/30 bg-[#E7B54A]/10 px-3 py-1 text-xs font-semibold text-[#E7B54A]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E7B54A]" aria-hidden="true" />
          <span>Step 1 of 2 · School registration</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-[#F5F5F5] sm:text-4xl md:text-5xl text-balance">
          Register your <span className="text-[#E7B54A]">school</span>
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A5A9B2] sm:text-base text-pretty">
          Provide your school and radio club information so we can generate your institution's
          registration code and QR pass for Sahasak Naada.
        </p>
      </div>

      {/* Main SaaS-style Form Card: charcoal surface with fine border */}
      <div
        data-reveal
        className="reveal relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/[0.09] bg-[#111318] p-6 shadow-2xl shadow-black/80 ring-1 ring-white/[0.04] sm:p-10 md:p-12"
      >
        {/* Subtle warm-gold ambient line at card top */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#E7B54A]/40 to-transparent"
          aria-hidden="true"
        />

        {outcome?.kind === "created" ? (
          <SchoolSuccess schoolName={outcome.schoolName} code={outcome.code} />
        ) : outcome?.kind === "duplicate" ? (
          <div className="flex flex-col gap-4 py-4 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-[#F5F5F5]">
                This school may already be registered
              </h2>
              <p className="mt-2 text-sm text-[#A5A9B2]">
                Our records show a registration under this name or email. Please reach out to the
                Sahasak Naada organizing team so we can verify your entry and share your school code.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E7B54A] px-5 py-2.5 text-sm font-semibold text-[#07080A] shadow transition hover:bg-[#F0CC78]"
              >
                Back to registration options
              </Link>
              {EVENT.whatsappGroupUrl ? (
                <a
                  href={EVENT.whatsappGroupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-[#171A20] px-5 py-2.5 text-sm font-semibold text-[#F5F5F5] transition hover:bg-white/[0.06]"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span>Contact organizers</span>
                </a>
              ) : null}
            </div>
          </div>
        ) : closed ? (
          <div className="flex flex-col gap-4 py-4 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.12] bg-[#171A20] text-[#E7B54A]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-[#F5F5F5]">
                School registration is currently closed
              </h2>
              <p className="mt-2 text-sm text-[#A5A9B2]">
                Online registrations for schools are not open at this time. Please check back later or
                contact the Radio Electronics Association of D. S. Senanayake College.
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
          <form onSubmit={submit} noValidate className="flex flex-col gap-10">
            {/* Section A: School details */}
            <fieldset className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  <legend className="contents text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
                    Institution Information
                  </legend>
                </div>
                <span className="text-[11px] font-medium text-[#777E89]">Official details</span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {schoolFields.map((f) => (
                  <InputField
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    error={errors[f.key]}
                    onChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
                  />
                ))}
              </div>
            </fieldset>

            {/* Section B: Radio club & leadership details */}
            <fieldset className="flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-white/[0.07] pb-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
                  <Radio className="h-4 w-4" aria-hidden="true" />
                  <legend className="contents text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
                    Radio Club & Leadership
                  </legend>
                </div>
                <span className="text-[11px] font-medium text-[#777E89]">Supervision & team</span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {clubFields.map((f) => (
                  <InputField
                    key={f.key}
                    field={f}
                    value={values[f.key]}
                    error={errors[f.key]}
                    onChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
                  />
                ))}
              </div>
            </fieldset>

            {/* Error feedback alert if server-side failure occurs */}
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

            {/* Upgraded Submit Area with clear status, privacy assurance, and gold action button */}
            <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-xs text-[#777E89]">
                <ShieldCheck className="h-4 w-4 text-[#E7B54A] shrink-0" aria-hidden="true" />
                <span>Registrations are verified and kept private by organizers.</span>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-[#E7B54A] px-8 py-3 text-sm sm:text-base font-semibold text-[#07080A] shadow-md shadow-[#E7B54A]/10 transition-all hover:bg-[#F0CC78] hover:shadow-lg hover:shadow-[#E7B54A]/20 active:bg-[#d6a53d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E7B54A]/30 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-[#07080A]" aria-hidden="true" /> : null}
                <span>{busy ? "Registering school…" : "Register school"}</span>
                {!busy && <ArrowRight className="h-4 w-4 text-[#07080A]" aria-hidden="true" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </RegisterShell>
  );
}

interface InputFieldProps {
  field: FieldConfig;
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}

function InputField({ field, value, error, onChange }: InputFieldProps) {
  const describedBy = error ? `err-${field.key}` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", field.wide ? "sm:col-span-2" : "sm:col-span-1")}>
      <label
        htmlFor={`f-${field.key}`}
        className="flex items-center justify-between text-xs sm:text-sm font-medium text-[#F5F5F5]"
      >
        <span>
          {field.label}
          {field.required ? (
            <span className="ml-1 text-[#E7B54A]" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
        {!field.required ? (
          <span className="text-[11px] font-normal text-[#777E89]">(optional)</span>
        ) : null}
      </label>

      <input
        id={`f-${field.key}`}
        name={field.key}
        type={field.type}
        autoComplete={field.autoComplete}
        maxLength={field.max}
        required={field.required}
        aria-required={field.required}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-xl bg-[#0B0D11] px-4 py-3 text-sm sm:text-base text-[#F5F5F5] placeholder:text-[#777E89]/60",
          "border transition-all duration-150 focus:outline-none focus:ring-2",
          error
            ? "border-red-500/80 focus:border-red-500 focus:ring-red-500/20"
            : "border-white/[0.11] hover:border-white/[0.2] focus:border-[#E7B54A] focus:ring-[#E7B54A]/25",
        )}
      />

      {error ? (
        <p
          id={`err-${field.key}`}
          role="alert"
          className="mt-1 flex items-center gap-1.5 text-xs font-medium text-red-400"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

function SchoolSuccess({ schoolName, code }: { schoolName: string; code: string }) {
  const url = memberRegistrationUrl(code);
  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#07080A", light: "#FFFFFF" },
    })
      .then((d: string) => active && setPng(d))
      .catch(() => active && setPng(null));
    return () => {
      active = false;
    };
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "M",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = `sahasaknaada-${code}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header status */}
      <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-6">
        <div className="inline-flex items-center gap-1.5 self-start rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>School successfully registered</span>
        </div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F5F5]">
          {schoolName}
        </h2>
        <p className="text-sm text-[#A5A9B2]">
          Your registration is confirmed. Share the code or QR below with your students to register their individual passes.
        </p>
      </div>

      {/* Code card & QR visual */}
      <div className="rounded-2xl border border-white/[0.09] bg-[#171A20] p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#E7B54A]">
              Official School Code
            </span>
            <p
              className="mt-2 select-all font-mono text-4xl sm:text-5xl font-bold tracking-[0.25em] text-[#F0CC78]"
              aria-label={`School code ${code.split("").join(" ")}`}
            >
              {code}
            </p>
            <p className="mt-2 text-xs sm:text-sm text-[#A5A9B2]">
              Students enter this code when registering their entry passes for Sahasak Naada.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <LiquidGlassButton
                type="button"
                onClick={copy}
                variant="glass"
                size="default"
                className="text-xs sm:text-sm font-semibold"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4 text-[#E7B54A]" aria-hidden="true" />
                )}
                <span>{copied ? "Code copied to clipboard" : "Copy school code"}</span>
              </LiquidGlassButton>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 sm:self-center">
            <div className="rounded-2xl bg-white p-3.5 shadow-xl ring-1 ring-black/20">
              {png ? (
                <img
                  src={png}
                  alt={`QR code for school code ${code}`}
                  className="h-36 w-36 sm:h-40 sm:w-40"
                />
              ) : (
                <div className="grid h-36 w-36 sm:h-40 sm:w-40 place-items-center text-xs text-neutral-500">
                  Generating QR…
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-[#777E89]">Scan for direct pass</span>
          </div>
        </div>
      </div>

      {/* Safety & privacy reminder */}
      <div className="flex items-start gap-3 rounded-xl border border-[#E7B54A]/20 bg-[#E7B54A]/5 p-4 text-xs sm:text-sm text-[#A5A9B2]">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#E7B54A]" aria-hidden="true" />
        <div>
          <span className="font-semibold text-[#F5F5F5]">Save this code now. </span>
          Registrations are private. Please store this code or QR in a safe place. If lost, the
          organizers can retrieve it for your institution.
        </div>
      </div>

      {/* Next steps card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.09] bg-[#171A20] p-6 print:hidden">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E7B54A]">
            Next steps
          </span>
          <p className="mt-1 text-sm text-[#A5A9B2]">
            You can register your delegates right away, or share the code and QR with your club members.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <LiquidGlassButton
            asChild
            variant="gold"
            size="default"
          >
            <Link
              to="/register/member"
              search={{ code }}
            >
              <span>Register members now</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
                <span>Join WhatsApp group</span>
              </a>
            </LiquidGlassButton>
          ) : null}
        </div>
      </div>

      {/* Download & Print actions */}
      <div className="flex flex-wrap items-center gap-2.5 border-t border-white/[0.07] pt-4 print:hidden">
        {png ? (
          <LiquidGlassButton
            asChild
            variant="subtle"
            size="sm"
          >
            <a
              href={png}
              download={`sahasaknaada-${code}.png`}
            >
              <Download className="h-3.5 w-3.5 text-[#E7B54A]" aria-hidden="true" />
              <span>Download PNG</span>
            </a>
          </LiquidGlassButton>
        ) : null}
        <LiquidGlassButton
          type="button"
          onClick={() => void downloadSvg()}
          variant="subtle"
          size="sm"
        >
          <Download className="h-3.5 w-3.5 text-[#E7B54A]" aria-hidden="true" />
          <span>Download SVG</span>
        </LiquidGlassButton>
        <LiquidGlassButton
          type="button"
          onClick={() => window.print()}
          variant="subtle"
          size="sm"
        >
          <Printer className="h-3.5 w-3.5 text-[#A5A9B2]" aria-hidden="true" />
          <span>Print confirmation</span>
        </LiquidGlassButton>
      </div>
    </div>
  );
}
