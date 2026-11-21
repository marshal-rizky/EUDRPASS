import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { PrintButton, Qr } from "@/components/Qr";
import { ipfsUrl } from "@/lib/api";
import { commodityLabel, ledger, registry } from "@/lib/contracts";
import { decodeContractError, isContractError } from "@/lib/errors";
import { fmtHa, fmtKg, fmtNum, fmtTime, parseId, shortAddr } from "@/lib/format";
import { publicClient } from "@/lib/publicClient";

export async function generateMetadata({ params }: PageProps<"/verify/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Verifikasi shipment #${id}` };
}

/**
 * Public, wallet-free proof page. Rendered on the server per request from one
 * `getShipmentProof` call, so it works in any browser (no extension, no JS needed to read it).
 */
export default async function VerifyPage({ params }: PageProps<"/verify/[id]">) {
  const { id: raw } = await params;
  await connection();

  const id = parseId(raw);
  if (!id) return <Missing label={raw} />;

  let proof;
  try {
    proof = await publicClient.readContract({ ...ledger, functionName: "getShipmentProof", args: [id] });
  } catch (e) {
    if (isContractError(e, "UnknownShipment")) return <Missing label={id.toString()} />;
    return <Problem message={decodeContractError(e)} />;
  }
  const [shipment, lines] = proof;

  const revokedIds = [...new Set(lines.filter((l) => l.plot.revoked).map((l) => l.delivery.plotId))];
  const reasons = new Map(
    await Promise.all(
      revokedIds.map(async (pid) => {
        const r = await publicClient
          .readContract({ ...registry, functionName: "revocationReason", args: [pid] })
          .catch(() => "");
        return [pid.toString(), r] as const;
      }),
    ),
  );

  // One mass-balance row per plot + season.
  const groups = new Map<string, (typeof lines)[number]>();
  for (const l of lines) {
    const key = `${l.delivery.plotId}-${l.delivery.season}`;
    if (!groups.has(key)) groups.set(key, l);
  }
  const balances = [...groups.values()];
  const allOk = lines.length > 0 && balances.every((l) => !l.plot.revoked && l.seasonDeliveredKg <= l.plot.capKg);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className={`rounded-2xl p-5 text-white ${allOk ? "bg-leaf-700" : "bg-red-700"}`}>
        <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Shipment #{id.toString()}</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {allOk ? "TERVERIFIKASI — semua kopi berasal dari lahan terdaftar" : "PERHATIAN — ada lahan asal yang dicabut"}
        </h1>
        <p className="mt-2 text-sm opacity-90">Dibaca langsung dari blockchain saat halaman ini dibuka. Tanpa wallet.</p>
      </section>

      <section className="card grid gap-4 sm:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Item label="Total konsinyasi" value={<span className="text-2xl font-bold">{fmtKg(shipment.totalKg)}</span>} wide />
          <Item label="Jumlah pengiriman" value={fmtNum(lines.length)} />
          <Item label="Dibuat" value={fmtTime(shipment.createdAt)} />
          <Item label="Eksportir" value={<span className="font-mono" title={shipment.exporter}>{shortAddr(shipment.exporter)}</span>} />
          <Item label="Lahan asal" value={fmtNum(new Set(lines.map((l) => l.delivery.plotId)).size)} />
        </dl>
        <div className="flex flex-col items-center gap-2">
          <Qr path={`/verify/${id}`} size={132} label="Halaman ini" />
          <PrintButton />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Bukti mass-balance per lahan</h2>
        {balances.map((l) => {
          const pid = l.delivery.plotId.toString();
          const ok = l.seasonDeliveredKg <= l.plot.capKg;
          const cid = l.plot.docCID;
          const docUrl = ipfsUrl(cid);
          return (
            <article key={`${pid}-${l.delivery.season}`} className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">
                  <Link href={`/plot/${pid}`} className="underline decoration-coffee-200 underline-offset-4">
                    Lahan #{pid}
                  </Link>{" "}
                  <span className="font-normal text-coffee-600">
                    · {commodityLabel(l.plot.commodity)} · {fmtHa(l.plot.hectaresE2)} · musim {l.delivery.season}
                  </span>
                </h3>
                {l.plot.revoked ? (
                  <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-bold text-white">DICABUT</span>
                ) : (
                  <span className="rounded-full bg-leaf-100 px-2.5 py-0.5 text-xs font-bold text-leaf-800">AKTIF</span>
                )}
              </div>
              {l.plot.revoked && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  Alasan pencabutan: {reasons.get(pid) || "tidak dicantumkan"}
                </p>
              )}

              <div className={`rounded-xl px-4 py-3 ${ok ? "bg-leaf-50 text-leaf-900" : "bg-red-50 text-red-900"}`}>
                <p className="text-base font-semibold tabular-nums sm:text-lg">
                  terkirim musim {fmtKg(l.seasonDeliveredKg)} {ok ? "≤" : ">"} batas {fmtKg(l.plot.capKg)}
                </p>
                <p className="mt-0.5 text-xs tabular-nums">
                  batas = {fmtHa(l.plot.hectaresE2)} × {fmtNum(l.plot.yieldRateUsed)} kg/ha (dikunci {fmtTime(l.plot.registeredAt)})
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                <Item label="ID deklarasi EUDR" value={<span className="break-all font-mono">{l.plot.declarationId}</span>} />
                <Item label="Lokasi (hash)" value={<span className="break-all font-mono text-xs">{l.plot.locationHash}</span>} />
                <Item label="Koperasi penerbit" value={<span className="font-mono">{shortAddr(l.plot.cooperative)}</span>} />
                <Item
                  label="Dokumen legalitas"
                  value={
                    docUrl ? (
                      <a href={docUrl} target="_blank" rel="noreferrer" className="text-leaf-700 underline">
                        Buka di IPFS
                      </a>
                    ) : (
                      <span className="text-amber-800">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold">belum di-pin</span>{" "}
                        <span className="break-all font-mono text-xs">{cid || "—"}</span>
                      </span>
                    )
                  }
                />
              </dl>
            </article>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rincian pengiriman</h2>
        <ul className="card divide-y divide-coffee-100 p-0 sm:p-0">
          {lines.map((l) => (
            <li key={l.deliveryId.toString()} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
              <span className="w-12 font-mono text-coffee-600">#{l.deliveryId.toString()}</span>
              <span className="flex-1">
                Lahan #{l.delivery.plotId.toString()} · musim {l.delivery.season}
                <span className="block text-xs text-coffee-500">
                  {fmtTime(l.delivery.timestamp)} · pengepul <span className="font-mono">{shortAddr(l.delivery.collector)}</span>
                </span>
              </span>
              <span className="font-semibold tabular-nums">{fmtKg(l.delivery.kg)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Item({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs text-coffee-600">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <h1 className="text-xl font-bold">Shipment #{label} tidak ditemukan</h1>
      <p className="text-sm text-coffee-700">Periksa kembali nomor pada dokumen atau pindai ulang QR-nya.</p>
      <Link href="/" className="btn-secondary text-sm">
        Kembali ke beranda
      </Link>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="card mx-auto max-w-md space-y-2 border-red-300 bg-red-50 text-center text-red-900">
      <h1 className="text-lg font-bold">Data tidak dapat dimuat</h1>
      <p className="text-sm">{message}</p>
    </div>
  );
}
