/*
 * A school's short code and QR, for organizers: view, copy, download and print.
 * (Emailing the code to schools isn't set up, so this is how an organizer re-shares a lost code.)
 */
import { useEffect, useState } from "react";
import * as QRCode from "qrcode";
import { Check, Copy, Download } from "lucide-react";

import { memberRegistrationUrl } from "@/lib/registration";

export function SchoolCodePanel({
  code,
  schoolName,
  active,
}: {
  code: string;
  schoolName: string;
  active: boolean;
}) {
  const url = memberRegistrationUrl(code);
  const [png, setPng] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0A0A0A", light: "#FFFFFF" },
    })
      .then((d: string) => alive && setPng(d))
      .catch(() => alive && setPng(null));
    return () => {
      alive = false;
    };
  }, [url]);

  async function copy(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "code" ? code : url);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked: the code and link are visible to copy by hand */
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mt-5 flex flex-wrap items-center gap-5 rounded-xl border border-hairline p-4">
      {png ? (
        <img src={png} alt={`QR code for ${schoolName}, code ${code}`} className="h-28 w-28 rounded-lg bg-white" />
      ) : (
        <div className="grid h-28 w-28 place-items-center rounded-lg border border-hairline text-xs text-muted-foreground">
          QR unavailable
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">School code</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-[0.25em] text-gold">{code}</p>
        {!active && (
          <p className="mt-1 text-xs font-medium text-amber-400">Deactivated: new members can't register with it.</p>
        )}
        <p className="mt-2 break-all text-xs text-muted-foreground">{url}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void copy("code")} className={btn}>
            {copied === "code" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
          <button type="button" onClick={() => void copy("link")} className={btn}>
            {copied === "link" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            {copied === "link" ? "Copied" : "Copy member link"}
          </button>
          {png ? (
            <a href={png} download={`sahasaknaada-${code}.png`} className={btn}>
              <Download className="h-3.5 w-3.5" aria-hidden /> QR as PNG
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
