"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { parseEventLogs } from "viem";
import { useWriteContract } from "wagmi";
import { chain, publicClient } from "@/lib/chain";
import { ledger } from "@/lib/contracts";
import { decodeContractError } from "@/lib/errors";
import { fmtKg, fmtTime, parseId, shortAddr } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { PrintButton, Qr } from "./Qr";
import { TxStatus } from "./TxStatus";

type Shipped = { shipmentId: bigint; totalKg: bigint; count: bigint };

function useUnshipped() {
  return useQuery({
    queryKey: ["unshipped"],
    queryFn: async () => {
      const count = await publicClient.readContract({ ...ledger, functionName: "deliveryCount" });
      if (count === BigInt(0)) return [];
      const ids = await publicClient.readContract({
        ...ledger,
        functionName: "unshippedDeliveries",
        args: [BigInt(1), count],
      });
      const rows = await Promise.all(
        ids.map(async (id) => ({ id, d: await publicClient.readContract({ ...ledger, functionName: "getDelivery", args: [id] }) })),
      );
      return rows.reverse();
    },
  });
}

export function ShipForm() {
  const list = useUnshipped();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualRaw, setManualRaw] = useState("");
  const [shipped, setShipped] = useState<Shipped | null>(null);
  const tx = useTx();
  const { mutateAsync: write } = useWriteContract();

  const rows = list.data ?? [];
  const known = new Map(rows.map((r) => [r.id.toString(), r.d.kg]));
  const manualIds = manualRaw
    .split(/[\s,]+/)
    .map(parseId)
    .filter((x): x is bigint => x !== null);
  const manualInvalid = manualRaw.trim() !== "" && manualIds.length === 0;

  const ids = [...new Set([...selected, ...manualIds.map(String)])].map((s) => BigInt(s)).sort((a, b) => (a < b ? -1 : 1));
  const totalKnown = ids.reduce((sum, id) => sum + (known.get(id.toString()) ?? BigInt(0)), BigInt(0));
  const unknownCount = ids.filter((id) => !known.has(id.toString())).length;

  function toggle(id: string, on: boolean) {
    tx.reset();
    setSelected((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setShipped(null);
    const args = [ids] as const;
    const receipt = await tx.run({
      simulate: (account) => publicClient.simulateContract({ ...ledger, functionName: "assembleShipment", args, account }),
      send: (fees) => write({ ...ledger, functionName: "assembleShipment", args, chainId: chain.id, ...fees }),
    });
    if (!receipt) return;
    const [ev] = parseEventLogs({ abi: ledger.abi, logs: receipt.logs, eventName: "Shipped" });
    if (ev) setShipped({ shipmentId: ev.args.shipmentId, totalKg: ev.args.totalKg, count: ev.args.deliveryCount });
    setSelected(new Set());
    setManualRaw("");
    await list.refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">Pengiriman belum dikapalkan</h2>
          <button type="button" className="text-sm text-leaf-700 underline" onClick={() => list.refetch()}>
            Muat ulang
          </button>
        </div>

        {list.isLoading ? (
          <div className="space-y-2" aria-busy>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-coffee-100" />
            ))}
          </div>
        ) : list.error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{decodeContractError(list.error)}</p>
        ) : rows.length === 0 ? (
          <p className="rounded-lg bg-coffee-50 p-4 text-sm text-coffee-700">
            Belum ada pengiriman yang bisa dikapalkan. <Link href="/deliver" className="underline">Catat pengiriman</Link> dulu.
          </p>
        ) : (
          <ul className="divide-y divide-coffee-100 rounded-xl border border-coffee-200">
            {rows.map(({ id, d }) => {
              const key = id.toString();
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-coffee-50">
                    <input type="checkbox" className="h-4 w-4 accent-leaf-700" checked={selected.has(key)} onChange={(e) => toggle(key, e.target.checked)} />
                    <span className="w-14 font-mono text-sm text-coffee-600">#{key}</span>
                    <span className="flex-1 text-sm">
                      Lahan #{d.plotId.toString()} · musim {d.season}
                      <span className="block text-xs text-coffee-500">
                        {fmtTime(d.timestamp)} · {shortAddr(d.collector)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums">{fmtKg(d.kg)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <div>
          <label htmlFor="manual" className="label">
            Tambah ID pengiriman manual (opsional)
          </label>
          <input
            id="manual"
            className="input font-mono"
            placeholder="mis. 1, 2"
            value={manualRaw}
            onChange={(e) => {
              setManualRaw(e.target.value);
              tx.reset();
            }}
          />
          {manualInvalid && <p className="mt-1 text-xs text-red-700">Isi nomor pengiriman dipisah koma</p>}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-leaf-50 px-4 py-3">
          <span className="text-sm text-leaf-900">{ids.length} pengiriman dipilih</span>
          <span className="text-xl font-bold tabular-nums text-leaf-900">
            {fmtKg(totalKnown)}
            {unknownCount > 0 && <span className="ml-1 text-xs font-normal">+ {unknownCount} ID manual</span>}
          </span>
        </div>

        {!tx.address && <p className="text-sm text-coffee-600">Hubungkan wallet eksportir untuk menyusun shipment.</p>}
        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={tx.busy || !tx.address}>
          {tx.busy ? "Memproses…" : "Susun shipment"}
        </button>
        <TxStatus
          state={tx.state}
          success={shipped && <p className="text-lg font-bold">Shipment #{shipped.shipmentId.toString()} dibuat</p>}
        />
      </form>

      <aside>
        {shipped ? (
          <div className="card space-y-4 text-center">
            <h2 className="text-xl font-bold">Shipment #{shipped.shipmentId.toString()}</h2>
            <p className="text-sm text-coffee-700">
              {shipped.count.toString()} pengiriman · total {fmtKg(shipped.totalKg)}
            </p>
            <Qr path={`/verify/${shipped.shipmentId}`} size={200} label="Pindai untuk verifikasi" />
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={`/verify/${shipped.shipmentId}`} className="btn-primary text-sm">
                Buka halaman verifikasi
              </Link>
              <PrintButton label="Cetak QR" />
            </div>
          </div>
        ) : (
          <div className="card space-y-2 text-sm text-coffee-700">
            <h2 className="font-semibold text-coffee-900">Aturan</h2>
            <p>Setiap pengiriman hanya bisa masuk satu shipment. Mencoba memakai ulang akan ditolak kontrak.</p>
            <p>Shipment dari lahan yang dicabut juga ditolak.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
