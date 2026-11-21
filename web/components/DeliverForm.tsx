"use client";

import { useState } from "react";
import { parseEventLogs } from "viem";
import { useWriteContract } from "wagmi";
import { chain, publicClient } from "@/lib/chain";
import { ledger } from "@/lib/contracts";
import { fmtKg, parseId } from "@/lib/format";
import { usePlotSeason } from "@/lib/usePlot";
import { useTx } from "@/lib/useTx";
import { PlotPanel } from "./PlotPanel";
import { TxStatus } from "./TxStatus";

type Recorded = { deliveryId: bigint; plotId: bigint; kg: bigint; seasonTotalKg: bigint };

function parseKg(raw: string): bigint | null {
  const v = raw.trim().replace(/\./g, "");
  return /^\d{1,19}$/.test(v) ? BigInt(v) : null;
}

function parseSeason(raw: string): number | null {
  const v = raw.trim();
  if (!/^\d{4}$/.test(v)) return null;
  const n = Number(v);
  return n >= 2000 && n <= 2100 ? n : null;
}

export function DeliverForm({ initialPlot }: { initialPlot: string }) {
  const [plotRaw, setPlotRaw] = useState(initialPlot);
  const [seasonRaw, setSeasonRaw] = useState(() => String(new Date().getFullYear()));
  const [kgRaw, setKgRaw] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<Recorded | null>(null);

  const plotId = parseId(plotRaw);
  const season = parseSeason(seasonRaw);
  const kg = parseKg(kgRaw);

  const q = usePlotSeason(plotId, season);
  const tx = useTx();
  const { mutateAsync: write } = useWriteContract();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRecorded(null);
    if (!plotId) return setFormError("Nomor lahan harus angka, mis. 1");
    if (season === null) return setFormError("Musim harus tahun 4 digit, mis. 2026");
    if (kg === null) return setFormError("Berat harus bilangan bulat dalam kg, mis. 600");
    setFormError(null);

    const args = [plotId, season, kg] as const;
    const receipt = await tx.run({
      simulate: (account) => publicClient.simulateContract({ ...ledger, functionName: "recordDelivery", args, account }),
      send: () => write({ ...ledger, functionName: "recordDelivery", args, chainId: chain.id }),
    });
    if (!receipt) return;

    const [ev] = parseEventLogs({ abi: ledger.abi, logs: receipt.logs, eventName: "Delivered" });
    if (ev) {
      setRecorded({
        deliveryId: ev.args.deliveryId,
        plotId: ev.args.plotId,
        kg: ev.args.kg,
        seasonTotalKg: ev.args.seasonTotalKg,
      });
    }
    setKgRaw("");
    await q.refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <form onSubmit={submit} className="card space-y-4" noValidate>
        <div>
          <label htmlFor="plot" className="label">
            Nomor lahan
          </label>
          <input
            id="plot"
            className="input"
            inputMode="numeric"
            placeholder="mis. 1"
            value={plotRaw}
            onChange={(e) => {
              setPlotRaw(e.target.value);
              tx.reset();
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="season" className="label">
              Musim (tahun)
            </label>
            <input
              id="season"
              className="input"
              inputMode="numeric"
              value={seasonRaw}
              onChange={(e) => {
                setSeasonRaw(e.target.value);
                tx.reset();
              }}
            />
          </div>
          <div>
            <label htmlFor="kg" className="label">
              Berat (kg)
            </label>
            <input
              id="kg"
              className="input text-lg font-semibold"
              inputMode="numeric"
              placeholder="mis. 600"
              value={kgRaw}
              onChange={(e) => {
                setKgRaw(e.target.value);
                tx.reset();
              }}
            />
          </div>
        </div>

        {formError && <p className="text-sm text-red-700">{formError}</p>}
        {!tx.address && <p className="text-sm text-coffee-600">Hubungkan wallet pengepul untuk mencatat.</p>}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={tx.busy || !tx.address}>
          {tx.busy ? "Memproses…" : "Catat pengiriman"}
        </button>

        <TxStatus
          state={tx.state}
          success={
            recorded && (
              <div>
                <p className="text-lg font-bold">DITERIMA — pengiriman #{recorded.deliveryId.toString()}</p>
                <p className="text-sm">
                  {fmtKg(recorded.kg)} dari lahan #{recorded.plotId.toString()}. Total musim sekarang {fmtKg(recorded.seasonTotalKg)}.
                </p>
              </div>
            )
          }
        />
      </form>

      <PlotPanel q={q} plotId={plotId} season={season} pendingKg={kg} />
    </div>
  );
}
