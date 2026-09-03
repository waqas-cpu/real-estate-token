// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@erc3643org/erc-3643/contracts/compliance/modular/modules/AbstractModule.sol";

/**
 * @title RwaTimeLockupModule
 * @notice ERC-3643 compliance module enforcing Reg D / Reg S holding period lockups.
 * Prevents secondary market transfers before the lockup expiration timestamp has passed.
 */
contract RwaTimeLockupModule is AbstractModule {
    mapping(address => uint256) public lockupExpiry;
    uint256 public defaultLockupDuration; // in seconds (e.g. 365 days = 31536000)

    event LockupExpiryUpdated(address indexed wallet, uint256 expiry);
    event DefaultDurationUpdated(uint256 duration);

    constructor(uint256 defaultDurationSeconds) {
        defaultLockupDuration = defaultDurationSeconds;
    }

    function setDefaultLockupDuration(uint256 duration) external onlyComplianceCall {
        defaultLockupDuration = duration;
        emit DefaultDurationUpdated(duration);
    }

    function setLockupExpiry(address wallet, uint256 expiry) external onlyComplianceCall {
        lockupExpiry[wallet] = expiry;
        emit LockupExpiryUpdated(wallet, expiry);
    }

    function batchSetLockupExpiry(
        address[] calldata wallets,
        uint256[] calldata expiries
    ) external onlyComplianceCall {
        require(wallets.length == expiries.length, "Mismatched arrays");
        for (uint256 i = 0; i < wallets.length; i++) {
            lockupExpiry[wallets[i]] = expiries[i];
            emit LockupExpiryUpdated(wallets[i], expiries[i]);
        }
    }

    function moduleCheck(
        address _from,
        address /*_to*/,
        uint256 /*_value*/,
        address _compliance
    ) external view override onlyBoundCompliance(_compliance) returns (bool) {
        // Minting (from == 0) is exempt from lockup check
        if (_from == address(0)) {
            return true;
        }

        uint256 expiry = lockupExpiry[_from];
        if (expiry == 0) {
            return true;
        }

        return block.timestamp >= expiry;
    }

    function moduleTransferAction(address /*_from*/, address _to, uint256 /*_value*/) external override onlyComplianceCall {
        // Automatically apply default lockup duration on newly received tokens if not already locked
        if (defaultLockupDuration > 0 && lockupExpiry[_to] < block.timestamp + defaultLockupDuration) {
            lockupExpiry[_to] = block.timestamp + defaultLockupDuration;
            emit LockupExpiryUpdated(_to, lockupExpiry[_to]);
        }
    }

    function moduleMintAction(address _to, uint256 /*_value*/) external override onlyComplianceCall {
        if (defaultLockupDuration > 0) {
            lockupExpiry[_to] = block.timestamp + defaultLockupDuration;
            emit LockupExpiryUpdated(_to, lockupExpiry[_to]);
        }
    }

    function moduleBurnAction(address /*_from*/, uint256 /*_value*/) external override onlyComplianceCall {}

    function canComplianceBind(address /*_compliance*/) external pure override returns (bool) {
        return true;
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function name() public pure override returns (string memory) {
        return "RwaTimeLockupModule";
    }
}
