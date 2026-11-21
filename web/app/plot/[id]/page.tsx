import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { PrintButton, Qr } from "@/components/Qr";
import { ipfsUrl } from "@/lib/api";
import { commodityLabel, ledger, registry } from "@/lib/contracts";
import { decodeContractError, isContractError } from "@/lib/errors";
import { fmtHa, fmtKg, fmtTime, parseId, shortAddr } from "@/lib/format";
import { publicClient } from "@/lib/publicClient";

export async function generateMetadata({ params }: PageProps<"/plot/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Paspor lahan #${id}` };
}

/** Public PlotPassport: no wallet. Shows cap and delivered kg for recent seasons. */
export default async function PlotPage({ params }: PageProps<"/plot/[id]">) {
  const { id: raw } = await params;
  await connection();
  const id = parseId(raw);
  if (!id) return <Missing label={raw} />;

  let plot;
  try {
    plot = await publicClient.readContract({ ...registry, functionName: "getPlot", args: [id] });
  } catch (e) {
    if (isContractError(e, "UnknownPlot")) return <Missing label={id.toString()} />;
    return <p className="card text-red-800">{decodeContractError(e)}</p>;
  }

  const registeredYear = new Date(Number(plot.registeredAt) * 1000).getUTCFullYear();
  const thisYear = new Date().getUTCFullYear();
  const seasons = Array.from({ length: Math.max(1, thisYear - registeredYear + 2) }, (_, i) => registeredYear - 1 + i)
    .filter((y) => y <= thisYear)
    .reverse()
    .slice(0, 4);
  const delivered = await Promise.all(
    seasons.map(async (s) => ({
      season: s,
      kg: await publicClient.readContract({ ...ledger, functionName: "deliveredKg", args: [id, s] }),
    })),
  );
  const reason = plot.revoked
    ? await publicClient.readContract({ ...registry, functionName: "revocationReason", args: [id] }).catch(() => "")
    : "";
  const docUrl = ipfsUrl(plot.docCID);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <section className="card flex flex-col items-center gap-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-coffee-600">PlotPassport</p>
        <h1 className="text-3xl font-bold">Lahan #{id.toString()}</h1>
        <p className="text-coffee-700">
          {commodityLabel(plot.commodity)} · {fmtHa(plot.hectaresE2)}
        </p>
        {plot.revoked ? (
          <p className="rounded-lg bg-red-100 px-3 py-2 text-sm font-semibold text-red-800">
            DICABUT{reason ? ` — ${reason}` : ""}
          </p>
        ) : (
          <span className="rounded-full bg-leaf-100 px-3 py-0.5 text-xs font-bold text-leaf-800">AKTIF</span>
        )}
        <Qr path={`/plot/${id}`} size={240} label={`Paspor lahan #${id}`} />
        <div className="flex gap-2 print:hidden">
          <PrintButton label="Cetak untuk petani" />
          <Link href={`/deliver?plot=${id}`} className="btn-secondary text-sm">
            Catat pengiriman
          </Link>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Batas panen per musim</h2>
        <p className="text-2xl font-bold tabular-nums text-leaf-800">{fmtKg(plot.capKg)}</p>
        <p className="text-xs text-coffee-600">
          = {fmtHa(plot.hectaresE2)} × {plot.yieldRateUsed} kg/ha, dikunci {fmtTime(plot.registeredAt)}
        </p>
        <ul className="divide-y divide-coffee-100 text-sm">
          {delivered.map((d) => (
            <li key={d.season} className="flex justify-between py-2">
              <span>Musim {d.season}</span>
              <span className="tabular-nums">
                {fmtKg(d.kg)} <span className="text-coffee-500">/ {fmtKg(plot.capKg)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Row label="ID deklarasi EUDR" value={<span className="break-all font-mono">{plot.declarationId}</span>} />
          <Row label="Lokasi (hash)" value={<span className="break-all font-mono text-xs">{plot.locationHash}</span>} />
          <Row label="Koperasi penerbit" value={<span className="font-mono">{shortAddr(plot.cooperative)}</span>} />
          <Row
            label="Dokumen legalitas"
            value={
              docUrl ? (
                <a href={docUrl} target="_blank" rel="noreferrer" className="text-leaf-700 underline">
                  Buka di IPFS
                </a>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">belum di-pin</span>
              )
            }
          />
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-coffee-600">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <h1 className="text-xl font-bold">Lahan #{label} tidak terdaftar</h1>
      <Link href="/" className="btn-secondary text-sm">
        Kembali ke beranda
      </Link>
    </div>
  );
}
