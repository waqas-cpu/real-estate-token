// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
 * @title RwaAccessControl
 * @notice Centralized role-based access control contract for RWA smart contracts.
 * Enforces role segregation across governance, compliance, emergency operations, and oracles.
 */
contract RwaAccessControl is AccessControlEnumerable {
    bytes32 public constant COMPLIANCE_AGENT_ROLE = keccak256("COMPLIANCE_AGENT_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event RoleGranularRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event EmergencyAdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    constructor(address rootAdmin) {
        require(rootAdmin != address(0), "Invalid root admin");
        _grantRole(DEFAULT_ADMIN_ROLE, rootAdmin);
        _grantRole(COMPLIANCE_AGENT_ROLE, rootAdmin);
        _grantRole(EMERGENCY_ROLE, rootAdmin);
        _grantRole(ASSET_MANAGER_ROLE, rootAdmin);
    }

    function isComplianceAgent(address account) external view returns (bool) {
        return hasRole(COMPLIANCE_AGENT_ROLE, account);
    }

    function isEmergencyOperator(address account) external view returns (bool) {
        return hasRole(EMERGENCY_ROLE, account);
    }

    function isOracle(address account) external view returns (bool) {
        return hasRole(ORACLE_ROLE, account);
    }

    function isAssetManager(address account) external view returns (bool) {
        return hasRole(ASSET_MANAGER_ROLE, account);
    }
}
