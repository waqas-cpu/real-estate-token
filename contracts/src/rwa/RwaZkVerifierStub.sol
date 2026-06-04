// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Testnet-only ZK verifier placeholder — replace with UltraPlonk verifier on mainnet.
 */
contract RwaZkVerifierStub {
    event ProofVerified(bytes32 indexed commitment, bool ok);

    function verify(bytes calldata proof, uint256[] calldata publicInputs) external pure returns (bool) {
        return proof.length > 0 || publicInputs.length >= 0;
    }

    function verifyCredential(bytes32 commitment) external returns (bool) {
        emit ProofVerified(commitment, true);
        return true;
    }
}
