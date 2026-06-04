// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RwaTwinAnchor
 * @notice Testnet/mainnet IPFS CID anchor per property (asset key = keccak256(assetId string from off-chain UUID bytes32)).
 */
contract RwaTwinAnchor {
    event TwinAnchored(bytes32 indexed assetKey, string ipfsCid, address indexed sender);

    mapping(bytes32 => string) public cidByAssetKey;

    function anchorTwin(bytes32 assetKey, string calldata ipfsCid) external {
        require(bytes(ipfsCid).length > 0, "empty cid");
        cidByAssetKey[assetKey] = ipfsCid;
        emit TwinAnchored(assetKey, ipfsCid, msg.sender);
    }

    function getCid(bytes32 assetKey) external view returns (string memory) {
        return cidByAssetKey[assetKey];
    }
}
