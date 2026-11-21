// GENERATED index — see PlotRegistry.ts / DeliveryLedger.ts.
import { plotRegistryAbi } from "./PlotRegistry";
import { deliveryLedgerAbi } from "./DeliveryLedger";

export { plotRegistryAbi, deliveryLedgerAbi };

/**
 * Every custom error from both contracts. DeliveryLedger calls into PlotRegistry,
 * so a ledger write can revert with a registry error (e.g. UnknownPlot). Decode
 * reverts against this combined list, not a single contract's ABI.
 */
export const eudrPassErrorsAbi = [
  ...deliveryLedgerAbi.filter((x) => x.type === "error"),
  ...plotRegistryAbi.filter((x) => x.type === "error"),
] as const;
