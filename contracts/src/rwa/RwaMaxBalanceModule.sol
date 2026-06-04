// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@erc3643org/erc-3643/contracts/compliance/modular/modules/AbstractModule.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev ERC-3643 compliance module — enforces max 10% (3,000 of 30,000) per investor wallet.
contract RwaMaxBalanceModule is AbstractModule {
    uint256 public maxBalance;

    event MaxBalanceUpdated(uint256 maxBalance);

    constructor(uint256 maxBalance_) {
        maxBalance = maxBalance_;
    }

    function setMaxBalance(uint256 maxBalance_) external onlyComplianceCall {
        maxBalance = maxBalance_;
        emit MaxBalanceUpdated(maxBalance_);
    }

    function moduleCheck(
        address /*_from*/,
        address _to,
        uint256 _value,
        address _compliance
    ) external view override onlyBoundCompliance(_compliance) returns (bool) {
        address token = IModularCompliance(_compliance).getTokenBound();
        if (token == address(0)) {
            return false;
        }
        return IERC20(token).balanceOf(_to) + _value <= maxBalance;
    }

    function moduleTransferAction(address /*_from*/, address /*_to*/, uint256 /*_value*/) external override onlyComplianceCall {}

    function moduleMintAction(address /*_to*/, uint256 /*_value*/) external override onlyComplianceCall {}

    function moduleBurnAction(address /*_from*/, uint256 /*_value*/) external override onlyComplianceCall {}

    function canComplianceBind(address /*_compliance*/) external pure override returns (bool) {
        return true;
    }

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function name() public pure override returns (string memory) {
        return "RwaMaxBalanceModule";
    }
}
