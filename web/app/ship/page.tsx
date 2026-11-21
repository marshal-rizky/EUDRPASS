import type { Metadata } from "next";
import { ShipForm } from "@/components/ShipForm";

export const metadata: Metadata = { title: "Penyusunan Shipment" };

export default function ShipPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Penyusunan Shipment</h1>
        <p className="text-sm text-coffee-700">
          Gabungkan pengiriman menjadi satu konsinyasi ekspor. Hasilnya bisa diverifikasi publik lewat QR.
        </p>
      </header>
      <ShipForm />
    </div>
  );
}
