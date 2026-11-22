import { keccak256, toBytes, type Hex } from "viem";
import { deliveryLedgerAbi, plotRegistryAbi } from "./abi";
import { env } from "./env";

export const registry = { address: env.plotRegistry, abi: plotRegistryAbi } as const;
export const ledger = { address: env.deliveryLedger, abi: deliveryLedgerAbi } as const;

export const ROLES = {
  COOPERATIVE_ROLE: keccak256(toBytes("COOPERATIVE_ROLE")),
  COLLECTOR_ROLE: keccak256(toBytes("COLLECTOR_ROLE")),
  EXPORTER_ROLE: keccak256(toBytes("EXPORTER_ROLE")),
  DEFAULT_ADMIN_ROLE: `0x${"0".repeat(64)}` as Hex,
} as const;

export const ROLE_LABEL: Record<string, string> = {
  [ROLES.COOPERATIVE_ROLE]: "Koperasi",
  [ROLES.COLLECTOR_ROLE]: "Pengepul",
  [ROLES.EXPORTER_ROLE]: "Eksportir",
  [ROLES.DEFAULT_ADMIN_ROLE]: "Admin",
};

export type Commodity = {
  id: number;
  label: string;
  /** 1 = arabika, 2 = robusta: the national code this entry refines. */
  base: 1 | 2;
  /** Set for regency-level codes; the kg/ha itself is always read from the chain. */
  regency?: string;
  source: string;
};

/**
 * Codes 1 and 2 carry the national average. Codes 11-13 / 21-23 carry BPS Aceh 2022
 * productivity for the Gayo highland regencies (set on-chain with setYieldRate), so a
 * plot can be capped by its own regency instead of the national figure.
 */
export const COMMODITIES: readonly Commodity[] = [
  { id: 1, label: "Kopi Arabika", base: 1, source: "rata-rata nasional, Ditjenbun 2024" },
  { id: 2, label: "Kopi Robusta", base: 2, source: "rata-rata nasional, Ditjenbun 2024" },
  { id: 11, label: "Kopi Arabika · Aceh Tengah", base: 1, regency: "Aceh Tengah", source: "BPS Aceh 2022" },
  { id: 12, label: "Kopi Arabika · Bener Meriah", base: 1, regency: "Bener Meriah", source: "BPS Aceh 2022" },
  { id: 13, label: "Kopi Arabika · Gayo Lues", base: 1, regency: "Gayo Lues", source: "BPS Aceh 2022" },
  { id: 21, label: "Kopi Robusta · Aceh Tengah", base: 2, regency: "Aceh Tengah", source: "BPS Aceh 2022" },
  { id: 22, label: "Kopi Robusta · Bener Meriah", base: 2, regency: "Bener Meriah", source: "BPS Aceh 2022" },
  { id: 23, label: "Kopi Robusta · Gayo Lues", base: 2, regency: "Gayo Lues", source: "BPS Aceh 2022" },
];

export function commodity(id: number): Commodity | undefined {
  return COMMODITIES.find((c) => c.id === id);
}

export function commodityLabel(id: number): string {
  return commodity(id)?.label ?? `Komoditas #${id}`;
}

const normRegency = (s: string) =>
  s.toLowerCase().replace(/^(kabupaten|kab\.?)\s+/, "").replace(/\s+/g, " ").trim();

/** Regency-level code for an extracted regency name, same coffee type as `current`. */
export function regencyCommodity(regency: string | null | undefined, current: number): Commodity | undefined {
  const base = commodity(current)?.base;
  if (!regency || !base) return undefined;
  const r = normRegency(regency);
  return COMMODITIES.find((c) => c.base === base && c.regency && normRegency(c.regency) === r);
}
