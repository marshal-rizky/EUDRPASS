"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { parseEventLogs } from "viem";
import { useWriteContract } from "wagmi";
import { extractDocument, ipfsUrl, uploadDocument, type Extraction, type UploadResult } from "@/lib/api";
import { chain, publicClient } from "@/lib/chain";
import { COMMODITIES, registry } from "@/lib/contracts";
import { fmtHa, fmtKg, fmtNum } from "@/lib/format";
import { encodeLocation, parseHectaresE2, type LocationMode } from "@/lib/location";
import { useTx } from "@/lib/useTx";
import { PrintButton, Qr } from "./Qr";
import { TxStatus } from "./TxStatus";

const MODES: { id: LocationMode; label: string; placeholder: string }[] = [
  { id: "geohash", label: "Geohash", placeholder: "mis. qqguv9" },
  { id: "polygon", label: "Poligon", placeholder: "-4.6212, 96.8519\n-4.6215, 96.8524\n-4.6219, 96.8518" },
  { id: "address", label: "Alamat pos", placeholder: "Desa, kecamatan, kabupaten, provinsi" },
];

const REVIEW_LABEL: Record<string, string> = {
  docType: "Jenis dokumen",
  parcelId: "No. persil / sertifikat",
  ownerName: "Nama pemilik",
  area: "Luas",
  village: "Desa",
  district: "Kecamatan",
  regency: "Kabupaten",
};

type Minted = { plotId: bigint; capKg: bigint; hectaresE2: number; doc: UploadResult & { fallback: boolean } };

export function RegisterForm() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<LocationMode>("geohash");
  const [locationRaw, setLocationRaw] = useState("");
  const [areaRaw, setAreaRaw] = useState("");
  const [commodity, setCommodity] = useState<number>(1);
  const [declarationId, setDeclarationId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [minted, setMinted] = useState<Minted | null>(null);

  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<Record<string, boolean>>({});

  const tx = useTx();
  const { mutateAsync: write } = useWriteContract();

  const rate = useQuery({
    queryKey: ["yieldRate", commodity],
    queryFn: () => publicClient.readContract({ ...registry, functionName: "yieldRate", args: [commodity] }),
  });

  const hectaresE2 = parseHectaresE2(areaRaw);
  const location = locationRaw.trim() ? encodeLocation(mode, locationRaw) : null;
  const capPreview = hectaresE2 !== null && rate.data ? Math.floor((hectaresE2 * rate.data) / 100) : null;
  const pendingReview = (extraction?.needsReview ?? []).filter((f) => !reviewed[f]);

  async function runExtract() {
    if (!file) return;
    setExtracting(true);
    setExtractError(null);
    setExtraction(null);
    setReviewed({});
    try {
      const x = await extractDocument(file);
      setExtraction(x);
      if (x.fields.hectaresE2 !== null) setAreaRaw((x.fields.hectaresE2 / 100).toFixed(2).replace(".", ","));
      const place = [x.fields.village, x.fields.district, x.fields.regency].filter(Boolean).join(", ");
      if (place && !locationRaw.trim()) {
        setMode("address");
        setLocationRaw(place);
      }
    } catch (e) {
      setExtractError(e instanceof Error && e.name !== "TimeoutError" ? e.message : "Ekstraksi tidak tersedia, isi manual.");
    } finally {
      setExtracting(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMinted(null);
    if (!file) return setFormError("Unggah dokumen legalitas lahan (SHM / SKT / STDB)");
    if (!location || "error" in location) return setFormError(location?.error ?? "Isi lokasi lahan");
    if (hectaresE2 === null) return setFormError("Luas harus angka dalam hektare, mis. 1,25");
    if (!declarationId.trim()) return setFormError("ID deklarasi wajib diisi");
    if (pendingReview.length > 0) return setFormError("Centang semua field hasil ekstraksi yang perlu dicek");
    setFormError(null);

    setUploading(true);
    const doc = await uploadDocument(file);
    setUploading(false);

    const args = [doc.cid, location.hash, hectaresE2, commodity, declarationId.trim()] as const;
    const receipt = await tx.run({
      simulate: (account) => publicClient.simulateContract({ ...registry, functionName: "registerPlot", args, account }),
      send: (fees) => write({ ...registry, functionName: "registerPlot", args, chainId: chain.id, ...fees }),
    });
    if (!receipt) return;
    const [ev] = parseEventLogs({ abi: registry.abi, logs: receipt.logs, eventName: "PlotRegistered" });
    if (ev) setMinted({ plotId: ev.args.plotId, capKg: ev.args.capKg, hectaresE2: ev.args.hectaresE2, doc });
  }

  const busy = uploading || tx.busy;
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <form onSubmit={submit} className="card space-y-5" noValidate>
        <section className="space-y-2">
          <label htmlFor="doc" className="label">
            Dokumen legalitas (foto / PDF)
          </label>
          <input
            id="doc"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-leaf-100 file:px-3 file:py-2 file:font-semibold file:text-leaf-800"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setExtraction(null);
              setExtractError(null);
              setReviewed({});
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary text-sm" disabled={!file || extracting} onClick={runExtract}>
              {extracting ? "Membaca dokumen… (5–20 dtk)" : "Ekstrak dari foto"}
            </button>
            <span className="text-xs text-coffee-600">Opsional. AI hanya mengisi form; petugas tetap memeriksa.</span>
          </div>
          {extractError && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{extractError}</p>}
          {extraction && (
            <ExtractionReview x={extraction} reviewed={reviewed} onToggle={(f, v) => setReviewed((r) => ({ ...r, [f]: v }))} />
          )}
        </section>

        <section className="space-y-2">
          <span className="label">Lokasi lahan</span>
          <div className="flex gap-1 rounded-lg bg-coffee-100 p-1 text-sm" role="radiogroup">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={mode === m.id}
                className={`flex-1 rounded-md px-2 py-1.5 ${mode === m.id ? "bg-white font-semibold shadow-sm" : "text-coffee-700"}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {mode === "geohash" ? (
            <input className="input font-mono" aria-label="Geohash" placeholder={currentMode.placeholder} value={locationRaw} onChange={(e) => setLocationRaw(e.target.value)} />
          ) : (
            <textarea
              className="input min-h-24 font-mono text-sm"
              aria-label={currentMode.label}
              placeholder={currentMode.placeholder}
              value={locationRaw}
              onChange={(e) => setLocationRaw(e.target.value)}
            />
          )}
          {location && (
            <p className={`text-xs ${"error" in location ? "text-red-700" : "text-coffee-600"}`}>
              {"error" in location ? location.error : <>Disimpan sebagai <span className="font-mono">{location.hash}</span></>}
            </p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="area" className="label">
              Luas (ha)
            </label>
            <input id="area" className="input" inputMode="decimal" placeholder="mis. 1,00" value={areaRaw} onChange={(e) => setAreaRaw(e.target.value)} />
          </div>
          <div>
            <label htmlFor="commodity" className="label">
              Komoditas
            </label>
            <select id="commodity" className="input" value={commodity} onChange={(e) => setCommodity(Number(e.target.value))}>
              {COMMODITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div>
          <label htmlFor="decl" className="label">
            ID deklarasi EUDR (DDS)
          </label>
          <input id="decl" className="input font-mono" placeholder="mis. EUDR-2026-GAYO-0042" value={declarationId} onChange={(e) => setDeclarationId(e.target.value)} />
        </div>

        <div className="rounded-xl bg-leaf-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-leaf-800">Batas panen per musim (dibaca dari chain)</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-leaf-900">
            {rate.isLoading
              ? "memuat yield rate…"
              : rate.error
                ? "Tidak dapat membaca yield rate dari chain"
                : hectaresE2 !== null && rate.data !== undefined && capPreview !== null
                  ? `${fmtHa(hectaresE2)} × ${fmtNum(rate.data)} kg/ha = ${fmtKg(capPreview)}`
                  : `isi luas · ${fmtNum(rate.data ?? 0)} kg/ha`}
          </p>
        </div>

        {formError && <p className="text-sm text-red-700">{formError}</p>}
        {!tx.address && <p className="text-sm text-coffee-600">Hubungkan wallet koperasi untuk mendaftarkan lahan.</p>}

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={busy || !tx.address || pendingReview.length > 0}>
          {uploading ? "Mengunggah dokumen…" : tx.busy ? "Memproses…" : "Daftarkan lahan (mint PlotPassport)"}
        </button>
        <TxStatus state={tx.state} success={minted && <p className="text-lg font-bold">Lahan #{minted.plotId.toString()} terdaftar</p>} />
      </form>

      <aside className="space-y-4">
        {minted ? (
          <div className="card space-y-4 text-center">
            <h2 className="text-xl font-bold">PlotPassport #{minted.plotId.toString()}</h2>
            <p className="text-sm text-coffee-700">
              {fmtHa(minted.hectaresE2)} · batas {fmtKg(minted.capKg)} per musim
            </p>
            <Qr path={`/plot/${minted.plotId}`} size={200} label={`Paspor lahan #${minted.plotId}`} />
            <DocBadge doc={minted.doc} />
            <div className="flex flex-wrap justify-center gap-2">
              <PrintButton label="Cetak QR" />
              <Link className="btn-secondary text-sm" href={`/deliver?plot=${minted.plotId}`}>
                Catat pengiriman
              </Link>
            </div>
          </div>
        ) : (
          <div className="card space-y-2 text-sm text-coffee-700">
            <h2 className="font-semibold text-coffee-900">Cara kerja</h2>
            <p>Batas panen = luas × yield rate komoditas, dihitung dan dikunci oleh kontrak saat registrasi.</p>
            <p>Dokumen disimpan di IPFS; hanya CID-nya yang masuk chain. Nama pemilik tidak pernah dikirim ke chain.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function DocBadge({ doc }: { doc: UploadResult & { fallback: boolean } }) {
  const url = doc.pinned ? (doc.url ?? ipfsUrl(doc.cid)) : null;
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="block text-xs text-leaf-700 underline">
      Dokumen di IPFS
    </a>
  ) : (
    <p className="text-xs text-amber-800">
      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold">belum di-pin</span>{" "}
      {doc.fallback ? "Layanan IPFS tidak tersedia; dicatat hash lokal dokumen." : "Hash dokumen dicatat; file belum diunggah ke IPFS."}
    </p>
  );
}

function ExtractionReview({
  x,
  reviewed,
  onToggle,
}: {
  x: Extraction;
  reviewed: Record<string, boolean>;
  onToggle: (field: string, value: boolean) => void;
}) {
  const f = x.fields;
  const area = f.areaValue !== null ? `${fmtNum(f.areaValue)} ${f.areaUnit ?? ""}${f.areaHa !== null ? ` (${fmtNum(f.areaHa)} ha)` : ""}` : null;
  const rows: { key: string; value: string | null }[] = [
    { key: "docType", value: f.docType },
    { key: "parcelId", value: f.parcelId },
    { key: "ownerName", value: f.ownerName },
    { key: "area", value: area },
    { key: "village", value: f.village },
    { key: "district", value: f.district },
    { key: "regency", value: f.regency },
  ];
  const needs = new Set(x.needsReview);
  return (
    <div className="space-y-2 rounded-xl border border-coffee-200 p-3">
      <p className="text-xs text-coffee-600">Hasil ekstraksi. Field kuning wajib dicek dengan dokumen asli.</p>
      <ul className="divide-y divide-coffee-100 text-sm">
        {rows.map((r) => {
          const must = needs.has(r.key);
          const conf = x.confidence[r.key as keyof Extraction["confidence"]];
          return (
            <li key={r.key} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 ${must ? "-mx-2 rounded bg-amber-50 px-2" : ""}`}>
              <span className="w-36 text-coffee-600">{REVIEW_LABEL[r.key]}</span>
              <span className="flex-1 font-medium">{r.value ?? <em className="text-coffee-500">tidak terbaca</em>}</span>
              {conf !== undefined && <span className="text-xs text-coffee-500">{Math.round(conf * 100)}%</span>}
              {must && (
                <label className="flex items-center gap-1 text-xs font-semibold text-amber-900">
                  <input type="checkbox" checked={!!reviewed[r.key]} onChange={(e) => onToggle(r.key, e.target.checked)} />
                  Sudah dicek
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {x.issues.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-amber-900">
          {x.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
      <p className="text-xs text-coffee-500">Nama pemilik hanya ditampilkan untuk pengecekan, tidak disimpan dan tidak dikirim ke chain.</p>
    </div>
  );
}
