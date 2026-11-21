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

export const COMMODITIES = [
  { id: 1, label: "Kopi Arabika" },
  { id: 2, label: "Kopi Robusta" },
] as const;

export function commodityLabel(id: number): string {
  return COMMODITIES.find((c) => c.id === id)?.label ?? `Komoditas #${id}`;
}
