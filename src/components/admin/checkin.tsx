/*
 * Event-day check-in desk.
 *
 * Three ways to identify a member, fastest first:
 *   1. Camera — point at the QR on the pass (uses the browser's BarcodeDetector).
 *   2. Scan / type — a handheld USB/Bluetooth scanner "types" the code and presses
 *      Enter; staff can also just type the pass number (e.g. 7 or 0007).
 *   3. Search — by name, school or code, for people who forgot their pass.
 *
 * The database does the real work (check_in_member): it is idempotent, so a
 * double scan reports "already checked in" instead of checking in twice.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, Check, Search, Undo2, Users } from "lucide-react";

import {
  checkInMember,
  checkInTeam,
  formatMemberNo,
  undoCheckIn,
  type CheckInResult,
  type MemberCard,
  type School,
} from "@/lib/registration";
import { cn } from "@/lib/utils";
import { fmtUtcLocal } from "./primitives";

type Outcome = "checked_in" | "already_checked_in" | "school_cancelled";
type Shown =
  | { kind: "card"; result: Outcome | "undone"; card: MemberCard }
  | { kind: "not_found"; code: string }
  | { kind: "error"; message: string };

type LogEntry = { at: string; text: string; tone: "ok" | "warn" | "bad" };

/* ----------------------- feedback (sound + vibration) ---------------------- */

function feedback(tone: "ok" | "warn" | "bad") {
  try {
    navigator.vibrate?.(tone === "ok" ? 60 : [80, 60, 80]);
  } catch {
    /* unsupported */
  }
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = tone === "ok" ? 880 : tone === "warn" ? 520 : 220;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (tone === "ok" ? 0.12 : 0.3));
    osc.onended = () => void ctx.close();
  } catch {
    /* audio blocked until first user gesture */
  }
}

/* ------------------------------ Camera scanner ----------------------------- */

type BarcodeDetectorLike = { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> };
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

function getDetectorCtor(): BarcodeDetectorCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
}

function CameraScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Detector = getDetectorCtor();
    if (!Detector) {
      setError(
        "This browser can't scan QR codes with the camera. Use a handheld scanner or type the pass number.",
      );
      return;
    }
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    const detector = new Detector({ formats: ["qr_code"] });
    let last = { code: "", at: 0 };
    let busy = false;

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (s) => {
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = s;
        await v.play().catch(() => undefined);
        timer = setInterval(async () => {
          if (busy || v.readyState < 2) return;
          busy = true;
          try {
            const found = await detector.detect(v);
            const raw = found[0]?.rawValue?.trim();
            // Ignore the same code for a few seconds so one QR isn't processed repeatedly.
            if (raw && !(raw === last.code && Date.now() - last.at < 4000)) {
              last = { code: raw, at: Date.now() };
              onCodeRef.current(raw);
            }
          } catch {
            /* frame not ready */
          } finally {
            busy = false;
          }
        }, 250);
      })
      .catch(() =>
        setError(
          "Camera unavailable. Allow camera access in the browser, or type the pass number.",
        ),
      );

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-hairline bg-surface p-4 text-sm text-muted-foreground"
      >
        {error}
      </p>
    );
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-black">
      <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-gold/70"
      />
    </div>
  );
}

/* --------------------------------- Desk UI --------------------------------- */

export function CheckIn({ schools, onChanged }: { schools: School[]; onChanged: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Shown | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [camera, setCamera] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);

  const pushLog = useCallback((text: string, tone: LogEntry["tone"]) => {
    setLog((l) => [{ at: new Date().toISOString(), text, tone }, ...l].slice(0, 8));
  }, []);

  const run = useCallback(
    async (raw: string) => {
      const value = raw.trim();
      if (!value || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await checkInMember(value);
        if (res.result === "not_found") {
          setShown({ kind: "not_found", code: value });
          pushLog(`No pass found for “${value}”`, "bad");
          feedback("bad");
          return;
        }
        setShown({ kind: "card", result: res.result, card: res.card });
        const who = `${res.card.member.full_name} (#${formatMemberNo(res.card.member.member_no)})`;
        if (res.result === "checked_in") {
          pushLog(`Checked in ${who}`, "ok");
          feedback("ok");
        } else if (res.result === "already_checked_in") {
          pushLog(`Already in: ${who}`, "warn");
          feedback("warn");
        } else {
          pushLog(`Cancelled school: ${who}`, "bad");
          feedback("bad");
        }
        onChanged();
      } catch (e) {
        setShown({
          kind: "error",
          message: e instanceof Error ? e.message : "Something went wrong.",
        });
        feedback("bad");
      } finally {
        busyRef.current = false;
        setBusy(false);
        setCode("");
        if (!camera) inputRef.current?.focus();
      }
    },
    [camera, onChanged, pushLog],
  );

  async function undo(card: MemberCard) {
    try {
      const res = await undoCheckIn(card.member.id);
      if (res.result === "undone") {
        setShown({ kind: "card", result: "undone", card: res.card });
        pushLog(`Undid check-in: ${card.member.full_name}`, "warn");
        onChanged();
      }
    } catch (e) {
      setShown({ kind: "error", message: e instanceof Error ? e.message : "Couldn't undo." });
    }
  }

  async function checkInRestOfTeam(card: MemberCard) {
    try {
      const n = await checkInTeam(card.school.id);
      pushLog(`Checked in ${n} more from ${card.school.name}`, "ok");
      // Re-read the card (this member is already in, so it just returns fresh team state).
      const res = await checkInMember(card.member.pass_code);
      if (res.result !== "not_found") {
        setShown({ kind: "card", result: res.result, card: res.card });
      }
      feedback("ok");
      onChanged();
    } catch (e) {
      setShown({
        kind: "error",
        message: e instanceof Error ? e.message : "Couldn't check in team.",
      });
    }
  }

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const out: { member: School["members"][number]; school: School }[] = [];
    for (const s of schools) {
      if (s.status === "cancelled") continue;
      const schoolHit =
        s.name.toLowerCase().includes(term) || s.registration_code.toLowerCase().includes(term);
      for (const m of s.members) {
        if (
          schoolHit ||
          m.full_name.toLowerCase().includes(term) ||
          m.pass_code.toLowerCase().includes(term) ||
          formatMemberNo(m.member_no) === term.padStart(4, "0")
        ) {
          out.push({ member: m, school: s });
          if (out.length >= 12) return out;
        }
      }
    }
    return out;
  }, [q, schools]);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Check-in desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan the QR on a pass, or type the pass number and press Enter.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(code);
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="Pass number or scan…"
            aria-label="Pass number or scanned code"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-5 py-4 font-mono text-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="rounded-xl bg-gold px-5 text-sm font-semibold text-gold-foreground hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 disabled:opacity-50"
          >
            Check in
          </button>
        </form>

        <button
          type="button"
          onClick={() => setCamera((c) => !c)}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {camera ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {camera ? "Stop camera" : "Scan with camera"}
        </button>
        {camera && <CameraScanner onCode={(c) => void run(c)} />}

        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
            Forgot their pass? Search by name or school
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Start typing…"
              className="ml-auto w-44 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-normal focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {q.trim().length >= 2 && matches.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No matches.</p>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {matches.map(({ member, school }) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-hairline p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{member.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    #{formatMemberNo(member.member_no)} · {school.name}
                  </p>
                </div>
                {member.checked_in_at ? (
                  <span className="shrink-0 text-xs text-gold">
                    In · {fmtUtcLocal(member.checked_in_at)}
                  </span>
                ) : (
                  <button
                    onClick={() => void run(member.pass_code)}
                    className="shrink-0 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground hover:bg-gold-deep"
                  >
                    Check in
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <ResultPanel
          shown={shown}
          onUndo={(c) => void undo(c)}
          onTeam={(c) => void checkInRestOfTeam(c)}
        />
        {log.length > 0 && (
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent activity
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {log.map((l, i) => (
                <li key={`${l.at}-${i}`} className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      l.tone === "ok" && "text-foreground",
                      l.tone === "warn" && "text-amber-400",
                      l.tone === "bad" && "text-destructive-foreground",
                    )}
                  >
                    {l.text}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {new Date(l.at).toLocaleTimeString("en-GB", {
                      timeZone: "Asia/Colombo",
                      hour12: false,
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultPanel({
  shown,
  onUndo,
  onTeam,
}: {
  shown: Shown | null;
  onUndo: (c: MemberCard) => void;
  onTeam: (c: MemberCard) => void;
}) {
  if (!shown) {
    return (
      <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-hairline p-8 text-center text-sm text-muted-foreground">
        Waiting for the first scan…
      </div>
    );
  }
  if (shown.kind === "not_found") {
    return (
      <Banner tone="bad" title="Pass not found">
        Nothing matches <span className="font-mono">{shown.code}</span>. Check the number, or search
        by name.
      </Banner>
    );
  }
  if (shown.kind === "error") {
    return (
      <Banner tone="bad" title="That didn't work">
        {shown.message}
      </Banner>
    );
  }

  const { card, result } = shown;
  const total = card.team.length;
  const inCount = card.team.filter((t) => t.checked_in_at).length;
  const cancelled = result === "school_cancelled";
  const tone = cancelled ? "bad" : result === "checked_in" ? "ok" : "warn";
  const title =
    result === "checked_in"
      ? "Checked in"
      : result === "already_checked_in"
        ? "Already checked in"
        : result === "undone"
          ? "Check-in undone"
          : "School registration cancelled — do not admit";

  return (
    <div className="flex flex-col gap-4">
      <Banner tone={tone} title={title}>
        {result === "already_checked_in" && card.member.checked_in_at
          ? `Arrived ${fmtUtcLocal(card.member.checked_in_at)}`
          : result === "checked_in"
            ? "Welcome in!"
            : result === "undone"
              ? "They are marked as not arrived."
              : "Send them to an organizer."}
      </Banner>

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-2xl font-bold">{card.member.full_name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {card.member.role === "teacher" ? "Teacher" : "Student"}
              {card.member.grade ? ` · Grade ${card.member.grade}` : ""}
            </p>
            <p className="mt-1 truncate text-sm text-foreground">
              {card.school.name} · {card.school.district}
            </p>
          </div>
          <p className="shrink-0 font-mono text-3xl font-bold text-gold">
            #{formatMemberNo(card.member.member_no)}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden />
          Team: <strong className="text-foreground">{inCount}</strong> of {total} here
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-hairline">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${total ? (inCount / total) * 100 : 0}%` }}
          />
        </div>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {card.team.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "grid h-4 w-4 place-items-center rounded-full border text-[10px]",
                  t.checked_in_at ? "border-gold bg-gold text-gold-foreground" : "border-hairline",
                )}
              >
                {t.checked_in_at && <Check className="h-3 w-3" />}
              </span>
              <span className={cn("truncate", t.id === card.member.id && "font-semibold")}>
                {t.full_name}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {!cancelled && inCount < total && (
            <button
              onClick={() => onTeam(card)}
              className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-gold-foreground hover:bg-gold-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            >
              Check in rest of team ({total - inCount})
            </button>
          )}
          {card.member.checked_in_at && (
            <button
              onClick={() => onUndo(card)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Undo2 className="h-4 w-4" /> Undo this check-in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: "ok" | "warn" | "bad";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-2xl border p-5",
        tone === "ok" && "border-emerald-500/50 bg-emerald-500/15",
        tone === "warn" && "border-amber-400/50 bg-amber-400/15",
        tone === "bad" && "border-red-500/50 bg-red-500/15",
      )}
    >
      <p className="font-display text-xl font-bold">{title}</p>
      <p className="mt-1 text-sm text-foreground/80">{children}</p>
    </div>
  );
}
