import { http } from "viem";
import { anvil, polygonAmoy } from "viem/chains";
import { createConfig, injected } from "wagmi";
import { env } from "./env";

export { chain, publicClient, txUrl } from "./publicClient";

const rpcFor = (name: typeof env.chain) => (env.chain === name ? env.rpcUrl : undefined);

/** Wallet connection + writes only. Reads use `publicClient`. */
export const wagmiConfig = createConfig({
  chains: [anvil, polygonAmoy],
  connectors: [injected()],
  transports: {
    [anvil.id]: http(rpcFor("anvil")),
    [polygonAmoy.id]: http(rpcFor("amoy")),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
