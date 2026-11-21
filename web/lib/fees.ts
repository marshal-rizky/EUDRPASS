import { parseGwei } from "viem";
import { polygonAmoy } from "viem/chains";
import { chain, publicClient } from "./publicClient";

/** EIP-1559 fee fields passed to the wallet. Empty = let the wallet decide. */
export type FeeOverrides = { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint };

/**
 * Polygon nodes reject any tip below 25 gwei ("gas tip cap … minimum needed
 * 25000000000"), but MetaMask's "Market" estimate on Amoy often goes lower and the
 * tx fails with "Internal JSON-RPC error". Supplying our own fees makes MetaMask show
 * them as "site suggested", so nobody has to edit gas by hand during a demo.
 */
const MIN_TIP = parseGwei("30");
const FALLBACK: Required<FeeOverrides> = { maxFeePerGas: parseGwei("150"), maxPriorityFeePerGas: parseGwei("35") };

const max = (a: bigint, b: bigint) => (a > b ? a : b);

export async function suggestFees(): Promise<FeeOverrides> {
  if (chain.id !== polygonAmoy.id) return {};
  try {
    const [block, tipEstimate] = await Promise.all([
      publicClient.getBlock({ blockTag: "latest" }),
      publicClient.estimateMaxPriorityFeePerGas(),
    ]);
    const tip = max(tipEstimate, MIN_TIP);
    const base = block.baseFeePerGas ?? parseGwei("30");
    // 2x base fee survives several full blocks of base-fee growth before inclusion.
    return { maxPriorityFeePerGas: tip, maxFeePerGas: base * BigInt(2) + tip };
  } catch {
    return FALLBACK;
  }
}
