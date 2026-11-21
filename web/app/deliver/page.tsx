import type { Metadata } from "next";
import { DeliverForm } from "@/components/DeliverForm";

export const metadata: Metadata = { title: "Pencatatan Pengiriman" };

export default async function DeliverPage({ searchParams }: PageProps<"/deliver">) {
  const { plot } = await searchParams;
  const initialPlot = typeof plot === "string" ? plot : "";
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Pencatatan Pengiriman</h1>
        <p className="text-sm text-coffee-700">
          Catat kopi yang diterima dari petani. Kontrak menolak pengiriman yang membuat total musim melebihi batas panen lahan.
        </p>
      </header>
      <DeliverForm initialPlot={initialPlot} />
    </div>
  );
}
