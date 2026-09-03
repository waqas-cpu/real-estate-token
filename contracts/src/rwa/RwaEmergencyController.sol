// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./RwaAccessControl.sol";

interface IPauseableToken {
    function pause() external;
    function unpause() external;
    function setAddressFrozen(address _userAddress, bool _freeze) external;
    function freezePartialTokens(address _userAddress, uint256 _amount) external;
    function unfreezePartialTokens(address _userAddress, uint256 _amount) external;
    function paused() external view returns (bool);
    function isFrozen(address _userAddress) external view returns (bool);
}

interface IPauseableOffering {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}

/**
 * @title RwaEmergencyController
 * @notice Centralized emergency circuit breaker for RWA real estate tokens and offerings.
 * Allows EMERGENCY_ROLE to instantly freeze transfers or offerings upon exploit or regulatory order.
 * Requires DEFAULT_ADMIN_ROLE (multisig) to unpause / unfreeze.
 */
contract RwaEmergencyController {
    RwaAccessControl public immutable accessControl;

    event EmergencyTokenPaused(address indexed token, address indexed triggeredBy, string reason);
    event EmergencyTokenUnpaused(address indexed token, address indexed triggeredBy);
    event EmergencyOfferingPaused(address indexed offering, address indexed triggeredBy, string reason);
    event EmergencyOfferingUnpaused(address indexed offering, address indexed triggeredBy);
    event InvestorWalletFrozen(address indexed token, address indexed investor, address indexed triggeredBy, string reason);
    event InvestorWalletUnfrozen(address indexed token, address indexed investor, address indexed triggeredBy);

    modifier onlyEmergencyOperator() {
        require(
            accessControl.hasRole(accessControl.EMERGENCY_ROLE(), msg.sender) ||
            accessControl.hasRole(accessControl.DEFAULT_ADMIN_ROLE(), msg.sender),
            "Caller is not emergency operator"
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

    function emergencyPauseToken(address token, string calldata reason) external onlyEmergencyOperator {
        IPauseableToken(token).pause();
        emit EmergencyTokenPaused(token, msg.sender, reason);
    }

    function emergencyUnpauseToken(address token) external onlyAdmin {
        IPauseableToken(token).unpause();
        emit EmergencyTokenUnpaused(token, msg.sender);
    }

    function emergencyPauseOffering(address offering, string calldata reason) external onlyEmergencyOperator {
        IPauseableOffering(offering).pause();
        emit EmergencyOfferingPaused(offering, msg.sender, reason);
    }

    function emergencyUnpauseOffering(address offering) external onlyAdmin {
        IPauseableOffering(offering).unpause();
        emit EmergencyOfferingUnpaused(offering, msg.sender);
    }

    function emergencyFreezeWallet(address token, address investor, string calldata reason) external onlyEmergencyOperator {
        IPauseableToken(token).setAddressFrozen(investor, true);
        emit InvestorWalletFrozen(token, investor, msg.sender, reason);
    }

    function emergencyUnfreezeWallet(address token, address investor) external onlyAdmin {
        IPauseableToken(token).setAddressFrozen(investor, false);
        emit InvestorWalletUnfrozen(token, investor, msg.sender);
    }

    function emergencyBatchPause(address[] calldata tokens, address[] calldata offerings, string calldata reason) external onlyEmergencyOperator {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] != address(0)) {
                IPauseableToken(tokens[i]).pause();
                emit EmergencyTokenPaused(tokens[i], msg.sender, reason);
            }
        }
        for (uint256 j = 0; j < offerings.length; j++) {
            if (offerings[j] != address(0)) {
                IPauseableOffering(offerings[j]).pause();
                emit EmergencyOfferingPaused(offerings[j], msg.sender, reason);
            }
        }
    }
}
