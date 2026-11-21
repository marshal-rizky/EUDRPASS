import { createPublicClient, http, type Hash } from "viem";
import { anvil, polygonAmoy } from "viem/chains";
import { env } from "./env";

/** viem's built-in Amoy RPC (rpc-amoy.polygon.technology) no longer resolves; wallets copy it on add. */
export const amoy =
  env.chain === "amoy" && env.rpcUrl ? { ...polygonAmoy, rpcUrls: { default: { http: [env.rpcUrl] } } } : polygonAmoy;

/** The single chain this deployment talks to. */
export const chain = env.chain === "amoy" ? amoy : anvil;

/**
 * Plain viem client, independent of any wallet. Every read goes through this, so
 * public pages work with no extension installed (wagmi read hooks can hang there).
 * No wagmi import here: this module is safe in Server Components.
 */
export const publicClient = createPublicClient({
  chain,
  transport: http(env.rpcUrl),
});

export function txUrl(hash: Hash): string | null {
  const base = chain.blockExplorers?.default.url;
  return base ? `${base}/tx/${hash}` : null;
}
