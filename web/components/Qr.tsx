"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** QR for an in-app path, resolved against the current origin (so it works on any host). */
export function Qr({ path, size = 160, label }: { path: string; size?: number; label?: string }) {
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
  const url = origin ? `${origin}${path}` : "";
  return (
    <figure className="inline-flex flex-col items-center gap-2 rounded-xl border border-coffee-200 bg-white p-3">
      {url ? (
        <QRCodeSVG value={url} size={size} marginSize={1} level="M" />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse rounded bg-coffee-100" />
      )}
      <figcaption className="max-w-[220px] break-all text-center text-xs text-coffee-600">
        {label ?? path}
      </figcaption>
    </figure>
  );
}

export function PrintButton({ label = "Cetak" }: { label?: string }) {
  return (
    <button type="button" className="btn-secondary text-sm print:hidden" onClick={() => window.print()}>
      {label}
    </button>
  );
}
