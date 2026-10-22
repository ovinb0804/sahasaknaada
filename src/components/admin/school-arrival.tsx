/*
 * School-first check-in. Staff scan a school's QR (or type its short code), then
 * see every member that school registered and tick them off as they arrive.
 * Members who turn up late are ticked later from the same list, or found
 * individually with the desk search.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  ScanLine,
  Undo2,
  UserCheck,
  X,
} from "lucide-react";

import {
  checkInMemberById,
  checkInTeam,
  normalizeCode,
  undoCheckIn,
  type Member,
  type School,
} from "@/lib/registration";
import { fmtUtcLocal, memberRef, memberStatus } from "@/lib/admin-helpers";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** Pull a school short code out of a scanned QR URL (…?code=ABC234) or typed text. */
export function extractSchoolCode(raw: string): string {
  const text = raw.trim();
  const m = text.match(/[?&]code=([A-Za-z0-9]+)/);
  return normalizeCode(m ? m[1] : text);
}

export function findSchoolByCode(schools: School[], raw: string): School | undefined {
  const code = extractSchoolCode(raw);
  if (code.length < 4) return undefined;
  return schools.find((s) => (s.short_code ?? "").toUpperCase() === code);
}

/* ───────────── Camera QR scanner (native BarcodeDetector) ───────────── */

type DetectorLike = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

export function cameraScanSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window && !!navigator.mediaDevices;
}

export function ScanDialog({
  open,
  onClose,
  onResult,
}: {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    (async () => {
      try {
        if (!cameraScanSupported()) {
          setError("This browser can't scan QR codes with the camera. Use a handheld scanner or type the code.");
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped) return;
          try {
            const found = await detector.detect(video);
            if (found[0]?.rawValue) {
              stopped = true;
              onResult(found[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready — try again */
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Couldn't open the camera. Allow camera access, or type the code instead.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // onResult is stable enough for a one-shot scan
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-3xl border border-hairline/60 bg-surface/95 p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <ScanLine className="h-5 w-5 text-gold" /> Scan school QR
          </DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-300">
            {error}
          </p>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-gold/80" />
          </div>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Hold the school's QR code inside the frame.
        </p>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────── School arrival panel ───────────── */

export function SchoolArrivalPanel({
  school,
  onClose,
  onChanged,
  onChime,
}: {
  school: School;
  onClose: () => void;
  onChanged: () => void;
  onChime: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const members = useMemo(
    () => [...school.members].sort((a, b) => a.member_no - b.member_no),
    [school.members],
  );
  const live = members.filter((m) => memberStatus(m) !== "cancelled");
  const arrived = live.filter((m) => m.checked_in_at).length;
  const remaining = live.length - arrived;
  const allIn = live.length > 0 && remaining === 0;
  const schoolCancelled = school.status === "cancelled";

  async function toggle(m: Member) {
    if (busyId || bulkBusy) return;
    setError(null);
    if (m.checked_in_at) {
      if (!window.confirm(`Undo the check-in for ${m.full_name}?`)) return;
    }
    setBusyId(m.id);
    try {
      if (m.checked_in_at) {
        await undoCheckIn(m.id);
      } else {
        const res = await checkInMemberById(m.id);
        if (res.result === "cancelled") setError(`${m.full_name}'s registration is cancelled.`);
        else if (res.result === "not_found") setError("That registration no longer exists. Refresh the page.");
        else onChime();
      }
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function checkInAll() {
    if (bulkBusy || busyId || remaining === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      await checkInTeam(school.id);
      onChime();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't check in the team. Try again.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section
      aria-label={`${school.name} arrival`}
      className="rounded-3xl border border-gold/40 bg-surface/90 p-5 shadow-[0_0_30px_rgba(245,185,33,0.12)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">School arrival</p>
          <h2 className="mt-1 truncate font-display text-2xl font-bold text-foreground sm:text-3xl">
            {school.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Code <span className="font-mono font-semibold text-gold">{school.short_code}</span>
            {school.teacher_name ? ` · ${school.teacher_name}` : ""}
            {school.contact_phone ? ` · ${school.contact_phone}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close school panel"
          className="shrink-0 rounded-full border border-hairline/60 p-2 text-muted-foreground transition hover:bg-background hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {schoolCancelled && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" /> This school's registration is cancelled.
        </p>
      )}
      {school.status === "needs_review" && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm font-semibold text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> This school is flagged for review.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-2 w-32 overflow-hidden rounded-full bg-background sm:w-48" aria-hidden>
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${live.length ? (arrived / live.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-foreground" aria-live="polite">
            <strong className="text-gold">{arrived}</strong> / {live.length} arrived
          </span>
        </div>

        <button
          type="button"
          onClick={() => void checkInAll()}
          disabled={bulkBusy || remaining === 0 || schoolCancelled}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gold px-5 text-sm font-bold text-black shadow-md shadow-gold/20 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
          {allIn ? "Everyone has arrived" : `Check in all remaining (${remaining})`}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}

      {members.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-hairline/60 p-6 text-center text-sm text-muted-foreground">
          No members have registered with this school's code yet. Use the search below to find a
          person, or register them first.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-hairline/50 overflow-hidden rounded-2xl border border-hairline/60">
          {members.map((m) => {
            const cancelled = memberStatus(m) === "cancelled";
            const checked = Boolean(m.checked_in_at);
            const busy = busyId === m.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={cancelled || busy || bulkBusy || schoolCancelled}
                  onClick={() => void toggle(m)}
                  className={cn(
                    "flex w-full items-center gap-4 px-4 py-3.5 text-left transition",
                    checked ? "bg-emerald-500/5" : "bg-background/40 hover:bg-background/80",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition",
                      checked
                        ? "border-emerald-400 bg-emerald-400 text-black"
                        : "border-hairline bg-background text-transparent",
                    )}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : checked ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-base font-semibold",
                        cancelled ? "text-muted-foreground line-through" : "text-foreground",
                      )}
                    >
                      {m.full_name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      <span className="font-mono text-gold">{memberRef(m)}</span>
                      {m.grade ? ` · Grade ${m.grade}` : ""}
                      {m.role ? ` · ${m.role}` : ""}
                      {checked && m.checked_in_at ? ` · arrived ${fmtUtcLocal(m.checked_in_at)}` : ""}
                      {cancelled ? " · cancelled" : ""}
                    </span>
                  </span>
                  {checked && !busy && (
                    <Undo2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Late arrivals: leave this open and tick them when they come, or search for them by name or
        reference below.
      </p>
    </section>
  );
}

export function ScanButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-gold/50 bg-gold/10 px-5 text-sm font-bold text-gold transition hover:bg-gold/20 active:scale-95"
    >
      <Camera className="h-5 w-5" />
      <span>Scan school QR</span>
    </button>
  );
}
