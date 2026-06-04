import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';
import type { Signer } from 'ethers';
import { attachTrex } from './trexArtifacts';

/** Deploy ONCHAINID proxy and register wallet in ERC-3643 identity registry (testnet KYC stub). */
export async function registerInvestor(
  identityImplementationAuthority: string,
  identityRegistryAddress: string,
  wallet: string,
  countryCode: number,
  signer: Signer
): Promise<string> {
  const identity = await new ethers.ContractFactory(
    OnchainID.contracts.IdentityProxy.abi,
    OnchainID.contracts.IdentityProxy.bytecode,
    signer
  ).deploy(identityImplementationAuthority, wallet);
  await identity.waitForDeployment();

  const ir = await attachTrex('IdentityRegistry', identityRegistryAddress, signer);
  await ir.registerIdentity(wallet, await identity.getAddress(), countryCode);

  return await identity.getAddress();
}
