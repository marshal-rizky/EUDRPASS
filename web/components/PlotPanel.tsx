"use client";

import Link from "next/link";
import { commodityLabel } from "@/lib/contracts";
import { decodeContractError } from "@/lib/errors";
import { fmtHa, fmtKg } from "@/lib/format";
import type { usePlotSeason } from "@/lib/usePlot";

type Q = ReturnType<typeof usePlotSeason>;

export function PlotPanel({ q, plotId, season, pendingKg }: { q: Q; plotId: bigint | null; season: number | null; pendingKg: bigint | null }) {
  if (plotId === null) {
    return <Empty>Masukkan nomor lahan untuk melihat batas panennya.</Empty>;
  }
  if (q.isLoading) {
    return (
      <div className="card space-y-3" aria-busy>
        <div className="h-5 w-1/3 animate-pulse rounded bg-coffee-100" />
        <div className="h-16 animate-pulse rounded bg-coffee-100" />
        <div className="h-3 animate-pulse rounded bg-coffee-100" />
      </div>
    );
  }
  if (q.error) {
    return <Empty tone="error">{decodeContractError(q.error)}</Empty>;
  }
  if (!q.data) return null;

  const { plot, delivered } = q.data;
  const cap = plot.capKg;
  const remaining = cap > delivered ? cap - delivered : BigInt(0);
  const pct = cap > BigInt(0) ? Number((delivered * BigInt(1000)) / cap) / 10 : 0;
  const projected = pendingKg !== null ? delivered + pendingKg : null;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Lahan #{plotId.toString()}{" "}
          <span className="font-normal text-coffee-600">
            · {commodityLabel(plot.commodity)} · {fmtHa(plot.hectaresE2)}
          </span>
        </h2>
        <Link href={`/plot/${plotId}`} className="text-sm text-leaf-700 underline">
          Paspor lahan
        </Link>
      </div>

      {plot.revoked && (
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">Lahan ini sudah dicabut</p>
      )}

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Batas musim" value={fmtKg(cap)} />
        <Stat label={`Terkirim ${season ?? ""}`} value={fmtKg(delivered)} />
        <Stat label="Sisa" value={fmtKg(remaining)} strong />
      </dl>

      <div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-coffee-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-leaf-600 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className="mt-1 text-xs text-coffee-600">
          Batas = {fmtHa(plot.hectaresE2)} × {plot.yieldRateUsed} kg/ha (dikunci saat registrasi)
        </p>
      </div>

      {projected !== null && (
        <p className={`text-sm ${projected > cap ? "font-semibold text-amber-800" : "text-coffee-700"}`}>
          Setelah pengiriman ini: total musim {fmtKg(projected)} dari batas {fmtKg(cap)}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl bg-coffee-50 px-2 py-3">
      <dt className="text-xs text-coffee-600">{label}</dt>
      <dd className={`mt-1 tabular-nums ${strong ? "text-xl font-bold text-leaf-800" : "text-lg font-semibold"}`}>{value}</dd>
    </div>
  );
}

function Empty({ children, tone }: { children: React.ReactNode; tone?: "error" }) {
  return (
    <div className={`card text-sm ${tone === "error" ? "border-red-300 bg-red-50 text-red-800" : "text-coffee-600"}`}>
      {children}
    </div>
  );
}
