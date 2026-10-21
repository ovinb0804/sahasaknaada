import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import { Check, Copy, Download, Loader2, Printer } from "lucide-react";

import {
  BackLink,
  DarkButton,
  EMAIL_RE,
  GoldAlert,
  GoldPanel,
  PHONE_RE,
  RegisterShell,
  TextField,
} from "@/components/register/shared";
import {
  formIsOpen,
  getEventSettings,
  memberRegistrationUrl,
  registerSchoolV2,
  type EventSettings,
  type SchoolRegistrationInput,
} from "@/lib/registration";

export const Route = createFileRoute("/register/school")({
  head: () => ({
    meta: [
      { title: "Register your school — Sahasaknaada" },
      {
        name: "description",
        content: "Register your school for Sahasaknaada and get a code your members use to register.",
      },
    ],
  }),
  component: SchoolRegistration,
});

type Key = keyof SchoolRegistrationInput;

/** Editable field list. Organizers confirm which fields exist and which are required. */
const FIELDS: {
  key: Key;
  label: string;
  required: boolean;
  type: string;
  autoComplete: string;
  group: "School details" | "Radio club details";
  max: number;
  wide?: boolean;
}[] = [
  { key: "name", label: "School name", required: true, type: "text", autoComplete: "organization", group: "School details", max: 150, wide: true },
  { key: "address", label: "School address (street / town)", required: true, type: "text", autoComplete: "street-address", group: "School details", max: 200, wide: true },
  { key: "district", label: "District / province", required: true, type: "text", autoComplete: "off", group: "School details", max: 80 },
  { key: "contact_email", label: "School email", required: true, type: "email", autoComplete: "email", group: "School details", max: 254 },
  { key: "contact_phone", label: "School contact number", required: true, type: "tel", autoComplete: "tel", group: "School details", max: 20 },
  { key: "club_name", label: "Radio club name", required: true, type: "text", autoComplete: "off", group: "Radio club details", max: 120 },
  { key: "mic_name", label: "MIC (member in charge) name", required: true, type: "text", autoComplete: "name", group: "Radio club details", max: 100 },
  { key: "mic_phone", label: "MIC contact number", required: true, type: "tel", autoComplete: "off", group: "Radio club details", max: 20 },
  { key: "mic_email", label: "MIC email", required: false, type: "email", autoComplete: "off", group: "Radio club details", max: 254 },
  { key: "notes", label: "Anything else we should know?", required: false, type: "text", autoComplete: "off", group: "Radio club details", max: 500, wide: true },
];

const EMPTY: SchoolRegistrationInput = {
  name: "", address: "", district: "", contact_email: "", contact_phone: "",
  club_name: "", mic_name: "", mic_phone: "", mic_email: "", notes: "",
};

function validate(v: SchoolRegistrationInput): Partial<Record<Key, string>> {
  const out: Partial<Record<Key, string>> = {};
  for (const f of FIELDS) {
    const val = v[f.key].trim();
    if (!val) {
      if (f.required) out[f.key] = `${f.label} is required.`;
      continue;
    }
    if (val.length > f.max) out[f.key] = `Keep this under ${f.max} characters.`;
    else if ((f.key === "contact_email" || f.key === "mic_email") && !EMAIL_RE.test(val))
      out[f.key] = "Enter a valid email address.";
    else if ((f.key === "contact_phone" || f.key === "mic_phone") && !PHONE_RE.test(val))
      out[f.key] = "Enter a valid phone number.";
    else if (f.type === "text" && f.key !== "notes" && val.length < 2) out[f.key] = "This is too short.";
  }
  return out;
}

type Outcome = { kind: "created"; schoolName: string; code: string } | { kind: "duplicate" };

function SchoolRegistration() {
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [values, setValues] = useState(EMPTY);
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
      document.getElementById(`f-${first.key}`)?.focus();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      const trimmed = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v.trim()]),
      ) as SchoolRegistrationInput;
      const res = await registerSchoolV2(trimmed);
      // Success is only shown after the database confirms the write.
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
  const groups = ["School details", "Radio club details"] as const;

  return (
    <RegisterShell narrow>
      <BackLink to="/register">Back to registration</BackLink>
      <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Register your school
      </h1>

      <GoldPanel className="mt-8">
        {outcome?.kind === "created" ? (
          <SchoolSuccess schoolName={outcome.schoolName} code={outcome.code} />
        ) : outcome?.kind === "duplicate" ? (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">This school may already be registered</h2>
            <p>Contact the organizers so they can check and share your school's code.</p>
          </div>
        ) : closed ? (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">School registration is not open right now</h2>
            <p>Please check back soon, or contact the organizers.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-8">
            {groups.map((g) => (
              <fieldset key={g} className="grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">{g}</legend>
                {FIELDS.filter((f) => f.group === g).map((f) => (
                  <TextField
                    key={f.key}
                    id={`f-${f.key}`}
                    label={f.label}
                    required={f.required}
                    type={f.type}
                    autoComplete={f.autoComplete}
                    maxLength={f.max}
                    value={values[f.key]}
                    error={errors[f.key]}
                    className={f.wide ? "sm:col-span-2" : undefined}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ))}
              </fieldset>
            ))}
            {failure ? <GoldAlert tone="error">{failure}</GoldAlert> : null}
            <DarkButton type="submit" disabled={busy} className="w-full sm:w-auto sm:self-start">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {busy ? "Registering…" : "Register school"}
            </DarkButton>
          </form>
        )}
      </GoldPanel>
    </RegisterShell>
  );
}

function SchoolSuccess({ schoolName, code }: { schoolName: string; code: string }) {
  const url = memberRegistrationUrl(code);
  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: "M", color: { dark: "#0A0A0A", light: "#FFFFFF" } })
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
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is shown on screen to copy by hand */
    }
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    a.download = `sahasaknaada-${code}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em]">School registered</p>
        <h2 className="mt-1 font-display text-3xl font-bold">{schoolName}</h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-semibold">Your school code</p>
          <p
            className="mt-1 select-all rounded-2xl bg-[#0A0A0A] px-5 py-4 text-center font-mono text-4xl font-bold tracking-[0.3em] text-white sm:text-5xl"
            aria-label={`School code ${code.split("").join(" ")}`}
          >
            {code}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <DarkButton type="button" onClick={copy}>
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copied" : "Copy code"}
            </DarkButton>
          </div>
        </div>
        <div className="mx-auto">
          {png ? (
            <img src={png} alt={`QR code for school code ${code}`} className="h-44 w-44 rounded-xl bg-white" />
          ) : (
            <div className="grid h-44 w-44 place-items-center rounded-xl bg-white/60 text-sm">QR unavailable</div>
          )}
        </div>
      </div>

      <p className="text-base font-semibold">
        Share this code or QR with your radio club members so they can register.
      </p>
      <GoldAlert tone="info">
        Save this code now. Registrations are private, so please keep it somewhere safe. If you lose it, the organizers can
        look it up for you.
      </GoldAlert>

      <div className="flex flex-wrap gap-2 print:hidden">
        {png ? (
          <a
            href={png}
            download={`sahasaknaada-${code}.png`}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/30 bg-[#0A0A0A] px-6 py-3 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5B921]"
          >
            <Download className="h-4 w-4" aria-hidden /> QR as PNG
          </a>
        ) : null}
        <DarkButton type="button" onClick={() => void downloadSvg()}>
          <Download className="h-4 w-4" aria-hidden /> QR as SVG
        </DarkButton>
        <DarkButton type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden /> Print
        </DarkButton>
      </div>
    </div>
  );
}
