"use client";

import { useCallback, useState } from "react";
import type { Address, Hash, TransactionReceipt } from "viem";
import { useConnection, useSwitchChain } from "wagmi";
import { chain, publicClient } from "./chain";
import { decodeContractError } from "./errors";
import { suggestFees, type FeeOverrides } from "./fees";

export type TxState =
  | { status: "idle" }
  | { status: "simulating" }
  /** Reverted in simulation: the wallet was never opened. */
  | { status: "rejected"; message: string }
  | { status: "signing" }
  | { status: "pending"; hash: Hash }
  | { status: "success"; hash: Hash }
  | { status: "failed"; message: string; hash?: Hash };

type Steps = {
  /** Dry-run via the public RPC. Throw = rejected, MetaMask stays closed. */
  simulate: (account: Address) => Promise<unknown>;
  /** Opens the wallet and returns the tx hash. Spread `fees` into the write call. */
  send: (fees: FeeOverrides) => Promise<Hash>;
};

/**
 * simulate → (switch chain) → sign → wait for receipt. Success is only reported once
 * the receipt is mined with status "success".
 */
export function useTx() {
  const { address, chainId } = useConnection();
  const { mutateAsync: switchChain } = useSwitchChain();
  const [state, setState] = useState<TxState>({ status: "idle" });

  const run = useCallback(
    async ({ simulate, send }: Steps): Promise<TransactionReceipt | null> => {
      if (!address) {
        setState({ status: "failed", message: "Hubungkan wallet terlebih dahulu" });
        return null;
      }
      setState({ status: "simulating" });
      try {
        await simulate(address);
      } catch (e) {
        setState({ status: "rejected", message: decodeContractError(e) });
        return null;
      }

      setState({ status: "signing" });
      let hash: Hash;
      try {
        if (chainId !== chain.id) await switchChain({ chainId: chain.id });
        hash = await send(await suggestFees());
      } catch (e) {
        setState({ status: "failed", message: decodeContractError(e) });
        return null;
      }

      setState({ status: "pending", hash });
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          setState({ status: "failed", message: "Transaksi gagal di chain (reverted)", hash });
          return null;
        }
        setState({ status: "success", hash });
        return receipt;
      } catch (e) {
        setState({ status: "failed", message: decodeContractError(e), hash });
        return null;
      }
    },
    [address, chainId, switchChain],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);
  const busy = state.status === "simulating" || state.status === "signing" || state.status === "pending";

  return { state, run, reset, busy, address };
}
