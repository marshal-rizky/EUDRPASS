import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md space-y-3 text-center">
      <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-coffee-700">Periksa kembali alamatnya atau pindai ulang QR-nya.</p>
      <Link href="/" className="btn-secondary text-sm">
        Kembali ke beranda
      </Link>
    </div>
  );
}
