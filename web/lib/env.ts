import type { Address } from "viem";

/**
 * Public env, validated at runtime. `process.env.NEXT_PUBLIC_*` must be referenced
 * literally so Next can inline it into the client bundle.
 */

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO = /^0x0{40}$/;

function requireAddress(name: string, value: string | undefined): Address {
  if (!value) {
    throw new Error(`Env ${name} belum diisi. Salin alamat dari output Deploy.s.sol ke web/.env.local.`);
  }
  if (!ADDRESS_RE.test(value) || ZERO.test(value)) {
    throw new Error(`Env ${name} tidak valid: "${value}". Harus alamat 0x + 40 karakter hex (bukan alamat nol).`);
  }
  return value as Address;
}

export type ChainName = "anvil" | "amoy";

function parseChain(value: string | undefined): ChainName {
  const v = (value ?? "anvil").trim();
  if (v === "anvil" || v === "amoy") return v;
  throw new Error(`Env NEXT_PUBLIC_CHAIN tidak valid: "${v}". Pilihan: anvil | amoy.`);
}

function parseBlock(value: string | undefined): bigint {
  const v = (value ?? "").trim();
  if (v === "") return BigInt(0);
  if (!/^\d+$/.test(v)) throw new Error(`Env NEXT_PUBLIC_DEPLOY_BLOCK tidak valid: "${v}". Harus angka.`);
  return BigInt(v);
}

function parseRpc(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (!/^https?:\/\//.test(v)) throw new Error(`Env NEXT_PUBLIC_RPC_URL tidak valid: "${v}". Harus diawali http(s)://.`);
  return v;
}

export const env = {
  chain: parseChain(process.env.NEXT_PUBLIC_CHAIN),
  rpcUrl: parseRpc(process.env.NEXT_PUBLIC_RPC_URL),
  plotRegistry: requireAddress("NEXT_PUBLIC_PLOT_REGISTRY", process.env.NEXT_PUBLIC_PLOT_REGISTRY),
  deliveryLedger: requireAddress("NEXT_PUBLIC_DELIVERY_LEDGER", process.env.NEXT_PUBLIC_DELIVERY_LEDGER),
  deployBlock: parseBlock(process.env.NEXT_PUBLIC_DEPLOY_BLOCK),
} as const;
