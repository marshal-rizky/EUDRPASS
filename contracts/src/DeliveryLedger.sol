// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {PlotRegistry} from "./PlotRegistry.sol";

/// @title DeliveryLedger — mass-balance settlement layer
/// @notice Records every handover of harvest from a registered plot and refuses, at write
///         time, any volume the plot could not have agronomically produced this season.
///         Exporters can only assemble shipments from deliveries that passed this check,
///         and each delivery can back exactly one shipment.
contract DeliveryLedger is AccessControl {
    bytes32 public constant COLLECTOR_ROLE = keccak256("COLLECTOR_ROLE");
    bytes32 public constant EXPORTER_ROLE = keccak256("EXPORTER_ROLE");

    PlotRegistry public immutable registry;

    struct Delivery {
        uint256 plotId;
        uint16  season;
        uint64  kg;
        uint64  timestamp;
        address collector;
        uint256 shipmentId; // 0 = not yet shipped
    }

    struct Shipment {
        address  exporter;
        uint64   createdAt;
        uint256  totalKg;
        uint256[] deliveryIds;
    }

    /// Everything a verifier needs about one delivery, in one struct.
    struct ProofLine {
        uint256 deliveryId;
        Delivery delivery;
        PlotRegistry.Plot plot;
        uint256 seasonDeliveredKg; // cumulative delivered for that plot+season, now
    }

    /// plotId => season => cumulative kg delivered (the mass-balance counter)
    mapping(uint256 => mapping(uint16 => uint256)) public deliveredKg;
    mapping(uint256 => Delivery) private _deliveries;
    mapping(uint256 => Shipment) private _shipments;

    uint256 public deliveryCount;
    uint256 public shipmentCount;

    error ZeroQuantity();
    error UnknownDelivery(uint256 deliveryId);
    error UnknownShipment(uint256 shipmentId);
    error PlotRevoked(uint256 plotId);
    /// @param attemptedTotal the season total this delivery WOULD have produced
    error MassBalanceExceeded(uint256 plotId, uint256 attemptedTotal, uint256 capKg);
    error EmptyShipment();
    error DeliveryAlreadyShipped(uint256 deliveryId, uint256 shipmentId);

    event Delivered(
        uint256 indexed deliveryId,
        uint256 indexed plotId,
        uint16 indexed season,
        uint64 kg,
        uint256 seasonTotalKg,
        address collector
    );
    event Shipped(uint256 indexed shipmentId, address indexed exporter, uint256 deliveryCount, uint256 totalKg);

    constructor(address admin, PlotRegistry registry_) {
        registry = registry_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ----------------------------------------------------------- deliveries

    function recordDelivery(uint256 plotId, uint16 season, uint64 kg)
        external
        onlyRole(COLLECTOR_ROLE)
        returns (uint256 deliveryId)
    {
        if (kg == 0) revert ZeroQuantity();

        PlotRegistry.Plot memory plot = registry.getPlot(plotId); // reverts UnknownPlot
        if (plot.revoked) revert PlotRevoked(plotId);

        uint256 total = deliveredKg[plotId][season] + kg;

        // THE INVARIANT: conservation of mass. Nothing beyond capacity can be written.
        if (total > plot.capKg) revert MassBalanceExceeded(plotId, total, plot.capKg);

        deliveredKg[plotId][season] = total;
        deliveryId = ++deliveryCount;
        _deliveries[deliveryId] = Delivery({
            plotId: plotId,
            season: season,
            kg: kg,
            timestamp: uint64(block.timestamp),
            collector: msg.sender,
            shipmentId: 0
        });

        emit Delivered(deliveryId, plotId, season, kg, total, msg.sender);
    }

    // ------------------------------------------------------------ shipments

    function assembleShipment(uint256[] calldata deliveryIds)
        external
        onlyRole(EXPORTER_ROLE)
        returns (uint256 shipmentId)
    {
        uint256 n = deliveryIds.length;
        if (n == 0) revert EmptyShipment();

        shipmentId = ++shipmentCount;
        Shipment storage s = _shipments[shipmentId];
        s.exporter = msg.sender;
        s.createdAt = uint64(block.timestamp);

        uint256 total;
        for (uint256 i; i < n; ++i) {
            uint256 id = deliveryIds[i];
            Delivery storage d = _deliveries[id];
            if (d.kg == 0) revert UnknownDelivery(id);
            // Written inside the loop, so a duplicate id in the same array also reverts.
            if (d.shipmentId != 0) revert DeliveryAlreadyShipped(id, d.shipmentId);
            if (registry.isRevoked(d.plotId)) revert PlotRevoked(d.plotId);
            d.shipmentId = shipmentId;
            s.deliveryIds.push(id);
            total += d.kg;
        }
        s.totalKg = total;

        emit Shipped(shipmentId, msg.sender, n, total);
    }

    // ---------------------------------------------------------------- views

    function getDelivery(uint256 deliveryId) external view returns (Delivery memory) {
        Delivery memory d = _deliveries[deliveryId];
        if (d.kg == 0) revert UnknownDelivery(deliveryId);
        return d;
    }

    function getShipment(uint256 shipmentId) public view returns (Shipment memory) {
        if (shipmentId == 0 || shipmentId > shipmentCount) revert UnknownShipment(shipmentId);
        return _shipments[shipmentId];
    }

    /// @notice One call returns the full public proof for a consignment: every delivery,
    ///         its origin plot (with declaration id, document CID, cap and the rate it was
    ///         derived from) and the plot's current season total. Free, no wallet.
    function getShipmentProof(uint256 shipmentId)
        external
        view
        returns (Shipment memory shipment, ProofLine[] memory lines)
    {
        shipment = getShipment(shipmentId);
        uint256 n = shipment.deliveryIds.length;
        lines = new ProofLine[](n);
        for (uint256 i; i < n; ++i) {
            uint256 id = shipment.deliveryIds[i];
            Delivery memory d = _deliveries[id];
            lines[i] = ProofLine({
                deliveryId: id,
                delivery: d,
                plot: registry.getPlot(d.plotId),
                seasonDeliveredKg: deliveredKg[d.plotId][d.season]
            });
        }
    }

    /// @notice Unshipped deliveries in [fromId, toId] — lets the exporter UI list what can
    ///         still be bundled without an indexer.
    function unshippedDeliveries(uint256 fromId, uint256 toId) external view returns (uint256[] memory ids) {
        if (toId > deliveryCount) toId = deliveryCount;
        if (fromId == 0) fromId = 1;
        if (fromId > toId) return new uint256[](0);
        uint256[] memory buf = new uint256[](toId - fromId + 1);
        uint256 k;
        for (uint256 id = fromId; id <= toId; ++id) {
            if (_deliveries[id].shipmentId == 0) buf[k++] = id;
        }
        ids = new uint256[](k);
        for (uint256 i; i < k; ++i) ids[i] = buf[i];
    }
}
