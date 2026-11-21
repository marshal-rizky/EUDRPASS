"use client";

import type { ReactNode } from "react";
import { txUrl } from "@/lib/chain";
import type { TxState } from "@/lib/useTx";

export function TxStatus({ state, success }: { state: TxState; success?: ReactNode }) {
  switch (state.status) {
    case "idle":
      return null;
    case "simulating":
      return <Note tone="info">Memeriksa aturan kontrak (simulasi)…</Note>;
    case "signing":
      return <Note tone="info">Konfirmasi transaksi di wallet…</Note>;
    case "pending":
      return (
        <Note tone="info">
          Menunggu konfirmasi blok… <TxLink hash={state.hash} />
        </Note>
      );
    case "rejected":
      return (
        <div role="alert" className="rounded-xl border-2 border-red-600 bg-red-50 p-4 text-red-800">
          <p className="text-lg font-bold leading-snug sm:text-xl">{state.message}</p>
          <p className="mt-1 text-xs text-red-700">Ditolak oleh kontrak sebelum dikirim. Tidak ada transaksi yang dibuat.</p>
        </div>
      );
    case "failed":
      return (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">{state.message}</p>
          {state.hash && <TxLink hash={state.hash} />}
        </div>
      );
    case "success":
      return (
        <div role="status" className="rounded-xl border-2 border-leaf-600 bg-leaf-50 p-4 text-leaf-900">
          {success}
          <p className="mt-2 text-xs">
            Tercatat di blok. <TxLink hash={state.hash} />
          </p>
        </div>
      );
  }
}

function TxLink({ hash }: { hash: `0x${string}` }) {
  const url = txUrl(hash);
  const short = `${hash.slice(0, 10)}…${hash.slice(-6)}`;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="font-mono underline">
      {short}
    </a>
  ) : (
    <span className="font-mono" title={hash}>
      tx {short}
    </span>
  );
}

function Note({ tone, children }: { tone: "info"; children: ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 text-sm ${tone === "info" ? "border-coffee-200 bg-coffee-50 text-coffee-800" : ""}`}>
      {children}
    </div>
  );
}
