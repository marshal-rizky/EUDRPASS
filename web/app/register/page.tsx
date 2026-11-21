import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";

export const metadata: Metadata = { title: "Registrasi Lahan" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Registrasi Lahan</h1>
        <p className="text-sm text-coffee-700">
          Daftarkan lahan petani sebagai PlotPassport. Batas panen per musim dihitung dan dikunci di chain.
        </p>
      </header>
      <RegisterForm />
    </div>
  );
}
