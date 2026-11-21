import { keccak256, slice, stringToBytes, stringToHex, type Hex } from "viem";

export type LocationMode = "geohash" | "polygon" | "address";

const GEOHASH_RE = /^[0-9bcdefghjkmnpqrstuvwxyz]{1,12}$/;

/**
 * Encodes a location as bytes12 per Reg. (EU) 2025/2650 options:
 * - geohash: ASCII, right-padded (same as Solidity `bytes12("qqguv9")`)
 * - polygon / postal address: first 12 bytes of keccak256 of the normalised text
 */
export function encodeLocation(mode: LocationMode, raw: string): { hash: Hex } | { error: string } {
  if (mode === "geohash") {
    const g = raw.trim().toLowerCase();
    if (!GEOHASH_RE.test(g)) return { error: "Geohash 1–12 karakter (0-9, b-z tanpa a, i, l, o)" };
    return { hash: stringToHex(g, { size: 12 }) };
  }
  if (mode === "polygon") {
    const pts = raw
      .split(/[\n;]+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.split(/[,\s]+/).map(Number));
    if (pts.length < 3) return { error: "Poligon butuh minimal 3 titik (satu 'lat, lon' per baris)" };
    for (const p of pts) {
      if (p.length !== 2 || p.some((n) => !Number.isFinite(n)) || Math.abs(p[0]) > 90 || Math.abs(p[1]) > 180) {
        return { error: "Format titik salah. Contoh: -4.6212, 96.8519" };
      }
    }
    const canonical = pts.map(([lat, lon]) => `${lat.toFixed(6)},${lon.toFixed(6)}`).join(";");
    return { hash: slice(keccak256(stringToBytes(canonical)), 0, 12) };
  }
  const addr = raw.trim().replace(/\s+/g, " ").toLowerCase();
  if (addr.length < 10) return { error: "Alamat pos terlalu pendek" };
  return { hash: slice(keccak256(stringToBytes(addr)), 0, 12) };
}

/** "1,25" or "1.25" → 125 (hectares × 100). Null if not a number with ≤ 2 decimals. */
export function parseHectaresE2(raw: string): number | null {
  const v = raw.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(v)) return null;
  const [whole, frac = ""] = v.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
