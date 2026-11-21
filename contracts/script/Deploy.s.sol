// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PlotRegistry} from "../src/PlotRegistry.sol";
import {DeliveryLedger} from "../src/DeliveryLedger.sol";

/// Deploys both contracts, sets the published yield rates and grants roles.
///
/// Env (all optional):
///   COOPERATIVE, COLLECTOR, EXPORTER  role holders (default: the broadcaster)
///   SEED_DEMO=true                     registers one 1.00 ha arabica plot (cap 877 kg)
///
/// Local:  forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
///           --private-key <anvil key 0>
contract Deploy is Script {
    uint32 constant ARABICA_KG_PER_HA = 877; // Ditjenbun smallholder productivity, base year 2024
    uint32 constant ROBUSTA_KG_PER_HA = 807;

    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        address coop = vm.envOr("COOPERATIVE", deployer);
        address collector = vm.envOr("COLLECTOR", deployer);
        address exporter = vm.envOr("EXPORTER", deployer);

        PlotRegistry registry = new PlotRegistry(deployer);
        DeliveryLedger ledger = new DeliveryLedger(deployer, registry);

        registry.setYieldRate(registry.ARABICA(), ARABICA_KG_PER_HA);
        registry.setYieldRate(registry.ROBUSTA(), ROBUSTA_KG_PER_HA);
        registry.grantRole(registry.COOPERATIVE_ROLE(), coop);
        ledger.grantRole(ledger.COLLECTOR_ROLE(), collector);
        ledger.grantRole(ledger.EXPORTER_ROLE(), exporter);

        if (vm.envOr("SEED_DEMO", false) && coop == deployer) {
            uint256 plotId = registry.registerPlot(
                "bafkreidemolegaldocumentplaceholder",
                bytes12("qqguv9"),
                100, // 1.00 ha
                registry.ARABICA(),
                "EUDR-DEMO-GAYO-0001"
            );
            console2.log("Seed plotId:", plotId, "cap kg:", registry.capKg(plotId));
        }

        vm.stopBroadcast();

        console2.log("NEXT_PUBLIC_PLOT_REGISTRY=%s", address(registry));
        console2.log("NEXT_PUBLIC_DELIVERY_LEDGER=%s", address(ledger));
        console2.log("NEXT_PUBLIC_DEPLOY_BLOCK=%s", block.number);
    }
}
