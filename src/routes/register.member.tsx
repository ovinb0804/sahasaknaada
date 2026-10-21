import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Plus, Trash2 } from "lucide-react";

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

export const Route = createFileRoute("/register/member")({
  validateSearch: (s: Record<string, unknown>): { code?: string } => ({
    code: typeof s["code"] === "string" ? (s["code"] as string).slice(0, 32) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Register members — Sahasaknaada" },
      { name: "description", content: "Register one or more students for Sahasaknaada using your school's code." },
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

const MAX_ROWS = 30;

type Row = { key: number; full_name: string; grade: string; email: string; phone: string };
type RowErrors = Partial<Record<"full_name" | "grade" | "email" | "phone", string>>;

let nextKey = 1;
const blankRow = (): Row => ({ key: nextKey++, full_name: "", grade: "", email: "", phone: "" });

function validateRow(r: Row): RowErrors {
  const e: RowErrors = {};
  if (r.full_name.trim().length < 2) e.full_name = "Enter the full name.";
  if (!r.grade.trim()) e.grade = "Enter the grade / year.";
  if (!EMAIL_RE.test(r.email.trim())) e.email = "Enter a valid email address.";
  if (!PHONE_RE.test(r.phone.trim())) e.phone = "Enter a valid contact number.";
  return e;
}

function MemberRegistration() {
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
        setLookup({ state: "error", message: err instanceof Error ? err.message : "Could not check the code." });
      return false;
    }
  }

  // QR link: validate the prefilled code once on load.
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
    window.setTimeout(() => document.getElementById(`m-${row.key}-name`)?.focus(), 0);
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
    // Same email or number twice in one submission is almost always a typo.
    const seenEmail = new Set<string>();
    const seenPhone = new Set<string>();
    for (const r of rows) {
      const em = r.email.trim().toLowerCase();
      const ph = r.phone.trim();
      if (em && seenEmail.has(em)) nextRowErrors[r.key] = { ...nextRowErrors[r.key], email: "This email is already used above." };
      if (ph && seenPhone.has(ph)) nextRowErrors[r.key] = { ...nextRowErrors[r.key], phone: "This number is already used above." };
      seenEmail.add(em);
      seenPhone.add(ph);
    }
    setCodeError(nextCodeError);
    setRowErrors(nextRowErrors);

    if (nextCodeError) {
      document.getElementById("m-code")?.focus();
      return;
    }
    const badRow = rows.find((r) => nextRowErrors[r.key]);
    if (badRow) {
      const first = (["full_name", "grade", "email", "phone"] as const).find((k) => nextRowErrors[badRow.key]?.[k]);
      const suffix = first === "full_name" ? "name" : first;
      document.getElementById(`m-${badRow.key}-${suffix}`)?.focus();
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
      setDone(res); // only after the database confirms the write (all members or none)
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
  const shownCodeError = codeError ?? (lookup.state === "bad" || lookup.state === "error" ? lookup.message : undefined);

  return (
    <RegisterShell narrow>
      <BackLink to="/register">Back to registration</BackLink>
      <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
        Register members
      </h1>
      <p className="mt-3 max-w-2xl text-base text-[var(--reg-text-2)]">
        Enter your school code once, then add as many students as you need.
      </p>

      <GoldPanel className="mt-8">
        {done ? (
          <div className="flex flex-col gap-4" role="status">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
            <h2 className="font-display text-3xl font-bold">
              {done.members.length === 1 ? "1 member registered" : `${done.members.length} members registered`}
            </h2>
            <p className="text-base">
              School: <strong>{done.school_name}</strong>
            </p>
            <ul className="divide-y divide-[#0A0A0A]/25 rounded-2xl border-2 border-[#0A0A0A]">
              {done.members.map((m) => (
                <li key={m.reference} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span className="font-semibold">{m.full_name}</span>
                  <span className="font-mono text-sm">{m.reference}</span>
                  {m.possible_duplicate ? (
                    <span className="w-full text-sm">Similar to another registration, so the organizers will review it.</span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-sm opacity-80">
              This confirms the registrations were received. The organizers will share any further details.
            </p>
            {EVENT.whatsappGroupUrl ? (
              <a
                href={EVENT.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 self-start rounded-xl border border-white/30 bg-[#0A0A0A] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5B921]"
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> Join the WhatsApp group
              </a>
            ) : null}
            <DarkButton type="button" onClick={registerMore} className="self-start">
              <Plus className="h-4 w-4" aria-hidden /> Register more members
            </DarkButton>
          </div>
        ) : closed ? (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold">Member registration is not open right now</h2>
            <p>Please check back soon, or ask your radio club for details.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-6">
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
                error={shownCodeError}
                hint="The 6-character code your school received when it registered."
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(undefined);
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

            <ol className="flex flex-col gap-5">
              {rows.map((r, i) => {
                const err = rowErrors[r.key] ?? {};
                return (
                  <li key={r.key}>
                    <fieldset className="rounded-2xl border-2 border-[#0A0A0A] p-4 sm:p-5">
                      <legend className="px-2 text-sm font-bold uppercase tracking-[0.15em]">Member {i + 1}</legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField id={`m-${r.key}-name`} label="Full name" required autoComplete="off" maxLength={120} value={r.full_name} error={err.full_name} onChange={(e) => patchRow(r.key, { full_name: e.target.value })} className="sm:col-span-2" />
                        <TextField id={`m-${r.key}-grade`} label="Grade / year" required autoComplete="off" maxLength={40} value={r.grade} error={err.grade} onChange={(e) => patchRow(r.key, { grade: e.target.value })} />
                        <TextField id={`m-${r.key}-phone`} label="Contact number" required type="tel" autoComplete="off" maxLength={20} value={r.phone} error={err.phone} onChange={(e) => patchRow(r.key, { phone: e.target.value })} />
                        <TextField id={`m-${r.key}-email`} label="Email" required type="email" autoComplete="off" maxLength={254} value={r.email} error={err.email} onChange={(e) => patchRow(r.key, { email: e.target.value })} className="sm:col-span-2" />
                      </div>
                      {rows.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-md text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A0A0A]"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden /> Remove member {i + 1}
                        </button>
                      ) : null}
                    </fieldset>
                  </li>
                );
              })}
            </ol>

            <DarkButton type="button" onClick={addRow} disabled={rows.length >= MAX_ROWS} className="self-start">
              <Plus className="h-4 w-4" aria-hidden /> Add another member
            </DarkButton>

            {failure ? <GoldAlert tone="error">{failure}</GoldAlert> : null}
            <DarkButton type="submit" disabled={busy} className="w-full sm:w-auto sm:self-start">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {busy ? "Registering…" : rows.length === 1 ? "Register member" : `Register ${rows.length} members`}
            </DarkButton>
          </form>
        )}
      </GoldPanel>
    </RegisterShell>
  );
}
