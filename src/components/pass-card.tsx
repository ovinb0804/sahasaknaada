/*
 * Entry passes for a registered team.
 *
 * Every member gets a card with a pass number and a QR code. The QR encodes the
 * member's pass code (e.g. SSA-0007-4F2A); the check-in desk scans it, or types
 * the number as a fallback. Cards are always light-on-dark-text so they print
 * cleanly and the QR keeps maximum contrast.
 */
import { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import { Download, Printer, QrCode } from "lucide-react";

import { EVENT } from "@/lib/content";
import { formatMemberNo, type PassMember, type SchoolPasses } from "@/lib/registration";

function useQr(value: string, width: number) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width,
      errorCorrectionLevel: "M",
      color: { dark: "#0A0A0A", light: "#FFFFFF" },
    })
      .then((u: string) => {
        if (active) setUrl(u);
      })
      .catch(() => {
        if (active) setUrl(null);
      });
    return () => {
      active = false;
    };
  }, [value, width]);
  return url;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/** Render a member's pass to a PNG data URL (used by the Download button). */
export async function renderPassPng(opts: {
  schoolName: string;
  member: PassMember;
}): Promise<string> {
  const { schoolName, member } = opts;
  const W = 900;
  const H = 440;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#E7B54A";
  ctx.fillRect(0, 0, 16, H);

  ctx.textBaseline = "top";
  ctx.fillStyle = "#8a6a1c";
  ctx.font = "600 15px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("ENTRY PASS · ADMIT ONE", 52, 40);

  ctx.fillStyle = "#0A0A0A";
  ctx.font = "700 42px system-ui, sans-serif";
  ctx.fillText(EVENT.name.toUpperCase(), 52, 68);

  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText(clip(ctx, member.full_name, 480), 52, 150);
  ctx.fillStyle = "#444";
  ctx.font = "500 20px system-ui, sans-serif";
  ctx.fillText(clip(ctx, schoolName, 480), 52, 192);
  ctx.fillText(
    [member.role === "teacher" ? "Teacher" : "Student", member.grade].filter(Boolean).join(" · "),
    52,
    222,
  );

  ctx.fillStyle = "#777";
  ctx.font = "600 13px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText("PASS NUMBER", 52, 290);
  ctx.fillStyle = "#0A0A0A";
  ctx.font = "700 56px ui-monospace, Menlo, Consolas, monospace";
  ctx.fillText(`#${formatMemberNo(member.member_no)}`, 52, 312);

  const qrSize = 300;
  const qr = await loadImage(
    await QRCode.toDataURL(member.pass_code, {
      margin: 1,
      width: qrSize * 2,
      errorCorrectionLevel: "M",
    }),
  );
  ctx.drawImage(qr, W - qrSize - 60, 40, qrSize, qrSize);
  ctx.fillStyle = "#0A0A0A";
  ctx.font = "700 20px ui-monospace, Menlo, Consolas, monospace";
  const codeW = ctx.measureText(member.pass_code).width;
  ctx.fillText(member.pass_code, W - 60 - qrSize / 2 - codeW / 2, 352);

  ctx.fillStyle = "#777";
  ctx.font = "500 14px system-ui, sans-serif";
  ctx.fillText("Show this at the check-in desk · " + EVENT.host, 52, H - 36);

  return canvas.toDataURL("image/png");
}

function clip(ctx: CanvasRenderingContext2D, text: string, max: number) {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

export function PassCard({ schoolName, member }: { schoolName: string; member: PassMember }) {
  const qr = useQr(member.pass_code, 360);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const url = await renderPassPng({ schoolName, member });
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahasaknaada-pass-${formatMemberNo(member.member_no)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="pass-card flex break-inside-avoid overflow-hidden rounded-2xl bg-white text-left text-[#0A0A0A] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)]">
      <div aria-hidden className="w-2 shrink-0 bg-[#E7B54A]" />
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a6a1c]">
            Entry pass · Admit one
          </p>
          <p className="mt-1 font-display text-lg font-bold uppercase tracking-tight">
            {EVENT.name}
          </p>
          <p className="mt-3 truncate text-base font-bold">{member.full_name}</p>
          <p className="truncate text-sm text-neutral-600">{schoolName}</p>
          <p className="text-xs text-neutral-500">
            {[member.role === "teacher" ? "Teacher" : "Student", member.grade]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Pass number
          </p>
          <p className="font-mono text-3xl font-bold tracking-wider">
            #{formatMemberNo(member.member_no)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-l border-dashed border-neutral-300 px-4 py-4">
        <div className="grid h-[136px] w-[136px] place-items-center">
          {qr ? (
            <img
              src={qr}
              alt={`QR code for pass ${member.pass_code}`}
              width={136}
              height={136}
              className="h-[136px] w-[136px]"
            />
          ) : (
            <QrCode className="h-10 w-10 text-neutral-400" aria-hidden />
          )}
        </div>
        <p className="font-mono text-[11px] font-bold tracking-wider">{member.pass_code}</p>
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="no-print inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B54A] disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {busy ? "…" : "PNG"}
        </button>
        {error && (
          <p role="alert" className="no-print text-[10px] text-red-600">
            Couldn&apos;t save. Screenshot instead.
          </p>
        )}
      </div>
    </article>
  );
}

/** All of a school's passes, with a print / save-as-PDF button. */
export function PassSheet({ data }: { data: SchoolPasses }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--reg-text-2)]">
          {data.members.length} pass{data.members.length === 1 ? "" : "es"} for{" "}
          <strong className="text-[var(--reg-text)]">{data.school.name}</strong>
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--reg-edge-strong)] px-4 py-2 text-sm font-medium text-[var(--reg-text)] transition-colors hover:bg-[var(--reg-raised-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)]"
        >
          <Printer className="h-4 w-4" aria-hidden /> Print / save as PDF
        </button>
      </div>
      <div className="print-area grid gap-4">
        <p className="print-only font-mono text-sm">
          {data.school.name} · school code {data.school.registration_code}
        </p>
        {data.members.map((m) => (
          <PassCard key={m.member_no} schoolName={data.school.name} member={m} />
        ))}
      </div>
    </div>
  );
}
