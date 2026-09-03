// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.17;

import "@erc3643org/erc-3643/contracts/compliance/modular/IModularCompliance.sol";
import "@erc3643org/erc-3643/contracts/compliance/modular/modules/AbstractModule.sol";
import "@erc3643org/erc-3643/contracts/token/IToken.sol";
import "@erc3643org/erc-3643/contracts/registry/interface/IIdentityRegistry.sol";

/**
 * @title RwaCountryRestrictModule
 * @notice ERC-3643 compliance module enforcing jurisdiction restrictions and OFAC sanctions.
 * Disallows transfers involving wallets registered in restricted countries.
 */
contract RwaCountryRestrictModule is AbstractModule {
    mapping(uint16 => bool) public isCountryRestricted;

    event CountryRestrictionUpdated(uint16 indexed countryCode, bool restricted);

    constructor(uint16[] memory initialRestrictedCountries) {
        for (uint256 i = 0; i < initialRestrictedCountries.length; i++) {
            isCountryRestricted[initialRestrictedCountries[i]] = true;
            emit CountryRestrictionUpdated(initialRestrictedCountries[i], true);
        }
    }

    function setCountryRestriction(uint16 countryCode, bool restricted) external onlyComplianceCall {
        isCountryRestricted[countryCode] = restricted;
        emit CountryRestrictionUpdated(countryCode, restricted);
    }

    function moduleCheck(
        address _from,
        address _to,
        uint256 /*_value*/,
        address _compliance
    ) external view override onlyBoundCompliance(_compliance) returns (bool) {
        address tokenAddr = IModularCompliance(_compliance).getTokenBound();
        if (tokenAddr == address(0)) {
            return false;
        }

        IToken token = IToken(tokenAddr);
        IIdentityRegistry identityRegistry = token.identityRegistry();
        if (address(identityRegistry) == address(0)) {
            return false;
        }

        // Validate recipient country
        if (_to != address(0)) {
            uint16 toCountry = identityRegistry.investorCountry(_to);
            if (isCountryRestricted[toCountry]) {
                return false;
            }
        }

        // Validate sender country
        if (_from != address(0)) {
            uint16 fromCountry = identityRegistry.investorCountry(_from);
            if (isCountryRestricted[fromCountry]) {
                return false;
            }
        }

        return true;
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
        return "RwaCountryRestrictModule";
    }
}
