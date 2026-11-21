import Link from "next/link";
import { VerifyBox } from "@/components/VerifyBox";

const ROLES = [
  {
    href: "/register",
    title: "Koperasi",
    action: "Daftarkan lahan",
    body: "Unggah dokumen legalitas, catat lokasi dan luas. Batas panen per musim dihitung dan dikunci di chain.",
  },
  {
    href: "/deliver",
    title: "Pengepul",
    action: "Catat pengiriman",
    body: "Setiap kilogram dari petani dicatat ke lahannya. Melebihi batas panen lahan langsung ditolak.",
  },
  {
    href: "/ship",
    title: "Eksportir",
    action: "Susun shipment",
    body: "Gabungkan pengiriman menjadi satu konsinyasi. Satu pengiriman tidak bisa dipakai dua kali.",
  },
] as const;

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4 pt-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-leaf-700">Ketertelusuran kopi untuk EUDR</p>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-coffee-900 sm:text-4xl">
          Setiap kilogram kopi terikat ke lahan terdaftar, dan siapa pun bisa memeriksanya tanpa wallet.
        </h1>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold text-coffee-900">Verifikasi shipment</h2>
        <p className="text-sm text-coffee-700">Untuk pembeli dan auditor. Atau pindai QR pada dokumen shipment.</p>
        <VerifyBox />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((r) => (
          <Link key={r.href} href={r.href} className="card group flex flex-col gap-2 transition hover:border-leaf-600">
            <span className="text-xs font-semibold uppercase tracking-wide text-coffee-600">{r.title}</span>
            <span className="text-lg font-semibold text-leaf-800 group-hover:underline">{r.action} →</span>
            <span className="text-sm text-coffee-700">{r.body}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
