import { ethers, network } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import { deployTrexInfrastructure, type TrexInfrastructure } from './lib/deployTrexInfrastructure';
import { ensureRwaSharedContracts } from './lib/deployRwaShared';
import { registerInvestor } from './lib/registerInvestor';
import { attachTrex } from './lib/trexArtifacts';

const MAX_INVESTOR_TOKENS = 3_000n;
const FIXED_SUPPLY = 30_000n;
const TESTNET_COUNTRY = 840; // USA ISO numeric stub for testnet

async function loadInfrastructure(): Promise<TrexInfrastructure | null> {
  const file = path.join(__dirname, '..', 'deployments', `${network.name}-infrastructure.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as TrexInfrastructure;
}

async function saveInfrastructure(infra: TrexInfrastructure) {
  const outDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${network.name}-infrastructure.json`);
  fs.writeFileSync(file, JSON.stringify({ ...infra, deployedAt: new Date().toISOString() }, null, 2));
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Network:', network.name);
  console.log('Deployer:', deployer.address);

  let infra = await loadInfrastructure();
  if (!infra) {
    console.log('Deploying T-REX infrastructure (first run on this network)...');
    infra = await deployTrexInfrastructure();
    infra = await ensureRwaSharedContracts(infra);
    await saveInfrastructure(infra);
    console.log('Infrastructure saved.');
  } else {
    console.log('Reusing T-REX infrastructure from', `${network.name}-infrastructure.json`);
    infra = await ensureRwaSharedContracts(infra);
    await saveInfrastructure(infra);
  }

  const fmvUsd = BigInt(process.env.DEPLOY_FMV_USD ?? '3000000');
  const tokenPriceUsdc = fmvUsd * 1_000_000n / FIXED_SUPPLY;
  const symbol = process.env.DEPLOY_TOKEN_SYMBOL ?? 'RWAT';
  const salt = process.env.DEPLOY_SALT ?? `rwa-${symbol}-${Date.now()}`;

  const MaxBalanceModule = await ethers.getContractFactory('RwaMaxBalanceModule');
  const maxBalanceModule = await MaxBalanceModule.deploy(FIXED_SUPPLY);
  await maxBalanceModule.waitForDeployment();
  const maxBalanceAddr = await maxBalanceModule.getAddress();
  console.log('RwaMaxBalanceModule:', maxBalanceAddr);

  const trexFactory = await attachTrex('TREXFactory', infra.trexFactory, deployer);
  const deployerAddr = await deployer.getAddress();

  const tokenDetails = {
    owner: deployerAddr,
    name: 'RWA Property Token',
    symbol,
    decimals: 0,
    irs: ethers.ZeroAddress,
    ONCHAINID: ethers.ZeroAddress,
    irAgents: [deployerAddr],
    tokenAgents: [deployerAddr],
    complianceModules: [maxBalanceAddr],
    complianceSettings: [] as string[],
  };

  const claimDetails = {
    claimTopics: [] as string[],
    issuers: [] as string[],
    issuerClaims: [] as string[][],
  };

  console.log('Deploying ERC-3643 token suite (salt:', salt, ')...');
  const suiteTx = await trexFactory.deployTREXSuite(salt, tokenDetails, claimDetails);
  await suiteTx.wait();

  const tokenAddr = await trexFactory.getToken(salt);
  const token = await attachTrex('Token', tokenAddr, deployer);
  const identityRegistryAddr = await token.identityRegistry();
  const modularComplianceAddr = await token.compliance();

  console.log('ERC-3643 Token:', tokenAddr);
  console.log('IdentityRegistry:', identityRegistryAddr);
  console.log('ModularCompliance:', modularComplianceAddr);

  const MockUSDC = await ethers.getContractFactory('MockUSDC');
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();

  const Offering = await ethers.getContractFactory('PrimaryOfferingTREX');
  const offering = await Offering.deploy(usdcAddr, tokenAddr, tokenPriceUsdc);
  await offering.waitForDeployment();
  const offeringAddr = await offering.getAddress();
  console.log('PrimaryOfferingTREX:', offeringAddr);

  await registerInvestor(
    infra.identityImplementationAuthority,
    identityRegistryAddr,
    deployerAddr,
    TESTNET_COUNTRY,
    deployer
  );
  await registerInvestor(
    infra.identityImplementationAuthority,
    identityRegistryAddr,
    offeringAddr,
    TESTNET_COUNTRY,
    deployer
  );

  await (await token.addAgent(offeringAddr)).wait();
  await (await offering.activate()).wait();
  await (await token.mint(offeringAddr, FIXED_SUPPLY)).wait();

  const compliance = await attachTrex('ModularCompliance', modularComplianceAddr, deployer);
  const setMaxIface = new ethers.Interface(['function setMaxBalance(uint256 maxBalance_)']);
  await (
    await compliance.callModuleFunction(
      setMaxIface.encodeFunctionData('setMaxBalance', [MAX_INVESTOR_TOKENS]),
      maxBalanceAddr
    )
  ).wait();

  await (await token.unpause()).wait();

  const mintAmount = 10_000_000n * 1_000_000n;
  await (await usdc.mint(deployerAddr, mintAmount)).wait();

  const artifact = {
    standard: 'ERC-3643',
    trexVersion: '4.1.3',
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployerAddr,
    salt,
    infrastructure: infra,
    contracts: {
      mockUsdc: usdcAddr,
      rwaToken: tokenAddr,
      primaryOffering: offeringAddr,
      trexFactory: infra.trexFactory,
      identityRegistry: identityRegistryAddr,
      modularCompliance: modularComplianceAddr,
      maxBalanceModule: maxBalanceAddr,
      twinAnchor: infra.twinAnchor,
      zkVerifierStub: infra.zkVerifierStub,
    },
    economics: {
      fixedTotalSupply: Number(FIXED_SUPPLY),
      maxTokensPerInvestor: Number(MAX_INVESTOR_TOKENS),
      tokenPriceUsdcMicro: tokenPriceUsdc.toString(),
      fmvUsd: fmvUsd.toString(),
      currency: 'USDC',
    },
    mainnet: {
      blocked: true,
      note: 'Run DEPLOY_MAINNET.md after audit — use real USDC and production claim issuers',
    },
    warning: 'TESTNET ERC-3643 (T-REX) — not a substitute for mainnet audit',
  };

  const outFile = path.join(__dirname, '..', 'deployments', `${network.name}.json`);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(artifact, null, 2));
  console.log('Wrote', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
