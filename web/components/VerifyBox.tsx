"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseId } from "@/lib/format";

export function VerifyBox() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const id = parseId(value);
        if (!id) {
          setError("Masukkan nomor shipment, mis. 1");
          return;
        }
        router.push(`/verify/${id}`);
      }}
    >
      <label htmlFor="verify-id" className="sr-only">
        Nomor shipment
      </label>
      <input
        id="verify-id"
        inputMode="numeric"
        placeholder="Nomor shipment, mis. 1"
        className="input sm:max-w-xs"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
      />
      <button type="submit" className="btn-primary">
        Verifikasi
      </button>
      {error && <p className="text-sm text-red-700 sm:self-center">{error}</p>}
    </form>
  );
}
