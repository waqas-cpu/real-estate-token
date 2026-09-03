// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./RwaAccessControl.sol";

/**
 * @title RwaPriceOracle
 * @notice On-chain valuation oracle with data integrity controls, staleness guards,
 * and circuit-breaker deviation thresholds for real estate assets.
 */
contract RwaPriceOracle {
    RwaAccessControl public immutable accessControl;

    struct PriceData {
        uint256 priceUsdc;      // Price in USDC micro-units (6 decimals)
        uint256 timestamp;      // Timestamp of attestation
        address reporter;       // Address that reported the price
        string source;          // e.g. "CHAINLINK", "PYTH", "APPRAISAL_CONSORTIUM"
    }

    // assetKey => PriceData
    mapping(bytes32 => PriceData) public latestPrice;
    
    // Configurable security parameters
    uint256 public maxStalenessSeconds = 86400; // 24 hours
    uint256 public maxDeviationBps = 1000;      // 10% max deviation without manual override (1000 / 10000)

    event PriceUpdated(bytes32 indexed assetKey, uint256 priceUsdc, uint256 timestamp, address indexed reporter, string source);
    event CircuitBreakerTripped(bytes32 indexed assetKey, uint256 oldPrice, uint256 newPrice, uint256 deviationBps);
    event ParametersUpdated(uint256 maxStalenessSeconds, uint256 maxDeviationBps);

    modifier onlyOracle() {
        require(
            accessControl.hasRole(accessControl.ORACLE_ROLE(), msg.sender) ||
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller is not authorized oracle"
        );
        _;
    }

    modifier onlyAdmin() {
        require(
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller is not admin"
        );
        _;
    }

    constructor(address accessControlAddress) {
        require(accessControlAddress != address(0), "Invalid access control address");
        accessControl = RwaAccessControl(accessControlAddress);
    }

    function setSecurityParameters(uint256 maxStaleness, uint256 maxDeviation) external onlyAdmin {
        require(maxStaleness >= 300, "Staleness too short"); // min 5 minutes
        require(maxDeviation <= 5000, "Deviation too high"); // max 50%
        maxStalenessSeconds = maxStaleness;
        maxDeviationBps = maxDeviation;
        emit ParametersUpdated(maxStaleness, maxDeviation);
    }

    function updatePrice(
        bytes32 assetKey,
        uint256 priceUsdc,
        string calldata source
    ) external onlyOracle {
        require(priceUsdc > 0, "Price must be > 0");

        PriceData storage current = latestPrice[assetKey];

        if (current.priceUsdc > 0) {
            uint256 diff = priceUsdc > current.priceUsdc
                ? priceUsdc - current.priceUsdc
                : current.priceUsdc - priceUsdc;
            uint256 deviationBps = (diff * 10000) / current.priceUsdc;

            if (deviationBps > maxDeviationBps) {
                emit CircuitBreakerTripped(assetKey, current.priceUsdc, priceUsdc, deviationBps);
                revert("Price deviation exceeds circuit breaker band; admin override required");
            }
        }

        latestPrice[assetKey] = PriceData({
            priceUsdc: priceUsdc,
            timestamp: block.timestamp,
            reporter: msg.sender,
            source: source
        });

        emit PriceUpdated(assetKey, priceUsdc, block.timestamp, msg.sender, source);
    }

    function forceOverridePrice(
        bytes32 assetKey,
        uint256 priceUsdc,
        string calldata source
    ) external onlyAdmin {
        require(priceUsdc > 0, "Price must be > 0");

        latestPrice[assetKey] = PriceData({
            priceUsdc: priceUsdc,
            timestamp: block.timestamp,
            reporter: msg.sender,
            source: source
        });

        emit PriceUpdated(assetKey, priceUsdc, block.timestamp, msg.sender, source);
    }

    function getValidPrice(bytes32 assetKey) external view returns (uint256 priceUsdc, uint256 timestamp) {
        PriceData storage data = latestPrice[assetKey];
        require(data.priceUsdc > 0, "No price data for asset");
        require(block.timestamp - data.timestamp <= maxStalenessSeconds, "Price is stale");
        return (data.priceUsdc, data.timestamp);
    }
}
