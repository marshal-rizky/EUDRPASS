const nf = new Intl.NumberFormat("id-ID");
const ha2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dtf = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

export const fmtNum = (n: bigint | number) => nf.format(n);
export const fmtKg = (n: bigint | number) => `${nf.format(n)} kg`;

/** hectaresE2 (ha × 100) → "1,00 ha" without floating-point drift. */
export function fmtHa(hectaresE2: bigint | number): string {
  return `${ha2.format(Number(hectaresE2) / 100)} ha`;
}

/** Unix seconds → "21 Nov 2026, 14.05 WIB". */
export function fmtTime(seconds: bigint | number): string {
  return `${dtf.format(new Date(Number(seconds) * 1000))} WIB`;
}

export const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** Parses a positive integer id from user/URL input; null if not a plain integer ≥ 1. */
export function parseId(raw: string | undefined | null): bigint | null {
  const v = (raw ?? "").trim().replace(/^#/, "");
  if (!/^\d{1,30}$/.test(v)) return null;
  const n = BigInt(v);
  return n > BigInt(0) ? n : null;
}
