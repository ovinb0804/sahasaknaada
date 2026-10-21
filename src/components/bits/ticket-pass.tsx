/*
 * TicketPass — the Sahasaknaada entry pass, built on TearTicket.
 *
 * The body shows the event identity + registration code; the tear-off
 * stub carries a high-contrast, scannable QR encoding the pass code for
 * door verification. After the tear animation completes (onTear), a
 * "Download QR as PNG" action reveals so the participant can keep a
 * digital copy of the QR even after tearing the stub.
 */
import { useCallback, useEffect, useState } from "react";
import * as QRCode from "qrcode";
import { Download, QrCode, Ticket as TicketIcon } from "lucide-react";

import TearTicket from "@/components/bits/tear-ticket";
import { EVENT } from "@/lib/content";
import { cn } from "@/lib/utils";

export function TicketPass({ code, name }: { code: string; name: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [torn, setTorn] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Generate a high-contrast, scannable QR (black modules on white ground).
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(code, {
      margin: 1,
      width: 360,
      errorCorrectionLevel: "M",
      color: { dark: "#0A0A0A", light: "#FFFFFF" },
    })
      .then((url: string) => {
        if (active) setQr(url);
      })
      .catch(() => {
        if (active) setQr(null);
      });
    return () => {
      active = false;
    };
  }, [code]);

  const onTear = useCallback(() => {
    setTorn(true);
  }, []);

  // Render the full pass (QR + code + event identity) onto a canvas for PNG export.
  const renderPassCanvas = async (): Promise<HTMLCanvasElement | null> => {
    const W = 820;
    const H = 460;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background — near-black surface
    ctx.fillStyle = "#0D0D0D";
    ctx.fillRect(0, 0, W, H);

    // Gold accent bar on the left
    ctx.fillStyle = "#F5B921";
    ctx.fillRect(0, 0, 14, H);

    // Eyebrow
    ctx.fillStyle = "#F5B921";
    ctx.font = "600 16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textBaseline = "top";
    ctx.fillText("ADMIT ONE · ENTRY PASS", 48, 44);

    // Event name
    ctx.fillStyle = "#F5F5F5";
    ctx.font = "700 44px 'Space Grotesk', system-ui, sans-serif";
    ctx.fillText(EVENT.name.toUpperCase(), 48, 76);

    // Participant
    ctx.fillStyle = "#A3A3A3";
    ctx.font = "500 18px 'Manrope', system-ui, sans-serif";
    ctx.fillText(`Participant: ${name}`, 48, 140);

    // Pass code label + value
    ctx.fillStyle = "#A3A3A3";
    ctx.font = "600 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText("PASS CODE", 48, 188);
    ctx.fillStyle = "#F5B921";
    ctx.font = "700 40px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillText(code, 48, 212);

    // QR on the right — white plate for scannability
    const qrSize = 300;
    const qrX = W - qrSize - 48;
    const qrY = 80;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24);
    if (qr) {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("qr load failed"));
        img.src = qr;
      });
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
    } else {
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(qrX, qrY, qrSize, qrSize);
    }

    // Footer line
    ctx.fillStyle = "#A3A3A3";
    ctx.font = "500 14px 'Manrope', system-ui, sans-serif";
    ctx.fillText("Scan this QR at the door · Radio Club of D. S. Senanayake College", 48, H - 40);

    return canvas;
  };

  const downloadPng = async () => {
    if (downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const canvas = await renderPassCanvas();
      if (!canvas) throw new Error("canvas");
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahasaknaada-pass-${code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setDownloadError("Could not generate the PNG. Please take a screenshot instead.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <TearTicket
        width={520}
        height={280}
        stubSize={184}
        radius={20}
        holes={14}
        holeSize={6}
        notch={3}
        roughness={0}
        tearAngle={30}
        stretch={30}
        resistance={0.45}
        rotate={0}
        tilt
        tiltMax={7}
        tiltReach={280}
        parallax={6}
        perspective={1000}
        background="#0D0D0D"
        color="#F5F5F5"
        border
        borderColor="rgba(245,185,33,0.35)"
        borderWidth={1}
        stubBackground="#F5B921"
        recenter
        torn={torn}
        onTear={onTear}
        ariaLabel={`Tear off the QR entry pass for ${name}, code ${code}`}
        image=""
        imageAlt=""
        scrim={false}
        stub={
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gold px-3 py-4 text-[#0A0A0A]">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0A]/70">
              Scan at door
            </span>
            <div className="grid place-items-center rounded-lg bg-white p-1.5 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)]">
              {qr ? (
                <img
                  src={qr}
                  alt={`QR code encoding registration pass code ${code}`}
                  width={124}
                  height={124}
                  className="h-[124px] w-[124px]"
                />
              ) : (
                <div className="grid h-[124px] w-[124px] place-items-center rounded bg-neutral-200">
                  <QrCode className="h-10 w-10 text-neutral-500" aria-hidden />
                </div>
              )}
            </div>
            <span className="font-mono text-[11px] font-bold tracking-[0.14em] text-[#0A0A0A]">
              {code}
            </span>
          </div>
        }
      >
        <div className="flex h-full flex-col justify-between px-7 py-6 text-foreground">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-gold">
            <TicketIcon className="h-3.5 w-3.5" aria-hidden />
            <span>{EVENT.tagline}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Admit one
            </span>
            <span className="font-display text-2xl font-bold leading-tight tracking-tight">
              {EVENT.name}
            </span>
            <span className="mt-1 max-w-[260px] text-sm leading-snug text-muted-foreground">
              {name.split(" ")[0] || "Participant"} · keep this pass for the workshop.
            </span>
          </div>
          <div className="flex items-end justify-between">
            <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
              No.
            </span>
            <span className="font-display text-2xl font-bold tracking-[0.16em] text-gold">
              {code}
            </span>
          </div>
        </div>
      </TearTicket>

      {/* Reveal the QR download only after the tear animation completes */}
      <div
        className={cn(
          "mt-6 flex flex-col items-center gap-3 transition-all duration-500",
          torn
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
        aria-hidden={!torn}
      >
        <p className="text-center text-xs text-muted-foreground">
          Torn off the stub? Grab a digital copy and scan the QR at the door.
        </p>
        <button
          type="button"
          onClick={downloadPng}
          disabled={downloading || !torn}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--reg-gold-edge)] bg-[var(--reg-gold)] px-5 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-colors hover:bg-[var(--reg-gold-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--reg-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--reg-raised)] disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden />
          {downloading ? "Generating…" : "Download QR as PNG"}
        </button>
        {downloadError && (
          <p role="alert" className="text-center text-xs font-medium text-[#f78a6e]">
            {downloadError}
          </p>
        )}
      </div>
    </div>
  );
}
