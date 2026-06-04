import { Contract, ContractFactory, Signer } from 'ethers';
import { ethers } from 'hardhat';
import ERC3643 from '@erc3643org/erc-3643';

type Artifact = { abi: readonly unknown[]; bytecode: string };

export const TrexArtifacts = ERC3643.contracts;

export function artifactFactory(artifact: Artifact, signer: Signer): ContractFactory {
  return new ContractFactory(artifact.abi, artifact.bytecode, signer);
}

export type TrexContractName = keyof typeof TrexArtifacts;

/** Attach to a deployed T-REX contract using npm package ABIs (no local artifact required). */
export async function attachTrex(
  name: TrexContractName,
  address: string,
  signer?: Signer
): Promise<Contract> {
  const s = signer ?? (await ethers.getSigners())[0];
  return new Contract(address, TrexArtifacts[name].abi, s);
}
