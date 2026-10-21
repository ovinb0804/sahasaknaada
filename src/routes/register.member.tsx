import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

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
  lookupSchoolCode,
  normalizeCode,
  registerMember,
  type EventSettings,
  type MemberRegistrationResult,
} from "@/lib/registration";

export const Route = createFileRoute("/register/member")({
  validateSearch: (s: Record<string, unknown>): { code?: string } => ({
    code: typeof s["code"] === "string" ? (s["code"] as string).slice(0, 32) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Register as a member — Sahasaknaada" },
      { name: "description", content: "Register for Sahasaknaada using your school's code." },
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
  empty: "Enter your school code.",
  unknown: "That code was not recognised. Check it and try again.",
  deactivated: "This school code is no longer active. Please contact your radio club or the organizers.",
  full: "Registrations for this school are full. Please contact your radio club or the organizers.",
} as const;

function MemberRegistration() {
  const { code: codeFromQr } = Route.useSearch();
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [code, setCode] = useState(codeFromQr ?? "");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [fullName, setFullName] = useState("");
  const [grade, setGrade] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState<MemberRegistrationResult | null>(null);
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
      if (seq !== lookupSeq.current) return false; // a newer check superseded this one
      if (res.valid) {
        setLookup({ state: "ok", school: res.school_name });
        return true;
      }
      setLookup({ state: "bad", message: CODE_MESSAGES[res.reason] });
      return false;
    } catch (err) {
      if (seq === lookupSeq.current)
        setLookup({ state: "error", message: err instanceof Error ? err.message : "Could not check the code." });
      return false;
    }
  }

  // QR link: validate the prefilled code once on load.
  useEffect(() => {
    if (codeFromQr) void checkCode(codeFromQr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const found: Record<string, string> = {};
    if (!normalizeCode(code)) found["code"] = CODE_MESSAGES.empty;
    if (fullName.trim().length < 2) found["name"] = "Enter your full name.";
    if (!grade.trim()) found["grade"] = "Enter your grade / year.";
    if (!EMAIL_RE.test(email.trim())) found["email"] = "Enter a valid email address.";
    if (!PHONE_RE.test(phone.trim())) found["phone"] = "Enter a valid contact number.";
    setErrors(found);
    const firstId = ["code", "name", "grade", "email", "phone"].find((k) => found[k]);
    if (firstId) {
      document.getElementById(`m-${firstId}`)?.focus();
      return;
    }
    setBusy(true);
    setFailure(null);
    try {
      if (lookup.state !== "ok" && !(await checkCode(code))) return;
      const res = await registerMember(code, {
        full_name: fullName.trim(),
        grade: grade.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setDone(res); // only after the database confirms the write
    } catch (err) {
      setFailure(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const closed = settings !== null && !formIsOpen(settings, "member");
  const codeError = errors["code"] ?? (lookup.state === "bad" || lookup.state === "error" ? lookup.message : undefined);

  return (
    <RegisterShell narrow>
      <BackLink to="/register">Back to registration</BackLink>
      <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Register as a member
      </h1>

      <GoldPanel className="mt-8">
        {done ? (
          <div className="flex flex-col gap-3" role="status">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
            <h2 className="font-display text-3xl font-bold">You're registered, {done.full_name}</h2>
            <p className="text-base">
              School: <strong>{done.school_name}</strong>
            </p>
            <p className="text-base">
              Registration reference: <strong className="font-mono">{done.reference}</strong>
            </p>
            {done.possible_duplicate ? (
              <GoldAlert tone="info">
                We found a similar registration for your school, so the organizers will review yours.
              </GoldAlert>
            ) : null}
            <p className="text-sm opacity-80">
              This confirms your registration was received. The organizers will share any further details.
            </p>
          </div>
        ) : closed ? (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">Member registration is not open right now</h2>
            <p>Please check back soon, or ask your radio club for details.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <div>
              <TextField
                id="m-code"
                label="School code"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={32}
                value={code}
                error={codeError}
                hint="The 6-character code your school received when it registered."
                onChange={(e) => {
                  setCode(e.target.value);
                  setLookup({ state: "idle" });
                }}
                onBlur={() => code.trim() && lookup.state === "idle" && void checkCode(code)}
                className="[&_input]:font-mono [&_input]:uppercase [&_input]:tracking-[0.25em]"
              />
              <p aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold">
                {lookup.state === "checking" ? "Checking code…" : null}
                {lookup.state === "ok" ? `Registering for: ${lookup.school}` : null}
              </p>
            </div>
            <TextField id="m-name" label="Full name" required autoComplete="name" maxLength={120} value={fullName} error={errors["name"]} onChange={(e) => setFullName(e.target.value)} />
            <TextField id="m-grade" label="Grade / year" required autoComplete="off" maxLength={40} value={grade} error={errors["grade"]} onChange={(e) => setGrade(e.target.value)} />
            <TextField id="m-email" label="Email" required type="email" autoComplete="email" maxLength={254} value={email} error={errors["email"]} onChange={(e) => setEmail(e.target.value)} />
            <TextField id="m-phone" label="Contact number" required type="tel" autoComplete="tel" maxLength={20} value={phone} error={errors["phone"]} onChange={(e) => setPhone(e.target.value)} />
            {failure ? <GoldAlert tone="error">{failure}</GoldAlert> : null}
            <DarkButton type="submit" disabled={busy} className="w-full sm:w-auto sm:self-start">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {busy ? "Registering…" : "Register"}
            </DarkButton>
          </form>
        )}
      </GoldPanel>
    </RegisterShell>
  );
}
