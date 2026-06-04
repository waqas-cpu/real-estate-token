import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';
import { artifactFactory, TrexArtifacts } from './trexArtifacts';

export interface TrexInfrastructure {
  trexImplementationAuthority: string;
  trexFactory: string;
  identityFactory: string;
  identityImplementationAuthority: string;
  /** Shared testnet twin CID anchor + ZK verifier stub (mainnet: audited contracts) */
  twinAnchor?: string;
  zkVerifierStub?: string;
}

/** Deploy shared T-REX / ONCHAINID infrastructure (once per testnet). */
export async function deployTrexInfrastructure(): Promise<TrexInfrastructure> {
  const [deployer] = await ethers.getSigners();

  const claimTopicsRegistryImplementation = await artifactFactory(
    TrexArtifacts.ClaimTopicsRegistry,
    deployer
  ).deploy();
  await claimTopicsRegistryImplementation.waitForDeployment();

  const trustedIssuersRegistryImplementation = await artifactFactory(
    TrexArtifacts.TrustedIssuersRegistry,
    deployer
  ).deploy();
  await trustedIssuersRegistryImplementation.waitForDeployment();

  const identityRegistryStorageImplementation = await artifactFactory(
    TrexArtifacts.IdentityRegistryStorage,
    deployer
  ).deploy();
  await identityRegistryStorageImplementation.waitForDeployment();

  const identityRegistryImplementation = await artifactFactory(
    TrexArtifacts.IdentityRegistry,
    deployer
  ).deploy();
  await identityRegistryImplementation.waitForDeployment();

  const modularComplianceImplementation = await artifactFactory(
    TrexArtifacts.ModularCompliance,
    deployer
  ).deploy();
  await modularComplianceImplementation.waitForDeployment();

  const tokenImplementation = await artifactFactory(TrexArtifacts.Token, deployer).deploy();
  await tokenImplementation.waitForDeployment();

  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer
  ).deploy(await deployer.getAddress(), true);
  await identityImplementation.waitForDeployment();

  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer
  ).deploy(await identityImplementation.getAddress());
  await identityImplementationAuthority.waitForDeployment();

  const identityFactory = await new ethers.ContractFactory(
    OnchainID.contracts.Factory.abi,
    OnchainID.contracts.Factory.bytecode,
    deployer
  ).deploy(await identityImplementationAuthority.getAddress());
  await identityFactory.waitForDeployment();

  const trexImplementationAuthority = await artifactFactory(
    TrexArtifacts.TREXImplementationAuthority,
    deployer
  ).deploy(true, ethers.ZeroAddress, ethers.ZeroAddress);
  await trexImplementationAuthority.waitForDeployment();

  const versionStruct = { major: 4, minor: 1, patch: 3 };
  const contractsStruct = {
    tokenImplementation: await tokenImplementation.getAddress(),
    ctrImplementation: await claimTopicsRegistryImplementation.getAddress(),
    irImplementation: await identityRegistryImplementation.getAddress(),
    irsImplementation: await identityRegistryStorageImplementation.getAddress(),
    tirImplementation: await trustedIssuersRegistryImplementation.getAddress(),
    mcImplementation: await modularComplianceImplementation.getAddress(),
  };

  await trexImplementationAuthority.addAndUseTREXVersion(versionStruct, contractsStruct);

  const trexFactory = await artifactFactory(TrexArtifacts.TREXFactory, deployer).deploy(
    await trexImplementationAuthority.getAddress(),
    await identityFactory.getAddress()
  );
  await trexFactory.waitForDeployment();

  const idFactory = await ethers.getContractAt(
    ['function addTokenFactory(address _factory) external'],
    await identityFactory.getAddress()
  );
  await idFactory.addTokenFactory(await trexFactory.getAddress());

  return {
    trexImplementationAuthority: await trexImplementationAuthority.getAddress(),
    trexFactory: await trexFactory.getAddress(),
    identityFactory: await identityFactory.getAddress(),
    identityImplementationAuthority: await identityImplementationAuthority.getAddress(),
  };
}
