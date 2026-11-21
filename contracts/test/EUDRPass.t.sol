// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {PlotRegistry} from "../src/PlotRegistry.sol";
import {DeliveryLedger} from "../src/DeliveryLedger.sol";

abstract contract Base is Test {
    PlotRegistry   registry;
    DeliveryLedger ledger;

    address admin     = makeAddr("admin");
    address coop      = makeAddr("cooperative");
    address collector = makeAddr("collector");
    address exporter  = makeAddr("exporter");
    address attacker  = makeAddr("attacker");

    uint8  constant ARABICA = 1;
    uint8  constant ROBUSTA = 2;
    uint16 constant SEASON  = 2026;

    function setUp() public virtual {
        registry = new PlotRegistry(admin);
        ledger = new DeliveryLedger(admin, registry);

        vm.startPrank(admin);
        registry.setYieldRate(ARABICA, 877); // Ditjenbun smallholder arabica, kg/ha
        registry.setYieldRate(ROBUSTA, 807);
        registry.grantRole(registry.COOPERATIVE_ROLE(), coop);
        ledger.grantRole(ledger.COLLECTOR_ROLE(), collector);
        ledger.grantRole(ledger.EXPORTER_ROLE(), exporter);
        vm.stopPrank();
    }

    function _register(uint32 hectaresE2, uint8 commodity) internal returns (uint256) {
        vm.prank(coop);
        return registry.registerPlot("bafyLegalDoc", bytes12("qqguv9"), hectaresE2, commodity, "EUDR-DECL-0001");
    }

    function _deliver(uint256 plotId, uint64 kg) internal returns (uint256) {
        vm.prank(collector);
        return ledger.recordDelivery(plotId, SEASON, kg);
    }

    function _ids(uint256 a) internal pure returns (uint256[] memory r) {
        r = new uint256[](1);
        r[0] = a;
    }

    function _ids(uint256 a, uint256 b) internal pure returns (uint256[] memory r) {
        r = new uint256[](2);
        r[0] = a;
        r[1] = b;
    }
}

contract PlotRegistryTest is Base {
    function test_register_storesOriginAndDerivesCap() public {
        uint256 id = _register(100, ARABICA);
        PlotRegistry.Plot memory p = registry.getPlot(id);

        assertEq(id, 1);
        assertEq(registry.ownerOf(id), coop);
        assertEq(p.docCID, "bafyLegalDoc");
        assertEq(p.declarationId, "EUDR-DECL-0001");
        assertEq(p.hectaresE2, 100);
        assertEq(p.yieldRateUsed, 877);
        assertEq(p.capKg, 877);
        assertEq(p.cooperative, coop);
        assertFalse(p.revoked);
    }

    function test_cap_isRecomputableFromPublicInputs() public {
        uint256 a = _register(250, ROBUSTA); // 2.50 ha robusta
        PlotRegistry.Plot memory p = registry.getPlot(a);
        assertEq(p.capKg, uint256(p.hectaresE2) * p.yieldRateUsed / 100);
        assertEq(p.capKg, 2017); // 2.5 * 807 = 2017.5, floored
    }

    function test_rateRevision_doesNotRewriteExistingCaps() public {
        uint256 before = _register(100, ARABICA);
        vm.prank(admin);
        registry.setYieldRate(ARABICA, 936); // 2033 projection
        uint256 afterRev = _register(100, ARABICA);

        assertEq(registry.capKg(before), 877);
        assertEq(registry.capKg(afterRev), 936);
    }

    function test_register_rejectsUnknownCommodity() public {
        vm.prank(coop);
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.UnknownCommodity.selector, uint8(9)));
        registry.registerPlot("cid", bytes12("g"), 100, 9, "D");
    }

    function test_register_rejectsImplausibleArea() public {
        vm.startPrank(coop);
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.InvalidArea.selector, uint32(5)));
        registry.registerPlot("cid", bytes12("g"), 5, ARABICA, "D");
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.InvalidArea.selector, uint32(5001)));
        registry.registerPlot("cid", bytes12("g"), 5001, ARABICA, "D");
        vm.stopPrank();
    }

    function test_register_requiresDeclarationId() public {
        vm.prank(coop);
        vm.expectRevert(PlotRegistry.EmptyDeclaration.selector);
        registry.registerPlot("cid", bytes12("g"), 100, ARABICA, "");
    }

    function test_unknownPlot_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.UnknownPlot.selector, 42));
        registry.getPlot(42);
    }

    function test_revoke_byIssuingCooperative() public {
        uint256 id = _register(100, ARABICA);
        vm.prank(coop);
        registry.revokePlot(id, "GFW alert 2028");
        assertTrue(registry.isRevoked(id));
        assertEq(registry.revocationReason(id), "GFW alert 2028");
        // history still readable
        assertEq(registry.getPlot(id).declarationId, "EUDR-DECL-0001");
    }

    function test_revoke_twiceReverts() public {
        uint256 id = _register(100, ARABICA);
        vm.startPrank(admin);
        registry.revokePlot(id, "x");
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.AlreadyRevoked.selector, id));
        registry.revokePlot(id, "x");
        vm.stopPrank();
    }
}

contract DeliveryLedgerTest is Base {
    uint256 plot;

    function setUp() public override {
        super.setUp();
        plot = _register(100, ARABICA); // 1.00 ha arabica -> 877 kg
    }

    /// The live demo, step for step (proposal section 4.2).
    function test_demoSequence() public {
        _deliver(plot, 600);
        assertEq(ledger.deliveredKg(plot, SEASON), 600);

        vm.prank(collector);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.MassBalanceExceeded.selector, plot, 900, 877));
        ledger.recordDelivery(plot, SEASON, 300);

        assertEq(ledger.deliveredKg(plot, SEASON), 600, "rejected write must leave no trace");
        assertEq(ledger.deliveryCount(), 1);
    }

    function test_exactlyAtCap_isAccepted() public {
        _deliver(plot, 877);
        assertEq(ledger.deliveredKg(plot, SEASON), 877);
    }

    function test_oneKgOverCap_isRejected() public {
        _deliver(plot, 877);
        vm.prank(collector);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.MassBalanceExceeded.selector, plot, 878, 877));
        ledger.recordDelivery(plot, SEASON, 1);
    }

    function test_newSeason_startsFromZero() public {
        _deliver(plot, 877);
        vm.prank(collector);
        ledger.recordDelivery(plot, SEASON + 1, 877);
        assertEq(ledger.deliveredKg(plot, SEASON + 1), 877);
    }

    function test_deliveryRecordsWhoAndWhen() public {
        vm.warp(1_800_000_000);
        uint256 id = _deliver(plot, 100);
        DeliveryLedger.Delivery memory d = ledger.getDelivery(id);
        assertEq(d.plotId, plot);
        assertEq(d.kg, 100);
        assertEq(d.collector, collector);
        assertEq(d.timestamp, 1_800_000_000);
        assertEq(d.shipmentId, 0);
    }

    function test_unregisteredPlot_isRejected() public {
        vm.prank(collector);
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.UnknownPlot.selector, 999));
        ledger.recordDelivery(999, SEASON, 1);
    }

    function test_revokedPlot_cannotDeliver() public {
        vm.prank(coop);
        registry.revokePlot(plot, "deforestation detected");
        vm.prank(collector);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.PlotRevoked.selector, plot));
        ledger.recordDelivery(plot, SEASON, 1);
    }

    function test_shipment_bundlesAndTotals() public {
        uint256 d1 = _deliver(plot, 400);
        uint256 d2 = _deliver(plot, 300);

        vm.prank(exporter);
        uint256 s = ledger.assembleShipment(_ids(d1, d2));

        DeliveryLedger.Shipment memory sh = ledger.getShipment(s);
        assertEq(s, 1);
        assertEq(sh.exporter, exporter);
        assertEq(sh.totalKg, 700);
        assertEq(sh.deliveryIds.length, 2);
        assertEq(ledger.getDelivery(d1).shipmentId, s);
    }

    function test_shipmentProof_returnsOriginForEveryLine() public {
        uint256 other = _register(200, ROBUSTA);
        uint256 d1 = _deliver(plot, 500);
        uint256 d2 = _deliver(other, 1000);

        vm.prank(exporter);
        uint256 s = ledger.assembleShipment(_ids(d1, d2));

        (DeliveryLedger.Shipment memory sh, DeliveryLedger.ProofLine[] memory lines) = ledger.getShipmentProof(s);
        assertEq(sh.totalKg, 1500);
        assertEq(lines.length, 2);
        assertEq(lines[0].plot.capKg, 877);
        assertEq(lines[0].seasonDeliveredKg, 500);
        assertEq(lines[1].plot.capKg, 1614);
        assertEq(lines[1].plot.declarationId, "EUDR-DECL-0001");
        for (uint256 i; i < lines.length; ++i) {
            assertLe(lines[i].seasonDeliveredKg, lines[i].plot.capKg);
        }
    }

    function test_unshippedDeliveries_listsOnlyFree() public {
        uint256 d1 = _deliver(plot, 100);
        _deliver(plot, 100);
        _deliver(plot, 100);
        vm.prank(exporter);
        ledger.assembleShipment(_ids(d1));

        uint256[] memory free = ledger.unshippedDeliveries(1, 100);
        assertEq(free.length, 2);
        assertEq(free[0], 2);
        assertEq(free[1], 3);
    }

    function test_emptyShipment_reverts() public {
        vm.prank(exporter);
        vm.expectRevert(DeliveryLedger.EmptyShipment.selector);
        ledger.assembleShipment(new uint256[](0));
    }

    function test_unknownShipment_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.UnknownShipment.selector, 7));
        ledger.getShipmentProof(7);
    }
}

/// Every test here is an attempt to launder volume or bypass a gate.
contract AdversarialTest is Base {
    uint256 plot;

    function setUp() public override {
        super.setUp();
        plot = _register(100, ARABICA);
    }

    function test_attack_salamiSlicing() public {
        for (uint256 i; i < 877; ++i) _deliver(plot, 1);
        vm.prank(collector);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.MassBalanceExceeded.selector, plot, 878, 877));
        ledger.recordDelivery(plot, SEASON, 1);
    }

    function test_attack_doubleSpendAcrossShipments() public {
        uint256 d = _deliver(plot, 400);
        vm.startPrank(exporter);
        ledger.assembleShipment(_ids(d));
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.DeliveryAlreadyShipped.selector, d, 1));
        ledger.assembleShipment(_ids(d));
        vm.stopPrank();
    }

    function test_attack_doubleSpendWithinOneShipment() public {
        uint256 d = _deliver(plot, 400);
        vm.prank(exporter);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.DeliveryAlreadyShipped.selector, d, 1));
        ledger.assembleShipment(_ids(d, d));
        assertEq(ledger.shipmentCount(), 0, "whole shipment rolled back");
    }

    function test_attack_shipPhantomDelivery() public {
        vm.prank(exporter);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.UnknownDelivery.selector, 55));
        ledger.assembleShipment(_ids(55));
    }

    function test_attack_shipFromRevokedPlot() public {
        uint256 d = _deliver(plot, 400);
        vm.prank(admin);
        registry.revokePlot(plot, "legality document withdrawn");
        vm.prank(exporter);
        vm.expectRevert(abi.encodeWithSelector(DeliveryLedger.PlotRevoked.selector, plot));
        ledger.assembleShipment(_ids(d));
    }

    function test_attack_sellPassport() public {
        vm.prank(coop);
        vm.expectRevert(PlotRegistry.PlotIsSoulbound.selector);
        registry.transferFrom(coop, attacker, plot);
    }

    function test_attack_safeTransferPassport() public {
        vm.prank(coop);
        vm.expectRevert(PlotRegistry.PlotIsSoulbound.selector);
        registry.safeTransferFrom(coop, attacker, plot);
    }

    function test_attack_approvedOperatorCannotMove() public {
        vm.prank(coop);
        registry.setApprovalForAll(attacker, true);
        vm.prank(attacker);
        vm.expectRevert(PlotRegistry.PlotIsSoulbound.selector);
        registry.transferFrom(coop, attacker, plot);
    }

    function test_attack_strangerRecordsDelivery() public {
        bytes32 role = ledger.COLLECTOR_ROLE();
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, role));
        ledger.recordDelivery(plot, SEASON, 1);
    }

    function test_attack_strangerRegistersPlot() public {
        bytes32 role = registry.COOPERATIVE_ROLE();
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, role));
        registry.registerPlot("cid", bytes12("g"), 5000, ARABICA, "FAKE");
    }

    function test_attack_strangerAssemblesShipment() public {
        uint256 d = _deliver(plot, 1);
        bytes32 role = ledger.EXPORTER_ROLE();
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, attacker, role));
        ledger.assembleShipment(_ids(d));
    }

    function test_attack_collectorCannotRaiseYieldRate() public {
        bytes32 role = registry.DEFAULT_ADMIN_ROLE();
        vm.prank(collector);
        vm.expectRevert(abi.encodeWithSelector(IAccessControl.AccessControlUnauthorizedAccount.selector, collector, role));
        registry.setYieldRate(ARABICA, 100_000);
    }

    function test_attack_strangerRevokesCompetitorPlot() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(PlotRegistry.NotPlotAuthority.selector, attacker, plot));
        registry.revokePlot(plot, "sabotage");
    }

    function test_attack_zeroKgSpam() public {
        vm.prank(collector);
        vm.expectRevert(DeliveryLedger.ZeroQuantity.selector);
        ledger.recordDelivery(plot, SEASON, 0);
    }

    function test_attack_maxUintKg() public {
        _deliver(plot, 1);
        vm.prank(collector);
        vm.expectRevert(); // MassBalanceExceeded; uint64 kg + uint256 counter cannot overflow
        ledger.recordDelivery(plot, SEASON, type(uint64).max);
        assertEq(ledger.deliveredKg(plot, SEASON), 1);
    }

    function testFuzz_anySequenceStaysUnderCap(uint64[8] calldata amounts) public {
        vm.startPrank(collector);
        for (uint256 i; i < amounts.length; ++i) {
            try ledger.recordDelivery(plot, SEASON, amounts[i]) {} catch {}
        }
        vm.stopPrank();
        assertLe(ledger.deliveredKg(plot, SEASON), 877);
    }
}
