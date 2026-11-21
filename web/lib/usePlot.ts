"use client";

import { useQuery } from "@tanstack/react-query";
import { publicClient } from "./chain";
import { ledger, registry } from "./contracts";

/** Plot record + cumulative delivered kg for one season, read from chain. */
export function usePlotSeason(plotId: bigint | null, season: number | null) {
  return useQuery({
    queryKey: ["plotSeason", plotId?.toString(), season],
    enabled: plotId !== null && season !== null,
    retry: false,
    queryFn: async () => {
      const id = plotId as bigint;
      const [plot, delivered] = await Promise.all([
        publicClient.readContract({ ...registry, functionName: "getPlot", args: [id] }),
        publicClient.readContract({ ...ledger, functionName: "deliveredKg", args: [id, season as number] }),
      ]);
      return { plot, delivered };
    },
  });
}
