"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { publicClient } from "./chain";
import { ledger, registry, ROLES } from "./contracts";

export type Roles = { cooperative: boolean; collector: boolean; exporter: boolean };

export function useRoles(address: Address | undefined) {
  return useQuery({
    queryKey: ["roles", address],
    enabled: !!address,
    queryFn: async (): Promise<Roles> => {
      const account = address as Address;
      const [cooperative, collector, exporter] = await Promise.all([
        publicClient.readContract({ ...registry, functionName: "hasRole", args: [ROLES.COOPERATIVE_ROLE, account] }),
        publicClient.readContract({ ...ledger, functionName: "hasRole", args: [ROLES.COLLECTOR_ROLE, account] }),
        publicClient.readContract({ ...ledger, functionName: "hasRole", args: [ROLES.EXPORTER_ROLE, account] }),
      ]);
      return { cooperative, collector, exporter };
    },
  });
}
