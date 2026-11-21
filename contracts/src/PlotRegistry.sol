// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title PlotRegistry — EUDRPass PlotPassport
/// @notice One non-transferable token per registered smallholder plot. Each passport
///         carries the plot's EUDR origin data and a yield cap derived from public
///         statistics: capKg = hectares x published regional yield rate.
/// @dev    The cap and the rate used to derive it are snapshotted at registration so
///         any auditor can recompute the cap years later, even after rates are revised.
contract PlotRegistry is ERC721, AccessControl {
    bytes32 public constant COOPERATIVE_ROLE = keccak256("COOPERATIVE_ROLE");

    /// Commodity codes used by the MVP. Rates are parameters, not literals in logic.
    uint8 public constant ARABICA = 1;
    uint8 public constant ROBUSTA = 2;

    struct Plot {
        string  docCID;          // IPFS CID of legality documents (SHM / SKT / STDB)
        bytes12 locationHash;    // geohash, or hash of postal address (Reg. 2025/2650)
        uint32  hectaresE2;      // hectares x 100 (no floating point)
        uint8   commodity;
        uint32  yieldRateUsed;   // kg/ha in force at registration
        uint64  capKg;           // hectaresE2 * yieldRateUsed / 100, frozen at mint
        uint64  registeredAt;    // block timestamp
        bool    revoked;
        address cooperative;     // signer accountable for the registration
        string  declarationId;   // EUDR declaration / DDS reference identifier
    }

    /// commodity => published regional yield, kg per hectare per season
    mapping(uint8 => uint32) public yieldRate;
    mapping(uint256 => Plot) private _plots;
    mapping(uint256 => string) public revocationReason;

    uint256 public plotCount;

    error PlotIsSoulbound();
    error UnknownPlot(uint256 plotId);
    error UnknownCommodity(uint8 commodity);
    error InvalidArea(uint32 hectaresE2);
    error EmptyDeclaration();
    error AlreadyRevoked(uint256 plotId);
    error NotPlotAuthority(address caller, uint256 plotId);

    event YieldRateSet(uint8 indexed commodity, uint32 kgPerHa);
    event PlotRegistered(
        uint256 indexed plotId,
        address indexed cooperative,
        uint8 commodity,
        uint32 hectaresE2,
        uint64 capKg,
        string declarationId
    );
    event PlotRevoked(uint256 indexed plotId, string reason);

    /// Plausibility bounds from the proposal: 0.1 ha .. 50 ha
    uint32 public constant MIN_AREA_E2 = 10;
    uint32 public constant MAX_AREA_E2 = 5_000;

    constructor(address admin) ERC721("EUDRPass PlotPassport", "PLOT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ---------------------------------------------------------------- admin

    function setYieldRate(uint8 commodity, uint32 kgPerHa) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (commodity == 0) revert UnknownCommodity(commodity);
        yieldRate[commodity] = kgPerHa;
        emit YieldRateSet(commodity, kgPerHa);
    }

    // ---------------------------------------------------------- registration

    function registerPlot(
        string calldata docCID,
        bytes12 locationHash,
        uint32 hectaresE2,
        uint8 commodity,
        string calldata declarationId
    ) external onlyRole(COOPERATIVE_ROLE) returns (uint256 plotId) {
        uint32 rate = yieldRate[commodity];
        if (rate == 0) revert UnknownCommodity(commodity);
        if (hectaresE2 < MIN_AREA_E2 || hectaresE2 > MAX_AREA_E2) revert InvalidArea(hectaresE2);
        if (bytes(declarationId).length == 0) revert EmptyDeclaration();

        uint64 cap = uint64((uint256(hectaresE2) * rate) / 100);

        plotId = ++plotCount;
        _plots[plotId] = Plot({
            docCID: docCID,
            locationHash: locationHash,
            hectaresE2: hectaresE2,
            commodity: commodity,
            yieldRateUsed: rate,
            capKg: cap,
            registeredAt: uint64(block.timestamp),
            revoked: false,
            cooperative: msg.sender,
            declarationId: declarationId
        });

        _mint(msg.sender, plotId);
        emit PlotRegistered(plotId, msg.sender, commodity, hectaresE2, cap, declarationId);
    }

    /// @notice Revocation is a status change, never a deletion: history stays readable.
    function revokePlot(uint256 plotId, string calldata reason) external {
        Plot storage p = _requirePlot(plotId);
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender) && msg.sender != p.cooperative) {
            revert NotPlotAuthority(msg.sender, plotId);
        }
        if (p.revoked) revert AlreadyRevoked(plotId);
        p.revoked = true;
        revocationReason[plotId] = reason;
        emit PlotRevoked(plotId, reason);
    }

    // ----------------------------------------------------------------- views

    function exists(uint256 plotId) public view returns (bool) {
        return plotId != 0 && plotId <= plotCount;
    }

    function getPlot(uint256 plotId) external view returns (Plot memory) {
        return _requirePlot(plotId);
    }

    function capKg(uint256 plotId) external view returns (uint256) {
        return _requirePlot(plotId).capKg;
    }

    function isRevoked(uint256 plotId) external view returns (bool) {
        return _requirePlot(plotId).revoked;
    }

    // -------------------------------------------------------------- internal

    function _requirePlot(uint256 plotId) internal view returns (Plot storage) {
        if (!exists(plotId)) revert UnknownPlot(plotId);
        return _plots[plotId];
    }

    /// @dev Soulbound: only mint (from == 0) passes. Transfers AND burns revert, so a
    ///      clean passport can never be sold to launder another plot's volume, and a
    ///      passport can never be destroyed to erase its delivery history.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert PlotIsSoulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
